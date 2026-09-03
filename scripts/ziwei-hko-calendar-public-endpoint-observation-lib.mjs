import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import { verifyZiweiHkoCalendarSourceEvidence } from "./ziwei-hko-calendar-source-evidence-lib.mjs";

export const ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH =
  "content/system-admission/ziwei-hko-calendar-public-endpoint-observation.v1.json";

const OBSERVATION_ID =
  "hakimi.ziwei.hko-calendar-public-endpoint-observation/2026-08-29T12:37:27.146Z";
const CANDIDATE_ID =
  "hakimi.ziwei.source-candidate/hko-calendar-boundary-replay-2023-2028/1.0.0";
const SUBJECT_ID = "ziwei.engineering.official-calendar-differential";
const MAX_OBSERVATION_BYTES = 1_000_000;
const MAX_SNAPSHOT_NODES = 100_000;
const MAX_SNAPSHOT_DEPTH = 128;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const CANONICAL_MILLISECOND_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const OBSERVATION_RAW_IDENTITY = Object.freeze({
  bytes: 10_892,
  sha256: "9110d524274821179ff5e61de87bc0fa9788608135e2292725d5ae78b53a42eb"
});
const VERIFIED_OBSERVATIONS = new WeakSet();

const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer")?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset")?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength")?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

export class ZiweiHkoPublicEndpointObservationError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ZiweiHkoPublicEndpointObservationError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new ZiweiHkoPublicEndpointObservationError(code, message, options);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  let count = 0;
  while (stack.length > 0) {
    const value = stack.pop();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    count += 1;
    if (count > MAX_SNAPSHOT_NODES) fail("JSON_TOO_COMPLEX", "HKO observation JSON AST 超过节点上限。");
    visitor(value);
    for (const [key, child] of Object.entries(value)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(child)) {
        for (let index = child.length - 1; index >= 0; index -= 1) stack.push(child[index]);
      } else if (child && typeof child === "object") {
        stack.push(child);
      }
    }
  }
}

function captureUint8Array(bytes, label, maxBytes) {
  if (utilTypes.isProxy(bytes)) fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  if (!utilTypes.isUint8Array(bytes)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是内部 Uint8Array 字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 的内部字节槽不可读。`, { cause });
  }
  if (!Number.isSafeInteger(byteOffset) || byteOffset < 0
    || !Number.isSafeInteger(byteLength) || byteLength <= 0
    || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    fail("JSON_BYTES_INVALID", `${label} 的字节边界无效。`);
  }
  if (byteLength > maxBytes) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (typeof utilTypes.isSharedArrayBuffer === "function" && utilTypes.isSharedArrayBuffer(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!utilTypes.isArrayBuffer(backingBuffer)) fail("JSON_BYTES_INVALID", `${label} backing buffer 无效。`);
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      fail("JSON_BYTES_INVALID", `${label} backing buffer 状态不可读。`, { cause });
    }
    if (resizable) fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
  }
  const captured = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 无法复制到私有固定缓冲区。`, { cause });
  }
  return captured;
}

