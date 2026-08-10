import { z } from "zod";
import { isBundledTimeZoneName } from "@hakimi/tzdb-core";

export const SCHEMA_VERSION = "1.0.0" as const;
export const LEGACY_HASH_SCHEMA_VERSION = "1.0.0" as const;
export const HASH_SCHEMA_VERSION = "2.0.0" as const;
export const LEGACY_UNIDENTIFIED_TZDB_VERSION = "browser-intl-unreported" as const;
export const TIME_ZONE_DATABASE_SNAPSHOT_SCHEMA_VERSION = "1.0.0" as const;
/** Frozen data-schema identity used by every backup format released through full v0.8. */
export const BACKUP_DATA_SCHEMA_VERSION_V1 = "1.0.0" as const;
export const RESEARCH_SUBJECT_RECORD_VERSION = 2 as const;
export const EVENT_RECORD_VERSION = 2 as const;
export const RESEARCH_QUERY_VERSION = 1 as const;
export const SAVED_VIEW_RECORD_VERSION = 2 as const;
export const SAVED_VIEW_LEGACY_MIGRATION_REASON = "legacy_untyped_filters_require_manual_review" as const;
export const LOCAL_ATTACHMENT_RECORD_VERSION = 1 as const;
export const LOCAL_RESEARCHER_PROFILE_RECORD_VERSION = 1 as const;
export const LOCAL_APP_SETTINGS_RECORD_VERSION = 1 as const;
export const LOCAL_RULE_REGISTRY_RECORD_VERSION = 1 as const;
export const LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION = 1 as const;
export const TZDB_MIGRATION_RECEIPT_RECORD_VERSION = 2 as const;
export const LEGACY_CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION = "1.0.0" as const;
export const CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION = "2.0.0" as const;
export const EVENT_TIME_MIGRATION_RECEIPT_RECORD_VERSION = 1 as const;
export const EVENT_TIME_MIGRATION_SNAPSHOT_FORMAT_VERSION = "1.0.0" as const;
export const LOCAL_RESEARCHER_PROFILE_ID = "local-researcher-profile" as const;
export const LOCAL_APP_SETTINGS_ID = "local-app-settings" as const;
export const ACTIVE_RULE_PACK_RECORD_ID = "active-rule-pack" as const;
export const MAX_LOCAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const PILLAR_RELATION_TYPES = [
  "stem_five_combination",
  "stem_clash",
  "branch_six_combination",
  "branch_six_clash",
  "branch_three_harmony",
  "branch_three_meeting",
  "branch_three_punishment",
  "branch_binary_punishment",
  "branch_self_punishment",
  "branch_six_harm",
  "branch_six_break"
] as const;

const calendarDateTextSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    return year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
  }, "日期不在 1900—2100 的可输入范围内");

const gregorianDateSchema = calendarDateTextSchema.refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDay;
}, "日期不在 1900—2100 的有效公历范围内");

const lunarDateSchema = calendarDateTextSchema.refine((value) => {
  const day = Number(value.slice(8, 10));
  return day <= 30;
}, "农历日期的日必须位于 01—30；月份大小及闰月有效性由版本化历法适配器继续校验");

const minuteClockTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const secondClockTimePattern = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
const clockTimeSchema = z.string().refine(
  (value) => minuteClockTimePattern.test(value) || secondClockTimePattern.test(value),
  "时间格式应为 HH:mm 或 HH:mm:ss"
);

const ianaTimeZoneSchema = z.string().min(1, "请选择 IANA 时区").refine(
  isBundledTimeZoneName,
  "不是固定 IANA 2026c 数据工件可识别的时区"
);

export const birthInputSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    calendarType: z.enum(["gregorian", "lunar"]),
    date: calendarDateTextSchema,
    time: clockTimeSchema.nullable(),
    timePrecision: z.enum(["exact_second", "exact_minute", "hour_range", "unknown_hour", "date_only"]),
    timeZone: ianaTimeZoneSchema,
    sex: z.enum(["male", "female", "unspecified"]),
    lunarLeapMonth: z.boolean().default(false),
    location: z.object({
      label: z.string().trim().max(80).default(""),
      latitude: z.number().min(-90).max(90).nullable().default(null),
      longitude: z.number().min(-180).max(180).nullable().default(null),
      precision: z.enum(["coordinates", "city", "unknown"]).default("unknown")
    }),
    sourceNote: z.string().trim().max(500).default("")
  })
  .superRefine((value, context) => {
    const calendarDateResult = value.calendarType === "gregorian"
      ? gregorianDateSchema.safeParse(value.date)
      : lunarDateSchema.safeParse(value.date);
    if (!calendarDateResult.success) {
      context.addIssue({
        code: "custom",
        path: ["date"],
        message: calendarDateResult.error.issues[0]?.message ?? "出生日期与所选历法不一致"
      });
    }
    if ((value.timePrecision === "exact_minute" || value.timePrecision === "exact_second") && value.time === null) {
      context.addIssue({
        code: "custom",
        path: ["time"],
        message: "精确时间输入必须填写时间"
      });
    }
    if (value.timePrecision === "exact_minute" && value.time !== null && !minuteClockTimePattern.test(value.time)) {
      context.addIssue({
        code: "custom",
        path: ["time"],
        message: "精确到分钟的输入必须使用 HH:mm，不能携带秒"
      });
    }
    if (value.timePrecision === "exact_second" && value.time !== null && !secondClockTimePattern.test(value.time)) {
      context.addIssue({
        code: "custom",
        path: ["time"],
        message: "精确到秒的输入必须使用 HH:mm:ss"
      });
    }
    if ((value.timePrecision === "unknown_hour" || value.timePrecision === "date_only") && value.time !== null) {
      context.addIssue({
        code: "custom",
        path: ["time"],
        message: "未知时辰或仅日期输入必须把时间保存为 null，不能携带合成时刻"
      });
    }
    if (value.calendarType === "gregorian" && value.lunarLeapMonth) {
      context.addIssue({
        code: "custom",
        path: ["lunarLeapMonth"],
        message: "公历输入不能标记闰月"
      });
    }
  });

export type UnknownHourBirthInput = z.infer<typeof birthInputSchema> & {
  time: null;
  timePrecision: "unknown_hour";
};

export const unknownHourBirthInputSchema = birthInputSchema.strict().refine(
  (value): value is UnknownHourBirthInput => value.timePrecision === "unknown_hour" && value.time === null,
  { path: ["timePrecision"], message: "未知时辰入口只接受 timePrecision=unknown_hour 且 time=null" }
);

export const ruleProfileSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  profileId: z.string().regex(/^[a-z0-9-]+$/),
  profileVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: z.enum(["working_default", "verified", "experimental"]),
  label: z.string().min(1).max(80),
  notice: z.string().min(1).max(300),
  sourceRefs: z.array(z.string()).default([]),
  supportedRange: z.object({
    stronglyVerifiedFrom: gregorianDateSchema,
    stronglyVerifiedTo: gregorianDateSchema,
    outsideRangePolicy: z.enum(["reject", "experimental_with_warning"])
  }),
  calendar: z.object({
    yearBoundary: z.enum(["lichun_exact", "lunar_new_year"]),
    monthBoundary: z.enum(["jie_exact", "civil_day"]),
    dayBoundary: z.enum(["zi_start_23", "midnight", "split_zi"]),
    ziHourDayStemBasis: z.enum(["after_day_change", "civil_day"]),
    hourBasis: z.enum(["civil_time", "mean_solar", "apparent_solar"]),
    timezoneSource: z.literal("iana"),
    dstAmbiguity: z.enum(["require_user", "earlier", "later"]),
    locationPrecision: z.enum(["city", "coordinates"])
  }),
  solarTime: z.object({
    enabled: z.boolean(),
    showComparison: z.boolean(),
    longitudeSource: z.literal("location"),
    equationOfTimeModel: z.string().nullable()
  }),
  luckCycle: z.object({
    directionRule: z.literal("year_stem_yinyang_and_gender"),
    unknownValuePolicy: z.literal("require_manual_direction"),
    anchor: z.literal("directional_jie"),
    startAgeMethod: z.literal("three_days_one_year_exact_duration"),
    rounding: z.literal("retain_duration")
  }),
  layers: z.object({
    hiddenStems: z.boolean(),
    tenGods: z.boolean(),
    nayin: z.boolean(),
    voidBranches: z.boolean(),
    twelveGrowth: z.boolean(),
    stemBranchRelations: z.boolean(),
    shensha: z.boolean()
  }),
  interpretation: z.object({
    strengthRulePack: z.string().nullable(),
    structureRulePack: z.string().nullable(),
    climateRulePack: z.string().nullable(),
    usefulGodRulePack: z.string().nullable()
  })
}).superRefine((value, context) => {
  if (value.supportedRange.stronglyVerifiedFrom > value.supportedRange.stronglyVerifiedTo) {
    context.addIssue({
      code: "custom",
      path: ["supportedRange", "stronglyVerifiedTo"],
      message: "stronglyVerifiedTo 不能早于 stronglyVerifiedFrom"
    });
  }

  const expectedZiHourDayStemBasis = value.calendar.dayBoundary === "zi_start_23"
    ? "after_day_change"
    : "civil_day";

  if (value.calendar.ziHourDayStemBasis !== expectedZiHourDayStemBasis) {
    context.addIssue({
      code: "custom",
      path: ["calendar", "ziHourDayStemBasis"],
      message: value.calendar.dayBoundary === "zi_start_23"
        ? "zi_start_23 换日必须使用 after_day_change 子时日干基准"
        : `${value.calendar.dayBoundary} 换日必须使用 civil_day 子时日干基准`
    });
  }
});

/**
 * Locked engineering-preview choice for the minor-luck (小运) layer.
 *
 * The field remains optional on LuckCycleRuleSnapshot so revisions written
 * before this rule existed stay readable. Writers created after the rule was
 * introduced always persist it; calculators must not infer it for an older
 * snapshot where it is absent.
 */
export const xiaoyunRuleSnapshotSchema = z.strictObject({
  method: z.literal("birth_hour_adjacent"),
  directionRule: z.literal("exact_chart_year_stem_and_gender"),
  directionReuse: z.literal("luck_cycle_or_manual_direction"),
  firstAge: z.literal(1),
  firstStepOffset: z.literal(1),
  ageBasis: z.literal("nominal_age"),
  boundaryAlignment: z.literal("flow_year_start_exact"),
  boundaryFrame: z.literal("fixed_plus08"),
  scope: z.literal("whole_life"),
  cycleLength: z.literal(60),
  intervalPolicy: z.literal("half_open"),
  unknownSexPolicy: z.literal("require_manual_direction"),
  unknownHourPolicy: z.literal("unsupported")
});

export const luckCycleRuleSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  ruleId: z.string().min(1).max(120),
  ruleVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  directionRule: z.literal("year_stem_yinyang_and_gender"),
  unknownSexPolicy: z.enum(["require_manual_direction", "reject"]),
  anchor: z.literal("directional_jie"),
  exactBoundaryPolicy: z.literal("zero_duration"),
  startAgeMethod: z.literal("three_days_one_year_exact_duration"),
  componentRatios: z.strictObject({
    sourceDaysPerTraditionalYear: z.literal(3),
    traditionalMonthsPerYear: z.literal(12),
    traditionalDaysPerMonth: z.literal(30),
    traditionalHoursPerDay: z.literal(24)
  }),
  handoverCalendar: z.strictObject({
    frame: z.literal("fixed_plus08"),
    additionOrder: z.literal("years_months_days_time"),
    overflow: z.literal("constrain")
  }),
  decadeYears: z.literal(10),
  decadeCount: z.number().int().min(1).max(20),
  xiaoyun: xiaoyunRuleSnapshotSchema.optional()
}).superRefine((value, context) => {
  if (value.xiaoyun && value.unknownSexPolicy !== value.xiaoyun.unknownSexPolicy) {
    context.addIssue({
      code: "custom",
      path: ["xiaoyun", "unknownSexPolicy"],
      message: "小运复用大运顺逆时，未指定性别策略必须与起运规则一致"
    });
  }
});

export const dstDisambiguationPolicySchema = z.enum(["reject", "earlier", "later"]);

export const timeZoneCandidateSchema = z.object({
  choice: z.enum(["unique", "earlier", "later"]),
  instant: z.string().datetime({ offset: true }),
  utcOffset: z.string().regex(/^[+-]\d{2}:[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/),
  utcOffsetMinutes: z.number().finite(),
  resolvedWallTime: z.string(),
  zonedDateTime: z.string(),
  matchesInputWallTime: z.boolean()
});

export const timeZoneResolutionSchema = z.object({
  kind: z.enum(["unique", "overlap", "gap"]),
  policy: dstDisambiguationPolicySchema,
  status: z.enum([
    "resolved_unique",
    "resolved_overlap_earlier",
    "resolved_overlap_later",
    "rejected_overlap",
    "shifted_gap_earlier",
    "shifted_gap_later",
    "rejected_gap"
  ]),
  requestedWallTime: z.string(),
  candidates: z.array(timeZoneCandidateSchema).min(1).max(2),
  selectedCandidate: timeZoneCandidateSchema.nullable()
});

export const solarTimeVariantSchema = z.object({
  candidateChoice: z.enum(["unique", "earlier", "later"]),
  sourceInstant: z.string().datetime({ offset: true }),
  sourceUtcOffset: z.string(),
  sourceWallTime: z.string(),
  meanSolarDateTime: z.string(),
  apparentSolarDateTime: z.string(),
  longitudeCorrectionMinutes: z.number().finite(),
  equationOfTimeMinutes: z.number().finite(),
  totalCorrectionMinutes: z.number().finite()
});

export const solarTimeDetailsSchema = z.object({
  modelId: z.literal("noaa-gml-fractional-year-eot-approx-v1"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  applied: z.literal(false),
  selectedVariantChoice: z.enum(["unique", "earlier", "later"]).nullable(),
  variants: z.array(solarTimeVariantSchema).min(1).max(2),
  warnings: z.array(z.string())
});

export const calendarResolutionSchema = z.strictObject({
  inputCalendarType: z.enum(["gregorian", "lunar"]),
  inputDate: calendarDateTextSchema,
  inputLunarLeapMonth: z.boolean(),
  resolvedGregorianDate: gregorianDateSchema,
  algorithmId: z.enum([
    "hakimi-time-core:gregorian-identity:v1",
    "hakimi-time-core:lunar-typescript-1.8.6-to-solar:v1"
  ]),
  frame: z.enum(["identity_gregorian", "fixed_plus08_lunisolar_date"]),
  upstreamName: z.literal("lunar-typescript").nullable(),
  upstreamVersion: z.literal("1.8.6").nullable(),
  roundTripVerified: z.literal(true),
  sourceRefs: z.array(z.string().url()),
  warnings: z.array(z.string())
}).superRefine((value, context) => {
  if (value.inputCalendarType === "gregorian") {
    if (value.inputLunarLeapMonth) {
      context.addIssue({ code: "custom", path: ["inputLunarLeapMonth"], message: "公历恒等解析不能携带闰月标记" });
    }
    if (value.inputDate !== value.resolvedGregorianDate) {
      context.addIssue({ code: "custom", path: ["resolvedGregorianDate"], message: "公历恒等解析不得改变日期" });
    }
    if (
      value.algorithmId !== "hakimi-time-core:gregorian-identity:v1" ||
      value.frame !== "identity_gregorian" ||
      value.upstreamName !== null ||
      value.upstreamVersion !== null ||
      value.sourceRefs.length !== 0
    ) {
      context.addIssue({ code: "custom", path: ["algorithmId"], message: "公历恒等解析的算法、框架与上游字段不一致" });
    }
  } else if (
    value.algorithmId !== "hakimi-time-core:lunar-typescript-1.8.6-to-solar:v1" ||
    value.frame !== "fixed_plus08_lunisolar_date" ||
    value.upstreamName !== "lunar-typescript" ||
    value.upstreamVersion !== "1.8.6" ||
    value.sourceRefs.length === 0
  ) {
    context.addIssue({ code: "custom", path: ["algorithmId"], message: "农历解析必须绑定固定适配器版本、历法框架与来源" });
  }
});

export const timeCalibrationSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  originalCivilDateTime: z.string(),
  activeWallTime: z.string(),
  timeZone: ianaTimeZoneSchema,
  utcInstant: z.string().nullable(),
  utcOffset: z.string().nullable(),
  dstStatus: z.enum(["resolved", "unresolved", "not_applicable"]),
  solarTimePreview: z.string().nullable(),
  solarTimeApplied: z.boolean(),
  normalizationStatus: z.enum(["wall_time_only", "instant_resolved"]),
  warnings: z.array(z.string()),
  calendarResolution: calendarResolutionSchema.optional(),
  timeZoneResolution: timeZoneResolutionSchema.optional(),
  solarTime: solarTimeDetailsSchema.nullable().optional()
});

export const normalizedTimeCalibrationSchema = timeCalibrationSchema.extend({
  calendarResolution: calendarResolutionSchema,
  timeZoneResolution: timeZoneResolutionSchema,
  solarTime: solarTimeDetailsSchema.nullable()
});

export const pillarFactSchema = z.object({
  name: z.enum(["year", "month", "day", "hour"]),
  label: z.enum(["年柱", "月柱", "日柱", "时柱"]),
  ganZhi: z.string().length(2),
  stem: z.string().length(1),
  branch: z.string().length(1),
  hiddenStems: z.array(z.string().length(1)),
  stemTenGod: z.string(),
  branchTenGods: z.array(z.string()),
  wuXing: z.string(),
  nayin: z.string(),
  twelveGrowth: z.string(),
  xun: z.string(),
  voidBranches: z.string()
});

export const fieldProvenanceSchema = z.object({
  field: z.string(),
  kind: z.enum(["calendar_fact", "rule_derived", "interpretive_claim", "ai_expression"]),
  algorithmId: z.string(),
  sourceRefs: z.array(z.string()),
  verificationStatus: z.enum(["gold_verified", "adjudicated", "disputed", "experimental"]),
  note: z.string()
});

export const chartFactsSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  calendar: z.object({
    solarText: z.string(),
    lunarText: z.string(),
    lunarYear: z.number().int(),
    lunarMonth: z.number().int(),
    lunarDay: z.number().int(),
    isLeapMonth: z.boolean(),
    previousJie: z.string().nullable(),
    nextJie: z.string().nullable()
  }),
  pillars: z.object({
    year: pillarFactSchema,
    month: pillarFactSchema,
    day: pillarFactSchema,
    hour: pillarFactSchema
  }),
  fieldProvenance: z.array(fieldProvenanceSchema)
});

export const calculationEngineSchema = z.strictObject({
  name: z.literal("hakimi-bazi-core"),
  version: z.string(),
  upstreamName: z.literal("lunar-typescript"),
  upstreamVersion: z.literal("1.8.6"),
  upstreamTagCommit: z.string(),
  upstreamIntegrity: z.string()
});

const semanticVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const tzdbComponentNameSchema = z.string().regex(/^[a-z0-9-]+$/);

export const timeZoneDatabaseSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(TIME_ZONE_DATABASE_SNAPSHOT_SCHEMA_VERSION),
  kind: z.literal("bundled_iana_tzdb"),
  ianaVersion: z.string().regex(/^\d{4}[a-z]$/),
  artifactName: z.string().min(1).max(200),
  dataSha256: z.string().regex(/^[a-f0-9]{64}$/),
  resolver: z.strictObject({
    name: tzdbComponentNameSchema,
    version: semanticVersionSchema
  }),
  adapter: z.strictObject({
    name: tzdbComponentNameSchema,
    version: semanticVersionSchema
  }),
  supportedRange: z.strictObject({
    from: calendarDateTextSchema,
    to: calendarDateTextSchema
  }),
  snapshotId: z.string().min(1).max(300)
}).superRefine((value, context) => {
  if (value.snapshotId !== buildTimeZoneDatabaseSnapshotId(value)) {
    context.addIssue({ code: "custom", path: ["snapshotId"], message: "tzdb snapshotId 必须绑定 IANA 版本、数据摘要与解析器身份" });
  }
  if (value.supportedRange.to < value.supportedRange.from) {
    context.addIssue({ code: "custom", path: ["supportedRange", "to"], message: "tzdb 支持区间终点不能早于起点" });
  }
});

export type TimeZoneDatabaseSnapshotIdSource = Pick<
  z.input<typeof timeZoneDatabaseSnapshotSchema>,
  "ianaVersion" | "dataSha256" | "resolver" | "adapter"
>;

export function buildTimeZoneDatabaseSnapshotId(value: TimeZoneDatabaseSnapshotIdSource): string {
  return `iana-tzdb@${value.ianaVersion}/sha256:${value.dataSha256}` +
    `/${value.resolver.name}@${value.resolver.version}` +
    `/${value.adapter.name}@${value.adapter.version}`;
}

export const identifiedTzdbVersionSchema = z.string().min(1).max(300).regex(
  /^iana-tzdb@\d{4}[a-z]\/sha256:[a-f0-9]{64}\/[a-z0-9-]+@\d+\.\d+\.\d+\/[a-z0-9-]+@\d+\.\d+\.\d+$/
);
export const tzdbVersionSchema = z.union([
  z.literal(LEGACY_UNIDENTIFIED_TZDB_VERSION),
  identifiedTzdbVersionSchema
]);

function validateTzdbBinding(
  value: {
    tzdbVersion: string;
    timeZoneDatabase?: z.infer<typeof timeZoneDatabaseSnapshotSchema>;
  },
  context: z.RefinementCtx,
  pathPrefix: Array<string | number> = []
) {
  if (value.tzdbVersion === LEGACY_UNIDENTIFIED_TZDB_VERSION) {
    if (value.timeZoneDatabase !== undefined) {
      context.addIssue({ code: "custom", path: [...pathPrefix, "timeZoneDatabase"], message: "历史未识别 tzdb 不能伪造固定数据快照" });
    }
    return;
  }
  if (!value.timeZoneDatabase) {
    context.addIssue({ code: "custom", path: [...pathPrefix, "timeZoneDatabase"], message: "可识别 tzdb 必须携带内容寻址数据快照" });
  } else if (value.tzdbVersion !== value.timeZoneDatabase.snapshotId) {
    context.addIssue({ code: "custom", path: [...pathPrefix, "tzdbVersion"], message: "tzdbVersion 必须等于 timeZoneDatabase.snapshotId" });
  }
}

export const calculationManifestSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  hashSchemaVersion: z.union([z.literal(LEGACY_HASH_SCHEMA_VERSION), z.literal(HASH_SCHEMA_VERSION)]),
  engine: calculationEngineSchema,
  tzdbVersion: tzdbVersionSchema,
  timeZoneDatabase: timeZoneDatabaseSnapshotSchema.optional(),
  ruleProfileDigest: z.string().regex(/^[a-f0-9]{64}$/),
  luckCycleRuleDigest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  resultHash: z.string().regex(/^[a-f0-9]{64}$/),
  supportedRangeStatus: z.enum(["verified", "experimental"]),
  verificationStatus: z.literal("engineering_preview"),
  calculatedAt: z.string().datetime(),
  warnings: z.array(z.string())
}).superRefine((value, context) => {
  validateTzdbBinding(value, context);
  if (value.hashSchemaVersion === LEGACY_HASH_SCHEMA_VERSION) {
    if (value.tzdbVersion !== LEGACY_UNIDENTIFIED_TZDB_VERSION || value.timeZoneDatabase !== undefined) {
      context.addIssue({ code: "custom", path: ["hashSchemaVersion"], message: "历史 hash v1 只允许原始未识别浏览器 tzdb 语义" });
    }
  } else if (value.tzdbVersion === LEGACY_UNIDENTIFIED_TZDB_VERSION) {
    context.addIssue({ code: "custom", path: ["hashSchemaVersion"], message: "hash v2 必须绑定内容寻址 tzdb 快照" });
  }
});

/**
 * Immutable provenance for a chart calculated from an installed rule-pack.
 * Imported packs are always locally unverified; activation is a separate,
 * explicit local decision and never upgrades publisher or consultant identity.
 */
export const rulePackBindingSchema = z.strictObject({
  kind: z.literal("installed_rule_pack"),
  packDigest: z.string().regex(/^[a-f0-9]{64}$/),
  profileDigest: z.string().regex(/^[a-f0-9]{64}$/),
  packId: z.string().regex(/^[a-z0-9-]+$/),
  profileId: z.string().regex(/^[a-z0-9-]+$/),
  profileVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  useMode: z.literal("exact")
});

export const calculatedChartSchema = z.object({
  input: birthInputSchema,
  timeCalibration: timeCalibrationSchema,
  ruleProfile: ruleProfileSchema,
  rulePackBinding: rulePackBindingSchema.optional(),
  luckCycleRuleSnapshot: luckCycleRuleSnapshotSchema.optional(),
  facts: chartFactsSchema,
  manifest: calculationManifestSchema
});

