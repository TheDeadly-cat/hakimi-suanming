import {
  generateKeyPairSync,
  randomBytes
} from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  realpath
} from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  computeSwAbRuntimeCollectorChainGenesisDigest,
  computeSwAbRuntimeCollectorIssuanceIdentityBaseDigest,
  computeSwAbRuntimeCollectorMarkerDigest,
  computeSwAbRuntimeCollectorMarkerStatementDigest,
  computeSwAbRuntimeCollectorReceiptDigest,
  computeSwAbRuntimeCollectorReceiptStatementDigest,
  computeSwAbRuntimeCollectorTupleIssuanceDigest,
  failSwAbRuntimeCollectorIssuance,
  immutableSwAbRuntimeCollectorIssuanceSnapshot,
  parseSwAbRuntimeCollectorIssuanceJsonBytes,
  signSwAbRuntimeCollectorDigest,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MECHANICAL_CHECKS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MUTATION_BOUNDARY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS,
  validateSwAbRuntimeCollectorAttemptMarker,
  validateSwAbRuntimeCollectorIssuancePolicy,
  validateSwAbRuntimeCollectorIssuanceReceipt
} from "./sw-ab-update-runtime-collector-issuance-lib.mjs";
import {
  compileSwAbUpdateRuntimeCollectorIssuanceSchema
} from "./sw-ab-update-runtime-collector-issuance-schema.mjs";
import {
  computeSwAbUpdateRuntimeApiTranscriptRecordDigest,
  parseSwAbUpdateRuntimeApiTranscriptJsonBytes,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
  validateSwAbUpdateRuntimeApiTranscriptTuple
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  compileSwAbUpdateRuntimeApiTranscriptSchema
} from "./sw-ab-update-runtime-api-transcript-schema.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-loader.mjs";
import {
  writeSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-writer.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  captureSwAbUpdateRuntimeCollectorDecodedObservationFromPage,
  consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope
} from "./sw-ab-update-runtime-collector-live-adapter.mjs";

const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_MARKER_BYTES = 1024 * 1024;
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
const MAX_DECODED_GRAPH_DEPTH = 64;
const MAX_DECODED_GRAPH_NODES = 100_000;
const ORIGIN_PATTERN =
  /^https:\/\/[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?(?::[0-9]{1,5})?$/u;

const SESSION_STATES = new WeakMap();
const ACTIVE_SESSIONS = new WeakSet();
const RESERVATION_STATES = new WeakMap();
const ACTIVE_RESERVATIONS = new WeakSet();
const CONSUMED_RESERVATIONS = new WeakSet();

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function requireCondition(condition, code, stage, message) {
  if (!condition) failSwAbRuntimeCollectorIssuance(code, stage, message);
}

function randomIdentifier(prefix, used = null) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const value = `${prefix}-${randomBytes(32).toString("hex")}`;
    if (used === null || !used.has(value)) {
      used?.add(value);
      return value;
    }
  }
  failSwAbRuntimeCollectorIssuance(
    "NONCE_REUSED",
    "identity",
    `Could not allocate one unique ${prefix} identifier.`
  );
}

function canonicalTimestamp(milliseconds = Date.now()) {
  return new Date(milliseconds).toISOString();
}

function ownDataRecord(value, expectedKeys, label) {
  requireCondition(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "INPUT_INVALID",
    "arguments",
    `${label} must be one plain own-data object.`
  );
  const prototype = Object.getPrototypeOf(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors);
  requireCondition(
    (prototype === Object.prototype || prototype === null)
      && Object.getOwnPropertySymbols(value).length === 0
      && exactJson(keys.sort(), [...expectedKeys].sort())
      && expectedKeys.every((key) => {
        const descriptor = descriptors[key];
        return descriptor !== undefined
          && Object.hasOwn(descriptor, "value")
          && descriptor.enumerable === true;
      }),
    "INPUT_INVALID",
    "arguments",
    `${label} must expose exactly the required enumerable own data fields without accessors.`
  );
  return descriptors;
}

