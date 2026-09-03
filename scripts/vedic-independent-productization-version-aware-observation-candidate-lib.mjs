import { createHash } from "node:crypto";
import {
  close as closeFileDescriptorCallback,
  constants as fsConstants,
  fstat as statFileDescriptorCallback,
  open as openFileDescriptorCallback,
  read as readFileDescriptorCallback
} from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { types as utilTypes } from "node:util";
import { runInNewContext } from "node:vm";

import {
  canonicalPrettyStringifyVedicProductizationRequirements,
  parseVedicProductizationRequirementsJsonBytes,
  verifyVedicProductizationRequirementsLedger
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  canonicalPrettyStringifyVedicInputStructuralRejectionEvidence,
  parseVedicInputStructuralRejectionEvidenceJsonBytes,
  verifyVedicInputStructuralRejectionEvidence
} from "./vedic-input-structural-rejection-evidence-lib.mjs";
import {
  canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft,
  parseVedicHighRiskExpressionPolicyDraftJsonBytes,
  verifyVedicHighRiskExpressionPolicyDraft
} from "./vedic-high-risk-expression-policy-draft-lib.mjs";

const CLEAN_BRAND_PRIMORDIALS = runInNewContext(
  "({ ArrayIsArray: Array.isArray, JsonObject: JSON, JsonParse: JSON.parse, JsonStringify: JSON.stringify, NumberIsFinite: Number.isFinite, NumberIsSafeInteger: Number.isSafeInteger, ObjectDefineProperty: Object.defineProperty, ObjectFreeze: Object.freeze, ObjectGetOwnPropertyDescriptor: Object.getOwnPropertyDescriptor, ObjectGetOwnPropertyDescriptors: Object.getOwnPropertyDescriptors, ObjectGetPrototypeOf: Object.getPrototypeOf, ObjectIs: Object.is, ObjectIsFrozen: Object.isFrozen, PromiseConstructor: Promise, ReflectApply: Reflect.apply, ReflectOwnKeys: Reflect.ownKeys, StringConstructor: String, WeakSetConstructor: WeakSet, WeakSetAdd: WeakSet.prototype.add, WeakSetHas: WeakSet.prototype.has })"
);
const JSON_OBJECT = CLEAN_BRAND_PRIMORDIALS.JsonObject;
const JSON_PARSE = CLEAN_BRAND_PRIMORDIALS.JsonParse;
const JSON_STRINGIFY = CLEAN_BRAND_PRIMORDIALS.JsonStringify;
const OBJECT_DEFINE_PROPERTY = CLEAN_BRAND_PRIMORDIALS.ObjectDefineProperty;
const OBJECT_FREEZE = CLEAN_BRAND_PRIMORDIALS.ObjectFreeze;
const OBJECT_IS_FROZEN = CLEAN_BRAND_PRIMORDIALS.ObjectIsFrozen;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR =
  CLEAN_BRAND_PRIMORDIALS.ObjectGetOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS =
  CLEAN_BRAND_PRIMORDIALS.ObjectGetOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF =
  CLEAN_BRAND_PRIMORDIALS.ObjectGetPrototypeOf;
const OBJECT_IS = CLEAN_BRAND_PRIMORDIALS.ObjectIs;
const NATIVE_PROMISE = CLEAN_BRAND_PRIMORDIALS.PromiseConstructor;
const REFLECT_APPLY = CLEAN_BRAND_PRIMORDIALS.ReflectApply;
const REFLECT_OWN_KEYS = CLEAN_BRAND_PRIMORDIALS.ReflectOwnKeys;
const ARRAY_IS_ARRAY = CLEAN_BRAND_PRIMORDIALS.ArrayIsArray;
const ARRAY_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [[]]
);
const OBJECT_PROTOTYPE = REFLECT_APPLY(
  OBJECT_GET_PROTOTYPE_OF,
  Object,
  [{}]
);
const NUMBER_IS_FINITE = CLEAN_BRAND_PRIMORDIALS.NumberIsFinite;
const NUMBER_IS_SAFE_INTEGER = CLEAN_BRAND_PRIMORDIALS.NumberIsSafeInteger;
const STRING_CONSTRUCTOR = CLEAN_BRAND_PRIMORDIALS.StringConstructor;
const NATIVE_WEAK_SET = CLEAN_BRAND_PRIMORDIALS.WeakSetConstructor;
const WEAK_SET_ADD = CLEAN_BRAND_PRIMORDIALS.WeakSetAdd;
const WEAK_SET_HAS = CLEAN_BRAND_PRIMORDIALS.WeakSetHas;
const IS_PROXY = utilTypes.isProxy;
const FILE_OPEN = openFileDescriptorCallback;
const FILE_READ = readFileDescriptorCallback;
const FILE_STAT = statFileDescriptorCallback;
const FILE_CLOSE = closeFileDescriptorCallback;
const FILE_TYPE_MASK = fsConstants.S_IFMT;
const FILE_TYPE_REGULAR = fsConstants.S_IFREG;
const FILE_TYPE_DIRECTORY = fsConstants.S_IFDIR;
const FILE_TYPE_SYMBOLIC_LINK = fsConstants.S_IFLNK;
const PROCESS_CWD = process.cwd;
const PROCESS_OBJECT = process;
const BUFFER_ALLOC_UNSAFE = Buffer.allocUnsafe;
const NATIVE_BUFFER = Buffer;
const TEXT_DECODER = TextDecoder;

const MAX_CANDIDATE_BYTES = 128 * 1024;
const MAX_CANONICAL_DEPTH = 96;
const MAX_CANONICAL_NODES = 200_000;
const MAX_CANONICAL_TEXT_CHARACTERS = 2_000_000;
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.vedic.independent-productization.version-aware-observation-candidate.v1.1";

export const VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/vedic-independent-productization-version-aware-observation-candidate.v1.1.0.json";

const CANDIDATE_ID =
  "hakimi.vedic.independent-productization.version-aware-observation-candidate/1.1.0";
const RECORD_TYPE =
  "vedic_independent_productization_version_aware_observation_candidate_v1_1";
const CANDIDATE_STATUS =
  "current_three_direct_context_endpoints_mechanically_verified_non_atomic_observation_only_parent_and_registry_unchanged_zero_admission_effect";
const CANDIDATE_CREATED_AT = "2026-08-30T00:00:00.000Z";

