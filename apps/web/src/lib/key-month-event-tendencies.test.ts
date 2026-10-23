import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, researchNoteRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualEventReading } from "./local-annual-event-reading";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildAnnualLifeStory } from "./annual-life-story";
import { buildAnnualMonthStory } from "./local-annual-month-story";
import { buildReadingContextRecord, resolveReadingContext, type ReadingContextDraft } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { buildContextualAnnualReadings } from "./local-contextual-reading";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";
import { prepareLegacyAnnualReading, buildLegacyAnnualReadingChoices, type LegacyAnnualReadingInput } from "./legacy-annual-reading-profile";
import { buildKeyMonthEventTendencies, buildKeyMonthReadingChoices, buildKeyMonthPersonalReading, selectKeyMonthEvents,
  type BuildKeyMonthEventTendenciesInput, type KeyMonthEventTendencies } from "./key-month-event-tendencies";

const inputs = new Map<string, BuildKeyMonthEventTendenciesInput>();
async function revisionFor(date: string, time: string, sex: "male" | "female" | "unspecified") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time,
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Existing synthetic month-event fixture", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(),
    revisionNumber: 1, createdAt: "2026-10-20T00:00:00Z" });
}
async function sourceFor(revision: RevisionRecord, yearNumber: number): Promise<BuildKeyMonthEventTendenciesInput> {
  const assessment = buildBaziPreliminaryAssessment(revision);
  const [annual, monthly] = await Promise.all([buildLocalAnnualOutlookRange(revision, assessment, yearNumber, yearNumber),
    buildLocalMonthlyOutlook(revision, assessment, yearNumber)]);
  const year = annual.years[0]!, annualDomains = buildAnnualDomainReading({ revision, assessment, year });
  const annualEvents = buildAnnualEventReading({ revision, assessment, year, domains: annualDomains });
  return { revision, assessment, annual, year, annualDomains, annualEvents, monthly,
    monthlyDomains: buildMonthlyDomainReadings({ revision, assessment, monthly }) };
}
beforeAll(async () => {
  const b = await revisionFor("1995-05-18", "08:26", "male");
  const a = await revisionFor("1995-08-18", "08:26", "unspecified");
  const child = await revisionFor("2019-12-22", "11:23", "female");
  const official = await revisionFor("1971-04-09", "14:26", "male");
  for (const [id, revision, year] of [["B26", b, 2026], ["B27", b, 2027], ["B29", b, 2029], ["B32", b, 2032], ["B33", b, 2033], ["A28", a, 2028],
    ["R3-30", child, 2030], ["R3-37", child, 2037], ["official32", official, 2032]] as const) inputs.set(id, await sourceFor(revision, year));
}, 60000);
const read = (id: string) => buildKeyMonthEventTendencies(inputs.get(id)!);
const events = (reading: KeyMonthEventTendencies) => reading.branches.flatMap(branch => branch.periods.flatMap(period => period.events));
const active = (reading: KeyMonthEventTendencies) => events(reading).filter(item => ["clear", "possible", "weak"].includes(item.level));

