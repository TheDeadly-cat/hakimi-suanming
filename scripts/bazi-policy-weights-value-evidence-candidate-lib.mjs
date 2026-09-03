import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parse, parseExpression } from "@babel/parser";
import { computeBaziBindingFreezeRequirementsDigest } from "./bazi-binding-freeze-requirements-lib.mjs";
import { computeEngineeringBindingCandidateLedgerDigest } from "./bazi-engineering-binding-candidate-lib.mjs";
import { computeBaziEngineeringBindingValueSubjectGapDigest } from "./bazi-engineering-binding-value-subject-gap-lib.mjs";

export const BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.json";

const ENGINEERING_LEDGER_RELATIVE_PATH =
  "content/bazi-strength-engineering-binding-candidates.v1.json";
const VALUE_SUBJECT_GAP_RELATIVE_PATH =
  "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.json";
const FREEZE_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.json";
const POLICY_RELATIVE_PATH = "packages/bazi-interpretation/src/strength-policy.ts";
const CORE_RELATIVE_PATH = "packages/bazi-interpretation/src/strength-assessment-core.ts";

export const BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_BASIS_RELATIVE_PATHS = Object.freeze([
  ENGINEERING_LEDGER_RELATIVE_PATH,
  VALUE_SUBJECT_GAP_RELATIVE_PATH,
  FREEZE_REQUIREMENTS_RELATIVE_PATH,
  POLICY_RELATIVE_PATH,
  CORE_RELATIVE_PATH
]);

const BASIS_DEFINITIONS = Object.freeze([
  Object.freeze({
    path: ENGINEERING_LEDGER_RELATIVE_PATH,
    role: "engineering_binding_candidate_parent",
    kind: "json",
    maxBytes: 1_000_000,
    expectedBytes: 21_712,
    expectedSha256: "95154d55d9e368351f5a69a1fa2ff63a51ba946d33a800dbd1f2460d9ac97b2f"
  }),
  Object.freeze({
    path: VALUE_SUBJECT_GAP_RELATIVE_PATH,
    role: "engineering_value_subject_gap_parent",
    kind: "json",
    maxBytes: 2_000_000,
    expectedBytes: 52_073,
    expectedSha256: "5c7a999738200b55f5e3e79a3ff7b2c73f59d8af61846046d26ea1e31987c4c0"
  }),
  Object.freeze({
    path: FREEZE_REQUIREMENTS_RELATIVE_PATH,
    role: "binding_freeze_state_parent",
    kind: "json",
    maxBytes: 1_000_000,
    expectedBytes: 26_038,
    expectedSha256: "662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201"
  }),
  Object.freeze({
    path: POLICY_RELATIVE_PATH,
    role: "policy_weight_value_and_dispatch_source",
    kind: "source",
    maxBytes: 1_000_000,
    expectedBytes: 10_905,
    expectedSha256: "795709298542773459a73cd8a63a6824d3076bbdedf6a157c0652d25446486f1"
  }),
  Object.freeze({
    path: CORE_RELATIVE_PATH,
    role: "policy_weight_direct_consumer_source",
    kind: "source",
    maxBytes: 1_000_000,
    expectedBytes: 8_559,
    expectedSha256: "bbe6510c5cc0500efc8bb3af45efc1c344a5159f35c8fe5fca3aae3dab156e3b"
  })
]);

const CANDIDATE_CREATED_AT = "2026-08-29T00:00:00.000Z";
const CANDIDATE_DIGEST_DOMAIN = "hakimi.bazi.policy-weights-value-evidence-candidate.v1";
const MAX_CANDIDATE_BYTES = 1_000_000;
const WEIGHT_KEYS = Object.freeze([
  "monthCommand",
  "visibleStem",
  "firstHiddenStem",
  "otherHiddenStem"
]);
const EXPECTED_WEIGHTS = Object.freeze({
  monthCommand: 4,
  visibleStem: 2,
  firstHiddenStem: 2,
  otherHiddenStem: 1
});
const EXPECTED_DISPATCH = Object.freeze({
  monthCommand: "monthCommand",
  visibleStem: "visibleStem",
  hiddenIndexZero: "firstHiddenStem",
  hiddenOtherIndex: "otherHiddenStem"
});
const EXPECTED_CONSUMER_PROJECTION = Object.freeze({
  invalidHiddenIndexRejected: true,
  consumerCalls: Object.freeze([
    "month_command",
    "visible_stem",
    "hidden_stem_with_index"
  ])
});
const EXPECTED_COLLECTOR_SOURCE_SHA256 =
  "17f92ab6845cc2a383c597771524a4614f2dd5e0954d9c1dd7deae821836db0e";
const EXPECTED_VALUE_SUBJECT_IDS = Object.freeze([
  "bazi.engineering.weights.values.v1",
  "bazi.engineering.weights.dispatch.v1",
  "bazi.engineering.weights.guard-and-consumers.v1"
]);
const EXPECTED_VALUE_SUBJECT_METADATA = Object.freeze([
  Object.freeze({
    valueSubjectId: EXPECTED_VALUE_SUBJECT_IDS[0],
    kind: "declared_policy_values",
    observationState: "repository_values_observed_engineering_rationale_unfrozen",
    producerRefs: Object.freeze([
      "packages/bazi-interpretation/src/strength-policy.ts#BAZI_STRENGTH_FACTOR_WEIGHTS"
    ]),
    consumerRefs: Object.freeze([])
  }),
  Object.freeze({
    valueSubjectId: EXPECTED_VALUE_SUBJECT_IDS[1],
    kind: "algorithm_surface",
    observationState: "stable_executable_syntax_indicates_policy_dispatch_general_control_flow_unproven",
    producerRefs: Object.freeze([
      "packages/bazi-interpretation/src/strength-policy.ts#strengthFactorWeight"
    ]),
    consumerRefs: Object.freeze([])
  }),
  Object.freeze({
    valueSubjectId: EXPECTED_VALUE_SUBJECT_IDS[2],
    kind: "fail_closed_consumer_surface",
    observationState: "stable_executable_syntax_of_guard_and_consumers_observed_value_provenance_unfrozen",
    producerRefs: Object.freeze([
      "packages/bazi-interpretation/src/strength-policy.ts#strengthFactorWeight"
    ]),
    consumerRefs: Object.freeze([
      "packages/bazi-interpretation/src/strength-assessment-core.ts#collectBaziStrengthFactors"
    ])
  })
]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  TYPED_ARRAY_PROTOTYPE,
  "byteLength"
).get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = Object.getOwnPropertyDescriptor(
  TYPED_ARRAY_PROTOTYPE,
  "byteOffset"
).get;
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(
  TYPED_ARRAY_PROTOTYPE,
  "buffer"
).get;

const PARENT_RELEASE_GOVERNANCE = Object.freeze({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const RELEASE_GOVERNANCE = Object.freeze({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochRequiredBeforeAnyFutureFreeze: true,
  mutationEpochAvailableForSchema13: false,
  mutationEpochReceipt: null,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const SCOPE_BOUNDARY = Object.freeze({
  phase: "C_source_rights_and_binding_governance",
  childScope: "binding_policy_weights_three_value_subjects_only",
  candidateOnly: true,
  newBindingIdentityCreated: false,
  formalEvidenceSubjectRegistrationPerformed: false,
  domainManifestIntegrated: false,
  centralRegistryIntegrated: false,
  parentLedgerResigned: false,
  formalLifecycleIntegrationAssessed: false
});

const OBSERVATION_BOUNDARY = Object.freeze({
  heldFileHandleReads: true,
  pathAndDirectoryChainRevalidated: true,
  perFileHashParseAndAstInspectionUseSameBuffer: true,
  candidateJsonParseUsesHeldHandleBuffer: true,
  endpointSnapshotOnly: true,
  crossFileAtomicSnapshot: false,
  mutationEpochAvailableForSchema13: false,
  mutationEpochReceipt: null,
  intervalMutationExcluded: false,
  abaExcluded: false,
  stableExecutableSyntaxProjectionObserved: true,
  generalControlFlowEquivalenceMechanicallyEstablished: false,
  generalDataFlowEquivalenceMechanicallyEstablished: false,
  runtimeExecutionObserved: false
});

const POLICY_BINDING = Object.freeze({
  bindingId: "binding:policy:weights",
  evidenceSubjectId: "bazi.strength.binding.policy.weights.v1",
  engineeringCandidateId: "hakimi-strength-weights-0.1.0-engineering-candidate-v1",
  sourceId: "hakimi-strength-policy-0.1.0",
  policyVersion: "hakimi.bazi.strength_policy/0.1.0",
  order: 4,
  originType: "project_engineering_heuristic",
  authorityBoundary: "engineering_definition_only_no_classical_or_expert_authority",
  valueSubjectIds: EXPECTED_VALUE_SUBJECT_IDS
});

const GATE_SUMMARY = Object.freeze({
  currentPolicyWeightValuesObserved: 4,
  scopedValueSubjectsObserved: 3,
  stablePolicyDispatchSyntaxObserved: true,
  directConsumerCallShapesObserved: 3,
  sourceEvidenceRefsBound: 0,
  formalSourceRightsRecords: 0,
  formalSourceCarrierRecords: 0,
  engineeringRationalesFrozen: 0,
  engineeringReviewsVerified: 0,
  expertReviewsVerified: 0,
  independentDomainReviewsVerified: 0,
  bindingFreezeEligible: false,
  bindingFrozenVerified: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  formalActivationAllowed: false,
  releaseReady: false,
  publicDeploymentAuthorized: false
});

const EXPECTED_PARENT_LEDGER_DIGESTS = Object.freeze({
  engineering: "05ce9c6d9c03822cf246b0406d15616e8c4a6938650296135142827a00a5a28e",
  valueSubjectGap: "7a03874b6009928367bf8c5aa60a1312d519d0f8c4ee339c83bc7a40f0b8e81d",
  freezeRequirements: "feea402079cab44a5d3e0855f867114684da96e4005343a1b1a7cdc75fbee9ad"
});

const AUTHORITY_BOUNDARY = Object.freeze({
  bindingFreezeEligible: false,
  bindingFrozenVerified: false,
  engineeringRationaleFrozen: false,
  firstPartyAuthorshipLegallyEstablished: false,
  traditionalAuthorityClaimed: false,
  parameterAuthorityClaimed: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  releaseReady: false,
  publicDeploymentAuthorized: false
});

const EXTERNAL_EVIDENCE = Object.freeze({
  sourceEvidenceRefs: Object.freeze([]),
  sourceRightsRecordId: null,
  sourceCarrierRecordId: null,
  engineeringRationaleRecordId: null,
  engineeringReviewIds: Object.freeze([]),
  expertReviewIds: Object.freeze([]),
  independentDomainReviewIds: Object.freeze([])
});

const DOES_NOT_ESTABLISH = Object.freeze([
  "new_or_parallel_binding_identity",
  "formal_evidence_subject_registration",
  "engineering_rationale_freeze",
  "source_or_exact_quote_evidence",
  "source_rights_or_carrier_record",
  "work_edition_or_carrier_rights_clearance",
  "expert_review_or_domain_truth",
  "general_control_flow_or_data_flow_equivalence",
  "runtime_execution",
  "binding_freeze_eligibility_or_verification",
  "cross_file_atomic_snapshot",
  "mutation_epoch",
  "interval_mutation_or_aba_exclusion",
  "domain_manifest_or_central_registry_integration",
  "release_readiness",
  "public_release_authorization"
]);

export class BaziPolicyWeightsValueEvidenceCandidateError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "BaziPolicyWeightsValueEvidenceCandidateError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new BaziPolicyWeightsValueEvidenceCandidateError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "JSON 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "JSON 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INPUT_VALUE_INVALID", "JSON 输入含非有限数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "JSON 输入超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "输入只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "输入不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "输入不接受循环引用。");
  state.active.add(value);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = Array.isArray(value);
      prototype = Object.getPrototypeOf(value);
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "无法安全捕获输入对象。", cause);
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "输入不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "JSON 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "JSON 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "JSON 数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "JSON 数组含稀疏或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "JSON 输入只接受普通对象。");
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "JSON 输入不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    active: new WeakSet(),
    nodes: 0,
    textCharacters: 0
  }, 0);
}

function canonicalValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareCodeUnits)
      .map((key) => [key, canonicalValue(value[key])])
  );
}

export function canonicalStringifyBaziPolicyWeightsValueEvidenceCandidate(value) {
  return JSON.stringify(canonicalValue(value));
}

function plainValueDigest(value) {
  return createHash("sha256")
    .update(canonicalStringifyBaziPolicyWeightsValueEvidenceCandidate(value), "utf8")
    .digest("hex");
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyBaziPolicyWeightsValueEvidenceCandidate(value), "utf8")
    .digest("hex");
}

export function computeBaziPolicyWeightsValueEvidenceCandidateDigest(candidateInput) {
  const candidate = capturePassiveJsonSnapshot(candidateInput);
  const { candidateDigest: _candidateDigest, ...unsigned } = candidate;
  return domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned);
}

function deepFreezeJson(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreezeJson(child);
    Object.freeze(value);
  }
  return value;
}

function isSafeFailure(error) {
  return error instanceof BaziPolicyWeightsValueEvidenceCandidateError;
}

function normalizePathForComparison(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isSameResolvedPath(left, right) {
  return normalizePathForComparison(left) === normalizePathForComparison(right);
}

function isSameOrWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function validateSafeRelativePath(relativePath) {
  if (typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes(":")
    || relativePath.includes("\0")
    || path.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail("UNSAFE_RELATIVE_PATH", "依据文件相对路径不安全。");
  }
  return relativePath;
}

function assertDirectoryStat(metadata, code, label) {
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    fail(code, `${label} 目录链必须全部是普通目录。`);
  }
  for (const field of ["dev", "ino", "nlink", "mtimeNs", "ctimeNs"]) {
    if (typeof metadata[field] !== "bigint") fail(code, `${label} 目录链元数据不可核验。`);
  }
  if (metadata.ino <= 0n || metadata.nlink <= 0n) fail(code, `${label} 目录链身份不可核验。`);
}

function directoryEndpoint(absolutePath, resolvedPath, metadata) {
  return Object.freeze({
    absolutePath,
    resolvedPath,
    dev: metadata.dev,
    ino: metadata.ino,
    nlink: metadata.nlink,
    mtimeNs: metadata.mtimeNs,
    ctimeNs: metadata.ctimeNs
  });
}

async function resolveOrdinaryRoot(root) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    fail("ROOT_INVALID", "工作区根必须是显式绝对路径。");
  }
  try {
    const unresolved = path.resolve(root);
    const metadata = await lstat(unresolved, { bigint: true });
    assertDirectoryStat(metadata, "ROOT_INVALID", "工作区根");
    const resolved = await realpath(unresolved);
    if (!isSameResolvedPath(unresolved, resolved)) {
      fail("ROOT_INVALID", "工作区根不能是 symlink 或 junction alias。");
    }
    return resolved;
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail("ROOT_INVALID", "工作区根无法安全解析。", error);
  }
}

async function capturePlainDirectoryChain(rootReal, absolutePath, code, label) {
  try {
    const targetDirectory = path.dirname(path.resolve(absolutePath));
    if (!isSameOrWithin(rootReal, targetDirectory)) fail("PATH_ESCAPE", `${label} 目录链越界。`);
    const relative = path.relative(rootReal, targetDirectory);
    const segments = relative === "" ? [] : relative.split(path.sep);
    const endpoints = [];
    let cursor = rootReal;
    for (const segment of [null, ...segments]) {
      if (segment !== null) cursor = path.join(cursor, segment);
      const metadata = await lstat(cursor, { bigint: true });
      assertDirectoryStat(metadata, code, label);
      const resolvedPath = await realpath(cursor);
      if (endpoints.length === 0) {
        if (!isSameResolvedPath(resolvedPath, rootReal)) fail(code, `${label} 根目录身份已变化。`);
      } else if (!isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
        fail("PATH_ESCAPE", `${label} 目录链 realpath 越界。`);
      }
      endpoints.push(directoryEndpoint(cursor, resolvedPath, metadata));
    }
    return Object.freeze(endpoints);
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail(code, `${label} 目录链无法安全核验。`, error);
  }
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && isSameResolvedPath(entry.absolutePath, other.absolutePath)
      && isSameResolvedPath(entry.resolvedPath, other.resolvedPath)
      && entry.dev === other.dev
      && entry.ino === other.ino
      && entry.nlink === other.nlink
      && entry.mtimeNs === other.mtimeNs
      && entry.ctimeNs === other.ctimeNs;
  });
}

function sameFileIdentity(left, right) {
  return left.isFile()
    && right.isFile()
    && typeof left.dev === "bigint"
    && typeof left.ino === "bigint"
    && left.ino > 0n
    && left.dev === right.dev
    && left.ino === right.ino;
}

