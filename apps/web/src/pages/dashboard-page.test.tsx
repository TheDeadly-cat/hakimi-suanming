import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SCHEMA_VERSION,
  migrateLegacySavedViewRecordV1,
  type BirthInput,
  type CaseBundle
} from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { createDefaultResearchQuery } from "@hakimi/research-query";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { DashboardPage } from "./dashboard-page";
import { READING_NAVIGATION_STORAGE_KEY } from "../lib/reading-navigation-context";
import { LOCAL_READING_EDITION_VERSION } from "../lib/local-reading-version";
import { READING_EXPLANATION_INDEX_VERSION } from "../lib/reading-explanation-index";
import { MAIN_ROUTE_READING_VERSION } from "../lib/main-route-reading";
import * as mainRouteModule from "../lib/main-route-reading";
import * as monthPreparationModule from "../lib/reading-month-preparation";
import * as routerModule from "../lib/router";

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

function rememberReading(bundle: CaseBundle, overrides: { revisionId?: string; resultHash?: string; ruleProfileDigest?: string } = {}) {
  const revision = bundle.revisions.find(item => item.id === bundle.caseRecord.latestRevisionId)!;
  window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, JSON.stringify({
    version: 1,
    identity: JSON.stringify([bundle.caseRecord.id, overrides.revisionId ?? revision.id,
      overrides.resultHash ?? revision.manifest.resultHash, overrides.ruleProfileDigest ?? revision.manifest.ruleProfileDigest,
      LOCAL_READING_EDITION_VERSION, READING_EXPLANATION_INDEX_VERSION, true]),
    selection: { topic: "wealth", year: 2030, branchId: "forward" },
    presentation: { view: "main", range: "three_years", mainRouteVersion: MAIN_ROUTE_READING_VERSION }
  }));
}

