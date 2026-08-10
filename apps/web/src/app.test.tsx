import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./app";
import type { AppBootFailure, AppBootFailureSource } from "./lib/app-boot-failure";

function bootFailure(storageReady: boolean, source: AppBootFailureSource = "calculation"): AppBootFailure {
  return { storageReady, source, error: new Error(`${source} failed`) };
}

vi.mock("./pages/candidate-set-page", () => ({
  CandidateSetPage: ({ candidateSetId }: { candidateSetId: string }) => (
    <h1>候选组路由 {candidateSetId}</h1>
  )
}));

vi.mock("./pages/new-chart-page", () => ({
  NewChartPage: ({ caseId, revisionId }: { caseId?: string; revisionId?: string }) => (
    <h1>{caseId && revisionId ? `派生路由 ${caseId} ${revisionId}` : "新建排盘路由"}</h1>
  )
}));

vi.mock("./pages/chart-page", () => ({
  ChartPage: ({ caseId, revisionId }: { caseId: string; revisionId: string }) => (
    <h1>命盘路由 {caseId} {revisionId}</h1>
  )
}));

vi.mock("./pages/research-query-page", () => ({
  ResearchQueryPage: () => <h1>专业研究检索路由</h1>
}));

vi.mock("./pages/pair-research-page", () => ({
  PairResearchPage: () => <h1>双案例结构研究路由</h1>
}));

vi.mock("./pages/data-management-page", () => ({
  DataManagementPage: () => <h1>数据管理路由</h1>
}));

vi.mock("./pages/help-page", () => ({
  HelpPage: () => <h1>帮助与安全边界路由</h1>
}));

vi.mock("./pages/calendar-divergence-audit-page", () => ({
  CalendarDivergenceAuditPage: () => <h1>连续历法差异审计路由</h1>
}));

vi.mock("./pages/transit-review-inbox-page", () => ({
  TransitReviewInboxPage: () => <h1>未核验审核收件箱路由</h1>
}));

afterEach(() => {
  window.history.replaceState({}, "", "/");
  document.title = "哈基米八字研究台";
});

describe("App candidate-set route", () => {
  it("把候选组路径交给独立详情页并传递记录 ID", async () => {
    const candidateSetId = "11111111-1111-4111-8111-111111111111";
    window.history.replaceState({}, "", `/candidate-sets/${candidateSetId}`);

    render(<App />);

    expect(await screen.findByRole("heading", { name: `候选组路由 ${candidateSetId}` })).toBeTruthy();
    expect(document.title).toBe("未知时辰候选组 · 哈基米八字研究台");
    expect(screen.getByText("已打开：未知时辰候选组")).toBeTruthy();
  });
});

describe("App research query route", () => {
  it("让固定专业检索路径优先于案例详情，并保留查询引用", async () => {
    const viewId = "66666666-6666-4666-8666-666666666666";
    window.history.replaceState({}, "", `/cases/research?view=${viewId}`);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "专业研究检索路由" })).toBeTruthy();
    expect(document.title).toBe("专业研究检索 · 哈基米八字研究台");
    expect(screen.getByText("已打开：专业研究检索")).toBeTruthy();
  });

  it("启动完整性失败时不再渲染原研究页，只开放诊断与只读备份导航", async () => {
    window.history.replaceState({}, "", "/cases/research");

    render(<App bootFailure={bootFailure(true)} />);

    expect(screen.queryByRole("heading", { name: "专业研究检索路由" })).toBeNull();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("启动完整性检查未通过");
    expect(alert.textContent).toContain("普通工作台、排盘、案例、事件、运限、知识导入、规则激活、恢复和删除入口均已停止渲染");
    expect(alert.textContent).toContain("请勿清除浏览器数据");
    expect(screen.getByRole("link", { name: "启动诊断" }).getAttribute("href")).toBe("/settings");
    expect(screen.getByRole("link", { name: "只读安全备份" }).getAttribute("href")).toBe("/settings/data");
    expect(screen.getByRole("button", { name: "导出启动诊断 JSON" })).toBeTruthy();
    expect(document.title).toBe("启动恢复诊断 · 哈基米八字研究台");
  });

  it("预检通过前完全不挂载普通研究路由", () => {
    window.history.replaceState({}, "", "/cases/research");

    render(<App routeMountAllowed={false} bootPending />);

    expect(screen.queryByRole("heading", { name: "专业研究检索路由" })).toBeNull();
    expect(screen.getByText(/普通研究路由尚未挂载/)).toBeTruthy();
    expect(document.title).toBe("启动完整性检查 · 哈基米八字研究台");
  });

  it("已确认启动后的错误使用独立运行故障页，不冒充启动失败", () => {
    window.history.replaceState({}, "", "/cases/research");

    render(<App runtimeFailure={{ source: "window_error", error: new Error("late failure") }} />);

    expect(screen.queryByRole("heading", { name: "专业研究检索路由" })).toBeNull();
    expect(screen.getByRole("heading", { name: "当前页面运行失败" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("不会被误报为启动失败");
    expect(screen.queryByText("启动完整性检查未通过")).toBeNull();
    expect(document.title).toBe("页面运行故障 · 哈基米八字研究台");
  });
});

describe("App pair research route", () => {
  it("让双案例独立路径优先于正式对照台，并同步页面标题", async () => {
    window.history.replaceState({}, "", "/compare/pair");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "双案例结构研究路由" })).toBeTruthy();
    expect(document.title).toBe("双案例结构研究 · 哈基米八字研究台");
    expect(screen.getByText("已打开：双案例结构研究")).toBeTruthy();
  });
});

