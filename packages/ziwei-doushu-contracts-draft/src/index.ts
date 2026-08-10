import { z } from "zod";

export const ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION = "0.1.0-draft.3" as const;
export const ZIWEI_DOUSHU_SYSTEM_ID = "ziwei-doushu" as const;
export const ZIWEI_DIGEST_ALGORITHM = "sha256-canonical-json-v1" as const;
export const ZIWEI_DIGEST_VERIFICATION = "recomputed_sha256_canonical_json_v1" as const;

export const ZIWEI_EARTHLY_BRANCH_IDS = Object.freeze([
  "zi",
  "chou",
  "yin",
  "mao",
  "chen",
  "si",
  "wu",
  "wei",
  "shen",
  "you",
  "xu",
  "hai"
] as const);

export const ZIWEI_PALACE_ROLE_IDS = Object.freeze([
  "life",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "wellbeing",
  "parents"
] as const);

export const ZIWEI_TRANSFORMATION_IDS = Object.freeze(["lu", "quan", "ke", "ji"] as const);
export const ZIWEI_BRIGHTNESS_IDS = Object.freeze([
  "miao",
  "wang",
  "de",
  "li",
  "ping",
  "xian",
  "bu"
] as const);

export const ZIWEI_SHICHEN_SLOTS = Object.freeze([
  { index: 0, branchId: "zi", civilRange: "00:00-01:00" },
  { index: 1, branchId: "chou", civilRange: "01:00-03:00" },
  { index: 2, branchId: "yin", civilRange: "03:00-05:00" },
  { index: 3, branchId: "mao", civilRange: "05:00-07:00" },
  { index: 4, branchId: "chen", civilRange: "07:00-09:00" },
  { index: 5, branchId: "si", civilRange: "09:00-11:00" },
  { index: 6, branchId: "wu", civilRange: "11:00-13:00" },
  { index: 7, branchId: "wei", civilRange: "13:00-15:00" },
  { index: 8, branchId: "shen", civilRange: "15:00-17:00" },
  { index: 9, branchId: "you", civilRange: "17:00-19:00" },
  { index: 10, branchId: "xu", civilRange: "19:00-21:00" },
  { index: 11, branchId: "hai", civilRange: "21:00-23:00" },
  { index: 12, branchId: "zi", civilRange: "23:00-24:00" }
] as const);

const semanticVersionSchema = z.string().regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const stableIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/).max(160);
const sourceIdSchema = z.string().regex(/^source:[a-z0-9][a-z0-9._-]*$/).max(180);
const starIdSchema = z.string().regex(/^ziwei\.star\.[a-z0-9][a-z0-9.-]*$/).max(180);
const ianaTimeZoneSchema = z.string().regex(/^(?:UTC|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+)$/).max(120);
const gregorianDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidGregorianDate, "日期必须是有效的公历 YYYY-MM-DD");
const hourMinuteSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const heavenlyStemSchema = z.enum(["jia", "yi", "bing", "ding", "wu", "ji", "geng", "xin", "ren", "gui"]);
const earthlyBranchSchema = z.enum(ZIWEI_EARTHLY_BRANCH_IDS);
const palaceRoleSchema = z.enum(ZIWEI_PALACE_ROLE_IDS);
const transformationSchema = z.enum(ZIWEI_TRANSFORMATION_IDS);
const brightnessSchema = z.enum(ZIWEI_BRIGHTNESS_IDS);
const upstreamKeySchema = z.string().regex(/^[a-z][A-Za-z0-9]*$/).max(120);

function isValidGregorianDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= monthLengths[month - 1]!;
}

function addDuplicateIssue(
  values: readonly string[],
  context: z.RefinementCtx,
  path: Array<string | number>,
  message: string
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) context.addIssue({ code: "custom", path: [...path, index], message });
    seen.add(value);
  });
}

export const ziweiDraftSourceReferenceSchema = z.strictObject({
  sourceId: sourceIdSchema,
  kind: z.enum([
    "official_calendar",
    "technical_standard",
    "implementation_reference",
    "domain_rule_reference",
    "license"
  ]),
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(200),
  url: z.string().url().max(2_000),
  versionOrDate: z.string().trim().min(1).max(120).nullable(),
  retrievedAt: z.string().datetime({ offset: true }),
  usage: z.enum(["link_only", "calendar_fixture", "adapter_behavior", "rule_review"]),
  rightsStatus: z.enum([
    "open_data_terms_recorded",
    "mit_notice_required",
    "link_only_unreviewed",
    "redistribution_review_required"
  ]),
  notes: z.string().trim().max(1_000)
});

export const ziweiDraftReviewSchema = z
  .strictObject({
    status: z.enum(["unreviewed", "single_reviewed", "double_reviewed"]),
    attestations: z.array(z.strictObject({
      reviewerId: stableIdSchema,
      reviewedAt: z.string().datetime({ offset: true }),
      scope: z.enum(["calendar", "rule_profile", "fixture_structure"]),
      note: z.string().trim().min(1).max(1_000)
    })).max(20)
  })
  .superRefine((value, context) => {
    addDuplicateIssue(
      value.attestations.map((item) => item.reviewerId),
      context,
      ["attestations"],
      "同一复核身份不能重复签署"
    );
    const reviewers = new Set(value.attestations.map((item) => item.reviewerId)).size;
    const expected = reviewers >= 2 ? "double_reviewed" : reviewers === 1 ? "single_reviewed" : "unreviewed";
    if (value.status !== expected) {
      context.addIssue({ code: "custom", path: ["status"], message: "复核状态必须与不同复核身份数量一致" });
    }
  });

const ziweiGregorianInputSchema = z.strictObject({
  calendar: z.literal("gregorian"),
  date: gregorianDateSchema
});

const ziweiLunisolarInputSchema = z.strictObject({
  calendar: z.literal("chinese_lunisolar"),
  date: z.strictObject({
    year: z.number().int().min(1).max(9_999),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(30),
    isLeapMonth: z.boolean()
  })
});

