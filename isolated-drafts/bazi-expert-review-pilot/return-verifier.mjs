import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  PILOT_AUTHORITY_BOUNDARY,
  PILOT_COMPLETE_SUBMISSION_MAX_BYTES,
  PILOT_PRIVACY_BOUNDARY,
  PILOT_REVIEW_CYCLE_ID_PATTERN,
  RELEASE_GOVERNANCE,
  canonicalStringify,
  parseStrictJsonBytes,
  preflightPilotCompleteSubmissionBytes,
  serializeUtf8Json
} from "./contract.js";
import { SEAT_ORDERS } from "./data/scenarios.js";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_PACKAGE_PAYLOAD_BYTES = 8 * 1024 * 1024;
const REFLECT_APPLY = Reflect.apply;
const DATE_GET_TIME = Date.prototype.getTime;
const DATE_TO_ISO_STRING = Date.prototype.toISOString;
const COMMON_PACKAGE_PAYLOADS = Object.freeze([
  "app.js", "contract.js", "coordinator-launch.mjs", "data/questions.js", "data/scenarios.js",
  "package.json", "return-verifier.mjs", "server.mjs", "START-HERE.txt", "START-PILOT.cmd", "styles.css"
]);

function expectedSubmissionFilename(seatId) {
  return `hakimi-bazi-pilot-seat-${seatId.toLowerCase()}-complete-submission.json`;
}

function expectedPackagePayloads(seatId) {
  return [...COMMON_PACKAGE_PAYLOADS, `seat-${seatId.toLowerCase()}.html`].sort();
}

export class PilotReturnVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PilotReturnVerificationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new PilotReturnVerificationError(code, message);
}

function exactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("SHAPE_INVALID", `${label} 结构无效。`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("SHAPE_INVALID", `${label} 字段集合无效。`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeRelativePath(value, label) {
  if (typeof value !== "string" || value.length < 1 || value.length > 240
    || value.includes("\\") || value.includes(":") || value.includes("\0") || value.startsWith("/")
    || value.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail("PATH_INVALID", `${label} 含越界、冒号形路径或非规范化语义；本检查不枚举真实 NTFS ADS。`);
  }
  return value;
}

function metadataIdentity(metadata) {
  return ["dev", "ino", "nlink", "size", "mtimeNs", "ctimeNs"]
    .map((key) => String(metadata[key]))
    .join(":");
}

function directoryIdentity(metadata) {
  return Object.freeze({ dev: metadata.dev, ino: metadata.ino });
}

function sameDirectoryIdentity(left, right) {
  return left?.dev === right?.dev && left?.ino === right?.ino;
}

async function plainDirectory(path, label) {
  let metadata;
  let canonical;
  try {
    metadata = await lstat(path, { bigint: true });
    canonical = await realpath(path);
  } catch {
    fail("DIRECTORY_ENDPOINT_INVALID", `${label} 目录端点不可用。`);
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    fail("DIRECTORY_ENDPOINT_INVALID", `${label} 必须是普通目录，不能是 symlink 或 junction。`);
  }
  return { canonical, identity: directoryIdentity(metadata) };
}

async function assertSameDirectoryEndpoint(path, expected, label) {
  const observed = await plainDirectory(path, label);
  if (observed.canonical.toLowerCase() !== expected.canonical.toLowerCase()
    || !sameDirectoryIdentity(observed.identity, expected.identity)) {
    fail("DIRECTORY_IDENTITY_CHANGED", `${label} 身份发生变化。`);
  }
}

export async function removePilotSessionProfileIfExact({
  canonicalTempRoot,
  canonicalSessionRoot,
  initialSessionIdentity,
  browserClosed,
  serverClosed
} = {}) {
  const boundary = Object.freeze({
    initialEndpointIdentityCompared: true,
    samePrivilegeConcurrentMutationExcluded: false,
    atomicRecursiveDeleteEstablished: false
  });
  if (browserClosed !== true || serverClosed !== true) {
    return Object.freeze({ removed: false, reason: "process_shutdown_unconfirmed", boundary });
  }
  if (typeof canonicalTempRoot !== "string" || typeof canonicalSessionRoot !== "string"
    || typeof initialSessionIdentity?.dev !== "bigint" || typeof initialSessionIdentity?.ino !== "bigint") {
    return Object.freeze({ removed: false, reason: "initial_identity_invalid", boundary });
  }
  let temp;
  let session;
  try {
    temp = await plainDirectory(resolve(canonicalTempRoot), "temporary root");
    session = await plainDirectory(resolve(canonicalSessionRoot), "temporary browser session");
  } catch {
    return Object.freeze({ removed: false, reason: "endpoint_unavailable", boundary });
  }
  const relation = relative(temp.canonical, session.canonical);
  if (temp.canonical.toLowerCase() !== resolve(canonicalTempRoot).toLowerCase()
    || session.canonical.toLowerCase() !== resolve(canonicalSessionRoot).toLowerCase()
    || !relation || relation.startsWith("..") || relation.includes(":")
    || !sameDirectoryIdentity(session.identity, initialSessionIdentity)) {
    return Object.freeze({ removed: false, reason: "endpoint_identity_changed", boundary });
  }
  try {
    await rm(session.canonical, { recursive: true, force: false });
  } catch {
    return Object.freeze({ removed: false, reason: "recursive_delete_failed", boundary });
  }
  try {
    await lstat(session.canonical, { bigint: true });
    return Object.freeze({ removed: false, reason: "endpoint_reappeared", boundary });
  } catch (error) {
    if (error?.code !== "ENOENT") {
      return Object.freeze({ removed: false, reason: "post_delete_state_unknown", boundary });
    }
  }
  return Object.freeze({ removed: true, reason: "exact_initial_endpoint_removed", boundary });
}

function captureObservationClock(value) {
  let milliseconds;
  let iso;
  try {
    milliseconds = REFLECT_APPLY(DATE_GET_TIME, value, []);
    iso = REFLECT_APPLY(DATE_TO_ISO_STRING, value, []);
  } catch {
    fail("CLOCK_INVALID", "本机观察时间无效。 ");
  }
  if (!Number.isFinite(milliseconds) || typeof iso !== "string") {
    fail("CLOCK_INVALID", "本机观察时间无效。 ");
  }
  return iso;
}

async function assertDirectoryChain(canonicalRoot, targetParent, label) {
  const lexicalRelation = relative(canonicalRoot, targetParent);
  if (lexicalRelation.startsWith("..") || lexicalRelation.includes(":")) fail("PATH_ESCAPE", `${label} 越过根目录。`);
  let current = canonicalRoot;
  if (lexicalRelation) {
    for (const segment of lexicalRelation.split(/[\\/]/u)) {
      current = join(current, segment);
      const endpoint = await plainDirectory(current, label);
      if (endpoint.canonical.toLowerCase() !== resolve(current).toLowerCase()) {
        fail("DIRECTORY_ENDPOINT_INVALID", `${label} 目录链发生重定向。`);
      }
    }
  }
}

async function readExactBytesFromHandle(handle, byteLength, label) {
  const bytes = Buffer.alloc(byteLength);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset);
    if (result.bytesRead === 0) break;
    offset += result.bytesRead;
  }
  if (offset !== bytes.byteLength) fail("FILE_IDENTITY_CHANGED", `${label} 读取期间身份变化。`);
  return bytes;
}

