import { createHash, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
  SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
  createSingleBindingIntegratedSessionBinding
} from "./single-binding-integrated-contract.js";
import {
  parseSingleBindingIntegratedStrictJsonBytes,
  canonicalStringifySingleBindingIntegrated as canonicalStringify
} from "./single-binding-integrated-json.js";
import {
  preflightSingleBindingIntegratedCompleteReturnBytes,
  singleBindingIntegratedFilenamesForSession
} from "./single-binding-integrated-handoff.js";
import {
  SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY,
  SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES,
  SINGLE_BINDING_INTEGRATED_PHYSICAL_REVIEW_PURPOSE
} from "./single-binding-integrated-package-builder.mjs";
import {
  createSingleBindingIntegratedServer,
  singleBindingIntegratedPayloadPaths
} from "./single-binding-integrated-server.mjs";
import { SYNTHETIC_REHEARSAL_FIXTURE_REF } from "./single-binding-rehearsal-contract.js";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));
const REPOSITORY_ROOT = await realpath(resolve(SOURCE_ROOT, "../.."));
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const REVIEW_CYCLE_PATTERN = /^single-binding-synthetic-review-cycle\.[a-f0-9]{64}$/u;
const PAIR_RUN_PATTERN = /^single-binding-synthetic-pair-run\.[a-f0-9]{64}$/u;
const SEAT_SESSION_PATTERN = /^single-binding-synthetic-seat-session\.[a-f0-9]{64}$/u;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;
const PREPARED_STATES = new WeakMap();
const CONSUMED_CAPABILITIES = new WeakSet();
const VERIFIED_SERVER_PAYLOAD_STATES = new WeakMap();
const RUNNING_PHYSICAL_SERVER_STATES = new WeakMap();
const CAPTURED_RETURN_STATES = new WeakMap();

const SHARED_SEAT_PAYLOADS = Object.freeze([
  "START-HERE.txt",
  "START-PILOT.cmd",
  "package.json",
  "single-binding-integrated-contract.js",
  "single-binding-integrated-handoff.js",
  "single-binding-integrated-json.js",
  "single-binding-integrated.css",
  "single-binding-integrated.js",
  "single-binding-rehearsal-contract.js"
]);
const COORDINATOR_PAYLOADS = Object.freeze([
  "START-HERE.txt",
  "START-PAIR.cmd",
  "package.json",
  "single-binding-integrated-contract.js",
  "single-binding-integrated-handoff.js",
  "single-binding-integrated-json.js",
  "single-binding-integrated-pair.css",
  "single-binding-integrated-pair.html",
  "single-binding-integrated-pair.js",
  "single-binding-rehearsal-contract.js"
]);
const ROOT_ENDPOINTS = Object.freeze([
  "PAIR-START-HERE.txt",
  "coordinator",
  "pair-manifest.json",
  "pair-precommit.json",
  "seat-a",
  "seat-b"
]);

export const SINGLE_BINDING_INTEGRATED_PHYSICAL_PREPARE_BOUNDARY = Object.freeze({
  ...SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY,
  oppositeSeatPayloadVerified: false,
  packageLocalJavaScriptImportedOrEvaluatedBySourceCoordinatorProcess: false
});

export const SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY = Object.freeze({
  ...SINGLE_BINDING_INTEGRATED_PHYSICAL_PREPARE_BOUNDARY,
  inMemoryVerifiedPayloadServerImplemented: true,
  singleUseReturnCaptureImplemented: true,
  returnHeldInSourceProcessMemoryOnly: true,
  returnExternalWriteImplemented: false,
  physicalExpertSurfaceReady: false,
  isolatedBrowserProfileLaunchImplemented: false,
  returnDirectoryVerificationImplemented: false
});

export const SINGLE_BINDING_INTEGRATED_PHYSICAL_RETURN_WRITE_BOUNDARY = Object.freeze({
  ...SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY,
  returnHeldInSourceProcessMemoryOnly: false,
  returnWasHeldInSourceProcessMemoryBeforeExternalWrite: true,
  returnExternalWriteImplemented: true,
  returnDirectoryVerificationImplemented: true,
  outputFileAclPrivacyEstablished: false,
  outputDirectoryEntryDurabilityEstablished: false,
  atomicTwoFileCommitEstablished: false,
  partialOutputMayRemainOnFailure: true,
  partialOutputCleanupImplemented: false,
  partialOutputMayContainSensitiveReturnBytes: true,
  samePermissionMutationExcluded: false,
  capturedReturnRecoverableAfterWriteFailure: false,
  capturedReturnRecoverableAfterWriteFailureWhenHandleCleanupConfirmed: true,
  handleCleanupFailureRemainsFailClosed: true,
  capabilityConsumedOnlyAfterVerifiedWriteSuccess: true,
  physicalExpertSurfaceReady: false
});

export class SingleBindingIntegratedPhysicalPackageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SingleBindingIntegratedPhysicalPackageError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new SingleBindingIntegratedPhysicalPackageError(code, message);
}

function compareOrdinal(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function metadataIdentity(value) {
  return [value.dev, value.ino, value.nlink, value.size, value.mtimeNs, value.ctimeNs]
    .map(String).join(":");
}

function directoryIdentity(value) {
  return `${String(value.dev)}:${String(value.ino)}`;
}

function pathIsOutside(root, candidate) {
  const relation = relative(root, candidate);
  return relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation);
}

function sameCanonicalPath(left, right) {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function exactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    fail("SHAPE_INVALID", `${label} 必须是普通对象。`);
  }
  const actual = Object.keys(value).sort(compareOrdinal);
  const wanted = [...expected].sort(compareOrdinal);
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("SHAPE_INVALID", `${label} 字段集合无效。`);
  }
}

function assertExactValue(value, expected, label) {
  if (canonicalStringify(value) !== canonicalStringify(expected)) {
    fail("FIXED_VALUE_MISMATCH", `${label} 与固定值不一致。`);
  }
}

function assertNonzeroSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value) || /^0{64}$/u.test(value)) {
    fail("PIN_INVALID", `${label} 必须是非零小写 SHA-256。`);
  }
}

function assertOpaqueId(value, pattern, zeroPattern, label) {
  if (typeof value !== "string" || !pattern.test(value) || zeroPattern.test(value)) {
    fail("IDENTITY_INVALID", `${label} 无效。`);
  }
}

function safeRelativePath(value, label) {
  if (typeof value !== "string" || value.length < 1 || value.length > 240
    || value.includes("\\") || value.includes(":") || value.includes("\0")
    || value.startsWith("/") || value.endsWith("/")
    || value.split("/").some((part) => part === "" || part === "." || part === ".." || part.startsWith("."))) {
    fail("PATH_INVALID", `${label} 含非规范化或越界路径。`);
  }
  return value;
}

function captureRequest(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)
    || Object.getPrototypeOf(input) !== Object.prototype) {
    fail("REQUEST_INVALID", "physical package prepare request 必须是普通对象。 ");
  }
  const keys = Reflect.ownKeys(input);
  const expected = [
    "expectedPairManifestRawSha256",
    "expectedPairPrecommitRawSha256",
    "expectedPairRunId",
    "expectedReviewCycleId",
    "expectedSeatId",
    "expectedSeatPackageManifestRawSha256",
    "expectedSeatSessionNonce",
    "pairRoot"
  ];
  if (keys.some((key) => typeof key !== "string")) fail("REQUEST_INVALID", "prepare request 含 symbol 字段。 ");
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (keys.some((key) => !descriptors[key].enumerable || descriptors[key].get || descriptors[key].set)) {
    fail("REQUEST_INVALID", "prepare request 只能包含可枚举数据属性。 ");
  }
  const sorted = [...keys].sort(compareOrdinal);
  const wanted = [...expected].sort(compareOrdinal);
  if (sorted.length !== wanted.length || sorted.some((key, index) => key !== wanted[index])) {
    fail("REQUEST_INVALID", "prepare request 字段集合无效。 ");
  }
  const value = Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
  if (typeof value.pairRoot !== "string" || value.pairRoot.length < 1 || value.pairRoot.length > 2_000
    || !isAbsolute(value.pairRoot)
    || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value.pairRoot)) {
    fail("PACKAGE_ROOT_INVALID", "pairRoot 必须是无控制字符的长度受限绝对路径。 ");
  }
  assertNonzeroSha256(value.expectedPairPrecommitRawSha256, "expected P");
  assertNonzeroSha256(value.expectedPairManifestRawSha256, "expected PM");
  assertNonzeroSha256(value.expectedSeatPackageManifestRawSha256, "expected S");
  assertOpaqueId(
    value.expectedReviewCycleId,
    REVIEW_CYCLE_PATTERN,
    /^single-binding-synthetic-review-cycle\.0{64}$/u,
    "expected review cycle"
  );
  assertOpaqueId(
    value.expectedPairRunId,
    PAIR_RUN_PATTERN,
    /^single-binding-synthetic-pair-run\.0{64}$/u,
    "expected pair run"
  );
  if (value.expectedSeatId !== "A" && value.expectedSeatId !== "B") {
    fail("IDENTITY_INVALID", "expected seat 必须是 A 或 B。 ");
  }
  assertOpaqueId(
    value.expectedSeatSessionNonce,
    SEAT_SESSION_PATTERN,
    /^single-binding-synthetic-seat-session\.0{64}$/u,
    "expected seat session nonce"
  );
  return Object.freeze(value);
}

