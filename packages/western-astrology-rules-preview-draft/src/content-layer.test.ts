// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  WESTERN_CONTENT_LAYER_VERSION,
  WESTERN_CONTENT_SOURCES,
  buildWesternContentProjection
} from "./browser-app/content-layer.ts";
import { runWesternRuleLayer } from "./rule-layer-bridge.ts";

const request = {
  protocolVersion: "western-astrology-rules-request/0.1-draft",
  inputLabel: "western content layer test",
  bodies: [
    { bodyId: "sun", eclipticLongitudeDeg: 0.5, longitudeSpeedDegPerDay: 0.99 },
    { bodyId: "mercury", eclipticLongitudeDeg: 60.5, longitudeSpeedDegPerDay: -0.5 }
  ],
  zodiac: { kind: "tropical", ayanamshaDeg: null },
  houses: {
    systemId: "whole_sign_v1",
    ramcDeg: 0,
    geographicLatitudeDeg: 0,
    obliquityTrueOfDateDeg: 23.436
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

const chainRequest = {
  ...request,
  inputLabel: "western dispositor chain test",
  bodies: [
    { bodyId: "sun", eclipticLongitudeDeg: 120.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "moon", eclipticLongitudeDeg: 30.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "mercury", eclipticLongitudeDeg: 60.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "venus", eclipticLongitudeDeg: 90.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "mars", eclipticLongitudeDeg: 210.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "jupiter", eclipticLongitudeDeg: 240.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "saturn", eclipticLongitudeDeg: 300.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "uranus", eclipticLongitudeDeg: 270.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "neptune", eclipticLongitudeDeg: 330.5, longitudeSpeedDegPerDay: 0.1 },
    { bodyId: "pluto", eclipticLongitudeDeg: 210.8, longitudeSpeedDegPerDay: 0.1 }
  ]
};

describe("Western source-bound neutral content layer", () => {
  it("binds computed placements and aspects to neutral candidate content", () => {
    const artifact = runWesternRuleLayer(request);
    if (artifact.outcome !== "computed") throw new Error("rule layer did not compute");

    const artifactBefore = structuredClone(artifact);
    const projection = buildWesternContentProjection(artifact);

    expect(projection).toMatchObject({
      projectionVersion: WESTERN_CONTENT_LAYER_VERSION,
      outcome: "candidate_content_built",
      factsSha256: artifact.digests.resultSha256,
      framework: "modern_western_astrology_source_bound_candidate",
      boundary: {
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        deterministicOutcomeClaimed: false,
        goodBadScoreGenerated: false,
        medicalOrFinancialAdviceGenerated: false
      }
    });
    expect(projection.placements).toHaveLength(2);
    expect(projection.aspects).toHaveLength(1);
    expect(projection.bodySyntheses).toHaveLength(2);
    expect(projection.firstRead).toMatchObject({
      candidateId: "western.first-read.sun-moon-ascendant-chart-ruler",
      evidenceClass: "derived_reading_order_projection",
      availableCount: 2,
      missingKeys: ["moon", "chart_ruler"],
      selectedPrimaryFactor: null,
      overallResult: null,
      goodBadOrientation: null,
      review: { status: "awaiting_expert_review", result: null }
    });
    expect(projection.firstRead.entries.map((entry) => entry.key)).toEqual([
      "sun",
      "moon",
      "ascendant",
      "chart_ruler"
    ]);
    expect(projection.firstRead.entries.map((entry) => entry.sequence)).toEqual([1, 2, 3, 4]);
    expect(projection.firstRead.entries.find((entry) => entry.key === "sun")).toMatchObject({
      availability: "available",
      referencedCandidateIds: [
        "western.body-synthesis.sun",
        "western.placement.sun.aries.house-10"
      ]
    });
    expect(projection.firstRead.entries.find((entry) => entry.key === "moon")).toMatchObject({
      availability: "not_requested",
      referencedCandidateIds: []
    });
    expect(projection.firstRead.entries.find((entry) => entry.key === "chart_ruler")).toMatchObject({
      availability: "not_available",
      referencedCandidateIds: []
    });
    expect(projection.firstRead.directStatement).toMatch(/固定导航顺序，不是主导力量排名/);
    expect(projection.firstRead.scopeNote).toMatch(/缺失项保持关闭/);
    expect(projection.angles).toHaveLength(4);
    expect(projection.houseRulers).toHaveLength(12);
    expect(projection.chartRuler).not.toBeNull();
    expect(projection.dispositorChains).toHaveLength(2);
    expect(projection.angleProximity?.entries).toHaveLength(2);
    expect(projection.sources).toHaveLength(31);

    expect(projection.placements[0]).toMatchObject({
      candidateId: "western.placement.sun.aries.house-10",
      bodyId: "sun",
      bodyLabel: "太阳",
      signId: "aries",
      signLabel: "白羊",
      houseNumber: 10,
      houseLabel: "十宫",
      retrograde: false,
      review: {
        status: "awaiting_expert_review",
        result: null
      }
    });
    expect(projection.placements[0]?.directStatement).toContain("自我认同、意志与创造性表达");
    expect(projection.placements[0]?.directStatement).toContain("职业方向、公共角色、目标与社会责任");
    expect(projection.placements[0]?.directStatement).toContain("火元素 · 开创");
    expect(projection.placements[0]?.sourceIds).toEqual(expect.arrayContaining([
      "astrodienst.planet.sun",
      "astrodienst.signs",
      "astrodienst.houses",
      "astrodienst.interpretation"
    ]));

    expect(projection.placements[1]).toMatchObject({
      candidateId: "western.placement.mercury.gemini.house-12",
      bodyId: "mercury",
      bodyLabel: "水星",
      signId: "gemini",
      houseNumber: 12,
      retrograde: true,
      review: {
        status: "awaiting_expert_review",
        result: null
      }
    });
    expect(projection.placements[1]?.scopeNote).toContain("本版只记录事实");
    expect(projection.placements[1]?.scopeNote).not.toContain("内化的思考者");

    expect(projection.aspects[0]).toMatchObject({
      candidateId: "western.aspect.sun.mercury.sextile",
      bodyA: "sun",
      bodyB: "mercury",
      aspectId: "sextile",
      aspectLabel: "六合",
      exactAngleDeg: 60,
      orbDeg: 0,
      motion: "exact",
      review: {
        status: "awaiting_expert_review",
        result: null
      }
    });
    expect(projection.aspects[0]?.directStatement).toContain("存在可协作的通道");
    expect(projection.aspects[0]?.sourceIds).toContain("astrodienst.aspects");
    expect(projection.placements.every((candidate) => candidate.review.result === null)).toBe(true);
    expect(projection.aspects.every((candidate) => candidate.review.result === null)).toBe(true);
    expect(projection.angles.every((candidate) => candidate.review.result === null)).toBe(true);
    expect(projection.houseRulers.every((candidate) => candidate.review.result === null)).toBe(true);
    expect(projection.distribution.review.result).toBeNull();
    expect(projection.chartRuler?.review.result).toBeNull();
    expect(projection.dispositorChains.every((candidate) => candidate.review.result === null)).toBe(true);
    expect(projection.angleProximity?.review.result).toBeNull();
    expect(projection.bodySyntheses.every((candidate) => (
      candidate.review.result === null
      && candidate.overallResult === null
      && candidate.goodBadOrientation === null
      && candidate.evidenceClass === "derived_same_body_projection"
    ))).toBe(true);
    expect(projection.bodySyntheses.flatMap((candidate) => candidate.aspectLinks)).toHaveLength(2);

    const sunSynthesis = projection.bodySyntheses.find((candidate) => candidate.bodyId === "sun")!;
    expect(sunSynthesis).toMatchObject({
      candidateId: "western.body-synthesis.sun",
      bodyLabel: "太阳",
      slowBodyHouseFirst: false,
      chartRulerProfiles: [],
      overallResult: null,
      goodBadOrientation: null,
      review: { status: "awaiting_expert_review", result: null }
    });
    expect(sunSynthesis.placement.candidateId).toBe("western.placement.sun.aries.house-10");
    expect(sunSynthesis.aspectLinks).toHaveLength(1);
    expect(sunSynthesis.aspectLinks[0]).toMatchObject({
      counterpartBodyId: "mercury",
      candidate: { candidateId: "western.aspect.sun.mercury.sextile" }
    });
    expect(sunSynthesis.dispositor.startBodyId).toBe("sun");
    expect(sunSynthesis.nearestAngle).toMatchObject({ bodyId: "sun", angleId: "midheaven" });
    expect(sunSynthesis.directStatement).toMatch(/不按条目数量或相位类型自动判定主导、强弱或吉凶/);
    expect(sunSynthesis.readingOrderStatement).toMatch(/出现矛盾时保留矛盾/);
    expect(artifact).toEqual(artifactBefore);
  });

  it("derives four axes, transparent distributions and parallel ruler profiles from facts", () => {
    const artifact = runWesternRuleLayer(request);
    if (artifact.outcome !== "computed") throw new Error("rule layer did not compute");

    const projection = buildWesternContentProjection(artifact);
    expect(projection.angles.map((candidate) => candidate.angleId)).toEqual([
      "ascendant",
      "midheaven",
      "descendant",
      "imum_coeli"
    ]);
    const ascendant = projection.angles[0]!;
    const descendant = projection.angles[2]!;
    expect((descendant.zodiacLongitudeDeg - ascendant.zodiacLongitudeDeg + 360) % 360)
      .toBeCloseTo(180, 10);
    expect(ascendant.sourceIds).toContain("astrodienst.angle.ascendant");

    const [allBodies, coreFive] = projection.distribution.scopes;
    expect(allBodies.bodyIds).toEqual(["sun", "mercury"]);
    expect(coreFive.bodyIds).toEqual(["sun", "mercury"]);
    expect(allBodies.elements.map((bucket) => [bucket.id, bucket.count])).toEqual([
      ["fire", 1],
      ["earth", 0],
      ["air", 1],
      ["water", 0]
    ]);
    expect(allBodies.modalities.map((bucket) => [bucket.id, bucket.count])).toEqual([
      ["cardinal", 1],
      ["fixed", 0],
      ["mutable", 1]
    ]);
    expect(projection.distribution.limitStatement).toContain("不是公认权重");

    expect(projection.houseRulers.map((candidate) => candidate.houseNumber))
      .toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const divergent = projection.houseRulers.filter(
      (candidate) => candidate.traditional.rulerBodyId !== candidate.modern.rulerBodyId
    );
    expect(divergent.map((candidate) => candidate.cuspSignId).sort())
      .toEqual(["aquarius", "pisces", "scorpio"]);
    const scorpio = divergent.find((candidate) => candidate.cuspSignId === "scorpio")!;
    expect(scorpio.traditional.rulerBodyId).toBe("mars");
    expect(scorpio.modern.rulerBodyId).toBe("pluto");
    expect(scorpio.scopeNote).toContain("并列呈现");
    expect(scorpio.sourceIds).toEqual(expect.arrayContaining([
      "astrodienst.house_ruler",
      "astrodienst.ruler",
      "astrodienst.planet.mars",
      "astrodienst.planet.pluto"
    ]));

    expect(projection.chartRuler).toMatchObject({
      candidateId: "western.chart-ruler.ascendant",
      ascendantSignId: "cancer",
      traditional: {
        rulerBodyId: "moon",
        placementAvailable: false
      },
      modern: {
        rulerBodyId: "moon",
        placementAvailable: false
      },
      review: {
        status: "awaiting_expert_review",
        result: null
      }
    });
    expect(projection.chartRuler?.sourceIds).toEqual(expect.arrayContaining([
      "astrodienst.chart_ruler",
      "astrodienst.angle.ascendant",
      "astrodienst.planet.moon"
    ]));

    expect(projection.angleProximity).not.toBeNull();
    const proximityEntries = projection.angleProximity!.entries;
    expect(proximityEntries.map((entry) => entry.separationDeg)).toEqual([0.5, 29.5]);
    expect(proximityEntries[0]).toMatchObject({
      rank: 1,
      bodyId: "sun",
      angleId: "midheaven",
      withinOneDegreeReviewBand: true
    });
    expect(proximityEntries[1]).toMatchObject({
      rank: 2,
      bodyId: "mercury",
      angleId: "ascendant",
      withinOneDegreeReviewBand: false
    });
    expect("angular" in proximityEntries[0]!).toBe(false);
    expect("isAngular" in proximityEntries[0]!).toBe(false);
    expect(projection.angleProximity?.limitStatement).toContain("不设统一 orb");
  });

  it("keeps traditional and modern dispositor chains parallel without upgrading cycles to expert truth", () => {
    const artifact = runWesternRuleLayer(chainRequest);
    if (artifact.outcome !== "computed") throw new Error("rule layer did not compute");

    const projection = buildWesternContentProjection(artifact);
    expect(projection.firstRead.availableCount).toBe(4);
    expect(projection.firstRead.missingKeys).toEqual([]);
    expect(projection.firstRead.entries.every((entry) => entry.availability === "available")).toBe(true);
    expect(projection.dispositorChains).toHaveLength(10);
    expect(projection.bodySyntheses).toHaveLength(10);
    expect(new Set(projection.bodySyntheses.map((candidate) => candidate.candidateId)).size).toBe(10);
    expect(projection.bodySyntheses.flatMap((candidate) => candidate.aspectLinks)).toHaveLength(
      projection.aspects.length * 2
    );
    const saturnSynthesis = projection.bodySyntheses.find((candidate) => candidate.bodyId === "saturn")!;
    expect(saturnSynthesis.slowBodyHouseFirst).toBe(true);
    expect(saturnSynthesis.scopeNote).toMatch(/世代共性.*先把落宫和相位/);

    const sun = projection.dispositorChains.find((candidate) => candidate.startBodyId === "sun")!;
    expect(sun.traditional).toMatchObject({
      termination: "domicile",
      terminalBodyId: "sun",
      twoBodySignExchange: false
    });
    expect(sun.modern).toMatchObject({
      termination: "domicile",
      terminalBodyId: "sun",
      twoBodySignExchange: false
    });

    const moon = projection.dispositorChains.find((candidate) => candidate.startBodyId === "moon")!;
    expect(moon.profilesEqual).toBe(true);
    expect(moon.traditional).toMatchObject({
      termination: "cycle",
      cycleBodyIds: ["moon", "venus"],
      twoBodySignExchange: true
    });
    expect(moon.modern).toMatchObject({
      termination: "cycle",
      cycleBodyIds: ["moon", "venus"],
      twoBodySignExchange: true
    });
    expect(moon.traditional.statement).toContain("互换候选");
    expect(moon.review.result).toBeNull();

    for (const bodyId of ["mars", "saturn", "uranus", "neptune", "pluto"]) {
      expect(projection.dispositorChains.find((candidate) => candidate.startBodyId === bodyId)?.profilesEqual)
        .toBe(false);
    }
    const saturn = projection.dispositorChains.find((candidate) => candidate.startBodyId === "saturn")!;
    expect(saturn.traditional.termination).toBe("domicile");
    expect(saturn.modern).toMatchObject({
      termination: "cycle",
      cycleBodyIds: ["saturn", "uranus"],
      twoBodySignExchange: true
    });
    expect(projection.dispositorChains.every((candidate) => candidate.review.result === null)).toBe(true);
  });

  it("keeps a complete unique source registry with practitioner and scientific boundaries", () => {
    expect(WESTERN_CONTENT_SOURCES).toHaveLength(31);
    expect(new Set(WESTERN_CONTENT_SOURCES.map((source) => source.sourceId)).size)
      .toBe(WESTERN_CONTENT_SOURCES.length);
    expect(WESTERN_CONTENT_SOURCES.filter((source) => source.role === "practitioner_reference"))
      .toHaveLength(28);
    expect(WESTERN_CONTENT_SOURCES.filter((source) => source.role === "interpretation_boundary"))
      .toHaveLength(2);
    expect(WESTERN_CONTENT_SOURCES.filter((source) => source.role === "scientific_boundary"))
      .toHaveLength(1);
    expect(WESTERN_CONTENT_SOURCES.every((source) => source.url.startsWith("https://"))).toBe(true);
  });

  it("fails closed rather than generating content from a failed rule artifact", () => {
    const failed = runWesternRuleLayer({ ...request, bodies: [] });
    expect(failed.outcome).toBe("failed_closed");
    expect(() => buildWesternContentProjection(failed)).toThrow(
      /requires a diagnostic-only computed artifact/
    );
  });
});
