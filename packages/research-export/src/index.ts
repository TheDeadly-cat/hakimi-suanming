import {
  caseRecordSchema,
  eventRecordSchema,
  researchNoteRecordSchema,
  revisionRecordSchema,
  type CaseRecord,
  type EventRecord,
  type ResearchNoteRecord,
  type RulePackBinding,
  type RevisionRecord
} from "@hakimi/contracts";
import { z } from "zod";
import {
  compareEventsForResearchExport,
  eventTimeExportDetails,
  verifyEventForResearchExport
} from "./event-time";
import { REIDENTIFICATION_WARNING } from "./privacy";

export {
  FULL_AUDIT_PRIVACY_WARNING,
  PAIR_REIDENTIFICATION_WARNING,
  REIDENTIFICATION_WARNING
} from "./privacy";

export const RESEARCH_EXPORT_FORMAT_VERSION = "0.4.0" as const;

function hasExactJsonStructure(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => hasExactJsonStructure(value, right[index]));
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) =>
      key === rightKeys[index] && hasExactJsonStructure(leftRecord[key], rightRecord[key])
    );
}

const exactContractRecord = <Output>(schema: z.ZodType<Output>, label: string) =>
  z.unknown().transform((input, context): Output => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
      return z.NEVER;
    }
    if (!hasExactJsonStructure(input, parsed.data)) {
      context.addIssue({
        code: "custom",
        message: `${label} 包含未知字段、缺失默认字段，或会被 contract 静默规范化`
      });
      return z.NEVER;
    }
    return parsed.data;
  });

const exactCaseRecordSchema = exactContractRecord(caseRecordSchema, "Case");
const exactRevisionRecordSchema = exactContractRecord(revisionRecordSchema, "Revision");
const exactResearchNoteRecordSchema = exactContractRecord(researchNoteRecordSchema, "ResearchNote");
const exactEventRecordSchema = exactContractRecord(eventRecordSchema, "Event");

export const researchExportInputSchema = z.strictObject({
  caseRecord: exactCaseRecordSchema,
  revisions: z.array(exactRevisionRecordSchema),
  researchNotes: z.array(exactResearchNoteRecordSchema),
  events: z.array(exactEventRecordSchema)
});

export const researchExportOptionsSchema = z.strictObject({
  anonymized: z.boolean().default(true)
});

const exportDocumentBase = {
  formatVersion: z.literal(RESEARCH_EXPORT_FORMAT_VERSION),
  anonymized: z.boolean(),
  encoding: z.literal("utf-8"),
  suggestedFileName: z.string().min(1),
  warnings: z.tuple([z.literal(REIDENTIFICATION_WARNING)])
};

export const markdownResearchExportDocumentSchema = z.strictObject({
  ...exportDocumentBase,
  format: z.literal("markdown"),
  mimeType: z.literal("text/markdown;charset=utf-8"),
  fileExtension: z.literal(".md"),
  content: z.string().min(1)
});

export const csvResearchExportDocumentSchema = z.strictObject({
  ...exportDocumentBase,
  format: z.literal("csv"),
  mimeType: z.literal("text/csv;charset=utf-8"),
  fileExtension: z.literal(".csv"),
  content: z.string().min(2).refine((value) => value.startsWith("\uFEFF"), "CSV 必须包含 UTF-8 BOM")
});

export const researchExportDocumentSchema = z.discriminatedUnion("format", [
  markdownResearchExportDocumentSchema,
  csvResearchExportDocumentSchema
]);

export type ResearchExportInput = z.infer<typeof researchExportInputSchema>;
export type ResearchExportOptions = z.input<typeof researchExportOptionsSchema>;
export type ResearchExportDocument = z.infer<typeof researchExportDocumentSchema>;

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

