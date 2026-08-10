import { calculateChart } from "@hakimi/bazi-core";
import {
  birthInputSchema,
  buildHashableBirthInput,
  type BirthInput,
  type CalculatedChart
} from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { z } from "zod";
import rawPlan from "../fixtures/p0-03-differential-plan.v1.json";

export const P003_DIFFERENTIAL_PLAN_ID = "hakimi-p0-03-differential-plan-v1" as const;
export const P003_GENERATOR_VERSION = "hakimi-p0-03-stratified-birth-input-generator@1.0.0" as const;
export const P003_DIFFERENTIAL_SEED = 2_654_435_769 as const;
export const P003_TARGET_CASE_COUNT = 20_000 as const;
export const P003_DIAGNOSTIC_CLASSIFICATION = "engineering_diagnostic_only" as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const CASE_ID_PATTERN = /^p003-[0-9]{5}$/;
const BATCH_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,119}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GAN_ZHI_PATTERN = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;
const SEXES = ["male", "female", "unspecified"] as const;
const CORE_MISMATCH_FIELDS = [
  "result_hash",
  "core_result_digest",
  "year_pillar",
  "month_pillar",
  "day_pillar",
  "hour_pillar"
] as const;
export const P003_EXTERNAL_CALENDAR_FIELDS = ["lunar_date", "lunar_leap_month"] as const;
export const P003_EXTERNAL_DIFFERENCE_CLASSES = [
  "unresolved_calendar_table_difference",
  "authority_table_matches_current_adapter",
  "test_harness_error"
] as const;

const eraStratumSchema = z.strictObject({
  id: z.string().regex(/^era_[0-9]{4}_[0-9]{4}$/),
  fromYear: z.number().int().min(1900).max(2100),
  toYear: z.number().int().min(1900).max(2100)
}).refine((value) => value.fromYear <= value.toYear, {
  path: ["toYear"],
  message: "年代分层的结束年不能早于开始年"
});

const seasonStratumSchema = z.strictObject({
  id: z.enum(["spring", "summer", "autumn", "winter"]),
  months: z.array(z.number().int().min(1).max(12)).length(3)
});

const dayPeriodStratumSchema = z.strictObject({
  id: z.enum(["deep_night", "morning", "afternoon", "evening"]),
  startHourInclusive: z.number().int().min(0).max(23),
  endHourInclusive: z.number().int().min(0).max(23)
}).refine((value) => value.startHourInclusive <= value.endHourInclusive, {
  path: ["endHourInclusive"],
  message: "昼夜分层的结束小时不能早于开始小时"
});

export const p003DifferentialPlanSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0"),
  planId: z.literal(P003_DIFFERENTIAL_PLAN_ID),
  generatorVersion: z.literal(P003_GENERATOR_VERSION),
  seed: z.literal(P003_DIFFERENTIAL_SEED),
  targetCaseCount: z.literal(P003_TARGET_CASE_COUNT),
  calendarFrame: z.literal("fixed_utc_plus_08"),
  calendarType: z.literal("gregorian"),
  timeZone: z.literal("Etc/GMT-8"),
  utcOffset: z.literal("+08:00"),
  timePrecision: z.literal("exact_second"),
  casesPerCell: z.literal(250),
  location: z.strictObject({
    label: z.literal("固定 UTC+08:00 工程诊断框架"),
    latitude: z.null(),
    longitude: z.null(),
    precision: z.literal("unknown")
  }),
  eraStrata: z.array(eraStratumSchema).length(5),
  seasonStrata: z.array(seasonStratumSchema).length(4),
  dayPeriodStrata: z.array(dayPeriodStratumSchema).length(4)
}).superRefine((plan, context) => {
  const eras = [...plan.eraStrata].sort((left, right) => left.fromYear - right.fromYear);
  if (eras[0]?.fromYear !== 1900 || eras.at(-1)?.toYear !== 2100) {
    context.addIssue({ code: "custom", path: ["eraStrata"], message: "年代分层必须覆盖 1900—2100" });
  }
  for (let index = 1; index < eras.length; index += 1) {
    if (eras[index]!.fromYear !== eras[index - 1]!.toYear + 1) {
      context.addIssue({ code: "custom", path: ["eraStrata"], message: "年代分层必须无缝、不重叠" });
      break;
    }
  }
  const months = plan.seasonStrata.flatMap((item) => item.months).sort((left, right) => left - right);
  if (canonicalStringify(months) !== canonicalStringify(Array.from({ length: 12 }, (_, index) => index + 1))) {
    context.addIssue({ code: "custom", path: ["seasonStrata"], message: "四季分层必须各自独立并完整覆盖 12 个月" });
  }
  const hours = plan.dayPeriodStrata
    .flatMap((item) => Array.from(
      { length: item.endHourInclusive - item.startHourInclusive + 1 },
      (_, index) => item.startHourInclusive + index
    ))
    .sort((left, right) => left - right);
  if (canonicalStringify(hours) !== canonicalStringify(Array.from({ length: 24 }, (_, index) => index))) {
    context.addIssue({ code: "custom", path: ["dayPeriodStrata"], message: "昼夜分层必须各自独立并完整覆盖 24 小时" });
  }
  const expectedCount = plan.eraStrata.length
    * plan.seasonStrata.length
    * plan.dayPeriodStrata.length
    * plan.casesPerCell;
  if (expectedCount !== plan.targetCaseCount) {
    context.addIssue({ code: "custom", path: ["targetCaseCount"], message: "分层单元数与目标案例数不守恒" });
  }
});

export type P003DifferentialPlan = z.infer<typeof p003DifferentialPlanSchema>;
export const P003_DIFFERENTIAL_PLAN: P003DifferentialPlan = p003DifferentialPlanSchema.parse(rawPlan);

const generatedStratumSchema = z.strictObject({
  eraId: z.string().regex(/^era_[0-9]{4}_[0-9]{4}$/),
  seasonId: z.enum(["spring", "summer", "autumn", "winter"]),
  dayPeriodId: z.enum(["deep_night", "morning", "afternoon", "evening"]),
  ordinalInCell: z.number().int().min(0).max(249)
});

