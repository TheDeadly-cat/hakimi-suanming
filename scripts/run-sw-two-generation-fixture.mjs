#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  assertStrictSwTwoGenerationFixtureSummary
} from "../apps/web/playwright.sw-two-generation-fixture-result.ts";
import {
  assertSwTwoGenerationFixtureCriticalSourceIdentity,
  loadSwTwoGenerationFixtureCriticalSourceIdentity
} from "../apps/web/sw-two-generation-fixture-source-identity.ts";
import {
  snapshotSwTwoGenerationArtifactSetDirectory,
  SW_TWO_GENERATION_ARTIFACT_GENERATIONS
} from "../apps/web/sw-two-generation-artifact-identity.ts";
import swUpgradeConfig from "../apps/web/playwright.sw-upgrade.config.ts";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(import.meta.dirname, "..");
const playwrightCli = path.resolve(workspaceRoot, "node_modules/@playwright/test/cli.js");
const fixtureConfig = path.resolve(workspaceRoot, "apps/web/playwright.sw-upgrade.config.ts");
const viteCli = path.resolve(workspaceRoot, "node_modules/vite/bin/vite.js");
const viteFixtureConfig = path.resolve(workspaceRoot, "apps/web/vite.sw-upgrade.config.ts");
const expectedPlaywrightOutputDir = path.resolve(
  os.tmpdir(),
  "hakimi-bazi-sw-upgrade-results"
);

function assertCanonicalPlaywrightOutputDir() {
  const configuredOutputDir = path.resolve(String(swUpgradeConfig.outputDir ?? ""));
  if (configuredOutputDir !== expectedPlaywrightOutputDir) {
    throw new Error("SW fixture Playwright outputDir is not the checked system temporary directory.");
  }
}

async function buildSharedArtifactSet(artifactRoot) {
  await mkdir(artifactRoot, { mode: 0o700 });
  for (const generation of SW_TWO_GENERATION_ARTIFACT_GENERATIONS) {
    const result = await execFileAsync(
      process.execPath,
      [viteCli, "build", "--config", viteFixtureConfig],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          HAKIMI_SW_UPGRADE_GENERATION: generation.generationName,
          HAKIMI_SW_UPGRADE_OUT_DIR: path.join(artifactRoot, generation.generationName),
          HAKIMI_SW_UPGRADE_FAULT: generation.fault
        },
        maxBuffer: 50 * 1024 * 1024,
        windowsHide: true
      }
    );
    if (result.stderr && !result.stderr.includes("Some chunks are larger than")) {
      throw new Error(
        `SW fixture build emitted unexpected stderr for ${generation.generationName}:\n${result.stderr}`
      );
    }
  }
  return snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot);
}

function runCanonicalPlaywright(resultPath, attemptId, artifactRoot, artifactSetSha256) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [playwrightCli, "test", "--config", fixtureConfig],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          HAKIMI_SW_TWO_GENERATION_FIXTURE_RESULT_OUTPUT: resultPath,
          HAKIMI_SW_TWO_GENERATION_FIXTURE_ATTEMPT_ID: attemptId,
          HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT: artifactRoot,
          HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256: artifactSetSha256
        },
        shell: false,
        stdio: "inherit",
        windowsHide: true
      }
    );
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

let temporaryRoot = null;
try {
  if (process.argv.length !== 2) {
    throw new Error("The canonical SW two-generation fixture runner accepts no arguments.");
  }
  assertCanonicalPlaywrightOutputDir();
  const startingCriticalSourceIdentity = loadSwTwoGenerationFixtureCriticalSourceIdentity();
  assertSwTwoGenerationFixtureCriticalSourceIdentity(startingCriticalSourceIdentity);
  const attemptId = randomBytes(32).toString("hex");
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-sw-two-generation-run-"));
  const resultPath = path.join(temporaryRoot, "fixture-summary.json");
  const artifactRoot = path.join(temporaryRoot, "artifact-builds");
  const startingArtifactSetIdentity = (await buildSharedArtifactSet(artifactRoot)).identity;
  const execution = await runCanonicalPlaywright(
    resultPath,
    attemptId,
    artifactRoot,
    startingArtifactSetIdentity.canonicalSha256
  );
  if (execution.code !== 0 || execution.signal !== null) {
    throw new Error(
      `SW two-generation fixture Playwright run failed: code=${String(execution.code)} signal=${String(execution.signal)}.`
    );
  }
  const summary = JSON.parse(await readFile(resultPath, "utf8"));
  assertStrictSwTwoGenerationFixtureSummary(summary);
  if (summary.attemptId !== attemptId) {
    throw new Error("SW fixture summary attempt id does not match this runner invocation.");
  }
  const endingArtifactSet = await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot);
  if (
    JSON.stringify(startingArtifactSetIdentity) !== JSON.stringify(endingArtifactSet.identity)
    || JSON.stringify(summary.artifactSetIdentity) !== JSON.stringify(endingArtifactSet.identity)
  ) {
    throw new Error("SW fixture artifact bytes changed or were not independently rebound by the runner.");
  }
  const endingCriticalSourceIdentity = loadSwTwoGenerationFixtureCriticalSourceIdentity();
  assertSwTwoGenerationFixtureCriticalSourceIdentity(endingCriticalSourceIdentity);
  if (
    JSON.stringify(startingCriticalSourceIdentity) !== JSON.stringify(endingCriticalSourceIdentity)
    || JSON.stringify(summary.criticalSourceIdentity) !== JSON.stringify(endingCriticalSourceIdentity)
  ) {
    throw new Error("SW fixture critical source identity changed or was rebound during execution.");
  }
} catch (error) {
  process.stderr.write(
    `SW two-generation fixture runner failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
} finally {
  if (temporaryRoot !== null) {
    const resolvedTemporaryRoot = path.resolve(temporaryRoot);
    const resolvedSystemTemporaryRoot = path.resolve(os.tmpdir());
    const relative = path.relative(resolvedSystemTemporaryRoot, resolvedTemporaryRoot);
    if (relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      await rm(resolvedTemporaryRoot, { recursive: true, force: true });
    }
  }
}
