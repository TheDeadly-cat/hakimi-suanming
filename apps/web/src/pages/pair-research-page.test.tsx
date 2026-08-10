import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { BirthInput } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary } from "@hakimi/rule-profiles";
import { caseRepository } from "@hakimi/storage";
import { serializePairResearchRoute } from "../lib/pair-research-route";
import { PairResearchPage } from "./pair-research-page";

const AT = "2026-08-02T09:15:00.000Z";
const BASE_INPUT: BirthInput = {
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

async function createFormalCase(alias: string, date: string, sex: BirthInput["sex"] = "male") {
  const chart = await calculateChart({ ...BASE_INPUT, date, sex }, WORKING_DEFAULT_RULE_PROFILE);
  return caseRepository.createCase({ alias, calculated: chart });
}

function exactPairUrl(
  first: { caseId: string; revisionId: string; manualDirection?: "forward" | "backward" | null },
  second: { caseId: string; revisionId: string; manualDirection?: "forward" | "backward" | null }
) {
  return serializePairResearchRoute({
    slots: [
      { ...first, manualDirection: first.manualDirection ?? null },
      { ...second, manualDirection: second.manualDirection ?? null }
    ],
    atInstant: AT
  });
}

beforeEach(async () => {
  await caseRepository.clearAll();
  document.documentElement.dataset.appBootReady = "true";
  window.history.replaceState({}, "", "/compare/pair");
  window.scrollTo = vi.fn();
});

afterEach(async () => {
  await caseRepository.clearAll();
  delete document.documentElement.dataset.appBootReady;
  window.history.replaceState({}, "", "/compare/pair");
});

describe("PairResearchPage", () => {
  it("冷启动自检未确认时不会把空白入口改写为新的瞬时点地址", async () => {
    document.documentElement.dataset.appBootReady = "false";

    render(<PairResearchPage />);

    expect(await screen.findByRole("heading", { name: "双案例结构研究 · 事实层" })).toBeTruthy();
    await screen.findByRole("heading", { name: "先保存两个不同正式案例" });
    expect(`${window.location.pathname}${window.location.search}`).toBe("/compare/pair");
  });

  it("空白入口固定两个研究对象并常驻事实层硬边界", async () => {
    await Promise.all([
      createFormalCase("对象甲候选", "1995-08-18"),
      createFormalCase("对象乙候选", "1996-09-19")
    ]);

    render(<PairResearchPage />);

    expect(await screen.findByRole("combobox", { name: "对象甲案例" })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "对象乙案例" }) as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(/不生成跨盘干支推导、吉凶、因果、缘分、婚配结论或任何评分/)).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "对照研究模式" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "双案例事实字段并列表" })).toBeNull();
  });

  it("必须显式选择两个不同 Case 的 Revision，随后生成 96 项事实和各自六层运限", async () => {
    const [first, second] = await Promise.all([
      createFormalCase("事实甲", "1995-08-18"),
      createFormalCase("事实乙", "1996-09-19")
    ]);
    render(<PairResearchPage />);

    const caseA = await screen.findByRole("combobox", { name: "对象甲案例" });
    fireEvent.change(caseA, { target: { value: first.caseRecord.id } });
    const revisionA = screen.getByRole("combobox", { name: "对象甲修订" });
    await waitFor(() => expect((revisionA as HTMLSelectElement).disabled).toBe(false));
    expect((revisionA as HTMLSelectElement).value).toBe("");
    fireEvent.change(revisionA, { target: { value: first.revisions[0].id } });

    const caseB = screen.getByRole("combobox", { name: "对象乙案例" });
    expect((within(caseB).getByRole("option", { name: "事实甲 · 1 修订" }) as HTMLOptionElement).disabled).toBe(true);
    fireEvent.change(caseB, { target: { value: second.caseRecord.id } });
    const revisionB = screen.getByRole("combobox", { name: "对象乙修订" });
    await waitFor(() => expect((revisionB as HTMLSelectElement).disabled).toBe(false));
    fireEvent.change(revisionB, { target: { value: second.revisions[0].id } });

    const matrix = await screen.findByRole("region", { name: "双案例事实字段并列表" });
    expect(matrix.querySelectorAll("tbody tr[data-field-id]")).toHaveLength(96);
    for (const row of matrix.querySelectorAll("tbody tr[data-field-id]")) {
      expect(row.querySelectorAll("td")).toHaveLength(2);
    }
    const transit = screen.getByRole("region", { name: "双案例同一瞬时点六层运限并列表" });
    for (const track of ["dayun", "xiaoyun", "year", "month", "day", "hour"]) {
      expect(transit.querySelector(`[data-field-id="transit.${track}"]`)?.querySelectorAll("td")).toHaveLength(2);
    }
    expect(screen.getByRole("region", { name: "导出确切双案例研究工件" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "导出匿名双案例 Markdown" })).toBeTruthy();
    expect((screen.getByRole("button", { name: "导出完整审计 JSON" }) as HTMLButtonElement).disabled).toBe(true);
    expect(window.location.search).toContain(encodeURIComponent(`revision:${first.caseRecord.id}:${first.revisions[0].id}`));
    expect(window.location.search).toContain(encodeURIComponent(`revision:${second.caseRecord.id}:${second.revisions[0].id}`));
  }, 15_000);

  it("精确 URL 恢复两个 Revision、UTC 和人工顺逆，不追随最新修订", async () => {
    const [first, second] = await Promise.all([
      createFormalCase("恢复甲", "1995-08-18", "unspecified"),
      createFormalCase("恢复乙", "1996-09-19", "unspecified")
    ]);
    const alternate = await calculateChart({ ...BASE_INPUT, date: "1995-08-18", sex: "unspecified" }, withDayBoundary("midnight"));
    const updated = await caseRepository.addRevision(first.caseRecord.id, alternate);
    window.history.replaceState({}, "", exactPairUrl(
      { caseId: first.caseRecord.id, revisionId: first.revisions[0].id, manualDirection: "forward" },
      { caseId: second.caseRecord.id, revisionId: second.revisions[0].id, manualDirection: "backward" }
    ));

    render(<PairResearchPage />);

    expect(await screen.findByRole("region", { name: "双案例事实字段并列表" })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "对象甲修订" }) as HTMLSelectElement).value).toBe(first.revisions[0].id);
    expect((screen.getByRole("combobox", { name: "对象甲人工顺逆" }) as HTMLSelectElement).value).toBe("forward");
    expect((screen.getByRole("combobox", { name: "对象乙人工顺逆" }) as HTMLSelectElement).value).toBe("backward");
    expect(updated.caseRecord.latestRevisionId).not.toBe(first.revisions[0].id);
    expect(new URLSearchParams(window.location.search).getAll("dir")).toEqual(["A:forward", "B:backward"]);
    expect(screen.getByText(AT)).toBeTruthy();
  }, 15_000);

  it("伪造同一 Case 的双 Revision 链接会失败关闭并引导到正式对照台", async () => {
    const bundle = await createFormalCase("同案伪造", "1995-08-18");
    const alternate = await calculateChart(BASE_INPUT, withDayBoundary("midnight"));
    const updated = await caseRepository.addRevision(bundle.caseRecord.id, alternate);
    const params = new URLSearchParams();
    params.append("item", `revision:${bundle.caseRecord.id}:${bundle.revisions[0].id}`);
    params.append("item", `revision:${bundle.caseRecord.id}:${updated.revisions[1].id}`);
    params.set("at", AT);
    window.history.replaceState({}, "", `/compare/pair?${params.toString()}`);

    render(<PairResearchPage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/两个不同 Case|同一案例/);
    expect((within(alert).getByRole("link", { name: "转到多盘 / 多规则对照" }) as HTMLAnchorElement).getAttribute("href")).toBe("/compare");
    expect(screen.queryByRole("region", { name: "双案例事实字段并列表" })).toBeNull();
  });

  it("不存在的精确 Revision 明确拒绝且不替换为最新修订", async () => {
    const first = await createFormalCase("仍有最新甲", "1995-08-18");
    const second = await createFormalCase("仍有最新乙", "1996-09-19");
    const missingRevisionId = crypto.randomUUID();
    window.history.replaceState({}, "", exactPairUrl(
      { caseId: first.caseRecord.id, revisionId: missingRevisionId },
      { caseId: second.caseRecord.id, revisionId: second.revisions[0].id }
    ));

    render(<PairResearchPage />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(missingRevisionId);
    expect(alert.textContent).toContain("未静默替换为最新修订");
    expect(screen.queryByRole("region", { name: "双案例事实字段并列表" })).toBeNull();
  });

  it("交换甲乙只改变显示顺序与 URL，不改变事实工件边界", async () => {
    const [first, second] = await Promise.all([
      createFormalCase("交换甲", "1995-08-18"),
      createFormalCase("交换乙", "1996-09-19")
    ]);
    window.history.replaceState({}, "", exactPairUrl(
      { caseId: first.caseRecord.id, revisionId: first.revisions[0].id },
      { caseId: second.caseRecord.id, revisionId: second.revisions[0].id }
    ));
    render(<PairResearchPage />);
    await screen.findByRole("region", { name: "双案例事实字段并列表" });

    fireEvent.click(screen.getByRole("button", { name: "交换甲乙" }));

    expect(await screen.findByText(/只改变显示顺序和机械差异锚点/)).toBeTruthy();
    await waitFor(() => {
      const firstItem = new URLSearchParams(window.location.search).getAll("item")[0];
      expect(firstItem).toBe(`revision:${second.caseRecord.id}:${second.revisions[0].id}`);
    });
    expect(screen.getByText(/只改变显示顺序和机械差异锚点，不改写任何一方事实/)).toBeTruthy();
    await screen.findByRole("region", { name: "双案例事实字段并列表" });
    expect(screen.getByText("scoreIncluded=false", { selector: "code" })).toBeTruthy();
  }, 15_000);
});
