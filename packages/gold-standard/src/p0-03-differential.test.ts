import { calculateChart } from "@hakimi/bazi-core";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { describe, expect, it } from "vitest";
import {
  P003_DIAGNOSTIC_CLASSIFICATION,
  P003_DIFFERENTIAL_PLAN,
  P003_DIFFERENTIAL_SEED,
  P003_EXTERNAL_CALENDAR_FIELDS,
  P003_GENERATOR_VERSION,
  P003_TARGET_CASE_COUNT,
  createP003ExternalDifferentialInputEnvelope,
  createP003ExternalDifferentialResultEnvelope,
  generateP003DifferentialCases,
  p003DifferentialPlanSchema,
  p003ExternalDifferentialResultItemSchema,
  preflightP003DeterminismDiagnostic,
  preflightP003ExternalDifferentialInput,
  preflightP003ExternalDifferentialResults,
  runP003DeterminismDiagnostic,
  serializeP003DeterminismDiagnostic,
  serializeP003ExternalDifferentialInput,
  serializeP003ExternalDifferentialResult,
  type P003ExternalDifferentialResultItem
} from "./p0-03-differential";

function byteEqual(left: string, right: string): boolean {
  return Buffer.from(left, "utf8").equals(Buffer.from(right, "utf8"));
}

function externalCalendarFromDiagnostic(item: Awaited<ReturnType<typeof runP003DeterminismDiagnostic>>["payload"]["cases"][number]) {
  if (item.firstPass.status !== "calculated") throw new Error("测试前置排盘失败");
  const calendar = item.firstPass.coreResult.calendar;
  return {
    lunarDate: `${calendar.lunarYear}-${String(Math.abs(calendar.lunarMonth)).padStart(2, "0")}-${String(calendar.lunarDay).padStart(2, "0")}`,
    lunarLeapMonth: calendar.isLeapMonth
  };
}

function differentLunarDate(current: string): string {
  const day = Number(current.slice(8, 10));
  return `${current.slice(0, 8)}${day === 1 ? "02" : "01"}`;
}

const externalTool = {
  name: "hakimi-dotnet-differential-test-double",
  version: "1.0.0-test",
  runtime: ".NET test fixture",
  sourceRef: "repo://independent-dotnet-test-double"
} as const;

describe("P0-03 固定种子 20,000 例计划", () => {
  it("锁定种子、生成器版本与五年代×四季×四昼夜×250 的分层计数", () => {
    expect(P003_DIFFERENTIAL_PLAN.seed).toBe(P003_DIFFERENTIAL_SEED);
    expect(P003_DIFFERENTIAL_PLAN.generatorVersion).toBe(P003_GENERATOR_VERSION);
    expect(P003_DIFFERENTIAL_PLAN.targetCaseCount).toBe(P003_TARGET_CASE_COUNT);
    expect(P003_DIFFERENTIAL_PLAN.timeZone).toBe("Etc/GMT-8");
    expect(P003_DIFFERENTIAL_PLAN.utcOffset).toBe("+08:00");

    const cases = generateP003DifferentialCases();
    expect(cases).toHaveLength(20_000);
    expect(new Set(cases.map((item) => item.caseId)).size).toBe(20_000);
    expect(new Set(cases.map((item) => canonicalStringify({
      date: item.input.date,
      time: item.input.time,
      timeZone: item.input.timeZone,
      sex: item.input.sex
    }))).size).toBe(20_000);
    expect(new Set(cases.map((item) => item.stratum.eraId)).size).toBe(5);
    expect(new Set(cases.map((item) => item.stratum.seasonId)).size).toBe(4);
    expect(new Set(cases.map((item) => item.stratum.dayPeriodId)).size).toBe(4);
    expect(cases.every((item) => item.input.calendarType === "gregorian"
      && item.input.timePrecision === "exact_second"
      && item.input.timeZone === "Etc/GMT-8")).toBe(true);

    const cells = new Map<string, number>();
    for (const item of cases) {
      const cell = `${item.stratum.eraId}|${item.stratum.seasonId}|${item.stratum.dayPeriodId}`;
      cells.set(cell, (cells.get(cell) ?? 0) + 1);
    }
    expect(cells.size).toBe(80);
    expect([...cells.values()].every((count) => count === 250)).toBe(true);
  }, 30_000);

  it("同一计划生成字节级完全可复现，任何种子篡改均被拒绝", () => {
    const first = canonicalStringify(generateP003DifferentialCases());
    const second = canonicalStringify(generateP003DifferentialCases());
    expect(byteEqual(first, second)).toBe(true);
    expect(p003DifferentialPlanSchema.safeParse({
      ...P003_DIFFERENTIAL_PLAN,
      seed: P003_DIFFERENTIAL_PLAN.seed + 1
    }).success).toBe(false);
  }, 30_000);
});

