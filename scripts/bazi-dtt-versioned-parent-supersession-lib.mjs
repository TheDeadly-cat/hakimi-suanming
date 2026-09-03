import { constants as fsConstants } from "node:fs";
import { open, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import {
  computeCandidateDigest,
  computeLedgerDigest,
  verifyBaziSourceBindingCandidateLedger
} from "./bazi-source-binding-candidate-lib.mjs";
import {
  computeRightsCandidateDigest,
  computeRightsCandidateLedgerDigest,
  verifyBaziSourceRightsCandidateLedger
} from "./bazi-source-rights-candidate-lib.mjs";
import {
  canonicalStringifyBaziDttNoticeReconciliation,
  parseBaziDttNoticeReconciliationJsonBytes
} from "./bazi-dtt-notice-reconciliation-lib.mjs";

const FS_OPEN = open;
const FS_LSTAT = lstat;
const FS_REALPATH = realpath;
const CRYPTO_CREATE_HASH = createHash;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_SET = Set;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const ARRAY_INCLUDES = Array.prototype.includes;
const ARRAY_PUSH = Array.prototype.push;
const STRING_INCLUDES = String.prototype.includes;
const STRING_SPLIT = String.prototype.split;
const STRING_STARTS_WITH = String.prototype.startsWith;
const STRING_TO_LOWER_CASE = String.prototype.toLowerCase;
const REGEXP_TEST = RegExp.prototype.test;
const STRUCTURED_CLONE = globalThis.structuredClone;
const JSON_STRINGIFY = JSON.stringify;
const BUFFER_FROM = Buffer.from;
const BUFFER_ALLOC_UNSAFE = Buffer.allocUnsafe;
const NATIVE_BUFFER = Buffer;
const NATIVE_UINT8_ARRAY = Uint8Array;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const TYPED_ARRAY_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [UINT8_ARRAY_PROTOTYPE]);
const TYPED_ARRAY_BUFFER_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [TYPED_ARRAY_PROTOTYPE, "buffer"]
)?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [TYPED_ARRAY_PROTOTYPE, "byteOffset"]
)?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = REFLECT_APPLY(
  OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
  Object,
  [TYPED_ARRAY_PROTOTYPE, "byteLength"]
)?.get;
const UINT8_ARRAY_SET = UINT8_ARRAY_PROTOTYPE.set;
const BIGINT_FROM = BigInt;
const PROCESS_CWD = process.cwd;
const PROCESS_PLATFORM = process.platform;
const HASH_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [CRYPTO_CREATE_HASH("sha256")]);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const FILE_HANDLE_PROBE = await FS_OPEN(new URL(import.meta.url), fsConstants.O_RDONLY);
const FILE_HANDLE_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [FILE_HANDLE_PROBE]);
const FILE_HANDLE_READ = FILE_HANDLE_PROTOTYPE.read;
const FILE_HANDLE_STAT = FILE_HANDLE_PROTOTYPE.stat;
const FILE_HANDLE_PROBE_CLOSE = FILE_HANDLE_PROBE.close;
const STATS_PROBE = await REFLECT_APPLY(FILE_HANDLE_STAT, FILE_HANDLE_PROBE, [{ bigint: true }]);
const STATS_PROTOTYPE = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [STATS_PROBE]);
const STATS_IS_FILE = STATS_PROTOTYPE.isFile;
const STATS_IS_DIRECTORY = STATS_PROTOTYPE.isDirectory;
const STATS_IS_SYMBOLIC_LINK = STATS_PROTOTYPE.isSymbolicLink;
await REFLECT_APPLY(FILE_HANDLE_PROBE_CLOSE, FILE_HANDLE_PROBE, []);
const PATH_IS_ABSOLUTE = path.isAbsolute;
const PATH_JOIN = path.join;
const PATH_RELATIVE = path.relative;
const PATH_RESOLVE = path.resolve;
const PATH_SEPARATOR = path.sep;
const OPEN_READ_ONLY = fsConstants.O_RDONLY;
const OPEN_NO_FOLLOW = fsConstants.O_NOFOLLOW ?? 0;

export const SOURCE_SUPERSESSION_RELATIVE_PATH =
  "content/bazi-strength-source-binding-candidates.v1.6.0.json";
export const RIGHTS_SUPERSESSION_RELATIVE_PATH =
  "content/bazi-strength-source-rights-candidates.v1.2.0.json";
export const SUPERSESSION_RECEIPT_RELATIVE_PATH =
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json";

const HISTORICAL_SOURCE = OBJECT_FREEZE({
  path: "content/bazi-strength-source-binding-candidates.v1.json",
  rawBytes: 47753,
  rawSha256: "e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7",
  ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.5.0",
  ledgerDigest: "44ed9e23490c11c625602b77574efbf7331305bd1bf87634c5b91f568e8b85af",
  candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
  candidateDigest: "26182f43d801dedb7433e53d8e390efc32195ef08555199d933e36a1ed65ca61"
});

const HISTORICAL_RIGHTS = OBJECT_FREEZE({
  path: "content/bazi-strength-source-rights-candidates.v1.json",
  rawBytes: 20806,
  rawSha256: "433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179",
  ledgerId: "hakimi.bazi.strength.source-rights-candidates/1.1.0",
  ledgerDigest: "3776e4b8799ca5221c1765a735c3e34c637b4f4952c9243836fedfbf1ee30a36",
  candidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
  candidateDigest: "631f530ded6a17652c8a419246805b278d0f6f5511b96a1fd6274f386fce633d"
});

const DTT_PUBLIC_EVIDENCE = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  rawBytes: 31062,
  rawSha256: "85788506067b50453545ec786c7a47b0e51a4cf004419cbe8c547f9384c01ae6",
  observationId: "hakimi.bazi.dtt-month-command-public-evidence/2026-08-29T15:17:27.103Z",
  observationDigest: "01e61e4f77526270ef83a0d95fbcb165bf307d5efa09c5a0360ff49bf1735993"
});

const DTT_RECONCILIATION = OBJECT_FREEZE({
  path: "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  rawBytes: 8709,
  rawSha256: "e3f014e8f87457b09ae866b79fe2581f87553658829515db61f597c345f6ff68",
  reconciliationId: "hakimi.bazi.dtt-notice-reconciliation/1.0.0",
  reconciliationDigest: "fabf96fddf7f3710b86f22b0d3f7aa7844087351f30c53fbb823780f3d81ba2f"
});

const BOUND_READINESS = OBJECT_FREEZE({
  path: "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  rawBytes: 30655,
  rawSha256: "1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809",
  ledgerId: "hakimi.bazi.strength.binding-freeze-readiness/1.6.0",
  ledgerDigest: "97406785d688d3ab8b4dc824d7980c890a80bfc829a75279109edcc1c3d48f0c",
  status: "readiness_only_dtt_notice_reconciliation_blocked_bindings_frozen_0_of_12",
  createdAt: "2026-08-26T00:00:00.000Z"
});
const BOUND_READINESS_BASIS_PATHS = OBJECT_FREEZE([
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  HISTORICAL_SOURCE.path,
  HISTORICAL_RIGHTS.path,
  DTT_RECONCILIATION.path,
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts"
]);