export const p003GeneratedCaseSchema = z.strictObject({
  caseId: z.string().regex(CASE_ID_PATTERN),
  generatorVersion: z.literal(P003_GENERATOR_VERSION),
  seed: z.literal(P003_DIFFERENTIAL_SEED),
  stratum: generatedStratumSchema,
  input: birthInputSchema
});

export type P003GeneratedCase = z.infer<typeof p003GeneratedCaseSchema>;

function mix32(rawValue: number): number {
  let value = rawValue >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

function createUint32Generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  };
}

function daysInGregorianMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function semanticInputKey(input: BirthInput): string {
  return canonicalStringify(buildHashableBirthInput(input));
}

let fixedGeneratedCaseCache: P003GeneratedCase[] | null = null;

/**
 * Generates the complete, fixed P0-03 population. Every cell in
 * era x season x day-period contributes exactly 250 cases. The PRNG and order
 * are part of GENERATOR_VERSION; changing either requires a new fixture.
 */
export function generateP003DifferentialCases(
  raw: P003DifferentialPlan = P003_DIFFERENTIAL_PLAN
): P003GeneratedCase[] {
  const plan = p003DifferentialPlanSchema.parse(raw);
  if (fixedGeneratedCaseCache) return structuredClone(fixedGeneratedCaseCache);
  const generated: P003GeneratedCase[] = [];
  const globalSemanticKeys = new Set<string>();

  for (const [eraIndex, era] of plan.eraStrata.entries()) {
    for (const [seasonIndex, season] of plan.seasonStrata.entries()) {
      for (const [dayPeriodIndex, dayPeriod] of plan.dayPeriodStrata.entries()) {
        const cellSeed = mix32(
          plan.seed
          ^ Math.imul(eraIndex + 1, 0x9e3779b1)
          ^ Math.imul(seasonIndex + 1, 0x85ebca6b)
          ^ Math.imul(dayPeriodIndex + 1, 0xc2b2ae35)
        );
        const nextUint32 = createUint32Generator(cellSeed);
        const cellKeys = new Set<string>();
        let attempts = 0;

        while (cellKeys.size < plan.casesPerCell) {
          attempts += 1;
          if (attempts > plan.casesPerCell * 100) {
            throw new P003DifferentialError("GENERATOR_EXHAUSTED", "固定种子生成器未能在限制内生成唯一案例");
          }
          const year = era.fromYear + (nextUint32() % (era.toYear - era.fromYear + 1));
          const month = season.months[nextUint32() % season.months.length]!;
          const day = 1 + (nextUint32() % daysInGregorianMonth(year, month));
          const hour = dayPeriod.startHourInclusive
            + (nextUint32() % (dayPeriod.endHourInclusive - dayPeriod.startHourInclusive + 1));
          const minute = nextUint32() % 60;
          const second = nextUint32() % 60;
          const globalOrdinal = generated.length;
          const caseId = `p003-${String(globalOrdinal + 1).padStart(5, "0")}`;
          const input = birthInputSchema.parse({
            schemaVersion: "1.0.0",
            calendarType: plan.calendarType,
            date: `${year}-${pad2(month)}-${pad2(day)}`,
            time: `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`,
            timePrecision: plan.timePrecision,
            timeZone: plan.timeZone,
            sex: SEXES[(globalOrdinal + (nextUint32() % SEXES.length)) % SEXES.length],
            lunarLeapMonth: false,
            location: plan.location,
            sourceNote: `${plan.generatorVersion}:${caseId}`
          });
          const inputKey = semanticInputKey(input);
          if (cellKeys.has(inputKey) || globalSemanticKeys.has(inputKey)) continue;

          const generatedCase = p003GeneratedCaseSchema.parse({
            caseId,
            generatorVersion: plan.generatorVersion,
            seed: plan.seed,
            stratum: {
              eraId: era.id,
              seasonId: season.id,
              dayPeriodId: dayPeriod.id,
              ordinalInCell: cellKeys.size
            },
            input
          });
          cellKeys.add(inputKey);
          globalSemanticKeys.add(inputKey);
          generated.push(generatedCase);
        }
      }
    }
  }

  if (generated.length !== plan.targetCaseCount || globalSemanticKeys.size !== plan.targetCaseCount) {
    throw new P003DifferentialError("COUNT_INVARIANT_FAILED", "P0-03 固定生成集的数量或唯一性不守恒");
  }
  fixedGeneratedCaseCache = generated;
  return structuredClone(fixedGeneratedCaseCache);
}

export async function digestP003DifferentialPlan(
  plan: P003DifferentialPlan = P003_DIFFERENTIAL_PLAN
): Promise<string> {
  return sha256Hex(p003DifferentialPlanSchema.parse(plan));
}

export async function digestP003GeneratedCase(generatedCase: P003GeneratedCase): Promise<string> {
  return sha256Hex({
    planId: P003_DIFFERENTIAL_PLAN_ID,
    generatorVersion: generatedCase.generatorVersion,
    seed: generatedCase.seed,
    caseId: generatedCase.caseId,
    stratum: generatedCase.stratum,
    input: buildHashableBirthInput(generatedCase.input)
  });
}

const pillarsSchema = z.strictObject({
  year: z.string().regex(GAN_ZHI_PATTERN),
  month: z.string().regex(GAN_ZHI_PATTERN),
  day: z.string().regex(GAN_ZHI_PATTERN),
  hour: z.string().regex(GAN_ZHI_PATTERN)
});

export const p003CoreResultSchema = z.strictObject({
  pillars: pillarsSchema,
  calendar: z.strictObject({
    solarText: z.string().min(1),
    lunarText: z.string().min(1),
    lunarYear: z.number().int(),
    lunarMonth: z.number().int(),
    lunarDay: z.number().int(),
    isLeapMonth: z.boolean(),
    previousJie: z.string().nullable(),
    nextJie: z.string().nullable()
  }),
  timeCalibration: z.strictObject({
    activeWallTime: z.string().min(1),
    utcInstant: z.string().nullable(),
    utcOffset: z.string().nullable()
  }),
  ruleProfileDigest: z.string().regex(SHA256_PATTERN),
  luckCycleRuleDigest: z.string().regex(SHA256_PATTERN)
});

