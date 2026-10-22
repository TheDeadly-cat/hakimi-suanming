import { beforeAll, describe, expect, it } from "vitest";
import type { ResearchNoteRecord } from "@hakimi/contracts";
import { annualMonthStoryFixture } from "./annual-month-story-test-fixture";
import { annualMonthStoryEntries, annualMonthStoryFeedbackText, annualMonthStoryFeedbackVersions, annualMonthStoryPersonalSources, annualMonthStorySubjectId, describeAnnualMonthStory } from "./local-annual-month-story-record";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { buildReadingFeedbackReview, buildStructuredReadingFeedback, readingFeedbackSource } from "./local-reading-feedback";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { buildAnnualYearChoicePairs, prepareLegacyAnnualReading } from "./legacy-annual-reading-profile";

let data: Awaited<ReturnType<typeof annualMonthStoryFixture>>;
beforeAll(async () => {
  data = await annualMonthStoryFixture("unspecified");
  // Prepare the actual historical backend with the shared fixture, not inside
  // the adoption/source-lookup transaction. No replay output is mocked.
  await prepareLegacyAnnualReading({ ...data.source, annual: data.annual, annualDomains: data.annualDomains });
}, 60_000);
const first = () => annualMonthStoryEntries(data.story)[0]!;
function note(body: string, minute: number): ResearchNoteRecord {
  const instant = new Date(Date.UTC(2026, 9, 16, 1, minute)).toISOString();
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: data.source.revision.caseId,
    anchor: { kind: "revision", revisionId: data.source.revision.id }, bodyFormat: "markdown", body,
    tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: instant, updatedAt: instant };
}
function choiceFor(story = data.story) {
  const { month, branch, period, domain } = first();
  return { id: annualMonthStorySubjectId(story, month, period, domain), label: "合成年月说明",
    originalConclusion: annualMonthStoryFeedbackText(story, month, branch, period, domain), sourceVersions: annualMonthStoryFeedbackVersions(story) };
}
async function adopted(choice = choiceFor()) {
  const root = note(buildStructuredReadingFeedback(data.source.assessment, { subjectId: choice.id, subjectLabel: choice.label,
    originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial", aspect: "合成学习次序", actualSituation: "合成补充。", requestedRevision: "本人采用：先学习，再完成；原始字符\n下一行。" }), 0);
  const review = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(data.source.assessment, choice.sourceVersions), {
    state: "revised", notes: "合成采用", revisedConclusion: "本人采用：先学习，再完成；原始字符\n下一行。", occurredAt: "合成月份" }), 1);
  return { records: [root, review], personal: await buildLocalPersonalReading({ ...data.source, choices: [choice], records: [root, review] }) };
}

describe("year-month story records and personal provenance", () => {
  it("verifies an own legacy month adoption before the independent UI source lookup", async () => {
    const currentChoice = choiceFor(), yearSource = { ...data.source, domains: data.source.annualDomains };
    const pair = buildAnnualYearChoicePairs(yearSource, {
      epochs: ["event-0.5"], families: ["annual-month"], subjectIds: [currentChoice.id]
    }).pairs[0]!;
    expect(pair).toBeDefined();
    const old = pair.legacyChoice, root = note(buildStructuredReadingFeedback(data.source.assessment, {
      subjectId: old.id, subjectLabel: old.label, originalConclusion: old.originalConclusion, sourceVersions: old.sourceVersions,
      rating: "partial", aspect: "旧版月份合成复核", actualSituation: "合成资料", requestedRevision: "保留旧月个人文字。" }), 0);
    const review = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(data.source.assessment, old.sourceVersions),
      { state: "revised", notes: "明确采用", revisedConclusion: "保留旧月个人文字。", occurredAt: "2028" }), 1);
    const legacySource = { ...data.source, annual: data.annual, annualDomains: data.annualDomains };
    const personal = await buildLocalPersonalReading({ ...data.source, choices: [currentChoice], records: [root, review], legacySource });
    expect(personal.entries[0]!.state).toBe("adopted"); expect(personal.entries[0]!.feedback[0]!.legacyReplay).toBeDefined();
    expect(annualMonthStoryPersonalSources(data.story, first().domain, personal, data.source)).toEqual([]);
    const altered = structuredClone(personal); altered.entries[0]!.feedback[0]!.legacyReplay!.originalConclusion += "伪造";
    expect(() => annualMonthStoryPersonalSources(data.story, first().domain, altered, data.source)).toThrow();
    expect(() => annualMonthStoryPersonalSources(data.story, first().domain, personal)).toThrow("来源");
    const otherContext = { ...data.story, contextRef: { noteId: crypto.randomUUID(), editVersion: 1, bodySha256: "a".repeat(64) } };
    expect(() => annualMonthStoryPersonalSources(otherContext, first().domain, personal, data.source)).toThrow("来源");
  });
  it("preserves all twelve months, separate directions and handover metadata without changing its original inputs", () => {
    const before = JSON.stringify(data), body = describeAnnualMonthStory(data.story, data.source).join("\n");
    for (const month of data.story.months) {
      for (const value of [month.monthId, month.label, month.ganZhi, month.startInstant, month.endExclusiveInstant, month.status]) expect(body).toContain(value);
      for (const branch of month.branches) {
        expect(body).toContain(branch.id); for (const condition of branch.conditions) expect(body).toContain(condition);
        for (const period of branch.periods) {
          for (const value of [period.id, period.startInstant, period.endExclusiveInstant, period.personalStartInstant, period.ageLabel,
            period.judgmentCaption, ...period.backgroundLabels, ...period.conditions]) expect(body).toContain(value);
          for (const domain of period.domains) for (const value of [domain.summary, ...domain.examples, JSON.stringify(domain.links), ...domain.evidence, ...domain.conditions]) expect(body).toContain(value);
        }
      }
    }
    expect(body).toContain(JSON.stringify(data.story.nodes)); expect(body).toContain(JSON.stringify(data.story.sourceVersions));
    expect(JSON.stringify(data)).toBe(before);
  });
  it("rejects edited prose, full-node references and dependency versions, and requires original source data in a full snapshot", () => {
    for (const mutate of [
      (story: typeof data.story) => { story.months[0]!.branches[0]!.periods[0]!.domains[0]!.summary += "新增断言"; },
      (story: typeof data.story) => { story.nodes[0]!.ref.revisionId = crypto.randomUUID(); },
      (story: typeof data.story) => { story.sourceVersions.push("synthetic.other/1"); },
    ]) { const edited = structuredClone(data.story); mutate(edited); expect(() => describeAnnualMonthStory(edited, data.source)).toThrow("不一致"); }
    expect(() => buildLocalReadingSnapshot(data.source.assessment, data.annual, { annualMonthStory: data.story })).toThrow("缺少完整年度或月份来源");
  });
  it("uses four direct versions while binding every transitive version in the original conclusion; a dependency change stops prior adoption", async () => {
    const choice = choiceFor(), { records, personal } = await adopted(choice);
    expect(choice.sourceVersions).toHaveLength(4);
    expect(choice.originalConclusion).toContain(JSON.stringify(data.story.sourceVersions));
    expect(personal.entries[0]!.state).toBe("adopted");
    const updated = structuredClone(data.story); updated.sourceVersions = [...updated.sourceVersions, "synthetic.upstream/2.0.0"];
    const updatedChoice = choiceFor(updated);
    expect(updatedChoice.sourceVersions).toEqual(choice.sourceVersions);
    const rejected = await buildLocalPersonalReading({ ...data.source, choices: [updatedChoice], records });
    expect(rejected.entries).toEqual([]); expect(rejected.issues.join()).toContain("原文字节不同");
  });
  it("quotes adopted personal text literally, retains the automatic passage, and never borrows a different revision's adoption", async () => {
    const { personal } = await adopted(), body = describeAnnualMonthStory(data.story, data.source, personal).join("\n");
    expect(body).toContain(personal.entries[0]!.personalText!); expect(body).toContain(first().domain.summary);
    expect(body).toContain(JSON.stringify(personal.entries[0]!.selectedReviewRefs));
    const foreign = structuredClone(personal); foreign.sourceBinding.revisionId = crypto.randomUUID();
    expect(describeAnnualMonthStory(data.story, data.source, foreign).join("\n")).not.toContain(personal.entries[0]!.personalText!);
    const upstream = structuredClone(personal); upstream.entries[0]!.subjectId = `annual-${data.story.year}`;
    expect(annualMonthStoryPersonalSources(data.story, first().domain, upstream)).toHaveLength(1);
    upstream.entries[0]!.issues = ["来源冲突"];
    expect(annualMonthStoryPersonalSources(data.story, first().domain, upstream)).toEqual([]);
  });
});
