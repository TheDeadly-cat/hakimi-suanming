import { LunarUtil, Solar, type JieQi } from "lunar-typescript";

export const LUCK_CORE_ENGINE = Object.freeze({
  name: "hakimi-luck-core" as const,
  version: "0.1.0" as const,
  upstreamName: "lunar-typescript" as const,
  upstreamVersion: "1.8.6" as const,
  upstreamTagCommit: "0f3e95d15e31f1a7c7b93d624542649347328a20" as const,
  upstreamIntegrity: "sha512-5Eo4T/cnuXfrgO4k5LCpOGHIUOuz5hCF/IfNv0T29WY2shR36Hiz+ecN9WjnUuxUKhql9gbOkPaQoqLFKtPRNA==" as const
});

export const LUCK_CYCLE_ALGORITHM_ID =
  "hakimi-luck-core:directional-jie-three-days-one-year-exact:v1" as const;
export const LUCK_CYCLE_RULE_VERSION = "1.1.0" as const;
export const LUCK_CYCLE_OUTPUT_SCHEMA_VERSION = "1.0.0" as const;

const FIXED_EIGHT_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;
const THREE_DAYS_MILLISECONDS = 3 * 24 * 60 * 60 * 1_000;
const TRADITIONAL_MONTH_SOURCE_MILLISECONDS = THREE_DAYS_MILLISECONDS / 12;
const TRADITIONAL_DAY_SOURCE_MILLISECONDS = TRADITIONAL_MONTH_SOURCE_MILLISECONDS / 30;
const SOURCE_TO_TRADITIONAL_SUBDAY_SCALE = 24 * 60 * 60 * 1_000 / TRADITIONAL_DAY_SOURCE_MILLISECONDS;
const SUPPORTED_FROM = "1900-01-01";
const SUPPORTED_TO = "2100-12-31";
const YANG_STEMS = new Set(["甲", "丙", "戊", "庚", "壬"]);
const YIN_STEMS = new Set(["乙", "丁", "己", "辛", "癸"]);

export type LuckDirection = "forward" | "backward";
export type LuckSex = "male" | "female" | "unspecified";
export type LuckVerificationStatus = "engineering_preview";

export type XiaoyunRule = {
  method: "birth_hour_adjacent";
  directionRule: "exact_chart_year_stem_and_gender";
  directionReuse: "luck_cycle_or_manual_direction";
  firstAge: 1;
  firstStepOffset: 1;
  ageBasis: "nominal_age";
  boundaryAlignment: "flow_year_start_exact";
  boundaryFrame: "fixed_plus08";
  scope: "whole_life";
  cycleLength: 60;
  intervalPolicy: "half_open";
  unknownSexPolicy: "require_manual_direction";
  unknownHourPolicy: "unsupported";
};

export type LuckCycleInput = {
  schemaVersion: "1.0.0";
  /** An ISO 8601 instant with Z or an explicit numeric offset. */
  birthInstant: string;
  sex: LuckSex;
  /** Required only when sex is unspecified and the rule allows manual direction. */
  manualDirection?: LuckDirection;
  /** Optional integration guards against a chart produced with different boundary rules. */
  expectedYearGanZhi?: string;
  expectedMonthGanZhi?: string;
};

export type LuckCycleRule = {
  schemaVersion: "1.0.0";
  ruleId: string;
  ruleVersion: string;
  directionRule: "year_stem_yinyang_and_gender";
  unknownSexPolicy: "require_manual_direction" | "reject";
  anchor: "directional_jie";
  exactBoundaryPolicy: "zero_duration";
  startAgeMethod: "three_days_one_year_exact_duration";
  componentRatios: {
    sourceDaysPerTraditionalYear: 3;
    traditionalMonthsPerYear: 12;
    traditionalDaysPerMonth: 30;
    traditionalHoursPerDay: 24;
  };
  handoverCalendar: {
    frame: "fixed_plus08";
    additionOrder: "years_months_days_time";
    overflow: "constrain";
  };
  decadeYears: 10;
  decadeCount: number;
  /** Absent only on readable legacy snapshots; never infer it during replay. */
  xiaoyun?: XiaoyunRule;
};

export const DEFAULT_LUCK_CYCLE_RULE: Readonly<LuckCycleRule> = Object.freeze({
  schemaVersion: "1.0.0",
  ruleId: "ziping-directional-jie-xiaoyun-working-default",
  ruleVersion: LUCK_CYCLE_RULE_VERSION,
  directionRule: "year_stem_yinyang_and_gender",
  unknownSexPolicy: "require_manual_direction",
  anchor: "directional_jie",
  exactBoundaryPolicy: "zero_duration",
  startAgeMethod: "three_days_one_year_exact_duration",
  componentRatios: Object.freeze({
    sourceDaysPerTraditionalYear: 3,
    traditionalMonthsPerYear: 12,
    traditionalDaysPerMonth: 30,
    traditionalHoursPerDay: 24
  }),
  handoverCalendar: Object.freeze({
    frame: "fixed_plus08",
    additionOrder: "years_months_days_time",
    overflow: "constrain"
  }),
  decadeYears: 10,
  decadeCount: 10,
  xiaoyun: Object.freeze({
    method: "birth_hour_adjacent",
    directionRule: "exact_chart_year_stem_and_gender",
    directionReuse: "luck_cycle_or_manual_direction",
    firstAge: 1,
    firstStepOffset: 1,
    ageBasis: "nominal_age",
    boundaryAlignment: "flow_year_start_exact",
    boundaryFrame: "fixed_plus08",
    scope: "whole_life",
    cycleLength: 60,
    intervalPolicy: "half_open",
    unknownSexPolicy: "require_manual_direction",
    unknownHourPolicy: "unsupported"
  })
} satisfies LuckCycleRule);

export type LuckCycleProfileBinding = {
  profileId: string;
  profileVersion: string;
  luckCycle: {
    directionRule: "year_stem_yinyang_and_gender";
    unknownValuePolicy: "require_manual_direction";
    anchor: "directional_jie";
    startAgeMethod: "three_days_one_year_exact_duration";
    rounding: "retain_duration";
  };
};

