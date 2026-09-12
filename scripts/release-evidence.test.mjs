import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { link, lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, unlink, writeFile } from "node:fs/promises";
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
import crossSchemaConfig from "../apps/web/playwright.cross-schema-v13-v16.config.ts";
import {
  DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions,
  releaseBrowserChannelForProject
} from "../apps/web/playwright.release-browser-matrix.ts";
import {
  assertStrictReleaseBrowserResultSummary,
  buildReleaseBrowserResultSummary,
  CROSS_SCHEMA_V13_V16_RECEIPT_ID,
  CROSS_SCHEMA_V13_V16_SPEC_PATH,
  CROSS_SCHEMA_V13_V16_TEST_TITLES,
  isReleaseBrowserCompletionReceiptId,
  isReleaseBrowserReceiptId,
  REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT,
  REQUIRED_RELEASE_BROWSER_RECEIPT_IDS,
  REQUIRED_RELEASE_BROWSER_TESTS_PER_PROJECT
} from "../apps/web/playwright.release-browser-result.ts";
import ReleaseBrowserStrictReporter, {
  isPlaywrightListOnlyInvocation,
  validateCrossSchemaV13V16CompletionConfig
} from "../apps/web/playwright.release-browser-strict-reporter.ts";
import webV1CrossBrowserConfig from "../apps/web/playwright.release-web-v1-artifact.config.ts";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../apps/web/release-protocol.ts";
import {
  assertReleaseArtifactMutationBoundary,
  buildReleaseArtifactReceiptBinding,
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
  computeSourceTreeDigest,
  defaultV13ReleaseDescriptorMatches,
  npmVersion,
  isReleaseLifecycleReceiptId,
  verifyReleaseLifecyclePhaseReportBinding,
  readBuiltReleaseMetadata,
  readGitState,
  readStableRegularFileSnapshot,
  releaseArtifactComponents,
  releaseCommandInvocation,
  releaseReceiptSetMatchesPolicy,
  relativePathWithin,
  RELEASE_POLICY_PATHS,
  sha256
} from "./release-evidence-lib.mjs";
import { compileReleaseEvidenceSchema } from "./release-evidence-schema.mjs";
import { verifyReleaseEvidenceFiles } from "./verify-release-evidence.mjs";
import { verifyRollbackReleaseArtifactFiles } from "./rollback-evidence-lib.mjs";
import {
  computeDefaultLifecyclePlanDigest,
  DEFAULT_LIFECYCLE_STAGE_COMMANDS,
  resolveDefaultLifecyclePlan
} from "./formal-npm-lifecycle-closure-lib.mjs";

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
  // Directory ownership, uniqueness and refusal paths are exercised by the
  // registered release-persistent-profile behavior tests, independent of syntax.
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

function exactCrossCompletionObservations() {
  return REQUIRED_RELEASE_BROWSER_MATRIX.flatMap((browser) =>
    CROSS_SCHEMA_V13_V16_TEST_TITLES.map((title) => ({
      projectName: browser.projectName,
      title,
      file: CROSS_SCHEMA_V13_V16_SPEC_PATH,
      expectedStatus: "passed",
      outcome: "expected",
      resultStatuses: ["passed"],
      retryIndexes: [0]
    }))
  );
}

function crossCompletionSummary(observations = exactCrossCompletionObservations()) {
  return buildReleaseBrowserResultSummary({
    receiptId: CROSS_SCHEMA_V13_V16_RECEIPT_ID,
    fullResultStatus: "passed",
    expectedTestsPerProject: 13,
    observations
  });
}

// Supply the resolved fields consumed by the reporter, retaining the checked-in
// config's policy values. This does not discover or launch any browser tests.
function resolvedCrossCompletionConfig() {
  const testDir = path.join(workspaceRoot, "apps/web/e2e");
  return {
    ...crossSchemaConfig,
    configFile: path.join(workspaceRoot, "apps/web/playwright.cross-schema-v13-v16.config.ts"),
    rootDir: testDir,
    maxFailures: crossSchemaConfig.maxFailures ?? 0,
    shard: null,
    grep: /.*/,
    grepInvert: null,
    projects: crossSchemaConfig.projects.map((project) => ({
      ...project,
      use: structuredClone(project.use),
      testDir,
      testMatch: [crossSchemaConfig.testMatch],
      testIgnore: [],
      retries: crossSchemaConfig.retries,
      repeatEach: 1,
      dependencies: [],
      teardown: undefined,
      grep: /.*/,
      grepInvert: null
    }))
  };
}

