import { z } from "zod";
import { researchNoteRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { sha256BytesHex } from "@hakimi/integrity";
import { isPackedReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { readScopedReadingRecord } from "./scoped-reading-record";
import { SCOPED_READING_REPORT_TAG } from "./scoped-reading-report";
import { decodeReadingReportBundle } from "./local-reading-report-bundle";
import { LOCAL_READING_SNAPSHOT_TAG } from "./local-reading-record";
import { parseReadingFeedback } from "./local-reading-feedback";
import { readReadingExplanationIndex, type ReadingExplanationIndex, type ReadingConclusion } from "./reading-explanation-index";

export const READING_CASE_REVIEW_FORMAT = "hakimi.reading-case-review/1" as const;
export const LOCAL_READING_CASE_REVIEW_TAG = "具体结论复盘";
export const CASE_REVIEW_EVALUATIONS = {
  not_evaluated: "暂未评价",
  wording_unclear: "文字难懂",
  background_not_applicable: "背景不适用",
  evidence_insufficient: "依据不足",
  contradicted_by_facts: "与已记录事实不符",
  consistent_with_facts: "与已记录事实大体一致",
  not_yet_due: "尚未到验证时间"
} as const;
export type CaseReviewEvaluation = keyof typeof CASE_REVIEW_EVALUATIONS;
export interface CaseReviewReference { noteId: string; editVersion: number; bodySha256: string }
export interface ReadingCaseReviewTarget {
  reportRef: CaseReviewReference;
  reportVersion: string;
  reportSavedAt: string;
  indexVersion: string;
  generatedAt: string;
  sourceSnapshot: ReadingExplanationIndex["sourceSnapshot"];
  uncertainty: ReadingExplanationIndex["uncertainty"];
  indexLimitations: string[];
  conclusion: ReadingConclusion;
  evidenceSources: ReadingExplanationIndex["sources"];
  citationBindings: ReadingExplanationIndex["citationBindings"];
}
export interface ReadingCaseReviewDraft {
  fact: { description: string; occurredAt: string };
  evaluation: { category: CaseReviewEvaluation; notes: string };
  correctionOf: CaseReviewReference | null;
  correctionReason: string;
  relatedFeedbackIds: string[];
}
export interface ReadingCaseReviewDocument {
  format: typeof READING_CASE_REVIEW_FORMAT;
  kind: "entry";
  author: "user_case_review";
  target: ReadingCaseReviewTarget;
  previous: CaseReviewReference | null;
  correctionOf: CaseReviewReference | null;
  correctionReason: string;
  fact: { description: string; occurredAt: string };
  evaluation: { category: CaseReviewEvaluation; notes: string };
  relatedFeedback: { ref: CaseReviewReference; body: string }[];
}
export interface ReadingCaseReviewEntry { record: ResearchNoteRecord; value: ReadingCaseReviewDocument; ref: CaseReviewReference }
export interface ReadingCaseReviewThread {
  entries: ReadingCaseReviewEntry[];
  latest: ReadingCaseReviewEntry | null;
  issues: string[];
  canAppend: boolean;
}
const MARKER = "<!-- hakimi.reading-case-review/1\n", END = "\n-->\n\n", FAMILY = "<!-- hakimi.reading-case-review/";
const nonblank = (max: number) => z.string().min(1).max(max).refine(value => Boolean(value.trim()), "请填写内容。");
const refSchema = z.strictObject({ noteId: z.string().uuid(), editVersion: z.number().int().positive(), bodySha256: z.string().regex(/^[a-f0-9]{64}$/u) });
const sourceSchema = z.object({ caseId: z.string().uuid(), revisionId: z.string().uuid(),
  chartResultHash: z.string().regex(/^[a-f0-9]{64}$/u), includeHour: z.boolean(), sourceVersions: z.array(nonblank(200)).max(200) }).passthrough();
const conclusionSchema = z.object({ stableId: nonblank(1000), label: nonblank(1000), text: nonblank(50000),
  sourceSubjects: z.array(nonblank(1000)).max(300), sourceVersions: z.array(nonblank(200)).max(200),
  scope: z.object({ level: z.enum(["natal","year","month"]), year: z.number().int().nullable(), branchId: z.string().nullable(),
    startInstant: z.string().nullable(), endExclusiveInstant: z.string().nullable() }).passthrough() }).passthrough();
const targetSchema = z.strictObject({ reportRef: refSchema, reportVersion: nonblank(200), reportSavedAt: z.string().datetime(),
  indexVersion: nonblank(200), generatedAt: z.string().datetime(), sourceSnapshot: sourceSchema,
  uncertainty: z.record(z.string(),z.unknown()), indexLimitations: z.array(z.string().max(30000)).max(500), conclusion: conclusionSchema,
  evidenceSources: z.array(z.object({ id:z.string(),title:z.string(),url:z.string(),locator:z.string(),excerpt:z.string(),interpretation:z.string() }).strict()).max(500),
  citationBindings: z.array(z.object({conclusionId:z.string(),sourceId:z.string(),producerField:z.string(),usageNote:z.string()}).strict()).max(5000) });
const factSchema = z.strictObject({ description: z.string().max(8000), occurredAt: z.string().max(300) });
const evaluationSchema = z.strictObject({ category: z.enum(["not_evaluated","wording_unclear","background_not_applicable","evidence_insufficient","contradicted_by_facts","consistent_with_facts","not_yet_due"]), notes: z.string().max(8000) });
const documentSchema = z.strictObject({ format: z.literal(READING_CASE_REVIEW_FORMAT), kind: z.literal("entry"), author: z.literal("user_case_review"),
  target: targetSchema, previous: refSchema.nullable(), correctionOf: refSchema.nullable(), correctionReason: z.string().max(2000),
  fact: factSchema, evaluation: evaluationSchema, relatedFeedback: z.array(z.strictObject({ ref: refSchema, body: z.string().max(100000) })).max(3) });
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a.localeCompare(b))) : item);
export const sameCaseReviewReference = (a: CaseReviewReference | null, b: CaseReviewReference | null) => stable(a) === stable(b);
export const caseReviewTargetIdentity = (target: ReadingCaseReviewTarget) => stable([target.reportRef, target.conclusion.stableId]);
export async function caseReviewNoteReference(record: ResearchNoteRecord): Promise<CaseReviewReference> {
  return { noteId: record.id, editVersion: record.editVersion, bodySha256: await sha256BytesHex(new TextEncoder().encode(record.body)) };
}
export function emptyReadingCaseReviewDraft(): ReadingCaseReviewDraft {
  return { fact: { description: "", occurredAt: "" }, evaluation: { category: "not_evaluated", notes: "" },
    correctionOf: null, correctionReason: "", relatedFeedbackIds: [] };
}
function assertDraft(value: Pick<ReadingCaseReviewDocument,"fact"|"evaluation"|"correctionOf"|"correctionReason">): void {
  factSchema.parse(value.fact); evaluationSchema.parse(value.evaluation);
  if (value.fact.occurredAt.trim() && !value.fact.description.trim()) throw new Error("请同时写明这段时间发生了什么，或清空发生时间。");
  if (["contradicted_by_facts","consistent_with_facts"].includes(value.evaluation.category) && !value.fact.description.trim())
    throw new Error("与事实比较前，请单独填写本次要对照的事实；旧反馈不会自动当作事实。");
  if (!value.fact.description.trim() && value.evaluation.category === "not_evaluated" && !value.evaluation.notes.trim() && !value.correctionOf)
    throw new Error("请记录后续事实或选择本次评价；尚未到验证时间可以单独记录。");
  if (value.correctionOf && !value.correctionReason.trim()) throw new Error("请说明更正哪一处；此前记录会完整保留。");
  if (!value.correctionOf && value.correctionReason) throw new Error("更正说明必须对应一条此前记录。");
}
function render(value: ReadingCaseReviewDocument): string {
  return ["# 具体结论案例复盘", "## 原始解释 · 冻结保留", value.target.conclusion.label, value.target.conclusion.text,
    `报告版本：${value.target.reportVersion}`, `原解释生成时间：${value.target.generatedAt}`, `报告保存时间：${value.target.reportSavedAt}`,
    `结论标识：${value.target.conclusion.stableId}`, `原报告记录：${value.target.reportRef.noteId}`,
    "当时输入、规则、现实背景及未确定信息随本条结构化快照保留；不使用后来填写的信息倒改原解释。",
    "## 后续事实", `事情发生时间：${value.fact.occurredAt || "未填写发生时间"}`, value.fact.description || "尚未记录后续事实。",
    "记录时间以本条研究日志的创建时间为准，和事情发生时间分开保留。",
    "## 用户评价", CASE_REVIEW_EVALUATIONS[value.evaluation.category], value.evaluation.notes || "未补充评价说明。",
    ...(value.correctionOf ? ["## 追加更正", `更正此前记录：${value.correctionOf.noteId}`, value.correctionReason] : []),
    ...(value.relatedFeedback.length ? ["## 显式关联的旧反馈", ...value.relatedFeedback.map(item => `反馈记录：${item.ref.noteId} · 版本 ${item.ref.editVersion}`),
      "旧反馈原文单独冻结，不自动转成后续事实或本次评价。"] : []),
    "缺失事实、没有反馈和尚未到验证时间，都不自动计作成功或失败。本条只供案例对照，不计算准确率；原解释和此前记录保持不变。"].join("\n\n");
}
function encode(value: ReadingCaseReviewDocument): string { return `${MARKER}${JSON.stringify(value)}${END}${render(value)}`; }
export type ParsedReadingCaseReview = { kind: "legacy" } | { kind: "invalid"; message: string } | { kind: "entry"; value: ReadingCaseReviewDocument };
export function parseReadingCaseReview(body: string): ParsedReadingCaseReview {
  if (!body.startsWith(MARKER)) return body.startsWith(FAMILY) || body.startsWith("\ufeff"+FAMILY)
    ? { kind: "invalid", message: "复盘格式尚未支持，原记录仍保留。" } : { kind: "legacy" };
  try {
    if (body.length > 200000) throw new Error();
    const end = body.indexOf(END, MARKER.length);
    if (end < 0) throw new Error();
    const value = documentSchema.parse(JSON.parse(body.slice(MARKER.length,end))) as unknown as ReadingCaseReviewDocument;
    assertDraft(value);
    if (encode(value) !== body) throw new Error();
    return { kind: "entry", value };
  } catch { return { kind: "invalid", message: "复盘结构或显示原文已经变化，停止自动接续；原记录仍可查看。" }; }
}
/** Only saved, indexed report content supplies a target. Older reports are
 * readable but never acquire a fabricated generation time or current index. */