/**
 * Expands the compact RuleProfile fields into the complete immutable rule used
 * by luck-core. New revisions persist this expansion so future default changes
 * cannot silently alter an older calculation.
 */
export function bindLuckCycleRuleProfile(profile: LuckCycleProfileBinding): LuckCycleRule {
  if (!profile.profileId || !/^\d+\.\d+\.\d+$/.test(profile.profileVersion)) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "规则配置缺少可锁版的 profileId 或 profileVersion。");
  }
  if (
    profile.luckCycle.directionRule !== "year_stem_yinyang_and_gender" ||
    profile.luckCycle.unknownValuePolicy !== "require_manual_direction" ||
    profile.luckCycle.anchor !== "directional_jie" ||
    profile.luckCycle.startAgeMethod !== "three_days_one_year_exact_duration" ||
    profile.luckCycle.rounding !== "retain_duration"
  ) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "当前规则配置不能展开为 luck-core v1 的完整规则快照。");
  }

  return {
    ...structuredClone(DEFAULT_LUCK_CYCLE_RULE),
    ruleId: `${profile.profileId}:luck-cycle-xiaoyun`,
    ruleVersion: profile.profileVersion
  };
}

export type LuckCoreErrorCode =
  | "INVALID_INPUT"
  | "INVALID_INSTANT"
  | "UNSUPPORTED_RANGE"
  | "UNSUPPORTED_RULE"
  | "MANUAL_DIRECTION_REQUIRED"
  | "MANUAL_DIRECTION_NOT_ALLOWED"
  | "PILLAR_MISMATCH"
  | "HISTORICAL_EXECUTOR_UNAVAILABLE"
  | "HISTORICAL_EXECUTOR_OUTPUT_MISMATCH"
  | "UPSTREAM_DATA_ERROR";

export class LuckCoreError extends Error {
  constructor(
    readonly code: LuckCoreErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "LuckCoreError";
  }
}

export type FactMetadata = {
  algorithmId: typeof LUCK_CYCLE_ALGORITHM_ID;
  verificationStatus: LuckVerificationStatus;
};

export type ExactRational = {
  numerator: string;
  denominator: string;
  decimal: number;
  decimalIsDisplayOnly: true;
};

export type LuckSolarTerm = FactMetadata & {
  name: string;
  kind: "jie";
  relation: "strict_previous" | "exact_boundary" | "strict_next";
  fixedPlusEightWallDateTime: string;
  instant: string;
  sourcePrecision: "second";
};

export type TraditionalAgeComponents = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
};

export type ExactLuckAge = {
  elapsedYears: ExactRational;
  /** Calendar components under the explicitly versioned 3d/1y, 12m/y, 30d/m ratios. */
  components: TraditionalAgeComponents;
  semantics: "elapsed_age_from_birth_not_nominal_age";
};

export type LuckDecade = FactMetadata & {
  index: number;
  ganZhi: string;
  direction: LuckDirection;
  startAge: ExactLuckAge;
  endAgeExclusive: ExactLuckAge;
  startInstant: string;
  endExclusiveInstant: string;
  startFixedPlusEightWallDateTime: string;
  endExclusiveFixedPlusEightWallDateTime: string;
};

export type LuckCycleResult = {
  schemaVersion: typeof LUCK_CYCLE_OUTPUT_SCHEMA_VERSION;
  kind: "luck_cycle_facts";
  manifest: {
    algorithmId: typeof LUCK_CYCLE_ALGORITHM_ID;
    engine: {
      name: typeof LUCK_CORE_ENGINE.name;
      version: typeof LUCK_CORE_ENGINE.version;
    };
    ruleId: string;
    ruleVersion: string;
    upstream: {
      name: typeof LUCK_CORE_ENGINE.upstreamName;
      version: typeof LUCK_CORE_ENGINE.upstreamVersion;
      tagCommit: typeof LUCK_CORE_ENGINE.upstreamTagCommit;
      integrity: typeof LUCK_CORE_ENGINE.upstreamIntegrity;
    };
    sourceRefs: string[];
    verificationStatus: LuckVerificationStatus;
    goldCaseCount: 0;
    releaseGatePassed: false;
  };
  input: LuckCycleInput;
  rule: LuckCycleRule;
  birth: FactMetadata & {
    instant: string;
    fixedPlusEightWallDateTime: string;
    yearGanZhi: string;
    monthGanZhi: string;
  };
  direction: FactMetadata & {
    value: LuckDirection;
    basis: "year_stem_yinyang_and_gender" | "manual_for_unspecified_sex";
    yearStem: string;
    yearStemPolarity: "yang" | "yin";
    sex: LuckSex;
  };
  adjacentJie: {
    previous: LuckSolarTerm;
    exactBoundary: LuckSolarTerm | null;
    next: LuckSolarTerm;
    selectedAnchor: LuckSolarTerm;
  };
  anchorInterval: FactMetadata & {
    fromInstant: string;
    toInstant: string;
    durationMilliseconds: number;
    durationSeconds: ExactRational;
    durationDays: ExactRational;
  };
  startAge: FactMetadata & ExactLuckAge & {
    sourceDurationMilliseconds: number;
    sourceToTraditionalYearRatio: ExactRational;
    unrounded: true;
  };
  handover: FactMetadata & {
    instant: string;
    fixedPlusEightWallDateTime: string;
    calendarFrame: "fixed_plus08";
    calendarOverflow: "constrain";
  };
  decades: LuckDecade[];
  warnings: string[];
  knownGaps: string[];
};

export type LuckCycleExecutorDescriptor = {
  outputSchemaVersion: typeof LUCK_CYCLE_OUTPUT_SCHEMA_VERSION;
  ruleSnapshotSchemaVersion: "1.0.0";
  algorithmId: typeof LUCK_CYCLE_ALGORITHM_ID;
  engine: {
    name: typeof LUCK_CORE_ENGINE.name;
    version: typeof LUCK_CORE_ENGINE.version;
  };
  upstream: {
    name: typeof LUCK_CORE_ENGINE.upstreamName;
    version: typeof LUCK_CORE_ENGINE.upstreamVersion;
    tagCommit: typeof LUCK_CORE_ENGINE.upstreamTagCommit;
    integrity: typeof LUCK_CORE_ENGINE.upstreamIntegrity;
  };
};

