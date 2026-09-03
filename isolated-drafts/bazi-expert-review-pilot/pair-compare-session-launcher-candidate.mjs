import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { types as utilTypes } from "node:util";
import {
  SYNTHETIC_PAIR_PAYLOAD_PATHS,
  createSyntheticPairComparisonServer
} from "./pair-compare-synthetic-server.mjs";
import { removePilotSessionProfileIfExact } from "./return-verifier.mjs";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const OWNER_DECISION_CODE = "synthetic_fixture_visual_qa_only_approved";
const WRAPPER_MARKER = "powershell-no-profile-pair-compare-synthetic-launcher-v1";
const SOURCE_BUNDLE_DOMAIN = "hakimi/bazi/expert-review-pilot/synthetic-pair-viewer-source-bundle/v1";
const RUNTIME_PROBE_METHOD = "fresh_profile_devtools_active_port_loopback_cdp_reload_v1";
const IS_PROXY = utilTypes.isProxy;
const SYNTHETIC_PAGE_TITLE = "八字两席合成并列自检";
const SYNTHETIC_PAGE_HEADING = "两席合成并列自检";
const SYNTHETIC_PAGE_STATUS_INITIAL = "尚未运行。";
const SYNTHETIC_PAGE_STATUS_PASSED = "合成自检完成；没有读取任何外部回件。";
const SYNTHETIC_PAGE_RUN_LABEL = "运行合成 A/B 自检";
const SYNTHETIC_PAGE_STOP_LINE = "没有赢家、评分、投票、平均、自动合并或正式 reconciliation。";
const SYNTHETIC_RUNTIME_ALLOWED_PATHS = Object.freeze([
  "/",
  "/contract.js",
  "/data/questions.js",
  "/data/scenarios.js",
  "/pair-comparison.js",
  "/pair-compare-synthetic.css",
  "/pair-compare-synthetic-icon.svg",
  "/pair-compare-synthetic.js"
]);
const SYNTHETIC_RUNTIME_REQUIRED_RESOURCE_PATHS = Object.freeze(
  SYNTHETIC_RUNTIME_ALLOWED_PATHS.filter((path) => !["/", "/pair-compare-synthetic-icon.svg"].includes(path))
);
const SYNTHETIC_RUNTIME_REQUIRED_REQUEST_PATHS = Object.freeze(
  SYNTHETIC_RUNTIME_ALLOWED_PATHS.filter((path) => path !== "/pair-compare-synthetic-icon.svg")
);
const ALLOWED_AUXILIARY_BROWSER_UI_HREFS = Object.freeze([
  "chrome://omnibox-popup.top-chrome/",
  "chrome://omnibox-popup.top-chrome/omnibox_popup_aim.html",
  "edge://omnibox-popup.top-chrome/",
  "edge://omnibox-popup.top-chrome/omnibox_popup_aim.html"
]);
const SOURCE_BUNDLE_PATHS = Object.freeze([
  ...SYNTHETIC_PAIR_PAYLOAD_PATHS,
  "pair-compare-session-launcher-candidate.mjs",
  "pair-compare-session-launcher-candidate.ps1",
  "pair-compare-synthetic-server.mjs",
  "return-verifier.mjs"
].sort());
const CHILD_ENV_KEYS = Object.freeze([
  "SystemRoot",
  "WINDIR",
  "ProgramFiles",
  "ProgramFiles(x86)",
  "LOCALAPPDATA",
  "TEMP",
  "TMP"
]);
const INITIAL_ENVIRONMENT = Object.freeze(Object.fromEntries(CHILD_ENV_KEYS.flatMap((key) => {
  const value = process.env[key];
  return typeof value === "string" && value.length > 0 ? [[key, value]] : [];
})));
const INITIAL_NODE_EXEC_ARGV = Object.freeze([...process.execArgv]);
const REFLECT_APPLY = Reflect.apply;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const WEB_SOCKET_CONSTRUCTOR = globalThis.WebSocket;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_MAP_SET = WeakMap.prototype.set;
const WEAK_MAP_GET = WeakMap.prototype.get;
const VERIFIED_SOURCE_OBSERVATIONS = new WeakSet();
const VERIFIED_BROWSER_OBSERVATIONS = new WeakSet();
const VERIFIED_PREFLIGHTS = new WeakSet();
const ACTIVE_RUNS = new WeakSet();
const VERIFIED_RUNTIME_PROBES = new WeakSet();
const VERIFIED_TEST_ADAPTERS = new WeakSet();
const VERIFIED_STOP_OBSERVATIONS = new WeakSet();
const VERIFIED_FINAL_SESSION_OBSERVATIONS = new WeakSet();
const PRIVATE_SOURCE_STATE = new WeakMap();
const PRIVATE_BROWSER_STATE = new WeakMap();
const PRIVATE_PREFLIGHT_STATE = new WeakMap();
const PRIVATE_RUN_STATE = new WeakMap();
const PRIVATE_TEST_ADAPTER_STATE = new WeakMap();
const PRIVATE_RUNTIME_PROBE_STATE = new WeakMap();
const PRIVATE_STOP_OBSERVATION_STATE = new WeakMap();

export const SYNTHETIC_PAIR_LAUNCH_BOUNDARY = Object.freeze({
  syntheticFixtureOnly: true,
  realReturnLoadingAuthorized: false,
  syntheticQaDecisionLiteralMatched: true,
  ownerIdentityEstablished: false,
  ownerAuthorizationAuthenticityEstablished: false,
  sourceBundleExternalPinMatched: true,
  sourceBundlePinProvenanceVerified: false,
  sourceBundleSignatureVerified: false,
  browserExecutableExternalPinMatched: true,
  browserExecutablePinProvenanceVerified: false,
  browserPublisherSignatureVerified: false,
  runningProcessImageVerified: false,
  runtimeBrowserFamilySelfReportVerified: false,
  devToolsEndpointBoundToSpawnedProcess: false,
  browserHonoredUserDataDirVerified: false,
  browserProfileIsolationEstablished: false,
  preexistingServiceWorkerExcluded: false,
  browserExtensionInterceptionExcluded: false,
  externalNetworkExcluded: false,
  initialSyntheticNavigationObserved: false,
  continuousTargetDiscoveryEstablished: false,
  browserWideNetworkObserved: false,
  responseBodyDigestVerified: false,
  requestResponseLoaderCorrelationEstablished: false,
  fromServiceWorkerExcluded: false,
  remoteEndpointIdentityVerified: false,
  gracefulBrowserCloseCausalityEstablished: false,
  browserProcessTreeClosureEstablished: false,
  osProcessListPathExposureExcluded: false,
  crashDumpPathExposureExcluded: false,
  trustedBootstrapEstablished: false,
  wrapperIdentityEstablished: false,
  nodeRuntimeIdentityEstablished: false,
  launcherIdentityEstablished: false,
  samePrivilegeIntervalMutationExcluded: false,
  abaExcluded: false,
  replayExcluded: false,
  cleanupAtomicityEstablished: false,
  physicalErasureEstablished: false,
  actualHumanParticipationEstablished: false,
  actualHumanIndependenceEstablished: false,
  reviewerIdentityEstablished: false,
  reviewerQualificationEstablished: false,
  reviewerScopeEstablished: false,
  reviewerConsentEstablished: false,
  opinionAuthenticityEstablished: false,
  trustedFirstSeenEstablished: false,
  custodyEstablished: false,
  humanAttestationEstablished: false,
  personDataPresenceAssessed: false,
  personDerivedDigestExcluded: false,
  safeToPublish: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  expertVsAiAccuracyEvaluated: false,
  predictiveAccuracyEvaluated: false,
  rightsLegalConclusionEstablished: false,
  countsTowardFormal2of2: false,
  countsTowardExpertGate: false,
  formalTwoOfTwoCountDelta: 0,
  expertGateCountDelta: 0,
  bindingFrozenCountDelta: 0,
  verifiedExpertCountDelta: 0,
  formalAdmissionAllowed: false,
  pilotToFormalConversionAllowed: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false
});

export class SyntheticPairLauncherCandidateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SyntheticPairLauncherCandidateError";
    this.code = code;
  }
}

export function createSyntheticPairLauncherTestAdapter(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input) || IS_PROXY(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) {
    fail("TEST_ADAPTER_FACTORY_INPUT_INVALID", "test adapter factory input 无效。 ");
  }
  const keys = Reflect.ownKeys(input);
  const allowedKeys = new Set([
    "collectRuntimeProbe",
    "spawnBrowser",
    "terminateBrowser",
    "webSocketConstructor"
  ]);
  if (keys.length === 0 || keys.some((key) => typeof key !== "string" || !allowedKeys.has(key))) {
    fail("TEST_ADAPTER_FACTORY_INPUT_INVALID", "test adapter factory input 字段闭集无效。 ");
  }
  const captured = Object.create(null);
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || typeof descriptor.value !== "function") {
      fail("TEST_ADAPTER_FACTORY_INPUT_INVALID", "test adapter factory 只接受自有 data function。 ");
    }
    captured[key] = descriptor.value;
  }
  const hasSpawn = Object.hasOwn(captured, "spawnBrowser");
  const hasTerminate = Object.hasOwn(captured, "terminateBrowser");
  if (hasSpawn !== hasTerminate) {
    fail("TEST_ADAPTER_FACTORY_INPUT_INVALID", "spawnBrowser 与 terminateBrowser test adapter 必须成对。 ");
  }
  const capability = Object.freeze(Object.create(null));
  call(WEAK_MAP_SET, PRIVATE_TEST_ADAPTER_STATE, [capability, Object.freeze(captured)]);
  call(WEAK_SET_ADD, VERIFIED_TEST_ADAPTERS, [capability]);
  return capability;
}

function resolveSyntheticPairLauncherTestAdapter(capability, purpose) {
  if (!capability || !call(WEAK_SET_HAS, VERIFIED_TEST_ADAPTERS, [capability])) {
    fail("RUNTIME_ADAPTER_INVALID", `${purpose} 只接受本模块 test adapter factory 产生的 capability。 `);
  }
  return call(WEAK_MAP_GET, PRIVATE_TEST_ADAPTER_STATE, [capability]);
}

function call(fn, thisArg, args) {
  return REFLECT_APPLY(fn, thisArg, args);
}