async function observeCrossCompletionReporter(observations, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-cross-completion-reporter-"));
  const output = path.join(root, "synthetic-unit-summary.json");
  const keys = ["HAKIMI_RELEASE_BROWSER_RECEIPT_ID", "HAKIMI_RELEASE_BROWSER_RESULT_OUTPUT"];
  const previous = keys.map((key) => process.env[key]);
  process.env[keys[0]] = CROSS_SCHEMA_V13_V16_RECEIPT_ID;
  process.env[keys[1]] = output;
  try {
    const reporter = new ReleaseBrowserStrictReporter({
      receiptId: CROSS_SCHEMA_V13_V16_RECEIPT_ID,
      expectedTestsPerProject: 13
    });
    const tests = observations.map((entry) => ({
      title: entry.title,
      location: { file: path.join(workspaceRoot, entry.file ?? "missing-spec.ts"), line: 1, column: 1 },
      parent: { project: () => ({ name: entry.projectName }) },
      expectedStatus: entry.expectedStatus,
      retries: entry.retries ?? 0,
      repeatEachIndex: entry.repeatEachIndex ?? 0,
      annotations: entry.annotations ?? [],
      outcome: () => entry.outcome,
      results: entry.resultStatuses.map((status, index) => ({
        status,
        retry: entry.retryIndexes?.[index]
      }))
    }));
    reporter.onBegin(options.config ?? resolvedCrossCompletionConfig(), { allTests: () => tests });
    if (options.error) reporter.onError({ message: options.error });
    const result = await reporter.onEnd({ status: "passed" });
    return { result, summary: JSON.parse(await readFile(output, "utf8")) };
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
}

test("cross completion keeps the original four artifact-bound receipt ids unchanged", async () => {
  const originalCounts = { backup: 4, boot: 6, pwa: 1, "web-v1-flow": 1 };
  assert.deepEqual(REQUIRED_RELEASE_BROWSER_TESTS_PER_PROJECT, originalCounts);
  assert.deepEqual(REQUIRED_RELEASE_BROWSER_RECEIPT_IDS, Object.keys(originalCounts));
  assert.deepEqual(REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT, {
    ...originalCounts,
    [CROSS_SCHEMA_V13_V16_RECEIPT_ID]: 13
  });
  for (const id of Object.keys(originalCounts)) {
    assert.equal(isReleaseBrowserReceiptId(id), true);
    assert.equal(isReleaseBrowserCompletionReceiptId(id), true);
  }
  assert.equal(isReleaseBrowserReceiptId(CROSS_SCHEMA_V13_V16_RECEIPT_ID), false);
  assert.equal(isReleaseBrowserCompletionReceiptId(CROSS_SCHEMA_V13_V16_RECEIPT_ID), true);
  for (const id of ["unit", "cross-schema", null, 13]) {
    assert.equal(isReleaseBrowserReceiptId(id), false);
    assert.equal(isReleaseBrowserCompletionReceiptId(id), false);
  }
  const spec = await readFile(path.join(workspaceRoot, CROSS_SCHEMA_V13_V16_SPEC_PATH), "utf8");
  const declaredTitles = [...spec.matchAll(/^test\("([^"\n]+)",/gmu)].map((match) => match[1]);
  assert.equal(declaredTitles.length, 13);
  assert.deepEqual(CROSS_SCHEMA_V13_V16_TEST_TITLES, declaredTitles);
});

test("cross completion accepts all 26 exact original observations through the strict reporter", async () => {
  const observations = exactCrossCompletionObservations();
  assert.equal(observations.length, 26);
  const summary = crossCompletionSummary(observations);
  assert.equal(summary.strictGatePassed, true);
  assert.doesNotThrow(() => assertStrictReleaseBrowserResultSummary(summary, CROSS_SCHEMA_V13_V16_RECEIPT_ID));
  assert.deepEqual(summary.projects.map(({ projectName, discovered, passed, attempts }) =>
    ({ projectName, discovered, passed, attempts })), [
    { projectName: "msedge", discovered: 13, passed: 13, attempts: 13 },
    { projectName: "chrome", discovered: 13, passed: 13, attempts: 13 }
  ]);
  const observed = await observeCrossCompletionReporter(observations);
  assert.deepEqual(observed.result, { status: "passed" });
  assert.deepEqual(observed.summary, summary);
});

for (const [label, mutate] of [
  ["a missing title", (rows) => { rows.pop(); }],
  ["a duplicate replacing another title at the same count", (rows) => { rows[1].title = rows[0].title; }],
  ["an unrelated title", (rows) => { rows[0].title = "ordinary unrelated fixture"; }],
  ["a missing title field", (rows) => { delete rows[0].title; }],
  ["another spec file", (rows) => { rows[0].file = "apps/web/e2e/ordinary-other.spec.ts"; }],
  ["a missing spec file", (rows) => { delete rows[0].file; }],
  ["an unbranded project", (rows) => { rows[0].projectName = "chromium"; }],
  ["a title assigned to the wrong branded project", (rows) => { rows[0].projectName = "chrome"; }],
  ["skip", (rows) => { Object.assign(rows[0], { expectedStatus: "skipped", outcome: "skipped", resultStatuses: ["skipped"] }); }],
  ["fixme", (rows) => { Object.assign(rows[0], { expectedStatus: "skipped", outcome: "skipped", resultStatuses: ["skipped"], annotations: [{ type: "fixme", description: "unit fixture" }] }); }],
  ["expected failure", (rows) => { Object.assign(rows[0], { expectedStatus: "failed", resultStatuses: ["failed"] }); }],
  ["no result", (rows) => { Object.assign(rows[0], { resultStatuses: [], retryIndexes: [] }); }],
  ["a nonzero retry index on a single pass", (rows) => { rows[0].retryIndexes = [1]; }],
  ["missing retry indexes", (rows) => { delete rows[0].retryIndexes; }],
  ["multiple passing attempts", (rows) => { Object.assign(rows[0], { resultStatuses: ["passed", "passed"], retryIndexes: [0, 1] }); }],
  ["flaky recovery", (rows) => { Object.assign(rows[0], { outcome: "flaky", resultStatuses: ["failed", "passed"], retryIndexes: [0, 1] }); }]
]) {
  test(`cross completion rejects ${label}`, async () => {
    const observations = exactCrossCompletionObservations();
    mutate(observations);
    const summary = crossCompletionSummary(observations);
    assert.equal(summary.strictGatePassed, false);
    assert.throws(() => assertStrictReleaseBrowserResultSummary(summary, CROSS_SCHEMA_V13_V16_RECEIPT_ID), /strict matrix gate/u);
    const observed = await observeCrossCompletionReporter(observations);
    assert.deepEqual(observed.result, { status: "failed" });
    assert.equal(observed.summary.strictGatePassed, false);
  });
}

test("cross completion rejects reporter onError even when all 26 observations pass", async () => {
  const error = "Ordinary setup failure fixture";
  const observed = await observeCrossCompletionReporter(exactCrossCompletionObservations(), { error });
  assert.deepEqual(observed.result, { status: "failed" });
  assert.equal(observed.summary.strictGatePassed, false);
  assert.deepEqual(observed.summary.errors, [error]);
});

test("cross completion rejects per-test retry and repeat configuration", async () => {
  for (const drift of [{ retries: 1 }, { repeatEachIndex: 1 }]) {
    const observations = exactCrossCompletionObservations();
    Object.assign(observations[0], drift);
    const observed = await observeCrossCompletionReporter(observations);
    assert.deepEqual(observed.result, { status: "failed" });
    assert.equal(observed.summary.strictGatePassed, false);
    assert.ok(observed.summary.errors.length > 0);
  }
});

test("cross completion requires the full unfiltered canonical execution configuration", async () => {
  assert.deepEqual(validateCrossSchemaV13V16CompletionConfig(resolvedCrossCompletionConfig()), []);
  for (const [label, mutate] of [
    ["alternate config", (config) => { config.configFile = path.join(workspaceRoot, "other.config.ts"); }],
    ["alternate root", (config) => { config.rootDir = workspaceRoot; }],
    ["workers", (config) => { config.workers = 2; }],
    ["parallel", (config) => { config.fullyParallel = true; }],
    ["only allowed", (config) => { config.forbidOnly = false; }],
    ["flaky allowed", (config) => { config.failOnFlakyTests = false; }],
    ["early stop", (config) => { config.maxFailures = 1; }],
    ["shard", (config) => { config.shard = { current: 1, total: 2 }; }],
    ["title filter", (config) => { config.grep = /clean/; }],
    ["grep flags", (config) => { config.grep = /.*/i; }],
    ["inverse filter", (config) => { config.grepInvert = /clean/; }],
    ["one project", (config) => { config.projects.pop(); }],
    ["duplicate project", (config) => { config.projects[1] = config.projects[0]; }],
    ["wrong channel", (config) => { config.projects[0].use.channel = "chrome"; }],
    ["retry", (config) => { config.projects[0].retries = 1; }],
    ["repeat", (config) => { config.projects[0].repeatEach = 2; }],
    ["dependency", (config) => { config.projects[0].dependencies = ["setup"]; }],
    ["teardown", (config) => { config.projects[0].teardown = "cleanup"; }],
    ["test directory", (config) => { config.projects[0].testDir = workspaceRoot; }],
    ["different spec", (config) => { config.projects[0].testMatch = ["other.spec.ts"]; }],
    ["extra spec", (config) => { config.projects[0].testMatch.push("other.spec.ts"); }],
    ["ignored spec", (config) => { config.projects[0].testIgnore = ["*.spec.ts"]; }],
    ["project filter", (config) => { config.projects[0].grep = /clean/; }],
    ["project inverse filter", (config) => { config.projects[0].grepInvert = /clean/; }]
  ]) {
    const config = resolvedCrossCompletionConfig();
    mutate(config);
    assert.ok(validateCrossSchemaV13V16CompletionConfig(config).length > 0, label);
  }
  const config = resolvedCrossCompletionConfig();
  config.grep = /clean/;
  const observed = await observeCrossCompletionReporter(exactCrossCompletionObservations(), { config });
  assert.deepEqual(observed.result, { status: "failed" });
  assert.ok(observed.summary.errors.some((error) => error.includes("title filters")));
});

test("cross completion rejects explicit CLI selection even if resolved config looks complete", () => {
  for (const option of [
    "--grep", "-g", "--grep-invert", "-G", "--project", "--shard", "--last-failed",
    "--only-changed", "--test-list", "--test-list-invert", "--repeat-each"
  ]) {
    for (const argv of [[option, "ordinary-fixture"], [`${option}=ordinary-fixture`]]) {
      assert.ok(validateCrossSchemaV13V16CompletionConfig(resolvedCrossCompletionConfig(), argv).length > 0, argv.join(" "));
      const config = resolvedCrossCompletionConfig();
      config.argv = argv;
      assert.ok(validateCrossSchemaV13V16CompletionConfig(config, []).length > 0, argv.join(" "));
    }
  }
});

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

test("cross completion binding accepts a strict summary without a dist artifact binding", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-cross-completion-binding-"));
  const receiptsDirectory = path.join(root, "receipts");
  const summaryPath = path.join(receiptsDirectory, "browser-results", "synthetic-unit-summary.json");
  await mkdir(path.dirname(summaryPath), { recursive: true });
  const summary = crossCompletionSummary();
  const bytes = Buffer.from(`${JSON.stringify(summary)}\n`, "utf8");
  await writeFile(summaryPath, bytes);
  const receipt = {
    id: CROSS_SCHEMA_V13_V16_RECEIPT_ID,
    browserResultSummaryError: null,
    browserResultSummary: {
      path: path.relative(root, summaryPath).replaceAll("\\", "/"),
      sha256: sha256(bytes),
      summary
    },
    artifactIdentityBinding: null,
    artifactIdentityBindingError: null
  };
  const verify = (candidate) => verifyReleaseBrowserResultSummaryBinding({
    cwd: root, receiptsDirectory, receipt: candidate
  });
  assert.deepEqual(await verify(receipt), receipt.browserResultSummary);
  await assert.rejects(verify({ ...receipt, browserResultSummary: null }), /binding is malformed/u);
  await assert.rejects(verify({ ...receipt, browserResultSummaryError: "Ordinary read error" }), /summary failed/u);
  await assert.rejects(verify({
    ...receipt,
    browserResultSummary: { ...receipt.browserResultSummary, path: "receipts/browser-results/missing.json" }
  }), /ENOENT/u);
  await assert.rejects(verify({
    ...receipt,
    browserResultSummary: { ...receipt.browserResultSummary, sha256: "0".repeat(64) }
  }), /digest mismatch/u);
  await assert.rejects(verify({
    ...receipt,
    browserResultSummary: {
      ...receipt.browserResultSummary,
      summary: { ...summary, expectedTestsPerProject: 12 }
    }
  }), /embedded summary mismatch/u);
  const invalidSummary = { ...summary, strictGatePassed: false };
  const invalidBytes = Buffer.from(`${JSON.stringify(invalidSummary)}\n`);
  await writeFile(summaryPath, invalidBytes);
  await assert.rejects(verify({
    ...receipt,
    browserResultSummary: {
      ...receipt.browserResultSummary,
      sha256: sha256(invalidBytes),
      summary: invalidSummary
    }
  }), /strict matrix gate/u);
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

function unitBrowserSummaryWriter(bytes) {
  return [
    "const fs=require('node:fs');",
    "const path=require('node:path');",
    "const output=process.env.HAKIMI_RELEASE_BROWSER_RESULT_OUTPUT;",
    "fs.mkdirSync(path.dirname(output),{recursive:true});",
    `fs.writeFileSync(output,Buffer.from('${bytes.toString("base64")}','base64'));`
  ].join("");
}

async function runSyntheticBrowserReceipt(receiptId, writer, evidenceId = null) {
  // These are ordinary child-command unit fixtures in a fresh temp cwd. They
  // never run Playwright or create evidence for an actual release candidate.
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-cross-completion-unit-runner-"));
  const output = path.join(root, "receipts", `${receiptId}.json`);
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("HAKIMI_RELEASE_") || key.startsWith("HAKIMI_DB_")) delete env[key];
  }
  if (evidenceId !== null) env.HAKIMI_RELEASE_EVIDENCE_ID = evidenceId;
  const result = spawnSync(process.execPath, [
    path.join(workspaceRoot, "scripts/run-release-evidence-command.mjs"),
    "--id", receiptId, "--output", output, "--", process.execPath, "-e", writer
  ], { cwd: root, encoding: "utf8", windowsHide: true, env });
  assert.equal(result.error, undefined);
  return { root, result, receipt: JSON.parse(await readFile(output, "utf8")) };
}

test("cross completion runner binds all 26 unit results without default-v13 artifact files", async () => {
  const summary = crossCompletionSummary();
  const bytes = Buffer.from(`${JSON.stringify(summary)}\n`);
  for (const evidenceId of [null, `hre1-${"9".repeat(32)}`]) {
    const { root, result, receipt } = await runSyntheticBrowserReceipt(
      CROSS_SCHEMA_V13_V16_RECEIPT_ID, unitBrowserSummaryWriter(bytes), evidenceId
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(receipt.status, "passed");
    assert.equal(receipt.exitCode, 0);
    assert.equal(receipt.evidenceId, evidenceId);
    assert.equal(receipt.artifactIdentityBinding, null);
    assert.equal(receipt.artifactIdentityBindingError, null);
    assert.equal(receipt.browserResultSummaryError, null);
    assert.equal(receipt.browserResultSummary.sha256, sha256(bytes));
    assert.deepEqual(receipt.browserResultSummary.summary, summary);
    assert.match(receipt.browserResultSummary.path, /^receipts\/browser-results\/cross-schema-v13-v16-/u);
    await assert.rejects(readFile(path.join(root, "tmp/release-artifact-identity.json")), /ENOENT/u);
    await assert.rejects(readFile(path.join(root, "dist/web/index.html")), /ENOENT/u);
    await assert.doesNotReject(() => verifyReleaseBrowserResultSummaryBinding({
      cwd: root, receiptsDirectory: path.join(root, "receipts"), receipt
    }));
  }
});

for (const [label, bytes, error] of [
  ["missing summary", null, /ENOENT/u],
  ["invalid JSON summary", Buffer.from("ordinary incomplete JSON"), /JSON|Unexpected/u],
  ["incomplete matrix summary", Buffer.from(JSON.stringify(crossCompletionSummary(exactCrossCompletionObservations().slice(1)))), /strict matrix gate/u],
  ["another receipt summary", Buffer.from(JSON.stringify(exactPassingBrowserSummary())), /strict matrix gate/u]
]) {
  test(`cross completion runner rejects exit zero with ${label}`, async () => {
    const { result, receipt } = await runSyntheticBrowserReceipt(
      CROSS_SCHEMA_V13_V16_RECEIPT_ID,
      bytes === null ? "process.exit(0)" : unitBrowserSummaryWriter(bytes)
    );
    assert.equal(result.status, 1);
    assert.equal(receipt.exitCode, 0);
    assert.equal(receipt.status, "failed");
    assert.equal(receipt.browserResultSummary, null);
    assert.match(receipt.browserResultSummaryError, error);
    assert.equal(receipt.artifactIdentityBinding, null);
    assert.equal(receipt.artifactIdentityBindingError, null);
  });
}

test("cross completion does not let the original four receipts omit artifact identity", async () => {
  for (const id of REQUIRED_RELEASE_BROWSER_RECEIPT_IDS) {
    const bytes = Buffer.from(JSON.stringify(exactPassingBrowserSummary(id)));
    const { result, receipt } = await runSyntheticBrowserReceipt(id, unitBrowserSummaryWriter(bytes));
    assert.equal(result.status, 1, id);
    assert.equal(receipt.status, "failed", id);
    assert.equal(receipt.exitCode, null, id);
    assert.equal(receipt.artifactIdentityBinding, null, id);
    assert.match(receipt.artifactIdentityBindingError, /require HAKIMI_RELEASE_EVIDENCE_ID/u, id);
    assert.equal(receipt.browserResultSummary, null, id);
  }
});

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

test("cross completion summary fits the closed evidence schema without extending the artifact boundary", () => {
  const validator = compileReleaseEvidenceSchema(releaseEvidenceSchema);
  const fixture = validReleaseEvidenceFixture();
  fixture.release.requiredReceiptIds = [CROSS_SCHEMA_V13_V16_RECEIPT_ID];
  const receipt = fixture.testReceipts[0];
  receipt.id = CROSS_SCHEMA_V13_V16_RECEIPT_ID;
  receipt.command = ["npm", "run", "test:e2e:cross-schema-v13-v16"];
  receipt.browserResultSummary.summary = structuredClone(crossCompletionSummary());
  validator.assert(fixture);
  assert.deepEqual(fixture.artifacts.mutationBoundary.coveredReceiptIds, REQUIRED_RELEASE_BROWSER_RECEIPT_IDS);
  const wrongCount = structuredClone(fixture);
  wrongCount.testReceipts[0].browserResultSummary.summary.expectedTestsPerProject = 14;
  assert.throws(() => validator.assert(wrongCount), /Release Evidence Schema validation failed/u);
  const extraField = structuredClone(fixture);
  extraField.testReceipts[0].browserResultSummary.summary.unrecordedClaims = true;
  assert.throws(() => validator.assert(extraField), /Release Evidence Schema validation failed/u);
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

async function writeBoundDefaultV13Artifact(root, evidenceId, descriptor = {
    dbGeneration: "legacy-v13",
    databaseName: "hakimi-bazi-research",
    targetSchema: 13,
    migrationId: null
  }) {
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

async function lifecycleReceiptFixture(context, stage = "typecheck", ownedLayout = null) {
  // Ordinary file/data fixture only: no lifecycle command or program is run.
  const root = ownedLayout?.root ?? await mkdtemp(path.join(os.tmpdir(), "hakimi-lifecycle-receipt-unit-"));
  if (ownedLayout === null) context.after(() => rm(root, { recursive: true, force: true }));
  const contexts = [];
  const packageIdentities = [];
  for (const relativePath of ["package.json", "apps/web/package.json"]) {
    const bytes = await readFile(path.join(workspaceRoot, relativePath));
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    contexts.push({ path: relativePath, packageJson: JSON.parse(bytes.toString("utf8")) });
    packageIdentities.push({ path: relativePath, rawBytes: bytes.length, rawSha256: sha256(bytes) });
  }
  const plan = resolveDefaultLifecyclePlan(stage, { root: contexts[0], web: contexts[1] });
  const runId = "11111111-1111-4111-8111-111111111111";
  const report = {
    schemaVersion: 1, recordType: "default_npm_lifecycle_phase_report",
    stage, originalCommand: [...plan.originalCommand], runId, receiptId: plan.receiptId,
    packageIdentities, planDigest: computeDefaultLifecyclePlanDigest(plan),
    startedAt: "2026-09-07T00:00:01.000Z",
    completedAt: "2026-09-07T00:00:09.000Z", terminal: true,
    authorization: { status: "allowed", blockers: [] },
    phases: plan.steps.map((step, index) => ({
      id: step.id, required: step.required,
      status: step.kind === "none" ? step.absentStatus : "passed",
      started: step.kind !== "none", exitCode: step.kind === "none" ? null : 0,
      signal: null, error: null,
      startedAt: step.kind === "none" ? null : "2026-09-07T00:00:0" + (index + 2) + ".000Z",
      completedAt: step.kind === "none" ? null : "2026-09-07T00:00:0" + (index + 2) + ".500Z"
    })),
    programStarted: true, aggregateExitCode: 0, status: "passed"
  };
  const receiptsDirectory = path.join(root, ownedLayout?.receiptsRelativePath ?? "receipts");
  const reportPath = path.join(receiptsDirectory, ".lifecycle-" + plan.receiptId + "-" + runId, "terminal.json");
  await mkdir(path.dirname(reportPath), { recursive: true });
  const receipt = {
    id: plan.receiptId, command: [...plan.originalCommand],
    startedAt: "2026-09-07T00:00:00.000Z", completedAt: "2026-09-07T00:00:10.000Z",
    status: "passed", exitCode: 0, signal: null, launchErrorCode: null,
    lifecycleRunId: runId,
    lifecyclePhaseReport: { path: relativePathWithin(root, reportPath, "Unit phase report"), sha256: "" },
    lifecyclePhaseReportError: null, programStarted: true
  };
  const writeReport = async () => {
    const bytes = Buffer.from(JSON.stringify(report) + "\n", "utf8");
    await writeFile(reportPath, bytes);
    receipt.lifecyclePhaseReport.sha256 = sha256(bytes);
  };
  await writeReport();
  return {
    root, receiptsDirectory, reportPath, plan, report, receipt, writeReport,
    verify: () => verifyReleaseLifecyclePhaseReportBinding({ cwd: root, receiptsDirectory, receipt })
  };
}

test("lifecycle receipts retain the original thirteen commands and require reports for exactly three ids", async () => {
  const policy = releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands;
  assert.equal(Object.keys(policy).length, 13);
  assert.deepEqual(Object.keys(policy).filter(isReleaseLifecycleReceiptId).sort(), ["build", "typecheck", "unit"]);
  for (const identity of Object.values(DEFAULT_LIFECYCLE_STAGE_COMMANDS)) {
    assert.deepEqual(policy[identity.receiptId], identity.originalCommand);
  }
  const otherIds = Object.keys(policy).filter((id) => !isReleaseLifecycleReceiptId(id));
  assert.equal(otherIds.length, 10);
  for (const id of otherIds) {
    assert.equal(await verifyReleaseLifecyclePhaseReportBinding({ receipt: { id } }), null);
    assert.equal(await verifyReleaseLifecyclePhaseReportBinding({ receipt: {
      id, lifecycleRunId: null, lifecyclePhaseReport: null, lifecyclePhaseReportError: null,
      programStarted: null
    } }), null);
    await assert.rejects(verifyReleaseLifecyclePhaseReportBinding({ receipt: {
      id, lifecycleRunId: "11111111-1111-4111-8111-111111111111"
    } }), /Non-lifecycle receipt contains lifecycle result data/u);
  }
});

for (const stage of ["typecheck", "vitest", "build"]) {
  test("lifecycle receipts bind the complete terminal " + stage + " report to actual package bytes", async (context) => {
    const fixture = await lifecycleReceiptFixture(context, stage);
    const verified = await fixture.verify();
    assert.equal(verified.path, fixture.receipt.lifecyclePhaseReport.path);
    assert.equal(verified.sha256, fixture.receipt.lifecyclePhaseReport.sha256);
    assert.deepEqual(verified.report, fixture.report);
    assert.equal(verified.report.programStarted, true);
    assert.equal(verified.report.aggregateExitCode, 0);
  });
}

test("lifecycle receipts preserve a program pass after governance failure as an aggregate failure", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  Object.assign(fixture.report.phases[0], { status: "failed", exitCode: 1 });
  Object.assign(fixture.report, { status: "failed", aggregateExitCode: 1 });
  Object.assign(fixture.receipt, { status: "failed", exitCode: 1 });
  await fixture.writeReport();
  const verified = await fixture.verify();
  assert.equal(verified.report.phases[0].status, "failed");
  assert.equal(verified.report.phases[2].status, "passed");
  assert.equal(verified.report.programStarted, true);
  assert.equal(verified.report.status, "failed");
});

for (const started of [null, true, false]) {
  test("lifecycle receipts retain an unknown program result with started " + started + " without promoting it", async (context) => {
    const fixture = await lifecycleReceiptFixture(context);
    Object.assign(fixture.report.phases[2], {
      status: "unknown", started, exitCode: null, error: "Ordinary synthetic unknown execution result"
    });
    Object.assign(fixture.report, { status: "failed", aggregateExitCode: 1, programStarted: started });
    Object.assign(fixture.receipt, { status: "failed", exitCode: 1, programStarted: started });
    await fixture.writeReport();
    const verified = await fixture.verify();
    assert.equal(verified.report.programStarted, started);
    assert.equal(verified.report.phases[2].status, "unknown");
    assert.equal(verified.report.aggregateExitCode, 1);
  });
}

test("lifecycle receipts distinguish an explicit launch failure from an unknown program result", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  Object.assign(fixture.report.phases[2], {
    status: "failed", started: false, exitCode: null, error: "Ordinary synthetic launch error"
  });
  Object.assign(fixture.report, { status: "failed", aggregateExitCode: 1, programStarted: false });
  Object.assign(fixture.receipt, { status: "failed", exitCode: 1, programStarted: false });
  await fixture.writeReport();
  assert.equal((await fixture.verify()).report.phases[2].status, "failed");
});

test("lifecycle receipts retain a signaled program termination as a failed aggregate", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  Object.assign(fixture.report.phases[2], { status: "failed", exitCode: null, signal: "SIGTERM" });
  Object.assign(fixture.report, { status: "failed", aggregateExitCode: 1 });
  Object.assign(fixture.receipt, { status: "failed", exitCode: 1 });
  await fixture.writeReport();
  assert.equal((await fixture.verify()).report.programStarted, true);
});

test("lifecycle receipts retain an authorized build precondition failure with a blocked program", async (context) => {
  const fixture = await lifecycleReceiptFixture(context, "build");
  Object.assign(fixture.report.phases[1], { status: "failed", exitCode: 1 });
  Object.assign(fixture.report.phases[2], {
    status: "blocked", started: false, exitCode: null, error: "Workspace prebuild did not pass",
    startedAt: null, completedAt: null
  });
  Object.assign(fixture.report, { status: "failed", aggregateExitCode: 1, programStarted: false });
  Object.assign(fixture.receipt, { status: "failed", exitCode: 1, programStarted: false });
  await fixture.writeReport();
  const verified = await fixture.verify();
  assert.equal(verified.report.phases[2].status, "blocked");
  assert.equal(verified.report.programStarted, false);
});

test("lifecycle receipts bind an explicit authorization block without claiming program execution", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  fixture.report.authorization = { status: "blocked", blockers: [{ blockerId: "ordinary-unit-blocker" }] };
  for (const phase of fixture.report.phases.filter((entry) => entry.required)) {
    Object.assign(phase, {
      status: "blocked", started: false, exitCode: null, error: "Authorization blocked",
      startedAt: null, completedAt: null
    });
  }
  Object.assign(fixture.report, { status: "blocked", aggregateExitCode: 2, programStarted: false });
  Object.assign(fixture.receipt, { status: "failed", exitCode: 2, programStarted: false });
  await fixture.writeReport();
  assert.equal((await fixture.verify()).report.status, "blocked");
});

const lifecycleReportDrifts = [
  ["old run", (f) => { f.report.runId = "22222222-2222-4222-8222-222222222222"; }, /run, stage or original command binding mismatch/u],
  ["wrong receipt", (f) => { f.report.receiptId = "unit"; }, /run, stage or original command binding mismatch/u],
  ["wrong stage", (f) => { f.report.stage = "vitest"; }, /run, stage or original command binding mismatch/u],
  ["changed original command", (f) => { f.report.originalCommand.push("--if-present"); }, /run, stage or original command binding mismatch/u],
  ["changed outer command", (f) => { f.receipt.command = ["npm", "run", "diagnose:typecheck"]; }, /run, stage or original command binding mismatch/u],
  ["old plan", (f) => { f.report.planDigest = "0".repeat(64); }, /current fixed plan or package identities mismatch/u],
  ["wrong root package identity", (f) => { f.report.packageIdentities[0].rawSha256 = "0".repeat(64); }, /current fixed plan or package identities mismatch/u],
  ["wrong web package identity", (f) => { f.report.packageIdentities[1].rawBytes += 1; }, /current fixed plan or package identities mismatch/u],
  ["missing phase", (f) => { f.report.phases.pop(); }, /complete fixed phase inventory is required/u],
  ["duplicate phase", (f) => { f.report.phases[1] = structuredClone(f.report.phases[0]); }, /phase shape or fixed order is invalid/u],
  ["weakened required phase", (f) => { f.report.phases[2].required = false; }, /phase shape or fixed order is invalid/u],
  ["nonterminal report", (f) => { f.report.terminal = false; }, /terminal report shape is invalid/u],
  ["missing terminal field", (f) => { delete f.report.completedAt; }, /terminal report shape is invalid/u],
  ["phase outside run interval", (f) => { f.report.phases[2].completedAt = "2026-09-07T00:00:11.000Z"; }, /attempted phase time interval is invalid/u],
  ["report outside receipt interval", (f) => { f.report.completedAt = "2026-09-07T00:00:11.000Z"; }, /terminal report time interval is invalid/u],
  ["unstarted pass", (f) => { f.report.phases[2].started = false; }, /phase execution facts and status contradict/u],
  ["unknown promoted to pass", (f) => { Object.assign(f.report.phases[2], { status: "unknown", started: null, exitCode: null }); }, /program, aggregate or outer receipt terminal state contradicts/u],
  ["program start contradiction", (f) => { f.report.programStarted = false; }, /program, aggregate or outer receipt terminal state contradicts/u],
  ["outer program start contradiction", (f) => { f.receipt.programStarted = false; }, /program, aggregate or outer receipt terminal state contradicts/u],
  ["outer exit contradiction", (f) => { f.receipt.exitCode = 1; }, /program, aggregate or outer receipt terminal state contradicts/u],
  ["outer status contradiction", (f) => { f.receipt.status = "failed"; }, /program, aggregate or outer receipt terminal state contradicts/u],
  ["aggregate contradiction", (f) => { f.report.aggregateExitCode = 1; }, /program, aggregate or outer receipt terminal state contradicts/u],
  ["authorization contradiction", (f) => { f.report.authorization.blockers.push({ blockerId: "unit" }); }, /authorization terminal state is invalid/u],
  ["invented absent phase execution", (f) => { f.report.phases[3].started = true; }, /absent or blocked phase claims execution/u],
  ["outer wrapper signal", (f) => { f.receipt.signal = "SIGTERM"; }, /program, aggregate or outer receipt terminal state contradicts/u]
];
for (const [label, mutate, expectedError] of lifecycleReportDrifts) {
  test("lifecycle receipts reject " + label, async (context) => {
    const fixture = await lifecycleReceiptFixture(context);
    mutate(fixture);
    await fixture.writeReport();
    await assert.rejects(fixture.verify(), expectedError);
  });
}

test("lifecycle receipts require a fresh stable report instead of inferring a missing program start", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  fixture.receipt.lifecyclePhaseReport = null;
  fixture.receipt.programStarted = null;
  await assert.rejects(fixture.verify(), /phase report binding is malformed/u);
  fixture.receipt.lifecyclePhaseReport = {
    path: relativePathWithin(fixture.root, path.join(fixture.receiptsDirectory, "missing.json"), "Missing unit report"),
    sha256: "0".repeat(64)
  };
  await assert.rejects(fixture.verify(), /ENOENT/u);
});

