import path from "node:path";
import { z } from "zod";

import {
  CURRENT_INDEX_RELATIVE_PATH,
  getCurrentIndexSummary,
  isVerifiedCurrentIndex,
  loadCurrentIndex
} from "./current-index-lib.mjs";
import {
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  BAZI_EXPERT_REVIEW_QUESTION_IDS,
  BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS,
  canonicalStringifyExpertReviewPacket,
  copyBaziExpertPassiveJsonData,
  computeBaziExpertReviewIntakeRecordDigest,
  computeExpertReviewPacketDigest,
  parseBaziExpertReviewJsonBytes,
  parseBaziExpertPrivateIntakeRequestJsonBytes,
  preflightBaziExpertOriginalOpinion,
  preflightBaziExpertPrivateIntakeRecordAgainstSession,
  readBaziExpertPrivateArtifact
} from "./bazi-expert-review-packet-lib.mjs";

const SCHEMA_VERSION = "1.0.0";
const RECORD_TYPE = "bazi_scoped_current_resolution_v1";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/u;
const REFLECT_APPLY = Reflect.apply;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_KEYS = Object.keys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_JOIN = Array.prototype.join;
const ARRAY_PUSH = Array.prototype.push;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const PATH_RESOLVE = path.resolve;
const REGEXP_TEST = RegExp.prototype.test;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const STRING_INCLUDES = String.prototype.includes;
const STRING_SPLIT = String.prototype.split;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const REFLECT_OWN_KEYS = Reflect.ownKeys;

export const BAZI_SCOPED_CURRENT_PURPOSES = Object.freeze({
  sourceBinding: "bazi_source_binding",
  sourceRights: "bazi_source_rights",
  domainManifest: "bazi_domain_manifest",
  expertReviewPacket: "bazi_expert_review_packet"
});

const DEFINITIONS = Object.freeze({
  [BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding]: Object.freeze({
    selectionKind: "versioned_family",
    familyKey: "content/bazi-strength-source-binding-candidates",
    artifactIdField: "ledgerId",
    pathPattern: /^content\/bazi-strength-source-binding-candidates\.v[0-9]+(?:\.[0-9]+){0,2}\.json$/u
  }),
  [BAZI_SCOPED_CURRENT_PURPOSES.sourceRights]: Object.freeze({
    selectionKind: "versioned_family",
    familyKey: "content/bazi-strength-source-rights-candidates",
    artifactIdField: "ledgerId",
    pathPattern: /^content\/bazi-strength-source-rights-candidates\.v[0-9]+(?:\.[0-9]+){0,2}\.json$/u
  }),
  [BAZI_SCOPED_CURRENT_PURPOSES.domainManifest]: Object.freeze({
    selectionKind: "versioned_family",
    familyKey: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest",
    artifactIdField: "manifestId",
    pathPattern: /^content\/domain-release\/bazi\.single-chart-report\.v1\.7\.0\.manifest\.v[0-9]+(?:\.[0-9]+){0,2}\.json$/u
  }),
  [BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket]: Object.freeze({
    selectionKind: "non_versioned_selection",
    selectionKey: "baziExpertReviewPacket",
    artifactIdField: "packetId",
    semanticDigestField: "packetDigest",
    pathPattern: /^content\/bazi-strength-expert-review-packet\.(?:v[0-9]+(?:\.[0-9]+){0,2}|current)\.json$/u
  })
});

const VERIFIED_RESOLUTIONS = new WeakSet();
const EXPERT_PROGRESS_AUTHORITY_BOUNDARY = OBJECT_FREEZE({
  formalAdmissionAuthorized: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false
});

export class BaziScopedCurrentError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "BaziScopedCurrentError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziScopedCurrentError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const keys = OBJECT_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) {
    deepFreeze(value[keys[index]], seen);
  }
  return OBJECT_FREEZE(value);
}

function isSafeRelativeJsonPath(value, pattern) {
  if (typeof value !== "string"
    || REFLECT_APPLY(STRING_INCLUDES, value, ["\\"])
    || REFLECT_APPLY(STRING_INCLUDES, value, [":"])
    || !REFLECT_APPLY(REGEXP_TEST, pattern, [value])) return false;
  const segments = REFLECT_APPLY(STRING_SPLIT, value, ["/"]);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === "" || segment === "." || segment === "..") return false;
  }
  return true;
}

function selectedVersionedBinding(index, definition, purpose) {
  let matchedEntry = null;
  let matchCount = 0;
  for (let position = 0; position < index.entries.length; position += 1) {
    const candidate = index.entries[position];
    if (candidate?.familyKey !== definition.familyKey) continue;
    matchedEntry = candidate;
    matchCount += 1;
  }
  if (matchCount !== 1) {
    fail("CURRENT_SCOPE_INVALID", `${purpose} family 必须在 verified index 中恰好出现一次。`);
  }
  const entry = matchedEntry;
  if (entry.selectedCurrent === null) {
    fail("CURRENT_UNAVAILABLE", `${purpose} 没有 selected current。`);
  }
  const selected = entry.selectedCurrent;
  if (selected?.artifactIdField !== definition.artifactIdField
    || !isSafeRelativeJsonPath(selected?.path, definition.pathPattern)) {
    fail("SELECTED_CURRENT_INVALID", `${purpose} 的 selected current 结构无效。`);
  }
  return Object.freeze({
    selectionState: entry.selectionState,
    familyKey: entry.familyKey,
    version: selected.version,
    path: selected.path,
    rawBytes: selected.rawBytes,
    rawSha256: selected.rawSha256,
    artifactIdField: selected.artifactIdField,
    artifactId: selected.artifactId,
    semanticDigestField: selected.semanticDigestField,
    semanticDigest: selected.semanticDigest
  });
}

function selectedExpertPacket(index, definition, purpose) {
  const selections = index.nonVersionedSelections;
  if (selections === null || typeof selections !== "object" || Array.isArray(selections)) {
    fail("CURRENT_SCOPE_INVALID", "verified index 缺少 nonVersionedSelections。");
  }
  const selection = selections[definition.selectionKey];
  if (selection === null || typeof selection !== "object" || Array.isArray(selection)) {
    fail("CURRENT_SCOPE_INVALID", `${purpose} selection 缺失。`);
  }
  if (selection.currentAvailable !== true || selection.selectedCurrent === null) {
    fail("CURRENT_UNAVAILABLE", `${purpose} 没有 selected current。`);
  }
  const selected = selection.selectedCurrent;
  if (!isSafeRelativeJsonPath(selected?.path, definition.pathPattern)) {
    fail("SELECTED_CURRENT_INVALID", `${purpose} 的 selected current path 无效。`);
  }
  return Object.freeze({
    selectionState: "selected_non_versioned_current",
    familyKey: null,
    version: typeof selected.version === "string" ? selected.version : null,
    path: selected.path,
    rawBytes: selected.rawBytes,
    rawSha256: selected.rawSha256,
    artifactIdField: definition.artifactIdField,
    artifactId: selected[definition.artifactIdField],
    semanticDigestField: definition.semanticDigestField,
    semanticDigest: selected[definition.semanticDigestField]
  });
}

function assertSelectedIdentity(selected, purpose) {
  if (!Number.isSafeInteger(selected.rawBytes) || selected.rawBytes <= 0
    || typeof selected.rawSha256 !== "string"
    || !SHA256_PATTERN.test(selected.rawSha256)
    || typeof selected.artifactId !== "string"
    || selected.artifactId.length === 0
    || typeof selected.artifactIdField !== "string"
    || selected.artifactIdField.length === 0) {
    fail("SELECTED_CURRENT_INVALID", `${purpose} 的路径、ID 或 raw SHA-256 无效。`);
  }
  if ((selected.semanticDigestField === null) !== (selected.semanticDigest === null)
    || (selected.semanticDigestField !== null
      && (typeof selected.semanticDigestField !== "string"
        || typeof selected.semanticDigest !== "string"
        || !SHA256_PATTERN.test(selected.semanticDigest)))) {
    fail("SELECTED_CURRENT_INVALID", `${purpose} 的 semantic digest 无效。`);
  }
}

