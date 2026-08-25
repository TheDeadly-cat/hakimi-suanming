import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { rulePackBindingSchema } from "@hakimi/contracts";
import {
  BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE,
  type BaziCitationReviewContextSnapshot
} from "./index";

export const BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE = Object.freeze({
  formatVersion: "hakimi.bazi.citation_applicability_observation/0.1.0",
  contentVersion: "0.1.0",
  system: "bazi" as const,
  scope: "one_context_bound_self_declared_citation_applicability_observation_set" as const,
  contextBindingPolicy: "exact_current_context_and_display_binding_required" as const,
  observationPolicy: "one_neutral_observation_per_verified_citation_without_winner_or_activation" as const,
  reviewerIdentityPolicy: "self_declared_not_verified" as const,
  mutationPolicy: "local_file_template_and_read_only_preflight_only" as const,
  allowedObservations: Object.freeze([
    "unobserved",
    "applicable_in_bound_context",
    "partially_applicable_in_bound_context",
    "not_applicable_in_bound_context",
    "insufficient_bound_context"
  ] as const),
  recordDigestDomain: "hakimi.bazi.citation_applicability_observation.record/1" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  automaticPromotionAllowed: false as const
});

export const BAZI_CITATION_APPLICABILITY_OBSERVATION_FILENAME =
  "hakimi-bazi-citation-applicability-observation-v01.json" as const;

export type BaziCitationApplicabilityObservationStatus =
  (typeof BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE.allowedObservations)[number];

export interface BaziCitationApplicabilityObservationContextBinding {
  releaseIdentity: Readonly<{
    dbGeneration: "legacy-v13";
    targetSchema: 13;
    migrationId: null;
  }>;
  caseId: string;
  revisionId: string;
  evidenceSubjectId: string;
  fieldPath: string;
  contextPayloadSha256: string;
  displayContextBindingSha256: string;
  revisionSnapshotSha256: string;
  factProjectionSha256: string;
  ruleProjectionSha256: string;
  worksetSnapshotSha256: string;
  packetPayloadSha256: string;
  matchingSourceSetSha256: string;
  ruleProfile: Readonly<{
    profileId: string;
    profileVersion: string;
    profileStatus: "working_default" | "verified" | "experimental";
    ruleProfileDigest: string;
    revisionRulePackBinding: BaziCitationReviewContextSnapshot["ruleProjection"]["revisionRulePackBinding"];
  }>;
  citationIds: readonly string[];
}

export interface BaziCitationApplicabilityObservationReviewer {
  reviewerId: string;
  displayName: string;
  affiliation: string;
  expertiseStatement: string;
  identityEvidenceReference: string;
  identityVerified: false;
}

export interface BaziCitationApplicabilityObservationSession {
  observedAt: string;
  methodology: string;
  traditionScope: string;
  generalNotes: string;
}

export interface BaziCitationApplicabilityObservationItem {
  order: number;
  citationId: string;
  observation: BaziCitationApplicabilityObservationStatus;
  reason: string;
  applicabilityConditions: string;
  counterexamples: string;
  relatedCitationIds: readonly string[];
  additionalSourceUrls: readonly string[];
}

export interface BaziCitationApplicabilityObservationCounts {
  total: number;
  unobserved: number;
  applicableInBoundContext: number;
  partiallyApplicableInBoundContext: number;
  notApplicableInBoundContext: number;
  insufficientBoundContext: number;
}

export interface BaziCitationApplicabilityObservationBoundary {
  contextDigestBindingRequired: true;
  displayContextDigestBindingRequired: true;
  allVerifiedCitationIdsAddressed: true;
  reviewerIdentityBasis: "self_declared_not_verified";
  reviewerIdentityVerified: false;
  humanReviewAuthenticityVerified: false;
  digitalSignaturePresent: false;
  digitalSignatureVerified: false;
  digestIsDigitalSignature: false;
  sourceTextCopied: false;
  rawBirthInputCopied: false;
  caseAliasTagsNotesCopied: false;
  fieldValueCopied: false;
  containsDerivedSensitiveChartBinding: true;
  freeformReviewerTextAcceptedAsUntrustedPlainText: true;
  sourceTextInstructionAuthority: false;
  promptInjectionScreeningPerformed: false;
  chartApplicabilityAssessed: false;
  citationSemanticApplicabilityAssessed: false;
  semanticConflictResolutionPerformed: false;
  winnerSelectionPerformed: false;
  consensusClaimed: false;
  networkTransmissionPerformed: false;
  networkTransmissionAuthorized: false;
  storageMutationPerformed: false;
  chartMutationPerformed: false;
  caseOrRevisionMutationPerformed: false;
  mutationEpochRevalidationPerformed: false;
  mutationEpochBypassed: false;
  publicExportAuthorized: false;
  publicReleaseAuthorized: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  automaticPromotionAllowed: false;
  authenticityClaimed: false;
  result: null;
}

export interface BaziCitationApplicabilityObservationEnvelope {
  profile: typeof BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE;
  contextBinding: BaziCitationApplicabilityObservationContextBinding;
  reviewer: BaziCitationApplicabilityObservationReviewer;
  session: BaziCitationApplicabilityObservationSession;
  observations: readonly BaziCitationApplicabilityObservationItem[];
  declaredCounts: BaziCitationApplicabilityObservationCounts;
  boundary: BaziCitationApplicabilityObservationBoundary;
}

export interface BaziCitationApplicabilityObservationFileInspection {
  envelope: BaziCitationApplicabilityObservationEnvelope;
  counts: BaziCitationApplicabilityObservationCounts;
  observedCount: number;
  allCitationsObserved: boolean;
  reviewerAttributionComplete: boolean;
  currentContextChecked: false;
  contextBindingStructureValidated: true;
  contextDigestReferentsRecomputed: false;
  citationVerificationStatusRevalidated: false;
  recordDigestRecomputed: true;
  identityVerified: false;
  humanReviewAuthenticityVerified: false;
  chartApplicabilityAssessed: false;
  citationSemanticApplicabilityAssessed: false;
  eligibleForFormalActivation: false;
  automaticPromotionAllowed: false;
  storageMutationPerformed: false;
  mutationEpochRevalidationPerformed: false;
  mutationEpochBypassed: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    recordSha256: string;
    digestIsDigitalSignature: false;
    authenticityClaimed: false;
  }>;
}