function parseCapturedJson(captured, label) {
  if (captured.byteLength >= 3
    && captured[0] === 0xef && captured[1] === 0xbb && captured[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(captured);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, { cause });
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "ziwei-hko-public-endpoint-observation.json",
      sourceType: "script"
    });
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, { cause });
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty"
        || property.computed
        || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不是合法 JSON。`, { cause });
  }
  return parsed;
}

export function parseZiweiHkoPublicEndpointObservationJsonBytes(
  bytes,
  label = "HKO public endpoint observation JSON",
  maxBytes = MAX_OBSERVATION_BYTES
) {
  return parseCapturedJson(captureUint8Array(bytes, label, maxBytes), label);
}

function snapshotJson(value, label, state = { nodes: 0 }, depth = 0) {
  if (depth > MAX_SNAPSHOT_DEPTH) fail("OBJECT_TOO_COMPLEX", `${label} 超过嵌套深度上限。`);
  state.nodes += 1;
  if (state.nodes > MAX_SNAPSHOT_NODES) fail("OBJECT_TOO_COMPLEX", `${label} 超过节点上限。`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail("OBJECT_NON_CANONICAL", `${label} 含非规范数字。`);
    return value;
  }
  if (!value || typeof value !== "object" || utilTypes.isProxy(value)) {
    fail("OBJECT_NON_CANONICAL", `${label} 只接受非 Proxy JSON 值。`);
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length !== 0) {
      fail("OBJECT_NON_CANONICAL", `${label} 数组原型或 Symbol 无效。`);
    }
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) fail("OBJECT_NON_CANONICAL", `${label} 不接受稀疏数组。`);
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        fail("OBJECT_NON_CANONICAL", `${label} 数组只能包含可枚举 data property。`);
      }
      result.push(snapshotJson(descriptor.value, `${label}[${index}]`, state, depth + 1));
    }
    const extra = Reflect.ownKeys(value).filter((key) => {
      if (key === "length") return false;
      if (typeof key !== "string" || !/^(?:0|[1-9]\d*)$/u.test(key)) return true;
      const numericKey = Number(key);
      return !Number.isSafeInteger(numericKey)
        || numericKey < 0
        || numericKey >= value.length
        || numericKey > 0xffff_fffe
        || String(numericKey) !== key;
    });
    if (extra.length !== 0) fail("OBJECT_NON_CANONICAL", `${label} 数组含额外属性。`);
    return result;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length !== 0) {
    fail("OBJECT_NON_CANONICAL", `${label} 必须是普通无 Symbol 对象。`);
  }
  const result = {};
  for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right, "en"))) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      fail("OBJECT_NON_CANONICAL", `${label}.${key} 必须是可枚举 data property。`);
    }
    Object.defineProperty(result, key, {
      value: snapshotJson(descriptor.value, `${label}.${key}`, state, depth + 1),
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  if (Reflect.ownKeys(value).length !== Object.keys(value).length) {
    fail("OBJECT_NON_CANONICAL", `${label} 含不可枚举或 Symbol 属性。`);
  }
  return result;
}

export function canonicalStringifyZiweiHkoPublicEndpointObservation(value) {
  return JSON.stringify(snapshotJson(value, "HKO observation"));
}

export function computeZiweiHkoPublicEndpointObservationDigest(value) {
  const snapshot = snapshotJson(value, "HKO observation");
  const { observationDigest: _observationDigest, ...unsigned } = snapshot;
  return sha256(Buffer.from(JSON.stringify(snapshotJson(unsigned, "HKO observation unsigned")), "utf8"));
}

function exactObject(value, label, expectedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail("OBSERVATION_INVALID", `${label} 必须是普通 JSON 对象。`);
  }
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right, "en"));
  const expected = [...expectedKeys].sort((left, right) => left.localeCompare(right, "en"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("OBSERVATION_INVALID", `${label} 字段集合不精确。`);
  }
  return value;
}

function canonicalUtc(value, label) {
  if (typeof value !== "string" || !CANONICAL_MILLISECOND_UTC.test(value)) {
    fail("OBSERVATION_INVALID", `${label} 必须是规范毫秒 UTC。`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    fail("OBSERVATION_INVALID", `${label} 不是实际存在的规范 UTC。`);
  }
  return date.getTime();
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) fail("OBSERVATION_INVALID", `${label} 必须是正安全整数。`);
  return value;
}

function sha256Value(value, label) {
  if (typeof value !== "string" || !LOWERCASE_SHA256.test(value)) {
    fail("OBSERVATION_INVALID", `${label} 必须是小写 SHA-256。`);
  }
  return value;
}

function assertPartialHttpObservation(value, label, expectedUrl, expectedContentType, runStart, runEnd) {
  if (value.requestedUrl !== expectedUrl || value.status !== 200 || value.contentType !== expectedContentType) {
    fail("OBSERVATION_INVALID", `${label} requested URL、状态或 content type 无效。`);
  }
  const started = canonicalUtc(value.startedAt, `${label}.startedAt`);
  const completed = canonicalUtc(value.completedAt, `${label}.completedAt`);
  if (started < runStart || completed < started || completed > runEnd) {
    fail("OBSERVATION_INVALID", `${label} 时间区间无效。`);
  }
  positiveInteger(value.observedBytes, `${label}.observedBytes`);
  sha256Value(value.observedSha256, `${label}.observedSha256`);
  if (value.etag !== null && (typeof value.etag !== "string" || value.etag.length === 0)) {
    fail("OBSERVATION_INVALID", `${label}.etag 无效。`);
  }
  if (value.lastModified !== null
    && (typeof value.lastModified !== "string" || !Number.isFinite(Date.parse(value.lastModified)))) {
    fail("OBSERVATION_INVALID", `${label}.lastModified 无效。`);
  }
}

function assertFalseBoundary(value, label, falseKeys) {
  for (const key of falseKeys) {
    if (value[key] !== false) fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label}.${key} 必须保持 false。`);
  }
}

