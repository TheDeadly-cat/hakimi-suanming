import type { ReadingConclusion, ReadingExplanationIndex, ReadingRuleApplication } from "./reading-explanation-index";
import { lookupConditionalContentRule } from "./conditional-content-rules";

/** Current-reading display provenance only; never serialized into a report. */
export const MONTH_PREVIEW_BINDING_VERSION = "hakimi.month-preview-binding/0.1.0" as const;
const previewSelector = "buildPlainTenYearReading.monthHeadline";
const currentMonthHeadlines = new WeakMap<ReadingConclusion, ReadingRuleApplication>();
// Compatibility pins deliberately do not follow moving producer constants.
const supportedVersions = ["hakimi.plain-ten-year-reading/0.4.1", "hakimi.concrete-period-prose/0.4.2",
  "hakimi.conditional-content-rules/0.1.0"] as const;
const compatibleVersions = (versions: readonly string[]) => supportedVersions.every(expected => {
  const family = expected.slice(0, expected.lastIndexOf("/") + 1);
  const matches = versions.filter(version => version.startsWith(family));
  return matches.length === 1 && matches[0] === expected;
});
const domainLabels: Record<ReadingConclusion["domain"], string> = {
  natal: "本命", career: "事业与做事", wealth: "收入与开支", relationship: "感情与相处", timing: "时间范围"
};
const scopeRefs = (scope: ReadingConclusion["scope"], domain: ReadingConclusion["domain"]) => [
  `scope.level=${scope.level}`, `scope.year=${scope.year}`, `scope.branchId=${scope.branchId}`,
  `scope.startInstant=${scope.startInstant}`, `scope.endExclusiveInstant=${scope.endExclusiveInstant}`, `domain=${domain}`
];
const unique = (items: readonly string[]) => [...new Set(items.filter(Boolean))];
const formatTime = (value: string) => new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");

export function readingPreviewScopeText(scope: ReadingConclusion["scope"]): string {
  if (scope.level === "natal") return "本命整体范围，不对应某个确定事件";
  const branch = scope.branchId === "forward" ? "顺行路径" : scope.branchId === "backward" ? "逆行路径"
    : scope.branchId === "locked" ? "已确定路径" : scope.branchId ? `路径 ${scope.branchId}` : "路径未记录";
  if (!scope.startInstant || !scope.endExclusiveInstant || !Number.isFinite(Date.parse(scope.startInstant))
    || !Number.isFinite(Date.parse(scope.endExclusiveInstant))) return `${scope.year ?? "年份未记录"} · ${branch} · 未记录完整起止范围`;
  return `${scope.year}年 · ${formatTime(scope.startInstant)}起至${formatTime(scope.endExclusiveInstant)}前（北京时间）· ${branch}`;
}

/** Capture the producer's short field while it is still distinct from the body.
 * This is display provenance, never an additional calculation or source claim. */
export function bindReadingMonthHeadline(input: {
  key: string; scope: ReadingConclusion["scope"]; domain: ReadingConclusion["domain"];
  title: string; headline: string; sourceSubjects: string[]; producerVersion: string;
}): ReadingRuleApplication {
  return { ruleId: previewSelector, title: input.title, decision: input.headline, support: [], limitations: [],
    sourceIds: [], sourceSubjects: [...input.sourceSubjects], provenance: {
      version: MONTH_PREVIEW_BINDING_VERSION, producerVersion: input.producerVersion, selector: previewSelector,
      selection: input.key, factRefs: scopeRefs(input.scope, input.domain)
    } };
}

/** Attach after index validation (which clones objects). Reopened reports lack
 * this current-producer binding and keep their full original text. */
export function attachReadingMonthHeadline(conclusion: ReadingConclusion, binding: ReadingRuleApplication | null): void {
  if (binding) currentMonthHeadlines.set(conclusion, structuredClone(binding));
  else currentMonthHeadlines.delete(conclusion);
}

