import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook, type LocalAnnualYear } from "./local-annual-outlook";
import { buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualEventReading, type BuildAnnualEventReadingInput } from "./local-annual-event-reading";
import { buildReadingContextRecord, resolveReadingContext, type ReadingContextDraft } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { buildAnnualRelationshipSignals, ANNUAL_RELATIONSHIP_SIGNALS_VERSION } from "./annual-relationship-signals";
import { createAnnualEventSignalBuilder } from "./annual-event-signals";
import { OUTLOOK_STEM_ACTIONS_VERSION } from "./local-outlook-judgment";
import { ANNUAL_RELATIONSHIP_TIMING_VERSION } from "./annual-relationship-timing";
import { ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION } from "./annual-relationship-natal-context";

async function revisionFor(date: string, sex: "male" | "unspecified" = "male", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic event reading", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
let xin: RevisionRecord, resource: RevisionRecord, unknown: RevisionRecord;
let a: LocalAnnualOutlook, b: LocalAnnualOutlook, u: LocalAnnualOutlook, child: LocalAnnualOutlook, early: LocalAnnualOutlook, bFirst: LocalAnnualOutlook;
beforeAll(async () => {
  [xin, resource, unknown] = await Promise.all([revisionFor("1995-08-18"), revisionFor("1995-05-18"), revisionFor("1995-08-18", "unspecified")]);
  [a, b, u, child, early, bFirst] = await Promise.all([
    buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 2026), buildLocalAnnualOutlook(resource, buildBaziPreliminaryAssessment(resource), 2026),
    buildLocalAnnualOutlook(unknown, buildBaziPreliminaryAssessment(unknown), 2028), buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 2005),
    buildLocalAnnualOutlook(xin, buildBaziPreliminaryAssessment(xin), 1990),
    buildLocalAnnualOutlook(resource, buildBaziPreliminaryAssessment(resource), 1999)
  ]);
});
const year = (outlook: LocalAnnualOutlook, n: number) => outlook.years.find((item) => item.year === n)!;
function inputFor(revision: RevisionRecord, value: LocalAnnualYear): BuildAnnualEventReadingInput {
  const assessment = buildBaziPreliminaryAssessment(revision);
  return { revision, assessment, year: value, domains: buildAnnualDomainReading({ revision, assessment, year: value }) };
}
async function withContext(input: BuildAnnualEventReadingInput, draft: ReadingContextDraft) {
  const body = await buildReadingContextRecord(input.revision, null, draft);
  const note: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId,
    anchor: { kind: "revision", revisionId: input.revision.id }, bodyFormat: "markdown", body, tags: ["阅读背景"], sourceRefs: [], lifecycle: "active",
    editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" };
  const resolved = await resolveReadingContext({ revision: input.revision, records: [note] });
  const domains = input.domains;
  return { ...input, contextual: buildContextualReadingBundle({ revision: input.revision, assessment: input.assessment, comprehensive: null, context: resolved.latest,
    annualDomains: { version: domains.version, revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash, includeHour: true,
      startYear: domains.year, endYear: domains.year, years: [domains] }, referenceYear: input.year.year })! };
}
const allItems = (input: BuildAnnualEventReadingInput) => buildAnnualEventReading(input).branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.items));

