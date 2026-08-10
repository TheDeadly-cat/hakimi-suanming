import {
  caseRecordSchema,
  citationRecordSchema,
  eventRecordSchema,
  eventTimeMigrationReceiptSchema,
  knowledgeDocumentRecordSchema,
  researchNoteRecordSchema,
  revisionCalculationReceiptRecordSchema,
  revisionRecordSchema,
  sourceRightsRecordSchema,
  type CitationRecord,
  type CitationTarget,
  type EventRecord,
  type EventTimeMigrationReceipt,
  type KnowledgeDocumentRecord,
  type ResearchNoteRecord,
  type RulePackBinding,
  type SourceRightsRecord
} from "@hakimi/contracts";
import { verifyRevisionRecordIntegrity } from "@hakimi/chart-integrity";
import { sha256Hex } from "@hakimi/integrity";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  RevisionDerivedReplayError,
  resolveRevisionCalculationSource,
  type RevisionCalculationSourceResolution,
  type RevisionDerivedReplayProjection
} from "@hakimi/revision-replay";
import { z } from "zod";
import {
  compareEventsForResearchExport,
  eventTimeExportDetails,
  verifyEventForResearchExport
} from "./event-time";
import { REIDENTIFICATION_WARNING } from "./privacy";

export const SINGLE_CHART_REPORT_FORMAT_VERSION = "1.4.0" as const;

const CANONICAL_ANONYMOUS_PROVENANCE_FIELD = /^pillars\.(year|month|day|hour)\.(ganZhi|hiddenStems|stemTenGod|branchTenGods|wuXing|nayin|twelveGrowth|xun|voidBranches)$/;

function hasExactJsonStructure(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => hasExactJsonStructure(value, right[index]));
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index]
      && hasExactJsonStructure(leftRecord[key], rightRecord[key]));
}

const exactRecord = <Output>(schema: z.ZodType<Output>, label: string) =>
  z.unknown().transform((input, context): Output => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
      return z.NEVER;
    }
    if (!hasExactJsonStructure(input, parsed.data)) {
      context.addIssue({ code: "custom", message: `${label} 不是精确、规范的当前契约记录` });
      return z.NEVER;
    }
    return parsed.data;
  });

export const singleChartReportInputSchema = z.strictObject({
  caseRecord: exactRecord(caseRecordSchema, "Case"),
  revision: exactRecord(revisionRecordSchema, "Revision"),
  revisionCalculationReceiptLedgerStatus: z.enum(["available", "schema_unavailable"]).default("schema_unavailable"),
  revisionCalculationReceipts: z.array(
    exactRecord(revisionCalculationReceiptRecordSchema, "RevisionCalculationReceipt")
  ).default([]),
  researchNotes: z.array(exactRecord(researchNoteRecordSchema, "ResearchNote")),
  events: z.array(exactRecord(eventRecordSchema, "Event")),
  eventTimeMigrationReceipts: z.array(exactRecord(eventTimeMigrationReceiptSchema, "EventTimeMigrationReceipt")),
  citations: z.array(exactRecord(citationRecordSchema, "Citation")),
  knowledgeDocuments: z.array(exactRecord(knowledgeDocumentRecordSchema, "KnowledgeDocument")),
  sourceRights: z.array(exactRecord(sourceRightsRecordSchema, "SourceRights"))
});

export const singleChartReportOptionsSchema = z.strictObject({
  anonymized: z.boolean().default(true)
});

const reportRowSchema = z.strictObject({ label: z.string().min(1), value: z.string() });
const reportPillarSchema = z.strictObject({
  key: z.enum(["year", "month", "day", "hour"]),
  label: z.enum(["年柱", "月柱", "日柱", "时柱"]),
  ganZhi: z.string().length(2),
  stemTenGod: z.string(),
  hiddenStems: z.string(),
  branchTenGods: z.string(),
  wuXing: z.string(),
  nayin: z.string(),
  twelveGrowth: z.string(),
  xun: z.string(),
  voidBranches: z.string()
});
const reportProvenanceSchema = z.strictObject({
  field: z.string(),
  kind: z.string(),
  algorithmId: z.string(),
  verificationStatus: z.string(),
  sourceRefs: z.array(z.string()),
  note: z.string()
});
const reportResearchEntrySchema = z.strictObject({
  reference: z.string(),
  title: z.string(),
  meta: z.array(reportRowSchema),
  body: z.string(),
  sourceRefs: z.array(z.string())
});
const reportEventTimeDerivationSchema = z.strictObject({
  reference: z.string().uuid(),
  createdAt: z.string().datetime(),
  authorization: z.literal("explicit_local_user_confirmation"),
  sourceReference: z.string().uuid(),
  targetReference: z.string().uuid(),
  sourceSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
  targetSnapshotDigest: z.string().regex(/^[a-f0-9]{64}$/),
  lineage: z.array(reportRowSchema),
  interpretation: z.array(reportRowSchema)
});
const reportCalculationComponentSchema = z.strictObject({
  key: z.enum(["relations", "luckCycle", "transit"]),
  label: z.enum(["四柱关系", "起运", "Transit"]),
  status: z.enum(["projected", "unavailable", "not_requested", "not_evaluable"]),
  executorId: z.string().nullable(),
  resultDigest: z.string().regex(/^[a-f0-9]{64}$/).nullable()
});
const reportCalculationSourceSchema = z.strictObject({
  natalSource: z.literal("verified_stored_revision"),
  downstreamSource: z.enum(["stored_receipt", "explicit_projection", "not_evaluable"]),
  receiptLedgerStatus: z.enum(["available", "schema_unavailable"]),
  storedHistoricalOutputCompared: z.boolean(),
  comparisonStatus: z.enum(["matched", "mismatch", "exact_executor_unavailable", "not_applicable"]),
  profileId: z.string().min(1),
  projectionDigest: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  receiptReference: z.string().uuid().nullable(),
  receiptDigest: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  requestFingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  capturedAt: z.string().datetime().nullable(),
  expertEvidenceStatus: z.literal("not_verified"),
  components: z.tuple([
    reportCalculationComponentSchema,
    reportCalculationComponentSchema,
    reportCalculationComponentSchema
  ]),
  notice: z.string().min(1)
});
const reportCitationSchema = z.strictObject({
  reference: z.string(),
  status: z.enum(["user_candidate", "verified", "rejected"]),
  statusLabel: z.string(),
  targets: z.array(z.string()).min(1),
  quote: z.string(),
  annotation: z.string(),
  decisionNote: z.string(),
  reviewerCount: z.number().int().nonnegative(),
  locator: z.string(),
  source: z.strictObject({
    title: z.string(),
    author: z.string(),
    edition: z.string(),
    contentHash: z.string(),
    sourceUrl: z.string(),
    publisher: z.string(),
    publicationYear: z.string(),
    rightsStatus: z.string(),
    workStatus: z.string(),
    editionStatus: z.string(),
    distributionPolicy: z.string(),
    reviewStatus: z.string()
  })
});

