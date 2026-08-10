import { describe, expect, it } from "vitest";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DIGEST_VERIFICATION,
  ZIWEI_EARTHLY_BRANCH_IDS,
  ZIWEI_PALACE_ROLE_IDS,
  ZIWEI_SHICHEN_SLOTS,
  ZIWEI_TRANSFORMATION_IDS,
  calculateZiweiNatalFixtureDigests,
  canonicalizeZiweiDigestJson,
  projectZiweiRuleSnapshotForDigest,
  sha256ZiweiCanonicalJson,
  ziweiBirthInputDraftSchema,
  ziweiNatalFixtureDraftSchema,
  verifyZiweiNatalFixtureDraft
} from "./index";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const COMMIT = "c".repeat(40);
const HEAVENLY_STEM_IDS = [
  "jia",
  "yi",
  "bing",
  "ding",
  "wu",
  "ji",
  "geng",
  "xin",
  "ren",
  "gui"
] as const;
const PALACE_STEM_IDS = [
  "jia",
  "yi",
  "bing",
  "ding",
  "wu",
  "ji",
  "geng",
  "xin",
  "ren",
  "gui",
  "jia",
  "yi"
] as const;

function buildMutagenManifest() {
  return HEAVENLY_STEM_IDS.map((heavenlyStemId) => ({
    heavenlyStemId,
    transformations: heavenlyStemId === "yi"
      ? {
          lu: "ziwei.star.fixture-0",
          quan: "ziwei.star.fixture-1",
          ke: "ziwei.star.fixture-2",
          ji: "ziwei.star.fixture-3"
        }
      : {
          lu: `ziwei.star.table-${heavenlyStemId}-lu`,
          quan: `ziwei.star.table-${heavenlyStemId}-quan`,
          ke: `ziwei.star.table-${heavenlyStemId}-ke`,
          ji: `ziwei.star.table-${heavenlyStemId}-ji`
        }
  }));
}

function buildStarRegistry() {
  const starIds = new Set<string>([
    ...Array.from({ length: 20 }, (_, index) => `ziwei.star.fixture-${index}`),
    ...HEAVENLY_STEM_IDS.flatMap((heavenlyStemId) => [
      `ziwei.star.table-${heavenlyStemId}-lu`,
      `ziwei.star.table-${heavenlyStemId}-quan`,
      `ziwei.star.table-${heavenlyStemId}-ke`,
      `ziwei.star.table-${heavenlyStemId}-ji`
    ])
  ]);
  for (let index = 0; starIds.size < 162; index += 1) {
    starIds.add(`ziwei.star.registry-filler-${index}`);
  }
  return [...starIds].map((starId, index) => ({
    upstreamKey: `fixtureStar${index}`,
    starId,
    zhCnLabel: `fixture-star-label-${index}`
  }));
}

function buildBrightnessManifest() {
  return Array.from({ length: 20 }, (_, index) => ({
    starId: `ziwei.star.fixture-${index}`,
    byEarthlyBranch: Object.fromEntries(
      ZIWEI_EARTHLY_BRANCH_IDS.map((branchId) => [branchId, "miao"])
    )
  }));
}

