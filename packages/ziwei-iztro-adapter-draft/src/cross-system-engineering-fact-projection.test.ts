// @vitest-environment node

import { describe, expect, it } from "vitest";
import { ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION } from "./contract-bridge.ts";
import { calculateIztro258EngineeringFixture } from "./index.ts";
import {
  ZIWEI_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION,
  ZIWEI_ENGINEERING_FACT_FIELDS,
  projectZiweiCrossSystemEngineeringFacts
} from "./cross-system-engineering-fact-projection.ts";

const INPUT = Object.freeze({
  contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  systemId: "ziwei-doushu",
  calendarInput: Object.freeze({ calendar: "gregorian", date: "2000-01-01" }),
  shichenIndex: 6,
  sexForCalculation: "male",
  solarTimeAdjustment: "none",
  civilContext: Object.freeze({
    usedForCalculation: false,
    localTime: null,
    timeZone: null,
    location: Object.freeze({
      precision: "unknown",
      label: "",
      latitude: null,
      longitude: null
    })
  }),
  birthSourceRef: "cross-system.synthetic-fixture.e1",
  sourceNote: "Synthetic engineering receipt candidate; not a person or truth claim."
} as const);

describe("Ziwei system-owned cross-system engineering fact projector", () => {
  it("projects one exact producer fixture into the fixed seven-field receipt view", async () => {
    const fixture = await calculateIztro258EngineeringFixture(INPUT);
    const projected = projectZiweiCrossSystemEngineeringFacts(fixture);

    expect(ZIWEI_CROSS_SYSTEM_ENGINEERING_FACT_PROJECTOR_VERSION).toBe(
      "hakimi.ziwei.cross-system-engineering-facts/1.0.0"
    );
    expect(projected.map((entry) => entry.field)).toEqual(ZIWEI_ENGINEERING_FACT_FIELDS);
    expect(projected.map((entry) => entry.value)).toEqual([
      "2000-01-01",
      "1999-11-25-regular",
      "wu",
      "backward",
      "wu",
      "wu",
      "earth_5"
    ]);
    expect(projected.every((entry) =>
      entry.sourceRef === "engineering-replay:ziwei.synthetic-e1"
      && Object.isFrozen(entry))).toBe(true);
    expect(Object.isFrozen(projected)).toBe(true);
  });

  it("rejects authority and fallback promotion", async () => {
    const fixture = structuredClone(await calculateIztro258EngineeringFixture(INPUT)) as unknown as {
      evidence: { productionEligible: boolean };
    };
    fixture.evidence.productionEligible = true;
    expect(() => projectZiweiCrossSystemEngineeringFacts(fixture)).toThrow(
      "ziwei fixture authority boundary mismatch"
    );

    const fallback = structuredClone(await calculateIztro258EngineeringFixture(INPUT)) as unknown as {
      receipt: { fallbackUsed: boolean };
    };
    fallback.receipt.fallbackUsed = true;
    expect(() => projectZiweiCrossSystemEngineeringFacts(fallback)).toThrow(
      "ziwei fixture cannot project fallback or interpretation output"
    );
  });

  it("rejects a different producer artifact identity", async () => {
    const fixture = structuredClone(await calculateIztro258EngineeringFixture(INPUT)) as unknown as {
      artifactKind: string;
    };
    fixture.artifactKind = "invented_artifact";
    expect(() => projectZiweiCrossSystemEngineeringFacts(fixture)).toThrow(
      "ziwei fixture identity mismatch"
    );
  });
});
