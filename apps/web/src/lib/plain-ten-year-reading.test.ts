import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, researchNoteRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildAnnualDomainReading, ANNUAL_DOMAIN_READING_VERSION } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { prepareKeyMonthYear } from "./key-month-event-source";
import { buildKeyMonthReadingChoices, buildKeyMonthPersonalReading, buildKeyMonthEventTendencies } from "./key-month-event-tendencies";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildPlainTenYearReading } from "./plain-ten-year-reading";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";

async function fixture(kind: "B" | "A" | "child" | "A32" | "protect") {
  const child = kind === "child", date = child ? "2019-12-22" : kind === "A"||kind === "A32" ? "1995-08-18" : kind === "protect"?"1957-09-13":"1995-05-18";
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: child ? "11:23" : kind === "protect"?"00:26":"08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: child ? "female" : kind === "A" ? "unspecified" : "male", lunarLeapMonth: false,
    location: { label: "Existing synthetic plain-reading fixture", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-22T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const start = child ? 2030 : kind === "A" ? 2028 : ["A32","protect"].includes(kind)?2032:2026, end = kind === "B" ? 2035 : start;
  const annual = await buildLocalAnnualOutlookRange(revision, assessment, start, end);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: start, endYear: end, years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) };
  const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  const annualLifeStories = buildReadingAnnualLifeStories({ revision, assessment, annual, annualDomains, annualEvents });
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, annual });
  const source = { revision, assessment, annual, annualDomains, annualEvents, annualLifeStories };
  const keyMonthYears = [];
  if(!["A32","protect"].includes(kind))for (const year of annual.years) keyMonthYears.push(await prepareKeyMonthYear(source, year.year, []));
  const extras = { sourceRevision: revision, comprehensive, synthesis, annualDomains, annualEvents, annualLifeStories, keyMonthYears };
  return { ...source, extras, report: buildBriefReadingReport(assessment, annual, extras)! };
}
let b: Awaited<ReturnType<typeof fixture>>, a: typeof b, child: typeof b,a32:typeof b,protect:typeof b;
beforeAll(async () => { b = await fixture("B"); a = await fixture("A"); child = await fixture("child");a32=await fixture("A32");protect=await fixture("protect"); }, 120000);
const read = (input: typeof b) => buildPlainTenYearReading(input);

it("keeps all ten years and 121 actual month parts while grouping only identical concrete facts inside each annual side", () => {
  const before = JSON.stringify(b), result = read(b);
  expect(result.branches).toHaveLength(1);
  expect(result.branches[0]!.years.map(year => year.year)).toEqual(Array.from({ length: 10 }, (_, i) => 2026 + i));
  const parts = result.branches.flatMap(branch => branch.years.flatMap(year => year.segments.flatMap(segment => segment.monthWindows.flatMap(window => window.members))));
  expect(parts).toHaveLength(121);
  const y29 = result.branches[0]!.years.find(year => year.year === 2029)!;
  expect(y29.segments).toHaveLength(2);
  expect(y29.segments[0]!.endExclusiveInstant).toBe("2029-05-22T16:20:00.000Z");
  expect(y29.segments[1]!.startInstant).toBe(y29.segments[0]!.endExclusiveInstant);
  expect(result.bodyText).toContain("2029-05-23 00:20");
  for (const year of result.branches[0]!.years) for (const segment of year.segments) for (const window of segment.monthWindows) {
    expect(window.annualSegmentId).toBe(segment.id); expect(window.branchId).toBe(segment.branchId);
    expect(window.startInstant >= segment.startInstant && window.endExclusiveInstant <= segment.endExclusiveInstant).toBe(true);
    const prepared = b.extras.keyMonthYears.find(item => item.year === year.year)!;
    for (const member of window.members) {
      const original = prepared.monthly.months.find(item => item.id === member.monthId)!.judgmentSegments.find(item => item.id === member.periodId)!;
      expect(original.judgment.axes.find(axis => axis.axis === original.judgment.primaryAxis)?.effect ?? null).toBe(window.effect);
      expect([member.startInstant, member.endExclusiveInstant]).toEqual([original.startInstant, original.endExclusiveInstant]);
    }
  }
  const supports = result.branches[0]!.years.flatMap(year => year.segments.flatMap(segment => segment.monthWindows.filter(window => window.effect === "assists").map(window => [year.year, window.startInstant, window.endExclusiveInstant])));
  expect(supports).toEqual([[2028, "2028-08-06T23:21:11.000Z", "2028-09-07T02:22:10.000Z"], [2028,"2028-09-07T02:22:10.000Z","2028-10-07T18:08:31.000Z"]]);
  expect(result.branches[0]!.years.flatMap(year=>year.segments.flatMap(segment=>segment.monthWindows.filter(window=>window.effect === "assists"))).every(window=>window.featured)).toBe(true);
  expect(JSON.stringify(b)).toBe(before);
});

