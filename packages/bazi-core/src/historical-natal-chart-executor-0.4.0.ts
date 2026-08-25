import {
  chartFactsSchema,
  createBirthInputSchemaForTimeZoneName,
  createCalculatedChartSchemaForTimeZoneName,
  rulePackBindingSchema,
  ruleProfileSchema,
  storedBirthInputSchema,
  timeZoneDatabaseSnapshotSchema,
  type BirthInput,
  type CalculatedChart,
  type ChartFacts,
  type DstDisambiguationPolicy,
  type NormalizedTimeCalibration,
  type PillarFact,
  type RulePackBinding,
  type RuleProfile,
  type TimeZoneDatabaseSnapshot,
  type TimeZoneNamePredicate
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { bindLuckCycleRuleProfile } from "@hakimi/luck-core";
import {
  loadBundledTimeZoneCalculationContext,
  normalizeBirthTimeWithResolver
} from "@hakimi/time-core";
import { LunarUtil, Solar } from "lunar-typescript";
import { UnsupportedCalculationError } from "./unsupported-calculation-error";

/**
 * Source-locked historical 0.4.0 natal-chart kernel.
 *
 * This is a versioned engineering replay implementation, not an attestation of
 * the binary that originally created a stored Revision. Its LF UTF-8 source,
 * direct imports and lunar-typescript package identity are checked by the
 * repository source-lock gate.
 */
export const HISTORICAL_NATAL_ENGINE_0_4_0 = Object.freeze({
  name: "hakimi-bazi-core" as const,
  version: "0.4.0",
  upstreamName: "lunar-typescript" as const,
  upstreamVersion: "1.8.6" as const,
  upstreamTagCommit: "0f3e95d15e31f1a7c7b93d624542649347328a20",
  upstreamIntegrity: "sha512-5Eo4T/cnuXfrgO4k5LCpOGHIUOuz5hCF/IfNv0T29WY2shR36Hiz+ecN9WjnUuxUKhql9gbOkPaQoqLFKtPRNA=="
} as const);

export type HistoricalNatalChart040Options = {
  rulePackBinding?: RulePackBinding;
  dstResolutionOverride?: "earlier" | "later";
  expectedTimeZoneDatabase?: TimeZoneDatabaseSnapshot;
};

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
  isTimeZoneName: TimeZoneNamePredicate;
};

const FIXED_EIGHT_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;
const HYBRID_ALGORITHM_ID = "hakimi-bazi-core:fixed-plus08-year-month-local-civil-day-hour";
const TABLE_ALGORITHM_PREFIX = "lunar-typescript:1.8.6:LunarUtil";
const HISTORICAL_SCHEMA_VERSION_0_4_0 = "1.0.0" as const;
const HISTORICAL_HASH_SCHEMA_VERSION_0_4_0 = "2.0.0" as const;
const HISTORICAL_ACTIVE_TZDB_SNAPSHOT_ID_2026C = "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3" as const;

function buildHistoricalHashableBirthInput040(input: BirthInput) {
  return {
    calendarType: input.calendarType,
    date: input.date,
    time: input.time,
    timePrecision: input.timePrecision,
    timeZone: input.timeZone,
    sex: input.sex,
    lunarLeapMonth: input.lunarLeapMonth,
    coordinates: {
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      precision: input.location.precision
    }
  };
}

/** Frozen hash-schema-v2 projection used by the 0.4.0 source-locked kernel. */
function buildHistoricalCalculatedChartHashPayload040(value: CalculatedChart) {
  return {
    hashSchemaVersion: HISTORICAL_HASH_SCHEMA_VERSION_0_4_0,
    tzdbVersion: value.manifest.tzdbVersion,
    timeZoneDatabase: value.manifest.timeZoneDatabase,
    input: buildHistoricalHashableBirthInput040(value.input),
    engine: value.manifest.engine,
    ruleProfile: value.ruleProfile,
    rulePackBinding: value.rulePackBinding,
    luckCycleRuleSnapshot: value.luckCycleRuleSnapshot,
    timeCalibration: value.timeCalibration,
    facts: value.facts
  };
}

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

