import { z } from "zod";
import { revisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import { sha256BytesHex } from "@hakimi/integrity";

export const LOCAL_READING_CONTEXT_TAG = "阅读背景";
export const READING_CONTEXT_FORMAT = "hakimi.local-reading-context/1" as const;
export const READING_CONTEXT_YEAR_MIN = 1900;
export const READING_CONTEXT_YEAR_MAX = 2099;
export const READING_CONTEXT_NOTES_MAX = 2000;
export const READING_CONTEXT_WORK_LABELS = {
  unspecified: "未填写", student: "学生", employed: "在职", self_employed: "自营或自由职业",
  seeking_work: "求职中", caregiving: "照料家庭", retired: "退休"
} as const;
export const READING_CONTEXT_RELATIONSHIP_LABELS = {
  unspecified: "未填写", single: "单身", partnered: "有伴侣", married: "已婚", separated: "分开或分居"
} as const;
export type ReadingContextWork = keyof typeof READING_CONTEXT_WORK_LABELS;
export type ReadingContextRelationship = keyof typeof READING_CONTEXT_RELATIONSHIP_LABELS;
export interface ReadingContextDraft {
  work: ReadingContextWork; relationship: ReadingContextRelationship;
  fromYear: number; toYear: number; notes: string;
}
export interface ReadingContextReference { noteId: string; editVersion: number; bodySha256: string }
export interface ReadingContextSourceBinding { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean }
export interface ReadingContextDocument {
  format: typeof READING_CONTEXT_FORMAT; sourceBinding: ReadingContextSourceBinding;
  previousRef: ReadingContextReference | null; context: ReadingContextDraft;
}
export type ParsedReadingContext = { kind: "legacy" } | { kind: "invalid"; message: string }
  | { kind: "context"; value: ReadingContextDocument };
export interface ResolvedReadingContextLatest {
  record: ResearchNoteRecord; ref: ReadingContextReference;
  document: ReadingContextDocument; context: ReadingContextDraft;
}
export interface ResolvedReadingContext {
  latest: ResolvedReadingContextLatest | null; canAppend: boolean; issues: string[];
}
export interface ResolveReadingContextInput { revision: RevisionRecord; records: readonly ResearchNoteRecord[] }

const MARKER = "<!-- hakimi.local-reading-context/1\n";
const END = "\n-->\n\n";
const CONTEXT_PREFIX = "<!-- hakimi.local-reading-context/";
const sourceSchema = z.strictObject({ caseId: z.string().uuid(), revisionId: z.string().uuid(),
  chartResultHash: z.string().regex(/^[a-f0-9]{64}$/u), includeHour: z.boolean() });
const referenceSchema = z.strictObject({ noteId: z.string().uuid(), editVersion: z.number().int().positive(),
  bodySha256: z.string().regex(/^[a-f0-9]{64}$/u) });
const contextSchema = z.strictObject({
  work: z.enum(["unspecified", "student", "employed", "self_employed", "seeking_work", "caregiving", "retired"]),
  relationship: z.enum(["unspecified", "single", "partnered", "married", "separated"]),
  fromYear: z.number().int().min(READING_CONTEXT_YEAR_MIN).max(READING_CONTEXT_YEAR_MAX),
  toYear: z.number().int().min(READING_CONTEXT_YEAR_MIN).max(READING_CONTEXT_YEAR_MAX),
  notes: z.string().max(READING_CONTEXT_NOTES_MAX)
}).refine((value) => value.fromYear <= value.toYear, { path: ["toYear"], message: "结束年份不能早于开始年份。" });
export const readingContextDraftSchema = contextSchema;
const documentSchema = z.strictObject({ format: z.literal(READING_CONTEXT_FORMAT), sourceBinding: sourceSchema,
  previousRef: referenceSchema.nullable(), context: contextSchema });

function binding(revision: RevisionRecord): ReadingContextSourceBinding {
  const r = revisionRecordSchema.parse(revision);
  return { caseId: r.caseId, revisionId: r.id, chartResultHash: r.manifest.resultHash,
    includeHour: r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only" };
}
const sameBinding = (a: ReadingContextSourceBinding, b: ReadingContextSourceBinding) => a.caseId === b.caseId
  && a.revisionId === b.revisionId && a.chartResultHash === b.chartResultHash && a.includeHour === b.includeHour;
const sameReference = (a: ReadingContextReference, b: ReadingContextReference) => a.noteId === b.noteId
  && a.editVersion === b.editVersion && a.bodySha256 === b.bodySha256;
const inScope = (record: ResearchNoteRecord, source: ReadingContextSourceBinding) => record.caseId === source.caseId
  && record.anchor.kind === "revision" && record.anchor.revisionId === source.revisionId;
async function reference(record: ResearchNoteRecord): Promise<ReadingContextReference> {
  return { noteId: record.id, editVersion: record.editVersion, bodySha256: await sha256BytesHex(new TextEncoder().encode(record.body)) };
}
function render(document: ReadingContextDocument): string {
  const { context, sourceBinding, previousRef } = document;
  const clear = context.work === "unspecified" && context.relationship === "unspecified" && context.notes === "";
  return ["# 阅读背景", clear ? "本次明确清空个人背景，恢复未填写状态。" : "以下是用户自述的阅读背景。",
    `工作或学习状态：${READING_CONTEXT_WORK_LABELS[context.work]}`, `关系状态：${READING_CONTEXT_RELATIONSHIP_LABELS[context.relationship]}`,
    `适用年份：${context.fromYear}年至${context.toYear}年（含起止年份）`, "## 自述补充", context.notes || "未填写补充。",
    `所属案例：${sourceBinding.caseId}`, `原始命盘：${sourceBinding.revisionId}`, `结果摘要：${sourceBinding.chartResultHash}`,
    `时柱范围：${sourceBinding.includeHour ? "包含时柱" : "不包含时柱"}`,
    `接续记录：${previousRef ? `${previousRef.noteId} · 版本 ${previousRef.editVersion} · 正文摘要 ${previousRef.bodySha256}` : "首次背景记录"}`,
    "背景自述只用于组织阅读语境，不代表已核实事实，不改变命盘、原判断或通用规则。此记录追加保存，不覆盖此前背景。"].join("\n\n");
}
function encode(document: ReadingContextDocument): string { return `${MARKER}${JSON.stringify(document)}${END}${render(document)}`; }

/** Only an exact leading canonical envelope is interpreted as background data. */
export function parseReadingContext(body: string): ParsedReadingContext {
  if (!body.startsWith(MARKER)) return body.startsWith(CONTEXT_PREFIX)
    ? { kind: "invalid", message: "阅读背景格式暂不支持，未自动关联；原记录仍可查看。" } : { kind: "legacy" };
  try {
    const end = body.indexOf(END, MARKER.length);
    if (end < 0 || end > 20_000) throw new Error();
    const value = documentSchema.parse(JSON.parse(body.slice(MARKER.length, end)));
    if (encode(value) !== body) throw new Error();
    return { kind: "context", value };
  } catch { return { kind: "invalid", message: "阅读背景结构与原文不一致，已停止自动采用；请核对原记录。" }; }
}

/** Produces the next complete snapshot body. The caller must fresh-resolve the
 * chain inside its existing mutation lock before persisting this body. */
export async function buildReadingContextRecord(revision: RevisionRecord, previousRecord: ResearchNoteRecord | null, draft: ReadingContextDraft): Promise<string> {
  const sourceBinding = binding(revision), context = contextSchema.parse(draft);
  let previousRef: ReadingContextReference | null = null;
  if (previousRecord) {
    const parsed = parseReadingContext(previousRecord.body);
    if (parsed.kind !== "context" || !inScope(previousRecord, sourceBinding) || !sameBinding(parsed.value.sourceBinding, sourceBinding)
      || previousRecord.lifecycle !== "active") throw new Error("前序阅读背景与当前命盘不一致或已归档，请重新读取后再保存。");
    previousRef = await reference(previousRecord);
  }
  return encode({ format: READING_CONTEXT_FORMAT, sourceBinding, previousRef, context });
}

/** Reads all supplied current-revision context records, including archived
 * records, as one exact reference chain. Never selects by timestamp or falls
 * back to a previous context when the terminal record is invalid/archived. */
export async function resolveReadingContext({ revision, records }: ResolveReadingContextInput): Promise<ResolvedReadingContext> {
  const source = binding(revision), issues: string[] = [], byId = new Map<string, ResearchNoteRecord>();
  for (const record of records) {
    if (!inScope(record, source) || !(record.tags.includes(LOCAL_READING_CONTEXT_TAG) || record.body.startsWith(CONTEXT_PREFIX))) continue;
    const previous = byId.get(record.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) issues.push(`阅读背景 ${record.id} 有不一致的重复身份，未选择其中一份。`);
    else if (!previous) byId.set(record.id, record);
  }
  const items: ResolvedReadingContextLatest[] = [];
  for (const record of byId.values()) {
    const parsed = parseReadingContext(record.body);
    if (parsed.kind !== "context") { issues.push(`阅读背景 ${record.id}：${parsed.kind === "invalid" ? parsed.message : "记录缺少可确认的结构，未回退采用旧背景。"}`); continue; }
    if (!sameBinding(parsed.value.sourceBinding, source)) { issues.push(`阅读背景 ${record.id} 的案例、修订、命盘结果或时柱范围不匹配。`); continue; }
    items.push({ record: structuredClone(record), ref: await reference(record), document: parsed.value, context: parsed.value.context });
  }
  if (!items.length) return { latest: null, canAppend: issues.length === 0, issues: [...new Set(issues)] };
  const roots = items.filter((item) => item.document.previousRef === null);
  if (roots.length !== 1) issues.push(roots.length ? "同一命盘存在多个独立的阅读背景起点，未自动选择当前背景。" : "阅读背景缺少可确认的首次记录，未自动回退。");
  for (const item of items) {
    const previous = item.document.previousRef;
    if (!previous) continue;
    const parent = items.find((candidate) => candidate.record.id === previous.noteId);
    if (!parent || !sameReference(previous, parent.ref)) issues.push(`阅读背景 ${item.record.id} 的前序正文、版本或记录缺失，未自动采用。`);
  }
  const visited = new Set<string>();
  let latest: ResolvedReadingContextLatest | null = roots.length === 1 ? roots[0]! : null;
  while (latest && !visited.has(latest.record.id)) {
    visited.add(latest.record.id);
    const next = items.filter((item) => item.document.previousRef && sameReference(item.document.previousRef, latest!.ref));
    if (!next.length) break;
    if (next.length > 1) { issues.push("阅读背景存在并行分叉，已保留各份记录，未自动选择其中一份。"); break; }
    latest = next[0]!;
  }
  if (visited.size !== items.length) issues.push("阅读背景存在断开的前序关系、循环或未接入的记录，未回退选择旧背景。");
  if (latest?.record.lifecycle === "archived") issues.push("最新阅读背景已归档，未恢复此前背景；清空应追加一条未填写状态的新记录。");
  return { latest: issues.length ? null : latest, canAppend: issues.length === 0, issues: [...new Set(issues)] };
}