it("keeps independent relationship and career triggers in their actual months rather than inheriting yearly good or bad", () => {
  const result = read(b), y31 = result.branches[0]!.years.find(year => year.year === 2031)!;
  const job = y31.segments[0]!.events.find(event => event.category === "job_change")!;
  expect(job.months.some(month => month.original.scope.targetRef.nodeType === "month" && month.label.includes("立冬月"))).toBe(true);
  const y32 = result.branches[0]!.years.find(year => year.year === 2032)!;
  const love = y32.segments[0]!.events.find(event => event.category === "commitment")!;
  expect(love.months.every(month => month.original.scope.branchId === "locked" && month.original.category === "commitment")).toBe(true);
  const loveWindow=y32.segments[0]!.monthWindows.find(window=>window.periodIds.includes(love.months[0]!.original.scope.segmentId))!;
  expect(loveWindow.text).toMatch(/见家人|订婚|婚事/u);expect(loveWindow.text).toContain("已有稳定交往");
  const separation=result.branches[0]!.years.find(year=>year.year===2035)!.segments[0]!.monthWindows.find(window=>window.eventNotes.some(note=>note.category === "separation"))!;
  expect(separation.text).toContain("线索较弱");expect(separation.text).toContain("若已有伴侣");
  for (const year of result.branches[0]!.years) for (const segment of year.segments) for (const event of segment.events) for (const month of event.months) {
    expect(month.original.scope.year).toBe(year.year);
    expect(month.original.scope.startInstant >= segment.startInstant && month.original.scope.endExclusiveInstant <= segment.endExclusiveInstant).toBe(true);
  }
});

it("highlights supported yearly events without promoting every independent monthly possibility into the main reading", () => {
  const result = read(b), selected = result.branches.flatMap(branch => branch.years.flatMap(year => year.segments
    .flatMap(segment => segment.events.map(event => ({ year: year.year, event })))));
  expect(selected.filter(item => item.event.category === "romance").map(item => item.year)).toEqual([2032]);
  expect(selected.filter(item => item.event.category === "commitment").map(item => item.year)).toEqual([2032]);
  expect(selected.filter(item => item.event.category === "separation").map(item => item.year)).toEqual([2035]);
  expect(selected.every(item => item.event.months.length <= 1)).toBe(true);
  expect(result.bodyText).not.toContain("以下只列本月独立出现的线索");
  expect(result.bodyText).not.toContain("事业：事业");
  const windows = result.branches.flatMap(branch => branch.years.flatMap(year => year.segments.flatMap(segment => segment.monthWindows)));
  expect(windows.flatMap(window => window.members)).toHaveLength(121);
  for (const window of windows) {
    expect(window.text).not.toContain("事业与做事：");
    expect(window.text).not.toContain("财务与回报：");
    expect(typeof window.featured).toBe("boolean");
    if(window.opportunities.length) expect(window.text).toContain("机会：");
    if(window.cautions.length) expect(window.text).toContain("阻力：");
  }
  for(const year of result.branches[0]!.years) for(const segment of year.segments){
    expect(segment.domains.map(domain=>domain.domain)).toEqual(["career","wealth","relationship"]);
    expect(segment.domains.every(domain=>domain.showInBrief&&domain.text.length>20)).toBe(true);
    expect(segment.monthWindows.filter(window=>window.featured).length).toBeLessThan(segment.monthWindows.length);
    for(const event of segment.events) for(const month of event.months) expect(segment.monthWindows.find(window=>window.periodIds.includes(month.original.scope.segmentId))?.featured).toBe(true);
  }
});

