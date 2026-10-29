import type { LocalPersonalReading } from "./local-personal-reading";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalReadingSnapshotExtras } from "./local-reading-record";
import { buildPlainNatalCards, PLAIN_NATAL_SUMMARY_VERSION } from "./plain-natal-summary";
import { buildBriefAnnualReading, BRIEF_ANNUAL_READING_VERSION, type BriefAnnualDomain } from "./brief-annual-reading";
import { editionPersonalEntries } from "./local-reading-edition-personal";
import { legacyAnnualInputFromExtras } from "./local-personal-reading-legacy";
import { lifeStageStorySubjectId } from "./local-life-stage-story-record";
import { plainLifeStagePresentation } from "./plain-life-stage-presentation";
import { plainOutlookCaption, PLAIN_OUTLOOK_READING_VERSION } from "./plain-outlook-reading";
import { composeAnnualEvents, annualEventCompositionSubjectId } from "./local-annual-event-composition";
import type { AnnualEventTendency } from "./annual-event-tendencies";
import { buildNatalAdoptedConclusion, type NatalAdoptedConclusion } from "./natal-adopted-conclusion";
import { verifyKeyMonthYear } from "./key-month-event-source";
import { selectKeyMonthEvents, type KeyMonthEventTendency, type KeyMonthEventEvidence, type KeyMonthEventTendencies } from "./key-month-event-tendencies";
import { buildPlainFullReading, type PlainFullReading } from "./plain-full-reading";

export const BRIEF_READING_REPORT_VERSION = "hakimi.brief-reading-report/0.7.1" as const;
export type BriefReadingEventCategory = "promotion" | "job_change" | "money_inflow" | "money_loss" | "romance" | "commitment" | "separation";
export type BriefReadingEventLevel = "clear" | "possible" | "weak" | "none" | "not_applicable";
export interface BriefReadingEventItem extends BriefReadingYearOverviewItem {
  id: string; category: BriefReadingEventCategory; headline: string;
  level: BriefReadingEventLevel; levelLabel: string;
  direction: "supported" | "mixed" | "pressured" | "unindicated";
  origin: BriefReadingBlock["origin"]; sourceSubjects: string[]; personalTextIds: string[];
  original: AnnualEventTendency;
  keyMonths?: BriefReadingKeyMonth[];
  keyMonthsLoaded?: boolean;
}
export interface BriefReadingKeyMonth extends BriefReadingBlock {
  year: number; label: string; monthLabel: string; monthGanZhi: string; branchId: string;
  startInstant: string; endExclusiveInstant: string; levelLabel: string;
  original: KeyMonthEventTendency; evidence: KeyMonthEventEvidence[];
}
export interface BriefReadingEventOutlook {
  category: BriefReadingEventCategory; title: string;
  branches: { branchId: string; branchLabel: string; items: BriefReadingEventItem[] }[];
  emptyText: string; personalPeriods: BriefReadingEventItem[];
}
export interface BriefReadingBlock {
  id: string; title: string; headline: string; text: string;
  origin: "calculated" | "contextual" | "personal";
  sourceSubjects: string[]; detailsRef: string; personalTextIds: string[];
}
export interface BriefReadingDomainCard extends BriefReadingBlock { id: "career" | "wealth" | "relationships" }
export interface BriefReadingNatalConclusion {
  original: NatalAdoptedConclusion;
  pattern: BriefReadingBlock;
  firstChoice: BriefReadingBlock;
  secondChoices: BriefReadingBlock[];
  avoid: BriefReadingBlock[];
}
export interface BriefReadingStage extends BriefReadingBlock {
  branchId: string; branchLabel: string; startInstant: string | null; endExclusiveInstant: string | null;
}
export interface BriefReadingYearDomain extends BriefReadingBlock {
  domain: "career" | "wealth" | "relationship"; eventIds: string[]; showInBrief: boolean;
  verdict: BriefAnnualDomain["verdict"];
}
export interface BriefReadingYearSegment {
  id: string; branchId: string; headline: string; caption: string;
  startInstant: string; endExclusiveInstant: string; ageLabel: string;
  domains: BriefReadingYearDomain[]; sourceSubjects: string[]; detailsRef: string;
  sharedNarrativeWith?: string;
  eventTendencies: BriefReadingEventItem[];
}
export interface BriefReadingYear {
  id: string; year: number; yearGanZhi: string | null; featured: boolean; focusReasons: string[];
  branches: { id: string; label: string; segments: BriefReadingYearSegment[] }[];
}
export interface BriefReadingPersonalText {
  id: string; subjectId: string; title: string; text: string; readingVersions: string[];
}
export interface BriefReadingYearOverviewItem {
  year: number; branchId: string; branchLabel: string; segmentId: string;
  startInstant: string; endExclusiveInstant: string;
  label: string; text: string; detailsRef: "#reading-yearly";
}
export interface BriefReadingYearOverview {
  domain: "career" | "wealth" | "relationship"; title: string;
  groups: { id: string; label: string; items: BriefReadingYearOverviewItem[] }[];
  personalYears: number[];
  personalPeriods: BriefReadingYearOverviewItem[];
  emptyText: string; summary: string;
}
export interface BriefReadingReport {
  version: typeof BRIEF_READING_REPORT_VERSION;
  /** Complete answer-first prose; the compact projection below remains available for evidence and older consumers. */
  plainReading?: PlainFullReading;
  sourceBinding: LocalPersonalReading["sourceBinding"]; sourceVersions: string[];
  title: string; domainCards: BriefReadingDomainCard[]; currentStages: BriefReadingStage[];
  natalConclusion: BriefReadingNatalConclusion | null;
  keyMonthReadings: KeyMonthEventTendencies[];
  years: BriefReadingYear[]; featuredYearIds: string[]; personalTexts: BriefReadingPersonalText[];
  yearOverview: BriefReadingYearOverview[];
  eventOutlook: BriefReadingEventOutlook[]; eventSupportNote: string;
  relationshipScopeText: string;
  coverage: { fromYear: number | null; toYear: number | null; totalYears: number; featuredYears: number; branchLabels: string[]; gaps: string[]; text: string };
  bodyText: string;
  metrics: { chineseCharacters: number; totalCharacters: number; estimatedMinutes: number; withinTarget: boolean; exceptions: string[]; estimateNote: string };
  detailsRef: string;
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const chineseLength = (value: string) => [...value.matchAll(/\p{Script=Han}/gu)].length;
const localDate = (value: string) => new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 10).replaceAll("-", "/");
const sentences=(value:string)=>value.match(/[^。！？]+[。！？](?:[”’])?|[^。！？]+$/gu)?.map(item=>item.trim()).filter(Boolean)??[];
function relationshipSummary(answer:string):string {
  const paragraphs=answer.split(/\n\n+/u).filter(Boolean),opening=sentences(paragraphs[0]??"");
  const scene=sentences(paragraphs[1]??"").find(value=>/摩擦|分歧|没有|没能|未能|期待|边界|却|仍需/u.test(value));
  const friction=opening.find(value=>/摩擦|分歧|以为|没有|忽略|却|仍要/u.test(value));
  const selected=unique([opening[0],scene??friction].filter((value):value is string=>!!value));
  for(const value of opening){if(selected.length>=3||chineseLength(selected.join("")+value)>140)break;if(!selected.includes(value))selected.push(value);}
  return selected.join("");
}
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a, (_k, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x],[y])=>x.localeCompare(y))) : v)
  === JSON.stringify(b, (_k, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x],[y])=>x.localeCompare(y))) : v);

