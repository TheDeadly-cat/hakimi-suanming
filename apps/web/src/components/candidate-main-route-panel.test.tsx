import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { candidateSetRecordSchema, type CandidateSetRecord } from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import * as candidateRoutes from "../lib/candidate-main-route";
import { CandidateMainRoutePanel } from "./candidate-main-route-panel";

let recordA: CandidateSetRecord, recordB: CandidateSetRecord, actual: candidateRoutes.CandidateMainRoute;
const range = { startYear: 2030, endYear: 2032 };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(accept => { resolve = accept; }); return { promise, resolve }; }
beforeAll(async () => {
  const candidateSet = await calculateUnknownHourCandidates({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: null,
    timePrecision: "unknown_hour", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "合成候选界面", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic UI fixture" }, WORKING_DEFAULT_RULE_PROFILE);
  recordA = candidateSetRecordSchema.parse({ schemaVersion: "1.0.0", recordVersion: 2, recordType: "unknown_hour_candidate_set",
    id: "11111111-1111-4111-8111-111111111111", alias: "合成候选A", tags: [], notes: "synthetic", favorite: false, deletedAt: null,
    createdAt: "2026-11-07T00:00:00.000Z", updatedAt: "2026-11-07T00:00:00.000Z", candidateSet, snapshotDigest: await sha256Hex(candidateSet) });
  recordB = { ...structuredClone(recordA), id: "22222222-2222-4222-8222-222222222222", alias: "合成候选B" };
  actual = await candidateRoutes.prepareCandidateMainRoutes(recordA, range);
}, 60_000);
afterEach(() => vi.restoreAllMocks());
const setYear = () => fireEvent.change(screen.getByLabelText("候选走势起始年"), { target: { value: "2030" } });
const begin = () => fireEvent.click(screen.getByRole("button", { name: "核对全部候选的走势" }));

it("requires explicit all-candidate calculation, runs the real producers, and does not select a hypothesis by default", async () => {
  const original = structuredClone(recordA), prepare = vi.spyOn(candidateRoutes, "prepareCandidateMainRoutes");
  render(<CandidateMainRoutePanel record={recordA} />);
  expect(screen.getByText(/尚未逐候选核对，不能先给共同主线/)).toBeTruthy();
  expect(prepare).not.toHaveBeenCalled();
  setYear(); begin();
  await screen.findByRole("button", { name: "重新核对全部候选" }, { timeout: 30_000 });
  expect(prepare).toHaveBeenCalledTimes(1);
  const result = await prepare.mock.results[0]!.value;
  expect(result.checkedProbeCount).toBe(13);
  expect(result.checkedVariantCount).toBe(13);
  expect(result.checkedRouteCount).toBe(13);
  expect(screen.getByRole("heading", { name: result.headline })).toBeTruthy();
  fireEvent.click(screen.getByText("分别查看假设路线及各自条件"));
  const selector = screen.getByLabelText("选择一条候选假设");
  expect(selector).toHaveProperty("value", "");
  expect(document.querySelector(".candidate-main-route-selected")).toBeNull();
  const selected = result.outcomes.find((outcome: candidateRoutes.CandidateRouteOutcome) => outcome.status === "ready")!;
  fireEvent.change(selector, { target: { value: candidateRoutes.candidateRouteKey(selected.source) } });
  expect(screen.getByRole("heading", { name: /仅按.*探针/ })).toBeTruthy();
  expect(document.querySelector(".candidate-main-route-selected")?.getAttribute("data-candidate-route"))
    .toBe(candidateRoutes.candidateRouteKey(selected.source));
  expect(recordA).toEqual(original);
  expect(recordA.candidateSet.input).toMatchObject({ timePrecision: "unknown_hour", time: null });
});

it("does not publish a completed A calculation after the current record has changed to B", async () => {
  const gate = deferred<candidateRoutes.CandidateMainRoute>();
  const prepare = vi.spyOn(candidateRoutes, "prepareCandidateMainRoutes").mockReturnValueOnce(gate.promise);
  const view = render(<CandidateMainRoutePanel record={recordA} />);
  setYear(); begin();
  expect(screen.getByRole("button", { name: "正在核对全部候选" })).toHaveProperty("disabled", true);
  const options = prepare.mock.calls[0]![1];
  view.rerender(<CandidateMainRoutePanel record={recordB} />);
  expect(options.isCancelled?.()).toBe(true);
  await act(async () => { gate.resolve(actual); await gate.promise; options.onProgress?.({ completedVariants: 13, totalVariants: 13, completedRoutes: 13, totalRoutes: 13 }); });
  expect(screen.getByText("合成候选B · 出生时刻仍未确定")).toBeTruthy();
  expect(screen.getByText(/尚未逐候选核对/)).toBeTruthy();
  expect(screen.queryByRole("heading", { name: actual.headline })).toBeNull();
  expect(screen.queryByRole("list", { name: "全部候选逐区间核对结果" })).toBeNull();
  expect(prepare).toHaveBeenCalledTimes(1);
});

it("cancels without promoting partial progress or a late full result to a common main judgment", async () => {
  const gate = deferred<candidateRoutes.CandidateMainRoute>();
  const prepare = vi.spyOn(candidateRoutes, "prepareCandidateMainRoutes").mockReturnValueOnce(gate.promise);
  render(<CandidateMainRoutePanel record={recordA} />); setYear(); begin();
  const options = prepare.mock.calls[0]![1];
  act(() => options.onProgress?.({ completedVariants: 2, totalVariants: 13, completedRoutes: 2, totalRoutes: 13 }));
  expect(screen.getByRole("status").textContent).toContain("已处理 2/13");
  fireEvent.click(screen.getByRole("button", { name: "取消本轮核对" }));
  expect(options.isCancelled?.()).toBe(true);
  await act(async () => { gate.resolve(actual); await gate.promise; });
  expect(screen.getByText(/已取消本轮核对，未用部分结果/)).toBeTruthy();
  expect(screen.queryByRole("heading", { name: actual.headline })).toBeNull();
  expect(screen.getByRole("button", { name: "核对全部候选的走势" })).toBeTruthy();
});

it("rejects a foreign returned source even when the current pending request still exists", async () => {
  const wrong = structuredClone(actual); wrong.source.recordId = recordB.id;
  vi.spyOn(candidateRoutes, "prepareCandidateMainRoutes").mockResolvedValueOnce(wrong);
  render(<CandidateMainRoutePanel record={recordA} />); setYear(); begin();
  await screen.findByRole("alert");
  expect(screen.queryByRole("heading", { name: actual.headline })).toBeNull();
  expect(screen.getByText(/全部候选尚未核对完成/)).toBeTruthy();
});

it("invalidates an old result when the displayed range changes and retries a failed calculation without editing input", async () => {
  const prepare = vi.spyOn(candidateRoutes, "prepareCandidateMainRoutes").mockRejectedValueOnce(new Error("synthetic calculation failure"))
    .mockResolvedValueOnce(actual);
  render(<CandidateMainRoutePanel record={recordA} />); setYear(); begin();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "重新核对全部候选" }));
  await screen.findByRole("heading", { name: actual.headline });
  fireEvent.change(screen.getByLabelText("候选走势范围"), { target: { value: "1" } });
  await waitFor(() => expect(screen.queryByRole("heading", { name: actual.headline })).toBeNull());
  expect(screen.getByText(/尚未逐候选核对/)).toBeTruthy();
  expect(prepare).toHaveBeenCalledTimes(2);
  expect(recordA.candidateSet.input.time).toBeNull();
});
