// @vitest-environment node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import seedLock from "./diagnostic-seed-lock.json";
import sourceLock from "./astronomy-engine-2.1.19-source-lock.json";
import { westernChartFixtureDraftSchema } from "./contract-bridge.ts";
import {
  ASTRONOMY_ENGINE_DELTA_T_MODEL_ID,
  ASTRONOMY_ENGINE_DELTA_T_LOCK_SHA256,
  ASTRONOMY_ENGINE_SOURCE_LOCK_SHA256,
  ASTRONOMY_ENGINE_VERSION,
  WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  WESTERN_ASTRONOMY_PROJECTION_VERSION,
  runWesternAstronomyUtcDiagnostic,
  westernAstronomyDiagnosticEnvelopeSchema
} from "./index.ts";
import {
  WESTERN_CROSS_RUNTIME_PROJECTION_VERSION,
  WESTERN_CROSS_RUNTIME_QUANTIZATION,
  createWesternCrossRuntimeQuantizedProjection
} from "./browser-parity/quantized-projection.ts";

const request = (utcInstant: string, bodyIds: string[]) => ({
  protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  utcInstant,
  bodyIds
});

function circularSeparation(left: number, right: number): number {
  const difference = Math.abs(left - right) % 360;
  return Math.min(difference, 360 - difference);
}

