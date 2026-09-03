import { createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
  SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
  createSingleBindingIntegratedSessionBinding
} from "./single-binding-integrated-contract.js";
import { SYNTHETIC_REHEARSAL_FIXTURE_REF } from "./single-binding-rehearsal-contract.js";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));
const REPOSITORY_ROOT = await realpath(resolve(SOURCE_ROOT, "../.."));
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const REVIEW_CYCLE_PATTERN = /^single-binding-synthetic-review-cycle\.[a-f0-9]{64}$/u;
const PAIR_RUN_PATTERN = /^single-binding-synthetic-pair-run\.[a-f0-9]{64}$/u;
const SEAT_SESSION_PATTERN = /^single-binding-synthetic-seat-session\.[a-f0-9]{64}$/u;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
export const SINGLE_BINDING_INTEGRATED_PHYSICAL_REVIEW_PURPOSE =
  "synthetic_single_binding_nocode_physical_package_candidate_only";

const SEAT_SHARED_SOURCE_FILES = Object.freeze([
  "single-binding-integrated-contract.js",
  "single-binding-integrated-handoff.js",
  "single-binding-integrated-json.js",
  "single-binding-integrated.css",
  "single-binding-integrated.js",
  "single-binding-rehearsal-contract.js"
]);
const COORDINATOR_SOURCE_FILES = Object.freeze([
  "single-binding-integrated-contract.js",
  "single-binding-integrated-handoff.js",
  "single-binding-integrated-json.js",
  "single-binding-integrated-pair.css",
  "single-binding-integrated-pair.html",
  "single-binding-integrated-pair.js",
  "single-binding-rehearsal-contract.js"
]);
const REQUIRED_SOURCE_FILES = Object.freeze([...new Set([
  ...SEAT_SHARED_SOURCE_FILES,
  ...COORDINATOR_SOURCE_FILES,
  "single-binding-integrated-a.html",
  "single-binding-integrated-b.html"
])].sort());

export const SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES = Object.freeze({
  pairPrecommit: "bazi_expert_single_binding_nocode_synthetic_pilot_physical_pair_precommit_v1",
  seatManifest: "bazi_expert_single_binding_nocode_synthetic_pilot_physical_seat_package_manifest_v1",
  pairManifest: "bazi_expert_single_binding_nocode_synthetic_pilot_physical_pair_manifest_v1"
});