export const singleChartResearchReportSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0"),
  formatVersion: z.literal(SINGLE_CHART_REPORT_FORMAT_VERSION),
  kind: z.literal("single_chart_research_report"),
  anonymized: z.boolean(),
  title: z.literal("八字单盘研究报告"),
  subtitle: z.string(),
  caseLabel: z.string(),
  caseReference: z.string(),
  revisionLabel: z.string(),
  revisionReference: z.string(),
  privacyWarning: z.literal(REIDENTIFICATION_WARNING),
  previewNotice: z.literal("工程研究预览：不构成确定性命理结论；争议规则、候选引用与人工核验状态必须原样保留。"),
  suggestedFileBase: z.string().regex(/^[a-z0-9-]+$/),
  caseRows: z.array(reportRowSchema),
  birthRows: z.array(reportRowSchema),
  calibrationRows: z.array(reportRowSchema),
  ruleRows: z.array(reportRowSchema),
  integrityRows: z.array(reportRowSchema),
  calculationSource: reportCalculationSourceSchema,
  pillars: z.array(reportPillarSchema).length(4),
  provenance: z.array(reportProvenanceSchema),
  researchNotes: z.array(reportResearchEntrySchema),
  events: z.array(reportResearchEntrySchema),
  eventTimeDerivations: z.array(reportEventTimeDerivationSchema),
  citations: z.array(reportCitationSchema),
  redactions: z.array(z.string())
});

export const singleChartMarkdownDocumentSchema = z.strictObject({
  formatVersion: z.literal(SINGLE_CHART_REPORT_FORMAT_VERSION),
  format: z.literal("markdown"),
  anonymized: z.boolean(),
  encoding: z.literal("utf-8"),
  mimeType: z.literal("text/markdown;charset=utf-8"),
  fileExtension: z.literal(".md"),
  suggestedFileName: z.string().endsWith(".md"),
  warnings: z.tuple([z.literal(REIDENTIFICATION_WARNING)]),
  content: z.string().min(1)
});

type ParsedSingleChartReportInput = z.infer<typeof singleChartReportInputSchema>;
export type SingleChartReportInput = Omit<
  ParsedSingleChartReportInput,
  "revisionCalculationReceiptLedgerStatus" | "revisionCalculationReceipts"
> & Partial<Pick<
  ParsedSingleChartReportInput,
  "revisionCalculationReceiptLedgerStatus" | "revisionCalculationReceipts"
>>;
export type SingleChartReportOptions = z.input<typeof singleChartReportOptionsSchema>;
export type SingleChartResearchReport = z.infer<typeof singleChartResearchReportSchema>;
export type SingleChartMarkdownDocument = z.infer<typeof singleChartMarkdownDocumentSchema>;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertUniqueIds(records: Array<{ id: string }>, label: string): void {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) throw new Error(`${label} ID 重复：${record.id}`);
    seen.add(record.id);
  }
}

