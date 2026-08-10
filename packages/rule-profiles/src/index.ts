import { ruleProfileSchema, type RuleProfile } from "@hakimi/contracts";

export const WORKING_DEFAULT_SUPPORT_METADATA = {
  declaredSupportRange: {
    from: "1900-01-01",
    to: "2100-12-31",
    outsideRangePolicy: "experimental_with_warning"
  },
  verificationEvidence: {
    status: "not_established",
    evidenceRefs: [],
    requiredGoldCaseCount: 360,
    releaseGatePassed: false
  }
} as const;

function toContractSupportedRange(
  declaration: typeof WORKING_DEFAULT_SUPPORT_METADATA.declaredSupportRange
): RuleProfile["supportedRange"] {
  // Compatibility bridge for the current contract. These legacy key names do
  // not assert verification; product code should use the metadata above.
  return {
    stronglyVerifiedFrom: declaration.from,
    stronglyVerifiedTo: declaration.to,
    outsideRangePolicy: declaration.outsideRangePolicy
  };
}

export const WORKING_DEFAULT_RULE_PROFILE: RuleProfile = ruleProfileSchema.parse({
  schemaVersion: "1.0.0",
  profileId: "ziping-working-default",
  profileVersion: "0.1.0",
  status: "working_default",
  label: "传统子平工作默认",
  notice: "工程工作默认，不代表唯一正确流派；1900—2100 仅为声明支持范围，不代表已强验证，当前尚未通过 360 例金标准发布门。",
  sourceRefs: [],
  supportedRange: toContractSupportedRange(WORKING_DEFAULT_SUPPORT_METADATA.declaredSupportRange),
  calendar: {
    yearBoundary: "lichun_exact",
    monthBoundary: "jie_exact",
    dayBoundary: "zi_start_23",
    ziHourDayStemBasis: "after_day_change",
    hourBasis: "civil_time",
    timezoneSource: "iana",
    dstAmbiguity: "require_user",
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
});

export function withDayBoundary(dayBoundary: RuleProfile["calendar"]["dayBoundary"]): RuleProfile {
  return ruleProfileSchema.parse({
    ...WORKING_DEFAULT_RULE_PROFILE,
    profileId: `ziping-working-${dayBoundary.replaceAll("_", "-")}`,
    label:
      dayBoundary === "zi_start_23"
        ? "传统子平工作默认"
        : dayBoundary === "midnight"
          ? "午夜换日对照配置"
          : "早晚子时分流对照配置",
    calendar: {
      ...WORKING_DEFAULT_RULE_PROFILE.calendar,
      dayBoundary,
      ziHourDayStemBasis: dayBoundary === "zi_start_23" ? "after_day_change" : "civil_day"
    }
  });
}

/**
 * Derives one explicit comparison-only day-boundary variant from an existing
 * locked profile while preserving every unrelated rule field. This avoids
 * silently replacing a historical revision with today's working defaults.
 */
export function withDayBoundaryFromProfile(
  rawProfile: RuleProfile,
  dayBoundary: RuleProfile["calendar"]["dayBoundary"]
): RuleProfile {
  const profile = ruleProfileSchema.parse(structuredClone(rawProfile));
  if (profile.calendar.dayBoundary === dayBoundary) return profile;
  const boundaryLabel = dayBoundary === "zi_start_23"
    ? "23:00 子初换日"
    : dayBoundary === "midnight"
      ? "00:00 午夜换日"
      : "早晚子时分流";
  return ruleProfileSchema.parse({
    ...profile,
    profileId: `${profile.profileId}-compare-${dayBoundary.replaceAll("_", "-")}`,
    status: "experimental",
    label: `${profile.label} · ${boundaryLabel}对照`,
    notice: `从 ${profile.profileId}@${profile.profileVersion} 派生的换日对照快照；只改变换日与其必需的子时日干基准，不代表唯一流派或金标结论。`,
    calendar: {
      ...profile.calendar,
      dayBoundary,
      ziHourDayStemBasis: dayBoundary === "zi_start_23" ? "after_day_change" : "civil_day"
    }
  });
}

export function withTimeRules(options: {
  dayBoundary: RuleProfile["calendar"]["dayBoundary"];
  dstAmbiguity: RuleProfile["calendar"]["dstAmbiguity"];
}): RuleProfile {
  const base = withDayBoundary(options.dayBoundary);
  const suffix = options.dstAmbiguity === "require_user" ? "dst-confirm" : `dst-${options.dstAmbiguity}`;
  return ruleProfileSchema.parse({
    ...base,
    profileId: `${base.profileId}-${suffix}`,
    label: `${base.label} · ${options.dstAmbiguity === "require_user" ? "DST 必须确认" : `DST ${options.dstAmbiguity}`}`,
    calendar: {
      ...base.calendar,
      dstAmbiguity: options.dstAmbiguity
    }
  });
}