const PARENT_CONTEXT = OBJECT_FREEZE({
  contextId: "historical_parent_requirements_ledger_v1",
  role: "stored_parent_baseline",
  path: "content/system-admission/vedic-independent-productization-requirements.v1.json",
  bytes: 25578,
  sha256: "c9f0fbb3b25c3ad582dc4c3f5534e7e27cb44e47721dbf806b8085cefb6b26f8",
  semanticDigestField: "ledgerDigest",
  semanticDigest: "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb",
  artifactId: "hakimi.vedic.independent-productization-requirements/1.0.0",
  status:
    "input_fact_rule_contract_drafts_runtime_bundle_proposal_source_rights_requirements_only_inventory_and_two_vacant_seat_expert_review_plan_present_open_universe_zero_bindings_zero_expert_instances_research_only_not_admitted"
});

const INPUT_CONTEXT = OBJECT_FREEZE({
  contextId: "post_parent_input_structural_rejection_diagnostics_v1",
  role: "post_parent_observation_child",
  path: "content/system-admission/vedic-input-structural-rejection-execution-evidence.v1.json",
  bytes: 26585,
  sha256: "da953b36a3bef662833ae5763e3cdde7dd84b129089e96a8445ddbc582d1a67f",
  semanticDigestField: "evidenceDigest",
  semanticDigest: "b068269d809d49e6ff2f8a80ee2c3ee2bcb649f9fbfc0cb1fa3240b3722422a2",
  artifactId: "hakimi.vedic.input-structural-rejection-execution-evidence/1.0.0",
  status: "four_fixed_diagnostic_rejection_probes_verified_not_product_admitted"
});

const HIGH_RISK_CONTEXT = OBJECT_FREEZE({
  contextId: "post_parent_high_risk_requirements_policy_v0_1",
  role: "post_parent_requirements_only_child",
  path: "content/system-admission/vedic-high-risk-expression-policy-draft.v0.1.0.json",
  bytes: 15788,
  sha256: "8a1295c4f68da87a50ac2d6f8689765c271e007a68d63dfe2afa88377d94f5fa",
  semanticDigestField: "policyDigest",
  semanticDigest: "bc1996b042e84214f86d35416c4589e3309a5654250e43c30688568a28ee9fb9",
  artifactId: "hakimi.vedic.high-risk-expression-policy-draft/0.1.0",
  status: "requirements_only_engineering_candidate_not_admitted"
});

const DIRECT_CONTEXTS = OBJECT_FREEZE([
  PARENT_CONTEXT,
  INPUT_CONTEXT,
  HIGH_RISK_CONTEXT
]);

const PARENT_GATE_STATES = OBJECT_FREEZE([
  OBJECT_FREEZE({
    gateId: "input_contract",
    requirementState: "draft_present_formal_input_contract_not_admitted"
  }),
  OBJECT_FREEZE({
    gateId: "deterministic_facts",
    requirementState: "fact_contract_draft_present_producer_and_fact_instances_absent"
  }),
  OBJECT_FREEZE({
    gateId: "versioned_ruleset",
    requirementState:
      "rule_contract_draft_present_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted"
  }),
  OBJECT_FREEZE({
    gateId: "source_bundle",
    requirementState:
      "requirements_inventory_present_all_38_unbound_no_source_candidates_bodies_quotes_locators_or_bindings_source_bundle_absent"
  }),
  OBJECT_FREEZE({
    gateId: "rights_bundle",
    requirementState:
      "requirements_inventory_present_all_38_unbound_no_work_version_carrier_rights_evidence_rights_bundle_absent"
  }),
  OBJECT_FREEZE({
    gateId: "expert_review_bundle",
    requirementState:
      "review_plan_present_two_seats_defined_zero_verified_real_experts_identity_credentials_independence_original_opinions_expert_review_bundle_absent"
  }),
  OBJECT_FREEZE({
    gateId: "high_risk_policy",
    requirementState: "required_absent"
  }),
  OBJECT_FREEZE({
    gateId: "release_evidence",
    requirementState: "required_absent"
  })
]);

const RELEASE_GOVERNANCE_CONTEXT = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  projectContextOnly: true,
  inheritedByVedicProductIdentity: false,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 14110,
  rawSha256: "d87a9340c4afd280e1aeb004f4322d2088868b79f31b7c2fd3191e8d14e1343a",
  candidateDigest: "3eebcbcd60dfd1f4a96671ec2ab18bd6cceb20d14806acd44a00603e4848a8d1"
});

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class VedicProductizationVersionAwareObservationCandidateError extends Error {
  constructor(code, message, cause) {
    super(code + ": " + message, cause === undefined ? undefined : { cause });
    this.name = "VedicProductizationVersionAwareObservationCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new VedicProductizationVersionAwareObservationCandidateError(
    code,
    message,
    cause
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalStringify(value) {
  const seen = new NATIVE_WEAK_SET();
  const state = { nodes: 0, textCharacters: 0 };

  function walk(current, depth) {
    state.nodes += 1;
    if (state.nodes > MAX_CANONICAL_NODES || depth > MAX_CANONICAL_DEPTH) {
      fail("CANONICAL_LIMIT_EXCEEDED", "吠陀观察候选超过规范化深度或节点上限。");
    }
    if (current === null || typeof current === "boolean") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [current]);
    }
    if (typeof current === "string") {
      state.textCharacters += current.length;
      if (state.textCharacters > MAX_CANONICAL_TEXT_CHARACTERS) {
        fail("CANONICAL_TEXT_LIMIT_EXCEEDED", "吠陀观察候选超过文本上限。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [current]);
    }
    if (typeof current === "number") {
      if (!REFLECT_APPLY(NUMBER_IS_FINITE, Number, [current])
        || REFLECT_APPLY(OBJECT_IS, Object, [current, -0])) {
        fail("NON_JSON_NUMBER", "吠陀观察候选不接受非有限数值或 -0。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [current]);
    }
    if (typeof current !== "object") {
      fail("NON_JSON_VALUE", "吠陀观察候选只接受被动 JSON 值。");
    }
    if (REFLECT_APPLY(IS_PROXY, utilTypes, [current])) {
      fail("PROXY_FORBIDDEN", "吠陀观察候选不接受 Proxy。");
    }
    if (REFLECT_APPLY(WEAK_SET_HAS, seen, [current])) {
      fail("NON_JSON_GRAPH", "吠陀观察候选不接受 cycle 或 alias。");
    }
    REFLECT_APPLY(WEAK_SET_ADD, seen, [current]);

    const isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [current]);
    let prototype;
    let descriptors;
    try {
      prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [current]);
      descriptors = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
        Object,
        [current]
      );
    } catch (cause) {
      fail("NON_PASSIVE_OBJECT", "吠陀观察候选对象描述符不可安全读取。", cause);
    }
    if ((isArray && prototype !== ARRAY_PROTOTYPE)
      || (!isArray && prototype !== OBJECT_PROTOTYPE)) {
      fail("NON_PASSIVE_OBJECT", "吠陀观察候选不接受自定义 prototype。");
    }
    const descriptorKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
    for (let index = 0; index < descriptorKeys.length; index += 1) {
      if (typeof descriptorKeys[index] !== "string") {
        fail("NON_JSON_KEY", "吠陀观察候选不接受 Symbol 属性。");
      }
    }

    if (isArray) {
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (!lengthDescriptor
        || !REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [length])
        || length < 0
        || descriptorKeys.length !== length + 1) {
        fail("NON_PASSIVE_ARRAY", "吠陀观察候选数组必须稠密且无额外属性。");
      }
      let text = "[";
      for (let index = 0; index < length; index += 1) {
        const key = REFLECT_APPLY(STRING_CONSTRUCTOR, null, [index]);
        const descriptor = descriptors[key];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          fail("NON_PASSIVE_ARRAY", "吠陀观察候选数组不得包含 hole 或 accessor。");
        }
        if (index > 0) text += ",";
        text += walk(descriptor.value, depth + 1);
      }
      return text + "]";
    }

    const keys = descriptorKeys.slice().sort(compareCodeUnits);
    let text = "{";
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        fail("NON_PASSIVE_OBJECT", "吠陀观察候选不得包含 accessor 或隐藏字段。");
      }
      if (index > 0) text += ",";
      text += REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [key]) + ":";
      text += walk(descriptor.value, depth + 1);
    }
    return text + "}";
  }

  return walk(value, 0);
}