function cloneOwnJsonData(value, label, context, depth = 0) {
  requireCondition(
    depth <= MAX_DECODED_GRAPH_DEPTH && context.nodes < MAX_DECODED_GRAPH_NODES,
    "INPUT_INVALID",
    "arguments",
    `${label} exceeds the decoded JSON graph bound.`
  );
  context.nodes += 1;
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    requireCondition(
      Number.isFinite(value),
      "INPUT_INVALID",
      "arguments",
      `${label} contains a non-finite number.`
    );
    return value;
  }
  requireCondition(
    typeof value === "object",
    "INPUT_INVALID",
    "arguments",
    `${label} contains a non-JSON value.`
  );
  requireCondition(
    !context.ancestors.has(value),
    "INPUT_INVALID",
    "arguments",
    `${label} contains a cycle.`
  );
  context.ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const names = Object.getOwnPropertyNames(value);
      const expectedNames = [
        ...Array.from({ length: value.length }, (_, index) => String(index)),
        "length"
      ];
      requireCondition(
        Object.getPrototypeOf(value) === Array.prototype
          && Object.getOwnPropertySymbols(value).length === 0
          && exactJson(names.sort(), expectedNames.sort())
          && expectedNames.every((name) => {
            const descriptor = descriptors[name];
            return descriptor !== undefined && Object.hasOwn(descriptor, "value");
          }),
        "INPUT_INVALID",
        "arguments",
        `${label} contains an accessor, sparse slot, or extra array property.`
      );
      return Array.from({ length: value.length }, (_, index) =>
        cloneOwnJsonData(descriptors[String(index)].value, `${label}[${index}]`, context, depth + 1)
      );
    }
    const prototype = Object.getPrototypeOf(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const names = Object.getOwnPropertyNames(value);
    requireCondition(
      (prototype === Object.prototype || prototype === null)
        && Object.getOwnPropertySymbols(value).length === 0
        && names.every((name) => {
          const descriptor = descriptors[name];
          return descriptor !== undefined
            && Object.hasOwn(descriptor, "value")
            && descriptor.enumerable === true;
        }),
      "INPUT_INVALID",
      "arguments",
      `${label} contains an accessor, symbol, non-enumerable field, or non-plain object.`
    );
    const result = Object.create(null);
    for (const name of names) {
      Object.defineProperty(result, name, {
        value: cloneOwnJsonData(descriptors[name].value, `${label}.${name}`, context, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return result;
  } finally {
    context.ancestors.delete(value);
  }
}

function cloneDecodedObservation(rawObservation) {
  const expectedKeys = [
    "pageUrlBefore",
    "pageUrlAfter",
    "cdpPreChallengeResponse",
    "cdpPostChallengeResponse",
    "serviceWorkerChallengeResponse"
  ];
  const descriptors = ownDataRecord(rawObservation, expectedKeys, "decodedObservation");
  const context = { ancestors: new WeakSet(), nodes: 0 };
  return Object.freeze(Object.fromEntries(expectedKeys.map((key) => [
    key,
    cloneOwnJsonData(descriptors[key].value, `decodedObservation.${key}`, context)
  ])));
}

function cloneLiveCaptureTimeline(rawTimeline) {
  const expectedKeys = [
    "startedAt",
    "sessionCreatedAt",
    "preRequestStartedAt",
    "preResponseReceivedAt",
    "challengeRequestStartedAt",
    "challengeResponseReceivedAt",
    "postRequestStartedAt",
    "postResponseReceivedAt",
    "sessionDetachedAt",
    "completedAt"
  ];
  const descriptors = ownDataRecord(rawTimeline, expectedKeys, "liveCaptureTimeline");
  requireCondition(
    expectedKeys.every((key) => typeof descriptors[key].value === "string"),
    "INPUT_INVALID",
    "completion",
    "Live capture timeline must contain only canonical timestamp strings."
  );
  const context = { ancestors: new WeakSet(), nodes: 0 };
  return Object.freeze(Object.fromEntries(expectedKeys.map((key) => [
    key,
    cloneOwnJsonData(descriptors[key].value, `liveCaptureTimeline.${key}`, context)
  ])));
}

function relativeWithin(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    (!allowEqual && relative === "")
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    failSwAbRuntimeCollectorIssuance(
      "PATH_OUTSIDE_ROOT",
      "filesystem",
      `${label} escapes its required root.`
    );
  }
  return relative.replaceAll("\\", "/");
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

function sameDirectoryIdentity(left, right) {
  return sameFileIdentity(left.stat, right.stat)
    && comparablePath(left.realPath) === comparablePath(right.realPath);
}

async function captureRealDirectory(directoryPath, requiredRoot, label) {
  const stat = await lstat(directoryPath, { bigint: true });
  const resolved = await realpath(directoryPath);
  requireCondition(
    stat.isDirectory()
      && !stat.isSymbolicLink()
      && comparablePath(resolved) === comparablePath(directoryPath),
    "ROOT_NOT_FRESH",
    "filesystem",
    `${label} must be one real, non-symbolic directory.`
  );
  relativeWithin(requiredRoot, resolved, `${label} physical path`, { allowEqual: true });
  return Object.freeze({ stat, realPath: resolved });
}

async function prepareFreshRunRoot(cwd, runRoot) {
  requireCondition(
    typeof cwd === "string"
      && path.isAbsolute(cwd)
      && path.resolve(cwd) === cwd
      && comparablePath(cwd) === comparablePath(process.cwd())
      && typeof runRoot === "string"
      && path.isAbsolute(runRoot)
      && path.resolve(runRoot) === runRoot
      && !runRoot.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === ".."),
    "INPUT_INVALID",
    "arguments",
    "cwd and runRoot must be explicit absolute paths, and cwd must equal process.cwd()."
  );
  const resolvedCwd = path.resolve(cwd);
  const cwdDirectory = await captureRealDirectory(resolvedCwd, resolvedCwd, "Collector cwd");
  const tmpRoot = path.join(resolvedCwd, "tmp");
  const tmpDirectory = await captureRealDirectory(tmpRoot, resolvedCwd, "Collector tmp root");
  relativeWithin(cwdDirectory.realPath, tmpDirectory.realPath, "Collector tmp root physical path");
  const resolvedRunRoot = path.resolve(runRoot);
  relativeWithin(tmpRoot, resolvedRunRoot, "Collector run root");
  const parent = path.dirname(resolvedRunRoot);
  const parentDirectory = await captureRealDirectory(parent, tmpRoot, "Collector run-root parent");
  relativeWithin(tmpDirectory.realPath, parentDirectory.realPath, "Collector run-root parent physical path", {
    allowEqual: true
  });
  try {
    await lstat(resolvedRunRoot);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(resolvedRunRoot, { recursive: false, mode: 0o700 });
    const created = await captureRealDirectory(resolvedRunRoot, tmpRoot, "Fresh collector run root");
    const entries = await readdir(resolvedRunRoot);
    requireCondition(
      entries.length === 0,
      "ROOT_NOT_FRESH",
      "filesystem",
      "Fresh collector run root is not empty after exclusive creation."
    );
    return Object.freeze({ cwd: resolvedCwd, runRoot: resolvedRunRoot, identity: created });
  }
  failSwAbRuntimeCollectorIssuance(
    "ROOT_NOT_FRESH",
    "filesystem",
    "Collector run root already exists; overwrite and reuse are forbidden."
  );
}

async function readOpenedFileAtZero(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.length) {
    const { bytesRead } = await handle.read(target, offset, target.length - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

function fileIdentityProjection(stat, resolvedPath) {
  return Object.freeze({
    realPath: comparablePath(resolvedPath),
    dev: String(stat.dev),
    ino: String(stat.ino),
    birthtimeNs: String(stat.birthtimeNs),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
    nlink: String(stat.nlink)
  });
}

async function writeHeldExclusiveFile(filePath, bytes, label) {
  const handle = await open(filePath, "wx+", 0o600);
  try {
    const [handleBefore, pathBefore, resolvedBefore] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    requireCondition(
      handleBefore.isFile()
        && pathBefore.isFile()
        && !pathBefore.isSymbolicLink()
        && handleBefore.nlink === 1n
        && pathBefore.nlink === 1n
        && handleBefore.size === 0n
        && sameFileIdentity(handleBefore, pathBefore)
        && comparablePath(resolvedBefore) === comparablePath(filePath),
      "FILE_INVALID",
      "filesystem",
      `${label} is not the exclusive single-link file opened by this writer.`
    );
    await handle.writeFile(bytes);
    await handle.sync();
    const persisted = await readOpenedFileAtZero(handle, bytes.length);
    const [handleAfter, pathAfter, resolvedAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(filePath, { bigint: true }),
      realpath(filePath)
    ]);
    requireCondition(
      persisted.equals(bytes)
        && bytes.length === Number(handleAfter.size)
        && sameFileIdentity(handleBefore, handleAfter)
        && sameFileIdentity(handleAfter, pathAfter)
        && handleAfter.nlink === 1n
        && pathAfter.nlink === 1n
        && !pathAfter.isSymbolicLink()
        && comparablePath(resolvedBefore) === comparablePath(resolvedAfter),
      "FILE_INVALID",
      "filesystem",
      `${label} bytes or identity changed during exclusive publication.`
    );
    return Object.freeze({
      handle,
      bytes,
      binding: Object.freeze({
        path: path.basename(filePath),
        size: bytes.length,
        sha256: sha256(bytes)
      }),
      identity: fileIdentityProjection(handleAfter, resolvedAfter)
    });
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }
}

async function revalidateHeldFile(held, filePath, label) {
  const [handleStat, pathStat, resolved] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(filePath, { bigint: true }),
    realpath(filePath)
  ]);
  const bytes = await readOpenedFileAtZero(held.handle, Number(handleStat.size));
  const after = await held.handle.stat({ bigint: true });
  requireCondition(
    sameFileIdentity(handleStat, after)
      && sameFileIdentity(after, pathStat)
      && after.isFile()
      && pathStat.isFile()
      && !pathStat.isSymbolicLink()
      && after.nlink === 1n
      && pathStat.nlink === 1n
      && bytes.equals(held.bytes)
      && sha256(bytes) === held.binding.sha256
      && exactJson(fileIdentityProjection(after, resolved), held.identity),
    "MARKER_CHANGED",
    "mutation",
    `${label} changed while its original file handle remained held.`
  );
  return held;
}

function jsonBytes(value, maximumSize, label) {
  const bytes = Buffer.from(`${canonicalJson(value)}\n`, "utf8");
  requireCondition(
    bytes.length > 1 && bytes.length <= maximumSize,
    "FILE_INVALID",
    "filesystem",
    `${label} exceeds its fixed serialized byte bound.`
  );
  return bytes;
}

async function readCheckedSource(cwd, requirement) {
  const absolutePath = path.resolve(cwd, ...requirement.path.split("/"));
  relativeWithin(cwd, absolutePath, `${requirement.role} source`);
  const before = await lstat(absolutePath, { bigint: true });
  const resolvedBefore = await realpath(absolutePath);
  requireCondition(
    before.isFile()
      && !before.isSymbolicLink()
      && before.nlink === 1n
      && before.size > 0n
      && before.size <= BigInt(MAX_SOURCE_BYTES),
    "SOURCE_BINDING_MISMATCH",
    "source",
    `${requirement.role} is not one bounded regular single-link source file.`
  );
  relativeWithin(cwd, resolvedBefore, `${requirement.role} physical source`);
  const bytes = await readFile(absolutePath);
  const after = await lstat(absolutePath, { bigint: true });
  const resolvedAfter = await realpath(absolutePath);
  requireCondition(
    sameFileIdentity(before, after)
      && before.size === after.size
      && before.mtimeNs === after.mtimeNs
      && before.ctimeNs === after.ctimeNs
      && bytes.length === Number(after.size)
      && comparablePath(resolvedBefore) === comparablePath(resolvedAfter),
    "SOURCE_BINDING_MISMATCH",
    "source",
    `${requirement.role} changed during its source read.`
  );
  const value = parseSwAbRuntimeCollectorIssuanceJsonBytes(bytes, requirement.role);
  return Object.freeze({
    value,
    binding: Object.freeze({
      role: requirement.role,
      path: requirement.path,
      size: bytes.length,
      rawSha256: sha256(bytes),
      canonicalSha256: sha256(canonicalJson(value))
    }),
    identity: fileIdentityProjection(after, resolvedAfter)
  });
}

async function loadCheckedContractSources(cwd) {
  const sources = await Promise.all(
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS.map((requirement) =>
      readCheckedSource(cwd, requirement)
    )
  );
  const realPaths = sources.map((entry) => entry.identity.realPath);
  const inodeKeys = sources.map((entry) =>
    `${entry.identity.dev}\0${entry.identity.ino}\0${entry.identity.birthtimeNs}`
  );
  requireCondition(
    new Set(realPaths).size === sources.length && new Set(inodeKeys).size === sources.length,
    "PHYSICAL_ALIAS",
    "source",
    "Collector issuance contract sources must be physically distinct."
  );
  const policy = sources[0].value;
  validateSwAbRuntimeCollectorIssuancePolicy(policy);
  const schemaValidator = compileSwAbUpdateRuntimeCollectorIssuanceSchema(sources[1].value);
  const transcriptSchemaValidator = compileSwAbUpdateRuntimeApiTranscriptSchema(sources[3].value);
  return Object.freeze({
    policy,
    schemaValidator,
    transcriptSchemaValidator,
    bindings: Object.freeze(sources.map((entry) => entry.binding)),
    identities: Object.freeze(sources.map((entry) => entry.identity))
  });
}

function canonicalExchange(requestStartedAt, responseReceivedAt, request, response) {
  return Object.freeze({
    requestStartedAt,
    responseReceivedAt,
    request,
    response,
    canonicalRequestSha256: sha256(canonicalJson(request)),
    canonicalResponseSha256: sha256(canonicalJson(response))
  });
}

function sessionState(session) {
  const state = SESSION_STATES.get(session);
  requireCondition(
    state !== undefined && ACTIVE_SESSIONS.has(session) && state.invalidated !== true,
    "CAPSULE_NOT_ISSUED",
    "session",
    "Collector session was not issued here or is no longer active."
  );
  return state;
}

function enterSessionOperation(state, operation) {
  requireCondition(
    state.activeOperation === null,
    "CAPSULE_REUSED",
    "session",
    `Collector session already has an in-flight ${state.activeOperation ?? "unknown"} operation.`
  );
  state.activeOperation = operation;
}

function leaveSessionOperation(state, operation) {
  if (state.activeOperation === operation) state.activeOperation = null;
}

async function invalidateSession(session, state) {
  if (!state || state.invalidated) return;
  state.invalidated = true;
  ACTIVE_SESSIONS.delete(session);
  SESSION_STATES.delete(session);
  if (state.pendingReservation !== null) {
    ACTIVE_RESERVATIONS.delete(state.pendingReservation);
    CONSUMED_RESERVATIONS.add(state.pendingReservation);
    RESERVATION_STATES.delete(state.pendingReservation);
    state.pendingReservation = null;
  }
  state.privateKey = null;
  const handles = [state.receiptHeld?.handle, state.markerHeld?.handle].filter(Boolean);
  state.receiptHeld = null;
  state.markerHeld = null;
  await Promise.all(handles.map((handle) => handle.close().catch(() => {})));
}

async function invalidateAndRethrow(session, state, error) {
  await invalidateSession(session, state);
  throw error;
}

export async function beginSwAbUpdateRuntimeCollectorIssuance(rawInput) {
  const descriptors = ownDataRecord(
    rawInput,
    ["cwd", "runRoot", "origin", "artifactBindings"],
    "collector issuance begin input"
  );
  const cwd = descriptors.cwd.value;
  const runRoot = descriptors.runRoot.value;
  const origin = descriptors.origin.value;
  requireCondition(
    typeof cwd === "string"
      && path.isAbsolute(cwd)
      && path.resolve(cwd) === cwd
      && comparablePath(cwd) === comparablePath(process.cwd())
      && typeof runRoot === "string"
      && path.isAbsolute(runRoot)
      && path.resolve(runRoot) === runRoot
      && !runRoot.replaceAll("\\", "/").split("/").some((segment) => segment === "." || segment === ".."),
    "INPUT_INVALID",
    "arguments",
    "cwd and runRoot must be explicit absolute paths, and cwd must equal process.cwd()."
  );
  requireCondition(
    typeof origin === "string"
      && origin.length >= 10
      && origin.length <= 256
      && ORIGIN_PATTERN.test(origin),
    "INPUT_INVALID",
    "arguments",
    "origin must be one exact HTTPS origin without a path."
  );
  const artifactBindings = cloneOwnJsonData(
    descriptors.artifactBindings.value,
    "collector issuance artifactBindings",
    { ancestors: new WeakSet(), nodes: 0 }
  );
  const sources = await loadCheckedContractSources(cwd);
  let markerHeld = null;
  try {
    const runId = randomIdentifier("run");
    const attemptId = randomIdentifier("attempt");
    const collectorInstanceNonce = randomIdentifier("collector");
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicKeyBytes = Buffer.from(publicKey.export({ format: "der", type: "spki" }));
    const issuerPublicKeySpkiDerBase64 = publicKeyBytes.toString("base64");
    const issuerKeyId = `ed25519-${sha256(publicKeyBytes)}`;
    const createdAt = canonicalTimestamp();
    const marker = {
      schemaVersion: 1,
      recordType: "sw_ab_update_runtime_collector_attempt_marker_candidate_v1",
      trustClass: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS,
      status: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS,
      executionAdmission: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION,
      runId,
      attemptId,
      collectorInstanceNonce,
      issuerKeyId,
      issuerPublicKeySpkiDerBase64,
      createdAt,
      origin,
      releaseIdentity: structuredClone(sources.policy.releaseIdentity),
      capabilities: structuredClone(sources.policy.capabilities),
      rootLayout: structuredClone(sources.policy.rootLayout),
      artifactBindings,
      sourceBindings: structuredClone(sources.bindings),
      sourceSetDigest: sha256(canonicalJson(sources.bindings)),
      signatureBoundary: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY),
      authority: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY),
      markerDigest: "0".repeat(64),
      markerSignatureBase64: "A".repeat(86) + "=="
    };
    marker.markerDigest = computeSwAbRuntimeCollectorMarkerDigest(marker);
    marker.markerSignatureBase64 = signSwAbRuntimeCollectorDigest(
      privateKey,
      computeSwAbRuntimeCollectorMarkerStatementDigest(marker)
    );
    validateSwAbRuntimeCollectorAttemptMarker({
      marker,
      policy: sources.policy,
      schemaValidator: sources.schemaValidator,
      checkedSourceBindings: sources.bindings
    });
    const prepared = await prepareFreshRunRoot(cwd, runRoot);
    const markerBytes = jsonBytes(marker, MAX_MARKER_BYTES, "Collector attempt marker");
    const markerPath = path.join(prepared.runRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE);
    markerHeld = await writeHeldExclusiveFile(markerPath, markerBytes, "Collector attempt marker");
    const session = Object.freeze({
      runId,
      attemptId,
      collectorInstanceNonce,
      markerDigest: marker.markerDigest,
      status: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS,
      executionAdmission: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION
    });
    const createdMilliseconds = Date.parse(createdAt);
    const state = {
      invalidated: false,
      finalizing: false,
      activeOperation: null,
      cwd: prepared.cwd,
      runRoot: prepared.runRoot,
      runRootIdentity: prepared.identity,
      origin,
      artifactBindings,
      sources,
      marker,
      markerHeld,
      receiptHeld: null,
      privateKey,
      nextTupleIndex: 0,
      pendingReservation: null,
      tupleRecords: [],
      tupleMetadata: [],
      browserNonces: new Map(),
      contextNonces: new Map(),
      pageNonces: new Map(),
      issuedNonces: new Set([runId, attemptId, collectorInstanceNonce]),
      lastTimestampMilliseconds: createdMilliseconds
    };
    SESSION_STATES.set(session, state);
    ACTIVE_SESSIONS.add(session);
    return session;
  } catch (error) {
    await markerHeld?.handle.close().catch(() => {});
    throw error;
  }
}