async function plainDirectory(path, label) {
  let metadata;
  let canonical;
  try {
    metadata = await lstat(path, { bigint: true });
    canonical = await realpath(path);
  } catch {
    fail("DIRECTORY_ENDPOINT_INVALID", `${label} 目录不可用。`);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()
    || !sameCanonicalPath(canonical, resolve(path))) {
    fail("DIRECTORY_ENDPOINT_INVALID", `${label} 必须是未重定向普通目录。`);
  }
  return Object.freeze({ path: canonical, identity: directoryIdentity(metadata) });
}

async function assertDirectoryCurrent(endpoint, label) {
  const observed = await plainDirectory(endpoint.path, label);
  if (!sameCanonicalPath(observed.path, endpoint.path)
    || observed.identity !== endpoint.identity) {
    fail("DIRECTORY_IDENTITY_CHANGED", `${label} 身份已变化。`);
  }
}

async function assertDirectoryChain(canonicalRoot, targetParent, label) {
  const lexical = relative(canonicalRoot, targetParent);
  if (lexical === ".." || lexical.startsWith(`..${sep}`) || isAbsolute(lexical)) {
    fail("PATH_ESCAPE", `${label} 越过 package root。`);
  }
  let current = canonicalRoot;
  if (lexical) {
    for (const segment of lexical.split(/[\\/]/u)) {
      current = join(current, segment);
      await plainDirectory(current, label);
    }
  }
}

async function readExact(handle, byteLength, label) {
  const bytes = Buffer.alloc(byteLength);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const { bytesRead } = await handle.read(bytes, offset, bytes.byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset !== bytes.byteLength) fail("FILE_IDENTITY_CHANGED", `${label} 读取长度发生变化。`);
  return bytes;
}

async function openStableFile(canonicalRoot, relativePath, maxBytes, label) {
  const safePath = safeRelativePath(relativePath, label);
  const target = resolve(canonicalRoot, ...safePath.split("/"));
  const lexical = relative(canonicalRoot, target);
  if (!lexical || lexical === ".." || lexical.startsWith(`..${sep}`) || isAbsolute(lexical)) {
    fail("PATH_ESCAPE", `${label} 越过 package root。`);
  }
  await assertDirectoryChain(canonicalRoot, dirname(target), label);
  let before;
  let canonical;
  let handle;
  try {
    before = await lstat(target, { bigint: true });
    canonical = await realpath(target);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
      || before.size <= 0n || before.size > BigInt(maxBytes)
      || !sameCanonicalPath(canonical, target)) {
      fail("FILE_ENDPOINT_INVALID", `${label} 必须是大小受限的单链接普通文件。`);
    }
    handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const heldBefore = await handle.stat({ bigint: true });
    if (!heldBefore.isFile() || heldBefore.nlink !== 1n
      || metadataIdentity(heldBefore) !== metadataIdentity(before)) {
      fail("FILE_IDENTITY_CHANGED", `${label} 打开前后身份变化。`);
    }
    const bytes = await readExact(handle, Number(heldBefore.size), label);
    const heldAfter = await handle.stat({ bigint: true });
    const pathAfter = await lstat(target, { bigint: true });
    const canonicalAfter = await realpath(target);
    if (metadataIdentity(heldAfter) !== metadataIdentity(heldBefore)
      || metadataIdentity(pathAfter) !== metadataIdentity(before)
      || !sameCanonicalPath(canonicalAfter, canonical)) {
      fail("FILE_IDENTITY_CHANGED", `${label} 读取期间身份变化。`);
    }
    const initialDigest = sha256(bytes);
    let closed = false;
    return {
      relativePath: safePath,
      bytes,
      byteLength: bytes.byteLength,
      rawSha256: initialDigest,
      async assertCurrent() {
        if (closed) fail("FILE_IDENTITY_CHANGED", `${label} handle 已关闭。`);
        let handleBefore;
        let currentPath;
        let currentCanonical;
        try {
          handleBefore = await handle.stat({ bigint: true });
          currentPath = await lstat(target, { bigint: true });
          currentCanonical = await realpath(target);
        } catch {
          fail("FILE_IDENTITY_CHANGED", `${label} 当前端点不可用。`);
        }
        if (!handleBefore.isFile() || handleBefore.nlink !== 1n
          || !currentPath.isFile() || currentPath.isSymbolicLink() || currentPath.nlink !== 1n
          || metadataIdentity(handleBefore) !== metadataIdentity(heldBefore)
          || metadataIdentity(currentPath) !== metadataIdentity(before)
          || !sameCanonicalPath(currentCanonical, canonical)) {
          fail("FILE_IDENTITY_CHANGED", `${label} 当前身份已变化。`);
        }
        const currentBytes = await readExact(handle, bytes.byteLength, label);
        const handleAfterCurrent = await handle.stat({ bigint: true });
        const pathAfterCurrent = await lstat(target, { bigint: true });
        const canonicalAfterCurrent = await realpath(target);
        if (metadataIdentity(handleAfterCurrent) !== metadataIdentity(heldBefore)
          || metadataIdentity(pathAfterCurrent) !== metadataIdentity(before)
          || !sameCanonicalPath(canonicalAfterCurrent, canonical)
          || sha256(currentBytes) !== initialDigest) {
          fail("FILE_IDENTITY_CHANGED", `${label} 当前字节已变化。`);
        }
      },
      async close() {
        if (closed) return;
        await handle.close();
        closed = true;
      }
    };
  } catch (error) {
    if (handle) {
      try {
        await handle.close();
      } catch {
        const cleanupError = new SingleBindingIntegratedPhysicalPackageError(
          "HANDLE_CLOSE_FAILED",
          "physical package 文件打开失败且句柄关闭也失败。 "
        );
        cleanupError.primaryCode = error?.code ?? "FILE_ENDPOINT_INVALID";
        cleanupError.cleanupUnconfirmed = true;
        throw cleanupError;
      }
    }
    if (error instanceof SingleBindingIntegratedPhysicalPackageError) throw error;
    fail("FILE_ENDPOINT_INVALID", `${label} 文件读取失败。`);
  }
}

async function assertExactFlatDirectory(endpoint, expectedNames, label) {
  await assertDirectoryCurrent(endpoint, label);
  let entries;
  try {
    entries = await readdir(endpoint.path, { withFileTypes: true });
  } catch {
    fail("ENDPOINT_SET_INVALID", `${label} 端点集合不可读。`);
  }
  const observed = entries.map((entry) => entry.name).sort(compareOrdinal);
  const expected = [...expectedNames].sort(compareOrdinal);
  if (observed.length !== expected.length || observed.some((name, index) => name !== expected[index])) {
    fail("ENDPOINT_SET_INVALID", `${label} 含额外、缺失或未批准端点。`);
  }
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink()) {
      fail("ENDPOINT_SET_INVALID", `${label}/${entry.name} 不是普通文件。`);
    }
  }
}