function sameStableFileMetadata(left, right) {
  return sameFileIdentity(left, right)
    && left.size === right.size
    && left.nlink === right.nlink
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function assertRegularIndependentFile(metadata, maxBytes, code, label) {
  if (metadata.isSymbolicLink() || !metadata.isFile()) fail(code, `${label} 必须是普通文件。`);
  if (metadata.nlink !== 1n) fail("HARD_LINK_FORBIDDEN", `${label} 不能是 hard-link alias。`);
  if (metadata.size <= 0n || metadata.size > BigInt(maxBytes)) {
    fail("FILE_SIZE_INVALID", `${label} 为空或超过上限。`);
  }
}

async function readBoundedHandle(handle, maxBytes, label) {
  const buffer = Buffer.allocUnsafe(maxBytes + 1);
  let total = 0;
  while (total < buffer.length) {
    const { bytesRead } = await handle.read(buffer, total, buffer.length - total, total);
    if (bytesRead === 0) break;
    total += bytesRead;
  }
  if (total <= 0 || total > maxBytes) fail("FILE_SIZE_INVALID", `${label} 为空或超过上限。`);
  return Buffer.from(buffer.subarray(0, total));
}

async function callTestHook(testHooks, phase) {
  const hook = testHooks?.[phase];
  if (hook === undefined) return;
  if (typeof hook !== "function") fail("TEST_HOOK_INVALID", "测试 hook 无效。");
  await hook();
}

async function readStableWorkspaceFile(rootReal, relativePath, maxBytes, testHooks) {
  validateSafeRelativePath(relativePath);
  const unresolved = path.resolve(rootReal, ...relativePath.split("/"));
  if (!isSameOrWithin(rootReal, unresolved)) fail("PATH_ESCAPE", `${relativePath} 路径越界。`);
  let handle = null;
  try {
    const chainBeforeOpen = await capturePlainDirectoryChain(
      rootReal,
      unresolved,
      "DIRECTORY_CHAIN_INVALID",
      relativePath
    );
    await callTestHook(testHooks, "afterDirectoryChainBeforeOpen");
    const linkBefore = await lstat(unresolved, { bigint: true });
    assertRegularIndependentFile(linkBefore, maxBytes, "FILE_ENDPOINT_INVALID", relativePath);
    const resolvedBefore = await realpath(unresolved);
    if (!isSameOrWithin(rootReal, resolvedBefore)) fail("PATH_ESCAPE", `${relativePath} realpath 越界。`);
    const pathBefore = await lstat(resolvedBefore, { bigint: true });
    assertRegularIndependentFile(pathBefore, maxBytes, "FILE_ENDPOINT_INVALID", relativePath);
    if (!sameFileIdentity(linkBefore, pathBefore)) {
      fail("FILE_CHANGED_DURING_OPEN", `${relativePath} 打开期间身份换绑。`);
    }

    const noFollowFlag = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
    handle = await open(unresolved, fsConstants.O_RDONLY | noFollowFlag);
    const handleBefore = await handle.stat({ bigint: true });
    assertRegularIndependentFile(handleBefore, maxBytes, "FILE_ENDPOINT_INVALID", relativePath);
    if (!sameFileIdentity(pathBefore, handleBefore)) {
      fail("FILE_CHANGED_DURING_OPEN", `${relativePath} 打开期间身份换绑。`);
    }

    const chainAfterOpen = await capturePlainDirectoryChain(
      rootReal,
      unresolved,
      "DIRECTORY_CHAIN_CHANGED",
      relativePath
    );
    const linkAfterOpen = await lstat(unresolved, { bigint: true });
    const resolvedAfterOpen = await realpath(unresolved);
    const pathAfterOpen = await lstat(resolvedAfterOpen, { bigint: true });
    assertRegularIndependentFile(linkAfterOpen, maxBytes, "FILE_ENDPOINT_INVALID", relativePath);
    assertRegularIndependentFile(pathAfterOpen, maxBytes, "FILE_ENDPOINT_INVALID", relativePath);
    if (!sameDirectoryChain(chainBeforeOpen, chainAfterOpen)
      || !isSameResolvedPath(resolvedBefore, resolvedAfterOpen)
      || !sameFileIdentity(handleBefore, linkAfterOpen)
      || !sameFileIdentity(handleBefore, pathAfterOpen)) {
      fail("FILE_CHANGED_DURING_OPEN", `${relativePath} 打开期间端点或目录链变化。`);
    }

    const bytes = await readBoundedHandle(handle, maxBytes, relativePath);
    await callTestHook(testHooks, "afterHeldHandleRead");
    const handleAfter = await handle.stat({ bigint: true });
    const chainAfterRead = await capturePlainDirectoryChain(
      rootReal,
      unresolved,
      "DIRECTORY_CHAIN_CHANGED",
      relativePath
    );
    const linkAfterRead = await lstat(unresolved, { bigint: true });
    const resolvedAfterRead = await realpath(unresolved);
    const pathAfterRead = await lstat(resolvedAfterRead, { bigint: true });
    assertRegularIndependentFile(linkAfterRead, maxBytes, "FILE_ENDPOINT_INVALID", relativePath);
    assertRegularIndependentFile(pathAfterRead, maxBytes, "FILE_ENDPOINT_INVALID", relativePath);
    if (!sameStableFileMetadata(handleBefore, handleAfter)
      || BigInt(bytes.byteLength) !== handleAfter.size
      || !sameDirectoryChain(chainBeforeOpen, chainAfterRead)
      || !isSameResolvedPath(resolvedBefore, resolvedAfterRead)
      || !sameFileIdentity(handleAfter, linkAfterRead)
      || !sameFileIdentity(handleAfter, pathAfterRead)) {
      fail("FILE_CHANGED_DURING_READ", `${relativePath} held-handle 读取期间端点或目录链变化。`);
    }
    await handle.close();
    handle = null;
    return Object.freeze({
      bytes,
      rawBytes: bytes.byteLength,
      rawSha256: createHash("sha256").update(bytes).digest("hex")
    });
  } catch (error) {
    if (handle !== null) {
      try {
        await handle.close();
      } catch {
        // Keep the original path-redacted failure authoritative.
      }
    }
    if (isSafeFailure(error)) throw error;
    fail("FILE_READ_FAILED", `${relativePath} 无法安全读取。`, error);
  }
}

function strictUtf8(bytes, label) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("UTF8_BOM_FORBIDDEN", `${label} 不接受 UTF-8 BOM。`);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

function assertNoDuplicateJsonKeys(source, label) {
  let expression;
  try {
    expression = parseExpression(source, {
      sourceType: "script",
      plugins: []
    });
  } catch (cause) {
    fail("JSON_AST_INVALID", `${label} 无法完成重复键预检。`, cause);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const seen = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty"
        || property.computed
        || property.method
        || property.key?.type !== "StringLiteral") {
        fail("JSON_AST_INVALID", `${label} 含非严格 JSON 对象字段。`);
      }
      const key = property.key.value;
      if (seen.has(key)) fail("JSON_DUPLICATE_KEY", `${label} 含重复 JSON 键。`);
      seen.add(key);
    }
  });
}

function parseJsonBytes(bytes, label) {
  const text = strictUtf8(bytes, label);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不是有效 JSON。`, cause);
  }
  assertNoDuplicateJsonKeys(text, label);
  return capturePassiveJsonSnapshot(parsed);
}

function parseTypeScript(bytes, label) {
  const source = strictUtf8(bytes, label);
  try {
    return Object.freeze({
      source,
      ast: parse(source, {
        sourceType: "module",
        plugins: ["typescript"],
        errorRecovery: false
      })
    });
  } catch (cause) {
    fail("SOURCE_PARSE_FAILED", `${label} 无法按 TypeScript module 解析。`, cause);
  }
}

function unwrapExpression(node) {
  let current = node;
  while (current && [
    "TSAsExpression",
    "TSTypeAssertion",
    "TSNonNullExpression",
    "TypeCastExpression",
    "ParenthesizedExpression"
  ].includes(current.type)) {
    current = current.expression;
  }
  return current;
}

function walkAst(node, visitor) {
  if (!node || typeof node !== "object") return;
  visitor(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "leadingComments", "trailingComments", "innerComments", "extra"].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visitor);
    } else if (value && typeof value === "object" && typeof value.type === "string") {
      walkAst(value, visitor);
    }
  }
}

function findUniqueConst(ast, name) {
  const matches = [];
  walkAst(ast.program, (node) => {
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && node.id.name === name) {
      matches.push(node.init);
    }
  });
  if (matches.length !== 1 || !matches[0]) fail("SOURCE_SHAPE_DRIFT", `${name} 必须精确声明一次。`);
  return unwrapExpression(matches[0]);
}

function findUniqueFunction(ast, name) {
  const matches = [];
  walkAst(ast.program, (node) => {
    if (node.type === "FunctionDeclaration" && node.id?.name === name) matches.push(node);
  });
  if (matches.length !== 1) fail("SOURCE_SHAPE_DRIFT", `${name} 必须精确声明一次。`);
  return matches[0];
}

function unwrapObjectFreeze(node, label) {
  const value = unwrapExpression(node);
  if (value?.type !== "CallExpression"
    || value.arguments.length !== 1
    || value.callee?.type !== "MemberExpression"
    || value.callee.computed
    || value.callee.object?.type !== "Identifier"
    || value.callee.object.name !== "Object"
    || value.callee.property?.type !== "Identifier"
    || value.callee.property.name !== "freeze") {
    fail("SOURCE_SHAPE_DRIFT", `${label} 必须是 Object.freeze(...) 直接声明。`);
  }
  return unwrapExpression(value.arguments[0]);
}

function objectPropertyMap(node, label) {
  const value = unwrapExpression(node);
  if (value?.type !== "ObjectExpression") fail("SOURCE_SHAPE_DRIFT", `${label} 必须是直接对象 literal。`);
  const result = new Map();
  for (const property of value.properties) {
    if (property.type !== "ObjectProperty" || property.computed || property.method) {
      fail("SOURCE_SHAPE_DRIFT", `${label} 不接受 spread、computed 或 method。`);
    }
    const key = property.key?.type === "Identifier"
      ? property.key.name
      : property.key?.type === "StringLiteral"
        ? property.key.value
        : null;
    if (key === null || result.has(key)) fail("SOURCE_SHAPE_DRIFT", `${label} 字段无效或重复。`);
    result.set(key, unwrapExpression(property.value));
  }
  return result;
}

function requireExactKeys(value, expectedKeys, label, code = "CANDIDATE_SCHEMA_INVALID") {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, `${label} 必须是对象。`);
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${label} 字段集合不匹配。`);
}

function requireExactArray(value, label) {
  if (!Array.isArray(value)) fail("PARENT_LEDGER_DRIFT", `${label} 必须是数组。`);
  return value;
}

function requireExactArrayEmpty(value, label, code = "PARENT_AUTHORITY_DRIFT") {
  if (!Array.isArray(value) || value.length !== 0) fail(code, `${label} 必须保持空数组。`);
}

function literalNumber(node, label) {
  const value = unwrapExpression(node);
  if (value?.type !== "NumericLiteral" || !Number.isSafeInteger(value.value)) {
    fail("SOURCE_SHAPE_DRIFT", `${label} 必须是安全整数 literal。`);
  }
  return value.value;
}

function literalString(node, label) {
  const value = unwrapExpression(node);
  if (value?.type !== "StringLiteral") fail("SOURCE_SHAPE_DRIFT", `${label} 必须是字符串 literal。`);
  return value.value;
}

function memberPath(node) {
  const value = unwrapExpression(node);
  if (value?.type === "Identifier") return [value.name];
  if (value?.type !== "MemberExpression" || value.computed) return null;
  const base = memberPath(value.object);
  if (!base || value.property?.type !== "Identifier") return null;
  return [...base, value.property.name];
}

function sameJson(left, right) {
  return canonicalStringifyBaziPolicyWeightsValueEvidenceCandidate(left)
    === canonicalStringifyBaziPolicyWeightsValueEvidenceCandidate(right);
}

function directReturnArgument(statement) {
  if (statement?.type === "ReturnStatement") return unwrapExpression(statement.argument);
  if (statement?.type === "BlockStatement" && statement.body.length === 1
    && statement.body[0]?.type === "ReturnStatement") {
    return unwrapExpression(statement.body[0].argument);
  }
  return null;
}