async function buildFixture() {
  const palaces = ZIWEI_PALACE_ROLE_IDS.map((roleId, index) => ({
    earthlyBranchId: ZIWEI_EARTHLY_BRANCH_IDS[index],
    heavenlyStemId: PALACE_STEM_IDS[index],
    roleId,
    isBodyPalace: index === 1,
    stars: index < 4
      ? [{
          starId: `ziwei.star.fixture-${index}`,
          scope: "natal" as const,
          category: "major" as const,
          brightnessId: "miao",
          transformationIds: [ZIWEI_TRANSFORMATION_IDS[index]!],
          placementRuleId: "fixture_placement"
        }]
      : []
  }));
  const majorPeriods = Array.from({ length: 12 }, (_, index) => {
    const palace = palaces[(palaces.length - index) % palaces.length]!;
    const startAge = 2 + index * 10;
    return {
      sequence: index + 1,
      palaceRoleId: palace.roleId,
      heavenlyStemId: palace.heavenlyStemId,
      earthlyBranchId: palace.earthlyBranchId,
      direction: "backward" as const,
      ageKind: "nominal_age" as const,
      startAge,
      endAge: startAge + 9
    };
  });

  const fixture = ziweiNatalFixtureDraftSchema.parse({
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    artifactKind: "ziwei_natal_engineering_fixture",
    input: {
      contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
      systemId: "ziwei-doushu",
      calendarInput: { calendar: "gregorian", date: "1995-08-18" },
      shichenIndex: 0,
      sexForCalculation: "male",
      solarTimeAdjustment: "none",
      civilContext: {
        usedForCalculation: false,
        localTime: null,
        timeZone: "Asia/Shanghai",
        location: { precision: "coordinates", label: "上海", latitude: 31.2304, longitude: 121.4737 }
      },
      birthSourceRef: "birth.example",
      sourceNote: "纯合成契约结构样例，不是排盘结果或命理真值"
    },
    ruleSnapshot: {
      contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
      systemId: "ziwei-doushu",
      profileId: "iztro_fixture_profile",
      profileVersion: "0.1.0",
      status: "contract_draft",
      engine: {
        adapterId: "iztro_adapter",
        adapterVersion: "0.1.0",
        upstreamName: "iztro",
        upstreamVersion: "2.5.8",
        upstreamCommit: COMMIT,
        upstreamNpmIntegrity: "sha512-kgyyvxdSEvgJxi6zvHpvzGbXZLGXCdhTHYK2Pe/sRdBIQ7RfCArvupmg2ChUMQCSQGomW7XCI0gWwUuKJwPENg==",
        dependencyGraphSha256: SHA_A,
        adapterSourceSha256: SHA_B,
        workerEntrySha256: SHA_C,
        workerProtocolVersion: "hakimi-ziwei-iztro-worker/0.1-draft",
        isolation: "fresh_worker_per_calculation",
        isolatedExecution: true,
        configurationMode: "full_snapshot_per_calculation",
        sourceIds: ["source:iztro"]
      },
      verifiedRange: { from: "1900-01-01", to: "2100-12-31", outsideRangePolicy: "reject" },
      rules: {
        leapMonthPlacement: { mode: "unadjusted" },
        yearBoundary: "lunar_new_year",
        horoscopeBoundary: "lunar_new_year",
        lateZiDay: "current_civil_day",
        ageBoundary: "calendar_year",
        algorithm: "iztro_default",
        chartType: "heaven",
        starRegistry: {
          tableId: "iztro_star_registry_fixture",
          tableVersion: "0.1.0",
          contentSha256: SHA_C,
          immutableLocator: "https://fixtures.invalid/ziwei/star-registry-v0.1.0.json",
          entryCount: 162,
          entries: buildStarRegistry(),
          sourceIds: ["source:iztro"]
        },
        mutagenTable: {
          tableId: "iztro_mutagen_fixture",
          tableVersion: "0.1.0",
          contentSha256: SHA_A,
          immutableLocator: "https://fixtures.invalid/ziwei/mutagens-v0.1.0.json",
          entryCount: 10,
          entries: buildMutagenManifest(),
          sourceIds: ["source:iztro"]
        },
        brightnessTable: {
          tableId: "iztro_brightness_fixture",
          tableVersion: "0.1.0",
          contentSha256: SHA_B,
          immutableLocator: "https://fixtures.invalid/ziwei/brightness-v0.1.0.json",
          entryCount: 20,
          canonicalBranchOrder: [...ZIWEI_EARTHLY_BRANCH_IDS],
          missingStarPolicy: "null_brightness",
          entries: buildBrightnessManifest(),
          sourceIds: ["source:iztro"]
        },
        enabledFactFamilies: ["calendar", "palaces", "natal_stars", "transformations", "major_periods"],
        interpretationIncluded: false
      },
      sourceCatalog: [
        {
          sourceId: "source:iztro",
          kind: "implementation_reference",
          title: "iztro source snapshot",
          publisher: "SylarLong/iztro contributors",
          url: "https://github.com/SylarLong/iztro/tree/9d39f1743bf31c2b3c635c9b9556215d9c90ee2c",
          versionOrDate: "2.5.8 / 9d39f1743bf31c2b3c635c9b9556215d9c90ee2c",
          retrievedAt: "2026-08-10T00:00:00.000Z",
          usage: "adapter_behavior",
          rightsStatus: "mit_notice_required",
          notes: "只约束实现候选的结构，不证明本合成样例是上游输出"
        },
        {
          sourceId: "source:hko-calendar",
          kind: "official_calendar",
          title: "Gregorian-Lunar Calendar Conversion Table",
          publisher: "Hong Kong Observatory",
          url: "https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table",
          versionOrDate: "2026",
          retrievedAt: "2026-08-10T00:00:00.000Z",
          usage: "calendar_fixture",
          rightsStatus: "open_data_terms_recorded",
          notes: "只说明未来历法 fixture 的来源门；本合成日期未声明已完成官方核对"
        }
      ],
      review: { status: "unreviewed", attestations: [] },
      ruleSnapshotSha256: SHA_A
    },
    facts: {
      contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
      systemId: "ziwei-doushu",
      calendarFacts: {
        gregorianDate: "1995-08-18",
        lunarDate: { year: 1995, month: 7, day: 23, isLeapMonth: false },
        shichen: { index: 0, branchId: "zi", civilRange: "00:00-01:00" },
        ganzhi: { year: "yi_hai", month: "jia_shen", day: "xin_si", hour: "wu_zi" }
      },
      directionBasis: {
        yearStemId: "yi",
        yearBranchId: "hai",
        yearPolarity: "yin",
        sexForCalculation: "male",
        resolvedDirection: "backward",
        ruleId: "yin_yang_sex_direction"
      },
      lifePalaceBranchId: "zi",
      bodyPalaceBranchId: "chou",
      lifeMasterStarId: "ziwei.star.fixture-0",
      bodyMasterStarId: "ziwei.star.fixture-1",
      fiveElementBureauId: "water_2",
      palaces,
      majorPeriods
    },
    provenance: [
      {
        factFamily: "calendar",
        fieldPath: "facts.calendarFacts",
        algorithmId: "synthetic_calendar_shape",
        sourceIds: ["source:hko-calendar"],
        verificationStatus: "engineering_fixture_only"
      },
      {
        factFamily: "palaces",
        fieldPath: "facts.palaces",
        algorithmId: "synthetic_palace_shape",
        sourceIds: ["source:iztro"],
        verificationStatus: "engineering_fixture_only"
      },
      {
        factFamily: "natal_stars",
        fieldPath: "facts.palaces",
        algorithmId: "synthetic_star_shape",
        sourceIds: ["source:iztro"],
        verificationStatus: "engineering_fixture_only"
      },
      {
        factFamily: "transformations",
        fieldPath: "facts.palaces",
        algorithmId: "synthetic_mutagen_shape",
        sourceIds: ["source:iztro"],
        verificationStatus: "engineering_fixture_only"
      },
      {
        factFamily: "major_periods",
        fieldPath: "facts.majorPeriods",
        algorithmId: "synthetic_major_period_shape",
        sourceIds: ["source:iztro"],
        verificationStatus: "engineering_fixture_only"
      }
    ],
    evidence: {
      truthStatus: "synthetic_contract_fixture",
      claimScopes: ["fixture_structure"],
      productionEligible: false,
      expertTruthClaimed: false,
      note: "只验证严格结构和失败关闭边界，不验证排盘或命理正确性"
    },
    receipt: {
      receiptVersion: "ziwei-calculation-receipt/0.3-draft",
      engine: {
        adapterId: "iztro_adapter",
        adapterVersion: "0.1.0",
        upstreamName: "iztro",
        upstreamVersion: "2.5.8",
        upstreamCommit: COMMIT,
        upstreamNpmIntegrity: "sha512-kgyyvxdSEvgJxi6zvHpvzGbXZLGXCdhTHYK2Pe/sRdBIQ7RfCArvupmg2ChUMQCSQGomW7XCI0gWwUuKJwPENg==",
        dependencyGraphSha256: SHA_A,
        adapterSourceSha256: SHA_B,
        workerEntrySha256: SHA_C,
        workerProtocolVersion: "hakimi-ziwei-iztro-worker/0.1-draft",
        isolation: "fresh_worker_per_calculation",
        runtime: "node",
        runtimeVersion: "v24.16.0",
        requestId: "11111111-1111-4111-8111-111111111111",
        workerInstanceId: "22222222-2222-4222-8222-222222222222",
        startedAt: "2026-08-10T00:00:00.000Z",
        completedAt: "2026-08-10T00:00:00.001Z",
        exitCode: 0
      },
      profileId: "iztro_fixture_profile",
      profileVersion: "0.1.0",
      digestAlgorithm: "sha256-canonical-json-v1",
      inputSha256: SHA_A,
      ruleSnapshotSha256: SHA_A,
      factsSha256: SHA_B,
      artifactSha256: SHA_A,
      calculatedAt: "2026-08-10T00:00:00.000Z",
      fallbackUsed: false,
      interpretationIncluded: false,
      warnings: [],
      knownGaps: ["合成样例只验证契约与摘要门，不证明排盘或命理真值"],
      digestVerification: ZIWEI_DIGEST_VERIFICATION
    }
  });

  fixture.ruleSnapshot.ruleSnapshotSha256 = await sha256ZiweiCanonicalJson(
    projectZiweiRuleSnapshotForDigest(fixture.ruleSnapshot)
  );
  const digests = await calculateZiweiNatalFixtureDigests(fixture);
  Object.assign(fixture.receipt, digests);
  const verified = await verifyZiweiNatalFixtureDraft(fixture);
  if (!verified.success) throw new Error(`fixture 摘要生成失败：${verified.reason}`);
  return verified.data;
}

