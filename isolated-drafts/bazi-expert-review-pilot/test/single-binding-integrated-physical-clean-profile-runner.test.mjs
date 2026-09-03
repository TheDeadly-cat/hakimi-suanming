import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { copyFile, lstat, mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Server } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";

import {
  buildSingleBindingIntegratedPhysicalPairCandidate,
  createSingleBindingIntegratedPhysicalIds
} from "../single-binding-integrated-package-builder.mjs";
import {
  prepareSingleBindingIntegratedPhysicalSeatPackage,
  releaseSingleBindingIntegratedPhysicalSeatPackage
} from "../single-binding-integrated-physical-package.mjs";
import {
  SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY,
  SingleBindingIntegratedPhysicalCleanProfileRunnerError,
  createSingleBindingIntegratedPhysicalCleanProfileRunnerTestAdapter,
  preflightSingleBindingIntegratedPhysicalCleanProfileCandidate,
  releaseSingleBindingIntegratedPhysicalCleanProfilePreflightCandidate,
  startSingleBindingIntegratedPhysicalCleanProfileCandidate,
  stopSingleBindingIntegratedPhysicalCleanProfileCandidate
} from "../single-binding-integrated-physical-clean-profile-runner.mjs";

async function ownedTemp(t, label) {
  const temp = await realpath(tmpdir());
  const root = await mkdtemp(join(temp, `hakimi-clean-profile-runner-${label}-`));
  const canonical = await realpath(root);
  assert.equal(dirname(canonical).toLowerCase(), temp.toLowerCase());
  t.after(async () => {
    try {
      const endpoint = await realpath(canonical);
      assert.equal(endpoint.toLowerCase(), canonical.toLowerCase());
      assert.match(basename(endpoint), /^hakimi-clean-profile-runner-/u);
      await rm(endpoint, { recursive: true, force: false });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  });
  return canonical;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fixtureBrowser(t, root, family = "chrome") {
  const path = join(root, family === "chrome" ? "chrome.exe" : "msedge.exe");
  await copyFile(process.execPath, path);
  return { path, rawSha256: sha256(await readFile(path)) };
}

async function preparedSeat(t, root, seatId = "A") {
  const ids = createSingleBindingIntegratedPhysicalIds();
  const build = await buildSingleBindingIntegratedPhysicalPairCandidate({
    ...ids,
    outputDirectory: join(root, `pair-${seatId.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}`)
  });
  const seat = seatId === "A" ? build.seatA : build.seatB;
  const capability = await prepareSingleBindingIntegratedPhysicalSeatPackage({
    pairRoot: build.outputDirectory,
    expectedPairPrecommitRawSha256: build.pairPrecommitRawSha256,
    expectedPairManifestRawSha256: build.pairManifestRawSha256,
    expectedSeatPackageManifestRawSha256: seat.manifestRawSha256,
    expectedReviewCycleId: build.reviewCycleId,
    expectedPairRunId: build.pairRunId,
    expectedSeatId: seatId,
    expectedSeatSessionNonce: build.runtimeSessionBindings[seatId].seatSessionNonce
  });
  return { build, capability };
}

function preflightRequest(prepared, browser, overrides = {}) {
  return {
    browserExecutablePath: browser.path,
    browserFamily: "chrome",
    displayMode: "headless_test",
    expectedBrowserExecutableRawSha256: browser.rawSha256,
    preparedSeatPackageCapability: prepared,
    realPersonUseAuthorized: false,
    realReturnLoadingAuthorized: false,
    syntheticDataOnly: true,
    ...overrides
  };
}

function fakeBrowserAdapter(state) {
  return createSingleBindingIntegratedPhysicalCleanProfileRunnerTestAdapter({
    spawnBrowser(executable, args, options) {
      state.spawn = { executable, args, options };
      if (state.spawnThrows) throw new Error("synthetic spawn adapter failure");
      const child = new EventEmitter();
      child.exitCode = null;
      child.signalCode = null;
      child.pid = 424242;
      child.kill = () => false;
      state.child = child;
      queueMicrotask(() => child.emit(state.spawnErrors ? "error" : "spawn", new Error("synthetic event")));
      return child;
    },
    async terminateBrowser(child) {
      state.terminateCalls = (state.terminateCalls ?? 0) + 1;
      if (state.allowTerminate === false) return false;
      child.exitCode = 0;
      child.emit("exit", 0, null);
      return true;
    }
  });
}

test("preflight requires an exact explicit executable pin before consuming the prepared package capability", async (t) => {
  const root = await ownedTemp(t, "preflight");
  const browser = await fixtureBrowser(t, root);
  const { capability: prepared } = await preparedSeat(t, root);

  await assert.rejects(
    () => preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(preflightRequest(prepared, browser, {
      expectedBrowserExecutableRawSha256: "1".repeat(64)
    })),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "BROWSER_EXECUTABLE_PIN_MISMATCH"
  );

  const preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(prepared, browser)
  );
  assert.equal(preflight.checks.explicitBrowserExecutableRawSha256Matched, true);
  assert.equal(preflight.checks.preparedSeatPackageCapabilityConsumedByCurrentProcessVerifier, true);
  assert.equal(preflight.checks.verifiedServerPayloadCapabilityCreatedAndNotStarted, true);
  assert.equal(preflight.boundary.physicalExpertSurfaceReady, false);
  assert.equal(preflight.boundary.browserProfileIsolationEstablished, false);
  assert.equal(preflight.boundary.externalNetworkExcluded, false);
  assert.equal(preflight.boundary.browserProcessTreeClosureEstablished, false);

  await assert.rejects(
    () => startSingleBindingIntegratedPhysicalCleanProfileCandidate(structuredClone(preflight)),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "PREFLIGHT_CAPABILITY_INVALID"
  );
  const released = await releaseSingleBindingIntegratedPhysicalCleanProfilePreflightCandidate(preflight);
  assert.equal(released.released, true);
  await assert.rejects(
    () => releaseSingleBindingIntegratedPhysicalCleanProfilePreflightCandidate(preflight),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "PREFLIGHT_CAPABILITY_INVALID"
  );
});

test("preflight rejects family/path mismatch and accessor-shaped requests without consuming package state", async (t) => {
  const root = await ownedTemp(t, "request");
  const browser = await fixtureBrowser(t, root);
  const first = await preparedSeat(t, root);
  await assert.rejects(
    () => preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(preflightRequest(first.capability, browser, {
      browserFamily: "edge"
    })),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "BROWSER_EXECUTABLE_INVALID"
  );
  const valid = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(first.capability, browser)
  );
  await releaseSingleBindingIntegratedPhysicalCleanProfilePreflightCandidate(valid);

  const second = await preparedSeat(t, root, "B");
  let getterCalled = false;
  const request = preflightRequest(second.capability, browser);
  Object.defineProperty(request, "browserFamily", {
    enumerable: true,
    get() { getterCalled = true; return "chrome"; }
  });
  await assert.rejects(
    () => preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(request),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "PREFLIGHT_REQUEST_INVALID"
  );
  assert.equal(getterCalled, false);
  const released = await releaseSingleBindingIntegratedPhysicalSeatPackage(second.capability);
  assert.equal(released.released, true);
});