function matchesGroupEquality(node, expected) {
  const value = unwrapExpression(node);
  if (value?.type !== "BinaryExpression" || value.operator !== "===") return false;
  const pairs = [[value.left, value.right], [value.right, value.left]];
  return pairs.some(([identifier, literal]) =>
    unwrapExpression(identifier)?.type === "Identifier"
    && unwrapExpression(identifier).name === "group"
    && unwrapExpression(literal)?.type === "StringLiteral"
    && unwrapExpression(literal).value === expected
  );
}

function matchesNumberIsIntegerHiddenIndex(node) {
  const value = unwrapExpression(node);
  return value?.type === "CallExpression"
    && sameJson(memberPath(value.callee), ["Number", "isInteger"])
    && value.arguments.length === 1
    && unwrapExpression(value.arguments[0])?.type === "Identifier"
    && unwrapExpression(value.arguments[0]).name === "hiddenStemIndex";
}

function matchesHiddenIndexNegative(node) {
  const value = unwrapExpression(node);
  return value?.type === "BinaryExpression"
    && value.operator === "<"
    && unwrapExpression(value.left)?.type === "Identifier"
    && unwrapExpression(value.left).name === "hiddenStemIndex"
    && unwrapExpression(value.right)?.type === "NumericLiteral"
    && unwrapExpression(value.right).value === 0;
}

function matchesInvalidHiddenIndexGuard(node) {
  const value = unwrapExpression(node);
  if (value?.type !== "LogicalExpression" || value.operator !== "||") return false;
  const pairs = [[value.left, value.right], [value.right, value.left]];
  return pairs.some(([integerSide, negativeSide]) => {
    const unary = unwrapExpression(integerSide);
    return unary?.type === "UnaryExpression"
      && unary.operator === "!"
      && unary.prefix === true
      && matchesNumberIsIntegerHiddenIndex(unary.argument)
      && matchesHiddenIndexNegative(negativeSide);
  });
}

function isDirectThrowStatement(statement) {
  if (statement?.type === "ThrowStatement") return true;
  return statement?.type === "BlockStatement"
    && statement.body.length === 1
    && statement.body[0]?.type === "ThrowStatement";
}

function extractPolicyObservation(policyFile) {
  const { ast } = parseTypeScript(policyFile.bytes, POLICY_RELATIVE_PATH);
  const weightsObject = objectPropertyMap(
    unwrapObjectFreeze(findUniqueConst(ast, "BAZI_STRENGTH_FACTOR_WEIGHTS"), "BAZI_STRENGTH_FACTOR_WEIGHTS"),
    "BAZI_STRENGTH_FACTOR_WEIGHTS"
  );
  if (!sameJson([...weightsObject.keys()], WEIGHT_KEYS)) {
    fail("VALUE_PROJECTION_DRIFT", "BAZI_STRENGTH_FACTOR_WEIGHTS 字段或顺序已漂移。");
  }
  const weights = Object.fromEntries(WEIGHT_KEYS.map((key) => [
    key,
    literalNumber(weightsObject.get(key), `BAZI_STRENGTH_FACTOR_WEIGHTS.${key}`)
  ]));
  if (!sameJson(weights, EXPECTED_WEIGHTS)) {
    fail("VALUE_PROJECTION_DRIFT", "当前政策权重不再是 4/2/2/1 候选。");
  }

  const policyObject = objectPropertyMap(
    unwrapObjectFreeze(findUniqueConst(ast, "BAZI_STRENGTH_POLICY"), "BAZI_STRENGTH_POLICY"),
    "BAZI_STRENGTH_POLICY"
  );
  const factorWeightsRef = unwrapExpression(policyObject.get("factorWeights"));
  if (factorWeightsRef?.type !== "Identifier" || factorWeightsRef.name !== "BAZI_STRENGTH_FACTOR_WEIGHTS") {
    fail("VALUE_PROJECTION_DRIFT", "BAZI_STRENGTH_POLICY.factorWeights 未直接引用权重表。");
  }
  const policyVersion = literalString(policyObject.get("policyVersion"), "BAZI_STRENGTH_POLICY.policyVersion");
  if (policyVersion !== "hakimi.bazi.strength_policy/0.1.0") {
    fail("VALUE_PROJECTION_DRIFT", "政策版本身份已漂移。");
  }

  const dispatcher = findUniqueFunction(ast, "strengthFactorWeight");
  const monthReturns = [];
  const visibleReturns = [];
  const guardStatements = [];
  const topLevelReturns = [];
  const dispatcherStatements = dispatcher.body.body;
  for (const statement of dispatcherStatements) {
    if (statement.type === "IfStatement"
      && statement.alternate === null
      && matchesGroupEquality(statement.test, "month_command")) {
      monthReturns.push(directReturnArgument(statement.consequent));
    } else if (statement.type === "IfStatement"
      && statement.alternate === null
      && matchesGroupEquality(statement.test, "visible_stem")) {
      visibleReturns.push(directReturnArgument(statement.consequent));
    } else if (statement.type === "IfStatement"
      && statement.alternate === null
      && matchesInvalidHiddenIndexGuard(statement.test)
      && isDirectThrowStatement(statement.consequent)) {
      guardStatements.push(statement);
    } else if (statement.type === "ReturnStatement") {
      topLevelReturns.push(unwrapExpression(statement.argument));
    }
  }
  if (dispatcherStatements.length !== 4
    || monthReturns.length !== 1
    || visibleReturns.length !== 1
    || !sameJson(memberPath(monthReturns[0]), ["BAZI_STRENGTH_POLICY", "factorWeights", "monthCommand"])
    || !sameJson(memberPath(visibleReturns[0]), ["BAZI_STRENGTH_POLICY", "factorWeights", "visibleStem"])
    || guardStatements.length !== 1
    || topLevelReturns.length !== 1
    || !matchesGroupEquality(dispatcherStatements[0]?.test, "month_command")
    || !matchesGroupEquality(dispatcherStatements[1]?.test, "visible_stem")
    || guardStatements[0] !== dispatcherStatements[2]
    || dispatcherStatements[3]?.type !== "ReturnStatement") {
    fail("DISPATCH_PROJECTION_DRIFT", "strengthFactorWeight 直接 dispatch 或失败关闭结构已漂移。");
  }
  const hiddenReturn = topLevelReturns[0];
  if (hiddenReturn?.type !== "ConditionalExpression"
    || !matchesHiddenIndexZero(hiddenReturn.test)
    || !sameJson(memberPath(hiddenReturn.consequent), ["BAZI_STRENGTH_POLICY", "factorWeights", "firstHiddenStem"])
    || !sameJson(memberPath(hiddenReturn.alternate), ["BAZI_STRENGTH_POLICY", "factorWeights", "otherHiddenStem"])) {
    fail("DISPATCH_PROJECTION_DRIFT", "藏干索引 dispatch 结构已漂移。");
  }

  return Object.freeze({
    policyVersion,
    weights: deepFreezeJson(weights),
    dispatch: deepFreezeJson({
      monthCommand: "monthCommand",
      visibleStem: "visibleStem",
      hiddenIndexZero: "firstHiddenStem",
      hiddenOtherIndex: "otherHiddenStem"
    }),
    invalidHiddenIndexRejected: true
  });
}

function matchesHiddenIndexZero(node) {
  const value = unwrapExpression(node);
  if (value?.type !== "BinaryExpression" || value.operator !== "===") return false;
  const pairs = [[value.left, value.right], [value.right, value.left]];
  return pairs.some(([identifier, literal]) =>
    unwrapExpression(identifier)?.type === "Identifier"
    && unwrapExpression(identifier).name === "hiddenStemIndex"
    && unwrapExpression(literal)?.type === "NumericLiteral"
    && unwrapExpression(literal).value === 0
  );
}