function cloneCleanJsonValueToOuterRealm(value) {
  if (value === null || typeof value !== "object") return value;
  const isArray = REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value]);
  const descriptors = REFLECT_APPLY(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTORS,
    Object,
    [value]
  );
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  const clone = isArray ? [] : {};
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (isArray && key === "length") continue;
    const descriptor = descriptors[key];
    if (typeof key !== "string"
      || !descriptor
      || !("value" in descriptor)
      || descriptor.enumerable !== true) {
      fail("CLEAN_JSON_CLONE_INVALID", "clean realm JSON 解析结果不是被动 JSON 值。");
    }
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [clone, key, {
      configurable: true,
      enumerable: true,
      value: cloneCleanJsonValueToOuterRealm(descriptor.value),
      writable: true
    }]);
  }
  return clone;
}

function canonicalValue(value) {
  const cleanValue = REFLECT_APPLY(
    JSON_PARSE,
    JSON_OBJECT,
    [canonicalStringify(value)]
  );
  return cloneCleanJsonValueToOuterRealm(cleanValue);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = REFLECT_APPLY(
      OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
      Object,
      [value, keys[index]]
    );
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "吠陀观察候选冻结前发现 accessor。");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function isRecursivelyFrozenPassive(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object") return true;
  if (!REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) {
    return false;
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return true;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  let keys;
  try {
    keys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
  } catch {
    return false;
  }
  for (let index = 0; index < keys.length; index += 1) {
    let descriptor;
    try {
      descriptor = REFLECT_APPLY(
        OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
        Object,
        [value, keys[index]]
      );
    } catch {
      return false;
    }
    if (!descriptor
      || !("value" in descriptor)
      || !isRecursivelyFrozenPassive(descriptor.value, seen)) {
      return false;
    }
  }
  return true;
}

function requireImmutableFailClosedResult(value) {
  try {
    value.activeAdmissionEffect = "admit";
  } catch {}
  try {
    value.authorityRedGates.releaseReady = true;
  } catch {}
  try {
    value.authorityRedGates.publicDeploymentAuthorized = true;
  } catch {}
  try {
    value.__freezeProbe = true;
  } catch {}
  try {
    value.authorityRedGates.__freezeProbe = true;
  } catch {}
  if (value.activeAdmissionEffect !== "none"
    || value.authorityRedGates.releaseReady !== false
    || value.authorityRedGates.publicDeploymentAuthorized !== false
    || value.__freezeProbe === true
    || value.authorityRedGates.__freezeProbe === true) {
    fail(
      "VERIFIED_RESULT_NOT_IMMUTABLE",
      "吠陀观察候选最终结果未保持不可变全红边界。"
    );
  }
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringify(value), "utf8")
    .digest("hex");
}

export function computeVedicProductizationVersionAwareObservationCandidateDigest(
  value
) {
  const unsigned = canonicalValue(value);
  delete unsigned.candidateDigest;
  return domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned);
}

export function canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate(
  value
) {
  const normalized = canonicalValue(value);
  return REFLECT_APPLY(JSON_STRINGIFY, JSON_OBJECT, [normalized, null, 2]) + "\n";
}

