import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION,
  evaluateBaziInterpretationAiFaithfulness,
  type BaziAiAssertionFamily,
  type BaziInterpretationAiAssertionDraft,
  type BaziInterpretationAiFaithfulnessResult
} from "./interpretation-ai-faithfulness";
import {
  validateBaziInterpretationEvidenceEnvelopeV2,
  type BaziInterpretationEvidenceEnvelopeV2,
  type BaziInterpretationEvidenceEnvelopeV2TimeSummary,
  type BuildBaziInterpretationEvidenceEnvelopeV2Input
} from "./interpretation-evidence-envelope-v2";

export const BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_V2_VERSION =
  "hakimi.bazi.interpretation_ai_assertion_draft/0.2.0" as const;

export const BAZI_INTERPRETATION_AI_FAITHFULNESS_V2_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.interpretation_ai_faithfulness/0.2.0",
  contentVersion: "0.24.0",
  system: "bazi" as const,
  scope: "verified_v2_envelope_with_legacy_v0_1_and_closed_time_assertion_partitions" as const,
  classificationPolicy: "exact_local_renderer_reference_checks_without_cross_partition_score" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export const BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID =
  "time_perturbation.summary" as const;

export const BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID =
  "effective_stability.combined_interpretation_status" as const;

export type BaziInterpretationAiV2TimeAssertionFamily =
  | "time_summary_quote"
  | "combined_interpretation_status_quote";

export interface BaziInterpretationAiV2TimeAssertionDraftItem {
  assertionId: string;
  order: number;
  family: BaziInterpretationAiV2TimeAssertionFamily;
  subjectId: string;
  content: string;
}

export interface BaziInterpretationAiAssertionDraftV2 {
  profileVersion: typeof BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_V2_VERSION;
  envelopeV2PayloadSha256: string;
  legacyDraft: BaziInterpretationAiAssertionDraft;
  timeAssertions: readonly BaziInterpretationAiV2TimeAssertionDraftItem[];
}

export type BaziInterpretationAiV2TimeVerdict =
  | "advisory"
  | "invented"
  | "unsupported"
  | "blocked";

export interface BaziInterpretationAiV2TimeAssertionResult {
  assertionRef: string;
  order: number;
  family: BaziInterpretationAiV2TimeAssertionFamily;
  subjectId:
    | typeof BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID
    | typeof BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID
    | null;
  inputContentSha256: string;
  verdict: BaziInterpretationAiV2TimeVerdict;
  machineCheckable: true;
  displayStatus: "visible_with_caveat" | "withheld";
  canonicalContent: string | null;
  evidencePath:
    | "timePerturbation"
    | "effectiveStability.combinedInterpretationStatus"
    | null;
  projectionScope: "all_requested_offsets" | "calculated_subset_only" | null;
  missingEvidence: readonly string[];
  rationale: string;
  interpretationStabilityClaimed: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  result: null;
}

