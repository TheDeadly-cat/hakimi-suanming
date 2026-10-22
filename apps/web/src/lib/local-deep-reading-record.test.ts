import "fake-indexeddb/auto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import { researchNoteRecordSchema } from "@hakimi/contracts";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { lifeStageStoryEntries, lifeStageStoryFeedbackText, lifeStageStoryTransitionText, lifeStageStoryFeedbackVersions } from "./local-life-stage-story-record";
import { buildLifeStageYears } from "./local-life-stage-years";
import { lifeStageYearSubjectId, lifeStageYearFeedbackText, lifeStageYearFeedbackVersions } from "./local-life-stage-years-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { annualLifeStoryFeedbackText, annualLifeStoryFeedbackVersions, annualLifeStorySubjectId } from "./annual-life-story-record";
import { buildLocalReadingSnapshot, LOCAL_READING_SNAPSHOT_TAG, type LocalReadingAnnualScenarios } from "./local-reading-record";
import { ANNUAL_EVENT_SCENARIOS_VERSION, buildAnnualEventScenarios } from "./annual-event-scenarios";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { buildReadingTimeline } from "./local-reading-timeline";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";
import { buildReadingContextRecord, resolveReadingContext, LOCAL_READING_CONTEXT_TAG } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildReadingPriorities } from "./local-reading-priorities";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { annualEventFeedbackSubjectId, annualEventFeedbackText, buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildAnnualMonthStory } from "./local-annual-month-story";
import { annualMonthStoryEntries, annualMonthStoryFeedbackText, annualMonthStoryFeedbackVersions, annualMonthStorySubjectId } from "./local-annual-month-story-record";

