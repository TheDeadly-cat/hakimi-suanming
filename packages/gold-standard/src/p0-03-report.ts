import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { z } from "zod";

import {
  P003_DIAGNOSTIC_CLASSIFICATION,
  P003_DIFFERENTIAL_PLAN_ID,
  P003_DIFFERENTIAL_SEED,
  P003_GENERATOR_VERSION,
  P003_TARGET_CASE_COUNT,
  digestP003GeneratedCase,
  digestP003DifferentialPlan,
  generateP003DifferentialCases,
  p003ExternalDifferentialResultEnvelopeSchema,
  preflightP003DeterminismDiagnostic,
  preflightP003ExternalDifferentialInput,
  preflightP003ExternalDifferentialResults,
  type P003DeterminismDiagnosticEnvelope,
  type P003ExternalDifferentialInputEnvelope,
  type P003ExternalDifferentialResultEnvelope
} from "./p0-03-differential";

export const P003_ENGINEERING_REPORT_FORMAT = "hakimi-p0-03-engineering-diagnostic-report" as const;
export const P003_ENGINEERING_REPORT_VERSION = "1.0.0" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const caseIdSchema = z.string().regex(/^p003-[0-9]{5}$/);
const stratumSchema = z.strictObject({
  eraId: z.string().regex(/^era_[0-9]{4}_[0-9]{4}$/),
  seasonId: z.enum(["spring", "summer", "autumn", "winter"]),
  dayPeriodId: z.enum(["deep_night", "morning", "afternoon", "evening"])
});
const diagnosticInputSchema = z.strictObject({
  caseId: caseIdSchema,
  inputDigest: sha256Schema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  timeZone: z.literal("Etc/GMT-8"),
  sex: z.enum(["male", "female", "unspecified"]),
  stratum: stratumSchema
});
const diagnosticCountsSchema = z.strictObject({
  executed: z.literal(P003_TARGET_CASE_COUNT),
  deterministic: z.number().int().min(0).max(P003_TARGET_CASE_COUNT),
  mismatch: z.number().int().min(0).max(P003_TARGET_CASE_COUNT),
  calculationError: z.number().int().min(0).max(P003_TARGET_CASE_COUNT)
});
const externalCountsSchema = z.strictObject({
  total: z.literal(P003_TARGET_CASE_COUNT),
  matched: z.number().int().min(0).max(P003_TARGET_CASE_COUNT),
  mismatch: z.number().int().min(0).max(P003_TARGET_CASE_COUNT),
  unsupported: z.number().int().min(0).max(P003_TARGET_CASE_COUNT)
});
const errorSnapshotSummarySchema = z.strictObject({
  errorName: z.string().min(1).max(120),
  errorMessage: z.string().min(1).max(2_000)
});
const internalExceptionSchema = z.strictObject({
  input: diagnosticInputSchema,
  status: z.enum(["mismatch", "calculation_error"]),
  mismatchFields: z.array(z.enum([
    "result_hash",
    "core_result_digest",
    "year_pillar",
    "month_pillar",
    "day_pillar",
    "hour_pillar"
  ])),
  firstSnapshotDigest: sha256Schema,
  secondSnapshotDigest: sha256Schema,
  firstError: errorSnapshotSummarySchema.nullable(),
  secondError: errorSnapshotSummarySchema.nullable()
});
const observedCalendarSchema = z.strictObject({
  lunarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lunarLeapMonth: z.boolean()
});
const externalExceptionSchema = z.discriminatedUnion("status", [
  z.strictObject({
    input: diagnosticInputSchema,
    status: z.literal("mismatch"),
    expectedCalendar: observedCalendarSchema,
    observedCalendar: observedCalendarSchema,
    mismatchFields: z.array(z.enum(["lunar_date", "lunar_leap_month"])).min(1).max(2),
    differenceClass: z.enum([
      "unresolved_calendar_table_difference",
      "authority_table_matches_current_adapter",
      "test_harness_error"
    ]),
    explanation: z.string().min(1).max(1_000)
  }),
  z.strictObject({
    input: diagnosticInputSchema,
    status: z.literal("unsupported"),
    unsupportedCode: z.enum([
      "date_out_of_range",
      "calendar_algorithm_unavailable",
      "fixed_plus08_frame_unsupported",
      "invalid_input",
      "runtime_failure"
    ]),
    reason: z.string().min(1).max(1_000)
  })
]);
const externalToolSchema = z.strictObject({
  name: z.string().min(1).max(120),
  version: z.string().min(1).max(120),
  runtime: z.string().min(1).max(200),
  sourceRef: z.string().min(1).max(500)
});