function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
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

function normalizePathIdentity(value) {
  const normalized = path.resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function insideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function captureDirectoryChain(root, parts) {
  const snapshots = [];
  let cursor = root;
  for (const part of [null, ...parts]) {
    if (part !== null) cursor = path.join(cursor, part);
    let metadata;
    let resolved;
    try {
      [metadata, resolved] = await Promise.all([
        lstat(cursor, { bigint: true }),
        realpath(cursor)
      ]);
    } catch (cause) {
      fail("DIRECTORY_CHAIN_INVALID", "HKO observation 目录链不可安全读取。", { cause });
    }
    if (metadata.isSymbolicLink()
      || !metadata.isDirectory()
      || normalizePathIdentity(resolved) !== normalizePathIdentity(cursor)) {
      fail("DIRECTORY_CHAIN_INVALID", "HKO observation 目录链包含链接、别名或非目录端点。");
    }
    snapshots.push(Object.freeze({ path: cursor, resolved, metadata }));
  }
  return snapshots;
}

async function revalidateDirectoryChain(snapshots) {
  for (const snapshot of snapshots) {
    let metadata;
    let resolved;
    try {
      [metadata, resolved] = await Promise.all([
        lstat(snapshot.path, { bigint: true }),
        realpath(snapshot.path)
      ]);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "HKO observation 读取期间目录链发生变化。", { cause });
    }
    if (metadata.isSymbolicLink()
      || !metadata.isDirectory()
      || !sameEndpoint(snapshot.metadata, metadata)
      || normalizePathIdentity(resolved) !== normalizePathIdentity(snapshot.resolved)) {
      fail("ENDPOINT_CHANGED", "HKO observation 读取期间目录链发生变化。");
    }
  }
}