const NEW_SOURCE_ID = "hakimi.bazi.strength.source-binding-candidates/1.6.0";
const NEW_RIGHTS_ID = "hakimi.bazi.strength.source-rights-candidates/1.2.0";
const NEW_SOURCE_CANDIDATE_ID = "dtt-chanwei-wikisource-r2600158-candidate-v2";
const NEW_RIGHTS_CANDIDATE_ID = "dtt-chanwei-wikisource-r2600158-rights-candidate-v2";
const RECEIPT_ID = "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0";
const CREATED_AT = "2026-08-30T00:00:00.000Z";
const EXPECTED_NEW_SOURCE = OBJECT_FREEZE({
  path: SOURCE_SUPERSESSION_RELATIVE_PATH,
  rawBytes: 50427,
  rawSha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
  ledgerId: NEW_SOURCE_ID,
  ledgerDigest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c",
  dttCandidateId: NEW_SOURCE_CANDIDATE_ID,
  dttCandidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59"
});
const EXPECTED_NEW_RIGHTS = OBJECT_FREEZE({
  path: RIGHTS_SUPERSESSION_RELATIVE_PATH,
  rawBytes: 23947,
  rawSha256: "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a",
  ledgerId: NEW_RIGHTS_ID,
  ledgerDigest: "300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc",
  dttCandidateId: NEW_RIGHTS_CANDIDATE_ID,
  dttCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c"
});
const EXPECTED_RECEIPT = OBJECT_FREEZE({
  path: SUPERSESSION_RECEIPT_RELATIVE_PATH,
  rawBytes: 9229,
  rawSha256: "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3",
  supersessionId: RECEIPT_ID,
  supersessionDigest: "601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264"
});
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const VERIFIED_RESULTS = new WeakSet();

const RELEASE_GOVERNANCE = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const DOES_NOT_ESTABLISH = OBJECT_FREEZE([
  "formal_parent_promotion_or_active_readiness_rebind",
  "source_body_or_quote_text_storage",
  "work_edition_transcription_or_carrier_identity",
  "work_edition_transcription_or_carrier_rights_clearance",
  "public_domain_or_license_legal_conclusion",
  "formal_source_rights_or_source_carrier_record",
  "knowledge_document",
  "binding_freeze",
  "content_truth",
  "bazi_rule_truth",
  "expert_truth",
  "cross_file_atomic_snapshot",
  "mutation_epoch_interval_or_aba_exclusion",
  "release_readiness",
  "public_release_authorization"
]);

export class BaziDttVersionedParentSupersessionError extends Error {
  constructor(code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "BaziDttVersionedParentSupersessionError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new BaziDttVersionedParentSupersessionError(code, message, cause);
}

function sha256Bytes(bytes) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function sha256Canonical(value) {
  const hash = CRYPTO_CREATE_HASH("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [canonicalStringifyBaziDttNoticeReconciliation(value), "utf8"]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function cloneJson(value) {
  return REFLECT_APPLY(STRUCTURED_CLONE, globalThis, [value]);
}

function deepFreeze(value, seen = new NATIVE_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const keys = REFLECT_APPLY(REFLECT_OWN_KEYS, null, [value]);
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex];
    const descriptor = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
    if (!descriptor || !("value" in descriptor)) {
      fail("NON_DATA_JSON_VALUE", "验证对象不得包含 accessor。 ");
    }
    deepFreeze(descriptor.value, seen);
  }
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function exactJson(left, right) {
  return canonicalStringifyBaziDttNoticeReconciliation(left)
    === canonicalStringifyBaziDttNoticeReconciliation(right);
}

function assertFalseBoundary(record, keys, label) {
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (record?.[key] !== false) fail("AUTHORITY_SMUGGLING", `${label}.${key} 必须保持 false。`);
  }
}

function insideRoot(root, target) {
  const relative = REFLECT_APPLY(PATH_RELATIVE, path, [root, target]);
  return relative === "" || (relative !== ".."
    && !REFLECT_APPLY(STRING_STARTS_WITH, relative, [`..${PATH_SEPARATOR}`])
    && !REFLECT_APPLY(PATH_IS_ABSOLUTE, path, [relative]));
}

function normalizePathIdentity(value) {
  const normalized = REFLECT_APPLY(PATH_RESOLVE, path, [value]);
  return PROCESS_PLATFORM === "win32"
    ? REFLECT_APPLY(STRING_TO_LOWER_CASE, normalized, [])
    : normalized;
}

function validateRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, ["\\"])
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, ["\0"])
    || REFLECT_APPLY(PATH_IS_ABSOLUTE, path, [relativePath])) {
    fail("PATH_INVALID", "artifact path 必须是使用 / 的非空安全相对路径。");
  }
  const parts = REFLECT_APPLY(STRING_SPLIT, relativePath, ["/"]);
  for (let index = 0; index < parts.length; index += 1) {
    if (parts[index] === "" || parts[index] === "." || parts[index] === "..") {
      fail("PATH_INVALID", "artifact path 含空、. 或 .. 段。");
    }
  }
  return parts;
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

async function captureDirectoryChain(root, directoryParts) {
  const snapshots = [];
  let cursor = root;
  for (let index = -1; index < directoryParts.length; index += 1) {
    if (index >= 0) cursor = REFLECT_APPLY(PATH_JOIN, path, [cursor, directoryParts[index]]);
    let metadata;
    let resolved;
    try {
      metadata = await FS_LSTAT(cursor, { bigint: true });
      resolved = await FS_REALPATH(cursor);
    } catch (cause) {
      fail("DIRECTORY_CHAIN_INVALID", "artifact 目录链不可安全读取。", cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, metadata, [])
      || !REFLECT_APPLY(STATS_IS_DIRECTORY, metadata, [])
      || normalizePathIdentity(resolved) !== normalizePathIdentity(cursor)) {
      fail("DIRECTORY_CHAIN_INVALID", "artifact 目录链包含链接、别名或非目录端点。");
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [OBJECT_FREEZE({ path: cursor, resolved, metadata })]);
  }
  return snapshots;
}

async function revalidateDirectoryChain(snapshots) {
  for (let index = 0; index < snapshots.length; index += 1) {
    const snapshot = snapshots[index];
    let metadata;
    let resolved;
    try {
      metadata = await FS_LSTAT(snapshot.path, { bigint: true });
      resolved = await FS_REALPATH(snapshot.path);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "artifact 读取期间目录链发生变化。", cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, metadata, [])
      || !REFLECT_APPLY(STATS_IS_DIRECTORY, metadata, [])
      || !sameEndpoint(snapshot.metadata, metadata)
      || normalizePathIdentity(resolved) !== normalizePathIdentity(snapshot.resolved)) {
      fail("ENDPOINT_CHANGED", "artifact 读取期间目录链发生变化。");
    }
  }
}

async function readBoundedHandle(handle, maxBytes) {
  const buffer = REFLECT_APPLY(BUFFER_ALLOC_UNSAFE, NATIVE_BUFFER, [maxBytes + 1]);
  const bufferByteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, buffer, []);
  let offset = 0;
  while (offset < bufferByteLength) {
    const result = await REFLECT_APPLY(FILE_HANDLE_READ, handle, [
      buffer,
      offset,
      bufferByteLength - offset,
      offset
    ]);
    if (result.bytesRead === 0) break;
    offset += result.bytesRead;
  }
  if (offset > maxBytes) fail("ARTIFACT_SIZE_INVALID", "artifact 在读取时超过边界。");
  let backingBuffer;
  let byteOffset;
  try {
    backingBuffer = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, buffer, []);
    byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, buffer, []);
  } catch (cause) {
    fail("ARTIFACT_UNREADABLE", "artifact 读取缓冲区内部槽不可读。", cause);
  }
  const sourceView = new NATIVE_UINT8_ARRAY(backingBuffer, byteOffset, offset);
  const captured = new NATIVE_UINT8_ARRAY(offset);
  REFLECT_APPLY(UINT8_ARRAY_SET, captured, [sourceView]);
  return captured;
}

async function callTestHook(testHooks, phase, payload) {
  const hook = testHooks?.[phase];
  if (typeof hook === "function") await hook(payload);
}