test("lifecycle receipts reject report errors and noncanonical run identities", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  fixture.receipt.lifecyclePhaseReportError = "Ordinary synthetic report error";
  await assert.rejects(fixture.verify(), /run id or report error state is invalid/u);
  fixture.receipt.lifecyclePhaseReportError = null;
  fixture.receipt.lifecycleRunId = "not-a-run-id";
  await assert.rejects(fixture.verify(), /run id or report error state is invalid/u);
});

test("lifecycle receipts reject changed report bytes and a truncated JSON document", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  await writeFile(fixture.reportPath, "{}\n");
  await assert.rejects(fixture.verify(), /phase report digest mismatch/u);
  const truncated = Buffer.from('{"terminal":', "utf8");
  await writeFile(fixture.reportPath, truncated);
  fixture.receipt.lifecyclePhaseReport.sha256 = sha256(truncated);
  await assert.rejects(fixture.verify(), SyntaxError);
});

test("lifecycle receipts require canonical report containment without reading another directory", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  fixture.receipt.lifecyclePhaseReport.path = "outside.json";
  await assert.rejects(fixture.verify(), /escapes its required root/u);
  fixture.receipt.lifecyclePhaseReport.path = "./" + relativePathWithin(fixture.root, fixture.reportPath, "Unit report");
  await assert.rejects(fixture.verify(), /phase report path is not canonical/u);
});