const EVENT_TITLES: Record<BriefReadingEventCategory,string> = {
  promotion:"升职",job_change:"换工作",money_inflow:"进财",money_loss:"破财",
  romance:"恋爱",commitment:"谈婚论嫁",separation:"分开",
};
const EVENT_LEVELS:Record<BriefReadingEventLevel,string>={
  clear:"倾向较明显",possible:"有一定倾向",weak:"线索较弱",none:"未见突出线索",not_applicable:"当前条件不适用",
};
function buildEventOutlook(years: BriefReadingYear[], perBranch: number): BriefReadingEventOutlook[] {
  const branches=unique(years.flatMap(year=>year.branches.map(branch=>branch.id))).map(id=>({id,label:years.flatMap(year=>year.branches).find(branch=>branch.id===id)!.label}));
  return (Object.keys(EVENT_TITLES) as BriefReadingEventCategory[]).map(category=>{
    const personalPeriods:BriefReadingEventItem[]=[],all:BriefReadingEventItem[]=[];
    const branchRows=branches.map(branch=>{
      const candidates:BriefReadingEventItem[]=[];
      for(const year of years)for(const segment of year.branches.find(item=>item.id===branch.id)?.segments??[]){
        const item=segment.eventTendencies.find(item=>item.category===category);if(!item)continue;
        all.push(item);
        if(item.origin==="personal"){personalPeriods.push(item);continue;}
        if(["none","not_applicable"].includes(item.level)||item.direction==="unindicated")continue;
        for(const interval of item.original.applicableIntervals){
          const dated=interval.startInstant!==year.branches.find(value=>value.id===branch.id)!.segments[0]!.startInstant
            ||interval.endExclusiveInstant!==year.branches.find(value=>value.id===branch.id)!.segments.at(-1)!.endExclusiveInstant;
          const local=(value:string)=>{const date=localDate(value);return date.startsWith(`${year.year}/`)?date.slice(5):date;};
          candidates.push({...item,id:`${item.id}:${interval.startInstant}`,startInstant:interval.startInstant,endExclusiveInstant:interval.endExclusiveInstant,
            label:`${year.year}年${dated?`（${local(interval.startInstant)}—${local(interval.endExclusiveInstant)}前）`:""}`});
        }
      }
      const rank:Record<BriefReadingEventLevel,number>={clear:0,possible:1,weak:2,none:3,not_applicable:4};
      candidates.sort((a,b)=>rank[a.level]-rank[b.level]||a.year-b.year||a.startInstant.localeCompare(b.startInstant));
      const selected:BriefReadingEventItem[]=[];
      for(const item of candidates){if(selected.some(previous=>previous.year===item.year))continue;selected.push(item);if(selected.length>=perBranch)break;}
      return{branchId:branch.id,branchLabel:branch.label,items:selected};
    });
    const applicable=all.filter(item=>item.level!=="not_applicable");
    const emptyText=personalPeriods.length?"相关时段已采用个人修订，按个人原文阅读。"
      :all.length&&!applicable.length?"按已知年龄或现实背景，所看年份内不作此项判断。":"所看年份内未见足够支持的突出年份。";
    return{category,title:EVENT_TITLES[category],branches:branchRows,emptyText,personalPeriods};
  });
}

