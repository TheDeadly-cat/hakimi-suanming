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

import {
  canonicalStringifyVedicProductizationRequirements,
  computeVedicProductizationRequirementsDigest,
  parseVedicProductizationRequirementsJsonBytes
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  computeVedicInputContractRequirementsDigest,
  parseVedicInputContractRequirementsJsonBytes
} from "./vedic-input-contract-requirements-lib.mjs";
import {
  computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest,
  parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";
import {
  computeVedicRealIndependentExpertReviewPlanDigest,
  parseVedicRealIndependentExpertReviewPlanJsonBytes
} from "./vedic-real-independent-expert-review-plan-lib.mjs";
import {
  computeVedicProductizationVersionAwareObservationCandidateDigest,
  parseVedicProductizationVersionAwareObservationCandidateJsonBytes,
  verifyVedicProductizationVersionAwareObservationCandidateObject
} from "./vedic-independent-productization-version-aware-observation-candidate-lib.mjs";
import {
  computeVedicInputContractDraftSemanticDigest,
  parseVedicInputContractDraftJsonBytes
} from "./vedic-input-contract-draft-lib.mjs";
import {
  computeVedicInputStructuralRejectionEvidenceDigest,
  parseVedicInputStructuralRejectionEvidenceJsonBytes
} from "./vedic-input-structural-rejection-evidence-lib.mjs";

const MAX_CANDIDATE_BYTES = 512 * 1024;
const MAX_UPSTREAM_BYTES = 2 * 1024 * 1024;
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi/vedic-input-admission-readiness-candidate/v0.1.0";
const CANONICALIZATION_PROFILE =
  "sorted_object_keys_compact_json_finite_numbers_aliases_expanded_active_cycles_rejected_v1";
const SCHEMA_VERSION =
  "vedic-input-admission-readiness-candidate/v0.1.0";
const RECORD_TYPE = "vedic-input-admission-readiness-candidate";
const CANDIDATE_ID = "vedic-input-admission-readiness-candidate-v0.1.0";
const INTERNAL_CANDIDATE_JSON_LABEL = "吠陀输入准入准备候选 JSON";
const EXPECTED_CANDIDATE_DIGEST =
  "688a786525d8d8c988be2d517d31cca23113d788cadc3168cae5bbd71a6a1efb";
const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 35325,
  rawSha256: "7f42750a2d11a64bc9ad2cdbef5838aa7081d60fd314c44647079eae426f19dd"
});
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const JSON_STRINGIFY = JSON.stringify;
const TEST_ONLY_READ_PHASES = Object.freeze([
  "after-open",
  "before-read",
  "after-read"
]);

export const VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/vedic-input-admission-readiness-candidate.v0.1.0.json";

const EXPECTED_TOP_LEVEL_KEYS = Object.freeze([
  "activeAdmissionEffect",
  "authorityBoundary",
  "candidateDigest",
  "candidateId",
  "createdAt",
  "doesNotEstablish",
  "engineeringPrerequisites",
  "evidenceLedgerSeparation",
  "gateSummary",
  "integrityBoundary",
  "observationBoundary",
  "conjunctiveReadinessConditions",
  "privacyBoundary",
  "productBoundary",
  "projectReleaseGovernanceContext",
  "recordType",
  "requirementRows",
  "roleSeparationBoundary",
  "schemaVersion",
  "status",
  "systemIdentity",
  "upstreamBindings",
  "versionBoundary"
]);

const REQUIREMENT_SPECS = Object.freeze([
  ["civil_calendar_and_date", "input_declaration", ["civil_date_validity", "calendar_identity_version"]],
  ["local_wall_time_and_precision", "input_declaration", ["canonical_wall_time", "precision_vocabulary"]],
  ["birth_time_uncertainty_interval_or_candidates", "input_declaration", ["uncertainty_representation", "interval_ordering", "candidate_semantics"]],
  ["place_coordinates_and_precision", "input_declaration", ["coordinate_reference_system", "coordinate_precision_semantics", "location_privacy_boundary"]],
  ["iana_time_zone_and_tzdb_identity", "input_declaration", ["iana_zone_identity", "tzdb_version_identity", "coverage_update_policy"]],
  ["dst_gap_overlap_resolution", "input_declaration", ["dst_gap_overlap_classification", "dst_resolution_policy"]],
  ["utc_conversion_and_time_scale", "calculation_policy_declaration", ["utc_conversion_consistency", "time_scale_identity"]],
  ["ephemeris_identity_version_and_coverage", "calculation_policy_declaration", ["ephemeris_identity_version_digest", "ephemeris_coverage"]],
  ["sidereal_zodiac_declaration", "calculation_policy_declaration", ["sidereal_zodiac_identity_version"]],
  ["ayanamsa_identity_and_version", "calculation_policy_declaration", ["ayanamsa_identity_version"]],
  ["rahu_ketu_mode", "calculation_policy_declaration", ["node_mode_definition_version"]],
  ["bhava_house_definition", "calculation_policy_declaration", ["bhava_definition_version"]],
  ["birth_time_perturbation_candidates_and_transition_points", "calculation_policy_declaration", ["perturbation_candidate_semantics", "transition_ordering", "perturbation_policy_identity"]]
].map(([requirementId, requirementClass, requiredSemanticInvariantIds]) =>
  Object.freeze({
    requirementId,
    requirementClass,
    requiredSemanticInvariantIds: Object.freeze(requiredSemanticInvariantIds)
  })));
const EXPECTED_REQUIREMENT_IDS = Object.freeze(
  REQUIREMENT_SPECS.map((spec) => spec.requirementId)
);

const READINESS_CONDITION_SPECS = Object.freeze([
  ["product_owner", "all_thirteen_owner_selections_and_scope_decisions_accepted"],
  ["source_provenance_review", "all_thirteen_source_or_first_party_provenance_bindings_frozen_verified"],
  ["source_rights_and_legal_review", "all_thirteen_work_version_carrier_rights_and_distribution_dispositions_complete"],
  ["two_independent_vedic_domain_experts", "two_independent_domain_opinions_cover_same_frozen_thirteen_requirement_packet"],
  ["independent_source_rights_review_and_legal_authority", "two_independent_source_rights_reviews_and_legal_authority_disposition_complete"],
  ["engineering_reproducibility_review", "schema_specific_structural_and_semantic_validator_receipts_complete"],
  ["engineering_data_lifecycle_review", "mutation_epoch_atomic_snapshot_aba_and_private_input_lifecycle_receipts_complete"],
  ["product_owner_and_formal_admission_governance", "owner_supersession_formal_parent_and_central_registry_projection_complete"]
].map(([authorityOwner, conditionId]) => Object.freeze({ authorityOwner, conditionId })));

const EXPECTED_UPSTREAM_PATHS = Object.freeze([
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md",
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json",
  "content/system-admission/vedic-input-contract-requirements.v1.json",
  "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
  "content/system-admission/vedic-real-independent-expert-review-plan.v1.json",
  "content/system-admission/vedic-independent-productization-requirements.v1.json",
  "content/system-admission/vedic-independent-productization-version-aware-observation-candidate.v1.1.0.json",
  "content/system-admission/vedic-input-structural-rejection-execution-evidence.v1.json",
  "packages/vedic-input-preflight-draft/package.json",
  "packages/vedic-input-preflight-draft/tsconfig.json",
  "packages/vedic-input-preflight-draft/vitest.config.ts",
  "packages/vedic-input-preflight-draft/vite.browser-preflight.config.mjs",
  "packages/vedic-input-preflight-draft/playwright.browser-preflight.config.ts",
  "packages/vedic-input-preflight-draft/README.md",
  "packages/vedic-input-preflight-draft/browser-app/index.html",
  "packages/vedic-input-preflight-draft/e2e/browser-preflight.spec.ts",
  "packages/vedic-input-preflight-draft/scripts/serve-fresh-browser-preflight.mjs",
  "packages/vedic-input-preflight-draft/src/virtual-schema.d.ts",
  "packages/vedic-input-preflight-draft/src/protocol.ts",
  "packages/vedic-input-preflight-draft/src/preflight.ts",
  "packages/vedic-input-preflight-draft/src/preflight.test.ts",
  "packages/vedic-input-preflight-draft/src/browser-worker.ts",
  "packages/vedic-input-preflight-draft/src/browser-client.ts",
  "packages/vedic-input-preflight-draft/src/browser-client.test.ts",
  "packages/vedic-input-preflight-draft/src/browser-app/main.ts",
  "packages/vedic-input-preflight-draft/src/browser-app/styles.css",
  "docs/吠陀独立输入结构预检浏览器Worker草案-v0.1-2026-08-30.md",
  "scripts/system-contract-draft-registry.json",
  "packages/vedic-input-preflight-draft/dist/browser-app/index.html",
  "packages/vedic-input-preflight-draft/dist/browser-app/assets/browser-worker-D9nX9PvL.js",
  "packages/vedic-input-preflight-draft/dist/browser-app/assets/browser-worker-D9nX9PvL.js.map",
  "packages/vedic-input-preflight-draft/dist/browser-app/assets/index-yQhygIFy.js",
  "packages/vedic-input-preflight-draft/dist/browser-app/assets/index-yQhygIFy.js.map",
  "packages/vedic-input-preflight-draft/dist/browser-app/assets/index-CRHLBWku.css"
]);

