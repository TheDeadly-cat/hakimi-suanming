import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualYear } from "./local-annual-outlook";
import { buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualEventReading, type BuildAnnualEventReadingInput, type LocalAnnualEventReading } from "./local-annual-event-reading";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { ANNUAL_EVENT_COMPOSITION_VERSION, annualEventCompositionSubjectId, composeAnnualEvents } from "./local-annual-event-composition";

let settlement: LocalAnnualEventReading, proposal: LocalAnnualEventReading, unknown: LocalAnnualEventReading, child: LocalAnnualEventReading;
let input: BuildAnnualEventReadingInput;
async function revisionFor(sex: "male" | "unspecified", date = "1995-05-18", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic composition", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
function inputFor(revision: RevisionRecord, year: LocalAnnualYear): BuildAnnualEventReadingInput {
  const assessment = buildBaziPreliminaryAssessment(revision);
  return { revision, assessment, year, domains: buildAnnualDomainReading({ revision, assessment, year }) };
}
beforeAll(async () => {
  const [male, unspecified] = await Promise.all([revisionFor("male"), revisionFor("unspecified")]);
  const [a, b, c] = await Promise.all([buildLocalAnnualOutlook(male, buildBaziPreliminaryAssessment(male), 2028),
    buildLocalAnnualOutlook(unspecified, buildBaziPreliminaryAssessment(unspecified), 2032), buildLocalAnnualOutlook(male, buildBaziPreliminaryAssessment(male), 2012)]);
  input = inputFor(male, a.years.find((year) => year.year === 2032)!);
  settlement = buildAnnualEventReading(input);
  proposal = buildAnnualEventReading(inputFor(male, a.years.find((year) => year.year === 2030)!));
  unknown = buildAnnualEventReading(inputFor(unspecified, b.years[0]!));
  child = buildAnnualEventReading(inputFor(male, c.years[0]!));
});

describe("exact annual settlement composition", () => {
  it("keeps a real resource-moderating wealth year out of the delivery closeout composition", async () => {
    const revision = await revisionFor("male", "1999-01-09", "02:26"), assessment = buildBaziPreliminaryAssessment(revision);
    const annual = await buildLocalAnnualOutlook(revision, assessment, 2026), year = annual.years.find((item) => item.year === 2034)!;
    const reading = buildAnnualEventReading(inputFor(revision, year)), before = structuredClone(reading);
    const result = composeAnnualEvents(reading);
    for (const segment of result.branches.flatMap((branch) => branch.segments)) {
      const original = reading.branches.flatMap((branch) => branch.segments).find((item) => item.id === segment.id)!;
      const workResource = segment.items.filter((item) => item.members[0]!.domain !== "relationship");
      expect(segment.items.map((item) => item.kind)).toEqual(["single", "single", "single"]);
      expect(workResource.flatMap((item) => item.members).map((item) => item.id)).toEqual(["wealth-settlement", "career-settlement"]);
      for (const item of workResource) expect(item.members[0]!.origin.judgmentAxisIds).toContain("pattern:resource-wealth");
      expect(segment.items.flatMap((item) => item.members)).toEqual(original.items);
      const relationship = original.items.filter((item) => item.domain === "relationship");
      expect(relationship).toHaveLength(1);
      expect(segment.items.filter((item) => item.members[0]!.domain === "relationship")).toEqual([
        { kind: "single", id: relationship[0]!.id, members: relationship }
      ]);
    }
    expect(reading).toEqual(before);
  });
  it("composes the real B2032 matter once while retaining every full member and original scope", () => {
    const before = structuredClone(settlement), result = composeAnnualEvents(settlement);
    const original = settlement.branches[0]!.segments[0]!, segment = result.branches[0]!.segments[0]!, group = segment.items[0]!;
    const relationship = original.items.filter((item) => item.domain === "relationship");
    expect(relationship).toHaveLength(1);
    expect(original.items.map((item) => item.id)).toEqual(["wealth-settlement", "career-settlement", relationship[0]!.id]);
    expect(segment.items).toHaveLength(2); expect(group.kind).toBe("settlement");
    expect(segment.items[1]).toEqual({ kind: "single", id: relationship[0]!.id, members: relationship });
    expect(relationship[0]!.relationshipTiming?.triggered).toBe(true);
    if (group.kind === "settlement") expect(group.title).toBe(original.items[1]!.title);
    expect(group.members).toEqual([original.items[1], original.items[0]]);
    expect(group.members.map((member) => member.priority)).toEqual(["secondary", "primary"]);
    expect({ ...segment, items: original.items }).toEqual(original);
    expect(result.sourceBinding).toEqual(before.sourceBinding); expect(result.contextRef).toEqual(before.contextRef);
    expect(result.sourceReadingVersion).toBe(before.version); expect(result.version).toBe(ANNUAL_EVENT_COMPOSITION_VERSION);
    expect(result.sourceVersions).toContain(before.version); expect(result.sourceVersions).toContain(ANNUAL_EVENT_COMPOSITION_VERSION);
    expect(result.summary).not.toContain(original.items[0]!.title);
    group.members[0].evidence.push("caller edit"); expect(settlement).toEqual(before);
  });

  it("leaves different matter types and younger-age settlement readings as complete singles", () => {
    for (const reading of [proposal, child]) {
      const result = composeAnnualEvents(reading);
      result.branches.forEach((branch, bi) => branch.segments.forEach((segment, si) => {
        expect(segment.items.every((item) => item.kind === "single")).toBe(true);
        expect(segment.items.flatMap((item) => item.members)).toEqual(reading.branches[bi]!.segments[si]!.items);
      }));
      expect(result.summary).toBe(reading.summary);
    }
    expect(child.branches[0]!.segments[0]!.items.some((item) => item.id === "career-settlement")).toBe(true);
  });

  it("keeps unknown direction branches separate with each exact original background and interval", () => {
    const result = composeAnnualEvents(unknown);
    expect(result.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
    for (const [bi, branch] of result.branches.entries()) for (const [si, segment] of branch.segments.entries()) {
      const original = unknown.branches[bi]!.segments[si]!;
      const relationship = original.items.filter((item) => item.domain === "relationship");
      expect(relationship).toHaveLength(1);
      expect(segment.items).toHaveLength(2); expect(segment.items[0]!.kind).toBe("settlement");
      expect(segment.items[1]).toEqual({ kind: "single", id: relationship[0]!.id, members: relationship });
      expect(segment.items[0]!.members).toEqual([original.items.find((item) => item.domain === "career"), original.items.find((item) => item.domain === "wealth")]);
      expect({ ...segment, items: original.items }).toEqual(original);
    }
    expect(result.summary).toBe(unknown.summary);
  });

  it("never composes across segments or includes a relationship member", () => {
    // Deliberately split the already-computed pair across two input scopes: no
    // semantic interpolation or cross-segment search may reconstruct a pair.
    const split = structuredClone(settlement), original = split.branches[0]!.segments[0]!;
    split.branches[0]!.segments = [{ ...original, items: [original.items[0]!] }, { ...original, id: "other-scope", items: [original.items[1]!] }];
    expect(composeAnnualEvents(split).branches[0]!.segments.every((segment) => segment.items[0]!.kind === "single")).toBe(true);
    const changed = structuredClone(settlement), member = changed.branches[0]!.segments[0]!.items[1]!;
    member.domain = "relationship"; member.origin.sourceDomainId = "relationship";
    const singles = composeAnnualEvents(changed).branches[0]!.segments[0]!.items;
    expect(singles.map((item) => item.kind)).toEqual(["single", "single", "single"]);
    expect(singles.flatMap((item) => item.members)).toEqual(changed.branches[0]!.segments[0]!.items);
    expect(singles[2]!.members[0]).toEqual(settlement.branches[0]!.segments[0]!.items[2]);
  });

  it("fails closed to singles on mismatched exact rule, context, age, actor facts or duplicate identity", () => {
    for (const mutate of [
      (r: LocalAnnualEventReading) => { r.branches[0]!.segments[0]!.items[0]!.origin.ruleId = "annual-event/wealth/new-collaboration"; },
      (r: LocalAnnualEventReading) => { r.branches[0]!.segments[0]!.items[0]!.origin.contextSubjectId = "contextual-annual-2031-other-wealth"; },
      (r: LocalAnnualEventReading) => { r.branches[0]!.segments[0]!.age.stage = "unknown"; },
      (r: LocalAnnualEventReading) => { r.branches[0]!.segments[0]!.items[0]!.origin.relationFactIds.push("different-actor"); },
      (r: LocalAnnualEventReading) => { r.branches[0]!.segments[0]!.items[0]!.origin.judgmentAxisIds.push("different-path"); },
      (r: LocalAnnualEventReading) => { r.branches[0]!.segments[0]!.items[0]!.applicability.push("different identity"); },
      (r: LocalAnnualEventReading) => { r.branches[0]!.segments[0]!.items.push(structuredClone(r.branches[0]!.segments[0]!.items[0]!)); },
    ]) {
      const changed = structuredClone(settlement); mutate(changed);
      const items = composeAnnualEvents(changed).branches[0]!.segments[0]!.items;
      expect(items.every((item) => item.kind === "single")).toBe(true);
      expect(items.flatMap((item) => item.members)).toEqual(changed.branches[0]!.segments[0]!.items);
    }
  });

  it("accepts actual same-context pair, but retains singles if either exact source subject drifts", async () => {
    const body = await buildReadingContextRecord(input.revision, null, { work: "employed", relationship: "unspecified", fromYear: 2032, toYear: 2032, notes: "Synthetic context only" });
    const note: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId, anchor: { kind: "revision", revisionId: input.revision.id }, bodyFormat: "markdown", body,
      tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" };
    const context = await resolveReadingContext({ revision: input.revision, records: [note] }), d = input.domains;
    const contextual = buildContextualReadingBundle({ revision: input.revision, assessment: input.assessment, comprehensive: null, context: context.latest,
      annualDomains: { version: d.version, revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash, includeHour: true, startYear: 2032, endYear: 2032, years: [d] }, referenceYear: 2032 })!;
    const reading = buildAnnualEventReading({ ...input, contextual });
    expect(composeAnnualEvents(reading).branches[0]!.segments[0]!.items[0]!.kind).toBe("settlement");
    reading.branches[0]!.segments[0]!.items[0]!.origin.contextSubjectId = null;
    expect(composeAnnualEvents(reading).branches[0]!.segments[0]!.items.every((item) => item.kind === "single")).toBe(true);
  });

  it("retains pre-birth gaps and refuses a future model whitelist without losing original content", () => {
    const unavailable = { ...structuredClone(settlement), status: "unavailable" as const };
    expect(composeAnnualEvents(unavailable).branches[0]!.segments[0]!.items.every((item) => item.kind === "single")).toBe(true);
    const future = structuredClone(settlement); Object.assign(future, { version: "hakimi.local-annual-event-reading/9.0.0" });
    expect(composeAnnualEvents(future).branches[0]!.segments[0]!.items.flatMap((item) => item.members)).toEqual(future.branches[0]!.segments[0]!.items);
  });

  it("creates a separate bounded feedback identity instead of reusing a member identity", () => {
    const segment = composeAnnualEvents(settlement).branches[0]!.segments[0]!, group = segment.items[0]!;
    expect(annualEventCompositionSubjectId(2032, segment, group)).toBe(`annual-event-composed-2032-${segment.id}-settlement-closeout`);
    expect(() => annualEventCompositionSubjectId(2032, { id: "x".repeat(500) }, group)).toThrow(/长度/);
  });
});
