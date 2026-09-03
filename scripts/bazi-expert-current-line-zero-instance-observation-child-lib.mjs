import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";

import {
  isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness,
  loadBaziKnowledgeCoreIdentityReboundBindingReadiness
} from "./bazi-knowledge-core-identity-rebound-binding-readiness-lib.mjs";
import {
  isVerifiedBaziExpertAuthorityMaterialPrecheck,
  loadBaziExpertAuthorityMaterialPrecheck
} from "./bazi-expert-authority-material-precheck-lib.mjs";

const CREATE_HASH = createHash;
const FS_LSTAT = lstat;
const FS_OPEN = open;
const FS_REALPATH = realpath;
const PATH_RESOLVE = path.resolve;
const PATH_SEP = path.sep;
const TEXT_DECODER = TextDecoder;
const IS_PROXY = utilTypes.isProxy;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_SORT = Array.prototype.sort;
const BUFFER_ALLOC = Buffer.alloc;
const BUFFER_CONCAT = Buffer.concat;
const BUFFER_FROM = Buffer.from;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NUMBER_IS_FINITE = Number.isFinite;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const STRING_SLICE = String.prototype.slice;
const STRING_TO_LOWER_CASE = String.prototype.toLowerCase;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;

const CHILD_ID = "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.0.0";
const RECORD_TYPE = "bazi_expert_current_line_zero_instance_observation_child_v1";
const DIGEST_DOMAIN = "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.0.0";
const CREATED_AT = "2026-09-01T14:00:00.000Z";
const MAX_ARTIFACT_BYTES = 1_000_000;
const SHA256 = /^[a-f0-9]{64}$/u;

export const BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_RELATIVE_PATH =
  "content/system-admission/bazi-expert-current-line-zero-instance-observation-child.v1.0.0.json";

const READINESS_V19 = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json",
  rawBytes: 45_551,
  rawSha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
  ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
  ledgerDigest: "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1"
});

const AUTHORITY_PRECHECK = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-authority-material-precheck.v1.json",
  rawBytes: 12_974,
  rawSha256: "ccfe28e4dfb8c1bd7a6764d6253cf818c37a712ea24225bd100092362cc1f2af",
  ledgerId: "hakimi.bazi.expert-authority-material-precheck/1.0.0",
  ledgerDigest: "0c68a77a135a6ad6205a9c0da3e37162a820ee2f273cb899783fe9a990526a80"
});

const HISTORICAL_INTAKE = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json",
  rawBytes: 32_579,
  rawSha256: "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df",
  ledgerId: "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0",
  ledgerDigest: "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582",
  digestDomain: "hakimi.bazi.expert-review-intake-gap.version-aware-candidate.v1.1"
});

const HISTORICAL_PRIVACY = OBJECT_FREEZE({
  path: "content/system-admission/bazi-expert-privacy-formal-intake-reconciliation.v1.json",
  rawBytes: 10_260,
  rawSha256: "f99612bd68adbe42145b0cc92030f44d54ee91eed574617690de8a4f109c9a17",
  ledgerId: "hakimi.bazi.expert-privacy-formal-intake-reconciliation/1.0.0",
  ledgerDigest: "cdf1a4d73a07b99a915e19f24672adbf6a4b42fb98754a0d679b32ec91eca3a2",
  digestDomain: "hakimi.bazi.expert-privacy-formal-intake-reconciliation.v1"
});

const PREVIOUS_KNOWLEDGE_CORE = OBJECT_FREEZE({
  path: "packages/knowledge-core/src/index.ts",
  rawBytes: 39_595,
  rawSha256: "9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0"
});

const CURRENT_KNOWLEDGE_CORE = OBJECT_FREEZE({
  path: "packages/knowledge-core/src/index.ts",
  rawBytes: 41_040,
  rawSha256: "85e86d6e28fbaee112a21daa4288be0c613b93d22138a5448a8f78bd33b20837"
});

const REVIEWER_SEAT_IDS = OBJECT_FREEZE(["domain-expert-a", "domain-expert-b"]);
const REVIEW_QUESTION_IDS = OBJECT_FREEZE([
  "month-command-hidden-stem-duplication",
  "relative-factor-weighting",
  "strength-band-thresholds",
  "strength-invalidation-structures"
]);
const INDEPENDENCE_FACTOR_IDS = OBJECT_FREEZE([
  "same_institution_or_organization",
  "teacher_student_or_lineage_relationship",
  "family_or_household_relationship",
  "shared_commercial_interest",
  "rule_or_case_set_coauthorship",
  "shared_professional_service",
  "reporting_or_supervision_relationship",
  "prior_exposure_to_other_reviewer_conclusion",
  "shared_unpublished_source_or_case_material",
  "same_upstream_algorithm_or_textbook_dependency"
]);

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 9_122,
  rawSha256: "c21d07363701fa15ad57ccabf333f2dfcb5200b816c3772fbc3ae830c5c5e3ce",
  childDigest: "f7e7a4a6b3580e451e06de8af29cf8c3b834b05234f9f97ec343a5b8ab1641db"
});

const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

export class BaziExpertCurrentLineZeroInstanceObservationChildError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziExpertCurrentLineZeroInstanceObservationChildError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziExpertCurrentLineZeroInstanceObservationChildError(code, message, cause);
}

function defineIndex(target, index, value) {
  REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [target, String(index), {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  }]);
}

function copyArray(values) {
  const result = [];
  for (let index = 0; index < values.length; index += 1) defineIndex(result, index, values[index]);
  return result;
}

