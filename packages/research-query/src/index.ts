import {
  RESEARCH_QUERY_VERSION,
  fullBackupCandidateSetRecordSchema,
  fullBackupCaseRecordSchema,
  fullBackupEventRecordSchema,
  fullBackupKnowledgeDocumentRecordSchema,
  fullBackupResearchNoteRecordSchema,
  fullBackupRevisionCalculationReceiptRecordSchema,
  fullBackupRevisionRecordSchema,
  normalizeResearchQueryText,
  researchQuerySchema,
  type CandidateSetRecord,
  type CaseRecord,
  type EventRecord,
  type KnowledgeDocumentRecord,
  type ResearchCandidateSetQuery,
  type ResearchCaseQuery,
  type ResearchEventQuery,
  type ResearchKnowledgeQuery,
  type ResearchNoteRecord,
  type ResearchQuery,
  type RevisionCalculationReceiptRecord,
  type RevisionRecord,
  type TransitNode,
  type TransitNodeType
} from "@hakimi/contracts";
import {
  verifyCandidateSetRecordIntegrity,
  verifyRevisionRecordIntegrity
} from "@hakimi/chart-integrity";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { verifyKnowledgeDocumentIntegrity } from "@hakimi/knowledge-core";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  RevisionDerivedReplayError,
  resolveRevisionCalculationSource,
  verifyRevisionCalculationReceiptSourceBinding,
  type RevisionCalculationReceipt,
  type RevisionCalculationSourceComponentStatuses,
  type RevisionCalculationSourceResolution
} from "@hakimi/revision-replay";
import { verifyEventTimeContext } from "@hakimi/time-core";
import {
  TRANSIT_TIMELINE_VERSION,
  verifyCompatibleTransitNodeRef
} from "@hakimi/transit-core";
import { z } from "zod";

export const RESEARCH_QUERY_ENGINE = Object.freeze({
  name: "hakimi-research-query" as const,
  version: "0.2.0" as const,
  queryVersion: RESEARCH_QUERY_VERSION,
  textMode: "nfkc-all-terms-substring-v1" as const,
  relationEngine: "hakimi-relations-core@0.1.0" as const,
  transitTimeline: TRANSIT_TIMELINE_VERSION,
  derivedReplayProfile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId
});

export const RESEARCH_QUERY_EXPORT = Object.freeze({
  format: "hakimi-research-query-export" as const,
  formatVersion: "1.1.0" as const,
  digestAlgorithm: "sha256-canonical-json-v1" as const,
  privacy: "full_local_research" as const,
  sensitiveDataWarning: "导出包含检索词、标签、别名、事件命中及本地精确 ID；请按敏感研究资料保管。" as const
});

export type ResearchQuerySnapshot = {
  cases: readonly CaseRecord[];
  revisions: readonly RevisionRecord[];
  candidateSets: readonly CandidateSetRecord[];
  researchNotes: readonly ResearchNoteRecord[];
  events: readonly EventRecord[];
  knowledgeDocuments: readonly KnowledgeDocumentRecord[];
  /** Optional only for source compatibility with pre-v15 callers. */
  revisionCalculationReceiptLedgerStatus?: "available" | "schema_unavailable";
  /** Optional only for source compatibility with pre-v15 callers. */
  revisionCalculationReceipts?: readonly RevisionCalculationReceiptRecord[];
};

export type ResearchQueryProgress = {
  phase: "verify" | "filter" | "finalize";
  completed: number;
  total: number;
};

export type ExecuteResearchQueryOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: ResearchQueryProgress) => void;
  dataEpoch?: string;
  now?: () => string;
  yieldEvery?: number;
};

export type ResearchQueryDiagnostic = {
  kind: "not_evaluable" | "warning";
  code: string;
  subjectId: string | null;
  revisionId: string | null;
  message: string;
};

export type ResearchTransitMatch = {
  revisionId: string;
  nodeType: TransitNodeType;
  nodeId: string;
  ganZhi: string;
  stemTenGod: string;
  startInstant: string;
  endExclusiveInstant: string;
};

export type ResearchMatchedRevision = {
  revisionId: string;
  revisionNumber: number;
  resultHash: string;
  ruleProfileDigest: string;
  dayMaster: string;
  monthBranch: string;
  relationFactIds: string[];
  transitMatches: ResearchTransitMatch[];
  calculationSource: ResearchCalculationSource | null;
};

export type ResearchCalculationSourceComponentStatus = {
  projectionStatus: "projected" | "unavailable" | "not_requested";
  replayedStatus: "projected" | "unavailable" | "not_requested" | null;
  comparisonStatus: "matched" | "mismatch" | "exact_executor_unavailable" | "not_applicable";
};

export type ResearchCalculationSource = {
  source: "stored_receipt" | "explicit_projection";
  ledgerStatus: "available" | "schema_unavailable";
  captureKind: "revision_creation_baseline" | "explicit_calculation_snapshot";
  storedHistoricalOutputCompared: boolean;
  comparisonStatus: "matched" | "mismatch" | "exact_executor_unavailable" | "not_applicable";
  profileId: string;
  projectionDigest: string;
  requestFingerprint: string;
  receipt: null | {
    id: string;
    createdAt: string;
    receiptDigest: string;
    requestFingerprint: string;
  };
  componentStatuses: {
    relations: ResearchCalculationSourceComponentStatus;
    luckCycle: ResearchCalculationSourceComponentStatus;
    transit: ResearchCalculationSourceComponentStatus;
  };
};

type ResearchResultBase = {
  key: string;
  scope: ResearchQuery["scope"];
  title: string;
  alias: string;
  createdAt: string;
  updatedAt: string;
  relevanceScore: number;
  matchReasons: string[];
  matchingNoteIds: string[];
  matchingEventIds: string[];
};

export type ResearchCaseResult = ResearchResultBase & {
  scope: "cases";
  key: `case:${string}`;
  caseId: string;
  lifecycle: "active" | "trashed";
  favorite: boolean;
  matchedRevisionIds: string[];
  revisions: ResearchMatchedRevision[];
  transitMatches: ResearchTransitMatch[];
};

export type ResearchCandidateSetResult = ResearchResultBase & {
  scope: "candidate_sets";
  key: `candidate_set:${string}`;
  candidateSetId: string;
  lifecycle: "active" | "trashed";
  favorite: boolean;
  snapshotDigest: string;
  resultHash: string;
};

export type ResearchEventResult = ResearchResultBase & {
  scope: "events";
  key: `event:${string}`;
  eventId: string;
  caseId: string;
  revisionId: string | null;
  transitNodeId: string | null;
  lifecycle: "active" | "deleted";
  feedback: EventRecord["feedback"];
};

export type ResearchKnowledgeResult = ResearchResultBase & {
  scope: "knowledge";
  key: `knowledge:${string}`;
  documentId: string;
  recordType: KnowledgeDocumentRecord["recordType"];
  matchingFields: string[];
};

export type ResearchQueryResult =
  | ResearchCaseResult
  | ResearchCandidateSetResult
  | ResearchEventResult
  | ResearchKnowledgeResult;

export type ResearchQueryExecution = {
  engine: typeof RESEARCH_QUERY_ENGINE;
  query: ResearchQuery;
  queryDigest: string;
  dataEpoch: string;
  executedAt: string;
  total: number;
  results: ResearchQueryResult[];
  diagnostics: ResearchQueryDiagnostic[];
  resultDigest: string;
};