const VERIFIED_RESULTS = new WeakSet();

export class VedicInputAdmissionReadinessCandidateError extends Error {
  constructor(code, message, cause) {
    super(code + ": " + message, cause === undefined ? undefined : { cause });
    this.name = "VedicInputAdmissionReadinessCandidateError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new VedicInputAdmissionReadinessCandidateError(code, message, cause);
}

function canonicalStringify(value) {
  try {
    return canonicalStringifyVedicProductizationRequirements(value);
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionReadinessCandidateError) throw cause;
    fail("NON_CANONICAL_JSON", "吠陀输入准入准备候选只接受有限、被动、无 active cycle 且可规范化的 JSON 值。", cause);
  }
}

function canonicalValue(value) {
  try {
    return JSON.parse(canonicalStringify(value));
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionReadinessCandidateError) throw cause;
    fail("NON_CANONICAL_JSON", "吠陀输入准入准备候选无法形成规范 JSON 快照。", cause);
  }
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_PASSIVE_OBJECT", "吠陀输入准入准备候选冻结前发现 accessor。 ");
    }
    deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function isRecursivelyFrozenPassive(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return true;
  if (!Object.isFrozen(value)) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)
        || !isRecursivelyFrozenPassive(descriptor.value, seen)) return false;
    }
  } catch {
    return false;
  }
  return true;
}

function requirePlainRecord(value, code, label) {
  let isArray;
  let isProxy;
  let prototype;
  try {
    isArray = Array.isArray(value);
    isProxy = value !== null && typeof value === "object"
      ? utilTypes.isProxy(value)
      : false;
    prototype = value !== null && typeof value === "object" && !isProxy
      ? Object.getPrototypeOf(value)
      : null;
  } catch (cause) {
    fail(code, label + " 无法作为被动普通 JSON 对象安全检查。", cause);
  }
  if (value === null || typeof value !== "object" || isArray
    || isProxy || prototype !== Object.prototype) {
    fail(code, label + " 必须是普通 JSON 对象。");
  }
  return value;
}

function requireExactKeys(value, expected, code, label) {
  const record = requirePlainRecord(value, code, label);
  let actual;
  try {
    actual = Object.keys(record).sort();
  } catch (cause) {
    fail(code, label + " 的字段无法安全枚举。", cause);
  }
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])) {
    fail(code, label + " 含缺失、陈旧或额外字段。");
  }
  return record;
}

function requireAllFalseExact(value, expectedKeys, code, label) {
  const record = requireExactKeys(value, expectedKeys, code, label);
  if (expectedKeys.some((key) => record[key] !== false)) {
    fail(code, label + " 必须逐项保持 false。");
  }
  return record;
}

function requireEmptyArray(value, code, label) {
  if (!Array.isArray(value) || value.length !== 0) {
    fail(code, label + " 必须保持空数组。");
  }
}

function domainSeparatedDigest(value) {
  return createHash("sha256")
    .update(CANDIDATE_DIGEST_DOMAIN, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringify(value), "utf8")
    .digest("hex");
}

export function computeVedicInputAdmissionReadinessCandidateDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.candidateDigest;
  return domainSeparatedDigest(unsigned);
}

export function canonicalStringifyVedicInputAdmissionReadinessCandidate(value) {
  return canonicalStringify(value);
}

export function canonicalPrettyStringifyVedicInputAdmissionReadinessCandidate(value) {
  // Validate the complete graph with the sorted-key canonicalizer first, then
  // preserve the fixed artifact's reviewed insertion order for its LF raw form.
  canonicalStringify(value);
  return JSON_STRINGIFY.call(JSON, value, null, 2) + "\n";
}

export function parseVedicInputAdmissionReadinessCandidateJsonBytes(
  bytes,
  _callerLabel = INTERNAL_CANDIDATE_JSON_LABEL,
  maxBytes = MAX_CANDIDATE_BYTES
) {
  try {
    const parsed = parseVedicProductizationRequirementsJsonBytes(
      bytes,
      INTERNAL_CANDIDATE_JSON_LABEL,
      maxBytes
    );
    // Preserve the strict parser's passive insertion order so the fixed raw LF
    // materialization can be compared byte-for-byte. Semantic hashing below is
    // still independently sorted-key canonical and therefore order-neutral.
    return parsed;
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionReadinessCandidateError) throw cause;
    const code = typeof cause?.code === "string" ? cause.code : "JSON_INVALID";
    const safeMessage = code === "JSON_TOO_LARGE"
      ? INTERNAL_CANDIDATE_JSON_LABEL + " 超过输入上限。"
      : INTERNAL_CANDIDATE_JSON_LABEL + " 不符合严格 JSON 字节边界。";
    fail(code, safeMessage, cause);
  }
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length < 1
    || relativePath.length > 400 || relativePath.includes("\0")
    || relativePath.includes("\\") || relativePath.includes(":")
    || relativePath.startsWith("/")
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.split("/").some((segment) =>
      segment === "" || segment === "." || segment === "..")) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀输入准入准备候选文件路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (relative === "" || relative === ".."
    || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    fail("UNSAFE_ARTIFACT_PATH", "吠陀输入准入准备候选文件路径越出工作区。");
  }
  return absolute;
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".."
    && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

function sameEndpoint(left, right) {
  return left.dev === right.dev && left.ino === right.ino
    && left.nlink === right.nlink && left.size === right.size
    && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

function isStatsType(metadata, expectedType) {
  return metadata !== null && typeof metadata === "object"
    && Number.isSafeInteger(metadata.mode)
    && (metadata.mode & fsConstants.S_IFMT) === expectedType;
}

async function capturePlainDirectoryChain(workspaceRoot, absolutePath, invalidCode, label) {
  const root = path.resolve(workspaceRoot);
  const targetDirectory = path.dirname(path.resolve(absolutePath));
  if (!isSameOrWithin(root, targetDirectory)) {
    fail(invalidCode, label + " 的目录链越出工作区。");
  }
  const relative = path.relative(root, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints = [];
  let cursor = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    const metadata = await lstat(cursor);
    if (isStatsType(metadata, fsConstants.S_IFLNK)
      || !isStatsType(metadata, fsConstants.S_IFDIR)) {
      fail(invalidCode, label + " 的目录链不能包含链接、junction 或特殊端点。");
    }
    const resolvedPath = await realpath(cursor);
    if (endpoints.length > 0 && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      fail(invalidCode, label + " 的目录链 realpath 越出工作区。");
    }
    endpoints.push(Object.freeze({ absolutePath: cursor, metadata, resolvedPath }));
  }
  return Object.freeze(endpoints);
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined && entry.absolutePath === other.absolutePath
      && entry.resolvedPath === other.resolvedPath
      && sameEndpoint(entry.metadata, other.metadata);
  });
}

function openFileDescriptor(absolutePath, flags) {
  return new Promise((resolve, reject) => {
    openFileDescriptorCallback(absolutePath, flags, (error, descriptor) => {
      if (error) reject(error);
      else resolve(descriptor);
    });
  });
}

function statFileDescriptor(descriptor) {
  return new Promise((resolve, reject) => {
    statFileDescriptorCallback(descriptor, (error, metadata) => {
      if (error) reject(error);
      else resolve(metadata);
    });
  });
}