it("retains hidden positive support beside visible obstruction and distinguishes month facts from annual direction",()=>{
  const result=read(b),year=result.branches[0]!.years.find(year=>year.year===2026)!;
  const august=year.segments[0]!.monthWindows.find(window=>window.members.some(member=>member.label==="立秋月"))!;
  expect(august.effect).toBe("mixed");
  expect(august.opportunities.some(fact=>fact.visibility==="main_hidden"&&fact.actor==="伤官")).toBe(true);
  expect(august.cautions.some(fact=>fact.visibility==="visible"&&fact.actor==="正印")).toBe(true);
  expect(august.text).toContain("机会：");expect(august.text).toContain("阻力：");
  expect(august.text).toMatch(/方案|成果/u);expect(august.text).toMatch(/结余|认可|回报/u);
  const y29=result.branches[0]!.years.find(year=>year.year===2029)!;
  const pressure=y29.segments[0]!.monthWindows.find(window=>window.effect==="obstructs")!;
  expect(pressure.text).toContain("全年这一阶段的主线有可推进条件");
  const mixed=result.branches.flatMap(branch=>branch.years.flatMap(year=>year.segments.flatMap(segment=>segment.monthWindows))).filter(window=>window.effect==="mixed");
  for(const window of mixed.filter(window=>!window.opportunities.length))expect(window.members.some(member=>member.directionNote.includes("支持"))).toBe(true);
  const y33=result.branches[0]!.years.find(year=>year.year===2033)!.segments[0]!;
  const october=y33.monthWindows.find(window=>window.members.some(member=>member.label === "寒露月"))!;
  expect(october.text).toContain("不能把新合作的线索当作已经到账");
  const y34=result.branches[0]!.years.find(year=>year.year===2034)!.segments[0]!,y35=result.branches[0]!.years.find(year=>year.year===2035)!.segments[0]!;
  expect(y34.domains[0]!.text).toContain("考核");expect(y35.domains[0]!.text).toContain("任务");
  expect(y34.domains[0]!.text).not.toEqual(y35.domains[0]!.text);
});

it("uses independent domain evidence for the same 2032 year in three actually calculated charts",()=>{
  const cases=[b,a32,protect].map(input=>({input,result:read(input)}));
  const rows=cases.map(({result})=>result.branches[0]!.years.find(year=>year.year===2032)!.segments[0]!);
  const actors=cases.map(({input})=>input.annual.years.find(year=>year.year===2032)!.judgmentSegments[0]!.judgment.axes.find(axis=>axis.axis === "pattern")!.stemActions!.items.find(action=>action.visibility === "visible")!);
  expect(actors.map(actor=>[actor.tenGod,actor.effect])).toEqual([["正财","assists"],["伤官","assists"],["偏财","obstructs"]]);
  expect(rows[0]!.domains.find(domain=>domain.domain === "wealth")!.text).toMatch(/已有工资|报酬|合同款/u);
  expect(rows[1]!.domains.find(domain=>domain.domain === "career")!.text).toMatch(/方案|技术|能力/u);
  expect(rows[1]!.domains.find(domain=>domain.domain === "wealth")!.text).not.toMatch(/新增合作.*收入|新客户|工资.*到账/u);
  expect(rows[2]!.domains.find(domain=>domain.domain === "wealth")!.headline).toContain("必要支持");
  expect(rows[2]!.domains.find(domain=>domain.domain === "wealth")!.text).not.toMatch(/新客户|额外订单|工资.*到账/u);
  for(const row of rows)for(const evidence of row.domainEvidence)expect(evidence.sentences.every(sentence=>sentence.sources.length>0)).toBe(true);
});