async function readBoundedHandle(handle, maxBytes) {
  const buffer = Buffer.allocUnsafe(maxBytes + 1);
  let offset = 0;
  while (offset < buffer.byteLength) {
    const { bytesRead } = await handle.read(buffer, offset, buffer.byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > maxBytes) fail("FILE_SIZE_INVALID", "HKO observation 工件在读取时超过上限。");
  return buffer.subarray(0, offset);
}

async function readObservationArtifact(workspaceRoot, testHooks = undefined) {
  const requestedRoot = path.resolve(workspaceRoot);
  const directoryChain = await captureDirectoryChain(requestedRoot, ["content", "system-admission"]);
  const root = directoryChain[0].resolved;
  const absolute = path.resolve(root, ...ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH.split("/"));
  if (!insideRoot(root, absolute)) fail("PATH_INVALID", "HKO observation 路径越出工作区。");
  let beforePath;
  let resolved;
  try {
    [beforePath, resolved] = await Promise.all([
      lstat(absolute, { bigint: true }),
      realpath(absolute)
    ]);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", "HKO observation 工件不可读。", { cause });
  }
  if (beforePath.isSymbolicLink()
    || !beforePath.isFile()
    || beforePath.nlink !== 1n
    || normalizePathIdentity(resolved) !== normalizePathIdentity(absolute)) {
    fail("SYMLINK_REJECTED", "HKO observation 工件拒绝符号链接或路径别名。");
  }
  if (beforePath.size <= 0n || beforePath.size > BigInt(MAX_OBSERVATION_BYTES)) {
    fail("FILE_SIZE_INVALID", "HKO observation 工件为空或超限。");
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  const handle = await open(absolute, fsConstants.O_RDONLY | noFollow);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()
      || before.nlink !== 1n
      || !sameEndpoint(beforePath, before)) {
      fail("ENDPOINT_CHANGED", "HKO observation 工件在 held handle 打开前变化。");
    }
    if (typeof testHooks?.afterOpenBeforeRead === "function") {
      await testHooks.afterOpenBeforeRead(Object.freeze({ absolutePath: absolute, handle }));
    }
    const readBytes = await readBoundedHandle(handle, MAX_OBSERVATION_BYTES);
    if (typeof testHooks?.afterBytesRead === "function") {
      await testHooks.afterBytesRead(Object.freeze({ absolutePath: absolute, handle, readBytes }));
    }
    const after = await handle.stat({ bigint: true });
    let afterPath;
    let afterResolved;
    try {
      [afterPath, afterResolved] = await Promise.all([
        lstat(absolute, { bigint: true }),
        realpath(absolute)
      ]);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "HKO observation 工件读取期间路径端点变化。", { cause });
    }
    if (afterPath.isSymbolicLink()
      || !afterPath.isFile()
      || afterPath.nlink !== 1n
      || !sameEndpoint(before, after)
      || !sameEndpoint(after, afterPath)
      || BigInt(readBytes.byteLength) !== after.size
      || normalizePathIdentity(afterResolved) !== normalizePathIdentity(absolute)) {
      fail("ENDPOINT_CHANGED", "HKO observation 工件读取期间端点变化。");
    }
    await revalidateDirectoryChain(directoryChain);
    const snapshot = captureUint8Array(readBytes, "HKO observation artifact", MAX_OBSERVATION_BYTES);
    const artifact = Object.freeze({
      path: ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH,
      bytes: snapshot.byteLength,
      sha256: sha256(snapshot)
    });
    if (artifact.bytes !== OBSERVATION_RAW_IDENTITY.bytes || artifact.sha256 !== OBSERVATION_RAW_IDENTITY.sha256) {
      fail("ARTIFACT_DRIFT", "HKO observation 工件与点时 bytes/SHA-256 不一致。");
    }
    return Object.freeze({
      observation: parseCapturedJson(snapshot, "HKO observation artifact"),
      artifact
    });
  } finally {
    await handle.close();
  }
}

