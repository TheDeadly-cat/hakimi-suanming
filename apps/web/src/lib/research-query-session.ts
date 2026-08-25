import { researchQuerySchema, type ResearchQuery } from "@hakimi/contracts";
import { z } from "zod";

const DRAFT_STORAGE_PREFIX = "hakimi:research-query-draft:v1:";
const DRAFT_CONTRACT = "hakimi-research-query-draft@1" as const;
const MAX_DRAFT_STORAGE_CHARACTERS = 64 * 1024;
const MAX_SESSION_STORAGE_KEY_COUNT = 100_000;
const uuidSchema = z.string().uuid();
const draftEnvelopeSchema = z.strictObject({
  contract: z.literal(DRAFT_CONTRACT),
  query: researchQuerySchema,
  sourceViewId: uuidSchema.nullable(),
});

export type ResearchQueryDraftEnvelope = z.infer<typeof draftEnvelopeSchema>;
export type ResearchQueryDraftReadResult =
  | { draft: ResearchQueryDraftEnvelope; issue: null }
  | { draft: null; issue: string };

export type ResearchQueryDraftCleanupResult = {
  matchedDraftCount: number;
  removedDraftCount: number;
  failedDraftCount: number;
};

function storageKey(draftId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${draftId.toLowerCase()}`;
}

export function writeResearchQueryDraft(
  draftId: string,
  query: ResearchQuery,
  sourceViewId: string | null = null,
): ResearchQueryDraftEnvelope {
  uuidSchema.parse(draftId);
  const draft = draftEnvelopeSchema.parse({
    contract: DRAFT_CONTRACT,
    query,
    sourceViewId: sourceViewId?.toLowerCase() ?? null,
  });
  const serialized = JSON.stringify(draft);
  if (serialized.length > MAX_DRAFT_STORAGE_CHARACTERS) {
    throw new Error("研究检索草稿超过当前会话允许的安全体积，未写入浏览器存储。");
  }
  window.sessionStorage.setItem(storageKey(draftId), serialized);
  return draft;
}

export function createResearchQueryDraft(
  query: ResearchQuery,
  sourceViewId: string | null = null,
): { id: string; draft: ResearchQueryDraftEnvelope } {
  const id = crypto.randomUUID();
  return { id, draft: writeResearchQueryDraft(id, query, sourceViewId) };
}

export function readResearchQueryDraft(draftId: string): ResearchQueryDraftReadResult {
  if (!uuidSchema.safeParse(draftId).success) {
    return { draft: null, issue: "研究检索草稿引用不是有效 UUID；未执行任何回退。" };
  }
  let stored: string | null;
  try {
    stored = window.sessionStorage.getItem(storageKey(draftId));
  } catch {
    return { draft: null, issue: "当前标签页无法读取研究检索会话存储；未执行任何回退。" };
  }
  if (stored === null) {
    return { draft: null, issue: "这个研究检索草稿不在当前标签页会话中，可能已关闭或失效；未执行任何回退。" };
  }
  if (stored.length > MAX_DRAFT_STORAGE_CHARACTERS) {
    return { draft: null, issue: "研究检索草稿体积异常；为避免解析不完整条件，未执行任何回退。" };
  }
  try {
    const parsed = draftEnvelopeSchema.safeParse(JSON.parse(stored));
    return parsed.success
      ? { draft: parsed.data, issue: null }
      : { draft: null, issue: "研究检索草稿内容已损坏或版本未知；未执行任何回退。" };
  } catch {
    return { draft: null, issue: "研究检索草稿不是有效 JSON；未执行任何回退。" };
  }
}

export function removeResearchQueryDraft(draftId: string): void {
  if (!uuidSchema.safeParse(draftId).success) return;
  window.sessionStorage.removeItem(storageKey(draftId));
}

/**
 * Removes only this application's ephemeral ResearchQuery drafts. Other
 * sessionStorage keys belong to the host page or another same-origin feature
 * and must never be swept by the user-data cleanup path.
 */
export function clearResearchQueryDrafts(
  storage: Pick<Storage, "length" | "key" | "removeItem"> = window.sessionStorage,
): ResearchQueryDraftCleanupResult {
  const listMatchingKeys = (): Set<string> => {
    const length = storage.length;
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_SESSION_STORAGE_KEY_COUNT) {
      throw new RangeError("当前会话存储键数量超过草稿清理安全枚举上限。");
    }
    const keys = new Set<string>();
    for (let index = 0; index < length; index += 1) {
      const key = storage.key(index);
      if (key !== null && typeof key !== "string") {
        throw new TypeError("当前会话存储返回了无效键名。");
      }
      if (key?.startsWith(DRAFT_STORAGE_PREFIX)) keys.add(key);
    }
    return keys;
  };

  const matchingKeys = listMatchingKeys();
  for (const key of matchingKeys) {
    try {
      storage.removeItem(key);
    } catch {
      // The verification pass below remains authoritative for completion.
    }
  }

  const remainingKeys = listMatchingKeys();
  for (const key of remainingKeys) matchingKeys.add(key);
  let failedDraftCount = 0;
  for (const key of matchingKeys) {
    if (remainingKeys.has(key)) failedDraftCount += 1;
  }
  return Object.freeze({
    matchedDraftCount: matchingKeys.size,
    removedDraftCount: matchingKeys.size - failedDraftCount,
    failedDraftCount,
  });
}