async function reserveNextSwAbUpdateRuntimeCollectorTupleInternal(session, state) {
  try {
    requireCondition(
      state.finalizing === false
        && state.pendingReservation === null
        && state.nextTupleIndex < SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.length,
      "TUPLE_ORDER_INVALID",
      "reservation",
      "Collector permits exactly one pending reservation in the fixed phase-major tuple order."
    );
    await revalidateHeldFile(
      state.markerHeld,
      path.join(state.runRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE),
      "Collector attempt marker before reservation"
    );
    const tuple = SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[state.nextTupleIndex];
    const browserIssuanceNonce = state.browserNonces.get(tuple.projectName)
      ?? randomIdentifier("browser", state.issuedNonces);
    const browserContextIssuanceNonce = state.contextNonces.get(tuple.projectName)
      ?? randomIdentifier("context", state.issuedNonces);
    const pageKey = `${tuple.projectName}\0${tuple.slot}`;
    const pageIssuanceNonce = state.pageNonces.get(pageKey)
      ?? randomIdentifier("page", state.issuedNonces);
    state.browserNonces.set(tuple.projectName, browserIssuanceNonce);
    state.contextNonces.set(tuple.projectName, browserContextIssuanceNonce);
    state.pageNonces.set(pageKey, pageIssuanceNonce);
    const sessionNonce = randomIdentifier("session", state.issuedNonces);
    const challengeNonce = randomIdentifier("challenge", state.issuedNonces);
    const sequence = state.nextTupleIndex + 1;
    const reservation = Object.freeze({
      sequence,
      projectName: tuple.projectName,
      phase: tuple.phase,
      slot: tuple.slot,
      browserIssuanceNonce,
      browserContextIssuanceNonce,
      pageIssuanceNonce,
      sessionNonce,
      challengeRequest: Object.freeze({
        type: "SW_AB_RUNTIME_CHALLENGE_V1",
        challengeNonce
      })
    });
    RESERVATION_STATES.set(reservation, Object.freeze({
      session,
      sequence,
      tuple,
      browserIssuanceNonce,
      browserContextIssuanceNonce,
      pageIssuanceNonce,
      sessionNonce,
      challengeNonce
    }));
    ACTIVE_RESERVATIONS.add(reservation);
    state.pendingReservation = reservation;
    return reservation;
  } catch (error) {
    return invalidateAndRethrow(session, state, error);
  }
}

