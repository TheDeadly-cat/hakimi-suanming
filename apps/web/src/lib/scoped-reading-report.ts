import { z } from "zod";
import { canonicalStringify } from "@hakimi/integrity";
import { appendReadingExplanationIndex, queryReadingExplanation, readReadingExplanationIndex, validateReadingExplanationIndex,
  type ReadingConclusion, type ReadingExplanationIndex, type ReadingExplanationQuery } from "./reading-explanation-index";
import { buildPlainReadingSummary, PLAIN_READING_CONTENT_VERSION } from "./reading-plain-summary";
import { buildReadingMonthPreview, MONTH_PREVIEW_BINDING_VERSION, readingPreviewScopeText } from "./reading-month-preview";
import { ReadingReportCapacityError } from "./local-reading-report-bundle";
import { frozenPlainConditionText, supportsFrozenPlainConditions } from "./plain-reading-condition";

export const SCOPED_READING_REPORT_VERSION = "hakimi.scoped-reading-report/1" as const;
// The old full-report reader recognizes this reserved family and rejects the
// unsupported subtype. An old app must not display the envelope as plain prose.
export const SCOPED_READING_REPORT_MARKER = "<!-- hakimi.reading-report-bundle/scoped-v1 -->";
export const SCOPED_READING_REPORT_TAG = "本机范围阅读快照";
const family = "<!-- hakimi.reading-report-bundle/scoped";
const maxBytes = 8 * 1024 * 1024;
const utf8 = new TextEncoder();
const incompleteUnicode = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const text = z.string().max(30_000);
const texts = z.array(text).max(500);
const version = z.string().min(1).max(160).regex(/^[^\s\u0000-\u001f\u007f-\u009f]+$/u);
const sha = z.string().regex(/^[a-f0-9]{64}$/u);
const plainPresentationVersion = z.enum(["hakimi.plain-summary/0.1.2", "hakimi.plain-summary/0.1.3"]);
const domain = z.enum(["natal", "career", "wealth", "relationship", "timing"]);
const scopeSegment = z.object({ level: z.enum(["natal", "year", "month"]), year: z.number().int().nullable(),
  branchId: text.nullable(), startInstant: text.nullable(), endExclusiveInstant: text.nullable() }).strict();
const selectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("summary") }).strict(),
  z.object({ kind: z.literal("domain"), domain: z.enum(["career", "wealth", "relationship"]), year: z.number().int().nullable(), branchId: text.nullable() }).strict(),
  z.object({ kind: z.literal("month"), conclusionId: text, year: z.number().int(), branchId: z.string().min(1).max(30_000) }).strict()
]);
const scopeSchema = z.object({ selection: selectionSchema, title: text, conclusionIds: z.array(text).min(1).max(2_500),
  segments: z.array(scopeSegment).min(1).max(2_500), excludedScopeLabels: texts.min(1), omittedConclusionCount: z.number().int().min(0).max(2_500) }).strict();
const sourceSchema = z.object({ caseId: z.string().uuid(), revisionId: z.string().uuid(), chartResultHash: sha,
  includeHour: z.literal(true), ruleProfileDigest: sha, reportVersion: version, explanationIndexVersion: version,
  presentationVersion: version, monthPresentationVersion: version, sourceSnapshotSha256: sha, personalContextSha256: sha,
  availableConclusionCount: z.number().int().min(1).max(2_500) }).strict();
const presentationIdentity = { sourceConclusionId: text, sourceRevisionId: text, sourceReportVersion: text, sourceVersions: texts, scope: scopeSegment };
const plainLiteralSchema = z.object({ ...presentationIdentity, topic: domain, plainTitle: text, explanation: text,
  conditions: texts, limitations: texts, unknowns: texts, observationQuestion: text, nextAction: text,
  evidenceRefs: z.array(z.object({ conclusionId: text, sourceId: text }).strict()).max(500), ruleRefs: texts, glossaryRefs: texts,
  // Compatibility pins for frozen historical display, not moving current constants.
  contentVersion: plainPresentationVersion, reviewState: z.literal("editorial_draft_not_expert_reviewed"),
  projectionState: z.enum(["mapped", "original_required", "personal_original"]) }).strict();
