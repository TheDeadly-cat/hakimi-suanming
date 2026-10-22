import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { researchNoteRecordSchema, storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildAnnualDomainReading, ANNUAL_DOMAIN_READING_VERSION } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { buildBriefReadingReport } from "./brief-reading-report";
import { buildDetailedReadingReport, buildLocalReadingReport, nestDetailedReading } from "./local-reading-edition";
import { annualLifeStorySubjectId, annualLifeStoryFeedbackText, annualLifeStoryFeedbackVersions } from "./annual-life-story-record";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { annualDomainFeedbackText } from "./local-annual-domain-record";
import { prepareKeyMonthYear } from "./key-month-event-source";

async function fixture(unknown=false){
  const chart=await calculateChart({schemaVersion:"1.0.0",calendarType:"gregorian",date:unknown?"1995-08-18":"1995-05-18",time:"08:26",timePrecision:"exact_minute",sex:unknown?"unspecified":"male",timeZone:"Asia/Shanghai",lunarLeapMonth:false,
    location:{label:"Synthetic brief report",latitude:null,longitude:null,precision:"unknown"},sourceNote:"synthetic"},WORKING_DEFAULT_RULE_PROFILE);
  const revision=storedRevisionRecordSchema.parse({...chart,schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:crypto.randomUUID(),revisionNumber:1,createdAt:"2026-10-20T00:00:00Z"});
  const assessment=buildBaziPreliminaryAssessment(revision),comprehensive=buildBaziComprehensiveReading(revision,assessment);
  const [annual,life]=await Promise.all([buildLocalAnnualOutlook(revision,assessment,2026),buildLocalLifeOutlook(revision,assessment,2029)]);
  const annualDomains={version:ANNUAL_DOMAIN_READING_VERSION,revisionId:revision.id,chartResultHash:revision.manifest.resultHash,includeHour:true,startYear:annual.startYear,endYear:annual.endYear,years:annual.years.map(year=>buildAnnualDomainReading({revision,assessment,year}))};
  const annualEvents=buildReadingAnnualEvents({revision,assessment,annual,annualDomains}),annualLifeStories=buildReadingAnnualLifeStories({revision,assessment,annual,annualDomains,annualEvents});
  const lifeStageStory=buildLifeStageStory({revision,assessment,life}),synthesis=buildReadingSynthesis({revision,assessment,comprehensive,annual,life});
  return {revision,assessment,annual,extras:{sourceRevision:revision,comprehensive,life,lifeStageStory,synthesis,annualDomains,annualEvents,annualLifeStories}};
}
let b:Awaited<ReturnType<typeof fixture>>,u:typeof b;
beforeAll(async()=>{[b,u]=await Promise.all([fixture(),fixture(true)]);},60000);
const han=(text:string)=>[...text.matchAll(/\p{Script=Han}/gu)].length;
describe("brief report from unchanged complete reading sources",()=>{
  it("adopts a concrete pattern and ordered use without changing the backend weights or old annual answers",()=>{
    const before=JSON.stringify(b),report=buildBriefReadingReport(b.assessment,b.annual,b.extras)!;
    expect(report.natalConclusion?.pattern.headline).toBe("印格泄秀");
    expect(report.natalConclusion?.firstChoice.text).toContain("辛食神");
    expect(report.natalConclusion?.secondChoices.map(item=>item.text).join("\n")).toContain("癸水润土为先");
    expect(report.natalConclusion?.original.scoreBasis.supportWeight).toBe(b.assessment.balance.supportWeight);
    expect(report.natalConclusion?.original.scoreBasis.demandWeight).toBe(b.assessment.balance.demandWeight);
    const natalText=report.bodyText.split("### 七类具体事件")[0]!;
    expect(natalText).not.toMatch(/先考察|优先考察/u);
    expect(report.bodyText.indexOf("本盘格局与喜用结论")).toBeLessThan(report.bodyText.indexOf("七类具体事件"));
    expect(JSON.stringify(b)).toBe(before);
  });
  it("uses actually calculated key months in the matching annual event and rejects changed month evidence",async()=>{
    const source={revision:b.revision,assessment:b.assessment,annual:b.annual,annualDomains:b.extras.annualDomains,
      annualEvents:b.extras.annualEvents,annualLifeStories:b.extras.annualLifeStories};
    const keyMonthYears=await Promise.all([prepareKeyMonthYear(source,2031,[]),prepareKeyMonthYear(source,2032,[])]);
    const before=JSON.stringify(keyMonthYears),extras={...b.extras,keyMonthYears};
    const report=buildBriefReadingReport(b.assessment,b.annual,extras)!;
    const job=report.eventOutlook.find(event=>event.category==="job_change")!.branches[0]!.items.find(item=>item.year===2031)!;
    expect(job.keyMonthsLoaded).toBe(true);expect(job.keyMonths!.length).toBeGreaterThan(0);
    expect(job.keyMonths![0]!.monthGanZhi).toBe("己亥");
    for(const event of report.eventOutlook)for(const branch of event.branches)for(const item of branch.items)for(const month of item.keyMonths??[]){
      expect(month.year).toBe(item.year);expect(month.branchId).toBe(item.branchId);
      expect(month.original.category).toBe(item.category);
      expect(Date.parse(month.startInstant)).toBeGreaterThanOrEqual(Date.parse(item.startInstant));
      expect(Date.parse(month.endExclusiveInstant)).toBeLessThanOrEqual(Date.parse(item.endExclusiveInstant));
      expect(report.bodyText).toContain(month.label);expect(report.bodyText).toContain(month.text);
      expect(month.original.supportEvidenceIds.every(id=>month.evidence.some(evidence=>evidence.id===id))).toBe(true);
    }
    const plain=buildLocalReadingReport(b.assessment,b.annual,b.extras),complete=buildLocalReadingReport(b.assessment,b.annual,extras);
    expect(complete.archive).toBe(plain.archive);
    expect(complete.reading).toContain("关键月份的计算与事件依据");
    expect(complete.reading).toContain("本盘采用结论的得分与古籍依据");
    expect(JSON.stringify(keyMonthYears)).toBe(before);
    const changed=structuredClone(extras);
    changed.keyMonthYears[0]!.reading.branches[0]!.periods[0]!.events[0]!.text+="changed";
    expect(()=>buildBriefReadingReport(b.assessment,b.annual,changed)).toThrow("结论或依据已变化");
  },60000);
  it("keeps all ten years and exact segments while presenting a bounded main report with distinct career and wealth processes",()=>{
    const before=JSON.stringify(b),report=buildBriefReadingReport(b.assessment,b.annual,b.extras)!;
    expect(report.domainCards.map(card=>card.id)).toEqual(["career","wealth","relationships"]);
    expect(report.years.map(row=>row.year)).toEqual(b.annual.years.map(year=>year.year));
    for(const row of report.years){const original=b.annual.years.find(year=>year.year===row.year)!;
      expect(row.branches.flatMap(branch=>branch.segments.map(segment=>[segment.id,segment.branchId,segment.startInstant,segment.endExclusiveInstant]))).toEqual(original.judgmentSegments.map(segment=>[segment.id,segment.branchId,segment.startInstant,segment.endExclusiveInstant]));}
    expect(report.featuredYearIds.length).toBeGreaterThanOrEqual(4);expect(report.featuredYearIds.length).toBeLessThanOrEqual(6);
    expect(han(report.bodyText)).toBeLessThanOrEqual(2000);expect(report.metrics.chineseCharacters).toBe(han(report.bodyText));
    expect(report.metrics.estimateNote).toContain("400字/分钟");
    expect(report.domainCards.find(card=>card.id==="relationships")!.text).toContain("期待");
    expect(report.bodyText).not.toContain("本年未见明确感情转折线索");
    const text=(year:number,domain:string)=>report.years.find(row=>row.year===year)!.branches[0]!.segments[0]!.domains.find(item=>item.domain===domain)!.text;
    expect(text(2030,"career")).not.toBe(text(2032,"career"));expect(text(2032,"career")).not.toBe(text(2032,"wealth"));
    const career=report.yearOverview.find(item=>item.domain==="career")!,handover=report.years.find(row=>row.year===2029)!.branches[0]!.segments;
    expect(handover).toHaveLength(2);
    expect(handover[1]!.sharedNarrativeWith).toBeUndefined();
    const first=career.groups.find(group=>group.items.some(item=>item.segmentId===handover[0]!.id&&item.year===2029))!;
    const second=career.groups.find(group=>group.items.some(item=>item.segmentId===handover[1]!.id&&item.year===2029))!;
    expect(first.id).toBe("favorable");expect(second.id).toBe("mixed");
    expect(career.groups.map(group=>group.id)).toEqual(["favorable","mixed","pressured"]);
    for(const period of [...first.items,...second.items].filter(item=>item.year===2029)){
      expect(period.label).toContain("05/23");
      const original=handover.find(segment=>segment.id===period.segmentId)!;
      expect([period.startInstant,period.endExclusiveInstant]).toEqual([original.startInstant,original.endExclusiveInstant]);
    }
    expect(report.eventOutlook.map(item=>item.category)).toEqual(["promotion","job_change","money_inflow","money_loss","romance","commitment","separation"]);
    expect(report.eventOutlook.filter(item=>item.branches.some(branch=>branch.items.length)).length).toBeGreaterThan(0);
    expect(report.bodyText.indexOf("七类具体事件")).toBeLessThan(report.bodyText.indexOf("### 事业、财运与感情"));
    expect(report.bodyText).not.toContain("### 哪些年份较顺");
    for(const event of report.eventOutlook)for(const branch of event.branches)for(const item of branch.items){
      expect(item.branchId).toBe(branch.branchId);expect(item.level).toBe(item.original.level);
      expect(item.text).toBe(item.original.text);
      expect(item.original.applicableIntervals).toContainEqual({startInstant:item.startInstant,endExclusiveInstant:item.endExclusiveInstant});
      expect(item.original.scope.segmentId).toBe(item.segmentId);expect(report.bodyText).toContain(item.label);
    }
    expect(report.bodyText).not.toContain("## 命局九章");expect(JSON.stringify(b)).toBe(before);
  });
  it("keeps both unknown directions and every handover interval instead of selecting the favorable branch",()=>{
    const report=buildBriefReadingReport(u.assessment,u.annual,u.extras)!;
    expect(report.coverage.branchLabels).toHaveLength(2);expect(report.bodyText).toContain("不相加或择优");
    for(const row of report.years){expect(row.branches.map(branch=>branch.id)).toEqual(["forward","backward"]);
      const original=u.annual.years.find(year=>year.year===row.year)!;
      expect(row.branches.flatMap(branch=>branch.segments).length).toBe(original.judgmentSegments.length);}
    expect(report.years.find(row=>row.year===2028)!.branches.find(branch=>branch.id==="backward")!.segments).toHaveLength(2);
    const sameNarrative=report.years.find(row=>row.year===2028)!.branches.find(branch=>branch.id==="backward")!.segments!;
    expect(sameNarrative[1]!.sharedNarrativeWith).toBe(sameNarrative[0]!.id);
    expect(sameNarrative[1]!.domains).toHaveLength(3);
    for(const overview of report.yearOverview)for(const group of overview.groups)for(const period of group.items){
      expect(group.label).toContain(period.branchLabel);
      const original=report.years.find(row=>row.year===period.year)!.branches.find(branch=>branch.id===period.branchId)!.segments.find(segment=>segment.id===period.segmentId)!;
      expect([period.startInstant,period.endExclusiveInstant]).toEqual([original.startInstant,original.endExclusiveInstant]);
      if(group.id.endsWith("-partial")){
        expect(group.label).toContain("部分关系视角");
        expect(original.domains.find(domain=>domain.domain==="relationship")!.verdict.lensIds).toHaveLength(1);
      }
    }
    expect(report.metrics.chineseCharacters).toBe(han(report.bodyText));
    if(han(report.bodyText)>2000)expect(report.metrics.exceptions.join(" ")).toContain("两个起运分支");
  });
  it("retains exact long adopted text separately and removes the corresponding automatic answer without changing its old feedback identity",async()=>{
    const story=b.extras.annualLifeStories.years.find(row=>row.year===2032)!,segment=story.branches[0]!.segments[0]!;
    const choice={id:annualLifeStorySubjectId(story,segment),label:"2032年个人总评",originalConclusion:annualLifeStoryFeedbackText(story,segment),sourceVersions:annualLifeStoryFeedbackVersions(story,segment)};
    const personalText="本人采用的完整原文\n## 这不是报告标题\n```原样```\n"+"保留每一句个人经历，不自动概括。".repeat(180);
    const root=researchNoteRecordSchema.parse({schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:b.revision.caseId,anchor:{kind:"revision",revisionId:b.revision.id},bodyFormat:"markdown",body:buildStructuredReadingFeedback(b.assessment,{subjectId:choice.id,subjectLabel:choice.label,originalConclusion:choice.originalConclusion,sourceVersions:choice.sourceVersions,rating:"unverified",actualSituation:"Synthetic verification"}),tags:["解读反馈"],sourceRefs:[],lifecycle:"active",editVersion:1,createdAt:"2026-10-20T00:00:00Z",updatedAt:"2026-10-20T00:00:00Z"});
    const review=researchNoteRecordSchema.parse({...root,id:crypto.randomUUID(),body:await buildReadingFeedbackReview(root,null,readingFeedbackSource(b.assessment,choice.sourceVersions),{state:"revised",notes:"明确采用",revisedConclusion:personalText,occurredAt:"测试"}),createdAt:"2026-10-20T00:01:00Z",updatedAt:"2026-10-20T00:01:00Z"});
    const personalReading=await buildLocalPersonalReading({revision:b.revision,assessment:b.assessment,choices:[choice],records:[root,review]});
    const report=buildBriefReadingReport(b.assessment,b.annual,{...b.extras,personalReading})!;
    expect(report.personalTexts[0]!.text).toBe(personalText);expect(report.bodyText).not.toContain(personalText);
    const row=report.years.find(item=>item.year===2032)!;
    for(const domain of row.branches[0]!.segments[0]!.domains){expect(domain.origin).toBe("personal");expect(domain.text).toContain("已采用");expect(domain.personalTextIds).toEqual([report.personalTexts[0]!.id]);}
    for(const overview of report.yearOverview){
      expect(overview.personalYears).toContain(2032);
      expect(overview.groups.flatMap(group=>group.items).filter(item=>item.year===2032&&item.segmentId===segment.id)).toEqual([]);
      expect(overview.personalPeriods.find(item=>item.year===2032)!.text).toContain("已采用");
    }
    expect(row.branches[0]!.segments[0]!.eventTendencies.every(item=>item.origin==="personal")).toBe(true);
    for(const event of report.eventOutlook){
      expect(event.personalPeriods.some(item=>item.year===2032&&item.segmentId===segment.id)).toBe(true);
      expect(event.branches.flatMap(branch=>branch.items).some(item=>item.year===2032&&item.segmentId===segment.id)).toBe(false);
    }
    const wrong=structuredClone(personalReading);wrong.entries[0]!.originalConclusion+="篡改";
    expect(()=>buildBriefReadingReport(b.assessment,b.annual,{...b.extras,personalReading:wrong})).toThrow();
    const exported=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading});
    expect(exported.reading).toContain(personalText);expect(exported.archive).toBe(buildLocalReadingSnapshot(b.assessment,b.annual,{...b.extras,personalReading}));
    const multilineLabel=structuredClone(personalReading);multilineLabel.entries[0]!.subjectLabel="原标签\n## 不得跳出个人章";
    const labelled=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading:multilineLabel}).reading.split("## 已采用的个人修订原文")[1]!.split("## 完整详细阅读（按需展开）")[0]!;
    expect(labelled).toContain(personalText);expect(labelled).not.toContain("\n## 不得跳出个人章");
  },60000);
  it("keeps a financial adoption within its exact unknown-direction handover segment while preserving other event domains",async()=>{
    const reading=u.extras.annualDomains.years.find(item=>item.year===2028)!,branch=reading.branches.find(item=>item.id==="backward")!,segment=branch.segments[0]!,domain=segment.domains.find(item=>item.id==="wealth")!;
    const choice={id:`annual-domain-${reading.year}-${segment.id}-wealth`,label:"逆行首段财务",originalConclusion:annualDomainFeedbackText(reading,branch,segment,domain),sourceVersions:[reading.version,...reading.sourceVersions]};
    const text="仅此逆行第一段财务采用我的原文，不扩大到工作与感情。";
    const root=researchNoteRecordSchema.parse({schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:u.revision.caseId,anchor:{kind:"revision",revisionId:u.revision.id},bodyFormat:"markdown",body:buildStructuredReadingFeedback(u.assessment,{subjectId:choice.id,subjectLabel:choice.label,originalConclusion:choice.originalConclusion,sourceVersions:choice.sourceVersions,rating:"unverified",actualSituation:"Synthetic verification"}),tags:["解读反馈"],sourceRefs:[],lifecycle:"active",editVersion:1,createdAt:"2026-10-20T00:00:00Z",updatedAt:"2026-10-20T00:00:00Z"});
    const review=researchNoteRecordSchema.parse({...root,id:crypto.randomUUID(),body:await buildReadingFeedbackReview(root,null,readingFeedbackSource(u.assessment,choice.sourceVersions),{state:"revised",notes:"明确采用",revisedConclusion:text,occurredAt:"测试"}),createdAt:"2026-10-20T00:01:00Z",updatedAt:"2026-10-20T00:01:00Z"});
    const personalReading=await buildLocalPersonalReading({revision:u.revision,assessment:u.assessment,choices:[choice],records:[root,review]});
    const report=buildBriefReadingReport(u.assessment,u.annual,{...u.extras,personalReading})!,year=report.years.find(item=>item.year===2028)!;
    for(const actualBranch of year.branches)for(const actualSegment of actualBranch.segments)for(const item of actualSegment.eventTendencies){
      const adopted=actualBranch.id===branch.id&&actualSegment.id===segment.id&&["money_inflow","money_loss"].includes(item.category);
      expect(item.origin==="personal").toBe(adopted);
    }
    expect(report.personalTexts.map(item=>item.text)).toContain(text);
    for(const event of report.eventOutlook.filter(item=>["money_inflow","money_loss"].includes(item.category))){
      expect(event.personalPeriods.find(item=>item.segmentId===segment.id)!.personalTextIds).toHaveLength(1);
      expect(event.branches.flatMap(item=>item.items).some(item=>item.segmentId===segment.id)).toBe(false);
    }
  },60000);
  it("keeps fixed open and folded chapters, preserves the complete detailed reading and leaves its archive exact",()=>{
    const brief=buildBriefReadingReport(b.assessment,b.annual,b.extras)!,detailed=buildDetailedReadingReport(b.assessment,b.annual,b.extras),report=buildLocalReadingReport(b.assessment,b.annual,b.extras);
    expect(report.reading).toContain(brief.plainReading!.bodyText);expect(report.reading).toContain("## 已采用的个人修订原文");expect(report.reading).toContain("## 完整详细阅读（按需展开）");
    expect(report.reading).toContain(nestDetailedReading(detailed.reading));expect(report.archive).toBe(detailed.archive);
    const appendix=report.reading.split("## 完整详细阅读（按需展开）")[1]!;
    for(const overview of brief.yearOverview)expect(appendix).toContain(overview.summary);
    expect(appendix).toContain("### 事件清单依据");
    expect(nestDetailedReading("# 标题\n## 九章\n```text\n## 个人原字\n```\n## 条件")).toBe("### 标题\n### 九章\n```text\n## 个人原字\n```\n### 条件");
    const wrong=structuredClone(b.extras);wrong.synthesis.sourceBinding.revisionId=crypto.randomUUID();
    expect(()=>buildBriefReadingReport(b.assessment,b.annual,wrong)).toThrow("当前命盘");
  },60000);
});