function sha256Bytes(bytes) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Text(value) {
  const hash = CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [value, "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function canonicalValue(value, state = { active: new NATIVE_WEAK_SET(), seen: new NATIVE_WEAK_SET() }, depth = 0) {
  if (depth > 80) fail("NON_CANONICAL_JSON", "JSON 深度超过上限。");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && NUMBER_IS_FINITE(value) && !OBJECT_IS(value, -0)) return value;
  if (typeof value !== "object" || IS_PROXY(value)) {
    fail("NON_CANONICAL_JSON", "只接受有限、非 Proxy 的规范 JSON 值。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value]) || REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) {
    fail("NON_CANONICAL_JSON", "不接受循环或别名对象。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
  let result;
  if (REFLECT_APPLY(ARRAY_IS_ARRAY, Array, [value])) {
    if (prototype !== ARRAY_PROTOTYPE || REFLECT_OWN_KEYS(value).length !== value.length + 1) {
      fail("NON_CANONICAL_JSON", "数组必须稠密且无额外字段。");
    }
    result = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"]) || !descriptor.enumerable) {
        fail("NON_CANONICAL_JSON", "数组不得含 hole 或 accessor。");
      }
      defineIndex(result, index, canonicalValue(descriptor.value, state, depth + 1));
    }
  } else {
    if (prototype !== OBJECT_PROTOTYPE) fail("NON_CANONICAL_JSON", "对象原型不合法。");
    result = {};
    const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [value]);
    REFLECT_APPLY(ARRAY_SORT, keys, []);
    if (REFLECT_OWN_KEYS(value).length !== keys.length) fail("NON_CANONICAL_JSON", "对象不得含 symbol 或隐藏字段。");
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const descriptor = descriptors[key];
      if (key === "__proto__" || key === "constructor" || key === "prototype"
        || !descriptor || !REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"]) || !descriptor.enumerable) {
        fail("NON_CANONICAL_JSON", "对象含危险键、accessor 或隐藏字段。");
      }
      REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [result, key, {
        value: canonicalValue(descriptor.value, state, depth + 1),
        writable: true,
        enumerable: true,
        configurable: true
      }]);
    }
  }
  REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  return result;
}

function canonicalStringify(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [canonicalValue(value)]);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) return value;
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const keys = REFLECT_APPLY(OBJECT_KEYS, Object, [descriptors]);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = descriptors[keys[index]];
    if (descriptor && REFLECT_APPLY(OBJECT_HAS_OWN, Object, [descriptor, "value"])) deepFreeze(descriptor.value);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function normalizePathForCompare(value) {
  return REFLECT_APPLY(STRING_TO_LOWER_CASE, REFLECT_APPLY(PATH_RESOLVE, path, [value]), []);
}

function resolveFixedPath(workspaceRoot, relativePath) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) fail("WORKSPACE_ROOT_INVALID", "workspace root 无效。");
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,299}$/u.test(relativePath)
    || relativePath.includes("..") || relativePath.includes("\\") || relativePath.startsWith("/")) {
    fail("FIXED_PATH_INVALID", "固定相对路径无效。");
  }
  const root = REFLECT_APPLY(PATH_RESOLVE, path, [workspaceRoot]);
  const segments = relativePath.split("/");
  const args = [root];
  for (let index = 0; index < segments.length; index += 1) defineIndex(args, index + 1, segments[index]);
  const absolute = REFLECT_APPLY(PATH_RESOLVE, path, args);
  const rootToken = `${normalizePathForCompare(root)}${REFLECT_APPLY(STRING_TO_LOWER_CASE, PATH_SEP, [])}`;
  if (!normalizePathForCompare(absolute).startsWith(rootToken)) fail("FIXED_PATH_ESCAPE", "固定路径越界。");
  return { root, absolute };
}

function sameStat(left, right) {
  return left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && (typeof left.dev !== "number" || typeof right.dev !== "number" || left.dev === right.dev)
    && (typeof left.ino !== "number" || typeof right.ino !== "number" || left.ino === right.ino);
}