export const SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY = Object.freeze({
  syntheticOnly: true,
  syntheticFixtureOnly: true,
  selectedBindingCount: 1,
  physicalPackageCandidateOnly: true,
  physicalExpertSurfaceReady: false,
  packageLocalExecutionAllowed: false,
  sourceCoordinatorRequired: true,
  sourceCoordinatorImplemented: false,
  inMemoryVerifiedPayloadServerImplemented: false,
  isolatedBrowserProfileLaunchImplemented: false,
  returnDirectoryVerificationImplemented: false,
  actualHumanParticipationEstablished: false,
  actualHumanIndependenceEstablished: false,
  reviewerIdentityEstablished: false,
  reviewerQualificationEstablished: false,
  reviewerConsentEstablished: false,
  opinionAuthenticityEstablished: false,
  trustedBootstrapEstablished: false,
  packageAuthenticityEstablished: false,
  pinProvenanceVerified: false,
  signatureVerified: false,
  trustedTimeEstablished: false,
  firstSeenEstablished: false,
  custodyEstablished: false,
  sameCycleReplayExcluded: false,
  samePairRunReplayExcluded: false,
  samePrivilegeIntervalMutationExcluded: false,
  samePrivilegeConcurrentMutationExcluded: false,
  alternateDataStreamsEnumerated: false,
  alternateDataStreamsExcluded: false,
  atomicSessionCleanupEstablished: false,
  physicalErasureEstablished: false,
  realExpertMaterialCollectionAuthorized: false,
  realPersonDataCollectionAuthorized: false,
  realPersonDistributionReady: false,
  distributionAuthorized: false,
  repositoryStorageAllowed: false,
  formalPurposeReused: false,
  formalRecordEmitted: false,
  pilotToFormalConversionAllowed: false,
  formalAdmissionAllowed: false,
  formalTwoOfTwoCountDelta: 0,
  expertGateCountDelta: 0,
  verifiedExpertCount: 0,
  requiredExpertCount: 2,
  frozenBindingCount: 0,
  requiredBindingCount: 12,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  releaseReady: false,
  publicReleaseAuthorized: false,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false,
  safeToPublish: false
});

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function cloneBoundary() {
  return { ...SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function compareOrdinal(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function metadataIdentity(value) {
  return [value.dev, value.ino, value.nlink, value.size, value.mtimeNs, value.ctimeNs]
    .map(String).join(":");
}

function directoryIdentity(value) {
  return `${String(value.dev)}:${String(value.ino)}`;
}

function assertOpaqueId(value, pattern, zeroPrefix, label) {
  if (typeof value !== "string" || !pattern.test(value)
    || value === `${zeroPrefix}${"0".repeat(64)}`) {
    throw new Error(`${label} 必须是非零固定前缀加 64 位小写十六进制。`);
  }
}

function assertBuildInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)
    || Object.getPrototypeOf(input) !== Object.prototype) {
    throw new Error("physical pair build input 必须是普通对象");
  }
  const inputKeys = Reflect.ownKeys(input);
  if (inputKeys.some((key) => typeof key !== "string")) {
    throw new Error("physical pair build input 含未知字段");
  }
  const inputDescriptors = Object.getOwnPropertyDescriptors(input);
  if (inputKeys.some((key) => !inputDescriptors[key].enumerable
    || inputDescriptors[key].get || inputDescriptors[key].set)) {
    throw new Error("physical pair build input 字段必须是可枚举数据属性");
  }
  const capturedInput = Object.fromEntries(inputKeys.map((key) => [key, inputDescriptors[key].value]));
  const keys = inputKeys.sort();
  const allowed = ["outputDirectory", "pairRunId", "reviewCycleId", "seatSessionNonces"];
  if (keys.some((key) => !allowed.includes(key))) throw new Error("physical pair build input 含未知字段");
  assertOpaqueId(
    capturedInput.reviewCycleId,
    REVIEW_CYCLE_PATTERN,
    "single-binding-synthetic-review-cycle.",
    "reviewCycleId"
  );
  assertOpaqueId(
    capturedInput.pairRunId,
    PAIR_RUN_PATTERN,
    "single-binding-synthetic-pair-run.",
    "pairRunId"
  );
  const nonces = capturedInput.seatSessionNonces;
  if (nonces === null || typeof nonces !== "object" || Array.isArray(nonces)
    || Object.getPrototypeOf(nonces) !== Object.prototype) {
    throw new Error("seatSessionNonces 必须精确包含 A/B");
  }
  const nonceKeys = Reflect.ownKeys(nonces);
  const nonceDescriptors = Object.getOwnPropertyDescriptors(nonces);
  if (nonceKeys.some((key) => typeof key !== "string")
    || JSON.stringify([...nonceKeys].sort()) !== JSON.stringify(["A", "B"])
    || nonceKeys.some((key) => !nonceDescriptors[key].enumerable
      || nonceDescriptors[key].get || nonceDescriptors[key].set)) {
    throw new Error("seatSessionNonces 必须精确包含可枚举 A/B 数据属性");
  }
  const capturedNonces = {
    A: nonceDescriptors.A.value,
    B: nonceDescriptors.B.value
  };
  for (const seatId of ["A", "B"]) {
    assertOpaqueId(
      capturedNonces[seatId],
      SEAT_SESSION_PATTERN,
      "single-binding-synthetic-seat-session.",
      `${seatId} seatSessionNonce`
    );
  }
  if (capturedNonces.A === capturedNonces.B) throw new Error("A/B seatSessionNonce 必须不同");
  if (capturedInput.outputDirectory !== undefined && capturedInput.outputDirectory !== null
    && (typeof capturedInput.outputDirectory !== "string" || !isAbsolute(capturedInput.outputDirectory)
      || capturedInput.outputDirectory.length > 2_000
      || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(capturedInput.outputDirectory))) {
    throw new Error("outputDirectory 必须是长度受限的绝对路径");
  }
  return {
    reviewCycleId: capturedInput.reviewCycleId,
    pairRunId: capturedInput.pairRunId,
    seatSessionNonces: capturedNonces,
    outputDirectory: capturedInput.outputDirectory ?? null
  };
}

function outsideRoot(root, canonicalPath) {
  const relation = relative(root, canonicalPath);
  return relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation);
}

