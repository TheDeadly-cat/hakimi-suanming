import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";

import {
  buildSingleBindingIntegratedPhysicalPairCandidate,
  createSingleBindingIntegratedPhysicalIds
} from "../single-binding-integrated-package-builder.mjs";
import { prepareSingleBindingIntegratedPhysicalSeatPackage } from "../single-binding-integrated-physical-package.mjs";
import {
  preflightSingleBindingIntegratedPhysicalCleanProfileCandidate,
  releaseSingleBindingIntegratedPhysicalCleanProfilePreflightCandidate,
  startSingleBindingIntegratedPhysicalCleanProfileCandidate,
  stopSingleBindingIntegratedPhysicalCleanProfileCandidate
} from "../single-binding-integrated-physical-clean-profile-runner.mjs";

const browserPath = process.env.HAKIMI_PHYSICAL_BROWSER_EXECUTABLE;
const browserFamily = process.env.HAKIMI_PHYSICAL_BROWSER_FAMILY;
const browserSha256 = process.env.HAKIMI_PHYSICAL_BROWSER_SHA256;
const configured = typeof browserPath === "string" && browserPath.length > 0
  && new Set(["chrome", "edge"]).has(browserFamily)
  && typeof browserSha256 === "string" && /^[a-f0-9]{64}$/u.test(browserSha256);

test("real installed browser starts from the verified-memory seat in a fresh profile and closes conservatively", {
  skip: configured ? false : "explicit browser path, family, and SHA-256 are required"
}, async (t) => {
  const canonicalTemp = await realpath(tmpdir());
  const ownedRoot = await mkdtemp(join(canonicalTemp, "hakimi-physical-clean-profile-real-browser-"));
  const canonicalOwnedRoot = await realpath(ownedRoot);
  assert.equal(dirname(canonicalOwnedRoot).toLowerCase(), canonicalTemp.toLowerCase());
  assert.match(basename(canonicalOwnedRoot), /^hakimi-physical-clean-profile-real-browser-/u);
  let preflight = null;
  let run = null;
  let stopped = false;
  t.after(async () => {
    if (run !== null && !stopped) {
      try { await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run, "error"); } catch { /* evidence stays failed */ }
    } else if (preflight !== null && run === null) {
      try { await releaseSingleBindingIntegratedPhysicalCleanProfilePreflightCandidate(preflight); } catch { /* evidence stays failed */ }
    }
    const metadata = await lstat(canonicalOwnedRoot, { bigint: true });
    const observed = await realpath(canonicalOwnedRoot);
    assert.equal(metadata.isDirectory(), true);
    assert.equal(metadata.isSymbolicLink(), false);
    assert.equal(observed.toLowerCase(), canonicalOwnedRoot.toLowerCase());
    assert.equal(dirname(observed).toLowerCase(), canonicalTemp.toLowerCase());
    assert.match(basename(observed), /^hakimi-physical-clean-profile-real-browser-/u);
    await rm(observed, { recursive: true, force: false });
  });

  const actualBrowserBytes = await readFile(browserPath);
  assert.equal(createHash("sha256").update(actualBrowserBytes).digest("hex"), browserSha256);
  actualBrowserBytes.fill(0);

  const ids = createSingleBindingIntegratedPhysicalIds();
  const build = await buildSingleBindingIntegratedPhysicalPairCandidate({
    ...ids,
    outputDirectory: join(canonicalOwnedRoot, "pair")
  });
  const prepared = await prepareSingleBindingIntegratedPhysicalSeatPackage({
    pairRoot: build.outputDirectory,
    expectedPairPrecommitRawSha256: build.pairPrecommitRawSha256,
    expectedPairManifestRawSha256: build.pairManifestRawSha256,
    expectedSeatPackageManifestRawSha256: build.seatA.manifestRawSha256,
    expectedReviewCycleId: build.reviewCycleId,
    expectedPairRunId: build.pairRunId,
    expectedSeatId: "A",
    expectedSeatSessionNonce: build.runtimeSessionBindings.A.seatSessionNonce
  });
  preflight = await preflightSingleBindingIntegratedPhysicalCleanProfileCandidate({
    browserExecutablePath: browserPath,
    browserFamily,
    displayMode: "headless_test",
    expectedBrowserExecutableRawSha256: browserSha256,
    preparedSeatPackageCapability: prepared,
    realPersonUseAuthorized: false,
    realReturnLoadingAuthorized: false,
    syntheticDataOnly: true
  });
  run = await startSingleBindingIntegratedPhysicalCleanProfileCandidate(preflight);
  assert.equal(run.recordType, "bazi_expert_single_binding_physical_clean_profile_run_candidate_v1");
  assert.equal(run.checks.testAdapterUsed, false);
  assert.equal(run.boundary.physicalExpertSurfaceReady, false);
  assert.equal(run.boundary.externalNetworkExcluded, false);
  assert.equal(run.boundary.browserProfileIsolationEstablished, false);
  const response = await fetch(run.entryUrl);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /八字单题独立复核演练/u);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
  const observation = await stopSingleBindingIntegratedPhysicalCleanProfileCandidate(run, "operator");
  stopped = true;
  assert.equal(observation.recordType,
    "bazi_expert_single_binding_physical_clean_profile_stop_observation_candidate_v1");
  assert.equal(observation.browserProcessCreated, true);
  assert.equal(observation.browserTerminalObserved, true);
  assert.equal(observation.serverStartSucceeded, true);
  assert.equal(observation.serverClosedObserved, true);
  assert.equal(observation.sessionCreated, true);
  assert.equal(observation.sessionProfileRemovedObserved, true);
  assert.equal(observation.cleanupComplete, true);
  assert.equal(observation.successfulCandidateShutdown, true);
  assert.equal(observation.returnCaptured, false);
  assert.equal(observation.browserProfileWritesObserved, false);
  assert.equal(observation.productStorageMutationExcluded, false);
  assert.equal(observation.schema13MutationEpochUsedByRunner, false);
  await assert.rejects(() => lstat(run.sessionRoot), (error) => error?.code === "ENOENT");
});