export type ResearchQueryExportEnvelope = {
  manifest: {
    format: typeof RESEARCH_QUERY_EXPORT.format;
    formatVersion: typeof RESEARCH_QUERY_EXPORT.formatVersion;
    queryVersion: typeof RESEARCH_QUERY_VERSION;
    engine: typeof RESEARCH_QUERY_ENGINE;
    appVersion: string;
    exportedAt: string;
    digestAlgorithm: typeof RESEARCH_QUERY_EXPORT.digestAlgorithm;
    privacy: typeof RESEARCH_QUERY_EXPORT.privacy;
    sensitiveDataWarning: typeof RESEARCH_QUERY_EXPORT.sensitiveDataWarning;
    total: number;
  };
  digests: {
    query: string;
    results: string;
    diagnostics: string;
    payload: string;
    envelope: string;
  };
  payload: {
    query: ResearchQuery;
    queryDigest: string;
    dataEpoch: string;
    total: number;
    results: ResearchQueryResult[];
    diagnostics: ResearchQueryDiagnostic[];
    resultDigest: string;
  };
};

export type ResearchQueryExecutionErrorCode =
  | "INVALID_QUERY"
  | "INVALID_DATASET"
  | "ABORTED"
  | "INVALID_DATA_EPOCH";

export class ResearchQueryExecutionError extends Error {
  constructor(
    readonly code: ResearchQueryExecutionErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ResearchQueryExecutionError";
  }
}

type VerifiedDataset = {
  cases: CaseRecord[];
  revisions: RevisionRecord[];
  candidateSets: CandidateSetRecord[];
  researchNotes: ResearchNoteRecord[];
  events: EventRecord[];
  knowledgeDocuments: KnowledgeDocumentRecord[];
  revisionCalculationReceiptLedgerStatus: "available" | "schema_unavailable";
  revisionCalculationReceipts: RevisionCalculationReceipt[];
  revisionCalculationReceiptsByRevision: ReadonlyMap<string, RevisionCalculationReceipt[]>;
};

type TextField = {
  name: string;
  value: string;
  noteId?: string;
  eventId?: string;
};

type TextMatch = {
  matched: boolean;
  fields: string[];
  noteIds: string[];
  eventIds: string[];
};

type RevisionMatch = {
  revision: RevisionRecord;
  relationFactIds: string[];
  transitMatches: ResearchTransitMatch[];
  calculationSource: ResearchCalculationSource | null;
};

const EMPTY_TEXT_MATCH: TextMatch = {
  matched: true,
  fields: [],
  noteIds: [],
  eventIds: []
};

const RESULT_KEY_PATTERN = /^(?:case|candidate_set|event|knowledge):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const canonicalInstantSchema = z.string().datetime({ offset: true }).refine(
  (value) => new Date(value).toISOString() === value,
  "时间必须是规范 ISO 瞬时点"
);
const stringSetSchema = z.array(z.string()).refine(
  (values) => values.every((value, index) => index === 0 || values[index - 1]! < value),
  "集合必须去重并按代码点排序"
);
const transitMatchResultSchema = z.strictObject({
  revisionId: z.string().uuid(),
  nodeType: z.enum(["dayun", "xiaoyun", "year", "month", "day", "hour"]),
  nodeId: z.string().min(1),
  ganZhi: z.string().min(1),
  stemTenGod: z.string().min(1),
  startInstant: z.string().datetime({ offset: true }),
  endExclusiveInstant: z.string().datetime({ offset: true })
});
const calculationSourceComponentStatusSchema = z.strictObject({
  projectionStatus: z.enum(["projected", "unavailable", "not_requested"]),
  replayedStatus: z.enum(["projected", "unavailable", "not_requested"]).nullable(),
  comparisonStatus: z.enum(["matched", "mismatch", "exact_executor_unavailable", "not_applicable"])
});
const calculationSourceSchema = z.strictObject({
  source: z.enum(["stored_receipt", "explicit_projection"]),
  ledgerStatus: z.enum(["available", "schema_unavailable"]),
  captureKind: z.enum(["revision_creation_baseline", "explicit_calculation_snapshot"]),
  storedHistoricalOutputCompared: z.boolean(),
  comparisonStatus: z.enum(["matched", "mismatch", "exact_executor_unavailable", "not_applicable"]),
  profileId: z.string().min(1),
  projectionDigest: sha256Schema,
  requestFingerprint: sha256Schema,
  receipt: z.strictObject({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    receiptDigest: sha256Schema,
    requestFingerprint: sha256Schema
  }).nullable(),
  componentStatuses: z.strictObject({
    relations: calculationSourceComponentStatusSchema,
    luckCycle: calculationSourceComponentStatusSchema,
    transit: calculationSourceComponentStatusSchema
  })
});
const matchedRevisionResultSchema = z.strictObject({
  revisionId: z.string().uuid(),
  revisionNumber: z.number().int().positive(),
  resultHash: sha256Schema,
  ruleProfileDigest: sha256Schema,
  dayMaster: z.string().length(1),
  monthBranch: z.string().length(1),
  relationFactIds: stringSetSchema,
  transitMatches: z.array(transitMatchResultSchema),
  calculationSource: calculationSourceSchema.nullable()
});
const resultBaseShape = {
  title: z.string(),
  alias: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  relevanceScore: z.number().int().nonnegative(),
  matchReasons: stringSetSchema,
  matchingNoteIds: z.array(z.string().uuid()).refine(
    (values) => values.every((value, index) => index === 0 || values[index - 1]! < value),
    "笔记 ID 必须去重并排序"
  ),
  matchingEventIds: z.array(z.string().uuid()).refine(
    (values) => values.every((value, index) => index === 0 || values[index - 1]! < value),
    "事件 ID 必须去重并排序"
  )
} as const;
const caseResultSchema = z.strictObject({
  ...resultBaseShape,
  scope: z.literal("cases"),
  key: z.string().regex(/^case:[0-9a-f-]{36}$/i),
  caseId: z.string().uuid(),
  lifecycle: z.enum(["active", "trashed"]),
  favorite: z.boolean(),
  matchedRevisionIds: z.array(z.string().uuid()),
  revisions: z.array(matchedRevisionResultSchema).min(1),
  transitMatches: z.array(transitMatchResultSchema)
}).superRefine((value, context) => {
  if (value.key !== `case:${value.caseId}`) {
    context.addIssue({ code: "custom", path: ["key"], message: "Case 结果键必须绑定 caseId" });
  }
  const revisionIds = value.revisions.map((revision) => revision.revisionId);
  if (canonicalStringify(value.matchedRevisionIds) !== canonicalStringify(revisionIds)) {
    context.addIssue({ code: "custom", path: ["matchedRevisionIds"], message: "命中修订 ID 必须与修订投影完全一致" });
  }
});
const candidateResultSchema = z.strictObject({
  ...resultBaseShape,
  scope: z.literal("candidate_sets"),
  key: z.string().regex(/^candidate_set:[0-9a-f-]{36}$/i),
  candidateSetId: z.string().uuid(),
  lifecycle: z.enum(["active", "trashed"]),
  favorite: z.boolean(),
  snapshotDigest: sha256Schema,
  resultHash: sha256Schema
}).refine((value) => value.key === `candidate_set:${value.candidateSetId}`, {
  path: ["key"], message: "CandidateSet 结果键必须绑定 candidateSetId"
});
const eventResultSchema = z.strictObject({
  ...resultBaseShape,
  scope: z.literal("events"),
  key: z.string().regex(/^event:[0-9a-f-]{36}$/i),
  eventId: z.string().uuid(),
  caseId: z.string().uuid(),
  revisionId: z.string().uuid().nullable(),
  transitNodeId: z.string().nullable(),
  lifecycle: z.enum(["active", "deleted"]),
  feedback: z.enum(["unreviewed", "supports", "contradicts", "mixed"])
}).refine((value) => value.key === `event:${value.eventId}`, {
  path: ["key"], message: "Event 结果键必须绑定 eventId"
});
const knowledgeResultSchema = z.strictObject({
  ...resultBaseShape,
  scope: z.literal("knowledge"),
  key: z.string().regex(/^knowledge:[0-9a-f-]{36}$/i),
  documentId: z.string().uuid(),
  recordType: z.enum(["user_knowledge_document", "bundled_knowledge_document"]),
  matchingFields: stringSetSchema
}).refine((value) => value.key === `knowledge:${value.documentId}`, {
  path: ["key"], message: "Knowledge 结果键必须绑定 documentId"
});
const researchQueryResultSchema = z.discriminatedUnion("scope", [
  caseResultSchema,
  candidateResultSchema,
  eventResultSchema,
  knowledgeResultSchema
]);
const researchQueryDiagnosticSchema = z.strictObject({
  kind: z.enum(["not_evaluable", "warning"]),
  code: z.string().min(1),
  subjectId: z.string().uuid().nullable(),
  revisionId: z.string().uuid().nullable(),
  message: z.string().min(1)
});
const exportPayloadSchema = z.strictObject({
  query: researchQuerySchema,
  queryDigest: sha256Schema,
  dataEpoch: sha256Schema,
  total: z.number().int().nonnegative(),
  results: z.array(researchQueryResultSchema),
  diagnostics: z.array(researchQueryDiagnosticSchema),
  resultDigest: sha256Schema
}).superRefine((value, context) => {
  if (value.total !== value.results.length) {
    context.addIssue({ code: "custom", path: ["total"], message: "total 必须等于结果数量" });
  }
  value.results.forEach((result, index) => {
    if (result.scope !== value.query.scope) {
      context.addIssue({ code: "custom", path: ["results", index, "scope"], message: "结果 scope 必须与查询一致" });
    }
  });
});
const exportManifestSchema = z.strictObject({
  format: z.literal(RESEARCH_QUERY_EXPORT.format),
  formatVersion: z.literal(RESEARCH_QUERY_EXPORT.formatVersion),
  queryVersion: z.literal(RESEARCH_QUERY_VERSION),
  engine: z.strictObject({
    name: z.literal(RESEARCH_QUERY_ENGINE.name),
    version: z.literal(RESEARCH_QUERY_ENGINE.version),
    queryVersion: z.literal(RESEARCH_QUERY_VERSION),
    textMode: z.literal(RESEARCH_QUERY_ENGINE.textMode),
    relationEngine: z.literal(RESEARCH_QUERY_ENGINE.relationEngine),
    transitTimeline: z.literal(RESEARCH_QUERY_ENGINE.transitTimeline),
    derivedReplayProfile: z.literal(RESEARCH_QUERY_ENGINE.derivedReplayProfile)
  }),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: canonicalInstantSchema,
  digestAlgorithm: z.literal(RESEARCH_QUERY_EXPORT.digestAlgorithm),
  privacy: z.literal(RESEARCH_QUERY_EXPORT.privacy),
  sensitiveDataWarning: z.literal(RESEARCH_QUERY_EXPORT.sensitiveDataWarning),
  total: z.number().int().nonnegative()
});
const exportDigestsSchema = z.strictObject({
  query: sha256Schema,
  results: sha256Schema,
  diagnostics: sha256Schema,
  payload: sha256Schema,
  envelope: sha256Schema
});
const researchQueryExportEnvelopeSchema = z.strictObject({
  manifest: exportManifestSchema,
  digests: exportDigestsSchema,
  payload: exportPayloadSchema
}).superRefine((value, context) => {
  if (value.manifest.total !== value.payload.total) {
    context.addIssue({ code: "custom", path: ["manifest", "total"], message: "manifest.total 必须与 payload.total 一致" });
  }
});

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareCodePoint);
}

