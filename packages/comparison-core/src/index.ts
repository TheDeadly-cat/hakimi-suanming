import {
  FORMAL_COMPARISON_CATEGORY_ORDER,
  FORMAL_COMPARISON_HASH_SCHEMA_VERSION,
  PAIR_STRUCTURE_RESEARCH_HASH_SCHEMA_VERSION,
  formalComparisonRequestSchema,
  formalComparisonProjectionSchema,
  formalComparisonSourceSchema,
  pairStructureResearchProjectionSchema,
  pairStructureResearchRequestSchema,
  revisionRecordSchema,
  type ComparisonCategory,
  type ComparisonCell,
  type ComparisonCellAvailability,
  type ComparisonItem,
  type ComparisonMatrix,
  type ComparisonRow,
  type ComparisonRowStatus,
  type ComparisonSection,
  type FormalComparisonRequest,
  type FormalComparisonProjection,
  type FormalComparisonSlotId,
  type FormalComparisonSource,
  type PairStructureResearchProjection,
  type PairStructureResearchRequest,
  type PairStructureObservation,
  type PillarFact,
  type SynchronizedTransitResult
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { verifyRevisionSnapshotIntegrity } from "@hakimi/chart-integrity";
import { calculatePillarRelations, RELATIONS_CORE_ENGINE } from "@hakimi/relations-core";
import { calculateTransitSnapshot, TransitCoreError } from "@hakimi/transit-core";

export const COMPARISON_MIN_ITEMS = 2 as const;
export const COMPARISON_MAX_ITEMS = 4 as const;
export const COMPARISON_ENGINE = {
  algorithmId: "hakimi-comparison-core:formal-revision-projection:v1" as const,
  hashSchemaVersion: FORMAL_COMPARISON_HASH_SCHEMA_VERSION,
  interpretationIncluded: false as const,
  scoreIncluded: false as const
};

export const PAIR_STRUCTURE_RESEARCH_POLICY = {
  mode: "parallel_facts_only" as const,
  interpretationIncluded: false as const,
  scoreIncluded: false as const,
  crossChartDerivationIncluded: false as const,
  relationshipConclusionIncluded: false as const
};

export const PAIR_STRUCTURE_RESEARCH_ENGINE = {
  algorithmId: "hakimi-comparison-core:pair-structure-research:v1" as const,
  hashSchemaVersion: PAIR_STRUCTURE_RESEARCH_HASH_SCHEMA_VERSION,
  semanticBoundary: "participant_facts_only" as const,
  evidenceStatus: "engineering_projection" as const,
  interpretationIncluded: false as const,
  scoreIncluded: false as const,
  compatibilityIncluded: false as const,
  crossChartDerivationIncluded: false as const
};

export const COMPARISON_CATEGORY_ORDER = FORMAL_COMPARISON_CATEGORY_ORDER;
export type {
  ComparisonCategory,
  ComparisonCell,
  ComparisonCellAvailability,
  ComparisonCellStatus,
  ComparisonItem,
  ComparisonMatrix,
  ComparisonRow,
  ComparisonRowStatus,
  ComparisonSection,
  FormalComparisonProjection,
  PairStructureResearchProjection,
  SynchronizedTransitResult
} from "@hakimi/contracts";

type FieldDefinition = {
  id: string;
  category: ComparisonCategory;
  label: string;
  read: (item: ComparisonItem) => string | FieldReading;
};

type FieldReading = {
  value: string;
  availability: ComparisonCellAvailability;
};

const CATEGORY_LABELS: Record<ComparisonCategory, string> = {
  input: "原始出生输入",
  calibration: "历法与校时",
  rule: "规则快照",
  calendar_fact: "历法事实",
  pillar_fact: "四柱完整字段",
  evidence: "计算证据"
};

const CALENDAR_LABELS = {
  gregorian: "公历",
  lunar: "农历"
} as const;

const SEX_LABELS = {
  male: "男",
  female: "女",
  unspecified: "未指定"
} as const;

const TIME_PRECISION_LABELS = {
  exact_second: "精确到秒",
  exact_minute: "精确到分钟",
  hour_range: "时辰范围",
  unknown_hour: "未知时辰",
  date_only: "仅日期"
} as const;

const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;

function shown(value: string | null | undefined, fallback = "未记录"): string {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function missing(message = "未记录"): FieldReading {
  return { value: message, availability: "missing" };
}

function notApplicable(message: string): FieldReading {
  return { value: message, availability: "not_applicable" };
}

function unsupported(message: string): FieldReading {
  return { value: message, availability: "unsupported" };
}

function yesNo(value: boolean): string {
  return value ? "是" : "否";
}

function formatLocation(item: ComparisonItem): string {
  const { location } = item.revision.input;
  const coordinates = location.latitude === null || location.longitude === null
    ? "无坐标"
    : `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  return `${shown(location.label, "未标地点")} · ${location.precision} · ${coordinates}`;
}

function formatDstResolution(item: ComparisonItem): string | FieldReading {
  const { timeCalibration } = item.revision;
  const resolution = timeCalibration.timeZoneResolution;
  if (!resolution) return missing(`${timeCalibration.dstStatus} · 旧记录未锁版解析候选`);
  return `${resolution.kind} · ${resolution.status} · ${resolution.policy}`;
}

function formatSolarTime(item: ComparisonItem): string | FieldReading {
  const calibration = item.revision.timeCalibration;
  if (calibration.solarTimeApplied) return `已采用 · ${shown(calibration.solarTimePreview)}`;
  if (calibration.solarTimePreview) return `仅对照 · ${calibration.solarTimePreview}`;
  return notApplicable("未提供完整坐标 · 未采用");
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function formatRelationFacts(item: ComparisonItem): string {
  const result = calculatePillarRelations(item.revision.facts);
  if (result.facts.length === 0) return "无命中（不等于解释结论）";
  return result.facts.map((fact) => {
    const participants = fact.participants
      .map((participant) => `${participant.position}.${participant.component}:${participant.value}`)
      .join("+");
    const missingMembers = fact.missingMembers.length ? ` · 缺 ${fact.missingMembers.join("/")}` : "";
    return `${fact.relationType} · ${fact.completeness} · ${participants}${missingMembers}`;
  }).join("；");
}

const UNBOUND_RULE_PACK_SNAPSHOT = "内置 / 未绑定规则快照" as const;

function rulePackBindingReading(
  item: ComparisonItem,
  read: (binding: NonNullable<ComparisonItem["revision"]["rulePackBinding"]>) => string
): string | FieldReading {
  const binding = item.revision.rulePackBinding;
  return binding ? read(binding) : notApplicable(UNBOUND_RULE_PACK_SNAPSHOT);
}

const BASE_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    id: "input.calendar",
    category: "input",
    label: "原始历法日期",
    read: ({ revision }) => `${CALENDAR_LABELS[revision.input.calendarType]} ${revision.input.date}${revision.input.lunarLeapMonth ? " · 闰月" : ""}`
  },
  { id: "evidence.revision_snapshot", category: "evidence", label: "完整修订摘要", read: (item) => item.revisionSnapshotDigest },
  {
    id: "input.civil_time",
    category: "input",
    label: "原始民用时间",
    read: ({ revision }) => `${revision.input.date} ${shown(revision.input.time, "时辰未知")} · ${TIME_PRECISION_LABELS[revision.input.timePrecision]}`
  },
  { id: "input.time_zone", category: "input", label: "IANA 时区", read: ({ revision }) => revision.input.timeZone },
  { id: "input.sex", category: "input", label: "出生性别", read: ({ revision }) => SEX_LABELS[revision.input.sex] },
  { id: "input.location", category: "input", label: "地点与精度", read: formatLocation },
  { id: "input.source_note", category: "input", label: "输入来源说明", read: ({ revision }) => revision.input.sourceNote ? revision.input.sourceNote : missing("未填写") },
  { id: "input.complete_snapshot", category: "input", label: "完整输入快照（审计）", read: ({ revision }) => stableJson(revision.input) },

  {
    id: "calibration.gregorian_date",
    category: "calibration",
    label: "解析公历日期",
    read: ({ revision }) => revision.timeCalibration.calendarResolution?.resolvedGregorianDate ?? missing("旧记录未锁版")
  },
  { id: "calibration.active_wall", category: "calibration", label: "活动民用时", read: ({ revision }) => revision.timeCalibration.activeWallTime },
  { id: "calibration.utc_instant", category: "calibration", label: "UTC 瞬时点", read: ({ revision }) => revision.timeCalibration.utcInstant ?? unsupported("未解析") },
  { id: "calibration.utc_offset", category: "calibration", label: "UTC 偏移", read: ({ revision }) => revision.timeCalibration.utcOffset ?? unsupported("未解析") },
  { id: "calibration.dst", category: "calibration", label: "DST 决策", read: formatDstResolution },
  { id: "calibration.solar", category: "calibration", label: "太阳时状态", read: formatSolarTime },
  {
    id: "calibration.algorithm",
    category: "calibration",
    label: "历法解析算法",
    read: ({ revision }) => revision.timeCalibration.calendarResolution?.algorithmId ?? missing("旧记录未锁版")
  },
  { id: "calibration.complete_snapshot", category: "calibration", label: "完整校时快照（审计）", read: ({ revision }) => stableJson(revision.timeCalibration) },

  {
    id: "rule.profile",
    category: "rule",
    label: "RuleProfile 配置快照",
    read: ({ revision }) => `${revision.ruleProfile.label} · ${revision.ruleProfile.profileId}@${revision.ruleProfile.profileVersion}`
  },
  {
    id: "rule.pack_source",
    category: "rule",
    label: "规则包绑定类型",
    read: (item) => rulePackBindingReading(item, (binding) => binding.kind)
  },
  {
    id: "rule.pack_id",
    category: "rule",
    label: "规则包 packId",
    read: (item) => rulePackBindingReading(item, (binding) => binding.packId)
  },
  {
    id: "rule.pack_digest",
    category: "rule",
    label: "规则包 packDigest",
    read: (item) => rulePackBindingReading(item, (binding) => binding.packDigest)
  },
  {
    id: "rule.pack_profile_id",
    category: "rule",
    label: "规则包 profileId",
    read: (item) => rulePackBindingReading(item, (binding) => binding.profileId)
  },
  {
    id: "rule.pack_profile_version",
    category: "rule",
    label: "规则包 profileVersion",
    read: (item) => rulePackBindingReading(item, (binding) => binding.profileVersion)
  },
  {
    id: "rule.pack_profile_digest",
    category: "rule",
    label: "规则包 profileDigest",
    read: (item) => rulePackBindingReading(item, (binding) => binding.profileDigest)
  },
  {
    id: "rule.pack_use_mode",
    category: "rule",
    label: "规则包 useMode",
    read: (item) => rulePackBindingReading(item, (binding) => binding.useMode)
  },
  { id: "rule.status", category: "rule", label: "规则状态", read: ({ revision }) => revision.ruleProfile.status },
  { id: "rule.year_boundary", category: "rule", label: "年界", read: ({ revision }) => revision.ruleProfile.calendar.yearBoundary },
  { id: "rule.month_boundary", category: "rule", label: "月界", read: ({ revision }) => revision.ruleProfile.calendar.monthBoundary },
  { id: "rule.day_boundary", category: "rule", label: "换日", read: ({ revision }) => revision.ruleProfile.calendar.dayBoundary },
  { id: "rule.zi_basis", category: "rule", label: "子时日干基准", read: ({ revision }) => revision.ruleProfile.calendar.ziHourDayStemBasis },
  { id: "rule.hour_basis", category: "rule", label: "时柱时间基准", read: ({ revision }) => revision.ruleProfile.calendar.hourBasis },
  { id: "rule.dst", category: "rule", label: "DST 歧义规则", read: ({ revision }) => revision.ruleProfile.calendar.dstAmbiguity },
  {
    id: "rule.solar_time",
    category: "rule",
    label: "太阳时规则",
    read: ({ revision }) => `${revision.ruleProfile.solarTime.enabled ? "启用" : "关闭"} · ${revision.ruleProfile.solarTime.showComparison ? "显示对照" : "不显示对照"}`
  },
  {
    id: "rule.luck_cycle",
    category: "rule",
    label: "起运规则快照",
    read: ({ revision }) => revision.luckCycleRuleSnapshot
      ? `${revision.luckCycleRuleSnapshot.ruleId}@${revision.luckCycleRuleSnapshot.ruleVersion}`
      : missing("旧修订未锁版")
  },
  { id: "rule.digest", category: "rule", label: "RuleProfile 摘要", read: ({ revision }) => revision.manifest.ruleProfileDigest },
  { id: "rule.luck_digest", category: "rule", label: "起运摘要", read: ({ revision }) => revision.manifest.luckCycleRuleDigest ?? missing("旧修订未锁版") },
  { id: "rule.complete_snapshot", category: "rule", label: "完整规则快照（审计）", read: ({ revision }) => stableJson(revision.ruleProfile) },

  { id: "calendar.solar_text", category: "calendar_fact", label: "公历文本", read: ({ revision }) => revision.facts.calendar.solarText },
  { id: "calendar.lunar_text", category: "calendar_fact", label: "农历文本", read: ({ revision }) => revision.facts.calendar.lunarText },
  { id: "calendar.leap_month", category: "calendar_fact", label: "结果闰月", read: ({ revision }) => yesNo(revision.facts.calendar.isLeapMonth) },
  { id: "calendar.previous_jie", category: "calendar_fact", label: "前一节", read: ({ revision }) => revision.facts.calendar.previousJie ?? notApplicable("当前范围未提供") },
  { id: "calendar.next_jie", category: "calendar_fact", label: "后一节", read: ({ revision }) => revision.facts.calendar.nextJie ?? notApplicable("当前范围未提供") },
  { id: "calendar.complete_snapshot", category: "calendar_fact", label: "完整历法事实（审计）", read: ({ revision }) => stableJson(revision.facts.calendar) },

  {
    id: "evidence.engine",
    category: "evidence",
    label: "计算引擎",
    read: ({ revision }) => `${revision.manifest.engine.name}@${revision.manifest.engine.version}`
  },
  {
    id: "evidence.relations_engine",
    category: "evidence",
    label: "干支关系引擎",
    read: () => `${RELATIONS_CORE_ENGINE.name}@${RELATIONS_CORE_ENGINE.version} · 顾问复核未完成`
  },
  {
    id: "evidence.interpretation",
    category: "evidence",
    label: "解释输出",
    read: () => notApplicable("当前未启用解释结论")
  },
  {
    id: "evidence.upstream",
    category: "evidence",
    label: "上游版本",
    read: ({ revision }) => `${revision.manifest.engine.upstreamName}@${revision.manifest.engine.upstreamVersion}`
  },
  { id: "evidence.tzdb", category: "evidence", label: "tzdb 版本", read: ({ revision }) => revision.manifest.tzdbVersion },
  { id: "evidence.result_hash", category: "evidence", label: "结果摘要", read: ({ revision }) => revision.manifest.resultHash },
  { id: "evidence.verification", category: "evidence", label: "验证状态", read: ({ revision }) => revision.manifest.verificationStatus },
  { id: "evidence.range", category: "evidence", label: "范围状态", read: ({ revision }) => revision.manifest.supportedRangeStatus },
  {
    id: "evidence.warnings",
    category: "evidence",
    label: "计算警告",
    read: ({ revision }) => revision.manifest.warnings.length ? revision.manifest.warnings.join("；") : "无"
  }
];

type ComparablePillarKey = Exclude<keyof PillarFact, "name" | "label">;

const PILLAR_FIELD_META = {
  ganZhi: { label: "干支", read: (pillar: PillarFact) => pillar.ganZhi },
  stem: { label: "天干", read: (pillar: PillarFact) => pillar.stem },
  branch: { label: "地支", read: (pillar: PillarFact) => pillar.branch },
  hiddenStems: { label: "藏干", read: (pillar: PillarFact) => pillar.hiddenStems.join("·") || "无" },
  stemTenGod: { label: "天干十神", read: (pillar: PillarFact) => pillar.stemTenGod },
  branchTenGods: { label: "地支十神", read: (pillar: PillarFact) => pillar.branchTenGods.join("·") || "无" },
  wuXing: { label: "五行", read: (pillar: PillarFact) => pillar.wuXing },
  nayin: { label: "纳音", read: (pillar: PillarFact) => pillar.nayin },
  twelveGrowth: { label: "十二长生", read: (pillar: PillarFact) => pillar.twelveGrowth },
  xun: { label: "旬", read: (pillar: PillarFact) => pillar.xun },
  voidBranches: { label: "旬空", read: (pillar: PillarFact) => pillar.voidBranches }
} satisfies Record<ComparablePillarKey, { label: string; read: (pillar: PillarFact) => string }>;

const PILLAR_FIELD_DEFINITIONS: FieldDefinition[] = PILLAR_KEYS.flatMap((key) => {
  const label = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" }[key];
  return (Object.keys(PILLAR_FIELD_META) as ComparablePillarKey[]).map((field): FieldDefinition => ({
    id: `pillar.${key}.${field}`,
    category: "pillar_fact",
    label: `${label}${PILLAR_FIELD_META[field].label}`,
    read: ({ revision }) => PILLAR_FIELD_META[field].read(revision.facts.pillars[key])
  }));
});

const RELATION_FIELD_DEFINITION: FieldDefinition = {
  id: "pillar.relations",
  category: "pillar_fact",
  label: "干支关系事实",
  read: formatRelationFacts
};

export const COMPARISON_FIELD_DEFINITIONS: readonly FieldDefinition[] = [
  ...BASE_FIELD_DEFINITIONS.filter((definition) => definition.category !== "evidence"),
  ...PILLAR_FIELD_DEFINITIONS,
  RELATION_FIELD_DEFINITION,
  ...BASE_FIELD_DEFINITIONS.filter((definition) => definition.category === "evidence")
];

function canonicalItems(rawItems: readonly ComparisonItem[]): ComparisonItem[] {
  if (rawItems.length < COMPARISON_MIN_ITEMS || rawItems.length > COMPARISON_MAX_ITEMS) {
    throw new RangeError(`正式命盘对照必须包含 ${COMPARISON_MIN_ITEMS}—${COMPARISON_MAX_ITEMS} 个项目。`);
  }
  const keys = new Set<string>();
  const revisionIds = new Set<string>();
  const slotIds = new Set<FormalComparisonSlotId>();
  return rawItems.map((rawItem, index) => {
    const key = rawItem.key.trim();
    const caseAlias = rawItem.caseAlias.trim();
    if (!key || key.length > 240) throw new Error(`第 ${index + 1} 个对照项目缺少稳定键。`);
    if (!caseAlias || caseAlias.length > 80) throw new Error(`第 ${index + 1} 个对照项目缺少合法案例别名。`);
    if (keys.has(key)) throw new Error(`对照项目键重复：${key}`);
    keys.add(key);
    if (slotIds.has(rawItem.slotId)) throw new Error(`对照位重复：${rawItem.slotId}`);
    slotIds.add(rawItem.slotId);
    if (!/^[a-f0-9]{64}$/.test(rawItem.revisionSnapshotDigest)) {
      throw new Error(`对照项目 ${key} 缺少合法的完整修订摘要。`);
    }
    const revision = revisionRecordSchema.parse(structuredClone(rawItem.revision));
    if (rawItem.caseId !== revision.caseId) throw new Error(`对照项目 ${key} 的案例与修订归属不一致。`);
    if (revisionIds.has(revision.id)) throw new Error(`同一修订不能重复占用多个对照位：${revision.id}`);
    revisionIds.add(revision.id);
    return { ...rawItem, key, caseAlias, revision };
  });
}

function normalizeReading(reading: string | FieldReading): FieldReading {
  return typeof reading === "string" ? { value: reading, availability: "value" } : reading;
}

function rowStatus(readings: readonly FieldReading[]): ComparisonRowStatus {
  const signatures = new Set(readings.map((reading) =>
    reading.availability === "value" ? `value:${reading.value}` : reading.availability
  ));
  if (signatures.size > 1) {
    return readings.every((reading) => reading.availability === "value") ? "changed" : "mixed";
  }
  return readings[0].availability === "value" ? "same" : readings[0].availability;
}

function comparisonCells(readings: readonly FieldReading[]): ComparisonCell[] {
  const baseline = readings[0];
  return readings.map((reading, index): ComparisonCell => {
    if (reading.availability !== "value") {
      return { ...reading, status: reading.availability };
    }
    if (index === 0) return { ...reading, status: "baseline" };
    if (baseline.availability !== "value") return { ...reading, status: "added" };
    return { ...reading, status: reading.value === baseline.value ? "same" : "changed" };
  });
}

export function buildComparisonMatrix(rawItems: readonly ComparisonItem[]): ComparisonMatrix {
  const items = canonicalItems(rawItems);
  const rows = COMPARISON_FIELD_DEFINITIONS.map((definition): ComparisonRow => {
    const readings = items.map((item) => normalizeReading(definition.read(item)));
    const status = rowStatus(readings);
    return {
      id: definition.id,
      category: definition.category,
      label: definition.label,
      values: readings.map((reading) => reading.value),
      cells: comparisonCells(readings),
      status,
      different: status === "changed" || status === "mixed"
    };
  });
  const sections = COMPARISON_CATEGORY_ORDER.map((category): ComparisonSection => {
    const sectionRows = rows.filter((row) => row.category === category);
    return {
      category,
      label: CATEGORY_LABELS[category],
      rows: sectionRows,
      differenceCount: sectionRows.filter((row) => row.different).length
    };
  });
  const changedCategories = sections.filter((section) => section.differenceCount > 0).map((section) => section.category);
  return {
    items,
    sections,
    rowCount: rows.length,
    differenceCount: rows.filter((row) => row.different).length,
    changedCategories,
    sameBirthInput: !sections.find((section) => section.category === "input")?.differenceCount
  };
}

export async function calculateSynchronizedTransits(
  rawItems: readonly ComparisonItem[],
  atInstant: string
): Promise<SynchronizedTransitResult[]> {
  const items = canonicalItems(rawItems);
  return Promise.all(items.map(async (item): Promise<SynchronizedTransitResult> => {
    try {
      return {
        itemKey: item.key,
        status: "resolved",
        snapshot: await calculateTransitSnapshot({
          revision: item.revision,
          atInstant,
          ...(item.manualDirection ? { manualDirection: item.manualDirection } : {})
        })
      };
    } catch (cause) {
      return {
        itemKey: item.key,
        status: "error",
        code: cause instanceof TransitCoreError ? cause.code : "UNKNOWN_TRANSIT_ERROR",
        message: cause instanceof Error ? cause.message : "同步运限计算失败。"
      };
    }
  }));
}

export async function comparisonItemsFromFormalSources(
  rawRequest: FormalComparisonRequest,
  rawSources: readonly FormalComparisonSource[]
): Promise<ComparisonItem[]> {
  const request = formalComparisonRequestSchema.parse(structuredClone(rawRequest));
  const sources = rawSources.map((source) => formalComparisonSourceSchema.parse(structuredClone(source)));
  const sourceBySlot = new Map(sources.map((source) => [source.slotId, source]));
  if (sourceBySlot.size !== sources.length || sources.length !== request.slots.length) {
    throw new Error("正式对照源必须与请求槽位一一对应。 ");
  }
  const items = await Promise.all(request.slots.map(async (slot): Promise<ComparisonItem> => {
    const source = sourceBySlot.get(slot.slotId);
    if (!source) throw new Error(`缺少对照位 ${slot.slotId} 的正式修订源。`);
    if (source.caseRecord.id !== slot.caseId || source.revision.id !== slot.revisionId) {
      throw new Error(`对照位 ${slot.slotId} 的正式源与请求身份不一致。`);
    }
    const verified = await verifyRevisionSnapshotIntegrity(source.revision);
    if (verified.revisionSnapshotDigest !== source.revisionSnapshotDigest) {
      throw new Error(`对照位 ${slot.slotId} 的完整修订摘要与内容不一致。`);
    }
    return {
      key: source.revision.id,
      caseId: source.caseRecord.id,
      caseAlias: source.caseRecord.alias,
      source: "stored_revision",
      slotId: slot.slotId,
      manualDirection: slot.manualDirection,
      revisionSnapshotDigest: source.revisionSnapshotDigest,
      revision: verified.revision
    };
  }));
  return canonicalItems(items);
}

export type FormalComparisonHashSource = Pick<
  FormalComparisonProjection,
  "schemaVersion" | "kind" | "baselineSlotId" | "targetInstant" | "matrix" | "transits"
>;

/** Canonical semantic payload used for FormalComparisonProjection.manifest.resultHash. */
export function buildFormalComparisonHashPayload(value: FormalComparisonHashSource) {
  return {
    hashSchemaVersion: FORMAL_COMPARISON_HASH_SCHEMA_VERSION,
    schemaVersion: value.schemaVersion,
    kind: value.kind,
    baselineSlotId: value.baselineSlotId,
    targetInstant: value.targetInstant,
    items: value.matrix.items.map((item) => ({
      key: item.key,
      slotId: item.slotId,
      caseId: item.caseId,
      caseAlias: item.caseAlias,
      source: item.source,
      revisionId: item.revision.id,
      revisionSnapshotDigest: item.revisionSnapshotDigest,
      manualDirection: item.manualDirection
    })),
    sections: value.matrix.sections.map((section) => ({
      category: section.category,
      label: section.label,
      differenceCount: section.differenceCount,
      rows: section.rows.map((row) => ({
        id: row.id,
        category: row.category,
        label: row.label,
        values: row.values,
        cells: row.cells,
        status: row.status,
        different: row.different
      }))
    })),
    rowCount: value.matrix.rowCount,
    differenceCount: value.matrix.differenceCount,
    changedCategories: value.matrix.changedCategories,
    sameBirthInput: value.matrix.sameBirthInput,
    transits: value.transits.map((result) => result.status === "resolved"
      ? { itemKey: result.itemKey, status: result.status, resultHash: result.snapshot.resultHash }
      : { itemKey: result.itemKey, status: result.status, code: result.code, message: result.message })
  };
}

export class FormalComparisonIntegrityError extends Error {
  readonly code = "FORMAL_COMPARISON_INTEGRITY_MISMATCH" as const;

  constructor(
    readonly mismatch: "revision" | "transit" | "result",
    readonly itemKey: string | null = null
  ) {
    const label = mismatch === "revision" ? "正式修订" : mismatch === "transit" ? "同步运限" : "对照结果";
    super(`${itemKey ? `对照项目 ${itemKey} 的` : ""}${label}摘要或内容不一致。`);
    this.name = "FormalComparisonIntegrityError";
  }
}

/** Strict output shape plus all independently recomputable revision, transit and projection digests. */
export async function verifyFormalComparisonProjectionIntegrity(raw: unknown): Promise<FormalComparisonProjection> {
  const projection = formalComparisonProjectionSchema.parse(structuredClone(raw));
  for (const item of projection.matrix.items) {
    try {
      const verified = await verifyRevisionSnapshotIntegrity(item.revision);
      if (verified.revisionSnapshotDigest !== item.revisionSnapshotDigest) {
        throw new FormalComparisonIntegrityError("revision", item.key);
      }
    } catch (cause) {
      if (cause instanceof FormalComparisonIntegrityError) throw cause;
      throw new FormalComparisonIntegrityError("revision", item.key);
    }
  }

  const recalculatedMatrix = buildComparisonMatrix(projection.matrix.items);
  const [storedMatrixDigest, recalculatedMatrixDigest] = await Promise.all([
    sha256Hex(projection.matrix),
    sha256Hex(recalculatedMatrix)
  ]);
  if (storedMatrixDigest !== recalculatedMatrixDigest) {
    throw new FormalComparisonIntegrityError("result");
  }

  if (projection.targetInstant !== null) {
    for (const [index, item] of projection.matrix.items.entries()) {
      const stored = projection.transits[index];
      try {
        const recalculated = await calculateTransitSnapshot({
          revision: item.revision,
          atInstant: projection.targetInstant,
          ...(item.manualDirection ? { manualDirection: item.manualDirection } : {})
        });
        const storedSnapshotDigest = stored?.status === "resolved" ? await sha256Hex(stored.snapshot) : null;
        const recalculatedSnapshotDigest = await sha256Hex(recalculated);
        if (stored?.status !== "resolved" || storedSnapshotDigest !== recalculatedSnapshotDigest) {
          throw new FormalComparisonIntegrityError("transit", item.key);
        }
      } catch (cause) {
        if (cause instanceof FormalComparisonIntegrityError) throw cause;
        const code = cause instanceof TransitCoreError ? cause.code : "UNKNOWN_TRANSIT_ERROR";
        const message = cause instanceof Error ? cause.message : "同步运限计算失败。";
        if (stored?.status !== "error" || stored.code !== code || stored.message !== message) {
          throw new FormalComparisonIntegrityError("transit", item.key);
        }
      }
    }
  }

  const expectedResultHash = await sha256Hex(buildFormalComparisonHashPayload(projection));
  if (expectedResultHash !== projection.manifest.resultHash) {
    throw new FormalComparisonIntegrityError("result");
  }
  return projection;
}

export async function projectFormalComparison(
  rawRequest: FormalComparisonRequest,
  rawSources: readonly FormalComparisonSource[]
): Promise<FormalComparisonProjection> {
  const request = formalComparisonRequestSchema.parse(structuredClone(rawRequest));
  const items = await comparisonItemsFromFormalSources(request, rawSources);
  const matrix = buildComparisonMatrix(items);
  const targetInstant = request.transit.mode === "same_instant"
    ? new Date(request.transit.atInstant).toISOString()
    : null;
  const transits = request.transit.mode === "same_instant"
    ? await calculateSynchronizedTransits(items, targetInstant!)
    : [];
  const hashSource: FormalComparisonHashSource = {
    schemaVersion: "1.0.0",
    kind: "formal_revision_comparison",
    baselineSlotId: "A",
    targetInstant,
    matrix,
    transits
  };
  const resultHash = await sha256Hex(buildFormalComparisonHashPayload(hashSource));
  return formalComparisonProjectionSchema.parse({
    ...hashSource,
    manifest: { ...COMPARISON_ENGINE, resultHash }
  });
}

export function formalComparisonRequestFromPairStructureResearch(
  rawRequest: PairStructureResearchRequest
): FormalComparisonRequest {
  const request = pairStructureResearchRequestSchema.parse(structuredClone(rawRequest));
  return formalComparisonRequestSchema.parse({
    schemaVersion: "1.0.0",
    baselineSlotId: "A",
    slots: request.subjects,
    transit: { mode: "same_instant", atInstant: request.atInstant }
  });
}

export function projectPairStructureObservations(item: ComparisonItem): PairStructureObservation[] {
  return COMPARISON_FIELD_DEFINITIONS.map((definition) => {
    const reading = normalizeReading(definition.read(item));
    return {
      id: definition.id,
      category: definition.category,
      label: definition.id === "pillar.relations" ? "盘内干支关系事实" : definition.label,
      value: reading.value,
      availability: reading.availability
    };
  });
}

export type PairStructureResearchHashSource = Pick<
  PairStructureResearchProjection,
  "schemaVersion" | "kind" | "policy" | "targetInstant" | "participants"
>;

export function buildPairStructureResearchHashPayload(value: PairStructureResearchHashSource) {
  return {
    hashSchemaVersion: PAIR_STRUCTURE_RESEARCH_HASH_SCHEMA_VERSION,
    schemaVersion: value.schemaVersion,
    kind: value.kind,
    policy: value.policy,
    targetInstant: value.targetInstant,
    participants: value.participants.map((participant) => ({
      role: participant.role,
      item: {
        key: participant.item.key,
        slotId: participant.item.slotId,
        caseId: participant.item.caseId,
        caseAlias: participant.item.caseAlias,
        source: participant.item.source,
        revisionId: participant.item.revision.id,
        revisionSnapshotDigest: participant.item.revisionSnapshotDigest,
        manualDirection: participant.item.manualDirection
      },
      observations: participant.observations,
      transit: participant.transit.status === "resolved"
        ? { itemKey: participant.transit.itemKey, status: participant.transit.status, resultHash: participant.transit.snapshot.resultHash }
        : participant.transit
    }))
  };
}

export class PairStructureResearchIntegrityError extends Error {
  readonly code = "PAIR_STRUCTURE_RESEARCH_INTEGRITY_MISMATCH" as const;

  constructor() {
    super("双案例结构研究投影摘要或内层事实不一致。");
    this.name = "PairStructureResearchIntegrityError";
  }
}

export async function verifyPairStructureResearchProjectionIntegrity(
  raw: unknown
): Promise<PairStructureResearchProjection> {
  const projection = pairStructureResearchProjectionSchema.parse(structuredClone(raw));
  const items = projection.participants.map((participant) => participant.item);
  for (const participant of projection.participants) {
    try {
      const verified = await verifyRevisionSnapshotIntegrity(participant.item.revision);
      if (verified.revisionSnapshotDigest !== participant.item.revisionSnapshotDigest) {
        throw new PairStructureResearchIntegrityError();
      }
      const [storedObservationDigest, recalculatedObservationDigest] = await Promise.all([
        sha256Hex(participant.observations),
        sha256Hex(projectPairStructureObservations(participant.item))
      ]);
      if (storedObservationDigest !== recalculatedObservationDigest) {
        throw new PairStructureResearchIntegrityError();
      }
    } catch (cause) {
      if (cause instanceof PairStructureResearchIntegrityError) throw cause;
      throw new PairStructureResearchIntegrityError();
    }
  }
  const recalculatedTransits = await calculateSynchronizedTransits(items, projection.targetInstant);
  for (const [index, participant] of projection.participants.entries()) {
    const [storedTransitDigest, recalculatedTransitDigest] = await Promise.all([
      sha256Hex(participant.transit),
      sha256Hex(recalculatedTransits[index])
    ]);
    if (storedTransitDigest !== recalculatedTransitDigest) throw new PairStructureResearchIntegrityError();
  }
  const expectedResultHash = await sha256Hex(buildPairStructureResearchHashPayload(projection));
  if (projection.manifest.resultHash !== expectedResultHash) {
    throw new PairStructureResearchIntegrityError();
  }
  return projection;
}

export async function projectPairStructureResearch(
  rawRequest: PairStructureResearchRequest,
  rawSources: readonly FormalComparisonSource[]
): Promise<PairStructureResearchProjection> {
  const request = pairStructureResearchRequestSchema.parse(structuredClone(rawRequest));
  const formalRequest = formalComparisonRequestFromPairStructureResearch(request);
  const items = await comparisonItemsFromFormalSources(formalRequest, rawSources);
  const targetInstant = new Date(request.atInstant).toISOString();
  const transits = await calculateSynchronizedTransits(items, targetInstant);
  const participants: PairStructureResearchProjection["participants"] = [
    { role: "A", item: items[0], observations: projectPairStructureObservations(items[0]), transit: transits[0] },
    { role: "B", item: items[1], observations: projectPairStructureObservations(items[1]), transit: transits[1] }
  ];
  const hashSource: PairStructureResearchHashSource = {
    schemaVersion: "1.0.0",
    kind: "pair_structure_research_projection",
    policy: PAIR_STRUCTURE_RESEARCH_POLICY,
    targetInstant,
    participants
  };
  const resultHash = await sha256Hex(buildPairStructureResearchHashPayload(hashSource));
  return pairStructureResearchProjectionSchema.parse({
    ...hashSource,
    manifest: { ...PAIR_STRUCTURE_RESEARCH_ENGINE, resultHash }
  });
}

/** UI-only mechanical alignment. The persisted pair artifact remains participant-facts-only. */
export function buildPairStructureResearchDisplayMatrix(
  projection: PairStructureResearchProjection
): ComparisonMatrix {
  return buildComparisonMatrix(projection.participants.map((participant) => participant.item));
}