export function buildHashableBirthInput(input: z.infer<typeof birthInputSchema>) {
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

export const BIRTH_FINGERPRINT_VERSION = "hakimi-birth-fingerprint@1" as const;

/** Canonical birth identity used for duplicate detection; display-only metadata is excluded. */
export function buildBirthFingerprintPayload(input: z.infer<typeof birthInputSchema>) {
  return {
    version: BIRTH_FINGERPRINT_VERSION,
    schemaVersion: input.schemaVersion,
    calendarType: input.calendarType,
    date: input.date,
    time: input.time,
    timePrecision: input.timePrecision,
    timeZone: input.timeZone,
    sex: input.sex,
    lunarLeapMonth: input.lunarLeapMonth,
    location: {
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      precision: input.location.precision
    }
  };
}

export type CalculatedChartHashSource = z.infer<typeof calculatedChartSchema>;

/** Canonical semantic payload used for CalculatedChart.manifest.resultHash. */
export function buildCalculatedChartHashPayload(value: CalculatedChartHashSource) {
  const shared = {
    input: buildHashableBirthInput(value.input),
    engine: value.manifest.engine,
    ruleProfile: value.ruleProfile,
    rulePackBinding: value.rulePackBinding,
    luckCycleRuleSnapshot: value.luckCycleRuleSnapshot,
    timeCalibration: value.timeCalibration,
    facts: value.facts
  };
  if (value.manifest.hashSchemaVersion === LEGACY_HASH_SCHEMA_VERSION) {
    return { hashSchemaVersion: LEGACY_HASH_SCHEMA_VERSION, ...shared };
  }
  return {
    hashSchemaVersion: HASH_SCHEMA_VERSION,
    tzdbVersion: value.manifest.tzdbVersion,
    timeZoneDatabase: value.manifest.timeZoneDatabase,
    ...shared
  };
}

export const UNKNOWN_HOUR_PROBE_CANDIDATE_IDS = [
  "zi-00",
  "chou-01",
  "yin-03",
  "mao-05",
  "chen-07",
  "si-09",
  "wu-11",
  "wei-13",
  "shen-15",
  "you-17",
  "xu-19",
  "hai-21",
  "zi-23"
] as const;

const UNKNOWN_HOUR_PROBE_METADATA = {
  "zi-00": { branch: "子", civilTimeRange: { startInclusive: "00:00", endExclusive: "01:00" }, representativeTime: "00:30", isZiBoundaryVariant: true, ziSegment: "after_midnight" },
  "chou-01": { branch: "丑", civilTimeRange: { startInclusive: "01:00", endExclusive: "03:00" }, representativeTime: "01:30", isZiBoundaryVariant: false, ziSegment: null },
  "yin-03": { branch: "寅", civilTimeRange: { startInclusive: "03:00", endExclusive: "05:00" }, representativeTime: "03:30", isZiBoundaryVariant: false, ziSegment: null },
  "mao-05": { branch: "卯", civilTimeRange: { startInclusive: "05:00", endExclusive: "07:00" }, representativeTime: "05:30", isZiBoundaryVariant: false, ziSegment: null },
  "chen-07": { branch: "辰", civilTimeRange: { startInclusive: "07:00", endExclusive: "09:00" }, representativeTime: "07:30", isZiBoundaryVariant: false, ziSegment: null },
  "si-09": { branch: "巳", civilTimeRange: { startInclusive: "09:00", endExclusive: "11:00" }, representativeTime: "09:30", isZiBoundaryVariant: false, ziSegment: null },
  "wu-11": { branch: "午", civilTimeRange: { startInclusive: "11:00", endExclusive: "13:00" }, representativeTime: "11:30", isZiBoundaryVariant: false, ziSegment: null },
  "wei-13": { branch: "未", civilTimeRange: { startInclusive: "13:00", endExclusive: "15:00" }, representativeTime: "13:30", isZiBoundaryVariant: false, ziSegment: null },
  "shen-15": { branch: "申", civilTimeRange: { startInclusive: "15:00", endExclusive: "17:00" }, representativeTime: "15:30", isZiBoundaryVariant: false, ziSegment: null },
  "you-17": { branch: "酉", civilTimeRange: { startInclusive: "17:00", endExclusive: "19:00" }, representativeTime: "17:30", isZiBoundaryVariant: false, ziSegment: null },
  "xu-19": { branch: "戌", civilTimeRange: { startInclusive: "19:00", endExclusive: "21:00" }, representativeTime: "19:30", isZiBoundaryVariant: false, ziSegment: null },
  "hai-21": { branch: "亥", civilTimeRange: { startInclusive: "21:00", endExclusive: "23:00" }, representativeTime: "21:30", isZiBoundaryVariant: false, ziSegment: null },
  "zi-23": { branch: "子", civilTimeRange: { startInclusive: "23:00", endExclusive: "24:00" }, representativeTime: "23:30", isZiBoundaryVariant: true, ziSegment: "before_midnight" }
} as const satisfies Record<(typeof UNKNOWN_HOUR_PROBE_CANDIDATE_IDS)[number], {
  branch: string;
  civilTimeRange: { startInclusive: string; endExclusive: string };
  representativeTime: string;
  isZiBoundaryVariant: boolean;
  ziSegment: "after_midnight" | "before_midnight" | null;
}>;

export const UNKNOWN_HOUR_PROBE_DEFINITIONS = UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.map((candidateId) => ({
  candidateId,
  ...UNKNOWN_HOUR_PROBE_METADATA[candidateId]
}));

const unknownHourSha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const unknownHourMinuteSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const unknownHourRangeBoundarySchema = z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/);
const strictUnknownHourCalculatedChartSchema = calculatedChartSchema.strict();
const strictUnknownHourTimeCalibrationSchema = normalizedTimeCalibrationSchema.strict();
const strictUnknownHourRuleProfileSchema = ruleProfileSchema.strict();

export const unknownHourProbeCandidateIdSchema = z.enum(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS);

export const unknownHourProbeVariantSchema = z.strictObject({
  variantId: z.string().regex(/^[a-z0-9-]+@(unique|earlier|later)$/),
  sourceKind: z.literal("synthetic_unknown_hour_probe"),
  choice: z.enum(["unique", "earlier", "later"]),
  instant: z.string().datetime({ offset: true }),
  utcOffset: z.string().regex(/^[+-]\d{2}:[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/),
  chart: strictUnknownHourCalculatedChartSchema,
  chartResultHash: unknownHourSha256Schema
}).superRefine((value, context) => {
  if (value.chartResultHash !== value.chart.manifest.resultHash) {
    context.addIssue({
      code: "custom",
      path: ["chartResultHash"],
      message: "variant chartResultHash must equal chart.manifest.resultHash"
    });
  }
});

const unknownHourProbeCandidateBaseShape = {
  probeIndex: z.number().int().min(0).max(12),
  candidateId: unknownHourProbeCandidateIdSchema,
  sourceKind: z.literal("synthetic_representative_probe"),
  branch: z.enum(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]),
  civilTimeRange: z.strictObject({
    start: unknownHourRangeBoundarySchema,
    end: unknownHourRangeBoundarySchema,
    startInclusive: unknownHourRangeBoundarySchema,
    endExclusive: unknownHourRangeBoundarySchema
  }).superRefine((value, context) => {
    if (value.start !== value.startInclusive) {
      context.addIssue({ code: "custom", path: ["start"], message: "start must alias startInclusive" });
    }
    if (value.end !== value.endExclusive) {
      context.addIssue({ code: "custom", path: ["end"], message: "end must alias endExclusive" });
    }
  }),
  representativeTime: unknownHourMinuteSchema,
  isZiBoundaryVariant: z.boolean(),
  ziSegment: z.enum(["after_midnight", "before_midnight"]).nullable(),
  verificationStatus: z.literal("experimental_probe"),
  timeCalibration: strictUnknownHourTimeCalibrationSchema
} as const;

export const unknownHourProbeCandidateBaseSchema = z.strictObject(unknownHourProbeCandidateBaseShape);

export const unknownHourProbeUnresolvedReasonSchema = z.strictObject({
  code: z.enum([
    "DST_OVERLAP_REQUIRES_USER_CHOICE",
    "DST_GAP_REQUIRES_USER_RESOLUTION",
    "CALCULATION_UNRESOLVED"
  ]),
  message: z.string().min(1)
});

const calculatedUnknownHourProbeCandidateSchema = z.strictObject({
  ...unknownHourProbeCandidateBaseShape,
  status: z.literal("calculated"),
  chart: strictUnknownHourCalculatedChartSchema,
  variants: z.array(unknownHourProbeVariantSchema).length(1),
  unresolvedReason: z.null()
});

const unresolvedUnknownHourProbeCandidateSchema = z.strictObject({
  ...unknownHourProbeCandidateBaseShape,
  status: z.enum(["requires_user_time_resolution", "unresolved"]),
  chart: z.null(),
  variants: z.array(unknownHourProbeVariantSchema).max(2),
  unresolvedReason: unknownHourProbeUnresolvedReasonSchema
});

export const unknownHourProbeCandidateSchema = z.discriminatedUnion("status", [
  calculatedUnknownHourProbeCandidateSchema,
  unresolvedUnknownHourProbeCandidateSchema
]).superRefine((value, context) => {
  const choices = new Set<string>();
  for (const [index, variant] of value.variants.entries()) {
    const expectedVariantId = `${value.candidateId}@${variant.choice}`;
    if (variant.variantId !== expectedVariantId) {
      context.addIssue({
        code: "custom",
        path: ["variants", index, "variantId"],
        message: "variantId must bind the candidateId and choice"
      });
    }
    if (choices.has(variant.choice)) {
      context.addIssue({
        code: "custom",
        path: ["variants", index, "choice"],
        message: "variant choices must be unique within a probe"
      });
    }
    choices.add(variant.choice);
  }

  if (value.status === "calculated") {
    const variant = value.variants[0];
    if (variant?.choice !== "unique") {
      context.addIssue({
        code: "custom",
        path: ["variants", 0, "choice"],
        message: "a calculated representative probe must bind its unique instant"
      });
    }
    if (variant && value.chart.manifest.resultHash !== variant.chartResultHash) {
      context.addIssue({
        code: "custom",
        path: ["chart", "manifest", "resultHash"],
        message: "candidate chart and unique variant must identify the same chart result"
      });
    }
  }

  const resolution = value.timeCalibration.timeZoneResolution;
  if (resolution.policy !== "reject") {
    context.addIssue({
      code: "custom",
      path: ["timeCalibration", "timeZoneResolution", "policy"],
      message: "unknown-hour probes must keep DST disambiguation at reject"
    });
  }
  if (resolution.kind === "unique") {
    const selected = resolution.selectedCandidate;
    const resolutionShapeIsValid =
      resolution.status === "resolved_unique" &&
      selected?.choice === "unique" &&
      resolution.candidates.length === 1 &&
      resolution.candidates[0]?.choice === "unique" &&
      resolution.candidates[0].matchesInputWallTime &&
      resolution.candidates[0].resolvedWallTime === resolution.requestedWallTime &&
      hasExactJsonStructure(selected, resolution.candidates[0]) &&
      value.timeCalibration.activeWallTime === resolution.requestedWallTime &&
      value.timeCalibration.utcInstant === selected.instant &&
      value.timeCalibration.utcOffset === selected.utcOffset &&
      value.timeCalibration.dstStatus === "resolved" &&
      value.timeCalibration.normalizationStatus === "instant_resolved";
    const stateIsValid = value.status === "calculated" || (
      value.status === "unresolved" &&
      value.variants.length === 0 &&
      value.unresolvedReason.code === "CALCULATION_UNRESOLVED"
    );
    if (!resolutionShapeIsValid || !stateIsValid) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "a unique wall time must calculate one unique variant or expose only a calculation failure"
      });
    }
  } else if (resolution.kind === "overlap") {
    const choiceSet = new Set(resolution.candidates.map((candidate) => candidate.choice));
    const resolutionShapeIsValid =
      resolution.status === "rejected_overlap" &&
      resolution.selectedCandidate === null &&
      resolution.candidates.length === 2 &&
      choiceSet.has("earlier") &&
      choiceSet.has("later") &&
      resolution.candidates.every((candidate) =>
        candidate.matchesInputWallTime && candidate.resolvedWallTime === resolution.requestedWallTime
      ) &&
      value.timeCalibration.activeWallTime === resolution.requestedWallTime &&
      value.timeCalibration.utcInstant === null &&
      value.timeCalibration.utcOffset === null &&
      value.timeCalibration.dstStatus === "unresolved" &&
      value.timeCalibration.normalizationStatus === "wall_time_only";
    const variantChoiceSet = new Set(value.variants.map((variant) => variant.choice));
    const stateIsValid = (
      value.status === "requires_user_time_resolution" &&
      value.unresolvedReason.code === "DST_OVERLAP_REQUIRES_USER_CHOICE" &&
      value.variants.length === 2 &&
      variantChoiceSet.has("earlier") &&
      variantChoiceSet.has("later")
    ) || (
      value.status === "unresolved" &&
      value.unresolvedReason.code === "CALCULATION_UNRESOLVED" &&
      value.variants.length === 0
    );
    if (!resolutionShapeIsValid || !stateIsValid) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "a DST overlap must preserve both explicit variants or expose only a calculation failure"
      });
    }
  } else {
    const choiceSet = new Set(resolution.candidates.map((candidate) => candidate.choice));
    const resolutionShapeIsValid =
      resolution.status === "rejected_gap" &&
      resolution.selectedCandidate === null &&
      resolution.candidates.length === 2 &&
      choiceSet.has("earlier") &&
      choiceSet.has("later") &&
      resolution.candidates.every((candidate) => !candidate.matchesInputWallTime) &&
      value.timeCalibration.activeWallTime === resolution.requestedWallTime &&
      value.timeCalibration.utcInstant === null &&
      value.timeCalibration.utcOffset === null &&
      value.timeCalibration.dstStatus === "unresolved" &&
      value.timeCalibration.normalizationStatus === "wall_time_only";
    const stateIsValid =
      value.status === "requires_user_time_resolution" &&
      value.unresolvedReason.code === "DST_GAP_REQUIRES_USER_RESOLUTION" &&
      value.variants.length === 0;
    if (!resolutionShapeIsValid || !stateIsValid) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "a DST gap must remain unresolved without a synthesized chart or variant"
      });
    }
  }
});

export const unknownHourCandidateResultSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  hashSchemaVersion: z.union([z.literal(LEGACY_HASH_SCHEMA_VERSION), z.literal(HASH_SCHEMA_VERSION)]).optional(),
  kind: z.literal("unknown_hour_candidate_probes"),
  verificationStatus: z.literal("experimental_probe"),
  algorithmId: z.literal("hakimi-bazi-core:unknown-hour-representative-probes:v1"),
  probeDefinitionVersion: z.literal("1.0.0"),
  tzdbVersion: tzdbVersionSchema,
  timeZoneDatabase: timeZoneDatabaseSnapshotSchema.optional(),
  input: unknownHourBirthInputSchema,
  engine: calculationEngineSchema,
  ruleProfile: strictUnknownHourRuleProfileSchema,
  rulePackBinding: rulePackBindingSchema.optional(),
  ruleProfileDigest: unknownHourSha256Schema,
  probeCount: z.literal(13),
  candidates: z.array(unknownHourProbeCandidateSchema).length(13),
  resultHash: unknownHourSha256Schema,
  warnings: z.array(z.string().min(1))
}).superRefine((value, context) => {
  const hashSchemaVersion = value.hashSchemaVersion ?? LEGACY_HASH_SCHEMA_VERSION;
  validateTzdbBinding(value, context);
  if (hashSchemaVersion === LEGACY_HASH_SCHEMA_VERSION) {
    if (value.tzdbVersion !== LEGACY_UNIDENTIFIED_TZDB_VERSION || value.timeZoneDatabase !== undefined) {
      context.addIssue({ code: "custom", path: ["hashSchemaVersion"], message: "历史未知时辰 hash 只允许未识别浏览器 tzdb" });
    }
  } else if (value.tzdbVersion === LEGACY_UNIDENTIFIED_TZDB_VERSION) {
    context.addIssue({ code: "custom", path: ["hashSchemaVersion"], message: "当前未知时辰 hash 必须绑定内容寻址 tzdb" });
  }
  const seenProbeIndexes = new Set<number>();
  const seenCandidateIds = new Set<string>();

  if (value.rulePackBinding && value.rulePackBinding.profileDigest !== value.ruleProfileDigest) {
    context.addIssue({
      code: "custom",
      path: ["rulePackBinding", "profileDigest"],
      message: "candidate-set rule-pack binding must equal ruleProfileDigest"
    });
  }

  for (const [arrayIndex, candidate] of value.candidates.entries()) {
    const expectedCandidateId = UNKNOWN_HOUR_PROBE_CANDIDATE_IDS[arrayIndex];
    const expectedDefinition = UNKNOWN_HOUR_PROBE_DEFINITIONS[arrayIndex];
    if (candidate.probeIndex !== arrayIndex) {
      context.addIssue({
        code: "custom",
        path: ["candidates", arrayIndex, "probeIndex"],
        message: "probeIndex must be unique, contiguous, and equal to its array position"
      });
    }
    if (seenProbeIndexes.has(candidate.probeIndex)) {
      context.addIssue({
        code: "custom",
        path: ["candidates", arrayIndex, "probeIndex"],
        message: "probeIndex must be unique"
      });
    }
    seenProbeIndexes.add(candidate.probeIndex);

    if (candidate.candidateId !== expectedCandidateId) {
      context.addIssue({
        code: "custom",
        path: ["candidates", arrayIndex, "candidateId"],
        message: "candidateId must follow the versioned representative-probe order"
      });
    }
    if (seenCandidateIds.has(candidate.candidateId)) {
      context.addIssue({
        code: "custom",
        path: ["candidates", arrayIndex, "candidateId"],
        message: "candidateId must be unique"
      });
    }
    seenCandidateIds.add(candidate.candidateId);

    if (
      !expectedDefinition ||
      candidate.branch !== expectedDefinition.branch ||
      candidate.representativeTime !== expectedDefinition.representativeTime ||
      candidate.civilTimeRange.start !== expectedDefinition.civilTimeRange.startInclusive ||
      candidate.civilTimeRange.startInclusive !== expectedDefinition.civilTimeRange.startInclusive ||
      candidate.civilTimeRange.end !== expectedDefinition.civilTimeRange.endExclusive ||
      candidate.civilTimeRange.endExclusive !== expectedDefinition.civilTimeRange.endExclusive ||
      candidate.isZiBoundaryVariant !== expectedDefinition.isZiBoundaryVariant ||
      candidate.ziSegment !== expectedDefinition.ziSegment
    ) {
      context.addIssue({
        code: "custom",
        path: ["candidates", arrayIndex],
        message: "candidate branch, range, representative time, and Zi metadata must match the versioned probe definition"
      });
    }

    const calibration = candidate.timeCalibration;
    const calendarResolution = calibration.calendarResolution;
    const expectedRequestedWallTime = `${calendarResolution.resolvedGregorianDate}T${candidate.representativeTime}:00`;
    if (
      calibration.timeZone !== value.input.timeZone ||
      calendarResolution.inputCalendarType !== value.input.calendarType ||
      calendarResolution.inputDate !== value.input.date ||
      calendarResolution.inputLunarLeapMonth !== value.input.lunarLeapMonth ||
      calibration.originalCivilDateTime !== expectedRequestedWallTime ||
      calibration.timeZoneResolution.requestedWallTime !== expectedRequestedWallTime ||
      calibration.activeWallTime !== expectedRequestedWallTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["candidates", arrayIndex, "timeCalibration"],
        message: "probe time calibration must bind the candidate-set calendar input, time zone, date, and representative wall time"
      });
    }

    const expectedProbeInput = {
      ...value.input,
      time: candidate.representativeTime,
      timePrecision: "exact_minute" as const
    };
    const charts = [
      ...(candidate.chart ? [candidate.chart] : []),
      ...candidate.variants.map((variant) => variant.chart)
    ];
    for (const [chartIndex, chart] of charts.entries()) {
      if (!hasExactJsonStructure(chart.input, expectedProbeInput)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "charts", chartIndex, "input"],
          message: "probe chart input must preserve the candidate-set input and use only its representative time"
        });
      }
      if (!hasExactJsonStructure(chart.ruleProfile, value.ruleProfile)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "charts", chartIndex, "ruleProfile"],
          message: "probe chart rule profile must equal the candidate-set rule profile"
        });
      }
      if (!hasExactJsonStructure(chart.rulePackBinding, value.rulePackBinding)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "charts", chartIndex, "rulePackBinding"],
          message: "probe chart rule-pack binding must equal the candidate-set binding"
        });
      }
      if (!hasExactJsonStructure(chart.manifest.engine, value.engine)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "charts", chartIndex, "manifest", "engine"],
          message: "probe chart engine snapshot must equal the candidate-set engine snapshot"
        });
      }
      if (chart.manifest.tzdbVersion !== value.tzdbVersion) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "charts", chartIndex, "manifest", "tzdbVersion"],
          message: "probe chart tzdb version must equal the candidate-set tzdb version"
        });
      }
      if (JSON.stringify(chart.manifest.timeZoneDatabase) !== JSON.stringify(value.timeZoneDatabase)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "charts", chartIndex, "manifest", "timeZoneDatabase"],
          message: "candidate chart tzdb snapshot must equal candidate-set tzdb snapshot"
        });
      }
      if (chart.manifest.ruleProfileDigest !== value.ruleProfileDigest) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "charts", chartIndex, "manifest", "ruleProfileDigest"],
          message: "probe chart ruleProfileDigest must bind the candidate-set rule profile"
        });
      }
      if (chart.facts.pillars.hour.branch !== candidate.branch) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "charts", chartIndex, "facts", "pillars", "hour", "branch"],
          message: "probe chart hour branch must match the versioned candidate branch"
        });
      }
    }

    for (const [variantIndex, variant] of candidate.variants.entries()) {
      const selected = variant.chart.timeCalibration.timeZoneResolution?.selectedCandidate;
      if (
        !selected ||
        variant.instant !== variant.chart.timeCalibration.utcInstant ||
        variant.utcOffset !== variant.chart.timeCalibration.utcOffset ||
        variant.choice !== selected.choice ||
        variant.instant !== selected.instant ||
        variant.utcOffset !== selected.utcOffset
      ) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "variants", variantIndex],
          message: "variant instant, offset, and choice must bind its chart time-calibration selection"
        });
      }
    }

    if (candidate.status === "calculated") {
      if (!hasExactJsonStructure(candidate.chart.timeCalibration, candidate.timeCalibration)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "chart", "timeCalibration"],
          message: "calculated probe chart must reuse the probe time calibration"
        });
      }
      if (!hasExactJsonStructure(candidate.chart, candidate.variants[0]?.chart)) {
        context.addIssue({
          code: "custom",
          path: ["candidates", arrayIndex, "variants", 0, "chart"],
          message: "calculated probe unique variant must reuse the candidate chart"
        });
      }
    } else if (candidate.timeCalibration.timeZoneResolution.kind === "overlap") {
      for (const [variantIndex, variant] of candidate.variants.entries()) {
        const resolution = candidate.timeCalibration.timeZoneResolution.candidates.find(
          (choice) => choice.choice === variant.choice
        );
        if (!resolution || resolution.instant !== variant.instant || resolution.utcOffset !== variant.utcOffset) {
          context.addIssue({
            code: "custom",
            path: ["candidates", arrayIndex, "variants", variantIndex],
            message: "overlap variant must bind one of the unresolved probe's explicit time-zone candidates"
          });
        }
      }
    }
  }
});

export type UnknownHourProbeCandidateBase = z.infer<typeof unknownHourProbeCandidateBaseSchema>;
export type UnknownHourProbeVariant = z.infer<typeof unknownHourProbeVariantSchema>;
export type UnknownHourProbeCandidate = z.infer<typeof unknownHourProbeCandidateSchema>;
export type UnknownHourCandidateResult = z.infer<typeof unknownHourCandidateResultSchema>;
export type UnknownHourCandidateHashSource = Pick<
  UnknownHourCandidateResult,
  "hashSchemaVersion" | "kind" | "algorithmId" | "probeDefinitionVersion" | "tzdbVersion" | "timeZoneDatabase" | "input" | "engine" | "ruleProfile" | "rulePackBinding" | "candidates"
>;

