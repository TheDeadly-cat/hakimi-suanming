import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { link, mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  releasePersistentContextOptionsForProject,
  requireReleaseBrowserRuntimeProduct
} from "../apps/web/e2e/release-browser-persistent-context.ts";
import backupArtifactConfig from "../apps/web/playwright.release-backup-artifact.config.ts";
import bootArtifactConfig from "../apps/web/playwright.release-boot-artifact.config.ts";
import pwaCrossBrowserConfig from "../apps/web/playwright.release-pwa-artifact.config.ts";
import {
  DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions,
  releaseBrowserChannelForProject
} from "../apps/web/playwright.release-browser-matrix.ts";
import {
  assertStrictReleaseBrowserResultSummary,
  buildReleaseBrowserResultSummary,
  REQUIRED_RELEASE_BROWSER_RECEIPT_IDS,
  REQUIRED_RELEASE_BROWSER_TESTS_PER_PROJECT
} from "../apps/web/playwright.release-browser-result.ts";
import { isPlaywrightListOnlyInvocation } from "../apps/web/playwright.release-browser-strict-reporter.ts";
import webV1CrossBrowserConfig from "../apps/web/playwright.release-web-v1-artifact.config.ts";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../apps/web/release-protocol.ts";
import {
  assertReleaseArtifactMutationBoundary,
  buildReleaseArtifactMutationBoundary,
  RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS,
  verifyReleaseArtifactIdentityLock,
  writeReleaseArtifactIdentityLock
} from "./release-artifact-identity-lib.mjs";
import {
  REQUIRED_RELEASE_BROWSER_MATRIX,
  verifyReleaseBrowserPlaywrightConfig
} from "./verify-release-governance.mjs";
import { verifyReleaseBrowserResultSummaryBinding } from "./release-browser-result-evidence.mjs";
import {
  canonicalJson,
  collectArtifactEntries,
  computeEvidenceId,
  defaultV13ReleaseDescriptorMatches,
  npmVersion,
  readBuiltReleaseMetadata,
  readStableRegularFileSnapshot,
  releaseArtifactComponents,
  releaseCommandInvocation,
  releaseReceiptSetMatchesPolicy,
  relativePathWithin,
  sha256
} from "./release-evidence-lib.mjs";
import { compileReleaseEvidenceSchema } from "./release-evidence-schema.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDecisions = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/web-v1-release-decisions.json"),
  "utf8"
));
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const releaseEvidenceSchema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/release-evidence.schema.json"),
  "utf8"
));
const releaseEvidenceGeneratorSource = await readFile(
  path.join(workspaceRoot, "scripts/generate-release-evidence.mjs"),
  "utf8"
);
const releaseEvidenceVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-release-evidence.mjs"),
  "utf8"
);
const releaseEvidenceLibrarySource = await readFile(
  path.join(workspaceRoot, "scripts/release-evidence-lib.mjs"),
  "utf8"
);
const releaseArtifactIdentitySource = await readFile(
  path.join(workspaceRoot, "scripts/release-artifact-identity-lib.mjs"),
  "utf8"
);
const releaseBrowserResultEvidenceSource = await readFile(
  path.join(workspaceRoot, "scripts/release-browser-result-evidence.mjs"),
  "utf8"
);
const pwaSpecSource = await readFile(
  path.join(workspaceRoot, "apps/web/e2e/pwa-install-and-offline-cold-start.spec.ts"),
  "utf8"
);
const webV1SpecSource = await readFile(
  path.join(workspaceRoot, "apps/web/e2e/web-v1-continuous-flow.spec.ts"),
  "utf8"
);

const RELEASE_DEVICE_OPTION_KEYS = Object.freeze([
  "viewport",
  "screen",
  "deviceScaleFactor",
  "isMobile",
  "hasTouch"
]);

function configuredDeviceOptions(options) {
  return Object.fromEntries(
    RELEASE_DEVICE_OPTION_KEYS.map((key) => [key, options?.[key]])
  );
}

function configuredReleaseProjects(config) {
  return (config.projects ?? []).map((project) => ({
    policyId: project.metadata?.releaseBrowserId,
    projectName: project.name,
    browserChannel: project.metadata?.browserChannel,
    releaseIdentity: project.metadata?.releaseIdentity,
    configuredChannel: project.use?.channel,
    useKeys: Object.keys(project.use ?? {}).sort(),
    deviceOptions: configuredDeviceOptions(project.use)
  }));
}

test("release command execution is shell-free and routes Windows npm through node", () => {
  assert.deepEqual(releaseCommandInvocation("npm", ["test"], {
    platform: "win32",
    npmCliPath: "C:\\node\\npm-cli.js",
    nodeExecutable: "C:\\node\\node.exe"
  }), {
    executable: "C:\\node\\node.exe",
    args: ["C:\\node\\npm-cli.js", "test"]
  });
  assert.deepEqual(releaseCommandInvocation("npm", ["test"], { platform: "linux" }), {
    executable: "npm",
    args: ["test"]
  });
});

test("npm toolchain version is collected without invoking a Windows command shim", () => {
  assert.match(npmVersion(process.cwd()), /^\d+\.\d+\.\d+/u);
});

test("release evidence policy and Playwright configs share the exact Chrome and Edge matrix", () => {
  const expectedProjects = REQUIRED_RELEASE_BROWSER_MATRIX.map((browser) => ({
    policyId: browser.policyId,
    projectName: browser.projectName,
    browserChannel: browser.channel,
    releaseIdentity: DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
    configuredChannel: browser.channel,
    useKeys: [...RELEASE_DEVICE_OPTION_KEYS, "channel"].sort(),
    deviceOptions: configuredDeviceOptions(releaseBrowserNativeDeviceOptions(browser))
  }));
  assert.deepEqual(
    RELEASE_BROWSER_MATRIX.map((browser) => ({ ...browser })),
    REQUIRED_RELEASE_BROWSER_MATRIX
  );
  assert.deepEqual(
    [...releaseDecisions.browserSupport.supportedEngineeringMatrix].sort(),
    REQUIRED_RELEASE_BROWSER_MATRIX.map((browser) => browser.policyId).sort()
  );
  assert.deepEqual(configuredReleaseProjects(pwaCrossBrowserConfig), expectedProjects);
  assert.deepEqual(configuredReleaseProjects(webV1CrossBrowserConfig), expectedProjects);
  assert.deepEqual(configuredReleaseProjects(backupArtifactConfig), expectedProjects);
  assert.deepEqual(configuredReleaseProjects(bootArtifactConfig), expectedProjects);
  verifyReleaseBrowserPlaywrightConfig(backupArtifactConfig, {
    receiptId: "backup",
    testMatch: [
      "database-v9-v10-upgrade.spec.ts",
      "database-v10-v11-upgrade.spec.ts",
      "offline-full-backup.spec.ts",
      "full-backup-worker-capacity.spec.ts"
    ],
    outputDirectoryName: "hakimi-bazi-backup-cross-browser-results",
    timeout: 180_000,
    expectedTestsPerProject: 4
  });
  verifyReleaseBrowserPlaywrightConfig(bootArtifactConfig, {
    receiptId: "boot",
    testMatch: ["boot-fail-closed.spec.ts", "database-v8-v9-upgrade.spec.ts"],
    outputDirectoryName: "hakimi-bazi-boot-cross-browser-results",
    timeout: 120_000,
    expectedTestsPerProject: 6
  });
  verifyReleaseBrowserPlaywrightConfig(pwaCrossBrowserConfig, {
    receiptId: "pwa",
    testMatch: "pwa-install-and-offline-cold-start.spec.ts",
    outputDirectoryName: "hakimi-bazi-pwa-cross-browser-results",
    timeout: 120_000,
    expectedTestsPerProject: 1
  });
  verifyReleaseBrowserPlaywrightConfig(webV1CrossBrowserConfig, {
    receiptId: "web-v1-flow",
    testMatch: "web-v1-continuous-flow.spec.ts",
    outputDirectoryName: "hakimi-bazi-web-v1-cross-browser-results",
    timeout: 360_000,
    expectedTestsPerProject: 1
  });
  assert.equal(pwaCrossBrowserConfig.testMatch, "pwa-install-and-offline-cold-start.spec.ts");
  assert.equal(webV1CrossBrowserConfig.testMatch, "web-v1-continuous-flow.spec.ts");
  for (const config of [
    backupArtifactConfig,
    bootArtifactConfig,
    pwaCrossBrowserConfig,
    webV1CrossBrowserConfig
  ]) {
    assert.equal(config.forbidOnly, true);
    for (const project of config.projects) {
      assert.equal(Object.hasOwn(project.use, "userAgent"), false);
      assert.equal(Object.hasOwn(project.use, "defaultBrowserType"), false);
      assert.equal(Object.hasOwn(project.use, "launchOptions"), false);
    }
  }
});

