import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { researchNoteRecordSchema, storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";
import { MONTHLY_DOMAIN_PROSE_VERSION } from "./monthly-domain-prose";
import { buildMonthlyDomainReadings, MONTHLY_DOMAIN_READING_VERSION, type MonthlyDomainReadingInput } from "./local-monthly-domain-reading";
import * as prose from "./monthly-domain-prose";
import { ADULT_LIFE_SITUATIONS_VERSION } from "./adult-life-situations";
import { buildReadingContextRecord, resolveReadingContext, READING_CONTEXT_FORMAT, type ReadingContextWork } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { describeMonthlyDomainReadings, monthlyDomainFeedbackText } from "./local-monthly-domain-record";

async function revisionFor(date: string, sex: "male" | "unspecified"): Promise<RevisionRecord> {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic monthly domains", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, withDayBoundary("zi_start_23"));
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
}
let a: MonthlyDomainReadingInput, b: MonthlyDomainReadingInput, unknown: MonthlyDomainReadingInput;
let birthYear: MonthlyDomainReadingInput, firstLuck: MonthlyDomainReadingInput, beforeBirth: MonthlyDomainReadingInput;
beforeAll(async () => {
  const [ar, br, ur] = await Promise.all([revisionFor("1995-08-18", "male"), revisionFor("1995-05-18", "male"), revisionFor("1995-08-18", "unspecified")]);
  const input = async (revision: RevisionRecord, year: number): Promise<MonthlyDomainReadingInput> => {
    const assessment = buildBaziPreliminaryAssessment(revision);
    return { revision, assessment, monthly: await buildLocalMonthlyOutlook(revision, assessment, year) };
  };
  [a, b, unknown, birthYear, firstLuck, beforeBirth] = await Promise.all([input(ar, 2028), input(br, 2028), input(ur, 2028), input(ar, 1995), input(ar, 1998), input(ar, 1990)]);
}, 60_000);
afterEach(() => vi.restoreAllMocks());
async function background(source: MonthlyDomainReadingInput, work: ReadingContextWork, fromYear = source.monthly.year, toYear = fromYear, notes = "合成自述，不用来推断身份") {
  const record = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: source.revision.caseId,
    anchor: { kind: "revision", revisionId: source.revision.id }, bodyFormat: "markdown",
    body: await buildReadingContextRecord(source.revision, null, { work, relationship: "unspecified", fromYear, toYear, notes }),
    tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" });
  const resolved = await resolveReadingContext({ revision: source.revision, records: [record] });
  return buildContextualReadingBundle({ revision: source.revision, assessment: source.assessment, comprehensive: null,
    annualDomains: null, context: resolved.latest, referenceYear: source.monthly.year })!;
}

describe("monthly domain readings from exact upstream branches", () => {
  it("keeps omitted and null context identical and records the shared prose version", () => {
    const ordinary = buildMonthlyDomainReadings(b);
    expect(ordinary).toEqual(buildMonthlyDomainReadings({ ...b, contextual: null }));
    expect(ordinary.contextRef).toBeNull();
    expect(ordinary.sourceVersions).toContain(ADULT_LIFE_SITUATIONS_VERSION);
  });
  it("passes a real confirmed retired identity to every adult segment including next-calendar-year Xiaohan, with exact feedback and record binding", async () => {
    const contextual = await background(b, "retired"), source = { ...b, contextual }, before = JSON.stringify(source);
    const calls = vi.spyOn(prose, "buildMonthlyDomainProse");
    const result = buildMonthlyDomainReadings(source), ref = contextual.contextSource.reference;
    expect(calls.mock.calls.length).toBeGreaterThanOrEqual(12);
    expect(calls.mock.calls.every(([input]) => input.appliedWork === "retired" && input.age.stage === "adult")).toBe(true);
    expect(calls.mock.calls.at(-1)![0].month.ganZhi).toBe(b.monthly.months.at(-1)!.ganZhi);
    expect(new Date(b.monthly.months.at(-1)!.startInstant).getUTCFullYear()).toBe(b.monthly.year + 1);
    expect(result.contextRef).toEqual(ref);
    expect(result.sourceVersions).toEqual(expect.arrayContaining([contextual.version, READING_CONTEXT_FORMAT,
      `context-record/${ref.noteId}/${ref.editVersion}/${ref.bodySha256}`]));
    const month = result.months[0]!, branch = month.branches[0]!, segment = branch.segments[0]!;
    expect(monthlyDomainFeedbackText(result, month, branch, segment, segment.domains[0]!)).toContain(JSON.stringify(ref));
    expect(describeMonthlyDomainReadings(result, source).appendix.join("\n")).toContain(JSON.stringify(ref));
    expect(() => describeMonthlyDomainReadings(result, b)).toThrow("原判断不一致");
    const tampered = structuredClone(result); tampered.contextRef!.editVersion++;
    expect(() => describeMonthlyDomainReadings(tampered, source)).toThrow("原判断不一致");
    // The new task conclusion must not replace a verified retired setting.
    for (const [actual] of calls.mock.calls.slice(0, 12)) {
      const withoutTask = structuredClone(actual);
      for (const axis of withoutTask.judgment.axes) delete axis.taskLinks;
      const originalScenes = prose.buildMonthlyDomainProse(withoutTask);
      const projected = prose.buildMonthlyDomainProse(actual);
      expect(projected.map(domain => domain.examples)).toEqual(originalScenes.map(domain => domain.examples));
    }
    expect(JSON.stringify(source)).toBe(before);
  });
  it("does not infer work from notes or apply an expired adult identity or a child's declared adult work", async () => {
    const calls = vi.spyOn(prose, "buildMonthlyDomainProse");
    const expired = buildMonthlyDomainReadings({ ...b, contextual: await background(b, "employed", 2027, 2027, "文字声称正在经营，不参与判断") });
    expect(calls.mock.calls.every(([input]) => input.appliedWork === undefined)).toBe(true);
    expect(expired.months).toEqual(buildMonthlyDomainReadings(b).months);
    calls.mockClear();
    buildMonthlyDomainReadings({ ...birthYear, contextual: await background(birthYear, "employed") });
    expect(calls.mock.calls.length).toBeGreaterThan(0);
    expect(calls.mock.calls.every(([input]) => input.appliedWork === undefined)).toBe(true);
    const first = buildMonthlyDomainReadings({ ...b, contextual: await background(b, "unspecified", 2028, 2028, "自述为退休") });
    const second = buildMonthlyDomainReadings({ ...b, contextual: await background(b, "unspecified", 2028, 2028, "自述为经营") });
    expect(first.months).toEqual(second.months);
  });
  it("rejects mismatched context source, hour scope, version and reference instead of reverting to unknown", async () => {
    const contextual = await background(b, "caregiving");
    const variants = [
      (x: typeof contextual) => { x.sourceBinding.caseId = crypto.randomUUID(); },
      (x: typeof contextual) => { x.contextSource.document.sourceBinding.chartResultHash = "f".repeat(64); },
      (x: typeof contextual) => { x.contextSource.document.sourceBinding.includeHour = false; },
      (x: typeof contextual) => { x.contextSource.reference.editVersion = 0; },
      (x: typeof contextual) => { x.contextSource.reference.bodySha256 = "broken"; },
      (x: typeof contextual) => { (x as { version: string }).version = "old-context/0"; }
    ];
    for (const change of variants) { const bad = structuredClone(contextual); change(bad); expect(() => buildMonthlyDomainReadings({ ...b, contextual: bad })).toThrow("阅读背景"); }
  });
  it("preserves twelve real month nodes, every single-segment caption, versions and input bytes", () => {
    for (const source of [a, b, unknown]) {
      const original = JSON.stringify(source), result = buildMonthlyDomainReadings(source);
      expect(result.version).toBe(MONTHLY_DOMAIN_READING_VERSION);
      expect(result.sourceBinding).toEqual({ revisionId: source.revision.id, chartResultHash: source.revision.manifest.resultHash, includeHour: true });
      expect(result.yearNodeRef).toEqual(source.monthly.yearNodeRef);
      expect(result.months).toHaveLength(12);
      for (const [index, month] of result.months.entries()) {
        const old = source.monthly.months[index]!;
        expect([month.monthId, month.nodeRef, month.startInstant, month.endExclusiveInstant]).toEqual([old.id, old.nodeRef, old.startInstant, old.endExclusiveInstant]);
        for (const branch of month.branches) for (const segment of branch.segments) {
          const originalSegment = old.judgmentSegments.find((item) => item.id === segment.id)!;
          expect([segment.branchId, segment.startInstant, segment.endExclusiveInstant, segment.backgroundRefs]).toEqual([
            originalSegment.branchId, originalSegment.startInstant, originalSegment.endExclusiveInstant, originalSegment.judgment.backgroundRefs]);
          expect(segment.judgmentCaption).toBe(outlookDirectionCaption(originalSegment.judgment, old.headline));
          expect(segment.conditions).toEqual(expect.arrayContaining(originalSegment.judgment.conditions));
          expect(result.sourceVersions).toEqual(expect.arrayContaining([segment.judgmentVersion, segment.policyVersion]));
          expect(segment.domains.map((domain) => domain.id)).toEqual(["career", "wealth", "relationship"]);
          expect(segment.domains.every((domain) => domain.paragraphs.length > 0 && domain.evidence.length > 0)).toBe(true);
        }
      }
      expect(JSON.stringify(source)).toBe(original);
    }
  });

  it("retains exact December handover as two pieces and never merges unknown-direction parallel branches", () => {
    const known = buildMonthlyDomainReadings(a), uncertain = buildMonthlyDomainReadings(unknown);
    const month = known.months.find((item) => item.branches[0]!.segments.length === 2)!;
    expect(month.label).toBe("大雪月");
    const segments = month.branches[0]!.segments;
    expect(segments[0]!.endExclusiveInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(segments[1]!.startInstant).toBe(segments[0]!.endExclusiveInstant);
    expect(segments.map((item) => item.backgroundLabels)).toEqual([["辛巳大运", "戊申流年"], ["庚辰大运", "戊申流年"]]);
    // Sex is part of chart identity; compare the calendar interval across charts,
    // never expect a second revision's node hash to match the first one.
    const parallel = uncertain.months.find((item) => item.startInstant === month.startInstant)!;
    expect(parallel.branches.map((branch) => [branch.id, branch.segments.length])).toEqual([["forward", 1], ["backward", 2]]);
    expect(parallel.branches[0]!.segments[0]!.backgroundLabels).toEqual(["丁亥大运", "戊申流年"]);
    expect(parallel.summary).toContain("顺行、逆行两个条件分支");
    expect(parallel.summary).not.toContain(parallel.branches[0]!.segments[0]!.domains[0]!.headline);
    expect(month.summary).toContain("实际交运时刻分为2段");
    for (const branch of parallel.branches) {
      expect(branch.gaps).toEqual([]);
      expect(branch.segments.every((segment) => segment.branchId === branch.id)).toBe(true);
      const original = unknown.monthly.months.find((item) => item.id === parallel.monthId)!.branches.find((item) => item.id === branch.id)!;
      expect(branch.conditions).toEqual(original.conditions);
    }
  });

  it("retains before-birth months, birth clipping and real year-only pre-luck coverage", () => {
    const before = buildMonthlyDomainReadings(beforeBirth);
    expect(before.months).toHaveLength(12);
    expect(before.months.every((month) => month.status === "before_birth" && month.branches.every((branch) => branch.segments.length === 0))).toBe(true);
    const born = buildMonthlyDomainReadings(birthYear), birth = new Date(birthYear.revision.timeCalibration.utcInstant!).toISOString();
    const birthMonth = born.months.find((month) => Date.parse(month.startInstant) < Date.parse(birth) && Date.parse(month.endExclusiveInstant) > Date.parse(birth))!;
    expect(birthMonth.branches[0]!.segments[0]!.startInstant).toBe(birth);
    expect(birthMonth.branches[0]!.segments[0]!.ageStage).toBe("young_child");
    expect(birthMonth.branches[0]!.gaps[0]).toMatchObject({ startInstant: birthMonth.startInstant, endExclusiveInstant: birth });
    const initial = buildMonthlyDomainReadings(firstLuck), handover = initial.months.find((month) => month.branches[0]!.segments.length === 2)!;
    expect(handover.branches[0]!.segments.map((segment) => segment.backgroundLabels)).toEqual([["戊寅流年"], ["癸未大运", "戊寅流年"]]);
    expect(handover.branches[0]!.segments[1]!.startInstant).toBe("1998-12-20T20:58:00.000Z");
    expect(handover.branches[0]!.gaps).toHaveLength(1);
    expect(handover.branches[0]!.gaps[0]!.endExclusiveInstant).toBe(handover.branches[0]!.segments[1]!.startInstant);
    expect(initial.months[0]!.branches[0]!.segments[0]!.backgroundRefs.map((ref) => ref.nodeType)).toEqual(["year"]);
    expect(initial.months[0]!.branches[0]!.segments[0]!.domains.map((domain) => domain.title).join(" ")).not.toMatch(/事业|收入|婚姻/);
  });

  it("rejects a different revision, hour scope, year, month sequence and incomplete calendar", () => {
    const mutations: ((input: MonthlyDomainReadingInput) => void)[] = [
      (input) => { input.assessment.sourceBinding.includeHour = false; },
      (input) => { input.monthly.chartResultHash = "f".repeat(64); },
      (input) => { input.monthly.year = 2029; },
      (input) => { input.monthly.months[0]!.ganZhi = input.monthly.months[1]!.ganZhi; },
      (input) => { input.monthly.months.pop(); },
      (input) => { input.monthly.months[1]!.startInstant = input.monthly.months[0]!.startInstant; }
    ];
    for (const change of mutations) { const invalid = structuredClone(a); change(invalid); expect(() => buildMonthlyDomainReadings(invalid)).toThrow(); }
  });

  it("rejects missing, cross-actor, forged-effect and changed-wording metadata by replaying the exact monthly axis", () => {
    const mutations = [
      (axis: NonNullable<typeof a.monthly.months[0]>["judgmentSegments"][0]["judgment"]["axes"][0]) => { delete axis.stemActions; },
      (axis: NonNullable<typeof a.monthly.months[0]>["judgmentSegments"][0]["judgment"]["axes"][0]) => { axis.stemActions!.items[0]!.effect = axis.stemActions!.items[0]!.effect === "assists" ? "neutral" : "assists"; },
      (axis: NonNullable<typeof a.monthly.months[0]>["judgmentSegments"][0]["judgment"]["axes"][0]) => { axis.stemActions!.items[0]!.evidenceIndexes = [...axis.stemActions!.items[1]!.evidenceIndexes]; },
      (axis: NonNullable<typeof a.monthly.months[0]>["judgmentSegments"][0]["judgment"]["axes"][0]) => { axis.stemActions!.items[0]!.summaryBasis = !axis.stemActions!.items[0]!.summaryBasis; },
      (axis: NonNullable<typeof a.monthly.months[0]>["judgmentSegments"][0]["judgment"]["axes"][0]) => { axis.evidence[axis.stemActions!.items[0]!.evidenceIndexes[0]!] += " forged"; },
    ];
    for (const mutate of mutations) {
      const invalid = structuredClone(a), axis = invalid.monthly.months[0]!.judgmentSegments[0]!.judgment.axes.find((item) => item.axis === "pattern")!;
      mutate(axis); expect(() => buildMonthlyDomainReadings(invalid)).toThrow(/作用元数据|原结构轴/u);
    }
  });

  it("rejects duplicate or crossed branches, interval changes, omitted pieces and mismatched flattened judgments", () => {
    const mutations: ((input: MonthlyDomainReadingInput) => void)[] = [
      (input) => { input.monthly.months[0]!.branches.push(structuredClone(input.monthly.months[0]!.branches[0]!)); },
      (input) => { input.monthly.months[0]!.branches[1]!.id = "forward"; },
      (input) => {
        const branch = input.monthly.months[0]!.branches[0]!;
        // Upstream deliberately shares its objects with the flat view. Break
        // that alias here to exercise two genuinely inconsistent copies.
        branch.judgmentSegments = structuredClone(branch.judgmentSegments);
        branch.judgmentSegments[0]!.judgment.summary += "altered";
      },
      (input) => {
        const month = input.monthly.months.find((item) => item.branches.some((branch) => branch.judgmentSegments.length === 2))!;
        const branch = month.branches[1]!;
        branch.judgmentSegments.pop(); month.judgmentSegments = month.branches.flatMap((item) => item.judgmentSegments);
      },
      (input) => {
        const month = input.monthly.months[0]!, segment = month.branches[0]!.judgmentSegments[0]!;
        segment.endExclusiveInstant = new Date(Date.parse(segment.endExclusiveInstant) - 1).toISOString();
        segment.judgment.interval.endExclusiveInstant = segment.endExclusiveInstant;
        month.judgmentSegments = month.branches.flatMap((item) => item.judgmentSegments);
      }
    ];
    for (const change of mutations) { const invalid = structuredClone(unknown); change(invalid); expect(() => buildMonthlyDomainReadings(invalid)).toThrow(); }
  });

  it("rejects foreign background identity, wrong rule binding and mixed judgment policies even when all copies agree", () => {
    for (const change of [
      (input: MonthlyDomainReadingInput) => { input.monthly.months[0]!.nodeRef.algorithmId += "-other"; },
      (input: MonthlyDomainReadingInput) => { input.monthly.months[0]!.branches[0]!.segments[0]!.nodeRef.manualDirection = "backward"; },
      (input: MonthlyDomainReadingInput) => {
        const month = input.monthly.months[0]!, segment = month.branches[0]!.judgmentSegments[0]!;
        (segment.judgment as unknown as { policyVersion: string }).policyVersion = "hakimi.outlook-model/9.9.9";
        month.judgmentSegments = month.branches.flatMap((item) => item.judgmentSegments);
      }
    ]) { const invalid = structuredClone(a); change(invalid); expect(() => buildMonthlyDomainReadings(invalid)).toThrow(); }
  });

  it("represents explicit unavailable data without inventing months, and rejects contradictory partial anchors", () => {
    const unavailable = structuredClone(a);
    Object.assign(unavailable.monthly, { status: "unavailable", yearGanZhi: null, yearNodeRef: null, startInstant: null, endExclusiveInstant: null, months: [] });
    const result = buildMonthlyDomainReadings(unavailable);
    expect(result.status).toBe("unavailable");
    expect(result.months).toEqual([]);
    expect(result.sourceVersions).toContain(MONTHLY_DOMAIN_PROSE_VERSION);
    unavailable.monthly.yearNodeRef = a.monthly.yearNodeRef;
    expect(() => buildMonthlyDomainReadings(unavailable)).toThrow(/不可用年度/);
  });
});
