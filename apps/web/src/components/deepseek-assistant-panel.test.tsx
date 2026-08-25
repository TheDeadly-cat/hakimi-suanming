import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import type { RevisionRecord } from "@hakimi/contracts";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { DeepSeekAssistantPanel } from "./deepseek-assistant-panel";

let revision: RevisionRecord;

beforeAll(async () => {
  const chart = await calculateChart({
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
  }, WORKING_DEFAULT_RULE_PROFILE);
  revision = {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 2,
    createdAt: "2026-08-11T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    facts: chart.facts,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    manifest: chart.manifest
  };
}, 30_000);

async function prepareContext() {
  fireEvent.click(screen.getByRole("button", { name: "准备本机验证上下文" }));
  return screen.findByLabelText("本机 AI 验证上下文 JSON", {}, { timeout: 30_000 });
}

describe("DeepSeekAssistantPanel local-only boundary", () => {
  it("在 React StrictMode effect 预演后仍接受本机准备结果", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<StrictMode><DeepSeekAssistantPanel revision={revision} /></StrictMode>);

    const contextArea = await prepareContext();
    expect((contextArea as HTMLTextAreaElement).value).toContain("local_ai_verification_context/0.1.0");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  }, 60_000);

  it("legacy-v13 默认关闭 Provider 外发，不提供 API Key 或发送入口", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<DeepSeekAssistantPanel revision={revision} />);

    expect(screen.getByRole("heading", { name: "本机 AI 断言草稿验证器" })).toBeTruthy();
    expect(screen.getByText(/应用内 DeepSeek 外发已关闭/)).toBeTruthy();
    expect(screen.queryByLabelText(/API Key/)).toBeNull();
    expect(screen.queryByRole("button", { name: /发送到 DeepSeek/ })).toBeNull();
    expect(screen.getByText("用户数据外发")).toBeTruthy();
    expect(container.querySelector("[data-provider-outbound='blocked']")).toBeTruthy();
    expect(container.querySelector("[data-provider-outbound-authorized='false']")).toBeTruthy();
    expect(container.querySelector("[data-provider-network-transmission-performed='false']")).toBeTruthy();
    expect(container.querySelector("[data-user-data-network-transmission-performed='false']")).toBeTruthy();
    expect(container.querySelector("[data-provider-call-capability='absent']")).toBeTruthy();
    expect(container.querySelector("[data-network-transmission-performed]")).toBeNull();
    expect(container.querySelector("[data-state='requesting']")).toBeNull();
    expect(container.querySelector("[data-mutation-epoch-available='false']")).toBeTruthy();
    expect(container.querySelector("[data-mutation-epoch-bypassed='false']")).toBeTruthy();
    expect(container.querySelector("[data-release-identity='legacy-v13']")).toBeTruthy();
    expect(container.querySelector("[data-release-family='legacy-v13']")).toBeTruthy();
    expect(container.querySelector("[data-target-schema='13']")).toBeTruthy();
    expect(container.querySelector("[data-db-generation='legacy-v13']")).toBeTruthy();
    expect(container.querySelector("[data-migration-id='null']")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("准备 v2 上下文并验证空白模板，不制造伪 100%", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<DeepSeekAssistantPanel revision={revision} />);

    const contextArea = await prepareContext();
    expect((contextArea as HTMLTextAreaElement).value).toContain("local_ai_verification_context/0.1.0");
    const draftArea = screen.getByLabelText(/AI assertion draft JSON/) as HTMLTextAreaElement;
    expect(draftArea.disabled).toBe(false);
    expect(draftArea.value).toContain("interpretation_ai_assertion_draft/0.2.0");

    fireEvent.click(screen.getByRole("button", { name: "验证结构化草稿" }));

    expect(await screen.findByRole("region", { name: "结构化草稿验证结果" }, { timeout: 30_000 })).toBeTruthy();
    expect(screen.getByText(/不会生成伪 100%/)).toBeTruthy();
    expect(screen.getAllByText("不适用")).toHaveLength(2);
    expect(container.querySelector("[data-visible-assertions='0']")).toBeTruthy();
    expect(container.querySelector("[data-withheld-assertions='0']")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  }, 60_000);

  it("结果性断言只计入隐藏项，页面不回显其原文", async () => {
    render(<DeepSeekAssistantPanel revision={revision} />);
    await prepareContext();
    const draftArea = screen.getByLabelText(/AI assertion draft JSON/) as HTMLTextAreaElement;
    const draft = JSON.parse(draftArea.value) as {
      legacyDraft: { assertions: unknown[] };
    };
    const sentinel = "不应在页面回显的绝对吉凶文本";
    draft.legacyDraft.assertions.push({
      assertionId: "blocked-1",
      order: 1,
      family: "overall_good_bad",
      subjectId: null,
      content: sentinel
    });
    fireEvent.change(draftArea, { target: { value: JSON.stringify(draft, null, 2) } });
    fireEvent.click(screen.getByRole("button", { name: "验证结构化草稿" }));

    const result = await screen.findByRole("region", { name: "结构化草稿验证结果" }, { timeout: 30_000 });
    expect(result.getAttribute("data-visible-assertions")).toBe("0");
    expect(result.getAttribute("data-withheld-assertions")).toBe("1");
    expect(screen.getByText(/1 条断言保持隐藏/)).toBeTruthy();
    expect(screen.queryByText(sentinel)).toBeNull();
  }, 60_000);

  it("规范事实只显示为中性的逐字匹配，不使用内容正确语义", async () => {
    render(<DeepSeekAssistantPanel revision={revision} />);
    const contextArea = await prepareContext() as HTMLTextAreaElement;
    const packet = JSON.parse(contextArea.value) as {
      envelope: { legacyEnvelope: { facts: Array<{ factId: string; status: string; value: string | null }> } };
    };
    const fact = packet.envelope.legacyEnvelope.facts.find(
      (item) => item.status === "confirmed" && typeof item.value === "string" && item.value.length > 0
    );
    if (!fact?.value) throw new Error("测试上下文缺少可见事实");
    const draftArea = screen.getByLabelText(/AI assertion draft JSON/) as HTMLTextAreaElement;
    const draft = JSON.parse(draftArea.value) as {
      legacyDraft: { assertions: unknown[] };
    };
    draft.legacyDraft.assertions.push({
      assertionId: "fact-1",
      order: 1,
      family: "fact_quote",
      subjectId: fact.factId,
      content: fact.value
    });
    fireEvent.change(draftArea, { target: { value: JSON.stringify(draft, null, 2) } });
    fireEvent.click(screen.getByRole("button", { name: "验证结构化草稿" }));

    const result = await screen.findByRole("region", { name: "结构化草稿验证结果" }, { timeout: 30_000 });
    expect(result.textContent).toContain(fact.value);
    const verdict = screen.getByText("逐字匹配");
    expect(verdict.closest(".status-pill")?.classList.contains("status-pill--info")).toBe(true);
    expect(result.textContent).not.toContain("内容正确");
  }, 60_000);

  it("Revision 身份变化时用 keyed reset 清空旧上下文和草稿", async () => {
    const { rerender } = render(<DeepSeekAssistantPanel revision={revision} />);
    await prepareContext();
    expect((screen.getByLabelText(/AI assertion draft JSON/) as HTMLTextAreaElement).value).not.toBe("");

    rerender(<DeepSeekAssistantPanel revision={{
      ...revision,
      id: "33333333-3333-4333-8333-333333333333",
      revisionNumber: 3
    }} />);

    await waitFor(() => {
      expect(screen.queryByLabelText("本机 AI 验证上下文 JSON")).toBeNull();
      expect((screen.getByLabelText(/AI assertion draft JSON/) as HTMLTextAreaElement).value).toBe("");
    });
  }, 60_000);

  it("被篡改的 Revision 无法形成上下文且不回显敏感异常", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const tampered = structuredClone(revision);
    tampered.manifest.resultHash = "0".repeat(64);
    render(<DeepSeekAssistantPanel revision={tampered} />);

    fireEvent.click(screen.getByRole("button", { name: "准备本机验证上下文" }));

    expect((await screen.findByRole("alert", {}, { timeout: 30_000 })).textContent).toMatch(/本机验证保持关闭/);
    expect(screen.queryByLabelText("本机 AI 验证上下文 JSON")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  }, 60_000);
});