const monthLiteralSchema = z.object({ ...presentationIdentity, scopeLabel: text, domainLabel: text, meaning: text, condition: text,
  conditionSourceText: text.nullable(), projectionState: z.enum(["producer_preview", "original_required", "personal_original"]) }).strict();
const presentationSchema = z.discriminatedUnion("kind", [
  z.object({ conclusionId: text, kind: z.literal("plain_summary"), contentVersion: plainPresentationVersion, literal: plainLiteralSchema }).strict(),
  z.object({ conclusionId: text, kind: z.literal("month_preview"), contentVersion: z.literal("hakimi.month-preview-binding/0.1.0"), literal: monthLiteralSchema }).strict()
]);
const metadataShape = { format: z.literal(SCOPED_READING_REPORT_VERSION), kind: z.literal("scoped_reading"),
  reportId: z.string().uuid(), saveAttemptId: z.string().uuid(), createdAt: z.string().datetime(), source: sourceSchema, scope: scopeSchema };
const reportSchema = z.object({ ...metadataShape, index: z.custom<ReadingExplanationIndex>(),
  presentations: z.array(presentationSchema).min(1).max(2_500), reading: z.string().min(1).max(maxBytes) }).strict();
const partSchema = z.object({ text: z.string().min(1).max(maxBytes), utf8Bytes: z.number().int().min(1).max(maxBytes), sha256: sha }).strict();
const envelopeSchema = z.object({ ...metadataShape, parts: z.object({ index: partSchema, presentations: partSchema, reading: partSchema }).strict(), sha256: sha }).strict();
export type ScopedReadingSelection = z.infer<typeof selectionSchema>;
export type ScopedReadingScope = z.infer<typeof scopeSchema>;
export type ScopedReadingPresentation = z.infer<typeof presentationSchema>;
export type ScopedReadingReport = z.infer<typeof reportSchema>;
type TextPart = z.infer<typeof partSchema>;

