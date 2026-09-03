import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readdir, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { types as utilTypes } from "node:util";

import {
  SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY,
  closeSingleBindingIntegratedPhysicalSeatInMemoryServer,
  consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer,
  releaseSingleBindingIntegratedPhysicalServerPayloadCapability,
  startSingleBindingIntegratedPhysicalSeatInMemoryServer
} from "./single-binding-integrated-physical-package.mjs";
import { removePilotSessionProfileIfExact } from "./return-verifier.mjs";

const SOURCE_ROOT = await realpath(dirname(fileURLToPath(import.meta.url)));
const REPOSITORY_ROOT = await realpath(resolve(SOURCE_ROOT, "../.."));
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_BROWSER_EXECUTABLE_BYTES = 128 * 1024 * 1024;
const SESSION_PREFIX = "hakimi-bazi-single-binding-physical-synthetic-";
const IS_PROXY = utilTypes.isProxy;
const PREFLIGHT_STATES = new WeakMap();
const RUN_STATES = new WeakMap();
const TEST_ADAPTER_STATES = new WeakMap();
const COMPLETED_RUNS = new WeakMap();
const INITIAL_SYSTEM_ENV = Object.freeze(Object.fromEntries(
  ["SystemRoot", "WINDIR"].flatMap((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.length > 0 ? [[key, value]] : [];
  })
));

export const SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY = Object.freeze({
  ...SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY,
  syntheticFixtureOnly: true,
  realReturnLoadingAuthorized: false,
  isolatedBrowserProfileLaunchImplemented: true,
  isolatedBrowserProfileLaunchCandidateOnly: true,
  callerExplicitBrowserExecutablePathRequired: true,
  callerExplicitBrowserExecutablePinRequired: true,
  browserExecutablePinProvenanceVerified: false,
  browserPublisherSignatureVerified: false,
  runningProcessImageVerified: false,
  samePrivilegeIntervalMutationExcluded: false,
  browserHonoredUserDataDirVerified: false,
  browserProfileIsolationEstablished: false,
  browserProcessTreeClosureEstablished: false,
  externalNetworkExcluded: false,
  browserExtensionInterceptionExcluded: false,
  enterpriseBrowserPolicyEffectsExcluded: false,
  testAdapterAuthorizedForProduction: false,
  physicalExpertSurfaceReady: false,
  actualHumanParticipationEstablished: false,
  reviewerIdentityEstablished: false,
  reviewerQualificationEstablished: false,
  expertTruthEstablished: false,
  expertVsAiAccuracyEvaluated: false,
  contentTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  countsTowardFormal2of2: false,
  countsTowardExpertGate: false,
  formalTwoOfTwoCountDelta: 0,
  expertGateCountDelta: 0,
  bindingFrozenCountDelta: 0,
  verifiedExpertCountDelta: 0,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false
});

export class SingleBindingIntegratedPhysicalCleanProfileRunnerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SingleBindingIntegratedPhysicalCleanProfileRunnerError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new SingleBindingIntegratedPhysicalCleanProfileRunnerError(code, message);
}