describe("Ziwei Doushu isolated contract draft", () => {
  it("accepts a digest-verified synthetic contract fixture without claiming upstream truth", async () => {
    const fixture = await buildFixture();
    const verified = await verifyZiweiNatalFixtureDraft(fixture);

    expect(verified.success).toBe(true);
    expect(fixture.evidence).toMatchObject({
      truthStatus: "synthetic_contract_fixture",
      claimScopes: ["fixture_structure"],
      productionEligible: false,
      expertTruthClaimed: false
    });
    expect(fixture.receipt.digestVerification).toBe(ZIWEI_DIGEST_VERIFICATION);
    expect(fixture.ruleSnapshot.rules.mutagenTable.entries).toHaveLength(10);
    expect(new Set(fixture.provenance.map((item) => item.factFamily))).toEqual(new Set([
      "calendar",
      "palaces",
      "natal_stars",
      "transformations",
      "major_periods"
    ]));
  });

  it("accepts exactly the 13 frozen Shichen mappings and rejects mismatched branches or ranges", async () => {
    for (const slot of ZIWEI_SHICHEN_SLOTS) {
      const fixture = await buildFixture();
      fixture.input.shichenIndex = slot.index;
      fixture.facts.calendarFacts.shichen = {
        index: slot.index,
        branchId: slot.branchId,
        civilRange: slot.civilRange
      };
      fixture.facts.calendarFacts.ganzhi.hour = `wu_${slot.branchId}`;
      expect(ziweiNatalFixtureDraftSchema.safeParse(fixture).success, `slot ${slot.index}`).toBe(true);

      const wrongBranch = structuredClone(fixture);
      wrongBranch.facts.calendarFacts.shichen.branchId = slot.branchId === "zi" ? "chou" : "zi";
      expect(ziweiNatalFixtureDraftSchema.safeParse(wrongBranch).success, `branch ${slot.index}`).toBe(false);

      const wrongRange = structuredClone(fixture);
      wrongRange.facts.calendarFacts.shichen.civilRange = "99:99-99:99";
      expect(ziweiNatalFixtureDraftSchema.safeParse(wrongRange).success, `range ${slot.index}`).toBe(false);

      const wrongHourGanzhi = structuredClone(fixture);
      wrongHourGanzhi.facts.calendarFacts.ganzhi.hour = slot.branchId === "zi" ? "wu_chou" : "wu_zi";
      expect(ziweiNatalFixtureDraftSchema.safeParse(wrongHourGanzhi).success, `hour ${slot.index}`).toBe(false);
    }

    expect(ZIWEI_SHICHEN_SLOTS[0]).toMatchObject({ branchId: "zi", civilRange: "00:00-01:00" });
    expect(ZIWEI_SHICHEN_SLOTS[12]).toMatchObject({ branchId: "zi", civilRange: "23:00-24:00" });

    const instantAt24 = structuredClone((await buildFixture()).input);
    instantAt24.civilContext.localTime = "24:00";
    expect(ziweiBirthInputDraftSchema.safeParse(instantAt24).success).toBe(false);
  });

  it("rejects resolved dates outside the inclusive verified range", async () => {
    const exactBoundary = await buildFixture();
    exactBoundary.ruleSnapshot.verifiedRange = {
      from: "1995-08-18",
      to: "1995-08-18",
      outsideRangePolicy: "reject"
    };
    expect(ziweiNatalFixtureDraftSchema.safeParse(exactBoundary).success).toBe(true);

    const beforeRange = await buildFixture();
    beforeRange.ruleSnapshot.verifiedRange.from = "1995-08-19";
    expect(ziweiNatalFixtureDraftSchema.safeParse(beforeRange).success).toBe(false);

    const afterRange = await buildFixture();
    afterRange.ruleSnapshot.verifiedRange.to = "1995-08-17";
    expect(ziweiNatalFixtureDraftSchema.safeParse(afterRange).success).toBe(false);
  });

  it("requires two distinct rule_profile reviewers for an expert-reviewed rule claim", async () => {
    const structureOnlyReviews = await buildFixture();
    structureOnlyReviews.ruleSnapshot.review = {
      status: "double_reviewed",
      attestations: [
        {
          reviewerId: "reviewer.alpha",
          reviewedAt: "2026-08-10T01:00:00.000Z",
          scope: "fixture_structure",
          note: "只复核结构"
        },
        {
          reviewerId: "reviewer.beta",
          reviewedAt: "2026-08-10T02:00:00.000Z",
          scope: "fixture_structure",
          note: "只复核结构"
        }
      ]
    };
    structureOnlyReviews.evidence.truthStatus = "expert_reviewed_rule";
    structureOnlyReviews.evidence.claimScopes = ["rule_profile"];
    expect(ziweiNatalFixtureDraftSchema.safeParse(structureOnlyReviews).success).toBe(false);

    const ruleReviews = await buildFixture();
    ruleReviews.ruleSnapshot.review = {
      status: "double_reviewed",
      attestations: [
        {
          reviewerId: "reviewer.alpha",
          reviewedAt: "2026-08-10T01:00:00.000Z",
          scope: "rule_profile",
          note: "复核冻结规则 profile"
        },
        {
          reviewerId: "reviewer.beta",
          reviewedAt: "2026-08-10T02:00:00.000Z",
          scope: "rule_profile",
          note: "独立复核冻结规则 profile"
        }
      ]
    };
    ruleReviews.evidence.truthStatus = "expert_reviewed_rule";
    ruleReviews.evidence.claimScopes = ["rule_profile"];
    expect(ziweiNatalFixtureDraftSchema.safeParse(ruleReviews).success).toBe(true);

    const overclaimedRuleReview = structuredClone(ruleReviews);
    overclaimedRuleReview.evidence.claimScopes = ["rule_profile", "chart_structure"];
    expect(ziweiNatalFixtureDraftSchema.safeParse(overclaimedRuleReview).success).toBe(false);
  });

  it("binds the active four-transformations manifest and keeps every star in natal scope", async () => {
    const duplicateStem = await buildFixture();
    duplicateStem.ruleSnapshot.rules.mutagenTable.entries[1]!.heavenlyStemId =
      duplicateStem.ruleSnapshot.rules.mutagenTable.entries[0]!.heavenlyStemId;
    expect(ziweiNatalFixtureDraftSchema.safeParse(duplicateStem).success).toBe(false);

    const activeTableMismatch = await buildFixture();
    const activeEntry = activeTableMismatch.ruleSnapshot.rules.mutagenTable.entries.find(
      (entry) => entry.heavenlyStemId === activeTableMismatch.facts.directionBasis.yearStemId
    )!;
    activeEntry.transformations.lu = "ziwei.star.not-the-lu-fixture";
    expect(ziweiNatalFixtureDraftSchema.safeParse(activeTableMismatch).success).toBe(false);

    const wrongScope = await buildFixture();
    (wrongScope.facts.palaces[0]!.stars[0] as { scope: string }).scope = "decadal";
    expect(ziweiNatalFixtureDraftSchema.safeParse(wrongScope).success).toBe(false);

    const wrongFrozenBrightness = await buildFixture();
    wrongFrozenBrightness.facts.palaces[0]!.stars[0]!.brightnessId = "wang";
    expect(ziweiNatalFixtureDraftSchema.safeParse(wrongFrozenBrightness).success).toBe(false);

    const missingBrightnessMustBeNull = await buildFixture();
    missingBrightnessMustBeNull.facts.palaces[4]!.stars.push({
      starId: "ziwei.star.registry-filler-0",
      scope: "natal",
      category: "auxiliary",
      brightnessId: "miao",
      transformationIds: [],
      placementRuleId: "fixture_placement"
    });
    expect(ziweiNatalFixtureDraftSchema.safeParse(missingBrightnessMustBeNull).success).toBe(false);
  });

  it("binds major periods to the bureau start, nominal ages, direction basis and palace order", async () => {
    const fixture = await buildFixture();
    expect(fixture.facts.majorPeriods[0]).toMatchObject({ startAge: 2, endAge: 11, ageKind: "nominal_age" });
    expect(fixture.facts.majorPeriods[11]).toMatchObject({ startAge: 112, endAge: 121 });

    const zeroBased = await buildFixture();
    zeroBased.facts.majorPeriods[0]!.startAge = 0;
    zeroBased.facts.majorPeriods[0]!.endAge = 9;
    expect(ziweiNatalFixtureDraftSchema.safeParse(zeroBased).success).toBe(false);

    const wrongPalace = await buildFixture();
    wrongPalace.facts.majorPeriods[1]!.palaceRoleId = wrongPalace.facts.majorPeriods[2]!.palaceRoleId;
    expect(ziweiNatalFixtureDraftSchema.safeParse(wrongPalace).success).toBe(false);

    const wrongSexBasis = await buildFixture();
    wrongSexBasis.facts.directionBasis.sexForCalculation = "female";
    expect(ziweiNatalFixtureDraftSchema.safeParse(wrongSexBasis).success).toBe(false);

    const wrongSequence = await buildFixture();
    [wrongSequence.facts.majorPeriods[0]!.sequence, wrongSequence.facts.majorPeriods[1]!.sequence] = [2, 1];
    expect(ziweiNatalFixtureDraftSchema.safeParse(wrongSequence).success).toBe(false);
  });

  it("requires provenance for all five enabled fact families and registered sources", async () => {
    const missingFamily = await buildFixture();
    missingFamily.provenance = missingFamily.provenance.filter((item) => item.factFamily !== "transformations");
    expect(ziweiNatalFixtureDraftSchema.safeParse(missingFamily).success).toBe(false);

    const unknownSource = await buildFixture();
    unknownSource.provenance[0]!.sourceIds = ["source:not-registered"];
    expect(ziweiNatalFixtureDraftSchema.safeParse(unknownSource).success).toBe(false);

    const duplicateFamilyPath = await buildFixture();
    duplicateFamilyPath.provenance.push(structuredClone(duplicateFamilyPath.provenance[1]!));
    expect(ziweiNatalFixtureDraftSchema.safeParse(duplicateFamilyPath).success).toBe(false);
  });

  it("uses deterministic canonical JSON and a fixed SHA-256 vector", async () => {
    const value = { b: [true, null, "中"], a: 1 };
    expect(canonicalizeZiweiDigestJson(value)).toBe('{"a":1,"b":[true,null,"中"]}');
    await expect(sha256ZiweiCanonicalJson(value)).resolves.toBe(
      "f2a477842f86d520f2620d037c462623e5c6151ddc28e88a463921f9778a3801"
    );
    expect(() => canonicalizeZiweiDigestJson({ invalid: undefined })).toThrow(/JSON 不支持/);
    expect(() => canonicalizeZiweiDigestJson([, "sparse"])).toThrow(/无空洞/);
  });

  it("rejects structure-valid tampering in input, rules, facts, provenance and evidence", async () => {
    const cases: Array<{
      label: string;
      mutate: (fixture: Awaited<ReturnType<typeof buildFixture>>) => void;
      expectedPaths: string[];
    }> = [
      {
        label: "input",
        mutate: (fixture) => { fixture.input.sourceNote = "内容被改写但仍符合字段结构"; },
        expectedPaths: ["receipt.inputSha256", "receipt.artifactSha256"]
      },
      {
        label: "rules",
        mutate: (fixture) => { fixture.ruleSnapshot.rules.brightnessTable.contentSha256 = SHA_C; },
        expectedPaths: [
          "ruleSnapshot.ruleSnapshotSha256",
          "receipt.ruleSnapshotSha256",
          "receipt.artifactSha256"
        ]
      },
      {
        label: "facts",
        mutate: (fixture) => { fixture.facts.calendarFacts.ganzhi.day = "fixture_changed_day"; },
        expectedPaths: ["receipt.factsSha256", "receipt.artifactSha256"]
      },
      {
        label: "provenance",
        mutate: (fixture) => { fixture.provenance[0]!.algorithmId = "tampered_algorithm"; },
        expectedPaths: ["receipt.artifactSha256"]
      },
      {
        label: "evidence",
        mutate: (fixture) => { fixture.evidence.note = "证据说明被改写但仍符合字段结构"; },
        expectedPaths: ["receipt.artifactSha256"]
      },
      {
        label: "receipt metadata",
        mutate: (fixture) => { fixture.receipt.calculatedAt = "2026-08-10T00:00:01.000Z"; },
        expectedPaths: ["receipt.artifactSha256"]
      }
    ];

    for (const testCase of cases) {
      const fixture = await buildFixture();
      testCase.mutate(fixture);
      expect(ziweiNatalFixtureDraftSchema.safeParse(fixture).success, testCase.label).toBe(true);

      const result = await verifyZiweiNatalFixtureDraft(fixture);
      expect(result, testCase.label).toMatchObject({ success: false, reason: "digest_mismatch" });
      if (result.success || result.reason !== "digest_mismatch") throw new Error(testCase.label);
      expect(result.mismatches.map((item) => item.fieldPath), testCase.label).toEqual(testCase.expectedPaths);
    }
  });

  it("rejects stale embedded and receipt digest values without making them self-referential", async () => {
    const embeddedRuleDigestTamper = await buildFixture();
    embeddedRuleDigestTamper.ruleSnapshot.ruleSnapshotSha256 = SHA_C;
    embeddedRuleDigestTamper.receipt.ruleSnapshotSha256 = SHA_C;
    const embeddedResult = await verifyZiweiNatalFixtureDraft(embeddedRuleDigestTamper);
    expect(embeddedResult).toMatchObject({ success: false, reason: "digest_mismatch" });
    if (embeddedResult.success || embeddedResult.reason !== "digest_mismatch") throw new Error("embedded digest");
    expect(embeddedResult.mismatches.map((item) => item.fieldPath)).toEqual([
      "ruleSnapshot.ruleSnapshotSha256",
      "receipt.ruleSnapshotSha256",
      "receipt.artifactSha256"
    ]);

    const receiptDigestTamper = await buildFixture();
    receiptDigestTamper.receipt.inputSha256 = SHA_C;
    const receiptResult = await verifyZiweiNatalFixtureDraft(receiptDigestTamper);
    expect(receiptResult).toMatchObject({ success: false, reason: "digest_mismatch" });
    if (receiptResult.success || receiptResult.reason !== "digest_mismatch") throw new Error("receipt digest");
    expect(receiptResult.mismatches.map((item) => item.fieldPath)).toEqual(["receipt.inputSha256"]);
  });

  it("rejects raw values that Zod would silently normalize before hashing", async () => {
    const fixture = await buildFixture();
    fixture.input.sourceNote = ` ${fixture.input.sourceNote} `;

    expect(ziweiNatalFixtureDraftSchema.safeParse(fixture).success).toBe(true);
    await expect(verifyZiweiNatalFixtureDraft(fixture)).resolves.toMatchObject({
      success: false,
      reason: "schema_normalized_input"
    });
  });

  it("keeps strict input, structural and receipt failure-closed checks", async () => {
    const fixture = await buildFixture();
    expect(ziweiNatalFixtureDraftSchema.safeParse({ ...fixture, unexpected: true }).success).toBe(false);

    const invalidIndex = structuredClone(fixture.input);
    invalidIndex.shichenIndex = 13;
    expect(ziweiBirthInputDraftSchema.safeParse(invalidIndex).success).toBe(false);

    expect(ziweiBirthInputDraftSchema.safeParse({
      ...fixture.input,
      solarTimeAdjustment: "apparent_solar_time"
    }).success).toBe(false);

    const duplicatePalace = await buildFixture();
    duplicatePalace.facts.palaces[1]!.earthlyBranchId = duplicatePalace.facts.palaces[0]!.earthlyBranchId;
    expect(ziweiNatalFixtureDraftSchema.safeParse(duplicatePalace).success).toBe(false);

    const missingTransformation = await buildFixture();
    missingTransformation.facts.palaces[0]!.stars[0]!.transformationIds = [];
    expect(ziweiNatalFixtureDraftSchema.safeParse(missingTransformation).success).toBe(false);

    const engineMismatch = await buildFixture();
    engineMismatch.receipt.engine.upstreamVersion = "2.5.9";
    expect(ziweiNatalFixtureDraftSchema.safeParse(engineMismatch).success).toBe(false);

    const syntheticOverclaim = await buildFixture();
    syntheticOverclaim.evidence.claimScopes = ["fixture_structure", "adapter_behavior"];
    expect(ziweiNatalFixtureDraftSchema.safeParse(syntheticOverclaim).success).toBe(false);
  });
});