function fail(code, message) {
  throw new SyntheticPairLauncherCandidateError(code, message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function identity(metadata) {
  return [metadata.dev, metadata.ino, metadata.nlink, metadata.size, metadata.mtimeNs, metadata.ctimeNs]
    .map(String)
    .join(":");
}

async function stableReadExactSource(relativePath, maxBytes = 8 * 1024 * 1024) {
  if (!SOURCE_BUNDLE_PATHS.includes(relativePath)) fail("SOURCE_PATH_INVALID", "source bundle path 不在固定闭集。 ");
  const target = resolve(SOURCE_ROOT, ...relativePath.split("/"));
  const relationToRoot = relative(SOURCE_ROOT, target);
  if (!relationToRoot || relationToRoot.startsWith("..") || relationToRoot.includes(":")) {
    fail("SOURCE_PATH_INVALID", "source bundle path 越界。 ");
  }
  let before;
  let canonical;
  try {
    before = await lstat(target, { bigint: true });
    canonical = await realpath(target);
  } catch {
    fail("SOURCE_ENDPOINT_INVALID", "source bundle endpoint 不可用。 ");
  }
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || before.size <= 0n || before.size > BigInt(maxBytes)
    || canonical.toLowerCase() !== target.toLowerCase()) {
    fail("SOURCE_ENDPOINT_INVALID", "source bundle endpoint 不是固定普通单链接文件。 ");
  }
  const bytes = await readFile(canonical);
  const after = await lstat(target, { bigint: true });
  const canonicalAfter = await realpath(target);
  if (bytes.byteLength !== Number(before.size)
    || identity(before) !== identity(after)
    || canonicalAfter.toLowerCase() !== canonical.toLowerCase()) {
    fail("SOURCE_ENDPOINT_CHANGED", "source bundle endpoint 在读取期间变化。 ");
  }
  return Object.freeze({
    relativePath,
    byteLength: bytes.byteLength,
    sha256: sha256(bytes),
    bytes
  });
}

export async function observeSyntheticPairViewerSourceBundleCandidate() {
  const first = [];
  for (const path of SOURCE_BUNDLE_PATHS) first.push(await stableReadExactSource(path));
  const second = [];
  for (const path of SOURCE_BUNDLE_PATHS) second.push(await stableReadExactSource(path));
  const publicRecords = first.map(({ relativePath, byteLength, sha256: digest }) => ({
    relativePath,
    byteLength,
    sha256: digest
  }));
  const secondRecords = second.map(({ relativePath, byteLength, sha256: digest }) => ({
    relativePath,
    byteLength,
    sha256: digest
  }));
  if (JSON.stringify(publicRecords) !== JSON.stringify(secondRecords)) {
    fail("SOURCE_BUNDLE_CHANGED", "source bundle 两次观察不一致。 ");
  }
  const sourceBundleSha256 = sha256(Buffer.from(
    `${SOURCE_BUNDLE_DOMAIN}\0${JSON.stringify(publicRecords)}`,
    "utf8"
  ));
  const observation = Object.freeze({
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_pair_compare_source_observation_candidate_v1",
    sourceBundleSha256,
    sourceFileCount: publicRecords.length,
    sourceFiles: Object.freeze(publicRecords.map(Object.freeze)),
    checks: Object.freeze({
      fixedSourceSetObservedTwice: true,
      eachEndpointOrdinarySingleLinkFile: true,
      eachEndpointRawSha256Computed: true,
      syntheticBrowserPayloadsCapturedInMemory: true
    }),
    boundary: Object.freeze({
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      sourceAuthenticityEstablished: false,
      pinProvenanceVerified: false,
      signatureVerified: false,
      formalAdmissionAllowed: false
    })
  });
  const payloads = new Map();
  for (const item of first) {
    if (SYNTHETIC_PAIR_PAYLOAD_PATHS.includes(item.relativePath)) {
      payloads.set(item.relativePath, Buffer.from(item.bytes));
    }
  }
  call(WEAK_MAP_SET, PRIVATE_SOURCE_STATE, [observation, Object.freeze({ payloads })]);
  call(WEAK_SET_ADD, VERIFIED_SOURCE_OBSERVATIONS, [observation]);
  return observation;
}

function browserCandidatePaths(browserFamily) {
  const candidates = browserFamily === "chrome"
    ? [
      INITIAL_ENVIRONMENT.ProgramFiles && join(INITIAL_ENVIRONMENT.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe"),
      INITIAL_ENVIRONMENT["ProgramFiles(x86)"] && join(INITIAL_ENVIRONMENT["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe"),
      INITIAL_ENVIRONMENT.LOCALAPPDATA && join(INITIAL_ENVIRONMENT.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
    ]
    : [
      INITIAL_ENVIRONMENT["ProgramFiles(x86)"] && join(INITIAL_ENVIRONMENT["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
      INITIAL_ENVIRONMENT.ProgramFiles && join(INITIAL_ENVIRONMENT.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe")
    ];
  return candidates.filter((value) => typeof value === "string");
}

async function inspectBrowserExecutableCandidate(browserFamily) {
  if (!new Set(["chrome", "edge"]).has(browserFamily)) fail("BROWSER_FAMILY_INVALID", "browser family 只能是 chrome 或 edge。 ");
  const candidates = browserCandidatePaths(browserFamily);
  for (let index = 0; index < candidates.length; index += 1) {
    const target = resolve(candidates[index]);
    let before;
    let canonical;
    try {
      before = await lstat(target, { bigint: true });
      canonical = await realpath(target);
    } catch {
      continue;
    }
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
      || before.size <= 0n || before.size > 512n * 1024n * 1024n
      || canonical.toLowerCase() !== target.toLowerCase()) continue;
    const bytes = await readFile(canonical);
    const after = await lstat(target, { bigint: true });
    const canonicalAfter = await realpath(target);
    if (bytes.byteLength !== Number(before.size) || identity(before) !== identity(after)
      || canonicalAfter.toLowerCase() !== canonical.toLowerCase()) {
      fail("BROWSER_EXECUTABLE_CHANGED", "浏览器 executable 在读取期间变化。 ");
    }
    const observation = Object.freeze({
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_pilot_pair_compare_browser_executable_observation_candidate_v1",
      browserFamily,
      executableFileName: basename(canonical).toLowerCase(),
      fixedCandidateIndex: index,
      byteLength: bytes.byteLength,
      rawSha256: sha256(bytes),
      checks: Object.freeze({
        fixedInstallCandidateSelected: true,
        ordinarySingleLinkFileObserved: true,
        rawSha256Computed: true,
        defaultBrowserFallbackUsed: false
      }),
      boundary: Object.freeze({
        publisherSignatureVerified: false,
        runningProcessImageVerified: false,
        dllSetVerified: false,
        osTrustEstablished: false,
        pinProvenanceVerified: false
      })
    });
    call(WEAK_MAP_SET, PRIVATE_BROWSER_STATE, [observation, Object.freeze({ canonicalExecutable: canonical })]);
    call(WEAK_SET_ADD, VERIFIED_BROWSER_OBSERVATIONS, [observation]);
    return observation;
  }
  fail("BROWSER_EXECUTABLE_NOT_FOUND", `未找到固定位置的 ${browserFamily} executable；不回退默认浏览器。 `);
}

export async function observeSyntheticPairViewerLaunchMaterialsCandidate({ browserFamily } = {}) {
  const [sourceObservation, browserObservation] = await Promise.all([
    observeSyntheticPairViewerSourceBundleCandidate(),
    inspectBrowserExecutableCandidate(browserFamily)
  ]);
  return Object.freeze({
    sourceObservation,
    browserObservation,
    boundary: Object.freeze({
      observationOnly: true,
      externalPinAuthorityEstablished: false,
      launchAuthorized: false,
      realReturnLoadingAuthorized: false
    })
  });
}

function assertExactPreflightRequest(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    fail("PREFLIGHT_REQUEST_INVALID", "launch preflight request 无效。 ");
  }
  const keys = Object.keys(request).sort().join(",");
  if (keys !== "browserFamily,expectedBrowserExecutableRawSha256,expectedViewerSourceBundleSha256,ownerDecisionCode,realReturnLoadingAuthorized") {
    fail("PREFLIGHT_REQUEST_INVALID", "launch preflight request 字段闭集无效。 ");
  }
  if (request.ownerDecisionCode !== OWNER_DECISION_CODE || request.realReturnLoadingAuthorized !== false) {
    fail("SYNTHETIC_ONLY_DECISION_REQUIRED", "只接受 synthetic fixture visual QA 决定且真实回件必须明确禁止。 ");
  }
  if (!new Set(["chrome", "edge"]).has(request.browserFamily)) fail("BROWSER_FAMILY_INVALID", "browser family 无效。 ");
  for (const [label, value] of [
    ["viewer source", request.expectedViewerSourceBundleSha256],
    ["browser executable", request.expectedBrowserExecutableRawSha256]
  ]) {
    if (typeof value !== "string" || !SHA256_PATTERN.test(value) || /^0{64}$/u.test(value)) {
      fail("EXTERNAL_PIN_INVALID", `${label} external pin 必须是非零 64 位小写 SHA-256。 `);
    }
  }
  return Object.freeze({ ...request });
}

export async function preflightSyntheticPairViewerLaunchCandidate(request) {
  const expected = assertExactPreflightRequest(request);
  const [sourceObservation, browserObservation] = await Promise.all([
    observeSyntheticPairViewerSourceBundleCandidate(),
    inspectBrowserExecutableCandidate(expected.browserFamily)
  ]);
  if (sourceObservation.sourceBundleSha256 !== expected.expectedViewerSourceBundleSha256) {
    fail("VIEWER_SOURCE_PIN_MISMATCH", "viewer source bundle 与外部 pin 不匹配。 ");
  }
  if (browserObservation.rawSha256 !== expected.expectedBrowserExecutableRawSha256) {
    fail("BROWSER_EXECUTABLE_PIN_MISMATCH", "browser executable 与外部 pin 不匹配。 ");
  }
  const sourceState = call(WEAK_MAP_GET, PRIVATE_SOURCE_STATE, [sourceObservation]);
  const browserState = call(WEAK_MAP_GET, PRIVATE_BROWSER_STATE, [browserObservation]);
  const preflight = Object.freeze({
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_pair_compare_clean_profile_preflight_candidate_v1",
    ownerDecisionCode: OWNER_DECISION_CODE,
    viewerSourceBundleSha256: sourceObservation.sourceBundleSha256,
    browserFamily: browserObservation.browserFamily,
    browserExecutableRawSha256: browserObservation.rawSha256,
    checks: Object.freeze({
      externalViewerSourcePinMatched: true,
      externalBrowserExecutablePinMatched: true,
      noCallerSuppliedPathAccepted: true,
      realReturnLoadingRejected: true,
      syntheticEntryHasNoFileInput: true
    }),
    boundary: SYNTHETIC_PAIR_LAUNCH_BOUNDARY
  });
  call(WEAK_MAP_SET, PRIVATE_PREFLIGHT_STATE, [preflight, Object.freeze({
    payloads: sourceState.payloads,
    canonicalBrowserExecutable: browserState.canonicalExecutable
  })]);
  call(WEAK_SET_ADD, VERIFIED_PREFLIGHTS, [preflight]);
  return preflight;
}

function sanitizedChildEnvironment() {
  return { ...INITIAL_ENVIRONMENT };
}

function listenRandomLoopback(server) {
  return new Promise((resolveListen, rejectListen) => {
    const onError = () => rejectListen(new SyntheticPairLauncherCandidateError(
      "PAIR_SERVER_LISTEN_FAILED",
      "synthetic pair server 无法监听随机 loopback。 "
    ));
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      const address = server.address();
      if (!address || typeof address === "string" || address.address !== "127.0.0.1") {
        rejectListen(new SyntheticPairLauncherCandidateError("PAIR_SERVER_IDENTITY_INVALID", "synthetic pair server 地址无效。 "));
        return;
      }
      resolveListen(address.port);
    });
  });
}

function waitForSpawn(child, timeoutMs = 5_000) {
  if (browserProcessTerminal(child)) {
    return Promise.reject(new SyntheticPairLauncherCandidateError(
      "BROWSER_EXITED_BEFORE_START",
      "隔离浏览器在启动确认前已经退出。 "
    ));
  }
  return new Promise((resolveSpawn, rejectSpawn) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("spawn", onSpawn);
      child.off("error", onError);
      child.off("exit", onEarlyExit);
      if (error) rejectSpawn(error); else resolveSpawn();
    };
    const onSpawn = () => finish();
    const onError = () => finish(new SyntheticPairLauncherCandidateError("BROWSER_SPAWN_FAILED", "隔离浏览器未启动。 "));
    const onEarlyExit = () => finish(new SyntheticPairLauncherCandidateError("BROWSER_EXITED_BEFORE_START", "隔离浏览器在启动确认前退出。 "));
    const timer = setTimeout(() => finish(new SyntheticPairLauncherCandidateError("BROWSER_SPAWN_TIMEOUT", "隔离浏览器启动确认超时。 ")), timeoutMs);
    child.once("spawn", onSpawn);
    child.once("error", onError);
    child.once("exit", onEarlyExit);
  });
}

function closeServerBounded(server, timeoutMs = 3_000) {
  return new Promise((resolveClose) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolveClose(false);
    }, timeoutMs);
    server.close(() => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveClose(true);
    });
  });
}

function browserProcessTerminal(child) {
  return child !== null && typeof child === "object"
    && ((child.exitCode !== null && child.exitCode !== undefined)
      || (child.signalCode !== null && child.signalCode !== undefined));
}

