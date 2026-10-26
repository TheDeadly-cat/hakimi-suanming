import { z } from "zod";
import { LOCAL_READING_EDITION_VERSION } from "./local-reading-version";
import type { RevisionRecord } from "@hakimi/contracts";
import { canonicalStringify } from "@hakimi/integrity";
import type { BaziPreliminaryAssessment, PreliminarySource } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BriefReadingReport } from "./brief-reading-report";
import type { LocalReadingSynthesis } from "./local-reading-synthesis";
import type { ConcreteLifeSentence, ConcretePeriodFact } from "./concrete-period-prose";
import { lookupConditionalContentRule, type ConditionalContentAssessment } from "./conditional-content-rules";

export const READING_EXPLANATION_INDEX_VERSION = "hakimi.reading-explanation-index/0.1.0" as const;
export const READING_EXPLANATION_MARKER = "<!-- hakimi-reading-explanation-index-v1 -->";
const END_MARKER = "<!-- /hakimi-reading-explanation-index-v1 -->";
export const READING_EXPLANATION_SHARED_VERSIONS_MARKER = "<!-- hakimi-reading-explanation-index-v2 -->";
export const READING_EXPLANATION_SHARED_VERSIONS_FORMAT = "hakimi.reading-explanation-shared-arrays/2" as const;
const SHARED_END_MARKER = "<!-- /hakimi-reading-explanation-index-v2 -->";
const INDEX_MARKER_FAMILY = "<!-- hakimi-reading-explanation-index-";
const MAX_INDEX_WIRE_CHARACTERS = 3_000_000;
// Same byte budget as the existing report bundle/snapshot, checked before
// expanding shared arrays. The wire limit and all semantic limits stay intact.
const MAX_EXPANDED_INDEX_BYTES = 8 * 1024 * 1024;
const utf8 = new TextEncoder();
const boundedText = z.string().max(30_000);
const texts = z.array(boundedText).max(500);
const nullableText = boundedText.nullable();
const scopeSchema = z.object({ level: z.enum(["natal", "year", "month"]), year: z.number().int().nullable(),
  branchId: nullableText, startInstant: nullableText, endExclusiveInstant: nullableText }).strict();
const applicationSchema = z.object({ ruleId: boundedText, title: boundedText, decision: boundedText,
  support: texts, limitations: texts, sourceIds: texts, sourceSubjects: texts,
  provenance: z.object({ version: boundedText, producerVersion: boundedText, selector: boundedText, selection: boundedText, factRefs: texts }).strict().optional() }).strict();
const conclusionSchema = z.object({ stableId: boundedText, label: boundedText, text: boundedText,
  domain: z.enum(["natal", "career", "wealth", "relationship", "timing"]), scope: scopeSchema,
  sourceSubjects: texts, direction: nullableText, origin: z.enum(["calculated", "contextual", "personal"]),
  sourceVersions: texts, personalTextIds: texts.default([]), evidence: z.object({ facts: texts, ruleApplications: z.array(applicationSchema).max(150),
    support: texts, limits: texts, unknowns: texts, citations: texts }).strict() }).strict();
const timeSchema = z.object({ revisionId: boundedText, chartResultHash: boundedText,
  inputReliability: z.literal("user_supplied_not_independently_verified"), inputPrecision: boundedText,
  pillarStatus: z.enum(["not_assessed", "unavailable", "unchanged_at_tested_offsets", "changed_at_tested_offsets", "inconclusive"]),
  offsetsMinutes: z.array(z.number()).max(7), changedPillars: texts, blockedOffsets: z.array(z.number()).max(7),
  interpretationStatus: z.literal("not_assessed"), note: boundedText }).strict();
const indexSchema = z.object({ version: z.literal(READING_EXPLANATION_INDEX_VERSION), generatedAt: z.string().datetime(),
  sourceSnapshot: z.object({ caseId: z.string().uuid(), revisionId: z.string().uuid(), chartResultHash: boundedText,
    includeHour: z.boolean(), input: z.record(z.string(), z.unknown()), ruleProfile: z.record(z.string(), z.unknown()),
    ruleProfileDigest: boundedText, timeCalibration: z.record(z.string(), z.unknown()),
    engineVersions: z.record(z.string(), z.unknown()), context: z.unknown(), sourceVersions: texts,
    reportVersion: boundedText, inputRecordedAt: z.string().datetime() }).strict(),
  conclusions: z.array(conclusionSchema).max(2_500),
  sources: z.array(z.object({ id: boundedText, title: boundedText, url: boundedText, locator: boundedText,
    excerpt: boundedText, interpretation: boundedText }).strict()).max(500),
  citationBindings: z.array(z.object({ conclusionId: boundedText, sourceId: boundedText, producerField: boundedText,
    usageNote: boundedText }).strict()).max(5_000),
  uncertainty: timeSchema, limitations: texts }).strict();