for (const relativePath of ["package.json", "apps/web/package.json"]) {
  test("lifecycle receipts reread actual " + relativePath + " bytes rather than accepting report identities", async (context) => {
    const fixture = await lifecycleReceiptFixture(context);
    const file = path.join(fixture.root, relativePath);
    await writeFile(file, Buffer.concat([await readFile(file), Buffer.from("\n")]));
    await assert.rejects(fixture.verify(), /current fixed plan or package identities mismatch/u);
  });
}

test("lifecycle receipts reject unmodeled current package hooks even with recomputed raw identities", async (context) => {
  const fixture = await lifecycleReceiptFixture(context);
  const file = path.join(fixture.root, "package.json");
  const packageJson = JSON.parse(await readFile(file, "utf8"));
  packageJson.scripts.pretypecheck = "ordinary-unmodeled-hook";
  const bytes = Buffer.from(JSON.stringify(packageJson) + "\n", "utf8");
  await writeFile(file, bytes);
  Object.assign(fixture.report.packageIdentities[0], { rawBytes: bytes.length, rawSha256: sha256(bytes) });
  await fixture.writeReport();
  await assert.rejects(fixture.verify(), /Default lifecycle command or root pre\/post hook changed/u);
});

// These are SYNTHETIC file-consumer contracts, not records of release commands,
// browser execution, deployment, or rollback. Only the production generator and
// file readers execute; their bound command/report inputs are ordinary test data.
const replayInputPath = "dist/web/release-evidence.json";
const replayReceiptsPath = "tmp/release-evidence-receipts";
const replayLockPath = "tmp/release-artifact-identity.json";

