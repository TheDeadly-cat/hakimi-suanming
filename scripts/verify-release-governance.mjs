import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pwaCrossBrowserConfig from "../apps/web/playwright.pwa-cross-browser.config.ts";
import {
  DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions
} from "../apps/web/playwright.release-browser-matrix.ts";
import webV1CrossBrowserConfig from "../apps/web/playwright.web-v1-cross-browser.config.ts";

export const REQUIRED_MIGRATION_WORKFLOW_COMMANDS = Object.freeze([
  "node --test scripts/verify-release-governance.test.mjs",
  "npm run test:e2e:cross-schema-upgrade",
  "npm run test:e2e:cross-schema-v13-v15",
  "npm run test:e2e:cross-schema-v14-v15",
  "npm run test:e2e:cross-schema-v13-v16",
  "npm run test:e2e:orphaned-v13-recovery"
]);

export const REQUIRED_MIGRATION_WORKFLOW_PATHS = Object.freeze([
  ".node-version",
  ".npmrc",
  "package.json",
  "package-lock.json",
  "apps/web/package.json",
  "apps/web/index.html",
  "apps/web/public/sw.js",
  "apps/web/release-protocol.ts",
  "apps/web/src/bootstrap.ts",
  "apps/web/src/main.tsx",
  "apps/web/src/lib/app-version.ts",
  "apps/web/src/lib/current-release.ts",
  "apps/web/src/lib/full-backup-worker-protocol.ts",
  "apps/web/src/lib/orphaned-v13-rescue.ts",
  "apps/web/src/lib/preboot-database-inventory.ts",
  "apps/web/src/lib/release-database-coordinator.ts",
  "apps/web/src/lib/release-integrity-cache.ts",
  "apps/web/src/lib/service-worker-boot-ack.ts",
  "apps/web/src/lib/storage-capacity-gate.ts",
  "apps/web/e2e/**",
  "apps/web/playwright*.config.ts",
  "apps/web/vite*.ts",
  "packages/backup/**",
  "packages/contracts/**",
  "packages/integrity/**",
  "packages/storage/**",
  "scripts/**",
  ".github/workflows/migration-ci.yml"
]);

export const REQUIRED_RELEASE_BROWSER_MATRIX = Object.freeze([
  Object.freeze({
    policyId: "desktop-edge",
    projectName: "msedge",
    channel: "msedge",
    deviceName: "Desktop Edge"
  }),
  Object.freeze({
    policyId: "desktop-chrome",
    projectName: "chrome",
    channel: "chrome",
    deviceName: "Desktop Chrome"
  })
]);

export const REQUIRED_RELEASE_BROWSER_IDS = Object.freeze(
  REQUIRED_RELEASE_BROWSER_MATRIX.map((browser) => browser.policyId).sort()
);

export const REQUIRED_DISABLED_RELEASE_BROWSER_CLAIMS = Object.freeze([
  "androidReleaseClaimAuthorized",
  "firefoxReleaseClaimAuthorized",
  "safariReleaseClaimAuthorized"
]);

export const REQUIRED_RELEASE_BROWSER_RECEIPT_COMMANDS = Object.freeze({
  pwa: Object.freeze(["npm", "run", "test:e2e:pwa"]),
  "web-v1-flow": Object.freeze(["npm", "run", "test:e2e:web-v1-flow"])
});

export const REQUIRED_RELEASE_BROWSER_SCRIPTS = Object.freeze({
  "test:e2e:pwa": "playwright test --config apps/web/playwright.pwa-cross-browser.config.ts",
  "test:e2e:web-v1-flow": "playwright test --config apps/web/playwright.web-v1-cross-browser.config.ts"
});
export const REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND =
  "npx playwright install chrome msedge";