export type HistoricalLuckCycleExecutor = Readonly<{
  executorId: string;
  descriptor: Readonly<LuckCycleExecutorDescriptor>;
  replay: (
    rawInput: LuckCycleInput,
    frozenRuleSnapshot: LuckCycleRule
  ) => LuckCycleResult;
}>;

const FACT_METADATA: FactMetadata = {
  algorithmId: LUCK_CYCLE_ALGORITHM_ID,
  verificationStatus: "engineering_preview"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSupportedXiaoyunRule(value: unknown): value is XiaoyunRule {
  if (!isRecord(value)) return false;
  return Object.keys(value).length === 13 &&
    value.method === "birth_hour_adjacent" &&
    value.directionRule === "exact_chart_year_stem_and_gender" &&
    value.directionReuse === "luck_cycle_or_manual_direction" &&
    value.firstAge === 1 &&
    value.firstStepOffset === 1 &&
    value.ageBasis === "nominal_age" &&
    value.boundaryAlignment === "flow_year_start_exact" &&
    value.boundaryFrame === "fixed_plus08" &&
    value.scope === "whole_life" &&
    value.cycleLength === 60 &&
    value.intervalPolicy === "half_open" &&
    value.unknownSexPolicy === "require_manual_direction" &&
    value.unknownHourPolicy === "unsupported";
}

function assertSupportedRule(value: unknown): asserts value is LuckCycleRule {
  if (!isRecord(value)) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "运限规则必须是显式的版本化对象。" );
  }
  const rule = value;
  const ratios = isRecord(rule.componentRatios) ? rule.componentRatios : {};
  const handover = isRecord(rule.handoverCalendar) ? rule.handoverCalendar : {};
  const supported =
    rule.schemaVersion === "1.0.0" &&
    typeof rule.ruleId === "string" && rule.ruleId.length > 0 &&
    typeof rule.ruleVersion === "string" && /^\d+\.\d+\.\d+$/.test(rule.ruleVersion) &&
    rule.directionRule === "year_stem_yinyang_and_gender" &&
    (rule.unknownSexPolicy === "require_manual_direction" || rule.unknownSexPolicy === "reject") &&
    rule.anchor === "directional_jie" &&
    rule.exactBoundaryPolicy === "zero_duration" &&
    rule.startAgeMethod === "three_days_one_year_exact_duration" &&
    ratios.sourceDaysPerTraditionalYear === 3 &&
    ratios.traditionalMonthsPerYear === 12 &&
    ratios.traditionalDaysPerMonth === 30 &&
    ratios.traditionalHoursPerDay === 24 &&
    handover.frame === "fixed_plus08" &&
    handover.additionOrder === "years_months_days_time" &&
    handover.overflow === "constrain" &&
    rule.decadeYears === 10 &&
    typeof rule.decadeCount === "number" &&
    Number.isInteger(rule.decadeCount) && rule.decadeCount >= 1 && rule.decadeCount <= 20 &&
    (rule.xiaoyun === undefined || (
      isSupportedXiaoyunRule(rule.xiaoyun) &&
      rule.unknownSexPolicy === rule.xiaoyun.unknownSexPolicy
    ));

  if (!supported) {
    throw new LuckCoreError(
      "UNSUPPORTED_RULE",
      "当前运限底座只支持：年干阴阳配性别定顺逆、顺逆取节、精确三日一岁、固定 +08 历法加法和 1 至 20 柱十年大运。"
    );
  }
}

function normalizeInput(input: unknown): LuckCycleInput {
  if (!isRecord(input)) {
    throw new LuckCoreError("INVALID_INPUT", "运限输入必须是显式的版本化对象。" );
  }
  if (input.schemaVersion !== "1.0.0") {
    throw new LuckCoreError("INVALID_INPUT", "运限输入 schemaVersion 必须为 1.0.0。" );
  }
  if (typeof input.sex !== "string" || !(["male", "female", "unspecified"] as readonly string[]).includes(input.sex)) {
    throw new LuckCoreError("INVALID_INPUT", "sex 必须为 male、female 或 unspecified。" );
  }
  if (input.manualDirection !== undefined && input.manualDirection !== "forward" && input.manualDirection !== "backward") {
    throw new LuckCoreError("INVALID_INPUT", "manualDirection 必须为 forward 或 backward。" );
  }
  const birthEpochMilliseconds = parseIsoInstant(input.birthInstant);
  for (const field of ["expectedYearGanZhi", "expectedMonthGanZhi"] as const) {
    const value = input[field];
    if (value !== undefined && (typeof value !== "string" || !LunarUtil.JIA_ZI.includes(value))) {
      throw new LuckCoreError("INVALID_INPUT", `${field} 必须是有效六十甲子干支。`);
    }
  }
  return {
    schemaVersion: "1.0.0",
    birthInstant: new Date(birthEpochMilliseconds).toISOString(),
    sex: input.sex as LuckSex,
    ...(input.manualDirection ? { manualDirection: input.manualDirection as LuckDirection } : {}),
    ...(input.expectedYearGanZhi ? { expectedYearGanZhi: input.expectedYearGanZhi as string } : {}),
    ...(input.expectedMonthGanZhi ? { expectedMonthGanZhi: input.expectedMonthGanZhi as string } : {})
  };
}

