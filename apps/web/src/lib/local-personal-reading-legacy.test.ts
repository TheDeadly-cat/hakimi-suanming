import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualReadingChoicePairs, prepareLegacyAnnualReading, type LegacyAnnualReadingInput, type AnnualReadingChoicePair } from "./legacy-annual-reading-profile";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { assertPersonalReadingLegacyBindings, hasLegacyPersonalAdoption } from "./local-personal-reading-legacy";
import { describePersonalReading } from "./local-personal-reading-record";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { buildAnnualEventReading } from "./local-annual-event-reading";
import { buildAnnualLifeStory } from "./annual-life-story";
import { annualLifeStoryPersonalSources } from "./annual-life-story-record";

let source: LegacyAnnualReadingInput, pair: AnnualReadingChoicePair;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic legacy personal bridge", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-17T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlookRange(revision, assessment, 2032, 2032);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  source = { revision, assessment, annual, annualDomains };
  await prepareLegacyAnnualReading(source);
  pair = buildAnnualReadingChoicePairs(source).pairs.find((item) => item.currentChoice.id.startsWith("annual-event-")
    && !item.currentChoice.id.startsWith("annual-event-composed-") && item.currentChoice.originalConclusion !== item.legacyChoice.originalConclusion)!;
  expect(pair).toBeDefined();
});

const instant = (minute: number) => new Date(Date.UTC(2026, 9, 17, 1, minute)).toISOString();
function note(body: string, minute: number, isReview = false): ResearchNoteRecord {
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: source.revision.caseId,
    anchor: { kind: "revision", revisionId: source.revision.id }, bodyFormat: "markdown", body,
    tags: ["解读反馈", ...(isReview ? ["解读反馈复核"] : [])], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: instant(minute), updatedAt: instant(minute) };
}
function root(choice: ReadingFeedbackChoice, minute = 0) {
  return note(buildStructuredReadingFeedback(source.assessment, { subjectId: choice.id, subjectLabel: choice.label,
    originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial", aspect: "合成兼容核验",
    occurredAt: "2032", actualSituation: "仅为测试，不代表真实事件。", requestedRevision: "我确认的个人文字。" }), minute);
}
async function review(record: ResearchNoteRecord, choice: ReadingFeedbackChoice, state: "revised" | "retained" | "needs_more", minute: number, previous: ResearchNoteRecord | null = null, text = "我确认的个人文字。") {
  return note(await buildReadingFeedbackReview(record, previous, readingFeedbackSource(source.assessment, choice.sourceVersions),
    { state, notes: "合成明确复核", revisedConclusion: state === "revised" ? text : "", occurredAt: "2032" }), minute, true);
}
const read = (records: ResearchNoteRecord[], choices = [pair.currentChoice], legacySource: LegacyAnnualReadingInput | undefined = source) =>
  buildLocalPersonalReading({ revision: source.revision, assessment: source.assessment, choices, records, legacySource });

