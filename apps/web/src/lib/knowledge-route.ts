export type KnowledgeCitationTargetContext =
  | { kind: "chart_field"; caseId: string; revisionId: string; field: string }
  | { kind: "research_note"; noteId: string }
  | { kind: "event"; eventId: string }
  | { kind: "evidence_subject"; subjectId: string };

export type KnowledgeView = "library" | "rights" | "coverage";

export type KnowledgeRouteState = {
  view: KnowledgeView;
  query: string;
  documentId: string | null;
  sectionId: string | null;
  lineNumber: number | null;
  citationId: string | null;
  target: KnowledgeCitationTargetContext | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELD_PATTERN = /^pillars\.(year|month|day|hour)\.[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
const SECTION_PATTERN = /^section-[1-9]\d{0,8}$/;
const EVIDENCE_SUBJECT_PATTERN = /^[a-z][a-z0-9.-]{2,159}$/;

function uuid(value: string | null): string | null {
  return value && UUID_PATTERN.test(value) ? value : null;
}

function boundedText(value: string | null, maximum: number): string {
  return value && value.length <= maximum ? value : "";
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
  const params = new URLSearchParams(search);
  const section = params.get("section");
  const requestedView = params.get("view");
  return {
    view: requestedView === "rights" || requestedView === "coverage" ? requestedView : "library",
    query: boundedText(params.get("q"), 200),
    documentId: uuid(params.get("document")),
    sectionId: section && SECTION_PATTERN.test(section) ? section : null,
    lineNumber: positiveInteger(params.get("line")),
    citationId: uuid(params.get("citation")),
    target: parseTarget(params)
  };
}

export function buildKnowledgeSearch(state: Partial<KnowledgeRouteState>): string {
  const params = new URLSearchParams();
  if (state.view && state.view !== "library") params.set("view", state.view);
  if (state.query) params.set("q", state.query.slice(0, 200));
  if (state.documentId) params.set("document", state.documentId);
  if (state.sectionId) params.set("section", state.sectionId);
  if (state.lineNumber) params.set("line", String(state.lineNumber));
  if (state.citationId) params.set("citation", state.citationId);
  const target = state.target;
  if (target?.kind === "chart_field") {
    params.set("target", target.kind);
    params.set("case", target.caseId);
    params.set("revision", target.revisionId);
    params.set("field", target.field);
  } else if (target?.kind === "research_note") {
    params.set("target", target.kind);
    params.set("note", target.noteId);
  } else if (target?.kind === "event") {
    params.set("target", target.kind);
    params.set("event", target.eventId);
  } else if (target?.kind === "evidence_subject") {
    params.set("target", target.kind);
    params.set("subject", target.subjectId);
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

export function knowledgeEvidenceSubjectHref(subjectId: string): string {
  return `/knowledge${buildKnowledgeSearch({ target: { kind: "evidence_subject", subjectId } })}`;
}