async function inspectRootEndpoints(root) {
  await assertDirectoryCurrent(root, "pair root");
  let entries;
  try {
    entries = await readdir(root.path, { withFileTypes: true });
  } catch {
    fail("ENDPOINT_SET_INVALID", "pair root 端点集合不可读。 ");
  }
  const names = entries.map((entry) => entry.name).sort(compareOrdinal);
  if (names.length !== ROOT_ENDPOINTS.length
    || names.some((name, index) => name !== [...ROOT_ENDPOINTS].sort(compareOrdinal)[index])) {
    fail("ENDPOINT_SET_INVALID", "pair root 含额外、缺失或未批准端点。 ");
  }
  const directories = {};
  for (const name of ["seat-a", "seat-b", "coordinator"]) {
    const entry = entries.find((candidate) => candidate.name === name);
    if (!entry?.isDirectory() || entry.isSymbolicLink()) {
      fail("ENDPOINT_SET_INVALID", `${name} 不是普通目录。`);
    }
    directories[name] = await plainDirectory(join(root.path, name), name);
  }
  const directoryIdentities = [root.identity, ...Object.values(directories).map((entry) => entry.identity)];
  if (new Set(directoryIdentities).size !== directoryIdentities.length) {
    fail("DIRECTORY_ENDPOINT_INVALID", "pair root、A、B 与 coordinator 必须是彼此不同的目录 identity。 ");
  }
  for (const name of ["PAIR-START-HERE.txt", "pair-manifest.json", "pair-precommit.json"]) {
    const entry = entries.find((candidate) => candidate.name === name);
    if (!entry?.isFile() || entry.isSymbolicLink()) {
      fail("ENDPOINT_SET_INVALID", `${name} 不是普通文件。`);
    }
  }
  return Object.freeze(directories);
}

function parseStrictJson(held, label) {
  try {
    return parseSingleBindingIntegratedStrictJsonBytes(held.bytes, {
      label,
      maxBytes: MAX_JSON_BYTES
    });
  } catch {
    fail("JSON_INVALID", `${label} 未通过严格 JSON 校验。`);
  }
}

function validateBoundary(value, label) {
  assertExactValue(value, SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY, label);
}

function validatePayloads(value, expectedPaths, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype
    || value.length !== expectedPaths.length) {
    fail("MANIFEST_INVALID", `${label} payloads 数量无效。`);
  }
  const observedPaths = [];
  for (const [index, entry] of value.entries()) {
    exactKeys(entry, ["byteLength", "path", "sha256"], `${label}.payloads[${index}]`);
    safeRelativePath(entry.path, `${label}.payloads[${index}].path`);
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength <= 0 || entry.byteLength > MAX_PAYLOAD_BYTES) {
      fail("MANIFEST_INVALID", `${label} payload byteLength 无效。`);
    }
    assertNonzeroSha256(entry.sha256, `${label} payload sha256`);
    observedPaths.push(entry.path);
  }
  if (new Set(observedPaths).size !== observedPaths.length
    || canonicalStringify(observedPaths) !== canonicalStringify([...observedPaths].sort(compareOrdinal))
    || canonicalStringify(observedPaths) !== canonicalStringify([...expectedPaths].sort(compareOrdinal))) {
    fail("MANIFEST_INVALID", `${label} payload 集合或顺序无效。`);
  }
}

function assertCommonManifestIdentity(value, request, label) {
  if (value.schemaVersion !== "1.0.0"
    || value.workflowVersion !== SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION
    || value.reviewPurpose !== SINGLE_BINDING_INTEGRATED_PHYSICAL_REVIEW_PURPOSE
    || value.reviewCycleId !== request.expectedReviewCycleId
    || value.pairRunId !== request.expectedPairRunId) {
    fail("IDENTITY_MISMATCH", `${label} 的版本、purpose、cycle 或 pair 不匹配。`);
  }
}

function validatePairPrecommit(value, request) {
  exactKeys(value, [
    "bindingId", "bindingIdentityDigest", "boundary", "candidateDigest", "fixtureContentDigest",
    "pairRunId", "physicalSeatDirectoriesMustBeDistributedSeparately", "questionSetDigest", "recordType",
    "reviewCycleId", "reviewPurpose", "schemaVersion", "seats", "selectedBindingCount",
    "syntheticRehearsalManifestDigest", "workflowVersion"
  ], "pair precommit");
  assertCommonManifestIdentity(value, request, "pair precommit");
  if (value.recordType !== SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES.pairPrecommit
    || value.selectedBindingCount !== 1
    || value.physicalSeatDirectoriesMustBeDistributedSeparately !== true) {
    fail("MANIFEST_INVALID", "pair precommit 固定字段无效。 ");
  }
  for (const [key, expected] of Object.entries({
    bindingId: SYNTHETIC_REHEARSAL_FIXTURE_REF.bindingId,
    bindingIdentityDigest: SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
    syntheticRehearsalManifestDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
    fixtureContentDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest,
    questionSetDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest,
    candidateDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateDigest
  })) {
    if (value[key] !== expected) fail("IDENTITY_MISMATCH", `pair precommit.${key} 不匹配。`);
  }
  if (!Array.isArray(value.seats) || value.seats.length !== 2) {
    fail("MANIFEST_INVALID", "pair precommit seats 无效。 ");
  }
  const expectedSeats = [["A", "seat-a"], ["B", "seat-b"]];
  for (const [index, [seatId, relativeDirectory]] of expectedSeats.entries()) {
    const seat = value.seats[index];
    exactKeys(seat, ["relativeDirectory", "seatId", "seatSessionNonce"], `pair precommit seat ${seatId}`);
    assertOpaqueId(
      seat.seatSessionNonce,
      SEAT_SESSION_PATTERN,
      /^single-binding-synthetic-seat-session\.0{64}$/u,
      `pair precommit seat ${seatId} nonce`
    );
    if (seat.seatId !== seatId || seat.relativeDirectory !== relativeDirectory) {
      fail("MANIFEST_INVALID", `pair precommit seat ${seatId} identity 无效。`);
    }
  }
  if (value.seats[0].seatSessionNonce === value.seats[1].seatSessionNonce
    || value.seats.find((seat) => seat.seatId === request.expectedSeatId)?.seatSessionNonce
      !== request.expectedSeatSessionNonce) {
    fail("IDENTITY_MISMATCH", "pair precommit seat nonce 与外部 expected identity 不匹配。 ");
  }
  validateBoundary(value.boundary, "pair precommit boundary");
  return value;
}

function validateArtifactDescriptor(value, expectedFilename, label) {
  exactKeys(value, ["byteLength", "filename", "rawSha256"], label);
  if (value.filename !== expectedFilename || !Number.isSafeInteger(value.byteLength)
    || value.byteLength <= 0 || value.byteLength > MAX_PAYLOAD_BYTES) {
    fail("MANIFEST_INVALID", `${label} filename 或 byteLength 无效。`);
  }
  assertNonzeroSha256(value.rawSha256, `${label}.rawSha256`);
}

