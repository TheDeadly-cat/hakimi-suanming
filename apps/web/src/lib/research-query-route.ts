import { isResearchResultKey } from "@hakimi/research-query";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_KEYS = new Set(["draft", "view", "result"]);
const ALLOWED_SOURCES = new Set(["default", "draft", "view"]);
const MAX_SEARCH_LENGTH = 512;

export type ResearchQueryRouteState = {
  source: "default" | "draft" | "view";
  referenceId: string | null;
  resultKey: string | null;
};

export type ResearchQueryRouteParseResult =
  | { state: ResearchQueryRouteState; issue: null }
  | { state: null; issue: string };

function oneValue(params: URLSearchParams, key: string): string | null | undefined {
  const values = params.getAll(key);
  if (values.length > 1) return undefined;
  return values[0] ?? null;
}

function validUuid(value: string | null): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function isStrictResearchResultKey(value: string): boolean {
  return value.length <= 80 && isResearchResultKey(value);
}

export function parseResearchQueryRoute(search: string): ResearchQueryRouteParseResult {
  if (search.length > MAX_SEARCH_LENGTH) {
    return { state: null, issue: "研究检索链接超过允许长度；为避免解释截断条件，未执行任何回退。" };
  }
  const params = new URLSearchParams(search);
  const unknownKeys = [...new Set([...params.keys()].filter((key) => !ALLOWED_KEYS.has(key)))];
  if (unknownKeys.length) {
    return { state: null, issue: `研究检索链接包含 ${unknownKeys.length} 个未知参数；参数名可能含有私密检索词，因此未回显。为保护查询语义，未执行任何回退。` };
  }

  const draftId = oneValue(params, "draft");
  const viewId = oneValue(params, "view");
  const resultKey = oneValue(params, "result");
  if (draftId === undefined || viewId === undefined || resultKey === undefined) {
    return { state: null, issue: "研究检索链接包含重复参数；未执行任何回退。" };
  }
  if (draftId && viewId) {
    return { state: null, issue: "研究检索链接不能同时引用草稿与保存视图；未执行任何回退。" };
  }
  if (draftId !== null && !validUuid(draftId)) {
    return { state: null, issue: "研究检索草稿引用不是有效 UUID；未执行任何回退。" };
  }
  if (viewId !== null && !validUuid(viewId)) {
    return { state: null, issue: "研究检索保存视图引用不是有效 UUID；未执行任何回退。" };
  }
  if (resultKey !== null && !isStrictResearchResultKey(resultKey)) {
    return { state: null, issue: "研究检索结果引用格式无效；不会定位到近似结果。" };
  }

  return {
    state: {
      source: draftId ? "draft" : viewId ? "view" : "default",
      referenceId: (draftId ?? viewId)?.toLowerCase() ?? null,
      resultKey,
    },
    issue: null,
  };
}

export function buildResearchQuerySearch(state: ResearchQueryRouteState): string {
  if (!ALLOWED_SOURCES.has(state.source)) {
    throw new Error("研究查询路由来源无效。");
  }
  if (state.source === "default" && state.referenceId !== null) {
    throw new Error("默认研究查询不能携带引用 UUID。");
  }
  if (state.source !== "default" && !validUuid(state.referenceId)) {
    throw new Error("研究查询引用必须是有效 UUID。");
  }
  if (state.resultKey !== null && !isStrictResearchResultKey(state.resultKey)) {
    throw new Error("无法生成无效的研究结果深链。");
  }

  const params = new URLSearchParams();
  if (state.source === "draft") params.set("draft", state.referenceId!.toLowerCase());
  if (state.source === "view") params.set("view", state.referenceId!.toLowerCase());
  if (state.resultKey) params.set("result", state.resultKey);
  const value = params.toString();
  return value ? `?${value}` : "";
}