function sameCanonicalPath(left, right) {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

async function createOutputRoot(explicitOutput) {
  if (explicitOutput !== null) {
    const target = resolve(explicitOutput);
    const targetParent = dirname(target);
    const canonicalParent = await realpath(targetParent);
    if (!outsideRoot(REPOSITORY_ROOT, canonicalParent)) throw new Error("physical pair 输出必须位于仓库树之外");
    const targetName = relative(canonicalParent, target);
    if (!sameCanonicalPath(canonicalParent, targetParent)
      || targetName.length < 1 || targetName.includes(":") || targetName.includes("\\")
      || targetName.includes("/") || targetName === "." || targetName === ".."
      || !sameCanonicalPath(resolve(canonicalParent, targetName), target)) {
      throw new Error("physical pair 输出父目录 identity 无效");
    }
    await mkdir(target, { recursive: false });
    const metadata = await lstat(target, { bigint: true });
    const canonical = await realpath(target);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()
      || !sameCanonicalPath(canonical, target) || !outsideRoot(REPOSITORY_ROOT, canonical)) {
      throw new Error("physical pair 输出目录端点无效");
    }
    return Object.freeze({ canonical, identity: directoryIdentity(metadata) });
  }
  const canonicalTemp = await realpath(tmpdir());
  if (!outsideRoot(REPOSITORY_ROOT, canonicalTemp)) {
    throw new Error("system temp 必须位于仓库树之外");
  }
  const created = await mkdtemp(join(canonicalTemp, "hakimi-bazi-single-binding-physical-pair-"));
  const canonical = await realpath(created);
  const metadata = await lstat(canonical, { bigint: true });
  if (!sameCanonicalPath(dirname(canonical), canonicalTemp)
    || !outsideRoot(REPOSITORY_ROOT, canonical) || !metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("system temp physical pair 输出目录无效");
  }
  return Object.freeze({ canonical, identity: directoryIdentity(metadata) });
}

function safeRelativePath(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 240
    || value.includes("\0") || value.includes("\\") || value.includes(":")
    || value.startsWith("/") || value.endsWith("/")
    || value.split("/").some((part) => part === "" || part === "." || part === ".." || part.startsWith("."))) {
    throw new Error("relative payload path 无效");
  }
  return value;
}

async function readStableSource(relativePath) {
  safeRelativePath(relativePath);
  const target = resolve(SOURCE_ROOT, ...relativePath.split("/"));
  const lexical = relative(SOURCE_ROOT, target);
  if (!lexical || lexical.startsWith("..") || lexical.includes(":")) throw new Error("source path escaped");
  const before = await lstat(target, { bigint: true });
  const canonical = await realpath(target);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || before.size <= 0n || before.size > BigInt(MAX_SOURCE_BYTES)
    || !sameCanonicalPath(canonical, target)) {
    throw new Error("source endpoint invalid");
  }
  const bytes = await readFile(canonical);
  const after = await lstat(target, { bigint: true });
  const canonicalAfter = await realpath(target);
  if (bytes.byteLength !== Number(before.size) || metadataIdentity(before) !== metadataIdentity(after)
    || !sameCanonicalPath(canonicalAfter, canonical)) {
    throw new Error("source endpoint changed during read");
  }
  return Object.freeze({
    relativePath,
    bytes,
    byteLength: bytes.byteLength,
    rawSha256: sha256(bytes),
    canonical,
    metadataIdentity: metadataIdentity(before)
  });
}

function assertLoadedIdentityAppearsInSnapshot(snapshot) {
  const decode = (path) => new TextDecoder("utf-8", { fatal: true }).decode(snapshot.get(path).bytes);
  let contractText;
  let rehearsalText;
  try {
    contractText = decode("single-binding-integrated-contract.js");
    rehearsalText = decode("single-binding-rehearsal-contract.js");
  } catch {
    throw new Error("source snapshot 必须是严格 UTF-8");
  }
  for (const value of [
    SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST
  ]) {
    if (!contractText.includes(JSON.stringify(value))) {
      throw new Error("loaded integrated identity 与 source snapshot 不一致");
    }
  }
  for (const value of Object.values(SYNTHETIC_REHEARSAL_FIXTURE_REF)) {
    if ((typeof value === "string" || typeof value === "number")
      && !rehearsalText.includes(JSON.stringify(value))) {
      throw new Error("loaded rehearsal identity 与 source snapshot 不一致");
    }
  }
}

async function captureSourceSnapshot() {
  const snapshot = new Map();
  for (const path of REQUIRED_SOURCE_FILES) snapshot.set(path, await readStableSource(path));
  assertLoadedIdentityAppearsInSnapshot(snapshot);
  return snapshot;
}

