import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { lstat, mkdir, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { request } from "node:http";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  SYNTHETIC_PAIR_LAUNCH_BOUNDARY,
  SyntheticPairLauncherCandidateError,
  createSyntheticPairLauncherTestAdapter,
  finalizeSyntheticPairViewerSessionObservationCandidate,
  observeCdpBrowserCloseOrderingWithTestAdapterCandidate,
  observeSyntheticPairViewerLaunchMaterialsCandidate,
  observeSyntheticPairViewerSourceBundleCandidate,
  preflightSyntheticPairViewerLaunchCandidate,
  probeSyntheticPairViewerRuntimeCandidate,
  startSyntheticPairViewerCleanProfileCandidate,
  stopSyntheticPairViewerCleanProfileCandidate,
  waitForSyntheticPairViewerBrowserExitCandidate
} from "../pair-compare-session-launcher-candidate.mjs";

const SOURCE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const CORE_PATH = join(SOURCE_ROOT, "pair-compare-session-launcher-candidate.mjs");
const WRAPPER_PATH = join(SOURCE_ROOT, "pair-compare-session-launcher-candidate.ps1");
const POWERSHELL = join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const OWNER_DECISION = "synthetic_fixture_visual_qa_only_approved";
const RUNTIME_PATHS = Object.freeze([
  "/",
  "/contract.js",
  "/data/questions.js",
  "/data/scenarios.js",
  "/pair-comparison.js",
  "/pair-compare-synthetic.css",
  "/pair-compare-synthetic-icon.svg",
  "/pair-compare-synthetic.js"
]);

function runtimeProbeFixture(expectedUrl, mutate) {
  const urlFor = (path) => new URL(path, expectedUrl).href;
  const value = {
    devToolsActivePortFileObserved: true,
    browserEndpointPathMatchedActivePort: true,
    targetListCount: 1,
    exactTargetMatchCount: 1,
    auxiliaryBrowserUiTargetCount: 0,
    initial: {
      readyState: "complete",
      pageUrl: expectedUrl,
      title: "八字两席合成并列自检",
      heading: "两席合成并列自检",
      status: "尚未运行。",
      runLabel: "运行合成 A/B 自检",
      runButtonCount: 1,
      fileInputCount: 0,
      textEntryCount: 0,
      resultHidden: true,
      errorHidden: true,
      syntheticCheck: null,
      serviceWorkerControllerPresent: false,
      serviceWorkerRegistrationCount: 0,
      cacheStorageKeyCount: 0,
      indexedDbDatabaseCount: 0,
      localStorageLength: 0,
      sessionStorageLength: 0,
      resourceUrls: RUNTIME_PATHS.slice(1).map(urlFor).sort()
    },
    completed: {
      syntheticCheck: "passed",
      status: "合成自检完成；没有读取任何外部回件。",
      resultHidden: false,
      errorHidden: true,
      totalFields: "58",
      matchingFields: "54",
      differenceFields: "4",
      formalCount: "0",
      differenceSummary: "已识别 4 个规范字段差异；全部保持 unresolved。",
      stopLine: "没有赢家、评分、投票、平均、自动合并或正式 reconciliation。",
      activeElementId: "result",
      runButtonDisabled: false,
      serviceWorkerRegistrationCount: 0,
      cacheStorageKeyCount: 0,
      indexedDbDatabaseCount: 0,
      localStorageLength: 0,
      sessionStorageLength: 0
    },
    mobile: {
      innerWidth: 390,
      innerHeight: 844,
      clientWidth: 375,
      scrollWidth: 375
    },
    requestObservations: RUNTIME_PATHS.map((path) => ({ method: "GET", url: urlFor(path) })),
    responseObservations: RUNTIME_PATHS.map((path) => ({ status: 200, url: urlFor(path) })),
    loadingFailureCount: 0,
    runtimeExceptionCount: 0,
    consoleWarningOrErrorCount: 0,
    logWarningOrErrorCount: 0
  };
  mutate?.(value);
  return value;
}

function startWithTestAdapter(preflight, adapter) {
  return startSyntheticPairViewerCleanProfileCandidate(
    preflight,
    createSyntheticPairLauncherTestAdapter(adapter)
  );
}

function probeWithTestAdapter(run, adapter) {
  return probeSyntheticPairViewerRuntimeCandidate(
    run,
    createSyntheticPairLauncherTestAdapter(adapter)
  );
}

let cachedMaterials;
async function materials() {
  cachedMaterials ??= await observeSyntheticPairViewerLaunchMaterialsCandidate({ browserFamily: "chrome" });
  return cachedMaterials;
}