function parseIsoInstant(value: unknown): number {
  if (typeof value !== "string") {
    throw new LuckCoreError("INVALID_INSTANT", "birthInstant 必须是 ISO 8601 字符串。" );
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(Z|[+-](\d{2}):([0-5]\d))$/i.exec(value);
  if (!match) {
    throw new LuckCoreError(
      "INVALID_INSTANT",
      "birthInstant 必须是含秒的 ISO 8601 时刻，并包含 Z 或明确数字偏移；仅保留到毫秒。"
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const reconstructed = new Date(Date.UTC(year, month - 1, day));
  if (
    reconstructed.getUTCFullYear() !== year ||
    reconstructed.getUTCMonth() !== month - 1 ||
    reconstructed.getUTCDate() !== day
  ) {
    throw new LuckCoreError("INVALID_INSTANT", `birthInstant 包含无效公历日期：${value}`);
  }
  if (match[8] !== undefined) {
    const offsetHour = Number(match[8]);
    const offsetMinute = Number(match[9]);
    if (offsetHour > 14 || (offsetHour === 14 && offsetMinute !== 0)) {
      throw new LuckCoreError("INVALID_INSTANT", `birthInstant 偏移超出 ±14:00：${value}`);
    }
  }
  const epochMilliseconds = Date.parse(value);
  if (!Number.isFinite(epochMilliseconds)) {
    throw new LuckCoreError("INVALID_INSTANT", `无法解析 birthInstant：${value}`);
  }
  return epochMilliseconds;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}

function fixedEightWallFromEpoch(epochMilliseconds: number): string {
  const date = new Date(epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}.${pad3(date.getUTCMilliseconds())}`;
}

function solarFromFixedEightEpoch(epochMilliseconds: number): Solar {
  const date = new Date(epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS);
  return Solar.fromYmdHms(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}

function epochFromFixedEightSolar(solar: Solar): number {
  return Date.UTC(
    solar.getYear(),
    solar.getMonth() - 1,
    solar.getDay(),
    solar.getHour(),
    solar.getMinute(),
    solar.getSecond()
  ) - FIXED_EIGHT_OFFSET_MILLISECONDS;
}

function assertSupportedRange(epochMilliseconds: number): void {
  const wallDate = fixedEightWallFromEpoch(epochMilliseconds).slice(0, 10);
  if (wallDate < SUPPORTED_FROM || wallDate > SUPPORTED_TO) {
    throw new LuckCoreError(
      "UNSUPPORTED_RANGE",
      `固定 +08 投影日期 ${wallDate} 不在当前声明支持范围 ${SUPPORTED_FROM} 至 ${SUPPORTED_TO} 内。`
    );
  }
}

function rational(numerator: number, denominator: number): ExactRational {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new LuckCoreError("INVALID_INPUT", "精确比例超出安全整数范围。" );
  }
  return {
    numerator: String(numerator),
    denominator: String(denominator),
    decimal: Math.round((numerator / denominator) * 1_000_000_000_000) / 1_000_000_000_000,
    decimalIsDisplayOnly: true
  };
}

function termFromJieQi(jieQi: JieQi, relation: LuckSolarTerm["relation"]): LuckSolarTerm {
  const epochMilliseconds = epochFromFixedEightSolar(jieQi.getSolar());
  return {
    ...FACT_METADATA,
    name: jieQi.getName(),
    kind: "jie",
    relation,
    fixedPlusEightWallDateTime: fixedEightWallFromEpoch(epochMilliseconds),
    instant: new Date(epochMilliseconds).toISOString(),
    sourcePrecision: "second"
  };
}

function findAdjacentJie(epochMilliseconds: number): {
  previous: LuckSolarTerm;
  exactBoundary: LuckSolarTerm | null;
  next: LuckSolarTerm;
} {
  try {
    const lunar = solarFromFixedEightEpoch(epochMilliseconds).getLunar();
    const rawPrevious = lunar.getPrevJie(false);
    const rawPreviousEpoch = epochFromFixedEightSolar(rawPrevious.getSolar());
    const rawNext = lunar.getNextJie(false);

    if (rawPreviousEpoch === epochMilliseconds) {
      const strictPrevious = solarFromFixedEightEpoch(epochMilliseconds - 1_000).getLunar().getPrevJie(false);
      return {
        previous: termFromJieQi(strictPrevious, "strict_previous"),
        exactBoundary: termFromJieQi(rawPrevious, "exact_boundary"),
        next: termFromJieQi(rawNext, "strict_next")
      };
    }

    return {
      previous: termFromJieQi(rawPrevious, "strict_previous"),
      exactBoundary: null,
      next: termFromJieQi(rawNext, "strict_next")
    };
  } catch (cause) {
    throw new LuckCoreError("UPSTREAM_DATA_ERROR", "上游未能返回相邻节令。", { cause });
  }
}

function resolveDirection(
  yearGanZhi: string,
  input: LuckCycleInput,
  rule: LuckCycleRule
): LuckCycleResult["direction"] {
  const yearStem = Array.from(yearGanZhi)[0] ?? "";
  const yearStemPolarity = YANG_STEMS.has(yearStem) ? "yang" : YIN_STEMS.has(yearStem) ? "yin" : null;
  if (!yearStemPolarity) {
    throw new LuckCoreError("UPSTREAM_DATA_ERROR", `无法判断年干阴阳：${yearGanZhi}`);
  }

  if (input.sex === "unspecified") {
    if (rule.unknownSexPolicy === "reject") {
      throw new LuckCoreError("MANUAL_DIRECTION_REQUIRED", "当前规则拒绝未指定性别的顺逆推导。" );
    }
    if (!input.manualDirection) {
      throw new LuckCoreError("MANUAL_DIRECTION_REQUIRED", "性别未指定时必须显式提供 manualDirection。" );
    }
    return {
      ...FACT_METADATA,
      value: input.manualDirection,
      basis: "manual_for_unspecified_sex",
      yearStem,
      yearStemPolarity,
      sex: input.sex
    };
  }

  if (input.manualDirection !== undefined) {
    throw new LuckCoreError(
      "MANUAL_DIRECTION_NOT_ALLOWED",
      "性别已指定时不得用 manualDirection 静默覆盖年干阴阳配性别规则。"
    );
  }

  const value =
    (yearStemPolarity === "yang" && input.sex === "male") ||
    (yearStemPolarity === "yin" && input.sex === "female")
      ? "forward"
      : "backward";

  return {
    ...FACT_METADATA,
    value,
    basis: "year_stem_yinyang_and_gender",
    yearStem,
    yearStemPolarity,
    sex: input.sex
  };
}

function decomposeTraditionalAge(sourceDurationMilliseconds: number): TraditionalAgeComponents {
  let remainder = sourceDurationMilliseconds;
  const years = Math.floor(remainder / THREE_DAYS_MILLISECONDS);
  remainder -= years * THREE_DAYS_MILLISECONDS;
  const months = Math.floor(remainder / TRADITIONAL_MONTH_SOURCE_MILLISECONDS);
  remainder -= months * TRADITIONAL_MONTH_SOURCE_MILLISECONDS;
  const days = Math.floor(remainder / TRADITIONAL_DAY_SOURCE_MILLISECONDS);
  remainder -= days * TRADITIONAL_DAY_SOURCE_MILLISECONDS;

  let traditionalSubdayMilliseconds = remainder * SOURCE_TO_TRADITIONAL_SUBDAY_SCALE;
  const hours = Math.floor(traditionalSubdayMilliseconds / 3_600_000);
  traditionalSubdayMilliseconds -= hours * 3_600_000;
  const minutes = Math.floor(traditionalSubdayMilliseconds / 60_000);
  traditionalSubdayMilliseconds -= minutes * 60_000;
  const seconds = Math.floor(traditionalSubdayMilliseconds / 1_000);
  traditionalSubdayMilliseconds -= seconds * 1_000;

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    milliseconds: Math.round(traditionalSubdayMilliseconds)
  };
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addCalendarComponentsInFixedEight(
  epochMilliseconds: number,
  components: TraditionalAgeComponents
): number {
  const wall = new Date(epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS);
  let year = wall.getUTCFullYear();
  let monthIndex = wall.getUTCMonth();
  let day = wall.getUTCDate();

  year += components.years;
  day = Math.min(day, daysInMonth(year, monthIndex));

  const totalMonths = year * 12 + monthIndex + components.months;
  year = Math.floor(totalMonths / 12);
  monthIndex = ((totalMonths % 12) + 12) % 12;
  day = Math.min(day, daysInMonth(year, monthIndex));

  const constrainedWallEpoch = Date.UTC(
    year,
    monthIndex,
    day,
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    wall.getUTCSeconds(),
    wall.getUTCMilliseconds()
  );
  const durationMilliseconds =
    components.days * 86_400_000 +
    components.hours * 3_600_000 +
    components.minutes * 60_000 +
    components.seconds * 1_000 +
    components.milliseconds;
  return constrainedWallEpoch + durationMilliseconds - FIXED_EIGHT_OFFSET_MILLISECONDS;
}

function addCalendarYearsInFixedEight(epochMilliseconds: number, yearsToAdd: number): number {
  const wall = new Date(epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS);
  const year = wall.getUTCFullYear() + yearsToAdd;
  const monthIndex = wall.getUTCMonth();
  const day = Math.min(wall.getUTCDate(), daysInMonth(year, monthIndex));
  return Date.UTC(
    year,
    monthIndex,
    day,
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    wall.getUTCSeconds(),
    wall.getUTCMilliseconds()
  ) - FIXED_EIGHT_OFFSET_MILLISECONDS;
}

function exactAge(sourceDurationMilliseconds: number, extraWholeYears = 0): ExactLuckAge {
  const numerator = sourceDurationMilliseconds + extraWholeYears * THREE_DAYS_MILLISECONDS;
  const base = decomposeTraditionalAge(sourceDurationMilliseconds);
  return {
    elapsedYears: rational(numerator, THREE_DAYS_MILLISECONDS),
    components: {
      ...base,
      years: base.years + extraWholeYears
    },
    semantics: "elapsed_age_from_birth_not_nominal_age"
  };
}

function assertExpectedPillars(input: LuckCycleInput, yearGanZhi: string, monthGanZhi: string): void {
  if (input.expectedYearGanZhi !== undefined && input.expectedYearGanZhi !== yearGanZhi) {
    throw new LuckCoreError(
      "PILLAR_MISMATCH",
      `期望年柱 ${input.expectedYearGanZhi} 与固定 +08 精确节令年柱 ${yearGanZhi} 不一致。`
    );
  }
  if (input.expectedMonthGanZhi !== undefined && input.expectedMonthGanZhi !== monthGanZhi) {
    throw new LuckCoreError(
      "PILLAR_MISMATCH",
      `期望月柱 ${input.expectedMonthGanZhi} 与固定 +08 精确节令月柱 ${monthGanZhi} 不一致。`
    );
  }
}

function cycleGanZhi(monthGanZhi: string, direction: LuckDirection, index: number): string {
  const monthIndex = LunarUtil.JIA_ZI.indexOf(monthGanZhi);
  if (monthIndex < 0) {
    throw new LuckCoreError("UPSTREAM_DATA_ERROR", `月柱 ${monthGanZhi} 不在上游六十甲子表中。`);
  }
  const offset = direction === "forward" ? index : -index;
  const value = LunarUtil.JIA_ZI[((monthIndex + offset) % 60 + 60) % 60];
  if (!value) throw new LuckCoreError("UPSTREAM_DATA_ERROR", "上游六十甲子表缺少目标大运干支。" );
  return value;
}

/**
 * Applies the locked 小运 stem-branch stepping rule only. Interval alignment
 * belongs to transit-core because it needs revision and target instants.
 */
export function calculateXiaoyunGanZhi(
  birthHourGanZhi: string,
  direction: LuckDirection,
  nominalAge: number,
  rawRule: XiaoyunRule
): string {
  if (!isSupportedXiaoyunRule(rawRule)) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "当前小运计算只支持已锁版的出生时柱相邻起法。" );
  }
  if (direction !== "forward" && direction !== "backward") {
    throw new LuckCoreError("INVALID_INPUT", "小运顺逆必须是 forward 或 backward。" );
  }
  if (!Number.isInteger(nominalAge) || nominalAge < rawRule.firstAge) {
    throw new LuckCoreError("INVALID_INPUT", `小运名义年龄必须是不小于 ${rawRule.firstAge} 的整数。`);
  }
  const birthHourIndex = LunarUtil.JIA_ZI.indexOf(birthHourGanZhi);
  if (birthHourIndex < 0) {
    throw new LuckCoreError("INVALID_INPUT", `出生时柱 ${birthHourGanZhi} 不在六十甲子表中。`);
  }
  const stepOffset = rawRule.firstStepOffset + nominalAge - rawRule.firstAge;
  const signedOffset = direction === "forward" ? stepOffset : -stepOffset;
  const targetIndex = ((birthHourIndex + signedOffset) % rawRule.cycleLength + rawRule.cycleLength) % rawRule.cycleLength;
  const ganZhi = LunarUtil.JIA_ZI[targetIndex];
  if (!ganZhi) throw new LuckCoreError("UPSTREAM_DATA_ERROR", "上游六十甲子表缺少目标小运干支。" );
  return ganZhi;
}

/**
 * Computes factual, reproducible luck-cycle timing only. It deliberately emits
 * no auspicious/inauspicious interpretation, strength judgment, or prediction.
 */
function calculateLuckCycleV0_1_0(
  rawInput: LuckCycleInput,
  rawRule: LuckCycleRule
): LuckCycleResult {
  let rule: unknown;
  try {
    rule = structuredClone(rawRule);
  } catch (cause) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "运限规则必须能被结构化复制并完整保存。", { cause });
  }
  assertSupportedRule(rule);
  const input = normalizeInput(rawInput);
  const birthEpochMilliseconds = Date.parse(input.birthInstant);
  assertSupportedRange(birthEpochMilliseconds);

  const birthLunar = solarFromFixedEightEpoch(birthEpochMilliseconds).getLunar();
  const yearGanZhi = birthLunar.getYearInGanZhiExact();
  const monthGanZhi = birthLunar.getMonthInGanZhiExact();
  assertExpectedPillars(input, yearGanZhi, monthGanZhi);

  const direction = resolveDirection(yearGanZhi, input, rule);
  const adjacentJie = findAdjacentJie(birthEpochMilliseconds);
  const selectedAnchor = adjacentJie.exactBoundary ??
    (direction.value === "forward" ? adjacentJie.next : adjacentJie.previous);
  const anchorEpochMilliseconds = Date.parse(selectedAnchor.instant);
  const sourceDurationMilliseconds = Math.abs(anchorEpochMilliseconds - birthEpochMilliseconds);
  if (!Number.isSafeInteger(sourceDurationMilliseconds)) {
    throw new LuckCoreError("UPSTREAM_DATA_ERROR", "起运节令时差超出安全整数范围。" );
  }

  const components = decomposeTraditionalAge(sourceDurationMilliseconds);
  const startAgeBase = exactAge(sourceDurationMilliseconds);
  const handoverEpochMilliseconds = addCalendarComponentsInFixedEight(birthEpochMilliseconds, components);
  const decades: LuckDecade[] = Array.from({ length: rule.decadeCount }, (_, arrayIndex) => {
    const index = arrayIndex + 1;
    const startYearOffset = arrayIndex * rule.decadeYears;
    const endYearOffset = index * rule.decadeYears;
    const startInstant = addCalendarYearsInFixedEight(handoverEpochMilliseconds, startYearOffset);
    const endExclusiveInstant = addCalendarYearsInFixedEight(handoverEpochMilliseconds, endYearOffset);
    return {
      ...FACT_METADATA,
      index,
      ganZhi: cycleGanZhi(monthGanZhi, direction.value, index),
      direction: direction.value,
      startAge: exactAge(sourceDurationMilliseconds, startYearOffset),
      endAgeExclusive: exactAge(sourceDurationMilliseconds, endYearOffset),
      startInstant: new Date(startInstant).toISOString(),
      endExclusiveInstant: new Date(endExclusiveInstant).toISOString(),
      startFixedPlusEightWallDateTime: fixedEightWallFromEpoch(startInstant),
      endExclusiveFixedPlusEightWallDateTime: fixedEightWallFromEpoch(endExclusiveInstant)
    };
  });

  return {
    schemaVersion: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.outputSchemaVersion,
    kind: "luck_cycle_facts",
    manifest: {
      algorithmId: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.algorithmId,
      engine: {
        name: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.engine.name,
        version: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.engine.version
      },
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      upstream: {
        name: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream.name,
        version: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream.version,
        tagCommit: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream.tagCommit,
        integrity: LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream.integrity
      },
      sourceRefs: [
        `https://github.com/6tail/lunar-typescript/blob/${LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream.tagCommit}/src/lib/Lunar.ts`,
        `https://github.com/6tail/lunar-typescript/blob/${LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream.tagCommit}/src/lib/Yun.ts`,
        `https://github.com/6tail/lunar-typescript/blob/${LUCK_CYCLE_EXECUTOR_DESCRIPTOR.upstream.tagCommit}/src/lib/DaYun.ts`
      ],
      verificationStatus: "engineering_preview",
      goldCaseCount: 0,
      releaseGatePassed: false
    },
    input,
    rule,
    birth: {
      ...FACT_METADATA,
      instant: input.birthInstant,
      fixedPlusEightWallDateTime: fixedEightWallFromEpoch(birthEpochMilliseconds),
      yearGanZhi,
      monthGanZhi
    },
    direction,
    adjacentJie: {
      ...adjacentJie,
      selectedAnchor
    },
    anchorInterval: {
      ...FACT_METADATA,
      fromInstant: direction.value === "forward" ? input.birthInstant : selectedAnchor.instant,
      toInstant: direction.value === "forward" ? selectedAnchor.instant : input.birthInstant,
      durationMilliseconds: sourceDurationMilliseconds,
      durationSeconds: rational(sourceDurationMilliseconds, 1_000),
      durationDays: rational(sourceDurationMilliseconds, 86_400_000)
    },
    startAge: {
      ...FACT_METADATA,
      ...startAgeBase,
      sourceDurationMilliseconds,
      sourceToTraditionalYearRatio: rational(sourceDurationMilliseconds, THREE_DAYS_MILLISECONDS),
      unrounded: true
    },
    handover: {
      ...FACT_METADATA,
      instant: new Date(handoverEpochMilliseconds).toISOString(),
      fixedPlusEightWallDateTime: fixedEightWallFromEpoch(handoverEpochMilliseconds),
      calendarFrame: "fixed_plus08",
      calendarOverflow: "constrain"
    },
    decades,
    warnings: [
      "当前结果是运限工程预览，只输出顺逆、节令时差、起运年龄与大运时间事实，不输出吉凶断语。",
      "节令来自 lunar-typescript 1.8.6 的固定 UTC+08:00 秒级表；交运时刻也按固定 +08 历法顺序加年、月、日、时间。",
      "起止年龄均为从出生时刻起算的实足折算年龄，不是虚岁；大运结束时刻采用半开区间 endExclusive。"
    ],
    knownGaps: [
      "尚无项目金标案例；goldCaseCount=0，releaseGatePassed=false。",
      "三日一岁、顺逆取节、交运日历加法及月末 constrain 尚待命理专家裁决，不能视为唯一流派。",
      "尚未支持按气、最近节气、天数取整、只保留年月日、真太阳时或出生地 IANA 日历交运等变体。",
      "上游节令仅到秒；更高精度天文历表及 1900—2100 范围外尚未验证。"
    ]
  };
}

