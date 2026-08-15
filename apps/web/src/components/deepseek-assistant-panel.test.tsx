import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeepSeekAssistantPanel", () => {
  it("展示只读边界、内存 Key 与字段范围，不发送别名/笔记", () => {
    render(<DeepSeekAssistantPanel revision={revision} />);
    expect(screen.getByRole("heading", { name: "AI 研究助手（DeepSeek）" })).toBeTruthy();
    expect(screen.getByText(/AI 生成内容不是专家真值/)).toBeTruthy();
    expect(screen.getByText(/只发送你当前核对的四柱、规则身份与问题/)).toBeTruthy();
    expect(screen.getByLabelText(/DeepSeek API Key/)).toHaveProperty("type", "password");
    expect(screen.getByLabelText(/你的研究问题/)).toBeTruthy();
  });

  it("提交后展示 DeepSeek 返回内容并保持 AI 边界提示", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      choices: [{ message: { content: "四柱结构核对要点…" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(<DeepSeekAssistantPanel revision={revision} />);

    fireEvent.change(screen.getByLabelText(/DeepSeek API Key/), { target: { value: "sk-test" } });
    fireEvent.change(screen.getByLabelText(/你的研究问题/), { target: { value: "请核对四柱结构" } });
    fireEvent.click(screen.getByRole("button", { name: "发送到 DeepSeek" }));

    expect(await screen.findByText("四柱结构核对要点…")).toBeTruthy();
    expect(screen.getAllByText(/AI 生成内容不是专家真值/).length).toBeGreaterThanOrEqual(1);
    const init = (fetchMock.mock.calls[0] as unknown[] | undefined)?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
    expect(body.messages[1]?.content).toContain("乙亥");
    expect(body.messages[1]?.content).toContain("不发送别名、笔记、事件、附件");
    expect(JSON.stringify(body)).not.toContain("sk-test");
  });

  it("可取消进行中的请求并失败关闭", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      await new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
      throw new Error("unreachable");
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<DeepSeekAssistantPanel revision={revision} />);

    fireEvent.change(screen.getByLabelText(/DeepSeek API Key/), { target: { value: "sk-test" } });
    fireEvent.change(screen.getByLabelText(/你的研究问题/), { target: { value: "请核对" } });
    fireEvent.click(screen.getByRole("button", { name: "发送到 DeepSeek" }));
    const cancel = await screen.findByRole("button", { name: "取消请求" });
    fireEvent.click(cancel);

    expect(await screen.findByText("DeepSeek 请求已取消。")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "取消请求" })).toBeNull());
  });
});
