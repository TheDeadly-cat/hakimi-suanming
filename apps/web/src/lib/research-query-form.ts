import {
  PILLAR_RELATION_TYPES,
  normalizeResearchQueryText,
  researchQuerySchema,
  type ResearchQuery,
  type TransitNodeType,
} from "@hakimi/contracts";
import { createDefaultResearchQuery } from "@hakimi/research-query";

export type ResearchQueryScope = ResearchQuery["scope"];
export type ResearchRuleProfileOption = {
  digest: string;
  label: string;
  version: string;
};
export type TransitMatchDraft = {
  enabled: boolean;
  ganZhi: string;
  stemTenGod: string;
};

export type ResearchQueryFormState = {
  scope: ResearchQueryScope;
  text: string;
  lifecycle: "active" | "trashed" | "deleted" | "all";
  favorites: "any" | "only";
  revisionScope: "latest" | "any";
  tagsText: string;
  dayMasters: string[];
  monthBranches: string[];
  relationTypes: string[];
  ruleProfileDigests: string[];
  transitEnabled: boolean;
  transitUtcMinute: string;
  manualDirection: "" | "forward" | "backward";
  transitMatches: Record<TransitNodeType, TransitMatchDraft>;
  caseEventsEnabled: boolean;
  eventText: string;
  eventTagsText: string;
  feedbacks: string[];
  eventLifecycle: "active" | "deleted" | "all";
  caseEventBinding: "any" | "case_only" | "matched_revision" | "transit_node";
  eventBindingKind: "any" | "case_only" | "revision_bound" | "node_bound" | "context_case" | "context_revision" | "context_node";
  contextCaseId: string;
  contextRevisionId: string;
  contextNodeType: TransitNodeType;
  contextNodeId: string;
  knowledgeRecordTypes: string[];
  sortField: string;
  sortDirection: "asc" | "desc";
};

export const TRANSIT_NODE_TYPES: TransitNodeType[] = ["dayun", "xiaoyun", "year", "month", "day", "hour"];
export const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const RELATION_TYPES = [...PILLAR_RELATION_TYPES];

function emptyTransitMatches(): Record<TransitNodeType, TransitMatchDraft> {
  return Object.fromEntries(TRANSIT_NODE_TYPES.map((nodeType) => [nodeType, {
    enabled: false,
    ganZhi: "",
    stemTenGod: "",
  }])) as Record<TransitNodeType, TransitMatchDraft>;
}

export function defaultResearchQuery(scope: ResearchQueryScope = "cases"): ResearchQuery {
  switch (scope) {
    case "cases": return createDefaultResearchQuery("cases");
    case "candidate_sets": return createDefaultResearchQuery("candidate_sets");
    case "events": return createDefaultResearchQuery("events");
    case "knowledge": return createDefaultResearchQuery("knowledge");
  }
}

function queryTags(query: ResearchQuery): string[] {
  if (query.scope === "cases") return query.caseTags;
  if (query.scope === "knowledge") return [];
  return query.tags;
}

export function researchQueryToFormState(query: ResearchQuery): ResearchQueryFormState {
  const transitMatches = emptyTransitMatches();
  if (query.scope === "cases" && query.transit) {
    for (const match of query.transit.matches) {
      transitMatches[match.nodeType] = {
        enabled: true,
        ganZhi: match.ganZhi ?? "",
        stemTenGod: match.stemTenGod ?? "",
      };
    }
  }
  const eventBinding = query.scope === "events" ? query.binding : { kind: "any" as const };
  const caseEvents = query.scope === "cases" ? query.events : null;
  return {
    scope: query.scope,
    text: query.text,
    lifecycle: query.scope === "knowledge" ? "all" : query.lifecycle,
    favorites: query.scope === "cases" || query.scope === "candidate_sets" ? query.favorites : "any",
    revisionScope: query.scope === "cases" ? query.revisionScope : "latest",
    tagsText: queryTags(query).join("，"),
    dayMasters: query.scope === "cases" ? [...query.dayMasters] : [],
    monthBranches: query.scope === "cases" ? [...query.monthBranches] : [],
    relationTypes: query.scope === "cases" ? [...query.relationTypes] : [],
    ruleProfileDigests: query.scope === "cases" ? [...query.ruleProfileDigests] : [],
    transitEnabled: query.scope === "cases" && query.transit !== null,
    transitUtcMinute: query.scope === "cases" && query.transit ? query.transit.atInstant.slice(0, 16) : "",
    manualDirection: query.scope === "cases" && query.transit ? query.transit.manualDirection ?? "" : "",
    transitMatches,
    caseEventsEnabled: caseEvents !== null,
    eventText: query.scope === "events" ? query.text : caseEvents?.text ?? "",
    eventTagsText: (query.scope === "events" ? query.tags : caseEvents?.tags ?? []).join("，"),
    feedbacks: query.scope === "events" ? [...query.feedbacks] : [...(caseEvents?.feedbacks ?? [])],
    eventLifecycle: query.scope === "events" ? query.lifecycle : caseEvents?.lifecycle ?? "active",
    caseEventBinding: caseEvents?.binding ?? "any",
    eventBindingKind: eventBinding.kind,
    contextCaseId: "caseId" in eventBinding ? eventBinding.caseId : "",
    contextRevisionId: "revisionId" in eventBinding ? eventBinding.revisionId : "",
    contextNodeType: "nodeType" in eventBinding ? eventBinding.nodeType : "year",
    contextNodeId: "nodeId" in eventBinding ? eventBinding.nodeId : "",
    knowledgeRecordTypes: query.scope === "knowledge" ? [...query.recordTypes] : [],
    sortField: query.sort.field,
    sortDirection: query.sort.direction,
  };
}