function browserExitObservation(child) {
  if (browserProcessTerminal(child)) return Promise.resolve(Object.freeze({
    kind: "exit",
    code: child.exitCode ?? null,
    signal: child.signalCode ?? null
  }));
  return new Promise((resolveExit) => {
    child.once("exit", (code, signal) => resolveExit(Object.freeze({ kind: "exit", code, signal })));
    child.once("error", () => resolveExit(Object.freeze({ kind: "error", code: null, signal: null })));
  });
}

async function waitBounded(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((resolveTimeout) => {
    timer = setTimeout(() => resolveTimeout(null), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function terminateBrowserDefault(child, exitObservation) {
  if (browserProcessTerminal(child)) return true;
  if (process.platform === "win32") {
    const systemRoot = INITIAL_ENVIRONMENT.SystemRoot || INITIAL_ENVIRONMENT.WINDIR;
    if (typeof systemRoot !== "string" || !child.pid) return false;
    const taskkillPath = join(systemRoot, "System32", "taskkill.exe");
    const killer = spawn(taskkillPath, ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
      windowsHide: true
    });
    const killOutcome = await waitBounded(new Promise((resolveKill) => {
      killer.once("error", () => resolveKill({ code: null }));
      killer.once("exit", (code) => resolveKill({ code }));
    }), 5_000);
    if (killOutcome === null) {
      try { killer.kill(); } catch { /* best-effort disposal of the helper only */ }
      return false;
    }
    if (killOutcome.code !== 0 && killOutcome.code !== 128) return false;
  } else {
    try { child.kill("SIGTERM"); } catch { return false; }
  }
  const observed = await waitBounded(exitObservation, 5_000);
  return observed?.kind === "exit";
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function removeSessionAfterBrowserQuiescenceCandidate({
  canonicalTempRoot,
  canonicalSessionRoot,
  initialSessionIdentity,
  browserClosed,
  serverClosed,
  testAdapterUsed
}) {
  if (browserClosed !== true || serverClosed !== true) {
    return Object.freeze({
      removed: false,
      reason: "process_shutdown_unconfirmed",
      boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: false
    });
  }
  await delay(testAdapterUsed ? 0 : 500);
  let cleanup = null;
  const attempts = testAdapterUsed ? 1 : 8;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    cleanup = await removePilotSessionProfileIfExact({
      canonicalTempRoot,
      canonicalSessionRoot,
      initialSessionIdentity,
      browserClosed,
      serverClosed
    });
    if (cleanup.removed === true || cleanup.reason !== "recursive_delete_failed") break;
    await delay(250);
  }
  if (cleanup?.removed !== true) {
    return Object.freeze({
      removed: false,
      reason: cleanup?.reason ?? "cleanup_failed",
      boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: false
    });
  }
  const checks = testAdapterUsed ? 1 : 10;
  for (let index = 0; index < checks; index += 1) {
    await delay(testAdapterUsed ? 0 : 100);
    try {
      await lstat(canonicalSessionRoot, { bigint: true });
      return Object.freeze({
        removed: false,
        reason: "endpoint_reappeared_during_bounded_absence_check",
        boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: false
      });
    } catch (error) {
      if (error?.code !== "ENOENT") {
        return Object.freeze({
          removed: false,
          reason: "post_cleanup_absence_state_unknown",
          boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: false
        });
      }
    }
  }
  return Object.freeze({
    removed: true,
    reason: "initial_identity_matched_removal_attempt_returned_and_bounded_repeated_path_absence_observed",
    boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: true
  });
}

function assertPlainExactObject(value, expectedKeys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    fail(code, "runtime probe object 无效。 ");
  }
  const actualKeys = Reflect.ownKeys(value);
  if (actualKeys.some((key) => typeof key !== "string")
    || JSON_STRINGIFY(actualKeys.sort()) !== JSON_STRINGIFY([...expectedKeys].sort())) {
    fail(code, "runtime probe object 字段闭集无效。 ");
  }
}

async function readDevToolsActivePortCandidate(profileRoot, timeoutMs = 10_000) {
  const target = join(profileRoot, "DevToolsActivePort");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const before = await lstat(target, { bigint: true });
      const canonical = await realpath(target);
      if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
        || before.size <= 0n || before.size > 512n
        || canonical.toLowerCase() !== target.toLowerCase()) {
        throw new Error("invalid DevToolsActivePort endpoint");
      }
      const bytes = await readFile(canonical);
      const after = await lstat(target, { bigint: true });
      const canonicalAfter = await realpath(target);
      if (bytes.byteLength !== Number(before.size) || identity(before) !== identity(after)
        || canonicalAfter.toLowerCase() !== canonical.toLowerCase()) {
        throw new Error("DevToolsActivePort changed while reading");
      }
      const match = /^([0-9]{1,5})\r?\n(\/devtools\/browser\/[A-Za-z0-9._-]{8,200})\r?\n?$/u.exec(bytes.toString("utf8"));
      const port = match ? Number(match[1]) : NaN;
      if (!match || !Number.isInteger(port) || port < 1024 || port > 65535) {
        throw new Error("DevToolsActivePort content invalid");
      }
      return Object.freeze({ port, browserWebSocketPath: match[2] });
    } catch {
      await delay(40);
    }
  }
  fail("DEVTOOLS_ACTIVE_PORT_UNAVAILABLE", "隔离 profile 未在时限内产生有效 DevToolsActivePort。 ");
}

function requestLoopbackJsonCandidate({ port, path, timeoutMs = 2_000 }) {
  return new Promise((resolveRequest, rejectRequest) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      if (error) rejectRequest(error); else resolveRequest(value);
    };
    const request = httpRequest({
      hostname: "127.0.0.1",
      port,
      path,
      method: "GET",
      headers: { Host: `127.0.0.1:${port}`, Connection: "close" }
    }, (response) => {
      const chunks = [];
      let byteLength = 0;
      response.on("data", (chunk) => {
        byteLength += chunk.byteLength;
        if (byteLength > 1024 * 1024) {
          response.destroy(new Error("DevTools JSON response too large"));
          return;
        }
        chunks.push(chunk);
      });
      response.once("error", (error) => finish(error));
      response.once("end", () => {
        if (response.statusCode !== 200) {
          finish(new Error("DevTools JSON endpoint rejected request"));
          return;
        }
        try {
          finish(null, JSON_PARSE(Buffer.concat(chunks).toString("utf8")));
        } catch (error) {
          finish(error);
        }
      });
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("DevTools JSON endpoint timed out")));
    request.once("error", (error) => finish(error));
    request.end();
  });
}

function normalizedLoopbackWebSocketUrl(rawUrl, port, expectedPath) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "ws:" || !["127.0.0.1", "localhost"].includes(parsed.hostname)
    || Number(parsed.port) !== port || parsed.username || parsed.password || parsed.search || parsed.hash
    || parsed.pathname !== expectedPath) return null;
  return `ws://127.0.0.1:${port}${expectedPath}`;
}

async function waitForExactDevToolsTargetCandidate(activePort, expectedUrl, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastStage = "endpoint_request";
  while (Date.now() < deadline) {
    try {
      lastStage = "endpoint_request";
      const [version, targets] = await Promise.all([
        requestLoopbackJsonCandidate({ port: activePort.port, path: "/json/version" }),
        requestLoopbackJsonCandidate({ port: activePort.port, path: "/json/list" })
      ]);
      lastStage = "version_shape";
      if (version === null || typeof version !== "object" || Array.isArray(version)
        || typeof version.webSocketDebuggerUrl !== "string") {
        throw new Error("DevTools version shape not ready");
      }
      lastStage = "version_websocket";
      if (normalizedLoopbackWebSocketUrl(
          version.webSocketDebuggerUrl,
          activePort.port,
          activePort.browserWebSocketPath
        ) === null) {
        throw new Error("DevTools browser websocket identity not ready");
      }
      lastStage = "target_count";
      if (!Array.isArray(targets) || targets.length < 1 || targets.length > 16) {
        throw new Error("DevTools endpoint identity not ready");
      }
      lastStage = "exact_page";
      const pageTargets = targets.filter((entry) => entry !== null && typeof entry === "object"
        && !Array.isArray(entry) && entry.type === "page" && entry.url === expectedUrl
        && entry.title === SYNTHETIC_PAGE_TITLE);
      if (pageTargets.length !== 1) {
        throw new Error("exact synthetic page target not ready");
      }
      const [target] = pageTargets;
      const auxiliaryTargets = targets.filter((entry) => entry !== target);
      const auxiliaryIdentities = [];
      lastStage = "auxiliary_targets";
      for (const entry of auxiliaryTargets) {
        if (entry === null || typeof entry !== "object" || Array.isArray(entry)
          || entry.type !== "browser_ui" || entry.title !== "Omnibox Popup"
          || typeof entry.url !== "string" || typeof entry.webSocketDebuggerUrl !== "string") {
          throw new Error("unexpected DevTools target observed");
        }
        const internalUrl = new URL(entry.url);
        const internalIdentity = internalUrl.href;
        if (!ALLOWED_AUXILIARY_BROWSER_UI_HREFS.includes(internalIdentity)
          || auxiliaryIdentities.includes(internalIdentity)) {
          throw new Error("unexpected browser UI target observed");
        }
        let auxiliaryPagePath;
        try {
          auxiliaryPagePath = new URL(entry.webSocketDebuggerUrl).pathname;
        } catch {
          throw new Error("browser UI websocket URL invalid");
        }
        if (!/^\/devtools\/page\/[A-Za-z0-9._-]{8,200}$/u.test(auxiliaryPagePath)
          || normalizedLoopbackWebSocketUrl(
            entry.webSocketDebuggerUrl,
            activePort.port,
            auxiliaryPagePath
          ) === null) {
          throw new Error("browser UI websocket endpoint not loopback");
        }
        auxiliaryIdentities.push(internalIdentity);
      }
      lastStage = "page_websocket";
      let pagePath;
      try {
        pagePath = new URL(target.webSocketDebuggerUrl).pathname;
      } catch {
        throw new Error("page websocket URL invalid");
      }
      if (!/^\/devtools\/page\/[A-Za-z0-9._-]{8,200}$/u.test(pagePath)) {
        throw new Error("page websocket path invalid");
      }
      const pageWebSocketUrl = normalizedLoopbackWebSocketUrl(
        target.webSocketDebuggerUrl,
        activePort.port,
        pagePath
      );
      if (pageWebSocketUrl === null) throw new Error("page websocket endpoint not loopback");
      return Object.freeze({
        pageWebSocketUrl,
        targetListCount: targets.length,
        exactTargetMatchCount: 1,
        auxiliaryBrowserUiTargetCount: auxiliaryTargets.length,
        browserEndpointPathMatchedActivePort: true
      });
    } catch {
      await delay(40);
    }
  }
  fail(`DEVTOOLS_TARGET_UNAVAILABLE_${lastStage.toUpperCase()}`, "未在时限内观察到唯一且精确匹配的合成页面 target。 ");
}