export interface BaziInterpretationAiFaithfulnessV2Result {
  profile: typeof BAZI_INTERPRETATION_AI_FAITHFULNESS_V2_PROFILE;
  binding: Readonly<{
    revisionId: string;
    revisionNumber: number;
    revisionResultHash: string;
    revisionSnapshotDigest: string;
    envelopeV2PayloadSha256: string;
    legacyEnvelopePayloadSha256: string;
    birthTimePerturbationReportPayloadSha256: string;
    outerDraftSha256: string;
    legacyDraftSha256: string;
    legacyResultPayloadSha256: string;
  }>;
  legacyResult: BaziInterpretationAiFaithfulnessResult;
  timeAssertions: readonly BaziInterpretationAiV2TimeAssertionResult[];
  timeAssessment: Readonly<{
    counts: Readonly<{
      assertionsTotal: number;
      displayable: number;
      advisory: number;
      invented: number;
      unsupported: number;
      blocked: number;
    }>;
    projectionScope: "all_requested_offsets" | "calculated_subset_only";
    combinedInterpretationStatus: "not_assessed";
    interpretationStabilityClaimed: false;
    overallStatus: "no_time_assertions" | "caveated_exact_quotes_only" | "withheld";
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
  boundary: Readonly<{
    verifiedEnvelopeV2RebuiltBeforeEvaluation: true;
    legacyDraftNestedUnmodified: true;
    legacyResultNestedUnmodified: true;
    timeAssertionsClosedGrammarOnly: true;
    timeAssertionExactMatchesAdvisoryOnly: true;
    blockedWindowClaimsLimitedToCalculatedSubset: true;
    combinedInterpretationStatus: "not_assessed";
    interpretationStabilityClaimed: false;
    crossPartitionRatioProduced: false;
    outerDraftContentCopied: false;
    fullTimePerturbationScenariosCopied: false;
    rawBirthInputCopied: false;
    containsDerivedSensitiveChartData: true;
    freeformTimeContentDisplayAuthorized: false;
    unknownSubjectIdentifiersCopied: false;
    modelMayRecalculateFacts: false;
    exactQuoteMatchEstablishesSemanticTruth: false;
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

export interface EvaluateBaziInterpretationAiFaithfulnessV2Input {
  envelope: unknown;
  envelopeInput: BuildBaziInterpretationEvidenceEnvelopeV2Input;
  draft: unknown;
}

type BaziInterpretationAiFaithfulnessV2Payload = Omit<
  BaziInterpretationAiFaithfulnessV2Result,
  "integrity"
>;

type TimeAssertionEvaluation = Omit<
  BaziInterpretationAiV2TimeAssertionResult,
  "inputContentSha256"
>;

const MAX_ASSERTIONS = 64;
const MAX_ASSERTION_ID_CHARACTERS = 200;
const MAX_ASSERTION_CONTENT_CHARACTERS = 2_000;
const MAX_TOTAL_CONTENT_CHARACTERS = 32_000;
const ASSERTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const UNSAFE_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;

const LEGACY_QUOTE_FAMILIES = new Set<BaziAiAssertionFamily>([
  "fact_quote",
  "canonical_claim_quote",
  "rule_quote"
]);

const LEGACY_FAMILIES = new Set<BaziAiAssertionFamily>([
  ...LEGACY_QUOTE_FAMILIES,
  "freeform_interpretation",
  "overall_good_bad",
  "useful_god",
  "event_outcome",
  "expert_truth",
  "scientific_validity"
]);

const TIME_FAMILIES = new Set<BaziInterpretationAiV2TimeAssertionFamily>([
  "time_summary_quote",
  "combined_interpretation_status_quote"
]);

const PREFLIGHT_LIMITS = Object.freeze({
  maxDepth: 128,
  maxValueNodes: 180_000,
  maxTextCharacters: 10_000_000,
  maxArrays: 15_000,
  maxArrayLength: 20_000,
  maxPropertyKeys: 240_000
});

const EVALUATION_INPUT_KEYS = Object.freeze(["envelope", "envelopeInput", "draft"] as const);
const ENVELOPE_V2_KEYS = Object.freeze([
  "profile",
  "binding",
  "legacyEnvelope",
  "timePerturbation",
  "effectiveStability",
  "integrity",
  "boundary"
] as const);
const ENVELOPE_V2_INPUT_KEYS = Object.freeze([
  "revision",
  "legacyEnvelopeInput",
  "birthTimePerturbationReport"
] as const);
const LEGACY_ENVELOPE_INPUT_KEYS = Object.freeze([
  "revision",
  "includeHour",
  "interpretation",
  "strengthSensitivity"
] as const);
const OUTER_DRAFT_KEYS = Object.freeze([
  "profileVersion",
  "envelopeV2PayloadSha256",
  "legacyDraft",
  "timeAssertions"
] as const);
const LEGACY_DRAFT_KEYS = Object.freeze([
  "profileVersion",
  "envelopePayloadSha256",
  "assertions"
] as const);
const RESULT_KEYS = Object.freeze([
  "profile",
  "binding",
  "legacyResult",
  "timeAssertions",
  "timeAssessment",
  "integrity",
  "boundary"
] as const);

interface PreflightBudget {
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

function claimBudget(
  budget: PreflightBudget,
  field: keyof PreflightBudget,
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
  budget: PreflightBudget = {
    valueNodes: 0,
    textCharacters: 0,
    arrays: 0,
    propertyKeys: 0
  }
): void {
  if (depth > PREFLIGHT_LIMITS.maxDepth) {
    throw new TypeError(`${subject}嵌套深度超过规范克隆前上限 ${PREFLIGHT_LIMITS.maxDepth}`);
  }
  claimBudget(budget, "valueNodes", 1, PREFLIGHT_LIMITS.maxValueNodes, subject, "结构节点总量");
  if (typeof value === "string") {
    claimBudget(
      budget,
      "textCharacters",
      value.length,
      PREFLIGHT_LIMITS.maxTextCharacters,
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
      if (length > PREFLIGHT_LIMITS.maxArrayLength) {
        throw new TypeError(`${subject}单个数组长度超过规范克隆前上限 ${PREFLIGHT_LIMITS.maxArrayLength}`);
      }
      claimBudget(budget, "arrays", 1, PREFLIGHT_LIMITS.maxArrays, subject, "数组总量");
      const ownKeys = Reflect.ownKeys(objectValue);
      if (ownKeys.some((key) => typeof key !== "string")) {
        throw new TypeError(`${path} 不得携带符号键`);
      }
      claimBudget(
        budget,
        "propertyKeys",
        ownKeys.length,
        PREFLIGHT_LIMITS.maxPropertyKeys,
        subject,
        "属性键总量"
      );
      if (ownKeys.length !== length + 1) {
        throw new TypeError(`${path} 必须是稠密且没有扩展字段的数组`);
      }
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(objectValue, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError(`${path} 的第 ${index + 1} 项必须是可枚举的自有声明式数据字段`);
        }
        inspectBoundedDeclarativeJson(
          descriptor.value,
          subject,
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
    claimBudget(
      budget,
      "propertyKeys",
      ownKeys.length,
      PREFLIGHT_LIMITS.maxPropertyKeys,
      subject,
      "属性键总量"
    );
    const stringKeys = ownKeys as string[];
    for (let index = 0; index < stringKeys.length; index += 1) {
      const key = stringKeys[index]!;
      const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError(`${path} 的第 ${index + 1} 个字段必须是可枚举的自有声明式数据字段`);
      }
      claimBudget(
        budget,
        "textCharacters",
        key.length,
        PREFLIGHT_LIMITS.maxTextCharacters,
        subject,
        "文本字符总量"
      );
      inspectBoundedDeclarativeJson(
        descriptor.value,
        subject,
        `${path}.field#${index + 1}`,
        depth + 1,
        ancestors,
        budget
      );
    }
  } finally {
    ancestors.delete(objectValue);
  }
}

function assertEvaluationInputTopLevel(rawInput: unknown): void {
  assertExactOwnDataRecord(rawInput, EVALUATION_INPUT_KEYS, "AI 忠实性 v2 评估输入");
  const envelope = ownDataProperty(rawInput, "envelope", "AI 忠实性 v2 评估输入.envelope");
  assertExactOwnDataRecord(envelope, ENVELOPE_V2_KEYS, "AI 忠实性 v2 Envelope");
  const envelopeInput = ownDataProperty(
    rawInput,
    "envelopeInput",
    "AI 忠实性 v2 评估输入.envelopeInput"
  );
  assertExactOwnDataRecord(envelopeInput, ENVELOPE_V2_INPUT_KEYS, "AI 忠实性 v2 Envelope 重建输入");
  const legacyEnvelopeInput = ownDataProperty(
    envelopeInput,
    "legacyEnvelopeInput",
    "AI 忠实性 v2 Envelope 重建输入.legacyEnvelopeInput"
  );
  assertExactOwnDataRecord(
    legacyEnvelopeInput,
    LEGACY_ENVELOPE_INPUT_KEYS,
    "AI 忠实性 v2 的 legacy Envelope 重建输入"
  );
  const draft = ownDataProperty(rawInput, "draft", "AI 忠实性 v2 评估输入.draft");
  assertExactOwnDataRecord(draft, OUTER_DRAFT_KEYS, "AI 忠实性 v2 草稿");
  const legacyDraft = ownDataProperty(draft, "legacyDraft", "AI 忠实性 v2 草稿.legacyDraft");
  assertExactOwnDataRecord(legacyDraft, LEGACY_DRAFT_KEYS, "AI 忠实性 v2 的 legacy 草稿");
}

function preflightEvaluationInput(rawInput: unknown): void {
  assertEvaluationInputTopLevel(rawInput);
  inspectBoundedDeclarativeJson(rawInput, "AI 忠实性 v2 评估输入");
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
  const strings = ownKeys as string[];
  const expected = new Set(expectedKeys);
  if (strings.length !== expectedKeys.length || strings.some((key) => !expected.has(key))) {
    throw new Error(`${subject} 字段不符合严格白名单`);
  }
}

function assertDenseArray(value: unknown, subject: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`${subject} 必须是数组`);
}

function assertValidAssertionId(value: unknown, ordinal: number, partition: "legacy" | "time"): asserts value is string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > MAX_ASSERTION_ID_CHARACTERS
    || !ASSERTION_ID_PATTERN.test(value)
  ) {
    throw new Error(`AI v2 ${partition} 分区第 ${ordinal} 条断言的 assertionId 无效`);
  }
}

function assertValidSubjectId(value: unknown, ordinal: number, partition: "legacy" | "time"): asserts value is string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > MAX_ASSERTION_ID_CHARACTERS
    || !ASSERTION_ID_PATTERN.test(value)
    || UNSAFE_CONTROL_PATTERN.test(value)
  ) {
    throw new Error(`AI v2 ${partition} 分区第 ${ordinal} 条断言的 subjectId 无效`);
  }
}