const unique = <T,>(items: readonly T[]) => [...new Set(items)];
const same = (left: unknown, right: unknown) => canonicalStringify(left) === canonicalStringify(right);
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", utf8.encode(value))), byte => byte.toString(16).padStart(2, "0")).join("");
function fail(message = "这份范围报告未通过完整校验，原记录仍保留。"): never { throw new Error(message); }
function assertJsonData(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") { if (incompleteUnicode.test(value)) fail(); return; }
  if (typeof value === "number") { if (!Number.isFinite(value)) fail(); return; }
  if (typeof value !== "object" || seen.has(value)) fail();
  seen.add(value);
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail();
  for (const [key, entry] of Object.entries(value)) { if (incompleteUnicode.test(key)) fail(); assertJsonData(entry, seen); }
  seen.delete(value);
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function requiredSourceIds(conclusions: ReadingConclusion[]): string[] {
  return unique(conclusions.flatMap(item => [...item.evidence.citations, ...item.evidence.ruleApplications.flatMap(rule => rule.sourceIds)]));
}
function assertClosure(index: ReadingExplanationIndex): void {
  const sourceIds = new Set(index.sources.map(source => source.id));
  if (requiredSourceIds(index.conclusions).some(id => !sourceIds.has(id))) fail("当前范围缺少规则实际引用的来源，未保存不完整依据。");
}
const domainNames: Record<string, string> = { career: "事业与做事", wealth: "收入与开支", relationship: "感情与相处" };
const domainName = (value: string) => domainNames[value] ?? value;
function exclusions(selection: ScopedReadingSelection, otherBranch: boolean): string[] {
  const main = selection.kind === "summary" ? "未纳入任何年份与月份结论。"
    : selection.kind === "month" ? "仅纳入所选这一条月份与领域结论；同月其他领域、本命及年度结论均未纳入。"
      : selection.year === null ? "未纳入其他本命专题、任何年份与月份结论。" : "未纳入本命、其他领域、其他年份及月份结论。";
  return [main, ...(otherBranch ? ["其他顺逆路径未纳入本次保存；选择仅表示阅读范围，不代表确认这条路径真实或更好。"] : []),
    "未纳入的内容不表示没有结论；这份快照不是完整十年报告。"];
}
function scopeTitle(selection: ScopedReadingSelection, conclusions: ReadingConclusion[], segments: ReadingConclusion["scope"][]): string {
  return selection.kind === "summary" ? "一页摘要 · 本命范围"
    : selection.kind === "month" ? `${conclusions[0]!.label} · ${readingPreviewScopeText(segments[0]!)}`
      : `${domainName(selection.domain)} · ${selection.year === null ? "本命范围" : `${selection.year}年 · ${selection.branchId === "forward" ? "顺行路径" : selection.branchId === "backward" ? "逆行路径" : "已确定路径"}`}`;
}

/** Exact current selection only. No calculation, year preparation or repository write. */
export function describeScopedReadingScope(index: ReadingExplanationIndex, query: ReadingExplanationQuery): ScopedReadingScope {
  if (!index.sourceSnapshot.includeHour) fail("未知时辰或候选结果须保留候选组，暂不能保存成唯一命盘的范围报告。");
  const answer = queryReadingExplanation(index, query);
  if (answer.status !== "answered" || !answer.conclusions.length) fail("请先明确选择已有的专题、年份或单条月份结论。");
  if (["year_comparison", "report_comparison", "uncertainty"].includes(answer.topic)) fail("首版范围保存不支持对照或未确定事项，请选择一页摘要、单一领域或单条月份结论。");
  let selection: ScopedReadingSelection;
  if (answer.topic === "summary") selection = { kind: "summary" };
  else if (answer.topic === "month") {
    if (!query.monthId || answer.conclusions.length !== 1 || answer.conclusions[0]!.stableId !== query.monthId) fail("请明确选择单条月份与领域结论后保存。");
    const item = answer.conclusions[0]!;
    if (item.scope.year === null || !item.scope.branchId) fail();
    selection = { kind: "month", conclusionId: item.stableId, year: item.scope.year, branchId: item.scope.branchId };
  } else if (["career", "wealth", "relationship"].includes(answer.topic)) {
    const years = unique(answer.conclusions.map(item => item.scope.year)), branches = unique(answer.conclusions.map(item => item.scope.branchId));
    if (years.length !== 1 || branches.length !== 1) fail("当前领域包含不止一个时间或路径范围，请明确选择后保存。");
    selection = { kind: "domain", domain: answer.topic as "career" | "wealth" | "relationship", year: years[0]!, branchId: branches[0]! };
  } else fail();
  const timed = selection.kind === "month" || selection.kind === "domain" && selection.year !== null;
  const selectedBranchId = selection.kind === "summary" ? null : selection.branchId;
  const allBranches = unique(index.conclusions.flatMap(item => item.scope.branchId ? [item.scope.branchId] : []));
  if (timed && allBranches.length > 1 && !query.branchId) fail("请明确选择一条顺逆路径；选择仅用于本次阅读范围。");
  const segments = answer.conclusions.map(item => item.scope).filter((scope, i, all) => all.findIndex(other => same(other, scope)) === i);
  return scopeSchema.parse({ selection, title: scopeTitle(selection, answer.conclusions, segments), conclusionIds: answer.conclusions.map(item => item.stableId), segments,
    excludedScopeLabels: exclusions(selection, timed && allBranches.some(branch => branch !== selectedBranchId)),
    omittedConclusionCount: index.conclusions.length - answer.conclusions.length });
}

/** Stable v1 export rendering from frozen literals only; never call live producers here. */
function renderFrozen(report: Pick<ScopedReadingReport, "scope" | "source" | "createdAt" | "index" | "presentations">): string {
  const currentConditions = report.source.presentationVersion === "hakimi.plain-summary/0.1.3";
  const lines = ["# 已保存的当前范围报告", "", report.scope.title, `保存时间：${report.createdAt}`, `资料修订：${report.source.revisionId}`,
    "", "## 本次未纳入", ...report.scope.excludedScopeLabels.map(value => `- ${value}`)];
  for (const [i, conclusion] of report.index.conclusions.entries()) {
    const presentation = report.presentations[i]!;
    lines.push("", `## ${conclusion.label}`, "", "### 保存时的阅读文字");
    if (presentation.kind === "plain_summary") {
      const literal = presentation.literal;
      lines.push(literal.plainTitle, literal.explanation, ...literal.conditions.map(value => `${currentConditions ? "条件与限制" : "成立条件"}：${value}`),
        ...literal.limitations.map(value => `限制：${value}`), ...literal.unknowns.map(value => `未定：${value}`), literal.observationQuestion);
    } else lines.push(presentation.literal.scopeLabel, presentation.literal.domainLabel, presentation.literal.meaning, `条件与限制：${presentation.literal.condition}`);
    lines.push("", "### 保存时的完整原文", conclusion.text, "", "### 原结论条件与限制", ...unique([
      ...conclusion.evidence.ruleApplications.flatMap(rule => rule.limitations.map(raw => currentConditions
        && supportsFrozenPlainConditions(conclusion.sourceVersions) && supportsFrozenPlainConditions(report.index.sourceSnapshot.sourceVersions)
          ? frozenPlainConditionText(rule.ruleId, raw) : raw)), ...conclusion.evidence.limits, ...conclusion.evidence.unknowns]).map(value => `- ${value}`));
  }
  return lines.join("\n");
}

function validateReport(raw: unknown): ScopedReadingReport {
  assertJsonData(raw);
  const report = reportSchema.parse(raw), index = validateReadingExplanationIndex(report.index), source = index.sourceSnapshot;
  report.index = index;
  if (!source.includeHour || !same(report.scope.conclusionIds, index.conclusions.map(item => item.stableId))
    || new Set(report.scope.conclusionIds).size !== report.scope.conclusionIds.length
    || report.source.availableConclusionCount !== index.conclusions.length + report.scope.omittedConclusionCount
    || report.source.caseId !== source.caseId || report.source.revisionId !== source.revisionId || report.source.chartResultHash !== source.chartResultHash
    || report.source.ruleProfileDigest !== source.ruleProfileDigest || report.source.reportVersion !== source.reportVersion
    || report.source.explanationIndexVersion !== index.version || !plainPresentationVersion.safeParse(report.source.presentationVersion).success
    || report.source.monthPresentationVersion !== "hakimi.month-preview-binding/0.1.0"
    || Date.parse(report.createdAt) < Date.parse(index.generatedAt) || Date.parse(report.createdAt) < Date.parse(source.inputRecordedAt)) fail();
  const selection = report.scope.selection;
  for (const item of index.conclusions) {
    const scope = item.scope;
    if (selection.kind === "summary" || selection.kind === "domain" && selection.year === null) {
      if (scope.level !== "natal" || scope.year !== null || scope.branchId !== null || scope.startInstant !== null || scope.endExclusiveInstant !== null) fail();
    } else if (scope.year !== selection.year || scope.branchId !== selection.branchId || scope.level !== (selection.kind === "month" ? "month" : "year")) fail();
    if (selection.kind === "domain" && item.domain !== selection.domain) fail();
    if (selection.kind === "month" && (index.conclusions.length !== 1 || item.stableId !== selection.conclusionId)) fail();
  }
  const segments = index.conclusions.map(item => item.scope).filter((scope, i, all) => all.findIndex(other => same(other, scope)) === i);
  if (!same(segments, report.scope.segments) || report.presentations.length !== index.conclusions.length
    || report.scope.title !== scopeTitle(selection, index.conclusions, segments)
    || !same(report.scope.excludedScopeLabels, exclusions(selection, report.scope.excludedScopeLabels.length === 3))) fail();
  assertClosure(index);
  const needed = requiredSourceIds(index.conclusions).sort();
  if (!same(needed, index.sources.map(item => item.id).sort())) fail("范围报告的来源闭包不完整或含无关材料，原记录仍保留。");
  for (const [i, item] of index.conclusions.entries()) {
    const presentation = report.presentations[i]!, literal = presentation.literal;
    if (presentation.conclusionId !== item.stableId || literal.sourceConclusionId !== item.stableId || literal.sourceRevisionId !== source.revisionId
      || literal.sourceReportVersion !== source.reportVersion || !same(literal.sourceVersions, item.sourceVersions) || !same(literal.scope, item.scope)) fail();
    if (presentation.kind === "plain_summary") {
      const summary = presentation.literal;
      if (item.scope.level === "month" || summary.contentVersion !== presentation.contentVersion || summary.contentVersion !== report.source.presentationVersion || summary.topic !== item.domain
        || !same(summary.unknowns, item.evidence.unknowns) || item.evidence.limits.some(limit => !summary.limitations.includes(limit))
        || !same(summary.conditions, item.origin === "personal" ? [] : unique(item.evidence.ruleApplications.flatMap(rule => rule.limitations.map(raw =>
          summary.contentVersion === "hakimi.plain-summary/0.1.3" && supportsFrozenPlainConditions(item.sourceVersions)
            && supportsFrozenPlainConditions(source.sourceVersions) ? frozenPlainConditionText(rule.ruleId, raw) : raw))))
        || !same(summary.ruleRefs, item.origin === "personal" ? [] : item.evidence.ruleApplications.map(rule => rule.ruleId))
        || !same(summary.evidenceRefs, item.origin === "personal" ? [] : index.citationBindings.filter(binding => binding.conclusionId === item.stableId)
          .map(({ conclusionId, sourceId }) => ({ conclusionId, sourceId })))) fail();
      if ((item.origin === "personal") !== (summary.projectionState === "personal_original")) fail();
    } else {
      const month = presentation.literal;
      if (item.scope.level !== "month" || (item.origin === "personal") !== (month.projectionState === "personal_original")) fail();
      if (month.projectionState === "producer_preview" ? !month.meaning || !(item.text === month.meaning || item.text.startsWith(`${month.meaning}\n\n`)) : month.meaning !== item.text) fail();
      if (month.conditionSourceText !== null && ![...item.evidence.limits, ...item.evidence.ruleApplications.flatMap(rule => rule.limitations)].includes(month.conditionSourceText)) fail();
      if (item.origin === "personal" && month.conditionSourceText !== null) fail();
    }
  }
  if (report.reading !== renderFrozen(report)) fail("范围报告的阅读文字与冻结原文不一致，原记录仍保留。");
  return report;
}

export async function buildScopedReadingReport(input: { index: ReadingExplanationIndex; query: ReadingExplanationQuery;
  reportId: string; saveAttemptId: string; createdAt: string }): Promise<ScopedReadingReport> {
  assertJsonData(input.index);
  const checked = validateReadingExplanationIndex(input.index), scope = describeScopedReadingScope(checked, input.query);
  const ids = new Set(scope.conclusionIds), conclusions = checked.conclusions.filter(item => ids.has(item.stableId));
  const required = new Set(requiredSourceIds(conclusions));
  const index = validateReadingExplanationIndex({ ...checked, conclusions, sources: checked.sources.filter(item => required.has(item.id)),
    citationBindings: checked.citationBindings.filter(binding => ids.has(binding.conclusionId)) });
  assertClosure(index);
  // Read the exact original objects before any await, while month producer
  // bindings are still available. Validation's clones intentionally have none.
  const presentations: ScopedReadingPresentation[] = scope.conclusionIds.map(conclusionId => {
    const original = input.index.conclusions.find(item => item.stableId === conclusionId)!;
    return original.scope.level === "month" ? { conclusionId, kind: "month_preview", contentVersion: MONTH_PREVIEW_BINDING_VERSION,
      literal: buildReadingMonthPreview(input.index, original) } : { conclusionId, kind: "plain_summary", contentVersion: PLAIN_READING_CONTENT_VERSION,
      literal: buildPlainReadingSummary(input.index, original) };
  });
  const sourceSnapshot = index.sourceSnapshot;
  const [sourceSnapshotSha256, personalContextSha256] = await Promise.all([digest(canonicalStringify(sourceSnapshot)), digest(canonicalStringify(sourceSnapshot.context))]);
  const source: ScopedReadingReport["source"] = { caseId: sourceSnapshot.caseId, revisionId: sourceSnapshot.revisionId,
    chartResultHash: sourceSnapshot.chartResultHash, includeHour: true, ruleProfileDigest: sourceSnapshot.ruleProfileDigest,
    reportVersion: sourceSnapshot.reportVersion, explanationIndexVersion: index.version, presentationVersion: PLAIN_READING_CONTENT_VERSION,
    monthPresentationVersion: MONTH_PREVIEW_BINDING_VERSION, sourceSnapshotSha256, personalContextSha256, availableConclusionCount: checked.conclusions.length };
  const base = { format: SCOPED_READING_REPORT_VERSION, kind: "scoped_reading" as const, reportId: input.reportId, saveAttemptId: input.saveAttemptId,
    createdAt: input.createdAt, source, scope, index, presentations };
  return freeze(validateReport({ ...base, reading: renderFrozen(base) }));
}

export function isScopedReadingReport(value: string): boolean {
  return value.startsWith(family) || value.startsWith(`\ufeff${family}`);
}
async function part(value: string): Promise<TextPart> {
  const utf8Bytes = utf8.encode(value).byteLength;
  if (utf8Bytes > maxBytes) throw new ReadingReportCapacityError();
  return { text: value, utf8Bytes, sha256: await digest(value) };
}
async function verifySource(report: ScopedReadingReport): Promise<void> {
  const [snapshot, context] = await Promise.all([digest(canonicalStringify(report.index.sourceSnapshot)), digest(canonicalStringify(report.index.sourceSnapshot.context))]);
  if (snapshot !== report.source.sourceSnapshotSha256 || context !== report.source.personalContextSha256) fail();
}
export async function encodeScopedReadingReport(raw: ScopedReadingReport): Promise<string> {
  const report = validateReport(raw);
  await verifySource(report);
  const { index, presentations, reading, ...metadata } = report;
  const indexText = appendReadingExplanationIndex("", index);
  const [indexPart, presentationsPart, readingPart] = await Promise.all([part(indexText), part(JSON.stringify(presentations)), part(reading)]);
  const body = { ...metadata, parts: { index: indexPart, presentations: presentationsPart, reading: readingPart } };
  const result = `${SCOPED_READING_REPORT_MARKER}\n${JSON.stringify({ ...body, sha256: await digest(JSON.stringify(body)) })}`;
  if (result.length > maxBytes || utf8.encode(result).byteLength > maxBytes) throw new ReadingReportCapacityError();
  return result;
}

/** Ordinary/old text is null. A damaged or unsupported reserved subtype throws. */
export async function decodeScopedReadingReport(value: string): Promise<ScopedReadingReport | null> {
  if (!isScopedReadingReport(value)) return null;
  try {
    if (!value.startsWith(`${SCOPED_READING_REPORT_MARKER}\n`) || value.length > maxBytes || utf8.encode(value).byteLength > maxBytes) fail();
    const payload = value.slice(SCOPED_READING_REPORT_MARKER.length + 1), raw: unknown = JSON.parse(payload);
    assertJsonData(raw);
    const envelope = envelopeSchema.parse(raw);
    if (JSON.stringify(raw) !== payload || !same(raw, envelope)) fail();
    const { sha256, parts, ...metadata } = envelope;
    if (await digest(JSON.stringify({ ...metadata, parts })) !== sha256) fail();
    for (const content of Object.values(parts)) if (utf8.encode(content.text).byteLength !== content.utf8Bytes || await digest(content.text) !== content.sha256) fail();
    const index = readReadingExplanationIndex(parts.index.text);
    if (!index || appendReadingExplanationIndex("", index) !== parts.index.text) fail();
    const presentations: unknown = JSON.parse(parts.presentations.text);
    if (JSON.stringify(presentations) !== parts.presentations.text) fail();
    const report = validateReport({ ...metadata, index, presentations, reading: parts.reading.text });
    await verifySource(report);
    return freeze(report);
  } catch { return fail(); }
}