test("start uses random loopback, a new external profile, fixed browser flags, sanitized env, and exact post-spawn identity", async (t) => {
  const root = await ownedTemp(t, "start-stop");
  const browser = await fixtureBrowser(t, root);
  const { capability: prepared } = await preparedSeat(t, root);
  const preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(prepared, browser)
  );
  const adapterState = { allowTerminate: true };
  const adapter = fakeBrowserAdapter(adapterState);
  const run = await startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight, adapter);

  assert.equal(run.checks.randomLoopbackServerStarted, true);
  assert.equal(run.checks.freshRepositoryExternalSystemTempSessionCreated, true);
  assert.equal(run.checks.browserExecutableIdentityReverifiedBeforeAndAfterSpawn, true);
  assert.equal(run.checks.testAdapterUsed, true);
  assert.equal(Object.hasOwn(run, "recordType"), false);
  assert.equal(run.admissibleRuntimeRecord, false);
  assert.match(run.entryUrl, /^http:\/\/127\.0\.0\.1:\d+\/$/u);
  assert.notEqual(new URL(run.entryUrl).port, "0");
  assert.equal(adapterState.spawn.executable.toLowerCase(), browser.path.toLowerCase());
  assert.equal(adapterState.spawn.options.shell, false);
  assert.equal(adapterState.spawn.options.cwd.toLowerCase(), run.sessionRoot.toLowerCase());
  assert.equal(adapterState.spawn.args.includes("--headless=new"), true);
  assert.equal(adapterState.spawn.args.some((value) => value.startsWith("--user-data-dir=")), true);
  for (const flag of [
    "--disable-extensions",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-component-update",
    "--no-proxy-server",
    "--proxy-bypass-list=*",
    `--app=${run.entryUrl}`
  ]) assert.equal(adapterState.spawn.args.includes(flag), true, flag);
  const inherited = Object.keys(adapterState.spawn.options.env).map((key) => key.toLowerCase());
  for (const forbidden of [
    "node_options", "node_path", "npm_config_node_options", "path", "home", "userprofile",
    "http_proxy", "https_proxy", "all_proxy", "no_proxy", "sslkeylogfile", "chrome_user_data_dir"
  ]) assert.equal(inherited.includes(forbidden), false, forbidden);
  assert.equal(adapterState.spawn.options.env.TEMP.startsWith(run.sessionRoot), true);
  assert.equal(adapterState.spawn.options.env.TMP.startsWith(run.sessionRoot), true);

  const liveResponse = await fetch(run.entryUrl);
  assert.equal(liveResponse.status, 200);
  assert.match(await liveResponse.text(), /八字单题独立复核演练/u);
  const stopped = await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run);
  assert.equal(stopped.browserTerminalObserved, true);
  assert.equal(stopped.serverClosedObserved, true);
  assert.equal(stopped.sessionProfileRemovedObserved, true);
  assert.equal(stopped.cleanupComplete, true);
  assert.equal(stopped.returnCaptured, false);
  assert.equal(Object.hasOwn(stopped, "recordType"), false);
  assert.equal(stopped.normalRunStopObservationIssued, false);
  assert.equal(stopped.boundary.physicalExpertSurfaceReady, false);
  await assert.rejects(() => lstat(run.sessionRoot), (error) => error?.code === "ENOENT");
  assert.equal(await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run), stopped);
  await assert.rejects(
    () => stopSingleBindingIntegratedPhysicalCleanProfileCandidate(structuredClone(run)),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "RUN_CAPABILITY_INVALID"
  );
});

