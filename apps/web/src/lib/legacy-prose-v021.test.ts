// @vitest-environment node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildLifeStageStory } from "./local-life-stage-story";
import { buildAnnualReadingChoicePairs, buildAnnualYearChoicePairs, buildLegacyAnnualReadingChoices,
  type LegacyAnnualReadingInput, type AnnualReadingChoicePair, type LegacyAnnualChoiceFamily } from "./legacy-annual-reading-profile";
import { buildLocalPersonalReading } from "./local-personal-reading";
import { assertPersonalReadingLegacyBindings, hasLegacyPersonalAdoption } from "./local-personal-reading-legacy";
import { describePersonalReading } from "./local-personal-reading-record";
import { buildReadingFeedbackReview, buildStructuredReadingFeedback, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { buildAnnualEventReading } from "./local-annual-event-reading";
import { buildAnnualLifeStory } from "./annual-life-story";
import { annualLifeStoryPersonalSources } from "./annual-life-story-record";

let source: LegacyAnnualReadingInput;
let pairs: AnnualReadingChoicePair[];
const families: LegacyAnnualChoiceFamily[] = ["event", "composition", "story", "annual-month", "stage-year", "monthly-domain"];
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-05-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic 0.21 prose adoption", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-23T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  const annual = await buildLocalAnnualOutlookRange(revision, assessment, 2032, 2032);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: 2032, endYear: 2032,
    years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) };
  const monthly = await buildLocalMonthlyOutlook(revision, assessment, 2032);
  const monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly });
  const life = await buildLocalLifeOutlook(revision, assessment, 2032, { atInstant: "2032-06-01T00:00:00Z" });
  const lifeStageStory = buildLifeStageStory({ revision, assessment, life });
  source = { revision, assessment, annual, annualDomains, monthly, monthlyDomains, life, lifeStageStory,
    selectedDecadeId: lifeStageStory.branches[0]!.currentDecadeId };
  // This epoch must be independently usable without preparing the old 0.9 backend.
  const replay = buildAnnualReadingChoicePairs(source, { epochs: ["prose-0.21"], families });
  expect(replay.unpaired).toEqual([]);
  pairs = families.map(family => replay.pairs.find(pair => pair.scope.family === family
    && pair.legacyChoice.originalConclusion !== pair.currentChoice.originalConclusion)!);
  expect(pairs.every(Boolean)).toBe(true);
}, 20_000);

function note(body: string, minute: number): ResearchNoteRecord {
  const at = new Date(Date.UTC(2026, 9, 23, 0, minute)).toISOString();
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: source.revision.caseId,
    anchor: { kind: "revision", revisionId: source.revision.id }, bodyFormat: "markdown", body,
    tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: at, updatedAt: at };
}
function feedback(choice: ReadingFeedbackChoice, minute = 0) {
  return note(buildStructuredReadingFeedback(source.assessment, { subjectId: choice.id, subjectLabel: choice.label,
    originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions, rating: "partial", aspect: "合成旧采用保全",
    occurredAt: "2032", actualSituation: "合成边界检查", requestedRevision: "已明确采用的原文" }), minute);
}
async function reviewed(choice: ReadingFeedbackChoice, text: string, state: "revised" | "retained" = "revised", minute = 1) {
  const root = feedback(choice, minute - 1);
  const action = note(await buildReadingFeedbackReview(root, null, readingFeedbackSource(source.assessment, choice.sourceVersions),
    { state, notes: "明确复核", revisedConclusion: state === "revised" ? text : "", occurredAt: "2032" }), minute);
  return [root, action];
}
const personal = (records: ResearchNoteRecord[], choices = pairs.map(pair => pair.currentChoice), legacySource = source) =>
  buildLocalPersonalReading({ revision: source.revision, assessment: source.assessment, choices, records, legacySource });

it("retains every HEAD source byte except the declared import relocation", async () => {
  const manifest = JSON.parse(await readFile(new URL("./legacy-prose-v021/provenance.json", import.meta.url), "utf8"));
  expect(manifest.sourceCommit).toBe("2dfae4be00e51735c0e273e3fc7701867d1b9936");
  expect(manifest.files).toHaveLength(10);
  for (const item of manifest.files) {
    const relocated = await readFile(new URL(`./legacy-prose-v021/${item.name}.ts`, import.meta.url), "utf8");
    const original = relocated.replace(/(from\s+|import\s*)["'](\.[^"']+)["']/g, (_all, prefix: string, spec: string) =>
      `${prefix}"${spec.startsWith("../") ? spec.slice(3) : spec}"`);
    expect(Buffer.byteLength(original)).toBe(item.originalBytes);
    expect(createHash("sha256").update(original).digest("hex")).toBe(item.originalSha256);
  }
});

it("replays six changed choice families using unchanged judgments and authentic old prose versions", () => {
  const before = JSON.stringify(source);
  const legacy = buildLegacyAnnualReadingChoices(source, { epochs: ["prose-0.21"], families });
  for (const pair of pairs) {
    const original = legacy.choices.find(choice => choice.id === pair.legacyChoice.id)!;
    expect(original.originalConclusion).toBe(pair.legacyChoice.originalConclusion);
    expect(original.sourceVersions).toEqual(pair.legacyChoice.sourceVersions);
    expect(original.legacyScope).toEqual(pair.scope);
    expect(pair.scope.sourceBinding.chartResultHash).toBe(source.revision.manifest.resultHash);
    expect(pair.scope.year).toBe(2032);
    expect(pair.legacyChoice.originalConclusion).not.toBe(pair.currentChoice.originalConclusion);
  }
  const event = pairs.find(pair => pair.scope.family === "event")!;
  expect(event.legacyChoice.sourceVersions).toContain("hakimi.annual-event-reading-prose/0.11.0");
  expect(event.currentChoice.sourceVersions).toContain("hakimi.annual-event-reading-prose/0.12.0");
  expect(event.legacyChoice.sourceVersions).toContain("hakimi.local-outlook-judgment/0.10.0");
  const month = pairs.find(pair => pair.scope.family === "monthly-domain")!;
  expect(month.legacyChoice.sourceVersions).toContain("hakimi.monthly-domain-prose/0.4.0");
  expect(month.currentChoice.sourceVersions).toContain("hakimi.monthly-domain-prose/0.5.0");
  expect(JSON.stringify(source)).toBe(before);
});

