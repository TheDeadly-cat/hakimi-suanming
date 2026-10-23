import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildNatalStructureDetail, NATAL_STRUCTURE_DETAIL_VERSION } from "../../../../packages/bazi-interpretation/src/natal-structure-detail";
import { buildLocalLifeOutlook, type LocalLifeOutlook } from "./local-detailed-outlook";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { buildReadingTimeline, type LocalReadingTimeline, type ReadingTimelineNarrativeStatement } from "./local-reading-timeline";
import { projectStageAnswers } from "./local-stage-answer";
import { readingTimelineNarrativeSubjectId, readingTimelineNarrativeText, readingTimelineStageText } from "./local-reading-timeline-record";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle, contextualFeedbackText, contextualFeedbackVersions, type LocalContextualReadingBundle } from "./local-contextual-reading-record";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, buildReadingFeedbackChoices, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import { summarizeAnnualJudgmentCaptions, READING_YEAR_SUMMARY_VERSION } from "./outlook-judgment-presentation";
import { buildReadingSynthesis, LOCAL_READING_SYNTHESIS_VERSION, type ReadingSynthesisSection } from "./local-reading-synthesis";
import { describeReadingSynthesis } from "./local-reading-synthesis-record";
import { buildNatalLifeStory, NATAL_LIFE_STORY_VERSION } from "./natal-life-story";
import { buildNatalFamilyLifeStory, NATAL_FAMILY_LIFE_STORY_VERSION } from "./natal-family-life-story";
import { buildNatalRelationshipLifeStory, NATAL_RELATIONSHIP_LIFE_STORY_VERSION } from "./natal-relationship-life-story";
import { buildLifeStageStory, LIFE_STAGE_STORY_VERSION } from "./local-life-stage-story";
import { lifeStageStorySubjectId, lifeStageStoryFeedbackText, lifeStageStoryFeedbackVersions } from "./local-life-stage-story-record";

async function fixture(date: string, sex: "male" | "female" | "unspecified" = "male", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic synthesis", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  return { revision, assessment, comprehensive };
}
let a: Awaited<ReturnType<typeof fixture>>, b: Awaited<ReturnType<typeof fixture>>, food: Awaited<ReturnType<typeof fixture>>, unknown: Awaited<ReturnType<typeof fixture>>;
let r3: Awaited<ReturnType<typeof fixture>>, official: Awaited<ReturnType<typeof fixture>>;
let life: LocalLifeOutlook, unknownLife: LocalLifeOutlook, r3Life: LocalLifeOutlook, contextual: LocalContextualReadingBundle;
let annual: LocalAnnualOutlook, unknownAnnual: LocalAnnualOutlook, timeline: LocalReadingTimeline, unknownTimeline: LocalReadingTimeline;
function note(body: string, minute: number, tags: string[], revision = b.revision): ResearchNoteRecord {
  const instant = new Date(Date.UTC(2026, 9, 16, 0, minute)).toISOString();
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id }, bodyFormat: "markdown", body, tags, sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: instant, updatedAt: instant };
}
beforeAll(async () => {
  [a, b, food, unknown] = await Promise.all([fixture("1995-08-18"), fixture("1995-05-18"), fixture("1970-12-08"), fixture("1995-08-18", "unspecified")]);
  r3 = await fixture("2019-12-22", "female", "11:23");
  official = await fixture("1971-04-09", "male", "14:26");
  [life, unknownLife] = await Promise.all([buildLocalLifeOutlook(b.revision, b.assessment, 2026), buildLocalLifeOutlook(unknown.revision, unknown.assessment, 2026)]);
  r3Life = await buildLocalLifeOutlook(r3.revision, r3.assessment, 2030);
  [annual, unknownAnnual] = await Promise.all([buildLocalAnnualOutlook(b.revision, b.assessment, 2026), buildLocalAnnualOutlook(unknown.revision, unknown.assessment, 2026)]);
  timeline = buildReadingTimeline({ revision: b.revision, annual, life });
  unknownTimeline = buildReadingTimeline({ revision: unknown.revision, annual: unknownAnnual, life: unknownLife });
  const record = note(await buildReadingContextRecord(b.revision, null, { work: "seeking_work", relationship: "single", fromYear: 2026, toYear: 2026, notes: "仅合成背景" }), 0, ["阅读背景"]);
  const resolved = await resolveReadingContext({ revision: b.revision, records: [record] });
  contextual = buildContextualReadingBundle({ ...b, context: resolved.latest, referenceYear: 2026, annualDomains: null })!;
});
function chapterChoice(id: string, input = b): ReadingFeedbackChoice {
  const c = input.comprehensive.chapters.find((item) => item.id === id)!;
  return { id: `chapter-${id}`, label: c.title, originalConclusion: `${c.title} · ${c.headline}\n${c.verdict}\n${c.paragraphs.join("\n")}\n综合解读规则：${input.comprehensive.version}`, sourceVersions: [input.comprehensive.version] };
}
function usefulChoice(stem: string, input = b): ReadingFeedbackChoice {
  const guidance = input.comprehensive.usefulGuidance!, entry = guidance.entries.find((item) => item.stem === stem)!;
  return { id: `useful-stem-${entry.id}`, label: entry.roleLabel,
    originalConclusion: `${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}\n${entry.presenceText}\n${entry.judgment}\n${entry.conditions.map((condition) => `条件：${condition}`).join("\n")}\n取用解读规则：${guidance.version}\n综合解读规则：${input.comprehensive.version}`,
    sourceVersions: [input.comprehensive.version, guidance.version] };
}
function expectOriginalStatementRetained(section: ReadingSynthesisSection, statement: ReadingTimelineNarrativeStatement) {
  expect([section.answer ?? "", ...section.paragraphs, ...section.evidence].join("\n")).toContain(statement.text);
}
async function personalFor(choices: ReadingFeedbackChoice[], state: "proposal" | "revised" | "retained" | "needs_more" = "revised", input = b) {
  const records: ResearchNoteRecord[] = [];
  for (const choice of choices) {
    const root = note(buildStructuredReadingFeedback(input.assessment, { subjectId: choice.id, subjectLabel: choice.label, originalConclusion: choice.originalConclusion,
      sourceVersions: choice.sourceVersions, rating: "partial", aspect: "合成个人理解", occurredAt: "2026", actualSituation: "仅测试，不代表用户经历。", requestedRevision: `个人原文 ${choice.id}：我将这段理解为自己的学习经历。` }), 1, ["解读反馈"], input.revision);
    records.push(root);
    if (state === "proposal") continue;
    const revised = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(input.assessment, choice.sourceVersions), {
      state: "revised", notes: "合成明确采用", revisedConclusion: `个人原文 ${choice.id}：我说自己明年收入翻倍，但这只是自述，不能生成新命理事实。`, occurredAt: "2026"
    }), 2, ["解读反馈", "解读反馈复核"], input.revision);
    records.push(revised);
    if (state !== "revised") records.push(note(await buildReadingFeedbackReview(root, revised, readingFeedbackSource(input.assessment, choice.sourceVersions), {
      state, notes: "合成后继复核", revisedConclusion: "", occurredAt: "2026"
    }), 3, ["解读反馈", "解读反馈复核"], input.revision));
  }
  return buildLocalPersonalReading({ revision: input.revision, assessment: input.assessment, choices, records });
}