function extractConsumerObservation(coreFile) {
  const { source, ast } = parseTypeScript(coreFile.bytes, CORE_RELATIVE_PATH);
  const matchingImports = [];
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration" || statement.source?.value !== "./strength-policy") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier"
        && specifier.imported?.type === "Identifier"
        && specifier.imported.name === "strengthFactorWeight"
        && specifier.local?.type === "Identifier"
        && specifier.local.name === "strengthFactorWeight") {
        matchingImports.push(specifier);
      }
    }
  }
  if (matchingImports.length !== 1) {
    fail("CONSUMER_PROJECTION_DRIFT", "strength-assessment-core 必须精确导入一次 strengthFactorWeight。");
  }
  const collector = findUniqueFunction(ast, "collectBaziStrengthFactors");
  if (!Number.isInteger(collector.start)
    || !Number.isInteger(collector.end)
    || collector.start < 0
    || collector.end <= collector.start
    || createHash("sha256")
      .update(source.slice(collector.start, collector.end), "utf8")
      .digest("hex") !== EXPECTED_COLLECTOR_SOURCE_SHA256) {
    fail("CONSUMER_PROJECTION_DRIFT", "collectBaziStrengthFactors 当前函数字节身份已漂移。");
  }
  const addFactorCalls = [];
  const allWeightCalls = [];
  walkAst(collector.body, (node) => {
    const value = unwrapExpression(node);
    if (value?.type !== "CallExpression" || unwrapExpression(value.callee)?.type !== "Identifier") return;
    if (unwrapExpression(value.callee).name === "addFactor") addFactorCalls.push(value);
    if (unwrapExpression(value.callee).name === "strengthFactorWeight") allWeightCalls.push(value);
  });
  if (addFactorCalls.length !== 3 || allWeightCalls.length !== 3) {
    fail("CONSUMER_PROJECTION_DRIFT", "collectBaziStrengthFactors 必须精确保留三个 addFactor 权重消费点。");
  }
  const boundWeightCalls = [];
  const calls = addFactorCalls.map((addFactorCall) => {
    if (addFactorCall.arguments.length !== 2
      || unwrapExpression(addFactorCall.arguments[0])?.type !== "Identifier"
      || unwrapExpression(addFactorCall.arguments[0]).name !== "factors") {
      fail("CONSUMER_PROJECTION_DRIFT", "addFactor 必须直接写入本函数 factors 集合。");
    }
    const factorObject = unwrapExpression(addFactorCall.arguments[1]);
    const properties = objectPropertyMap(factorObject, "collectBaziStrengthFactors addFactor payload");
    const weightCall = unwrapExpression(properties.get("weight"));
    if (weightCall?.type !== "CallExpression"
      || unwrapExpression(weightCall.callee)?.type !== "Identifier"
      || unwrapExpression(weightCall.callee).name !== "strengthFactorWeight") {
      fail("CONSUMER_PROJECTION_DRIFT", "每个 addFactor 的 weight 必须直接消费 strengthFactorWeight。");
    }
    boundWeightCalls.push(weightCall);
    const group = weightCall.arguments[0]?.type === "StringLiteral"
      ? weightCall.arguments[0].value
      : null;
    if (group === "month_command" && weightCall.arguments.length === 1) return "month_command";
    if (group === "visible_stem" && weightCall.arguments.length === 1) return "visible_stem";
    if (group === "hidden_stem"
      && weightCall.arguments.length === 2
      && unwrapExpression(weightCall.arguments[1])?.type === "Identifier"
      && unwrapExpression(weightCall.arguments[1]).name === "index") return "hidden_stem_with_index";
    return "unrecognized_call_shape";
  });
  if (boundWeightCalls.some((node, index) => node !== allWeightCalls[index])) {
    fail("CONSUMER_PROJECTION_DRIFT", "strengthFactorWeight 不得作为脱离 addFactor.weight 的死调用存在。");
  }
  const expectedCalls = ["month_command", "visible_stem", "hidden_stem_with_index"];
  if (!sameJson(calls, expectedCalls)) {
    fail("CONSUMER_PROJECTION_DRIFT", "collectBaziStrengthFactors 的权重消费调用已漂移。");
  }
  return Object.freeze({ consumerCalls: Object.freeze(calls) });
}

function uniqueEntry(entries, field, value, label) {
  const matches = requireExactArray(entries, label).filter((entry) => entry?.[field] === value);
  if (matches.length !== 1) fail("PARENT_LEDGER_DRIFT", `${label} 未精确命中 ${value}。`);
  return matches[0];
}

