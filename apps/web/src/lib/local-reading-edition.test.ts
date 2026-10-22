import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, researchNoteRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildLifeStageYears } from "./local-life-stage-years";
import { buildReadingTimeline } from "./local-reading-timeline";
import { buildReadingPriorities } from "./local-reading-priorities";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildReadingAnnualEvents, annualEventFeedbackText, annualEventFeedbackSubjectId } from "./local-annual-event-record";
import { ANNUAL_LIFE_STORY_VERSION, buildReadingAnnualLifeStories } from "./annual-life-story";
import { plainMonthlyPresentation } from "./plain-monthly-presentation";
import { plainLifeStagePresentation } from "./plain-life-stage-presentation";
import { buildPlainYearOverview } from "./plain-year-overview";
import { annualLifeStorySubjectId, annualLifeStoryFeedbackText, annualLifeStoryFeedbackVersions } from "./annual-life-story-record";
import { buildAnnualMonthStory } from "./local-annual-month-story";
import { buildLocalReadingSnapshot, type LocalReadingSnapshotExtras } from "./local-reading-record";
// Existing full-detail assertions remain intact against the same complete
// renderer. brief-reading-report.test separately verifies the public wrapper.
import { buildDetailedReadingReport as buildLocalReadingReport, groupEditionConditions, LOCAL_READING_EDITION_VERSION } from "./local-reading-edition";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { monthlyDomainFeedbackText } from "./local-monthly-domain-record";
import { lifeStageStorySubjectId, lifeStageStoryFeedbackText, lifeStageStoryFeedbackVersions } from "./local-life-stage-story-record";
import { annualReaderParagraphLabel, buildAnnualReaderAnswer } from "./annual-reader-answer";
import { buildMonthReadingRhythm, MONTH_READING_RHYTHM_VERSION } from "./local-month-reading-rhythm";

