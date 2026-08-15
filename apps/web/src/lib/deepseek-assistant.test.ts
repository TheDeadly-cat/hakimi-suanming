import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDeepSeekSystemPrompt,
  buildDeepSeekUserContent,
  callDeepSeekAssistant,
  DeepSeekAssistantError
} from "./deepseek-assistant";

const request = {
  question: "这个盘的四柱结构有什么值得核对的地方？",
  frozenFacts: [
    { label: "四柱", value: "乙亥 甲申 辛巳 壬辰", sourceRef: "bazi-revision:r2" },
    { label: "日主", value: "辛金", sourceRef: "bazi-revision:r2" }
  ],
  rulesIdentity: { profileId: "working-default", profileVersion: "0.1.0" }
} as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeepSeek BYOK assistant", () => {
  it("用冻结事实构建只读提示，不重算、不冒充专家真值", () => {
    const system = buildDeepSeekSystemPrompt();
    expect(system).toContain("不得重新排盘");
    expect(system).toContain("专家真值");
    expect(system).toContain("编造来源");

    const user = buildDeepSeekUserContent(request);
    expect(user).toContain("乙亥 甲申 辛巳 壬辰");
    expect(user).toContain("working-default@0.1.0");
    expect(user).toContain("不发送别名、笔记、事件、附件");
  });

  it("成功调用时解析正文与用量，且请求体只含冻结事实", async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { messages: Array<{ content: string }> };
      expect(init.headers).toMatchObject({ Authorization: "Bearer sk-test" });
      expect(body.messages[1]?.content).toContain("乙亥 甲申 辛巳 壬辰");
      expect(JSON.stringify(body)).not.toContain("sk-test");
      expect(body.messages[0]?.content).toContain("不得重新排盘");
      return jsonResponse({
        choices: [{ message: { content: "四柱结构核对：辛金日主。" } }],
        usage: { prompt_tokens: 42, completion_tokens: 7 }
      });
    });

    const result = await callDeepSeekAssistant({
      apiKey: "sk-test",
      model: "deepseek-chat",
      request,
      now: () => "2026-08-11T00:00:00.000Z",
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    expect(result.provider).toBe("deepseek");
    expect(result.content).toContain("辛金日主");
    expect(result.usage).toEqual({ promptTokens: 42, completionTokens: 7 });
    expect(result.warning).toContain("不是专家真值");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("401/403、429、网络与坏响应都失败关闭", async () => {
    const unauthorized = vi.fn(async () => jsonResponse({}, 401));
    await expect(callDeepSeekAssistant({
      apiKey: "bad", request, fetchImpl: unauthorized as unknown as typeof fetch
    })).rejects.toMatchObject({ code: "HTTP", status: 401 });

    const rateLimited = vi.fn(async () => jsonResponse({}, 429));
    await expect(callDeepSeekAssistant({
      apiKey: "bad", request, fetchImpl: rateLimited as unknown as typeof fetch
    })).rejects.toMatchObject({ code: "HTTP", status: 429 });

    const network = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(callDeepSeekAssistant({
      apiKey: "bad", request, fetchImpl: network as unknown as typeof fetch
    })).rejects.toMatchObject({ code: "NETWORK_OR_CORS" });

    const malformed = vi.fn(async () => jsonResponse({ choices: [] }));
    await expect(callDeepSeekAssistant({
      apiKey: "bad", request, fetchImpl: malformed as unknown as typeof fetch
    })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("中止信号以 ABORTED 失败关闭，缺 Key 或超限输入直接拒绝", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      await new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
      throw new Error("unreachable");
    });
    const promise = callDeepSeekAssistant({
      apiKey: "sk",
      request,
      signal: controller.signal,
      fetchImpl: fetchImpl as unknown as typeof fetch
    });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(DeepSeekAssistantError);
    await expect(promise).rejects.toMatchObject({ code: "ABORTED" });

    await expect(callDeepSeekAssistant({
      apiKey: "", request, fetchImpl: (() => Promise.resolve(jsonResponse({}))) as unknown as typeof fetch
    })).rejects.toMatchObject({ code: "INVALID_REQUEST" });

    await expect(callDeepSeekAssistant({
      apiKey: "sk",
      request: { ...request, question: "" },
      fetchImpl: (() => Promise.resolve(jsonResponse({}))) as unknown as typeof fetch
    })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});
