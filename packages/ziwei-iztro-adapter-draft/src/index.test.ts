// @vitest-environment node

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  sha256ZiweiCanonicalJson,
  verifyZiweiNatalFixtureDraft
} from "./contract-bridge.ts";
import {
  ZIWEI_IZTRO_NPM_INTEGRITY,
  ZIWEI_IZTRO_UPSTREAM_COMMIT,
  ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION,
  ZiweiIztroAdapterDraftError,
  assertValidWorkerResponseEnvelopeDraft,
  calculateIztro258EngineeringFixture,
  createIztro258RuleSnapshotDraft
} from "./index.ts";

function gregorianInput() {
  return {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date: "1995-08-18" },
    shichenIndex: 6,
    sexForCalculation: "male",
    solarTimeAdjustment: "none",
    civilContext: {
      usedForCalculation: false,
      localTime: "12:00",
      timeZone: "Asia/Shanghai",
      location: {
        precision: "coordinates",
        label: "Shanghai",
        latitude: 31.2304,
        longitude: 121.4737
      }
    },
    birthSourceRef: "fixture.upstream.1995_08_18",
    sourceNote: "Exact iztro 2.5.8 engineering regression seed; not expert truth."
  } as const;
}

async function resignRuleSnapshot(ruleSnapshot: Awaited<ReturnType<typeof createIztro258RuleSnapshotDraft>>) {
  const { ruleSnapshotSha256: _discarded, ...projection } = ruleSnapshot;
  ruleSnapshot.ruleSnapshotSha256 = await sha256ZiweiCanonicalJson(projection);
  return ruleSnapshot;
}

