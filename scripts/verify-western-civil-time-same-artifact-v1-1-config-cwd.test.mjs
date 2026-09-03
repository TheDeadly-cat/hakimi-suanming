import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("v1.1 Playwright config resolves exact reporter, spec, projects, and nonce independently of cwd", () => {
  const originalTemp = path.resolve(os.tmpdir());
  const root = path.join(originalTemp, `hakimi-western-same-artifact-${randomUUID()}`);
  mkdirSync(root);
  const output = path.join(root, "playwright-output");
  const sidecar = path.join(root, "sidecar");
  mkdirSync(output);
  mkdirSync(sidecar);
  const summary = path.join(sidecar, "summary.json");
  const nonce = randomBytes(32).toString("hex");
  const commitment = createHash("sha256").update(Buffer.from(nonce, "hex")).digest("hex");
  try {
    const env = { ...process.env, TEMP: root, TMP: root, TMPDIR: root,
      HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT: root,
      HAKIMI_WESTERN_EVIDENCE_PLAYWRIGHT_OUT_DIR: output,
      HAKIMI_WESTERN_EVIDENCE_SUMMARY_PATH: summary,
      HAKIMI_WESTERN_EVIDENCE_BASE_URL: "http://127.0.0.1:49152",
      HAKIMI_WESTERN_EVIDENCE_OUTPUT_TREE_SHA256: "a".repeat(64),
      HAKIMI_WESTERN_EVIDENCE_IANA_PATH: "assets/iana-2025b-probe.js",
      HAKIMI_WESTERN_EVIDENCE_RUN_NONCE: nonce,
      HAKIMI_WESTERN_EVIDENCE_RUN_NONCE_COMMITMENT: commitment,
      HAKIMI_WESTERN_EVIDENCE_CONFIG_PROBE: "1" };
    delete env.NODE_OPTIONS;
    delete env.NODE_PATH;
    const result = spawnSync(process.execPath, [
      path.resolve("node_modules/@playwright/test/cli.js"), "test", "--list", "--config",
      path.resolve("isolated-drafts/western-civil-time-fact-browser-draft/playwright.same-artifact-evidence-v1-1.config.ts")
    ], { cwd: originalTemp, env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(readFileSync(summary, "utf8"));
    assert.equal(parsed.schemaVersion, "hakimi.western.same-artifact-config-path-probe/1.1");
    assert.deepEqual(parsed.configuredProjectNames, ["chrome", "msedge"]);
    assert.equal(parsed.declaredOutcomeCount, 10);
    assert.equal(parsed.runNonceCommitment, commitment);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
