import type { FullBackupPayload, ResearchNoteRecord, RevisionRecord } from "@hakimi/contracts";
import { canonicalStringify } from "@hakimi/integrity";
import { LOCAL_READING_SNAPSHOT_TAG } from "./local-reading-record";
import { isPackedReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { decodeScopedReadingReport, isScopedReadingReport, SCOPED_READING_REPORT_TAG, type ScopedReadingReport } from "./scoped-reading-report";

export function assertScopedReadingRecordBinding(record: ResearchNoteRecord, report: ScopedReadingReport, revision?: RevisionRecord): void {
  if (!record.tags.includes(SCOPED_READING_REPORT_TAG) || !record.tags.includes(LOCAL_READING_SNAPSHOT_TAG)
    || record.anchor.kind !== "revision" || report.source.caseId !== record.caseId || report.source.revisionId !== record.anchor.revisionId
    || !Number.isFinite(Date.parse(record.createdAt)) || Date.parse(report.createdAt) > Date.parse(record.createdAt)) {
    throw new Error("这份范围报告与保存记录的归属、类型或时间不一致，未自动关联。");
  }
  if (revision && (revision.id !== report.source.revisionId || revision.caseId !== report.source.caseId
    || revision.manifest.resultHash !== report.source.chartResultHash || revision.manifest.ruleProfileDigest !== report.source.ruleProfileDigest
    || canonicalStringify(revision.input) !== canonicalStringify(report.index.sourceSnapshot.input)
    || canonicalStringify(revision.timeCalibration) !== canonicalStringify(report.index.sourceSnapshot.timeCalibration))) {
    throw new Error("范围报告与备份中的资料修订不一致，尚未恢复任何记录。");
  }
}

/** Legacy notes remain byte-preserved. A tagged or recognized scoped report is strict. */
export async function readScopedReadingRecord(record: ResearchNoteRecord): Promise<ScopedReadingReport | null> {
  const tagged = record.tags.includes(SCOPED_READING_REPORT_TAG);
  if (!tagged && !isScopedReadingReport(record.body) && !isPackedReadingSnapshot(record.body)) return null;
  let text = record.body;
  if (isPackedReadingSnapshot(text)) {
    try { text = await unpackReadingSnapshot(text); }
    catch (reason) { if (tagged) throw reason; return null; }
  }
  const report = await decodeScopedReadingReport(text);
  if (!report && tagged) throw new Error("这条范围报告的格式未能核对，原记录仍保留，未作为普通原文打开。");
  if (report) assertScopedReadingRecordBinding(record, report);
  return report;
}

/** Application-level semantic preflight, alongside the existing full-backup hashes. */
export async function validateScopedReadingBackup(incoming: Pick<FullBackupPayload, "researchNotes" | "revisions">,
  current?: Pick<FullBackupPayload, "researchNotes" | "revisions">): Promise<void> {
  const revisions = new Map(incoming.revisions.map(revision => [revision.id, revision]));
  const currentNotes = new Map(current?.researchNotes.map(note => [note.id, note]) ?? []);
  const reportIds = new Set<string>();
  const attemptIds = new Set<string>();
  for (const note of incoming.researchNotes) {
    const report = await readScopedReadingRecord(note);
    const existing = currentNotes.get(note.id);
    if (existing && existing.body !== note.body && (report || existing.tags.includes(SCOPED_READING_REPORT_TAG))) {
      throw new Error("备份中有同一记录 ID、不同内容的范围报告，已停止恢复；本机原报告不会被覆盖。");
    }
    if (!report) continue;
    const revision = revisions.get(report.source.revisionId);
    if (!revision) throw new Error("备份中的范围报告缺少所属资料修订，尚未恢复任何记录。");
    assertScopedReadingRecordBinding(note, report, revision);
    if (reportIds.has(report.reportId) || attemptIds.has(report.saveAttemptId)) {
      throw new Error("备份包含重复的范围报告或保存尝试，已停止恢复，未创建重复报告。");
    }
    reportIds.add(report.reportId); attemptIds.add(report.saveAttemptId);
  }
}