async function completeSwAbUpdateRuntimeCollectorTupleInternal(
  session,
  state,
  reservation,
  rawDecodedObservation,
  rawTimeline
) {
  try {
    const reservationState = RESERVATION_STATES.get(reservation);
    requireCondition(
      reservationState !== undefined
        && ACTIVE_RESERVATIONS.has(reservation)
        && !CONSUMED_RESERVATIONS.has(reservation)
        && reservationState.session === session
        && state.pendingReservation === reservation,
      "CAPSULE_NOT_ISSUED",
      "reservation",
      "Reservation was not issued by this active session or was already consumed."
    );
    ACTIVE_RESERVATIONS.delete(reservation);
    CONSUMED_RESERVATIONS.add(reservation);
    RESERVATION_STATES.delete(reservation);
    state.pendingReservation = null;
    const observation = cloneDecodedObservation(rawDecodedObservation);
    const times = cloneLiveCaptureTimeline(rawTimeline);
    const cdpRequest = Object.freeze({ method: "Target.getTargetInfo", params: Object.freeze({}) });
    const challengeRequest = Object.freeze({
      type: "SW_AB_RUNTIME_CHALLENGE_V1",
      challengeNonce: reservationState.challengeNonce
    });
    const record = {
      schemaVersion: 1,
      recordType: "sw_ab_update_runtime_api_transcript_tuple_candidate_v1",
      projectName: reservationState.tuple.projectName,
      phase: reservationState.tuple.phase,
      slot: reservationState.tuple.slot,
      sequence: reservationState.sequence,
      startedAt: times.startedAt,
      completedAt: times.completedAt,
      pageUrlBefore: observation.pageUrlBefore,
      pageUrlAfter: observation.pageUrlAfter,
      cdpSession: {
        surface: SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE.cdpApi,
        instanceNonce: reservationState.sessionNonce,
        createdAt: times.sessionCreatedAt,
        detachedAt: times.sessionDetachedAt,
        preChallenge: canonicalExchange(
          times.preRequestStartedAt,
          times.preResponseReceivedAt,
          cdpRequest,
          observation.cdpPreChallengeResponse
        ),
        postChallenge: canonicalExchange(
          times.postRequestStartedAt,
          times.postResponseReceivedAt,
          cdpRequest,
          observation.cdpPostChallengeResponse
        )
      },
      serviceWorkerChallenge: {
        surface: SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE.serviceWorkerMessageApi,
        realm: "page_main_world_untrusted",
        ...canonicalExchange(
          times.challengeRequestStartedAt,
          times.challengeResponseReceivedAt,
          challengeRequest,
          observation.serviceWorkerChallengeResponse
        )
      },
      recordDigest: "0".repeat(64)
    };
    record.recordDigest = computeSwAbUpdateRuntimeApiTranscriptRecordDigest(record);
    try {
      validateSwAbUpdateRuntimeApiTranscriptTuple({
        record,
        tuple: reservationState.tuple,
        sequence: reservationState.sequence,
        origin: state.origin,
        artifactBindings: state.artifactBindings,
        schemaValidator: state.sources.transcriptSchemaValidator
      });
    } catch (cause) {
      failSwAbRuntimeCollectorIssuance(
        "TRANSCRIPT_INVALID",
        "completion",
        `Decoded observation for tuple ${reservationState.sequence} cannot form a valid transcript record.`,
        cause
      );
    }
    state.lastTimestampMilliseconds = Math.max(
      state.lastTimestampMilliseconds,
      Date.parse(times.completedAt)
    );
    state.tupleRecords.push(record);
    state.tupleMetadata.push(Object.freeze({
      sequence: reservationState.sequence,
      projectName: reservationState.tuple.projectName,
      phase: reservationState.tuple.phase,
      slot: reservationState.tuple.slot,
      browserIssuanceNonce: reservationState.browserIssuanceNonce,
      browserContextIssuanceNonce: reservationState.browserContextIssuanceNonce,
      pageIssuanceNonce: reservationState.pageIssuanceNonce,
      sessionNonce: reservationState.sessionNonce,
      challengeNonce: reservationState.challengeNonce,
      recordDigest: record.recordDigest
    }));
    state.nextTupleIndex += 1;
    await revalidateHeldFile(
      state.markerHeld,
      path.join(state.runRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE),
      "Collector attempt marker after tuple completion"
    );
    return Object.freeze({
      sequence: reservationState.sequence,
      projectName: reservationState.tuple.projectName,
      phase: reservationState.tuple.phase,
      slot: reservationState.tuple.slot,
      recordDigest: record.recordDigest,
      status: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS
    });
  } catch (error) {
    return invalidateAndRethrow(session, state, error);
  }
}