/** Canonical semantic payload used by the engine and persistence checks for resultHash. */
export function buildUnknownHourCandidateHashPayload(value: UnknownHourCandidateHashSource) {
  const hashSchemaVersion = value.hashSchemaVersion ?? LEGACY_HASH_SCHEMA_VERSION;
  const shared = {
    kind: value.kind,
    algorithmId: value.algorithmId,
    probeDefinitionVersion: value.probeDefinitionVersion,
    tzdbVersion: value.tzdbVersion,
    input: buildHashableBirthInput(value.input),
    engine: value.engine,
    ruleProfile: value.ruleProfile,
    rulePackBinding: value.rulePackBinding,
    candidates: value.candidates.map((candidate) => ({
      probeIndex: candidate.probeIndex,
      candidateId: candidate.candidateId,
      sourceKind: candidate.sourceKind,
      branch: candidate.branch,
      civilTimeRange: candidate.civilTimeRange,
      representativeTime: candidate.representativeTime,
      isZiBoundaryVariant: candidate.isZiBoundaryVariant,
      ziSegment: candidate.ziSegment,
      status: candidate.status,
      verificationStatus: candidate.verificationStatus,
      timeCalibration: candidate.timeCalibration,
      chartResultHash: candidate.chart?.manifest.resultHash ?? null,
      variants: candidate.variants.map((variant) => ({
        variantId: variant.variantId,
        sourceKind: variant.sourceKind,
        choice: variant.choice,
        instant: variant.instant,
        utcOffset: variant.utcOffset,
        chartResultHash: variant.chartResultHash
      })),
      unresolvedReasonCode: candidate.unresolvedReason?.code ?? null
    }))
  };
  return hashSchemaVersion === LEGACY_HASH_SCHEMA_VERSION
    ? { hashSchemaVersion: LEGACY_HASH_SCHEMA_VERSION, ...shared }
    : { hashSchemaVersion: HASH_SCHEMA_VERSION, timeZoneDatabase: value.timeZoneDatabase, ...shared };
}

export const caseTagsSchema = z
  .array(z.string().min(1).max(30).refine((value) => value === value.trim(), "标签首尾不能包含空白"))
  .max(20)
  .superRefine((tags, context) => {
    if (new Set(tags).size !== tags.length) {
      context.addIssue({ code: "custom", message: "标签不能重复" });
    }
  });

const legacyCaseRecordV1Shape = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  alias: z.string().trim().min(1).max(80),
  tags: caseTagsSchema,
  notes: z.string().max(20_000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  latestRevisionId: z.string().uuid(),
  revisionCount: z.number().int().positive()
} as const;

/** Frozen Case outer record stored by Dexie v1-v6 and backup formats through full v0.4/core v0.1. */
export const legacyCaseRecordV1Schema = z.strictObject(legacyCaseRecordV1Shape);

export const caseRecordSchema = z.object({
  ...legacyCaseRecordV1Shape,
  recordVersion: z.literal(RESEARCH_SUBJECT_RECORD_VERSION),
  favorite: z.boolean(),
  deletedAt: z.string().datetime().nullable()
}).refine((value) => value.deletedAt === null || value.deletedAt <= value.updatedAt, {
  path: ["deletedAt"],
  message: "deletedAt must not follow updatedAt"
});

const preRulePackBindingRevisionRecordShape = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  revisionNumber: z.number().int().positive(),
  createdAt: z.string().datetime(),
  input: birthInputSchema,
  timeCalibration: timeCalibrationSchema,
  ruleProfile: ruleProfileSchema,
  luckCycleRuleSnapshot: luckCycleRuleSnapshotSchema.optional(),
  facts: chartFactsSchema,
  manifest: calculationManifestSchema
} as const;

export const revisionRecordSchema = z.object({
  ...preRulePackBindingRevisionRecordShape,
  rulePackBinding: rulePackBindingSchema.optional()
}).superRefine((value, context) => {
  if (value.rulePackBinding && value.rulePackBinding.profileDigest !== value.manifest.ruleProfileDigest) {
    context.addIssue({
      code: "custom",
      path: ["rulePackBinding", "profileDigest"],
      message: "rule-pack binding profileDigest must equal manifest.ruleProfileDigest"
    });
  }
});

const canonicalShortTextSchema = (maximum: number) => z
  .string()
  .min(1)
  .max(maximum)
  .refine((value) => value === value.trim(), "文字首尾不能包含空白；仓库不会静默 trim");

const canonicalOptionalTextSchema = (maximum: number) => z
  .string()
  .max(maximum)
  .refine((value) => value === value.trim(), "文字首尾不能包含空白；仓库不会静默 trim");

const researchTagsSchema = z
  .array(canonicalShortTextSchema(40))
  .max(50)
  .refine((values) => new Set(values).size === values.length, "标签不能重复");

const researchSourceRefsSchema = z
  .array(canonicalShortTextSchema(500))
  .max(100)
  .refine((values) => new Set(values).size === values.length, "来源引用不能重复");

export const researchNoteAnchorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("case") }),
  z.strictObject({ kind: z.literal("revision"), revisionId: z.string().uuid() }),
  z.strictObject({
    kind: z.literal("chart_field"),
    revisionId: z.string().uuid(),
    pillar: z.enum(["year", "month", "day", "hour"]),
    field: z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/)
  })
]);

export const researchNoteRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  anchor: researchNoteAnchorSchema,
  bodyFormat: z.literal("markdown"),
  body: z.string().max(200_000),
  tags: researchTagsSchema,
  sourceRefs: researchSourceRefsSchema,
  lifecycle: z.enum(["active", "archived"]),
  editVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).refine((value) => value.updatedAt >= value.createdAt, {
  path: ["updatedAt"],
  message: "updatedAt 不能早于 createdAt"
});

export const transitNodeTypeSchema = z.enum(["dayun", "xiaoyun", "year", "month", "day", "hour"]);

/** Legacy read-only placeholder retained for full-backup compatibility. */
export const futureTransitNodeRefSchema = z.strictObject({
  namespace: z.literal("future-transit-node"),
  nodeType: transitNodeTypeSchema,
  nodeId: canonicalShortTextSchema(120),
  timelineVersion: canonicalOptionalTextSchema(40).nullable()
});

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const transitNodeIdSchema = z.string().regex(/^-?\d{1,16}\.[a-f0-9]{64}$/).max(90);

/** Stable v1 reference written by the transit workbench. */
export const transitNodeRefSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  namespace: z.literal("hakimi-transit-node"),
  revisionId: z.string().uuid(),
  chartResultHash: sha256Schema,
  ruleProfileDigest: sha256Schema,
  luckCycleRuleDigest: sha256Schema,
  manualDirection: z.enum(["forward", "backward"]).nullable(),
  timelineVersion: z.string().regex(/^hakimi-transit:\d+\.\d+\.\d+$/),
  algorithmId: canonicalShortTextSchema(120),
  nodeType: transitNodeTypeSchema,
  startInstant: z.string().datetime({ offset: true }),
  nodeId: transitNodeIdSchema
}).superRefine((value, context) => {
  const separator = value.nodeId.indexOf(".");
  const encodedStartEpoch = Number(value.nodeId.slice(0, separator));
  if (encodedStartEpoch !== Date.parse(value.startInstant)) {
    context.addIssue({
      code: "custom",
      path: ["nodeId"],
      message: "节点标识中的起始 epoch 必须与 startInstant 表示同一瞬时点"
    });
  }
});

export const anyTransitNodeRefSchema = z.union([futureTransitNodeRefSchema, transitNodeRefSchema]);

const fixedWallDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/);
const ganZhiSchema = z.string().regex(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);

export const transitNodeSchema = z.strictObject({
  ref: transitNodeRefSchema,
  nodeType: transitNodeTypeSchema,
  label: canonicalShortTextSchema(80),
  ganZhi: ganZhiSchema,
  stemTenGod: canonicalShortTextSchema(20),
  index: z.number().int().nonnegative().nullable(),
  boundaryLabel: canonicalShortTextSchema(40).nullable(),
  startInstant: z.string().datetime({ offset: true }),
  endExclusiveInstant: z.string().datetime({ offset: true }),
  startWallDateTime: fixedWallDateTimeSchema,
  endExclusiveWallDateTime: fixedWallDateTimeSchema,
  frame: z.enum(["fixed_plus08", "revision_iana_civil"]),
  sourcePrecision: z.enum(["second", "millisecond"]),
  isActiveAtTarget: z.boolean(),
  verificationStatus: z.literal("engineering_preview")
}).superRefine((value, context) => {
  if (value.ref.nodeType !== value.nodeType) {
    context.addIssue({ code: "custom", path: ["ref", "nodeType"], message: "节点引用类型必须与节点类型一致" });
  }
  if (value.ref.startInstant !== value.startInstant) {
    context.addIssue({ code: "custom", path: ["ref", "startInstant"], message: "节点引用起点必须与节点区间一致" });
  }
  if (Date.parse(value.endExclusiveInstant) <= Date.parse(value.startInstant)) {
    context.addIssue({ code: "custom", path: ["endExclusiveInstant"], message: "节点半开区间必须具有正长度" });
  }
});

export const transitSlotSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("resolved"), node: transitNodeSchema }),
  z.strictObject({
    status: z.literal("not_applicable"),
    reasonCode: canonicalShortTextSchema(60),
    message: canonicalShortTextSchema(240)
  }),
  z.strictObject({
    status: z.literal("unsupported"),
    reasonCode: canonicalShortTextSchema(60),
    message: canonicalShortTextSchema(240)
  })
]);

const transitTrackSchema = z.array(transitNodeSchema).max(20);

export const transitSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  kind: z.literal("transit_snapshot"),
  timelineVersion: z.string().regex(/^hakimi-transit:\d+\.\d+\.\d+$/),
  caseId: z.string().uuid(),
  revisionId: z.string().uuid(),
  revisionResultHash: sha256Schema,
  tzdbVersion: identifiedTzdbVersionSchema,
  timeZoneDatabase: timeZoneDatabaseSnapshotSchema,
  ruleProfileDigest: sha256Schema,
  luckCycleRuleSnapshot: luckCycleRuleSnapshotSchema,
  luckCycleRuleDigest: sha256Schema,
  luckCycleRuleSource: z.enum(["revision_snapshot", "legacy_inferred"]),
  manualDirection: z.enum(["forward", "backward"]).nullable(),
  target: z.strictObject({
    instant: z.string().datetime({ offset: true }),
    revisionWallDateTime: fixedWallDateTimeSchema,
    fixedPlusEightWallDateTime: fixedWallDateTimeSchema,
    displayTimeZone: ianaTimeZoneSchema
  }),
  slots: z.strictObject({
    dayun: transitSlotSchema,
    xiaoyun: transitSlotSchema,
    year: transitSlotSchema,
    month: transitSlotSchema,
    day: transitSlotSchema,
    hour: transitSlotSchema
  }),
  tracks: z.strictObject({
    dayun: transitTrackSchema,
    xiaoyun: transitTrackSchema,
    year: transitTrackSchema,
    month: transitTrackSchema,
    day: transitTrackSchema,
    hour: transitTrackSchema
  }),
  manifest: z.strictObject({
    algorithmId: canonicalShortTextSchema(120),
    engineName: z.literal("hakimi-transit-core"),
    engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    upstreamName: z.literal("lunar-typescript"),
    upstreamVersion: z.literal("1.8.6"),
    yearMonthFrame: z.literal("fixed_plus08"),
    dayHourFrame: z.literal("revision_iana_civil"),
    interpretationIncluded: z.literal(false),
    goldCaseCount: z.literal(0),
    releaseGatePassed: z.literal(false),
    sourceRefs: z.array(canonicalShortTextSchema(500)).min(1)
  }),
  resultHash: sha256Schema,
  warnings: z.array(canonicalShortTextSchema(500)),
  knownGaps: z.array(canonicalShortTextSchema(500))
}).superRefine((value, context) => {
  validateTzdbBinding(value, context);
  const nodeTypes = transitNodeTypeSchema.options;
  const targetEpoch = Date.parse(value.target.instant);

  const validateNode = (
    node: z.infer<typeof transitNodeSchema>,
    expectedType: z.infer<typeof transitNodeTypeSchema>,
    path: Array<string | number>,
    requireActive: boolean
  ) => {
    if (node.nodeType !== expectedType) {
      context.addIssue({ code: "custom", path: [...path, "nodeType"], message: `${expectedType} 轨只能包含 ${expectedType} 节点` });
    }
    const bindings = [
      ["revisionId", node.ref.revisionId, value.revisionId],
      ["chartResultHash", node.ref.chartResultHash, value.revisionResultHash],
      ["ruleProfileDigest", node.ref.ruleProfileDigest, value.ruleProfileDigest],
      ["luckCycleRuleDigest", node.ref.luckCycleRuleDigest, value.luckCycleRuleDigest],
      ["manualDirection", node.ref.manualDirection, value.manualDirection],
      ["timelineVersion", node.ref.timelineVersion, value.timelineVersion],
      ["algorithmId", node.ref.algorithmId, value.manifest.algorithmId]
    ] as const;
    for (const [field, actual, expected] of bindings) {
      if (actual !== expected) {
        context.addIssue({ code: "custom", path: [...path, "ref", field], message: `节点引用的 ${field} 与快照上下文不一致` });
      }
    }

    const containsTarget = targetEpoch >= Date.parse(node.startInstant) && targetEpoch < Date.parse(node.endExclusiveInstant);
    if (requireActive && !node.isActiveAtTarget) {
      context.addIssue({ code: "custom", path: [...path, "isActiveAtTarget"], message: "resolved slot 必须标记为目标时刻的活动节点" });
    }
    if (node.isActiveAtTarget !== containsTarget) {
      context.addIssue({
        code: "custom",
        path: [...path, "isActiveAtTarget"],
        message: containsTarget
          ? "包含目标瞬时点的节点必须标记为活动节点"
          : "活动节点的半开区间必须包含目标瞬时点"
      });
    }
  };

  for (const nodeType of nodeTypes) {
    const slot = value.slots[nodeType];
    const track = value.tracks[nodeType];
    const seenNodeIds = new Set<string>();
    let previousStartEpoch: number | null = null;
    let previousEndEpoch: number | null = null;
    for (const [index, node] of track.entries()) {
      validateNode(node, nodeType, ["tracks", nodeType, index], false);
      const startEpoch = Date.parse(node.startInstant);
      const endEpoch = Date.parse(node.endExclusiveInstant);
      if (previousStartEpoch !== null && startEpoch < previousStartEpoch) {
        context.addIssue({
          code: "custom",
          path: ["tracks", nodeType, index, "startInstant"],
          message: "同一轨道的节点必须按 startInstant 升序排列"
        });
      }
      if (previousEndEpoch !== null && startEpoch < previousEndEpoch) {
        context.addIssue({
          code: "custom",
          path: ["tracks", nodeType, index, "startInstant"],
          message: "同一轨道的半开区间不能重叠"
        });
      }
      previousStartEpoch = startEpoch;
      previousEndEpoch = endEpoch;
      if (seenNodeIds.has(node.ref.nodeId)) {
        context.addIssue({ code: "custom", path: ["tracks", nodeType, index, "ref", "nodeId"], message: "同一轨道不能重复保存相同节点" });
      }
      seenNodeIds.add(node.ref.nodeId);
    }

    const containingTrackNodes = track.filter((node) =>
      targetEpoch >= Date.parse(node.startInstant) && targetEpoch < Date.parse(node.endExclusiveInstant)
    );
    const activeTrackNodes = track.filter((node) => node.isActiveAtTarget);
    if (slot.status === "resolved") {
      validateNode(slot.node, nodeType, ["slots", nodeType, "node"], true);
      const containingNode = containingTrackNodes[0];
      const trackNode = track.find((node) => node.ref.nodeId === slot.node.ref.nodeId);
      if (containingTrackNodes.length !== 1 || containingNode?.ref.nodeId !== slot.node.ref.nodeId) {
        context.addIssue({ code: "custom", path: ["tracks", nodeType], message: "轨道必须且只能有一个包含目标瞬时点的节点，并由 resolved slot 指向" });
      }
      if (activeTrackNodes.length !== 1 || activeTrackNodes[0]?.ref.nodeId !== slot.node.ref.nodeId) {
        context.addIssue({ code: "custom", path: ["tracks", nodeType], message: "轨道必须且只能包含 resolved slot 指向的一个活动节点" });
      }
      if (!trackNode || JSON.stringify(trackNode) !== JSON.stringify(slot.node)) {
        context.addIssue({ code: "custom", path: ["slots", nodeType, "node"], message: "resolved slot 必须完整复用轨道中的同一节点事实" });
      }
    } else {
      if (containingTrackNodes.length !== 0) {
        context.addIssue({ code: "custom", path: ["tracks", nodeType], message: `${slot.status} 只允许用于没有节点覆盖目标瞬时点的轨道` });
      }
      if (activeTrackNodes.length !== 0) {
        context.addIssue({ code: "custom", path: ["tracks", nodeType], message: `${slot.status} 轨道不能伪造活动节点` });
      }
    }
  }
});

export const FORMAL_COMPARISON_SCHEMA_VERSION = "1.0.0" as const;
export const FORMAL_COMPARISON_HASH_SCHEMA_VERSION = "formal-comparison-hash-v1" as const;
export const formalComparisonSlotIdSchema = z.enum(["A", "B", "C", "D"]);

export const formalComparisonSlotRequestSchema = z.strictObject({
  slotId: formalComparisonSlotIdSchema,
  caseId: z.string().uuid(),
  revisionId: z.string().uuid(),
  manualDirection: z.enum(["forward", "backward"]).nullable()
});

export const formalComparisonRequestSchema = z.strictObject({
  schemaVersion: z.literal(FORMAL_COMPARISON_SCHEMA_VERSION),
  baselineSlotId: formalComparisonSlotIdSchema,
  slots: z.array(formalComparisonSlotRequestSchema).min(2).max(4),
  transit: z.discriminatedUnion("mode", [
    z.strictObject({ mode: z.literal("none") }),
    z.strictObject({
      mode: z.literal("same_instant"),
      atInstant: z.string().datetime({ offset: true })
    })
  ])
}).superRefine((value, context) => {
  const slotIds = value.slots.map((slot) => slot.slotId);
  const revisionIds = value.slots.map((slot) => slot.revisionId);
  if (new Set(slotIds).size !== slotIds.length) {
    context.addIssue({ code: "custom", path: ["slots"], message: "对照位 A—D 不能重复" });
  }
  if (new Set(revisionIds).size !== revisionIds.length) {
    context.addIssue({ code: "custom", path: ["slots"], message: "同一正式修订不能重复加入对照" });
  }
  const expectedSlotIds = formalComparisonSlotIdSchema.options.slice(0, value.slots.length);
  if (slotIds.some((slotId, index) => slotId !== expectedSlotIds[index])) {
    context.addIssue({ code: "custom", path: ["slots"], message: "正式对照位必须从 A 开始并按 A—D 连续排列" });
  }
  if (value.baselineSlotId !== "A") {
    context.addIssue({ code: "custom", path: ["baselineSlotId"], message: "正式对照基准位必须为 A" });
  }
});

const formalComparisonSourceShapeSchema = z.strictObject({
  schemaVersion: z.literal(FORMAL_COMPARISON_SCHEMA_VERSION),
  slotId: formalComparisonSlotIdSchema,
  caseRecord: z.strictObject({
    id: z.string().uuid(),
    alias: canonicalShortTextSchema(80)
  }),
  revision: revisionRecordSchema,
  revisionSnapshotDigest: sha256Schema
}).superRefine((value, context) => {
  if (value.caseRecord.id !== value.revision.caseId) {
    context.addIssue({ code: "custom", path: ["revision", "caseId"], message: "正式对照源的案例与修订归属不一致" });
  }
});
export const formalComparisonSourceSchema = exactStoredRecordSchema(
  formalComparisonSourceShapeSchema,
  "FormalComparisonSource"
);

export const FORMAL_COMPARISON_CATEGORY_ORDER = [
  "input",
  "calibration",
  "rule",
  "calendar_fact",
  "pillar_fact",
  "evidence"
] as const;
export const formalComparisonCategorySchema = z.enum(FORMAL_COMPARISON_CATEGORY_ORDER);
export const comparisonSourceSchema = z.literal("stored_revision");
export const comparisonCellAvailabilitySchema = z.enum([
  "value",
  "missing",
  "not_applicable",
  "unsupported"
]);
export const comparisonCellStatusSchema = z.enum([
  "baseline",
  "same",
  "changed",
  "added",
  "missing",
  "not_applicable",
  "unsupported"
]);
export const comparisonRowStatusSchema = z.enum([
  "same",
  "changed",
  "missing",
  "not_applicable",
  "unsupported",
  "mixed"
]);

export const comparisonItemSchema = z.strictObject({
  key: z.string().uuid(),
  caseId: z.string().uuid(),
  caseAlias: canonicalShortTextSchema(80),
  source: comparisonSourceSchema,
  slotId: formalComparisonSlotIdSchema,
  manualDirection: z.enum(["forward", "backward"]).nullable(),
  revisionSnapshotDigest: sha256Schema,
  revision: revisionRecordSchema
}).superRefine((value, context) => {
  if (value.key !== value.revision.id) {
    context.addIssue({ code: "custom", path: ["key"], message: "对照项目键必须等于确切 Revision ID" });
  }
  if (value.caseId !== value.revision.caseId) {
    context.addIssue({ code: "custom", path: ["caseId"], message: "对照项目案例必须与 Revision 归属一致" });
  }
});

export const comparisonCellSchema = z.strictObject({
  value: z.string().max(1_000_000),
  availability: comparisonCellAvailabilitySchema,
  status: comparisonCellStatusSchema
});

export const comparisonRowSchema = z.strictObject({
  id: z.string().regex(/^[a-z][A-Za-z0-9_.]{0,159}$/),
  category: formalComparisonCategorySchema,
  label: canonicalShortTextSchema(160),
  values: z.array(z.string().max(1_000_000)).min(2).max(4),
  cells: z.array(comparisonCellSchema).min(2).max(4),
  status: comparisonRowStatusSchema,
  different: z.boolean()
});

export const comparisonSectionSchema = z.strictObject({
  category: formalComparisonCategorySchema,
  label: canonicalShortTextSchema(160),
  rows: z.array(comparisonRowSchema).max(240),
  differenceCount: z.number().int().nonnegative()
});

export const comparisonMatrixSchema = z.strictObject({
  items: z.array(comparisonItemSchema).min(2).max(4),
  sections: z.array(comparisonSectionSchema).length(FORMAL_COMPARISON_CATEGORY_ORDER.length),
  rowCount: z.number().int().nonnegative(),
  differenceCount: z.number().int().nonnegative(),
  changedCategories: z.array(formalComparisonCategorySchema).max(FORMAL_COMPARISON_CATEGORY_ORDER.length),
  sameBirthInput: z.boolean()
});

export const synchronizedTransitResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    itemKey: z.string().uuid(),
    status: z.literal("resolved"),
    snapshot: transitSnapshotSchema
  }),
  z.strictObject({
    itemKey: z.string().uuid(),
    status: z.literal("error"),
    code: canonicalShortTextSchema(120),
    message: canonicalShortTextSchema(1_000)
  })
]);

const canonicalComparisonTargetInstantSchema = z.string().datetime({ offset: true }).refine(
  (value) => value === new Date(value).toISOString(),
  "正式对照目标必须是带毫秒的规范 UTC 瞬时点"
);

function expectedComparisonRowStatus(
  cells: readonly z.infer<typeof comparisonCellSchema>[]
): z.infer<typeof comparisonRowStatusSchema> {
  const signatures = new Set(cells.map((cell) =>
    cell.availability === "value" ? `value:${cell.value}` : cell.availability
  ));
  if (signatures.size > 1) {
    return cells.every((cell) => cell.availability === "value") ? "changed" : "mixed";
  }
  return cells[0].availability === "value" ? "same" : cells[0].availability;
}

