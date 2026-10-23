import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildReadingFeedbackReview, buildStructuredReadingFeedback, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import { describeLifeStageStory, lifeStageStoryEntries, lifeStageStoryFeedbackText, lifeStageStoryFeedbackVersions,
  lifeStageStorySubjectId, lifeStageStoryTransitionSubjectId, lifeStageStoryTransitionText, lifeStageStoryPersonalSources } from "./local-life-stage-story-record";

async function fixture() {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic stage record", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), life = await buildLocalLifeOutlook(revision, assessment, 2028);
  return { revision, assessment, life };
}
let input: Awaited<ReturnType<typeof fixture>>, story: ReturnType<typeof buildLifeStageStory>;
beforeAll(async () => { input = await fixture(); story = buildLifeStageStory(input); });
function note(body: string, minute: number, tags: string[]): ResearchNoteRecord {
  const instant = `2026-10-16T00:0${minute}:00Z`;
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId, anchor: { kind: "revision", revisionId: input.revision.id }, bodyFormat: "markdown", body, tags, sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: instant, updatedAt: instant };
}
async function personalFor(choice: ReadingFeedbackChoice, state: "revised" | "retained" = "revised") {
  const root = note(buildStructuredReadingFeedback(input.assessment, { subjectId: choice.id, subjectLabel: choice.label, originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions,
    rating: "partial", aspect: "合成阶段对照", occurredAt: "2028", actualSituation: "合成记录，不代表真实经历。", requestedRevision: "按本人经历保留个人描述。" }), 1, ["解读反馈"]);
  const review = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(input.assessment, choice.sourceVersions), {
    state, notes: "本人明确复核的合成测试", revisedConclusion: state === "revised" ? "个人原文：这一阶段与我的实际经历另有区别，不改命盘计算。" : "", occurredAt: "2028"
  }), 2, ["解读反馈", "解读反馈复核"]);
  return buildLocalPersonalReading({ revision: input.revision, assessment: input.assessment, choices: [choice], records: [root, review] });
}
function oldChoice(decadeId: string): ReadingFeedbackChoice {
  const decade = input.life.decades.find((item) => item.id === decadeId)!;
  return { id: `decade-${decade.id}`, label: decade.headline, sourceVersions: [input.life.version],
    originalConclusion: `${decade.headline}\n${decade.branchLabel} · ${decade.startInstant} 至 ${decade.endExclusiveInstant}\n${decade.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(decade.judgment)}\n岁运解读规则：${input.life.version}` };
}
describe("life stage story exact record and adoption provenance", () => {
  it("binds every real stage and same-branch transition without duplicating calculation objects", () => {
    const before = JSON.stringify(input), entries = lifeStageStoryEntries(story), subjects: string[] = [];
    const body = describeLifeStageStory(story, input).join("\n");
    expect(story.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
    expect(entries.filter((entry) => entry.kind === "stage")).toHaveLength(input.life.decades.length);
    expect(lifeStageStoryFeedbackVersions(story)).toEqual([story.version, input.life.version]);
    for (const entry of entries) {
      const item = entry.kind === "stage" ? entry.stage : entry.transition;
      const id = entry.kind === "stage" ? lifeStageStorySubjectId(story, entry.stage) : lifeStageStoryTransitionSubjectId(story, entry.transition);
      const text = entry.kind === "stage" ? lifeStageStoryFeedbackText(story, entry.branch, entry.stage) : lifeStageStoryTransitionText(story, entry.transition);
      subjects.push(id); expect(id.length).toBeLessThanOrEqual(500); expect(text.length).toBeLessThanOrEqual(30_000);
      for (const paragraph of item.paragraphs) { expect(text).toContain(paragraph); expect(body).toContain(paragraph); }
      expect(text).toContain(JSON.stringify(story.sourceVersions)); expect(text).toContain(JSON.stringify(story.sourceBinding));
      expect(text).toContain(JSON.stringify(item.basisRefs));
      if (entry.kind === "stage") {
        expect(text).toContain(JSON.stringify(entry.stage.nodeRef)); expect(text).toContain(entry.stage.startInstant); expect(text).toContain(entry.stage.endExclusiveInstant);
      } else {
        expect(entry.branch.stages.some((stage) => stage.decadeId === entry.transition.fromDecadeId)).toBe(true);
        expect(entry.branch.stages.some((stage) => stage.decadeId === entry.transition.toDecadeId)).toBe(true);
        expect(text).toContain(JSON.stringify([entry.transition.fromNodeRef, entry.transition.toNodeRef]));
        expect(text).toContain(entry.transition.atInstant); expect(text).toContain(JSON.stringify(entry.transition.changes));
      }
    }
    expect(new Set(subjects).size).toBe(subjects.length); expect(JSON.stringify(input)).toBe(before);
  });
  it("rejects changed prose, bounds, missing stages and cross-branch transition references at save", () => {
    const changes = [
      (copy: typeof story) => { copy.branches[0]!.stages[0]!.paragraphs[0] += "未绑定断语"; },
      (copy: typeof story) => { copy.branches[0]!.stages[0]!.startInstant = "2028-01-01T00:00:00Z"; },
      (copy: typeof story) => { copy.branches[0]!.stages.pop(); },
      (copy: typeof story) => { copy.branches[0]!.transitions[0]!.toNodeRef = copy.branches[1]!.stages[1]!.nodeRef; },
      (copy: typeof story) => { copy.sourceVersions = [copy.version]; }
    ];
    for (const change of changes) { const copy = structuredClone(story); change(copy); expect(() => describeLifeStageStory(copy, input)).toThrow("不一致"); }
    expect(() => describeLifeStageStory(story, { ...input, revision: { ...input.revision, id: crypto.randomUUID() } })).toThrow();
  });
  it("honors either original endpoint adoption only within its branch and rejects stale originals", async () => {
    const branch = story.branches[0]!, transition = branch.transitions[0]!;
    for (const id of [transition.fromDecadeId, transition.toDecadeId]) {
      const choice = oldChoice(id), personal = await personalFor(choice);
      expect(lifeStageStoryPersonalSources(story, transition, personal, input.life).map((entry) => entry.subjectId)).toEqual([choice.id]);
      expect(lifeStageStoryPersonalSources(story, story.branches[1]!.transitions[0]!, personal, input.life)).toEqual([]);
      const changed = structuredClone(personal); changed.entries[0]!.originalConclusion += "x";
      expect(lifeStageStoryPersonalSources(story, transition, changed, input.life)).toEqual([]);
      expect(() => lifeStageStoryPersonalSources(story, transition, personal)).toThrow("需要原大运正文");
      expect(describeLifeStageStory(story, input, personal).join("\n")).toContain(personal.entries[0]!.personalText!);
      expect(lifeStageStoryPersonalSources(story, transition, await personalFor(choice, "retained"), input.life)).toEqual([]);
    }
  });
  it("binds new stage adoption and both adjacent transition sources without transferring it to a different stage", async () => {
    const branch = story.branches[0]!, transition = branch.transitions[0]!, stage = branch.stages.find((value) => value.decadeId === transition.toDecadeId)!;
    const choice = { id: lifeStageStorySubjectId(story, stage), label: stage.headline, originalConclusion: lifeStageStoryFeedbackText(story, branch, stage), sourceVersions: lifeStageStoryFeedbackVersions(story) };
    const personal = await personalFor(choice);
    expect(lifeStageStoryPersonalSources(story, stage, personal, input.life).map((entry) => entry.subjectId)).toEqual([choice.id]);
    expect(lifeStageStoryPersonalSources(story, transition, personal, input.life).map((entry) => entry.subjectId)).toEqual([choice.id]);
    expect(lifeStageStoryPersonalSources(story, branch.stages[0]!, personal, input.life)).toEqual([]);
    const changed = structuredClone(personal); changed.entries[0]!.readingVersions = [input.life.version];
    expect(lifeStageStoryPersonalSources(story, transition, changed, input.life)).toEqual([]);
  });
  it("retains whole-life and transition personal originals with exact versions while keeping all automatic source text", async () => {
    const transition = story.branches[0]!.transitions[0]!;
    const choices = [
      { id: "life-overview", label: "大运总览", sourceVersions: [input.life.version], originalConclusion: `${input.life.referenceLabel}\n${input.life.summary}\n岁运解读规则：${input.life.version}` },
      { id: lifeStageStoryTransitionSubjectId(story, transition), label: transition.headline, sourceVersions: lifeStageStoryFeedbackVersions(story), originalConclusion: lifeStageStoryTransitionText(story, transition) }
    ];
    for (const choice of choices) {
      const personal = await personalFor(choice), body = describeLifeStageStory(story, input, personal).join("\n");
      expect(lifeStageStoryPersonalSources(story, transition, personal, input.life).map((entry) => entry.subjectId)).toEqual([choice.id]);
      expect(body).toContain(personal.entries[0]!.personalText!);
      for (const paragraph of transition.paragraphs) expect(body).toContain(paragraph);
      const wrongSource = structuredClone(personal); wrongSource.sourceBinding.revisionId = crypto.randomUUID();
      expect(lifeStageStoryPersonalSources(story, transition, wrongSource, input.life)).toEqual([]);
    }
  });
  it("adds one story section to a full snapshot while preserving the existing life object and exact original feedback text", () => {
    const before = JSON.stringify(input.life), original = oldChoice(input.life.decades[0]!.id);
    const body = buildLocalReadingSnapshot(input.assessment, null, { sourceRevision: input.revision, life: input.life, lifeStageStory: story });
    expect(body.split("## 人生阶段主线与交运变化")).toHaveLength(2);
    for (const decade of input.life.decades) for (const line of [...decade.paragraphs, decade.career.text, decade.wealth.text, decade.relationship.text]) expect(body).toContain(line);
    for (const branch of story.branches) for (const stage of branch.stages) for (const paragraph of stage.paragraphs) expect(body).toContain(paragraph);
    expect(oldChoice(input.life.decades[0]!.id)).toEqual(original); expect(JSON.stringify(input.life)).toBe(before);
    expect(() => buildLocalReadingSnapshot(input.assessment, null, { lifeStageStory: story })).toThrow("缺少原命盘或大运来源");
  });
  it("keeps exact stage and transition feedback usable after reopening at a different instant in the same year", async () => {
    const life = await buildLocalLifeOutlook(input.revision, input.assessment, 2028, { atInstant: "2028-07-02T04:00:00.000Z" });
    const reopened = buildLifeStageStory({ ...input, life });
    expect(reopened.referenceInstant).not.toBe(story.referenceInstant);
    const branch = story.branches[0]!, stage = branch.stages[0]!, transition = branch.transitions[0]!;
    const nextBranch = reopened.branches.find((item) => item.id === branch.id)!;
    const nextStage = nextBranch.stages.find((item) => item.decadeId === stage.decadeId)!;
    const nextTransition = nextBranch.transitions.find((item) => item.id === transition.id)!;
    const stageText = lifeStageStoryFeedbackText(story, branch, stage), transitionText = lifeStageStoryTransitionText(story, transition);
    expect(lifeStageStoryFeedbackText(reopened, nextBranch, nextStage)).toBe(stageText);
    expect(lifeStageStoryTransitionText(reopened, nextTransition)).toBe(transitionText);
    expect(stageText).not.toContain("定位瞬时："); expect(transitionText).not.toContain("定位瞬时：");
    for (const choice of [
      { id: lifeStageStorySubjectId(story, stage), label: stage.headline, originalConclusion: stageText, sourceVersions: lifeStageStoryFeedbackVersions(story) },
      { id: lifeStageStoryTransitionSubjectId(story, transition), label: transition.headline, originalConclusion: transitionText, sourceVersions: lifeStageStoryFeedbackVersions(story) }
    ]) {
      const personal = await personalFor(choice);
      expect(lifeStageStoryPersonalSources(reopened, nextTransition, personal, life).map((entry) => entry.subjectId)).toEqual([choice.id]);
    }
    expect(describeLifeStageStory(reopened, { ...input, life }).join("\n")).toContain(`定位瞬时：${life.referenceInstant}`);
  });
});
