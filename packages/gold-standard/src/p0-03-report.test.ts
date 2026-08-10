import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { describe, expect, it } from "vitest";

import {
  P003_DIFFERENTIAL_PLAN_ID,
  P003_DIFFERENTIAL_SEED,
  P003_GENERATOR_VERSION,
  P003_TARGET_CASE_COUNT,
  digestP003DifferentialPlan,
  generateP003DifferentialCases
} from "./p0-03-differential";
import {
  P003_ENGINEERING_REPORT_FORMAT,
  P003_ENGINEERING_REPORT_VERSION,
  p003EngineeringReportPayloadSchema,
  preflightP003EngineeringReport,
  serializeP003EngineeringReport
} from "./p0-03-report";

function strataRows() {
  const rows = new Map<string, {
    eraId: string;
    seasonId: "spring" | "summer" | "autumn" | "winter";
    dayPeriodId: "deep_night" | "morning" | "afternoon" | "evening";
    count: number;
  }>();
  for (const item of generateP003DifferentialCases()) {
    const key = `${item.stratum.eraId}|${item.stratum.seasonId}|${item.stratum.dayPeriodId}`;
    const current = rows.get(key);
    if (current) current.count += 1;
    else rows.set(key, {
      eraId: item.stratum.eraId,
      seasonId: item.stratum.seasonId,
      dayPeriodId: item.stratum.dayPeriodId,
      count: 1
    });
  }
  return [...rows.values()];
}

async function validEnvelope() {
  const corpusDigest = "a".repeat(64);
  const payload = p003EngineeringReportPayloadSchema.parse({
    format: P003_ENGINEERING_REPORT_FORMAT,
    formatVersion: P003_ENGINEERING_REPORT_VERSION,
    classification: "engineering_diagnostic_only",
    plan: {
      planId: P003_DIFFERENTIAL_PLAN_ID,
      planDigest: await digestP003DifferentialPlan(),
      generatorVersion: P003_GENERATOR_VERSION,
      seed: P003_DIFFERENTIAL_SEED,
      targetCaseCount: P003_TARGET_CASE_COUNT,
      inputCorpusDigest: corpusDigest,
      strata: strataRows()
    },
    internalDeterminism: {
      diagnosticDigest: "b".repeat(64),
      runCount: 2,
      completePlanExecuted: true,
      counts: { executed: 20_000, deterministic: 20_000, mismatch: 0, calculationError: 0 },
      diagnosticPassed: true,
      exceptions: []
    },
    calendarIndependentDifferential: {
      scope: "gregorian_to_lunisolar_date_only",
      inputBatchDigest: corpusDigest,
      resultBatchDigest: "c".repeat(64),
      tool: {
        name: "System.Globalization.ChineseLunisolarCalendar",
        version: "test",
        runtime: "test runtime",
        sourceRef: `runtime-assembly-sha256:${"d".repeat(64)}`
      },
      counts: { total: 20_000, matched: 20_000, mismatch: 0, unsupported: 0 },
      coverageComplete: true,
      diagnosticPassed: true,
      exceptions: []
    },
    releaseBoundary: {
      countsAsVerifiedGold: false,
      verifiedGoldDelta: 0,
      fullP003GatePassed: false,
      notice: "两遍复算只证明内部确定性；.NET 只差分公历转农历日期字段，二者都不替代 360 例现实审核金标或完整四柱独立真值。"
    }
  });
  return { payload, digest: await sha256Hex(payload) };
}

describe("P0-03 紧凑工程诊断报告", () => {
  it("锁定 80 个分层单元、20,000 计数和零金标发布边界", async () => {
    const envelope = await validEnvelope();
    const checked = await preflightP003EngineeringReport(serializeP003EngineeringReport(envelope));
    expect(checked.payload.plan.strata).toHaveLength(80);
    expect(checked.payload.plan.strata.every((item) => item.count === 250)).toBe(true);
    expect(checked.payload.internalDeterminism.counts.executed).toBe(20_000);
    expect(checked.payload.releaseBoundary).toMatchObject({
      countsAsVerifiedGold: false,
      verifiedGoldDelta: 0,
      fullP003GatePassed: false
    });
  }, 30_000);

  it("相同摘要报告字节可复现，并拒绝重新签摘要后的伪分层", async () => {
    const envelope = await validEnvelope();
    expect(serializeP003EngineeringReport(envelope)).toBe(`${canonicalStringify(envelope)}\n`);

    const tampered = structuredClone(envelope);
    tampered.payload.plan.strata[0]!.eraId = "era_1901_1929";
    tampered.digest = await sha256Hex(tampered.payload);
    await expect(preflightP003EngineeringReport(tampered)).rejects.toMatchObject({ code: "CASE_MISMATCH" });
  }, 30_000);

  it("拒绝不守恒计数和把工程诊断伪装成金标", async () => {
    const envelope = await validEnvelope();
    const badCounts = structuredClone(envelope.payload) as unknown as Record<string, unknown>;
    const internal = (badCounts.internalDeterminism as { counts: { deterministic: number } }).counts;
    internal.deterministic -= 1;
    expect(p003EngineeringReportPayloadSchema.safeParse(badCounts).success).toBe(false);

    const fakeGold = structuredClone(envelope.payload) as unknown as Record<string, unknown>;
    (fakeGold.releaseBoundary as { countsAsVerifiedGold: boolean }).countsAsVerifiedGold = true;
    expect(p003EngineeringReportPayloadSchema.safeParse(fakeGold).success).toBe(false);
  });
});
