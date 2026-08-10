// @vitest-environment node

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  runWesternAstronomyUtcDiagnostic
} from "./index.ts";
import {
  buildHorizonsQueryUrl,
  horizonsDifferentialQueryManifest,
  runHorizonsDifferential
} from "./horizons-differential/index.ts";
import {
  computeHorizonsDeltas,
  createHorizonsDifferentialReport
} from "./horizons-differential/differential-report.ts";
import {
  parseHorizonsVectorRows,
  verifyOfficialHorizonsResponse
} from "./horizons-differential/official-response.ts";

const SAMPLE_TABLE = [
  "*******************************************************************************",
  "Ephemeris / WWW_USER Fri Aug  8 12:00:00 2026 Pasadena, USA      / Horizons",
  "$$SOE",
  " 2025-Mar-20 09:01:00.000000   X = 8.914520620927780E-01 Y = -4.353587314443383E-01 Z = -1.887428179207600E-01",
  "$$EOE"
].join("\n");

function recordWithSha(byteLength: number, sha256: string, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    recordKind: "official_horizons_response_evidence",
    manifestVersion: horizonsDifferentialQueryManifest.manifestVersion,
    utcInstant: "2025-03-20T09:01:00.000Z",
    providerTargetId: "10",
    centerId: "500@399",
    retrievedAtIso: "2026-08-10T00:00:00.000Z",
    sourceUrl: "https://ssd.jpl.nasa.gov/api/horizons.api?format=text",
    byteLength,
    sha256,
    responseFormat: "text",
    notes: "format_only_contract_draft_test_fixture; never official",
    ...overrides
  };
}

describe("JPL Horizons differential gate (offline readiness)", () => {
  it("locks the exact ordered query manifest and builds the encoded URL", () => {
    const url = buildHorizonsQueryUrl();
    expect(url).toContain("COMMAND='10'");
    expect(url).toContain("CENTER='500%40399'");
    expect(url).toContain("EPHEM_TYPE=VECTORS");
    expect(url).toContain("VEC_CORR=LT");
    const parameters = url.slice(url.indexOf("?") + 1).split("&");
    expect(parameters[0]).toBe("format=text");
    expect(parameters.at(-1)).toBe("CSV_FORMAT=NO");
    expect(parameters).toHaveLength(horizonsDifferentialQueryManifest.requestedParameters.length);
    expect(horizonsDifferentialQueryManifest.comparisonSemantics).toEqual({
      astronomyEngineFrame: "eqj_j2000_mean_equator",
      frameBias: "not_modeled_acknowledged",
      passClaimPolicy: "never_in_draft",
      thresholdAu: null
    });
  });

  it("parses a structure-only VECTORS row without claiming it is official", () => {
    const rows = parseHorizonsVectorRows(SAMPLE_TABLE);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe("2025-Mar-20 09:01:00.000000");
    expect(rows[0]?.xAu).toBeCloseTo(0.891452062092778, 12);
    expect(rows[0]?.yAu).toBeCloseTo(-0.4353587314443383, 12);
    expect(rows[0]?.zAu).toBeCloseTo(-0.18874281792076002, 12);
  });

  it("fails closed when official evidence is missing, malformed, or mismatched", () => {
    const bytes = new TextEncoder().encode(SAMPLE_TABLE);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const invalidRecords = [
      null,
      recordWithSha(bytes.byteLength, "f".repeat(64)),
      recordWithSha(bytes.byteLength + 1, sha256),
      recordWithSha(bytes.byteLength, sha256, { utcInstant: "2025-03-21T09:01:00.000Z" }),
      recordWithSha(bytes.byteLength, sha256, { sourceUrl: "https://example.invalid/horizons" }),
      recordWithSha(bytes.byteLength, sha256, { manifestVersion: "stale" })
    ];
    for (const record of invalidRecords) {
      expect(() => verifyOfficialHorizonsResponse(bytes, record)).toThrow();
    }
    const notATable = new TextEncoder().encode("hello world");
    const notTableSha = createHash("sha256").update(notATable).digest("hex");
    expect(() => verifyOfficialHorizonsResponse(
      notATable,
      recordWithSha(notATable.byteLength, notTableSha)
    )).toThrow(/VECTORS table/u);
  });

  it("computes raw AU deltas without adjudicating truth or issuing a pass claim", async () => {
    const deltas = computeHorizonsDeltas(
      { x: 1, y: 0, z: 0, distanceAu: 1 },
      { label: "fixture", xAu: 0.99, yAu: 0, zAu: 0 }
    );
    expect(deltas.xAuDelta).toBeCloseTo(0.01, 9);
    expect(deltas.euclideanAuDelta).toBeCloseTo(0.01, 9);

    const envelope = await runWesternAstronomyUtcDiagnostic({
      protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
      utcInstant: "2025-03-20T09:01:00.000Z",
      bodyIds: ["sun"]
    });
    expect(envelope.outcome).toBe("computed");
    if (envelope.outcome !== "computed") throw new Error("sun diagnostic did not compute");
    const official = {
      evidence: recordWithSha(0, "0".repeat(64)) as never,
      rows: parseHorizonsVectorRows(SAMPLE_TABLE)
    };
    const report = createHorizonsDifferentialReport({ astronomyEnvelope: envelope, official });
    expect(report.outcome).toBe("computed");
    if (report.outcome !== "computed") throw new Error("differential report did not compute");
    expect(report.result).toMatchObject({
      truthAdjudicated: false,
      passClaim: false,
      comparisonSemantics: { thresholdAu: null, passClaimPolicy: "never_in_draft" }
    });
    expect(report.execution.frameSemantics.frameBias).toBe("not_modeled_acknowledged");
    expect(Number.isFinite(report.result.deltas.euclideanAuDelta)).toBe(true);
  });

  it("returns a failed-closed report when the official bytes are absent", async () => {
    const envelope = await runWesternAstronomyUtcDiagnostic({
      protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
      utcInstant: "2025-03-20T09:01:00.000Z",
      bodyIds: ["sun"]
    });
    const report = runHorizonsDifferential({
      bytes: new Uint8Array(),
      evidenceRecord: null,
      astronomyEnvelope: envelope
    });
    expect(report).toMatchObject({
      outcome: "failed_closed",
      result: null,
      failure: {
        code: "OFFICIAL_EVIDENCE_INVALID",
        partialResultReturned: false
      }
    });
  });
});