test("PWA persistent browser channel mapping is exact and fails closed for unknown projects", () => {
  for (const browser of REQUIRED_RELEASE_BROWSER_MATRIX) {
    assert.equal(releaseBrowserChannelForProject(browser.projectName), browser.channel);
  }
  assert.throws(
    () => releaseBrowserChannelForProject("chromium"),
    /不支持的 Web v1 发布浏览器项目/u
  );
});

test("release browser matrix and every policy tuple are frozen", () => {
  assert.equal(Object.isFrozen(RELEASE_BROWSER_MATRIX), true);
  for (const browser of RELEASE_BROWSER_MATRIX) assert.equal(Object.isFrozen(browser), true);
});

test("persistent release options bind branded channel and native desktop geometry", () => {
  for (const browser of REQUIRED_RELEASE_BROWSER_MATRIX) {
    const options = releasePersistentContextOptionsForProject(browser.projectName);
    assert.equal(options.channel, browser.channel);
    assert.deepEqual(
      configuredDeviceOptions(options),
      configuredDeviceOptions(releaseBrowserNativeDeviceOptions(browser))
    );
    assert.equal(Object.hasOwn(options, "defaultBrowserType"), false);
    assert.equal(Object.hasOwn(options, "userAgent"), false);
    assert.equal(Object.hasOwn(options, "executablePath"), false);
    assert.deepEqual(Object.keys(options).sort(), [
      "acceptDownloads",
      "channel",
      "deviceScaleFactor",
      "hasTouch",
      "headless",
      "isMobile",
      "screen",
      "serviceWorkers",
      "viewport"
    ]);
  }
});

test("persistent release options fail closed for unknown projects without launching", () => {
  assert.throws(
    () => releasePersistentContextOptionsForProject("chromium"),
    /不支持的 Web v1 发布浏览器项目/u
  );
});

test("strict browser reporter bypasses only the explicit static list invocation", () => {
  assert.equal(
    isPlaywrightListOnlyInvocation(["node", "playwright", "test", "--list"]),
    true
  );
  assert.equal(
    isPlaywrightListOnlyInvocation(["node", "playwright", "test"]),
    false
  );
  assert.equal(
    isPlaywrightListOnlyInvocation(["node", "playwright", "test", "--list=true"]),
    false
  );
});

test("runtime browser product must match the branded release project", () => {
  assert.equal(
    requireReleaseBrowserRuntimeProduct("msedge", "Edg/151.0.7922.34"),
    "Edg/151.0.7922.34"
  );
  assert.equal(
    requireReleaseBrowserRuntimeProduct("chrome", "Chrome/151.0.7922.34"),
    "Chrome/151.0.7922.34"
  );
  for (const [projectName, product] of [
    ["msedge", "Chrome/151.0.7922.34"],
    ["chrome", "Edg/151.0.7922.34"],
    ["chrome", "HeadlessChrome/151.0.7922.34"],
    ["msedge", "Mozilla/5.0 Edg/151.0.7922.34"]
  ]) {
    assert.throws(
      () => requireReleaseBrowserRuntimeProduct(projectName, product),
      /运行时产品不匹配/u
    );
  }
});

