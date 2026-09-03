import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import {
  BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH,
  parseBaziDttMonthCommandPublicEvidenceJsonBytes,
  verifyBaziDttMonthCommandPublicEvidenceArtifact
} from "./bazi-dtt-month-command-public-evidence-lib.mjs";
import { verifyBaziSourceBindingCandidateLedger } from "./bazi-source-binding-candidate-lib.mjs";
import { verifyBaziSourceRightsCandidateLedger } from "./bazi-source-rights-candidate-lib.mjs";

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_FIND = Array.prototype.find;
const ARRAY_POP = Array.prototype.pop;
const ARRAY_PROTOTYPE = Array.prototype;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_SOME = Array.prototype.some;
const NATIVE_BUFFER = Buffer;
const BUFFER_ALLOC_UNSAFE = Buffer.allocUnsafe;
const BUFFER_PROTOTYPE = Buffer.prototype;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const OBJECT_DEFINE_PROPERTIES = Object.defineProperties;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_ENTRIES = Object.entries;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REGEXP_TEST = RegExp.prototype.test;
const STRING_INCLUDES = String.prototype.includes;
const STRING_SPLIT = String.prototype.split;
const STRING_STARTS_WITH = String.prototype.startsWith;
const STRING_TO_LOWER_CASE = String.prototype.toLowerCase;
const STRING_TRIM = String.prototype.trim;
const NATIVE_DATE = Date;
const DATE_PARSE = Date.parse;
const DATE_TO_ISO_STRING = Date.prototype.toISOString;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const NATIVE_UINT8_ARRAY = Uint8Array;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const TYPED_ARRAY_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(UINT8_ARRAY_PROTOTYPE);
const TYPED_ARRAY_BUFFER_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "buffer"
)?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "byteOffset"
)?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "byteLength"
)?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  ArrayBuffer.prototype,
  "resizable"
)?.get;
const UINT8_ARRAY_SET = UINT8_ARRAY_PROTOTYPE.set;
const UTIL_IS_ARRAY_BUFFER = utilTypes.isArrayBuffer;
const UTIL_IS_PROXY = utilTypes.isProxy;
const UTIL_IS_SHARED_ARRAY_BUFFER = utilTypes.isSharedArrayBuffer;
const UTIL_IS_UINT8_ARRAY = utilTypes.isUint8Array;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const FILE_HANDLE_PROBE = await open(new URL(import.meta.url), fsConstants.O_RDONLY);
const FILE_HANDLE_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(FILE_HANDLE_PROBE);
const FILE_HANDLE_READ = FILE_HANDLE_PROTOTYPE.read;
const FILE_HANDLE_STAT = FILE_HANDLE_PROTOTYPE.stat;
const BIGINT_STATS_PROBE = await REFLECT_APPLY(FILE_HANDLE_STAT, FILE_HANDLE_PROBE, [{ bigint: true }]);
const STATS_IS_FILE = BIGINT_STATS_PROBE.isFile;
const STATS_IS_DIRECTORY = BIGINT_STATS_PROBE.isDirectory;
const STATS_IS_SYMBOLIC_LINK = BIGINT_STATS_PROBE.isSymbolicLink;
await FILE_HANDLE_PROBE.close();
const PATH_IS_ABSOLUTE = path.isAbsolute;
const PATH_JOIN = path.join;
const PATH_RELATIVE = path.relative;
const PATH_RESOLVE = path.resolve;
const PATH_SEPARATOR = path.sep;

export const BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH =
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json";
export const RELATIVE_PATH = BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH;

const MAX_ARTIFACT_BYTES = 1_000_000;
const MAX_PARENT_BYTES = 1_000_000;
const MAX_INPUT_DEPTH = 64;
const MAX_INPUT_NODES = 200_000;
const MAX_INPUT_TEXT_CODE_UNITS = 2_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();
const OVERLAY_RAW_IDENTITY = OBJECT_FREEZE({
  rawBytes: 8_709,
  rawSha256: "e3f014e8f87457b09ae866b79fe2581f87553658829515db61f597c345f6ff68"
});
const EXPECTED_RECONCILIATION_DIGEST =
  "fabf96fddf7f3710b86f22b0d3f7aa7844087351f30c53fbb823780f3d81ba2f";

const RELEASE_GOVERNANCE = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const SUBJECT_LOCK = OBJECT_FREEZE({
  bindingId: "binding:dtt:month-command",
  evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
  sourceId: "dtt-chanwei-wikisource-r2600158",
  sourceCandidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
  rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
  affectedAnchorId: "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1"
});

const HISTORICAL_EVIDENCE = OBJECT_FREEZE({
  path: BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH,
  rawBytes: 31_062,
  rawSha256: "85788506067b50453545ec786c7a47b0e51a4cf004419cbe8c547f9384c01ae6",
  observationId: "hakimi.bazi.dtt-month-command-public-evidence/2026-08-29T15:17:27.103Z",
  observationDigest: "01e61e4f77526270ef83a0d95fbcb165bf307d5efa09c5a0360ff49bf1735993",
  findingState: "unresolved_parent_not_mutated_reconciliation_required"
});

const HISTORICAL_SOURCE_PARENT = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.json",
  rawBytes: 47_753,
  rawSha256: "e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.5.0",
  ledgerDigest: "44ed9e23490c11c625602b77574efbf7331305bd1bf87634c5b91f568e8b85af",
  candidateId: SUBJECT_LOCK.sourceCandidateId,
  candidateDigest: "26182f43d801dedb7433e53d8e390efc32195ef08555199d933e36a1ed65ca61"
});

const HISTORICAL_RIGHTS_PARENT = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.json",
  rawBytes: 20_806,
  rawSha256: "433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.1.0",
  ledgerDigest: "3776e4b8799ca5221c1765a735c3e34c637b4f4952c9243836fedfbf1ee30a36",
  candidateId: SUBJECT_LOCK.rightsCandidateId,
  candidateDigest: "631f530ded6a17652c8a419246805b278d0f6f5511b96a1fd6274f386fce633d"
});

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "historical_parent_mutation_or_backlink",
  "notice_discrepancy_resolution",
  "source_body_or_exact_quote_text",
  "work_edition_transcription_or_carrier_rights_clearance",
  "formal_source_rights_or_carrier_record",
  "binding_frozen_verification",
  "content_truth",
  "expert_truth",
  "rights_or_legal_conclusion",
  "cross_file_atomic_snapshot",
  "mutation_epoch_interval_or_aba_exclusion",
  "release_readiness",
  "public_release_authorization"
]);

const TOP_LEVEL_KEYS = OBJECT_FREEZE([
  "schemaVersion",
  "recordType",
  "reconciliationId",
  "status",
  "createdAt",
  "releaseGovernance",
  "subjectLock",
  "historicalEvidence",
  "historicalParents",
  "currentParents",
  "noticeProjection",
  "reconciliationDecision",
  "formalAdmissionBoundary",
  "futureResolutionRequirements",
  "integrityBoundary",
  "authorityBoundary",
  "doesNotEstablish",
  "reconciliationDigest"
]);