async function rereadSelectedArtifact(workspaceRoot, selected, purpose) {
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, selected.path);
  } catch (cause) {
    fail("SELECTED_CURRENT_UNREADABLE", `${purpose} selected current 无法稳定重读。`, cause);
  }
  if (snapshot.path !== selected.path
    || snapshot.rawBytes !== selected.rawBytes
    || snapshot.rawSha256 !== selected.rawSha256) {
    fail("SELECTED_CURRENT_IDENTITY_DRIFT", `${purpose} selected current 在 index 验证后发生漂移。`);
  }
  return snapshot;
}

async function resolvePurpose(workspaceRoot, purpose, verifiedIndex = undefined) {
  const definition = DEFINITIONS[purpose];
  if (definition === undefined) fail("PURPOSE_INVALID", "未知 Bazi scoped current 用途。");

  const index = verifiedIndex ?? await loadCurrentIndex(workspaceRoot);
  if (!isVerifiedCurrentIndex(index)) {
    fail("INDEX_PRIVATE_BRAND_REQUIRED", "current-index 缺少私有验证品牌。");
  }

  const selected = definition.selectionKind === "versioned_family"
    ? selectedVersionedBinding(index, definition, purpose)
    : selectedExpertPacket(index, definition, purpose);
  assertSelectedIdentity(selected, purpose);
  await rereadSelectedArtifact(workspaceRoot, selected, purpose);

  const requestedRoot = REFLECT_APPLY(PATH_RESOLVE, path, [workspaceRoot]);
  const pathSegments = REFLECT_APPLY(STRING_SPLIT, selected.path, ["/"]);
  const resolveArguments = [requestedRoot];
  for (let position = 0; position < pathSegments.length; position += 1) {
    REFLECT_APPLY(ARRAY_PUSH, resolveArguments, [pathSegments[position]]);
  }
  const absolutePath = REFLECT_APPLY(PATH_RESOLVE, path, resolveArguments);
  const indexSummary = getCurrentIndexSummary(index);
  const resolution = deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    recordType: RECORD_TYPE,
    purpose,
    currentAvailable: true,
    currentIndex: {
      path: CURRENT_INDEX_RELATIVE_PATH,
      indexId: index.indexId,
      indexDigest: index.indexDigest,
      rawSha256: indexSummary.artifact.rawSha256
    },
    selection: {
      kind: definition.selectionKind,
      familyKey: selected.familyKey,
      selectionState: selected.selectionState,
      version: selected.version
    },
    artifact: {
      path: selected.path,
      absolutePath,
      rawBytes: selected.rawBytes,
      rawSha256: selected.rawSha256,
      artifactIdField: selected.artifactIdField,
      artifactId: selected.artifactId,
      semanticDigestField: selected.semanticDigestField,
      semanticDigest: selected.semanticDigest
    },
    authorityBoundary: index.authorityBoundary,
    snapshotBoundary: {
      crossFileAtomicSnapshot: index.snapshotBoundary.crossFileAtomicSnapshot,
      selectedArtifactStableRereadAfterIndexVerification: true,
      intervalMutationExcludedAcrossFiles:
        index.snapshotBoundary.intervalMutationExcludedAcrossFiles,
      abaExcluded: index.snapshotBoundary.abaExcluded
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESOLUTIONS, [resolution]);
  return resolution;
}

export function isVerifiedBaziScopedCurrentResolution(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESOLUTIONS, [value]);
}

function requireVerifiedResolution(value) {
  if (!isVerifiedBaziScopedCurrentResolution(value)) {
    fail("RESOLUTION_PRIVATE_BRAND_REQUIRED", "Bazi scoped current resolution 缺少私有验证品牌。");
  }
}

export function getBaziScopedCurrentRelativePath(value) {
  requireVerifiedResolution(value);
  if (!value.currentAvailable) fail("CURRENT_UNAVAILABLE", "当前对象不可用，不能取得路径。");
  return value.artifact.path;
}

export function getBaziScopedCurrentAbsolutePath(value) {
  requireVerifiedResolution(value);
  if (!value.currentAvailable) fail("CURRENT_UNAVAILABLE", "当前对象不可用，不能取得路径。");
  return value.artifact.absolutePath;
}

function exactJson(value, seen = new Set(), depth = 0) {
  if (depth > 32) fail("RESOLUTION_SERIALIZATION_INVALID", "resolution 嵌套过深。");
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON_STRINGIFY(value);
  }
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value)) {
      fail("RESOLUTION_SERIALIZATION_INVALID", "resolution 包含非有限数值。");
    }
    return JSON_STRINGIFY(value);
  }
  if (typeof value !== "object" || REFLECT_APPLY(SET_HAS, seen, [value])) {
    fail("RESOLUTION_SERIALIZATION_INVALID", "resolution 不是无别名 JSON 数据。");
  }
  REFLECT_APPLY(SET_ADD, seen, [value]);
  if (ARRAY_IS_ARRAY(value)) {
    const entries = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!OBJECT_HAS_OWN(value, index)) {
        fail("RESOLUTION_SERIALIZATION_INVALID", "resolution 数组必须稠密。");
      }
      REFLECT_APPLY(ARRAY_PUSH, entries, [exactJson(value[index], seen, depth + 1)]);
    }
    return `[${REFLECT_APPLY(ARRAY_JOIN, entries, [","])}]`;
  }
  const prototype = OBJECT_GET_PROTOTYPE_OF(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("RESOLUTION_SERIALIZATION_INVALID", "resolution 对象原型无效。");
  }
  const entries = [];
  const keys = OBJECT_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    REFLECT_APPLY(ARRAY_PUSH, entries, [
      `${JSON_STRINGIFY(key)}:${exactJson(value[key], seen, depth + 1)}`
    ]);
  }
  return `{${REFLECT_APPLY(ARRAY_JOIN, entries, [","])}}`;
}

export function serializeBaziScopedCurrentResolution(value) {
  requireVerifiedResolution(value);
  return `${exactJson(value)}\n`;
}

export async function loadBaziCurrentSourceBinding(workspaceRoot = process.cwd()) {
  return resolvePurpose(workspaceRoot, BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding);
}

export async function loadBaziCurrentSourceRights(workspaceRoot = process.cwd()) {
  return resolvePurpose(workspaceRoot, BAZI_SCOPED_CURRENT_PURPOSES.sourceRights);
}

export async function loadBaziCurrentDomainManifest(workspaceRoot = process.cwd()) {
  const resolution = await resolvePurpose(workspaceRoot, BAZI_SCOPED_CURRENT_PURPOSES.domainManifest);
  let summary;
  if (resolution.artifact.path === "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.3.0.json"
    && resolution.selection.version === "2.3.0") {
    const { loadBaziDomainReleaseManifestV23, getBaziDomainReleaseManifestV23Summary } =
      await import("./bazi-domain-release-manifest-v2-3-lib.mjs");
    summary = getBaziDomainReleaseManifestV23Summary(await loadBaziDomainReleaseManifestV23(workspaceRoot));
  } else if (resolution.artifact.path === "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json"
    && resolution.selection.version === "2.2.0") {
    const { loadBaziDomainReleaseManifestV22, getBaziDomainReleaseManifestV22Summary } =
      await import("./bazi-domain-release-manifest-v2-2-lib.mjs");
    summary = getBaziDomainReleaseManifestV22Summary(await loadBaziDomainReleaseManifestV22(workspaceRoot));
  } else {
    fail("CURRENT_DOMAIN_VERSION_UNSUPPORTED", "当前 domain manifest 尚无对应的机械输入校验器。");
  }
  assertCurrentDomainManifestMechanicalBinding(resolution, summary);
  return resolution;
}

