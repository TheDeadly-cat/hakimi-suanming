import { researchQuerySchema, type ResearchQuery } from "@hakimi/contracts";
import { z } from "zod";

const DRAFT_STORAGE_PREFIX = "hakimi:research-query-draft:v1:";
const DRAFT_CONTRACT = "hakimi-research-query-draft@1" as const;
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
  return `${DRAFT_STORAGE_PREFIX}${draftId}`;
}

export function writeResearchQueryDraft(
  draftId: string,
  query: ResearchQuery,
  sourceViewId: string | null = null,
): ResearchQueryDraftEnvelope {
  uuidSchema.parse(draftId);
  const draft = draftEnvelopeSchema.parse({ contract: DRAFT_CONTRACT, query, sourceViewId });
  window.sessionStorage.setItem(storageKey(draftId), JSON.stringify(draft));
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
  const stored = window.sessionStorage.getItem(storageKey(draftId));
  if (stored === null) {
    return { draft: null, issue: "这个研究检索草稿不在当前标签页会话中，可能已关闭或失效；未执行任何回退。" };
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
  const matchingKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(DRAFT_STORAGE_PREFIX)) matchingKeys.push(key);
  }

  let removedDraftCount = 0;
  let failedDraftCount = 0;
  for (const key of matchingKeys) {
    try {
      storage.removeItem(key);
      removedDraftCount += 1;
    } catch {
      failedDraftCount += 1;
    }
  }
  return {
    matchedDraftCount: matchingKeys.length,
    removedDraftCount,
    failedDraftCount,
  };
}
