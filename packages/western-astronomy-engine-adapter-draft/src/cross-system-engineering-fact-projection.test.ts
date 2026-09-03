// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  runWesternAstronomyUtcDiagnostic
} from "./index.ts";
import {
  WESTERN_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION,
  WESTERN_ENGINEERING_FACT_FIELDS,
  projectWesternCrossSystemEngineeringFacts
} from "./cross-system-engineering-fact-projection.ts";

const INPUT = Object.freeze({
  protocolVersion: WESTERN_ASTRONOMY_DIAGNOSTIC_REQUEST_VERSION,
  utcInstant: "2000-01-01T12:00:00.000Z",
  bodyIds: Object.freeze(["sun", "moon"])
});

describe("Western system-owned cross-system engineering fact projector", () => {
  it("projects one exact computed diagnostic into the fixed five-field receipt view", async () => {
    const envelope = await runWesternAstronomyUtcDiagnostic(INPUT);
    const projected = projectWesternCrossSystemEngineeringFacts(envelope);

    expect(WESTERN_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION).toBe(
      "hakimi.western.cross-system-engineering-facts/1.0.0"
    );
    expect(projected.map((entry) => entry.field)).toEqual(WESTERN_ENGINEERING_FACT_FIELDS);
    expect(projected.map((entry) => entry.value)).toEqual([
      "2000-01-01T12:00:00.000Z",
      "63.847089569816944",
      "astronomy_engine_ect_true_ecliptic_of_date",
      "280.37452791080455",
      "223.32389112747416"
    ]);
    expect(projected.every((entry) =>
      entry.sourceRef === "engineering-replay:western.synthetic-e1"
      && Object.isFrozen(entry))).toBe(true);
    expect(Object.isFrozen(projected)).toBe(true);
  });

  it("rejects failed-closed and non-diagnostic producer identities", async () => {
    const computed = structuredClone(await runWesternAstronomyUtcDiagnostic(INPUT)) as unknown as {
      outcome: string;
    };
    computed.outcome = "failed_closed";
    expect(() => projectWesternCrossSystemEngineeringFacts(computed)).toThrow(
      "western diagnostic identity or outcome mismatch"
    );

    const wrongArtifact = structuredClone(await runWesternAstronomyUtcDiagnostic(INPUT)) as unknown as {
      artifactKind: string;
    };
    wrongArtifact.artifactKind = "invented_artifact";
    expect(() => projectWesternCrossSystemEngineeringFacts(wrongArtifact)).toThrow(
      "western diagnostic identity or outcome mismatch"
    );
  });

  it("rejects authority or strict-receipt promotion", async () => {
    const authority = structuredClone(await runWesternAstronomyUtcDiagnostic(INPUT)) as unknown as {
      evidence: { productionEligible: boolean };
    };
    authority.evidence.productionEligible = true;
    expect(() => projectWesternCrossSystemEngineeringFacts(authority)).toThrow(
      "western diagnostic authority boundary mismatch"
    );

    const receipt = structuredClone(await runWesternAstronomyUtcDiagnostic(INPUT)) as unknown as {
      strictContractRelation: { successReceiptIssued: boolean };
    };
    receipt.strictContractRelation.successReceiptIssued = true;
    expect(() => projectWesternCrossSystemEngineeringFacts(receipt)).toThrow(
      "western diagnostic authority boundary mismatch"
    );
  });
});