export const REQUIRED_RELEASE_FILES = Object.freeze([
  ".github/workflows/quick-ci.yml",
  ".github/workflows/migration-ci.yml",
  ".github/workflows/nightly-heavy.yml",
  ".github/workflows/release-evidence.yml",
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/release-charter.yml",
  ".github/ISSUE_TEMPLATE/release-gate.yml",
  "docs/status/current-release-status.md",
  "docs/Web-v1发布章程与兼容范围-v0.1-2026-08-21.md",
  "docs/release/web-v1-release-and-rollback-runbook.md",
  "docs/release/release-evidence.schema.json",
  "apps/web/playwright.release-browser-matrix.ts",
  "apps/web/playwright.release-browser-result.ts",
  "apps/web/playwright.release-browser-strict-reporter.ts",
  "apps/web/playwright.pwa-cross-browser.config.ts",
  "apps/web/playwright.web-v1-cross-browser.config.ts",
  "apps/web/vite.e2e.config.ts",
  "apps/web/e2e/cross-schema-upgrade-helpers.ts",
  "apps/web/e2e/release-browser-persistent-context.ts",
  "apps/web/e2e/pwa-install-and-offline-cold-start.spec.ts",
  "apps/web/e2e/web-v1-continuous-flow.spec.ts",
  "scripts/compute-release-evidence-id.mjs",
  "scripts/generate-release-evidence.mjs",
  "scripts/release-browser-result-evidence.mjs",
  "scripts/release-evidence-lib.mjs",
  "scripts/release-evidence.test.mjs",
  "scripts/run-release-evidence-command.mjs",
  "scripts/verify-built-release-storage-manifest.mjs",
  "scripts/verify-release-evidence.mjs",
  "scripts/verify-release-governance.test.mjs"
]);

const RELEASE_BROWSER_CONFIG_KEYS = Object.freeze([
  "testDir",
  "testMatch",
  "outputDir",
  "timeout",
  "expect",
  "fullyParallel",
  "forbidOnly",
  "workers",
  "reporter",
  "use",
  "projects",
  "webServer"
]);
const RELEASE_BROWSER_PROJECT_KEYS = Object.freeze(["name", "metadata", "use"]);
const RELEASE_BROWSER_PROJECT_METADATA_KEYS = Object.freeze([
  "releaseBrowserId",
  "browserChannel",
  "releaseIdentity"
]);
const RELEASE_BROWSER_PROJECT_USE_KEYS = Object.freeze([
  "viewport",
  "screen",
  "deviceScaleFactor",
  "isMobile",
  "hasTouch",
  "channel"
]);
const RELEASE_BROWSER_ROOT_USE_KEYS = Object.freeze([
  "baseURL",
  "acceptDownloads",
  "serviceWorkers",
  "trace",
  "screenshot",
  "video"
]);
const RELEASE_BROWSER_WEB_SERVER_KEYS = Object.freeze([
  "command",
  "url",
  "reuseExistingServer",
  "timeout",
  "stdout",
  "stderr"
]);
const moduleWorkspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export const REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER = Object.freeze([
  "governance",
  "evidence-tooling",
  "typecheck",
  "unit",
  "build",
  "boot",
  "pwa",
  "web-v1-flow",
  "cross-schema-v13-v16",
  "orphaned-v13-recovery",
  "built-contract"
]);

function leadingSpaces(line) {
  return line.length - line.trimStart().length;
}

