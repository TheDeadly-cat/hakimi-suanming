import {
  RESEARCH_QUERY_VERSION,
  normalizeResearchQueryText,
  researchQuerySchema,
  type EventRecord,
  type ResearchEventQuery
} from "@hakimi/contracts";

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function buildEventResearchQuery(record: EventRecord): ResearchEventQuery {
  const binding: ResearchEventQuery["binding"] =
    record.revisionId && record.transitNodeRef?.namespace === "hakimi-transit-node"
      ? {
          kind: "context_node",
          caseId: record.caseId,
          revisionId: record.revisionId,
          nodeType: record.transitNodeRef.nodeType,
          nodeId: record.transitNodeRef.nodeId
        }
      : record.revisionId
        ? { kind: "context_revision", caseId: record.caseId, revisionId: record.revisionId }
        : { kind: "context_case", caseId: record.caseId };

  return researchQuerySchema.parse({
    version: RESEARCH_QUERY_VERSION,
    scope: "events",
    text: normalizeResearchQueryText(record.title),
    tags: [...record.tags].sort(compareCodePoint),
    feedbacks: [record.feedback],
    lifecycle: record.deletedAt === null ? "active" : "deleted",
    binding,
    sort: { field: "updatedAt", direction: "desc" }
  }) as ResearchEventQuery;
}
