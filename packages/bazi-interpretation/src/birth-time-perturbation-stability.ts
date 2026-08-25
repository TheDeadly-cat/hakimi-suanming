import {
  lookupHistoricalNatalChartExecutor,
  UnsupportedCalculationError
} from "@hakimi/bazi-core";
import {
  classifyRevisionNatalReplay,
  replayRevisionNatalChart,
  verifyCalculatedChartIntegrity,
  verifyRevisionSnapshotIntegrity
} from "@hakimi/chart-integrity";
import type {
  BirthInput,
  CalculatedChart,
  ChartFacts,
  RevisionRecord,
  TimeZoneResolution
} from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { normalizeBirthTimeForBundledSnapshot } from "@hakimi/time-core";

export const BAZI_BIRTH_TIME_PERTURBATION_STABILITY_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.birth_time_perturbation_stability/0.1.0",
  contentVersion: "0.22.0",
  system: "bazi" as const,
  scope: "fixed_civil_minute_offsets_full_pillar_projection_against_registered_replay" as const,
  projectionPolicy: "full_pillar_facts_only" as const,
  mutationPolicy: "read_only_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export const BAZI_BIRTH_TIME_PERTURBATION_OFFSETS = Object.freeze([
  0,
  -1,
  1,
  -5,
  5,
  -15,
  15
] as const);

export type BaziBirthTimePerturbationOffset =
  (typeof BAZI_BIRTH_TIME_PERTURBATION_OFFSETS)[number];

export type BaziBirthTimePerturbationPillar = keyof ChartFacts["pillars"];

const PILLAR_FACT_FIELDS = Object.freeze([
  "name",
  "label",
  "ganZhi",
  "stem",
  "branch",
  "hiddenStems",
  "stemTenGod",
  "branchTenGods",
  "wuXing",
  "nayin",
  "twelveGrowth",
  "xun",
  "voidBranches"
] as const satisfies readonly (keyof ChartFacts["pillars"]["year"])[]);

export type BaziBirthTimePerturbationChangedFactPath =
  `pillars.${BaziBirthTimePerturbationPillar}.${(typeof PILLAR_FACT_FIELDS)[number]}`;

export type BaziBirthTimePerturbationBlockCode =
  | "outside_supported_civil_input_range"
  | "dst_overlap_requires_scenario_choice"
  | "dst_gap_requires_scenario_resolution"
  | "calculation_rejected";

interface BaziBirthTimePerturbationScenarioBase {
  scenarioId: string;
  order: number;
  offsetMinutes: BaziBirthTimePerturbationOffset;
}

export interface BaziBirthTimePerturbationCalculatedScenario
  extends BaziBirthTimePerturbationScenarioBase {
  status: "calculated";
  timeZoneResolutionKind: "unique" | "overlap";
  timeZoneResolutionStatus:
    | "resolved_unique"
    | "resolved_overlap_earlier"
    | "resolved_overlap_later";
  selectedTimeZoneCandidateChoice: "unique" | "earlier" | "later";
  solarTimeApplied: false;
  factsProjectionDigest: string;
  sameProjectionAsBaseline: boolean;
  changedPillarIdentities: readonly BaziBirthTimePerturbationPillar[];
  changedPillarFacts: readonly BaziBirthTimePerturbationPillar[];
  changedFactPaths: readonly BaziBirthTimePerturbationChangedFactPath[];
  note: string;
}

export interface BaziBirthTimePerturbationBlockedScenario
  extends BaziBirthTimePerturbationScenarioBase {
  status: "blocked";
  timeZoneResolutionKind: "unique" | "overlap" | "gap" | null;
  timeZoneResolutionStatus: TimeZoneResolution["status"] | null;
  selectedTimeZoneCandidateChoice: null;
  solarTimeApplied: false;
  factsProjectionDigest: null;
  sameProjectionAsBaseline: null;
  changedPillarIdentities: readonly [];
  changedPillarFacts: readonly [];
  changedFactPaths: readonly [];
  blockCode: BaziBirthTimePerturbationBlockCode;
  note: string;
}

export type BaziBirthTimePerturbationScenario =
  | BaziBirthTimePerturbationCalculatedScenario
  | BaziBirthTimePerturbationBlockedScenario;

