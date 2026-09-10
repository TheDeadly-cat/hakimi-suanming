import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { DIAGNOSTIC_STAGES, resolveDiagnosticProgram } from "./run-diagnostic-stage.mjs";
import { verifyReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";
import { RELEASE_BROWSER_MATRIX } from "../apps/web/playwright.release-browser-matrix.ts";
import { loadSwTwoGenerationFixtureCriticalSourceIdentity } from "../apps/web/sw-two-generation-fixture-source-identity.ts";
import { snapshotSwTwoGenerationArtifactSetDirectory, SW_TWO_GENERATION_ARTIFACT_GENERATIONS } from "../apps/web/sw-two-generation-artifact-identity.ts";

const root = path.resolve(import.meta.dirname, "..");
const executeFile = promisify(execFile);
const title = "current source same-Schema worker A to B to A";
const config = "apps/web/playwright.sw-aba.config.ts";
const additionalInputs = [
  config, "apps/web/e2e/service-worker-same-schema-aba.spec.ts",
  "scripts/run-sw-same-schema-aba-fixture.mjs", "scripts/run-diagnostic-stage.mjs",
  "apps/web/sw-two-generation-fixture-source-identity.ts", "apps/web/package.json", "package.json", "package-lock.json",
  "packages/bazi-core/historical-natal-runtime-closure-v1.json"
];

async function sourceInputs() {
  return {
    critical: loadSwTwoGenerationFixtureCriticalSourceIdentity(),
    additional: await Promise.all(additionalInputs.map(async (file) => {
      const bytes = await readFile(path.join(root, file));
      return { path: file, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    }))
  };
}

async function protectedArtifact() {
  const dist = path.join(root, "dist/web");
  const lockPath = path.join(root, "tmp/release-artifact-identity.json");
  const present = await Promise.all([dist, lockPath].map(async (file) => {
    try { await access(file); return true; }
    catch (error) { if (error.code === "ENOENT") return false; throw error; }
  }));
  if (present.every((value) => !value)) return null;
  assert.ok(present.every(Boolean), "An existing production artifact requires its identity lock.");
  return verifyReleaseArtifactIdentityLock({ cwd: root, dist, lockPath });
}

async function execute(args, logPath, env) {
  const childEnvironment = { ...process.env, ...env };
  for (const key of Object.keys(childEnvironment)) {
    // These separately built fixtures must remain unbound to production evidence.
    if (key.toUpperCase() === "HAKIMI_RELEASE_EVIDENCE_ID") delete childEnvironment[key];
    if (key.toUpperCase().startsWith("HAKIMI_DB_")) {
      throw new Error("Same-Schema ABA fixtures do not accept HAKIMI_DB_* overrides.");
    }
  }
  try {
    const result = await executeFile(process.execPath, args, {
      cwd: root, env: childEnvironment, windowsHide: true, maxBuffer: 50 * 1024 * 1024
    });
    await writeFile(logPath, result.stdout + result.stderr, { flag: "wx" });
  } catch (error) {
    if (typeof error.stdout === "string" || typeof error.stderr === "string") {
      await writeFile(logPath, (error.stdout ?? "") + (error.stderr ?? ""), { flag: "wx" });
    }
    throw error;
  }
}

function reportTests(suite) {
  return [
    ...(suite.specs ?? []).flatMap((spec) => spec.tests.map((test) => ({ ...test, title: spec.title }))),
    ...(suite.suites ?? []).flatMap(reportTests)
  ];
}

async function main() {
  if (process.argv.length !== 2 || process.env.NODE_OPTIONS?.trim()) {
    throw new Error("The standalone ABA diagnostic accepts no arguments or NODE_OPTIONS.");
  }
  const startingSources = await sourceInputs();
  const startingProtectedArtifact = await protectedArtifact();
  const runRoot = await mkdtemp(path.join(os.tmpdir(), "h6aba-"));
  const artifactRoot = path.join(runRoot, "artifact-builds");
  const reportPath = path.join(runRoot, "aba-playwright-report.json");
  process.stdout.write(`ABA diagnostic output and isolated artifacts are retained at ${runRoot}\n`);
  let artifactSet;
  let failure;
  try {
    const viteCli = await resolveDiagnosticProgram(DIAGNOSTIC_STAGES.build, root);
    await mkdir(artifactRoot);
    // The existing shared-artifact contract requires all three generations;
    // this diagnostic executes only the separate ABA scenario in each browser.
    for (const generation of SW_TWO_GENERATION_ARTIFACT_GENERATIONS) {
      await execute([viteCli, "build", "--configLoader", "runner", "--config", path.join(root, "apps/web/vite.sw-upgrade.config.ts")],
        path.join(runRoot, `build-${generation.generationName}.log`), {
          HAKIMI_SW_UPGRADE_GENERATION: generation.generationName,
          HAKIMI_SW_UPGRADE_OUT_DIR: path.join(artifactRoot, generation.generationName),
          HAKIMI_SW_UPGRADE_FAULT: generation.fault
        });
    }
    artifactSet = await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot);
    await execute([path.join(root, "node_modules/@playwright/test/cli.js"), "test", "--config", path.join(root, config)],
      path.join(runRoot, "playwright.log"), {
        PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
        HAKIMI_LOCAL_SW_QA_RUN_ROOT: runRoot,
        HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT: artifactRoot,
        HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256: artifactSet.identity.canonicalSha256
      });
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    const tests = reportTests(report);
    assert.deepEqual(report.errors, []);
    assert.equal(report.stats.expected, RELEASE_BROWSER_MATRIX.length);
    for (const key of ["skipped", "unexpected", "flaky"]) assert.equal(report.stats[key], 0);
    assert.equal(tests.length, RELEASE_BROWSER_MATRIX.length);
    for (const browser of RELEASE_BROWSER_MATRIX) {
      const selected = tests.filter((test) => test.projectName === browser.projectName && test.title === title);
      assert.equal(selected.length, 1);
      const test = selected[0];
      assert.equal(test.expectedStatus, "passed");
      assert.equal(test.status, "expected");
      assert.equal(test.results.length, 1);
      assert.equal(test.results[0].status, "passed");
      assert.equal(test.results[0].retry, 0);
      assert.deepEqual(test.results[0].errors, []);
      const attachment = test.results[0].attachments.find((item) => item.name === "same-schema-worker-aba-observations");
      assert.ok(attachment?.path);
      const observation = JSON.parse(await readFile(attachment.path, "utf8"));
      assert.equal(observation.completed, true);
      assert.equal(observation.browserProject, browser.projectName);
      assert.deepEqual(observation.artifactSetIdentity, artifactSet.identity);
    }
  } catch (error) { failure = error; }
  try {
    assert.deepEqual(await sourceInputs(), startingSources, "ABA source inputs changed during execution.");
    assert.deepEqual(await protectedArtifact(), startingProtectedArtifact, "Production artifact or lock changed.");
    if (artifactSet) {
      assert.deepEqual((await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot)).identity, artifactSet.identity);
    }
  } catch (error) {
    failure = failure ? new AggregateError([failure, error], "ABA execution and final identity checks failed.") : error;
  }
  if (failure) throw failure;
  process.stdout.write(JSON.stringify({
    verificationScope: "local_current_source_same_schema_aba", reportPath,
    passed: RELEASE_BROWSER_MATRIX.length, attemptsPerProject: 1,
    sourceIdentity: startingSources,
    artifactSetSha256: artifactSet.identity.canonicalSha256,
    protectedArtifactPresent: startingProtectedArtifact !== null,
    canonicalThreeScenarioGateAssessed: false, formalReleaseEvidence: false
  }, null, 2) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