export async function collectNextSwAbUpdateRuntimeCollectorTupleFromPage(rawInput) {
  const descriptors = ownDataRecord(
    rawInput,
    ["session", "page"],
    "live collector input"
  );
  const session = descriptors.session.value;
  const page = descriptors.page.value;
  const state = sessionState(session);
  enterSessionOperation(state, "live-collect");
  try {
    const reservation = await reserveNextSwAbUpdateRuntimeCollectorTupleInternal(session, state);
    const captureEnvelope =
      await captureSwAbUpdateRuntimeCollectorDecodedObservationFromPage({
        page,
        reservation
      });
    const capture = consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope(captureEnvelope);
    return await completeSwAbUpdateRuntimeCollectorTupleInternal(
      session,
      state,
      reservation,
      capture.observation,
      capture.timeline
    );
  } catch {
    await invalidateSession(session, state);
    failSwAbRuntimeCollectorIssuance(
      "LIVE_CAPTURE_FAILED",
      "live-capture",
      "Live Page collector failed closed; the session is no longer usable."
    );
  } finally {
    leaveSessionOperation(state, "live-collect");
  }
}

async function readPublishedTranscript(state, verifiedTranscript) {
  const transcriptRoot = path.join(
    state.runRoot,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY
  );
  const tupleRecords = [];
  for (let index = 0; index < SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES.length; index += 1) {
    const fileName = SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[index];
    const bytes = await readFile(path.join(transcriptRoot, fileName));
    const binding = verifiedTranscript.tupleBindings[index];
    requireCondition(
      bytes.length === binding.size && sha256(bytes) === binding.sha256,
      "TRANSCRIPT_BINDING_MISMATCH",
      "transcript",
      `Published transcript tuple ${index + 1} changed after its verifier endpoint.`
    );
    tupleRecords.push(parseSwAbUpdateRuntimeApiTranscriptJsonBytes(bytes, `collector tuple ${index + 1}`));
  }
  const manifestBytes = await readFile(
    path.join(transcriptRoot, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE)
  );
  requireCondition(
    manifestBytes.length === verifiedTranscript.manifestBinding.size
      && sha256(manifestBytes) === verifiedTranscript.manifestBinding.sha256,
    "TRANSCRIPT_BINDING_MISMATCH",
    "transcript",
    "Published transcript manifest changed after its verifier endpoint."
  );
  const manifest = parseSwAbUpdateRuntimeApiTranscriptJsonBytes(
    manifestBytes,
    "collector transcript manifest"
  );
  const tupleBindings = manifest.tupleBindings.map((binding) => ({ ...binding }));
  return Object.freeze({
    tupleRecords: Object.freeze(tupleRecords),
    tupleBindings: Object.freeze(tupleBindings),
    bundleBinding: immutableSwAbRuntimeCollectorIssuanceSnapshot({
      relativeDirectory: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
      manifestPath:
        `${SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY}/${SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE}`,
      manifestSize: manifestBytes.length,
      manifestSha256: sha256(manifestBytes),
      bundleId: verifiedTranscript.result.bundleId,
      bundleDigest: verifiedTranscript.result.bundleDigest,
      derivedEvidenceDigest: verifiedTranscript.result.derivedEvidenceDigest,
      sourceSetDigest: manifest.sourceSetDigest,
      tupleFileCount: 8,
      tupleBindings
    })
  });
}