export interface BaziCitationApplicabilityObservationPreflight {
  envelope: BaziCitationApplicabilityObservationEnvelope;
  counts: BaziCitationApplicabilityObservationCounts;
  observedCount: number;
  allCitationsObserved: boolean;
  reviewerAttributionComplete: boolean;
  suppliedCurrentContextDigestMatched: true;
  identityVerified: false;
  humanReviewAuthenticityVerified: false;
  chartApplicabilityAssessed: false;
  citationSemanticApplicabilityAssessed: false;
  eligibleForFormalActivation: false;
  automaticPromotionAllowed: false;
  storageMutationPerformed: false;
  mutationEpochBypassed: false;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    recordSha256: string;
    digestIsDigitalSignature: false;
    authenticityClaimed: false;
  }>;
}

export type BaziCitationApplicabilityObservationErrorCode =
  | "INVALID_CONTEXT"
  | "INVALID_OBSERVATION_FILE"
  | "CONTEXT_BINDING_STALE"
  | "OBSERVATION_COVERAGE_MISMATCH"
  | "REVIEWER_ATTRIBUTION_INCOMPLETE";

export class BaziCitationApplicabilityObservationError extends Error {
  constructor(
    readonly code: BaziCitationApplicabilityObservationErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "BaziCitationApplicabilityObservationError";
  }
}

const MAX_FILE_BYTES = 512 * 1024;
const MAX_VALUE_NODES = 30_000;
const MAX_TEXT_CHARACTERS = 1_500_000;
const MAX_OBJECT_KEYS = 50_000;
const MAX_DEPTH = 40;
const MAX_CITATIONS = 64;
const MAX_RELATED_CITATIONS = 16;
const MAX_ADDITIONAL_SOURCES = 8;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SUBJECT_ID = /^[a-z][A-Za-z0-9.-]{2,159}$/u;
const FIELD_PATH = /^pillars\.(year|month|day|hour)\.(ganZhi|hiddenStems|stemTenGod|branchTenGods|wuXing|nayin|twelveGrowth|xun|voidBranches)$/u;
const RULE_PROFILE_ID = /^[a-z0-9-]+$/u;
const SEMANTIC_VERSION = /^\d+\.\d+\.\d+$/u;
const UNSAFE_TEXT = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const OBSERVATION_SET = new Set<string>(
  BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE.allowedObservations
);
const EXPECTED_REVIEW_CONTEXT_BOUNDARY = Object.freeze({
  exactRevisionReplayMatched: true,
  registeredFieldProjectionBound: true,
  revisionFrozenRuleProjectionBound: true,
  worksetFourLayerDigestsRecomputed: true,
  rawBirthInputCopied: false,
  caseAliasTagsNotesCopied: false,
  sourceTextCopiedIntoContextSnapshot: false,
  containsDerivedSensitiveChartData: true,
  crossRepositoryAtomicSnapshotVerified: false,
  caseRevisionAndKnowledgeAtomicCaptureVerified: false,
  suppliedWorksetStorageOriginAttested: false,
  suppliedCaseSnapshotFreshnessAttested: false,
  runtimeReleaseIdentityAttested: false,
  worksetFreshnessRevalidatedByBuilder: false,
  reviewMayBeginWithoutFreshnessRevalidation: false,
  mutationEpochRevalidationPerformed: false,
  liveActiveRulePackReadPerformed: false,
  interpretationEnvelopeUsed: false,
  chartApplicabilityAssessed: false,
  citationSemanticApplicabilityAssessed: false,
  citationSetConflictReviewPerformed: false,
  semanticConflictResolutionPerformed: false,
  humanReviewPerformed: false,
  reviewerIdentityVerified: false,
  humanReviewAuthenticityVerified: false,
  sourceAuthenticityClaimed: false,
  sourceTextInstructionAuthority: false,
  storageReadPerformed: false,
  externalProviderUseAuthorized: false,
  networkTransmissionPerformed: false,
  networkTransmissionAuthorized: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  publicExportAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  authenticityClaimed: false,
  result: null
} satisfies BaziCitationReviewContextSnapshot["boundary"]);

type PlainRecord = Record<string, unknown>;

interface SnapshotBudget {
  valueNodes: number;
  textCharacters: number;
  objectKeys: number;
}