export function parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
  bytes,
  label = "吠陀独立产品化版本感知观察候选 JSON",
  maxBytes = MAX_CANDIDATE_BYTES
) {
  const parsed = parseVedicProductizationRequirementsJsonBytes(
    bytes,
    label,
    maxBytes
  );
  return canonicalValue(parsed);
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (typeof relativePath !== "string"
    || relativePath.length < 1
    || relativePath.length > 300
    || relativePath.includes("\0")
    || relativePath.includes("\\")
    || relativePath.includes(":")
    || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.split("/").some(
      (segment) => segment === "" || segment === "." || segment === ".."
    )) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀观察候选文件路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (relative === ""
    || relative === ".."
    || relative.startsWith(".." + path.sep)
    || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀观察候选文件路径越出工作区。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === ""
    || (relative !== ".."
      && !relative.startsWith(".." + path.sep)
      && !path.isAbsolute(relative));
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

async function capturePlainDirectoryChain(
  workspaceRoot,
  absolutePath,
  invalidCode,
  label
) {
  const root = path.resolve(workspaceRoot);
  const targetDirectory = path.dirname(path.resolve(absolutePath));
  if (!isSameOrWithin(root, targetDirectory)) {
    fail(invalidCode, label + " 的目录链越出工作区。");
  }
  const relative = path.relative(root, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints = [];
  let cursor = root;
  const traversal = [null, ...segments];
  for (let index = 0; index < traversal.length; index += 1) {
    const segment = traversal[index];
    if (segment !== null) cursor = path.join(cursor, segment);
    const metadata = await lstat(cursor);
    if (isStatsType(metadata, FILE_TYPE_SYMBOLIC_LINK)
      || !isStatsType(metadata, FILE_TYPE_DIRECTORY)) {
      fail(invalidCode, label + " 的目录链不能包含链接、junction 或特殊端点。");
    }
    const resolvedPath = await realpath(cursor);
    if (endpoints.length > 0
      && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(invalidCode, label + " 的目录链 realpath 越出工作区。");
    }
    endpoints.push(OBJECT_FREEZE({
      absolutePath: cursor,
      resolvedPath,
      metadata
    }));
  }
  return OBJECT_FREEZE(endpoints);
}

function sameDirectoryChain(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const entry = left[index];
    const other = right[index];
    if (other === undefined
      || entry.absolutePath !== other.absolutePath
      || entry.resolvedPath !== other.resolvedPath
      || !sameEndpoint(entry.metadata, other.metadata)) {
      return false;
    }
  }
  return true;
}

function isStatsType(metadata, expectedType) {
  return metadata !== null
    && typeof metadata === "object"
    && REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [metadata.mode])
    && (metadata.mode & FILE_TYPE_MASK) === expectedType;
}

function openFileDescriptor(absolutePath, flags) {
  return new NATIVE_PROMISE((resolve, reject) => {
    REFLECT_APPLY(FILE_OPEN, null, [absolutePath, flags, (error, descriptor) => {
      if (error) reject(error);
      else resolve(descriptor);
    }]);
  });
}

function statFileDescriptor(descriptor) {
  return new NATIVE_PROMISE((resolve, reject) => {
    REFLECT_APPLY(FILE_STAT, null, [descriptor, (error, metadata) => {
      if (error) reject(error);
      else resolve(metadata);
    }]);
  });
}

function readFileDescriptor(descriptor, buffer, offset, length, position) {
  return new NATIVE_PROMISE((resolve, reject) => {
    REFLECT_APPLY(FILE_READ, null, [
      descriptor,
      buffer,
      offset,
      length,
      position,
      (error, bytesRead) => {
        if (error) reject(error);
        else resolve(bytesRead);
      }
    ]);
  });
}

function closeFileDescriptor(descriptor) {
  return new NATIVE_PROMISE((resolve, reject) => {
    REFLECT_APPLY(FILE_CLOSE, null, [descriptor, (error) => {
      if (error) reject(error);
      else resolve();
    }]);
  });
}

async function readExactOpenedSize(descriptor, expectedSize, invalidCode, label) {
  if (!REFLECT_APPLY(NUMBER_IS_SAFE_INTEGER, Number, [expectedSize])
    || expectedSize <= 0) {
    fail(invalidCode, label + " 的已打开文件尺寸无效。");
  }
  const bytes = REFLECT_APPLY(
    BUFFER_ALLOC_UNSAFE,
    NATIVE_BUFFER,
    [expectedSize]
  );
  let total = 0;
  while (total < expectedSize) {
    const bytesRead = await readFileDescriptor(
      descriptor,
      bytes,
      total,
      expectedSize - total,
      total
    );
    if (bytesRead === 0) {
      fail(invalidCode, label + " 在 held-handle 读取期间提前截断。");
    }
    total += bytesRead;
  }
  const growthProbe = REFLECT_APPLY(
    BUFFER_ALLOC_UNSAFE,
    NATIVE_BUFFER,
    [1]
  );
  const growthBytesRead = await readFileDescriptor(
    descriptor,
    growthProbe,
    0,
    1,
    expectedSize
  );
  if (growthBytesRead !== 0) {
    fail(invalidCode, label + " 在 held-handle 读取期间增长。");
  }
  return bytes;
}

async function readStableWorkspaceFile(
  workspaceRoot,
  relativePath,
  maxBytes = MAX_CANDIDATE_BYTES,
  options = {}
) {
  const invalidCode = options.invalidCode ?? "ARTIFACT_ENDPOINT_INVALID";
  const missingCode = options.missingCode ?? "ARTIFACT_MISSING";
  const label = options.label ?? relativePath;
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let before;
  let actual;
  let directoryChainBefore;
  try {
    directoryChainBefore = await capturePlainDirectoryChain(
      workspaceRoot,
      absolute,
      invalidCode,
      label
    );
    before = await lstat(absolute);
    actual = await realpath(absolute);
  } catch (cause) {
    if (cause instanceof VedicProductizationVersionAwareObservationCandidateError) {
      throw cause;
    }
    fail(missingCode, label + " 不存在。", cause);
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(root, actual)
    || isStatsType(before, FILE_TYPE_SYMBOLIC_LINK)
    || !isStatsType(before, FILE_TYPE_REGULAR)
    || before.nlink !== 1
    || before.size <= 0
    || before.size > maxBytes) {
    fail(invalidCode, label + " 必须是工作区内独立普通小文件。");
  }

  const descriptor = await openFileDescriptor(actual, "r");
  try {
    const opened = await statFileDescriptor(descriptor);
    if (!isStatsType(opened, FILE_TYPE_REGULAR)
      || opened.nlink !== 1
      || !sameEndpoint(before, opened)) {
      fail(invalidCode, label + " 在打开前发生身份换绑。");
    }
    const bytes = await readExactOpenedSize(
      descriptor,
      opened.size,
      invalidCode,
      label
    );
    const afterHandle = await statFileDescriptor(descriptor);
    const afterPath = await lstat(absolute);
    const actualAfter = await realpath(absolute);
    const directoryChainAfter = await capturePlainDirectoryChain(
      workspaceRoot,
      absolute,
      invalidCode,
      label
    );
    if (isStatsType(afterPath, FILE_TYPE_SYMBOLIC_LINK)
      || !isStatsType(afterPath, FILE_TYPE_REGULAR)
      || afterPath.nlink !== 1
      || bytes.byteLength !== opened.size
      || !sameEndpoint(opened, afterHandle)
      || !sameEndpoint(opened, afterPath)
      || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(invalidCode, label + " 在 held-handle 读取区间发生变化。");
    }
    return OBJECT_FREEZE({
      bytes,
      rawBytes: bytes.byteLength,
      rawSha256: sha256Bytes(bytes)
    });
  } finally {
    await closeFileDescriptor(descriptor);
  }
}

function decodeStrictUtf8(bytes, label) {
  if (bytes.byteLength >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", label + " 不得包含 UTF-8 BOM。");
  }
  try {
    return new TEXT_DECODER("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。", cause);
  }
}

function requireRawIdentity(snapshot, expected, label) {
  if (snapshot.rawBytes !== expected.bytes
    || snapshot.rawSha256 !== expected.sha256) {
    fail("DIRECT_CONTEXT_RAW_IDENTITY_MISMATCH", label + " 原始字节身份漂移。");
  }
}

function requireAllFalse(value, label) {
  const entries = Object.entries(value ?? {});
  if (entries.length === 0
    || entries.some((entry) => entry[1] !== false)) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", label + " 必须全部保持 false。");
  }
}

