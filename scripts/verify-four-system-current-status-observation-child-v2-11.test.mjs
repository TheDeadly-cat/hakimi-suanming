import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import {
  buildCurrentFourSystemCurrentStatusObservationChildV211,
  computeFourSystemCurrentStatusObservationChildV211Digest,
  fourSystemCurrentStatusObservationChildV211TestOnly,
  loadFourSystemCurrentStatusObservationChildV211
} from "./four-system-current-status-observation-child-v2-11-lib.mjs";
import { loadFourSystemCurrentStatusObservationChildV210 } from
  "./four-system-current-status-observation-child-v2-10-lib.mjs";
import {
  FOUR_SYSTEM_V211_ADDITIONAL_ARCHIVE_URL,
  createFourSystemV211HistoricalInputs,
  parseFourSystemV211AdditionalArchive
} from "./four-system-v211-history.test-fixture.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const actualWorkspaceRoot = path.resolve(scriptDirectory, "..");
let historicalInputs;
before(async () => {
  historicalInputs = await createFourSystemV211HistoricalInputs();
  const relativePath = "content/system-admission/four-system-current-status-observation-child.v2.11.0.json";
  assert.deepEqual(await readFile(path.join(historicalInputs.root, relativePath)),
    await readFile(path.join(actualWorkspaceRoot, relativePath)));
});
after(async () => { await historicalInputs?.cleanup(); });

test("current v2.11 loader and source CLI cannot inherit historical input success", async () => {
  await assert.rejects(loadFourSystemCurrentStatusObservationChildV211(actualWorkspaceRoot),
    { code: "MANIFEST_IDENTITY_DRIFT" });
  const env = { ...process.env }; delete env.NODE_OPTIONS; delete env.NODE_PATH;
  const run = spawnSync(process.execPath,
    [path.join(scriptDirectory, "verify-four-system-current-status-observation-child-v2-11.mjs")],
    { cwd: historicalInputs.root, encoding: "utf8", env, windowsHide: true });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "FOUR_SYSTEM_CURRENT_STATUS_V2_11_INTERNAL_FAILURE\n");
});

test("v2.11 supplemental archive rejects tampering, truncation and a valid empty ZIP", async () => {
  const original = await readFile(FOUR_SYSTEM_V211_ADDITIONAL_ARCHIVE_URL);
  assert.equal(parseFourSystemV211AdditionalArchive(original).manifest.files.length, 23);
  const changed = Buffer.from(original); changed[Math.floor(changed.length / 2)] ^= 1;
  const { zipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
  for (const bytes of [changed, original.subarray(0, -1), zipSync({})]) {
    assert.throws(() => parseFourSystemV211AdditionalArchive(bytes), /v2.11 additional archive identity changed/u);
  }
});

test("v2.11 refuses altered or missing locked Playwright tooling input bytes", async () => {
  const inputs = await createFourSystemV211HistoricalInputs();
  try {
    const target = path.join(inputs.root, "node_modules/playwright-core/lib/coreBundle.js");
    const changed = Buffer.from(await readFile(target)); changed[changed.length - 1] ^= 1;
    await writeFile(target, changed);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV211(inputs.root),
      { code: "CURRENT_GRAPH_BINDING_INVALID" });
    await rm(target);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV211(inputs.root),
      { code: "ENOENT", path: target });
  } finally { await inputs.cleanup(); }
});

test("v2.11 changes only Western endpoints/status while preserving 0/32 and all authority false", async () => {
  const child = await loadFourSystemCurrentStatusObservationChildV211(historicalInputs.root);
  const parent = await loadFourSystemCurrentStatusObservationChildV210(historicalInputs.root);
  assert.equal(child.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(child.currentStatusSummary.totalAdmissionGatesRequired, 32);
  assert.ok(Object.values(child.authorityBoundary).every((value) => value === false));
  for (const id of ["bazi", "ziwei", "vedic"]) {
    assert.equal(fourSystemCurrentStatusObservationChildV211TestOnly.compact(
      child.systems.find((entry) => entry.contractSystemId === id)),
    fourSystemCurrentStatusObservationChildV211TestOnly.compact(
      parent.systems.find((entry) => entry.contractSystemId === id)));
  }
  const western = child.systems.find((entry) => entry.contractSystemId === "western");
  assert.equal(western.currentEvidence.endpoints.length, 4);
  assert.equal(western.gateSummary.bindingFrozenVerified, 0);
  assert.equal(western.gateSummary.independentExpertReviewsVerified, 0);
});

test("persisted v2.11 equals current projection and rejects authority promotion", async () => {
  const child = await loadFourSystemCurrentStatusObservationChildV211(historicalInputs.root);
  const current = await buildCurrentFourSystemCurrentStatusObservationChildV211(historicalInputs.root);
  assert.equal(fourSystemCurrentStatusObservationChildV211TestOnly.compact(child),
    fourSystemCurrentStatusObservationChildV211TestOnly.compact(current));
  const promoted = structuredClone(current);
  promoted.authorityBoundary.releaseReady = true;
  promoted.childDigest = computeFourSystemCurrentStatusObservationChildV211Digest(promoted);
  assert.throws(() => fourSystemCurrentStatusObservationChildV211TestOnly.assertBoundary(promoted, child),
    /AUTHORITY_BOUNDARY_INVALID/u);
});
