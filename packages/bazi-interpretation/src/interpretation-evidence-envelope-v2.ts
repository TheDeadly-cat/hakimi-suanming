import type { RevisionRecord, TimeZoneResolution } from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  validateBaziBirthTimePerturbationStabilityReport,
  BAZI_BIRTH_TIME_PERTURBATION_OFFSETS,
  BAZI_BIRTH_TIME_PERTURBATION_STABILITY_PROFILE,
  type BaziBirthTimePerturbationBlockCode,
  type BaziBirthTimePerturbationCalculatedScenario,
  type BaziBirthTimePerturbationChangedFactPath,
  type BaziBirthTimePerturbationOffset,
  type BaziBirthTimePerturbationPillar,
  type BaziBirthTimePerturbationStabilityReport
} from "./birth-time-perturbation-stability";
import {
  buildBaziInterpretationEvidenceEnvelope,
  type BaziInterpretationEvidenceEnvelope,
  type BuildBaziInterpretationEvidenceEnvelopeInput
} from "./interpretation-evidence-envelope";

export const BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_V2_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.interpretation_evidence_envelope/0.2.0",
  contentVersion: "0.23.0",
  system: "bazi" as const,
  scope: "verified_v0_19_envelope_with_v0_22_birth_time_perturbation_summary" as const,
  aggregationPolicy: "scenario_derived_fail_closed" as const,
  mutationPolicy: "read_only_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

const BAZI_PILLAR_ORDER = Object.freeze([
  "year",
  "month",
  "day",
  "hour"
] as const satisfies readonly BaziBirthTimePerturbationPillar[]);

export type BaziInterpretationEvidenceEnvelopeV2TimeStatus =
  | "pillar_projection_unchanged_for_all_requested_offsets"
  | "pillar_projection_changed_within_requested_offsets"
  | "inconclusive_due_to_blocked_offsets";

export interface BaziInterpretationEvidenceEnvelopeV2BlockedOffset {
  offsetMinutes: BaziBirthTimePerturbationOffset;
  blockCode: BaziBirthTimePerturbationBlockCode;
  timeZoneResolutionKind: "unique" | "overlap" | "gap" | null;
  timeZoneResolutionStatus: TimeZoneResolution["status"] | null;
}

export interface BaziInterpretationEvidenceEnvelopeV2ResolvedOverlapOffset {
  offsetMinutes: BaziBirthTimePerturbationOffset;
  timeZoneResolutionStatus: "resolved_overlap_earlier" | "resolved_overlap_later";
  selectedTimeZoneCandidateChoice: "earlier" | "later";
}

export interface BaziInterpretationEvidenceEnvelopeV2TimeSummary {
  reportProfile: typeof BAZI_BIRTH_TIME_PERTURBATION_STABILITY_PROFILE;
  reportPayloadSha256: string;
  revisionSnapshotDigest: string;
  baselineFactsProjectionDigest: string;
  executorId: string;
  artifactRole: "current" | "retained";
  inputTimePrecision: "exact_minute" | "exact_second";
  status: BaziInterpretationEvidenceEnvelopeV2TimeStatus;
  requestedOffsetsMinutes: readonly BaziBirthTimePerturbationOffset[];
  calculatedOffsetsMinutes: readonly BaziBirthTimePerturbationOffset[];
  blockedOffsets: readonly BaziInterpretationEvidenceEnvelopeV2BlockedOffset[];
  resolvedOverlapOffsets: readonly BaziInterpretationEvidenceEnvelopeV2ResolvedOverlapOffset[];
  changedFromBaselineOffsetsMinutes: readonly BaziBirthTimePerturbationOffset[];
  changedPillarIdentities: readonly BaziBirthTimePerturbationPillar[];
  changedFactPaths: readonly BaziBirthTimePerturbationChangedFactPath[];
  counts: Readonly<{
    total: number;
    calculated: number;
    blocked: number;
    changedFromBaseline: number;
  }>;
  exactRegisteredReplayRequired: true;
  replayEvidenceScope: "registered_executor_recalculation_not_original_binary_attestation";
  historicalProgramBinaryAttestationClaimed: false;
  solarTimePerturbationStatus: "not_applied_to_any_calculated_or_time_zone_probed_scenario";
  solarTimeAppliedInAnyScenario: false;
  interpretationStabilityClaimed: false;
  note: string;
}