function requireParentProjection(parent, verified) {
  if (parent.ledgerId !== PARENT_CONTEXT.artifactId
    || parent.ledgerDigest !== PARENT_CONTEXT.semanticDigest
    || parent.status !== PARENT_CONTEXT.status
    || verified.ledgerDigest !== PARENT_CONTEXT.semanticDigest
    || verified.admissionGatesSatisfied !== 0
    || verified.bindingFrozenVerified !== 0
    || verified.bindingRequired !== 38
    || verified.requirementsUniverseClosed !== false
    || verified.independentExpertReviewsVerified !== 0
    || verified.productArtifactsPresent !== 3
    || verified.rereviewRequirementsComplete !== 3
    || verified.rereviewTriggered !== false
    || verified.releaseReady !== false
    || verified.publicReleaseAuthorized !== false
    || parent.gateSummary?.admissionGatesRequired !== 8
    || parent.gateSummary?.admissionGatesSatisfied !== 0
    || parent.gateSummary?.bindingRequired !== 38
    || parent.gateSummary?.bindingFrozenVerified !== 0
    || parent.gateSummary?.requirementsUniverseClosed !== false
    || parent.gateSummary?.independentExpertsRequired !== 2
    || parent.gateSummary?.independentExpertReviewsVerified !== 0
    || parent.gateSummary?.productArtifactsPresent !== 3
    || parent.gateSummary?.rereviewRequirementsComplete !== 3
    || parent.gateSummary?.rereviewRequirementsRequired !== 7
    || parent.gateSummary?.rereviewTriggered !== false
    || parent.productBoundary?.releaseIdentity !== null
    || parent.productBoundary?.targetSchema !== null
    || parent.productBoundary?.migrationId !== null
    || parent.productBoundary?.domainManifest !== "absent"
    || parent.productBoundary?.productSurface !== "absent"
    || parent.productBoundary?.runtimeImplementation !== "absent"
    || parent.observationBoundary?.crossFileAtomicSnapshot !== false
    || parent.observationBoundary?.parentAndChildrenAtomicSnapshot !== false
    || parent.observationBoundary?.mutationEpochAvailable !== false
    || parent.observationBoundary?.mutationEpochReceipt !== null
    || parent.observationBoundary?.intervalMutationExcluded !== false
    || parent.observationBoundary?.abaExcluded !== false) {
    fail("PARENT_RED_PROJECTION_DRIFT", "历史父账的计数、产品身份或观察红门漂移。");
  }
  requireAllFalse(parent.authorityBoundary, "历史父账 authorityBoundary");
  const actualGateStates = parent.admissionGateRequirements?.map((entry) => ({
    gateId: entry.gateId,
    requirementState: entry.requirementState
  }));
  if (!exactJson(actualGateStates, PARENT_GATE_STATES)) {
    fail("PARENT_GATE_STATE_DRIFT", "历史父账八道门状态漂移。");
  }
  const parentText = canonicalStringify(parent);
  if (parentText.includes(INPUT_CONTEXT.path)
    || parentText.includes(HIGH_RISK_CONTEXT.path)) {
    fail("PARENT_BACKLINK_FORBIDDEN", "历史父账不得反向引用两个后置 child。");
  }
}

function requireInputProjection(input, verified) {
  if (input.artifactId !== INPUT_CONTEXT.artifactId
    || input.evidenceDigest !== INPUT_CONTEXT.semanticDigest
    || input.status !== INPUT_CONTEXT.status
    || verified.evidenceDigest !== INPUT_CONTEXT.semanticDigest
    || verified.status !== INPUT_CONTEXT.status
    || verified.diagnosticProbeExecutions !== 4
    || verified.acceptedInputs !== 0
    || verified.inputInstances !== 0
    || verified.productInputRejectionReceipts !== 0
    || verified.fixedProbeSetVerified !== true
    || verified.probeCoverageComplete !== false
    || input.executionBoundary?.productInputCandidates !== 0
    || input.executionBoundary?.successReceipts !== 0
    || input.executionBoundary?.factArtifactsIssued !== 0
    || input.probeCoverageBoundary?.inputRejectionCapabilityEstablished !== false
    || input.probeCoverageBoundary?.structuralValidatorComplete !== false
    || input.probeCoverageBoundary?.allMalformedInputsRejectedEstablished !== false
    || input.receiptBoundary?.inputAccepted !== false
    || input.receiptBoundary?.inputContractGateSatisfied !== false
    || input.receiptBoundary?.requirementsResolved !== 0
    || input.receiptBoundary?.requirementsUniverseClosed !== false
    || input.productBoundary?.releaseIdentity !== null
    || input.productBoundary?.targetSchema !== null
    || input.productBoundary?.migrationId !== null
    || input.observationBoundary?.crossFileAtomicSnapshot !== false
    || input.observationBoundary?.mutationEpochAvailable !== false
    || input.observationBoundary?.mutationEpochReceipt !== null
    || input.observationBoundary?.intervalMutationExcluded !== false
    || input.observationBoundary?.abaExcluded !== false) {
    fail("INPUT_DIAGNOSTIC_PROMOTION_FORBIDDEN", "四次结构诊断不得晋级输入门或产品回执。");
  }
  requireAllFalse(input.authorityBoundary, "输入诊断 authorityBoundary");
}

function requireHighRiskProjection(policy, verified) {
  if (policy.policyId !== HIGH_RISK_CONTEXT.artifactId
    || policy.policyDigest !== HIGH_RISK_CONTEXT.semanticDigest
    || policy.status !== HIGH_RISK_CONTEXT.status
    || verified.policyDigest !== HIGH_RISK_CONTEXT.semanticDigest
    || verified.status !== HIGH_RISK_CONTEXT.status
    || verified.activeAdmissionEffect !== "none"
    || verified.admissionGatesSatisfied !== 0
    || verified.highRiskPolicyEstablished !== false
    || verified.highRiskPolicyGateSatisfied !== false
    || verified.policyEnforced !== false
    || verified.receiptIssued !== false
    || policy.admissionProjection?.admissionGatesRequired !== 8
    || policy.admissionProjection?.admissionGatesSatisfied !== 0
    || policy.admissionProjection?.requirementsMaterialDefined !== true
    || policy.admissionProjection?.highRiskPolicyCandidatePresent !== true
    || policy.admissionProjection?.highRiskPolicyEstablished !== false
    || policy.admissionProjection?.highRiskPolicyGateSatisfied !== false
    || policy.admissionProjection?.parentLedgerUpdated !== false
    || policy.admissionProjection?.registryUpdated !== false
    || policy.enforcementBoundary?.enforcementImplemented !== false
    || policy.enforcementBoundary?.receiptIssued !== false
    || policy.enforcementBoundary?.enforcementReceipts !== 0
    || policy.enforcementBoundary?.runtimeExecutionsObserved !== 0
    || policy.enforcementBoundary?.browserValidated !== false
    || policy.policyMaterial?.riskUniverseClosed !== false
    || policy.sourceRightsBoundary?.bindingRequiredCurrentScoped !== 38
    || policy.sourceRightsBoundary?.bindingFrozenVerified !== 0
    || policy.sourceRightsBoundary?.requirementsUniverseClosed !== false
    || policy.expertBoundary?.independentExpertsRequired !== 2
    || policy.expertBoundary?.independentExpertReviewsVerified !== 0
    || policy.expertBoundary?.reviewerSeatsFilled !== 0
    || policy.productBoundary?.activeAdmissionEffect !== "none"
    || policy.productBoundary?.releaseIdentity !== null
    || policy.productBoundary?.targetSchema !== null
    || policy.productBoundary?.migrationId !== null
    || policy.productBoundary?.legacyV13Inherited !== false
    || policy.productBoundary?.schema13Inherited !== false
    || policy.observationBoundary?.crossFileAtomicSnapshot !== false
    || policy.observationBoundary?.mutationEpochAvailable !== false
    || policy.observationBoundary?.mutationEpochReceipt !== null
    || policy.observationBoundary?.intervalMutationExcluded !== false
    || policy.observationBoundary?.abaExcluded !== false) {
    fail("HIGH_RISK_POLICY_PROMOTION_FORBIDDEN", "requirements-only 政策不得晋级准入、执行或回执。");
  }
  requireAllFalse(policy.authorityBoundary, "高风险政策 authorityBoundary");
}