export const p003EngineeringReportPayloadSchema = z.strictObject({
  format: z.literal(P003_ENGINEERING_REPORT_FORMAT),
  formatVersion: z.literal(P003_ENGINEERING_REPORT_VERSION),
  classification: z.literal(P003_DIAGNOSTIC_CLASSIFICATION),
  plan: z.strictObject({
    planId: z.literal(P003_DIFFERENTIAL_PLAN_ID),
    planDigest: sha256Schema,
    generatorVersion: z.literal(P003_GENERATOR_VERSION),
    seed: z.literal(P003_DIFFERENTIAL_SEED),
    targetCaseCount: z.literal(P003_TARGET_CASE_COUNT),
    inputCorpusDigest: sha256Schema,
    strata: z.array(stratumSchema.extend({ count: z.literal(250) })).length(80)
  }),
  internalDeterminism: z.strictObject({
    diagnosticDigest: sha256Schema,
    runCount: z.literal(2),
    completePlanExecuted: z.literal(true),
    counts: diagnosticCountsSchema,
    diagnosticPassed: z.boolean(),
    exceptions: z.array(internalExceptionSchema)
  }),
  calendarIndependentDifferential: z.strictObject({
    scope: z.literal("gregorian_to_lunisolar_date_only"),
    inputBatchDigest: sha256Schema,
    resultBatchDigest: sha256Schema,
    tool: externalToolSchema,
    counts: externalCountsSchema,
    coverageComplete: z.boolean(),
    diagnosticPassed: z.boolean(),
    exceptions: z.array(externalExceptionSchema)
  }),
  releaseBoundary: z.strictObject({
    countsAsVerifiedGold: z.literal(false),
    verifiedGoldDelta: z.literal(0),
    fullP003GatePassed: z.literal(false),
    notice: z.literal("两遍复算只证明内部确定性；.NET 只差分公历转农历日期字段，二者都不替代 360 例现实审核金标或完整四柱独立真值。")
  })
}).superRefine((payload, context) => {
  const internal = payload.internalDeterminism.counts;
  if (internal.deterministic + internal.mismatch + internal.calculationError !== internal.executed) {
    context.addIssue({ code: "custom", path: ["internalDeterminism", "counts"], message: "内部诊断计数不守恒" });
  }
  if (payload.internalDeterminism.exceptions.length !== internal.mismatch + internal.calculationError) {
    context.addIssue({ code: "custom", path: ["internalDeterminism", "exceptions"], message: "内部异常明细数量不守恒" });
  }
  if (payload.internalDeterminism.diagnosticPassed !== (internal.mismatch === 0 && internal.calculationError === 0)) {
    context.addIssue({ code: "custom", path: ["internalDeterminism", "diagnosticPassed"], message: "内部诊断结论与计数不一致" });
  }
  const external = payload.calendarIndependentDifferential.counts;
  if (external.matched + external.mismatch + external.unsupported !== external.total) {
    context.addIssue({ code: "custom", path: ["calendarIndependentDifferential", "counts"], message: "外部差分计数不守恒" });
  }
  if (payload.calendarIndependentDifferential.exceptions.length !== external.mismatch + external.unsupported) {
    context.addIssue({ code: "custom", path: ["calendarIndependentDifferential", "exceptions"], message: "外部差分异常明细数量不守恒" });
  }
  if (payload.calendarIndependentDifferential.coverageComplete !== (external.unsupported === 0)) {
    context.addIssue({ code: "custom", path: ["calendarIndependentDifferential", "coverageComplete"], message: "外部覆盖结论与 unsupported 计数不一致" });
  }
  if (payload.calendarIndependentDifferential.diagnosticPassed !== (external.mismatch === 0 && external.unsupported === 0)) {
    context.addIssue({ code: "custom", path: ["calendarIndependentDifferential", "diagnosticPassed"], message: "外部诊断结论与计数不一致" });
  }
  if (payload.plan.inputCorpusDigest !== payload.calendarIndependentDifferential.inputBatchDigest) {
    context.addIssue({ code: "custom", path: ["plan", "inputCorpusDigest"], message: "输入语料摘要必须与外部差分批次一致" });
  }
  const stratumKeys = payload.plan.strata.map((item) => `${item.eraId}|${item.seasonId}|${item.dayPeriodId}`);
  if (new Set(stratumKeys).size !== 80 || payload.plan.strata.reduce((sum, item) => sum + item.count, 0) !== P003_TARGET_CASE_COUNT) {
    context.addIssue({ code: "custom", path: ["plan", "strata"], message: "80 个分层单元必须唯一且合计 20,000" });
  }
});

