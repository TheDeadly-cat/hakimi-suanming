import { z } from "zod";

export const WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION = "0.1.0-draft.1" as const;
export const WESTERN_ASTROLOGY_SYSTEM_ID = "western-astrology" as const;
export const WESTERN_ASTROLOGY_DRAFT_MVP_RANGE = Object.freeze({
  from: "1900-01-01",
  to: "2100-12-31"
} as const);

export const WESTERN_BODY_IDS = Object.freeze([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
] as const);

const semanticVersionSchema = z.string().regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const stableIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/).max(180);
const sourceIdSchema = z.string().regex(/^source:[a-z0-9][a-z0-9._-]*$/).max(180);
const ianaTimeZoneSchema = z.string().regex(/^(?:UTC|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+)$/).max(120);
const identifiedTzdbSnapshotIdSchema = z.string().min(1).max(300).regex(
  /^iana-tzdb@\d{4}[a-z]\/sha256:[a-f0-9]{64}\/[a-z0-9-]+@\d+\.\d+\.\d+\/[a-z0-9-]+@\d+\.\d+\.\d+$/
);
const lowerShaOrNullSchema = sha256Schema.nullable();
const longitudeSchema = z.number().finite().min(0).lt(360);
const separationSchema = z.number().finite().min(0).max(180);
const SECONDS_PER_DAY = 86_400;
const UNIX_EPOCH_JULIAN_DAY = 2_440_587.5;
const JULIAN_DAY_TOLERANCE_DAYS = 1e-9;
const gregorianDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidGregorianDate, "日期必须是有效的公历 YYYY-MM-DD");
const minuteTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const secondTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);

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

function nearlyEqual(left: number, right: number, tolerance = 1e-8): boolean {
  return Math.abs(left - right) <= tolerance;
}

function unixMillisecondsToJulianDay(value: number): number {
  return value / (SECONDS_PER_DAY * 1_000) + UNIX_EPOCH_JULIAN_DAY;
}

