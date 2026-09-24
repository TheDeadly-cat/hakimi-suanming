import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH,
  FourSystemCurrentStatusObservationChildV210Error,
  buildCurrentFourSystemCurrentStatusObservationChildV210,
  computeFourSystemCurrentStatusObservationChildV210Digest,
  fourSystemCurrentStatusObservationChildV210TestOnly,
  getFourSystemCurrentStatusObservationChildV210Summary,
  loadFourSystemCurrentStatusObservationChildV210
} from "./four-system-current-status-observation-child-v2-10-lib.mjs";
import { attachCurrentFourSystemCli } from "./four-system-v22-history.test-fixture.mjs";
import {
  FOUR_SYSTEM_V210_ADDITIONAL_ARCHIVE_URL,
  createFourSystemV210HistoricalInputs,
  parseFourSystemV210AdditionalArchive
} from "./four-system-v210-history.test-fixture.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const actualWorkspaceRoot = path.resolve(scriptDirectory, "..");
let historicalInputs;
let workspaceRoot;
let invocationRunner;
before(async () => {
  historicalInputs = await createFourSystemV210HistoricalInputs();
  workspaceRoot = historicalInputs.root;
  await attachCurrentFourSystemCli(historicalInputs, 10);
  invocationRunner = path.join(workspaceRoot, "scripts", "invoke-v210-verifier.test-runner.mjs");
  await writeFile(invocationRunner,
    'import { runFourSystemCurrentStatusObservationChildV210Verifier } from "./verify-four-system-current-status-observation-child-v2-10.mjs";\n'
    + 'const invocation = JSON.parse(process.argv[2]);\n'
    + 'process.exitCode = await runFourSystemCurrentStatusObservationChildV210Verifier({ ...invocation, env: process.env });\n',
    { flag: "wx" });
  assert.deepEqual(await readFile(path.join(workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH)),
  await readFile(path.join(actualWorkspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH)));
});
after(async () => { await historicalInputs?.cleanup(); });

// Keep the actual CLI function and invocation arguments, including rejected
// execArgv values, without a non-literal import or executing those loader flags.
async function runFourSystemCurrentStatusObservationChildV210Verifier({
  argv, execArgv, env, stdout, stderr
}) {
  const run = spawnSync(process.execPath,
    [invocationRunner, JSON.stringify({ argv, execArgv })],
    { cwd: workspaceRoot, encoding: "utf8", env, windowsHide: true });
  if (run.error) throw run.error;
  stdout.write(run.stdout);
  stderr.write(run.stderr);
  return run.status;
}

test("current v2.10 loader and source CLI cannot inherit historical input success", async () => {
  await assert.rejects(loadFourSystemCurrentStatusObservationChildV210(actualWorkspaceRoot),
    { code: "MANIFEST_IDENTITY_DRIFT" });
  const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
  const run = spawnSync(process.execPath,
    [path.join(scriptDirectory, "verify-four-system-current-status-observation-child-v2-10.mjs")],
    { cwd: historicalInputs.root, encoding: "utf8", env, windowsHide: true });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "FOUR_SYSTEM_CURRENT_STATUS_V2_10_INTERNAL_FAILURE\n");
});

test("v2.10 supplemental archive rejects tampering, truncation and a valid empty ZIP", async () => {
  const original = await readFile(FOUR_SYSTEM_V210_ADDITIONAL_ARCHIVE_URL);
  assert.equal(parseFourSystemV210AdditionalArchive(original).manifest.files.length, 18);
  const changed = Buffer.from(original); changed[Math.floor(changed.length / 2)] ^= 1;
  const { zipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
  for (const bytes of [changed, original.subarray(0, -1), zipSync({})]) {
    assert.throws(() => parseFourSystemV210AdditionalArchive(bytes), /v2.10 additional archive identity changed/u);
  }
});

test("v2.10 refuses altered or missing manifest tooling input bytes", async () => {
  const inputs = await createFourSystemV210HistoricalInputs();
  const relativePath = "scripts/western-independent-engineering-manifest-v3-lib.mjs";
  try {
    const target = path.join(inputs.root, relativePath);
    const changed = Buffer.from(await readFile(target)); changed[changed.length - 1] ^= 1;
    await writeFile(target, changed);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV210(inputs.root),
      { code: "CURRENT_MANIFEST_MISMATCH" });
    await rm(target);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV210(inputs.root), (error) =>
      error.code === "ARTIFACT_UNREADABLE" && error.cause?.code === "ENOENT"
        && error.message.includes(relativePath));
  } finally { await inputs.cleanup(); }
});

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