async function readHeldHandleArtifact(workspaceRoot, relativePath, maxBytes = MAX_ARTIFACT_BYTES) {
  const { root, absolute } = resolveFixedPath(workspaceRoot, relativePath);
  let handle;
  let primaryError;
  try {
    const rootReal = await REFLECT_APPLY(FS_REALPATH, undefined, [root]);
    const before = await REFLECT_APPLY(FS_LSTAT, undefined, [absolute]);
    const resolved = await REFLECT_APPLY(FS_REALPATH, undefined, [absolute]);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) fail("ARTIFACT_ENDPOINT_INVALID", "artifact 端点不是唯一普通文件。");
    if (before.size <= 0 || before.size > maxBytes) fail("ARTIFACT_SIZE_INVALID", "artifact 大小超限。");
    if (normalizePathForCompare(resolved) !== normalizePathForCompare(absolute)
      || !normalizePathForCompare(resolved).startsWith(`${normalizePathForCompare(rootReal)}${REFLECT_APPLY(STRING_TO_LOWER_CASE, PATH_SEP, [])}`)) {
      fail("ARTIFACT_ENDPOINT_INVALID", "artifact 端点经重解析后不在固定普通目录链。");
    }
    const noFollow = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
    handle = await REFLECT_APPLY(FS_OPEN, undefined, [absolute, fsConstants.O_RDONLY | noFollow]);
    const statBefore = await handle.stat();
    if (!statBefore.isFile() || statBefore.nlink !== 1 || statBefore.size !== before.size) {
      fail("ARTIFACT_ENDPOINT_INVALID", "held handle 与路径端点身份不一致。");
    }
    const parts = [];
    let total = 0;
    while (total <= maxBytes) {
      const capacity = Math.min(64 * 1024, maxBytes + 1 - total);
      const chunk = REFLECT_APPLY(BUFFER_ALLOC, Buffer, [capacity]);
      const readResult = await handle.read(chunk, 0, capacity, total);
      if (readResult.bytesRead === 0) break;
      defineIndex(parts, parts.length, REFLECT_APPLY(BUFFER_FROM, Buffer, [chunk.subarray(0, readResult.bytesRead)]));
      total += readResult.bytesRead;
    }
    if (total > maxBytes || total !== statBefore.size) fail("ARTIFACT_SIZE_INVALID", "held handle 读取长度不一致。");
    const statAfter = await handle.stat();
    const after = await REFLECT_APPLY(FS_LSTAT, undefined, [absolute]);
    const resolvedAfter = await REFLECT_APPLY(FS_REALPATH, undefined, [absolute]);
    if (!sameStat(statBefore, statAfter) || !sameStat(before, after)
      || normalizePathForCompare(resolvedAfter) !== normalizePathForCompare(resolved)) {
      fail("ARTIFACT_CHANGED_DURING_READ", "artifact 在 held-handle 读取期间变化。");
    }
    const bytes = REFLECT_APPLY(BUFFER_CONCAT, Buffer, [parts, total]);
    return REFLECT_APPLY(OBJECT_FREEZE, Object, [{
      path: relativePath,
      rawBytes: total,
      rawSha256: sha256Bytes(bytes),
      bytes
    }]);
  } catch (error) {
    primaryError = error;
    if (error instanceof BaziExpertCurrentLineZeroInstanceObservationChildError) throw error;
    fail("ARTIFACT_READ_FAILED", "固定 artifact 读取失败。", error);
  } finally {
    if (handle !== undefined) {
      try {
        await handle.close();
      } catch (closeError) {
        if (primaryError === undefined) fail("ARTIFACT_CLOSE_FAILED", "固定 artifact 关闭失败。", closeError);
      }
    }
  }
}

function scanJsonForDuplicateKeys(text) {
  let offset = 0;
  let nodes = 0;
  const whitespace = (code) => code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
  const skip = () => { while (offset < text.length && whitespace(text.charCodeAt(offset))) offset += 1; };
  const parseStringToken = () => {
    const start = offset;
    if (text.charCodeAt(offset) !== 0x22) fail("JSON_BYTES_INVALID", "JSON string 起始无效。");
    offset += 1;
    while (offset < text.length) {
      const code = text.charCodeAt(offset);
      if (code === 0x22) {
        offset += 1;
        const token = REFLECT_APPLY(STRING_SLICE, text, [start, offset]);
        try { return REFLECT_APPLY(JSON_PARSE, JSON, [token]); } catch (error) { fail("JSON_BYTES_INVALID", "JSON string 无效。", error); }
      }
      if (code === 0x5c) {
        offset += 2;
        if (text.charCodeAt(offset - 1) === 0x75) offset += 4;
        continue;
      }
      if (code < 0x20) fail("JSON_BYTES_INVALID", "JSON string 含控制字符。");
      offset += 1;
    }
    fail("JSON_BYTES_INVALID", "JSON string 未闭合。");
  };
  const parseValue = (depth) => {
    if (depth > 80 || (nodes += 1) > 200_000) fail("JSON_BYTES_INVALID", "JSON 结构超限。");
    skip();
    const code = text.charCodeAt(offset);
    if (code === 0x7b) {
      offset += 1;
      skip();
      const keys = new NATIVE_SET();
      if (text.charCodeAt(offset) === 0x7d) { offset += 1; return; }
      while (offset < text.length) {
        const key = parseStringToken();
        if (REFLECT_APPLY(SET_HAS, keys, [key])) fail("JSON_DUPLICATE_KEY", "JSON 含重复对象键。");
        REFLECT_APPLY(SET_ADD, keys, [key]);
        skip();
        if (text.charCodeAt(offset) !== 0x3a) fail("JSON_BYTES_INVALID", "JSON object 缺少冒号。");
        offset += 1;
        parseValue(depth + 1);
        skip();
        const delimiter = text.charCodeAt(offset);
        if (delimiter === 0x7d) { offset += 1; return; }
        if (delimiter !== 0x2c) fail("JSON_BYTES_INVALID", "JSON object 分隔符无效。");
        offset += 1;
        skip();
      }
      fail("JSON_BYTES_INVALID", "JSON object 未闭合。");
    }
    if (code === 0x5b) {
      offset += 1;
      skip();
      if (text.charCodeAt(offset) === 0x5d) { offset += 1; return; }
      while (offset < text.length) {
        parseValue(depth + 1);
        skip();
        const delimiter = text.charCodeAt(offset);
        if (delimiter === 0x5d) { offset += 1; return; }
        if (delimiter !== 0x2c) fail("JSON_BYTES_INVALID", "JSON array 分隔符无效。");
        offset += 1;
      }
      fail("JSON_BYTES_INVALID", "JSON array 未闭合。");
    }
    if (code === 0x22) { parseStringToken(); return; }
    const tail = REFLECT_APPLY(STRING_SLICE, text, [offset]);
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(tail);
    if (!match) fail("JSON_BYTES_INVALID", "JSON scalar 无效。");
    offset += match[0].length;
  };
  parseValue(0);
  skip();
  if (offset !== text.length) fail("JSON_BYTES_INVALID", "JSON 根值后含额外字节。");
}