function value(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function row(label: string, rowValue: string | number | null | undefined) {
  return { label, value: value(rowValue) };
}

function rulePackProvenanceRows(binding: RulePackBinding | undefined) {
  if (!binding) {
    return [
      row("规则包绑定", "未绑定；本修订仅保留规则方案快照，不应推断来自已安装规则包")
    ];
  }
  return [
    row("规则包绑定", `${binding.kind}；仅表示计算来源，不代表发布者身份或规则正确性已经核验`),
    row("规则包 packId", binding.packId),
    row("规则包 packDigest", binding.packDigest),
    row("规则配置 profileId", binding.profileId),
    row("规则配置 profileVersion", binding.profileVersion),
    row("规则配置 profileDigest", binding.profileDigest),
    row("规则包 useMode", binding.useMode)
  ];
}

function sexLabel(sex: string): string {
  if (sex === "male") return "男";
  if (sex === "female") return "女";
  return "未指定";
}

function calendarLabel(calendar: string): string {
  return calendar === "lunar" ? "农历" : "公历";
}

function statusLabel(status: CitationRecord["status"]): string {
  if (status === "verified") return "双人核验";
  if (status === "rejected") return "已拒绝 / 反证";
  return "用户候选";
}

function noteRelevant(note: ResearchNoteRecord, revisionId: string): boolean {
  return note.anchor.kind === "case" || note.anchor.revisionId === revisionId;
}

function eventRelevant(event: EventRecord, revisionId: string): boolean {
  return event.revisionId === null || event.revisionId === revisionId;
}

function migrationSnapshotForEvent(event: EventRecord) {
  return {
    formatVersion: "1.0.0" as const,
    eventRecordVersion: event.recordVersion,
    caseId: event.caseId,
    revisionId: event.revisionId,
    transitNodeRef: event.transitNodeRef,
    datePrecision: event.datePrecision,
    startDate: event.startDate,
    endDate: event.endDate,
    timeContext: event.timeContext
  };
}

async function validateAndSortEventTimeMigrations(
  receipts: EventTimeMigrationReceipt[],
  events: EventRecord[]
): Promise<EventTimeMigrationReceipt[]> {
  assertUniqueIds(receipts, "EventTimeMigrationReceipt");
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const targetIds = new Set<string>();
  const interpretationKeys = new Set<string>();

  for (const receipt of receipts) {
    const source = eventsById.get(receipt.source.recordId);
    const target = eventsById.get(receipt.target.recordId);
    if (!source || !target) {
      throw new Error(`事件时间迁移凭证 ${receipt.id} 的源与目标必须同时属于当前单盘`);
    }
    if (
      !hasExactJsonStructure(receipt.source.snapshot, migrationSnapshotForEvent(source))
      || !hasExactJsonStructure(receipt.target.snapshot, migrationSnapshotForEvent(target))
    ) {
      throw new Error(`事件时间迁移凭证 ${receipt.id} 的冻结快照与当前 Event 时间血缘不一致`);
    }
    const [sourceSnapshotDigest, targetSnapshotDigest] = await Promise.all([
      sha256Hex(receipt.source.snapshot),
      sha256Hex(receipt.target.snapshot)
    ]);
    if (
      receipt.source.snapshotDigest !== sourceSnapshotDigest
      || receipt.target.snapshotDigest !== targetSnapshotDigest
    ) {
      throw new Error(`事件时间迁移凭证 ${receipt.id} 的冻结快照摘要与快照正文不一致`);
    }
    if (target.createdAt !== receipt.createdAt) {
      throw new Error(`事件时间迁移凭证 ${receipt.id} 的目标创建时间与凭证不一致`);
    }
    if (targetIds.has(receipt.target.recordId)) {
      throw new Error(`事件时间迁移目标 ${receipt.target.recordId} 被多个凭证声明`);
    }
    targetIds.add(receipt.target.recordId);
    const interpretationKey = `${receipt.source.recordId}\u0000${receipt.target.snapshotDigest}`;
    if (interpretationKeys.has(interpretationKey)) {
      throw new Error(`事件时间迁移源 ${receipt.source.recordId} 存在重复解释`);
    }
    interpretationKeys.add(interpretationKey);
  }

  return [...receipts].sort((left, right) =>
    compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
  );
}

function targetRelevant(
  target: CitationTarget,
  caseId: string,
  revisionId: string,
  noteIds: ReadonlySet<string>,
  eventIds: ReadonlySet<string>
): boolean {
  if (target.kind === "research_note") return noteIds.has(target.noteId);
  if (target.kind === "event") return eventIds.has(target.eventId);
  if (target.kind === "chart_field") return target.caseId === caseId && target.revisionId === revisionId;
  return target.subjectId.startsWith("bazi.pillar.");
}

function targetLabel(target: CitationTarget): string {
  if (target.kind === "research_note") return `研究笔记 ${target.noteId}`;
  if (target.kind === "event") return `真实事件 ${target.eventId}`;
  if (target.kind === "chart_field") return `命盘字段 ${target.field}`;
  return `证据主题 ${target.subjectId}`;
}

async function validateAndSort(rawInput: SingleChartReportInput) {
  const parsedInput = singleChartReportInputSchema.parse(rawInput);
  const input = {
    ...parsedInput,
    revision: await verifyRevisionRecordIntegrity(parsedInput.revision)
  };
  if (input.revision.caseId !== input.caseRecord.id) throw new Error("指定修订不属于当前案例");
  if (input.revision.revisionNumber > input.caseRecord.revisionCount) throw new Error("修订序号超过案例修订计数");
  if (
    input.revisionCalculationReceiptLedgerStatus === "schema_unavailable"
    && input.revisionCalculationReceipts.length > 0
  ) {
    throw new Error("计算收据账本架构不可用时不得夹带 Revision 计算收据");
  }

  assertUniqueIds(input.researchNotes, "ResearchNote");
  assertUniqueIds(input.events, "Event");
  assertUniqueIds(input.citations, "Citation");
  assertUniqueIds(input.knowledgeDocuments, "KnowledgeDocument");

  const notes = input.researchNotes.filter((note) => {
    if (note.caseId !== input.caseRecord.id) throw new Error(`ResearchNote ${note.id} 不属于当前案例`);
    if (!noteRelevant(note, input.revision.id)) throw new Error(`ResearchNote ${note.id} 不属于当前单盘快照`);
    return true;
  }).sort((left, right) => compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id));
  const events = input.events.filter((event) => {
    verifyEventForResearchExport(event);
    if (event.caseId !== input.caseRecord.id) throw new Error(`Event ${event.id} 不属于当前案例`);
    if (!eventRelevant(event, input.revision.id)) throw new Error(`Event ${event.id} 不属于当前单盘快照`);
    return true;
  }).sort(compareEventsForResearchExport);
  const eventTimeMigrationReceipts = await validateAndSortEventTimeMigrations(
    input.eventTimeMigrationReceipts,
    events
  );

  const noteIds = new Set(notes.map((note) => note.id));
  const eventIds = new Set(events.map((event) => event.id));
  const documents = new Map(input.knowledgeDocuments.map((knowledgeDocument) => [knowledgeDocument.id, knowledgeDocument]));
  const rights = new Map<string, SourceRightsRecord>();
  for (const record of input.sourceRights) {
    if (rights.has(record.documentId)) throw new Error(`SourceRights 重复：${record.documentId}`);
    rights.set(record.documentId, record);
  }

  const requiredDocumentIds = new Set<string>();
  for (const citation of input.citations) {
    if (!citation.targets.some((target) => targetRelevant(
      target,
      input.caseRecord.id,
      input.revision.id,
      noteIds,
      eventIds
    ))) throw new Error(`Citation ${citation.id} 与当前单盘无关`);
    requiredDocumentIds.add(citation.documentId);
  }
  if (documents.size !== requiredDocumentIds.size || rights.size !== requiredDocumentIds.size) {
    throw new Error("引用、资料与来源权利集合必须一一对应且不夹带无关记录");
  }
  for (const documentId of requiredDocumentIds) {
    const knowledgeDocument = documents.get(documentId);
    const sourceRights = rights.get(documentId);
    if (!knowledgeDocument || !sourceRights) throw new Error(`引用资料或来源权利缺失：${documentId}`);
    if (sourceRights.documentContentHash !== knowledgeDocument.contentHash) throw new Error(`来源权利正文哈希失配：${documentId}`);
    if ((sourceRights.origin === "user_import") !== (knowledgeDocument.recordType === "user_knowledge_document")) {
      throw new Error(`来源权利 origin 与资料类型不一致：${documentId}`);
    }
  }
  for (const citation of input.citations) {
    const knowledgeDocument = documents.get(citation.documentId)!;
    if (citation.documentContentHash !== knowledgeDocument.contentHash) throw new Error(`Citation 正文哈希失配：${citation.id}`);
  }

  const citations = [...input.citations].sort((left, right) => {
    const rank = { verified: 0, user_candidate: 1, rejected: 2 } as const;
    return rank[left.status] - rank[right.status]
      || compareText(left.targetKeys.join("|"), right.targetKeys.join("|"))
      || left.locator.startLine - right.locator.startLine
      || compareText(left.id, right.id);
  });
  return { input, notes, events, eventTimeMigrationReceipts, citations, documents, rights, noteIds, eventIds };
}