/** Current public API retained independently from the frozen historical entry. */
export function calculateLuckCycle(
  rawInput: LuckCycleInput,
  rawRule: LuckCycleRule = DEFAULT_LUCK_CYCLE_RULE
): LuckCycleResult {
  return calculateLuckCycleV0_1_0(rawInput, rawRule);
}

function deepFreezeReplayValue<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreezeReplayValue(nested, seen);
  }
  return Object.freeze(value);
}

function cloneAndFreezeReplayValue<T>(
  value: T,
  code: "INVALID_INPUT" | "UNSUPPORTED_RULE",
  label: string
): T {
  try {
    return deepFreezeReplayValue(structuredClone(value));
  } catch (cause) {
    throw new LuckCoreError(code, `${label}必须能被结构化复制并冻结后才能执行历史只读复演。`, { cause });
  }
}

function replayLuckCycleWithEngine0_1_0(
  rawInput: LuckCycleInput,
  rawRuleSnapshot: LuckCycleRule
): LuckCycleResult {
  assertExactHistoricalLuckCycleInput(rawInput);
  assertExactHistoricalLuckCycleRule(rawRuleSnapshot);
  const frozenInput = cloneAndFreezeReplayValue(rawInput, "INVALID_INPUT", "运限输入");
  const frozenRuleSnapshot = cloneAndFreezeReplayValue(rawRuleSnapshot, "UNSUPPORTED_RULE", "运限规则快照");
  const result = calculateLuckCycleV0_1_0(frozenInput, frozenRuleSnapshot);
  assertHistoricalLuckCycleExecutorOutput(result, LUCK_CYCLE_EXECUTOR_DESCRIPTOR);
  return deepFreezeReplayValue(result);
}