async function openStableRegularFile(canonicalRoot, relativePath, maxBytes, label) {
  const safePath = safeRelativePath(relativePath, label);
  const target = resolve(canonicalRoot, ...safePath.split("/"));
  const lexicalRelation = relative(canonicalRoot, target);
  if (!lexicalRelation || lexicalRelation.startsWith("..") || lexicalRelation.includes(":")) {
    fail("PATH_ESCAPE", `${label} 越过根目录。`);
  }
  await assertDirectoryChain(canonicalRoot, dirname(target), label);
  let before;
  let canonicalTarget;
  try {
    before = await lstat(target, { bigint: true });
    canonicalTarget = await realpath(target);
  } catch {
    fail("FILE_ENDPOINT_INVALID", `${label} 文件端点不可用。`);
  }
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || before.size <= 0n || before.size > BigInt(maxBytes)
    || canonicalTarget.toLowerCase() !== target.toLowerCase()) {
    fail("FILE_ENDPOINT_INVALID", `${label} 必须是大小受限的单链接普通文件。`);
  }
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
  let handle;
  try {
    handle = await open(target, flags);
    const heldBefore = await handle.stat({ bigint: true });
    if (!heldBefore.isFile() || heldBefore.nlink !== 1n || metadataIdentity(heldBefore) !== metadataIdentity(before)) {
      fail("FILE_IDENTITY_CHANGED", `${label} 打开前后身份变化。`);
    }
    const bytes = await readExactBytesFromHandle(handle, Number(heldBefore.size), label);
    const heldAfter = await handle.stat({ bigint: true });
    const pathAfter = await lstat(target, { bigint: true });
    const canonicalAfter = await realpath(target);
    if (metadataIdentity(heldAfter) !== metadataIdentity(heldBefore)
      || metadataIdentity(pathAfter) !== metadataIdentity(before)
      || canonicalAfter.toLowerCase() !== canonicalTarget.toLowerCase()) {
      fail("FILE_IDENTITY_CHANGED", `${label} 读取期间身份变化。`);
    }
    const initialDigest = sha256(bytes);
    let closed = false;
    return {
      bytes,
      byteLength: bytes.byteLength,
      rawSha256: initialDigest,
      async assertCurrent() {
        if (closed) fail("FILE_IDENTITY_CHANGED", `${label} held handle 已关闭。`);
        let handleBefore;
        let pathBefore;
        let canonicalBefore;
        try {
          handleBefore = await handle.stat({ bigint: true });
          pathBefore = await lstat(target, { bigint: true });
          canonicalBefore = await realpath(target);
        } catch {
          fail("FILE_IDENTITY_CHANGED", `${label} 当前端点不可用。`);
        }
        if (!handleBefore.isFile() || handleBefore.nlink !== 1n
          || !pathBefore.isFile() || pathBefore.isSymbolicLink() || pathBefore.nlink !== 1n
          || metadataIdentity(handleBefore) !== metadataIdentity(heldBefore)
          || metadataIdentity(pathBefore) !== metadataIdentity(before)
          || canonicalBefore.toLowerCase() !== canonicalTarget.toLowerCase()) {
          fail("FILE_IDENTITY_CHANGED", `${label} 当前端点身份变化。`);
        }
        const currentBytes = await readExactBytesFromHandle(handle, bytes.byteLength, label);
        const handleAfterCurrent = await handle.stat({ bigint: true });
        const pathAfterCurrent = await lstat(target, { bigint: true });
        const canonicalAfterCurrent = await realpath(target);
        if (metadataIdentity(handleAfterCurrent) !== metadataIdentity(heldBefore)
          || metadataIdentity(pathAfterCurrent) !== metadataIdentity(before)
          || canonicalAfterCurrent.toLowerCase() !== canonicalTarget.toLowerCase()
          || currentBytes.byteLength !== bytes.byteLength
          || sha256(currentBytes) !== initialDigest) {
          fail("FILE_IDENTITY_CHANGED", `${label} 当前字节或端点身份变化。`);
        }
        return true;
      },
      async close() {
        if (closed) return;
        closed = true;
        try { await handle.close(); } catch { /* preserve the primary fail-closed outcome */ }
      }
    };
  } catch (cause) {
    if (handle) {
      try { await handle.close(); } catch { /* preserve the primary fail-closed outcome */ }
    }
    if (cause instanceof PilotReturnVerificationError) throw cause;
    fail("FILE_ENDPOINT_INVALID", `${label} 文件读取失败。`);
  }
}

async function readStableRegularFile(canonicalRoot, relativePath, maxBytes, label) {
  const held = await openStableRegularFile(canonicalRoot, relativePath, maxBytes, label);
  try {
    await held.assertCurrent();
    return held.bytes;
  } finally {
    await held.close();
  }
}