export interface BaziBirthTimePerturbationStabilityReport {
  profile: typeof BAZI_BIRTH_TIME_PERTURBATION_STABILITY_PROFILE;
  binding: Readonly<{
    revisionId: string;
    revisionNumber: number;
    revisionSnapshotDigest: string;
    sourceResultHash: string;
    ruleProfile: Readonly<{
      id: string;
      version: string;
      status: RevisionRecord["ruleProfile"]["status"];
      digest: string;
    }>;
    rulePackBinding: RevisionRecord["rulePackBinding"] | null;
    executorId: string;
    artifactRole: "current" | "retained";
    engine: RevisionRecord["manifest"]["engine"];
    timeZoneDatabase: NonNullable<RevisionRecord["manifest"]["timeZoneDatabase"]>;
    inputTimePrecision: "exact_minute" | "exact_second";
    baselineFactsProjectionDigest: string;
  }>;
  scenarios: readonly BaziBirthTimePerturbationScenario[];
  counts: Readonly<{
    total: 7;
    calculated: number;
    blocked: number;
    changedFromBaseline: number;
  }>;
  stability: Readonly<{
    status:
      | "pillar_projection_unchanged_for_all_requested_offsets"
      | "pillar_projection_changed_within_requested_offsets"
      | "inconclusive_due_to_blocked_offsets";
    requestedOffsetsMinutes: typeof BAZI_BIRTH_TIME_PERTURBATION_OFFSETS;
    calculatedOffsetsMinutes: readonly BaziBirthTimePerturbationOffset[];
    blockedOffsets: readonly Readonly<{
      offsetMinutes: BaziBirthTimePerturbationOffset;
      blockCode: BaziBirthTimePerturbationBlockCode;
      timeZoneResolutionKind: "unique" | "overlap" | "gap" | null;
      timeZoneResolutionStatus: TimeZoneResolution["status"] | null;
    }>[];
    solarTimePerturbationStatus: "not_applied_to_any_calculated_or_time_zone_probed_scenario";
    interpretationStabilityClaimed: false;
    note: string;
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
  boundary: Readonly<{
    exactRegisteredReplayRequired: true;
    replayEvidenceScope: "registered_executor_recalculation_not_original_binary_attestation";
    historicalProgramBinaryAttestationClaimed: false;
    civilWallTimePerturbationOnly: true;
    unlistedOffsetsAssessed: false;
    rawBirthDateCopied: false;
    rawBirthTimeCopied: false;
    sourceLocationCopied: false;
    sourceTimeZoneCopied: false;
    solarTimeAppliedInAnyScenario: false;
    containsDerivedSensitiveChartData: true;
    interpretationStabilityClaimed: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    publicReleaseAuthorized: false;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    chartOrStorageMutationPerformed: false;
    overallGoodBad: null;
    usefulGod: null;
    eventOutcome: null;
    result: null;
  }>;
}

type StabilityPayload = Omit<BaziBirthTimePerturbationStabilityReport, "integrity">;

const REPORT_PREFLIGHT_LIMITS = Object.freeze({
  maxDepth: 32,
  maxValueNodes: 4_096,
  maxTextCharacters: 256_000,
  maxArrays: 256,
  maxArrayLength: 64,
  maxPropertyKeys: 8_192
});

const REPORT_KEYS = Object.freeze([
  "profile",
  "binding",
  "scenarios",
  "counts",
  "stability",
  "integrity",
  "boundary"
] as const);
const PROFILE_KEYS = Object.freeze([
  "projectionVersion",
  "contentVersion",
  "system",
  "scope",
  "projectionPolicy",
  "mutationPolicy",
  "reviewStatus",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "formalActivationAllowed"
] as const);
const BINDING_KEYS = Object.freeze([
  "revisionId",
  "revisionNumber",
  "revisionSnapshotDigest",
  "sourceResultHash",
  "ruleProfile",
  "rulePackBinding",
  "executorId",
  "artifactRole",
  "engine",
  "timeZoneDatabase",
  "inputTimePrecision",
  "baselineFactsProjectionDigest"
] as const);
const RULE_PROFILE_BINDING_KEYS = Object.freeze(["id", "version", "status", "digest"] as const);
const RULE_PACK_BINDING_KEYS = Object.freeze([
  "kind",
  "packDigest",
  "profileDigest",
  "packId",
  "profileId",
  "profileVersion",
  "useMode"
] as const);
const ENGINE_KEYS = Object.freeze([
  "name",
  "version",
  "upstreamName",
  "upstreamVersion",
  "upstreamTagCommit",
  "upstreamIntegrity"
] as const);
const TIME_ZONE_DATABASE_KEYS = Object.freeze([
  "schemaVersion",
  "kind",
  "ianaVersion",
  "artifactName",
  "dataSha256",
  "resolver",
  "adapter",
  "supportedRange",
  "snapshotId"
] as const);
const NAME_VERSION_KEYS = Object.freeze(["name", "version"] as const);
const SUPPORTED_RANGE_KEYS = Object.freeze(["from", "to"] as const);
const CALCULATED_SCENARIO_KEYS = Object.freeze([
  "scenarioId",
  "order",
  "offsetMinutes",
  "status",
  "timeZoneResolutionKind",
  "timeZoneResolutionStatus",
  "selectedTimeZoneCandidateChoice",
  "solarTimeApplied",
  "factsProjectionDigest",
  "sameProjectionAsBaseline",
  "changedPillarIdentities",
  "changedPillarFacts",
  "changedFactPaths",
  "note"
] as const);
const BLOCKED_SCENARIO_KEYS = Object.freeze([
  ...CALCULATED_SCENARIO_KEYS,
  "blockCode"
] as const);
const COUNTS_KEYS = Object.freeze(["total", "calculated", "blocked", "changedFromBaseline"] as const);
const STABILITY_KEYS = Object.freeze([
  "status",
  "requestedOffsetsMinutes",
  "calculatedOffsetsMinutes",
  "blockedOffsets",
  "solarTimePerturbationStatus",
  "interpretationStabilityClaimed",
  "note"
] as const);
const BLOCKED_OFFSET_KEYS = Object.freeze([
  "offsetMinutes",
  "blockCode",
  "timeZoneResolutionKind",
  "timeZoneResolutionStatus"
] as const);
const INTEGRITY_KEYS = Object.freeze(["hashAlgorithm", "payloadSha256", "authenticityClaimed"] as const);
const BOUNDARY_KEYS = Object.freeze([
  "exactRegisteredReplayRequired",
  "replayEvidenceScope",
  "historicalProgramBinaryAttestationClaimed",
  "civilWallTimePerturbationOnly",
  "unlistedOffsetsAssessed",
  "rawBirthDateCopied",
  "rawBirthTimeCopied",
  "sourceLocationCopied",
  "sourceTimeZoneCopied",
  "solarTimeAppliedInAnyScenario",
  "containsDerivedSensitiveChartData",
  "interpretationStabilityClaimed",
  "expertTruthClaimed",
  "scientificValidityClaimed",
  "formalActivationAllowed",
  "publicReleaseAuthorized",
  "networkTransmissionPerformed",
  "networkTransmissionAuthorized",
  "chartOrStorageMutationPerformed",
  "overallGoodBad",
  "usefulGod",
  "eventOutcome",
  "result"
] as const);

interface ReportPreflightBudget {
  valueNodes: number;
  textCharacters: number;
  arrays: number;
  propertyKeys: number;
}

type DerivedFactsProjection = Readonly<{
  projectionVersion: "hakimi.bazi.natal_pillar_comparison/0.1.0";
  pillars: ChartFacts["pillars"];
}>;

const PILLAR_ORDER = Object.freeze([
  "year",
  "month",
  "day",
  "hour"
] as const satisfies readonly BaziBirthTimePerturbationPillar[]);

const CALCULATED_NOTE =
  "按冻结引擎、规则与时区工件完成固定民用时间偏移；只说明派生投影相对基线是否变化。";

const BLOCK_NOTES: Readonly<Record<BaziBirthTimePerturbationBlockCode, string>> = Object.freeze({
  outside_supported_civil_input_range:
    "偏移后的民用输入超出当前输入契约范围；该样本未计算。",
  dst_overlap_requires_scenario_choice:
    "偏移样本进入未由源 Revision 选择覆盖的 DST 重叠；未静默选择较早或较晚方案。",
  dst_gap_requires_scenario_resolution:
    "偏移样本进入 DST 空档；未静默平移墙上时间或复用其他样本的选择。",
  calculation_rejected:
    "冻结执行器拒绝该偏移样本；错误正文未复制到报告，样本保持 blocked。"
});

export class BaziBirthTimePerturbationStabilityError extends Error {
  constructor(
    readonly code:
      | "unsupported_calendar"
      | "unsupported_precision"
      | "baseline_replay_unavailable"
      | "baseline_replay_mismatch"
      | "baseline_dst_gap_not_supported"
      | "executor_unavailable"
      | "tzdb_unavailable"
      | "executor_output_invalid",
    message: string
  ) {
    super(message);
    this.name = "BaziBirthTimePerturbationStabilityError";
  }
}

function assertPlainObjectPrototype(value: object, subject: string): void {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${subject} 必须是普通声明式对象`);
  }
  if (
    prototype === Object.prototype
    && Object.getOwnPropertyDescriptor(prototype, Symbol.toStringTag) !== undefined
  ) {
    throw new TypeError(`${subject} 的普通对象原型不得覆盖 Symbol.toStringTag`);
  }
}

function assertExactOwnDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
  subject: string
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${subject} 必须是普通声明式对象`);
  }
  assertPlainObjectPrototype(value, subject);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new TypeError(`${subject} 不得携带符号键`);
  }
  const strings = ownKeys as string[];
  const expected = new Set(expectedKeys);
  if (strings.length !== expectedKeys.length || strings.some((key) => !expected.has(key))) {
    throw new TypeError(`${subject} 字段不符合严格白名单`);
  }
  for (const key of strings) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${subject}.${key} 必须是可枚举的自有声明式数据字段`);
    }
  }
}

function ownDataProperty(value: object, key: string, path: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
    throw new TypeError(`${path} 必须是可枚举的自有声明式数据字段`);
  }
  return descriptor.value;
}

function arrayDataItem(value: unknown[], index: number, path: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
    throw new TypeError(`${path}[${index}] 必须是可枚举的自有声明式数据项`);
  }
  return descriptor.value;
}

function declarativeArrayLength(value: unknown[], path: string): number {
  const descriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !descriptor
    || !("value" in descriptor)
    || typeof descriptor.value !== "number"
    || !Number.isSafeInteger(descriptor.value)
    || descriptor.value < 0
  ) {
    throw new TypeError(`${path}.length 必须是有效的自有数据字段`);
  }
  return descriptor.value;
}

function claimReportBudget(
  budget: ReportPreflightBudget,
  field: keyof ReportPreflightBudget,
  amount: number,
  limit: number,
  label: string
): void {
  budget[field] += amount;
  if (budget[field] > limit) {
    throw new TypeError(`出生时间扰动报告${label}超过规范克隆前上限 ${limit}`);
  }
}

function inspectBoundedDeclarativeReport(
  value: unknown,
  path = "出生时间扰动候选报告",
  depth = 0,
  ancestors = new WeakSet<object>(),
  budget: ReportPreflightBudget = {
    valueNodes: 0,
    textCharacters: 0,
    arrays: 0,
    propertyKeys: 0
  }
): void {
  if (depth > REPORT_PREFLIGHT_LIMITS.maxDepth) {
    throw new TypeError(`出生时间扰动报告嵌套深度超过规范克隆前上限 ${REPORT_PREFLIGHT_LIMITS.maxDepth}`);
  }
  claimReportBudget(
    budget,
    "valueNodes",
    1,
    REPORT_PREFLIGHT_LIMITS.maxValueNodes,
    "结构节点总量"
  );
  if (typeof value === "string") {
    claimReportBudget(
      budget,
      "textCharacters",
      value.length,
      REPORT_PREFLIGHT_LIMITS.maxTextCharacters,
      "文本字符总量"
    );
    return;
  }
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} 包含非有限数字`);
    return;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} 包含非声明式 JSON 值`);
  }

  const objectValue = value as object;
  if (ancestors.has(objectValue)) throw new TypeError(`${path} 包含循环引用`);
  ancestors.add(objectValue);
  try {
    if (Array.isArray(objectValue)) {
      if (Object.getPrototypeOf(objectValue) !== Array.prototype) {
        throw new TypeError(`${path} 必须是普通声明式数组`);
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(objectValue, "length");
      if (
        !lengthDescriptor
        || !("value" in lengthDescriptor)
        || typeof lengthDescriptor.value !== "number"
        || !Number.isSafeInteger(lengthDescriptor.value)
        || lengthDescriptor.value < 0
      ) {
        throw new TypeError(`${path}.length 必须是有效的自有数据字段`);
      }
      const length = lengthDescriptor.value;
      if (length > REPORT_PREFLIGHT_LIMITS.maxArrayLength) {
        throw new TypeError(
          `出生时间扰动报告单个数组长度超过规范克隆前上限 ${REPORT_PREFLIGHT_LIMITS.maxArrayLength}`
        );
      }
      claimReportBudget(budget, "arrays", 1, REPORT_PREFLIGHT_LIMITS.maxArrays, "数组总量");
      const ownKeys = Reflect.ownKeys(objectValue);
      if (ownKeys.some((key) => typeof key !== "string")) {
        throw new TypeError(`${path} 不得携带符号键`);
      }
      claimReportBudget(
        budget,
        "propertyKeys",
        ownKeys.length,
        REPORT_PREFLIGHT_LIMITS.maxPropertyKeys,
        "属性键总量"
      );
      if (ownKeys.length !== length + 1) {
        throw new TypeError(`${path} 必须是稠密且没有扩展字段的数组`);
      }
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(objectValue, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError(`${path}[${index}] 必须是可枚举的自有声明式数据项`);
        }
        inspectBoundedDeclarativeReport(
          descriptor.value,
          `${path}[${index}]`,
          depth + 1,
          ancestors,
          budget
        );
      }
      return;
    }

    assertPlainObjectPrototype(objectValue, path);
    const ownKeys = Reflect.ownKeys(objectValue);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw new TypeError(`${path} 不得携带符号键`);
    }
    claimReportBudget(
      budget,
      "propertyKeys",
      ownKeys.length,
      REPORT_PREFLIGHT_LIMITS.maxPropertyKeys,
      "属性键总量"
    );
    for (const key of ownKeys as string[]) {
      claimReportBudget(
        budget,
        "textCharacters",
        key.length,
        REPORT_PREFLIGHT_LIMITS.maxTextCharacters,
        "文本字符总量"
      );
      const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError(`${path}.${key} 必须是可枚举的自有声明式数据字段`);
      }
      inspectBoundedDeclarativeReport(
        descriptor.value,
        `${path}.${key}`,
        depth + 1,
        ancestors,
        budget
      );
    }
  } finally {
    ancestors.delete(objectValue);
  }
}

function assertArray(value: unknown, subject: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${subject} 必须是数组`);
}