export type ReadingConclusion = z.infer<typeof conclusionSchema>;
export type ReadingRuleApplication = z.infer<typeof applicationSchema>;
export type ReadingTimeUncertainty = z.infer<typeof timeSchema>;
export type ReadingExplanationIndex = z.infer<typeof indexSchema>;
export type ReadingExplanationTopic = "summary" | "career" | "wealth" | "relationship" | "year_comparison" | "month" | "uncertainty" | "report_comparison";
export interface ReadingExplanationQuery {
  question?: string; topic?: ReadingExplanationTopic; year?: number; comparisonYear?: number;
  monthId?: string; branchId?: string; previousIndex?: ReadingExplanationIndex | null;
}
export interface ReadingExplanationAnswer {
  status: "answered" | "needs_selection" | "unavailable"; topic: ReadingExplanationTopic;
  summary: string; conclusions: ReadingConclusion[]; sourceSubjects: string[]; scopeNotes: string[];
  changes?: { category: "input" | "rules" | "engine" | "context" | "wording" | "coverage"; label: string; detail: string }[];
}
const unique = (values: readonly string[]) => [...new Set(values.filter(Boolean))];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const same = (a: unknown, b: unknown) => canonicalStringify(a) === canonicalStringify(b);
const natalScope: ReadingConclusion["scope"] = { level: "natal", year: null, branchId: null, startInstant: null, endExclusiveInstant: null };
const domainName = (domain: string) => domain === "relationships" ? "relationship" as const : domain as "career" | "wealth" | "relationship";

export function unassessedReadingTime(revision: RevisionRecord): ReadingTimeUncertainty {
  const exact = ["exact_minute", "exact_second"].includes(revision.input.timePrecision);
  return { revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    inputReliability: "user_supplied_not_independently_verified", inputPrecision: revision.input.timePrecision,
    pillarStatus: exact ? "not_assessed" : "unavailable", offsetsMinutes: [], changedPillars: [], blockedOffsets: [],
    interpretationStatus: "not_assessed", note: exact
      ? "出生时间来自填写资料，尚未核验原始证明；尚未进行时间边界检查，不能认定整篇解读稳定。"
      : "当前时间精度不足以进行分钟扰动检查。未明确时柱的结论不使用时柱，也不补猜一个出生时间。" };
}

/** Explicit, local, read-only calculation. It does not activate the candidate AI envelope. */
export async function buildReadingTimeUncertainty(revision: RevisionRecord): Promise<ReadingTimeUncertainty> {
  const initial = unassessedReadingTime(revision);
  if (initial.pillarStatus === "unavailable") return initial;
  const { buildBaziBirthTimePerturbationStabilityReport } = await import("../../../../packages/bazi-interpretation/src/birth-time-perturbation-stability");
  const report = await buildBaziBirthTimePerturbationStabilityReport(revision);
  if (report.binding.revisionId !== revision.id || report.binding.sourceResultHash !== revision.manifest.resultHash) throw new Error("时间边界结果不属于当前命盘。");
  const changed = report.scenarios.filter(item => item.status === "calculated").flatMap(item => item.changedPillarIdentities);
  const status = report.stability.status === "pillar_projection_unchanged_for_all_requested_offsets" ? "unchanged_at_tested_offsets"
    : report.stability.status === "pillar_projection_changed_within_requested_offsets" ? "changed_at_tested_offsets" : "inconclusive";
  return { ...initial, pillarStatus: status, offsetsMinutes: [...report.stability.requestedOffsetsMinutes], changedPillars: unique(changed),
    blockedOffsets: report.stability.blockedOffsets.map(item => item.offsetMinutes), note: status === "unchanged_at_tested_offsets"
      ? "这七个前后时间样本的四柱投影未变化；未检查中间所有时间，也未重新评估整篇解释。它不能证明输入真实或整篇判断稳定。"
      : status === "changed_at_tested_offsets" ? "所试时间样本中出现四柱变化。依赖变化柱位的格局、喜用、事业、关系及年月解释都应重新核对，不能沿用一份报告覆盖全部时间。"
      : "部分时间样本未能计算，边界结果不完整，暂不能判断四柱投影是否一致。整篇解释的稳定性仍未评估。" };
}

function sourceNotes(sentences: readonly ConcreteLifeSentence[]): string[] {
  return unique(sentences.flatMap(sentence => sentence.sources.map(source => source.detail || `${source.kind}：${source.id}`)));
}
function periodFacts(facts: readonly ConcretePeriodFact[]): string[] {
  return unique(facts.map(fact => `${fact.actor || "未单列角色"} · ${fact.visibility || "未单列透藏"} · ${fact.mechanism}（作用轴 ${fact.axisId}）`));
}
function ruleApplications(assessment: ConditionalContentAssessment | undefined, sentences: readonly ConcreteLifeSentence[], facts: readonly ConcretePeriodFact[] = []): ReadingRuleApplication[] {
  const references = new Set([...sentences, ...facts].flatMap(item => item.ruleDecisionIds ?? []));
  return (assessment?.decisions ?? []).filter(decision => references.has(decision.id)).map(decision => {
    const definition = lookupConditionalContentRule(decision.ruleId);
    return { ruleId: decision.ruleId, title: definition?.title ?? decision.ruleId,
      decision: decision.status === "applied" ? `本项已应用；只允许${decision.allowedKinds.map(kind => ({ opportunity: "有条件的机会", caution: "具体阻力", topic: "中性事项" })[kind]).join("、")}表达。` : "本项排除，不能据此添加事件或方向。",
      support: decision.support.map(fact => fact.detail), limitations: unique([...decision.counterFacts.map(fact => fact.detail), ...decision.exclusions, ...(definition?.forbiddenInferences ?? [])]),
      sourceIds: decision.sourceIds, sourceSubjects: unique([...decision.support, ...decision.counterFacts].map(fact => fact.id)) };
  });
}