function exactKeys(value, expectedKeys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expectedKeys].sort());
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function verifyReleaseBrowserPlaywrightConfig(
  config,
  { receiptId, testMatch, outputDirectoryName, timeout }
) {
  if (!exactKeys(config, RELEASE_BROWSER_CONFIG_KEYS)) {
    throw new Error(`Release browser config shape mismatch: ${receiptId}.`);
  }
  if (
    config.testDir !== "./e2e"
    || config.testMatch !== testMatch
    || config.outputDir !== path.join(os.tmpdir(), outputDirectoryName)
    || config.timeout !== timeout
    || !sameJson(config.expect, { timeout: 15_000 })
    || config.fullyParallel !== false
    || config.forbidOnly !== true
    || config.workers !== 1
  ) {
    throw new Error(`Release browser config execution policy mismatch: ${receiptId}.`);
  }
  if (
    !Array.isArray(config.reporter)
    || config.reporter.length !== 2
    || !sameJson(config.reporter[0], ["line"])
    || !Array.isArray(config.reporter[1])
    || config.reporter[1].length !== 2
    || config.reporter[1][0] !== path.join(
      moduleWorkspaceRoot,
      "apps/web/playwright.release-browser-strict-reporter.ts"
    )
    || !sameJson(config.reporter[1][1], { receiptId, expectedTestsPerProject: 1 })
  ) {
    throw new Error(`Release browser strict reporter mismatch: ${receiptId}.`);
  }
  if (
    !exactKeys(config.use, RELEASE_BROWSER_ROOT_USE_KEYS)
    || !sameJson(config.use, {
      baseURL: "http://127.0.0.1:4197",
      acceptDownloads: true,
      serviceWorkers: "allow",
      trace: "retain-on-failure",
      screenshot: "only-on-failure",
      video: "off"
    })
  ) {
    throw new Error(`Release browser root context policy mismatch: ${receiptId}.`);
  }
  if (
    !exactKeys(config.webServer, RELEASE_BROWSER_WEB_SERVER_KEYS)
    || !sameJson(config.webServer, {
      command: "npm run serve:e2e --workspace @hakimi/web",
      url: "http://127.0.0.1:4197/",
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe"
    })
  ) {
    throw new Error(`Release browser webServer policy mismatch: ${receiptId}.`);
  }
  if (!Array.isArray(config.projects) || config.projects.length !== RELEASE_BROWSER_MATRIX.length) {
    throw new Error(`Release browser project count mismatch: ${receiptId}.`);
  }
  for (let index = 0; index < RELEASE_BROWSER_MATRIX.length; index += 1) {
    const browser = RELEASE_BROWSER_MATRIX[index];
    const project = config.projects[index];
    if (
      !exactKeys(project, RELEASE_BROWSER_PROJECT_KEYS)
      || project.name !== browser.projectName
      || !exactKeys(project.metadata, RELEASE_BROWSER_PROJECT_METADATA_KEYS)
      || !sameJson(project.metadata, {
        releaseBrowserId: browser.policyId,
        browserChannel: browser.channel,
        releaseIdentity: DEFAULT_V13_RELEASE_BROWSER_IDENTITY
      })
      || !exactKeys(project.use, RELEASE_BROWSER_PROJECT_USE_KEYS)
      || !sameJson(project.use, {
        ...releaseBrowserNativeDeviceOptions(browser),
        channel: browser.channel
      })
    ) {
      throw new Error(`Release browser project policy mismatch: ${receiptId}/${browser.projectName}.`);
    }
  }
}

function unquoteYamlScalar(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) return value.slice(1, -1);
  return value;
}