async function assertSourceSnapshotCurrent(snapshot) {
  if (!(snapshot instanceof Map) || snapshot.size !== REQUIRED_SOURCE_FILES.length) {
    throw new Error("source snapshot identity 无效");
  }
  for (const path of REQUIRED_SOURCE_FILES) {
    const expected = snapshot.get(path);
    const observed = await readStableSource(path);
    if (!expected || !sameCanonicalPath(observed.canonical, expected.canonical)
      || observed.metadataIdentity !== expected.metadataIdentity
      || observed.byteLength !== expected.byteLength
      || observed.rawSha256 !== expected.rawSha256) {
      throw new Error("source endpoint 在 physical pair 构建期间发生变化");
    }
  }
}

function assertSourceSnapshotMatchesModuleBaseline(snapshot) {
  if (!(snapshot instanceof Map) || snapshot.size !== REQUIRED_SOURCE_FILES.length) {
    throw new Error("source snapshot identity 无效");
  }
  for (const path of REQUIRED_SOURCE_FILES) {
    const baseline = MODULE_SOURCE_BASELINE.get(path);
    const observed = snapshot.get(path);
    if (!baseline || !observed
      || !sameCanonicalPath(observed.canonical, baseline.canonical)
      || observed.metadataIdentity !== baseline.metadataIdentity
      || observed.byteLength !== baseline.byteLength
      || observed.rawSha256 !== baseline.rawSha256) {
      throw new Error("source snapshot 与 builder 模块加载基线不一致；必须重启 builder");
    }
  }
}

const MODULE_SOURCE_BASELINE = await captureSourceSnapshot();

async function ensureOutputDirectory(root, relativeDirectory) {
  safeRelativePath(relativeDirectory);
  const target = resolve(root, ...relativeDirectory.split("/"));
  const lexical = relative(root, target);
  if (!lexical || lexical.startsWith("..") || lexical.includes(":")) throw new Error("output directory escaped");
  await mkdir(target, { recursive: true });
  const metadata = await lstat(target, { bigint: true });
  const canonical = await realpath(target);
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || !sameCanonicalPath(canonical, target)) {
    throw new Error("output directory endpoint invalid");
  }
  return canonical;
}

async function writePayload(root, relativePath, bytes) {
  safeRelativePath(relativePath);
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > MAX_SOURCE_BYTES) {
    throw new Error("payload bytes invalid");
  }
  const target = resolve(root, ...relativePath.split("/"));
  const lexical = relative(root, target);
  if (!lexical || lexical.startsWith("..") || lexical.includes(":")) throw new Error("output path escaped");
  const relativeParent = relativePath.split("/").slice(0, -1).join("/");
  if (relativeParent) await ensureOutputDirectory(root, relativeParent);
  const parent = dirname(target);
  if (!sameCanonicalPath(parent, root)) {
    const parentCanonical = await realpath(parent);
    if (!sameCanonicalPath(parentCanonical, parent)) throw new Error("output parent redirected");
  }
  await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
  const metadata = await lstat(target, { bigint: true });
  const canonical = await realpath(target);
  const observed = await readFile(canonical);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1n
    || !sameCanonicalPath(canonical, target)
    || metadata.size !== BigInt(bytes.byteLength)
    || observed.byteLength !== bytes.byteLength || sha256(observed) !== sha256(bytes)) {
    throw new Error("written payload endpoint invalid");
  }
  return Object.freeze({ path: relativePath.replaceAll("\\", "/"), byteLength: bytes.byteLength, sha256: sha256(bytes) });
}

async function writeAtRoot(root, filename, bytes) {
  safeRelativePath(filename);
  const target = resolve(root, filename);
  if (!sameCanonicalPath(dirname(target), root)) throw new Error("root output path invalid");
  await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
  const metadata = await lstat(target, { bigint: true });
  const canonical = await realpath(target);
  const observed = await readFile(canonical);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1n
    || !sameCanonicalPath(canonical, target) || metadata.size !== BigInt(bytes.byteLength)
    || sha256(observed) !== sha256(bytes)) {
    throw new Error("root output endpoint invalid");
  }
  return Object.freeze({ filename, byteLength: bytes.byteLength, rawSha256: sha256(bytes) });
}

async function assertRootIdentity(rootEndpoint) {
  let metadata;
  let canonical;
  try {
    metadata = await lstat(rootEndpoint.canonical, { bigint: true });
    canonical = await realpath(rootEndpoint.canonical);
  } catch {
    throw new Error("physical pair root 当前端点不可用");
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()
    || !sameCanonicalPath(canonical, rootEndpoint.canonical)
    || directoryIdentity(metadata) !== rootEndpoint.identity
    || !outsideRoot(REPOSITORY_ROOT, canonical)) {
    throw new Error("physical pair root identity 已变化");
  }
}