test("stop fails closed when browser terminal state is unconfirmed, closes the server, preserves the profile, then retries", async (t) => {
  const root = await ownedTemp(t, "retry");
  const browser = await fixtureBrowser(t, root);
  const { capability: prepared } = await preparedSeat(t, root);
  const preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(prepared, browser)
  );
  const adapterState = { allowTerminate: false };
  const adapter = fakeBrowserAdapter(adapterState);
  const run = await startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight, adapter);

  await assert.rejects(
    () => stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "STOP_CLEANUP_UNCONFIRMED"
      && error.cleanupCapability === run
      && error.cleanupStatus.browserTerminalObserved === false
      && error.cleanupStatus.serverClosedObserved === true
      && error.cleanupStatus.sessionProfileRemovedObserved === false
  );
  assert.equal((await lstat(run.sessionRoot)).isDirectory(), true);
  await assert.rejects(() => fetch(run.entryUrl));

  adapterState.allowTerminate = true;
  const stopped = await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run, "error");
  assert.equal(stopped.cleanupComplete, true);
  assert.equal(stopped.browserTerminalObserved, true);
  assert.equal(stopped.serverClosedObserved, true);
  assert.equal(stopped.sessionProfileRemovedObserved, true);
  await assert.rejects(() => lstat(run.sessionRoot), (error) => error?.code === "ENOENT");
});