export interface BuildReadingExplanationIndexInput {
  report: BriefReadingReport; revision: RevisionRecord; assessment: BaziPreliminaryAssessment; generatedAt: string;
  synthesis?: LocalReadingSynthesis | null; context?: unknown; reportVersion?: string; timeUncertainty?: ReadingTimeUncertainty;
}
/** Projects the guarded report. It never derives chart direction from the question or prose. */
export function buildReadingExplanationIndex(input: BuildReadingExplanationIndexInput): ReadingExplanationIndex {
  const { report, revision, assessment, synthesis } = input;
  if (report.sourceBinding.revisionId !== revision.id || report.sourceBinding.caseId !== revision.caseId
    || report.sourceBinding.chartResultHash !== revision.manifest.resultHash
    || assessment.sourceBinding.revisionId !== revision.id || assessment.sourceBinding.chartResultHash !== revision.manifest.resultHash
    || report.sourceBinding.includeHour !== assessment.sourceBinding.includeHour
    || (synthesis && !same(synthesis.sourceBinding, report.sourceBinding))) throw new Error("依据索引的命盘、修订或时柱范围不一致。");
  const sources = new Map<string, PreliminarySource>();
  for (const source of [...assessment.sources, ...(synthesis?.sources ?? []), ...(report.natalConclusion?.original.sources ?? [])]) {
    const previous = sources.get(source.id);
    if (previous && (previous.excerpt !== source.excerpt || previous.url !== source.url)) throw new Error("同一引文编号出现不同原文。");
    sources.set(source.id, source);
  }
  const index: ReadingExplanationIndex = { version: READING_EXPLANATION_INDEX_VERSION, generatedAt: input.generatedAt,
    sourceSnapshot: { ...report.sourceBinding, input: clone(revision.input), ruleProfile: clone(revision.ruleProfile),
      ruleProfileDigest: revision.manifest.ruleProfileDigest, timeCalibration: clone(revision.timeCalibration),
      engineVersions: clone({ engine: revision.manifest.engine, timeZoneDatabase: revision.manifest.timeZoneDatabase ?? null }),
      context: clone(input.context ?? null), sourceVersions: unique([...report.sourceVersions, ...(report.plainReading?.sourceVersions ?? []), ...(synthesis?.sourceVersions ?? []), READING_EXPLANATION_INDEX_VERSION]),
      reportVersion: input.reportVersion ?? LOCAL_READING_EDITION_VERSION, inputRecordedAt: revision.createdAt },
    conclusions: [], sources: [...sources.values()].map(({ id, title, url, locator, excerpt, interpretation }) => ({ id, title, url, locator, excerpt, interpretation })),
    citationBindings: [], uncertainty: clone(input.timeUncertainty ?? unassessedReadingTime(revision)),
    limitations: unique([...assessment.limitations, ...(report.plainReading?.limitations ?? []), ...report.coverage.gaps,
      "来源关联表示生产规则实际引用过该材料；引用存在和原文相同，不等于整句解释已获语义证明或现实验证。"] ) };
  if (index.uncertainty.revisionId !== revision.id || index.uncertainty.chartResultHash !== revision.manifest.resultHash) throw new Error("出生时间检查与当前报告不一致。");
  const add = (key: string, item: Omit<ReadingConclusion, "stableId" | "sourceVersions" | "personalTextIds">, sourceIds: readonly string[] = [], producerField = "", personalIds: readonly string[] = []) => {
    const stableId = `${revision.id}/${key}`;
    const personal = item.origin === "personal" ? report.personalTexts.filter(entry => personalIds.length ? personalIds.includes(entry.id) : item.sourceSubjects.includes(entry.subjectId)) : [];
    if (item.origin === "personal" && !personal.length) throw new Error("个人结论缺少已核对的采用原文。");
    const linked = item.origin === "personal" ? [] : unique(sourceIds).filter(id => sources.has(id));
    const missing = sourceIds.filter(id => !sources.has(id));
    const conclusion: ReadingConclusion = { ...item, stableId, text: personal.length ? personal.map(entry => entry.text).join("\n\n") : item.text,
      personalTextIds: personal.map(entry => entry.id), sourceVersions: [...index.sourceSnapshot.sourceVersions],
      evidence: { ...item.evidence, citations: linked, unknowns: unique([...item.evidence.unknowns,
        ...missing.map(id => `来源 ${id} 未随这份结果提供，不补猜其内容。`)]),
        ...(personal.length ? { support: [], ruleApplications: [], unknowns: ["这是当时采用的个人原文，不作为自动规则支持或已核实的人生事实。"] } : {}) } };
    index.conclusions.push(conclusion);
    for (const sourceId of linked) index.citationBindings.push({ conclusionId: stableId, sourceId, producerField,
      usageNote: "原生产者对本项的关联来源；本地规则解释与古籍原文分开阅读。" });
  };
  const baseEvidence = (support: string[], limits: string[], facts: string[] = [], rules: ReadingRuleApplication[] = []): ReadingConclusion["evidence"] => ({
    facts: unique(facts), ruleApplications: rules, support: unique(support), limits: unique(limits), citations: [], unknowns: [] });
  const natal = report.natalConclusion?.original;
  if (natal) {
    const score = natal.scoreBasis;
    const facts = [`扶助侧 ${score.supportWeight}，泄耗克侧 ${score.demandWeight}；结构判断 ${score.workingLabel}。`, score.explanation];
    add("natal:pattern", { label: "格局主判", text: report.natalConclusion!.pattern.text, domain: "natal", scope: natalScope,
      direction: null, origin: report.natalConclusion!.pattern.origin, sourceSubjects: natal.pattern.sourceSubjects,
      evidence: baseEvidence(natal.pattern.evidence, natal.pattern.conditions, facts, [{ ruleId: natal.pattern.pathId,
        title: natal.pattern.title, decision: natal.pattern.decision, support: natal.pattern.evidence, limitations: natal.pattern.conditions,
        sourceIds: natal.pattern.sourceIds, sourceSubjects: natal.pattern.sourceSubjects }]) }, natal.pattern.sourceIds, "natalConclusion.pattern.sourceIds", report.natalConclusion!.pattern.personalTextIds);
    for (const [kind, entries] of [["use", [natal.firstChoice, ...natal.secondChoices]], ["avoid", natal.avoid]] as const) {
      for (const entry of entries) {
        const display = entry === natal.firstChoice ? report.natalConclusion!.firstChoice
          : [...report.natalConclusion!.secondChoices, ...report.natalConclusion!.avoid].find(block => block.id === `adopted-${entry.id}` || block.id === `adopted-avoid-${entry.id}`);
        add(`natal:${kind}:${entry.id}`, { label: entry.title, text: entry.decision, domain: "natal", scope: natalScope,
        direction: null, origin: display?.origin ?? "calculated", sourceSubjects: display?.sourceSubjects ?? entry.sourceSubjects,
        evidence: baseEvidence(entry.evidence, entry.conditions, facts, [{ ruleId: entry.id, title: entry.title, decision: entry.decision,
          support: entry.evidence, limitations: entry.conditions, sourceIds: entry.sourceIds, sourceSubjects: entry.sourceSubjects }]) }, entry.sourceIds, `natalConclusion.${kind}.${entry.id}.sourceIds`, display?.personalTextIds);
      }
    }
  }
  const domains = report.plainReading?.domains ?? report.domainCards.map(card => ({ ...card, paragraphs: [card.text] }));
  for (const domain of domains) {
    const section = synthesis?.sections.find(item => item.id === domain.id);
    const finalDomain = report.plainReading?.domains.find(item => item.id === domain.id);
    const appliedRules = finalDomain?.ruleApplications ?? section?.ruleApplications ?? [];
    const appliedSources = finalDomain?.sourceIds ?? section?.sourceIds ?? [];
    const domainFacts = domain.id === "relationships"
      ? [`日柱${revision.facts.pillars.day.ganZhi}，日支${revision.facts.pillars.day.branch}；关系星与宫位互动的原始线索见下方支持依据。`,
        `登记的顺逆/传统关系视角信息：${revision.input.sex === "male" ? "男" : revision.input.sex === "female" ? "女" : "未指定"}；这不说明现实婚恋状态。`]
      : [`日主${revision.facts.pillars.day.stem}，月柱${revision.facts.pillars.month.ganZhi}。`,
        ...(natal ? [`本命结构判断${natal.scoreBasis.workingLabel}；扶助侧${natal.scoreBasis.supportWeight}，泄耗克侧${natal.scoreBasis.demandWeight}。计权不代表收入金额或事件概率。`] : [])];
    add(`natal:${domain.id}`, { label: domain.title, text: domain.paragraphs.join("\n\n"), domain: domainName(domain.id), scope: natalScope,
      direction: null, origin: domain.origin, sourceSubjects: domain.sourceSubjects,
      evidence: { ...baseEvidence(finalDomain?.ruleApplications !== undefined ? appliedRules.flatMap(rule => rule.support) : section?.evidence ?? [],
        finalDomain?.ruleApplications !== undefined ? unique([...appliedRules.flatMap(rule => rule.limitations), ...(report.plainReading?.limitations ?? [])]) : section?.conditions ?? report.plainReading?.limitations ?? [], domain.origin === "personal" ? [] : domainFacts,
        domain.origin === "personal" ? [] : clone(appliedRules)),
        unknowns: [...(section ? [] : ["这份结果未提供该领域逐句的依据映射，不能把其他领域的引文借来支持它。"]),
          ...(input.context == null ? ["尚未填写并保存现实背景；不据此认定已经就业、收入变动或正在恋爱/婚姻中。"] : [])],
        ...(domain.origin === "personal" ? { support: [], unknowns: ["这是明确采用的个人原文，不作为自动计算或古籍已证明的结论。"] } : {}) }
    }, domain.origin === "personal" ? [] : appliedSources, finalDomain?.sourceIds !== undefined ? `plainReading.domains.${domain.id}.sourceIds` : `synthesis.sections.${domain.id}.sourceIds`, domain.personalTextIds);
  }
  for (const branch of report.plainReading?.outlook.branches ?? []) for (const year of branch.years) for (const segment of year.segments) {
    const scope: ReadingConclusion["scope"] = { level: "year", year: year.year, branchId: branch.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant };
    for (const domain of segment.domains) {
      const producer = segment.domainEvidence.find(item => item.domain === domain.domain);
      const sentences = producer?.sentences ?? [];
      add(`year:${branch.id}:${year.year}:${segment.id}:${domain.domain}`, { label: `${year.year}年 · ${domain.title}`, text: domain.text,
        domain: domain.domain, scope, direction: domain.verdict.direction, origin: domain.origin, sourceSubjects: domain.sourceSubjects,
        evidence: baseEvidence(sourceNotes(sentences), [segment.monthCoverageText, report.plainReading!.outlook.scopeText],
          [`该领域作用：${domain.verdict.label}；取用依据：${domain.verdict.basis === "relationship_signals" ? "独立关系线索" : "本段结构作用"}。`,
            ...(domain.verdict.backgroundPressure ? ["同时保留较长期的压力背景，不能只读眼前有利作用。"] : [])], ruleApplications(producer?.contentRules, sentences)) }, [], "", domain.personalTextIds);
    }
    for (const window of segment.monthWindows) for (const member of window.members) for (const topic of member.topics) {
      add(`month:${branch.id}:${year.year}:${member.periodId}:${topic.domain}`, { label: `${member.label} · ${topic.title}`, text: unique([topic.text, topic.summary]).join("\n\n"),
        domain: topic.domain, scope: { ...scope, level: "month", startInstant: member.startInstant, endExclusiveInstant: member.endExclusiveInstant },
        direction: null, origin: topic.origin, sourceSubjects: topic.sourceSubjects,
        evidence: baseEvidence(sourceNotes(topic.sentences), unique([member.annualContrast, member.directionNote, report.plainReading!.outlook.scopeText]),
          [`流月 ${member.ganZhi}；${member.ageLabel}。`, ...periodFacts(topic.facts)], ruleApplications(topic.contentRules, topic.sentences, topic.facts)) }, [], "", topic.personalTextIds);
    }
  }
  return validateReadingExplanationIndex(index);
}