export const LUCK_CYCLE_EXECUTOR_DESCRIPTOR: Readonly<LuckCycleExecutorDescriptor> = Object.freeze({
  outputSchemaVersion: LUCK_CYCLE_OUTPUT_SCHEMA_VERSION,
  ruleSnapshotSchemaVersion: "1.0.0",
  algorithmId: LUCK_CYCLE_ALGORITHM_ID,
  engine: Object.freeze({
    name: LUCK_CORE_ENGINE.name,
    version: LUCK_CORE_ENGINE.version
  }),
  upstream: Object.freeze({
    name: LUCK_CORE_ENGINE.upstreamName,
    version: LUCK_CORE_ENGINE.upstreamVersion,
    tagCommit: LUCK_CORE_ENGINE.upstreamTagCommit,
    integrity: LUCK_CORE_ENGINE.upstreamIntegrity
  })
});

/**
 * Append-only registry for zero-write historical luck-cycle replay. Published
 * entries are immutable; new implementations must append a new descriptor and
 * executor instead of changing or replacing an existing entry.
 */
export const HISTORICAL_LUCK_CYCLE_EXECUTOR_REGISTRY: readonly HistoricalLuckCycleExecutor[] = Object.freeze([
  Object.freeze({
    executorId: "hakimi-luck-core:luck-cycle-executor:0.1.0",
    descriptor: LUCK_CYCLE_EXECUTOR_DESCRIPTOR,
    replay: replayLuckCycleWithEngine0_1_0
  })
]);

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function assertExactHistoricalLuckCycleInput(rawInput: unknown): asserts rawInput is LuckCycleInput {
  if (!isRecord(rawInput)) {
    throw new LuckCoreError("INVALID_INPUT", "历史运限输入必须是精确键的版本化对象。");
  }
  const optionalKeys = ["manualDirection", "expectedYearGanZhi", "expectedMonthGanZhi"] as const;
  const presentOptionalKeys = optionalKeys.filter((key) => hasOwn(rawInput, key));
  if (!hasExactKeys(rawInput, ["schemaVersion", "birthInstant", "sex", ...presentOptionalKeys])) {
    throw new LuckCoreError("INVALID_INPUT", "历史运限输入包含未知、额外或缺失字段，已拒绝只读复演。");
  }
  if (presentOptionalKeys.some((key) => rawInput[key] === undefined)) {
    throw new LuckCoreError("INVALID_INPUT", "历史运限输入的可选字段一旦存在就不能是 undefined。");
  }
}

