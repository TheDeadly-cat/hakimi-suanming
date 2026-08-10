import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { describe, expect, it } from "vitest";

import {
  CALENDAR_DIVERGENCE_ASTRONOMY_EVENTS_DIGEST,
  CALENDAR_DIVERGENCE_DIAGNOSTIC_CLASSIFICATION,
  CALENDAR_DIVERGENCE_TRIGGER_EXPECTATIONS,
  CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID,
  CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE,
  calendarDivergenceWindowsEnvelopeSchema,
  calendarDivergenceWindowsPayloadSchema,
  digestCalendarDivergenceWindowsPayload,
  preflightCalendarDivergenceWindows,
  serializeCalendarDivergenceWindows
} from "./calendar-divergence-windows";

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

describe("P0-03 连续历法差异权威窗口", () => {
  it("严格解析内容寻址资产并锁定来源运行快照", async () => {
    const checked = await preflightCalendarDivergenceWindows(
      serializeCalendarDivergenceWindows(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE)
    );

    expect(checked.payload.datasetId).toBe(CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID);
    expect(checked.payload.classification).toBe(CALENDAR_DIVERGENCE_DIAGNOSTIC_CLASSIFICATION);
    expect(checked.payload.normalizedAstronomyEventEnvelopeDigest)
      .toBe(CALENDAR_DIVERGENCE_ASTRONOMY_EVENTS_DIGEST);
    expect(await digestCalendarDivergenceWindowsPayload(checked.payload)).toBe(checked.digest);
    expect(serializeCalendarDivergenceWindows(checked)).toBe(`${canonicalStringify(checked)}\n`);

    expect(checked.payload.sources.map((item) => item.sourceId)).toEqual([
      "hko-calendar-2089-tc",
      "hko-calendar-2097-tc",
      "current-adapter-lunar-typescript-1-8-6",
      "icu-chinese-calendar-78-3",
      "dotnet-framework-4-8-chinese-lunisolar",
      "usno-moon-phases-2089",
      "usno-moon-phases-2097"
    ]);
    expect(checked.payload.sources.find((item) => item.sourceId === "icu-chinese-calendar-78-3"))
      .toMatchObject({ version: "Node.js 24.16.0 / ICU 78.3 / CLDR 48 / tz 2026b" });
  });

  it("两个窗口各连续 32 日，精确守恒为 64 案例、60 差异和 4 控制", () => {
    const payload = CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload;
    const allCases = payload.windows.flatMap((window) => window.cases);

    expect(payload.declaredCounts).toEqual({
      windows: 2,
      cases: 64,
      divergence: 60,
      controls: 4,
      triggerCases: 7
    });
    expect(allCases).toHaveLength(64);
    expect(new Set(allCases.map((item) => item.caseId)).size).toBe(64);
    expect(new Set(allCases.map((item) => item.gregorianDate)).size).toBe(64);
    expect(allCases.filter((item) => item.role === "divergence")).toHaveLength(60);
    expect(allCases.filter((item) => item.role === "control")).toHaveLength(4);

    for (const window of payload.windows) {
      expect(window.cases).toHaveLength(32);
      expect(window.cases[0]?.gregorianDate).toBe(window.startDate);
      expect(window.cases[31]?.gregorianDate).toBe(window.endDate);
      expect(window.cases.filter((item) => item.role === "control").map((item) => item.ordinal))
        .toEqual([0, 31]);
      for (const [index, candidate] of window.cases.entries()) {
        expect(candidate.ordinal).toBe(index);
        expect(candidate.gregorianDate).toBe(addDays(window.startDate, index));
        expect(candidate.caseId).toBe(`calendar-window-${candidate.gregorianDate}`);
      }
    }
  });

  it("逐日锁定 HKO / 当前适配器 / ICU / .NET 四路值与两侧控制日", () => {
    const [window2089, window2097] = CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload.windows;
    if (!window2089 || !window2097) throw new Error("测试前置窗口缺失");

    for (const candidate of [...window2089.cases, ...window2097.cases]) {
      expect(candidate.observations.currentAdapter).toEqual(candidate.observations.hko);
      expect(candidate.observations.icu).toEqual(candidate.observations.hko);
      if (candidate.role === "control") {
        expect(candidate.observations.dotnet).toEqual(candidate.observations.hko);
        expect(candidate.differenceClass).toBe("all_sources_match_control");
      } else {
        expect(candidate.observations.dotnet).not.toEqual(candidate.observations.hko);
        expect(candidate.differenceClass).toBe("dotnet_adjacent_month_length_offset");
      }
    }

    expect(window2089.cases[1]?.observations).toMatchObject({
      hko: { lunarDate: "2089-08-01", lunarLeapMonth: false },
      currentAdapter: { lunarDate: "2089-08-01", lunarLeapMonth: false },
      icu: { lunarDate: "2089-08-01", lunarLeapMonth: false },
      dotnet: { lunarDate: "2089-07-30", lunarLeapMonth: false }
    });
    expect(window2097.cases[1]?.observations).toMatchObject({
      hko: { lunarDate: "2097-07-01", lunarLeapMonth: false },
      currentAdapter: { lunarDate: "2097-07-01", lunarLeapMonth: false },
      icu: { lunarDate: "2097-07-01", lunarLeapMonth: false },
      dotnet: { lunarDate: "2097-06-30", lunarLeapMonth: false }
    });
  });

  it("把七个原始触发案例逐案绑定到唯一窗口日期和输入摘要", () => {
    const payload = CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload;
    expect(payload.triggers).toEqual(CALENDAR_DIVERGENCE_TRIGGER_EXPECTATIONS);

    const bindings = payload.windows.flatMap((window) => window.cases.flatMap((candidate) =>
      candidate.triggerCaseIds.map((caseId) => ({
        caseId,
        gregorianDate: candidate.gregorianDate,
        windowId: window.windowId
      }))
    ));
    expect(bindings).toHaveLength(7);
    expect(new Set(bindings.map((item) => item.caseId)).size).toBe(7);
    expect(bindings).toEqual(payload.triggers.map(({ inputDigest: _inputDigest, ...trigger }) => trigger));
  });

  it("冻结近午夜朔事件只解释差异方向，不把根因假设伪装成裁决", () => {
    const [window2089, window2097] = CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload.windows;
    expect(window2089?.rootCauseAssessment).toMatchObject({
      resolutionStatus: "unresolved",
      newMoonUtc: "2089-09-04T15:59:00.000Z",
      fixedPlus08Local: "2089-09-04T23:59:00+08:00",
      favors: "hko_current_icu"
    });
    expect(window2097?.rootCauseAssessment).toMatchObject({
      resolutionStatus: "unresolved",
      newMoonUtc: "2097-08-07T16:01:00.000Z",
      fixedPlus08Local: "2097-08-08T00:01:00+08:00",
      favors: "dotnet"
    });
  });

  it("删行、重复日期、改来源摘要或改根因方向即使重签外层也失败关闭", async () => {
    const deleted = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE);
    deleted.payload.windows[0]!.cases.splice(8, 1);
    deleted.digest = await sha256Hex(deleted.payload);
    await expect(preflightCalendarDivergenceWindows(deleted)).rejects.toBeInstanceOf(Error);

    const duplicateDate = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE);
    duplicateDate.payload.windows[0]!.cases[1]!.gregorianDate = duplicateDate.payload.windows[0]!.cases[0]!.gregorianDate;
    duplicateDate.digest = await sha256Hex(duplicateDate.payload);
    await expect(preflightCalendarDivergenceWindows(duplicateDate)).rejects.toBeInstanceOf(Error);

    const forgedSource = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE);
    forgedSource.payload.sources[0]!.artifacts[0]!.sha256 = "f".repeat(64);
    forgedSource.digest = await sha256Hex(forgedSource.payload);
    await expect(preflightCalendarDivergenceWindows(forgedSource)).rejects.toBeInstanceOf(Error);

    const redirectedSource = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE);
    redirectedSource.payload.sources[0]!.sourceRef = "https://example.com/T2089c.txt";
    redirectedSource.payload.sources[0]!.artifacts[0]!.sourceRef = "https://example.com/T2089c.txt";
    redirectedSource.digest = await sha256Hex(redirectedSource.payload);
    await expect(preflightCalendarDivergenceWindows(redirectedSource)).rejects.toBeInstanceOf(Error);

    const reversedCause = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE);
    reversedCause.payload.windows[1]!.rootCauseAssessment.favors = "hko_current_icu";
    reversedCause.digest = await sha256Hex(reversedCause.payload);
    await expect(preflightCalendarDivergenceWindows(reversedCause)).rejects.toBeInstanceOf(Error);
  });

  it("拒绝摘要篡改、危险额外字段和任何金标升级", async () => {
    const badDigest = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE);
    badDigest.digest = "f".repeat(64);
    await expect(preflightCalendarDivergenceWindows(badDigest)).rejects.toMatchObject({
      code: "DIGEST_MISMATCH"
    });

    const resignedMetadata = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE);
    resignedMetadata.payload.sources[0]!.note += " 重签元数据";
    resignedMetadata.digest = await sha256Hex(resignedMetadata.payload);
    await expect(preflightCalendarDivergenceWindows(resignedMetadata)).rejects.toMatchObject({
      code: "FIXTURE_VERSION_MISMATCH"
    });

    const extraField = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload) as unknown as Record<string, unknown>;
    extraField.verified = true;
    expect(calendarDivergenceWindowsPayloadSchema.safeParse(extraField).success).toBe(false);

    const fakeGold = structuredClone(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload) as unknown as Record<string, unknown>;
    (fakeGold.releaseBoundary as { countsAsVerifiedGold: boolean }).countsAsVerifiedGold = true;
    expect(calendarDivergenceWindowsPayloadSchema.safeParse(fakeGold).success).toBe(false);
    expect(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload.releaseBoundary).toMatchObject({
      countsAsVerifiedGold: false,
      verifiedGoldDelta: 0,
      fullP003GatePassed: false
    });

    expect(calendarDivergenceWindowsEnvelopeSchema.safeParse({
      ...CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE,
      injected: "forbidden"
    }).success).toBe(false);
  });
});