async function collectDirectCurrentContexts(workspaceRoot) {
  const parentSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    PARENT_CONTEXT.path,
    MAX_CANDIDATE_BYTES,
    {
      invalidCode: "PARENT_ENDPOINT_INVALID",
      missingCode: "PARENT_MISSING",
      label: "吠陀历史父要求账"
    }
  );
  requireRawIdentity(parentSnapshot, PARENT_CONTEXT, "吠陀历史父要求账");
  const parent = parseVedicProductizationRequirementsJsonBytes(
    parentSnapshot.bytes,
    "吠陀历史父要求账",
    MAX_CANDIDATE_BYTES
  );
  if (decodeStrictUtf8(parentSnapshot.bytes, "吠陀历史父要求账")
    !== canonicalPrettyStringifyVedicProductizationRequirements(parent)) {
    fail("PARENT_MATERIALIZATION_MISMATCH", "吠陀历史父要求账不是唯一 canonical LF materialization。");
  }
  const parentVerified =
    await verifyVedicProductizationRequirementsLedger(workspaceRoot, parent);
  requireParentProjection(parent, parentVerified);

  const inputSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    INPUT_CONTEXT.path,
    MAX_CANDIDATE_BYTES,
    {
      invalidCode: "INPUT_ENDPOINT_INVALID",
      missingCode: "INPUT_MISSING",
      label: "吠陀输入结构诊断 evidence"
    }
  );
  requireRawIdentity(inputSnapshot, INPUT_CONTEXT, "吠陀输入结构诊断 evidence");
  const input = parseVedicInputStructuralRejectionEvidenceJsonBytes(
    inputSnapshot.bytes,
    "吠陀输入结构诊断 evidence"
  );
  if (decodeStrictUtf8(inputSnapshot.bytes, "吠陀输入结构诊断 evidence")
    !== canonicalPrettyStringifyVedicInputStructuralRejectionEvidence(input)) {
    fail("INPUT_MATERIALIZATION_MISMATCH", "吠陀输入结构诊断 evidence 不是唯一 canonical LF materialization。");
  }
  const inputVerified =
    await verifyVedicInputStructuralRejectionEvidence(workspaceRoot, input);
  requireInputProjection(input, inputVerified);

  const highRiskSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    HIGH_RISK_CONTEXT.path,
    MAX_CANDIDATE_BYTES,
    {
      invalidCode: "HIGH_RISK_ENDPOINT_INVALID",
      missingCode: "HIGH_RISK_MISSING",
      label: "吠陀高风险 requirements-only policy"
    }
  );
  requireRawIdentity(
    highRiskSnapshot,
    HIGH_RISK_CONTEXT,
    "吠陀高风险 requirements-only policy"
  );
  const highRisk = parseVedicHighRiskExpressionPolicyDraftJsonBytes(
    highRiskSnapshot.bytes,
    "吠陀高风险 requirements-only policy"
  );
  if (decodeStrictUtf8(
    highRiskSnapshot.bytes,
    "吠陀高风险 requirements-only policy"
  ) !== canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft(highRisk)) {
    fail("HIGH_RISK_MATERIALIZATION_MISMATCH", "吠陀高风险 policy 不是唯一 canonical LF materialization。");
  }
  const highRiskVerified =
    await verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, highRisk);
  requireHighRiskProjection(highRisk, highRiskVerified);

  return deepFreeze(canonicalValue({
    directCurrentContextCount: 3,
    upstreamCapabilityBrandCount: 0,
    contexts: DIRECT_CONTEXTS,
    currentVerifierPasses: {
      historicalParent: true,
      inputStructuralDiagnostics: true,
      highRiskRequirementsPolicy: true
    }
  }));
}