function assertExactHistoricalLuckCycleRule(rawRule: unknown): asserts rawRule is LuckCycleRule {
  if (!isRecord(rawRule)) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "历史运限规则快照必须是精确键的版本化对象。");
  }
  const ruleKeys = [
    "schemaVersion",
    "ruleId",
    "ruleVersion",
    "directionRule",
    "unknownSexPolicy",
    "anchor",
    "exactBoundaryPolicy",
    "startAgeMethod",
    "componentRatios",
    "handoverCalendar",
    "decadeYears",
    "decadeCount",
    ...(hasOwn(rawRule, "xiaoyun") ? ["xiaoyun"] : [])
  ];
  if (!hasExactKeys(rawRule, ruleKeys)) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "历史运限规则快照包含未知、额外或缺失字段，已拒绝只读复演。");
  }
  if (!isRecord(rawRule.componentRatios) || !hasExactKeys(rawRule.componentRatios, [
    "sourceDaysPerTraditionalYear",
    "traditionalMonthsPerYear",
    "traditionalDaysPerMonth",
    "traditionalHoursPerDay"
  ])) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "历史运限规则 componentRatios 必须使用精确键。");
  }
  if (!isRecord(rawRule.handoverCalendar) || !hasExactKeys(rawRule.handoverCalendar, [
    "frame",
    "additionOrder",
    "overflow"
  ])) {
    throw new LuckCoreError("UNSUPPORTED_RULE", "历史运限规则 handoverCalendar 必须使用精确键。");
  }
  if (hasOwn(rawRule, "xiaoyun")) {
    if (!isRecord(rawRule.xiaoyun) || !hasExactKeys(rawRule.xiaoyun, [
      "method",
      "directionRule",
      "directionReuse",
      "firstAge",
      "firstStepOffset",
      "ageBasis",
      "boundaryAlignment",
      "boundaryFrame",
      "scope",
      "cycleLength",
      "intervalPolicy",
      "unknownSexPolicy",
      "unknownHourPolicy"
    ])) {
      throw new LuckCoreError("UNSUPPORTED_RULE", "历史运限规则 xiaoyun 必须使用精确键。");
    }
  }
}