function researchNoteEntry(note: ResearchNoteRecord) {
  const anchor = note.anchor.kind === "case"
    ? "整个案例"
    : note.anchor.kind === "revision"
      ? `修订 ${note.anchor.revisionId}`
      : `修订 ${note.anchor.revisionId} / ${note.anchor.pillar}.${note.anchor.field}`;
  return {
    reference: note.id,
    title: anchor,
    meta: [row("状态", note.lifecycle), row("标签", note.tags.join("、")), row("编辑版本", note.editVersion)],
    body: note.body || "—",
    sourceRefs: note.sourceRefs
  };
}

function eventEntry(event: EventRecord) {
  const date = event.datePrecision === "unknown"
    ? "未知"
    : event.endDate && event.endDate !== event.startDate
      ? `${value(event.startDate)} 至 ${event.endDate}`
      : value(event.startDate);
  const time = eventTimeExportDetails(event);
  const timeRows = time.kind === "zoned_minute"
    ? [
        row("时间上下文", time.kind),
        row("IANA 时区", value(time.timeZone)),
        row("TZDB", value(time.tzdbVersion)),
        row("起始 DST 解析", value(time.start?.dstResolution)),
        row("起始 UTC 偏移", value(time.start?.utcOffset)),
        row("起始规范 UTC", value(time.start?.canonicalUtc)),
        ...(time.end ? [
          row("结束 DST 解析", time.end.dstResolution),
          row("结束 UTC 偏移", time.end.utcOffset),
          row("结束规范 UTC", time.end.canonicalUtc)
        ] : [])
      ]
    : [row("时间上下文", time.kind), row("时间说明", time.notice)];
  return {
    reference: event.id,
    title: event.title,
    meta: [
      row("日期", `${date}（${event.datePrecision}）`),
      ...timeRows,
      row("反馈", event.feedback),
      row("状态", event.deletedAt ? "已删除" : "有效"),
      row("运限节点", event.transitNodeRef ? `${event.transitNodeRef.nodeType}:${event.transitNodeRef.nodeId}` : "—"),
      row("标签", event.tags.join("、"))
    ],
    body: event.body || "—",
    sourceRefs: event.sourceRefs
  };
}

function eventTimeDerivationEntry(
  receipt: EventTimeMigrationReceipt,
  eventsById: ReadonlyMap<string, EventRecord>
) {
  const target = eventsById.get(receipt.target.recordId);
  if (!target) throw new Error(`事件时间迁移目标不存在：${receipt.target.recordId}`);
  const targetTime = eventTimeExportDetails(target);
  const interpretation = receipt.interpretation.kind === "calendar_date"
    ? [
        row("解释类型", "calendar_date"),
        row("时间说明", targetTime.notice)
      ]
    : [
        row("解释类型", "zoned_minute"),
        row("IANA 时区", receipt.interpretation.timeZone),
        row("TZDB", targetTime.tzdbVersion),
        row("起始 DST 选择", receipt.interpretation.startDisambiguation),
        row("起始 DST 解析", targetTime.start?.dstResolution),
        row("起始 UTC 偏移", targetTime.start?.utcOffset),
        row("起始规范 UTC", targetTime.start?.canonicalUtc),
        row("结束 DST 选择", receipt.interpretation.endDisambiguation),
        row("结束 DST 解析", targetTime.end?.dstResolution),
        row("结束 UTC 偏移", targetTime.end?.utcOffset),
        row("结束规范 UTC", targetTime.end?.canonicalUtc)
      ];
  return {
    reference: receipt.id,
    createdAt: receipt.createdAt,
    authorization: receipt.authorization.kind,
    sourceReference: receipt.source.recordId,
    targetReference: receipt.target.recordId,
    sourceSnapshotDigest: receipt.source.snapshotDigest,
    targetSnapshotDigest: receipt.target.snapshotDigest,
    lineage: [
      row("案例", receipt.source.snapshot.caseId),
      row("修订", receipt.source.snapshot.revisionId),
      row("运限节点", receipt.source.snapshot.transitNodeRef ? JSON.stringify(receipt.source.snapshot.transitNodeRef) : null),
      row("日期精度", receipt.source.snapshot.datePrecision),
      row("起始墙上时间", receipt.source.snapshot.startDate),
      row("结束墙上时间", receipt.source.snapshot.endDate)
    ],
    interpretation
  };
}

type ReportCalculationSource = z.infer<typeof reportCalculationSourceSchema>;
type DownstreamComponentKey = "relations" | "luckCycle" | "transit";

const DOWNSTREAM_COMPONENTS = [
  ["relations", "四柱关系"],
  ["luckCycle", "起运"],
  ["transit", "Transit"]
] as const;