function readFileDescriptor(descriptor, buffer, offset, length, position) {
  return new Promise((resolve, reject) => {
    readFileDescriptorCallback(
      descriptor,
      buffer,
      offset,
      length,
      position,
      (error, bytesRead) => {
        if (error) reject(error);
        else resolve(bytesRead);
      }
    );
  });
}

function closeFileDescriptor(descriptor) {
  return new Promise((resolve, reject) => {
    closeFileDescriptorCallback(descriptor, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function readExactOpenedSize(descriptor, expectedSize, invalidCode, label) {
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) {
    fail(invalidCode, label + " 的已打开文件尺寸无效。");
  }
  const bytes = Buffer.allocUnsafe(expectedSize);
  let total = 0;
  while (total < expectedSize) {
    const bytesRead = await readFileDescriptor(
      descriptor,
      bytes,
      total,
      expectedSize - total,
      total
    );
    if (bytesRead === 0) fail(invalidCode, label + " 在 held-handle 读取期间提前截断。");
    total += bytesRead;
  }
  const growthProbe = Buffer.allocUnsafe(1);
  const growthBytesRead = await readFileDescriptor(
    descriptor,
    growthProbe,
    0,
    1,
    expectedSize
  );
  if (growthBytesRead !== 0) fail(invalidCode, label + " 在 held-handle 读取期间增长。");
  return bytes;
}

async function runTestOnlyReadPhaseHook(options, phase) {
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(options, "testOnlyReadPhaseHook");
  } catch (cause) {
    fail("TEST_ONLY_READ_HOOK_INVALID", "test-only held-read phase hook 描述符不可安全读取。", cause);
  }
  if (descriptor === undefined) return;
  if (!("value" in descriptor)) {
    fail("TEST_ONLY_READ_HOOK_INVALID", "test-only held-read phase hook 不接受 accessor。");
  }
  const hook = descriptor.value;
  if (typeof hook !== "function") {
    fail("TEST_ONLY_READ_HOOK_INVALID", "test-only held-read phase hook 必须是函数。");
  }
  try {
    await hook(phase);
  } catch (cause) {
    fail("TEST_ONLY_READ_HOOK_FAILED", "test-only held-read phase hook 执行失败。", cause);
  }
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
    if (cause instanceof VedicInputAdmissionReadinessCandidateError) throw cause;
    fail(missingCode, label + " 不存在。", cause);
  }
  const root = directoryChainBefore[0].resolvedPath;
  if (!isSameOrWithin(root, actual) || isStatsType(before, fsConstants.S_IFLNK)
    || !isStatsType(before, fsConstants.S_IFREG) || before.nlink !== 1
    || before.size <= 0 || before.size > maxBytes) {
    fail(invalidCode, label + " 必须是工作区内独立普通小文件。");
  }

  const descriptor = await openFileDescriptor(actual, "r");
  try {
    await runTestOnlyReadPhaseHook(options, TEST_ONLY_READ_PHASES[0]);
    const opened = await statFileDescriptor(descriptor);
    if (!isStatsType(opened, fsConstants.S_IFREG) || opened.nlink !== 1
      || !sameEndpoint(before, opened)) {
      fail(invalidCode, label + " 在打开前发生身份换绑。");
    }
    await runTestOnlyReadPhaseHook(options, TEST_ONLY_READ_PHASES[1]);
    const bytes = await readExactOpenedSize(descriptor, opened.size, invalidCode, label);
    await runTestOnlyReadPhaseHook(options, TEST_ONLY_READ_PHASES[2]);
    const revalidatedBytes = await readExactOpenedSize(
      descriptor,
      opened.size,
      invalidCode,
      label
    );
    if (Buffer.compare(bytes, revalidatedBytes) !== 0) {
      fail(invalidCode, label + " 在 held-handle 双读取检查之间发生内容变化。");
    }
    const [afterHandle, afterPath, actualAfter, directoryChainAfter] = await Promise.all([
      statFileDescriptor(descriptor),
      lstat(absolute),
      realpath(absolute),
      capturePlainDirectoryChain(workspaceRoot, absolute, invalidCode, label)
    ]);
    if (isStatsType(afterPath, fsConstants.S_IFLNK)
      || !isStatsType(afterPath, fsConstants.S_IFREG) || afterPath.nlink !== 1
      || bytes.byteLength !== opened.size || !sameEndpoint(opened, afterHandle)
      || !sameEndpoint(opened, afterPath) || actualAfter !== actual
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)) {
      fail(invalidCode, label + " 在 held-handle 读取区间发生变化。");
    }
    return Object.freeze({
      bytes,
      rawBytes: bytes.byteLength,
      rawSha256: createHash("sha256").update(bytes).digest("hex")
    });
  } finally {
    await closeFileDescriptor(descriptor);
  }
}

function decodeStrictUtf8(bytes, label) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef
    && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", label + " 不得包含 UTF-8 BOM。");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", label + " 不是严格 UTF-8。", cause);
  }
}

function requireExactProjection(value, expected, code, label) {
  if (!exactJson(value, expected)) fail(code, label + " 漂移。");
}

function requireCandidateRows(rows) {
  if (!Array.isArray(rows) || rows.length !== REQUIREMENT_SPECS.length) {
    fail("REQUIREMENT_ROWS_MISMATCH", "吠陀输入准备行必须精确覆盖 13 项输入要求。");
  }
  for (let index = 0; index < REQUIREMENT_SPECS.length; index += 1) {
    const row = requireExactKeys(rows[index], [
      "currentEvidenceCounts", "currentGateProjection", "currentState",
      "draftRequirementPointer", "order", "requirementClass",
      "requirementId", "requiredSemanticInvariantIds", "subjectId"
    ], "REQUIREMENT_ROW_MISMATCH", "第 " + (index + 1) + " 个 readiness row");
    const spec = REQUIREMENT_SPECS[index];
    requireExactProjection(row.currentEvidenceCounts, {
      engineeringValidatorReceipts: 0,
      expertOpinionRefs: 0,
      ownerDecisionRefs: 0,
      rightsEvidenceRefs: 0,
      sourceBindingRefs: 0
    }, "REQUIREMENT_ROW_MISMATCH", "readiness row currentEvidenceCounts");
    requireAllFalseExact(row.currentGateProjection, [
      "admissionEligible", "engineeringValidationComplete", "expertReviewComplete",
      "mutationEpochProtected", "ownerSelectionAccepted", "rightsClosureComplete",
      "sourceBindingFrozenVerified"
    ], "REQUIREMENT_ROW_MISMATCH", "readiness row currentGateProjection");
    if (row.order !== index + 1
      || row.requirementId !== spec.requirementId
      || row.requirementClass !== spec.requirementClass
      || row.subjectId !== "vedic.input." + spec.requirementId
      || row.draftRequirementPointer
        !== "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json#/properties/"
          + spec.requirementId
      || row.currentState
        !== "draft_shape_defined_value_unselected_required_unbound"
      || !exactJson(row.requiredSemanticInvariantIds, spec.requiredSemanticInvariantIds)) {
      fail("REQUIREMENT_ROW_MISMATCH", "第 " + (index + 1) + " 个 readiness row 固定投影漂移。");
    }
  }
}

