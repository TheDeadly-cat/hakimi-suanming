import { describe, expect, it } from "vitest";
import {
  CALENDAR_CONVERSION_FIXTURE,
  calendarConversionFixtureSchema,
  digestCalendarConversionCandidate,
  summarizeCalendarConversionEvidence,
  verifyCalendarConversionCandidates
} from "./lunar-conversion";

describe("首批 24 条公农历双向权威历表候选", () => {
  it("冻结 24 个唯一历法对而不是把两个方向重复计数", () => {
    const candidates = CALENDAR_CONVERSION_FIXTURE.cases;
    expect(candidates).toHaveLength(24);
    expect(new Set(candidates.map((candidate) => candidate.id)).size).toBe(24);
    expect(new Set(candidates.map((candidate) =>
      `${candidate.lunarDate}|${candidate.lunarLeapMonth ? "leap" : "regular"}`
    )).size).toBe(24);
    expect(new Set(candidates.map((candidate) => candidate.expectedGregorianDate)).size).toBe(24);
  });

  it("覆盖上下界、春节、大小月及多个不同位置的闰月", () => {
    const tags = new Set(CALENDAR_CONVERSION_FIXTURE.cases.flatMap((candidate) => candidate.coverageTags));
    expect([...tags]).toEqual(expect.arrayContaining([
      "supported_range_lower_edge",
      "supported_range_upper_edge",
      "lunar_new_year_eve",
      "lunar_new_year_first_day",
      "regular_small_month_end",
      "regular_big_month_end",
      "leap_month_first_day",
      "leap_month_last_day",
      "latest_resolvable_gregorian_date"
    ]));
    const leapMonths = new Set(CALENDAR_CONVERSION_FIXTURE.cases
      .filter((candidate) => candidate.lunarLeapMonth)
      .map((candidate) => candidate.lunarDate.slice(0, 7)));
    expect(leapMonths).toEqual(new Set(["1903-05", "1995-08", "2012-04", "2023-02", "2025-06"]));
  });

  it("每条均绑定权威来源定位，来源材料带固定摘要且同机构双载体不冒充独立谱系", () => {
    expect(CALENDAR_CONVERSION_FIXTURE.sources.every((source) => source.artifactSha256 !== null)).toBe(true);
    expect(new Set(CALENDAR_CONVERSION_FIXTURE.sources.map((source) => source.lineageId)))
      .toEqual(new Set(["hong-kong-observatory-calendar", "dotnet-chinese-lunisolar-calendar"]));
    expect(CALENDAR_CONVERSION_FIXTURE.cases.every((candidate) =>
      candidate.evidence.observations.some((observation) => observation.role === "authoritative")
    )).toBe(true);
    expect(CALENDAR_CONVERSION_FIXTURE.independentCrossCheckRuns[0]).toMatchObject({
      matchedCaseIds: expect.any(Array),
      unsupportedCaseIds: ["calendar-hko-1900-12-30"],
      mismatches: []
    });
    expect(CALENDAR_CONVERSION_FIXTURE.independentCrossCheckRuns[0]!.matchedCaseIds).toHaveLength(23);
  });

  it("当前适配器对 24 个历法对执行 48 个方向断言并全部匹配", () => {
    expect(verifyCalendarConversionCandidates()).toEqual({
      datasetId: "hko-calendar-conversion-candidates-v1",
      uniquePairs: 24,
      directionAssertions: 48,
      matchedCases: 24,
      matchedDirectionAssertions: 48,
      mismatches: [],
      authorityReferencedCaseCount: 24,
      crossCheckedCaseCount: 0,
      independentImplementationMatchedCaseCount: 23,
      independentImplementationUnsupportedCaseCount: 1,
      verifiedGoldCaseCount: 0,
      calendarQuotaPassed: false,
      projectReleaseGatePassed: false
    });
  });

  it("来源匹配与人工金标分开计数，且案例摘要可重复复算", async () => {
    expect(summarizeCalendarConversionEvidence()).toEqual({
      candidate: 24,
      crossChecked: 0,
      independentImplementationMatched: 23,
      independentImplementationUnsupported: 1,
      verified: 0,
      authorityReferenced: 24,
      total: 24,
      calendarQuotaPassed: false,
      projectReleaseGatePassed: false
    });
    const first = CALENDAR_CONVERSION_FIXTURE.cases[0]!;
    const digest = await digestCalendarConversionCandidate(first);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).toBe(await digestCalendarConversionCandidate(first));

    const lifecycleOnlyChange = structuredClone(first);
    lifecycleOnlyChange.evidence.status = "cross_checked";
    expect(await digestCalendarConversionCandidate(lifecycleOnlyChange)).toBe(digest);

    const assertionChange = structuredClone(first);
    assertionChange.coverageTags.push("digest_regression_probe");
    expect(await digestCalendarConversionCandidate(assertionChange)).not.toBe(digest);
  });

  it("拒绝伪造来源、无语义日期及 candidate-only 阶段的 verified", () => {
    const mismatchedObservation = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    mismatchedObservation.cases[0]!.evidence.observations[0]!.observedGregorianDate = "1901-02-19";
    expect(calendarConversionFixtureSchema.safeParse(mismatchedObservation).success).toBe(false);

    const missingSource = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    missingSource.cases[0]!.evidence.observations[0]!.sourceId = "missing-source";
    expect(calendarConversionFixtureSchema.safeParse(missingSource).success).toBe(false);

    const clonedLineage = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    const clonedSource = structuredClone(clonedLineage.sources[0]!);
    clonedSource.sourceId = "hko-table-1901-fake-independent-copy";
    clonedSource.lineageId = "fake-independent-lineage";
    clonedLineage.sources.push(clonedSource);
    const clonedCase = clonedLineage.cases[0]!;
    clonedCase.evidence.status = "cross_checked";
    clonedCase.evidence.observations.push({
      ...structuredClone(clonedCase.evidence.observations[0]!),
      role: "crosscheck",
      sourceId: clonedSource.sourceId
    });
    expect(calendarConversionFixtureSchema.safeParse(clonedLineage).success).toBe(false);

    const fakeVerified = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    fakeVerified.cases[0]!.evidence.status = "verified";
    expect(calendarConversionFixtureSchema.safeParse(fakeVerified).success).toBe(false);

    const fakeAuthority = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    const supported = fakeAuthority.cases[1]!;
    supported.evidence.observations.push({
      role: "authoritative",
      sourceId: "dotnet-framework-4-8-chinese-lunisolar",
      locator: "伪造的软件权威观察",
      observedLunarDate: supported.lunarDate,
      observedLunarLeapMonth: supported.lunarLeapMonth,
      observedGregorianDate: supported.expectedGregorianDate
    });
    expect(calendarConversionFixtureSchema.safeParse(fakeAuthority).success).toBe(false);

    const invalidGregorian = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    invalidGregorian.cases[0]!.expectedGregorianDate = "1901-02-31";
    invalidGregorian.cases[0]!.evidence.observations[0]!.observedGregorianDate = "1901-02-31";
    expect(calendarConversionFixtureSchema.safeParse(invalidGregorian).success).toBe(false);

    const invalidLunarShape = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    invalidLunarShape.cases[0]!.lunarDate = "1900-13-01";
    invalidLunarShape.cases[0]!.evidence.observations[0]!.observedLunarDate = "1900-13-01";
    expect(calendarConversionFixtureSchema.safeParse(invalidLunarShape).success).toBe(false);

    const impossibleLunarDate = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    impossibleLunarDate.cases[0]!.lunarDate = "2023-02-30";
    impossibleLunarDate.cases[0]!.lunarLeapMonth = true;
    impossibleLunarDate.cases[0]!.evidence.observations[0]!.observedLunarDate = "2023-02-30";
    impossibleLunarDate.cases[0]!.evidence.observations[0]!.observedLunarLeapMonth = true;
    const independentlyStructured = calendarConversionFixtureSchema.parse(impossibleLunarDate);
    expect(verifyCalendarConversionCandidates(independentlyStructured).mismatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ caseId: "calendar-hko-1900-12-30", direction: "lunar_to_gregorian" }),
      expect.objectContaining({ caseId: "calendar-hko-1900-12-30", direction: "gregorian_to_lunar" })
    ]));

    const incompleteCrossCheck = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    incompleteCrossCheck.independentCrossCheckRuns[0]!.matchedCaseIds.pop();
    expect(calendarConversionFixtureSchema.safeParse(incompleteCrossCheck).success).toBe(false);
  });

  it("只允许 matched 软件运行逐案例升级 cross_checked，并拒绝跨运行矛盾", () => {
    const supportedCrossCheck = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    const supported = supportedCrossCheck.cases[1]!;
    supported.evidence.status = "cross_checked";
    supported.evidence.observations.push({
      role: "crosscheck",
      sourceId: "dotnet-framework-4-8-chinese-lunisolar",
      locator: "dotnet-framework-4-8-calendar-crosscheck-2026-08-01",
      observedLunarDate: supported.lunarDate,
      observedLunarLeapMonth: supported.lunarLeapMonth,
      observedGregorianDate: supported.expectedGregorianDate
    });
    expect(calendarConversionFixtureSchema.safeParse(supportedCrossCheck).success).toBe(true);

    const unsupportedCrossCheck = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    const unsupported = unsupportedCrossCheck.cases[0]!;
    unsupported.evidence.status = "cross_checked";
    unsupported.evidence.observations.push({
      role: "crosscheck",
      sourceId: "dotnet-framework-4-8-chinese-lunisolar",
      locator: "dotnet-framework-4-8-calendar-crosscheck-2026-08-01",
      observedLunarDate: unsupported.lunarDate,
      observedLunarLeapMonth: unsupported.lunarLeapMonth,
      observedGregorianDate: unsupported.expectedGregorianDate
    });
    expect(calendarConversionFixtureSchema.safeParse(unsupportedCrossCheck).success).toBe(false);

    const conflictingRuns = structuredClone(CALENDAR_CONVERSION_FIXTURE);
    const rerun = structuredClone(conflictingRuns.independentCrossCheckRuns[0]!);
    rerun.runId = "dotnet-framework-4-8-calendar-conflicting-rerun";
    rerun.unsupportedCaseIds = [];
    rerun.matchedCaseIds.push("calendar-hko-1900-12-30");
    conflictingRuns.independentCrossCheckRuns.push(rerun);
    expect(calendarConversionFixtureSchema.safeParse(conflictingRuns).success).toBe(false);
  });
});