export const p003EngineeringReportEnvelopeSchema = z.strictObject({
  payload: p003EngineeringReportPayloadSchema,
  digest: sha256Schema
});

export type P003EngineeringReportEnvelope = z.infer<typeof p003EngineeringReportEnvelopeSchema>;

export class P003EngineeringReportError extends Error {
  constructor(readonly code: "INCOMPLETE_RUN" | "DIGEST_MISMATCH" | "CASE_MISMATCH", message: string) {
    super(message);
    this.name = "P003EngineeringReportError";
  }
}

function publicInput(
  generated: ReturnType<typeof generateP003DifferentialCases>[number],
  inputDigest: string
) {
  return diagnosticInputSchema.parse({
    caseId: generated.caseId,
    inputDigest,
    date: generated.input.date,
    time: generated.input.time,
    timeZone: generated.input.timeZone,
    sex: generated.input.sex,
    stratum: {
      eraId: generated.stratum.eraId,
      seasonId: generated.stratum.seasonId,
      dayPeriodId: generated.stratum.dayPeriodId
    }
  });
}

function errorSummary(snapshot: { status: string; errorName?: string; errorMessage?: string }) {
  return snapshot.status === "calculation_error"
    ? errorSnapshotSummarySchema.parse({ errorName: snapshot.errorName, errorMessage: snapshot.errorMessage })
    : null;
}

function expectedCalendarFromDiagnostic(
  diagnostic: P003DeterminismDiagnosticEnvelope["payload"]["cases"][number]
) {
  if (diagnostic.firstPass.status !== "calculated") return null;
  const calendar = diagnostic.firstPass.coreResult.calendar;
  return observedCalendarSchema.parse({
    lunarDate: `${calendar.lunarYear}-${String(Math.abs(calendar.lunarMonth)).padStart(2, "0")}-${String(calendar.lunarDay).padStart(2, "0")}`,
    lunarLeapMonth: calendar.isLeapMonth
  });
}

function canonicalStrata() {
  const counts = new Map<string, {
    eraId: string;
    seasonId: "spring" | "summer" | "autumn" | "winter";
    dayPeriodId: "deep_night" | "morning" | "afternoon" | "evening";
    count: number;
  }>();
  for (const item of generateP003DifferentialCases()) {
    const key = `${item.stratum.eraId}|${item.stratum.seasonId}|${item.stratum.dayPeriodId}`;
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, {
      eraId: item.stratum.eraId,
      seasonId: item.stratum.seasonId,
      dayPeriodId: item.stratum.dayPeriodId,
      count: 1
    });
  }
  return [...counts.values()];
}