function parseStrictJson(snapshot) {
  if (snapshot.bytes.length >= 3
    && snapshot.bytes[0] === 0xef && snapshot.bytes[1] === 0xbb && snapshot.bytes[2] === 0xbf) {
    fail("JSON_BYTES_INVALID", "artifact 不允许 UTF-8 BOM。");
  }
  let text;
  try {
    text = new TEXT_DECODER("utf-8", { fatal: true, ignoreBOM: false }).decode(snapshot.bytes);
  } catch (error) {
    fail("JSON_BYTES_INVALID", "artifact 不是严格 UTF-8。", error);
  }
  if (text.length === 0 || text.charCodeAt(0) === 0xfeff) fail("JSON_BYTES_INVALID", "artifact 不允许空内容或 BOM。");
  scanJsonForDuplicateKeys(text);
  let parsed;
  try { parsed = REFLECT_APPLY(JSON_PARSE, JSON, [text]); } catch (error) { fail("JSON_BYTES_INVALID", "artifact 不是严格 JSON。", error); }
  return canonicalValue(parsed);
}

function assertSnapshot(snapshot, pin, label) {
  if (snapshot.path !== pin.path || snapshot.rawBytes !== pin.rawBytes || snapshot.rawSha256 !== pin.rawSha256) {
    fail("HISTORICAL_RAW_IDENTITY_DRIFT", `${label} raw identity 漂移。`);
  }
}

function computeHistoricalLedgerDigest(value, domain) {
  const unsigned = canonicalValue(value);
  delete unsigned.ledgerDigest;
  return sha256Text(`${domain}\0${canonicalStringify(unsigned)}`);
}

function assertExactArray(actual, expected, label) {
  if (!exactJson(actual, expected)) fail("HISTORICAL_SEMANTIC_DRIFT", `${label} 漂移。`);
}

function assertHistoricalIntake(intake) {
  if (intake.schemaVersion !== "1.1.0"
    || intake.recordType !== "bazi_expert_review_intake_gap_version_aware_candidate_v1_1"
    || intake.ledgerId !== HISTORICAL_INTAKE.ledgerId
    || intake.ledgerDigest !== HISTORICAL_INTAKE.ledgerDigest
    || intake.ledgerDigest !== computeHistoricalLedgerDigest(intake, HISTORICAL_INTAKE.digestDomain)) {
    fail("HISTORICAL_SELF_DIGEST_INVALID", "historical intake 身份或自摘要无效。");
  }
  const gate = intake.gateSummary;
  const requiredZero = [
    "bindingFrozenVerified", "credentialsVerified", "currentRecordInstances", "identitiesVerified",
    "independentExpertReviewsVerified", "reviewerSlotsOccupied", "scopesVerified", "sealedOriginalOpinions"
  ];
  if (gate?.bindingRequired !== 12 || gate?.domainExpertsRequired !== 2
    || gate?.candidateFeedbackCollectionReady !== false || gate?.countsTowardExpertGate !== false
    || gate?.expertReviewBundleComplete !== false || gate?.expertTruthEstablished !== false
    || gate?.releaseReady !== false || gate?.expertClaimsAuthorized !== false
    || gate?.publicDeploymentAuthorized !== false || gate?.activeAdmissionEffect !== "none") {
    fail("HISTORICAL_SEMANTIC_DRIFT", "historical intake 红门漂移。");
  }
  for (let index = 0; index < requiredZero.length; index += 1) {
    if (gate?.[requiredZero[index]] !== 0) fail("HISTORICAL_SEMANTIC_DRIFT", "historical intake 零计数漂移。");
  }
  const projection = intake.intakeContractProjection;
  assertExactArray(projection?.reviewQuestionIds, REVIEW_QUESTION_IDS, "四个 review question");
  assertExactArray(projection?.independenceFactorIds, INDEPENDENCE_FACTOR_IDS, "十个 independence factor");
  const slots = intake.packetTemplateProjection?.reviewerSlots;
  if (!ARRAY_IS_ARRAY(slots) || slots.length !== 2) fail("HISTORICAL_SEMANTIC_DRIFT", "两席 reviewer 合同漂移。");
  for (let index = 0; index < 2; index += 1) {
    const slot = slots[index];
    if (slot?.slotId !== REVIEWER_SEAT_IDS[index] || slot?.status !== "vacant"
      || slot?.reviewerBinding !== null || slot?.identityVerificationState !== "absent"
      || slot?.credentialVerificationState !== "absent" || slot?.scopeVerificationState !== "absent"
      || slot?.independenceVerificationState !== "absent" || slot?.originalOpinionDigest !== null
      || slot?.originalOpinionStored !== false || slot?.submittedAt !== null) {
      fail("HISTORICAL_SEMANTIC_DRIFT", "reviewer 空席合同漂移。");
    }
  }
  const policy = intake.packetTemplateProjection?.automatedResolutionPolicy;
  if (policy?.majorityVoteAllowed !== false || policy?.opinionAveragingAllowed !== false
    || policy?.generatedModelWinnerSelectionAllowed !== false
    || policy?.unresolvedDisagreementMayBeAdopted !== false
    || !exactJson(policy?.allowedUnresolvedDisposition, ["defer", "reject"])) {
    fail("HISTORICAL_SEMANTIC_DRIFT", "no-winner 分歧规则漂移。");
  }
  const instances = projection?.currentInstances;
  const arrays = ["disagreementInventories", "originalOpinions", "overallBundles",
    "pairwiseIndependenceAssessments", "privateOpinionSealReceipts", "publicIdentityBindings", "reconciliationNotes"];
  for (let index = 0; index < arrays.length; index += 1) {
    if (!ARRAY_IS_ARRAY(instances?.[arrays[index]]) || instances[arrays[index]].length !== 0) {
      fail("HISTORICAL_SEMANTIC_DRIFT", "historical intake 实例数组不再为空。");
    }
  }
  const counts = instances?.counts;
  const countKeys = ["disagreementInventories", "independentExpertReviewsVerified", "originalOpinions",
    "overallBundles", "pairwiseIndependenceAssessments", "privateOpinionSealReceipts",
    "publicIdentityBindings", "reconciliationNotes", "sealedOriginalOpinions"];
  for (let index = 0; index < countKeys.length; index += 1) {
    if (counts?.[countKeys[index]] !== 0) fail("HISTORICAL_SEMANTIC_DRIFT", "historical intake 实例计数不再为零。");
  }
}