describe("stage answers with exact visible-source coverage", () => {
  it("explains the first pressure and the handover cause once without dropping either original statement", () => {
    const branch = timeline.branches[0]!, before = JSON.stringify(timeline);
    const projections = projectStageAnswers(timeline, branch.id, branch.narrative.statements);
    const overview = branch.narrative.statements.find((item) => item.kind === "overview")!;
    const pressure = branch.narrative.statements.find((item) => item.kind === "pressure_window")!;
    const turn = branch.narrative.statements.find((item) => item.kind === "turning_point")!;
    const projectedOverview = projections.find((item) => item.statementId === overview.id)!;
    expect(projectedOverview.originalExplanation).toBe(overview.text);
    expect(projectedOverview.text).not.toContain("起段依据");
    expect(projections.find((item) => item.statementId === pressure.id)!.text).toContain(pressure.text);
    const firstReason = timeline.stages[0]!.yearLinks[0]!.reason;
    expect(projections.map((item) => item.text).join("\n").split(firstReason)).toHaveLength(2);
    const projectedTurn = projections.find((item) => item.statementId === turn.id)!;
    expect(projectedTurn.originalExplanation).toBe(turn.text);
    const point = timeline.turningPoints.find((item) => turn.turningPointIds.includes(item.id))!;
    // The current actual B fixture changes from support to mixed at the
    // handover. The equal-caption shortcut is not this case's explanation.
    expect(point.before.caption).toContain("较顺");
    expect(point.after.caption).toContain("利弊并见");
    expect(projectedTurn.text).toContain(`前段“${point.before.caption}”，后段“${point.after.caption}”`);
    expect(projectedTurn.text).not.toContain("转好");
    expect(projectedTurn.text).toContain(point.headline);
    expect(projectedTurn.text).not.toContain("后段依据");
    const section = buildReadingSynthesis({ ...b, life, annual, timeline }).sections.find((item) => item.id === "stage-locked")!;
    expect(section.paragraphs).toContain(overview.text);
    expect(section.paragraphs).toContain(turn.text);
    for (const projection of projections) expect(section.answer).toContain(projection.text);
    expect(JSON.stringify(timeline)).toBe(before);
  });

  it("does not shorten an uncovered cause or rebuild a personally replaced overview", () => {
    const branch = timeline.branches[0]!;
    const overview = branch.narrative.statements.find((item) => item.kind === "overview")!;
    const turn = branch.narrative.statements.find((item) => item.kind === "turning_point")!;
    for (const statement of [overview, turn]) {
      const [projection] = projectStageAnswers(timeline, branch.id, [statement]);
      expect(projection!.text).toContain(statement.text);
      expect(projection!.originalExplanation).toBeNull();
    }
    const remaining = branch.narrative.statements.filter((item) => item.kind !== "overview");
    const projections = projectStageAnswers(timeline, branch.id, remaining);
    expect(projections.some((item) => item.statementId === overview.id)).toBe(false);
    expect(projections.map((item) => item.text).join()).not.toContain("年份节奏：");
  });

  it("keeps mixed-window opposition and rescue intact and does not match merely equal years or captions", () => {
    const changed = structuredClone(timeline), branch = changed.branches[0]!;
    const support = branch.narrative.statements.find((item) => item.kind === "support_window")!;
    support.kind = "mixed_window";
    support.text += "同一分段的另一轴仍有阻力与救应，不能只读助力。";
    const turn = branch.narrative.statements.find((item) => item.kind === "turning_point")!;
    const point = changed.turningPoints.find((item) => turn.turningPointIds.includes(item.id))!;
    point.after = structuredClone(point.after);
    point.after.conditions.push("Synthetic distinct condition, not the same complete source link.");
    const projections = projectStageAnswers(changed, branch.id, branch.narrative.statements);
    expect(projections.find((item) => item.statementId === support.id)!.text).toContain(support.text);
    expect(projections.find((item) => item.statementId === turn.id)!.text).toContain(turn.text);
    expect(projections.find((item) => item.statementId === turn.id)!.originalExplanation).toBeNull();
  });

  it("keeps direction branches separate and rejects altered or duplicate visible statements", () => {
    for (const branch of unknownTimeline.branches) {
      const own = branch.narrative.statements, other = unknownTimeline.branches.find((item) => item.id !== branch.id)!;
      const result = projectStageAnswers(unknownTimeline, branch.id, own);
      expect(result.map((item) => item.statementId)).toEqual(own.map((item) => item.id));
      expect(() => projectStageAnswers(unknownTimeline, branch.id, [other.narrative.statements[0]!])).toThrow("不一致");
    }
    const statement = timeline.branches[0]!.narrative.statements[0]!;
    expect(() => projectStageAnswers(timeline, "locked", [statement, statement])).toThrow("不一致");
    expect(() => projectStageAnswers(timeline, "locked", [{ ...statement, text: "伪造的确定好运" }])).toThrow("不一致");
  });
});

