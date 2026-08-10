import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BirthInput } from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { createDefaultResearchQuery } from "@hakimi/research-query";
import { CaseLibraryPage } from "./case-library-page";

const input: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

const unknownHourInput: BirthInput = {
  ...input,
  time: null,
  timePrecision: "unknown_hour",
  sourceNote: "出生时辰待访谈复核"
};

async function createFormalCase(alias: string, tags: string[] = []) {
  return caseRepository.createCase({
    alias,
    tags,
    calculated: await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE),
    duplicateGuard: "allow"
  });
}

async function createCandidateSet(alias: string, tags: string[] = []) {
  return caseRepository.createCandidateSet({
    alias,
    tags,
    candidateSet: await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE),
    duplicateGuard: "allow"
  });
}

beforeEach(async () => {
  await caseRepository.clearAll();
});

afterEach(async () => {
  await caseRepository.clearAll();
});

describe("CaseLibraryPage", () => {
  it("通过中文研究笔记检索当前 scope，并保存和恢复关键词视图", async () => {
    const target = await createFormalCase("甲案例", ["样本"]);
    await createFormalCase("乙案例", ["对照"]);
    const trashed = await createFormalCase("回收站案例");
    await researchRepository.createResearchNote({
      caseId: target.caseRecord.id,
      anchor: { kind: "case" },
      body: "职业迁移时间需要复核。",
      tags: ["事业"],
      sourceRefs: [],
      lifecycle: "active"
    });
    await researchRepository.createResearchNote({
      caseId: trashed.caseRecord.id,
      anchor: { kind: "case" },
      body: "职业迁移回收站命中。",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    await caseRepository.trashCase(trashed.caseRecord.id);

    render(<CaseLibraryPage />);
    expect(await screen.findByText("甲案例")).toBeTruthy();
    expect(screen.getByText("乙案例")).toBeTruthy();
    expect(screen.queryByText("回收站案例")).toBeNull();

    const search = screen.getByLabelText("搜索案例与研究笔记");
    fireEvent.change(search, { target: { value: "职业　　迁移" } });
    await waitFor(() => expect(screen.queryByText("乙案例")).toBeNull());
    expect(screen.getByText("甲案例")).toBeTruthy();
    expect(screen.queryByText("回收站案例")).toBeNull();
    expect(screen.getByText("1 条笔记")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("主体类型"), { target: { value: "cases" } });
    fireEvent.change(screen.getByPlaceholderText("视图名称（可选）"), { target: { value: "事业复核" } });
    fireEvent.click(screen.getByRole("button", { name: "保存当前查询" }));
    expect(await screen.findByText("已保存视图“事业复核”。")).toBeTruthy();

    fireEvent.change(search, { target: { value: "" } });
    await waitFor(() => expect(screen.getByText("乙案例")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "事业复核" }));
    await waitFor(() => expect(search).toHaveProperty("value", "职业 迁移"));
    expect(await screen.findByText("已恢复视图“事业复核”。")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "回收站" }));
    expect(await screen.findByText("回收站案例")).toBeTruthy();
    expect(screen.queryByText("甲案例")).toBeNull();
  });

  it("简单视图显式保存主体类型，恢复候选组视图时不会扩展到正式命盘", async () => {
    await createFormalCase("共同关键词正式盘");
    await createCandidateSet("共同关键词候选组");

    render(<CaseLibraryPage />);
    expect(await screen.findByText("共同关键词正式盘")).toBeTruthy();
    expect(screen.getByRole("button", { name: "保存当前查询" })).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText("搜索案例与研究笔记"), { target: { value: "共同关键词" } });
    fireEvent.change(screen.getByLabelText("主体类型"), { target: { value: "candidate_sets" } });
    await waitFor(() => expect(screen.queryByText("共同关键词正式盘")).toBeNull());
    expect(screen.getByText("共同关键词候选组")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("视图名称（可选）"), { target: { value: "候选组关键词" } });
    fireEvent.click(screen.getByRole("button", { name: "保存当前查询" }));
    expect(await screen.findByText("已保存视图“候选组关键词”。")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("主体类型"), { target: { value: "all" } });
    await waitFor(() => expect(screen.getByText("共同关键词正式盘")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "候选组关键词" }));
    await waitFor(() => expect(screen.getByLabelText("主体类型")).toHaveProperty("value", "candidate_sets"));
    expect(screen.queryByText("共同关键词正式盘")).toBeNull();
    expect(screen.getByText("共同关键词候选组")).toBeTruthy();
    expect((await researchRepository.listSavedViews())[0]).toMatchObject({ state: "ready", query: { scope: "candidate_sets" } });
  });

  it("高级保存视图只提供专业检索入口，不会在案例库静默丢弃命理条件", async () => {
    const base = createDefaultResearchQuery("cases");
    const saved = await researchRepository.createSavedView({
      name: "甲日主研究",
      query: { ...base, text: "事业", dayMasters: ["甲"] },
    });

    render(<CaseLibraryPage />);

    const professionalLink = await screen.findByRole("link", { name: "甲日主研究 · 专业" });
    expect(professionalLink.getAttribute("href")).toBe(`/cases/research?view=${saved.id}`);
    expect(screen.queryByRole("button", { name: "甲日主研究" })).toBeNull();
    expect(screen.getByLabelText("搜索案例与研究笔记")).toHaveProperty("value", "");
  });

  it("正式案例与候选组都可收藏，并由收藏 scope 精确筛选", async () => {
    const formal = await createFormalCase("常用正式盘");
    const candidate = await createCandidateSet("常用候选组");
    await createFormalCase("普通案例");

    render(<CaseLibraryPage />);
    expect(await screen.findByText("常用正式盘")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "收藏案例 常用正式盘" }));
    expect(await screen.findByText("已收藏案例“常用正式盘”。")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "收藏候选组 常用候选组" }));
    expect(await screen.findByText("已收藏候选组“常用候选组”。")).toBeTruthy();

    expect((await caseRepository.getCase(formal.caseRecord.id))?.caseRecord.favorite).toBe(true);
    expect((await caseRepository.getCandidateSet(candidate.id))?.favorite).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "收藏" }));
    expect(await screen.findByText("常用正式盘")).toBeTruthy();
    expect(screen.getByText("常用候选组")).toBeTruthy();
    expect(screen.queryByText("普通案例")).toBeNull();
    expect(screen.getByRole("button", { name: "取消收藏案例 常用正式盘" }).getAttribute("aria-pressed")).toBe("true");

    const favoriteSearch = screen.getByLabelText("搜索案例与研究笔记");
    fireEvent.change(favoriteSearch, { target: { value: "常用候选组" } });
    await waitFor(() => expect(screen.queryByText("常用正式盘")).toBeNull());
    expect(screen.getByText("常用候选组")).toBeTruthy();
    fireEvent.change(favoriteSearch, { target: { value: "普通案例" } });
    expect(await screen.findByText("没有匹配的研究记录")).toBeTruthy();
    fireEvent.change(favoriteSearch, { target: { value: "" } });

    const favoritesScope = screen.getByRole("button", { name: "收藏" });
    fireEvent.click(await screen.findByRole("button", { name: "取消收藏案例 常用正式盘" }));
    expect(await screen.findByText("已取消收藏案例“常用正式盘”。")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("常用正式盘")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(favoritesScope));
    expect((await caseRepository.getCase(formal.caseRecord.id))?.caseRecord.favorite).toBe(false);
  });

  it("以内联可访问编辑区更新两类记录的别名、标签和备注，并把错误焦点留在字段", async () => {
    const formal = await createFormalCase("待编辑案例", ["旧标签"]);
    const candidate = await createCandidateSet("待编辑候选组");

    render(<CaseLibraryPage />);
    expect(await screen.findByText("待编辑案例")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "编辑案例 待编辑案例" }));

    const formalEditor = screen.getByRole("region", { name: "编辑“待编辑案例”" });
    const aliasInput = within(formalEditor).getByLabelText(/案例别名/);
    expect(document.activeElement).toBe(aliasInput);
    fireEvent.change(aliasInput, { target: { value: "" } });
    fireEvent.click(within(formalEditor).getByRole("button", { name: "保存资料" }));
    expect(await within(formalEditor).findByText("案例别名不能为空。")).toBeTruthy();
    expect(document.activeElement).toBe(aliasInput);

    fireEvent.change(aliasInput, { target: { value: "已编辑案例" } });
    fireEvent.change(within(formalEditor).getByLabelText("标签"), { target: { value: "复核，教学" } });
    fireEvent.change(within(formalEditor).getByLabelText("案例备注"), { target: { value: "只改研究元数据。" } });
    fireEvent.click(within(formalEditor).getByRole("button", { name: "保存资料" }));
    expect(await screen.findByText("已更新案例“已编辑案例”的别名、标签和备注。")).toBeTruthy();
    const updatedFormal = await caseRepository.getCase(formal.caseRecord.id);
    expect(updatedFormal?.caseRecord).toMatchObject({
      alias: "已编辑案例",
      tags: ["复核", "教学"],
      notes: "只改研究元数据。"
    });
    expect(updatedFormal?.revisions).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "编辑候选组 待编辑候选组" }));
    const candidateEditor = screen.getByRole("region", { name: "编辑“待编辑候选组”" });
    fireEvent.change(within(candidateEditor).getByLabelText(/案例别名/), { target: { value: "已编辑候选组" } });
    fireEvent.change(within(candidateEditor).getByLabelText("标签"), { target: { value: "访谈" } });
    fireEvent.change(within(candidateEditor).getByLabelText("案例备注"), { target: { value: "候选组元数据。" } });
    fireEvent.click(within(candidateEditor).getByRole("button", { name: "保存资料" }));
    expect(await screen.findByText("已更新候选组“已编辑候选组”的别名、标签和备注。")).toBeTruthy();
    expect(await caseRepository.getCandidateSet(candidate.id)).toMatchObject({
      alias: "已编辑候选组",
      tags: ["访谈"],
      notes: "候选组元数据。"
    });
  });

  it("移入回收站后从普通范围消失，可在回收站检索并恢复", async () => {
    const target = await createFormalCase("待恢复案例", ["恢复测试"]);
    await researchRepository.createResearchNote({
      caseId: target.caseRecord.id,
      anchor: { kind: "case" },
      body: "回收站检索线索",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });

    render(<CaseLibraryPage />);
    expect(await screen.findByText("待恢复案例")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "永久删除案例 待恢复案例" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "移入回收站案例 待恢复案例" }));
    expect(await screen.findByText("已将案例“待恢复案例”移入回收站，可在回收站恢复。")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("待恢复案例")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "全部" })));

    fireEvent.click(screen.getByRole("button", { name: "回收站" }));
    expect(await screen.findByText("待恢复案例")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("搜索案例与研究笔记"), { target: { value: "回收站检索" } });
    expect(await screen.findByText("待恢复案例")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "恢复案例 待恢复案例" }));
    expect(await screen.findByText("已恢复案例“待恢复案例”。")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("待恢复案例")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "回收站" })));
    expect((await caseRepository.getCase(target.caseRecord.id))?.caseRecord.deletedAt).toBeNull();
  });

  it("永久删除只从回收站发起，先聚焦明确的不可恢复确认，并分别级联两类记录", async () => {
    const formal = await createFormalCase("待永久删除案例");
    const candidate = await createCandidateSet("待永久删除候选组");
    await researchRepository.createResearchNote({
      caseId: formal.caseRecord.id,
      anchor: { kind: "case" },
      body: "随案例删除",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    await caseRepository.trashCase(formal.caseRecord.id);
    await caseRepository.trashCandidateSet(candidate.id);

    render(<CaseLibraryPage />);
    expect(await screen.findByText("案例库还是空的")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /永久删除/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "回收站" }));
    expect(await screen.findByText("待永久删除案例")).toBeTruthy();

    const deleteFormal = screen.getByRole("button", { name: "永久删除案例 待永久删除案例" });
    fireEvent.click(deleteFormal);
    const confirmGroup = screen.getByRole("group", { name: "永久删除“待永久删除案例”？" });
    expect(within(confirmGroup).getByText(/此操作不可恢复/)).toBeTruthy();
    const confirmFormal = within(confirmGroup).getByRole("button", { name: "永久删除案例" });
    expect(document.activeElement).toBe(confirmFormal);
    fireEvent.keyDown(confirmGroup, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(deleteFormal));

    fireEvent.click(deleteFormal);
    fireEvent.click(screen.getByRole("button", { name: "永久删除案例" }));
    expect(await screen.findByText("已永久删除案例“待永久删除案例”及其修订、笔记和事件；此操作不可恢复。")).toBeTruthy();
    expect(await caseRepository.getCase(formal.caseRecord.id)).toBeNull();

    fireEvent.click(await screen.findByRole("button", { name: "永久删除候选组 待永久删除候选组" }));
    fireEvent.click(screen.getByRole("button", { name: "永久删除候选组" }));
    expect(await screen.findByText("已永久删除候选组“待永久删除候选组”及其笔记和事件；此操作不可恢复。")).toBeTruthy();
    expect(await caseRepository.getCandidateSet(candidate.id)).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "回收站" })));
  });
});