async function readStableWorkspaceFile(
  workspaceRoot,
  relativePath,
  maxBytes = MAX_FILE_BYTES,
  testHooks = undefined
) {
  const parts = validateRelativePath(relativePath);
  const requestedRoot = REFLECT_APPLY(PATH_RESOLVE, path, [workspaceRoot]);
  const directoryParts = [];
  for (let index = 0; index < parts.length - 1; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, directoryParts, [parts[index]]);
  }
  const directoryChain = await captureDirectoryChain(requestedRoot, directoryParts);
  const rootReal = directoryChain[0].resolved;
  const resolveArguments = [rootReal];
  for (let index = 0; index < parts.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, resolveArguments, [parts[index]]);
  }
  const targetPath = REFLECT_APPLY(PATH_RESOLVE, path, resolveArguments);
  if (!insideRoot(rootReal, targetPath)
    || normalizePathIdentity(rootReal) !== normalizePathIdentity(requestedRoot)) {
    fail("PATH_ESCAPE", `${relativePath} 逃逸 workspace 或 workspace root 为 alias。`);
  }

  let targetReal;
  let targetLstat;
  try {
    targetReal = await FS_REALPATH(targetPath);
    targetLstat = await FS_LSTAT(targetPath, { bigint: true });
  } catch (cause) {
    fail("ARTIFACT_UNREADABLE", `无法解析 ${relativePath}。`, cause);
  }
  if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, targetLstat, [])) {
    fail("SYMLINK_REJECTED", `${relativePath} 不得是符号链接。`);
  }
  if (!REFLECT_APPLY(STATS_IS_FILE, targetLstat, [])) {
    fail("ARTIFACT_SIZE_INVALID", `${relativePath} 不是普通文件。`);
  }
  if (targetLstat.nlink !== 1n) fail("HARDLINK_REJECTED", `${relativePath} 不得有多个 hardlink 名称。`);
  if (targetLstat.size <= 0n || targetLstat.size > REFLECT_APPLY(BIGINT_FROM, null, [maxBytes])) {
    fail("ARTIFACT_SIZE_INVALID", `${relativePath} 不是边界内普通非空文件。`);
  }
  if (!insideRoot(rootReal, targetReal)
    || normalizePathIdentity(targetReal) !== normalizePathIdentity(targetPath)) {
    fail("REALPATH_ESCAPE", `${relativePath} realpath 逃逸 workspace 或命中路径 alias。`);
  }
  await callTestHook(testHooks, "afterPrePathBeforeOpen", OBJECT_FREEZE({ targetPath, relativePath }));

  let handle;
  let handleClose;
  try {
    const flags = OPEN_READ_ONLY | OPEN_NO_FOLLOW;
    try {
      handle = await FS_OPEN(targetPath, flags);
    } catch (cause) {
      if (OPEN_NO_FOLLOW === 0
        || !REFLECT_APPLY(ARRAY_INCLUDES, ["EINVAL", "ENOTSUP"], [cause?.code])) throw cause;
      handle = await FS_OPEN(targetPath, OPEN_READ_ONLY);
    }
    handleClose = handle.close;
    const before = await REFLECT_APPLY(FILE_HANDLE_STAT, handle, [{ bigint: true }]);
    if (!REFLECT_APPLY(STATS_IS_FILE, before, []) || before.nlink !== 1n
      || !sameEndpoint(targetLstat, before)) {
      fail("ENDPOINT_CHANGED", `${relativePath} 在预检与 held handle 打开之间变化。`);
    }
    await callTestHook(testHooks, "afterOpenBeforeRead", OBJECT_FREEZE({ targetPath, relativePath, handle }));
    const bytes = await readBoundedHandle(handle, maxBytes);
    await callTestHook(testHooks, "afterBytesRead", OBJECT_FREEZE({ targetPath, relativePath, handle, bytes }));
    const after = await REFLECT_APPLY(FILE_HANDLE_STAT, handle, [{ bigint: true }]);
    let afterPath;
    let afterReal;
    try {
      afterPath = await FS_LSTAT(targetPath, { bigint: true });
      afterReal = await FS_REALPATH(targetPath);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", `${relativePath} 路径端点在读取期间变化。`, cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, afterPath, [])
      || !REFLECT_APPLY(STATS_IS_FILE, afterPath, []) || afterPath.nlink !== 1n
      || !sameEndpoint(before, after) || !sameEndpoint(after, afterPath)
      || REFLECT_APPLY(BIGINT_FROM, null, [
        REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, [])
      ]) !== after.size
      || normalizePathIdentity(afterReal) !== normalizePathIdentity(targetPath)) {
      fail("ENDPOINT_CHANGED", `${relativePath} 在单文件读取区间内变化。`);
    }
    await revalidateDirectoryChain(directoryChain);
    return OBJECT_FREEZE({
      path: relativePath,
      rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []),
      rawSha256: sha256Bytes(bytes),
      bytes
    });
  } catch (cause) {
    if (cause instanceof BaziDttVersionedParentSupersessionError) throw cause;
    fail("ARTIFACT_UNREADABLE", `无法稳定读取 ${relativePath}。`, cause);
  } finally {
    if (handle && handleClose) {
      try {
        await REFLECT_APPLY(handleClose, handle, []);
      } catch {
        // The primary verification result takes precedence over best-effort close errors.
      }
    }
  }
}

function parseStrictJson(snapshot) {
  try {
    return parseBaziDttNoticeReconciliationJsonBytes(
      snapshot.bytes,
      snapshot.path,
      MAX_FILE_BYTES
    );
  } catch (cause) {
    fail(cause?.code ?? "JSON_INVALID", `${snapshot.path} 不是严格 JSON。`, cause);
  }
}

function assertRawIdentity(snapshot, expected, label) {
  if (snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail("HISTORICAL_PARENT_DRIFT", `${label} 历史 raw identity 漂移。`);
  }
}

async function verifyBoundReadinessBasisRawIdentities(workspaceRoot, readiness) {
  if (!Array.isArray(readiness.basisArtifacts)
    || readiness.basisArtifacts.length !== BOUND_READINESS_BASIS_PATHS.length) {
    fail("BOUND_READINESS_BASIS_DRIFT", "绑定的 readiness 必须精确包含八条 basis artifact identity。 ");
  }
  const seen = new NATIVE_SET();
  for (let index = 0; index < BOUND_READINESS_BASIS_PATHS.length; index += 1) {
    const expectedPath = BOUND_READINESS_BASIS_PATHS[index];
    const basis = findExactlyOne(
      readiness.basisArtifacts,
      (entry) => entry.path === expectedPath,
      `bound readiness basis ${expectedPath}`
    );
    if (REFLECT_APPLY(SET_HAS, seen, [basis.path])) {
      fail("BOUND_READINESS_BASIS_DRIFT", `readiness basis path 重复：${basis.path}`);
    }
    REFLECT_APPLY(SET_ADD, seen, [basis.path]);
    if (basis.path !== expectedPath) {
      fail("BOUND_READINESS_BASIS_DRIFT", `readiness basis path 漂移：${expectedPath}`);
    }
    const snapshot = await readStableWorkspaceFile(workspaceRoot, expectedPath);
    if (snapshot.rawBytes !== basis.bytes || snapshot.rawSha256 !== basis.sha256) {
      fail("BOUND_READINESS_BASIS_DRIFT", `readiness basis 当前 raw identity 漂移：${basis.path}`);
    }
  }
  return BOUND_READINESS_BASIS_PATHS.length;
}

function findExactlyOne(items, predicate, label) {
  let matchCount = 0;
  let matchedValue;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (predicate(item)) {
      matchCount += 1;
      matchedValue = item;
    }
  }
  if (matchCount !== 1) fail("SUBJECT_CARDINALITY_INVALID", `${label} 必须且只能有一项。`);
  return matchedValue;
}

function appendArrayValue(items, value) {
  const result = [];
  for (let index = 0; index < items.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, result, [items[index]]);
  }
  REFLECT_APPLY(ARRAY_PUSH, result, [value]);
  return result;
}

function filterArrayIndexed(items, predicate) {
  const result = [];
  for (let index = 0; index < items.length; index += 1) {
    if (predicate(items[index])) REFLECT_APPLY(ARRAY_PUSH, result, [items[index]]);
  }
  return result;
}

