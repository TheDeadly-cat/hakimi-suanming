/** Frozen compatibility-only source. Original SHA-256: fe74079c2ab91e2ad84a1b56b4b10de92092e53ec18b2971de6d524e1f3b2aa7.
 * Replays historical choices only; never a current automatic reading. */
import { storedRevisionRecordSchema, transitNodeRefSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import { BAZI_PRELIMINARY_ASSESSMENT_VERSION, type BaziPreliminaryAssessment } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { AnnualDomainBranchId, AnnualDomainGap, AnnualDomainSegment } from "./local-annual-domain-reading";
import { LOCAL_DETAILED_OUTLOOK_VERSION, LOCAL_DETAILED_QUERY_RANGE, type LocalMonthlyOutlook, type LocalMonthlyPeriod, type LocalMonthlyBranch } from "./local-detailed-outlook";
import { buildLocalReadingAgeContext } from "../local-reading-age-context";
import { createPatternActionVerifier, LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION, OUTLOOK_STEM_ACTIONS_VERSION, type LocalOutlookJudgment } from "./local-outlook-judgment";
import { outlookDirectionCaption } from "../outlook-judgment-presentation";
import { buildMonthlyDomainProse, MONTHLY_DOMAIN_PROSE_VERSION } from "./monthly-domain-prose";
import type { LocalContextualReadingBundle } from "../local-contextual-reading-record";
import { CONTEXTUAL_READING_VERSION } from "../local-contextual-reading";
import { READING_CONTEXT_FORMAT, readingContextDraftSchema, type ReadingContextReference } from "../local-reading-context";
import { ADULT_LIFE_SITUATIONS_VERSION } from "../adult-life-situations";

export const MONTHLY_DOMAIN_READING_VERSION = "hakimi.local-monthly-domain-reading/0.3.0" as const;
export interface MonthlyDomainSegment extends AnnualDomainSegment {
  backgroundLabels: string[];
  conditions: string[];
}
export interface MonthlyDomainBranch {
  id: AnnualDomainBranchId; label: string; segments: MonthlyDomainSegment[];
  gaps: AnnualDomainGap[]; conditions: string[];
}
export interface LocalMonthlyDomainReading {
  monthId: string; label: string; ganZhi: string; nodeRef: TransitNodeRef;
  startInstant: string; endExclusiveInstant: string; status: "ready" | "before_birth" | "unavailable";
  headline: string; summary: string; branches: MonthlyDomainBranch[];
}
export interface LocalMonthlyDomainReadings {
  version: string;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
  contextRef: ReadingContextReference | null;
  sourceVersions: string[]; year: number; yearGanZhi: string | null; yearNodeRef: TransitNodeRef | null;
  startInstant: string | null; endExclusiveInstant: string | null;
  status: "ready" | "unavailable"; months: LocalMonthlyDomainReading[]; limitations: string[];
}
export interface MonthlyDomainReadingInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; monthly: LocalMonthlyOutlook;
  contextual?: LocalContextualReadingBundle | null;
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const fail = (message: string): never => { throw new Error(`流月领域解读：${message}`); };
function checkedContext(input: MonthlyDomainReadingInput) {
  if (input.contextual == null) return null;
  try {
    const bundle = input.contextual, { document, reference, createdAt } = bundle.contextSource;
    const binding = { caseId: input.revision.caseId, revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash,
      includeHour: input.revision.input.timePrecision !== "unknown_hour" && input.revision.input.timePrecision !== "date_only" };
    if (bundle.version !== CONTEXTUAL_READING_VERSION || document.format !== READING_CONTEXT_FORMAT
      || !same(bundle.sourceBinding, binding) || !same(document.sourceBinding, binding)
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(reference.noteId)
      || !Number.isSafeInteger(reference.editVersion) || reference.editVersion < 1 || !/^[a-f0-9]{64}$/u.test(reference.bodySha256)
      || !Number.isFinite(Date.parse(createdAt))) return fail("阅读背景与当前命盘、时柱范围、版本或原记录引用不一致。");
    return { context: readingContextDraftSchema.parse(document.context), reference: structuredClone(reference),
      sourceVersions: [bundle.version, READING_CONTEXT_FORMAT, `context-record/${reference.noteId}/${reference.editVersion}/${reference.bodySha256}`] };
  } catch { return fail("阅读背景与当前命盘、时柱范围、版本或原记录引用不一致。"); }
}
const instant = (value: string) => {
  const result = Date.parse(value);
  if (!Number.isFinite(result)) fail("瞬时点无效。");
  return result;
};
const iso = (value: number) => new Date(value).toISOString();
const refUnion = (judgments: readonly LocalOutlookJudgment[]) => [...new Map(judgments.flatMap((judgment) => judgment.backgroundRefs).map((ref) => [ref.nodeId, ref])).values()];
const sameRefs = (a: readonly TransitNodeRef[], b: readonly TransitNodeRef[]) => same(a.map(stable).sort(), b.map(stable).sort());
const limitations = [
  "三个领域是原流月判断的现代情境解释，不新增领域吉凶分数、事件概率或预测准确率。",
  "节令月采用原节点半开区间；流年和大运只作为各分段实际覆盖的背景，不将整年或十年的主题当成本月已发生的事情。",
  "顺逆未定时分别阅读两个条件分支；月中交运前后保留各自判断，不把一段救应推广到另一段。",
  "出生前不作个人解读；出生月从出生瞬时开始。未起运部分保留流年背景，不补造大运。"
];

/** Pure projection of a complete upstream Jie-year. Validation precedes prose:
 * no calendar, luck direction, judgment or missing interval is recalculated. */
export function buildMonthlyDomainReadings(input: MonthlyDomainReadingInput): LocalMonthlyDomainReadings {
  const revision = storedRevisionRecordSchema.parse(structuredClone(input.revision));
  const assessment = structuredClone(input.assessment), monthly = structuredClone(input.monthly);
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  const sourceBinding = { revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour };
  if (assessment.sourceBinding.revisionId !== sourceBinding.revisionId || assessment.sourceBinding.chartResultHash !== sourceBinding.chartResultHash
    || assessment.sourceBinding.includeHour !== includeHour || monthly.revisionId !== sourceBinding.revisionId || monthly.chartResultHash !== sourceBinding.chartResultHash) fail("初判、流月与源修订或时柱范围不匹配。");
  if (assessment.version !== BAZI_PRELIMINARY_ASSESSMENT_VERSION || monthly.version !== LOCAL_DETAILED_OUTLOOK_VERSION) fail("来源版本不受支持。");
  if (!Number.isInteger(monthly.year) || monthly.year < LOCAL_DETAILED_QUERY_RANGE.fromYear || monthly.year > LOCAL_DETAILED_QUERY_RANGE.monthlyToYear) fail("年度范围无效。");
  const context = checkedContext(input);
  const sourceVersions: string[] = [assessment.version, monthly.version, MONTHLY_DOMAIN_PROSE_VERSION, ADULT_LIFE_SITUATIONS_VERSION, OUTLOOK_STEM_ACTIONS_VERSION, ...(context?.sourceVersions ?? [])];
  const base = { version: MONTHLY_DOMAIN_READING_VERSION, sourceBinding, contextRef: context?.reference ?? null, year: monthly.year, yearGanZhi: monthly.yearGanZhi,
    yearNodeRef: monthly.yearNodeRef, startInstant: monthly.startInstant, endExclusiveInstant: monthly.endExclusiveInstant };
  if (monthly.status === "unavailable") {
    if (monthly.months.length || monthly.yearNodeRef || monthly.yearGanZhi || monthly.startInstant || monthly.endExclusiveInstant) fail("不可用年度不能夹带月份或部分年度节点。");
    return { ...base, sourceVersions, status: "unavailable", months: [], limitations: unique([...limitations, ...monthly.limitations]) };
  }
  if (!monthly.yearNodeRef || !monthly.yearGanZhi || !monthly.startInstant || !monthly.endExclusiveInstant) fail("年度节点、干支和边界必须完整。");
  const yearRef = monthly.yearNodeRef!, yearStart = instant(monthly.startInstant!), yearEnd = instant(monthly.endExclusiveInstant!);
  const yearGanZhi = LunarUtil.JIA_ZI[((monthly.year - 1984) % 60 + 60) % 60];
  const startWall = new Date(yearStart + 8 * 3600_000), endWall = new Date(yearEnd + 8 * 3600_000);
  if (monthly.yearGanZhi !== yearGanZhi || yearStart >= yearEnd || startWall.getUTCFullYear() !== monthly.year || endWall.getUTCFullYear() !== monthly.year + 1
    || startWall.getUTCMonth() !== 1 || endWall.getUTCMonth() !== 1) fail("年份、干支与立春年边界不一致。");
  const expectedBranches: AnnualDomainBranchId[] = revision.input.sex === "unspecified" ? ["forward", "backward"] : ["locked"];
  const birth = revision.timeCalibration.utcInstant ? instant(revision.timeCalibration.utcInstant) : null;
  const assertRef = (ref: TransitNodeRef, type: TransitNodeRef["nodeType"], manual: TransitNodeRef["manualDirection"]) => {
    transitNodeRefSchema.parse(ref);
    if (ref.revisionId !== sourceBinding.revisionId || ref.chartResultHash !== sourceBinding.chartResultHash || ref.nodeType !== type || ref.manualDirection !== manual
      || ref.ruleProfileDigest !== yearRef.ruleProfileDigest || ref.luckCycleRuleDigest !== yearRef.luckCycleRuleDigest
      || ref.timelineVersion !== yearRef.timelineVersion || ref.algorithmId !== yearRef.algorithmId) fail("节点来源、类型、顺逆或规则身份不一致。");
  };
  assertRef(yearRef, "year", null);
  if (yearRef.startInstant !== monthly.startInstant) fail("年度节点起点与年度边界不一致。");
  const assertJudgment = (judgment: LocalOutlookJudgment, month: LocalMonthlyPeriod, start: string, end: string) => {
    if (judgment.version !== LOCAL_OUTLOOK_JUDGMENT_VERSION || judgment.policyVersion !== LOCAL_OUTLOOK_POLICY_VERSION) fail("判断版本或模型版本不受支持，不能混用。");
    if (!same(judgment.sourceBinding, sourceBinding) || !same(judgment.targetRef, month.nodeRef)
      || judgment.interval.startInstant !== start || judgment.interval.endExclusiveInstant !== end) fail("判断源盘、月份节点或精确区间不一致。");
    if (new Set(judgment.backgroundRefs.map((ref) => ref.nodeId)).size !== judgment.backgroundRefs.length) fail("判断背景节点重复。");
    sourceVersions.push(judgment.version, judgment.policyVersion);
  };
  const verifyPattern = createPatternActionVerifier(revision, assessment);
  const checkedBranches = new Map<string, MonthlyDomainBranch[]>();
  let cursor = yearStart;
  const monthIds = new Set<string>();
  if (monthly.months.length !== 12) fail("必须保留完整的十二个节令月。");
  for (const [index, month] of monthly.months.entries()) {
    const start = instant(month.startInstant), end = instant(month.endExclusiveInstant);
    assertRef(month.nodeRef, "month", null);
    const yearStem = "甲乙丙丁戊己庚辛壬癸".indexOf(monthly.yearGanZhi![0]!);
    const expectedGanZhi = "甲乙丙丁戊己庚辛壬癸"[((yearStem % 5) * 2 + 2 + index) % 10]! + "子丑寅卯辰巳午未申酉戌亥"[(index + 2) % 12]!;
    if (month.id !== month.nodeRef.nodeId || monthIds.has(month.id) || month.nodeRef.startInstant !== month.startInstant
      || start !== cursor || start >= end || end > yearEnd || month.ganZhi !== expectedGanZhi) fail("月份标识、干支、顺序或连续边界不一致。");
    monthIds.add(month.id); cursor = end;
    if (month.branches.length !== expectedBranches.length || new Set(month.branches.map((branch) => branch.id)).size !== month.branches.length
      || month.branches.some((branch) => !expectedBranches.includes(branch.id))) fail("月份顺逆分支重复、缺失或与修订不一致。");
    if (!same(month.judgmentSegments, month.branches.flatMap((branch) => branch.judgmentSegments))) fail("月份分段与分支中的原判断不一致。");
    const beforeBirth = birth !== null && end <= birth;
    const unavailable = !month.judgment && !month.ownJudgment && !month.judgmentSegments.length;
    if (beforeBirth && (!unavailable || month.branches.some((branch) => branch.judgment || branch.judgmentSegments.length || branch.segments.length))) fail("出生前月份不能带个人判断或大运分段。");
    if (!unavailable && (!month.judgment || !month.ownJudgment)) fail("月份个人判断不完整。");
    if (month.ownJudgment) {
      assertJudgment(month.ownJudgment, month, month.startInstant, month.endExclusiveInstant);
      if (month.ownJudgment.backgroundRefs.length) fail("月份自身判断不能夹带背景节点。");
    }
    if (month.judgment) {
      assertJudgment(month.judgment, month, month.startInstant, month.endExclusiveInstant);
      if (!sameRefs(month.judgment.backgroundRefs, refUnion(month.judgmentSegments.map((segment) => segment.judgment)))) fail("月份合看背景与原分段不一致。");
    }
    const seenSegments = new Set<string>();
    const branches = month.branches.map((branch): MonthlyDomainBranch => {
      const gaps: AnnualDomainGap[] = [];
      if (beforeBirth) return { id: branch.id, label: branch.label, segments: [], gaps: [{ startInstant: month.startInstant, endExclusiveInstant: month.endExclusiveInstant, message: "出生前历法区间，不作个人领域解读。" }], conditions: [...branch.conditions] };
      if (unavailable) {
        if (branch.judgment || branch.judgmentSegments.length || branch.segments.length) fail("不可用月份不能夹带个人或大运分段。");
        return { id: branch.id, label: branch.label, segments: [], gaps: [{ startInstant: month.startInstant, endExclusiveInstant: month.endExclusiveInstant, message: "本月没有可用的个人分段判断，未从相邻月份补入。" }], conditions: [...branch.conditions] };
      }
      if (!branch.judgment) fail("月份分支缺少合看判断。");
      assertJudgment(branch.judgment!, month, month.startInstant, month.endExclusiveInstant);
      if (!sameRefs(branch.judgment!.backgroundRefs, refUnion(branch.judgmentSegments.map((segment) => segment.judgment)))) fail("分支合看背景与原分段不一致。");
      let luckEnd = start;
      const luckIds = new Set<string>();
      for (const luck of branch.segments) {
        assertRef(luck.nodeRef, "dayun", branch.id === "locked" ? null : branch.id);
        const sourceStart = instant(luck.sourceStartInstant), sourceEnd = instant(luck.sourceEndExclusiveInstant);
        const from = instant(luck.startInstant), to = instant(luck.endExclusiveInstant);
        if (luckIds.has(luck.nodeRef.nodeId) || LunarUtil.getJiaZiIndex(luck.ganZhi) < 0 || luck.nodeRef.startInstant !== luck.sourceStartInstant
          || sourceStart >= sourceEnd || from !== Math.max(start, sourceStart) || to !== Math.min(end, sourceEnd) || from >= to || from < luckEnd) fail("大运背景重复、越界、逆序或非原节点的精确交集。");
        luckIds.add(luck.nodeRef.nodeId); luckEnd = to;
      }
      type ExpectedPiece = { start: string; end: string; luck: LocalMonthlyBranch["segments"][number] | null };
      const expected: ExpectedPiece[] = [];
      const add = (from: string, to: string, luck: ExpectedPiece["luck"]) => {
        const personalStart = Math.max(instant(from), birth ?? instant(from));
        if (personalStart < instant(to)) expected.push({ start: iso(personalStart), end: to, luck });
      };
      let next = month.startInstant;
      for (const luck of branch.segments) {
        if (instant(next) < instant(luck.startInstant)) add(next, luck.startInstant, null);
        add(luck.startInstant, luck.endExclusiveInstant, luck); next = luck.endExclusiveInstant;
      }
      if (instant(next) < end) add(next, month.endExclusiveInstant, null);
      if (branch.judgmentSegments.length !== expected.length) fail("个人分段数量与原大运交集及流年背景缺口不一致。");
      if (birth !== null && start < birth && birth < end) gaps.push({ startInstant: month.startInstant, endExclusiveInstant: iso(birth), message: "出生月的这一部分早于出生，个人内容从出生瞬时开始。" });
      const segments = branch.judgmentSegments.map((segment, partIndex): MonthlyDomainSegment => {
        const part = expected[partIndex]!, judgment = segment.judgment;
        const expectedId = `${branch.id}:${month.nodeRef.nodeId}:${part.luck?.nodeRef.nodeId ?? "year-only"}:${part.start}`;
        if (seenSegments.has(segment.id) || segment.id !== expectedId || segment.branchId !== branch.id || segment.startInstant !== part.start || segment.endExclusiveInstant !== part.end) fail("分段标识、分支或半开区间与原背景交集不一致。");
        seenSegments.add(segment.id);
        assertJudgment(judgment, month, segment.startInstant, segment.endExclusiveInstant);
        const refs = [...(part.luck ? [part.luck.nodeRef] : []), yearRef];
        if (!sameRefs(judgment.backgroundRefs, refs)) fail("单段流年、大运背景与实际分支不一致。");
        if (judgment.axes.length !== 3 || !same(judgment.axes.map((axis) => axis.axis).sort(), ["balance", "pattern", "seasonal"])) fail("单段缺少完整、唯一的三轴原判断。");
        // Preserve the original background order: actor metadata is verified
        // against this exact month, year and (if present) luck segment.
        const pattern = judgment.axes.find((axis) => axis.axis === "pattern")!;
        const backgrounds = judgment.backgroundRefs.map((ref) => {
          if (ref.nodeType === "year" && same(ref, yearRef)) return { nodeType: "year" as const, ganZhi: monthly.yearGanZhi! };
          if (ref.nodeType === "dayun" && part.luck && same(ref, part.luck.nodeRef)) return { nodeType: "dayun" as const, ganZhi: part.luck.ganZhi };
          return fail("作用元数据没有同分支同区间的实际年运背景。");
        });
        verifyPattern(pattern, { nodeType: "month", ganZhi: month.ganZhi }, backgrounds);
        if (!part.luck) gaps.push({ startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant, message: "本段已有流年背景与流月判断，但没有大运覆盖；未延用之后的大运。" });
        const age = buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant);
        return { id: segment.id, branchId: segment.branchId, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant,
          personalStartInstant: age.personalStartInstant, backgroundRefs: structuredClone(judgment.backgroundRefs), backgroundLabels: [...(part.luck ? [`${part.luck.ganZhi}大运`] : []), `${monthly.yearGanZhi}流年`],
          judgmentVersion: judgment.version, policyVersion: judgment.policyVersion, judgmentCaption: outlookDirectionCaption(judgment, month.headline),
          ageStage: age.stage, ageLabel: age.label, domains: [], conditions: unique([...judgment.conditions, ...age.conditions]) };
      });
      // The month aggregate contains conditions from both hypothetical
      // directions. A branch keeps its own conditions instead of importing
      // the other direction's rescue or obstruction into this one.
      return { id: branch.id, label: branch.label, segments, gaps, conditions: [...branch.conditions] };
    });
    checkedBranches.set(month.id, branches);
  }
  if (cursor !== yearEnd) fail("十二个节令月没有精确覆盖整个立春年。");
  // All months have passed identity and interval checks before any prose runs.
  const months = monthly.months.map((month): LocalMonthlyDomainReading => {
    const branches = checkedBranches.get(month.id)!;
    for (const branch of branches) for (const segment of branch.segments) {
      const original = month.judgmentSegments.find((item) => item.id === segment.id)!;
      const age = buildLocalReadingAgeContext(revision.timeCalibration.utcInstant, segment.startInstant, segment.endExclusiveInstant);
      // Context years follow this complete Jie-year, including its next-calendar-year Xiaohan.
      // Adult status is checked on the exact segment; notes never infer a work identity.
      const appliedWork = context && age.stage === "adult" && context.context.fromYear <= monthly.year && monthly.year <= context.context.toYear
        ? context.context.work : undefined;
      segment.domains = buildMonthlyDomainProse({ revision, assessment, month, yearGanZhi: monthly.yearGanZhi,
        judgment: original.judgment, age, ...(appliedWork === undefined ? {} : { appliedWork }),
        backgroundDayunLabels: segment.backgroundLabels.filter((label) => label.endsWith("大运")) });
    }
    const first = branches[0]?.segments[0], beforeBirth = birth !== null && instant(month.endExclusiveInstant) <= birth;
    const status = beforeBirth ? "before_birth" : first ? "ready" : "unavailable";
    return { monthId: month.id, label: month.label, ganZhi: month.ganZhi, nodeRef: month.nodeRef, startInstant: month.startInstant, endExclusiveInstant: month.endExclusiveInstant,
      status, headline: month.headline, summary: first ? branches.length > 1
        ? `${month.ganZhi}月分别保留顺行、逆行两个条件分支，各段的事业或学习、资源与关系重点按自己的背景阅读。`
        : branches[0]!.segments.length > 1 ? `${month.ganZhi}月在实际交运时刻分为${branches[0]!.segments.length}段；前后的事业或学习、资源与关系重点分别说明，换运不等于自动转好。`
          : `${month.ganZhi}月：${first.domains.map((domain) => domain.headline.startsWith(`${month.ganZhi}月：`) ? domain.headline.slice(`${month.ganZhi}月：`.length) : domain.headline).join("；")}。`
        : beforeBirth ? "此节令月在出生之前，仅保留历法区间。" : "本月暂缺可用的个人分段判断。", branches };
  });
  return { ...base, sourceVersions: unique(sourceVersions), status: "ready", months, limitations: unique([...limitations, ...monthly.limitations]) };
}
