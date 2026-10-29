import "fake-indexeddb/auto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { FullBackupEnvelope, FullBackupPayload, ResearchNoteRecord } from "@hakimi/contracts";
import { sha256BytesHex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import { applyPreparedFullBackup, createFullBackup, createFullBackupArchive, createFullBackupFromSnapshot,
  preflightFullBackupFile, prepareFullBackupFileImport } from "@hakimi/backup";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { buildReadingExplanationIndex, readReadingExplanationIndex, READING_EXPLANATION_MARKER, type ReadingExplanationIndex } from "./reading-explanation-index";
import { decodeReadingReportBundle, encodeReadingReportBundle } from "./local-reading-report-bundle";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { LOCAL_READING_SNAPSHOT_TAG } from "./local-reading-record";
import { buildScopedReadingReport, decodeScopedReadingReport, encodeScopedReadingReport, SCOPED_READING_REPORT_TAG, type ScopedReadingReport } from "./scoped-reading-report";
import { readScopedReadingRecord, validateScopedReadingBackup } from "./scoped-reading-record";

const clocks = { case: "2026-10-29T01:00:00.000Z", index: "2026-10-29T01:05:00.000Z",
  report: "2026-10-29T01:10:00.000Z", note: "2026-10-29T01:15:00.000Z", backup: "2026-10-29T01:20:00.000Z" };
const options = { appVersion: "0.1.0-synthetic-scoped-mixed-backup", exportedAt: clocks.backup };
const databases: ResearchDatabase[] = [];
const receipts: Record<string, unknown>[] = [];
let source: ReturnType<typeof repositories>, index: ReadingExplanationIndex, scopeReport: ScopedReadingReport;
let sourceNotes: ResearchNoteRecord[], original: FullBackupEnvelope, originalZip: Uint8Array, scopeEncoded: string;
let legacyReport: { reading: string; archive: string; version: string };
const plainText = "# 合成旧式原文\r\n逐字保留 🌿 e\u0301\n并非新范围报告。";

function repositories(label: string) {
  const database = new ResearchDatabase(`scoped-mixed-backup-${label}-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
  databases.push(database);
  return { database, cases: new CaseRepository(database, () => clocks.case), research: new ResearchRepository(database, () => clocks.note) };
}
async function restoreChecked(destination: CaseRepository, zip: Uint8Array) {
  const preparation = await prepareFullBackupFileImport(destination, zip, options);
  await validateScopedReadingBackup(preparation.incoming.payload, preparation.currentSafetyBackup.payload);
  return applyPreparedFullBackup(destination, preparation);
}
async function zipFor(payload: FullBackupPayload): Promise<Uint8Array> {
  return createFullBackupArchive(await createFullBackupFromSnapshot(payload, options));
}

beforeAll(async () => {
  source = repositories("source");
  const calculated = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1992-03-09", time: "17:18",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "合成新旧范围报告备份", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic engineering fixture" }, WORKING_DEFAULT_RULE_PROFILE);
  const bundle = await source.cases.createCase({ alias: "合成混合备份", calculated }), revision = bundle.revisions[0]!;
  // createCase records its own actual clock; keep the report sequence tied to
  // that real persisted revision rather than assuming the repository clock is used.
  const recorded = Date.parse(revision.createdAt);
  clocks.index = new Date(recorded + 1).toISOString();
  clocks.report = new Date(recorded + 2).toISOString();
  clocks.note = new Date(recorded + 3).toISOString();
  clocks.backup = new Date(recorded + 4).toISOString();
  options.exportedAt = clocks.backup;
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive });
  const brief = buildBriefReadingReport(assessment, null, { sourceRevision: revision, comprehensive, synthesis })!;
  index = buildReadingExplanationIndex({ revision, assessment, report: brief, synthesis, generatedAt: clocks.index });
  scopeReport = await buildScopedReadingReport({ index, query: { topic: "summary" }, reportId: crypto.randomUUID(), saveAttemptId: crypto.randomUUID(), createdAt: clocks.report });
  scopeEncoded = await encodeScopedReadingReport(scopeReport);
  const oldIndex = structuredClone(index);
  oldIndex.sourceSnapshot.reportVersion = "hakimi.local-reading-edition/0.22.0";
  // A literal synthetic legacy v1 wire: the new scoped writer is not used to
  // manufacture the old record being protected by this regression.
  legacyReport = { version: oldIndex.sourceSnapshot.reportVersion, reading: "旧保存阅读原句\r\n🌿 e\u0301 保留。",
    archive: `# 合成旧格式档案\n${READING_EXPLANATION_MARKER}\n${JSON.stringify(oldIndex)}\n<!-- /hakimi-reading-explanation-index-v1 -->` };
  expect(readReadingExplanationIndex(legacyReport.archive)).toEqual(oldIndex);
  const common = { caseId: revision.caseId, anchor: { kind: "revision" as const, revisionId: revision.id }, sourceRefs: [], lifecycle: "active" as const };
  sourceNotes = [
    await source.research.createResearchNote({ ...common, tags: [LOCAL_READING_SNAPSHOT_TAG], body: plainText }),
    await source.research.createResearchNote({ ...common, tags: [LOCAL_READING_SNAPSHOT_TAG], body: await packReadingSnapshot(await encodeReadingReportBundle(legacyReport)) }),
    await source.research.createResearchNote({ ...common, tags: [LOCAL_READING_SNAPSHOT_TAG, SCOPED_READING_REPORT_TAG], body: await packReadingSnapshot(scopeEncoded) })
  ];
  original = await createFullBackup(source.cases, options);
  originalZip = createFullBackupArchive(original);
}, 60_000);

afterAll(async () => {
  vi.restoreAllMocks();
  for (const database of databases) { database.close(); await database.delete(); }
  // No repository or CI artifacts by default. A local evidence run must opt in
  // with an explicit external destination.
  const directory = process.env.HAKIMI_SCOPED_EVIDENCE_DIR;
  if (directory) {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "mixed-backup-receipts.json"), JSON.stringify({
      schema: "synthetic-scoped-mixed-backup-receipts/1", generatedAt: new Date().toISOString(), tests: receipts
    }, null, 2), "utf8");
    if (originalZip) await writeFile(path.join(directory, "synthetic-mixed-full-backup.zip"), originalZip);
  }
});