describe("annual event reading keeps original exact periods and interprets concrete objects", () => {
  it("moves the full actual career/resource mechanism into why without losing branch-specific constraints or visible-versus-hidden roles", async () => {
    const metal = await revisionFor("1999-01-09", "male", "02:26");
    const metalAnnual = await buildLocalAnnualOutlook(metal, buildBaziPreliminaryAssessment(metal), 2026);
    const inputs = [inputFor(metal, year(metalAnnual, 2028)), inputFor(xin, year(a, 2031)),
      inputFor(resource, year(b, 2028)), inputFor(unknown, year(u, 2028))];
    const original = structuredClone(inputs);
    for (const input of inputs) {
      const result = buildAnnualEventReading(input);
      for (const branch of result.branches) for (const segment of branch.segments) {
        const source = input.year.judgmentSegments.find((item) => item.id === segment.id && item.branchId === branch.id)!;
        const pattern = source.judgment.axes.find((item) => item.axis === "pattern")!;
        expect(segment.startInstant).toBe(source.startInstant);
        expect(segment.endExclusiveInstant).toBe(source.endExclusiveInstant);
        expect(segment.backgroundRefs).toEqual(source.judgment.backgroundRefs);
        for (const item of segment.items.filter((entry) => entry.domain === "career" || entry.domain === "wealth")) {
          expect(item.summary).not.toContain(pattern.summary);
          expect(item.summary).not.toMatch(/本段的具体作用：|模型边界：|0\.8、1\.0、1\.2/u);
          expect(item.why).toContain(pattern.summary);
          for (const text of [...pattern.rescues, ...pattern.unresolvedConditions]) expect(item.why).toContain(text);
          expect(new Set(item.why).size).toBe(item.why.length);
          expect(item.examples.length).toBeGreaterThan(0);
          expect(item).not.toHaveProperty("reasoning");
        }
      }
    }
    expect(inputs).toEqual(original);
  });

  it("puts complete relationship reasoning in why while keeping A and B life answers distinct", () => {
    const first = buildAnnualEventReading(inputFor(xin, year(a, 2034))), second = buildAnnualEventReading(inputFor(resource, year(b, 2032)));
    const ar = first.branches[0]!.segments[0]!.items.find((item) => item.domain === "relationship")!;
    const br = second.branches[0]!.segments[0]!.items.find((item) => item.domain === "relationship")!;
    expect(ar.summary).toContain("约定能否持续兑现"); expect(br.summary).toContain("表达与回应节奏");
    expect(ar.title).not.toBe(br.title); expect(ar.examples).not.toEqual(br.examples);
    for (const [result, item] of [[first, ar], [second, br]] as const) {
      expect(result.sourceVersions).toContain(ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION);
      expect(result.sourceVersions.length).toBeLessThanOrEqual(20);
      expect(item).not.toHaveProperty("reasoning");
      expect(item.sourceIds).toContain("relationship-foundation-zq-star-palace");
      for (const lens of item.relationshipTiming!.lenses) for (const signal of lens.signals) expect(item.why).toContain(signal.text);
      expect(item.why.join()).toContain("本命日柱");
      expect(item.summary).not.toMatch(/本气|明透|支藏|天干|日支|大运/u);
      expect(new Set(item.why).size).toBe(item.why.length);
    }
  });
  it("adds a separately bound relationship candidate for actual direct wealth without a palace contact and keeps existing work/resource order", () => {
    const input = inputFor(resource, year(b, 2032)), before = structuredClone(input), result = buildAnnualEventReading(input);
    expect(input).toEqual(before);
    const items = result.branches[0]!.segments[0]!.items, relation = items.find((item) => item.domain === "relationship")!;
    expect(items.map((item) => item.domain)).toEqual(["wealth", "career", "relationship"]);
    expect(relation.id).toBe("relationship-shared-arrangements"); expect(relation.priority).toBe("secondary");
    expect(relation.relationshipTiming!.triggered).toBe(true);
    expect(relation.relationshipTiming!.scope).toMatchObject({ year: 2032, branchId: "locked", segmentId: input.year.judgmentSegments[0]!.id, targetRef: input.year.transitNodeRef });
    expect(relation.relationshipTiming!.lenses[0]!.signals.some((signal) => signal.kind === "hidden_to_visible" && signal.stem === "壬")).toBe(true);
    expect(relation.origin.judgmentAxisIds).toEqual([]);
    expect(items.filter((item) => item.domain !== "relationship").every((item) => item.relationshipTiming === undefined)).toBe(true);
    expect(result.sourceVersions).toContain(ANNUAL_RELATIONSHIP_TIMING_VERSION); expect(result.sourceVersions.length).toBeLessThanOrEqual(20);
    expect(relation.evidence.join()).not.toContain(JSON.stringify(relation.relationshipTiming));
  });

  it("keeps indirect-wealth-only years out of new relationship events while retaining actual exposed-star contacts", () => {
    expect(allItems(inputFor(resource, year(b, 2033))).some((item) => item.domain === "relationship")).toBe(false);
    const contact = allItems(inputFor(xin, year(a, 2030))).find((item) => item.domain === "relationship")!;
    expect(contact.relationshipTiming!.lenses[0]!.signals.some((signal) => signal.source === "year" && signal.kind === "star_stem_contact" && signal.relevance === "related_wealth")).toBe(true);
    expect(contact.why.join()).toContain("偏财相关线索"); expect(contact.origin.relationFactIds.some((id) => id.includes("he_gan_5"))).toBe(true);
  });

  it("expands the exact original action and rescue contexts once per segment without conflating B's hidden support", async () => {
    const original = structuredClone(year(b, 2028));
    const signals = createAnnualEventSignalBuilder(resource, buildBaziPreliminaryAssessment(resource))(year(b, 2028), year(b, 2028).judgmentSegments[0]!);
    expect(signals.targetAction.effect).toBe("neutral"); expect(signals.mainQiAction.effect).toBe("assists");
    expect(signals.patternContext.effect).toBe("assists");
    expect(signals.patternContext.scope.targetRef).toEqual(original.transitNodeRef);
    expect(buildAnnualEventReading(inputFor(resource, year(b, 2028))).sourceVersions).toContain(OUTLOOK_STEM_ACTIONS_VERSION);
    signals.patternContext.evidence.push("caller only"); signals.patternContext.scope.targetRef.nodeId = "caller only";
    expect(year(b, 2028)).toEqual(original);
    const metal = await revisionFor("1999-01-09", "male", "02:26"), assessment = buildBaziPreliminaryAssessment(metal), outlook = await buildLocalAnnualOutlook(metal, assessment, 2028);
    const value = year(outlook, 2028), result = createAnnualEventSignalBuilder(metal, assessment)(value, value.judgmentSegments[0]!);
    expect(result.targetAction).toMatchObject({ stem: "戊", tenGod: "正印", effect: "obstructs", summaryBasis: true });
    expect(result.patternContext.effect).toBe("mixed"); expect(result.patternContext.rescues.join()).toContain("乙偏财");
  });

  it("rejects missing current metadata, duplicate or wrong indices, shifted identity and forged effects even if display prose is unchanged", () => {
    const assessment = buildBaziPreliminaryAssessment(resource), build = createAnnualEventSignalBuilder(resource, assessment);
    const changes: ((value: LocalAnnualYear) => void)[] = [
      (value) => { delete value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions; },
      (value) => { const metadata = value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!; metadata.items[1] = structuredClone(metadata.items[0]!); },
      (value) => { const actor = value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!; actor.evidenceIndexes = [actor.evidenceIndexes[0]!, actor.evidenceIndexes[0]!]; },
      (value) => { value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!.blockerIndexes = [999999]; },
      (value) => { value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!.evidenceIndexes = [0.5]; },
      (value) => { value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!.stem = "甲"; },
      (value) => { value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!.tenGod = "正财"; },
      (value) => { value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!.effect = "assists"; },
      (value) => { value.judgmentSegments[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!.evidenceIndexes = [0]; }
    ];
    for (const mutate of changes) { const changed = structuredClone(year(b, 2028)); mutate(changed); expect(() => build(changed, changed.judgmentSegments[0]!)).toThrow(/作用|结构化/); }
    const wrongBranch = structuredClone(year(u, 2028)); wrongBranch.judgmentSegments[0]!.branchId = "backward";
    expect(() => createAnnualEventSignalBuilder(unknown, buildBaziPreliminaryAssessment(unknown))(wrongBranch, wrongBranch.judgmentSegments[0]!)).toThrow();
  });

  it("separates the real forward background clash from the annual combination and both backward segments", () => {
    const value = year(u, 2028), original = structuredClone(value);
    const signals = value.judgmentSegments.map((segment) => ({ segment, values: buildAnnualRelationshipSignals({ revision: unknown, year: value, segment }) }));
    const forward = signals.find((item) => item.segment.branchId === "forward")!;
    expect(forward.values.map((item) => [item.source, item.ganZhi, item.relationType])).toEqual([
      ["year", "戊申", "branch_six_combination"], ["dayun", "丁亥", "branch_six_clash"]
    ]);
    expect(forward.values[0]!.factId).toBe("branch_six_combination|binary|he_zhi_6:巳申|year:申|month:巳");
    expect(forward.values[1]!.factId).toBe("branch_six_clash|binary|chong:巳亥|year:亥|month:巳");
    expect(forward.values[1]!.nodeRef).toEqual(forward.segment.judgment.backgroundRefs[0]);
    for (const item of signals.filter((item) => item.segment.branchId === "backward")) {
      expect(item.values).toHaveLength(1); expect(item.values[0]!.source).toBe("year");
      expect(item.values[0]!.startInstant).toBe(item.segment.startInstant);
      expect(item.values[0]!.endExclusiveInstant).toBe(item.segment.endExclusiveInstant);
    }
    const event = buildAnnualEventReading(inputFor(unknown, value));
    expect(event.sourceVersions).toContain(ANNUAL_RELATIONSHIP_SIGNALS_VERSION);
    const forwardRelation = event.branches[0]!.segments[0]!.items.find((item) => item.domain === "relationship")!;
    expect(forwardRelation.id).toBe("relationship-shared-arrangements");
    expect(forwardRelation.why.join()).toContain("同段大运丁亥");
    expect(forwardRelation.origin.relationFactIds.some((id) => id.startsWith("dayun:") && id.endsWith(forward.values[1]!.factId))).toBe(true);
    expect(forwardRelation.evidence.join()).toContain(JSON.stringify(forward.values[1]!.nodeRef));
    expect(event.branches[1]!.segments.every((segment) => !segment.items.find((item) => item.domain === "relationship")!.why.join().includes("同段大运丁亥"))).toBe(true);
    forward.values[1]!.nodeRef.nodeId = "caller changed result";
    expect(value).toEqual(original);
  });

  it("adds B's background combination only after its real first handover while keeping childhood scope", () => {
    const value = year(bFirst, 1999), event = buildAnnualEventReading(inputFor(resource, value));
    const segments = event.branches[0]!.segments;
    expect(segments).toHaveLength(2); expect(segments[0]!.ageStage).toBe("young_child"); expect(segments[1]!.ageStage).toBe("young_child");
    expect(segments[0]!.endExclusiveInstant).toBe("1999-05-22T16:20:00.000Z");
    expect(segments[1]!.startInstant).toBe(segments[0]!.endExclusiveInstant);
    const before = buildAnnualRelationshipSignals({ revision: resource, year: value, segment: value.judgmentSegments[0]! });
    const after = buildAnnualRelationshipSignals({ revision: resource, year: value, segment: value.judgmentSegments[1]! });
    expect(before.map((item) => [item.source, item.relationType])).toEqual([["year", "branch_six_clash"]]);
    expect(after.map((item) => [item.source, item.relationType])).toEqual([["year", "branch_six_clash"], ["dayun", "branch_six_combination"]]);
    expect(after[1]!.ganZhi).toBe("庚辰");
    const firstRelation = segments[0]!.items.find((item) => item.domain === "relationship")!, secondRelation = segments[1]!.items.find((item) => item.domain === "relationship")!;
    expect(firstRelation.why.join()).not.toContain("同段大运庚辰"); expect(secondRelation.why.join()).toContain("同段大运庚辰");
    expect(secondRelation.summary + secondRelation.examples.join()).not.toMatch(/伴侣|婚|约见对象|同居/);
  });

  it("does not create an annual relationship item from a background-only combination or a target stem-only contact", () => {
    const value = year(bFirst, 2008), signals = buildAnnualRelationshipSignals({ revision: resource, year: value, segment: value.judgmentSegments[0]! });
    expect(signals.map((item) => item.source)).toEqual(["dayun"]);
    expect(allItems(inputFor(resource, value)).some((item) => item.domain === "relationship")).toBe(false);
    const stemOnly = year(a, 2035);
    expect(buildAnnualRelationshipSignals({ revision: xin, year: stemOnly, segment: stemOnly.judgmentSegments[0]! })).toEqual([]);
    expect(allItems(inputFor(xin, stemOnly)).some((item) => item.domain === "relationship")).toBe(false);
  });

  it("rejects mismatched segment, direction, source, missing background and nonintersecting boundaries", () => {
    const value = year(u, 2028), forward = value.judgmentSegments.find((item) => item.branchId === "forward")!;
    const altered = structuredClone(forward); altered.branchId = "backward";
    expect(() => buildAnnualRelationshipSignals({ revision: unknown, year: value, segment: altered })).toThrow(/唯一完整分段/);
    const repeated = structuredClone(value); repeated.judgmentSegments.push(structuredClone(forward));
    expect(() => buildAnnualRelationshipSignals({ revision: unknown, year: repeated, segment: forward })).toThrow(/唯一完整分段/);
    const missing = structuredClone(value), missingSegment = missing.judgmentSegments.find((item) => item.branchId === "forward")!; missingSegment.judgment.backgroundRefs = [];
    expect(() => buildAnnualRelationshipSignals({ revision: unknown, year: missing, segment: missingSegment })).toThrow(/实际覆盖/);
    const wrongSource = structuredClone(unknown); wrongSource.manifest.resultHash = "f".repeat(64);
    expect(() => buildAnnualRelationshipSignals({ revision: wrongSource, year: value, segment: forward })).toThrow(/来源不一致/);
    const late = structuredClone(value); late.dayunSegments.find((item) => item.direction === "forward")!.sourceStartInstant = forward.endExclusiveInstant;
    expect(() => buildAnnualRelationshipSignals({ revision: unknown, year: late, segment: forward })).toThrow(/实际交运交集/);
    const extraRef = structuredClone(value), extraSegment = extraRef.judgmentSegments.find((item) => item.branchId === "forward")!;
    extraSegment.judgment.backgroundRefs.push(structuredClone(extraSegment.judgment.backgroundRefs[0]!));
    expect(() => buildAnnualRelationshipSignals({ revision: unknown, year: extraRef, segment: extraSegment })).toThrow(/多个大运背景/);
  });

  it("A2031 retains the day-branch clash, original judgments and short, separately scoped item identities", () => {
    const input = inputFor(xin, year(a, 2031)), before = structuredClone(input), result = buildAnnualEventReading(input);
    expect(input).toEqual(before);
    expect(result.yearNodeRef).toEqual(input.year.transitNodeRef);
    const segment = result.branches[0]!.segments[0]!, relation = segment.items.find((item) => item.domain === "relationship")!;
    expect(relation.why.join()).toContain("日柱辛巳有地支六冲");
    expect(relation.origin.relationFactIds.length).toBeGreaterThan(0);
    expect(relation.origin.judgmentAxisIds).toEqual([]);
    expect(segment.items.filter((item) => item.priority === "primary")).toHaveLength(1);
    expect(new Set(segment.items.map((item) => item.id)).size).toBe(segment.items.length);
    expect(segment.items.every((item) => item.id.length < 50)).toBe(true);
    expect(segment.backgroundRefs).toEqual(input.year.judgmentSegments[0]!.judgment.backgroundRefs);
    expect(segment.judgmentCaption).toBe(input.domains.branches[0]!.segments[0]!.judgmentCaption);
    segment.items[0]!.why.push("caller edit"); expect(input).toEqual(before);
  });

  it("B2029 preserves the exact handover without treating a new decade as a proved change of work", () => {
    const input = inputFor(resource, year(b, 2029)), result = buildAnnualEventReading(input), segments = result.branches[0]!.segments;
    expect(segments).toHaveLength(2);
    expect(segments[0]!.endExclusiveInstant).toBe("2029-05-22T16:20:00.000Z");
    expect(segments[1]!.startInstant).toBe(segments[0]!.endExclusiveInstant);
    for (const segment of segments) {
      const original = input.year.judgmentSegments.find((item) => item.id === segment.id)!;
      expect(segment.backgroundRefs).toEqual(original.judgment.backgroundRefs);
      expect(segment.backgroundLabels).toEqual(input.year.dayunSegments.filter((item) => segment.backgroundRefs.some((ref) => ref.nodeId === item.nodeRef.nodeId)).map((item) => `${item.ganZhi}大运`));
      expect(segment.items.every((item) => !item.why.join().includes("换运所以"))).toBe(true);
    }
  });

  it("different real target stems distinguish proposal from settlement, and hidden support does not become exposed support", () => {
    const proposal = allItems(inputFor(resource, year(b, 2030))), settlement = allItems(inputFor(resource, year(b, 2032)));
    expect(proposal.find((item) => item.domain === "career")!.id).toBe("career-proposal");
    expect(settlement.find((item) => item.domain === "career")!.id).toBe("career-settlement");
    expect(proposal[0]!.examples).not.toEqual(settlement[0]!.examples);
    const neutral = allItems(inputFor(resource, year(b, 2028))).find((item) => item.domain === "career")!;
    expect(neutral.why.join()).toMatch(/透戊（劫财）.*未单独定向/);
    expect(neutral.why.join()).toMatch(/藏庚（伤官）.*支持/);
    expect(neutral.summary).not.toContain("透干已有支持");
  });

  it("unknown sex preserves forward one segment and backward two, without sharing rescues or role effects", () => {
    const input = inputFor(unknown, year(u, 2028)), result = buildAnnualEventReading(input);
    expect(result.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
    const forward = result.branches[0]!, backward = result.branches[1]!;
    expect(forward.segments).toHaveLength(1); expect(backward.segments).toHaveLength(2);
    expect(backward.segments[1]!.startInstant).toBe("2028-12-20T20:58:00.000Z");
    const fc = forward.segments[0]!.items.find((item) => item.domain === "career")!, bc = backward.segments[0]!.items.find((item) => item.domain === "career")!;
    expect(fc.summary).not.toBe(bc.summary);
    expect(fc.conditions.join()).not.toContain("大运辛巳透辛可克");
    expect(bc.conditions.join()).toContain("大运辛巳透辛可克");
    for (const branch of result.branches) for (const segment of branch.segments) {
      const original = input.year.judgmentSegments.find((item) => item.id === segment.id && item.branchId === branch.id)!;
      expect(segment.backgroundRefs).toEqual(original.judgment.backgroundRefs);
    }
  });

  it("childhood, birth-year and pre-luck periods remain personal-age scoped, with before-birth empty", () => {
    const children = allItems(inputFor(xin, year(child, 2005)));
    expect(children.map((item) => [item.title, item.summary, ...item.examples].join()).join()).not.toMatch(/岗位|回款|婚姻|收入/);
    expect(buildAnnualEventReading(inputFor(xin, year(early, 1990))).branches).toEqual([]);
    const birth = buildAnnualEventReading(inputFor(xin, year(early, 1995)));
    expect(birth.branches[0]!.segments[0]!.personalStartInstant).toBe(new Date(xin.timeCalibration.utcInstant!).toISOString());
    const first = buildAnnualEventReading(inputFor(xin, year(early, 1998))).branches[0]!;
    expect(first.segments).toHaveLength(2); expect(first.segments[0]!.backgroundRefs).toEqual([]);
    expect(first.segments[1]!.startInstant).toBe("1998-12-20T20:58:00.000Z");
    expect(first.gaps.some((gap) => gap.startInstant === first.segments[0]!.startInstant)).toBe(true);
  });

  it("day-stem-only interaction does not create a shared-life relationship event", () => {
    expect(allItems(inputFor(xin, year(a, 2035))).some((item) => item.domain === "relationship")).toBe(false);
  });

  it("confirmed context binds exact ref, year and domain; notes are not parsed, and outside years are not applied", async () => {
    const input = inputFor(xin, year(a, 2031));
    const draft: ReadingContextDraft = { work: "seeking_work", relationship: "single", fromYear: 2031, toYear: 2031, notes: "DO_NOT_INFER: 已发财已婚" };
    const bound = await withContext(input, draft), result = buildAnnualEventReading(bound);
    expect(result.contextRef).toEqual(bound.contextual.contextSource.reference);
    expect(result.sourceVersions).toContain(`context-record/${result.contextRef!.noteId}/1/${result.contextRef!.bodySha256}`);
    expect(result.sourceVersions.length).toBeLessThanOrEqual(20);
    const proseOnly = (value: ReturnType<typeof buildAnnualEventReading>) => value.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.items.map((item) => ({
      title: item.title, summary: item.summary, examples: item.examples, why: item.why, applicability: item.applicability, notApplicableWhen: item.notApplicableWhen
    }))));
    expect(JSON.stringify(proseOnly(result))).not.toContain(draft.notes);
    const otherNotes = await withContext(input, { ...draft, notes: "另一段自述：与上述内容相反；只展示，不能改变情境选择。" });
    expect(proseOnly(buildAnnualEventReading(otherNotes))).toEqual(proseOnly(result));
    expect(result.branches[0]!.segments[0]!.items.every((item) => item.origin.contextSubjectId !== null)).toBe(true);
    const outside = await withContext(input, { ...draft, fromYear: 2026, toYear: 2027 });
    expect(allItems(outside).every((item) => item.origin.contextSubjectId === null)).toBe(true);
    const childBound = await withContext(inputFor(xin, year(child, 2005)), { ...draft, work: "employed", relationship: "married", fromYear: 2005, toYear: 2005 });
    expect(allItems(childBound).every((item) => item.origin.contextSubjectId === null)).toBe(true);
  });

  it("rejects changed domain words, age, versions, source and cross-branch references before creating prose", async () => {
    const original = inputFor(unknown, year(u, 2028));
    for (const mutate of [
      (input: BuildAnnualEventReadingInput) => { input.domains.branches[0]!.segments[0]!.domains[0]!.examples[0] = "forged"; },
      (input: BuildAnnualEventReadingInput) => { input.domains.branches[0]!.segments[0]!.ageStage = "young_child"; },
      (input: BuildAnnualEventReadingInput) => { input.assessment.sourceBinding.chartResultHash = "f".repeat(64); },
      (input: BuildAnnualEventReadingInput) => { input.year.judgmentSegments[0]!.judgment.backgroundRefs = structuredClone(input.year.judgmentSegments[1]!.judgment.backgroundRefs); },
      (input: BuildAnnualEventReadingInput) => { input.year.judgmentSegments.push(structuredClone(input.year.judgmentSegments[0]!)); },
    ]) { const changed = structuredClone(original); mutate(changed); expect(() => buildAnnualEventReading(changed)).toThrow(); }
    const bound = await withContext(original, { work: "employed", relationship: "married", fromYear: 2028, toYear: 2028, notes: "" });
    const changed = structuredClone(bound); changed.contextual.readings[0]!.summary = "forged";
    expect(() => buildAnnualEventReading(changed)).toThrow(/背景适配正文/);
  });
});