function assertReportStructure(rawReport: unknown): void {
  assertExactOwnDataRecord(rawReport, REPORT_KEYS, "出生时间扰动候选报告");
  const profile = ownDataProperty(rawReport, "profile", "出生时间扰动候选报告.profile");
  assertExactOwnDataRecord(profile, PROFILE_KEYS, "出生时间扰动候选报告 profile");

  const binding = ownDataProperty(rawReport, "binding", "出生时间扰动候选报告.binding");
  assertExactOwnDataRecord(binding, BINDING_KEYS, "出生时间扰动候选报告 binding");
  const ruleProfile = ownDataProperty(binding, "ruleProfile", "出生时间扰动候选报告.binding.ruleProfile");
  assertExactOwnDataRecord(
    ruleProfile,
    RULE_PROFILE_BINDING_KEYS,
    "出生时间扰动候选报告 ruleProfile binding"
  );
  const rulePackBinding = ownDataProperty(
    binding,
    "rulePackBinding",
    "出生时间扰动候选报告.binding.rulePackBinding"
  );
  if (rulePackBinding !== null) {
    assertExactOwnDataRecord(
      rulePackBinding,
      RULE_PACK_BINDING_KEYS,
      "出生时间扰动候选报告 rulePack binding"
    );
  }
  const engine = ownDataProperty(binding, "engine", "出生时间扰动候选报告.binding.engine");
  assertExactOwnDataRecord(engine, ENGINE_KEYS, "出生时间扰动候选报告 engine");
  const timeZoneDatabase = ownDataProperty(
    binding,
    "timeZoneDatabase",
    "出生时间扰动候选报告.binding.timeZoneDatabase"
  );
  assertExactOwnDataRecord(
    timeZoneDatabase,
    TIME_ZONE_DATABASE_KEYS,
    "出生时间扰动候选报告 timeZoneDatabase"
  );
  const resolver = ownDataProperty(
    timeZoneDatabase,
    "resolver",
    "出生时间扰动候选报告.binding.timeZoneDatabase.resolver"
  );
  assertExactOwnDataRecord(resolver, NAME_VERSION_KEYS, "出生时间扰动候选报告 tzdb resolver");
  const adapter = ownDataProperty(
    timeZoneDatabase,
    "adapter",
    "出生时间扰动候选报告.binding.timeZoneDatabase.adapter"
  );
  assertExactOwnDataRecord(adapter, NAME_VERSION_KEYS, "出生时间扰动候选报告 tzdb adapter");
  const supportedRange = ownDataProperty(
    timeZoneDatabase,
    "supportedRange",
    "出生时间扰动候选报告.binding.timeZoneDatabase.supportedRange"
  );
  assertExactOwnDataRecord(
    supportedRange,
    SUPPORTED_RANGE_KEYS,
    "出生时间扰动候选报告 tzdb supportedRange"
  );

  const scenarios = ownDataProperty(rawReport, "scenarios", "出生时间扰动候选报告.scenarios");
  assertArray(scenarios, "出生时间扰动候选报告 scenarios");
  const scenarioCount = declarativeArrayLength(scenarios, "出生时间扰动候选报告.scenarios");
  if (scenarioCount !== BAZI_BIRTH_TIME_PERTURBATION_OFFSETS.length) {
    throw new TypeError("出生时间扰动候选报告 scenarios 必须完整覆盖固定七个偏移");
  }
  for (let index = 0; index < scenarioCount; index += 1) {
    const scenario = arrayDataItem(scenarios, index, "出生时间扰动候选报告.scenarios");
    if (scenario === null || typeof scenario !== "object" || Array.isArray(scenario)) {
      throw new TypeError(`出生时间扰动候选报告第 ${index + 1} 个 scenario 必须是对象`);
    }
    const status = ownDataProperty(
      scenario,
      "status",
      `出生时间扰动候选报告第 ${index + 1} 个 scenario.status`
    );
    if (status === "calculated") {
      assertExactOwnDataRecord(
        scenario,
        CALCULATED_SCENARIO_KEYS,
        `出生时间扰动候选报告第 ${index + 1} 个 calculated scenario`
      );
    } else if (status === "blocked") {
      assertExactOwnDataRecord(
        scenario,
        BLOCKED_SCENARIO_KEYS,
        `出生时间扰动候选报告第 ${index + 1} 个 blocked scenario`
      );
    } else {
      throw new TypeError(`出生时间扰动候选报告第 ${index + 1} 个 scenario status 不受支持`);
    }
    for (const key of ["changedPillarIdentities", "changedPillarFacts", "changedFactPaths"] as const) {
      assertArray(
        ownDataProperty(scenario, key, `出生时间扰动候选报告第 ${index + 1} 个 scenario.${key}`),
        `出生时间扰动候选报告第 ${index + 1} 个 scenario.${key}`
      );
    }
  }

  const counts = ownDataProperty(rawReport, "counts", "出生时间扰动候选报告.counts");
  assertExactOwnDataRecord(counts, COUNTS_KEYS, "出生时间扰动候选报告 counts");
  const stability = ownDataProperty(rawReport, "stability", "出生时间扰动候选报告.stability");
  assertExactOwnDataRecord(stability, STABILITY_KEYS, "出生时间扰动候选报告 stability");
  for (const key of ["requestedOffsetsMinutes", "calculatedOffsetsMinutes", "blockedOffsets"] as const) {
    assertArray(
      ownDataProperty(stability, key, `出生时间扰动候选报告.stability.${key}`),
      `出生时间扰动候选报告 stability.${key}`
    );
  }
  const blockedOffsets = ownDataProperty(
    stability,
    "blockedOffsets",
    "出生时间扰动候选报告.stability.blockedOffsets"
  ) as unknown[];
  const blockedOffsetCount = declarativeArrayLength(
    blockedOffsets,
    "出生时间扰动候选报告.stability.blockedOffsets"
  );
  for (let index = 0; index < blockedOffsetCount; index += 1) {
    assertExactOwnDataRecord(
      arrayDataItem(blockedOffsets, index, "出生时间扰动候选报告.stability.blockedOffsets"),
      BLOCKED_OFFSET_KEYS,
      `出生时间扰动候选报告第 ${index + 1} 个 blocked offset`
    );
  }

  const integrity = ownDataProperty(rawReport, "integrity", "出生时间扰动候选报告.integrity");
  assertExactOwnDataRecord(integrity, INTEGRITY_KEYS, "出生时间扰动候选报告 integrity");
  const boundary = ownDataProperty(rawReport, "boundary", "出生时间扰动候选报告.boundary");
  assertExactOwnDataRecord(boundary, BOUNDARY_KEYS, "出生时间扰动候选报告 boundary");
}