function validateObservation(observation, sourceResult) {
  exactObject(observation, "observation", [
    "schemaVersion", "recordType", "observationId", "status", "runStartedAt", "runCompletedAt",
    "captureBoundary", "sourceCandidateArtifact", "candidateCrossCheck", "resources", "termsObservation",
    "datasetObservation", "apiDocumentationObservation", "hkoSiteNoticeObservation",
    "hkoCommercialConditionsObservation", "rightsBoundary", "integrityBoundary", "authorityBoundary",
    "observationDigest"
  ]);
  if (observation.schemaVersion !== "1.0.0"
    || observation.recordType !== "ziwei_hko_calendar_public_endpoint_observation"
    || observation.observationId !== OBSERVATION_ID
    || observation.status !== "operator_recorded_public_https_observation_offline_consistency_only_not_network_verified_or_rights_adjudication") {
    fail("OBSERVATION_INVALID", "HKO observation 根身份无效。");
  }
  const runStart = canonicalUtc(observation.runStartedAt, "runStartedAt");
  const runEnd = canonicalUtc(observation.runCompletedAt, "runCompletedAt");
  if (runEnd < runStart) fail("OBSERVATION_INVALID", "HKO observation 总时间区间无效。");
  if (computeZiweiHkoPublicEndpointObservationDigest(observation) !== observation.observationDigest) {
    fail("DIGEST_MISMATCH", "HKO observation canonical digest 不一致。");
  }

  const capture = exactObject(observation.captureBoundary, "captureBoundary", [
    "method", "captureImplementation", "userAgent", "automaticDecompressionClaimedByOperator",
    "automaticDecompressionMechanicallyVerified", "contentEncodingCaptured",
    "httpClientDeliveredBodyHashOperatorRecorded", "liveRunResponseBodiesPersisted",
    "captureExecutionReceiptStored", "remoteCaptureMechanicallyVerified", "redirectChainCaptured",
    "requestedToFinalUrlBindingEstablished", "wireBytesCaptured", "tlsPeerCertificateCaptured",
    "credentialUsed", "loginOrProtectedBackendUsed"
  ]);
  if (capture.method !== "GET"
    || capture.captureImplementation !== "powershell_dotnet_httpclient_in_memory_sha256"
    || capture.userAgent !== "Hakimi-Evidence-Audit/1.0"
    || capture.automaticDecompressionClaimedByOperator !== true
    || capture.httpClientDeliveredBodyHashOperatorRecorded !== true) {
    fail("OBSERVATION_INVALID", "HKO observation capture mechanics 无效。");
  }
  assertFalseBoundary(capture, "captureBoundary", [
    "automaticDecompressionMechanicallyVerified", "contentEncodingCaptured", "liveRunResponseBodiesPersisted",
    "captureExecutionReceiptStored", "remoteCaptureMechanicallyVerified", "redirectChainCaptured",
    "requestedToFinalUrlBindingEstablished", "wireBytesCaptured",
    "tlsPeerCertificateCaptured", "credentialUsed", "loginOrProtectedBackendUsed"
  ]);

  const sourceArtifact = exactObject(observation.sourceCandidateArtifact, "sourceCandidateArtifact", [
    "path", "bytes", "sha256", "evidenceDigest", "sourceBodySetDigest"
  ]);
  const expectedSourceArtifact = {
    path: sourceResult.artifact.path,
    bytes: sourceResult.artifact.bytes,
    sha256: sourceResult.artifact.sha256,
    evidenceDigest: sourceResult.evidenceDigest,
    sourceBodySetDigest: sourceResult.sourceBodySetDigest
  };
  if (canonicalStringifyZiweiHkoPublicEndpointObservation(sourceArtifact)
    !== canonicalStringifyZiweiHkoPublicEndpointObservation(expectedSourceArtifact)) {
    fail("SOURCE_CANDIDATE_DRIFT", "HKO observation 未绑定当前 verified source candidate 身份。");
  }

  const crossCheck = exactObject(observation.candidateCrossCheck, "candidateCrossCheck", [
    "candidateId", "subjectId", "coverageScope", "expectedAnnualResources",
    "observedAnnualResourcesOperatorRecorded", "exactResourceBodyMatchesOperatorRecorded",
    "preExistingCandidateAnnualRawBodiesStored", "allResourceStatus200OperatorRecorded",
    "allResourceBodiesExactMatchOperatorRecorded"
  ]);
  if (crossCheck.candidateId !== CANDIDATE_ID
    || crossCheck.subjectId !== SUBJECT_ID
    || crossCheck.coverageScope !== "calendar_resolution"
    || crossCheck.expectedAnnualResources !== 6
    || crossCheck.observedAnnualResourcesOperatorRecorded !== 6
    || crossCheck.exactResourceBodyMatchesOperatorRecorded !== 6
    || crossCheck.preExistingCandidateAnnualRawBodiesStored !== 6
    || crossCheck.allResourceStatus200OperatorRecorded !== true
    || crossCheck.allResourceBodiesExactMatchOperatorRecorded !== true) {
    fail("OBSERVATION_INVALID", "HKO observation candidate cross-check 无效。");
  }

  if (!Array.isArray(observation.resources)
    || observation.resources.length !== sourceResult.evidence.resources.length
    || observation.resources.length !== 6) {
    fail("OBSERVATION_INVALID", "HKO observation 年度资源数无效。");
  }
  for (let index = 0; index < observation.resources.length; index += 1) {
    const observed = exactObject(observation.resources[index], `resources[${index}]`, [
      "year", "requestedUrl", "status", "startedAt", "completedAt", "contentType", "etag", "lastModified",
      "observedBytes", "observedSha256", "candidateRawBytes", "candidateRawSha256", "exactMatch"
    ]);
    const candidate = sourceResult.evidence.resources[index];
    assertPartialHttpObservation(
      observed,
      `resources[${index}]`,
      candidate.resourceUrl,
      "application/octet-stream",
      runStart,
      runEnd
    );
    if (observed.year !== candidate.year
      || observed.observedBytes !== candidate.rawBytes
      || observed.observedSha256 !== candidate.rawSha256
      || observed.candidateRawBytes !== candidate.rawBytes
      || observed.candidateRawSha256 !== candidate.rawSha256
      || observed.exactMatch !== true) {
      fail("REMOTE_BODY_MISMATCH", `HKO ${candidate.year} 点时响应与 source candidate raw body 不一致。`);
    }
  }

  const terms = exactObject(observation.termsObservation, "termsObservation", [
    "requestedUrl", "status", "startedAt", "completedAt", "contentType", "etag", "lastModified",
    "observedBytes", "observedSha256", "versionObserved", "lastUpdatedDateObserved",
    "commercialAndNonCommercialLanguageObserved", "distributionAndReproductionLanguageObserved",
    "attributionConditionLanguageObserved", "exactQuoteStored", "pageBodyStored"
  ]);
  assertPartialHttpObservation(
    terms,
    "termsObservation",
    "https://data.gov.hk/en/terms-and-conditions",
    "text/html; charset=utf-8",
    runStart,
    runEnd
  );
  if (terms.versionObserved !== "1.2"
    || terms.lastUpdatedDateObserved !== "2025-05-26"
    || terms.commercialAndNonCommercialLanguageObserved !== true
    || terms.distributionAndReproductionLanguageObserved !== true
    || terms.attributionConditionLanguageObserved !== true
    || terms.exactQuoteStored !== false
    || terms.pageBodyStored !== false) {
    fail("OBSERVATION_INVALID", "DATA.GOV.HK 条款观察边界无效。");
  }

  const dataset = exactObject(observation.datasetObservation, "datasetObservation", [
    "requestedUrl", "status", "startedAt", "completedAt", "contentType", "etag", "lastModified",
    "observedBytes", "observedSha256", "hongKongObservatoryProviderLanguageObserved",
    "yearlyUpdateLanguageObserved", "exactQuoteStored", "pageBodyStored"
  ]);
  assertPartialHttpObservation(
    dataset,
    "datasetObservation",
    "https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table",
    "text/html; charset=utf-8",
    runStart,
    runEnd
  );
  if (dataset.hongKongObservatoryProviderLanguageObserved !== true
    || dataset.yearlyUpdateLanguageObserved !== true
    || dataset.exactQuoteStored !== false
    || dataset.pageBodyStored !== false) {
    fail("OBSERVATION_INVALID", "DATA.GOV.HK dataset 观察边界无效。");
  }

  const apiDocumentation = exactObject(observation.apiDocumentationObservation, "apiDocumentationObservation", [
    "requestedUrl", "status", "startedAt", "completedAt", "contentType", "etag", "lastModified",
    "observedBytes", "observedSha256", "exactQuoteStored", "bodyStored"
  ]);
  assertPartialHttpObservation(
    apiDocumentation,
    "apiDocumentationObservation",
    "https://www.hko.gov.hk/en/weatherAPI/doc/files/HKO_Open_Data_API_Documentation.pdf",
    "application/pdf",
    runStart,
    runEnd
  );
  if (apiDocumentation.exactQuoteStored !== false || apiDocumentation.bodyStored !== false) {
    fail("OBSERVATION_INVALID", "HKO API 文档 exact quote/body 必须保持未存储。");
  }

  const hkoNotice = exactObject(observation.hkoSiteNoticeObservation, "hkoSiteNoticeObservation", [
    "requestedUrl", "status", "startedAt", "completedAt", "contentType", "etag", "lastModified",
    "observedBytes", "observedSha256", "commercialUseLanguageObserved",
    "priorWrittenAuthorisationLanguageObserved", "exactQuoteStored", "pageBodyStored"
  ]);
  assertPartialHttpObservation(
    hkoNotice,
    "hkoSiteNoticeObservation",
    "https://www.hko.gov.hk/en/readme/readme.htm",
    "text/html; charset=utf-8",
    runStart,
    runEnd
  );
  if (hkoNotice.commercialUseLanguageObserved !== true
    || hkoNotice.priorWrittenAuthorisationLanguageObserved !== true
    || hkoNotice.exactQuoteStored !== false
    || hkoNotice.pageBodyStored !== false) {
    fail("OBSERVATION_INVALID", "HKO 主站权利公告观察边界无效。");
  }

  const hkoCommercial = exactObject(
    observation.hkoCommercialConditionsObservation,
    "hkoCommercialConditionsObservation",
    [
      "requestedUrl", "status", "startedAt", "completedAt", "contentType", "etag", "lastModified",
      "observedBytes", "observedSha256", "commercialUseLanguageObserved",
      "priorWrittenAuthorisationLanguageObserved", "reproductionOrDistributionLanguageObserved",
      "exactQuoteStored", "pageBodyStored"
    ]
  );
  assertPartialHttpObservation(
    hkoCommercial,
    "hkoCommercialConditionsObservation",
    "https://www.hko.gov.hk/en/appweb/commercial.htm",
    "text/html; charset=utf-8",
    runStart,
    runEnd
  );
  if (hkoCommercial.commercialUseLanguageObserved !== true
    || hkoCommercial.priorWrittenAuthorisationLanguageObserved !== true
    || hkoCommercial.reproductionOrDistributionLanguageObserved !== true
    || hkoCommercial.exactQuoteStored !== false
    || hkoCommercial.pageBodyStored !== false) {
    fail("OBSERVATION_INVALID", "HKO 商业使用条件观察边界无效。");
  }

  const rights = exactObject(observation.rightsBoundary, "rightsBoundary", [
    "permissionLanguageObservedNotAdjudicated", "hkoPriorWrittenAuthorisationLanguageObserved",
    "applicableTermsResolved", "termsApplicabilityConflictOrAmbiguityObserved", "termsVersionFrozen",
    "workRightsEstablished", "editionRightsEstablished", "carrierRightsEstablished",
    "preExistingCandidateRawBodiesStorageRightsEstablished", "rightsLegalConclusion",
    "redistributionAuthorized", "publicRepositoryBodyInclusionAuthorized", "publicBuildInclusionAuthorized"
  ]);
  if (rights.permissionLanguageObservedNotAdjudicated !== true
    || rights.hkoPriorWrittenAuthorisationLanguageObserved !== true
    || rights.termsApplicabilityConflictOrAmbiguityObserved !== true
    || rights.rightsLegalConclusion !== "not_established") {
    fail("OBSERVATION_INVALID", "HKO 权利观察分账无效。");
  }
  assertFalseBoundary(rights, "rightsBoundary", [
    "applicableTermsResolved", "termsVersionFrozen", "workRightsEstablished", "editionRightsEstablished",
    "carrierRightsEstablished", "preExistingCandidateRawBodiesStorageRightsEstablished",
    "redistributionAuthorized", "publicRepositoryBodyInclusionAuthorized", "publicBuildInclusionAuthorized"
  ]);

  const integrity = exactObject(observation.integrityBoundary, "integrityBoundary", [
    "operatorRecordedPointInTimeRemoteBodyHashObservation", "pointInTimeOnly",
    "futureRemoteFreshnessEstablished",
    "networkProvenanceEstablished", "publisherAuthenticityEstablished", "digestIsDigitalSignature",
    "crossFileAtomicSnapshot", "mutationEpochAvailable", "intervalMutationExcluded", "abaExcluded"
  ]);
  if (integrity.operatorRecordedPointInTimeRemoteBodyHashObservation !== true
    || integrity.pointInTimeOnly !== true) {
    fail("OBSERVATION_INVALID", "HKO 点时完整性观察边界无效。");
  }
  assertFalseBoundary(integrity, "integrityBoundary", [
    "futureRemoteFreshnessEstablished", "networkProvenanceEstablished", "publisherAuthenticityEstablished",
    "digestIsDigitalSignature", "crossFileAtomicSnapshot", "mutationEpochAvailable",
    "intervalMutationExcluded", "abaExcluded"
  ]);

  const authority = exactObject(observation.authorityBoundary, "authorityBoundary", [
    "contentTruthEstablished", "ziweiRuleTruthEstablished", "sourceBundleComplete", "rightsBundleComplete",
    "expertReviewBundleComplete", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ]);
  assertFalseBoundary(authority, "authorityBoundary", Object.keys(authority));
}

