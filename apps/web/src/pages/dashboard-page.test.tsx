import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SCHEMA_VERSION,
  migrateLegacySavedViewRecordV1,
  type BirthInput
} from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { createDefaultResearchQuery } from "@hakimi/research-query";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { DashboardPage } from "./dashboard-page";

const exactInput: BirthInput = {
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
  ...exactInput,
  time: null,
  timePrecision: "unknown_hour",
  sourceNote: "首页候选组测试"
};

beforeEach(async () => {
  await caseRepository.clearAll();
});

afterEach(async () => {
  await caseRepository.clearAll();
});

describe("DashboardPage", () => {
  it("把最近候选组作为研究记录打开，同时保留正式命盘的独立入口", async () => {
    const chart = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
    const formal = await caseRepository.createCase({ alias: "正式首页盘", calculated: chart });
    const candidateSet = await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
    const createdCandidate = await caseRepository.createCandidateSet({ alias: "首页待考", candidateSet });
    const candidate = { ...createdCandidate, updatedAt: "2099-08-01T00:00:00.000Z" };
    await caseRepository.database.candidateSets.put(candidate);
    const savedView = await researchRepository.createSavedView({
      name: "最近事业复盘",
      query: { ...createDefaultResearchQuery("cases"), text: "事业" }
    });

    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "首页待考" })).toBeTruthy();
    expect(screen.getByText("八字 · 时辰待考", { selector: ".status-pill" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /打开候选组/ }).getAttribute("href"))
      .toBe(`/candidate-sets/${candidate.id}`);
    expect(screen.getByText("2 条本地记录")).toBeTruthy();
    expect(screen.getByText(/13 个候选 · 时辰待考/)).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "研究快捷入口" })).toBeTruthy();
    expect(screen.getByText("最近保存视图")).toBeTruthy();
    expect(screen.getByRole("link", { name: /最近事业复盘/ }).getAttribute("href"))
      .toBe(`/cases/research?view=${savedView.id}`);
    expect(screen.getByRole("link", { name: /CSV 批量导入/ }).getAttribute("href")).toBe("/cases");
    expect(screen.getByRole("link", { name: /完整备份与恢复/ }).getAttribute("href")).toBe("/settings/data");
    expect(screen.queryByRole("img", { name: /72/ })).toBeNull();
    expect(screen.queryByText("紫微斗数")).toBeNull();
    expect(screen.queryByText("西洋星盘")).toBeNull();
    expect(screen.queryByText(/切换体系/)).toBeNull();

    const recentFormalAlias = screen.getByText("正式首页盘");
    expect(recentFormalAlias.closest("a")?.getAttribute("href"))
      .toBe(`/cases/${formal.caseRecord.id}/revisions/${formal.caseRecord.latestRevisionId}`);
    expect(await caseRepository.listCases()).toHaveLength(1);
  });

  it("空工作台同时提供新建、演示和 CSV 导入入口", async () => {
    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "先建立第一张可复算的研究样本" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "从空白开始" }).getAttribute("href")).toBe("/new");
    expect(screen.getByRole("link", { name: "载入演示值" }).getAttribute("href")).toBe("/new?demo=1");
    expect(screen.getByRole("link", { name: "导入 CSV" }).getAttribute("href")).toBe("/cases");
    expect(await screen.findByText("在专业研究检索中保存常用条件后，会出现在这里。")).toBeTruthy();
  });

  it("旧保存视图只显示待审核迁移并保持精确 UUID 路由", async () => {
    const legacy = {
      schemaVersion: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      name: "旧事业视图",
      query: "事业",
      filters: { arbitrary: { includeArchived: true } },
      sort: { field: "updatedAt" as const, direction: "desc" as const },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    };
    await caseRepository.database.savedViews.put(migrateLegacySavedViewRecordV1(legacy));

    render(<DashboardPage />);

    expect(await screen.findByText(/八字 · 待审核迁移/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /旧事业视图/ }).getAttribute("href"))
      .toBe(`/cases/research?view=${legacy.id}`);
  });

  it("最近视图摘要不一致时单独失败关闭而不遮蔽工作台", async () => {
    const view = await researchRepository.createSavedView({
      name: "不得近似恢复",
      query: createDefaultResearchQuery("cases")
    });
    const raw = await caseRepository.database.savedViews.get(view.id);
    if (!raw || raw.state !== "ready") throw new Error("expected ready SavedView fixture");
    await caseRepository.database.savedViews.put({
      ...raw,
      query: { ...raw.query, text: "摘要外改写" }
    } as typeof raw);

    render(<DashboardPage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("没有执行或近似恢复任何查询");
    expect(screen.queryByRole("link", { name: /不得近似恢复/ })).toBeNull();
    expect(screen.getByRole("heading", { name: "等待第一条记录" })).toBeTruthy();
  });
});