function assertHistoricalPrivacy(privacy) {
  if (privacy.schemaVersion !== "1.0.0"
    || privacy.recordType !== "bazi_expert_privacy_formal_intake_reconciliation_v1"
    || privacy.ledgerId !== HISTORICAL_PRIVACY.ledgerId
    || privacy.ledgerDigest !== HISTORICAL_PRIVACY.ledgerDigest
    || privacy.ledgerDigest !== computeHistoricalLedgerDigest(privacy, HISTORICAL_PRIVACY.digestDomain)) {
    fail("HISTORICAL_SELF_DIGEST_INVALID", "historical privacy 身份或自摘要无效。");
  }
  const zero = privacy.zeroInstanceGate;
  const zeroKeys = ["bindingFrozenVerified", "credentialsVerified", "currentFormalIntakeRecordInstances",
    "expertReviewBundles", "identitiesVerified", "independentExpertReviewsVerified", "originalOpinionInstances",
    "pairwiseIndependenceMaterials", "reviewerSlotsOccupied", "scopesVerified", "sealedOriginalOpinions",
    "verifierAuthorityGrantInstances"];
  if (zero?.bindingRequired !== 12 || zero?.domainExpertsRequired !== 2
    || zero?.countsTowardExpertGate !== false || zero?.expertReviewBundleComplete !== false
    || zero?.formalAdmissionPromotionBlocked !== true || zero?.sourceBindingClosureComplete !== false
    || zero?.sourceRightsClosureComplete !== false) {
    fail("HISTORICAL_SEMANTIC_DRIFT", "historical privacy zero-instance gate 漂移。");
  }
  for (let index = 0; index < zeroKeys.length; index += 1) {
    if (zero?.[zeroKeys[index]] !== 0) fail("HISTORICAL_SEMANTIC_DRIFT", "historical privacy 零计数漂移。");
  }
  const authority = privacy.authorityBoundary;
  const authorityFalse = ["collectionAuthorized", "contentTruthEstablished", "credentialAuthorityEstablished",
    "expertClaimsAuthorized", "expertTruthEstablished", "formalActivationAllowed", "identityAuthorityEstablished",
    "privateDossierRetrievalAuthorized", "publicDeploymentAuthorized", "publicReleaseAuthorized", "releaseReady",
    "reviewerIndependenceEstablished", "rightsLegalConclusionEstablished", "verifierAuthorityEstablished"];
  if (authority?.activeAdmissionEffect !== "none") fail("HISTORICAL_SEMANTIC_DRIFT", "historical privacy admission effect 漂移。");
  for (let index = 0; index < authorityFalse.length; index += 1) {
    if (authority?.[authorityFalse[index]] !== false) fail("HISTORICAL_SEMANTIC_DRIFT", "historical privacy authority 红门漂移。");
  }
  const privacyBoundary = privacy.privacyBoundary;
  if (privacyBoundary?.actualPrivateDossierArtifactsVerified !== 0
    || privacyBoundary?.actualPrivateOpinionFilesVerified !== 0
    || privacyBoundary?.personDataPresenceAssessed !== false
    || privacyBoundary?.personDerivedDigestExcluded !== false
    || privacyBoundary?.safeToPublish !== false) {
    fail("HISTORICAL_SEMANTIC_DRIFT", "historical privacy material 边界漂移。");
  }
}

function assertReadinessParent(readiness) {
  if (!isVerifiedBaziKnowledgeCoreIdentityReboundBindingReadiness(readiness)) {
    fail("READINESS_V19_BRAND_REQUIRED", "必须消费 readiness v1.9 full-loader 私有品牌。");
  }
  if (readiness.ledgerId !== READINESS_V19.ledgerId || readiness.ledgerDigest !== READINESS_V19.ledgerDigest
    || readiness.artifact?.path !== READINESS_V19.path || readiness.artifact?.bytes !== READINESS_V19.rawBytes
    || readiness.artifact?.sha256 !== READINESS_V19.rawSha256
    || !exactJson(readiness.currentKnowledgeCoreIdentity, {
      path: CURRENT_KNOWLEDGE_CORE.path,
      bytes: CURRENT_KNOWLEDGE_CORE.rawBytes,
      sha256: CURRENT_KNOWLEDGE_CORE.rawSha256
    })
    || readiness.bindingRequired !== 12 || readiness.bindingFrozenVerified !== 0
    || readiness.domainExpertReviewCount !== 0 || readiness.expertReviewBundleComplete !== false
    || readiness.sourceBundleComplete !== false || readiness.rightsBundleComplete !== false
    || readiness.contentTruthEstablished !== false || readiness.expertTruthEstablished !== false
    || readiness.rightsLegalConclusionEstablished !== false || readiness.activeAdmissionEffect !== "none"
    || readiness.releaseReady !== false || readiness.publicDeploymentAuthorized !== false
    || readiness.expertClaimsAuthorized !== false || readiness.releaseIdentity !== "legacy-v13"
    || readiness.targetSchema !== 13 || readiness.migrationId !== null
    || readiness.crossFileAtomicSnapshot !== false || readiness.mutationEpochAvailableForSchema13 !== false
    || readiness.mutationEpochReceipt !== null || readiness.intervalMutationExcludedAcrossFiles !== false
    || readiness.abaExcluded !== false) {
    fail("READINESS_V19_BOUNDARY_MISMATCH", "readiness v1.9 当前红门或身份漂移。");
  }
}