describe("P0-03 两遍确定性诊断", () => {
  it("对同一切片完整计算两遍，核对 resultHash 与核心结果并固定非金标边界", async () => {
    const first = await runP003DeterminismDiagnostic({ caseLimit: 12, concurrency: 4 });
    const second = await runP003DeterminismDiagnostic({ caseLimit: 12, concurrency: 4 });

    expect(first.payload.classification).toBe(P003_DIAGNOSTIC_CLASSIFICATION);
    expect(first.payload.counts).toEqual({ executed: 12, deterministic: 12, mismatch: 0, calculationError: 0 });
    expect(first.payload.completePlanExecuted).toBe(false);
    expect(first.payload.diagnosticPassed).toBe(true);
    expect(first.payload.countsAsVerifiedGold).toBe(false);
    expect(first.payload.verifiedGoldDelta).toBe(0);
    expect(first.payload.fullP003GatePassed).toBe(false);
    expect(first.payload.cases.every((item) => item.firstPass.status === "calculated"
      && item.secondPass.status === "calculated"
      && item.firstPass.resultHash === item.secondPass.resultHash
      && item.firstPass.coreResultDigest === item.secondPass.coreResultDigest)).toBe(true);
    expect(byteEqual(
      serializeP003DeterminismDiagnostic(first),
      serializeP003DeterminismDiagnostic(second)
    )).toBe(true);
    await expect(preflightP003DeterminismDiagnostic(serializeP003DeterminismDiagnostic(first))).resolves.toEqual(first);
  }, 60_000);

  it("非确定结果必须进入 mismatch 且计数守恒，不会被误计为金标", async () => {
    let calls = 0;
    const report = await runP003DeterminismDiagnostic({
      caseLimit: 3,
      concurrency: 1,
      calculator: async (input) => {
        calls += 1;
        const chart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
        if (calls === 4) {
          return {
            ...chart,
            manifest: { ...chart.manifest, resultHash: "f".repeat(64) }
          };
        }
        return chart;
      }
    });

    expect(report.payload.counts).toEqual({ executed: 3, deterministic: 2, mismatch: 1, calculationError: 0 });
    expect(report.payload.cases[0]?.status).toBe("mismatch");
    expect(report.payload.cases[0]?.mismatchFields).toEqual(["result_hash"]);
    expect(report.payload.diagnosticPassed).toBe(false);
    expect(report.payload.countsAsVerifiedGold).toBe(false);
    expect(report.payload.verifiedGoldDelta).toBe(0);
    expect(report.payload.fullP003GatePassed).toBe(false);
  }, 30_000);

  it("拒绝外层重签但内层核心结果摘要未同步的篡改", async () => {
    const report = await runP003DeterminismDiagnostic({ caseLimit: 2, concurrency: 2 });
    const tampered = structuredClone(report);
    const first = tampered.payload.cases[0]!.firstPass;
    if (first.status !== "calculated") throw new Error("测试前置排盘失败");
    first.coreResult.calendar.lunarDay += 1;
    tampered.digest = await sha256Hex(tampered.payload);

    await expect(preflightP003DeterminismDiagnostic(tampered)).rejects.toMatchObject({
      code: "INNER_DIGEST_MISMATCH"
    });
  }, 30_000);
});

