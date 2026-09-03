// @vitest-environment node

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
  WESTERN_TROPICAL_ZODIAC_IDENTITY,
  WESTERN_ZODIAC_BOUNDARY_SNAP_TOLERANCE_DEG,
  WESTERN_ZODIAC_BOUNDARY_SNAP_VERSION,
  WESTERN_ZODIAC_RULES_VERSION,
  WESTERN_RULE_LAYER_ARTIFACT_VERSION,
  WESTERN_RULE_LAYER_PROJECTION_VERSION,
  WESTERN_RULE_LAYER_REQUEST_VERSION,
  deriveZodiacPlacement,
  runWesternRuleLayer,
  verifyWesternRuleLayerComputedArtifact,
  westernRuleLayerArtifactSchema,
  westernRuleLayerRequestSchema
} from "./rule-layer/index.ts";
import {
  WESTERN_HOUSE_RULES_VERSION,
  assignHousePlacement,
  computeHouseCusps
} from "./rule-layer/houses.ts";
import { enumerateAspects } from "./rule-layer/aspects.ts";
import { canonicalJson, sha256CanonicalJson, sha256Hex } from "./rule-layer/canonical.ts";

const baseRequest = {
  protocolVersion: WESTERN_RULE_LAYER_REQUEST_VERSION,
  inputLabel: "equinox-2025 rule layer seed",
  bodies: [
    { bodyId: "sun", eclipticLongitudeDeg: 0.5, longitudeSpeedDegPerDay: 0.99 },
    { bodyId: "moon", eclipticLongitudeDeg: 61.2, longitudeSpeedDegPerDay: 13.2 }
  ],
  zodiac: WESTERN_TROPICAL_ZODIAC_IDENTITY,
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
    const tropical = deriveZodiacPlacement(359.5, WESTERN_TROPICAL_ZODIAC_IDENTITY);
    expect(tropical).toMatchObject({
      longitudeDeg: 359.5,
      signIndex: 11,
      signId: "pisces",
      degreeWithinSign: 29.5,
      ayanamshaDeg: null
    });

    const sidereal = deriveZodiacPlacement(30, {
      ...WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
      ayanamshaDeg: 24.1
    });
    expect(sidereal.longitudeDeg).toBeCloseTo(5.9, 9);
    expect(sidereal.signIndex).toBe(0);
    expect(sidereal.signId).toBe("aries");
    expect(sidereal.degreeWithinSign).toBeCloseTo(5.9, 9);
    expect(sidereal.ayanamshaDeg).toBeCloseTo(24.1, 9);
  });

  it("snaps only tiny final-longitude residues at 30-degree boundaries, including 360 to zero", () => {
    const tolerance = WESTERN_ZODIAC_BOUNDARY_SNAP_TOLERANCE_DEG;
    for (const longitudeDeg of [
      30 - tolerance / 2,
      30 + tolerance / 2,
      149.99999999999994
    ]) {
      expect(deriveZodiacPlacement(longitudeDeg, WESTERN_TROPICAL_ZODIAC_IDENTITY))
        .toMatchObject({ longitudeDeg: Math.round(longitudeDeg / 30) * 30, degreeWithinSign: 0 });
    }

    const materiallyBelowInput = 30 - tolerance * 5;
    const materiallyAboveInput = 30 + tolerance * 5;
    const materiallyBelow = deriveZodiacPlacement(
      materiallyBelowInput,
      WESTERN_TROPICAL_ZODIAC_IDENTITY
    );
    const materiallyAbove = deriveZodiacPlacement(
      materiallyAboveInput,
      WESTERN_TROPICAL_ZODIAC_IDENTITY
    );
    expect(Math.abs(materiallyBelow.longitudeDeg - materiallyBelowInput))
      .toBeLessThan(tolerance / 100);
    expect(materiallyBelow.longitudeDeg).not.toBe(30);
    expect(materiallyBelow.signIndex).toBe(0);
    expect(materiallyBelow.degreeWithinSign).toBeGreaterThan(29.999999999);
    expect(Math.abs(materiallyAbove.longitudeDeg - materiallyAboveInput))
      .toBeLessThan(tolerance / 100);
    expect(materiallyAbove.longitudeDeg).not.toBe(30);
    expect(materiallyAbove.signIndex).toBe(1);
    expect(materiallyAbove.degreeWithinSign).toBeGreaterThan(0);

    for (const longitudeDeg of [360, 360 - tolerance / 2]) {
      expect(deriveZodiacPlacement(longitudeDeg, WESTERN_TROPICAL_ZODIAC_IDENTITY))
        .toMatchObject({ longitudeDeg: 0, signIndex: 0, degreeWithinSign: 0 });
    }
  });

  it("rejects unknown, missing, and cross-paired zodiac identities before computation", () => {
    const invalidZodiacs: unknown[] = [
      { kind: "tropical", ayanamshaId: null, ayanamshaDeg: null },
      { kind: "tropical", ayanamshaId: null, algorithmId: "subtract_supplied_offset_v1", ayanamshaDeg: null },
      { kind: "sidereal", ayanamshaId: "lahiri", algorithmId: "subtract_supplied_offset_v1", ayanamshaDeg: 24.1 },
      { kind: "sidereal", ayanamshaId: "manual_offset_unverified", algorithmId: "tropical_identity_v1", ayanamshaDeg: 24.1 },
      { kind: "sidereal", ayanamshaId: "manual_offset_unverified", algorithmId: "subtract_supplied_offset_v1" },
      { kind: "draconic", ayanamshaId: null, algorithmId: "tropical_identity_v1", ayanamshaDeg: null }
    ];

    for (const zodiac of invalidZodiacs) {
      const artifact = runWesternRuleLayer({ ...baseRequest, zodiac });
      expect(artifact).toMatchObject({
        outcome: "failed_closed",
        request: null,
        execution: null,
        result: null,
        failure: {
          stage: "request_validation",
          code: "INVALID_REQUEST",
          partialResultReturned: false
        },
        digests: { requestSha256: null, resultSha256: null }
      });
      expect(() => deriveZodiacPlacement(10, zodiac as never)).toThrow();
    }
  });

  it("fails closed on superseded 0.1, 0.2, and 0.3 request protocols", () => {
    for (const protocolVersion of [
      "western-astrology-rules-request/0.1-draft",
      "western-astrology-rules-request/0.2-draft",
      "western-astrology-rules-request/0.3-draft"
    ]) {
      const artifact = runWesternRuleLayer({ ...baseRequest, protocolVersion });
      expect(artifact).toMatchObject({
        outcome: "failed_closed",
        request: null,
        execution: null,
        result: null,
        failure: {
          stage: "request_validation",
          code: "INVALID_REQUEST",
          partialResultReturned: false
        },
        digests: { requestSha256: null, resultSha256: null }
      });
    }
  });

  it("carries the manual sidereal identity through request, result, execution, and both digests", () => {
    const zodiac = {
      ...WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
      ayanamshaDeg: 24.1
    } as const;
    const artifact = runWesternRuleLayer({ ...baseRequest, zodiac });
    expect(artifact.outcome).toBe("computed");
    if (artifact.outcome !== "computed") throw new Error("sidereal rule layer did not compute");

    expect(artifact.request.zodiac).toEqual(zodiac);
    expect(artifact.result.zodiac).toEqual(zodiac);
    expect(artifact.execution.algorithms.zodiacMethod)
      .toEqual(WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY);
    expect(artifact.execution.algorithms.zodiacMethod).not.toHaveProperty("ayanamshaDeg");
    expect(artifact.result.bodies[0]?.zodiac.longitudeDeg).toBeCloseTo(336.4, 9);
    expect(artifact.digests.requestSha256).toBe(sha256CanonicalJson(artifact.request));
    expect(artifact.digests.resultSha256).toBe(sha256CanonicalJson(artifact.result));
  });

  it("computes whole-sign, equal-ASC and Porphyry cusps with consistent angles", () => {
    const equatorWhole = computeHouseCusps({
      systemId: "whole_sign_v1",
      ramcDeg: 0,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.4372
    }, WESTERN_TROPICAL_ZODIAC_IDENTITY);
    expect(equatorWhole.angles).toEqual({
      ascendantDeg: 90,
      midheavenDeg: 0,
      descendantDeg: 270,
      imumCoeliDeg: 180,
      vertexDeg: null
    });
    expect(equatorWhole.cusps.map((cusp) => cusp.longitudeDeg))
      .toEqual([90, 120, 150, 180, 210, 240, 270, 300, 330, 0, 30, 60]);
    expect(WESTERN_HOUSE_RULES_VERSION).toBe("western-house-rules/0.2-draft");
    expect(equatorWhole.algorithmId).toBe("western-house-whole-sign/0.2-draft");

    const equatorPorphyry = computeHouseCusps({
      systemId: "porphyry_v1",
      ramcDeg: 0,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.4372
    }, WESTERN_TROPICAL_ZODIAC_IDENTITY);
    const equatorEqual = computeHouseCusps({
      systemId: "equal_asc_v1",
      ramcDeg: 0,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.4372
    }, WESTERN_TROPICAL_ZODIAC_IDENTITY);
    expect(equatorPorphyry.cusps.map((cusp) => cusp.longitudeDeg))
      .toEqual(equatorEqual.cusps.map((cusp) => cusp.longitudeDeg));

    const porphyry = computeHouseCusps({
      systemId: "porphyry_v1",
      ramcDeg: 100,
      geographicLatitudeDeg: 40,
      obliquityTrueOfDateDeg: 23.4372
    }, WESTERN_TROPICAL_ZODIAC_IDENTITY);
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

  it("builds sidereal whole-sign raw cusps from the uniquely derived zodiac ascendant", () => {
    const zodiac = {
      ...WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
      ayanamshaDeg: 24.1
    } as const;
    const artifact = runWesternRuleLayer({
      ...baseRequest,
      bodies: [
        { bodyId: "sun", eclipticLongitudeDeg: 100, longitudeSpeedDegPerDay: 1 },
        { bodyId: "moon", eclipticLongitudeDeg: 83, longitudeSpeedDegPerDay: 13 }
      ],
      zodiac,
      houses: {
        systemId: "whole_sign_v1",
        ramcDeg: 10.878621423924955,
        geographicLatitudeDeg: 0,
        obliquityTrueOfDateDeg: 23.4372
      }
    });
    expect(artifact.outcome).toBe("computed");
    if (artifact.outcome !== "computed" || artifact.result.houses === null) {
      throw new Error("sidereal whole-sign rule layer did not compute");
    }

    const houses = artifact.result.houses;
    const siderealAscendant = deriveZodiacPlacement(houses.angles.ascendantDeg, zodiac);
    const firstDisplayedCusp = deriveZodiacPlacement(houses.cusps[0]!.longitudeDeg, zodiac);
    expect(houses.angles.ascendantDeg).toBeCloseTo(100, 12);
    expect(siderealAscendant.longitudeDeg).toBeCloseTo(75.9, 12);
    expect(houses.cusps[0]!.longitudeDeg).toBeCloseTo(84.1, 12);
    expect(firstDisplayedCusp.longitudeDeg).toBeCloseTo(60, 12);
    expect(firstDisplayedCusp.degreeWithinSign).toBeCloseTo(0, 12);
    expect(houses.algorithmId).toBe("western-house-whole-sign/0.2-draft");
    expect(artifact.execution.algorithms.houses).toBe(WESTERN_HOUSE_RULES_VERSION);
    expect(artifact.result.bodies.map((body) => body.houseNumber)).toEqual([1, 12]);
    expect(artifact.digests.requestSha256).toBe(sha256CanonicalJson(artifact.request));
    expect(artifact.digests.resultSha256).toBe(sha256CanonicalJson(artifact.result));

    const wrongBodyHouse = structuredClone(artifact);
    wrongBodyHouse.result.bodies[0]!.houseNumber = 12;
    wrongBodyHouse.digests.resultSha256 = sha256CanonicalJson(wrongBodyHouse.result);
    expect(westernRuleLayerArtifactSchema.safeParse(wrongBodyHouse).success).toBe(false);

    const oldWholeSignIdentity = structuredClone(artifact);
    oldWholeSignIdentity.result.houses!.algorithmId = "western-house-whole-sign/0.1-draft";
    oldWholeSignIdentity.digests.resultSha256 = sha256CanonicalJson(oldWholeSignIdentity.result);
    expect(westernRuleLayerArtifactSchema.safeParse(oldWholeSignIdentity).success).toBe(false);
  });

  it("snaps all twelve manual-offset whole-sign cusp projections to their exact sign boundaries", () => {
    const zodiac = {
      ...WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
      ayanamshaDeg: 2.0002
    } as const;
    const houses = computeHouseCusps({
      systemId: "whole_sign_v1",
      ramcDeg: 10.878621423924955,
      geographicLatitudeDeg: 0,
      obliquityTrueOfDateDeg: 23.4372
    }, zodiac);
    const ascendant = deriveZodiacPlacement(houses.angles.ascendantDeg, zodiac);
    const projectedCusps = houses.cusps.map((cusp) => ({
      houseNumber: cusp.houseNumber,
      placement: deriveZodiacPlacement(cusp.longitudeDeg, zodiac)
    }));

    expect(ascendant.longitudeDeg).toBeCloseTo(97.9998, 12);
    expect(projectedCusps.map(({ placement }) => placement.signIndex))
      .toEqual(Array.from({ length: 12 }, (_, index) => (ascendant.signIndex + index) % 12));
    expect(projectedCusps.every(({ placement }) => placement.degreeWithinSign === 0)).toBe(true);
  });

  it("keeps equal, Porphyry, and Placidus raw geometry independent of zodiac frame", () => {
    const sidereal = {
      ...WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
      ayanamshaDeg: 24.1
    } as const;
    for (const systemId of ["equal_asc_v1", "porphyry_v1", "placidus_v1"] as const) {
      const geometry = {
        systemId,
        ramcDeg: 0,
        geographicLatitudeDeg: 0,
        obliquityTrueOfDateDeg: 23.4372
      };
      expect(computeHouseCusps(geometry, sidereal))
        .toEqual(computeHouseCusps(geometry, WESTERN_TROPICAL_ZODIAC_IDENTITY));
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
    }, WESTERN_TROPICAL_ZODIAC_IDENTITY);
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
    }, WESTERN_TROPICAL_ZODIAC_IDENTITY);
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

  it("assigns wraparound spans at their actual house and keeps start-inclusive/end-exclusive boundaries", () => {
    const cusps = [90, 120, 150, 180, 210, 240, 270, 300, 330, 0, 30, 60]
      .map((longitudeDeg, index) => ({ houseNumber: index + 1, longitudeDeg }));
    expect(assignHousePlacement(95, cusps)).toBe(1);
    expect(assignHousePlacement(120, cusps)).toBe(2);
    expect(assignHousePlacement(5, cusps)).toBe(10);
    expect(assignHousePlacement(330, cusps)).toBe(9);
    expect(assignHousePlacement(359, cusps)).toBe(9);
    expect(assignHousePlacement(0, cusps)).toBe(10);

    for (const [firstCuspDeg, wrappedHouse, candidateDeg] of [
      [350, 1, 359],
      [90, 9, 359],
      [0, 12, 359]
    ] as const) {
      const rotatedCusps = Array.from({ length: 12 }, (_, index) => ({
        houseNumber: index + 1,
        longitudeDeg: (firstCuspDeg + index * 30) % 360
      }));
      expect(assignHousePlacement(candidateDeg, rotatedCusps)).toBe(wrappedHouse);
      const nextHouse = wrappedHouse === 12 ? 1 : wrappedHouse + 1;
      const nextStart = rotatedCusps[nextHouse - 1]!.longitudeDeg;
      expect(assignHousePlacement(nextStart, rotatedCusps)).toBe(nextHouse);
    }

    const artifact = runWesternRuleLayer(baseRequest);
    if (artifact.outcome !== "computed") throw new Error("rule layer did not compute");
    for (const body of artifact.result.bodies) {
      expect(body.houseNumber).toBeGreaterThanOrEqual(1);
      expect(body.houseNumber).toBeLessThanOrEqual(12);
    }
  });

  it("fails closed for degenerate, multi-circumference, or non-finite house placement inputs", () => {
    const canonicalCusps = Array.from({ length: 12 }, (_, index) => ({
      houseNumber: index + 1,
      longitudeDeg: index * 30
    }));
    const degenerate = structuredClone(canonicalCusps);
    degenerate[1]!.longitudeDeg = degenerate[0]!.longitudeDeg;
    expect(() => assignHousePlacement(10, degenerate)).toThrow(/degenerate/);

    const multiCircumference = Array.from({ length: 12 }, (_, index) => ({
      houseNumber: index + 1,
      longitudeDeg: (index * 200) % 360
    }));
    expect(() => assignHousePlacement(10, multiCircumference))
      .toThrow(/exactly one circumference/);
    expect(() => assignHousePlacement(Number.NaN, canonicalCusps)).toThrow(/finite longitude/);
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
        algorithms: {
          zodiac: WESTERN_ZODIAC_RULES_VERSION,
          zodiacBoundarySnap: WESTERN_ZODIAC_BOUNDARY_SNAP_VERSION,
          zodiacMethod: {
            kind: WESTERN_TROPICAL_ZODIAC_IDENTITY.kind,
            ayanamshaId: WESTERN_TROPICAL_ZODIAC_IDENTITY.ayanamshaId,
            algorithmId: WESTERN_TROPICAL_ZODIAC_IDENTITY.algorithmId
          }
        },
        runtime: "pure_typescript_no_external_ephemeris"
      },
      result: {
        zodiac: WESTERN_TROPICAL_ZODIAC_IDENTITY
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
    expect(artifact.digests.requestSha256).toBe(sha256CanonicalJson(artifact.request));
    expect(artifact.digests.resultSha256).toBe(sha256CanonicalJson(artifact.result));
    expect(verifyWesternRuleLayerComputedArtifact(artifact)).toEqual(artifact);
    expect(WESTERN_RULE_LAYER_REQUEST_VERSION)
      .toBe("western-astrology-rules-request/0.4-draft");
    expect(WESTERN_RULE_LAYER_ARTIFACT_VERSION)
      .toBe("western-astrology-rules-artifact/0.4-draft");
    expect(WESTERN_RULE_LAYER_PROJECTION_VERSION)
      .toBe("western-astrology-rules-projection/0.4-draft");
  });

  it("rejects valid-looking request/result/execution identity swaps and recomputed digest tampering", () => {
    const artifact = runWesternRuleLayer(baseRequest);
    if (artifact.outcome !== "computed") throw new Error("rule layer did not compute");

    const resultSwap = structuredClone(artifact);
    resultSwap.result.zodiac = {
      ...WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
      ayanamshaDeg: 24.1
    };
    resultSwap.execution.algorithms.zodiacMethod =
      WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY;
    resultSwap.digests.resultSha256 = sha256CanonicalJson(resultSwap.result);
    expect(westernRuleLayerArtifactSchema.safeParse(resultSwap).success).toBe(false);
    expect(() => verifyWesternRuleLayerComputedArtifact(resultSwap)).toThrow();

    const executionSwap = structuredClone(artifact);
    executionSwap.execution.algorithms.zodiacMethod =
      WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY;
    expect(westernRuleLayerArtifactSchema.safeParse(executionSwap).success).toBe(false);

    const leakedOffset = structuredClone(artifact);
    leakedOffset.execution.algorithms.zodiacMethod = {
      kind: "tropical",
      ayanamshaId: null,
      algorithmId: "tropical_identity_v1",
      ayanamshaDeg: null
    } as never;
    expect(westernRuleLayerArtifactSchema.safeParse(leakedOffset).success).toBe(false);

    const unknownMethod = structuredClone(artifact);
    unknownMethod.execution.algorithms.zodiacMethod = {
      kind: "tropical",
      ayanamshaId: null,
      algorithmId: "unknown_identity_v1"
    } as never;
    expect(westernRuleLayerArtifactSchema.safeParse(unknownMethod).success).toBe(false);

    const digestSwap = structuredClone(artifact);
    digestSwap.digests.resultSha256 = "0".repeat(64);
    expect(westernRuleLayerArtifactSchema.safeParse(digestSwap).success).toBe(false);
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