function replayChildEnvironment() {
  const names = [
    "SystemRoot", "WINDIR", "ComSpec", "PATH", "PATHEXT", "TEMP", "TMP",
    "USERPROFILE", "APPDATA", "LOCALAPPDATA", "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMW6432"
  ];
  return Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    names.some((name) => name.toLowerCase() === key.toLowerCase())
  ));
}

function replayCommand(cwd, executable, args) {
  return spawnSync(executable, args, {
    cwd, env: replayChildEnvironment(), encoding: "utf8", windowsHide: true,
    timeout: 60_000, maxBuffer: 4 * 1024 * 1024
  });
}

function requireReplayCommand(result) {
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
  return result;
}

async function ownedReplayDirectory(context) {
  const tempRoot = path.resolve(os.tmpdir());
  const root = path.resolve(await mkdtemp(path.join(tempRoot, "hfr-")));
  const owned = await lstat(root, { bigint: true });
  const physicalRoot = await realpath(root);
  const physicalTemp = await realpath(tempRoot);
  assert.ok(relativePathWithin(tempRoot, root, "Replay fixture root"));
  assert.ok(relativePathWithin(physicalTemp, physicalRoot, "Physical replay fixture root"));
  assert.equal(owned.isDirectory(), true);
  assert.equal(owned.isSymbolicLink(), false);
  assert.notEqual(owned.ino, 0n);
  context.after(async () => {
    const current = await lstat(root, { bigint: true });
    assert.ok(relativePathWithin(tempRoot, root, "Replay cleanup root"));
    assert.equal(await realpath(root), physicalRoot);
    assert.equal(current.isDirectory(), true);
    assert.equal(current.isSymbolicLink(), false);
    assert.equal(current.dev, owned.dev);
    assert.equal(current.ino, owned.ino);
    // Only remove this exact owned tree, after checking every remaining entry.
    async function inspect(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        const stat = await lstat(file);
        assert.equal(stat.isSymbolicLink(), false);
        assert.ok(relativePathWithin(physicalRoot, await realpath(file), "Replay cleanup entry"));
        if (stat.isDirectory()) await inspect(file);
        else assert.equal(stat.isFile(), true);
      }
    }
    await inspect(root);
    await rm(root, { recursive: true, force: false });
  });
  return root;
}