function assertAuthorityParent(authority) {
  if (!isVerifiedBaziExpertAuthorityMaterialPrecheck(authority)) {
    fail("AUTHORITY_PRECHECK_BRAND_REQUIRED", "必须消费 authority-precheck full-loader 私有品牌。");
  }
  if (authority.ledgerId !== AUTHORITY_PRECHECK.ledgerId || authority.ledgerDigest !== AUTHORITY_PRECHECK.ledgerDigest
    || authority.authorityMaterialContractStructurallyPrechecked !== true
    || authority.countsTowardExpertGate !== false || authority.realReviewerInstances !== 0
    || authority.verifierAuthorityGrantInstances !== 0 || authority.expertTruthEstablished !== false
    || authority.releaseReady !== false || authority.publicDeploymentAuthorized !== false
    || authority.expertClaimsAuthorized !== false
    || authority.firstFormalParentFailureCode !== "INTAKE_GAP_BINDING_DRIFT"
    || authority.status !== "zero_instance_authority_precheck_contract_mechanically_verified") {
    fail("AUTHORITY_PRECHECK_BOUNDARY_MISMATCH", "authority-precheck 当前零实例合同漂移。");
  }
}

async function loadCurrentParents(workspaceRoot) {
  const readiness = await loadBaziKnowledgeCoreIdentityReboundBindingReadiness(workspaceRoot);
  assertReadinessParent(readiness);
  const authority = await loadBaziExpertAuthorityMaterialPrecheck(workspaceRoot);
  assertAuthorityParent(authority);
  return { readiness, authority };
}

async function loadHistoricalObservations(workspaceRoot) {
  const intakeSnapshot = await readHeldHandleArtifact(workspaceRoot, HISTORICAL_INTAKE.path);
  assertSnapshot(intakeSnapshot, HISTORICAL_INTAKE, "historical intake v1.1");
  const intake = parseStrictJson(intakeSnapshot);
  assertHistoricalIntake(intake);
  const privacySnapshot = await readHeldHandleArtifact(workspaceRoot, HISTORICAL_PRIVACY.path);
  assertSnapshot(privacySnapshot, HISTORICAL_PRIVACY, "historical privacy v1");
  const privacy = parseStrictJson(privacySnapshot);
  assertHistoricalPrivacy(privacy);
  return { intakeSnapshot, intake, privacySnapshot, privacy };
}