function openCdpClientCandidate(webSocketUrl, timeoutMs = 5_000, WebSocketConstructor = WEB_SOCKET_CONSTRUCTOR) {
  if (typeof WebSocketConstructor !== "function") {
    fail("CDP_WEBSOCKET_UNAVAILABLE", "当前 Node runtime 不提供内建 WebSocket。 ");
  }
  return new Promise((resolveClient, rejectClient) => {
    const socket = new WebSocketConstructor(webSocketUrl);
    const pending = new Map();
    const eventWaiters = new Set();
    const events = [];
    let nextId = 1;
    let opened = false;
    let terminalError = null;
    const openTimer = setTimeout(() => {
      terminalError = new SyntheticPairLauncherCandidateError("CDP_OPEN_TIMEOUT", "CDP loopback 连接超时。 ");
      try { socket.close(); } catch { /* connection disposal only */ }
      rejectClient(terminalError);
    }, timeoutMs);
    const rejectAll = (error, connectionClosed = false) => {
      terminalError ??= error;
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        if (connectionClosed && entry.acceptConnectionClose === true) {
          entry.resolveConnectionClose();
        } else {
          entry.reject(terminalError);
        }
      }
      pending.clear();
      for (const waiter of eventWaiters) {
        clearTimeout(waiter.timer);
        waiter.reject(terminalError);
      }
      eventWaiters.clear();
    };
    socket.addEventListener("error", () => {
      const error = new SyntheticPairLauncherCandidateError("CDP_CONNECTION_FAILED", "CDP loopback 连接失败。 ");
      if (!opened) {
        clearTimeout(openTimer);
        rejectClient(error);
      }
      rejectAll(error);
    });
    socket.addEventListener("close", () => {
      rejectAll(
        new SyntheticPairLauncherCandidateError("CDP_CONNECTION_CLOSED", "CDP loopback 连接已关闭。 "),
        true
      );
    });
    socket.addEventListener("message", (event) => {
      if (terminalError !== null) return;
      const text = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
      if (Buffer.byteLength(text, "utf8") > 4 * 1024 * 1024) {
        rejectAll(new SyntheticPairLauncherCandidateError("CDP_MESSAGE_OVERSIZED", "CDP message 超出上限。 "));
        try { socket.close(); } catch { /* connection disposal only */ }
        return;
      }
      let message;
      try {
        message = JSON_PARSE(text);
      } catch {
        rejectAll(new SyntheticPairLauncherCandidateError("CDP_MESSAGE_INVALID", "CDP message 不是有效 JSON。 "));
        try { socket.close(); } catch { /* connection disposal only */ }
        return;
      }
      if (Number.isInteger(message?.id)) {
        const entry = pending.get(message.id);
        if (!entry) return;
        pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.error) entry.reject(new SyntheticPairLauncherCandidateError("CDP_COMMAND_REJECTED", "CDP command 被拒绝。 "));
        else entry.resolve(message.result ?? {});
        return;
      }
      if (typeof message?.method !== "string") return;
      if (events.length >= 1_000) {
        rejectAll(new SyntheticPairLauncherCandidateError("CDP_EVENT_LIMIT_EXCEEDED", "CDP event 超出固定上限。 "));
        try { socket.close(); } catch { /* connection disposal only */ }
        return;
      }
      const observation = Object.freeze({ method: message.method, params: message.params ?? {} });
      events.push(observation);
      for (const waiter of [...eventWaiters]) {
        if (waiter.method !== observation.method) continue;
        let matched = false;
        try {
          matched = waiter.predicate(observation) === true;
        } catch (error) {
          eventWaiters.delete(waiter);
          clearTimeout(waiter.timer);
          waiter.reject(error);
          continue;
        }
        if (!matched) continue;
        eventWaiters.delete(waiter);
        clearTimeout(waiter.timer);
        waiter.resolve(observation);
      }
    });
    socket.addEventListener("open", () => {
      if (terminalError !== null) return;
      opened = true;
      clearTimeout(openTimer);
      resolveClient(Object.freeze({
        send(method, params = {}, commandTimeoutMs = 5_000) {
          if (terminalError !== null || socket.readyState !== 1) return Promise.reject(
            terminalError ?? new SyntheticPairLauncherCandidateError("CDP_CONNECTION_CLOSED", "CDP connection 不可用。 ")
          );
          const id = nextId;
          nextId += 1;
          return new Promise((resolveCommand, rejectCommand) => {
            const timer = setTimeout(() => {
              pending.delete(id);
              rejectCommand(new SyntheticPairLauncherCandidateError("CDP_COMMAND_TIMEOUT", "CDP command 超时。 "));
            }, commandTimeoutMs);
            pending.set(id, {
              resolve: resolveCommand,
              reject: rejectCommand,
              timer,
              acceptConnectionClose: false,
              resolveConnectionClose: null
            });
            try {
              socket.send(JSON_STRINGIFY({ id, method, params }));
            } catch (error) {
              pending.delete(id);
              clearTimeout(timer);
              rejectCommand(error);
            }
          });
        },
        sendAcceptingConnectionClose(method, params = {}, commandTimeoutMs = 5_000) {
          if (terminalError !== null || socket.readyState !== 1) return Promise.reject(
            terminalError ?? new SyntheticPairLauncherCandidateError("CDP_CONNECTION_CLOSED", "CDP connection 不可用。 ")
          );
          const id = nextId;
          nextId += 1;
          return new Promise((resolveCommand, rejectCommand) => {
            const timer = setTimeout(() => {
              pending.delete(id);
              rejectCommand(new SyntheticPairLauncherCandidateError("CDP_COMMAND_TIMEOUT", "CDP command 超时。 "));
            }, commandTimeoutMs);
            pending.set(id, {
              resolve(result) {
                resolveCommand(Object.freeze({
                  commandResponseObserved: true,
                  connectionClosedBeforeCommandResponseObserved: false,
                  result
                }));
              },
              reject: rejectCommand,
              timer,
              acceptConnectionClose: true,
              resolveConnectionClose() {
                resolveCommand(Object.freeze({
                  commandResponseObserved: false,
                  connectionClosedBeforeCommandResponseObserved: true
                }));
              }
            });
            try {
              socket.send(JSON_STRINGIFY({ id, method, params }));
            } catch (error) {
              pending.delete(id);
              clearTimeout(timer);
              rejectCommand(error);
            }
          });
        },
        waitForEvent(method, eventTimeoutMs = 8_000, predicate = () => true) {
          if (typeof predicate !== "function") return Promise.reject(
            new SyntheticPairLauncherCandidateError("CDP_EVENT_PREDICATE_INVALID", "CDP event predicate 无效。 ")
          );
          return new Promise((resolveEvent, rejectEvent) => {
            const waiter = { method, predicate, resolve: resolveEvent, reject: rejectEvent, timer: null };
            waiter.timer = setTimeout(() => {
              eventWaiters.delete(waiter);
              rejectEvent(new SyntheticPairLauncherCandidateError("CDP_EVENT_TIMEOUT", `CDP ${method} event 超时。 `));
            }, eventTimeoutMs);
            eventWaiters.add(waiter);
          });
        },
        mark() {
          return events.length;
        },
        eventsSince(mark) {
          if (terminalError !== null) throw terminalError;
          return events.slice(mark);
        },
        assertHealthy() {
          if (terminalError !== null || socket.readyState !== 1) {
            throw terminalError ?? new SyntheticPairLauncherCandidateError(
              "CDP_CONNECTION_CLOSED",
              "CDP connection 在最终观察前不可用。 "
            );
          }
        },
        close() {
          if (socket.readyState === 0 || socket.readyState === 1) socket.close();
        }
      }));
    });
  });
}

export async function observeCdpBrowserCloseOrderingWithTestAdapterCandidate(adapterCapability) {
  const adapterState = resolveSyntheticPairLauncherTestAdapter(adapterCapability, "CDP close ordering regression");
  if (typeof adapterState.webSocketConstructor !== "function") {
    fail("RUNTIME_ADAPTER_INVALID", "CDP close ordering test capability 缺少 webSocketConstructor。 ");
  }
  const client = await openCdpClientCandidate(
    "ws://127.0.0.1:1/devtools/browser/synthetic-close-ordering-test",
    500,
    adapterState.webSocketConstructor
  );
  try {
    return await client.sendAcceptingConnectionClose("Browser.close", {}, 500);
  } finally {
    client.close();
  }
}

async function evaluateCdpValueCandidate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: false
  });
  if (result?.exceptionDetails || result?.result?.value === undefined) {
    fail("CDP_RUNTIME_EVALUATION_FAILED", "合成页面 Runtime.evaluate 未返回可用值。 ");
  }
  return result.result.value;
}

async function collectRuntimeProbeThroughCdpCandidate({ profileRoot, expectedUrl }) {
  const activePort = await readDevToolsActivePortCandidate(profileRoot);
  const target = await waitForExactDevToolsTargetCandidate(activePort, expectedUrl);
  const client = await openCdpClientCandidate(target.pageWebSocketUrl);
  try {
    await Promise.all([
      client.send("Page.enable"),
      client.send("Runtime.enable"),
      client.send("Network.enable"),
      client.send("Log.enable")
    ]);
    await client.send("Log.clear");
    const frameTree = await client.send("Page.getFrameTree");
    const previousMainLoaderId = frameTree?.frameTree?.frame?.loaderId;
    if (typeof previousMainLoaderId !== "string" || previousMainLoaderId.length === 0) {
      fail("CDP_MAIN_FRAME_IDENTITY_INVALID", "reload 前主 frame loader 身份无效。 ");
    }
    const mark = client.mark();
    const mainFrameNavigation = client.waitForEvent("Page.frameNavigated", 8_000, (event) => (
      event.params?.frame?.parentId === undefined
      && typeof event.params?.frame?.loaderId === "string"
      && event.params.frame.loaderId !== previousMainLoaderId
      && event.params?.frame?.url === expectedUrl
    ));
    await Promise.all([
      client.send("Page.reload", { ignoreCache: true }),
      mainFrameNavigation
    ]);
    const readyDeadline = Date.now() + 8_000;
    let ready = null;
    while (Date.now() < readyDeadline) {
      try {
        ready = await evaluateCdpValueCandidate(client, `(() => ({
          readyState: document.readyState,
          pageUrl: location.href
        }))()`);
      } catch {
        ready = null;
      }
      if (ready?.readyState === "complete" && ready?.pageUrl === expectedUrl) break;
      await delay(40);
    }
    if (ready?.readyState !== "complete" || ready?.pageUrl !== expectedUrl) {
      fail("CDP_RELOAD_NOT_COMPLETE", "新主 frame 未在时限内完成精确合成页面 reload。 ");
    }
    const initial = await evaluateCdpValueCandidate(client, `(async () => ({
      readyState: document.readyState,
      pageUrl: location.href,
      title: document.title,
      heading: document.querySelector("h1")?.textContent?.trim() ?? null,
      status: document.querySelector("#status")?.textContent?.trim() ?? null,
      runLabel: document.querySelector("#run")?.textContent?.trim() ?? null,
      runButtonCount: document.querySelectorAll("#run").length,
      fileInputCount: document.querySelectorAll('input[type="file"]').length,
      textEntryCount: document.querySelectorAll('input, textarea, [contenteditable="true"]').length,
      resultHidden: document.querySelector("#result")?.hidden ?? null,
      errorHidden: document.querySelector("#error")?.hidden ?? null,
      syntheticCheck: document.body.dataset.syntheticCheck || null,
      serviceWorkerControllerPresent: "serviceWorker" in navigator && navigator.serviceWorker.controller !== null,
      serviceWorkerRegistrationCount: "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
      cacheStorageKeyCount: "caches" in globalThis ? (await caches.keys()).length : 0,
      indexedDbDatabaseCount: typeof indexedDB.databases === "function" ? (await indexedDB.databases()).length : 0,
      localStorageLength: localStorage.length,
      sessionStorageLength: sessionStorage.length,
      resourceUrls: performance.getEntriesByType("resource").map((entry) => entry.name).sort()
    }))()`);
    await evaluateCdpValueCandidate(client, `(() => {
      const button = document.getElementById("run");
      if (!(button instanceof HTMLButtonElement)) return false;
      button.click();
      return true;
    })()`);
    let completed = null;
    const completionDeadline = Date.now() + 8_000;
    while (Date.now() < completionDeadline) {
      completed = await evaluateCdpValueCandidate(client, `(async () => ({
        syntheticCheck: document.body.dataset.syntheticCheck || null,
        status: document.querySelector("#status")?.textContent?.trim() ?? null,
        resultHidden: document.querySelector("#result")?.hidden ?? null,
        errorHidden: document.querySelector("#error")?.hidden ?? null,
        totalFields: document.querySelector("#total-fields")?.textContent?.trim() ?? null,
        matchingFields: document.querySelector("#matching-fields")?.textContent?.trim() ?? null,
        differenceFields: document.querySelector("#difference-fields")?.textContent?.trim() ?? null,
        formalCount: document.querySelector("#formal-count")?.textContent?.trim() ?? null,
        differenceSummary: document.querySelector("#difference-summary")?.textContent?.trim() ?? null,
        stopLine: document.querySelector(".stop-line")?.textContent?.trim() ?? null,
        activeElementId: document.activeElement?.id || null,
        runButtonDisabled: document.querySelector("#run")?.disabled ?? null,
        serviceWorkerRegistrationCount: "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
        cacheStorageKeyCount: "caches" in globalThis ? (await caches.keys()).length : 0,
        indexedDbDatabaseCount: typeof indexedDB.databases === "function" ? (await indexedDB.databases()).length : 0,
        localStorageLength: localStorage.length,
        sessionStorageLength: sessionStorage.length
      }))()`);
      if (completed?.syntheticCheck === "passed") break;
      await delay(40);
    }
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 390,
      screenHeight: 844
    });
    let mobile;
    try {
      await delay(40);
      mobile = await evaluateCdpValueCandidate(client, `(() => ({
        innerWidth,
        innerHeight,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth
      }))()`);
    } finally {
      await client.send("Emulation.clearDeviceMetricsOverride");
    }
    await delay(40);
    client.assertHealthy();
    const events = client.eventsSince(mark);
    const requestObservations = events
      .filter((event) => event.method === "Network.requestWillBeSent")
      .map((event) => ({ method: event.params?.request?.method, url: event.params?.request?.url }));
    const responseObservations = events
      .filter((event) => event.method === "Network.responseReceived")
      .map((event) => ({ status: event.params?.response?.status, url: event.params?.response?.url }));
    return {
      devToolsActivePortFileObserved: true,
      browserEndpointPathMatchedActivePort: target.browserEndpointPathMatchedActivePort,
      targetListCount: target.targetListCount,
      exactTargetMatchCount: target.exactTargetMatchCount,
      auxiliaryBrowserUiTargetCount: target.auxiliaryBrowserUiTargetCount,
      initial,
      completed,
      mobile,
      requestObservations,
      responseObservations,
      loadingFailureCount: events.filter((event) => event.method === "Network.loadingFailed").length,
      runtimeExceptionCount: events.filter((event) => event.method === "Runtime.exceptionThrown").length,
      consoleWarningOrErrorCount: events.filter((event) => event.method === "Runtime.consoleAPICalled"
        && ["warning", "error"].includes(event.params?.type)).length,
      logWarningOrErrorCount: events.filter((event) => event.method === "Log.entryAdded"
        && ["warning", "error"].includes(event.params?.entry?.level)).length
    };
  } finally {
    client.close();
  }
}