function overviewGroup(domain: BriefReadingYearDomain, unknownSex: boolean): { id: string; label: string; rank: number } | null {
  const verdict = domain.verdict;
  if (domain.domain === "relationship") {
    if (!domain.showInBrief || verdict.relationshipChange === "insufficient" || !verdict.relationshipChange) return null;
    const companion = verdict.focus === "companionship";
    const separated = verdict.relationshipState === "separated";
    const labels = companion
      ? { progression: "同伴相处较易靠近", friction: "相处摩擦较易显现", adjustment: "相处节奏容易变化" }
      : separated ? { progression: "联系与关系发展有线索", friction: "旧关系事项易有分歧", adjustment: "旧关系安排容易变化" }
      : { progression: "感情较易推进", friction: "感情摩擦较易显现", adjustment: "关系安排容易变化" };
    const partial = unknownSex && !companion && verdict.lensIds.length === 1;
    return { id: `${verdict.focus}-${verdict.relationshipChange}${separated ? "-separated" : ""}${partial ? "-partial" : ""}`,
      label: `${partial ? "部分关系视角下，" : ""}${labels[verdict.relationshipChange]}`,
      rank: verdict.relationshipChange === "progression" ? 0 : verdict.relationshipChange === "adjustment" ? 1 : 2 };
  }
  if (verdict.direction === "neutral" || verdict.direction === "unknown") return null;
  if (domain.domain === "career") {
    const labels = { favorable: "推进较顺", pressured: "推进压力较多", mixed: "有机会，也有阻力" };
    return { id: verdict.direction, label: labels[verdict.direction], rank: verdict.direction === "favorable" ? 0 : verdict.direction === "mixed" ? 1 : 2 };
  }
  const labels = {
    returns: { favorable: "回报较有利", pressured: "回报兑现有压力", mixed: "回报有机会，兑现也有阻力" },
    spending: { favorable: "投入较有成效", pressured: "支出与消耗压力", mixed: "投入有用，也有追加消耗" },
    allocation: { favorable: "分配与分担较顺", pressured: "分配与分担有压力", mixed: "共同投入有机会，分担也有牵制" },
    support_use: { favorable: "投入较有成效", pressured: "投入成效受阻", mixed: "有支持机会，也有受阻环节" },
  };
  const focus = verdict.focus in labels ? verdict.focus as keyof typeof labels : "support_use";
  const investment = ["spending", "support_use"].includes(focus) && verdict.direction !== "pressured";
  return { id: `${investment ? "investment" : focus}-${verdict.direction}`,
    label: investment ? (verdict.direction === "favorable" ? "投入较有成效" : "投入有机会，也有牵制") : labels[focus][verdict.direction],
    rank: (focus === "returns" ? 0 : 3) + (verdict.direction === "favorable" ? 0 : verdict.direction === "mixed" ? 1 : 2) };
}

