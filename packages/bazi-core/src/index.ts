import {
  HASH_SCHEMA_VERSION,
  SCHEMA_VERSION,
  UNKNOWN_HOUR_PROBE_DEFINITIONS,
  birthInputSchema,
  buildCalculatedChartHashPayload,
  buildUnknownHourCandidateHashPayload,
  calculationEngineSchema,
  calculatedChartSchema,
  chartFactsSchema,
  unknownHourCandidateResultSchema,
  unknownHourBirthInputSchema,
  rulePackBindingSchema,
  ruleProfileSchema,
  type BirthInput,
  type CalculatedChart,
  type ChartFacts,
  type DstDisambiguationPolicy,
  type NormalizedTimeCalibration,
  type UnknownHourCandidateResult,
  type UnknownHourBirthInput,
  type UnknownHourProbeCandidate,
  type UnknownHourProbeCandidateBase,
  type UnknownHourProbeVariant,
  type PillarFact,
  type RulePackBinding,
  type RuleProfile,
  type TimeZoneDatabaseSnapshot
} from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { bindLuckCycleRuleProfile } from "@hakimi/luck-core";
import {
  loadBundledTimeZoneCalculationContext,
  normalizeBirthTime,
  normalizeBirthTimeWithResolver,
  projectInstantToCivilTime,
  RUNTIME_TIME_ZONE_DATABASE,
  RUNTIME_TZDB_VERSION,
  type BundledTimeZoneCalculationContext
} from "@hakimi/time-core";
import { LunarUtil, Solar } from "lunar-typescript";

export { canonicalStringify, sha256Hex } from "@hakimi/integrity";
export type {
  UnknownHourCandidateResult,
  UnknownHourProbeCandidate,
  UnknownHourProbeCandidateBase,
  UnknownHourProbeVariant
} from "@hakimi/contracts";

export const ENGINE = Object.freeze({
  name: "hakimi-bazi-core" as const,
  version: "0.4.0",
  upstreamName: "lunar-typescript" as const,
  upstreamVersion: "1.8.6" as const,
  upstreamTagCommit: "0f3e95d15e31f1a7c7b93d624542649347328a20",
  upstreamIntegrity: "sha512-5Eo4T/cnuXfrgO4k5LCpOGHIUOuz5hCF/IfNv0T29WY2shR36Hiz+ecN9WjnUuxUKhql9gbOkPaQoqLFKtPRNA=="
} as const);

const FIXED_EIGHT_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;
const HYBRID_ALGORITHM_ID = "hakimi-bazi-core:fixed-plus08-year-month-local-civil-day-hour";
const TABLE_ALGORITHM_PREFIX = "lunar-typescript:1.8.6:LunarUtil";
export const UNKNOWN_HOUR_PROBE_ALGORITHM_ID = "hakimi-bazi-core:unknown-hour-representative-probes:v1" as const;
export const UNKNOWN_HOUR_PROBE_DEFINITION_VERSION = "1.0.0" as const;

export class UnsupportedCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedCalculationError";
  }
}

export type RuleProfileCompatibilityReason = {
  code: "INVALID_RULE_PROFILE" | "UNSUPPORTED_SEMANTIC_VALUE";
  path: string;
  actual: unknown;
  supportedValues: readonly unknown[];
  message: string;
};

export type RuleProfileCompatibilityInspection = {
  /** Alias retained for callers that phrase the gate as engine support. */
  supported: boolean;
  compatible: boolean;
  reasons: RuleProfileCompatibilityReason[];
};

const SUPPORTED_RULE_SEMANTICS = {
  calendar: {
    yearBoundary: "lichun_exact",
    monthBoundary: "jie_exact",
    dayBoundaries: ["zi_start_23", "midnight"],
    hourBasis: "civil_time",
    timezoneSource: "iana",
    locationPrecision: "city"
  },
  solarTime: {
    enabled: false,
    showComparison: true,
    longitudeSource: "location",
    equationOfTimeModel: null
  },
  luckCycle: {
    directionRule: "year_stem_yinyang_and_gender",
    unknownValuePolicy: "require_manual_direction",
    anchor: "directional_jie",
    startAgeMethod: "three_days_one_year_exact_duration",
    rounding: "retain_duration"
  },
  layers: {
    hiddenStems: true,
    tenGods: true,
    nayin: true,
    voidBranches: true,
    twelveGrowth: true,
    stemBranchRelations: true,
    shensha: false
  },
  interpretation: {
    strengthRulePack: null,
    structureRulePack: null,
    climateRulePack: null,
    usefulGodRulePack: null
  }
} as const;