const formalComparisonProjectionShapeSchema = z.strictObject({
  schemaVersion: z.literal(FORMAL_COMPARISON_SCHEMA_VERSION),
  kind: z.literal("formal_revision_comparison"),
  baselineSlotId: z.literal("A"),
  targetInstant: canonicalComparisonTargetInstantSchema.nullable(),
  matrix: comparisonMatrixSchema,
  transits: z.array(synchronizedTransitResultSchema).max(4),
  manifest: z.strictObject({
    algorithmId: z.literal("hakimi-comparison-core:formal-revision-projection:v1"),
    hashSchemaVersion: z.literal(FORMAL_COMPARISON_HASH_SCHEMA_VERSION),
    interpretationIncluded: z.literal(false),
    scoreIncluded: z.literal(false),
    resultHash: sha256Schema
  })
}).superRefine((value, context) => {
  const items = value.matrix.items;
  const itemCount = items.length;
  const expectedSlotIds = formalComparisonSlotIdSchema.options.slice(0, itemCount);
  const itemKeys = items.map((item) => item.key);
  const revisionIds = items.map((item) => item.revision.id);

  if (items.some((item, index) => item.slotId !== expectedSlotIds[index])) {
    context.addIssue({ code: "custom", path: ["matrix", "items"], message: "输出项目必须按 A—D 连续排列且 A 为首列基准" });
  }
  if (new Set(itemKeys).size !== itemCount || new Set(revisionIds).size !== itemCount) {
    context.addIssue({ code: "custom", path: ["matrix", "items"], message: "输出项目键与 Revision 必须唯一" });
  }

  const sectionCategories = value.matrix.sections.map((section) => section.category);
  if (sectionCategories.some((category, index) => category !== FORMAL_COMPARISON_CATEGORY_ORDER[index])) {
    context.addIssue({ code: "custom", path: ["matrix", "sections"], message: "对照分组必须使用冻结顺序" });
  }

  const allRows = value.matrix.sections.flatMap((section, sectionIndex) => {
    let sectionDifferenceCount = 0;
    for (const [rowIndex, row] of section.rows.entries()) {
      const rowPath = ["matrix", "sections", sectionIndex, "rows", rowIndex] as const;
      if (row.category !== section.category) {
        context.addIssue({ code: "custom", path: [...rowPath, "category"], message: "字段类别必须与所在分组一致" });
      }
      if (row.values.length !== itemCount || row.cells.length !== itemCount) {
        context.addIssue({ code: "custom", path: [...rowPath, "cells"], message: "每个字段必须与全部活动对照列严格对齐" });
        continue;
      }
      if (row.values.some((item, index) => item !== row.cells[index].value)) {
        context.addIssue({ code: "custom", path: [...rowPath, "values"], message: "values 必须逐项复用 cells.value" });
      }

      const baseline = row.cells[0];
      for (const [cellIndex, cell] of row.cells.entries()) {
        let expectedStatus: z.infer<typeof comparisonCellStatusSchema>;
        if (cell.availability !== "value") expectedStatus = cell.availability;
        else if (cellIndex === 0) expectedStatus = "baseline";
        else if (baseline.availability !== "value") expectedStatus = "added";
        else expectedStatus = cell.value === baseline.value ? "same" : "changed";
        if (cell.status !== expectedStatus) {
          context.addIssue({
            code: "custom",
            path: [...rowPath, "cells", cellIndex, "status"],
            message: `字段状态必须由可用性及 A 基准推导为 ${expectedStatus}`
          });
        }
      }

      const expectedStatus = expectedComparisonRowStatus(row.cells);
      const expectedDifferent = expectedStatus === "changed" || expectedStatus === "mixed";
      if (row.status !== expectedStatus) {
        context.addIssue({ code: "custom", path: [...rowPath, "status"], message: `行状态必须推导为 ${expectedStatus}` });
      }
      if (row.different !== expectedDifferent) {
        context.addIssue({ code: "custom", path: [...rowPath, "different"], message: "different 必须与行状态一致" });
      }
      if (expectedDifferent) sectionDifferenceCount += 1;
    }
    if (section.differenceCount !== sectionDifferenceCount) {
      context.addIssue({ code: "custom", path: ["matrix", "sections", sectionIndex, "differenceCount"], message: "分组差异数与字段事实不一致" });
    }
    return section.rows;
  });

  if (new Set(allRows.map((row) => row.id)).size !== allRows.length) {
    context.addIssue({ code: "custom", path: ["matrix", "sections"], message: "对照字段 ID 必须全局唯一" });
  }
  if (value.matrix.rowCount !== allRows.length) {
    context.addIssue({ code: "custom", path: ["matrix", "rowCount"], message: "rowCount 与实际字段行数不一致" });
  }
  const actualDifferenceCount = allRows.filter((row) => row.different).length;
  if (value.matrix.differenceCount !== actualDifferenceCount) {
    context.addIssue({ code: "custom", path: ["matrix", "differenceCount"], message: "differenceCount 与实际差异行数不一致" });
  }
  const actualChangedCategories = value.matrix.sections
    .filter((section) => section.differenceCount > 0)
    .map((section) => section.category);
  if (JSON.stringify(value.matrix.changedCategories) !== JSON.stringify(actualChangedCategories)) {
    context.addIssue({ code: "custom", path: ["matrix", "changedCategories"], message: "changedCategories 必须按冻结分组顺序精确派生" });
  }
  const inputSection = value.matrix.sections.find((section) => section.category === "input");
  if (value.matrix.sameBirthInput !== (inputSection?.differenceCount === 0)) {
    context.addIssue({ code: "custom", path: ["matrix", "sameBirthInput"], message: "sameBirthInput 必须由输入分组差异数派生" });
  }

  if (value.targetInstant === null) {
    if (value.transits.length !== 0) {
      context.addIssue({ code: "custom", path: ["transits"], message: "无目标瞬时点时不能携带同步运限结果" });
    }
    return;
  }
  if (value.transits.length !== itemCount || value.transits.some((result, index) => result.itemKey !== itemKeys[index])) {
    context.addIssue({ code: "custom", path: ["transits"], message: "同步运限必须按项目顺序与全部活动列一一对应" });
    return;
  }
  for (const [index, result] of value.transits.entries()) {
    if (result.status !== "resolved") continue;
    const item = items[index];
    const snapshot = result.snapshot;
    const expectedLuckDigest = item.revision.manifest.luckCycleRuleDigest;
    if (
      snapshot.target.instant !== value.targetInstant ||
      snapshot.caseId !== item.caseId ||
      snapshot.revisionId !== item.revision.id ||
      snapshot.revisionResultHash !== item.revision.manifest.resultHash ||
      snapshot.ruleProfileDigest !== item.revision.manifest.ruleProfileDigest ||
      snapshot.manualDirection !== item.manualDirection ||
      (expectedLuckDigest === undefined
        ? snapshot.luckCycleRuleSource !== "legacy_inferred"
        : snapshot.luckCycleRuleSource !== "revision_snapshot" || snapshot.luckCycleRuleDigest !== expectedLuckDigest)
    ) {
      context.addIssue({ code: "custom", path: ["transits", index, "snapshot"], message: "同步运限快照必须绑定同列 Revision、规则、方向与同一 UTC 瞬时点" });
    }
  }
});
export const formalComparisonProjectionSchema = exactStoredRecordSchema(
  formalComparisonProjectionShapeSchema,
  "FormalComparisonProjection"
);

export const PAIR_STRUCTURE_RESEARCH_SCHEMA_VERSION = "1.0.0" as const;
export const PAIR_STRUCTURE_RESEARCH_HASH_SCHEMA_VERSION = "pair-structure-research-hash-v1" as const;

export const pairStructureResearchPolicySchema = z.strictObject({
  mode: z.literal("parallel_facts_only"),
  interpretationIncluded: z.literal(false),
  scoreIncluded: z.literal(false),
  crossChartDerivationIncluded: z.literal(false),
  relationshipConclusionIncluded: z.literal(false)
});

const pairStructureResearchSubjectASchema = formalComparisonSlotRequestSchema.extend({
  slotId: z.literal("A")
});
const pairStructureResearchSubjectBSchema = formalComparisonSlotRequestSchema.extend({
  slotId: z.literal("B")
});

export const pairStructureResearchRequestSchema = z.strictObject({
  schemaVersion: z.literal(PAIR_STRUCTURE_RESEARCH_SCHEMA_VERSION),
  kind: z.literal("pair_structure_research"),
  policy: pairStructureResearchPolicySchema,
  subjects: z.tuple([pairStructureResearchSubjectASchema, pairStructureResearchSubjectBSchema]),
  atInstant: canonicalComparisonTargetInstantSchema
}).superRefine((value, context) => {
  const [subjectA, subjectB] = value.subjects;
  if (subjectA.caseId === subjectB.caseId) {
    context.addIssue({
      code: "custom",
      path: ["subjects", 1, "caseId"],
      message: "双案例结构研究必须选择两个不同 Case；同一案例的不同 Revision 请使用正式对照台"
    });
  }
  if (subjectA.revisionId === subjectB.revisionId) {
    context.addIssue({
      code: "custom",
      path: ["subjects", 1, "revisionId"],
      message: "双案例结构研究的两个确切 Revision 不能重复"
    });
  }
});

const forbiddenPairResearchFieldPattern = /(?:score|rating|compatib|matchmaking|relationship[_-]?(?:outcome|verdict)|缘分|合婚|婚配|克配|吉凶|相合结论|相克结论)/i;

export const pairStructureObservationSchema = z.strictObject({
  id: z.string().regex(/^[a-z][A-Za-z0-9_.]{0,159}$/),
  category: formalComparisonCategorySchema,
  label: canonicalShortTextSchema(160),
  value: z.string().max(1_000_000),
  availability: comparisonCellAvailabilitySchema
});

const pairStructureParticipantBaseSchema = z.strictObject({
  item: comparisonItemSchema,
  observations: z.array(pairStructureObservationSchema).min(1).max(240),
  transit: synchronizedTransitResultSchema
});
const pairStructureParticipantASchema = pairStructureParticipantBaseSchema.extend({ role: z.literal("A") });
const pairStructureParticipantBSchema = pairStructureParticipantBaseSchema.extend({ role: z.literal("B") });

const pairStructureResearchProjectionShapeSchema = z.strictObject({
  schemaVersion: z.literal(PAIR_STRUCTURE_RESEARCH_SCHEMA_VERSION),
  kind: z.literal("pair_structure_research_projection"),
  policy: pairStructureResearchPolicySchema,
  targetInstant: canonicalComparisonTargetInstantSchema,
  participants: z.tuple([pairStructureParticipantASchema, pairStructureParticipantBSchema]),
  manifest: z.strictObject({
    algorithmId: z.literal("hakimi-comparison-core:pair-structure-research:v1"),
    hashSchemaVersion: z.literal(PAIR_STRUCTURE_RESEARCH_HASH_SCHEMA_VERSION),
    semanticBoundary: z.literal("participant_facts_only"),
    evidenceStatus: z.literal("engineering_projection"),
    interpretationIncluded: z.literal(false),
    scoreIncluded: z.literal(false),
    compatibilityIncluded: z.literal(false),
    crossChartDerivationIncluded: z.literal(false),
    resultHash: sha256Schema
  })
}).superRefine((value, context) => {
  const [participantA, participantB] = value.participants;
  const participants = [participantA, participantB] as const;
  if (participantA.item.caseId === participantB.item.caseId) {
    context.addIssue({
      code: "custom",
      path: ["participants", 1, "item", "caseId"],
      message: "双案例结构研究输出不能复用同一个 Case"
    });
  }
  if (participantA.item.revision.id === participantB.item.revision.id) {
    context.addIssue({ code: "custom", path: ["participants", 1, "item", "revision", "id"], message: "双案例结构研究输出不能重复同一个 Revision" });
  }

  const expectedRoles = ["A", "B"] as const;
  for (const [participantIndex, participant] of participants.entries()) {
    const expectedRole = expectedRoles[participantIndex];
    if (participant.role !== expectedRole || participant.item.slotId !== expectedRole) {
      context.addIssue({
        code: "custom",
        path: ["participants", participantIndex],
        message: "双案例结构研究参与方必须按 A/B 排列并绑定同名正式槽位"
      });
    }
    if (participant.transit.itemKey !== participant.item.key) {
      context.addIssue({
        code: "custom",
        path: ["participants", participantIndex, "transit", "itemKey"],
        message: "每一方运限必须绑定自己的确切 Revision"
      });
    }
    if (participant.transit.status === "resolved") {
      const snapshot = participant.transit.snapshot;
      const expectedLuckDigest = participant.item.revision.manifest.luckCycleRuleDigest;
      if (
        snapshot.target.instant !== value.targetInstant ||
        snapshot.caseId !== participant.item.caseId ||
        snapshot.revisionId !== participant.item.revision.id ||
        snapshot.revisionResultHash !== participant.item.revision.manifest.resultHash ||
        snapshot.ruleProfileDigest !== participant.item.revision.manifest.ruleProfileDigest ||
        snapshot.manualDirection !== participant.item.manualDirection ||
        (expectedLuckDigest === undefined
          ? snapshot.luckCycleRuleSource !== "legacy_inferred"
          : snapshot.luckCycleRuleSource !== "revision_snapshot" || snapshot.luckCycleRuleDigest !== expectedLuckDigest)
      ) {
        context.addIssue({
          code: "custom",
          path: ["participants", participantIndex, "transit", "snapshot"],
          message: "每一方运限必须绑定自己的 Revision、规则、方向与同一 UTC 瞬时点"
        });
      }
    }
    if (new Set(participant.observations.map((observation) => observation.id)).size !== participant.observations.length) {
      context.addIssue({
        code: "custom",
        path: ["participants", participantIndex, "observations"],
        message: "同一方的事实观察 ID 不能重复"
      });
    }
    for (const [observationIndex, observation] of participant.observations.entries()) {
      if (forbiddenPairResearchFieldPattern.test(observation.id) || forbiddenPairResearchFieldPattern.test(observation.label)) {
        context.addIssue({
          code: "custom",
          path: ["participants", participantIndex, "observations", observationIndex],
          message: "双案例事实投影禁止评分、缘分、合婚吉凶或关系结论字段"
        });
      }
    }
  }

  if (participantA.observations.length !== participantB.observations.length) {
    context.addIssue({ code: "custom", path: ["participants", 1, "observations"], message: "双方必须使用同一冻结事实字段清单" });
  } else {
    for (const [index, observationA] of participantA.observations.entries()) {
      const observationB = participantB.observations[index];
      if (
        observationA.id !== observationB.id ||
        observationA.category !== observationB.category ||
        observationA.label !== observationB.label
      ) {
        context.addIssue({
          code: "custom",
          path: ["participants", 1, "observations", index],
          message: "双方事实字段必须按同一 ID、类别和标签顺序逐项对齐"
        });
      }
    }
  }
});

export const pairStructureResearchProjectionSchema = exactStoredRecordSchema(
  pairStructureResearchProjectionShapeSchema,
  "PairStructureResearchProjection"
);

export const eventDatePrecisionSchema = z.enum(["year", "month", "day", "minute", "unknown"]);

const eventDateValueSchema = z.string().max(16);
const EVENT_MINUTE_LOCAL_DATE_TIME_PATTERN = /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d$/;
export const eventMinuteLocalDateTimeSchema = z.string().regex(EVENT_MINUTE_LOCAL_DATE_TIME_PATTERN);
const eventSecondWallDateTimeSchema = z.string().regex(
  /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/
);
export const eventCanonicalUtcSchema = z.string()
  .datetime({ offset: true })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, "canonicalUtc 必须是精确到秒的规范 Z UTC");

function eventDatePattern(precision: z.infer<typeof eventDatePrecisionSchema>): RegExp | null {
  if (precision === "year") return /^(?:19|20|21)\d{2}$/;
  if (precision === "month") return /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/;
  if (precision === "day") return /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
  if (precision === "minute") return EVENT_MINUTE_LOCAL_DATE_TIME_PATTERN;
  return null;
}

function isValidCalendarEventDate(
  value: string,
  precision: z.infer<typeof eventDatePrecisionSchema>,
  pattern: RegExp
): boolean {
  if (!pattern.test(value)) return false;
  if (precision !== "day" && precision !== "minute") return true;
  const [yearText, monthText, dayText] = value.slice(0, 10).split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const reconstructed = new Date(Date.UTC(year, month - 1, day));
  return reconstructed.getUTCFullYear() === year &&
    reconstructed.getUTCMonth() === month - 1 &&
    reconstructed.getUTCDate() === day;
}

const eventTimeZoneCandidateSchema = z.strictObject({
  choice: z.enum(["unique", "earlier", "later"]),
  instant: eventCanonicalUtcSchema,
  utcOffset: z.string().regex(/^[+-]\d{2}:[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?$/),
  utcOffsetMinutes: z.number().finite(),
  resolvedWallTime: eventSecondWallDateTimeSchema,
  zonedDateTime: z.string().min(1).max(160),
  matchesInputWallTime: z.literal(true)
});

export const eventMinuteTimeZoneResolutionSchema = z.strictObject({
  kind: z.enum(["unique", "overlap"]),
  policy: dstDisambiguationPolicySchema,
  status: z.enum(["resolved_unique", "resolved_overlap_earlier", "resolved_overlap_later"]),
  requestedWallTime: eventSecondWallDateTimeSchema,
  candidates: z.array(eventTimeZoneCandidateSchema).min(1).max(2),
  selectedCandidate: eventTimeZoneCandidateSchema
}).superRefine((value, context) => {
  if (value.candidates.some((candidate) => candidate.resolvedWallTime !== value.requestedWallTime)) {
    context.addIssue({ code: "custom", path: ["candidates"], message: "所有事件时间候选都必须精确匹配原民用分钟" });
  }
  if (value.kind === "unique") {
    if (
      value.policy !== "reject" ||
      value.status !== "resolved_unique" ||
      value.candidates.length !== 1 ||
      value.candidates[0]?.choice !== "unique" ||
      value.selectedCandidate.choice !== "unique"
    ) {
      context.addIssue({ code: "custom", path: ["status"], message: "unique 时间必须保存唯一候选和 resolved_unique 状态" });
    }
  } else {
    const expectedChoice = value.policy === "earlier" || value.policy === "later" ? value.policy : null;
    const expectedStatus = expectedChoice === "earlier"
      ? "resolved_overlap_earlier"
      : expectedChoice === "later"
        ? "resolved_overlap_later"
        : null;
    if (
      expectedChoice === null ||
      value.status !== expectedStatus ||
      value.candidates.length !== 2 ||
      value.candidates[0]?.choice !== "earlier" ||
      value.candidates[1]?.choice !== "later" ||
      value.selectedCandidate.choice !== expectedChoice
    ) {
      context.addIssue({ code: "custom", path: ["policy"], message: "DST overlap 必须显式保存 earlier/later 决策及对应候选" });
    }
  }
  const selected = value.candidates.find((candidate) => candidate.choice === value.selectedCandidate.choice);
  if (!selected || JSON.stringify(selected) !== JSON.stringify(value.selectedCandidate)) {
    context.addIssue({ code: "custom", path: ["selectedCandidate"], message: "selectedCandidate 必须逐字段等于候选集合中的已选项" });
  }
});

export const eventZonedMinuteBoundarySchema = z.strictObject({
  localDateTime: eventMinuteLocalDateTimeSchema,
  resolution: eventMinuteTimeZoneResolutionSchema,
  canonicalUtc: eventCanonicalUtcSchema
}).superRefine((value, context) => {
  if (`${value.localDateTime}:00` !== value.resolution.requestedWallTime) {
    context.addIssue({ code: "custom", path: ["resolution", "requestedWallTime"], message: "民用分钟必须与时区解析请求完全一致" });
  }
  if (value.canonicalUtc !== value.resolution.selectedCandidate.instant) {
    context.addIssue({ code: "custom", path: ["canonicalUtc"], message: "canonicalUtc 必须等于已选时区候选的 Z UTC" });
  }
});

export const eventTimeContextSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("legacy_floating") }),
  z.strictObject({ kind: z.literal("calendar_date") }),
  z.strictObject({
    kind: z.literal("zoned_minute"),
    timeZone: ianaTimeZoneSchema,
    tzdbVersion: tzdbVersionSchema,
    timeZoneDatabase: timeZoneDatabaseSnapshotSchema.optional(),
    start: eventZonedMinuteBoundarySchema,
    end: eventZonedMinuteBoundarySchema.nullable()
  })
]).superRefine((value, context) => {
  if (value.kind !== "zoned_minute") return;
  validateTzdbBinding(value, context);
  for (const [boundaryName, boundary] of [["start", value.start], ["end", value.end]] as const) {
    if (!boundary) continue;
    for (const [index, candidate] of boundary.resolution.candidates.entries()) {
      if (!candidate.zonedDateTime.endsWith(`[${value.timeZone}]`) || !candidate.zonedDateTime.includes(candidate.utcOffset)) {
        context.addIssue({
          code: "custom",
          path: [boundaryName, "resolution", "candidates", index, "zonedDateTime"],
          message: "候选 ZonedDateTime 必须绑定记录中的 IANA 时区与 UTC offset"
        });
      }
    }
  }
  if (value.end && value.end.canonicalUtc < value.start.canonicalUtc) {
    context.addIssue({ code: "custom", path: ["end", "canonicalUtc"], message: "事件结束 UTC 不能早于起始 UTC" });
  }
});

const legacyEventRecordV1Shape = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  caseId: z.string().uuid(),
  revisionId: z.string().uuid().nullable(),
  transitNodeRef: anyTransitNodeRefSchema.nullable(),
  datePrecision: eventDatePrecisionSchema,
  startDate: eventDateValueSchema.nullable(),
  endDate: eventDateValueSchema.nullable(),
  title: canonicalShortTextSchema(120),
  tags: researchTagsSchema,
  sourceRefs: researchSourceRefsSchema,
  feedback: z.enum(["unreviewed", "supports", "contradicts", "mixed"]),
  bodyFormat: z.literal("markdown"),
  body: z.string().max(200_000),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
} as const;

type EventDateRecord = {
  revisionId: string | null;
  transitNodeRef: z.infer<typeof anyTransitNodeRefSchema> | null;
  datePrecision: z.infer<typeof eventDatePrecisionSchema>;
  startDate: string | null;
  endDate: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function validateEventV1Fields(value: EventDateRecord, context: z.RefinementCtx, compareWallRange: boolean): void {
  if (value.transitNodeRef !== null && value.revisionId === null) {
    context.addIssue({ code: "custom", path: ["revisionId"], message: "绑定运限节点的事件必须同时绑定修订" });
  }
  if (
    value.transitNodeRef?.namespace === "hakimi-transit-node" &&
    value.revisionId !== value.transitNodeRef.revisionId
  ) {
    context.addIssue({ code: "custom", path: ["transitNodeRef", "revisionId"], message: "节点引用必须属于事件绑定的修订" });
  }
  const pattern = eventDatePattern(value.datePrecision);
  if (!pattern) {
    if (value.startDate !== null || value.endDate !== null) {
      context.addIssue({ code: "custom", path: ["startDate"], message: "unknown 精度不能伪造起止日期" });
    }
  } else {
    if (value.startDate === null || !isValidCalendarEventDate(value.startDate, value.datePrecision, pattern)) {
      context.addIssue({ code: "custom", path: ["startDate"], message: `startDate 与 ${value.datePrecision} 精度不一致` });
    }
    if (value.endDate !== null && !isValidCalendarEventDate(value.endDate, value.datePrecision, pattern)) {
      context.addIssue({ code: "custom", path: ["endDate"], message: `endDate 与 ${value.datePrecision} 精度不一致` });
    }
    if (compareWallRange && value.startDate !== null && value.endDate !== null && value.endDate < value.startDate) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "endDate 不能早于 startDate" });
    }
  }
  if (value.updatedAt < value.createdAt) {
    context.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt 不能早于 createdAt" });
  }
  if (value.deletedAt !== null && value.deletedAt < value.createdAt) {
    context.addIssue({ code: "custom", path: ["deletedAt"], message: "deletedAt 不能早于 createdAt" });
  }
}

/** Frozen Event shape stored by Dexie v2-v7 and full-backup v0.1-v0.5. Never extend. */
export const legacyEventRecordV1Schema = z.strictObject(legacyEventRecordV1Shape).superRefine((value, context) => {
  validateEventV1Fields(value, context, true);
});

export const eventRecordSchema = z.strictObject({
  ...legacyEventRecordV1Shape,
  recordVersion: z.literal(EVENT_RECORD_VERSION),
  timeContext: eventTimeContextSchema
}).superRefine((value, context) => {
  validateEventV1Fields(value, context, value.timeContext.kind !== "zoned_minute");
  if (value.timeContext.kind === "calendar_date" && value.datePrecision === "minute") {
    context.addIssue({ code: "custom", path: ["timeContext", "kind"], message: "minute 事件必须保存 zoned_minute 或 legacy_floating 时间语义" });
  }
  if (value.timeContext.kind === "zoned_minute") {
    if (value.datePrecision !== "minute") {
      context.addIssue({ code: "custom", path: ["timeContext", "kind"], message: "zoned_minute 只适用于 minute 精度" });
      return;
    }
    if (value.startDate !== value.timeContext.start.localDateTime) {
      context.addIssue({ code: "custom", path: ["startDate"], message: "startDate 必须等于 zoned_minute.start.localDateTime" });
    }
    if ((value.endDate === null) !== (value.timeContext.end === null)) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "endDate 与 zoned_minute.end 必须同时存在或同时为空" });
    } else if (value.endDate !== null && value.endDate !== value.timeContext.end?.localDateTime) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "endDate 必须等于 zoned_minute.end.localDateTime" });
    }
  }
});

export type LegacyEventRecordV1 = z.infer<typeof legacyEventRecordV1Schema>;

/** Pure shape migration: preserves every legacy value and deliberately infers no time zone or UTC instant. */
export function migrateLegacyEventRecordV1(input: LegacyEventRecordV1): z.infer<typeof eventRecordSchema> {
  const legacy = legacyEventRecordV1Schema.parse(input);
  return eventRecordSchema.parse({
    ...legacy,
    recordVersion: EVENT_RECORD_VERSION,
    timeContext: { kind: "legacy_floating" }
  });
}

