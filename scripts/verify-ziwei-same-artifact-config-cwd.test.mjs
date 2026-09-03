import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = realpathSync.native(path.resolve(scriptDir, ".."));
const packageRoot = path.join(workspaceRoot, "packages", "ziwei-workspace-artifact-draft");
const configPath = path.join(packageRoot, "playwright.same-artifact-evidence.config.ts");
const playwrightCli = path.join(workspaceRoot, "node_modules", "@playwright", "test", "cli.js");

function createTemporaryEnvironment() {
  const root = path.join(realpathSync.native(os.tmpdir()), `hakimi-ziwei-same-artifact-${randomUUID()}`);
  mkdirSync(root, { recursive: false });
  const output = path.join(root, "playwright-output");
  const sidecar = path.join(root, "sidecar");
  mkdirSync(output, { recursive: false });
  mkdirSync(sidecar, { recursive: false });
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  Object.assign(env, {
    HAKIMI_ZIWEI_EVIDENCE_TEMP_ROOT: root,
    HAKIMI_ZIWEI_EVIDENCE_BASE_URL: "http://127.0.0.1:4218",
    HAKIMI_ZIWEI_EVIDENCE_SUMMARY_PATH: path.join(sidecar, "summary.json"),
    HAKIMI_ZIWEI_EVIDENCE_PLAYWRIGHT_OUT_DIR: output,
    HAKIMI_ZIWEI_EVIDENCE_CONFIG_PROBE: "1"
  });
  const identity = lstatSync(root, { bigint: true });
  return { root, env, identity };
}

function cleanupTemporary(temporary) {
  if (!existsSync(temporary.root)) return;
  const current = lstatSync(temporary.root, { bigint: true });
  assert.equal(current.isDirectory(), true);
  assert.equal(current.isSymbolicLink(), false);
  assert.equal(current.dev, temporary.identity.dev);
  assert.equal(current.ino, temporary.identity.ino);
  assert.equal(realpathSync.native(temporary.root), temporary.root);
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else assert.equal(entry.isFile(), true);
    }
  };
  visit(temporary.root);
  rmSync(temporary.root, { recursive: true, force: false });
}

test("same-artifact Playwright config resolves its reporter, testDir, and projects independently of cwd", (context) => {
  const temporary = createTemporaryEnvironment();
  context.after(() => cleanupTemporary(temporary));
  for (const [index, cwd] of [workspaceRoot, packageRoot].entries()) {
    const summaryPath = path.join(temporary.root, "sidecar", `summary-${index}.json`);
    const listed = spawnSync(process.execPath, [
      playwrightCli,
      "test",
      "--list",
      "--config",
      configPath
    ], {
      cwd,
      env: { ...temporary.env, HAKIMI_ZIWEI_EVIDENCE_SUMMARY_PATH: summaryPath },
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
      timeout: 60_000
    });
    assert.equal(listed.status, 0, `config list failed from ${cwd}`);
    const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
    assert.equal(summary.reporterLoadedFromConfig, true);
    assert.equal(summary.declaredOutcomeCount, 28);
    assert.deepEqual(summary.configuredProjectNames, ["chrome", "msedge"]);
  }
});