export function tokenizeResearchText(value: string): string[] {
  const normalized = normalizeResearchQueryText(value);
  return normalized === "" ? [] : normalized.split(" ");
}

function matchText(rawQuery: string, fields: readonly TextField[]): TextMatch {
  const terms = tokenizeResearchText(rawQuery);
  if (terms.length === 0) return EMPTY_TEXT_MATCH;
  const normalized = fields.map((field) => ({ field, value: normalizeResearchQueryText(field.value) }));
  if (!terms.every((term) => normalized.some((entry) => entry.value.includes(term)))) {
    return { matched: false, fields: [], noteIds: [], eventIds: [] };
  }
  const matching = normalized.filter((entry) => terms.some((term) => entry.value.includes(term)));
  return {
    matched: true,
    fields: uniqueSorted(matching.map((entry) => entry.field.name)),
    noteIds: uniqueSorted(matching.flatMap((entry) => entry.field.noteId ? [entry.field.noteId] : [])),
    eventIds: uniqueSorted(matching.flatMap((entry) => entry.field.eventId ? [entry.field.eventId] : []))
  };
}

function matchesAny<T>(selected: readonly T[], actual: T): boolean {
  return selected.length === 0 || selected.includes(actual);
}

function intersects(selected: readonly string[], actual: readonly string[]): boolean {
  return selected.length === 0 || selected.some((value) => actual.includes(value));
}

function lifecycleMatches(
  selected: "active" | "trashed" | "all",
  deletedAt: string | null
): boolean {
  return selected === "all" || (selected === "active" ? deletedAt === null : deletedAt !== null);
}

function eventLifecycleMatches(
  selected: "active" | "deleted" | "all",
  deletedAt: string | null
): boolean {
  return selected === "all" || (selected === "active" ? deletedAt === null : deletedAt !== null);
}

function ensureNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ResearchQueryExecutionError("ABORTED", "研究查询已取消。");
  }
}

async function cooperativeYield(index: number, options: ExecuteResearchQueryOptions): Promise<void> {
  ensureNotAborted(options.signal);
  const yieldEvery = Math.max(1, options.yieldEvery ?? 50);
  if (index > 0 && index % yieldEvery === 0) {
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
    ensureNotAborted(options.signal);
  }
}

function failDataset(message: string, cause?: unknown): never {
  throw new ResearchQueryExecutionError("INVALID_DATASET", message, cause === undefined ? undefined : { cause });
}

function ensureUniqueIds<T extends { id: string }>(records: readonly T[], label: string): void {
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) failDataset(`${label} 存在重复 ID：${record.id}`);
    ids.add(record.id);
  }
}