test("a synchronous spawn failure cleans server/session and cannot turn the preflight into a stop record", async (t) => {
  const root = await ownedTemp(t, "spawn-throw");
  const browser = await fixtureBrowser(t, root);
  const { capability: prepared } = await preparedSeat(t, root);
  const preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(prepared, browser)
  );
  const adapterState = { spawnThrows: true, allowTerminate: true };
  const adapter = fakeBrowserAdapter(adapterState);
  await assert.rejects(
    () => startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight, adapter),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "CLEAN_PROFILE_START_FAILED"
  );
  await assert.rejects(
    () => lstat(adapterState.spawn.options.cwd),
    (error) => error?.code === "ENOENT"
  );
  const appUrl = adapterState.spawn.args.find((value) => value.startsWith("--app=")).slice("--app=".length);
  await assert.rejects(() => fetch(appUrl));
  await assert.rejects(
    () => stopSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "RUN_CAPABILITY_INVALID"
  );
});

test("failed-start cleanup returns a retry capability and only an internal cleanup receipt", async (t) => {
  const root = await ownedTemp(t, "start-cleanup-retry");
  const browser = await fixtureBrowser(t, root);
  const { capability: prepared } = await preparedSeat(t, root);
  const preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(prepared, browser)
  );
  const adapterState = { spawnErrors: true, allowTerminate: false };
  const adapter = fakeBrowserAdapter(adapterState);
  let cleanupError;
  try {
    await startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight, adapter);
  } catch (error) {
    cleanupError = error;
  }
  assert.ok(cleanupError instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError);
  assert.equal(cleanupError.code, "START_CLEANUP_UNCONFIRMED");
  assert.equal(cleanupError.cleanupCapability, preflight);
  assert.equal(cleanupError.cleanupStatus.browserTerminalObserved, false);
  assert.equal(cleanupError.cleanupStatus.serverClosedObserved, true);
  assert.equal(cleanupError.cleanupStatus.sessionProfileRemovedObserved, false);
  assert.equal((await lstat(adapterState.spawn.options.cwd)).isDirectory(), true);

  adapterState.allowTerminate = true;
  const receipt = await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(
    cleanupError.cleanupCapability,
    "error"
  );
  assert.equal(Object.hasOwn(receipt, "recordType"), false);
  assert.equal(receipt.cleanupReceiptKind, "single_binding_integrated_physical_failed_start_cleanup_receipt_v1");
  assert.equal(receipt.failedStartCleanup, true);
  assert.equal(receipt.startSucceeded, false);
  assert.equal(receipt.browserProcessCreated, false);
  assert.equal(receipt.serverStartSucceeded, true);
  assert.equal(receipt.sessionCreated, true);
  assert.equal(receipt.successfulFailedStartCleanup, true);
  assert.equal(receipt.successfulCandidateShutdown, false);
  assert.equal(receipt.normalRunStopObservationIssued, false);
  assert.equal(receipt.cleanupComplete, true);
  await assert.rejects(() => lstat(adapterState.spawn.options.cwd), (error) => error?.code === "ENOENT");
  await assert.rejects(
    () => stopSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "RUN_CAPABILITY_INVALID"
  );
});