function assertRuleProfileSupport(ruleProfile: RuleProfile): void {
  const reasons: string[] = [];
  const requireValue = (path: string, actual: unknown, expected: unknown): void => {
    if (Object.is(actual, expected)) return;
    reasons.push(
      `${path}=${String(actual)} 尚未由 ${HISTORICAL_NATAL_ENGINE_0_4_0.name} ${HISTORICAL_NATAL_ENGINE_0_4_0.version} 实现；当前仅支持 ${String(expected)}`
    );
  };

  requireValue("calendar.yearBoundary", ruleProfile.calendar.yearBoundary, SUPPORTED_RULE_SEMANTICS.calendar.yearBoundary);
  requireValue("calendar.monthBoundary", ruleProfile.calendar.monthBoundary, SUPPORTED_RULE_SEMANTICS.calendar.monthBoundary);
  if (!(SUPPORTED_RULE_SEMANTICS.calendar.dayBoundaries as readonly string[]).includes(ruleProfile.calendar.dayBoundary)) {
    reasons.push(
      `calendar.dayBoundary=${ruleProfile.calendar.dayBoundary} 尚未实现；当前仅支持 23:00 子初或 00:00 午夜换日`
    );
  }
  const expectedZiBasis = ruleProfile.calendar.dayBoundary === "zi_start_23" ? "after_day_change" : "civil_day";
  requireValue("calendar.ziHourDayStemBasis", ruleProfile.calendar.ziHourDayStemBasis, expectedZiBasis);
  requireValue("calendar.hourBasis", ruleProfile.calendar.hourBasis, SUPPORTED_RULE_SEMANTICS.calendar.hourBasis);
  requireValue("calendar.timezoneSource", ruleProfile.calendar.timezoneSource, SUPPORTED_RULE_SEMANTICS.calendar.timezoneSource);
  requireValue("calendar.locationPrecision", ruleProfile.calendar.locationPrecision, SUPPORTED_RULE_SEMANTICS.calendar.locationPrecision);

  for (const key of Object.keys(SUPPORTED_RULE_SEMANTICS.solarTime) as Array<keyof typeof SUPPORTED_RULE_SEMANTICS.solarTime>) {
    requireValue(`solarTime.${key}`, ruleProfile.solarTime[key], SUPPORTED_RULE_SEMANTICS.solarTime[key]);
  }
  for (const key of Object.keys(SUPPORTED_RULE_SEMANTICS.luckCycle) as Array<keyof typeof SUPPORTED_RULE_SEMANTICS.luckCycle>) {
    requireValue(`luckCycle.${key}`, ruleProfile.luckCycle[key], SUPPORTED_RULE_SEMANTICS.luckCycle[key]);
  }
  for (const key of Object.keys(SUPPORTED_RULE_SEMANTICS.layers) as Array<keyof typeof SUPPORTED_RULE_SEMANTICS.layers>) {
    requireValue(`layers.${key}`, ruleProfile.layers[key], SUPPORTED_RULE_SEMANTICS.layers[key]);
  }
  for (const key of Object.keys(SUPPORTED_RULE_SEMANTICS.interpretation) as Array<keyof typeof SUPPORTED_RULE_SEMANTICS.interpretation>) {
    requireValue(`interpretation.${key}`, ruleProfile.interpretation[key], SUPPORTED_RULE_SEMANTICS.interpretation[key]);
  }

  if (reasons.length > 0) {
    throw new UnsupportedCalculationError(`规则配置包含当前引擎未实现的语义：${reasons.join("；")}`);
  }
}

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
  const ruleProfileDigest = await sha256Hex(ruleProfileSchema.parse(ruleProfile));
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
    schemaVersion: HISTORICAL_SCHEMA_VERSION_0_4_0,
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
    schemaVersion: HISTORICAL_SCHEMA_VERSION_0_4_0,
    hashSchemaVersion: HISTORICAL_HASH_SCHEMA_VERSION_0_4_0,
    engine: HISTORICAL_NATAL_ENGINE_0_4_0,
    tzdbVersion: context.timeZoneDatabase.snapshotId,
    timeZoneDatabase: context.timeZoneDatabase,
    ruleProfileDigest: context.ruleProfileDigest,
    luckCycleRuleDigest,
    supportedRangeStatus: context.supportedRange.status,
    verificationStatus: "engineering_preview" as const,
    calculatedAt: new Date().toISOString(),
    warnings
  };
  const resultHash = await sha256Hex(buildHistoricalCalculatedChartHashPayload040({
    input,
    timeCalibration,
    ruleProfile,
    ...(context.rulePackBinding ? { rulePackBinding: context.rulePackBinding } : {}),
    luckCycleRuleSnapshot,
    facts,
    manifest: { ...manifestWithoutResultHash, resultHash: "0".repeat(64) }
  }));

  return createCalculatedChartSchemaForTimeZoneName(context.isTimeZoneName).parse({
    input,
    timeCalibration,
    ruleProfile,
    ...(context.rulePackBinding ? { rulePackBinding: context.rulePackBinding } : {}),
    luckCycleRuleSnapshot,
    facts,
    manifest: {
      ...manifestWithoutResultHash,
      resultHash
    }
  });
}