async function verifyDataset(
  snapshot: ResearchQuerySnapshot,
  options: ExecuteResearchQueryOptions
): Promise<VerifiedDataset> {
  const revisionCalculationReceiptLedgerStatus =
    snapshot.revisionCalculationReceiptLedgerStatus ?? "schema_unavailable";
  const rawRevisionCalculationReceipts = snapshot.revisionCalculationReceipts ?? [];
  const total = snapshot.cases.length + snapshot.revisions.length + snapshot.candidateSets.length +
    snapshot.researchNotes.length + snapshot.events.length + snapshot.knowledgeDocuments.length +
    rawRevisionCalculationReceipts.length;
  let completed = 0;
  const advance = async (): Promise<void> => {
    completed += 1;
    options.onProgress?.({ phase: "verify", completed, total });
    await cooperativeYield(completed, options);
  };

  try {
    const cases: CaseRecord[] = [];
    for (const raw of snapshot.cases) {
      cases.push(fullBackupCaseRecordSchema.parse(raw));
      await advance();
    }
    const revisions: RevisionRecord[] = [];
    for (const raw of snapshot.revisions) {
      revisions.push(await verifyRevisionRecordIntegrity(fullBackupRevisionRecordSchema.parse(raw)));
      await advance();
    }
    const candidateSets: CandidateSetRecord[] = [];
    for (const raw of snapshot.candidateSets) {
      candidateSets.push(await verifyCandidateSetRecordIntegrity(fullBackupCandidateSetRecordSchema.parse(raw)));
      await advance();
    }
    const researchNotes: ResearchNoteRecord[] = [];
    for (const raw of snapshot.researchNotes) {
      researchNotes.push(fullBackupResearchNoteRecordSchema.parse(raw));
      await advance();
    }
    const events: EventRecord[] = [];
    for (const raw of snapshot.events) {
      const event = fullBackupEventRecordSchema.parse(raw);
      verifyEventTimeContext({
        datePrecision: event.datePrecision,
        startDate: event.startDate,
        endDate: event.endDate,
        timeContext: event.timeContext
      });
      events.push(event);
      await advance();
    }
    const knowledgeDocuments: KnowledgeDocumentRecord[] = [];
    for (const raw of snapshot.knowledgeDocuments) {
      knowledgeDocuments.push(await verifyKnowledgeDocumentIntegrity(fullBackupKnowledgeDocumentRecordSchema.parse(raw)));
      await advance();
    }

    ensureUniqueIds(cases, "案例分区");
    ensureUniqueIds(revisions, "修订分区");
    ensureUniqueIds(candidateSets, "候选组分区");
    ensureUniqueIds(researchNotes, "笔记分区");
    ensureUniqueIds(events, "事件分区");
    ensureUniqueIds(knowledgeDocuments, "知识分区");

    if (revisionCalculationReceiptLedgerStatus === "schema_unavailable" && rawRevisionCalculationReceipts.length > 0) {
      failDataset("schema_unavailable 的计算收据账本不得包含收据。");
    }

    const caseById = new Map(cases.map((record) => [record.id, record]));
    const candidateById = new Map(candidateSets.map((record) => [record.id, record]));
    for (const id of caseById.keys()) {
      if (candidateById.has(id)) failDataset(`正式案例与候选组共享主体 ID：${id}`);
    }
    const revisionById = new Map(revisions.map((record) => [record.id, record]));
    const revisionCalculationReceipts: RevisionCalculationReceipt[] = [];
    const revisionCalculationReceiptsByRevision = new Map<string, RevisionCalculationReceipt[]>();
    const receiptFingerprintsByRevision = new Map<string, Set<string>>();
    for (const raw of rawRevisionCalculationReceipts) {
      const parsed = fullBackupRevisionCalculationReceiptRecordSchema.parse(raw);
      const revision = revisionById.get(parsed.sourceRevision.revisionId);
      if (!revision) {
        failDataset(`计算收据 ${parsed.id} 引用了不存在的 Revision。`);
      }
      const receipt = await verifyRevisionCalculationReceiptSourceBinding(parsed, revision);
      const fingerprints = receiptFingerprintsByRevision.get(revision.id) ?? new Set<string>();
      if (fingerprints.has(receipt.requestFingerprint)) {
        failDataset(`Revision ${revision.id} 的计算收据存在重复请求指纹。`);
      }
      fingerprints.add(receipt.requestFingerprint);
      receiptFingerprintsByRevision.set(revision.id, fingerprints);
      const list = revisionCalculationReceiptsByRevision.get(revision.id) ?? [];
      list.push(receipt);
      revisionCalculationReceiptsByRevision.set(revision.id, list);
      revisionCalculationReceipts.push(receipt);
      await advance();
    }
    ensureUniqueIds(revisionCalculationReceipts, "计算收据分区");
    const revisionsByCase = new Map<string, RevisionRecord[]>();
    for (const revision of revisions) {
      if (!caseById.has(revision.caseId)) failDataset(`修订 ${revision.id} 引用了不存在的正式案例。`);
      const list = revisionsByCase.get(revision.caseId) ?? [];
      list.push(revision);
      revisionsByCase.set(revision.caseId, list);
    }
    for (const caseRecord of cases) {
      const list = (revisionsByCase.get(caseRecord.id) ?? []).sort((left, right) =>
        left.revisionNumber - right.revisionNumber || compareCodePoint(left.id, right.id)
      );
      if (list.length !== caseRecord.revisionCount) {
        failDataset(`案例 ${caseRecord.id} 的 revisionCount 与修订分区不一致。`);
      }
      list.forEach((revision, index) => {
        if (revision.revisionNumber !== index + 1) {
          failDataset(`案例 ${caseRecord.id} 的修订序号不连续。`);
        }
      });
      if (list.at(-1)?.id !== caseRecord.latestRevisionId) {
        failDataset(`案例 ${caseRecord.id} 的 latestRevisionId 未指向最高修订。`);
      }
    }
    const subjectExists = (id: string): boolean => caseById.has(id) || candidateById.has(id);
    for (const note of researchNotes) {
      if (!subjectExists(note.caseId)) failDataset(`笔记 ${note.id} 引用了不存在的研究主体。`);
      if (note.anchor.kind !== "case") {
        const revision = revisionById.get(note.anchor.revisionId);
        if (!revision || revision.caseId !== note.caseId) {
          failDataset(`笔记 ${note.id} 的修订锚点不属于该案例。`);
        }
      }
    }
    for (const event of events) {
      if (!subjectExists(event.caseId)) failDataset(`事件 ${event.id} 引用了不存在的研究主体。`);
      if (event.revisionId !== null) {
        const revision = revisionById.get(event.revisionId);
        if (!revision || revision.caseId !== event.caseId) {
          failDataset(`事件 ${event.id} 的修订绑定不属于该案例。`);
        }
        if (event.transitNodeRef?.namespace === "hakimi-transit-node") {
          await verifyCompatibleTransitNodeRef(revision, event.transitNodeRef);
        }
      }
    }
    for (const receipts of revisionCalculationReceiptsByRevision.values()) {
      receipts.sort((left, right) => compareCodePoint(left.id, right.id));
    }
    return {
      cases,
      revisions,
      candidateSets,
      researchNotes,
      events,
      knowledgeDocuments,
      revisionCalculationReceiptLedgerStatus,
      revisionCalculationReceipts,
      revisionCalculationReceiptsByRevision
    };
  } catch (cause) {
    if (cause instanceof ResearchQueryExecutionError) throw cause;
    failDataset("研究数据未通过严格结构或完整性复核。", cause);
  }
}

function fieldsForEvent(event: EventRecord): TextField[] {
  return [
    { name: "event.title", value: event.title, eventId: event.id },
    { name: "event.body", value: event.body, eventId: event.id },
    { name: "event.tags", value: event.tags.join(" "), eventId: event.id },
    { name: "event.sources", value: event.sourceRefs.join(" "), eventId: event.id }
  ];
}

function fieldsForNote(note: ResearchNoteRecord): TextField[] {
  return [
    { name: "note.body", value: note.body, noteId: note.id },
    { name: "note.tags", value: note.tags.join(" "), noteId: note.id },
    { name: "note.sources", value: note.sourceRefs.join(" "), noteId: note.id }
  ];
}

function fieldsForSubject(
  subject: CaseRecord | CandidateSetRecord,
  notes: readonly ResearchNoteRecord[],
  events: readonly EventRecord[]
): TextField[] {
  return [
    { name: "subject.alias", value: subject.alias },
    { name: "subject.tags", value: subject.tags.join(" ") },
    { name: "subject.notes", value: subject.notes },
    ...notes.filter((note) => note.lifecycle === "active").flatMap(fieldsForNote),
    ...events.filter((event) => event.deletedAt === null).flatMap(fieldsForEvent)
  ];
}

function currentTransitRef(event: EventRecord): {
  revisionId: string;
  nodeType: TransitNodeType;
  nodeId: string;
} | null {
  const ref = event.transitNodeRef;
  return ref?.namespace === "hakimi-transit-node"
    ? { revisionId: ref.revisionId, nodeType: ref.nodeType, nodeId: ref.nodeId }
    : null;
}

