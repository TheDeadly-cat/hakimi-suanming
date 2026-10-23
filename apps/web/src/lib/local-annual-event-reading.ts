import { storedRevisionRecordSchema, transitNodeRefSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { NATAL_WEALTH_RESOURCE_TASK_VERSION } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { LOCAL_ANNUAL_OUTLOOK_VERSION, type LocalAnnualYear } from "./local-annual-outlook";
import { buildAnnualDomainReading, type AnnualDomainBranchId, type AnnualDomainGap, type AnnualReadingDomainId, type LocalAnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import { READING_CONTEXT_FORMAT, readingContextDraftSchema, type ReadingContextReference } from "./local-reading-context";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext, type LocalReadingAgeStage } from "./local-reading-age-context";
import { buildContextualAnnualReadings, CONTEXTUAL_READING_VERSION, type ContextualDomainReading } from "./local-contextual-reading";
import { OUTLOOK_STEM_ACTIONS_VERSION } from "./local-outlook-judgment";
import { buildAnnualEventReadingProse, ANNUAL_EVENT_READING_PROSE_VERSION, type AnnualEventReadingProseKind } from "./annual-event-reading-prose";
import { ADULT_LIFE_SITUATIONS_VERSION } from "./adult-life-situations";
import { ANNUAL_RELATIONSHIP_SIGNALS_VERSION } from "./annual-relationship-signals";
import { createAnnualEventSignalBuilder, ANNUAL_EVENT_SIGNALS_VERSION } from "./annual-event-signals";
import { ANNUAL_RELATIONSHIP_TIMING_VERSION, type AnnualRelationshipTiming } from "./annual-relationship-timing";
import { ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION, createAnnualRelationshipNatalContextBuilder } from "./annual-relationship-natal-context";

export const ANNUAL_EVENT_READING_VERSION = "hakimi.local-annual-event-reading/0.7.0" as const;
export interface AnnualEventItem {
  id: string; domain: AnnualReadingDomainId | "change"; priority: "primary" | "secondary";
  title: string; summary: string; why: string[]; examples: string[];
  applicability: string[]; notApplicableWhen: string[]; conditions: string[]; evidence: string[]; sourceIds: string[];
  origin: { ruleId: string; sourceDomainId: AnnualReadingDomainId; relationFactIds: string[]; judgmentAxisIds: string[]; contextSubjectId: string | null };
  relationshipTiming?: AnnualRelationshipTiming;
}
export interface AnnualEventSegment {
  id: string; branchId: AnnualDomainBranchId; startInstant: string; endExclusiveInstant: string; personalStartInstant: string;
  backgroundRefs: TransitNodeRef[]; backgroundLabels: string[]; judgmentVersion: string; policyVersion: string; judgmentCaption: string;
  ageStage: LocalReadingAgeStage; ageLabel: string; age: LocalReadingAgeContext; items: AnnualEventItem[]; conditions: string[];
}
export interface AnnualEventBranch {
  id: AnnualDomainBranchId; label: string; segments: AnnualEventSegment[]; gaps: AnnualDomainGap[]; conditions: string[];
}
export interface LocalAnnualEventReading {
  version: typeof ANNUAL_EVENT_READING_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; year: number; yearGanZhi: string | null; yearNodeRef: TransitNodeRef | null;
  startInstant: string | null; endExclusiveInstant: string | null;
  status: LocalAnnualDomainReading["status"]; headline: string; summary: string;
  contextRef: ReadingContextReference | null; branches: AnnualEventBranch[]; limitations: string[];
}
export interface BuildAnnualEventReadingInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; year: LocalAnnualYear;
  domains: LocalAnnualDomainReading; contextual?: LocalContextualReadingBundle | null;
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (left: unknown, right: unknown) => stable(left) === stable(right);
const fail = (message: string): never => { throw new Error(`年度应事情境：${message}`); };
const RELATIONS: Partial<Record<RelationFact["relationType"], string>> = { stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲" };
type Interaction = { position: "year" | "month" | "day"; fact: RelationFact; text: string };
const positions = { year: "年柱", month: "月柱", day: "日柱" };

function interactions(ganZhi: string, revision: RevisionRecord): Interaction[] {
  return (["year", "month", "day"] as const).flatMap((position) => {
    const natal = revision.facts.pillars[position].ganZhi;
    // Only the exact two supplied pillars enter the retained binary facts.
    // Placeholder positions cannot contribute an hour or a multi-pillar rule.
    return calculatePillarRelations({ year: ganZhi, month: natal, day: ganZhi, hour: natal }).facts
      .filter((fact) => fact.completeness === "binary" && fact.participants.length === 2 && RELATIONS[fact.relationType]
        && fact.participants.some((part) => part.position === "year") && fact.participants.some((part) => part.position === "month"))
      .map((fact) => ({ position, fact, text: `流年${ganZhi}与本命${positions[position]}${natal}有${RELATIONS[fact.relationType]}（${fact.participants.map((part) => part.value).join("—")}）。` }));
  });
}
function validateContext(input: BuildAnnualEventReadingInput, domains: LocalAnnualDomainReading): ContextualDomainReading[] {
  const bundle = input.contextual;
  if (!bundle) return [];
  const { revision, assessment } = input, { document, reference, createdAt } = bundle.contextSource;
  const binding = { caseId: revision.caseId, ...domains.sourceBinding };
  if (bundle.version !== CONTEXTUAL_READING_VERSION || document.format !== READING_CONTEXT_FORMAT
    || !same(bundle.sourceBinding, binding) || !same(document.sourceBinding, binding)
    || !/^[a-f0-9-]{36}$/u.test(reference.noteId) || !Number.isInteger(reference.editVersion) || reference.editVersion < 1
    || !/^[a-f0-9]{64}$/u.test(reference.bodySha256) || !Number.isFinite(Date.parse(createdAt))) fail("背景记录与当前修订或引用不一致。");
  const context = readingContextDraftSchema.parse(document.context);
  const expected = buildContextualAnnualReadings({ revision, assessment, reading: domains, context });
  const supplied = bundle.readings.filter((reading) => reading.scope.kind === "annual" && reading.scope.year === input.year.year);
  if (!same(supplied, expected)) fail("背景适配正文与本年原分段、年龄或适用范围不一致。");
  return expected;
}

function validateNodes(year: LocalAnnualYear) {
  if (!year.transitNodeRef) return;
  const ref = transitNodeRefSchema.parse(year.transitNodeRef);
  if (ref.startInstant !== year.startInstant) fail("年度节点与起点不一致。");
  for (const background of year.dayunSegments) {
    const item = transitNodeRefSchema.parse(background.nodeRef);
    if (item.nodeType !== "dayun" || item.startInstant !== background.sourceStartInstant
      || item.revisionId !== ref.revisionId || item.chartResultHash !== ref.chartResultHash
      || item.timelineVersion !== ref.timelineVersion || item.ruleProfileDigest !== ref.ruleProfileDigest
      || item.luckCycleRuleDigest !== ref.luckCycleRuleDigest
      || item.manualDirection !== (background.direction === "locked" ? null : background.direction)
      || Date.parse(background.startInstant) !== Math.max(Date.parse(year.startInstant!), Date.parse(background.sourceStartInstant))
      || Date.parse(background.endExclusiveInstant) !== Math.min(Date.parse(year.endExclusiveInstant!), Date.parse(background.sourceEndExclusiveInstant))) fail("大运背景节点、顺逆或精确区间不一致。");
  }
}

function eventKind(god: string): AnnualEventReadingProseKind {
  if (god === "正印" || god === "偏印") return "study";
  if (god === "伤官") return "proposal";
  if (god === "食神") return "delivery";
  if (god === "正财") return "settlement";
  if (god === "偏财") return "new_collaboration";
  return "work_change";
}

/** A pure reading-order projection, not a new event prediction or outlook score.
 * Rebuild the supplied domain prose from the same assessment and original
 * judgments, then consume each original branch/segment independently. */
export function buildAnnualEventReading(input: BuildAnnualEventReadingInput): LocalAnnualEventReading {
  const revision = storedRevisionRecordSchema.parse(structuredClone(input.revision));
  const assessment = buildBaziPreliminaryAssessment(revision);
  if (!same(assessment, input.assessment)) fail("初判与本次源修订重建结果不一致。");
  const year = structuredClone(input.year);
  validateNodes(year);
  const domains = buildAnnualDomainReading({ revision, assessment, year });
  if (!same(domains, input.domains)) fail("领域全文、分支、年龄或节点与本年原判断不一致。");
  const contextual = validateContext({ ...input, revision, assessment, year }, domains);
  const contextRef = input.contextual ? structuredClone(input.contextual.contextSource.reference) : null;
  const sourceVersions = unique([ANNUAL_EVENT_READING_VERSION, ANNUAL_EVENT_READING_PROSE_VERSION, NATAL_WEALTH_RESOURCE_TASK_VERSION, ADULT_LIFE_SITUATIONS_VERSION, ANNUAL_RELATIONSHIP_SIGNALS_VERSION, ANNUAL_EVENT_SIGNALS_VERSION, ANNUAL_RELATIONSHIP_TIMING_VERSION, ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION, OUTLOOK_STEM_ACTIONS_VERSION, domains.version,
    assessment.version, LOCAL_ANNUAL_OUTLOOK_VERSION, ...domains.sourceVersions,
    ...(input.contextual ? [input.contextual.version, READING_CONTEXT_FORMAT, `context-record/${contextRef!.noteId}/${contextRef!.editVersion}/${contextRef!.bodySha256}`] : [])]);
  if (sourceVersions.length > 20) fail("来源版本过多，无法完整绑定个人反馈。");
  const limitations = [
    "优先对照与同时留意仅是叙述顺序：按已计算的具体作用对象和本命位置组织，不表示事件概率、好坏分数或已经发生。",
    "情境是传统命理依据的现代生活解释，不保证收入、职业变动或关系结果；没有据此提供投资、医疗建议。",
    "各顺逆分支和交运段独立保留；换运只改变原判断背景，本身不证明跳槽、搬迁或转好。",
    "现实背景仅在填写的年份与对应年龄范围适用；补充笔记原文不参与推断，未填写不默认就业或婚姻状态。"
  ];
  const base = { version: ANNUAL_EVENT_READING_VERSION, sourceBinding: { caseId: revision.caseId, ...domains.sourceBinding }, sourceVersions,
    year: year.year, yearGanZhi: domains.yearGanZhi, yearNodeRef: structuredClone(domains.yearNodeRef),
    startInstant: domains.startInstant, endExclusiveInstant: domains.endExclusiveInstant, status: domains.status, contextRef, limitations };
  if (domains.status === "before_birth" || domains.status === "unavailable") return { ...base, headline: domains.headline, summary: domains.summary, branches: [] };
  const signalsFor = createAnnualEventSignalBuilder(revision, assessment);
  const relationshipContextFor = createAnnualRelationshipNatalContextBuilder(revision, assessment);
  const relationshipSourceVersions = new Set<string>();
  const ganZhi = year.yearGanZhi!, stem = ganZhi[0]!;
  const godFor = (value: string) => canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[revision.facts.pillars.day.stem + value]!);
  const god = godFor(stem), facts = interactions(ganZhi, revision);
  const has = (position: Interaction["position"], type: RelationFact["relationType"]) => facts.some((item) => item.position === position && item.fact.relationType === type);
  const relationFlags = { hasMonthBranchClash: has("month", "branch_six_clash"), hasMonthBranchCombination: has("month", "branch_six_combination"),
    hasDayBranchClash: has("day", "branch_six_clash"), hasDayBranchCombination: has("day", "branch_six_combination"),
    hasDayStemInteraction: has("day", "stem_five_combination") || has("day", "stem_clash") };
  const branches = domains.branches.map((branch): AnnualEventBranch => ({ id: branch.id, label: branch.label,
    gaps: structuredClone(branch.gaps), conditions: [...branch.conditions], segments: branch.segments.map((segment): AnnualEventSegment => {
      const original = year.judgmentSegments.find((item) => item.id === segment.id && item.branchId === branch.id);
      if (!original) return fail("领域分段没有对应原判断。");
      const judgment = original.judgment, pattern = judgment.axes.find((axis) => axis.axis === "pattern")!;
      const { relationshipSignals, relationshipTiming, patternContext, targetAction, mainQiAction } = signalsFor(year, original);
      const age = buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant);
      const visibleAction = { effect: targetAction.effect, evidence: unique([...targetAction.evidence, ...targetAction.blockers, ...targetAction.satisfiedConditions, ...(targetAction.summaryBasis ? [pattern.summary] : [])]) };
      const mainAction = { effect: mainQiAction.effect, evidence: unique([...mainQiAction.evidence, ...mainQiAction.blockers, ...mainQiAction.satisfiedConditions]) };
      const backgroundLabels = segment.backgroundRefs.map((ref) => {
        const actual = year.dayunSegments.find((item) => item.direction === branch.id && same(item.nodeRef, ref));
        return actual ? `${actual.ganZhi}大运` : fail("大运名称缺少同分支的完整节点依据。");
      });
      const entries: { domain: AnnualReadingDomainId; kind: AnnualEventReadingProseKind }[] = [{ domain: "career", kind: eventKind(god) }, { domain: "wealth", kind: eventKind(god) }];
      if (relationshipTiming.triggered) entries.push({ domain: "relationship", kind: "shared_arrangements" });
      // A fixed specificity ordering, never a count or numerical good/bad score.
      const primaryDomain: AnnualReadingDomainId = relationFlags.hasMonthBranchClash || relationFlags.hasMonthBranchCombination ? "career"
        : ((god === "比肩" || god === "劫财") && visibleAction.effect !== "neutral" && visibleAction.effect !== "unresolved") ? "wealth"
        : relationFlags.hasDayBranchClash || relationFlags.hasDayBranchCombination ? "relationship" : god === "正财" || god === "偏财" ? "wealth" : "career";
      entries.sort((left, right) => Number(right.domain === primaryDomain) - Number(left.domain === primaryDomain));
      const items = entries.map(({ domain, kind }): AnnualEventItem => {
        const source = segment.domains.find((item) => item.id === domain)!;
        const context = contextual.find((item) => item.scope.kind === "annual" && item.scope.year === year.year
          && item.scope.branchId === branch.id && item.scope.segmentId === segment.id && item.scope.domainId === domain);
        const contextDraft = context ? input.contextual!.contextSource.document.context : null;
        const pertinent = facts.filter((item) => domain === "relationship" ? item.position === "day" && item.fact.participants.every((part) => part.component === "branch")
          : domain === "career" ? item.position === "month" || (item.position === "day" && item.fact.participants.every((part) => part.component === "stem")) : false);
        const relationshipBackground = domain === "relationship" ? relationshipSignals.filter((signal) => signal.source === "dayun") : [];
        const timingSignals = domain === "relationship" ? relationshipTiming.lenses.flatMap((lens) => lens.signals) : [];
        const backgroundText = relationshipBackground.map((signal) => `同段大运${signal.ganZhi}与本命日柱${signal.natalGanZhi}有${RELATIONS[signal.relationType]}；这是既有大运背景，未当作流年新增。`);
        const why = [domain === "relationship" ? relationFlags.hasDayBranchClash || relationFlags.hasDayBranchCombination ? source.summary : "本年另有具体关系角色或原星干作用，作为关系安排的候选观察入口。" : `流年${ganZhi}透${stem}${god}，对应${source.headline}。`,
          ...pertinent.map((item) => item.text),
          ...backgroundText,
          ...timingSignals.map((signal) => signal.text),
          ...(domain !== "relationship" ? [...visibleAction.evidence, ...mainAction.evidence] : []),
          ...(domain !== "relationship" && pattern.rescues.length ? ["本段另有针对同一作用的救应候选，成立条件仍按本段原文保留。"] : [])];
        const relationshipNatalContext = domain === "relationship" ? relationshipContextFor(relationshipTiming) : undefined;
        relationshipNatalContext?.sourceVersions.forEach((version) => relationshipSourceVersions.add(version));
        const { reasoning, ...prose } = buildAnnualEventReadingProse({ kind, domain, god, path: pattern.pathId, effect: domain === "relationship" ? "neutral" : visibleAction.effect,
          patternEffect: pattern.effect, age, ...relationFlags, appliedWork: domain !== "relationship" && contextDraft ? contextDraft.work : null,
          appliedRelationship: domain === "relationship" && contextDraft ? contextDraft.relationship : null,
          ...(domain === "relationship" ? { relationshipSignals, relationshipTiming, relationshipNatalContext } : { patternContext, targetAction, mainQiAction }) });
        return { id: `${domain}-${kind.replaceAll("_", "-")}`, domain, priority: domain === primaryDomain ? "primary" : "secondary", ...prose, why: unique([...why, ...(reasoning ?? [])]),
          conditions: unique([...source.conditions, ...pattern.unresolvedConditions,
            ...(domain === "relationship" ? ["本年明透角色、原星干作用与日宫线索分别阅读；大运背景不是每年新事件，不把事业或资源方向转作关系吉凶。"] : pattern.rescues),
            ...(context ? [`适用背景来源：${context.contextLabel}；仅用于${year.year}年本分段。`] : ["本项未采用具体职业或关系身份，按实际已有事务对照。"])]),
          evidence: unique([`应事情境规则 ${ANNUAL_EVENT_READING_VERSION}；文字规则 ${ANNUAL_EVENT_READING_PROSE_VERSION}。`,
            `分段 ${segment.id}；${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）。`,
            `排序依据：${primaryDomain === "career" && (relationFlags.hasMonthBranchClash || relationFlags.hasMonthBranchCombination) ? "本年直接触及月支的外部安排" : primaryDomain === "relationship" ? "本年直接触及日支的共同安排" : primaryDomain === "wealth" ? "本年财务主题或同辈作用有具体资源对象" : "本年透干对应的具体任务"}优先对照，不计算发生概率。`,
            ...source.evidence, ...pertinent.map((item) => `${item.text} 关系 ${item.fact.id}；规则 ${item.fact.ruleId}。`),
            ...(domain === "relationship" ? [`关系分层规则 ${ANNUAL_RELATIONSHIP_SIGNALS_VERSION}。`, ...relationshipSignals.map((signal) => `关系分层 ${JSON.stringify(signal)}`)] : []), ...(context?.basis ?? [])]),
          sourceIds: domain === "relationship" ? unique([...source.sourceIds, ...relationshipTiming.sourceIds, ...(relationshipNatalContext?.sourceIds ?? [])]) : [...source.sourceIds],
          ...(domain === "relationship" ? { relationshipTiming } : {}), origin: { ruleId: `annual-event/${domain}/${kind}`, sourceDomainId: domain,
            relationFactIds: domain === "relationship" ? unique([...pertinent.map((item) => `${item.position}:${item.fact.id}`), ...relationshipBackground.map((signal) => `dayun:${signal.nodeRef.nodeId}:day:${signal.factId}`),
              ...timingSignals.filter((signal) => signal.kind === "star_stem_contact").map((signal) => `${signal.source}:${signal.nodeRef.nodeId}:${signal.natalPositions.join(",")}:${signal.factId}`)]) : pertinent.map((item) => `${item.position}:${item.fact.id}`), judgmentAxisIds: domain === "relationship" ? [] : [pattern.id], contextSubjectId: context?.subjectId ?? null } };
      });
      return { id: segment.id, branchId: branch.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
        personalStartInstant: age.personalStartInstant, backgroundRefs: structuredClone(segment.backgroundRefs), backgroundLabels,
        judgmentVersion: segment.judgmentVersion, policyVersion: segment.policyVersion, judgmentCaption: segment.judgmentCaption,
        ageStage: age.stage, ageLabel: age.label, age, items, conditions: unique([...judgment.conditions, ...age.conditions]) };
    }) }));
  const summary = branches.length > 1 ? "顺逆未定，各分支分别列出优先对照的事项；同一年交运前后保留各段实际条件。"
    : branches[0]?.segments.length === 1 ? branches[0].segments[0]!.items.map((item) => item.title).join("；") + "。"
    : "本年按实际交运前后的时段分别对照，优先事项与助阻条件保留在各段。";
  const completeVersions = unique([...sourceVersions, ...relationshipSourceVersions]);
  if (completeVersions.length > 20) fail("来源版本过多，无法完整绑定个人反馈。");
  return { ...base, sourceVersions: completeVersions, headline: `${year.year}年可优先对照的具体事项`, summary, branches };
}