async function assertExactOutputTree(rootEndpoint, artifacts) {
  await assertRootIdentity(rootEndpoint);
  const expectedFiles = new Set();
  const expectedDirectories = new Set();
  for (const artifact of artifacts) {
    const path = safeRelativePath(artifact.path);
    if (expectedFiles.has(path)) throw new Error("physical pair artifact path 重复");
    expectedFiles.add(path);
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      expectedDirectories.add(parts.slice(0, index).join("/"));
    }
  }
  const observedFiles = [];
  const visit = async (directory, prefix = "") => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const target = resolve(rootEndpoint.canonical, ...path.split("/"));
      if (expectedDirectories.has(path)) {
        const metadata = await lstat(target, { bigint: true });
        const canonical = await realpath(target);
        if (!entry.isDirectory() || entry.isSymbolicLink() || !metadata.isDirectory()
          || metadata.isSymbolicLink() || !sameCanonicalPath(canonical, target)) {
          throw new Error("physical pair directory endpoint set 无效");
        }
        await visit(canonical, path);
        continue;
      }
      if (!expectedFiles.has(path) || !entry.isFile() || entry.isSymbolicLink()) {
        throw new Error("physical pair output 含未批准端点");
      }
      observedFiles.push(path);
    }
  };
  await visit(rootEndpoint.canonical);
  const observedSorted = observedFiles.sort(compareOrdinal);
  const expectedSorted = [...expectedFiles].sort(compareOrdinal);
  if (JSON.stringify(observedSorted) !== JSON.stringify(expectedSorted)) {
    throw new Error("physical pair output endpoint set 不完整");
  }
  for (const artifact of artifacts) {
    const target = resolve(rootEndpoint.canonical, ...artifact.path.split("/"));
    const before = await lstat(target, { bigint: true });
    const canonical = await realpath(target);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
      || before.size !== BigInt(artifact.byteLength)
      || !sameCanonicalPath(canonical, target)) {
      throw new Error("physical pair artifact endpoint 无效");
    }
    const bytes = await readFile(canonical);
    const after = await lstat(target, { bigint: true });
    const canonicalAfter = await realpath(target);
    if (bytes.byteLength !== artifact.byteLength || sha256(bytes) !== artifact.rawSha256
      || metadataIdentity(after) !== metadataIdentity(before)
      || !sameCanonicalPath(canonicalAfter, canonical)) {
      throw new Error("physical pair artifact 在最终复核期间发生变化");
    }
  }
  await assertRootIdentity(rootEndpoint);
}

function refusingStartCommand() {
  return Buffer.from(
    "@echo off\r\necho 本 synthetic physical 候选禁止包内直启；必须等待源码侧 verified-memory coordinator。\r\nexit /b 1\r\n",
    "utf8"
  );
}

function packageJsonBytes(name) {
  return jsonBytes({ name, version: "0.1.0", private: true, type: "module", scripts: {} });
}

function seatGuideBytes({ seatId, reviewCycleId, pairRunId, pairPrecommitRawSha256 }) {
  return Buffer.from(
    `哈基米八字单条 Binding physical synthetic 候选 · 席位 ${seatId}\r\n`
    + `reviewCycleId=${reviewCycleId}\r\npairRunId=${pairRunId}\r\npairPrecommitRawSha256=${pairPrecommitRawSha256}\r\n\r\n`
    + "本包不可直启、不可交给现实专家；当前 physicalExpertSurfaceReady=false、distributionAuthorized=false、realPersonDistributionReady=false。\r\n"
    + "协调人必须等待源码侧 verified-memory coordinator，并从包外提供 P/PM/本席 manifest pin。专家无需理解代码、JSON 或 hash。\r\n",
    "utf8"
  );
}

function pairGuideBytes({ reviewCycleId, pairRunId, pairPrecommitRawSha256, seats }) {
  return Buffer.from(
    `哈基米八字单条 Binding physical synthetic 配对候选\r\nreviewCycleId=${reviewCycleId}\r\npairRunId=${pairRunId}\r\n`
    + `pairPrecommitRawSha256=${pairPrecommitRawSha256}\r\nseatAManifestRawSha256=${seats.A.manifestRawSha256}\r\nseatBManifestRawSha256=${seats.B.manifestRawSha256}\r\n\r\n`
    + "pair manifest raw SHA-256 只由 builder 控制台作为包外 pin candidate 输出，不写回本文件以避免自哈希环。\r\n"
    + "seat-a/seat-b 必须分开处理；整个 pair root 不得交给任一专家。当前不可直启、不可真人分发、不可计入正式 2/2。\r\n",
    "utf8"
  );
}