function buildChild(readiness, authority, intakeSnapshot, privacySnapshot) {
  assertReadinessParent(readiness);
  assertAuthorityParent(authority);
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    childId: CHILD_ID,
    status: "current_line_mechanical_zero_instance_observation_no_admission_effect",
    createdAt: CREATED_AT,
    currentParentBrands: {
      readinessV19: {
        ...READINESS_V19,
        fullLoaderPrivateBrandVerified: true,
        role: "current_binding_readiness_zero_authority_parent"
      },
      authorityPrecheckV1: {
        ...AUTHORITY_PRECHECK,
        fullLoaderPrivateBrandVerified: true,
        role: "current_zero_instance_authority_contract_parent"
      },
      verifiedCurrentPrivateBrandCount: 2
    },
    historicalObservations: {
      intakeV11: {
        artifact: { path: intakeSnapshot.path, rawBytes: intakeSnapshot.rawBytes, rawSha256: intakeSnapshot.rawSha256 },
        ledgerId: HISTORICAL_INTAKE.ledgerId,
        ledgerDigest: HISTORICAL_INTAKE.ledgerDigest,
        rawAndSelfDigestVerified: true,
        brandCurrent: false,
        fullLoaderImportedByThisChild: false,
        fullLoaderInvokedByThisChild: false,
        role: "historical_zero_instance_intake_observation_not_current_parent_authority"
      },
      privacyV1: {
        artifact: { path: privacySnapshot.path, rawBytes: privacySnapshot.rawBytes, rawSha256: privacySnapshot.rawSha256 },
        ledgerId: HISTORICAL_PRIVACY.ledgerId,
        ledgerDigest: HISTORICAL_PRIVACY.ledgerDigest,
        rawAndSelfDigestVerified: true,
        brandCurrent: false,
        fullLoaderImportedByThisChild: false,
        fullLoaderInvokedByThisChild: false,
        role: "historical_opaque_privacy_red_semantics_not_current_parent_authority"
      },
      historicalObservationCount: 2,
      historicalPrivateBrandsConsumed: 0
    },
    knowledgeCoreDriftAttribution: {
      previousIdentity: { ...PREVIOUS_KNOWLEDGE_CORE },
      currentIdentity: { ...CURRENT_KNOWLEDGE_CORE },
      readinessV19CurrentBrandIsEvidenceBasis: true,
      staleIntakeOrPrivacyLoaderExecutedByThisChild: false,
      knownFailClosedCode: "BOUND_READINESS_BASIS_DRIFT",
      codeAttributionMode: "deterministic_old_new_identity_attribution_not_loader_execution",
      driftDoesNotChangeExpertOrAuthorityCounts: true
    },
    reviewContract: {
      reviewerSeatIds: copyArray(REVIEWER_SEAT_IDS),
      reviewerSeats: [
        { slotId: "domain-expert-a", status: "vacant" },
        { slotId: "domain-expert-b", status: "vacant" }
      ],
      reviewQuestionIds: copyArray(REVIEW_QUESTION_IDS),
      independenceFactorIds: copyArray(INDEPENDENCE_FACTOR_IDS),
      noWinnerPolicy: {
        majorityVoteAllowed: false,
        opinionAveragingAllowed: false,
        generatedModelWinnerSelectionAllowed: false,
        unresolvedDisagreementMayBeAdopted: false,
        allowedUnresolvedDisposition: ["defer", "reject"]
      }
    },
    currentMechanicalGate: {
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      domainExpertsRequired: 2,
      domainExpertReviewsVerified: 0,
      realReviewerInstancesVerified: 0,
      verifierAuthorityGrantInstancesVerified: 0,
      expertReviewBundleComplete: false,
      countsTowardExpertGate: false,
      sourceBindingClosureComplete: false,
      sourceRightsClosureComplete: false,
      activeAdmissionEffect: "none"
    },
    historicalPersistedZeroInstanceProjection: {
      reviewerSlotsOccupied: 0,
      identitiesVerified: 0,
      credentialsVerified: 0,
      scopesVerified: 0,
      pairwiseIndependenceAssessments: 0,
      independentExpertReviewsVerified: 0,
      publicIdentityBindings: 0,
      originalOpinions: 0,
      privateOpinionSealReceipts: 0,
      sealedOriginalOpinions: 0,
      disagreementInventories: 0,
      reconciliationNotes: 0,
      expertReviewBundles: 0,
      currentFormalIntakeRecordInstances: 0,
      projectionIsCurrentRealityAttestation: false
    },
    materialAccessBoundary: {
      privateDossierArtifactsReadByThisChild: 0,
      privateOpinionFilesReadByThisChild: 0,
      realPersonMaterialCollectedByThisChild: 0,
      privateRuntimeEndpointInvokedByThisChild: false,
      realWorldPrivateMaterialExistenceAssessed: false,
      absenceOfPrivateMaterialInRealityClaimed: false,
      personDataPresenceAssessed: false,
      personDerivedDigestExcluded: false,
      safeToPublish: false
    },
    authorityBoundary: {
      collectionAuthorized: false,
      persistedRealPersonInstancesAllowed: false,
      formalActivationAllowed: false,
      identityAuthorityEstablished: false,
      credentialAuthorityEstablished: false,
      reviewerIndependenceEstablished: false,
      originalOpinionAuthenticityEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReady: false,
      publicReleaseAuthorized: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    manifestBoundary: {
      manifestCurrentness: "not_assessed_by_this_child",
      formalManifestLoadedByThisChild: false,
      reportContractDriftReceiptConsumedByThisChild: false,
      currentFullDomainManifestEstablished: false,
      manifestRebindOrResignAuthorized: false
    },
    observationBoundary: {
      endpointSnapshotOnly: true,
      sameHeldHandlePerHistoricalArtifact: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      replayExcluded: false
    },
    runtimeTrustBoundary: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      visibleLoaderGuardIsSecurityBoundary: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    lineage: {
      parentArtifactsModified: false,
      parentBacklinksAdded: false,
      centralManifestModified: false,
      centralRegistryModified: false,
      defaultOrRuntimeIntegration: "absent"
    },
    doesNotEstablish: [
      "real_reviewer_identity_credentials_scope_or_pairwise_independence",
      "private_material_absence_authenticity_first_seen_custody_or_consent",
      "original_opinion_authenticity_or_expert_truth",
      "content_truth_source_or_rights_legal_closure",
      "formal_expert_intake_currentness_or_expert_gate_closure",
      "browser_runtime_release_evidence_or_deployment_rollback_confirmation",
      "manifest_currentness_release_readiness_or_public_authorization",
      "cross_file_atomic_snapshot_mutation_epoch_interval_aba_or_replay_exclusion"
    ]
  };
  return deepFreeze({ ...unsigned, childDigest: computeBaziExpertCurrentLineZeroInstanceObservationChildDigest(unsigned) });
}

export function computeBaziExpertCurrentLineZeroInstanceObservationChildDigest(value) {
  const unsigned = canonicalValue(value);
  delete unsigned.childDigest;
  return sha256Text(`${DIGEST_DOMAIN}\0${canonicalStringify(unsigned)}`);
}

