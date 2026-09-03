import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
  WesternIndependentEngineeringManifestV3Error,
  buildCurrentWesternIndependentEngineeringManifestV3,
  computeWesternIndependentEngineeringManifestV3Digest,
  getWesternIndependentEngineeringManifestV3Summary,
  loadWesternIndependentEngineeringManifestV3,
  westernIndependentEngineeringManifestV3TestOnly
} from "./western-independent-engineering-manifest-v3-lib.mjs";
import { runWesternIndependentEngineeringManifestV3Verifier } from
  "./verify-western-independent-engineering-manifest-v3.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");

function rawManifest() {
  return JSON.parse(readFileSync(
    path.join(workspaceRoot, ...WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH.split("/")),
    "utf8"
  ));
}

test("v3 binds current predecessor, browser child, selected identities, and all-red gates", async () => {
  const result = await loadWesternIndependentEngineeringManifestV3(workspaceRoot);
  const summary = getWesternIndependentEngineeringManifestV3Summary(result);
  assert.equal(summary.passedScenarioOutcomes, 10);
  assert.equal(summary.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.admissionGatesSatisfied, 0);
  assert.equal(summary.bindingFrozenVerified, 0);
  assert.equal(summary.independentExpertReviewsVerified, 0);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.publicReleaseAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
  assert.ok(summary.selectedUniquePhysicalPathCount > 70);
  assert.equal(result.manifest.artifactBindings.length, 2);
  assert.equal(result.manifest.browserEvidenceBoundary.manifestRerunsBrowserMatrix, false);
  assert.equal(result.manifest.browserEvidenceBoundary.productionBrowserRuntimeEvidenceEstablished, false);
  assert.equal(result.manifest.selectedPathMachineIdentity.recursiveDirectoryEnumerationPerformed, false);
  assert.equal(result.manifest.selectedPathMachineIdentity.extraFileAbsenceEstablished, false);
  assert.ok(Object.values(result.manifest.authorityBoundary).every((value) => value === false));
});

test("current projection exactly equals persisted canonical projection", async () => {
  const current = await buildCurrentWesternIndependentEngineeringManifestV3(workspaceRoot);
  assert.equal(
    westernIndependentEngineeringManifestV3TestOnly.canonicalCompact(current),
    westernIndependentEngineeringManifestV3TestOnly.canonicalCompact(rawManifest())
  );
  assert.equal(current.manifestDigest, computeWesternIndependentEngineeringManifestV3Digest(current));
});

test("authority promotion and selected-path identity tampering fail closed", () => {
  const promoted = rawManifest();
  promoted.authorityBoundary.publicReleaseAuthorized = true;
  promoted.manifestDigest = computeWesternIndependentEngineeringManifestV3Digest(promoted);
  assert.throws(
    () => westernIndependentEngineeringManifestV3TestOnly.assertManifestBoundary(promoted),
    (error) => error instanceof WesternIndependentEngineeringManifestV3Error
      && error.code === "AUTHORITY_BOUNDARY_INVALID"
  );
  const tampered = rawManifest();
  tampered.selectedPathMachineIdentity.files[0].sha256 = "0".repeat(64);
  tampered.manifestDigest = computeWesternIndependentEngineeringManifestV3Digest(tampered);
  assert.throws(
    () => westernIndependentEngineeringManifestV3TestOnly.assertManifestBoundary(tampered),
    (error) => error instanceof WesternIndependentEngineeringManifestV3Error
      && error.code === "SELECTED_PATH_SET_INVALID"
  );
});

test("CLI accepts no operands and rejects operands or Node loader environment", async () => {
  const cleanEnvironment = { ...process.env };
  delete cleanEnvironment.NODE_OPTIONS;
  delete cleanEnvironment.NODE_PATH;
  let stdoutText = "";
  let stderrText = "";
  const success = await runWesternIndependentEngineeringManifestV3Verifier({
    argv: [process.execPath, "verifier"],
    execArgv: [],
    env: cleanEnvironment,
    stdout: { write: (value) => { stdoutText += value; } },
    stderr: { write: (value) => { stderrText += value; } }
  });
  assert.equal(success, 0, stderrText);
  assert.equal(JSON.parse(stdoutText).passedScenarioOutcomes, 10);

  for (const invocation of [
    { argv: [process.execPath, "verifier", "extra"], execArgv: [], env: cleanEnvironment },
    { argv: [process.execPath, "verifier"], execArgv: ["--import", "bad"], env: cleanEnvironment },
    { argv: [process.execPath, "verifier"], execArgv: [], env: { ...cleanEnvironment, NODE_PATH: "" } }
  ]) {
    let rejected = "";
    const code = await runWesternIndependentEngineeringManifestV3Verifier({
      ...invocation,
      stdout: { write: () => undefined },
      stderr: { write: (value) => { rejected += value; } }
    });
    assert.equal(code, 2);
    assert.match(rejected, /FORBIDDEN/u);
  }
});