export const ziweiBirthInputDraftSchema = z.strictObject({
  contractVersion: z.literal(ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION),
  systemId: z.literal(ZIWEI_DOUSHU_SYSTEM_ID),
  calendarInput: z.discriminatedUnion("calendar", [ziweiGregorianInputSchema, ziweiLunisolarInputSchema]),
  shichenIndex: z.number().int().min(0).max(12),
  sexForCalculation: z.enum(["male", "female"]),
  solarTimeAdjustment: z.literal("none"),
  civilContext: z.strictObject({
    usedForCalculation: z.literal(false),
    localTime: hourMinuteSchema.nullable(),
    timeZone: ianaTimeZoneSchema.nullable(),
    location: z.discriminatedUnion("precision", [
      z.strictObject({
        precision: z.literal("coordinates"),
        label: z.string().trim().max(120),
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180)
      }),
      z.strictObject({
        precision: z.literal("unknown"),
        label: z.string().trim().max(120),
        latitude: z.null(),
        longitude: z.null()
      })
    ])
  }),
  birthSourceRef: stableIdSchema,
  sourceNote: z.string().trim().max(1_000)
});

const ziweiTableBindingSchema = z.strictObject({
  tableId: stableIdSchema,
  tableVersion: semanticVersionSchema,
  contentSha256: sha256Schema,
  immutableLocator: z.string().url().max(2_000),
  entryCount: z.number().int().positive().max(100_000),
  sourceIds: z.array(sourceIdSchema).min(1).max(50)
});

const ziweiMutagenTableBindingSchema = ziweiTableBindingSchema.extend({
  entryCount: z.literal(10),
  entries: z.array(z.strictObject({
    heavenlyStemId: heavenlyStemSchema,
    transformations: z.strictObject({
      lu: starIdSchema,
      quan: starIdSchema,
      ke: starIdSchema,
      ji: starIdSchema
    })
  })).length(10)
}).superRefine((value, context) => {
  addDuplicateIssue(value.entries.map((item) => item.heavenlyStemId), context, ["entries"], "四化表必须且只能包含十天干各一次");
  value.entries.forEach((entry, index) => {
    addDuplicateIssue(
      Object.values(entry.transformations),
      context,
      ["entries", index, "transformations"],
      "Each heavenly stem must map the four transformations to four distinct stars"
    );
  });
});

const ziweiStarRegistryBindingSchema = ziweiTableBindingSchema.extend({
  entryCount: z.literal(162),
  entries: z.array(z.strictObject({
    upstreamKey: upstreamKeySchema,
    starId: starIdSchema,
    zhCnLabel: z.string().trim().min(1).max(80)
  })).length(162)
}).superRefine((value, context) => {
  addDuplicateIssue(value.entries.map((item) => item.upstreamKey), context, ["entries"], "Upstream star keys must be unique");
  addDuplicateIssue(value.entries.map((item) => item.starId), context, ["entries"], "Project star IDs must be unique");
  addDuplicateIssue(value.entries.map((item) => item.zhCnLabel), context, ["entries"], "Frozen zh-CN star labels must be a bijection");
});

const ziweiBrightnessTableBindingSchema = ziweiTableBindingSchema.extend({
  entryCount: z.literal(20),
  canonicalBranchOrder: z.array(earthlyBranchSchema).length(12),
  missingStarPolicy: z.literal("null_brightness"),
  entries: z.array(z.strictObject({
    starId: starIdSchema,
    byEarthlyBranch: z.strictObject({
      zi: brightnessSchema.nullable(),
      chou: brightnessSchema.nullable(),
      yin: brightnessSchema.nullable(),
      mao: brightnessSchema.nullable(),
      chen: brightnessSchema.nullable(),
      si: brightnessSchema.nullable(),
      wu: brightnessSchema.nullable(),
      wei: brightnessSchema.nullable(),
      shen: brightnessSchema.nullable(),
      you: brightnessSchema.nullable(),
      xu: brightnessSchema.nullable(),
      hai: brightnessSchema.nullable()
    })
  })).length(20)
}).superRefine((value, context) => {
  addDuplicateIssue(value.entries.map((item) => item.starId), context, ["entries"], "Brightness rows must bind distinct stars");
  value.canonicalBranchOrder.forEach((branchId, index) => {
    if (branchId !== ZIWEI_EARTHLY_BRANCH_IDS[index]) {
      context.addIssue({
        code: "custom",
        path: ["canonicalBranchOrder", index],
        message: "Brightness columns must use the canonical zi-to-hai branch order"
      });
    }
  });
});