async function requestGracefulBrowserCloseThroughCdpCandidate(profileRoot) {
  const activePort = await readDevToolsActivePortCandidate(profileRoot, 3_000);
  const version = await requestLoopbackJsonCandidate({
    port: activePort.port,
    path: "/json/version",
    timeoutMs: 2_000
  });
  if (version === null || typeof version !== "object" || Array.isArray(version)
    || typeof version.webSocketDebuggerUrl !== "string") {
    fail("CDP_BROWSER_ENDPOINT_INVALID", "Browser.close 前的 DevTools browser endpoint 无效。 ");
  }
  const browserWebSocketUrl = normalizedLoopbackWebSocketUrl(
    version.webSocketDebuggerUrl,
    activePort.port,
    activePort.browserWebSocketPath
  );
  if (browserWebSocketUrl === null) {
    fail("CDP_BROWSER_ENDPOINT_INVALID", "Browser.close 前的 DevTools browser endpoint 未精确匹配 ActivePort。 ");
  }
  const client = await openCdpClientCandidate(browserWebSocketUrl, 3_000);
  try {
    client.assertHealthy();
    const outcome = await client.sendAcceptingConnectionClose("Browser.close", {}, 5_000);
    return Object.freeze({
      commandDispatchedObserved: true,
      commandResponseObserved: outcome.commandResponseObserved === true,
      connectionClosedBeforeCommandResponseObserved:
        outcome.connectionClosedBeforeCommandResponseObserved === true
    });
  } finally {
    client.close();
  }
}

function exactAllowedRuntimeUrl(rawUrl, expectedUrl) {
  if (typeof rawUrl !== "string") return null;
  let actual;
  let expected;
  try {
    actual = new URL(rawUrl);
    expected = new URL(expectedUrl);
  } catch {
    return null;
  }
  if (actual.protocol !== "http:" || actual.origin !== expected.origin
    || actual.username || actual.password || actual.search || actual.hash
    || !SYNTHETIC_RUNTIME_ALLOWED_PATHS.includes(actual.pathname)) return null;
  return actual.pathname;
}

function validateRuntimeProbeRawCandidate(raw, expectedUrl) {
  assertPlainExactObject(raw, [
    "auxiliaryBrowserUiTargetCount", "browserEndpointPathMatchedActivePort", "completed", "consoleWarningOrErrorCount",
    "devToolsActivePortFileObserved", "exactTargetMatchCount", "initial",
    "loadingFailureCount", "logWarningOrErrorCount", "mobile", "requestObservations",
    "responseObservations", "runtimeExceptionCount", "targetListCount"
  ], "RUNTIME_PROBE_SHAPE_INVALID");
  if (raw.devToolsActivePortFileObserved !== true
    || raw.browserEndpointPathMatchedActivePort !== true
    || !Number.isInteger(raw.auxiliaryBrowserUiTargetCount)
    || raw.auxiliaryBrowserUiTargetCount < 0 || raw.auxiliaryBrowserUiTargetCount > 2
    || raw.targetListCount !== 1 + raw.auxiliaryBrowserUiTargetCount
    || raw.exactTargetMatchCount !== 1) {
    fail("RUNTIME_PROBE_TARGET_INVALID", "runtime probe 未绑定唯一合成页面 target。 ");
  }
  assertPlainExactObject(raw.initial, [
    "cacheStorageKeyCount", "errorHidden", "fileInputCount", "heading",
    "indexedDbDatabaseCount", "localStorageLength", "pageUrl", "readyState",
    "resourceUrls", "resultHidden", "runButtonCount", "runLabel",
    "serviceWorkerControllerPresent", "serviceWorkerRegistrationCount",
    "sessionStorageLength", "status", "syntheticCheck", "textEntryCount", "title"
  ], "RUNTIME_PROBE_INITIAL_INVALID");
  if (raw.initial.readyState !== "complete" || raw.initial.pageUrl !== expectedUrl
    || raw.initial.title !== SYNTHETIC_PAGE_TITLE || raw.initial.heading !== SYNTHETIC_PAGE_HEADING
    || raw.initial.status !== SYNTHETIC_PAGE_STATUS_INITIAL || raw.initial.runLabel !== SYNTHETIC_PAGE_RUN_LABEL
    || raw.initial.runButtonCount !== 1 || raw.initial.fileInputCount !== 0
    || raw.initial.textEntryCount !== 0 || raw.initial.resultHidden !== true
    || raw.initial.errorHidden !== true || raw.initial.syntheticCheck !== null
    || raw.initial.serviceWorkerControllerPresent !== false
    || raw.initial.serviceWorkerRegistrationCount !== 0 || raw.initial.cacheStorageKeyCount !== 0
    || raw.initial.indexedDbDatabaseCount !== 0 || raw.initial.localStorageLength !== 0
    || raw.initial.sessionStorageLength !== 0) {
    fail("RUNTIME_PROBE_INITIAL_INVALID", "runtime probe 初始页面身份、输入面或 origin storage 状态不符。 ");
  }
  if (!Array.isArray(raw.initial.resourceUrls)) {
    fail("RUNTIME_PROBE_RESOURCE_SET_INVALID", "runtime probe resource 集合无效。 ");
  }
  const resourcePaths = raw.initial.resourceUrls.map((url) => exactAllowedRuntimeUrl(url, expectedUrl));
  const distinctResourcePaths = [...new Set(resourcePaths)].sort();
  if (resourcePaths.some((path) => path === null)
    || SYNTHETIC_RUNTIME_REQUIRED_RESOURCE_PATHS.some((path) => !distinctResourcePaths.includes(path))
    || distinctResourcePaths.some((path) => path === "/")
    || distinctResourcePaths.length > SYNTHETIC_RUNTIME_ALLOWED_PATHS.length - 1) {
    fail("RUNTIME_PROBE_RESOURCE_SET_INVALID", "runtime probe 观察到未知或缺失页面资源。 ");
  }
  assertPlainExactObject(raw.completed, [
    "activeElementId", "cacheStorageKeyCount", "differenceFields", "differenceSummary",
    "errorHidden", "formalCount", "indexedDbDatabaseCount", "localStorageLength",
    "matchingFields", "resultHidden", "runButtonDisabled", "serviceWorkerRegistrationCount",
    "sessionStorageLength", "status", "stopLine", "syntheticCheck", "totalFields"
  ], "RUNTIME_PROBE_RESULT_INVALID");
  if (raw.completed.syntheticCheck !== "passed" || raw.completed.status !== SYNTHETIC_PAGE_STATUS_PASSED
    || raw.completed.resultHidden !== false || raw.completed.errorHidden !== true
    || raw.completed.totalFields !== "58" || raw.completed.matchingFields !== "54"
    || raw.completed.differenceFields !== "4" || raw.completed.formalCount !== "0"
    || raw.completed.differenceSummary !== "已识别 4 个规范字段差异；全部保持 unresolved。"
    || raw.completed.stopLine !== SYNTHETIC_PAGE_STOP_LINE || raw.completed.activeElementId !== "result"
    || raw.completed.runButtonDisabled !== false || raw.completed.serviceWorkerRegistrationCount !== 0
    || raw.completed.cacheStorageKeyCount !== 0 || raw.completed.indexedDbDatabaseCount !== 0
    || raw.completed.localStorageLength !== 0 || raw.completed.sessionStorageLength !== 0) {
    fail("RUNTIME_PROBE_RESULT_INVALID", "runtime probe 合成自检结果不符合 58/54/4/0 固定身份。 ");
  }
  assertPlainExactObject(raw.mobile, ["clientWidth", "innerHeight", "innerWidth", "scrollWidth"], "RUNTIME_PROBE_MOBILE_INVALID");
  if (raw.mobile.innerWidth !== 390 || raw.mobile.innerHeight !== 844
    || !Number.isInteger(raw.mobile.clientWidth) || raw.mobile.clientWidth <= 0
    || !Number.isInteger(raw.mobile.scrollWidth) || raw.mobile.scrollWidth > raw.mobile.innerWidth) {
    fail("RUNTIME_PROBE_MOBILE_INVALID", "runtime probe 390x844 页面存在无效尺寸或页面级横向溢出。 ");
  }
  for (const [entries, label] of [
    [raw.requestObservations, "request"],
    [raw.responseObservations, "response"]
  ]) {
    if (!Array.isArray(entries) || entries.length < SYNTHETIC_RUNTIME_REQUIRED_REQUEST_PATHS.length || entries.length > 32) {
      fail("RUNTIME_PROBE_NETWORK_SET_INVALID", `runtime probe ${label} 集合无效。 `);
    }
  }
  const requestPaths = raw.requestObservations.map((entry) => {
    assertPlainExactObject(entry, ["method", "url"], "RUNTIME_PROBE_NETWORK_SET_INVALID");
    if (entry.method !== "GET") return null;
    return exactAllowedRuntimeUrl(entry.url, expectedUrl);
  });
  const responsePaths = raw.responseObservations.map((entry) => {
    assertPlainExactObject(entry, ["status", "url"], "RUNTIME_PROBE_NETWORK_SET_INVALID");
    if (entry.status !== 200) return null;
    return exactAllowedRuntimeUrl(entry.url, expectedUrl);
  });
  const distinctRequestPaths = [...new Set(requestPaths)].sort();
  const distinctResponsePaths = [...new Set(responsePaths)].sort();
  if (requestPaths.some((path) => path === null) || responsePaths.some((path) => path === null)
    || SYNTHETIC_RUNTIME_REQUIRED_REQUEST_PATHS.some((path) => !distinctRequestPaths.includes(path))
    || SYNTHETIC_RUNTIME_REQUIRED_REQUEST_PATHS.some((path) => !distinctResponsePaths.includes(path))
    || distinctRequestPaths.length > SYNTHETIC_RUNTIME_ALLOWED_PATHS.length
    || distinctResponsePaths.length > SYNTHETIC_RUNTIME_ALLOWED_PATHS.length
    || raw.loadingFailureCount !== 0 || raw.runtimeExceptionCount !== 0
    || raw.consoleWarningOrErrorCount !== 0 || raw.logWarningOrErrorCount !== 0) {
    fail("RUNTIME_PROBE_NETWORK_SET_INVALID", "runtime probe 页面请求、响应或 warning/error 观察不闭合。 ");
  }
  return Object.freeze({
    requestCount: raw.requestObservations.length,
    responseCount: raw.responseObservations.length,
    resourceCount: raw.initial.resourceUrls.length,
    mobileClientWidth: raw.mobile.clientWidth,
    mobileScrollWidth: raw.mobile.scrollWidth
  });
}