test("a source-server listen rejection consumes the payload and removes the fresh session without a stop record", async (t) => {
  const root = await ownedTemp(t, "server-listen-reject");
  const browser = await fixtureBrowser(t, root);
  const { capability: prepared } = await preparedSeat(t, root);
  const preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(prepared, browser)
  );
  const canonicalTemp = await realpath(tmpdir());
  const listRunnerSessions = async () => (await readdir(canonicalTemp, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()
      && entry.name.startsWith("hakimi-bazi-single-binding-physical-synthetic-"))
    .map((entry) => entry.name)
    .sort();
  const before = await listRunnerSessions();
  t.mock.method(Server.prototype, "listen", function () {
    const error = new Error("synthetic listen rejection");
    error.code = "SYNTHETIC_LISTEN_REJECTION";
    throw error;
  });
  try {
    await assert.rejects(
      () => startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight),
      (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
        && error.code === "CLEAN_PROFILE_START_FAILED"
    );
  } finally {
    t.mock.restoreAll();
  }
  assert.deepEqual(await listRunnerSessions(), before);
  await assert.rejects(
    () => stopSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "RUN_CAPABILITY_INVALID"
  );
});

test("start reserves the preflight before its first await and blocks concurrent start or release", async (t) => {
  const root = await ownedTemp(t, "concurrent-start");
  const browser = await fixtureBrowser(t, root);
  const { capability: prepared } = await preparedSeat(t, root);
  const preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(prepared, browser)
  );
  const adapterState = { allowTerminate: true };
  const adapter = fakeBrowserAdapter(adapterState);
  const firstStart = startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight, adapter);
  await assert.rejects(
    () => startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight, adapter),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "PREFLIGHT_CAPABILITY_INVALID"
  );
  await assert.rejects(
    () => releaseSingleBindingIntegratedPhysicalCleanProfilePreflightCandidate(preflight),
    (error) => error instanceof SingleBindingIntegratedPhysicalCleanProfileRunnerError
      && error.code === "PREFLIGHT_CAPABILITY_INVALID"
  );
  const run = await firstStart;
  const stopped = await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run);
  assert.equal(stopped.cleanupComplete, true);
  assert.equal(stopped.normalRunStopObservationIssued, false);
});

test("an observed natural browser exit and explicit stop converge on one cleanup receipt", async (t) => {
  const root = await ownedTemp(t, "exit-stop-race");
  const browser = await fixtureBrowser(t, root);
  const { capability: prepared } = await preparedSeat(t, root);
  const preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate(
    preflightRequest(prepared, browser)
  );
  const adapterState = { allowTerminate: true };
  const adapter = fakeBrowserAdapter(adapterState);
  const run = await startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight, adapter);
  adapterState.child.exitCode = 0;
  adapterState.child.emit("exit", 0, null);
  const first = await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run, "browser_exit");
  const second = await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run, "browser_exit");
  assert.equal(first, second);
  assert.equal(first.cleanupComplete, true);
  assert.equal(first.browserTerminalObserved, true);
  assert.equal(first.browserTerminationRequested, false);
  assert.equal(adapterState.terminateCalls ?? 0, 0);
  assert.equal(first.normalRunStopObservationIssued, false);
  await assert.rejects(() => lstat(run.sessionRoot), (error) => error?.code === "ENOENT");
});

test("boundary never promotes a synthetic process run into expert, truth, rights, or release authority", () => {
  assert.deepEqual({
    syntheticFixtureOnly: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.syntheticFixtureOnly,
    physicalExpertSurfaceReady: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.physicalExpertSurfaceReady,
    actualHumanParticipationEstablished:
      SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.actualHumanParticipationEstablished,
    contentTruthEstablished: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.contentTruthEstablished,
    expertTruthEstablished: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.expertTruthEstablished,
    rightsLegalConclusionEstablished:
      SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.rightsLegalConclusionEstablished,
    releaseReady: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.releaseReady,
    publicDeploymentAuthorized:
      SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.publicDeploymentAuthorized,
    expertClaimsAuthorized: SINGLE_BINDING_INTEGRATED_PHYSICAL_CLEAN_PROFILE_BOUNDARY.expertClaimsAuthorized
  }, {
    syntheticFixtureOnly: true,
    physicalExpertSurfaceReady: false,
    actualHumanParticipationEstablished: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
});