async function writeReplayJson(file, value) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return bytes;
}

async function writeReplayEvidence(root, evidence) {
  const bytes = await writeReplayJson(path.join(root, replayInputPath), evidence);
  await writeFile(path.join(root, replayInputPath + ".sha256"),
    sha256(bytes) + "  release-evidence.json\n", "utf8");
}

async function releaseFileReplayFixture(context, { dirty = false } = {}) {
  const ownedRoot = await ownedReplayDirectory(context);
  const sourceRoot = path.join(ownedRoot, "source");
  const archiveRoots = [path.join(ownedRoot, "archive-a"), path.join(ownedRoot, "archive-b")];
  await mkdir(sourceRoot);
  const sourceFiles = ["package.json", "apps/web/package.json", "package-lock.json", ...RELEASE_POLICY_PATHS];
  for (const relativePath of sourceFiles) {
    const file = path.join(sourceRoot, relativePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await readFile(path.join(workspaceRoot, relativePath)), { flag: "wx" });
  }
  await writeFile(path.join(sourceRoot, "SYNTHETIC.txt"),
    "SYNTHETIC file replay contract. No release commands or browsers ran.\n", { flag: "wx" });
  const hooksRoot = path.join(ownedRoot, "empty-hooks");
  await mkdir(hooksRoot);
  requireReplayCommand(replayCommand(sourceRoot, "git", [
    "-c", "init.templateDir=", "init", "--initial-branch=synthetic-file-contract"
  ]));
  requireReplayCommand(replayCommand(sourceRoot, "git", ["config", "--local", "core.autocrlf", "false"]));
  requireReplayCommand(replayCommand(sourceRoot, "git", ["-c", "core.autocrlf=false", "add", "--", ...sourceFiles, "SYNTHETIC.txt"]));
  requireReplayCommand(replayCommand(sourceRoot, "git", [
    "-c", "user.name=SYNTHETIC Contract Fixture", "-c", "user.email=synthetic@invalid.example",
    "-c", "commit.gpgSign=false", "-c", "core.hooksPath=" + hooksRoot,
    "commit", "--no-verify", "-m", "SYNTHETIC local file-consumer fixture"
  ]));
  if (dirty) await writeFile(path.join(sourceRoot, "SYNTHETIC.txt"), "SYNTHETIC dirty diagnostic fixture.\n");
  const git = readGitState(sourceRoot);
  assert.equal(git.dirty, dirty);
  const evidenceId = computeEvidenceId({
    gitCommit: git.commit,
    sourceTreeDigest: await computeSourceTreeDigest(sourceRoot),
    lockfileDigest: sha256(await readFile(path.join(sourceRoot, "package-lock.json"))),
    channel: "default-v13"
  });
  const dist = path.join(sourceRoot, "dist/web");
  await writeBoundDefaultV13Artifact(dist, evidenceId, BRIDGE_RELEASE_DATABASE_DESCRIPTOR);
  await writeReleaseArtifactIdentityLock({
    cwd: sourceRoot, dist, lockPath: path.join(sourceRoot, replayLockPath),
    channel: "default-v13", evidenceId, createdAt: "2026-09-07T00:00:00.000Z"
  });
  const artifactIdentity = await verifyReleaseArtifactIdentityLock({
    cwd: sourceRoot, dist, lockPath: path.join(sourceRoot, replayLockPath), evidenceId
  });
  const endpointBinding = buildReleaseArtifactReceiptBinding({
    beforeCommand: artifactIdentity, afterCommand: artifactIdentity
  });
  const rawReceipts = new Map();
  const receiptPaths = [];
  const phasePaths = [];
  const summaryPaths = [];
  const lifecycleStages = { typecheck: "typecheck", unit: "vitest", build: "build" };
  for (const [id, command] of Object.entries(releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands)) {
    const raw = {
      schemaVersion: 1, receiptType: "release_test_command", id, evidenceId,
      command: [...command], status: "passed", exitCode: 0,
      startedAt: "2026-09-07T00:00:00.000Z", completedAt: "2026-09-07T00:00:10.000Z",
      durationMs: 10_000, signal: null, launchErrorCode: null,
      lifecycleRunId: null, lifecyclePhaseReport: null, lifecyclePhaseReportError: null,
      programStarted: null, browserResultSummary: null, browserResultSummaryError: null,
      artifactIdentityBinding: null, artifactIdentityBindingError: null
    };
    if (isReleaseLifecycleReceiptId(id)) {
      const lifecycle = await lifecycleReceiptFixture(context, lifecycleStages[id], {
        root: sourceRoot, receiptsRelativePath: replayReceiptsPath
      });
      Object.assign(raw, lifecycle.receipt);
      phasePaths.push(raw.lifecyclePhaseReport.path);
    }
    if (isReleaseBrowserCompletionReceiptId(id)) {
      const summary = id === CROSS_SCHEMA_V13_V16_RECEIPT_ID
        ? crossCompletionSummary() : exactPassingBrowserSummary(id);
      const summaryPath = replayReceiptsPath + "/summaries/" + id + ".json";
      const bytes = await writeReplayJson(path.join(sourceRoot, summaryPath), summary);
      raw.browserResultSummary = { path: summaryPath, sha256: sha256(bytes), summary };
      summaryPaths.push(summaryPath);
    }
    if (isReleaseBrowserReceiptId(id)) raw.artifactIdentityBinding = endpointBinding;
    const receiptPath = replayReceiptsPath + "/" + id + ".json";
    await writeReplayJson(path.join(sourceRoot, receiptPath), raw);
    rawReceipts.set(id, raw);
    receiptPaths.push(receiptPath);
  }
  const generated = requireReplayCommand(replayCommand(sourceRoot, process.execPath, [
    path.join(workspaceRoot, "scripts/generate-release-evidence.mjs"),
    "--release-label", "SYNTHETIC-file-consumer-contract",
    ...(dirty ? ["--allow-dirty"] : [])
  ]));
  assert.equal(JSON.parse(generated.stdout).evidenceId, evidenceId);
  const boundPaths = [
    "dist/web/index.html", "dist/web/manifest.webmanifest", "dist/web/sw.js", "dist/web/_headers",
    replayLockPath, ...receiptPaths, ...phasePaths, ...summaryPaths,
    replayInputPath, replayInputPath + ".sha256"
  ];
  for (const archiveRoot of archiveRoots) {
    await mkdir(archiveRoot);
    for (const relativePath of boundPaths) {
      const bytes = await readFile(path.join(sourceRoot, relativePath));
      const file = path.join(archiveRoot, relativePath);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes, { flag: "wx" });
    }
  }
  return {
    sourceRoot, archiveRoots, boundPaths, receiptPaths, phasePaths, summaryPaths, rawReceipts,
    evidence: JSON.parse(await readFile(path.join(sourceRoot, replayInputPath), "utf8")),
    replay: (boundFilesRoot = archiveRoots[0], allowances = {}) => verifyReleaseEvidenceFiles({
      sourceRoot, boundFilesRoot, inputRelativePath: replayInputPath,
      receiptsRelativePath: replayReceiptsPath, allowDirty: false, allowUnbound: false, ...allowances
    })
  };
}