export async function startSyntheticPairViewerCleanProfileCandidate(preflight, adapterCapability = undefined) {
  if (!preflight || !call(WEAK_SET_HAS, VERIFIED_PREFLIGHTS, [preflight])) {
    fail("PREFLIGHT_CAPABILITY_REQUIRED", "只能启动本模块当前进程产生的 preflight capability。 ");
  }
  const adapterState = adapterCapability === undefined
    ? null
    : resolveSyntheticPairLauncherTestAdapter(adapterCapability, "runtime start");
  const spawnBrowserAdapter = adapterState?.spawnBrowser;
  const terminateBrowserAdapter = adapterState?.terminateBrowser;
  if (adapterState !== null && typeof spawnBrowserAdapter !== "function") {
    fail("RUNTIME_ADAPTER_INVALID", "runtime start test capability 缺少 spawnBrowser。 ");
  }
  const testAdapterUsed = adapterState !== null;
  const privatePreflight = call(WEAK_MAP_GET, PRIVATE_PREFLIGHT_STATE, [preflight]);
  let canonicalTempRoot = null;
  let sessionEndpointCreated = false;
  let canonicalSessionRoot = null;
  let initialSessionIdentity = null;
  let server = null;
  let browserProcess = null;
  let exitObservation = null;
  let port;
  try {
    canonicalTempRoot = await realpath(tmpdir());
    const sessionRoot = await mkdtemp(join(canonicalTempRoot, "hakimi-bazi-pair-synthetic-"));
    sessionEndpointCreated = true;
    canonicalSessionRoot = await realpath(sessionRoot);
    const sessionMetadata = await lstat(canonicalSessionRoot, { bigint: true });
    const sessionRelation = relative(canonicalTempRoot, canonicalSessionRoot);
    if (!sessionMetadata.isDirectory() || sessionMetadata.isSymbolicLink()
      || !sessionRelation || sessionRelation.startsWith("..") || sessionRelation.includes(":")) {
      fail("SESSION_PROFILE_ROOT_INVALID", "临时 session root 身份无效。 ");
    }
    initialSessionIdentity = Object.freeze({ dev: sessionMetadata.dev, ino: sessionMetadata.ino });
    const profileRoot = join(canonicalSessionRoot, "browser-profile");
    await mkdir(profileRoot, { recursive: false });
    server = createSyntheticPairComparisonServer({ payloads: privatePreflight.payloads });
    port = await listenRandomLoopback(server);
    const url = `http://127.0.0.1:${port}/`;
    const args = Object.freeze([
      `--user-data-dir=${profileRoot}`,
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      "--disable-sync",
      "--disable-extensions",
      "--disable-component-extensions-with-background-pages",
      "--disable-background-networking",
      "--disable-component-update",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-proxy-server",
      `--app=${url}`
    ]);
    const spawnBrowser = spawnBrowserAdapter ?? ((executable, spawnArgs, options) => spawn(executable, spawnArgs, options));
    browserProcess = spawnBrowser(privatePreflight.canonicalBrowserExecutable, args, {
      cwd: canonicalSessionRoot,
      env: sanitizedChildEnvironment(),
      stdio: "ignore",
      shell: false,
      windowsHide: false
    });
    if (!browserProcess || typeof browserProcess.once !== "function" || typeof browserProcess.off !== "function") {
      fail("BROWSER_PROCESS_INVALID", "browser process handle 无效。 ");
    }
    await waitForSpawn(browserProcess);
    exitObservation = browserExitObservation(browserProcess);
    const run = Object.freeze({
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_pilot_pair_compare_clean_profile_run_candidate_v1",
      viewerSourceBundleSha256: preflight.viewerSourceBundleSha256,
      browserFamily: preflight.browserFamily,
      browserExecutableRawSha256: preflight.browserExecutableRawSha256,
      checks: Object.freeze({
        randomLoopbackPortAssigned: true,
        freshTemporaryProfileDirectoryCreated: true,
        userDataDirArgumentPrepared: true,
        loopbackRemoteDebuggingAddressArgumentPrepared: true,
        ephemeralRemoteDebuggingPortArgumentPrepared: true,
        disableExtensionsArgumentPrepared: true,
        disableComponentExtensionsWithBackgroundPagesArgumentPrepared: true,
        disableSyncArgumentPrepared: true,
        disableBackgroundNetworkingArgumentPrepared: true,
        noDefaultBrowserFallback: true,
        urlContainsCyclePinPathOrQuery: false,
        syntheticPageContainsFileInput: false,
        browserProcessSpawnObserved: true,
        testAdapterUsed
      }),
      cleanupPending: true,
      boundary: SYNTHETIC_PAIR_LAUNCH_BOUNDARY
    });
    const privateRun = {
      server,
      browserProcess,
      exitObservation,
      canonicalTempRoot,
      canonicalSessionRoot,
      profileRoot,
      url,
      initialSessionIdentity,
      terminateBrowser: terminateBrowserAdapter ?? terminateBrowserDefault,
      stopPromise: null,
      probePromise: null,
      runtimeProbeCompleted: false,
      observedBrowserExit: null,
      testAdapterUsed
    };
    exitObservation.then((observation) => {
      privateRun.observedBrowserExit = observation;
    });
    call(WEAK_MAP_SET, PRIVATE_RUN_STATE, [run, privateRun]);
    call(WEAK_SET_ADD, ACTIVE_RUNS, [run]);
    return run;
  } catch (error) {
    let browserClosed = browserProcess === null || browserProcessTerminal(browserProcess);
    if (!browserClosed && browserProcess !== null) {
      try {
        const terminate = terminateBrowserAdapter ?? terminateBrowserDefault;
        browserClosed = await terminate(browserProcess, exitObservation ?? browserExitObservation(browserProcess));
      } catch {
        browserClosed = false;
      }
    }
    const serverClosed = server === null ? true : await closeServerBounded(server);
    let cleanup = Object.freeze({
      removed: sessionEndpointCreated === false,
      reason: sessionEndpointCreated ? "initial_identity_unavailable" : "no_session_endpoint_created",
      boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: sessionEndpointCreated === false
    });
    try {
      if (canonicalTempRoot !== null && canonicalSessionRoot !== null && initialSessionIdentity !== null) {
        cleanup = await removeSessionAfterBrowserQuiescenceCandidate({
          canonicalTempRoot,
          canonicalSessionRoot,
          initialSessionIdentity,
          browserClosed,
          serverClosed,
          testAdapterUsed
        });
      }
    } catch {
      cleanup = Object.freeze({
        removed: false,
        reason: "cleanup_failed",
        boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: false
      });
    }
    if (!browserClosed || !serverClosed || cleanup.removed !== true) {
      fail("PAIR_SESSION_START_CLEANUP_UNCONFIRMED", "synthetic pair session 启动失败且安全清理未确认。 ");
    }
    if (error instanceof SyntheticPairLauncherCandidateError) throw error;
    fail("PAIR_SESSION_START_FAILED", "synthetic pair session 启动失败；未产生可用 run capability。 ");
  }
}

export async function probeSyntheticPairViewerRuntimeCandidate(run, adapterCapability = undefined) {
  if (!run || !call(WEAK_SET_HAS, ACTIVE_RUNS, [run])) {
    fail("RUN_CAPABILITY_REQUIRED", "runtime probe 需要当前进程 run capability。 ");
  }
  const adapterState = adapterCapability === undefined
    ? null
    : resolveSyntheticPairLauncherTestAdapter(adapterCapability, "runtime probe");
  const collectAdapter = adapterState?.collectRuntimeProbe;
  if (adapterState !== null && typeof collectAdapter !== "function") {
    fail("RUNTIME_ADAPTER_INVALID", "runtime probe test capability 缺少 collectRuntimeProbe。 ");
  }
  const state = call(WEAK_MAP_GET, PRIVATE_RUN_STATE, [run]);
  if (state.probePromise) return state.probePromise;
  state.probePromise = (async () => {
    if (browserProcessTerminal(state.browserProcess) || state.observedBrowserExit !== null) {
      fail("BROWSER_EXITED_BEFORE_RUNTIME_PROBE", "浏览器在 runtime probe 前已经退出。 ");
    }
    const raw = collectAdapter
      ? await collectAdapter(Object.freeze({
        browserFamily: run.browserFamily,
        expectedUrl: state.url,
        profileRoot: state.profileRoot
      }))
      : await collectRuntimeProbeThroughCdpCandidate({
        profileRoot: state.profileRoot,
        expectedUrl: state.url
      });
    const summary = validateRuntimeProbeRawCandidate(raw, state.url);
    if (browserProcessTerminal(state.browserProcess) || state.observedBrowserExit !== null) {
      fail("BROWSER_EXITED_DURING_RUNTIME_PROBE", "浏览器在 runtime probe 完成前退出。 ");
    }
    const testAdapterUsed = state.testAdapterUsed || adapterState !== null;
    const observation = Object.freeze({
      schemaVersion: "1.0.0",
      recordType: "bazi_review_ui_synthetic_pair_cdp_precleanup_probe_candidate_v1",
      purpose: "synthetic_pair_viewer_visual_qa_only",
      evidenceClass: "engineering_runtime_precleanup_observation_only",
      admissionEffect: "none",
      runtimeProbeMethod: RUNTIME_PROBE_METHOD,
      viewerSourceBundleSha256: run.viewerSourceBundleSha256,
      browserInstallCandidateFamily: run.browserFamily,
      browserExecutableRawSha256: run.browserExecutableRawSha256,
      observed: Object.freeze({
        pageTitle: SYNTHETIC_PAGE_TITLE,
        pageHeading: SYNTHETIC_PAGE_HEADING,
        comparedFieldCount: 58,
        exactMatchCount: 54,
        unresolvedDifferenceCount: 4,
        formalTwoOfTwoCountDelta: 0,
        auxiliaryBrowserUiTargetCount: raw.auxiliaryBrowserUiTargetCount,
        targetRequestCount: summary.requestCount,
        targetResponseCount: summary.responseCount,
        targetResourceCount: summary.resourceCount,
        mobileViewportWidth: 390,
        mobileViewportHeight: 844,
        mobileClientWidth: summary.mobileClientWidth,
        mobileScrollWidth: summary.mobileScrollWidth
      }),
      checks: Object.freeze({
        devToolsActivePortObservedInsideFreshProfileCandidate: true,
        browserEndpointPathMatchedActivePort: true,
        preAttachJsonListSnapshotHadOneExactSyntheticPageTarget: true,
        preAttachJsonListSnapshotAuxiliaryTargetsRestrictedToKnownOmniboxSet: true,
        extensionOrServiceWorkerTargetCountZeroAtPreAttachJsonListSnapshotObserved: true,
        pageSessionReloadObservedAfterDomainsEnabled: true,
        observedPageSessionRequestEventsSinceReloadMarkHadAllowlistedUrls: true,
        observedPageSessionResponseEventsSinceReloadMarkHadHttp200: true,
        observedPageSessionLoadingFailureEventCountSinceReloadMarkZero: true,
        observedPageSessionRuntimeExceptionEventCountSinceReloadMarkZero: true,
        observedPageSessionConsoleWarningOrErrorEventCountSinceReloadMarkZero: true,
        observedPageSessionLogWarningOrErrorEventCountSinceReloadMarkZero: true,
        exactPostReloadPreClickDomIdentityObserved: true,
        externalReturnInputSurfaceAbsentObserved: true,
        observedOriginServiceWorkerRegistrationCountZeroPostReloadPreClickAndPostClick: true,
        observedOriginCacheStorageIndexedDbLocalAndSessionStorageCountsZeroPostReloadPreClickAndPostClick: true,
        syntheticSelfCheckPassed: true,
        fixedComparisonCountsObserved: true,
        mobilePageLevelHorizontalOverflowAbsentObserved: true,
        browserProcessStillRunningAtProbeCompletion: true,
        testAdapterUsed
      }),
      temporaryBrowserProfileWritesPerformed: true,
      productStorageMutationPerformed: false,
      schema13MutationEpochUsed: false,
      cleanupObserved: false,
      eligibleForFinalSessionObservation: false,
      testAdapterUsed,
      boundary: SYNTHETIC_PAIR_LAUNCH_BOUNDARY
    });
    call(WEAK_MAP_SET, PRIVATE_RUNTIME_PROBE_STATE, [observation, Object.freeze({ run })]);
    call(WEAK_SET_ADD, VERIFIED_RUNTIME_PROBES, [observation]);
    state.runtimeProbeCompleted = true;
    return observation;
  })();
  return state.probePromise;
}

