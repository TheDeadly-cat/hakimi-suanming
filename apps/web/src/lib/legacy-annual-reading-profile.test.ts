import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { ANNUAL_EVENT_READING_VERSION } from "./local-annual-event-reading";
import { buildAnnualReadingChoicePairs, buildAnnualYearChoicePairs, buildLegacyAnnualReadingChoices,
  prepareLegacyAnnualReading, LEGACY_ANNUAL_READING_PROFILE_VERSION, type LegacyAnnualReadingInput } from "./legacy-annual-reading-profile";

let source: LegacyAnnualReadingInput;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic legacy scope", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-17T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlookRange(revision, assessment, 2028, 2028);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  source = { revision, assessment, annual, annualDomains };
  await prepareLegacyAnnualReading(source);
});

describe("frozen annual event 0.5 / prose 0.9 profile", () => {
  it("replays both directions and exact handover segments without relabelling current prose", () => {
    const before = JSON.stringify(source), replay = buildLegacyAnnualReadingChoices(source, { epochs: ["event-0.5"] }), paired = buildAnnualReadingChoicePairs(source, { epochs: ["event-0.5"] });
    expect(paired.profileVersion).toBe(LEGACY_ANNUAL_READING_PROFILE_VERSION);
    expect(paired.unpaired).toEqual([]);
    const stories = paired.pairs.filter((pair) => pair.scope.family === "story");
    expect(stories).toHaveLength(3);
    expect(stories.map((pair) => pair.scope.branchId)).toEqual(["forward", "backward", "backward"]);
    for (const pair of paired.pairs) {
      const old = replay.choices.find((item) => item.id === pair.legacyChoice.id)!;
      expect(pair.scope).toEqual(old.legacyScope);
      expect(pair.legacyChoice.originalConclusion).toBe(old.originalConclusion);
      expect(pair.legacyChoice.sourceVersions).toEqual(old.sourceVersions);
      if (pair.scope.family === "event") {
        expect(pair.legacyChoice.sourceVersions).toContain("hakimi.local-annual-event-reading/0.5.0");
        expect(pair.legacyChoice.sourceVersions).toContain("hakimi.annual-event-reading-prose/0.9.0");
        expect(pair.currentChoice.sourceVersions).toContain(ANNUAL_EVENT_READING_VERSION);
        expect(pair.currentChoice.originalConclusion).not.toBe(pair.legacyChoice.originalConclusion);
      }
    }
    const reverse = stories.filter((pair) => pair.scope.branchId === "backward");
    expect(reverse[0]!.scope.endExclusiveInstant).toBe(reverse[1]!.scope.startInstant);
    expect(reverse[0]!.scope.backgroundRefs).not.toEqual(reverse[1]!.scope.backgroundRefs);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("single-year consumers rebuild both sides independently and filters do not manufacture missing sources", () => {
    const all = buildAnnualReadingChoicePairs(source, { epochs: ["event-0.5"] });
    const target = all.pairs.find((pair) => pair.scope.family === "event")!;
    const single = buildAnnualYearChoicePairs({ revision: source.revision, assessment: source.assessment,
      year: source.annual!.years[0]!, domains: source.annualDomains!.years[0]! }, { subjectIds: [target.currentChoice.id], epochs: ["event-0.5"] });
    expect(single.pairs).toEqual([target]);
    expect(buildAnnualReadingChoicePairs(source, { families: ["annual-month", "stage-year"] }).pairs).toEqual([]);
    expect(buildLegacyAnnualReadingChoices({ revision: source.revision, assessment: source.assessment }).choices).toEqual([]);
    expect(buildAnnualReadingChoicePairs(source, { subjectIds: ["not-a-current-source"] }).pairs).toEqual([]);
    expect(buildAnnualReadingChoicePairs(source, { families: ["domain"], subjectIds: [target.currentChoice.id] }).pairs).toEqual([]);
  });

  it("rejects foreign revision, hour scope, unsupported dependency version and changed full node identity", () => {
    const version = structuredClone(source); Object.assign(version.assessment, { version: "hakimi.bazi.preliminary-assessment/unknown" });
    expect(() => buildAnnualReadingChoicePairs(version)).toThrow("共享依赖版本");
    const foreign = structuredClone(source); foreign.revision.id = crypto.randomUUID();
    expect(() => buildAnnualReadingChoicePairs(foreign)).toThrow();
    const hour = structuredClone(source); hour.assessment.sourceBinding.includeHour = !hour.assessment.sourceBinding.includeHour;
    expect(() => buildAnnualReadingChoicePairs(hour)).toThrow();
    const node = structuredClone(source); node.annual!.years[0]!.transitNodeRef!.nodeId += "-changed";
    expect(() => buildAnnualReadingChoicePairs(node)).toThrow();
    const interval = structuredClone(source); interval.annualDomains!.years[0]!.branches[0]!.segments[0]!.startInstant = "2028-02-05T00:00:00.000Z";
    expect(() => buildAnnualReadingChoicePairs(interval)).toThrow();
  });

  it("returns independent exact scope objects so a caller cannot poison a later replay", () => {
    const first = buildAnnualReadingChoicePairs(source, { families: ["story"] });
    const baseline = structuredClone(first);
    first.pairs[0]!.scope.sourceBinding.revisionId = crypto.randomUUID();
    first.pairs[0]!.scope.backgroundRefs.length = 0;
    first.pairs[0]!.legacyChoice.originalConclusion = "forged";
    expect(buildAnnualReadingChoicePairs(source, { families: ["story"] })).toEqual(baseline);
  });
});