function requireConjunctiveReadinessConditions(value) {
  const readiness = requireExactKeys(value, [
    "additionalVersionedTransitionAndReceiptContractRequired",
    "allConditionsAloneConferEligibility",
    "allConditionsRequiredForFutureEligibility",
    "allEvidenceMustBindSameAdmissionEpoch", "allEvidenceMustBindSameFrozenPacket",
    "allRequirementsMustSatisfyAllRowPrerequisites", "automaticPromotionAllowed",
    "conditionSkippingAllowed", "conditions", "currentAdmissionEpochReceipt",
    "conditionsAreNecessaryNotSufficient", "currentFrozenPacketDigest",
    "currentReadinessState",
    "formalSystemAdmissionConferred",
    "formalSystemAdmissionRequiresOtherProductizationGates",
    "futurePositiveTransitionsMechanicallyAccepted",
    "generativeModelMaySelectValuesOrWinners", "inputContractGateSatisfied",
    "majorityVoteAllowed", "partialCompletionMaySetGateTrue",
    "positiveReceiptSchemasDefined", "positiveTransitionEvaluatorImplemented",
    "positiveTransitionReceiptsAccepted", "publicReleaseAuthorizationConferred",
    "readinessModelType", "unresolvedOrAmbiguousEvidenceDisposition"
  ], "READINESS_CONDITIONS_MISMATCH", "吠陀输入合取准备条件");
  if (readiness.additionalVersionedTransitionAndReceiptContractRequired !== true
    || readiness.allConditionsAloneConferEligibility !== false
    || readiness.allConditionsRequiredForFutureEligibility !== true
    || readiness.allEvidenceMustBindSameAdmissionEpoch !== true
    || readiness.allEvidenceMustBindSameFrozenPacket !== true
    || readiness.allRequirementsMustSatisfyAllRowPrerequisites !== true
    || readiness.automaticPromotionAllowed !== false
    || readiness.conditionSkippingAllowed !== false
    || readiness.conditionsAreNecessaryNotSufficient !== true
    || readiness.currentAdmissionEpochReceipt !== null
    || readiness.currentFrozenPacketDigest !== null
    || readiness.currentReadinessState !== "requirements_only_not_admitted"
    || readiness.formalSystemAdmissionConferred !== false
    || readiness.formalSystemAdmissionRequiresOtherProductizationGates !== true
    || readiness.futurePositiveTransitionsMechanicallyAccepted !== false
    || readiness.generativeModelMaySelectValuesOrWinners !== false
    || readiness.inputContractGateSatisfied !== false
    || readiness.majorityVoteAllowed !== false
    || readiness.partialCompletionMaySetGateTrue !== false
    || readiness.positiveReceiptSchemasDefined !== false
    || readiness.positiveTransitionEvaluatorImplemented !== false
    || readiness.positiveTransitionReceiptsAccepted !== 0
    || readiness.publicReleaseAuthorizationConferred !== false
    || readiness.readinessModelType
      !== "conjunctive_fail_closed_necessary_conditions_only"
    || readiness.unresolvedOrAmbiguousEvidenceDisposition
      !== "not_ready_no_product_receipt"
    || !Array.isArray(readiness.conditions)
    || readiness.conditions.length !== READINESS_CONDITION_SPECS.length) {
    fail("READINESS_CONDITIONS_MISMATCH", "吠陀输入合取准备条件必须保持仅必要非充分、同包同 epoch、不可跳步与全红当前态。");
  }
  for (let index = 0; index < READINESS_CONDITION_SPECS.length; index += 1) {
    const condition = requireExactKeys(readiness.conditions[index], [
      "authorityOwner", "conditionId", "currentState", "order",
      "requiredState", "satisfied"
    ], "READINESS_CONDITIONS_MISMATCH", "必要准备条件");
    const spec = READINESS_CONDITION_SPECS[index];
    if (condition.order !== index + 1
      || condition.authorityOwner !== spec.authorityOwner
      || condition.conditionId !== spec.conditionId
      || condition.requiredState !== true
      || condition.currentState !== false
      || condition.satisfied !== false) {
      fail("READINESS_CONDITIONS_MISMATCH", "第 " + (index + 1) + " 个必要准备条件漂移。");
    }
  }
}

function requireRawEndpoint(value, label, withRole = false, withSemantic = false) {
  const keys = ["bytes", "path", "sha256"];
  if (withRole) keys.push("role");
  if (withSemantic) keys.push("semanticDigest", "semanticDigestField");
  const endpoint = requireExactKeys(value, keys, "UPSTREAM_BINDINGS_MISMATCH", label);
  if (!Number.isSafeInteger(endpoint.bytes) || endpoint.bytes <= 0
    || endpoint.bytes > MAX_UPSTREAM_BYTES
    || typeof endpoint.path !== "string" || endpoint.path.length === 0
    || typeof endpoint.sha256 !== "string" || !SHA256_PATTERN.test(endpoint.sha256)
    || (withRole && (typeof endpoint.role !== "string" || endpoint.role.length === 0))
    || (withSemantic && (!SHA256_PATTERN.test(endpoint.semanticDigest)
      || !["schemaSemanticDigest", "ledgerDigest", "planDigest", "candidateDigest", "evidenceDigest"]
        .includes(endpoint.semanticDigestField)))) {
    fail("UPSTREAM_BINDINGS_MISMATCH", label + " 的路径、尺寸、摘要或角色字段无效。");
  }
  return endpoint;
}

function flattenCandidateEndpoints(upstream) {
  return [
    ...upstream.governanceAndAdmissionContext,
    upstream.nodeFixedProbeEngineeringChild,
    ...upstream.browserWorkerEngineeringClosure.sourceEndpoints,
    upstream.browserWorkerEngineeringClosure.documentationEndpoint,
    upstream.browserWorkerEngineeringClosure.engineeringRegistryEndpoint,
    ...upstream.browserWorkerEngineeringClosure.buildEndpoints
  ];
}

function requireUpstreamBindings(value) {
  const upstream = requireExactKeys(value, [
    "bindingDirection", "browserWorkerEngineeringClosure",
    "candidateBacklinkedByUpstreams", "childBindsOrRewritesUpstreams",
    "exactEndpointCount", "governanceAndAdmissionContext",
    "nodeFixedProbeEngineeringChild"
  ], "UPSTREAM_BINDINGS_MISMATCH", "吠陀输入准备上游绑定");
  if (upstream.bindingDirection !== "exact_current_endpoint_snapshots_to_candidate_only"
    || upstream.candidateBacklinkedByUpstreams !== false
    || upstream.childBindsOrRewritesUpstreams !== false
    || upstream.exactEndpointCount !== EXPECTED_UPSTREAM_PATHS.length
    || !Array.isArray(upstream.governanceAndAdmissionContext)
    || upstream.governanceAndAdmissionContext.length !== 7) {
    fail("UPSTREAM_BINDINGS_MISMATCH", "吠陀输入准备上游绑定方向、回链或数量漂移。");
  }
  for (let index = 0; index < upstream.governanceAndAdmissionContext.length; index += 1) {
    requireRawEndpoint(
      upstream.governanceAndAdmissionContext[index],
      "governanceAndAdmissionContext[" + index + "]",
      true,
      index !== 0
    );
  }
  requireRawEndpoint(
    upstream.nodeFixedProbeEngineeringChild,
    "nodeFixedProbeEngineeringChild",
    true,
    true
  );
  const browser = requireExactKeys(upstream.browserWorkerEngineeringClosure, [
    "buildEndpoints", "documentationEndpoint", "engineeringRegistryEndpoint",
    "sourceEndpoints"
  ], "UPSTREAM_BINDINGS_MISMATCH", "browserWorkerEngineeringClosure");
  if (!Array.isArray(browser.sourceEndpoints) || browser.sourceEndpoints.length !== 18
    || !Array.isArray(browser.buildEndpoints) || browser.buildEndpoints.length !== 6) {
    fail("UPSTREAM_BINDINGS_MISMATCH", "浏览器 Worker 工程闭包必须精确保持 18 source + 6 build endpoints。");
  }
  for (let index = 0; index < browser.sourceEndpoints.length; index += 1) {
    requireRawEndpoint(browser.sourceEndpoints[index], "sourceEndpoints[" + index + "]");
  }
  requireRawEndpoint(browser.documentationEndpoint, "documentationEndpoint");
  requireRawEndpoint(browser.engineeringRegistryEndpoint, "engineeringRegistryEndpoint");
  for (let index = 0; index < browser.buildEndpoints.length; index += 1) {
    requireRawEndpoint(browser.buildEndpoints[index], "buildEndpoints[" + index + "]");
  }
  const endpoints = flattenCandidateEndpoints(upstream);
  if (endpoints.length !== EXPECTED_UPSTREAM_PATHS.length
    || endpoints.some((endpoint, index) => endpoint.path !== EXPECTED_UPSTREAM_PATHS[index])
    || new Set(endpoints.map((endpoint) => endpoint.path)).size !== endpoints.length) {
    fail("UPSTREAM_BINDINGS_MISMATCH", "34 个上游 endpoint 的固定路径、顺序或唯一性漂移。");
  }
  return endpoints;
}