function sourceSupersessionBoundary() {
  return {
    supersedes: {
      path: HISTORICAL_SOURCE.path,
      ledgerId: HISTORICAL_SOURCE.ledgerId,
      ledgerDigest: HISTORICAL_SOURCE.ledgerDigest,
      rawBytes: HISTORICAL_SOURCE.rawBytes,
      rawSha256: HISTORICAL_SOURCE.rawSha256,
      dttCandidateId: HISTORICAL_SOURCE.candidateId,
      dttCandidateDigest: HISTORICAL_SOURCE.candidateDigest
    },
    pairedRightsLedger: {
      path: RIGHTS_SUPERSESSION_RELATIVE_PATH,
      ledgerId: NEW_RIGHTS_ID
    },
    evidence: {
      publicEvidenceObservationId: DTT_PUBLIC_EVIDENCE.observationId,
      publicEvidenceObservationDigest: DTT_PUBLIC_EVIDENCE.observationDigest,
      reconciliationId: DTT_RECONCILIATION.reconciliationId,
      reconciliationDigest: DTT_RECONCILIATION.reconciliationDigest
    },
    historicalLedgerAcquiredAt: "2026-08-25T14:37:30.867Z",
    noticeProjectionObservedAt: "2026-08-29T15:17:27.103Z",
    supersessionCreatedAt: CREATED_AT,
    changeScope: "dtt_notice_projection_only_no_admission_state_promotion",
    historicalParentMutated: false,
    historicalParentBacklinkAdded: false,
    formalAdmissionEffect: "none"
  };
}

function rightsSupersessionBoundary(sourceLedger) {
  return {
    supersedes: {
      path: HISTORICAL_RIGHTS.path,
      ledgerId: HISTORICAL_RIGHTS.ledgerId,
      ledgerDigest: HISTORICAL_RIGHTS.ledgerDigest,
      rawBytes: HISTORICAL_RIGHTS.rawBytes,
      rawSha256: HISTORICAL_RIGHTS.rawSha256,
      dttCandidateId: HISTORICAL_RIGHTS.candidateId,
      dttCandidateDigest: HISTORICAL_RIGHTS.candidateDigest
    },
    pairedSourceLedger: {
      path: SOURCE_SUPERSESSION_RELATIVE_PATH,
      ledgerId: sourceLedger.ledgerId,
      ledgerDigest: sourceLedger.ledgerDigest
    },
    evidence: {
      publicEvidenceObservationId: DTT_PUBLIC_EVIDENCE.observationId,
      publicEvidenceObservationDigest: DTT_PUBLIC_EVIDENCE.observationDigest,
      reconciliationId: DTT_RECONCILIATION.reconciliationId,
      reconciliationDigest: DTT_RECONCILIATION.reconciliationDigest
    },
    historicalLedgerObservedAt: "2026-08-25T20:17:10.106Z",
    noticeProjectionObservedAt: "2026-08-29T15:17:27.103Z",
    supersessionCreatedAt: CREATED_AT,
    changeScope: "dtt_work_rendered_notice_and_per_carrier_notice_projection_only_no_clearance",
    historicalParentMutated: false,
    historicalParentBacklinkAdded: false,
    formalAdmissionEffect: "none"
  };
}

function buildExpectedSourceSupersession(historicalSource) {
  verifyBaziSourceBindingCandidateLedger(historicalSource);
  const historicalDtt = findExactlyOne(historicalSource.candidates,
    (entry) => entry.candidateId === HISTORICAL_SOURCE.candidateId,
    "fixed historical DTT source candidate");
  if (historicalSource.ledgerId !== HISTORICAL_SOURCE.ledgerId
    || historicalSource.ledgerDigest !== HISTORICAL_SOURCE.ledgerDigest
    || historicalDtt.candidateDigest !== HISTORICAL_SOURCE.candidateDigest) {
    fail("HISTORICAL_SOURCE_IDENTITY_REQUIRED",
      "source supersession builder 只接受固定历史 source semantic identity。");
  }
  const ledger = cloneJson(historicalSource);
  ledger.schemaVersion = "1.6.0";
  ledger.ledgerId = NEW_SOURCE_ID;
  ledger.status = "research_candidates_only_versioned_notice_projection_corrected";
  ledger.supersession = sourceSupersessionBoundary();

  const candidate = findExactlyOne(
    ledger.candidates,
    (entry) => entry.candidateId === HISTORICAL_SOURCE.candidateId,
    "DTT source candidate"
  );
  candidate.candidateId = NEW_SOURCE_CANDIDATE_ID;
  candidate.workIdentity.workRightsObservation =
    "rendered_pd_old_dependency_observed_not_oldid_main_slot_literal_not_adjudicated";
  const ssid = findExactlyOne(candidate.facsimileAnchors,
    (entry) => entry.anchorId === "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
    "DTT SSID carrier");
  const cadal = findExactlyOne(candidate.facsimileAnchors,
    (entry) => entry.anchorId === "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
    "DTT CADAL carrier");
  ssid.anchorRole =
    "commons_described_1947_shanghai_dadong_scan_candidate_not_work_or_edition_identity_proof";
  cadal.anchorRole =
    "commons_described_1947_first_edition_facsimile_candidate_not_same_edition_or_transcription_identity_proof";
  ssid.licenseOrNoticeObserved = "commons_pd_scan_top_level_notice_observed_not_adjudicated";
  cadal.licenseOrNoticeObserved =
    "commons_pd_old_top_level_notice_observed_without_pd_scan_template_not_adjudicated";
  candidate.rightsObservation.licenseOrNoticeObserved =
    "wikisource_rendered_dependency_and_distinct_carrier_notices_observed_not_adjudicated";
  candidate.rightsObservation.noticeProjectionEvidence = {
    publicEvidenceObservationId: DTT_PUBLIC_EVIDENCE.observationId,
    reconciliationId: DTT_RECONCILIATION.reconciliationId,
    oldidMainSlotPdOldLiteralObserved: false,
    renderedPagePdOldDependencyObserved: true,
    oldidAlonePinsRenderedNotice: false,
    ssidTopLevelNotice: "pd_scan_top_level_observed",
    cadalTopLevelNotice: "pd_old_top_level_observed_without_pd_scan_template",
    publicDomainMarkCountsAsLicense: false,
    markerAuthorityAndAccuracyVerified: false,
    sameEditionRelationshipIndependentlyEstablished: false,
    workIdentityEstablished: false,
    editionIdentityEstablished: false,
    carrierIdentityEstablished: false
  };
  candidate.reviewState.supersedes = HISTORICAL_SOURCE.candidateId;
  candidate.candidateDigest = computeCandidateDigest(candidate);
  ledger.doesNotEstablish = appendArrayValue(
    historicalSource.doesNotEstablish,
    "notice_projection_correction_is_not_rights_clearance"
  );
  ledger.ledgerDigest = computeLedgerDigest(ledger);
  return deepFreeze(ledger);
}

