import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput, CaseBundle } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { LOCAL_READING_FEEDBACK_TAG, LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { PersonProfilePage } from "./person-profile-page";

const input: BirthInput = { schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false, location: { label: "北京", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "合成档案" };
async function createPerson(alias: string) {
  return caseRepository.createCase({ alias, tags: ["合成资料"], calculated: await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE), duplicateGuard: "allow" });
}
async function saveText(bundle: CaseBundle, text: string, extraTags: string[] = []) {
  return researchRepository.createResearchNote({ caseId: bundle.caseRecord.id, anchor: { kind: "revision", revisionId: bundle.caseRecord.latestRevisionId },
    body: text, tags: [LOCAL_READING_SNAPSHOT_TAG, ...extraTags], sourceRefs: [], lifecycle: "active" });
}
beforeEach(async () => { await caseRepository.clearAll(); });
afterEach(async () => { cleanup(); vi.restoreAllMocks(); await caseRepository.clearAll(); });

describe("个人档案", () => {
  it("按本人资料关联修订、最新及历史报告，分别打开当前阅读和保存原文", async () => {
    const first = await createPerson("合成人甲");
    const old = await saveText(first, "第一版保存的原文与条件。");
    const updated = await caseRepository.addRevision(first.caseRecord.id, await calculateChart({ ...input, time: "09:20" }, WORKING_DEFAULT_RULE_PROFILE));
    const latest = await saveText(updated, "第二版保存的原文与条件。");
    const other = await createPerson("合成人乙");
    await saveText(other, "其他人的报告不得出现。");
    await researchRepository.createResearchNote({ caseId: first.caseRecord.id, anchor: { kind: "revision", revisionId: updated.caseRecord.latestRevisionId },
      body: "这只是反馈", tags: [LOCAL_READING_FEEDBACK_TAG], sourceRefs: [], lifecycle: "active" });
    render(<PersonProfilePage caseId={first.caseRecord.id} />);
    expect(await screen.findByRole("heading", { name: "合成人甲的档案" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "返回档案列表" }).getAttribute("href")).toBe("/reports");
    expect(screen.getByRole("link", { name: "全部资料管理" }).getAttribute("href")).toBe("/cases");
    expect(screen.getByRole("link", { name: "继续当前阅读" }).getAttribute("href")).toBe(`/cases/${first.caseRecord.id}/revisions/${updated.caseRecord.latestRevisionId}`);
    expect(screen.getByRole("link", { name: "按第 1 次资料阅读" }).getAttribute("href")).toContain(first.caseRecord.latestRevisionId);
    expect(screen.getByRole("link", { name: "按第 2 次资料阅读" }).getAttribute("href")).toContain(updated.caseRecord.latestRevisionId);
    expect(screen.getByText("北京")).toBeTruthy();
    expect(screen.getByText("Asia/Shanghai")).toBeTruthy();
    fireEvent.click(screen.getByText("打开保存时原文 · 最新报告"));
    expect(await screen.findByText("第二版保存的原文与条件。")).toBeTruthy();
    fireEvent.click(screen.getByText("更早的 1 份保存报告"));
    fireEvent.click(await screen.findByText("打开保存时原文 · 历史报告"));
    expect(await screen.findByText("第一版保存的原文与条件。")).toBeTruthy();
    expect(screen.queryByText("其他人的报告不得出现。")).toBeNull();
    expect(screen.queryByText("这只是反馈")).toBeNull();
    expect((await researchRepository.getResearchNote(old.id))?.body).toBe(old.body);
    expect((await researchRepository.getResearchNote(latest.id))?.body).toBe(latest.body);
  });

  it("报告读取失败保留资料入口，显示失败而非空报告，重试可恢复", async () => {
    const person = await createPerson("读取失败样例");
    await saveText(person, "重试后可读的保存原文。");
    vi.spyOn(researchRepository, "listResearchNotesByCase").mockRejectedValueOnce(new Error("本机报告读取暂时失败"));
    render(<PersonProfilePage caseId={person.caseRecord.id} />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "本机报告读取暂时失败");
    expect(screen.getByRole("link", { name: "继续当前阅读" })).toBeTruthy();
    expect(screen.queryByText(/还没有保存报告/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "重新读取" }));
    expect(await screen.findByText("打开保存时原文 · 最新报告")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("真实移入回收站后重新读取立即移除旧资料及保存报告", async () => {
    const person = await createPerson("将被删除的人");
    await saveText(person, "删除后不得继续显示的原文。");
    render(<PersonProfilePage caseId={person.caseRecord.id} />);
    expect(await screen.findByRole("heading", { name: "将被删除的人的档案" })).toBeTruthy();
    await act(async () => { await caseRepository.trashCase(person.caseRecord.id); });
    fireEvent.click(screen.getByRole("button", { name: "重新读取" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "这份档案已移入回收站。请在全部资料管理的回收站恢复后再打开。前往资料管理");
    expect(screen.getByRole("link", { name: "前往资料管理" }).getAttribute("href")).toBe("/cases");
    expect(screen.queryByRole("link", { name: "继续当前阅读" })).toBeNull();
    expect(screen.queryByText("打开保存时原文 · 最新报告")).toBeNull();
  });

  it("不存在和读取失败分别显示，不会带出上一人的资料", async () => {
    const person = await createPerson("路由切换前的人");
    const view = render(<PersonProfilePage caseId={person.caseRecord.id} />);
    expect(await screen.findByRole("heading", { name: "路由切换前的人的档案" })).toBeTruthy();
    view.rerender(<PersonProfilePage caseId="11111111-1111-4111-8111-111111111111" />);
    expect(screen.queryByRole("heading", { name: "路由切换前的人的档案" })).toBeNull();
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "这份档案不存在或已从当前浏览器删除，请到全部资料管理核对。");
    vi.spyOn(caseRepository, "getCase").mockRejectedValueOnce(new Error("档案数据库暂不可读"));
    view.rerender(<PersonProfilePage caseId={person.caseRecord.id} />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "档案数据库暂不可读");
    expect(screen.queryByRole("link", { name: "继续当前阅读" })).toBeNull();
  });

  it("拒绝仓库返回另一人的档案，隐藏错绑报告但保留正确报告", async () => {
    const person = await createPerson("归属校验甲"), other = await createPerson("归属校验乙");
    const valid = await saveText(person, "甲自己的原文。");
    const foreign = await saveText(other, "乙的原文不能泄入甲。");
    const readCase = vi.spyOn(caseRepository, "getCase").mockResolvedValueOnce(other);
    const view = render(<PersonProfilePage caseId={person.caseRecord.id} />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "档案与修订的归属不一致，暂未显示。请到全部资料管理核对。");
    expect(screen.queryByText("归属校验乙的档案")).toBeNull();
    readCase.mockRestore();
    vi.spyOn(researchRepository, "listResearchNotesByCase").mockResolvedValue([valid, foreign, { ...foreign, id: crypto.randomUUID(), caseId: person.caseRecord.id }]);
    fireEvent.click(screen.getByRole("button", { name: "重新读取" }));
    expect(await screen.findByRole("heading", { name: "归属校验甲的档案" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("与这份档案或修订不一致");
    expect(screen.getByText("1 份可查看")).toBeTruthy();
    fireEvent.click(screen.getByText("打开保存时原文 · 最新报告"));
    expect(await screen.findByText("甲自己的原文。")).toBeTruthy();
    expect(screen.queryByText("乙的原文不能泄入甲。")).toBeNull();
    view.unmount();
  });

  it("切换档案时忽略上一人的迟到读取结果", async () => {
    const first = await createPerson("迟到甲"), second = await createPerson("当前乙");
    let resolveFirst!: (bundle: CaseBundle) => void;
    const delayed = new Promise<CaseBundle>(resolve => { resolveFirst = resolve; });
    vi.spyOn(caseRepository, "getCase").mockReturnValueOnce(delayed);
    const view = render(<PersonProfilePage caseId={first.caseRecord.id} />);
    view.rerender(<PersonProfilePage caseId={second.caseRecord.id} />);
    expect(await screen.findByRole("heading", { name: "当前乙的档案" })).toBeTruthy();
    await act(async () => { resolveFirst(first); await delayed; });
    expect(screen.queryByRole("heading", { name: "迟到甲的档案" })).toBeNull();
    expect(screen.getByRole("link", { name: "继续当前阅读" }).getAttribute("href")).toContain(second.caseRecord.id);
  });
});