function requireFailClosedBoundaries(candidate) {
  requireAllFalseExact(candidate.authorityBoundary, [
    "browserRuntimeEvidenceEstablished", "contentTruthEstablished",
    "domainAuthorityAuthorized", "expertClaimsAuthorized", "expertTruthEstablished",
    "formalAdmissionAuthorized", "highRiskClaimsAuthorized",
    "inputContractGateSatisfied", "publicDeploymentAuthorized",
    "publicReleaseAuthorized", "releaseEvidenceComplete", "releaseReady",
    "rightsLegalConclusionEstablished", "sourceFreezeEstablished"
  ], "AUTHORITY_BOUNDARY_MISMATCH", "authorityBoundary");
  requireExactProjection(candidate.observationBoundary, {
    abaExcluded: false,
    candidateHashAndParseUseSameReadBuffer: false,
    crossFileAtomicSnapshot: false,
    endpointSnapshotOnly: true,
    heldFileHandleReads: false,
    intervalMutationExcluded: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    parentAndChildrenAtomicSnapshot: false,
    pathEndpointRevalidated: false,
    plainDirectoryChainRequired: true,
    upstreamHashAndSemanticInspectionUseSameReadBuffer: false
  }, "OBSERVATION_BOUNDARY_MISMATCH", "observationBoundary");
  requireExactProjection(candidate.privacyBoundary, {
    arbitraryCandidateInputAuthorized: false,
    candidateDigestIsAnonymous: false,
    candidateDigestSafeToPublish: false,
    candidateInstancesIncluded: 0,
    fixedProbeReceiptsSafeOnlyBecauseNoPersonData: true,
    personalDataProcessedByThisCandidate: false,
    stableDigestForArbitraryCandidateForbiddenByGovernance: true,
    stableDigestMechanicallyBlockedForArbitraryCandidate: false
  }, "PRIVACY_BOUNDARY_MISMATCH", "privacyBoundary");
  requireExactProjection(candidate.roleSeparationBoundary, {
    conditionFiveBlocked: true,
    conditionFiveBlockedReason:
      "independent_legal_authority_role_seat_eligibility_signing_and_authenticity_schemas_absent",
    conditionFiveId:
      "two_independent_source_rights_reviews_and_legal_authority_disposition_complete",
    domainExpertMaySignRightsLegalConclusion: false,
    independentLegalAuthority: {
      authenticitySchemaDefined: false,
      eligibilitySchemaDefined: false,
      roleDefinition: "absent",
      seatCount: 0,
      signingSchemaDefined: false
    },
    rightsLegalConclusionEstablished: false,
    sourceRightsReviewerMaySignRightsLegalConclusion: false
  }, "ROLE_SEPARATION_BOUNDARY_MISMATCH", "roleSeparationBoundary");
  requireExactProjection(candidate.versionBoundary, {
    candidateIsFormalParent: false,
    centralRegistryUpdated: false,
    formalParentUpdated: false,
    ownerAcceptanceVerified: false,
    ownerDecision: null,
    supersedesBaseline: false,
    supersessionReceipt: null
  }, "VERSION_BOUNDARY_MISMATCH", "versionBoundary");
  requireExactProjection(candidate.productBoundary, {
    centralRegistryIntegration: "absent",
    domainManifest: "absent",
    inputContract: "isolated_contract_draft_not_admitted",
    migrationId: null,
    parentLedgerUpdated: false,
    productInputSurface: "absent",
    registryUpdated: false,
    releaseIdentity: null,
    runtimeImplementation: "absent",
    targetSchema: null
  }, "PRODUCT_BOUNDARY_MISMATCH", "productBoundary");
  requireExactProjection(candidate.projectReleaseGovernanceContext, {
    activeLine: "legacy-v13",
    expertClaimsAuthorized: false,
    inheritedByVedicProductIdentity: false,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    projectContextOnly: true,
    publicDeploymentAuthorized: false,
    targetSchema: 13
  }, "PROJECT_GOVERNANCE_MISMATCH", "projectReleaseGovernanceContext");
  requireExactProjection(candidate.systemIdentity, {
    authorityStatus: "not-authoritative",
    contractSystemId: "vedic",
    integrationStatus: "not-integrated",
    productStatus: "research-only",
    productSystemId: "vedic-astrology"
  }, "SYSTEM_IDENTITY_MISMATCH", "systemIdentity");
  requireExactProjection(candidate.integrityBoundary, {
    authenticityEstablished: false,
    candidateDigestExcludesOwnField: true,
    canonicalizationProfile: CANONICALIZATION_PROFILE,
    digestAlgorithm: "SHA-256",
    digestDomain: CANDIDATE_DIGEST_DOMAIN,
    digestIsDigitalSignature: false,
    digitalSignature: null,
    signerIdentity: null
  }, "INTEGRITY_BOUNDARY_MISMATCH", "integrityBoundary");
  const gate = requireExactKeys(candidate.gateSummary, [
    "acceptedInputs", "admissionEligibleRequirements", "admissionGatesRequired",
    "admissionGatesSatisfied", "browserWorkerEngineeringPrerequisitesObserved",
    "engineeringValidatedRequirements", "epochProtectedRequirements",
    "expertReviewedRequirements", "inputContractGateSatisfied",
    "nodeFixedProbeExecutions", "ownerAcceptedRequirements",
    "necessaryConditionsRequired", "necessaryConditionsSatisfied",
    "productInputInstances", "productInputRejectionReceipts",
    "requirementsDefined", "requirementsDraftCovered", "requirementsResolved",
    "requirementsSelected", "requirementsWithSemanticInvariantAllowlist",
    "rightsClosuresComplete", "semanticInvariantIdsRequired",
    "sourceBindingsFrozenVerified"
  ], "GATE_SUMMARY_MISMATCH", "gateSummary");
  if (gate.requirementsDefined !== 13 || gate.requirementsDraftCovered !== 13
    || gate.requirementsWithSemanticInvariantAllowlist !== 13
    || gate.semanticInvariantIdsRequired !== 26
    || gate.admissionGatesRequired !== 8 || gate.necessaryConditionsRequired !== 8
    || gate.nodeFixedProbeExecutions !== 4
    || gate.browserWorkerEngineeringPrerequisitesObserved !== 1
    || Object.entries(gate).some(([key, value]) => ![
      "requirementsDefined", "requirementsDraftCovered",
      "requirementsWithSemanticInvariantAllowlist", "semanticInvariantIdsRequired",
      "admissionGatesRequired", "necessaryConditionsRequired",
      "nodeFixedProbeExecutions", "browserWorkerEngineeringPrerequisitesObserved",
      "inputContractGateSatisfied"
    ].includes(key) && value !== 0)
    || gate.inputContractGateSatisfied !== false) {
    fail("GATE_SUMMARY_MISMATCH", "gateSummary 未保持固定 13 行、8 条件与零准入投影。");
  }
}

// The self digest detects unsigned corruption. The separately frozen expected
// digest makes every self-resigned nested change fail closed; the explicit
// validators below additionally expose the intended row/state/upstream/red
// schema instead of silently treating the digest as a schema registry.
function requireCandidateProjection(candidate) {
  if (typeof candidate.candidateDigest !== "string"
    || !SHA256_PATTERN.test(candidate.candidateDigest)
    || candidate.candidateDigest
      !== computeVedicInputAdmissionReadinessCandidateDigest(candidate)) {
    fail("CANDIDATE_DIGEST_MISMATCH", "吠陀输入准入准备候选 domain-separated digest 无效。");
  }
  if (candidate.candidateDigest !== EXPECTED_CANDIDATE_DIGEST) {
    fail("CANDIDATE_OBJECT_MISMATCH", "吠陀输入准入准备候选自重签后仍不等于冻结的 exact semantic projection。");
  }
  requireExactKeys(
    candidate,
    EXPECTED_TOP_LEVEL_KEYS,
    "CANDIDATE_OBJECT_MISMATCH",
    "吠陀输入准入准备候选顶层"
  );
  if (candidate.schemaVersion !== SCHEMA_VERSION
    || candidate.recordType !== RECORD_TYPE
    || candidate.candidateId !== CANDIDATE_ID
    || candidate.createdAt !== "2026-08-30T00:00:00.000Z"
    || candidate.status
      !== "thirteen_requirement_conjunctive_readiness_conditions_defined_zero_resolved_zero_admission_effect"
    || candidate.activeAdmissionEffect !== "none") {
    fail("CANDIDATE_OBJECT_MISMATCH", "吠陀输入准入准备候选固定身份、时间、状态或零准入效果漂移。");
  }
  requireCandidateRows(candidate.requirementRows);
  requireConjunctiveReadinessConditions(candidate.conjunctiveReadinessConditions);
  requireUpstreamBindings(candidate.upstreamBindings);
  requireFailClosedBoundaries(candidate);
  requirePlainRecord(candidate.engineeringPrerequisites,
    "ENGINEERING_PREREQUISITES_MISMATCH", "engineeringPrerequisites");
  requirePlainRecord(candidate.evidenceLedgerSeparation,
    "EVIDENCE_LEDGER_SEPARATION_MISMATCH", "evidenceLedgerSeparation");
  if (!Array.isArray(candidate.doesNotEstablish)
    || candidate.doesNotEstablish.length !== 13) {
    fail("DOES_NOT_ESTABLISH_MISMATCH", "doesNotEstablish 必须保持冻结的 13 项否定权限边界。");
  }
  return candidate;
}