function assertValidContent(value: unknown, ordinal: number, partition: "legacy" | "time"): asserts value is string {
  if (
    typeof value !== "string"
    || value.trim().length === 0
    || value.length > MAX_ASSERTION_CONTENT_CHARACTERS
    || UNSAFE_CONTROL_PATTERN.test(value)
  ) {
    throw new Error(`AI v2 ${partition} 分区第 ${ordinal} 条断言的 content 无效`);
  }
}

function parseDraft(rawDraft: unknown): BaziInterpretationAiAssertionDraftV2 {
  assertExactRecord(rawDraft, OUTER_DRAFT_KEYS, "AI 忠实性 v2 草稿");
  if (rawDraft.profileVersion !== BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_V2_VERSION) {
    throw new Error("AI 忠实性 v2 草稿 profileVersion 不匹配");
  }
  if (
    typeof rawDraft.envelopeV2PayloadSha256 !== "string"
    || !SHA256_PATTERN.test(rawDraft.envelopeV2PayloadSha256)
  ) {
    throw new Error("AI 忠实性 v2 草稿缺少有效的 Envelope v2 payload 摘要");
  }
  assertExactRecord(rawDraft.legacyDraft, LEGACY_DRAFT_KEYS, "AI 忠实性 v2 的 legacy 草稿");
  const legacyDraft = rawDraft.legacyDraft;
  if (legacyDraft.profileVersion !== BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION) {
    throw new Error("AI 忠实性 v2 的 legacy 草稿 profileVersion 不匹配");
  }
  if (
    typeof legacyDraft.envelopePayloadSha256 !== "string"
    || !SHA256_PATTERN.test(legacyDraft.envelopePayloadSha256)
  ) {
    throw new Error("AI 忠实性 v2 的 legacy 草稿缺少有效 Envelope 摘要");
  }
  assertDenseArray(legacyDraft.assertions, "AI 忠实性 v2 的 legacy 断言");
  assertDenseArray(rawDraft.timeAssertions, "AI 忠实性 v2 的时间断言");
  if (legacyDraft.assertions.length > MAX_ASSERTIONS || rawDraft.timeAssertions.length > MAX_ASSERTIONS) {
    throw new Error(`AI 忠实性 v2 每个分区最多允许 ${MAX_ASSERTIONS} 条断言`);
  }

  let totalContentCharacters = 0;
  const assertionIds = new Set<string>();
  const legacySemanticKeys = new Set<string>();
  legacyDraft.assertions.forEach((candidate, index) => {
    const ordinal = index + 1;
    assertExactRecord(
      candidate,
      ["assertionId", "order", "family", "subjectId", "content"],
      `AI v2 legacy 分区第 ${ordinal} 条断言`
    );
    assertValidAssertionId(candidate.assertionId, ordinal, "legacy");
    if (assertionIds.has(candidate.assertionId)) {
      throw new Error(`AI v2 legacy 分区第 ${ordinal} 条断言的 assertionId 重复`);
    }
    assertionIds.add(candidate.assertionId);
    if (candidate.order !== ordinal) {
      throw new Error(`AI v2 legacy 分区第 ${ordinal} 条断言顺序无效`);
    }
    if (typeof candidate.family !== "string" || !LEGACY_FAMILIES.has(candidate.family as BaziAiAssertionFamily)) {
      throw new Error(`AI v2 legacy 分区第 ${ordinal} 条断言使用未知 family`);
    }
    const family = candidate.family as BaziAiAssertionFamily;
    if (LEGACY_QUOTE_FAMILIES.has(family)) {
      assertValidSubjectId(candidate.subjectId, ordinal, "legacy");
    } else if (candidate.subjectId !== null) {
      throw new Error(`AI v2 legacy 分区第 ${ordinal} 条断言不得携带 subjectId`);
    }
    assertValidContent(candidate.content, ordinal, "legacy");
    totalContentCharacters += candidate.content.length;
    const semanticKey = canonicalStringify([family, candidate.subjectId, candidate.content]);
    if (legacySemanticKeys.has(semanticKey)) {
      throw new Error(`AI v2 legacy 分区第 ${ordinal} 条断言重复了同一语义键`);
    }
    legacySemanticKeys.add(semanticKey);
  });

  const timeSemanticKeys = new Set<string>();
  rawDraft.timeAssertions.forEach((candidate, index) => {
    const ordinal = index + 1;
    assertExactRecord(
      candidate,
      ["assertionId", "order", "family", "subjectId", "content"],
      `AI v2 time 分区第 ${ordinal} 条断言`
    );
    assertValidAssertionId(candidate.assertionId, ordinal, "time");
    if (assertionIds.has(candidate.assertionId)) {
      throw new Error(`AI v2 time 分区第 ${ordinal} 条断言的 assertionId 重复`);
    }
    assertionIds.add(candidate.assertionId);
    if (candidate.order !== ordinal) {
      throw new Error(`AI v2 time 分区第 ${ordinal} 条断言顺序无效`);
    }
    if (
      typeof candidate.family !== "string"
      || !TIME_FAMILIES.has(candidate.family as BaziInterpretationAiV2TimeAssertionFamily)
    ) {
      throw new Error(`AI v2 time 分区第 ${ordinal} 条断言使用未知 family`);
    }
    assertValidSubjectId(candidate.subjectId, ordinal, "time");
    assertValidContent(candidate.content, ordinal, "time");
    totalContentCharacters += candidate.content.length;
    const semanticKey = canonicalStringify([candidate.family, candidate.subjectId, candidate.content]);
    if (timeSemanticKeys.has(semanticKey)) {
      throw new Error(`AI v2 time 分区第 ${ordinal} 条断言重复了同一语义键`);
    }
    timeSemanticKeys.add(semanticKey);
  });

  const assertionsTotal = legacyDraft.assertions.length + rawDraft.timeAssertions.length;
  if (assertionsTotal > MAX_ASSERTIONS) {
    throw new Error(`AI 忠实性 v2 两个分区合计最多允许 ${MAX_ASSERTIONS} 条断言`);
  }
  if (totalContentCharacters > MAX_TOTAL_CONTENT_CHARACTERS) {
    throw new Error(`AI 忠实性 v2 两个分区正文合计不得超过 ${MAX_TOTAL_CONTENT_CHARACTERS} 字符`);
  }
  return rawDraft as unknown as BaziInterpretationAiAssertionDraftV2;
}