function parseLuckCycleExecutorDescriptor(rawDescriptor: unknown): LuckCycleExecutorDescriptor | null {
  if (!isRecord(rawDescriptor) || !hasExactKeys(rawDescriptor, [
    "outputSchemaVersion",
    "ruleSnapshotSchemaVersion",
    "algorithmId",
    "engine",
    "upstream"
  ])) return null;
  if (!isRecord(rawDescriptor.engine) || !hasExactKeys(rawDescriptor.engine, ["name", "version"])) return null;
  if (!isRecord(rawDescriptor.upstream) || !hasExactKeys(rawDescriptor.upstream, [
    "name",
    "version",
    "tagCommit",
    "integrity"
  ])) return null;
  if (
    typeof rawDescriptor.outputSchemaVersion !== "string" ||
    typeof rawDescriptor.ruleSnapshotSchemaVersion !== "string" ||
    typeof rawDescriptor.algorithmId !== "string" ||
    typeof rawDescriptor.engine.name !== "string" ||
    typeof rawDescriptor.engine.version !== "string" ||
    typeof rawDescriptor.upstream.name !== "string" ||
    typeof rawDescriptor.upstream.version !== "string" ||
    typeof rawDescriptor.upstream.tagCommit !== "string" ||
    typeof rawDescriptor.upstream.integrity !== "string"
  ) return null;
  return rawDescriptor as LuckCycleExecutorDescriptor;
}

function sameLuckCycleExecutorDescriptor(
  left: LuckCycleExecutorDescriptor,
  right: LuckCycleExecutorDescriptor
): boolean {
  return left.outputSchemaVersion === right.outputSchemaVersion &&
    left.ruleSnapshotSchemaVersion === right.ruleSnapshotSchemaVersion &&
    left.algorithmId === right.algorithmId &&
    left.engine.name === right.engine.name &&
    left.engine.version === right.engine.version &&
    left.upstream.name === right.upstream.name &&
    left.upstream.version === right.upstream.version &&
    left.upstream.tagCommit === right.upstream.tagCommit &&
    left.upstream.integrity === right.upstream.integrity;
}

function assertHistoricalLuckCycleExecutorOutput(
  result: LuckCycleResult,
  expected: LuckCycleExecutorDescriptor
): void {
  const actual: LuckCycleExecutorDescriptor = {
    outputSchemaVersion: result.schemaVersion,
    ruleSnapshotSchemaVersion: result.rule.schemaVersion,
    algorithmId: result.manifest.algorithmId,
    engine: result.manifest.engine,
    upstream: result.manifest.upstream
  };
  const factLayers: FactMetadata[] = [
    result.birth,
    result.direction,
    result.adjacentJie.previous,
    ...(result.adjacentJie.exactBoundary ? [result.adjacentJie.exactBoundary] : []),
    result.adjacentJie.next,
    result.adjacentJie.selectedAnchor,
    result.anchorInterval,
    result.startAge,
    result.handover,
    ...result.decades
  ];
  if (
    !sameLuckCycleExecutorDescriptor(actual, expected) ||
    result.manifest.ruleId !== result.rule.ruleId ||
    result.manifest.ruleVersion !== result.rule.ruleVersion ||
    factLayers.some((fact) => fact.algorithmId !== expected.algorithmId)
  ) {
    throw new LuckCoreError(
      "HISTORICAL_EXECUTOR_OUTPUT_MISMATCH",
      "历史运限执行器输出未保持其冻结 descriptor 或规则身份，已拒绝返回结果。"
    );
  }
}

/** Complete-descriptor lookup. Partial, version-only and fallback matching are forbidden. */
export function lookupHistoricalLuckCycleExecutor(
  rawDescriptor: unknown
): HistoricalLuckCycleExecutor | null {
  const descriptor = parseLuckCycleExecutorDescriptor(rawDescriptor);
  if (!descriptor) return null;
  return HISTORICAL_LUCK_CYCLE_EXECUTOR_REGISTRY.find((entry) =>
    sameLuckCycleExecutorDescriptor(descriptor, entry.descriptor)
  ) ?? null;
}

export function requireHistoricalLuckCycleExecutor(
  rawDescriptor: unknown
): HistoricalLuckCycleExecutor {
  const executor = lookupHistoricalLuckCycleExecutor(rawDescriptor);
  if (executor) return executor;
  throw new LuckCoreError(
    "HISTORICAL_EXECUTOR_UNAVAILABLE",
    "没有与完整运限执行器描述符精确匹配的历史执行器；只读复演已拒绝，且不会回退到当前版本。"
  );
}

/** Convenience entry point; it never persists or mutates the supplied snapshots. */
export function replayHistoricalLuckCycle(
  rawDescriptor: unknown,
  rawInput: LuckCycleInput,
  frozenRuleSnapshot: LuckCycleRule
): LuckCycleResult {
  return requireHistoricalLuckCycleExecutor(rawDescriptor).replay(rawInput, frozenRuleSnapshot);
}