function migrationPullRequestPaths(workflow) {
  const lines = workflow.split(/\r?\n/u);
  const pullRequestIndex = lines.findIndex((line) => /^\s{2}pull_request:\s*(?:#.*)?$/u.test(line));
  if (pullRequestIndex < 0) throw new Error("Migration CI must define an explicit pull_request trigger.");

  let pathsIndex = -1;
  for (let index = pullRequestIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && leadingSpaces(line) <= 2) break;
    if (/^\s{4}paths:\s*(?:#.*)?$/u.test(line)) {
      pathsIndex = index;
      break;
    }
  }
  if (pathsIndex < 0) throw new Error("Migration CI pull_request trigger must define paths.");

  const paths = [];
  for (let index = pathsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/u.test(line)) continue;
    if (leadingSpaces(line) <= 4) break;
    const item = line.match(/^\s{6}-\s+(.+?)\s*$/u);
    if (!item) continue;
    const scalar = item[1].replace(/\s+#.*$/u, "").trim();
    paths.push(unquoteYamlScalar(scalar));
  }
  return paths;
}

function migrationRunCommands(workflow) {
  return workflow
    .split(/\r?\n/u)
    .map((line) => line.match(/^\s*-\s+run:\s+(.+?)\s*$/u)?.[1] ?? null)
    .filter((command) => command !== null)
    .map(unquoteYamlScalar);
}

export function verifyMigrationWorkflowGovernance(migrationWorkflow) {
  const commands = new Set(migrationRunCommands(migrationWorkflow));
  for (const command of REQUIRED_MIGRATION_WORKFLOW_COMMANDS) {
    if (!commands.has(command)) throw new Error(`Migration CI is missing ${command}.`);
  }

  const pullRequestPaths = new Set(migrationPullRequestPaths(migrationWorkflow));
  for (const requiredPath of REQUIRED_MIGRATION_WORKFLOW_PATHS) {
    if (!pullRequestPaths.has(requiredPath)) {
      throw new Error(`Migration CI pull_request.paths is missing ${requiredPath}.`);
    }
  }
}

function normalizedDocumentCommandLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("- run: ") ? trimmed.slice("- run: ".length) : trimmed;
}

function releaseReceiptTuples(document, documentLabel) {
  const runnerPrefix = "node scripts/run-release-evidence-command.mjs ";
  const tuples = [];
  for (const line of document.split(/\r?\n/u)) {
    const commandLine = normalizedDocumentCommandLine(line);
    if (!commandLine.startsWith(runnerPrefix)) continue;
    const match = commandLine.match(
      /^node scripts\/run-release-evidence-command\.mjs --id ([a-z0-9][a-z0-9-]*) --output \S+ -- (.+)$/u
    );
    if (!match) throw new Error(`${documentLabel} contains a malformed release receipt invocation.`);
    tuples.push(Object.freeze({ id: match[1], command: match[2] }));
  }
  return tuples;
}

export function verifyReleaseBrowserInstallPrerequisite(document, documentLabel) {
  const commandLines = document
    .split(/\r?\n/u)
    .map(normalizedDocumentCommandLine);
  const installIndexes = commandLines
    .map((commandLine, index) => commandLine === REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND ? index : -1)
    .filter((index) => index >= 0);
  if (installIndexes.length !== 1) {
    throw new Error(`${documentLabel} must contain exactly one branded browser install prerequisite.`);
  }
  const firstBrowserReceiptIndex = commandLines.findIndex((commandLine) =>
    commandLine.startsWith("node scripts/run-release-evidence-command.mjs --id pwa ")
  );
  if (firstBrowserReceiptIndex < 0 || installIndexes[0] > firstBrowserReceiptIndex) {
    throw new Error(`${documentLabel} must install branded browsers before browser receipts.`);
  }
}

export function verifyReleaseReceiptMirror(requiredReceiptCommands, document, documentLabel) {
  if (!requiredReceiptCommands || typeof requiredReceiptCommands !== "object" || Array.isArray(requiredReceiptCommands)) {
    throw new Error("Default v13 release evidence receipt policy is missing.");
  }
  const requiredReceiptIds = Object.keys(requiredReceiptCommands).sort();
  if (
    JSON.stringify([...REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER].sort()) !==
    JSON.stringify(requiredReceiptIds)
  ) {
    throw new Error("Default v13 receipt policy does not match the canonical execution order.");
  }

  const tuples = releaseReceiptTuples(document, documentLabel);
  for (const id of requiredReceiptIds) {
    const matches = tuples.filter((tuple) => tuple.id === id);
    if (matches.length === 0) throw new Error(`${documentLabel} is missing receipt ${id}.`);
    if (matches.length > 1) throw new Error(`${documentLabel} contains duplicate receipt ${id}.`);
  }
  const unexpectedTuple = tuples.find((tuple) => !requiredReceiptIds.includes(tuple.id));
  if (unexpectedTuple) {
    throw new Error(`${documentLabel} contains unexpected receipt ${unexpectedTuple.id}.`);
  }
  for (let index = 0; index < REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER.length; index += 1) {
    const expectedId = REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER[index];
    const tuple = tuples[index];
    if (tuple?.id !== expectedId) {
      throw new Error(
        `${documentLabel} receipt order mismatch at position ${index + 1}: expected ${expectedId}, got ${tuple?.id ?? "none"}.`
      );
    }
    const expectedCommand = requiredReceiptCommands[expectedId].join(" ");
    if (tuple.command !== expectedCommand) {
      throw new Error(`${documentLabel} command for ${expectedId} does not match policy.`);
    }
  }

  const requiredListMatches = [...document.matchAll(
    /--require-receipts\s+([a-z0-9][a-z0-9,-]*)(?=\s|$)/gu
  )];
  if (
    requiredListMatches.length !== 1 ||
    requiredListMatches[0][1] !== requiredReceiptIds.join(",")
  ) {
    throw new Error(`${documentLabel} does not require the complete canonical receipt set.`);
  }
}

function releaseBrowserTuple(browser) {
  return {
    policyId: browser?.policyId,
    projectName: browser?.projectName,
    channel: browser?.channel,
    deviceName: browser?.deviceName
  };
}

export function verifyReleaseBrowserGovernance(
  decisions,
  packageJson,
  releaseBrowserMatrix = RELEASE_BROWSER_MATRIX,
  browserConfigs = {
    pwa: pwaCrossBrowserConfig,
    "web-v1-flow": webV1CrossBrowserConfig
  }
) {
  const actualBrowserMatrix = Array.isArray(releaseBrowserMatrix)
    ? releaseBrowserMatrix.map(releaseBrowserTuple)
    : null;
  if (
    actualBrowserMatrix === null ||
    JSON.stringify(actualBrowserMatrix) !== JSON.stringify(REQUIRED_RELEASE_BROWSER_MATRIX)
  ) {
    throw new Error("Web v1 release browser project/channel/device matrix does not match policy.");
  }

  const actualBrowserIds = decisions.browserSupport?.supportedEngineeringMatrix;
  const canonicalActualBrowserIds = Array.isArray(actualBrowserIds)
    && actualBrowserIds.every((value) => typeof value === "string")
    && new Set(actualBrowserIds).size === actualBrowserIds.length
    ? [...actualBrowserIds].sort()
    : null;
  if (
    canonicalActualBrowserIds === null ||
    JSON.stringify(canonicalActualBrowserIds) !== JSON.stringify(REQUIRED_RELEASE_BROWSER_IDS)
  ) {
    throw new Error("Web v1 release browser matrix must be exactly desktop-chrome, desktop-edge.");
  }

  for (const claimField of REQUIRED_DISABLED_RELEASE_BROWSER_CLAIMS) {
    if (decisions.browserSupport?.[claimField] !== false) {
      throw new Error(`Unsupported release browser claim must remain false: ${claimField}.`);
    }
  }

  const receiptCommands = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
  for (const [id, expectedCommand] of Object.entries(REQUIRED_RELEASE_BROWSER_RECEIPT_COMMANDS)) {
    if (JSON.stringify(receiptCommands?.[id]) !== JSON.stringify(expectedCommand)) {
      throw new Error(`Release browser receipt policy mismatch: ${id}.`);
    }
  }

  for (const [scriptName, expectedCommand] of Object.entries(REQUIRED_RELEASE_BROWSER_SCRIPTS)) {
    if (packageJson.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`Release browser package script mismatch: ${scriptName}.`);
    }
  }

  verifyReleaseBrowserPlaywrightConfig(browserConfigs.pwa, {
    receiptId: "pwa",
    testMatch: "pwa-install-and-offline-cold-start.spec.ts",
    outputDirectoryName: "hakimi-bazi-pwa-cross-browser-results",
    timeout: 120_000
  });
  verifyReleaseBrowserPlaywrightConfig(browserConfigs["web-v1-flow"], {
    receiptId: "web-v1-flow",
    testMatch: "web-v1-continuous-flow.spec.ts",
    outputDirectoryName: "hakimi-bazi-web-v1-cross-browser-results",
    timeout: 360_000
  });
}