function matchesEventBinding(event: EventRecord, binding: ResearchEventQuery["binding"]): boolean {
  const transitRef = currentTransitRef(event);
  switch (binding.kind) {
    case "any":
      return true;
    case "case_only":
      return event.revisionId === null && event.transitNodeRef === null;
    case "revision_bound":
      return event.revisionId !== null && event.transitNodeRef === null;
    case "node_bound":
      return transitRef !== null;
    case "context_case":
      return event.caseId === binding.caseId;
    case "context_revision":
      return event.caseId === binding.caseId && event.revisionId === binding.revisionId;
    case "context_node":
      return event.caseId === binding.caseId &&
        event.revisionId === binding.revisionId &&
        transitRef?.nodeType === binding.nodeType &&
        transitRef.nodeId === binding.nodeId;
  }
}

function eventMatchesStandaloneQuery(event: EventRecord, query: ResearchEventQuery): TextMatch | null {
  if (!eventLifecycleMatches(query.lifecycle, event.deletedAt)) return null;
  if (!intersects(query.tags, event.tags)) return null;
  if (!matchesAny(query.feedbacks, event.feedback)) return null;
  if (!matchesEventBinding(event, query.binding)) return null;
  const text = matchText(query.text, fieldsForEvent(event));
  return text.matched ? text : null;
}

function matchesTransitCondition(
  node: TransitNode,
  condition: { ganZhi: string | null; stemTenGod: string | null }
): boolean {
  return (condition.ganZhi === null || node.ganZhi === condition.ganZhi) &&
    (condition.stemTenGod === null || node.stemTenGod === condition.stemTenGod);
}

function calculationSourceFromResolution(
  resolution: RevisionCalculationSourceResolution,
  ledgerStatus: VerifiedDataset["revisionCalculationReceiptLedgerStatus"]
): ResearchCalculationSource {
  const componentStatuses = resolution.componentStatuses as RevisionCalculationSourceComponentStatuses;
  return {
    source: resolution.source,
    ledgerStatus,
    captureKind: resolution.captureKind,
    storedHistoricalOutputCompared: resolution.storedHistoricalOutputCompared,
    comparisonStatus: resolution.comparisonStatus,
    profileId: resolution.profileId,
    projectionDigest: resolution.projection.projectionDigest,
    requestFingerprint: resolution.requestFingerprint,
    receipt: resolution.receipt === null ? null : {
      id: resolution.receipt.id,
      createdAt: resolution.receipt.createdAt,
      receiptDigest: resolution.receipt.receiptDigest,
      requestFingerprint: resolution.receipt.requestFingerprint
    },
    componentStatuses: {
      relations: { ...componentStatuses.relations },
      luckCycle: { ...componentStatuses.luckCycle },
      transit: { ...componentStatuses.transit }
    }
  };
}

function requiredCalculationComponentIsUsable(
  resolution: RevisionCalculationSourceResolution,
  componentName: "relations" | "transit",
  revision: RevisionRecord,
  diagnostics: ResearchQueryDiagnostic[]
): boolean {
  const component = resolution.projection[componentName];
  if (component.status !== "projected") {
    diagnostics.push({
      kind: "not_evaluable",
      code: `DERIVED_${componentName.toUpperCase()}_${component.status === "unavailable" ? component.code.toUpperCase() : "NOT_REQUESTED"}`,
      subjectId: revision.caseId,
      revisionId: revision.id,
      message: component.reason
    });
    return false;
  }
  const comparisonStatus = resolution.componentStatuses[componentName].comparisonStatus;
  if (resolution.source === "stored_receipt" && comparisonStatus !== "matched") {
    diagnostics.push({
      kind: "not_evaluable",
      code: `STORED_${componentName.toUpperCase()}_COMPARISON_${comparisonStatus.toUpperCase()}`,
      subjectId: revision.caseId,
      revisionId: revision.id,
      message: `已保存计算收据的 ${componentName} 无法与当前精确执行器确认一致；查询已失败关闭，未回退到当前投影。`
    });
    return false;
  }
  return true;
}

async function matchRevision(
  revision: RevisionRecord,
  query: ResearchCaseQuery,
  dataset: VerifiedDataset,
  diagnostics: ResearchQueryDiagnostic[]
): Promise<RevisionMatch | null> {
  if (!matchesAny(query.dayMasters, revision.facts.pillars.day.stem)) return null;
  if (!matchesAny(query.monthBranches, revision.facts.pillars.month.branch)) return null;
  if (!matchesAny(query.ruleProfileDigests, revision.manifest.ruleProfileDigest)) return null;

  let calculationResolution: RevisionCalculationSourceResolution | null = null;
  if (query.relationTypes.length > 0 || query.transit !== null) {
    try {
      calculationResolution = await resolveRevisionCalculationSource(
        revision,
        dataset.revisionCalculationReceiptsByRevision.get(revision.id) ?? [],
        {
          profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
          ...(query.transit === null ? {} : { atInstant: query.transit.atInstant }),
          ...(query.transit?.manualDirection === null || query.transit?.manualDirection === undefined
            ? {}
            : { manualDirection: query.transit.manualDirection })
        }
      );
    } catch (cause) {
      if (!(cause instanceof RevisionDerivedReplayError)) throw cause;
      diagnostics.push({
        kind: "not_evaluable",
        code: cause.code,
        subjectId: revision.caseId,
        revisionId: revision.id,
        message: cause.message
      });
      return null;
    }
  }

  let relationFactIds: string[] = [];
  if (query.relationTypes.length > 0) {
    if (!calculationResolution ||
      !requiredCalculationComponentIsUsable(calculationResolution, "relations", revision, diagnostics) ||
      calculationResolution.projection.relations.status !== "projected") return null;
    const relationFacts = calculationResolution.projection.relations.result.facts
      .filter((fact) => query.relationTypes.includes(fact.relationType));
    if (relationFacts.length === 0) return null;
    relationFactIds = relationFacts.map((fact) => fact.id).sort(compareCodePoint);
  }

  let transitMatches: ResearchTransitMatch[] = [];
  if (query.transit !== null) {
    if (!calculationResolution ||
      !requiredCalculationComponentIsUsable(calculationResolution, "transit", revision, diagnostics) ||
      calculationResolution.projection.transit.status !== "projected") return null;
    for (const condition of query.transit.matches) {
      const slot = calculationResolution.projection.transit.result.slots[condition.nodeType];
      if (slot.status !== "resolved" || !matchesTransitCondition(slot.node, condition)) return null;
      transitMatches.push({
        revisionId: revision.id,
        nodeType: slot.node.nodeType,
        nodeId: slot.node.ref.nodeId,
        ganZhi: slot.node.ganZhi,
        stemTenGod: slot.node.stemTenGod,
        startInstant: slot.node.startInstant,
        endExclusiveInstant: slot.node.endExclusiveInstant
      });
    }
  }

  return {
    revision,
    relationFactIds,
    transitMatches,
    calculationSource: calculationResolution === null
      ? null
      : calculationSourceFromResolution(
          calculationResolution,
          dataset.revisionCalculationReceiptLedgerStatus
        )
  };
}

function caseEventMatches(
  event: EventRecord,
  query: NonNullable<ResearchCaseQuery["events"]>,
  matchedRevisionIds: ReadonlySet<string>,
  transitMatches: readonly ResearchTransitMatch[]
): boolean {
  if (!eventLifecycleMatches(query.lifecycle, event.deletedAt)) return false;
  if (!intersects(query.tags, event.tags)) return false;
  if (!matchesAny(query.feedbacks, event.feedback)) return false;
  if (!matchText(query.text, fieldsForEvent(event)).matched) return false;
  if (query.binding === "case_only") return event.revisionId === null && event.transitNodeRef === null;
  if (query.binding === "matched_revision") {
    return event.revisionId !== null && matchedRevisionIds.has(event.revisionId);
  }
  if (query.binding === "transit_node") {
    const ref = currentTransitRef(event);
    return ref !== null && transitMatches.some((match) =>
      match.revisionId === ref.revisionId && match.nodeType === ref.nodeType && match.nodeId === ref.nodeId
    );
  }
  return true;
}

