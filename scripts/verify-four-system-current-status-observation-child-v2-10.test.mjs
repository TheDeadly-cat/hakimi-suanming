import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH,
  FourSystemCurrentStatusObservationChildV210Error,
  buildCurrentFourSystemCurrentStatusObservationChildV210,
  computeFourSystemCurrentStatusObservationChildV210Digest,
  fourSystemCurrentStatusObservationChildV210TestOnly,
  getFourSystemCurrentStatusObservationChildV210Summary,
  loadFourSystemCurrentStatusObservationChildV210
} from "./four-system-current-status-observation-child-v2-10-lib.mjs";
import { runFourSystemCurrentStatusObservationChildV210Verifier } from
  "./verify-four-system-current-status-observation-child-v2-10.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");

function rawChild() {
  return JSON.parse(readFileSync(
    path.join(workspaceRoot, ...FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH.split("/")),
    "utf8"
  ));
}

test("v2.10 changes only Western current endpoints and browser evidence", async () => {
  const child = await loadFourSystemCurrentStatusObservationChildV210(workspaceRoot);
  const summary = getFourSystemCurrentStatusObservationChildV210Summary(child);
  assert.equal(summary.westernEndpointCount, 4);
  assert.match(summary.westernBrowserRuntimeEvidence, /chrome_edge_10_of_10/u);
  assert.equal(summary.westernCurrentEngineeringManifestMechanicallyVerified, true);
  assert.equal(summary.westernCurrentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.admissionGatesSatisfied, 0);
  assert.equal(summary.admissionGatesRequired, 32);
  assert.equal(summary.releaseReadySystems, 0);
  assert.equal(summary.publicReleaseAuthorizedSystems, 0);
  assert.equal(summary.projectDefaultActiveLine, "legacy-v13");
  assert.equal(summary.projectDefaultTargetSchema, 13);
  assert.equal(summary.projectDefaultMigrationId, null);
  assert.equal(summary.mutationEpochAvailableForSchema13, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
  assert.ok(Object.values(child.authorityBoundary).every((value) => value === false));
});

test("current projection exactly equals persisted canonical projection", async () => {
  const current = await buildCurrentFourSystemCurrentStatusObservationChildV210(workspaceRoot);
  assert.equal(
    fourSystemCurrentStatusObservationChildV210TestOnly.canonicalCompact(current),
    fourSystemCurrentStatusObservationChildV210TestOnly.canonicalCompact(rawChild())
  );
  assert.equal(current.childDigest, computeFourSystemCurrentStatusObservationChildV210Digest(current));
});

test("authority promotion and non-Western drift fail closed", async () => {
  const current = await buildCurrentFourSystemCurrentStatusObservationChildV210(workspaceRoot);
  const promoted = structuredClone(current);
  promoted.authorityBoundary.publicReleaseAuthorized = true;
  promoted.childDigest = computeFourSystemCurrentStatusObservationChildV210Digest(promoted);
  assert.throws(
    () => fourSystemCurrentStatusObservationChildV210TestOnly.assertChildBoundary(
      promoted,
      current
    ),
    (error) => error instanceof FourSystemCurrentStatusObservationChildV210Error
      && error.code === "AUTHORITY_BOUNDARY_INVALID"
  );
  const drifted = structuredClone(current);
  drifted.systems.find((entry) => entry.contractSystemId === "vedic").currentStatus = "tampered";
  drifted.childDigest = computeFourSystemCurrentStatusObservationChildV210Digest(drifted);
  assert.throws(
    () => fourSystemCurrentStatusObservationChildV210TestOnly.assertChildBoundary(drifted, current),
    (error) => error instanceof FourSystemCurrentStatusObservationChildV210Error
      && error.code === "NON_WESTERN_SYSTEM_DRIFT"
  );
});

test("CLI accepts no operands and rejects operands or Node loader environment", async () => {
  const cleanEnvironment = { ...process.env };
  delete cleanEnvironment.NODE_OPTIONS;
  delete cleanEnvironment.NODE_PATH;
  let stdoutText = "";
  let stderrText = "";
  const success = await runFourSystemCurrentStatusObservationChildV210Verifier({
    argv: [process.execPath, "verifier"], execArgv: [], env: cleanEnvironment,
    stdout: { write: (value) => { stdoutText += value; } },
    stderr: { write: (value) => { stderrText += value; } }
  });
  assert.equal(success, 0, stderrText);
  assert.equal(JSON.parse(stdoutText).admissionGatesSatisfied, 0);
  for (const invocation of [
    { argv: [process.execPath, "verifier", "extra"], execArgv: [], env: cleanEnvironment },
    { argv: [process.execPath, "verifier"], execArgv: ["--import", "bad"], env: cleanEnvironment },
    { argv: [process.execPath, "verifier"], execArgv: [], env: { ...cleanEnvironment, NODE_OPTIONS: "" } }
  ]) {
    let rejected = "";
    const code = await runFourSystemCurrentStatusObservationChildV210Verifier({
      ...invocation,
      stdout: { write: () => undefined },
      stderr: { write: (value) => { rejected += value; } }
    });
    assert.equal(code, 2);
    assert.match(rejected, /FORBIDDEN/u);
  }
});