test("PWA release spec can launch persistent browsers only through the policy helper", () => {
  assert.match(
    pwaSpecSource,
    /from "\.\/release-browser-persistent-context\.ts";/u
  );
  assert.equal(
    [...pwaSpecSource.matchAll(/\blaunchReleasePersistentContext\s*\(\s*\{/gu)].length,
    1
  );
  assert.doesNotMatch(pwaSpecSource, /\bchromium\b/u);
  assert.match(pwaSpecSource, /projectName:\s*testInfo\.project\.name/u);
  assert.match(pwaSpecSource, /userDataDir:\s*testInfo\.outputPath/u);
  assert.doesNotMatch(pwaSpecSource, /\.\s*launchPersistentContext\s*\(/u);
  assert.doesNotMatch(pwaSpecSource, /\blaunchPersistentContext\s*\(/u);
  assert.match(pwaSpecSource, /devtools\.send\("Browser\.getVersion"\)/u);
  assert.match(
    pwaSpecSource,
    /requireReleaseBrowserRuntimeProduct\(\s*testInfo\.project\.name,\s*runtimeBrowserVersion\.product\s*\)/u
  );
});

test("PWA release spec binds the locked worker identity and offline response provenance", () => {
  assert.match(pwaSpecSource, /navigator\.serviceWorker\.getRegistration\("\/"\)/u);
  assert.match(pwaSpecSource, /controllerScriptUrl:\s*controller\.scriptURL/u);
  assert.match(pwaSpecSource, /activeScriptUrl:\s*active\.scriptURL/u);
  assert.match(pwaSpecSource, /waitingScriptUrl:\s*registration\.waiting\?\.scriptURL\s*\?\?\s*null/u);
  assert.match(pwaSpecSource, /installingScriptUrl:\s*registration\.installing\?\.scriptURL\s*\?\?\s*null/u);
  assert.match(
    pwaSpecSource,
    /controller\.postMessage\(\{\s*type:\s*"GET_BUILD_VERSION"\s*\},\s*\[channel\.port2\]\)/u
  );
  assert.match(
    pwaSpecSource,
    /workerMessage\)\.toEqual\(\{\s*type:\s*"BUILD_VERSION",\s*buildVersion,\s*\.\.\.BRIDGE_RELEASE_DATABASE_DESCRIPTOR/u
  );
  assert.equal(
    [...pwaSpecSource.matchAll(/await observeServiceWorkerRuntime\(/gu)].length,
    4
  );
  assert.equal(
    [...pwaSpecSource.matchAll(/\.fromServiceWorker\(\)/gu)].length,
    3
  );
  assert.match(pwaSpecSource, /await createDemoCase\(page\)/u);
  assert.match(
    pwaSpecSource,
    /\^\\\/cases\\\/\[0-9a-f-\]\+\\\/revisions\\\/\[0-9a-f-\]\+\$/u
  );
});

test("default Web v1 flow verifies the actual CDP product and frozen v13 identity", () => {
  assert.match(webV1SpecSource, /devtools|newCDPSession/u);
  assert.match(webV1SpecSource, /send\("Browser\.getVersion"\)/u);
  assert.match(
    webV1SpecSource,
    /requireReleaseBrowserRuntimeProduct\(\s*test\.info\(\)\.project\.name,\s*runtimeBrowserVersion\.product\s*\)/u
  );
  for (const source of [pwaSpecSource, webV1SpecSource]) {
    assert.match(source, /DEFAULT_V13_RELEASE_BROWSER_IDENTITY/u);
    assert.match(source, /BRIDGE_RELEASE_DATABASE_DESCRIPTOR/u);
    assert.match(source, /HAKIMI_RELEASE_EVIDENCE_ID/u);
  }
});

function exactPassingBrowserSummary(receiptId = "pwa") {
  const expectedTestsPerProject = REQUIRED_RELEASE_BROWSER_TESTS_PER_PROJECT[receiptId];
  return buildReleaseBrowserResultSummary({
    receiptId,
    fullResultStatus: "passed",
    expectedTestsPerProject,
    observations: REQUIRED_RELEASE_BROWSER_MATRIX.flatMap((browser) =>
      Array.from({ length: expectedTestsPerProject }, () => ({
        projectName: browser.projectName,
        expectedStatus: "passed",
        outcome: "expected",
        resultStatuses: ["passed"]
      }))
    )
  });
}

test("strict browser summaries accept each receipt's exact branded-project count", () => {
  for (const receiptId of REQUIRED_RELEASE_BROWSER_RECEIPT_IDS) {
    const summary = exactPassingBrowserSummary(receiptId);
    assert.equal(summary.strictGatePassed, true, receiptId);
    assert.doesNotThrow(
      () => assertStrictReleaseBrowserResultSummary(summary, receiptId),
      receiptId
    );
  }
});

test("strict browser summaries reject a passing but receipt-mismatched test count", () => {
  const summary = buildReleaseBrowserResultSummary({
    receiptId: "boot",
    fullResultStatus: "passed",
    expectedTestsPerProject: 1,
    observations: REQUIRED_RELEASE_BROWSER_MATRIX.map((browser) => ({
      projectName: browser.projectName,
      expectedStatus: "passed",
      outcome: "expected",
      resultStatuses: ["passed"]
    }))
  });
  assert.equal(summary.strictGatePassed, false);
  assert.throws(
    () => assertStrictReleaseBrowserResultSummary(summary, "boot"),
    /strict matrix gate/u
  );
});

for (const [label, drift] of [
  ["skipped", { expectedStatus: "skipped", outcome: "skipped", resultStatuses: ["skipped"] }],
  ["fixme/expected failure", { expectedStatus: "failed", outcome: "expected", resultStatuses: ["failed"] }],
  ["flaky", { expectedStatus: "passed", outcome: "flaky", resultStatuses: ["failed", "passed"] }],
  ["unexpected", { expectedStatus: "passed", outcome: "unexpected", resultStatuses: ["failed"] }]
]) {
  test(`strict browser summary rejects ${label}`, () => {
    const summary = buildReleaseBrowserResultSummary({
      receiptId: "pwa",
      fullResultStatus: "passed",
      expectedTestsPerProject: 1,
      observations: REQUIRED_RELEASE_BROWSER_MATRIX.map((browser, index) => ({
        projectName: browser.projectName,
        expectedStatus: index === 0 ? drift.expectedStatus : "passed",
        outcome: index === 0 ? drift.outcome : "expected",
        resultStatuses: index === 0 ? drift.resultStatuses : ["passed"]
      }))
    });
    assert.equal(summary.strictGatePassed, false);
    assert.throws(
      () => assertStrictReleaseBrowserResultSummary(summary, "pwa"),
      /strict matrix gate/u
    );
  });
}

test("bound browser result summary rejects byte tampering", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-browser-result-binding-"));
  const receiptsDirectory = path.join(root, "receipts");
  const resultDirectory = path.join(receiptsDirectory, "browser-results");
  await mkdir(resultDirectory, { recursive: true });
  const summaryPath = path.join(resultDirectory, "pwa.json");
  const summary = exactPassingBrowserSummary();
  const bytes = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(summaryPath, bytes);
  const receipt = {
    id: "pwa",
    browserResultSummaryError: null,
    browserResultSummary: {
      path: path.relative(root, summaryPath).replaceAll("\\", "/"),
      sha256: sha256(bytes),
      summary
    }
  };
  await assert.doesNotReject(() => verifyReleaseBrowserResultSummaryBinding({
    cwd: root,
    receiptsDirectory,
    receipt
  }));
  await writeFile(summaryPath, `${JSON.stringify({ ...summary, strictGatePassed: false })}\n`, "utf8");
  await assert.rejects(
    verifyReleaseBrowserResultSummaryBinding({ cwd: root, receiptsDirectory, receipt }),
    /digest mismatch/u
  );
});

test("bound browser result summary rejects a symlinked summary path", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-browser-summary-symlink-"));
  const receiptsDirectory = path.join(root, "receipts");
  const summaryDirectory = path.join(receiptsDirectory, "browser-results");
  const realSummaryPath = path.join(root, "outside-summary.json");
  const summaryPath = path.join(summaryDirectory, "pwa-summary.json");
  await mkdir(summaryDirectory, { recursive: true });
  const summary = exactPassingBrowserSummary();
  const bytes = Buffer.from(`${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(realSummaryPath, bytes);
  if (!await createSymbolicLinkOrSkip(
    context,
    realSummaryPath,
    summaryPath,
    "file",
    "Browser summary symlink"
  )) return;
  const receipt = {
    id: "pwa",
    browserResultSummaryError: null,
    browserResultSummary: {
      path: path.relative(root, summaryPath).replaceAll("\\", "/"),
      sha256: sha256(bytes),
      summary
    }
  };
  await assert.rejects(
    verifyReleaseBrowserResultSummaryBinding({ cwd: root, receiptsDirectory, receipt }),
    /symlink|junction|reparse/u
  );
});

async function prepareReleaseReceiptRunnerArtifact(root, evidenceId) {
  const dist = path.join(root, "dist", "web");
  await writeBoundDefaultV13Artifact(dist, evidenceId);
  await writeReleaseArtifactIdentityLock({
    cwd: root,
    dist,
    lockPath: path.join(root, "tmp", "release-artifact-identity.json"),
    channel: "default-v13",
    evidenceId,
    createdAt: "2026-08-27T00:00:00.000Z"
  });
}

test("release receipt runner fails closed when a browser command exits zero without a strict summary", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-browser-receipt-missing-"));
  const output = path.join(root, "receipts", "pwa.json");
  const runner = path.join(workspaceRoot, "scripts/run-release-evidence-command.mjs");
  const evidenceId = `hre1-${"c".repeat(32)}`;
  await prepareReleaseReceiptRunnerArtifact(root, evidenceId);
  const result = spawnSync(process.execPath, [
    runner,
    "--id",
    "pwa",
    "--output",
    output,
    "--",
    process.execPath,
    "-e",
    "process.exit(0)"
  ], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, HAKIMI_RELEASE_EVIDENCE_ID: evidenceId }
  });
  assert.equal(result.status, 1);
  const receipt = JSON.parse(await readFile(output, "utf8"));
  assert.equal(receipt.exitCode, 0);
  assert.equal(receipt.status, "failed");
  assert.equal(receipt.browserResultSummary, null);
  assert.match(receipt.browserResultSummaryError, /ENOENT/u);
});

test("release receipt runner binds an exact browser project summary by path and digest", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-browser-receipt-bound-"));
  const output = path.join(root, "receipts", "pwa.json");
  const runner = path.join(workspaceRoot, "scripts/run-release-evidence-command.mjs");
  const evidenceId = `hre1-${"d".repeat(32)}`;
  await prepareReleaseReceiptRunnerArtifact(root, evidenceId);
  const summaryBytes = Buffer.from(`${JSON.stringify(exactPassingBrowserSummary(), null, 2)}\n`);
  const writer = [
    "const fs=require('node:fs');",
    "const path=require('node:path');",
    "const output=process.env.HAKIMI_RELEASE_BROWSER_RESULT_OUTPUT;",
    "fs.mkdirSync(path.dirname(output),{recursive:true});",
    `fs.writeFileSync(output,Buffer.from('${summaryBytes.toString("base64")}','base64'));`
  ].join("");
  const result = spawnSync(process.execPath, [
    runner,
    "--id",
    "pwa",
    "--output",
    output,
    "--",
    process.execPath,
    "-e",
    writer
  ], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, HAKIMI_RELEASE_EVIDENCE_ID: evidenceId }
  });
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(await readFile(output, "utf8"));
  assert.equal(receipt.status, "passed");
  assert.equal(receipt.browserResultSummaryError, null);
  assert.equal(receipt.artifactIdentityBindingError, null);
  assert.equal(receipt.artifactIdentityBinding.mutationEpochCapability, "absent_schema13");
  assert.equal(receipt.artifactIdentityBinding.intervalMutationExclusionClaimed, false);
  assert.deepEqual(
    receipt.artifactIdentityBinding.beforeCommand,
    receipt.artifactIdentityBinding.afterCommand
  );
  assert.equal(receipt.browserResultSummary.sha256, sha256(summaryBytes));
  assert.match(receipt.browserResultSummary.path, /^receipts\/browser-results\/pwa-/u);
  await assert.doesNotReject(() => verifyReleaseBrowserResultSummaryBinding({
    cwd: root,
    receiptsDirectory: path.join(root, "receipts"),
    receipt
  }));
});

test("release receipt runner rejects artifact drift after a passing browser summary", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-browser-receipt-artifact-drift-"));
  const output = path.join(root, "receipts", "pwa.json");
  const runner = path.join(workspaceRoot, "scripts/run-release-evidence-command.mjs");
  const evidenceId = `hre1-${"e".repeat(32)}`;
  await prepareReleaseReceiptRunnerArtifact(root, evidenceId);
  const summaryBytes = Buffer.from(`${JSON.stringify(exactPassingBrowserSummary(), null, 2)}\n`);
  const writer = [
    "const fs=require('node:fs');",
    "const path=require('node:path');",
    "const output=process.env.HAKIMI_RELEASE_BROWSER_RESULT_OUTPUT;",
    "fs.mkdirSync(path.dirname(output),{recursive:true});",
    `fs.writeFileSync(output,Buffer.from('${summaryBytes.toString("base64")}','base64'));`,
    "fs.writeFileSync(path.join(process.cwd(),'dist','web','sw.js'),'drifted');"
  ].join("");
  const result = spawnSync(process.execPath, [
    runner,
    "--id",
    "pwa",
    "--output",
    output,
    "--",
    process.execPath,
    "-e",
    writer
  ], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, HAKIMI_RELEASE_EVIDENCE_ID: evidenceId }
  });
  assert.equal(result.status, 1);
  const receipt = JSON.parse(await readFile(output, "utf8"));
  assert.equal(receipt.exitCode, 0);
  assert.equal(receipt.browserResultSummaryError, null);
  assert.equal(receipt.artifactIdentityBinding, null);
  assert.match(receipt.artifactIdentityBindingError, /bytes changed/u);
  assert.equal(receipt.status, "failed");
});

test("release evidence policy requires four locked-artifact dual-browser commands", () => {
  assert.deepEqual(
    releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands.backup,
    ["npm", "run", "test:release:backup-artifact"]
  );
  assert.equal(
    packageJson.scripts["test:release:backup-artifact"],
    "playwright test --config apps/web/playwright.release-backup-artifact.config.ts"
  );
  assert.deepEqual(
    releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands.boot,
    ["npm", "run", "test:release:boot-artifact"]
  );
  assert.equal(
    packageJson.scripts["test:release:boot-artifact"],
    "playwright test --config apps/web/playwright.release-boot-artifact.config.ts"
  );
  assert.deepEqual(
    releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands["artifact-stability"],
    ["node", "scripts/release-artifact-identity.mjs", "--verify", "--dist", "dist/web", "--lock", "tmp/release-artifact-identity.json"]
  );
  assert.deepEqual(
    releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands.pwa,
    ["npm", "run", "test:release:pwa-artifact"]
  );
  assert.deepEqual(
    releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands["web-v1-flow"],
    ["npm", "run", "test:release:web-v1-artifact"]
  );
  assert.equal(
    packageJson.scripts["test:release:pwa-artifact"],
    "playwright test --config apps/web/playwright.release-pwa-artifact.config.ts"
  );
  assert.equal(
    packageJson.scripts["test:release:web-v1-artifact"],
    "playwright test --config apps/web/playwright.release-web-v1-artifact.config.ts"
  );
});

test("evidence paths cannot escape their declared root", () => {
  const root = path.resolve("workspace");
  assert.equal(relativePathWithin(root, path.join(root, "dist", "index.html"), "artifact"), "dist/index.html");
  assert.throws(() => relativePathWithin(root, path.resolve(root, "..", "outside"), "artifact"), /escapes/u);
});

function linkCreationIsUnavailable(error) {
  return error && typeof error === "object"
    && ["EACCES", "EPERM", "ENOTSUP", "UNKNOWN"].includes(error.code);
}

async function createSymbolicLinkOrSkip(context, target, linkPath, type, label) {
  try {
    await symlink(target, linkPath, type);
    return true;
  } catch (error) {
    if (!linkCreationIsUnavailable(error)) throw error;
    context.skip(`${label} creation is unavailable in this environment: ${error.code}`);
    return false;
  }
}

test("stable held-file snapshots accept one ordinary unaliased file", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-stable-file-"));
  const filePath = path.join(root, "receipt.json");
  const bytes = Buffer.from('{"ok":true}\n', "utf8");
  await writeFile(filePath, bytes);
  const snapshot = await readStableRegularFileSnapshot(filePath, {
    containmentRoot: root,
    label: "Ordinary receipt"
  });
  assert.equal(snapshot.bytes.equals(bytes), true);
  assert.equal(snapshot.size, bytes.byteLength);
  assert.equal(snapshot.sha256, sha256(bytes));
  assert.equal(snapshot.identity.nlink, "1");
});

test("artifact inventory rejects a file symlink instead of omitting it", async (context) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-file-symlink-"));
  const root = path.join(workspace, "artifact");
  const target = path.join(workspace, "outside.js");
  await mkdir(root);
  await writeFile(target, "outside", "utf8");
  if (!await createSymbolicLinkOrSkip(
    context,
    target,
    path.join(root, "app.js"),
    "file",
    "File symlink"
  )) return;
  await assert.rejects(
    collectArtifactEntries(root),
    /symlink|junction|reparse/u
  );
});

test("artifact inventory rejects a nested directory junction", async (context) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-dir-junction-"));
  const root = path.join(workspace, "artifact");
  const target = path.join(workspace, "outside-assets");
  await mkdir(root);
  await mkdir(target);
  await writeFile(path.join(target, "app.js"), "outside", "utf8");
  if (!await createSymbolicLinkOrSkip(
    context,
    target,
    path.join(root, "assets"),
    process.platform === "win32" ? "junction" : "dir",
    "Directory junction"
  )) return;
  await assert.rejects(
    collectArtifactEntries(root),
    /symlink|junction|reparse/u
  );
});

test("artifact inventory rejects an aliased artifact root", async (context) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-root-alias-"));
  const target = path.join(workspace, "real-artifact");
  const alias = path.join(workspace, "artifact-alias");
  await mkdir(target);
  await writeFile(path.join(target, "index.html"), "shell", "utf8");
  if (!await createSymbolicLinkOrSkip(
    context,
    target,
    alias,
    process.platform === "win32" ? "junction" : "dir",
    "Artifact root alias"
  )) return;
  await assert.rejects(
    collectArtifactEntries(alias),
    /containment root|symlink|junction|reparse|alias/u
  );
});

test("artifact inventory rejects an artifact root reached through an ancestor alias", async (context) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-root-parent-alias-"));
  const realParent = path.join(workspace, "real-parent");
  const artifact = path.join(realParent, "artifact");
  const aliasParent = path.join(workspace, "alias-parent");
  await mkdir(artifact, { recursive: true });
  await writeFile(path.join(artifact, "index.html"), "shell", "utf8");
  if (!await createSymbolicLinkOrSkip(
    context,
    realParent,
    aliasParent,
    process.platform === "win32" ? "junction" : "dir",
    "Artifact ancestor alias"
  )) return;
  await assert.rejects(
    collectArtifactEntries(path.join(aliasParent, "artifact")),
    /containment root real path does not match its lexical path/u
  );
});

test("artifact inventory and stable reads reject hardlinked files", async (context) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-hardlink-"));
  const root = path.join(workspace, "artifact");
  const original = path.join(workspace, "outside.js");
  const linked = path.join(root, "app.js");
  await mkdir(root);
  await writeFile(original, "shared", "utf8");
  try {
    await link(original, linked);
  } catch (error) {
    if (!linkCreationIsUnavailable(error)) throw error;
    context.skip(`Hardlink creation is unavailable in this environment: ${error.code}`);
    return;
  }
  await assert.rejects(
    collectArtifactEntries(root),
    /hardlink/u
  );
  await assert.rejects(
    readStableRegularFileSnapshot(linked, {
      containmentRoot: root,
      label: "Hardlinked receipt"
    }),
    /hardlink/u
  );
});

test("evidence id is stable and binds source, lockfile and channel", () => {
  const input = {
    gitCommit: "a".repeat(40),
    sourceTreeDigest: "b".repeat(64),
    lockfileDigest: "c".repeat(64),
    channel: "default-v13"
  };
  const first = computeEvidenceId(input);
  assert.match(first, /^hre1-[a-f0-9]{32}$/u);
  assert.equal(first, computeEvidenceId({ ...input }));
  assert.notEqual(first, computeEvidenceId({ ...input, channel: "schema16-candidate" }));
});

test("artifact inventory changes when a built byte is tampered", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-artifacts-"));
  await mkdir(path.join(root, "assets"));
  await writeFile(path.join(root, "index.html"), "first", "utf8");
  await writeFile(path.join(root, "assets", "app.js"), "app", "utf8");
  const before = await collectArtifactEntries(root);
  await writeFile(path.join(root, "index.html"), "second", "utf8");
  const after = await collectArtifactEntries(root);
  assert.notEqual(sha256(canonicalJson(before)), sha256(canonicalJson(after)));
});

test("release artifact components bind the shell, PWA manifest, worker and hosting headers", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-components-"));
  for (const [fileName, bytes] of Object.entries({
    "index.html": "shell",
    "manifest.webmanifest": "{\"name\":\"Hakimi\"}",
    "sw.js": "self.addEventListener('fetch', () => {});",
    "_headers": "/*\\n  X-Content-Type-Options: nosniff\\n",
    "assets/app.js": "app"
  })) {
    const filePath = path.join(root, fileName);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes, "utf8");
  }
  const entries = await collectArtifactEntries(root);
  const components = releaseArtifactComponents(entries);
  assert.deepEqual(
    Object.fromEntries(Object.entries(components).map(([id, entry]) => [id, entry.path])),
    {
      applicationShell: "index.html",
      pwaManifest: "manifest.webmanifest",
      serviceWorker: "sw.js",
      hostingHeaders: "_headers"
    }
  );
  assert.equal(Object.isFrozen(components), true);
  for (const component of Object.values(components)) {
    assert.equal(Object.isFrozen(component), true);
    assert.match(component.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(component.size > 0);
  }
});

test("release artifact components fail closed when required files are missing, duplicated or empty", () => {
  const exactEntries = [
    { path: "index.html", size: 1, sha256: "1".repeat(64) },
    { path: "manifest.webmanifest", size: 1, sha256: "2".repeat(64) },
    { path: "sw.js", size: 1, sha256: "3".repeat(64) },
    { path: "_headers", size: 1, sha256: "4".repeat(64) }
  ];
  assert.throws(
    () => releaseArtifactComponents(exactEntries.filter((entry) => entry.path !== "sw.js")),
    /serviceWorker\/sw\.js/u
  );
  assert.throws(
    () => releaseArtifactComponents([...exactEntries, { ...exactEntries[0] }]),
    /applicationShell\/index\.html/u
  );
  assert.throws(
    () => releaseArtifactComponents(exactEntries.map((entry) =>
      entry.path === "manifest.webmanifest" ? { ...entry, size: 0 } : entry
    )),
    /pwaManifest/u
  );
});

test("release evidence schema requires explicit artifact components, identity lock, mutation boundary and their gates", () => {
  assert.ok(releaseEvidenceSchema.properties.artifacts.required.includes("components"));
  assert.ok(releaseEvidenceSchema.properties.artifacts.required.includes("identityLock"));
  assert.ok(releaseEvidenceSchema.properties.artifacts.required.includes("mutationBoundary"));
  assert.deepEqual(
    releaseEvidenceSchema.properties.artifacts.properties.components.required,
    ["applicationShell", "pwaManifest", "serviceWorker", "hostingHeaders"]
  );
  assert.ok(
    releaseEvidenceSchema.properties.gates.required.includes(
      "requiredArtifactComponentsPresent"
    )
  );
  assert.ok(releaseEvidenceSchema.properties.gates.required.includes("artifactIdentityStable"));
});

function validArtifactMutationBoundary() {
  return {
    schemaVersion: 1,
    boundaryType: "release_artifact_endpoint_snapshot_boundary_v1",
    coveredReceiptIds: ["backup", "boot", "pwa", "web-v1-flow"],
    endpointSnapshotsMatched: true,
    verificationScope: "endpoint_snapshots_only_no_interval_mutation_epoch",
    mutationEpochCapability: "absent_schema13",
    intervalMutationExclusionClaimed: false,
    abaMutationExclusionClaimed: false
  };
}

test("artifact mutation boundary exposes only canonical endpoint snapshot semantics", () => {
  const boundary = buildReleaseArtifactMutationBoundary({
    coveredReceiptIds: [...RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS],
    endpointSnapshotsMatched: true
  });
  assert.deepEqual(boundary, validArtifactMutationBoundary());
  assert.equal(Object.isFrozen(boundary), true);
  assert.equal(Object.isFrozen(boundary.coveredReceiptIds), true);
  assert.equal(assertReleaseArtifactMutationBoundary(boundary), true);

  for (const weakened of [
    { ...validArtifactMutationBoundary(), coveredReceiptIds: ["backup", "boot", "pwa"] },
    { ...validArtifactMutationBoundary(), endpointSnapshotsMatched: false },
    { ...validArtifactMutationBoundary(), mutationEpochCapability: "available" },
    { ...validArtifactMutationBoundary(), intervalMutationExclusionClaimed: true },
    { ...validArtifactMutationBoundary(), abaMutationExclusionClaimed: true },
    { ...validArtifactMutationBoundary(), unexpectedField: true }
  ]) {
    assert.throws(
      () => assertReleaseArtifactMutationBoundary(weakened),
      /mutation boundary projection is malformed/u
    );
  }
  assert.throws(
    () => buildReleaseArtifactMutationBoundary({
      coveredReceiptIds: ["backup", "boot", "pwa"],
      endpointSnapshotsMatched: true
    }),
    /every canonical browser receipt endpoint snapshot/u
  );
  assert.throws(
    () => buildReleaseArtifactMutationBoundary({
      coveredReceiptIds: [...RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS],
      endpointSnapshotsMatched: false
    }),
    /every canonical browser receipt endpoint snapshot/u
  );
});

function strictBrowserProject(projectName) {
  return {
    projectName,
    discovered: 1,
    passed: 1,
    skipped: 0,
    failed: 0,
    timedOut: 0,
    interrupted: 0,
    unexpected: 0,
    flaky: 0,
    nonPassedExpectedStatus: 0,
    attempts: 1
  };
}

function validReleaseEvidenceFixture() {
  const hashes = Array.from({ length: 16 }, (_, index) =>
    (index + 1).toString(16).padStart(64, "0")
  );
  const artifactEntries = [
    { path: "index.html", size: 10, sha256: hashes[0] },
    { path: "manifest.webmanifest", size: 11, sha256: hashes[1] },
    { path: "sw.js", size: 12, sha256: hashes[2] },
    { path: "_headers", size: 13, sha256: hashes[3] }
  ];
  const summary = {
    schemaVersion: 1,
    summaryType: "release_browser_test_summary",
    receiptId: "pwa",
    expectedTestsPerProject: 1,
    expectedProjectNames: ["msedge", "chrome"],
    fullResultStatus: "passed",
    strictGatePassed: true,
    unexpectedProjectNames: [],
    errors: [],
    projects: [strictBrowserProject("msedge"), strictBrowserProject("chrome")]
  };
  return {
    schemaVersion: 1,
    evidenceType: "engineering_release_evidence",
    evidenceId: `hre1-${"a".repeat(32)}`,
    generatedAt: "2026-08-26T00:00:00.000Z",
    source: {
      repository: null,
      commit: "b".repeat(40),
      branch: "main",
      dirty: false,
      untrackedSourceFileCount: 0,
      sourceTreeDigest: hashes[4],
      packageLockSha256: hashes[5]
    },
    release: {
      channel: "default-v13",
      candidateLabel: "schema-fixture",
      descriptor: {
        protocolVersion: 1,
        dbGeneration: "legacy-v13",
        databaseName: "hakimi-bazi-research",
        targetSchema: 13,
        minReadableSchema: 13,
        maxReadableSchema: 13,
        migrationId: null,
        acceptedCommittedMigrationIds: [null],
        sourceGeneration: null,
        sourceDatabaseName: null,
        sourceSchema: null
      },
      manifestVersion: 1,
      manifestDigest: hashes[6],
      buildVersion: "abcdef123456",
      builtEvidenceId: `hre1-${"a".repeat(32)}`,
      evidenceIdBound: true,
      requiredReceiptIds: ["pwa"]
    },
    toolchain: {
      node: "v24.16.0",
      npm: "11.13.0",
      platform: "win32",
      arch: "x64",
      osRelease: "10.0.26200",
      browsers: {
        edge: "Microsoft Edge 140.0.0.0",
        chrome: "Google Chrome 140.0.0.0"
      }
    },
    policyFiles: [
      { path: "docs/release/web-v1-release-decisions.json", sha256: hashes[7] },
      { path: "docs/release/release-generation-history.json", sha256: hashes[8] },
      { path: "docs/security/hosting-security-policy.json", sha256: hashes[9] },
      { path: "docs/release/release-evidence.schema.json", sha256: hashes[10] }
    ],
    testReceipts: [{
      id: "pwa",
      evidenceId: `hre1-${"a".repeat(32)}`,
      status: "passed",
      exitCode: 0,
      command: ["npm", "run", "test:release:pwa-artifact"],
      startedAt: "2026-08-26T00:00:00.000Z",
      completedAt: "2026-08-26T00:01:00.000Z",
      durationMs: 60_000,
      browserResultSummary: {
        path: "tmp/release-evidence-receipts/pwa.browser-result.json",
        sha256: hashes[11],
        summary
      },
      path: "tmp/release-evidence-receipts/pwa.json",
      sha256: hashes[12]
    }],
    artifacts: {
      root: "dist/web",
      count: 4,
      artifactSetDigest: hashes[13],
      identityLock: {
        path: "tmp/release-artifact-identity.json",
        sha256: hashes[14],
        lockDigest: hashes[15],
        artifactSetDigest: hashes[13],
        verified: true
      },
      mutationBoundary: validArtifactMutationBoundary(),
      components: {
        applicationShell: artifactEntries[0],
        pwaManifest: artifactEntries[1],
        serviceWorker: artifactEntries[2],
        hostingHeaders: artifactEntries[3]
      },
      files: artifactEntries
    },
    gates: {
      sourceTreeClean: true,
      evidenceIdBound: true,
      defaultReleaseDescriptorMatched: true,
      requiredReceiptsPresent: true,
      allRecordedReceiptsPassed: true,
      policyReceiptSetMatched: true,
      recordedReceiptSetMatched: true,
      policyReceiptCommandsMatched: true,
      browserResultSummariesMatched: true,
      artifactIdentityStable: true,
      requiredArtifactComponentsPresent: true,
      engineeringGatePassed: true,
      releaseHistoryOwnerConfirmed: false,
      hostingSecurityVerified: false,
      publicDeploymentAuthorized: false,
      licenseOwnerSelectionRecorded: false,
      expertClaimsAuthorized: false
    },
    claims: {
      engineeringEvidenceOnly: true,
      codeSignature: false,
      expertSignature: false,
      contentRightsGrant: false,
      publicReleaseAuthorized: false
    }
  };
}

function valueAtPath(root, segments) {
  return segments.reduce((value, segment) => value[segment], root);
}

test("checked-in Release Evidence Schema compiles and accepts a complete closed fixture", () => {
  const validator = compileReleaseEvidenceSchema(releaseEvidenceSchema);
  assert.equal(Object.isFrozen(validator.schema), true);
  assert.equal(Object.isFrozen(validator.schema.properties), true);
  assert.doesNotThrow(() => validator.assert(validReleaseEvidenceFixture()));
  const nonBrowserFixture = validReleaseEvidenceFixture();
  nonBrowserFixture.release.requiredReceiptIds = ["unit"];
  nonBrowserFixture.testReceipts[0].id = "unit";
  nonBrowserFixture.testReceipts[0].command = ["npm", "test"];
  nonBrowserFixture.testReceipts[0].browserResultSummary = null;
  assert.doesNotThrow(() => validator.assert(nonBrowserFixture));
});

test("Release Evidence Schema rejects unknown fields at every formal binding layer", () => {
  const validator = compileReleaseEvidenceSchema(releaseEvidenceSchema);
  const injectionPaths = [
    [],
    ["source"],
    ["release"],
    ["release", "descriptor"],
    ["toolchain", "browsers"],
    ["policyFiles", 0],
    ["testReceipts", 0],
    ["testReceipts", 0, "browserResultSummary"],
    ["testReceipts", 0, "browserResultSummary", "summary"],
    ["testReceipts", 0, "browserResultSummary", "summary", "projects", 0],
    ["artifacts"],
    ["artifacts", "identityLock"],
    ["artifacts", "mutationBoundary"],
    ["artifacts", "components"],
    ["artifacts", "files", 0],
    ["gates"],
    ["claims"]
  ];
  for (const segments of injectionPaths) {
    const fixture = validReleaseEvidenceFixture();
    valueAtPath(fixture, segments).unexpectedField = true;
    assert.throws(
      () => validator.assert(fixture),
      /Release Evidence Schema validation failed/u,
      `unknown field was accepted at ${segments.join(".") || "root"}`
    );
  }
});

test("Release Evidence Schema enforces scalar types, formats, required keys and unique arrays", () => {
  const validator = compileReleaseEvidenceSchema(releaseEvidenceSchema);
  const mutations = [
    (fixture) => { fixture.evidenceId = 1; },
    (fixture) => { fixture.generatedAt = "not-a-date-time"; },
    (fixture) => { delete fixture.release.descriptor.protocolVersion; },
    (fixture) => { fixture.release.requiredReceiptIds.push("pwa"); },
    (fixture) => { fixture.release.descriptor.acceptedCommittedMigrationIds.push(null); },
    (fixture) => { fixture.testReceipts[0].browserResultSummary.summary.projects[1] =
      structuredClone(fixture.testReceipts[0].browserResultSummary.summary.projects[0]); }
  ];
  for (const mutate of mutations) {
    const fixture = validReleaseEvidenceFixture();
    mutate(fixture);
    assert.throws(() => validator.assert(fixture), /Release Evidence Schema validation failed/u);
  }
});

test("Release Evidence Schema rejects every mutation-boundary promotion or omission", () => {
  const validator = compileReleaseEvidenceSchema(releaseEvidenceSchema);
  const mutations = [
    (fixture) => { delete fixture.artifacts.mutationBoundary; },
    (fixture) => { fixture.artifacts.mutationBoundary.coveredReceiptIds.pop(); },
    (fixture) => { fixture.artifacts.mutationBoundary.coveredReceiptIds[3] = "pwa"; },
    (fixture) => { fixture.artifacts.mutationBoundary.endpointSnapshotsMatched = false; },
    (fixture) => { fixture.artifacts.mutationBoundary.verificationScope = "interval_stable"; },
    (fixture) => { fixture.artifacts.mutationBoundary.mutationEpochCapability = "available"; },
    (fixture) => { fixture.artifacts.mutationBoundary.intervalMutationExclusionClaimed = true; },
    (fixture) => { fixture.artifacts.mutationBoundary.abaMutationExclusionClaimed = true; }
  ];
  for (const mutate of mutations) {
    const fixture = validReleaseEvidenceFixture();
    mutate(fixture);
    assert.throws(
      () => validator.assert(fixture),
      /Release Evidence Schema validation failed/u
    );
  }
});

test("Release Evidence Schema definition audit rejects unsupported keyword drift", () => {
  const drifted = structuredClone(releaseEvidenceSchema);
  drifted.unevaluatedProperties = false;
  assert.throws(
    () => compileReleaseEvidenceSchema(drifted),
    /unsupported schema keyword/u
  );
  const silentlyIgnoredConstraint = structuredClone(releaseEvidenceSchema);
  silentlyIgnoredConstraint.properties.schemaVersion.minLength = 1;
  assert.throws(
    () => compileReleaseEvidenceSchema(silentlyIgnoredConstraint),
    /string length keywords require type string/u
  );
  const emptyConstraint = structuredClone(releaseEvidenceSchema);
  emptyConstraint.properties.generatedAt = {};
  assert.throws(
    () => compileReleaseEvidenceSchema(emptyConstraint),
    /explicit audited constraint/u
  );
  const broadenedUnion = structuredClone(releaseEvidenceSchema);
  broadenedUnion.properties.testReceipts.items.properties.browserResultSummary.anyOf.push({
    type: "string"
  });
  assert.throws(
    () => compileReleaseEvidenceSchema(broadenedUnion),
    /audited local-reference-or-null union/u
  );
  for (const conflictingConstraint of [
    { type: "string", const: 1 },
    { type: "string", enum: ["ok", 1] }
  ]) {
    const conflicting = structuredClone(releaseEvidenceSchema);
    conflicting.properties.schemaVersion = conflictingConstraint;
    assert.throws(
      () => compileReleaseEvidenceSchema(conflicting),
      /type cannot be combined with const or enum/u
    );
  }
});

function assertSourceOrder(source, earlier, later) {
  const earlierIndex = source.indexOf(earlier);
  const laterIndex = source.indexOf(later);
  assert.notEqual(earlierIndex, -1, `missing source marker: ${earlier}`);
  assert.notEqual(laterIndex, -1, `missing source marker: ${later}`);
  assert.ok(earlierIndex < laterIndex, `${earlier} must precede ${later}`);
}

test("generator and verifier execute Schema before output writes or Git state reads", () => {
  assertSourceOrder(
    releaseEvidenceGeneratorSource,
    "releaseEvidenceSchemaValidator.assert(evidence)",
    "await mkdir(path.dirname(output)"
  );
  assertSourceOrder(
    releaseEvidenceGeneratorSource,
    "releaseEvidenceSchemaValidator.assert(evidence)",
    "await writeFile(output"
  );
  assertSourceOrder(
    releaseEvidenceVerifierSource,
    "releaseEvidenceSchemaValidator.assert(evidence)",
    "const git = readGitState(cwd)"
  );
});

test("formal verifier receipt is external, non-overwriting, and never promoted by local allowances", () => {
  for (const marker of [
    "Formal verification receipt must be stored outside the artifact root.",
    "{ encoding: \"utf8\", flag: \"wx\" }",
    "status: engineeringGatePassed ? \"passed\" : \"diagnostic_only\"",
    "formalReleaseEvidenceVerified: engineeringGatePassed",
    "sourceAndArtifactCurrentVerified: engineeringGatePassed",
    "publicReleaseAuthorized: false"
  ]) assert.ok(releaseEvidenceVerifierSource.includes(marker), `missing formal receipt boundary: ${marker}`);
  assert.doesNotMatch(
    releaseEvidenceVerifierSource,
    /formalReleaseEvidenceVerified:\s*allowanceScopedEngineeringGatePassed/u
  );
  assertSourceOrder(
    releaseEvidenceVerifierSource,
    "const engineeringGatePassed = !git.dirty",
    "await writeFile("
  );
});

test("generator and verifier project the exact endpoint-only mutation boundary", () => {
  for (const source of [releaseEvidenceGeneratorSource, releaseEvidenceVerifierSource]) {
    for (const marker of [
      "const browserReceiptIds = policyReceiptIds.filter(isReleaseBrowserReceiptId)",
      "const artifactEndpointSnapshotsMatched = browserReceiptIds",
      "const artifactMutationBoundary = buildReleaseArtifactMutationBoundary({",
      "coveredReceiptIds: browserReceiptIds",
      "endpointSnapshotsMatched: artifactEndpointSnapshotsMatched",
      "mutationBoundary: artifactMutationBoundary"
    ]) assert.ok(source.includes(marker), `missing mutation-boundary producer marker: ${marker}`);
  }
  assertSourceOrder(
    releaseEvidenceVerifierSource,
    "const rawReceiptsById = new Map()",
    "const artifactMutationBoundary = buildReleaseArtifactMutationBoundary({"
  );
  assertSourceOrder(
    releaseEvidenceVerifierSource,
    "const artifactMutationBoundary = buildReleaseArtifactMutationBoundary({",
    "canonicalJson(evidence.artifacts.mutationBoundary)"
  );
  assert.match(
    releaseEvidenceVerifierSource,
    /artifacts:\s*\{[\s\S]*mutationBoundary: artifactMutationBoundary[\s\S]*receiptCount:/u
  );
});

test("recorded receipt ids must exactly equal the default-v13 policy set", () => {
  const policyIds = ["governance", "unit"];
  assert.equal(
    releaseReceiptSetMatchesPolicy([{ id: "unit" }, { id: "governance" }], policyIds),
    true
  );
  assert.equal(
    releaseReceiptSetMatchesPolicy(
      [{ id: "unit" }, { id: "governance" }, { id: "extra" }],
      policyIds
    ),
    false
  );
  assert.throws(
    () => releaseReceiptSetMatchesPolicy([{ id: "unit" }, { id: "unit" }], policyIds),
    /duplicates/u
  );
});

test("default-v13 descriptor matching covers every ReleaseDatabaseDescriptor field", () => {
  const decision = {
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  };
  const matches = (descriptor) => defaultV13ReleaseDescriptorMatches({
    channel: "default-v13",
    descriptor,
    decision,
    canonicalDescriptor: BRIDGE_RELEASE_DATABASE_DESCRIPTOR
  });
  assert.equal(matches(structuredClone(BRIDGE_RELEASE_DATABASE_DESCRIPTOR)), true);
  const drifts = {
    protocolVersion: 2,
    dbGeneration: "legacy-v13-drift",
    databaseName: "other-database",
    targetSchema: 14,
    minReadableSchema: 12,
    maxReadableSchema: 14,
    migrationId: "unexpected-migration",
    acceptedCommittedMigrationIds: ["unexpected-migration"],
    sourceGeneration: "unexpected-source",
    sourceDatabaseName: "unexpected-source-database",
    sourceSchema: 12
  };
  for (const [key, value] of Object.entries(drifts)) {
    const descriptor = structuredClone(BRIDGE_RELEASE_DATABASE_DESCRIPTOR);
    descriptor[key] = value;
    assert.equal(matches(descriptor), false, `descriptor drift was accepted: ${key}`);
  }
});

test("verifier recomputes repository, branch and complete toolchain identity", () => {
  for (const marker of [
    "equal(evidence.source.repository, git.repository, \"Git repository\")",
    "equal(evidence.source.branch, git.branch, \"Git branch\")",
    "equal(canonicalJson(evidence.toolchain), canonicalJson(releaseToolchain(cwd)), \"Release toolchain\")"
  ]) assert.ok(releaseEvidenceVerifierSource.includes(marker), `missing verifier binding: ${marker}`);
});

test("formal JSON bindings use one held byte snapshot and reject filesystem aliases structurally", () => {
  for (const source of [releaseEvidenceGeneratorSource, releaseEvidenceVerifierSource]) {
    assert.match(source, /readStableRegularFileSnapshot\(receiptPath/u);
    assert.match(source, /JSON\.parse\([^\n]*Snapshot\.bytes\.toString\("utf8"\)\)/u);
    assert.doesNotMatch(source, /sha256File\(receiptPath\)|readFile\(receiptPath/u);
    assert.match(source, /Built release metadata and artifact inventory did not use the same stable index bytes/u);
  }
  assert.match(releaseBrowserResultEvidenceSource, /readStableRegularFileSnapshot\(summaryPath/u);
  assert.doesNotMatch(releaseBrowserResultEvidenceSource, /readFile\(summaryPath/u);
  assert.match(releaseArtifactIdentitySource, /readStableRegularFileSnapshot\(absoluteLockPath/u);
  assert.doesNotMatch(releaseArtifactIdentitySource, /readFile\(absoluteLockPath/u);
  for (const marker of [
    "beforeLstat",
    "beforeFstat",
    "afterFstat",
    "afterLstat",
    "beforeRealPath",
    "afterRealPath",
    "birthtimeNs",
    "details.nlink !== 1n",
    "handle.readFile()"
  ]) {
    assert.ok(releaseEvidenceLibrarySource.includes(marker), `missing stable snapshot guard: ${marker}`);
  }
  assert.match(releaseEvidenceLibrarySource, /details\.isSymbolicLink\(\) \|\| !details\.isFile\(\)/u);
  assert.match(releaseEvidenceLibrarySource, /entry\.isSymbolicLink\(\)/u);
  assert.match(releaseEvidenceLibrarySource, /containment root real path does not match its lexical path/u);
});

test("default-v13 receipt policy and local allowances remain fail-closed", () => {
  assert.match(
    releaseEvidenceGeneratorSource,
    /const requiredReceiptIds = requiredReceiptIdsOverride \?\? policyReceiptIds;/u
  );
  for (const source of [releaseEvidenceGeneratorSource, releaseEvidenceVerifierSource]) {
    assert.match(source, /const allowanceScopedEngineeringGatePassed = \(!git\.dirty \|\| allowDirty\)/u);
    assert.match(source, /&& \(evidenceIdBound \|\| allowUnbound\)/u);
    assert.doesNotMatch(source, /!allowDirty && !allowUnbound && !engineeringGatePassed/u);
  }
});

async function writeBoundDefaultV13Artifact(root, evidenceId) {
  const descriptor = {
    dbGeneration: "legacy-v13",
    databaseName: "hakimi-bazi-research",
    targetSchema: 13,
    migrationId: null
  };
  const manifest = JSON.stringify({ manifestVersion: 1, database: descriptor });
  const escapedManifest = manifest.replaceAll('"', "&quot;");
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, "index.html"), `<!doctype html><head>
    <meta name="hakimi-release-database" content="${JSON.stringify(descriptor).replaceAll('"', "&quot;")}" />
    <meta name="hakimi-release-storage-manifest" content="${escapedManifest}" />
    <meta name="hakimi-release-storage-manifest-digest" content="${sha256(manifest)}" />
    <meta name="hakimi-build-version" content="012345abcdef" />
    <meta name="hakimi-release-evidence-id" content="${evidenceId}" />
  </head>`, "utf8");
  await writeFile(path.join(root, "manifest.webmanifest"), "{}", "utf8");
  await writeFile(path.join(root, "sw.js"), "self.addEventListener('fetch',()=>{});", "utf8");
  await writeFile(path.join(root, "_headers"), "/*\n  Cache-Control: no-cache\n", "utf8");
}

test("release artifact identity lock detects any byte drift across browser evidence", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-release-artifact-lock-"));
  const dist = path.join(workspace, "dist", "web");
  const lockPath = path.join(workspace, "tmp", "release-artifact-identity.json");
  const evidenceId = `hre1-${"a".repeat(32)}`;
  await writeBoundDefaultV13Artifact(dist, evidenceId);
  const written = await writeReleaseArtifactIdentityLock({
    cwd: workspace,
    dist,
    lockPath,
    channel: "default-v13",
    evidenceId,
    createdAt: "2026-08-26T00:00:00.000Z"
  });
  assert.match(written.lock.artifactSetDigest, /^[a-f0-9]{64}$/u);
  await assert.doesNotReject(() => verifyReleaseArtifactIdentityLock({
    cwd: workspace,
    dist,
    lockPath,
    evidenceId
  }));
  await writeFile(path.join(dist, "sw.js"), "tampered", "utf8");
  await assert.rejects(
    verifyReleaseArtifactIdentityLock({ cwd: workspace, dist, lockPath, evidenceId }),
    /bytes changed/u
  );
});

test("release artifact identity lock cannot be written inside dist/web", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-release-artifact-lock-path-"));
  const dist = path.join(workspace, "dist", "web");
  const evidenceId = `hre1-${"b".repeat(32)}`;
  await writeBoundDefaultV13Artifact(dist, evidenceId);
  await assert.rejects(
    writeReleaseArtifactIdentityLock({
      cwd: workspace,
      dist,
      lockPath: path.join(dist, "identity.json"),
      channel: "default-v13",
      evidenceId
    }),
    /outside the artifact root/u
  );
});

test("release artifact identity verification rejects a hardlinked lock", async (context) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-release-lock-hardlink-"));
  const dist = path.join(workspace, "dist", "web");
  const lockPath = path.join(workspace, "tmp", "release-artifact-identity.json");
  const evidenceId = `hre1-${"f".repeat(32)}`;
  await writeBoundDefaultV13Artifact(dist, evidenceId);
  await writeReleaseArtifactIdentityLock({
    cwd: workspace,
    dist,
    lockPath,
    channel: "default-v13",
    evidenceId,
    createdAt: "2026-08-27T00:00:00.000Z"
  });
  try {
    await link(lockPath, path.join(workspace, "lock-alias.json"));
  } catch (error) {
    if (!linkCreationIsUnavailable(error)) throw error;
    context.skip(`Hardlink creation is unavailable in this environment: ${error.code}`);
    return;
  }
  await assert.rejects(
    verifyReleaseArtifactIdentityLock({ cwd: workspace, dist, lockPath, evidenceId }),
    /hardlink/u
  );
});

test("built metadata rejects a manifest digest mismatch", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-meta-"));
  const manifest = JSON.stringify({ manifestVersion: 1, database: {} });
  await writeFile(path.join(root, "index.html"), `<!doctype html><head>
    <meta name="hakimi-release-database" content="{}" />
    <meta name="hakimi-release-storage-manifest" content="${manifest.replaceAll('"', "&quot;")}" />
    <meta name="hakimi-release-storage-manifest-digest" content="${"0".repeat(64)}" />
    <meta name="hakimi-build-version" content="012345abcdef" />
    <meta name="hakimi-release-evidence-id" content="unbound-local-build" />
  </head>`, "utf8");
  await assert.rejects(() => readBuiltReleaseMetadata(root), /manifest digest/u);
});

test("built metadata rejects a v13 meta descriptor paired with a different manifest database", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-evidence-meta-database-split-"));
  const descriptor = {
    dbGeneration: "legacy-v13",
    databaseName: "hakimi-bazi-research",
    targetSchema: 13,
    migrationId: null
  };
  const manifest = JSON.stringify({
    manifestVersion: 1,
    database: { ...descriptor, dbGeneration: "shadow-v16", targetSchema: 16 }
  });
  const escapedDescriptor = JSON.stringify(descriptor).replaceAll('"', "&quot;");
  await writeFile(path.join(root, "index.html"), `<!doctype html><head>
    <meta name="hakimi-release-database" content="${escapedDescriptor}" />
    <meta name="hakimi-release-storage-manifest" content="${manifest.replaceAll('"', "&quot;")}" />
    <meta name="hakimi-release-storage-manifest-digest" content="${sha256(manifest)}" />
    <meta name="hakimi-build-version" content="012345abcdef" />
    <meta name="hakimi-release-evidence-id" content="unbound-local-build" />
  </head>`, "utf8");
  await assert.rejects(
    readBuiltReleaseMetadata(root),
    /descriptor does not match the storage manifest database descriptor/u
  );
});