function signedLongitudeDifference(fromDeg: number, toDeg: number): number {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

export const westernDraftSourceReferenceSchema = z.strictObject({
  sourceId: sourceIdSchema,
  kind: z.enum([
    "ephemeris_documentation",
    "time_standard",
    "reference_frame_standard",
    "implementation_reference",
    "astrology_rule_reference",
    "license"
  ]),
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(200),
  url: z.string().url().max(2_000),
  versionOrDate: z.string().trim().min(1).max(120).nullable(),
  retrievedAt: z.string().datetime({ offset: true }),
  usage: z.enum(["link_only", "astronomical_fixture", "adapter_behavior", "rule_review"]),
  rightsStatus: z.enum([
    "public_technical_reference",
    "link_only_unreviewed",
    "license_terms_recorded",
    "redistribution_review_required"
  ]),
  notes: z.string().trim().max(1_000)
});

export const westernDraftReviewSchema = z
  .strictObject({
    status: z.enum(["unreviewed", "single_reviewed", "double_reviewed"]),
    attestations: z.array(z.strictObject({
      reviewerId: stableIdSchema,
      reviewedAt: z.string().datetime({ offset: true }),
      scope: z.enum(["astronomy", "time", "astrology_profile", "fixture_structure"]),
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

export const westernBirthInputDraftSchema = z
  .strictObject({
    contractVersion: z.literal(WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
    calendar: z.literal("proleptic_gregorian"),
    date: gregorianDateSchema,
    time: z.string(),
    timePrecision: z.enum(["exact_minute", "exact_second"]),
    timeZone: ianaTimeZoneSchema,
    dstDisambiguation: z.enum(["reject", "earlier", "later"]),
    location: z.strictObject({
      label: z.string().trim().max(120),
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
      elevationMeters: z.number().finite().min(-500).max(10_000).nullable(),
      precision: z.literal("coordinates")
    }),
    birthSourceRef: stableIdSchema,
    sourceNote: z.string().trim().max(1_000)
  })
  .superRefine((value, context) => {
    const validTime = value.timePrecision === "exact_minute"
      ? minuteTimeSchema.safeParse(value.time).success
      : secondTimeSchema.safeParse(value.time).success;
    if (!validTime) {
      context.addIssue({ code: "custom", path: ["time"], message: "时间格式必须与声明的精度一致" });
    }
    if (value.date < WESTERN_ASTROLOGY_DRAFT_MVP_RANGE.from || value.date > WESTERN_ASTROLOGY_DRAFT_MVP_RANGE.to) {
      context.addIssue({
        code: "custom",
        path: ["date"],
        message: "草案首版只接受现有冻结时区工件可覆盖的 1900-01-01 至 2100-12-31"
      });
    }
  });

const westernTargetBindingDraftSchema = z.strictObject({
  bodyId: z.enum(WESTERN_BODY_IDS),
  providerTargetId: z.string().trim().min(1).max(120),
  targetCenterKind: z.enum(["body_center", "system_barycenter"])
});

const westernTargetInventoryDraftSchema = z.strictObject({
  artifactContentSha256: sha256Schema,
  extractionAlgorithmId: stableIdSchema,
  targets: z.array(westernTargetBindingDraftSchema).min(1).max(100)
}).superRefine((value, context) => {
  addDuplicateIssue(value.targets.map((target) => target.bodyId), context, ["targets"], "target inventory 天体不能重复");
  addDuplicateIssue(
    value.targets.map((target) => `${target.providerTargetId}:${target.targetCenterKind}`),
    context,
    ["targets"],
    "target inventory 提供者目标与中心身份不能重复"
  );
});

const westernArtifactBindingDraftSchema = z.strictObject({
  role: z.enum(["planetary_ephemeris", "satellite_ephemeris", "frame", "leap_seconds", "earth_orientation"]),
  datasetId: stableIdSchema,
  sourceId: sourceIdSchema,
  contentSha256: sha256Schema,
  coverageFrom: gregorianDateSchema,
  coverageTo: gregorianDateSchema,
  rightsLedgerRef: stableIdSchema,
  targetInventory: westernTargetInventoryDraftSchema.nullable()
}).superRefine((value, context) => {
  if (value.coverageTo < value.coverageFrom) {
    context.addIssue({ code: "custom", path: ["coverageTo"], message: "工件覆盖终点不能早于起点" });
  }
  const isEphemeris = value.role === "planetary_ephemeris" || value.role === "satellite_ephemeris";
  if (isEphemeris && value.targetInventory === null) {
    context.addIssue({ code: "custom", path: ["targetInventory"], message: "星历工件必须声明可审计 target inventory" });
  }
  if (!isEphemeris && value.targetInventory !== null) {
    context.addIssue({ code: "custom", path: ["targetInventory"], message: "非星历工件不得携带天体 target inventory" });
  }
  if (value.targetInventory !== null
    && value.targetInventory.artifactContentSha256 !== value.contentSha256) {
    context.addIssue({
      code: "custom",
      path: ["targetInventory", "artifactContentSha256"],
      message: "target inventory 必须绑定同一星历工件内容摘要"
    });
  }
});

type WesternArtifactBindingDraft = z.infer<typeof westernArtifactBindingDraftSchema>;

function artifactBindingKey(value: WesternArtifactBindingDraft): string {
  return `${value.role}:${value.datasetId}`;
}

function artifactBindingsEqual(left: WesternArtifactBindingDraft, right: WesternArtifactBindingDraft): boolean {
  return left.role === right.role
    && left.datasetId === right.datasetId
    && left.sourceId === right.sourceId
    && left.contentSha256 === right.contentSha256
    && left.coverageFrom === right.coverageFrom
    && left.coverageTo === right.coverageTo
    && left.rightsLedgerRef === right.rightsLedgerRef
    && JSON.stringify(left.targetInventory) === JSON.stringify(right.targetInventory);
}

const westernAspectDefinitionDraftSchema = z.strictObject({
  aspectId: stableIdSchema,
  exactAngleDeg: separationSchema,
  maxOrbDeg: z.number().finite().min(0).max(30)
});

export const westernCalculationProfileDraftSchema = z
  .strictObject({
    contractVersion: z.literal(WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
    profileId: stableIdSchema,
    profileVersion: semanticVersionSchema,
    status: z.literal("contract_draft"),
    supportedRange: z.strictObject({
      from: gregorianDateSchema,
      to: gregorianDateSchema,
      outsideRangePolicy: z.literal("reject")
    }),
    astronomy: z.strictObject({
      targets: z.array(westernTargetBindingDraftSchema).min(1).max(WESTERN_BODY_IDS.length),
      observerOrigin: z.enum(["geocenter", "topocenter"]),
      baseFrame: z.literal("ICRF"),
      outputEcliptic: z.enum([
        "true_ecliptic_equinox_of_date",
        "mean_ecliptic_equinox_of_date",
        "ecliptic_j2000"
      ]),
      lightTime: z.enum(["none", "one_iteration", "converged"]),
      stellarAberration: z.boolean(),
      solarGravitationalDeflection: z.literal(false),
      frameTransformAlgorithmId: stableIdSchema
    }),
    zodiac: z.discriminatedUnion("kind", [
      z.strictObject({ kind: z.literal("tropical"), ayanamshaId: z.null(), algorithmId: stableIdSchema }),
      z.strictObject({ kind: z.literal("sidereal"), ayanamshaId: stableIdSchema, algorithmId: stableIdSchema })
    ]),
    houses: z.strictObject({
      systemId: stableIdSchema,
      equator: z.enum(["true_of_date", "mean_of_date"]),
      algorithmId: stableIdSchema,
      unavailablePolicy: z.literal("reject"),
      fallbackPolicy: z.literal("reject")
    }).nullable(),
    aspects: z.strictObject({
      coordinateBasis: z.literal("ecliptic_longitude"),
      definitions: z.array(westernAspectDefinitionDraftSchema).min(1).max(50),
      motionAlgorithmId: z.literal("instantaneous_relative_longitude_speed_v1")
    }),
    ephemeris: z.strictObject({
      provider: z.enum(["jpl_spice", "swiss_ephemeris"]),
      engineName: z.string().trim().min(1).max(120),
      engineVersion: semanticVersionSchema,
      adapterVersion: semanticVersionSchema,
      datasetId: stableIdSchema,
      requiredArtifacts: z.array(westernArtifactBindingDraftSchema).min(1).max(100),
      fallbackPolicy: z.literal("reject"),
      providerRightsReview: z.enum(["blocked_pending_review", "local_evaluation_only"])
    }),
    timePolicy: z.strictObject({
      timeScaleAdapterId: stableIdSchema,
      leapSecondPolicy: z.literal("pinned_snapshot"),
      eopPreference: z.array(z.enum(["final", "rapid", "predicted", "modeled"])).min(1).max(4),
      missingEopPolicy: z.literal("reject")
    }),
    sourceCatalog: z.array(westernDraftSourceReferenceSchema).min(1).max(100),
    review: westernDraftReviewSchema,
    profileSha256: sha256Schema,
    interpretationIncluded: z.literal(false)
  })
  .superRefine((value, context) => {
    if (value.supportedRange.to < value.supportedRange.from) {
      context.addIssue({ code: "custom", path: ["supportedRange", "to"], message: "支持区间终点不能早于起点" });
    }
    if (value.supportedRange.from < WESTERN_ASTROLOGY_DRAFT_MVP_RANGE.from
      || value.supportedRange.to > WESTERN_ASTROLOGY_DRAFT_MVP_RANGE.to) {
      context.addIssue({
        code: "custom",
        path: ["supportedRange"],
        message: "草案 profile 不能越过当前冻结时区工件的 1900 至 2100 边界"
      });
    }
    addDuplicateIssue(value.astronomy.targets.map((item) => item.bodyId), context, ["astronomy", "targets"], "天体目标不能重复");
    addDuplicateIssue(value.aspects.definitions.map((item) => item.aspectId), context, ["aspects", "definitions"], "相位定义 ID 不能重复");
    addDuplicateIssue(value.timePolicy.eopPreference, context, ["timePolicy", "eopPreference"], "EOP 优先级不能重复");
    addDuplicateIssue(value.sourceCatalog.map((item) => item.sourceId), context, ["sourceCatalog"], "来源 ID 不能重复");
    addDuplicateIssue(
      value.ephemeris.requiredArtifacts.map((item) => `${item.role}:${item.datasetId}`),
      context,
      ["ephemeris", "requiredArtifacts"],
      "同一角色和数据集的工件不能重复"
    );
    const planetaryArtifacts = value.ephemeris.requiredArtifacts.filter((item) => item.role === "planetary_ephemeris");
    if (planetaryArtifacts.length !== 1 || planetaryArtifacts[0]?.datasetId !== value.ephemeris.datasetId) {
      context.addIssue({
        code: "custom",
        path: ["ephemeris", "datasetId"],
        message: "profile 数据集必须精确绑定唯一的 planetary_ephemeris 工件"
      });
    }
    for (const requiredRole of ["leap_seconds", "earth_orientation"] as const) {
      if (!value.ephemeris.requiredArtifacts.some((artifact) => artifact.role === requiredRole)) {
        context.addIssue({
          code: "custom",
          path: ["ephemeris", "requiredArtifacts"],
          message: `成功时间回执必须预先固定 ${requiredRole} 工件`
        });
      }
    }
    const ephemerisArtifacts = value.ephemeris.requiredArtifacts.filter((artifact) => (
      artifact.role === "planetary_ephemeris" || artifact.role === "satellite_ephemeris"
    ));
    value.astronomy.targets.forEach((target, index) => {
      const presentInInventory = ephemerisArtifacts.some((artifact) => artifact.targetInventory?.targets.some(
        (available) => available.bodyId === target.bodyId
          && available.providerTargetId === target.providerTargetId
          && available.targetCenterKind === target.targetCenterKind
      ));
      if (!presentInInventory) {
        context.addIssue({
          code: "custom",
          path: ["astronomy", "targets", index],
          message: "profile 天体目标必须存在于已固定 planetary/satellite 星历工件的 target inventory"
        });
      }
    });
    const knownSources = new Set(value.sourceCatalog.map((item) => item.sourceId));
    value.ephemeris.requiredArtifacts.forEach((artifact, index) => {
      if (!knownSources.has(artifact.sourceId)) {
        context.addIssue({ code: "custom", path: ["ephemeris", "requiredArtifacts", index, "sourceId"], message: "星历工件引用了未登记来源" });
      }
      if (artifact.coverageFrom > value.supportedRange.from || artifact.coverageTo < value.supportedRange.to) {
        context.addIssue({
          code: "custom",
          path: ["ephemeris", "requiredArtifacts", index],
          message: "每个必需工件必须覆盖 profile 的完整支持区间"
        });
      }
    });
  });

const westernBodyFactDraftSchema = z.strictObject({
  bodyId: z.enum(WESTERN_BODY_IDS),
  providerTargetId: z.string().trim().min(1).max(120),
  targetCenterKind: z.enum(["body_center", "system_barycenter"]),
  observerOrigin: z.enum(["geocenter", "topocenter"]),
  ecliptic: z.strictObject({
    longitudeDeg: longitudeSchema,
    latitudeDeg: z.number().finite().min(-90).max(90),
    distanceAu: z.number().finite().positive(),
    longitudeSpeedDegPerDay: z.number().finite(),
    latitudeSpeedDegPerDay: z.number().finite(),
    distanceSpeedAuPerDay: z.number().finite()
  }),
  equatorial: z.strictObject({
    rightAscensionDeg: longitudeSchema,
    declinationDeg: z.number().finite().min(-90).max(90)
  }).nullable(),
  zodiac: z.strictObject({
    longitudeDeg: longitudeSchema,
    signIndex: z.number().int().min(0).max(11),
    degreeWithinSign: z.number().finite().min(0).lt(30),
    ayanamshaDeg: z.number().finite().min(0).lt(360).nullable()
  }),
  retrograde: z.boolean()
});

const westernComputedHouseFactsDraftSchema = z.strictObject({
  status: z.literal("computed"),
  systemId: stableIdSchema,
  cusps: z.array(z.strictObject({
    houseNumber: z.number().int().min(1).max(12),
    longitudeDeg: longitudeSchema
  })).length(12),
  angles: z.strictObject({
    ascendantDeg: longitudeSchema,
    midheavenDeg: longitudeSchema,
    descendantDeg: longitudeSchema,
    imumCoeliDeg: longitudeSchema,
    vertexDeg: longitudeSchema.nullable()
  }),
  armcDeg: longitudeSchema,
  algorithmId: stableIdSchema,
  fallbackUsed: z.literal(false)
});

const westernAspectFactDraftSchema = z.strictObject({
  bodyA: z.enum(WESTERN_BODY_IDS),
  bodyB: z.enum(WESTERN_BODY_IDS),
  aspectId: stableIdSchema,
  exactAngleDeg: separationSchema,
  separationDeg: separationSchema,
  directedOrbDeg: z.number().finite().min(-180).max(180),
  orbDeg: z.number().finite().min(0).max(180),
  maxOrbDeg: z.number().finite().min(0).max(30),
  motion: z.enum(["exact", "applying", "separating", "indeterminate"])
});

export const westernTimeProvenanceDraftSchema = z.strictObject({
  utcInstant: z.string().datetime({ offset: true }),
  utcOffsetSeconds: z.number().int().min(-18 * 3_600).max(18 * 3_600),
  dstResolution: z.strictObject({
    status: z.literal("resolved"),
    choice: z.enum(["unique", "earlier", "later"]),
    timeZone: ianaTimeZoneSchema,
    tzdbSnapshotId: identifiedTzdbSnapshotIdSchema
  }),
  taiMinusUtcSeconds: z.number().finite(),
  dut1Seconds: z.number().finite(),
  deltaTSeconds: z.number().finite(),
  tdbMinusTtSeconds: z.number().finite(),
  julianDay: z.strictObject({
    ut1: z.number().finite(),
    tt: z.number().finite(),
    tdb: z.number().finite()
  }),
  leapSeconds: z.strictObject({
    datasetId: stableIdSchema,
    contentSha256: sha256Schema,
    validThrough: gregorianDateSchema
  }),
  earthOrientation: z.strictObject({
    provider: z.literal("IERS"),
    productId: stableIdSchema,
    status: z.enum(["final", "rapid", "predicted", "modeled"]),
    issueDate: gregorianDateSchema,
    sampleMjd: z.number().finite(),
    sourceUrl: z.string().url().max(2_000),
    contentSha256: sha256Schema,
    polarMotionXArcsec: z.number().finite().nullable(),
    polarMotionYArcsec: z.number().finite().nullable()
  })
}).superRefine((value, context) => {
  if (!nearlyEqual(value.deltaTSeconds, 32.184 + value.taiMinusUtcSeconds - value.dut1Seconds, 1e-6)) {
    context.addIssue({
      code: "custom",
      path: ["deltaTSeconds"],
      message: "deltaT 必须与 TT=TAI+32.184 秒及 UT1-UTC 回执一致"
    });
  }
  const utcMilliseconds = Date.parse(value.utcInstant);
  const utcJulianDay = unixMillisecondsToJulianDay(utcMilliseconds);
  const expectedUt1 = utcJulianDay + value.dut1Seconds / SECONDS_PER_DAY;
  const expectedTt = utcJulianDay + (value.taiMinusUtcSeconds + 32.184) / SECONDS_PER_DAY;
  const expectedTdb = expectedTt + value.tdbMinusTtSeconds / SECONDS_PER_DAY;
  const expectedJulianDays = [
    ["ut1", expectedUt1],
    ["tt", expectedTt],
    ["tdb", expectedTdb]
  ] as const;
  for (const [scale, expected] of expectedJulianDays) {
    if (!nearlyEqual(value.julianDay[scale], expected, JULIAN_DAY_TOLERANCE_DAYS)) {
      context.addIssue({
        code: "custom",
        path: ["julianDay", scale],
        message: `${scale.toUpperCase()} Julian Day 必须由 UTC 回执及对应时间尺度差值派生`
      });
    }
  }
});

const optionValueSchema = z.union([z.string(), z.number().finite(), z.boolean()]);

export const westernEphemerisProvenanceDraftSchema = z.strictObject({
  provider: z.enum(["jpl_spice", "swiss_ephemeris"]),
  engineName: z.string().trim().min(1).max(120),
  engineVersion: semanticVersionSchema,
  adapterVersion: semanticVersionSchema,
  datasetId: stableIdSchema,
  artifacts: z.array(westernArtifactBindingDraftSchema).min(1).max(100),
  requestedOptions: z.record(z.string(), optionValueSchema),
  effectiveOptions: z.record(z.string(), optionValueSchema),
  returnedFlags: z.array(z.string().trim().min(1).max(120)).max(100),
  fallbackUsed: z.literal(false),
  backendWarnings: z.array(z.string().trim().min(1).max(500)).max(100)
});

export const westernFactProvenanceDraftSchema = z.strictObject({
  fieldPath: z.string().regex(/^facts(?:\.[a-zA-Z0-9_-]+|\[\d+\])+$/).max(300),
  kind: z.enum(["ephemeris_fact", "time_derived", "astrology_rule_derived"]),
  algorithmId: stableIdSchema,
  sourceIds: z.array(sourceIdSchema).min(1).max(50),
  verificationStatus: z.literal("engineering_preview")
});

export const westernFixtureEvidenceDraftSchema = z.strictObject({
  evidenceStatus: z.enum([
    "synthetic_contract_fixture",
    "astronomical_reference",
    "adapter_regression",
    "differential_diagnostic"
  ]),
  claimScopes: z.array(z.enum([
    "fixture_structure",
    "time_resolution",
    "ephemeris_position",
    "frame_transform",
    "astrology_profile_structure"
  ])).min(1).max(4),
  productionEligible: z.literal(false),
  expertTruthClaimed: z.literal(false),
  note: z.string().trim().min(1).max(1_000)
}).superRefine((value, context) => {
  if (value.evidenceStatus === "synthetic_contract_fixture"
    && (value.claimScopes.length !== 1 || value.claimScopes[0] !== "fixture_structure")) {
    context.addIssue({
      code: "custom",
      path: ["claimScopes"],
      message: "合成契约样例只能声明结构覆盖，不能冒充时间或星历数值证据"
    });
  }
});

export const westernCalculationReceiptDraftSchema = z.strictObject({
  receiptVersion: z.literal("western-calculation-receipt/0.1-draft"),
  profileId: stableIdSchema,
  profileVersion: semanticVersionSchema,
  digestAlgorithm: z.literal("sha256-canonical-json-v1"),
  digestVerification: z.literal("format_only_contract_draft"),
  inputSha256: sha256Schema,
  profileSha256: sha256Schema,
  factsSha256: sha256Schema,
  artifactSha256: sha256Schema,
  calculatedAt: z.string().datetime({ offset: true }),
  fallbackUsed: z.literal(false),
  interpretationIncluded: z.literal(false),
  warnings: z.array(z.string().trim().min(1).max(500)).max(100),
  knownGaps: z.array(z.string().trim().min(1).max(500)).min(1).max(100)
});

export const westernChartFixtureDraftSchema = z
  .strictObject({
    contractVersion: z.literal(WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION),
    systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
    artifactKind: z.literal("western_natal_engineering_fixture"),
    input: westernBirthInputDraftSchema,
    profile: westernCalculationProfileDraftSchema,
    facts: z.strictObject({
      bodies: z.array(westernBodyFactDraftSchema).min(1).max(WESTERN_BODY_IDS.length),
      houses: westernComputedHouseFactsDraftSchema.nullable(),
      aspects: z.array(westernAspectFactDraftSchema).max(500)
    }),
    timeProvenance: westernTimeProvenanceDraftSchema,
    ephemerisProvenance: westernEphemerisProvenanceDraftSchema,
    fieldProvenance: z.array(westernFactProvenanceDraftSchema).min(1).max(2_000),
    evidence: westernFixtureEvidenceDraftSchema,
    receipt: westernCalculationReceiptDraftSchema
  })
  .superRefine((value, context) => {
    if (value.input.date < value.profile.supportedRange.from || value.input.date > value.profile.supportedRange.to) {
      context.addIssue({ code: "custom", path: ["input", "date"], message: "输入日期不在 profile 的完整工件覆盖范围内" });
    }
    if (value.profile.ephemeris.providerRightsReview !== "local_evaluation_only") {
      context.addIssue({
        code: "custom",
        path: ["profile", "ephemeris", "providerRightsReview"],
        message: "未明确限定为受控本地研究时不能形成成功计算工件；该状态不代表再分发或服务许可"
      });
    }
    if (value.profile.ephemeris.provider === "swiss_ephemeris"
      || value.ephemerisProvenance.provider === "swiss_ephemeris") {
      context.addIssue({
        code: "custom",
        path: ["profile", "ephemeris", "provider"],
        message: "Swiss Ephemeris 尚无本项目许可决策与返回回执适配器，草案成功工件必须失败关闭"
      });
    }
    if (value.profile.astronomy.observerOrigin === "topocenter" && value.input.location.elevationMeters === null) {
      context.addIssue({
        code: "custom",
        path: ["input", "location", "elevationMeters"],
        message: "地表观测 profile 必须有明确海拔"
      });
    }

    const targetsByBody = new Map(value.profile.astronomy.targets.map((target) => [target.bodyId, target]));
    addDuplicateIssue(value.facts.bodies.map((item) => item.bodyId), context, ["facts", "bodies"], "天体事实不能重复");
    if (value.facts.bodies.length !== targetsByBody.size) {
      context.addIssue({ code: "custom", path: ["facts", "bodies"], message: "天体事实必须精确覆盖 profile 目标" });
    }
    value.facts.bodies.forEach((body, index) => {
      const target = targetsByBody.get(body.bodyId);
      if (!target || target.providerTargetId !== body.providerTargetId || target.targetCenterKind !== body.targetCenterKind) {
        context.addIssue({
          code: "custom",
          path: ["facts", "bodies", index],
          message: "天体事实必须绑定 profile 声明的目标 ID 与实体中心/系统质心"
        });
      }
      if (body.observerOrigin !== value.profile.astronomy.observerOrigin) {
        context.addIssue({ code: "custom", path: ["facts", "bodies", index, "observerOrigin"], message: "天体事实观测原点与 profile 不一致" });
      }
      const expectedSign = Math.floor(body.zodiac.longitudeDeg / 30);
      const expectedDegree = body.zodiac.longitudeDeg - expectedSign * 30;
      if (body.zodiac.signIndex !== expectedSign || !nearlyEqual(body.zodiac.degreeWithinSign, expectedDegree)) {
        context.addIssue({ code: "custom", path: ["facts", "bodies", index, "zodiac"], message: "星座序号和宫内度数必须由黄道经度精确派生" });
      }
      if (body.retrograde !== (body.ecliptic.longitudeSpeedDegPerDay < 0)) {
        context.addIssue({ code: "custom", path: ["facts", "bodies", index, "retrograde"], message: "逆行标志必须绑定黄经瞬时速度" });
      }
      const expectsAyanamsha = value.profile.zodiac.kind === "sidereal";
      if (expectsAyanamsha !== (body.zodiac.ayanamshaDeg !== null)) {
        context.addIssue({ code: "custom", path: ["facts", "bodies", index, "zodiac", "ayanamshaDeg"], message: "恒星黄道必须记录岁差值，热带黄道不得伪造岁差值" });
      }
      if (value.profile.zodiac.kind === "tropical"
        && !nearlyEqual(body.zodiac.longitudeDeg, body.ecliptic.longitudeDeg)) {
        context.addIssue({ code: "custom", path: ["facts", "bodies", index, "zodiac", "longitudeDeg"], message: "热带黄道经度必须与所声明的输出黄道经度一致" });
      }
      if (value.profile.zodiac.kind === "sidereal" && body.zodiac.ayanamshaDeg !== null) {
        const expectedSidereal = (body.ecliptic.longitudeDeg - body.zodiac.ayanamshaDeg + 360) % 360;
        if (!nearlyEqual(body.zodiac.longitudeDeg, expectedSidereal)) {
          context.addIssue({ code: "custom", path: ["facts", "bodies", index, "zodiac", "longitudeDeg"], message: "恒星黄道经度必须由输出黄道经度和 profile 岁差值派生" });
        }
      }
    });

    if (value.profile.houses === null && value.facts.houses !== null) {
      context.addIssue({ code: "custom", path: ["facts", "houses"], message: "profile 未启用宫位时不得生成宫位事实" });
    }
    if (value.profile.houses !== null && value.facts.houses === null) {
      context.addIssue({ code: "custom", path: ["facts", "houses"], message: "启用宫位的成功工件必须包含所选宫制，失败应返回失败关闭回执" });
    }
    if (value.profile.houses !== null && value.facts.houses !== null) {
      if (value.profile.houses.systemId !== value.facts.houses.systemId
        || value.profile.houses.algorithmId !== value.facts.houses.algorithmId) {
        context.addIssue({ code: "custom", path: ["facts", "houses"], message: "宫位事实必须绑定所选宫制和算法，不能接受后备宫制" });
      }
      addDuplicateIssue(
        value.facts.houses.cusps.map((item) => String(item.houseNumber)),
        context,
        ["facts", "houses", "cusps"],
        "十二宫序号不能重复"
      );
    }

    const bodyOrder = new Map(WESTERN_BODY_IDS.map((bodyId, index) => [bodyId, index]));
    const presentBodies = new Set(value.facts.bodies.map((item) => item.bodyId));
    const bodyFactsById = new Map(value.facts.bodies.map((item) => [item.bodyId, item]));
    const definitions = new Map(value.profile.aspects.definitions.map((definition) => [definition.aspectId, definition]));
    addDuplicateIssue(
      value.facts.aspects.map((item) => `${item.bodyA}:${item.bodyB}:${item.aspectId}`),
      context,
      ["facts", "aspects"],
      "同一天体对和相位 ID 不能重复"
    );
    value.facts.aspects.forEach((aspect, index) => {
      if (!presentBodies.has(aspect.bodyA) || !presentBodies.has(aspect.bodyB) || aspect.bodyA === aspect.bodyB) {
        context.addIssue({ code: "custom", path: ["facts", "aspects", index], message: "相位两端必须是两个已计算的不同天体" });
      }
      if ((bodyOrder.get(aspect.bodyA) ?? 999) >= (bodyOrder.get(aspect.bodyB) ?? -1)) {
        context.addIssue({ code: "custom", path: ["facts", "aspects", index, "bodyA"], message: "相位天体对必须按稳定字典顺序保存" });
      }
      const definition = definitions.get(aspect.aspectId);
      if (!definition || !nearlyEqual(aspect.exactAngleDeg, definition.exactAngleDeg)
        || !nearlyEqual(aspect.maxOrbDeg, definition.maxOrbDeg)) {
        context.addIssue({ code: "custom", path: ["facts", "aspects", index], message: "相位事实必须绑定 profile 中的角度和容许度" });
      }
      const bodyA = bodyFactsById.get(aspect.bodyA);
      const bodyB = bodyFactsById.get(aspect.bodyB);
      if (definition && bodyA && bodyB) {
        const signedSeparation = signedLongitudeDifference(
          bodyA.ecliptic.longitudeDeg,
          bodyB.ecliptic.longitudeDeg
        );
        const expectedSeparation = Math.abs(signedSeparation);
        const expectedDirectedOrb = expectedSeparation - definition.exactAngleDeg;
        const expectedOrb = Math.abs(expectedDirectedOrb);
        if (!nearlyEqual(aspect.separationDeg, expectedSeparation)) {
          context.addIssue({
            code: "custom",
            path: ["facts", "aspects", index, "separationDeg"],
            message: "相位夹角必须由两端天体黄经重算"
          });
        }
        if (!nearlyEqual(aspect.directedOrbDeg, expectedDirectedOrb)
          || !nearlyEqual(aspect.orbDeg, expectedOrb)) {
          context.addIssue({
            code: "custom",
            path: ["facts", "aspects", index, "directedOrbDeg"],
            message: "有向容许度必须等于实际夹角减去精确相位角，orb 必须取其绝对值"
          });
        }
        if (expectedOrb > definition.maxOrbDeg) {
          context.addIssue({ code: "custom", path: ["facts", "aspects", index, "orbDeg"], message: "超出 profile 容许度的天体对不能保存为相位事实" });
        }

        let expectedMotion: "exact" | "applying" | "separating" | "indeterminate";
        if (nearlyEqual(expectedOrb, 0)) {
          expectedMotion = "exact";
        } else if (nearlyEqual(expectedSeparation, 0) || nearlyEqual(expectedSeparation, 180)) {
          expectedMotion = "indeterminate";
        } else {
          const relativeSpeed = bodyB.ecliptic.longitudeSpeedDegPerDay
            - bodyA.ecliptic.longitudeSpeedDegPerDay;
          const separationRate = Math.sign(signedSeparation) * relativeSpeed;
          const orbRate = Math.sign(expectedDirectedOrb) * separationRate;
          expectedMotion = nearlyEqual(orbRate, 0)
            ? "indeterminate"
            : orbRate < 0 ? "applying" : "separating";
        }
        if (aspect.motion !== expectedMotion) {
          context.addIssue({
            code: "custom",
            path: ["facts", "aspects", index, "motion"],
            message: "入相/出相必须由有向 orb 与两端天体瞬时相对黄经速度派生"
          });
        }
      }
    });

    if (!value.profile.timePolicy.eopPreference.includes(value.timeProvenance.earthOrientation.status)) {
      context.addIssue({ code: "custom", path: ["timeProvenance", "earthOrientation", "status"], message: "EOP 状态不在 profile 的显式允许序列内" });
    }
    if (value.timeProvenance.dstResolution.timeZone !== value.input.timeZone) {
      context.addIssue({ code: "custom", path: ["timeProvenance", "dstResolution", "timeZone"], message: "时间回执必须绑定输入 IANA 时区" });
    }
    if (value.input.dstDisambiguation === "reject" && value.timeProvenance.dstResolution.choice !== "unique") {
      context.addIssue({ code: "custom", path: ["timeProvenance", "dstResolution", "choice"], message: "reject 策略不能接受 DST 重叠的早/晚分支" });
    }
    if (value.input.dstDisambiguation !== "reject"
      && value.timeProvenance.dstResolution.choice !== "unique"
      && value.timeProvenance.dstResolution.choice !== value.input.dstDisambiguation) {
      context.addIssue({ code: "custom", path: ["timeProvenance", "dstResolution", "choice"], message: "DST 回执必须绑定用户选择的分支" });
    }
    const normalizedWallTime = value.input.timePrecision === "exact_minute"
      ? `${value.input.time}:00`
      : value.input.time;
    const wallTimeMilliseconds = Date.parse(`${value.input.date}T${normalizedWallTime}Z`);
    const expectedUtcMilliseconds = wallTimeMilliseconds - value.timeProvenance.utcOffsetSeconds * 1_000;
    if (Date.parse(value.timeProvenance.utcInstant) !== expectedUtcMilliseconds) {
      context.addIssue({
        code: "custom",
        path: ["timeProvenance", "utcInstant"],
        message: "UTC 瞬时必须与输入墙时及已解析 UTC offset 精确一致"
      });
    }
    if (value.timeProvenance.leapSeconds.validThrough < value.input.date) {
      context.addIssue({
        code: "custom",
        path: ["timeProvenance", "leapSeconds", "validThrough"],
        message: "闰秒快照有效期必须覆盖输入日期"
      });
    }

    const ephemeris = value.profile.ephemeris;
    const provenance = value.ephemerisProvenance;
    if (ephemeris.provider !== provenance.provider || ephemeris.engineName !== provenance.engineName
      || ephemeris.engineVersion !== provenance.engineVersion || ephemeris.adapterVersion !== provenance.adapterVersion
      || ephemeris.datasetId !== provenance.datasetId) {
      context.addIssue({ code: "custom", path: ["ephemerisProvenance"], message: "星历回执必须绑定 profile 的精确提供者、引擎、适配器和数据集" });
    }
    const requestedOptionKeys = Object.keys(provenance.requestedOptions).sort();
    const effectiveOptionKeys = Object.keys(provenance.effectiveOptions).sort();
    const effectiveOptionsMatch = requestedOptionKeys.length === effectiveOptionKeys.length
      && requestedOptionKeys.every((key, index) => (
        key === effectiveOptionKeys[index]
        && Object.is(provenance.requestedOptions[key], provenance.effectiveOptions[key])
      ));
    if (!effectiveOptionsMatch) {
      context.addIssue({
        code: "custom",
        path: ["ephemerisProvenance", "effectiveOptions"],
        message: "成功工件的生效选项必须与请求选项逐键完全一致，任何替换都应失败关闭"
      });
    }
    if (provenance.backendWarnings.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["ephemerisProvenance", "backendWarnings"],
        message: "后端产生 warning 时不能依靠 fallbackUsed=false 形成成功工件"
      });
    }
    addDuplicateIssue(
      provenance.artifacts.map(artifactBindingKey),
      context,
      ["ephemerisProvenance", "artifacts"],
      "星历回执中的同一角色和数据集工件不能重复"
    );
    if (provenance.artifacts.length !== ephemeris.requiredArtifacts.length) {
      context.addIssue({
        code: "custom",
        path: ["ephemerisProvenance", "artifacts"],
        message: "星历回执工件集合必须与 profile 完全相同，不能缺少或额外加载工件"
      });
    }
    const actualArtifacts = new Map(provenance.artifacts.map((artifact) => [artifactBindingKey(artifact), artifact]));
    ephemeris.requiredArtifacts.forEach((required, index) => {
      const actual = actualArtifacts.get(artifactBindingKey(required));
      if (!actual || !artifactBindingsEqual(actual, required)) {
        context.addIssue({ code: "custom", path: ["ephemerisProvenance", "artifacts", index], message: "星历回执必须逐字段绑定 profile 要求的精确工件" });
      }
    });
    const leapSecondArtifact = ephemeris.requiredArtifacts.find((artifact) => (
      artifact.role === "leap_seconds"
      && artifact.datasetId === value.timeProvenance.leapSeconds.datasetId
      && artifact.contentSha256 === value.timeProvenance.leapSeconds.contentSha256
    ));
    if (!leapSecondArtifact
      || leapSecondArtifact.coverageFrom > value.input.date
      || leapSecondArtifact.coverageTo < value.input.date) {
      context.addIssue({
        code: "custom",
        path: ["timeProvenance", "leapSeconds"],
        message: "闰秒回执必须绑定 profile 中覆盖输入日期的精确 leap_seconds 工件"
      });
    }
    const earthOrientationArtifact = ephemeris.requiredArtifacts.find((artifact) => (
      artifact.role === "earth_orientation"
      && artifact.datasetId === value.timeProvenance.earthOrientation.productId
      && artifact.contentSha256 === value.timeProvenance.earthOrientation.contentSha256
    ));
    if (!earthOrientationArtifact
      || earthOrientationArtifact.coverageFrom > value.input.date
      || earthOrientationArtifact.coverageTo < value.input.date) {
      context.addIssue({
        code: "custom",
        path: ["timeProvenance", "earthOrientation"],
        message: "EOP 回执必须绑定 profile 中覆盖输入日期的精确 earth_orientation 工件"
      });
    }

    const sources = new Set(value.profile.sourceCatalog.map((item) => item.sourceId));
    addDuplicateIssue(value.fieldProvenance.map((item) => item.fieldPath), context, ["fieldProvenance"], "同一事实路径只能有一条来源记录");
    value.fieldProvenance.forEach((entry, index) => {
      entry.sourceIds.forEach((sourceId) => {
        if (!sources.has(sourceId)) {
          context.addIssue({ code: "custom", path: ["fieldProvenance", index, "sourceIds"], message: `事实引用了未登记来源 ${sourceId}` });
        }
      });
    });
    if (value.receipt.profileId !== value.profile.profileId
      || value.receipt.profileVersion !== value.profile.profileVersion
      || value.receipt.profileSha256 !== value.profile.profileSha256) {
      context.addIssue({ code: "custom", path: ["receipt", "profileId"], message: "计算回执必须绑定 profile 身份和摘要" });
    }
  });

export const westernCalculationFailureDraftSchema = z.strictObject({
  contractVersion: z.literal(WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION),
  systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
  status: z.literal("failed_closed"),
  stage: z.enum(["input", "time", "ephemeris", "frame_transform", "houses", "aspects", "license"]),
  code: z.enum([
    "INVALID_INPUT",
    "AMBIGUOUS_OR_MISSING_TIME",
    "OUTSIDE_ARTIFACT_COVERAGE",
    "MISSING_EOP",
    "TARGET_CENTER_UNAVAILABLE",
    "BACKEND_FALLBACK_REJECTED",
    "HOUSE_ALGORITHM_FAILED",
    "UNSUPPORTED_LATITUDE",
    "PROFILE_MISMATCH",
    "LICENSE_NOT_CLEARED"
  ]),
  inputSha256: lowerShaOrNullSchema,
  profileSha256: lowerShaOrNullSchema,
  occurredAt: z.string().datetime({ offset: true }),
  partialFactsPersisted: z.literal(false),
  fallbackAccepted: z.literal(false),
  message: z.string().trim().min(1).max(1_000)
});

export type WesternBirthInputDraft = z.infer<typeof westernBirthInputDraftSchema>;
export type WesternCalculationProfileDraft = z.infer<typeof westernCalculationProfileDraftSchema>;
export type WesternChartFixtureDraft = z.infer<typeof westernChartFixtureDraftSchema>;
export type WesternCalculationFailureDraft = z.infer<typeof westernCalculationFailureDraftSchema>;