export interface BaziInterpretationEvidenceEnvelopeV2EffectiveStability {
  legacyRuleScenarioStatus: BaziInterpretationEvidenceEnvelope["stability"]["ruleScenarioStatus"];
  timePillarProjectionStatus: BaziInterpretationEvidenceEnvelopeV2TimeStatus;
  combinedInterpretationStatus: "not_assessed";
  interpretationStabilityClaimed: false;
  note: string;
}

export interface BaziInterpretationEvidenceEnvelopeV2 {
  profile: typeof BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_V2_PROFILE;
  binding: Readonly<{
    system: "bazi";
    revisionId: string;
    revisionNumber: number;
    revisionResultHash: string;
    ruleProfileDigest: string;
    tzdbVersion: string;
    engine: RevisionRecord["manifest"]["engine"];
    timeZoneDatabase: NonNullable<RevisionRecord["manifest"]["timeZoneDatabase"]>;
    rulePackBinding: RevisionRecord["rulePackBinding"] | null;
    legacyEnvelopePayloadSha256: string;
    birthTimePerturbationReportPayloadSha256: string;
    revisionSnapshotDigest: string;
  }>;
  legacyEnvelope: BaziInterpretationEvidenceEnvelope;
  timePerturbation: BaziInterpretationEvidenceEnvelopeV2TimeSummary;
  effectiveStability: BaziInterpretationEvidenceEnvelopeV2EffectiveStability;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
  boundary: Readonly<{
    legacyEnvelopePreservedUnmodified: true;
    timePerturbationSummaryDerivedFromScenarios: true;
    fullTimePerturbationReportCopied: false;
    rawBirthInputCopied: false;
    containsDerivedSensitiveChartData: true;
    interpretationStabilityClaimed: false;
    aiFaithfulnessValidationPerformed: false;
    aiNarrativeUseAuthorized: false;
    referenceResolutionEstablishesSemanticTruth: false;
    modelMayRecalculateFacts: false;
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

export interface BuildBaziInterpretationEvidenceEnvelopeV2Input {
  revision: RevisionRecord;
  legacyEnvelopeInput: BuildBaziInterpretationEvidenceEnvelopeInput;
  birthTimePerturbationReport: BaziBirthTimePerturbationStabilityReport;
}

type BaziInterpretationEvidenceEnvelopeV2Payload = Omit<
  BaziInterpretationEvidenceEnvelopeV2,
  "integrity"
>;

const ENVELOPE_V2_PREFLIGHT_LIMITS = Object.freeze({
  maxDepth: 128,
  maxValueNodes: 120_000,
  maxTextCharacters: 8_000_000,
  maxArrays: 10_000,
  maxArrayLength: 20_000,
  maxPropertyKeys: 160_000
});

const ENVELOPE_V2_BUILD_INPUT_KEYS = Object.freeze([
  "revision",
  "legacyEnvelopeInput",
  "birthTimePerturbationReport"
] as const);

const ENVELOPE_V2_LEGACY_BUILD_INPUT_KEYS = Object.freeze([
  "revision",
  "includeHour",
  "interpretation",
  "strengthSensitivity"
] as const);

const ENVELOPE_V2_KEYS = Object.freeze([
  "profile",
  "binding",
  "legacyEnvelope",
  "timePerturbation",
  "effectiveStability",
  "integrity",
  "boundary"
] as const);

interface EnvelopeV2PreflightBudget {
  valueNodes: number;
  textCharacters: number;
  arrays: number;
  propertyKeys: number;
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

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
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
  const stringKeys = ownKeys as string[];
  const expected = new Set(expectedKeys);
  if (
    stringKeys.length !== expectedKeys.length
    || stringKeys.some((key) => !expected.has(key))
  ) {
    throw new TypeError(`${subject} 字段不符合严格白名单`);
  }
  for (const key of stringKeys) {
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

function claimPreflightBudget(
  budget: EnvelopeV2PreflightBudget,
  field: keyof EnvelopeV2PreflightBudget,
  amount: number,
  limit: number,
  subject: string,
  label: string
): void {
  budget[field] += amount;
  if (budget[field] > limit) {
    throw new TypeError(`${subject}${label}超过规范克隆前上限 ${limit}`);
  }
}

function inspectBoundedDeclarativeJson(
  value: unknown,
  subject: string,
  path = subject,
  depth = 0,
  ancestors = new WeakSet<object>(),
  budget: EnvelopeV2PreflightBudget = {
    valueNodes: 0,
    textCharacters: 0,
    arrays: 0,
    propertyKeys: 0
  }
): void {
  if (depth > ENVELOPE_V2_PREFLIGHT_LIMITS.maxDepth) {
    throw new TypeError(
      `${subject}嵌套深度超过规范克隆前上限 ${ENVELOPE_V2_PREFLIGHT_LIMITS.maxDepth}`
    );
  }
  claimPreflightBudget(
    budget,
    "valueNodes",
    1,
    ENVELOPE_V2_PREFLIGHT_LIMITS.maxValueNodes,
    subject,
    "结构节点总量"
  );
  if (typeof value === "string") {
    claimPreflightBudget(
      budget,
      "textCharacters",
      value.length,
      ENVELOPE_V2_PREFLIGHT_LIMITS.maxTextCharacters,
      subject,
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
    throw new TypeError(`${path} 包含非声明式 JSON 值：${typeof value}`);
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
      if (length > ENVELOPE_V2_PREFLIGHT_LIMITS.maxArrayLength) {
        throw new TypeError(
          `${subject}单个数组长度超过规范克隆前上限 ${ENVELOPE_V2_PREFLIGHT_LIMITS.maxArrayLength}`
        );
      }
      claimPreflightBudget(
        budget,
        "arrays",
        1,
        ENVELOPE_V2_PREFLIGHT_LIMITS.maxArrays,
        subject,
        "数组总量"
      );
      const ownKeys = Reflect.ownKeys(objectValue);
      if (ownKeys.some((key) => typeof key !== "string")) {
        throw new TypeError(`${path} 不得携带符号键`);
      }
      claimPreflightBudget(
        budget,
        "propertyKeys",
        ownKeys.length,
        ENVELOPE_V2_PREFLIGHT_LIMITS.maxPropertyKeys,
        subject,
        "属性键总量"
      );
      if (ownKeys.length !== length + 1) {
        throw new TypeError(`${path} 必须是稠密且没有扩展字段的数组`);
      }
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError(`${path}[${key}] 必须是可枚举的自有声明式数组项`);
        }
        inspectBoundedDeclarativeJson(
          descriptor.value,
          subject,
          `${path}[${key}]`,
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
    claimPreflightBudget(
      budget,
      "propertyKeys",
      ownKeys.length,
      ENVELOPE_V2_PREFLIGHT_LIMITS.maxPropertyKeys,
      subject,
      "属性键总量"
    );
    for (const key of ownKeys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError(`${path}.${key} 必须是可枚举的自有声明式数据字段`);
      }
      claimPreflightBudget(
        budget,
        "textCharacters",
        key.length,
        ENVELOPE_V2_PREFLIGHT_LIMITS.maxTextCharacters,
        subject,
        "文本字符总量"
      );
      if (descriptor.value === undefined) continue;
      inspectBoundedDeclarativeJson(
        descriptor.value,
        subject,
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

function preflightBuildInput(rawInput: unknown): void {
  assertExactOwnDataRecord(
    rawInput,
    ENVELOPE_V2_BUILD_INPUT_KEYS,
    "八字解读证据 Envelope v2 构建输入"
  );
  const legacyEnvelopeInput = ownDataProperty(
    rawInput,
    "legacyEnvelopeInput",
    "八字解读证据 Envelope v2 构建输入.legacyEnvelopeInput"
  );
  assertExactOwnDataRecord(
    legacyEnvelopeInput,
    ENVELOPE_V2_LEGACY_BUILD_INPUT_KEYS,
    "八字解读证据 Envelope v2 的 v0.19 构建输入"
  );
  inspectBoundedDeclarativeJson(rawInput, "八字解读证据 Envelope v2 构建输入");
}

function preflightRawEnvelope(rawEnvelope: unknown): void {
  assertExactOwnDataRecord(
    rawEnvelope,
    ENVELOPE_V2_KEYS,
    "八字解读证据 Envelope v2 候选"
  );
  inspectBoundedDeclarativeJson(rawEnvelope, "八字解读证据 Envelope v2 候选");
}

function assertExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  subject: string
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${subject} 必须是对象`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new Error(`${subject} 不得携带符号键`);
  }
  const actual = (ownKeys as string[]).sort();
  const expected = [...expectedKeys].sort();
  if (!sameCanonical(actual, expected)) {
    throw new Error(`${subject} 字段不符合严格白名单`);
  }
}

function assertNoSymbolKeysDeep(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string")) {
    throw new Error("八字解读证据 Envelope v2 不得携带符号键");
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    assertNoSymbolKeysDeep(child, seen);
  }
}

function snapshotBuildInput(
  input: BuildBaziInterpretationEvidenceEnvelopeV2Input
): BuildBaziInterpretationEvidenceEnvelopeV2Input {
  let rawSnapshot: unknown;
  try {
    preflightBuildInput(input);
    rawSnapshot = canonicalClone(input);
  } catch (cause) {
    throw new Error("八字解读证据 Envelope v2 构建输入无法形成规范快照", { cause });
  }
  assertExactRecord(rawSnapshot, [
    "revision",
    "legacyEnvelopeInput",
    "birthTimePerturbationReport"
  ], "八字解读证据 Envelope v2 构建输入");
  assertExactRecord(rawSnapshot.legacyEnvelopeInput, [
    "revision",
    "includeHour",
    "interpretation",
    "strengthSensitivity"
  ], "八字解读证据 Envelope v2 的 v0.19 构建输入");
  const snapshot = rawSnapshot as unknown as BuildBaziInterpretationEvidenceEnvelopeV2Input;
  if (snapshot.legacyEnvelopeInput.includeHour !== true) {
    throw new Error("八字解读证据 Envelope v2 要求 legacyEnvelopeInput.includeHour 为 true");
  }
  if (!sameCanonical(snapshot.revision, snapshot.legacyEnvelopeInput.revision)) {
    throw new Error("八字解读证据 Envelope v2 的原始 Revision 与 v0.19 构建输入不是同一快照");
  }
  return deepFreeze(snapshot);
}

function assertArray(value: unknown, subject: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`${subject} 必须是数组`);
}

function parseRuntimeShape(raw: unknown): BaziInterpretationEvidenceEnvelopeV2 {
  assertNoSymbolKeysDeep(raw);
  assertExactRecord(raw, [
    "profile",
    "binding",
    "legacyEnvelope",
    "timePerturbation",
    "effectiveStability",
    "integrity",
    "boundary"
  ], "八字解读证据 Envelope v2");
  assertExactRecord(raw.profile, [
    "projectionVersion",
    "contentVersion",
    "system",
    "scope",
    "aggregationPolicy",
    "mutationPolicy",
    "reviewStatus",
    "expertTruthClaimed",
    "scientificValidityClaimed",
    "formalActivationAllowed"
  ], "八字解读证据 Envelope v2 profile");
  assertExactRecord(raw.binding, [
    "system",
    "revisionId",
    "revisionNumber",
    "revisionResultHash",
    "ruleProfileDigest",
    "tzdbVersion",
    "engine",
    "timeZoneDatabase",
    "rulePackBinding",
    "legacyEnvelopePayloadSha256",
    "birthTimePerturbationReportPayloadSha256",
    "revisionSnapshotDigest"
  ], "八字解读证据 Envelope v2 绑定");
  assertExactRecord(raw.timePerturbation, [
    "reportProfile",
    "reportPayloadSha256",
    "revisionSnapshotDigest",
    "baselineFactsProjectionDigest",
    "executorId",
    "artifactRole",
    "inputTimePrecision",
    "status",
    "requestedOffsetsMinutes",
    "calculatedOffsetsMinutes",
    "blockedOffsets",
    "resolvedOverlapOffsets",
    "changedFromBaselineOffsetsMinutes",
    "changedPillarIdentities",
    "changedFactPaths",
    "counts",
    "exactRegisteredReplayRequired",
    "replayEvidenceScope",
    "historicalProgramBinaryAttestationClaimed",
    "solarTimePerturbationStatus",
    "solarTimeAppliedInAnyScenario",
    "interpretationStabilityClaimed",
    "note"
  ], "八字解读证据 Envelope v2 出生时间扰动摘要");
  assertExactRecord(raw.timePerturbation.reportProfile, [
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
  ], "八字解读证据 Envelope v2 扰动报告 profile");
  assertArray(raw.timePerturbation.requestedOffsetsMinutes, "请求的出生时间偏移");
  assertArray(raw.timePerturbation.calculatedOffsetsMinutes, "已计算的出生时间偏移");
  assertArray(raw.timePerturbation.blockedOffsets, "被阻断的出生时间偏移");
  raw.timePerturbation.blockedOffsets.forEach((item, index) => assertExactRecord(item, [
    "offsetMinutes",
    "blockCode",
    "timeZoneResolutionKind",
    "timeZoneResolutionStatus"
  ], `被阻断的出生时间偏移 ${index + 1}`));
  assertArray(raw.timePerturbation.resolvedOverlapOffsets, "已解析的 DST 重叠偏移");
  raw.timePerturbation.resolvedOverlapOffsets.forEach((item, index) => assertExactRecord(item, [
    "offsetMinutes",
    "timeZoneResolutionStatus",
    "selectedTimeZoneCandidateChoice"
  ], `已解析的 DST 重叠偏移 ${index + 1}`));
  assertArray(raw.timePerturbation.changedFromBaselineOffsetsMinutes, "发生四柱投影变化的出生时间偏移");
  assertArray(raw.timePerturbation.changedPillarIdentities, "发生变化的柱身份");
  assertArray(raw.timePerturbation.changedFactPaths, "发生变化的柱事实路径");
  assertExactRecord(raw.timePerturbation.counts, [
    "total",
    "calculated",
    "blocked",
    "changedFromBaseline"
  ], "八字解读证据 Envelope v2 扰动计数");
  assertExactRecord(raw.effectiveStability, [
    "legacyRuleScenarioStatus",
    "timePillarProjectionStatus",
    "combinedInterpretationStatus",
    "interpretationStabilityClaimed",
    "note"
  ], "八字解读证据 Envelope v2 有效稳定性");
  assertExactRecord(raw.integrity, [
    "hashAlgorithm",
    "payloadSha256",
    "authenticityClaimed"
  ], "八字解读证据 Envelope v2 完整性");
  assertExactRecord(raw.boundary, [
    "legacyEnvelopePreservedUnmodified",
    "timePerturbationSummaryDerivedFromScenarios",
    "fullTimePerturbationReportCopied",
    "rawBirthInputCopied",
    "containsDerivedSensitiveChartData",
    "interpretationStabilityClaimed",
    "aiFaithfulnessValidationPerformed",
    "aiNarrativeUseAuthorized",
    "referenceResolutionEstablishesSemanticTruth",
    "modelMayRecalculateFacts",
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
  ], "八字解读证据 Envelope v2 安全边界");
  return raw as unknown as BaziInterpretationEvidenceEnvelopeV2;
}

function wrapperPayload(
  envelope: BaziInterpretationEvidenceEnvelopeV2
): BaziInterpretationEvidenceEnvelopeV2Payload {
  const { integrity: _integrity, ...payload } = envelope;
  return payload;
}

function requireSameRevisionBindings(
  revision: RevisionRecord,
  legacyEnvelope: BaziInterpretationEvidenceEnvelope,
  report: BaziBirthTimePerturbationStabilityReport
): void {
  const legacyEngine = legacyEnvelope.artifact.engine;
  const reportEngine = report.binding.engine;
  if (
    legacyEnvelope.artifact.revisionId !== revision.id
    || report.binding.revisionId !== revision.id
    || legacyEnvelope.artifact.revisionNumber !== revision.revisionNumber
    || report.binding.revisionNumber !== revision.revisionNumber
    || legacyEnvelope.artifact.artifactDigest !== revision.manifest.resultHash
    || report.binding.sourceResultHash !== revision.manifest.resultHash
    || legacyEnvelope.artifact.ruleProfileDigest !== revision.manifest.ruleProfileDigest
    || report.binding.ruleProfile.digest !== revision.manifest.ruleProfileDigest
    || legacyEnvelope.artifact.ruleProfileId !== revision.ruleProfile.profileId
    || report.binding.ruleProfile.id !== revision.ruleProfile.profileId
    || legacyEnvelope.artifact.ruleProfileVersion !== revision.ruleProfile.profileVersion
    || report.binding.ruleProfile.version !== revision.ruleProfile.profileVersion
    || legacyEnvelope.artifact.ruleProfileStatus !== revision.ruleProfile.status
    || report.binding.ruleProfile.status !== revision.ruleProfile.status
    || legacyEnvelope.artifact.tzdbVersion !== revision.manifest.tzdbVersion
    || report.binding.timeZoneDatabase.snapshotId !== revision.manifest.tzdbVersion
    || legacyEngine.id !== reportEngine.name
    || legacyEngine.version !== reportEngine.version
    || legacyEngine.upstreamId !== reportEngine.upstreamName
    || legacyEngine.upstreamVersion !== reportEngine.upstreamVersion
    || !sameCanonical(reportEngine, revision.manifest.engine)
    || !sameCanonical(report.binding.timeZoneDatabase, revision.manifest.timeZoneDatabase)
    || !sameCanonical(report.binding.rulePackBinding, revision.rulePackBinding ?? null)
  ) {
    throw new Error("v0.19 Envelope、v0.22 扰动报告与原始 Revision 的工件身份没有形成同一快照绑定");
  }
}

function deriveTimePerturbationSummary(
  report: BaziBirthTimePerturbationStabilityReport
): BaziInterpretationEvidenceEnvelopeV2TimeSummary {
  const requestedOffsetsMinutes = report.scenarios.map((scenario) => scenario.offsetMinutes);
  const orderedScenarios = report.scenarios.every((scenario, index) => scenario.order === index + 1);
  if (
    !orderedScenarios
    || !sameCanonical(requestedOffsetsMinutes, BAZI_BIRTH_TIME_PERTURBATION_OFFSETS)
  ) {
    throw new Error("v0.22 扰动场景没有完整覆盖固定偏移及规范顺序");
  }
  const calculated = report.scenarios.filter(
    (scenario): scenario is BaziBirthTimePerturbationCalculatedScenario => scenario.status === "calculated"
  );
  const blocked = report.scenarios.filter((scenario) => scenario.status === "blocked");
  if (
    calculated.some((scenario) => scenario.solarTimeApplied !== false)
    || report.scenarios.some((scenario) => Boolean(scenario.solarTimeApplied))
  ) {
    throw new Error("v0.22 扰动场景出现太阳时应用，v2 摘要保持关闭");
  }
  if (
    report.boundary.replayEvidenceScope
      !== "registered_executor_recalculation_not_original_binary_attestation"
    || report.boundary.historicalProgramBinaryAttestationClaimed !== false
  ) {
    throw new Error("v0.22 扰动报告的注册复算证据边界没有保持关闭");
  }
  const changed = calculated.filter((scenario) => !scenario.sameProjectionAsBaseline);
  const changedPillarSet = new Set(calculated.flatMap((scenario) => scenario.changedPillarIdentities));
  const changedPillarIdentities = BAZI_PILLAR_ORDER.filter((pillar) => changedPillarSet.has(pillar));
  const changedFactPaths = Array.from(new Set(
    calculated.flatMap((scenario) => scenario.changedFactPaths)
  ));
  const resolvedOverlapOffsets = calculated
    .filter((scenario) => scenario.timeZoneResolutionKind === "overlap")
    .map((scenario) => {
      if (
        (scenario.timeZoneResolutionStatus !== "resolved_overlap_earlier"
          && scenario.timeZoneResolutionStatus !== "resolved_overlap_later")
        || (scenario.selectedTimeZoneCandidateChoice !== "earlier"
          && scenario.selectedTimeZoneCandidateChoice !== "later")
      ) {
        throw new Error("v0.22 已计算的 DST 重叠场景没有保存较早或较晚候选选择");
      }
      return {
        offsetMinutes: scenario.offsetMinutes,
        timeZoneResolutionStatus: scenario.timeZoneResolutionStatus,
        selectedTimeZoneCandidateChoice: scenario.selectedTimeZoneCandidateChoice
      };
    });
  const status: BaziInterpretationEvidenceEnvelopeV2TimeStatus = blocked.length > 0
    ? "inconclusive_due_to_blocked_offsets"
    : changed.length > 0
      ? "pillar_projection_changed_within_requested_offsets"
      : "pillar_projection_unchanged_for_all_requested_offsets";
  const blockedOffsets = blocked.map((scenario) => ({
    offsetMinutes: scenario.offsetMinutes,
    blockCode: scenario.blockCode,
    timeZoneResolutionKind: scenario.timeZoneResolutionKind,
    timeZoneResolutionStatus: scenario.timeZoneResolutionStatus
  }));
  return deepFreeze({
    reportProfile: BAZI_BIRTH_TIME_PERTURBATION_STABILITY_PROFILE,
    reportPayloadSha256: report.integrity.payloadSha256,
    revisionSnapshotDigest: report.binding.revisionSnapshotDigest,
    baselineFactsProjectionDigest: report.binding.baselineFactsProjectionDigest,
    executorId: report.binding.executorId,
    artifactRole: report.binding.artifactRole,
    inputTimePrecision: report.binding.inputTimePrecision,
    status,
    requestedOffsetsMinutes,
    calculatedOffsetsMinutes: calculated.map((scenario) => scenario.offsetMinutes),
    blockedOffsets,
    resolvedOverlapOffsets,
    changedFromBaselineOffsetsMinutes: changed.map((scenario) => scenario.offsetMinutes),
    changedPillarIdentities,
    changedFactPaths,
    counts: {
      total: requestedOffsetsMinutes.length,
      calculated: calculated.length,
      blocked: blocked.length,
      changedFromBaseline: changed.length
    },
    exactRegisteredReplayRequired: true,
    replayEvidenceScope: "registered_executor_recalculation_not_original_binary_attestation",
    historicalProgramBinaryAttestationClaimed: false,
    solarTimePerturbationStatus: "not_applied_to_any_calculated_or_time_zone_probed_scenario",
    solarTimeAppliedInAnyScenario: false,
    interpretationStabilityClaimed: false,
    note: blocked.length > 0
      ? "至少一个固定偏移场景被阻断；v2 摘要保持 inconclusive，不把已计算子集外推到完整窗口或解读稳定性。"
      : "摘要只覆盖固定七个民用时间偏移下的四柱派生投影，不证明真实出生时间、解读稳定性或术数真值。"
  });
}

function buildBinding(
  revision: RevisionRecord,
  legacyEnvelope: BaziInterpretationEvidenceEnvelope,
  report: BaziBirthTimePerturbationStabilityReport
): BaziInterpretationEvidenceEnvelopeV2["binding"] {
  return Object.freeze({
    system: "bazi" as const,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    revisionResultHash: revision.manifest.resultHash,
    ruleProfileDigest: revision.manifest.ruleProfileDigest,
    tzdbVersion: revision.manifest.tzdbVersion,
    engine: report.binding.engine,
    timeZoneDatabase: report.binding.timeZoneDatabase,
    rulePackBinding: report.binding.rulePackBinding,
    legacyEnvelopePayloadSha256: legacyEnvelope.integrity.payloadSha256,
    birthTimePerturbationReportPayloadSha256: report.integrity.payloadSha256,
    revisionSnapshotDigest: report.binding.revisionSnapshotDigest
  });
}

function buildEffectiveStability(
  legacyEnvelope: BaziInterpretationEvidenceEnvelope,
  timePerturbation: BaziInterpretationEvidenceEnvelopeV2TimeSummary
): BaziInterpretationEvidenceEnvelopeV2EffectiveStability {
  return Object.freeze({
    legacyRuleScenarioStatus: legacyEnvelope.stability.ruleScenarioStatus,
    timePillarProjectionStatus: timePerturbation.status,
    combinedInterpretationStatus: "not_assessed" as const,
    interpretationStabilityClaimed: false as const,
    note: "旺衰规则场景与出生时间四柱投影只并列呈现；尚未重跑并验证各偏移下的完整解读，因此不得合成为解读稳定性结论。"
  });
}

function buildBoundary(): BaziInterpretationEvidenceEnvelopeV2["boundary"] {
  return Object.freeze({
    legacyEnvelopePreservedUnmodified: true as const,
    timePerturbationSummaryDerivedFromScenarios: true as const,
    fullTimePerturbationReportCopied: false as const,
    rawBirthInputCopied: false as const,
    containsDerivedSensitiveChartData: true as const,
    interpretationStabilityClaimed: false as const,
    aiFaithfulnessValidationPerformed: false as const,
    aiNarrativeUseAuthorized: false as const,
    referenceResolutionEstablishesSemanticTruth: false as const,
    modelMayRecalculateFacts: false as const,
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const,
    formalActivationAllowed: false as const,
    publicReleaseAuthorized: false as const,
    networkTransmissionPerformed: false as const,
    networkTransmissionAuthorized: false as const,
    chartOrStorageMutationPerformed: false as const,
    overallGoodBad: null,
    usefulGod: null,
    eventOutcome: null,
    result: null
  });
}

function assertCandidateBoundary(envelope: BaziInterpretationEvidenceEnvelopeV2): void {
  if (!sameCanonical(envelope.profile, BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_V2_PROFILE)) {
    throw new Error("八字解读证据 Envelope v2 profile 不匹配");
  }
  if (!sameCanonical(envelope.boundary, buildBoundary())) {
    throw new Error("八字解读证据 Envelope v2 安全边界未关闭");
  }
  if (
    envelope.integrity.hashAlgorithm !== "SHA-256"
    || envelope.integrity.authenticityClaimed !== false
    || !/^[a-f0-9]{64}$/u.test(envelope.integrity.payloadSha256)
  ) {
    throw new Error("八字解读证据 Envelope v2 完整性字段无效");
  }
}

export async function buildBaziInterpretationEvidenceEnvelopeV2(
  input: BuildBaziInterpretationEvidenceEnvelopeV2Input
): Promise<BaziInterpretationEvidenceEnvelopeV2> {
  const snapshot = snapshotBuildInput(input);
  const legacyEnvelope = await buildBaziInterpretationEvidenceEnvelope(snapshot.legacyEnvelopeInput);
  const report = await validateBaziBirthTimePerturbationStabilityReport(
    snapshot.birthTimePerturbationReport,
    snapshot.revision
  );
  requireSameRevisionBindings(snapshot.revision, legacyEnvelope, report);
  const timePerturbation = deriveTimePerturbationSummary(report);
  const payload: BaziInterpretationEvidenceEnvelopeV2Payload = {
    profile: BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_V2_PROFILE,
    binding: buildBinding(snapshot.revision, legacyEnvelope, report),
    legacyEnvelope,
    timePerturbation,
    effectiveStability: buildEffectiveStability(legacyEnvelope, timePerturbation),
    boundary: buildBoundary()
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

/** Strictly validates by rebuilding from the original Revision, v0.19 build input and v0.22 report. */
export async function validateBaziInterpretationEvidenceEnvelopeV2(
  rawEnvelope: unknown,
  expectedInput: BuildBaziInterpretationEvidenceEnvelopeV2Input
): Promise<BaziInterpretationEvidenceEnvelopeV2> {
  const inputSnapshot = snapshotBuildInput(expectedInput);
  let rawSnapshot: unknown;
  try {
    preflightRawEnvelope(rawEnvelope);
    rawSnapshot = canonicalClone(rawEnvelope);
  } catch (cause) {
    throw new Error("八字解读证据 Envelope v2 候选无法形成规范快照", { cause });
  }
  const candidateSnapshot = deepFreeze(parseRuntimeShape(rawSnapshot));
  assertCandidateBoundary(candidateSnapshot);
  if (await sha256Hex(wrapperPayload(candidateSnapshot)) !== candidateSnapshot.integrity.payloadSha256) {
    throw new Error("八字解读证据 Envelope v2 payload 摘要不匹配");
  }
  const expected = await buildBaziInterpretationEvidenceEnvelopeV2(inputSnapshot);
  if (!sameCanonical(candidateSnapshot, expected)) {
    throw new Error("八字解读证据 Envelope v2 与原始 Revision、v0.19 输入和 v0.22 报告的规范重建不一致");
  }
  return expected;
}