const cwd = process.cwd();
const readJson = async (filePath) => JSON.parse(await readFile(path.resolve(cwd, filePath), "utf8"));
const decisions = await readJson("docs/release/web-v1-release-decisions.json");
const packageJson = await readJson("package.json");
const history = await readJson("docs/release/release-generation-history.json");
const security = await readJson("docs/security/hosting-security-policy.json");
const license = await readFile(path.resolve(cwd, "LICENSE"), "utf8");
const headersFile = await readFile(path.resolve(cwd, "apps/web/public/_headers"), "utf8");
const releaseWorkflow = await readFile(path.resolve(cwd, ".github/workflows/release-evidence.yml"), "utf8");
const releaseRunbook = await readFile(path.resolve(cwd, "docs/release/web-v1-release-and-rollback-runbook.md"), "utf8");
const migrationWorkflow = await readFile(path.resolve(cwd, ".github/workflows/migration-ci.yml"), "utf8");

if (
  decisions.defaultRelease.dbGeneration !== "legacy-v13" ||
  decisions.defaultRelease.targetSchema !== 13 ||
  decisions.defaultRelease.migrationId !== null ||
  decisions.defaultRelease.schema16PromotionAuthorized !== false
) throw new Error("Web v1 decisions do not preserve the frozen default v13 identity.");
if (decisions.domainClaims.expertValidatedClaimAuthorized !== false) {
  throw new Error("Engineering governance cannot authorize expert-validated claims.");
}
if (decisions.domainClaims.verifiedGoldCaseCount !== 0) throw new Error("Verified gold count was fabricated.");
if (decisions.licensing.openSourceClaimAuthorized !== false) throw new Error("Open-source claim is not authorized.");
if (decisions.hosting.publicDeploymentAuthorized !== false) throw new Error("Public deployment was authorized without a host decision.");
verifyReleaseBrowserGovernance(decisions, packageJson);
const requiredReceiptCommands = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
if (!requiredReceiptCommands || typeof requiredReceiptCommands !== "object" || Array.isArray(requiredReceiptCommands)) {
  throw new Error("Default v13 release evidence receipt policy is missing.");
}
verifyReleaseBrowserInstallPrerequisite(releaseWorkflow, "Release workflow");
verifyReleaseBrowserInstallPrerequisite(releaseRunbook, "Release runbook");
verifyReleaseReceiptMirror(requiredReceiptCommands, releaseWorkflow, "Release workflow");
verifyReleaseReceiptMirror(requiredReceiptCommands, releaseRunbook, "Release runbook");
if (releaseWorkflow.includes("--allow-dirty") || releaseWorkflow.includes("--allow-unbound")) {
  throw new Error("Formal Release workflow weakens source or artifact binding.");
}
verifyMigrationWorkflowGovernance(migrationWorkflow);