function snapshotEvaluationInput(
  rawInput: EvaluateBaziInterpretationAiFaithfulnessV2Input
): EvaluateBaziInterpretationAiFaithfulnessV2Input & { draft: BaziInterpretationAiAssertionDraftV2 } {
  let snapshot: unknown;
  try {
    preflightEvaluationInput(rawInput);
    snapshot = canonicalClone(rawInput);
  } catch (cause) {
    throw new Error("AI 忠实性 v2 评估输入无法形成规范快照", { cause });
  }
  assertExactRecord(snapshot, EVALUATION_INPUT_KEYS, "AI 忠实性 v2 评估输入");
  const draft = parseDraft(snapshot.draft);
  return deepFreeze({
    envelope: snapshot.envelope,
    envelopeInput: snapshot.envelopeInput as unknown as BuildBaziInterpretationEvidenceEnvelopeV2Input,
    draft
  });
}

function formatOffset(offset: number): string {
  return offset > 0 ? `+${offset}` : String(offset);
}

function formatList(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(",");
}

function renderTimeSummaryQuote(summary: BaziInterpretationEvidenceEnvelopeV2TimeSummary): string {
  const resolvedOverlapOffsets = summary.resolvedOverlapOffsets.map((item) => {
    const expectedChoice = item.timeZoneResolutionStatus === "resolved_overlap_earlier"
      ? "earlier"
      : item.timeZoneResolutionStatus === "resolved_overlap_later"
        ? "later"
        : null;
    if (expectedChoice === null || item.selectedTimeZoneCandidateChoice !== expectedChoice) {
      throw new Error("已验证 Envelope v2 的 DST 重叠状态与候选选择不一致");
    }
    return `${formatOffset(item.offsetMinutes)}:${item.timeZoneResolutionStatus}:${item.selectedTimeZoneCandidateChoice}`;
  });
  const blockedOffsets = summary.blockedOffsets.map((item) => (
    `${formatOffset(item.offsetMinutes)}:${item.blockCode}:${item.timeZoneResolutionKind ?? "null"}:${item.timeZoneResolutionStatus ?? "null"}`
  ));
  const scope = summary.status === "inconclusive_due_to_blocked_offsets"
    ? "calculated_subset_only"
    : "all_requested_offsets";
  return [
    `timePillarProjectionStatus=${summary.status}`,
    `projectionScope=${scope}`,
    `requestedOffsetsMinutes=[${summary.requestedOffsetsMinutes.map(formatOffset).join(",")}]`,
    `calculatedOffsetsMinutes=[${summary.calculatedOffsetsMinutes.map(formatOffset).join(",")}]`,
    `blockedOffsets=[${formatList(blockedOffsets)}]`,
    `resolvedOverlapOffsets=[${formatList(resolvedOverlapOffsets)}]`,
    `changedFromBaselineOffsetsMinutes=[${formatList(summary.changedFromBaselineOffsetsMinutes.map(formatOffset))}]`,
    `changedPillarIdentities=[${formatList([...summary.changedPillarIdentities])}]`,
    `changedFactPaths=[${formatList([...summary.changedFactPaths])}]`,
    "interpretationStabilityClaimed=false"
  ].join("; ");
}