describe("complete local deep reading persistence", () => {
  it.each(["male", "unspecified", "female"] as const)("stores and reopens all chapters, decades and twelve months for %s", async (sex) => {
    const database = new ResearchDatabase(`deep-reading-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
    try {
      const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: sex === "female" ? "2019-12-22" : "1995-08-18", time: sex === "female" ? "11:23" : "08:26",
        timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
        location: { label: "合成深读", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
      const revision = (await new CaseRepository(database).createCase({ alias: "合成完整解读", calculated: chart })).revisions[0]!;
      const assessment = buildBaziPreliminaryAssessment(revision);
      if (sex === "female") {
        expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["己亥", "丙子", "癸巳", "戊午"]);
        expect(assessment.balance.structural.working).toMatchObject({ band: "balanced", direction: "conditional", focus: "rooted_peer_mixed_authority" });
        expect([assessment.balance.supportWeight, assessment.balance.demandWeight]).toEqual([9, 13]);
      }
      const comprehensive = buildBaziComprehensiveReading(revision, assessment);
      const [annual, life, monthly] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, 2026),
        buildLocalLifeOutlook(revision, assessment, 2026), buildLocalMonthlyOutlook(revision, assessment, 2028)]);
      const lifeStageStory = buildLifeStageStory({ revision, assessment, life });
      const annualScenarios: LocalReadingAnnualScenarios = {
        version: ANNUAL_EVENT_SCENARIOS_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
        includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
        years: annual.years.map((year) => ({ year: year.year, transitNodeRef: year.transitNodeRef,
          scenarios: buildAnnualEventScenarios(revision, assessment, year) }))
      };
      const timeline = buildReadingTimeline({ revision, annual, life });
      const annualDomains: LocalReadingAnnualDomains = { version: ANNUAL_DOMAIN_READING_VERSION,
        revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour,
        startYear: annual.startYear, endYear: annual.endYear,
        years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
      const repository = new ResearchRepository(database);
      const chapter = comprehensive.chapters[0]!;
      const choice = { id: `chapter-${chapter.id}`, label: `综合解读 · ${chapter.title}`,
        originalConclusion: `${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${comprehensive.version}`,
        sourceVersions: [comprehensive.version] };
      const proposed = "合成个人修订：先将已有知识用于一个小项目，再按实际反馈补足。不是用户实际经历。";
      const root = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
        body: buildStructuredReadingFeedback(assessment, { subjectId: choice.id, subjectLabel: choice.label,
          originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "unverified",
          actualSituation: "仅测试个人阅读保存。", requestedRevision: proposed }), tags: ["解读反馈"], sourceRefs: [], lifecycle: "active" });
      const review = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
        body: await buildReadingFeedbackReview(root, null, readingFeedbackSource(assessment, choice.sourceVersions), {
          state: "revised", notes: "合成数据明确采用测试。", revisedConclusion: proposed, occurredAt: "软件测试" }), tags: ["解读反馈", "解读复核"], sourceRefs: [], lifecycle: "active" });
      const personalReading = await buildLocalPersonalReading({ revision, assessment, choices: [choice], records: [root, review] });
      const contextRecord = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
        body: await buildReadingContextRecord(revision, null, { work: "student", relationship: "single", fromYear: 2026, toYear: 2035,
          notes: sex === "female" ? "合成儿童学习背景，非真实身份。" : "合成成人学习背景，非真实身份。" }), tags: [LOCAL_READING_CONTEXT_TAG], sourceRefs: [], lifecycle: "active" });
      const context = await resolveReadingContext({ revision, records: [contextRecord] });
      const contextual = buildContextualReadingBundle({ revision, assessment, comprehensive, annualDomains, context: context.latest, referenceYear: 2026 });
      if (sex === "female") {
        expect(contextual!.readings.filter((reading) => reading.scope.kind === "natal").map((reading) => reading.scope.kind === "natal" && reading.scope.chapterId)).toEqual(["career", "wealth"]);
        const annualContext = contextual!.readings.filter((reading) => reading.scope.kind === "annual");
        expect(new Set(annualContext.map((reading) => reading.scope.kind === "annual" && reading.scope.year))).toEqual(new Set(annual.years.map((year) => year.year)));
        expect(annualContext.every((reading) => reading.scope.kind === "annual" && reading.scope.domainId !== "relationship")).toBe(true);
      } else expect(contextual!.readings.length).toBeGreaterThan(30);
      const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, life, annual, timeline, contextual, personal: personalReading });
      const priorities = buildReadingPriorities({ revision, annual, life, timeline, annualDomains });
      const monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly });
      const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains, contextual });
      const annualLifeInput = { revision, assessment, annual, annualDomains, annualEvents, contextual };
      const annualLifeBefore = JSON.stringify(annualLifeInput);
      const annualLifeStories = buildReadingAnnualLifeStories(annualLifeInput);
      const annualMonthStory = buildAnnualMonthStory({ revision, assessment, monthly, monthlyDomains, contextual,
        year: annual.years.find((year) => year.year === monthly.year)!, annualDomains: annualDomains.years.find((year) => year.year === monthly.year)!,
        annualEvents: annualEvents.years.find((year) => year.year === monthly.year)! });
      const selectedStage = lifeStageStory.branches[0]!.stages.find((stage) =>
        Date.parse(stage.startInstant) < Date.parse(annual.years[0]!.endExclusiveInstant!)
        && Date.parse(stage.endExclusiveInstant) > Date.parse(annual.years[0]!.startInstant!))!;
      const bridgeInput = { revision, assessment, life, lifeStageStory, selectedDecadeId: selectedStage.decadeId, annual, annualDomains, annualEvents, contextual };
      const originalBridgeSources = JSON.stringify(bridgeInput);
      const lifeStageYears = buildLifeStageYears(bridgeInput);
      const extras = { sourceRevision: revision, comprehensive, life, lifeStageStory, lifeStageYears, monthly, monthlyDomains, annualScenarios, timeline, annualDomains, annualEvents, annualLifeStories, annualMonthStory, personalReading, contextual, synthesis, priorities };
      const body = buildLocalReadingSnapshot(assessment, annual, extras);
      expect(body.split("## 这一年的生活总评")).toHaveLength(2);
      expect(annualLifeStories.years).toHaveLength(annual.years.length);
      const annualLifeSubjects: string[] = [];
      for (const story of annualLifeStories.years) for (const branch of story.branches) for (const segment of branch.segments) {
        const feedback = annualLifeStoryFeedbackText(story, segment);
        annualLifeSubjects.push(annualLifeStorySubjectId(story, segment));
        expect(feedback.length).toBeLessThanOrEqual(30_000);
        expect(annualLifeStoryFeedbackVersions(story, segment).length).toBeLessThanOrEqual(20);
        expect(body).toContain(feedback);
        expect(feedback).toContain(JSON.stringify(segment.sourceVersions));
        expect(feedback).toContain(JSON.stringify(segment.backgroundRefs));
        expect(feedback).not.toContain("总评覆盖年份");
        for (const paragraph of segment.paragraphs) {
          expect(body).toContain(paragraph.text);
          expect(feedback).toContain(paragraph.text);
          for (const subject of paragraph.sourceSubjects) expect(feedback).toContain(subject);
        }
        const original = annual.years.find((year) => year.year === story.year)!.judgmentSegments.find((item) => item.id === segment.id && item.branchId === branch.id)!;
        expect([segment.startInstant, segment.endExclusiveInstant, segment.backgroundRefs]).toEqual([original.startInstant, original.endExclusiveInstant, original.judgment.backgroundRefs]);
      }
      expect(new Set(annualLifeSubjects).size).toBe(annualLifeSubjects.length);
      expect(JSON.stringify(annualLifeInput)).toBe(annualLifeBefore);
      const changedAnnualLife = structuredClone(annualLifeStories);
      changedAnnualLife.years[0]!.branches[0]!.segments[0]!.paragraphs[0]!.text += "未绑定总评";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, annualLifeStories: changedAnnualLife })).toThrow("年度生活总评与本次年份");
      expect(body.split("## 大运主线与逐年衔接")).toHaveLength(2);
      expect(lifeStageYears.years.length).toBeGreaterThan(0);
      expect(body).toContain(JSON.stringify(lifeStageYears.coverage));
      for (const year of lifeStageYears.years) {
        const feedback = lifeStageYearFeedbackText(lifeStageYears, year);
        expect(lifeStageYearSubjectId(lifeStageYears, year).length).toBeLessThanOrEqual(500);
        expect(lifeStageYearFeedbackVersions(lifeStageYears, year).length).toBeLessThanOrEqual(20);
        expect(feedback.length).toBeLessThanOrEqual(30_000);
        expect(body).toContain(feedback);
        expect(feedback).not.toContain("定位瞬时：");
        expect(feedback).toContain(JSON.stringify(year.sourceVersions));
        for (const segment of year.segments) {
          for (const text of [...year.paragraphs, ...segment.paragraphs, ...segment.advantages, ...segment.pressures, ...segment.conditions,
            segment.id, segment.startInstant, segment.endExclusiveInstant, JSON.stringify(segment.backgroundRefs), JSON.stringify(segment.basisRefs)]) expect(body).toContain(text);
          const original = annualEvents.years.find((item) => item.year === year.year)!.branches.find((branch) => branch.id === lifeStageYears.branchId)!
            .segments.find((item) => item.id === segment.id)!;
          expect(segment.items).toEqual(original.items);
          for (const item of segment.items) expect(body).toContain(annualEventFeedbackSubjectId(year.year, original, item));
        }
      }
      expect(JSON.stringify(bridgeInput)).toBe(originalBridgeSources);
      const changedBridge = structuredClone(lifeStageYears); changedBridge.years[0]!.paragraphs.push("未绑定衔接正文");
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, lifeStageYears: changedBridge })).toThrow("阶段年度衔接与本次大运");
      expect(body.split("## 人生阶段主线与交运变化")).toHaveLength(2);
      expect(lifeStageStoryFeedbackVersions(lifeStageStory)).toEqual([lifeStageStory.version, life.version]);
      for (const entry of lifeStageStoryEntries(lifeStageStory)) {
        const item = entry.kind === "stage" ? entry.stage : entry.transition;
        const feedback = entry.kind === "stage" ? lifeStageStoryFeedbackText(lifeStageStory, entry.branch, entry.stage) : lifeStageStoryTransitionText(lifeStageStory, entry.transition);
        expect(feedback.length).toBeLessThanOrEqual(30_000);
        expect(feedback).toContain(JSON.stringify(lifeStageStory.sourceVersions));
        for (const paragraph of item.paragraphs) { expect(body).toContain(paragraph); expect(feedback).toContain(paragraph); }
      }
      const shiftedStage = structuredClone(lifeStageStory); shiftedStage.branches[0]!.stages[0]!.paragraphs[0] += "未绑定阶段主文";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, lifeStageStory: shiftedStage })).toThrow("人生阶段主线与本次命盘");
      expect(body).toContain("## 年度主题与十二节令月");
      expect(annualMonthStory.months).toHaveLength(12);
      expect(annualMonthStory.sourceVersions.length).toBeGreaterThan(20);
      expect(body).toContain(JSON.stringify(annualMonthStory.sourceVersions));
      expect(body).toContain(JSON.stringify(annualMonthStory.nodes));
      for (const { month, branch, period, domain } of annualMonthStoryEntries(annualMonthStory)) {
        const feedback = annualMonthStoryFeedbackText(annualMonthStory, month, branch, period, domain);
        const subjectId = annualMonthStorySubjectId(annualMonthStory, month, period, domain);
        expect(subjectId.length).toBeLessThanOrEqual(500);
        expect(feedback.length).toBeLessThanOrEqual(30_000);
        expect(annualMonthStoryFeedbackVersions(annualMonthStory)).toHaveLength(4);
        for (const text of [month.monthId, branch.id, period.id, period.startInstant, period.endExclusiveInstant, period.personalStartInstant,
          period.ageLabel, period.judgmentCaption, ...period.backgroundLabels, ...period.conditions, ...branch.conditions,
          domain.title, domain.summary, ...domain.examples, ...domain.conditions, ...domain.evidence, JSON.stringify(domain.links)]) {
          expect(body).toContain(text); expect(feedback).toContain(text);
        }
      }
      const shiftedStory = structuredClone(annualMonthStory);
      shiftedStory.months[0]!.branches[0]!.periods[0]!.domains[0]!.summary = "与原年、原月无关的新断言";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, annualMonthStory: shiftedStory })).toThrow("年月衔接与本次年度、月份、分支或原文不一致");
      expect(body).toContain("## 年度应事情境先读");
      expect(buildLocalReadingSnapshot(assessment, annual, { ...extras, synthesis: null, priorities: null })).toContain("## 年度应事情境先读");
      for (const reading of annualEvents.years) for (const branch of reading.branches) for (const segment of branch.segments) {
        for (const item of segment.items) {
          const original = annualEventFeedbackText(reading, branch, segment, item);
          expect(annualEventFeedbackSubjectId(reading.year, segment, item).length).toBeLessThanOrEqual(500);
          for (const value of [item.title, item.summary, ...item.examples, ...item.why, ...item.applicability,
            ...item.notApplicableWhen, ...item.conditions, ...item.evidence, segment.startInstant, segment.endExclusiveInstant,
            JSON.stringify(item.origin), JSON.stringify(reading.contextRef)]) {
            expect(body).toContain(value);
            expect(original).toContain(value);
          }
          expect([annualEvents.version, ...reading.sourceVersions].length).toBeLessThanOrEqual(20);
        }
      }
      const changedEvent = structuredClone(annualEvents);
      changedEvent.years[0]!.branches[0]!.segments[0]!.items[0]!.summary = "未绑定来源的新应事断语";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, annualEvents: changedEvent })).toThrow("年度应事情境与本次分支、分段、背景或原判断不一致");
      expect(monthlyDomains.months).toHaveLength(12);
      expect(body).toContain("#### 本月分领域详读");
      for (const month of monthlyDomains.months) {
        for (const text of [month.headline, month.summary, month.startInstant, month.endExclusiveInstant, JSON.stringify(month.nodeRef)]) expect(body).toContain(text);
        for (const branch of month.branches) for (const segment of branch.segments) {
          for (const text of [segment.id, segment.startInstant, segment.endExclusiveInstant, segment.personalStartInstant,
            segment.judgmentCaption, segment.ageLabel, ...segment.backgroundLabels, ...segment.conditions]) expect(body).toContain(text);
          for (const domain of segment.domains) for (const text of [domain.headline, domain.summary, ...domain.paragraphs, ...domain.opportunities,
            ...domain.obstacles, ...domain.examples, ...domain.watchPoints, ...domain.conditions, ...domain.evidence]) expect(body).toContain(text);
        }
      }
      const shiftedMonth = structuredClone(monthlyDomains); shiftedMonth.months[0]!.branches[0]!.segments[0]!.startInstant = "1900-01-01T00:00:00Z";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, monthlyDomains: shiftedMonth })).toThrow("月度分领域解读与本次月份、分支或原判断不一致");
      const otherMonth = structuredClone(monthlyDomains); otherMonth.months[0]!.nodeRef = structuredClone(otherMonth.months[1]!.nodeRef);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, monthlyDomains: otherMonth })).toThrow("月度分领域解读与本次月份、分支或原判断不一致");
      expect(body).toContain("## 综合总评");
      expect(body).toContain("## 重点年份与逐年对照");
      for (const match of body.matchAll(/完整判断及依据：(J\d+)/g)) expect(body).toContain(`### ${match[1]} · `);
      for (const section of synthesis.sections) for (const text of [section.title, ...(section.answer ? [section.answer] : []), ...section.paragraphs, ...section.conditions, ...section.evidence, ...section.sourceSubjects]) expect(body).toContain(text);
      expect(synthesis.sections.some((section) => section.origin === "personal" && section.paragraphs.includes(proposed))).toBe(true);
      expect(body).toContain(JSON.stringify(synthesis.personalRefs));
      expect(body).toContain(JSON.stringify(synthesis.contextRef));
      for (const branch of priorities.branches) for (const year of branch.years) {
        for (const text of [year.id, year.caption, ...(!year.segments.length ? [year.summary] : []), ...year.selectionReasons.map((reason) => reason.text)]) expect(body).toContain(text);
        for (const segment of year.segments) for (const text of [segment.id, segment.startInstant, segment.endExclusiveInstant, segment.caption,
          ...(segment.personalStartInstant ? [segment.personalStartInstant, segment.ageLabel!] : []),
          ...segment.conditions, ...segment.domains.flatMap((domain) => [domain.headline, domain.summary, ...domain.paragraphs,
            ...domain.opportunities, ...domain.obstacles, ...domain.examples, ...domain.watchPoints, ...domain.conditions, ...domain.evidence])]) expect(body).toContain(text);
      }
      const staleSynthesis = structuredClone(synthesis); staleSynthesis.contextRef!.bodySha256 = "f".repeat(64);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, synthesis: staleSynthesis })).toThrow("综合总评与本次命盘、背景或个人采用记录不一致");
      const staleReviewSynthesis = structuredClone(synthesis); staleReviewSynthesis.personalRefs[0]!.bodySha256 = "e".repeat(64);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, synthesis: staleReviewSynthesis })).toThrow("综合总评与本次命盘、背景或个人采用记录不一致");
      const changedAnswer = structuredClone(synthesis); changedAnswer.sections.find((section) => section.origin !== "personal")!.answer = "未绑定来源的新答案";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, synthesis: changedAnswer })).toThrow("综合总评与本次命盘、背景或个人采用记录不一致");
      const changedPriority = structuredClone(priorities); changedPriority.branches[0]!.years[0]!.segments[0]!.startInstant = "1900-01-01T00:00:00Z";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, priorities: changedPriority })).toThrow("重点年份与本次原始分支、分段或选择依据不一致");
      const changedExample = structuredClone(priorities); changedExample.branches[0]!.years[0]!.segments[0]!.domains[0]!.examples.push("没有原始依据的新事件");
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, priorities: changedExample })).toThrow("重点年份与本次原始分支、分段或选择依据不一致");
      expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, sourceRevision: { ...revision, id: crypto.randomUUID() } })).toThrow(/不一致/);
      expect(body).toContain(contextRecord.id);
      expect(body).toContain(context.latest!.ref.bodySha256);
      for (const reading of contextual!.readings) {
        for (const text of [reading.headline, reading.summary, ...reading.paragraphs, ...reading.examples, ...reading.basis]) expect(body).toContain(text);
      }
      const crossedContextual = structuredClone(contextual)!;
      const annualEntry = crossedContextual.readings.find((item) => item.scope.kind === "annual")!;
      if (annualEntry.scope.kind === "annual") annualEntry.scope.startInstant = "1900-01-01T00:00:00.000Z";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { sourceRevision: revision, comprehensive, contextual: crossedContextual })).toThrow("背景适配的年度分支或区间不一致");
      expect(body).toContain("当前阅读状态：已采用个人修订");
      expect(body).toContain(`#### 本次阅读正文\n\n${proposed}`);
      expect(body).toContain(choice.originalConclusion);
      expect(body).toContain(personalReading.entries[0]!.selectedReviewRefs[0]!.bodySha256);
      expect(body).toContain(review.id);
      const wrongPersonal = structuredClone(personalReading); wrongPersonal.sourceBinding.revisionId = crypto.randomUUID();
      expect(() => buildLocalReadingSnapshot(assessment, annual, { personalReading: wrongPersonal })).toThrow("个人阅读与当前命盘或解读版本不一致");
      const wrongText = structuredClone(personalReading); wrongText.entries[0]!.effectiveConclusion = "未曾采用的文字";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { personalReading: wrongText })).toThrow("采用状态、正文或版本不一致");
      const wrongReview = structuredClone(personalReading); wrongReview.entries[0]!.selectedReviewRefs[0]!.bodySha256 = "f".repeat(64);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { personalReading: wrongReview })).toThrow("采用记录不一致");
      if (process.env.HAKIMI_READING_CAPTURE_DIR) writeFileSync(join(process.env.HAKIMI_READING_CAPTURE_DIR, `${sex}-snapshot.txt`), body, "utf8");
      const storedBody = await packReadingSnapshot(body);
      if (process.env.HAKIMI_READING_CAPTURE_DIR) writeFileSync(join(process.env.HAKIMI_READING_CAPTURE_DIR, `${sex}-stored.txt`), storedBody, "utf8");
      expect(comprehensive.chapters).toHaveLength(9);
      expect(monthly.months).toHaveLength(12);
      expect(life.decades.length).toBeGreaterThanOrEqual(8);
      expect(researchNoteRecordSchema.shape.body.safeParse(storedBody).success, `完整快照 ${sex}: 原文 ${body.length} / 保存 ${storedBody.length} 字符`).toBe(true);
      expect(await unpackReadingSnapshot(storedBody)).toBe(body);
      expect(body).toContain("#### 本年分领域详读");
      expect(body).toContain(ANNUAL_DOMAIN_READING_VERSION);
      for (const reading of annualDomains.years) {
        for (const text of [reading.headline, reading.summary, ...reading.limitations, ...reading.sourceVersions]) expect(body).toContain(text);
        for (const branch of reading.branches) {
          expect(body).toContain(branch.label);
          for (const segment of branch.segments) {
            for (const text of [segment.startInstant, segment.endExclusiveInstant, segment.personalStartInstant, segment.ageLabel,
              segment.judgmentCaption, segment.judgmentVersion, segment.policyVersion, JSON.stringify(segment.backgroundRefs)]) expect(body).toContain(text);
            for (const domain of segment.domains) for (const text of [domain.headline, domain.summary, ...domain.paragraphs,
              ...domain.opportunities, ...domain.obstacles, ...domain.examples, ...domain.watchPoints, ...domain.conditions, ...domain.evidence]) expect(body).toContain(text);
          }
          for (const gap of branch.gaps) expect(body).toContain(gap.message);
        }
      }
      const missingDomainYear = structuredClone(annualDomains); missingDomainYear.years.pop();
      expect(() => buildLocalReadingSnapshot(assessment, annual, { annualDomains: missingDomainYear })).toThrow("年份缺失或重复");
      const changedDomainPeriod = structuredClone(annualDomains);
      const changedDomainSegment = changedDomainPeriod.years[0]!.branches[0]!.segments[0]!;
      changedDomainSegment.startInstant = new Date(Date.parse(changedDomainSegment.startInstant) + 1000).toISOString();
      expect(() => buildLocalReadingSnapshot(assessment, annual, { annualDomains: changedDomainPeriod })).toThrow("分支、原区间、大运背景或领域不一致");
      const missingDomainVersion = structuredClone(annualDomains); missingDomainVersion.years[0]!.sourceVersions.pop();
      expect(() => buildLocalReadingSnapshot(assessment, annual, { annualDomains: missingDomainVersion })).toThrow("来源版本不一致");
      if (sex === "unspecified") {
        const crossedDomain = structuredClone(annualDomains), target = crossedDomain.years.find((reading) => reading.year === 2028)!;
        const forward = target.branches.find((branch) => branch.id === "forward")!.segments[0]!;
        const backward = target.branches.find((branch) => branch.id === "backward")!.segments[0]!;
        backward.backgroundRefs = structuredClone(forward.backgroundRefs);
        expect(() => buildLocalReadingSnapshot(assessment, annual, { annualDomains: crossedDomain })).toThrow("分支、原区间、大运背景或领域不一致");
      }
      expect(body).toContain("## 关键阶段与变化年份");
      expect(body).toContain(timeline.version);
      for (const branch of timeline.branches) expect(body).toContain(branch.label);
      for (const stage of timeline.stages) {
        expect(body).toContain(stage.summary);
        for (const link of stage.yearLinks) {
          expect(body).toContain(link.reason);
          expect(body).toContain(link.lifeTheme);
          expect(body).toContain(JSON.stringify(link.nodeRef));
          expect(body).toContain(link.startInstant);
          expect(body).toContain(link.endExclusiveInstant);
        }
        for (const condition of stage.conditions) expect(body).toContain(condition);
      }
      for (const point of timeline.turningPoints) { expect(body).toContain(point.summary); expect(body).toContain(point.atInstant); }
      for (const gap of timeline.gaps) expect(body).toContain(gap.message);
      const mismatchedRange = structuredClone(timeline); mismatchedRange.startYear -= 1;
      expect(() => buildLocalReadingSnapshot(assessment, annual, { life, timeline: mismatchedRange })).toThrow("阶段解读与当前命盘、年份或定位时刻不一致");
      const mismatchedReference = structuredClone(timeline); mismatchedReference.stages[0]!.yearLinks[0]!.nodeRef.revisionId = crypto.randomUUID();
      expect(() => buildLocalReadingSnapshot(assessment, annual, { life, timeline: mismatchedReference })).toThrow("阶段解读的年份节点或区间不一致");
      const mismatchedInstant = structuredClone(timeline); mismatchedInstant.lifeReferenceInstant = "2000-01-01T00:00:00Z";
      expect(() => buildLocalReadingSnapshot(assessment, annual, { life, timeline: mismatchedInstant })).toThrow("阶段解读与当前命盘、年份或定位时刻不一致");
      const incompleteVersions = structuredClone(timeline);
      incompleteVersions.sourceVersions = incompleteVersions.sourceVersions.filter((version) => version === annual.version || version === life.version);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { life, timeline: incompleteVersions })).toThrow("阶段解读的来源版本不一致");
      const clippedSegment = structuredClone(timeline);
      const clippedLink = clippedSegment.stages[0]!.yearLinks[0]!;
      clippedLink.startInstant = new Date(Date.parse(clippedLink.startInstant) + 1000).toISOString();
      expect(() => buildLocalReadingSnapshot(assessment, annual, { life, timeline: clippedSegment })).toThrow("阶段解读的分支、原区间或大运背景不一致");
      if (sex === "unspecified") {
        const crossed = structuredClone(timeline);
        const backward = crossed.stages.filter((stage) => stage.branchId === "backward").flatMap((stage) => stage.yearLinks).find((link) => link.year === 2028)!;
        const forward = annual.years.find((year) => year.year === 2028)!.judgmentSegments.find((segment) => segment.branchId === "forward")!;
        backward.backgroundRefs = structuredClone(forward.judgment.backgroundRefs);
        expect(() => buildLocalReadingSnapshot(assessment, annual, { life, timeline: crossed })).toThrow("阶段解读的分支、原区间或大运背景不一致");
        backward.backgroundRefs = [];
        expect(() => buildLocalReadingSnapshot(assessment, annual, { life, timeline: crossed })).toThrow("阶段解读的分支、原区间或大运背景不一致");
      }
      const judgments = [...annual.years.flatMap((year) => [year.judgment, year.ownJudgment, ...year.judgmentSegments.map((segment) => segment.judgment)]),
        ...life.decades.map((period) => period.judgment), ...monthly.months.flatMap((month) => [month.judgment, month.ownJudgment,
          ...month.judgmentSegments.map((segment) => segment.judgment), ...month.branches.flatMap((branch) => [branch.judgment, ...branch.judgmentSegments.map((segment) => segment.judgment)])])].filter((item) => item !== null);
      expect(judgments.length).toBeGreaterThan(30);
      for (const judgment of judgments) {
        expect(body).toContain(judgment.version);
        expect(body).toContain(judgment.policyVersion);
        expect(body).toContain(judgment.headline);
        expect(body).toContain(judgment.summary);
        expect(body).toContain(JSON.stringify(judgment.targetRef));
        expect(body).toContain(JSON.stringify(judgment.interval));
        for (const axis of judgment.axes) for (const detail of [axis.summary, ...axis.evidence, ...axis.satisfiedConditions, ...axis.unresolvedConditions, ...axis.blockers, ...axis.rescues]) expect(body).toContain(detail);
      }
      for (const chapter of comprehensive.chapters) {
        expect(body).toContain(chapter.verdict);
        for (const paragraph of chapter.paragraphs) expect(body).toContain(paragraph);
      }
      for (const period of [...life.decades, ...monthly.months]) {
        expect(body).toContain(period.startInstant);
        expect(body).toContain(period.endExclusiveInstant);
        for (const paragraph of period.paragraphs) expect(body).toContain(paragraph);
      }
      expect(annualScenarios.years).toHaveLength(10);
      expect(body).toContain(ANNUAL_EVENT_SCENARIOS_VERSION);
      expect(body).toContain("不补充或改写顺逆判断");
      for (const { year, scenarios } of annualScenarios.years) {
        expect(body).toContain(`### ${year}`);
        for (const scenario of scenarios) for (const text of [scenario.summary, ...scenario.examples, ...scenario.conditions, ...scenario.evidence]) expect(body).toContain(text);
      }
      const legacyBody = buildLocalReadingSnapshot(assessment, annual);
      expect(buildLocalReadingSnapshot(assessment, annual, {})).toBe(legacyBody);
      expect(legacyBody).not.toContain("年度情境规则");
      const wrongJudgment = structuredClone(annual);
      wrongJudgment.years[0]!.judgment!.sourceBinding.revisionId = crypto.randomUUID();
      expect(() => buildLocalReadingSnapshot(assessment, wrongJudgment)).toThrow(/综合岁运判断与当前命盘不一致/);
      const wrongSegment = structuredClone(annual);
      const segmentYear = wrongSegment.years.find((year) => year.judgmentSegments.length > 0)!;
      segmentYear.judgmentSegments.push(structuredClone(segmentYear.judgmentSegments[0]!));
      expect(() => buildLocalReadingSnapshot(assessment, wrongSegment)).toThrow(/分段重复、重叠或顺序不一致/);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { comprehensive: { ...comprehensive, sourceBinding: { ...comprehensive.sourceBinding, revisionId: crypto.randomUUID() } } })).toThrow(/不一致/);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { monthly: { ...monthly, chartResultHash: "f".repeat(64) } })).toThrow(/不一致/);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { annualScenarios: { ...annualScenarios, chartResultHash: "a".repeat(64) } })).toThrow(/不一致/);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { annualScenarios: { ...annualScenarios, includeHour: !annualScenarios.includeHour } })).toThrow(/不一致/);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { annualScenarios: { ...annualScenarios, years: annualScenarios.years.slice(1) } })).toThrow(/缺失或重复/);
      const tampered = structuredClone(annualScenarios); tampered.years[0]!.transitNodeRef!.chartResultHash = "b".repeat(64);
      expect(() => buildLocalReadingSnapshot(assessment, annual, { annualScenarios: tampered })).toThrow(/节点/);
      const equallyTamperedAnnual = structuredClone(annual); equallyTamperedAnnual.years[0]!.transitNodeRef!.chartResultHash = "b".repeat(64);
      expect(() => buildLocalReadingSnapshot(assessment, equallyTamperedAnnual, { annualScenarios: tampered })).toThrow(/节点/);
      const unavailable = structuredClone(annual); unavailable.years[0]!.label = "暂不可判";
      expect(() => buildLocalReadingSnapshot(assessment, unavailable, { annualScenarios })).toThrow(/可解读范围/);
      const source = assessment.sources.find((item) => item.provenance);
      expect(source).toBeDefined();
      const facsimileAssessment = structuredClone(assessment);
      facsimileAssessment.sources = [{ ...source!, provenance: { ...source!.provenance!, kind: "facsimile_page",
        rightsNote: "Synthetic facsimile rights statement", licenseUrl: "https://example.invalid/facsimile-rights" } }];
      const facsimileBody = buildLocalReadingSnapshot(facsimileAssessment, null);
      expect(facsimileBody).toContain("影印本页级转录");
      expect(facsimileBody).toContain("Synthetic facsimile rights statement");
      expect(facsimileBody).toContain("https://example.invalid/facsimile-rights");
      expect(facsimileBody).not.toContain("维基文库贡献者");
      expect(facsimileBody).not.toContain("CC BY-SA");
      const saved = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id }, body: storedBody,
        tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });
      database.close(); await database.open();
      const reopenedBody = (await repository.listResearchNotesByCase(revision.caseId)).find((item) => item.id === saved.id)!.body;
      expect(reopenedBody).toBe(storedBody);
      expect(await unpackReadingSnapshot(reopenedBody)).toBe(body);
      console.info(JSON.stringify({ sex, characters: body.length, storedCharacters: storedBody.length, storageFormat: storedBody.split("\n")[0], chapters: comprehensive.chapters.length, decades: life.decades.length, months: monthly.months.length,
        annualScenarioYears: annualScenarios.years.length, scenarios: annualScenarios.years.reduce((sum, entry) => sum + entry.scenarios.length, 0) }));
    } finally { await database.delete(); }
  });
});
