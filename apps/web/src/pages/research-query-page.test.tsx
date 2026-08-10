import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  migrateLegacySavedViewRecordV1,
  SCHEMA_VERSION,
  type BirthInput,
} from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository, researchRepository } from "@hakimi/storage";
import * as researchQueryAdapter from "../lib/research-query-adapter";
import { readResearchQueryDraft } from "../lib/research-query-session";
import { ResearchQueryPage } from "./research-query-page";

const { saveTextFileMock } = vi.hoisted(() => ({ saveTextFileMock: vi.fn() }));

vi.mock("@hakimi/platform", () => ({ saveTextFile: saveTextFileMock }));

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
  sourceNote: "",
};

beforeEach(async () => {
  await caseRepository.clearAll();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/cases/research");
  saveTextFileMock.mockReset().mockImplementation(async (filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await caseRepository.clearAll();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("ResearchQueryPage", () => {
  it("显式应用规范化查询，仅把随机草稿引用写入 URL，并只导出已执行快照", async () => {
    await caseRepository.createCase({
      alias: "甲案例",
      calculated: await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE),
      duplicateGuard: "allow",
    });

    render(<ResearchQueryPage />);

    expect(await screen.findByRole("heading", { name: "正式命盘 · 1 条结果" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "导出查询快照" })).toBeTruthy();

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "　甲　　案例　" } });
    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    await waitFor(() => expect(window.location.search).toMatch(/^\?draft=[0-9a-f-]{36}$/i));
    expect(window.location.search).not.toContain("甲");
    expect([...new URLSearchParams(window.location.search).keys()]).toEqual(["draft"]);
    const draftId = new URLSearchParams(window.location.search).get("draft")!;
    expect(readResearchQueryDraft(draftId)).toMatchObject({
      draft: { query: { scope: "cases", text: "甲 案例" } },
      issue: null,
    });
    await waitFor(() => expect(search).toHaveProperty("value", "甲 案例"));
    const resultHeading = await screen.findByRole("heading", { name: "正式命盘 · 1 条结果" });
    await waitFor(() => expect(document.activeElement).toBe(resultHeading.closest("section")));

    expect(screen.getByText(/文件包含检索词、标签、别名、事件命中及精确本地 ID/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "导出查询快照" }));
    await waitFor(() => expect(saveTextFileMock).toHaveBeenCalledTimes(1));
    const [fileName, raw, mediaType] = saveTextFileMock.mock.calls[0] as [string, string, string];
    expect(fileName).toMatch(/^hakimi-research-query-.+\.json$/);
    expect(mediaType).toBe("application/json;charset=utf-8");
    expect(JSON.parse(raw)).toMatchObject({
      manifest: { format: "hakimi-research-query-export", formatVersion: "1.1.0", appVersion: "0.2.0-p0" },
      payload: { query: { text: "甲 案例" }, total: 1 },
    });

    fireEvent.change(screen.getByLabelText("视图名称"), { target: { value: "源视图" } });
    fireEvent.click(screen.getByRole("button", { name: "保存当前查询" }));
    expect(await screen.findByText("已保存视图“源视图”。")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("视图名称"), { target: { value: "辛日主演示研究 副本" } });
    const copyButton = screen.getByRole("button", { name: "另存副本" });
    await waitFor(() => expect(copyButton).toHaveProperty("disabled", false));
    fireEvent.click(copyButton);
    expect(await screen.findByText("已另存副本“辛日主演示研究 副本”。")).toBeTruthy();
    expect((await researchRepository.listSavedViews()).map((view) => view.name)).toEqual(expect.arrayContaining(["源视图", "辛日主演示研究 副本"]));
    expect((await researchRepository.listSavedViews()).some((view) => view.name.endsWith("副本 副本"))).toBe(false);
  });

  it("旧视图只展示原文，须人工重选并确认后才迁移，且不解释旧 filters", async () => {
    const timestamp = "2026-08-01T00:00:00.000Z";
    const legacy = {
      schemaVersion: SCHEMA_VERSION,
      id: "77777777-7777-4777-8777-777777777777",
      name: "旧事业视图",
      query: "事　　业",
      filters: { dayMasters: ["甲"], includeArchived: true },
      sort: { field: "alias", direction: "asc" } as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await caseRepository.database.savedViews.put(migrateLegacySavedViewRecordV1(legacy));

    render(<ResearchQueryPage />);

    const startReview = await screen.findByRole("button", { name: "开始审核" });
    fireEvent.click(startReview);
    expect(await screen.findByRole("heading", { name: "审核旧视图“旧事业视图”" })).toBeTruthy();
    expect(screen.getByText(/没有既定 ResearchQuery 语义/)).toBeTruthy();
    expect(screen.getByText(/"dayMasters": \[/)).toBeTruthy();
    const confirmButton = screen.getByRole("button", { name: "确认迁移为当前表单条件" });
    expect(confirmButton).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "仅复制旧关键词到草稿" }));
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "事 业");
    fireEvent.change(screen.getByLabelText("生命周期"), { target: { value: "trashed" } });
    fireEvent.click(screen.getByLabelText(/我已在下方表单逐项选择/));
    fireEvent.click(confirmButton);

    await waitFor(() => expect(window.location.search).toBe(`?view=${legacy.id}`));
    const resolved = await researchRepository.getSavedView(legacy.id);
    expect(resolved).toMatchObject({
      state: "ready",
      editVersion: 2,
      query: { scope: "cases", text: "事 业", lifecycle: "trashed", dayMasters: [] },
    });
    expect(resolved).not.toHaveProperty("legacyRecord");
    expect(await screen.findByText(/旧 filters 与 sort 未被自动解释/)).toBeTruthy();
  });

  it("运限筛选结果在主摘要直接声明专家金标仍为 0", async () => {
    await caseRepository.createCase({
      alias: "运限边界样本",
      calculated: await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE),
      duplicateGuard: "allow",
    });

    render(<ResearchQueryPage />);
    expect(await screen.findByRole("heading", { name: "正式命盘 · 1 条结果" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("启用运限组合条件"));
    fireEvent.change(screen.getByLabelText(/目标瞬时点（UTC）/), { target: { value: "2025-03-12T04:00" } });
    fireEvent.click(screen.getByLabelText("流年"));
    fireEvent.change(screen.getByLabelText("流年干支"), { target: { value: "乙巳" } });
    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    expect(await screen.findByText(
      /当前专家验证案例为 0，本次命中不代表运限命理真值已经确认/,
      {},
      { timeout: 5_000 }
    )).toBeTruthy();
    expect(screen.getByText(/完成结构、摘要复算与稳定排序/)).toBeTruthy();
    const source = await screen.findByLabelText("计算来源：当前版本即时投影");
    expect(within(source).getByText("explicit_projection")).toBeTruthy();
    expect(within(source).getByText(/未读取匹配历史输出/)).toBeTruthy();
    expect(screen.getByText(/已保存收据 0 · 当前即时投影 1/)).toBeTruthy();
  });

  it("长查询可由用户主动取消，终止当前信号且不保存半成品结果", async () => {
    let observedSignal: AbortSignal | undefined;
    vi.spyOn(researchQueryAdapter, "executeWebResearchQuery").mockImplementation(async (_query, options = {}) => {
      observedSignal = options.signal;
      options.onProgress?.({ phase: "verify", completed: 1, total: 10_000 });
      return await new Promise<never>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
      });
    });

    render(<ResearchQueryPage />);

    expect(await screen.findByText("正在验真本地数据 · 1 / 10000")).toBeTruthy();
    const cancelButton = screen.getByRole("button", { name: "取消查询" });
    fireEvent.click(cancelButton);

    await waitFor(() => expect(observedSignal?.aborted).toBe(true));
    expect(await screen.findByText("已取消本次研究查询；没有保存结果或改写视图。")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "取消查询" })).toBeNull();
    expect(screen.getByRole("button", { name: "应用筛选" })).toHaveProperty("disabled", false);
    expect(screen.queryByText(/条结果/)).toBeNull();
  });

});