function validatePackageManifest(manifest) {
  exactKeys(manifest, [
    "schemaVersion", "recordType", "packageId", "reviewCycleId", "seatId", "selectedEntry",
    "selectedOrder", "containsOppositeSeatEntry", "containsMultipleSeatOrders",
    "isolatedBrowserProfileLauncherIncluded", "defaultBrowserProfileUsedByLauncher",
    "packageLocalReturnDirectoryConfigured", "returnVerifierIncluded",
    "endToEndOpinionIndependenceEstablished", "distributionAuthorized", "countsTowardFormal2of2",
    "countsTowardExpertGate", "formalConversionAllowed", "trustedBootstrapEstablished",
    "packageAuthenticityEstablished", "pinProvenanceVerified", "signature",
    "samePrivilegeIntervalMutationExcluded", "samePackagePinFileIsTrustRoot",
    "packageLocalDirectStartAllowed", "realPersonDistributionReady", "sameCycleReplayExcluded",
    "alternateDataStreamsEnumerated", "alternateDataStreamsExcluded",
    "samePrivilegeConcurrentMutationExcluded", "atomicSessionCleanupEstablished",
    "atomicObservationWriteEstablished", "payloads"
  ], "package manifest");
  const seatId = manifest.seatId;
  if (!new Set(["A", "B"]).has(seatId)
    || manifest.schemaVersion !== "1.1.0"
    || manifest.recordType !== "bazi_expert_review_pilot_physical_seat_package_manifest_v1"
    || manifest.packageId !== `hakimi.bazi.expert-review-pilot.physical-seat-${seatId.toLowerCase()}/0.2.0`
    || !PILOT_REVIEW_CYCLE_ID_PATTERN.test(manifest.reviewCycleId)
    || manifest.selectedEntry !== `seat-${seatId.toLowerCase()}.html`
    || !Array.isArray(manifest.selectedOrder)
    || canonicalStringify(manifest.selectedOrder) !== canonicalStringify(SEAT_ORDERS[seatId])
    || manifest.containsOppositeSeatEntry !== false
    || manifest.containsMultipleSeatOrders !== false
    || manifest.isolatedBrowserProfileLauncherIncluded !== true
    || manifest.defaultBrowserProfileUsedByLauncher !== false
    || manifest.packageLocalReturnDirectoryConfigured !== true
    || manifest.returnVerifierIncluded !== true
    || manifest.endToEndOpinionIndependenceEstablished !== false
    || manifest.distributionAuthorized !== false
    || manifest.countsTowardFormal2of2 !== false
    || manifest.countsTowardExpertGate !== false
    || manifest.formalConversionAllowed !== false
    || manifest.trustedBootstrapEstablished !== false
    || manifest.packageAuthenticityEstablished !== false
    || manifest.pinProvenanceVerified !== false
    || manifest.signature !== false
    || manifest.samePrivilegeIntervalMutationExcluded !== false
    || manifest.samePackagePinFileIsTrustRoot !== false
    || manifest.packageLocalDirectStartAllowed !== false
    || manifest.realPersonDistributionReady !== false
    || manifest.sameCycleReplayExcluded !== false
    || manifest.alternateDataStreamsEnumerated !== false
    || manifest.alternateDataStreamsExcluded !== false
    || manifest.samePrivilegeConcurrentMutationExcluded !== false
    || manifest.atomicSessionCleanupEstablished !== false
    || manifest.atomicObservationWriteEstablished !== false) {
    fail("PACKAGE_MANIFEST_INVALID", "package manifest 身份或固定边界无效。 ");
  }
  if (!Array.isArray(manifest.payloads)) fail("PACKAGE_MANIFEST_INVALID", "package payloads 结构无效。 ");
  const observedPaths = [];
  for (const payload of manifest.payloads) {
    exactKeys(payload, ["path", "byteLength", "sha256"], "package payload");
    safeRelativePath(payload.path, "package payload path");
    if (!Number.isSafeInteger(payload.byteLength) || payload.byteLength <= 0
      || payload.byteLength > MAX_PACKAGE_PAYLOAD_BYTES
      || typeof payload.sha256 !== "string" || !SHA256_PATTERN.test(payload.sha256)) {
      fail("PACKAGE_MANIFEST_INVALID", "package payload 身份无效。 ");
    }
    observedPaths.push(payload.path);
  }
  const expectedPaths = expectedPackagePayloads(seatId);
  if (new Set(observedPaths).size !== observedPaths.length
    || canonicalStringify(observedPaths) !== canonicalStringify([...observedPaths].sort())
    || canonicalStringify(observedPaths) !== canonicalStringify(expectedPaths)) {
    fail("PACKAGE_MANIFEST_INVALID", "package payload 集合或排序无效。 ");
  }
  return manifest;
}