export function verifyVedicInputAdmissionReadinessCandidateObject(value) {
  let invalidRoot;
  try {
    invalidRoot = value === null || typeof value !== "object"
      || Array.isArray(value) || utilTypes.isProxy(value);
  } catch (cause) {
    fail("CANDIDATE_OBJECT_MISMATCH", "吠陀输入准入准备候选根无法安全检查。", cause);
  }
  if (invalidRoot) {
    fail("CANDIDATE_OBJECT_MISMATCH", "吠陀输入准入准备候选根必须是普通 JSON 对象。");
  }
  let candidate;
  try {
    candidate = canonicalValue(value);
  } catch (cause) {
    if (cause instanceof VedicInputAdmissionReadinessCandidateError
      && cause.code === "CANDIDATE_OBJECT_MISMATCH") throw cause;
    fail("CANDIDATE_OBJECT_MISMATCH", "吠陀输入准入准备候选对象不是安全被动 JSON 投影。", cause);
  }
  requireCandidateProjection(candidate);
  return deepFreeze(candidate);
}

function parseSemanticEndpoint(endpoint, snapshot, parser, digestComputer, digestField, label) {
  let value;
  let computed;
  try {
    value = parser(snapshot.bytes, label, MAX_UPSTREAM_BYTES);
    computed = digestComputer(value);
  } catch (cause) {
    fail("UPSTREAM_SEMANTIC_BINDING_MISMATCH", label + " 无法从与 raw hash 相同的 held-handle buffer 完成严格语义检查。", cause);
  }
  if (endpoint.semanticDigestField !== digestField
    || (Object.hasOwn(value, digestField)
      && endpoint.semanticDigest !== value[digestField])
    || endpoint.semanticDigest !== computed) {
    fail("UPSTREAM_SEMANTIC_BINDING_MISMATCH", label + " 的声明语义摘要、对象内摘要与同 buffer 重算值不一致。");
  }
  return value;
}

async function collectCurrentUpstreamState(workspaceRoot, candidate) {
  const endpoints = requireUpstreamBindings(candidate.upstreamBindings);
  const snapshots = await Promise.all(endpoints.map((endpoint) =>
    readStableWorkspaceFile(workspaceRoot, endpoint.path, MAX_UPSTREAM_BYTES, {
      invalidCode: "UPSTREAM_ENDPOINT_INVALID",
      missingCode: "UPSTREAM_MISSING",
      label: "吠陀输入准备上游 " + endpoint.path
    })));
  for (let index = 0; index < endpoints.length; index += 1) {
    if (snapshots[index].rawBytes !== endpoints[index].bytes
      || snapshots[index].rawSha256 !== endpoints[index].sha256) {
      fail("UPSTREAM_RAW_IDENTITY_MISMATCH", "第 " + (index + 1) + " 个上游 endpoint 的 bytes/SHA-256 漂移。");
    }
  }
  const byPath = new Map(
    endpoints.map((endpoint, index) => [endpoint.path, { endpoint, snapshot: snapshots[index] }])
  );
  function semantic(pathName, parser, digestComputer, digestField, label) {
    const bound = byPath.get(pathName);
    if (!bound) fail("UPSTREAM_BINDINGS_MISMATCH", label + " 未出现在固定 34 endpoint 闭包中。");
    return parseSemanticEndpoint(
      bound.endpoint,
      bound.snapshot,
      parser,
      digestComputer,
      digestField,
      label
    );
  }

  const inputSchema = semantic(
    EXPECTED_UPSTREAM_PATHS[1],
    parseVedicInputContractDraftJsonBytes,
    computeVedicInputContractDraftSemanticDigest,
    "schemaSemanticDigest",
    "吠陀输入合同草案"
  );
  const inputLedger = semantic(
    EXPECTED_UPSTREAM_PATHS[2],
    parseVedicInputContractRequirementsJsonBytes,
    computeVedicInputContractRequirementsDigest,
    "ledgerDigest",
    "吠陀输入要求账"
  );
  const rightsLedger = semantic(
    EXPECTED_UPSTREAM_PATHS[3],
    parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes,
    computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest,
    "ledgerDigest",
    "吠陀来源权利要求账"
  );
  const expertPlan = semantic(
    EXPECTED_UPSTREAM_PATHS[4],
    parseVedicRealIndependentExpertReviewPlanJsonBytes,
    computeVedicRealIndependentExpertReviewPlanDigest,
    "planDigest",
    "吠陀现实独立专家计划"
  );
  const parent = semantic(
    EXPECTED_UPSTREAM_PATHS[5],
    parseVedicProductizationRequirementsJsonBytes,
    computeVedicProductizationRequirementsDigest,
    "ledgerDigest",
    "吠陀独立产品化历史父账"
  );
  const versionAwareParsed = semantic(
    EXPECTED_UPSTREAM_PATHS[6],
    parseVedicProductizationVersionAwareObservationCandidateJsonBytes,
    computeVedicProductizationVersionAwareObservationCandidateDigest,
    "candidateDigest",
    "吠陀版本感知观察候选"
  );
  let versionAware;
  try {
    versionAware = verifyVedicProductizationVersionAwareObservationCandidateObject(
      versionAwareParsed
    );
  } catch (cause) {
    fail("UPSTREAM_SEMANTIC_BINDING_MISMATCH", "版本感知观察候选不再等于其模块冻结的 exact projection。", cause);
  }
  const inputEvidence = semantic(
    EXPECTED_UPSTREAM_PATHS[7],
    parseVedicInputStructuralRejectionEvidenceJsonBytes,
    computeVedicInputStructuralRejectionEvidenceDigest,
    "evidenceDigest",
    "吠陀输入四探针结构拒绝证据"
  );
  return deepFreeze(canonicalValue({
    endpointSnapshots: endpoints.map((endpoint, index) => ({
      path: endpoint.path,
      rawBytes: snapshots[index].rawBytes,
      rawSha256: snapshots[index].rawSha256
    })),
    expertPlan,
    inputEvidence,
    inputLedger,
    inputSchema,
    parent,
    rightsLedger,
    versionAware
  }));
}

