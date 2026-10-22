import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { LOCAL_DETAILED_QUERY_RANGE, type LocalLifeOutlook, type LocalMonthlyOutlook, type LocalDetailedTheme } from "../lib/local-detailed-outlook";
import type { LocalAnnualYear } from "../lib/local-annual-outlook";
import type { AnnualEventScenario } from "../lib/annual-event-scenarios";
import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { evaluateNatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { AnnualDomainReading, AnnualDomainSegment, LocalAnnualDomainReading } from "../lib/local-annual-domain-reading";
import type { PreliminarySource } from "../../../../packages/bazi-interpretation/src/preliminary-assessment-sources";
import { OUTLOOK_CLASSICAL_SOURCES } from "../../../../packages/bazi-interpretation/src/outlook-classical-sources";
import { NATAL_WEALTH_RESOURCE_SOURCES } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-sources";
import { OutlookJudgmentPanel } from "./outlook-judgment-panel";
import { PersonalReadingScope } from "./personal-reading-note";
import { ContextualReadingScope } from "./contextual-reading-provider";
import { safeVisibleText } from "../lib/visible-text";
import { annualHandoverPresentation, outlookDirectionCaption } from "../lib/outlook-judgment-presentation";
import { plainOutlookCaption } from "../lib/plain-outlook-reading";
import { plainYearCaption, plainYearSummary, plainYearTopic } from "../lib/plain-year-overview";
import type { LocalMonthlyDomainReadings } from "../lib/local-monthly-domain-reading";
import { MonthlyDomainPanel } from "./monthly-domain-panel";
import { splitAnnualDomainObstacles } from "../lib/annual-domain-presentation";
import type { LocalAnnualEventReading } from "../lib/local-annual-event-reading";
import { AnnualEventReadingPanel } from "./annual-event-reading-panel";
import type { LocalAnnualMonthStory } from "../lib/local-annual-month-story";
import type { LocalPersonalReading, LocalPersonalReadingEntry } from "../lib/local-personal-reading";
import { AnnualMonthStoryPanel } from "./annual-month-story-panel";
import { buildMonthReadingRhythm } from "../lib/local-month-reading-rhythm";
import { MonthReadingRhythmPanel } from "./month-reading-rhythm-panel";
import type { LegacyAnnualReadingInput } from "../lib/legacy-annual-reading-profile";
import { LIFE_STAGE_STORY_VERSION, type LocalLifeStageStory } from "../lib/local-life-stage-story";
import { LifeStageStoryPanel } from "./life-stage-story-panel";
import { LIFE_STAGE_YEARS_VERSION, type LocalLifeStageYears } from "../lib/local-life-stage-years";
import type { LifeStageAnnualRange } from "../lib/local-annual-range";
import { LifeStageYearsPanel } from "./life-stage-years-panel";
import type { AnnualLifeStory, LocalReadingAnnualLifeStories } from "../lib/annual-life-story";
import { annualAnswerForYear, annualAnswerYearTitle } from "../lib/annual-answer-navigation";
import "./detailed-outlook-panel.css";

interface Props {
  revision?: RevisionRecord;
  assessment?: BaziPreliminaryAssessment;
  life: LocalLifeOutlook | null; monthly: LocalMonthlyOutlook | null;
  lifeStageStory?: LocalLifeStageStory | null;
  selectedDecadeId?: string | null;
  onSelectDecade?: (decadeId: string) => void;
  stageAnnualRange?: LifeStageAnnualRange | null;
  stageAnnualRangeLoading?: boolean;
  lifeStageYears?: LocalLifeStageYears | null;
  lifeStageYearsError?: string | null;
  lifeStageYearPersonalSources?: Record<string, LocalPersonalReadingEntry[]>;
  lifeLoading: boolean; monthlyLoading: boolean;
  lifeError: string | null; monthlyError: string | null;
  year: number; onYearChange: (year: number) => void;
  annualYear?: LocalAnnualYear | null; annualScenarios?: AnnualEventScenario[];
  annualDomainReading?: LocalAnnualDomainReading | null;
  annualEventReading?: LocalAnnualEventReading | null;
  annualLifeStory?: AnnualLifeStory | null;
  annualLifeStories?: LocalReadingAnnualLifeStories | null;
  annualLifeStoryError?: string | null;
  annualLifeStoryPersonalSources?: Record<string, LocalPersonalReadingEntry[]>;
  monthlyDomains?: LocalMonthlyDomainReadings | null;
  annualMonthStory?: LocalAnnualMonthStory | null;
  personalReading?: LocalPersonalReading | null;
  personalReadingReady?: boolean;
  personalLegacySource?: LegacyAnnualReadingInput;
  onFeedbackDomain?: (subjectId: string) => void;
  annualYears?: LocalAnnualYear[];
  sources?: readonly PreliminarySource[];
  annualLoading?: boolean; annualError?: string | null;
}
const clean = (value: string) => safeVisibleText(value, "", 12_000);
const dateLabel = (instant: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
const instantLabel = (instant: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(instant));
const sameNodeRef = (left: TransitNodeRef | null, right: TransitNodeRef | null) => left === null || right === null ? left === right
  : Object.keys(left).length === Object.keys(right).length && (Object.keys(left) as (keyof TransitNodeRef)[]).every((key) => left[key] === right[key]);

function bindsAnnual(reading: Pick<LocalAnnualDomainReading, "year" | "yearGanZhi" | "startInstant" | "endExclusiveInstant" | "yearNodeRef" | "sourceBinding">, annual: LocalAnnualYear): boolean {
  const binding = annual.judgment?.sourceBinding ?? annual.ownJudgment?.sourceBinding;
  const ref = annual.transitNodeRef;
  return reading.year === annual.year && reading.yearGanZhi === annual.yearGanZhi
    && reading.startInstant === annual.startInstant && reading.endExclusiveInstant === annual.endExclusiveInstant
    && sameNodeRef(reading.yearNodeRef, ref) && Boolean(binding || ref)
    && reading.sourceBinding.revisionId === (binding?.revisionId ?? ref?.revisionId)
    && reading.sourceBinding.chartResultHash === (binding?.chartResultHash ?? ref?.chartResultHash)
    && (!binding || reading.sourceBinding.includeHour === binding.includeHour);
}
function bindsAnnualEvents(reading: LocalAnnualEventReading, annual: LocalAnnualYear): boolean {
  return bindsAnnual(reading, annual) && reading.branches.every((branch) => branch.segments.every((segment) => {
    const original = annual.judgmentSegments.find((item) => item.id === segment.id && item.branchId === branch.id);
    return Boolean(original && segment.branchId === branch.id && segment.startInstant === original.startInstant
      && segment.endExclusiveInstant === original.endExclusiveInstant
      && JSON.stringify(segment.backgroundRefs) === JSON.stringify(original.judgment.backgroundRefs));
  }));
}
function bindsMonthStory(story: LocalAnnualMonthStory, annual: LocalAnnualYear, monthly: LocalMonthlyOutlook,
  domains: LocalMonthlyDomainReadings, events: LocalAnnualEventReading): boolean {
  const nodes = new Map(story.nodes.map((node) => [node.key, node.ref]));
  return nodes.size === story.nodes.length && story.nodes.every((node) => node.key === node.ref.nodeId
    && node.ref.revisionId === story.sourceBinding.revisionId && node.ref.chartResultHash === story.sourceBinding.chartResultHash)
    && bindsAnnual({ ...story, yearNodeRef: nodes.get(monthly.yearNodeRef?.nodeId ?? "") ?? null }, annual)
    && story.year === monthly.year && story.year === domains.year
    && story.sourceBinding.caseId === events.sourceBinding.caseId
    && story.sourceBinding.revisionId === monthly.revisionId && story.sourceBinding.chartResultHash === monthly.chartResultHash
    && story.sourceBinding.revisionId === domains.sourceBinding.revisionId && story.sourceBinding.chartResultHash === domains.sourceBinding.chartResultHash
    && story.sourceBinding.includeHour === domains.sourceBinding.includeHour
    && sameNodeRef(monthly.yearNodeRef, domains.yearNodeRef)
    && story.months.length === monthly.months.length && story.months.every((item) => {
      const original = monthly.months.find((month) => month.id === item.monthId);
      return Boolean(original && item.ganZhi === original.ganZhi && item.startInstant === original.startInstant
        && item.endExclusiveInstant === original.endExclusiveInstant
        && item.branches.every((branch) => branch.periods.every((period) => {
          const segment = original.judgmentSegments.find((entry) => entry.id === period.id && entry.branchId === branch.id);
          return Boolean(segment && period.branchId === branch.id && period.startInstant === segment.startInstant
            && period.endExclusiveInstant === segment.endExclusiveInstant && period.domains.every((domain) =>
              sameNodeRef(nodes.get(domain.links.monthlyDomain.targetNodeKey) ?? null, original.nodeRef)));
        })));
    });
}

function Theme({ theme }: { theme: LocalDetailedTheme }) {
  return <article className="outlook-theme"><h4>{clean(theme.title)}</h4><p>{clean(theme.text)}</p></article>;
}
function Evidence({ items, conditions, readingScope = [], label = "查看命盘依据与条件" }: { items: string[]; conditions: string[]; readingScope?: string[]; label?: string }) {
  return <details className="outlook-evidence"><summary>{label} <ChevronDown size={16} aria-hidden="true" /></summary>
    <DomainPoints title="阅读范围" items={readingScope} />
    <ul>{[...conditions, ...items].map((item, index) => <li key={index}>{clean(item)}</li>)}</ul>
  </details>;
}

function DomainPoints({ title, items }: { title: string; items: string[] }) {
  return items.length ? <div className="annual-domain-points"><h6>{title}</h6><ul>{items.map((item, index) => <li key={index}>{clean(item)}</li>)}</ul></div> : null;
}
function DomainReading({ domain, feedbackSubjectId, onFeedbackDomain }: { domain: AnnualDomainReading; feedbackSubjectId: string; onFeedbackDomain?: (subjectId: string) => void }) {
  const { obstacles, readingScope } = splitAnnualDomainObstacles(domain.obstacles);
  return <article className="annual-domain" aria-label={clean(domain.title)}>
    <p className="annual-domain-label">{clean(domain.title)}</p><ContextualReadingScope baseSubjectId={feedbackSubjectId}><PersonalReadingScope subjectId={feedbackSubjectId}><h5>{clean(domain.headline)}</h5>
    <p className="annual-domain-verdict">{clean(domain.summary)}</p>
    {domain.paragraphs.filter(paragraph => !domain.summary.includes(paragraph)).map((paragraph, index) => <p key={index}>{clean(paragraph)}</p>)}
    <div className="annual-domain-points-grid"><DomainPoints title="可以发挥的部分" items={domain.opportunities} /><DomainPoints title="需要留意的阻力" items={obstacles} /></div>
    <DomainPoints title="放到生活里对照" items={domain.examples} />
    <DomainPoints title="后续观察什么" items={domain.watchPoints} />
    <Evidence label="这项解读的条件与依据" conditions={domain.conditions} items={domain.evidence} readingScope={readingScope} />
    </PersonalReadingScope>
    {onFeedbackDomain ? <a className="annual-domain-feedback-link" href="#reading-feedback" onClick={() => onFeedbackDomain(feedbackSubjectId)}>反馈这项解读</a> : null}
    </ContextualReadingScope>
  </article>;
}
function domainBackgroundLabel(segment: AnnualDomainSegment, annual: LocalAnnualYear) {
  if (!segment.backgroundRefs.length) return "尚无大运背景 · 本段按流年本身解读";
  const names = [...new Set(annual.dayunSegments.filter((item) => item.direction === segment.branchId
    && segment.backgroundRefs.some((ref) => sameNodeRef(ref, item.nodeRef))).map((item) => item.ganZhi))];
  return names.length ? `${names.join("、")}大运` : "大运背景待核对";
}
function AnnualDomains({ reading, annual, onFeedbackDomain }: { reading: LocalAnnualDomainReading; annual: LocalAnnualYear; onFeedbackDomain?: (subjectId: string) => void }) {
  return <section className="annual-domain-reading" aria-label={`${reading.year}年分领域详读`}>
    <h4 className="annual-domain-headline">{clean(reading.headline)}</h4><p className="outlook-lead">{clean(reading.summary)}</p>
    {reading.branches.map((branch) => <section className="annual-domain-branch" key={branch.id} aria-label={clean(branch.label)}>
      {reading.branches.length > 1 ? <h4 className="annual-domain-branch-label">{clean(branch.label)}</h4> : null}
      {branch.segments.map((segment) => <section className="annual-domain-segment" key={segment.id} data-segment-id={segment.id} aria-label={`${branch.label} · ${instantLabel(segment.startInstant)}起的年度分段`}>
        <div className="annual-domain-segment-heading">
          <p className="annual-domain-background">{clean(domainBackgroundLabel(segment, annual))}</p>
          <p className="outlook-period"><time dateTime={segment.startInstant}>{instantLabel(segment.startInstant)}</time> 起至 <time dateTime={segment.endExclusiveInstant}>{instantLabel(segment.endExclusiveInstant)}</time>前 · 北京时间</p>
          <p className="annual-domain-caption">{clean(segment.judgmentCaption)}</p>
        </div>
        <p className="outlook-period">{clean(segment.ageLabel)}{segment.personalStartInstant !== segment.startInstant ? ` · 个人主题从 ${instantLabel(segment.personalStartInstant)} 起阅读` : ""}</p>
        {segment.domains.map((domain) => <DomainReading key={domain.id} domain={domain} feedbackSubjectId={`annual-domain-${reading.year}-${segment.id}-${domain.id}`} onFeedbackDomain={onFeedbackDomain} />)}
      </section>)}
      {branch.gaps.length ? <div className="annual-domain-gaps">{branch.gaps.map((gap, index) => <div key={index}>
        {gap.startInstant && gap.endExclusiveInstant ? <p className="outlook-period"><time dateTime={gap.startInstant}>{instantLabel(gap.startInstant)}</time> 至 <time dateTime={gap.endExclusiveInstant}>{instantLabel(gap.endExclusiveInstant)}</time>前 · 北京时间</p> : null}
        <p>{clean(gap.message)}</p></div>)}</div> : null}
      {branch.conditions.length ? <Evidence label="这一分支的适用条件" conditions={branch.conditions} items={[]} /> : null}
    </section>)}
    {reading.limitations.length ? <Evidence label="分领域解读的范围" conditions={reading.limitations} items={[]} /> : null}
  </section>;
}
function AnnualProfessionalEvidence({ annual, scenarios, sources }: { annual: LocalAnnualYear; scenarios: AnnualEventScenario[]; sources: PreliminarySource[] }) {
  return <details className="outlook-evidence annual-original-evidence"><summary>原年度判断与完整专业依据 <ChevronDown size={16} aria-hidden="true" /></summary>
    <p>{clean(annual.summary)}</p>
    <div className="annual-influence-grid"><article><h4>流年扶抑</h4><p>{clean(annual.yearInfluence.summary)}</p></article>
      <article><h4>大运扶抑</h4><p>{clean(annual.decadeInfluence.summary)}</p></article></div>
    <OutlookJudgmentPanel judgment={annual.judgment} segments={annual.judgmentSegments} sources={sources} />
    <Evidence label="完整年度依据与原情境条件" conditions={annual.conditions} items={[
      ...annual.evidence, ...annual.yearInfluence.evidence, ...annual.decadeInfluence.evidence,
      ...annual.themes.flatMap((theme) => theme.evidence), ...annual.scenarioBranches.flatMap((branch) => [`${branch.label}：${branch.summary}`, ...branch.evidence]),
      ...scenarios.flatMap((scenario) => [`${scenario.title}：${scenario.summary}`, ...scenario.conditions, ...scenario.evidence])
    ]} />
  </details>;
}

function bindsLifeStageStory(story: LocalLifeStageStory, life: LocalLifeOutlook): boolean {
  const stages = story.branches.flatMap((branch) => branch.stages);
  return story.version === LIFE_STAGE_STORY_VERSION && story.sourceVersions.includes(life.version)
    && story.sourceBinding.revisionId === life.revisionId && story.sourceBinding.chartResultHash === life.chartResultHash
    && story.referenceInstant === life.referenceInstant && story.branches.length === life.branches.length
    && stages.length === life.decades.length && new Set(stages.map((stage) => stage.decadeId)).size === stages.length
    && story.branches.every((branch) => {
      const original = life.branches.find((item) => item.id === branch.id);
      if (!original || original.currentDecadeId !== branch.currentDecadeId) return false;
      return branch.stages.every((stage) => {
        const decade = life.decades.find((item) => item.id === stage.decadeId && item.branchId === branch.id);
        return Boolean(decade && stage.branchId === branch.id && stage.index === decade.index && stage.ganZhi === decade.ganZhi
          && stage.stemTenGod === decade.stemTenGod && stage.ageLabel === decade.ageLabel
          && stage.startInstant === decade.startInstant && stage.endExclusiveInstant === decade.endExclusiveInstant
          && JSON.stringify(stage.nodeRef) === JSON.stringify(decade.nodeRef));
      }) && branch.transitions.every((transition) => {
        const from = branch.stages.find((stage) => stage.decadeId === transition.fromDecadeId);
        const to = branch.stages.find((stage) => stage.decadeId === transition.toDecadeId);
        return Boolean(from && to && to.index === from.index + 1 && from.endExclusiveInstant === transition.atInstant
          && to.startInstant === transition.atInstant && JSON.stringify(transition.fromNodeRef) === JSON.stringify(from.nodeRef)
          && JSON.stringify(transition.toNodeRef) === JSON.stringify(to.nodeRef));
      });
    });
}

export function DetailedOutlookPanel({ revision, assessment, life, lifeStageStory, selectedDecadeId, onSelectDecade, stageAnnualRange, stageAnnualRangeLoading, lifeStageYears, lifeStageYearsError, lifeStageYearPersonalSources, monthly, lifeLoading, monthlyLoading, lifeError, monthlyError, year, onYearChange,
  annualYear, annualScenarios = [], annualDomainReading, annualEventReading, annualLifeStory, annualLifeStories, annualLifeStoryError, annualLifeStoryPersonalSources, monthlyDomains, annualMonthStory, personalReading, personalReadingReady = true, personalLegacySource, onFeedbackDomain, annualYears = [], sources = [], annualLoading = false, annualError = null }: Props) {
  const id = useId();
  const readingTask = useMemo(() => {
    if (!revision || !assessment || assessment.sourceBinding.revisionId !== revision.id
      || assessment.sourceBinding.chartResultHash !== revision.manifest.resultHash
      || assessment.sourceBinding.includeHour !== (revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only")) return null;
    return evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour: assessment.sourceBinding.includeHour });
  }, [revision, assessment]);
  const [decadeId, setDecadeId] = useState("");
  const [monthId, setMonthId] = useState("");
  const [yearDraft, setYearDraft] = useState(String(year));
  const [yearError, setYearError] = useState("");
  useEffect(() => { setYearDraft(String(year)); setYearError(""); }, [year]);
  const decade = life?.decades.find((item) => item.id === (selectedDecadeId ?? decadeId)) ?? life?.decades.find((item) => item.isCurrent) ?? life?.decades[0];
  const selectDecade = (nextId: string) => { setDecadeId(nextId); onSelectDecade?.(nextId); };
  const selectedLifeStory = life && lifeStageStory && bindsLifeStageStory(lifeStageStory, life) ? lifeStageStory : null;
  const selectedStage = selectedLifeStory?.branches.flatMap((branch) => branch.stages).find((stage) => stage.decadeId === decade?.id);
  const selectedStageYears = !annualLoading && !annualError && !stageAnnualRangeLoading && lifeStageYears?.version === LIFE_STAGE_YEARS_VERSION && selectedStage
    && JSON.stringify(lifeStageYears.stage) === JSON.stringify(selectedStage)
    && JSON.stringify(lifeStageYears.sourceBinding) === JSON.stringify(selectedLifeStory?.sourceBinding) ? lifeStageYears : null;
  const selectedStageRange = stageAnnualRange?.decadeId === decade?.id && sameNodeRef(stageAnnualRange?.nodeRef ?? null, decade?.nodeRef ?? null) ? stageAnnualRange : null;
  const month = monthly?.months.find((item) => item.id === monthId) ?? monthly?.months.find((item) => Date.now() >= Date.parse(item.startInstant) && Date.now() < Date.parse(item.endExclusiveInstant)) ?? monthly?.months[0];
  const candidateMonthDomains = monthlyDomains && monthly && month && monthlyDomains.year === monthly.year
    && monthlyDomains.sourceBinding.revisionId === monthly.revisionId && monthlyDomains.sourceBinding.chartResultHash === monthly.chartResultHash
    && sameNodeRef(monthlyDomains.yearNodeRef, monthly.yearNodeRef) ? monthlyDomains.months.find((item) => item.monthId === month.id) : null;
  const monthDomains = candidateMonthDomains && month && sameNodeRef(candidateMonthDomains.nodeRef, month.nodeRef)
    && candidateMonthDomains.startInstant === month.startInstant && candidateMonthDomains.endExclusiveInstant === month.endExclusiveInstant
    && candidateMonthDomains.ganZhi === month.ganZhi
    && (!month.judgment || monthlyDomains!.sourceBinding.includeHour === month.judgment.sourceBinding.includeHour) ? candidateMonthDomains : null;
  const selectedAnnual = personalReadingReady && annualYear?.year === year ? annualYear : null;
  const selectedDomains = selectedAnnual && annualDomainReading && bindsAnnual(annualDomainReading, selectedAnnual) ? annualDomainReading : null;
  const selectedEvents = selectedAnnual && annualEventReading && bindsAnnualEvents(annualEventReading, selectedAnnual) ? annualEventReading : null;
  const selectedStory = !annualLoading && !monthlyLoading && !annualError && !monthlyError
    && annualMonthStory && selectedAnnual && selectedEvents && monthly && monthlyDomains
    && bindsMonthStory(annualMonthStory, selectedAnnual, monthly, monthlyDomains, selectedEvents) ? annualMonthStory : null;
  const monthRhythm = useMemo(() => {
    if (!selectedStory || !monthly || !monthlyDomains) return null;
    try {
      return buildMonthReadingRhythm({ monthly, monthlyDomains, annualMonthStory: selectedStory, contextual: personalLegacySource?.contextual });
    } catch {
      // Keep the complete original reading when this additional projection
      // cannot establish an exact match. It must not borrow adjacent inputs.
      return null;
    }
  }, [selectedStory, monthly, monthlyDomains, personalLegacySource?.contextual]);
  const judgmentSources = [...new Map([...OUTLOOK_CLASSICAL_SOURCES, ...NATAL_WEALTH_RESOURCE_SOURCES, ...sources]
    .map((source) => [source.id, source])).values()];
  const originalLifeReading = decade ? <>
    <div className="outlook-reading-title"><h3>{clean(decade.headline)}</h3><span>{clean(plainOutlookCaption(decade.judgment))}</span></div>
    <p className="outlook-period">{clean(decade.ageLabel)} · {dateLabel(decade.startInstant)} 起至 {dateLabel(decade.endExclusiveInstant)} 前</p>
    {decade.paragraphs.map((paragraph, index) => <p key={index}>{clean(paragraph)}</p>)}
    <OutlookJudgmentPanel judgment={decade.judgment} sources={judgmentSources} />
    <div className="outlook-theme-grid">{[decade.career, decade.wealth, decade.relationship].map((theme) => <Theme key={theme.id} theme={theme} />)}</div>
    <Evidence items={[...decade.evidence, ...decade.sensitivity.flatMap((item) => [`${item.label}：${item.direction}`, ...item.evidence])]} conditions={decade.conditions} />
  </> : null;
  function query(event: FormEvent) {
    event.preventDefault();
    const value = Number(yearDraft);
    if (!/^\d{4}$/u.test(yearDraft) || !Number.isInteger(value) || value < LOCAL_DETAILED_QUERY_RANGE.fromYear || value > LOCAL_DETAILED_QUERY_RANGE.monthlyToYear) {
      setYearError(`请输入 ${LOCAL_DETAILED_QUERY_RANGE.fromYear}—${LOCAL_DETAILED_QUERY_RANGE.monthlyToYear} 之间的年份。`); return;
    }
    setYearError(""); setMonthId(""); onYearChange(value);
  }
  return <section className="detailed-outlook" aria-label="人生大运与逐月解读">
    <section className="life-outlook" id="reading-life" tabIndex={-1} aria-labelledby={`${id}-life`} aria-busy={lifeLoading}>
      <div className="reading-section-heading"><h2 id={`${id}-life`}>人生大运</h2><span>把阶段背景与每年变化连起来看</span></div>
      {lifeLoading ? <p role="status">正在梳理人生阶段…</p> : lifeError ? <p role="alert">{lifeError}</p> : null}
      {life ? <>
        <PersonalReadingScope subjectId="life-overview">
        {selectedLifeStory ? <details className="outlook-evidence"><summary>当前大运与精确交运日期</summary>
          <p className="outlook-lead">{clean(life.summary)}</p><p className="outlook-period">{clean(life.referenceLabel)}</p>
          {life.branches.length > 1 ? <div className="outlook-branches">{life.branches.map((branch) => <p key={branch.id}><strong>{branch.label}</strong> · {branch.summary}</p>)}</div> : null}
        </details> : <>
          <p className="outlook-lead">{clean(life.summary)}</p><p className="outlook-period">{clean(life.referenceLabel)}</p>
          {life.branches.length > 1 ? <div className="outlook-branches">{life.branches.map((branch) => <p key={branch.id}><strong>{branch.label}</strong> · {branch.summary}</p>)}</div> : null}
        </>}
        </PersonalReadingScope>
        {decade ? <>
          <div className="outlook-period-overview" role="group" aria-label="人生大运总览">{life.decades.map((item) => <button key={item.id} type="button" aria-pressed={item.id === decade.id} data-direction={item.judgment?.label ?? item.direction ?? "暂不可判"} onClick={() => selectDecade(item.id)}>
            <span>{life.branches.length > 1 ? item.branchLabel : item.isCurrent ? "当前大运" : `第${item.index}步`}</span>
            <strong>{item.startYear}—{item.endYear}</strong><span>{item.ganZhi} · {plainOutlookCaption(item.judgment)}</span>
          </button>)}</div>
          <label className="outlook-select-label" htmlFor={`${id}-decade`}>选择人生阶段</label>
          <select id={`${id}-decade`} className="outlook-select" value={decade.id} onChange={(event) => selectDecade(event.target.value)}>{life.decades.map((item) => <option key={item.id} value={item.id}>{life.branches.length > 1 ? `${item.branchLabel} · ` : ""}{item.startYear}—{item.endYear} · {item.ganZhi}大运 · {plainOutlookCaption(item.judgment)}{item.isCurrent ? " · 当前阶段" : ""}</option>)}</select>
          <article className="outlook-period-reading" id="reading-life-stage" tabIndex={-1}>
            <PersonalReadingScope subjectId={`decade-${decade.id}`}>
            {selectedLifeStory && life ? <>
              <LifeStageStoryPanel story={selectedLifeStory} life={life} stageId={decade.id} task={readingTask} personal={personalReading} onFeedback={onFeedbackDomain} onSelectDecade={selectDecade}>
                {lifeStageYears !== undefined || onSelectDecade ? <details className="outlook-evidence"><summary>展开这步大运的逐年对照与原判断</summary><LifeStageYearsPanel bridge={selectedStageYears} range={selectedStageRange}
                  loading={stageAnnualRangeLoading || annualLoading} error={lifeStageYearsError || annualError}
                  onLoadAll={onSelectDecade ? () => selectDecade(decade.id) : undefined} onYearChange={(nextYear) => { setMonthId(""); onYearChange(nextYear); }}
                  onFeedback={onFeedbackDomain} personalSources={lifeStageYearPersonalSources} /></details> : null}
              </LifeStageStoryPanel>
              <details className="outlook-evidence life-stage-original"><summary>查看本步大运的完整原判断 <ChevronDown size={16} aria-hidden="true" /></summary>{originalLifeReading}</details>
            </> : originalLifeReading}
            </PersonalReadingScope>
          </article>
        </> : <p>此命盘目前没有可展示的大运区间，命局解读仍可阅读。</p>}
      </> : null}
    </section>
    <section className="monthly-outlook" id="reading-yearly" tabIndex={-1} aria-labelledby={`${id}-monthly`} aria-busy={monthlyLoading || !personalReadingReady}>
      <div className="reading-section-heading"><h2 id={`${id}-monthly`}>逐年与流月</h2><span>回看过去，也可查看未来年份</span></div>
      {annualYears.length ? <div className="outlook-period-overview outlook-annual-overview" role="group" aria-label={annualYears.length === 10 ? "十年流年总览" : "流年总览"}>{annualYears.map((item) => {
        const answer = personalReadingReady && !annualLoading && !annualError && !annualLifeStoryError ? annualAnswerForYear(item, annualLifeStories) : null;
        return <button key={item.year} type="button" aria-pressed={item.year === year} data-direction={item.label} onClick={() => { setMonthId(""); onYearChange(item.year); }}>
          <span>{item.yearGanZhi ?? "历法待定"}</span><strong>{item.year}</strong>
          {answer ? <span className="outlook-year-answer">{clean(answer.branches.some(branch => branch.segments.some(segment => annualLifeStoryPersonalSources?.[`${item.year}:${segment.id}`]?.some(entry => entry.state === "adopted" && !entry.issues.length))) ? "已有个人修订，展开查看" : plainYearTopic(item))}</span> : null}
          {personalReadingReady ? <span className="outlook-year-direction">{plainYearCaption(item)}</span> : null}
        </button>;
      })}</div> : null}
      <form className="outlook-year-form" onSubmit={query} noValidate>
        <label htmlFor={`${id}-query-year`}>查询年份</label><input id={`${id}-query-year`} type="number" min={LOCAL_DETAILED_QUERY_RANGE.fromYear} max={LOCAL_DETAILED_QUERY_RANGE.monthlyToYear} inputMode="numeric" value={yearDraft} onChange={(event) => setYearDraft(event.target.value)} aria-invalid={Boolean(yearError)} aria-describedby={yearError ? `${id}-year-error` : undefined} />
        <button className="reading-button reading-button--primary" type="submit">查看这一年</button>
        <button className="reading-button reading-button--secondary" type="button" onClick={() => { const current = new Date().getFullYear(); setYearDraft(String(current)); setMonthId(""); onYearChange(current); }}>回到今年</button>
      </form>
      {yearError ? <p className="outlook-error" id={`${id}-year-error`} role="alert">{yearError}</p> : null}
      {!personalReadingReady ? <p role="status">个人修订尚未核对完成，核对后显示本年的解读。</p> : null}
      <section className="annual-full-reading" aria-labelledby={`${id}-annual`} aria-busy={annualLoading}>
        <div className="outlook-reading-title"><h3 id={`${id}-annual`}>{year} 年度详解{selectedAnnual?.yearGanZhi ? ` · ${selectedAnnual.yearGanZhi}` : ""}</h3>
          {selectedAnnual ? <span>{clean(plainYearCaption(selectedAnnual))}</span> : null}</div>
        {annualLoading ? <p role="status">正在整理 {year} 年的完整解读…</p> : annualError ? <p role="alert">{annualError}</p> : null}
        {selectedAnnual ? <>
          <PersonalReadingScope subjectId={`annual-${selectedAnnual.year}`}>
          {!selectedDomains ? <p className="outlook-lead">{clean(plainYearSummary(selectedAnnual))}</p> : null}
          {selectedAnnual.startInstant && selectedAnnual.endExclusiveInstant ? <p className="outlook-period">{dateLabel(selectedAnnual.startInstant)} 起至 {dateLabel(selectedAnnual.endExclusiveInstant)} 前 · 立春年</p> : null}
          {annualLifeStoryError ? <p role="alert">{clean(annualLifeStoryError)}</p> : null}
          {selectedEvents ? <AnnualEventReadingPanel reading={selectedEvents} onFeedback={onFeedbackDomain}
            revision={revision} assessment={assessment}
            annualYear={selectedAnnual}
            annualLifeStory={!annualLoading && !annualError && !annualLifeStoryError ? annualLifeStory : null}
            annualLifeStoryPersonalSources={annualLifeStoryPersonalSources} /> : null}
          {selectedDomains ? selectedEvents ? <details className="outlook-evidence annual-domain-complete"><summary>完整事业、财务与关系解释</summary>
            <AnnualDomains reading={selectedDomains} annual={selectedAnnual} onFeedbackDomain={onFeedbackDomain} />
          </details> : <AnnualDomains reading={selectedDomains} annual={selectedAnnual} onFeedbackDomain={onFeedbackDomain} /> : null}
          {selectedDomains ? <AnnualProfessionalEvidence annual={selectedAnnual} scenarios={annualScenarios} sources={judgmentSources} /> : <>
          <details className="outlook-evidence"><summary>仅看扶抑时的判断</summary><div className="annual-influence-grid">
            <article><h4>流年扶抑</h4><p>{clean(selectedAnnual.yearInfluence.summary)}</p></article>
            <article><h4>大运扶抑</h4><p>{clean(selectedAnnual.decadeInfluence.summary)}</p></article>
          </div></details>
          <OutlookJudgmentPanel judgment={selectedAnnual.judgment} segments={selectedAnnual.judgmentSegments} sources={judgmentSources} />
          <div className="outlook-theme-grid">{selectedAnnual.themes.map((theme) => <article className="outlook-theme" key={theme.id}>
            <h4>{clean(theme.title)}</h4><p>{clean(theme.text)}</p></article>)}</div>
          <Evidence label="查看完整年度依据与判断条件" conditions={selectedAnnual.conditions} items={[
            ...selectedAnnual.evidence, ...selectedAnnual.yearInfluence.evidence, ...selectedAnnual.decadeInfluence.evidence,
            ...selectedAnnual.themes.flatMap((theme) => theme.evidence),
            ...selectedAnnual.scenarioBranches.flatMap((branch) => [`${branch.label}：${branch.summary}`, ...branch.evidence])
          ]} />
          {!selectedEvents && annualScenarios.length ? <section className="annual-event-scenarios" aria-labelledby={`${id}-events`}>
            <h4 id={`${id}-events`}>这一年可能对应的生活情境</h4>
            <p className="outlook-period">把年度主题放到现实里对照；以下是可能的情境，不是已经发生的事实。</p>
            {annualScenarios.map((scenario) => <article className="annual-event-scenario" key={scenario.id}>
              <PersonalReadingScope subjectId={`event-${selectedAnnual.year}-${scenario.id}`}>
              <h5>{clean(scenario.title)}</h5><p>{clean(scenario.summary)}</p>
              <ul className="annual-event-examples">{scenario.examples.map((example, index) => <li key={index}>{clean(example)}</li>)}</ul>
              <Evidence label="这条情境的条件与依据" conditions={scenario.conditions} items={scenario.evidence} />
              </PersonalReadingScope>
            </article>)}
          </section> : !selectedEvents && !annualLoading && !annualError ? <p className="outlook-period">本年没有可生成的个人情境，保留上方年度事实与说明。</p> : null}
          </>}
          </PersonalReadingScope>
        </> : !annualLoading && !annualError ? <p>本年的完整年度解读尚未生成，可稍后重试或继续阅读其他内容。</p> : null}
      </section>
      {monthRhythm ? <MonthReadingRhythmPanel reading={monthRhythm} personal={personalReading} onSelectMonth={setMonthId} /> : null}
      {selectedStory ? monthRhythm ? <details className="month-reading-full-details"><summary>展开逐月事项与完整解释</summary>
        <AnnualMonthStoryPanel story={selectedStory} monthly={monthly} monthlyDomains={monthlyDomains} revision={revision} task={readingTask} contextual={personalLegacySource?.contextual} personal={personalReading} personalLegacySource={personalLegacySource}
          onSelectMonth={setMonthId} onFeedback={onFeedbackDomain} /></details>
        : <AnnualMonthStoryPanel story={selectedStory} monthly={monthly} monthlyDomains={monthlyDomains} revision={revision} task={readingTask} contextual={personalLegacySource?.contextual} personal={personalReading} personalLegacySource={personalLegacySource}
          onSelectMonth={setMonthId} onFeedback={onFeedbackDomain} /> : null}
      {monthlyLoading ? <p role="status">正在解读 {year} 年的十二个节令月…</p> : monthlyError ? <p role="alert">{monthlyError}</p> : null}
      {personalReadingReady && monthly && monthly.year === year ? <>
        <p className="outlook-lead">{clean(monthly.summary)}</p>
        <div className="outlook-months" role="group" aria-label={`${year}年节令月份`}>{monthly.months.map((item) => <button key={item.id} type="button" aria-pressed={item.id === month?.id} onClick={() => setMonthId(item.id)}>
          <strong>{clean(item.label)} · {item.ganZhi}</strong><small>{dateLabel(item.startInstant)} 起</small><span>{plainOutlookCaption(item.judgment)}</span>
        </button>)}</div>
        {month ? <article className="outlook-period-reading" id="reading-monthly-detail" tabIndex={-1}>
          <PersonalReadingScope subjectId={`month-${month.id}`}>
          {!monthDomains ? <>
            <div className="outlook-reading-title"><h3>{clean(month.headline)}</h3><span>{clean(plainOutlookCaption(month.judgment))}</span></div>
            <p className="outlook-period">{dateLabel(month.startInstant)} 起至 {dateLabel(month.endExclusiveInstant)} 前 · 节令月</p>
          </> : null}
          {monthDomains ? <>
            <MonthlyDomainPanel reading={monthDomains} month={month} revision={revision} task={readingTask} collection={monthlyDomains} contextual={personalLegacySource?.contextual} annualYear={selectedAnnual} personal={personalReading} onFeedbackDomain={onFeedbackDomain} />
            <details className="outlook-evidence"><summary>原流月判断与完整专业依据 <ChevronDown size={16} aria-hidden="true" /></summary>
              {month.paragraphs.map((paragraph, index) => <p key={index}>{clean(paragraph)}</p>)}
              <OutlookJudgmentPanel judgment={month.judgment} segments={month.judgmentSegments} sources={judgmentSources} />
              <div className="outlook-theme-grid">{month.themes.map((theme) => <Theme key={theme.id} theme={theme} />)}</div>
              <Evidence items={[...month.evidence, ...month.branches.flatMap((branch) => [branch.summary, ...branch.evidence]), ...month.sensitivity.flatMap((item) => [`${item.label}：${item.direction}`, ...item.evidence])]} conditions={month.conditions} />
            </details>
          </> : <>
          {month.paragraphs.map((paragraph, index) => <p key={index}>{clean(paragraph)}</p>)}
          <OutlookJudgmentPanel judgment={month.judgment} segments={month.judgmentSegments} sources={judgmentSources} />
          <div className="outlook-theme-grid">{month.themes.map((theme) => <Theme key={theme.id} theme={theme} />)}</div>
          <Evidence items={[...month.evidence, ...month.branches.flatMap((branch) => [branch.summary, ...branch.evidence]), ...month.sensitivity.flatMap((item) => [`${item.label}：${item.direction}`, ...item.evidence])]} conditions={month.conditions} />
          </>}
          </PersonalReadingScope>
        </article> : null}
      </> : null}
    </section>
  </section>;
}
