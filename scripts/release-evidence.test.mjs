import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  releasePersistentContextOptionsForProject,
  requireReleaseBrowserRuntimeProduct
} from "../apps/web/e2e/release-browser-persistent-context.ts";
import pwaCrossBrowserConfig from "../apps/web/playwright.pwa-cross-browser.config.ts";
import {
  DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions,
  releaseBrowserChannelForProject
} from "../apps/web/playwright.release-browser-matrix.ts";
import {
  assertStrictReleaseBrowserResultSummary,
  buildReleaseBrowserResultSummary
} from "../apps/web/playwright.release-browser-result.ts";
import { isPlaywrightListOnlyInvocation } from "../apps/web/playwright.release-browser-strict-reporter.ts";
import webV1CrossBrowserConfig from "../apps/web/playwright.web-v1-cross-browser.config.ts";
import {
  REQUIRED_RELEASE_BROWSER_MATRIX,
  verifyReleaseBrowserPlaywrightConfig
} from "./verify-release-governance.mjs";
import { verifyReleaseBrowserResultSummaryBinding } from "./release-browser-result-evidence.mjs";
import {
  canonicalJson,
  collectArtifactEntries,
  computeEvidenceId,
  npmVersion,
  readBuiltReleaseMetadata,
  releaseCommandInvocation,
  relativePathWithin,
  sha256
} from "./release-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDecisions = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/web-v1-release-decisions.json"),
  "utf8"
));
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
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
  verifyReleaseBrowserPlaywrightConfig(pwaCrossBrowserConfig, {
    receiptId: "pwa",
    testMatch: "pwa-install-and-offline-cold-start.spec.ts",
    outputDirectoryName: "hakimi-bazi-pwa-cross-browser-results",
    timeout: 120_000
  });
  verifyReleaseBrowserPlaywrightConfig(webV1CrossBrowserConfig, {
    receiptId: "web-v1-flow",
    testMatch: "web-v1-continuous-flow.spec.ts",
    outputDirectoryName: "hakimi-bazi-web-v1-cross-browser-results",
    timeout: 360_000
  });
  assert.equal(pwaCrossBrowserConfig.testMatch, "pwa-install-and-offline-cold-start.spec.ts");
  assert.equal(webV1CrossBrowserConfig.testMatch, "web-v1-continuous-flow.spec.ts");
  for (const config of [pwaCrossBrowserConfig, webV1CrossBrowserConfig]) {
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
  return buildReleaseBrowserResultSummary({
    receiptId,
    fullResultStatus: "passed",
    expectedTestsPerProject: 1,
    observations: REQUIRED_RELEASE_BROWSER_MATRIX.map((browser) => ({
      projectName: browser.projectName,
      expectedStatus: "passed",
      outcome: "expected",
      resultStatuses: ["passed"]
    }))
  });
}

test("strict browser summary accepts one exact pass per branded project", () => {
  const summary = exactPassingBrowserSummary();
  assert.equal(summary.strictGatePassed, true);
  assert.doesNotThrow(() => assertStrictReleaseBrowserResultSummary(summary, "pwa"));
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

test("release receipt runner fails closed when a browser command exits zero without a strict summary", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-browser-receipt-missing-"));
  const output = path.join(root, "receipts", "pwa.json");
  const runner = path.join(workspaceRoot, "scripts/run-release-evidence-command.mjs");
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
  ], { cwd: root, encoding: "utf8", windowsHide: true });
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
  ], { cwd: root, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(await readFile(output, "utf8"));
  assert.equal(receipt.status, "passed");
  assert.equal(receipt.browserResultSummaryError, null);
  assert.equal(receipt.browserResultSummary.sha256, sha256(summaryBytes));
  assert.match(receipt.browserResultSummary.path, /^receipts\/browser-results\/pwa-/u);
  await assert.doesNotReject(() => verifyReleaseBrowserResultSummaryBinding({
    cwd: root,
    receiptsDirectory: path.join(root, "receipts"),
    receipt
  }));
});

test("release evidence policy requires the dual-browser PWA and default-v13 continuous flow commands", () => {
  assert.deepEqual(
    releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands.pwa,
    ["npm", "run", "test:e2e:pwa"]
  );
  assert.deepEqual(
    releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands["web-v1-flow"],
    ["npm", "run", "test:e2e:web-v1-flow"]
  );
  assert.equal(
    packageJson.scripts["test:e2e:pwa"],
    "playwright test --config apps/web/playwright.pwa-cross-browser.config.ts"
  );
  assert.equal(
    packageJson.scripts["test:e2e:web-v1-flow"],
    "playwright test --config apps/web/playwright.web-v1-cross-browser.config.ts"
  );
});

test("evidence paths cannot escape their declared root", () => {
  const root = path.resolve("workspace");
  assert.equal(relativePathWithin(root, path.join(root, "dist", "index.html"), "artifact"), "dist/index.html");
  assert.throws(() => relativePathWithin(root, path.resolve(root, "..", "outside"), "artifact"), /escapes/u);
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