export const eventTimeMigrationSnapshotSchema = z.strictObject({
  formatVersion: z.literal(EVENT_TIME_MIGRATION_SNAPSHOT_FORMAT_VERSION),
  eventRecordVersion: z.literal(EVENT_RECORD_VERSION),
  caseId: z.string().uuid(),
  revisionId: z.string().uuid().nullable(),
  transitNodeRef: anyTransitNodeRefSchema.nullable(),
  datePrecision: eventDatePrecisionSchema,
  startDate: eventDateValueSchema.nullable(),
  endDate: eventDateValueSchema.nullable(),
  timeContext: eventTimeContextSchema
}).superRefine((value, context) => {
  if (value.transitNodeRef !== null && value.revisionId === null) {
    context.addIssue({ code: "custom", path: ["revisionId"], message: "绑定运限节点的迁移快照必须同时绑定修订" });
  }
  if (
    value.transitNodeRef?.namespace === "hakimi-transit-node" &&
    value.revisionId !== value.transitNodeRef.revisionId
  ) {
    context.addIssue({ code: "custom", path: ["transitNodeRef", "revisionId"], message: "迁移快照的节点引用必须属于绑定修订" });
  }
  const pattern = eventDatePattern(value.datePrecision);
  if (!pattern) {
    if (value.startDate !== null || value.endDate !== null) {
      context.addIssue({ code: "custom", path: ["startDate"], message: "unknown 精度不能伪造起止日期" });
    }
  } else {
    if (value.startDate === null || !isValidCalendarEventDate(value.startDate, value.datePrecision, pattern)) {
      context.addIssue({ code: "custom", path: ["startDate"], message: `startDate 与 ${value.datePrecision} 精度不一致` });
    }
    if (value.endDate !== null && !isValidCalendarEventDate(value.endDate, value.datePrecision, pattern)) {
      context.addIssue({ code: "custom", path: ["endDate"], message: `endDate 与 ${value.datePrecision} 精度不一致` });
    }
    if (
      value.timeContext.kind !== "zoned_minute" &&
      value.startDate !== null &&
      value.endDate !== null &&
      value.endDate < value.startDate
    ) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "endDate 不能早于 startDate" });
    }
  }
  if (value.timeContext.kind === "calendar_date" && value.datePrecision === "minute") {
    context.addIssue({ code: "custom", path: ["timeContext", "kind"], message: "minute 事件不能使用 calendar_date" });
  }
  if (value.timeContext.kind === "zoned_minute") {
    if (value.datePrecision !== "minute") {
      context.addIssue({ code: "custom", path: ["timeContext", "kind"], message: "zoned_minute 只适用于 minute 精度" });
    }
    if (value.startDate !== value.timeContext.start.localDateTime) {
      context.addIssue({ code: "custom", path: ["startDate"], message: "startDate 必须等于 zoned_minute.start.localDateTime" });
    }
    if ((value.endDate === null) !== (value.timeContext.end === null)) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "endDate 与 zoned_minute.end 必须同时存在或同时为空" });
    } else if (value.endDate !== null && value.endDate !== value.timeContext.end?.localDateTime) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "endDate 必须等于 zoned_minute.end.localDateTime" });
    }
  }
});

export const eventTimeMigrationEndpointSchema = z.strictObject({
  kind: z.literal("event"),
  recordId: z.string().uuid(),
  snapshot: eventTimeMigrationSnapshotSchema,
  snapshotDigest: sha256Schema
});

export const eventTimeMigrationInterpretationSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("calendar_date") }),
  z.strictObject({
    kind: z.literal("zoned_minute"),
    timeZone: ianaTimeZoneSchema,
    startDisambiguation: dstDisambiguationPolicySchema,
    endDisambiguation: dstDisambiguationPolicySchema.nullable()
  })
]);

export const eventTimeMigrationReceiptSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(EVENT_TIME_MIGRATION_RECEIPT_RECORD_VERSION),
  id: z.string().uuid(),
  operation: z.literal("event_time_semantic_derivation"),
  authorization: z.strictObject({ kind: z.literal("explicit_local_user_confirmation") }),
  source: eventTimeMigrationEndpointSchema,
  target: eventTimeMigrationEndpointSchema,
  interpretation: eventTimeMigrationInterpretationSchema,
  createdAt: z.string().datetime()
}).superRefine((value, context) => {
  if (value.source.recordId === value.target.recordId) {
    context.addIssue({ code: "custom", path: ["target", "recordId"], message: "事件时间迁移必须创建新 ID" });
  }
  if (value.source.snapshotDigest === value.target.snapshotDigest) {
    context.addIssue({ code: "custom", path: ["target", "snapshotDigest"], message: "新旧时间语义快照摘要必须不同" });
  }
  if (value.source.snapshot.timeContext.kind !== "legacy_floating") {
    context.addIssue({ code: "custom", path: ["source", "snapshot", "timeContext", "kind"], message: "迁移源必须是 legacy_floating" });
  }
  if (value.target.snapshot.timeContext.kind === "legacy_floating") {
    context.addIssue({ code: "custom", path: ["target", "snapshot", "timeContext", "kind"], message: "迁移目标必须使用当前时间语义" });
  }
  const expectedTargetKind = value.source.snapshot.datePrecision === "minute" ? "zoned_minute" : "calendar_date";
  if (value.target.snapshot.timeContext.kind !== expectedTargetKind) {
    context.addIssue({
      code: "custom",
      path: ["target", "snapshot", "timeContext", "kind"],
      message: `旧事件 ${value.source.snapshot.datePrecision} 精度只能派生为 ${expectedTargetKind}`
    });
  }
  if (value.interpretation.kind !== expectedTargetKind) {
    context.addIssue({
      code: "custom",
      path: ["interpretation", "kind"],
      message: `迁移解释必须与 ${value.source.snapshot.datePrecision} 精度一致`
    });
  }
  if (
    value.target.snapshot.timeContext.kind === "zoned_minute" &&
    (
      value.target.snapshot.timeContext.tzdbVersion === LEGACY_UNIDENTIFIED_TZDB_VERSION ||
      value.target.snapshot.timeContext.timeZoneDatabase === undefined
    )
  ) {
    context.addIssue({ code: "custom", path: ["target", "snapshot", "timeContext", "tzdbVersion"], message: "分钟迁移目标必须绑定内容寻址 tzdb 快照" });
  }
  if (
    value.interpretation.kind === "zoned_minute" &&
    value.target.snapshot.timeContext.kind === "zoned_minute"
  ) {
    if (value.interpretation.timeZone !== value.target.snapshot.timeContext.timeZone) {
      context.addIssue({ code: "custom", path: ["interpretation", "timeZone"], message: "解释时区必须等于目标快照时区" });
    }
    if (value.interpretation.startDisambiguation !== value.target.snapshot.timeContext.start.resolution.policy) {
      context.addIssue({ code: "custom", path: ["interpretation", "startDisambiguation"], message: "起始 DST 选择必须等于目标快照选择" });
    }
    const expectedEndPolicy = value.target.snapshot.timeContext.end?.resolution.policy ?? null;
    if (value.interpretation.endDisambiguation !== expectedEndPolicy) {
      context.addIssue({ code: "custom", path: ["interpretation", "endDisambiguation"], message: "结束 DST 选择必须等于目标快照选择" });
    }
  }
  for (const field of ["caseId", "revisionId", "transitNodeRef", "datePrecision", "startDate", "endDate"] as const) {
    if (!hasExactJsonStructure(value.source.snapshot[field], value.target.snapshot[field])) {
      context.addIssue({ code: "custom", path: ["target", "snapshot", field], message: `时间语义迁移不能改写 ${field}` });
    }
  }
});

export type EventTimeMigrationSnapshot = z.infer<typeof eventTimeMigrationSnapshotSchema>;
export type EventTimeMigrationEndpoint = z.infer<typeof eventTimeMigrationEndpointSchema>;
export type EventTimeMigrationInterpretation = z.infer<typeof eventTimeMigrationInterpretationSchema>;
export type EventTimeMigrationReceipt = z.infer<typeof eventTimeMigrationReceiptSchema>;

export type SerializableFilterValue = null | boolean | number | string | SerializableFilterValue[] | {
  [key: string]: SerializableFilterValue;
};

export const serializableFilterValueSchema: z.ZodType<SerializableFilterValue> = z.lazy(() => z.union([
  z.null(),
  z.boolean(),
  z.number().finite(),
  z.string(),
  z.array(serializableFilterValueSchema),
  z.record(z.string(), serializableFilterValueSchema)
]));

export const savedViewFiltersSchema = z.record(z.string(), serializableFilterValueSchema);

export const savedViewSortSchema = z.strictObject({
  field: z.enum(["relevance", "updatedAt", "createdAt", "alias"]),
  direction: z.enum(["asc", "desc"])
});

/** Frozen on-disk SavedView v1 shape. Never widen or reuse the current schema here. */
export const legacySavedViewRecordV1Schema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  name: canonicalShortTextSchema(80),
  query: canonicalOptionalTextSchema(500),
  filters: savedViewFiltersSchema,
  sort: savedViewSortSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).refine((value) => value.updatedAt >= value.createdAt, {
  path: ["updatedAt"],
  message: "updatedAt 不能早于 createdAt"
});

const canonicalResearchQueryList = <Schema extends z.ZodType>(schema: Schema, maximum: number) => z
  .array(schema)
  .max(maximum)
  .refine(
    (values) => values.every((value, index) => index === 0 || String(values[index - 1]) < String(value)),
    "查询多选值必须去重并按稳定代码点顺序保存"
  );

export const researchQueryHeavenlyStemSchema = z.enum(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
export const researchQueryEarthlyBranchSchema = z.enum(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
export const pillarRelationTypeSchema = z.enum(PILLAR_RELATION_TYPES);

export function normalizeResearchQueryText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

const researchQueryTextSchema = canonicalOptionalTextSchema(500).refine(
  (value) => value === normalizeResearchQueryText(value),
  "查询文字必须预先按 NFKC、小写和单空格规范化"
);
const researchQueryTagsSchema = canonicalResearchQueryList(canonicalShortTextSchema(40), 50);
const commonResearchQuerySortFields = ["relevance", "updatedAt", "createdAt"] as const;
const researchCaseSortSchema = z.strictObject({
  field: z.enum([...commonResearchQuerySortFields, "alias"]),
  direction: z.enum(["asc", "desc"])
});
const researchEventSortSchema = z.strictObject({
  field: z.enum([...commonResearchQuerySortFields, "title"]),
  direction: z.enum(["asc", "desc"])
});
const researchKnowledgeSortSchema = researchEventSortSchema;
const canonicalUtcQueryInstantSchema = z
  .string()
  .datetime({ offset: true })
  .refine(
    (value) => value.endsWith("Z") && new Date(value).toISOString() === value,
    "研究查询瞬时点必须是带三位毫秒的规范 UTC"
  );

export const researchQueryTransitMatchSchema = z.strictObject({
  nodeType: transitNodeTypeSchema,
  ganZhi: ganZhiSchema.nullable(),
  stemTenGod: canonicalShortTextSchema(20).nullable()
}).refine((value) => value.ganZhi !== null || value.stemTenGod !== null, {
  message: "运限节点条件的干支与十神至少必须提供一项"
});

const researchQueryTransitSchema = z.strictObject({
  atInstant: canonicalUtcQueryInstantSchema,
  manualDirection: z.enum(["forward", "backward"]).nullable(),
  matches: z.array(researchQueryTransitMatchSchema).min(1).max(6).superRefine((matches, context) => {
    const order = new Map(transitNodeTypeSchema.options.map((nodeType, index) => [nodeType, index]));
    matches.forEach((match, index) => {
      if (index > 0 && (order.get(matches[index - 1].nodeType) ?? -1) >= (order.get(match.nodeType) ?? -1)) {
        context.addIssue({ code: "custom", path: [index, "nodeType"], message: "运限条件必须按固定轨道顺序保存且每条轨道最多一项" });
      }
    });
  })
});

const researchQueryCaseEventsSchema = z.strictObject({
  text: researchQueryTextSchema,
  tags: researchQueryTagsSchema,
  feedbacks: canonicalResearchQueryList(z.enum(["unreviewed", "supports", "contradicts", "mixed"]), 4),
  lifecycle: z.enum(["active", "deleted", "all"]),
  binding: z.enum(["any", "case_only", "matched_revision", "transit_node"])
});

const researchCaseQuerySchema = z.strictObject({
  version: z.literal(RESEARCH_QUERY_VERSION),
  scope: z.literal("cases"),
  text: researchQueryTextSchema,
  lifecycle: z.enum(["active", "trashed", "all"]),
  favorites: z.enum(["any", "only"]),
  revisionScope: z.enum(["latest", "any"]),
  caseTags: canonicalResearchQueryList(canonicalShortTextSchema(30), 20),
  dayMasters: canonicalResearchQueryList(researchQueryHeavenlyStemSchema, 10),
  monthBranches: canonicalResearchQueryList(researchQueryEarthlyBranchSchema, 12),
  relationTypes: canonicalResearchQueryList(pillarRelationTypeSchema, PILLAR_RELATION_TYPES.length),
  ruleProfileDigests: canonicalResearchQueryList(sha256Schema, 50),
  transit: researchQueryTransitSchema.nullable(),
  events: researchQueryCaseEventsSchema.nullable(),
  sort: researchCaseSortSchema
});

const researchCandidateSetQuerySchema = z.strictObject({
  version: z.literal(RESEARCH_QUERY_VERSION),
  scope: z.literal("candidate_sets"),
  text: researchQueryTextSchema,
  lifecycle: z.enum(["active", "trashed", "all"]),
  favorites: z.enum(["any", "only"]),
  tags: canonicalResearchQueryList(canonicalShortTextSchema(30), 20),
  sort: researchCaseSortSchema
});

export const researchEventBindingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("any") }),
  z.strictObject({ kind: z.literal("case_only") }),
  z.strictObject({ kind: z.literal("revision_bound") }),
  z.strictObject({ kind: z.literal("node_bound") }),
  z.strictObject({
    kind: z.literal("context_case"),
    caseId: z.string().uuid()
  }),
  z.strictObject({
    kind: z.literal("context_revision"),
    caseId: z.string().uuid(),
    revisionId: z.string().uuid()
  }),
  z.strictObject({
    kind: z.literal("context_node"),
    caseId: z.string().uuid(),
    revisionId: z.string().uuid(),
    nodeType: transitNodeTypeSchema,
    nodeId: transitNodeIdSchema
  })
]);

const researchEventQuerySchema = z.strictObject({
  version: z.literal(RESEARCH_QUERY_VERSION),
  scope: z.literal("events"),
  text: researchQueryTextSchema,
  tags: researchQueryTagsSchema,
  feedbacks: canonicalResearchQueryList(z.enum(["unreviewed", "supports", "contradicts", "mixed"]), 4),
  lifecycle: z.enum(["active", "deleted", "all"]),
  binding: researchEventBindingSchema,
  sort: researchEventSortSchema
});

const researchKnowledgeQuerySchema = z.strictObject({
  version: z.literal(RESEARCH_QUERY_VERSION),
  scope: z.literal("knowledge"),
  text: researchQueryTextSchema,
  recordTypes: canonicalResearchQueryList(
    z.enum(["user_knowledge_document", "bundled_knowledge_document"]),
    2
  ),
  sort: researchKnowledgeSortSchema
});

export const researchQuerySchema = z
  .discriminatedUnion("scope", [
    researchCaseQuerySchema,
    researchCandidateSetQuerySchema,
    researchEventQuerySchema,
    researchKnowledgeQuerySchema
  ])
  .superRefine((value, context) => {
    if (value.scope === "cases" && value.events?.binding === "transit_node" && value.transit === null) {
      context.addIssue({
        code: "custom",
        path: ["events", "binding"],
        message: "事件绑定到命中运限节点时，查询必须同时提供确定的运限瞬时点与节点条件"
      });
    }
  });

const readySavedViewRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(SAVED_VIEW_RECORD_VERSION),
  state: z.literal("ready"),
  id: z.string().uuid(),
  name: canonicalShortTextSchema(80),
  query: researchQuerySchema,
  queryDigest: sha256Schema,
  editVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

const migrationRequiredSavedViewRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(SAVED_VIEW_RECORD_VERSION),
  state: z.literal("migration_required"),
  id: z.string().uuid(),
  name: canonicalShortTextSchema(80),
  legacyRecord: legacySavedViewRecordV1Schema,
  migrationReason: z.literal(SAVED_VIEW_LEGACY_MIGRATION_REASON),
  editVersion: z.literal(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * SavedView v2 has one physical representation. A legacy arbitrary-filter record has no
 * executable query until a caller explicitly supplies a reviewed ResearchQuery v1.
 */
export const savedViewRecordSchema = z
  .discriminatedUnion("state", [readySavedViewRecordSchema, migrationRequiredSavedViewRecordSchema])
  .superRefine((value, context) => {
    if (value.updatedAt < value.createdAt) {
      context.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt 不能早于 createdAt" });
    }
    if (value.state !== "migration_required") return;
    const legacy = value.legacyRecord;
    if (value.schemaVersion !== legacy.schemaVersion) {
      context.addIssue({ code: "custom", path: ["legacyRecord", "schemaVersion"], message: "legacyRecord.schemaVersion 必须与外层一致" });
    }
    if (value.id !== legacy.id) {
      context.addIssue({ code: "custom", path: ["legacyRecord", "id"], message: "legacyRecord.id 必须与外层一致" });
    }
    if (value.name !== legacy.name) {
      context.addIssue({ code: "custom", path: ["legacyRecord", "name"], message: "legacyRecord.name 必须与外层一致" });
    }
    if (value.createdAt !== legacy.createdAt) {
      context.addIssue({ code: "custom", path: ["legacyRecord", "createdAt"], message: "legacyRecord.createdAt 必须与外层一致" });
    }
    if (value.updatedAt !== legacy.updatedAt) {
      context.addIssue({ code: "custom", path: ["legacyRecord", "updatedAt"], message: "legacyRecord.updatedAt 必须与外层一致" });
    }
  });

export type LegacySavedViewRecordV1 = z.infer<typeof legacySavedViewRecordV1Schema>;
export type ReadySavedViewRecord = z.infer<typeof readySavedViewRecordSchema>;
export type MigrationRequiredSavedViewRecord = z.infer<typeof migrationRequiredSavedViewRecordSchema>;

/** Pure, lossless migration. It deliberately interprets none of the legacy query/filter/sort data. */
export function migrateLegacySavedViewRecordV1(
  input: LegacySavedViewRecordV1
): MigrationRequiredSavedViewRecord {
  const legacyRecord = legacySavedViewRecordV1Schema.parse(input);
  return savedViewRecordSchema.parse({
    schemaVersion: legacyRecord.schemaVersion,
    recordVersion: SAVED_VIEW_RECORD_VERSION,
    state: "migration_required",
    id: legacyRecord.id,
    name: legacyRecord.name,
    legacyRecord,
    migrationReason: SAVED_VIEW_LEGACY_MIGRATION_REASON,
    editVersion: 1,
    createdAt: legacyRecord.createdAt,
    updatedAt: legacyRecord.updatedAt
  }) as MigrationRequiredSavedViewRecord;
}

const knowledgeSectionIdSchema = z.string().regex(/^section-[1-9]\d*$/);

export const knowledgeSectionSchema = z.strictObject({
  id: knowledgeSectionIdSchema,
  title: canonicalShortTextSchema(300),
  level: z.number().int().min(0).max(6),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive()
}).superRefine((value, context) => {
  if (value.endLine < value.startLine) {
    context.addIssue({ code: "custom", path: ["endLine"], message: "章节结束行不能早于起始行" });
  }
  if (value.id !== `section-${value.startLine}`) {
    context.addIssue({ code: "custom", path: ["id"], message: "章节 ID 必须由 1-based 起始行稳定生成" });
  }
});

const normalizedKnowledgeContentSchema = z
  .string()
  .min(1)
  .max(2_000_000)
  .refine((value) => !value.startsWith("\uFEFF"), "规范化资料不能保留 UTF-8 BOM")
  .refine((value) => !value.includes("\r"), "规范化资料只能使用 LF 换行")
  .refine((value) => !value.includes("\0"), "资料不能包含 NUL 控制字符")
  .refine((value) => value.trim().length > 0, "资料内容不能为空");

export const knowledgeDocumentRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  recordType: z.enum(["user_knowledge_document", "bundled_knowledge_document"]),
  title: canonicalShortTextSchema(300),
  author: canonicalOptionalTextSchema(200),
  edition: canonicalOptionalTextSchema(200),
  sourceNote: canonicalOptionalTextSchema(2_000),
  fileName: canonicalShortTextSchema(255),
  format: z.enum(["markdown", "text"]),
  byteSize: z.number().int().positive().max(2 * 1024 * 1024),
  content: normalizedKnowledgeContentSchema,
  contentHash: sha256Schema,
  lineCount: z.number().int().positive(),
  sections: z.array(knowledgeSectionSchema).min(1).max(5_000),
  editVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).superRefine((value, context) => {
  const actualLineCount = value.content.split("\n").length;
  if (value.lineCount !== actualLineCount) {
    context.addIssue({ code: "custom", path: ["lineCount"], message: "lineCount 必须匹配规范化 content" });
  }
  const seenSectionIds = new Set<string>();
  value.sections.forEach((section, index) => {
    if (seenSectionIds.has(section.id)) {
      context.addIssue({ code: "custom", path: ["sections", index, "id"], message: "章节 ID 不能重复" });
    }
    seenSectionIds.add(section.id);
    const expectedStart = index === 0 ? 1 : value.sections[index - 1]!.endLine + 1;
    if (section.startLine !== expectedStart) {
      context.addIssue({ code: "custom", path: ["sections", index, "startLine"], message: "章节必须按行连续覆盖全文" });
    }
    if (section.endLine > value.lineCount) {
      context.addIssue({ code: "custom", path: ["sections", index, "endLine"], message: "章节行号不能超过 lineCount" });
    }
  });
  if (value.sections.at(-1)?.endLine !== value.lineCount) {
    context.addIssue({ code: "custom", path: ["sections"], message: "章节必须覆盖到资料最后一行" });
  }
  if (value.updatedAt < value.createdAt) {
    context.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt 不能早于 createdAt" });
  }
});

/** Frozen KnowledgeDocument shape used only to verify signed full-backup v0.3 envelopes. */
export const knowledgeDocumentV03RecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  recordType: z.literal("user_knowledge_document"),
  title: canonicalShortTextSchema(300),
  author: canonicalOptionalTextSchema(200),
  edition: canonicalOptionalTextSchema(200),
  sourceNote: canonicalOptionalTextSchema(2_000),
  fileName: canonicalShortTextSchema(255),
  format: z.enum(["markdown", "text"]),
  rightsStatus: z.literal("user_provided_unverified"),
  byteSize: z.number().int().positive().max(2 * 1024 * 1024),
  content: normalizedKnowledgeContentSchema,
  contentHash: sha256Schema,
  lineCount: z.number().int().positive(),
  sections: z.array(knowledgeSectionSchema).min(1).max(5_000),
  editVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).superRefine((value, context) => {
  if (value.lineCount !== value.content.split("\n").length) {
    context.addIssue({ code: "custom", path: ["lineCount"], message: "lineCount 必须匹配规范化 content" });
  }
  const seenSectionIds = new Set<string>();
  value.sections.forEach((section, index) => {
    if (seenSectionIds.has(section.id)) {
      context.addIssue({ code: "custom", path: ["sections", index, "id"], message: "章节 ID 不能重复" });
    }
    seenSectionIds.add(section.id);
    const expectedStart = index === 0 ? 1 : value.sections[index - 1]!.endLine + 1;
    if (section.startLine !== expectedStart) {
      context.addIssue({ code: "custom", path: ["sections", index, "startLine"], message: "章节必须按行连续覆盖全文" });
    }
    if (section.endLine > value.lineCount) {
      context.addIssue({ code: "custom", path: ["sections", index, "endLine"], message: "章节行号不能超过 lineCount" });
    }
  });
  if (value.sections.at(-1)?.endLine !== value.lineCount) {
    context.addIssue({ code: "custom", path: ["sections"], message: "章节必须覆盖到资料最后一行" });
  }
  if (value.updatedAt < value.createdAt) {
    context.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt 不能早于 createdAt" });
  }
});

export const SOURCE_RIGHTS_SCHEMA_VERSION = "1.0.0" as const;

export const reviewAttestationSchema = z.strictObject({
  reviewerId: canonicalShortTextSchema(120),
  reviewedAt: z.string().datetime(),
  note: z.string().max(2_000)
});