async function fixture(sex: "male" | "unspecified" | "female", birth?: { date: string; time: string }) {
  const date = birth?.date ?? (sex === "female" ? "2019-12-22" : sex === "unspecified" ? "1995-08-18" : "1995-05-18");
  const chart = await calculateChart({ schemaVersion:"1.0.0",calendarType:"gregorian",date,time:birth?.time ?? (sex==="female"?"11:23":"08:26"),timePrecision:"exact_minute",sex,timeZone:"Asia/Shanghai",lunarLeapMonth:false,
    location:{label:"Synthetic reading edition",latitude:null,longitude:null,precision:"unknown"},sourceNote:"synthetic" },WORKING_DEFAULT_RULE_PROFILE);
  const revision=storedRevisionRecordSchema.parse({...chart,schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:crypto.randomUUID(),revisionNumber:1,createdAt:"2026-10-16T00:00:00Z"});
  const assessment=buildBaziPreliminaryAssessment(revision),comprehensive=buildBaziComprehensiveReading(revision,assessment);
  const [annual,life,monthly]=await Promise.all([buildLocalAnnualOutlook(revision,assessment,2026),buildLocalLifeOutlook(revision,assessment,2029),buildLocalMonthlyOutlook(revision,assessment,2028)]);
  const lifeStageStory=buildLifeStageStory({revision,assessment,life}),timeline=buildReadingTimeline({revision,annual,life});
  const annualDomains={version:ANNUAL_DOMAIN_READING_VERSION,revisionId:revision.id,chartResultHash:revision.manifest.resultHash,includeHour:true,startYear:annual.startYear,endYear:annual.endYear,
    years:annual.years.map(year=>buildAnnualDomainReading({revision,assessment,year}))};
  const annualEvents=buildReadingAnnualEvents({revision,assessment,annual,annualDomains}),annualLifeStories=buildReadingAnnualLifeStories({revision,assessment,annual,annualDomains,annualEvents});
  const monthlyDomains=buildMonthlyDomainReadings({revision,assessment,monthly}),annualMonthStory=buildAnnualMonthStory({revision,assessment,monthly,monthlyDomains,
    year:annual.years.find(y=>y.year===2028)!,annualDomains:annualDomains.years.find(y=>y.year===2028)!,annualEvents:annualEvents.years.find(y=>y.year===2028)!});
  const selected=lifeStageStory.branches[0]!.stages.find(stage=>Date.parse(stage.startInstant)<Date.parse(annual.years[0]!.endExclusiveInstant!)&&Date.parse(stage.endExclusiveInstant)>Date.parse(annual.years[0]!.startInstant!))!;
  const lifeStageYears=buildLifeStageYears({revision,assessment,life,lifeStageStory,selectedDecadeId:selected.decadeId,annual,annualDomains,annualEvents});
  const synthesis=buildReadingSynthesis({revision,assessment,comprehensive,annual,life,timeline}),priorities=buildReadingPriorities({revision,annual,life,timeline,annualDomains});
  const extras={sourceRevision:revision,comprehensive,life,lifeStageStory,lifeStageYears,annualDomains,annualEvents,annualLifeStories,monthly,monthlyDomains,annualMonthStory,synthesis,priorities,timeline} satisfies LocalReadingSnapshotExtras;
  return {revision,assessment,annual,extras};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
const dateTime=(instant:string)=>new Date(Date.parse(instant)+8*3_600_000).toISOString().replace("T"," ").replace(/Z$/u,"").replace(/\.000$/u,"");
let b:Fixture,u:Fixture;
beforeAll(async()=>{[b,u]=await Promise.all([fixture("male"),fixture("unspecified")]);},60000);
async function adopted(f:Fixture,choices:ReadingFeedbackChoice[],texts:string[]){
  const records=[];
  for(const [index,choice]of choices.entries()){
    const root=researchNoteRecordSchema.parse({schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:f.revision.caseId,anchor:{kind:"revision",revisionId:f.revision.id},bodyFormat:"markdown",
      body:buildStructuredReadingFeedback(f.assessment,{subjectId:choice.id,subjectLabel:choice.label,sourceVersions:choice.sourceVersions,originalConclusion:choice.originalConclusion,rating:"unverified",actualSituation:"Synthetic verification only"}),
      tags:["解读反馈"],sourceRefs:[],lifecycle:"active",editVersion:1,createdAt:"2026-10-16T00:00:00Z",updatedAt:"2026-10-16T00:00:00Z"});
    const review=researchNoteRecordSchema.parse({...root,id:crypto.randomUUID(),tags:["解读反馈复核"],body:await buildReadingFeedbackReview(root,null,readingFeedbackSource(f.assessment,choice.sourceVersions??[]),{state:"revised",notes:"合成个人采用测试。",revisedConclusion:texts[index]!,occurredAt:"测试"}),createdAt:"2026-10-16T00:01:00Z",updatedAt:"2026-10-16T00:01:00Z"});
    records.push(root,review);
  }
  return buildLocalPersonalReading({revision:f.revision,assessment:f.assessment,choices,records});
}

describe("same-source complete reading edition",()=>{
  it("puts the natal role decision in the opening, preserves exact adopted stems and saves its complete source metadata",async()=>{
    const detail=b.extras.synthesis.sections.find(section=>section.id.startsWith("natal-detail-"))!;
    expect(detail).toBeDefined();
    const report=buildLocalReadingReport(b.assessment,b.annual,b.extras);
    const opening=report.reading.split("## 一、整盘主线")[1]!.split("## 二、命局九章详读")[0]!;
    expect(opening).toContain(detail.answer!);
    expect(report.reading).toContain("### 本命补断所用原典");
    for(const source of b.extras.synthesis.sources??[]){
      expect(report.reading).toContain(source.locator);
      expect(report.reading).toContain(source.excerpt);
      expect(report.archive).toContain(JSON.stringify(source));
    }
    expect(report.archive).toBe(buildLocalReadingSnapshot(b.assessment,b.annual,b.extras));
    const guidance=b.extras.comprehensive.usefulGuidance!,entry=guidance.entries.find(entry=>entry.stem==="辛")!;
    const choice={id:`useful-stem-${entry.id}`,label:entry.roleLabel,sourceVersions:[b.extras.comprehensive.version,guidance.version],
      originalConclusion:`${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}\n${entry.presenceText}\n${entry.judgment}\n${entry.conditions.map(condition=>`条件：${condition}`).join("\n")}\n取用解读规则：${guidance.version}\n综合解读规则：${b.extras.comprehensive.version}`};
    const personalReading=await adopted(b,[choice],["已采用的辛字原文，不让新补断覆盖。"]);
    const synthesis=buildReadingSynthesis({revision:b.revision,assessment:b.assessment,comprehensive:b.extras.comprehensive,annual:b.annual,life:b.extras.life,timeline:b.extras.timeline,personal:personalReading});
    const updated=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,synthesis,personalReading});
    expect(updated.reading).toContain(personalReading.entries[0]!.personalText!);
    expect(updated.reading.split("## 一、整盘主线")[1]!.split("## 二、命局九章详读")[0]!).not.toContain(detail.answer!);
    expect(updated.archive).toContain(detail.answer!);
    expect(updated.archive).toContain(choice.originalConclusion);
  },60000);

  it("puts the exact monthly rhythm before the full months while retaining separate handover scopes",()=>{
    const rhythm=buildMonthReadingRhythm({monthly:u.extras.monthly,monthlyDomains:u.extras.monthlyDomains,annualMonthStory:u.extras.annualMonthStory});
    const report=buildLocalReadingReport(u.assessment,u.annual,u.extras);
    expect(report.reading.indexOf(`### ${rhythm.headline}`)).toBeLessThan(report.reading.indexOf(`### ${u.extras.monthly.months[0]!.label} ·`));
    expect(report.reading).toContain(`月份节奏：${MONTH_READING_RHYTHM_VERSION}`);
    expect(rhythm.branches).toHaveLength(2);
    for(const branch of rhythm.branches){
      for(const range of branch.directionRanges)expect(report.reading).toContain(range.caption);
      for(const period of branch.periods){
        expect(report.reading).toContain(period.summary);
        expect(report.reading).toContain(`${period.monthLabel}重点 · ${dateTime(period.personalStartInstant)} 至 ${dateTime(period.endExclusiveInstant)}`);
      }
    }
    expect(rhythm.branches.flatMap(branch=>branch.periods).some(period=>period.handoverBefore)).toBe(true);
    expect(report.reading).toContain("此处进入另一段大运背景，前后分别阅读。");
    expect(report.archive).toBe(buildLocalReadingSnapshot(u.assessment,u.annual,u.extras));
  },60000);
  it("lets the original relationship adoption replace the new life answer in both reading locations",async()=>{
    const chapter=b.extras.comprehensive.chapters.find(chapter=>chapter.id==="relationships")!;
    const choice={id:"chapter-relationships",label:chapter.title,originalConclusion:`${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${b.extras.comprehensive.version}`,sourceVersions:[b.extras.comprehensive.version]};
    const personalReading=await adopted(b,[choice],["本人采用的相处说明，原样显示。"]);
    const synthesis=buildReadingSynthesis({revision:b.revision,assessment:b.assessment,comprehensive:b.extras.comprehensive,annual:b.annual,life:b.extras.life,timeline:b.extras.timeline,personal:personalReading});
    const report=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,synthesis,personalReading});
    const opening=report.reading.split("## 一、整盘主线")[1]!.split("## 二、命局九章详读")[0]!;
    const detailed=report.reading.split("### 亲密关系与合作")[1]!.split("### 家庭与支持环境")[0]!;
    expect(opening).toContain(personalReading.entries[0]!.personalText!);
    expect(detailed).toContain("本处沿用已采用的个人修订「亲密关系与合作」；其原文见本稿首次出现处。");
    const originalAnswer=b.extras.synthesis.sections.find(section=>section.id==="relationships")!.answer!;
    for(const paragraph of originalAnswer.split("\n\n")){expect(opening).not.toContain(paragraph);expect(detailed).not.toContain(paragraph);}
    for(const original of [chapter.verdict,...chapter.paragraphs])expect(report.archive).toContain(original);
  },60000);
  it("uses the same child family answer in the opening and detailed chapter while archiving the complete original",async()=>{
    const f=await fixture("female"),family=f.extras.comprehensive.chapters.find(chapter=>chapter.id==="family")!;
    const adapted=f.extras.synthesis.sections.find(section=>section.id==="family")!;
    expect(adapted.ageAdapted).toBe(true);
    const report=buildLocalReadingReport(f.assessment,f.annual,f.extras);
    const opening=report.reading.split("## 一、整盘主线")[1]!.split("## 二、命局九章详读")[0]!;
    const detailed=report.reading.split("## 二、命局九章详读")[1]!.split("## 三、人生阶段")[0]!;
    for(const paragraph of adapted.answer!.split("\n\n")){expect(opening).toContain(paragraph);expect(detailed).toContain(paragraph);}
    const relationship=f.extras.synthesis.sections.find(section=>section.id==="relationships")!;
    expect(relationship.lifeAdapted).toBe(true);
    for(const paragraph of relationship.answer!.split("\n\n")){expect(opening).toContain(paragraph);expect(detailed).toContain(paragraph);}
    for(const original of [family.verdict,...family.paragraphs]){expect(report.archive).toContain(original);expect(opening).not.toContain(original);expect(detailed).not.toContain(original);}
    const choice={id:"chapter-family",label:family.title,originalConclusion:`${family.title} · ${family.headline}\n${family.verdict}\n${family.paragraphs.join("\n")}\n综合解读规则：${f.extras.comprehensive.version}`,sourceVersions:[f.extras.comprehensive.version]};
    const personalReading=await adopted(f,[choice],["本人采用的家庭说明，保持原文。"]);
    const synthesis=buildReadingSynthesis({revision:f.revision,assessment:f.assessment,comprehensive:f.extras.comprehensive,annual:f.annual,life:f.extras.life,timeline:f.extras.timeline,personal:personalReading});
    const personalReport=buildLocalReadingReport(f.assessment,f.annual,{...f.extras,synthesis,personalReading});
    expect(personalReport.reading).toContain(personalReading.entries[0]!.personalText!);
    for(const paragraph of adapted.answer!.split("\n\n"))expect(personalReport.reading).not.toContain(paragraph);
    for(const original of family.paragraphs)expect(personalReport.archive).toContain(original);
  },60000);
  it("groups conditions only by identical complete scope membership and reconstructs each scope without loss",()=>{
    const scopes=new Map<string,readonly string[]>([
      ["2028/forward/before/career",["共同条件甲。","共同条件乙。","此年顺行条件。","同域独有条件。","共同条件甲。"]],
      ["2028/forward/before/wealth",["共同条件甲。","共同条件乙。","此年顺行条件。"]],
      ["2028/backward/after/career",["共同条件甲。","共同条件乙。","逆行交运后条件。"]],
      ["2035/forward/career",["共同条件甲。","共同条件乙。","另一年份条件。"]]
    ]), before=JSON.stringify([...scopes]),groups=groupEditionConditions(scopes);
    expect(JSON.stringify([...scopes])).toBe(before);
    expect(groups.flatMap(group=>group.conditions).sort()).toEqual([...new Set([...scopes.values()].flat())].sort());
    for(const [scope,conditions]of scopes){
      expect(groups.filter(group=>group.scopes.includes(scope)).flatMap(group=>group.conditions).sort()).toEqual([...new Set(conditions)].sort());
    }
    expect(groups.find(group=>group.conditions.includes("共同条件甲。"))!.conditions).toEqual(["共同条件甲。","共同条件乙。"]);
    expect(groups.find(group=>group.conditions.includes("此年顺行条件。"))!.scopes).toEqual(["2028/forward/before/career","2028/forward/before/wealth"]);
    expect(groups.find(group=>group.conditions.includes("另一年份条件。"))!.scopes).toEqual(["2035/forward/career"]);
  });
  it("keeps the existing complete archive byte-identical and retains all nine chapters, decades, years, monthly periods and conditions",()=>{
    const before=JSON.stringify(b),report=buildLocalReadingReport(b.assessment,b.annual,b.extras);
    expect(report.version).toBe(LOCAL_READING_EDITION_VERSION);expect(report.archive).toBe(buildLocalReadingSnapshot(b.assessment,b.annual,b.extras));expect(JSON.stringify(b)).toBe(before);
    for(const chapter of b.extras.comprehensive.chapters){
      expect(report.reading).toContain(`### ${chapter.title}`);
      const projected=b.extras.synthesis.sections.find(section=>section.id===chapter.id&&(section.lifeAdapted||section.ageAdapted));
      if(projected)for(const paragraph of projected.answer!.split("\n\n"))expect(report.reading).toContain(paragraph);
      else{expect(report.reading).toContain(chapter.verdict);for(const paragraph of chapter.paragraphs)expect(report.reading).toContain(paragraph);}
      for(const original of [chapter.verdict,...chapter.paragraphs])expect(report.archive).toContain(original);
    }
    for(const branch of b.extras.lifeStageStory.branches)for(const stage of branch.stages){expect(report.reading).toContain(dateTime(stage.startInstant));expect(report.reading).toContain(dateTime(stage.endExclusiveInstant));for(const paragraph of stage.paragraphs)expect(report.reading).toContain(paragraph);}
    for(const year of b.annual.years){expect(report.reading).toContain(`### ${year.year}年`);for(const segment of year.judgmentSegments){expect(report.reading).toContain(dateTime(segment.startInstant));expect(report.reading).toContain(dateTime(segment.endExclusiveInstant));}}
    for(const month of b.extras.monthlyDomains.months){expect(report.reading).toContain(`### ${month.label} · ${month.ganZhi}`);for(const branch of month.branches)for(const segment of branch.segments)for(const domain of segment.domains){for(const example of domain.examples)expect(report.reading).toContain(example);for(const condition of domain.conditions)expect(report.reading).toContain(condition);}}
    expect(report.reading).toContain("#reading-condition-");expect(report.reading).not.toContain('"namespace":"hakimi-transit-node"');expect(report.reading).not.toContain("情境规则来源：{");
    expect(report.reading.length).toBeLessThan(report.archive.length/2);
  },60000);
  it("preserves parallel directions and every exact handover interval rather than joining whole years or months",()=>{
    const report=buildLocalReadingReport(u.assessment,u.annual,u.extras),year=u.annual.years.find(y=>y.year===2028)!;
    expect(year.judgmentSegments).toHaveLength(3);
    for(const segment of year.judgmentSegments)expect(report.reading).toContain(`2028年 · ${segment.branchLabel} · ${dateTime(segment.startInstant)} 至 ${dateTime(segment.endExclusiveInstant)}`);
    for(const branch of u.extras.lifeStageStory.branches)for(const stage of branch.stages)for(const paragraph of stage.paragraphs)expect(report.reading).toContain(paragraph);
    expect(report.reading).toContain("2028-12-21 04:58:00");expect(report.reading).toContain("北京时间 UTC+08");
    expect(report.reading).toContain("本步仅部分年份已读");expect(report.reading).toContain("覆盖缺口");
    for(const branch of u.extras.annualMonthStory.months.find(m=>m.label==="大雪月")!.branches)for(const period of branch.periods){expect(report.reading).toContain(dateTime(period.startInstant));expect(report.reading).toContain(dateTime(period.endExclusiveInstant));}
  },60000);
  it("uses exact personal chapter text verbatim even when it looks like Markdown conditions or JSON, and suppresses its dependent overview",async()=>{
    const chapter=b.extras.comprehensive.chapters.find(c=>c.id==="career")!,choice={id:`chapter-${chapter.id}`,label:chapter.title,originalConclusion:`${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${b.extras.comprehensive.version}`,sourceVersions:[b.extras.comprehensive.version]};
    const personalText='我的个人修订原文\n## 条件\n{"evidence":"这是我的话，不能清理"}\n[注1](#reading-condition-1)也是我原本写的内容。\n这些是可对照的候选情境，不表示事情已发生或必然发生。';
    const personalReading=await adopted(b,[choice],[personalText]),synthesis=buildReadingSynthesis({revision:b.revision,assessment:b.assessment,comprehensive:b.extras.comprehensive,annual:b.annual,life:b.extras.life,timeline:b.extras.timeline,personal:personalReading});
    const e={...b.extras,personalReading,synthesis},report=buildLocalReadingReport(b.assessment,b.annual,e);
    expect(report.reading).toContain(`\n\x60\x60\x60text\n${personalText}\n\x60\x60\x60`);expect(report.archive).toBe(buildLocalReadingSnapshot(b.assessment,b.annual,e));
    expect(report.reading).not.toContain(chapter.verdict);
    for(const paragraph of b.extras.synthesis.sections.find(section=>section.id==="relationships")!.answer!.split("\n\n"))expect(report.reading).toContain(paragraph);
    expect(report.archive).toContain(b.extras.comprehensive.chapters.find(c=>c.id==="relationships")!.verdict);
    const stale=structuredClone(e);stale.personalReading.entries[0]!.readingVersions=["old/0.0"];
    expect(()=>buildLocalReadingReport(b.assessment,b.annual,stale)).toThrow();
  },60000);
  it("keeps unmatched record reasons verbatim at the end with only a short count in the opening",async()=>{
    const chapter=b.extras.comprehensive.chapters.find(c=>c.id==="career")!;
    const choice={id:`chapter-${chapter.id}`,label:chapter.title,originalConclusion:`${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${b.extras.comprehensive.version}`,sourceVersions:[b.extras.comprehensive.version]};
    const root=researchNoteRecordSchema.parse({schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:b.revision.caseId,anchor:{kind:"revision",revisionId:b.revision.id},bodyFormat:"markdown",
      body:buildStructuredReadingFeedback(b.assessment,{subjectId:choice.id,subjectLabel:choice.label,sourceVersions:["historical-test/0.1"],originalConclusion:"旧版合成原文。",rating:"unverified",actualSituation:"保存旧记录，不自动套用。"}),
      tags:["解读反馈"],sourceRefs:[],lifecycle:"active",editVersion:1,createdAt:"2026-10-16T00:00:00Z",updatedAt:"2026-10-16T00:00:00Z"});
    const personalReading=await buildLocalPersonalReading({revision:b.revision,assessment:b.assessment,choices:[choice],records:[root]});
    expect(personalReading.issues.length).toBeGreaterThan(0);
    const report=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading});
    const opening=report.reading.split("## 一、整盘主线")[0]!,footer=report.reading.split("### 个人记录适用说明")[1]!;
    expect(opening).toContain(`本次有 ${personalReading.issues.length} 条个人记录适用说明`);
    for(const issue of personalReading.issues){expect(opening).not.toContain(issue);expect(footer).toContain(issue);}
    expect(opening).not.toContain(root.id);expect(report.archive).toBe(buildLocalReadingSnapshot(b.assessment,b.annual,{...b.extras,personalReading}));
  },60000);
  it("keeps annual-event and monthly-domain adoptions separate and removes dependent automatic bridge text",async()=>{
    const year=b.extras.annualEvents.years.find(y=>y.year===2028)!,branch=year.branches[0]!,segment=branch.segments[0]!,item=segment.items[0]!;
    const month=b.extras.monthlyDomains.months[0]!,mb=month.branches[0]!,ms=mb.segments[0]!,domain=ms.domains[0]!;
    const choices=[{id:annualEventFeedbackSubjectId(year.year,segment,item),label:item.title,originalConclusion:annualEventFeedbackText(year,branch,segment,item),sourceVersions:[b.extras.annualEvents.version,...year.sourceVersions]},
      {id:`monthly-domain-${month.monthId}-${ms.id}-${domain.id}`,label:domain.title,originalConclusion:monthlyDomainFeedbackText(b.extras.monthlyDomains,month,mb,ms,domain),sourceVersions:[b.extras.monthlyDomains.version,...b.extras.monthlyDomains.sourceVersions]}];
    const personalReading=await adopted(b,choices,["合成采用：本年这一事项按自己的实际补充阅读。","合成采用：这个月的做事方式按本人的原文阅读。"]);
    const synthesis=buildReadingSynthesis({revision:b.revision,assessment:b.assessment,comprehensive:b.extras.comprehensive,annual:b.annual,life:b.extras.life,timeline:b.extras.timeline,personal:personalReading});
    const report=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading,synthesis});
    for(const entry of personalReading.entries)expect(report.reading).toContain(entry.personalText!);
    expect(report.reading).not.toContain(item.summary);
    const monthText=report.reading.split(`### ${month.label} · ${month.ganZhi}`)[1]!.split(`### ${b.extras.monthlyDomains.months[1]!.label} ·`)[0]!;
    expect(monthText).not.toContain(domain.summary);
    const rhythm=buildMonthReadingRhythm({monthly:b.extras.monthly,monthlyDomains:b.extras.monthlyDomains,annualMonthStory:b.extras.annualMonthStory});
    const firstRhythm=rhythm.branches[0]!.periods[0]!;
    const rhythmText=report.reading.split(`### ${rhythm.headline}`)[1]!.split(`### ${month.label} ·`)[0]!;
    expect(rhythmText).not.toContain(firstRhythm.summary);
    expect(firstRhythm.sourceSubjects).toContain(choices[1]!.id);
    expect(report.archive).toContain(item.summary);expect(report.archive).toContain(domain.summary);
  },60000);
  it("prints the current annual answer completely and gives an exact adopted annual answer priority without changing sibling years",async()=>{
    const year=b.extras.annualLifeStories.years.find(item=>item.year===2032)!,segment=year.branches[0]!.segments[0]!;
    const mainline=segment.paragraphs.find(item=>item.kind==="mainline")!;
    expect(year.version).toBe(ANNUAL_LIFE_STORY_VERSION);
    const original=buildLocalReadingReport(b.assessment,b.annual,b.extras);
    const answer=buildAnnualReaderAnswer({revision:b.revision,assessment:b.assessment,year:b.annual.years.find(item=>item.year===2032)!,story:year,events:b.extras.annualEvents.years.find(item=>item.year===2032)!,branchId:segment.branchId,segmentId:segment.id})!;
    for(const paragraph of answer.paragraphs) {
      if (paragraph.detailsOnly) expect(original.reading.split("### 专业说明原文")[1]).toContain(paragraph.text);
      else expect(original.reading).toContain(`**${annualReaderParagraphLabel(paragraph)}**\n\n${paragraph.text}`);
    }
    expect(original.archive).toContain(annualLifeStoryFeedbackText(year,segment));
    const choice={id:annualLifeStorySubjectId(year,segment),label:"2032年本段总评",originalConclusion:annualLifeStoryFeedbackText(year,segment),sourceVersions:annualLifeStoryFeedbackVersions(year,segment)};
    const text="本人采用的年度答案\n## 这是原文\n依实际情况阅读，不改其他年份。",personalReading=await adopted(b,[choice],[text]);
    const report=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading});
    const originalSegment=b.annual.years.find(item=>item.year===2032)!.judgmentSegments.find(item=>item.id===segment.id)!;
    const marker=`##### 2032年 · ${originalSegment.branchLabel} · ${dateTime(segment.startInstant)} 至 ${dateTime(segment.endExclusiveInstant)}`;
    const selectedText=report.reading.split(marker)[1]!.split("\n\n##### ")[0]!;
    const adoptedAnswerScope=selectedText.split("\n\n###### ")[0]!;
    expect(report.reading).toContain(text);
    expect(selectedText).toContain("本处沿用已采用的个人修订「2032年本段总评」；其原文见本稿首次出现处。");
    expect(adoptedAnswerScope).not.toContain(mainline.text);
    expect(adoptedAnswerScope).not.toContain(answer.headline);
    for(const paragraph of answer.paragraphs.filter(item=>item.kind==="mainline"))expect(adoptedAnswerScope).not.toContain(paragraph.text);
    // Adopting the annual summary does not adopt its separately addressable
    // event readings. Since no new summary was printed, none is covered away.
    const originalEvents=b.extras.annualEvents.years.find(item=>item.year===2032)!.branches.find(item=>item.id===segment.branchId)!.segments.find(item=>item.id===segment.id)!;
    for(const item of originalEvents.items)expect(selectedText).toContain(item.summary);
    expect(report.archive).toContain(mainline.text);expect(report.archive).toContain(text);
    const next=b.extras.annualLifeStories.years.find(item=>item.year===2033)!.branches[0]!.segments[0]!;
    const nextAnswer=buildAnnualReaderAnswer({revision:b.revision,assessment:b.assessment,year:b.annual.years.find(item=>item.year===2033)!,story:b.extras.annualLifeStories.years.find(item=>item.year===2033)!,events:b.extras.annualEvents.years.find(item=>item.year===2033)!,branchId:next.branchId,segmentId:next.id})!;
    for(const paragraph of nextAnswer.paragraphs)expect(report.reading).toContain(paragraph.text);
    for(const paragraph of next.paragraphs)expect(report.archive).toContain(paragraph.text);
    const stale=structuredClone(personalReading);stale.entries[0]!.readingVersions=stale.entries[0]!.readingVersions.map(version=>version===year.version?"hakimi.annual-life-story/0.3.0":version);
    expect(()=>buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading:stale})).toThrow();
  },60000);
  it("exports the corrected conditional judgment while retaining the favorable balance axis and the actual background restraint",async()=>{
    const f=await fixture("male",{date:"1957-09-13",time:"00:26"});
    const year=f.annual.years.find(item=>item.year===2027)!,original=year.judgmentSegments[0]!;
    expect(original.judgment.label).toBe("条件性");expect(original.judgment.primaryAxis).toBe("pattern");
    const pattern=original.judgment.axes.find(axis=>axis.axis==="pattern")!;
    expect(pattern.effect).toBe("mixed");
    expect(original.judgment.axes.find(axis=>axis.axis==="balance")!.effect).toBe("assists");
    expect(pattern.blockers.join("\n")).toMatch(/壬|丁/);
    expect(pattern.rescues.join("\n")).toMatch(/己|壬/);
    const story=f.extras.annualLifeStories.years.find(item=>item.year===2027)!;
    const events=f.extras.annualEvents.years.find(item=>item.year===2027)!;
    const answer=buildAnnualReaderAnswer({revision:f.revision,assessment:f.assessment,year,story,events,branchId:original.branchId,segmentId:original.id})!;
    const mainline=answer.paragraphs.find(paragraph=>paragraph.kind==="mainline")!;
    expect(mainline.text).not.toMatch(/^整体较顺|^本年整体较顺/);
    expect(mainline.basisRefs.some(ref=>ref.axisId===original.judgment.axes.find(axis=>axis.axis==="balance")!.id)).toBe(true);
    const report=buildLocalReadingReport(f.assessment,f.annual,f.extras);
    expect(report.reading).toContain(`**${annualReaderParagraphLabel(mainline)}**\n\n${mainline.text}`);
    expect(report.archive).toBe(buildLocalReadingSnapshot(f.assessment,f.annual,f.extras));
  },60000);
  it("adopting a stage also suppresses its adjacent automatic transition and stage/year bridge, without deleting other stages",async()=>{
    const story=b.extras.lifeStageStory,branch=story.branches[0]!,stage=b.extras.lifeStageYears.stage;
    const choice={id:lifeStageStorySubjectId(story,stage),label:stage.headline,originalConclusion:lifeStageStoryFeedbackText(story,branch,stage),sourceVersions:lifeStageStoryFeedbackVersions(story)};
    const personalReading=await adopted(b,[choice],["合成采用：这一整步按已确认的个人阶段说明理解。"]),synthesis=buildReadingSynthesis({revision:b.revision,assessment:b.assessment,comprehensive:b.extras.comprehensive,annual:b.annual,life:b.extras.life,timeline:b.extras.timeline,personal:personalReading});
    const report=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading,synthesis});
    expect(report.reading).toContain(personalReading.entries[0]!.personalText!);
    const stageBody=report.reading.split(`#### ${branch.label} · ${stage.ganZhi}大运 · ${stage.ageLabel}`)[1]!.split("\n\n#### ")[0]!;
    for(const paragraph of stage.paragraphs)expect(stageBody).not.toContain(paragraph);
    expect(report.reading).not.toContain(`${branch.label} · ${stage.ganZhi}大运 · ${stage.ageLabel} · 大运完整原解释`);
    const other=branch.stages.find(item=>item.decadeId!==stage.decadeId)!;expect(report.reading).toContain(other.paragraphs[0]!);
  },60000);
  it("uses the same plain month and stage answers, separates conditional opportunities, and keeps technical originals in the appendix",()=>{
    const report=buildLocalReadingReport(b.assessment,b.annual,b.extras),main=report.reading.split("## 原文与来源")[0]!;
    const appendix=report.reading.split("### 专业说明原文")[1]!;
    const reading=b.extras.monthlyDomains.months[0]!,segment=reading.branches[0]!.segments[0]!,domain=segment.domains[0]!;
    const month=b.extras.monthly.months.find(item=>item.id===reading.monthId)!;
    const projected=plainMonthlyPresentation({revision:b.revision,collection:b.extras.monthlyDomains,reading,segment,domain,month})!;
    expect(main).toContain(projected.headline);expect(main).toContain(projected.summary);
    expect(main).toContain(projected.examples[0]!); for(const example of domain.examples)expect(appendix).toContain(example);
    expect(appendix).toContain(domain.summary);
    const branch=b.extras.lifeStageStory.branches[0]!,stage=branch.stages.find(item=>item.decadeId===branch.currentDecadeId)!;
    const plain=plainLifeStagePresentation(b.extras.lifeStageStory,stage,b.extras.life)!;
    for(const item of plain.domains)expect(main).toContain(item.summary);
    for(const original of stage.paragraphs)expect(appendix).toContain(original);
    for(const period of buildPlainYearOverview(b.annual))expect(main).toContain(`${period.label}：${period.caption}`);
    expect(report.archive).toBe(buildLocalReadingSnapshot(b.assessment,b.annual,b.extras));
  },60000);
  it("adopting one useful stem leaves every other stem's distinct explanation in the same chapter",async()=>{
    const c=b.extras.comprehensive,g=c.usefulGuidance!,entry=g.entries[0]!;
    const choice={id:`useful-stem-${entry.id}`,label:`${entry.stem}的个人理解`,originalConclusion:`${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}\n${entry.presenceText}\n${entry.judgment}\n${entry.conditions.map(condition=>`条件：${condition}`).join("\n")}\n取用解读规则：${g.version}\n综合解读规则：${c.version}`,sourceVersions:[c.version,g.version]};
    const personalReading=await adopted(b,[choice],["合成采用：只改这一字的个人理解，其他用字继续按原说明阅读。"]);
    const synthesis=buildReadingSynthesis({revision:b.revision,assessment:b.assessment,comprehensive:c,annual:b.annual,life:b.extras.life,timeline:b.extras.timeline,personal:personalReading});
    // A concrete-stem adoption now also affects the supplemental natal detail;
    // the saved synthesis must be rebuilt with that same personal input.
    expect(()=>buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading})).toThrow("综合总评");
    const report=buildLocalReadingReport(b.assessment,b.annual,{...b.extras,personalReading,synthesis});
    const chapter=report.reading.split(`### ${c.chapters.find(ch=>ch.id==="useful_elements")!.title}`)[1]!.split("\n\n### ")[0]!;
    expect(chapter).toContain(personalReading.entries[0]!.personalText!);
    for(const other of g.entries.slice(1)){expect(chapter).toContain(other.presenceText);expect(chapter).toContain(other.judgment);for(const condition of other.conditions)expect(report.reading).toContain(condition);}
    expect(report.archive).toContain(entry.judgment);
  },60000);
  it("retains real birth-year gaps and both sides of a child's sixth birthday without assuming adult work",async()=>{
    const f=await fixture("female"),before=await buildLocalMonthlyOutlook(f.revision,f.assessment,2019),cross=await buildLocalMonthlyOutlook(f.revision,f.assessment,2025);
    for(const monthly of [before,cross]){
      const monthlyDomains=buildMonthlyDomainReadings({revision:f.revision,assessment:f.assessment,monthly});
      const e={sourceRevision:f.revision,comprehensive:f.extras.comprehensive,monthly,monthlyDomains};
      const report=buildLocalReadingReport(f.assessment,null,e);
      expect(report.reading.match(/^### .+月 · /gmu)).toHaveLength(12);
      if(monthly.year===2019)expect(report.reading).toContain("出生前仅保留历法范围");
      else {expect(report.reading).toContain("5周岁段");expect(report.reading).toContain("6周岁段");}
      expect(report.archive).toBe(buildLocalReadingSnapshot(f.assessment,null,e));
    }
  },60000);
});
