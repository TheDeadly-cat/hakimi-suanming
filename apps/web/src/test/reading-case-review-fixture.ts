import type { ResearchNoteRecord } from "@hakimi/contracts";
import { appendReadingExplanationIndex, READING_EXPLANATION_INDEX_VERSION, type ReadingExplanationIndex } from "../lib/reading-explanation-index";
import { encodeReadingReportBundle } from "../lib/local-reading-report-bundle";
import { packReadingSnapshot } from "../lib/local-reading-snapshot-codec";
import { LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { LOCAL_READING_CASE_REVIEW_TAG } from "../lib/reading-case-review";

export const syntheticReviewBinding = { caseId: "22222222-2222-4222-8222-222222222222", revisionId: "11111111-1111-4111-8111-111111111111", chartResultHash: "a".repeat(64) };
export function syntheticReviewIndex(binding = syntheticReviewBinding): ReadingExplanationIndex {
  return {
    version: READING_EXPLANATION_INDEX_VERSION, generatedAt: "2026-10-24T01:00:00.000Z",
    sourceSnapshot: { ...binding, includeHour: false, input: { date: "1995-08-18", time: null, timePrecision: "unknown", timeZone: "Asia/Shanghai" },
      ruleProfile: { id: "synthetic-profile" }, ruleProfileDigest: "b".repeat(64), timeCalibration: { status: "synthetic" }, engineVersions: { engine: "synthetic/1" },
      context: { workState: "student", suppliedAt: "2026-10-24T00:00:00.000Z" }, sourceVersions: ["synthetic-producer/1"],
      reportVersion: "hakimi.local-reading-edition/0.22.0", inputRecordedAt: "2026-10-24T00:00:00.000Z" },
    conclusions: ["career", "relationship"].map((domain, i) => ({
      stableId: `${binding.revisionId}/year/2027/${domain}`, label: i ? "2027 年的关系" : "2027 年的学习与发展",
      text: i ? "全年未形成独立的关系转折主线；短期触发另看月份。" : "承担的任务增多；能否兑现仍取决于交付。\r\n保留原句 🌿 e\u0301",
      domain: domain as "career" | "relationship", scope: { level: "year" as const, year: 2027, branchId: "segment-a", startInstant: "2027-02-04T00:00:00.000Z", endExclusiveInstant: "2028-02-04T00:00:00.000Z" },
      sourceSubjects: [`year-2027-${domain}`], direction: i ? "neutral" : "mixed", origin: "calculated" as const, sourceVersions: ["synthetic-producer/1"], personalTextIds: [],
      evidence: { facts: ["synthetic structured fact"], ruleApplications: [], support: [], limits: ["不是确定事件"], unknowns: ["出生时刻未填写"], citations: [] }
    })),
    sources: [], citationBindings: [], uncertainty: { revisionId: binding.revisionId, chartResultHash: binding.chartResultHash,
      inputReliability: "user_supplied_not_independently_verified", inputPrecision: "unknown", pillarStatus: "unavailable", offsetsMinutes: [], changedPillars: [], blockedOffsets: [],
      interpretationStatus: "not_assessed", note: "未填写出生时间，不补造时柱。" }, limitations: ["合成数据，仅验证保存、复盘及来源契约。"]
  };
}
export function syntheticReviewNote(body: string, options: Partial<ResearchNoteRecord> = {}): ResearchNoteRecord {
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: syntheticReviewBinding.caseId,
    anchor: { kind: "revision", revisionId: syntheticReviewBinding.revisionId }, bodyFormat: "markdown", body,
    tags: [LOCAL_READING_CASE_REVIEW_TAG], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: "2026-10-24T03:00:00.000Z", updatedAt: "2026-10-24T03:00:00.000Z", ...options };
}
export async function syntheticIndexedReport(index = syntheticReviewIndex(), options: Partial<ResearchNoteRecord> = {}): Promise<ResearchNoteRecord> {
  const archive = appendReadingExplanationIndex("# 原保存档案\r\n完整内容保留。", index);
  const body = await packReadingSnapshot(await encodeReadingReportBundle({ reading: index.conclusions.map(item => item.text).join("\n\n"), archive, version: index.sourceSnapshot.reportVersion }));
  return syntheticReviewNote(body, { caseId: index.sourceSnapshot.caseId, anchor: { kind: "revision", revisionId: index.sourceSnapshot.revisionId },
    tags: [LOCAL_READING_SNAPSHOT_TAG], createdAt: "2026-10-24T02:00:00.000Z", updatedAt: "2026-10-24T02:00:00.000Z", ...options });
}