function fail(
  code: BaziCitationApplicabilityObservationErrorCode,
  message: string,
  options?: ErrorOptions
): never {
  throw new BaziCitationApplicabilityObservationError(code, message, options);
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) deepFreeze(descriptor.value);
  }
  return value;
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function snapshotDeclarative(
  value: unknown,
  subject: string,
  depth = 0,
  budget: SnapshotBudget = { valueNodes: 0, textCharacters: 0, objectKeys: 0 },
  ancestors = new WeakSet<object>()
): unknown {
  budget.valueNodes += 1;
  if (depth > MAX_DEPTH || budget.valueNodes > MAX_VALUE_NODES) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 超出结构预算。`);
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INVALID_OBSERVATION_FILE", `${subject} 包含非有限数值。`);
    return value;
  }
  if (typeof value === "string") {
    budget.textCharacters += value.length;
    if (budget.textCharacters > MAX_TEXT_CHARACTERS || UNSAFE_TEXT.test(value)) {
      fail("INVALID_OBSERVATION_FILE", `${subject} 包含超限或不可见控制文本。`);
    }
    return value;
  }
  if (typeof value !== "object") {
    fail("INVALID_OBSERVATION_FILE", `${subject} 只允许 JSON 数据值。`);
  }
  if (ancestors.has(value)) fail("INVALID_OBSERVATION_FILE", `${subject} 包含循环引用。`);
  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if ((array && prototype !== Array.prototype) || (!array && prototype !== Object.prototype && prototype !== null)) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 必须是普通 JSON 对象或数组。`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 不允许 Symbol 字段。`);
  }
  const stringKeys = ownKeys as string[];
  budget.objectKeys += stringKeys.length;
  if (budget.objectKeys > MAX_OBJECT_KEYS) fail("INVALID_OBSERVATION_FILE", `${subject} 字段过多。`);
  for (const key of stringKeys) {
    budget.textCharacters += key.length;
    if (FORBIDDEN_KEYS.has(key) || key.length > 256 || budget.textCharacters > MAX_TEXT_CHARACTERS) {
      fail("INVALID_OBSERVATION_FILE", `${subject} 包含危险或超限字段名。`);
    }
  }
  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (array) {
      if (value.length > 512 || stringKeys.length !== value.length + 1 || !stringKeys.includes("length")) {
        fail("INVALID_OBSERVATION_FILE", `${subject} 数组超限、稀疏或包含附加字段。`);
      }
      const result: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          fail("INVALID_OBSERVATION_FILE", `${subject}[${index}] 必须是自有可枚举数据项。`);
        }
        result.push(snapshotDeclarative(
          descriptor.value,
          `${subject}[${index}]`,
          depth + 1,
          budget,
          ancestors
        ));
      }
      return result;
    }
    if (stringKeys.length > 128) fail("INVALID_OBSERVATION_FILE", `${subject} 单个对象字段过多。`);
    const result = Object.create(null) as PlainRecord;
    for (const key of stringKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        fail("INVALID_OBSERVATION_FILE", `${subject}.${key} 必须是自有可枚举数据字段。`);
      }
      result[key] = snapshotDeclarative(
        descriptor.value,
        `${subject}.${key}`,
        depth + 1,
        budget,
        ancestors
      );
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

function record(value: unknown, subject: string): PlainRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 必须是对象。`);
  }
  return value as PlainRecord;
}

function exactKeys(value: PlainRecord, expected: readonly string[], subject: string): void {
  const actual = Object.keys(value).sort();
  const normalizedExpected = [...expected].sort();
  if (
    actual.length !== normalizedExpected.length
    || actual.some((key, index) => key !== normalizedExpected[index])
  ) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 字段集合不匹配。`);
  }
}

function stringValue(value: unknown, subject: string, maximum: number, allowEmpty = true): string {
  if (
    typeof value !== "string"
    || value.length > maximum
    || UNSAFE_TEXT.test(value)
    || (!allowEmpty && !value.trim())
  ) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 不是允许的有界纯文本。`);
  }
  return value;
}

function falseValue(value: unknown, subject: string): false {
  if (value !== false) fail("INVALID_OBSERVATION_FILE", `${subject} 必须保持 false。`);
  return false;
}

function nullValue(value: unknown, subject: string): null {
  if (value !== null) fail("INVALID_OBSERVATION_FILE", `${subject} 必须保持 null。`);
  return null;
}

function positiveInteger(value: unknown, subject: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_CITATIONS) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 不是允许的整数。`);
  }
  return value as number;
}

function lowercaseSha256Value(value: unknown, subject: string): string {
  const digest = stringValue(value, subject, 64, false);
  if (!LOWERCASE_SHA256.test(digest)) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 不是小写 SHA-256 摘要。`);
  }
  return digest;
}

function validIsoInstant(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
    && Number.isFinite(Date.parse(value));
}