function buildCandidateProjection() {
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: RECORD_TYPE,
    candidateId: CANDIDATE_ID,
    status: CANDIDATE_STATUS,
    createdAt: CANDIDATE_CREATED_AT,
    systemIdentity: {
      systemId: "vedic",
      productStatus: "research-only",
      integrationStatus: "not-integrated",
      authorityStatus: "not-authoritative"
    },
    projectReleaseGovernanceContext: RELEASE_GOVERNANCE_CONTEXT,
    versionComparison: {
      baselineParentSchemaVersion: "1.0.0",
      observationCandidateSchemaVersion: "1.1.0",
      candidateIsFormalParent: false,
      supersedesBaseline: false,
      supersessionReceipt: null,
      parentRewritten: false,
      ownerDecision: null,
      ownerAcceptanceVerified: false
    },
    directCurrentContextBoundary: {
      directCurrentContextCount: 3,
      postParentChildContextCount: 2,
      upstreamCapabilityBrandCount: 0,
      contextsAreReleaseParents: false,
      contextsAreAuthorityReceipts: false,
      contexts: DIRECT_CONTEXTS.map((context) => ({
        ...context,
        currentClosureVerifierPassed: true,
        privateCapabilityBrandConsumed: false,
        rawHashAndSemanticInspectionUseSameHeldHandleBuffer: true,
        activeAdmissionEffect: "none"
      }))
    },
    storedParentSnapshot: {
      path: PARENT_CONTEXT.path,
      bytes: PARENT_CONTEXT.bytes,
      sha256: PARENT_CONTEXT.sha256,
      ledgerId: PARENT_CONTEXT.artifactId,
      ledgerDigest: PARENT_CONTEXT.semanticDigest,
      status: PARENT_CONTEXT.status,
      baselineParentVerifierPassed: true,
      baselineParentIncludesInputEvidenceChild: false,
      baselineParentIncludesHighRiskPolicyChild: false,
      storedParentReflectsCurrentChildren: false,
      parentLedgerUpdated: false,
      registryUpdated: false,
      productArtifactsPresent: 3,
      rereviewRequirementsComplete: 3,
      rereviewRequirementsRequired: 7,
      rereviewTriggered: false,
      admissionGateStates: PARENT_GATE_STATES
    },
    currentObservationOverlays: [
      {
        overlayId: "input_structural_rejection_diagnostics_observation",
        childPath: INPUT_CONTEXT.path,
        childArtifactId: INPUT_CONTEXT.artifactId,
        childDigest: INPUT_CONTEXT.semanticDigest,
        bindingDirection:
          "one_way_child_to_existing_input_draft_requirements_and_local_execution_closure_only",
        childBacklinkToObservationCandidate: false,
        parentOrRegistryModifiedByThisChild: false,
        countsTowardAdmission: 0,
        activeAdmissionEffect: "none",
        fixedProbeSetVerified: true,
        diagnosticProbeExecutions: 4,
        acceptedInputs: 0,
        inputInstances: 0,
        productInputCandidates: 0,
        productInputRejectionReceipts: 0,
        inputRejectionCapabilityEstablished: false,
        probeCoverageComplete: false,
        structuralValidatorComplete: false,
        inputContractGateSatisfied: false,
        requirementsResolved: 0,
        requirementsUniverseClosed: false
      },
      {
        overlayId: "high_risk_requirements_policy_observation",
        childPath: HIGH_RISK_CONTEXT.path,
        childArtifactId: HIGH_RISK_CONTEXT.artifactId,
        childDigest: HIGH_RISK_CONTEXT.semanticDigest,
        bindingDirection: "adr_rule_requirements_and_expert_plan_to_policy_draft_only",
        childBindsOrRewritesUpstreams: false,
        childBacklinkToObservationCandidate: false,
        parentLedgerUpdated: false,
        registryUpdated: false,
        countsTowardAdmission: 0,
        activeAdmissionEffect: "none",
        requirementsMaterialDefined: true,
        highRiskPolicyCandidatePresent: true,
        highRiskPolicyEstablished: false,
        highRiskPolicyGateSatisfied: false,
        enforcementImplemented: false,
        receiptIssued: false,
        enforcementReceipts: 0,
        riskUniverseClosed: false
      }
    ],
    projectedGateObservations: {
      inputContract: {
        storedParentRequirementState:
          "draft_present_formal_input_contract_not_admitted",
        currentOverlayState:
          "four_fixed_no_person_diagnostic_rejection_probes_verified_not_product_input_contract_admission",
        diagnosticProbeExecutions: 4,
        countsTowardAdmission: 0,
        gateSatisfied: false
      },
      highRiskPolicy: {
        storedParentRequirementState: "required_absent",
        parentStillStoresRequiredAbsent: true,
        currentOverlayState:
          "requirements_only_candidate_present_zero_enforcement_not_admitted",
        requirementsMaterialDefined: true,
        countsTowardAdmission: 0,
        gateSatisfied: false
      },
      unchangedParentGateIds: [
        "deterministic_facts",
        "versioned_ruleset",
        "source_bundle",
        "rights_bundle",
        "expert_review_bundle",
        "release_evidence"
      ]
    },
    gateSummary: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 38,
      bindingFrozenVerified: 0,
      bindingRequirementsInventoryDefined: true,
      requirementsUniverseClosed: false,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      reviewerSeatsFilled: 0,
      expertOpinionsVerified: 0,
      productArtifactsPresent: 3,
      productArtifactIncrementFromOverlays: 0,
      rereviewRequirementsComplete: 3,
      rereviewRequirementsRequired: 7,
      rereviewTriggered: false,
      inputContractGateSatisfied: false,
      highRiskPolicyGateSatisfied: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseEvidenceComplete: false,
      formalAdmissionPromotionBlocked: true,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    productBoundary: {
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      legacyV13Inherited: false,
      schema13Inherited: false,
      baziAuthorityInherited: false,
      domainManifest: "absent",
      productSurface: "absent",
      runtimeImplementation: "absent",
      centralRegistryIntegration: "absent",
      parentLedgerUpdated: false,
      registryUpdated: false,
      activeAdmissionEffect: "none"
    },
    observationBoundary: {
      endpointSnapshotOnly: true,
      directContextEndpointSnapshots: 3,
      heldFileHandleReads: true,
      plainDirectoryChainRequired: true,
      pathEndpointRevalidated: true,
      sameBufferHashAndParsePerDirectContext: true,
      candidateHashAndParseUseSameHeldHandleBuffer: true,
      crossFileAtomicSnapshot: false,
      parentAndChildrenAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false,
      candidateObjectCarriesPrivateBrand: false,
      fixedLoaderMayReturnPrivateBrandedEnvelope: true,
      privateBrandMeaning:
        "fixed_path_endpoint_mechanical_observation_only_not_continued_currentness_or_authority"
    },
    evidenceLedgerSeparation: {
      engineeringEndpointEvidenceObserved: true,
      browserOrRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReadinessEstablished: false,
      publicReleaseAuthorizationEstablished: false
    },
    authorityBoundary: {
      engineeringObservationOnly: true,
      browserRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      expertIdentityCredentialsIndependenceEstablished: false,
      expertTruthEstablished: false,
      sourceFreezeEstablished: false,
      rightsLegalConclusionEstablished: false,
      highRiskClaimsAuthorized: false,
      formalAdmissionAuthorized: false,
      releaseEvidenceComplete: false,
      deploymentAndRollbackConfirmed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false,
      crossSystemAuthorityInheritanceAllowed: false
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: CANDIDATE_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      authenticityEstablished: false,
      digitalSignature: null,
      signerIdentity: null
    },
    doesNotEstablish: [
      "formal_parent_supersession_rewrite_or_owner_acceptance",
      "parent_or_registry_projection_of_post_parent_children",
      "admitted_input_contract_or_product_input_rejection_capability",
      "admitted_or_enforced_high_risk_policy_or_policy_receipt",
      "source_binding_frozen_body_quote_locator_or_three_layer_rights",
      "content_domain_or_prediction_truth",
      "expert_identity_credentials_independence_opinion_or_expert_truth",
      "browser_runtime_storage_pwa_service_worker_host_or_rollback_evidence",
      "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
      "vedic_release_identity_target_schema_or_legacy_v13_inheritance",
      "release_readiness_public_deployment_public_release_or_expert_claims_authorization",
      "cross_system_authority_inheritance_or_concept_equivalence"
    ]
  };
  return deepFreeze(canonicalValue({
    ...unsigned,
    candidateDigest:
      computeVedicProductizationVersionAwareObservationCandidateDigest(unsigned)
  }));
}