async function assertExactPackageEndpoints(canonicalRoot, manifest) {
  const expectedFiles = new Set(["package-manifest.json", ...manifest.payloads.map((entry) => entry.path)]);
  const expectedDirectories = new Set();
  for (const file of expectedFiles) {
    const segments = file.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      expectedDirectories.add(segments.slice(0, index).join("/"));
    }
  }
  const observedFiles = [];
  const visit = async (directory, prefix = "") => {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch {
      fail("PACKAGE_ENDPOINT_SET_INVALID", "package 端点集合不可读取。 ");
    }
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (relativePath === "returned-materials") {
        if (!entry.isDirectory() || entry.isSymbolicLink()) {
          fail("PACKAGE_ENDPOINT_SET_INVALID", "returned-materials 不是普通目录。 ");
        }
        const endpoint = await plainDirectory(join(directory, entry.name), "returned-materials root");
        if (dirname(endpoint.canonical).toLowerCase() !== canonicalRoot.toLowerCase()) {
          fail("PACKAGE_ENDPOINT_SET_INVALID", "returned-materials 越过 package。 ");
        }
        continue;
      }
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        if (!expectedDirectories.has(relativePath)) fail("PACKAGE_ENDPOINT_SET_INVALID", "package 含未批准目录。 ");
        const endpoint = await plainDirectory(join(directory, entry.name), "package payload directory");
        if (endpoint.canonical.toLowerCase() !== resolve(directory, entry.name).toLowerCase()) {
          fail("PACKAGE_ENDPOINT_SET_INVALID", "package payload 目录发生重定向。 ");
        }
        await visit(endpoint.canonical, relativePath);
        continue;
      }
      if (!entry.isFile() || entry.isSymbolicLink()) fail("PACKAGE_ENDPOINT_SET_INVALID", "package 含非普通文件端点。 ");
      observedFiles.push(relativePath);
    }
  };
  await visit(canonicalRoot);
  observedFiles.sort();
  const expectedSorted = [...expectedFiles].sort();
  if (canonicalStringify(observedFiles) !== canonicalStringify(expectedSorted)) {
    fail("PACKAGE_ENDPOINT_SET_INVALID", "package 文件集合与 manifest 不一致。 ");
  }
}

async function verifyPackage(packageRoot) {
  const root = await plainDirectory(resolve(packageRoot), "package root");
  if (root.canonical.toLowerCase() !== resolve(packageRoot).toLowerCase()) {
    fail("DIRECTORY_ENDPOINT_INVALID", "package root 发生重定向。 ");
  }
  const manifestBytes = await readStableRegularFile(root.canonical, "package-manifest.json", MAX_MANIFEST_BYTES, "package manifest");
  const manifest = validatePackageManifest(parseStrictJsonBytes(manifestBytes, {
    label: "package manifest",
    maxBytes: MAX_MANIFEST_BYTES
  }));
  await assertExactPackageEndpoints(root.canonical, manifest);
  for (const payload of manifest.payloads) {
    const bytes = await readStableRegularFile(root.canonical, payload.path, MAX_PACKAGE_PAYLOAD_BYTES, "package payload");
    if (bytes.byteLength !== payload.byteLength || sha256(bytes) !== payload.sha256) {
      fail("PACKAGE_PAYLOAD_DRIFT", "package payload 与 manifest 不一致。 ");
    }
  }
  await assertExactPackageEndpoints(root.canonical, manifest);
  return Object.freeze({
    canonicalRoot: root.canonical,
    manifest,
    manifestRawSha256: sha256(manifestBytes),
    manifestByteLength: manifestBytes.byteLength
  });
}

