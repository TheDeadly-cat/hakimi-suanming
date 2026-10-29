import "fake-indexeddb/auto";
import { afterAll, expect, it } from "vitest";
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
import { encodeReadingReportBundle, decodeReadingReportBundle, READING_REPORT_BUNDLE_MARKER, READING_REPORT_BUNDLE_VERSION } from "./local-reading-report-bundle";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { syntheticReviewIndex } from "../test/reading-case-review-fixture";

let database: ResearchDatabase | undefined;
afterAll(async () => { await database?.delete(); });

it("saves and reopens Q07's complete two-direction ten-year reading without changing an older v1 note", async () => {
  // Previously reviewed exploratory Q07 is now a known regression, not a blind test.
  // This portable fixture contains no user's case, external archive or model call.
  database = new ResearchDatabase(`dual-branch-reading-integration-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
  const repository = new ResearchRepository(database);
  const calculated = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1990-12-19", time: "11:42",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "探索合成 Q07", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: "20261026 new synthetic exploratory input; not personal or held-out data" }, WORKING_DEFAULT_RULE_PROFILE);
  const caseBundle = await new CaseRepository(database).createCase({ alias: "合成 Q07 双分支完整保存", calculated });
  const revision = caseBundle.revisions[0]!;
  const contextNote = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    body: await buildReadingContextRecord(revision, null, { work: "unspecified", relationship: "unspecified", fromYear: 2026, toYear: 2035,
      notes: "合成背景，指定范围内保持此状态，仅用于审读适用性。" }), tags: ["阅读背景"], sourceRefs: [], lifecycle: "active" });

  // Literal legacy wire is deliberately not produced by the new archive writer.
  // It proves old-wire preservation; the real prior Q02 report is checked separately in the browser.
  const legacyIndex = syntheticReviewIndex({ caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash });
  const legacyArchive = `# 旧 v1 合成档案\r\n原句 🌿 e\u0301 与换行保留。\n\n<!-- hakimi-reading-explanation-index-v1 -->\n${JSON.stringify(legacyIndex)}\n<!-- /hakimi-reading-explanation-index-v1 -->`;
  const legacyReport = { reading: "旧阅读稿原文\r\n不由新版重新生成。", archive: legacyArchive, version: "hakimi.local-reading-edition/0.22.0" };
  expect(readReadingExplanationIndex(legacyArchive)).toEqual(legacyIndex);
  const legacyBody = await packReadingSnapshot(await encodeReadingReportBundle(legacyReport));
  const legacyNote = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    body: legacyBody, tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });

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
  const monthly = await buildLocalMonthlyOutlook(revision, assessment, 2026);
  const monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly, contextual });
  const annualMonthStory = buildAnnualMonthStory({ revision, assessment, year: annual.years[0]!, annualDomains: annualDomains.years[0]!,
    annualEvents: annualEvents.years[0]!, monthly, monthlyDomains, contextual });
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
  for (const chapter of comprehensive.chapters) addChoice(`chapter-${chapter.id}`, [chapter.title, chapter.headline, chapter.verdict, ...chapter.paragraphs].join("\n"), [comprehensive.version]);
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
  const personalReading = await buildLocalPersonalReading({ revision, assessment, choices: buildReadingFeedbackChoices(assessment, annual, choices),
    records: [contextNote, legacyNote], legacySource });
  expect(personalReading.entries).toEqual([]); expect(personalReading.issues).toEqual([]);
  const source = { revision, assessment, annual, annualDomains, annualEvents, annualLifeStories, contextual, legacySource };
  const keyMonthYears = [];
  for (const year of annual.years) keyMonthYears.push(await prepareKeyMonthYear(source, year.year, []));
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, life, annual, timeline, contextual, personal: personalReading });
  const extras = { sourceRevision: revision, comprehensive, life, lifeStageStory, lifeStageYears, monthly, monthlyDomains, annualScenarios,
    timeline, annualDomains, annualEvents, annualLifeStories, annualMonthStory, personalReading, contextual, synthesis, priorities, keyMonthYears,
    explanationGeneratedAt: new Date().toISOString(), explanationTimeUncertainty: undefined };
  const brief = buildBriefReadingReport(assessment, annual, extras)!;
  const expectedIndex = buildReadingExplanationIndex({ report: brief, revision, assessment, synthesis, context: contextual.contextSource,
    generatedAt: extras.explanationGeneratedAt, reportVersion: LOCAL_READING_EDITION_VERSION });
  const rawIndex = JSON.stringify(expectedIndex);
  expect(rawIndex.length).toBeGreaterThan(3_000_000); // Reproduces the actual former failure, without raising its wire limit.
  expect(expectedIndex.conclusions).toHaveLength(800);
  expect(brief.plainReading!.outlook.branches.map(branch => branch.id)).toEqual(["forward", "backward"]);
  for (const branch of brief.plainReading!.outlook.branches) expect(branch.years.map(year => year.year)).toEqual(Array.from({ length: 10 }, (_, i) => 2026 + i));
  const months = brief.plainReading!.outlook.branches.flatMap(branch => branch.years.flatMap(year => year.segments.flatMap(segment => segment.monthWindows.flatMap(window => window.members))));
  const sourceMonths = keyMonthYears.flatMap(year => year.reading.branches.flatMap(branch => branch.periods));
  expect(months).toHaveLength(242);
  expect(months.map(month => month.periodId).sort()).toEqual(sourceMonths.map(month => month.id).sort());
  expect(expectedIndex.conclusions.filter(conclusion => conclusion.scope.level === "month")).toHaveLength(726);
  expect(expectedIndex.conclusions.filter(conclusion => conclusion.scope.level === "year")).toHaveLength(66);
  expect(expectedIndex.citationBindings).toHaveLength(33);

  const unpooledArchive = buildLocalReadingSnapshot(assessment, annual, extras);
  const report = buildLocalReadingReport(assessment, annual, extras);
  expect(report.archive).toContain(READING_EXPLANATION_SHARED_VERSIONS_MARKER);
  expect(report.archive).not.toContain(READING_EXPLANATION_MARKER);
  expect(report.archive.slice(0, report.archive.indexOf(`\n\n${READING_EXPLANATION_SHARED_VERSIONS_MARKER}`))).toBe(unpooledArchive);
  const payload = report.archive.split(`${READING_EXPLANATION_SHARED_VERSIONS_MARKER}\n`)[1]!.split("\n<!-- /hakimi-reading-explanation-index-v2 -->")[0]!;
  expect(payload.length).toBeLessThanOrEqual(3_000_000);
  const wire = JSON.parse(payload);
  expect(wire.format).toBe(READING_EXPLANATION_SHARED_VERSIONS_FORMAT);
  expect(wire.sourceVersionSets).toHaveLength(1);
  expect(wire.evidenceLimitSets.length).toBeGreaterThan(1);
  expect(wire.evidenceLimitSets.length).toBeLessThan(expectedIndex.conclusions.length);
  expect(wire.index.conclusions).toHaveLength(800);
  expect(readReadingExplanationIndex(report.archive)).toEqual(expectedIndex);
  expect(JSON.stringify(readReadingExplanationIndex(report.archive))).toBe(rawIndex);

  const utf8 = new TextEncoder(), readingBytes = utf8.encode(report.reading).byteLength, archiveBytes = utf8.encode(report.archive).byteLength;
  // Hash digits always occupy 64 ASCII characters, so this measures the exact
  // envelope size without changing either text or the real encoder's checks.
  const sizeProbe = `${READING_REPORT_BUNDLE_MARKER}\n${JSON.stringify({ format: READING_REPORT_BUNDLE_VERSION, version: report.version,
    reading: { text: report.reading, utf8Bytes: readingBytes, sha256: "0".repeat(64) },
    archive: { text: report.archive, utf8Bytes: archiveBytes, sha256: "0".repeat(64) }, sha256: "0".repeat(64) })}`;
  const sizeMetadata = { readingCharacters: report.reading.length, archiveCharacters: report.archive.length,
    readingBytes, archiveBytes, envelopeBytes: utf8.encode(sizeProbe).byteLength,
    envelopeCharacters: sizeProbe.length, rawIndexCharacters: rawIndex.length, wireCharacters: payload.length };
  let encoded: string;
  try { encoded = await encodeReadingReportBundle(report); }
  catch (cause) { throw new Error(`Q07 complete selected-month bundle rejected: ${JSON.stringify(sizeMetadata)}`, { cause }); }
  const body = await packReadingSnapshot(encoded);
  expect(new TextEncoder().encode(encoded).byteLength).toBeLessThanOrEqual(8 * 1024 * 1024);
  expect(body.length).toBeLessThanOrEqual(200_000);
  expect(researchNoteRecordSchema.shape.body.safeParse(body).success).toBe(true);
  const saved = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    body, tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });
  database.close(); await database.open();
  const reopenedRecords = await repository.listResearchNotesByCase(revision.caseId);
  expect(reopenedRecords).toHaveLength(3);
  const reopenedNote = reopenedRecords.find(record => record.id === saved.id)!;
  expect(reopenedNote.body).toBe(body);
  expect(reopenedNote.anchor).toEqual({ kind: "revision", revisionId: revision.id });
  const reopened = await decodeReadingReportBundle(await unpackReadingSnapshot(reopenedNote.body));
  expect(reopened).toEqual(report);
  expect(JSON.stringify(readReadingExplanationIndex(reopened!.archive))).toBe(rawIndex);
  const oldAgain = reopenedRecords.find(record => record.id === legacyNote.id)!;
  expect(oldAgain).toEqual(legacyNote);
  expect(await decodeReadingReportBundle(await unpackReadingSnapshot(oldAgain.body))).toEqual(legacyReport);
  expect(readReadingExplanationIndex(legacyReport.archive)).toEqual(legacyIndex);
  expect(legacyReport.archive).toContain(READING_EXPLANATION_MARKER);
  expect(legacyReport.archive).not.toContain(READING_EXPLANATION_SHARED_VERSIONS_MARKER);
  process.stdout.write(JSON.stringify({ probe: "q07-known-exploratory-dual-branch-save", sourceScope: "complete default UI extra fields, no feedback entries", branchYears: 20, monthParts: months.length,
    conclusions: expectedIndex.conclusions.length, ...sizeMetadata, sourceVersionSets: wire.sourceVersionSets.length, evidenceLimitSets: wire.evidenceLimitSets.length,
    bundleBytes: new TextEncoder().encode(encoded).byteLength, noteCharacters: body.length, oldV1Unchanged: true, repositoryReopened: true }) + "\n");
}, 180000);
