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

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = realpathSync.native(path.resolve(scriptDirectory, ".."));
const draftRoot = path.join(workspaceRoot, "isolated-drafts", "western-civil-time-fact-browser-draft");
const configPath = path.join(draftRoot, "playwright.same-artifact-evidence.config.ts");
const playwrightCli = path.join(workspaceRoot, "node_modules", "@playwright", "test", "cli.js");

function createTemporaryEnvironment() {
  const root = path.join(
    realpathSync.native(os.tmpdir()),
    `hakimi-western-same-artifact-${randomUUID()}`
  );
  mkdirSync(root, { recursive: false });
  const output = path.join(root, "playwright-output");
  const sidecar = path.join(root, "sidecar");
  mkdirSync(output, { recursive: false });
  mkdirSync(sidecar, { recursive: false });
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_PATH;
  Object.assign(environment, {
    TEMP: root,
    TMP: root,
    TMPDIR: root,
    HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT: root,
    HAKIMI_WESTERN_EVIDENCE_BASE_URL: "http://127.0.0.1:49152",
    HAKIMI_WESTERN_EVIDENCE_OUTPUT_TREE_SHA256: "0".repeat(64),
    HAKIMI_WESTERN_EVIDENCE_IANA_PATH: "assets/iana-2025b-config-probe.js",
    HAKIMI_WESTERN_EVIDENCE_PLAYWRIGHT_OUT_DIR: output,
    HAKIMI_WESTERN_EVIDENCE_CONFIG_PROBE: "1"
  });
  return { root, sidecar, environment, identity: lstatSync(root, { bigint: true }) };
}

function cleanupTemporary(temporary) {
  if (!existsSync(temporary.root)) return;
  const current = lstatSync(temporary.root, { bigint: true });
  assert.equal(current.isDirectory(), true);
  assert.equal(current.isSymbolicLink(), false);
  assert.equal(current.dev, temporary.identity.dev);
  assert.equal(current.ino, temporary.identity.ino);
  assert.equal(realpathSync.native(temporary.root).toLowerCase(), temporary.root.toLowerCase());
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

test("same-artifact Playwright config resolves reporter, testDir, and exact projects independently of cwd", (context) => {
  const temporary = createTemporaryEnvironment();
  context.after(() => cleanupTemporary(temporary));
  for (const [index, cwd] of [workspaceRoot, draftRoot].entries()) {
    const summaryPath = path.join(temporary.sidecar, `summary-${index}.json`);
    const listed = spawnSync(process.execPath, [
      playwrightCli,
      "test",
      "--list",
      "--config",
      configPath
    ], {
      cwd,
      env: { ...temporary.environment, HAKIMI_WESTERN_EVIDENCE_SUMMARY_PATH: summaryPath },
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
      timeout: 60_000
    });
    assert.equal(listed.status, 0, `config list failed from controlled cwd index ${index}`);
    const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
    assert.equal(summary.reporterLoadedFromConfig, true);
    assert.equal(summary.declaredOutcomeCount, 10);
    assert.deepEqual(summary.configuredProjectNames, ["chrome", "msedge"]);
  }
});