export async function inspectPilotSeatPackage(packageRoot) {
  return verifyPackage(packageRoot);
}

function buildHandoffObservation(packageResult, submissionResult, submissionBytes, localClockObservedAt) {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_handoff_observation_v1",
    recordVersion: "1.0.0",
    reviewPurpose: "pilot_usability_and_question_quality_only",
    reviewCycleId: packageResult.manifest.reviewCycleId,
    seatId: packageResult.manifest.seatId,
    localClockObservedAt,
    localClockIsTrustedTime: false,
    releaseGovernance: { ...RELEASE_GOVERNANCE },
    packageManifestArtifact: {
      byteLength: packageResult.manifestByteLength,
      rawSha256: packageResult.manifestRawSha256
    },
    submissionArtifact: {
      filename: expectedSubmissionFilename(packageResult.manifest.seatId),
      byteLength: submissionBytes.byteLength,
      rawSha256: submissionResult.completePackageRawSha256
    },
    embeddedArtifacts: submissionResult.embeddedArtifacts.map((entry) => ({ ...entry })),
    mechanicalChecks: {
      packagePayloadSetVerified: true,
      returnDirectoryEndpointVerified: true,
      heldHandleReadVerified: true,
      strictUtf8AndJsonVerified: true,
      duplicateJsonKeysRejected: true,
      exactFourEmbeddedArtifactsVerified: true,
      outerAndEmbeddedDigestsVerified: true,
      opinionSealBytesCrossLinked: true,
      seatCycleAndPackageManifestBound: true,
      partialMultipleAndMixedReturnRejected: true,
      returnFileHeldHandleMaintainedThroughObservationWrite: true,
      returnFileEndpointReverifiedBeforeAndAfterObservationWrite: true
    },
    formalBoundary: {
      formalConversionAllowed: false,
      formalRecordTypesEmitted: [],
      countsTowardFormal2of2: false,
      countsTowardExpertGate: false,
      formalAdmissionAllowed: false,
      identityVerified: false,
      credentialVerified: false,
      scopeVerified: false,
      participationConsentVerified: false,
      pairwiseIndependenceEstablished: false,
      expertTruthEstablished: false,
      expertReviewBundleComplete: false,
      realPersonDistributionReady: false
    },
    authorityBoundary: { ...PILOT_AUTHORITY_BOUNDARY },
    privacyBoundary: { ...PILOT_PRIVACY_BOUNDARY },
    authenticityBoundary: {
      digitalSignatureEstablished: false,
      authenticityEstablished: false,
      opinionAuthenticityEstablished: false,
      firstSeenEstablished: false,
      custodyEstablished: false,
      encryptedStorageEstablished: false,
      trustedTimeEstablished: false,
      trustedBootstrapEstablished: false,
      packageAuthenticityEstablished: false,
      pinProvenanceVerified: false,
      signature: false
    },
    observationBoundary: {
      endpointSnapshotOnly: true,
      crossFileAtomicSnapshot: false,
      intervalMutationExcludedAcrossFiles: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      abaExcluded: false,
      replayExcluded: false,
      sameCycleReplayExcluded: false,
      samePrivilegeIntervalMutationExcluded: false,
      alternateDataStreamsEnumerated: false,
      alternateDataStreamsExcluded: false,
      samePrivilegeConcurrentDirectoryMutationExcluded: false,
      atomicObservationWriteEstablished: false,
      atomicSessionCleanupEstablished: false,
      browserBinaryIdentityEstablished: false,
      launcherIdentityEstablished: false
    },
    safeToPublish: false
  };
  const digestDomain = "hakimi/bazi-expert-pilot/handoff-observation/v1";
  const recordDigest = createHash("sha256")
    .update(`${digestDomain}\0${canonicalStringify(unsigned)}`, "utf8")
    .digest("hex");
  return {
    ...unsigned,
    integrity: {
      hashAlgorithm: "SHA-256",
      digestDomain,
      recordDigest,
      digestIsDigitalSignature: false,
      authenticityEstablished: false
    }
  };
}