export async function createP003EngineeringReport(options: {
  internalDiagnostic: P003DeterminismDiagnosticEnvelope;
  externalInput: P003ExternalDifferentialInputEnvelope;
  externalResult: P003ExternalDifferentialResultEnvelope;
}): Promise<P003EngineeringReportEnvelope> {
  const internal = await preflightP003DeterminismDiagnostic(options.internalDiagnostic);
  const externalInput = await preflightP003ExternalDifferentialInput(options.externalInput);
  const evaluation = await preflightP003ExternalDifferentialResults({
    input: externalInput,
    result: options.externalResult,
    internalDiagnostic: internal
  });
  const externalResult = p003ExternalDifferentialResultEnvelopeSchema.parse(options.externalResult);
  if (!internal.payload.completePlanExecuted || internal.payload.executedCaseCount !== P003_TARGET_CASE_COUNT) {
    throw new P003EngineeringReportError("INCOMPLETE_RUN", "工程报告只能由完整 20,000 例两遍执行生成");
  }
  if (externalInput.payload.caseCount !== P003_TARGET_CASE_COUNT || externalResult.payload.counts.total !== P003_TARGET_CASE_COUNT) {
    throw new P003EngineeringReportError("INCOMPLETE_RUN", "工程报告要求外部差分完整覆盖 20,000 个输入");
  }

  const generated = generateP003DifferentialCases();
  const generatedById = new Map(generated.map((item) => [item.caseId, item]));
  const internalById = new Map(internal.payload.cases.map((item) => [item.caseId, item]));
  const externalInputById = new Map(externalInput.payload.cases.map((item) => [item.caseId, item]));

  const internalExceptions = internal.payload.cases
    .filter((item) => item.status !== "deterministic")
    .map((item) => {
      const generatedCase = generatedById.get(item.caseId);
      if (!generatedCase) throw new P003EngineeringReportError("CASE_MISMATCH", `缺少固定输入 ${item.caseId}`);
      return internalExceptionSchema.parse({
        input: publicInput(generatedCase, item.inputDigest),
        status: item.status,
        mismatchFields: item.mismatchFields,
        firstSnapshotDigest: item.firstPass.snapshotDigest,
        secondSnapshotDigest: item.secondPass.snapshotDigest,
        firstError: errorSummary(item.firstPass),
        secondError: errorSummary(item.secondPass)
      });
    });

  const externalExceptions = externalResult.payload.results.flatMap((item) => {
    if (item.status === "matched") return [];
    const generatedCase = generatedById.get(item.caseId);
    const inputCase = externalInputById.get(item.caseId);
    if (!generatedCase || !inputCase) throw new P003EngineeringReportError("CASE_MISMATCH", `外部差分缺少固定输入 ${item.caseId}`);
    const input = publicInput(generatedCase, inputCase.inputDigest);
    if (item.status === "unsupported") {
      return [externalExceptionSchema.parse({
        input,
        status: item.status,
        unsupportedCode: item.unsupportedCode,
        reason: item.reason
      })];
    }
    const expectedCalendar = expectedCalendarFromDiagnostic(internalById.get(item.caseId)!);
    if (!expectedCalendar) throw new P003EngineeringReportError("CASE_MISMATCH", `差异案例 ${item.caseId} 缺少内部历法参考`);
    return [externalExceptionSchema.parse({
      input,
      status: item.status,
      expectedCalendar,
      observedCalendar: item.observedCalendar,
      mismatchFields: item.mismatchFields,
      differenceClass: item.differenceClass,
      explanation: item.explanation
    })];
  });

  const payload = p003EngineeringReportPayloadSchema.parse({
    format: P003_ENGINEERING_REPORT_FORMAT,
    formatVersion: P003_ENGINEERING_REPORT_VERSION,
    classification: P003_DIAGNOSTIC_CLASSIFICATION,
    plan: {
      planId: P003_DIFFERENTIAL_PLAN_ID,
      planDigest: await digestP003DifferentialPlan(),
      generatorVersion: P003_GENERATOR_VERSION,
      seed: P003_DIFFERENTIAL_SEED,
      targetCaseCount: P003_TARGET_CASE_COUNT,
      inputCorpusDigest: externalInput.digest,
      strata: canonicalStrata()
    },
    internalDeterminism: {
      diagnosticDigest: internal.digest,
      runCount: internal.payload.runCount,
      completePlanExecuted: internal.payload.completePlanExecuted,
      counts: internal.payload.counts,
      diagnosticPassed: internal.payload.diagnosticPassed,
      exceptions: internalExceptions
    },
    calendarIndependentDifferential: {
      scope: "gregorian_to_lunisolar_date_only",
      inputBatchDigest: externalInput.digest,
      resultBatchDigest: externalResult.digest,
      tool: externalResult.payload.tool,
      counts: evaluation.counts,
      coverageComplete: evaluation.counts.unsupported === 0,
      diagnosticPassed: evaluation.diagnosticPassed,
      exceptions: externalExceptions
    },
    releaseBoundary: {
      countsAsVerifiedGold: false,
      verifiedGoldDelta: 0,
      fullP003GatePassed: false,
      notice: "两遍复算只证明内部确定性；.NET 只差分公历转农历日期字段，二者都不替代 360 例现实审核金标或完整四柱独立真值。"
    }
  });
  return p003EngineeringReportEnvelopeSchema.parse({ payload, digest: await sha256Hex(payload) });
}

