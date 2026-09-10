import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { discoverNodeTests, validateNodeTestGroups, verifyNodeTestGroups } from "./verify-node-test-groups.mjs";

const cliPath = fileURLToPath(new URL("./verify-node-test-groups.mjs", import.meta.url));
const manifestFor = (...tests) => ({ version: 1, groups: [{ id: "fixture-tools", tests }] });

async function fixture(t, testPaths = ["scripts/fixture.test.mjs"]) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-node-test-groups-"));
  assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
  assert(path.basename(root).startsWith("hakimi-node-test-groups-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "scripts"));
  await mkdir(path.join(root, "packages"));
  for (const relative of testPaths) {
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    // Importing any fixture would fail: inventory checks must only discover filenames.
    await writeFile(path.join(root, relative), 'throw new Error("Inventory must not execute test source");\n');
  }
  await writeFile(path.join(root, "scripts/node-test-groups.json"), JSON.stringify(manifestFor(...testPaths)));
  return root;
}

test("discovers nested root and package scripts by identity without loading them", async (t) => {
  const paths = ["scripts/nested/fixture.test.mjs", "packages/fixture/scripts/nested/package.test.mjs"];
  const root = await fixture(t, paths);
  await mkdir(path.join(root, "packages/without-scripts"));
  await writeFile(path.join(root, "scripts/not-a-test.mjs"), 'throw new Error("Do not load");');
  assert.deepEqual(await discoverNodeTests(root), [...paths].sort());
  const result = await verifyNodeTestGroups(root);
  assert.equal(result.discoveredCount, 2);
  assert.equal(result.executionStatus, "not-executed");
});

test("new production verifier test without an explicit group fails by identity", async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, "scripts/verify-new-production-contract.test.mjs"), "invalid javascript is never loaded");
  await assert.rejects(verifyNodeTestGroups(root), /Unregistered test: scripts\/verify-new-production-contract\.test\.mjs/u);
  const result = spawnSync(process.execPath, [cliPath], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unregistered test: scripts\/verify-new-production-contract\.test\.mjs/u);
});

test("deleting or renaming a registered test fails instead of shrinking the suite", async (t) => {
  const root = await fixture(t);
  await rm(path.join(root, "scripts/fixture.test.mjs"));
  await assert.rejects(verifyNodeTestGroups(root), /Missing registered test: scripts\/fixture\.test\.mjs/u);
});

test("duplicate registration in the same or another group fails", () => {
  const identity = "scripts/fixture.test.mjs";
  assert.throws(() => validateNodeTestGroups(manifestFor(identity, identity), [identity]), /Duplicate Node test registration/u);
  const manifest = manifestFor(identity);
  manifest.groups.push({ id: "another-group", tests: [identity] });
  assert.throws(() => validateNodeTestGroups(manifest, [identity]), /Duplicate Node test registration/u);
});

test("wildcards, traversal, non-tests and paths outside discovery scope cannot register tests", () => {
  for (const identity of [
    "scripts/*.test.mjs", "scripts/../escape.test.mjs", "scripts//fixture.test.mjs",
    "scripts/fixture.mjs", "apps/web/fixture.test.mjs", "scripts/fixture\\file.test.mjs"
  ]) assert.throws(() => validateNodeTestGroups(manifestFor(identity), [identity]), /exact repository test path/u);
});

test("duplicate group ids and empty groups fail", () => {
  assert.throws(() => validateNodeTestGroups(manifestFor(), []), /group is empty/u);
  assert.throws(() => validateNodeTestGroups({ version: 1, groups: [] }, []), /nonempty groups/u);
  assert.throws(() => validateNodeTestGroups({ version: 1, groups: [
    { id: "same", tests: ["scripts/one.test.mjs"] }, { id: "same", tests: ["scripts/two.test.mjs"] }
  ] }, ["scripts/one.test.mjs", "scripts/two.test.mjs"]), /duplicate Node test group/u);
});

test("list mode returns exact sorted group paths and never claims execution", async (t) => {
  const root = await fixture(t, ["scripts/z.test.mjs", "scripts/a.test.mjs"]);
  const list = spawnSync(process.execPath, [cliPath, "--list", "fixture-tools"], { cwd: root, encoding: "utf8" });
  assert.equal(list.status, 0, list.stderr);
  assert.equal(list.stdout, "scripts/a.test.mjs\nscripts/z.test.mjs\n");
  const check = spawnSync(process.execPath, [cliPath], { cwd: root, encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /No tests executed/u);
  assert.match(check.stdout, /2 discovered, not executed/u);
  const unknown = spawnSync(process.execPath, [cliPath, "--list", "missing"], { cwd: root, encoding: "utf8" });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /Unknown Node test group/u);
});