function preflightReport(rawReport: unknown): void {
  assertExactOwnDataRecord(rawReport, REPORT_KEYS, "出生时间扰动候选报告");
  inspectBoundedDeclarativeReport(rawReport);
  assertReportStructure(rawReport);
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function canonicalClone<T>(value: T): T {
  return JSON.parse(canonicalStringify(value)) as T;
}

function sameValue(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return left === right;
  return canonicalStringify(left) === canonicalStringify(right);
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function shiftGregorianCivilInput(
  input: BirthInput,
  offsetMinutes: BaziBirthTimePerturbationOffset
): BirthInput | null {
  if (input.time === null) return null;
  const [year, month, day] = input.date.split("-").map(Number);
  const [hour, minute, second = 0] = input.time.split(":").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!, second));
  shifted.setUTCMinutes(shifted.getUTCMinutes() + offsetMinutes);
  const shiftedYear = shifted.getUTCFullYear();
  if (shiftedYear < 1900 || shiftedYear > 2100) return null;
  const date = `${shiftedYear}-${twoDigits(shifted.getUTCMonth() + 1)}-${twoDigits(shifted.getUTCDate())}`;
  const minuteTime = `${twoDigits(shifted.getUTCHours())}:${twoDigits(shifted.getUTCMinutes())}`;
  const time = input.timePrecision === "exact_second"
    ? `${minuteTime}:${twoDigits(shifted.getUTCSeconds())}`
    : minuteTime;
  return {
    ...input,
    date,
    time
  };
}