export function resolveReadingCitationSupport(index: ReadingExplanationIndex, conclusionStableId: string, sourceId: string) {
  if (!index.sources.some(source => source.id === sourceId)) return { status: "missing" as const };
  const relation = index.citationBindings.find(item => item.conclusionId === conclusionStableId && item.sourceId === sourceId);
  return relation ? { status: "associated_source" as const, relation } : { status: "unrelated" as const };
}

export function validateReadingExplanationIndex(raw: unknown): ReadingExplanationIndex {
  const value = indexSchema.parse(raw);
  const ids = new Set(value.conclusions.map(item => item.stableId));
  if (ids.size !== value.conclusions.length || value.sources.length !== new Set(value.sources.map(item => item.id)).size) throw new Error("结论或来源编号重复。");
  if (value.uncertainty.revisionId !== value.sourceSnapshot.revisionId || value.uncertainty.chartResultHash !== value.sourceSnapshot.chartResultHash) throw new Error("时间检查与保存命盘不一致。");
  for (const binding of value.citationBindings) if (!ids.has(binding.conclusionId) || !value.sources.some(source => source.id === binding.sourceId)) throw new Error("引文关联没有对应的结论或来源。");
  for (const conclusion of value.conclusions) {
    if (!conclusion.stableId.startsWith(`${value.sourceSnapshot.revisionId}/`)) throw new Error("结论不属于保存修订。");
    const linked = unique(value.citationBindings.filter(item => item.conclusionId === conclusion.stableId).map(item => item.sourceId)).sort();
    if (!same([...conclusion.evidence.citations].sort(), linked)) throw new Error("引文真实存在也不能支持未关联的结论。");
    if (conclusion.scope.level !== "natal" && (conclusion.scope.year === null || !conclusion.scope.branchId
      || !conclusion.scope.startInstant || !conclusion.scope.endExclusiveInstant
      || !Number.isFinite(Date.parse(conclusion.scope.startInstant)) || !Number.isFinite(Date.parse(conclusion.scope.endExclusiveInstant))
      || Date.parse(conclusion.scope.startInstant) >= Date.parse(conclusion.scope.endExclusiveInstant))) throw new Error("结论时间范围无效。");
  }
  return value;
}