export type P003CoreResult = z.infer<typeof p003CoreResultSchema>;

function projectCoreResult(chart: CalculatedChart): P003CoreResult {
  if (!chart.manifest.luckCycleRuleDigest) {
    throw new P003DifferentialError("MISSING_CORE_DIGEST", "排盘结果缺少 luckCycleRuleDigest");
  }
  return p003CoreResultSchema.parse({
    pillars: {
      year: chart.facts.pillars.year.ganZhi,
      month: chart.facts.pillars.month.ganZhi,
      day: chart.facts.pillars.day.ganZhi,
      hour: chart.facts.pillars.hour.ganZhi
    },
    calendar: chart.facts.calendar,
    timeCalibration: {
      activeWallTime: chart.timeCalibration.activeWallTime,
      utcInstant: chart.timeCalibration.utcInstant,
      utcOffset: chart.timeCalibration.utcOffset
    },
    ruleProfileDigest: chart.manifest.ruleProfileDigest,
    luckCycleRuleDigest: chart.manifest.luckCycleRuleDigest
  });
}

const calculatedSnapshotSchema = z.strictObject({
  status: z.literal("calculated"),
  resultHash: z.string().regex(SHA256_PATTERN),
  coreResult: p003CoreResultSchema,
  coreResultDigest: z.string().regex(SHA256_PATTERN),
  snapshotDigest: z.string().regex(SHA256_PATTERN)
});

const failedSnapshotSchema = z.strictObject({
  status: z.literal("calculation_error"),
  errorName: z.string().min(1).max(120),
  errorMessage: z.string().min(1).max(2_000),
  snapshotDigest: z.string().regex(SHA256_PATTERN)
});

const passSnapshotSchema = z.discriminatedUnion("status", [calculatedSnapshotSchema, failedSnapshotSchema]);
type PassSnapshot = z.infer<typeof passSnapshotSchema>;

const caseDiagnosticSchema = z.strictObject({
  caseId: z.string().regex(CASE_ID_PATTERN),
  inputDigest: z.string().regex(SHA256_PATTERN),
  status: z.enum(["deterministic", "mismatch", "calculation_error"]),
  firstPass: passSnapshotSchema,
  secondPass: passSnapshotSchema,
  mismatchFields: z.array(z.enum(CORE_MISMATCH_FIELDS)),
  diagnosticDigest: z.string().regex(SHA256_PATTERN)
});

const diagnosticCountsSchema = z.strictObject({
  executed: z.number().int().min(1).max(P003_TARGET_CASE_COUNT),
  deterministic: z.number().int().min(0),
  mismatch: z.number().int().min(0),
  calculationError: z.number().int().min(0)
});

export const p003DeterminismDiagnosticPayloadSchema = z.strictObject({
  format: z.literal("hakimi-p0-03-determinism-diagnostic"),
  formatVersion: z.literal("1.0.0"),
  classification: z.literal(P003_DIAGNOSTIC_CLASSIFICATION),
  planId: z.literal(P003_DIFFERENTIAL_PLAN_ID),
  planDigest: z.string().regex(SHA256_PATTERN),
  generatorVersion: z.literal(P003_GENERATOR_VERSION),
  seed: z.literal(P003_DIFFERENTIAL_SEED),
  targetCaseCount: z.literal(P003_TARGET_CASE_COUNT),
  executedCaseCount: z.number().int().min(1).max(P003_TARGET_CASE_COUNT),
  runCount: z.literal(2),
  completePlanExecuted: z.boolean(),
  diagnosticPassed: z.boolean(),
  counts: diagnosticCountsSchema,
  cases: z.array(caseDiagnosticSchema).min(1).max(P003_TARGET_CASE_COUNT),
  countsAsVerifiedGold: z.literal(false),
  verifiedGoldDelta: z.literal(0),
  fullP003GatePassed: z.literal(false)
}).superRefine((payload, context) => {
  const statusCounts = { deterministic: 0, mismatch: 0, calculationError: 0 };
  for (const item of payload.cases) {
    if (item.status === "deterministic") statusCounts.deterministic += 1;
    else if (item.status === "mismatch") statusCounts.mismatch += 1;
    else statusCounts.calculationError += 1;
  }
  if (
    payload.executedCaseCount !== payload.cases.length
    || payload.counts.executed !== payload.cases.length
    || payload.counts.deterministic !== statusCounts.deterministic
    || payload.counts.mismatch !== statusCounts.mismatch
    || payload.counts.calculationError !== statusCounts.calculationError
    || payload.counts.deterministic + payload.counts.mismatch + payload.counts.calculationError !== payload.counts.executed
  ) {
    context.addIssue({ code: "custom", path: ["counts"], message: "内部诊断计数不守恒" });
  }
  if (payload.completePlanExecuted !== (payload.executedCaseCount === payload.targetCaseCount)) {
    context.addIssue({ code: "custom", path: ["completePlanExecuted"], message: "完整执行标记与执行数不一致" });
  }
  if (payload.diagnosticPassed !== (statusCounts.mismatch === 0 && statusCounts.calculationError === 0)) {
    context.addIssue({ code: "custom", path: ["diagnosticPassed"], message: "诊断结论与案例分类不一致" });
  }
});

export const p003DeterminismDiagnosticEnvelopeSchema = z.strictObject({
  payload: p003DeterminismDiagnosticPayloadSchema,
  digest: z.string().regex(SHA256_PATTERN)
});

export type P003DeterminismDiagnosticEnvelope = z.infer<typeof p003DeterminismDiagnosticEnvelopeSchema>;
export type P003Calculator = (input: BirthInput) => Promise<CalculatedChart>;