it("exports a real full ZIP containing legacy plain/v1/scoped records, preflights, restores a fresh database and reopens byte-exact reports", async () => {
  expect([...originalZip.slice(0, 2)]).toEqual([0x50, 0x4b]);
  const preflight = await preflightFullBackupFile(originalZip);
  expect(preflight.payload.researchNotes).toHaveLength(3);
  await validateScopedReadingBackup(preflight.payload);
  const destination = repositories("fresh"), preparation = await prepareFullBackupFileImport(destination.cases, originalZip, options);
  expect(preparation.currentSafetyBackup.payload.researchNotes).toEqual([]);
  await validateScopedReadingBackup(preparation.incoming.payload, preparation.currentSafetyBackup.payload);
  await applyPreparedFullBackup(destination.cases, preparation);
  destination.database.close(); await destination.database.open();
  const restored = await destination.cases.readFullDataSnapshot();
  expect(restored).toEqual(original.payload);
  const digests = [];
  for (const expected of sourceNotes) {
    const actual = await destination.research.getResearchNote(expected.id);
    expect(actual).toEqual(expected);
    const before = new TextEncoder().encode(expected.body), after = new TextEncoder().encode(actual!.body);
    expect(after).toEqual(before);
    digests.push({ id: expected.id, bodyUtf8Bytes: before.byteLength, originalSha256: await sha256BytesHex(before), restoredSha256: await sha256BytesHex(after) });
  }
  expect(restored.researchNotes.find(note => note.id === sourceNotes[0]!.id)!.body).toBe(plainText);
  expect(await readScopedReadingRecord(sourceNotes[0]!)).toBeNull();
  const oldText = await unpackReadingSnapshot(restored.researchNotes.find(note => note.id === sourceNotes[1]!.id)!.body);
  expect(await decodeReadingReportBundle(oldText)).toEqual(legacyReport);
  const scoped = restored.researchNotes.find(note => note.id === sourceNotes[2]!.id)!;
  expect(await readScopedReadingRecord(scoped)).toEqual(scopeReport);
  expect(await decodeScopedReadingReport(await unpackReadingSnapshot(scoped.body))).toEqual(scopeReport);
  expect((await createFullBackup(destination.cases, options)).digests).toEqual(original.digests);
  const receipt = { scenario: "mixed-fresh-restore", result: "passed", databaseSchema: 13, zipBytes: originalZip.byteLength,
    zipSha256: await sha256BytesHex(originalZip), records: 3, reopened: true, byteExact: true, reexportDigestsEqual: true, digests };
  receipts.push(receipt); process.stdout.write(JSON.stringify(receipt) + "\n");
}, 60_000);