export interface ReadingMonthPreview {
  sourceConclusionId: string; sourceRevisionId: string; sourceReportVersion: string; sourceVersions: string[];
  scope: ReadingConclusion["scope"]; scopeLabel: string; domainLabel: string; meaning: string; condition: string;
  conditionSourceText: string | null;
  projectionState: "producer_preview" | "original_required" | "personal_original";
}

/** Read one exact producer field. Never truncate a sentence or use another item. */
export function buildReadingMonthPreview(index: ReadingExplanationIndex, conclusion: ReadingConclusion): ReadingMonthPreview {
  if (!index.conclusions.includes(conclusion) || !conclusion.stableId.startsWith(`${index.sourceSnapshot.revisionId}/`)
    || conclusion.scope.level !== "month") throw new Error("月份预览必须绑定当前索引中的原月份结论。");
  const key = conclusion.stableId.slice(index.sourceSnapshot.revisionId.length + 1);
  const rules = conclusion.evidence.ruleApplications;
  const rule = currentMonthHeadlines.get(conclusion);
  const bound = conclusion.origin !== "personal" && compatibleVersions(conclusion.sourceVersions)
    && compatibleVersions(index.sourceSnapshot.sourceVersions) && rule?.ruleId === previewSelector
    && rule.provenance?.selector === previewSelector && rule.provenance.version === MONTH_PREVIEW_BINDING_VERSION
    && rule.provenance.producerVersion === supportedVersions[0] && rule.provenance.selection === key
    && key.startsWith(`month:${conclusion.scope.branchId}:${conclusion.scope.year}:`) && key.endsWith(`:${conclusion.domain}`)
    && JSON.stringify(rule.provenance.factRefs) === JSON.stringify(scopeRefs(conclusion.scope, conclusion.domain))
    && JSON.stringify(rule.sourceSubjects) === JSON.stringify(conclusion.sourceSubjects)
    && rule.decision.length > 0 && rule.title.length > 0
    && (conclusion.text === rule.decision || conclusion.text.startsWith(`${rule.decision}\n\n`));
  const ruleConditions = bound ? rules.flatMap(item => item.limitations.map(text => ({
    ruleId: item.ruleId, text, forbidden: lookupConditionalContentRule(item.ruleId)?.forbiddenInferences.includes(text) ?? false
  }))) : [];
  const generalRules = new Set(["age-scope", "context-scope", "hidden-is-auxiliary", "undirected-is-topic", "rescue-is-candidate", "persistent-background"]);
  // Prefer this domain's actual rule over universal producer guardrails. Keep
  // every remaining condition available in the unchanged original evidence.
  const ruleCondition = ruleConditions.find(item => !generalRules.has(item.ruleId)) ?? ruleConditions[0];
  // The producer stores forbidden inferences as noun phrases, e.g. "有食神就升职".
  // Preserve their negative role rather than displaying that phrase as a claim.
  const condition = conclusion.origin === "personal" ? "个人原文不作为自动计算或已核实的事实。"
    : ruleCondition ? ruleCondition.ruleId === "age-scope" && ruleCondition.forbidden
      ? "只按本段时间内的实际年龄理解；出生前不编写人生事件，未满成年时不套用成人工作或婚恋情景。"
      : ruleCondition.forbidden ? `不能据此认定“${ruleCondition.text}”。` : ruleCondition.text
      : unique(conclusion.evidence.limits)[0] ?? "本条未单列条件，请连同完整原文和依据阅读。";
  return {
    sourceConclusionId: conclusion.stableId, sourceRevisionId: index.sourceSnapshot.revisionId,
    sourceReportVersion: index.sourceSnapshot.reportVersion, sourceVersions: [...conclusion.sourceVersions],
    scope: { ...conclusion.scope }, scopeLabel: readingPreviewScopeText(conclusion.scope),
    domainLabel: bound ? rule.title : domainLabels[conclusion.domain], meaning: bound ? rule.decision : conclusion.text,
    condition, conditionSourceText: conclusion.origin === "personal" ? null : ruleCondition?.text ?? conclusion.evidence.limits[0] ?? null,
    projectionState: conclusion.origin === "personal" ? "personal_original" : bound ? "producer_preview" : "original_required"
  };
}