function projectDerivedFacts(facts: ChartFacts): DerivedFactsProjection {
  return {
    projectionVersion: "hakimi.bazi.natal_pillar_comparison/0.1.0",
    pillars: facts.pillars
  };
}

function changedPillars(
  baseline: ChartFacts,
  candidate: ChartFacts,
  identityOnly: boolean
): readonly BaziBirthTimePerturbationPillar[] {
  return Object.freeze(PILLAR_ORDER.filter((pillar) => (
    identityOnly
      ? baseline.pillars[pillar].ganZhi !== candidate.pillars[pillar].ganZhi
      : !sameValue(baseline.pillars[pillar], candidate.pillars[pillar])
  )));
}

function changedFactPaths(
  baseline: ChartFacts,
  candidate: ChartFacts
): readonly BaziBirthTimePerturbationChangedFactPath[] {
  const paths: BaziBirthTimePerturbationChangedFactPath[] = [];
  for (const pillar of PILLAR_ORDER) {
    for (const field of PILLAR_FACT_FIELDS) {
      if (!sameValue(baseline.pillars[pillar][field], candidate.pillars[pillar][field])) {
        paths.push(`pillars.${pillar}.${field}`);
      }
    }
  }
  return Object.freeze(paths);
}

function assertPerturbedChartIdentity(
  revision: RevisionRecord,
  expectedInput: BirthInput,
  chart: CalculatedChart
): void {
  if (
    !sameValue(chart.input, expectedInput)
    || !sameValue(chart.ruleProfile, revision.ruleProfile)
    || !sameValue(chart.rulePackBinding, revision.rulePackBinding)
    || !sameValue(chart.manifest.engine, revision.manifest.engine)
    || chart.manifest.hashSchemaVersion !== revision.manifest.hashSchemaVersion
    || chart.manifest.tzdbVersion !== revision.manifest.tzdbVersion
    || !sameValue(chart.manifest.timeZoneDatabase, revision.manifest.timeZoneDatabase)
  ) {
    throw new BaziBirthTimePerturbationStabilityError(
      "executor_output_invalid",
      "偏移计算没有保持源 Revision 的冻结引擎、规则、输入或时区工件身份。"
    );
  }
}

