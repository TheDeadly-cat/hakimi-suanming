import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput, CalculatedChart, RevisionRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import {
  buildBaziBirthTimePerturbationStabilityReport,
  type BaziBirthTimePerturbationStabilityReport
} from "@hakimi/bazi-interpretation";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { BirthTimePerturbationPanel } from "./birth-time-perturbation-panel";

const RAW_BIRTH_DATE = "1995-08-18";
const RAW_BIRTH_TIME = "08:26";
const RAW_TIME_ZONE = "Asia/Shanghai";
const RAW_LOCATION = "不得进入扰动面板的测试地点";
const RAW_SOURCE_NOTE = "不得进入扰动面板的测试备注";
const REQUESTED_OFFSETS = [0, -1, 1, -5, 5, -15, 15];

const DEFAULT_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: RAW_BIRTH_DATE,
  time: RAW_BIRTH_TIME,
  timePrecision: "exact_minute",
  timeZone: RAW_TIME_ZONE,
  sex: "male",
  lunarLeapMonth: false,
  location: {
    label: RAW_LOCATION,
    latitude: null,
    longitude: null,
    precision: "unknown"
  },
  sourceNote: RAW_SOURCE_NOTE
};

let stableRevision: RevisionRecord;
let changedRevision: RevisionRecord;
let blockedRevision: RevisionRecord;
let stableReport: BaziBirthTimePerturbationStabilityReport;
let changedReport: BaziBirthTimePerturbationStabilityReport;
let blockedReport: BaziBirthTimePerturbationStabilityReport;

let fetchMock: ReturnType<typeof vi.fn>;
let storageSetItemSpy: ReturnType<typeof vi.spyOn>;
let storageRemoveItemSpy: ReturnType<typeof vi.spyOn>;
let storageClearSpy: ReturnType<typeof vi.spyOn>;
let indexedDbOpenSpy: ReturnType<typeof vi.spyOn>;

function revisionFromChart(
  chart: CalculatedChart,
  id: string,
  revisionNumber = 3
): RevisionRecord {
  return {
    schemaVersion: "1.0.0",
    id,
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber,
    createdAt: "2026-08-24T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    ...(chart.rulePackBinding ? { rulePackBinding: chart.rulePackBinding } : {}),
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
}

async function fixtureRevision(
  inputPatch: Partial<BirthInput>,
  id: string
): Promise<RevisionRecord> {
  const chart = await calculateChart({
    ...DEFAULT_INPUT,
    ...inputPatch,
    location: inputPatch.location ?? DEFAULT_INPUT.location
  }, WORKING_DEFAULT_RULE_PROFILE);
  return revisionFromChart(chart, id);
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function revisionIdentity(
  source: RevisionRecord,
  id: string,
  revisionNumber: number,
  resultHashCharacter: string
): RevisionRecord {
  return {
    ...source,
    id,
    revisionNumber,
    manifest: {
      ...source.manifest,
      resultHash: resultHashCharacter.repeat(64)
    }
  };
}

function reportForRevision(
  source: BaziBirthTimePerturbationStabilityReport,
  revision: RevisionRecord
): BaziBirthTimePerturbationStabilityReport {
  return {
    ...source,
    binding: {
      ...source.binding,
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      sourceResultHash: revision.manifest.resultHash
    }
  };
}

function expectNoBrowserWritesOrFetches() {
  expect(fetchMock).not.toHaveBeenCalled();
  expect(storageSetItemSpy).not.toHaveBeenCalled();
  expect(storageRemoveItemSpy).not.toHaveBeenCalled();
  expect(storageClearSpy).not.toHaveBeenCalled();
  expect(indexedDbOpenSpy).not.toHaveBeenCalled();
}

function expectNoPseudoQuantification(container: HTMLElement) {
  const visibleText = container.textContent ?? "";
  expect(visibleText).not.toMatch(/\d+(?:\.\d+)?\s*%/u);
  expect(visibleText).not.toMatch(/准确率|置信度|稳定分数\s*[:：]\s*\d|概率\s*[:：]\s*\d/u);
  expect(container.querySelector("progress, meter, [role='progressbar']")).toBeNull();
  expect(container.querySelector("[data-probability-produced='false']")).toBeTruthy();
  expect(container.querySelector("[data-stability-score-produced='false']")).toBeTruthy();
  expect(container.querySelector("[data-real-birth-time-inferred='false']")).toBeTruthy();
  expect(visibleText).toContain("probability:null · score:null · result:null");
}

beforeAll(async () => {
  stableRevision = await fixtureRevision({}, "11111111-1111-4111-8111-111111111111");
  changedRevision = await fixtureRevision(
    { time: "08:59" },
    "33333333-3333-4333-8333-333333333333"
  );
  blockedRevision = await fixtureRevision({
    date: "2024-11-03",
    time: "00:50",
    timeZone: "America/New_York"
  }, "44444444-4444-4444-8444-444444444444");

  [stableReport, changedReport, blockedReport] = await Promise.all([
    buildBaziBirthTimePerturbationStabilityReport(stableRevision),
    buildBaziBirthTimePerturbationStabilityReport(changedRevision),
    buildBaziBirthTimePerturbationStabilityReport(blockedRevision)
  ]);
}, 60_000);

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  storageSetItemSpy = vi.spyOn(Storage.prototype, "setItem");
  storageRemoveItemSpy = vi.spyOn(Storage.prototype, "removeItem");
  storageClearSpy = vi.spyOn(Storage.prototype, "clear");
  indexedDbOpenSpy = vi.spyOn(indexedDB, "open");
});