function samePath(left, right) {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function outside(root, candidate) {
  const relation = relative(root, candidate);
  return relation === ".." || relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
    || isAbsolute(relation);
}

function identity(metadata) {
  return [metadata.dev, metadata.ino, metadata.nlink, metadata.size, metadata.mtimeNs, metadata.ctimeNs]
    .map(String).join(":");
}

async function readHandleBytes(handle, byteLength) {
  const bytes = Buffer.alloc(byteLength);
  let offset = 0;
  while (offset < byteLength) {
    const { bytesRead } = await handle.read(bytes, offset, byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset !== byteLength) {
    bytes.fill(0);
    fail("BROWSER_EXECUTABLE_CHANGED", "浏览器 executable 读取长度发生变化。 ");
  }
  return bytes;
}

async function openStableBrowserExecutable(path, browserFamily) {
  const target = resolve(path);
  const expectedName = browserFamily === "chrome" ? "chrome.exe" : "msedge.exe";
  let before;
  let canonical;
  let handle;
  try {
    before = await lstat(target, { bigint: true });
    canonical = await realpath(target);
    if (!samePath(canonical, target) || !outside(REPOSITORY_ROOT, canonical)
      || basename(canonical).toLowerCase() !== expectedName
      || !before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
      || before.size <= 0n || before.size > BigInt(MAX_BROWSER_EXECUTABLE_BYTES)) {
      fail("BROWSER_EXECUTABLE_INVALID", "浏览器 executable 必须是仓库外、名称匹配且大小受限的普通单链接文件。 ");
    }
    handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const held = await handle.stat({ bigint: true });
    if (!held.isFile() || held.nlink !== 1n || identity(held) !== identity(before)) {
      fail("BROWSER_EXECUTABLE_CHANGED", "浏览器 executable 打开前后身份变化。 ");
    }
    const bytes = await readHandleBytes(handle, Number(held.size));
    const rawSha256 = createHash("sha256").update(bytes).digest("hex");
    bytes.fill(0);
    const after = await lstat(target, { bigint: true });
    const canonicalAfter = await realpath(target);
    if (identity(after) !== identity(before) || !samePath(canonicalAfter, canonical)) {
      fail("BROWSER_EXECUTABLE_CHANGED", "浏览器 executable 校验期间身份变化。 ");
    }
    let closed = false;
    return {
      canonical,
      byteLength: Number(held.size),
      rawSha256,
      async assertCurrent() {
        if (closed) fail("BROWSER_EXECUTABLE_CHANGED", "浏览器 executable held handle 已关闭。 ");
        const [heldNow, pathNow, canonicalNow] = await Promise.all([
          handle.stat({ bigint: true }),
          lstat(target, { bigint: true }),
          realpath(target)
        ]);
        if (identity(heldNow) !== identity(held) || identity(pathNow) !== identity(before)
          || !samePath(canonicalNow, canonical)) {
          fail("BROWSER_EXECUTABLE_CHANGED", "浏览器 executable 当前身份变化。 ");
        }
        const current = await readHandleBytes(handle, Number(held.size));
        const currentSha256 = createHash("sha256").update(current).digest("hex");
        current.fill(0);
        const heldAfter = await handle.stat({ bigint: true });
        if (identity(heldAfter) !== identity(held) || currentSha256 !== rawSha256) {
          fail("BROWSER_EXECUTABLE_CHANGED", "浏览器 executable 当前 bytes 变化。 ");
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
      try { await handle.close(); } catch { fail("BROWSER_EXECUTABLE_HANDLE_CLOSE_FAILED", "浏览器 executable handle 关闭未确认。 "); }
    }
    if (error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError) throw error;
    fail("BROWSER_EXECUTABLE_INVALID", "浏览器 executable 不可用。 ");
  }
}

function capturePreflightRequest(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input) || IS_PROXY(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    fail("PREFLIGHT_REQUEST_INVALID", "clean-profile preflight 请求无效。 ");
  }
  const expectedKeys = [
    "browserExecutablePath",
    "browserFamily",
    "displayMode",
    "expectedBrowserExecutableRawSha256",
    "preparedSeatPackageCapability",
    "realPersonUseAuthorized",
    "realReturnLoadingAuthorized",
    "syntheticDataOnly"
  ].sort();
  const keys = Reflect.ownKeys(input);
  if (keys.some((key) => typeof key !== "string")
    || JSON.stringify([...keys].sort()) !== JSON.stringify(expectedKeys)) {
    fail("PREFLIGHT_REQUEST_INVALID", "clean-profile preflight 字段闭集无效。 ");
  }
  const captured = Object.create(null);
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      fail("PREFLIGHT_REQUEST_INVALID", "clean-profile preflight 不接受 accessor 字段。 ");
    }
    captured[key] = descriptor.value;
  }
  if (captured.syntheticDataOnly !== true || captured.realPersonUseAuthorized !== false
    || captured.realReturnLoadingAuthorized !== false) {
    fail("SYNTHETIC_ONLY_REQUIRED", "只接受 synthetic data；真人使用与真实回件必须显式为 false。 ");
  }
  if (!new Set(["chrome", "edge"]).has(captured.browserFamily)) {
    fail("BROWSER_FAMILY_INVALID", "browser family 只能是 chrome 或 edge。 ");
  }
  if (!new Set(["headless_test", "visible_synthetic_operator"]).has(captured.displayMode)) {
    fail("DISPLAY_MODE_INVALID", "display mode 无效。 ");
  }
  if (typeof captured.browserExecutablePath !== "string"
    || !isAbsolute(captured.browserExecutablePath) || captured.browserExecutablePath.length > 2_000
    || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(captured.browserExecutablePath)) {
    fail("BROWSER_EXECUTABLE_INVALID", "必须显式提供长度受限的绝对 browser executable path。 ");
  }
  if (typeof captured.expectedBrowserExecutableRawSha256 !== "string"
    || !SHA256_PATTERN.test(captured.expectedBrowserExecutableRawSha256)
    || /^0{64}$/u.test(captured.expectedBrowserExecutableRawSha256)) {
    fail("BROWSER_EXECUTABLE_PIN_INVALID", "必须显式提供非零小写 browser executable SHA-256。 ");
  }
  if (captured.preparedSeatPackageCapability === null
    || typeof captured.preparedSeatPackageCapability !== "object") {
    fail("PREPARED_CAPABILITY_INVALID", "prepared seat package capability 无效。 ");
  }
  return Object.freeze(captured);
}

export async function preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(input) {
  const request = capturePreflightRequest(input);
  const executable = await openStableBrowserExecutable(request.browserExecutablePath, request.browserFamily);
  let serverPayloadCapability = null;
  try {
    if (executable.rawSha256 !== request.expectedBrowserExecutableRawSha256) {
      fail("BROWSER_EXECUTABLE_PIN_MISMATCH", "browser executable 与显式 SHA-256 pin 不一致。 ");
    }
    serverPayloadCapability = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(
      request.preparedSeatPackageCapability
    );
    const capability = Object.freeze({
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_single_binding_physical_clean_profile_preflight_candidate_v1",
      browserFamily: request.browserFamily,
      displayMode: request.displayMode,
      browserExecutableRawSha256: executable.rawSha256,
      browserExecutableByteLength: executable.byteLength,
      seatId: serverPayloadCapability.sessionBinding.seatId,
      reviewCycleId: serverPayloadCapability.sessionBinding.reviewCycleId,
      pairRunId: serverPayloadCapability.sessionBinding.pairRunId,
      checks: Object.freeze({
        explicitBrowserExecutablePathAccepted: true,
        explicitBrowserExecutableRawSha256Matched: true,
        browserExecutableOrdinarySingleLinkFileObserved: true,
        browserExecutableHeldHandleRetainedForStart: true,
        preparedSeatPackageCapabilityConsumedByCurrentProcessVerifier: true,
        verifiedServerPayloadCapabilityCreatedAndNotStarted: true,
        syntheticDataOnlyLiteralMatched: true,
        realPersonUseRejected: true,
        realReturnLoadingRejected: true
      }),
      boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY
    });
    PREFLIGHT_STATES.set(capability, {
      status: "available",
      executable,
      serverPayloadCapability,
      displayMode: request.displayMode,
      browserFamily: request.browserFamily,
      serverPayloadReleased: false
    });
    return capability;
  } catch (error) {
    let serverPayloadCleanupConfirmed = true;
    if (serverPayloadCapability !== null) {
      try {
        releaseSingleBindingIntegratedPhysicalServerPayloadCapability(serverPayloadCapability);
      } catch {
        serverPayloadCleanupConfirmed = false;
      }
    }
    let executableCleanupConfirmed = true;
    try { await executable.close(); } catch {
      executableCleanupConfirmed = false;
    }
    if (!serverPayloadCleanupConfirmed || !executableCleanupConfirmed) {
      fail("PREFLIGHT_CLEANUP_UNCONFIRMED", "preflight 拒绝后 server payload 或 executable handle 清理未确认。 ");
    }
    throw error;
  }
}

export async function releaseSingleBindingIntegratedPhysicalCleanProfilePreflightCandidate(capability) {
  const state = capability && PREFLIGHT_STATES.get(capability);
  if (!state || !new Set(["available", "release_failed"]).has(state.status)) {
    fail("PREFLIGHT_CAPABILITY_INVALID", "preflight capability 无效、已消费或已释放。 ");
  }
  state.status = "releasing";
  try {
    if (!state.serverPayloadReleased) {
      releaseSingleBindingIntegratedPhysicalServerPayloadCapability(state.serverPayloadCapability);
      state.serverPayloadReleased = true;
    }
    await state.executable.close();
    state.status = "released";
    PREFLIGHT_STATES.delete(capability);
    return Object.freeze({
      released: true,
      verifiedServerPayloadReleased: true,
      browserExecutableHandleClosed: true,
      boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY
    });
  } catch {
    state.status = "release_failed";
    fail("PREFLIGHT_RELEASE_FAILED", "preflight capability 释放未确认，可用原 capability 重试。 ");
  }
}

export function createSingleBindingIntegratedPhysicalCleanProfileRunnerTestAdapter(input) {
  if (process.env.NODE_TEST_CONTEXT !== "child-v8") {
    fail("TEST_ADAPTER_UNAVAILABLE", "test adapter 只在 Node 隔离测试子进程中可创建。 ");
  }
  if (input === null || typeof input !== "object" || Array.isArray(input) || IS_PROXY(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    fail("TEST_ADAPTER_INVALID", "test adapter 输入无效。 ");
  }
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 2 || keys.some((key) => !["spawnBrowser", "terminateBrowser"].includes(key))) {
    fail("TEST_ADAPTER_INVALID", "test adapter 字段闭集无效。 ");
  }
  const functions = Object.create(null);
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || typeof descriptor.value !== "function") {
      fail("TEST_ADAPTER_INVALID", "test adapter 只接受自有 data function。 ");
    }
    functions[key] = descriptor.value;
  }
  const capability = Object.freeze(Object.create(null));
  TEST_ADAPTER_STATES.set(capability, Object.freeze(functions));
  return capability;
}