export const sourceRightsRecordSchema = z.strictObject({
  schemaVersion: z.literal(SOURCE_RIGHTS_SCHEMA_VERSION),
  recordType: z.literal("knowledge_source_rights"),
  documentId: z.string().uuid(),
  documentContentHash: sha256Schema,
  origin: z.enum(["user_import", "bundled"]),
  source: z.strictObject({
    sourceUrl: z.string().url().max(2_000).nullable(),
    publisher: z.string().max(300),
    publicationYear: z.number().int().min(1).max(9_999).nullable(),
    acquiredAt: z.string().datetime().nullable()
  }),
  rights: z.strictObject({
    status: z.enum([
      "user_unverified",
      "public_domain_verified",
      "licensed_verified",
      "project_original_verified",
      "blocked"
    ]),
    workStatus: z.enum([
      "unknown",
      "public_domain_verified",
      "copyrighted",
      "project_original_verified"
    ]),
    editionStatus: z.enum([
      "unknown",
      "public_domain_verified",
      "licensed_verified",
      "project_original_verified",
      "copyrighted"
    ]),
    basis: z.enum([
      "user_declaration",
      "public_domain",
      "spdx_license",
      "written_permission",
      "project_authored",
      "unknown"
    ]),
    jurisdiction: z.string().min(1).max(200).nullable(),
    licenseId: z.string().min(1).max(200).nullable(),
    copyrightNotice: z.string().max(2_000),
    evidenceRefs: z.array(z.string().url().max(2_000)).max(100),
    distributionPolicy: z.enum(["local_private_only", "redistributable"])
  }),
  review: z.strictObject({
    status: z.enum(["unreviewed", "single_reviewed", "double_reviewed"]),
    attestations: z.array(reviewAttestationSchema).max(20),
    note: z.string().max(4_000)
  }),
  editVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).superRefine((value, context) => {
  if (value.updatedAt < value.createdAt) {
    context.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt 不能早于 createdAt" });
  }
  const reviewers = new Set(value.review.attestations.map((item) => item.reviewerId));
  if (reviewers.size !== value.review.attestations.length) {
    context.addIssue({ code: "custom", path: ["review", "attestations"], message: "同一复核身份不能重复签署" });
  }
  const expectedReviewStatus = reviewers.size >= 2 ? "double_reviewed" : reviewers.size === 1 ? "single_reviewed" : "unreviewed";
  if (value.review.status !== expectedReviewStatus) {
    context.addIssue({ code: "custom", path: ["review", "status"], message: "复核状态必须与不同复核身份数量一致" });
  }

  if (value.origin === "user_import") {
    const safeUserState = value.rights.status === "user_unverified"
      && value.rights.workStatus === "unknown"
      && value.rights.editionStatus === "unknown"
      && value.rights.basis === "user_declaration"
      && value.rights.distributionPolicy === "local_private_only"
      && value.review.status === "unreviewed";
    if (!safeUserState) {
      context.addIssue({ code: "custom", path: ["origin"], message: "用户导入只能保持未核验、仅本机且未复核状态" });
    }
  }

  if (value.rights.status === "blocked" && value.rights.distributionPolicy !== "local_private_only") {
    context.addIssue({ code: "custom", path: ["rights", "distributionPolicy"], message: "受阻资料不能公开分发" });
  }

  if (value.origin === "bundled") {
    const workClear = value.rights.workStatus === "public_domain_verified"
      || value.rights.workStatus === "project_original_verified";
    const editionClear = value.rights.editionStatus === "public_domain_verified"
      || value.rights.editionStatus === "licensed_verified"
      || value.rights.editionStatus === "project_original_verified";
    const overallClear = value.rights.status === "public_domain_verified"
      || value.rights.status === "licensed_verified"
      || value.rights.status === "project_original_verified";
    if (!workClear || !editionClear || !overallClear
      || value.rights.distributionPolicy !== "redistributable"
      || value.review.status !== "double_reviewed"
      || value.rights.evidenceRefs.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["rights"],
        message: "随包资料必须分别核清作品与现代版本权利、允许再分发并完成双人复核"
      });
    }
  }

  if (value.rights.status === "public_domain_verified") {
    if (value.rights.basis !== "public_domain" || !value.rights.jurisdiction || value.rights.evidenceRefs.length === 0) {
      context.addIssue({ code: "custom", path: ["rights", "status"], message: "公版核验必须记录司法辖区、依据和证据链接" });
    }
  }
  if (value.rights.status === "licensed_verified") {
    const licensedBasis = value.rights.basis === "spdx_license" || value.rights.basis === "written_permission";
    if (!licensedBasis || (!value.rights.licenseId && !value.rights.copyrightNotice) || value.rights.evidenceRefs.length === 0) {
      context.addIssue({ code: "custom", path: ["rights", "status"], message: "许可核验必须记录许可依据、标识或版权说明以及证据链接" });
    }
  }
});

export const evidenceSubjectIdSchema = z.string().regex(/^[a-z][A-Za-z0-9.-]{2,159}$/);

export const citationTargetSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("research_note"), noteId: z.string().uuid() }),
  z.strictObject({ kind: z.literal("event"), eventId: z.string().uuid() }),
  z.strictObject({
    kind: z.literal("chart_field"),
    caseId: z.string().uuid(),
    revisionId: z.string().uuid(),
    field: z.string().regex(/^pillars\.(year|month|day|hour)\.[A-Za-z][A-Za-z0-9_.-]{0,79}$/)
  }),
  z.strictObject({ kind: z.literal("evidence_subject"), subjectId: evidenceSubjectIdSchema })
]);

/** Frozen Citation target shape used only by full-backup v0.3 verification. */
export const citationTargetV03Schema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("research_note"), noteId: z.string().uuid() }),
  z.strictObject({ kind: z.literal("event"), eventId: z.string().uuid() }),
  z.strictObject({
    kind: z.literal("chart_field"),
    caseId: z.string().uuid(),
    revisionId: z.string().uuid(),
    field: z.string().regex(/^pillars\.(year|month|day|hour)\.[A-Za-z][A-Za-z0-9_.-]{0,79}$/)
  })
]);

export const citationLocatorSchema = z.strictObject({
  sectionId: knowledgeSectionIdSchema,
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive()
}).superRefine((value, context) => {
  if (value.endLine < value.startLine) {
    context.addIssue({ code: "custom", path: ["endLine"], message: "引用结束行不能早于起始行" });
  }
  if (value.endLine - value.startLine + 1 > 200) {
    context.addIssue({ code: "custom", path: ["endLine"], message: "单条引用不能超过 200 行" });
  }
});

export function citationTargetKey(target: z.infer<typeof citationTargetSchema>): string {
  if (target.kind === "research_note") return `research_note:${target.noteId}`;
  if (target.kind === "event") return `event:${target.eventId}`;
  if (target.kind === "chart_field") return `chart_field:${target.caseId}:${target.revisionId}:${target.field}`;
  return `evidence_subject:${target.subjectId}`;
}

export function citationTargetKeys(targets: readonly z.infer<typeof citationTargetSchema>[]): string[] {
  return targets.map(citationTargetKey).sort();
}

export const citationRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  documentContentHash: sha256Schema,
  locator: citationLocatorSchema,
  quote: z
    .string()
    .min(1)
    .max(20_000)
    .refine((value) => !value.includes("\r"), "引用原文只能使用 LF 换行")
    .refine((value) => !value.includes("\0"), "引用原文不能包含 NUL 控制字符")
    .refine((value) => value.trim().length > 0, "引用原文不能为空"),
  annotation: z.string().max(20_000),
  targets: z
    .array(citationTargetSchema)
    .min(1)
    .max(100)
    .refine(
      (targets) => new Set(targets.map(citationTargetKey)).size === targets.length,
      "引用目标不能重复"
    ),
  targetKeys: z.array(z.string().min(1).max(500)).min(1).max(100),
  status: z.enum(["user_candidate", "verified", "rejected"]),
  reviewAttestations: z.array(reviewAttestationSchema).max(20),
  decisionNote: z.string().max(4_000),
  editVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).superRefine((value, context) => {
  if (value.updatedAt < value.createdAt) {
    context.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt 不能早于 createdAt" });
  }
  const expectedTargetKeys = citationTargetKeys(value.targets);
  if (JSON.stringify(value.targetKeys) !== JSON.stringify(expectedTargetKeys)) {
    context.addIssue({ code: "custom", path: ["targetKeys"], message: "targetKeys 必须由 targets 确定性生成并排序" });
  }
  const reviewers = new Set(value.reviewAttestations.map((item) => item.reviewerId));
  if (reviewers.size !== value.reviewAttestations.length) {
    context.addIssue({ code: "custom", path: ["reviewAttestations"], message: "同一复核身份不能重复签署" });
  }
  if (value.status === "verified" && (reviewers.size < 2 || !value.decisionNote.trim())) {
    context.addIssue({ code: "custom", path: ["status"], message: "已核验引用必须有两个不同复核身份和裁定说明" });
  }
  if (value.status === "rejected" && !value.decisionNote.trim()) {
    context.addIssue({ code: "custom", path: ["decisionNote"], message: "拒绝引用必须记录原因" });
  }
});

function citationTargetV03Key(target: z.infer<typeof citationTargetV03Schema>): string {
  if (target.kind === "research_note") return `research_note:${target.noteId}`;
  if (target.kind === "event") return `event:${target.eventId}`;
  return `chart_field:${target.caseId}:${target.revisionId}:${target.field}`;
}

/** Frozen Citation shape used only to verify signed full-backup v0.3 envelopes. */
export const citationV03RecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  documentContentHash: sha256Schema,
  locator: citationLocatorSchema,
  quote: z.string().min(1).max(20_000)
    .refine((value) => !value.includes("\r"), "引用原文只能使用 LF 换行")
    .refine((value) => !value.includes("\0"), "引用原文不能包含 NUL 控制字符")
    .refine((value) => value.trim().length > 0, "引用原文不能为空"),
  annotation: z.string().max(20_000),
  targets: z.array(citationTargetV03Schema).min(1).max(100).refine(
    (targets) => new Set(targets.map(citationTargetV03Key)).size === targets.length,
    "引用目标不能重复"
  ),
  status: z.literal("user_candidate"),
  editVersion: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).refine((value) => value.updatedAt >= value.createdAt, {
  path: ["updatedAt"],
  message: "updatedAt 不能早于 createdAt"
});

/**
 * A durable wrapper for one complete unknown-hour candidate result. The
 * storage layer computes snapshotDigest from the canonical candidateSet; this
 * synchronous contract only validates the persisted digest representation.
 */
const legacyCandidateSetRecordV1Shape = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordType: z.literal("unknown_hour_candidate_set"),
  id: z.string().uuid(),
  alias: canonicalShortTextSchema(80),
  tags: caseTagsSchema,
  notes: z.string().max(20_000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  candidateSet: unknownHourCandidateResultSchema,
  snapshotDigest: unknownHourSha256Schema
} as const;

/** Frozen CandidateSet outer record stored by Dexie v3-v6 and backup formats v0.2-v0.4. */
export const legacyCandidateSetRecordV1Schema = z.strictObject(legacyCandidateSetRecordV1Shape).refine(
  (value) => value.updatedAt >= value.createdAt,
  {
    path: ["updatedAt"],
    message: "updatedAt must not precede createdAt"
  }
);

export const candidateSetRecordSchema = z.strictObject({
  ...legacyCandidateSetRecordV1Shape,
  recordVersion: z.literal(RESEARCH_SUBJECT_RECORD_VERSION),
  favorite: z.boolean(),
  deletedAt: z.string().datetime().nullable()
}).superRefine((value, context) => {
  if (value.updatedAt < value.createdAt) {
    context.addIssue({
      code: "custom",
      path: ["updatedAt"],
      message: "updatedAt must not precede createdAt"
    });
  }
  if (value.deletedAt !== null && value.deletedAt > value.updatedAt) {
    context.addIssue({
      code: "custom",
      path: ["deletedAt"],
      message: "deletedAt must not follow updatedAt"
    });
  }
});

export type LegacyCandidateSetRecordV1 = z.infer<typeof legacyCandidateSetRecordV1Schema>;
export type CandidateSetRecord = z.infer<typeof candidateSetRecordSchema>;
export type ResearchSubjectRecord = z.infer<typeof caseRecordSchema> | CandidateSetRecord;

export function isCandidateSetRecord(record: ResearchSubjectRecord): record is CandidateSetRecord {
  return "recordType" in record && record.recordType === "unknown_hour_candidate_set";
}

export const candidateSetTzdbMigrationEndpointSchema = z.strictObject({
  kind: z.literal("candidate_set"),
  recordId: z.string().uuid(),
  snapshotDigest: unknownHourSha256Schema,
  resultHash: unknownHourSha256Schema,
  tzdbVersion: tzdbVersionSchema
});

export const LEGACY_CANDIDATE_SET_TZDB_CHANGED_FIELDS = [
  "status",
  "time_resolution_kind",
  "unresolved_reason",
  "variant_choices",
  "variant_instants",
  "variant_offsets",
  "four_pillars"
] as const;

export const CANDIDATE_SET_TZDB_CHANGED_FIELDS = [
  "status",
  "time_resolution_kind",
  "time_resolution_candidates",
  "time_resolution_fingerprint",
  "unresolved_reason",
  "variant_choices",
  "variant_instants",
  "variant_offsets",
  "four_pillars"
] as const;

export const legacyCandidateSetTzdbProbeDiffChangedFieldSchema = z.enum(
  LEGACY_CANDIDATE_SET_TZDB_CHANGED_FIELDS
);
export const candidateSetTzdbProbeDiffChangedFieldSchema = z.enum(CANDIDATE_SET_TZDB_CHANGED_FIELDS);
export const candidateSetTzdbProbeStatusSchema = z.enum([
  "calculated",
  "requires_user_time_resolution",
  "unresolved"
]);

export const legacyCandidateSetTzdbProbeDiffSchema = z.strictObject({
  candidateId: unknownHourProbeCandidateIdSchema,
  sourceStatus: candidateSetTzdbProbeStatusSchema,
  targetStatus: candidateSetTzdbProbeStatusSchema,
  behaviorChanged: z.boolean(),
  hashChanged: z.boolean(),
  changedFields: z.array(legacyCandidateSetTzdbProbeDiffChangedFieldSchema)
    .max(LEGACY_CANDIDATE_SET_TZDB_CHANGED_FIELDS.length)
}).superRefine((value, context) => {
  const expectedBehaviorChanged = value.changedFields.length > 0;
  if (value.behaviorChanged !== expectedBehaviorChanged) {
    context.addIssue({
      code: "custom",
      path: ["behaviorChanged"],
      message: "behaviorChanged 必须与 changedFields 是否非空一致"
    });
  }
  if (value.behaviorChanged && !value.hashChanged) {
    context.addIssue({
      code: "custom",
      path: ["hashChanged"],
      message: "行为差异必须同时导致候选摘要变化"
    });
  }
  const canonicalFields = LEGACY_CANDIDATE_SET_TZDB_CHANGED_FIELDS.filter((field) =>
    value.changedFields.includes(field)
  );
  if (!hasExactJsonStructure(value.changedFields, canonicalFields)) {
    context.addIssue({
      code: "custom",
      path: ["changedFields"],
      message: "changedFields 必须去重并按契约定义顺序保存"
    });
  }
});

export const candidateSetTzdbResolutionFingerprintSchema = z.strictObject({
  kind: z.enum(["unique", "overlap", "gap"]),
  policy: dstDisambiguationPolicySchema,
  status: z.enum([
    "resolved_unique",
    "resolved_overlap_earlier",
    "resolved_overlap_later",
    "rejected_overlap",
    "shifted_gap_earlier",
    "shifted_gap_later",
    "rejected_gap"
  ]),
  requestedWallTime: z.string(),
  candidates: z.array(timeZoneCandidateSchema.strict()).min(1).max(2),
  selectedCandidate: timeZoneCandidateSchema.strict().nullable()
}).superRefine((value, context) => {
  const expectedChoices = value.kind === "unique" ? ["unique"] : ["earlier", "later"];
  const actualChoices = value.candidates.map((candidate) => candidate.choice);
  if (!hasExactJsonStructure(actualChoices, expectedChoices)) {
    context.addIssue({
      code: "custom",
      path: ["candidates"],
      message: "resolution fingerprint candidates must use canonical unique or earlier/later order"
    });
  }
  if (value.selectedCandidate !== null) {
    const selected = value.candidates.find((candidate) => candidate.choice === value.selectedCandidate?.choice);
    if (!selected || !hasExactJsonStructure(selected, value.selectedCandidate)) {
      context.addIssue({
        code: "custom",
        path: ["selectedCandidate"],
        message: "resolution fingerprint selectedCandidate must equal one canonical candidate"
      });
    }
  }
});

export const candidateSetTzdbProbeDiffV2Schema = z.strictObject({
  candidateId: unknownHourProbeCandidateIdSchema,
  sourceStatus: candidateSetTzdbProbeStatusSchema,
  targetStatus: candidateSetTzdbProbeStatusSchema,
  sourceResolutionFingerprint: candidateSetTzdbResolutionFingerprintSchema,
  targetResolutionFingerprint: candidateSetTzdbResolutionFingerprintSchema,
  behaviorChanged: z.boolean(),
  hashChanged: z.boolean(),
  changedFields: z.array(candidateSetTzdbProbeDiffChangedFieldSchema).max(CANDIDATE_SET_TZDB_CHANGED_FIELDS.length)
}).superRefine((value, context) => {
  const changedFields = new Set(value.changedFields);
  if (value.behaviorChanged !== (value.changedFields.length > 0)) {
    context.addIssue({
      code: "custom",
      path: ["behaviorChanged"],
      message: "behaviorChanged must equal whether changedFields is non-empty"
    });
  }
  if (value.behaviorChanged && !value.hashChanged) {
    context.addIssue({
      code: "custom",
      path: ["hashChanged"],
      message: "a behavioral difference must also change the candidate digest"
    });
  }
  const canonicalFields = CANDIDATE_SET_TZDB_CHANGED_FIELDS.filter((field) => changedFields.has(field));
  if (!hasExactJsonStructure(value.changedFields, canonicalFields)) {
    context.addIssue({
      code: "custom",
      path: ["changedFields"],
      message: "changedFields must be unique and use canonical contract order"
    });
  }
  const requiredFlags = [
    ["status", value.sourceStatus !== value.targetStatus],
    ["time_resolution_kind", value.sourceResolutionFingerprint.kind !== value.targetResolutionFingerprint.kind],
    [
      "time_resolution_candidates",
      !hasExactJsonStructure(
        value.sourceResolutionFingerprint.candidates,
        value.targetResolutionFingerprint.candidates
      )
    ],
    [
      "time_resolution_fingerprint",
      !hasExactJsonStructure(value.sourceResolutionFingerprint, value.targetResolutionFingerprint)
    ]
  ] as const;
  for (const [field, required] of requiredFlags) {
    if (changedFields.has(field) !== required) {
      context.addIssue({
        code: "custom",
        path: ["changedFields"],
        message: `${field} must exactly reflect its bound source/target values`
      });
    }
  }
});

export const candidateSetTzdbProbeDiffSchema = z.union([
  legacyCandidateSetTzdbProbeDiffSchema,
  candidateSetTzdbProbeDiffV2Schema
]);

export const candidateSetTzdbComparisonIdentitySchema = z.strictObject({
  tzdbVersion: tzdbVersionSchema,
  resultHash: unknownHourSha256Schema
});

export const legacyCandidateSetTzdbComparisonSchema = z.strictObject({
  formatVersion: z.literal(LEGACY_CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION),
  source: candidateSetTzdbComparisonIdentitySchema,
  target: candidateSetTzdbComparisonIdentitySchema,
  probeDiffs: z.array(legacyCandidateSetTzdbProbeDiffSchema).length(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length),
  behaviorChangedCount: z.number().int().nonnegative().max(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length),
  hashOnlyChangedCount: z.number().int().nonnegative().max(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length),
  unchangedCount: z.number().int().nonnegative().max(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length)
}).superRefine((value, context) => {
  value.probeDiffs.forEach((probe, index) => {
    if (probe.candidateId !== UNKNOWN_HOUR_PROBE_CANDIDATE_IDS[index]) {
      context.addIssue({
        code: "custom",
        path: ["probeDiffs", index, "candidateId"],
        message: "probeDiffs 必须与版本化未知时辰探针顺序完全一致"
      });
    }
  });
  const behaviorChangedCount = value.probeDiffs.filter((probe) => probe.behaviorChanged).length;
  const hashOnlyChangedCount = value.probeDiffs.filter((probe) => !probe.behaviorChanged && probe.hashChanged).length;
  const unchangedCount = value.probeDiffs.filter((probe) => !probe.behaviorChanged && !probe.hashChanged).length;
  for (const [field, expected] of [
    ["behaviorChangedCount", behaviorChangedCount],
    ["hashOnlyChangedCount", hashOnlyChangedCount],
    ["unchangedCount", unchangedCount]
  ] as const) {
    if (value[field] !== expected) {
      context.addIssue({
        code: "custom",
        path: [field],
        message: `${field} 必须与 13 个 probeDiffs 的分类结果一致`
      });
    }
  }
  if (value.behaviorChangedCount + value.hashOnlyChangedCount + value.unchangedCount !== UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length) {
    context.addIssue({
      code: "custom",
      path: ["behaviorChangedCount"],
      message: "CandidateSet tzdb 比较计数必须完整覆盖 13 个探针"
    });
  }
});

export const candidateSetTzdbComparisonV2Schema = z.strictObject({
  formatVersion: z.literal(CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION),
  source: candidateSetTzdbComparisonIdentitySchema,
  target: candidateSetTzdbComparisonIdentitySchema,
  probeDiffs: z.array(candidateSetTzdbProbeDiffV2Schema).length(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length),
  behaviorChangedCount: z.number().int().nonnegative().max(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length),
  hashOnlyChangedCount: z.number().int().nonnegative().max(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length),
  unchangedCount: z.number().int().nonnegative().max(UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length)
}).superRefine((value, context) => {
  value.probeDiffs.forEach((probe, index) => {
    if (probe.candidateId !== UNKNOWN_HOUR_PROBE_CANDIDATE_IDS[index]) {
      context.addIssue({
        code: "custom",
        path: ["probeDiffs", index, "candidateId"],
        message: "probeDiffs must exactly follow the versioned candidate order"
      });
    }
  });
  const behaviorChangedCount = value.probeDiffs.filter((probe) => probe.behaviorChanged).length;
  const hashOnlyChangedCount = value.probeDiffs.filter((probe) => !probe.behaviorChanged && probe.hashChanged).length;
  const unchangedCount = value.probeDiffs.filter((probe) => !probe.behaviorChanged && !probe.hashChanged).length;
  for (const [field, expected] of [
    ["behaviorChangedCount", behaviorChangedCount],
    ["hashOnlyChangedCount", hashOnlyChangedCount],
    ["unchangedCount", unchangedCount]
  ] as const) {
    if (value[field] !== expected) {
      context.addIssue({
        code: "custom",
        path: [field],
        message: `${field} must equal the 13-probe classification`
      });
    }
  }
  if (
    value.behaviorChangedCount + value.hashOnlyChangedCount + value.unchangedCount !==
    UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["behaviorChangedCount"],
      message: "CandidateSet tzdb comparison counts must cover all 13 probes"
    });
  }
});

export const candidateSetTzdbComparisonSchema = z.union([
  legacyCandidateSetTzdbComparisonSchema,
  candidateSetTzdbComparisonV2Schema
]);

export const legacyTzdbMigrationReceiptSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION),
  id: z.string().uuid(),
  operation: z.literal("candidate_set_tzdb_recalculation"),
  source: candidateSetTzdbMigrationEndpointSchema,
  target: candidateSetTzdbMigrationEndpointSchema,
  comparison: legacyCandidateSetTzdbComparisonSchema,
  comparisonDigest: unknownHourSha256Schema,
  createdAt: z.string().datetime()
}).superRefine((value, context) => {
  for (const field of ["recordId", "snapshotDigest", "resultHash", "tzdbVersion"] as const) {
    if (value.source[field] === value.target[field]) {
      context.addIssue({
        code: "custom",
        path: ["target", field],
        message: `tzdb 重算回执的 source/target ${field} 必须不同`
      });
    }
  }
  for (const side of ["source", "target"] as const) {
    for (const field of ["tzdbVersion", "resultHash"] as const) {
      if (value.comparison[side][field] !== value[side][field]) {
        context.addIssue({
          code: "custom",
          path: ["comparison", side, field],
          message: `comparison.${side}.${field} 必须与回执 ${side} 端点一致`
        });
      }
    }
  }
});

export const tzdbMigrationReceiptV2Schema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(TZDB_MIGRATION_RECEIPT_RECORD_VERSION),
  id: z.string().uuid(),
  operation: z.literal("candidate_set_tzdb_recalculation"),
  source: candidateSetTzdbMigrationEndpointSchema,
  target: candidateSetTzdbMigrationEndpointSchema,
  comparison: candidateSetTzdbComparisonV2Schema,
  comparisonDigest: unknownHourSha256Schema,
  createdAt: z.string().datetime()
}).superRefine((value, context) => {
  for (const field of ["recordId", "snapshotDigest", "resultHash", "tzdbVersion"] as const) {
    if (value.source[field] === value.target[field]) {
      context.addIssue({
        code: "custom",
        path: ["target", field],
        message: `tzdb derivation source/target ${field} must differ`
      });
    }
  }
  for (const side of ["source", "target"] as const) {
    for (const field of ["tzdbVersion", "resultHash"] as const) {
      if (value.comparison[side][field] !== value[side][field]) {
        context.addIssue({
          code: "custom",
          path: ["comparison", side, field],
          message: `comparison.${side}.${field} must equal the receipt endpoint`
        });
      }
    }
  }
});

export const tzdbMigrationReceiptSchema = z.union([
  legacyTzdbMigrationReceiptSchema,
  tzdbMigrationReceiptV2Schema
]);