export async function calculateHistoricalNatalChart040(
  rawInput: BirthInput,
  rawRuleProfile: RuleProfile,
  snapshotId: string,
  options: HistoricalNatalChart040Options = {}
): Promise<CalculatedChart> {
  const storedInput = storedBirthInputSchema.parse(rawInput);
  const ruleProfile = ruleProfileSchema.parse(rawRuleProfile);
  const dstResolutionOverride = options.dstResolutionOverride;
  disambiguationPolicy(ruleProfile, dstResolutionOverride);
  const rulePackBinding = options.rulePackBinding === undefined
    ? undefined
    : rulePackBindingSchema.parse(options.rulePackBinding);
  const expectedTimeZoneDatabase = options.expectedTimeZoneDatabase === undefined
    ? undefined
    : timeZoneDatabaseSnapshotSchema.parse(options.expectedTimeZoneDatabase);
  const timeZoneContext = await loadBundledTimeZoneCalculationContext(
    snapshotId,
    expectedTimeZoneDatabase
  );
  const input = createBirthInputSchemaForTimeZoneName(
    timeZoneContext.resolver.isTimeZoneName
  ).parse(storedInput);
  assertRuleProfileSupport(ruleProfile);
  if ((input.timePrecision !== "exact_minute" && input.timePrecision !== "exact_second") || input.time === null) {
    throw new UnsupportedCalculationError("当前确定时刻入口需要精确到分钟或秒；未知时辰请使用候选探针入口。");
  }
  const policy = disambiguationPolicy(ruleProfile, dstResolutionOverride);
  const [binding, timeCalibration] = await Promise.all([
    bindCalculationRulePack(ruleProfile, rulePackBinding),
    Promise.resolve(normalizeBirthTimeWithResolver(input, policy, timeZoneContext.resolver))
  ]);
  const supportedRange = assessSupportedRange(ruleProfile, timeCalibration);
  const warnings = [
    ...(dstResolutionOverride !== undefined && ruleProfile.calendar.dstAmbiguity === "require_user"
      ? [`本次 DST 歧义按显式 override=${dstResolutionOverride} 解析；RuleProfile 仍保留 require_user，未被临时改写。`]
      : []),
    ...(timeZoneContext.timeZoneDatabase.snapshotId === HISTORICAL_ACTIVE_TZDB_SNAPSHOT_ID_2026C
      ? []
      : [
          `这是 ${HISTORICAL_NATAL_ENGINE_0_4_0.name}@${HISTORICAL_NATAL_ENGINE_0_4_0.version} 执行器按随包 IANA ${timeZoneContext.timeZoneDatabase.ianaVersion} 完成的只读复算，不表示该命盘曾由历史应用生成。`
        ])
  ];
  return buildCalculatedChart(input, ruleProfile, timeCalibration, {
    ...binding,
    timeZoneDatabase: timeZoneContext.timeZoneDatabase,
    supportedRange,
    warnings,
    isTimeZoneName: timeZoneContext.resolver.isTimeZoneName
  });
}