function buildYearOverview(years: BriefReadingYear[], cards: BriefReadingDomainCard[], unknownSex: boolean): BriefReadingYearOverview[] {
  const parallel = years.some(year => year.branches.length > 1);
  return (["career", "wealth", "relationship"] as const).map(domain => {
    const grouped: (BriefReadingYearOverview["groups"][number] & { rank: number; branchRank: number })[] = [], personalPeriods: BriefReadingYearOverviewItem[] = [];
    for (const row of years) for (const branch of row.branches) for (const segment of branch.segments) {
      const value = segment.domains.find(item => item.domain === domain);
      if (!value) continue;
      const dated = branch.segments.length > 1;
      const inYear = (instant: string) => { const date=localDate(instant);return date.startsWith(`${row.year}/`)?date.slice(5):date; };
      const rangeLabel = dated ? `（${inYear(segment.startInstant)}—${inYear(segment.endExclusiveInstant)}前）` : "";
      const label = `${row.year}年${rangeLabel}`;
      const item: BriefReadingYearOverviewItem = { year: row.year, branchId: branch.id, branchLabel: branch.label, segmentId: segment.id,
        startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant, label, text: value.text, detailsRef: "#reading-yearly" };
      if (value.origin === "personal") { personalPeriods.push({ ...item, label: `${row.year}年${parallel ? `·${branch.label}` : ""}${rangeLabel}` }); continue; }
      const classification = overviewGroup(value, unknownSex);
      if (!classification) continue;
      const id = parallel ? `${branch.id}-${classification.id}` : classification.id;
      let group = grouped.find(group => group.id === id);
      if (!group) { group = { ...classification, id, label: `${parallel ? `${branch.label}：` : ""}${classification.label}`,
        branchRank: parallel ? row.branches.findIndex(item=>item.id===branch.id) : 0, items: [] }; grouped.push(group); }
      group.items.push(item);
    }
    const groups = grouped.sort((a,b)=>a.branchRank-b.branchRank||a.rank-b.rank).map(({rank:_rank,branchRank:_branchRank,...group})=>group);
    const personalYears = unique(personalPeriods.map(item => item.year));
    const title = cards.find(card => card.id === (domain === "relationship" ? "relationships" : domain))?.title
      ?? ({ career: "事业", wealth: "财运", relationship: "感情" }[domain]);
    const emptyText = personalPeriods.length ? "已有个人修订的时段按个人原文阅读。" : domain === "relationship"
      ? "本窗没有足够的独立关系线索可列为变化年份。" : "本窗尚不能单独列出较顺或压力较多的年份。";
    const summary = [...groups.map(group => `${group.label}：${group.items.map(item => item.label).join("、")}。`),
      ...(personalPeriods.length ? [`已采用个人修订：${personalPeriods.map(item => item.label).join("、")}。`] : [])].join("\n");
    return { domain, title, groups, personalYears, personalPeriods, emptyText, summary: summary || emptyText };
  });
}

/** The brief is a display of current, already calculated products. It creates
 * no feedback topic and never treats a previous personal text as a new rule. */