function buildTupleIssuances(state, transcript) {
  let predecessor = computeSwAbRuntimeCollectorChainGenesisDigest(state.marker);
  return state.tupleMetadata.map((metadata, index) => {
    const binding = transcript.tupleBindings[index];
    const issuance = {
      sequence: metadata.sequence,
      projectName: metadata.projectName,
      phase: metadata.phase,
      slot: metadata.slot,
      browserIssuanceNonce: metadata.browserIssuanceNonce,
      browserContextIssuanceNonce: metadata.browserContextIssuanceNonce,
      pageIssuanceNonce: metadata.pageIssuanceNonce,
      sessionNonce: metadata.sessionNonce,
      challengeNonce: metadata.challengeNonce,
      transcriptPath:
        `${SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY}/${binding.path}`,
      transcriptSize: binding.size,
      transcriptSha256: binding.sha256,
      transcriptRecordDigest: binding.recordDigest,
      previousIssuanceDigest: predecessor,
      issuanceDigest: "0".repeat(64)
    };
    issuance.issuanceDigest = computeSwAbRuntimeCollectorTupleIssuanceDigest({
      runId: state.marker.runId,
      attemptId: state.marker.attemptId,
      collectorInstanceNonce: state.marker.collectorInstanceNonce,
      issuance
    });
    predecessor = issuance.issuanceDigest;
    return issuance;
  });
}

