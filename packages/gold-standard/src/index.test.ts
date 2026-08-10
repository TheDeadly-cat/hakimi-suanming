import { describe, expect, it } from "vitest";
import {
  JIE_BOUNDARY_FIXTURE,
  expandJieBoundaryCandidates,
  goldEvidenceSchema,
  summarizeJieBoundaryEvidence,
  verifyJieBoundaryCandidates
} from "./index";

describe("2024 十二节秒级边界候选集", () => {
  it("展开为十二节 × 前一秒/当刻/后一秒共 36 个唯一执行行", () => {
    const candidates = expandJieBoundaryCandidates();
    expect(JIE_BOUNDARY_FIXTURE.terms).toHaveLength(12);
    expect(candidates).toHaveLength(36);
    expect(new Set(candidates.map((candidate) => candidate.id)).size).toBe(36);
    expect(candidates.every((candidate) => candidate.input.timePrecision === "exact_second")).toBe(true);
    for (const term of JIE_BOUNDARY_FIXTURE.terms) {
      expect(candidates.filter((candidate) => candidate.termName === term.name).map((candidate) => candidate.position))
        .toEqual(["before", "at", "after"]);
    }
  });

  it("当前引擎可逐行复算冻结快照，不把同源一致性冒充独立金标", async () => {
    const report = await verifyJieBoundaryCandidates();
    expect(report.total).toBe(36);
    expect(report.mismatches).toEqual([]);
    expect(report.passed).toBe(36);
    expect(report.verifiedGoldCaseCount).toBe(0);
    expect(report.releaseGatePassed).toBe(false);
  });

  it("证据汇总明确显示 36 个候选、0 个已验证和未通过发布门", () => {
    expect(summarizeJieBoundaryEvidence()).toEqual({
      candidate: 36,
      crossChecked: 0,
      verified: 0,
      total: 36,
      requiredReleaseGoldCaseCount: 360,
      releaseGatePassed: false
    });
  });

  it("不允许没有权威来源、复核人和裁决记录的条目伪装为 verified", () => {
    const candidate = JIE_BOUNDARY_FIXTURE.defaultEvidence;
    expect(goldEvidenceSchema.safeParse({ ...candidate, status: "verified" }).success).toBe(false);
    expect(goldEvidenceSchema.safeParse({
      ...candidate,
      status: "verified",
      sourceRefs: ["权威历书版本与页码"],
      reviewer: "顾问 A",
      reviewedAt: "2026-08-01T00:00:00.000Z",
      decisionRecordRef: "decision://jie-boundary/2024-v1"
    }).success).toBe(true);
  });

  it("每个交节当刻均切入新月柱，后一秒保持一致", () => {
    const candidates = expandJieBoundaryCandidates();
    for (const term of JIE_BOUNDARY_FIXTURE.terms) {
      const rows = candidates.filter((candidate) => candidate.termName === term.name);
      const before = rows.find((candidate) => candidate.position === "before");
      const at = rows.find((candidate) => candidate.position === "at");
      const after = rows.find((candidate) => candidate.position === "after");
      expect(before?.expected.month).not.toBe(at?.expected.month);
      expect(after?.expected.month).toBe(at?.expected.month);
    }
  });
});