function basePrecommit(input) {
  return {
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES.pairPrecommit,
    workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_PHYSICAL_REVIEW_PURPOSE,
    reviewCycleId: input.reviewCycleId,
    pairRunId: input.pairRunId,
    bindingId: SYNTHETIC_REHEARSAL_FIXTURE_REF.bindingId,
    bindingIdentityDigest: SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
    syntheticRehearsalManifestDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
    fixtureContentDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest,
    questionSetDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest,
    candidateDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateDigest,
    selectedBindingCount: 1,
    seats: [
      { seatId: "A", relativeDirectory: "seat-a", seatSessionNonce: input.seatSessionNonces.A },
      { seatId: "B", relativeDirectory: "seat-b", seatSessionNonce: input.seatSessionNonces.B }
    ],
    physicalSeatDirectoriesMustBeDistributedSeparately: true,
    boundary: cloneBoundary()
  };
}

async function buildSeat(root, seatId, input, pairPrecommitRawSha256, sourceSnapshot) {
  const directoryName = `seat-${seatId.toLowerCase()}`;
  const seatRoot = await ensureOutputDirectory(root, directoryName);
  const entry = `single-binding-integrated-${seatId.toLowerCase()}.html`;
  const payloads = [];
  for (const path of [...SEAT_SHARED_SOURCE_FILES, entry].sort()) {
    payloads.push(await writePayload(seatRoot, path, sourceSnapshot.get(path).bytes));
  }
  payloads.push(await writePayload(seatRoot, "START-PILOT.cmd", refusingStartCommand()));
  payloads.push(await writePayload(seatRoot, "START-HERE.txt", seatGuideBytes({
    seatId,
    reviewCycleId: input.reviewCycleId,
    pairRunId: input.pairRunId,
    pairPrecommitRawSha256
  })));
  payloads.push(await writePayload(
    seatRoot,
    "package.json",
    packageJsonBytes(`hakimi-bazi-single-binding-physical-synthetic-seat-${seatId.toLowerCase()}`)
  ));
  payloads.sort((left, right) => compareOrdinal(left.path, right.path));
  const manifest = {
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES.seatManifest,
    workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_PHYSICAL_REVIEW_PURPOSE,
    packageId: `hakimi.bazi.expert-single-binding.physical-synthetic-seat-${seatId.toLowerCase()}/1.0.0`,
    reviewCycleId: input.reviewCycleId,
    pairRunId: input.pairRunId,
    seatId,
    seatSessionNonce: input.seatSessionNonces[seatId],
    pairPrecommitRawSha256,
    selectedEntry: entry,
    containsOppositeSeatEntry: false,
    physicalExpertSurfaceReady: false,
    packageLocalExecutionAllowed: false,
    sourceCoordinatorRequired: true,
    payloads,
    boundary: cloneBoundary()
  };
  const manifestArtifact = await writeAtRoot(seatRoot, "package-manifest.json", jsonBytes(manifest));
  return deepFreeze({
    seatId,
    relativeDirectory: directoryName,
    outputDirectory: seatRoot,
    manifest,
    manifestFilename: manifestArtifact.filename,
    manifestByteLength: manifestArtifact.byteLength,
    manifestRawSha256: manifestArtifact.rawSha256,
    files: [...payloads.map((entryValue) => entryValue.path), manifestArtifact.filename].sort(compareOrdinal)
  });
}

async function buildCoordinator(root, input, pairPrecommitRawSha256, seats, sourceSnapshot) {
  const coordinatorRoot = await ensureOutputDirectory(root, "coordinator");
  const payloads = [];
  for (const path of COORDINATOR_SOURCE_FILES) {
    payloads.push(await writePayload(coordinatorRoot, path, sourceSnapshot.get(path).bytes));
  }
  payloads.push(await writePayload(coordinatorRoot, "START-PAIR.cmd", refusingStartCommand()));
  payloads.push(await writePayload(coordinatorRoot, "START-HERE.txt", pairGuideBytes({
    reviewCycleId: input.reviewCycleId,
    pairRunId: input.pairRunId,
    pairPrecommitRawSha256,
    seats
  })));
  payloads.push(await writePayload(
    coordinatorRoot,
    "package.json",
    packageJsonBytes("hakimi-bazi-single-binding-physical-synthetic-coordinator")
  ));
  payloads.sort((left, right) => compareOrdinal(left.path, right.path));
  return deepFreeze({ outputDirectory: coordinatorRoot, payloads });
}