export type P003DeterminismOptions = {
  cases?: readonly P003GeneratedCase[];
  caseLimit?: number;
  concurrency?: number;
  calculator?: P003Calculator;
};

async function createCalculatedSnapshot(chart: CalculatedChart): Promise<PassSnapshot> {
  const coreResult = projectCoreResult(chart);
  const coreResultDigest = await sha256Hex(coreResult);
  const stable = {
    status: "calculated" as const,
    resultHash: chart.manifest.resultHash,
    coreResult,
    coreResultDigest
  };
  return calculatedSnapshotSchema.parse({ ...stable, snapshotDigest: await sha256Hex(stable) });
}

async function createFailedSnapshot(error: unknown): Promise<PassSnapshot> {
  const stable = {
    status: "calculation_error" as const,
    errorName: error instanceof Error && error.name ? error.name.slice(0, 120) : "UnknownError",
    errorMessage: error instanceof Error && error.message ? error.message.slice(0, 2_000) : "Unknown calculation failure"
  };
  return failedSnapshotSchema.parse({ ...stable, snapshotDigest: await sha256Hex(stable) });
}

async function mapWithConcurrency<T, R>(
  input: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const output = new Array<R>(input.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, input.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= input.length) return;
      output[index] = await task(input[index]!, index);
    }
  });
  await Promise.all(workers);
  return output;
}

async function runCalculationPass(
  cases: readonly P003GeneratedCase[],
  calculator: P003Calculator,
  concurrency: number
): Promise<PassSnapshot[]> {
  return mapWithConcurrency(cases, concurrency, async (generatedCase) => {
    try {
      return await createCalculatedSnapshot(await calculator(generatedCase.input));
    } catch (error) {
      return createFailedSnapshot(error);
    }
  });
}

function calculatedMismatchFields(first: PassSnapshot, second: PassSnapshot): Array<typeof CORE_MISMATCH_FIELDS[number]> {
  if (first.status !== "calculated" || second.status !== "calculated") return [];
  const fields: Array<typeof CORE_MISMATCH_FIELDS[number]> = [];
  if (first.resultHash !== second.resultHash) fields.push("result_hash");
  if (first.coreResultDigest !== second.coreResultDigest) fields.push("core_result_digest");
  if (first.coreResult.pillars.year !== second.coreResult.pillars.year) fields.push("year_pillar");
  if (first.coreResult.pillars.month !== second.coreResult.pillars.month) fields.push("month_pillar");
  if (first.coreResult.pillars.day !== second.coreResult.pillars.day) fields.push("day_pillar");
  if (first.coreResult.pillars.hour !== second.coreResult.pillars.hour) fields.push("hour_pillar");
  return fields;
}

function diagnosticStatus(first: PassSnapshot, second: PassSnapshot): "deterministic" | "mismatch" | "calculation_error" {
  if (first.status !== "calculated" || second.status !== "calculated") return "calculation_error";
  return first.snapshotDigest === second.snapshotDigest ? "deterministic" : "mismatch";
}

function validateGeneratedCaseSelection(rawCases: readonly P003GeneratedCase[]): P003GeneratedCase[] {
  if (rawCases.length < 1 || rawCases.length > P003_TARGET_CASE_COUNT) {
    throw new P003DifferentialError("INVALID_SELECTION", "诊断案例数必须位于 1—20,000");
  }
  const expectedById = new Map(generateP003DifferentialCases().map((item) => [item.caseId, item]));
  const seen = new Set<string>();
  return rawCases.map((rawCase) => {
    const parsed = p003GeneratedCaseSchema.parse(rawCase);
    if (seen.has(parsed.caseId)) throw new P003DifferentialError("DUPLICATE_CASE_ID", `重复案例 ID: ${parsed.caseId}`);
    seen.add(parsed.caseId);
    const expected = expectedById.get(parsed.caseId);
    if (!expected || canonicalStringify(expected) !== canonicalStringify(parsed)) {
      throw new P003DifferentialError("GENERATED_CASE_MISMATCH", `案例 ${parsed.caseId} 不属于当前固定种子生成集`);
    }
    return parsed;
  });
}

/** Default execution evaluates all 20,000 inputs twice; tests may pass a limit. */
export async function runP003DeterminismDiagnostic(
  options: P003DeterminismOptions = {}
): Promise<P003DeterminismDiagnosticEnvelope> {
  if (options.cases && options.caseLimit !== undefined) {
    throw new P003DifferentialError("INVALID_SELECTION", "cases 与 caseLimit 不能同时指定");
  }
  const caseLimit = options.caseLimit ?? P003_TARGET_CASE_COUNT;
  if (!Number.isInteger(caseLimit) || caseLimit < 1 || caseLimit > P003_TARGET_CASE_COUNT) {
    throw new P003DifferentialError("INVALID_SELECTION", "caseLimit 必须是 1—20,000 的整数");
  }
  const concurrency = options.concurrency ?? 8;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
    throw new P003DifferentialError("INVALID_CONCURRENCY", "concurrency 必须是 1—32 的整数");
  }
  const cases = options.cases
    ? validateGeneratedCaseSelection(options.cases)
    : generateP003DifferentialCases().slice(0, caseLimit);
  const calculator = options.calculator ?? ((input: BirthInput) => calculateChart(input, WORKING_DEFAULT_RULE_PROFILE));
  const [firstPass, secondPass] = await (async () => {
    const first = await runCalculationPass(cases, calculator, concurrency);
    const second = await runCalculationPass(cases, calculator, concurrency);
    return [first, second] as const;
  })();

  const diagnostics = await Promise.all(cases.map(async (generatedCase, index) => {
    const first = firstPass[index]!;
    const second = secondPass[index]!;
    const status = diagnosticStatus(first, second);
    const mismatchFields = status === "mismatch" ? calculatedMismatchFields(first, second) : [];
    const stable = {
      caseId: generatedCase.caseId,
      inputDigest: await digestP003GeneratedCase(generatedCase),
      status,
      firstPass: first,
      secondPass: second,
      mismatchFields
    };
    return caseDiagnosticSchema.parse({ ...stable, diagnosticDigest: await sha256Hex(stable) });
  }));
  const counts = {
    executed: diagnostics.length,
    deterministic: diagnostics.filter((item) => item.status === "deterministic").length,
    mismatch: diagnostics.filter((item) => item.status === "mismatch").length,
    calculationError: diagnostics.filter((item) => item.status === "calculation_error").length
  };
  const payload = p003DeterminismDiagnosticPayloadSchema.parse({
    format: "hakimi-p0-03-determinism-diagnostic",
    formatVersion: "1.0.0",
    classification: P003_DIAGNOSTIC_CLASSIFICATION,
    planId: P003_DIFFERENTIAL_PLAN_ID,
    planDigest: await digestP003DifferentialPlan(),
    generatorVersion: P003_GENERATOR_VERSION,
    seed: P003_DIFFERENTIAL_SEED,
    targetCaseCount: P003_TARGET_CASE_COUNT,
    executedCaseCount: diagnostics.length,
    runCount: 2,
    completePlanExecuted: diagnostics.length === P003_TARGET_CASE_COUNT,
    diagnosticPassed: counts.mismatch === 0 && counts.calculationError === 0,
    counts,
    cases: diagnostics,
    countsAsVerifiedGold: false,
    verifiedGoldDelta: 0,
    fullP003GatePassed: false
  });
  return p003DeterminismDiagnosticEnvelopeSchema.parse({ payload, digest: await sha256Hex(payload) });
}