it("keeps exact target pressure, continuing fortune background and constrained relief distinct",()=>{
  const result=read(b),year=(value:number)=>result.branches[0]!.years.find(year=>year.year===value)!;
  expect(year(2026).segments[0]!.judgmentText).toContain("丙正印与辛食神有合及克的作用");
  expect(year(2026).segments[0]!.judgmentText).not.toContain("合住");
  expect(year(2027).segments[0]!.judgmentText).toContain("丁偏印与辛食神有克的作用");
  expect(year(2029).segments[1]!.judgmentText).toContain("同段大运持续的阻力");
  expect(year(2032).segments[0]!.judgmentText).toMatch(/壬正财.*牵合.*丁偏印/u);
  expect(year(2032).segments[0]!.judgmentText).toMatch(/戊劫财.*制约.*壬正财/u);
  expect(year(2033).segments[0]!.judgmentText).toMatch(/癸偏财.*制约.*丁偏印/u);
  expect(year(2033).segments[0]!.judgmentText).toMatch(/癸偏财.*牵合.*戊劫财|戊劫财.*牵合.*癸偏财/u);
  expect(year(2033).segments[0]!.judgmentText).toContain("七杀");
  expect(result.scopeText).toContain("共同月份规律");
  for(const value of [2026,2027,2028,2029,2030,2032,2033,2034,2035])expect(year(value).segments.flatMap(segment=>segment.monthWindows).filter(window=>window.selectionReasons.includes("独立月触发：job_change/possible")&&window.members.some(member=>member.label === "立冬月"))).toEqual([]);
  expect(year(2031).segments.flatMap(segment=>segment.monthWindows).some(window=>window.featured&&window.members.some(member=>member.label === "立冬月"))).toBe(true);
  for(const row of result.branches[0]!.years)for(const segment of row.segments)for(const event of segment.events.filter(event=>event.origin!=="personal"))expect(event.showInMain).toBe(false);
});

it("never compresses counter-evidence for an income opportunity into a positive financial claim",()=>{
  const result=read(b),windows=result.branches.flatMap(branch=>branch.years.flatMap(year=>year.segments.flatMap(segment=>segment.monthWindows)));
  const counters=windows.flatMap(window=>window.members.flatMap(member=>member.topics.flatMap(topic=>topic.facts))).filter(fact=>fact.kind === "caution"&&fact.eventId?.endsWith("money_inflow"));
  expect(counters.length).toBeGreaterThan(0);
  for(const fact of counters){
    expect(fact.shortText).toContain("原有牵制");expect(fact.shortText).not.toContain("有收入线索");
    const original=b.extras.keyMonthYears.flatMap(prepared=>prepared.reading.branches.flatMap(branch=>branch.periods.flatMap(period=>period.events))).find(event=>event.id===fact.eventId)!;
    expect(original.counterEvidenceIds.length).toBeGreaterThan(0);
  }
  expect(windows.some(window=>window.text.includes("财运阻力：新增合作或额外任务有收入线索"))).toBe(false);
  for(const year of [2031,2032]){
    const window=result.branches[0]!.years.find(row=>row.year===year)!.segments.flatMap(segment=>segment.monthWindows).find(window=>window.members.some(member=>member.label === "清明月"))!;
    expect(window.effect).toBe("obstructs");expect(window.text).toContain("综合牵制仍在");
    expect(window.text).toContain("有克的作用");
  }
});