function renderCombinedInterpretationStatusQuote(): string {
  return "combinedInterpretationStatus=not_assessed; interpretationStabilityClaimed=false";
}

function timeProjectionScope(
  envelope: BaziInterpretationEvidenceEnvelopeV2
): "all_requested_offsets" | "calculated_subset_only" {
  return envelope.timePerturbation.status === "inconclusive_due_to_blocked_offsets"
    ? "calculated_subset_only"
    : "all_requested_offsets";
}

function baseTimeEvaluation(
  assertion: BaziInterpretationAiV2TimeAssertionDraftItem,
  input: Omit<
    TimeAssertionEvaluation,
    | "assertionRef"
    | "order"
    | "family"
    | "machineCheckable"
    | "interpretationStabilityClaimed"
    | "expertTruthClaimed"
    | "scientificValidityClaimed"
    | "formalActivationAllowed"
    | "result"
  >
): TimeAssertionEvaluation {
  return {
    assertionRef: `time_assertion:${assertion.order}`,
    order: assertion.order,
    family: assertion.family,
    ...input,
    machineCheckable: true,
    interpretationStabilityClaimed: false,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    result: null
  };
}

function evaluateTimeAssertion(
  assertion: BaziInterpretationAiV2TimeAssertionDraftItem,
  envelope: BaziInterpretationEvidenceEnvelopeV2,
  canonicalTimeSummary: string,
  canonicalCombinedStatus: string
): TimeAssertionEvaluation {
  const expectedSubject = assertion.family === "time_summary_quote"
    ? BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID
    : BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID;
  if (assertion.subjectId !== expectedSubject) {
    return baseTimeEvaluation(assertion, {
      subjectId: null,
      verdict: "invented",
      displayStatus: "withheld",
      canonicalContent: null,
      evidencePath: null,
      projectionScope: null,
      missingEvidence: Object.freeze(["unknown_time_subject"]),
      rationale: "断言引用了封闭时间 grammar 中不存在的 subject；标识符与正文均不回显。"
    });
  }

  if (assertion.family === "combined_interpretation_status_quote") {
    const exact = assertion.content === canonicalCombinedStatus;
    return baseTimeEvaluation(assertion, {
      subjectId: BAZI_INTERPRETATION_AI_V2_COMBINED_STATUS_SUBJECT_ID,
      verdict: exact ? "advisory" : "blocked",
      displayStatus: exact ? "visible_with_caveat" : "withheld",
      canonicalContent: exact ? canonicalCombinedStatus : null,
      evidencePath: "effectiveStability.combinedInterpretationStatus",
      projectionScope: null,
      missingEvidence: Object.freeze(["combined_interpretation_not_assessed"]),
      rationale: exact
        ? "断言逐字匹配固定的 not_assessed/false 状态；只允许带 caveat 展示。"
        : "完整解读稳定性尚未评估；任何 stable、unstable 或其他替代结论均被阻断。"
    });
  }

  const exact = assertion.content === canonicalTimeSummary;
  const scope = timeProjectionScope(envelope);
  return baseTimeEvaluation(assertion, {
    subjectId: BAZI_INTERPRETATION_AI_V2_TIME_SUMMARY_SUBJECT_ID,
    verdict: exact ? "advisory" : "unsupported",
    displayStatus: exact ? "visible_with_caveat" : "withheld",
    canonicalContent: exact ? canonicalTimeSummary : null,
    evidencePath: "timePerturbation",
    projectionScope: scope,
    missingEvidence: exact
      ? scope === "calculated_subset_only"
        ? Object.freeze(["complete_offset_window_not_available"])
        : Object.freeze([])
      : Object.freeze(["time_summary_quote_mismatch"]),
    rationale: exact
      ? scope === "calculated_subset_only"
        ? "断言逐字匹配已验证摘要，但存在被阻断偏移；只覆盖已计算子集并带 caveat 展示。"
        : "断言逐字匹配固定时间摘要；只说明请求偏移下的四柱投影并带 caveat 展示。"
      : "time_summary_quote 未逐字匹配本地固定 renderer；当前校验器不推断其改写语义。"
  });
}