function assertCurrentDomainManifestMechanicalBinding(resolution, summary) {
  if (summary.artifact?.path !== resolution.artifact.path
    || summary.artifact?.bytes !== resolution.artifact.rawBytes
    || summary.artifact?.sha256 !== resolution.artifact.rawSha256
    || summary.manifestId !== resolution.artifact.artifactId
    || summary.manifestDigest !== resolution.artifact.semanticDigest) {
    fail("CURRENT_DOMAIN_MECHANICAL_BINDING_MISMATCH", "domain 机械验证对象与显式 current 选择不一致。");
  }
}

export async function loadBaziCurrentExpertReviewPacket(workspaceRoot = process.cwd()) {
  const index = await loadCurrentIndex(workspaceRoot);
  const resolution = await resolvePurpose(workspaceRoot, BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket, index);
  const snapshot = await rereadSelectedArtifact(workspaceRoot,
    index.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent,
    BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket);
  await loadCurrentExpertPacketInputClosure(workspaceRoot, index, snapshot);
  return resolution;
}

// The existing original-opinion format only. The historical library's public
// preflight also fixes session 1.5, so current records use its public parser and
// digest with this local shape check, without relabeling or re-signing inputs.
const expertId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,199}$/u);
const expertDigest = z.string().regex(SHA256_PATTERN);
const expertText = z.string().min(1).max(20_000);
const expertUtc = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u).refine((value) => Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value);
const expertRef = z.strictObject({ recordId: expertId, recordDigest: expertDigest });
const EXPERT_EXCLUDED_SCOPES = OBJECT_FREEZE([
  "ziwei_domain_truth", "western_astrology_domain_truth", "vedic_astrology_domain_truth",
  "rights_or_legal_adjudication", "engineering_release_readiness",
  "individual_fortune_prediction", "public_deployment_authorization"
]);
const currentOriginalSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0"),
  recordType: z.literal("bazi_expert_original_opinion_v1"),
  recordId: expertId,
  recordVersion: z.literal("1.0.0"),
  createdAt: expertUtc,
  reviewPurpose: z.enum(["candidate_feedback_only", "release_closure_review"]),
  sessionBinding: z.strictObject({
    systemId: expertId, surfaceId: expertId,
    surfaceVersion: z.string().regex(/^\d+\.\d+\.\d+$/u),
    packetId: expertId, packetDigest: expertDigest, packetRawSha256: expertDigest,
    readinessLedgerId: expertId, readinessLedgerDigest: expertDigest,
    reviewQuestionIds: z.array(expertId).length(4),
    independenceFactorIds: z.array(expertId).length(10)
  }),
  payload: z.strictObject({
    opinionKind: z.literal("original"),
    slotId: z.enum(["domain-expert-a", "domain-expert-b"]),
    reviewerBindingRef: expertRef, independenceAssessmentRef: expertRef,
    independenceCompletedAt: expertUtc, reviewStartedAt: expertUtc, submittedAt: expertUtc,
    priorExposureState: z.literal("none_declared"),
    responses: z.array(z.strictObject({
      responseId: expertId, questionId: expertId,
      position: z.enum(["support", "oppose", "conditional", "cannot_decide"]),
      originalText: expertText, rationale: expertText,
      evidenceRefs: z.array(expertRef).max(1_000),
      uncertainties: z.array(z.string().min(1).max(2_000)).max(1_000),
      affectedBindingIds: z.array(expertId).max(1_000),
      affectedStructures: z.array(expertText).max(1_000),
      highRiskBoundary: z.enum(["conservative_expression_only", "defer", "no_release", "not_applicable"])
    })).length(4),
    scopeStatement: expertText, excludedScopes: z.array(expertId).length(7),
    parentOriginalOpinionRef: z.null()
  }),
  integrity: z.strictObject({
    hashAlgorithm: z.literal("SHA-256"),
    digestDomain: z.literal("hakimi.bazi.expert-review-intake-record.v1"),
    recordDigest: expertDigest,
    digestIsDigitalSignature: z.literal(false), authenticityEstablished: z.literal(false)
  })
});

function requireExpertSameValues(actual, expected, code, label) {
  let same;
  try { same = canonicalStringifyExpertReviewPacket(actual) === canonicalStringifyExpertReviewPacket(expected); }
  catch (cause) { fail(code, label, cause); }
  if (!same) fail(code, label);
}

function currentOriginalContractFromSnapshot(snapshot, selected, readiness) {
  if (!readiness) fail("CURRENT_READINESS_UNAVAILABLE", "当前专家原件缺少显式选中的 readiness 对象。");
  if (snapshot.path !== selected.path || snapshot.rawBytes !== selected.rawBytes || snapshot.rawSha256 !== selected.rawSha256) {
    fail("SELECTED_CURRENT_IDENTITY_DRIFT", "当前专家 packet 重读的原始身份与显式选择不一致。");
  }
  const packet = parseBaziExpertReviewJsonBytes(snapshot.bytes, "selected current expert packet");
  if (packet.packetId !== selected.packetId || packet.packetDigest !== selected.packetDigest
    || computeExpertReviewPacketDigest(packet) !== selected.packetDigest) {
    fail("SELECTED_CURRENT_IDENTITY_DRIFT", "当前专家 packet 重读的语义身份与显式选择不一致。");
  }
  const scope = z.strictObject({
    systemId: z.literal("bazi"), surfaceId: z.literal("single-chart-report"),
    surfaceVersion: z.string().regex(/^\d+\.\d+\.\d+$/u),
    bindingIds: z.array(expertId).min(1).max(1_000),
    unresolvedStructures: z.array(expertText).max(1_000),
    excludedScopes: z.array(expertId).length(7)
  }).safeParse(packet.reviewScope);
  if (!scope.success || packet.schemaVersion !== "1.0.0"
    || packet.recordType !== "bazi_strength_expert_review_packet_candidate"
    || !expertId.safeParse(readiness.artifactId).success || !expertDigest.safeParse(readiness.semanticDigest).success) {
    fail("CURRENT_REVIEW_CONTRACT_INVALID", "选中 packet/readiness 缺少现有原件格式所需的完整范围契约。");
  }
  const questions = z.array(z.strictObject({ questionId: expertId, title: expertText, question: expertText })).length(4).safeParse(packet.reviewQuestions);
  if (!questions.success) fail("CURRENT_REVIEW_CONTRACT_INVALID", "选中 packet 的四题结构无效。");
  requireExpertSameValues(questions.data.map((question) => question.questionId), [...BAZI_EXPERT_REVIEW_QUESTION_IDS], "CURRENT_REVIEW_CONTRACT_INVALID", "选中 packet 必须保留原件格式的四题。");
  requireExpertSameValues(packet.independenceChecklist, [...BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS], "CURRENT_REVIEW_CONTRACT_INVALID", "选中 packet 必须保留十项独立性因素。");
  requireExpertSameValues(scope.data.excludedScopes, [...EXPERT_EXCLUDED_SCOPES], "CURRENT_REVIEW_CONTRACT_INVALID", "选中 packet 不得放宽原件格式的排除范围。");
  for (const values of [scope.data.bindingIds, scope.data.unresolvedStructures]) {
    if (new Set(values).size !== values.length) fail("CURRENT_REVIEW_CONTRACT_INVALID", "选中 packet 范围不得重复。");
  }
  return deepFreeze({
    sessionBinding: {
      systemId: scope.data.systemId, surfaceId: scope.data.surfaceId, surfaceVersion: scope.data.surfaceVersion,
      packetId: selected.packetId, packetDigest: selected.packetDigest, packetRawSha256: selected.rawSha256,
      readinessLedgerId: readiness.artifactId, readinessLedgerDigest: readiness.semanticDigest,
      reviewQuestionIds: [...BAZI_EXPERT_REVIEW_QUESTION_IDS],
      independenceFactorIds: [...BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS]
    },
    bindingIds: scope.data.bindingIds,
    unresolvedStructures: scope.data.unresolvedStructures,
    excludedScopes: scope.data.excludedScopes
  });
}