export function createSingleBindingIntegratedPhysicalIds() {
  return deepFreeze({
    reviewCycleId: `single-binding-synthetic-review-cycle.${randomBytes(32).toString("hex")}`,
    pairRunId: `single-binding-synthetic-pair-run.${randomBytes(32).toString("hex")}`,
    seatSessionNonces: {
      A: `single-binding-synthetic-seat-session.${randomBytes(32).toString("hex")}`,
      B: `single-binding-synthetic-seat-session.${randomBytes(32).toString("hex")}`
    }
  });
}

export async function buildSingleBindingIntegratedPhysicalPairCandidate(input = {}) {
  const normalized = assertBuildInput(input);
  const sourceSnapshot = await captureSourceSnapshot();
  assertSourceSnapshotMatchesModuleBaseline(sourceSnapshot);
  const outputRoot = await createOutputRoot(normalized.outputDirectory);
  const outputDirectory = outputRoot.canonical;
  const pairPrecommit = basePrecommit(normalized);
  const pairPrecommitArtifact = await writeAtRoot(outputDirectory, "pair-precommit.json", jsonBytes(pairPrecommit));
  const seatA = await buildSeat(
    outputDirectory,
    "A",
    normalized,
    pairPrecommitArtifact.rawSha256,
    sourceSnapshot
  );
  const seatB = await buildSeat(
    outputDirectory,
    "B",
    normalized,
    pairPrecommitArtifact.rawSha256,
    sourceSnapshot
  );
  const seats = { A: seatA, B: seatB };
  const coordinator = await buildCoordinator(
    outputDirectory,
    normalized,
    pairPrecommitArtifact.rawSha256,
    seats,
    sourceSnapshot
  );
  const pairGuideArtifact = await writeAtRoot(outputDirectory, "PAIR-START-HERE.txt", pairGuideBytes({
    reviewCycleId: normalized.reviewCycleId,
    pairRunId: normalized.pairRunId,
    pairPrecommitRawSha256: pairPrecommitArtifact.rawSha256,
    seats
  }));
  const pairManifest = {
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES.pairManifest,
    workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_PHYSICAL_REVIEW_PURPOSE,
    pairId: "hakimi.bazi.expert-single-binding.physical-synthetic-pair/1.0.0",
    reviewCycleId: normalized.reviewCycleId,
    pairRunId: normalized.pairRunId,
    pairPrecommitArtifact: {
      filename: pairPrecommitArtifact.filename,
      byteLength: pairPrecommitArtifact.byteLength,
      rawSha256: pairPrecommitArtifact.rawSha256
    },
    pairGuideArtifact: {
      filename: pairGuideArtifact.filename,
      byteLength: pairGuideArtifact.byteLength,
      rawSha256: pairGuideArtifact.rawSha256
    },
    seatPackages: [seatA, seatB].map((seat) => ({
      seatId: seat.seatId,
      relativeDirectory: seat.relativeDirectory,
      seatSessionNonce: normalized.seatSessionNonces[seat.seatId],
      manifestFilename: seat.manifestFilename,
      manifestByteLength: seat.manifestByteLength,
      manifestRawSha256: seat.manifestRawSha256
    })),
    coordinatorRelativeDirectory: "coordinator",
    coordinatorPayloads: coordinator.payloads.map((entry) => ({ ...entry })),
    physicalSeatDirectoriesMustBeDistributedSeparately: true,
    boundary: cloneBoundary()
  };
  const pairManifestArtifact = await writeAtRoot(outputDirectory, "pair-manifest.json", jsonBytes(pairManifest));
  const runtimeSessionBindings = {};
  for (const seat of [seatA, seatB]) {
    runtimeSessionBindings[seat.seatId] = createSingleBindingIntegratedSessionBinding({
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_single_binding_nocode_synthetic_pilot_session_binding_v1",
      workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
      bindingMode: "physical_synthetic_single_binding_pair",
      reviewCycleId: normalized.reviewCycleId,
      pairRunId: normalized.pairRunId,
      seatId: seat.seatId,
      seatSessionNonce: normalized.seatSessionNonces[seat.seatId],
      pairPrecommitRawSha256: pairPrecommitArtifact.rawSha256,
      pairManifestRawSha256: pairManifestArtifact.rawSha256,
      seatPackageManifestRawSha256: seat.manifestRawSha256,
      syntheticRehearsalManifestDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
      fixtureContentDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest,
      questionSetDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest,
      candidateDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateDigest,
      bindingId: SYNTHETIC_REHEARSAL_FIXTURE_REF.bindingId,
      bindingIdentityDigest: SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
      selectedBindingCount: 1
    });
  }
  await assertSourceSnapshotCurrent(sourceSnapshot);
  await assertExactOutputTree(outputRoot, [
    {
      path: pairPrecommitArtifact.filename,
      byteLength: pairPrecommitArtifact.byteLength,
      rawSha256: pairPrecommitArtifact.rawSha256
    },
    {
      path: pairManifestArtifact.filename,
      byteLength: pairManifestArtifact.byteLength,
      rawSha256: pairManifestArtifact.rawSha256
    },
    {
      path: pairGuideArtifact.filename,
      byteLength: pairGuideArtifact.byteLength,
      rawSha256: pairGuideArtifact.rawSha256
    },
    ...[seatA, seatB].flatMap((seat) => [
      {
        path: `${seat.relativeDirectory}/${seat.manifestFilename}`,
        byteLength: seat.manifestByteLength,
        rawSha256: seat.manifestRawSha256
      },
      ...seat.manifest.payloads.map((entry) => ({
        path: `${seat.relativeDirectory}/${entry.path}`,
        byteLength: entry.byteLength,
        rawSha256: entry.sha256
      }))
    ]),
    ...coordinator.payloads.map((entry) => ({
      path: `coordinator/${entry.path}`,
      byteLength: entry.byteLength,
      rawSha256: entry.sha256
    }))
  ]);
  return deepFreeze({
    outputDirectory,
    reviewCycleId: normalized.reviewCycleId,
    pairRunId: normalized.pairRunId,
    pairPrecommit,
    pairPrecommitRawSha256: pairPrecommitArtifact.rawSha256,
    pairManifest,
    pairManifestRawSha256: pairManifestArtifact.rawSha256,
    pairGuideArtifact,
    seatA,
    seatB,
    coordinator,
    runtimeSessionBindings,
    boundary: cloneBoundary()
  });
}

