import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BriefReadingReport, BriefReadingYearDomain, BriefReadingPersonalText } from "./brief-reading-report";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalReadingSnapshotExtras } from "./local-reading-record";
import { createOutlookRescueVerifier, type OutlookEffect } from "./local-outlook-judgment";
import type { KeyMonthEventTendency } from "./key-month-event-tendencies";
import { selectKeyMonthEvents } from "./key-month-event-tendencies";
import { verifyKeyMonthYear, type PreparedKeyMonthYear } from "./key-month-event-source";
import { editionPersonalEntries } from "./local-reading-edition-personal";
import { legacyAnnualInputFromExtras } from "./local-personal-reading-legacy";
import { plainMonthlyPresentation, plainAnnualMonthContrast } from "./plain-monthly-presentation";
import { plainOutlookCaption } from "./plain-outlook-reading";
import { buildConcretePeriodProse, concretePeriodCaption, concreteDirectionExplanation, concreteFinancialYearMonthContrast, concretePeriodMechanism, CONCRETE_PERIOD_PROSE_VERSION, type ConcretePeriodFact, type ConcreteLifeSentence } from "./concrete-period-prose";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "./local-reading-age-context";
import { readingContextDraftSchema, READING_CONTEXT_FORMAT, type ReadingContextWork, type ReadingContextRelationship } from "./local-reading-context";
import { CONTEXTUAL_READING_VERSION } from "./local-contextual-reading";
import { createAnnualRelationshipTimingBuilder } from "./annual-relationship-timing";