async function exactReturnEntries(canonicalReturnDirectory, expectedSubmission) {
  let entries;
  try {
    entries = await readdir(canonicalReturnDirectory, { withFileTypes: true });
  } catch {
    fail("RETURN_DIRECTORY_INVALID", "回件目录不可读取。 ");
  }
  if (entries.some((entry) => entry.name.toLowerCase().endsWith(".crdownload"))) {
    fail("PARTIAL_RETURN", "回件目录含可见的未完成下载文件。 ");
  }
  if (entries.some((entry) => entry.name.includes(":"))) {
    fail("COLON_SHAPED_RETURN_NAME", "回件目录含冒号形文件名；这不代表真实 NTFS ADS 已被枚举。 ");
  }
  if (entries.length !== 1 || entries[0].name !== expectedSubmission || !entries[0].isFile() || entries[0].isSymbolicLink()) {
    fail("RETURN_FILE_SET_INVALID", "回件目录必须只含当前席位的一个完整提交文件。 ");
  }
  return entries[0].name;
}

async function exactReturnEntriesAfterObservation(canonicalReturnDirectory, expectedSubmission, observationFilename) {
  let entries;
  try {
    entries = await readdir(canonicalReturnDirectory, { withFileTypes: true });
  } catch {
    fail("RETURN_DIRECTORY_INVALID", "回件目录不可读取。 ");
  }
  if (entries.some((entry) => entry.name.toLowerCase().endsWith(".crdownload"))) {
    fail("PARTIAL_RETURN", "回件目录含可见的未完成下载文件。 ");
  }
  if (entries.some((entry) => entry.name.includes(":"))) {
    fail("COLON_SHAPED_RETURN_NAME", "回件目录含冒号形文件名；这不代表真实 NTFS ADS 已被枚举。 ");
  }
  const expected = [expectedSubmission, observationFilename].sort();
  const observed = entries.map((entry) => entry.name).sort();
  if (entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())
    || canonicalStringify(observed) !== canonicalStringify(expected)) {
    fail("RETURN_FILE_SET_INVALID", "回件目录在观察回执写入后含非预期端点。 ");
  }
}