function calculationComponentEntry(
  projection: RevisionDerivedReplayProjection,
  key: DownstreamComponentKey,
  label: "四柱关系" | "起运" | "Transit",
  anonymized: boolean
): ReportCalculationSource["components"][number] {
  const component = projection[key];
  return {
    key,
    label,
    status: component.status,
    executorId: "executorId" in component ? component.executorId ?? null : null,
    resultDigest: !anonymized && component.status === "projected"
      ? component.resultDigest
      : null
  };
}

function calculationSourceNotice(
  resolution: RevisionCalculationSourceResolution,
  ledgerStatus: "available" | "schema_unavailable"
): string {
  if (resolution.source === "explicit_projection") {
    return ledgerStatus === "available"
      ? "下游组件由列明的当前精确执行器按冻结 Revision 重新投影；未找到与本请求完全一致的历史收据，也未写入新收据。"
      : "当前发布代没有计算收据账本；下游组件仅由列明的当前精确执行器按冻结 Revision 重新投影，不代表历史输出。";
  }
  if (resolution.comparisonStatus === "matched") {
    return "下游组件取自已保存计算收据，内容与源 Revision 绑定已校验，并与收据列明的精确执行器复演一致；这仍不等于专家金标。";
  }
  if (resolution.comparisonStatus === "exact_executor_unavailable") {
    return "下游组件取自内容与源 Revision 绑定均已校验的计算收据，但安装包未保留至少一个所需精确执行器；不会回退当前版本，也不声明复演一致。";
  }
  return "下游组件取自已保存计算收据，但精确复演发现差异；报告保留差异状态，不会静默改用当前计算。";
}

async function buildReportCalculationSource(
  revision: unknown,
  receipts: readonly unknown[],
  ledgerStatus: "available" | "schema_unavailable",
  anonymized: boolean
): Promise<ReportCalculationSource> {
  let resolution: RevisionCalculationSourceResolution;
  try {
    resolution = await resolveRevisionCalculationSource(
      revision,
      receipts,
      { profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE }
    );
  } catch (cause) {
    if (!(cause instanceof RevisionDerivedReplayError)) throw cause;
    return {
      natalSource: "verified_stored_revision",
      downstreamSource: "not_evaluable",
      receiptLedgerStatus: ledgerStatus,
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable",
      profileId: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId,
      projectionDigest: null,
      receiptReference: null,
      receiptDigest: null,
      requestFingerprint: null,
      capturedAt: null,
      expertEvidenceStatus: "not_verified",
      components: DOWNSTREAM_COMPONENTS.map(([key, label]) => ({
        key,
        label,
        status: "not_evaluable" as const,
        executorId: null,
        resultDigest: null
      })) as ReportCalculationSource["components"],
      notice: `冻结 Revision 的完整性已校验，但下游精确版本投影不可执行：${cause.message}`
    };
  }

  const receipt = resolution.receipt;
  return {
    natalSource: "verified_stored_revision",
    downstreamSource: resolution.source,
    receiptLedgerStatus: ledgerStatus,
    storedHistoricalOutputCompared: resolution.storedHistoricalOutputCompared,
    comparisonStatus: resolution.comparisonStatus,
    profileId: resolution.profileId,
    projectionDigest: anonymized ? null : resolution.projection.projectionDigest,
    receiptReference: !anonymized && receipt ? receipt.id : null,
    receiptDigest: !anonymized && receipt ? receipt.receiptDigest : null,
    requestFingerprint: !anonymized && receipt ? receipt.requestFingerprint : null,
    capturedAt: !anonymized && receipt ? receipt.createdAt : null,
    expertEvidenceStatus: "not_verified",
    components: DOWNSTREAM_COMPONENTS.map(([key, label]) =>
      calculationComponentEntry(resolution.projection, key, label, anonymized)
    ) as ReportCalculationSource["components"],
    notice: calculationSourceNotice(resolution, ledgerStatus)
  };
}