export const ziweiRuleSnapshotDraftSchema = z
  .strictObject({
    contractVersion: z.literal(ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(ZIWEI_DOUSHU_SYSTEM_ID),
    profileId: stableIdSchema,
    profileVersion: semanticVersionSchema,
    status: z.literal("contract_draft"),
    engine: z.strictObject({
      adapterId: stableIdSchema,
      adapterVersion: semanticVersionSchema,
      upstreamName: z.string().trim().min(1).max(120),
      upstreamVersion: semanticVersionSchema,
      upstreamCommit: z.string().regex(/^[a-f0-9]{40}$/),
      upstreamNpmIntegrity: z.string().regex(/^sha512-[A-Za-z0-9+/]+={0,2}$/),
      dependencyGraphSha256: sha256Schema,
      adapterSourceSha256: sha256Schema,
      workerEntrySha256: sha256Schema,
      workerProtocolVersion: z.string().regex(/^hakimi-ziwei-iztro-worker\/\d+\.\d+-draft$/),
      isolation: z.literal("fresh_worker_per_calculation"),
      isolatedExecution: z.literal(true),
      configurationMode: z.literal("full_snapshot_per_calculation"),
      sourceIds: z.array(sourceIdSchema).min(1).max(50)
    }),
    verifiedRange: z.strictObject({
      from: gregorianDateSchema,
      to: gregorianDateSchema,
      outsideRangePolicy: z.literal("reject")
    }),
    rules: z.strictObject({
      leapMonthPlacement: z.discriminatedUnion("mode", [
        z.strictObject({ mode: z.literal("unadjusted") }),
        z.strictObject({ mode: z.literal("iztro_fix_leap"), cutoffDay: z.literal(15) })
      ]),
      yearBoundary: z.enum(["lunar_new_year", "li_chun"]),
      horoscopeBoundary: z.enum(["lunar_new_year", "li_chun"]),
      lateZiDay: z.enum(["current_civil_day", "next_civil_day"]),
      ageBoundary: z.enum(["calendar_year", "birthday"]),
      algorithm: z.enum(["iztro_default", "iztro_zhongzhou"]),
      chartType: z.enum(["heaven", "earth", "human"]),
      starRegistry: ziweiStarRegistryBindingSchema,
      mutagenTable: ziweiMutagenTableBindingSchema,
      brightnessTable: ziweiBrightnessTableBindingSchema,
      enabledFactFamilies: z.array(z.enum([
        "calendar",
        "palaces",
        "natal_stars",
        "transformations",
        "major_periods"
      ])).length(5),
      interpretationIncluded: z.literal(false)
    }),
    sourceCatalog: z.array(ziweiDraftSourceReferenceSchema).min(1).max(100),
    review: ziweiDraftReviewSchema,
    ruleSnapshotSha256: sha256Schema
  })
  .superRefine((value, context) => {
    if (value.verifiedRange.to < value.verifiedRange.from) {
      context.addIssue({ code: "custom", path: ["verifiedRange", "to"], message: "验证区间终点不能早于起点" });
    }
    if (value.rules.algorithm === "iztro_default" && value.rules.chartType !== "heaven") {
      context.addIssue({
        code: "custom",
        path: ["rules", "chartType"],
        message: "草案只允许中州算法声明地盘或人盘；默认算法必须使用天盘"
      });
    }
    addDuplicateIssue(
      value.sourceCatalog.map((item) => item.sourceId),
      context,
      ["sourceCatalog"],
      "来源 ID 不能重复"
    );
    addDuplicateIssue(
      value.rules.enabledFactFamilies,
      context,
      ["rules", "enabledFactFamilies"],
      "事实族不能重复"
    );
    const requiredFamilies = new Set(["calendar", "palaces", "natal_stars", "transformations", "major_periods"]);
    if (!value.rules.enabledFactFamilies.every((item) => requiredFamilies.delete(item)) || requiredFamilies.size > 0) {
      context.addIssue({
        code: "custom",
        path: ["rules", "enabledFactFamilies"],
        message: "本命草案必须显式启用全部五个结构事实族"
      });
    }
    const registeredStarIds = new Set(value.rules.starRegistry.entries.map((entry) => entry.starId));
    value.rules.mutagenTable.entries.forEach((entry, entryIndex) => {
      Object.entries(entry.transformations).forEach(([transformationId, starId]) => {
        if (!registeredStarIds.has(starId)) {
          context.addIssue({
            code: "custom",
            path: ["rules", "mutagenTable", "entries", entryIndex, "transformations", transformationId],
            message: "Mutagen rows may reference only registered star IDs"
          });
        }
      });
    });
    value.rules.brightnessTable.entries.forEach((entry, entryIndex) => {
      if (!registeredStarIds.has(entry.starId)) {
        context.addIssue({
          code: "custom",
          path: ["rules", "brightnessTable", "entries", entryIndex, "starId"],
          message: "Brightness rows may reference only registered star IDs"
        });
      }
    });
    const knownSources = new Set(value.sourceCatalog.map((item) => item.sourceId));
    const referencedSources = [
      ...value.engine.sourceIds,
      ...value.rules.starRegistry.sourceIds,
      ...value.rules.mutagenTable.sourceIds,
      ...value.rules.brightnessTable.sourceIds
    ];
    referencedSources.forEach((sourceId) => {
      if (!knownSources.has(sourceId)) {
        context.addIssue({ code: "custom", path: ["sourceCatalog"], message: `规则引用了未登记来源 ${sourceId}` });
      }
    });
  });

const ziweiStarFactDraftSchema = z.strictObject({
  starId: starIdSchema,
  scope: z.literal("natal"),
  category: z.enum(["major", "minor", "auxiliary"]),
  brightnessId: brightnessSchema.nullable(),
  transformationIds: z.array(transformationSchema).max(4),
  placementRuleId: stableIdSchema
});

const ziweiPalaceFactDraftSchema = z.strictObject({
  earthlyBranchId: earthlyBranchSchema,
  heavenlyStemId: heavenlyStemSchema,
  roleId: palaceRoleSchema,
  isBodyPalace: z.boolean(),
  stars: z.array(ziweiStarFactDraftSchema).max(200)
});

const ziweiMajorPeriodFactDraftSchema = z.strictObject({
  sequence: z.number().int().min(1).max(12),
  palaceRoleId: palaceRoleSchema,
  heavenlyStemId: heavenlyStemSchema,
  earthlyBranchId: earthlyBranchSchema,
  direction: z.enum(["forward", "backward"]),
  ageKind: z.literal("nominal_age"),
  startAge: z.number().int().min(0).max(200),
  endAge: z.number().int().min(0).max(200)
}).refine((value) => value.endAge >= value.startAge, {
  path: ["endAge"],
  message: "大限结束年龄不能早于开始年龄"
});

export const ziweiNatalFactsDraftSchema = z.strictObject({
  contractVersion: z.literal(ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION),
  systemId: z.literal(ZIWEI_DOUSHU_SYSTEM_ID),
  calendarFacts: z.strictObject({
    gregorianDate: gregorianDateSchema,
    lunarDate: z.strictObject({
      year: z.number().int().min(1).max(9_999),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(30),
      isLeapMonth: z.boolean()
    }),
    shichen: z.strictObject({
      index: z.number().int().min(0).max(12),
      branchId: earthlyBranchSchema,
      civilRange: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
    }),
    ganzhi: z.strictObject({
      year: stableIdSchema,
      month: stableIdSchema,
      day: stableIdSchema,
      hour: stableIdSchema
    })
  }),
  directionBasis: z.strictObject({
    yearStemId: heavenlyStemSchema,
    yearBranchId: earthlyBranchSchema,
    yearPolarity: z.enum(["yin", "yang"]),
    sexForCalculation: z.enum(["male", "female"]),
    resolvedDirection: z.enum(["forward", "backward"]),
    ruleId: stableIdSchema
  }),
  lifePalaceBranchId: earthlyBranchSchema,
  bodyPalaceBranchId: earthlyBranchSchema,
  lifeMasterStarId: starIdSchema,
  bodyMasterStarId: starIdSchema,
  fiveElementBureauId: z.enum(["water_2", "wood_3", "metal_4", "earth_5", "fire_6"]),
  palaces: z.array(ziweiPalaceFactDraftSchema).length(12),
  majorPeriods: z.array(ziweiMajorPeriodFactDraftSchema).length(12)
});

export const ziweiFixtureEvidenceDraftSchema = z.strictObject({
  truthStatus: z.enum([
    "synthetic_contract_fixture",
    "official_calendar",
    "expert_reviewed_rule",
    "upstream_regression",
    "differential_diagnostic"
  ]),
  claimScopes: z.array(z.enum([
    "calendar_resolution",
    "rule_profile",
    "chart_structure",
    "adapter_behavior",
    "fixture_structure"
  ])).min(1).max(4),
  productionEligible: z.literal(false),
  expertTruthClaimed: z.literal(false),
  note: z.string().trim().min(1).max(1_000)
});

export const ziweiFactProvenanceDraftSchema = z.strictObject({
  factFamily: z.enum(["calendar", "palaces", "natal_stars", "transformations", "major_periods"]),
  fieldPath: z.string().regex(/^facts(?:\.[a-zA-Z0-9_-]+|\[\d+\])+$/).max(300),
  algorithmId: stableIdSchema,
  sourceIds: z.array(sourceIdSchema).min(1).max(50),
  verificationStatus: z.enum([
    "engineering_fixture_only",
    "official_calendar_checked",
    "expert_double_reviewed"
  ])
});

export const ziweiCalculationReceiptDraftSchema = z.strictObject({
  receiptVersion: z.literal("ziwei-calculation-receipt/0.3-draft"),
  engine: z.strictObject({
    adapterId: stableIdSchema,
    adapterVersion: semanticVersionSchema,
    upstreamName: z.string().trim().min(1).max(120),
    upstreamVersion: semanticVersionSchema,
    upstreamCommit: z.string().regex(/^[a-f0-9]{40}$/),
    upstreamNpmIntegrity: z.string().regex(/^sha512-[A-Za-z0-9+/]+={0,2}$/),
    dependencyGraphSha256: sha256Schema,
    adapterSourceSha256: sha256Schema,
    workerEntrySha256: sha256Schema,
    workerProtocolVersion: z.string().regex(/^hakimi-ziwei-iztro-worker\/\d+\.\d+-draft$/),
    isolation: z.literal("fresh_worker_per_calculation"),
    runtime: z.literal("node"),
    runtimeVersion: z.string().regex(/^v\d+\.\d+\.\d+$/),
    requestId: z.string().uuid(),
    workerInstanceId: z.string().uuid(),
    startedAt: z.string().datetime({ offset: true }),
    completedAt: z.string().datetime({ offset: true }),
    exitCode: z.literal(0)
  }),
  profileId: stableIdSchema,
  profileVersion: semanticVersionSchema,
  digestAlgorithm: z.literal(ZIWEI_DIGEST_ALGORITHM),
  inputSha256: sha256Schema,
  ruleSnapshotSha256: sha256Schema,
  factsSha256: sha256Schema,
  artifactSha256: sha256Schema,
  calculatedAt: z.string().datetime({ offset: true }),
  fallbackUsed: z.literal(false),
  interpretationIncluded: z.literal(false),
  warnings: z.array(z.string().trim().min(1).max(500)).max(100),
  knownGaps: z.array(z.string().trim().min(1).max(500)).min(1).max(100),
  digestVerification: z.literal(ZIWEI_DIGEST_VERIFICATION)
});

export const ziweiNatalFixtureDraftSchema = z
  .strictObject({
    contractVersion: z.literal(ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(ZIWEI_DOUSHU_SYSTEM_ID),
    artifactKind: z.literal("ziwei_natal_engineering_fixture"),
    input: ziweiBirthInputDraftSchema,
    ruleSnapshot: ziweiRuleSnapshotDraftSchema,
    facts: ziweiNatalFactsDraftSchema,
    provenance: z.array(ziweiFactProvenanceDraftSchema).min(1).max(1_000),
    evidence: ziweiFixtureEvidenceDraftSchema,
    receipt: ziweiCalculationReceiptDraftSchema
  })
  .superRefine((value, context) => {
    if (value.input.calendarInput.calendar === "gregorian"
      && value.facts.calendarFacts.gregorianDate !== value.input.calendarInput.date) {
      context.addIssue({
        code: "custom",
        path: ["facts", "calendarFacts", "gregorianDate"],
        message: "公历输入不得在事实中静默改日"
      });
    }
    if (value.input.calendarInput.calendar === "chinese_lunisolar") {
      const inputDate = value.input.calendarInput.date;
      const lunarDate = value.facts.calendarFacts.lunarDate;
      if (inputDate.year !== lunarDate.year || inputDate.month !== lunarDate.month
        || inputDate.day !== lunarDate.day || inputDate.isLeapMonth !== lunarDate.isLeapMonth) {
        context.addIssue({
          code: "custom",
          path: ["facts", "calendarFacts", "lunarDate"],
          message: "农历输入不得在事实中静默改月、改日或改闰月"
        });
      }
    }
    if (value.facts.calendarFacts.gregorianDate < value.ruleSnapshot.verifiedRange.from
      || value.facts.calendarFacts.gregorianDate > value.ruleSnapshot.verifiedRange.to) {
      context.addIssue({
        code: "custom",
        path: ["facts", "calendarFacts", "gregorianDate"],
        message: "解析后的公历日期必须落在规则快照验证区间内"
      });
    }
    if (value.facts.calendarFacts.shichen.index !== value.input.shichenIndex) {
      context.addIssue({ code: "custom", path: ["facts", "calendarFacts", "shichen", "index"], message: "事实时辰必须绑定原始输入" });
    }
    const expectedShichen = ZIWEI_SHICHEN_SLOTS[value.input.shichenIndex];
    if (!expectedShichen
      || value.facts.calendarFacts.shichen.branchId !== expectedShichen.branchId
      || value.facts.calendarFacts.shichen.civilRange !== expectedShichen.civilRange) {
      context.addIssue({
        code: "custom",
        path: ["facts", "calendarFacts", "shichen"],
        message: "时辰索引必须匹配冻结的早子/十二时辰/晚子地支与半开民用区间"
      });
    }

    const hourGanzhiBranch = /_(zi|chou|yin|mao|chen|si|wu|wei|shen|you|xu|hai)$/u
      .exec(value.facts.calendarFacts.ganzhi.hour)?.[1];
    if (!expectedShichen || hourGanzhiBranch !== expectedShichen.branchId) {
      context.addIssue({
        code: "custom",
        path: ["facts", "calendarFacts", "ganzhi", "hour"],
        message: "Hour ganzhi must bind the frozen Shichen earthly branch"
      });
    }

    const palaces = value.facts.palaces;
    addDuplicateIssue(palaces.map((item) => item.earthlyBranchId), context, ["facts", "palaces"], "十二地支宫位不能重复");
    addDuplicateIssue(palaces.map((item) => item.roleId), context, ["facts", "palaces"], "十二宫角色不能重复");
    palaces.forEach((palace, index) => {
      if (palace.earthlyBranchId !== ZIWEI_EARTHLY_BRANCH_IDS[index]) {
        context.addIssue({
          code: "custom",
          path: ["facts", "palaces", index, "earthlyBranchId"],
          message: "十二宫数组必须按项目规范的子至亥顺序保存，不能复制上游数组索引"
        });
      }
    });
    if (palaces.filter((item) => item.isBodyPalace).length !== 1) {
      context.addIssue({ code: "custom", path: ["facts", "palaces"], message: "必须且只能有一个身宫" });
    }
    if (!palaces.some((item) => item.roleId === "life" && item.earthlyBranchId === value.facts.lifePalaceBranchId)) {
      context.addIssue({ code: "custom", path: ["facts", "lifePalaceBranchId"], message: "命宫地支必须匹配十二宫事实" });
    }
    if (!palaces.some((item) => item.isBodyPalace && item.earthlyBranchId === value.facts.bodyPalaceBranchId)) {
      context.addIssue({ code: "custom", path: ["facts", "bodyPalaceBranchId"], message: "身宫地支必须匹配唯一身宫事实" });
    }

    const stars = palaces.flatMap((palace) => palace.stars);
    const registeredStarIds = new Set(value.ruleSnapshot.rules.starRegistry.entries.map((entry) => entry.starId));
    const brightnessRows = new Map(
      value.ruleSnapshot.rules.brightnessTable.entries.map((entry) => [entry.starId, entry] as const)
    );
    stars.forEach((star, index) => {
      if (!registeredStarIds.has(star.starId)) {
        context.addIssue({
          code: "custom",
          path: ["facts", "palaces", index, "stars"],
          message: "Natal facts may contain only registered star IDs"
        });
      }
    });
    addDuplicateIssue(stars.map((item) => item.starId), context, ["facts", "palaces"], "本命星曜 ID 不能跨宫重复");
    palaces.forEach((palace, palaceIndex) => {
      palace.stars.forEach((star, starIndex) => {
        const brightnessRow = brightnessRows.get(star.starId);
        const expectedBrightness = brightnessRow?.byEarthlyBranch[palace.earthlyBranchId] ?? null;
        if (star.brightnessId !== expectedBrightness) {
          context.addIssue({
            code: "custom",
            path: ["facts", "palaces", palaceIndex, "stars", starIndex, "brightnessId"],
            message: "Natal brightness must match the frozen star-by-branch table and null missing-star policy"
          });
        }
      });
    });
    const starIds = new Set(stars.map((item) => item.starId));
    if (!starIds.has(value.facts.lifeMasterStarId) || !starIds.has(value.facts.bodyMasterStarId)) {
      context.addIssue({ code: "custom", path: ["facts", "lifeMasterStarId"], message: "命主与身主星 ID 必须存在于本命星曜事实中" });
    }
    const transformations = stars.flatMap((star) => star.transformationIds);
    addDuplicateIssue(transformations, context, ["facts", "palaces"], "本命四化类型不能重复");
    if (transformations.length !== ZIWEI_TRANSFORMATION_IDS.length
      || !ZIWEI_TRANSFORMATION_IDS.every((item) => transformations.includes(item))) {
      context.addIssue({ code: "custom", path: ["facts", "palaces"], message: "本命事实必须且只能包含禄、权、科、忌各一次" });
    }
    const activeMutagenEntry = value.ruleSnapshot.rules.mutagenTable.entries.find(
      (entry) => entry.heavenlyStemId === value.facts.directionBasis.yearStemId
    );
    const actualMutagens = new Map(
      stars.flatMap((star) => star.transformationIds.map((transformationId) => [transformationId, star.starId] as const))
    );
    if (!activeMutagenEntry || ZIWEI_TRANSFORMATION_IDS.some(
      (transformationId) => actualMutagens.get(transformationId) !== activeMutagenEntry.transformations[transformationId]
    )) {
      context.addIssue({
        code: "custom",
        path: ["facts", "palaces"],
        message: "本命四化事实必须匹配完整规则快照中出生年干对应的四化表"
      });
    }

    const periods = value.facts.majorPeriods;
    addDuplicateIssue(periods.map((item) => String(item.sequence)), context, ["facts", "majorPeriods"], "大限序号不能重复");
    addDuplicateIssue(periods.map((item) => item.palaceRoleId), context, ["facts", "majorPeriods"], "大限宫位不能重复");
    if (new Set(periods.map((item) => item.direction)).size !== 1) {
      context.addIssue({ code: "custom", path: ["facts", "majorPeriods"], message: "同一本命大限方向必须一致" });
    }
    if (value.facts.directionBasis.sexForCalculation !== value.input.sexForCalculation) {
      context.addIssue({ code: "custom", path: ["facts", "directionBasis", "sexForCalculation"], message: "大限方向依据必须绑定排盘用性别参数" });
    }
    const expectedYearGanzhi = `${value.facts.directionBasis.yearStemId}_${value.facts.directionBasis.yearBranchId}`;
    if (value.facts.calendarFacts.ganzhi.year !== expectedYearGanzhi) {
      context.addIssue({
        code: "custom",
        path: ["facts", "directionBasis"],
        message: "The major-period direction basis must bind the resolved natal year ganzhi"
      });
    }
    const yangBranches = new Set(["zi", "yin", "chen", "wu", "shen", "xu"]);
    const expectedPolarity = yangBranches.has(value.facts.directionBasis.yearBranchId) ? "yang" : "yin";
    if (value.facts.directionBasis.yearPolarity !== expectedPolarity) {
      context.addIssue({
        code: "custom",
        path: ["facts", "directionBasis", "yearPolarity"],
        message: "Year polarity must be derived from the natal earthly branch"
      });
    }
    const sexPolarity = value.input.sexForCalculation === "male" ? "yang" : "yin";
    const expectedDirection = expectedPolarity === sexPolarity ? "forward" : "backward";
    if (value.facts.directionBasis.resolvedDirection !== expectedDirection
      || periods.some((period) => period.direction !== expectedDirection)) {
      context.addIssue({
        code: "custom",
        path: ["facts", "directionBasis", "resolvedDirection"],
        message: "Major-period direction must follow natal-year-branch polarity and calculation sex"
      });
    }
    const bureauStartAge = {
      water_2: 2,
      wood_3: 3,
      metal_4: 4,
      earth_5: 5,
      fire_6: 6
    }[value.facts.fiveElementBureauId];
    const lifePalaceIndex = palaces.findIndex((palace) => palace.roleId === "life");
    const direction = periods[0]?.direction;
    periods.forEach((period, index) => {
      if (period.sequence !== index + 1) {
        context.addIssue({ code: "custom", path: ["facts", "majorPeriods", index, "sequence"], message: "大限数组顺序必须与从一开始的序号一致" });
      }
      const expectedStartAge = bureauStartAge + index * 10;
      if (period.startAge !== expectedStartAge || period.endAge !== expectedStartAge + 9) {
        context.addIssue({ code: "custom", path: ["facts", "majorPeriods", index], message: "大限必须按五行局虚岁起点连续保存十二个十年区间" });
      }
      const offset = direction === "backward" ? -index : index;
      const palace = palaces[(lifePalaceIndex + offset + palaces.length) % palaces.length];
      if (!palace || period.palaceRoleId !== palace.roleId
        || period.heavenlyStemId !== palace.heavenlyStemId
        || period.earthlyBranchId !== palace.earthlyBranchId) {
        context.addIssue({ code: "custom", path: ["facts", "majorPeriods", index, "palaceRoleId"], message: "大限必须从命宫按声明方向绑定十二宫干支" });
      }
    });

    const sourceIds = new Set(value.ruleSnapshot.sourceCatalog.map((item) => item.sourceId));
    value.provenance.forEach((entry, index) => {
      entry.sourceIds.forEach((sourceId) => {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({ code: "custom", path: ["provenance", index, "sourceIds"], message: `事实引用了未登记来源 ${sourceId}` });
        }
      });
    });
    addDuplicateIssue(
      value.provenance.map((item) => `${item.factFamily}\u0000${item.fieldPath}`),
      context,
      ["provenance"],
      "The same fact family and field path may have only one provenance entry"
    );
    const coveredFamilies = new Set(value.provenance.map((item) => item.factFamily));
    value.ruleSnapshot.rules.enabledFactFamilies.forEach((family) => {
      if (!coveredFamilies.has(family)) {
        context.addIssue({ code: "custom", path: ["provenance"], message: `已启用事实族缺少 provenance：${family}` });
      }
    });

    const engine = value.ruleSnapshot.engine;
    const receiptEngine = value.receipt.engine;
    if (engine.adapterId !== receiptEngine.adapterId || engine.adapterVersion !== receiptEngine.adapterVersion
      || engine.upstreamName !== receiptEngine.upstreamName || engine.upstreamVersion !== receiptEngine.upstreamVersion
      || engine.upstreamCommit !== receiptEngine.upstreamCommit
      || engine.upstreamNpmIntegrity !== receiptEngine.upstreamNpmIntegrity
      || engine.dependencyGraphSha256 !== receiptEngine.dependencyGraphSha256
      || engine.adapterSourceSha256 !== receiptEngine.adapterSourceSha256
      || engine.workerEntrySha256 !== receiptEngine.workerEntrySha256
      || engine.workerProtocolVersion !== receiptEngine.workerProtocolVersion
      || engine.isolation !== receiptEngine.isolation) {
      context.addIssue({ code: "custom", path: ["receipt", "engine"], message: "计算回执必须绑定完整规则快照中的同一引擎" });
    }
    if (value.ruleSnapshot.profileId !== value.receipt.profileId
      || value.ruleSnapshot.profileVersion !== value.receipt.profileVersion
      || value.ruleSnapshot.ruleSnapshotSha256 !== value.receipt.ruleSnapshotSha256) {
      context.addIssue({ code: "custom", path: ["receipt", "profileId"], message: "计算回执必须绑定完整规则快照身份和摘要" });
    }

    if (value.evidence.truthStatus === "official_calendar"
      && value.evidence.claimScopes.some((scope) => scope !== "calendar_resolution")) {
      context.addIssue({
        code: "custom",
        path: ["evidence", "claimScopes"],
        message: "官方历法只能证明历法解析，不能替紫微安星或解释背书"
      });
    }
    if (value.evidence.truthStatus === "synthetic_contract_fixture"
      && (value.evidence.claimScopes.length !== 1 || value.evidence.claimScopes[0] !== "fixture_structure")) {
      context.addIssue({ code: "custom", path: ["evidence", "claimScopes"], message: "手写合成样例只能声明契约结构" });
    }
    const ruleReviewers = new Set(
      value.ruleSnapshot.review.attestations
        .filter((attestation) => attestation.scope === "rule_profile")
        .map((attestation) => attestation.reviewerId)
    );
    if (value.evidence.truthStatus === "expert_reviewed_rule") {
      if (value.evidence.claimScopes.some((scope) => scope !== "rule_profile")) {
        context.addIssue({
          code: "custom",
          path: ["evidence", "claimScopes"],
          message: "专家规则复核只能声明已签署的 rule_profile 范围，不能替历法、整盘结构或适配器行为背书"
        });
      }
      if (ruleReviewers.size < 2) {
        context.addIssue({
          code: "custom",
          path: ["ruleSnapshot", "review", "attestations"],
          message: "专家规则样例必须有至少两名不同审核者明确签署 rule_profile 范围"
        });
      }
    }
  });

export type ZiweiBirthInputDraft = z.infer<typeof ziweiBirthInputDraftSchema>;
export type ZiweiRuleSnapshotDraft = z.infer<typeof ziweiRuleSnapshotDraftSchema>;
export type ZiweiNatalFactsDraft = z.infer<typeof ziweiNatalFactsDraftSchema>;
export type ZiweiNatalFixtureDraft = z.infer<typeof ziweiNatalFixtureDraftSchema>;

export type ZiweiNatalFixtureDigestSet = Readonly<{
  inputSha256: string;
  ruleSnapshotSha256: string;
  factsSha256: string;
  artifactSha256: string;
}>;

export type ZiweiNatalFixtureDigestMismatch = Readonly<{
  fieldPath:
    | "receipt.inputSha256"
    | "ruleSnapshot.ruleSnapshotSha256"
    | "receipt.ruleSnapshotSha256"
    | "receipt.factsSha256"
    | "receipt.artifactSha256";
  expected: string;
  actual: string;
}>;

export type ZiweiNatalFixtureVerificationResult =
  | Readonly<{
      success: true;
      data: ZiweiNatalFixtureDraft;
      digests: ZiweiNatalFixtureDigestSet;
    }>
  | Readonly<{
      success: false;
      reason: "schema_invalid";
      error: z.ZodError<ZiweiNatalFixtureDraft>;
    }>
  | Readonly<{
      success: false;
      reason: "not_canonical_json_value" | "schema_normalized_input" | "digest_calculation_failed";
      message: string;
    }>
  | Readonly<{
      success: false;
      reason: "digest_mismatch";
      mismatches: readonly ZiweiNatalFixtureDigestMismatch[];
    }>;

/**
 * Project-defined canonical JSON v1:
 * - null/boolean/string/finite-number use JSON.stringify encoding;
 * - arrays preserve order and must be dense JSON arrays;
 * - plain-object keys are sorted by JavaScript UTF-16 code-unit order;
 * - undefined, bigint, symbols, accessors, cycles and non-plain objects fail closed.
 */
export function canonicalizeZiweiDigestJson(value: unknown): string {
  return canonicalizeJsonValue(value, "$", new WeakSet<object>());
}

export async function sha256ZiweiCanonicalJson(value: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("当前运行环境不提供 WebCrypto SubtleCrypto；摘要门失败关闭");
  const bytes = new TextEncoder().encode(canonicalizeZiweiDigestJson(value));
  const digest = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The input digest covers every field of the normalized birth-input contract. */
export function projectZiweiInputForDigest(input: ZiweiBirthInputDraft): ZiweiBirthInputDraft {
  return input;
}

/** The rule digest covers every rule-snapshot field except its own digest. */
export function projectZiweiRuleSnapshotForDigest(
  ruleSnapshot: ZiweiRuleSnapshotDraft
): Omit<ZiweiRuleSnapshotDraft, "ruleSnapshotSha256"> {
  const { ruleSnapshotSha256: _excludedSelfDigest, ...projection } = ruleSnapshot;
  return projection;
}

/** The facts digest covers every normalized fact field. */
export function projectZiweiFactsForDigest(facts: ZiweiNatalFactsDraft): ZiweiNatalFactsDraft {
  return facts;
}

/**
 * The artifact digest covers the complete artifact, including provenance, evidence and
 * receipt metadata, while excluding only the four receipt digest values. The embedded,
 * already-verified ruleSnapshot.ruleSnapshotSha256 remains covered.
 */
export function projectZiweiArtifactForDigest(fixture: ZiweiNatalFixtureDraft): unknown {
  const {
    inputSha256: _excludedInputDigest,
    ruleSnapshotSha256: _excludedRuleDigest,
    factsSha256: _excludedFactsDigest,
    artifactSha256: _excludedSelfDigest,
    ...receiptWithoutDigests
  } = fixture.receipt;

  return {
    contractVersion: fixture.contractVersion,
    systemId: fixture.systemId,
    artifactKind: fixture.artifactKind,
    input: fixture.input,
    ruleSnapshot: fixture.ruleSnapshot,
    facts: fixture.facts,
    provenance: fixture.provenance,
    evidence: fixture.evidence,
    receipt: receiptWithoutDigests
  };
}

/**
 * Calculates all four digests over the artifact exactly as supplied. A fixture creator must
 * store the freshly calculated rule digest in ruleSnapshot.ruleSnapshotSha256 before using
 * the returned artifact digest; the verifier independently rejects any stale embedded value.
 */
export async function calculateZiweiNatalFixtureDigests(
  fixture: ZiweiNatalFixtureDraft
): Promise<ZiweiNatalFixtureDigestSet> {
  const [inputSha256, ruleSnapshotSha256, factsSha256] = await Promise.all([
    sha256ZiweiCanonicalJson(projectZiweiInputForDigest(fixture.input)),
    sha256ZiweiCanonicalJson(projectZiweiRuleSnapshotForDigest(fixture.ruleSnapshot)),
    sha256ZiweiCanonicalJson(projectZiweiFactsForDigest(fixture.facts))
  ]);
  const artifactSha256 = await sha256ZiweiCanonicalJson(
    projectZiweiArtifactForDigest(fixture)
  );

  return Object.freeze({ inputSha256, ruleSnapshotSha256, factsSha256, artifactSha256 });
}

/**
 * The only acceptance gate for a Ziwei fixture draft. A successful Zod parse alone proves
 * structure only; this gate also requires the raw JSON value to survive normalization
 * unchanged and recomputes all four canonical SHA-256 digests.
 */
export async function verifyZiweiNatalFixtureDraft(
  candidate: unknown
): Promise<ZiweiNatalFixtureVerificationResult> {
  const parsed = ziweiNatalFixtureDraftSchema.safeParse(candidate);
  if (!parsed.success) {
    return { success: false, reason: "schema_invalid", error: parsed.error };
  }

  let rawCanonicalJson: string;
  let parsedCanonicalJson: string;
  try {
    rawCanonicalJson = canonicalizeZiweiDigestJson(candidate);
    parsedCanonicalJson = canonicalizeZiweiDigestJson(parsed.data);
  } catch (error) {
    return {
      success: false,
      reason: "digest_calculation_failed",
      message: error instanceof Error ? error.message : "值不是可规范化的 JSON"
    };
  }
  if (rawCanonicalJson !== parsedCanonicalJson) {
    return {
      success: false,
      reason: "schema_normalized_input",
      message: "原始值经过 Schema 规范化后发生变化；请先保存规范化值并重新计算摘要"
    };
  }

  let digests: ZiweiNatalFixtureDigestSet;
  try {
    digests = await calculateZiweiNatalFixtureDigests(parsed.data);
  } catch (error) {
    return {
      success: false,
      reason: "not_canonical_json_value",
      message: error instanceof Error ? error.message : "摘要重算失败"
    };
  }
  const mismatches: ZiweiNatalFixtureDigestMismatch[] = [];
  addDigestMismatch(mismatches, "receipt.inputSha256", digests.inputSha256, parsed.data.receipt.inputSha256);
  addDigestMismatch(
    mismatches,
    "ruleSnapshot.ruleSnapshotSha256",
    digests.ruleSnapshotSha256,
    parsed.data.ruleSnapshot.ruleSnapshotSha256
  );
  addDigestMismatch(
    mismatches,
    "receipt.ruleSnapshotSha256",
    digests.ruleSnapshotSha256,
    parsed.data.receipt.ruleSnapshotSha256
  );
  addDigestMismatch(mismatches, "receipt.factsSha256", digests.factsSha256, parsed.data.receipt.factsSha256);
  addDigestMismatch(
    mismatches,
    "receipt.artifactSha256",
    digests.artifactSha256,
    parsed.data.receipt.artifactSha256
  );

  return mismatches.length > 0
    ? { success: false, reason: "digest_mismatch", mismatches }
    : { success: true, data: parsed.data, digests };
}

function addDigestMismatch(
  mismatches: ZiweiNatalFixtureDigestMismatch[],
  fieldPath: ZiweiNatalFixtureDigestMismatch["fieldPath"],
  expected: string,
  actual: string
): void {
  if (expected !== actual) mismatches.push({ fieldPath, expected, actual });
}

function canonicalizeJsonValue(value: unknown, path: string, ancestors: WeakSet<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} 必须是有限 JSON 数字`);
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} 包含 JSON 不支持的 ${typeof value}`);
  }
  if (ancestors.has(value)) throw new TypeError(`${path} 包含循环引用`);
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new TypeError(`${path} 的数组不能包含 symbol 属性`);
      }
      const ownPropertyNames = Object.getOwnPropertyNames(value);
      if (ownPropertyNames.length !== value.length + 1
        || ownPropertyNames[value.length] !== "length") {
        throw new TypeError(`${path} 必须是无空洞、无附加属性的 JSON 数组`);
      }
      const items = Array.from({ length: value.length }, (_, index) => {
        if (ownPropertyNames[index] !== String(index)) {
          throw new TypeError(`${path} 必须是无空洞、无附加属性的 JSON 数组`);
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !("value" in descriptor)) {
          throw new TypeError(`${path}[${index}] 必须是可枚举的数据属性`);
        }
        return canonicalizeJsonValue(descriptor.value, `${path}[${index}]`, ancestors);
      });
      return `[${items.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} 必须是普通 JSON 对象`);
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new TypeError(`${path} 不能包含 symbol 属性`);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors).sort();
    const pairs = keys.map((key) => {
      const descriptor = descriptors[key]!;
      if (!descriptor.enumerable || !("value" in descriptor)) {
        throw new TypeError(`${path}.${key} 必须是可枚举的数据属性`);
      }
      return `${JSON.stringify(key)}:${canonicalizeJsonValue(descriptor.value, `${path}.${key}`, ancestors)}`;
    });
    return `{${pairs.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}