export async function readZiweiHkoPublicEndpointObservation(workspaceRoot) {
  return (await readObservationArtifact(workspaceRoot)).observation;
}

export async function verifyZiweiHkoPublicEndpointObservation(workspaceRoot, observationInput) {
  const artifactRead = await readObservationArtifact(workspaceRoot);
  const persistedSnapshot = snapshotJson(artifactRead.observation, "persisted HKO observation");
  if (observationInput !== undefined) {
    const callerSnapshot = snapshotJson(observationInput, "caller HKO observation");
    if (JSON.stringify(callerSnapshot) !== JSON.stringify(persistedSnapshot)) {
      fail("OBSERVATION_INPUT_MISMATCH", "调用方 HKO observation 与持久化工件不一致。");
    }
  }
  const sourceResult = await verifyZiweiHkoCalendarSourceEvidence(workspaceRoot);
  validateObservation(persistedSnapshot, sourceResult);
  const verified = deepFreeze({
    observation: persistedSnapshot,
    observationDigest: persistedSnapshot.observationDigest,
    artifact: artifactRead.artifact,
    sourceCandidateArtifact: {
      path: sourceResult.artifact.path,
      bytes: sourceResult.artifact.bytes,
      sha256: sourceResult.artifact.sha256,
      evidenceDigest: sourceResult.evidenceDigest,
      sourceBodySetDigest: sourceResult.sourceBodySetDigest
    },
    operatorRecordedExactResourceBodyMatches:
      persistedSnapshot.candidateCrossCheck.exactResourceBodyMatchesOperatorRecorded,
    preExistingCandidateAnnualRawBodiesStored:
      persistedSnapshot.candidateCrossCheck.preExistingCandidateAnnualRawBodiesStored,
    automaticDecompressionClaimedByOperator:
      persistedSnapshot.captureBoundary.automaticDecompressionClaimedByOperator,
    automaticDecompressionMechanicallyVerified:
      persistedSnapshot.captureBoundary.automaticDecompressionMechanicallyVerified,
    contentEncodingCaptured: persistedSnapshot.captureBoundary.contentEncodingCaptured,
    httpClientDeliveredBodyHashOperatorRecorded:
      persistedSnapshot.captureBoundary.httpClientDeliveredBodyHashOperatorRecorded,
    captureExecutionReceiptStored: persistedSnapshot.captureBoundary.captureExecutionReceiptStored,
    remoteCaptureMechanicallyVerified: persistedSnapshot.captureBoundary.remoteCaptureMechanicallyVerified,
    requestedToFinalUrlBindingEstablished:
      persistedSnapshot.captureBoundary.requestedToFinalUrlBindingEstablished,
    termsApplicabilityConflictOrAmbiguityObserved:
      persistedSnapshot.rightsBoundary.termsApplicabilityConflictOrAmbiguityObserved,
    rightsLegalConclusion: persistedSnapshot.rightsBoundary.rightsLegalConclusion,
    preExistingCandidateRawBodiesStorageRightsEstablished:
      persistedSnapshot.rightsBoundary.preExistingCandidateRawBodiesStorageRightsEstablished,
    formalSourceRightsRecordsCreated: 0,
    formalSourceCarrierRecordsCreated: 0,
    independentRightsReviewsVerified: 0,
    bindingFrozenVerified: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  VERIFIED_OBSERVATIONS.add(verified);
  return verified;
}

export function isVerifiedZiweiHkoPublicEndpointObservation(value) {
  return Boolean(value && typeof value === "object" && VERIFIED_OBSERVATIONS.has(value));
}

export const ziweiHkoPublicEndpointObservationTestOnly = Object.freeze({
  OBSERVATION_RAW_IDENTITY,
  validateObservation,
  readBoundedHandle,
  readObservationArtifact
});
