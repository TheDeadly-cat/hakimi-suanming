import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput, CaseBundle, EventRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { ChartPage } from "./chart-page";
import { navigate } from "../lib/router";
import { resetResearchJournalMutationCoordinatorForTests } from "../components/research-journal-mutation-coordinator";
import { clearBootGovernanceFixture, installLegacyV13BootGovernance } from "../test/boot-governance-fixture";

const input: BirthInput = {
  schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
  timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" }, sourceNote: ""
};
const readEvents = researchRepository.listEventsByCase.bind(researchRepository);
const createEvent = researchRepository.createEvent.bind(researchRepository);

beforeEach(async () => {
  installLegacyV13BootGovernance();
  resetResearchJournalMutationCoordinatorForTests();
  await caseRepository.clearAll();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(async () => {
  vi.restoreAllMocks();
  resetResearchJournalMutationCoordinatorForTests();
  await caseRepository.clearAll();
  clearBootGovernanceFixture();
  window.history.replaceState({}, "", "/");
});

async function makeCase(alias = "事件索引合成案例") {
  return caseRepository.createCase({ alias, calculated: await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE) });
}
function openCase(bundle: CaseBundle, eventId?: string, revisionId = bundle.revisions[0].id) {
  window.history.replaceState({}, "", `/cases/${bundle.caseRecord.id}/revisions/${revisionId}?view=research${eventId ? `&event=${eventId}` : ""}`);
  return render(<main><ChartPage caseId={bundle.caseRecord.id} revisionId={revisionId} /></main>);
}
async function waitInitialIndex(observed: { caseId: string; rows: EventRecord[] }[]) {
  await screen.findByRole("region", { name: "记录研究事件" });
  await waitFor(() => expect(observed.length).toBeGreaterThan(0));
  await waitFor(() => expect(screen.queryByText("正在读取事件索引")).toBeNull());
}
function observeIndex() {
  const observed: { caseId: string; rows: EventRecord[] }[] = [];
  const spy = vi.spyOn(researchRepository, "listEventsByCase").mockImplementation(async (caseId, options) => {
    const rows = await readEvents(caseId, options);
    observed.push({ caseId, rows });
    return rows;
  });
  return { observed, spy };
}
function submitEvent(title: string) {
  const editor = within(screen.getByRole("region", { name: "记录研究事件" }));
  fireEvent.change(editor.getByRole("textbox", { name: /事件标题/ }), { target: { value: title } });
  fireEvent.change(editor.getByRole("combobox", { name: "日期精度" }), { target: { value: "unknown" } });
  fireEvent.change(editor.getByRole("textbox", { name: "事件笔记" }), { target: { value: "合成事件正文" } });
  fireEvent.click(editor.getByRole("button", { name: "添加事件" }));
}
async function savedEvent(caseId: string, title: string) {
  await screen.findByText("事件已链接到当前案例与修订。");
  const rows = await readEvents(caseId, { includeDeleted: true });
  expect(rows.filter(row => row.title === title)).toHaveLength(1);
  return rows.find(row => row.title === title)!;
}
function expectNoMissingWarning() {
  expect(screen.queryByText(/事件深链不属于当前案例或记录不存在/)).toBeNull();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function deferIndexAfterInitial() {
  const observed: { caseId: string; rows: EventRecord[] }[] = [];
  const pending: { caseId: string; rows: EventRecord[]; gate: ReturnType<typeof deferred<EventRecord[]>> }[] = [];
  let calls = 0;
  const spy = vi.spyOn(researchRepository, "listEventsByCase").mockImplementation(async (caseId, options) => {
    const rows = await readEvents(caseId, options);
    observed.push({ caseId, rows });
    if (++calls === 1) return rows;
    const gate = deferred<EventRecord[]>();
    pending.push({ caseId, rows, gate });
    return gate.promise;
  });
  return { observed, pending, spy };
}
async function releaseIndex(pending: ReturnType<typeof deferIndexAfterInitial>["pending"][number]) {
  await act(async () => { pending.gate.resolve(pending.rows); });
}
async function seedEvent(bundle: CaseBundle, title: string, revisionId = bundle.revisions[0].id) {
  return createEvent({ caseId: bundle.caseRecord.id, revisionId, transitNodeRef: null,
    title, datePrecision: "unknown", startDate: null, endDate: null, feedback: "unreviewed",
    tags: ["合成索引"], sourceRefs: ["来源甲", "来源乙"], body: "合成原正文" });
}
function switchContext(view: ReturnType<typeof render>, bundle: CaseBundle, revisionId = bundle.revisions[0].id, eventId?: string) {
  act(() => {
    navigate(`/cases/${bundle.caseRecord.id}/revisions/${revisionId}?view=research${eventId ? `&event=${eventId}` : ""}`, { scroll: false, focus: false });
    view.rerender(<main><ChartPage caseId={bundle.caseRecord.id} revisionId={revisionId} /></main>);
  });
}
async function expectSelected(title: string) {
  await waitFor(() => expect(screen.getByRole("article", { name: `事件 ${title}` }).classList.contains("event-card--selected")).toBe(true));
  expectNoMissingWarning();
}

describe("ChartPage committed research-event index", () => {
  it("先读取空父索引，再通过真实表单创建新 ID，无整页刷新也精确定位", async () => {
    const bundle = await makeCase();
    const before = await caseRepository.getCase(bundle.caseRecord.id);
    const { observed } = observeIndex();
    const writes = vi.spyOn(researchRepository, "createEvent");
    openCase(bundle);
    await waitInitialIndex(observed);
    expect(observed[0].rows).toEqual([]);
    submitEvent("新建后立即定位");
    const record = await savedEvent(bundle.caseRecord.id, "新建后立即定位");
    expect(writes).toHaveBeenCalledTimes(1);
    expect(record).toMatchObject({ caseId: bundle.caseRecord.id, revisionId: bundle.revisions[0].id, body: "合成事件正文" });
    expect(new URL(window.location.href).searchParams.get("event")).toBe(record.id);
    await waitFor(() => expect(screen.getByRole("article", { name: "事件 新建后立即定位" }).classList.contains("event-card--selected")).toBe(true));
    expectNoMissingWarning();
    expect(observed.some(snapshot => snapshot.rows.some(row => row.id === record.id))).toBe(true);
    expect(await caseRepository.getCase(bundle.caseRecord.id)).toEqual(before);
  });

  it("提交后慢读取明确待核对，索引回来前不信任新 ID，也不误报不存在", async () => {
    const bundle = await makeCase();
    const { observed, pending } = deferIndexAfterInitial();
    const writes = vi.spyOn(researchRepository, "createEvent");
    openCase(bundle);
    await waitInitialIndex(observed);
    submitEvent("慢索引新事件");
    const record = await savedEvent(bundle.caseRecord.id, "慢索引新事件");
    await waitFor(() => expect(pending).toHaveLength(1));
    expect(screen.getByText("正在读取事件索引")).toBeTruthy();
    expectNoMissingWarning();
    expect(document.querySelector(".event-card--selected")).toBeNull();
    expect(new URL(window.location.href).searchParams.get("event")).toBe(record.id);
    await releaseIndex(pending[0]);
    await expectSelected(record.title);
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it("连续真实创建后，较旧索引响应不得覆盖新 ID 的精确定位", async () => {
    const bundle = await makeCase();
    const { observed, pending } = deferIndexAfterInitial();
    const writes = vi.spyOn(researchRepository, "createEvent");
    openCase(bundle);
    await waitInitialIndex(observed);
    submitEvent("连续创建一");
    const first = await savedEvent(bundle.caseRecord.id, "连续创建一");
    await waitFor(() => expect(pending).toHaveLength(1));
    submitEvent("连续创建二");
    const second = await savedEvent(bundle.caseRecord.id, "连续创建二");
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0].rows.map(row => row.id)).toEqual([first.id]);
    expect(pending[1].rows.map(row => row.id).sort()).toEqual([first.id, second.id].sort());
    await releaseIndex(pending[1]);
    await expectSelected(second.title);
    await releaseIndex(pending[0]);
    await expectSelected(second.title);
    expect(new URL(window.location.href).searchParams.get("event")).toBe(second.id);
    expect(writes).toHaveBeenCalledTimes(2);
    expect(await readEvents(bundle.caseRecord.id)).toHaveLength(2);
  });

  it("成功提交后索引读取失败保留已写记录，重试只读索引且不再次创建", async () => {
    const bundle = await makeCase();
    const { observed, pending } = deferIndexAfterInitial();
    const writes = vi.spyOn(researchRepository, "createEvent");
    openCase(bundle);
    await waitInitialIndex(observed);
    submitEvent("读取失败但已写入");
    const record = await savedEvent(bundle.caseRecord.id, "读取失败但已写入");
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => { pending[0].gate.reject(new Error("合成索引读取失败")); });
    await screen.findByRole("button", { name: "重试事件索引" });
    expect(screen.getAllByText(/事件索引暂不可用/).length).toBeGreaterThan(0);
    expectNoMissingWarning();
    expect(document.querySelector(".event-card--selected")).toBeNull();
    expect(await readEvents(bundle.caseRecord.id)).toEqual([record]);
    fireEvent.click(screen.getByRole("button", { name: "重试事件索引" }));
    await waitFor(() => expect(pending).toHaveLength(2));
    await releaseIndex(pending[1]);
    await expectSelected(record.title);
    expect(writes).toHaveBeenCalledTimes(1);
  });

  it.each(["missing", "other_case", "other_revision", "mixed_case_index", "invalid_index_id", "read_error"] as const)(
    "%s 仍拒绝精确定位，不放宽归属或把读取错误当成不存在", async (kind) => {
      let bundle = await makeCase();
      const originalRevision = bundle.revisions[0].id;
      let eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
      let wrongRecord: EventRecord | undefined;
      if (kind === "other_case" || kind === "mixed_case_index") {
        wrongRecord = await seedEvent(await makeCase("其他合成案例"), "其他案例事件");
        eventId = wrongRecord.id;
      } else if (kind === "other_revision") {
        bundle = await caseRepository.addRevision(bundle.caseRecord.id, await calculateChart({ ...input, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE));
        const next = bundle.revisions.find(revision => revision.id !== originalRevision)!;
        eventId = (await seedEvent(bundle, "其他修订事件", next.id)).id;
      } else if (kind === "invalid_index_id") {
        wrongRecord = { ...await seedEvent(bundle, "无效索引 ID"), id: "invalid/id" };
      }
      if (kind === "mixed_case_index" || kind === "invalid_index_id") vi.spyOn(researchRepository, "listEventsByCase").mockResolvedValue([wrongRecord!]);
      else if (kind === "read_error") vi.spyOn(researchRepository, "listEventsByCase").mockRejectedValue(new Error("合成读取失败"));
      const writes = vi.spyOn(researchRepository, "createEvent");
      openCase(bundle, eventId, originalRevision);
      const alert = await screen.findByRole("alert", { name: "地址或深链参数未全部接受" });
      expect(alert.textContent).toContain(kind === "other_revision" ? "属于其他 Revision"
        : ["mixed_case_index", "invalid_index_id", "read_error"].includes(kind) ? "索引暂不可用" : "记录不存在");
      expect(document.querySelector(".event-card--selected")).toBeNull();
      if (["mixed_case_index", "invalid_index_id", "read_error"].includes(kind)) expectNoMissingWarning();
      expect(writes).not.toHaveBeenCalled();
    }
  );

  it.each(["resolve", "reject"] as const)("切换案例后忽略旧索引的 %s，不覆盖新上下文", async (outcome) => {
    const first = await makeCase("合成案例一"), second = await makeCase("合成案例二");
    const secondEvent = await seedEvent(second, "第二案例精确事件");
    const { observed, pending } = deferIndexAfterInitial();
    const view = openCase(first);
    await waitInitialIndex(observed);
    submitEvent("第一案例晚响应");
    await savedEvent(first.caseRecord.id, "第一案例晚响应");
    await waitFor(() => expect(pending).toHaveLength(1));
    switchContext(view, second, second.revisions[0].id, secondEvent.id);
    await waitFor(() => expect(pending).toHaveLength(2));
    await releaseIndex(pending[1]);
    await expectSelected(secondEvent.title);
    if (outcome === "resolve") await releaseIndex(pending[0]);
    else await act(async () => { pending[0].gate.reject(new Error("旧案例晚失败")); });
    await expectSelected(secondEvent.title);
    expect(window.location.pathname).toContain(second.caseRecord.id);
    expect(new URL(window.location.href).searchParams.get("event")).toBe(secondEvent.id);
  });

  it("切换修订后，旧快照不能覆盖新修订随后创建的事件", async () => {
    let bundle = await makeCase();
    const firstRevision = bundle.revisions[0].id;
    bundle = await caseRepository.addRevision(bundle.caseRecord.id, await calculateChart({ ...input, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE));
    const secondRevision = bundle.revisions.find(revision => revision.id !== firstRevision)!.id;
    const { observed, pending } = deferIndexAfterInitial();
    const view = openCase(bundle, undefined, firstRevision);
    await waitInitialIndex(observed);
    submitEvent("原修订新事件");
    await savedEvent(bundle.caseRecord.id, "原修订新事件");
    await waitFor(() => expect(pending).toHaveLength(1));
    const secondEvent = await seedEvent(bundle, "新修订精确事件", secondRevision);
    expect(pending[0].rows.some(row => row.id === secondEvent.id)).toBe(false);
    switchContext(view, bundle, secondRevision, secondEvent.id);
    await waitFor(() => expect(pending).toHaveLength(2));
    await releaseIndex(pending[1]);
    await expectSelected(secondEvent.title);
    await releaseIndex(pending[0]);
    await expectSelected(secondEvent.title);
    expect(window.location.pathname).toContain(secondRevision);
  });

  it.each(["case", "revision"] as const)("创建调用晚返回且已切换 %s，不跳回旧事件或显示旧保存成功", async (target) => {
    let bundle = await makeCase("晚提交原案例");
    const originalRevision = bundle.revisions[0].id;
    const other = target === "case" ? await makeCase("晚提交目标案例")
      : await caseRepository.addRevision(bundle.caseRecord.id, await calculateChart({ ...input, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE));
    const otherRevision = target === "case" ? other.revisions[0].id : other.revisions.find(revision => revision.id !== originalRevision)!.id;
    if (target === "revision") bundle = other;
    const { observed } = observeIndex();
    const returned = deferred<EventRecord>();
    let stored: EventRecord | undefined;
    const writes = vi.spyOn(researchRepository, "createEvent").mockImplementation(async payload => {
      stored = await createEvent(payload);
      return returned.promise;
    });
    const view = openCase(bundle, undefined, originalRevision);
    await waitInitialIndex(observed);
    submitEvent("晚返回原修订事件");
    await waitFor(() => expect(stored).toBeDefined());
    switchContext(view, other, otherRevision);
    await screen.findByRole("region", { name: "记录研究事件" });
    await act(async () => { returned.resolve(stored!); });
    await waitFor(() => expect((screen.getByRole("button", { name: "添加事件" }) as HTMLButtonElement).disabled).toBe(false));
    expect(window.location.pathname).toContain(otherRevision);
    expect(new URL(window.location.href).searchParams.get("event")).toBeNull();
    expect(screen.queryByText("事件已链接到当前案例与修订。")).toBeNull();
    expect(document.querySelector(".event-card--selected")).toBeNull();
    expect(writes).toHaveBeenCalledTimes(1);
    expect((await readEvents(bundle.caseRecord.id))[0]).toMatchObject({ id: stored!.id, revisionId: originalRevision });
  });

  it("来源前置拒绝后取消编辑，不失效索引、不更新记录也不新建事件", async () => {
    const bundle = await makeCase();
    const original = await seedEvent(bundle, "取消前原事件");
    const { observed, spy } = observeIndex();
    const creates = vi.spyOn(researchRepository, "createEvent"), updates = vi.spyOn(researchRepository, "updateEvent");
    openCase(bundle);
    await waitInitialIndex(observed);
    fireEvent.click(screen.getByRole("button", { name: "编辑事件" }));
    const editor = within(screen.getByRole("region", { name: "编辑研究事件" }));
    fireEvent.change(editor.getByRole("textbox", { name: "来源引用" }), { target: { value: "重复来源" } });
    fireEvent.change(editor.getByRole("textbox", { name: "来源引用 2" }), { target: { value: " 重复来源 " } });
    fireEvent.click(editor.getByRole("button", { name: "保存事件修改" }));
    await screen.findByText(/来源引用未保存/);
    fireEvent.click(editor.getByRole("button", { name: "取消编辑" }));
    expect(updates).not.toHaveBeenCalled();expect(creates).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await readEvents(bundle.caseRecord.id)).toEqual([original]);
    expect(screen.queryByText("事件记录已更新。")).toBeNull();
  });

  it("仓储调用抛错仍保留未知结果锁，不刷新索引、不制造成功记录", async () => {
    const bundle = await makeCase();
    const { observed, spy } = observeIndex();
    const writes = vi.spyOn(researchRepository, "createEvent").mockRejectedValueOnce(new Error("合成调用异常"));
    openCase(bundle);
    await waitInitialIndex(observed);
    submitEvent("不得误报成功");
    await screen.findByRole("heading", { name: "写入结果未知，研究日志已锁定" });
    expect(spy).toHaveBeenCalledTimes(1);expect(writes).toHaveBeenCalledTimes(1);
    expect(new URL(window.location.href).searchParams.get("event")).toBeNull();
    expect(screen.queryByText("事件已链接到当前案例与修订。")).toBeNull();
    expect(await readEvents(bundle.caseRecord.id)).toEqual([]);
  });
});