function readPath(value: unknown, path: readonly PropertyKey[]): unknown {
  let current = value;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

/**
 * Exhaustive engine-semantic compatibility report. Profile identity, sources,
 * verification status and supported range are provenance/gating metadata; all
 * calculation-affecting fields are enumerated here. Only the built-in semantic
 * profile is implemented, with explicit day-boundary/zi-basis and DST choices.
 */
export function inspectRuleProfileCompatibility(rawRuleProfile: unknown): RuleProfileCompatibilityInspection {
  const parsed = ruleProfileSchema.safeParse(rawRuleProfile);
  if (!parsed.success) {
    const reasons = parsed.error.issues.map((issue): RuleProfileCompatibilityReason => ({
      code: "INVALID_RULE_PROFILE",
      path: issue.path.join(".") || "ruleProfile",
      actual: readPath(rawRuleProfile, issue.path),
      supportedValues: [],
      message: issue.message
    }));
    return { supported: false, compatible: false, reasons };
  }

  const profile = parsed.data;
  const reasons: RuleProfileCompatibilityReason[] = [];
  const requireValue = (path: string, actual: unknown, expected: unknown): void => {
    if (Object.is(actual, expected)) return;
    reasons.push({
      code: "UNSUPPORTED_SEMANTIC_VALUE",
      path,
      actual,
      supportedValues: [expected],
      message: `${path}=${String(actual)} 尚未由 ${ENGINE.name} ${ENGINE.version} 实现；当前仅支持 ${String(expected)}`
    });
  };

  requireValue("calendar.yearBoundary", profile.calendar.yearBoundary, SUPPORTED_RULE_SEMANTICS.calendar.yearBoundary);
  requireValue("calendar.monthBoundary", profile.calendar.monthBoundary, SUPPORTED_RULE_SEMANTICS.calendar.monthBoundary);
  if (!(SUPPORTED_RULE_SEMANTICS.calendar.dayBoundaries as readonly string[]).includes(profile.calendar.dayBoundary)) {
    reasons.push({
      code: "UNSUPPORTED_SEMANTIC_VALUE",
      path: "calendar.dayBoundary",
      actual: profile.calendar.dayBoundary,
      supportedValues: SUPPORTED_RULE_SEMANTICS.calendar.dayBoundaries,
      message: `calendar.dayBoundary=${profile.calendar.dayBoundary} 尚未实现；当前仅支持 23:00 子初或 00:00 午夜换日`
    });
  }
  const expectedZiBasis = profile.calendar.dayBoundary === "zi_start_23" ? "after_day_change" : "civil_day";
  requireValue("calendar.ziHourDayStemBasis", profile.calendar.ziHourDayStemBasis, expectedZiBasis);
  requireValue("calendar.hourBasis", profile.calendar.hourBasis, SUPPORTED_RULE_SEMANTICS.calendar.hourBasis);
  requireValue("calendar.timezoneSource", profile.calendar.timezoneSource, SUPPORTED_RULE_SEMANTICS.calendar.timezoneSource);
  // Every contract-valid dstAmbiguity value is implemented. It is intentionally
  // the only semantic field besides day boundary allowed to differ from default.
  requireValue("calendar.locationPrecision", profile.calendar.locationPrecision, SUPPORTED_RULE_SEMANTICS.calendar.locationPrecision);

  for (const key of Object.keys(SUPPORTED_RULE_SEMANTICS.solarTime) as Array<keyof typeof SUPPORTED_RULE_SEMANTICS.solarTime>) {
    requireValue(`solarTime.${key}`, profile.solarTime[key], SUPPORTED_RULE_SEMANTICS.solarTime[key]);
  }
  for (const key of Object.keys(SUPPORTED_RULE_SEMANTICS.luckCycle) as Array<keyof typeof SUPPORTED_RULE_SEMANTICS.luckCycle>) {
    requireValue(`luckCycle.${key}`, profile.luckCycle[key], SUPPORTED_RULE_SEMANTICS.luckCycle[key]);
  }
  for (const key of Object.keys(SUPPORTED_RULE_SEMANTICS.layers) as Array<keyof typeof SUPPORTED_RULE_SEMANTICS.layers>) {
    requireValue(`layers.${key}`, profile.layers[key], SUPPORTED_RULE_SEMANTICS.layers[key]);
  }
  for (const key of Object.keys(SUPPORTED_RULE_SEMANTICS.interpretation) as Array<keyof typeof SUPPORTED_RULE_SEMANTICS.interpretation>) {
    requireValue(`interpretation.${key}`, profile.interpretation[key], SUPPORTED_RULE_SEMANTICS.interpretation[key]);
  }

  const compatible = reasons.length === 0;
  return { supported: compatible, compatible, reasons };
}

export async function digestRuleProfile(ruleProfile: RuleProfile): Promise<string> {
  return sha256Hex(ruleProfileSchema.parse(ruleProfile));
}

type WallDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type PillarSeed = {
  name: PillarFact["name"];
  label: PillarFact["label"];
  stemIndex: number;
  branchIndex: number;
};

function readWallDateTime(wallDateTime: string): WallDateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(wallDateTime);
  if (!match) {
    throw new UnsupportedCalculationError(`无法读取规范化墙上时间：${wallDateTime}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0")
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * lunar-typescript 1.8.6 encodes exact solar-term wall times at a fixed +08:00.
 * This deliberately does not use the IANA Asia/Shanghai zone because that zone
 * contains historical daylight-saving offsets such as +09:00.
 */
function projectInstantToFixedEightWallTime(utcInstant: string): string {
  const epochMilliseconds = Date.parse(utcInstant);
  if (!Number.isFinite(epochMilliseconds)) {
    throw new UnsupportedCalculationError(`无法把已解析瞬时点投影到固定 UTC+08:00：${utcInstant}`);
  }
  const projected = new Date(epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS);
  return [
    `${projected.getUTCFullYear()}-${pad2(projected.getUTCMonth() + 1)}-${pad2(projected.getUTCDate())}`,
    `${pad2(projected.getUTCHours())}:${pad2(projected.getUTCMinutes())}:${pad2(projected.getUTCSeconds())}`
  ].join("T");
}

function solarFromWallTime(wallDateTime: string): Solar {
  const value = readWallDateTime(wallDateTime);
  return Solar.fromYmdHms(value.year, value.month, value.day, value.hour, value.minute, value.second);
}

function assertRuleProfileSupport(ruleProfile: RuleProfile): void {
  const inspection = inspectRuleProfileCompatibility(ruleProfile);
  if (!inspection.compatible) {
    throw new UnsupportedCalculationError(
      `规则配置包含当前引擎未实现的语义：${inspection.reasons.map((reason) => reason.message).join("；")}`
    );
  }
}

function assertCalendarAndRuleSupport(input: BirthInput, ruleProfile: RuleProfile): void {
  // Calendar validity is resolved by time-core. Keeping the original input in
  // this layer ensures a lunar date is never silently overwritten by its
  // derived Gregorian civil date.
  void input;
  assertRuleProfileSupport(ruleProfile);
}

function assertS0Support(input: BirthInput, ruleProfile: RuleProfile): void {
  assertCalendarAndRuleSupport(input, ruleProfile);
  if ((input.timePrecision !== "exact_minute" && input.timePrecision !== "exact_second") || input.time === null) {
    throw new UnsupportedCalculationError("当前确定时刻入口需要精确到分钟或秒；未知时辰请使用候选探针入口。");
  }
}

function assertUnknownHourSupport(input: BirthInput, ruleProfile: RuleProfile): void {
  assertCalendarAndRuleSupport(input, ruleProfile);
  if (input.timePrecision !== "unknown_hour" || input.time !== null) {
    throw new UnsupportedCalculationError("未知时辰候选入口只接受 timePrecision=unknown_hour 且 time=null 的输入。");
  }
}

export type CalculateChartOptions = {
  rulePackBinding?: RulePackBinding;
  dstResolutionOverride?: "earlier" | "later";
};

export type CalculateChartForBundledSnapshotOptions = CalculateChartOptions & {
  expectedTimeZoneDatabase?: TimeZoneDatabaseSnapshot;
};

export type NatalCalculationEngineDescriptor = CalculatedChart["manifest"]["engine"];

export type HistoricalNatalChartExecutor = Readonly<{
  executorId: string;
  engine: Readonly<NatalCalculationEngineDescriptor>;
  calculateChart: (
    rawInput: BirthInput,
    rawRuleProfile: RuleProfile,
    snapshotId: string,
    options?: CalculateChartForBundledSnapshotOptions
  ) => Promise<CalculatedChart>;
}>;

export type CalculateUnknownHourCandidatesOptions = {
  rulePackBinding?: RulePackBinding;
};

export type CalculateUnknownHourCandidatesForBundledSnapshotOptions =
  CalculateUnknownHourCandidatesOptions & {
    expectedTimeZoneDatabase?: TimeZoneDatabaseSnapshot;
  };

type SupportedRangeAssessment = {
  status: "verified" | "experimental";
  warnings: string[];
};

type CalculationContext = {
  ruleProfileDigest: string;
  rulePackBinding?: RulePackBinding;
  timeZoneDatabase: TimeZoneDatabaseSnapshot;
  supportedRange: SupportedRangeAssessment;
  warnings: string[];
};

function disambiguationPolicy(
  ruleProfile: RuleProfile,
  override?: "earlier" | "later"
): DstDisambiguationPolicy {
  if (override !== undefined && override !== "earlier" && override !== "later") {
    throw new UnsupportedCalculationError(`DST resolution override 无效：${String(override)}`);
  }
  const configured = ruleProfile.calendar.dstAmbiguity;
  if (configured === "require_user") return override ?? "reject";
  if (override !== undefined && override !== configured) {
    throw new UnsupportedCalculationError(
      `DST resolution override=${override} 与规则快照固定策略 ${configured} 冲突；不得临时改写固定规则。`
    );
  }
  return configured;
}

async function bindCalculationRulePack(
  ruleProfile: RuleProfile,
  rawBinding: RulePackBinding | undefined
): Promise<{ ruleProfileDigest: string; rulePackBinding?: RulePackBinding }> {
  const ruleProfileDigest = await digestRuleProfile(ruleProfile);
  if (rawBinding === undefined) return { ruleProfileDigest };
  const parsed = rulePackBindingSchema.safeParse(rawBinding);
  if (!parsed.success) {
    throw new UnsupportedCalculationError("规则包绑定结构无效，已拒绝计算。");
  }
  const binding = parsed.data;
  const mismatches: string[] = [];
  if (binding.profileDigest !== ruleProfileDigest) mismatches.push("profileDigest");
  if (binding.profileId !== ruleProfile.profileId) mismatches.push("profileId");
  if (binding.profileVersion !== ruleProfile.profileVersion) mismatches.push("profileVersion");
  if (mismatches.length > 0) {
    throw new UnsupportedCalculationError(
      `规则包绑定与最终 RuleProfile 不一致：${mismatches.join("、")}；已拒绝计算。`
    );
  }
  return { ruleProfileDigest, rulePackBinding: binding };
}

function assessSupportedRange(
  ruleProfile: RuleProfile,
  timeCalibration: NormalizedTimeCalibration
): SupportedRangeAssessment {
  const { stronglyVerifiedFrom: from, stronglyVerifiedTo: to, outsideRangePolicy } = ruleProfile.supportedRange;
  if (from > to) {
    throw new UnsupportedCalculationError(`规则配置支持范围起点 ${from} 晚于终点 ${to}。`);
  }
  const resolvedDate = timeCalibration.calendarResolution.resolvedGregorianDate;
  const inside = resolvedDate >= from && resolvedDate <= to;
  if (!inside && outsideRangePolicy === "reject") {
    throw new UnsupportedCalculationError(
      `解析后的公历日期 ${resolvedDate} 超出规则配置支持范围 ${from}—${to}，outsideRangePolicy=reject。`
    );
  }
  const warnings = inside
    ? []
    : [`解析后的公历日期 ${resolvedDate} 超出规则配置支持范围 ${from}—${to}；本次仅按 experimental_with_warning 计算。`];
  return {
    status: ruleProfile.status === "verified" && inside ? "verified" : "experimental",
    warnings
  };
}

function requiredArrayValue(values: string[], index: number, field: string): string {
  const value = values[index];
  if (typeof value !== "string" || value.length === 0) {
    throw new UnsupportedCalculationError(`上游公开表无法派生 ${field}（索引 ${index}）。`);
  }
  return value;
}

function requiredRecordValue<T>(values: Record<string, T>, key: string, field: string): T {
  const value = values[key];
  if (value === undefined || value === null || (typeof value === "string" && value.length === 0)) {
    throw new UnsupportedCalculationError(`上游公开表无法派生 ${field}（键 ${key}）。`);
  }
  return value;
}

function normalizeIndex(index: number, modulus: number, field: string): number {
  if (!Number.isInteger(index)) {
    throw new UnsupportedCalculationError(`无法派生 ${field}：索引不是整数。`);
  }
  return ((index % modulus) + modulus) % modulus;
}

function twelveGrowthFor(dayStem: string, dayStemIndex: number, branchIndex: number): string {
  const offset = requiredRecordValue(LunarUtil.CHANG_SHENG_OFFSET, dayStem, "十二长生起点");
  const direction = dayStemIndex % 2 === 0 ? branchIndex : -branchIndex;
  const index = normalizeIndex(offset + direction, 12, "十二长生");
  return requiredArrayValue(LunarUtil.CHANG_SHENG, index, "十二长生");
}

function buildPillar(seed: PillarSeed, dayStem: string, dayStemIndex: number): PillarFact {
  const stemIndex = normalizeIndex(seed.stemIndex, 10, `${seed.label}天干`);
  const branchIndex = normalizeIndex(seed.branchIndex, 12, `${seed.label}地支`);
  const stem = requiredArrayValue(LunarUtil.GAN, stemIndex + 1, `${seed.label}天干`);
  const branch = requiredArrayValue(LunarUtil.ZHI, branchIndex + 1, `${seed.label}地支`);
  const ganZhi = `${stem}${branch}`;
  if (LunarUtil.getJiaZiIndex(ganZhi) < 0) {
    throw new UnsupportedCalculationError(`最终混合柱 ${seed.label}=${ganZhi} 不是有效六十甲子，已阻断派生。`);
  }

  const hiddenStems = [...requiredRecordValue(LunarUtil.ZHI_HIDE_GAN, branch, `${seed.label}藏干`)];
  const branchTenGods = hiddenStems.map((hiddenStem) =>
    requiredRecordValue(LunarUtil.SHI_SHEN, `${dayStem}${hiddenStem}`, `${seed.label}地支十神`)
  );
  const stemTenGod = seed.name === "day"
    ? "日主"
    : requiredRecordValue(LunarUtil.SHI_SHEN, `${dayStem}${stem}`, `${seed.label}天干十神`);
  const stemWuXing = requiredRecordValue(LunarUtil.WU_XING_GAN, stem, `${seed.label}天干五行`);
  const branchWuXing = requiredRecordValue(LunarUtil.WU_XING_ZHI, branch, `${seed.label}地支五行`);
  const xun = LunarUtil.getXun(ganZhi);
  const voidBranches = LunarUtil.getXunKong(ganZhi);
  if (!xun || !voidBranches) {
    throw new UnsupportedCalculationError(`上游公开方法无法派生 ${seed.label}=${ganZhi} 的旬或空亡。`);
  }

  return {
    name: seed.name,
    label: seed.label,
    ganZhi,
    stem,
    branch,
    hiddenStems,
    stemTenGod,
    branchTenGods,
    wuXing: `${stemWuXing}${branchWuXing}`,
    nayin: requiredRecordValue(LunarUtil.NAYIN, ganZhi, `${seed.label}纳音`),
    twelveGrowth: twelveGrowthFor(dayStem, dayStemIndex, branchIndex),
    xun,
    voidBranches
  };
}

function buildHybridPillars(
  fixedEightSolar: Solar,
  localCivilSolar: Solar,
  dayBoundary: RuleProfile["calendar"]["dayBoundary"]
): ChartFacts["pillars"] {
  const fixedEightLunar = fixedEightSolar.getLunar();
  const localCivilLunar = localCivilSolar.getLunar();
  const useZiStart = dayBoundary === "zi_start_23";
  const dayStemIndex = useZiStart
    ? localCivilLunar.getDayGanIndexExact()
    : localCivilLunar.getDayGanIndexExact2();
  const dayBranchIndex = useZiStart
    ? localCivilLunar.getDayZhiIndexExact()
    : localCivilLunar.getDayZhiIndexExact2();
  const timeZhiIndex = LunarUtil.getTimeZhiIndex(
    `${pad2(localCivilSolar.getHour())}:${pad2(localCivilSolar.getMinute())}`
  );
  const timeGanIndex = (normalizeIndex(dayStemIndex, 10, "最终日干") % 5 * 2 + timeZhiIndex) % 10;

  const seeds: Record<keyof ChartFacts["pillars"], PillarSeed> = {
    year: {
      name: "year",
      label: "年柱",
      stemIndex: fixedEightLunar.getYearGanIndexExact(),
      branchIndex: fixedEightLunar.getYearZhiIndexExact()
    },
    month: {
      name: "month",
      label: "月柱",
      stemIndex: fixedEightLunar.getMonthGanIndexExact(),
      branchIndex: fixedEightLunar.getMonthZhiIndexExact()
    },
    day: {
      name: "day",
      label: "日柱",
      stemIndex: dayStemIndex,
      branchIndex: dayBranchIndex
    },
    hour: {
      name: "hour",
      label: "时柱",
      stemIndex: timeGanIndex,
      branchIndex: timeZhiIndex
    }
  };
  const dayStem = requiredArrayValue(
    LunarUtil.GAN,
    normalizeIndex(dayStemIndex, 10, "最终日干") + 1,
    "最终日干"
  );

  return {
    year: buildPillar(seeds.year, dayStem, dayStemIndex),
    month: buildPillar(seeds.month, dayStem, dayStemIndex),
    day: buildPillar(seeds.day, dayStem, dayStemIndex),
    hour: buildPillar(seeds.hour, dayStem, dayStemIndex)
  };
}

export type TransitPillarProjection = {
  instant: string;
  timeZone: string;
  localCivilWallDateTime: string;
  fixedPlusEightWallDateTime: string;
  dayBoundary: RuleProfile["calendar"]["dayBoundary"];
  pillars: ChartFacts["pillars"];
};

/**
 * Reuses the chart engine's exact year/month and explicit local day/hour
 * boundary logic for a transit instant without pretending it is a new Case.
 */
export function calculateTransitPillarsAtInstant(
  instant: string,
  timeZone: string,
  rawRuleProfile: RuleProfile
): TransitPillarProjection {
  const ruleProfile = ruleProfileSchema.parse(rawRuleProfile);
  assertRuleProfileSupport(ruleProfile);
  const local = projectInstantToCivilTime(instant, timeZone);
  const fixedPlusEightWallDateTime = projectInstantToFixedEightWallTime(local.instant);
  return {
    instant: local.instant,
    timeZone,
    localCivilWallDateTime: local.wallDateTime,
    fixedPlusEightWallDateTime,
    dayBoundary: ruleProfile.calendar.dayBoundary,
    pillars: buildHybridPillars(
      solarFromWallTime(fixedPlusEightWallDateTime),
      solarFromWallTime(local.wallDateTime),
      ruleProfile.calendar.dayBoundary
    )
  };
}

function pillarProvenance(pillars: ChartFacts["pillars"], dayBoundary: RuleProfile["calendar"]["dayBoundary"]) {
  return (Object.keys(pillars) as Array<keyof typeof pillars>).flatMap((key) => {
    const prefix = `pillars.${key}`;
    const pillarAlgorithmId = key === "year" || key === "month"
      ? `${HYBRID_ALGORITHM_ID}:fixed-plus08:${key}-exact:v1`
      : key === "day"
        ? `${HYBRID_ALGORITHM_ID}:local-civil:day:${dayBoundary}:v1`
        : `${HYBRID_ALGORITHM_ID}:local-civil:hour:time-gan-from-final-day:${dayBoundary}:v1`;
    const note = "工程候选四柱；年/月按同一瞬时点的固定 UTC+08:00 精确节气候选，日/时按本地民用墙时和显式换日规则生成，尚未通过项目金标准发布门。";
    return [
      {
        field: `${prefix}.ganZhi`,
        kind: "rule_derived" as const,
        algorithmId: pillarAlgorithmId,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      },
      {
        field: `${prefix}.hiddenStems`,
        kind: "rule_derived" as const,
        algorithmId: `${TABLE_ALGORITHM_PREFIX}.ZHI_HIDE_GAN`,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      },
      {
        field: `${prefix}.stemTenGod`,
        kind: "rule_derived" as const,
        algorithmId: `${TABLE_ALGORITHM_PREFIX}.SHI_SHEN:final-day-stem`,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      },
      {
        field: `${prefix}.branchTenGods`,
        kind: "rule_derived" as const,
        algorithmId: `${TABLE_ALGORITHM_PREFIX}.SHI_SHEN:final-day-stem`,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      },
      {
        field: `${prefix}.wuXing`,
        kind: "rule_derived" as const,
        algorithmId: `${TABLE_ALGORITHM_PREFIX}.WU_XING_GAN+WU_XING_ZHI`,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      },
      {
        field: `${prefix}.nayin`,
        kind: "rule_derived" as const,
        algorithmId: `${TABLE_ALGORITHM_PREFIX}.NAYIN`,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      },
      {
        field: `${prefix}.twelveGrowth`,
        kind: "rule_derived" as const,
        algorithmId: `${TABLE_ALGORITHM_PREFIX}.CHANG_SHENG_OFFSET:final-day-stem`,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      },
      {
        field: `${prefix}.xun`,
        kind: "rule_derived" as const,
        algorithmId: `${TABLE_ALGORITHM_PREFIX}.getXun`,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      },
      {
        field: `${prefix}.voidBranches`,
        kind: "rule_derived" as const,
        algorithmId: `${TABLE_ALGORITHM_PREFIX}.getXunKong`,
        sourceRefs: [],
        verificationStatus: "experimental" as const,
        note
      }
    ];
  });
}

async function buildCalculatedChart(
  input: BirthInput,
  ruleProfile: RuleProfile,
  timeCalibration: NormalizedTimeCalibration,
  context: CalculationContext
): Promise<CalculatedChart> {
  if (!timeCalibration.timeZoneResolution.selectedCandidate || !timeCalibration.utcInstant) {
    const resolutionLabel = timeCalibration.timeZoneResolution.kind === "overlap" ? "DST 重叠" : "DST 空档";
    throw new UnsupportedCalculationError(`${resolutionLabel}时刻必须先明确选择较早或较晚方案；原始输入未被修改。`);
  }

  const localCivilWallTime = timeCalibration.activeWallTime;
  const fixedEightWallTime = projectInstantToFixedEightWallTime(timeCalibration.utcInstant);
  const localCivilSolar = solarFromWallTime(localCivilWallTime);
  const fixedEightSolar = solarFromWallTime(fixedEightWallTime);
  const fixedEightLunar = fixedEightSolar.getLunar();
  const pillars = buildHybridPillars(fixedEightSolar, localCivilSolar, ruleProfile.calendar.dayBoundary);

  const previousJie = fixedEightLunar.getPrevJie(false);
  const nextJie = fixedEightLunar.getNextJie(false);
  const facts: ChartFacts = chartFactsSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    calendar: {
      solarText: localCivilSolar.toYmdHms(),
      lunarText: `${fixedEightLunar.getYearInChinese()}年${fixedEightLunar.getMonthInChinese()}月${fixedEightLunar.getDayInChinese()}`,
      lunarYear: fixedEightLunar.getYear(),
      lunarMonth: fixedEightLunar.getMonth(),
      lunarDay: fixedEightLunar.getDay(),
      isLeapMonth: fixedEightLunar.getMonth() < 0,
      previousJie: previousJie ? `${previousJie.getName()} · ${previousJie.getSolar().toYmdHms()} UTC+08:00` : null,
      nextJie: nextJie ? `${nextJie.getName()} · ${nextJie.getSolar().toYmdHms()} UTC+08:00` : null
    },
    pillars,
    fieldProvenance: pillarProvenance(pillars, ruleProfile.calendar.dayBoundary)
  });

  const warnings = [
    "工程预览：当前结果尚未通过 360 例金标准与 20,000 例随机差分。",
    "年柱与月柱使用已解析瞬时点投影到固定 UTC+08:00 后的精确立春/交节候选；这不是带历史 DST 的 IANA Asia/Shanghai 投影。",
    `日柱与时柱使用 ${input.timeZone} 的本地民用墙时；时干已从最终显示日干与时支重新推导。`,
    "真太阳时与平太阳时仅保留对照数据，未应用到活动命盘。",
    ...timeCalibration.warnings,
    ...context.supportedRange.warnings,
    ...context.warnings,
    "lunar-typescript 仅作为白名单适配后的候选历法实现，不作为规则争议的最终裁判。"
  ];
  const luckCycleRuleSnapshot = bindLuckCycleRuleProfile(ruleProfile);
  const luckCycleRuleDigest = await sha256Hex(luckCycleRuleSnapshot);
  const manifestWithoutResultHash = {
    schemaVersion: SCHEMA_VERSION,
    hashSchemaVersion: HASH_SCHEMA_VERSION,
    engine: ENGINE,
    tzdbVersion: context.timeZoneDatabase.snapshotId,
    timeZoneDatabase: context.timeZoneDatabase,
    ruleProfileDigest: context.ruleProfileDigest,
    luckCycleRuleDigest,
    supportedRangeStatus: context.supportedRange.status,
    verificationStatus: "engineering_preview" as const,
    calculatedAt: new Date().toISOString(),
    warnings
  };
  const resultHash = await sha256Hex(buildCalculatedChartHashPayload({
    input,
    timeCalibration,
    ruleProfile,
    ...(context.rulePackBinding ? { rulePackBinding: context.rulePackBinding } : {}),
    luckCycleRuleSnapshot,
    facts,
    manifest: { ...manifestWithoutResultHash, resultHash: "0".repeat(64) }
  }));

  return calculatedChartSchema.parse({
    input,
    timeCalibration,
    ruleProfile,
    ...(context.rulePackBinding ? { rulePackBinding: context.rulePackBinding } : {}),
    luckCycleRuleSnapshot,
    facts,
    manifest: {
      ...manifestWithoutResultHash,
      resultHash,
    }
  });
}

export async function calculateChart(
  rawInput: BirthInput,
  rawRuleProfile: RuleProfile,
  options: CalculateChartOptions = {}
): Promise<CalculatedChart> {
  const input = birthInputSchema.parse(rawInput);
  const ruleProfile = ruleProfileSchema.parse(rawRuleProfile);
  assertS0Support(input, ruleProfile);
  const policy = disambiguationPolicy(ruleProfile, options.dstResolutionOverride);
  const [binding, timeCalibration] = await Promise.all([
    bindCalculationRulePack(ruleProfile, options.rulePackBinding),
    Promise.resolve(normalizeBirthTime(input, policy))
  ]);
  const supportedRange = assessSupportedRange(ruleProfile, timeCalibration);
  const warnings = options.dstResolutionOverride !== undefined && ruleProfile.calendar.dstAmbiguity === "require_user"
    ? [`本次 DST 歧义按显式 override=${options.dstResolutionOverride} 解析；RuleProfile 仍保留 require_user，未被临时改写。`]
    : [];
  return buildCalculatedChart(input, ruleProfile, timeCalibration, {
    ...binding,
    timeZoneDatabase: RUNTIME_TIME_ZONE_DATABASE,
    supportedRange,
    warnings
  });
}

async function calculateChartWithBundledContext(
  rawInput: BirthInput,
  rawRuleProfile: RuleProfile,
  options: CalculateChartOptions,
  timeZoneContext: BundledTimeZoneCalculationContext
): Promise<CalculatedChart> {
  const input = birthInputSchema.parse(rawInput);
  const ruleProfile = ruleProfileSchema.parse(rawRuleProfile);
  assertS0Support(input, ruleProfile);
  const policy = disambiguationPolicy(ruleProfile, options.dstResolutionOverride);
  const [binding, timeCalibration] = await Promise.all([
    bindCalculationRulePack(ruleProfile, options.rulePackBinding),
    Promise.resolve(normalizeBirthTimeWithResolver(input, policy, timeZoneContext.resolver))
  ]);
  const supportedRange = assessSupportedRange(ruleProfile, timeCalibration);
  const warnings = [
    ...(options.dstResolutionOverride !== undefined && ruleProfile.calendar.dstAmbiguity === "require_user"
      ? [`本次 DST 歧义按显式 override=${options.dstResolutionOverride} 解析；RuleProfile 仍保留 require_user，未被临时改写。`]
      : []),
    ...(timeZoneContext.timeZoneDatabase.snapshotId === RUNTIME_TZDB_VERSION
      ? []
      : [
          `这是 ${ENGINE.name}@${ENGINE.version} 执行器按随包 IANA ${timeZoneContext.timeZoneDatabase.ianaVersion} 完成的只读复算，不表示该命盘曾由历史应用生成。`
        ])
  ];
  return buildCalculatedChart(input, ruleProfile, timeCalibration, {
    ...binding,
    timeZoneDatabase: timeZoneContext.timeZoneDatabase,
    supportedRange,
    warnings
  });
}

/**
 * Calculates one natal chart with an exact official bundled tzdb snapshot.
 * The isolated resolver is loaded by content-addressed snapshot id and an
 * optional complete expected descriptor is checked before any calculation.
 */
export async function calculateChartForBundledSnapshot(
  rawInput: BirthInput,
  rawRuleProfile: RuleProfile,
  snapshotId: string,
  options: CalculateChartForBundledSnapshotOptions = {}
): Promise<CalculatedChart> {
  const { expectedTimeZoneDatabase, ...calculationOptions } = options;
  const timeZoneContext = await loadBundledTimeZoneCalculationContext(
    snapshotId,
    expectedTimeZoneDatabase
  );
  return calculateChartWithBundledContext(
    rawInput,
    rawRuleProfile,
    calculationOptions,
    timeZoneContext
  );
}

const HISTORICAL_NATAL_ENGINE_0_4_0 = Object.freeze({ ...ENGINE });

/**
 * Append-only executor registry for read-only natal-chart replay. Existing
 * entries must never be changed or removed; a new implementation gets a new
 * entry and a new complete engine descriptor.
 */
export const HISTORICAL_NATAL_EXECUTOR_REGISTRY: readonly HistoricalNatalChartExecutor[] = Object.freeze([
  Object.freeze({
    executorId: "hakimi-bazi-core:natal-chart-executor:0.4.0",
    engine: HISTORICAL_NATAL_ENGINE_0_4_0,
    calculateChart: calculateChartForBundledSnapshot
  })
]);

function sameNatalEngineDescriptor(
  left: NatalCalculationEngineDescriptor,
  right: NatalCalculationEngineDescriptor
): boolean {
  return left.name === right.name &&
    left.version === right.version &&
    left.upstreamName === right.upstreamName &&
    left.upstreamVersion === right.upstreamVersion &&
    left.upstreamTagCommit === right.upstreamTagCommit &&
    left.upstreamIntegrity === right.upstreamIntegrity;
}

/** Exact full-descriptor lookup. Version-only matching and fallback are forbidden. */
export function lookupHistoricalNatalChartExecutor(
  rawEngine: unknown
): HistoricalNatalChartExecutor | null {
  const parsed = calculationEngineSchema.safeParse(rawEngine);
  if (!parsed.success) return null;
  return HISTORICAL_NATAL_EXECUTOR_REGISTRY.find((entry) =>
    sameNatalEngineDescriptor(parsed.data, entry.engine)
  ) ?? null;
}

/** Fail-closed form for callers that must replay a stored Revision. */
export function requireHistoricalNatalChartExecutor(
  rawEngine: unknown
): HistoricalNatalChartExecutor {
  const executor = lookupHistoricalNatalChartExecutor(rawEngine);
  if (executor) return executor;
  throw new UnsupportedCalculationError(
    "未找到与完整本命盘引擎描述符精确匹配的历史执行器；只读复演已拒绝，且不会回退到当前版本。"
  );
}

function unresolvedProbeReason(timeCalibration: NormalizedTimeCalibration): {
  code: "DST_OVERLAP_REQUIRES_USER_CHOICE" | "DST_GAP_REQUIRES_USER_RESOLUTION";
  message: string;
} {
  return timeCalibration.timeZoneResolution.kind === "overlap"
    ? {
        code: "DST_OVERLAP_REQUIRES_USER_CHOICE",
        message: "代表时间位于 DST 重叠区间，存在两个有效瞬时点；候选入口不会静默选择 earlier 或 later。"
      }
    : {
        code: "DST_GAP_REQUIRES_USER_RESOLUTION",
        message: "代表时间位于 DST 空档，不存在与原墙上时间相符的瞬时点；候选入口不会静默平移时间。"
      };
}

async function buildUnknownHourVariant(
  candidateId: string,
  probeInput: BirthInput,
  ruleProfile: RuleProfile,
  timeCalibration: NormalizedTimeCalibration,
  context: CalculationContext
): Promise<UnknownHourProbeVariant> {
  const selected = timeCalibration.timeZoneResolution.selectedCandidate;
  if (!selected || !timeCalibration.utcInstant) {
    throw new UnsupportedCalculationError("未知时辰探针变体缺少已解析瞬时点。");
  }
  const chart = await buildCalculatedChart(probeInput, ruleProfile, timeCalibration, context);
  return {
    variantId: `${candidateId}@${selected.choice}`,
    sourceKind: "synthetic_unknown_hour_probe",
    choice: selected.choice,
    instant: selected.instant,
    utcOffset: selected.utcOffset,
    chart,
    chartResultHash: chart.manifest.resultHash
  };
}

async function calculateUnknownHourCandidatesWithBundledContext(
  rawInput: BirthInput,
  rawRuleProfile: RuleProfile,
  options: CalculateUnknownHourCandidatesOptions,
  timeZoneContext: BundledTimeZoneCalculationContext
): Promise<UnknownHourCandidateResult> {
  const parsedInput = birthInputSchema.parse(rawInput);
  const ruleProfile = ruleProfileSchema.parse(rawRuleProfile);
  assertUnknownHourSupport(parsedInput, ruleProfile);
  const input = unknownHourBirthInputSchema.parse(parsedInput);
  const rangeProbe = UNKNOWN_HOUR_PROBE_DEFINITIONS[0];
  if (!rangeProbe) throw new UnsupportedCalculationError("未知时辰探针定义为空，无法执行支持范围检查。");
  const rangeProbeInput = birthInputSchema.parse({
    ...input,
    time: rangeProbe.representativeTime,
    timePrecision: "exact_minute"
  });
  const [binding, rangeCalibration] = await Promise.all([
    bindCalculationRulePack(ruleProfile, options.rulePackBinding),
    Promise.resolve(normalizeBirthTimeWithResolver(rangeProbeInput, "reject", timeZoneContext.resolver))
  ]);
  const parallelReplayWarnings = timeZoneContext.timeZoneDatabase.snapshotId === RUNTIME_TZDB_VERSION
    ? []
    : [
        `这是当前 ${ENGINE.name}@${ENGINE.version} 执行器按随包 IANA ${timeZoneContext.timeZoneDatabase.ianaVersion} 完成的并列复算，不表示该候选组曾由历史应用生成。`
      ];
  const context: CalculationContext = {
    ...binding,
    timeZoneDatabase: timeZoneContext.timeZoneDatabase,
    supportedRange: assessSupportedRange(ruleProfile, rangeCalibration),
    warnings: parallelReplayWarnings
  };

  const candidates = await Promise.all(UNKNOWN_HOUR_PROBE_DEFINITIONS.map(async (definition, probeIndex): Promise<UnknownHourProbeCandidate> => {
    const probeInput = birthInputSchema.parse({
      ...input,
      time: definition.representativeTime,
      timePrecision: "exact_minute"
    });
    // Unknown-hour exploration always rejects DST ambiguity, regardless of a
    // profile's deterministic-time policy. The user must choose explicitly.
    const timeCalibration = normalizeBirthTimeWithResolver(probeInput, "reject", timeZoneContext.resolver);
    const base: UnknownHourProbeCandidateBase = {
      probeIndex,
      candidateId: definition.candidateId,
      sourceKind: "synthetic_representative_probe",
      branch: definition.branch,
      civilTimeRange: {
        start: definition.civilTimeRange.startInclusive,
        end: definition.civilTimeRange.endExclusive,
        ...definition.civilTimeRange
      },
      representativeTime: definition.representativeTime,
      isZiBoundaryVariant: definition.isZiBoundaryVariant,
      ziSegment: definition.ziSegment,
      verificationStatus: "experimental_probe",
      timeCalibration
    };

    if (timeCalibration.timeZoneResolution.kind === "overlap") {
      try {
        const variants = await Promise.all((["earlier", "later"] as const).map(async (choice) =>
          buildUnknownHourVariant(
            definition.candidateId,
            probeInput,
            ruleProfile,
            normalizeBirthTimeWithResolver(probeInput, choice, timeZoneContext.resolver),
            context
          )
        ));
        return {
          ...base,
          status: "requires_user_time_resolution",
          chart: null,
          variants,
          unresolvedReason: unresolvedProbeReason(timeCalibration)
        };
      } catch (cause) {
        if (!(cause instanceof UnsupportedCalculationError)) throw cause;
        return {
          ...base,
          status: "unresolved",
          chart: null,
          variants: [],
          unresolvedReason: { code: "CALCULATION_UNRESOLVED", message: cause.message }
        };
      }
    }

    if (!timeCalibration.timeZoneResolution.selectedCandidate || !timeCalibration.utcInstant) {
      return {
        ...base,
        status: "requires_user_time_resolution",
        chart: null,
        variants: [],
        unresolvedReason: unresolvedProbeReason(timeCalibration)
      };
    }

    try {
      const chart = await buildCalculatedChart(probeInput, ruleProfile, timeCalibration, context);
      return {
        ...base,
        status: "calculated",
        chart,
        variants: [{
          variantId: `${definition.candidateId}@unique`,
          sourceKind: "synthetic_unknown_hour_probe",
          choice: "unique",
          instant: timeCalibration.utcInstant,
          utcOffset: timeCalibration.utcOffset!,
          chart,
          chartResultHash: chart.manifest.resultHash
        }],
        unresolvedReason: null
      };
    } catch (cause) {
      if (!(cause instanceof UnsupportedCalculationError)) throw cause;
      return {
        ...base,
        status: "unresolved",
        chart: null,
        variants: [],
        unresolvedReason: {
          code: "CALCULATION_UNRESOLVED",
          message: cause.message
        }
      };
    }
  }));

  const resultHash = await sha256Hex(buildUnknownHourCandidateHashPayload({
    hashSchemaVersion: HASH_SCHEMA_VERSION,
    kind: "unknown_hour_candidate_probes",
    algorithmId: UNKNOWN_HOUR_PROBE_ALGORITHM_ID,
    probeDefinitionVersion: UNKNOWN_HOUR_PROBE_DEFINITION_VERSION,
    tzdbVersion: timeZoneContext.timeZoneDatabase.snapshotId,
    timeZoneDatabase: timeZoneContext.timeZoneDatabase,
    input,
    engine: ENGINE,
    ruleProfile,
    rulePackBinding: context.rulePackBinding,
    candidates
  }));

  return unknownHourCandidateResultSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    hashSchemaVersion: HASH_SCHEMA_VERSION,
    kind: "unknown_hour_candidate_probes",
    verificationStatus: "experimental_probe",
    algorithmId: UNKNOWN_HOUR_PROBE_ALGORITHM_ID,
    probeDefinitionVersion: UNKNOWN_HOUR_PROBE_DEFINITION_VERSION,
    tzdbVersion: timeZoneContext.timeZoneDatabase.snapshotId,
    timeZoneDatabase: timeZoneContext.timeZoneDatabase,
    input,
    engine: ENGINE,
    ruleProfile,
    ...(context.rulePackBinding ? { rulePackBinding: context.rulePackBinding } : {}),
    ruleProfileDigest: context.ruleProfileDigest,
    probeCount: UNKNOWN_HOUR_PROBE_DEFINITIONS.length,
    candidates,
    resultHash,
    warnings: [
      "这是同一民用日期内的代表性候选探针，不是出生时刻推断，也不表示任一探针比其他探针更可能。",
      "候选中的 CalculatedChart.input 是为计算构造的 exact_minute 代表探针，不是用户原始出生时刻；原始 unknown_hour 输入只保留在集合顶层。",
      "未知时辰探针的 DST 主选择固定为 reject；重叠时同时保留 earlier/later 两张合成变体供比较，空档不平移墙上时间，也不会擅自选定主盘。",
      "13 个探针只覆盖两个子时段及其余十一时支的代表时刻，并非对整日每一秒的穷举。",
      "候选未覆盖节气在两探针之间发生时可能产生的秒级年柱或月柱分叉，也可能遗漏发生在代表时刻之间的 DST 转换；获得更精确出生时间后必须重新计算。",
      ...context.warnings,
      ...context.supportedRange.warnings,
      "所有候选均为 experimental_probe，尚未通过项目金标准发布门。"
    ]
  });
}

/** Current-only creation API. New CandidateSets always bind the active snapshot. */
export async function calculateUnknownHourCandidates(
  rawInput: BirthInput,
  rawRuleProfile: RuleProfile,
  options: CalculateUnknownHourCandidatesOptions = {}
): Promise<UnknownHourCandidateResult> {
  const timeZoneContext = await loadBundledTimeZoneCalculationContext(
    RUNTIME_TZDB_VERSION,
    RUNTIME_TIME_ZONE_DATABASE
  );
  return calculateUnknownHourCandidatesWithBundledContext(
    rawInput,
    rawRuleProfile,
    options,
    timeZoneContext
  );
}

/**
 * Calculates a parallel CandidateSet with one exact official bundled snapshot.
 * This is a present-day research replay and must not be presented as an
 * original historical chart.
 */
export async function calculateUnknownHourCandidatesForBundledSnapshot(
  rawInput: BirthInput,
  rawRuleProfile: RuleProfile,
  snapshotId: string,
  options: CalculateUnknownHourCandidatesForBundledSnapshotOptions = {}
): Promise<UnknownHourCandidateResult> {
  const { expectedTimeZoneDatabase, ...calculationOptions } = options;
  const timeZoneContext = await loadBundledTimeZoneCalculationContext(
    snapshotId,
    expectedTimeZoneDatabase
  );
  return calculateUnknownHourCandidatesWithBundledContext(
    rawInput,
    rawRuleProfile,
    calculationOptions,
    timeZoneContext
  );
}
