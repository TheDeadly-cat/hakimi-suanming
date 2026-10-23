import "fake-indexeddb/auto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { researchNoteRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalReadingFeedback, buildLocalReadingSnapshot, LOCAL_READING_FEEDBACK_TAG, LOCAL_READING_SNAPSHOT_TAG } from "./local-reading-record";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";

describe("local reading text records against actual repository contracts", () => {
  let database: ResearchDatabase;
  let repository: ResearchRepository;
  let revision: RevisionRecord;
  let assessment: BaziPreliminaryAssessment;
  let annual: LocalAnnualOutlook;
  beforeAll(async () => {
    database = new ResearchDatabase(`local-reading-record-synthetic-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
    repository = new ResearchRepository(database);
    const calculated = await calculateChart({
      schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
      timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
      location: { label: "合成记录测试", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic"
    }, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await new CaseRepository(database).createCase({ alias: "合成解读记录", calculated });
    revision = bundle.revisions[0]!;
    assessment = buildBaziPreliminaryAssessment(revision);
    annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
  });
  afterAll(async () => { await database?.delete(); });

  it("stores all ten actual years under the 200000-character contract and preserves exact bytes after reopening", async () => {
    const body = buildLocalReadingSnapshot(assessment, annual);
    const storedBody = await packReadingSnapshot(body);
    expect(annual.years).toHaveLength(10);
    expect(storedBody.length).toBeLessThanOrEqual(200_000);
    expect(researchNoteRecordSchema.shape.body.safeParse(storedBody).success).toBe(true);
    expect(await unpackReadingSnapshot(storedBody)).toBe(body);
    console.info(JSON.stringify({ probe: "known-sex-ten-year-snapshot", characters: body.length, years: annual.years.length, maximum: 200000 }));
    for (const year of annual.years) expect(body).toContain(`### ${year.year}`);
    const note = await repository.createResearchNote({ caseId: revision.caseId,
      anchor: { kind: "revision", revisionId: revision.id }, body: storedBody, tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });
    database.close();
    await database.open();
    const stored = (await repository.listResearchNotesByCase(revision.caseId)).find((row) => row.id === note.id);
    expect(stored?.body).toBe(storedBody);
    expect(await unpackReadingSnapshot(stored!.body)).toBe(body);
    expect(stored?.anchor).toEqual({ kind: "revision", revisionId: revision.id });
    expect(body).toContain(revision.manifest.resultHash);
  });

  it("retains the actual annual conditions and theme/scenario evidence needed to interpret the snapshot", () => {
    const body = buildLocalReadingSnapshot(assessment, annual);
    const missing = [...new Set(annual.years.flatMap((year) => [
      ...year.conditions,
      year.yearInfluence.summary, year.decadeInfluence.summary,
      ...year.yearInfluence.evidence, ...year.decadeInfluence.evidence,
      ...year.themes.flatMap((theme) => theme.evidence),
      ...year.scenarioBranches.flatMap((scenario) => scenario.evidence)
    ]))].filter((text) => !body.includes(text));
    expect(missing).toEqual([]);
  });

  it("rejects a different annual revision or chart hash without editing either result", () => {
    const original = JSON.stringify({ assessment, annual });
    expect(() => buildLocalReadingSnapshot(assessment, { ...annual, revisionId: crypto.randomUUID() })).toThrow(/不一致/);
    expect(() => buildLocalReadingSnapshot(assessment, { ...annual, chartResultHash: "f".repeat(64) })).toThrow(/不一致/);
    expect(JSON.stringify({ assessment, annual })).toBe(original);
    expect(buildLocalReadingSnapshot(assessment, null)).toContain("本次仅保存命局判断");
  });

  it("keeps the larger unknown-sex forward/backward ten-year snapshot within the storage contract", async () => {
    const calculated = await calculateChart({ ...revision.input, sex: "unspecified" }, WORKING_DEFAULT_RULE_PROFILE);
    const bundle = await new CaseRepository(database).createCase({ alias: "合成未知顺逆", calculated });
    const unknown = bundle.revisions[0]!;
    const reading = buildBaziPreliminaryAssessment(unknown);
    const outlook = await buildLocalAnnualOutlook(unknown, reading, 2026);
    const body = buildLocalReadingSnapshot(reading, outlook);
    const storedBody = await packReadingSnapshot(body);
    expect(outlook.years).toHaveLength(10);
    expect(outlook.years.some((year) => year.scenarioBranches.length > 1)).toBe(true);
    expect(researchNoteRecordSchema.shape.body.safeParse(storedBody).success).toBe(true);
    const saved = await repository.createResearchNote({ caseId: unknown.caseId,
      anchor: { kind: "revision", revisionId: unknown.id }, body: storedBody, tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });
    const reopenedBody = (await repository.listResearchNotesByCase(unknown.caseId)).find((row) => row.id === saved.id)!.body;
    expect(reopenedBody).toBe(storedBody);
    expect(await unpackReadingSnapshot(reopenedBody)).toBe(body);
    console.info(JSON.stringify({ probe: "unknown-sex-ten-year-snapshot", characters: body.length, years: outlook.years.length,
      maximumBranches: Math.max(...outlook.years.map((year) => year.scenarioBranches.length)), maximum: 200000 }));
  });

  it("saves monthly context and its exact reference, reopens unchanged, and refuses a missing context on reconstruction", async () => {
    const contextNote = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
      body: await buildReadingContextRecord(revision, null, { work: "retired", relationship: "unspecified", fromYear: 2028, toYear: 2028, notes: "仅合成月度背景" }),
      tags: ["阅读背景"], sourceRefs: [], lifecycle: "active" });
    const latest = await resolveReadingContext({ revision, records: [contextNote] });
    const contextual = buildContextualReadingBundle({ revision, assessment, comprehensive: null, annualDomains: null, context: latest.latest, referenceYear: 2028 });
    const monthly = await buildLocalMonthlyOutlook(revision, assessment, 2028), monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly, contextual });
    const extras = { sourceRevision: revision, monthly, monthlyDomains, contextual };
    const body = buildLocalReadingSnapshot(assessment, annual, extras);
    expect(body).toContain(`月度阅读背景记录：${JSON.stringify(latest.latest!.ref)}`);
    expect(body).toContain(`context-record/${contextNote.id}/${contextNote.editVersion}/${latest.latest!.ref.bodySha256}`);
    expect(() => buildLocalReadingSnapshot(assessment, annual, { ...extras, contextual: null })).toThrow("原判断不一致");
    const packed = await packReadingSnapshot(body);
    const note = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
      body: packed, tags: [LOCAL_READING_SNAPSHOT_TAG], sourceRefs: [], lifecycle: "active" });
    database.close(); await database.open();
    const reopened = (await repository.listResearchNotesByCase(revision.caseId)).find(item => item.id === note.id)!;
    expect(reopened.body).toBe(packed); expect(await unpackReadingSnapshot(reopened.body)).toBe(body);
  });

  it("persists literal feedback with original conclusion, actual situation and the exact source binding", async () => {
    const original = "原结论\n关系主题较活跃 <script>literal</script>";
    const actual = "实际情况\n今年主要变化来自换工作，并未发生婚恋变化。";
    const body = buildLocalReadingFeedback(assessment, original, actual);
    const record = await repository.createResearchNote({ caseId: revision.caseId,
      anchor: { kind: "revision", revisionId: revision.id }, body, tags: [LOCAL_READING_FEEDBACK_TAG], sourceRefs: [], lifecycle: "active" });
    expect((await repository.listResearchNotesByCase(revision.caseId)).find((row) => row.id === record.id)?.body).toBe(body);
    expect(body).toContain(original);
    expect(body).toContain(actual);
    expect(body).toContain(revision.id);
    expect(body).toContain(revision.manifest.resultHash);
    expect(() => buildLocalReadingFeedback(assessment, " ", actual)).toThrow(/请填写/);
    expect(() => buildLocalReadingFeedback(assessment, "x".repeat(4001), actual)).toThrow(/分成多条/);
    expect(() => buildLocalReadingFeedback(assessment, original, "x".repeat(8001))).toThrow(/分成多条/);
    expect(researchNoteRecordSchema.shape.body.safeParse("x".repeat(200001)).success).toBe(false);
  });
});