export function buildBriefReadingReport(assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook | null,
  extras: LocalReadingSnapshotExtras = {}): BriefReadingReport | null {
  const revision=extras.sourceRevision,synthesis=extras.synthesis;
  if(!revision||!synthesis)return null;
  const includeHour=revision.input.timePrecision!=="unknown_hour"&&revision.input.timePrecision!=="date_only";
  const sourceBinding={caseId:revision.caseId,revisionId:revision.id,chartResultHash:revision.manifest.resultHash,includeHour};
  const selected={revisionId:revision.id,chartResultHash:revision.manifest.resultHash,includeHour};
  const matches=(source:{revisionId:string;chartResultHash:string;includeHour?:boolean})=>source.revisionId===selected.revisionId&&source.chartResultHash===selected.chartResultHash&&(source.includeHour===undefined||source.includeHour===includeHour);
  if(!matches(assessment.sourceBinding)||!same(synthesis.sourceBinding,sourceBinding)
    ||(extras.comprehensive&&!matches(extras.comprehensive.sourceBinding))||(annual&&!matches(annual))
    ||(extras.life&&!matches(extras.life))||(extras.priorities&&!matches(extras.priorities.sourceBinding)))throw new Error("主报告与当前命盘或阅读范围不一致。");
  if(annual&&extras.annualLifeStories&&(extras.annualLifeStories.startYear!==annual.startYear||extras.annualLifeStories.endYear!==annual.endYear))throw new Error("主报告年度范围与原年度正文不一致。");
  const adopted=editionPersonalEntries(assessment,annual,extras),personalTexts:BriefReadingPersonalText[]=[];
  const keyMonthReadings:KeyMonthEventTendencies[]=[];
  if(extras.keyMonthYears?.length){
    if(!annual||!extras.annualDomains||!extras.annualEvents||!extras.annualLifeStories)throw new Error("关键月份缺少同一年度窗口的完整来源。");
    const seen=new Set<number>();
    for(const prepared of extras.keyMonthYears){
      if(seen.has(prepared.year))throw new Error("关键月份的年份重复，未选择其中一份。");
      seen.add(prepared.year);
      const reading=verifyKeyMonthYear({revision,assessment,annual,annualDomains:extras.annualDomains,
        annualEvents:extras.annualEvents,annualLifeStories:extras.annualLifeStories,contextual:extras.contextual,
        legacySource:legacyAnnualInputFromExtras(assessment,annual,extras)},prepared);
      keyMonthReadings.push(reading);
      for(const text of reading.personalTexts){
        const entry=prepared.personal.entries.find(item=>item.subjectId===text.subjectId&&item.state==="adopted"&&item.personalText===text.text);
        if(!entry)throw new Error("关键月份缺少已核对的个人原文。");
        const previous=adopted.get(text.subjectId);
        if(previous&&(previous.personalText!==entry.personalText||previous.originalConclusion!==entry.originalConclusion))throw new Error("关键月份个人原文与当前采用不一致。");
        adopted.set(text.subjectId,entry);
      }
    }
  }
  const register=(subjects:readonly string[])=>unique(subjects).flatMap(subject=>{
    const entry=adopted.get(subject);if(!entry)return [];
    let item=personalTexts.find(value=>value.subjectId===subject);
    if(!item){item={id:`brief-personal-${personalTexts.length+1}`,subjectId:subject,title:entry.subjectLabel,text:entry.personalText!,readingVersions:[...entry.readingVersions]};personalTexts.push(item);}
    return [item.id];
  });
  const personalMessage=(ids:string[])=>`此项已采用你的个人修订；请查看个人原文${ids.map(id=>id.replace("brief-personal-","")).join("、")}。`;
  const originalNatal=extras.comprehensive?buildNatalAdoptedConclusion({revision,assessment,comprehensive:extras.comprehensive}):null;
  const natalBlock=(id:string,title:string,headline:string,text:string,subjects:string[]):BriefReadingBlock=>{
    const sourceSubjects=unique(["natal-overview","chapter-overview",...subjects]),personalTextIds=register(sourceSubjects);
    return {id,title,headline:personalTextIds.length?"已采用个人修订":headline,text:personalTextIds.length?personalMessage(personalTextIds):text,
      origin:personalTextIds.length?"personal":"calculated",sourceSubjects,personalTextIds,detailsRef:"#reading-natal-conclusion"};
  };
  const natalConclusion:BriefReadingNatalConclusion|null=originalNatal?{
    original:originalNatal,
    pattern:natalBlock("adopted-pattern","格局主判",originalNatal.pattern.title,originalNatal.pattern.decision,originalNatal.pattern.sourceSubjects),
    firstChoice:natalBlock("adopted-first","首用",originalNatal.firstChoice.title,originalNatal.firstChoice.decision,originalNatal.firstChoice.sourceSubjects),
    secondChoices:originalNatal.secondChoices.map(choice=>natalBlock(`adopted-${choice.id}`,"辅助取用",choice.title,choice.decision,choice.sourceSubjects)),
    avoid:originalNatal.avoid.map(choice=>natalBlock(`adopted-avoid-${choice.id}`,"需忌与限制",choice.title,choice.decision,choice.sourceSubjects)),
  }:null;
  const cards=buildPlainNatalCards(synthesis,extras.comprehensive,{revision,referenceInstant:extras.life?.referenceInstant??null});
  const domainCards:BriefReadingDomainCard[]=cards.map(card=>{
    const sourceSubjects=unique(["natal-overview","chapter-overview",...card.sourceSubjects]),personalTextIds=register(sourceSubjects);
    if(card.origin==="personal"&&!personalTextIds.length)throw new Error("主报告个人总判缺少同源的已采用原文。");
    const relationship=card.id==="relationships"?synthesis.sections.find(section=>section.id==="relationships"&&section.origin!=="personal"):null;
    const automatic=relationship?.answer?relationshipSummary(relationship.answer):card.summary;
    return {id:card.id,title:card.title,headline:personalTextIds.length?"已采用个人修订":card.headline,
      text:personalTextIds.length?personalMessage(personalTextIds):automatic,origin:personalTextIds.length?"personal":card.origin,
      sourceSubjects,personalTextIds,detailsRef:`#reading-${card.id}`};
  });
  const currentStages:BriefReadingStage[]=[];
  for(const branch of extras.life?.branches??[]){
    const decade=extras.life!.decades.find(item=>item.id===branch.currentDecadeId&&item.branchId===branch.id);
    const stage=extras.lifeStageStory?.branches.find(item=>item.id===branch.id)?.stages.find(item=>item.decadeId===decade?.id);
    const section=synthesis.sections.find(item=>item.id===`stage-${branch.id}`);
    const plain=stage&&extras.lifeStageStory&&extras.life?plainLifeStagePresentation(extras.lifeStageStory,stage,extras.life,extras.comprehensive?.patternDiagnosis?.wealthResourceTask):null;
    const sourceSubjects=unique(["life-overview",...(decade?[`decade-${decade.id}`]:[]),...(stage&&extras.lifeStageStory?[lifeStageStorySubjectId(extras.lifeStageStory,stage)]:[]),...(!plain?section?.sourceSubjects??[]:[])]);
    const personalTextIds=register(sourceSubjects);
    const answer=plain?.domains.find(item=>item.domain==="career")?.summary??section?.answer??section?.paragraphs.join("\n\n")??branch.summary;
    const caption=decade?plainOutlookCaption(decade.judgment).replace("较费力，需要留意","推进较费力"):"";
    const topic=plain?.domains.find(item=>item.domain==="career")?.headline.split("：").slice(1).join("：");
    const stageHeadline=decade?`${decade.ganZhi}大运：${topic&&["结果尚未明朗","有明确主题，顺逆未定"].includes(caption)?topic:caption}`:"当前尚无完整大运段";
    currentStages.push({id:`stage-${branch.id}`,title:"当前阶段",branchId:branch.id,branchLabel:branch.label,
      startInstant:decade?.startInstant??null,endExclusiveInstant:decade?.endExclusiveInstant??null,
      headline:personalTextIds.length?"已采用个人阶段说明":stageHeadline,
      text:personalTextIds.length?personalMessage(personalTextIds):answer,origin:personalTextIds.length?"personal":"calculated",sourceSubjects,personalTextIds,detailsRef:"#reading-life"});
  }
  const sourceVersions=unique([BRIEF_READING_REPORT_VERSION,BRIEF_ANNUAL_READING_VERSION,PLAIN_NATAL_SUMMARY_VERSION,PLAIN_OUTLOOK_READING_VERSION,synthesis.version,...synthesis.sourceVersions]);
  if(originalNatal)sourceVersions.push(originalNatal.version,...originalNatal.sourceVersions);
  for(const reading of keyMonthReadings)sourceVersions.push(reading.version,...reading.sourceVersions);
  const referenceYear=extras.life?new Date(Date.parse(extras.life.referenceInstant)+8*3_600_000).getUTCFullYear():annual?.startYear;
  const years:BriefReadingYear[]=[],gaps:string[]=[];
  for(const year of annual?.years??[]){
    const events=extras.annualEvents?.years.find(item=>item.year===year.year),story=extras.annualLifeStories?.years.find(item=>item.year===year.year);
    if(!events||!story){gaps.push(`${year.year}年尚无完整年度生活正文，未用别年补齐。`);years.push({id:`year-${year.year}`,year:year.year,yearGanZhi:year.yearGanZhi,featured:false,focusReasons:[],branches:[]});continue;}
    const brief=buildBriefAnnualReading({revision,assessment,year,events,story,contextual:extras.contextual});
    sourceVersions.push(...brief.sourceVersions);
    const composition=composeAnnualEvents(events),focusReasons:string[]=[];
    if(year.year===referenceYear)focusReasons.push("当前参考年");
    if(brief.branches.some(branch=>new Set(branch.segments.flatMap(segment=>segment.backgroundRefs.filter(ref=>ref.nodeType==="dayun").map(ref=>ref.nodeId))).size>1))focusReasons.push("本年交运，前后分看");
    if(brief.branches.some(branch=>branch.segments.some(segment=>segment.domains.some(domain=>domain.domain==="relationship"&&domain.relationshipSignalIds.length))))focusReasons.push("本年有独立相处线索");
    if(extras.priorities?.branches.some(branch=>branch.years.some(item=>item.year===year.year&&branch.priorityYearIds.includes(item.id))))focusReasons.push("原解读已列为重点年份");
    const branches:BriefReadingYear["branches"]=brief.branches.map(branch=>({id:branch.id,label:branch.label,segments:branch.segments.map(segment=>{
      const groups=composition.branches.find(item=>item.id===branch.id)?.segments.find(item=>item.id===segment.id)?.items??[];
      const domains=segment.domains.map((domain):BriefReadingYearDomain=>{
        const composedSubjects=groups.filter(group=>group.kind==="settlement"&&group.members.some(member=>domain.eventIds.includes(member.id))).map(group=>annualEventCompositionSubjectId(year.year,segment,group));
        const sourceSubjects=unique(["annual-overview",...domain.sourceSubjects,...composedSubjects]),personalTextIds=register(sourceSubjects);
        return {id:`${year.year}-${segment.id}-${domain.domain}`,domain:domain.domain,title:domain.title,headline:personalTextIds.length?"已采用个人修订":domain.verdict.label,
          text:personalTextIds.length?personalMessage(personalTextIds):domain.text,origin:personalTextIds.length?"personal":events.contextRef?"contextual":"calculated",
          sourceSubjects,eventIds:[...domain.eventIds],verdict:domain.verdict,personalTextIds,showInBrief:domain.domain!=="relationship"||domain.relationshipSignalIds.length>0||personalTextIds.length>0
            ||(domain.relationshipBackgroundSignalIds.length>0&&focusReasons.includes("本年交运，前后分看")),detailsRef:"#reading-yearly"};
      });
      const eventTendencies=segment.eventTendencies.map((tendency):BriefReadingEventItem=>{
        const composedSubjects=groups.filter(group=>group.kind==="settlement"&&group.members.some(member=>tendency.eventIds.includes(member.id))).map(group=>annualEventCompositionSubjectId(year.year,segment,group));
        const sourceSubjects=unique(["annual-overview",...tendency.sourceSubjects,...composedSubjects]),personalTextIds=register(sourceSubjects);
        const label=`${year.year}年${brief.branches.length>1?`·${branch.label}`:""}${branch.segments.length>1?`（${localDate(segment.startInstant)}—${localDate(segment.endExclusiveInstant)}前）`:""}`;
        return {id:tendency.id,category:tendency.category,year:year.year,branchId:branch.id,branchLabel:branch.label,segmentId:segment.id,
          startInstant:segment.startInstant,endExclusiveInstant:segment.endExclusiveInstant,label,
          headline:personalTextIds.length?"已采用个人修订":tendency.label,text:personalTextIds.length?personalMessage(personalTextIds):tendency.text,
          level:tendency.level,levelLabel:personalTextIds.length?"已采用个人修订":EVENT_LEVELS[tendency.level],direction:tendency.direction,
          origin:personalTextIds.length?"personal":events.contextRef?"contextual":"calculated",sourceSubjects,personalTextIds,
          original:tendency,detailsRef:"#reading-yearly"};
      });
      const allPersonal=domains.length>0&&domains.every(domain=>domain.origin==="personal");
      return {id:segment.id,branchId:segment.branchId,startInstant:segment.startInstant,endExclusiveInstant:segment.endExclusiveInstant,ageLabel:segment.age.label,
        headline:allPersonal?"已有个人修订":segment.headline,caption:allPersonal?"按已采用的个人修订阅读":segment.caption,domains,eventTendencies,
        sourceSubjects:unique([...domains.flatMap(domain=>domain.sourceSubjects),...eventTendencies.flatMap(item=>item.sourceSubjects)]),detailsRef:"#reading-yearly"};
    })}));
    for(const branch of branches)for(let index=1;index<branch.segments.length;index++){
      const previous=branch.segments[index-1]!,current=branch.segments[index]!;
      const visible=(segment:BriefReadingYearSegment)=>({headline:segment.headline,caption:segment.caption,domains:segment.domains.map(domain=>({
        domain:domain.domain,title:domain.title,headline:domain.headline,text:domain.text,origin:domain.origin,showInBrief:domain.showInBrief,verdict:domain.verdict
      })),events:segment.eventTendencies.map(item=>({category:item.category,headline:item.headline,text:item.text,level:item.level,direction:item.direction,origin:item.origin}))});
      if(previous.branchId===current.branchId&&previous.endExclusiveInstant===current.startInstant
        &&![...previous.domains,...current.domains,...previous.eventTendencies,...current.eventTendencies].some(domain=>domain.origin==="personal")
        &&same(visible(previous),visible(current)))current.sharedNarrativeWith=previous.id;
    }
    if(!branches.some(branch=>branch.segments.length))gaps.push(`${year.year}年没有可作个人解读的完整时段，保留历法与范围说明。`);
    years.push({id:`year-${year.year}`,year:year.year,yearGanZhi:year.yearGanZhi,featured:false,focusReasons,branches});
  }
  const yearOverview=buildYearOverview(years,domainCards,revision.input.sex==="unspecified");
  const attachKeyMonths=(outlook:BriefReadingEventOutlook[])=>{
    for(const event of outlook)for(const branch of event.branches)for(const item of branch.items){
      const reading=keyMonthReadings.find(months=>months.year===item.year);
      item.keyMonthsLoaded=!!reading;
      item.keyMonths=reading?selectKeyMonthEvents(reading,{category:item.category,branchId:item.original.scope.branchId,
        startInstant:item.startInstant,endExclusiveInstant:item.endExclusiveInstant,limit:1}).map(month=>{
        const period=reading.branches.find(candidate=>candidate.id===month.scope.branchId)?.periods.find(candidate=>candidate.id===month.scope.segmentId);
        if(!period)throw new Error("关键月份缺少原时段。");
        const personalTextIds=register(month.sourceSubjects);
        if(month.origin==="personal"&&!personalTextIds.length)throw new Error("关键月份个人采用缺少完整原文。");
        return {id:month.id,title:month.title,headline:month.title,text:month.origin==="personal"?personalMessage(personalTextIds):month.text,
          origin:month.origin,sourceSubjects:month.sourceSubjects,personalTextIds,detailsRef:"#reading-yearly",
          year:item.year,label:`${period.monthLabel}（${localDate(month.scope.startInstant)}—${localDate(month.scope.endExclusiveInstant)}前）`,
          monthLabel:period.monthLabel,monthGanZhi:period.monthGanZhi,branchId:month.scope.branchId,
          startInstant:month.scope.startInstant,endExclusiveInstant:month.scope.endExclusiveInstant,
          levelLabel:month.origin==="personal"?"已采用个人修订":month.levelLabel,original:month,
          evidence:reading.evidence.filter(evidence=>month.evidenceIds.includes(evidence.id))};
      }):[];
    }
    return outlook;
  };
  let eventsPerBranch=years.some(year=>year.branches.length>1)?1:2;
  let eventOutlook=attachKeyMonths(buildEventOutlook(years,eventsPerBranch));
  const eventSupportNote="倾向强弱表示本地规则的支持与牵制情况，不是发生概率，也不保证事件发生。";
  const available=years.filter(year=>year.branches.some(branch=>branch.segments.length));
  // Choose existing relevant years, not the highest good/bad score. All years
  // and every exact branch/segment remain in the returned model and detail.
  const ranked=unique([
    ...available.filter(year=>year.focusReasons.includes("当前参考年")),
    ...available.filter(year=>year.focusReasons.includes("本年交运，前后分看")),
    ...available.filter(year=>year.focusReasons.includes("本年有独立相处线索")),
    ...available.filter(year=>year.focusReasons.includes("原解读已列为重点年份")),...available]);
  let chosen=ranked.slice(0,Math.min(6,ranked.length));
  const branchLabels=unique(years.flatMap(year=>year.branches.map(branch=>branch.label)));
  const coverageText=()=>annual?`已看${annual.startYear}—${annual.endYear}年，先看七类事件倾向；全部年份、月份和依据展开查看。`:"当前尚未加载年度窗口，先看本命与当前阶段。";
  const relationshipScopeText="关系年份仅按独立相处线索列出；未列年份不表示没有变化，持续大运背景不算每年新事件。";
  const renderBody=()=>{
    const out=["## 主报告"];
    if(natalConclusion){
      out.push("### 本盘格局与喜用结论");
      for(const block of [natalConclusion.pattern,natalConclusion.firstChoice,...natalConclusion.secondChoices,...natalConclusion.avoid])
        out.push(`**${block.title}：${block.headline}**`,block.text);
    }
    out.push("### 七类具体事件与年份",coverageText(),eventSupportNote);
    if(branchLabels.length>1)out.push("起运方向未定，顺逆分开看，不相加或择优。");
    for(const event of eventOutlook){
      out.push(`#### ${event.title}`);
      const hasItems=event.branches.some(branch=>branch.items.length);
      if(!hasItems)out.push(event.emptyText);
      else for(const branch of event.branches){
        if(event.branches.length>1)out.push(`**${branch.branchLabel}**`);
        if(!branch.items.length)out.push(event.personalPeriods.some(item=>item.branchId===branch.branchId)?"相关时段已有个人修订，见原文。":"这一方向下，未见突出年份。");
        else for(const item of branch.items){
          out.push(`- ${item.label} · ${item.levelLabel}：${item.text}`);
          for(const month of item.keyMonths??[])out.push(`  - 关键月份：${month.label} · ${month.levelLabel}。${month.text}`);
          if(item.keyMonthsLoaded&&!item.keyMonths?.length)out.push("  - 已核本年流月，未见更突出的对应月份，保留全年倾向。");
        }
      }
      if(event.personalPeriods.length)out.push(`已采用个人修订：${event.personalPeriods.map(item=>`${item.label}（个人原文${item.personalTextIds.map(id=>id.replace("brief-personal-","")).join("、")}）`).join("、")}。`);
    }
    out.push("### 事业、财运与感情",...domainCards.flatMap(card=>[`**${card.headline===card.title?card.title:`${card.title}：${card.headline}`}**`,card.text]),"### 当前阶段");
    for(const stage of currentStages)out.push(`**${currentStages.length>1?`${stage.branchLabel} · `:""}${stage.headline}**`,...(stage.startInstant&&stage.endExclusiveInstant?[`${localDate(stage.startInstant)}起至${localDate(stage.endExclusiveInstant)}前`]:[]),stage.text);
    if(!currentStages.length)out.push("当前尚未读取完整人生阶段，不补造大运判断。");
    if(gaps.length)out.push(`覆盖缺口：${gaps.join(" ")}`);
    out.push("年份领域总判、完整逐年正文、依据和个人原文见详细阅读。");
    return out.join("\n\n");
  };
  let bodyText=renderBody();
  if(chineseLength(bodyText)>1900&&eventsPerBranch>1){eventsPerBranch=1;eventOutlook=attachKeyMonths(buildEventOutlook(years,eventsPerBranch));bodyText=renderBody();}
  const featuredYearIds=chosen.map(year=>year.id);for(const year of years)year.featured=featuredYearIds.includes(year.id);
  register([...adopted.keys()]);
  const chineseCharacters=chineseLength(bodyText),estimatedMinutes=Math.max(1,Math.ceil(chineseCharacters/400));
  const exceptions=chineseCharacters>2000?(branchLabels.length>1?["两个起运分支及其真实分段完整保留，篇幅较长。"]:["本窗有多段真实变化，主稿超过目标，需继续编辑整理。"]):[];
  const report: BriefReadingReport = {version:BRIEF_READING_REPORT_VERSION,sourceBinding,sourceVersions:unique(sourceVersions),title:"你的命盘主报告",natalConclusion,keyMonthReadings,domainCards,currentStages,years,featuredYearIds,personalTexts,relationshipScopeText,
    coverage:{fromYear:annual?.startYear??null,toYear:annual?.endYear??null,totalYears:years.length,featuredYears:chosen.length,branchLabels,gaps,text:coverageText()},bodyText,
    yearOverview,eventOutlook,eventSupportNote,metrics:{chineseCharacters,totalCharacters:bodyText.length,estimatedMinutes,withinTarget:chineseCharacters<=2000,exceptions,estimateNote:`主报告约${chineseCharacters}个汉字，按约400字/分钟估算，约需${estimatedMinutes}分钟；个人原文与详细附录不计入。`},detailsRef:"#reading-full-report"};
  const plainReading = buildPlainFullReading(report, assessment, annual, extras);
  return { ...report, plainReading, sourceVersions: unique([...report.sourceVersions, ...plainReading.sourceVersions]) };
}
