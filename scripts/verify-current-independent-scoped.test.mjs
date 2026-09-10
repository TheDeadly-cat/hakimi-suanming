import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadCurrentIndex } from "./current-index-lib.mjs";
import {
  CurrentIndependentScopeError,
  currentIndependentScopedTestOnly,
  inspectCurrentIndependentScopeInventory,
  resolveCurrentIndependentScope
} from "./current-independent-scoped-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_CLI = path.resolve(ROOT, "scripts", "verify-current-independent-source-requirements.mjs");
const DOMAIN_CLI = path.resolve(ROOT, "scripts", "verify-current-independent-domain-manifests.mjs");
const SOURCE_INVENTORY_CLI = path.resolve(ROOT, "scripts", "verify-current-independent-source-inventory.mjs");
const DOMAIN_INVENTORY_CLI = path.resolve(ROOT, "scripts", "verify-current-independent-domain-inventory.mjs");

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "NODE_DEBUG", "NODE_REPL_EXTERNAL_MODULE"]) {
    if (!(key in extra)) delete environment[key];
  }
  return environment;
}

function parseFailure(stderr) {
  const lines = stderr.trim().split(/\r?\n/u);
  return JSON.parse(lines.at(-1));
}

test("both independent scopes collect all three unavailable current families", async () => {
  for (const scope of ["source_requirements", "domain_manifests"]) {
    await assert.rejects(
      resolveCurrentIndependentScope(scope, ROOT),
      (error) => {
        assert.equal(error instanceof CurrentIndependentScopeError, true);
        assert.equal(error.code, "CURRENT_UNAVAILABLE");
        assert.equal(error.details.scope, scope);
        assert.equal(error.details.unavailable.length, 3);
        assert.equal(error.details.entries.length, 3);
        assert.ok(error.details.entries.every((entry) => entry.selectedCurrent === null));
        assert.equal(error.details.formalAdmissionAuthorized, false);
        assert.equal(error.details.releaseReady, false);
        assert.equal(error.details.publicDeploymentAuthorized, false);
        assert.equal(error.details.expertClaimsAuthorized, false);
        return true;
      }
    );
  }
});

test("scope summary requires the current-index private brand", async () => {
  const index = await loadCurrentIndex(ROOT);
  assert.throws(
    () => currentIndependentScopedTestOnly.summarizeVerifiedIndexScope(
      structuredClone(index),
      "source_requirements"
    ),
    (error) => error?.code === "CURRENT_INDEX_PRIVATE_BRAND_REQUIRED"
  );
});