async function validPreflight() {
  const observed = await materials();
  return preflightSyntheticPairViewerLaunchCandidate({
    ownerDecisionCode: OWNER_DECISION,
    realReturnLoadingAuthorized: false,
    expectedViewerSourceBundleSha256: observed.sourceObservation.sourceBundleSha256,
    browserFamily: "chrome",
    expectedBrowserExecutableRawSha256: observed.browserObservation.rawSha256
  });
}

class FakeBrowserProcess extends EventEmitter {
  constructor() {
    super();
    this.pid = 4242;
    this.exitCode = null;
    this.signalCode = null;
  }

  markSpawned() {
    queueMicrotask(() => this.emit("spawn"));
  }

  complete(code = 0, signal = null) {
    if (this.exitCode !== null || this.signalCode !== null) return;
    this.exitCode = code;
    this.signalCode = signal;
    this.emit("exit", code, signal);
  }
}

class CloseBeforeCommandResponseWebSocket {
  constructor() {
    this.readyState = 0;
    this.listeners = new Map();
    queueMicrotask(() => {
      this.readyState = 1;
      this.dispatch("open", {});
    });
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type, event) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  send(serialized) {
    const command = JSON.parse(serialized);
    assert.equal(command.method, "Browser.close");
    queueMicrotask(() => {
      this.readyState = 3;
      this.dispatch("close", {});
    });
  }

  close() {
    if (this.readyState >= 2) return;
    this.readyState = 3;
    queueMicrotask(() => this.dispatch("close", {}));
  }
}

test("keeps a CDP connection-close-before-response distinct from a command response", async () => {
  const outcome = await observeCdpBrowserCloseOrderingWithTestAdapterCandidate(
    createSyntheticPairLauncherTestAdapter({
      webSocketConstructor: CloseBeforeCommandResponseWebSocket
    })
  );
  assert.deepEqual(outcome, {
    commandResponseObserved: false,
    connectionClosedBeforeCommandResponseObserved: true
  });
});