function resolveTestAdapter(capability) {
  if (capability === undefined) return null;
  const state = capability && TEST_ADAPTER_STATES.get(capability);
  if (!state) fail("TEST_ADAPTER_INVALID", "test adapter capability 无效或伪造。 ");
  return state;
}

function sanitizedEnvironment(browserTempRoot) {
  return Object.freeze({ ...INITIAL_SYSTEM_ENV, TEMP: browserTempRoot, TMP: browserTempRoot });
}

function browserTerminal(child) {
  return child && ((child.exitCode !== null && child.exitCode !== undefined)
    || (child.signalCode !== null && child.signalCode !== undefined));
}

function observeExit(child) {
  if (browserTerminal(child)) {
    return Promise.resolve(Object.freeze({ kind: "exit", code: child.exitCode ?? null, signal: child.signalCode ?? null }));
  }
  return new Promise((resolveExit) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      child.off("exit", onExit);
      child.off("error", onError);
      resolveExit(Object.freeze(value));
    };
    const onExit = (code, signal) => finish({ kind: "exit", code, signal });
    const onError = () => finish({ kind: "error", code: null, signal: null });
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

function waitForSpawn(child, timeoutMs = 5_000) {
  if (browserTerminal(child)) fail("BROWSER_EXITED_BEFORE_START", "浏览器在启动确认前已退出。 ");
  return new Promise((resolveSpawn, rejectSpawn) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("spawn", onSpawn);
      child.off("exit", onExit);
      child.off("error", onError);
      if (error) rejectSpawn(error); else resolveSpawn();
    };
    const onSpawn = () => finish();
    const onExit = () => finish(new SingleBindingIntegratedPhysicalCleanProfileRunnerError(
      "BROWSER_EXITED_BEFORE_START", "浏览器在启动确认前退出。 "
    ));
    const onError = () => finish(new SingleBindingIntegratedPhysicalCleanProfileRunnerError(
      "BROWSER_SPAWN_FAILED", "浏览器启动失败。 "
    ));
    const timer = setTimeout(() => finish(new SingleBindingIntegratedPhysicalCleanProfileRunnerError(
      "BROWSER_SPAWN_TIMEOUT", "浏览器启动确认超时。 "
    )), timeoutMs);
    child.once("spawn", onSpawn);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

async function waitBounded(promise, milliseconds) {
  let timer;
  const timeout = new Promise((resolveTimeout) => {
    timer = setTimeout(() => resolveTimeout(null), milliseconds);
  });
  try { return await Promise.race([promise, timeout]); } finally { clearTimeout(timer); }
}

async function terminateBrowserDefault(child, exitPromise) {
  if (browserTerminal(child)) return true;
  try {
    child.kill("SIGTERM");
  } catch {
    return false;
  }
  let observed = await waitBounded(exitPromise, 5_000);
  if (observed?.kind === "exit") return true;
  if (process.platform !== "win32") {
    try { child.kill("SIGKILL"); } catch { return false; }
    observed = await waitBounded(exitPromise, 5_000);
  }
  return observed?.kind === "exit";
}

async function createSessionEndpoints() {
  let canonicalTempRoot = null;
  let lexicalSessionRoot = null;
  let canonicalSessionRoot = null;
  let initialSessionIdentity = null;
  try {
    canonicalTempRoot = await realpath(tmpdir());
    lexicalSessionRoot = await mkdtemp(join(canonicalTempRoot, SESSION_PREFIX));
    canonicalSessionRoot = await realpath(lexicalSessionRoot);
    const metadata = await lstat(canonicalSessionRoot, { bigint: true });
    initialSessionIdentity = Object.freeze({ dev: metadata.dev, ino: metadata.ino });
    if (!samePath(canonicalSessionRoot, lexicalSessionRoot) || !metadata.isDirectory() || metadata.isSymbolicLink()
      || !samePath(dirname(canonicalSessionRoot), canonicalTempRoot)
      || !basename(canonicalSessionRoot).startsWith(SESSION_PREFIX)
      || !outside(REPOSITORY_ROOT, canonicalSessionRoot)) {
      fail("SESSION_ROOT_INVALID", "临时 session root 身份无效。 ");
    }
    const profileRoot = join(canonicalSessionRoot, "browser-profile");
    const browserTempRoot = join(canonicalSessionRoot, "browser-temp");
    await mkdir(profileRoot, { recursive: false });
    await mkdir(browserTempRoot, { recursive: false });
    if ((await readdir(profileRoot)).length !== 0 || (await readdir(browserTempRoot)).length !== 0) {
      fail("SESSION_ROOT_INVALID", "新建 profile/temp 必须为空。 ");
    }
    return {
      canonicalTempRoot,
      canonicalSessionRoot,
      initialSessionIdentity,
      profileRoot,
      browserTempRoot
    };
  } catch (error) {
    if (lexicalSessionRoot !== null
      && (canonicalTempRoot === null || canonicalSessionRoot === null || initialSessionIdentity === null)) {
      fail("SESSION_CREATE_CLEANUP_UNCONFIRMED", "临时 session 已创建，但其精确身份无法确认并安全清理。 ");
    }
    if (canonicalTempRoot !== null && canonicalSessionRoot !== null && initialSessionIdentity !== null) {
      const cleanup = await removePilotSessionProfileIfExact({
        canonicalTempRoot,
        canonicalSessionRoot,
        initialSessionIdentity,
        browserClosed: true,
        serverClosed: true
      });
      if (cleanup.removed !== true) {
        fail("SESSION_CREATE_CLEANUP_UNCONFIRMED", "临时 session 创建失败，且精确身份清理未确认。 ");
      }
    }
    throw error;
  }
}

function browserArguments(profileRoot, entryUrl, displayMode) {
  return Object.freeze([
    ...(displayMode === "headless_test" ? ["--headless=new"] : []),
    `--user-data-dir=${profileRoot}`,
    "--disable-extensions",
    "--disable-component-extensions-with-background-pages",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--no-first-run",
    "--no-default-browser-check",
    "--no-proxy-server",
    "--proxy-bypass-list=*",
    `--app=${entryUrl}`
  ]);
}

async function removeSessionAfterShutdown(state) {
  if (!state.browserClosed || !state.serverClosed || state.sessionRemoved) return state.sessionRemoved;
  let cleanup = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    cleanup = await removePilotSessionProfileIfExact({
      canonicalTempRoot: state.canonicalTempRoot,
      canonicalSessionRoot: state.canonicalSessionRoot,
      initialSessionIdentity: state.initialSessionIdentity,
      browserClosed: state.browserClosed,
      serverClosed: state.serverClosed
    });
    if (cleanup.removed || cleanup.reason !== "recursive_delete_failed") break;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  if (!cleanup?.removed) return false;
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
    try {
      await lstat(state.canonicalSessionRoot, { bigint: true });
      return false;
    } catch (error) {
      if (error?.code !== "ENOENT") return false;
    }
  }
  state.sessionRemoved = true;
  return true;
}

async function closeRuntimeResources(state, reason) {
  if (state.completedObservation) return state.completedObservation;
  if (state.stopPromise) return state.stopPromise;
  state.stopPromise = (async () => {
    if (!state.browserExecutableHandleClosed && state.executable) {
      try {
        await state.executable.close();
        state.browserExecutableHandleClosed = true;
      } catch {
        state.browserExecutableHandleClosed = false;
      }
    }
    if (state.lifecycleKind === "failed_start" && !state.serverStartAttempted
      && !state.serverPayloadReleased && state.serverPayloadCapability) {
      try {
        releaseSingleBindingIntegratedPhysicalServerPayloadCapability(state.serverPayloadCapability);
        state.serverPayloadReleased = true;
        state.serverPayloadCapability = null;
      } catch {
        state.serverPayloadReleased = false;
      }
    }
    if (!state.browserClosed) {
      if (browserTerminal(state.browserProcess)) {
        state.browserClosed = true;
      } else {
        state.browserTerminationRequested = true;
        try {
          state.browserClosed = await state.terminateBrowser(state.browserProcess, state.browserExitPromise);
        } catch {
          state.browserClosed = false;
        }
      }
    }
    if (state.browserClosed && state.browserExitObservation === null) {
      state.browserExitObservation = await waitBounded(state.browserExitPromise, 250);
    }
    if (!state.serverClosed && state.serverCapability) {
      try {
        state.serverCloseResult = await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(state.serverCapability);
        state.serverClosed = state.serverCloseResult.serverClosed === true;
      } catch (error) {
        if (error?.serverClosed === true) {
          state.serverClosed = true;
          state.serverRuntimeErrorObserved = true;
          state.serverCloseResult = Object.freeze({
            serverClosed: true,
            returnCaptured: error.returnCaptureCapability !== null,
            returnCaptureCapability: error.returnCaptureCapability ?? null
          });
        }
      }
    }
    await removeSessionAfterShutdown(state);
    const serverPayloadDisposed = state.lifecycleKind !== "failed_start"
      || state.serverStartAttempted || state.serverPayloadReleased;
    const cleanupComplete = state.browserClosed && state.serverClosed && state.sessionRemoved
      && state.browserExecutableHandleClosed && serverPayloadDisposed;
    const browserProcessCreated = state.browserProcessCreated === true;
    const serverStartSucceeded = state.serverStartSucceeded === true;
    const sessionCreated = state.sessionCreated === true;
    const lifecycleFields = {
      schemaVersion: "1.0.0",
      reason,
      browserProcessCreated,
      browserTerminalObserved: browserProcessCreated && state.browserClosed,
      browserTerminationRequested: state.browserTerminationRequested,
      browserExitObservation: state.browserExitObservation,
      serverStartSucceeded,
      serverClosedObserved: serverStartSucceeded && state.serverClosed,
      serverRuntimeErrorObserved: state.serverRuntimeErrorObserved,
      sessionCreated,
      sessionProfileRemovedObserved: sessionCreated && state.sessionRemoved,
      executableIdentityVerifiedBeforeLaunch: state.executableIdentityVerifiedBeforeLaunch === true,
      executableIdentityVerifiedAfterLaunch: state.executableIdentityVerifiedAfterLaunch === true,
      browserExecutableHandleClosed: state.browserExecutableHandleClosed === true,
      verifiedServerPayloadDisposed: serverPayloadDisposed,
      returnCaptured: state.serverCloseResult?.returnCaptured === true,
      returnCaptureCapability: state.serverCloseResult?.returnCaptureCapability ?? null,
      cleanupComplete,
      temporarySessionEndpointCreated: sessionCreated,
      browserProfileWritesObserved: false,
      productStorageMutationExcluded: false,
      schema13MutationEpochUsedByRunner: false,
      boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY
    };
    const observation = state.lifecycleKind === "failed_start"
      ? Object.freeze({
        ...lifecycleFields,
        cleanupReceiptKind: "single_binding_integrated_physical_failed_start_cleanup_receipt_v1",
        failedStartCleanup: true,
        startSucceeded: false,
        successfulFailedStartCleanup: cleanupComplete,
        successfulCandidateShutdown: false,
        normalRunStopObservationIssued: false
      })
      : state.lifecycleKind === "test_run"
        ? Object.freeze({
          ...lifecycleFields,
          cleanupReceiptKind: "single_binding_integrated_physical_test_run_cleanup_receipt_v1",
          testAdapterUsed: true,
          successfulTestRunCleanup: cleanupComplete,
          successfulCandidateShutdown: false,
          normalRunStopObservationIssued: false
        })
      : Object.freeze({
        ...lifecycleFields,
        successfulCandidateShutdown: cleanupComplete && !state.serverRuntimeErrorObserved,
        recordType: "bazi_expert_single_binding_physical_clean_profile_stop_observation_candidate_v1"
      });
    if (!cleanupComplete) {
      const failedStart = state.lifecycleKind === "failed_start";
      const error = new SingleBindingIntegratedPhysicalCleanProfileRunnerError(
        failedStart ? "START_CLEANUP_UNCONFIRMED" : "STOP_CLEANUP_UNCONFIRMED",
        failedStart
          ? "启动失败后的资源关闭清理未全部确认，可用错误携带的 capability 重试。 "
          : "浏览器、服务器或 session profile 的关闭清理未全部确认，可用原 run capability 重试。 "
      );
      error.cleanupCapability = state.publicCapability;
      error.cleanupStatus = Object.freeze({
        browserProcessCreated,
        browserTerminalObserved: browserProcessCreated && state.browserClosed,
        serverStartSucceeded,
        serverClosedObserved: serverStartSucceeded && state.serverClosed,
        sessionCreated,
        sessionProfileRemovedObserved: sessionCreated && state.sessionRemoved,
        browserExecutableHandleClosed: state.browserExecutableHandleClosed,
        verifiedServerPayloadDisposed: serverPayloadDisposed,
        failedStart
      });
      throw error;
    }
    state.completedObservation = observation;
    if (state.lifecycleKind !== "failed_start") {
      COMPLETED_RUNS.set(state.publicCapability, observation);
    }
    return observation;
  })();
  try {
    return await state.stopPromise;
  } catch (error) {
    state.stopPromise = null;
    throw error;
  }
}

export async function startSingleBindingIntegratedPhysicalCleanProfileCandidate(
  preflight,
  testAdapterCapability = undefined
) {
  const state = preflight && PREFLIGHT_STATES.get(preflight);
  if (!state || state.status !== "available") {
    fail("PREFLIGHT_CAPABILITY_INVALID", "preflight capability 无效、已消费或已释放。 ");
  }
  const adapter = resolveTestAdapter(testAdapterCapability);
  state.status = "starting";
  let session = null;
  let serverCapability = null;
  let browserProcess = null;
  let browserExitPromise = null;
  let executableClosed = false;
  let serverStartAttempted = false;
  let serverStartSucceeded = false;
  let browserProcessCreated = false;
  let executableIdentityVerifiedBeforeLaunch = false;
  let executableIdentityVerifiedAfterLaunch = false;
  try {
    await state.executable.assertCurrent();
    executableIdentityVerifiedBeforeLaunch = true;
    session = await createSessionEndpoints();
    const serverPayloadCapability = state.serverPayloadCapability;
    state.serverPayloadCapability = null;
    serverStartAttempted = true;
    try {
      serverCapability = await startSingleBindingIntegratedPhysicalSeatInMemoryServer(serverPayloadCapability);
      serverStartSucceeded = true;
    } catch (serverStartError) {
      serverCapability = serverStartError?.cleanupCapability ?? null;
      throw serverStartError;
    }
    await state.executable.assertCurrent();
    const args = browserArguments(session.profileRoot, serverCapability.entryUrl, state.displayMode);
    const options = Object.freeze({
      cwd: session.canonicalSessionRoot,
      env: sanitizedEnvironment(session.browserTempRoot),
      stdio: "ignore",
      shell: false,
      windowsHide: state.displayMode === "headless_test"
    });
    const spawnBrowser = adapter?.spawnBrowser ?? ((executable, spawnArgs, spawnOptions) => (
      spawn(executable, spawnArgs, spawnOptions)
    ));
    browserProcess = spawnBrowser(state.executable.canonical, args, options);
    if (!browserProcess || typeof browserProcess.once !== "function"
      || typeof browserProcess.off !== "function" || typeof browserProcess.kill !== "function") {
      fail("BROWSER_PROCESS_INVALID", "browser process handle 无效。 ");
    }
    browserExitPromise = observeExit(browserProcess);
    await waitForSpawn(browserProcess);
    browserProcessCreated = true;
    if (browserTerminal(browserProcess)) fail("BROWSER_EXITED_BEFORE_START", "浏览器在启动确认后立即退出。 ");
    await state.executable.assertCurrent();
    executableIdentityVerifiedAfterLaunch = true;
    await state.executable.close();
    executableClosed = true;

    const runFields = {
      schemaVersion: "1.0.0",
      browserFamily: preflight.browserFamily,
      displayMode: preflight.displayMode,
      browserExecutableRawSha256: preflight.browserExecutableRawSha256,
      seatId: serverCapability.seatId,
      reviewCycleId: serverCapability.reviewCycleId,
      pairRunId: serverCapability.pairRunId,
      entryUrl: serverCapability.entryUrl,
      sessionRoot: session.canonicalSessionRoot,
      checks: Object.freeze({
        currentProcessVerifiedServerPayloadConsumedExactlyOnce: true,
        randomLoopbackServerStarted: true,
        freshRepositoryExternalSystemTempSessionCreated: true,
        emptyDedicatedBrowserProfileCreated: true,
        explicitUserDataDirArgumentPassed: true,
        extensionsSyncBackgroundNetworkingAndComponentUpdateDisableArgumentsPassed: true,
        noProxyArgumentsPassed: true,
        exactSourceServerAppUrlPassed: true,
        dangerousInheritedEnvironmentKeysExcludedByAllowlist: true,
        shellDisabled: true,
        ...(adapter === null
          ? { browserSpawnObserved: true }
          : { browserSpawnAdapterInvoked: true }),
        browserExecutableIdentityReverifiedBeforeAndAfterSpawn: true,
        testAdapterUsed: adapter !== null
      }),
      cleanupPending: true,
      boundary: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY
    };
    const run = adapter === null
      ? Object.freeze({
        ...runFields,
        recordType: "bazi_expert_single_binding_physical_clean_profile_run_candidate_v1"
      })
      : Object.freeze({
        ...runFields,
        capabilityKind: "single_binding_integrated_physical_clean_profile_test_run_in_process",
        testAdapterUsed: true,
        admissibleRuntimeRecord: false
      });
    const runState = {
      lifecycleKind: adapter === null ? "run" : "test_run",
      publicCapability: run,
      serverCapability,
      serverClosed: false,
      serverCloseResult: null,
      serverRuntimeErrorObserved: false,
      browserProcess,
      browserExitPromise,
      browserExitObservation: null,
      browserClosed: false,
      browserTerminationRequested: false,
      terminateBrowser: adapter?.terminateBrowser ?? terminateBrowserDefault,
      ...session,
      sessionRemoved: false,
      executableIdentityVerifiedBeforeLaunch,
      executableIdentityVerifiedAfterLaunch,
      browserExecutableHandleClosed: executableClosed,
      executable: null,
      serverStartAttempted: true,
      serverPayloadCapability: null,
      serverPayloadReleased: true,
      serverStartSucceeded: true,
      browserProcessCreated: true,
      sessionCreated: true,
      stopPromise: null,
      completedObservation: null
    };
    RUN_STATES.set(run, runState);
    state.status = "consumed";
    PREFLIGHT_STATES.delete(preflight);
    browserExitPromise.then((observation) => {
      runState.browserExitObservation = observation;
      runState.browserClosed = observation.kind === "exit";
      if (!runState.stopPromise && !runState.completedObservation) {
        void closeRuntimeResources(runState, "browser_exit").catch(() => {});
      }
    });
    return run;
  } catch (error) {
    const cleanupState = {
      lifecycleKind: "failed_start",
      publicCapability: preflight,
      serverCapability,
      serverClosed: serverCapability === null,
      serverCloseResult: null,
      serverRuntimeErrorObserved: false,
      browserProcess,
      browserExitPromise: browserExitPromise ?? Promise.resolve(Object.freeze({ kind: "none", code: null, signal: null })),
      browserExitObservation: null,
      browserClosed: browserProcess === null || browserTerminal(browserProcess),
      browserTerminationRequested: false,
      terminateBrowser: adapter?.terminateBrowser ?? terminateBrowserDefault,
      canonicalTempRoot: session?.canonicalTempRoot ?? null,
      canonicalSessionRoot: session?.canonicalSessionRoot ?? null,
      initialSessionIdentity: session?.initialSessionIdentity ?? null,
      sessionRemoved: session === null,
      executableIdentityVerifiedBeforeLaunch,
      executableIdentityVerifiedAfterLaunch,
      browserExecutableHandleClosed: executableClosed,
      executable: state.executable,
      serverStartAttempted,
      serverPayloadCapability: state.serverPayloadCapability,
      serverPayloadReleased: serverStartAttempted || state.serverPayloadReleased,
      serverStartSucceeded,
      browserProcessCreated,
      sessionCreated: session !== null,
      stopPromise: null,
      completedObservation: null
    };
    RUN_STATES.set(preflight, cleanupState);
    PREFLIGHT_STATES.delete(preflight);
    try {
      await closeRuntimeResources(cleanupState, "start_error");
      RUN_STATES.delete(preflight);
    } catch (cleanupError) {
      throw cleanupError;
    }
    if (error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError) throw error;
    fail("CLEAN_PROFILE_START_FAILED", "clean-profile runner 启动失败且已完成可确认清理。 ");
  }
}

export async function stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run, reason = "operator") {
  if (!new Set(["operator", "browser_exit", "error"]).has(reason)) {
    fail("STOP_REASON_INVALID", "stop reason 无效。 ");
  }
  const completed = run && COMPLETED_RUNS.get(run);
  if (completed) return completed;
  const state = run && RUN_STATES.get(run);
  if (!state) fail("RUN_CAPABILITY_INVALID", "run capability 无效或伪造。 ");
  const observation = await closeRuntimeResources(state, reason);
  RUN_STATES.delete(run);
  return observation;
}