it("keeps all six adopted old texts exact in the current reading and independently verified saved view", async () => {
  const texts = pairs.map(pair => `0.21 ${pair.scope.family} 已采用原话。\n\n第二段 <literal> 完整保留。`);
  const records = (await Promise.all(pairs.map((pair, index) => reviewed(pair.legacyChoice, texts[index]!)))).flat();
  const before = JSON.stringify(records), reading = await personal(records);
  expect(reading.issues).toEqual([]);
  expect(reading.entries).toHaveLength(6);
  for (const [index, pair] of pairs.entries()) {
    const entry = reading.entries.find(item => item.subjectId === pair.currentChoice.id)!;
    expect(entry.state).toBe("adopted"); expect(entry.personalText).toBe(texts[index]);
    expect(entry.effectiveConclusion).toBe(texts[index]); expect(entry.originalConclusion).toBe(pair.currentChoice.originalConclusion);
    expect(entry.feedback[0]!.legacyReplay!.originalConclusion).toBe(pair.legacyChoice.originalConclusion);
    expect(hasLegacyPersonalAdoption(entry)).toBe(true);
  }
  const saved = describePersonalReading(reading, source.assessment, source).join("\n");
  for (const text of texts) expect(saved).toContain(text);
  expect(saved).toContain("此前已采用的个人修订（旧版本）");
  expect(JSON.stringify(records)).toBe(before);
  const yearInput = { revision: source.revision, assessment: source.assessment, year: source.annual!.years[0]!, domains: source.annualDomains!.years[0]! };
  const story = buildAnnualLifeStory({ ...yearInput, events: buildAnnualEventReading(yearInput) });
  const entries = annualLifeStoryPersonalSources(story, story.branches[0]!.segments[0]!, reading, { ...yearInput, events: buildAnnualEventReading(yearInput) });
  expect(entries.some(entry => entry.subjectId === pairs.find(pair => pair.scope.family === "story")!.currentChoice.id)).toBe(true);
}, 20_000);

it("rejects changed old originals, versions, current targets and foreign exact source instead of trusting the epoch label", async () => {
  const pair = pairs[0]!, records = await reviewed(pair.legacyChoice, "保留原话");
  for (const forged of [
    { ...pair.legacyChoice, originalConclusion: pair.legacyChoice.originalConclusion + "改写旧文" },
    { ...pair.legacyChoice, sourceVersions: [...pair.legacyChoice.sourceVersions!, "fake/1"] },
    { ...pair.legacyChoice, id: pairs[2]!.legacyChoice.id }
  ]) expect((await personal(await reviewed(forged, "不可采用"), [pair.currentChoice])).entries).toEqual([]);
  expect((await personal(records, [{ ...pair.currentChoice, originalConclusion: pair.currentChoice.originalConclusion + "另一个当前目标" }])).entries).toEqual([]);
  await expect(personal(records, [pair.currentChoice], { ...source, revision: { ...source.revision, caseId: crypto.randomUUID() } })).rejects.toThrow();
  const reading = await personal(records, [pair.currentChoice]);
  for (const mutate of [
    (value: typeof reading) => { value.entries[0]!.feedback[0]!.legacyReplay!.scope.branchId = "backward"; },
    (value: typeof reading) => { value.entries[0]!.feedback[0]!.legacyReplay!.scope.startInstant = "2032-03-01T00:00:00Z"; },
    (value: typeof reading) => { value.entries[0]!.feedback[0]!.legacyReplay!.scope.contextRef = { noteId: crypto.randomUUID(), editVersion: 1, bodySha256: "a".repeat(64) }; }
  ]) { const copy = structuredClone(reading); mutate(copy); expect(() => assertPersonalReadingLegacyBindings(copy, source)).toThrow(); }
}, 20_000);

it("honors a later explicit current retained action and rejects stale month source data", async () => {
  const pair = pairs.find(item => item.scope.family === "monthly-domain")!;
  const adopted = await reviewed(pair.legacyChoice, "旧月度采用"), retained = await reviewed(pair.currentChoice, "", "retained", 3);
  const reading = await personal([...adopted, ...retained], [pair.currentChoice]);
  expect(reading.entries[0]!.state).toBe("retained"); expect(reading.entries[0]!.personalText).toBeNull();
  expect(reading.entries[0]!.effectiveConclusion).toBe(pair.currentChoice.originalConclusion);
  const wrong = structuredClone(source); wrong.monthlyDomains!.months[0]!.branches[0]!.segments[0]!.domains[0]!.summary += "伪造";
  expect(() => buildAnnualReadingChoicePairs(wrong, { epochs: ["prose-0.21"], families: ["monthly-domain"] })).toThrow("当前月领域");
  expect(buildAnnualReadingChoicePairs({ revision: source.revision, assessment: source.assessment }, { epochs: ["prose-0.21"], families }).pairs).toEqual([]);
  const yearInput = { revision: source.revision, assessment: source.assessment, year: source.annual!.years[0]!, domains: source.annualDomains!.years[0]! };
  expect(buildAnnualYearChoicePairs(yearInput, { epochs: ["prose-0.21"], families: ["annual-month"] }).pairs).toEqual([]);
}, 20_000);