function parseCli(args) {
  if (!Array.isArray(args)) throw new Error("CLI args invalid");
  const allowedFlags = new Set(["--new-session"]);
  const allowedOptions = new Set([
    "--output", "--review-cycle", "--pair-run", "--seat-a-nonce", "--seat-b-nonce"
  ]);
  const values = {};
  let newSession = false;
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (allowedFlags.has(token)) {
      if (newSession) throw new Error("CLI flag duplicate");
      newSession = true;
      continue;
    }
    if (!allowedOptions.has(token) || Object.hasOwn(values, token)) throw new Error("CLI option invalid");
    const value = args[index + 1];
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw new Error("CLI option value invalid");
    }
    values[token] = value;
    index += 1;
  }
  if (newSession) {
    if (["--review-cycle", "--pair-run", "--seat-a-nonce", "--seat-b-nonce"]
      .some((key) => Object.hasOwn(values, key))) {
      throw new Error("--new-session cannot combine with explicit ids");
    }
    const ids = createSingleBindingIntegratedPhysicalIds();
    return { ...ids, ...(values["--output"] ? { outputDirectory: values["--output"] } : {}) };
  }
  for (const key of ["--review-cycle", "--pair-run", "--seat-a-nonce", "--seat-b-nonce"]) {
    if (!Object.hasOwn(values, key)) throw new Error("explicit CLI ids incomplete");
  }
  return {
    reviewCycleId: values["--review-cycle"],
    pairRunId: values["--pair-run"],
    seatSessionNonces: { A: values["--seat-a-nonce"], B: values["--seat-b-nonce"] },
    ...(values["--output"] ? { outputDirectory: values["--output"] } : {})
  };
}

export async function runSingleBindingIntegratedPhysicalPackageBuilderCli(args = process.argv.slice(2)) {
  const result = await buildSingleBindingIntegratedPhysicalPairCandidate(parseCli(args));
  process.stdout.write(`${JSON.stringify({
    kind: "single_binding_integrated_physical_build_output_candidate",
    outputDirectory: result.outputDirectory,
    reviewCycleId: result.reviewCycleId,
    pairRunId: result.pairRunId,
    pins: {
      P: result.pairPrecommitRawSha256,
      SA: result.seatA.manifestRawSha256,
      SB: result.seatB.manifestRawSha256,
      PM: result.pairManifestRawSha256
    },
    boundary: {
      pinProvenanceVerified: false,
      signatureVerified: false,
      trustedBootstrapEstablished: false,
      distributionAuthorized: false,
      realPersonDistributionReady: false
    }
  })}\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    await runSingleBindingIntegratedPhysicalPackageBuilderCli();
  } catch {
    process.stderr.write("SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BUILD_REJECTED\n");
    process.exitCode = 1;
  }
}