type SharedVersionsConclusion = Omit<ReadingConclusion, "sourceVersions" | "evidence"> & { sourceVersionsRef: number;
  evidence: Omit<ReadingConclusion["evidence"], "limits" | "ruleApplications"> & { limitsRef: number } &
    ({ ruleApplications: ReadingRuleApplication[]; ruleApplicationRefs?: never } | { ruleApplicationRefs: number[]; ruleApplications?: never }) };
type SharedVersionsIndex = Omit<ReadingExplanationIndex, "conclusions"> & { conclusions: SharedVersionsConclusion[] };
function shareIndexArrays(index: ReadingExplanationIndex, shareRules = true) {
  const sourceVersionSets: string[][] = [], evidenceLimitSets: string[][] = [];
  const ruleApplicationPool: ReadingRuleApplication[] = [];
  const versions = new Map<string, number>(), limits = new Map<string, number>(), rules = new Map<string, number>();
  const intern = <T>(values: T, pool: T[], positions: Map<string, number>) => {
    const key = JSON.stringify(values);
    let ref = positions.get(key);
    if (ref === undefined) { ref = pool.length; positions.set(key, ref); pool.push(values); }
    return ref;
  };
  const conclusions = index.conclusions.map(({ sourceVersions, evidence, ...conclusion }): SharedVersionsConclusion => {
    const { limits: evidenceLimits, ...restEvidence } = evidence;
    const limitsRef = intern(evidenceLimits, evidenceLimitSets, limits);
    const { ruleApplications, ...withoutRules } = restEvidence;
    const compactEvidence = shareRules ? { ...withoutRules, limitsRef,
      ruleApplicationRefs: ruleApplications.map(rule => intern(rule, ruleApplicationPool, rules)) } : { ...restEvidence, limitsRef };
    return { ...conclusion, evidence: compactEvidence,
      sourceVersionsRef: intern(sourceVersions, sourceVersionSets, versions) };
  });
  return { format: READING_EXPLANATION_SHARED_VERSIONS_FORMAT, sourceVersionSets, evidenceLimitSets,
    ...(shareRules ? { ruleApplicationPool } : {}),
    index: { ...index, conclusions } satisfies SharedVersionsIndex };
}
const sharedVersionsEnvelopeSchema = z.object({ format: z.literal(READING_EXPLANATION_SHARED_VERSIONS_FORMAT),
  sourceVersionSets: z.array(texts).max(2_500), evidenceLimitSets: z.array(texts).max(2_500),
  ruleApplicationPool: z.array(applicationSchema).max(2_500 * 150).optional(), index: z.unknown() }).strict();
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function restoreSourceVersions(raw: unknown, payload: string): ReadingExplanationIndex {
  const envelope = sharedVersionsEnvelopeSchema.parse(raw), compact = envelope.index;
  if (!isObject(compact) || !Array.isArray(compact.conclusions) || compact.conclusions.length > 2_500) throw new Error("依据索引的共享版本结构无效。");
  const poolBytes = envelope.sourceVersionSets.map(versions => utf8.encode(JSON.stringify(versions)).byteLength);
  const limitBytes = envelope.evidenceLimitSets.map(limits => utf8.encode(JSON.stringify(limits)).byteLength);
  const ruleBytes = envelope.ruleApplicationPool?.map(rule => utf8.encode(JSON.stringify(rule)).byteLength);
  let expandedBytes = utf8.encode(JSON.stringify(compact)).byteLength;
  const reference = (container: unknown, key: "sourceVersions" | "limits", poolSize: number) => {
    if (!isObject(container) || Object.hasOwn(container, key) || !Object.hasOwn(container, `${key}Ref`)) throw new Error("依据索引的共享数组引用无效。");
    const ref = container[`${key}Ref`];
    if (typeof ref !== "number" || !Number.isSafeInteger(ref) || ref < 0 || ref >= poolSize) throw new Error("依据索引的共享数组引用无效。");
    return ref;
  };
  // Only the declared version/limit arrays and complete rule applications use
  // pools. Other data (including input/context) is never recursively decoded.
  // Check each ref
  // and its expansion cost before allocating any repeated arrays.
  for (const conclusion of compact.conclusions) {
    const ref = reference(conclusion, "sourceVersions", poolBytes.length);
    const limitRef = reference((conclusion as Record<string, unknown>).evidence, "limits", limitBytes.length);
    expandedBytes += poolBytes[ref]! - String(ref).length - 3; // sourceVersionsRef -> sourceVersions
    expandedBytes += limitBytes[limitRef]! - String(limitRef).length - 3; // limitsRef -> limits
    if (ruleBytes) {
      const evidence = (conclusion as Record<string, unknown>).evidence as Record<string, unknown>;
      if (Object.hasOwn(evidence, "ruleApplications") || !Array.isArray(evidence.ruleApplicationRefs)
        || evidence.ruleApplicationRefs.length > 150) throw new Error("依据索引的共享规则引用无效。");
      for (const ruleRef of evidence.ruleApplicationRefs) {
        if (typeof ruleRef !== "number" || !Number.isSafeInteger(ruleRef) || ruleRef < 0 || ruleRef >= ruleBytes.length) throw new Error("依据索引的共享规则引用无效。");
        expandedBytes += ruleBytes[ruleRef]! - String(ruleRef).length;
      }
      expandedBytes -= 3; // ruleApplicationRefs -> ruleApplications; brackets/commas are unchanged.
    }
  }
  if (expandedBytes > MAX_EXPANDED_INDEX_BYTES) throw new Error("依据索引展开超出读取范围。");
  const conclusions = compact.conclusions.map(value => {
    const { sourceVersionsRef, evidence, ...conclusion } = value as Record<string, unknown>;
    const { limitsRef, ...restEvidence } = evidence as Record<string, unknown>;
    const { ruleApplicationRefs, ...withoutRuleRefs } = restEvidence;
    const restoredEvidence = envelope.ruleApplicationPool ? { ...withoutRuleRefs,
      ruleApplications: (ruleApplicationRefs as number[]).map(ref => structuredClone(envelope.ruleApplicationPool![ref]!)) } : restEvidence;
    return { ...conclusion, sourceVersions: [...envelope.sourceVersionSets[sourceVersionsRef as number]!],
      evidence: { ...restoredEvidence, limits: [...envelope.evidenceLimitSets[limitsRef as number]!] } };
  });
  const index = validateReadingExplanationIndex({ ...compact, conclusions });
  // Reject unused/duplicate pool entries, alternate numbering or fields. This
  // canonical rule is v2-only; the original v1 JSON acceptance is unchanged.
  if (JSON.stringify(shareIndexArrays(index, envelope.ruleApplicationPool !== undefined)) !== payload) throw new Error("依据索引不是原保存结构。");
  return index;
}
function indexMarkers(archive: string) {
  // JSON payload strings escape newlines: marker-like literal data inside a
  // conclusion or context must not be interpreted as a second v2 block.
  return [...archive.matchAll(/^<!-- hakimi-reading-explanation-index-[^\r\n]*$/gm)];
}
export function appendReadingExplanationIndex(archive: string, index: ReadingExplanationIndex): string {
  if (archive.includes(INDEX_MARKER_FAMILY)) throw new Error("报告已带有依据索引，不能覆盖原索引。");
  const checked = validateReadingExplanationIndex(index), payload = JSON.stringify(checked);
  // Preserve the byte-for-byte v1 writer for reports that already fit.
  if (payload.length <= MAX_INDEX_WIRE_CHARACTERS) return `${archive}\n\n${READING_EXPLANATION_MARKER}\n${payload}\n${END_MARKER}`;
  if (utf8.encode(payload).byteLength > MAX_EXPANDED_INDEX_BYTES) throw new Error("本次依据索引展开过大，未保存不完整结果。");
  const sharedPayload = JSON.stringify(shareIndexArrays(checked));
  if (sharedPayload.length > MAX_INDEX_WIRE_CHARACTERS) throw new Error("本次依据索引过大，未保存不完整结果。");
  return `${archive}\n\n${READING_EXPLANATION_SHARED_VERSIONS_MARKER}\n${sharedPayload}\n${SHARED_END_MARKER}`;
}
export function readReadingExplanationIndex(archive: string): ReadingExplanationIndex | null {
  const markers = indexMarkers(archive);
  if (markers.length > 1) throw new Error("报告含有重复依据索引。");
  const marker = markers[0]?.[0] ?? (archive.includes(READING_EXPLANATION_MARKER) ? READING_EXPLANATION_MARKER : null);
  if (marker === null) {
    if (archive.includes(INDEX_MARKER_FAMILY)) throw new Error("依据索引格式尚不支持。");
    return null;
  }
  const shared = marker === READING_EXPLANATION_SHARED_VERSIONS_MARKER;
  if (!shared && marker !== READING_EXPLANATION_MARKER) throw new Error("依据索引格式尚不支持。");
  const position = markers[0]?.index ?? archive.indexOf(marker), endMarker = shared ? SHARED_END_MARKER : END_MARKER;
  if (archive.slice(0, position).includes(INDEX_MARKER_FAMILY)) throw new Error("报告含有重复或不支持的依据索引。");
  if (!shared && archive.indexOf(marker, position + marker.length) >= 0) throw new Error("报告含有重复依据索引。");
  const content = archive.slice(position + marker.length);
  if (!content.startsWith("\n") || !content.endsWith(`\n${endMarker}`)) throw new Error("依据索引不完整。");
  const payload = content.slice(1, -(`\n${endMarker}`).length);
  if (payload.length > MAX_INDEX_WIRE_CHARACTERS) throw new Error("依据索引超出读取范围。");
  const raw: unknown = JSON.parse(payload);
  if (JSON.stringify(raw) !== payload) throw new Error("依据索引不是原保存结构。");
  return shared ? restoreSourceVersions(raw, payload) : validateReadingExplanationIndex(raw);
}