function validateParentLedgers({ engineeringLedger, gapLedger, freezeLedger, policyFile, policy, consumer }) {
  requireExactKeys(engineeringLedger, [
    "schemaVersion", "recordType", "ledgerId", "status", "createdAt", "releaseGovernance",
    "candidates", "gateSummary", "evidenceLedger", "doesNotEstablish", "ledgerDigest"
  ], "engineering candidate parent", "PARENT_LEDGER_DRIFT");
  requireExactKeys(gapLedger, [
    "schemaVersion", "recordType", "ledgerId", "status", "createdAt", "releaseGovernance",
    "scopeBoundary", "observationBoundary", "currentBindingInventory", "basisArtifacts",
    "valueSubjectBoundary", "engineeringBindings", "crossBindingGaps", "gateSummary",
    "evidenceLedger", "doesNotEstablish", "ledgerDigest"
  ], "value-subject gap parent", "PARENT_LEDGER_DRIFT");
  requireExactKeys(freezeLedger, [
    "schemaVersion", "recordType", "ledgerId", "status", "createdAt", "releaseGovernance",
    "defaultClosureRequirements", "basisArtifacts", "bindings", "gateSummary", "evidenceLedger",
    "doesNotEstablish", "ledgerDigest"
  ], "freeze requirements parent", "PARENT_LEDGER_DRIFT");
  if (engineeringLedger.ledgerDigest !== computeEngineeringBindingCandidateLedgerDigest(engineeringLedger)
    || gapLedger.ledgerDigest !== computeBaziEngineeringBindingValueSubjectGapDigest(gapLedger)
    || freezeLedger.ledgerDigest !== computeBaziBindingFreezeRequirementsDigest(freezeLedger)) {
    fail("PARENT_DIGEST_DRIFT", "父账自摘要与 held-buffer 内容不一致。");
  }
  if (!sameJson(engineeringLedger.releaseGovernance, PARENT_RELEASE_GOVERNANCE)
    || !sameJson(gapLedger.releaseGovernance, PARENT_RELEASE_GOVERNANCE)
    || !sameJson(freezeLedger.releaseGovernance, PARENT_RELEASE_GOVERNANCE)
    || gapLedger.currentBindingInventory?.bindingFrozenVerified !== 0) {
    fail("PARENT_RELEASE_DRIFT", "value-subject gap 的 legacy-v13 或未冻结边界已漂移。");
  }
  const engineering = uniqueEntry(
    engineeringLedger.candidates,
    "bindingId",
    "binding:policy:weights",
    "engineering candidate ledger"
  );
  const gap = uniqueEntry(
    gapLedger.engineeringBindings,
    "bindingId",
    "binding:policy:weights",
    "value-subject gap ledger"
  );
  const freeze = uniqueEntry(
    freezeLedger.bindings,
    "bindingId",
    "binding:policy:weights",
    "freeze requirements ledger"
  );
  requireExactKeys(engineering, [
    "candidateId", "bindingId", "evidenceSubjectId", "order", "sourceId", "originType",
    "evidenceRole", "authorityBoundary", "registryLocator", "artifactLocks", "consumerClaimIds",
    "definitionSummary", "rationaleDraft", "forbiddenClaims", "repositoryStorageObservation",
    "rightsState", "reviewState", "authorityClaims", "candidateDigest"
  ], "engineering policy-weights candidate", "PARENT_LEDGER_DRIFT");
  requireExactKeys(engineering.reviewState, [
    "engineeringReviewIds", "independentDomainReviewIds", "engineeringRationaleFrozen",
    "bindingFreezeAuthorized", "bindingFreezeEffect"
  ], "engineering policy-weights reviewState", "PARENT_AUTHORITY_DRIFT");
  requireExactKeys(engineering.rightsState, [
    "repositoryProvenanceObserved", "firstPartyAuthorshipLegallyEstablished",
    "formalSourceRightsRecordId", "legalReviewVerified", "redistributionClearanceEstablished",
    "distributionBoundary"
  ], "engineering policy-weights rightsState", "PARENT_AUTHORITY_DRIFT");
  requireExactKeys(engineering.authorityClaims, [
    "classicalAuthorityClaimed", "expertAuthorityClaimed", "scientificValidityClaimed",
    "predictiveValidityClaimed"
  ], "engineering policy-weights authorityClaims", "PARENT_AUTHORITY_DRIFT");
  requireExactKeys(gap, [
    "order", "bindingId", "evidenceSubjectId", "candidateId", "originType", "authorityBoundary",
    "artifactLocks", "valueSubjects", "valueSubjectCount", "ruleIds", "evidenceSubjectAlgorithmIds",
    "evidenceSubjectFieldPaths", "evidenceSubjectRuleProfilePaths", "valueSubjectCoverageComplete",
    "engineeringRationaleFrozen", "firstPartyAuthorshipLegallyEstablished",
    "independentEngineeringReviewIds", "independentDomainReviewIds", "bindingFreezeEligible",
    "freezeState", "freezeEffect"
  ], "policy-weights value-subject gap", "PARENT_LEDGER_DRIFT");
  requireExactKeys(freeze, [
    "bindingId", "evidenceSubjectId", "order", "sourceId", "sourceType", "evidenceRole",
    "registryLocatorKind", "registryLocatorVerification", "freezeEvidenceMode", "authorityBoundary",
    "candidateState", "candidateIds", "candidateQuoteDigestCount", "currentDistributionBoundary",
    "freezeState", "sourceBodyStored", "sourceBodyDigest", "exactQuoteTextStored", "exactQuoteDigest",
    "exactLocatorEstablishedForFreeze", "workIdentityFrozen", "editionIdentityFrozen",
    "carrierIdentityFrozen", "engineeringRationaleFrozen", "ruleIds", "workRightsEvidenceBound",
    "editionRightsEvidenceBound", "carrierRightsEvidenceBound", "sourceRightsRecordId",
    "sourceCarrierRecordId", "formalDistributionPolicy", "independentSourceRightsReviewerIds",
    "independentDomainReviewIds", "traditionalAuthorityClaimed", "parameterAuthorityClaimed",
    "frozenAt", "supersedes", "supersededBy", "bindingDigest"
  ], "policy-weights freeze requirement", "PARENT_LEDGER_DRIFT");
  for (const entry of [engineering, gap, freeze]) {
    if (entry.evidenceSubjectId !== "bazi.strength.binding.policy.weights.v1") {
      fail("PARENT_IDENTITY_DRIFT", "policy weights evidenceSubjectId 已漂移。");
    }
  }
  if (engineering.candidateId !== "hakimi-strength-weights-0.1.0-engineering-candidate-v1"
    || engineering.sourceId !== "hakimi-strength-policy-0.1.0"
    || engineering.originType !== "project_engineering_heuristic"
    || engineering.authorityBoundary !== "engineering_definition_only_no_classical_or_expert_authority"
    || engineering.reviewState?.engineeringRationaleFrozen !== false
    || engineering.reviewState?.bindingFreezeAuthorized !== false
    || engineering.reviewState?.bindingFreezeEffect !== "none"
    || engineering.rightsState?.formalSourceRightsRecordId !== null
    || engineering.rightsState?.legalReviewVerified !== false
    || engineering.rightsState?.redistributionClearanceEstablished !== false
    || engineering.rightsState?.firstPartyAuthorshipLegallyEstablished !== false
    || engineering.authorityClaims?.classicalAuthorityClaimed !== false
    || engineering.authorityClaims?.expertAuthorityClaimed !== false
    || engineering.authorityClaims?.scientificValidityClaimed !== false
    || engineering.authorityClaims?.predictiveValidityClaimed !== false) {
    fail("PARENT_AUTHORITY_DRIFT", "engineering candidate 不再保持无来源／专家／冻结提权状态。");
  }
  requireExactArrayEmpty(engineering.reviewState?.engineeringReviewIds, "engineeringReviewIds");
  requireExactArrayEmpty(engineering.reviewState?.independentDomainReviewIds, "independentDomainReviewIds");
  const lock = uniqueEntry(engineering.artifactLocks, "path", POLICY_RELATIVE_PATH, "engineering artifactLocks");
  if (lock.bytes !== policyFile.rawBytes
    || lock.sha256 !== policyFile.rawSha256
    || !sameJson(lock.stableSymbols, ["BAZI_STRENGTH_FACTOR_WEIGHTS", "strengthFactorWeight"])) {
    fail("PARENT_ARTIFACT_LOCK_DRIFT", "engineering candidate 的 policy artifact lock 与 held-handle 字节不一致。");
  }

  if (gap.candidateId !== engineering.candidateId
    || gap.originType !== engineering.originType
    || gap.authorityBoundary !== engineering.authorityBoundary
    || gap.valueSubjectCount !== 3
    || gap.valueSubjectCoverageComplete !== false
    || gap.engineeringRationaleFrozen !== false
    || gap.firstPartyAuthorshipLegallyEstablished !== false
    || gap.bindingFreezeEligible !== false
    || gap.freezeState !== "candidate_only_unbound"
    || gap.freezeEffect !== "none") {
    fail("PARENT_AUTHORITY_DRIFT", "value-subject gap 中 policy weights 候选边界已提权或漂移。");
  }
  for (const field of [
    "ruleIds",
    "evidenceSubjectAlgorithmIds",
    "evidenceSubjectFieldPaths",
    "evidenceSubjectRuleProfilePaths",
    "independentEngineeringReviewIds",
    "independentDomainReviewIds"
  ]) requireExactArrayEmpty(gap[field], `value-subject gap.${field}`);

  const parentValueSubjects = requireExactArray(gap.valueSubjects, "valueSubjects");
  if (parentValueSubjects.length !== 3) {
    fail("PARENT_VALUE_SUBJECT_DRIFT", "policy weights 必须保持精确三项 value-subject，且不得重复。");
  }
  const subjectById = new Map(parentValueSubjects.map((entry) => [
    entry.valueSubjectId,
    entry
  ]));
  if (subjectById.size !== 3 || !sameJson([...subjectById.keys()], EXPECTED_VALUE_SUBJECT_IDS)) {
    fail("PARENT_VALUE_SUBJECT_DRIFT", "policy weights 三项 value-subject 身份或顺序已漂移。");
  }
  const expectedProjections = new Map([
    [EXPECTED_VALUE_SUBJECT_IDS[0], policy.weights],
    [EXPECTED_VALUE_SUBJECT_IDS[1], policy.dispatch],
    [EXPECTED_VALUE_SUBJECT_IDS[2], {
      invalidHiddenIndexRejected: policy.invalidHiddenIndexRejected,
      consumerCalls: consumer.consumerCalls
    }]
  ]);
  for (const [index, subjectId] of EXPECTED_VALUE_SUBJECT_IDS.entries()) {
    const subject = subjectById.get(subjectId);
    const projection = expectedProjections.get(subjectId);
    const expectedMetadata = EXPECTED_VALUE_SUBJECT_METADATA[index];
    requireExactKeys(subject, [
      "valueSubjectId", "kind", "repositoryProjection", "projectionDigest", "observationState",
      "producerRefs", "consumerRefs", "syntaxProjectionMechanicallyObserved",
      "generalControlFlowEquivalenceMechanicallyEstablished",
      "generalDataFlowEquivalenceMechanicallyEstablished", "runtimeExecutionObserved",
      "sourceOrRationaleRefs", "valueProvenanceFrozen", "independentDomainReviewed", "freezeEffect"
    ], `value-subject gap.${subjectId}`, "PARENT_LEDGER_DRIFT");
    if (subject?.kind !== expectedMetadata.kind
      || subject?.observationState !== expectedMetadata.observationState
      || !sameJson(subject?.producerRefs, expectedMetadata.producerRefs)
      || !sameJson(subject?.consumerRefs, expectedMetadata.consumerRefs)
      || !sameJson(subject?.repositoryProjection, projection)
      || subject?.projectionDigest !== plainValueDigest(projection)
      || subject?.syntaxProjectionMechanicallyObserved !== true
      || subject?.generalControlFlowEquivalenceMechanicallyEstablished !== false
      || subject?.generalDataFlowEquivalenceMechanicallyEstablished !== false
      || subject?.runtimeExecutionObserved !== false
      || subject?.valueProvenanceFrozen !== false
      || subject?.independentDomainReviewed !== false
      || subject?.freezeEffect !== "none") {
      fail("PARENT_VALUE_SUBJECT_DRIFT", `${subjectId} 与当前源码投影或失败关闭边界不一致。`);
    }
    requireExactArrayEmpty(subject.sourceOrRationaleRefs, `${subjectId}.sourceOrRationaleRefs`);
  }

  if (freeze.order !== 4
    || freeze.sourceId !== "hakimi-strength-policy-0.1.0"
    || freeze.sourceType !== "engineering_contract"
    || freeze.evidenceRole !== "defines_engineering_candidate"
    || freeze.registryLocatorKind !== "stable_symbol"
    || freeze.registryLocatorVerification !== "verified"
    || freeze.freezeEvidenceMode !== "engineering_definition_and_rationale"
    || freeze.authorityBoundary !== "engineering_definition_only_must_not_be_claimed_as_ancient_text"
    || freeze.candidateState !== "project_engineering_candidate_envelope"
    || !sameJson(freeze.candidateIds, ["hakimi-strength-weights-0.1.0-engineering-candidate-v1"])
    || freeze.candidateQuoteDigestCount !== 0
    || freeze.currentDistributionBoundary !== "local_repository_only_no_distribution_clearance"
    || freeze.freezeState !== "candidate_only_unbound"
    || freeze.sourceBodyStored !== false
    || freeze.sourceBodyDigest !== null
    || freeze.exactQuoteTextStored !== false
    || freeze.exactQuoteDigest !== null
    || freeze.exactLocatorEstablishedForFreeze !== false
    || freeze.workIdentityFrozen !== false
    || freeze.editionIdentityFrozen !== false
    || freeze.carrierIdentityFrozen !== false
    || freeze.engineeringRationaleFrozen !== false
    || freeze.sourceRightsRecordId !== null
    || freeze.sourceCarrierRecordId !== null
    || freeze.workRightsEvidenceBound !== false
    || freeze.editionRightsEvidenceBound !== false
    || freeze.carrierRightsEvidenceBound !== false
    || freeze.traditionalAuthorityClaimed !== false
    || freeze.parameterAuthorityClaimed !== false
    || freeze.formalDistributionPolicy !== null
    || freeze.bindingDigest !== null
    || freeze.frozenAt !== null
    || freeze.supersedes !== null
    || freeze.supersededBy !== null) {
    fail("PARENT_AUTHORITY_DRIFT", "freeze requirements 中 policy weights 的工程候选、分发或无权利／载体／专家／冻结边界已漂移。");
  }
  for (const field of ["ruleIds", "independentSourceRightsReviewerIds", "independentDomainReviewIds"]) {
    requireExactArrayEmpty(freeze[field], `freeze requirements.${field}`);
  }

  if (engineeringLedger.ledgerDigest !== EXPECTED_PARENT_LEDGER_DIGESTS.engineering
    || gapLedger.ledgerDigest !== EXPECTED_PARENT_LEDGER_DIGESTS.valueSubjectGap
    || freezeLedger.ledgerDigest !== EXPECTED_PARENT_LEDGER_DIGESTS.freezeRequirements) {
    fail("PARENT_DIGEST_DRIFT", "三项父账必须保持本候选 v1 固定的完整内容摘要；任何重签都需要新候选版本与重新审查。");
  }

  return Object.freeze({ engineering, gap, freeze, subjectById });
}

function evidenceRecordFromParent(subject) {
  return deepFreezeJson({
    valueSubjectId: subject.valueSubjectId,
    kind: subject.kind,
    repositoryProjection: capturePassiveJsonSnapshot(subject.repositoryProjection),
    projectionDigest: subject.projectionDigest,
    observationState: subject.observationState,
    producerRefs: [...subject.producerRefs],
    consumerRefs: [...subject.consumerRefs],
    sourceOrRationaleRefs: [],
    syntaxProjectionMechanicallyObserved: true,
    generalControlFlowEquivalenceMechanicallyEstablished: false,
    generalDataFlowEquivalenceMechanicallyEstablished: false,
    runtimeExecutionObserved: false,
    valueProvenanceFrozen: false,
    independentDomainReviewed: false,
    freezeEffect: "none"
  });
}

function artifactProjection(definition, file) {
  return Object.freeze({
    path: definition.path,
    role: definition.role,
    bytes: file.rawBytes,
    sha256: file.rawSha256,
    heldFileHandleRead: true,
    hashAndInspectionUseSameBuffer: true
  });
}