function resultReasons(text: TextMatch, extras: readonly string[]): string[] {
  return uniqueSorted([
    ...text.fields.map((field) => `text:${field}`),
    ...extras
  ]);
}

function resultScore(text: TextMatch, extras: readonly string[]): number {
  return text.fields.length + extras.length;
}

async function executeCaseQuery(
  query: ResearchCaseQuery,
  dataset: VerifiedDataset,
  diagnostics: ResearchQueryDiagnostic[],
  options: ExecuteResearchQueryOptions
): Promise<ResearchCaseResult[]> {
  const revisionsByCase = new Map<string, RevisionRecord[]>();
  for (const revision of dataset.revisions) {
    const list = revisionsByCase.get(revision.caseId) ?? [];
    list.push(revision);
    revisionsByCase.set(revision.caseId, list);
  }
  const notesByCase = new Map<string, ResearchNoteRecord[]>();
  for (const note of dataset.researchNotes) {
    const list = notesByCase.get(note.caseId) ?? [];
    list.push(note);
    notesByCase.set(note.caseId, list);
  }
  const eventsByCase = new Map<string, EventRecord[]>();
  for (const event of dataset.events) {
    const list = eventsByCase.get(event.caseId) ?? [];
    list.push(event);
    eventsByCase.set(event.caseId, list);
  }

  const results: ResearchCaseResult[] = [];
  for (const [index, caseRecord] of dataset.cases.entries()) {
    options.onProgress?.({ phase: "filter", completed: index, total: dataset.cases.length });
    await cooperativeYield(index, options);
    if (!lifecycleMatches(query.lifecycle, caseRecord.deletedAt)) continue;
    if (query.favorites === "only" && !caseRecord.favorite) continue;
    if (!intersects(query.caseTags, caseRecord.tags)) continue;

    const notes = notesByCase.get(caseRecord.id) ?? [];
    const events = eventsByCase.get(caseRecord.id) ?? [];
    const text = matchText(query.text, fieldsForSubject(caseRecord, notes, events));
    if (!text.matched) continue;

    const allRevisions = [...(revisionsByCase.get(caseRecord.id) ?? [])].sort((left, right) =>
      left.revisionNumber - right.revisionNumber || compareCodePoint(left.id, right.id)
    );
    const selectedRevisions = query.revisionScope === "latest"
      ? allRevisions.filter((revision) => revision.id === caseRecord.latestRevisionId)
      : allRevisions;
    const revisionMatches: RevisionMatch[] = [];
    for (const revision of selectedRevisions) {
      const matched = await matchRevision(revision, query, dataset, diagnostics);
      if (matched) revisionMatches.push(matched);
    }
    if (revisionMatches.length === 0) continue;

    const matchedRevisionIds = new Set(revisionMatches.map((match) => match.revision.id));
    const transitMatches = revisionMatches.flatMap((match) => match.transitMatches);
    const eventClauseMatches = query.events === null
      ? []
      : events.filter((event) => caseEventMatches(event, query.events!, matchedRevisionIds, transitMatches));
    if (query.events !== null && eventClauseMatches.length === 0) continue;

    const extras: string[] = [];
    if (query.dayMasters.length) extras.push("chart:day_master");
    if (query.monthBranches.length) extras.push("chart:month_branch");
    if (query.ruleProfileDigests.length) extras.push("chart:rule_profile_digest");
    if (query.relationTypes.length) extras.push("chart:pillar_relation");
    if (query.transit !== null) extras.push("transit:active_node");
    if (query.events !== null) extras.push("event:same_record_clause");
    const exactRevisions: ResearchMatchedRevision[] = revisionMatches.map((match) => ({
      revisionId: match.revision.id,
      revisionNumber: match.revision.revisionNumber,
      resultHash: match.revision.manifest.resultHash,
      ruleProfileDigest: match.revision.manifest.ruleProfileDigest,
      dayMaster: match.revision.facts.pillars.day.stem,
      monthBranch: match.revision.facts.pillars.month.branch,
      relationFactIds: match.relationFactIds,
      transitMatches: match.transitMatches,
      calculationSource: match.calculationSource
    }));
    results.push({
      key: `case:${caseRecord.id}`,
      scope: "cases",
      title: caseRecord.alias,
      alias: caseRecord.alias,
      caseId: caseRecord.id,
      createdAt: caseRecord.createdAt,
      updatedAt: caseRecord.updatedAt,
      lifecycle: caseRecord.deletedAt === null ? "active" : "trashed",
      favorite: caseRecord.favorite,
      matchedRevisionIds: exactRevisions.map((revision) => revision.revisionId),
      revisions: exactRevisions,
      transitMatches,
      matchingNoteIds: text.noteIds,
      matchingEventIds: uniqueSorted([...text.eventIds, ...eventClauseMatches.map((event) => event.id)]),
      matchReasons: resultReasons(text, extras),
      relevanceScore: resultScore(text, extras)
    });
  }
  options.onProgress?.({ phase: "filter", completed: dataset.cases.length, total: dataset.cases.length });
  return results;
}

async function executeCandidateSetQuery(
  query: ResearchCandidateSetQuery,
  dataset: VerifiedDataset,
  options: ExecuteResearchQueryOptions
): Promise<ResearchCandidateSetResult[]> {
  const notesByCase = new Map<string, ResearchNoteRecord[]>();
  for (const note of dataset.researchNotes) {
    const list = notesByCase.get(note.caseId) ?? [];
    list.push(note);
    notesByCase.set(note.caseId, list);
  }
  const eventsByCase = new Map<string, EventRecord[]>();
  for (const event of dataset.events) {
    const list = eventsByCase.get(event.caseId) ?? [];
    list.push(event);
    eventsByCase.set(event.caseId, list);
  }
  const results: ResearchCandidateSetResult[] = [];
  for (const [index, record] of dataset.candidateSets.entries()) {
    options.onProgress?.({ phase: "filter", completed: index, total: dataset.candidateSets.length });
    await cooperativeYield(index, options);
    if (!lifecycleMatches(query.lifecycle, record.deletedAt)) continue;
    if (query.favorites === "only" && !record.favorite) continue;
    if (!intersects(query.tags, record.tags)) continue;
    const notes = notesByCase.get(record.id) ?? [];
    const events = eventsByCase.get(record.id) ?? [];
    const text = matchText(query.text, fieldsForSubject(record, notes, events));
    if (!text.matched) continue;
    const extras = query.tags.length ? ["subject:tags"] : [];
    results.push({
      key: `candidate_set:${record.id}`,
      scope: "candidate_sets",
      title: record.alias,
      alias: record.alias,
      candidateSetId: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lifecycle: record.deletedAt === null ? "active" : "trashed",
      favorite: record.favorite,
      snapshotDigest: record.snapshotDigest,
      resultHash: record.candidateSet.resultHash,
      matchingNoteIds: text.noteIds,
      matchingEventIds: text.eventIds,
      matchReasons: resultReasons(text, extras),
      relevanceScore: resultScore(text, extras)
    });
  }
  options.onProgress?.({ phase: "filter", completed: dataset.candidateSets.length, total: dataset.candidateSets.length });
  return results;
}