function blockedScenario(
  offsetMinutes: BaziBirthTimePerturbationOffset,
  order: number,
  blockCode: BaziBirthTimePerturbationBlockCode,
  timeZoneResolutionKind: "unique" | "overlap" | "gap" | null,
  timeZoneResolutionStatus: TimeZoneResolution["status"] | null
): BaziBirthTimePerturbationBlockedScenario {
  return {
    scenarioId: `civil-minute-offset:${offsetMinutes}`,
    order,
    offsetMinutes,
    status: "blocked",
    timeZoneResolutionKind,
    timeZoneResolutionStatus,
    selectedTimeZoneCandidateChoice: null,
    solarTimeApplied: false,
    factsProjectionDigest: null,
    sameProjectionAsBaseline: null,
    changedPillarIdentities: [],
    changedPillarFacts: [],
    changedFactPaths: [],
    blockCode,
    note: BLOCK_NOTES[blockCode]
  };
}

type CalculatedTimeZoneResolution = TimeZoneResolution & Readonly<{
  kind: "unique" | "overlap";
  status: "resolved_unique" | "resolved_overlap_earlier" | "resolved_overlap_later";
  selectedCandidate: NonNullable<TimeZoneResolution["selectedCandidate"]>;
}>;

function requireCalculatedTimeZoneResolution(chart: CalculatedChart): CalculatedTimeZoneResolution {
  const resolution = chart.timeCalibration.timeZoneResolution;
  const validResolution = resolution?.kind === "unique"
    ? resolution.status === "resolved_unique"
      && resolution.selectedCandidate?.choice === "unique"
    : resolution?.kind === "overlap"
      ? (
          resolution.status === "resolved_overlap_earlier"
          && resolution.selectedCandidate?.choice === "earlier"
          && resolution.policy === "earlier"
        ) || (
          resolution.status === "resolved_overlap_later"
          && resolution.selectedCandidate?.choice === "later"
          && resolution.policy === "later"
        )
      : false;
  if (
    !resolution
    || !validResolution
    || !resolution.selectedCandidate
    || chart.timeCalibration.solarTimeApplied !== false
  ) {
    throw new BaziBirthTimePerturbationStabilityError(
      "executor_output_invalid",
      "已计算偏移样本必须保存唯一或 DST overlap 的显式选择，且不得把太阳时应用到活动命盘。"
    );
  }
  return resolution as CalculatedTimeZoneResolution;
}

async function calculatedScenario(
  offsetMinutes: BaziBirthTimePerturbationOffset,
  order: number,
  chart: CalculatedChart,
  baselineFacts: ChartFacts
): Promise<BaziBirthTimePerturbationCalculatedScenario> {
  const projection = projectDerivedFacts(chart.facts);
  const baselineProjection = projectDerivedFacts(baselineFacts);
  const resolution = requireCalculatedTimeZoneResolution(chart);
  return {
    scenarioId: `civil-minute-offset:${offsetMinutes}`,
    order,
    offsetMinutes,
    status: "calculated",
    timeZoneResolutionKind: resolution.kind,
    timeZoneResolutionStatus: resolution.status,
    selectedTimeZoneCandidateChoice: resolution.selectedCandidate.choice,
    solarTimeApplied: false,
    factsProjectionDigest: await sha256Hex(projection),
    sameProjectionAsBaseline: sameValue(projection, baselineProjection),
    changedPillarIdentities: changedPillars(baselineFacts, chart.facts, true),
    changedPillarFacts: changedPillars(baselineFacts, chart.facts, false),
    changedFactPaths: changedFactPaths(baselineFacts, chart.facts),
    note: CALCULATED_NOTE
  };
}