function parseJsonInput(raw: string | unknown, label: string): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new P003DifferentialError("INVALID_JSON", `${label} 不是合法 JSON`);
  }
}

async function verifyPassSnapshot(snapshot: PassSnapshot): Promise<void> {
  if (snapshot.status === "calculated") {
    if (await sha256Hex(snapshot.coreResult) !== snapshot.coreResultDigest) {
      throw new P003DifferentialError("INNER_DIGEST_MISMATCH", "核心结果摘要不匹配");
    }
    const { snapshotDigest, ...stable } = snapshot;
    if (await sha256Hex(stable) !== snapshotDigest) {
      throw new P003DifferentialError("INNER_DIGEST_MISMATCH", "单次排盘快照摘要不匹配");
    }
    return;
  }
  const { snapshotDigest, ...stable } = snapshot;
  if (await sha256Hex(stable) !== snapshotDigest) {
    throw new P003DifferentialError("INNER_DIGEST_MISMATCH", "排盘失败快照摘要不匹配");
  }
}

export async function preflightP003DeterminismDiagnostic(
  raw: string | unknown
): Promise<P003DeterminismDiagnosticEnvelope> {
  const envelope = p003DeterminismDiagnosticEnvelopeSchema.parse(parseJsonInput(raw, "P0-03 诊断报告"));
  if (await sha256Hex(envelope.payload) !== envelope.digest) {
    throw new P003DifferentialError("DIGEST_MISMATCH", "P0-03 诊断报告摘要不匹配");
  }
  if (envelope.payload.planDigest !== await digestP003DifferentialPlan()) {
    throw new P003DifferentialError("PLAN_MISMATCH", "P0-03 诊断报告不属于当前固定计划");
  }
  const expectedById = new Map(generateP003DifferentialCases().map((item) => [item.caseId, item]));
  const seen = new Set<string>();
  for (const diagnostic of envelope.payload.cases) {
    if (seen.has(diagnostic.caseId)) throw new P003DifferentialError("DUPLICATE_CASE_ID", `重复案例 ID: ${diagnostic.caseId}`);
    seen.add(diagnostic.caseId);
    const expected = expectedById.get(diagnostic.caseId);
    if (!expected || await digestP003GeneratedCase(expected) !== diagnostic.inputDigest) {
      throw new P003DifferentialError("GENERATED_CASE_MISMATCH", `案例 ${diagnostic.caseId} 的固定输入摘要不匹配`);
    }
    await verifyPassSnapshot(diagnostic.firstPass);
    await verifyPassSnapshot(diagnostic.secondPass);
    const expectedStatus = diagnosticStatus(diagnostic.firstPass, diagnostic.secondPass);
    const expectedMismatchFields = expectedStatus === "mismatch"
      ? calculatedMismatchFields(diagnostic.firstPass, diagnostic.secondPass)
      : [];
    if (diagnostic.status !== expectedStatus || canonicalStringify(diagnostic.mismatchFields) !== canonicalStringify(expectedMismatchFields)) {
      throw new P003DifferentialError("CLASSIFICATION_MISMATCH", `案例 ${diagnostic.caseId} 的确定性分类不正确`);
    }
    const { diagnosticDigest, ...stable } = diagnostic;
    if (await sha256Hex(stable) !== diagnosticDigest) {
      throw new P003DifferentialError("INNER_DIGEST_MISMATCH", `案例 ${diagnostic.caseId} 的诊断摘要不匹配`);
    }
  }
  return envelope;
}

export function serializeP003DeterminismDiagnostic(envelope: P003DeterminismDiagnosticEnvelope): string {
  return `${canonicalStringify(p003DeterminismDiagnosticEnvelopeSchema.parse(envelope))}\n`;
}

const independentGregorianDateSchema = z.string().regex(DATE_PATTERN).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInGregorianMonth(year, month);
}, "外部差分日期必须是 1900—2100 的有效公历日期");

export const p003ExternalDifferentialInputCaseSchema = z.strictObject({
  caseId: z.string().regex(CASE_ID_PATTERN),
  inputDigest: z.string().regex(SHA256_PATTERN),
  frame: z.literal("fixed_utc_plus_08"),
  calendarType: z.literal("gregorian"),
  localDate: independentGregorianDateSchema,
  utcOffset: z.literal("+08:00"),
  stratum: generatedStratumSchema
});