const CURRENT_EXPERT_ARTIFACTS = deepFreeze([
  ["bazi-core-fact-engine", "packages/bazi-core/src/index.ts", "engineering_input_fact_contract"],
  ["bazi-current-chart-fact-projection", "packages/bazi-interpretation/src/current-chart-review-snapshot.ts", "engineering_input_fact_contract"],
  ["bazi-strength-assessment-core", "packages/bazi-interpretation/src/strength-assessment-core.ts", "engineering_rule_candidate"],
  ["bazi-strength-claim-registry", "packages/bazi-interpretation/src/strength-claim-registry.ts", "content_claim_candidate"],
  ["bazi-strength-policy", "packages/bazi-interpretation/src/strength-policy.ts", "engineering_rule_candidate"],
  ["bazi-strength-sensitivity-review", "packages/bazi-interpretation/src/strength-sensitivity-review.ts", "engineering_sensitivity_evidence"],
  ["contracts", "packages/contracts/src/index.ts", "engineering_input_contract"],
  ["rule-profiles", "packages/rule-profiles/src/index.ts", "engineering_input_policy"],
  ["engineering-binding-candidate-ledger", "content/bazi-strength-engineering-binding-candidates.v1.json", "engineering_candidate_not_frozen_rationale"],
  ["source-binding-candidate-ledger", "sourceBinding", "source_candidate_not_content_truth"],
  ["source-rights-candidate-ledger", "sourceRights", "rights_observation_not_legal_conclusion"],
  ["single-chart-report-v1.7-frozen-golden", "packages/research-export/src/golden/single-chart-report.contract.v1.7.json", "engineering_report_contract"]
]);

function expectedCurrentExpertArtifacts(sourceBinding, sourceRights) {
  return CURRENT_EXPERT_ARTIFACTS.map(([artifactId, inputPath, evidenceLayer]) => ({
    artifactId,
    path: inputPath === "sourceBinding" ? sourceBinding.path
      : inputPath === "sourceRights" ? sourceRights.path : inputPath,
    evidenceLayer
  }));
}

function assertCurrentExpertPacketInputClosure({
  packetSnapshot, selectedPacket, sourceBinding, sourceRights, readinessBinding,
  artifactSnapshots, readinessSnapshot, readinessBasisSnapshots
}) {
  const contract = currentOriginalContractFromSnapshot(packetSnapshot, selectedPacket, readinessBinding);
  const packet = parseBaziExpertReviewJsonBytes(packetSnapshot.bytes, "current expert task packet");
  const code = "CURRENT_EXPERT_INPUT_CLOSURE_MISMATCH";
  requireExpertSameValues(Object.keys(packet).sort(), [
    "schemaVersion", "recordType", "packetId", "status", "createdAt", "releaseGovernance",
    "artifactLocks", "sourceLedgerBindings", "reviewScope", "reviewQuestions", "roleSeparation",
    "identityPrivacyPolicy", "independenceChecklist", "reviewerSlots", "reviewProcess",
    "disagreementPolicy", "automatedResolutionPolicy", "gateSummary", "doesNotEstablish", "packetDigest"
  ].sort(), code, "当前任务包必须保留现有封闭格式。");
  if (packet.status !== "mechanically_bound_vacant_review_packet" || !expertUtc.safeParse(packet.createdAt).success) {
    fail(code, "当前任务包必须明确为未收件的工程审阅任务。");
  }
  requireExpertSameValues(packet.releaseGovernance, {
    releaseIdentity: "legacy-v13", targetSchema: 13, migrationId: null,
    mutationEpochBoundary: "preserved", publicDeploymentAuthorized: false, expertClaimsAuthorized: false
  }, code, "当前任务包不得提升发布或专家权威。");
  requireExpertSameValues(packet.reviewerSlots, ["domain-expert-a", "domain-expert-b"].map((slotId) => ({
    slotId, reviewerBinding: null, identityVerificationState: "absent", credentialVerificationState: "absent",
    scopeVerificationState: "absent", independenceVerificationState: "absent", originalOpinionDigest: null,
    originalOpinionStored: false, submittedAt: null, priorExposureToOtherOpinion: null, status: "vacant"
  })), code, "当前任务包的两个席位仍须为空；收件进度来自独立原件。");
  requireExpertSameValues(packet.gateSummary, {
    packetArtifactLocksVerified: 12, domainExpertsRequired: 2, reviewerSlotsOccupied: 0,
    identitiesVerified: 0, credentialsVerified: 0, scopesVerified: 0, independentExpertReviewsVerified: 0,
    sealedOriginalOpinions: 0, expertReviewBundleComplete: false, contentTruthEstablished: false,
    expertTruthEstablished: false, rightsLegalConclusionEstablished: false, releaseReady: false,
    publicDeploymentAuthorized: false, expertClaimsAuthorized: false
  }, code, "任务输入闭包不得产生已收件、资格或准入状态。");
  requireExpertSameValues(packet.automatedResolutionPolicy, {
    majorityVoteAllowed: false, opinionAveragingAllowed: false, generatedModelWinnerSelectionAllowed: false,
    unresolvedDisagreementMayBeAdopted: false, allowedUnresolvedDisposition: ["defer", "reject"]
  }, code, "当前任务不得用自动裁决代替专家意见。");
  const expectedArtifacts = expectedCurrentExpertArtifacts(sourceBinding, sourceRights);
  if (!Array.isArray(packet.artifactLocks) || packet.artifactLocks.length !== 12
    || !Array.isArray(artifactSnapshots) || artifactSnapshots.length !== 12) {
    fail(code, "当前任务必须核对全部十二个实际输入。");
  }
  for (let index = 0; index < expectedArtifacts.length; index += 1) {
    const expected = expectedArtifacts[index];
    const snapshot = artifactSnapshots[index];
    if (snapshot.path !== expected.path) fail(code, "当前任务输入快照路径或顺序不一致。");
    requireExpertSameValues(packet.artifactLocks[index], {
      artifactId: expected.artifactId, path: expected.path, sha256: snapshot.rawSha256,
      evidenceLayer: expected.evidenceLayer
    }, "CURRENT_EXPERT_ARTIFACT_DRIFT", "当前任务的实际输入字节与锁不一致。");
  }
  const selectedDocuments = [sourceBinding, sourceRights, readinessBinding].map((binding, index) => {
    const snapshot = index === 2 ? readinessSnapshot : artifactSnapshots[index + 9];
    if (snapshot.path !== binding.path || snapshot.rawBytes !== binding.rawBytes
      || snapshot.rawSha256 !== binding.rawSha256) {
      fail("CURRENT_EXPERT_SELECTED_INPUT_DRIFT", "当前来源、权利或 readiness 与显式选择不一致。");
    }
    const document = parseBaziExpertReviewJsonBytes(snapshot.bytes, "selected expert task input");
    if (document.ledgerId !== binding.artifactId || document.ledgerDigest !== binding.semanticDigest) {
      fail("CURRENT_EXPERT_SELECTED_INPUT_DRIFT", "当前任务输入的语义身份与显式选择不一致。");
    }
    return document;
  });
  const [source, rights, readiness] = selectedDocuments;
  const engineering = parseBaziExpertReviewJsonBytes(artifactSnapshots[8].bytes, "engineering task ledger");
  requireExpertSameValues(packet.sourceLedgerBindings, {
    engineeringBindingLedgerId: engineering.ledgerId, engineeringBindingLedgerDigest: engineering.ledgerDigest,
    sourceBindingLedgerId: source.ledgerId, sourceBindingLedgerDigest: source.ledgerDigest,
    sourceRightsLedgerId: rights.ledgerId, sourceRightsLedgerDigest: rights.ledgerDigest
  }, code, "当前任务的三账引用必须绑定实际输入。");
  requireExpertSameValues(rights.sourceBindingLedger, {
    path: sourceBinding.path, ledgerId: source.ledgerId, ledgerDigest: source.ledgerDigest,
    candidateCount: source.candidates.length
  }, code, "当前权利账必须引用同一显式来源账。");
  if (!Array.isArray(readiness.basisArtifacts) || readiness.basisArtifacts.length !== 11
    || !Array.isArray(readinessBasisSnapshots) || readinessBasisSnapshots.length !== 11
    || new Set(readiness.basisArtifacts.map((entry) => entry.path)).size !== 11
    || readiness.basisArtifacts.some((entry) => entry.path === selectedPacket.path)) {
    fail(code, "readiness 的原始输入闭包不得缺失、重复或回链当前任务包。");
  }
  for (let index = 0; index < readiness.basisArtifacts.length; index += 1) {
    const basis = readiness.basisArtifacts[index];
    const snapshot = readinessBasisSnapshots[index];
    requireExpertSameValues(basis, {
      path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256
    }, "CURRENT_EXPERT_READINESS_BASIS_DRIFT", "readiness 原始输入的字节闭包漂移。");
  }
  for (const snapshot of [artifactSnapshots[8], artifactSnapshots[9], artifactSnapshots[10]]) {
    requireExpertSameValues(readiness.basisArtifacts.filter((entry) => entry.path === snapshot.path), [{
      path: snapshot.path, bytes: snapshot.rawBytes, sha256: snapshot.rawSha256
    }], code, "readiness 必须绑定当前任务的工程、来源和权利三账。");
  }
  requireExpertSameValues(readiness.bindings.map((binding) => binding.bindingId), packet.reviewScope.bindingIds,
    code, "当前任务范围必须覆盖同一 readiness 的全部 binding。");
  return contract;
}