function parseUrlList(value: unknown, subject: string): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_ADDITIONAL_SOURCES) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 必须是至多 ${MAX_ADDITIONAL_SOURCES} 项的数组。`);
  }
  const urls = value.map((item, index) => stringValue(item, `${subject}[${index}]`, 2_000, false));
  if (new Set(urls).size !== urls.length) fail("INVALID_OBSERVATION_FILE", `${subject} 不得重复。`);
  for (const candidate of urls) {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch (cause) {
      fail("INVALID_OBSERVATION_FILE", `${subject} 包含无效 URL。`, { cause });
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      fail("INVALID_OBSERVATION_FILE", `${subject} 只允许无凭据 HTTPS URL。`);
    }
  }
  return Object.freeze(urls);
}

function parseContextBinding(
  value: unknown
): BaziCitationApplicabilityObservationContextBinding {
  const binding = record(value, "观察文件 contextBinding");
  exactKeys(binding, [
    "releaseIdentity",
    "caseId",
    "revisionId",
    "evidenceSubjectId",
    "fieldPath",
    "contextPayloadSha256",
    "displayContextBindingSha256",
    "revisionSnapshotSha256",
    "factProjectionSha256",
    "ruleProjectionSha256",
    "worksetSnapshotSha256",
    "packetPayloadSha256",
    "matchingSourceSetSha256",
    "ruleProfile",
    "citationIds"
  ], "观察文件 contextBinding");

  const releaseIdentity = record(
    binding.releaseIdentity,
    "观察文件 contextBinding.releaseIdentity"
  );
  exactKeys(
    releaseIdentity,
    ["dbGeneration", "targetSchema", "migrationId"],
    "观察文件 contextBinding.releaseIdentity"
  );
  if (
    releaseIdentity.dbGeneration !== "legacy-v13"
    || releaseIdentity.targetSchema !== 13
    || releaseIdentity.migrationId !== null
  ) {
    fail(
      "INVALID_OBSERVATION_FILE",
      "观察文件只能绑定 legacy-v13 / targetSchema 13 / migrationId null。"
    );
  }

  const caseId = stringValue(binding.caseId, "contextBinding.caseId", 36, false);
  const revisionId = stringValue(binding.revisionId, "contextBinding.revisionId", 36, false);
  const evidenceSubjectId = stringValue(
    binding.evidenceSubjectId,
    "contextBinding.evidenceSubjectId",
    160,
    false
  );
  const fieldPath = stringValue(binding.fieldPath, "contextBinding.fieldPath", 160, false);
  if (
    !UUID.test(caseId)
    || !UUID.test(revisionId)
    || !SUBJECT_ID.test(evidenceSubjectId)
    || !FIELD_PATH.test(fieldPath)
  ) {
    fail("INVALID_OBSERVATION_FILE", "观察文件 contextBinding locator 格式无效。");
  }

  const ruleProfile = record(binding.ruleProfile, "观察文件 contextBinding.ruleProfile");
  exactKeys(ruleProfile, [
    "profileId",
    "profileVersion",
    "profileStatus",
    "ruleProfileDigest",
    "revisionRulePackBinding"
  ], "观察文件 contextBinding.ruleProfile");
  const profileId = stringValue(
    ruleProfile.profileId,
    "contextBinding.ruleProfile.profileId",
    MAX_FILE_BYTES,
    false
  );
  const profileVersion = stringValue(
    ruleProfile.profileVersion,
    "contextBinding.ruleProfile.profileVersion",
    MAX_FILE_BYTES,
    false
  );
  const profileStatus = stringValue(
    ruleProfile.profileStatus,
    "contextBinding.ruleProfile.profileStatus",
    32,
    false
  );
  if (
    !RULE_PROFILE_ID.test(profileId)
    || !SEMANTIC_VERSION.test(profileVersion)
    || !["working_default", "verified", "experimental"].includes(profileStatus)
  ) {
    fail("INVALID_OBSERVATION_FILE", "观察文件 contextBinding.ruleProfile 格式无效。");
  }
  const ruleProfileDigest = lowercaseSha256Value(
    ruleProfile.ruleProfileDigest,
    "contextBinding.ruleProfile.ruleProfileDigest"
  );
  const parsedRulePackBinding = rulePackBindingSchema.nullable().safeParse(
    ruleProfile.revisionRulePackBinding
  );
  if (!parsedRulePackBinding.success) {
    fail(
      "INVALID_OBSERVATION_FILE",
      "观察文件 contextBinding.ruleProfile.revisionRulePackBinding 不符合严格合同。",
      { cause: parsedRulePackBinding.error }
    );
  }
  if (
    parsedRulePackBinding.data !== null
    && (
      parsedRulePackBinding.data.profileId !== profileId
      || parsedRulePackBinding.data.profileVersion !== profileVersion
      || parsedRulePackBinding.data.profileDigest !== ruleProfileDigest
    )
  ) {
    fail(
      "INVALID_OBSERVATION_FILE",
      "观察文件嵌套 rule-pack 绑定与外层 rule profile 不一致。"
    );
  }

  if (
    !Array.isArray(binding.citationIds)
    || binding.citationIds.length < 1
    || binding.citationIds.length > MAX_CITATIONS
  ) {
    fail("INVALID_OBSERVATION_FILE", "观察文件 contextBinding.citationIds 必须是有界非空数组。");
  }
  const citationIds = binding.citationIds.map((item, index) => {
    const citationId = stringValue(item, `contextBinding.citationIds[${index}]`, 36, false);
    if (!UUID.test(citationId)) {
      fail("INVALID_OBSERVATION_FILE", `contextBinding.citationIds[${index}] 格式无效。`);
    }
    return citationId;
  });
  if (new Set(citationIds).size !== citationIds.length) {
    fail("INVALID_OBSERVATION_FILE", "观察文件 contextBinding.citationIds 不得重复。");
  }

  return deepFreeze({
    releaseIdentity: {
      dbGeneration: "legacy-v13" as const,
      targetSchema: 13 as const,
      migrationId: null
    },
    caseId,
    revisionId,
    evidenceSubjectId,
    fieldPath,
    contextPayloadSha256: lowercaseSha256Value(
      binding.contextPayloadSha256,
      "contextBinding.contextPayloadSha256"
    ),
    displayContextBindingSha256: lowercaseSha256Value(
      binding.displayContextBindingSha256,
      "contextBinding.displayContextBindingSha256"
    ),
    revisionSnapshotSha256: lowercaseSha256Value(
      binding.revisionSnapshotSha256,
      "contextBinding.revisionSnapshotSha256"
    ),
    factProjectionSha256: lowercaseSha256Value(
      binding.factProjectionSha256,
      "contextBinding.factProjectionSha256"
    ),
    ruleProjectionSha256: lowercaseSha256Value(
      binding.ruleProjectionSha256,
      "contextBinding.ruleProjectionSha256"
    ),
    worksetSnapshotSha256: lowercaseSha256Value(
      binding.worksetSnapshotSha256,
      "contextBinding.worksetSnapshotSha256"
    ),
    packetPayloadSha256: lowercaseSha256Value(
      binding.packetPayloadSha256,
      "contextBinding.packetPayloadSha256"
    ),
    matchingSourceSetSha256: lowercaseSha256Value(
      binding.matchingSourceSetSha256,
      "contextBinding.matchingSourceSetSha256"
    ),
    ruleProfile: {
      profileId,
      profileVersion,
      profileStatus: profileStatus as "working_default" | "verified" | "experimental",
      ruleProfileDigest,
      revisionRulePackBinding: deepFreeze(parsedRulePackBinding.data)
    },
    citationIds: Object.freeze(citationIds)
  });
}

async function validatedContext(
  rawContext: unknown
): Promise<BaziCitationReviewContextSnapshot> {
  let snapshot: PlainRecord;
  try {
    snapshot = record(snapshotDeclarative(rawContext, "当前复核上下文"), "当前复核上下文");
  } catch (cause) {
    if (cause instanceof BaziCitationApplicabilityObservationError) {
      throw new BaziCitationApplicabilityObservationError(
        "INVALID_CONTEXT",
        "当前 Revision 字段复核上下文不是受支持的声明式快照。",
        { cause }
      );
    }
    throw cause;
  }
  exactKeys(snapshot, [
    "profile",
    "releaseBinding",
    "caseBinding",
    "revisionBinding",
    "subjectBinding",
    "factProjection",
    "ruleProjection",
    "worksetBinding",
    "displayContextBinding",
    "boundary",
    "integrity"
  ], "当前复核上下文");
  const context = snapshot as unknown as BaziCitationReviewContextSnapshot;
  if (!sameCanonical(context.profile, BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE)) {
    fail("INVALID_CONTEXT", "当前 Revision 字段复核上下文 profile 不匹配。 ");
  }
  if (
    context.releaseBinding.dbGeneration !== "legacy-v13"
    || context.releaseBinding.targetSchema !== 13
    || context.releaseBinding.migrationId !== null
    || context.releaseBinding.callerProvidedExpectedValuesMatched !== true
    || context.releaseBinding.engineeringEvidenceOnly !== true
    || context.caseBinding.deletedInSuppliedCaseSnapshot !== false
    || !sameCanonical(context.boundary, EXPECTED_REVIEW_CONTEXT_BOUNDARY)
    || context.integrity.hashAlgorithm !== "SHA-256"
    || context.integrity.authenticityClaimed !== false
  ) {
    fail("INVALID_CONTEXT", "当前 Revision 字段复核上下文的发布或只读边界不匹配。 ");
  }
  if (
    !UUID.test(context.caseBinding.caseId)
    || !UUID.test(context.revisionBinding.revisionId)
    || !SUBJECT_ID.test(context.subjectBinding.evidenceSubjectId)
    || !FIELD_PATH.test(context.subjectBinding.fieldPath)
  ) {
    fail("INVALID_CONTEXT", "当前复核上下文 locator 格式无效。 ");
  }
  const digests = [
    context.integrity.payloadSha256,
    context.displayContextBinding.payloadSha256,
    context.revisionBinding.revisionSnapshotDigest,
    context.factProjection.projectionSha256,
    context.ruleProjection.projectionSha256,
    context.ruleProjection.ruleProfileDigest,
    context.worksetBinding.worksetSnapshotSha256,
    context.worksetBinding.packetPayloadSha256,
    context.worksetBinding.matchingSourceSetSha256
  ];
  if (digests.some((digest) => !LOWERCASE_SHA256.test(digest))) {
    fail("INVALID_CONTEXT", "当前复核上下文包含无效摘要。 ");
  }
  const citationIds = context.worksetBinding.citationIdsWithStoredVerifiedStatus;
  if (
    !Array.isArray(citationIds)
    || citationIds.length < 1
    || citationIds.length > MAX_CITATIONS
    || citationIds.some((citationId) => typeof citationId !== "string" || !UUID.test(citationId))
    || new Set(citationIds).size !== citationIds.length
  ) {
    fail("INVALID_CONTEXT", "当前复核上下文的核验引用集合无效。 ");
  }
  const { integrity: _integrity, ...payload } = context;
  const expectedPayloadSha256 = await sha256Hex({
    domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.digestDomain,
    payload
  });
  const expectedDisplayContextSha256 = await sha256Hex({
    domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.displayContextBindingDigestDomain,
    payload: {
      releaseBinding: context.releaseBinding,
      caseBinding: context.caseBinding,
      revisionBinding: context.revisionBinding,
      subjectBinding: context.subjectBinding,
      factProjection: context.factProjection,
      ruleProjection: context.ruleProjection,
      worksetBinding: context.worksetBinding
    }
  });
  const expectedFactProjectionSha256 = await sha256Hex({
    domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.factProjectionDigestDomain,
    payload: context.factProjection.items
  });
  const expectedRuleProjectionSha256 = await sha256Hex({
    domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.ruleProjectionDigestDomain,
    payload: {
      profileId: context.ruleProjection.profileId,
      profileVersion: context.ruleProjection.profileVersion,
      profileStatus: context.ruleProjection.profileStatus,
      ruleProfileDigest: context.ruleProjection.ruleProfileDigest,
      revisionRulePackBinding: context.ruleProjection.revisionRulePackBinding,
      liveActiveRulePackReadPerformed: context.ruleProjection.liveActiveRulePackReadPerformed,
      items: context.ruleProjection.items
    }
  });
  if (
    expectedPayloadSha256 !== context.integrity.payloadSha256
    || expectedDisplayContextSha256 !== context.displayContextBinding.payloadSha256
    || expectedFactProjectionSha256 !== context.factProjection.projectionSha256
    || expectedRuleProjectionSha256 !== context.ruleProjection.projectionSha256
  ) {
    fail("INVALID_CONTEXT", "当前复核上下文摘要无法从快照规范复现。 ");
  }
  return deepFreeze(context);
}

/** @internal Shared descriptor-safe capture for one two-file comparison operation. */
export async function captureBaziCitationApplicabilityObservationCurrentContext(
  rawContext: unknown
): Promise<BaziCitationReviewContextSnapshot> {
  return validatedContext(rawContext);
}

async function contextBindingFrom(
  rawContext: unknown
): Promise<BaziCitationApplicabilityObservationContextBinding> {
  const context = await validatedContext(rawContext);
  return deepFreeze({
    releaseIdentity: {
      dbGeneration: "legacy-v13" as const,
      targetSchema: 13 as const,
      migrationId: null
    },
    caseId: context.caseBinding.caseId,
    revisionId: context.revisionBinding.revisionId,
    evidenceSubjectId: context.subjectBinding.evidenceSubjectId,
    fieldPath: context.subjectBinding.fieldPath,
    contextPayloadSha256: context.integrity.payloadSha256,
    displayContextBindingSha256: context.displayContextBinding.payloadSha256,
    revisionSnapshotSha256: context.revisionBinding.revisionSnapshotDigest,
    factProjectionSha256: context.factProjection.projectionSha256,
    ruleProjectionSha256: context.ruleProjection.projectionSha256,
    worksetSnapshotSha256: context.worksetBinding.worksetSnapshotSha256,
    packetPayloadSha256: context.worksetBinding.packetPayloadSha256,
    matchingSourceSetSha256: context.worksetBinding.matchingSourceSetSha256,
    ruleProfile: {
      profileId: context.ruleProjection.profileId,
      profileVersion: context.ruleProjection.profileVersion,
      profileStatus: context.ruleProjection.profileStatus,
      ruleProfileDigest: context.ruleProjection.ruleProfileDigest,
      revisionRulePackBinding: context.ruleProjection.revisionRulePackBinding
    },
    citationIds: [...context.worksetBinding.citationIdsWithStoredVerifiedStatus]
  });
}

function emptyReviewer(): BaziCitationApplicabilityObservationReviewer {
  return deepFreeze({
    reviewerId: "",
    displayName: "",
    affiliation: "",
    expertiseStatement: "",
    identityEvidenceReference: "",
    identityVerified: false
  });
}

function emptySession(): BaziCitationApplicabilityObservationSession {
  return deepFreeze({
    observedAt: "",
    methodology: "",
    traditionScope: "",
    generalNotes: ""
  });
}

function emptyObservation(citationId: string, index: number): BaziCitationApplicabilityObservationItem {
  return deepFreeze({
    order: index + 1,
    citationId,
    observation: "unobserved" as const,
    reason: "",
    applicabilityConditions: "",
    counterexamples: "",
    relatedCitationIds: [],
    additionalSourceUrls: []
  });
}

function makeCounts(
  observations: readonly BaziCitationApplicabilityObservationItem[]
): BaziCitationApplicabilityObservationCounts {
  const counts: BaziCitationApplicabilityObservationCounts = {
    total: observations.length,
    unobserved: 0,
    applicableInBoundContext: 0,
    partiallyApplicableInBoundContext: 0,
    notApplicableInBoundContext: 0,
    insufficientBoundContext: 0
  };
  for (const item of observations) {
    if (item.observation === "unobserved") counts.unobserved += 1;
    else if (item.observation === "applicable_in_bound_context") counts.applicableInBoundContext += 1;
    else if (item.observation === "partially_applicable_in_bound_context") counts.partiallyApplicableInBoundContext += 1;
    else if (item.observation === "not_applicable_in_bound_context") counts.notApplicableInBoundContext += 1;
    else counts.insufficientBoundContext += 1;
  }
  return deepFreeze(counts);
}

function fixedBoundary(): BaziCitationApplicabilityObservationBoundary {
  return deepFreeze({
    contextDigestBindingRequired: true,
    displayContextDigestBindingRequired: true,
    allVerifiedCitationIdsAddressed: true,
    reviewerIdentityBasis: "self_declared_not_verified",
    reviewerIdentityVerified: false,
    humanReviewAuthenticityVerified: false,
    digitalSignaturePresent: false,
    digitalSignatureVerified: false,
    digestIsDigitalSignature: false,
    sourceTextCopied: false,
    rawBirthInputCopied: false,
    caseAliasTagsNotesCopied: false,
    fieldValueCopied: false,
    containsDerivedSensitiveChartBinding: true,
    freeformReviewerTextAcceptedAsUntrustedPlainText: true,
    sourceTextInstructionAuthority: false,
    promptInjectionScreeningPerformed: false,
    chartApplicabilityAssessed: false,
    citationSemanticApplicabilityAssessed: false,
    semanticConflictResolutionPerformed: false,
    winnerSelectionPerformed: false,
    consensusClaimed: false,
    networkTransmissionPerformed: false,
    networkTransmissionAuthorized: false,
    storageMutationPerformed: false,
    chartMutationPerformed: false,
    caseOrRevisionMutationPerformed: false,
    mutationEpochRevalidationPerformed: false,
    mutationEpochBypassed: false,
    publicExportAuthorized: false,
    publicReleaseAuthorized: false,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    automaticPromotionAllowed: false,
    authenticityClaimed: false,
    result: null
  });
}

export async function createBaziCitationApplicabilityObservationTemplate(
  rawCurrentContext: unknown
): Promise<BaziCitationApplicabilityObservationEnvelope> {
  const contextBinding = await contextBindingFrom(rawCurrentContext);
  const observations = deepFreeze(
    contextBinding.citationIds.map((citationId, index) => emptyObservation(citationId, index))
  );
  return deepFreeze({
    profile: BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
    contextBinding,
    reviewer: emptyReviewer(),
    session: emptySession(),
    observations,
    declaredCounts: makeCounts(observations),
    boundary: fixedBoundary()
  });
}

export function serializeBaziCitationApplicabilityObservationTemplate(
  envelope: BaziCitationApplicabilityObservationEnvelope
): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

function parseReviewer(value: unknown): BaziCitationApplicabilityObservationReviewer {
  const reviewer = record(value, "观察文件 reviewer");
  exactKeys(reviewer, [
    "reviewerId",
    "displayName",
    "affiliation",
    "expertiseStatement",
    "identityEvidenceReference",
    "identityVerified"
  ], "观察文件 reviewer");
  return deepFreeze({
    reviewerId: stringValue(reviewer.reviewerId, "reviewerId", 200),
    displayName: stringValue(reviewer.displayName, "displayName", 200),
    affiliation: stringValue(reviewer.affiliation, "affiliation", 500),
    expertiseStatement: stringValue(reviewer.expertiseStatement, "expertiseStatement", 1_000),
    identityEvidenceReference: stringValue(
      reviewer.identityEvidenceReference,
      "identityEvidenceReference",
      1_000
    ),
    identityVerified: falseValue(reviewer.identityVerified, "reviewer.identityVerified")
  });
}

function parseSession(value: unknown): BaziCitationApplicabilityObservationSession {
  const session = record(value, "观察文件 session");
  exactKeys(session, ["observedAt", "methodology", "traditionScope", "generalNotes"], "观察文件 session");
  return deepFreeze({
    observedAt: stringValue(session.observedAt, "session.observedAt", 100),
    methodology: stringValue(session.methodology, "session.methodology", 2_000),
    traditionScope: stringValue(session.traditionScope, "session.traditionScope", 1_000),
    generalNotes: stringValue(session.generalNotes, "session.generalNotes", 4_000)
  });
}

function parseRelatedCitationIds(
  value: unknown,
  subject: string,
  allowedCitationIds: ReadonlySet<string>,
  ownCitationId: string
): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_RELATED_CITATIONS) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 必须是有界数组。`);
  }
  const ids = value.map((item, index) => stringValue(item, `${subject}[${index}]`, 36, false));
  if (
    new Set(ids).size !== ids.length
    || ids.some((citationId) => !allowedCitationIds.has(citationId) || citationId === ownCitationId)
  ) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 只能引用当前集合中的其他 citationId 且不得重复。`);
  }
  return Object.freeze(ids);
}

function parseObservation(
  value: unknown,
  index: number,
  expectedCitationIds: readonly string[],
  allowedCitationIds: ReadonlySet<string>
): BaziCitationApplicabilityObservationItem {
  const subject = `观察文件 observations[${index}]`;
  const item = record(value, subject);
  exactKeys(item, [
    "order",
    "citationId",
    "observation",
    "reason",
    "applicabilityConditions",
    "counterexamples",
    "relatedCitationIds",
    "additionalSourceUrls"
  ], subject);
  const order = positiveInteger(item.order, `${subject}.order`);
  const citationId = stringValue(item.citationId, `${subject}.citationId`, 36, false);
  const observation = stringValue(item.observation, `${subject}.observation`, 80, false);
  if (
    order !== index + 1
    || citationId !== expectedCitationIds[index]
    || !OBSERVATION_SET.has(observation)
  ) {
    fail("OBSERVATION_COVERAGE_MISMATCH", `${subject} 没有按当前核验引用集合的固定顺序覆盖。`);
  }
  const reason = stringValue(item.reason, `${subject}.reason`, 4_000);
  const applicabilityConditions = stringValue(
    item.applicabilityConditions,
    `${subject}.applicabilityConditions`,
    4_000
  );
  const counterexamples = stringValue(item.counterexamples, `${subject}.counterexamples`, 4_000);
  const relatedCitationIds = parseRelatedCitationIds(
    item.relatedCitationIds,
    `${subject}.relatedCitationIds`,
    allowedCitationIds,
    citationId
  );
  const additionalSourceUrls = parseUrlList(
    item.additionalSourceUrls,
    `${subject}.additionalSourceUrls`
  );
  if (observation === "unobserved") {
    if (
      reason.trim()
      || applicabilityConditions.trim()
      || counterexamples.trim()
      || relatedCitationIds.length
      || additionalSourceUrls.length
    ) {
      fail("INVALID_OBSERVATION_FILE", `${subject} 未观察时不得填写观察内容。`);
    }
  } else if (!reason.trim()) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 已记录观察时必须填写理由。`);
  } else if (
    observation !== "insufficient_bound_context"
    && (!applicabilityConditions.trim() || !counterexamples.trim())
  ) {
    fail("INVALID_OBSERVATION_FILE", `${subject} 必须同时填写成立条件与反例。`);
  }
  return deepFreeze({
    order,
    citationId,
    observation: observation as BaziCitationApplicabilityObservationStatus,
    reason,
    applicabilityConditions,
    counterexamples,
    relatedCitationIds,
    additionalSourceUrls
  });
}

