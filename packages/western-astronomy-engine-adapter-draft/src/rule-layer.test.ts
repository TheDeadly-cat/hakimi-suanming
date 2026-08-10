// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  WESTERN_RULE_LAYER_ARTIFACT_VERSION,
  WESTERN_RULE_LAYER_PROJECTION_VERSION,
  WESTERN_RULE_LAYER_REQUEST_VERSION,
  runWesternRuleLayer,
  westernRuleLayerArtifactSchema,
  westernRuleLayerRequestSchema
} from "./rule-layer/index.ts";
import { assignHousePlacement, computeHouseCusps } from "./rule-layer/houses.ts";
import { enumerateAspects } from "./rule-layer/aspects.ts";
import { deriveZodiacPlacement } from "./rule-layer/zodiac.ts";
import { canonicalJson, sha256CanonicalJson, sha256Hex } from "./rule-layer/canonical.ts";

const baseRequest = {
  protocolVersion: WESTERN_RULE_LAYER_REQUEST_VERSION,
  inputLabel: "equinox-2025 rule layer seed",
  bodies: [
    { bodyId: "sun", eclipticLongitudeDeg: 0.5, longitudeSpeedDegPerDay: 0.99 },
    { bodyId: "moon", eclipticLongitudeDeg: 61.2, longitudeSpeedDegPerDay: 13.2 }
  ],
  zodiac: { kind: "tropical", ayanamshaDeg: null },
  houses: {
    systemId: "whole_sign_v1",
    ramcDeg: 100,
    geographicLatitudeDeg: 40,
    obliquityTrueOfDateDeg: 23.4372
  },
  aspects: {
    definitions: [
      { aspectId: "conjunction", exactAngleDeg: 0, maxOrbDeg: 8 },
      { aspectId: "sextile", exactAngleDeg: 60, maxOrbDeg: 8 },
      { aspectId: "square", exactAngleDeg: 90, maxOrbDeg: 8 },
      { aspectId: "trine", exactAngleDeg: 120, maxOrbDeg: 8 },
      { aspectId: "opposition", exactAngleDeg: 180, maxOrbDeg: 8 }
    ]
  }
};

function circularRange(startDeg: number, endDeg: number, candidateDeg: number): boolean {
  const span = ((endDeg - startDeg + 360) % 360 + 360) % 360;
  const offset = ((candidateDeg - startDeg + 360) % 360 + 360) % 360;
  return offset <= span;
}