function buildExpectedRightsSupersession(historicalRights, sourceLedger) {
  const historicalDttRights = findExactlyOne(historicalRights.candidates,
    (entry) => entry.rightsCandidateId === HISTORICAL_RIGHTS.candidateId,
    "fixed historical DTT rights candidate");
  const supersedingDttSource = findExactlyOne(sourceLedger.candidates,
    (entry) => entry.candidateId === EXPECTED_NEW_SOURCE.dttCandidateId,
    "fixed superseding DTT source candidate");
  if (historicalRights.ledgerId !== HISTORICAL_RIGHTS.ledgerId
    || historicalRights.ledgerDigest !== HISTORICAL_RIGHTS.ledgerDigest
    || historicalDttRights.candidateDigest !== HISTORICAL_RIGHTS.candidateDigest) {
    fail("HISTORICAL_RIGHTS_IDENTITY_REQUIRED",
      "rights supersession builder 只接受固定历史 rights semantic identity。");
  }
  if (sourceLedger.ledgerId !== EXPECTED_NEW_SOURCE.ledgerId
    || sourceLedger.ledgerDigest !== EXPECTED_NEW_SOURCE.ledgerDigest
    || supersedingDttSource.candidateDigest !== EXPECTED_NEW_SOURCE.dttCandidateDigest
    || !exactJson(sourceLedger.supersession?.supersedes, {
      path: HISTORICAL_SOURCE.path,
      ledgerId: HISTORICAL_SOURCE.ledgerId,
      ledgerDigest: HISTORICAL_SOURCE.ledgerDigest,
      rawBytes: HISTORICAL_SOURCE.rawBytes,
      rawSha256: HISTORICAL_SOURCE.rawSha256,
      dttCandidateId: HISTORICAL_SOURCE.candidateId,
      dttCandidateDigest: HISTORICAL_SOURCE.candidateDigest
    })) {
    fail("SUPERSEDING_SOURCE_IDENTITY_REQUIRED",
      "rights supersession builder 只接受固定新版 source semantic identity 与历史 supersedes。 ");
  }
  const historicalSourceProjection = cloneJson(sourceLedger);
  historicalSourceProjection.schemaVersion = "1.5.0";
  historicalSourceProjection.ledgerId = HISTORICAL_SOURCE.ledgerId;
  historicalSourceProjection.status = "research_candidates_only";
  delete historicalSourceProjection.supersession;
  const dttSource = findExactlyOne(historicalSourceProjection.candidates,
    (entry) => entry.candidateId === NEW_SOURCE_CANDIDATE_ID,
    "superseding DTT source candidate");
  dttSource.candidateId = HISTORICAL_SOURCE.candidateId;
  dttSource.workIdentity.workRightsObservation = "public_domain_notice_observed_not_adjudicated";
  const ssidSource = findExactlyOne(dttSource.facsimileAnchors,
    (entry) => entry.anchorId === "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
    "historical SSID carrier");
  const cadalSource = findExactlyOne(dttSource.facsimileAnchors,
    (entry) => entry.anchorId === "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
    "historical CADAL carrier");
  ssidSource.anchorRole = "same_work_later_print_not_version_identity_proof";
  cadalSource.anchorRole = "same_1947_first_edition_public_scan_with_cadal_source_metadata_not_transcription_identity_proof";
  ssidSource.licenseOrNoticeObserved = "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated";
  cadalSource.licenseOrNoticeObserved = "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated";
  dttSource.rightsObservation.licenseOrNoticeObserved = "page_public_domain_notice_and_cc_by_sa_footer";
  delete dttSource.rightsObservation.noticeProjectionEvidence;
  dttSource.reviewState.supersedes = null;
  dttSource.candidateDigest = HISTORICAL_SOURCE.candidateDigest;
  historicalSourceProjection.doesNotEstablish = filterArrayIndexed(
    historicalSourceProjection.doesNotEstablish,
    (entry) => entry !== "notice_projection_correction_is_not_rights_clearance"
  );
  historicalSourceProjection.ledgerDigest = HISTORICAL_SOURCE.ledgerDigest;
  verifyBaziSourceBindingCandidateLedger(historicalSourceProjection);
  verifyBaziSourceRightsCandidateLedger(historicalRights, historicalSourceProjection);

  const ledger = cloneJson(historicalRights);
  ledger.schemaVersion = "1.2.0";
  ledger.ledgerId = NEW_RIGHTS_ID;
  ledger.status = "research_observations_only_versioned_notice_projection_corrected";
  ledger.sourceBindingLedger = {
    path: SOURCE_SUPERSESSION_RELATIVE_PATH,
    ledgerId: sourceLedger.ledgerId,
    ledgerDigest: sourceLedger.ledgerDigest,
    candidateCount: sourceLedger.candidates.length
  };
  ledger.supersession = rightsSupersessionBoundary(sourceLedger);

  const candidate = findExactlyOne(ledger.candidates,
    (entry) => entry.rightsCandidateId === HISTORICAL_RIGHTS.candidateId,
    "DTT rights candidate");
  candidate.rightsCandidateId = NEW_RIGHTS_CANDIDATE_ID;
  candidate.sourceCandidateId = NEW_SOURCE_CANDIDATE_ID;
  candidate.workLayer.pageSpecificNoticeObservation =
    "rendered_pd_old_dependency_observed_not_oldid_main_slot_literal";
  candidate.workLayer.observedTemplateNames = ["Template:清朝作品"];
  candidate.workLayer.renderedDependencyTemplateNamesObserved = [
    "Template:License",
    "Template:PD-old",
    "Template:清朝作品"
  ];
  candidate.workLayer.noticeDependencyBoundary = {
    publicEvidenceObservationId: DTT_PUBLIC_EVIDENCE.observationId,
    oldidMainSlotPdOldLiteralObserved: false,
    renderedPagePdOldDependencyObserved: true,
    dependencyRevisionsPinnedAtCapture: true,
    oldidAlonePinsRenderedNotice: false,
    applicabilityEstablished: false,
    legalConclusion: "not_established"
  };
  const ssid = findExactlyOne(candidate.carrierLayers,
    (entry) => entry.anchorId === "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
    "DTT SSID rights carrier");
  const cadal = findExactlyOne(candidate.carrierLayers,
    (entry) => entry.anchorId === "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
    "DTT CADAL rights carrier");
  ssid.fixedFilePageRevisionId = 708090379;
  ssid.noticeState = "pd_scan_top_level_observed_not_adjudicated";
  ssid.publicDomainMarkCountsAsLicense = false;
  ssid.markerAuthorityAndAccuracyVerified = false;
  cadal.fixedFilePageRevisionId = 1104458375;
  cadal.noticeState =
    "pd_old_top_level_observed_without_pd_scan_template_not_adjudicated";
  cadal.publicDomainMarkCountsAsLicense = false;
  cadal.markerAuthorityAndAccuracyVerified = false;
  candidate.decision.rightsCandidateState =
    "versioned_notice_projection_corrected_human_legal_review_required";
  candidate.decision.supersedes = HISTORICAL_RIGHTS.candidateId;
  candidate.candidateDigest = computeRightsCandidateDigest(candidate);
  ledger.doesNotEstablish = appendArrayValue(
    historicalRights.doesNotEstablish,
    "notice_projection_correction_is_not_rights_clearance"
  );
  ledger.ledgerDigest = computeRightsCandidateLedgerDigest(ledger);
  return deepFreeze(ledger);
}

function artifactIdentity(snapshot, semantic = {}) {
  return {
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256,
    ...semantic
  };
}

export function computeSupersessionReceiptDigest(receipt) {
  const unsigned = cloneJson(receipt);
  delete unsigned.supersessionDigest;
  return sha256Canonical(unsigned);
}