function parseCounts(value: unknown): BaziCitationApplicabilityObservationCounts {
  const counts = record(value, "观察文件 declaredCounts");
  exactKeys(counts, [
    "total",
    "unobserved",
    "applicableInBoundContext",
    "partiallyApplicableInBoundContext",
    "notApplicableInBoundContext",
    "insufficientBoundContext"
  ], "观察文件 declaredCounts");
  return deepFreeze({
    total: positiveInteger(counts.total, "declaredCounts.total"),
    unobserved: positiveInteger(counts.unobserved, "declaredCounts.unobserved"),
    applicableInBoundContext: positiveInteger(
      counts.applicableInBoundContext,
      "declaredCounts.applicableInBoundContext"
    ),
    partiallyApplicableInBoundContext: positiveInteger(
      counts.partiallyApplicableInBoundContext,
      "declaredCounts.partiallyApplicableInBoundContext"
    ),
    notApplicableInBoundContext: positiveInteger(
      counts.notApplicableInBoundContext,
      "declaredCounts.notApplicableInBoundContext"
    ),
    insufficientBoundContext: positiveInteger(
      counts.insufficientBoundContext,
      "declaredCounts.insufficientBoundContext"
    )
  });
}

function parseBoundary(value: unknown): BaziCitationApplicabilityObservationBoundary {
  const boundary = record(value, "观察文件 boundary");
  const expected = fixedBoundary();
  exactKeys(boundary, Object.keys(expected), "观察文件 boundary");
  if (!sameCanonical(boundary, expected)) {
    fail("INVALID_OBSERVATION_FILE", "观察文件 boundary 不得提升身份、真值、写入或激活权限。");
  }
  return expected;
}

