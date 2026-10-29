import { z } from "zod";
import type { ResearchNoteRecord } from "@hakimi/contracts";
import { sha256BytesHex } from "@hakimi/integrity";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";

export const LOCAL_READING_REVIEW_TAG = "解读反馈复核";
export const READING_FEEDBACK_FORMAT = "hakimi.local-reading-feedback/1" as const;
const MARKER = "<!-- hakimi.local-reading-feedback/1\n";
const END = "\n-->\n\n";
export const FEEDBACK_RATINGS = { matches: "符合", partial: "部分符合", mismatch: "不符合", unverified: "暂未验证" } as const;
export const FEEDBACK_REVIEW_STATES = { needs_more: "待补充事实", revised: "已记录个人修订", retained: "复核后保留原结论" } as const;
export type FeedbackRating = keyof typeof FEEDBACK_RATINGS;
export type FeedbackReviewState = keyof typeof FEEDBACK_REVIEW_STATES;
export interface ReadingFeedbackDraft {
  originalConclusion: string; actualSituation: string;
  subjectId?: string; subjectLabel?: string; sourceVersions?: string[];
  rating?: FeedbackRating; aspect?: string; occurredAt?: string; requestedRevision?: string;
}
export interface ReadingFeedbackReviewDraft { state: FeedbackReviewState; notes: string; revisedConclusion: string; occurredAt: string }
export interface ReadingFeedbackChoice { id: string; label: string; originalConclusion: string; sourceVersions?: string[] }
export function buildReadingFeedbackChoices(assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook | null, extra: readonly ReadingFeedbackChoice[]): ReadingFeedbackChoice[] {
  return [{ id: "natal-overview", label: assessment.headline, originalConclusion: assessment.headline, sourceVersions: [assessment.version] },
    ...assessment.readings.map((reading) => ({ id: `preliminary-${reading.id}`, label: reading.title, originalConclusion: `${reading.title}：${reading.text}`, sourceVersions: [assessment.version] })),
    ...extra, ...(annual?.years.map((item) => ({ id: `annual-${item.year}`, label: `${item.year}年 · ${item.label}`, sourceVersions: [annual.version],
      originalConclusion: `${item.year}年 · ${item.label}\n${outlookJudgmentFeedbackText(item.judgment) || item.summary}\n本年自身倾向：${item.yearInfluence.summary}\n大运背景：${item.decadeInfluence.summary}\n年度规则：${annual.version}` })) ?? [])];
}
const nonblank = (maximum: number) => z.string().min(1).max(maximum).refine((value) => Boolean(value.trim()), "请填写内容。");
const sourceSchema = z.strictObject({ revisionId: z.string().uuid(), chartResultHash: z.string().regex(/^[a-f0-9]{64}$/u),
  assessmentVersion: z.string().max(200).nullable(), includeHour: z.boolean().nullable(), readingVersions: z.array(z.string().max(200)).max(20) });
const referenceSchema = z.strictObject({ noteId: z.string().uuid(), editVersion: z.number().int().positive(), bodySha256: z.string().regex(/^[a-f0-9]{64}$/u) });
const feedbackSchema = z.strictObject({ format: z.literal(READING_FEEDBACK_FORMAT), kind: z.literal("feedback"), source: sourceSchema,
  subjectId: nonblank(500), subjectLabel: nonblank(300), originalConclusion: nonblank(30_000),
  rating: z.enum(["matches", "partial", "mismatch", "unverified"]), aspect: z.string().max(2_000), occurredAt: z.string().max(300),
  actualSituation: z.string().max(8_000), requestedRevision: z.string().max(4_000) });
const reviewSchema = z.strictObject({ format: z.literal(READING_FEEDBACK_FORMAT), kind: z.literal("review"), author: z.literal("user_personal_review"),
  source: sourceSchema, root: referenceSchema, previous: referenceSchema.nullable(),
  state: z.enum(["needs_more", "revised", "retained"]), notes: nonblank(8_000), revisedConclusion: z.string().max(12_000), occurredAt: z.string().max(300) });
const documentSchema = z.discriminatedUnion("kind", [feedbackSchema, reviewSchema]);
export type ReadingFeedbackDocument = z.infer<typeof feedbackSchema>;
export type ReadingReviewDocument = z.infer<typeof reviewSchema>;
export type ReadingFeedbackSource = z.infer<typeof sourceSchema>;
type Reference = z.infer<typeof referenceSchema>;
type Document = z.infer<typeof documentSchema>;
export type ParsedReadingFeedback = { kind: "legacy" } | { kind: "invalid"; message: string } | { kind: "feedback"; value: ReadingFeedbackDocument } | { kind: "review"; value: ReadingReviewDocument };
export interface ReadingFeedbackThread {
  reviews: { record: ResearchNoteRecord; value: ReadingReviewDocument }[];
  latest: { record: ResearchNoteRecord; value: ReadingReviewDocument } | null;
  issues: string[]; canAppend: boolean;
}