describe("isolated iztro 2.5.8 adapter draft", () => {
  it("builds a complete, digest-bound default profile from the exact dependency graph", async () => {
    const rule = await createIztro258RuleSnapshotDraft();

    expect(rule.engine).toMatchObject({
      upstreamVersion: "2.5.8",
      upstreamCommit: ZIWEI_IZTRO_UPSTREAM_COMMIT,
      upstreamNpmIntegrity: ZIWEI_IZTRO_NPM_INTEGRITY,
      isolation: "fresh_worker_per_calculation",
      isolatedExecution: true,
      configurationMode: "full_snapshot_per_calculation"
    });
    const closure = JSON.parse(await readFile(
      new URL("./iztro-2.5.8-lock-closure.json", import.meta.url),
      "utf8"
    )) as unknown;
    expect(rule.engine.dependencyGraphSha256).toBe(await sha256ZiweiCanonicalJson(closure));
    expect(closure).toMatchObject({
      proofScope: "package_lock_closure_identity_not_installed_bytes",
      nodes: expect.arrayContaining([
        expect.objectContaining({
          name: "iztro",
          version: "2.5.8",
          resolved: "https://registry.npmjs.org/iztro/-/iztro-2.5.8.tgz",
          integrity: ZIWEI_IZTRO_NPM_INTEGRITY
        })
      ])
    });
    expect(rule.rules.starRegistry.entries).toHaveLength(162);
    expect(new Set(rule.rules.starRegistry.entries.map((entry) => entry.starId)).size).toBe(162);
    expect(rule.rules.mutagenTable.entries).toHaveLength(10);
    expect(rule.rules.brightnessTable.entries).toHaveLength(20);
    expect(rule.rules.brightnessTable.canonicalBranchOrder).toEqual([
      "zi", "chou", "yin", "mao", "chen", "si", "wu", "wei", "shen", "you", "xu", "hai"
    ]);
  });

  it("maps a real upstream regression into canonical facts and passes the digest verifier", async () => {
    const rule = await createIztro258RuleSnapshotDraft();
    const fixture = await calculateIztro258EngineeringFixture(gregorianInput(), { ruleSnapshot: rule });
    const verified = await verifyZiweiNatalFixtureDraft(fixture);

    expect(verified.success).toBe(true);
    expect(fixture.evidence).toMatchObject({
      truthStatus: "upstream_regression",
      productionEligible: false,
      expertTruthClaimed: false
    });
    expect(fixture.facts.calendarFacts).toMatchObject({
      gregorianDate: "1995-08-18",
      lunarDate: { year: 1995, month: 7, day: 23, isLeapMonth: false },
      ganzhi: { year: "yi_hai", month: "jia_shen", day: "xin_si", hour: "jia_wu" }
    });
    expect(fixture.facts).toMatchObject({
      lifePalaceBranchId: "yin",
      bodyPalaceBranchId: "yin",
      fiveElementBureauId: "earth_5",
      directionBasis: {
        yearStemId: "yi",
        yearBranchId: "hai",
        yearPolarity: "yin",
        sexForCalculation: "male",
        resolvedDirection: "backward"
      }
    });
    expect(fixture.facts.palaces.map((palace) => palace.earthlyBranchId)).toEqual([
      "zi", "chou", "yin", "mao", "chen", "si", "wu", "wei", "shen", "you", "xu", "hai"
    ]);
    expect(fixture.facts.majorPeriods[0]).toMatchObject({
      sequence: 1,
      palaceRoleId: "life",
      earthlyBranchId: "yin",
      direction: "backward",
      startAge: 5,
      endAge: 14
    });
    expect(fixture.facts.palaces.flatMap((palace) => palace.stars)).toHaveLength(66);
  });

  it("matches five attributed DATA.GOV.HK calendar fixtures without extending the claim to Ziwei rules", async () => {
    const fixtureSet = JSON.parse(await readFile(
      new URL("../fixtures/hko-data-gov-hk-calendar-2025.json", import.meta.url),
      "utf8"
    )) as {
      format: string;
      claimScope: string;
      expertTruthClaimed: boolean;
      source: { resourceSha256: string; termsUrl: string };
      fixtures: Array<{
        fixtureId: string;
        gregorianDate: string;
        lunarDate: { year: number; month: number; day: number; isLeapMonth: boolean };
      }>;
    };
    expect(fixtureSet).toMatchObject({
      format: "hakimi-ziwei-official-calendar-fixtures/0.1-draft",
      claimScope: "calendar_resolution",
      expertTruthClaimed: false,
      source: {
        resourceSha256: "d2c5d752f370d3e583bde4950845fb6b4bfce1e1551da913ad14d655014fb32c",
        termsUrl: "https://data.gov.hk/tc/terms-and-conditions"
      }
    });
    expect(fixtureSet.fixtures).toHaveLength(5);

    const rule = await createIztro258RuleSnapshotDraft();
    for (const officialFixture of fixtureSet.fixtures) {
      const fixture = await calculateIztro258EngineeringFixture({
        ...gregorianInput(),
        calendarInput: { calendar: "gregorian" as const, date: officialFixture.gregorianDate },
        birthSourceRef: officialFixture.fixtureId,
        sourceNote: "DATA.GOV.HK civil-date-only calendar diagnostic; not Ziwei or expert truth."
      }, { ruleSnapshot: rule });
      expect(fixture.facts.calendarFacts.gregorianDate).toBe(officialFixture.gregorianDate);
      expect(fixture.facts.calendarFacts.lunarDate).toEqual(officialFixture.lunarDate);
      expect(fixture.evidence).toMatchObject({
        truthStatus: "upstream_regression",
        expertTruthClaimed: false,
        productionEligible: false
      });
    }
  }, 30_000);

  it("rejects re-signed snapshots that forge fixed engine, source, range or profile identity", async () => {
    const rule = await createIztro258RuleSnapshotDraft();
    const mutations = [
      (candidate: typeof rule) => { candidate.engine.adapterId = "fake.adapter.identity"; },
      (candidate: typeof rule) => { candidate.engine.adapterVersion = "9.9.9"; },
      (candidate: typeof rule) => { candidate.engine.upstreamName = "fake-upstream"; }
    ];

    for (const mutate of mutations) {
      const forged = structuredClone(rule);
      mutate(forged);
      await resignRuleSnapshot(forged);
      await expect(calculateIztro258EngineeringFixture(gregorianInput(), { ruleSnapshot: forged }))
        .rejects.toMatchObject({ code: "ENGINE_LOCK_MISMATCH" });
    }

    const profileMutations = [
      (candidate: typeof rule) => { candidate.verifiedRange.from = "1800-01-01"; },
      (candidate: typeof rule) => { candidate.sourceCatalog[0]!.url = "https://example.invalid/forged-source"; },
      (candidate: typeof rule) => {
        candidate.rules.brightnessTable.immutableLocator = "https://example.invalid/forged-table";
      },
      (candidate: typeof rule) => { candidate.rules.lateZiDay = "current_civil_day"; }
    ];
    for (const mutate of profileMutations) {
      const forged = structuredClone(rule);
      mutate(forged);
      await resignRuleSnapshot(forged);
      await expect(calculateIztro258EngineeringFixture(gregorianInput(), { ruleSnapshot: forged }))
        .rejects.toMatchObject({ code: "RULE_PROFILE_IDENTITY_MISMATCH" });
    }
  });

  it("uses a distinct one-shot Worker while keeping normalized facts deterministic", async () => {
    const rule = await createIztro258RuleSnapshotDraft();
    const [first, second] = await Promise.all([
      calculateIztro258EngineeringFixture(gregorianInput(), { ruleSnapshot: rule }),
      calculateIztro258EngineeringFixture(gregorianInput(), { ruleSnapshot: rule })
    ]);

    expect(first.receipt.engine.workerInstanceId).not.toBe(second.receipt.engine.workerInstanceId);
    expect(first.receipt.engine.requestId).not.toBe(second.receipt.engine.requestId);
    expect(first.facts).toEqual(second.facts);
    expect(first.ruleSnapshot).toEqual(second.ruleSnapshot);
  });

  it("fails closed for a tampered profile, leap-month late Zi and pre-aborted work", async () => {
    const rule = await createIztro258RuleSnapshotDraft();
    const tampered = structuredClone(rule);
    const originalBrightness = tampered.rules.brightnessTable.entries[0]!.byEarthlyBranch.zi;
    tampered.rules.brightnessTable.entries[0]!.byEarthlyBranch.zi = originalBrightness === "miao" ? "xian" : "miao";
    await expect(calculateIztro258EngineeringFixture(gregorianInput(), { ruleSnapshot: tampered }))
      .rejects.toMatchObject({ code: "RULE_SNAPSHOT_DIGEST_MISMATCH" });

    const leapLateZi = {
      ...gregorianInput(),
      calendarInput: {
        calendar: "chinese_lunisolar" as const,
        date: { year: 2023, month: 2, day: 16, isLeapMonth: true }
      },
      shichenIndex: 12
    };
    await expect(calculateIztro258EngineeringFixture(leapLateZi, { ruleSnapshot: rule }))
      .rejects.toMatchObject({ code: "UNSUPPORTED_LEAP_MONTH_LATE_ZI" });

    const controller = new AbortController();
    controller.abort();
    await expect(calculateIztro258EngineeringFixture(gregorianInput(), {
      ruleSnapshot: rule,
      signal: controller.signal
    })).rejects.toBeInstanceOf(ZiweiIztroAdapterDraftError);

    let abortedReads = 0;
    const racingSignal = {
      get aborted() {
        abortedReads += 1;
        return abortedReads > 1;
      },
      addEventListener() {},
      removeEventListener() {}
    } as unknown as AbortSignal;
    await expect(calculateIztro258EngineeringFixture(gregorianInput(), {
      ruleSnapshot: rule,
      signal: racingSignal
    })).rejects.toMatchObject({ code: "ABORTED" });
    expect(abortedReads).toBeGreaterThanOrEqual(2);

    expect(() => assertValidWorkerResponseEnvelopeDraft({
      ok: false,
      protocolVersion: ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION,
      requestId: "malformed-failure",
      workerInstanceId: "test-worker",
      startedAt: "2026-08-10T00:00:00.000Z",
      completedAt: "2026-08-10T00:00:00.001Z",
      runtimeVersion: process.version,
      error: null
    }, "malformed-failure")).toThrowError(/no structured error/u);
  });
});
