import "fake-indexeddb/auto";
import { afterAll, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { researchNoteRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildLifeStageYears } from "./local-life-stage-years";
import { buildAnnualEventScenarios, ANNUAL_EVENT_SCENARIOS_VERSION } from "./annual-event-scenarios";
import { buildReadingTimeline } from "./local-reading-timeline";
import { buildReadingPriorities } from "./local-reading-priorities";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildAnnualMonthStory } from "./local-annual-month-story";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { legacyAnnualInputFromExtras } from "./local-personal-reading-legacy";
import { buildReadingFeedbackChoices, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import { READING_YEAR_SUMMARY_VERSION, summarizeAnnualJudgmentCaptions } from "./outlook-judgment-presentation";
import { readingTimelineNarrativeSubjectId, readingTimelineNarrativeText, readingTimelineStageText } from "./local-reading-timeline-record";
import { annualDomainFeedbackText } from "./local-annual-domain-record";
import { monthlyDomainFeedbackText } from "./local-monthly-domain-record";
import { annualEventFeedbackSubjectId, annualEventFeedbackText } from "./local-annual-event-record";
import { annualEventCompositionChoices } from "./local-annual-event-composition-record";
import { annualMonthStoryEntries, annualMonthStorySubjectId, annualMonthStoryFeedbackText, annualMonthStoryFeedbackVersions } from "./local-annual-month-story-record";
import { lifeStageStoryEntries, lifeStageStorySubjectId, lifeStageStoryFeedbackText, lifeStageStoryTransitionSubjectId,
  lifeStageStoryTransitionText, lifeStageStoryFeedbackVersions } from "./local-life-stage-story-record";
import { lifeStageYearSubjectId, lifeStageYearFeedbackText, lifeStageYearFeedbackVersions } from "./local-life-stage-years-record";
import { annualLifeStorySubjectId, annualLifeStoryFeedbackText, annualLifeStoryFeedbackVersions } from "./annual-life-story-record";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle, contextualFeedbackText, contextualFeedbackVersions } from "./local-contextual-reading-record";
import { prepareKeyMonthYear } from "./key-month-event-source";
import { buildBriefReadingReport } from "./brief-reading-report";
import { buildLocalReadingReport, LOCAL_READING_EDITION_VERSION } from "./local-reading-edition";
import { buildLocalReadingSnapshot, LOCAL_READING_SNAPSHOT_TAG } from "./local-reading-record";
import { buildReadingExplanationIndex, readReadingExplanationIndex, READING_EXPLANATION_MARKER,
  READING_EXPLANATION_SHARED_VERSIONS_MARKER, READING_EXPLANATION_SHARED_VERSIONS_FORMAT } from "./reading-explanation-index";
import { ReadingReportCapacityError, encodeReadingReportBundle, decodeReadingReportBundle, READING_REPORT_BUNDLE_MARKER, READING_REPORT_BUNDLE_VERSION } from "./local-reading-report-bundle";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { syntheticReviewIndex } from "../test/reading-case-review-fixture";