const allowedSources = history.allowedMigrationSources;
if (!Array.isArray(allowedSources) || allowedSources.length !== 1) throw new Error("Release history must admit exactly one fail-closed source by default.");
if (allowedSources[0].dbGeneration !== "legacy-v13" || allowedSources[0].targetSchema !== 13) {
  throw new Error("The only default migration source must be legacy-v13 Schema 13.");
}
const defaultGenerations = history.generations.filter((entry) => entry.defaultBuild === true);
if (defaultGenerations.length !== 1 || defaultGenerations[0].dbGeneration !== "legacy-v13") {
  throw new Error("Release history has an unauthorized default generation.");
}
if (history.generations.some((entry) => [14, 15, 16].includes(entry.targetSchema) && entry.defaultBuild === true)) {
  throw new Error("A candidate Schema was promoted by governance data.");
}

if (!license.includes("All rights reserved") || !license.includes("No license is granted")) {
  throw new Error("The conservative rights-reserved notice is incomplete.");
}
const csp = security.headers["Content-Security-Policy-Report-Only"];
for (const directive of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "script-src 'self'", "worker-src 'self' blob:"]) {
  if (!csp?.includes(directive)) throw new Error(`Hosting CSP is missing ${directive}.`);
}
if (csp.includes("unsafe-eval") || /https?:\/\//u.test(csp)) throw new Error("Hosting CSP weakens the local-first boundary.");
for (const [name, value] of Object.entries(security.headers)) {
  if (!headersFile.includes(`${name}: ${value}`)) throw new Error(`_headers does not implement ${name}.`);
}
for (const [route, value] of Object.entries(security.cacheRules)) {
  if (!headersFile.includes(route) || !headersFile.includes(`Cache-Control: ${value}`)) {
    throw new Error(`_headers does not implement cache rule ${route}.`);
  }
}

for (const filePath of REQUIRED_RELEASE_FILES) {
  await readFile(path.resolve(cwd, filePath), "utf8");
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  process.stdout.write(`${JSON.stringify({
    defaultRelease: decisions.defaultRelease,
    admittedMigrationSources: allowedSources.length,
    cspMode: security.cspEnforcementStatus,
    licensePolicy: decisions.licensing.status,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  }, null, 2)}\n`);
}