it("keeps distinct actor mechanisms in short monthly text instead of flattening different facts",()=>{
  const result=read(b),year=result.branches[0]!.years.find(year=>year.year===2028)!;
  const august=year.segments.flatMap(segment=>segment.monthWindows).find(window=>window.members.some(member=>member.label === "立秋月"))!;
  const september=year.segments.flatMap(segment=>segment.monthWindows).find(window=>window.members.some(member=>member.label === "白露月"))!;
  expect(august.text).toContain("技术改进");expect(september.text).toContain("稳定产出");
  const facts=result.branches.flatMap(branch=>branch.years.flatMap(year=>year.segments.flatMap(segment=>segment.monthWindows.flatMap(window=>window.members.flatMap(member=>member.topics.flatMap(topic=>topic.facts))))));
  const direct=facts.find(fact=>fact.domain === "career"&&fact.kind === "caution"&&fact.actor === "正印")!,indirect=facts.find(fact=>fact.domain === "career"&&fact.kind === "caution"&&fact.actor === "偏印")!;
  expect(direct.shortText).toContain("组织或专业支持");expect(indirect.shortText).toContain("专项方法或职业路线");
  expect(direct.shortText).not.toBe(indirect.shortText);
});

it("keeps unknown-direction branches separate and retains child learning scenes without adult event claims", () => {
  const before = JSON.stringify({ a, child }), unknown = read(a), young = read(child);
  expect(unknown.branches.map(branch => branch.id)).toEqual(["forward", "backward"]);
  for (const branch of unknown.branches) for (const year of branch.years) for (const segment of year.segments) {
    expect(segment.branchId).toBe(branch.id);
    expect(segment.monthWindows.every(window => window.branchId === branch.id)).toBe(true);
    expect(segment.events.every(event => event.months.every(month => month.original.scope.branchId === branch.id))).toBe(true);
  }
  expect(young.branches[0]!.years[0]!.segments.flatMap(segment => segment.events)).toEqual([]);
  expect(young.bodyText).not.toMatch(/升职|订婚|结婚|离职|新客户/u);
  expect(young.bodyText).toMatch(/学习|同伴|活动/u);
  expect(JSON.stringify({ a, child })).toBe(before);
});

it("rejects foreign charts, years, branches and changed month inputs while stating genuine coverage gaps", () => {
  expect(() => read({ ...b, report: a.report })).toThrow("命盘");
  const wrongYear = structuredClone(b); wrongYear.extras.keyMonthYears[0]!.year = 2038;
  expect(() => read(wrongYear)).toThrow("年份");
  const wrongBranch = structuredClone(b); wrongBranch.report.years[0]!.branches[0]!.segments[0]!.branchId = "forward";
  expect(() => read(wrongBranch)).toThrow("另一顺逆");
  const changed = structuredClone(b); changed.extras.keyMonthYears[0]!.reading.branches[0]!.periods[0]!.events[0]!.text += "wrong";
  expect(() => read(changed)).toThrow("结论或依据已变化");
  const extras = { ...b.extras, keyMonthYears: b.extras.keyMonthYears.slice(0, 1) };
  const partial = buildPlainTenYearReading({ ...b, extras, report: buildBriefReadingReport(b.assessment, b.annual, extras)! });
  expect(partial.branches[0]!.years).toHaveLength(10); expect(partial.gaps).toHaveLength(9);
  expect(partial.branches[0]!.years[1]!.segments[0]!.monthWindows).toEqual([]);
});