function route(question: string): ReadingExplanationTopic | null {
  if (/旧报告|版本|更改|变化原因|前后报告|对照报告/u.test(question)) return "report_comparison";
  if (/时辰|出生时间|时间不准|边界|不确定/u.test(question)) return "uncertainty";
  if (/月份|流月|关键月|这个月|(?:^|[^0-9])(?:1[0-2]|[1-9])月/u.test(question)) return "month";
  if (/上一年|去年|不同|相比|比较|对比|对照.*年|年.*对照|为什么.*年/u.test(question)) return "year_comparison";
  if (/事业|职业|工作|求职|晋升|退休/u.test(question)) return "career";
  if (/财|收入|钱|收益|工资|破财|发财/u.test(question)) return "wealth";
  if (/感情|婚姻|恋爱|关系|相处|结婚|离婚/u.test(question)) return "relationship";
  if (/摘要|总结|总体|格局|喜用|结论/u.test(question)) return "summary";
  return null;
}

export function readingExplanationSearchQuery(question: string, branchId?: string): ReadingExplanationQuery {
  const years = [...question.matchAll(/(?:19|20|21)\d{2}/gu)].map(match => Number(match[0]));
  return { question, branchId, year: years[0], comparisonYear: years[1] ?? (route(question) === "year_comparison" && years[0] ? years[0] - 1 : undefined) };
}