afterEach(() => {
  expectNoBrowserWritesOrFetches();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("BirthTimePerturbationPanel", () => {
  it("starts idle and does not calculate, fetch, or write storage before explicit action", () => {
    const buildReport = vi.fn<typeof buildBaziBirthTimePerturbationStabilityReport>();
    const { container } = render(
      <BirthTimePerturbationPanel revision={stableRevision} buildReport={buildReport} />
    );

    expect(buildReport).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "七点扰动报告" })).toBeNull();
    expect(screen.getByRole("button", { name: "运行七点民用时间扰动" })).toBeTruthy();
    expect(container.querySelector("[data-state='idle']")).toBeTruthy();
    expect(container.querySelector("[data-release-identity='legacy-v13']")).toBeTruthy();
    expect(container.querySelector("[data-target-schema='13']")).toBeTruthy();
    expect(container.querySelector("[data-migration-id='null']")).toBeTruthy();
    expect(container.querySelector("[data-mutation-epoch-bypassed='false']")).toBeTruthy();
    expect(container.querySelector("[data-record-write-performed='false']")).toBeTruthy();
  });

  it("renders a stable report in the fixed seven-point order without raw birth data or pseudo-quantification", async () => {
    const buildReport = vi.fn().mockResolvedValue(stableReport);
    const { container } = render(
      <BirthTimePerturbationPanel revision={stableRevision} buildReport={buildReport} />
    );

    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));

    const result = await screen.findByRole("region", { name: "七点扰动报告" });
    expect(buildReport).toHaveBeenCalledTimes(1);
    expect(buildReport).toHaveBeenCalledWith(stableRevision);
    await waitFor(() => expect(document.activeElement).toBe(result));
    expect(screen.getAllByText("七个列出样本的四柱投影未变化")).toHaveLength(2);
    expect(Array.from(container.querySelectorAll<HTMLElement>("[data-offset-minutes]"))
      .map((element) => Number(element.dataset.offsetMinutes)))
      .toEqual(REQUESTED_OFFSETS);
    expect(container.querySelectorAll("[data-scenario-status='calculated']")).toHaveLength(7);
    expect(container.querySelectorAll("[data-same-projection='true']")).toHaveLength(7);

    const visibleText = container.textContent ?? "";
    for (const rawValue of [
      RAW_BIRTH_DATE,
      RAW_BIRTH_TIME,
      RAW_TIME_ZONE,
      RAW_LOCATION,
      RAW_SOURCE_NOTE
    ]) {
      expect(visibleText).not.toContain(rawValue);
    }
    expectNoPseudoQuantification(container);
  });

  it("renders changed samples as neutral pillar projection facts, not a recommendation", async () => {
    const buildReport = vi.fn().mockResolvedValue(changedReport);
    const { container } = render(
      <BirthTimePerturbationPanel revision={changedRevision} buildReport={buildReport} />
    );

    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));

    await screen.findByRole("region", { name: "七点扰动报告" });
    expect(screen.getAllByText("列出样本内出现四柱投影变化")).toHaveLength(2);
    const plusOne = container.querySelector<HTMLElement>("[data-offset-minutes='1']");
    expect(plusOne).toBeTruthy();
    expect(plusOne?.dataset.scenarioStatus).toBe("calculated");
    expect(plusOne?.dataset.sameProjection).toBe("false");
    expect(within(plusOne as HTMLElement).getByText("投影有变化")).toBeTruthy();
    expect(within(plusOne as HTMLElement).getByText("变化柱：时柱")).toBeTruthy();
    expect((container.textContent ?? "")).not.toMatch(/推荐时辰\s*[:：]/u);
    expectNoPseudoQuantification(container);
  });

  it("keeps a blocked offset separate and marks the seven-point result inconclusive", async () => {
    const buildReport = vi.fn().mockResolvedValue(blockedReport);
    const { container } = render(
      <BirthTimePerturbationPanel revision={blockedRevision} buildReport={buildReport} />
    );

    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));

    await screen.findByRole("region", { name: "七点扰动报告" });
    expect(screen.getAllByText("存在阻断样本，七点集合不完整")).toHaveLength(2);
    const plusFifteen = container.querySelector<HTMLElement>("[data-offset-minutes='15']");
    expect(plusFifteen).toBeTruthy();
    expect(plusFifteen?.dataset.scenarioStatus).toBe("blocked");
    expect(plusFifteen?.dataset.sameProjection).toBe("not_calculated");
    expect(within(plusFifteen as HTMLElement).getByText("失败关闭")).toBeTruthy();
    expect(within(plusFifteen as HTMLElement).getByText(
      "进入 DST 重叠且缺少该样本的明确选择"
    )).toBeTruthy();
    expect(within(plusFifteen as HTMLElement).getByText(
      "dst_overlap_requires_scenario_choice"
    )).toBeTruthy();
    expect(container.querySelectorAll("[data-scenario-status='blocked']"))
      .toHaveLength(blockedReport.counts.blocked);
    expectNoPseudoQuantification(container);
  });

  it("leaves unsupported time precision unavailable without invoking the report builder", () => {
    const unsupportedRevision: RevisionRecord = {
      ...stableRevision,
      id: "55555555-5555-4555-8555-555555555555",
      revisionNumber: 4,
      input: {
        ...stableRevision.input,
        time: null,
        timePrecision: "unknown_hour"
      }
    };
    const buildReport = vi.fn<typeof buildBaziBirthTimePerturbationStabilityReport>();
    const { container } = render(
      <BirthTimePerturbationPanel revision={unsupportedRevision} buildReport={buildReport} />
    );

    expect(container.querySelector("[data-state='unavailable']")).toBeTruthy();
    expect(screen.getByText("当前输入不可运行")).toBeTruthy();
    expect(screen.getByText(/未知时辰、日期级或时间范围输入必须继续保持并列候选/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /运行七点民用时间扰动/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "七点扰动报告" })).toBeNull();
    expect(buildReport).not.toHaveBeenCalled();
  });

  it("fails closed with a fixed sanitized message and never echoes rejected error details", async () => {
    const secretError = `${RAW_BIRTH_DATE} ${RAW_BIRTH_TIME} ${RAW_TIME_ZONE} ${RAW_SOURCE_NOTE}`;
    const buildReport = vi.fn().mockRejectedValue(new Error(secretError));
    const { container } = render(
      <BirthTimePerturbationPanel revision={stableRevision} buildReport={buildReport} />
    );

    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("当前 Revision 未通过精确复演或七点扰动合同");
    expect(alert.textContent).not.toContain(secretError);
    expect(container.textContent).not.toContain(RAW_BIRTH_DATE);
    expect(container.textContent).not.toContain(RAW_BIRTH_TIME);
    expect(container.textContent).not.toContain(RAW_TIME_ZONE);
    expect(container.querySelector("[data-state='failed']")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "七点扰动报告" })).toBeNull();
    expect(buildReport).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["unknown future report status", () => ({
      ...stableReport,
      stability: {
        ...stableReport.stability,
        status: "future_projection_status"
      }
    })],
    ["unknown future blocked code", () => ({
      ...blockedReport,
      scenarios: blockedReport.scenarios.map((scenario) => scenario.status === "blocked"
        ? { ...scenario, blockCode: "future_block_code" }
        : scenario)
    })]
  ])("rejects %s instead of rendering an optimistic fallback", async (_label, makeReport) => {
    const buildReport = vi.fn().mockResolvedValue(makeReport());
    const { container } = render(
      <BirthTimePerturbationPanel revision={stableRevision} buildReport={buildReport} />
    );

    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));

    await screen.findByRole("alert");
    expect(container.querySelector("[data-state='failed']")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "七点扰动报告" })).toBeNull();
  });

  it("rejects accessor-bearing reports before executing the accessor", async () => {
    const accessorRead = vi.fn(() => stableReport.stability);
    const accessorReport = { ...stableReport } as Record<string, unknown>;
    Object.defineProperty(accessorReport, "stability", {
      enumerable: true,
      configurable: true,
      get: accessorRead
    });
    const buildReport = vi.fn().mockResolvedValue(accessorReport);
    const { container } = render(
      <BirthTimePerturbationPanel revision={stableRevision} buildReport={buildReport} />
    );

    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));

    await screen.findByRole("alert");
    expect(accessorRead).not.toHaveBeenCalled();
    expect(container.querySelector("[data-state='failed']")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "七点扰动报告" })).toBeNull();
  });

  it("discards stale success and failure across keyed Revision resets in StrictMode", async () => {
    const staleFailure = deferred<BaziBirthTimePerturbationStabilityReport>();
    const staleSuccess = deferred<BaziBirthTimePerturbationStabilityReport>();
    const secondRevision = revisionIdentity(
      stableRevision,
      "66666666-6666-4666-8666-666666666666",
      4,
      "a"
    );
    const finalRevision = revisionIdentity(
      stableRevision,
      "77777777-7777-4777-8777-777777777777",
      5,
      "b"
    );
    const finalReport = reportForRevision(changedReport, finalRevision);
    const buildReport = vi.fn((candidate: RevisionRecord) => {
      if (candidate.id === stableRevision.id) return staleFailure.promise;
      if (candidate.id === secondRevision.id) return staleSuccess.promise;
      return Promise.resolve(finalReport);
    });
    const { rerender } = render(
      <StrictMode>
        <BirthTimePerturbationPanel revision={stableRevision} buildReport={buildReport} />
      </StrictMode>
    );

    expect(buildReport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));
    expect(buildReport).toHaveBeenCalledTimes(1);

    rerender(
      <StrictMode>
        <BirthTimePerturbationPanel revision={secondRevision} buildReport={buildReport} />
      </StrictMode>
    );
    expect(screen.getByRole("button", { name: "运行七点民用时间扰动" })).toBeTruthy();
    await act(async () => {
      staleFailure.reject(new Error(`迟到失败不得显示 ${RAW_BIRTH_DATE}`));
      await staleFailure.promise.catch(() => undefined);
    });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("region", { name: "七点扰动报告" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));
    expect(buildReport).toHaveBeenCalledTimes(2);
    rerender(
      <StrictMode>
        <BirthTimePerturbationPanel revision={finalRevision} buildReport={buildReport} />
      </StrictMode>
    );
    await act(async () => {
      staleSuccess.resolve(stableReport);
      await staleSuccess.promise;
    });
    expect(screen.queryByRole("region", { name: "七点扰动报告" })).toBeNull();
    expect(screen.queryByText("R3")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "运行七点民用时间扰动" }));
    const finalResult = await screen.findByRole("region", { name: "七点扰动报告" });
    expect(within(finalResult).getByText("R5")).toBeTruthy();
    expect(buildReport).toHaveBeenCalledTimes(3);
    expect(buildReport.mock.calls.map(([candidate]) => candidate.id)).toEqual([
      stableRevision.id,
      secondRevision.id,
      finalRevision.id
    ]);
    await waitFor(() => expect(document.activeElement).toBe(finalResult));
  });
});