async function adoptedRecords(choice: ReturnType<typeof buildKeyMonthReadingChoices>[number]): Promise<ResearchNoteRecord[]> {
  const root = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: b.revision.caseId,
    anchor: { kind: "revision", revisionId: b.revision.id }, bodyFormat: "markdown", body: buildStructuredReadingFeedback(b.assessment,
      { subjectId: choice.id, subjectLabel: choice.label, originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "unverified", actualSituation: "synthetic" }),
    tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-22T00:00:00Z", updatedAt: "2026-10-22T00:00:00Z" });
  const review = researchNoteRecordSchema.parse({ ...root, id: crypto.randomUUID(), body: await buildReadingFeedbackReview(root, null,
    readingFeedbackSource(b.assessment, choice.sourceVersions), { state: "revised", notes: "明确采用", revisedConclusion: "完整个人原文\n第二行保留；不与自动判断混写。", occurredAt: "" }),
    createdAt: "2026-10-22T00:01:00Z", updatedAt: "2026-10-22T00:01:00Z" });
  return [root, review];
}
it("suppresses replaced yearly, monthly-domain and month-story words and direction, retaining exact personal text", async () => {
  const prepared = b.extras.keyMonthYears.find(item => item.year === 2029)!, year = b.annual.years.find(item => item.year === 2029)!;
  const source = { revision: b.revision, assessment: b.assessment, annual: b.annual, year,
    annualDomains: b.extras.annualDomains.years.find(item => item.year === 2029)!, annualEvents: b.extras.annualEvents.years.find(item => item.year === 2029)!,
    annualLifeStory: b.extras.annualLifeStories.years.find(item => item.year === 2029)!, monthly: prepared.monthly, monthlyDomains: prepared.monthlyDomains, annualMonthStory: prepared.annualMonthStory };
  const month = prepared.monthlyDomains.months.find(item => item.label === "立夏月")!, segment = month.branches[0]!.segments[0]!;
  for (const subjectId of ["annual-2029", `monthly-domain-${month.monthId}-${segment.id}-wealth`, `annual-month-story-2029-${month.monthId}-${segment.id}-wealth`]) {
    const choices = buildKeyMonthReadingChoices(source), choice = choices.find(item => item.id === subjectId)!;
    const records = await adoptedRecords(choice), personal = await buildKeyMonthPersonalReading(source, records);
    const current = { ...prepared, personal, reading: buildKeyMonthEventTendencies({ ...source, personal }) };
    const globalPersonal = subjectId === "annual-2029" ? await buildLocalPersonalReading({ revision: b.revision, assessment: b.assessment, records, choices: [choice] }) : undefined;
    const extras = { ...b.extras, personalReading: globalPersonal, keyMonthYears: b.extras.keyMonthYears.map(item => item.year === 2029 ? current : item) };
    const report = buildBriefReadingReport(b.assessment, b.annual, extras)!, result = buildPlainTenYearReading({ ...b, report, extras });
    const y = result.branches[0]!.years.find(item => item.year === 2029)!, target = y.segments[0]!.monthWindows.find(window => window.periodIds.includes(segment.id))!;
    expect(target.origin).toBe("personal"); expect(target.effect).toBeNull();
    expect(target.members[0]!.topics.find(topic => topic.domain === "wealth")!.origin).toBe("personal");
    expect(result.personalTexts.some(text => text.subjectId === subjectId && text.text === "完整个人原文\n第二行保留；不与自动判断混写。")).toBe(true);
    if (subjectId !== "annual-2029") {
      expect(target.members[0]!.topics.find(topic => topic.domain === "career")!.origin).not.toBe("personal");
      expect(y.segments[1]!.monthWindows.every(window => window.origin !== "personal")).toBe(true);
    } else expect(y.segments.every(part => part.origin === "personal")).toBe(true);
  }
}, 60000);

it("preserves verified non-income context in annual and selected monthly financial events",async()=>{
  for(const work of ["student","retired","caregiving","seeking_work"] as const){
    const note=researchNoteRecordSchema.parse({schemaVersion:"1.0.0",id:crypto.randomUUID(),caseId:b.revision.caseId,
      anchor:{kind:"revision",revisionId:b.revision.id},bodyFormat:"markdown",body:await buildReadingContextRecord(b.revision,null,{work,relationship:"unspecified",fromYear:2033,toYear:2033,notes:""}),
      tags:["阅读背景"],sourceRefs:[],lifecycle:"active",editVersion:1,createdAt:"2026-10-22T00:00:00Z",updatedAt:"2026-10-22T00:00:00Z"});
    const resolved=await resolveReadingContext({revision:b.revision,records:[note]});
    const contextual=buildContextualReadingBundle({revision:b.revision,assessment:b.assessment,comprehensive:b.extras.comprehensive,
      annualDomains:b.annualDomains,context:resolved.latest,referenceYear:2033})!;
    const source={...b,contextual},annualEvents=buildReadingAnnualEvents(source);
    const annualLifeStories=buildReadingAnnualLifeStories({...source,annualEvents});
    const prepared=await prepareKeyMonthYear({...source,annualEvents,annualLifeStories},2033,[]);
    const extras={...b.extras,contextual,annualEvents,annualLifeStories,keyMonthYears:[prepared]};
    const report=buildBriefReadingReport(b.assessment,b.annual,extras)!,result=buildPlainTenYearReading({...b,report,extras});
    const selected=result.branches[0]!.years.find(year=>year.year===2033)!.segments.flatMap(segment=>segment.events).filter(event=>["money_inflow","money_loss"].includes(event.category));
    expect(selected.length).toBeGreaterThan(0);expect(selected.flatMap(event=>event.months).length).toBeGreaterThan(0);
    for(const event of selected){
      const original=report.years.find(year=>year.year===2033)!.branches[0]!.segments.flatMap(segment=>segment.eventTendencies).find(item=>item.id===event.id)!.original;
      expect(original.workState).toBe(work);expect(event.text).toBe(original.text);
      for(const month of event.months){expect(month.original.workState).toBe(work);expect(month.text).toBe(month.original.text);expect(month.text).not.toContain("已谈妥报酬的新任务");}
    }
  }
},60000);