async function rewriteReplayRaw(root, evidence, id, raw) {
  const projected = evidence.testReceipts.find((receipt) => receipt.id === id);
  const bytes = await writeReplayJson(path.join(root, projected.path), raw);
  projected.sha256 = sha256(bytes);
  await writeReplayEvidence(root, evidence);
}

test("release file replay verifies 13 raw receipts, 3 phase reports, 5 browser summaries and 4 endpoints in two archives", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  assert.equal(fixture.receiptPaths.length, 13);
  assert.equal(fixture.phasePaths.length, 3);
  assert.equal(fixture.summaryPaths.length, 5);
  assert.equal([...fixture.rawReceipts.values()].filter((raw) => raw.artifactIdentityBinding !== null).length, 4);
  for (const archiveRoot of fixture.archiveRoots) {
    const result = await fixture.replay(archiveRoot);
    assert.equal(result.gates.engineeringGatePassed, true);
    assert.deepEqual(result.evidence, fixture.evidence);
    assert.equal(result.evidence.artifacts.root, "dist/web");
    assert.equal(result.evidence.artifacts.identityLock.path, replayLockPath);
    assert.equal(result.evidenceSha256, sha256(await readFile(path.join(fixture.sourceRoot, replayInputPath))));
    assert.equal(result.verificationReceipt, null);
    assert.equal(result.scope.historicalApplicabilityAssessed, false);
    assert.deepEqual(result.evidence.artifacts.mutationBoundary, validArtifactMutationBoundary());
    assert.equal(result.evidence.claims.publicReleaseAuthorized, false);
    for (const relativePath of fixture.boundPaths) {
      assert.deepEqual(await readFile(path.join(archiveRoot, relativePath)),
        await readFile(path.join(fixture.sourceRoot, relativePath)), relativePath);
    }
  }
});

test("release file replay rejects every missing archive raw receipt despite an intact source-root copy", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  const archiveRoot = fixture.archiveRoots[0];
  for (const relativePath of fixture.receiptPaths) {
    const original = await readFile(path.join(fixture.sourceRoot, relativePath));
    await unlink(path.join(archiveRoot, relativePath));
    await assert.rejects(fixture.replay(), (error) => error.code === "ENOENT", relativePath);
    assert.deepEqual(await readFile(path.join(fixture.sourceRoot, relativePath)), original);
    await writeFile(path.join(archiveRoot, relativePath), original, { flag: "wx" });
  }
});

test("release file replay rejects every missing archive phase report and browser summary", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  const archiveRoot = fixture.archiveRoots[0];
  for (const relativePath of [...fixture.phasePaths, ...fixture.summaryPaths]) {
    const original = await readFile(path.join(fixture.sourceRoot, relativePath));
    await unlink(path.join(archiveRoot, relativePath));
    await assert.rejects(fixture.replay(), (error) => error.code === "ENOENT", relativePath);
    await writeFile(path.join(archiveRoot, relativePath), original, { flag: "wx" });
  }
});

test("release file replay rejects a different clean source identity for unchanged archive bytes", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  await writeFile(path.join(fixture.sourceRoot, "SYNTHETIC.txt"), "SYNTHETIC different source revision.\n");
  requireReplayCommand(replayCommand(fixture.sourceRoot, "git", ["add", "--", "SYNTHETIC.txt"]));
  requireReplayCommand(replayCommand(fixture.sourceRoot, "git", [
    "-c", "user.name=SYNTHETIC Contract Fixture", "-c", "user.email=synthetic@invalid.example",
    "-c", "commit.gpgSign=false", "-c", "core.hooksPath=" + path.join(fixture.sourceRoot, "../empty-hooks"),
    "commit", "--no-verify", "-m", "SYNTHETIC different source"
  ]));
  assert.equal(readGitState(fixture.sourceRoot).dirty, false);
  await assert.rejects(fixture.replay(), /Evidence id mismatch/u);
});

test("release file replay binds lifecycle packages to the source root, not archive-local packages", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  const archiveRoot = fixture.archiveRoots[0];
  const wrongPackageBytes = Buffer.from('{"name":"SYNTHETIC-wrong-package-domain"}\n');
  await writeFile(path.join(archiveRoot, "package.json"), wrongPackageBytes, { flag: "wx" });
  assert.equal((await fixture.replay()).gates.engineeringGatePassed, true);
  const raw = structuredClone(fixture.rawReceipts.get("build"));
  const reportPath = path.join(archiveRoot, raw.lifecyclePhaseReport.path);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  report.packageIdentities[0] = {
    path: "package.json", rawBytes: wrongPackageBytes.length, rawSha256: sha256(wrongPackageBytes)
  };
  raw.lifecyclePhaseReport.sha256 = sha256(await writeReplayJson(reportPath, report));
  await rewriteReplayRaw(archiveRoot, structuredClone(fixture.evidence), "build", raw);
  await assert.rejects(fixture.replay(), /current fixed plan or package identities mismatch/u);
});