function render(document: Document): string {
  const source = [`原始命盘：${document.source.revisionId}`, `结果摘要：${document.source.chartResultHash}`,
    `原解读规则：${document.source.assessmentVersion ?? "历史原文未提供结构化版本，请查看原记录"}`,
    ...document.source.readingVersions.map((version) => `对应解读版本：${version}`)];
  return document.kind === "feedback" ? ["# 解读反馈", `反馈结果：${FEEDBACK_RATINGS[document.rating]}`, `对应内容：${document.subjectLabel}`,
    "## 原结论", document.originalConclusion, "## 具体方面", document.aspect || "未补充", "## 对应时间", document.occurredAt || "未填写具体时期",
    "## 真实经历或当前情况", document.actualSituation || "暂未验证，尚无实际经历补充", "## 希望如何修订", document.requestedRevision || "暂未提出修订文本",
    ...source, "此条为用户反馈；原命盘与原结论保持原样，尚未复核或自动修改通用规则。"].join("\n\n")
    : ["# 用户个人复核记录", `复核状态：${FEEDBACK_REVIEW_STATES[document.state]}`, "作者性质：用户补充与个人修订，不代表系统已经认定或修改通用规则。",
      `关联原反馈：${document.root.noteId} · 原记录版本 ${document.root.editVersion} · 原文摘要 ${document.root.bodySha256}`,
      `接续复核：${document.previous?.noteId ?? "原反馈之后的首次复核"}`, "## 对应时间", document.occurredAt || "未填写具体时期",
      "## 复核说明与新增事实", document.notes, "## 个人修订文本", document.revisedConclusion || (document.state === "retained" ? "本次保留原结论；此前追加内容继续保留供对照。" : "本次未形成修订文本。"),
      ...source, "本记录为追加保存，不覆盖原反馈、此前复核或原解读；没有自动训练 GPT 或改写通用规则。"].join("\n\n");
}
function encode(document: Document): string { return `${MARKER}${JSON.stringify(document)}${END}${render(document)}`; }