function validatePairManifest(value, request, precommit, precommitFile, pairGuideFile) {
  exactKeys(value, [
    "boundary", "coordinatorPayloads", "coordinatorRelativeDirectory", "pairGuideArtifact", "pairId",
    "pairPrecommitArtifact", "pairRunId", "physicalSeatDirectoriesMustBeDistributedSeparately", "recordType",
    "reviewCycleId", "reviewPurpose", "schemaVersion", "seatPackages", "workflowVersion"
  ], "pair manifest");
  assertCommonManifestIdentity(value, request, "pair manifest");
  if (value.recordType !== SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES.pairManifest
    || value.pairId !== "hakimi.bazi.expert-single-binding.physical-synthetic-pair/1.0.0"
    || value.coordinatorRelativeDirectory !== "coordinator"
    || value.physicalSeatDirectoriesMustBeDistributedSeparately !== true) {
    fail("MANIFEST_INVALID", "pair manifest 固定字段无效。 ");
  }
  validateArtifactDescriptor(value.pairPrecommitArtifact, "pair-precommit.json", "pair precommit artifact");
  validateArtifactDescriptor(value.pairGuideArtifact, "PAIR-START-HERE.txt", "pair guide artifact");
  if (value.pairPrecommitArtifact.byteLength !== precommitFile.byteLength
    || value.pairPrecommitArtifact.rawSha256 !== precommitFile.rawSha256
    || value.pairPrecommitArtifact.rawSha256 !== request.expectedPairPrecommitRawSha256
    || value.pairGuideArtifact.byteLength !== pairGuideFile.byteLength
    || value.pairGuideArtifact.rawSha256 !== pairGuideFile.rawSha256) {
    fail("PIN_MISMATCH", "pair manifest 的 P 或 guide artifact 与实体字节不匹配。 ");
  }
  if (!Array.isArray(value.seatPackages) || value.seatPackages.length !== 2) {
    fail("MANIFEST_INVALID", "pair manifest seatPackages 无效。 ");
  }
  for (const [index, seatId] of ["A", "B"].entries()) {
    const seat = value.seatPackages[index];
    exactKeys(seat, [
      "manifestByteLength", "manifestFilename", "manifestRawSha256", "relativeDirectory",
      "seatId", "seatSessionNonce"
    ], `pair manifest seat ${seatId}`);
    if (seat.seatId !== seatId || seat.relativeDirectory !== `seat-${seatId.toLowerCase()}`
      || seat.manifestFilename !== "package-manifest.json"
      || !Number.isSafeInteger(seat.manifestByteLength) || seat.manifestByteLength <= 0
      || seat.manifestByteLength > MAX_PAYLOAD_BYTES
      || seat.seatSessionNonce !== precommit.seats[index].seatSessionNonce) {
      fail("MANIFEST_INVALID", `pair manifest seat ${seatId} identity 无效。`);
    }
    assertNonzeroSha256(seat.manifestRawSha256, `pair manifest seat ${seatId} manifest hash`);
  }
  const selected = value.seatPackages.find((seat) => seat.seatId === request.expectedSeatId);
  if (value.seatPackages[0].manifestRawSha256 === value.seatPackages[1].manifestRawSha256
    || selected.manifestRawSha256 !== request.expectedSeatPackageManifestRawSha256
    || selected.seatSessionNonce !== request.expectedSeatSessionNonce) {
    fail("PIN_MISMATCH", "pair manifest selected seat pin 或 nonce 与包外 expected value 不匹配。 ");
  }
  validatePayloads(value.coordinatorPayloads, COORDINATOR_PAYLOADS, "pair manifest coordinator");
  validateBoundary(value.boundary, "pair manifest boundary");
  return value;
}

function validateSeatManifest(value, request, selectedPairSeat) {
  exactKeys(value, [
    "boundary", "containsOppositeSeatEntry", "packageId", "packageLocalExecutionAllowed", "pairPrecommitRawSha256",
    "pairRunId", "payloads", "physicalExpertSurfaceReady", "recordType", "reviewCycleId", "reviewPurpose",
    "schemaVersion", "seatId", "seatSessionNonce", "selectedEntry", "sourceCoordinatorRequired", "workflowVersion"
  ], "seat manifest");
  assertCommonManifestIdentity(value, request, "seat manifest");
  const seatLower = request.expectedSeatId.toLowerCase();
  const expectedEntry = `single-binding-integrated-${seatLower}.html`;
  if (value.recordType !== SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES.seatManifest
    || value.packageId !== `hakimi.bazi.expert-single-binding.physical-synthetic-seat-${seatLower}/1.0.0`
    || value.seatId !== request.expectedSeatId
    || value.seatSessionNonce !== request.expectedSeatSessionNonce
    || value.pairPrecommitRawSha256 !== request.expectedPairPrecommitRawSha256
    || value.selectedEntry !== expectedEntry
    || value.containsOppositeSeatEntry !== false
    || value.physicalExpertSurfaceReady !== false
    || value.packageLocalExecutionAllowed !== false
    || value.sourceCoordinatorRequired !== true) {
    fail("MANIFEST_INVALID", "selected seat manifest 固定字段或身份无效。 ");
  }
  if (selectedPairSeat.manifestByteLength <= 0
    || selectedPairSeat.manifestRawSha256 !== request.expectedSeatPackageManifestRawSha256) {
    fail("PIN_MISMATCH", "selected seat descriptor 与 expected S 不匹配。 ");
  }
  validatePayloads(value.payloads, [...SHARED_SEAT_PAYLOADS, expectedEntry], "seat manifest");
  validateBoundary(value.boundary, "seat manifest boundary");
  return value;
}

async function closeHeldFiles(files, primaryError = null) {
  const outcomes = await Promise.allSettled([...files.values()].map((held) => held.close()));
  if (outcomes.some((outcome) => outcome.status === "rejected")) {
    const cleanupError = new SingleBindingIntegratedPhysicalPackageError(
      "HANDLE_CLOSE_FAILED",
      primaryError
        ? "physical package 主操作已拒绝，且至少一个 held handle 关闭失败。 "
        : "至少一个 physical package held handle 关闭失败。 "
    );
    cleanupError.primaryCode = primaryError?.code ?? null;
    cleanupError.cleanupUnconfirmed = true;
    throw cleanupError;
  }
}

async function openAndRegister(files, canonicalRoot, relativePath, maxBytes, label) {
  if (files.has(relativePath)) fail("ENDPOINT_SET_INVALID", `${relativePath} 重复。`);
  const held = await openStableFile(canonicalRoot, relativePath, maxBytes, label);
  files.set(relativePath, held);
  return held;
}

async function assertHeldMatchesDescriptor(held, descriptor, label) {
  if (held.byteLength !== descriptor.byteLength || held.rawSha256 !== descriptor.sha256) {
    fail("PAYLOAD_MISMATCH", `${label} 的实体 bytes 与 manifest 不匹配。`);
  }
}

export async function prepareSingleBindingIntegratedPhysicalSeatPackage(input) {
  const request = captureRequest(input);
  const files = new Map();
  try {
    const lexicalRoot = resolve(request.pairRoot);
    const root = await plainDirectory(lexicalRoot, "pair root");
    if (!sameCanonicalPath(root.path, lexicalRoot) || !pathIsOutside(REPOSITORY_ROOT, root.path)) {
      fail("PACKAGE_ROOT_INVALID", "pair root 必须位于仓库之外且不能重定向。 ");
    }
    const directories = await inspectRootEndpoints(root);
    const selectedDirectoryName = `seat-${request.expectedSeatId.toLowerCase()}`;
    const selectedDirectory = directories[selectedDirectoryName];
    await assertExactFlatDirectory(
      selectedDirectory,
      [...SHARED_SEAT_PAYLOADS, `single-binding-integrated-${request.expectedSeatId.toLowerCase()}.html`, "package-manifest.json"],
      `selected ${selectedDirectoryName}`
    );
    await assertExactFlatDirectory(directories.coordinator, COORDINATOR_PAYLOADS, "coordinator");

    const precommitFile = await openAndRegister(
      files, root.path, "pair-precommit.json", MAX_JSON_BYTES, "pair precommit"
    );
    const pairManifestFile = await openAndRegister(
      files, root.path, "pair-manifest.json", MAX_JSON_BYTES, "pair manifest"
    );
    const pairGuideFile = await openAndRegister(
      files, root.path, "PAIR-START-HERE.txt", MAX_PAYLOAD_BYTES, "pair guide"
    );
    const seatManifestPath = `${selectedDirectoryName}/package-manifest.json`;
    const seatManifestFile = await openAndRegister(
      files, root.path, seatManifestPath, MAX_JSON_BYTES, "selected seat manifest"
    );
    if (precommitFile.rawSha256 !== request.expectedPairPrecommitRawSha256
      || pairManifestFile.rawSha256 !== request.expectedPairManifestRawSha256
      || seatManifestFile.rawSha256 !== request.expectedSeatPackageManifestRawSha256) {
      fail("PIN_MISMATCH", "实体 P/PM/S 与包外 expected pins 不匹配。 ");
    }

    const precommit = validatePairPrecommit(parseStrictJson(precommitFile, "pair precommit"), request);
    const pairManifest = validatePairManifest(
      parseStrictJson(pairManifestFile, "pair manifest"),
      request,
      precommit,
      precommitFile,
      pairGuideFile
    );
    const selectedPairSeat = pairManifest.seatPackages.find((seat) => seat.seatId === request.expectedSeatId);
    if (selectedPairSeat.manifestByteLength !== seatManifestFile.byteLength) {
      fail("PAYLOAD_MISMATCH", "selected seat manifest byteLength 与 PM 不匹配。 ");
    }
    const seatManifest = validateSeatManifest(
      parseStrictJson(seatManifestFile, "selected seat manifest"),
      request,
      selectedPairSeat
    );

    for (const descriptor of seatManifest.payloads) {
      const pairRelativePath = `${selectedDirectoryName}/${descriptor.path}`;
      const held = await openAndRegister(files, root.path, pairRelativePath, MAX_PAYLOAD_BYTES, pairRelativePath);
      await assertHeldMatchesDescriptor(held, descriptor, pairRelativePath);
    }
    for (const descriptor of pairManifest.coordinatorPayloads) {
      const pairRelativePath = `coordinator/${descriptor.path}`;
      const held = await openAndRegister(files, root.path, pairRelativePath, MAX_PAYLOAD_BYTES, pairRelativePath);
      await assertHeldMatchesDescriptor(held, descriptor, pairRelativePath);
    }

    await inspectRootEndpoints(root);
    await assertExactFlatDirectory(selectedDirectory, [
      ...SHARED_SEAT_PAYLOADS,
      `single-binding-integrated-${request.expectedSeatId.toLowerCase()}.html`,
      "package-manifest.json"
    ], `selected ${selectedDirectoryName}`);
    await assertExactFlatDirectory(directories.coordinator, COORDINATOR_PAYLOADS, "coordinator");
    for (const held of files.values()) await held.assertCurrent();

    const capability = deepFreeze({
      schemaVersion: "1.0.0",
      capabilityKind: "single_binding_integrated_physical_seat_package_prepared_in_process",
      canonicalPairRoot: root.path,
      reviewCycleId: request.expectedReviewCycleId,
      pairRunId: request.expectedPairRunId,
      seatId: request.expectedSeatId,
      seatSessionNonce: request.expectedSeatSessionNonce,
      pairPrecommitRawSha256: request.expectedPairPrecommitRawSha256,
      pairManifestRawSha256: request.expectedPairManifestRawSha256,
      seatPackageManifestRawSha256: request.expectedSeatPackageManifestRawSha256,
      preparedPairRelativePaths: [...files.keys()].sort(compareOrdinal),
      checks: {
        explicitExternalPinsMatched: true,
        rootSelectedSeatAndCoordinatorEndpointSetsMatched: true,
        selectedSeatAndCoordinatorPayloadBytesCopiedWhileHandlesHeld: true,
        packageLocalJavaScriptImportedOrEvaluatedBySourceCoordinatorProcess: false,
        oppositeSeatPayloadVerified: false
      },
      boundary: { ...SINGLE_BINDING_INTEGRATED_PHYSICAL_PREPARE_BOUNDARY }
    });
    PREPARED_STATES.set(capability, {
      request,
      root,
      directories,
      selectedDirectory,
      selectedDirectoryName,
      files,
      precommit,
      pairManifest,
      seatManifest,
      consumed: false
    });
    return capability;
  } catch (error) {
    await closeHeldFiles(files, error);
    if (error instanceof SingleBindingIntegratedPhysicalPackageError) throw error;
    fail("PACKAGE_PREPARE_FAILED", "physical package prepare 未通过。 ");
  }
}