async function executeEventQuery(
  query: ResearchEventQuery,
  dataset: VerifiedDataset,
  options: ExecuteResearchQueryOptions
): Promise<ResearchEventResult[]> {
  const results: ResearchEventResult[] = [];
  for (const [index, event] of dataset.events.entries()) {
    options.onProgress?.({ phase: "filter", completed: index, total: dataset.events.length });
    await cooperativeYield(index, options);
    const text = eventMatchesStandaloneQuery(event, query);
    if (!text) continue;
    const extras: string[] = [];
    if (query.tags.length) extras.push("event:tags");
    if (query.feedbacks.length) extras.push("event:feedback");
    if (query.binding.kind !== "any") extras.push("event:binding");
    results.push({
      key: `event:${event.id}`,
      scope: "events",
      title: event.title,
      alias: event.title,
      eventId: event.id,
      caseId: event.caseId,
      revisionId: event.revisionId,
      transitNodeId: currentTransitRef(event)?.nodeId ?? null,
      lifecycle: event.deletedAt === null ? "active" : "deleted",
      feedback: event.feedback,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      relevanceScore: resultScore(text, extras),
      matchReasons: resultReasons(text, extras),
      matchingNoteIds: [],
      matchingEventIds: [event.id]
    });
  }
  options.onProgress?.({ phase: "filter", completed: dataset.events.length, total: dataset.events.length });
  return results;
}

async function executeKnowledgeQuery(
  query: ResearchKnowledgeQuery,
  dataset: VerifiedDataset,
  options: ExecuteResearchQueryOptions
): Promise<ResearchKnowledgeResult[]> {
  const results: ResearchKnowledgeResult[] = [];
  for (const [index, knowledgeDocument] of dataset.knowledgeDocuments.entries()) {
    options.onProgress?.({ phase: "filter", completed: index, total: dataset.knowledgeDocuments.length });
    await cooperativeYield(index, options);
    if (!matchesAny(query.recordTypes, knowledgeDocument.recordType)) continue;
    const text = matchText(query.text, [
      { name: "knowledge.title", value: knowledgeDocument.title },
      { name: "knowledge.author", value: knowledgeDocument.author },
      { name: "knowledge.edition", value: knowledgeDocument.edition },
      { name: "knowledge.source_note", value: knowledgeDocument.sourceNote },
      { name: "knowledge.file_name", value: knowledgeDocument.fileName },
      { name: "knowledge.content", value: knowledgeDocument.content }
    ]);
    if (!text.matched) continue;
    const extras = query.recordTypes.length ? ["knowledge:record_type"] : [];
    results.push({
      key: `knowledge:${knowledgeDocument.id}`,
      scope: "knowledge",
      title: knowledgeDocument.title,
      alias: knowledgeDocument.title,
      documentId: knowledgeDocument.id,
      recordType: knowledgeDocument.recordType,
      createdAt: knowledgeDocument.createdAt,
      updatedAt: knowledgeDocument.updatedAt,
      relevanceScore: resultScore(text, extras),
      matchReasons: resultReasons(text, extras),
      matchingFields: text.fields,
      matchingNoteIds: [],
      matchingEventIds: []
    });
  }
  options.onProgress?.({ phase: "filter", completed: dataset.knowledgeDocuments.length, total: dataset.knowledgeDocuments.length });
  return results;
}

function primarySortValue(result: ResearchQueryResult, field: string): string | number {
  if (field === "relevance") return result.relevanceScore;
  if (field === "createdAt") return result.createdAt;
  if (field === "updatedAt") return result.updatedAt;
  return result.alias;
}

function sortResults(results: ResearchQueryResult[], query: ResearchQuery): ResearchQueryResult[] {
  const direction = query.sort.direction === "asc" ? 1 : -1;
  return [...results].sort((left, right) => {
    const leftValue = primarySortValue(left, query.sort.field);
    const rightValue = primarySortValue(right, query.sort.field);
    const primary = typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : compareCodePoint(String(leftValue), String(rightValue));
    return primary * direction || compareCodePoint(left.scope, right.scope) || compareCodePoint(left.key, right.key);
  });
}

function sortedForEpoch<T extends { id: string }>(records: readonly T[]): T[] {
  return [...records].sort((left, right) => compareCodePoint(left.id, right.id));
}

async function datasetEpoch(dataset: VerifiedDataset): Promise<string> {
  return sha256Hex({
    cases: sortedForEpoch(dataset.cases),
    revisions: sortedForEpoch(dataset.revisions),
    candidateSets: sortedForEpoch(dataset.candidateSets),
    researchNotes: sortedForEpoch(dataset.researchNotes),
    events: sortedForEpoch(dataset.events),
    knowledgeDocuments: sortedForEpoch(dataset.knowledgeDocuments),
    revisionCalculationReceiptLedgerStatus: dataset.revisionCalculationReceiptLedgerStatus,
    revisionCalculationReceipts: sortedForEpoch(dataset.revisionCalculationReceipts)
  });
}

export async function digestResearchQuery(input: ResearchQuery): Promise<string> {
  return sha256Hex(researchQuerySchema.parse(input));
}

export function isResearchResultKey(value: string): boolean {
  return RESULT_KEY_PATTERN.test(value);
}

export function createDefaultResearchQuery(scope: "cases"): ResearchCaseQuery;
export function createDefaultResearchQuery(scope: "candidate_sets"): ResearchCandidateSetQuery;
export function createDefaultResearchQuery(scope: "events"): ResearchEventQuery;
export function createDefaultResearchQuery(scope: "knowledge"): ResearchKnowledgeQuery;
export function createDefaultResearchQuery(scope: ResearchQuery["scope"]): ResearchQuery {
  if (scope === "cases") {
    return researchQuerySchema.parse({
      version: RESEARCH_QUERY_VERSION,
      scope,
      text: "",
      lifecycle: "active",
      favorites: "any",
      revisionScope: "latest",
      caseTags: [],
      dayMasters: [],
      monthBranches: [],
      relationTypes: [],
      ruleProfileDigests: [],
      transit: null,
      events: null,
      sort: { field: "updatedAt", direction: "desc" }
    });
  }
  if (scope === "candidate_sets") {
    return researchQuerySchema.parse({
      version: RESEARCH_QUERY_VERSION,
      scope,
      text: "",
      lifecycle: "active",
      favorites: "any",
      tags: [],
      sort: { field: "updatedAt", direction: "desc" }
    });
  }
  if (scope === "events") {
    return researchQuerySchema.parse({
      version: RESEARCH_QUERY_VERSION,
      scope,
      text: "",
      tags: [],
      feedbacks: [],
      lifecycle: "active",
      binding: { kind: "any" },
      sort: { field: "updatedAt", direction: "desc" }
    });
  }
  return researchQuerySchema.parse({
    version: RESEARCH_QUERY_VERSION,
    scope,
    text: "",
    recordTypes: [],
    sort: { field: "updatedAt", direction: "desc" }
  });
}