function canonicalizeInput(raw: unknown): ResearchExportInput {
  const input = researchExportInputSchema.parse(raw);
  const caseId = input.caseRecord.id;
  const revisions = [...input.revisions].sort((left, right) =>
    left.revisionNumber - right.revisionNumber || compareText(left.id, right.id)
  );
  const researchNotes = [...input.researchNotes].sort((left, right) =>
    compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
  );
  const events = [...input.events].sort(compareEventsForResearchExport);

  assertUniqueIds(revisions, "Revision");
  assertUniqueIds(researchNotes, "ResearchNote");
  assertUniqueIds(events, "Event");
  const revisionIds = new Set(revisions.map((revision) => revision.id));
  const revisionsById = new Map(revisions.map((revision) => [revision.id, revision]));

  for (const revision of revisions) {
    if (revision.caseId !== caseId) throw new Error(`Revision ${revision.id} 不属于 Case ${caseId}`);
  }
  for (let index = 0; index < revisions.length; index += 1) {
    if (revisions[index].revisionNumber !== index + 1) {
      throw new Error(`Revision 序号必须从 1 连续递增；缺少序号 ${index + 1}`);
    }
  }
  const latest = revisions.at(-1);
  if (
    revisions.length !== input.caseRecord.revisionCount ||
    !latest ||
    latest.id !== input.caseRecord.latestRevisionId
  ) {
    throw new Error("Case 的 revisionCount/latestRevisionId 与修订集合不一致");
  }

  for (const note of researchNotes) {
    if (note.caseId !== caseId) throw new Error(`ResearchNote ${note.id} 不属于 Case ${caseId}`);
    if (note.anchor.kind !== "case" && !revisionIds.has(note.anchor.revisionId)) {
      throw new Error(`ResearchNote ${note.id} 引用了不存在的 Revision ${note.anchor.revisionId}`);
    }
  }
  for (const event of events) {
    verifyEventForResearchExport(event);
    if (event.caseId !== caseId) throw new Error(`Event ${event.id} 不属于 Case ${caseId}`);
    if (event.revisionId !== null && !revisionIds.has(event.revisionId)) {
      throw new Error(`Event ${event.id} 引用了不存在的 Revision ${event.revisionId}`);
    }
    if (event.transitNodeRef?.namespace === "hakimi-transit-node") {
      const revision = event.revisionId ? revisionsById.get(event.revisionId) : null;
      if (
        !revision ||
        event.transitNodeRef.revisionId !== revision.id ||
        event.transitNodeRef.chartResultHash !== revision.manifest.resultHash ||
        event.transitNodeRef.ruleProfileDigest !== revision.manifest.ruleProfileDigest ||
        (revision.manifest.luckCycleRuleDigest !== undefined &&
          event.transitNodeRef.luckCycleRuleDigest !== revision.manifest.luckCycleRuleDigest)
      ) {
        throw new Error(`Event ${event.id} 的运限节点与关联 Revision 上下文不一致`);
      }
    }
  }

  return { caseRecord: input.caseRecord, revisions, researchNotes, events };
}

function resolveOptions(options?: ResearchExportOptions): { anonymized: boolean } {
  return researchExportOptionsSchema.parse(options ?? {});
}

function anonymizedReference(prefix: string, index: number): string {
  return `${prefix}${index + 1}`;
}

function displayId(id: string, anonymized: boolean, fallback: string): string {
  return anonymized ? fallback : id;
}