export async function buildCurrentBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, options = {}) {
  const rootReal = await resolveOrdinaryRoot(workspaceRoot);
  const testHooksByPath = options.testHooksByPath;
  const files = await Promise.all(BASIS_DEFINITIONS.map((definition) => readStableWorkspaceFile(
    rootReal,
    definition.path,
    definition.maxBytes,
    testHooksByPath?.[definition.path]
  )));
  const fileByPath = new Map(BASIS_DEFINITIONS.map((definition, index) => [definition.path, files[index]]));
  const engineeringLedger = parseJsonBytes(
    fileByPath.get(ENGINEERING_LEDGER_RELATIVE_PATH).bytes,
    ENGINEERING_LEDGER_RELATIVE_PATH
  );
  const gapLedger = parseJsonBytes(
    fileByPath.get(VALUE_SUBJECT_GAP_RELATIVE_PATH).bytes,
    VALUE_SUBJECT_GAP_RELATIVE_PATH
  );
  const freezeLedger = parseJsonBytes(
    fileByPath.get(FREEZE_REQUIREMENTS_RELATIVE_PATH).bytes,
    FREEZE_REQUIREMENTS_RELATIVE_PATH
  );
  const policy = extractPolicyObservation(fileByPath.get(POLICY_RELATIVE_PATH));
  const consumer = extractConsumerObservation(fileByPath.get(CORE_RELATIVE_PATH));
  const parents = validateParentLedgers({
    engineeringLedger,
    gapLedger,
    freezeLedger,
    policyFile: fileByPath.get(POLICY_RELATIVE_PATH),
    policy,
    consumer
  });

  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_policy_weights_value_evidence_candidate_v1",
    candidateId: "hakimi.bazi/policy-weights-value-evidence-candidate/1.0.0",
    status: "candidate_only_current_repository_values_observed_not_freeze_eligible",
    createdAt: CANDIDATE_CREATED_AT,
    releaseGovernance: { ...RELEASE_GOVERNANCE },
    scopeBoundary: {
      phase: "C_source_rights_and_binding_governance",
      childScope: "binding_policy_weights_three_value_subjects_only",
      candidateOnly: true,
      newBindingIdentityCreated: false,
      formalEvidenceSubjectRegistrationPerformed: false,
      domainManifestIntegrated: false,
      centralRegistryIntegrated: false,
      parentLedgerResigned: false,
      formalLifecycleIntegrationAssessed: false
    },
    observationBoundary: {
      heldFileHandleReads: true,
      pathAndDirectoryChainRevalidated: true,
      perFileHashParseAndAstInspectionUseSameBuffer: true,
      candidateJsonParseUsesHeldHandleBuffer: true,
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false,
      stableExecutableSyntaxProjectionObserved: true,
      generalControlFlowEquivalenceMechanicallyEstablished: false,
      generalDataFlowEquivalenceMechanicallyEstablished: false,
      runtimeExecutionObserved: false
    },
    policyBinding: {
      bindingId: "binding:policy:weights",
      evidenceSubjectId: "bazi.strength.binding.policy.weights.v1",
      engineeringCandidateId: "hakimi-strength-weights-0.1.0-engineering-candidate-v1",
      sourceId: "hakimi-strength-policy-0.1.0",
      policyVersion: policy.policyVersion,
      order: 4,
      originType: "project_engineering_heuristic",
      authorityBoundary: "engineering_definition_only_no_classical_or_expert_authority",
      valueSubjectIds: [...EXPECTED_VALUE_SUBJECT_IDS]
    },
    basisArtifacts: BASIS_DEFINITIONS.map((definition) => artifactProjection(
      definition,
      fileByPath.get(definition.path)
    )),
    parentLedgerRefs: {
      engineeringCandidateLedgerId: engineeringLedger.ledgerId,
      engineeringCandidateLedgerDigest: engineeringLedger.ledgerDigest,
      valueSubjectGapLedgerId: gapLedger.ledgerId,
      valueSubjectGapLedgerDigest: gapLedger.ledgerDigest,
      freezeRequirementsLedgerId: freezeLedger.ledgerId,
      freezeRequirementsLedgerDigest: freezeLedger.ledgerDigest,
      parentLedgersResigned: false
    },
    valueEvidenceRecords: EXPECTED_VALUE_SUBJECT_IDS.map((subjectId) =>
      evidenceRecordFromParent(parents.subjectById.get(subjectId))
    ),
    externalEvidence: {
      sourceEvidenceRefs: [],
      sourceRightsRecordId: null,
      sourceCarrierRecordId: null,
      engineeringRationaleRecordId: null,
      engineeringReviewIds: [],
      expertReviewIds: [],
      independentDomainReviewIds: []
    },
    authorityBoundary: { ...AUTHORITY_BOUNDARY },
    gateSummary: {
      currentPolicyWeightValuesObserved: 4,
      scopedValueSubjectsObserved: 3,
      stablePolicyDispatchSyntaxObserved: true,
      directConsumerCallShapesObserved: 3,
      sourceEvidenceRefsBound: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      engineeringRationalesFrozen: 0,
      engineeringReviewsVerified: 0,
      expertReviewsVerified: 0,
      independentDomainReviewsVerified: 0,
      bindingFreezeEligible: false,
      bindingFrozenVerified: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      formalActivationAllowed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false
    },
    digestBoundary: {
      algorithm: "SHA-256",
      domain: CANDIDATE_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH]
  };
  const candidate = {
    ...unsigned,
    candidateDigest: domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned)
  };
  validateCandidateBoundary(candidate);
  return deepFreezeJson(candidate);
}

function requireCanonicalUtc(value, label) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) {
    fail("CANDIDATE_SCHEMA_INVALID", `${label} 必须是 canonical UTC。`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    fail("CANDIDATE_SCHEMA_INVALID", `${label} 必须是 canonical UTC。`);
  }
}