test("release file replay independently rejects a changed endpoint binding in each of the four artifact receipts", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  const archiveRoot = fixture.archiveRoots[0];
  for (const id of RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS) {
    const raw = structuredClone(fixture.rawReceipts.get(id));
    raw.artifactIdentityBinding.afterCommand.buildVersion = "abcdef012345";
    await rewriteReplayRaw(archiveRoot, structuredClone(fixture.evidence), id, raw);
    await assert.rejects(fixture.replay(), /Release artifact mutation boundary requires every canonical browser receipt endpoint snapshot/u, id);
    await writeFile(path.join(archiveRoot, replayReceiptsPath, id + ".json"),
      await readFile(path.join(fixture.sourceRoot, replayReceiptsPath, id + ".json")));
    await writeReplayEvidence(archiveRoot, fixture.evidence);
  }
});

test("release file replay retains dirty diagnostics without producing a formal pass", async (context) => {
  const fixture = await releaseFileReplayFixture(context, { dirty: true });
  await assert.rejects(fixture.replay(), /requires a clean source tree/u);
  const result = await fixture.replay(fixture.sourceRoot, { allowDirty: true });
  assert.equal(result.gates.engineeringGatePassed, false);
  assert.equal(result.gates.sourceTreeClean, false);
  assert.equal(result.verificationReceipt.status, "diagnostic_only");
  assert.equal(result.verificationReceipt.formalReleaseEvidenceVerified, false);
  assert.equal(result.verificationReceipt.claims.sourceAndArtifactCurrentVerified, false);
  assert.equal((await fixture.replay(fixture.archiveRoots[0], { allowDirty: true })).verificationReceipt, null);
  await assert.rejects(fixture.replay(fixture.sourceRoot, { allowDirty: "true" }), /explicit booleans/u);
});

test("release file replay keeps unbound diagnostics subject to the original artifact lock", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  const archiveRoot = fixture.archiveRoots[0];
  const evidence = structuredClone(fixture.evidence);
  const index = path.join(archiveRoot, "dist/web/index.html");
  await writeFile(index, (await readFile(index, "utf8")).replace(evidence.evidenceId, "unbound-local-build"));
  evidence.release.builtEvidenceId = "unbound-local-build";
  evidence.release.evidenceIdBound = false;
  evidence.gates.evidenceIdBound = false;
  evidence.gates.engineeringGatePassed = false;
  const artifacts = await collectArtifactEntries(path.join(archiveRoot, "dist/web"),
    ["release-evidence.json", "release-evidence.json.sha256"], { containmentRoot: archiveRoot });
  evidence.artifacts.files = artifacts;
  evidence.artifacts.artifactSetDigest = sha256(canonicalJson(artifacts));
  evidence.artifacts.components = releaseArtifactComponents(artifacts);
  await writeReplayEvidence(archiveRoot, evidence);
  await assert.rejects(fixture.replay(), /Built artifact is not bound/u);
  await assert.rejects(fixture.replay(archiveRoot, { allowUnbound: true }),
    /Release artifact identity does not match the evidence id embedded in the build/u);
});

test("release file replay preserves the same-root CLI receipt and exclusive output behavior", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  const direct = await fixture.replay(fixture.sourceRoot);
  assert.equal(direct.verificationReceipt.receiptCount, 13);
  assert.equal(direct.verificationReceipt.status, "passed");
  assert.equal(direct.verificationReceipt.claims.browserRuntimeBeyondBoundReceiptsVerified, false);
  const args = [path.join(workspaceRoot, "scripts/verify-release-evidence.mjs"), "--output", "tmp/synthetic-formal.json"];
  const first = requireReplayCommand(replayCommand(fixture.sourceRoot, process.execPath, args));
  const emitted = Buffer.from(first.stdout, "utf8");
  assert.deepEqual(await readFile(path.join(fixture.sourceRoot, "tmp/synthetic-formal.json")), emitted);
  const receipt = JSON.parse(first.stdout);
  assert.equal(receipt.receiptType, "formal_release_evidence_verification");
  assert.equal(receipt.releaseEvidence.path, replayInputPath);
  assert.equal(receipt.receiptCount, 13);
  const second = replayCommand(fixture.sourceRoot, process.execPath, args);
  assert.equal(second.status, 1);
  assert.match(second.stderr, /EEXIST/u);
  assert.deepEqual(await readFile(path.join(fixture.sourceRoot, "tmp/synthetic-formal.json")), emitted);
  const insideArtifact = replayCommand(fixture.sourceRoot, process.execPath, [args[0], "--output", "dist/web/formal.json"]);
  assert.equal(insideArtifact.status, 1);
  assert.match(insideArtifact.stderr, /outside the artifact root/u);
});

test("release file replay is invoked by the production rollback artifact wrapper before accepting one artifact", async (context) => {
  const fixture = await releaseFileReplayFixture(context);
  const replay = await fixture.replay(fixture.sourceRoot);
  const formalReceipt = replay.verificationReceipt;
  const formalPath = "tmp/synthetic-formal.json";
  const formalBytes = await writeReplayJson(path.join(fixture.sourceRoot, formalPath), formalReceipt);
  const evidenceBytes = await readFile(path.join(fixture.sourceRoot, replayInputPath));
  const lockBytes = await readFile(path.join(fixture.sourceRoot, replayLockPath));
  const identity = {
    channel: "default-v13", descriptor: fixture.evidence.release.descriptor,
    buildVersion: fixture.evidence.release.buildVersion, manifestDigest: fixture.evidence.release.manifestDigest,
    artifactRoot: "dist/web", artifactSetDigest: fixture.evidence.artifacts.artifactSetDigest,
    components: fixture.evidence.artifacts.components,
    releaseEvidence: {
      path: replayInputPath, size: evidenceBytes.length, sha256: sha256(evidenceBytes),
      schemaVersion: 1, schemaId: "https://hakimi.invalid/schemas/release-evidence-v1.json",
      evidenceType: "engineering_release_evidence", evidenceId: fixture.evidence.evidenceId,
      sidecarPath: replayInputPath + ".sha256",
      sidecarSha256: sha256(await readFile(path.join(fixture.sourceRoot, replayInputPath + ".sha256")))
    },
    identityLock: {
      ...fixture.evidence.artifacts.identityLock, size: lockBytes.length, evidenceId: fixture.evidence.evidenceId
    },
    formalReceipt: {
      path: formalPath, size: formalBytes.length, sha256: sha256(formalBytes),
      schemaVersion: formalReceipt.schemaVersion, receiptType: formalReceipt.receiptType,
      receiptId: formalReceipt.receiptId, releaseEvidenceId: formalReceipt.releaseEvidenceId,
      status: formalReceipt.status, verifiedAt: formalReceipt.verifiedAt
    }
  };
  const options = {
    cwd: fixture.sourceRoot, role: "candidate", identity,
    artifactRoot: path.join(fixture.sourceRoot, "dist/web"), receiptsRoot: path.join(fixture.sourceRoot, "tmp"),
    releaseEvidenceValidator: compileReleaseEvidenceSchema(releaseEvidenceSchema)
  };
  const verified = await verifyRollbackReleaseArtifactFiles(options);
  assert.deepEqual(verified.releaseEvidence, fixture.evidence);
  assert.deepEqual(verified.formalReceipt, formalReceipt);
  // A single component replay is not the four-root rollback entry or admission.
  await unlink(path.join(fixture.sourceRoot, replayReceiptsPath, "unit.json"));
  await assert.rejects(verifyRollbackReleaseArtifactFiles(options), (error) =>
    error.code === "FORMAL_RELEASE_FILES_VERIFICATION_FAILED"
      && error.stage === "formal_release_evidence"
  );
});