it("rejects a same-ID different valid scoped body before the actual replace transaction and preserves all destination records", async () => {
  const destination = repositories("conflict");
  await restoreChecked(destination.cases, originalZip);
  const before = await destination.cases.readFullDataSnapshot(), changed = structuredClone(original.payload);
  const replacement = await buildScopedReadingReport({ index, query: { topic: "career" }, reportId: scopeReport.reportId,
    saveAttemptId: scopeReport.saveAttemptId, createdAt: clocks.report });
  changed.researchNotes.find(note => note.id === sourceNotes[2]!.id)!.body = await packReadingSnapshot(await encodeScopedReadingReport(replacement));
  const incomingZip = await zipFor(changed);
  await preflightFullBackupFile(incomingZip); // The outer backup and report checksums are valid.
  const replace = vi.spyOn(destination.cases, "replaceFullDataSnapshot");
  await expect(restoreChecked(destination.cases, incomingZip)).rejects.toThrow("同一记录 ID、不同内容");
  expect(replace).not.toHaveBeenCalled();
  expect(await destination.cases.readFullDataSnapshot()).toEqual(before);
  const receipt = { scenario: "same-id-different-body", result: "rejected-before-write", replaceCalls: replace.mock.calls.length, oldRecordsUnchanged: true };
  receipts.push(receipt); process.stdout.write(JSON.stringify(receipt) + "\n");
}, 60_000);

it.each(["revision-hash", "revision-input", "missing-marker", "unknown-version"])("rejects %s in a valid outer ZIP before restoring any record", async defect => {
  const changed = structuredClone(original.payload), note = changed.researchNotes.find(item => item.id === sourceNotes[2]!.id)!;
  if (defect === "missing-marker") note.body = "已丢失专用标记，不能按普通原文恢复";
  else if (defect === "unknown-version") note.body = await packReadingSnapshot(scopeEncoded.replace("scoped-v1", "scoped-v99"));
  else {
    const forged = structuredClone(index);
    if (defect === "revision-hash") { forged.sourceSnapshot.chartResultHash = "f".repeat(64); forged.uncertainty.chartResultHash = "f".repeat(64); }
    else forged.sourceSnapshot.input.date = "1992-03-10";
    const report = await buildScopedReadingReport({ index: forged, query: { topic: "summary" }, reportId: scopeReport.reportId,
      saveAttemptId: scopeReport.saveAttemptId, createdAt: clocks.report });
    note.body = await packReadingSnapshot(await encodeScopedReadingReport(report));
  }
  const incomingZip = await zipFor(changed);
  const checked = await preflightFullBackupFile(incomingZip);
  expect(checked.payload.researchNotes).toHaveLength(3);
  const destination = repositories(`reject-${defect}`), before = await destination.cases.readFullDataSnapshot();
  const replace = vi.spyOn(destination.cases, "replaceFullDataSnapshot");
  await expect(restoreChecked(destination.cases, incomingZip)).rejects.toThrow();
  expect(replace).not.toHaveBeenCalled();
  expect(await destination.cases.readFullDataSnapshot()).toEqual(before);
  expect(await source.cases.readFullDataSnapshot()).toEqual(original.payload);
  const receipt = { scenario: defect, result: "rejected-before-write", outerZipPreflight: "passed", replaceCalls: replace.mock.calls.length,
    destinationUnchanged: true, sourceUnchanged: true };
  receipts.push(receipt); process.stdout.write(JSON.stringify(receipt) + "\n");
}, 60_000);