export function serializeBaziExpertCurrentLineZeroInstanceObservationChild(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [canonicalValue(value), null, 2])}\n`;
}

export async function buildBaziExpertCurrentLineZeroInstanceObservationChild(workspaceRoot) {
  const { readiness, authority } = await loadCurrentParents(workspaceRoot);
  const { intakeSnapshot, privacySnapshot } = await loadHistoricalObservations(workspaceRoot);
  return buildChild(readiness, authority, intakeSnapshot, privacySnapshot);
}

async function readPersistedChild(workspaceRoot) {
  const snapshot = await readHeldHandleArtifact(
    workspaceRoot,
    BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("CHILD_RAW_IDENTITY_DRIFT", "持久化 D current-line child raw identity 漂移。");
  }
  const child = parseStrictJson(snapshot);
  if (child?.childId !== CHILD_ID || child?.recordType !== RECORD_TYPE
    || child?.childDigest !== EXPECTED_PERSISTED.childDigest
    || !SHA256.test(child.childDigest)
    || child.childDigest !== computeBaziExpertCurrentLineZeroInstanceObservationChildDigest(child)) {
    fail("CHILD_SELF_DIGEST_INVALID", "持久化 D current-line child 身份或自摘要无效。");
  }
  if (serializeBaziExpertCurrentLineZeroInstanceObservationChild(child) !== snapshot.bytes.toString("utf8")) {
    fail("CHILD_SERIALIZATION_DRIFT", "持久化 D current-line child 不是确定性序列化。");
  }
  return { snapshot, child };
}

export async function verifyBaziExpertCurrentLineZeroInstanceObservationChild(workspaceRoot, childInput) {
  const caller = canonicalValue(childInput);
  const persisted = await readPersistedChild(workspaceRoot);
  if (!exactJson(caller, persisted.child)) fail("CALLER_PERSISTED_MISMATCH", "调用方 child 与持久化字节不一致。");
  const expected = await buildBaziExpertCurrentLineZeroInstanceObservationChild(workspaceRoot);
  if (!exactJson(caller, expected)) fail("CHILD_CURRENT_MISMATCH", "持久化 child 不等于当前允许的机械投影。");
  return deepFreeze(caller);
}

export async function loadBaziExpertCurrentLineZeroInstanceObservationChild(workspaceRoot = process.cwd()) {
  if (EXPECTED_PERSISTED.rawBytes <= 0 || !SHA256.test(EXPECTED_PERSISTED.rawSha256)
    || !SHA256.test(EXPECTED_PERSISTED.childDigest)) {
    fail("CHILD_IDENTITY_UNPINNED", "D current-line child raw/self identity 尚未冻结。");
  }
  const { child } = await readPersistedChild(workspaceRoot);
  const verified = await verifyBaziExpertCurrentLineZeroInstanceObservationChild(workspaceRoot, child);
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [verified]);
  return verified;
}

export function isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(value) {
  return value !== null && typeof value === "object" && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

export function getBaziExpertCurrentLineZeroInstanceObservationChildSummary(value) {
  if (!isVerifiedBaziExpertCurrentLineZeroInstanceObservationChild(value)) {
    fail("CHILD_BRAND_REQUIRED", "summary 只接受 exact persisted loader 的私有品牌结果。");
  }
  return deepFreeze({
    mechanicalObservationVerified: true,
    childId: value.childId,
    childDigest: value.childDigest,
    currentPrivateBrandsVerified: value.currentParentBrands.verifiedCurrentPrivateBrandCount,
    historicalRawSelfObservationsVerified: value.historicalObservations.historicalObservationCount,
    bindingFrozenVerified: value.currentMechanicalGate.bindingFrozenVerified,
    bindingRequired: value.currentMechanicalGate.bindingRequired,
    domainExpertsVerified: value.currentMechanicalGate.domainExpertReviewsVerified,
    domainExpertsRequired: value.currentMechanicalGate.domainExpertsRequired,
    templateReviewerSeatsVacant: value.reviewContract.reviewerSeats.length,
    historicalPersistedOriginalOpinions: value.historicalPersistedZeroInstanceProjection.originalOpinions,
    historicalPersistedPairwiseIndependenceAssessments:
      value.historicalPersistedZeroInstanceProjection.pairwiseIndependenceAssessments,
    historicalPersistedDisagreementInventories:
      value.historicalPersistedZeroInstanceProjection.disagreementInventories,
    historicalPersistedExpertReviewBundles:
      value.historicalPersistedZeroInstanceProjection.expertReviewBundles,
    historicalProjectionIsCurrentRealityAttestation:
      value.historicalPersistedZeroInstanceProjection.projectionIsCurrentRealityAttestation,
    realWorldPrivateMaterialExistenceAssessed:
      value.materialAccessBoundary.realWorldPrivateMaterialExistenceAssessed,
    absenceOfPrivateMaterialInRealityClaimed:
      value.materialAccessBoundary.absenceOfPrivateMaterialInRealityClaimed,
    manifestCurrentness: value.manifestBoundary.manifestCurrentness,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    releaseIdentity: value.releaseGovernance.releaseIdentity,
    targetSchema: value.releaseGovernance.targetSchema,
    migrationId: value.releaseGovernance.migrationId
  });
}

export const baziExpertCurrentLineZeroInstanceObservationChildTestOnly = OBJECT_FREEZE({
  READINESS_V19,
  AUTHORITY_PRECHECK,
  HISTORICAL_INTAKE,
  HISTORICAL_PRIVACY,
  PREVIOUS_KNOWLEDGE_CORE,
  CURRENT_KNOWLEDGE_CORE,
  EXPECTED_PERSISTED,
  REVIEWER_SEAT_IDS,
  REVIEW_QUESTION_IDS,
  INDEPENDENCE_FACTOR_IDS,
  canonicalValue,
  canonicalStringify,
  computeHistoricalLedgerDigest,
  parseStrictJson,
  readHeldHandleArtifact,
  assertHistoricalIntake,
  assertHistoricalPrivacy,
  assertReadinessParent,
  assertAuthorityParent,
  loadCurrentParents,
  loadHistoricalObservations,
  buildChild
});