function escapeMarkdownInline(value: string): string {
  return value.replace(/[\\`*_\[\]]/g, "\\$&");
}

function inlineValue(value: string | null | undefined): string {
  return value ? escapeMarkdownInline(value) : "—";
}

function listValue(values: string[]): string {
  return values.length ? values.map(escapeMarkdownInline).join("、") : "—";
}

function rulePackMarkdownRows(binding: RulePackBinding | undefined): string[] {
  if (!binding) {
    return ["- 规则包绑定：未绑定；本修订仅保留规则方案快照，不应推断来自已安装规则包"];
  }
  return [
    `- 规则包绑定：${inlineValue(binding.kind)}；仅表示计算来源，不代表发布者身份或规则正确性已经核验`,
    `- 规则包 packId：${inlineValue(binding.packId)}`,
    `- 规则包 packDigest：${inlineValue(binding.packDigest)}`,
    `- 规则配置 profileId：${inlineValue(binding.profileId)}`,
    `- 规则配置 profileVersion：${inlineValue(binding.profileVersion)}`,
    `- 规则配置 profileDigest：${inlineValue(binding.profileDigest)}`,
    `- 规则包 useMode：${inlineValue(binding.useMode)}`
  ];
}

function noteAnchorText(note: ResearchNoteRecord, revisionAliases: Map<string, string>): string {
  if (note.anchor.kind === "case") return "案例";
  const revision = revisionAliases.get(note.anchor.revisionId) ?? note.anchor.revisionId;
  if (note.anchor.kind === "revision") return `修订 ${revision}`;
  return `修订 ${revision} / ${note.anchor.pillar}.${note.anchor.field}`;
}

function dateRange(event: EventRecord): string {
  if (event.datePrecision === "unknown") return "未知";
  if (!event.endDate || event.endDate === event.startDate) return event.startDate ?? "—";
  return `${event.startDate} 至 ${event.endDate}`;
}

function eventTimeMarkdownRows(event: EventRecord, anonymized: boolean): string[] {
  if (anonymized) return ["- 时间上下文：（匿名模式已移除）"];
  const details = eventTimeExportDetails(event);
  const rows = [`- 时间上下文：${inlineValue(details.kind)}`];
  if (details.notice) rows.push(`- 时间说明：${inlineValue(details.notice)}`);
  if (details.kind !== "zoned_minute") return rows;
  rows.push(
    `- IANA 时区：${inlineValue(details.timeZone)}`,
    `- TZDB：${inlineValue(details.tzdbVersion)}`,
    `- 起始 DST 解析：${inlineValue(details.start?.dstResolution)}`,
    `- 起始 UTC 偏移：${inlineValue(details.start?.utcOffset)}`,
    `- 起始规范 UTC：${inlineValue(details.start?.canonicalUtc)}`,
    `- 结束 DST 解析：${inlineValue(details.end?.dstResolution)}`,
    `- 结束 UTC 偏移：${inlineValue(details.end?.utcOffset)}`,
    `- 结束规范 UTC：${inlineValue(details.end?.canonicalUtc)}`
  );
  return rows;
}

function markdownRevision(
  revision: RevisionRecord,
  index: number,
  anonymized: boolean
): string[] {
  const revisionRef = anonymizedReference("R", index);
  const input = revision.input;
  const pillars = revision.facts.pillars;
  const lines = [
    `### 修订 ${revision.revisionNumber}`,
    "",
    `- 修订标识：${inlineValue(displayId(revision.id, anonymized, revisionRef))}`,
    `- 原始历法日期：${inlineValue(input.date)}${input.lunarLeapMonth ? "（闰月）" : ""}`,
    `- 出生时间：${inlineValue(input.time)}（${inlineValue(input.timePrecision)}）`,
    `- 时区：${inlineValue(input.timeZone)}`,
    `- 历法 / 性别：${inlineValue(input.calendarType)} / ${inlineValue(input.sex)}`,
    `- 民用公历日期：${inlineValue(revision.timeCalibration.calendarResolution?.resolvedGregorianDate ?? "旧修订未保存")}`,
    `- 历法解析：${inlineValue(revision.timeCalibration.calendarResolution?.algorithmId ?? "旧修订未保存")}`,
    `- 地点：${anonymized ? "（匿名模式已移除）" : inlineValue(input.location.label)}`,
    `- 坐标：${anonymized || input.location.latitude === null || input.location.longitude === null
      ? "—"
      : `${input.location.latitude}, ${input.location.longitude}`}`,
    `- 来源备注：${anonymized ? "（匿名模式已移除）" : inlineValue(input.sourceNote)}`,
    `- 四柱：${pillars.year.ganZhi}　${pillars.month.ganZhi}　${pillars.day.ganZhi}　${pillars.hour.ganZhi}`,
    `- 农历：${inlineValue(revision.facts.calendar.lunarText)}`,
    `- 规则方案：${inlineValue(revision.ruleProfile.label)} ${inlineValue(revision.ruleProfile.profileVersion)}`,
    ...rulePackMarkdownRows(revision.rulePackBinding),
    `- 引擎：${inlineValue(revision.manifest.engine.name)} ${inlineValue(revision.manifest.engine.version)}`,
    `- 时区库：${revision.manifest.timeZoneDatabase ? `IANA ${revision.manifest.timeZoneDatabase.ianaVersion} · 固定工件` : "旧版浏览器 Intl · 具体版本未识别"}`,
    `- tzdb 数据摘要：${inlineValue(revision.manifest.timeZoneDatabase?.dataSha256)}`,
    `- 结果哈希：${anonymized ? "（匿名模式已移除）" : inlineValue(revision.manifest.resultHash)}`
  ];
  if (!anonymized) lines.push(`- 创建时间：${inlineValue(revision.createdAt)}`);
  return lines;
}

export function exportResearchMarkdown(
  rawInput: ResearchExportInput,
  rawOptions?: ResearchExportOptions
): ResearchExportDocument {
  const input = canonicalizeInput(rawInput);
  const { anonymized } = resolveOptions(rawOptions);
  const revisionAliases = new Map(input.revisions.map((revision, index) => [
    revision.id,
    anonymized ? anonymizedReference("R", index) : revision.id
  ]));
  const lines = [
    "# 八字研究案例导出",
    "",
    `> ${REIDENTIFICATION_WARNING}`,
    "",
    `- 导出模式：${anonymized ? "匿名" : "完整"}`,
    `- 案例：${anonymized ? "匿名案例" : escapeMarkdownInline(input.caseRecord.alias)}`,
    `- 案例标识：${inlineValue(displayId(input.caseRecord.id, anonymized, "CASE"))}`,
    `- 标签：${anonymized ? "（匿名模式已移除）" : listValue(input.caseRecord.tags)}`,
    `- 修订数：${input.revisions.length}`,
    "",
    "## 案例备注",
    "",
    anonymized ? "（匿名模式已移除）" : input.caseRecord.notes || "—",
    "",
    "## 修订",
    ""
  ];

  for (const [index, revision] of input.revisions.entries()) {
    lines.push(...markdownRevision(revision, index, anonymized), "");
  }

  lines.push("## 研究笔记", "");
  if (!input.researchNotes.length) lines.push("—", "");
  for (const [index, note] of input.researchNotes.entries()) {
    lines.push(
      `### 笔记 ${index + 1}`,
      "",
      `- 笔记标识：${inlineValue(displayId(note.id, anonymized, anonymizedReference("N", index)))}`,
      `- 锚点：${inlineValue(noteAnchorText(note, revisionAliases))}`,
      `- 状态：${inlineValue(note.lifecycle)}`,
      `- 标签：${anonymized ? "（匿名模式已移除）" : listValue(note.tags)}`,
      `- 来源引用：${anonymized ? "（匿名模式已移除）" : listValue(note.sourceRefs)}`,
      "",
      anonymized ? "（匿名模式已移除笔记正文）" : note.body || "—",
      ""
    );
  }

  lines.push("## 事件", "");
  if (!input.events.length) lines.push("—", "");
  for (const [index, event] of input.events.entries()) {
    const revisionRef = event.revisionId ? revisionAliases.get(event.revisionId) ?? event.revisionId : "—";
    lines.push(
      `### 事件 ${index + 1}${anonymized ? "" : `：${escapeMarkdownInline(event.title)}`}`,
      "",
      `- 事件标识：${inlineValue(displayId(event.id, anonymized, anonymizedReference("E", index)))}`,
      `- 日期：${anonymized ? "（匿名模式已移除）" : `${inlineValue(dateRange(event))}（${inlineValue(event.datePrecision)}）`}`,
      ...eventTimeMarkdownRows(event, anonymized),
      `- 关联修订：${inlineValue(revisionRef)}`,
      `- 运限节点：${event.transitNodeRef
        ? anonymized ? "（匿名模式已移除）" : inlineValue(JSON.stringify(event.transitNodeRef))
        : "—"}`,
      `- 反馈：${inlineValue(event.feedback)}`,
      `- 状态：${event.deletedAt ? "已删除" : "有效"}`,
      `- 标题：${anonymized ? "（匿名模式已移除）" : inlineValue(event.title)}`,
      `- 标签：${anonymized ? "（匿名模式已移除）" : listValue(event.tags)}`,
      `- 来源引用：${anonymized ? "（匿名模式已移除）" : listValue(event.sourceRefs)}`,
      "",
      anonymized ? "（匿名模式已移除事件正文）" : event.body || "—",
      ""
    );
  }

  const content = `${lines.join("\n").trimEnd()}\n`;
  return markdownResearchExportDocumentSchema.parse({
    formatVersion: RESEARCH_EXPORT_FORMAT_VERSION,
    format: "markdown",
    anonymized,
    encoding: "utf-8",
    mimeType: "text/markdown;charset=utf-8",
    fileExtension: ".md",
    suggestedFileName: anonymized ? "bazi-research-anonymous.md" : "bazi-research-full.md",
    warnings: [REIDENTIFICATION_WARNING],
    content
  });
}

/**
 * Encodes one CSV cell. Formula-looking content is prefixed with an apostrophe
 * before RFC 4180 quoting so spreadsheet programs keep it as text.
 */
export function encodeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const injectionSafe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${injectionSafe.replace(/"/g, '""')}"`;
}

type CsvRow = Record<CsvColumn, string | number | null>;

const CSV_COLUMNS = [
  "record_type",
  "sequence",
  "case_reference",
  "record_reference",
  "revision_reference",
  "transit_node_reference",
  "birth_date",
  "lunar_leap_month",
  "resolved_gregorian_date",
  "calendar_algorithm",
  "birth_time",
  "time_precision",
  "time_zone",
  "calendar_type",
  "sex",
  "location_label",
  "latitude",
  "longitude",
  "source_note",
  "pillars",
  "rule_pack_binding_status",
  "rule_pack_binding_kind",
  "rule_pack_id",
  "rule_pack_digest",
  "rule_pack_profile_id",
  "rule_pack_profile_version",
  "rule_pack_profile_digest",
  "rule_pack_use_mode",
  "date_precision",
  "start_date",
  "end_date",
  "event_time_context_kind",
  "event_time_zone",
  "event_tzdb_version",
  "event_start_dst_resolution",
  "event_start_utc_offset",
  "event_start_utc",
  "event_end_dst_resolution",
  "event_end_utc_offset",
  "event_end_utc",
  "event_time_notice",
  "title_or_alias",
  "status_or_feedback",
  "tags",
  "source_refs",
  "body_or_notes",
  "created_at",
  "updated_at",
  "privacy_warning"
] as const;

type CsvColumn = typeof CSV_COLUMNS[number];

function emptyCsvRow(): CsvRow {
  return Object.fromEntries(CSV_COLUMNS.map((column) => [column, ""])) as CsvRow;
}

function csvRows(input: ResearchExportInput, anonymized: boolean): CsvRow[] {
  const revisionRefs = new Map(input.revisions.map((revision, index) => [
    revision.id,
    anonymized ? anonymizedReference("R", index) : revision.id
  ]));
  const caseReference = anonymized ? "CASE" : input.caseRecord.id;
  const rows: CsvRow[] = [];
  rows.push({
    ...emptyCsvRow(),
    record_type: "case",
    sequence: 1,
    case_reference: caseReference,
    record_reference: caseReference,
    title_or_alias: anonymized ? "" : input.caseRecord.alias,
    tags: anonymized ? "" : input.caseRecord.tags.join(" | "),
    body_or_notes: anonymized ? "" : input.caseRecord.notes,
    created_at: anonymized ? "" : input.caseRecord.createdAt,
    updated_at: anonymized ? "" : input.caseRecord.updatedAt,
    privacy_warning: REIDENTIFICATION_WARNING
  });

  for (const [index, revision] of input.revisions.entries()) {
    const inputRecord = revision.input;
    const rulePackBinding = revision.rulePackBinding;
    rows.push({
      ...emptyCsvRow(),
      record_type: "revision",
      sequence: revision.revisionNumber,
      case_reference: caseReference,
      record_reference: revisionRefs.get(revision.id) ?? revision.id,
      revision_reference: revisionRefs.get(revision.id) ?? revision.id,
      birth_date: inputRecord.date,
      lunar_leap_month: inputRecord.lunarLeapMonth ? "true" : "false",
      resolved_gregorian_date: revision.timeCalibration.calendarResolution?.resolvedGregorianDate ?? "",
      calendar_algorithm: revision.timeCalibration.calendarResolution?.algorithmId ?? "",
      birth_time: inputRecord.time,
      time_precision: inputRecord.timePrecision,
      time_zone: inputRecord.timeZone,
      calendar_type: inputRecord.calendarType,
      sex: inputRecord.sex,
      location_label: anonymized ? "" : inputRecord.location.label,
      latitude: anonymized ? "" : inputRecord.location.latitude,
      longitude: anonymized ? "" : inputRecord.location.longitude,
      source_note: anonymized ? "" : inputRecord.sourceNote,
      pillars: [
        revision.facts.pillars.year.ganZhi,
        revision.facts.pillars.month.ganZhi,
        revision.facts.pillars.day.ganZhi,
        revision.facts.pillars.hour.ganZhi
      ].join(" "),
      rule_pack_binding_status: rulePackBinding ? "bound" : "unbound_profile_snapshot",
      rule_pack_binding_kind: rulePackBinding?.kind ?? "",
      rule_pack_id: rulePackBinding?.packId ?? "",
      rule_pack_digest: rulePackBinding?.packDigest ?? "",
      rule_pack_profile_id: rulePackBinding?.profileId ?? "",
      rule_pack_profile_version: rulePackBinding?.profileVersion ?? "",
      rule_pack_profile_digest: rulePackBinding?.profileDigest ?? "",
      rule_pack_use_mode: rulePackBinding?.useMode ?? "",
      created_at: anonymized ? "" : revision.createdAt,
      privacy_warning: REIDENTIFICATION_WARNING
    });
  }

  for (const [index, note] of input.researchNotes.entries()) {
    const revisionReference = note.anchor.kind === "case"
      ? ""
      : revisionRefs.get(note.anchor.revisionId) ?? note.anchor.revisionId;
    rows.push({
      ...emptyCsvRow(),
      record_type: "research_note",
      sequence: index + 1,
      case_reference: caseReference,
      record_reference: anonymized ? anonymizedReference("N", index) : note.id,
      revision_reference: revisionReference,
      title_or_alias: anonymized ? "" : noteAnchorText(note, revisionRefs),
      status_or_feedback: note.lifecycle,
      tags: anonymized ? "" : note.tags.join(" | "),
      source_refs: anonymized ? "" : note.sourceRefs.join(" | "),
      body_or_notes: anonymized ? "" : note.body,
      created_at: anonymized ? "" : note.createdAt,
      updated_at: anonymized ? "" : note.updatedAt,
      privacy_warning: REIDENTIFICATION_WARNING
    });
  }

  for (const [index, event] of input.events.entries()) {
    const time = eventTimeExportDetails(event);
    rows.push({
      ...emptyCsvRow(),
      record_type: "event",
      sequence: index + 1,
      case_reference: caseReference,
      record_reference: anonymized ? anonymizedReference("E", index) : event.id,
      revision_reference: event.revisionId ? revisionRefs.get(event.revisionId) ?? event.revisionId : "",
      transit_node_reference: anonymized || !event.transitNodeRef ? "" : JSON.stringify(event.transitNodeRef),
      date_precision: anonymized ? "" : event.datePrecision,
      start_date: anonymized ? "" : event.startDate,
      end_date: anonymized ? "" : event.endDate,
      event_time_context_kind: anonymized ? "" : time.kind,
      event_time_zone: anonymized ? "" : time.timeZone,
      event_tzdb_version: anonymized ? "" : time.tzdbVersion,
      event_start_dst_resolution: anonymized ? "" : time.start?.dstResolution ?? "",
      event_start_utc_offset: anonymized ? "" : time.start?.utcOffset ?? "",
      event_start_utc: anonymized ? "" : time.start?.canonicalUtc ?? "",
      event_end_dst_resolution: anonymized ? "" : time.end?.dstResolution ?? "",
      event_end_utc_offset: anonymized ? "" : time.end?.utcOffset ?? "",
      event_end_utc: anonymized ? "" : time.end?.canonicalUtc ?? "",
      event_time_notice: anonymized ? "" : time.notice,
      title_or_alias: anonymized ? "" : event.title,
      status_or_feedback: event.deletedAt ? `deleted/${event.feedback}` : event.feedback,
      tags: anonymized ? "" : event.tags.join(" | "),
      source_refs: anonymized ? "" : event.sourceRefs.join(" | "),
      body_or_notes: anonymized ? "" : event.body,
      created_at: anonymized ? "" : event.createdAt,
      updated_at: anonymized ? "" : event.updatedAt,
      privacy_warning: REIDENTIFICATION_WARNING
    });
  }
  return rows;
}

export function exportResearchCsv(
  rawInput: ResearchExportInput,
  rawOptions?: ResearchExportOptions
): ResearchExportDocument {
  const input = canonicalizeInput(rawInput);
  const { anonymized } = resolveOptions(rawOptions);
  const header = CSV_COLUMNS.map(encodeCsvCell).join(",");
  const body = csvRows(input, anonymized).map((row) =>
    CSV_COLUMNS.map((column) => encodeCsvCell(row[column])).join(",")
  );
  const content = `\uFEFF${[header, ...body].join("\r\n")}\r\n`;
  return csvResearchExportDocumentSchema.parse({
    formatVersion: RESEARCH_EXPORT_FORMAT_VERSION,
    format: "csv",
    anonymized,
    encoding: "utf-8",
    mimeType: "text/csv;charset=utf-8",
    fileExtension: ".csv",
    suggestedFileName: anonymized ? "bazi-research-anonymous.csv" : "bazi-research-full.csv",
    warnings: [REIDENTIFICATION_WARNING],
    content
  });
}

export * from "./single-chart-report";
export * from "./pair-structure-report";