export async function executeResearchQuery(
  input: ResearchQuery,
  snapshot: ResearchQuerySnapshot,
  options: ExecuteResearchQueryOptions = {}
): Promise<ResearchQueryExecution> {
  ensureNotAborted(options.signal);
  let query: ResearchQuery;
  try {
    query = researchQuerySchema.parse(input);
  } catch (cause) {
    throw new ResearchQueryExecutionError("INVALID_QUERY", "ResearchQuery 未通过严格版本契约。", { cause });
  }
  if (options.dataEpoch !== undefined && !/^[a-f0-9]{64}$/.test(options.dataEpoch)) {
    throw new ResearchQueryExecutionError("INVALID_DATA_EPOCH", "dataEpoch 必须是小写 SHA-256。" );
  }
  const dataset = await verifyDataset(snapshot, options);
  const [queryDigest, resolvedDataEpoch] = await Promise.all([
    sha256Hex(query),
    options.dataEpoch ?? datasetEpoch(dataset)
  ]);
  const diagnostics: ResearchQueryDiagnostic[] = [];
  let results: ResearchQueryResult[];
  if (query.scope === "cases") {
    results = await executeCaseQuery(query, dataset, diagnostics, options);
    if (query.relationTypes.length > 0) {
      diagnostics.push({
        kind: "warning",
        code: "DETERMINISTIC_RELATIONS_NOT_INTERPRETIVE_STRUCTURE",
        subjectId: null,
        revisionId: null,
        message: "结构条件仅表示版本化四柱关系事实，不代表格局、旺衰或用神判断。"
      });
    }
    if (query.transit !== null) {
      diagnostics.push({
        kind: "warning",
        code: "TRANSIT_ENGINEERING_PREVIEW_NO_GOLD_CASES",
        subjectId: null,
        revisionId: null,
        message: "运限筛选是可复算的软件工程预览；当前金标准案例数为 0，尚未通过发布门。"
      });
    }
  } else if (query.scope === "candidate_sets") {
    results = await executeCandidateSetQuery(query, dataset, options);
  } else if (query.scope === "events") {
    results = await executeEventQuery(query, dataset, options);
  } else {
    results = await executeKnowledgeQuery(query, dataset, options);
  }
  ensureNotAborted(options.signal);
  results = sortResults(results, query);
  diagnostics.sort((left, right) =>
    compareCodePoint(left.kind, right.kind) ||
    compareCodePoint(left.subjectId ?? "", right.subjectId ?? "") ||
    compareCodePoint(left.revisionId ?? "", right.revisionId ?? "") ||
    compareCodePoint(left.code, right.code)
  );
  options.onProgress?.({ phase: "finalize", completed: 1, total: 1 });
  ensureNotAborted(options.signal);
  const executedAt = new Date(options.now?.() ?? Date.now()).toISOString();
  const resultDigest = await sha256Hex({
    engine: RESEARCH_QUERY_ENGINE,
    queryDigest,
    dataEpoch: resolvedDataEpoch,
    results,
    diagnostics
  });
  ensureNotAborted(options.signal);
  return {
    engine: RESEARCH_QUERY_ENGINE,
    query,
    queryDigest,
    dataEpoch: resolvedDataEpoch,
    executedAt,
    total: results.length,
    results,
    diagnostics,
    resultDigest
  };
}

export class ResearchQueryExportError extends Error {
  constructor(
    readonly code: "INVALID_EXPORT" | "DIGEST_MISMATCH" | "UNVERIFIED_EXECUTION",
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ResearchQueryExportError";
  }
}

function unsignedExportEnvelope(
  manifest: ResearchQueryExportEnvelope["manifest"],
  digests: Omit<ResearchQueryExportEnvelope["digests"], "envelope">,
  payload: ResearchQueryExportEnvelope["payload"]
): unknown {
  return { manifest, digests, payload };
}

async function expectedExecutionResultDigest(
  payload: ResearchQueryExportEnvelope["payload"]
): Promise<string> {
  return sha256Hex({
    engine: RESEARCH_QUERY_ENGINE,
    queryDigest: payload.queryDigest,
    dataEpoch: payload.dataEpoch,
    results: payload.results,
    diagnostics: payload.diagnostics
  });
}

export async function buildResearchQueryExport(
  execution: ResearchQueryExecution,
  options: { appVersion: string; exportedAt?: string }
): Promise<ResearchQueryExportEnvelope> {
  const payload: ResearchQueryExportEnvelope["payload"] = {
    query: execution.query,
    queryDigest: execution.queryDigest,
    dataEpoch: execution.dataEpoch,
    total: execution.total,
    results: execution.results,
    diagnostics: execution.diagnostics,
    resultDigest: execution.resultDigest
  };
  try {
    exportPayloadSchema.parse(payload);
  } catch (cause) {
    throw new ResearchQueryExportError("UNVERIFIED_EXECUTION", "查询执行结果不满足可导出结构。", { cause });
  }
  const [queryDigest, resultDigest] = await Promise.all([
    sha256Hex(payload.query),
    expectedExecutionResultDigest(payload)
  ]);
  if (queryDigest !== payload.queryDigest || resultDigest !== payload.resultDigest) {
    throw new ResearchQueryExportError("UNVERIFIED_EXECUTION", "查询或结果摘要无法复算，已拒绝导出。" );
  }
  let exportedAt: string;
  try {
    exportedAt = new Date(options.exportedAt ?? Date.now()).toISOString();
  } catch (cause) {
    throw new ResearchQueryExportError("INVALID_EXPORT", "导出时间不是有效瞬时点。", { cause });
  }
  const manifest: ResearchQueryExportEnvelope["manifest"] = {
    format: RESEARCH_QUERY_EXPORT.format,
    formatVersion: RESEARCH_QUERY_EXPORT.formatVersion,
    queryVersion: RESEARCH_QUERY_VERSION,
    engine: RESEARCH_QUERY_ENGINE,
    appVersion: options.appVersion,
    exportedAt,
    digestAlgorithm: RESEARCH_QUERY_EXPORT.digestAlgorithm,
    privacy: RESEARCH_QUERY_EXPORT.privacy,
    sensitiveDataWarning: RESEARCH_QUERY_EXPORT.sensitiveDataWarning,
    total: payload.total
  };
  try {
    exportManifestSchema.parse(manifest);
  } catch (cause) {
    throw new ResearchQueryExportError("INVALID_EXPORT", "导出清单中的应用版本或时间无效。", { cause });
  }
  const digestsWithoutEnvelope = {
    query: payload.queryDigest,
    results: await sha256Hex(payload.results),
    diagnostics: await sha256Hex(payload.diagnostics),
    payload: await sha256Hex(payload)
  };
  const envelope: ResearchQueryExportEnvelope = {
    manifest,
    digests: {
      ...digestsWithoutEnvelope,
      envelope: await sha256Hex(unsignedExportEnvelope(manifest, digestsWithoutEnvelope, payload))
    },
    payload
  };
  researchQueryExportEnvelopeSchema.parse(envelope);
  return envelope;
}

export async function verifyResearchQueryExport(input: unknown): Promise<ResearchQueryExportEnvelope> {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch (cause) {
      throw new ResearchQueryExportError("INVALID_EXPORT", "研究查询导出不是有效 JSON。", { cause });
    }
  }
  let parsed: z.infer<typeof researchQueryExportEnvelopeSchema>;
  try {
    parsed = researchQueryExportEnvelopeSchema.parse(raw);
  } catch (cause) {
    throw new ResearchQueryExportError("INVALID_EXPORT", "研究查询导出未通过严格结构契约。", { cause });
  }
  const payload = parsed.payload as ResearchQueryExportEnvelope["payload"];
  const manifest = parsed.manifest as ResearchQueryExportEnvelope["manifest"];
  const expected = {
    query: await sha256Hex(payload.query),
    results: await sha256Hex(payload.results),
    diagnostics: await sha256Hex(payload.diagnostics),
    payload: await sha256Hex(payload)
  };
  const [resultDigest, envelopeDigest] = await Promise.all([
    expectedExecutionResultDigest(payload),
    sha256Hex(unsignedExportEnvelope(manifest, expected, payload))
  ]);
  if (
    payload.queryDigest !== expected.query ||
    payload.resultDigest !== resultDigest ||
    parsed.digests.query !== expected.query ||
    parsed.digests.results !== expected.results ||
    parsed.digests.diagnostics !== expected.diagnostics ||
    parsed.digests.payload !== expected.payload ||
    parsed.digests.envelope !== envelopeDigest
  ) {
    throw new ResearchQueryExportError("DIGEST_MISMATCH", "研究查询导出摘要不匹配，已拒绝读取。" );
  }
  return parsed as unknown as ResearchQueryExportEnvelope;
}

export function encodeResearchQueryExport(envelope: ResearchQueryExportEnvelope): string {
  researchQueryExportEnvelopeSchema.parse(envelope);
  return `${canonicalStringify(envelope)}\n`;
}

export function canonicalResearchQueryJson(input: ResearchQuery): string {
  return canonicalStringify(researchQuerySchema.parse(input));
}
