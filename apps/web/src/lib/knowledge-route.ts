export type KnowledgeCitationTargetContext =
  | { kind: "chart_field"; caseId: string; revisionId: string; field: string }
  | { kind: "research_note"; noteId: string }
  | { kind: "event"; eventId: string }
  | { kind: "evidence_subject"; subjectId: string };

export type KnowledgeView = "library" | "rights" | "coverage";

export type KnowledgeReviewContextLocator = {
  caseId: string;
  revisionId: string;
  evidenceSubjectId: string;
  fieldPath: string;
};

export type KnowledgeRouteState = {
  view: KnowledgeView;
  query: string;
  documentId: string | null;
  sectionId: string | null;
  lineNumber: number | null;
  citationId: string | null;
  target: KnowledgeCitationTargetContext | null;
  reviewContextLocator: KnowledgeReviewContextLocator | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELD_PATTERN = /^pillars\.(year|month|day|hour)\.[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
const REVIEW_CONTEXT_FIELD_PATTERN = /^pillars\.(year|month|day|hour)\.(ganZhi|hiddenStems|stemTenGod|branchTenGods|wuXing|nayin|twelveGrowth|xun|voidBranches)$/;
const SECTION_PATTERN = /^section-[1-9]\d{0,8}$/;
const EVIDENCE_SUBJECT_PATTERN = /^[a-z][a-z0-9.-]{2,159}$/;
const MAX_KNOWLEDGE_SEARCH_LENGTH = 2_048;
const UNSAFE_ROUTE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const ALLOWED_ROUTE_KEYS = new Set([
  "view", "q", "document", "section", "line", "citation", "target",
  "case", "revision", "field", "note", "event", "subject", "review"
]);
const TARGET_PARAMETER_KEYS = ["case", "revision", "field", "note", "event", "subject"] as const;
const TARGET_ALLOWED_KEYS = {
  chart_field: new Set(["case", "revision", "field"]),
  research_note: new Set(["note"]),
  event: new Set(["event"]),
  evidence_subject: new Set(["subject"])
} satisfies Record<KnowledgeCitationTargetContext["kind"], ReadonlySet<string>>;

function emptyKnowledgeRouteState(): KnowledgeRouteState {
  return {
    view: "library",
    query: "",
    documentId: null,
    sectionId: null,
    lineNumber: null,
    citationId: null,
    target: null,
    reviewContextLocator: null
  };
}

function uuid(value: string | null): string | null {
  return value && UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function boundedText(value: string | null, maximum: number): string {
  return value && value.length <= maximum && !UNSAFE_ROUTE_TEXT_PATTERN.test(value) ? value : "";
}

function positiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseTarget(params: URLSearchParams): KnowledgeCitationTargetContext | null {
  const kind = params.get("target");
  if (kind === "chart_field") {
    const caseId = uuid(params.get("case"));
    const revisionId = uuid(params.get("revision"));
    const field = params.get("field");
    return caseId && revisionId && field && FIELD_PATTERN.test(field)
      ? { kind, caseId, revisionId, field }
      : null;
  }
  if (kind === "research_note") {
    const noteId = uuid(params.get("note"));
    return noteId ? { kind, noteId } : null;
  }
  if (kind === "event") {
    const eventId = uuid(params.get("event"));
    return eventId ? { kind, eventId } : null;
  }
  if (kind === "evidence_subject") {
    const subjectId = params.get("subject");
    return subjectId && EVIDENCE_SUBJECT_PATTERN.test(subjectId) ? { kind, subjectId } : null;
  }
  return null;
}

export function parseKnowledgeRoute(search: string): KnowledgeRouteState {
  if (search.length > MAX_KNOWLEDGE_SEARCH_LENGTH) return emptyKnowledgeRouteState();
  const params = new URLSearchParams(search);
  for (const key of params.keys()) {
    if (!ALLOWED_ROUTE_KEYS.has(key) || params.getAll(key).length !== 1) {
      return emptyKnowledgeRouteState();
    }
  }

  const requestedView = params.get("view");
  if (requestedView !== null && requestedView !== "library" && requestedView !== "rights" && requestedView !== "coverage") {
    return emptyKnowledgeRouteState();
  }
  const rawQuery = params.get("q");
  const query = boundedText(rawQuery, 200);
  if (rawQuery !== null && rawQuery !== query) return emptyKnowledgeRouteState();
  const rawDocumentId = params.get("document");
  const documentId = uuid(rawDocumentId);
  if (rawDocumentId !== null && documentId === null) return emptyKnowledgeRouteState();
  const rawSectionId = params.get("section");
  const sectionId = rawSectionId && SECTION_PATTERN.test(rawSectionId) ? rawSectionId : null;
  if (rawSectionId !== null && sectionId === null) return emptyKnowledgeRouteState();
  const rawLineNumber = params.get("line");
  const lineNumber = positiveInteger(rawLineNumber);
  if (rawLineNumber !== null && lineNumber === null) return emptyKnowledgeRouteState();
  const rawCitationId = params.get("citation");
  const citationId = uuid(rawCitationId);
  if (rawCitationId !== null && citationId === null) return emptyKnowledgeRouteState();

  const targetKind = params.get("target");
  const hasTargetParameters = TARGET_PARAMETER_KEYS.some((key) => params.has(key));
  let target: KnowledgeCitationTargetContext | null = null;
  if (targetKind === null) {
    if (hasTargetParameters) return emptyKnowledgeRouteState();
  } else {
    target = parseTarget(params);
    if (!target) return emptyKnowledgeRouteState();
    const allowedTargetKeys = TARGET_ALLOWED_KEYS[target.kind];
    if (TARGET_PARAMETER_KEYS.some((key) => params.has(key) && !allowedTargetKeys.has(key))) {
      return emptyKnowledgeRouteState();
    }
  }

  const rawReviewContext = params.get("review");
  let reviewContextLocator: KnowledgeReviewContextLocator | null = null;
  if (rawReviewContext !== null) {
    const [kind, rawCaseId, rawRevisionId, fieldPath, ...extra] = rawReviewContext.split(":");
    const caseId = uuid(rawCaseId ?? null);
    const revisionId = uuid(rawRevisionId ?? null);
    if (
      kind !== "revision_field"
      || extra.length !== 0
      || !caseId
      || !revisionId
      || !fieldPath
      || !REVIEW_CONTEXT_FIELD_PATTERN.test(fieldPath)
      || target?.kind !== "evidence_subject"
      || (requestedView !== null && requestedView !== "library")
    ) {
      return emptyKnowledgeRouteState();
    }
    reviewContextLocator = {
      caseId,
      revisionId,
      evidenceSubjectId: target.subjectId,
      fieldPath
    };
  }

  return {
    view: requestedView ?? "library",
    query,
    documentId,
    sectionId,
    lineNumber,
    citationId,
    target,
    reviewContextLocator
  };
}

export function buildKnowledgeSearch(state: Partial<KnowledgeRouteState>): string {
  const params = new URLSearchParams();
  if (
    state.view !== undefined &&
    state.view !== "library" &&
    state.view !== "rights" &&
    state.view !== "coverage"
  ) {
    throw new Error("无法生成未知的知识库视图。");
  }
  if (state.view && state.view !== "library") params.set("view", state.view);
  if (state.query !== undefined) {
    if (
      typeof state.query !== "string"
      || state.query.length > 200
      || UNSAFE_ROUTE_TEXT_PATTERN.test(state.query)
    ) {
      throw new Error("知识库查询文本不能超过 200 个字符且不能包含隐藏控制字符。");
    }
    if (state.query) params.set("q", state.query);
  }
  if (state.documentId !== undefined && state.documentId !== null) {
    if (!UUID_PATTERN.test(state.documentId)) throw new Error("知识文档引用必须是有效 UUID。");
    params.set("document", state.documentId.toLowerCase());
  }
  if (state.sectionId !== undefined && state.sectionId !== null) {
    if (!SECTION_PATTERN.test(state.sectionId)) throw new Error("知识章节引用格式无效。");
    params.set("section", state.sectionId);
  }
  if (state.lineNumber !== undefined && state.lineNumber !== null) {
    if (!Number.isSafeInteger(state.lineNumber) || state.lineNumber <= 0) {
      throw new Error("知识行号必须是正安全整数。");
    }
    params.set("line", String(state.lineNumber));
  }
  if (state.citationId !== undefined && state.citationId !== null) {
    if (!UUID_PATTERN.test(state.citationId)) throw new Error("知识引用必须是有效 UUID。");
    params.set("citation", state.citationId.toLowerCase());
  }
  const target = state.target;
  if (target?.kind === "chart_field") {
    if (!UUID_PATTERN.test(target.caseId) || !UUID_PATTERN.test(target.revisionId)) {
      throw new Error("图表字段目标必须携带有效案例与 Revision UUID。");
    }
    if (!FIELD_PATTERN.test(target.field)) throw new Error("图表字段目标格式无效。");
    params.set("target", target.kind);
    params.set("case", target.caseId.toLowerCase());
    params.set("revision", target.revisionId.toLowerCase());
    params.set("field", target.field);
  } else if (target?.kind === "research_note") {
    if (!UUID_PATTERN.test(target.noteId)) throw new Error("研究笔记目标必须是有效 UUID。");
    params.set("target", target.kind);
    params.set("note", target.noteId.toLowerCase());
  } else if (target?.kind === "event") {
    if (!UUID_PATTERN.test(target.eventId)) throw new Error("事件目标必须是有效 UUID。");
    params.set("target", target.kind);
    params.set("event", target.eventId.toLowerCase());
  } else if (target?.kind === "evidence_subject") {
    if (!EVIDENCE_SUBJECT_PATTERN.test(target.subjectId)) {
      throw new Error("证据主题目标格式无效。");
    }
    params.set("target", target.kind);
    params.set("subject", target.subjectId);
  } else if (target !== undefined && target !== null) {
    throw new Error("无法生成未知的知识引用目标。");
  }
  const reviewContextLocator = state.reviewContextLocator;
  if (reviewContextLocator !== undefined && reviewContextLocator !== null) {
    if (
      (state.view !== undefined && state.view !== "library")
      || target?.kind !== "evidence_subject"
      || reviewContextLocator.evidenceSubjectId !== target.subjectId
      || !UUID_PATTERN.test(reviewContextLocator.caseId)
      || !UUID_PATTERN.test(reviewContextLocator.revisionId)
      || !REVIEW_CONTEXT_FIELD_PATTERN.test(reviewContextLocator.fieldPath)
    ) {
      throw new Error("Revision 字段复核 locator 必须与证据主题目标精确一致。");
    }
    params.set(
      "review",
      `revision_field:${reviewContextLocator.caseId.toLowerCase()}:${reviewContextLocator.revisionId.toLowerCase()}:${reviewContextLocator.fieldPath}`
    );
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function knowledgeChartFieldHref(target: Extract<KnowledgeCitationTargetContext, { kind: "chart_field" }>): string {
  return `/knowledge${buildKnowledgeSearch({ target })}`;
}

export function knowledgeResearchNoteHref(noteId: string): string {
  return `/knowledge${buildKnowledgeSearch({ target: { kind: "research_note", noteId } })}`;
}

export function knowledgeEventHref(eventId: string): string {
  return `/knowledge${buildKnowledgeSearch({ target: { kind: "event", eventId } })}`;
}

export function knowledgeEvidenceSubjectHref(
  subjectId: string,
  reviewContextLocator?: KnowledgeReviewContextLocator
): string {
  return `/knowledge${buildKnowledgeSearch({
    target: { kind: "evidence_subject", subjectId },
    ...(reviewContextLocator ? { reviewContextLocator } : {})
  })}`;
}