async function loadCurrentExpertPacketInputClosure(workspaceRoot, index, packetSnapshot) {
  const sourceBinding = selectedVersionedBinding(index, DEFINITIONS[BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding], "expert_source_binding");
  const sourceRights = selectedVersionedBinding(index, DEFINITIONS[BAZI_SCOPED_CURRENT_PURPOSES.sourceRights], "expert_source_rights");
  const readinessBinding = index.entries.find((entry) =>
    entry.familyKey === "content/system-admission/bazi-binding-freeze-requirements")?.selectedCurrent;
  if (!readinessBinding) fail("CURRENT_READINESS_UNAVAILABLE", "当前任务缺少明确选择的 readiness。");
  const readInput = async (relativePath) => {
    try { return await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath); }
    catch (cause) { fail("CURRENT_EXPERT_INPUT_UNREADABLE", "当前任务输入无法稳定读取。", cause); }
  };
  const artifactSnapshots = [];
  for (const artifact of expectedCurrentExpertArtifacts(sourceBinding, sourceRights)) {
    artifactSnapshots.push(await readInput(artifact.path));
  }
  const readinessSnapshot = await rereadSelectedArtifact(workspaceRoot, readinessBinding, "expert_readiness");
  const readiness = parseBaziExpertReviewJsonBytes(readinessSnapshot.bytes, "selected expert readiness");
  if (!Array.isArray(readiness.basisArtifacts) || readiness.basisArtifacts.length !== 11) {
    fail("CURRENT_EXPERT_INPUT_CLOSURE_MISMATCH", "当前 readiness 必须保留其十一项原始输入。");
  }
  const readinessBasisSnapshots = [];
  for (const basis of readiness.basisArtifacts) readinessBasisSnapshots.push(await readInput(basis.path));
  return assertCurrentExpertPacketInputClosure({
    packetSnapshot, selectedPacket: index.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent,
    sourceBinding, sourceRights, readinessBinding, artifactSnapshots, readinessSnapshot, readinessBasisSnapshots
  });
}

function preflightCurrentOriginalOpinion(input, contract) {
  let parsed;
  try {
    if (input instanceof Uint8Array) parsed = parseBaziExpertReviewJsonBytes(input, "current original opinion");
    else {
      // The public digest routine first rejects active/non-JSON object shapes.
      // The round trip snapshots the same actual record; no field is replaced.
      computeBaziExpertReviewIntakeRecordDigest(input);
      parsed = parseBaziExpertReviewJsonBytes(Buffer.from(canonicalStringifyExpertReviewPacket(input), "utf8"), "current original opinion");
    }
    const shaped = currentOriginalSchema.safeParse(parsed);
    if (!shaped.success || computeBaziExpertReviewIntakeRecordDigest(parsed) !== parsed.integrity.recordDigest) {
      fail("EXPERT_ORIGINAL_STRUCTURE_INVALID", "当前意见原件字段、时序类型或原始摘要无效。");
    }
    parsed = shaped.data;
  } catch (cause) {
    if (cause instanceof BaziScopedCurrentError) throw cause;
    fail("EXPERT_ORIGINAL_STRUCTURE_INVALID", "当前意见原件未通过既有严格 JSON 与摘要契约。", cause);
  }
  requireExpertSameValues(parsed.sessionBinding, contract.sessionBinding, "CURRENT_REVIEW_SCOPE_MISMATCH", "意见原件实际绑定的 packet/readiness 与显式 current 不一致。");
  const payload = parsed.payload;
  const chronology = [payload.independenceCompletedAt, payload.reviewStartedAt, payload.submittedAt, parsed.createdAt];
  if (chronology.some((value, index) => index > 0 && Date.parse(value) < Date.parse(chronology[index - 1]))) {
    fail("EXPERT_ORIGINAL_STRUCTURE_INVALID", "独立性评估、开始、提交和原件创建的时间顺序无效。");
  }
  requireExpertSameValues(payload.excludedScopes, contract.excludedScopes, "EXPERT_ORIGINAL_STRUCTURE_INVALID", "原件排除范围不匹配。");
  const responseIds = new Set();
  for (const [index, response] of payload.responses.entries()) {
    if (responseIds.has(response.responseId) || response.questionId !== contract.sessionBinding.reviewQuestionIds[index]) {
      fail("EXPERT_ORIGINAL_STRUCTURE_INVALID", "原件必须依序逐一回答四题且 response ID 不重复。");
    }
    responseIds.add(response.responseId);
    const refs = response.evidenceRefs.map((ref) => `${ref.recordDigest}:${ref.recordId}`);
    if (new Set(refs).size !== refs.length || canonicalStringifyExpertReviewPacket(refs) !== canonicalStringifyExpertReviewPacket([...refs].sort())
      || new Set(response.uncertainties).size !== response.uncertainties.length) {
      fail("EXPERT_ORIGINAL_STRUCTURE_INVALID", "原件 evidence refs 必须去重排序，uncertainties 不得重复。");
    }
    for (const [values, universe] of [[response.affectedBindingIds, contract.bindingIds], [response.affectedStructures, contract.unresolvedStructures]]) {
      const positions = values.map((value) => universe.indexOf(value));
      if (positions.some((value, position) => value < 0 || (position > 0 && value <= positions[position - 1]))) {
        fail("EXPERT_ORIGINAL_STRUCTURE_INVALID", "原件受影响范围必须是当前 packet 的有序去重子集。");
      }
    }
  }
  return deepFreeze({ record: parsed, recordDigest: parsed.integrity.recordDigest });
}