beforeEach(async () => {
  await caseRepository.clearAll();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(async () => {
  await caseRepository.clearAll();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("DashboardPage", () => {
  it("最近更新的候选组保留独立入口，但不冒充已选阅读人物", async () => {
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

    expect(await screen.findByRole("heading", { name: "先选要查看的人" })).toBeTruthy();
    expect(await screen.findByRole("link", { name: /首页待考/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /首页待考/ }).getAttribute("href"))
      .toBe(`/candidate-sets/${candidate.id}`);
    expect(screen.getByText("2 条本地记录")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "继续阅读这份解读" })).toBeNull();
    expect(screen.getByRole("complementary", { name: "研究快捷入口" })).toBeTruthy();
    expect(screen.getByText("最近保存视图")).toBeTruthy();
    expect(screen.getByRole("link", { name: /最近事业复盘/ }).getAttribute("href"))
      .toBe(`/cases/research?view=${savedView.id}`);
    const chooser = screen.getByRole("region", { name: "先选要查看的人" });
    expect(chooser.compareDocumentPosition(screen.getByText("工作台概览与资料统计")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("link", { name: "选择要查看的人" }).classList.contains("primary-action")).toBe(true);
    expect(screen.getAllByRole("link").filter(link => link.classList.contains("primary-action"))).toHaveLength(1);
    fireEvent.click(screen.getByText("资料管理与专业工具"));
    expect(screen.getByRole("link", { name: /CSV 批量导入/ }).getAttribute("href")).toBe("/cases?import=csv");
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

  it("上次明确阅读甲后，乙的编辑或更近更新时间不会替换首页人物", async () => {
    const chart = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
    const personA = await caseRepository.createCase({ alias: "甲的档案", calculated: chart });
    const personB = await caseRepository.createCase({ alias: "乙的档案", calculated: chart });
    rememberReading(personA);
    await caseRepository.updateCaseMetadata(personB.caseRecord.id, { alias: "乙刚编辑的档案", tags: [], notes: "仅修改乙" });
    await caseRepository.database.cases.update(personB.caseRecord.id, { updatedAt: "2099-08-01T00:00:00.000Z" });
    render(<DashboardPage />);

    const selected = await screen.findByRole("region", { name: "甲的档案" });
    expect(within(selected).getByRole("link", { name: "继续阅读这份解读" }).getAttribute("href"))
      .toBe(`/cases/${personA.caseRecord.id}/revisions/${personA.caseRecord.latestRevisionId}`);
    expect(await screen.findByRole("link", { name: /乙刚编辑的档案/ })).toBeTruthy();
    expect(within(selected).queryByText("乙刚编辑的档案")).toBeNull();
  });

  it("同一人物新增资料后仍精确继续上次旧修订，不自动改为最新修订", async () => {
    const chart = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
    const original = await caseRepository.createCase({ alias: "保留阅读位置", calculated: chart });
    rememberReading(original);
    const updated = await caseRepository.addRevision(original.caseRecord.id,
      await calculateChart({ ...exactInput, time: "10:26" }, WORKING_DEFAULT_RULE_PROFILE));
    render(<DashboardPage />);

    const selected = await screen.findByRole("region", { name: "保留阅读位置" });
    const link = within(selected).getByRole("link", { name: "继续阅读这份解读" });
    expect(link.getAttribute("href")).toBe(`/cases/${original.caseRecord.id}/revisions/${original.caseRecord.latestRevisionId}`);
    expect(link.getAttribute("href")).not.toContain(updated.caseRecord.latestRevisionId);
    expect(within(selected).getByText("这是上次查看的旧资料，不会自动切到新资料。")).toBeTruthy();
  });

  it.each([2030, 2045])("首页恢复 %s 年真实阅读管线，进入年度详情保留主线范围且仅按需准备该年月份", async selectedYear => {
    const original = await caseRepository.createCase({ alias: "首页真实管线合成盘", calculated: await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE) });
    rememberReading(original);
    const saved = JSON.parse(window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY)!);
    saved.selection = { topic: "summary", year: selectedYear, branchId: "locked" };
    window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, JSON.stringify(saved));
    const build = vi.spyOn(mainRouteModule, "buildMainRouteReading");
    const navigate = vi.spyOn(routerModule, "navigate").mockImplementation(() => {});
    const createPreparation = monthPreparationModule.createReadingMonthPreparation;
    const allMonths: ReturnType<typeof vi.fn>[] = [];
    const preparedYears: number[] = [];
    vi.spyOn(monthPreparationModule, "createReadingMonthPreparation").mockImplementation((years, prepare) => {
      const preparation = createPreparation(years, year => { preparedYears.push(year); return prepare(year); });
      const all = vi.fn(preparation.all); allMonths.push(all);
      return { ...preparation, all };
    });
    render(<DashboardPage />);
    const action = await screen.findByRole("button", { name: new RegExp(`看 ${selectedYear} 年重点`) }, { timeout: 45_000 });
    const input = build.mock.calls.at(-1)![0];
    const result = build.mock.results.at(-1)!.value as mainRouteModule.MainRouteReading;
    expect(input.revision.id).toBe(original.caseRecord.latestRevisionId);
    expect(input.explanationIndex?.sourceSnapshot.caseId).toBe(original.caseRecord.id);
    expect(new Set(input.explanationIndex!.conclusions.filter(item => item.scope.year === selectedYear && item.scope.level === "year")
      .map(item => item.domain))).toEqual(new Set(["career", "wealth", "relationship"]));
    expect(screen.getByRole("heading", { name: result.headline })).toBeTruthy();
    const card = document.querySelector(".reading-main-route")!;
    expect(card.compareDocumentPosition(document.querySelector(".dashboard-overview-tools")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(document.querySelector(".dashboard-grid")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { name: "读懂命局，看见岁运变化" }).closest("details")!.open).toBe(false);
    expect(result.range.label).toBe(`${selectedYear}—${selectedYear + 2}年`);
    expect(within(card as HTMLElement).getByLabelText("查看范围")).toHaveProperty("value", "three_years");
    expect(result.domainNotes.length).toBeGreaterThanOrEqual(3);
    expect(allMonths.length).toBeGreaterThan(0);
    expect(allMonths.every(all => all.mock.calls.length === 0)).toBe(true);
    expect(new Set(preparedYears)).toEqual(new Set([selectedYear]));
    fireEvent.click(action);
    const selected = JSON.parse(window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY)!);
    expect(selected.identity).toBe(saved.identity);
    expect(selected.selection).toMatchObject({ topic: "summary", year: selectedYear, branchId: "locked" });
    expect(selected.presentation).toMatchObject({ view: "main", range: "three_years", mainRouteVersion: MAIN_ROUTE_READING_VERSION,
      detail: { kind: "year", year: selectedYear } });
    expect(within(card as HTMLElement).getByLabelText("查看范围")).toHaveProperty("value", "three_years");
    expect(within(card as HTMLElement).getByText(`${selectedYear}—${selectedYear + 2}年`, { exact: true })).toBeTruthy();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(`/cases/${original.caseRecord.id}/revisions/${original.caseRecord.latestRevisionId}`);
    expect(screen.queryByRole("button", { name: /保存完整报告|保存.*主线/ })).toBeNull();
    window.sessionStorage.clear();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("synthetic unavailable tab storage"); });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`看 ${selectedYear} 年重点`) }));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toContain("浏览器没有保留这次阅读位置");
  }, 60_000);

  it("切到乙后迟到的甲读取不能覆盖首页当前人物", async () => {
    const chart = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
    const personA = await caseRepository.createCase({ alias: "迟到的甲", calculated: chart });
    const personB = await caseRepository.createCase({ alias: "当前的乙", calculated: chart });
    rememberReading(personA);
    let releaseA!: (value: CaseBundle) => void;
    const delayedA = new Promise<CaseBundle>(resolve => { releaseA = resolve; });
    const getCase = caseRepository.getCase.bind(caseRepository);
    const read = vi.spyOn(caseRepository, "getCase").mockImplementation(id => id === personA.caseRecord.id ? delayedA : getCase(id));
    render(<DashboardPage />);
    await waitFor(() => expect(read).toHaveBeenCalledWith(personA.caseRecord.id));
    rememberReading(personB);
    fireEvent(window, new Event("focus"));
    const selected = await screen.findByRole("region", { name: "当前的乙" });
    await act(async () => { releaseA(personA); await delayedA; });
    expect(within(selected).getByRole("link", { name: "继续阅读这份解读" }).getAttribute("href"))
      .toBe(`/cases/${personB.caseRecord.id}/revisions/${personB.caseRecord.latestRevisionId}`);
    expect(screen.queryByRole("region", { name: "迟到的甲" })).toBeNull();
  });

  it.each(["revision", "result", "profile", "deleted", "malformed"] as const)("失效上下文 %s 要求重选，不能改用最近人物", async reason => {
    const chart = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
    const original = await caseRepository.createCase({ alias: "原先的人", calculated: chart });
    await caseRepository.createCase({ alias: "另一个人", calculated: chart });
    rememberReading(original, reason === "revision" ? { revisionId: crypto.randomUUID() }
      : reason === "result" ? { resultHash: "f".repeat(64) }
        : reason === "profile" ? { ruleProfileDigest: "f".repeat(64) } : {});
    if (reason === "deleted") await caseRepository.trashCase(original.caseRecord.id);
    if (reason === "malformed") window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, "not-json");
    render(<DashboardPage />);

    const selected = await screen.findByRole("region", { name: "先选要查看的人" });
    expect(within(selected).getByText(/上次阅读的资料已不可用/)).toBeTruthy();
    expect(within(selected).getByRole("link", { name: "选择要查看的人" }).getAttribute("href")).toBe("/reports");
    expect(screen.queryByRole("link", { name: "继续阅读这份解读" })).toBeNull();
  });

  it("回到首页时重新核对已删除的人物，撤下旧的继续入口", async () => {
    const original = await caseRepository.createCase({ alias: "后来删除的人", calculated: await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE) });
    rememberReading(original);
    render(<DashboardPage />);
    expect(await screen.findByRole("link", { name: "继续阅读这份解读" })).toBeTruthy();
    await caseRepository.trashCase(original.caseRecord.id);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(screen.queryByRole("link", { name: "继续阅读这份解读" })).toBeNull());
    expect(await screen.findByText(/上次阅读的资料已不可用/)).toBeTruthy();
  });

  it.each(["report", "index", "main-route", "missing-main-route", "hour"] as const)("拒绝 %s 展示范围或版本已经变化的首页续读上下文", async reason => {
    const original = await caseRepository.createCase({ alias: "旧显示版本的人", calculated: await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE) });
    rememberReading(original);
    const saved = JSON.parse(window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY)!);
    const identity = JSON.parse(saved.identity);
    if (reason === "report") identity[4] = "old-report-version";
    if (reason === "index") identity[5] = "old-index-version";
    if (reason === "hour") identity[6] = false;
    if (reason === "main-route") saved.presentation.mainRouteVersion = "old-main-route-version";
    if (reason === "missing-main-route") delete saved.presentation.mainRouteVersion;
    saved.identity = JSON.stringify(identity);
    window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, JSON.stringify(saved));
    render(<DashboardPage />);
    expect(await screen.findByText(/上次阅读的资料已不可用/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "继续阅读这份解读" })).toBeNull();
  });

  it("人物读取失败时保留重选入口，不猜选最近更新的人", async () => {
    const original = await caseRepository.createCase({ alias: "不可读的人", calculated: await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE) });
    rememberReading(original);
    vi.spyOn(caseRepository, "getCase").mockRejectedValueOnce(new Error("read unavailable"));
    render(<DashboardPage />);
    expect(await screen.findByText(/上次阅读的资料已不可用/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "继续阅读这份解读" })).toBeNull();
  });

  it("空工作台首先只提供建立档案的主动作，演示为次动作且CSV留在专业层", async () => {
    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "建立你的第一张命盘" })).toBeTruthy();
    const start = screen.getByRole("link", { name: "建立我的档案" });
    expect(start.getAttribute("href")).toBe("/new");
    expect(screen.getAllByRole("link").filter(link => link.classList.contains("primary-action"))).toEqual([start]);
    expect(screen.getByRole("link", { name: "载入演示值" }).getAttribute("href")).toBe("/new?demo=1");
    expect(screen.getByRole("link", { name: "载入演示值" }).classList.contains("secondary-action")).toBe(true);
    expect(screen.getByRole("link", { name: /CSV/ }).closest("details")!.open).toBe(false);
    expect(start.compareDocumentPosition(screen.getByText("工作台概览与资料统计")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByText("资料管理与专业工具"));
    expect(screen.getByRole("link", { name: /CSV 批量导入/ }).getAttribute("href")).toBe("/cases?import=csv");
    expect(screen.getByRole("link", { name: /CSV/ }).closest("details")!.open).toBe(true);
    expect(await screen.findByText("在专业研究检索中保存常用条件后，会出现在这里。")).toBeTruthy();
  });

  it("案例索引读取失败时首页先显示恢复入口，确认重读为空后才开放首次建档", async () => {
    vi.spyOn(caseRepository, "listResearchSubjectsPage").mockRejectedValueOnce(new Error("synthetic index unavailable"));
    render(<DashboardPage />);
    const unavailable = await screen.findByRole("region", { name: "没有把读取失败解释成空库" });
    expect(unavailable.compareDocumentPosition(screen.getByText("工作台概览与资料统计")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "建立你的第一张命盘" })).toBeNull();
    expect(screen.queryByRole("link", { name: "建立我的档案" })).toBeNull();
    const retry = within(unavailable).getByRole<HTMLButtonElement>("button", { name: "重新读取首页索引" });
    await waitFor(() => expect(retry.disabled).toBe(false));
    fireEvent.click(retry);
    expect(await screen.findByRole("heading", { name: "建立你的第一张命盘" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "建立我的档案" }).getAttribute("href")).toBe("/new");
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
    expect(await screen.findByRole("heading", { name: "等待第一条记录" })).toBeTruthy();
  });

  it("存在本地记录但从未确认完整备份时显示备份健康警告", async () => {
    const chart = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
    await caseRepository.createCase({ alias: "待备份盘", calculated: chart });

    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "备份记录" })).toBeTruthy();
    expect(screen.getByText("尚未确认完整备份")).toBeTruthy();
    expect(screen.getByRole("link", { name: /导出完整备份/ }).getAttribute("href")).toBe("/settings/data");
  });

  it("已确认完整备份后显示上次备份时间而非警告", async () => {
    const chart = await calculateChart(exactInput, WORKING_DEFAULT_RULE_PROFILE);
    await caseRepository.createCase({ alias: "已备份盘", calculated: chart });
    window.localStorage.setItem(
      "hakimi:backup-health:v1:lastFullBackupExportedAt",
      new Date().toISOString()
    );

    render(<DashboardPage />);

    expect(await screen.findByRole("heading", { name: "备份记录" })).toBeTruthy();
    expect(screen.getByText(/上次完整备份导出记录：/)).toBeTruthy();
    expect(screen.queryByText("尚未确认完整备份")).toBeNull();
  });
});