function requireCurrentUpstreamRedProjection(candidate, current) {
  const requirements = current.inputLedger?.requirementInventory?.requirements;
  if (!Array.isArray(requirements) || requirements.length !== 13) {
    fail("CURRENT_INPUT_REQUIREMENTS_MISMATCH", "当前 input requirements 未精确覆盖 13 行。");
  }
  const allSubjects = current.rightsLedger?.subjects;
  const inputSubjects = allSubjects?.slice(0, 13);
  const everyInputSubject = allSubjects?.filter(
    (subject) => typeof subject?.subjectId === "string"
      && subject.subjectId.startsWith("vedic.input.")
  );
  if (!Array.isArray(inputSubjects) || inputSubjects.length !== 13
    || !Array.isArray(everyInputSubject) || everyInputSubject.length !== 13
    || inputSubjects.some((subject, index) => subject !== everyInputSubject[index])) {
    fail("CURRENT_RIGHTS_SUBJECTS_MISMATCH", "当前 rights 账 subjects[0..12] 未精确覆盖且只覆盖 13 个 input subjects。");
  }
  for (let index = 0; index < EXPECTED_REQUIREMENT_IDS.length; index += 1) {
    const requirementId = EXPECTED_REQUIREMENT_IDS[index];
    const requirement = requirements[index];
    const subject = inputSubjects[index];
    const row = candidate.requirementRows[index];
    if (requirement?.order !== index + 1 || requirement?.requirementId !== requirementId
      || requirement?.requirementClass !== row.requirementClass
      || requirement?.requirementState !== "draft_shape_defined_value_unselected"
      || requirement?.selectedValue !== null || requirement?.defaultValue !== null
      || !exactJson(requirement?.artifactRefs, [row.draftRequirementPointer])
      || !exactJson(requirement?.instanceValues, [])
      || !exactJson(requirement?.sourceRefs, [])
      || !exactJson(requirement?.rightsRefs, [])
      || !exactJson(requirement?.expertRefs, [])
      || !exactJson(requirement?.evidenceRefs, [])
      || subject?.globalOrder !== index + 1 || subject?.layerOrder !== index + 1
      || subject?.layer !== "input" || subject?.requirementId !== requirementId
      || subject?.subjectId !== "vedic.input." + requirementId
      || subject?.bindingState !== "required_unbound"
      || subject?.selectedSourceCandidateId !== null
      || subject?.sourceBindingEstablished !== false
      || subject?.rightsLegalConclusionEstablished !== false
      || subject?.licenseEstablished !== false
      || subject?.redistributionAuthorized !== false
      || subject?.expertTruthEstablished !== false
      || subject?.contentTruthEstablished !== false
      || subject?.bindingDigest !== null || subject?.frozenBindingId !== null
      || subject?.frozenAt !== null || subject?.sourceBodyDigest !== null
      || subject?.workIdentity !== null || subject?.versionIdentity !== null
      || subject?.carrierIdentity !== null || subject?.sourceRightsRecordId !== null
      || subject?.sourceCarrierRecordId !== null
      || !exactJson(subject?.sourceCandidateIds, [])
      || !exactJson(subject?.sourceBodyRefs, [])
      || !exactJson(subject?.exactQuoteRefs, [])
      || !exactJson(subject?.exactLocatorRefs, [])
      || !exactJson(subject?.licenseEvidenceRefs, [])
      || !exactJson(subject?.workRightsEvidenceRefs, [])
      || !exactJson(subject?.versionRightsEvidenceRefs, [])
      || !exactJson(subject?.carrierRightsEvidenceRefs, [])
      || !exactJson(subject?.expertReviewIds, [])) {
      fail("CURRENT_REQUIREMENT_ROW_RED_PROJECTION_MISMATCH", "当前第 " + (index + 1) + " 个 input requirement/rights subject 不是精确未选择、未绑定全红投影。");
    }
  }

  const seats = current.expertPlan?.reviewerSeats;
  const zero = current.expertPlan?.zeroInstanceReceipt;
  const roles = current.expertPlan?.roleSeparation;
  const process = current.expertPlan?.reviewProcess;
  const automation = current.expertPlan?.automatedResolutionPolicy;
  if (!Array.isArray(seats) || seats.length !== 2
    || seats[0]?.slotId !== "vedic-domain-expert-a"
    || seats[1]?.slotId !== "vedic-domain-expert-b"
    || seats.some((seat) => seat.status !== "vacant"
      || seat.reviewerBinding !== null
      || seat.identityVerificationState !== "absent"
      || seat.credentialVerificationState !== "absent"
      || seat.scopeVerificationState !== "absent"
      || seat.independenceVerificationState !== "absent"
      || seat.originalOpinionStored !== false
      || seat.originalOpinionContextId !== null
      || seat.originalOpinionDigest !== null)
    || zero?.reviewerSlotsDefined !== 2 || zero?.reviewerSlotsOccupied !== 0
    || zero?.realExpertsIdentified !== 0 || zero?.identitiesVerified !== 0
    || zero?.credentialsVerified !== 0 || zero?.scopeFitsVerified !== 0
    || zero?.pairwiseIndependenceVerified !== 0 || zero?.opinionsVerified !== 0
    || zero?.independentExpertReviewsVerified !== 0
    || zero?.expertReviewBundles !== 0 || zero?.substantiveReviewStarted !== false
    || !Array.isArray(zero?.reviewerIds) || zero.reviewerIds.length !== 0
    || !Array.isArray(roles) || roles.length !== 3
    || !exactJson(roles.map((role) => role.roleId), [
      "vedic_domain_expert", "source_rights_reviewer",
      "engineering_reproducibility_reviewer"
    ])
    || roles.some((role) => role.roleId === "independent_legal_authority")
    || !roles[0]?.forbiddenScope?.includes("rights_legal_conclusion")
    || !roles[0]?.forbiddenScope?.includes("engineering_reproducibility_attestation")
    || !roles[1]?.forbiddenScope?.includes("vedic_domain_truth")
    || !roles[1]?.forbiddenScope?.includes("rights_legal_conclusion")
    || !roles[2]?.forbiddenScope?.includes("vedic_school_truth")
    || !roles.every((role) => role.forbiddenScope?.includes("public_release_authorization"))
    || process?.sameFrozenPacketRequired !== true
    || process?.sameQuestionSetRequired !== true
    || process?.mutualDisclosureBeforeBothOriginalOpinionsSealedAllowed !== false
    || process?.reconciliationMayOverwriteOriginals !== false
    || process?.substantiveReviewStarted !== false
    || automation?.generatedModelWinnerSelectionAllowed !== false
    || automation?.majorityVoteAllowed !== false
    || automation?.opinionAveragingAllowed !== false
    || automation?.unresolvedDisagreementMayBeAdopted !== false) {
    fail("CURRENT_EXPERT_RED_PROJECTION_MISMATCH", "当前专家计划不是两席 vacant、零身份资质独立性意见的角色隔离投影。");
  }

  const schemaBoundary = current.inputSchema?.["x-hakimiBoundary"];
  if (schemaBoundary?.acceptedInputsIncluded !== 0
    || schemaBoundary?.inputInstancesIncluded !== 0
    || schemaBoundary?.realPersonInputsIncluded !== 0
    || schemaBoundary?.requirementSelectionsIncluded !== 0
    || schemaBoundary?.requirementsResolved !== 0
    || schemaBoundary?.inputAccepted !== false
    || schemaBoundary?.inputContractGateSatisfied !== false
    || schemaBoundary?.formalAdmissionAuthorized !== false
    || schemaBoundary?.releaseReady !== false
    || schemaBoundary?.publicDeploymentAuthorized !== false
    || schemaBoundary?.publicReleaseAuthorized !== false) {
    fail("CURRENT_INPUT_SCHEMA_RED_PROJECTION_MISMATCH", "当前输入 schema 草案不再保持零实例、零选择与未准入边界。");
  }

  const evidence = current.inputEvidence;
  if (evidence?.executionBoundary?.diagnosticProbeExecutions !== 4
    || evidence?.executionBoundary?.acceptedInputs !== 0
    || evidence?.executionBoundary?.inputInstances !== 0
    || evidence?.executionBoundary?.productInputCandidates !== 0
    || evidence?.executionBoundary?.productInputRejectionReceipts !== 0
    || evidence?.probeCoverageBoundary?.fixedProbeSetVerified !== true
    || evidence?.probeCoverageBoundary?.inputRejectionCapabilityEstablished !== false
    || evidence?.probeCoverageBoundary?.probeCoverageComplete !== false
    || evidence?.probeCoverageBoundary?.structuralValidatorComplete !== false
    || evidence?.receiptBoundary?.inputContractGateSatisfied !== false
    || evidence?.receiptBoundary?.receiptIsProductReceipt !== false
    || evidence?.receiptBoundary?.requirementsResolved !== 0
    || Object.values(evidence?.authorityBoundary ?? {}).some((value) => value !== false)) {
    fail("CURRENT_NODE_EVIDENCE_RED_PROJECTION_MISMATCH", "当前四探针证据越过诊断工程前置条件或产生产品准入效果。");
  }

  const parentGate = current.parent?.gateSummary;
  if (parentGate?.admissionGatesRequired !== 8
    || parentGate?.admissionGatesSatisfied !== 0
    || parentGate?.bindingRequired !== 38
    || parentGate?.bindingFrozenVerified !== 0
    || parentGate?.independentExpertsRequired !== 2
    || parentGate?.independentExpertReviewsVerified !== 0
    || parentGate?.releaseReady !== false
    || parentGate?.publicReleaseAuthorized !== false
    || current.parent?.authorityBoundary?.formalAdmissionAuthorized !== false
    || current.parent?.authorityBoundary?.publicDeploymentAuthorized !== false) {
    fail("CURRENT_PARENT_RED_PROJECTION_MISMATCH", "当前历史父账不再保持 0/8、0/38、0/2 与未发布边界。");
  }

  if (current.versionAware?.productBoundary?.activeAdmissionEffect !== "none"
    || current.versionAware?.gateSummary?.admissionGatesSatisfied !== 0
    || current.versionAware?.gateSummary?.bindingFrozenVerified !== 0
    || current.versionAware?.gateSummary?.independentExpertReviewsVerified !== 0
    || current.versionAware?.gateSummary?.inputContractGateSatisfied !== false
    || current.versionAware?.authorityBoundary?.releaseReady !== false
    || current.versionAware?.authorityBoundary?.publicDeploymentAuthorized !== false
    || current.versionAware?.authorityBoundary?.publicReleaseAuthorized !== false
    || current.versionAware?.authorityBoundary?.expertClaimsAuthorized !== false
    || current.versionAware?.versionComparison?.candidateIsFormalParent !== false
    || current.versionAware?.versionComparison?.supersedesBaseline !== false) {
    fail("CURRENT_VERSION_AWARE_RED_PROJECTION_MISMATCH", "当前版本感知上游不再保持 0/13、0/2 与全红准入边界。");
  }

  // Candidate-side row/readiness-conditions/upstream equality is frozen separately;
  // this function proves the current independently verified upstreams remain red.
  void candidate;
}