/** Only an exact leading envelope is interpreted; metadata-looking legacy appendices remain literal. */
export function parseReadingFeedback(body: string): ParsedReadingFeedback {
  if (!body.startsWith(MARKER)) return body.startsWith("<!-- hakimi.local-reading-feedback/") ? { kind: "invalid", message: "反馈格式暂不支持；原文仍可查看与导出。" } : { kind: "legacy" };
  try {
    const end = body.indexOf(END, MARKER.length);
    if (end < 0 || end > 100_000) throw new Error();
    const value = documentSchema.parse(JSON.parse(body.slice(MARKER.length, end)));
    if (encode(value) !== body) throw new Error();
    if (value.kind === "feedback" && ((value.rating !== "unverified" && !value.actualSituation.trim()) || (["partial", "mismatch"].includes(value.rating) && !value.aspect.trim()))) throw new Error();
    if (value.kind === "review" && (value.state === "revised" ? !value.revisedConclusion.trim() : Boolean(value.revisedConclusion))) throw new Error();
    return { kind: value.kind, value } as ParsedReadingFeedback;
  } catch { return { kind: "invalid", message: "反馈结构与原文不一致，已停止自动关联；原文仍可查看与导出。" }; }
}
export function readingFeedbackSource(assessment: BaziPreliminaryAssessment, readingVersions: readonly string[] = []): ReadingFeedbackSource {
  return sourceSchema.parse({ revisionId: assessment.sourceBinding.revisionId, chartResultHash: assessment.sourceBinding.chartResultHash,
    assessmentVersion: assessment.version, includeHour: assessment.sourceBinding.includeHour, readingVersions: [...new Set(readingVersions)] });
}
export function buildStructuredReadingFeedback(assessment: BaziPreliminaryAssessment, draft: ReadingFeedbackDraft): string {
  if (!draft.subjectId || !draft.subjectLabel) throw new Error("请重新选择要反馈的原结论。");
  if (draft.rating !== "unverified" && !draft.actualSituation.trim()) throw new Error("请填写真实经历或当前情况。");
  if ((draft.rating === "partial" || draft.rating === "mismatch") && !draft.aspect?.trim()) throw new Error("请说明具体哪方面不同。");
  const document = feedbackSchema.parse({ format: READING_FEEDBACK_FORMAT, kind: "feedback", source: readingFeedbackSource(assessment, draft.sourceVersions),
    subjectId: draft.subjectId, subjectLabel: draft.subjectLabel, originalConclusion: draft.originalConclusion,
    rating: draft.rating ?? "unverified", aspect: draft.aspect?.trim() ?? "", occurredAt: draft.occurredAt?.trim() ?? "",
    actualSituation: draft.actualSituation.trim(), requestedRevision: draft.requestedRevision?.trim() ?? "" });
  return encode(document);
}
export async function feedbackNoteReference(note: ResearchNoteRecord): Promise<Reference> {
  return { noteId: note.id, editVersion: note.editVersion, bodySha256: await sha256BytesHex(new TextEncoder().encode(note.body)) };
}
const sameReference = (left: Reference | null, right: Reference | null) => JSON.stringify(left) === JSON.stringify(right);
function sameAnchor(left: ResearchNoteRecord, right: ResearchNoteRecord): boolean {
  return left.caseId === right.caseId && left.anchor.kind === "revision" && right.anchor.kind === "revision" && left.anchor.revisionId === right.anchor.revisionId;
}
export async function readFeedbackThread(root: ResearchNoteRecord, candidates: readonly ResearchNoteRecord[]): Promise<ReadingFeedbackThread> {
  const parsedRoot = parseReadingFeedback(root.body), rootRef = await feedbackNoteReference(root), issues: string[] = [];
  if (parsedRoot.kind === "invalid" || parsedRoot.kind === "review") return { reviews: [], latest: null, issues: ["此原记录暂不能作为反馈复核起点。"], canAppend: false };
  if (parsedRoot.kind === "feedback" && (root.anchor.kind !== "revision" || parsedRoot.value.source.revisionId !== root.anchor.revisionId)) issues.push("原反馈的命盘绑定与笔记位置不一致。");
  if (candidates.some((record) => sameAnchor(root, record) && record.tags.includes(LOCAL_READING_REVIEW_TAG) && parseReadingFeedback(record.body).kind !== "review")) {
    issues.push("同一命盘存在格式已变化的复核记录，请先在原始记录中核对；未回退或自动选择当前修订。");
  }
  const linked = candidates.flatMap((record) => { const parsed = parseReadingFeedback(record.body);
    return parsed.kind === "review" && parsed.value.root.noteId === root.id ? [{ record, value: parsed.value }] : []; });
  const references = new Map(await Promise.all(linked.map(async ({ record }) => [record.id, await feedbackNoteReference(record)] as const)));
  const valid = linked.filter(({ record, value }) => {
    const parent = value.previous ? linked.find((item) => item.record.id === value.previous!.noteId) : null;
    const okay = sameAnchor(root, record) && value.source.revisionId === (root.anchor.kind === "revision" ? root.anchor.revisionId : null)
      && sameReference(value.root, rootRef) && (!value.previous || (parent && sameReference(value.previous, references.get(parent.record.id) ?? null)))
      && (parsedRoot.kind !== "feedback" || JSON.stringify(value.source) === JSON.stringify(parsedRoot.value.source));
    if (!okay) issues.push(`复核 ${record.id.slice(0, 8)} 的原文、版本或关联已变化，需要核对；未用它替代当前结论。`);
    return okay;
  });
  const ordered: typeof valid = [];
  let previous: Reference | null = null;
  while (ordered.length <= valid.length) {
    const next = valid.filter((item) => sameReference(item.value.previous, previous) && !ordered.includes(item));
    if (!next.length) break;
    if (next.length > 1) { issues.push("同一位置有多条并行复核，已保留全部原文；请先核对关联，未自动选择一份修订。"); break; }
    ordered.push(next[0]!); previous = references.get(next[0]!.record.id)!;
  }
  if (ordered.length !== valid.length && !issues.length) issues.push("复核链条缺少可确认的前序记录，已停止自动选择当前修订。");
  return { reviews: ordered, latest: issues.length ? null : ordered.at(-1) ?? null, issues: [...new Set(issues)], canAppend: issues.length === 0 };
}
export async function buildReadingFeedbackReview(root: ResearchNoteRecord, latest: ResearchNoteRecord | null, source: ReadingFeedbackSource, draft: ReadingFeedbackReviewDraft): Promise<string> {
  const parsed = parseReadingFeedback(root.body);
  if (parsed.kind === "invalid" || parsed.kind === "review" || root.anchor.kind !== "revision" || root.anchor.revisionId !== source.revisionId) throw new Error("原反馈绑定未确认，请重新打开记录后复核。");
  const originalSource = parsed.kind === "feedback" ? parsed.value.source : { ...source, assessmentVersion: null, includeHour: null, readingVersions: [] };
  if (originalSource.revisionId !== source.revisionId || originalSource.chartResultHash !== source.chartResultHash) throw new Error("原反馈与当前命盘不一致。");
  if (latest) {
    const previous = parseReadingFeedback(latest.body);
    if (previous.kind !== "review" || !sameAnchor(root, latest) || !sameReference(previous.value.root, await feedbackNoteReference(root))
      || JSON.stringify(previous.value.source) !== JSON.stringify(originalSource)) throw new Error("前序复核不属于当前原反馈，请重新读取记录。");
  }
  if (!draft.notes.trim()) throw new Error("请填写复核说明或新增事实。");
  if (draft.state === "revised" && !draft.revisedConclusion.trim()) throw new Error("请填写希望保留的个人修订文本。");
  const document = reviewSchema.parse({ format: READING_FEEDBACK_FORMAT, kind: "review", author: "user_personal_review", source: originalSource,
    root: await feedbackNoteReference(root), previous: latest ? await feedbackNoteReference(latest) : null,
    state: draft.state, notes: draft.notes.trim(), revisedConclusion: draft.state === "revised" ? draft.revisedConclusion.trim() : "", occurredAt: draft.occurredAt.trim() });
  return encode(document);
}