/**
 * Builds a deterministic, read-only civil-time neighborhood pillar projection. The fixed offsets are
 * applied to the stored Gregorian civil wall time, never to the resolved UTC
 * instant. Baseline replay must match before any perturbation is assessed.
 */
export async function buildBaziBirthTimePerturbationStabilityReport(
  rawRevision: unknown
): Promise<BaziBirthTimePerturbationStabilityReport> {
  const { revision, revisionSnapshotDigest } = await verifyRevisionSnapshotIntegrity(rawRevision);
  if (revision.input.calendarType !== "gregorian") {
    throw new BaziBirthTimePerturbationStabilityError(
      "unsupported_calendar",
      "出生时间扰动 v0.1 只接受冻结的公历 Revision；不会在此入口猜测农历转换语义。"
    );
  }
  if (
    revision.input.time === null
    || (revision.input.timePrecision !== "exact_minute" && revision.input.timePrecision !== "exact_second")
  ) {
    throw new BaziBirthTimePerturbationStabilityError(
      "unsupported_precision",
      "出生时间扰动 v0.1 只接受精确到分钟或秒的冻结 Revision。"
    );
  }

  const capability = await classifyRevisionNatalReplay(revision);
  if (capability.status !== "replayable_exact") {
    throw new BaziBirthTimePerturbationStabilityError(
      "baseline_replay_unavailable",
      "源 Revision 不具备完整描述符匹配的注册复演能力；时间扰动已失败关闭。"
    );
  }
  const replay = await replayRevisionNatalChart(revision);
  if (replay.status !== "matched") {
    throw new BaziBirthTimePerturbationStabilityError(
      "baseline_replay_mismatch",
      "源 Revision 未通过完整描述符匹配的注册复演一致性检查；时间扰动已失败关闭。"
    );
  }
  const executor = lookupHistoricalNatalChartExecutor(revision.manifest.engine);
  if (!executor) {
    throw new BaziBirthTimePerturbationStabilityError(
      "executor_unavailable",
      "未找到与源 Revision 完整引擎描述符一致的历史执行器。"
    );
  }
  const timeZoneDatabase = revision.manifest.timeZoneDatabase;
  if (!timeZoneDatabase) {
    throw new BaziBirthTimePerturbationStabilityError(
      "tzdb_unavailable",
      "源 Revision 未绑定可复用的时区数据库工件。"
    );
  }

  const baselineChart = replay.replayedChart;
  if (baselineChart.timeCalibration.timeZoneResolution?.kind === "gap") {
    throw new BaziBirthTimePerturbationStabilityError(
      "baseline_dst_gap_not_supported",
      "源 Revision 的民用墙上时刻位于 DST 空档；平移后的有效瞬时点不能作为民用时间邻域基线。"
    );
  }
  const baselineProjection = projectDerivedFacts(baselineChart.facts);
  const baselineFactsProjectionDigest = await sha256Hex(baselineProjection);
  const scenarios: BaziBirthTimePerturbationScenario[] = [];
  for (const [index, offsetMinutes] of BAZI_BIRTH_TIME_PERTURBATION_OFFSETS.entries()) {
    const order = index + 1;
    if (offsetMinutes === 0) {
      scenarios.push(await calculatedScenario(offsetMinutes, order, baselineChart, baselineChart.facts));
      continue;
    }

    const perturbedInput = shiftGregorianCivilInput(revision.input, offsetMinutes);
    if (!perturbedInput) {
      scenarios.push(blockedScenario(
        offsetMinutes,
        order,
        "outside_supported_civil_input_range",
        null,
        null
      ));
      continue;
    }

    const probe = await normalizeBirthTimeForBundledSnapshot(
      perturbedInput,
      "reject",
      timeZoneDatabase.snapshotId,
      timeZoneDatabase
    );
    const resolutionKind = probe.timeCalibration.timeZoneResolution.kind;
    const resolutionStatus = probe.timeCalibration.timeZoneResolution.status;
    if (probe.timeCalibration.solarTimeApplied !== false) {
      throw new BaziBirthTimePerturbationStabilityError(
        "executor_output_invalid",
        "偏移时区探针不得把太阳时应用到活动命盘。"
      );
    }
    if (resolutionKind === "gap") {
      scenarios.push(blockedScenario(
        offsetMinutes,
        order,
        "dst_gap_requires_scenario_resolution",
        "gap",
        resolutionStatus
      ));
      continue;
    }
    if (revision.ruleProfile.calendar.dstAmbiguity === "require_user") {
      if (resolutionKind === "overlap") {
        scenarios.push(blockedScenario(
          offsetMinutes,
          order,
          "dst_overlap_requires_scenario_choice",
          "overlap",
          resolutionStatus
        ));
        continue;
      }
    }

    try {
      const calculated = await executor.calculateChart(
        perturbedInput,
        revision.ruleProfile,
        timeZoneDatabase.snapshotId,
        {
          expectedTimeZoneDatabase: timeZoneDatabase,
          ...(revision.rulePackBinding ? { rulePackBinding: revision.rulePackBinding } : {})
        }
      );
      const verified = await verifyCalculatedChartIntegrity(
        calculated,
        `${revision.id}:civil-minute-offset:${offsetMinutes}`
      );
      assertPerturbedChartIdentity(revision, perturbedInput, verified);
      scenarios.push(await calculatedScenario(offsetMinutes, order, verified, baselineChart.facts));
    } catch (cause) {
      if (!(cause instanceof UnsupportedCalculationError)) throw cause;
      scenarios.push(blockedScenario(
        offsetMinutes,
        order,
        "calculation_rejected",
        resolutionKind,
        resolutionStatus
      ));
    }
  }

  const calculated = scenarios.filter(
    (scenario): scenario is BaziBirthTimePerturbationCalculatedScenario => scenario.status === "calculated"
  );
  const blockedScenarios = scenarios.filter(
    (scenario): scenario is BaziBirthTimePerturbationBlockedScenario => scenario.status === "blocked"
  );
  const requestedOffsetsMinutes = scenarios.map((scenario) => scenario.offsetMinutes);
  const calculatedOffsetsMinutes = calculated.map((scenario) => scenario.offsetMinutes);
  const blockedOffsetsMinutes = blockedScenarios.map((scenario) => scenario.offsetMinutes);
  const calculatedOffsetSet = new Set(calculatedOffsetsMinutes);
  const blockedOffsetSet = new Set(blockedOffsetsMinutes);
  if (
    !sameValue(requestedOffsetsMinutes, BAZI_BIRTH_TIME_PERTURBATION_OFFSETS)
    || new Set(requestedOffsetsMinutes).size !== requestedOffsetsMinutes.length
    || calculatedOffsetsMinutes.length + blockedOffsetsMinutes.length !== requestedOffsetsMinutes.length
    || requestedOffsetsMinutes.some((offset) => (
      calculatedOffsetSet.has(offset) === blockedOffsetSet.has(offset)
    ))
  ) {
    throw new BaziBirthTimePerturbationStabilityError(
      "executor_output_invalid",
      "时间扰动场景没有形成 requested/calculated/blocked 的有序无重复完整分区。"
    );
  }
  const blocked = blockedScenarios.length;
  const changedFromBaseline = calculated.filter((scenario) => !scenario.sameProjectionAsBaseline).length;
  const status = blocked > 0
    ? "inconclusive_due_to_blocked_offsets" as const
    : changedFromBaseline > 0
      ? "pillar_projection_changed_within_requested_offsets" as const
      : "pillar_projection_unchanged_for_all_requested_offsets" as const;
  const payload: StabilityPayload = {
    profile: BAZI_BIRTH_TIME_PERTURBATION_STABILITY_PROFILE,
    binding: {
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      revisionSnapshotDigest,
      sourceResultHash: revision.manifest.resultHash,
      ruleProfile: {
        id: revision.ruleProfile.profileId,
        version: revision.ruleProfile.profileVersion,
        status: revision.ruleProfile.status,
        digest: revision.manifest.ruleProfileDigest
      },
      rulePackBinding: revision.rulePackBinding ?? null,
      executorId: executor.executorId,
      artifactRole: capability.artifactRole,
      engine: executor.engine,
      timeZoneDatabase,
      inputTimePrecision: revision.input.timePrecision,
      baselineFactsProjectionDigest
    },
    scenarios,
    counts: {
      total: requestedOffsetsMinutes.length as 7,
      calculated: calculated.length,
      blocked,
      changedFromBaseline
    },
    stability: {
      status,
      requestedOffsetsMinutes: requestedOffsetsMinutes as unknown as typeof BAZI_BIRTH_TIME_PERTURBATION_OFFSETS,
      calculatedOffsetsMinutes,
      blockedOffsets: blockedScenarios.map((scenario) => ({
        offsetMinutes: scenario.offsetMinutes,
        blockCode: scenario.blockCode,
        timeZoneResolutionKind: scenario.timeZoneResolutionKind,
        timeZoneResolutionStatus: scenario.timeZoneResolutionStatus
      })),
      solarTimePerturbationStatus: "not_applied_to_any_calculated_or_time_zone_probed_scenario",
      interpretationStabilityClaimed: false,
      note: blocked > 0
        ? "至少一个固定偏移样本失败关闭；不得把已计算子集外推为完整窗口四柱投影未变。"
        : "结论只覆盖列出的七个民用时间偏移及冻结计算策略，不证明真实出生时间或解释稳定性。"
    },
    boundary: {
      exactRegisteredReplayRequired: true,
      replayEvidenceScope: "registered_executor_recalculation_not_original_binary_attestation",
      historicalProgramBinaryAttestationClaimed: false,
      civilWallTimePerturbationOnly: true,
      unlistedOffsetsAssessed: false,
      rawBirthDateCopied: false,
      rawBirthTimeCopied: false,
      sourceLocationCopied: false,
      sourceTimeZoneCopied: false,
      solarTimeAppliedInAnyScenario: false,
      containsDerivedSensitiveChartData: true,
      interpretationStabilityClaimed: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      publicReleaseAuthorized: false,
      networkTransmissionPerformed: false,
      networkTransmissionAuthorized: false,
      chartOrStorageMutationPerformed: false,
      overallGoodBad: null,
      usefulGod: null,
      eventOutcome: null,
      result: null
    }
  };
  return deepFreeze({
    ...payload,
    integrity: {
      hashAlgorithm: "SHA-256",
      payloadSha256: await sha256Hex(payload),
      authenticityClaimed: false
    }
  });
}

/** Strictly validates by rebuilding from the original Revision. */
export async function validateBaziBirthTimePerturbationStabilityReport(
  rawReport: unknown,
  rawRevision: unknown
): Promise<BaziBirthTimePerturbationStabilityReport> {
  preflightReport(rawReport);
  const reportSnapshot = canonicalClone(rawReport);
  const rebuilt = await buildBaziBirthTimePerturbationStabilityReport(rawRevision);
  if (!sameValue(reportSnapshot, rebuilt)) {
    throw new Error("出生民用时间扰动四柱投影报告与源 Revision 的规范重建不一致");
  }
  return rebuilt;
}