describe("Western astrology rule layer", () => {
  it("computes dependency-free SHA-256 identical to node crypto", () => {
    expect(sha256Hex(new TextEncoder().encode("abc")))
      .toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex(new TextEncoder().encode("")))
      .toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    const payload = { b: 2, a: [1, "x", null], nested: { z: true } };
    const canonical = canonicalJson(payload);
    const expected = createHash("sha256").update(canonical, "utf8").digest("hex");
    expect(sha256CanonicalJson(payload)).toBe(expected);
  });

  it("derives tropical and sidereal zodiac placement from caller-supplied ecliptic longitude", () => {
    const tropical = deriveZodiacPlacement(359.5, { kind: "tropical", ayanamshaDeg: null });
    expect(tropical).toMatchObject({
      longitudeDeg: 359.5,
      signIndex: 11,
      signId: "pisces",
      degreeWithinSign: 29.5,
      ayanamshaDeg: null
    });

    const sidereal = deriveZodiacPlacement(30, { kind: "sidereal", ayanamshaDeg: 24.1 });
    expect(sidereal.longitudeDeg).toBeCloseTo(5.9, 9);
    expect(sidereal.signIndex).toBe(0);
    expect(sidereal.signId).toBe("aries");
    expect(sidereal.degreeWithinSign).toBeCloseTo(5.9, 9);
    expect(sidereal.ayanamshaDeg).toBeCloseTo(24.1, 9);
  });

  it("computes whole-sign, equal-ASC and Porphyry cusps with consistent angles", () => {
    const equatorWhole = computeHouseCusps({
      systemId: "whole_sign_v1",
      ramcDeg: 0,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.4372
    });
    expect(equatorWhole.angles).toEqual({
      ascendantDeg: 90,
      midheavenDeg: 0,
      descendantDeg: 270,
      imumCoeliDeg: 180,
      vertexDeg: null
    });
    expect(equatorWhole.cusps.map((cusp) => cusp.longitudeDeg))
      .toEqual([90, 120, 150, 180, 210, 240, 270, 300, 330, 0, 30, 60]);

    const equatorPorphyry = computeHouseCusps({
      systemId: "porphyry_v1",
      ramcDeg: 0,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.4372
    });
    const equatorEqual = computeHouseCusps({
      systemId: "equal_asc_v1",
      ramcDeg: 0,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.4372
    });
    expect(equatorPorphyry.cusps.map((cusp) => cusp.longitudeDeg))
      .toEqual(equatorEqual.cusps.map((cusp) => cusp.longitudeDeg));

    const porphyry = computeHouseCusps({
      systemId: "porphyry_v1",
      ramcDeg: 100,
      geographicLatitudeDeg: 40,
      obliquityTrueOfDateDeg: 23.4372
    });
    const byNumber = new Map(porphyry.cusps.map((cusp) => [cusp.houseNumber, cusp.longitudeDeg]));
    expect(byNumber.get(1)).toBeCloseTo(porphyry.angles.ascendantDeg, 9);
    expect(byNumber.get(4)).toBeCloseTo(porphyry.angles.imumCoeliDeg, 9);
    expect(byNumber.get(7)).toBeCloseTo(porphyry.angles.descendantDeg, 9);
    expect(byNumber.get(10)).toBeCloseTo(porphyry.angles.midheavenDeg, 9);
    for (const [start, end, middle] of [
      [porphyry.angles.ascendantDeg, porphyry.angles.imumCoeliDeg, byNumber.get(2)!],
      [porphyry.angles.imumCoeliDeg, porphyry.angles.descendantDeg, byNumber.get(5)!],
      [porphyry.angles.descendantDeg, porphyry.angles.midheavenDeg, byNumber.get(8)!],
      [porphyry.angles.midheavenDeg, porphyry.angles.ascendantDeg, byNumber.get(11)!]
    ] as const) {
      expect(circularRange(start, end, middle)).toBe(true);
    }

    const arc = (fromDeg: number, toDeg: number): number => ((toDeg - fromDeg + 360) % 360);
    const quadrants: Array<[number, number, number, number]> = [
      [porphyry.angles.ascendantDeg, byNumber.get(2)!, byNumber.get(3)!, porphyry.angles.imumCoeliDeg],
      [porphyry.angles.imumCoeliDeg, byNumber.get(5)!, byNumber.get(6)!, porphyry.angles.descendantDeg],
      [porphyry.angles.descendantDeg, byNumber.get(8)!, byNumber.get(9)!, porphyry.angles.midheavenDeg],
      [porphyry.angles.midheavenDeg, byNumber.get(11)!, byNumber.get(12)!, porphyry.angles.ascendantDeg]
    ];
    for (const [start, first, second, end] of quadrants) {
      expect(arc(start, first)).toBeCloseTo(arc(first, second), 9);
      expect(arc(first, second)).toBeCloseTo(arc(second, end), 9);
    }
  });

  it("fails closed near polar latitudes instead of inventing house cusps", () => {
    const artifact = runWesternRuleLayer({
      ...baseRequest,
      houses: {
        systemId: "porphyry_v1",
        ramcDeg: 100,
        geographicLatitudeDeg: 90,
        obliquityTrueOfDateDeg: 23.4372
      }
    });
    expect(artifact).toMatchObject({
      outcome: "failed_closed",
      result: null,
      failure: {
        stage: "houses",
        code: "UNSUPPORTED_LATITUDE",
        partialResultReturned: false
      }
    });
    expect(artifact.digests.requestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.digests.resultSha256).toBeNull();
  });

  it("computes Placidus cusps faithfully to its Unlicense reference algorithm", () => {
    const equator = computeHouseCusps({
      systemId: "placidus_v1",
      ramcDeg: 0,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.4367
    });
    const expected = [90, 117.907, 147.824, 180, 212.176, 242.093, 270, 297.907, 327.824, 0, 32.176, 62.093];
    equator.cusps.forEach((cusp, index) => {
      expect(cusp.longitudeDeg).toBeCloseTo(expected[index]!, 2);
    });
    expect(equator.algorithmId).toBe("western-house-placidus/0.1-draft");

    const greenwich = computeHouseCusps({
      systemId: "placidus_v1",
      ramcDeg: 0,
      geographicLatitudeDeg: 51.4779,
      obliquityTrueOfDateDeg: 23.436
    });
    expect(greenwich.cusps[0]!.longitudeDeg).toBeCloseTo(greenwich.angles.ascendantDeg, 9);
    expect(greenwich.cusps[9]!.longitudeDeg).toBeCloseTo(greenwich.angles.midheavenDeg, 9);
    const ordered = greenwich.cusps.map((cusp) => cusp.longitudeDeg);
    for (let index = 1; index < 12; index += 1) {
      const span = (ordered[index]! - ordered[index - 1]! + 360) % 360;
      expect(span).toBeGreaterThan(0);
      expect(span).toBeLessThan(180);
    }

    const artifact = runWesternRuleLayer({
      ...baseRequest,
      houses: {
        systemId: "placidus_v1",
        ramcDeg: 0,
        geographicLatitudeDeg: 51.4779,
        obliquityTrueOfDateDeg: 23.436
      }
    });
    expect(artifact.outcome).toBe("computed");
    if (artifact.outcome !== "computed") throw new Error("Placidus rule layer did not compute");
    expect(artifact.result.houses?.systemId).toBe("placidus_v1");

    const polar = runWesternRuleLayer({
      ...baseRequest,
      houses: {
        systemId: "placidus_v1",
        ramcDeg: 100,
        geographicLatitudeDeg: 65,
        obliquityTrueOfDateDeg: 23.4367
      }
    });
    expect(polar).toMatchObject({
      outcome: "failed_closed",
      failure: {
        stage: "houses",
        code: "UNSUPPORTED_LATITUDE",
        partialResultReturned: false
      }
    });
  });

  it("assigns each body to the house whose cusp span contains its longitude", () => {
    const cusps = [90, 120, 150, 180, 210, 240, 270, 300, 330, 0, 30, 60]
      .map((longitudeDeg, index) => ({ houseNumber: index + 1, longitudeDeg }));
    expect(assignHousePlacement(95, cusps)).toBe(1);
    expect(assignHousePlacement(120, cusps)).toBe(2);
    expect(assignHousePlacement(5, cusps)).toBe(10);
    expect(assignHousePlacement(359, cusps)).toBe(12);

    const artifact = runWesternRuleLayer(baseRequest);
    if (artifact.outcome !== "computed") throw new Error("rule layer did not compute");
    for (const body of artifact.result.bodies) {
      expect(body.houseNumber).toBeGreaterThanOrEqual(1);
      expect(body.houseNumber).toBeLessThanOrEqual(12);
    }
  });

  it("enumerates aspects with exact/applying/separating motion semantics and stable ordering", () => {
    const aspects = enumerateAspects(
      [
        { bodyId: "sun", eclipticLongitudeDeg: 100, longitudeSpeedDegPerDay: 1.02 },
        { bodyId: "moon", eclipticLongitudeDeg: 155, longitudeSpeedDegPerDay: 13.2 }
      ],
      [{ aspectId: "sextile", exactAngleDeg: 60, maxOrbDeg: 8 }]
    );
    expect(aspects).toHaveLength(1);
    expect(aspects[0]).toMatchObject({
      bodyA: "sun",
      bodyB: "moon",
      aspectId: "sextile",
      separationDeg: 55,
      directedOrbDeg: -5,
      orbDeg: 5,
      maxOrbDeg: 8,
      motion: "applying"
    });

    const exact = enumerateAspects(
      [
        { bodyId: "sun", eclipticLongitudeDeg: 100, longitudeSpeedDegPerDay: 1.02 },
        { bodyId: "moon", eclipticLongitudeDeg: 160, longitudeSpeedDegPerDay: 13.2 }
      ],
      [{ aspectId: "sextile", exactAngleDeg: 60, maxOrbDeg: 8 }]
    );
    expect(exact[0]?.motion).toBe("exact");

    expect(() => enumerateAspects(
      [
        { bodyId: "moon", eclipticLongitudeDeg: 160, longitudeSpeedDegPerDay: 13.2 },
        { bodyId: "sun", eclipticLongitudeDeg: 100, longitudeSpeedDegPerDay: 1.02 }
      ],
      [{ aspectId: "sextile", exactAngleDeg: 60, maxOrbDeg: 8 }]
    )).toThrow(/canonical western body order/);
  });

  it("returns a diagnostic-only engineering artifact that never claims a chart or receipt", () => {
    const artifact = runWesternRuleLayer(baseRequest);
    expect(westernRuleLayerArtifactSchema.safeParse(artifact).success).toBe(true);
    expect(artifact).toMatchObject({
      schemaVersion: WESTERN_RULE_LAYER_ARTIFACT_VERSION,
      outcome: "computed",
      disposition: "diagnostic_only",
      evidence: {
        evidenceStatus: "rule_layer_engineering",
        productionEligible: false,
        expertTruthClaimed: false
      },
      strictContractRelation: {
        chartFixtureAccepted: false,
        successReceiptIssued: false
      },
      execution: {
        runtime: "pure_typescript_no_external_ephemeris"
      },
      failure: null
    });
    if (artifact.outcome !== "computed") throw new Error("rule layer did not compute");
    expect("receipt" in artifact).toBe(false);
    expect(artifact.result.projectionVersion).toBe(WESTERN_RULE_LAYER_PROJECTION_VERSION);
    expect(artifact.result.bodies).toHaveLength(2);
    expect(artifact.result.houses?.cusps).toHaveLength(12);
    expect(artifact.result.aspects.length).toBeGreaterThan(0);
    expect(artifact.digests.requestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.digests.resultSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects duplicate or non-canonical bodies before computation", () => {
    const duplicate = runWesternRuleLayer({
      ...baseRequest,
      bodies: [baseRequest.bodies[0]!, baseRequest.bodies[0]!]
    });
    expect(duplicate).toMatchObject({
      outcome: "failed_closed",
      request: null,
      result: null,
      failure: {
        stage: "request_validation",
        code: "INVALID_REQUEST",
        partialResultReturned: false
      }
    });
    expect(westernRuleLayerRequestSchema.safeParse(duplicate.request).success).toBe(false);
  });
});