export function readingDirectionLabel(direction: string | null): string {
  switch (direction) {
    case "favorable": return "支持较多";
    case "pressured": return "阻力较多";
    case "mixed": return "支持和阻力并存";
    case "neutral": return "暂无明确倾向";
    case "unknown": return "信息不足，尚不能判断";
    case null: return "未单列倾向";
    default: return "此项倾向未能识别，请查看原结论";
  }
}

export function queryReadingExplanation(index: ReadingExplanationIndex, query: ReadingExplanationQuery): ReadingExplanationAnswer {
  const topic = query.topic ?? route(query.question ?? "") ?? "summary";
  const answer = (status: ReadingExplanationAnswer["status"], summary: string, conclusions: ReadingConclusion[], scopeNotes: string[] = []): ReadingExplanationAnswer => ({
    status, topic, summary, conclusions, sourceSubjects: unique(conclusions.flatMap(item => item.sourceSubjects)), scopeNotes });
  if (!query.topic && query.question && !route(query.question)) return answer("unavailable", "没有找到对应的报告专题。这里只查找已有报告，不是通用聊天；可查看事业、收入、感情、年份对照、关键月份或出生时间。", []);
  const detectedYears = [...(query.question ?? "").matchAll(/(?:19|20|21)\d{2}/gu)].map(match => Number(match[0]));
  const year = query.year ?? detectedYears[0];
  const branchIds = unique(index.conclusions.filter(item => item.scope.level === "year").map(item => item.scope.branchId ?? ""));
  const inBranch = (item: ReadingConclusion) => !query.branchId || item.scope.branchId === query.branchId;
  const contextualNote = query.question && /一定|肯定|注定|保证|必然/u.test(query.question)
    ? ["问题中的确定说法没有被当作计算事实；以下仍按本报告的原判断和限制回答。"] : [];
  if (topic === "uncertainty") {
    const affected = index.uncertainty.pillarStatus === "changed_at_tested_offsets" ? index.conclusions.filter(item => item.scope.level === "natal") : [];
    return answer("answered", index.uncertainty.note, affected, ["输入可信度、四柱投影变化和整篇解释稳定性是三个不同问题。", "整篇解释稳定性：未评估。", ...contextualNote]);
  }
  if (topic === "report_comparison") {
    const old = query.previousIndex;
    if (!old) return answer("needs_selection", "请选择一份已保存报告作对照；没有依据索引的旧报告只保留原文，不用新版内容倒填。", []);
    if (old.sourceSnapshot.caseId !== index.sourceSnapshot.caseId) return answer("unavailable", "只能对照同一案例的报告，不能把另一人的命盘作为旧版。", []);
    const changes: NonNullable<ReadingExplanationAnswer["changes"]> = [];
    const compare = (category: NonNullable<ReadingExplanationAnswer["changes"]>[number]["category"], label: string, a: unknown, b: unknown, detail: string) => { if (!same(a, b)) changes.push({ category, label, detail }); };
    compare("input", "出生输入改变", old.sourceSnapshot.input, index.sourceSnapshot.input, "本次输入与旧报告不同，请对照两份保存资料，不能只归因于文案更新。");
    compare("rules", "规则口径改变", old.sourceSnapshot.ruleProfileDigest, index.sourceSnapshot.ruleProfileDigest, "两份结果采用的规则配置不同，分别保留各自结论，不平均为一个分数。");
    compare("engine", "计算或时区版本改变", old.sourceSnapshot.engineVersions, index.sourceSnapshot.engineVersions, "计算基础版本有变化；版本不同本身不证明哪个判断更正确。");
    compare("context", "已知生活背景改变", old.sourceSnapshot.context, index.sourceSnapshot.context, "当时记录的工作、关系等背景不同，后来的资料不会改写原报告。");
    compare("wording", "解释版本改变", old.sourceSnapshot.sourceVersions, index.sourceSnapshot.sourceVersions, "规则或表达层版本已更新，下面逐条保留旧原文和当前原文。");
    const logical = (item: ReadingConclusion) => item.stableId.slice(item.stableId.indexOf("/") + 1);
    const oldByKey = new Map(old.conclusions.map(item => [logical(item), item]));
    const changed = index.conclusions.filter(item => oldByKey.get(logical(item))?.text !== item.text);
    if (old.conclusions.length !== index.conclusions.length) changes.push({ category: "coverage", label: "报告覆盖范围改变", detail: "年份、月份或条目数量不同；缺失条目不能解释为结论反转。" });
    const result = answer("answered", changed.length ? `有 ${changed.length} 条当前结论与旧报告不同或为新增条目。` : "对应条目的原文没有变化。", changed,
      ["输入、规则、计算版本、背景与文案差异分别列出；若多项同时变化，不能断言由某一项单独导致。", ...contextualNote]);
    result.changes = changes;
    return result;
  }
  if (topic === "month") {
    if (!query.monthId && !year) return answer("needs_selection", "请选择年份和关键月份，再看该月对应领域的原判断与依据。", []);
    if (branchIds.length > 1 && !query.branchId) return answer("needs_selection", "这份报告有两套结果，请在“先分别查看”中选择一套来阅读月份；选择仅用于查看，不代表确认哪套正确。", []);
    const selected = index.conclusions.filter(item => item.scope.level === "month" && inBranch(item)
      && (!year || item.scope.year === year) && (!query.monthId || item.stableId === query.monthId || item.stableId.includes(`:${query.monthId}:`)));
    const monthHint = query.question && /(?:^|[^0-9])(?:1[0-2]|[1-9])月/u.test(query.question) && !query.monthId
      ? "报告按节令月分段，起止日不等于公历整月；请根据日期范围选择对应月份。" : "以下仅引用所选月份的原判断。";
    return answer(selected.length ? "answered" : "unavailable", selected.length ? monthHint : "该月份尚未计算或不在本报告范围内。", selected, contextualNote);
  }
  if (topic === "year_comparison") {
    const previousYear = query.comparisonYear ?? detectedYears[1] ?? (!query.topic && year ? year - 1 : undefined);
    if (!year || !previousYear || year === previousYear) return answer("needs_selection", "请选择两个不同年份作对照。", []);
    if (branchIds.length > 1 && !query.branchId) return answer("needs_selection", "请在“先分别查看”中选择一套结果，再比较这套结果中的两个年份。", []);
    const left = index.conclusions.filter(item => item.scope.level === "year" && item.scope.year === previousYear && inBranch(item));
    const right = index.conclusions.filter(item => item.scope.level === "year" && item.scope.year === year && inBranch(item));
    if (!left.length || !right.length) return answer("unavailable", "至少一个年份不在已计算范围内，不能用邻年代替。", []);
    const directions = unique([...left, ...right].map(item => `${item.label}：${readingDirectionLabel(item.direction)}`));
    return answer("answered", `${previousYear} 与 ${year} 年分别比较事业、收入和关系；交运分段保留各自范围。${directions.join("；")}`, [...left, ...right], contextualNote);
  }
  if (topic === "summary") return answer("answered", "先看格局、喜用和三个生活领域的重点，完整原文与限制可逐项展开。",
    index.conclusions.filter(item => item.scope.level === "natal"), contextualNote);
  if (year && branchIds.length > 1 && !query.branchId) return answer("needs_selection", "这份报告有两套结果，请在“先分别查看”中选择一套来阅读这一年；选择仅用于查看，不代表确认哪套正确。", []);
  const selected = index.conclusions.filter(item => item.domain === topic && (year ? item.scope.level === "year" && item.scope.year === year && inBranch(item) : item.scope.level === "natal"));
  return answer(selected.length ? "answered" : "unavailable", selected.length ? "以下来自这份报告的同一领域，不借其他领域的有利作用作结论。" : "当前范围没有这一领域的已计算结论。", selected, contextualNote);
}