export function waitForSyntheticPairViewerBrowserExitCandidate(run) {
  if (!run || !call(WEAK_SET_HAS, ACTIVE_RUNS, [run])) {
    fail("RUN_CAPABILITY_REQUIRED", "browser exit wait 需要当前进程 run capability。 ");
  }
  return call(WEAK_MAP_GET, PRIVATE_RUN_STATE, [run]).exitObservation;
}

export async function stopSyntheticPairViewerCleanProfileCandidate(run, reason = "operator") {
  if (!run || !call(WEAK_SET_HAS, ACTIVE_RUNS, [run])) {
    fail("RUN_CAPABILITY_REQUIRED", "stop 需要当前进程 run capability。 ");
  }
  if (!new Set(["operator", "browser_exit", "signal", "error"]).has(reason)) {
    fail("STOP_REASON_INVALID", "stop reason 无效。 ");
  }
  const state = call(WEAK_MAP_GET, PRIVATE_RUN_STATE, [run]);
  if (state.stopPromise) return state.stopPromise;
  state.stopPromise = (async () => {
    const terminalAtStopEntry = state.observedBrowserExit
      ?? (browserProcessTerminal(state.browserProcess)
        ? Object.freeze({
          kind: "exit",
          code: state.browserProcess.exitCode ?? null,
          signal: state.browserProcess.signalCode ?? null
        })
        : null);
    let browserClosed = terminalAtStopEntry?.kind === "exit";
    let gracefulBrowserClose = Object.freeze({
      commandDispatchedObserved: false,
      commandResponseObserved: false,
      connectionClosedBeforeCommandResponseObserved: false
    });
    let forcedTerminationFallbackUsed = false;
    if (!browserClosed && reason === "operator" && state.testAdapterUsed === false
      && state.runtimeProbeCompleted === true) {
      try {
        gracefulBrowserClose = await requestGracefulBrowserCloseThroughCdpCandidate(state.profileRoot);
        const gracefulExit = await waitBounded(state.exitObservation, 5_000);
        browserClosed = gracefulExit?.kind === "exit";
      } catch {
        browserClosed = browserProcessTerminal(state.browserProcess);
      }
    }
    if (!browserClosed) {
      forcedTerminationFallbackUsed = !browserProcessTerminal(state.browserProcess);
      try {
        browserClosed = await state.terminateBrowser(state.browserProcess, state.exitObservation);
      } catch {
        browserClosed = false;
      }
    }
    const serverClosed = await closeServerBounded(state.server);
    let cleanup = Object.freeze({
      removed: false,
      reason: "shutdown_unconfirmed",
      boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: false
    });
    if (browserClosed && serverClosed) {
      try {
        cleanup = await removeSessionAfterBrowserQuiescenceCandidate({
          canonicalTempRoot: state.canonicalTempRoot,
          canonicalSessionRoot: state.canonicalSessionRoot,
          initialSessionIdentity: state.initialSessionIdentity,
          browserClosed,
          serverClosed,
          testAdapterUsed: state.testAdapterUsed
        });
      } catch {
        cleanup = Object.freeze({
          removed: false,
          reason: "cleanup_failed",
          boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: false
        });
      }
    }
    await Promise.resolve();
    const observedBrowserExit = state.observedBrowserExit
      ?? (browserProcessTerminal(state.browserProcess)
        ? Object.freeze({
          kind: "exit",
          code: state.browserProcess.exitCode,
          signal: state.browserProcess.signalCode ?? null
        })
        : null);
    const normalNaturalBrowserExitObserved = reason === "browser_exit"
      && observedBrowserExit?.kind === "exit"
      && observedBrowserExit.code === 0
      && observedBrowserExit.signal === null;
    const browserFailureObserved = observedBrowserExit !== null
      && (observedBrowserExit.kind !== "exit"
        || observedBrowserExit.code !== 0
        || observedBrowserExit.signal !== null);
    const zeroExitObservedAfterGracefulBrowserCloseDispatch = reason === "operator"
      && gracefulBrowserClose.commandDispatchedObserved === true
      && observedBrowserExit?.kind === "exit"
      && observedBrowserExit.code === 0
      && observedBrowserExit.signal === null;
    const realProbeGracefulOperatorEndAccepted = state.testAdapterUsed === false
      && state.runtimeProbeCompleted === true
      && zeroExitObservedAfterGracefulBrowserCloseDispatch
      && forcedTerminationFallbackUsed === false;
    const sessionEndAcceptedForCli = browserFailureObserved === false
      && (normalNaturalBrowserExitObserved
        || (reason === "operator" && (state.testAdapterUsed || realProbeGracefulOperatorEndAccepted)));
    const safeCleanupCompleted = browserClosed && serverClosed && cleanup.removed === true
      && cleanup.boundedRepeatedPathAbsenceAfterRemovalAttemptObserved === true;
    const observation = Object.freeze({
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_pilot_pair_compare_clean_profile_stop_observation_candidate_v1",
      reason,
      spawnedBrowserProcessHandleExitObserved: browserClosed,
      serverClosedObserved: serverClosed,
      initialEndpointIdentityMatchedBeforeRemovalAttemptObserved: cleanup.removed === true,
      boundedRepeatedPathAbsenceAfterRemovalAttemptObserved:
        cleanup.boundedRepeatedPathAbsenceAfterRemovalAttemptObserved === true,
      cleanupReasonCode: cleanup.reason,
      browserExitObservation: observedBrowserExit,
      browserTerminalAtStopEntryObserved: terminalAtStopEntry !== null,
      normalNaturalBrowserExitObserved,
      browserFailureObserved,
      gracefulBrowserCloseCommandDispatchedObserved: gracefulBrowserClose.commandDispatchedObserved,
      gracefulBrowserCloseCommandResponseObserved: gracefulBrowserClose.commandResponseObserved,
      gracefulBrowserCloseConnectionClosedBeforeCommandResponseObserved:
        gracefulBrowserClose.connectionClosedBeforeCommandResponseObserved,
      zeroExitObservedAfterGracefulBrowserCloseDispatch,
      forcedTerminationFallbackUsed,
      sessionEndAcceptedForCli,
      safeCleanupCompleted,
      successfulCandidateShutdown: safeCleanupCompleted && sessionEndAcceptedForCli,
      testAdapterUsed: state.testAdapterUsed,
      temporaryBrowserProfileWritesPerformed: true,
      productStorageMutationPerformed: false,
      schema13MutationEpochUsed: false,
      boundary: SYNTHETIC_PAIR_LAUNCH_BOUNDARY
    });
    call(WEAK_MAP_SET, PRIVATE_STOP_OBSERVATION_STATE, [observation, Object.freeze({ run })]);
    call(WEAK_SET_ADD, VERIFIED_STOP_OBSERVATIONS, [observation]);
    return observation;
  })();
  return state.stopPromise;
}

export function finalizeSyntheticPairViewerSessionObservationCandidate(probe, stop) {
  if (!probe || !call(WEAK_SET_HAS, VERIFIED_RUNTIME_PROBES, [probe])) {
    fail("RUNTIME_PROBE_CAPABILITY_REQUIRED", "final session observation 需要本进程 provisional probe capability。 ");
  }
  if (!stop || !call(WEAK_SET_HAS, VERIFIED_STOP_OBSERVATIONS, [stop])) {
    fail("STOP_OBSERVATION_CAPABILITY_REQUIRED", "final session observation 需要本进程 stop observation capability。 ");
  }
  const probeState = call(WEAK_MAP_GET, PRIVATE_RUNTIME_PROBE_STATE, [probe]);
  const stopState = call(WEAK_MAP_GET, PRIVATE_STOP_OBSERVATION_STATE, [stop]);
  if (probeState?.run !== stopState?.run) {
    fail("SESSION_OBSERVATION_RUN_MISMATCH", "provisional probe 与 stop observation 不属于同一 run capability。 ");
  }
  if (probe.testAdapterUsed !== false || stop.testAdapterUsed !== false) {
    fail("REAL_RUNTIME_OBSERVATION_REQUIRED", "test adapter 不能签发 final session observation。 ");
  }
  if (probe.recordType !== "bazi_review_ui_synthetic_pair_cdp_precleanup_probe_candidate_v1"
    || probe.cleanupObserved !== false || probe.eligibleForFinalSessionObservation !== false
    || stop.reason !== "operator" || stop.spawnedBrowserProcessHandleExitObserved !== true
    || stop.serverClosedObserved !== true
    || stop.initialEndpointIdentityMatchedBeforeRemovalAttemptObserved !== true
    || stop.boundedRepeatedPathAbsenceAfterRemovalAttemptObserved !== true
    || stop.cleanupReasonCode !== "initial_identity_matched_removal_attempt_returned_and_bounded_repeated_path_absence_observed"
    || stop.browserFailureObserved !== false || stop.sessionEndAcceptedForCli !== true
    || stop.gracefulBrowserCloseCommandDispatchedObserved !== true
    || (stop.gracefulBrowserCloseCommandResponseObserved
      === stop.gracefulBrowserCloseConnectionClosedBeforeCommandResponseObserved)
    || stop.zeroExitObservedAfterGracefulBrowserCloseDispatch !== true
    || stop.forcedTerminationFallbackUsed !== false
    || stop.safeCleanupCompleted !== true || stop.successfulCandidateShutdown !== true) {
    fail("FINAL_SESSION_OBSERVATION_PREREQUISITES_UNMET", "runtime probe 或关闭清理先决条件未全部满足。 ");
  }
  const observation = Object.freeze({
    schemaVersion: "1.0.0",
    recordType: "bazi_review_ui_synthetic_pair_cdp_runtime_observation_candidate_v1",
    purpose: "synthetic_pair_viewer_visual_qa_only",
    evidenceClass: "engineering_runtime_observation_only",
    admissionEffect: "none",
    runtimeProbeMethod: probe.runtimeProbeMethod,
    sessionFinalizationMethod: "cdp_browser_close_dispatch_then_zero_exit_and_bounded_cleanup_v1",
    viewerSourceBundleSha256: probe.viewerSourceBundleSha256,
    browserInstallCandidateFamily: probe.browserInstallCandidateFamily,
    browserExecutableRawSha256: probe.browserExecutableRawSha256,
    observed: probe.observed,
    checks: Object.freeze({
      ...probe.checks,
      spawnedBrowserProcessHandleZeroExitObserved: true,
      serverClosedObserved: true,
      initialEndpointIdentityMatchedBeforeRemovalAttemptObserved: true,
      boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: true,
      browserFailureObserved: false,
      gracefulBrowserCloseCommandDispatchedObserved: true,
      gracefulBrowserCloseCommandResponseObserved: stop.gracefulBrowserCloseCommandResponseObserved,
      gracefulBrowserCloseConnectionClosedBeforeCommandResponseObserved:
        stop.gracefulBrowserCloseConnectionClosedBeforeCommandResponseObserved,
      zeroExitObservedAfterGracefulBrowserCloseDispatch: true,
      forcedTerminationFallbackUsed: false,
      sessionEndAcceptedForCli: true,
      testAdapterUsed: false
    }),
    cleanup: Object.freeze({
      cleanupReasonCode: stop.cleanupReasonCode,
      initialEndpointIdentityMatchedBeforeRemovalAttemptObserved: true,
      boundedRepeatedPathAbsenceAfterRemovalAttemptObserved: true
    }),
    temporaryBrowserProfileWritesPerformed: true,
    productStorageMutationPerformed: false,
    schema13MutationEpochUsed: false,
    cleanupObserved: true,
    testAdapterUsed: false,
    boundary: SYNTHETIC_PAIR_LAUNCH_BOUNDARY
  });
  call(WEAK_SET_ADD, VERIFIED_FINAL_SESSION_OBSERVATIONS, [observation]);
  return observation;
}