describe("exact legacy personal reviews attached to the current reading target", () => {
  it("keeps the adopted text and old evidence while the current automatic target changes", async () => {
    const old = root(pair.legacyChoice), action = await review(old, pair.legacyChoice, "revised", 1), records = [old, action];
    const before = JSON.stringify({ source, records }), reading = await read(records), entry = reading.entries[0]!;
    expect(entry.state).toBe("adopted"); expect(entry.personalText).toBe("我确认的个人文字。");
    expect(entry.originalConclusion).toBe(pair.currentChoice.originalConclusion);
    expect(entry.readingVersions).toEqual([...new Set(pair.currentChoice.sourceVersions)]);
    expect(entry.feedback[0]!.source.readingVersions).toEqual(pair.legacyChoice.sourceVersions);
    expect(entry.feedback[0]!.legacyReplay?.originalConclusion).toBe(pair.legacyChoice.originalConclusion);
    expect(hasLegacyPersonalAdoption(entry)).toBe(true);
    const saved = describePersonalReading(reading, source.assessment, source).join("\n");
    expect(saved).toContain("此前已采用的个人修订（旧版本）");
    expect(saved).toContain(pair.legacyChoice.originalConclusion); expect(saved).toContain(pair.currentChoice.originalConclusion);
    expect(JSON.stringify({ source, records })).toBe(before);
    expect(await read([action, old])).toEqual(reading);
  });
  it("restores the distinct pre-upgrade event 0.6 adoption from its real old calculation", async () => {
    const previous = buildAnnualReadingChoicePairs(source, { epochs: ["event-0.6"], families: ["event"] }).pairs.find(item => item.currentChoice.id === pair.currentChoice.id)!;
    expect(previous.legacyChoice.sourceVersions).toContain("hakimi.local-annual-event-reading/0.6.0");
    expect(previous.legacyChoice.sourceVersions).toContain("hakimi.local-outlook-judgment/0.9.0");
    expect(previous.currentChoice.sourceVersions).toContain("hakimi.local-outlook-judgment/0.10.0");
    const old = root(previous.legacyChoice), adopted = await review(old, previous.legacyChoice, "revised", 1, null, "前一版已确认的原话，不等于新算法结论。");
    const reading = await read([old, adopted], [previous.currentChoice]);
    expect(reading.entries[0]!.state).toBe("adopted");
    expect(reading.entries[0]!.personalText).toBe("前一版已确认的原话，不等于新算法结论。");
    expect(reading.entries[0]!.feedback[0]!.legacyReplay!.originalConclusion).toBe(previous.legacyChoice.originalConclusion);
    expect(() => assertPersonalReadingLegacyBindings(reading, source)).not.toThrow();
    const current = root(previous.currentChoice, 2), restored = await review(current, previous.currentChoice, "retained", 3);
    expect((await read([old, adopted, current, restored], [previous.currentChoice])).entries[0]!.state).toBe("retained");
  });
  it("allows a later explicit current restore or needs-more action to stop an older adoption", async () => {
    const old = root(pair.legacyChoice), adopted = await review(old, pair.legacyChoice, "revised", 1);
    const current = root(pair.currentChoice, 2);
    expect((await read([old, adopted, current])).entries[0]!.state).toBe("adopted");
    for (const state of ["retained", "needs_more"] as const) {
      const restore = await review(current, pair.currentChoice, state, 3), entry = (await read([restore, current, old, adopted])).entries[0]!;
      expect(entry.state).toBe(state); expect(entry.personalText).toBeNull();
      expect(entry.effectiveConclusion).toBe(pair.currentChoice.originalConclusion);
    }
  });
  it("does not choose across simultaneous conflicts or an archived latest legacy review", async () => {
    const old = root(pair.legacyChoice), adopted = await review(old, pair.legacyChoice, "revised", 2);
    const current = root(pair.currentChoice, 1), restore = await review(current, pair.currentChoice, "retained", 2);
    expect((await read([old, adopted, current, restore])).entries[0]!.state).toBe("conflict");
    const archived = { ...adopted, lifecycle: "archived" as const };
    expect((await read([old, archived])).entries[0]!.state).toBe("conflict");
    const latest = await review(old, pair.legacyChoice, "needs_more", 4, adopted);
    expect((await read([old, adopted, latest])).entries[0]!.state).toBe("needs_more");
  });
  it("requires actual replay and exact old and current originals, rather than a version allowlist", async () => {
    const old = root(pair.legacyChoice), action = await review(old, pair.legacyChoice, "revised", 1);
    const without = await buildLocalPersonalReading({ revision: source.revision, assessment: source.assessment, choices: [pair.currentChoice], records: [old, action] });
    expect(without.entries).toEqual([]);
    expect((await read([old, action], [{ ...pair.currentChoice, originalConclusion: pair.currentChoice.originalConclusion + "另一个目标" }])).entries).toEqual([]);
    const forgedChoice = { ...pair.legacyChoice, originalConclusion: pair.legacyChoice.originalConclusion + "改过的旧文" };
    const forgedRoot = root(forgedChoice), forgedReview = await review(forgedRoot, forgedChoice, "revised", 1);
    expect((await read([forgedRoot, forgedReview])).entries).toEqual([]);
    await expect(read([old, action], [pair.currentChoice], { ...source, revision: { ...source.revision, caseId: crypto.randomUUID() } })).rejects.toThrow("重放来源");
  });
  it("rejects altered serialized old text, profile or context even when personal text and selected review remain intact", async () => {
    const old = root(pair.legacyChoice), action = await review(old, pair.legacyChoice, "revised", 1), reading = await read([old, action]);
    expect(() => assertPersonalReadingLegacyBindings(reading, source)).not.toThrow();
    expect(() => describePersonalReading(reading, source.assessment)).toThrow("重放资料");
    for (const alter of [
      (copy: typeof reading) => { copy.entries[0]!.feedback[0]!.legacyReplay!.originalConclusion += "伪造"; },
      (copy: typeof reading) => { copy.entries[0]!.feedback[0]!.legacyReplay!.profileVersion += "/unknown"; },
      (copy: typeof reading) => { Object.assign(copy.entries[0]!.feedback[0]!.legacyReplay!.scope, { contextRef: { noteId: crypto.randomUUID() } }); },
      (copy: typeof reading) => { copy.entries[0]!.feedback[0]!.source.readingVersions = [...pair.currentChoice.sourceVersions!]; }
    ]) { const copy = structuredClone(reading); alter(copy); expect(() => describePersonalReading(copy, source.assessment, source)).toThrow(); }
  });
  it("rechecks legacy evidence in an independent annual consumer and rejects a changed segment", async () => {
    const old = root(pair.legacyChoice), action = await review(old, pair.legacyChoice, "revised", 1), reading = await read([old, action]);
    const yearInput = { revision: source.revision, assessment: source.assessment,
      year: source.annual!.years[0]!, domains: source.annualDomains!.years[0]! };
    const current = { ...yearInput, events: buildAnnualEventReading(yearInput) }, story = buildAnnualLifeStory(current);
    const segment = story.branches.flatMap((branch) => branch.segments).find((item) => item.sourceSubjects.includes(pair.currentChoice.id))!;
    expect(segment).toBeDefined();
    expect(annualLifeStoryPersonalSources(story, segment, reading, current).map((item) => item.subjectId)).toContain(pair.currentChoice.id);
    const altered = structuredClone(reading); altered.entries[0]!.feedback[0]!.legacyReplay!.scope.segmentId += "/another";
    expect(() => annualLifeStoryPersonalSources(story, segment, altered, current)).toThrow("精确范围");
  });
});