import {buildStructuredReadingFeedback,buildReadingFeedbackReview,readingFeedbackSource,LOCAL_READING_REVIEW_TAG} from './local-reading-feedback';
import {LOCAL_READING_FEEDBACK_TAG} from './local-reading-record';
// Four fixed adjacent cases selected before observing any capacity outcome.
// The original Q07 baseline stays in reading-explanation-dual-branch.integration.test.ts.
// These are synthetic engineering regressions, not new blind or usability samples.
type CapacityScenario = {id:string;date:string;time:string;sex:'unspecified';selectedYear:number;contextLength:number|null;personalLength:number;reason:string};
const scenarios:CapacityScenario[]=[
  {
    "id": "C1-q07-context-2000",
    "date": "1990-12-19",
    "time": "11:42",
    "sex": "unspecified",
    "selectedYear": 2026,
    "contextLength": 2000,
    "personalLength": 0,
    "reason": "Notes at the existing 2000-character accepted context boundary; no inferred work or relationship state."
  },
  {
    "id": "C2-q07-adoption-12000",
    "date": "1990-12-19",
    "time": "11:42",
    "sex": "unspecified",
    "selectedYear": 2026,
    "contextLength": null,
    "personalLength": 12000,
    "reason": "Explicit career adoption via an actual feedback/review chain at the existing 12000-character review limit."
  },
  {
    "id": "C3-q07-2034-handover",
    "date": "1990-12-19",
    "time": "11:42",
    "sex": "unspecified",
    "selectedYear": 2034,
    "contextLength": null,
    "personalLength": 0,
    "reason": "Keep all ten years; select the 2034 monthly detail with backward November handover instead of the default 2026 forward handover."
  },
  {
    "id": "C4-second-dual-chart",
    "date": "1988-05-17",
    "time": "22:31",
    "sex": "unspecified",
    "selectedYear": 2026,
    "contextLength": null,
    "personalLength": 0,
    "reason": "One additional fixed double-direction synthetic chart chosen before any capacity result."
  }
];
const databases:ResearchDatabase[]=[];
afterAll(async()=>{vi.restoreAllMocks();for(const database of databases)await database.delete();});
function syntheticText(length:number,topic:string){let result='';for(let n=0;result.length<length;n++)result+='第'+String(n).padStart(4,'0')+'条：'+topic+'。保留原来的具体事情、条件和不同时间范围，不把说明写成必然结果。\n';return result.slice(0,length).trimEnd().padEnd(length,'。');}
it.each(scenarios)('$id: fixed complete UI-equivalent capacity observation',async(scenario:CapacityScenario)=>{
  const database=new ResearchDatabase('novice-capacity-'+scenario.id+'-'+crypto.randomUUID(),{targetSchema:13,releaseWritesLocked:false});databases.push(database);
  const repository=new ResearchRepository(database);
  const calculated=await calculateChart({schemaVersion:'1.0.0',calendarType:'gregorian',date:scenario.date,time:scenario.time,timePrecision:'exact_minute',timeZone:'Asia/Shanghai',sex:scenario.sex,lunarLeapMonth:false,
    location:{label:scenario.id==='C4-second-dual-chart'?'探索合成 adjacent-01':'探索合成 Q07',latitude:null,longitude:null,precision:'unknown'},
    sourceNote:'20261026 new synthetic exploratory input; not personal or held-out data'},WORKING_DEFAULT_RULE_PROFILE);
  const caseBundle=await new CaseRepository(database).createCase({alias:'合成 Q07 双分支完整保存',calculated}),revision=caseBundle.revisions[0]!;
  const contextText=scenario.contextLength?syntheticText(scenario.contextLength,'这是允许范围内较长的合成生活背景，未填写职业和关系状态'):'合成背景，指定范围内保持此状态，仅用于审读适用性。';
  const personalText=scenario.personalLength?syntheticText(scenario.personalLength,'这是用户明确采用的合成事业原文，事实与修订范围分别保留'):'';
  const contextNote=await repository.createResearchNote({caseId:revision.caseId,anchor:{kind:'revision',revisionId:revision.id},body:await buildReadingContextRecord(revision,null,
    {work:'unspecified',relationship:'unspecified',fromYear:2026,toYear:2035,notes:contextText}),tags:['阅读背景'],sourceRefs:[],lifecycle:'active'});
  const legacyIndex=syntheticReviewIndex({caseId:revision.caseId,revisionId:revision.id,chartResultHash:revision.manifest.resultHash});
  const legacyArchive='# 旧 v1 合成档案\r\n原句 🌿 e\u0301 与换行保留。\n\n<!-- hakimi-reading-explanation-index-v1 -->\n'+JSON.stringify(legacyIndex)+'\n<!-- /hakimi-reading-explanation-index-v1 -->';
  const legacyReport={reading:'旧阅读稿原文\r\n不由新版重新生成。',archive:legacyArchive,version:'hakimi.local-reading-edition/0.22.0'};
  const legacyBody=await packReadingSnapshot(await encodeReadingReportBundle(legacyReport));
  const legacyNote=await repository.createResearchNote({caseId:revision.caseId,anchor:{kind:'revision',revisionId:revision.id},body:legacyBody,tags:[LOCAL_READING_SNAPSHOT_TAG],sourceRefs:[],lifecycle:'active'});
  const inputRecords=[contextNote,legacyNote];
  let stage='calculation',attemptedWrite=false,snapshotWriteCalls=0;
  const metadata:any={scenario:scenario.id,scenarioInput:scenario,sourceScope:'complete default UI extras, selected monthly fields, actual feedback/review adoption when declared',
    contextCharacters:contextText.length,personalCharacters:personalText.length,reportVersion:LOCAL_READING_EDITION_VERSION,startedAt:new Date().toISOString()};
  try {
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  // The actual UI defaults to its current instant, then the first current decade.
  // Fix that instant within the audited date so a later calendar year cannot change the fixture.
  const referenceInstant = "2026-10-26T12:00:00.000Z";
  const annual = await buildLocalAnnualOutlookRange(revision, assessment, 2026, 2035);
  const life = await buildLocalLifeOutlook(revision, assessment, 2026, { atInstant: referenceInstant });
  const lifeStageStory = buildLifeStageStory({ revision, assessment, life });
  const timeline = buildReadingTimeline({ revision, annual, life });
  const annualScenarios = { version: ANNUAL_EVENT_SCENARIOS_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map(year => ({ year: year.year, transitNodeRef: year.transitNodeRef, scenarios: buildAnnualEventScenarios(revision, assessment, year) })) };
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: 2026, endYear: 2035,
    years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) };
  const resolved = await resolveReadingContext({ revision, records: [contextNote] });
  const contextual = buildContextualReadingBundle({ revision, assessment, comprehensive, annualDomains, context: resolved.latest, referenceYear: 2026 })!;
  const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains, contextual });
  const annualLifeStories = buildReadingAnnualLifeStories({ revision, assessment, annual, annualDomains, annualEvents, contextual });
  const displayedDecadeId = life.decades.find(decade => decade.isCurrent)?.id ?? life.decades[0]!.id;
  const lifeStageYears = buildLifeStageYears({ revision, assessment, life, lifeStageStory, selectedDecadeId: displayedDecadeId,
    annual, annualDomains, annualEvents, contextual });
  const monthly = await buildLocalMonthlyOutlook(revision, assessment, scenario.selectedYear);
  const monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly, contextual });
  const annualMonthStory = buildAnnualMonthStory({ revision, assessment, year: annual.years.find(item => item.year === scenario.selectedYear)!, annualDomains: annualDomains.years.find(item => item.year === scenario.selectedYear)!,
    annualEvents: annualEvents.years.find(item => item.year === scenario.selectedYear)!, monthly, monthlyDomains, contextual });
  const priorities = buildReadingPriorities({ revision, annual, life, timeline, annualDomains });
  const legacySource = legacyAnnualInputFromExtras(assessment, annual, { sourceRevision: revision, annualDomains, contextual, monthly, monthlyDomains,
    life, lifeStageStory, lifeStageYears });
  // Match every source family supplied to the UI's personal-reading builder.
  // There are no feedback notes, but its complete source/version metadata still belongs in the saved report.
  const choices: ReadingFeedbackChoice[] = [];
  const addChoice = (id: string, originalConclusion: string, sourceVersions: string[]) => choices.push({ id, label: id, originalConclusion, sourceVersions });
  addChoice("annual-overview", `${summarizeAnnualJudgmentCaptions(annual)}\n${annual.summary}`, [annual.version, READING_YEAR_SUMMARY_VERSION]);
  addChoice("life-overview", `${life.referenceLabel}\n${life.summary}`, [life.version]);
  for (const branch of timeline.branches) addChoice(readingTimelineNarrativeSubjectId(timeline, branch), readingTimelineNarrativeText(timeline, branch), [timeline.version, ...timeline.sourceVersions]);
  for (const stage of timeline.stages) addChoice(`timeline-stage-${stage.id}`, readingTimelineStageText(stage), [timeline.version, ...timeline.sourceVersions]);
  for (const chapter of comprehensive.chapters) addChoice(`chapter-${chapter.id}`, chapter.title + " · " + chapter.headline + "\n" + chapter.verdict + "\n" + chapter.paragraphs.join("\n") + "\n综合解读规则：" + comprehensive.version, [comprehensive.version]);
  for (const entry of comprehensive.usefulGuidance?.entries ?? []) addChoice(`useful-stem-${entry.id}`, [entry.presenceText, entry.judgment, ...entry.conditions].join("\n"), [comprehensive.version, comprehensive.usefulGuidance!.version]);
  for (const decade of life.decades) addChoice(`decade-${decade.id}`, [decade.headline, ...decade.paragraphs, outlookJudgmentFeedbackText(decade.judgment)].join("\n"), [life.version]);
  for (const month of monthly.months) addChoice(`month-${month.id}`, [month.headline, ...month.paragraphs, outlookJudgmentFeedbackText(month.judgment)].join("\n"), [monthly.version]);
  for (const year of annualScenarios.years) for (const scenario of year.scenarios) addChoice(`event-${year.year}-${scenario.id}`, [scenario.title, scenario.summary, ...scenario.examples, ...scenario.conditions].join("\n"), [annualScenarios.version]);
  for (const reading of annualDomains.years) for (const branch of reading.branches) for (const segment of branch.segments) for (const domain of segment.domains)
    addChoice(`annual-domain-${reading.year}-${segment.id}-${domain.id}`, annualDomainFeedbackText(reading, branch, segment, domain), [reading.version, ...reading.sourceVersions]);
  for (const reading of monthlyDomains.months) for (const branch of reading.branches) for (const segment of branch.segments) for (const domain of segment.domains)
    addChoice(`monthly-domain-${reading.monthId}-${segment.id}-${domain.id}`, monthlyDomainFeedbackText(monthlyDomains, reading, branch, segment, domain), [monthlyDomains.version, ...monthlyDomains.sourceVersions]);
  for (const reading of contextual.readings) addChoice(reading.subjectId, contextualFeedbackText(reading, contextual), contextualFeedbackVersions(reading, contextual));
  for (const reading of annualEvents.years) for (const branch of reading.branches) for (const segment of branch.segments) for (const item of segment.items)
    addChoice(annualEventFeedbackSubjectId(reading.year, segment, item), annualEventFeedbackText(reading, branch, segment, item), [annualEvents.version, ...reading.sourceVersions]);
  choices.push(...annualEventCompositionChoices(annualEvents));
  for (const { month, branch, period, domain } of annualMonthStoryEntries(annualMonthStory)) addChoice(annualMonthStorySubjectId(annualMonthStory, month, period, domain),
    annualMonthStoryFeedbackText(annualMonthStory, month, branch, period, domain), annualMonthStoryFeedbackVersions(annualMonthStory));
  for (const entry of lifeStageStoryEntries(lifeStageStory)) addChoice(entry.kind === "stage" ? lifeStageStorySubjectId(lifeStageStory, entry.stage) : lifeStageStoryTransitionSubjectId(lifeStageStory, entry.transition),
    entry.kind === "stage" ? lifeStageStoryFeedbackText(lifeStageStory, entry.branch, entry.stage) : lifeStageStoryTransitionText(lifeStageStory, entry.transition), lifeStageStoryFeedbackVersions(lifeStageStory));
  for (const year of lifeStageYears.years) addChoice(lifeStageYearSubjectId(lifeStageYears, year), lifeStageYearFeedbackText(lifeStageYears, year), lifeStageYearFeedbackVersions(lifeStageYears, year));
  for (const story of annualLifeStories.years) for (const branch of story.branches) for (const segment of branch.segments)
    addChoice(annualLifeStorySubjectId(story, segment), annualLifeStoryFeedbackText(story, segment), annualLifeStoryFeedbackVersions(story, segment));

  const allChoices = buildReadingFeedbackChoices(assessment, annual, choices);
  if (scenario.personalLength) {
    const choice = allChoices.find(item => item.id === 'chapter-career')!;
    expect(choice).toBeTruthy();
    choice.label = '综合解读 · ' + comprehensive.chapters.find(item=>item.id==='career')!.title;
    const feedback = await repository.createResearchNote({caseId: revision.caseId, anchor:{kind:'revision',revisionId:revision.id},
      body:buildStructuredReadingFeedback(assessment,{subjectId:choice.id,subjectLabel:choice.label,originalConclusion:choice.originalConclusion,
        sourceVersions:choice.sourceVersions,rating:'partial',aspect:'合成容量个人采用',actualSituation:'合成回归内容，不是个人经历。',requestedRevision:''}),
      tags:[LOCAL_READING_FEEDBACK_TAG],sourceRefs:[],lifecycle:'active'});
    const review = await repository.createResearchNote({caseId:revision.caseId,anchor:{kind:'revision',revisionId:revision.id},
      body:await buildReadingFeedbackReview(feedback,null,readingFeedbackSource(assessment,choice.sourceVersions),
        {state:'revised',notes:'合成资料明确采用此个人原文；不改命盘或通用规则。',revisedConclusion:personalText,occurredAt:''}),
      tags:[LOCAL_READING_REVIEW_TAG],sourceRefs:[],lifecycle:'active'});
    inputRecords.push(feedback,review);
  }
  const personalReading = await buildLocalPersonalReading({ revision, assessment, choices: allChoices,
    records: inputRecords, legacySource });

  expect(personalReading.issues).toEqual([]);
  if (scenario.personalLength) expect(personalReading.entries.find(item=>item.subjectId==='chapter-career')?.personalText).toBe(personalText);
  else expect(personalReading.entries).toEqual([]);
  const source = { revision, assessment, annual, annualDomains, annualEvents, annualLifeStories, contextual, legacySource };
  const keyMonthYears = [];
  for (const year of annual.years) keyMonthYears.push(await prepareKeyMonthYear(source, year.year, inputRecords));
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, life, annual, timeline, contextual, personal: personalReading });
  const extras = { sourceRevision: revision, comprehensive, life, lifeStageStory, lifeStageYears, monthly, monthlyDomains, annualScenarios,
    timeline, annualDomains, annualEvents, annualLifeStories, annualMonthStory, personalReading, contextual, synthesis, priorities, keyMonthYears,
    explanationGeneratedAt: new Date().toISOString(), explanationTimeUncertainty: undefined };

  const createNote=repository.createResearchNote.bind(repository);
  vi.spyOn(repository,'createResearchNote').mockImplementation(input=>{snapshotWriteCalls++;return createNote(input);});
  stage='brief_and_index';
  const brief=buildBriefReadingReport(assessment,annual,extras)!;
  const expectedIndex=buildReadingExplanationIndex({report:brief,revision,assessment,synthesis,context:contextual.contextSource,generatedAt:extras.explanationGeneratedAt,reportVersion:LOCAL_READING_EDITION_VERSION});
  const rawIndex=JSON.stringify(expectedIndex),utf8=new TextEncoder();
  metadata.rawIndexCharacters=rawIndex.length;metadata.rawIndexBytes=utf8.encode(rawIndex).byteLength;
  metadata.conclusions=expectedIndex.conclusions.length;metadata.citationBindings=expectedIndex.citationBindings.length;
  metadata.branches=brief.plainReading!.outlook.branches.map(branch=>({id:branch.id,years:branch.years.map(year=>year.year)}));
  metadata.handoverSegments=annual.years.filter(year=>year.judgmentSegments.length>2).map(year=>({year:year.year,segments:year.judgmentSegments.map(segment=>({branch:segment.branchId,start:segment.startInstant,end:segment.endExclusiveInstant}))}));
  metadata.selectedMonthlyParts=monthlyDomains.months.flatMap(month=>month.branches.flatMap(branch=>branch.segments)).length;
  for(const branch of brief.plainReading!.outlook.branches)expect(branch.years.map(year=>year.year)).toEqual(Array.from({length:10},(_,n)=>2026+n));
  expect(brief.plainReading!.outlook.branches.map(branch=>branch.id)).toEqual(['forward','backward']);
  const months=brief.plainReading!.outlook.branches.flatMap(branch=>branch.years.flatMap(year=>year.segments.flatMap(segment=>segment.monthWindows.flatMap(window=>window.members))));
  const sourceMonths=keyMonthYears.flatMap(year=>year.reading.branches.flatMap(branch=>branch.periods));
  expect(months.map(month=>month.periodId).sort()).toEqual(sourceMonths.map(month=>month.id).sort());metadata.monthParts=months.length;
  expect(expectedIndex.conclusions.filter(conclusion=>conclusion.scope.level==='month')).toHaveLength(sourceMonths.length*3);
  expect(expectedIndex.conclusions.filter(conclusion=>conclusion.scope.level==='year')).toHaveLength(annual.years.flatMap(year=>year.judgmentSegments).length*3);
  if(scenario.personalLength){const adopted=expectedIndex.conclusions.filter(conclusion=>conclusion.origin==='personal');metadata.adoptedConclusions=adopted.length;expect(adopted.some(conclusion=>conclusion.text===personalText)).toBe(true);}
  stage='archive_generation';
  const unpooledArchive=buildLocalReadingSnapshot(assessment,annual,extras),report=buildLocalReadingReport(assessment,annual,extras);
  const marker=report.archive.includes(READING_EXPLANATION_SHARED_VERSIONS_MARKER)?READING_EXPLANATION_SHARED_VERSIONS_MARKER:READING_EXPLANATION_MARKER;
  expect(report.archive.slice(0,report.archive.indexOf('\n\n'+marker))).toBe(unpooledArchive);
  expect(JSON.stringify(readReadingExplanationIndex(report.archive))).toBe(rawIndex);
  if(scenario.personalLength){
    expect(report.reading.includes(personalText)).toBe(true);
    // Actual export delivery builds these two separate full-text Blobs. This
    // checks their bytes without reducing the combined snapshot's save limit.
    const textFromBlob=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsText(blob);});
    const readingExport=new Blob([report.reading],{type:'text/markdown;charset=utf-8'}),archiveExport=new Blob([report.archive],{type:'text/markdown;charset=utf-8'});
    expect(await textFromBlob(readingExport)).toBe(report.reading);
    expect(await textFromBlob(archiveExport)).toBe(report.archive);
    metadata.separateFullTextExports={readingBytes:readingExport.size,archiveBytes:archiveExport.size,exact:true};
  }
  const endMarker=marker===READING_EXPLANATION_MARKER?'<!-- /hakimi-reading-explanation-index-v1 -->':'<!-- /hakimi-reading-explanation-index-v2 -->';
  const payload=report.archive.split(marker+'\n')[1]!.split('\n'+endMarker)[0]!;metadata.wireCharacters=payload.length;
  const wire=JSON.parse(payload);metadata.sharedPoolCounts={versions:wire.sourceVersionSets?.length??null,limits:wire.evidenceLimitSets?.length??null,applications:wire.ruleApplicationPool?.length??null};
  const readingBytes=utf8.encode(report.reading).byteLength,archiveBytes=utf8.encode(report.archive).byteLength;
  const probe=READING_REPORT_BUNDLE_MARKER+'\n'+JSON.stringify({format:READING_REPORT_BUNDLE_VERSION,version:report.version,reading:{text:report.reading,utf8Bytes:readingBytes,sha256:'0'.repeat(64)},archive:{text:report.archive,utf8Bytes:archiveBytes,sha256:'0'.repeat(64)},sha256:'0'.repeat(64)});
  Object.assign(metadata,{readingCharacters:report.reading.length,archiveCharacters:report.archive.length,readingBytes,archiveBytes,bundleBytes:utf8.encode(probe).byteLength,bundleCharacters:probe.length,bundleHeadroomBytes:8*1024*1024-utf8.encode(probe).byteLength});
  stage='bundle_encoding';const encoded=await encodeReadingReportBundle(report);expect(utf8.encode(encoded).byteLength).toBe(metadata.bundleBytes);
  stage='snapshot_pack';const body=await packReadingSnapshot(encoded);metadata.noteCharacters=body.length;
  expect(researchNoteRecordSchema.shape.body.safeParse(body).success).toBe(true);
  stage='repository_write';attemptedWrite=true;
  const saved=await repository.createResearchNote({caseId:revision.caseId,anchor:{kind:'revision',revisionId:revision.id},body,tags:[LOCAL_READING_SNAPSHOT_TAG],sourceRefs:[],lifecycle:'active'});
  stage='reopen';database.close();await database.open();const reopened=await repository.listResearchNotesByCase(revision.caseId);
  const reopenedNote=reopened.find(item=>item.id===saved.id)!;expect(reopenedNote.body).toBe(body);
  const decoded=await decodeReadingReportBundle(await unpackReadingSnapshot(reopenedNote.body));expect(decoded).toEqual(report);
  expect(JSON.stringify(readReadingExplanationIndex(decoded!.archive))).toBe(rawIndex);
  metadata.status='saved_and_reopened';metadata.repositoryReopened=true;
  } catch(error){metadata.status=attemptedWrite?'failure_after_write_attempt':'rejected_before_write';metadata.errorStage=stage;metadata.error=error instanceof Error?error.message:String(error);metadata.errorName=error instanceof Error?error.name:'unknown';metadata.writerCapacityError=error instanceof ReadingReportCapacityError;}
  database.close();await database.open();const finalRecords=await repository.listResearchNotesByCase(revision.caseId);
  metadata.oldRecordsUnchanged=inputRecords.every(record=>JSON.stringify(finalRecords.find(item=>item.id===record.id))===JSON.stringify(record));
  metadata.originalReports=1;metadata.savedReports=finalRecords.filter(record=>record.tags.includes(LOCAL_READING_SNAPSHOT_TAG)).length;
  metadata.oldV1DecodedUnchanged=JSON.stringify(await decodeReadingReportBundle(await unpackReadingSnapshot(finalRecords.find(item=>item.id===legacyNote.id)!.body)))===JSON.stringify(legacyReport);
  metadata.capacityRejection=metadata.status==='rejected_before_write'&&(
    (metadata.errorStage==='bundle_encoding'&&metadata.bundleBytes>8*1024*1024)
    ||(metadata.errorStage==='archive_generation'&&(metadata.rawIndexBytes>8*1024*1024||/依据索引过大|依据索引展开过大/.test(metadata.error)))
    ||(metadata.errorStage==='snapshot_pack'&&/完整解读超过本地记录容量/.test(metadata.error)));
  metadata.finishedAt=new Date().toISOString();
  process.stdout.write(JSON.stringify({probe:'fixed-adjacent-capacity',...metadata,snapshotWriteCalls})+'\n');
  expect(metadata.oldRecordsUnchanged).toBe(true);expect(metadata.oldV1DecodedUnchanged).toBe(true);
  expect(finalRecords).toHaveLength(inputRecords.length+(metadata.status==='saved_and_reopened'?1:0));
  expect(metadata.savedReports).toBe(metadata.status==='saved_and_reopened'?2:1);
  expect(snapshotWriteCalls).toBe(metadata.status==='saved_and_reopened'?1:0);
  if(metadata.errorStage==='bundle_encoding'&&metadata.bundleBytes>8*1024*1024){
    expect(metadata.writerCapacityError).toBe(true);
    expect(metadata.separateFullTextExports?.exact).toBe(true);
  }
  expect(metadata.status==='saved_and_reopened'||metadata.capacityRejection).toBe(true);
},180000);