export const p003ExternalDifferentialInputPayloadSchema = z.strictObject({
  format: z.literal("hakimi-p0-03-calendar-differential-input"),
  formatVersion: z.literal("1.0.0"),
  classification: z.literal(P003_DIAGNOSTIC_CLASSIFICATION),
  planId: z.literal(P003_DIFFERENTIAL_PLAN_ID),
  planDigest: z.string().regex(SHA256_PATTERN),
  generatorVersion: z.literal(P003_GENERATOR_VERSION),
  seed: z.literal(P003_DIFFERENTIAL_SEED),
  batchId: z.string().regex(BATCH_ID_PATTERN),
  caseCount: z.number().int().min(1).max(P003_TARGET_CASE_COUNT),
  cases: z.array(p003ExternalDifferentialInputCaseSchema).min(1).max(P003_TARGET_CASE_COUNT),
  countsAsVerifiedGold: z.literal(false),
  verifiedGoldDelta: z.literal(0),
  fullP003GatePassed: z.literal(false)
}).superRefine((payload, context) => {
  if (payload.caseCount !== payload.cases.length) {
    context.addIssue({ code: "custom", path: ["caseCount"], message: "外部差分输入计数不守恒" });
  }
  if (new Set(payload.cases.map((item) => item.caseId)).size !== payload.cases.length) {
    context.addIssue({ code: "custom", path: ["cases"], message: "外部差分输入不能包含重复案例 ID" });
  }
});

export const p003ExternalDifferentialInputEnvelopeSchema = z.strictObject({
  payload: p003ExternalDifferentialInputPayloadSchema,
  digest: z.string().regex(SHA256_PATTERN)
});

export type P003ExternalDifferentialInputEnvelope = z.infer<typeof p003ExternalDifferentialInputEnvelopeSchema>;

export async function createP003ExternalDifferentialInputEnvelope(options: {
  cases?: readonly P003GeneratedCase[];
  batchId?: string;
} = {}): Promise<P003ExternalDifferentialInputEnvelope> {
  const cases = validateGeneratedCaseSelection(options.cases ?? generateP003DifferentialCases());
  const externalCases = await Promise.all(cases.map(async (generatedCase) => ({
    caseId: generatedCase.caseId,
    inputDigest: await digestP003GeneratedCase(generatedCase),
    frame: "fixed_utc_plus_08" as const,
    calendarType: "gregorian" as const,
    localDate: generatedCase.input.date,
    utcOffset: "+08:00" as const,
    stratum: generatedCase.stratum
  })));
  const payload = p003ExternalDifferentialInputPayloadSchema.parse({
    format: "hakimi-p0-03-calendar-differential-input",
    formatVersion: "1.0.0",
    classification: P003_DIAGNOSTIC_CLASSIFICATION,
    planId: P003_DIFFERENTIAL_PLAN_ID,
    planDigest: await digestP003DifferentialPlan(),
    generatorVersion: P003_GENERATOR_VERSION,
    seed: P003_DIFFERENTIAL_SEED,
    batchId: options.batchId ?? `p003-fixed-seed-${externalCases.length}`,
    caseCount: externalCases.length,
    cases: externalCases,
    countsAsVerifiedGold: false,
    verifiedGoldDelta: 0,
    fullP003GatePassed: false
  });
  return p003ExternalDifferentialInputEnvelopeSchema.parse({ payload, digest: await sha256Hex(payload) });
}

function expectedExternalInputCase(generatedCase: P003GeneratedCase, inputDigest: string) {
  return {
    caseId: generatedCase.caseId,
    inputDigest,
    frame: "fixed_utc_plus_08",
    calendarType: "gregorian",
    localDate: generatedCase.input.date,
    utcOffset: "+08:00",
    stratum: generatedCase.stratum
  };
}

export async function preflightP003ExternalDifferentialInput(
  raw: string | unknown
): Promise<P003ExternalDifferentialInputEnvelope> {
  const envelope = p003ExternalDifferentialInputEnvelopeSchema.parse(parseJsonInput(raw, "P0-03 外部差分输入"));
  if (await sha256Hex(envelope.payload) !== envelope.digest) {
    throw new P003DifferentialError("DIGEST_MISMATCH", "P0-03 外部差分输入摘要不匹配");
  }
  if (envelope.payload.planDigest !== await digestP003DifferentialPlan()) {
    throw new P003DifferentialError("PLAN_MISMATCH", "P0-03 外部差分输入不属于当前固定计划");
  }
  const expectedById = new Map(generateP003DifferentialCases().map((item) => [item.caseId, item]));
  for (const externalCase of envelope.payload.cases) {
    const generatedCase = expectedById.get(externalCase.caseId);
    if (!generatedCase) throw new P003DifferentialError("GENERATED_CASE_MISMATCH", `未知案例 ID: ${externalCase.caseId}`);
    const expected = expectedExternalInputCase(generatedCase, await digestP003GeneratedCase(generatedCase));
    if (canonicalStringify(expected) !== canonicalStringify(externalCase)) {
      throw new P003DifferentialError("GENERATED_CASE_MISMATCH", `案例 ${externalCase.caseId} 的外部差分输入被改写`);
    }
  }
  return envelope;
}

export function serializeP003ExternalDifferentialInput(envelope: P003ExternalDifferentialInputEnvelope): string {
  return `${canonicalStringify(p003ExternalDifferentialInputEnvelopeSchema.parse(envelope))}\n`;
}

const independentLunarDateSchema = z.string().regex(DATE_PATTERN).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  return year >= 1899 && year <= 2101 && month >= 1 && month <= 12 && day >= 1 && day <= 30;
}, "外部差分农历日期必须是 YYYY-MM-DD，日不得超过 30");