function httpCall({ port, path = "/", hostHeader = `127.0.0.1:${port}`, method = "GET" }) {
  return new Promise((resolveCall, rejectCall) => {
    const req = request({ host: "127.0.0.1", port, path, method, headers: { Host: hostHeader } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveCall({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    req.once("error", rejectCall);
    req.end();
  });
}

async function removeExactTestSession(path) {
  const resolved = resolve(path);
  const temp = resolve(process.env.TEMP || process.env.TMP || "C:\\Windows\\Temp");
  assert.ok(resolved.toLowerCase().startsWith(`${temp.toLowerCase()}\\hakimi-bazi-pair-synthetic-`));
  await rm(resolved, { recursive: true, force: true });
}

test("observes an exact source bundle and installed Chrome without granting launch authority", async () => {
  const source = await observeSyntheticPairViewerSourceBundleCandidate();
  assert.equal(source.sourceFileCount, 12);
  assert.match(source.sourceBundleSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(source.sourceFiles.map((entry) => entry.relativePath), [
    "contract.js",
    "data/questions.js",
    "data/scenarios.js",
    "pair-compare-session-launcher-candidate.mjs",
    "pair-compare-session-launcher-candidate.ps1",
    "pair-compare-synthetic-icon.svg",
    "pair-compare-synthetic-server.mjs",
    "pair-compare-synthetic.css",
    "pair-compare-synthetic.html",
    "pair-compare-synthetic.js",
    "pair-comparison.js",
    "return-verifier.mjs"
  ]);
  assert.equal(source.sourceFiles.some((entry) => entry.relativePath === "pair-compare.html"), false);
  assert.equal(source.sourceFiles.some((entry) => entry.relativePath === "pair-compare-synthetic.html"), true);
  assert.equal(source.boundary.crossFileAtomicSnapshot, false);
  assert.equal(source.boundary.intervalMutationExcluded, false);
  const observed = await materials();
  assert.equal(observed.browserObservation.browserFamily, "chrome");
  assert.equal(observed.browserObservation.executableFileName, "chrome.exe");
  assert.match(observed.browserObservation.rawSha256, /^[a-f0-9]{64}$/u);
  assert.equal(observed.browserObservation.boundary.publisherSignatureVerified, false);
  assert.equal(observed.boundary.launchAuthorized, false);
});

test("observes installed Edge from its fixed candidate set without default-browser fallback", async () => {
  const observed = await observeSyntheticPairViewerLaunchMaterialsCandidate({ browserFamily: "edge" });
  assert.equal(observed.browserObservation.browserFamily, "edge");
  assert.equal(observed.browserObservation.executableFileName, "msedge.exe");
  assert.match(observed.browserObservation.rawSha256, /^[a-f0-9]{64}$/u);
  assert.equal(observed.browserObservation.checks.defaultBrowserFallbackUsed, false);
  assert.equal(observed.browserObservation.boundary.publisherSignatureVerified, false);
  assert.equal(observed.boundary.launchAuthorized, false);
});

test("requires an explicit synthetic-only decision and exact external source/browser pins", async () => {
  const observed = await materials();
  const base = {
    ownerDecisionCode: OWNER_DECISION,
    realReturnLoadingAuthorized: false,
    expectedViewerSourceBundleSha256: observed.sourceObservation.sourceBundleSha256,
    browserFamily: "chrome",
    expectedBrowserExecutableRawSha256: observed.browserObservation.rawSha256
  };
  const preflight = await preflightSyntheticPairViewerLaunchCandidate(base);
  assert.equal(preflight.checks.realReturnLoadingRejected, true);
  assert.equal(preflight.checks.syntheticEntryHasNoFileInput, true);
  assert.equal(preflight.boundary.realReturnLoadingAuthorized, false);
  for (const changed of [
    { ...base, ownerDecisionCode: "real_returns_allowed" },
    { ...base, realReturnLoadingAuthorized: true },
    { ...base, expectedViewerSourceBundleSha256: "d".repeat(64) },
    { ...base, expectedBrowserExecutableRawSha256: "e".repeat(64) }
  ]) {
    await assert.rejects(() => preflightSyntheticPairViewerLaunchCandidate(changed), SyntheticPairLauncherCandidateError);
  }
  await assert.rejects(
    () => startSyntheticPairViewerCleanProfileCandidate(structuredClone(preflight)),
    (error) => error instanceof SyntheticPairLauncherCandidateError && error.code === "PREFLIGHT_CAPABILITY_REQUIRED"
  );
});

test("builds a random-loopback fresh-profile run and cleans only after browser/server shutdown", async () => {
  const captures = [];
  let terminateCount = 0;
  const fake = new FakeBrowserProcess();
  const run = await startWithTestAdapter(await validPreflight(), {
    spawnBrowser(executable, args, options) {
      captures.push({ executable, args, options });
      fake.markSpawned();
      return fake;
    },
    async terminateBrowser(child) {
      terminateCount += 1;
      child.complete(0, null);
      return true;
    }
  });
  const [capture] = captures;
  assert.equal(captures.length, 1);
  assert.equal(capture.options.shell, false);
  assert.equal(capture.options.windowsHide, false);
  assert.equal(capture.options.stdio, "ignore");
  assert.equal(Object.hasOwn(capture.options.env, "NODE_OPTIONS"), false);
  assert.equal(Object.hasOwn(capture.options.env, "NODE_PATH"), false);
  assert.equal(Object.hasOwn(capture.options.env, "npm_config_node_options"), false);
  assert.equal(capture.args.filter((arg) => arg.startsWith("--user-data-dir=")).length, 1);
  for (const required of [
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    "--disable-sync",
    "--disable-extensions",
    "--disable-component-extensions-with-background-pages",
    "--disable-background-networking",
    "--disable-component-update",
    "--no-first-run",
    "--no-default-browser-check",
    "--no-proxy-server"
  ]) assert.equal(capture.args.includes(required), true, required);
  const appArg = capture.args.find((arg) => arg.startsWith("--app="));
  assert.ok(appArg);
  const appUrl = new URL(appArg.slice("--app=".length));
  assert.equal(appUrl.hostname, "127.0.0.1");
  assert.equal(appUrl.pathname, "/");
  assert.equal(appUrl.search, "");
  const port = Number(appUrl.port);
  assert.ok(Number.isInteger(port) && port > 0);
  const profileRoot = capture.args.find((arg) => arg.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
  assert.deepEqual(capture.args, [
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
    `--app=${appUrl.href}`
  ]);
  const sessionRoot = dirname(profileRoot);
  assert.equal((await lstat(profileRoot)).isDirectory(), true);
  const page = await httpCall({ port });
  assert.equal(page.status, 200);
  assert.match(page.body, /两席合成并列自检/u);
  assert.doesNotMatch(page.body, /type="file"/u);
  assert.match(page.headers["content-security-policy"], /connect-src 'none'/u);
  const icon = await httpCall({ port, path: "/pair-compare-synthetic-icon.svg" });
  assert.equal(icon.status, 200);
  assert.match(icon.headers["content-type"], /^image\/svg\+xml/u);
  assert.match(icon.body, /^<svg/u);
  assert.equal((await httpCall({ port, path: "/pair-compare.html" })).status, 404);
  assert.equal((await httpCall({ port, path: "/pair-compare.js" })).status, 404);
  assert.equal((await httpCall({ port, path: "/pair-compare-server.mjs" })).status, 404);
  assert.equal((await httpCall({ port, path: "/seat-a.html" })).status, 404);
  assert.equal((await httpCall({ port, hostHeader: "localhost" })).status, 421);
  const exitWait = waitForSyntheticPairViewerBrowserExitCandidate(run);
  const stop = await stopSyntheticPairViewerCleanProfileCandidate(run, "operator");
  assert.equal((await exitWait).kind, "exit");
  assert.equal(stop.successfulCandidateShutdown, true);
  assert.equal(stop.safeCleanupCompleted, true);
  assert.equal(stop.sessionEndAcceptedForCli, true);
  assert.equal(stop.spawnedBrowserProcessHandleExitObserved, true);
  assert.equal(stop.serverClosedObserved, true);
  assert.equal(stop.initialEndpointIdentityMatchedBeforeRemovalAttemptObserved, true);
  assert.equal(stop.boundedRepeatedPathAbsenceAfterRemovalAttemptObserved, true);
  assert.equal(stop.testAdapterUsed, true);
  assert.equal(terminateCount, 1);
  await assert.rejects(() => lstat(sessionRoot), (error) => error?.code === "ENOENT");
  assert.deepEqual(await stopSyntheticPairViewerCleanProfileCandidate(run, "operator"), stop);
  assert.equal(terminateCount, 1);
});

test("turns an exact synthetic CDP observation into a non-formal runtime candidate", async () => {
  const fake = new FakeBrowserProcess();
  let expectedUrl;
  const run = await startWithTestAdapter(await validPreflight(), {
    spawnBrowser(_executable, args) {
      expectedUrl = args.find((arg) => arg.startsWith("--app=")).slice("--app=".length);
      fake.markSpawned();
      return fake;
    },
    async terminateBrowser(child) {
      child.complete(0, null);
      return true;
    }
  });
  let probe;
  try {
    probe = await probeWithTestAdapter(run, {
      collectRuntimeProbe(input) {
        assert.equal(input.expectedUrl, expectedUrl);
        assert.equal(input.browserFamily, "chrome");
        assert.match(input.profileRoot, /browser-profile$/u);
        return runtimeProbeFixture(input.expectedUrl);
      }
    });
    assert.equal(probe.recordType, "bazi_review_ui_synthetic_pair_cdp_precleanup_probe_candidate_v1");
    assert.equal(probe.purpose, "synthetic_pair_viewer_visual_qa_only");
    assert.equal(probe.evidenceClass, "engineering_runtime_precleanup_observation_only");
    assert.equal(probe.admissionEffect, "none");
    assert.equal(probe.observed.comparedFieldCount, 58);
    assert.equal(probe.observed.exactMatchCount, 54);
    assert.equal(probe.observed.unresolvedDifferenceCount, 4);
    assert.equal(probe.observed.formalTwoOfTwoCountDelta, 0);
    assert.equal(probe.checks.syntheticSelfCheckPassed, true);
    assert.equal(probe.checks.testAdapterUsed, true);
    assert.equal(probe.testAdapterUsed, true);
    assert.equal(probe.cleanupObserved, false);
    assert.equal(probe.eligibleForFinalSessionObservation, false);
    assert.equal(probe.boundary.formalAdmissionAllowed, false);
    assert.equal(probe.boundary.expertTruthEstablished, false);
    assert.equal(probe.boundary.releaseReady, false);
    assert.doesNotMatch(JSON.stringify(probe), /127\.0\.0\.1|browser-profile|DevToolsActivePort/u);
    assert.equal(await probeSyntheticPairViewerRuntimeCandidate(run), probe);
    assert.throws(
      () => finalizeSyntheticPairViewerSessionObservationCandidate(probe, {}),
      (error) => error instanceof SyntheticPairLauncherCandidateError
        && error.code === "STOP_OBSERVATION_CAPABILITY_REQUIRED"
    );
  } finally {
    const stop = await stopSyntheticPairViewerCleanProfileCandidate(run, "operator");
    assert.equal(stop.safeCleanupCompleted, true);
    if (probe) {
      assert.throws(
        () => finalizeSyntheticPairViewerSessionObservationCandidate(probe, stop),
        (error) => error instanceof SyntheticPairLauncherCandidateError
          && error.code === "REAL_RUNTIME_OBSERVATION_REQUIRED"
      );
    }
  }
});

test("fails closed when a synthetic runtime probe reports drift and still permits exact cleanup", async () => {
  const fake = new FakeBrowserProcess();
  const run = await startWithTestAdapter(await validPreflight(), {
    spawnBrowser() {
      fake.markSpawned();
      return fake;
    },
    async terminateBrowser(child) {
      child.complete(0, null);
      return true;
    }
  });
  try {
    await assert.rejects(
      () => probeWithTestAdapter(run, {
        collectRuntimeProbe({ expectedUrl }) {
          return runtimeProbeFixture(expectedUrl, (value) => {
            value.completed.formalCount = "1";
          });
        }
      }),
      (error) => error instanceof SyntheticPairLauncherCandidateError
        && error.code === "RUNTIME_PROBE_RESULT_INVALID"
    );
  } finally {
    const stop = await stopSyntheticPairViewerCleanProfileCandidate(run, "error");
    assert.equal(stop.safeCleanupCompleted, true);
    assert.equal(stop.sessionEndAcceptedForCli, false);
  }
});

test("rejects inherited or non-function runtime probe adapters", async () => {
  const fake = new FakeBrowserProcess();
  const run = await startWithTestAdapter(await validPreflight(), {
    spawnBrowser() {
      fake.markSpawned();
      return fake;
    },
    async terminateBrowser(child) {
      child.complete(0, null);
      return true;
    }
  });
  try {
    await assert.rejects(
      () => probeSyntheticPairViewerRuntimeCandidate(run, Object.create({ collectRuntimeProbe() {} })),
      (error) => error instanceof SyntheticPairLauncherCandidateError
        && error.code === "RUNTIME_ADAPTER_INVALID"
    );
    await assert.rejects(
      () => probeSyntheticPairViewerRuntimeCandidate(run, { collectRuntimeProbe: true }),
      (error) => error instanceof SyntheticPairLauncherCandidateError
        && error.code === "RUNTIME_ADAPTER_INVALID"
    );
  } finally {
    const stop = await stopSyntheticPairViewerCleanProfileCandidate(run, "operator");
    assert.equal(stop.safeCleanupCompleted, true);
  }
});

test("rejects inherited runtime adapters instead of mislabelling them as a default-browser run", async () => {
  const preflight = await validPreflight();
  const inherited = Object.create({
    spawnBrowser() { throw new Error("must never run"); },
    terminateBrowser() { throw new Error("must never run"); }
  });
  await assert.rejects(
    () => startSyntheticPairViewerCleanProfileCandidate(preflight, inherited),
    (error) => error instanceof SyntheticPairLauncherCandidateError && error.code === "RUNTIME_ADAPTER_INVALID"
  );
});

test("rejects Proxy and cloned adapter shapes before any hidden test hook can run", async () => {
  const preflight = await validPreflight();
  let spawnCalled = false;
  const proxy = new Proxy({}, {
    ownKeys() {
      return [];
    },
    getOwnPropertyDescriptor(_target, key) {
      if (key === "spawnBrowser") {
        return {
          configurable: true,
          enumerable: true,
          value() {
            spawnCalled = true;
          },
          writable: false
        };
      }
      return undefined;
    }
  });
  await assert.rejects(
    () => startSyntheticPairViewerCleanProfileCandidate(preflight, proxy),
    (error) => error instanceof SyntheticPairLauncherCandidateError
      && error.code === "RUNTIME_ADAPTER_INVALID"
  );
  assert.equal(spawnCalled, false);

  assert.throws(
    () => createSyntheticPairLauncherTestAdapter({ spawnBrowser() {} }),
    (error) => error instanceof SyntheticPairLauncherCandidateError
      && error.code === "TEST_ADAPTER_FACTORY_INPUT_INVALID"
  );

  assert.throws(
    () => createSyntheticPairLauncherTestAdapter(new Proxy({
      spawnBrowser() {
        spawnCalled = true;
      },
      terminateBrowser() {
        return true;
      }
    }, {})),
    (error) => error instanceof SyntheticPairLauncherCandidateError
      && error.code === "TEST_ADAPTER_FACTORY_INPUT_INVALID"
  );
  assert.equal(spawnCalled, false);

  const branded = createSyntheticPairLauncherTestAdapter({
    spawnBrowser() {
      spawnCalled = true;
    },
    terminateBrowser() {
      return true;
    }
  });
  await assert.rejects(
    () => startSyntheticPairViewerCleanProfileCandidate(preflight, structuredClone(branded)),
    (error) => error instanceof SyntheticPairLauncherCandidateError
      && error.code === "RUNTIME_ADAPTER_INVALID"
  );
  assert.equal(spawnCalled, false);
});

for (const fixture of [
  { label: "zero exit", event: "exit", code: 0, signal: null, accepted: true, failed: false },
  { label: "nonzero exit", event: "exit", code: 7, signal: null, accepted: false, failed: true },
  { label: "signal exit", event: "exit", code: null, signal: "SIGTERM", accepted: false, failed: true },
  { label: "post-spawn error", event: "error", code: null, signal: null, accepted: false, failed: true }
]) {
  test(`keeps cleanup success separate from ${fixture.label}`, async () => {
    const fake = new FakeBrowserProcess();
    const run = await startWithTestAdapter(await validPreflight(), {
      spawnBrowser() {
        fake.markSpawned();
        return fake;
      },
      async terminateBrowser(child) {
        if (fixture.event === "error" && child.exitCode === null && child.signalCode === null) {
          child.exitCode = 1;
          child.emit("exit", 1, null);
        }
        return true;
      }
    });
    if (fixture.event === "error") fake.emit("error", new Error("synthetic browser failure"));
    else fake.complete(fixture.code, fixture.signal);
    const observation = await waitForSyntheticPairViewerBrowserExitCandidate(run);
    const stop = await stopSyntheticPairViewerCleanProfileCandidate(
      run,
      observation.kind === "exit" ? "browser_exit" : "error"
    );
    assert.equal(stop.safeCleanupCompleted, true);
    assert.equal(stop.successfulCandidateShutdown, fixture.accepted);
    assert.equal(stop.sessionEndAcceptedForCli, fixture.accepted);
    assert.equal(stop.browserFailureObserved, fixture.failed);
    assert.deepEqual(stop.browserExitObservation, observation);
  });
}

test("rejects a nonzero browser exit first observed during operator shutdown", async () => {
  const fake = new FakeBrowserProcess();
  const run = await startWithTestAdapter(await validPreflight(), {
    spawnBrowser() {
      fake.markSpawned();
      return fake;
    },
    async terminateBrowser(child) {
      child.complete(7, null);
      return true;
    }
  });
  const stop = await stopSyntheticPairViewerCleanProfileCandidate(run, "operator");
  assert.deepEqual(stop.browserExitObservation, { kind: "exit", code: 7, signal: null });
  assert.equal(stop.browserFailureObserved, true);
  assert.equal(stop.sessionEndAcceptedForCli, false);
  assert.equal(stop.safeCleanupCompleted, true);
  assert.equal(stop.successfulCandidateShutdown, false);
});

test("preserves the exact session when browser shutdown cannot be confirmed", async (t) => {
  let capture;
  const fake = new FakeBrowserProcess();
  const run = await startWithTestAdapter(await validPreflight(), {
    spawnBrowser(executable, args, options) {
      capture = { executable, args, options };
      fake.markSpawned();
      return fake;
    },
    async terminateBrowser() {
      return false;
    }
  });
  const profileRoot = capture.args.find((arg) => arg.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
  const sessionRoot = dirname(profileRoot);
  t.after(() => removeExactTestSession(sessionRoot));
  const stop = await stopSyntheticPairViewerCleanProfileCandidate(run, "error");
  assert.equal(stop.spawnedBrowserProcessHandleExitObserved, false);
  assert.equal(stop.serverClosedObserved, true);
  assert.equal(stop.initialEndpointIdentityMatchedBeforeRemovalAttemptObserved, false);
  assert.equal(stop.successfulCandidateShutdown, false);
  assert.equal((await lstat(sessionRoot)).isDirectory(), true);
});

test("refuses cleanup after the session endpoint identity is replaced", async (t) => {
  let capture;
  const fake = new FakeBrowserProcess();
  const run = await startWithTestAdapter(await validPreflight(), {
    spawnBrowser(executable, args, options) {
      capture = { executable, args, options };
      fake.markSpawned();
      return fake;
    },
    async terminateBrowser(child) {
      child.complete(0, null);
      return true;
    }
  });
  const profileRoot = capture.args.find((arg) => arg.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
  const sessionRoot = dirname(profileRoot);
  const moved = `${sessionRoot}-moved`;
  await rename(sessionRoot, moved);
  await mkdir(sessionRoot);
  t.after(async () => {
    await removeExactTestSession(sessionRoot);
    await removeExactTestSession(moved);
  });
  const stop = await stopSyntheticPairViewerCleanProfileCandidate(run, "operator");
  assert.equal(stop.spawnedBrowserProcessHandleExitObserved, true);
  assert.equal(stop.serverClosedObserved, true);
  assert.equal(stop.initialEndpointIdentityMatchedBeforeRemovalAttemptObserved, false);
  assert.equal(stop.cleanupReasonCode, "endpoint_identity_changed");
  assert.equal(stop.successfulCandidateShutdown, false);
});

test("keeps every runtime, expert, AI, formal, release and erasure claim closed", () => {
  assert.equal(SYNTHETIC_PAIR_LAUNCH_BOUNDARY.syntheticFixtureOnly, true);
  assert.equal(SYNTHETIC_PAIR_LAUNCH_BOUNDARY.syntheticQaDecisionLiteralMatched, true);
  for (const key of [
    "realReturnLoadingAuthorized",
    "ownerIdentityEstablished",
    "ownerAuthorizationAuthenticityEstablished",
    "sourceBundlePinProvenanceVerified",
    "sourceBundleSignatureVerified",
    "browserExecutablePinProvenanceVerified",
    "browserPublisherSignatureVerified",
    "runningProcessImageVerified",
    "runtimeBrowserFamilySelfReportVerified",
    "devToolsEndpointBoundToSpawnedProcess",
    "browserHonoredUserDataDirVerified",
    "browserProfileIsolationEstablished",
    "preexistingServiceWorkerExcluded",
    "browserExtensionInterceptionExcluded",
    "externalNetworkExcluded",
    "initialSyntheticNavigationObserved",
    "continuousTargetDiscoveryEstablished",
    "browserWideNetworkObserved",
    "responseBodyDigestVerified",
    "requestResponseLoaderCorrelationEstablished",
    "fromServiceWorkerExcluded",
    "remoteEndpointIdentityVerified",
    "gracefulBrowserCloseCausalityEstablished",
    "browserProcessTreeClosureEstablished",
    "osProcessListPathExposureExcluded",
    "crashDumpPathExposureExcluded",
    "trustedBootstrapEstablished",
    "samePrivilegeIntervalMutationExcluded",
    "abaExcluded",
    "replayExcluded",
    "cleanupAtomicityEstablished",
    "physicalErasureEstablished",
    "actualHumanParticipationEstablished",
    "actualHumanIndependenceEstablished",
    "reviewerIdentityEstablished",
    "reviewerQualificationEstablished",
    "reviewerScopeEstablished",
    "reviewerConsentEstablished",
    "opinionAuthenticityEstablished",
    "trustedFirstSeenEstablished",
    "custodyEstablished",
    "humanAttestationEstablished",
    "personDataPresenceAssessed",
    "personDerivedDigestExcluded",
    "safeToPublish",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "expertVsAiAccuracyEvaluated",
    "predictiveAccuracyEvaluated",
    "rightsLegalConclusionEstablished",
    "countsTowardFormal2of2",
    "countsTowardExpertGate",
    "formalAdmissionAllowed",
    "pilotToFormalConversionAllowed",
    "releaseReady",
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized",
    "expertClaimsAuthorized"
  ]) assert.equal(SYNTHETIC_PAIR_LAUNCH_BOUNDARY[key], false, key);
  assert.equal(SYNTHETIC_PAIR_LAUNCH_BOUNDARY.formalTwoOfTwoCountDelta, 0);
  assert.equal(SYNTHETIC_PAIR_LAUNCH_BOUNDARY.expertGateCountDelta, 0);
  assert.equal(SYNTHETIC_PAIR_LAUNCH_BOUNDARY.bindingFrozenCountDelta, 0);
  assert.equal(SYNTHETIC_PAIR_LAUNCH_BOUNDARY.verifiedExpertCountDelta, 0);
});

test("synthetic entry has no file, paste, storage, service-worker, or upload transport surface", async () => {
  const [html, pageSource] = await Promise.all([
    readFile(join(SOURCE_ROOT, "pair-compare-synthetic.html"), "utf8"),
    readFile(join(SOURCE_ROOT, "pair-compare-synthetic.js"), "utf8")
  ]);
  const combined = `${html}\n${pageSource}`;
  assert.doesNotMatch(combined, /type=["']file|dragover|drop|paste|clipboard|showOpenFilePicker|FileReader|localStorage|sessionStorage|indexedDB|document\.cookie|serviceWorker|new\s+WebSocket|XMLHttpRequest|\bfetch\s*\(/iu);
  assert.doesNotMatch(html, /<input|<textarea|contenteditable/iu);
  assert.match(html, /connect-src 'none'/u);
  assert.match(html, /realReturnLoadingAuthorized=false/u);
});

test("cleans the exact fresh session when an injected browser spawn fails after server bind", async () => {
  let sessionRoot;
  const fake = new FakeBrowserProcess();
  const preflight = await validPreflight();
  await assert.rejects(
    () => startWithTestAdapter(preflight, {
      spawnBrowser(executable, args) {
        const profileRoot = args.find((arg) => arg.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
        sessionRoot = dirname(profileRoot);
        queueMicrotask(() => fake.emit("error", new Error("synthetic spawn failure")));
        return fake;
      },
      async terminateBrowser() {
        fake.exitCode = 1;
        return true;
      }
    }),
    (error) => error instanceof SyntheticPairLauncherCandidateError && error.code === "BROWSER_SPAWN_FAILED"
  );
  assert.equal(typeof sessionRoot, "string");
  await assert.rejects(() => lstat(sessionRoot), (error) => error?.code === "ENOENT");
});

test("reports startup cleanup as unconfirmed when a failed browser cannot be terminated", async (t) => {
  let sessionRoot;
  const fake = new FakeBrowserProcess();
  const preflight = await validPreflight();
  await assert.rejects(
    () => startWithTestAdapter(preflight, {
      spawnBrowser(executable, args) {
        const profileRoot = args.find((arg) => arg.startsWith("--user-data-dir=")).slice("--user-data-dir=".length);
        sessionRoot = dirname(profileRoot);
        queueMicrotask(() => fake.emit("error", new Error("synthetic spawn failure")));
        return fake;
      },
      async terminateBrowser() {
        return false;
      }
    }),
    (error) => error instanceof SyntheticPairLauncherCandidateError
      && error.code === "PAIR_SESSION_START_CLEANUP_UNCONFIRMED"
  );
  assert.equal(typeof sessionRoot, "string");
  assert.equal((await lstat(sessionRoot)).isDirectory(), true);
  t.after(() => removeExactTestSession(sessionRoot));
});

test("requires an allowlisted no-profile wrapper and emits only digests plus authority-none", async (t) => {
  const direct = spawnSync(process.execPath, [CORE_PATH, "--observe", "--browser-family", "chrome"], {
    cwd: SOURCE_ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" }
  });
  assert.notEqual(direct.status, 0);
  assert.equal(direct.stdout, "");
  assert.equal(direct.stderr.trim(), "PAIR_COMPARE_SYNTHETIC_LAUNCHER_REJECTED SOURCE_WRAPPER_REQUIRED");

  const runtimeOutputRoot = await mkdtemp(join(tmpdir(), "hakimi-pair-wrapper-runtime-env-"));
  t.after(() => rm(runtimeOutputRoot, { recursive: true, force: true }));
  const coverageRoot = join(runtimeOutputRoot, "coverage");
  const compileCacheRoot = join(runtimeOutputRoot, "compile-cache");
  const wrapped = spawnSync(POWERSHELL, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", WRAPPER_PATH,
    "--observe", "--browser-family", "chrome"
  ], {
    cwd: SOURCE_ROOT,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
    env: {
      ...process.env,
      NODE_OPTIONS: "--definitely-invalid-node-option",
      NODE_PATH: SOURCE_ROOT,
      npm_config_node_options: "--definitely-invalid-node-option",
      NODE_V8_COVERAGE: coverageRoot,
      NODE_COMPILE_CACHE: compileCacheRoot,
      NODE_DEBUG: "module"
    }
  });
  assert.equal(wrapped.status, 0, wrapped.stderr);
  assert.match(wrapped.stdout, /^PAIR_COMPARE_VIEWER_SOURCE_SHA256 [a-f0-9]{64}$/mu);
  assert.match(wrapped.stdout, /^PAIR_COMPARE_BROWSER_EXECUTABLE_SHA256 [a-f0-9]{64}$/mu);
  assert.match(wrapped.stdout, /^PAIR_COMPARE_OBSERVATION_AUTHORITY none$/mu);
  assert.doesNotMatch(wrapped.stdout + wrapped.stderr, /C:\\Users|Documents|chrome\.exe|pair-compare-synthetic\.html/u);
  assert.equal(wrapped.stderr, "");
  await assert.rejects(() => lstat(coverageRoot), (error) => error?.code === "ENOENT");
  await assert.rejects(() => lstat(compileCacheRoot), (error) => error?.code === "ENOENT");
});