export async function consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(capability) {
  const state = capability && PREPARED_STATES.get(capability);
  if (!state || CONSUMED_CAPABILITIES.has(capability) || state.consumed) {
    fail("CAPABILITY_INVALID", "prepared physical package capability 无效、伪造或已消费。 ");
  }
  state.consumed = true;
  state.cleanupFailed = false;
  CONSUMED_CAPABILITIES.add(capability);
  let primaryError = null;
  let verifiedServerPayloadCapability = null;
  let privateServerPayloadState = null;
  try {
    await inspectRootEndpoints(state.root);
    await assertExactFlatDirectory(state.selectedDirectory, [
      ...SHARED_SEAT_PAYLOADS,
      `single-binding-integrated-${state.request.expectedSeatId.toLowerCase()}.html`,
      "package-manifest.json"
    ], `selected ${state.selectedDirectoryName}`);
    await assertExactFlatDirectory(state.directories.coordinator, COORDINATOR_PAYLOADS, "coordinator");
    for (const held of state.files.values()) await held.assertCurrent();
    await assertDirectoryCurrent(state.root, "pair root");
    for (const [name, endpoint] of Object.entries(state.directories)) {
      await assertDirectoryCurrent(endpoint, name);
    }

    const privateBytesByPairRelativePath = new Map();
    for (const [path, held] of state.files.entries()) {
      privateBytesByPairRelativePath.set(path, Buffer.from(held.bytes));
    }
    const sessionBinding = createSingleBindingIntegratedSessionBinding({
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_single_binding_nocode_synthetic_pilot_session_binding_v1",
      workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
      bindingMode: "physical_synthetic_single_binding_pair",
      reviewCycleId: state.request.expectedReviewCycleId,
      pairRunId: state.request.expectedPairRunId,
      seatId: state.request.expectedSeatId,
      seatSessionNonce: state.request.expectedSeatSessionNonce,
      pairPrecommitRawSha256: state.request.expectedPairPrecommitRawSha256,
      pairManifestRawSha256: state.request.expectedPairManifestRawSha256,
      seatPackageManifestRawSha256: state.request.expectedSeatPackageManifestRawSha256,
      syntheticRehearsalManifestDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
      fixtureContentDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest,
      questionSetDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest,
      candidateDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateDigest,
      bindingId: SYNTHETIC_REHEARSAL_FIXTURE_REF.bindingId,
      bindingIdentityDigest: SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
      selectedBindingCount: 1
    });
    const payloadByteDescriptors = [...privateBytesByPairRelativePath.entries()]
      .map(([path, bytes]) => Object.freeze({
        path,
        byteLength: bytes.byteLength,
        rawSha256: sha256(bytes)
      }))
      .sort((left, right) => compareOrdinal(left.path, right.path));
    verifiedServerPayloadCapability = deepFreeze({
      schemaVersion: "1.0.0",
      capabilityKind: "single_binding_integrated_physical_verified_payload_for_future_source_server",
      sessionBinding,
      payloadByteDescriptors,
      pairPrecommit: deepFreeze(cloneJson(state.precommit)),
      pairManifest: deepFreeze(cloneJson(state.pairManifest)),
      seatManifest: deepFreeze(cloneJson(state.seatManifest)),
      checks: Object.freeze({
        consumedExactlyOnce: true,
        heldHandlesReassertedBeforeCopy: true,
        copiedBytesDetachedFromPackageFilesAndKeptPrivate: true,
        packageLocalJavaScriptImportedOrEvaluatedBySourceCoordinatorProcess: false,
        inMemoryVerifiedPayloadServerImplemented: false,
        oppositeSeatPayloadVerified: false
      }),
      boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_PREPARE_BOUNDARY
    });
    privateServerPayloadState = {
      sessionBinding,
      bytesByPairRelativePath: privateBytesByPairRelativePath,
      sourcePairRoot: state.root,
      consumedBySourceServer: false
    };
  } catch (error) {
    primaryError = error instanceof SingleBindingIntegratedPhysicalPackageError
      ? error
      : new SingleBindingIntegratedPhysicalPackageError(
        "PACKAGE_CONSUME_FAILED",
        "physical package consume 未通过。 "
      );
  }
  try {
    await closeHeldFiles(state.files, primaryError);
  } catch (cleanupError) {
    state.cleanupFailed = true;
    throw cleanupError;
  }
  PREPARED_STATES.delete(capability);
  if (primaryError) throw primaryError;
  VERIFIED_SERVER_PAYLOAD_STATES.set(verifiedServerPayloadCapability, privateServerPayloadState);
  return verifiedServerPayloadCapability;
}

export async function releaseSingleBindingIntegratedPhysicalSeatPackage(capability) {
  const state = capability && PREPARED_STATES.get(capability);
  if (!state || (state.consumed && state.cleanupFailed !== true)) {
    fail("CAPABILITY_INVALID", "prepared physical package capability 无效、已释放或不可再释放。 ");
  }
  if (!state.consumed) {
    state.consumed = true;
    CONSUMED_CAPABILITIES.add(capability);
  }
  try {
    await closeHeldFiles(state.files);
  } catch (cleanupError) {
    state.cleanupFailed = true;
    throw cleanupError;
  }
  state.cleanupFailed = false;
  PREPARED_STATES.delete(capability);
  return Object.freeze({
    released: true,
    serverPayloadCapabilityCreated: false,
    boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_PREPARE_BOUNDARY
  });
}

function clearPrivateByteMap(bytesByPath) {
  for (const bytes of bytesByPath.values()) bytes.fill(0);
  bytesByPath.clear();
}