/**
 * Counts received, structurally checked original records, never qualified people.
 * No trusted qualification receipt loader exists here. There is deliberately no
 * caller callback, verified-boolean input, or factory that can grant qualification.
 */
export async function loadBaziCurrentExpertReviewProgress(workspaceRoot = process.cwd(), intakeRecords = []) {
  if (arguments.length > 2 || !ARRAY_IS_ARRAY(intakeRecords) || intakeRecords.length > 64) {
    fail("EXPERT_PROGRESS_INPUT_INVALID", "进度入口只接收有界意见原件数组，不接收资格标记或核验回调。");
  }
  const index = await loadCurrentIndex(workspaceRoot);
  if (!isVerifiedCurrentIndex(index)) fail("INDEX_PRIVATE_BRAND_REQUIRED", "current-index 缺少私有验证品牌。");
  const selection = index.nonVersionedSelections.baziExpertReviewPacket;
  const currentAvailable = selection.currentAvailable === true && selection.selectedCurrent !== null;
  const indexSummary = getCurrentIndexSummary(index);
  const resolution = currentAvailable
    ? await resolvePurpose(workspaceRoot, BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket, index)
    : {
      schemaVersion: SCHEMA_VERSION,
      recordType: RECORD_TYPE,
      purpose: BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket,
      currentAvailable: false,
      currentIndex: {
        path: CURRENT_INDEX_RELATIVE_PATH,
        indexId: index.indexId,
        indexDigest: index.indexDigest,
        rawSha256: indexSummary.artifact.rawSha256
      },
      selection: { kind: "non_versioned_selection", familyKey: null, selectionState: "current_unavailable", version: null },
      artifact: null,
      authorityBoundary: index.authorityBoundary,
      snapshotBoundary: index.snapshotBoundary
    };
  const currentReadiness = index.entries.find((entry) =>
    entry.familyKey === "content/system-admission/bazi-binding-freeze-requirements")?.selectedCurrent;
  let currentOriginalContract = null;
  if (currentAvailable) {
    const selected = selectedExpertPacket(index, DEFINITIONS[BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket], BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket);
    const snapshot = await rereadSelectedArtifact(workspaceRoot, selected, BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket);
    currentOriginalContract = await loadCurrentExpertPacketInputClosure(workspaceRoot, index, snapshot);
  }
  const originalsBySeat = new Map();
  const originalsById = new Map();
  const reviewerBindings = new Set();
  let duplicateOriginalRecords = 0;
  let sharedIndependenceRef = null;
  for (let position = 0; position < intakeRecords.length; position += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(intakeRecords, String(position));
    if (!descriptor || !("value" in descriptor)) {
      fail("EXPERT_PROGRESS_INPUT_INVALID", "意见数组不得包含空洞或访问器。");
    }
    let checked;
    try {
      checked = currentOriginalContract
        ? preflightCurrentOriginalOpinion(descriptor.value, currentOriginalContract)
        : preflightBaziExpertOriginalOpinion(descriptor.value);
    } catch (cause) {
      if (cause instanceof BaziScopedCurrentError) throw cause;
      fail("EXPERT_ORIGINAL_STRUCTURE_INVALID", "意见原件未通过既有结构契约。", cause);
    }
    const record = checked.record;
    if (record.payload.opinionKind !== "original") {
      fail("EXPERT_ORIGINAL_REQUIRED", "补充意见不能作为新的原始意见或专家席位计数。");
    }
    const previous = originalsById.get(record.recordId);
    if (previous) {
      if (previous.recordDigest !== checked.recordDigest) {
        fail("EXPERT_ORIGINAL_ID_CONFLICT", "相同原件 ID 对应不同摘要，不能自动选择其中一份。");
      }
      duplicateOriginalRecords += 1;
      continue;
    }
    if (originalsBySeat.has(record.payload.slotId)) {
      fail("EXPERT_SEAT_ORIGINAL_CONFLICT", "同一专家席位出现多份不同原件，不能自动选择赢家。");
    }
    const reviewer = record.payload.reviewerBindingRef;
    const reviewerToken = `${reviewer.recordId}:${reviewer.recordDigest}`;
    if (reviewerBindings.has(reviewerToken)) {
      fail("EXPERT_REVIEWER_DUPLICATE", "同一身份绑定不能占用两个专家席位。");
    }
    const independence = record.payload.independenceAssessmentRef;
    const independenceToken = `${independence.recordId}:${independence.recordDigest}:${record.payload.independenceCompletedAt}`;
    if (sharedIndependenceRef !== null && sharedIndependenceRef !== independenceToken) {
      fail("EXPERT_INDEPENDENCE_BINDING_MISMATCH", "两份原件未绑定同一份先完成的独立性评估。");
    }
    sharedIndependenceRef = independenceToken;
    reviewerBindings.add(reviewerToken);
    originalsById.set(record.recordId, checked);
    originalsBySeat.set(record.payload.slotId, checked);
  }
  const missingQualificationEvidence = [
    "TRUSTED_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE",
    "REVIEWER_IDENTITY_NOT_VERIFIED",
    "REVIEWER_CREDENTIALS_NOT_VERIFIED",
    "CURRENT_QUESTION_SCOPE_NOT_VERIFIED",
    "ORIGINAL_OPINION_AUTHENTICITY_NOT_VERIFIED",
    "PAIRWISE_INDEPENDENCE_NOT_VERIFIED"
  ];
  const seats = ["domain-expert-a", "domain-expert-b"].map((slotId) => {
    const record = originalsBySeat.get(slotId)?.record;
    const binding = record?.sessionBinding;
    const currentScopeMatched = Boolean(currentAvailable && binding && currentReadiness
      && binding.packetId === selection.selectedCurrent.packetId
      && binding.packetDigest === selection.selectedCurrent.packetDigest
      && binding.packetRawSha256 === selection.selectedCurrent.rawSha256
      && binding.readinessLedgerId === currentReadiness.artifactId
      && binding.readinessLedgerDigest === currentReadiness.semanticDigest);
    return {
      slotId,
      originalReceived: record !== undefined,
      originalRecordRef: record ? { recordId: record.recordId, recordDigest: record.integrity.recordDigest } : null,
      currentScopeMatched,
      qualified: false,
      missingEvidence: [
        ...(!record ? ["ORIGINAL_OPINION_MISSING"] : []),
        ...(!currentAvailable ? ["CURRENT_EXPERT_PACKET_UNAVAILABLE"] : []),
        ...(record && currentAvailable && !currentScopeMatched ? ["CURRENT_REVIEW_SCOPE_MISMATCH"] : []),
        ...missingQualificationEvidence
      ]
    };
  });
  const result = deepFreeze({
    ...resolution,
    // Both available and unavailable selections expose the same non-authorizing
    // shape. Neither packet fields nor receipt-shaped input may promote it.
    authorityBoundary: EXPERT_PROGRESS_AUTHORITY_BOUNDARY,
    expertReviewProgress: {
      status: "blocked",
      requiredIndependentExperts: 2,
      receivedOriginalOpinions: originalsBySeat.size,
      duplicateOriginalRecords,
      structuralScope: currentAvailable ? "verified_current_packet_and_readiness" : "legacy_1.5_structural_only_no_current_object",
      receivedCountMeaning: currentAvailable
        ? "deduplicated_structurally_checked_current_bound_original_records_not_qualified_reviews"
        : "deduplicated_legacy_1.5_structural_original_records_not_current_or_qualified_reviews",
      qualifiedIndependentOpinions: 0,
      qualificationReceiptLoaderAvailable: false,
      independenceState: "not_established",
      seats,
      expertReviewBundleComplete: false,
      releaseReady: false,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESOLUTIONS, [result]);
  return result;
}

// Current file contexts belong to this consumer. Historical contexts and pure
// structural preflight results cannot stand in for a current private file read.
const CURRENT_PRIVATE_OPINIONS = new WeakMap();
const CURRENT_PRIVATE_IDENTITIES = new WeakMap();
const PRIVATE_INTAKE_MAX_BYTES = 5_000_000;
const privatePath = z.string().min(1).max(4096);
const privateIdentityRequest = z.strictObject({
  workspaceRoot: privatePath, privateRoot: privatePath,
  dossierRelativePath: privatePath, identityBindingRecord: z.unknown()
});
const privateOpinionRequest = z.strictObject({
  workspaceRoot: privatePath, privateRoot: privatePath,
  opinionRelativePath: privatePath, sealReceiptRecord: z.unknown()
});
const privateFilesRequest = z.strictObject({
  privateRoot: privatePath,
  submissions: z.array(z.strictObject({
    opinionRelativePath: privatePath, sealReceiptRecord: z.unknown(),
    identity: z.strictObject({
      dossierRelativePath: privatePath, identityBindingRecord: z.unknown()
    }).optional()
  })).max(2)
});

function privateRequestSnapshot(value, schema) {
  const result = schema.safeParse(copyBaziExpertPassiveJsonData(value));
  if (!result.success) fail("CURRENT_PRIVATE_INTAKE_REQUEST_INVALID", "私有收件请求结构无效。");
  return result.data;
}

function privateIntakeFailure(cause) {
  // Never retain parser, filesystem or private-record messages/causes here.
  return new BaziScopedCurrentError(getSafeBaziScopedCurrentErrorCode(cause), "当前私有收件校验失败。");
}

async function loadCurrentPrivateIntakeContract(workspaceRoot) {
  const index = await loadCurrentIndex(workspaceRoot);
  if (!isVerifiedCurrentIndex(index)) fail("INDEX_PRIVATE_BRAND_REQUIRED", "current-index 缺少私有验证品牌。");
  const selected = selectedExpertPacket(index, DEFINITIONS[BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket], BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket);
  const snapshot = await rereadSelectedArtifact(workspaceRoot, selected, BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket);
  return loadCurrentExpertPacketInputClosure(workspaceRoot, index, snapshot);
}

export async function loadBaziCurrentExpertIntakeSessionBinding(workspaceRoot = process.cwd()) {
  if (arguments.length > 1) fail("CURRENT_PRIVATE_INTAKE_REQUEST_INVALID", "会话入口不接收外部会话或核验回调。");
  return (await loadCurrentPrivateIntakeContract(workspaceRoot)).sessionBinding;
}

function preflightCurrentPrivateRecord(record, recordType, sessionBinding) {
  if (record?.recordType !== recordType) fail("INTAKE_RECORD_INVALID", "当前私有记录类型不匹配。");
  requireExpertSameValues(record.sessionBinding, sessionBinding,
    "CURRENT_REVIEW_SCOPE_MISMATCH", "私有记录与显式选择的当前会话不一致。");
  return preflightBaziExpertPrivateIntakeRecordAgainstSession(record, sessionBinding);
}

const privateRecordRef = (record) => ({ recordId: record.recordId, recordDigest: record.integrity.recordDigest });
const privateRefToken = (ref) => `${ref.recordId}:${ref.recordDigest}`;
const privateWorkspaceKey = (root) => {
  const resolved = REFLECT_APPLY(PATH_RESOLVE, path, [root]);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

export async function verifyBaziCurrentPrivateIdentityDossierArtifact(options) {
  try {
    if (arguments.length !== 1) fail("CURRENT_PRIVATE_INTAKE_REQUEST_INVALID", "身份收件只接收一个请求。");
    const request = privateRequestSnapshot(options, privateIdentityRequest);
    const session = await loadBaziCurrentExpertIntakeSessionBinding(request.workspaceRoot);
    const identity = preflightCurrentPrivateRecord(request.identityBindingRecord,
      "bazi_expert_public_identity_binding_v1", session).record;
    const file = await readBaziExpertPrivateArtifact({
      workspaceRoot: request.workspaceRoot, privateRoot: request.privateRoot, relativePath: request.dossierRelativePath
    });
    if (file.sha256 !== identity.payload.credentialDigest
      || file.sha256 !== identity.payload.privateDossierRef.encryptedArtifactSha256) {
      fail("PRIVATE_IDENTITY_DOSSIER_BINDING_INVALID", "身份资料原始字节与双摘要绑定不一致。");
    }
    const context = deepFreeze({
      contextType: "bazi_current_private_identity_dossier_v1",
      identityBindingRef: privateRecordRef(identity),
      dossierArtifact: { sha256: file.sha256, byteLength: file.byteLength },
      heldHandleReadMechanicallyVerified: true,
      sameHeldBufferShaMatchesCredentialAndDossierDigests: true,
      artifactEncryptionEstablished: false, identityVerified: false, credentialsVerified: false,
      qualificationsEstablished: false, ...EXPERT_PROGRESS_AUTHORITY_BOUNDARY
    });
    REFLECT_APPLY(WEAK_MAP_SET, CURRENT_PRIVATE_IDENTITIES, [context, deepFreeze({
      workspaceRoot: privateWorkspaceKey(request.workspaceRoot), identityBindingRecord: identity
    })]);
    return context;
  } catch (cause) { throw privateIntakeFailure(cause); }
}

export async function verifyBaziCurrentPrivateOriginalOpinionFile(options) {
  try {
    if (arguments.length !== 1) fail("CURRENT_PRIVATE_INTAKE_REQUEST_INVALID", "原件收件只接收一个请求。");
    const request = privateRequestSnapshot(options, privateOpinionRequest);
    const contract = await loadCurrentPrivateIntakeContract(request.workspaceRoot);
    const seal = preflightCurrentPrivateRecord(request.sealReceiptRecord,
      "bazi_expert_private_opinion_seal_receipt_v1", contract.sessionBinding).record;
    const file = await readBaziExpertPrivateArtifact({
      workspaceRoot: request.workspaceRoot, privateRoot: request.privateRoot, relativePath: request.opinionRelativePath
    });
    const parsed = parseBaziExpertReviewJsonBytes(file.bytes, "current private original", PRIVATE_INTAKE_MAX_BYTES);
    const opinion = preflightCurrentPrivateRecord(parsed,
      "bazi_expert_original_opinion_v1", contract.sessionBinding).record;
    if (opinion.payload.opinionKind !== "original") fail("PRIVATE_OPINION_BINDING_INVALID", "收件入口只接受原始意见。");
    preflightCurrentOriginalOpinion(opinion, contract);
    if (opinion.reviewPurpose !== seal.reviewPurpose
      || privateRefToken(seal.payload.opinionRef) !== privateRefToken(privateRecordRef(opinion))
      || privateRefToken(seal.payload.reviewerBindingRef) !== privateRefToken(opinion.payload.reviewerBindingRef)
      || seal.payload.opinionSubmittedAt !== opinion.payload.submittedAt
      || seal.payload.rawOpinionArtifact.sha256 !== file.sha256
      || seal.payload.rawOpinionArtifact.byteLength !== file.byteLength
      || seal.payload.rawOpinionArtifact.mediaType !== "application/json"
      || seal.payload.rawOpinionArtifact.encoding !== "utf-8"
      || Date.parse(opinion.createdAt) > Date.parse(seal.payload.sealedAt)) {
      fail("PRIVATE_OPINION_BINDING_INVALID", "原件字节、记录、身份引用或时序与封存回执不一致。");
    }
    const context = deepFreeze({
      contextType: "bazi_current_private_original_opinion_v1",
      originalRecordRef: privateRecordRef(opinion), sealReceiptRef: privateRecordRef(seal),
      rawOpinionArtifact: { sha256: file.sha256, byteLength: file.byteLength },
      heldHandleReadMechanicallyVerified: true, sameBufferHashAndStrictJsonParse: true,
      rawArtifactMatchesSealReceipt: true, opinionAuthenticityEstablished: false,
      qualificationsEstablished: false, ...EXPERT_PROGRESS_AUTHORITY_BOUNDARY
    });
    REFLECT_APPLY(WEAK_MAP_SET, CURRENT_PRIVATE_OPINIONS, [context, deepFreeze({
      workspaceRoot: privateWorkspaceKey(request.workspaceRoot), opinionRecord: opinion, sealReceiptRecord: seal
    })]);
    return context;
  } catch (cause) { throw privateIntakeFailure(cause); }
}

function currentPrivateContextStates(contexts, registry, workspaceRoot) {
  const code = "CURRENT_PRIVATE_CONTEXT_INVALID";
  if (!ARRAY_IS_ARRAY(contexts) || contexts.length > 2
    || REFLECT_OWN_KEYS(contexts).length !== contexts.length + 1) {
    fail(code, "私有文件上下文必须是至多两个元素的普通数组。");
  }
  const states = [];
  for (let index = 0; index < contexts.length; index += 1) {
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(contexts, String(index));
    const state = descriptor && OBJECT_HAS_OWN(descriptor, "value")
      ? REFLECT_APPLY(WEAK_MAP_GET, registry, [descriptor.value]) : undefined;
    if (!state || state.workspaceRoot !== privateWorkspaceKey(workspaceRoot)) {
      fail(code, "当前上下文缺少本入口签发的实际文件读取状态。");
    }
    states.push(state);
  }
  return states;
}

export async function loadBaziCurrentExpertReviewProgressFromPrivateContexts(workspaceRoot, opinionContexts, identityContexts = []) {
  try {
    if (arguments.length > 3) fail("CURRENT_PRIVATE_CONTEXT_INVALID", "上下文进度入口不接收外部核验回调。");
    const opinions = currentPrivateContextStates(opinionContexts, CURRENT_PRIVATE_OPINIONS, workspaceRoot);
    const identities = currentPrivateContextStates(identityContexts, CURRENT_PRIVATE_IDENTITIES, workspaceRoot);
    const identityRefs = new Set();
    const reviewerSeats = new Map();
    for (const { identityBindingRecord: identity } of identities) {
      const token = privateRefToken(privateRecordRef(identity));
      const matches = opinions.filter(({ opinionRecord: opinion }) =>
        privateRefToken(opinion.payload.reviewerBindingRef) === token
        && opinion.reviewPurpose === identity.reviewPurpose
        && canonicalStringifyExpertReviewPacket(opinion.sessionBinding) === canonicalStringifyExpertReviewPacket(identity.sessionBinding));
      if (matches.length === 0) fail("CURRENT_PRIVATE_IDENTITY_REFERENCE_MISMATCH", "身份资料未绑定本次收件的同会话意见原件。");
      for (const { opinionRecord: opinion } of matches) {
        const previousSeat = reviewerSeats.get(identity.payload.reviewerId);
        if (previousSeat !== undefined && previousSeat !== opinion.payload.slotId) {
          fail("EXPERT_REVIEWER_DUPLICATE", "已提供的同一 reviewerId 身份记录不能占用两个专家席位。");
        }
        reviewerSeats.set(identity.payload.reviewerId, opinion.payload.slotId);
      }
      identityRefs.add(token);
    }
    // Recheck the current selection and its dependency closure at consumption;
    // contexts hold the original file snapshots, never replacement input data.
    const progress = await loadBaziCurrentExpertReviewProgress(workspaceRoot, opinions.map((state) => state.opinionRecord));
    if (!progress.currentAvailable) fail("CURRENT_UNAVAILABLE", "当前专家收件会话不可用。");
    const seats = progress.expertReviewProgress.seats.map((seat) => {
      const opinion = opinions.find((state) => state.opinionRecord.payload.slotId === seat.slotId)?.opinionRecord;
      const identityReceived = opinion !== undefined && identityRefs.has(privateRefToken(opinion.payload.reviewerBindingRef));
      return { ...seat, privateIdentityDossierArtifactVerified: identityReceived,
        missingEvidence: [...seat.missingEvidence,
          ...(opinion && !identityReceived ? ["PRIVATE_IDENTITY_DOSSIER_ARTIFACT_MISSING"] : [])] };
    });
    const result = deepFreeze({ ...progress, expertReviewProgress: {
      ...progress.expertReviewProgress, seats,
      privateFileEvidence: {
        originalOpinionFilesVerified: progress.expertReviewProgress.receivedOriginalOpinions,
        identityDossierArtifactsVerified: identityRefs.size, qualificationsEstablished: false
      }
    } });
    REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESOLUTIONS, [result]);
    return result;
  } catch (cause) { throw privateIntakeFailure(cause); }
}

export async function loadBaziCurrentExpertReviewProgressFromPrivateFiles(workspaceRoot, options) {
  try {
    if (arguments.length !== 2) fail("CURRENT_PRIVATE_INTAKE_REQUEST_INVALID", "私有文件收件只接收工作区与请求。");
    const request = privateRequestSnapshot(options, privateFilesRequest);
    const opinions = [], identities = [];
    for (const submission of request.submissions) {
      opinions.push(await verifyBaziCurrentPrivateOriginalOpinionFile({
        workspaceRoot, privateRoot: request.privateRoot,
        opinionRelativePath: submission.opinionRelativePath, sealReceiptRecord: submission.sealReceiptRecord
      }));
      if (submission.identity) identities.push(await verifyBaziCurrentPrivateIdentityDossierArtifact({
        workspaceRoot, privateRoot: request.privateRoot, ...submission.identity
      }));
    }
    return await loadBaziCurrentExpertReviewProgressFromPrivateContexts(workspaceRoot, opinions, identities);
  } catch (cause) { throw privateIntakeFailure(cause); }
}

export async function loadBaziCurrentExpertReviewProgressFromPrivateIntakeFile(workspaceRoot, requestPath) {
  try {
    if (arguments.length !== 2 || !privatePath.safeParse(requestPath).success) {
      fail("CURRENT_PRIVATE_INTAKE_REQUEST_INVALID", "收件清单入口需要明确的 JSON 文件路径。");
    }
    const absolutePath = REFLECT_APPLY(PATH_RESOLVE, path, [requestPath]);
    const privateRoot = path.dirname(absolutePath);
    const file = await readBaziExpertPrivateArtifact({ workspaceRoot, privateRoot, relativePath: path.basename(absolutePath) });
    const submissions = parseBaziExpertPrivateIntakeRequestJsonBytes(file.bytes);
    return await loadBaziCurrentExpertReviewProgressFromPrivateFiles(workspaceRoot, { privateRoot, submissions });
  } catch (cause) { throw privateIntakeFailure(cause); }
}

// These pure checks create no verified-index/resolution brand and no expert
// qualification. Production always derives their contract from its own index
// and stable packet reread; it never accepts a caller-supplied contract/result.
export const baziScopedCurrentTestOnly = OBJECT_FREEZE({
  currentOriginalContractFromSnapshot,
  preflightCurrentOriginalOpinion,
  assertCurrentExpertPacketInputClosure,
  assertCurrentDomainManifestMechanicalBinding,
  selectedExpertPacket,
  selectedVersionedBinding
});

export function getSafeBaziScopedCurrentErrorCode(error) {
  return typeof error?.code === "string"
    && REFLECT_APPLY(REGEXP_TEST, SAFE_ERROR_CODE_PATTERN, [error.code])
    ? error.code
    : "INTERNAL_FAILURE";
}