export async function buildSingleChartResearchReport(
  rawInput: SingleChartReportInput,
  rawOptions: SingleChartReportOptions = {}
): Promise<SingleChartResearchReport> {
  const { anonymized } = singleChartReportOptionsSchema.parse(rawOptions);
  const {
    input,
    notes,
    events,
    eventTimeMigrationReceipts,
    citations,
    documents,
    rights,
    noteIds,
    eventIds
  } = await validateAndSort(rawInput);
  const revision = input.revision;
  const birth = revision.input;
  const calibration = revision.timeCalibration;
  const calendar = revision.facts.calendar;
  const profile = revision.ruleProfile;
  const calculationSource = await buildReportCalculationSource(
    revision,
    input.revisionCalculationReceipts,
    input.revisionCalculationReceiptLedgerStatus,
    anonymized
  );
  const revisionReference = anonymized ? `R${revision.revisionNumber}` : revision.id;
  const caseReference = anonymized ? "CASE" : input.caseRecord.id;
  const redacted = "（匿名模式已移除）";
  const warningRows = anonymized
    ? [row("时间校准警告", `${calibration.warnings.length} 条（匿名模式不展开）`), row("计算警告", `${revision.manifest.warnings.length} 条（匿名模式不展开）`)]
    : [row("时间校准警告", calibration.warnings.join("；")), row("计算警告", revision.manifest.warnings.join("；"))];
  const layerLabels = Object.entries(profile.layers).filter(([, enabled]) => enabled).map(([key]) => key).join("、");
  const solarSummary = anonymized
    ? (calibration.solarTime ? "已计算（匿名模式移除位置推导细节）" : "未计算")
    : calibration.solarTime
      ? `${calibration.solarTime.modelId}；${calibration.solarTime.variants.map((variant) => `${variant.candidateChoice}:${variant.totalCorrectionMinutes.toFixed(2)} 分`).join("；")}`
      : "未计算";

  const eventsById = new Map(events.map((event) => [event.id, event]));
  const report = {
    schemaVersion: "1.0.0" as const,
    formatVersion: SINGLE_CHART_REPORT_FORMAT_VERSION,
    kind: "single_chart_research_report" as const,
    anonymized,
    title: "八字单盘研究报告" as const,
    subtitle: `${calendar.solarText} · ${calendar.lunarText}`,
    caseLabel: anonymized ? "匿名案例" : input.caseRecord.alias,
    caseReference,
    revisionLabel: `第 ${revision.revisionNumber} 版${input.caseRecord.latestRevisionId === revision.id ? " · 最新" : " · 历史修订"}`,
    revisionReference,
    privacyWarning: REIDENTIFICATION_WARNING,
    previewNotice: "工程研究预览：不构成确定性命理结论；争议规则、候选引用与人工核验状态必须原样保留。" as const,
    suggestedFileBase: `hakimi-chart-r${revision.revisionNumber}-${anonymized ? "anonymous" : "full"}`,
    caseRows: [
      row("案例", anonymized ? "匿名案例" : input.caseRecord.alias),
      row("案例标识", caseReference),
      row("修订", `第 ${revision.revisionNumber} 版 / ${revisionReference}`),
      row("标签", anonymized ? redacted : input.caseRecord.tags.join("、")),
      row("案例备注", anonymized ? redacted : input.caseRecord.notes)
    ],
    birthRows: [
      row("输入历法", calendarLabel(birth.calendarType)),
      row("原始日期", `${birth.date}${birth.lunarLeapMonth ? "（闰月）" : ""}`),
      row("出生时间", `${value(birth.time)}（${birth.timePrecision}）`),
      row("时区", birth.timeZone),
      row("性别", sexLabel(birth.sex)),
      row("地点", anonymized ? redacted : birth.location.label),
      row("坐标", anonymized || birth.location.latitude === null || birth.location.longitude === null
        ? redacted
        : `${birth.location.latitude}, ${birth.location.longitude}`),
      row("来源备注", anonymized ? redacted : birth.sourceNote)
    ],
    calibrationRows: [
      row("民用公历日期", calibration.calendarResolution?.resolvedGregorianDate ?? "旧修订未保存"),
      row("历法算法", calibration.calendarResolution?.algorithmId ?? "旧修订未保存"),
      row("原始民用时间", calibration.originalCivilDateTime),
      row("排盘墙上时间", calibration.activeWallTime),
      row("UTC 瞬时点", calibration.utcInstant),
      row("UTC 偏移", calibration.utcOffset),
      row("DST 状态", calibration.dstStatus),
      row("时区解析", calibration.timeZoneResolution
        ? `${calibration.timeZoneResolution.status} / ${calibration.timeZoneResolution.policy}`
        : "旧修订未保存"),
      row("真太阳时预览", anonymized ? redacted : calibration.solarTimePreview),
      row("太阳时模型", solarSummary),
      ...warningRows
    ],
    ruleRows: [
      row("规则方案", anonymized ? `规则配置 ${profile.profileVersion}` : `${profile.label} ${profile.profileVersion}`),
      row("规则状态", profile.status),
      row("规则说明", anonymized ? redacted : profile.notice),
      row("界年 / 换月", `${profile.calendar.yearBoundary} / ${profile.calendar.monthBoundary}`),
      row("换日 / 子时日干", `${profile.calendar.dayBoundary} / ${profile.calendar.ziHourDayStemBasis}`),
      row("时柱时间基准", profile.calendar.hourBasis),
      row("DST 歧义", profile.calendar.dstAmbiguity),
      row("太阳时", `${profile.solarTime.enabled ? "启用" : "关闭"}；应用=${calibration.solarTimeApplied}`),
      row("起运", `${profile.luckCycle.directionRule} / ${profile.luckCycle.anchor} / ${profile.luckCycle.startAgeMethod}`),
      row("启用层", layerLabels),
      row("规则来源", anonymized ? redacted : profile.sourceRefs.join("；")),
      ...rulePackProvenanceRows(revision.rulePackBinding)
    ],
    integrityRows: [
      row("引擎", `${revision.manifest.engine.name} ${revision.manifest.engine.version}`),
      row("上游", `${revision.manifest.engine.upstreamName} ${revision.manifest.engine.upstreamVersion}`),
      row("时区库", revision.manifest.timeZoneDatabase ? `IANA ${revision.manifest.timeZoneDatabase.ianaVersion} · 固定工件` : "旧版浏览器 Intl · 具体版本未识别"),
      row("tzdb 数据摘要", revision.manifest.timeZoneDatabase?.dataSha256),
      row("时区解析器", revision.manifest.timeZoneDatabase ? `${revision.manifest.timeZoneDatabase.resolver.name} ${revision.manifest.timeZoneDatabase.resolver.version}` : undefined),
      row("规则摘要", revision.manifest.ruleProfileDigest),
      row("运限规则摘要", revision.manifest.luckCycleRuleDigest),
      row("结果哈希", anonymized ? redacted : revision.manifest.resultHash),
      row("支持范围", revision.manifest.supportedRangeStatus),
      row("验证状态", revision.manifest.verificationStatus),
      row("计算时间", anonymized ? redacted : revision.manifest.calculatedAt)
    ],
    calculationSource,
    pillars: (["year", "month", "day", "hour"] as const).map((key) => {
      const pillar = revision.facts.pillars[key];
      return {
        key,
        label: pillar.label,
        ganZhi: pillar.ganZhi,
        stemTenGod: pillar.stemTenGod,
        hiddenStems: pillar.hiddenStems.join("、"),
        branchTenGods: pillar.branchTenGods.join("、"),
        wuXing: pillar.wuXing,
        nayin: pillar.nayin,
        twelveGrowth: pillar.twelveGrowth,
        xun: pillar.xun,
        voidBranches: pillar.voidBranches
      };
    }),
    provenance: [...revision.facts.fieldProvenance].sort((left, right) => compareText(left.field, right.field)).map((item, index) => ({
      field: anonymized && !CANONICAL_ANONYMOUS_PROVENANCE_FIELD.test(item.field)
        ? `字段 ${index + 1}（非标准路径已移除）`
        : item.field,
      kind: item.kind,
      algorithmId: anonymized ? redacted : item.algorithmId,
      verificationStatus: item.verificationStatus,
      sourceRefs: anonymized ? [] : item.sourceRefs,
      note: anonymized ? redacted : item.note
    })),
    researchNotes: anonymized ? [] : notes.map(researchNoteEntry),
    events: anonymized ? [] : events.map(eventEntry),
    eventTimeDerivations: anonymized
      ? []
      : eventTimeMigrationReceipts.map((receipt) => eventTimeDerivationEntry(receipt, eventsById)),
    citations: anonymized ? [] : citations.map((citation, index) => {
      const knowledgeDocument: KnowledgeDocumentRecord = documents.get(citation.documentId)!;
      const sourceRights: SourceRightsRecord = rights.get(citation.documentId)!;
      return {
        reference: `C${index + 1}`,
        status: citation.status,
        statusLabel: statusLabel(citation.status),
        targets: citation.targets
          .filter((target) => targetRelevant(target, input.caseRecord.id, revision.id, noteIds, eventIds))
          .map(targetLabel),
        quote: citation.quote,
        annotation: citation.annotation,
        decisionNote: citation.decisionNote,
        reviewerCount: new Set(citation.reviewAttestations.map((item) => item.reviewerId)).size,
        locator: `${citation.locator.sectionId} · 第 ${citation.locator.startLine}-${citation.locator.endLine} 行`,
        source: {
          title: knowledgeDocument.title,
          author: knowledgeDocument.author,
          edition: knowledgeDocument.edition,
          contentHash: knowledgeDocument.contentHash,
          sourceUrl: sourceRights.source.sourceUrl ?? "",
          publisher: sourceRights.source.publisher,
          publicationYear: sourceRights.source.publicationYear?.toString() ?? "",
          rightsStatus: sourceRights.rights.status,
          workStatus: sourceRights.rights.workStatus,
          editionStatus: sourceRights.rights.editionStatus,
          distributionPolicy: sourceRights.rights.distributionPolicy,
          reviewStatus: sourceRights.review.status
        }
      };
    }),
    redactions: anonymized ? [
      "案例别名、UUID、标签与案例备注",
      "地点、坐标、来源备注与太阳时位置推导细节",
      "规则方案名称/说明/自由文本来源与字段 provenance 自由文本（非个人的规则包绑定标识与摘要保留）",
      "研究笔记、事件日期/正文/节点引用",
      "事件时间迁移凭证、源/目标标识、冻结摘要与解释血缘",
      "结构化本地文献引用、结果哈希与创建时间"
    ] : []
  };
  return singleChartResearchReportSchema.parse(report);
}