export async function inspectBaziCitationApplicabilityObservation(
  raw: unknown
): Promise<BaziCitationApplicabilityObservationFileInspection> {
  try {
    if (
      typeof raw !== "string"
      || raw.length > MAX_FILE_BYTES
      || new TextEncoder().encode(raw).byteLength > MAX_FILE_BYTES
    ) {
      fail("INVALID_OBSERVATION_FILE", "引用适用性观察文件超过 512 KiB 上限或不是文本。 ");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/^\uFEFF/u, "")) as unknown;
    } catch (cause) {
      fail("INVALID_OBSERVATION_FILE", "引用适用性观察文件不是有效 JSON。", { cause });
    }
    const root = record(snapshotDeclarative(parsed, "引用适用性观察文件"), "引用适用性观察文件");
    exactKeys(root, [
      "profile",
      "contextBinding",
      "reviewer",
      "session",
      "observations",
      "declaredCounts",
      "boundary"
    ], "引用适用性观察文件");
    if (!sameCanonical(root.profile, BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE)) {
      fail("INVALID_OBSERVATION_FILE", "引用适用性观察文件 profile 不匹配。 ");
    }
    const contextBinding = parseContextBinding(root.contextBinding);
    const reviewer = parseReviewer(root.reviewer);
    const session = parseSession(root.session);
    if (!Array.isArray(root.observations) || root.observations.length !== contextBinding.citationIds.length) {
      fail("OBSERVATION_COVERAGE_MISMATCH", "观察文件必须恰好覆盖其绑定的全部核验 citationId。 ");
    }
    const allowedCitationIds = new Set(contextBinding.citationIds);
    const observations = deepFreeze(root.observations.map((item, index) => parseObservation(
      item,
      index,
      contextBinding.citationIds,
      allowedCitationIds
    )));
    const counts = makeCounts(observations);
    const declaredCounts = parseCounts(root.declaredCounts);
    if (!sameCanonical(counts, declaredCounts)) {
      fail("OBSERVATION_COVERAGE_MISMATCH", "观察文件声明计数与逐项观察不一致。 ");
    }
    const boundary = parseBoundary(root.boundary);
    const observedCount = counts.total - counts.unobserved;
    const reviewerValues = [
      reviewer.reviewerId,
      reviewer.displayName,
      reviewer.affiliation,
      reviewer.expertiseStatement,
      reviewer.identityEvidenceReference
    ];
    const sessionValues = [
      session.observedAt,
      session.methodology,
      session.traditionScope,
      session.generalNotes
    ];
    const hasAttributionInput = reviewerValues.some((value) => value.trim())
      || sessionValues.some((value) => value.trim());
    const reviewerAttributionComplete = Boolean(
      reviewer.reviewerId.trim()
      && reviewer.displayName.trim()
      && reviewer.expertiseStatement.trim()
      && session.observedAt.trim()
      && validIsoInstant(session.observedAt)
      && session.methodology.trim()
      && session.traditionScope.trim()
    );
    if ((observedCount > 0 || hasAttributionInput) && !reviewerAttributionComplete) {
      fail(
        "REVIEWER_ATTRIBUTION_INCOMPLETE",
        "填写任何适用性观察或身份字段后，必须提供 reviewerId、显示名、专业说明、ISO 时间、方法与传统范围。"
      );
    }
    const envelope = deepFreeze({
      profile: BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
      contextBinding,
      reviewer,
      session,
      observations,
      declaredCounts,
      boundary
    });
    const recordSha256 = await sha256Hex({
      domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE.recordDigestDomain,
      payload: envelope
    });
    return deepFreeze({
      envelope,
      counts,
      observedCount,
      allCitationsObserved: observedCount === counts.total,
      reviewerAttributionComplete,
      currentContextChecked: false as const,
      contextBindingStructureValidated: true as const,
      contextDigestReferentsRecomputed: false as const,
      citationVerificationStatusRevalidated: false as const,
      recordDigestRecomputed: true as const,
      identityVerified: false as const,
      humanReviewAuthenticityVerified: false as const,
      chartApplicabilityAssessed: false as const,
      citationSemanticApplicabilityAssessed: false as const,
      eligibleForFormalActivation: false as const,
      automaticPromotionAllowed: false as const,
      storageMutationPerformed: false as const,
      mutationEpochRevalidationPerformed: false as const,
      mutationEpochBypassed: false as const,
      expertTruthClaimed: false as const,
      scientificValidityClaimed: false as const,
      integrity: {
        hashAlgorithm: "SHA-256" as const,
        recordSha256,
        digestIsDigitalSignature: false as const,
        authenticityClaimed: false as const
      }
    });
  } catch (cause) {
    if (cause instanceof BaziCitationApplicabilityObservationError) throw cause;
    throw new BaziCitationApplicabilityObservationError(
      "INVALID_OBSERVATION_FILE",
      "引用适用性观察文件独立检查失败关闭。",
      { cause }
    );
  }
}