const observedCalendarSchema = z.strictObject({
  lunarDate: independentLunarDateSchema,
  lunarLeapMonth: z.boolean()
});
const externalMatchedResultSchema = z.strictObject({
  caseId: z.string().regex(CASE_ID_PATTERN),
  status: z.literal("matched"),
  observedCalendar: observedCalendarSchema
});
const externalMismatchResultSchema = z.strictObject({
  caseId: z.string().regex(CASE_ID_PATTERN),
  status: z.literal("mismatch"),
  observedCalendar: observedCalendarSchema,
  mismatchFields: z.array(z.enum(P003_EXTERNAL_CALENDAR_FIELDS)).min(1).max(2),
  differenceClass: z.enum(P003_EXTERNAL_DIFFERENCE_CLASSES),
  explanation: z.string().trim().min(1).max(1_000)
}).superRefine((result, context) => {
  const indexes = result.mismatchFields.map((field) => P003_EXTERNAL_CALENDAR_FIELDS.indexOf(field));
  if (new Set(result.mismatchFields).size !== result.mismatchFields.length
    || indexes.some((value, index) => index > 0 && value <= indexes[index - 1]!)) {
    context.addIssue({ code: "custom", path: ["mismatchFields"], message: "mismatchFields 必须去重并按 lunar_date/lunar_leap_month 排序" });
  }
});
const externalUnsupportedResultSchema = z.strictObject({
  caseId: z.string().regex(CASE_ID_PATTERN),
  status: z.literal("unsupported"),
  unsupportedCode: z.enum([
    "date_out_of_range",
    "calendar_algorithm_unavailable",
    "fixed_plus08_frame_unsupported",
    "invalid_input",
    "runtime_failure"
  ]),
  reason: z.string().trim().min(1).max(1_000)
});

export const p003ExternalDifferentialResultItemSchema = z.discriminatedUnion("status", [
  externalMatchedResultSchema,
  externalMismatchResultSchema,
  externalUnsupportedResultSchema
]);

const externalToolSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(120),
  runtime: z.string().trim().min(1).max(200),
  sourceRef: z.string().trim().min(1).max(500)
});

const externalCountsSchema = z.strictObject({
  total: z.number().int().min(1).max(P003_TARGET_CASE_COUNT),
  matched: z.number().int().min(0),
  mismatch: z.number().int().min(0),
  unsupported: z.number().int().min(0)
});

export const p003ExternalDifferentialResultPayloadSchema = z.strictObject({
  format: z.literal("hakimi-p0-03-calendar-differential-result"),
  formatVersion: z.literal("1.0.0"),
  classification: z.literal(P003_DIAGNOSTIC_CLASSIFICATION),
  planId: z.literal(P003_DIFFERENTIAL_PLAN_ID),
  planDigest: z.string().regex(SHA256_PATTERN),
  generatorVersion: z.literal(P003_GENERATOR_VERSION),
  seed: z.literal(P003_DIFFERENTIAL_SEED),
  batchId: z.string().regex(BATCH_ID_PATTERN),
  inputBatchDigest: z.string().regex(SHA256_PATTERN),
  tool: externalToolSchema,
  counts: externalCountsSchema,
  results: z.array(p003ExternalDifferentialResultItemSchema).min(1).max(P003_TARGET_CASE_COUNT),
  countsAsVerifiedGold: z.literal(false),
  verifiedGoldDelta: z.literal(0),
  fullP003GatePassed: z.literal(false)
}).superRefine((payload, context) => {
  const actual = {
    total: payload.results.length,
    matched: payload.results.filter((item) => item.status === "matched").length,
    mismatch: payload.results.filter((item) => item.status === "mismatch").length,
    unsupported: payload.results.filter((item) => item.status === "unsupported").length
  };
  if (canonicalStringify(actual) !== canonicalStringify(payload.counts)) {
    context.addIssue({ code: "custom", path: ["counts"], message: "外部差分结果计数不守恒" });
  }
  if (new Set(payload.results.map((item) => item.caseId)).size !== payload.results.length) {
    context.addIssue({ code: "custom", path: ["results"], message: "外部差分结果不能包含重复案例 ID" });
  }
});

export const p003ExternalDifferentialResultEnvelopeSchema = z.strictObject({
  payload: p003ExternalDifferentialResultPayloadSchema,
  digest: z.string().regex(SHA256_PATTERN)
});

export type P003ExternalDifferentialResultItem = z.infer<typeof p003ExternalDifferentialResultItemSchema>;
export type P003ExternalDifferentialResultEnvelope = z.infer<typeof p003ExternalDifferentialResultEnvelopeSchema>;
export type P003ExternalTool = z.infer<typeof externalToolSchema>;

function countsForExternalResults(results: readonly P003ExternalDifferentialResultItem[]) {
  return {
    total: results.length,
    matched: results.filter((item) => item.status === "matched").length,
    mismatch: results.filter((item) => item.status === "mismatch").length,
    unsupported: results.filter((item) => item.status === "unsupported").length
  };
}

export async function createP003ExternalDifferentialResultEnvelope(options: {
  input: P003ExternalDifferentialInputEnvelope;
  tool: P003ExternalTool;
  results: readonly P003ExternalDifferentialResultItem[];
}): Promise<P003ExternalDifferentialResultEnvelope> {
  const input = await preflightP003ExternalDifferentialInput(options.input);
  const results = options.results.map((item) => p003ExternalDifferentialResultItemSchema.parse(item));
  const payload = p003ExternalDifferentialResultPayloadSchema.parse({
    format: "hakimi-p0-03-calendar-differential-result",
    formatVersion: "1.0.0",
    classification: P003_DIAGNOSTIC_CLASSIFICATION,
    planId: P003_DIFFERENTIAL_PLAN_ID,
    planDigest: input.payload.planDigest,
    generatorVersion: P003_GENERATOR_VERSION,
    seed: P003_DIFFERENTIAL_SEED,
    batchId: input.payload.batchId,
    inputBatchDigest: input.digest,
    tool: externalToolSchema.parse(options.tool),
    counts: countsForExternalResults(results),
    results,
    countsAsVerifiedGold: false,
    verifiedGoldDelta: 0,
    fullP003GatePassed: false
  });
  return p003ExternalDifferentialResultEnvelopeSchema.parse({ payload, digest: await sha256Hex(payload) });
}