function validateCandidateBoundary(candidate) {
  requireExactKeys(candidate, [
    "schemaVersion",
    "recordType",
    "candidateId",
    "status",
    "createdAt",
    "releaseGovernance",
    "scopeBoundary",
    "observationBoundary",
    "policyBinding",
    "basisArtifacts",
    "parentLedgerRefs",
    "valueEvidenceRecords",
    "externalEvidence",
    "authorityBoundary",
    "gateSummary",
    "digestBoundary",
    "doesNotEstablish",
    "candidateDigest"
  ], "policy weights value evidence candidate");
  requireCanonicalUtc(candidate.createdAt, "candidate.createdAt");
  if (candidate.schemaVersion !== "1.0.0"
    || candidate.recordType !== "bazi_policy_weights_value_evidence_candidate_v1"
    || candidate.candidateId !== "hakimi.bazi/policy-weights-value-evidence-candidate/1.0.0"
    || candidate.status !== "candidate_only_current_repository_values_observed_not_freeze_eligible"
    || candidate.createdAt !== CANDIDATE_CREATED_AT) {
    fail("CANDIDATE_SCHEMA_INVALID", "candidate 核心身份已漂移。");
  }
  if (!sameJson(candidate.releaseGovernance, RELEASE_GOVERNANCE)) {
    fail("RELEASE_AUTHORITY_PROMOTION", "candidate 必须保持 legacy-v13 / targetSchema 13 / migrationId null。");
  }
  requireExactKeys(candidate.scopeBoundary, [
    "phase",
    "childScope",
    "candidateOnly",
    "newBindingIdentityCreated",
    "formalEvidenceSubjectRegistrationPerformed",
    "domainManifestIntegrated",
    "centralRegistryIntegrated",
    "parentLedgerResigned",
    "formalLifecycleIntegrationAssessed"
  ], "scopeBoundary");
  if (!sameJson(candidate.scopeBoundary, SCOPE_BOUNDARY)) {
    fail("CANDIDATE_SCHEMA_INVALID", "candidate scopeBoundary 必须保持精确候选态。" );
  }
  requireExactKeys(candidate.observationBoundary, [
    "heldFileHandleReads",
    "pathAndDirectoryChainRevalidated",
    "perFileHashParseAndAstInspectionUseSameBuffer",
    "candidateJsonParseUsesHeldHandleBuffer",
    "endpointSnapshotOnly",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailableForSchema13",
    "mutationEpochReceipt",
    "intervalMutationExcluded",
    "abaExcluded",
    "stableExecutableSyntaxProjectionObserved",
    "generalControlFlowEquivalenceMechanicallyEstablished",
    "generalDataFlowEquivalenceMechanicallyEstablished",
    "runtimeExecutionObserved"
  ], "observationBoundary");
  if (!sameJson(candidate.observationBoundary, OBSERVATION_BOUNDARY)) {
    fail("OBSERVATION_PROMOTION_FORBIDDEN", "candidate observationBoundary 不得提权或漂移。" );
  }
  requireExactKeys(candidate.policyBinding, [
    "bindingId",
    "evidenceSubjectId",
    "engineeringCandidateId",
    "sourceId",
    "policyVersion",
    "order",
    "originType",
    "authorityBoundary",
    "valueSubjectIds"
  ], "policyBinding");
  if (!sameJson(candidate.policyBinding, POLICY_BINDING)) {
    fail("CANDIDATE_SCHEMA_INVALID", "candidate policyBinding 身份或权威边界已漂移。" );
  }
  if (!Array.isArray(candidate.basisArtifacts) || candidate.basisArtifacts.length !== BASIS_DEFINITIONS.length) {
    fail("CANDIDATE_SCHEMA_INVALID", "basisArtifacts 必须保持精确五项。");
  }
  for (const [index, artifact] of candidate.basisArtifacts.entries()) {
    requireExactKeys(artifact, [
      "path",
      "role",
      "bytes",
      "sha256",
      "heldFileHandleRead",
      "hashAndInspectionUseSameBuffer"
    ], `basisArtifacts[${index}]`);
    const definition = BASIS_DEFINITIONS[index];
    if (artifact.path !== definition.path
      || artifact.role !== definition.role
      || artifact.bytes !== definition.expectedBytes
      || artifact.sha256 !== definition.expectedSha256
      || artifact.heldFileHandleRead !== true
      || artifact.hashAndInspectionUseSameBuffer !== true) {
      fail("CANDIDATE_SCHEMA_INVALID", `basisArtifacts[${index}] 的身份或 held-buffer 边界已漂移。`);
    }
  }
  requireExactKeys(candidate.parentLedgerRefs, [
    "engineeringCandidateLedgerId",
    "engineeringCandidateLedgerDigest",
    "valueSubjectGapLedgerId",
    "valueSubjectGapLedgerDigest",
    "freezeRequirementsLedgerId",
    "freezeRequirementsLedgerDigest",
    "parentLedgersResigned"
  ], "parentLedgerRefs");
  if (candidate.parentLedgerRefs.engineeringCandidateLedgerId
      !== "hakimi.bazi.strength.engineering-binding-candidates/1.0.0"
    || candidate.parentLedgerRefs.valueSubjectGapLedgerId
      !== "hakimi.bazi.engineering_binding_value_subject_gaps/1.0.0"
    || candidate.parentLedgerRefs.freezeRequirementsLedgerId
      !== "hakimi.bazi.strength.binding-freeze-readiness/1.5.0"
    || candidate.parentLedgerRefs.engineeringCandidateLedgerDigest
      !== EXPECTED_PARENT_LEDGER_DIGESTS.engineering
    || candidate.parentLedgerRefs.valueSubjectGapLedgerDigest
      !== EXPECTED_PARENT_LEDGER_DIGESTS.valueSubjectGap
    || candidate.parentLedgerRefs.freezeRequirementsLedgerDigest
      !== EXPECTED_PARENT_LEDGER_DIGESTS.freezeRequirements
    || candidate.parentLedgerRefs.parentLedgersResigned !== false) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "parentLedgerRefs 不得伪造父账身份、摘要或重签状态。" );
  }
  if (!Array.isArray(candidate.valueEvidenceRecords) || candidate.valueEvidenceRecords.length !== 3) {
    fail("CANDIDATE_SCHEMA_INVALID", "valueEvidenceRecords 必须保持精确三项。");
  }
  for (const [index, record] of candidate.valueEvidenceRecords.entries()) {
    requireExactKeys(record, [
      "valueSubjectId",
      "kind",
      "repositoryProjection",
      "projectionDigest",
      "observationState",
      "producerRefs",
      "consumerRefs",
      "sourceOrRationaleRefs",
      "syntaxProjectionMechanicallyObserved",
      "generalControlFlowEquivalenceMechanicallyEstablished",
      "generalDataFlowEquivalenceMechanicallyEstablished",
      "runtimeExecutionObserved",
      "valueProvenanceFrozen",
      "independentDomainReviewed",
      "freezeEffect"
    ], `valueEvidenceRecords[${index}]`);
    const expectedMetadata = EXPECTED_VALUE_SUBJECT_METADATA[index];
    if (record.valueSubjectId !== expectedMetadata.valueSubjectId
      || record.kind !== expectedMetadata.kind
      || record.observationState !== expectedMetadata.observationState
      || !sameJson(record.producerRefs, expectedMetadata.producerRefs)
      || !sameJson(record.consumerRefs, expectedMetadata.consumerRefs)
      || !sameJson(record.sourceOrRationaleRefs, [])
      || record.syntaxProjectionMechanicallyObserved !== true
      || record.generalControlFlowEquivalenceMechanicallyEstablished !== false
      || record.generalDataFlowEquivalenceMechanicallyEstablished !== false
      || record.runtimeExecutionObserved !== false
      || record.valueProvenanceFrozen !== false
      || record.independentDomainReviewed !== false
      || record.freezeEffect !== "none"
      || record.projectionDigest !== plainValueDigest(record.repositoryProjection)) {
      fail("CANDIDATE_SCHEMA_INVALID", `valueEvidenceRecords[${index}] 的身份、来源／消费或失败关闭边界已漂移。`);
    }
  }
  requireExactKeys(candidate.valueEvidenceRecords[0].repositoryProjection, WEIGHT_KEYS, "weights repositoryProjection");
  requireExactKeys(candidate.valueEvidenceRecords[1].repositoryProjection, [
    "monthCommand",
    "visibleStem",
    "hiddenIndexZero",
    "hiddenOtherIndex"
  ], "dispatch repositoryProjection");
  requireExactKeys(candidate.valueEvidenceRecords[2].repositoryProjection, [
    "invalidHiddenIndexRejected",
    "consumerCalls"
  ], "consumer repositoryProjection");
  if (!sameJson(candidate.valueEvidenceRecords[0].repositoryProjection, EXPECTED_WEIGHTS)
    || !sameJson(candidate.valueEvidenceRecords[1].repositoryProjection, EXPECTED_DISPATCH)
    || !sameJson(candidate.valueEvidenceRecords[2].repositoryProjection, EXPECTED_CONSUMER_PROJECTION)) {
    fail("CANDIDATE_SCHEMA_INVALID", "candidate 三项 repositoryProjection 必须保持当前 4/2/2/1、dispatch 与直接 consumer 投影。" );
  }
  requireExactKeys(candidate.authorityBoundary, Object.keys(AUTHORITY_BOUNDARY), "authorityBoundary");
  if (!sameJson(candidate.authorityBoundary, AUTHORITY_BOUNDARY)) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "candidate authorityBoundary 不得提权。");
  }
  requireExactKeys(candidate.externalEvidence, Object.keys(EXTERNAL_EVIDENCE), "externalEvidence");
  if (!sameJson(candidate.externalEvidence, EXTERNAL_EVIDENCE)) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "source rights/carrier/rationale/expert 证据必须保持 null 或空。");
  }
  requireExactKeys(candidate.gateSummary, [
    "currentPolicyWeightValuesObserved",
    "scopedValueSubjectsObserved",
    "stablePolicyDispatchSyntaxObserved",
    "directConsumerCallShapesObserved",
    "sourceEvidenceRefsBound",
    "formalSourceRightsRecords",
    "formalSourceCarrierRecords",
    "engineeringRationalesFrozen",
    "engineeringReviewsVerified",
    "expertReviewsVerified",
    "independentDomainReviewsVerified",
    "bindingFreezeEligible",
    "bindingFrozenVerified",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "formalActivationAllowed",
    "releaseReady",
    "publicDeploymentAuthorized"
  ], "gateSummary");
  if (!sameJson(candidate.gateSummary, GATE_SUMMARY)) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", "candidate gateSummary 不得提升或伪造机械、freeze／expert／release 状态。");
  }
  requireExactKeys(candidate.digestBoundary, [
    "algorithm",
    "domain",
    "digestIsDigitalSignature",
    "digitalSignature",
    "signerIdentity"
  ], "digestBoundary");
  if (!sameJson(candidate.doesNotEstablish, DOES_NOT_ESTABLISH)) {
    fail("CANDIDATE_SCHEMA_INVALID", "doesNotEstablish 必须保持完整有序边界。");
  }
  if (candidate.digestBoundary?.algorithm !== "SHA-256"
    || candidate.digestBoundary?.domain !== CANDIDATE_DIGEST_DOMAIN
    || candidate.digestBoundary?.digestIsDigitalSignature !== false
    || candidate.digestBoundary?.digitalSignature !== null
    || candidate.digestBoundary?.signerIdentity !== null
    || !SHA256_PATTERN.test(candidate.candidateDigest ?? "")) {
    fail("CANDIDATE_DIGEST_INVALID", "candidate digest 边界无效。");
  }
  const expectedDigest = computeBaziPolicyWeightsValueEvidenceCandidateDigest(candidate);
  if (candidate.candidateDigest !== expectedDigest) {
    fail("CANDIDATE_DIGEST_INVALID", "candidateDigest 与候选内容不一致。");
  }
}

export function parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(
  bytes,
  label = "bazi policy weights value evidence candidate JSON"
) {
  let exactNativeBytes = false;
  try {
    exactNativeBytes = (
      Buffer.isBuffer(bytes)
      && Object.getPrototypeOf(bytes) === Buffer.prototype
    ) || (
      !Buffer.isBuffer(bytes)
      && utilTypes.isUint8Array(bytes)
      && Object.getPrototypeOf(bytes) === Uint8Array.prototype
    );
  } catch {
    exactNativeBytes = false;
  }
  if (!exactNativeBytes) {
    fail("JSON_BYTES_INVALID", `${label} 必须是 exact-native Buffer 或 Uint8Array 字节。`);
  }
  const nativeByteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  if (nativeByteLength > MAX_CANDIDATE_BYTES) {
    fail("JSON_TOO_LARGE", `${label} 超过 ${MAX_CANDIDATE_BYTES} bytes 上限。`);
  }
  const nativeByteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
  const nativeBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
  const stableBytes = Buffer.from(new Uint8Array(nativeBuffer, nativeByteOffset, nativeByteLength));
  const parsed = parseJsonBytes(stableBytes, label);
  validateCandidateBoundary(parsed);
  return deepFreezeJson(parsed);
}

export async function readBaziPolicyWeightsValueEvidenceCandidate(
  workspaceRoot,
  relativePath = BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH,
  options = {}
) {
  const rootReal = await resolveOrdinaryRoot(workspaceRoot);
  const file = await readStableWorkspaceFile(rootReal, relativePath, MAX_CANDIDATE_BYTES, options.testHooks);
  return parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(file.bytes, relativePath);
}

export async function verifyBaziPolicyWeightsValueEvidenceCandidate(
  workspaceRoot,
  candidateInput,
  options = {}
) {
  const candidate = capturePassiveJsonSnapshot(candidateInput);
  validateCandidateBoundary(candidate);
  const expected = await buildCurrentBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, options);
  if (!sameJson(candidate, expected)) {
    fail("CANDIDATE_CURRENT_STATE_MISMATCH", "candidate 与当前 held-handle 依据投影不一致。");
  }
  return deepFreezeJson(candidate);
}