function countTimeVerdict(
  assertions: readonly BaziInterpretationAiV2TimeAssertionResult[],
  verdict: BaziInterpretationAiV2TimeVerdict
): number {
  return assertions.filter((assertion) => assertion.verdict === verdict).length;
}

function buildBoundary(): BaziInterpretationAiFaithfulnessV2Result["boundary"] {
  return Object.freeze({
    verifiedEnvelopeV2RebuiltBeforeEvaluation: true as const,
    legacyDraftNestedUnmodified: true as const,
    legacyResultNestedUnmodified: true as const,
    timeAssertionsClosedGrammarOnly: true as const,
    timeAssertionExactMatchesAdvisoryOnly: true as const,
    blockedWindowClaimsLimitedToCalculatedSubset: true as const,
    combinedInterpretationStatus: "not_assessed" as const,
    interpretationStabilityClaimed: false as const,
    crossPartitionRatioProduced: false as const,
    outerDraftContentCopied: false as const,
    fullTimePerturbationScenariosCopied: false as const,
    rawBirthInputCopied: false as const,
    containsDerivedSensitiveChartData: true as const,
    freeformTimeContentDisplayAuthorized: false as const,
    unknownSubjectIdentifiersCopied: false as const,
    modelMayRecalculateFacts: false as const,
    exactQuoteMatchEstablishesSemanticTruth: false as const,
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

function assertVerifiedEnvelopeClosure(
  envelope: BaziInterpretationEvidenceEnvelopeV2,
  draft: BaziInterpretationAiAssertionDraftV2
): void {
  if (
    draft.envelopeV2PayloadSha256 !== envelope.integrity.payloadSha256
    || draft.legacyDraft.envelopePayloadSha256 !== envelope.legacyEnvelope.integrity.payloadSha256
    || envelope.binding.legacyEnvelopePayloadSha256 !== envelope.legacyEnvelope.integrity.payloadSha256
    || envelope.binding.birthTimePerturbationReportPayloadSha256
      !== envelope.timePerturbation.reportPayloadSha256
    || envelope.binding.revisionSnapshotDigest !== envelope.timePerturbation.revisionSnapshotDigest
    || envelope.binding.revisionId !== envelope.legacyEnvelope.artifact.revisionId
    || envelope.binding.revisionNumber !== envelope.legacyEnvelope.artifact.revisionNumber
    || envelope.binding.revisionResultHash !== envelope.legacyEnvelope.artifact.artifactDigest
  ) {
    throw new Error("AI 忠实性 v2 的外层草稿、legacy Envelope、扰动报告与 Revision 摘要没有形成等式闭包");
  }
}

function assertLegacyResultClosure(
  envelope: BaziInterpretationEvidenceEnvelopeV2,
  legacyResult: BaziInterpretationAiFaithfulnessResult,
  legacyDraftSha256: string
): void {
  if (
    legacyResult.binding.revisionId !== envelope.binding.revisionId
    || legacyResult.binding.artifactDigest !== envelope.binding.revisionResultHash
    || legacyResult.binding.envelopePayloadSha256 !== envelope.binding.legacyEnvelopePayloadSha256
    || legacyResult.binding.draftSha256 !== legacyDraftSha256
  ) {
    throw new Error("AI 忠实性 v2 的 legacy 结果没有与 Envelope v2 和 legacy 草稿形成等式闭包");
  }
}

export async function evaluateBaziInterpretationAiFaithfulnessV2(
  rawInput: EvaluateBaziInterpretationAiFaithfulnessV2Input
): Promise<BaziInterpretationAiFaithfulnessV2Result> {
  const input = snapshotEvaluationInput(rawInput);
  const envelope = await validateBaziInterpretationEvidenceEnvelopeV2(
    input.envelope,
    input.envelopeInput
  );
  assertVerifiedEnvelopeClosure(envelope, input.draft);

  const legacyResult = await evaluateBaziInterpretationAiFaithfulness({
    envelope: envelope.legacyEnvelope,
    envelopeInput: input.envelopeInput.legacyEnvelopeInput,
    draft: input.draft.legacyDraft
  });
  const [outerDraftSha256, legacyDraftSha256] = await Promise.all([
    sha256Hex(input.draft),
    sha256Hex(input.draft.legacyDraft)
  ]);
  assertLegacyResultClosure(envelope, legacyResult, legacyDraftSha256);

  const canonicalTimeSummary = renderTimeSummaryQuote(envelope.timePerturbation);
  const canonicalCombinedStatus = renderCombinedInterpretationStatusQuote();
  const timeAssertions = deepFreeze(await Promise.all(input.draft.timeAssertions.map(
    async (assertion) => ({
      ...evaluateTimeAssertion(assertion, envelope, canonicalTimeSummary, canonicalCombinedStatus),
      inputContentSha256: await sha256Hex(assertion.content)
    })
  )));
  const displayable = timeAssertions.filter((assertion) => assertion.displayStatus !== "withheld").length;
  const advisory = countTimeVerdict(timeAssertions, "advisory");
  const invented = countTimeVerdict(timeAssertions, "invented");
  const unsupported = countTimeVerdict(timeAssertions, "unsupported");
  const blocked = countTimeVerdict(timeAssertions, "blocked");
  const payload: BaziInterpretationAiFaithfulnessV2Payload = {
    profile: BAZI_INTERPRETATION_AI_FAITHFULNESS_V2_PROFILE,
    binding: {
      revisionId: envelope.binding.revisionId,
      revisionNumber: envelope.binding.revisionNumber,
      revisionResultHash: envelope.binding.revisionResultHash,
      revisionSnapshotDigest: envelope.binding.revisionSnapshotDigest,
      envelopeV2PayloadSha256: envelope.integrity.payloadSha256,
      legacyEnvelopePayloadSha256: envelope.binding.legacyEnvelopePayloadSha256,
      birthTimePerturbationReportPayloadSha256:
        envelope.binding.birthTimePerturbationReportPayloadSha256,
      outerDraftSha256,
      legacyDraftSha256,
      legacyResultPayloadSha256: legacyResult.integrity.payloadSha256
    },
    legacyResult,
    timeAssertions,
    timeAssessment: {
      counts: {
        assertionsTotal: timeAssertions.length,
        displayable,
        advisory,
        invented,
        unsupported,
        blocked
      },
      projectionScope: timeProjectionScope(envelope),
      combinedInterpretationStatus: "not_assessed",
      interpretationStabilityClaimed: false,
      overallStatus: timeAssertions.length === 0
        ? "no_time_assertions"
        : displayable === timeAssertions.length && advisory === timeAssertions.length
          ? "caveated_exact_quotes_only"
          : "withheld"
    },
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

function parseRuntimeResultShape(raw: unknown): BaziInterpretationAiFaithfulnessV2Result {
  assertExactRecord(raw, RESULT_KEYS, "AI 忠实性 v2 结果");
  assertExactRecord(raw.profile, [
    "projectionVersion",
    "contentVersion",
    "system",
    "scope",
    "classificationPolicy",
    "reviewStatus",
    "expertTruthClaimed",
    "scientificValidityClaimed",
    "formalActivationAllowed"
  ], "AI 忠实性 v2 profile");
  assertExactRecord(raw.binding, [
    "revisionId",
    "revisionNumber",
    "revisionResultHash",
    "revisionSnapshotDigest",
    "envelopeV2PayloadSha256",
    "legacyEnvelopePayloadSha256",
    "birthTimePerturbationReportPayloadSha256",
    "outerDraftSha256",
    "legacyDraftSha256",
    "legacyResultPayloadSha256"
  ], "AI 忠实性 v2 绑定");
  assertDenseArray(raw.timeAssertions, "AI 忠实性 v2 时间断言结果");
  raw.timeAssertions.forEach((candidate, index) => {
    assertExactRecord(candidate, [
      "assertionRef",
      "order",
      "family",
      "subjectId",
      "inputContentSha256",
      "verdict",
      "machineCheckable",
      "displayStatus",
      "canonicalContent",
      "evidencePath",
      "projectionScope",
      "missingEvidence",
      "rationale",
      "interpretationStabilityClaimed",
      "expertTruthClaimed",
      "scientificValidityClaimed",
      "formalActivationAllowed",
      "result"
    ], `AI 忠实性 v2 第 ${index + 1} 条时间断言结果`);
    assertDenseArray(candidate.missingEvidence, `AI 忠实性 v2 第 ${index + 1} 条时间断言缺失证据`);
  });
  assertExactRecord(raw.timeAssessment, [
    "counts",
    "projectionScope",
    "combinedInterpretationStatus",
    "interpretationStabilityClaimed",
    "overallStatus"
  ], "AI 忠实性 v2 时间分区评估");
  assertExactRecord(raw.timeAssessment.counts, [
    "assertionsTotal",
    "displayable",
    "advisory",
    "invented",
    "unsupported",
    "blocked"
  ], "AI 忠实性 v2 时间分区计数");
  assertExactRecord(raw.integrity, [
    "hashAlgorithm",
    "payloadSha256",
    "authenticityClaimed"
  ], "AI 忠实性 v2 完整性");
  assertExactRecord(raw.boundary, [
    "verifiedEnvelopeV2RebuiltBeforeEvaluation",
    "legacyDraftNestedUnmodified",
    "legacyResultNestedUnmodified",
    "timeAssertionsClosedGrammarOnly",
    "timeAssertionExactMatchesAdvisoryOnly",
    "blockedWindowClaimsLimitedToCalculatedSubset",
    "combinedInterpretationStatus",
    "interpretationStabilityClaimed",
    "crossPartitionRatioProduced",
    "outerDraftContentCopied",
    "fullTimePerturbationScenariosCopied",
    "rawBirthInputCopied",
    "containsDerivedSensitiveChartData",
    "freeformTimeContentDisplayAuthorized",
    "unknownSubjectIdentifiersCopied",
    "modelMayRecalculateFacts",
    "exactQuoteMatchEstablishesSemanticTruth",
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
  ], "AI 忠实性 v2 安全边界");
  return raw as unknown as BaziInterpretationAiFaithfulnessV2Result;
}

function resultPayload(
  result: BaziInterpretationAiFaithfulnessV2Result
): BaziInterpretationAiFaithfulnessV2Payload {
  const { integrity: _integrity, ...payload } = result;
  return payload;
}

/** Strictly validates by rebuilding the Envelope v2, legacy result and time partition. */
export async function validateBaziInterpretationAiFaithfulnessV2Result(
  rawResult: unknown,
  rawExpectedInput: EvaluateBaziInterpretationAiFaithfulnessV2Input
): Promise<BaziInterpretationAiFaithfulnessV2Result> {
  let inputSnapshot: EvaluateBaziInterpretationAiFaithfulnessV2Input & {
    draft: BaziInterpretationAiAssertionDraftV2;
  };
  let rawResultSnapshot: unknown;
  try {
    assertEvaluationInputTopLevel(rawExpectedInput);
    assertExactOwnDataRecord(rawResult, RESULT_KEYS, "AI 忠实性 v2 候选结果");
    inspectBoundedDeclarativeJson(rawExpectedInput, "AI 忠实性 v2 评估输入");
    inspectBoundedDeclarativeJson(rawResult, "AI 忠实性 v2 候选结果");
    inputSnapshot = snapshotEvaluationInput(rawExpectedInput);
    rawResultSnapshot = canonicalClone(rawResult);
  } catch (cause) {
    throw new Error("AI 忠实性 v2 候选与重建输入无法形成规范快照", { cause });
  }
  const candidate = deepFreeze(parseRuntimeResultShape(rawResultSnapshot));
  if (!sameCanonical(candidate.profile, BAZI_INTERPRETATION_AI_FAITHFULNESS_V2_PROFILE)) {
    throw new Error("AI 忠实性 v2 候选 profile 不匹配");
  }
  if (!sameCanonical(candidate.boundary, buildBoundary())) {
    throw new Error("AI 忠实性 v2 候选安全边界未关闭");
  }
  if (
    candidate.integrity.hashAlgorithm !== "SHA-256"
    || candidate.integrity.authenticityClaimed !== false
    || !SHA256_PATTERN.test(candidate.integrity.payloadSha256)
  ) {
    throw new Error("AI 忠实性 v2 候选完整性字段无效");
  }
  if (await sha256Hex(resultPayload(candidate)) !== candidate.integrity.payloadSha256) {
    throw new Error("AI 忠实性 v2 候选 payload 摘要不匹配");
  }
  const expected = await evaluateBaziInterpretationAiFaithfulnessV2(inputSnapshot);
  if (!sameCanonical(candidate, expected)) {
    throw new Error("AI 忠实性 v2 候选与 Envelope v2、草稿和 legacy 结果的完整重建不一致");
  }
  return expected;
}