export class BaziDttNoticeReconciliationError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziDttNoticeReconciliationError";
    OBJECT_DEFINE_PROPERTIES(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new BaziDttNoticeReconciliationError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function sha256(bytes) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function exactJson(left, right) {
  return canonicalStringifyBaziDttNoticeReconciliation(left)
    === canonicalStringifyBaziDttNoticeReconciliation(right);
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > MAX_INPUT_DEPTH) fail("INPUT_DEPTH_EXCEEDED", "DTT notice reconciliation 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > MAX_INPUT_NODES) fail("INPUT_NODE_LIMIT_EXCEEDED", "DTT notice reconciliation 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("INPUT_VALUE_INVALID", "DTT notice reconciliation 输入含无效数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCodeUnits += value.length;
    if (state.textCodeUnits > MAX_INPUT_TEXT_CODE_UNITS) {
      fail("INPUT_TEXT_LIMIT_EXCEEDED", "DTT notice reconciliation 输入超过文本上限。");
    }
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "DTT notice reconciliation 只接受 JSON 数据值。");
  if (UTIL_IS_PROXY(value)) fail("INPUT_PROXY_FORBIDDEN", "DTT notice reconciliation 输入不接受 Proxy。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) {
    fail("INPUT_CYCLE_FORBIDDEN", "DTT notice reconciliation 输入不接受循环引用。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) {
    fail("INPUT_ALIAS_FORBIDDEN", "DTT notice reconciliation 输入不接受对象别名。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = ARRAY_IS_ARRAY(value);
      prototype = OBJECT_GET_PROTOTYPE_OF(value);
      descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "DTT notice reconciliation 输入不能被安全捕获。", cause);
    }
    const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
    for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
      const key = descriptorKeys[keyIndex];
      if (typeof key === "symbol") fail("INPUT_SYMBOL_FORBIDDEN", "DTT notice reconciliation 输入不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== ARRAY_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "DTT notice reconciliation 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !NUMBER_IS_SAFE_INTEGER(length) || length < 0 || length > MAX_INPUT_NODES
        || descriptorKeys.length !== length + 1) {
        fail("INPUT_ARRAY_INVALID", "DTT notice reconciliation 数组长度或字段无效。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "DTT notice reconciliation 不接受稀疏数组或访问器元素。");
        }
        OBJECT_DEFINE_PROPERTY(output, String(index), {
          value: capturePassiveJsonValue(descriptor.value, state, depth + 1),
          enumerable: true,
          configurable: true,
          writable: true
        });
      }
      return output;
    }
    if (prototype !== OBJECT_PROTOTYPE) {
      fail("INPUT_PROTOTYPE_INVALID", "DTT notice reconciliation 只接受普通对象。");
    }
    const output = {};
    for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
      const key = descriptorKeys[keyIndex];
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "DTT notice reconciliation 不接受访问器或不可枚举字段。");
      }
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: capturePassiveJsonValue(descriptor.value, state, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function passiveSnapshot(value) {
  try {
    return capturePassiveJsonValue(value, {
      active: new NATIVE_WEAK_SET(),
      seen: new NATIVE_WEAK_SET(),
      nodes: 0,
      textCodeUnits: 0
    }, 0);
  } catch (cause) {
    fail(cause?.code ?? "INPUT_INVALID", "DTT notice reconciliation 输入不是被动有限 JSON。", cause);
  }
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(snapshot) {
  if (snapshot === null || typeof snapshot === "boolean" || typeof snapshot === "string") return snapshot;
  if (typeof snapshot === "number" && NUMBER_IS_FINITE(snapshot) && !OBJECT_IS(snapshot, -0)) return snapshot;
  if (ARRAY_IS_ARRAY(snapshot)) {
    const output = [];
    for (let index = 0; index < snapshot.length; index += 1) {
      OBJECT_DEFINE_PROPERTY(output, String(index), {
        value: canonicalValue(snapshot[index]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  if (snapshot && typeof snapshot === "object"
    && OBJECT_GET_PROTOTYPE_OF(snapshot) === OBJECT_PROTOTYPE) {
    const output = {};
    const keys = OBJECT_KEYS(snapshot);
    REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: canonicalValue(snapshot[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  fail("NON_CANONICAL_JSON", "DTT notice reconciliation 只接受有限规范 JSON。");
}

export function canonicalStringifyBaziDttNoticeReconciliation(value) {
  try {
    return JSON_STRINGIFY(canonicalValue(passiveSnapshot(value)));
  } catch (cause) {
    fail(cause?.code ?? "NON_CANONICAL_JSON", "DTT notice reconciliation 只接受有限规范 JSON。", cause);
  }
}

export function computeBaziDttNoticeReconciliationDigest(value) {
  const snapshot = passiveSnapshot(value);
  const { reconciliationDigest: _reconciliationDigest, ...unsigned } = snapshot;
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [
    canonicalStringifyBaziDttNoticeReconciliation(unsigned),
    "utf8"
  ]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function captureStrictUint8Array(bytes, label, maxBytes) {
  if (UTIL_IS_PROXY(bytes)) fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  let prototype;
  try {
    prototype = OBJECT_GET_PROTOTYPE_OF(bytes);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 字节原型不可读。`, cause);
  }
  if (!UTIL_IS_UINT8_ARRAY(bytes)
    || (prototype !== UINT8_ARRAY_PROTOTYPE && prototype !== BUFFER_PROTOTYPE)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是内部 Uint8Array 字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 内部字节槽不可读。`, cause);
  }
  if (!NUMBER_IS_SAFE_INTEGER(byteOffset) || byteOffset < 0
    || !NUMBER_IS_SAFE_INTEGER(byteLength) || byteLength < 0
    || !NUMBER_IS_SAFE_INTEGER(maxBytes) || maxBytes <= 0) {
    fail("JSON_BYTES_INVALID", `${label} 字节边界无效。`);
  }
  if (byteLength > maxBytes) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (typeof UTIL_IS_SHARED_ARRAY_BUFFER === "function"
    && UTIL_IS_SHARED_ARRAY_BUFFER(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!UTIL_IS_ARRAY_BUFFER(backingBuffer)) {
    fail("JSON_BYTES_INVALID", `${label} backing buffer 无效。`);
  }
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = REFLECT_APPLY(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      fail("JSON_BYTES_INVALID", `${label} backing buffer 状态不可读。`, cause);
    }
    if (resizable) fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
  }
  const captured = new NATIVE_UINT8_ARRAY(byteLength);
  try {
    REFLECT_APPLY(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 无法复制到私有固定缓冲区。`, cause);
  }
  return captured;
}

function walkJsonAst(root, visitor) {
  const stack = [root];
  const seen = new NATIVE_SET();
  let nodes = 0;
  while (stack.length > 0) {
    const node = REFLECT_APPLY(ARRAY_POP, stack, []);
    if (!node || typeof node !== "object" || REFLECT_APPLY(SET_HAS, seen, [node])) continue;
    REFLECT_APPLY(SET_ADD, seen, [node]);
    nodes += 1;
    if (nodes > MAX_INPUT_NODES) fail("JSON_TOO_COMPLEX", "DTT notice reconciliation JSON AST 超过节点上限。");
    visitor(node);
    const entries = OBJECT_ENTRIES(node);
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries[entryIndex];
      const key = entry[0];
      const child = entry[1];
      if (key === "loc" || key === "start" || key === "end") continue;
      if (ARRAY_IS_ARRAY(child)) {
        for (let index = child.length - 1; index >= 0; index -= 1) {
          REFLECT_APPLY(ARRAY_PUSH, stack, [child[index]]);
        }
      } else if (child && typeof child === "object") {
        REFLECT_APPLY(ARRAY_PUSH, stack, [child]);
      }
    }
  }
}

function parseLocallyCapturedJson(captured, label) {
  if (captured.byteLength >= 3
    && captured[0] === 0xef && captured[1] === 0xbb && captured[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = REFLECT_APPLY(
      TEXT_DECODER_DECODE,
      new NATIVE_TEXT_DECODER("utf-8", { fatal: true }),
      [captured]
    );
  } catch (cause) {
    fail("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
  const trimmed = REFLECT_APPLY(STRING_TRIM, source, []);
  if (!trimmed) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(trimmed, {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "bazi-dtt-notice-reconciliation.json",
      sourceType: "script"
    });
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, cause);
  }
  walkJsonAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new NATIVE_SET();
    for (let propertyIndex = 0; propertyIndex < node.properties.length; propertyIndex += 1) {
      const property = node.properties[propertyIndex];
      if (property.type !== "ObjectProperty"
        || property.computed
        || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (REFLECT_APPLY(SET_HAS, keys, [property.key.value])) {
        fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      }
      REFLECT_APPLY(SET_ADD, keys, [property.key.value]);
    }
  });
  try {
    const parsed = JSON_PARSE(source);
    if (!parsed || typeof parsed !== "object" || ARRAY_IS_ARRAY(parsed)) {
      fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof BaziDttNoticeReconciliationError) throw cause;
    fail("JSON_INVALID", `${label} 不是合法 JSON。`, cause);
  }
}

export function parseBaziDttNoticeReconciliationJsonBytes(
  bytes,
  label = "DTT notice reconciliation overlay",
  maxBytes = MAX_ARTIFACT_BYTES
) {
  const captured = captureStrictUint8Array(bytes, label, maxBytes);
  const localParsed = parseLocallyCapturedJson(captured, label);
  let sharedParsed;
  try {
    sharedParsed = parseBaziDttMonthCommandPublicEvidenceJsonBytes(captured, label, maxBytes);
  } catch (cause) {
    fail(cause?.code ?? "JSON_INVALID", `${label} 不是严格 JSON。`, cause);
  }
  if (canonicalStringifyBaziDttNoticeReconciliation(localParsed)
    !== canonicalStringifyBaziDttNoticeReconciliation(sharedParsed)) {
    fail("SHARED_PARSER_MISMATCH", `${label} 的 C-L3 私有解析与共享 C-L2 解析不一致。`);
  }
  return deepFreezeJson(localParsed);
}

function deepFreezeJson(value, seen = new NATIVE_SET()) {
  if (!value || typeof value !== "object" || REFLECT_APPLY(SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
  for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
    const key = descriptorKeys[keyIndex];
    const descriptor = descriptors[key];
    if (descriptor && OBJECT_HAS_OWN(descriptor, "value")) deepFreezeJson(descriptor.value, seen);
  }
  return OBJECT_FREEZE(value);
}

function assertRecursivelyFrozenJson(value, seen = new NATIVE_SET()) {
  if (!value || typeof value !== "object" || REFLECT_APPLY(SET_HAS, seen, [value])) return;
  if (UTIL_IS_PROXY(value)) {
    fail("FULL_LOAD_INVARIANT_FAILED", "DTT notice reconciliation full-load 结果不得包含 Proxy。");
  }
  REFLECT_APPLY(SET_ADD, seen, [value]);
  let descriptors;
  let frozen;
  try {
    descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    frozen = OBJECT_IS_FROZEN(value);
  } catch (cause) {
    fail("FULL_LOAD_INVARIANT_FAILED", "DTT notice reconciliation full-load 冻结不变量不可检查。", cause);
  }
  if (!frozen) {
    fail("FULL_LOAD_INVARIANT_FAILED", "DTT notice reconciliation full-load 结果未递归冻结。");
  }
  const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
  for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
    const key = descriptorKeys[keyIndex];
    const descriptor = descriptors[key];
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value")
      || descriptor.configurable !== false || descriptor.writable !== false) {
      fail("FULL_LOAD_INVARIANT_FAILED", "DTT notice reconciliation full-load 结果含可变或访问器字段。");
    }
    assertRecursivelyFrozenJson(descriptor.value, seen);
  }
}

function assertExactKeys(value, expected, label, code = "ARTIFACT_SCHEMA_INVALID") {
  if (!value || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail(code, `${label} 必须是 JSON 对象。`);
  }
  const actual = OBJECT_KEYS(value);
  const wanted = [];
  for (let keyIndex = 0; keyIndex < expected.length; keyIndex += 1) {
    REFLECT_APPLY(ARRAY_PUSH, wanted, [expected[keyIndex]]);
  }
  REFLECT_APPLY(ARRAY_SORT, actual, [compareCodeUnits]);
  REFLECT_APPLY(ARRAY_SORT, wanted, [compareCodeUnits]);
  if (!exactJson(actual, wanted)) fail(code, `${label} 字段集合不匹配。`);
}

function assertExact(value, expected, label, code = "ARTIFACT_BOUNDARY_DRIFT") {
  if (!exactJson(value, expected)) fail(code, `${label} 与固定失败关闭边界不一致。`);
}

function canonicalUtc(value, label) {
  let timestamp;
  let normalized;
  try {
    timestamp = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [value]);
    normalized = REFLECT_APPLY(DATE_TO_ISO_STRING, new NATIVE_DATE(timestamp), []);
  } catch {
    fail("TIME_INVALID", `${label} 必须是严格毫秒 UTC。`);
  }
  if (typeof value !== "string" || !REFLECT_APPLY(REGEXP_TEST, UTC_PATTERN, [value])
    || !NUMBER_IS_FINITE(timestamp) || normalized !== value) {
    fail("TIME_INVALID", `${label} 必须是严格毫秒 UTC。`);
  }
  return value;
}

function validateRelativePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, ["\\"])
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, ["\0"])
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, [":"])) {
    fail("ARTIFACT_PATH_INVALID", "DTT notice reconciliation 路径必须是仓内规范相对路径。");
  }
  const parts = REFLECT_APPLY(STRING_SPLIT, relativePath, ["/"]);
  const hasUnsafePart = REFLECT_APPLY(
    ARRAY_SOME,
    parts,
    [(part) => !part || part === "." || part === ".."]
  );
  if (hasUnsafePart || REFLECT_APPLY(PATH_IS_ABSOLUTE, path, [relativePath])) {
    fail("ARTIFACT_PATH_INVALID", "DTT notice reconciliation 路径不得为空、绝对或逃逸。");
  }
  return parts;
}

function sameParentIdentity(left, right) {
  return left.path === right.path
    && left.rawBytes === right.rawBytes
    && left.rawSha256 === right.rawSha256
    && left.ledgerId === right.ledgerId
    && left.ledgerDigest === right.ledgerDigest
    && left.candidateId === right.candidateId
    && left.candidateDigest === right.candidateDigest;
}

function expectedCurrentParent(historical) {
  return OBJECT_FREEZE({
    ...historical,
    supersession: OBJECT_FREEZE({
      state: "not_started_current_parent_is_historical_parent",
      supersedesHistoricalParent: false,
      supersedes: null,
      inPlaceHistoricalParentMutationAccepted: false
    })
  });
}

function currentParentIdentity(parent) {
  const { supersession: _supersession, ...identity } = parent;
  return identity;
}

export function verifyBaziDttNoticeReconciliationArtifact(input) {
  const overlay = passiveSnapshot(input);
  assertExactKeys(overlay, TOP_LEVEL_KEYS, "overlay");
  if (overlay.schemaVersion !== "1.0.0"
    || overlay.recordType !== "bazi_dtt_notice_reconciliation_overlay_v1"
    || overlay.reconciliationId !== "hakimi.bazi.dtt-notice-reconciliation/1.0.0"
    || overlay.status !== "unresolved_versioned_parent_supersession_required_promotion_blocked") {
    fail("ARTIFACT_IDENTITY_INVALID", "DTT notice reconciliation 根身份无效。");
  }
  canonicalUtc(overlay.createdAt, "createdAt");
  assertExact(overlay.releaseGovernance, RELEASE_GOVERNANCE, "releaseGovernance", "RELEASE_GOVERNANCE_DRIFT");
  assertExact(overlay.subjectLock, SUBJECT_LOCK, "subjectLock", "SUBJECT_LOCK_DRIFT");
  assertExact(overlay.historicalEvidence, HISTORICAL_EVIDENCE, "historicalEvidence", "HISTORICAL_EVIDENCE_DRIFT");
  assertExactKeys(overlay.historicalParents, ["sourceBinding", "sourceRights"], "historicalParents");
  assertExact(overlay.historicalParents.sourceBinding, HISTORICAL_SOURCE_PARENT,
    "historicalParents.sourceBinding", "HISTORICAL_PARENT_DRIFT");
  assertExact(overlay.historicalParents.sourceRights, HISTORICAL_RIGHTS_PARENT,
    "historicalParents.sourceRights", "HISTORICAL_PARENT_DRIFT");
  assertExactKeys(overlay.currentParents, ["sourceBinding", "sourceRights"], "currentParents");
  const parentKeys = ["sourceBinding", "sourceRights"];
  const historicalParents = [HISTORICAL_SOURCE_PARENT, HISTORICAL_RIGHTS_PARENT];
  for (let parentIndex = 0; parentIndex < parentKeys.length; parentIndex += 1) {
    const key = parentKeys[parentIndex];
    const historical = historicalParents[parentIndex];
    const current = overlay.currentParents[key];
    assertExactKeys(current, [
      "path", "rawBytes", "rawSha256", "ledgerId", "ledgerDigest",
      "candidateId", "candidateDigest", "supersession"
    ], `currentParents.${key}`);
    validateRelativePath(current.path);
    if (!NUMBER_IS_SAFE_INTEGER(current.rawBytes) || current.rawBytes <= 0
      || !REFLECT_APPLY(REGEXP_TEST, SHA256_PATTERN, [current.rawSha256 ?? ""])
      || !REFLECT_APPLY(REGEXP_TEST, SHA256_PATTERN, [current.ledgerDigest ?? ""])
      || !REFLECT_APPLY(REGEXP_TEST, SHA256_PATTERN, [current.candidateDigest ?? ""])) {
      fail("CURRENT_PARENT_IDENTITY_INVALID", `currentParents.${key} 身份字段无效。`);
    }
    assertExact(current, expectedCurrentParent(historical), `currentParents.${key}`, "CURRENT_PARENT_DRIFT");
  }
  assertExact(overlay.noticeProjection, {
    historicalParentCompositeNotice: "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated",
    currentSourceParentSsidNotice: "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated",
    currentSourceParentCadalNotice: "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated",
    currentRightsParentWorkNotice: "pd_old_template_observed",
    ssidFixedFilePageNotice: "pd_scan_top_level_observed",
    cadalFixedFilePageNotice: "pd_old_top_level_observed_without_pd_scan_template",
    oldidMainSlotPdOldLiteralObserved: false,
    renderedPagePdOldDependencyObserved: true,
    dependencyRevisionsPinnedAtCapture: true,
    oldidAlonePinsRenderedNotice: false,
    parentNoticeProjectionReestablishedForAllCarriers: false,
    publicDomainMarkCountsAsLicense: false,
    markerAuthorityAndAccuracyVerified: false
  }, "noticeProjection", "NOTICE_PROJECTION_DRIFT");
  assertExact(overlay.reconciliationDecision, {
    state: "unresolved_current_parents_are_historical_discrepant_parents",
    historicalFindingAcknowledged: true,
    sourceParentSupersessionRequired: true,
    rightsParentSupersessionRequired: true,
    currentParentsVersionedSupersessionComplete: false,
    currentParentProjectionCorrected: false,
    noticeDiscrepancyResolved: false,
    promotionBlocked: true,
    promotionGateEffect: "deny_only_no_rights_or_binding_authority",
    inPlaceHistoricalParentMutationAllowed: false,
    cL2MutationRequired: false,
    distributionPolicy: "link_only"
  }, "reconciliationDecision", "RECONCILIATION_DECISION_DRIFT");
  assertExact(overlay.formalAdmissionBoundary, {
    sourceBodyStored: false,
    exactQuoteTextStored: false,
    formalSourceRightsRecordCount: 0,
    formalSourceCarrierRecordCount: 0,
    knowledgeDocumentCount: 0,
    redistributableSourceCount: 0,
    independentSourceRightsReviewsVerified: 0,
    independentDomainReviewsVerified: 0,
    bindingFrozen: false,
    bindingFrozenVerified: 0,
    bindingRequired: 12,
    legalConclusion: "not_established",
    redistributionAuthorized: false
  }, "formalAdmissionBoundary", "FORMAL_ADMISSION_PROMOTION_FORBIDDEN");
  assertExact(overlay.futureResolutionRequirements, {
    historicalEvidenceMustRemainUnchanged: true,
    historicalParentIdentitiesMustRemainRecorded: true,
    correctedCurrentParentsMustUseNewVersionedPaths: true,
    currentParentsMustExplicitlySupersedeHistoricalSemanticIdentities: true,
    sourceAndRightsSupersessionMustBePaired: true,
    correctedCarrierNoticeProjectionMustBeStructuredPerAnchor: true,
    oldidLiteralAndRenderedDependencyMustRemainSeparate: true,
    publicDomainMarkCannotBecomeLicense: true,
    formalSourceRightsAndCarrierRecordsRemainSeparatePrerequisites: true,
    cL2RewriteAllowed: false,
    historicalParentInPlaceRewriteAllowed: false
  }, "futureResolutionRequirements", "FUTURE_RESOLUTION_POLICY_DRIFT");
  assertExact(overlay.integrityBoundary, {
    historicalEvidenceVerifiedByPureCL2ArtifactVerifier: true,
    historicalParentIdentitiesMatchCL2: true,
    currentParentsIndependentlyReadAndVerified: true,
    currentParentsSameAsHistoricalRawAndSemanticIdentities: true,
    explicitSupersessionStateRecorded: true,
    historicalParentsMutated: false,
    historicalParentBacklinksAdded: false,
    cL2Mutated: false,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    intervalMutationExcluded: false,
    abaExcluded: false,
    reconciliationDigestIsDigitalSignature: false
  }, "integrityBoundary", "INTEGRITY_BOUNDARY_DRIFT");
  assertExact(overlay.authorityBoundary, {
    contentTruthEstablished: false,
    baziRuleTruthEstablished: false,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    expertReviewBundleComplete: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    fullRepositoryTypecheckPassed: false,
    defaultWebBuildPassed: false,
    browserOrPwaAcceptancePassed: false,
    releaseEvidenceComplete: false,
    deploymentAndRollbackConfirmed: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  }, "authorityBoundary", "AUTHORITY_PROMOTION_FORBIDDEN");
  assertExact(overlay.doesNotEstablish, DOES_NOT_ESTABLISH, "doesNotEstablish", "NEGATIVE_BOUNDARY_DRIFT");
  if (!REFLECT_APPLY(REGEXP_TEST, SHA256_PATTERN, [overlay.reconciliationDigest ?? ""])) {
    fail("RECONCILIATION_DIGEST_INVALID", "reconciliationDigest 必须是小写 SHA-256。");
  }
  if (computeBaziDttNoticeReconciliationDigest(overlay) !== overlay.reconciliationDigest) {
    fail("RECONCILIATION_DIGEST_MISMATCH", "DTT notice reconciliation canonical digest 不一致。");
  }
  if (overlay.reconciliationDigest !== EXPECTED_RECONCILIATION_DIGEST) {
    fail("RECONCILIATION_SELF_RESEAL_FORBIDDEN", "C-L3 v1 不接受自重签后的语义身份变化；请创建新版 overlay。");
  }
  return deepFreezeJson(overlay);
}

function normalizePathIdentity(value) {
  const normalized = REFLECT_APPLY(PATH_RESOLVE, path, [value]);
  return process.platform === "win32"
    ? REFLECT_APPLY(STRING_TO_LOWER_CASE, normalized, [])
    : normalized;
}

function insideRoot(root, candidate) {
  const relative = REFLECT_APPLY(PATH_RELATIVE, path, [root, candidate]);
  return relative === "" || (relative !== ".."
    && !REFLECT_APPLY(STRING_STARTS_WITH, relative, [`..${PATH_SEPARATOR}`])
    && !REFLECT_APPLY(PATH_IS_ABSOLUTE, path, [relative]));
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function captureDirectoryChain(root, parts) {
  const snapshots = [];
  let cursor = root;
  for (let partIndex = -1; partIndex < parts.length; partIndex += 1) {
    const part = partIndex < 0 ? null : parts[partIndex];
    if (part !== null) cursor = REFLECT_APPLY(PATH_JOIN, path, [cursor, part]);
    let metadata;
    let resolved;
    try {
      metadata = await lstat(cursor, { bigint: true });
      resolved = await realpath(cursor);
    } catch (cause) {
      fail("DIRECTORY_CHAIN_INVALID", "DTT notice reconciliation 目录链不可安全读取。", cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, metadata, [])
      || !REFLECT_APPLY(STATS_IS_DIRECTORY, metadata, [])
      || normalizePathIdentity(resolved) !== normalizePathIdentity(cursor)) {
      fail("DIRECTORY_CHAIN_INVALID", "DTT notice reconciliation 目录链包含链接、别名或非目录端点。");
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [OBJECT_FREEZE({ path: cursor, resolved, metadata })]);
  }
  return snapshots;
}

async function revalidateDirectoryChain(snapshots) {
  for (let snapshotIndex = 0; snapshotIndex < snapshots.length; snapshotIndex += 1) {
    const snapshot = snapshots[snapshotIndex];
    let metadata;
    let resolved;
    try {
      metadata = await lstat(snapshot.path, { bigint: true });
      resolved = await realpath(snapshot.path);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "DTT notice reconciliation 读取期间目录链发生变化。", cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, metadata, [])
      || !REFLECT_APPLY(STATS_IS_DIRECTORY, metadata, [])
      || !sameEndpoint(snapshot.metadata, metadata)
      || normalizePathIdentity(resolved) !== normalizePathIdentity(snapshot.resolved)) {
      fail("ENDPOINT_CHANGED", "DTT notice reconciliation 读取期间目录链发生变化。");
    }
  }
}

async function readBoundedHandle(handle, maxBytes) {
  const buffer = REFLECT_APPLY(BUFFER_ALLOC_UNSAFE, NATIVE_BUFFER, [maxBytes + 1]);
  let offset = 0;
  while (offset < buffer.byteLength) {
    const { bytesRead } = await REFLECT_APPLY(FILE_HANDLE_READ, handle, [
      buffer,
      offset,
      buffer.byteLength - offset,
      offset
    ]);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > maxBytes) fail("FILE_SIZE_INVALID", "DTT notice reconciliation 文件在读取时超过上限。");
  let backingBuffer;
  let byteOffset;
  try {
    backingBuffer = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, buffer, []);
    byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, buffer, []);
  } catch (cause) {
    fail("FILE_READ_INVALID", "DTT notice reconciliation 读取缓冲区内部槽不可读。", cause);
  }
  const sourceView = new NATIVE_UINT8_ARRAY(backingBuffer, byteOffset, offset);
  const captured = new NATIVE_UINT8_ARRAY(offset);
  REFLECT_APPLY(UINT8_ARRAY_SET, captured, [sourceView]);
  return captured;
}

async function callTestHook(testHooks, phase, payload) {
  if (typeof testHooks?.[phase] === "function") await testHooks[phase](payload);
}

async function readStableWorkspaceFile(workspaceRootInput, relativePath, maxBytes, testHooks = undefined) {
  const parts = validateRelativePath(relativePath);
  const requestedRoot = REFLECT_APPLY(PATH_RESOLVE, path, [workspaceRootInput]);
  const directoryParts = [];
  for (let partIndex = 0; partIndex < parts.length - 1; partIndex += 1) {
    REFLECT_APPLY(ARRAY_PUSH, directoryParts, [parts[partIndex]]);
  }
  const directoryChain = await captureDirectoryChain(requestedRoot, directoryParts);
  const root = directoryChain[0].resolved;
  const resolveArguments = [root];
  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    REFLECT_APPLY(ARRAY_PUSH, resolveArguments, [parts[partIndex]]);
  }
  const absolutePath = REFLECT_APPLY(PATH_RESOLVE, path, resolveArguments);
  if (!insideRoot(root, absolutePath) || normalizePathIdentity(root) !== normalizePathIdentity(requestedRoot)) {
    fail("ARTIFACT_PATH_INVALID", "DTT notice reconciliation 路径越出工作区或 root 为别名。");
  }
  let beforePath;
  let resolved;
  try {
    beforePath = await lstat(absolutePath, { bigint: true });
    resolved = await realpath(absolutePath);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", `DTT notice reconciliation 文件不可读：${relativePath}`, cause);
  }
  if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, beforePath, [])
    || !REFLECT_APPLY(STATS_IS_FILE, beforePath, [])
    || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
    fail("SYMLINK_REJECTED", `DTT notice reconciliation 拒绝链接或路径别名：${relativePath}`);
  }
  if (beforePath.nlink !== 1n) fail("HARDLINK_REJECTED", `DTT notice reconciliation 文件必须是单链接：${relativePath}`);
  if (beforePath.size <= 0n || beforePath.size > BigInt(maxBytes)) {
    fail("FILE_SIZE_INVALID", `DTT notice reconciliation 文件为空或超限：${relativePath}`);
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", `DTT notice reconciliation held handle 打开失败：${relativePath}`, cause);
  }
  try {
    const before = await REFLECT_APPLY(FILE_HANDLE_STAT, handle, [{ bigint: true }]);
    if (!REFLECT_APPLY(STATS_IS_FILE, before, [])
      || before.nlink !== 1n || !sameEndpoint(beforePath, before)) {
      fail("ENDPOINT_CHANGED", `DTT notice reconciliation 文件打开前变化：${relativePath}`);
    }
    await callTestHook(testHooks, "afterOpenBeforeRead", OBJECT_FREEZE({ absolutePath, handle, relativePath }));
    const readBytes = await readBoundedHandle(handle, maxBytes);
    await callTestHook(testHooks, "afterBytesRead", OBJECT_FREEZE({ absolutePath, handle, relativePath, readBytes }));
    const after = await REFLECT_APPLY(FILE_HANDLE_STAT, handle, [{ bigint: true }]);
    let afterPath;
    let afterResolved;
    try {
      afterPath = await lstat(absolutePath, { bigint: true });
      afterResolved = await realpath(absolutePath);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", `DTT notice reconciliation 路径端点变化：${relativePath}`, cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, afterPath, [])
      || !REFLECT_APPLY(STATS_IS_FILE, afterPath, []) || afterPath.nlink !== 1n
      || !sameEndpoint(before, after) || !sameEndpoint(after, afterPath)
      || BigInt(readBytes.byteLength) !== after.size
      || normalizePathIdentity(afterResolved) !== normalizePathIdentity(absolutePath)) {
      fail("ENDPOINT_CHANGED", `DTT notice reconciliation 读取期间端点变化：${relativePath}`);
    }
    await revalidateDirectoryChain(directoryChain);
    const bytes = captureStrictUint8Array(readBytes, relativePath, maxBytes);
    return OBJECT_FREEZE({
      path: relativePath,
      rawBytes: bytes.byteLength,
      rawSha256: sha256(bytes),
      bytes
    });
  } finally {
    try {
      await handle.close();
    } catch {
      // Best-effort close; the primary validation failure remains authoritative.
    }
  }
}

function publicArtifactIdentity(snapshot) {
  return OBJECT_FREEZE({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

function parentIdentity(snapshot, ledger, candidate, candidateKey) {
  return OBJECT_FREEZE({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    candidateId: candidate[candidateKey],
    candidateDigest: candidate.candidateDigest
  });
}

async function readAndVerifyCurrentParents(workspaceRoot, currentParents, testHooksByPath = undefined) {
  const sourceSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    currentParents.sourceBinding.path,
    MAX_PARENT_BYTES,
    testHooksByPath?.[currentParents.sourceBinding.path]
  );
  const rightsSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    currentParents.sourceRights.path,
    MAX_PARENT_BYTES,
    testHooksByPath?.[currentParents.sourceRights.path]
  );
  const sourceLedger = parseBaziDttNoticeReconciliationJsonBytes(
    sourceSnapshot.bytes,
    "current source binding parent",
    MAX_PARENT_BYTES
  );
  const rightsLedger = parseBaziDttNoticeReconciliationJsonBytes(
    rightsSnapshot.bytes,
    "current source rights parent",
    MAX_PARENT_BYTES
  );
  try {
    verifyBaziSourceBindingCandidateLedger(sourceLedger);
    verifyBaziSourceRightsCandidateLedger(rightsLedger, sourceLedger);
  } catch (cause) {
    fail("CURRENT_PARENT_INVALID", "current source/rights parents 未通过各自完整 verifier。", cause);
  }
  const sourceCandidate = REFLECT_APPLY(ARRAY_FIND, sourceLedger.candidates, [
    (entry) => entry.candidateId === SUBJECT_LOCK.sourceCandidateId
  ]);
  const rightsCandidate = REFLECT_APPLY(ARRAY_FIND, rightsLedger.candidates, [
    (entry) => entry.rightsCandidateId === SUBJECT_LOCK.rightsCandidateId
  ]);
  if (!sourceCandidate || !rightsCandidate) {
    fail("CURRENT_PARENT_SUBJECT_MISSING", "current parents 缺少 DTT subject candidate。");
  }
  return OBJECT_FREEZE({
    sourceSnapshot,
    rightsSnapshot,
    sourceLedger,
    rightsLedger,
    sourceCandidate,
    rightsCandidate,
    sourceIdentity: parentIdentity(sourceSnapshot, sourceLedger, sourceCandidate, "candidateId"),
    rightsIdentity: parentIdentity(rightsSnapshot, rightsLedger, rightsCandidate, "rightsCandidateId")
  });
}

async function readHistoricalEvidenceArtifact(workspaceRoot, testHooks = undefined) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    HISTORICAL_EVIDENCE.path,
    MAX_ARTIFACT_BYTES,
    testHooks
  );
  if (snapshot.rawBytes !== HISTORICAL_EVIDENCE.rawBytes
    || snapshot.rawSha256 !== HISTORICAL_EVIDENCE.rawSha256) {
    fail("HISTORICAL_EVIDENCE_DRIFT", "historical C-L2 child raw identity 漂移。");
  }
  const parsed = parseBaziDttNoticeReconciliationJsonBytes(
    snapshot.bytes,
    "historical DTT C-L2 child",
    MAX_ARTIFACT_BYTES
  );
  let observation;
  try {
    observation = verifyBaziDttMonthCommandPublicEvidenceArtifact(parsed);
  } catch (cause) {
    fail("HISTORICAL_EVIDENCE_UNVERIFIED", "historical C-L2 child 未通过纯 artifact verifier。", cause);
  }
  return OBJECT_FREEZE({ observation, artifact: publicArtifactIdentity(snapshot) });
}

function verifyHistoricalEvidence(historicalRead) {
  const cL2 = historicalRead.observation;
  const source = cL2.parentSourceBindingLedger;
  const rights = cL2.parentSourceRightsLedger;
  const sourceProjection = {
    path: source.path,
    rawBytes: source.rawBytes,
    rawSha256: source.rawSha256,
    ledgerId: source.ledgerId,
    ledgerDigest: source.ledgerDigest,
    candidateId: source.sourceCandidateId,
    candidateDigest: source.sourceCandidateDigest
  };
  const rightsProjection = {
    path: rights.path,
    rawBytes: rights.rawBytes,
    rawSha256: rights.rawSha256,
    ledgerId: rights.ledgerId,
    ledgerDigest: rights.ledgerDigest,
    candidateId: rights.rightsCandidateId,
    candidateDigest: rights.rightsCandidateDigest
  };
  if (!exactJson(historicalRead.artifact, {
    path: HISTORICAL_EVIDENCE.path,
    rawBytes: HISTORICAL_EVIDENCE.rawBytes,
    rawSha256: HISTORICAL_EVIDENCE.rawSha256
  })
    || cL2.observationId !== HISTORICAL_EVIDENCE.observationId
    || cL2.observationDigest !== HISTORICAL_EVIDENCE.observationDigest
    || !exactJson(sourceProjection, HISTORICAL_SOURCE_PARENT)
    || !exactJson(rightsProjection, HISTORICAL_RIGHTS_PARENT)) {
    fail("HISTORICAL_EVIDENCE_DRIFT", "historical C-L2 或其旧父账身份漂移。");
  }
}

function buildFromVerifiedDependencies(createdAt, historicalRead, parents) {
  verifyHistoricalEvidence(historicalRead);
  const cL2 = historicalRead.observation;
  if (!sameParentIdentity(parents.sourceIdentity, HISTORICAL_SOURCE_PARENT)
    || !sameParentIdentity(parents.rightsIdentity, HISTORICAL_RIGHTS_PARENT)) {
    fail(
      "VERSIONED_SUPERSESSION_REQUIRED",
      "C-L3 v1 仅接受当前仍等于历史父账的 unresolved 状态；修正必须使用新版本父账与新版 overlay，不得原地改写。"
    );
  }
  const ssid = REFLECT_APPLY(ARRAY_FIND, parents.sourceCandidate.facsimileAnchors, [
    (anchor) => anchor.anchorId === "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1"
  ]);
  const cadal = REFLECT_APPLY(ARRAY_FIND, parents.sourceCandidate.facsimileAnchors, [
    (anchor) => anchor.anchorId === SUBJECT_LOCK.affectedAnchorId
  ]);
  if (!ssid || !cadal
    || ssid.licenseOrNoticeObserved !== "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated"
    || cadal.licenseOrNoticeObserved !== "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated"
    || parents.rightsCandidate.workLayer.pageSpecificNoticeObservation !== "pd_old_template_observed") {
    fail("CURRENT_NOTICE_PROJECTION_DRIFT", "current parent notice projection 不再是 C-L3 v1 记录的 unresolved 旧投影。");
  }
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_dtt_notice_reconciliation_overlay_v1",
    reconciliationId: "hakimi.bazi.dtt-notice-reconciliation/1.0.0",
    status: "unresolved_versioned_parent_supersession_required_promotion_blocked",
    createdAt: canonicalUtc(createdAt, "createdAt"),
    releaseGovernance: RELEASE_GOVERNANCE,
    subjectLock: SUBJECT_LOCK,
    historicalEvidence: HISTORICAL_EVIDENCE,
    historicalParents: {
      sourceBinding: HISTORICAL_SOURCE_PARENT,
      sourceRights: HISTORICAL_RIGHTS_PARENT
    },
    currentParents: {
      sourceBinding: expectedCurrentParent(parents.sourceIdentity),
      sourceRights: expectedCurrentParent(parents.rightsIdentity)
    },
    noticeProjection: {
      historicalParentCompositeNotice: "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated",
      currentSourceParentSsidNotice: ssid.licenseOrNoticeObserved,
      currentSourceParentCadalNotice: cadal.licenseOrNoticeObserved,
      currentRightsParentWorkNotice: parents.rightsCandidate.workLayer.pageSpecificNoticeObservation,
      ssidFixedFilePageNotice: cL2.parentNoticeDiscrepancy.ssidCurrentFixedFilePageObservation,
      cadalFixedFilePageNotice: cL2.parentNoticeDiscrepancy.cadalCurrentFixedFilePageObservation,
      oldidMainSlotPdOldLiteralObserved:
        cL2.operatorRecordedCaptures.wikisource.oldidMainSlotPdOldLiteralObserved,
      renderedPagePdOldDependencyObserved:
        cL2.operatorRecordedCaptures.renderedNoticeDependencies.renderedPagePdOldDependencyObserved,
      dependencyRevisionsPinnedAtCapture:
        cL2.operatorRecordedCaptures.renderedNoticeDependencies.dependencyRevisionsPinnedAtCapture,
      oldidAlonePinsRenderedNotice:
        cL2.operatorRecordedCaptures.renderedNoticeDependencies.oldidAlonePinsRenderedNotice,
      parentNoticeProjectionReestablishedForAllCarriers:
        cL2.parentNoticeDiscrepancy.parentNoticeProjectionReestablishedForAllCarriers,
      publicDomainMarkCountsAsLicense: cL2.rightsBoundary.publicDomainMarkCountsAsLicense,
      markerAuthorityAndAccuracyVerified: cL2.rightsBoundary.markerAuthorityAndAccuracyVerified
    },
    reconciliationDecision: {
      state: "unresolved_current_parents_are_historical_discrepant_parents",
      historicalFindingAcknowledged: true,
      sourceParentSupersessionRequired: true,
      rightsParentSupersessionRequired: true,
      currentParentsVersionedSupersessionComplete: false,
      currentParentProjectionCorrected: false,
      noticeDiscrepancyResolved: false,
      promotionBlocked: true,
      promotionGateEffect: "deny_only_no_rights_or_binding_authority",
      inPlaceHistoricalParentMutationAllowed: false,
      cL2MutationRequired: false,
      distributionPolicy: "link_only"
    },
    formalAdmissionBoundary: {
      sourceBodyStored: false,
      exactQuoteTextStored: false,
      formalSourceRightsRecordCount: 0,
      formalSourceCarrierRecordCount: 0,
      knowledgeDocumentCount: 0,
      redistributableSourceCount: 0,
      independentSourceRightsReviewsVerified: 0,
      independentDomainReviewsVerified: 0,
      bindingFrozen: false,
      bindingFrozenVerified: 0,
      bindingRequired: 12,
      legalConclusion: "not_established",
      redistributionAuthorized: false
    },
    futureResolutionRequirements: {
      historicalEvidenceMustRemainUnchanged: true,
      historicalParentIdentitiesMustRemainRecorded: true,
      correctedCurrentParentsMustUseNewVersionedPaths: true,
      currentParentsMustExplicitlySupersedeHistoricalSemanticIdentities: true,
      sourceAndRightsSupersessionMustBePaired: true,
      correctedCarrierNoticeProjectionMustBeStructuredPerAnchor: true,
      oldidLiteralAndRenderedDependencyMustRemainSeparate: true,
      publicDomainMarkCannotBecomeLicense: true,
      formalSourceRightsAndCarrierRecordsRemainSeparatePrerequisites: true,
      cL2RewriteAllowed: false,
      historicalParentInPlaceRewriteAllowed: false
    },
    integrityBoundary: {
      historicalEvidenceVerifiedByPureCL2ArtifactVerifier: true,
      historicalParentIdentitiesMatchCL2: true,
      currentParentsIndependentlyReadAndVerified: true,
      currentParentsSameAsHistoricalRawAndSemanticIdentities: true,
      explicitSupersessionStateRecorded: true,
      historicalParentsMutated: false,
      historicalParentBacklinksAdded: false,
      cL2Mutated: false,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false,
      reconciliationDigestIsDigitalSignature: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      baziRuleTruthEstablished: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      fullRepositoryTypecheckPassed: false,
      defaultWebBuildPassed: false,
      browserOrPwaAcceptancePassed: false,
      releaseEvidenceComplete: false,
      deploymentAndRollbackConfirmed: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: DOES_NOT_ESTABLISH
  };
  return verifyBaziDttNoticeReconciliationArtifact({
    ...unsigned,
    reconciliationDigest: computeBaziDttNoticeReconciliationDigest(unsigned)
  });
}

export async function buildCurrentBaziDttNoticeReconciliation(workspaceRoot = process.cwd(), options = {}) {
  const createdAt = options.createdAt ?? "2026-08-30T00:00:00.000Z";
  const requestedParents = {
    sourceBinding: { path: options.currentSourceParentPath ?? HISTORICAL_SOURCE_PARENT.path },
    sourceRights: { path: options.currentRightsParentPath ?? HISTORICAL_RIGHTS_PARENT.path }
  };
  const historicalRead = await readHistoricalEvidenceArtifact(
    workspaceRoot,
    options.testHooksByPath?.[HISTORICAL_EVIDENCE.path]
  );
  const parents = await readAndVerifyCurrentParents(
    workspaceRoot,
    requestedParents,
    options.testHooksByPath
  );
  return buildFromVerifiedDependencies(createdAt, historicalRead, parents);
}

async function readOverlayArtifact(workspaceRoot, testHooks = undefined) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH,
    MAX_ARTIFACT_BYTES,
    testHooks
  );
  if (snapshot.rawBytes !== OVERLAY_RAW_IDENTITY.rawBytes
    || snapshot.rawSha256 !== OVERLAY_RAW_IDENTITY.rawSha256) {
    fail("ARTIFACT_DRIFT", "持久化 C-L3 overlay raw bytes/SHA-256 漂移。");
  }
  const parsed = parseBaziDttNoticeReconciliationJsonBytes(snapshot.bytes);
  return OBJECT_FREEZE({
    overlay: verifyBaziDttNoticeReconciliationArtifact(parsed),
    artifact: publicArtifactIdentity(snapshot)
  });
}

async function buildVerifiedResult(workspaceRoot, persistedRead, callerInput = undefined, testHooksByPath = undefined) {
  const persisted = persistedRead.overlay;
  const historicalRead = await readHistoricalEvidenceArtifact(
    workspaceRoot,
    testHooksByPath?.[HISTORICAL_EVIDENCE.path]
  );
  const parents = await readAndVerifyCurrentParents(
    workspaceRoot,
    persisted.currentParents,
    testHooksByPath
  );
  const expected = buildFromVerifiedDependencies(persisted.createdAt, historicalRead, parents);
  if (!exactJson(persisted, expected)) {
    fail("PERSISTED_CURRENT_MISMATCH", "持久化 C-L3 overlay 与当前父账及历史 C-L2 不一致。");
  }
  if (callerInput !== undefined) {
    const caller = verifyBaziDttNoticeReconciliationArtifact(callerInput);
    if (!exactJson(caller, persisted)) {
      fail("CALLER_PERSISTED_MISMATCH", "调用方 C-L3 overlay 与持久化 artifact 不一致。");
    }
  }
  const result = deepFreezeJson({
    offlineDttNoticeReconciliationOverlayMechanicallyVerified: true,
    reconciliationId: persisted.reconciliationId,
    reconciliationDigest: persisted.reconciliationDigest,
    bindingId: persisted.subjectLock.bindingId,
    evidenceSubjectId: persisted.subjectLock.evidenceSubjectId,
    historicalParentIdentities: persisted.historicalParents,
    currentParentIdentities: {
      sourceBinding: currentParentIdentity(persisted.currentParents.sourceBinding),
      sourceRights: currentParentIdentity(persisted.currentParents.sourceRights)
    },
    resolved: persisted.reconciliationDecision.noticeDiscrepancyResolved,
    promotionBlocked: persisted.reconciliationDecision.promotionBlocked,
    distributionPolicy: persisted.reconciliationDecision.distributionPolicy,
    formalSourceRightsRecordCount: persisted.formalAdmissionBoundary.formalSourceRightsRecordCount,
    formalSourceCarrierRecordCount: persisted.formalAdmissionBoundary.formalSourceCarrierRecordCount,
    bindingFrozenVerified: persisted.formalAdmissionBoundary.bindingFrozenVerified,
    contentTruthEstablished: persisted.authorityBoundary.contentTruthEstablished,
    expertTruthEstablished: persisted.authorityBoundary.expertTruthEstablished,
    rightsLegalConclusionEstablished: persisted.authorityBoundary.rightsLegalConclusionEstablished,
    releaseReady: persisted.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: persisted.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: persisted.authorityBoundary.expertClaimsAuthorized,
    crossFileAtomicSnapshot: persisted.integrityBoundary.crossFileAtomicSnapshot,
    mutationEpochAvailable: persisted.integrityBoundary.mutationEpochAvailable,
    mutationEpochReceipt: persisted.integrityBoundary.mutationEpochReceipt,
    intervalMutationExcluded: persisted.integrityBoundary.intervalMutationExcluded,
    abaExcluded: persisted.integrityBoundary.abaExcluded,
    artifact: persistedRead.artifact,
    overlay: persisted
  });
  assertRecursivelyFrozenJson(result);
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export async function readBaziDttNoticeReconciliation(workspaceRoot = process.cwd()) {
  return (await readOverlayArtifact(workspaceRoot)).overlay;
}

export async function loadBaziDttNoticeReconciliation(workspaceRoot = process.cwd()) {
  const persistedRead = await readOverlayArtifact(workspaceRoot);
  return buildVerifiedResult(workspaceRoot, persistedRead);
}

export async function verifyBaziDttNoticeReconciliation(workspaceRoot = process.cwd(), callerInput) {
  const persistedRead = await readOverlayArtifact(workspaceRoot);
  return buildVerifiedResult(workspaceRoot, persistedRead, callerInput);
}

export function isVerifiedBaziDttNoticeReconciliation(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]) === true;
}

export const baziDttNoticeReconciliationTestOnly = OBJECT_FREEZE({
  OVERLAY_RAW_IDENTITY,
  EXPECTED_RECONCILIATION_DIGEST,
  HISTORICAL_EVIDENCE,
  HISTORICAL_SOURCE_PARENT,
  HISTORICAL_RIGHTS_PARENT,
  readBoundedHandle,
  readStableWorkspaceFile,
  readHistoricalEvidenceArtifact,
  readOverlayArtifact,
  async loadWithTestHooks(workspaceRoot, testHooksByPath = {}) {
    const persistedRead = await readOverlayArtifact(
      workspaceRoot,
      testHooksByPath[BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH]
    );
    return buildVerifiedResult(workspaceRoot, persistedRead, undefined, testHooksByPath);
  }
});