export async function verifyPilotReturnDirectory({
  packageRoot,
  returnDirectory,
  observationClock = new Date()
} = {}) {
  let heldSubmission = null;
  try {
    const localClockObservedAt = captureObservationClock(observationClock);
    const packageResult = await verifyPackage(packageRoot);
    const returnedRoot = await plainDirectory(join(packageResult.canonicalRoot, "returned-materials"), "returned-materials root");
    if (dirname(returnedRoot.canonical).toLowerCase() !== packageResult.canonicalRoot.toLowerCase()) {
      fail("RETURN_DIRECTORY_INVALID", "returned-materials root 不在物理单席包内。 ");
    }
    const runRoot = await plainDirectory(resolve(returnDirectory), "return run directory");
    if (dirname(runRoot.canonical).toLowerCase() !== returnedRoot.canonical.toLowerCase()
      || runRoot.canonical.toLowerCase() !== resolve(returnDirectory).toLowerCase()) {
      fail("RETURN_DIRECTORY_INVALID", "本轮回件目录不是 package-local 普通子目录。 ");
    }
    const expectedSubmission = expectedSubmissionFilename(packageResult.manifest.seatId);
    await exactReturnEntries(runRoot.canonical, expectedSubmission);
    heldSubmission = await openStableRegularFile(
      runRoot.canonical,
      expectedSubmission,
      PILOT_COMPLETE_SUBMISSION_MAX_BYTES,
      "complete submission"
    );
    const submissionBytes = heldSubmission.bytes;
    const submissionResult = await preflightPilotCompleteSubmissionBytes(submissionBytes, {
      seatId: packageResult.manifest.seatId,
      reviewCycleId: packageResult.manifest.reviewCycleId,
      packageManifestRawSha256: packageResult.manifestRawSha256
    });
    await assertSameDirectoryEndpoint(join(packageResult.canonicalRoot, "returned-materials"), returnedRoot, "returned-materials root");
    await assertSameDirectoryEndpoint(runRoot.canonical, runRoot, "return run directory");
    await exactReturnEntries(runRoot.canonical, expectedSubmission);
    await heldSubmission.assertCurrent();
    const observation = buildHandoffObservation(packageResult, submissionResult, submissionBytes, localClockObservedAt);
    const observationFilename = `hakimi-bazi-pilot-seat-${packageResult.manifest.seatId.toLowerCase()}-handoff-observation.json`;
    const observationText = serializeUtf8Json(observation);
    const observationBytes = Buffer.from(observationText, "utf8");
    await assertSameDirectoryEndpoint(join(packageResult.canonicalRoot, "returned-materials"), returnedRoot, "returned-materials root");
    await assertSameDirectoryEndpoint(runRoot.canonical, runRoot, "return run directory");
    await exactReturnEntries(runRoot.canonical, expectedSubmission);
    await heldSubmission.assertCurrent();
    const observationPath = join(runRoot.canonical, observationFilename);
    try {
      await writeFile(observationPath, observationBytes, { flag: "wx", mode: 0o600 });
    } catch {
      fail("OBSERVATION_WRITE_FAILED", "回件通过但私密观察回执未能独占写入。 ");
    }
    const written = await lstat(observationPath, { bigint: true });
    const writtenCanonical = await realpath(observationPath);
    if (!written.isFile() || written.isSymbolicLink() || written.nlink !== 1n
      || written.size !== BigInt(observationBytes.byteLength)
      || writtenCanonical.toLowerCase() !== observationPath.toLowerCase()) {
      fail("OBSERVATION_WRITE_FAILED", "私密观察回执端点无效。 ");
    }
    await assertSameDirectoryEndpoint(join(packageResult.canonicalRoot, "returned-materials"), returnedRoot, "returned-materials root");
    await assertSameDirectoryEndpoint(runRoot.canonical, runRoot, "return run directory");
    await heldSubmission.assertCurrent();
    await exactReturnEntriesAfterObservation(runRoot.canonical, expectedSubmission, observationFilename);
    const writtenBytes = await readStableRegularFile(
      runRoot.canonical,
      observationFilename,
      PILOT_COMPLETE_SUBMISSION_MAX_BYTES,
      "handoff observation"
    );
    if (writtenBytes.byteLength !== observationBytes.byteLength || sha256(writtenBytes) !== sha256(observationBytes)) {
      fail("OBSERVATION_WRITE_FAILED", "私密观察回执字节身份无效。 ");
    }
    await assertSameDirectoryEndpoint(join(packageResult.canonicalRoot, "returned-materials"), returnedRoot, "returned-materials root");
    await assertSameDirectoryEndpoint(runRoot.canonical, runRoot, "return run directory");
    await heldSubmission.assertCurrent();
    await exactReturnEntriesAfterObservation(runRoot.canonical, expectedSubmission, observationFilename);
    return Object.freeze({
      accepted: true,
      observation: Object.freeze(observation),
      observationFilename,
      countsTowardFormal2of2: false,
      countsTowardExpertGate: false,
      formalConversionAllowed: false,
      safeToPublish: false
    });
  } catch (cause) {
    if (cause instanceof PilotReturnVerificationError) throw cause;
    fail("RETURN_VERIFICATION_FAILED", "回件校验失败；现场保留，不得晋级。 ");
  } finally {
    if (heldSubmission) await heldSubmission.close();
  }
}

function option(args, name) {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1];
}

export async function runPilotReturnVerifierCli(args = process.argv.slice(2)) {
  const packageRoot = option(args, "--package-root");
  const returnDirectory = option(args, "--return-directory");
  if (!packageRoot || !returnDirectory) fail("REQUEST_INVALID", "必须提供 package root 和 return directory。 ");
  const result = await verifyPilotReturnDirectory({ packageRoot, returnDirectory });
  process.stdout.write(`PILOT_RETURN_OBSERVATION_OK ${result.observationFilename}\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    await runPilotReturnVerifierCli();
  } catch (error) {
    const code = error instanceof PilotReturnVerificationError ? error.code : "RETURN_VERIFICATION_FAILED";
    process.stderr.write(`PILOT_RETURN_OBSERVATION_REJECTED ${code}\n`);
    process.exitCode = 1;
  }
}