function listenOnRandomLoopback(server) {
  return new Promise((resolveListen, rejectListen) => {
    const onError = () => rejectListen(new SingleBindingIntegratedPhysicalPackageError(
      "SERVER_LISTEN_FAILED",
      "verified-memory server 未能绑定随机 loopback 端口。 "
    ));
    server.once("error", onError);
    server.listen({ host: "127.0.0.1", port: 0, exclusive: true }, () => {
      server.off("error", onError);
      const address = server.address();
      if (!address || typeof address === "string" || address.address !== "127.0.0.1"
        || !Number.isInteger(address.port) || address.port <= 0 || address.port > 65_535) {
        rejectListen(new SingleBindingIntegratedPhysicalPackageError(
          "SERVER_LISTEN_FAILED",
          "verified-memory server 未取得精确 loopback endpoint。 "
        ));
        return;
      }
      resolveListen(address.port);
    });
  });
}

function createServerLifecycle(server) {
  const lifecycle = {
    armed: false,
    runtimeErrorObserved: false,
    closePromise: null,
    closeFailureObserved: false,
    onRuntimeError: null,
    requestClose: null,
    detach: null
  };
  lifecycle.requestClose = () => {
    if (lifecycle.closePromise) return lifecycle.closePromise;
    const attempt = new Promise((resolveClose, rejectClose) => {
      try {
        server.close((error) => {
          if (error && error.code !== "ERR_SERVER_NOT_RUNNING") rejectClose(error);
          else resolveClose();
        });
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
      } catch (error) {
        if (error?.code === "ERR_SERVER_NOT_RUNNING") resolveClose();
        else rejectClose(error);
      }
    });
    lifecycle.closePromise = attempt.catch((error) => {
      lifecycle.closeFailureObserved = true;
      lifecycle.closePromise = null;
      throw error;
    });
    return lifecycle.closePromise;
  };
  lifecycle.onRuntimeError = () => {
    if (!lifecycle.armed) return;
    lifecycle.runtimeErrorObserved = true;
    lifecycle.requestClose().catch(() => {
      lifecycle.closeFailureObserved = true;
    });
  };
  lifecycle.detach = () => server.off("error", lifecycle.onRuntimeError);
  server.on("error", lifecycle.onRuntimeError);
  return lifecycle;
}

function createSingleUseReturnCapture(sessionBinding, sourcePairRoot) {
  const state = {
    accepting: false,
    captured: null,
    currentPromise: null,
    sourcePairRoot
  };
  const returnToken = randomBytes(32).toString("hex");
  const adapter = Object.freeze({
    returnToken,
    maxBytes: MAX_JSON_BYTES,
    async acceptBytes(bytes) {
      if (state.accepting || state.captured !== null || !(bytes instanceof Uint8Array)) {
        fail("RETURN_CAPTURE_REJECTED", "本席回件已在处理或已经接收。 ");
      }
      state.accepting = true;
      const exactBytes = Uint8Array.from(bytes);
      const operation = (async () => {
        const rawSha256 = sha256(exactBytes);
        const preflight = await preflightSingleBindingIntegratedCompleteReturnBytes(exactBytes, {
          expectedSessionBinding: sessionBinding,
          expectedCompleteReturnRawSha256: rawSha256
        });
        state.captured = {
          bytes: Buffer.from(exactBytes),
          byteLength: exactBytes.byteLength,
          rawSha256,
          preflight
        };
      })();
      state.currentPromise = operation;
      try {
        await operation;
      } finally {
        exactBytes.fill(0);
        state.currentPromise = null;
        state.accepting = false;
      }
    }
  });
  return Object.freeze({ adapter, state });
}

export async function startSingleBindingIntegratedPhysicalSeatInMemoryServer(capability) {
  const payloadState = capability && VERIFIED_SERVER_PAYLOAD_STATES.get(capability);
  if (!payloadState || payloadState.consumedBySourceServer) {
    fail("CAPABILITY_INVALID", "verified server payload capability 无效、已释放或已消费。 ");
  }
  payloadState.consumedBySourceServer = true;
  VERIFIED_SERVER_PAYLOAD_STATES.delete(capability);
  const seatId = payloadState.sessionBinding.seatId;
  const seatDirectory = `seat-${seatId.toLowerCase()}`;
  const serverPayloads = new Map();
  let server = null;
  let lifecycle = null;
  const returnCapture = createSingleUseReturnCapture(
    payloadState.sessionBinding,
    payloadState.sourcePairRoot
  );
  try {
    for (const relativePath of singleBindingIntegratedPayloadPaths(seatId)) {
      const pairRelativePath = `${seatDirectory}/${relativePath}`;
      const bytes = payloadState.bytesByPairRelativePath.get(pairRelativePath);
      if (!(bytes instanceof Uint8Array) || bytes.byteLength <= 0 || bytes.byteLength > MAX_PAYLOAD_BYTES) {
        fail("SERVER_PAYLOAD_INVALID", "future server capability 缺少精确 selected-seat payload。 ");
      }
      serverPayloads.set(relativePath, Buffer.from(bytes));
    }
    server = createSingleBindingIntegratedServer({
      seatId,
      payloads: serverPayloads,
      sessionBinding: payloadState.sessionBinding,
      returnCapture: returnCapture.adapter
    });
    lifecycle = createServerLifecycle(server);
    clearPrivateByteMap(payloadState.bytesByPairRelativePath);
    clearPrivateByteMap(serverPayloads);
    const port = await listenOnRandomLoopback(server);
    lifecycle.armed = true;
    const origin = `http://127.0.0.1:${port}`;
    const serverCapability = deepFreeze({
      schemaVersion: "1.0.0",
      capabilityKind: "single_binding_integrated_physical_in_memory_server",
      origin,
      entryUrl: `${origin}/`,
      seatId,
      reviewCycleId: payloadState.sessionBinding.reviewCycleId,
      pairRunId: payloadState.sessionBinding.pairRunId,
      checks: {
        randomLoopbackPortBound: true,
        selectedSeatOnlyServedFromPrivateVerifiedMemory: true,
        packagePathReadAfterServerStart: false,
        packageLocalJavaScriptImportedOrEvaluatedBySourceCoordinatorProcess: false,
        singleUseReturnCaptureImplemented: true,
        returnCapturedAtServerStart: false,
        physicalExpertSurfaceReady: false
      },
      boundary: { ...SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY }
    });
    RUNNING_PHYSICAL_SERVER_STATES.set(serverCapability, {
      server,
      lifecycle,
      returnCaptureState: returnCapture.state,
      closing: false,
      cleanupFailed: false,
      startupFailureCleanupOnly: false
    });
    return serverCapability;
  } catch (error) {
    clearPrivateByteMap(payloadState.bytesByPairRelativePath);
    clearPrivateByteMap(serverPayloads);
    let cleanupError = null;
    if (server && lifecycle) {
      try {
        await lifecycle.requestClose();
        lifecycle.detach();
      } catch (observedCleanupError) {
        cleanupError = observedCleanupError;
      }
    }
    if (cleanupError && server && lifecycle) {
      const cleanupCapability = deepFreeze({
        schemaVersion: "1.0.0",
        capabilityKind: "single_binding_integrated_physical_failed_server_start_cleanup",
        serverStartSucceeded: false,
        boundary: { ...SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY }
      });
      RUNNING_PHYSICAL_SERVER_STATES.set(cleanupCapability, {
        server,
        lifecycle,
        closing: false,
        cleanupFailed: true,
        startupFailureCleanupOnly: true
      });
      const cleanupFailure = new SingleBindingIntegratedPhysicalPackageError(
        "SERVER_CLOSE_FAILED",
        "verified-memory server 启动已拒绝，且监听资源关闭仍需重试。 "
      );
      cleanupFailure.primaryCode = error?.code ?? "SERVER_START_FAILED";
      cleanupFailure.cleanupCapability = cleanupCapability;
      throw cleanupFailure;
    }
    if (error instanceof SingleBindingIntegratedPhysicalPackageError) throw error;
    fail("SERVER_START_FAILED", "verified-memory server 未启动。 ");
  }
}