export function verifyVedicProductizationVersionAwareObservationCandidateObject(
  value
) {
  const candidate = canonicalValue(value);
  const expected = buildCandidateProjection();
  if (!exactJson(candidate, expected)
    || candidate.candidateDigest
      !== computeVedicProductizationVersionAwareObservationCandidateDigest(candidate)) {
    fail("CANDIDATE_OBJECT_MISMATCH", "吠陀观察候选对象、摘要、计数或红门漂移。");
  }
  return deepFreeze(candidate);
}

export async function buildCurrentVedicProductizationVersionAwareObservationCandidate(
  workspaceRoot
) {
  await collectDirectCurrentContexts(workspaceRoot);
  return verifyVedicProductizationVersionAwareObservationCandidateObject(
    buildCandidateProjection()
  );
}

function assertExpectedPersistedPins(snapshot, candidate) {
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || EXPECTED_PERSISTED.rawSha256.length !== 64
    || EXPECTED_PERSISTED.candidateDigest.length !== 64) {
    fail("PERSISTED_PINS_NOT_FROZEN", "吠陀观察候选 raw/semantic identity 尚未冻结。");
  }
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_IDENTITY_DRIFT", "吠陀观察候选 persisted raw identity 漂移。");
  }
  if (candidate.candidateDigest !== EXPECTED_PERSISTED.candidateDigest) {
    fail("PERSISTED_SEMANTIC_IDENTITY_DRIFT", "吠陀观察候选 semantic identity 漂移。");
  }
}

export async function readCurrentVedicProductizationVersionAwareObservationCandidate(
  workspaceRoot
) {
  const expected =
    await buildCurrentVedicProductizationVersionAwareObservationCandidate(
      workspaceRoot
    );
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
    MAX_CANDIDATE_BYTES,
    {
      invalidCode: "CANDIDATE_ENDPOINT_INVALID",
      missingCode: "CANDIDATE_MISSING",
      label: "吠陀独立产品化版本感知观察候选"
    }
  );
  const persisted =
    parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
      snapshot.bytes
    );
  if (decodeStrictUtf8(snapshot.bytes, "吠陀独立产品化版本感知观察候选")
    !== canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate(
      persisted
    )) {
    fail("CANDIDATE_MATERIALIZATION_MISMATCH", "吠陀观察候选不是唯一 canonical LF materialization。");
  }
  const verified =
    verifyVedicProductizationVersionAwareObservationCandidateObject(persisted);
  if (!exactJson(verified, expected)) {
    fail("CANDIDATE_CURRENT_EXPECTATION_MISMATCH", "persisted 吠陀观察候选不等于当前三上下文允许的投影。");
  }
  assertExpectedPersistedPins(snapshot, verified);
  return verified;
}

export async function loadVedicProductizationVersionAwareObservationCandidate(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, PROCESS_OBJECT, [])
) {
  const candidate =
    await readCurrentVedicProductizationVersionAwareObservationCandidate(
      workspaceRoot
    );
  const projection = deepFreeze({
    currentVedicProductizationObservationMechanicallyVerified: true,
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    artifact: {
      path:
        VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
      bytes: EXPECTED_PERSISTED.rawBytes,
      sha256: EXPECTED_PERSISTED.rawSha256
    },
    directCurrentContextAccounting: {
      directCurrentContextCount: 3,
      postParentChildContextCount: 2,
      upstreamCapabilityBrandCount: 0,
      baselineParentVerifierPassed: true,
      inputStructuralDiagnosticsVerifierPassed: true,
      highRiskRequirementsPolicyVerifierPassed: true
    },
    versionBoundary: {
      baselineParentSchemaVersion: "1.0.0",
      observationCandidateSchemaVersion: "1.1.0",
      supersedesBaseline: false,
      parentRewritten: false,
      ownerDecision: null
    },
    fixedProjectGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      inheritedByVedicProductIdentity: false
    },
    vedicProductIdentity: {
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null
    },
    admissionAccounting: {
      admissionGatesSatisfied: 0,
      admissionGatesRequired: 8,
      bindingFrozenVerified: 0,
      bindingRequired: 38,
      requirementsUniverseClosed: false,
      independentExpertReviewsVerified: 0,
      independentExpertsRequired: 2,
      productArtifactsPresent: 3,
      rereviewRequirementsComplete: 3,
      rereviewRequirementsRequired: 7
    },
    inputDiagnosticAccounting: {
      diagnosticProbeExecutions: 4,
      acceptedInputs: 0,
      inputInstances: 0,
      productInputRejectionReceipts: 0,
      inputRejectionCapabilityEstablished: false,
      probeCoverageComplete: false,
      inputContractGateSatisfied: false
    },
    highRiskPolicyAccounting: {
      requirementsMaterialDefined: true,
      highRiskPolicyCandidatePresent: true,
      highRiskPolicyEstablished: false,
      highRiskPolicyGateSatisfied: false,
      policyEnforced: false,
      receiptIssued: false,
      riskUniverseClosed: false
    },
    activeAdmissionEffect: "none",
    parentLedgerUpdated: false,
    registryUpdated: false,
    observationRedGates: {
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      parentAndChildrenAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    authorityRedGates: {
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false
    }
  });
  const result = deepFreeze(canonicalValue(projection));
  if (!exactJson(result, projection)) {
    fail(
      "VERIFIED_RESULT_PROJECTION_MISMATCH",
      "吠陀观察候选最终结果与允许的全红投影不一致。"
    );
  }
  requireImmutableFailClosedResult(result);
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedVedicProductizationVersionAwareObservationCandidate(
  value
) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && isRecursivelyFrozenPassive(value);
}

export const vedicProductizationVersionAwareObservationCandidateTestOnly =
  OBJECT_FREEZE({
    CANDIDATE_ID,
    RECORD_TYPE,
    CANDIDATE_STATUS,
    CANDIDATE_DIGEST_DOMAIN,
    PARENT_CONTEXT,
    INPUT_CONTEXT,
    HIGH_RISK_CONTEXT,
    DIRECT_CONTEXTS,
    PARENT_GATE_STATES,
    RELEASE_GOVERNANCE_CONTEXT,
    EXPECTED_PERSISTED,
    MAX_CANDIDATE_BYTES,
    canonicalStringify,
    exactJson,
    buildCandidateProjection,
    collectDirectCurrentContexts,
    readStableWorkspaceFile,
    safeWorkspaceFile
  });