export type CandidateSetTzdbMigrationEndpoint = z.infer<typeof candidateSetTzdbMigrationEndpointSchema>;
export type CandidateSetTzdbProbeStatus = z.infer<typeof candidateSetTzdbProbeStatusSchema>;
export type CandidateSetTzdbProbeDiffChangedField = z.infer<typeof candidateSetTzdbProbeDiffChangedFieldSchema>;
export type CandidateSetTzdbProbeDiff = z.infer<typeof candidateSetTzdbProbeDiffSchema>;
export type CandidateSetTzdbResolutionFingerprint = z.infer<typeof candidateSetTzdbResolutionFingerprintSchema>;
export type CandidateSetTzdbComparisonIdentity = z.infer<typeof candidateSetTzdbComparisonIdentitySchema>;
export type CandidateSetTzdbComparison = z.infer<typeof candidateSetTzdbComparisonSchema>;
export type LegacyCandidateSetTzdbComparison = z.infer<typeof legacyCandidateSetTzdbComparisonSchema>;
export type CandidateSetTzdbComparisonV2 = z.infer<typeof candidateSetTzdbComparisonV2Schema>;
export type LegacyTzdbMigrationReceipt = z.infer<typeof legacyTzdbMigrationReceiptSchema>;
export type TzdbMigrationReceipt = z.infer<typeof tzdbMigrationReceiptSchema>;

const LOCAL_ATTACHMENT_BASE64_MAX_CHARACTERS = 4 * Math.ceil(MAX_LOCAL_ATTACHMENT_BYTES / 3);
const canonicalBase64TextSchema = z
  .string()
  .max(LOCAL_ATTACHMENT_BASE64_MAX_CHARACTERS)
  .regex(
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    "contentBase64 must be canonical padded standard Base64 without whitespace"
  )
  .refine((value) => {
    if (value.length === 0 || !value.endsWith("=")) return true;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const padding = value.endsWith("==") ? 2 : 1;
    const finalDataCharacter = value[value.length - padding - 1];
    const sextet = alphabet.indexOf(finalDataCharacter ?? "");
    return sextet >= 0 && (padding === 2 ? sextet % 16 === 0 : sextet % 4 === 0);
  }, "contentBase64 has non-zero padding bits and is not canonical");

const localAttachmentFileNameSchema = canonicalShortTextSchema(255)
  .refine(
    (value) => !/[\\/\p{Cc}\p{Cf}]/u.test(value),
    "fileName must not contain paths, control characters, or invisible formatting controls"
  )
  .refine((value) => value !== "." && value !== "..", "fileName must name a file");

const localAttachmentMediaTypeSchema = z
  .string()
  .min(3)
  .max(255)
  .regex(
    /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/,
    "mediaType must be one canonical lowercase MIME type without parameters"
  );

export const localAttachmentLinkSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("research_subject"), subjectId: z.string().uuid() }),
  z.strictObject({ kind: z.literal("revision"), caseId: z.string().uuid(), revisionId: z.string().uuid() }),
  z.strictObject({ kind: z.literal("research_note"), noteId: z.string().uuid() }),
  z.strictObject({ kind: z.literal("event"), eventId: z.string().uuid() }),
  z.strictObject({ kind: z.literal("knowledge_document"), documentId: z.string().uuid() })
]);

export const localAttachmentRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(LOCAL_ATTACHMENT_RECORD_VERSION),
  recordType: z.literal("local_attachment"),
  id: z.string().uuid(),
  fileName: localAttachmentFileNameSchema,
  mediaType: localAttachmentMediaTypeSchema,
  byteLength: z.number().int().nonnegative().max(MAX_LOCAL_ATTACHMENT_BYTES),
  contentBase64: canonicalBase64TextSchema,
  contentHash: sha256Schema,
  description: canonicalOptionalTextSchema(2_000),
  link: localAttachmentLinkSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).superRefine((value, context) => {
  const padding = value.contentBase64.endsWith("==") ? 2 : value.contentBase64.endsWith("=") ? 1 : 0;
  const encodedByteLength = value.contentBase64.length === 0
    ? 0
    : value.contentBase64.length / 4 * 3 - padding;
  if (encodedByteLength !== value.byteLength) {
    context.addIssue({
      code: "custom",
      path: ["byteLength"],
      message: "byteLength must equal the byte length represented by contentBase64"
    });
  }
  if (value.updatedAt < value.createdAt) {
    context.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt must not precede createdAt" });
  }
});

export const localResearcherProfileRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(LOCAL_RESEARCHER_PROFILE_RECORD_VERSION),
  recordType: z.literal("local_researcher_profile"),
  id: z.literal(LOCAL_RESEARCHER_PROFILE_ID),
  displayName: canonicalShortTextSchema(80),
  organization: canonicalOptionalTextSchema(200),
  researchFocus: canonicalOptionalTextSchema(2_000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).refine((value) => value.updatedAt >= value.createdAt, {
  path: ["updatedAt"],
  message: "updatedAt must not precede createdAt"
});

export const localAppSettingsRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(LOCAL_APP_SETTINGS_RECORD_VERSION),
  recordType: z.literal("local_app_settings"),
  id: z.literal(LOCAL_APP_SETTINGS_ID),
  locale: z.literal("zh-CN"),
  defaultTimeZone: ianaTimeZoneSchema,
  defaultCalendarType: z.enum(["gregorian", "lunar"]),
  preferredDensity: z.enum(["comfortable", "compact"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).refine((value) => value.updatedAt >= value.createdAt, {
  path: ["updatedAt"],
  message: "updatedAt must not precede createdAt"
});

const sha256TextSchema = z.string().regex(/^[a-f0-9]{64}$/);
const appSemverTextSchema = z.string().regex(
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
);

/** Immutable, content-addressed JSON kept in the local rule-pack quarantine/library. */
export const installedRulePackRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(LOCAL_RULE_REGISTRY_RECORD_VERSION),
  recordType: z.literal("installed_rule_pack"),
  id: sha256TextSchema,
  packDigest: sha256TextSchema,
  profileDigest: sha256TextSchema,
  packId: z.string().regex(/^[a-z0-9-]+$/),
  profileId: z.string().regex(/^[a-z0-9-]+$/),
  profileVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  canonicalJson: z.string().min(2).max(2 * 1024 * 1024),
  localTrust: z.literal("unverified_local_import"),
  importedAt: z.string().datetime()
}).refine((value) => value.id === value.packDigest, {
  path: ["id"],
  message: "installed rule-pack id must equal its content digest"
});

/** Singleton local decision. Its presence is approval to calculate with one exact installed digest. */
export const activeRulePackRecordSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordVersion: z.literal(LOCAL_RULE_REGISTRY_RECORD_VERSION),
  recordType: z.literal("active_rule_pack"),
  id: z.literal(ACTIVE_RULE_PACK_RECORD_ID),
  activeDigest: sha256TextSchema,
  activeProfileDigest: sha256TextSchema,
  activatedAt: z.string().datetime(),
  approval: z.strictObject({
    status: z.literal("locally_approved_for_activation"),
    acknowledgedAt: z.string().datetime(),
    acknowledgementVersion: z.literal("rule-pack-local-approval@1"),
    appVersion: appSemverTextSchema,
    engineName: z.literal("hakimi-bazi-core"),
    engineVersion: z.string().min(1).max(80)
  })
}).refine((value) => value.approval.acknowledgedAt === value.activatedAt, {
  path: ["approval", "acknowledgedAt"],
  message: "activation approval timestamp must equal activatedAt"
});

export const localRuleRegistryRecordSchema = z.discriminatedUnion("recordType", [
  installedRulePackRecordSchema,
  activeRulePackRecordSchema
]);

export const CORE_BACKUP_FORMAT = "hakimi-bazi-core-backup" as const;
export const LEGACY_CORE_BACKUP_FORMAT_VERSION = "0.1.0" as const;
export const CORE_BACKUP_FORMAT_VERSION = "0.2.0" as const;
export const CORE_BACKUP_SCOPE = "cases-revisions-only-not-v1-full-backup" as const;
export const CORE_BACKUP_DIGEST_ALGORITHM = "sha256-canonical-json-v1" as const;

export const FULL_BACKUP_FORMAT = "hakimi-bazi-full-backup" as const;
export const LEGACY_FULL_BACKUP_FORMAT_VERSION = "0.1.0" as const;
export const PREVIOUS_FULL_BACKUP_FORMAT_VERSION = "0.2.0" as const;
export const KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION = "0.3.0" as const;
export const SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION = "0.4.0" as const;
export const LIFECYCLE_FULL_BACKUP_FORMAT_VERSION = "0.5.0" as const;
export const EVENT_TIME_FULL_BACKUP_FORMAT_VERSION = "0.6.0" as const;
export const SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION = "0.7.0" as const;
/** Frozen 12-partition local-user-data format written before the rule registry existed. */
export const LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION = "0.8.0" as const;
/** Frozen 13-partition format written after the rule registry and before tzdb migration receipts. */
export const RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION = "0.9.0" as const;
/** Frozen 14-partition format written after CandidateSet tzdb migration receipts. */
export const TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION = "1.0.0" as const;
/** Frozen 15-partition format written after Event time migration receipts. */
export const EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION = "1.1.0" as const;
/** Current 16-partition format including append-only Revision calculation receipts. */
export const FULL_BACKUP_FORMAT_VERSION = "1.2.0" as const;
/** Full means every user-data partition currently represented by the local data model. */
export const FULL_BACKUP_SCOPE = "current-modeled-data" as const;
export const FULL_BACKUP_DIGEST_ALGORITHM = "sha256-canonical-json-v1" as const;

export const REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION = "1.0.0" as const;
export const revisionCalculationReceiptCaptureKindSchema = z.enum([
  "revision_creation_baseline",
  "explicit_calculation_snapshot"
]);

/**
 * Storage/backup-facing receipt envelope. The projection is intentionally
 * opaque here because its exact executor-bound contract lives in
 * @hakimi/revision-replay; every persistence boundary must run that package's
 * deep integrity verifier before accepting this outer record.
 */
export const revisionCalculationReceiptRecordSchema = z.strictObject({
  schemaVersion: z.literal(REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION),
  recordType: z.literal("revision_calculation_receipt"),
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  captureKind: revisionCalculationReceiptCaptureKindSchema,
  requestFingerprint: sha256TextSchema,
  sourceRevision: z.strictObject({
    caseId: z.string().uuid(),
    revisionId: z.string().uuid(),
    revisionNumber: z.number().int().positive(),
    snapshotDigest: sha256TextSchema,
    natalResultHash: sha256TextSchema
  }),
  projection: z.custom<Record<string, unknown>>(
    (value) => typeof value === "object" && value !== null && !Array.isArray(value),
    { message: "Revision calculation receipt projection must be an object" }
  ),
  receiptDigest: sha256TextSchema
});

function hasExactJsonStructure(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length && left.every((value, index) => hasExactJsonStructure(value, right[index]));
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && hasExactJsonStructure(leftRecord[key], rightRecord[key]));
}

/** Rejects every value that the underlying application schema would trim, default, or strip. */
function exactStoredRecordSchema<Output>(schema: z.ZodType<Output>, label: string) {
  return z.unknown().transform((input, context): Output => {
    const result = schema.safeParse(input);
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
      return z.NEVER;
    }
    if (!hasExactJsonStructure(input, result.data)) {
      context.addIssue({
        code: "custom",
        message: `${label} 包含未知字段、缺少会被默认补齐的字段，或包含会被静默规范化的值`
      });
      return z.NEVER;
    }
    return result.data;
  });
}

export const coreBackupCaseRecordSchema = exactStoredRecordSchema(caseRecordSchema, "Case");
export const coreBackupRevisionRecordSchema = exactStoredRecordSchema(revisionRecordSchema, "Revision");
export const legacyCoreBackupCaseRecordSchema = exactStoredRecordSchema(legacyCaseRecordV1Schema, "Case v1");
const preRulePackBindingRevisionRecordSchema = z.object(preRulePackBindingRevisionRecordShape);
export const legacyCoreBackupRevisionRecordSchema = exactStoredRecordSchema(
  preRulePackBindingRevisionRecordSchema,
  "Revision without rule-pack binding"
);

export const legacyCoreBackupManifestSchema = z.strictObject({
  format: z.literal(CORE_BACKUP_FORMAT),
  formatVersion: z.literal(LEGACY_CORE_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(CORE_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(CORE_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative()
  })
});

export const legacyCoreBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const legacyCoreBackupPayloadSchema = z.strictObject({
  cases: z.array(legacyCoreBackupCaseRecordSchema),
  revisions: z.array(legacyCoreBackupRevisionRecordSchema)
});

export const legacyCoreBackupEnvelopeSchema = z.strictObject({
  manifest: legacyCoreBackupManifestSchema,
  digests: legacyCoreBackupDigestsSchema,
  payload: legacyCoreBackupPayloadSchema
});

export const coreBackupManifestSchema = z.strictObject({
  format: z.literal(CORE_BACKUP_FORMAT),
  formatVersion: z.literal(CORE_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(CORE_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(CORE_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative()
  })
});

export const coreBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const coreBackupPayloadSchema = z.strictObject({
  cases: z.array(coreBackupCaseRecordSchema),
  revisions: z.array(coreBackupRevisionRecordSchema)
});

export const coreBackupEnvelopeSchema = z.strictObject({
  manifest: coreBackupManifestSchema,
  digests: coreBackupDigestsSchema,
  payload: coreBackupPayloadSchema
});

export const fullBackupCaseRecordSchema = coreBackupCaseRecordSchema;
export const fullBackupRevisionRecordSchema = coreBackupRevisionRecordSchema;
export const legacyFullBackupCaseRecordSchema = legacyCoreBackupCaseRecordSchema;
export const legacyFullBackupRevisionRecordSchema = legacyCoreBackupRevisionRecordSchema;
export const fullBackupResearchNoteRecordSchema = exactStoredRecordSchema(researchNoteRecordSchema, "ResearchNote");
export const fullBackupEventRecordSchema = exactStoredRecordSchema(eventRecordSchema, "Event");
export const legacyFullBackupEventRecordSchema = exactStoredRecordSchema(legacyEventRecordV1Schema, "Event v1");
export const fullBackupSavedViewRecordSchema = exactStoredRecordSchema(savedViewRecordSchema, "SavedView");
export const legacyFullBackupSavedViewRecordSchema = exactStoredRecordSchema(
  legacySavedViewRecordV1Schema,
  "SavedView v1"
);
export const fullBackupCandidateSetRecordSchema = exactStoredRecordSchema(candidateSetRecordSchema, "CandidateSet");
export const legacyFullBackupCandidateSetRecordSchema = exactStoredRecordSchema(
  legacyCandidateSetRecordV1Schema,
  "CandidateSet v1"
);
export const fullBackupKnowledgeDocumentRecordSchema = exactStoredRecordSchema(
  knowledgeDocumentRecordSchema,
  "KnowledgeDocument"
);
export const fullBackupCitationRecordSchema = exactStoredRecordSchema(citationRecordSchema, "Citation");
export const fullBackupSourceRightsRecordSchema = exactStoredRecordSchema(sourceRightsRecordSchema, "SourceRights");
export const fullBackupAttachmentRecordSchema = exactStoredRecordSchema(
  localAttachmentRecordSchema,
  "LocalAttachment"
);
export const fullBackupResearcherProfileRecordSchema = exactStoredRecordSchema(
  localResearcherProfileRecordSchema,
  "LocalResearcherProfile"
);
export const fullBackupAppSettingsRecordSchema = exactStoredRecordSchema(
  localAppSettingsRecordSchema,
  "LocalAppSettings"
);
export const fullBackupRuleRegistryRecordSchema = exactStoredRecordSchema(
  localRuleRegistryRecordSchema,
  "LocalRuleRegistryRecord"
);
export const fullBackupTzdbMigrationReceiptRecordSchema = exactStoredRecordSchema(
  tzdbMigrationReceiptSchema,
  "TzdbMigrationReceipt"
);
export const fullBackupEventTimeMigrationReceiptRecordSchema = exactStoredRecordSchema(
  eventTimeMigrationReceiptSchema,
  "EventTimeMigrationReceipt"
);
export const fullBackupRevisionCalculationReceiptRecordSchema = exactStoredRecordSchema(
  revisionCalculationReceiptRecordSchema,
  "RevisionCalculationReceipt"
);
export const knowledgeFullBackupKnowledgeDocumentRecordSchema = exactStoredRecordSchema(
  knowledgeDocumentV03RecordSchema,
  "KnowledgeDocument v0.3"
);
export const knowledgeFullBackupCitationRecordSchema = exactStoredRecordSchema(
  citationV03RecordSchema,
  "Citation v0.3"
);

// Frozen copies of the lifecycle-era outer records. Do not replace these with
// aliases to the current Case/Candidate schemas: v0.5 signatures must remain
// verifiable even after those application records evolve again.
const lifecycleFullBackupCaseRecordV2Schema = exactStoredRecordSchema(
  z.strictObject({
    ...legacyCaseRecordV1Shape,
    recordVersion: z.literal(2),
    favorite: z.boolean(),
    deletedAt: z.string().datetime().nullable()
  }).refine((value) => value.deletedAt === null || value.deletedAt <= value.updatedAt, {
    path: ["deletedAt"],
    message: "deletedAt must not follow updatedAt"
  }),
  "Case v2"
);
const lifecycleFullBackupCandidateSetRecordV2Schema = exactStoredRecordSchema(
  z.strictObject({
    ...legacyCandidateSetRecordV1Shape,
    recordVersion: z.literal(2),
    favorite: z.boolean(),
    deletedAt: z.string().datetime().nullable()
  }).superRefine((value, context) => {
    if (value.updatedAt < value.createdAt) {
      context.addIssue({ code: "custom", path: ["updatedAt"], message: "updatedAt must not precede createdAt" });
    }
    if (value.deletedAt !== null && value.deletedAt > value.updatedAt) {
      context.addIssue({ code: "custom", path: ["deletedAt"], message: "deletedAt must not follow updatedAt" });
    }
  }),
  "CandidateSet v2"
);

export const legacyFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(LEGACY_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative()
  })
});

export const legacyFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const legacyFullBackupPayloadSchema = z.strictObject({
  cases: z.array(legacyFullBackupCaseRecordSchema),
  revisions: z.array(legacyFullBackupRevisionRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(legacyFullBackupEventRecordSchema),
  savedViews: z.array(legacyFullBackupSavedViewRecordSchema)
});

export const legacyFullBackupEnvelopeSchema = z.strictObject({
  manifest: legacyFullBackupManifestSchema,
  digests: legacyFullBackupDigestsSchema,
  payload: legacyFullBackupPayloadSchema
});

export const previousFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(PREVIOUS_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative()
  })
});

export const previousFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSets: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const previousFullBackupPayloadSchema = z.strictObject({
  cases: z.array(legacyFullBackupCaseRecordSchema),
  revisions: z.array(legacyFullBackupRevisionRecordSchema),
  candidateSets: z.array(legacyFullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(legacyFullBackupEventRecordSchema),
  savedViews: z.array(legacyFullBackupSavedViewRecordSchema)
});

export const previousFullBackupEnvelopeSchema = z.strictObject({
  manifest: previousFullBackupManifestSchema,
  digests: previousFullBackupDigestsSchema,
  payload: previousFullBackupPayloadSchema
});

/** Frozen v0.3 eight-partition envelope. Never extend this schema. */
export const knowledgeFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative()
  })
});

export const knowledgeFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSets: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  knowledgeDocuments: z.string().regex(/^[a-f0-9]{64}$/),
  citations: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const knowledgeFullBackupPayloadSchema = z.strictObject({
  cases: z.array(legacyFullBackupCaseRecordSchema),
  revisions: z.array(legacyFullBackupRevisionRecordSchema),
  candidateSets: z.array(legacyFullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(legacyFullBackupEventRecordSchema),
  savedViews: z.array(legacyFullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(knowledgeFullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(knowledgeFullBackupCitationRecordSchema)
});

export const knowledgeFullBackupEnvelopeSchema = z.strictObject({
  manifest: knowledgeFullBackupManifestSchema,
  digests: knowledgeFullBackupDigestsSchema,
  payload: knowledgeFullBackupPayloadSchema
});

/** Frozen v0.4 nine-partition envelope. Its research-subject outer records predate lifecycle fields. */
export const sourceRightsFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative()
  })
});

export const sourceRightsFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSets: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  knowledgeDocuments: z.string().regex(/^[a-f0-9]{64}$/),
  citations: z.string().regex(/^[a-f0-9]{64}$/),
  sourceRights: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const sourceRightsFullBackupPayloadSchema = z.strictObject({
  cases: z.array(legacyFullBackupCaseRecordSchema),
  revisions: z.array(legacyFullBackupRevisionRecordSchema),
  candidateSets: z.array(legacyFullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(legacyFullBackupEventRecordSchema),
  savedViews: z.array(legacyFullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema)
});

export const sourceRightsFullBackupEnvelopeSchema = z.strictObject({
  manifest: sourceRightsFullBackupManifestSchema,
  digests: sourceRightsFullBackupDigestsSchema,
  payload: sourceRightsFullBackupPayloadSchema
});

/** Frozen v0.5 nine-partition envelope: lifecycle Case/Candidate v2 plus Event v1. */
export const lifecycleFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(LIFECYCLE_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative()
  })
});

export const lifecycleFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSets: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  knowledgeDocuments: z.string().regex(/^[a-f0-9]{64}$/),
  citations: z.string().regex(/^[a-f0-9]{64}$/),
  sourceRights: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const lifecycleFullBackupPayloadSchema = z.strictObject({
  cases: z.array(lifecycleFullBackupCaseRecordV2Schema),
  revisions: z.array(legacyFullBackupRevisionRecordSchema),
  candidateSets: z.array(lifecycleFullBackupCandidateSetRecordV2Schema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(legacyFullBackupEventRecordSchema),
  savedViews: z.array(legacyFullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema)
});

export const lifecycleFullBackupEnvelopeSchema = z.strictObject({
  manifest: lifecycleFullBackupManifestSchema,
  digests: lifecycleFullBackupDigestsSchema,
  payload: lifecycleFullBackupPayloadSchema
});

/** Frozen v0.6 nine-partition envelope: Event v2 plus legacy SavedView v1. */
export const eventTimeFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(EVENT_TIME_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative()
  })
});

export const eventTimeFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSets: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  knowledgeDocuments: z.string().regex(/^[a-f0-9]{64}$/),
  citations: z.string().regex(/^[a-f0-9]{64}$/),
  sourceRights: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const eventTimeFullBackupPayloadSchema = z.strictObject({
  cases: z.array(lifecycleFullBackupCaseRecordV2Schema),
  revisions: z.array(legacyFullBackupRevisionRecordSchema),
  candidateSets: z.array(lifecycleFullBackupCandidateSetRecordV2Schema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(fullBackupEventRecordSchema),
  savedViews: z.array(legacyFullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema)
});

export const eventTimeFullBackupEnvelopeSchema = z.strictObject({
  manifest: eventTimeFullBackupManifestSchema,
  digests: eventTimeFullBackupDigestsSchema,
  payload: eventTimeFullBackupPayloadSchema
});

/**
 * Frozen outer contract for the nine-partition v0.7 full backup. Its committed
 * rich fixture contains every partition and catches record-shape drift. Some
 * unchanged nested record schemas still share source aliases with current v1
 * contracts; future changes must add historical copies instead of updating this
 * compatibility shape in place.
 */
export const savedViewFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative()
  })
});

export const savedViewFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSets: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  knowledgeDocuments: z.string().regex(/^[a-f0-9]{64}$/),
  citations: z.string().regex(/^[a-f0-9]{64}$/),
  sourceRights: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const savedViewFullBackupPayloadSchema = z.strictObject({
  cases: z.array(fullBackupCaseRecordSchema),
  revisions: z.array(legacyFullBackupRevisionRecordSchema),
  candidateSets: z.array(fullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(fullBackupEventRecordSchema),
  savedViews: z.array(fullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema)
});

export const savedViewFullBackupEnvelopeSchema = z.strictObject({
  manifest: savedViewFullBackupManifestSchema,
  digests: savedViewFullBackupDigestsSchema,
  payload: savedViewFullBackupPayloadSchema
});

/** Frozen v0.8 shape: exactly the twelve local-user-data partitions that existed in Dexie v10. */
export const localUserDataFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: appSemverTextSchema,
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative(),
    attachments: z.number().int().nonnegative(),
    researcherProfiles: z.number().int().nonnegative().max(1),
    appSettings: z.number().int().nonnegative().max(1)
  })
});

export const localUserDataFullBackupDigestsSchema = z.strictObject({
  cases: sha256TextSchema,
  revisions: sha256TextSchema,
  candidateSets: sha256TextSchema,
  researchNotes: sha256TextSchema,
  events: sha256TextSchema,
  savedViews: sha256TextSchema,
  knowledgeDocuments: sha256TextSchema,
  citations: sha256TextSchema,
  sourceRights: sha256TextSchema,
  attachments: sha256TextSchema,
  researcherProfiles: sha256TextSchema,
  appSettings: sha256TextSchema,
  payload: sha256TextSchema,
  envelope: sha256TextSchema
});