export async function preflightBaziCitationApplicabilityObservation(
  raw: string,
  rawCurrentContext: unknown
): Promise<BaziCitationApplicabilityObservationPreflight> {
  try {
    const inspection = await inspectBaziCitationApplicabilityObservation(raw);
    const expectedContextBinding = await contextBindingFrom(rawCurrentContext);
    if (!sameCanonical(inspection.envelope.contextBinding, expectedContextBinding)) {
      fail("CONTEXT_BINDING_STALE", "观察文件没有绑定当前 Revision 字段与来源工作集上下文。 ");
    }
    return deepFreeze({
      envelope: inspection.envelope,
      counts: inspection.counts,
      observedCount: inspection.observedCount,
      allCitationsObserved: inspection.allCitationsObserved,
      reviewerAttributionComplete: inspection.reviewerAttributionComplete,
      suppliedCurrentContextDigestMatched: true as const,
      identityVerified: false as const,
      humanReviewAuthenticityVerified: false as const,
      chartApplicabilityAssessed: false as const,
      citationSemanticApplicabilityAssessed: false as const,
      eligibleForFormalActivation: false as const,
      automaticPromotionAllowed: false as const,
      storageMutationPerformed: false as const,
      mutationEpochBypassed: false as const,
      expertTruthClaimed: false as const,
      scientificValidityClaimed: false as const,
      integrity: inspection.integrity
    });
  } catch (cause) {
    if (cause instanceof BaziCitationApplicabilityObservationError) throw cause;
    throw new BaziCitationApplicabilityObservationError(
      "INVALID_OBSERVATION_FILE",
      "引用适用性观察文件当前上下文预检失败关闭。",
      { cause }
    );
  }
}