export async function preflightP003EngineeringReport(raw: string | unknown): Promise<P003EngineeringReportEnvelope> {
  let parsedRaw: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsedRaw = JSON.parse(raw) as unknown;
    } catch {
      throw new P003EngineeringReportError("DIGEST_MISMATCH", "P0-03 工程报告不是合法 JSON");
    }
  }
  const envelope = p003EngineeringReportEnvelopeSchema.parse(parsedRaw);
  if (await sha256Hex(envelope.payload) !== envelope.digest) {
    throw new P003EngineeringReportError("DIGEST_MISMATCH", "P0-03 工程报告摘要不匹配");
  }
  if (envelope.payload.plan.planDigest !== await digestP003DifferentialPlan()) {
    throw new P003EngineeringReportError("DIGEST_MISMATCH", "P0-03 工程报告不属于当前固定计划");
  }
  if (canonicalStringify(envelope.payload.plan.strata) !== canonicalStringify(canonicalStrata())) {
    throw new P003EngineeringReportError("CASE_MISMATCH", "P0-03 工程报告的分层清单不是当前固定生成集");
  }
  const expected = new Map(generateP003DifferentialCases().map((item) => [item.caseId, item]));
  for (const exception of [
    ...envelope.payload.internalDeterminism.exceptions,
    ...envelope.payload.calendarIndependentDifferential.exceptions
  ]) {
    const generated = expected.get(exception.input.caseId);
    if (!generated || generated.input.date !== exception.input.date || generated.input.time !== exception.input.time
      || generated.input.sex !== exception.input.sex || generated.input.timeZone !== exception.input.timeZone
      || generated.stratum.eraId !== exception.input.stratum.eraId
      || generated.stratum.seasonId !== exception.input.stratum.seasonId
      || generated.stratum.dayPeriodId !== exception.input.stratum.dayPeriodId
      || await digestP003GeneratedCase(generated) !== exception.input.inputDigest) {
      throw new P003EngineeringReportError("CASE_MISMATCH", `异常明细 ${exception.input.caseId} 不属于固定生成集`);
    }
  }
  return envelope;
}

export function serializeP003EngineeringReport(envelope: P003EngineeringReportEnvelope): string {
  return `${canonicalStringify(p003EngineeringReportEnvelopeSchema.parse(envelope))}\n`;
}