it("uses twelve actual month nodes and preserves every branch, handover segment and original input", () => {
  for (const id of ["B29", "A28"]) {
    const input = inputs.get(id)!, before = structuredClone(input), output = buildKeyMonthEventTendencies(input);
    expect(input).toEqual(before);
    for (const branch of output.branches) {
      expect(new Set(branch.periods.map(period => period.monthId)).size).toBe(12);
      expect(branch.keyMonths.length).toBeLessThanOrEqual(3);
      for (const period of branch.periods) {
        const originalMonth = input.monthly.months.find(month => month.id === period.monthId)!;
        const original = originalMonth.judgmentSegments.find(segment => segment.id === period.id && segment.branchId === branch.id)!;
        expect(original).toBeDefined();
        expect([period.startInstant, period.endExclusiveInstant]).toEqual([original.startInstant, original.endExclusiveInstant]);
        expect(period.events).toHaveLength(7);
        for (const item of period.events) {
          expect(item.scope.targetRef).toEqual(originalMonth.nodeRef);
          expect(item.scope.backgroundRefs).toEqual(original.judgment.backgroundRefs);
          expect(item.evidenceIds.every(ref => output.evidence.some(row => row.id === ref))).toBe(true);
        }
      }
      for (const selected of branch.keyMonths) expect(selected.periodIds).toEqual(branch.periods.filter(period => period.monthId === selected.monthId).map(period => period.id));
    }
  }
});
it("selects money months from actual monthly wealth actions, not by copying the annual result twelve times", () => {
  const output = read("B32"), input = inputs.get("B32")!;
  const inflows = active(output).filter(item => item.category === "money_inflow");
  expect(inflows.length).toBeGreaterThan(0); expect(inflows.length).toBeLessThan(12);
  for (const item of inflows) {
    const month = input.monthly.months.find(month => month.id === item.scope.monthId)!;
    const axis = month.judgmentSegments.find(segment => segment.id === item.scope.segmentId)!.judgment.axes.find(axis => axis.axis === "pattern")!;
    const actual = item.supportEvidenceIds.map(id => output.evidence.find(row => row.id === id)!)
      .filter(row => row.kind === "actor").map(row => axis.stemActions!.items[row.actionIndex!]!);
    expect(actual.some(actor => ["正财", "偏财"].includes(actor.tenGod) && ["assists", "mixed"].includes(actor.effect))).toBe(true);
    expect(item.supportEvidenceIds.some(id => output.evidence.find(row => row.id === id)!.origin === "month")).toBe(true);
  }
  const picks = selectKeyMonthEvents(output, { category: "money_inflow", branchId: "locked", startInstant: input.year.startInstant!,
    endExclusiveInstant: input.year.endExclusiveInstant!, limit: 2 });
  expect(new Set(picks.map(item => item.scope.monthId)).size).toBeLessThanOrEqual(2);
  expect(picks.every(item => item.scope.year === 2032 && item.category === "money_inflow")).toBe(true);
  const official = read("official32");
  expect(active(official).filter(item => item.category === "money_inflow")).toEqual([]);
  const hiddenAuthority = official.branches[0]!.periods.find(period => period.monthLabel === "白露月")!.events.find(item => item.category === "promotion")!;
  expect(hiddenAuthority.level).toBe("weak");
  expect(hiddenAuthority.text).toContain("职责承接");
  expect(hiddenAuthority.text).not.toMatch(/资格|指导|专业准备/u);
  expect(hiddenAuthority.supportEvidenceIds.map(id => official.evidence.find(row => row.id === id)!.actionIndex)).toEqual([1]);
  const authorityMonth = inputs.get("official32")!.monthly.months.find(month => month.label === "白露月")!;
  const authorityAction = authorityMonth.judgmentSegments[0]!.judgment.axes.find(axis => axis.axis === "pattern")!.stemActions!.items[1]!;
  expect([authorityAction.tenGod, authorityAction.visibility, authorityAction.effect]).toEqual(["正官", "main_hidden", "assists"]);
  const costs = output.branches[0]!.periods.filter(period => ["芒种月", "小暑月"].includes(period.monthLabel))
    .map(period => period.events.find(item => item.category === "money_loss")!);
  expect(costs).toHaveLength(2); expect(costs[0]!.text).not.toBe(costs[1]!.text);
  expect(input.monthly.months.find(month => month.label === "芒种月")!.stemTenGod).toBe("正印");
  expect(input.monthly.months.find(month => month.label === "小暑月")!.stemTenGod).toBe("偏印");
  expect(costs[0]!.text).toContain("原有课程"); expect(costs[1]!.text).toContain("专项工具");
  expect(inflows.filter(item => item.direction === "mixed").every(item => item.text.includes("仍有牵制"))).toBe(true);
});
it("keeps B's actual handover month in two distinct periods and clips selections to the requested annual side", () => {
  const input = inputs.get("B29")!, output = read("B29"), branch = output.branches[0]!;
  const groups = new Map<string, typeof branch.periods>();
  for (const period of branch.periods) groups.set(period.monthId, [...(groups.get(period.monthId) ?? []), period]);
  const handover = [...groups.values()].find(periods => periods.length === 2)!;
  expect(handover).toHaveLength(2);
  expect(handover[0]!.endExclusiveInstant).toBe(handover[1]!.startInstant);
  expect(handover[0]!.events[0]!.scope.backgroundRefs).not.toEqual(handover[1]!.events[0]!.scope.backgroundRefs);
  const after = input.year.judgmentSegments[1]!;
  for (const category of ["promotion", "job_change", "money_inflow", "money_loss", "romance", "commitment", "separation"] as const) {
    const selected = selectKeyMonthEvents(output, { category, branchId: "locked", startInstant: after.startInstant, endExclusiveInstant: after.endExclusiveInstant });
    expect(selected.every(item => item.scope.startInstant >= after.startInstant && item.scope.endExclusiveInstant <= after.endExclusiveInstant)).toBe(true);
  }
});
it("bridges annual new-business returns to an actual regular-wealth month without assuming that new work is finished", () => {
  const source = inputs.get("B33")!, before = JSON.stringify(source), output = read("B33");
  const period = output.branches[0]!.periods.find(item => item.monthLabel === "寒露月")!;
  const inflow = period.events.find(item => item.category === "money_inflow")!;
  expect(inflow.text).toContain("本年有新合作或新用途");
  expect(inflow.text).toContain("本月若已有明确约定");
  expect(inflow.text).toContain("不表示年内新机会已经兑现");
  const annual = source.year.judgmentSegments[0]!.judgment.axes.find(item => item.axis === "pattern")!.stemActions!.items[0]!;
  const month = source.monthly.months.find(item => item.id === period.monthId)!;
  const current = month.judgmentSegments[0]!.judgment.axes.find(item => item.axis === "pattern")!.stemActions!.items[0]!;
  expect([annual.stem, annual.tenGod, annual.effect, current.stem, current.tenGod, current.effect]).toEqual(["癸", "偏财", "assists", "壬", "正财", "assists"]);
  expect(inflow.evidenceIds.map(id => output.evidence.find(item => item.id === id)!).some(item => item.kind === "annual_actor" && item.origin === "year")).toBe(true);
  expect(inflow.supportEvidenceIds.map(id => output.evidence.find(item => item.id === id)!).every(item => item.origin === "month")).toBe(true);
  expect(JSON.stringify(source)).toBe(before);
  const sameRole = active(read("B32")).find(item => item.category === "money_inflow" && item.text.includes("明确约定"))!;
  expect(sameRole.text).not.toContain("本年有新合作");
});
it("explains the actual resource-to-output constraints and retains the independent hidden help without changing cost support", () => {
  const output26 = read("B26"), output27 = read("B27");
  const cost26 = output26.branches[0]!.periods.find(item => item.monthLabel === "立秋月")!.events.find(item => item.category === "money_loss")!;
  const cost27 = output27.branches[0]!.periods.find(item => item.monthLabel === "芒种月")!.events.find(item => item.category === "money_loss")!;
  for (const item of [cost26, cost27]) {
    expect(item.text).toContain("相互牵连，也可能挤占实际完成");
    expect(item.text).toContain("若因此反复学习、试用或购买");
    expect([item.level, item.direction]).toEqual(["possible", "pressured"]);
  }
  expect(cost26.text).toContain("同月也有改法和试用的可用条件");
  expect(cost27.text).not.toContain("同月也有改法");
  expect(cost26.counterEvidenceIds).toEqual([]);
  const indirect = cost26.evidenceIds.map(id => output26.evidence.find(row => row.id === id)!).filter(row => row.kind === "actor" && row.actionIndex === 1);
  expect(indirect).toHaveLength(1);
  expect(cost26.supportEvidenceIds).not.toContain(indirect[0]!.id);
});
it("keeps a favorable annual background separate from pressure within the exact pre-handover month", () => {
  const output = read("B29"), parts = output.branches[0]!.periods.filter(item => item.monthLabel === "立夏月");
  expect(parts).toHaveLength(2);
  expect(parts[0]!.endExclusiveInstant).toBe("2029-05-22T16:20:00.000Z");
  const before = parts[0]!.events.find(item => item.category === "money_loss")!, after = parts[1]!.events.find(item => item.category === "money_loss")!;
  expect(before.text).toContain("全年这一阶段的主线有可推进条件；本月带来的变化仍有阻力");
  expect(after.text).not.toContain("全年这一阶段的主线有可推进条件");
  expect([before.level, before.direction, after.level, after.direction]).toEqual(["weak", "pressured", "weak", "pressured"]);
  expect(before.supportEvidenceIds.map(id => output.evidence.find(item => item.id === id)!).every(item => item.origin === "month")).toBe(true);
});
it("keeps unknown-direction branches and independent monthly relationship facts separate from annual context", () => {
  const input = inputs.get("A28")!, output = read("A28");
  expect(output.branches.map(branch => branch.id)).toEqual(["forward", "backward"]);
  for (const item of active(output).filter(item => item.domain === "relationship")) {
    const support = item.supportEvidenceIds.map(id => output.evidence.find(row => row.id === id)!);
    expect(support.some(row => row.origin === "month" && ["palace_relation", "star_entry", "star_relation"].includes(row.kind))).toBe(true);
    expect(support.some(row => row.kind === "actor")).toBe(false);
    if (item.lensIds.length === 1) expect(item.text).toContain("其中一种关系视角");
  }
  const selected = selectKeyMonthEvents(output, { category: "romance", branchId: "backward", startInstant: input.year.startInstant!, endExclusiveInstant: input.year.endExclusiveInstant! });
  expect(selected.every(item => item.scope.branchId === "backward")).toBe(true);
  const joined = output.branches[0]!.periods.find(period => period.monthGanZhi === "庚申")!.events.find(item => item.category === "romance")!;
  expect(joined.lensIds).toEqual(["wealth", "authority"]);
  expect(joined.text).toContain("其中一种关系视角另有");
  expect(new Set(joined.counterEvidenceIds.map(id => output.evidence.find(row => row.id === id)!.lensId))).toEqual(new Set(["wealth"]));
});
it("uses the real eighteenth-birthday interval and never produces adult events in childhood months", () => {
  expect(events(read("R3-30")).every(item => item.level === "not_applicable" && !item.applicableIntervals.length)).toBe(true);
  const input = inputs.get("R3-37")!, output = read("R3-37");
  const birth = new Date(input.revision.timeCalibration.utcInstant!); birth.setUTCFullYear(birth.getUTCFullYear() + 18);
  const boundary = birth.toISOString();
  expect(events(output).some(item => item.applicableIntervals.length > 0)).toBe(true);
  for (const item of events(output)) for (const interval of item.applicableIntervals) expect(interval.startInstant >= boundary).toBe(true);
  const selected = selectKeyMonthEvents(output, { category: "romance", branchId: "locked", startInstant: input.year.startInstant!, endExclusiveInstant: input.year.endExclusiveInstant! });
  expect(selected.every(item => item.scope.startInstant >= boundary)).toBe(true);
});
async function withContext(input: BuildKeyMonthEventTendenciesInput, draft: ReadingContextDraft) {
  const note = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId,
    anchor: { kind: "revision", revisionId: input.revision.id }, bodyFormat: "markdown",
    body: await buildReadingContextRecord(input.revision, null, draft), tags: ["阅读背景"], sourceRefs: [], lifecycle: "active",
    editVersion: 1, createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" });
  const resolved = await resolveReadingContext({ revision: input.revision, records: [note] });
  const contextual = buildContextualReadingBundle({ revision: input.revision, assessment: input.assessment, comprehensive: null,
    annualDomains: null, context: resolved.latest, referenceYear: input.year.year })!;
  contextual.readings = buildContextualAnnualReadings({ revision: input.revision, assessment: input.assessment, reading: input.annualDomains, context: draft });
  const annualEvents = buildAnnualEventReading({ revision: input.revision, assessment: input.assessment, year: input.year, domains: input.annualDomains, contextual });
  return { ...input, contextual, annualEvents, monthlyDomains: buildMonthlyDomainReadings({ ...input, contextual }) };
}
it("honors verified work and relationship states and rejects missing or mismatched context", async () => {
  const input = inputs.get("B32")!, contextual = await withContext(input, { work: "retired", relationship: "separated", fromYear: 2032, toYear: 2032, notes: "" });
  const output = buildKeyMonthEventTendencies(contextual);
  expect(events(output).filter(item => ["promotion", "job_change", "romance", "commitment"].includes(item.category)).every(item => item.level === "not_applicable")).toBe(true);
  for (const item of active(output).filter(item => item.category === "separation")) expect(item.text).toContain("旧关系");
  expect(() => buildKeyMonthEventTendencies({ ...contextual, contextual: null })).toThrow();
  const changed = structuredClone(contextual); changed.contextual!.contextSource.reference.bodySha256 = "f".repeat(64);
  expect(() => buildKeyMonthEventTendencies(changed)).toThrow();
});
it("rebuilds this loaded year's choices from records and keeps a financial adoption within one unknown-direction month segment", async () => {
  const input = inputs.get("A28")!, choices = buildKeyMonthReadingChoices(input);
  const month = input.monthlyDomains.months.find(month => month.branches.some(branch => branch.id === "backward" && branch.segments.length === 2))!;
  const branch = month.branches.find(branch => branch.id === "backward")!, segment = branch.segments[0]!;
  const choice = choices.find(choice => choice.id === `monthly-domain-${month.monthId}-${segment.id}-wealth`)!;
  const text = "这一逆行月段的费用安排按本人实际记录；原文完整保留，不覆盖下一段或事业。";
  const root = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId,
    anchor: { kind: "revision", revisionId: input.revision.id }, bodyFormat: "markdown", body: buildStructuredReadingFeedback(input.assessment, {
      subjectId: choice.id, subjectLabel: "本段财务", originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions,
      rating: "unverified", actualSituation: "synthetic" }), tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" });
  const review = researchNoteRecordSchema.parse({ ...root, id: crypto.randomUUID(), body: await buildReadingFeedbackReview(root, null,
    readingFeedbackSource(input.assessment, choice.sourceVersions), { state: "revised", notes: "明确采用", revisedConclusion: text, occurredAt: "" }),
    createdAt: "2026-10-20T00:01:00Z", updatedAt: "2026-10-20T00:01:00Z" });
  const personal = await buildKeyMonthPersonalReading(input, [root, review]);
  const output = buildKeyMonthEventTendencies({ ...input, personal });
  expect(output.personalTexts.map(item => item.text)).toEqual([text]);
  for (const item of events(output)) {
    const adopted = item.scope.branchId === "backward" && item.scope.segmentId === segment.id && item.domain === "wealth";
    expect(item.origin === "personal").toBe(adopted);
    if (adopted) { expect(item.text).toContain("已采用"); expect(item.personalTextIds).toHaveLength(1);
      expect(item.levelLabel).toBe("已采用个人修订"); expect(item.direction).toBe("unindicated"); }
  }
  const wrong = structuredClone(personal); wrong.entries[0]!.originalConclusion += "篡改";
  expect(() => buildKeyMonthEventTendencies({ ...input, personal: wrong })).toThrow();
  const retained = researchNoteRecordSchema.parse({ ...review, id: crypto.randomUUID(), body: await buildReadingFeedbackReview(root, review,
    readingFeedbackSource(input.assessment, choice.sourceVersions), { state: "retained", notes: "恢复原判断", revisedConclusion: "", occurredAt: "" }),
    createdAt: "2026-10-20T00:02:00Z", updatedAt: "2026-10-20T00:02:00Z" });
  const later = await buildKeyMonthPersonalReading(input, [root, review, retained]);
  expect(events(buildKeyMonthEventTendencies({ ...input, personal: later })).some(item => item.origin === "personal")).toBe(false);
}, 60000);
it("rejects changed monthly references, exact bounds, typed actions and a fabricated original story", () => {
  const input = inputs.get("B29")!;
  for (const mutate of [
    (x: BuildKeyMonthEventTendenciesInput) => { x.monthly.months[0]!.nodeRef.nodeId += "-wrong"; },
    (x: BuildKeyMonthEventTendenciesInput) => { x.monthly.months[0]!.endExclusiveInstant = x.monthly.months[1]!.endExclusiveInstant; },
    (x: BuildKeyMonthEventTendenciesInput) => { x.monthly.months[0]!.judgmentSegments[0]!.judgment.axes.find(axis => axis.axis === "pattern")!.stemActions!.items[0]!.effect = "assists"; },
  ]) {
    const changed = structuredClone(input); mutate(changed); expect(() => buildKeyMonthEventTendencies(changed)).toThrow();
  }
  const withStories = { ...input, annualLifeStory: buildAnnualLifeStory({ revision: input.revision, assessment: input.assessment, year: input.year,
    domains: input.annualDomains, events: input.annualEvents }), annualMonthStory: buildAnnualMonthStory(input) };
  withStories.annualMonthStory.summary += "wrong";
  expect(() => buildKeyMonthReadingChoices(withStories)).toThrow();
});
it("replays both genuine old monthly epochs before applying a historical adopted text to the current exact month segment", async () => {
  const input = inputs.get("B29")!;
  const collection = { version: input.annualDomains.version, revisionId: input.revision.id, chartResultHash: input.revision.manifest.resultHash,
    includeHour: input.assessment.sourceBinding.includeHour, startYear: input.annual!.startYear, endYear: input.annual!.endYear, years: [input.annualDomains] };
  const source: LegacyAnnualReadingInput = { revision: input.revision, assessment: input.assessment, annual: input.annual,
    annualDomains: collection, monthly: input.monthly, monthlyDomains: input.monthlyDomains };
  const month = input.monthlyDomains.months.find(month => month.branches[0]!.segments.length === 2)!, segment = month.branches[0]!.segments[1]!;
  const subjectId = `monthly-domain-${month.monthId}-${segment.id}-wealth`;
  await prepareLegacyAnnualReading(source);
  for (const epoch of ["event-0.5", "event-0.6"] as const) {
    const choice = buildLegacyAnnualReadingChoices(source, { epochs: [epoch], subjectIds: [subjectId] }).choices.find(choice => choice.id === subjectId)!;
    expect(choice).toBeDefined();
    const text = `本人明确采用的 ${epoch} 原月段修订；保留原时期，不能挪到交运前。`;
    const root = researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: input.revision.caseId,
      anchor: { kind: "revision", revisionId: input.revision.id }, bodyFormat: "markdown", body: buildStructuredReadingFeedback(input.assessment, {
        subjectId: choice.id, subjectLabel: "历史月度财务", originalConclusion: choice.originalConclusion, sourceVersions: choice.sourceVersions,
        rating: "unverified", actualSituation: "synthetic" }), tags: ["解读反馈"], sourceRefs: [], lifecycle: "active", editVersion: 1,
      createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" });
    const review = researchNoteRecordSchema.parse({ ...root, id: crypto.randomUUID(), body: await buildReadingFeedbackReview(root, null,
      readingFeedbackSource(input.assessment, choice.sourceVersions), { state: "revised", notes: "明确采用", revisedConclusion: text, occurredAt: "" }),
      createdAt: "2026-10-20T00:01:00Z", updatedAt: "2026-10-20T00:01:00Z" });
    const personal = await buildKeyMonthPersonalReading({ ...input, legacySource: source }, [root, review]);
    const entry = personal.entries.find(entry => entry.subjectId === subjectId)!;
    expect(entry.state).toBe("adopted"); expect(entry.personalText).toBe(text);
    expect(entry.feedback[0]!.legacyReplay).toBeDefined();
    const result = buildKeyMonthEventTendencies({ ...input, personal, legacySource: source });
    for (const item of events(result)) expect(item.origin === "personal").toBe(item.scope.segmentId === segment.id && item.domain === "wealth");
    expect(result.personalTexts[0]!.text).toBe(text);
  }
}, 60000);
