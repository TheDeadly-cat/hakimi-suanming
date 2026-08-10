// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  calculateZiweiNatalFixtureDigests,
  verifyZiweiNatalFixtureDraft
} from "./contract-bridge.ts";
import { calculateIztro258EngineeringFixture } from "./iztro-adapter-bridge.ts";
import {
  FORTEL_DIFFERENTIAL_REPORT_FORMAT,
  FORTEL_NPM_INTEGRITY,
  FORTEL_UPSTREAM_VERSION,
  ZIWEI_FORTEL_DIFFERENTIAL_ID,
  calculateFortelDifferentialReportUnkeyedContentDigestDraft,
  calculateFortelNamedProjectionDraft,
  compareFortelAgainstFreshIztroDraft,
  compareFortelAgainstVerifiedIztroFixtureDraft,
  reproduceFortelDifferentialReportWithFreshEnginesDraft,
  verifyFortelDifferentialReportStructureAndDigestDraft
} from "./index.ts";

const ordinaryInput = {
  gregorianDate: "1995-08-18",
  shichenIndex: 6,
  sexForCalculation: "male"
} as const;

function iztroInput(date = ordinaryInput.gregorianDate) {
  return {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date },
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
    birthSourceRef: "fixture.fortel.authentication_regression",
    sourceNote: "Fresh adapter authentication regression; not expert truth."
  } as const;
}