async function readCurrentCandidateEnvelope(workspaceRoot) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH,
    MAX_CANDIDATE_BYTES,
    {
      invalidCode: "CANDIDATE_ENDPOINT_INVALID",
      missingCode: "CANDIDATE_MISSING",
      label: "吠陀输入准入准备候选"
    }
  );
  const parsed = parseVedicInputAdmissionReadinessCandidateJsonBytes(snapshot.bytes);
  if (decodeStrictUtf8(snapshot.bytes, "吠陀输入准入准备候选")
    !== canonicalPrettyStringifyVedicInputAdmissionReadinessCandidate(parsed)) {
    fail("CANDIDATE_MATERIALIZATION_MISMATCH", "吠陀输入准入准备候选不是唯一 canonical LF materialization。");
  }
  const candidate = verifyVedicInputAdmissionReadinessCandidateObject(parsed);
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_RAW_IDENTITY_DRIFT", "吠陀输入准入准备候选 persisted raw bytes/SHA-256 漂移。");
  }
  const current = await collectCurrentUpstreamState(workspaceRoot, candidate);
  requireCurrentUpstreamRedProjection(candidate, current);
  return Object.freeze({
    candidate,
    snapshot: Object.freeze({ rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 })
  });
}

export async function readCurrentVedicInputAdmissionReadinessCandidate(workspaceRoot) {
  const { candidate } = await readCurrentCandidateEnvelope(workspaceRoot);
  return candidate;
}

export async function loadVedicInputAdmissionReadinessCandidate(
  workspaceRoot = process.cwd()
) {
  const { candidate, snapshot } =
    await readCurrentCandidateEnvelope(workspaceRoot);
  const result = deepFreeze(canonicalValue({
    candidateId: candidate.candidateId,
    candidateDigest: candidate.candidateDigest,
    status: candidate.status,
    artifact: {
      path: VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256
    },
    requirementsResolved: candidate.gateSummary?.requirementsResolved,
    requirementsDefined: candidate.gateSummary?.requirementsDefined,
    admissionGatesSatisfied: candidate.gateSummary?.admissionGatesSatisfied,
    necessaryConditionsRequired: candidate.gateSummary?.necessaryConditionsRequired,
    necessaryConditionsSatisfied: candidate.gateSummary?.necessaryConditionsSatisfied,
    inputContractGateSatisfied: candidate.gateSummary?.inputContractGateSatisfied,
    activeAdmissionEffect: candidate.activeAdmissionEffect,
    formalAdmissionAuthorized: candidate.authorityBoundary?.formalAdmissionAuthorized,
    releaseReady: candidate.authorityBoundary?.releaseReady,
    publicDeploymentAuthorized: candidate.authorityBoundary?.publicDeploymentAuthorized,
    publicReleaseAuthorized: candidate.authorityBoundary?.publicReleaseAuthorized,
    expertClaimsAuthorized: candidate.authorityBoundary?.expertClaimsAuthorized,
    conjunctiveReadinessConditions: candidate.conjunctiveReadinessConditions,
    privacyBoundary: candidate.privacyBoundary,
    roleSeparationBoundary: candidate.roleSeparationBoundary,
    projectReleaseGovernanceContext: candidate.projectReleaseGovernanceContext,
    vedicProductBoundary: candidate.productBoundary,
    observationBoundary: {
      endpointSnapshotOnly: true,
      heldFileHandleReads: true,
      pathEndpointRevalidated: true,
      candidateHashAndParseUseSameHeldHandleBuffer: true,
      upstreamEndpointsObservedInOneNonAtomicBatch: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false,
      erasedPreloadExcluded: false,
      loadedModuleByteIdentityVerified: false,
      nodeLoaderIntegrityVerified: false,
      runtimeIntrinsicIntegrityVerified: false,
      runtimeLauncherIdentityVerified: false,
      simultaneousCurrentRawClosureVerified: false
    }
  }));
  if (result.requirementsResolved !== 0
    || result.requirementsDefined !== 13
    || result.admissionGatesSatisfied !== 0
    || result.necessaryConditionsRequired !== 8
    || result.necessaryConditionsSatisfied !== 0
    || result.inputContractGateSatisfied !== false
    || result.activeAdmissionEffect !== "none"
    || result.formalAdmissionAuthorized !== false
    || result.releaseReady !== false
    || result.publicDeploymentAuthorized !== false
    || result.publicReleaseAuthorized !== false
    || result.expertClaimsAuthorized !== false) {
    fail("VERIFIED_RESULT_PROJECTION_MISMATCH", "吠陀输入准入准备候选最终投影未保持 0/13 与全红边界。");
  }
  if (result.conjunctiveReadinessConditions?.conditionsAreNecessaryNotSufficient !== true
    || result.conjunctiveReadinessConditions?.allConditionsAloneConferEligibility !== false
    || result.conjunctiveReadinessConditions?.positiveTransitionEvaluatorImplemented !== false
    || result.conjunctiveReadinessConditions?.positiveReceiptSchemasDefined !== false
    || result.conjunctiveReadinessConditions?.positiveTransitionReceiptsAccepted !== 0
    || result.roleSeparationBoundary?.conditionFiveBlocked !== true
    || result.roleSeparationBoundary?.independentLegalAuthority?.roleDefinition !== "absent"
    || result.roleSeparationBoundary?.independentLegalAuthority?.seatCount !== 0
    || result.roleSeparationBoundary?.rightsLegalConclusionEstablished !== false
    || result.privacyBoundary?.arbitraryCandidateInputAuthorized !== false
    || result.privacyBoundary?.stableDigestForArbitraryCandidateForbiddenByGovernance !== true
    || result.privacyBoundary?.stableDigestMechanicallyBlockedForArbitraryCandidate !== false) {
    fail("VERIFIED_RESULT_PROJECTION_MISMATCH", "吠陀输入准入准备候选最终投影未保持必要非充分、法律角色缺口与隐私全红边界。");
  }
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedVedicInputAdmissionReadinessCandidate(value) {
  return value !== null && typeof value === "object"
    && VERIFIED_RESULTS.has(value) && isRecursivelyFrozenPassive(value);
}

export const vedicInputAdmissionReadinessCandidateTestOnly = Object.freeze({
  canonicalizationProfile: CANONICALIZATION_PROFILE,
  digestDomain: CANDIDATE_DIGEST_DOMAIN,
  requirementIds: EXPECTED_REQUIREMENT_IDS,
  topLevelKeys: EXPECTED_TOP_LEVEL_KEYS,
  CANDIDATE_DIGEST_DOMAIN,
  CANDIDATE_ID,
  EXPECTED_CANDIDATE_DIGEST,
  EXPECTED_PERSISTED,
  EXPECTED_UPSTREAM_PATHS,
  RECORD_TYPE,
  SCHEMA_VERSION,
  EXPECTED_TOP_LEVEL_KEYS,
  EXPECTED_REQUIREMENT_IDS,
  MAX_CANDIDATE_BYTES,
  MAX_UPSTREAM_BYTES,
  testOnlyReadPhases: TEST_ONLY_READ_PHASES,
  canonicalStringify,
  exactJson,
  requireCandidateProjection,
  requireCurrentUpstreamRedProjection,
  collectCurrentUpstreamState,
  readStableWorkspaceFile,
  safeWorkspaceFile
});