test("fixed CLIs report all unavailable families and never fall back to historical files", () => {
  for (const [cli, scope] of [
    [SOURCE_CLI, "source_requirements"],
    [DOMAIN_CLI, "domain_manifests"]
  ]) {
    const result = spawnSync(process.execPath, [cli], {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, "");
    const failure = parseFailure(result.stderr);
    assert.equal(failure.errorCode, "CURRENT_UNAVAILABLE");
    assert.equal(failure.details.scope, scope);
    assert.equal(failure.details.unavailable.length, 3);
    assert.ok(failure.details.entries.every((entry) => entry.selectedCurrent === null));
  }
});

test("fixed CLIs reject operands and visible preload injection", () => {
  const operand = spawnSync(process.execPath, [SOURCE_CLI, "historical-v1"], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.equal(operand.status, 1);
  assert.equal(parseFailure(operand.stderr).errorCode, "ARGUMENTS_FORBIDDEN");

  const preload = spawnSync(process.execPath, [DOMAIN_CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnvironment({ NODE_OPTIONS: "--no-warnings" })
  });
  assert.equal(preload.status, 1);
  assert.equal(parseFailure(preload.stderr).errorCode, "PRELOAD_ENVIRONMENT_FORBIDDEN");
});

test("a CLI invoked through a script symlink still executes and fails closed", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakimi-independent-current-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const linkPath = path.resolve(directory, "source-current-link.mjs");
  try {
    await symlink(SOURCE_CLI, linkPath, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  const result = spawnSync(process.execPath, [linkPath], {
    cwd: os.tmpdir(),
    encoding: "utf8",
    env: cleanEnvironment(),
    timeout: 120_000
  });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(parseFailure(result.stderr).errorCode, "CURRENT_UNAVAILABLE");
});

test("inventory scopes preserve all three unavailable families without semantic or authority claims", async () => {
  for (const scope of ["source_requirements", "domain_manifests"]) {
    const inventory = await inspectCurrentIndependentScopeInventory(scope, ROOT);
    assert.equal(inventory.scope, scope);
    assert.equal(inventory.inventoryOnly, true);
    assert.equal(inventory.semanticEvaluationPerformed, false);
    assert.equal(inventory.repositorySelectionOnly, true);
    assert.equal(inventory.entries.length, 3);
    assert.equal(inventory.unavailable.length, 3);
    assert.ok(inventory.entries.every((entry) => entry.selectedCurrent === null));
    for (const key of [
      "formalAdmissionAuthorized", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"
    ]) assert.equal(inventory[key], false);
    for (const key of ["qualified", "passed", "allPassed"]) {
      assert.equal(Object.hasOwn(inventory, key), false);
    }
    assert.equal(Object.isFrozen(inventory), true);
    assert.equal(Object.isFrozen(inventory.entries), true);
    assert.ok(inventory.entries.every((entry) => Object.isFrozen(entry) && Object.isFrozen(entry.head)));
  }
});

test("inventory inspection leaves strict current availability resolution unchanged", async () => {
  for (const scope of ["source_requirements", "domain_manifests"]) {
    const inventory = await inspectCurrentIndependentScopeInventory(scope, ROOT);
    const { inventoryOnly, semanticEvaluationPerformed, ...originalProjection } = inventory;
    assert.equal(inventoryOnly, true);
    assert.equal(semanticEvaluationPerformed, false);
    await assert.rejects(resolveCurrentIndependentScope(scope, ROOT), (error) => {
      assert.equal(error.code, "CURRENT_UNAVAILABLE");
      assert.deepEqual(error.details, originalProjection);
      return true;
    });
  }
});

test("fixed inventory CLIs report inventory only and reject scope operands", () => {
  for (const [cli, scope, prefix] of [
    [SOURCE_INVENTORY_CLI, "source_requirements", "CURRENT_INDEPENDENT_SOURCE_INVENTORY_OK"],
    [DOMAIN_INVENTORY_CLI, "domain_manifests", "CURRENT_INDEPENDENT_DOMAIN_INVENTORY_OK"]
  ]) {
    const result = spawnSync(process.execPath, [cli], {
      cwd: os.tmpdir(), encoding: "utf8", env: cleanEnvironment(), timeout: 120_000
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const line = result.stdout.trim();
    assert.equal(line.startsWith(`${prefix} `), true);
    const inventory = JSON.parse(line.slice(prefix.length + 1));
    assert.equal(inventory.scope, scope);
    assert.equal(inventory.inventoryOnly, true);
    assert.equal(inventory.semanticEvaluationPerformed, false);
    assert.equal(inventory.unavailable.length, 3);
    assert.ok(inventory.entries.every((entry) => entry.selectedCurrent === null));
    for (const key of [
      "formalAdmissionAuthorized", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"
    ]) assert.equal(inventory[key], false);
    const operand = spawnSync(process.execPath, [cli, "domain_manifests"], {
      cwd: ROOT, encoding: "utf8", env: cleanEnvironment(), timeout: 120_000
    });
    assert.equal(operand.status, 1);
    assert.equal(operand.stdout, "");
    assert.equal(parseFailure(operand.stderr).errorCode, "ARGUMENTS_FORBIDDEN");
  }
});

test("inventory scopes reject missing indexes and non-directory workspace roots", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakimi-independent-inventory-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const nonDirectoryRoot = path.join(directory, "ordinary-file-root");
  await writeFile(nonDirectoryRoot, "ordinary fixture\n", { flag: "wx" });
  for (const scope of ["source_requirements", "domain_manifests"]) {
    await assert.rejects(
      inspectCurrentIndependentScopeInventory(scope, directory),
      (error) => error.code === "CURRENT_INDEX_MISSING"
    );
    await assert.rejects(
      inspectCurrentIndependentScopeInventory(scope, nonDirectoryRoot),
      (error) => error.code === "INDEX_RAW_DRIFT"
    );
  }
});