async function assertExactTerminalRoot(state) {
  const entries = await readdir(state.runRoot, { withFileTypes: true });
  const expected = [
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY
  ].sort();
  requireCondition(
    exactJson(entries.map((entry) => entry.name).sort(), expected)
      && entries.every((entry) => {
        if (entry.name === SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY) {
          return entry.isDirectory() && !entry.isSymbolicLink();
        }
        return entry.isFile() && !entry.isSymbolicLink();
      }),
    "FILE_SET_INVALID",
    "filesystem",
    "Terminal collector root must contain exactly marker, transcript directory, and receipt."
  );
  const terminalIdentity = await captureRealDirectory(
    state.runRoot,
    path.join(state.cwd, "tmp"),
    "Terminal collector run root"
  );
  requireCondition(
    sameDirectoryIdentity(state.runRootIdentity, terminalIdentity),
    "TERMINAL_SET_CHANGED",
    "mutation",
    "Collector run root identity changed during issuance."
  );
}

async function loadOuterVerifierModule() {
  try {
    const module = await import("./sw-ab-update-runtime-collector-issuance-loader.mjs");
    requireCondition(
      typeof module.loadVerifiedSwAbUpdateRuntimeCollectorIssuance === "function",
      "OUTER_LOADER_UNAVAILABLE",
      "verification",
      "Outer collector issuance loader does not export loadVerifiedSwAbUpdateRuntimeCollectorIssuance."
    );
    return module;
  } catch (cause) {
    if (cause?.failureCode === "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_OUTER_LOADER_UNAVAILABLE") {
      throw cause;
    }
    failSwAbRuntimeCollectorIssuance(
      "OUTER_LOADER_UNAVAILABLE",
      "verification",
      "Outer collector issuance loader could not be loaded after terminal publication.",
      cause
    );
  }
}

