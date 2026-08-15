export const DEEPSEEK_DEFAULT_ENDPOINT = "https://api.deepseek.com" as const;

export const DEEPSEEK_MODELS = Object.freeze(["deepseek-chat", "deepseek-reasoner"] as const);
export type DeepSeekModel = (typeof DEEPSEEK_MODELS)[number];

export type DeepSeekFrozenFact = Readonly<{
  label: string;
  value: string;
  sourceRef?: string;
}>;

export type DeepSeekAssistantRequest = Readonly<{
  question: string;
  frozenFacts: readonly DeepSeekFrozenFact[];
  rulesIdentity: Readonly<{
    profileId: string;
    profileVersion: string;
  }>;
}>;

export type DeepSeekAssistantResult = Readonly<{
  provider: "deepseek";
  model: DeepSeekModel;
  requestedAt: string;
  content: string;
  usage: { promptTokens: number | null; completionTokens: number | null } | null;
  warning: "AI 生成内容，不是专家真值；未写入 Revision 或数据库。";
  scopeNote: string;
}>;

export type DeepSeekAssistantErrorCode =
  | "INVALID_REQUEST"
  | "ABORTED"
  | "NETWORK_OR_CORS"
  | "HTTP"
  | "INVALID_RESPONSE";

export class DeepSeekAssistantError extends Error {
  constructor(
    readonly code: DeepSeekAssistantErrorCode,
    message: string,
    readonly status: number | null = null
  ) {
    super(message);
    this.name = "DeepSeekAssistantError";
  }
}

const SCOPE_NOTE =
  "只发送你明确选择并核对过的四柱/规则身份/来源与问题；不发送别名、笔记、事件、附件或研究者资料。";

const SYSTEM_PROMPT = [
  "你是哈基米本地八字研究工作台的只读研究助手。",
  "你只能使用用户提供的冻结事实与来源；不得重新排盘，不得改写或推断未提供的四柱、起运、规则或事件。",
  "不得把输出表述为专家真值、权威结论或确定性预测；对不确定内容必须明确说明。",
  "不得编造来源；资料不足时说明缺失，而不是猜测。",
  "涉及健康、法律、财务、自伤或暴力等话题时，拒绝或引导用户联系现实中的合格专业人员。",
  "使用简体中文，回答时引用字段名与来源。"
].join("\n");

export function buildDeepSeekSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildDeepSeekUserContent(request: DeepSeekAssistantRequest): string {
  const facts = request.frozenFacts
    .map((fact) => `- ${fact.label}: ${fact.value}${fact.sourceRef ? `（来源：${fact.sourceRef}）` : ""}`)
    .join("\n");
  return [
    `问题：${request.question}`,
    "",
    "仅使用以下冻结事实，不要重新计算：",
    facts,
    "",
    `规则身份：${request.rulesIdentity.profileId}@${request.rulesIdentity.profileVersion}`,
    "",
    SCOPE_NOTE
  ].join("\n");
}

function validateRequest(request: DeepSeekAssistantRequest): void {
  if (typeof request.question !== "string" || request.question.trim().length === 0 || request.question.length > 2_000) {
    throw new DeepSeekAssistantError("INVALID_REQUEST", "问题不能为空且不超过 2000 字符。");
  }
  if (!Array.isArray(request.frozenFacts) || request.frozenFacts.length === 0 || request.frozenFacts.length > 30) {
    throw new DeepSeekAssistantError("INVALID_REQUEST", "冻结事实必须为 1～30 条。");
  }
  for (const fact of request.frozenFacts) {
    if (typeof fact.label !== "string" || fact.label.length === 0 || fact.label.length > 80
      || typeof fact.value !== "string" || fact.value.length === 0 || fact.value.length > 1_000
      || (fact.sourceRef !== undefined && (typeof fact.sourceRef !== "string" || fact.sourceRef.length > 200))) {
      throw new DeepSeekAssistantError("INVALID_REQUEST", "冻结事实字段超限或缺失。");
    }
  }
  if (typeof request.rulesIdentity?.profileId !== "string" || request.rulesIdentity.profileId.length === 0
    || typeof request.rulesIdentity?.profileVersion !== "string" || request.rulesIdentity.profileVersion.length === 0) {
    throw new DeepSeekAssistantError("INVALID_REQUEST", "规则身份缺失。");
  }
}

type DeepSeekChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export async function callDeepSeekAssistant(input: {
  apiKey: string;
  model?: DeepSeekModel;
  request: DeepSeekAssistantRequest;
  endpoint?: string;
  signal?: AbortSignal;
  now?: () => string;
  fetchImpl?: typeof fetch;
}): Promise<DeepSeekAssistantResult> {
  const model = input.model ?? "deepseek-chat";
  const endpoint = (input.endpoint ?? DEEPSEEK_DEFAULT_ENDPOINT).replace(/\/+$/u, "");
  const requestedAt = input.now?.() ?? new Date().toISOString();
  if (typeof input.apiKey !== "string" || input.apiKey.trim().length === 0) {
    throw new DeepSeekAssistantError("INVALID_REQUEST", "需要用户自带 DeepSeek API Key。");
  }
  if (!DEEPSEEK_MODELS.includes(model)) {
    throw new DeepSeekAssistantError("INVALID_REQUEST", `不支持的模型：${model}`);
  }
  validateRequest(input.request);

  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey.trim()}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildDeepSeekSystemPrompt() },
          { role: "user", content: buildDeepSeekUserContent(input.request) }
        ],
        temperature: 0.3,
        stream: false
      }),
      signal: input.signal
    });
  } catch (reason) {
    const abortName = (typeof reason === "object" && reason !== null && "name" in reason
      ? (reason as { name?: unknown }).name
      : null);
    if (abortName === "AbortError") {
      throw new DeepSeekAssistantError("ABORTED", "DeepSeek 请求已取消。");
    }
    throw new DeepSeekAssistantError("NETWORK_OR_CORS", "无法连接 DeepSeek；可能是网络、代理或浏览器 CORS 限制。");
  }

  if (response.status === 401 || response.status === 403) {
    throw new DeepSeekAssistantError("HTTP", "DeepSeek 拒绝了 API Key（401/403）。", response.status);
  }
  if (response.status === 429) {
    throw new DeepSeekAssistantError("HTTP", "DeepSeek 请求被限流（429），请稍后重试。", response.status);
  }
  if (!response.ok) {
    throw new DeepSeekAssistantError("HTTP", `DeepSeek 返回 HTTP ${response.status}。`, response.status);
  }

  let payload: DeepSeekChatResponse;
  try {
    payload = (await response.json()) as DeepSeekChatResponse;
  } catch {
    throw new DeepSeekAssistantError("INVALID_RESPONSE", "DeepSeek 返回了非 JSON 响应。");
  }
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new DeepSeekAssistantError("INVALID_RESPONSE", "DeepSeek 响应缺少有效正文。");
  }

  return {
    provider: "deepseek",
    model,
    requestedAt,
    content,
    usage: {
      promptTokens: typeof payload.usage?.prompt_tokens === "number" ? payload.usage.prompt_tokens : null,
      completionTokens: typeof payload.usage?.completion_tokens === "number" ? payload.usage.completion_tokens : null
    },
    warning: "AI 生成内容，不是专家真值；未写入 Revision 或数据库。",
    scopeNote: SCOPE_NOTE
  };
}