function markdownEscape(value: string): string {
  return value.replace(/[\\`*_\[\]]/g, "\\$&");
}

function rowsToMarkdown(rows: Array<{ label: string; value: string }>): string[] {
  return rows.map((item) => `- ${markdownEscape(item.label)}：${markdownEscape(item.value)}`);
}

function calculationSourceMarkdownRows(source: SingleChartResearchReport["calculationSource"]): string[] {
  const downstreamLabel = source.downstreamSource === "stored_receipt"
    ? "已保存计算收据"
    : source.downstreamSource === "explicit_projection"
      ? "当前显式版本投影"
      : "当前不可计算";
  const rows = [
    row("本命来源", `已校验冻结 Revision（${source.natalSource}）`),
    row("下游来源", `${downstreamLabel}（${source.downstreamSource}）`),
    row("收据账本", source.receiptLedgerStatus),
    row("历史输出已比较", source.storedHistoricalOutputCompared ? "是" : "否"),
    row("精确复演", source.comparisonStatus),
    row("执行器 Profile", source.profileId),
    row("专家证据", source.expertEvidenceStatus),
    ...(source.projectionDigest ? [row("投影摘要", source.projectionDigest)] : []),
    ...(source.receiptReference ? [row("收据引用", source.receiptReference)] : []),
    ...(source.requestFingerprint ? [row("请求指纹", source.requestFingerprint)] : []),
    ...(source.receiptDigest ? [row("收据摘要", source.receiptDigest)] : []),
    ...(source.capturedAt ? [row("保存时间", source.capturedAt)] : []),
    row("边界说明", source.notice)
  ];
  return [
    ...rowsToMarkdown(rows),
    "",
    ...source.components.flatMap((component) => [
      `### ${markdownEscape(component.label)}`,
      "",
      ...rowsToMarkdown([
        row("组件", component.key),
        row("状态", component.status),
        row("执行器", component.executorId),
        ...(component.resultDigest ? [row("结果摘要", component.resultDigest)] : [])
      ]),
      ""
    ])
  ];
}