function materializeCapturedReturnCapability(returnCaptureState) {
  const captured = returnCaptureState?.captured;
  if (!captured) return null;
  returnCaptureState.captured = null;
  const capability = deepFreeze({
    schemaVersion: "1.0.0",
    capabilityKind: "single_binding_integrated_physical_captured_return_in_process",
    seatId: captured.preflight.seatId,
    reviewCycleId: captured.preflight.sessionBinding.reviewCycleId,
    pairRunId: captured.preflight.sessionBinding.pairRunId,
    completeReturnRawSha256: captured.rawSha256,
    completeReturnByteLength: captured.byteLength,
    checks: {
      strictCompleteReturnPreflightPassed: true,
      heldInSourceProcessMemoryOnly: true,
      externalReturnDirectoryWriteImplemented: false,
      physicalErasureEstablished: false
    },
    boundary: { ...SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY }
  });
  CAPTURED_RETURN_STATES.set(capability, {
    bytes: captured.bytes,
    preflight: captured.preflight,
    sourcePairRoot: returnCaptureState.sourcePairRoot,
    status: "available"
  });
  return capability;
}

export async function closeSingleBindingIntegratedPhysicalSeatInMemoryServer(capability) {
  const state = capability && RUNNING_PHYSICAL_SERVER_STATES.get(capability);
  if (!state || (state.closing && !state.cleanupFailed)) {
    fail("CAPABILITY_INVALID", "physical in-memory server capability 无效或已关闭。 ");
  }
  state.closing = true;
  state.cleanupFailed = false;
  try {
    await state.lifecycle.requestClose();
  } catch {
    state.cleanupFailed = true;
    fail("SERVER_CLOSE_FAILED", "physical in-memory server 关闭未确认。 ");
  }
  if (state.returnCaptureState?.currentPromise) {
    await Promise.allSettled([state.returnCaptureState.currentPromise]);
  }
  state.lifecycle.detach();
  RUNNING_PHYSICAL_SERVER_STATES.delete(capability);
  const returnCaptureCapability = materializeCapturedReturnCapability(state.returnCaptureState);
  if (state.lifecycle.runtimeErrorObserved) {
    const runtimeFailure = new SingleBindingIntegratedPhysicalPackageError(
      "SERVER_RUNTIME_ERROR_OBSERVED",
      "physical in-memory server 已关闭，但运行期间观察到 server error。 "
    );
    runtimeFailure.serverClosed = true;
    runtimeFailure.returnCaptureCapability = returnCaptureCapability;
    throw runtimeFailure;
  }
  return Object.freeze({
    serverClosed: true,
    startupFailureCleanupCompleted: state.startupFailureCleanupOnly,
    browserClosureEstablished: false,
    returnCaptured: returnCaptureCapability !== null,
    returnCaptureCapability,
    physicalErasureEstablished: false,
    boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY
  });
}

export function releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(capability) {
  const state = capability && CAPTURED_RETURN_STATES.get(capability);
  if (!state || state.status !== "available") {
    fail("CAPABILITY_INVALID", "captured return capability 无效、已释放或已消费。 ");
  }
  state.status = "releasing";
  state.bytes.fill(0);
  CAPTURED_RETURN_STATES.delete(capability);
  return Object.freeze({
    released: true,
    referencesCleared: true,
    externalReturnWritten: false,
    physicalErasureEstablished: false,
    boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY
  });
}

function captureReturnWriteRequest(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)
    || Object.getPrototypeOf(input) !== Object.prototype) {
    fail("REQUEST_INVALID", "captured return write request 必须是普通对象。 ");
  }
  const keys = Reflect.ownKeys(input);
  const expected = ["expectedCompleteReturnRawSha256", "outputDirectory"];
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (keys.some((key) => typeof key !== "string")
    || JSON.stringify([...keys].sort(compareOrdinal)) !== JSON.stringify(expected.sort(compareOrdinal))
    || keys.some((key) => !descriptors[key].enumerable || descriptors[key].get || descriptors[key].set)) {
    fail("REQUEST_INVALID", "captured return write request 字段集合或属性类型无效。 ");
  }
  const value = Object.fromEntries(keys.map((key) => [key, descriptors[key].value]));
  assertNonzeroSha256(value.expectedCompleteReturnRawSha256, "expected complete return raw SHA-256");
  if (typeof value.outputDirectory !== "string" || value.outputDirectory.length < 1
    || value.outputDirectory.length > 2_000 || !isAbsolute(value.outputDirectory)
    || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value.outputDirectory)) {
    fail("OUTPUT_DIRECTORY_INVALID", "return outputDirectory 必须是无控制字符的长度受限绝对路径。 ");
  }
  return Object.freeze(value);
}

async function prepareExternalReturnOutputDirectory(outputDirectory, sourcePairRoot) {
  await assertDirectoryCurrent(sourcePairRoot, "source pair root");
  const target = resolve(outputDirectory);
  const lexicalParent = dirname(target);
  let parent;
  try {
    parent = await plainDirectory(lexicalParent, "return output parent");
  } catch {
    fail("OUTPUT_DIRECTORY_INVALID", "return output parent 不可用。 ");
  }
  const name = relative(parent.path, target);
  if (!sameCanonicalPath(parent.path, lexicalParent)
    || !pathIsOutside(REPOSITORY_ROOT, parent.path)
    || !pathIsOutside(sourcePairRoot.path, parent.path)
    || !pathIsOutside(sourcePairRoot.path, target)
    || name.length < 1 || name === "." || name === ".."
    || name.includes(":") || name.includes("/") || name.includes("\\")
    || !sameCanonicalPath(resolve(parent.path, name), target)) {
    fail("OUTPUT_DIRECTORY_INVALID", "return output 必须是仓库外未重定向 parent 的直接子目录。 ");
  }
  await assertDirectoryCurrent(parent, "return output parent");
  try {
    await lstat(target, { bigint: true });
    fail("OUTPUT_DIRECTORY_EXISTS", "return outputDirectory 必须尚不存在。 ");
  } catch (error) {
    if (error instanceof SingleBindingIntegratedPhysicalPackageError) throw error;
    if (error?.code !== "ENOENT") fail("OUTPUT_DIRECTORY_INVALID", "return outputDirectory 状态不可确认。 ");
  }
  await assertDirectoryCurrent(parent, "return output parent");
  return Object.freeze({ target, parent, sourcePairRoot });
}

async function assertDirectChildDirectoryCurrent(parent, child, label) {
  await assertDirectoryCurrent(parent, `${label} parent`);
  await assertDirectoryCurrent(child, label);
  if (!sameCanonicalPath(dirname(child.path), parent.path)) {
    fail("DIRECTORY_IDENTITY_CHANGED", `${label} 不再是已绑定 parent 的直接子目录。`);
  }
  const observedParent = await plainDirectory(dirname(child.path), `${label} parent`);
  if (!sameCanonicalPath(observedParent.path, parent.path)
    || observedParent.identity !== parent.identity) {
    fail("DIRECTORY_IDENTITY_CHANGED", `${label} parent 身份已变化。`);
  }
  await assertDirectoryCurrent(child, label);
  await assertDirectoryCurrent(parent, `${label} parent`);
}

async function createExternalReturnOutputDirectory(plan) {
  await assertDirectoryCurrent(plan.parent, "return output parent");
  await assertDirectoryCurrent(plan.sourcePairRoot, "source pair root");
  try {
    await mkdir(plan.target, { recursive: false, mode: 0o700 });
  } catch {
    fail("OUTPUT_DIRECTORY_CREATE_FAILED", "return outputDirectory 创建失败。 ");
  }
  await assertDirectoryCurrent(plan.parent, "return output parent");
  await assertDirectoryCurrent(plan.sourcePairRoot, "source pair root");
  const endpoint = await plainDirectory(plan.target, "return output directory");
  if (!sameCanonicalPath(endpoint.path, plan.target)
    || !sameCanonicalPath(dirname(endpoint.path), plan.parent.path)
    || !pathIsOutside(REPOSITORY_ROOT, endpoint.path)
    || !pathIsOutside(plan.sourcePairRoot.path, endpoint.path)) {
    fail("OUTPUT_DIRECTORY_INVALID", "return outputDirectory 创建后 identity 无效。 ");
  }
  await assertDirectChildDirectoryCurrent(plan.parent, endpoint, "return output directory");
  return endpoint;
}