describe("a connected synthesis with exact original and personal provenance", () => {
  it("shows all three actual natal role decisions with exact sources without changing original calculations or chapters", () => {
    const inputs = [b, official, food], kinds = new Set<string>();
    for (const input of inputs) {
      const before = JSON.stringify(input), detail = buildNatalStructureDetail(input), result = buildReadingSynthesis(input);
      expect(detail.findings.length).toBeGreaterThan(0);
      const sections = result.sections.filter((section) => section.id.startsWith("natal-detail-"));
      expect(sections).toHaveLength(detail.findings.length);
      for (const source of detail.sources) expect(result.sources!.find(item => item.id === source.id)).toEqual(source);
      expect(new Set(result.sources!.map(source => source.id)).size).toBe(result.sources!.length);
      for (const section of result.sections.filter(item => ["career", "wealth", "relationships"].includes(item.id))) {
        expect(section.sourceIds!.length).toBeGreaterThan(0);
        for (const id of section.sourceIds!) expect(result.sources!.some(source => source.id === id)).toBe(true);
      }
      expect(result.sourceVersions.filter((version) => version === NATAL_STRUCTURE_DETAIL_VERSION)).toEqual([NATAL_STRUCTURE_DETAIL_VERSION]);
      for (const finding of detail.findings) {
        kinds.add(finding.kind);
        const section = sections.find((item) => item.id === `natal-detail-${finding.id}`)!;
        expect(section.answer).toBe(finding.decision);
        expect(section.origin).toBe("calculated");
        expect(section.sourceIds).toEqual(finding.sourceIds);
        expect(section.sourceSubjects).toEqual(expect.arrayContaining(finding.sourceSubjects));
        expect(section.evidence).toEqual(expect.arrayContaining(finding.evidence));
        expect(describeReadingSynthesis(result, input).join("\n")).toContain(finding.decision);
      }
      expect(JSON.stringify(input)).toBe(before);
    }
    expect([...kinds].sort()).toEqual(["chen_ren_resource_use", "protect_shallow_food", "resource_food_controls_killing"]);
  });

  it("gives the original chapter or concrete-stem adoption priority over only its dependent natal detail", async () => {
    for (const choice of [buildReadingFeedbackChoices(b.assessment, null, [])[0]!, ...["overview", "structure", "useful_elements"].map((id) => chapterChoice(id)), usefulChoice("辛")]) {
      const personal = await personalFor([choice]);
      const result = buildReadingSynthesis({ ...b, personal });
      const section = result.sections.find((item) => item.id.startsWith("natal-detail-"))!;
      expect(section.origin).toBe("personal");
      expect(section.answer).toBeUndefined();
      expect(section.paragraphs).toContain(personal.entries[0]!.personalText);
      expect(section.evidence.join("\n")).toContain(buildNatalStructureDetail(b).findings[0]!.decision);
      expect(result.personalRefs).toEqual(expect.arrayContaining(personal.entries[0]!.selectedReviewRefs));
    }
    const own = await personalFor([usefulChoice("壬", official)], "revised", official);
    expect(buildReadingSynthesis({ ...official, personal: own }).sections.find((item) => item.id.startsWith("natal-detail-"))!.origin).toBe("personal");
    const unrelated = await personalFor([chapterChoice("family")]);
    expect(buildReadingSynthesis({ ...b, personal: unrelated }).sections.find((item) => item.id.startsWith("natal-detail-"))!.answer).toBe(buildNatalStructureDetail(b).findings[0]!.decision);
    const otherStem = await personalFor([usefulChoice("庚")]);
    expect(buildReadingSynthesis({ ...b, personal: otherStem }).sections.find((item) => item.id.startsWith("natal-detail-"))!.answer).toBe(buildNatalStructureDetail(b).findings[0]!.decision);
  });

  it("does not apply stale text, versions, foreign sources or unconfirmed actions to a supplemental decision", async () => {
    const choice = usefulChoice("辛"), original = buildNatalStructureDetail(b).findings[0]!.decision;
    for (const state of ["proposal", "retained", "needs_more"] as const) {
      const personal = await personalFor([choice], state);
      expect(buildReadingSynthesis({ ...b, personal }).sections.find((item) => item.id.startsWith("natal-detail-"))!.answer).toBe(original);
    }
    const personal = await personalFor([choice]);
    for (const field of ["originalConclusion", "readingVersions"] as const) {
      const changed = structuredClone(personal);
      if (field === "originalConclusion") changed.entries[0]!.originalConclusion += "改过的原文";
      else changed.entries[0]!.readingVersions = ["unsupported/source"];
      expect(buildReadingSynthesis({ ...b, personal: changed }).sections.find((item) => item.id.startsWith("natal-detail-"))!.answer).toBe(original);
    }
    const forged = structuredClone(personal);
    forged.entries[0]!.feedback[0]!.source.chartResultHash = "f".repeat(64);
    expect(() => buildReadingSynthesis({ ...b, personal: forged })).toThrow("个人采用来源");
    const altered = buildReadingSynthesis(b); altered.sources![0]!.url = "https://invalid.example/forged";
    expect(() => describeReadingSynthesis(altered, b)).toThrow("不一致");
  });

  it("binds the existing life projection once and preserves its rendered paragraphs and provenance through save", () => {
    const input = { ...b, life, annual, timeline }, before = JSON.stringify(input);
    const story = buildNatalLifeStory({ ...b, referenceInstant: life.referenceInstant });
    const result = buildReadingSynthesis(input), saved = describeReadingSynthesis(result, input).join("\n");
    expect(result.version).toBe("hakimi.local-reading-synthesis/0.19.0");
    expect(result.headline).toBe(story.headline);
    expect(result.sourceVersions.filter((version) => version === NATAL_LIFE_STORY_VERSION)).toEqual([NATAL_LIFE_STORY_VERSION]);
    const main = result.sections.find((section) => section.id === "mechanism")!;
    expect(main.answer).toBe(story.mainParagraphs.map((item) => item.text).join("\n\n"));
    for (const item of story.mainParagraphs) {
      expect(main.sourceSubjects).toEqual(expect.arrayContaining(item.sourceSubjects));
      expect(saved).toContain(item.text);
    }
    for (const item of story.workWealthParagraphs) {
      const work = result.sections.find((section) => section.id === item.domain)!;
      expect(work.answer).toContain(item.text);
      expect(work.sourceSubjects).toEqual(expect.arrayContaining(item.sourceSubjects));
      expect(saved).toContain(item.text);
    }
    expect(saved).toContain(b.comprehensive.usefulGuidance!.answer.summary);
    expect(JSON.stringify(input)).toBe(before);
    const stale = structuredClone(result); stale.sourceVersions = stale.sourceVersions.filter((version) => version !== NATAL_LIFE_STORY_VERSION);
    expect(() => describeReadingSynthesis(stale, input)).toThrow("不一致");
  });

  it("uses a real child reference when supplied and leaves missing reference age unknown", () => {
    const unknownAge = buildNatalLifeStory({ ...r3, referenceInstant: null });
    const child = buildNatalLifeStory({ ...r3, referenceInstant: r3Life.referenceInstant });
    expect(unknownAge.age).toBeNull(); expect(unknownAge.referenceYear).toBeNull();
    expect(child.referenceYear).toBe(2030); expect(child.age?.stage).toBe("youth");
    for (const [input, story] of [[r3, unknownAge], [{ ...r3, life: r3Life }, child]] as const) {
      const before = JSON.stringify(input), result = buildReadingSynthesis(input);
      const main = result.sections.find((section) => section.id === "mechanism")!;
      expect(main.answer).toBe(story.mainParagraphs.map((item) => item.text).join("\n\n"));
      for (const item of story.workWealthParagraphs) expect(result.sections.find((section) => section.id === item.domain)!.answer).toContain(item.text);
      expect(main.paragraphs).toContain(r3.comprehensive.patternDiagnosis!.currentJudgment);
      expect(main.paragraphs).toContain(r3.comprehensive.usefulGuidance!.answer.summary);
      expect(JSON.stringify(input)).toBe(before);
    }
    const childWork = buildReadingSynthesis({ ...r3, life: r3Life }).sections.filter((section) => ["career", "wealth"].includes(section.id));
    expect(childWork).toHaveLength(2);
    for (const section of childWork) {
      expect(section.answer).toMatch(/学习|课堂|作业|同伴|材料|用品/);
      expect(section.answer).not.toMatch(/客户|岗位|经营|工资|退休/);
    }
  });

  it("leads R3 with a life narrative while preserving the actual clearing judgment and useful order unchanged", () => {
    const before = JSON.stringify(r3), result = buildReadingSynthesis(r3), diagnosis = r3.comprehensive.patternDiagnosis!, answer = r3.comprehensive.usefulGuidance!.answer;
    const main = result.sections.find((section) => section.id === "mechanism")!;
    const working = r3.assessment.balance.structural.working;
    expect(working).toMatchObject({ band: "balanced", label: "得令有根，强弱相对均衡", direction: "conditional",
      focus: "rooted_peer_mixed_authority", favorableElements: [], unfavorableElements: [] });
    const story = buildNatalLifeStory({ ...r3, referenceInstant: null });
    expect(main.answer).toBe(story.mainParagraphs.map((item) => item.text).join("\n\n"));
    expect(main.paragraphs).toContain(diagnosis.currentJudgment);
    expect(main.paragraphs.join("\n")).toMatch(/戊.*正官/); expect(main.paragraphs.join("\n")).toMatch(/己.*七杀/);
    expect(result.keyPoints!.find((point) => point.id === "useful")!.text).toBe(answer.headline);
    expect(answer.headline).toContain("丙已透有根"); expect(answer.headline).toContain("辛未见");
    expect(main.answer).not.toContain("最需分清的是哪些要求已经确定");
    expect(result.keyPoints!.find((point) => point.id === "strength")!.text).toBe(story.strength.text);
    expect(main.paragraphs).toContain(answer.summary);
    expect(r3.assessment.balance.band).toBe("weak"); expect(r3.assessment.balance.structural.working.direction).toBe("conditional");
    expect(r3.assessment.balance.structural.working.favorableElements).toEqual([]);
    const saved = describeReadingSynthesis(result, r3).join("\n");
    expect(saved).toContain(diagnosis.currentJudgment); expect(saved).toContain(answer.headline);
    expect(saved).toContain(working.label);
    expect(result.sourceVersions).toContain(working.version);
    expect(JSON.stringify(r3)).toBe(before);
  });
  it("retains explicitly adopted R3 structure/useful text and refuses stale-version adoption", async () => {
    for (const id of ["structure", "useful_elements"]) {
      const choice = chapterChoice(id, r3), personal = await personalFor([choice], "revised", r3);
      const result = buildReadingSynthesis({ ...r3, personal });
      expect(result.sections.some((section) => section.id === "mechanism")).toBe(false);
      expect(result.keyPoints!.some((point) => point.sourceSubjects.includes(choice.id))).toBe(false);
      expect(result.sections.find((section) => section.id === `personal-${choice.id}`)!.paragraphs).toEqual([personal.entries[0]!.personalText]);
      const stale = await personalFor([{ ...choice, sourceVersions: ["hakimi.bazi-comprehensive-reading/0.11.0"] }], "revised", r3);
      const current = buildReadingSynthesis({ ...r3, personal: stale });
      expect(current.personalRefs).toEqual([]); expect(current.conditions.join()).toContain("原文或版本不同");
      expect(current.sections.find((section) => section.id === "mechanism")!.paragraphs).toContain(r3.comprehensive.patternDiagnosis!.currentJudgment);
      expect(current.sections.find((section) => section.id === "mechanism")!.answer).toBe(buildNatalLifeStory({ ...r3, referenceInstant: null }).mainParagraphs.map((item) => item.text).join("\n\n"));
    }
  });
  it("uses the complete relationship foundation answer rather than independently rebuilding a generic day-group reading", () => {
    for (const input of [a, b]) {
      const chapter = input.comprehensive.chapters.find((item) => item.id === "relationships")!;
      const result = buildReadingSynthesis(input), section = result.sections.find((item) => item.id === "relationships")!;
      expect(section.answer).toBe(chapter.verdict); expect(section.paragraphs).toEqual(chapter.paragraphs);
      expect(section.evidence).toEqual(chapter.evidence); expect(section.conditions).toEqual(chapter.cautions);
      expect(result.sourceVersions).toContain(input.comprehensive.relationshipFoundation!.version);
    }
    expect(buildReadingSynthesis(a).sections.find((item) => item.id === "relationships")!.answer)
      .not.toBe(buildReadingSynthesis(b).sections.find((item) => item.id === "relationships")!.answer);
  });

  it("carries the complete family answer into the default reading and keeps family adoption separate from relationships", async () => {
    for (const input of [a, b]) {
      const family = input.comprehensive.chapters.find((chapter) => chapter.id === "family")!;
      const reading = buildReadingSynthesis(input), section = reading.sections.find((section) => section.id === "family")!;
      expect(section.answer).toBe([family.verdict, ...family.paragraphs].join("\n\n"));
      expect(section.paragraphs).toEqual(family.paragraphs);
      expect(section.sourceSubjects).toEqual(["chapter-family"]);
      expect(section.evidence).toEqual(family.evidence);
      expect(section.conditions).toEqual(family.cautions);
    }
    const choice = chapterChoice("family"), personal = await personalFor([choice]);
    const result = buildReadingSynthesis({ ...b, personal });
    expect(result.sections.some((section) => section.id === "family")).toBe(false);
    const adopted = result.sections.find((section) => section.id === "personal-chapter-family")!;
    expect(adopted.paragraphs).toEqual([personal.entries[0]!.personalText]);
    expect(adopted.evidence.join()).toContain(choice.originalConclusion);
    expect(result.sections.find((section) => section.id === "relationships"))
      .toEqual(buildReadingSynthesis(b).sections.find((section) => section.id === "relationships"));
    const stale = await personalFor([{ ...choice, sourceVersions: ["old-family-source/0"] }]);
    const retained = buildReadingSynthesis({ ...b, personal: stale });
    expect(retained.sections.some((section) => section.id === "family")).toBe(true);
    expect(retained.personalRefs).toEqual([]);
  });

  it("uses child family scenes at the actual reference age while preserving old chapter adoption", async () => {
    const story = buildNatalFamilyLifeStory({ revision: r3.revision, comprehensive: r3.comprehensive, referenceInstant: r3Life.referenceInstant });
    expect(story.age?.stage).toBe("youth");
    const result = buildReadingSynthesis({ ...r3, life: r3Life }), section = result.sections.find((item) => item.id === "family")!;
    expect(section.ageAdapted).toBe(true);
    expect(section.answer).toBe(story.paragraphs.join("\n\n"));
    expect(section.answer).not.toMatch(/伴侣|工资|家庭开销|固定费用/);
    expect(result.sourceVersions).toContain(NATAL_FAMILY_LIFE_STORY_VERSION);
    const chapter = r3.comprehensive.chapters.find((item) => item.id === "family")!;
    expect(section.paragraphs).toEqual([chapter.verdict, ...chapter.paragraphs]);
    expect(section.evidence).toEqual(expect.arrayContaining(chapter.evidence));
    const personal = await personalFor([chapterChoice("family", r3)], "revised", r3);
    const replaced = buildReadingSynthesis({ ...r3, life: r3Life, personal });
    expect(replaced.sections.some((item) => item.id === "family")).toBe(false);
    expect(replaced.sections.find((item) => item.id === "personal-chapter-family")!.paragraphs).toEqual([personal.entries[0]!.personalText]);
    const unscoped = buildReadingSynthesis(r3).sections.find((item) => item.id === "family")!;
    expect(unscoped.ageAdapted).toBeUndefined();
    expect(unscoped.answer).toBe([chapter.verdict, ...chapter.paragraphs].join("\n\n"));
  });

  it("keeps contextual relationship wording first while retaining every original natal paragraph as comparison", () => {
    const result = buildReadingSynthesis({ ...b, contextual }), section = result.sections.find((item) => item.id === "relationships")!;
    const adapted = contextual.readings.find((item) => item.subjectId === "contextual-chapter-relationships")!;
    const chapter = b.comprehensive.chapters.find((item) => item.id === "relationships")!;
    expect(section.answer).toBe(adapted.summary); expect(section.paragraphs).toEqual(adapted.paragraphs);
    expect(section.evidence.join()).toContain(chapter.verdict);
    for (const paragraph of chapter.paragraphs) expect(section.evidence.join()).toContain(paragraph);
    const bad = structuredClone(b.comprehensive); bad.relationshipFoundation!.sourceBinding.sex = "female";
    expect(() => buildReadingSynthesis({ ...b, comprehensive: bad })).toThrow("传统关系视角");
    const wrongHour = structuredClone(b.comprehensive); wrongHour.relationshipFoundation!.sourceBinding.includeHour = false;
    expect(() => buildReadingSynthesis({ ...b, comprehensive: wrongHour })).toThrow("时辰来源不一致");
  });

  it("projects distinct adult and child relationship answers without changing the original adoption subjects", async () => {
    for (const [input, currentLife] of [[b, life], [r3, r3Life]] as const) {
      const story = buildNatalRelationshipLifeStory({ ...input, referenceInstant: currentLife.referenceInstant });
      const reading = buildReadingSynthesis({ ...input, life: currentLife }), section = reading.sections.find((item) => item.id === "relationships")!;
      expect(section.lifeAdapted).toBe(true);
      expect(section.answer).toBe(story.paragraphs.join("\n\n"));
      expect(section.sourceSubjects).toEqual(["chapter-relationships"]);
      expect(reading.sourceVersions).toContain(NATAL_RELATIONSHIP_LIFE_STORY_VERSION);
      const original = input.comprehensive.chapters.find((item) => item.id === "relationships")!;
      expect(section.paragraphs).toEqual([original.verdict, ...original.paragraphs]);
      const personal = await personalFor([chapterChoice("relationships", input)], "revised", input);
      const revised = buildReadingSynthesis({ ...input, life: currentLife, personal });
      expect(revised.sections.some((item) => item.id === "relationships")).toBe(false);
      expect(revised.sections.find((item) => item.id === "personal-chapter-relationships")!.paragraphs).toEqual([personal.entries[0]!.personalText]);
    }
    const child = buildReadingSynthesis({ ...r3, life: r3Life }).sections.find((item) => item.id === "relationships")!;
    expect(child.answer).toMatch(/同伴|照料|表达/);
    expect(child.answer).not.toMatch(/伴侣|婚姻|妻星|夫星|共同费用/);
  });

  it("binds a context projection to the current record and retains either old chapter or contextual adoption", async () => {
    const story = buildNatalRelationshipLifeStory({ ...b, referenceInstant: life.referenceInstant, contextual });
    expect(story.appliedRelationship).toBe("single");
    const result = buildReadingSynthesis({ ...b, life, contextual }), section = result.sections.find((item) => item.id === "relationships")!;
    const ctx = contextual.readings.find((item) => item.subjectId === "contextual-chapter-relationships")!;
    expect(section.answer).toBe(story.paragraphs.join("\n\n"));
    expect(section.sourceSubjects).toEqual(["chapter-relationships", ctx.subjectId]);
    expect(section.contextProjection).toEqual({ subjectId: ctx.subjectId, reference: contextual.contextSource.reference,
      referenceYear: contextual.referenceYear, sourceVersions: ctx.sourceVersions });
    expect(section.paragraphs).toContain(ctx.summary);
    for (const choice of [chapterChoice("relationships"), { id: ctx.subjectId, label: ctx.title,
      originalConclusion: contextualFeedbackText(ctx, contextual), sourceVersions: contextualFeedbackVersions(ctx, contextual) }]) {
      const personal = await personalFor([choice]), replaced = buildReadingSynthesis({ ...b, life, contextual, personal });
      expect(replaced.sections.some((item) => item.id === "relationships")).toBe(false);
      expect(replaced.sections.find((item) => item.id === `personal-${choice.id}`)!.paragraphs).toEqual([personal.entries[0]!.personalText]);
    }
  });
  it("puts distinct strengths, the actual bottleneck and the bound useful order ahead of long prose", () => {
    const left = buildReadingSynthesis(a), right = buildReadingSynthesis(b);
    expect(left.keyPoints!.map((point) => point.id)).toEqual(["strength", "obstacle", "useful"]);
    expect(right.keyPoints!.find((point) => point.id === "strength")!.text).toBe(buildNatalLifeStory({ ...b, referenceInstant: null }).strength.text);
    expect(left.keyPoints!.find((point) => point.id === "strength")!.text).not.toBe(right.keyPoints![0]!.text);
    expect(right.keyPoints!.find((point) => point.id === "useful")!.text).toBe(b.comprehensive.usefulGuidance!.answer.headline);
    const saved = describeReadingSynthesis(right, b).join("\n");
    for (const point of right.keyPoints!) expect(saved).toContain(point.text);
    const forged = structuredClone(right); forged.keyPoints![0]!.text = "一定收入翻倍";
    expect(() => describeReadingSynthesis(forged, b)).toThrow("不一致");
  });

  it("removes only summaries dependent on a personally replaced topic", async () => {
    const personal = await personalFor([chapterChoice("career")]);
    const result = buildReadingSynthesis({ ...b, personal });
    expect(result.keyPoints!.map((point) => point.id)).toEqual(["useful"]);
    expect(result.sections.find((section) => section.id === "personal-chapter-career")!.paragraphs).toEqual([personal.entries[0]!.personalText]);
    expect(result.keyPoints!.every((point) => !point.sourceSubjects.includes("chapter-career"))).toBe(true);
  });
  it("keeps the untouched domain's life narrative while an adopted domain remains exact personal text", async () => {
    const story = buildNatalLifeStory({ ...b, referenceInstant: null });
    for (const domain of ["career", "wealth"] as const) {
      const choice = chapterChoice(domain), personal = await personalFor([choice]);
      const result = buildReadingSynthesis({ ...b, personal });
      const automatic = result.sections.find((section) => section.id === (domain === "career" ? "wealth" : "career"))!;
      expect(result.sections.some((section) => section.id === domain)).toBe(false);
      const own = story.workWealthParagraphs.find((paragraph) => paragraph.domain === domain)!;
      const other = story.workWealthParagraphs.find((paragraph) => paragraph.domain !== domain)!;
      expect(automatic.answer).not.toContain(own.text);
      expect(automatic.answer).toContain(other.text);
      expect(automatic.sourceSubjects).not.toContain(choice.id);
      const adopted = result.sections.find((section) => section.id === `personal-${choice.id}`)!;
      expect(adopted.paragraphs).toEqual([personal.entries[0]!.personalText]);
      expect(adopted.answer).toBeUndefined();
      expect(adopted.evidence.join("\n")).toContain(choice.originalConclusion);
      const saved = describeReadingSynthesis(result, { ...b, personal }).join("\n");
      expect(saved).toContain(personal.entries[0]!.personalText!); expect(saved).toContain(other.text);
    }
  });
  it("uses different actual paths and positions instead of joining chapter headlines", () => {
    const inputs = [a, b, food], before = JSON.stringify(inputs), results = inputs.map((input) => buildReadingSynthesis(input));
    expect(new Set(results.map((item) => item.headline)).size).toBe(3);
    expect(b.comprehensive.patternDiagnosis?.primaryPathId).toBe("resource-output");
    expect(results[1]!.sections[0]!.paragraphs.join()).toContain("准备越深入");
    expect(results[1]!.sections[0]!.paragraphs.join()).toContain(`月柱${b.revision.facts.pillars.month.ganZhi}`);
    expect(results[1]!.sections[0]!.paragraphs.join()).toContain("同五行藏根");
    expect(results[1]!.sections[0]!.answer).toBe(buildNatalLifeStory({ ...b, referenceInstant: null }).mainParagraphs.map((item) => item.text).join("\n\n"));
    expect(results[1]!.sections[0]!.paragraphs).toContain(b.comprehensive.usefulGuidance!.answer.summary);
    expect(results[0]!.sections[0]!.answer).not.toBe(results[1]!.sections[0]!.answer);
    expect(results[1]!.summary).toBe(b.comprehensive.chapters.find((item) => item.id === "overview")!.verdict);
    expect(results[2]!.sections.find((item) => item.id === "wealth")!.paragraphs.join()).toContain("新增支持与新增要求");
    for (const [index, result] of results.entries()) {
      expect(result.sections.filter((section) => !section.id.startsWith("natal-detail-")).map((section) => section.id)).toEqual(["mechanism", "career", "wealth", "relationships", "family"]);
      expect(result.sections.filter((section) => section.id.startsWith("natal-detail-")).map((section) => section.id)).toEqual(buildNatalStructureDetail(inputs[index]!).findings.map((finding) => `natal-detail-${finding.id}`));
    }
    expect(results[0]!.sourceVersions).toContain(LOCAL_READING_SYNTHESIS_VERSION);
    expect(JSON.stringify(inputs)).toBe(before);
  });
  it("answers the actual A/B main section in existing life terms while retaining the exact useful explanation and other sections", () => {
    for (const input of [a, b]) {
      const original = JSON.stringify(input), result = buildReadingSynthesis(input), main = result.sections.find((section) => section.id === "mechanism")!;
      const activePoints = result.keyPoints!.filter((point) => point.id !== "useful");
      expect(main.answer).toBe(buildNatalLifeStory({ ...input, referenceInstant: null }).mainParagraphs.map((item) => item.text).join("\n\n"));
      expect(main.answer).not.toBe(input.comprehensive.usefulGuidance!.answer.summary);
      expect(main.paragraphs).toContain(input.comprehensive.usefulGuidance!.answer.summary);
      for (const point of activePoints) expect(main.sourceSubjects).toEqual(expect.arrayContaining(point.sourceSubjects));
      const saved = describeReadingSynthesis(result, input).join("\n");
      expect(saved).toContain(main.answer!); expect(saved).toContain(input.comprehensive.usefulGuidance!.answer.summary);
      expect(JSON.stringify(input)).toBe(original);
    }
    expect(buildReadingSynthesis(b).sections.find((section) => section.id === "mechanism")!.answer).toMatch(/理解.*表达|理解.*呈现/u);
    expect(buildReadingSynthesis(a).sections.find((section) => section.id === "mechanism")!.answer)
      .not.toBe(buildReadingSynthesis(b).sections.find((section) => section.id === "mechanism")!.answer);
  });
  it("does not reintroduce replaced career, overview or contextual statements through the new main answer", async () => {
    const ctx = contextual.readings.find((item) => item.subjectId === "contextual-chapter-career")!;
    const choices = [chapterChoice("career"), chapterChoice("overview"),
      { id: "natal-overview", label: "命局初判总述", originalConclusion: b.assessment.headline, sourceVersions: [b.assessment.version] },
      { id: ctx.subjectId, label: ctx.title, originalConclusion: contextualFeedbackText(ctx, contextual), sourceVersions: contextualFeedbackVersions(ctx, contextual) }];
    const automatic = buildReadingSynthesis(b).keyPoints!.filter((point) => point.id !== "useful");
    for (const choice of choices) {
      const personal = await personalFor([choice]), result = buildReadingSynthesis({ ...b, contextual, personal });
      const main = result.sections.find((section) => section.id === "mechanism")!;
      expect(main.answer).toBeUndefined();
      for (const point of automatic) {
        expect(main.paragraphs.join("\n")).not.toContain(point.text);
        expect(result.summary).not.toContain(point.text);
      }
      expect(result.sections.find((section) => section.id === `personal-${choice.id}`)!.paragraphs).toEqual([personal.entries[0]!.personalText]);
    }
  });
  it("keeps an unaffected strength when wealth is personally replaced and never replaces personal structure or useful text", async () => {
    const automatic = buildReadingSynthesis(b).keyPoints!;
    const result = buildReadingSynthesis({ ...b, personal: await personalFor([chapterChoice("wealth")]) });
    expect(result.sections.find((section) => section.id === "mechanism")!.answer).toBe(automatic.find((point) => point.id === "strength")!.text);
    expect(result.sections.find((section) => section.id === "mechanism")!.answer).not.toContain(automatic.find((point) => point.id === "obstacle")!.text);
    for (const id of ["structure", "useful_elements"]) {
      const personal = await personalFor([chapterChoice(id)]), changed = buildReadingSynthesis({ ...b, personal });
      expect(changed.sections.some((section) => section.id === "mechanism")).toBe(false);
      const section = changed.sections.find((section) => section.id === `personal-chapter-${id}`)!;
      expect(section.paragraphs).toEqual([personal.entries[0]!.personalText]);
      expect(section.answer).toBeUndefined();
    }
  });
  it("uses declared current natal contexts while retaining the exact context reference and source topics", () => {
    const before = JSON.stringify({ b, life, contextual }), result = buildReadingSynthesis({ ...b, life, contextual });
    const work = result.sections.find((item) => item.id === "career")!;
    const wealth = result.sections.find((item) => item.id === "wealth")!;
    expect(work.origin).toBe("contextual"); expect(work.paragraphs.join()).toContain("岗位要求和面谈反馈");
    const story = buildNatalLifeStory({ ...b, referenceInstant: life.referenceInstant, context: contextual.contextSource.document.context });
    expect(story.appliedWork).toBe("seeking_work");
    for (const paragraph of story.workWealthParagraphs) expect(result.sections.find((item) => item.id === paragraph.domain)!.answer).toContain(paragraph.text);
    expect(wealth.paragraphs.join()).toContain("求职时间、交通");
    expect(work.sourceSubjects).toEqual(expect.arrayContaining(["chapter-career", "contextual-chapter-career"]));
    expect(work.sourceSubjects).not.toContain("chapter-wealth");
    expect(wealth.sourceSubjects).toEqual(expect.arrayContaining(["chapter-wealth", "contextual-chapter-wealth"]));
    expect(wealth.sourceSubjects).not.toContain("chapter-career");
    const relationshipContext = contextual.readings.find((item) => item.scope.kind === "natal" && item.scope.chapterId === "relationships")!;
    expect(result.sections.find((item) => item.id === "relationships")!.answer).toBe(buildNatalRelationshipLifeStory({ ...b, referenceInstant: life.referenceInstant, contextual }).paragraphs.join("\n\n"));
    expect(result.sections.find((item) => item.id === "relationships")!.paragraphs).toEqual(expect.arrayContaining([relationshipContext.summary, ...relationshipContext.paragraphs]));
    expect(result.contextRef).toEqual(contextual.contextSource.reference);
    const current = life.decades.find((item) => item.id === life.branches[0]!.currentDecadeId)!;
    const stageText = result.sections.find((item) => item.id === "stage-locked")!.paragraphs.join();
    expect(stageText).toContain(current.career.text);
    expect(stageText).toContain(current.paragraphs[1]);
    expect(stageText.indexOf(current.career.text)).toBeLessThan(stageText.indexOf("原综合判断为"));
    expect(result.summary).not.toContain("月令背景是本盘的月令背景");
    expect(JSON.stringify({ b, life, contextual })).toBe(before);
  });
  it("retains the existing contextual domain answers when no life reference supplies a reliable age", () => {
    const before = JSON.stringify({ b, contextual }), result = buildReadingSynthesis({ ...b, contextual });
    const story = buildNatalLifeStory({ ...b, referenceInstant: null, context: contextual.contextSource.document.context });
    expect(story.age).toBeNull(); expect(story.appliedWork).toBeNull();
    const saved = describeReadingSynthesis(result, { ...b, contextual }).join("\n");
    for (const reading of contextual.readings.filter((item) => item.scope.kind === "natal" && ["career", "wealth"].includes(item.scope.chapterId))) {
      const work = result.sections.find((section) => `contextual-chapter-${section.id}` === reading.subjectId)!;
      expect(work.origin).toBe("contextual");
      expect(work.answer).toContain(reading.summary);
      expect(work.sourceSubjects).toContain(reading.subjectId);
      for (const paragraph of story.workWealthParagraphs) expect(work.answer).not.toContain(paragraph.text);
      expect(saved).toContain(work.answer!);
    }
    expect(result.sections.find((section) => section.id === "mechanism")!.answer).toBe(story.mainParagraphs.map((item) => item.text).join("\n\n"));
    expect(result.contextRef).toEqual(contextual.contextSource.reference);
    expect(JSON.stringify({ b, contextual })).toBe(before);
  });
  it("retains every adopted overview, domain, contextual and current-stage personal text without interpreting it", async () => {
    const current = life.decades.find((item) => item.id === life.branches[0]!.currentDecadeId)!;
    const ctx = contextual.readings.find((item) => item.subjectId === "contextual-chapter-career")!;
    const choices = ["overview", "structure", "useful_elements", "career", "wealth", "relationships", "family"].map((id) => chapterChoice(id)).concat([
      { id: "natal-overview", label: "命局初判总述", originalConclusion: b.assessment.headline, sourceVersions: [b.assessment.version] },
      { id: ctx.subjectId, label: ctx.title, originalConclusion: contextualFeedbackText(ctx, contextual), sourceVersions: contextualFeedbackVersions(ctx, contextual) },
      { id: "life-overview", label: "当前阶段", originalConclusion: `${life.referenceLabel}\n${life.summary}\n岁运解读规则：${life.version}`, sourceVersions: [life.version] },
      { id: `decade-${current.id}`, label: current.headline, originalConclusion: `${current.headline}\n${current.branchLabel} · ${current.startInstant} 至 ${current.endExclusiveInstant}\n${current.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(current.judgment)}\n岁运解读规则：${life.version}`, sourceVersions: [life.version] }
    ]);
    const personal = await personalFor(choices), before = JSON.stringify({ b, life, contextual, personal });
    const result = buildReadingSynthesis({ ...b, life, contextual, personal });
    for (const entry of personal.entries) {
      const section = result.sections.find((item) => item.sourceSubjects.includes(entry.subjectId) && item.origin === "personal")!;
      expect(section.paragraphs).toEqual([entry.personalText]);
      expect(section.answer).toBeUndefined();
      expect(section.evidence.join()).toContain(entry.originalConclusion);
    }
    expect(result.personalRefs).toHaveLength(11);
    expect(result.keyPoints).toEqual([]);
    expect(result.sections.filter((item) => item.origin !== "personal").flatMap((item) => item.paragraphs).join()).not.toContain("收入翻倍");
    expect(JSON.stringify({ b, life, contextual, personal })).toBe(before);
  });
  it("an adopted life overview puts original current-stage conclusions into comparison evidence", async () => {
    const choice = { id: "life-overview", label: "当前阶段", originalConclusion: `${life.referenceLabel}\n${life.summary}\n岁运解读规则：${life.version}`, sourceVersions: [life.version] };
    const personal = await personalFor([choice]), result = buildReadingSynthesis({ ...b, life, personal });
    expect(result.sections.some((item) => item.id.startsWith("stage-"))).toBe(false);
    const section = result.sections.find((item) => item.id === "personal-life-overview")!;
    expect(section.paragraphs).toEqual([personal.entries[0]!.personalText]);
    for (const branch of life.branches) {
      const current = life.decades.find((item) => item.id === branch.currentDecadeId)!;
      expect(section.evidence.join()).toContain(current.headline);
      expect(section.conditions).toEqual(expect.arrayContaining(current.judgment.conditions));
    }
  });
  it("does not apply proposals, retained or needs_more and does not reuse an old-source personal entry", async () => {
    for (const state of ["proposal", "retained", "needs_more"] as const) {
      const result = buildReadingSynthesis({ ...b, personal: await personalFor([chapterChoice("career")], state) });
      expect(result.personalRefs).toEqual([]); expect(result.sections.some((item) => item.origin === "personal")).toBe(false);
    }
    const original = chapterChoice("career"), stale = { ...original, sourceVersions: ["old/0"] };
    const result = buildReadingSynthesis({ ...b, personal: await personalFor([stale]) });
    expect(result.personalRefs).toEqual([]); expect(result.conditions.join()).toContain("原文或版本不同");
  });
  it("keeps both unknown-sex current branches and their full evidence and conditions independent", () => {
    const before = JSON.stringify({ unknown, unknownLife }), result = buildReadingSynthesis({ ...unknown, life: unknownLife });
    const stages = result.sections.filter((item) => item.id.startsWith("stage-"));
    expect(stages.map((item) => item.id)).toEqual(["stage-forward", "stage-backward"]);
    for (const branch of unknownLife.branches) {
      const current = unknownLife.decades.find((item) => item.id === branch.currentDecadeId)!;
      const section = stages.find((item) => item.id === `stage-${branch.id}`)!;
      expect(section.paragraphs.join()).toContain(current.ganZhi);
      expect(section.paragraphs.join()).toContain(current.judgment.label);
      expect(section.paragraphs.join()).toContain(current.career.text);
      expect(section.sourceSubjects).toContain(`decade-${current.id}`);
      expect(section.conditions).toEqual(expect.arrayContaining(current.judgment.conditions));
    }
    expect(JSON.stringify({ unknown, unknownLife })).toBe(before);
  });
  it("rejects cross-chart, cross-year and false current-stage input rather than blending it", () => {
    expect(() => buildReadingSynthesis({ ...b, comprehensive: a.comprehensive })).toThrow("来源不一致");
    const oldContext = structuredClone(contextual); oldContext.referenceYear = 2025;
    expect(() => buildReadingSynthesis({ ...b, life, contextual: oldContext })).toThrow("年份不一致");
    const bad = structuredClone(life); bad.branches[0]!.currentDecadeId = bad.decades.find((item) => item.stagePosition === "future")!.id;
    expect(() => buildReadingSynthesis({ ...b, life: bad })).toThrow("当前阶段定位不一致");
  });

  it("connects the current decade and the exact calculated ten-year statements without a parallel list", () => {
    const input = { ...b, life, annual, timeline }, before = JSON.stringify(input);
    const result = buildReadingSynthesis(input), rebuilt = buildReadingSynthesis({ ...b, life, annual });
    expect(result).toEqual(rebuilt);
    expect(result.sections).toHaveLength(6 + buildNatalStructureDetail(b).findings.length);
    const section = result.sections.find((item) => item.id === "stage-locked")!;
    expect(section.title).toContain("2026—2035年");
    expect(section.answer).toContain(life.decades.find((item) => item.id === life.branches[0]!.currentDecadeId)!.ganZhi);
    const stageStory = buildLifeStageStory({ ...b, life });
    const currentStory = stageStory.branches[0]!.stages.find((item) => item.decadeId === life.branches[0]!.currentDecadeId)!;
    for (const paragraph of currentStory.paragraphs) expect(section.answer).toContain(paragraph);
    expect(result.sourceVersions.filter((version) => version === LIFE_STAGE_STORY_VERSION)).toEqual([LIFE_STAGE_STORY_VERSION]);
    for (const statement of timeline.branches[0]!.narrative.statements) expectOriginalStatementRetained(section, statement);
    for (const paragraph of timeline.branches[0]!.narrative.paragraphs) expect(section.paragraphs).toContain(paragraph);
    expect(result.sourceVersions).toEqual(expect.arrayContaining([timeline.version, ...timeline.sourceVersions]));
    expect(result.sections.some((item) => item.id.startsWith("trajectory-"))).toBe(false);
    expect(JSON.stringify(input)).toBe(before);
    const noLife = buildReadingSynthesis({ ...b, annual });
    expect(noLife.sections.find((item) => item.id === "stage-locked")!.title).toContain("2026—2035");
    expect(noLife.conditions.join()).toContain("当前大运定位尚未载入");
  });

  it("rejects a standalone, altered or mismatched trajectory rather than trusting its text", () => {
    expect(() => buildReadingSynthesis({ ...b, timeline })).toThrow("缺少原年度计算");
    for (const modify of [
      (value: LocalReadingTimeline) => { value.branches[0]!.narrative.statements[0]!.text = "2035年必定成功"; },
      (value: LocalReadingTimeline) => { value.branches[0]!.narrative.statements[0]!.stageIds = []; },
      (value: LocalReadingTimeline) => { value.startYear += 1; }
    ]) {
      const bad = structuredClone(timeline); modify(bad);
      expect(() => buildReadingSynthesis({ ...b, life, annual, timeline: bad })).toThrow("原年度计算不一致");
    }
    expect(() => buildReadingSynthesis({ ...b, life, annual: unknownAnnual })).toThrow(/来源不匹配|顺逆分支/u);
  });

  it("retains unknown-direction narratives and their opposite exact-segment statements separately", () => {
    const result = buildReadingSynthesis({ ...unknown, life: unknownLife, annual: unknownAnnual, timeline: unknownTimeline });
    const sections = result.sections.filter((item) => item.id.startsWith("stage-"));
    expect(sections.map((item) => item.id)).toEqual(["stage-forward", "stage-backward"]);
    for (const branch of unknownTimeline.branches) {
      const section = sections.find((item) => item.id === `stage-${branch.id}`)!;
      for (const statement of branch.narrative.statements) expectOriginalStatementRetained(section, statement);
      expect(section.sourceSubjects).toContain(readingTimelineNarrativeSubjectId(unknownTimeline, branch));
      expect(section.conditions).toEqual(expect.arrayContaining(branch.narrative.conditions));
    }
    expect(sections[0]!.answer).not.toBe(sections[1]!.answer);
  });

  it("uses a whole-trajectory adoption verbatim and retains the calculated trajectory only for comparison", async () => {
    const branch = timeline.branches[0]!, choice = { id: readingTimelineNarrativeSubjectId(timeline, branch), label: "十年走势", originalConclusion: readingTimelineNarrativeText(timeline, branch), sourceVersions: [timeline.version, ...timeline.sourceVersions] };
    const personal = await personalFor([choice]), result = buildReadingSynthesis({ ...b, life, annual, timeline, personal });
    const section = result.sections.find((item) => item.id === `personal-${choice.id}`)!;
    expect(section.paragraphs).toEqual([personal.entries[0]!.personalText]);
    expect(section.answer).toBeUndefined(); expect(section.evidence.join()).toContain(choice.originalConclusion);
    expect(result.sections.some((item) => item.id === "stage-locked")).toBe(false);
    for (const state of ["proposal", "retained", "needs_more"] as const) {
      const unchanged = buildReadingSynthesis({ ...b, life, annual, timeline, personal: await personalFor([choice], state) });
      expectOriginalStatementRetained(unchanged.sections.find((item) => item.id === "stage-locked")!, branch.narrative.statements[0]!);
      expect(unchanged.personalRefs).toEqual([]);
    }
    const stale = await personalFor([{ ...choice, sourceVersions: ["hakimi.local-reading-timeline/0.1.0"] }]);
    expect(buildReadingSynthesis({ ...b, life, annual, timeline, personal: stale }).personalRefs).toEqual([]);
  });

  it("downgrades only the narrative statements anchored to an adopted year or stage", async () => {
    const yearChoice = buildReadingFeedbackChoices(b.assessment, annual, []).find((item) => item.id === "annual-2028")!;
    const stage = timeline.stages.find((item) => item.yearLinks.some((year) => year.year === 2028))!;
    const stageChoice = { id: `timeline-stage-${stage.id}`, label: stage.headline,
      originalConclusion: `${readingTimelineStageText(stage)}\n阶段解读规则：${timeline.version}\n来源解读版本：${timeline.sourceVersions.join("、")}`,
      sourceVersions: [timeline.version, ...timeline.sourceVersions] };
    for (const choice of [yearChoice, stageChoice]) {
      const personal = await personalFor([choice]), result = buildReadingSynthesis({ ...b, life, annual, timeline, personal });
      const section = result.sections.find((item) => item.id === "stage-locked")!;
      const affected = timeline.branches[0]!.narrative.statements.filter((statement) => choice === yearChoice
        ? timeline.stages.some((item) => statement.stageIds.includes(item.id) && item.yearLinks.some((year) => year.year === 2028))
          || timeline.turningPoints.some((point) => statement.turningPointIds.includes(point.id) && (point.before.year === 2028 || point.after.year === 2028))
        : statement.stageIds.includes(stage.id) || timeline.turningPoints.some((point) => statement.turningPointIds.includes(point.id)
          && stage.yearLinks.some((link) => JSON.stringify(link) === JSON.stringify(point.before) || JSON.stringify(link) === JSON.stringify(point.after))));
      const unaffected = timeline.branches[0]!.narrative.statements.filter((statement) => !affected.includes(statement));
      expect(affected.length).toBeGreaterThan(0); expect(unaffected.length).toBeGreaterThan(0);
      for (const statement of affected) {
        expect(section.answer).not.toContain(statement.text);
        expect(section.paragraphs.join()).not.toContain(statement.text);
        expect(result.evidence.join()).toContain(statement.text);
      }
      for (const statement of unaffected) expectOriginalStatementRetained(section, statement);
      const projected = projectStageAnswers(timeline, "locked", unaffected);
      for (const projection of projected) expect(section.answer).toContain(projection.text);
      expect(result.sections.find((item) => item.id === `personal-${choice.id}`)!.paragraphs).toEqual([personal.entries[0]!.personalText]);
    }
  });

  it("does not turn a current-decade personal reading into a replacement for independent annual judgments", async () => {
    const current = life.decades.find((item) => item.id === life.branches[0]!.currentDecadeId)!;
    const choice = { id: `decade-${current.id}`, label: current.headline, originalConclusion: `${current.headline}\n${current.branchLabel} · ${current.startInstant} 至 ${current.endExclusiveInstant}\n${current.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(current.judgment)}\n岁运解读规则：${life.version}`, sourceVersions: [life.version] };
    const personal = await personalFor([choice]), result = buildReadingSynthesis({ ...b, life, annual, timeline, personal });
    expect(result.sections.find((item) => item.id === `personal-${choice.id}`)!.paragraphs).toEqual([personal.entries[0]!.personalText]);
    const section = result.sections.find((item) => item.id === "stage-locked")!;
    expect(section.answer).not.toContain(current.career.text);
    for (const statement of timeline.branches[0]!.narrative.statements) expectOriginalStatementRetained(section, statement);
  });

  it("honors an exact adopted stage story without replacing independent annual judgments", async () => {
    const story = buildLifeStageStory({ ...b, life }), branch = story.branches[0]!;
    const stage = branch.stages.find((item) => item.decadeId === branch.currentDecadeId)!;
    const choice = { id: lifeStageStorySubjectId(story, stage), label: stage.headline,
      originalConclusion: lifeStageStoryFeedbackText(story, branch, stage), sourceVersions: lifeStageStoryFeedbackVersions(story) };
    const personal = await personalFor([choice]), result = buildReadingSynthesis({ ...b, life, annual, timeline, personal });
    expect(result.sections.find((item) => item.id === `personal-${choice.id}`)!.paragraphs).toEqual([personal.entries[0]!.personalText]);
    const years = result.sections.find((item) => item.id === "stage-locked")!;
    for (const paragraph of stage.paragraphs) expect(years.answer).not.toContain(paragraph);
    for (const statement of timeline.branches[0]!.narrative.statements) expectOriginalStatementRetained(years, statement);
    const stale = await personalFor([{ ...choice, originalConclusion: `${choice.originalConclusion}\n旧版附句` }]);
    const original = buildReadingSynthesis({ ...b, life, annual, timeline, personal: stale });
    expect(original.sections.find((item) => item.id === "stage-locked")!.answer).toContain(stage.paragraphs[0]!);
    expect(original.conditions.join()).toContain("与本次原文或版本不同");
  });

  it("keeps adopted annual and life overviews separate and never reintroduces their automatic summaries", async () => {
    const choices = [
      { id: "annual-overview", label: "年份总览", originalConclusion: `${summarizeAnnualJudgmentCaptions(annual)}\n${annual.summary}\n年份总览：${READING_YEAR_SUMMARY_VERSION}\n年度规则：${annual.version}`, sourceVersions: [annual.version, READING_YEAR_SUMMARY_VERSION] },
      { id: "life-overview", label: "大运总览", originalConclusion: `${life.referenceLabel}\n${life.summary}\n岁运解读规则：${life.version}`, sourceVersions: [life.version] }
    ];
    const personal = await personalFor(choices), result = buildReadingSynthesis({ ...b, life, annual, timeline, personal });
    expect(result.sections.some((section) => section.id.startsWith("stage-"))).toBe(false);
    for (const entry of personal.entries) expect(result.sections.find((section) => section.id === `personal-${entry.subjectId}`)!.paragraphs).toEqual([entry.personalText]);
    for (const statement of timeline.branches[0]!.narrative.statements) expect(result.evidence.join()).toContain(statement.text);
  });
});