describe("P0-03 外部 .NET 差分交换契约", () => {
  it("输入批次内容寻址、字节可复现且只接受固定生成集", async () => {
    const cases = generateP003DifferentialCases().slice(0, 4);
    const first = await createP003ExternalDifferentialInputEnvelope({ cases, batchId: "p003-dotnet-test-4" });
    const second = await createP003ExternalDifferentialInputEnvelope({ cases, batchId: "p003-dotnet-test-4" });
    expect(first.payload.caseCount).toBe(4);
    expect(byteEqual(
      serializeP003ExternalDifferentialInput(first),
      serializeP003ExternalDifferentialInput(second)
    )).toBe(true);
    await expect(preflightP003ExternalDifferentialInput(serializeP003ExternalDifferentialInput(first))).resolves.toEqual(first);

    const tampered = structuredClone(first);
    tampered.payload.cases[0]!.localDate = "2000-01-01";
    tampered.digest = await sha256Hex(tampered.payload);
    await expect(preflightP003ExternalDifferentialInput(tampered)).rejects.toMatchObject({
      code: "GENERATED_CASE_MISMATCH"
    });
  }, 30_000);

  it("matched / mismatch / unsupported 强制分类、计数守恒并不增加 verified gold", async () => {
    const cases = generateP003DifferentialCases().slice(0, 3);
    const internal = await runP003DeterminismDiagnostic({ cases, concurrency: 2 });
    const input = await createP003ExternalDifferentialInputEnvelope({ cases, batchId: "p003-dotnet-classification-3" });
    const references = internal.payload.cases.map(externalCalendarFromDiagnostic);
    const changed = { ...references[1]!, lunarDate: differentLunarDate(references[1]!.lunarDate) };
    const results: P003ExternalDifferentialResultItem[] = [
      { caseId: cases[0]!.caseId, status: "matched", observedCalendar: references[0]! },
      {
        caseId: cases[1]!.caseId,
        status: "mismatch",
        observedCalendar: changed,
        mismatchFields: ["lunar_date"],
        differenceClass: "unresolved_calendar_table_difference",
        explanation: "独立工具观测到农历日期差异"
      },
      {
        caseId: cases[2]!.caseId,
        status: "unsupported",
        unsupportedCode: "calendar_algorithm_unavailable",
        reason: "测试工具显式声明不支持该输入"
      }
    ];
    const result = await createP003ExternalDifferentialResultEnvelope({ input, tool: externalTool, results });
    const sameResult = await createP003ExternalDifferentialResultEnvelope({ input, tool: externalTool, results });
    expect(byteEqual(
      serializeP003ExternalDifferentialResult(result),
      serializeP003ExternalDifferentialResult(sameResult)
    )).toBe(true);

    const evaluation = await preflightP003ExternalDifferentialResults({ input, result, internalDiagnostic: internal });
    expect(evaluation.counts).toEqual({ total: 3, matched: 1, mismatch: 1, unsupported: 1 });
    expect(evaluation.diagnosticPassed).toBe(false);
    expect(evaluation.countsAsVerifiedGold).toBe(false);
    expect(evaluation.verifiedGoldDelta).toBe(0);
    expect(evaluation.fullP003GatePassed).toBe(false);
  }, 60_000);

  it("严格 schema 拒绝未分类、空 mismatchFields 与无原因 unsupported", () => {
    expect(p003ExternalDifferentialResultItemSchema.safeParse({
      caseId: "p003-00001",
      status: "unknown",
      observedCalendar: { lunarDate: "2000-01-01", lunarLeapMonth: false }
    }).success).toBe(false);
    expect(p003ExternalDifferentialResultItemSchema.safeParse({
      caseId: "p003-00001",
      status: "mismatch",
      observedCalendar: { lunarDate: "2000-01-01", lunarLeapMonth: false },
      mismatchFields: [],
      differenceClass: "unresolved_calendar_table_difference",
      explanation: "差异"
    }).success).toBe(false);
    expect(p003ExternalDifferentialResultItemSchema.safeParse({
      caseId: "p003-00001",
      status: "unsupported",
      unsupportedCode: "runtime_failure"
    }).success).toBe(false);
    expect(P003_EXTERNAL_CALENDAR_FIELDS).toEqual(["lunar_date", "lunar_leap_month"]);
  });

  it("拒绝把实际差异伪装为 matched，以及结果缺行", async () => {
    const cases = generateP003DifferentialCases().slice(0, 2);
    const internal = await runP003DeterminismDiagnostic({ cases, concurrency: 2 });
    const input = await createP003ExternalDifferentialInputEnvelope({ cases, batchId: "p003-dotnet-negative-2" });
    const references = internal.payload.cases.map(externalCalendarFromDiagnostic);
    const mislabeled = await createP003ExternalDifferentialResultEnvelope({
      input,
      tool: externalTool,
      results: [
        {
          caseId: cases[0]!.caseId,
          status: "matched",
          observedCalendar: { ...references[0]!, lunarLeapMonth: !references[0]!.lunarLeapMonth }
        },
        { caseId: cases[1]!.caseId, status: "matched", observedCalendar: references[1]! }
      ]
    });
    await expect(preflightP003ExternalDifferentialResults({ input, result: mislabeled, internalDiagnostic: internal }))
      .rejects.toMatchObject({ code: "CLASSIFICATION_MISMATCH" });

    const missing = await createP003ExternalDifferentialResultEnvelope({
      input,
      tool: externalTool,
      results: [{ caseId: cases[0]!.caseId, status: "matched", observedCalendar: references[0]! }]
    });
    await expect(preflightP003ExternalDifferentialResults({ input, result: missing, internalDiagnostic: internal }))
      .rejects.toMatchObject({ code: "COUNT_INVARIANT_FAILED" });
  }, 60_000);
});