export const localUserDataFullBackupPayloadSchema = z.strictObject({
  cases: z.array(fullBackupCaseRecordSchema),
  revisions: z.array(legacyFullBackupRevisionRecordSchema),
  candidateSets: z.array(fullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(fullBackupEventRecordSchema),
  savedViews: z.array(fullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema),
  attachments: z.array(fullBackupAttachmentRecordSchema),
  researcherProfiles: z.array(fullBackupResearcherProfileRecordSchema).max(1),
  appSettings: z.array(fullBackupAppSettingsRecordSchema).max(1)
});

export const localUserDataFullBackupEnvelopeSchema = z.strictObject({
  manifest: localUserDataFullBackupManifestSchema,
  digests: localUserDataFullBackupDigestsSchema,
  payload: localUserDataFullBackupPayloadSchema
});

/** Frozen v0.9 thirteen-partition envelope. Never add receipt fields to these schemas. */
export const ruleRegistryFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative(),
    attachments: z.number().int().nonnegative(),
    researcherProfiles: z.number().int().nonnegative().max(1),
    appSettings: z.number().int().nonnegative().max(1),
    ruleRegistry: z.number().int().nonnegative()
  })
});

export const ruleRegistryFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSets: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  knowledgeDocuments: z.string().regex(/^[a-f0-9]{64}$/),
  citations: z.string().regex(/^[a-f0-9]{64}$/),
  sourceRights: z.string().regex(/^[a-f0-9]{64}$/),
  attachments: z.string().regex(/^[a-f0-9]{64}$/),
  researcherProfiles: z.string().regex(/^[a-f0-9]{64}$/),
  appSettings: z.string().regex(/^[a-f0-9]{64}$/),
  ruleRegistry: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const ruleRegistryFullBackupPayloadSchema = z.strictObject({
  cases: z.array(fullBackupCaseRecordSchema),
  revisions: z.array(fullBackupRevisionRecordSchema),
  candidateSets: z.array(fullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(fullBackupEventRecordSchema),
  savedViews: z.array(fullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema),
  attachments: z.array(fullBackupAttachmentRecordSchema),
  researcherProfiles: z.array(fullBackupResearcherProfileRecordSchema).max(1),
  appSettings: z.array(fullBackupAppSettingsRecordSchema).max(1),
  ruleRegistry: z.array(fullBackupRuleRegistryRecordSchema)
});

export const ruleRegistryFullBackupEnvelopeSchema = z.strictObject({
  manifest: ruleRegistryFullBackupManifestSchema,
  digests: ruleRegistryFullBackupDigestsSchema,
  payload: ruleRegistryFullBackupPayloadSchema
});

/** Frozen v1.0 fourteen-partition envelope. Never add Event receipt fields to these schemas. */
export const tzdbMigrationFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative(),
    attachments: z.number().int().nonnegative(),
    researcherProfiles: z.number().int().nonnegative().max(1),
    appSettings: z.number().int().nonnegative().max(1),
    ruleRegistry: z.number().int().nonnegative(),
    tzdbMigrationReceipts: z.number().int().nonnegative()
  })
});

export const tzdbMigrationFullBackupDigestsSchema = z.strictObject({
  cases: sha256TextSchema,
  revisions: sha256TextSchema,
  candidateSets: sha256TextSchema,
  researchNotes: sha256TextSchema,
  events: sha256TextSchema,
  savedViews: sha256TextSchema,
  knowledgeDocuments: sha256TextSchema,
  citations: sha256TextSchema,
  sourceRights: sha256TextSchema,
  attachments: sha256TextSchema,
  researcherProfiles: sha256TextSchema,
  appSettings: sha256TextSchema,
  ruleRegistry: sha256TextSchema,
  tzdbMigrationReceipts: sha256TextSchema,
  payload: sha256TextSchema,
  envelope: sha256TextSchema
});

export const tzdbMigrationFullBackupPayloadSchema = z.strictObject({
  cases: z.array(fullBackupCaseRecordSchema),
  revisions: z.array(fullBackupRevisionRecordSchema),
  candidateSets: z.array(fullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(fullBackupEventRecordSchema),
  savedViews: z.array(fullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema),
  attachments: z.array(fullBackupAttachmentRecordSchema),
  researcherProfiles: z.array(fullBackupResearcherProfileRecordSchema).max(1),
  appSettings: z.array(fullBackupAppSettingsRecordSchema).max(1),
  ruleRegistry: z.array(fullBackupRuleRegistryRecordSchema),
  tzdbMigrationReceipts: z.array(fullBackupTzdbMigrationReceiptRecordSchema)
});

export const tzdbMigrationFullBackupEnvelopeSchema = z.strictObject({
  manifest: tzdbMigrationFullBackupManifestSchema,
  digests: tzdbMigrationFullBackupDigestsSchema,
  payload: tzdbMigrationFullBackupPayloadSchema
});

/** Frozen v1.1 fifteen-partition envelope. Never add calculation receipts here. */
export const eventTimeMigrationFullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative(),
    attachments: z.number().int().nonnegative(),
    researcherProfiles: z.number().int().nonnegative().max(1),
    appSettings: z.number().int().nonnegative().max(1),
    ruleRegistry: z.number().int().nonnegative(),
    tzdbMigrationReceipts: z.number().int().nonnegative(),
    eventTimeMigrationReceipts: z.number().int().nonnegative()
  })
});

export const eventTimeMigrationFullBackupDigestsSchema = z.strictObject({
  cases: z.string().regex(/^[a-f0-9]{64}$/),
  revisions: z.string().regex(/^[a-f0-9]{64}$/),
  candidateSets: z.string().regex(/^[a-f0-9]{64}$/),
  researchNotes: z.string().regex(/^[a-f0-9]{64}$/),
  events: z.string().regex(/^[a-f0-9]{64}$/),
  savedViews: z.string().regex(/^[a-f0-9]{64}$/),
  knowledgeDocuments: z.string().regex(/^[a-f0-9]{64}$/),
  citations: z.string().regex(/^[a-f0-9]{64}$/),
  sourceRights: z.string().regex(/^[a-f0-9]{64}$/),
  attachments: z.string().regex(/^[a-f0-9]{64}$/),
  researcherProfiles: z.string().regex(/^[a-f0-9]{64}$/),
  appSettings: z.string().regex(/^[a-f0-9]{64}$/),
  ruleRegistry: z.string().regex(/^[a-f0-9]{64}$/),
  tzdbMigrationReceipts: z.string().regex(/^[a-f0-9]{64}$/),
  eventTimeMigrationReceipts: z.string().regex(/^[a-f0-9]{64}$/),
  payload: z.string().regex(/^[a-f0-9]{64}$/),
  envelope: z.string().regex(/^[a-f0-9]{64}$/)
});

export const eventTimeMigrationFullBackupPayloadSchema = z.strictObject({
  cases: z.array(fullBackupCaseRecordSchema),
  revisions: z.array(fullBackupRevisionRecordSchema),
  candidateSets: z.array(fullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(fullBackupEventRecordSchema),
  savedViews: z.array(fullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema),
  attachments: z.array(fullBackupAttachmentRecordSchema),
  researcherProfiles: z.array(fullBackupResearcherProfileRecordSchema).max(1),
  appSettings: z.array(fullBackupAppSettingsRecordSchema).max(1),
  ruleRegistry: z.array(fullBackupRuleRegistryRecordSchema),
  tzdbMigrationReceipts: z.array(fullBackupTzdbMigrationReceiptRecordSchema),
  eventTimeMigrationReceipts: z.array(fullBackupEventTimeMigrationReceiptRecordSchema)
});

export const eventTimeMigrationFullBackupEnvelopeSchema = z.strictObject({
  manifest: eventTimeMigrationFullBackupManifestSchema,
  digests: eventTimeMigrationFullBackupDigestsSchema,
  payload: eventTimeMigrationFullBackupPayloadSchema
});

export const fullBackupManifestSchema = z.strictObject({
  format: z.literal(FULL_BACKUP_FORMAT),
  formatVersion: z.literal(FULL_BACKUP_FORMAT_VERSION),
  schemaVersion: z.literal(BACKUP_DATA_SCHEMA_VERSION_V1),
  scope: z.literal(FULL_BACKUP_SCOPE),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
  exportedAt: z.string().datetime(),
  digestAlgorithm: z.literal(FULL_BACKUP_DIGEST_ALGORITHM),
  counts: z.strictObject({
    cases: z.number().int().nonnegative(),
    revisions: z.number().int().nonnegative(),
    candidateSets: z.number().int().nonnegative(),
    researchNotes: z.number().int().nonnegative(),
    events: z.number().int().nonnegative(),
    savedViews: z.number().int().nonnegative(),
    knowledgeDocuments: z.number().int().nonnegative(),
    citations: z.number().int().nonnegative(),
    sourceRights: z.number().int().nonnegative(),
    attachments: z.number().int().nonnegative(),
    researcherProfiles: z.number().int().nonnegative().max(1),
    appSettings: z.number().int().nonnegative().max(1),
    ruleRegistry: z.number().int().nonnegative(),
    tzdbMigrationReceipts: z.number().int().nonnegative(),
    eventTimeMigrationReceipts: z.number().int().nonnegative(),
    revisionCalculationReceipts: z.number().int().nonnegative()
  })
});

export const fullBackupDigestsSchema = z.strictObject({
  cases: sha256TextSchema,
  revisions: sha256TextSchema,
  candidateSets: sha256TextSchema,
  researchNotes: sha256TextSchema,
  events: sha256TextSchema,
  savedViews: sha256TextSchema,
  knowledgeDocuments: sha256TextSchema,
  citations: sha256TextSchema,
  sourceRights: sha256TextSchema,
  attachments: sha256TextSchema,
  researcherProfiles: sha256TextSchema,
  appSettings: sha256TextSchema,
  ruleRegistry: sha256TextSchema,
  tzdbMigrationReceipts: sha256TextSchema,
  eventTimeMigrationReceipts: sha256TextSchema,
  revisionCalculationReceipts: sha256TextSchema,
  payload: sha256TextSchema,
  envelope: sha256TextSchema
});

export const fullBackupPayloadSchema = z.strictObject({
  cases: z.array(fullBackupCaseRecordSchema),
  revisions: z.array(fullBackupRevisionRecordSchema),
  candidateSets: z.array(fullBackupCandidateSetRecordSchema),
  researchNotes: z.array(fullBackupResearchNoteRecordSchema),
  events: z.array(fullBackupEventRecordSchema),
  savedViews: z.array(fullBackupSavedViewRecordSchema),
  knowledgeDocuments: z.array(fullBackupKnowledgeDocumentRecordSchema),
  citations: z.array(fullBackupCitationRecordSchema),
  sourceRights: z.array(fullBackupSourceRightsRecordSchema),
  attachments: z.array(fullBackupAttachmentRecordSchema),
  researcherProfiles: z.array(fullBackupResearcherProfileRecordSchema).max(1),
  appSettings: z.array(fullBackupAppSettingsRecordSchema).max(1),
  ruleRegistry: z.array(fullBackupRuleRegistryRecordSchema),
  tzdbMigrationReceipts: z.array(fullBackupTzdbMigrationReceiptRecordSchema),
  eventTimeMigrationReceipts: z.array(fullBackupEventTimeMigrationReceiptRecordSchema),
  revisionCalculationReceipts: z.array(fullBackupRevisionCalculationReceiptRecordSchema)
});

export const fullBackupEnvelopeSchema = z.strictObject({
  manifest: fullBackupManifestSchema,
  digests: fullBackupDigestsSchema,
  payload: fullBackupPayloadSchema
});

/** @deprecated Name retained for source compatibility; this is only the core cases/revisions manifest. */
export const backupManifestSchema = coreBackupManifestSchema;

export type BirthInput = z.infer<typeof birthInputSchema>;
export type RuleProfile = z.infer<typeof ruleProfileSchema>;
export type XiaoyunRuleSnapshot = z.infer<typeof xiaoyunRuleSnapshotSchema>;
export type LuckCycleRuleSnapshot = z.infer<typeof luckCycleRuleSnapshotSchema>;
export type DstDisambiguationPolicy = z.infer<typeof dstDisambiguationPolicySchema>;
export type TimeZoneCandidate = z.infer<typeof timeZoneCandidateSchema>;
export type TimeZoneResolution = z.infer<typeof timeZoneResolutionSchema>;
export type SolarTimeVariant = z.infer<typeof solarTimeVariantSchema>;
export type SolarTimeDetails = z.infer<typeof solarTimeDetailsSchema>;
export type CalendarResolution = z.infer<typeof calendarResolutionSchema>;
export type TimeCalibration = z.infer<typeof timeCalibrationSchema>;
export type NormalizedTimeCalibration = z.infer<typeof normalizedTimeCalibrationSchema>;
export type PillarFact = z.infer<typeof pillarFactSchema>;
export type ChartFacts = z.infer<typeof chartFactsSchema>;
export type TimeZoneDatabaseSnapshot = z.infer<typeof timeZoneDatabaseSnapshotSchema>;
export type CalculationManifest = z.infer<typeof calculationManifestSchema>;
export type RulePackBinding = z.infer<typeof rulePackBindingSchema>;
export type CalculatedChart = z.infer<typeof calculatedChartSchema>;
export type LegacyCaseRecordV1 = z.infer<typeof legacyCaseRecordV1Schema>;
export type CaseRecord = z.infer<typeof caseRecordSchema>;
export type RevisionRecord = z.infer<typeof revisionRecordSchema>;
export type ResearchNoteAnchor = z.infer<typeof researchNoteAnchorSchema>;
export type ResearchNoteRecord = z.infer<typeof researchNoteRecordSchema>;
export type FutureTransitNodeRef = z.infer<typeof futureTransitNodeRefSchema>;
export type TransitNodeType = z.infer<typeof transitNodeTypeSchema>;
export type TransitNodeRef = z.infer<typeof transitNodeRefSchema>;
export type AnyTransitNodeRef = z.infer<typeof anyTransitNodeRefSchema>;
export type TransitNode = z.infer<typeof transitNodeSchema>;
export type TransitSlot = z.infer<typeof transitSlotSchema>;
export type TransitSnapshot = z.infer<typeof transitSnapshotSchema>;
export type FormalComparisonSlotId = z.infer<typeof formalComparisonSlotIdSchema>;
export type FormalComparisonSlotRequest = z.infer<typeof formalComparisonSlotRequestSchema>;
export type FormalComparisonRequest = z.infer<typeof formalComparisonRequestSchema>;
export type FormalComparisonSource = z.infer<typeof formalComparisonSourceSchema>;
export type ComparisonCategory = z.infer<typeof formalComparisonCategorySchema>;
export type ComparisonSource = z.infer<typeof comparisonSourceSchema>;
export type ComparisonCellAvailability = z.infer<typeof comparisonCellAvailabilitySchema>;
export type ComparisonCellStatus = z.infer<typeof comparisonCellStatusSchema>;
export type ComparisonRowStatus = z.infer<typeof comparisonRowStatusSchema>;
export type ComparisonItem = z.infer<typeof comparisonItemSchema>;
export type ComparisonCell = z.infer<typeof comparisonCellSchema>;
export type ComparisonRow = z.infer<typeof comparisonRowSchema>;
export type ComparisonSection = z.infer<typeof comparisonSectionSchema>;
export type ComparisonMatrix = z.infer<typeof comparisonMatrixSchema>;
export type SynchronizedTransitResult = z.infer<typeof synchronizedTransitResultSchema>;
export type FormalComparisonProjection = z.infer<typeof formalComparisonProjectionSchema>;
export type PairStructureResearchPolicy = z.infer<typeof pairStructureResearchPolicySchema>;
export type PairStructureResearchRequest = z.infer<typeof pairStructureResearchRequestSchema>;
export type PairStructureObservation = z.infer<typeof pairStructureObservationSchema>;
export type PairStructureResearchProjection = z.infer<typeof pairStructureResearchProjectionSchema>;
export type EventDatePrecision = z.infer<typeof eventDatePrecisionSchema>;
export type EventMinuteTimeZoneResolution = z.infer<typeof eventMinuteTimeZoneResolutionSchema>;
export type EventZonedMinuteBoundary = z.infer<typeof eventZonedMinuteBoundarySchema>;
export type EventTimeContext = z.infer<typeof eventTimeContextSchema>;
export type EventRecord = z.infer<typeof eventRecordSchema>;
export type SavedViewFilters = z.infer<typeof savedViewFiltersSchema>;
export type SavedViewSort = z.infer<typeof savedViewSortSchema>;
export type SavedViewRecord = z.infer<typeof savedViewRecordSchema>;
export type PillarRelationType = z.infer<typeof pillarRelationTypeSchema>;
export type ResearchQueryTransitMatch = z.infer<typeof researchQueryTransitMatchSchema>;
export type ResearchEventBinding = z.infer<typeof researchEventBindingSchema>;
export type ResearchQuery = z.infer<typeof researchQuerySchema>;
export type ResearchCaseQuery = Extract<ResearchQuery, { scope: "cases" }>;
export type ResearchCandidateSetQuery = Extract<ResearchQuery, { scope: "candidate_sets" }>;
export type ResearchEventQuery = Extract<ResearchQuery, { scope: "events" }>;
export type ResearchKnowledgeQuery = Extract<ResearchQuery, { scope: "knowledge" }>;
export type KnowledgeSection = z.infer<typeof knowledgeSectionSchema>;
export type KnowledgeDocumentRecord = z.infer<typeof knowledgeDocumentRecordSchema>;
export type KnowledgeDocumentV03Record = z.infer<typeof knowledgeDocumentV03RecordSchema>;
export type SourceRightsRecord = z.infer<typeof sourceRightsRecordSchema>;
export type ReviewAttestation = z.infer<typeof reviewAttestationSchema>;
export type CitationTarget = z.infer<typeof citationTargetSchema>;
export type CitationTargetV03 = z.infer<typeof citationTargetV03Schema>;
export type CitationLocator = z.infer<typeof citationLocatorSchema>;
export type CitationRecord = z.infer<typeof citationRecordSchema>;
export type CitationV03Record = z.infer<typeof citationV03RecordSchema>;
export type LocalAttachmentLink = z.infer<typeof localAttachmentLinkSchema>;
export type LocalAttachmentRecord = z.infer<typeof localAttachmentRecordSchema>;
export type LocalResearcherProfileRecord = z.infer<typeof localResearcherProfileRecordSchema>;
export type LocalAppSettingsRecord = z.infer<typeof localAppSettingsRecordSchema>;
export type InstalledRulePackRecord = z.infer<typeof installedRulePackRecordSchema>;
export type ActiveRulePackRecord = z.infer<typeof activeRulePackRecordSchema>;
export type LocalRuleRegistryRecord = z.infer<typeof localRuleRegistryRecordSchema>;
export type RevisionCalculationReceiptCaptureKind = z.infer<
  typeof revisionCalculationReceiptCaptureKindSchema
>;
export type RevisionCalculationReceiptRecord = z.infer<
  typeof revisionCalculationReceiptRecordSchema
>;
export type CoreBackupManifest = z.infer<typeof coreBackupManifestSchema>;
export type CoreBackupDigests = z.infer<typeof coreBackupDigestsSchema>;
export type CoreBackupPayload = z.infer<typeof coreBackupPayloadSchema>;
export type CoreBackupEnvelope = z.infer<typeof coreBackupEnvelopeSchema>;
export type LegacyCoreBackupManifest = z.infer<typeof legacyCoreBackupManifestSchema>;
export type LegacyCoreBackupDigests = z.infer<typeof legacyCoreBackupDigestsSchema>;
export type LegacyCoreBackupPayload = z.infer<typeof legacyCoreBackupPayloadSchema>;
export type LegacyCoreBackupEnvelope = z.infer<typeof legacyCoreBackupEnvelopeSchema>;
export type RuleRegistryFullBackupManifest = z.infer<typeof ruleRegistryFullBackupManifestSchema>;
export type RuleRegistryFullBackupDigests = z.infer<typeof ruleRegistryFullBackupDigestsSchema>;
export type RuleRegistryFullBackupPayload = z.infer<typeof ruleRegistryFullBackupPayloadSchema>;
export type RuleRegistryFullBackupEnvelope = z.infer<typeof ruleRegistryFullBackupEnvelopeSchema>;
export type TzdbMigrationFullBackupManifest = z.infer<typeof tzdbMigrationFullBackupManifestSchema>;
export type TzdbMigrationFullBackupDigests = z.infer<typeof tzdbMigrationFullBackupDigestsSchema>;
export type TzdbMigrationFullBackupPayload = z.infer<typeof tzdbMigrationFullBackupPayloadSchema>;
export type TzdbMigrationFullBackupEnvelope = z.infer<typeof tzdbMigrationFullBackupEnvelopeSchema>;
export type EventTimeMigrationFullBackupManifest = z.infer<
  typeof eventTimeMigrationFullBackupManifestSchema
>;
export type EventTimeMigrationFullBackupDigests = z.infer<
  typeof eventTimeMigrationFullBackupDigestsSchema
>;
export type EventTimeMigrationFullBackupPayload = z.infer<
  typeof eventTimeMigrationFullBackupPayloadSchema
>;
export type EventTimeMigrationFullBackupEnvelope = z.infer<
  typeof eventTimeMigrationFullBackupEnvelopeSchema
>;
export type FullBackupManifest = z.infer<typeof fullBackupManifestSchema>;
export type FullBackupDigests = z.infer<typeof fullBackupDigestsSchema>;
export type FullBackupPayload = z.infer<typeof fullBackupPayloadSchema>;
export type FullBackupEnvelope = z.infer<typeof fullBackupEnvelopeSchema>;
export type LocalUserDataFullBackupManifest = z.infer<typeof localUserDataFullBackupManifestSchema>;
export type LocalUserDataFullBackupDigests = z.infer<typeof localUserDataFullBackupDigestsSchema>;
export type LocalUserDataFullBackupPayload = z.infer<typeof localUserDataFullBackupPayloadSchema>;
export type LocalUserDataFullBackupEnvelope = z.infer<typeof localUserDataFullBackupEnvelopeSchema>;
export type SavedViewFullBackupManifest = z.infer<typeof savedViewFullBackupManifestSchema>;
export type SavedViewFullBackupDigests = z.infer<typeof savedViewFullBackupDigestsSchema>;
export type SavedViewFullBackupPayload = z.infer<typeof savedViewFullBackupPayloadSchema>;
export type SavedViewFullBackupEnvelope = z.infer<typeof savedViewFullBackupEnvelopeSchema>;
export type LegacyFullBackupManifest = z.infer<typeof legacyFullBackupManifestSchema>;
export type LegacyFullBackupDigests = z.infer<typeof legacyFullBackupDigestsSchema>;
export type LegacyFullBackupPayload = z.infer<typeof legacyFullBackupPayloadSchema>;
export type LegacyFullBackupEnvelope = z.infer<typeof legacyFullBackupEnvelopeSchema>;
export type PreviousFullBackupManifest = z.infer<typeof previousFullBackupManifestSchema>;
export type PreviousFullBackupDigests = z.infer<typeof previousFullBackupDigestsSchema>;
export type PreviousFullBackupPayload = z.infer<typeof previousFullBackupPayloadSchema>;
export type PreviousFullBackupEnvelope = z.infer<typeof previousFullBackupEnvelopeSchema>;
export type KnowledgeFullBackupManifest = z.infer<typeof knowledgeFullBackupManifestSchema>;
export type KnowledgeFullBackupDigests = z.infer<typeof knowledgeFullBackupDigestsSchema>;
export type KnowledgeFullBackupPayload = z.infer<typeof knowledgeFullBackupPayloadSchema>;
export type KnowledgeFullBackupEnvelope = z.infer<typeof knowledgeFullBackupEnvelopeSchema>;
export type SourceRightsFullBackupManifest = z.infer<typeof sourceRightsFullBackupManifestSchema>;
export type SourceRightsFullBackupDigests = z.infer<typeof sourceRightsFullBackupDigestsSchema>;
export type SourceRightsFullBackupPayload = z.infer<typeof sourceRightsFullBackupPayloadSchema>;
export type SourceRightsFullBackupEnvelope = z.infer<typeof sourceRightsFullBackupEnvelopeSchema>;
export type LifecycleFullBackupManifest = z.infer<typeof lifecycleFullBackupManifestSchema>;
export type LifecycleFullBackupDigests = z.infer<typeof lifecycleFullBackupDigestsSchema>;
export type LifecycleFullBackupPayload = z.infer<typeof lifecycleFullBackupPayloadSchema>;
export type LifecycleFullBackupEnvelope = z.infer<typeof lifecycleFullBackupEnvelopeSchema>;
export type EventTimeFullBackupManifest = z.infer<typeof eventTimeFullBackupManifestSchema>;
export type EventTimeFullBackupDigests = z.infer<typeof eventTimeFullBackupDigestsSchema>;
export type EventTimeFullBackupPayload = z.infer<typeof eventTimeFullBackupPayloadSchema>;
export type EventTimeFullBackupEnvelope = z.infer<typeof eventTimeFullBackupEnvelopeSchema>;
/** @deprecated This alias is a core cases/revisions manifest, not a complete v1 backup. */
export type BackupManifest = CoreBackupManifest;

export type CaseBundle = {
  caseRecord: CaseRecord;
  revisions: RevisionRecord[];
};