describe("isolated Fortel 1.3.4 named-field differential", () => {
  it("runs each strict input in a fresh Worker and returns stable named facts", async () => {
    const [first, second] = await Promise.all([
      calculateFortelNamedProjectionDraft(ordinaryInput),
      calculateFortelNamedProjectionDraft(ordinaryInput)
    ]);

    expect(first.projection).toMatchObject({
      calendar: {
        gregorianDate: "1995-08-18",
        lunarDate: { year: 1995, month: 7, day: 23, isLeapMonth: false },
        shichenIndex: 6,
        yearGanzhi: "yi_hai",
        dayGanzhi: "xin_si",
        hourGanzhi: null
      },
      lifePalaceBranchId: "yin",
      bodyPalaceBranchId: "yin",
      fiveElementBureauId: "earth_5",
      direction: "backward",
      transformations: {
        lu: "tianjiMaj",
        quan: "tianliangMaj",
        ke: "ziweiMaj",
        ji: "taiyinMaj"
      }
    });
    expect(Object.keys(first.projection.roleBranches)).toHaveLength(12);
    expect(Object.keys(first.projection.majorStarBranches)).toHaveLength(14);
    expect(Object.keys(first.projection.minorStarBranches)).toHaveLength(14);
    expect(first.projection.majorPeriods).toHaveLength(12);
    expect(first.engine).toMatchObject({
      differentialId: ZIWEI_FORTEL_DIFFERENTIAL_ID,
      upstreamVersion: FORTEL_UPSTREAM_VERSION,
      upstreamNpmIntegrity: FORTEL_NPM_INTEGRITY,
      isolation: "fresh_worker_per_calculation",
      proofScope: "package_lock_closure_identity_not_installed_bytes",
      exitCode: 0
    });
    expect(first.engine.workerInstanceId).not.toBe(second.engine.workerInstanceId);
    expect(first.projectionSha256).toBe(second.projectionSha256);
  });

  it("preserves three known Zhongzhou/default-engine transformation differences as named evidence", async () => {
    const [wuYear, gengYear, renYear] = await Promise.all([
      calculateFortelNamedProjectionDraft({ ...ordinaryInput, gregorianDate: "2018-08-18" }),
      calculateFortelNamedProjectionDraft({ ...ordinaryInput, gregorianDate: "2020-08-18" }),
      calculateFortelNamedProjectionDraft({ ...ordinaryInput, gregorianDate: "2022-08-18" })
    ]);

    expect(wuYear.projection.transformations.ke).toBe("taiyangMaj");
    expect(gengYear.projection.transformations.ke).toBe("tianfuMaj");
    expect(renYear.projection.transformations.ke).toBe("tianfuMaj");
    expect(gengYear.projection.calendar.monthGanzhi).toBe("jia_shen");
  });

  it("fails closed on weak inputs, the abort race, timeouts, and late-Zi comparison", async () => {
    await expect(calculateFortelNamedProjectionDraft({ ...ordinaryInput, gregorianDate: "2025-08-00" }))
      .rejects.toMatchObject({ code: "INPUT_OUTSIDE_VERIFIED_RANGE" });
    await expect(calculateFortelNamedProjectionDraft({ ...ordinaryInput, shichenIndex: 6.5 }))
      .rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(calculateFortelNamedProjectionDraft({ ...ordinaryInput, sexForCalculation: "unknown" }))
      .rejects.toMatchObject({ code: "INVALID_INPUT" });

    let abortedReads = 0;
    const racingSignal = {
      get aborted() { abortedReads += 1; return abortedReads > 1; },
      addEventListener() {},
      removeEventListener() {}
    } as unknown as AbortSignal;
    await expect(calculateFortelNamedProjectionDraft(ordinaryInput, { signal: racingSignal }))
      .rejects.toMatchObject({ code: "ABORTED" });
    expect(abortedReads).toBeGreaterThanOrEqual(2);

    await expect(calculateFortelNamedProjectionDraft(ordinaryInput, { timeoutMs: 1 }))
      .rejects.toMatchObject({ code: "WORKER_TIMEOUT" });
    await expect(compareFortelAgainstFreshIztroDraft({ ...ordinaryInput, shichenIndex: 12 }))
      .rejects.toMatchObject({ code: "UNSUPPORTED_LATE_ZI_POLICY" });
  });

  it("freshly runs both engines, emits 84 checks, and preserves a named difference", async () => {
    const ordinary = await compareFortelAgainstFreshIztroDraft(ordinaryInput);
    expect(ordinary).toMatchObject({
      format: FORTEL_DIFFERENTIAL_REPORT_FORMAT,
      mode: "differential_diagnostic",
      productionEligible: false,
      expertTruthClaimed: false,
      summary: {
        matchCount: 77,
        differenceCount: 0,
        unsupportedCount: 7,
        totalChecks: 84,
        aggregateScore: null,
        verdict: "no_truth_verdict"
      }
    });
    expect((await verifyFortelDifferentialReportStructureAndDigestDraft(ordinary)).success).toBe(true);
    const reproduced = await reproduceFortelDifferentialReportWithFreshEnginesDraft(ordinary);
    expect(reproduced).toMatchObject({
      success: true,
      data: {
        assurance: "current_fresh_engine_reproduction",
        historicalExecutionMetadataAuthenticated: false,
        candidateReportSha256: ordinary.reportSha256
      }
    });
    if (!reproduced.success) throw new Error(`fresh reproduction failed: ${reproduced.reason}`);
    expect(reproduced.data.freshReport.fortelReference.workerInstanceId)
      .not.toBe(ordinary.fortelReference.workerInstanceId);

    const geng = await compareFortelAgainstFreshIztroDraft({ ...ordinaryInput, gregorianDate: "2020-08-18" });
    expect(geng.summary).toMatchObject({ matchCount: 76, differenceCount: 1, unsupportedCount: 7 });
    expect(geng.checks.find((check) => check.checkId === "transformation.ke")).toMatchObject({
      status: "different",
      iztroValue: "taiyinMaj",
      fortelValue: "tianfuMaj",
      classification: "implementation_difference_no_truth_verdict"
    });

    const tampered = structuredClone(ordinary) as unknown as { warnings: string[] };
    tampered.warnings[0] = "tampered after signing";
    expect(await verifyFortelDifferentialReportStructureAndDigestDraft(tampered)).toEqual({
      success: false,
      reason: "Fortel differential report envelope is invalid"
    });

    const resignedPathForgery = structuredClone(ordinary) as any;
    resignedPathForgery.checks[0].fieldPath = "forged.path";
    resignedPathForgery.reportSha256 = await calculateFortelDifferentialReportUnkeyedContentDigestDraft(resignedPathForgery);
    const pathVerification = await verifyFortelDifferentialReportStructureAndDigestDraft(resignedPathForgery);
    expect(pathVerification.success).toBe(false);
    if (pathVerification.success) throw new Error("re-signed field path forgery passed exact structural verification");
    expect(pathVerification.reason).toContain("calendar.gregorian");

    const resignedWarningForgery = structuredClone(ordinary) as any;
    resignedWarningForgery.warnings[0] = "forged execution claim";
    resignedWarningForgery.reportSha256 = await calculateFortelDifferentialReportUnkeyedContentDigestDraft(resignedWarningForgery);
    const warningVerification = await verifyFortelDifferentialReportStructureAndDigestDraft(resignedWarningForgery);
    expect(warningVerification.success).toBe(false);
    if (warningVerification.success) throw new Error("re-signed warning forgery passed exact structural verification");
    expect(warningVerification.reason).toContain("envelope is invalid");

    const structurallyForged = structuredClone(ordinary) as any;
    structurallyForged.checks[0].status = "different";
    structurallyForged.reportSha256 = await calculateFortelDifferentialReportUnkeyedContentDigestDraft(structurallyForged);
    const structuralVerification = await verifyFortelDifferentialReportStructureAndDigestDraft(structurallyForged);
    expect(structuralVerification.success).toBe(false);
    if (structuralVerification.success) throw new Error("malformed report passed structural verification");
    expect(structuralVerification.reason).toContain("calendar.gregorian");

    const resignedStableSourceForgery = structuredClone(ordinary) as any;
    resignedStableSourceForgery.fortelReference.adapterSourceSha256 = "f".repeat(64);
    resignedStableSourceForgery.reportSha256 = await calculateFortelDifferentialReportUnkeyedContentDigestDraft(resignedStableSourceForgery);
    expect((await verifyFortelDifferentialReportStructureAndDigestDraft(resignedStableSourceForgery)).success).toBe(true);
    expect(await reproduceFortelDifferentialReportWithFreshEnginesDraft(resignedStableSourceForgery)).toEqual({
      success: false,
      reason: "fresh_engine_reproduction_mismatch"
    });
  });

  it("rejects a structurally valid, re-signed fake iztro fact set after a fresh rerun", async () => {
    const fixture = await calculateIztro258EngineeringFixture(iztroInput());
    const forged = structuredClone(fixture) as any;
    const keyByStarId = new Map(forged.ruleSnapshot.rules.starRegistry.entries
      .map((entry: any) => [entry.starId, entry.upstreamKey]));
    const locate = (key: string) => {
      for (const palace of forged.facts.palaces) {
        const index = palace.stars.findIndex((star: any) => keyByStarId.get(star.starId) === key);
        if (index >= 0) return { palace, index };
      }
      throw new Error(`Missing forged-test star ${key}`);
    };
    const qisha = locate("qishaMaj");
    const pojun = locate("pojunMaj");
    const qishaStar = qisha.palace.stars[qisha.index];
    const pojunStar = pojun.palace.stars[pojun.index];
    qisha.palace.stars[qisha.index] = pojunStar;
    pojun.palace.stars[pojun.index] = qishaStar;
    for (const { palace, index } of [qisha, pojun]) {
      const star = palace.stars[index];
      const row = forged.ruleSnapshot.rules.brightnessTable.entries
        .find((entry: any) => entry.starId === star.starId);
      star.brightnessId = row?.byEarthlyBranch[palace.earthlyBranchId] ?? null;
    }
    Object.assign(forged.receipt, await calculateZiweiNatalFixtureDigests(forged));
    expect((await verifyZiweiNatalFixtureDraft(forged)).success).toBe(true);
    await expect(compareFortelAgainstVerifiedIztroFixtureDraft(forged))
      .rejects.toMatchObject({ code: "UNAUTHENTICATED_IZTRO_REFERENCE" });
  });

  it("keeps the complete 32-node package-lock closure", () => {
    const closure = JSON.parse(readFileSync(
      new URL("./fortel-ziweidoushu-1.3.4-lock-closure.json", import.meta.url),
      "utf8"
    )) as { nodes: Array<{ name: string; version: string }>; rootOverrides: Record<string, string> };
    expect(closure.nodes).toHaveLength(32);
    expect(closure.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "fortel-ziweidoushu", version: "1.3.4" }),
      expect.objectContaining({ name: "util", version: "0.12.5" })
    ]));
    expect(closure.rootOverrides).toEqual({ "fortel-ziweidoushu": "1.3.4", util: "0.12.5" });
  });
});