function projectExternalCalendarReference(coreResult: P003CoreResult): z.infer<typeof observedCalendarSchema> {
  const month = Math.abs(coreResult.calendar.lunarMonth);
  return observedCalendarSchema.parse({
    lunarDate: `${coreResult.calendar.lunarYear}-${pad2(month)}-${pad2(coreResult.calendar.lunarDay)}`,
    lunarLeapMonth: coreResult.calendar.isLeapMonth
  });
}

function externalMismatchFields(
  expected: z.infer<typeof observedCalendarSchema>,
  observed: z.infer<typeof observedCalendarSchema>
) {
  const fields: Array<typeof P003_EXTERNAL_CALENDAR_FIELDS[number]> = [];
  if (expected.lunarDate !== observed.lunarDate) fields.push("lunar_date");
  if (expected.lunarLeapMonth !== observed.lunarLeapMonth) fields.push("lunar_leap_month");
  return fields;
}

export const p003ExternalDifferentialEvaluationSchema = z.strictObject({
  classification: z.literal(P003_DIAGNOSTIC_CLASSIFICATION),
  planId: z.literal(P003_DIFFERENTIAL_PLAN_ID),
  inputBatchDigest: z.string().regex(SHA256_PATTERN),
  resultBatchDigest: z.string().regex(SHA256_PATTERN),
  counts: externalCountsSchema,
  diagnosticPassed: z.boolean(),
  countsAsVerifiedGold: z.literal(false),
  verifiedGoldDelta: z.literal(0),
  fullP003GatePassed: z.literal(false)
});

export type P003ExternalDifferentialEvaluation = z.infer<typeof p003ExternalDifferentialEvaluationSchema>;

export async function preflightP003ExternalDifferentialResults(options: {
  input: string | unknown;
  result: string | unknown;
  internalDiagnostic: string | unknown;
}): Promise<P003ExternalDifferentialEvaluation> {
  const input = await preflightP003ExternalDifferentialInput(options.input);
  const internal = await preflightP003DeterminismDiagnostic(options.internalDiagnostic);
  const result = p003ExternalDifferentialResultEnvelopeSchema.parse(parseJsonInput(options.result, "P0-03 外部差分结果"));
  if (await sha256Hex(result.payload) !== result.digest) {
    throw new P003DifferentialError("DIGEST_MISMATCH", "P0-03 外部差分结果摘要不匹配");
  }
  if (
    result.payload.planDigest !== input.payload.planDigest
    || result.payload.inputBatchDigest !== input.digest
    || result.payload.batchId !== input.payload.batchId
  ) {
    throw new P003DifferentialError("BATCH_MISMATCH", "外部差分结果未绑定当前输入批次");
  }
  if (result.payload.results.length !== input.payload.cases.length) {
    throw new P003DifferentialError("COUNT_INVARIANT_FAILED", "外部差分结果没有完整覆盖输入批次");
  }

  const inputIds = input.payload.cases.map((item) => item.caseId);
  const resultIds = result.payload.results.map((item) => item.caseId);
  if (canonicalStringify(inputIds) !== canonicalStringify(resultIds)) {
    throw new P003DifferentialError("CASE_SET_MISMATCH", "外部差分结果必须按输入顺序完整返回每个案例");
  }
  const internalById = new Map(internal.payload.cases.map((item) => [item.caseId, item]));
  for (const external of result.payload.results) {
    if (external.status === "unsupported") continue;
    const reference = internalById.get(external.caseId);
    if (!reference || reference.status !== "deterministic" || reference.firstPass.status !== "calculated") {
      throw new P003DifferentialError("REFERENCE_NOT_DETERMINISTIC", `案例 ${external.caseId} 缺少确定的项目内部参考`);
    }
    const expectedCalendar = projectExternalCalendarReference(reference.firstPass.coreResult);
    const mismatches = externalMismatchFields(expectedCalendar, external.observedCalendar);
    if (external.status === "matched" && mismatches.length !== 0) {
      throw new P003DifferentialError("CLASSIFICATION_MISMATCH", `案例 ${external.caseId} 存在差异，不能分类为 matched`);
    }
    if (external.status === "mismatch") {
      if (mismatches.length === 0 || canonicalStringify(mismatches) !== canonicalStringify(external.mismatchFields)) {
        throw new P003DifferentialError("CLASSIFICATION_MISMATCH", `案例 ${external.caseId} 的 mismatchFields 未精确反映观测差异`);
      }
    }
  }
  return p003ExternalDifferentialEvaluationSchema.parse({
    classification: P003_DIAGNOSTIC_CLASSIFICATION,
    planId: P003_DIFFERENTIAL_PLAN_ID,
    inputBatchDigest: input.digest,
    resultBatchDigest: result.digest,
    counts: result.payload.counts,
    diagnosticPassed: result.payload.counts.mismatch === 0 && result.payload.counts.unsupported === 0,
    countsAsVerifiedGold: false,
    verifiedGoldDelta: 0,
    fullP003GatePassed: false
  });
}

export function serializeP003ExternalDifferentialResult(envelope: P003ExternalDifferentialResultEnvelope): string {
  return `${canonicalStringify(p003ExternalDifferentialResultEnvelopeSchema.parse(envelope))}\n`;
}

export type P003DifferentialErrorCode =
  | "INVALID_JSON"
  | "INVALID_SELECTION"
  | "INVALID_CONCURRENCY"
  | "GENERATOR_EXHAUSTED"
  | "COUNT_INVARIANT_FAILED"
  | "DUPLICATE_CASE_ID"
  | "GENERATED_CASE_MISMATCH"
  | "MISSING_CORE_DIGEST"
  | "DIGEST_MISMATCH"
  | "INNER_DIGEST_MISMATCH"
  | "PLAN_MISMATCH"
  | "BATCH_MISMATCH"
  | "CASE_SET_MISMATCH"
  | "CLASSIFICATION_MISMATCH"
  | "REFERENCE_NOT_DETERMINISTIC";

export class P003DifferentialError extends Error {
  readonly code: P003DifferentialErrorCode;

  constructor(code: P003DifferentialErrorCode, message: string) {
    super(message);
    this.name = "P003DifferentialError";
    this.code = code;
  }
}