describe("isolated Astronomy Engine 2.1.19 UTC diagnostic", () => {
  it("replays five exact offline regression seeds from both supported edges through all ten bodies", async () => {
    expect(seedLock).toMatchObject({
      schemaVersion: 1,
      projectionVersion: WESTERN_ASTRONOMY_PROJECTION_VERSION,
      engineVersion: ASTRONOMY_ENGINE_VERSION,
      deltaTModelId: ASTRONOMY_ENGINE_DELTA_T_MODEL_ID,
      proofScope: "exact_engine_regression_only_not_external_ephemeris_truth"
    });
    expect(seedLock.seeds).toHaveLength(5);

    const envelopes = await Promise.all(seedLock.seeds.map((seed) =>
      runWesternAstronomyUtcDiagnostic(request(seed.utcInstant, seed.bodyIds))
    ));

    envelopes.forEach((envelope, index) => {
      const seed = seedLock.seeds[index]!;
      expect(envelope.outcome, `${seed.id} failed`).toBe("computed");
      expect(envelope.diagnosticDigests).toEqual({
        algorithm: "sha256-canonical-json-v1",
        requestSha256: seed.requestSha256,
        resultSha256: seed.resultSha256
      });
      if (envelope.outcome !== "computed") throw new Error(`${seed.id} did not compute`);
      expect(envelope.result.bodies.map((body) => body.bodyId)).toEqual(seed.bodyIds);
    });

    const allBodies = envelopes[1];
    if (allBodies?.outcome !== "computed") throw new Error("J2000 ten-body seed did not compute");
    expect(allBodies.result.bodies).toHaveLength(10);

    const eclipse = envelopes[2];
    if (eclipse?.outcome !== "computed") throw new Error("eclipse seed did not compute");
    expect(circularSeparation(
      eclipse.result.bodies[0]!.trueEclipticOfDate.longitudeDeg,
      eclipse.result.bodies[1]!.trueEclipticOfDate.longitudeDeg
    )).toBeLessThan(0.05);

    const equinox = envelopes[3];
    if (equinox?.outcome !== "computed") throw new Error("equinox seed did not compute");
    expect(equinox.result.bodies[0]!.trueEclipticOfDate.longitudeDeg).toBeLessThan(0.01);
  });

  it("returns an adapter-local diagnostic envelope and cannot masquerade as a strict chart receipt", async () => {
    const envelope = await runWesternAstronomyUtcDiagnostic(request(
      "2000-01-01T12:00:00.000Z",
      ["sun", "moon", "pluto"]
    ));

    expect(westernAstronomyDiagnosticEnvelopeSchema.safeParse(envelope).success).toBe(true);
    expect(envelope).toMatchObject({
      disposition: "diagnostic_only",
      outcome: "computed",
      evidence: {
        evidenceStatus: "differential_diagnostic",
        productionEligible: false,
        expertTruthClaimed: false
      },
      strictContractRelation: {
        chartFixtureAccepted: false,
        successReceiptIssued: false
      },
      failure: null
    });
    expect("receipt" in envelope).toBe(false);
    expect(westernChartFixtureDraftSchema.safeParse(envelope).success).toBe(false);
  });

  it("uses a distinct fresh Worker instance while preserving the exact deterministic projection", async () => {
    const input = request("2024-04-08T18:18:00.000Z", ["sun", "moon"]);
    const [first, second] = await Promise.all([
      runWesternAstronomyUtcDiagnostic(input),
      runWesternAstronomyUtcDiagnostic(input)
    ]);
    if (first.outcome !== "computed" || second.outcome !== "computed") {
      throw new Error("fresh Worker comparison did not compute");
    }

    expect(first.execution.worker.isolation).toBe("fresh_worker_per_request");
    expect(first.execution.worker.threadId).not.toBe(second.execution.worker.threadId);
    expect(first.execution.worker.instanceNonceSha256)
      .not.toBe(second.execution.worker.instanceNonceSha256);
    expect(first.result).toEqual(second.result);
    expect(first.diagnosticDigests.resultSha256).toBe(second.diagnosticDigests.resultSha256);
  });

  it("records EQJ, true-ecliptic-of-date, central differences, and the Moon correction exception", async () => {
    const envelope = await runWesternAstronomyUtcDiagnostic(request(
      "2025-03-20T09:01:00.000Z",
      ["sun", "moon"]
    ));
    if (envelope.outcome !== "computed") throw new Error("frame diagnostic did not compute");

    expect(envelope.result.frameSemantics).toEqual({
      observerOrigin: "geocenter",
      baseFrame: "astronomy_engine_eqj_j2000_mean_equator",
      outputFrame: "astronomy_engine_ect_true_ecliptic_of_date",
      stellarAberration: false,
      solarGravitationalDeflection: "not_exposed_by_astronomy_engine_public_api",
      speedAlgorithmId: "central_finite_difference_utc_60s_v1"
    });
    expect(envelope.result.bodies[0]!.correctionSemantics.lightTime)
      .toBe("upstream_iterative_backdate");
    expect(envelope.result.bodies[1]!.correctionSemantics.lightTime)
      .toBe("upstream_geo_moon_direct_no_explicit_backdate");
    for (const body of envelope.result.bodies) {
      expect(body.finiteDifference.halfWindowSeconds).toBe(60);
      expect(Number.isFinite(body.finiteDifference.longitudeSpeedDegPerDay)).toBe(true);
      expect(body.trueEclipticOfDate.longitudeDeg).toBeGreaterThanOrEqual(0);
      expect(body.trueEclipticOfDate.longitudeDeg).toBeLessThan(360);
    }
  });

  it("fails closed before execution for non-canonical UTC, body sets, range edges, and extra fields", async () => {
    const invalidInputs: unknown[] = [
      request("2025-03-20T09:01:00.000+00:00", ["sun"]),
      request("2025-02-30T09:01:00.000Z", ["sun"]),
      request("2025-03-20T09:01:00.000Z", ["moon", "sun"]),
      request("2025-03-20T09:01:00.000Z", ["sun", "sun"]),
      request("1900-01-01T00:00:00.000Z", ["sun"]),
      { ...request("2025-03-20T09:01:00.000Z", ["sun"]), latitude: 0 }
    ];

    const envelopes = await Promise.all(invalidInputs.map((input) =>
      runWesternAstronomyUtcDiagnostic(input)
    ));
    for (const envelope of envelopes) {
      expect(envelope).toMatchObject({
        outcome: "failed_closed",
        request: null,
        execution: null,
        result: null,
        failure: {
          stage: "request_validation",
          code: "INVALID_REQUEST",
          partialResultReturned: false
        }
      });
      expect(envelope.diagnosticDigests.resultSha256).toBeNull();
    }
  });

  it("keeps the npm source identity and the separately sourced MIT license byte-locked and honest", () => {
    const licenseBytes = readFileSync(new URL(
      "../licenses/astronomy-engine-2.1.19-LICENSE.txt",
      import.meta.url
    ));
    expect(sourceLock.package).toMatchObject({
      name: "astronomy-engine",
      version: ASTRONOMY_ENGINE_VERSION,
      runtimeDependencies: []
    });
    expect(sourceLock.license.standaloneFilePresentInNpmTarball).toBe(false);
    expect(sourceLock.publishedFileInventory.some((file) => file.path === "LICENSE")).toBe(false);
    expect(licenseBytes.byteLength).toBe(sourceLock.license.bytes);
    expect(createHash("sha256").update(licenseBytes).digest("hex"))
      .toBe(sourceLock.license.sha256);
    expect(createHash("sha256").update(readFileSync(new URL(
      "./astronomy-engine-2.1.19-source-lock.json",
      import.meta.url
    ))).digest("hex")).toBe(ASTRONOMY_ENGINE_SOURCE_LOCK_SHA256);
    expect(createHash("sha256").update(readFileSync(new URL(
      "./delta-t-model-lock.json",
      import.meta.url
    ))).digest("hex")).toBe(ASTRONOMY_ENGINE_DELTA_T_LOCK_SHA256);
  });

  it("keeps raw engine output intact while deriving an explicit cross-runtime decimal-grid projection", async () => {
    const envelope = await runWesternAstronomyUtcDiagnostic(request(
      "2000-01-01T12:00:00.000Z",
      ["sun", "neptune"]
    ));
    if (envelope.outcome !== "computed") throw new Error("quantized projection seed did not compute");

    const projection = createWesternCrossRuntimeQuantizedProjection(envelope.result);
    expect(projection).toMatchObject({
      schemaVersion: WESTERN_CROSS_RUNTIME_PROJECTION_VERSION,
      proofScope: "javascript_runtime_stable_engineering_projection_not_ephemeris_accuracy",
      inputProjectionVersion: WESTERN_ASTRONOMY_PROJECTION_VERSION,
      quantization: {
        algorithmId: "cross_runtime_quantized_projection_v1",
        rounding: "ECMAScript_Number_toFixed_then_Number",
        interpretation: "decimal_grid_half_step_not_ieee754_total_error_bound"
      }
    });
    expect(WESTERN_CROSS_RUNTIME_QUANTIZATION.decimalPlaces).toEqual({
      engineTimeDays: 12,
      modeledDeltaTSeconds: 9,
      vectorAndDistanceAu: 12,
      eclipticAngleDegrees: 9,
      angularSpeedDegreesPerDay: 9,
      distanceSpeedAuPerDay: 9
    });
    expect(envelope.result).not.toHaveProperty("quantization");
  });

  it("absorbs only observed sub-grid JS tail drift and still exposes material changes", async () => {
    const envelope = await runWesternAstronomyUtcDiagnostic(request(
      "2000-01-01T12:00:00.000Z",
      ["sun", "neptune"]
    ));
    if (envelope.outcome !== "computed") throw new Error("quantized drift seed did not compute");

    const nodeLike = structuredClone(envelope.result);
    const browserLike = structuredClone(envelope.result);
    const materialChange = structuredClone(envelope.result);
    nodeLike.bodies[1]!.finiteDifference.distanceSpeedAuPerDay = 0.00670546805;
    browserLike.bodies[1]!.finiteDifference.distanceSpeedAuPerDay = 0.006705468048;
    materialChange.bodies[1]!.finiteDifference.distanceSpeedAuPerDay = 0.00670547;

    expect(nodeLike).not.toEqual(browserLike);
    expect(createWesternCrossRuntimeQuantizedProjection(nodeLike))
      .toEqual(createWesternCrossRuntimeQuantizedProjection(browserLike));
    expect(createWesternCrossRuntimeQuantizedProjection(materialChange))
      .not.toEqual(createWesternCrossRuntimeQuantizedProjection(nodeLike));
  });
});