export async function finalizeSwAbUpdateRuntimeCollectorIssuance(session) {
  const state = sessionState(session);
  enterSessionOperation(state, "finalize");
  try {
    requireCondition(
      state.finalizing === false
        && state.pendingReservation === null
        && state.nextTupleIndex === 8
        && state.tupleRecords.length === 8
        && state.tupleMetadata.length === 8,
      "TUPLE_ORDER_INVALID",
      "finalize",
      "Finalize requires exactly eight completed phase-major tuples and no pending reservation."
    );
    state.finalizing = true;
    await revalidateHeldFile(
      state.markerHeld,
      path.join(state.runRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE),
      "Collector attempt marker before transcript publication"
    );
    const capturedAtMilliseconds = Math.max(Date.now(), state.lastTimestampMilliseconds + 1);
    state.lastTimestampMilliseconds = capturedAtMilliseconds;
    const capturedAt = canonicalTimestamp(capturedAtMilliseconds);
    const transcriptDirectory = path.join(
      state.runRoot,
      SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY
    );
    await writeSwAbUpdateRuntimeApiTranscriptBundle({
      cwd: state.cwd,
      outputDirectory: transcriptDirectory,
      runId: state.marker.runId,
      attemptId: state.marker.attemptId,
      capturedAt,
      origin: state.origin,
      artifactBindings: state.artifactBindings,
      tupleRecords: state.tupleRecords
    });
    const verifiedTranscript = await loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle({
      cwd: state.cwd,
      bindingRoot: state.cwd,
      bundleDirectory: transcriptDirectory
    });
    const transcript = await readPublishedTranscript(state, verifiedTranscript);
    const terminalSources = await loadCheckedContractSources(state.cwd);
    requireCondition(
      exactJson(state.sources.bindings, terminalSources.bindings)
        && exactJson(state.sources.identities, terminalSources.identities),
      "SOURCE_BINDING_MISMATCH",
      "source",
      "Collector issuance sources changed between marker and terminal receipt."
    );
    const tupleIssuances = buildTupleIssuances(state, transcript);
    const receipt = {
      schemaVersion: 1,
      recordType: "sw_ab_update_runtime_collector_issuance_candidate_v1",
      trustClass: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS,
      status: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS,
      executionAdmission: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION,
      usableForRuntimeEvidence: false,
      usableForCandidateAssembly: false,
      formalReleaseEvidenceReceipt: false,
      cliExitCode: 1,
      runId: state.marker.runId,
      attemptId: state.marker.attemptId,
      collectorInstanceNonce: state.marker.collectorInstanceNonce,
      issuerKeyId: state.marker.issuerKeyId,
      capturedAt,
      origin: state.marker.origin,
      releaseIdentity: structuredClone(state.marker.releaseIdentity),
      capabilities: structuredClone(state.marker.capabilities),
      rootLayout: structuredClone(state.marker.rootLayout),
      artifactBindings: structuredClone(state.marker.artifactBindings),
      attemptMarkerBinding: {
        path: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
        size: state.markerHeld.binding.size,
        sha256: state.markerHeld.binding.sha256,
        markerDigest: state.marker.markerDigest,
        issuerKeyId: state.marker.issuerKeyId,
        issuerPublicKeySpkiDerBase64: state.marker.issuerPublicKeySpkiDerBase64
      },
      transcriptBundleBinding: structuredClone(transcript.bundleBinding),
      tupleIssuances,
      sourceBindings: structuredClone(terminalSources.bindings),
      sourceSetDigest: sha256(canonicalJson(terminalSources.bindings)),
      signatureBoundary: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY),
      mechanicalChecks: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MECHANICAL_CHECKS),
      mutationBoundary: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MUTATION_BOUNDARY),
      provenance: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE),
      authority: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY),
      issuanceId: `swabci1-${"0".repeat(32)}`,
      receiptDigest: "0".repeat(64),
      receiptSignatureBase64: "A".repeat(86) + "=="
    };
    receipt.issuanceId =
      `swabci1-${computeSwAbRuntimeCollectorIssuanceIdentityBaseDigest(receipt).slice(0, 32)}`;
    receipt.receiptDigest = computeSwAbRuntimeCollectorReceiptDigest(receipt);
    receipt.receiptSignatureBase64 = signSwAbRuntimeCollectorDigest(
      state.privateKey,
      computeSwAbRuntimeCollectorReceiptStatementDigest(receipt)
    );
    validateSwAbRuntimeCollectorIssuanceReceipt({
      receipt,
      marker: state.marker,
      markerBinding: state.markerHeld.binding,
      policy: terminalSources.policy,
      schemaValidator: terminalSources.schemaValidator,
      checkedSourceBindings: terminalSources.bindings,
      transcript
    });
    const receiptBytes = jsonBytes(receipt, MAX_RECEIPT_BYTES, "Collector issuance receipt");
    const receiptPath = path.join(
      state.runRoot,
      SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE
    );
    state.receiptHeld = await writeHeldExclusiveFile(
      receiptPath,
      receiptBytes,
      "Collector issuance terminal receipt"
    );
    await assertExactTerminalRoot(state);
    const outerModule = await loadOuterVerifierModule();
    const outer = await outerModule.loadVerifiedSwAbUpdateRuntimeCollectorIssuance({
      cwd: state.cwd,
      bindingRoot: state.cwd,
      runRoot: state.runRoot
    });
    requireCondition(
      outer?.result?.issuanceId === receipt.issuanceId
        && outer.result.receiptDigest === receipt.receiptDigest
        && outer.result.bundleId === verifiedTranscript.result.bundleId
        && outer.result.bundleDigest === verifiedTranscript.result.bundleDigest,
      "TRANSCRIPT_BINDING_MISMATCH",
      "verification",
      "Outer collector issuance verification result does not bind the published receipt."
    );
    await Promise.all([
      revalidateHeldFile(
        state.markerHeld,
        path.join(state.runRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE),
        "Collector attempt marker after outer verification"
      ),
      revalidateHeldFile(
        state.receiptHeld,
        receiptPath,
        "Collector issuance receipt after outer verification"
      )
    ]);
    await assertExactTerminalRoot(state);
    const result = Object.freeze({
      ...outer.result,
      attemptMarkerHandleHeldAcrossIssuance: true,
      terminalOuterVerificationCompleted: true
    });
    await invalidateSession(session, state);
    return result;
  } catch (error) {
    return invalidateAndRethrow(session, state, error);
  } finally {
    leaveSessionOperation(state, "finalize");
  }
}

export async function abortSwAbUpdateRuntimeCollectorIssuance(session) {
  const state = sessionState(session);
  enterSessionOperation(state, "abort");
  const result = immutableSwAbRuntimeCollectorIssuanceSnapshot({
    status: "aborted_incomplete",
    executionAdmission: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION,
    releaseIdentity: structuredClone(state.marker.releaseIdentity),
    capabilities: structuredClone(state.marker.capabilities),
    provenance: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE),
    authority: structuredClone(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY),
    runId: state.marker.runId,
    attemptId: state.marker.attemptId,
    runRootRetained: true,
    filesDeleted: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false
  });
  try {
    await invalidateSession(session, state);
    return result;
  } finally {
    leaveSessionOperation(state, "abort");
  }
}