function canonicalList(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function textList(value: string): string[] {
  return canonicalList(value.split(/[，,\n]/));
}

export function researchQueryFromFormState(state: ResearchQueryFormState):
  | { query: ResearchQuery; issue: null }
  | { query: null; issue: string } {
  const sort = { field: state.sortField, direction: state.sortDirection };
  let candidate: unknown;
  if (state.scope === "cases") {
    const transit = state.transitEnabled ? {
      atInstant: state.transitUtcMinute ? `${state.transitUtcMinute}:00.000Z` : "",
      manualDirection: state.manualDirection || null,
      matches: TRANSIT_NODE_TYPES.flatMap((nodeType) => {
        const match = state.transitMatches[nodeType];
        return match.enabled ? [{
          nodeType,
          ganZhi: match.ganZhi.trim() || null,
          stemTenGod: match.stemTenGod.trim() || null,
        }] : [];
      }),
    } : null;
    candidate = {
      version: 1,
      scope: state.scope,
      text: normalizeResearchQueryText(state.text),
      lifecycle: state.lifecycle,
      favorites: state.favorites,
      revisionScope: state.revisionScope,
      caseTags: textList(state.tagsText),
      dayMasters: canonicalList(state.dayMasters),
      monthBranches: canonicalList(state.monthBranches),
      relationTypes: canonicalList(state.relationTypes),
      ruleProfileDigests: canonicalList(state.ruleProfileDigests),
      transit,
      events: state.caseEventsEnabled ? {
        text: normalizeResearchQueryText(state.eventText),
        tags: textList(state.eventTagsText),
        feedbacks: canonicalList(state.feedbacks),
        lifecycle: state.eventLifecycle,
        binding: state.caseEventBinding,
      } : null,
      sort,
    };
  } else if (state.scope === "candidate_sets") {
    candidate = {
      version: 1,
      scope: state.scope,
      text: normalizeResearchQueryText(state.text),
      lifecycle: state.lifecycle,
      favorites: state.favorites,
      tags: textList(state.tagsText),
      sort,
    };
  } else if (state.scope === "events") {
    const binding = state.eventBindingKind === "context_case"
      ? { kind: state.eventBindingKind, caseId: state.contextCaseId.trim() }
      : state.eventBindingKind === "context_revision"
      ? { kind: state.eventBindingKind, caseId: state.contextCaseId.trim(), revisionId: state.contextRevisionId.trim() }
      : state.eventBindingKind === "context_node"
        ? {
            kind: state.eventBindingKind,
            caseId: state.contextCaseId.trim(),
            revisionId: state.contextRevisionId.trim(),
            nodeType: state.contextNodeType,
            nodeId: state.contextNodeId.trim(),
          }
        : { kind: state.eventBindingKind };
    candidate = {
      version: 1,
      scope: state.scope,
      text: normalizeResearchQueryText(state.text),
      tags: textList(state.tagsText),
      feedbacks: canonicalList(state.feedbacks),
      lifecycle: state.lifecycle,
      binding,
      sort,
    };
  } else {
    candidate = {
      version: 1,
      scope: state.scope,
      text: normalizeResearchQueryText(state.text),
      recordTypes: canonicalList(state.knowledgeRecordTypes),
      sort,
    };
  }
  const parsed = researchQuerySchema.safeParse(candidate);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { query: null, issue: `${first?.path.join(".") || "query"}：${first?.message ?? "查询条件无效"}` };
  }
  return { query: parsed.data, issue: null };
}

export function isDefaultResearchQuery(query: ResearchQuery): boolean {
  return JSON.stringify(query) === JSON.stringify(defaultResearchQuery(query.scope));
}