export function exportSingleChartResearchMarkdown(reportInput: SingleChartResearchReport): SingleChartMarkdownDocument {
  const report = singleChartResearchReportSchema.parse(reportInput);
  const lines = [
    "---",
    `schemaVersion: "${report.schemaVersion}"`,
    `formatVersion: "${report.formatVersion}"`,
    `kind: "${report.kind}"`,
    "format: \"markdown\"",
    `anonymized: ${report.anonymized ? "true" : "false"}`,
    "---",
    "",
    `# ${report.title}`,
    "",
    `> ${report.previewNotice}`,
    `> ${report.privacyWarning}`,
    "",
    `- 导出模式：${report.anonymized ? "匿名" : "完整"}`,
    `- ${report.caseLabel} · ${report.revisionLabel}`,
    `- ${report.subtitle}`,
    "",
    "## 案例与出生输入",
    "",
    ...rowsToMarkdown([...report.caseRows, ...report.birthRows]),
    "",
    "## 四柱事实",
    "",
    "| 柱 | 干支 | 十神 | 藏干 | 支十神 | 五行 | 纳音 | 长生 | 旬 | 空亡 |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...report.pillars.map((pillar) => `| ${pillar.label} | ${pillar.ganZhi} | ${pillar.stemTenGod} | ${pillar.hiddenStems} | ${pillar.branchTenGods} | ${pillar.wuXing} | ${pillar.nayin} | ${pillar.twelveGrowth} | ${pillar.xun} | ${pillar.voidBranches} |`),
    "",
    "## 时间校准",
    "",
    ...rowsToMarkdown(report.calibrationRows),
    "",
    "## 规则与完整性",
    "",
    ...rowsToMarkdown([...report.ruleRows, ...report.integrityRows]),
    "",
    "## 下游计算来源",
    "",
    ...calculationSourceMarkdownRows(report.calculationSource),
    "## 字段来源与验证状态",
    ""
  ];
  for (const item of report.provenance) {
    lines.push(
      `### ${markdownEscape(item.field)}`,
      "",
      `- 类型：${markdownEscape(item.kind)}`,
      `- 算法：${markdownEscape(item.algorithmId)}`,
      `- 状态：${markdownEscape(item.verificationStatus)}`,
      `- 来源：${item.sourceRefs.length ? item.sourceRefs.map(markdownEscape).join("；") : "待补证据"}`,
      `- 说明：${markdownEscape(item.note || "—")}`,
      ""
    );
  }
  lines.push("## 研究笔记", "");
  if (!report.researchNotes.length) lines.push(report.anonymized ? "（匿名模式已移除）" : "—", "");
  for (const note of report.researchNotes) {
    lines.push(
      `### ${markdownEscape(note.title)}`,
      "",
      `- 记录标识：${markdownEscape(note.reference)}`,
      `- 旧来源字符串：${note.sourceRefs.length ? note.sourceRefs.map(markdownEscape).join("；") : "—"}`,
      ...rowsToMarkdown(note.meta),
      "",
      note.body,
      ""
    );
  }
  lines.push("## 真实事件", "");
  if (!report.events.length) lines.push(report.anonymized ? "（匿名模式已移除）" : "—", "");
  for (const event of report.events) {
    lines.push(
      `### ${markdownEscape(event.title)}`,
      "",
      `- Event ID：${markdownEscape(event.reference)}`,
      `- 旧来源字符串：${event.sourceRefs.length ? event.sourceRefs.map(markdownEscape).join("；") : "—"}`,
      ...rowsToMarkdown(event.meta),
      "",
      event.body,
      ""
    );
  }
  lines.push("## 事件时间迁移血缘", "");
  if (!report.eventTimeDerivations.length) {
    lines.push(report.anonymized ? "（匿名模式已移除）" : "—", "");
  }
  for (const migration of report.eventTimeDerivations) {
    lines.push(
      `### 迁移凭证 ${markdownEscape(migration.reference)}`,
      "",
      `- 显式授权：${markdownEscape(migration.authorization)}`,
      `- 创建时间：${markdownEscape(migration.createdAt)}`,
      `- 源 Event：${markdownEscape(migration.sourceReference)}`,
      `- 目标 Event：${markdownEscape(migration.targetReference)}`,
      `- 源快照摘要：${markdownEscape(migration.sourceSnapshotDigest)}`,
      `- 目标快照摘要：${markdownEscape(migration.targetSnapshotDigest)}`,
      "",
      "#### 冻结研究血缘",
      "",
      ...rowsToMarkdown(migration.lineage),
      "",
      "#### 显式时间解释",
      "",
      ...rowsToMarkdown(migration.interpretation),
      ""
    );
  }
  lines.push("## 结构化引用与反证", "");
  if (!report.citations.length) lines.push(report.anonymized ? "（匿名模式已移除）" : "待补结构化引用", "");
  for (const citation of report.citations) {
    lines.push(
      `### ${citation.reference} · ${citation.statusLabel}`,
      "",
      `- 引用状态：${markdownEscape(citation.status)} / ${markdownEscape(citation.statusLabel)}`,
      `- 文献：${markdownEscape(citation.source.title)}`,
      `- 作者：${markdownEscape(citation.source.author || "—")}`,
      `- 版本：${markdownEscape(citation.source.edition || "—")}`,
      `- 出版信息：${markdownEscape(citation.source.publisher || "—")} / ${markdownEscape(citation.source.publicationYear || "—")}`,
      `- 来源网址：${markdownEscape(citation.source.sourceUrl || "—")}`,
      `- 正文哈希：${markdownEscape(citation.source.contentHash)}`,
      `- 定位：${markdownEscape(citation.locator)}`,
      `- 目标：${citation.targets.map(markdownEscape).join("；")}`,
      `- 权利状态：${markdownEscape(citation.source.rightsStatus)}`,
      `- 作品状态：${markdownEscape(citation.source.workStatus)}`,
      `- 版本状态：${markdownEscape(citation.source.editionStatus)}`,
      `- 分发策略：${markdownEscape(citation.source.distributionPolicy)}`,
      `- 复核状态：${markdownEscape(citation.source.reviewStatus)}`,
      `- 复核人数：${citation.reviewerCount}`,
      `- 批注：${markdownEscape(citation.annotation || "—")}`,
      `- 决定说明：${markdownEscape(citation.decisionNote || "—")}`,
      "",
      ...citation.quote.split("\n").map((line) => `> ${line}`),
      ""
    );
  }
  if (report.redactions.length) {
    lines.push("## 匿名移除项", "", ...report.redactions.map((item) => `- ${item}`), "");
  }
  return singleChartMarkdownDocumentSchema.parse({
    formatVersion: SINGLE_CHART_REPORT_FORMAT_VERSION,
    format: "markdown",
    anonymized: report.anonymized,
    encoding: "utf-8",
    mimeType: "text/markdown;charset=utf-8",
    fileExtension: ".md",
    suggestedFileName: `${report.suggestedFileBase}.md`,
    warnings: [REIDENTIFICATION_WARNING],
    content: `${lines.filter((line, index) => line !== "" || lines[index - 1] !== "").join("\n").trimEnd()}\n`
  });
}