async function writeExclusiveSyncedFile(root, relativePath, bytes, label) {
  safeRelativePath(relativePath, label);
  if (!(bytes instanceof Uint8Array) || bytes.byteLength <= 0 || bytes.byteLength > MAX_PAYLOAD_BYTES) {
    fail("OUTPUT_FILE_INVALID", `${label} bytes 无效。`);
  }
  const target = resolve(root, ...relativePath.split("/"));
  if (!sameCanonicalPath(dirname(target), root)) fail("PATH_ESCAPE", `${label} 路径越界。`);
  let handle;
  let primaryError = null;
  try {
    handle = await open(
      target,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      0o600
    );
    let offset = 0;
    while (offset < bytes.byteLength) {
      const { bytesWritten } = await handle.write(bytes, offset, bytes.byteLength - offset, offset);
      if (bytesWritten <= 0) fail("OUTPUT_FILE_WRITE_FAILED", `${label} 写入未完成。`);
      offset += bytesWritten;
    }
    await handle.sync();
  } catch (error) {
    primaryError = error instanceof SingleBindingIntegratedPhysicalPackageError
      ? error
      : new SingleBindingIntegratedPhysicalPackageError(
        "OUTPUT_FILE_WRITE_FAILED",
        `${label} 独占写入失败。`
      );
  }
  if (handle) {
    try {
      await handle.close();
    } catch {
      const cleanupError = new SingleBindingIntegratedPhysicalPackageError(
        "HANDLE_CLOSE_FAILED",
        `${label} 写入后 handle 关闭失败。`
      );
      cleanupError.primaryCode = primaryError?.code ?? null;
      cleanupError.cleanupUnconfirmed = true;
      throw cleanupError;
    }
  }
  if (primaryError) throw primaryError;
  return openStableFile(root, relativePath, MAX_PAYLOAD_BYTES, label);
}

export async function writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(
  capability,
  input
) {
  const request = captureReturnWriteRequest(input);
  const state = capability && CAPTURED_RETURN_STATES.get(capability);
  if (!state || state.status !== "available") {
    fail("CAPABILITY_INVALID", "captured return capability 无效、已释放或已消费。 ");
  }
  if (request.expectedCompleteReturnRawSha256 !== capability.completeReturnRawSha256
    || request.expectedCompleteReturnRawSha256 !== state.preflight.completeReturnRawSha256) {
    fail("PIN_MISMATCH", "包外 expected complete-return pin 与 capture 不匹配。 ");
  }
  state.status = "planning";
  let outputPlan;
  try {
    outputPlan = await prepareExternalReturnOutputDirectory(
      request.outputDirectory,
      state.sourcePairRoot
    );
  } catch (error) {
    state.status = "available";
    throw error;
  }
  let output;
  try {
    output = await createExternalReturnOutputDirectory(outputPlan);
  } catch (error) {
    state.status = "available";
    throw error;
  }
  let completeReturnBytes;
  let sidecarBytes;
  let completeReturnFilename;
  let sidecarFilename;
  try {
    completeReturnBytes = Buffer.from(state.bytes);
    const names = singleBindingIntegratedFilenamesForSession(state.preflight.sessionBinding);
    completeReturnFilename = names.completeReturnFilename;
    sidecarFilename = `${completeReturnFilename}.sha256.txt`;
    sidecarBytes = Buffer.from(
      `${state.preflight.completeReturnRawSha256}  ${completeReturnFilename}\n`,
      "utf8"
    );
  } catch (error) {
    completeReturnBytes?.fill(0);
    sidecarBytes?.fill(0);
    state.status = "available";
    if (error instanceof SingleBindingIntegratedPhysicalPackageError) throw error;
    fail("RETURN_WRITE_FAILED", "captured return external write 准备失败。 ");
  }
  state.status = "writing";
  const heldFiles = new Map();
  let heldFilesClosed = false;
  let receipt = null;
  let failure = null;
  let cleanupConfirmed = true;
  try {
    await assertDirectChildDirectoryCurrent(outputPlan.parent, output, "return output directory");
    const completeReturnFile = await writeExclusiveSyncedFile(
      output.path,
      completeReturnFilename,
      completeReturnBytes,
      "complete return"
    );
    heldFiles.set(completeReturnFilename, completeReturnFile);
    await assertDirectChildDirectoryCurrent(outputPlan.parent, output, "return output directory");
    const sidecarFile = await writeExclusiveSyncedFile(
      output.path,
      sidecarFilename,
      sidecarBytes,
      "complete return sidecar"
    );
    heldFiles.set(sidecarFilename, sidecarFile);
    await assertDirectChildDirectoryCurrent(outputPlan.parent, output, "return output directory");
    if (completeReturnFile.rawSha256 !== state.preflight.completeReturnRawSha256
      || completeReturnFile.byteLength !== state.preflight.completeReturnByteLength
      || sidecarFile.rawSha256 !== sha256(sidecarBytes)
      || sidecarFile.byteLength !== sidecarBytes.byteLength) {
      fail("OUTPUT_FILE_VERIFY_FAILED", "external complete return 或 sidecar 实体字节不匹配。 ");
    }
    await assertExactFlatDirectory(output, [completeReturnFilename, sidecarFilename], "return output directory");
    for (const held of heldFiles.values()) await held.assertCurrent();
    await assertDirectChildDirectoryCurrent(outputPlan.parent, output, "return output directory");
    await assertDirectoryCurrent(state.sourcePairRoot, "source pair root");
    await closeHeldFiles(heldFiles);
    heldFilesClosed = true;
    await assertDirectChildDirectoryCurrent(outputPlan.parent, output, "return output directory");
    await assertExactFlatDirectory(output, [completeReturnFilename, sidecarFilename], "return output directory");
    await assertDirectChildDirectoryCurrent(outputPlan.parent, output, "return output directory");
    await assertDirectoryCurrent(state.sourcePairRoot, "source pair root");
    receipt = deepFreeze({
      schemaVersion: "1.0.0",
      resultKind: "single_binding_integrated_physical_synthetic_return_external_write_candidate",
      outputDirectory: output.path,
      seatId: state.preflight.seatId,
      reviewCycleId: state.preflight.sessionBinding.reviewCycleId,
      pairRunId: state.preflight.sessionBinding.pairRunId,
      completeReturn: {
        filename: completeReturnFilename,
        byteLength: completeReturnFile.byteLength,
        rawSha256: completeReturnFile.rawSha256
      },
      sidecar: {
        filename: sidecarFilename,
        byteLength: sidecarFile.byteLength,
        rawSha256: sidecarFile.rawSha256
      },
      checks: {
        packageExternalExpectedPinMatched: true,
        filesCreatedExclusively: true,
        fileContentsSyncedBeforeClose: true,
        heldHandlesReassertedBeforeSuccess: true,
        exactTwoFileDirectoryObserved: true,
        repositoryWritePerformed: false,
        formalRecordEmitted: false
      },
      boundary: { ...SINGLE_BINDING_INTEGRATED_PHYSICAL_RETURN_WRITE_BOUNDARY }
    });
  } catch (error) {
    failure = error;
    cleanupConfirmed = error?.cleanupUnconfirmed !== true;
    if (!heldFilesClosed) {
      try {
        await closeHeldFiles(heldFiles, error);
        heldFilesClosed = true;
      } catch (cleanupError) {
        cleanupConfirmed = false;
        failure = cleanupError;
      }
    }
  }
  completeReturnBytes?.fill(0);
  sidecarBytes?.fill(0);
  if (failure) {
    state.status = cleanupConfirmed ? "available" : "cleanup_failed";
    if (failure instanceof SingleBindingIntegratedPhysicalPackageError) throw failure;
    fail("RETURN_WRITE_FAILED", "captured return external write 未通过。 ");
  }
  state.status = "consumed";
  CAPTURED_RETURN_STATES.delete(capability);
  state.bytes.fill(0);
  return receipt;
}

export function releaseSingleBindingIntegratedPhysicalServerPayloadCapability(capability) {
  const state = capability && VERIFIED_SERVER_PAYLOAD_STATES.get(capability);
  if (!state || state.consumedBySourceServer) {
    fail("CAPABILITY_INVALID", "verified server payload capability 无效、已释放或已消费。 ");
  }
  state.consumedBySourceServer = true;
  clearPrivateByteMap(state.bytesByPairRelativePath);
  VERIFIED_SERVER_PAYLOAD_STATES.delete(capability);
  return Object.freeze({
    released: true,
    referencesCleared: true,
    physicalErasureEstablished: false,
    sourceServerStarted: false,
    boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_PREPARE_BOUNDARY
  });
}