export async function loadReadingCaseReviewTargets(record: ResearchNoteRecord): Promise<ReadingCaseReviewTarget[]> {
  researchNoteRecordSchema.parse(record);
  if (!record.tags.includes(LOCAL_READING_SNAPSHOT_TAG) || record.anchor.kind !== "revision") return [];
  const scoped = record.tags.includes(SCOPED_READING_REPORT_TAG) ? await readScopedReadingRecord(record) : null;
  const raw = scoped ? "" : isPackedReadingSnapshot(record.body) ? await unpackReadingSnapshot(record.body) : record.body;
  const bundle = scoped ? null : await decodeReadingReportBundle(raw);
  if (!bundle && !scoped) return [];
  const reportVersion = scoped?.source.reportVersion ?? bundle!.version;
  const index = scoped?.index ?? readReadingExplanationIndex(bundle!.archive);
  if (!index) return [];
  if (index.sourceSnapshot.caseId !== record.caseId || index.sourceSnapshot.revisionId !== record.anchor.revisionId)
    throw new Error("报告中的命盘与保存位置不一致，不能建立复盘。");
  if(index.sourceSnapshot.reportVersion!==reportVersion)throw new Error("报告版本与保存的结论索引不一致，不能建立复盘。");
  if (Date.parse(index.generatedAt) > Date.parse(record.createdAt)) throw new Error("报告生成时间晚于保存时间，需先核对原记录。");
  if (new Set(index.conclusions.map(item=>item.stableId)).size !== index.conclusions.length) throw new Error("报告中有重复结论标识，未自动选择。");
  const reportRef = await caseReviewNoteReference(record);
  return index.conclusions.map(conclusion => targetSchema.parse({ reportRef, reportVersion, reportSavedAt: record.createdAt,
    indexVersion: index.version, generatedAt: index.generatedAt, sourceSnapshot: index.sourceSnapshot,
    uncertainty:index.uncertainty,indexLimitations:index.limitations,conclusion,
    evidenceSources:index.sources.filter(source=>conclusion.evidence.citations.includes(source.id)
      || Boolean(scoped && conclusion.evidence.ruleApplications.some(rule=>rule.sourceIds.includes(source.id)))),
    citationBindings:index.citationBindings.filter(binding=>binding.conclusionId===conclusion.stableId) }) as unknown as ReadingCaseReviewTarget);
}
export async function resolveReadingCaseReviewTarget(record: ResearchNoteRecord, conclusionId: string): Promise<ReadingCaseReviewTarget> {
  const matches=(await loadReadingCaseReviewTargets(record)).filter(target=>target.conclusion.stableId===conclusionId);
  if(matches.length!==1)throw new Error("这份已保存报告没有唯一对应的结论索引；旧报告不补造当时信息。");
  return matches[0]!;
}
export async function readReadingCaseReviewThread(target: ReadingCaseReviewTarget, records: readonly ResearchNoteRecord[]): Promise<ReadingCaseReviewThread> {
  const issues: string[]=[], linked: ReadingCaseReviewEntry[]=[];
  for(const record of records){
    const parsed=parseReadingCaseReview(record.body);
    if(parsed.kind !== "entry" && record.caseId===target.sourceSnapshot.caseId && record.tags.includes(LOCAL_READING_CASE_REVIEW_TAG)){
      issues.push("同一案例存在无法核对的复盘原文，请先在研究日志核对；未自动跳过。"); continue;
    }
    if(parsed.kind!=="entry"||parsed.value.target.reportRef.noteId!==target.reportRef.noteId||parsed.value.target.conclusion.stableId!==target.conclusion.stableId)continue;
    if(record.caseId!==target.sourceSnapshot.caseId||record.anchor.kind!=="revision"||record.anchor.revisionId!==target.sourceSnapshot.revisionId
      ||stable(parsed.value.target)!==stable(target)||record.editVersion!==1||record.createdAt!==record.updatedAt||record.createdAt<target.reportSavedAt){
      issues.push(`复盘 ${record.id.slice(0,8)} 的来源、原文版本或位置有变化，未作为当前事实接续。`);continue;
    }
    for(const feedback of parsed.value.relatedFeedback){
      if(await sha256BytesHex(new TextEncoder().encode(feedback.body))!==feedback.ref.bodySha256)issues.push("冻结的旧反馈原文与摘要不一致，需核对。");
    }
    linked.push({record,value:parsed.value,ref:await caseReviewNoteReference(record)});
  }
  const ordered:ReadingCaseReviewEntry[]=[],seen=new Set<string>();let previous:CaseReviewReference|null=null;
  while(ordered.length<=linked.length){
    const next=linked.filter(item=>!seen.has(item.record.id)&&sameCaseReviewReference(item.value.previous,previous));
    if(!next.length)break;
    if(next.length!==1){issues.push("同一位置有并行复盘，保留全部记录，未自动选择最新的一条。");break;}
    const item=next[0]!;
    if(item.value.correctionOf&&!ordered.some(old=>sameCaseReviewReference(old.ref,item.value.correctionOf))){issues.push("更正指向的此前记录缺失或原文已变化。");break;}
    if(previous&&item.record.createdAt<ordered.at(-1)!.record.createdAt){issues.push("追加记录时间早于前序记录，需核对。");break;}
    ordered.push(item);seen.add(item.record.id);previous=item.ref;
  }
  if(ordered.length!==linked.length&&!issues.length)issues.push("复盘链条缺少前序记录或原文已变化，未把缺失当作没有反馈。");
  if(ordered.some(item=>item.record.lifecycle!=="active"))issues.push("复盘链中存在已归档记录，原文保留；恢复核对前暂不接续。");
  return {entries:ordered,latest:issues.length?null:ordered.at(-1)??null,issues:[...new Set(issues)],canAppend:issues.length===0};
}
export async function buildReadingCaseReviewEntry(target: ReadingCaseReviewTarget, thread: ReadingCaseReviewThread,
  draft: ReadingCaseReviewDraft, records: readonly ResearchNoteRecord[]): Promise<string> {
  if(!thread.canAppend)throw new Error("当前复盘关联尚未核对，不能继续追加。");
  assertDraft(draft);
  if(draft.correctionOf&&!thread.entries.some(entry=>sameCaseReviewReference(entry.ref,draft.correctionOf)))throw new Error("只能追加更正这条结论的已有记录。");
  const ids=[...new Set(draft.relatedFeedbackIds)];
  if(ids.length!==draft.relatedFeedbackIds.length||ids.length>3)throw new Error("每次最多关联三条不同的旧反馈。");
  const relatedFeedback=[];
  for(const id of ids){
    const record=records.find(item=>item.id===id),parsed=record?parseReadingFeedback(record.body):null;
    if(!record||record.caseId!==target.sourceSnapshot.caseId||record.anchor.kind!=="revision"||record.anchor.revisionId!==target.sourceSnapshot.revisionId
      ||!parsed||!["feedback","review"].includes(parsed.kind))throw new Error("关联的旧反馈不属于这份命盘修订。");
    if(parsed.kind==="feedback"||parsed.kind==="review"){
      if(parsed.value.source.chartResultHash!==target.sourceSnapshot.chartResultHash)throw new Error("旧反馈的命盘结果与原报告不同。");
    }
    relatedFeedback.push({ref:await caseReviewNoteReference(record),body:record.body});
  }
  const document:ReadingCaseReviewDocument={format:READING_CASE_REVIEW_FORMAT,kind:"entry",author:"user_case_review",target:structuredClone(target),
    previous:thread.latest?.ref??null,correctionOf:draft.correctionOf,correctionReason:draft.correctionReason,
    fact:{...draft.fact},evaluation:{...draft.evaluation},relatedFeedback};
  const canonical = documentSchema.parse(document) as unknown as ReadingCaseReviewDocument;
  const body=encode(canonical);researchNoteRecordSchema.shape.body.parse(body);return body;
}
export function exportReadingCaseReviewThread(target: ReadingCaseReviewTarget, thread: ReadingCaseReviewThread): string {
  return ["# 具体结论复盘记录", `原报告：${target.reportRef.noteId} · ${target.reportVersion}`, `原解释生成时间：${target.generatedAt}`,
    `结论标识：${target.conclusion.stableId}`, "## 冻结的原始解释", target.conclusion.text,
    "## 当时使用的信息与不确定性", JSON.stringify({sourceSnapshot:target.sourceSnapshot,uncertainty:target.uncertainty,
      conclusion:target.conclusion,evidenceSources:target.evidenceSources,citationBindings:target.citationBindings,limitations:target.indexLimitations},null,2),
    ...thread.issues.map(issue=>`关联待核对：${issue}`), ...thread.entries.flatMap(entry=>[`## 追加记录 ${entry.record.id}`,`记录时间：${entry.record.createdAt}`,entry.record.body]),
    "无后续事实或未评价，不自动计为成功或失败。事实先于原解释的记录只供事后案例分析；这里不计算准确率。"].join("\n\n");
}