describe("App data management route", () => {
  it("让数据管理子路由优先于设置页并同步页面标题", async () => {
    window.history.replaceState({}, "", "/settings/data");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "数据管理路由" })).toBeTruthy();
    expect(document.title).toBe("数据管理与完整备份 · 哈基米八字研究台");
    expect(screen.getByText("已打开：数据管理与完整备份")).toBeTruthy();
  });

  it("数据库探针未通过时把数据管理替换为禁用的只读救援页", async () => {
    window.history.replaceState({}, "", "/settings/data");

    render(<App bootFailure={bootFailure(false, "storage")} />);

    expect(screen.queryByRole("heading", { name: "数据管理路由" })).toBeNull();
    expect(screen.getByRole("heading", { name: "导出当前完整安全备份" })).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "导出只读完整备份 ZIP" }).disabled).toBe(true);
    expect(screen.getByText(/本次启动不会重新打开数据库/)).toBeTruthy();
    expect(document.title).toBe("只读安全备份 · 哈基米八字研究台");
  });
});

describe("App help route", () => {
  it("独立打开帮助页并同步标题与无障碍播报", async () => {
    window.history.replaceState({}, "", "/help");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "帮助与安全边界路由" })).toBeTruthy();
    expect(document.title).toBe("帮助与安全边界 · 哈基米八字研究台");
    expect(screen.getByText("已打开：帮助与安全边界")).toBeTruthy();
  });

  it("启动失败时不绕过只读恢复边界挂载普通帮助页", () => {
    window.history.replaceState({}, "", "/help");

    render(<App bootFailure={bootFailure(true)} />);

    expect(screen.queryByRole("heading", { name: "帮助与安全边界路由" })).toBeNull();
    expect(screen.getByRole("heading", { name: "启动完整性检查未通过" })).toBeTruthy();
    expect(document.title).toBe("启动恢复诊断 · 哈基米八字研究台");
  });
});

describe("App planned research system routes", () => {
  it.each([
    "/systems/ziwei-doushu/new",
    "/systems/western-astrology/new"
  ])("计划体系路径 %s 保持未开放并进入未找到页", async (pathname) => {
    window.history.replaceState({}, "", pathname);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "这条研究路径不存在" })).toBeTruthy();
    expect(document.title).toBe("页面未找到 · 哈基米八字研究台");
    expect(screen.queryByRole("button", { name: /排盘|保存/ })).toBeNull();
  });
});

describe("App calendar divergence audit route", () => {
  it("让连续窗口审计子路由优先于设置页并同步页面标题", async () => {
    window.history.replaceState({}, "", "/settings/calendar-divergence-audit");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "连续历法差异审计路由" })).toBeTruthy();
    expect(document.title).toBe("连续历法差异审计 · 哈基米八字研究台");
    expect(screen.getByText("已打开：连续历法差异审计")).toBeTruthy();
  });
});

describe("App transit review inbox route", () => {
  it("让审核收件箱子路由优先于设置页并同步页面标题", async () => {
    window.history.replaceState({}, "", "/settings/transit-review-inbox");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "未核验审核收件箱路由" })).toBeTruthy();
    expect(document.title).toBe("未核验审核收件箱 · 哈基米八字研究台");
    expect(screen.getByText("已打开：未核验审核收件箱")).toBeTruthy();
  });
});

describe("App historical revision route", () => {
  it("只用显式 revise 路径传递精确 Case 与 Revision", async () => {
    const caseId = "22222222-2222-4222-8222-222222222222";
    const revisionId = "33333333-3333-4333-8333-333333333333";
    window.history.replaceState({}, "", `/cases/${caseId}/revisions/${revisionId}/revise`);

    render(<App />);

    expect(await screen.findByRole("heading", { name: `派生路由 ${caseId} ${revisionId}` })).toBeTruthy();
    expect(document.title).toBe("由历史修订派生新版 · 哈基米八字研究台");
    expect(screen.getByText("已打开：由历史修订派生新版")).toBeTruthy();
  });
});

describe("App chart title", () => {
  it.each([
    ["", "命盘结构"],
    ["?view=structure", "命盘结构"],
    ["?view=overview", "命盘概览"]
  ])("让 query %s 与 Chart 默认视图标题一致", async (search, title) => {
    const caseId = "44444444-4444-4444-8444-444444444444";
    const revisionId = "55555555-5555-4555-8555-555555555555";
    window.history.replaceState({}, "", `/cases/${caseId}/revisions/${revisionId}${search}`);

    render(<App />);

    expect(await screen.findByRole("heading", { name: `命盘路由 ${caseId} ${revisionId}` })).toBeTruthy();
    expect(document.title).toBe(`${title} · 哈基米八字研究台`);
    expect(screen.getByText(`已打开：${title}`)).toBeTruthy();
  });
});