function assertSupportedWrapper() {
  const visibleEnvironmentKeys = Object.keys(process.env).map((key) => key.toLowerCase()).sort();
  const expectedEnvironmentKeys = [
    ...Object.keys(INITIAL_ENVIRONMENT),
    "HAKIMI_PAIR_COMPARE_SOURCE_WRAPPER_CANDIDATE"
  ].map((key) => key.toLowerCase()).sort();
  if (process.env.HAKIMI_PAIR_COMPARE_SOURCE_WRAPPER_CANDIDATE !== WRAPPER_MARKER
    || JSON.stringify(visibleEnvironmentKeys) !== JSON.stringify(expectedEnvironmentKeys)
    || process.env.NODE_OPTIONS !== undefined
    || process.env.NODE_PATH !== undefined
    || process.env.npm_config_node_options !== undefined
    || process.env.NPM_CONFIG_NODE_OPTIONS !== undefined
    || INITIAL_NODE_EXEC_ARGV.length !== 0) {
    fail("SOURCE_WRAPPER_REQUIRED", "必须由清除 Node preload 环境的 PowerShell -NoProfile 候选入口启动。 ");
  }
}

function parseCli(args) {
  if (!Array.isArray(args)) fail("CLI_ARGUMENTS_INVALID", "CLI 参数无效。 ");
  if (args.length === 3 && args[0] === "--observe" && args[1] === "--browser-family"
    && new Set(["chrome", "edge"]).has(args[2])) {
    return { mode: "observe", browserFamily: args[2] };
  }
  if (args.length === 9 && new Set(["--launch", "--probe"]).has(args[0])) {
    const allowed = new Set([
      "--owner-decision",
      "--viewer-source-sha256",
      "--browser-family",
      "--browser-executable-sha256"
    ]);
    const values = {};
    for (let index = 1; index < args.length; index += 2) {
      const option = args[index];
      const value = args[index + 1];
      if (!allowed.has(option) || Object.hasOwn(values, option)
        || typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
        fail("CLI_ARGUMENTS_INVALID", "CLI 参数含未知、重复、缺失或注入形态。 ");
      }
      values[option] = value;
    }
    if (Object.keys(values).length !== 4) fail("CLI_ARGUMENTS_INVALID", "CLI 参数不完整。 ");
    return {
      mode: args[0] === "--probe" ? "probe" : "launch",
      request: {
        ownerDecisionCode: values["--owner-decision"],
        realReturnLoadingAuthorized: false,
        expectedViewerSourceBundleSha256: values["--viewer-source-sha256"],
        browserFamily: values["--browser-family"],
        expectedBrowserExecutableRawSha256: values["--browser-executable-sha256"]
      }
    };
  }
  fail("CLI_ARGUMENTS_INVALID", "CLI 只接受固定 observe、synthetic launch 或 synthetic probe 参数。 ");
}

function createCliSignalGate() {
  let resolveSignal;
  let signalObserved = false;
  const signal = new Promise((resolveValue) => {
    resolveSignal = resolveValue;
  });
  const onSignal = () => {
    if (!signalObserved) {
      signalObserved = true;
      resolveSignal(Object.freeze({ reason: "signal", browserExitObservation: null }));
    }
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  return Object.freeze({
    signal,
    wasSignalled: () => signalObserved,
    dispose() {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    }
  });
}

function createSessionEndWait(run, signalGate) {
  let resolveOperator;
  const operator = new Promise((resolveValue) => {
    resolveOperator = resolveValue;
  });
  const onData = () => resolveOperator(Object.freeze({ reason: "operator", browserExitObservation: null }));
  process.stdin.resume();
  process.stdin.once("data", onData);
  const browser = waitForSyntheticPairViewerBrowserExitCandidate(run).then(
    (observation) => Object.freeze({ reason: observation.kind === "exit" ? "browser_exit" : "error", browserExitObservation: observation }),
    () => Object.freeze({ reason: "error", browserExitObservation: null })
  );
  return Object.freeze({
    completion: Promise.race([operator, signalGate.signal, browser]),
    dispose() {
      process.stdin.off("data", onData);
      process.stdin.pause();
    }
  });
}

function createCliStreamWriter(stream) {
  let streamError = null;
  const pending = new Set();
  const onError = (error) => {
    streamError = error instanceof Error ? error : new Error("CLI output stream failed");
    for (const rejectPending of [...pending]) rejectPending(streamError);
  };
  stream.on("error", onError);
  return Object.freeze({
    write(value) {
      return new Promise((resolveWrite, rejectWrite) => {
        if (streamError !== null) {
          rejectWrite(streamError);
          return;
        }
        let settled = false;
        const finish = (error) => {
          if (settled) return;
          settled = true;
          pending.delete(rejectFromStream);
          const failure = error ?? streamError;
          if (failure) rejectWrite(failure); else resolveWrite();
        };
        const rejectFromStream = (error) => finish(error);
        pending.add(rejectFromStream);
        try {
          stream.write(value, (error) => finish(error));
        } catch (error) {
          finish(error);
        }
      });
    },
    failed: () => streamError !== null,
    async settleErrorEvents() {
      await new Promise((resolveTurn) => setImmediate(resolveTurn));
    },
    dispose() {
      stream.off("error", onError);
    }
  });
}

export async function runSyntheticPairViewerLauncherCandidateCli(args = process.argv.slice(2)) {
  assertSupportedWrapper();
  const parsed = parseCli(args);
  if (parsed.mode === "observe") {
    const output = createCliStreamWriter(process.stdout);
    try {
      const observation = await observeSyntheticPairViewerLaunchMaterialsCandidate({ browserFamily: parsed.browserFamily });
      await output.write(`PAIR_COMPARE_VIEWER_SOURCE_SHA256 ${observation.sourceObservation.sourceBundleSha256}\n`);
      await output.write(`PAIR_COMPARE_BROWSER_EXECUTABLE_SHA256 ${observation.browserObservation.rawSha256}\n`);
      await output.write("PAIR_COMPARE_OBSERVATION_AUTHORITY none\n");
      return observation;
    } finally {
      await output.settleErrorEvents();
      output.dispose();
    }
  }
  const signalGate = createCliSignalGate();
  const output = createCliStreamWriter(process.stdout);
  let run = null;
  let endWait = null;
  let stop = null;
  let probe = null;
  let finalObservation = null;
  try {
    const preflight = await preflightSyntheticPairViewerLaunchCandidate(parsed.request);
    if (signalGate.wasSignalled()) fail("PAIR_SESSION_START_INTERRUPTED", "synthetic pair session 在启动前收到中止信号。 ");
    run = await startSyntheticPairViewerCleanProfileCandidate(preflight);
    await output.write("PAIR_COMPARE_SYNTHETIC_SESSION_STARTED\n");
    if (parsed.mode === "probe") {
      probe = await probeSyntheticPairViewerRuntimeCandidate(run);
      stop = await stopSyntheticPairViewerCleanProfileCandidate(
        run,
        signalGate.wasSignalled() ? "signal" : "operator"
      );
    } else {
      endWait = createSessionEndWait(run, signalGate);
      const next = await endWait.completion;
      stop = await stopSyntheticPairViewerCleanProfileCandidate(run, next.reason);
    }
    const cliSuccess = stop.safeCleanupCompleted
      && stop.sessionEndAcceptedForCli
      && signalGate.wasSignalled() === false
      && output.failed() === false;
    if (cliSuccess && probe !== null) {
      finalObservation = finalizeSyntheticPairViewerSessionObservationCandidate(probe, stop);
      await output.write(`PAIR_COMPARE_SYNTHETIC_RUNTIME_PROBE ${JSON_STRINGIFY(finalObservation)}\n`);
    }
    await output.write(cliSuccess
      ? "PAIR_COMPARE_SYNTHETIC_SESSION_CLOSED\n"
      : stop.safeCleanupCompleted
        ? "PAIR_COMPARE_SYNTHETIC_SESSION_FAILED_CLEANED\n"
        : "PAIR_COMPARE_SYNTHETIC_SESSION_CLOSE_UNCONFIRMED\n");
    if (!cliSuccess) process.exitCode = 1;
    return probe === null ? stop : Object.freeze({ probe, stop, finalObservation });
  } catch (error) {
    let cleanupStatusLine = stop === null
      ? null
      : stop.safeCleanupCompleted
        ? "PAIR_COMPARE_SYNTHETIC_SESSION_FAILED_CLEANED\n"
        : "PAIR_COMPARE_SYNTHETIC_SESSION_CLOSE_UNCONFIRMED\n";
    if (run !== null && stop === null) {
      try {
        stop = await stopSyntheticPairViewerCleanProfileCandidate(run, "error");
        cleanupStatusLine = stop.safeCleanupCompleted
          ? "PAIR_COMPARE_SYNTHETIC_SESSION_FAILED_CLEANED\n"
          : "PAIR_COMPARE_SYNTHETIC_SESSION_CLOSE_UNCONFIRMED\n";
      } catch {
        cleanupStatusLine = "PAIR_COMPARE_SYNTHETIC_SESSION_CLOSE_UNCONFIRMED\n";
      }
    }
    if (cleanupStatusLine !== null) {
      try {
        await output.write(cleanupStatusLine);
      } catch {
        // The original error remains primary; a failed diagnostic write cannot replace it.
      }
    }
    throw error;
  } finally {
    endWait?.dispose();
    signalGate.dispose();
    await output.settleErrorEvents();
    output.dispose();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    await runSyntheticPairViewerLauncherCandidateCli();
  } catch (error) {
    const code = error instanceof SyntheticPairLauncherCandidateError ? error.code : "SYNTHETIC_PAIR_LAUNCHER_FAILED";
    process.stderr.write(`PAIR_COMPARE_SYNTHETIC_LAUNCHER_REJECTED ${code}\n`);
    process.exitCode = 1;
  }
}
