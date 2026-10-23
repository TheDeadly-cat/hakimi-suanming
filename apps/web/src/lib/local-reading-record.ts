import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import { BAZI_COMPREHENSIVE_READING_VERSION, type BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildNatalRelationshipFoundation } from "../../../../packages/bazi-interpretation/src/natal-relationship-foundation";
import type { LocalLifeOutlook, LocalMonthlyOutlook } from "./local-detailed-outlook";
import { transitNodeRefSchema, type TransitNodeRef } from "@hakimi/contracts";
import { ANNUAL_EVENT_SCENARIOS_VERSION, type AnnualEventScenario } from "./annual-event-scenarios";
import { createOutlookJudgmentRecordWriter } from "./local-outlook-judgment-record";
import { READING_YEAR_SUMMARY_VERSION, summarizeAnnualJudgmentCaptions } from "./outlook-judgment-presentation";
import { OUTLOOK_CLASSICAL_SOURCES, OUTLOOK_CLASSICAL_SOURCES_VERSION } from "../../../../packages/bazi-interpretation/src/outlook-classical-sources";
import type { LocalReadingTimeline } from "./local-reading-timeline";
import { describeReadingTimeline } from "./local-reading-timeline-record";
import { describeAnnualDomainReadings, type LocalReadingAnnualDomains } from "./local-annual-domain-record";
import type { LocalPersonalReading } from "./local-personal-reading";
import { describePersonalReading } from "./local-personal-reading-record";
import { legacyAnnualInputFromExtras } from "./local-personal-reading-legacy";
import { describeContextualReading, type LocalContextualReadingBundle } from "./local-contextual-reading-record";
import type { RevisionRecord } from "@hakimi/contracts";
import type { LocalReadingSynthesis } from "./local-reading-synthesis";
import type { LocalReadingPriorities } from "./local-reading-priorities";
import { describeReadingSynthesis, describeReadingPriorities } from "./local-reading-synthesis-record";
import type { LocalMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { describeMonthlyDomainReadings } from "./local-monthly-domain-record";
import { describeReadingAnnualEvents, type LocalReadingAnnualEvents } from "./local-annual-event-record";
import type { LocalAnnualMonthStory } from "./local-annual-month-story";
import { describeAnnualMonthStory } from "./local-annual-month-story-record";
import type { LocalLifeStageStory } from "./local-life-stage-story";
import { describeLifeStageStory } from "./local-life-stage-story-record";
import type { LocalLifeStageYears } from "./local-life-stage-years";
import { describeLifeStageYears } from "./local-life-stage-years-record";
import type { LocalReadingAnnualLifeStories } from "./annual-life-story";
import { describeReadingAnnualLifeStories } from "./annual-life-story-record";
import type { PreparedKeyMonthYear } from "./key-month-event-source";
import type { ReadingTimeUncertainty } from "./reading-explanation-index";

export const LOCAL_READING_SNAPSHOT_TAG = "本地解读快照";
export const LOCAL_READING_FEEDBACK_TAG = "解读反馈";
export const LOCAL_READING_REPORT_VERSION = "hakimi.local-reading-report/0.1.0" as const;

export interface LocalReadingAnnualScenarios {
  version: typeof ANNUAL_EVENT_SCENARIOS_VERSION;
  revisionId: string;
  chartResultHash: string;
  includeHour: boolean;
  startYear: number;
  endYear: number;
  years: { year: number; transitNodeRef: TransitNodeRef | null; scenarios: AnnualEventScenario[] }[];
}
export interface LocalReadingSnapshotExtras {
  explanationGeneratedAt?: string;
  explanationTimeUncertainty?: ReadingTimeUncertainty;
  keyMonthYears?: PreparedKeyMonthYear[] | null;
  sourceRevision?: RevisionRecord;
  synthesis?: LocalReadingSynthesis | null;
  priorities?: LocalReadingPriorities | null;
  annualEvents?: LocalReadingAnnualEvents | null;
  annualLifeStories?: LocalReadingAnnualLifeStories | null;
  annualMonthStory?: LocalAnnualMonthStory | null;
  monthlyDomains?: LocalMonthlyDomainReadings | null;
  comprehensive?: BaziComprehensiveReading | null;
  life?: LocalLifeOutlook | null;
  lifeStageStory?: LocalLifeStageStory | null;
  lifeStageYears?: LocalLifeStageYears | null;
  monthly?: LocalMonthlyOutlook | null;
  annualScenarios?: LocalReadingAnnualScenarios | null;
  timeline?: LocalReadingTimeline | null;
  annualDomains?: LocalReadingAnnualDomains | null;
  personalReading?: LocalPersonalReading | null;
  contextual?: LocalContextualReadingBundle | null;
}

export function buildLocalReadingSnapshot(assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook | null, extras: LocalReadingSnapshotExtras = {}): string {
  const working = getWorkingBalance(assessment);
  if (annual && (annual.revisionId !== assessment.sourceBinding.revisionId
    || annual.chartResultHash !== assessment.sourceBinding.chartResultHash)) {
    throw new Error("年度解读与当前命盘不一致，请重新打开后保存。");
  }
  const comprehensive = extras.comprehensive;
  const comprehensiveSourceIds = new Set(comprehensive?.chapters.flatMap((chapter) => chapter.sourceIds) ?? []);
  const classicalSourceIds = new Set(OUTLOOK_CLASSICAL_SOURCES.map((source) => source.id));
  const explanationSources = [...new Map([...assessment.sources, ...(comprehensive?.sources ?? [])]
    .map((source) => [source.id, source])).values()];
  for (const outlook of [extras.life, extras.monthly]) {
    if (outlook && (outlook.revisionId !== assessment.sourceBinding.revisionId || outlook.chartResultHash !== assessment.sourceBinding.chartResultHash)) throw new Error("大运或流月解读与当前命盘不一致，请重新打开后保存。");
  }
  if (comprehensive && (comprehensive.sourceBinding.revisionId !== assessment.sourceBinding.revisionId
    || comprehensive.sourceBinding.chartResultHash !== assessment.sourceBinding.chartResultHash
    || comprehensive.sourceBinding.includeHour !== assessment.sourceBinding.includeHour)) {
    throw new Error("综合解读与当前命盘不一致，请重新打开后保存。");
  }
  const annualScenarios = extras.annualScenarios;
  if (annualScenarios) {
    if (!annual || annualScenarios.version !== ANNUAL_EVENT_SCENARIOS_VERSION
      || annualScenarios.revisionId !== assessment.sourceBinding.revisionId
      || annualScenarios.chartResultHash !== assessment.sourceBinding.chartResultHash
      || annualScenarios.includeHour !== assessment.sourceBinding.includeHour
      || annualScenarios.startYear !== annual.startYear || annualScenarios.endYear !== annual.endYear) {
      throw new Error("年度情境与当前命盘或年度范围不一致，请重新打开后保存。");
    }
    if (annualScenarios.years.length !== annual.years.length
      || new Set(annualScenarios.years.map((entry) => entry.year)).size !== annual.years.length) throw new Error("年度情境年份缺失或重复，已停止保存。");
    for (const entry of annualScenarios.years) {
      const expected = annual.years.find((year) => year.year === entry.year);
      const reference = entry.transitNodeRef ? transitNodeRefSchema.parse(entry.transitNodeRef) : null;
      const expectedReference = expected?.transitNodeRef ? transitNodeRefSchema.parse(expected.transitNodeRef) : null;
      if (!expected || JSON.stringify(reference) !== JSON.stringify(expectedReference)
        || (reference && (reference.revisionId !== assessment.sourceBinding.revisionId
          || reference.chartResultHash !== assessment.sourceBinding.chartResultHash || reference.nodeType !== "year"
          || reference.startInstant !== expected.startInstant))
        || ((!reference || expected.label === "暂不可判") && entry.scenarios.length > 0)) throw new Error("年度情境节点或可解读范围不一致，已停止保存。");
    }
  }
  const scenariosByYear = new Map(annualScenarios?.years.map((entry) => [entry.year, entry.scenarios]));
  const timelineSections = extras.timeline ? describeReadingTimeline(extras.timeline, assessment, annual, extras.life, extras.sourceRevision) : [];
  const domainSections = extras.annualDomains ? describeAnnualDomainReadings(extras.annualDomains, assessment, annual) : { years: new Map<number, string[]>(), appendix: [] };
  const monthlyDomainSections = extras.monthlyDomains ? describeMonthlyDomainReadings(extras.monthlyDomains,
    { revision: extras.sourceRevision, assessment, monthly: extras.monthly, contextual: extras.contextual }) : { months: new Map<string, string[]>(), appendix: [] };
  const relationshipFoundation = comprehensive?.relationshipFoundation;
  if (comprehensive?.version === BAZI_COMPREHENSIVE_READING_VERSION && !relationshipFoundation) {
    throw new Error("婚恋家庭依据缺失，已停止保存。");
  }
  if (relationshipFoundation) {
    if (!extras.sourceRevision) throw new Error("婚恋家庭解读缺少本次命盘来源，已停止保存。");
    const expected = buildNatalRelationshipFoundation(extras.sourceRevision, assessment);
    const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
    if (stable(relationshipFoundation) !== stable(expected)) throw new Error("婚恋家庭依据与本次命盘不一致，已停止保存。");
    for (const [id, text] of [["relationships", expected.relationship], ["family", expected.family]] as const) {
      const chapter = comprehensive!.chapters.find((item) => item.id === id);
      if (!chapter || Object.entries(text).some(([key, value]) => stable(chapter[key as keyof typeof chapter]) !== stable(value))) {
        throw new Error("婚恋家庭正文与本次星宫依据不一致，已停止保存。");
      }
    }
    for (const source of expected.sources) if (!explanationSources.some((item) => stable(item) === stable(source))) {
      throw new Error("婚恋家庭出处缺失或不一致，已停止保存。");
    }
  }
  const judgmentRecords = createOutlookJudgmentRecordWriter(assessment);
  const sections = [
    "# 本地命理解读快照", assessment.headline, assessment.summary,
    ...(extras.personalReading ? describePersonalReading(extras.personalReading, assessment, legacyAnnualInputFromExtras(assessment, annual, extras)) : []),
    ...(extras.contextual ? describeContextualReading(extras.contextual, assessment, annual, comprehensive) : []),
    ...timelineSections,
    ...(comprehensive ? ["## 命局综合解读", comprehensive.summary,
      ...comprehensive.chapters.flatMap((chapter) => [`### ${chapter.title} · ${chapter.headline}`, chapter.verdict,
        ...chapter.paragraphs, ...chapter.strengths.map((item) => `- 可以发挥：${item}`),
        ...chapter.cautions.map((item) => `- 容易受阻：${item}`), ...chapter.suggestions.map((item) => `- 生活建议：${item}`),
        ...chapter.evidence.map((item) => `- 命盘依据：${item}`), `出处标识：${chapter.sourceIds.join("、")}`]),
      ...comprehensive.limitations, `综合解读规则：${comprehensive.version}`] : []),
    ...(relationshipFoundation ? ["## 婚恋家庭星宫完整依据",
      `婚恋家庭规则：${relationshipFoundation.version}`,
      `星宫来源：${JSON.stringify(relationshipFoundation.sourceBinding)}`,
      `传统角色视角：${JSON.stringify(relationshipFoundation.perspectives)}`,
      `日宫原始位置：${JSON.stringify(relationshipFoundation.dayPalace)}`,
      `原局互动分层：${JSON.stringify(relationshipFoundation.interactions)}`,
      `星宫出处完整记录：${JSON.stringify(relationshipFoundation.sources)}`,
      ...relationshipFoundation.conditions.map((item) => `- 星宫解释条件：${item}`),
      "婚恋与家庭的完整正文保存在命局综合解读的对应章节；完整出处保存在文末来源列表。"] : []),
    "## 当前结构旺衰与承接判断", working.summary,
    `工作判断规则：${working.version}；${working.selection}；${working.ruleId}`,
    `当前方向：${working.direction}；判定：${working.label}；侧重：${working.focus}`,
    `当前参考五行：${working.favorableElements.join("、")}；当前需留意：${working.unfavorableElements.join("、")}；依条件取舍：${working.conditionalElements.join("、")}`,
    ...working.conditions.map((item) => `- 工作判断条件：${item}`),
    "完整结构诊断字段见文末的结构旺衰完整记录；原计权与当前判断均保留。",
    `## 原计权对照 · ${assessment.balance.headline}`, assessment.balance.summary,
    ...assessment.balance.evidence.map((item) => `- 原计权依据：${item}`), ...assessment.balance.conditions.map((item) => `- 原计权条件：${item}`),
    ...[assessment.pattern, assessment.seasonal].flatMap((section) => [
      `## ${section.headline}`, section.summary, ...section.evidence.map((item) => `- 依据：${item}`),
      ...section.conditions.map((item) => `- 条件：${item}`)
    ]),
    ...assessment.readings.flatMap((reading) => [`## ${reading.title}`, reading.text,
      ...reading.evidence.map((item) => `- 依据：${item}`)]),
    ...(annual ? [`## ${annual.startYear}—${annual.endYear} 年度解读`, summarizeAnnualJudgmentCaptions(annual), `年份总览：${READING_YEAR_SUMMARY_VERSION}`, annual.summary, annual.yearBoundary,
      ...annual.years.flatMap((year) => [`### ${year.year} ${year.yearGanZhi ?? ""} · ${year.label}`, year.summary,
        ...(domainSections.years.get(year.year) ?? []),
        ...judgmentRecords.describe(year.judgment, year.transitNodeRef, "年度综合判断", year),
        ...judgmentRecords.describe(year.ownJudgment, year.transitNodeRef, "流年自身判断", year),
        ...judgmentRecords.describeSegments(year.judgmentSegments, year.transitNodeRef, year.startInstant, year.endExclusiveInstant),
        `本年自身倾向：${year.yearInfluence.summary}`, ...year.yearInfluence.evidence.map((item) => `- 流年依据：${item}`),
        `大运背景：${year.decadeInfluence.summary}`, ...year.decadeInfluence.evidence.map((item) => `- 大运依据：${item}`),
        ...year.themes.flatMap((theme) => [`${theme.title}：${theme.text}`, ...theme.evidence.map((item) => `- 主题依据：${item}`)]),
        ...year.evidence.map((item) => `- 依据：${item}`),
        ...year.conditions.map((item) => `- 判断条件：${item}`),
        ...year.scenarioBranches.flatMap((scenario) => [`- 其他条件：${scenario.label}，${scenario.direction}。${scenario.summary}`,
          ...scenario.evidence.map((item) => `  - 分支依据：${item}`)]),
        ...(annualScenarios ? (scenariosByYear.get(year.year)?.length
          ? ["#### 可能对应的现实情境", ...scenariosByYear.get(year.year)!.flatMap((scenario) => [`##### ${scenario.title}`, scenario.summary,
            ...scenario.examples.map((item) => `- 情境例：${item}`), ...scenario.conditions.map((item) => `- 情境条件：${item}`),
            ...scenario.evidence.map((item) => `- 情境依据：${item}`), `情境标识：${scenario.id}`])]
          : ["本年没有可生成的个人情境，保留已有年度事实。"]) : [])]),
      ...annual.limitations] : ["年度解读尚未生成，本次仅保存命局判断。"]),
    ...(extras.life ? ["## 人生大运解读", extras.life.summary, extras.life.referenceLabel,
      ...extras.life.branches.flatMap((branch) => [`${branch.label}：${branch.summary}`, ...branch.conditions]),
      ...extras.life.decades.flatMap((decade) => [`### ${decade.startYear}—${decade.endYear} ${decade.ganZhi}大运 · ${decade.judgment.label}`,
        `${decade.branchLabel} · ${decade.ageLabel}\n${decade.startInstant} 至 ${decade.endExclusiveInstant}（不含终点）`, decade.headline, ...decade.paragraphs,
        ...judgmentRecords.describe(decade.judgment, decade.nodeRef, "本步大运综合判断", decade),
        ...[decade.career, decade.wealth, decade.relationship].flatMap((theme) => [`${theme.title}：${theme.text}`, ...theme.evidence.map((item) => `- 主题依据：${item}`)]),
        ...decade.evidence.map((item) => `- 依据：${item}`), ...decade.conditions.map((item) => `- 条件：${item}`),
        ...decade.sensitivity.flatMap((item) => [`- 其他口径：${item.label}，${item.direction}`, ...item.evidence])]),
      ...extras.life.limitations, `大运解读规则：${extras.life.version}`] : []),
    ...(extras.monthly ? [`## ${extras.monthly.year} 年十二节令月解读`, extras.monthly.summary,
      ...extras.monthly.months.flatMap((month) => [`### ${month.label} · ${month.ganZhi} · ${month.direction ?? "分条件解读"}`,
        ...(monthlyDomainSections.months.get(month.id) ?? []),
        `${month.startInstant} 至 ${month.endExclusiveInstant}（不含终点）`, month.headline, ...month.paragraphs,
        ...judgmentRecords.describe(month.judgment, month.nodeRef, "本月综合判断", month),
        ...judgmentRecords.describe(month.ownJudgment, month.nodeRef, "流月自身判断", month),
        ...judgmentRecords.describeSegments(month.judgmentSegments, month.nodeRef, month.startInstant, month.endExclusiveInstant),
        ...month.themes.flatMap((theme) => [`${theme.title}：${theme.text}`, ...theme.evidence.map((item) => `- 主题依据：${item}`)]),
        ...month.evidence.map((item) => `- 依据：${item}`), ...month.conditions.map((item) => `- 条件：${item}`),
        ...month.branches.flatMap((branch) => [`${branch.label}：${branch.summary}`, ...branch.evidence, ...branch.conditions,
          ...judgmentRecords.describe(branch.judgment, month.nodeRef, `${branch.label}综合判断`, month),
          ...judgmentRecords.describeSegments(branch.judgmentSegments, month.nodeRef, month.startInstant, month.endExclusiveInstant)]),
        ...month.sensitivity.flatMap((item) => [`- 其他口径：${item.label}，${item.direction}`, ...item.evidence])]),
      ...extras.monthly.limitations, `流月解读规则：${extras.monthly.version}`] : []),
    ...domainSections.appendix,
    ...monthlyDomainSections.appendix,
    ...judgmentRecords.appendix(),
    "## 本命格局与岁运判断来源", ...OUTLOOK_CLASSICAL_SOURCES.filter((source) => judgmentRecords.sourceIds.has(source.id) || comprehensiveSourceIds.has(source.id)).map((source) => `${source.title}\n${source.locator}\n${source.url}\n原文短引：${source.excerpt}\n本地解释：${source.interpretation}\n${source.sourceBoundary}\n${source.textualNotes.join("\n")}\n来源资料版本：${OUTLOOK_CLASSICAL_SOURCES_VERSION}`),
    "## 解释来源", ...explanationSources.filter((source) => !classicalSourceIds.has(source.id)).map((source) => `${source.title} · ${source.locator}\n${source.url}\n${source.interpretation}${source.provenance
      ? `\n${source.provenance.kind === "facsimile_page" ? "影印本页级转录" : "原文转录：维基文库贡献者"}\n${source.provenance.rightsNote}\n${source.provenance.licenseUrl}${source.provenance.facsimile ? `\n版本：${source.provenance.facsimile.edition}；PDF第${source.provenance.facsimile.pdfPageOneBased}页；印刷页${source.provenance.facsimile.printedPage}\n影印定位：${source.provenance.facsimile.pdfSha256} / ${source.provenance.facsimile.pageImageSha256}` : ""}` : ""}`),
    ...assessment.limitations,
    `解读规则：${assessment.version}`,
    `原始命盘：${assessment.sourceBinding.revisionId}`,
    `结果摘要：${assessment.sourceBinding.chartResultHash}`,
    ...(annual ? [`年度规则：${annual.version}`] : []),
    ...(annualScenarios ? [`年度情境规则：${annualScenarios.version}`, `年度情境范围：${annualScenarios.startYear}—${annualScenarios.endYear}；源修订 ${annualScenarios.revisionId}；结果 ${annualScenarios.chartResultHash}`,
      "年度情境用于说明可能的现实主题，不补充或改写顺逆判断；顺逆来自相应年份的综合判断及条件，不能由情境数量推断较顺或承压。"] : []),
    "本地规则自动生成的传统命理初判；不是实时 GPT 对话或统计预测。",
    `报告格式：${LOCAL_READING_REPORT_VERSION}`,
    `结构旺衰完整记录：${JSON.stringify(assessment.balance.structural)}`
  ];
  if (!extras.synthesis && !extras.priorities && !extras.annualEvents && !extras.annualLifeStories && !extras.annualMonthStory && !extras.lifeStageStory && !extras.lifeStageYears) return sections.join("\n\n");
  // Reuse exact reference lines from the complete report. Only generated evidence
  // lists use this formatter; personal prose is never searched or rewritten.
  const referenceLines = new Map<string, string>();
  for (const line of sections.flatMap((section) => section.split("\n"))) {
    const match = /^- ([^：]{1,24})：(.*)$/.exec(line);
    if (match && !referenceLines.has(match[2]!)) referenceLines.set(match[2]!, line);
  }
  const sharedLines = (label: string, items: readonly string[]) => items.flatMap((item) => {
    const own = `- ${label}：${item}`, existing = referenceLines.get(item);
    return existing && existing !== own ? [`${label}：`, existing] : [own];
  });
  const annualEventSections = extras.annualEvents ? describeReadingAnnualEvents(extras.annualEvents, {
    revision: extras.sourceRevision, assessment, annual, annualDomains: extras.annualDomains, contextual: extras.contextual }, sharedLines) : [];
  let annualLifeSections: string[] = [];
  if (extras.annualLifeStories) {
    if (!extras.sourceRevision || !annual || !extras.annualDomains || !extras.annualEvents) throw new Error("年度生活总评缺少原命盘、年度领域或事项来源，已停止保存。");
    annualLifeSections = describeReadingAnnualLifeStories(extras.annualLifeStories, { revision: extras.sourceRevision, assessment, annual,
      annualDomains: extras.annualDomains, annualEvents: extras.annualEvents, contextual: extras.contextual }, extras.personalReading, sharedLines);
  }
  let annualMonthSections: string[] = [];
  if (extras.annualMonthStory) {
    const story = extras.annualMonthStory;
    const year = annual?.years.find((item) => item.year === story.year);
    const domains = extras.annualDomains?.years.find((item) => item.year === story.year);
    const events = extras.annualEvents?.years.find((item) => item.year === story.year);
    if (!extras.sourceRevision || !year || !domains || !events || !extras.monthly || !extras.monthlyDomains) {
      throw new Error("年月衔接缺少完整年度或月份来源，已停止保存。");
    }
    annualMonthSections = describeAnnualMonthStory(story, { revision: extras.sourceRevision, assessment, year,
      annualDomains: domains, annualEvents: events, monthly: extras.monthly, monthlyDomains: extras.monthlyDomains,
      contextual: extras.contextual }, extras.personalReading, sharedLines);
  }
  let lifeStageSections: string[] = [];
  if (extras.lifeStageStory) {
    if (!extras.sourceRevision || !extras.life) throw new Error("人生阶段主线缺少原命盘或大运来源，已停止保存。");
    lifeStageSections = describeLifeStageStory(extras.lifeStageStory, { revision: extras.sourceRevision, assessment, life: extras.life }, extras.personalReading, sharedLines, judgmentRecords);
  }
  let lifeStageYearSections: string[] = [];
  if (extras.lifeStageYears) {
    if (!extras.sourceRevision || !extras.life || !extras.lifeStageStory || !annual || !extras.annualDomains || !extras.annualEvents) {
      throw new Error("阶段年度衔接缺少原命盘、大运主线或年度完整来源，已停止保存。");
    }
    lifeStageYearSections = describeLifeStageYears(extras.lifeStageYears, { revision: extras.sourceRevision, assessment,
      life: extras.life, lifeStageStory: extras.lifeStageStory, selectedDecadeId: extras.lifeStageYears.stage.decadeId,
      annual, annualDomains: extras.annualDomains, annualEvents: extras.annualEvents, contextual: extras.contextual }, extras.personalReading, sharedLines);
  }
  const supplement = [
    ...(extras.synthesis ? describeReadingSynthesis(extras.synthesis, { revision: extras.sourceRevision, assessment,
      comprehensive, life: extras.life, annual, timeline: extras.timeline, contextual: extras.contextual, personal: extras.personalReading }, sharedLines) : []),
    ...(extras.priorities ? describeReadingPriorities(extras.priorities, { revision: extras.sourceRevision, annual,
      life: extras.life, timeline: extras.timeline, annualDomains: extras.annualDomains }, judgmentRecords, sharedLines) : []),
    ...annualLifeSections,
    ...annualEventSections,
    ...annualMonthSections,
    ...lifeStageSections,
    ...lifeStageYearSections
  ];
  return [...sections.slice(0, 3), ...supplement, ...sections.slice(3)].join("\n\n");
}

export function buildLocalReadingFeedback(assessment: BaziPreliminaryAssessment, original: string, actual: string): string {
  if (!original.trim() || !actual.trim()) throw new Error("请填写原结论和实际情况。");
  if (original.length > 4000 || actual.length > 8000) throw new Error("反馈较长，请分成多条保存。");
  return ["# 解读反馈", "## 原结论", original.trim(), "## 用户补充或修正", actual.trim(),
    `解读规则：${assessment.version}`, `原始命盘：${assessment.sourceBinding.revisionId}`,
    `结果摘要：${assessment.sourceBinding.chartResultHash}`,
    "此条保存用户反馈，原命盘与之前的解读保持原样；尚未自动修改通用规则。"].join("\n\n");
}