function buildExpectedSupersessionReceipt(
  sourceSnapshot,
  sourceLedger,
  rightsSnapshot,
  rightsLedger,
  readinessLedger
) {
  const sourceDtt = findExactlyOne(sourceLedger.candidates,
    (entry) => entry.candidateId === EXPECTED_NEW_SOURCE.dttCandidateId,
    "receipt fixed DTT source candidate");
  const rightsDtt = findExactlyOne(rightsLedger.candidates,
    (entry) => entry.rightsCandidateId === EXPECTED_NEW_RIGHTS.dttCandidateId,
    "receipt fixed DTT rights candidate");
  if (sourceSnapshot.path !== EXPECTED_NEW_SOURCE.path
    || sourceSnapshot.rawBytes !== EXPECTED_NEW_SOURCE.rawBytes
    || sourceSnapshot.rawSha256 !== EXPECTED_NEW_SOURCE.rawSha256
    || sourceLedger.ledgerId !== EXPECTED_NEW_SOURCE.ledgerId
    || sourceLedger.ledgerDigest !== EXPECTED_NEW_SOURCE.ledgerDigest
    || sourceDtt.candidateDigest !== EXPECTED_NEW_SOURCE.dttCandidateDigest) {
    fail("RECEIPT_SOURCE_IDENTITY_REQUIRED", "receipt builder 只接受固定新版 source raw/semantic identity。");
  }
  if (rightsSnapshot.path !== EXPECTED_NEW_RIGHTS.path
    || rightsSnapshot.rawBytes !== EXPECTED_NEW_RIGHTS.rawBytes
    || rightsSnapshot.rawSha256 !== EXPECTED_NEW_RIGHTS.rawSha256
    || rightsLedger.ledgerId !== EXPECTED_NEW_RIGHTS.ledgerId
    || rightsLedger.ledgerDigest !== EXPECTED_NEW_RIGHTS.ledgerDigest
    || rightsDtt.candidateDigest !== EXPECTED_NEW_RIGHTS.dttCandidateDigest) {
    fail("RECEIPT_RIGHTS_IDENTITY_REQUIRED", "receipt builder 只接受固定新版 rights raw/semantic identity。");
  }
  if (readinessLedger.ledgerId !== BOUND_READINESS.ledgerId
    || readinessLedger.ledgerDigest !== BOUND_READINESS.ledgerDigest
    || readinessLedger.status !== BOUND_READINESS.status
    || readinessLedger.createdAt !== BOUND_READINESS.createdAt) {
    fail("RECEIPT_READINESS_IDENTITY_REQUIRED", "receipt builder 只接受固定 readiness semantic identity。");
  }
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_dtt_versioned_parent_supersession_receipt_v1",
    supersessionId: RECEIPT_ID,
    status: "paired_versioned_candidate_parents_created_not_promoted_to_active_readiness",
    createdAt: CREATED_AT,
    releaseGovernance: RELEASE_GOVERNANCE,
    subjectLock: {
      bindingId: "binding:dtt:month-command",
      evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
      sourceId: "dtt-chanwei-wikisource-r2600158",
      historicalSourceCandidateId: HISTORICAL_SOURCE.candidateId,
      supersedingSourceCandidateId: NEW_SOURCE_CANDIDATE_ID,
      historicalRightsCandidateId: HISTORICAL_RIGHTS.candidateId,
      supersedingRightsCandidateId: NEW_RIGHTS_CANDIDATE_ID
    },
    historicalParents: {
      sourceBinding: HISTORICAL_SOURCE,
      sourceRights: HISTORICAL_RIGHTS
    },
    supersedingParents: {
      sourceBinding: artifactIdentity(sourceSnapshot, {
        ledgerId: sourceLedger.ledgerId,
        ledgerDigest: sourceLedger.ledgerDigest,
        dttCandidateId: NEW_SOURCE_CANDIDATE_ID,
        dttCandidateDigest: findExactlyOne(sourceLedger.candidates,
          (entry) => entry.candidateId === NEW_SOURCE_CANDIDATE_ID,
          "receipt source candidate").candidateDigest
      }),
      sourceRights: artifactIdentity(rightsSnapshot, {
        ledgerId: rightsLedger.ledgerId,
        ledgerDigest: rightsLedger.ledgerDigest,
        dttCandidateId: NEW_RIGHTS_CANDIDATE_ID,
        dttCandidateDigest: findExactlyOne(rightsLedger.candidates,
          (entry) => entry.rightsCandidateId === NEW_RIGHTS_CANDIDATE_ID,
          "receipt rights candidate").candidateDigest
      })
    },
    evidenceChain: {
      publicEvidence: DTT_PUBLIC_EVIDENCE,
      unresolvedHistoricalReconciliation: DTT_RECONCILIATION,
      boundReadiness: {
        ...BOUND_READINESS,
        verifiedSourceParent: {
          path: HISTORICAL_SOURCE.path,
          ledgerId: HISTORICAL_SOURCE.ledgerId,
          ledgerDigest: HISTORICAL_SOURCE.ledgerDigest,
          rawBytes: HISTORICAL_SOURCE.rawBytes,
          rawSha256: HISTORICAL_SOURCE.rawSha256
        },
        verifiedRightsParent: {
          path: HISTORICAL_RIGHTS.path,
          ledgerId: HISTORICAL_RIGHTS.ledgerId,
          ledgerDigest: HISTORICAL_RIGHTS.ledgerDigest,
          rawBytes: HISTORICAL_RIGHTS.rawBytes,
          rawSha256: HISTORICAL_RIGHTS.rawSha256
        },
        sourceNoticeReconciliationsResolved:
          readinessLedger.gateSummary.sourceNoticeReconciliationsResolved,
        promotionBlocked: readinessLedger.dttNoticeReconciliationGate.promotionBlocked,
        pointInTimePersistedArtifactBinding: true
      },
      unfrozenExternalExplanatoryReferences: [
        {
          provider: "Creative Commons",
          canonicalUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
          role: "current_public_explanation_only_not_fixed_policy_identity",
          fixedRevisionIdentityAvailable: false,
          legalConclusionEffect: "none",
          admissionEffect: "none"
        }
      ],
      relationship: "one_way_evidence_to_versioned_candidate_parent_pair"
    },
    noticeResolutionBoundary: {
      pairedVersionedParentArtifactsCreated: true,
      sourceParentExplicitlySupersedesHistoricalIdentity: true,
      rightsParentExplicitlySupersedesHistoricalIdentity: true,
      sourceAndRightsSupersessionPaired: true,
      oldidLiteralAndRenderedDependencySeparated: true,
      ssidAndCadalCarrierNoticesSeparated: true,
      publicDomainMarkCountsAsLicense: false,
      markerAuthorityAndAccuracyVerified: false,
      noticeProjectionCorrectedAtSupersedingCandidateParentLayer: true,
      boundReadinessConsumesSupersedingParents: false,
      boundReadinessStillPinsHistoricalParents: true,
      promotionBlocked: true
    },
    storageBoundary: {
      distributionPolicy: "link_only",
      sourceBodiesStored: 0,
      quoteTextsStored: 0,
      carrierFilesStored: 0,
      pageImagesStored: 0,
      materializedSourcePackagesStored: 0
    },
    formalAdmissionBoundary: {
      formalSourceRightsRecordCount: 0,
      formalSourceCarrierRecordCount: 0,
      knowledgeDocumentCount: 0,
      workLayersCleared: 0,
      editionLayersCleared: 0,
      transcriptionLayersCleared: 0,
      carrierLayersCleared: 0,
      legalReviewsVerified: 0,
      redistributableSourceCount: 0,
      bindingFrozenVerified: 0,
      bindingRequired: 12,
      legalConclusion: "not_established",
      redistributionAuthorized: false
    },
    integrityBoundary: {
      historicalParentsMutated: false,
      historicalParentBacklinksAdded: false,
      newParentsMechanicallyDerivedAndCompared: true,
      singleFileStableReadsUsed: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      supersessionDigestIsDigitalSignature: false
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
  return deepFreeze({
    ...unsigned,
    supersessionDigest: computeSupersessionReceiptDigest(unsigned)
  });
}

function serializeBaziDttSupersessionArtifact(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [value, null, 2])}\n`;
}

async function readHistoricalInputs(workspaceRoot) {
  const sourceSnapshot = await readStableWorkspaceFile(workspaceRoot, HISTORICAL_SOURCE.path);
  const rightsSnapshot = await readStableWorkspaceFile(workspaceRoot, HISTORICAL_RIGHTS.path);
  const readinessSnapshot = await readStableWorkspaceFile(workspaceRoot, BOUND_READINESS.path);
  assertRawIdentity(sourceSnapshot, HISTORICAL_SOURCE, "source-binding parent");
  assertRawIdentity(rightsSnapshot, HISTORICAL_RIGHTS, "source-rights parent");
  if (readinessSnapshot.rawBytes !== BOUND_READINESS.rawBytes
    || readinessSnapshot.rawSha256 !== BOUND_READINESS.rawSha256) {
    fail("BOUND_READINESS_DRIFT", "绑定的 readiness raw identity 漂移。");
  }
  const source = parseStrictJson(sourceSnapshot);
  const rights = parseStrictJson(rightsSnapshot);
  const readiness = parseStrictJson(readinessSnapshot);
  verifyBaziSourceBindingCandidateLedger(source);
  verifyBaziSourceRightsCandidateLedger(rights, source);
  if (source.ledgerDigest !== HISTORICAL_SOURCE.ledgerDigest
    || rights.ledgerDigest !== HISTORICAL_RIGHTS.ledgerDigest) {
    fail("HISTORICAL_PARENT_DRIFT", "历史父账 semantic digest 漂移。");
  }
  const boundReadinessBasisArtifactsPointInTimeRawVerified =
    await verifyBoundReadinessBasisRawIdentities(workspaceRoot, readiness);
  if (readiness.ledgerId !== BOUND_READINESS.ledgerId
    || readiness.ledgerDigest !== BOUND_READINESS.ledgerDigest
    || readiness.status !== BOUND_READINESS.status
    || readiness.createdAt !== BOUND_READINESS.createdAt
    || readiness.dttNoticeReconciliationGate.promotionBlocked !== true
    || readiness.gateSummary.sourceNoticeReconciliationsResolved !== 0) {
    fail("BOUND_READINESS_IDENTITY_MISMATCH", "绑定的 readiness semantic identity 或阻断状态漂移。");
  }
  const readinessSourceBasis = findExactlyOne(readiness.basisArtifacts,
    (entry) => entry.path === HISTORICAL_SOURCE.path,
    "readiness historical source basis");
  const readinessRightsBasis = findExactlyOne(readiness.basisArtifacts,
    (entry) => entry.path === HISTORICAL_RIGHTS.path,
    "readiness historical rights basis");
  const currentSourceParent = readiness.dttNoticeReconciliationGate.currentParentIdentities.sourceBinding;
  const currentRightsParent = readiness.dttNoticeReconciliationGate.currentParentIdentities.sourceRights;
  if (readinessSourceBasis.bytes !== HISTORICAL_SOURCE.rawBytes
    || readinessSourceBasis.sha256 !== HISTORICAL_SOURCE.rawSha256
    || readinessRightsBasis.bytes !== HISTORICAL_RIGHTS.rawBytes
    || readinessRightsBasis.sha256 !== HISTORICAL_RIGHTS.rawSha256
    || !exactJson(currentSourceParent, {
      candidateDigest: HISTORICAL_SOURCE.candidateDigest,
      candidateId: HISTORICAL_SOURCE.candidateId,
      ledgerDigest: HISTORICAL_SOURCE.ledgerDigest,
      ledgerId: HISTORICAL_SOURCE.ledgerId,
      path: HISTORICAL_SOURCE.path,
      rawBytes: HISTORICAL_SOURCE.rawBytes,
      rawSha256: HISTORICAL_SOURCE.rawSha256
    })
    || !exactJson(currentRightsParent, {
      candidateDigest: HISTORICAL_RIGHTS.candidateDigest,
      candidateId: HISTORICAL_RIGHTS.candidateId,
      ledgerDigest: HISTORICAL_RIGHTS.ledgerDigest,
      ledgerId: HISTORICAL_RIGHTS.ledgerId,
      path: HISTORICAL_RIGHTS.path,
      rawBytes: HISTORICAL_RIGHTS.rawBytes,
      rawSha256: HISTORICAL_RIGHTS.rawSha256
    })) {
    fail("BOUND_READINESS_PARENT_MISMATCH", "绑定的 readiness 未精确消费历史 source/rights 父身份。");
  }
  const publicEvidenceSnapshot = await readStableWorkspaceFile(workspaceRoot, DTT_PUBLIC_EVIDENCE.path);
  const reconciliationSnapshot = await readStableWorkspaceFile(workspaceRoot, DTT_RECONCILIATION.path);
  if (publicEvidenceSnapshot.rawBytes !== DTT_PUBLIC_EVIDENCE.rawBytes
    || publicEvidenceSnapshot.rawSha256 !== DTT_PUBLIC_EVIDENCE.rawSha256
    || reconciliationSnapshot.rawBytes !== DTT_RECONCILIATION.rawBytes
    || reconciliationSnapshot.rawSha256 !== DTT_RECONCILIATION.rawSha256) {
    fail("EVIDENCE_CHAIN_DRIFT", "DTT C-L2/C-L3 evidence identity 漂移。");
  }
  const publicEvidence = parseStrictJson(publicEvidenceSnapshot);
  const reconciliation = parseStrictJson(reconciliationSnapshot);
  if (publicEvidence.observationId !== DTT_PUBLIC_EVIDENCE.observationId
    || publicEvidence.observationDigest !== DTT_PUBLIC_EVIDENCE.observationDigest
    || reconciliation.reconciliationId !== DTT_RECONCILIATION.reconciliationId
    || reconciliation.reconciliationDigest !== DTT_RECONCILIATION.reconciliationDigest) {
    fail("EVIDENCE_CHAIN_DRIFT", "DTT C-L2/C-L3 semantic identity 漂移。");
  }
  return {
    source,
    rights,
    readiness,
    publicEvidence,
    reconciliation,
    boundReadinessBasisArtifactsPointInTimeRawVerified
  };
}

async function buildBaziDttVersionedParentSupersessionBundle(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const historical = await readHistoricalInputs(workspaceRoot);
  const source = buildExpectedSourceSupersession(historical.source);
  const sourceBytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [
    serializeBaziDttSupersessionArtifact(source),
    "utf8"
  ]);
  const sourceSnapshot = OBJECT_FREEZE({
    path: SOURCE_SUPERSESSION_RELATIVE_PATH,
    rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, sourceBytes, []),
    rawSha256: sha256Bytes(sourceBytes),
    bytes: sourceBytes
  });
  const rights = buildExpectedRightsSupersession(historical.rights, source);
  const rightsBytes = REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [
    serializeBaziDttSupersessionArtifact(rights),
    "utf8"
  ]);
  const rightsSnapshot = OBJECT_FREEZE({
    path: RIGHTS_SUPERSESSION_RELATIVE_PATH,
    rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, rightsBytes, []),
    rawSha256: sha256Bytes(rightsBytes),
    bytes: rightsBytes
  });
  const receipt = buildExpectedSupersessionReceipt(
    sourceSnapshot,
    source,
    rightsSnapshot,
    rights,
    historical.readiness
  );
  return OBJECT_FREEZE({
    source,
    sourceBytes,
    sourceSnapshot,
    rights,
    rightsBytes,
    rightsSnapshot,
    receipt,
    boundReadinessBasisArtifactsPointInTimeRawVerified:
      historical.boundReadinessBasisArtifactsPointInTimeRawVerified
  });
}

function verifyPersistedReceipt(receipt, expected) {
  if (!REFLECT_APPLY(REGEXP_TEST, SHA256_PATTERN, [receipt?.supersessionDigest ?? ""])) {
    fail("SUPERSESSION_DIGEST_INVALID", "supersessionDigest 必须是小写 SHA-256。");
  }
  if (computeSupersessionReceiptDigest(receipt) !== receipt.supersessionDigest) {
    fail("SUPERSESSION_DIGEST_MISMATCH", "supersession receipt canonical digest 不一致。");
  }
  if (!exactJson(receipt, expected)) {
    fail("SUPERSESSION_RECEIPT_MISMATCH", "持久化 supersession receipt 与机械派生结果不一致。");
  }
  assertFalseBoundary(receipt.authorityBoundary, [
    "contentTruthEstablished", "baziRuleTruthEstablished", "sourceBundleComplete",
    "rightsBundleComplete", "expertReviewBundleComplete", "expertTruthEstablished",
    "rightsLegalConclusionEstablished", "fullRepositoryTypecheckPassed", "defaultWebBuildPassed",
    "browserOrPwaAcceptancePassed", "releaseEvidenceComplete", "deploymentAndRollbackConfirmed",
    "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "authorityBoundary");
}

export async function loadBaziDttVersionedParentSupersession(
  workspaceRoot = REFLECT_APPLY(PROCESS_CWD, process, [])
) {
  const expectedBundle = await buildBaziDttVersionedParentSupersessionBundle(workspaceRoot);
  const sourceSnapshot = await readStableWorkspaceFile(workspaceRoot, SOURCE_SUPERSESSION_RELATIVE_PATH);
  const rightsSnapshot = await readStableWorkspaceFile(workspaceRoot, RIGHTS_SUPERSESSION_RELATIVE_PATH);
  const receiptSnapshot = await readStableWorkspaceFile(workspaceRoot, SUPERSESSION_RECEIPT_RELATIVE_PATH);
  const source = parseStrictJson(sourceSnapshot);
  const rights = parseStrictJson(rightsSnapshot);
  const receipt = parseStrictJson(receiptSnapshot);
  if (!exactJson(source, expectedBundle.source)) {
    fail("SOURCE_SUPERSESSION_MISMATCH", "新版 source parent 不等于允许的单一机械变换。");
  }
  if (!exactJson(rights, expectedBundle.rights)) {
    fail("RIGHTS_SUPERSESSION_MISMATCH", "新版 rights parent 不等于允许的单一机械变换。");
  }
  const expectedReceipt = expectedBundle.receipt;
  verifyPersistedReceipt(receipt, expectedReceipt);
  if (sourceSnapshot.rawBytes !== EXPECTED_NEW_SOURCE.rawBytes
    || sourceSnapshot.rawSha256 !== EXPECTED_NEW_SOURCE.rawSha256) {
    fail("SOURCE_SUPERSESSION_RAW_DRIFT", "新版 source parent raw identity 漂移。");
  }
  if (rightsSnapshot.rawBytes !== EXPECTED_NEW_RIGHTS.rawBytes
    || rightsSnapshot.rawSha256 !== EXPECTED_NEW_RIGHTS.rawSha256) {
    fail("RIGHTS_SUPERSESSION_RAW_DRIFT", "新版 rights parent raw identity 漂移。");
  }
  if (receiptSnapshot.rawBytes !== EXPECTED_RECEIPT.rawBytes
    || receiptSnapshot.rawSha256 !== EXPECTED_RECEIPT.rawSha256) {
    fail("SUPERSESSION_RECEIPT_RAW_DRIFT", "supersession receipt raw identity 漂移。");
  }
  const sourceDtt = findExactlyOne(
    source.candidates,
    (entry) => entry.candidateId === NEW_SOURCE_CANDIDATE_ID,
    "superseding DTT source candidate"
  );
  const rightsDtt = findExactlyOne(
    rights.candidates,
    (entry) => entry.rightsCandidateId === NEW_RIGHTS_CANDIDATE_ID,
    "superseding DTT rights candidate"
  );
  const result = deepFreeze({
    offlineVersionedParentSupersessionMechanicallyVerified: true,
    supersessionId: receipt.supersessionId,
    supersessionDigest: receipt.supersessionDigest,
    sourceLedgerId: source.ledgerId,
    sourceLedgerDigest: source.ledgerDigest,
    rightsLedgerId: rights.ledgerId,
    rightsLedgerDigest: rights.ledgerDigest,
    noticeProjectionCorrectedAtSupersedingCandidateParentLayer:
      receipt.noticeResolutionBoundary.noticeProjectionCorrectedAtSupersedingCandidateParentLayer,
    boundReadinessLedgerDigest: receipt.evidenceChain.boundReadiness.ledgerDigest,
    boundReadinessConsumesSupersedingParents:
      receipt.noticeResolutionBoundary.boundReadinessConsumesSupersedingParents,
    boundReadinessStillPinsHistoricalParents:
      receipt.noticeResolutionBoundary.boundReadinessStillPinsHistoricalParents,
    boundReadinessBasisArtifactsPointInTimeRawVerified:
      expectedBundle.boundReadinessBasisArtifactsPointInTimeRawVerified,
    promotionBlocked: receipt.noticeResolutionBoundary.promotionBlocked,
    distributionPolicy: receipt.storageBoundary.distributionPolicy,
    formalSourceRightsRecordCount: receipt.formalAdmissionBoundary.formalSourceRightsRecordCount,
    formalSourceCarrierRecordCount: receipt.formalAdmissionBoundary.formalSourceCarrierRecordCount,
    bindingFrozenVerified: receipt.formalAdmissionBoundary.bindingFrozenVerified,
    releaseReady: receipt.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: receipt.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: receipt.authorityBoundary.expertClaimsAuthorized,
    crossFileAtomicSnapshot: receipt.integrityBoundary.crossFileAtomicSnapshot,
    mutationEpochAvailable: receipt.integrityBoundary.mutationEpochAvailable,
    mutationEpochReceipt: receipt.integrityBoundary.mutationEpochReceipt,
    intervalMutationExcludedAcrossFiles: receipt.integrityBoundary.intervalMutationExcludedAcrossFiles,
    abaExcluded: receipt.integrityBoundary.abaExcluded,
    subjectLock: receipt.subjectLock,
    historicalParents: receipt.historicalParents,
    supersedingParents: receipt.supersedingParents,
    publicEvidence: receipt.evidenceChain.publicEvidence,
    unresolvedHistoricalReconciliation: receipt.evidenceChain.unresolvedHistoricalReconciliation,
    boundHistoricalReadiness: receipt.evidenceChain.boundReadiness,
    noticeProjection: {
      oldidMainSlotPdOldLiteralObserved:
        receipt.noticeResolutionBoundary.oldidLiteralAndRenderedDependencySeparated === true
          ? false
          : null,
      renderedPagePdOldDependencyObserved: true,
      dependencyRevisionsPinnedAtCapture: true,
      oldidAlonePinsRenderedNotice: false,
      sourceSsidNotice: sourceDtt.facsimileAnchors[0].licenseOrNoticeObserved,
      sourceCadalNotice: sourceDtt.facsimileAnchors[1].licenseOrNoticeObserved,
      rightsWorkNotice: rightsDtt.workLayer.pageSpecificNoticeObservation,
      rightsSsidNotice: rightsDtt.carrierLayers[0].noticeState,
      rightsCadalNotice: rightsDtt.carrierLayers[1].noticeState,
      publicDomainMarkCountsAsLicense:
        receipt.noticeResolutionBoundary.publicDomainMarkCountsAsLicense,
      markerAuthorityAndAccuracyVerified:
        receipt.noticeResolutionBoundary.markerAuthorityAndAccuracyVerified,
      noticeApplicabilityEstablished: false,
      legalConclusion: receipt.formalAdmissionBoundary.legalConclusion
    },
    artifacts: {
      sourceBinding: artifactIdentity(sourceSnapshot),
      sourceRights: artifactIdentity(rightsSnapshot),
      receipt: artifactIdentity(receiptSnapshot)
    }
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedBaziDttVersionedParentSupersession(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value]);
}

// These two narrowly-scoped helpers expose the hardened, held-handle reader and
// duplicate-key rejecting JSON parser without asking production consumers to
// reach through the test-only surface. Their returned values are observations,
// not admission capabilities; consumers must still require the WeakSet brand
// produced by loadBaziDttVersionedParentSupersession().
export async function readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath) {
  return readStableWorkspaceFile(workspaceRoot, relativePath);
}

export function parseBaziDttStrictJsonArtifact(snapshot) {
  return parseStrictJson(snapshot);
}

export const baziDttVersionedParentSupersessionTestOnly = OBJECT_FREEZE({
  HISTORICAL_SOURCE,
  HISTORICAL_RIGHTS,
  DTT_PUBLIC_EVIDENCE,
  DTT_RECONCILIATION,
  EXPECTED_NEW_SOURCE,
  EXPECTED_NEW_RIGHTS,
  EXPECTED_RECEIPT,
  BOUND_READINESS,
  NEW_SOURCE_ID,
  NEW_RIGHTS_ID,
  NEW_SOURCE_CANDIDATE_ID,
  NEW_RIGHTS_CANDIDATE_ID,
  RECEIPT_ID,
  readStableWorkspaceFile,
  parseStrictJson,
  readHistoricalInputs,
  verifyPersistedReceipt,
  buildExpectedSourceSupersession,
  buildExpectedRightsSupersession,
  buildExpectedSupersessionReceipt,
  buildBaziDttVersionedParentSupersessionBundle,
  serializeBaziDttSupersessionArtifact
});