it("exposes exact adopted monthly and event-source originals through the window IDs used by the UI",async()=>{
  const prepared=b.extras.keyMonthYears.find(item=>item.year===2032)!,year=b.annual.years.find(item=>item.year===2032)!;
  const source={revision:b.revision,assessment:b.assessment,annual:b.annual,year,
    annualDomains:b.annualDomains.years.find(item=>item.year===2032)!,annualEvents:b.annualEvents.years.find(item=>item.year===2032)!,
    annualLifeStory:b.annualLifeStories.years.find(item=>item.year===2032)!,monthly:prepared.monthly,monthlyDomains:prepared.monthlyDomains,annualMonthStory:prepared.annualMonthStory};
  const selected=read(b).branches[0]!.years.find(item=>item.year===2032)!.segments[0]!.events.find(event=>event.category==="commitment")!.months[0]!.original;
  const monthlySubject=`monthly-domain-${selected.scope.monthId}-${selected.scope.segmentId}-relationship`;
  const eventSubject=selected.sourceSubjects.find(subject=>subject.startsWith("annual-event-2032-"))!;
  expect(eventSubject).toBeTruthy();
  for(const subjectId of [monthlySubject,eventSubject]){
    const choices=buildKeyMonthReadingChoices(source),choice=choices.find(item=>item.id===subjectId)!;
    const records=await adoptedRecords(choice),personal=await buildKeyMonthPersonalReading(source,records);
    const current={...prepared,personal,reading:buildKeyMonthEventTendencies({...source,personal})};
    const personalReading=subjectId===eventSubject?await buildLocalPersonalReading({revision:b.revision,assessment:b.assessment,records,choices:[choice]}):undefined;
    const extras={...b.extras,personalReading,keyMonthYears:b.extras.keyMonthYears.map(item=>item.year===2032?current:item)};
    const report=buildBriefReadingReport(b.assessment,b.annual,extras)!,result=buildPlainTenYearReading({...b,report,extras});
    const windows=result.branches[0]!.years.find(item=>item.year===2032)!.segments.flatMap(segment=>segment.monthWindows);
    const adoptedWindows=windows.filter(window=>window.eventNotes.some(note=>note.personalTextIds.length));
    expect(adoptedWindows.length).toBeGreaterThan(0);
    for(const window of adoptedWindows){
      expect(window.featured).toBe(true);expect(window.effect).toBeNull();expect(window.origin).toBe("personal");
      for(const event of window.eventNotes)for(const id of event.personalTextIds){
        expect(window.personalTextIds).toContain(id);
        expect(result.personalTexts.find(text=>text.id===id)?.text).toBe("完整个人原文\n第二行保留；不与自动判断混写。");
      }
      for(const event of window.eventNotes)for(const subject of event.sourceSubjects)expect(window.sourceSubjects).toContain(subject);
    }
  }
},60000);