export const PLAIN_TEN_YEAR_READING_VERSION = "hakimi.plain-ten-year-reading/0.3.1" as const;
export interface PlainTenYearMonthWindow {
  id: string; branchId: string; annualSegmentId: string;
  startInstant: string; endExclusiveInstant: string;
  effect: OutlookEffect | null; label: string; text: string;
  featured: boolean; selectionReasons: string[];
  opportunities: ConcretePeriodFact[]; cautions: ConcretePeriodFact[];
  eventNotes: {id:string;category:string;text:string;sourceSubjects:string[];personalTextIds:string[]}[];
  origin: "calculated" | "contextual" | "personal";
  monthIds: string[]; periodIds: string[];
  members: { monthId: string; periodId: string; label: string; ganZhi: string;
    startInstant: string; endExclusiveInstant: string; ageLabel: string;
    topics: { domain: "career" | "wealth" | "relationship"; title: string; text: string; summary: string;
      origin: "calculated" | "contextual" | "personal"; sourceSubjects: string[]; personalTextIds: string[];
      facts: ConcretePeriodFact[]; signature: string; sentences:ConcreteLifeSentence[] }[]; annualContrast: string; recurringEventIds:string[]; directionNote:string }[];
  sourceSubjects: string[]; personalTextIds: string[];
}
export interface PlainTenYearEvent {
  id: string; category: string; title: string; levelLabel: string; text: string;
  origin: "calculated" | "contextual" | "personal";
  sourceSubjects: string[]; personalTextIds: string[];
  showInMain:boolean;
  months: { label: string; text: string; levelLabel: string; origin: "calculated" | "contextual" | "personal";
    sourceSubjects: string[]; personalTextIds: string[]; original: KeyMonthEventTendency }[];
}
export interface PlainTenYearSegment {
  id: string; branchId: string; startInstant: string; endExclusiveInstant: string; ageLabel: string;
  headline: string; judgmentText: string; origin: "calculated" | "contextual" | "personal";
  domains: BriefReadingYearDomain[]; events: PlainTenYearEvent[]; monthWindows: PlainTenYearMonthWindow[];
  domainEvidence:{domain:"career"|"wealth"|"relationship";sentences:ConcreteLifeSentence[]}[];mechanisms:ConcreteLifeSentence[];
  monthCoverageText: string; sourceSubjects: string[]; personalTextIds: string[];
}
export interface PlainTenYearReading {
  version: typeof PLAIN_TEN_YEAR_READING_VERSION;
  sourceBinding: BriefReadingReport["sourceBinding"]; sourceVersions: string[];
  coverageText: string; scopeText: string;
  branches: { id: string; label: string; years: { year: number; ganZhi: string | null; segments: PlainTenYearSegment[] }[] }[];
  personalTexts: BriefReadingPersonalText[]; gaps: string[]; bodyText: string;
}
export interface BuildPlainTenYearReadingInput {
  report: BriefReadingReport; assessment: BaziPreliminaryAssessment;
  annual: LocalAnnualOutlook | null; extras: LocalReadingSnapshotExtras;
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const fail = (message: string): never => { throw new Error(`十年白话读稿：${message}`); };
const dateTime = (instant: string) => new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
const range = (from: string, to: string) => `${dateTime(from)}起至${dateTime(to)}前`;
type DomainTitles=Record<"career"|"wealth"|"relationship",string>;
function periodTitles(age:LocalReadingAgeContext,work?:ReadingContextWork,relationship?:ReadingContextRelationship):DomainTitles{
  if(age.stage === "young_child"||age.stage === "youth")return{career:age.stage === "young_child"?"照料与活动":"学习与活动",wealth:"时间与用品",relationship:"家人与同伴"};
  if(age.stage !== "adult")return{career:age.stage === "adult_transition"?"学习与生活安排":"日常事务",wealth:"时间与用品",relationship:"相处与关系"};
  const titles:Partial<Record<ReadingContextWork,[string,string]>>={student:["学习与发展","学习投入与日常开支"],retired:["经验与日常活动","日常开支"],caregiving:["家庭照料与事务","家庭开支"],seeking_work:["求职与准备","求职投入与日常开支"]};
  const [career,wealth]=titles[work??"unspecified"]??["事业","财运"];
  return{career,wealth,relationship:relationship === "separated"?"旧关系交接":"感情"};
}
function periodScope(age:LocalReadingAgeContext,work?:ReadingContextWork,relationship?:ReadingContextRelationship):string{
  if(age.stage === "young_child"||age.stage === "youth")return"儿童时段分别看学习活动、时间用品与家人同伴相处，不默认已有职业收入或成年婚恋安排。";
  if(age.stage !== "adult")return age.stage === "adult_transition"?"跨过成长阶段的时段，按已列年龄分别理解学习、生活安排和相处；成年段也须有对应的现实身份。":"年龄或时辰条件不足的时段，保持日常事务与相处语境，不推定职业、收入或关系身份。";
  const labels=periodTitles(age,work,relationship),known=work&&!["unspecified","employed","self_employed"].includes(work);
  const workScope=known?`已填写背景适用的时段分别看${labels.career}、${labels.wealth}与${labels.relationship}。`:"事业、财运与感情分别判断，一项受阻不代表其他方面也受阻；具体事项须有相应工作、款项或关系基础。";
  return workScope+(relationship === "separated"?"分开或分居背景只说明必要联系、责任与交接，不预设复合。":relationship === "single"?"单身背景先看相识和联系，不把共同生活或婚事写成已经有的安排。":relationship === "partnered"||relationship === "married"?"已有关系看共同安排与责任，不把接触增加直接写成新恋情。":"关系状态未填写，接触、承诺等事项须结合现实基础；没有明显转折的时段只看日常相处。");
}

function windowTopics(window: PlainTenYearMonthWindow): string {
  const topics = window.members.flatMap(member => member.topics);
  const title=(domain:"career"|"wealth"|"relationship")=>unique(topics.filter(topic=>topic.domain===domain).map(topic=>topic.title)).join("、")||({career:"日常事务",wealth:"时间与用品",relationship:"相处"} as const)[domain];
  const adopted = unique(topics.filter(topic => topic.origin === "personal").map(topic => topic.text));
  const recurring=new Set(window.members.flatMap(member=>member.recurringEventIds));
  const facts = topics.filter(topic => topic.origin !== "personal" && topic.domain !== "relationship").flatMap(topic => topic.facts).filter(fact=>!fact.eventId||!recurring.has(fact.eventId));
  const distinct = (kind: ConcretePeriodFact["kind"]) => [...new Map(facts.filter(fact => fact.kind === kind).map(fact => [`${fact.domain}:${fact.text}`,fact])).values()];
  window.opportunities = distinct("opportunity"); window.cautions = distinct("caution");
  if(window.origin !== "personal")window.label=concretePeriodCaption(window.effect,facts,{career:title("career"),wealth:title("wealth")});
  // Select each sign independently, including hidden support. Career and money
  // are separate life situations, so neither can crowd the other out by order.
  const prose=(["career","wealth"] as const).flatMap(domain=>{
    const pick=(kind:ConcretePeriodFact["kind"])=>{
      const candidates=facts.filter(fact=>fact.domain===domain&&fact.kind===kind);
      return candidates.find(fact=>fact.eventId)??candidates.find(fact=>fact.actionIndex!==null)??candidates[0];
    };
    const topic=pick("topic"),opportunity=pick("opportunity"),caution=pick("caution");
    const label=title(domain);
    return [topic?`${label}：${topic.shortText??topic.text}。`:"",opportunity?`${label}机会：${opportunity.shortText??opportunity.text}。`:"",caution?`${label}阻力：${caution.shortText??caution.text}。`:""].filter(Boolean);
  });
  const notes=window.eventNotes.map(note=>`${title(["romance","commitment","separation"].includes(note.category)?"relationship":["money_inflow","money_loss"].includes(note.category)?"wealth":"career")}：${note.text}`);
  return [...prose,...notes,...unique(window.members.map(member=>member.directionNote).filter(Boolean)),...unique(window.members.map(member=>member.annualContrast).filter(Boolean)),...adopted].filter(Boolean).join(" ");
}

function concreteEventText(event:Pick<KeyMonthEventTendency,"category"|"origin"|"text"|"level"|"direction"|"workState"|"relationshipState"|"counterEvidenceIds">):string {
  if(event.origin === "personal") return event.text;
  if(["promotion","job_change","romance","commitment","separation"].includes(event.category))return event.text+(event.level === "weak"&&!event.text.includes("较弱")?"这项线索较弱。":"");
  // These verified scenes have their own learning, care, household or job-
  // seeking scope. A shorter paraphrase must not turn them into paid work.
  if(["student","retired","caregiving","seeking_work"].includes(event.workState)
    &&["promotion","job_change","money_inflow","money_loss"].includes(event.category))return event.text;
  const weak=event.level === "weak"?"线索较弱，可留意":"有线索，可能涉及";
  const scenes:Record<KeyMonthEventTendency["category"],string>={
    promotion:event.workState === "self_employed"?"接手更重要的客户事务或扩大负责范围，先确认权限与条件":"职责增加、考核或岗位调整的谈话，已有相应机会时再看能否落实",
    job_change:event.workState === "seeking_work"?"面试、选择岗位或重新安排求职方向":"换项目、调整岗位或重新谈合作方式；也可能只是原岗位里的分工变化",
    money_inflow:"已有款项的确认、结算，或一笔已谈妥报酬的新任务；到账仍要看实际约定",
    money_loss:"临时垫付、返工添置或约定外的花费，先确认金额和谁承担",
    romance:event.relationshipState === "single"?"认识新的人、继续见面或谈是否交往":"有在接触的人时，联系与见面增加；已有伴侣则看相处推进，不能直接理解为新恋情",
    commitment:"已有稳定关系中的见家人、谈婚期或商量长期生活；没有相应关系基础时，不直接套成结婚",
    separation:"对联系、居住或共同责任重新商量；若关系已有矛盾，可能谈暂停联系或各自安排，也可能只是作息和距离变化",
  };
  const label:Record<KeyMonthEventTendency["category"],string>={promotion:"职责变化",job_change:"工作变动",money_inflow:"进账",money_loss:"额外花费",romance:"感情接触",commitment:"谈婚论嫁",separation:"关系调整"};
  const friction=event.direction === "mixed"||event.counterEvidenceIds.length?"同时有牵制，安排可能反复或改期。":"";
  return `${label[event.category]}：${weak}${scenes[event.category]}。${friction}`;
}

function featureWindows(windows: PlainTenYearMonthWindow[], events: PlainTenYearEvent[], handover: boolean): void {
  const mark = (window: PlainTenYearMonthWindow | undefined, reason:string) => { if(window){window.featured=true;window.selectionReasons=unique([...window.selectionReasons,reason]);} };
  for (const window of windows) if(window.origin === "personal") mark(window,"已采用个人修订");
  for (const event of events) for (const month of event.months) mark(windows.find(window=>window.periodIds.includes(month.original.scope.segmentId)),`年度重点：${event.category}`);
  // This is editorial coverage, not a luck score: preserve a genuinely useful
  // month, an additional mixed opportunity, and a month with actual pressure.
  for(const window of windows) if(window.effect === "assists") mark(window,"整体较有利的月份");
  if (!windows.some(window=>window.featured&&window.opportunities.length)) mark(windows.find(window=>window.opportunities.length),"有具体机会的月份");
  if (!windows.some(window=>window.featured&&window.cautions.length)) mark(windows.find(window=>window.cautions.some(fact=>fact.actionIndex !== null)),"有具体阻力的月份");
  // One further event mechanism avoids treating the earliest month as the only
  // available opportunity. Repeated wording does not earn another main card.
  if (windows.filter(window=>window.featured).length < 3) {
    const selected = new Set(windows.filter(window=>window.featured).flatMap(window=>[...window.opportunities,...window.cautions].map(fact=>`${fact.kind}:${fact.domain}:${fact.mechanism}`)));
    mark(windows.find(window=>!window.featured&&[...window.opportunities,...window.cautions].some(fact=>!selected.has(`${fact.kind}:${fact.domain}:${fact.mechanism}`))),"不同的具体事项");
  }
  if (handover) {mark(windows.at(0),"本年段开始");mark(windows.at(-1),"本年段结束");}
  if (!windows.some(window=>window.featured)) mark(windows.at(0),"当前可用月份");
}

/** A reading projection of already computed annual/monthly products. It never
 * changes scores, chooses a birth direction, or manufactures missing months. */
export function buildPlainTenYearReading(input: BuildPlainTenYearReadingInput): PlainTenYearReading {
  const { report, assessment, annual, extras } = input, revision = extras.sourceRevision;
  if (!revision) return fail("缺少原修订。");
  const sourceBinding = { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only" };
  const selected = { revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: sourceBinding.includeHour };
  if (!same(report.sourceBinding, sourceBinding) || assessment.sourceBinding.revisionId !== selected.revisionId
    || assessment.sourceBinding.chartResultHash !== selected.chartResultHash || assessment.sourceBinding.includeHour !== selected.includeHour
    || (annual && (annual.revisionId !== revision.id || annual.chartResultHash !== revision.manifest.resultHash))) return fail("命盘或时柱范围不一致。");
  if (!same(report.years.map(year => year.year), annual?.years.map(year => year.year) ?? [])) return fail("报告年份与原年度窗口不一致。");
  const context = extras.contextual;
  if (context && (context.version !== CONTEXTUAL_READING_VERSION || context.contextSource.document.format !== READING_CONTEXT_FORMAT
    || !same(context.sourceBinding,sourceBinding) || !same(context.contextSource.document.sourceBinding,sourceBinding))) return fail("现实背景与当前命盘不一致。");
  const contextDraft = context ? readingContextDraftSchema.parse(context.contextSource.document.context) : null;
  const rescueFor=createOutlookRescueVerifier(revision,assessment),timingFor=createAnnualRelationshipTimingBuilder(revision,assessment);
  const adopted = editionPersonalEntries(assessment, annual, extras);
  const preparedByYear = new Map<number, PreparedKeyMonthYear>();
  for (const prepared of extras.keyMonthYears ?? []) {
    if (!annual || !extras.annualDomains || !extras.annualEvents || !extras.annualLifeStories) return fail("月份缺少原年度完整来源。");
    if (preparedByYear.has(prepared.year) || !annual.years.some(year => year.year === prepared.year)) return fail("月份年份重复或超出当前年度窗口。");
    const checked = verifyKeyMonthYear({ revision, assessment, annual, annualDomains: extras.annualDomains,
      annualEvents: extras.annualEvents, annualLifeStories: extras.annualLifeStories, contextual: extras.contextual,
      legacySource: legacyAnnualInputFromExtras(assessment, annual, extras) }, prepared);
    const reported = report.keyMonthReadings.filter(reading => reading.year === prepared.year);
    if (reported.length !== 1 || !same(reported[0], checked)) return fail("月份与主报告已核对的来源不一致。");
    preparedByYear.set(prepared.year, prepared);
    for (const text of checked.personalTexts) {
      const entry = prepared.personal.entries.find(item => item.subjectId === text.subjectId && item.state === "adopted" && item.personalText === text.text);
      if (!entry) return fail("月份个人原文缺少已验证采用。");
      const previous = adopted.get(text.subjectId);
      if (previous && previous.personalText !== entry.personalText) return fail("个人原文在不同来源中不一致。");
      adopted.set(text.subjectId, entry);
    }
  }
  if (report.keyMonthReadings.some(reading => !preparedByYear.has(reading.year))) return fail("报告中的月份没有完整输入可核对。");
  const recurringCounts=new Map<string,Set<number>>();
  const recurrenceKey=(prepared:PreparedKeyMonthYear,period:{monthLabel:string},event:KeyMonthEventTendency)=>{
    if(event.category!=="job_change"||event.origin === "personal"||!event.supportEvidenceIds.length)return null;
    const evidence=prepared.reading.evidence.filter(item=>event.supportEvidenceIds.includes(item.id));
    // A pure month-pillar contact repeats with the same solar month. A current
    // authority action or other newly added mechanism is not collapsed here.
    return evidence.length&&evidence.every(item=>item.kind === "career_relation"&&item.origin === "month")?`${event.scope.branchId}|${period.monthLabel}|job_change`:null;
  };
  for(const prepared of preparedByYear.values())for(const branch of prepared.reading.branches)for(const period of branch.periods)for(const event of period.events){
    const key=recurrenceKey(prepared,period,event);if(key){const years=recurringCounts.get(key)??new Set<number>();years.add(prepared.year);recurringCounts.set(key,years);}
  }
  const recurringKeys=new Set([...recurringCounts].filter(([,years])=>years.size>=2).map(([key])=>key));
  const recurringLabels=unique([...recurringKeys].map(key=>key.split("|")[1]!));
  const recurringText=recurringLabels.length?`共同月份规律：${recurringLabels.join("、")}与本命工作位置的同一关系会逐年复现，可作为短期岗位、团队或工作安排变化的观察点，不等于每年都要换工作。下面只在年度也有变动线索、或本月另增其他实际作用时重点列出，全部逐月事实仍保留。`:"";
  const personalTexts = structuredClone(report.personalTexts);
  const personalFor = (subjects: readonly string[]) => unique(subjects).flatMap(subjectId => {
    const entry = adopted.get(subjectId); if (!entry) return [];
    const texts = personalTexts.filter(item => item.subjectId === subjectId && item.text === entry.personalText);
    if (texts.length !== 1) return fail("已采用个人原文未完整进入报告。");
    return [texts[0]!.id];
  });
  const personalMessage = (ids: readonly string[]) => `已采用个人修订，按个人原文阅读（${ids.map(id => personalTexts.find(text => text.id === id)?.title ?? fail("个人原文引用失配。")).join("、")}）。`;
  const gaps: string[] = [...report.coverage.gaps];
  const scopeNotes=new Set<string>();
  const branches: PlainTenYearReading["branches"] = [];
  for (const yearRow of report.years) {
    const year = annual!.years.find(item => item.year === yearRow.year)!;
    if (year.yearGanZhi !== yearRow.yearGanZhi) return fail("年干支与原年度节点不一致。");
    const actualScopes = year.judgmentSegments.map(part => [part.id, part.branchId, part.startInstant, part.endExclusiveInstant]);
    const reportedScopes = yearRow.branches.flatMap(branch => branch.segments.map(part => [part.id, branch.id, part.startInstant, part.endExclusiveInstant]));
    if (reportedScopes.length && !same(actualScopes, reportedScopes)) return fail("年段、顺逆或交运边界与原判断不一致。");
    const prepared = preparedByYear.get(year.year);
    if (!prepared) gaps.push(`${year.year}年尚未准备完整流月，未借用其他年份补齐。`);
    for (const branchRow of yearRow.branches) {
      let branch = branches.find(item => item.id === branchRow.id);
      if (!branch) { branch = { id: branchRow.id, label: branchRow.label, years: [] }; branches.push(branch); }
      const segments: PlainTenYearSegment[] = [];
      for (const row of branchRow.segments) {
        if (row.branchId !== branchRow.id) return fail("段落被放入另一顺逆分支。");
        const actual = year.judgmentSegments.find(part => part.id === row.id && part.branchId === row.branchId)!;
        const personalTextIds = personalFor(row.sourceSubjects);
        const domains = structuredClone(row.domains);
        const age = buildLocalReadingAgeContext(sourceBinding.includeHour ? revision.timeCalibration.utcInstant : null,row.startInstant,row.endExclusiveInstant);
        const work = age.stage === "adult" && contextDraft && contextDraft.fromYear <= year.year && year.year <= contextDraft.toYear ? contextDraft.work : undefined;
        const relationship=age.stage === "adult" && contextDraft && contextDraft.fromYear <= year.year && year.year <= contextDraft.toYear ? contextDraft.relationship : undefined;
        const titles=periodTitles(age,work,relationship);
        scopeNotes.add(periodScope(age,work,relationship));
        const backgrounds=actual.judgment.backgroundRefs.map(ref=>{
          const found=year.dayunSegments.find(part=>part.direction===actual.branchId&&same(part.nodeRef,ref))??fail("年段缺少同分支大运来源。");
          return {nodeType:"dayun" as const,ganZhi:found.ganZhi,ref:found.nodeRef};
        });
        const rescueTrace=rescueFor({judgment:actual.judgment,target:{nodeType:"year",ganZhi:year.yearGanZhi!,ref:year.transitNodeRef!},backgrounds});
        const lifeSignals={events:row.eventTendencies.map(event=>event.original),relationshipTiming:timingFor(year,actual),rescueTrace,horizon:"year" as const};
        const domainEvidence:PlainTenYearSegment["domainEvidence"]=[];
        const annualFacts:ConcretePeriodFact[]=[];
        for (const domain of domains) {
          domain.title=titles[domain.domain];
          const ids = personalFor(domain.sourceSubjects);
          if (ids.length) { domain.origin = "personal"; domain.headline = "已采用个人修订"; domain.text = personalMessage(ids); domain.personalTextIds = ids; }
          else if (domain.origin === "personal") return fail("领域个人标记没有匹配的采用来源。");
          else {
            const prose = buildConcretePeriodProse({judgment:actual.judgment,domain:domain.domain,age,work,verdict:domain.verdict,task:extras.comprehensive?.patternDiagnosis?.wealthResourceTask,lifeSignals});
            domain.headline=prose.headline;domain.text=prose.text;
            annualFacts.push(...prose.facts);
            domainEvidence.push({domain:domain.domain,sentences:prose.sentences??[]});
          }
          domain.showInBrief=true;
        }
        const monthWindows: PlainTenYearMonthWindow[] = [];
        const monthBranch = prepared?.reading.branches.find(item => item.id === branchRow.id);
        for (const period of monthBranch?.periods ?? []) {
          if (period.startInstant >= row.endExclusiveInstant || period.endExclusiveInstant <= row.startInstant) continue;
          if (period.startInstant < row.startInstant || period.endExclusiveInstant > row.endExclusiveInstant
            || period.events.some(event => event.scope.annualSegmentId !== row.id || event.scope.branchId !== row.branchId)) return fail("月份跨过原年段边界，不能合并交运前后。");
          const month = prepared!.monthly.months.find(item => item.id === period.monthId)!;
          const reading = prepared!.monthlyDomains.months.find(item => item.monthId === period.monthId)!;
          const monthlySegment = reading?.branches.find(item => item.id === row.branchId)?.segments.find(item => item.id === period.id);
          const original = month?.judgmentSegments.find(item => item.id === period.id && item.branchId === row.branchId);
          if (!monthlySegment || !original || !same(original.judgment.interval, { startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant })) return fail("月份原判断与对应分段缺失。");
          const topics: PlainTenYearMonthWindow["members"][number]["topics"] = monthlySegment.domains.map(domain => {
            const sourceSubjects = unique(period.events.filter(event => event.domain === domain.id).flatMap(event => event.sourceSubjects));
            const ids = personalFor(sourceSubjects);
            plainMonthlyPresentation({ revision, collection: prepared!.monthlyDomains, contextual: extras.contextual,
              reading, segment: monthlySegment, domain, month, annualYear: year, personal: prepared!.personal,
              task: extras.comprehensive?.patternDiagnosis?.wealthResourceTask });
            const monthAge=buildLocalReadingAgeContext(sourceBinding.includeHour?revision.timeCalibration.utcInstant:null,period.startInstant,period.endExclusiveInstant);
            const monthWork=monthAge.stage === "adult"&&contextDraft&&contextDraft.fromYear<=year.year&&year.year<=contextDraft.toYear?contextDraft.work:undefined;
            const monthRelationship=monthAge.stage === "adult"&&contextDraft&&contextDraft.fromYear<=year.year&&year.year<=contextDraft.toYear?contextDraft.relationship:undefined;
            const monthTitles=periodTitles(monthAge,monthWork,monthRelationship);
            const prose=buildConcretePeriodProse({judgment:original.judgment,domain:domain.id,age:monthAge,work:monthWork,task:extras.comprehensive?.patternDiagnosis?.wealthResourceTask,
              lifeSignals:{events:period.events,monthlyEvidence:prepared!.reading.evidence,horizon:"month"}});
            return { domain: domain.id, title: monthTitles[domain.id], text: ids.length ? personalMessage(ids) : prose.headline,
              summary: ids.length ? personalMessage(ids) : prose.text,
              origin: ids.length ? "personal" : prepared!.reading.contextRef ? "contextual" : "calculated", sourceSubjects, personalTextIds: ids,
              facts:ids.length||domain.id === "relationship"?[]:prose.facts,signature:ids.length?`personal:${ids.join("|")}`:prose.signature,sentences:ids.length?[]:prose.sentences??[] };
          });
          const ids = unique(topics.flatMap(topic => topic.personalTextIds));
          const effect = ids.length ? null : original.judgment.axes.find(axis => axis.axis === original.judgment.primaryAxis)?.effect ?? null;
          const label = ids.length ? "本段已有个人修订，不作自动顺逆归类" : concretePeriodCaption(effect,topics.flatMap(topic=>topic.facts));
          const subjects = unique(topics.flatMap(topic => topic.sourceSubjects));
          const monthlyAge=buildLocalReadingAgeContext(sourceBinding.includeHour?revision.timeCalibration.utcInstant:null,period.startInstant,period.endExclusiveInstant);
          const member = { monthId: period.monthId, periodId: period.id, label: period.monthLabel, ganZhi: period.monthGanZhi,
            startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant, ageLabel: period.age.label, topics,
            directionNote:ids.length?"":concreteDirectionExplanation(original.judgment,topics.flatMap(topic=>topic.facts)),
            recurringEventIds:period.events.filter(event=>{const key=recurrenceKey(prepared!,period,event);return key&&recurringKeys.has(key)&&!row.eventTendencies.some(annualEvent=>annualEvent.category===event.category&&!['none','not_applicable'].includes(annualEvent.level));}).map(event=>event.id),
            annualContrast:personalTextIds.length||ids.length?"":plainAnnualMonthContrast(actual.judgment,original.judgment)+concreteFinancialYearMonthContrast({annual:actual.judgment,judgment:original.judgment,
              age:monthlyAge,work:monthlyAge.stage === "adult"?work:undefined,task:extras.comprehensive?.patternDiagnosis?.wealthResourceTask}) };
          const previous = monthWindows.at(-1);
          if (previous && !ids.length && previous.origin !== "personal" && previous.effect === effect
            && same(previous.members.at(-1)!.topics.map(topic=>topic.signature),topics.map(topic=>topic.signature))
            && previous.endExclusiveInstant === period.startInstant && previous.annualSegmentId === row.id && previous.branchId === row.branchId) {
            previous.endExclusiveInstant = period.endExclusiveInstant; previous.members.push(member);
            previous.monthIds = unique([...previous.monthIds, period.monthId]); previous.periodIds.push(period.id);
            previous.sourceSubjects = unique([...previous.sourceSubjects, ...subjects]);
          } else monthWindows.push({ id: `${year.year}:${row.branchId}:${period.id}`, branchId: row.branchId, annualSegmentId: row.id,
            startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant, effect, label, text: "",
            featured:false,selectionReasons:[],opportunities:[],cautions:[],eventNotes:[],
            origin: ids.length ? "personal" : prepared!.reading.contextRef ? "contextual" : "calculated",
            monthIds: [period.monthId], periodIds: [period.id], members: [member], sourceSubjects: subjects, personalTextIds: ids });
        }
        for (const window of monthWindows) window.text = windowTopics(window);
        const events: PlainTenYearEvent[] = [];
        for (const event of row.eventTendencies) {
          const ids = personalFor(event.sourceSubjects);
          // This chapter highlights supported annual events and their most
          // relevant month. Independent monthly signals remain available in
          // the full month reading; weak monthly possibilities must not turn
          // every unsupported year into the same list of life events.
          if (!ids.length && ["none", "not_applicable"].includes(event.level)) continue;
          const selections = prepared ? selectKeyMonthEvents(prepared.reading, { category: event.category, branchId: actual.branchId,
            startInstant: row.startInstant, endExclusiveInstant: row.endExclusiveInstant, limit: 1 }) : [];
          const months = selections.map(selection => {
            const period = monthBranch?.periods.find(item => item.id === selection.scope.segmentId) ?? fail("关键月份引用了另一分支。");
            const adoptedIds = personalFor(selection.sourceSubjects);
            return { label: `${period.monthLabel}（${range(selection.scope.startInstant, selection.scope.endExclusiveInstant)}）`,
              text: adoptedIds.length ? personalMessage(adoptedIds) : concreteEventText(selection),
              levelLabel: adoptedIds.length ? "已采用个人修订" : selection.levelLabel,
              origin: adoptedIds.length ? "personal" as const : selection.origin, sourceSubjects: [...selection.sourceSubjects], personalTextIds: adoptedIds,
              original: structuredClone(selection) };
          });
          events.push({ id: event.id, category: event.category, title: ids.length ? event.original.label : event.headline,
            levelLabel: ids.length ? "已采用个人修订" : event.levelLabel, text: ids.length ? personalMessage(ids) : concreteEventText({...event.original,origin:event.origin}),
            showInMain:ids.length>0||!domainEvidence.some(domain=>domain.sentences.some(sentence=>sentence.sources.some(source=>source.kind === "event"&&source.id===event.original.id))),
            origin: ids.length ? "personal" : event.origin, sourceSubjects: [...event.sourceSubjects], personalTextIds: ids, months });
        }
        for(const event of events) for(const month of event.months){
          const window=monthWindows.find(window=>window.periodIds.includes(month.original.scope.segmentId));
          if(!window) return fail("关键事件缺少对应月份窗口。");
          // Money scenes are already stated by the actual monthly actor. Other
          // domains, especially independent relationship events, need an
          // explicit note so a pressured work month cannot hide them.
          const money=event.category === "money_inflow"||event.category === "money_loss";
          const hasMoneyScene=event.category === "money_inflow"?window.opportunities.some(fact=>fact.domain === "wealth"):window.cautions.some(fact=>fact.domain === "wealth");
          const hasEventScene=window.members.flatMap(member=>member.topics.flatMap(topic=>topic.facts)).some(fact=>fact.eventId===month.original.id);
          if(month.origin === "personal"||(!money||!hasMoneyScene)&&!hasEventScene) window.eventNotes.push({id:month.original.id,category:event.category,
            text:(window.members.length>1?`${month.label}：`:"")+month.text,sourceSubjects:[...month.sourceSubjects],personalTextIds:[...month.personalTextIds]});
        }
        if(prepared){
          // A year without a matching event may still contain a specifically
          // triggered month. Only its own possible/clear evidence enters this
          // main reading; a weak stand-alone possibility stays in details.
          for(const category of ["promotion","job_change","money_inflow","money_loss","romance","commitment","separation"] as const){
            if(events.some(event=>event.category===category))continue;
            const candidate=selectKeyMonthEvents(prepared.reading,{category,branchId:actual.branchId,startInstant:row.startInstant,endExclusiveInstant:row.endExclusiveInstant,limit:1})[0];
            if(!candidate||!(["clear","possible"].includes(candidate.level)||candidate.origin === "personal"))continue;
            const window=monthWindows.find(item=>item.periodIds.includes(candidate.scope.segmentId))??fail("独立月事件缺少同段窗口。");
            if(window.members.some(member=>member.recurringEventIds.includes(candidate.id)))continue;
            const ids=personalFor(candidate.sourceSubjects),hasScene=window.members.flatMap(member=>member.topics.flatMap(topic=>topic.facts)).some(fact=>fact.eventId===candidate.id);
            if(ids.length||!hasScene)window.eventNotes.push({id:candidate.id,category,text:ids.length?personalMessage(ids):`本月单独出现的${candidate.title}线索：${concreteEventText(candidate)}`,
              sourceSubjects:[...candidate.sourceSubjects],personalTextIds:ids});
            window.featured=true;window.selectionReasons.push(`独立月触发：${category}/${candidate.level}`);
          }
        }
        for(const window of monthWindows){
          window.sourceSubjects=unique([...window.sourceSubjects,...window.eventNotes.flatMap(note=>note.sourceSubjects)]);
          window.personalTextIds=unique([...window.personalTextIds,...window.eventNotes.flatMap(note=>note.personalTextIds)]);
          if(window.personalTextIds.length){
            window.origin="personal";window.effect=null;window.label="本段已有个人修订，不作自动顺逆归类";
            for(const member of window.members){member.annualContrast="";member.directionNote="";}
          }
          window.text=windowTopics(window);
        }
        featureWindows(monthWindows,events,year.judgmentSegments.filter(part=>part.branchId===row.branchId).length>1);
        const monthCoverageText = !prepared ? "本年流月尚未准备，当前只保留年度判断。"
          : !monthWindows.length ? "本段没有可作个人解读的完整月份；出生前或未知时段不补造。"
            : `已保留本段${unique(monthWindows.flatMap(window=>window.monthIds)).length}个月份的完整来源，下面精选有具体事情的关键时段；其他月份可在完整流月中查看。换运月前后分别说明。`;
        const mechanisms=personalTextIds.length?[]:concretePeriodMechanism({judgment:actual.judgment,domain:"career",age,work,lifeSignals});
        const primary=actual.judgment.axes.find(axis=>axis.axis===actual.judgment.primaryAxis);
        const explicitHelp=(fact:ConcretePeriodFact)=>fact.kind === "opportunity"&&(fact.eventId
          ?row.eventTendencies.some(event=>event.original.id===fact.eventId&&event.original.supportEvidenceIds.length>0&&event.original.direction!=="pressured")
          :fact.actionIndex!==null&&actual.judgment.axes.find(axis=>axis.id===fact.axisId)?.stemActions?.items[fact.actionIndex]?.effect === "assists");
        const supportedDomains=unique([...annualFacts.filter(explicitHelp).map(fact=>titles[fact.domain]),...domainEvidence.filter(domain=>domain.domain === "relationship"&&domain.sentences.some(sentence=>sentence.kind === "opportunity"&&sentence.sources.some(source=>source.kind === "event"&&row.eventTendencies.some(event=>event.original.id===source.id&&event.original.supportEvidenceIds.length>0)))).map(domain=>titles[domain.domain])]);
        const annualCaption=primary?.effect === "mixed"||actual.judgment.label === "利弊并见"?supportedDomains.length?`${supportedDomains.join("、")}有局部推进线索，综合仍有牵制`:mechanisms.some(sentence=>sentence.kind === "opportunity")?"已有局部缓解，综合取舍仍有条件":"综合取舍仍有条件，尚未形成具体推进结论":plainOutlookCaption(actual.judgment,row.caption);
        segments.push({ id: row.id, branchId: row.branchId, startInstant: row.startInstant, endExclusiveInstant: row.endExclusiveInstant,
          ageLabel: row.ageLabel, headline: personalTextIds.length ? "本段含已采用的个人修订" : row.headline,
          judgmentText: personalTextIds.length ? "相关领域按已采用的个人原文阅读，不用自动年度总判覆盖。" : `这一年度时段：${annualCaption}。${mechanisms.map(sentence=>sentence.text).join("")}`,
          origin: personalTextIds.length ? "personal" : extras.contextual ? "contextual" : "calculated",
          domains, domainEvidence,mechanisms,events, monthWindows, monthCoverageText, sourceSubjects: [...row.sourceSubjects], personalTextIds });
      }
      branch.years.push({ year: year.year, ganZhi: year.yearGanZhi, segments });
    }
  }
  const coverageText = annual ? `逐年阅读${annual.startYear}—${annual.endYear}，共${annual.years.length}个立春年；已核${preparedByYear.size}年的月份资料。`
    : "当前没有完整年度窗口，未补造十年判断。";
  const scopeText=["全年和月份分别判断。以下日期均为北京时间，月份以节气交接。",...(scopeNotes.size?[...scopeNotes]:["当前缺少完整年度或年龄条件，未据此推定职业、收入或关系身份。"]),"具体事情是有条件的生活情境，不是已经发生的事实。这里先说关键时段，全部月份保留在完整流月中。"].join(" ");
  const out = ["## 年份、月份与可能发生的事", coverageText, scopeText,...(recurringText?[recurringText]:[])];
  if (branches.length > 1) out.push("起运方向尚未确定，下列分支各自完整，不相加，也不择优。 ");
  for (const branch of branches) {
    if (branches.length > 1) out.push(`### ${branch.label}`);
    for (const year of branch.years) {
      out.push(`### ${year.year}年${year.ganZhi ? ` · ${year.ganZhi}` : ""}`);
      for (const segment of year.segments) {
        out.push(`#### ${range(segment.startInstant, segment.endExclusiveInstant)}`, segment.ageLabel, segment.judgmentText);
        for (const domain of segment.domains) {
          const title = domain.headline.startsWith(domain.title) ? domain.headline : `${domain.title}：${domain.headline}`;
          out.push(`**${title}**`, domain.text);
        }
        for (const event of segment.events.filter(event=>event.showInMain&&(!event.months.length||event.origin === "personal"))) out.push(`- ${event.title} · ${event.levelLabel}：${event.text}`);
        out.push("**这一年的月份节奏**", segment.monthCoverageText);
        for (const window of segment.monthWindows.filter(window=>window.featured)) out.push(`- ${range(window.startInstant, window.endExclusiveInstant)}：${window.label}。`, window.text);
      }
    }
  }
  if (gaps.length) out.push("覆盖缺口：", ...unique(gaps));
  return { version: PLAIN_TEN_YEAR_READING_VERSION, sourceBinding, sourceVersions: unique([PLAIN_TEN_YEAR_READING_VERSION,CONCRETE_PERIOD_PROSE_VERSION, ...report.sourceVersions]),
    coverageText, scopeText:[scopeText,recurringText].filter(Boolean).join(" "), branches, personalTexts, gaps: unique(gaps), bodyText: out.join("\n\n") };
}
