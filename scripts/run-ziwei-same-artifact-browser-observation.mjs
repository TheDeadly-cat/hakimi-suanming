import http from "node:http";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import {
  BUILD_SOURCE_PATHS,
  EVIDENCE_TOOL_PATHS,
  ZiweiSameArtifactObservationError,
  ZIWEI_SAME_ARTIFACT_RUNTIME_SCHEMA,
  captureOutputTree,
  captureWorkspaceBindings,
  canonicalStringify,
  fileTreeDigest,
  inspectWorkspaceE2eAssertionContract,
  normalizeRuntimeObservation,
  sha256Bytes
} from "./ziwei-same-artifact-browser-observation-lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = realpathSync.native(path.resolve(scriptDir, ".."));
const systemTempRoot = realpathSync.native(os.tmpdir());
const SERVER_PORT = 4218;
const PROJECT_HEADER = "x-hakimi-ziwei-evidence-project";
const OUTPUT_TREE_HEADER = "x-hakimi-ziwei-output-tree-sha256";
const PROJECTS = Object.freeze([
  Object.freeze({ projectName: "chrome", channel: "chrome", browserProduct: "Google Chrome" }),
  Object.freeze({ projectName: "msedge", channel: "msedge", browserProduct: "Microsoft Edge" })
]);
let failureStageCode = "INITIALIZATION_FAILED_CLOSED";

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function runControlledChild(args, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      ...options,
      stdio: "ignore",
      windowsHide: true
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error("controlled child launch failed"));
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      resolve(Object.freeze({ status: code, signal, timedOut }));
    });
  });
}

function samePath(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function directoryIdentity(directory) {
  const stat = lstatSync(directory, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("temporary endpoint is not a real directory");
  return Object.freeze({ dev: stat.dev, ino: stat.ino, mode: stat.mode });
}

function createOwnedTemporaryRoot() {
  const root = path.join(systemTempRoot, `hakimi-ziwei-same-artifact-${randomUUID()}`);
  mkdirSync(root, { recursive: false });
  const real = realpathSync.native(root);
  const relative = path.relative(systemTempRoot, real);
  if (!samePath(root, real) || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("runner-created temporary root failed realpath containment");
  }
  return Object.freeze({ root: real, identity: directoryIdentity(real) });
}

function createOwnedChildDirectory(ownedRoot, leaf) {
  if (!/^[a-z][a-z0-9-]*$/u.test(leaf)) throw new Error("temporary child leaf is invalid");
  const directory = path.join(ownedRoot.root, leaf);
  mkdirSync(directory, { recursive: false });
  const real = realpathSync.native(directory);
  const relative = path.relative(ownedRoot.root, real);
  if (!samePath(directory, real) || relative !== leaf) throw new Error("temporary child escaped its owner root");
  return real;
}

function assertOwnedTreeSafe(directory, ownedRoot) {
  const rootStat = lstatSync(ownedRoot.root, { bigint: true });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()
      || rootStat.dev !== ownedRoot.identity.dev || rootStat.ino !== ownedRoot.identity.ino
      || rootStat.mode !== ownedRoot.identity.mode || !samePath(realpathSync.native(ownedRoot.root), ownedRoot.root)) {
    throw new Error("runner-owned temporary root identity changed; cleanup refused");
  }
  const visit = (current) => {
    const currentStat = lstatSync(current);
    if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) {
      throw new Error("runner-owned temporary tree contains a link or non-directory container");
    }
    const real = realpathSync.native(current);
    const relative = path.relative(ownedRoot.root, real);
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("temporary tree escaped its owner root");
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error("temporary cleanup refused a symlink or junction");
      if (entry.isDirectory()) visit(absolute);
      else if (!entry.isFile()) throw new Error("temporary cleanup refused a special endpoint");
    }
  };
  visit(directory);
}

function cleanupOwnedTemporaryRoot(ownedRoot) {
  if (!existsSync(ownedRoot.root)) return;
  assertOwnedTreeSafe(ownedRoot.root, ownedRoot);
  rmSync(ownedRoot.root, { recursive: true, force: false, maxRetries: 2 });
}

function defaultEvidenceOutputPath() {
  return path.join(systemTempRoot, `hakimi-ziwei-same-artifact-runtime-${randomUUID()}.json`);
}

function requiredEvidenceOutputPath() {
  if (process.argv.length === 2) return defaultEvidenceOutputPath();
  if (process.argv.length !== 4 || process.argv[2] !== "--evidence-out") {
    throw new Error("usage: --evidence-out <absolute-new-temp-file>");
  }
  const raw = process.argv[3];
  if (!path.isAbsolute(raw)) throw new Error("evidence output must be absolute");
  const resolved = path.resolve(raw);
  const parent = path.dirname(resolved);
  const stat = lstatSync(parent);
  const realParent = realpathSync.native(parent);
  const relative = path.relative(systemTempRoot, realParent);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(parent, realParent)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)
      || existsSync(resolved)) throw new Error("evidence output must be a new file under a real system-temp parent");
  return path.join(realParent, path.basename(resolved));
}

function readPackageVersion(relativePath) {
  const bytes = readFileSync(path.join(workspaceRoot, ...relativePath.split("/")));
  const parsed = JSON.parse(bytes.toString("utf8"));
  if (typeof parsed.version !== "string") throw new Error(`package version absent: ${relativePath}`);
  return parsed.version;
}

function sourceSnapshot() {
  const files = captureWorkspaceBindings(workspaceRoot, BUILD_SOURCE_PATHS);
  return Object.freeze({ files, graphDigest: fileTreeDigest(files, "sha256-authored-build-source-graph-v1") });
}

function evidenceToolingSnapshot() {
  const files = captureWorkspaceBindings(workspaceRoot, EVIDENCE_TOOL_PATHS);
  return Object.freeze({ files, graphDigest: fileTreeDigest(files) });
}

function outputMap(tree) {
  return new Map(tree.files.map((entry) => [entry.path, entry]));
}

function contentType(relativePath) {
  if (relativePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (relativePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (relativePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (relativePath.endsWith(".json") || relativePath.endsWith(".map")) return "application/json; charset=utf-8";
  if (relativePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function requiredRuntimePaths(outDir, tree) {
  const indexBytes = readFileSync(path.join(outDir, "index.html"));
  const indexText = indexBytes.toString("utf8");
  const required = new Set(["index.html"]);
  for (const match of indexText.matchAll(/(?:src|href)="\.\/([^"?#]+)"/gu)) {
    if (match[1].startsWith("assets/") && /\.(?:css|js)$/u.test(match[1])) required.add(match[1]);
  }
  for (const file of tree.files) {
    if (/^assets\/browser-worker-[^/]+\.js$/u.test(file.path)) required.add(file.path);
  }
  const sorted = [...required].sort(compareCodeUnits);
  if (!sorted.some((entry) => entry.endsWith(".css"))
      || !sorted.some((entry) => entry.endsWith(".js"))
      || !sorted.some((entry) => /browser-worker/u.test(entry))) {
    throw new Error("controlled build lacks the fixed HTML, CSS, main-script, or worker runtime set");
  }
  return Object.freeze(sorted);
}

async function startStaticEvidenceServer(outDir, tree) {
  const expected = outputMap(tree);
  const observations = new Map(PROJECTS.map((project) => [project.projectName, {
    responseCount: 0,
    artifacts: new Map()
  }]));
  let unattributedResponseCount = 0;
  const server = http.createServer((request, response) => {
    try {
      if (request.method !== "GET") {
        response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
        response.end("method not allowed");
        return;
      }
      const projectName = request.headers[PROJECT_HEADER];
      if (typeof projectName !== "string" || !observations.has(projectName)) {
        unattributedResponseCount += 1;
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end("controlled project header required");
        return;
      }
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const decoded = decodeURIComponent(requestUrl.pathname);
      const relativePath = decoded === "/" ? "index.html" : decoded.slice(1);
      if (relativePath.includes("\\") || relativePath.split("/").some(
        (part) => part.length === 0 || part === "." || part === ".."
      )) throw new Error("request path is not canonical");
      const binding = expected.get(relativePath);
      if (!binding) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("not found");
        return;
      }
      const absolute = path.join(outDir, ...relativePath.split("/"));
      const real = realpathSync.native(absolute);
      const relativeToOutput = path.relative(outDir, real);
      if (relativeToOutput.startsWith("..") || path.isAbsolute(relativeToOutput)) {
        throw new Error("served endpoint escaped output root");
      }
      const bytes = readFileSync(real);
      const actual = { path: relativePath, bytes: bytes.byteLength, sha256: sha256Bytes(bytes) };
      if (canonicalStringify(actual) !== canonicalStringify(binding)) {
        throw new Error("served body no longer matches the frozen output tree");
      }
      const project = observations.get(projectName);
      project.responseCount += 1;
      project.artifacts.set(relativePath, Object.freeze(actual));
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
        "content-type": contentType(relativePath),
        "x-content-type-options": "nosniff",
        [OUTPUT_TREE_HEADER]: tree.treeDigest
      });
      response.end(bytes);
    } catch {
      if (!response.headersSent) response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("controlled static server failed closed");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(SERVER_PORT, "127.0.0.1", () => resolve());
  });
  const origin = `http://127.0.0.1:${SERVER_PORT}`;
  return Object.freeze({
    origin,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    summarize() {
      const requiredPaths = requiredRuntimePaths(outDir, tree);
      const byProject = PROJECTS.map((definition) => {
        const observed = observations.get(definition.projectName);
        const artifacts = [...observed.artifacts.values()].sort(
          (left, right) => compareCodeUnits(left.path, right.path)
        );
        if (observed.responseCount < 16 || !requiredPaths.every(
          (requiredPath) => artifacts.some((artifact) => artifact.path === requiredPath)
        )) throw new Error(`served response ledger incomplete for ${definition.projectName}`);
        return Object.freeze({
          projectName: definition.projectName,
          servedResponseCount: observed.responseCount,
          servedArtifactCount: artifacts.length,
          servedArtifacts: Object.freeze(artifacts),
          servedBodyManifestDigest: fileTreeDigest(artifacts, "sha256-served-body-manifest-v1")
        });
      }).sort((left, right) => PROJECTS.findIndex((item) => item.projectName === left.projectName)
        - PROJECTS.findIndex((item) => item.projectName === right.projectName));
      if (canonicalStringify(byProject[0].servedArtifacts)
          !== canonicalStringify(byProject[1].servedArtifacts)) {
        throw new Error("Chrome and Edge did not receive the same runtime artifact set");
      }
      const servedArtifacts = byProject[0].servedArtifacts;
      return Object.freeze({
        origin,
        host: "127.0.0.1",
        scheme: "http",
        projectHeaderName: PROJECT_HEADER,
        responseHeaderName: OUTPUT_TREE_HEADER,
        responseHeaderValue: tree.treeDigest,
        requiredRuntimePaths: requiredPaths,
        requiredRuntimePathsServedByBothBrowsers: true,
        servedResponseCount: byProject.reduce((sum, entry) => sum + entry.servedResponseCount, 0),
        unattributedResponseCount,
        servedArtifactCount: servedArtifacts.length,
        servedArtifacts,
        servedArtifactsByProject: Object.freeze(byProject),
        perBrowserServedBodyManifestsEqual: true,
        servedBodyManifestDigest: fileTreeDigest(servedArtifacts, "sha256-served-body-manifest-v1"),
        allServedBodiesMatchedOutputTree: true,
        singleOutputTreeServedWithoutRebuild: true
      });
    }
  });
}

async function probeBrowser(definition, origin, expectedIndex, expectedTreeDigest) {
  const browser = await chromium.launch({ channel: definition.channel, headless: true });
  try {
    const version = browser.version();
    const context = await browser.newContext({
      extraHTTPHeaders: { [PROJECT_HEADER]: definition.projectName }
    });
    try {
      const page = await context.newPage();
      const consoleProblems = [];
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") consoleProblems.push(message.type());
      });
      page.on("pageerror", () => consoleProblems.push("pageerror"));
      const response = await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
      if (!response || response.status() !== 200) throw new Error("browser bootstrap did not receive index.html");
      await page.locator("#workspace-status").waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForFunction(() => document.querySelector("#workspace-status")?.getAttribute("data-state") === "ready");
      const body = await response.body();
      const bodyObservation = {
        path: "index.html",
        bytes: body.byteLength,
        sha256: sha256Bytes(body)
      };
      if (canonicalStringify(bodyObservation) !== canonicalStringify(expectedIndex)) {
        throw new Error("browser-observed index response body mismatches output manifest");
      }
      const outputTreeHeader = response.headers()[OUTPUT_TREE_HEADER];
      if (outputTreeHeader !== expectedTreeDigest || consoleProblems.length !== 0) {
        throw new Error("browser bootstrap header or console boundary failed");
      }
      return Object.freeze({
        version,
        pageTitle: await page.title(),
        pageUrl: page.url(),
        outputTreeHeader,
        responseBody: Object.freeze(bodyObservation),
        consoleWarningOrErrorCount: 0
      });
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

function combineBrowserProbes(before, after) {
  return PROJECTS.map((definition) => {
    const first = before.find((entry) => entry.projectName === definition.projectName)?.observation;
    const second = after.find((entry) => entry.projectName === definition.projectName)?.observation;
    if (!first || !second || first.version !== second.version) throw new Error("browser version changed during matrix");
    return Object.freeze({
      projectName: definition.projectName,
      channel: definition.channel,
      browserProduct: definition.browserProduct,
      versionBefore: first.version,
      versionAfter: second.version,
      prePostVersionEqual: true,
      pageTitleBefore: first.pageTitle,
      pageTitleAfter: second.pageTitle,
      pageUrlBefore: first.pageUrl,
      pageUrlAfter: second.pageUrl,
      outputTreeHeaderBefore: first.outputTreeHeader,
      outputTreeHeaderAfter: second.outputTreeHeader,
      headerMatchedBefore: true,
      headerMatchedAfter: true,
      responseBodyBefore: first.responseBody,
      responseBodyAfter: second.responseBody,
      responseBodyMatchedOutputTreeBefore: true,
      responseBodyMatchedOutputTreeAfter: true,
      consoleWarningOrErrorCountBefore: first.consoleWarningOrErrorCount,
      consoleWarningOrErrorCountAfter: second.consoleWarningOrErrorCount
    });
  });
}

function parseSanitizedSummary(summaryPath) {
  const bytes = readFileSync(summaryPath);
  if (bytes.byteLength > 256 * 1024) throw new Error("sanitized Playwright sidecar exceeds its fixed limit");
  return JSON.parse(bytes.toString("utf8"));
}

async function main() {
  if (process.execArgv.length !== 0 || Object.hasOwn(process.env, "NODE_OPTIONS")
      || Object.hasOwn(process.env, "NODE_PATH")) {
    throw new Error("Node loader or execution options are not permitted for evidence capture");
  }
  const evidenceOutputPath = requiredEvidenceOutputPath();
  const ownedRoot = createOwnedTemporaryRoot();
  let evidenceServer;
  let cleanupCompleted = false;
  try {
    const outDir = createOwnedChildDirectory(ownedRoot, "build-output");
    const cacheDir = createOwnedChildDirectory(ownedRoot, "vite-cache");
    const playwrightOutDir = createOwnedChildDirectory(ownedRoot, "playwright-output");
    const reportDir = createOwnedChildDirectory(ownedRoot, "sidecar");
    const summaryPath = path.join(reportDir, "summary.json");
    failureStageCode = "ASSERTION_CONTRACT_CHECK_FAILED_CLOSED";
    inspectWorkspaceE2eAssertionContract(workspaceRoot);
    failureStageCode = "TOOL_IDENTITY_CHECK_FAILED_CLOSED";
    const viteVersion = readPackageVersion("apps/web/node_modules/vite/package.json");
    const playwrightVersion = readPackageVersion("node_modules/@playwright/test/package.json");
    if (viteVersion !== "7.3.6" || playwrightVersion !== "1.62.1" || process.versions.node !== "24.16.0") {
      throw new Error("fixed Node/Vite/Playwright tool identity is unavailable");
    }
    failureStageCode = "SOURCE_GRAPH_BEFORE_FAILED_CLOSED";
    const sourceBefore = sourceSnapshot();
    const evidenceToolingBefore = evidenceToolingSnapshot();
    const environment = {
      ...process.env,
      HAKIMI_ZIWEI_EVIDENCE_TEMP_ROOT: ownedRoot.root,
      HAKIMI_ZIWEI_EVIDENCE_OUT_DIR: outDir,
      HAKIMI_ZIWEI_EVIDENCE_CACHE_DIR: cacheDir
    };
    failureStageCode = "ISOLATED_VITE_BUILD_FAILED_CLOSED";
    const build = spawnSync(process.execPath, [
      "apps/web/node_modules/vite/bin/vite.js",
      "build",
      "--config",
      "packages/ziwei-workspace-artifact-draft/vite.same-artifact-evidence.config.mjs",
      "--configLoader",
      "runner"
    ], {
      cwd: workspaceRoot,
      env: environment,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
      timeout: 10 * 60 * 1000
    });
    if (build.status !== 0) throw new Error(`isolated Vite build failed with exit ${String(build.status)}`);
    const buildOutput = `${build.stdout ?? ""}\n${build.stderr ?? ""}`.replace(/\u001b\[[0-9;]*m/gu, "");
    const transformedMatch = buildOutput.match(/(\d+) modules transformed/u);
    if (!transformedMatch) throw new Error("isolated Vite build did not report a module count");
    const transformedModuleCount = Number.parseInt(transformedMatch[1], 10);
    failureStageCode = "OUTPUT_TREE_BEFORE_FAILED_CLOSED";
    const outputTreeBefore = captureOutputTree(outDir);
    const indexBinding = outputTreeBefore.files.find((entry) => entry.path === "index.html");
    if (!indexBinding) throw new Error("controlled output lacks index.html");
    failureStageCode = "LOOPBACK_SERVER_START_FAILED_CLOSED";
    evidenceServer = await startStaticEvidenceServer(outDir, outputTreeBefore);
    failureStageCode = "PRE_MATRIX_BROWSER_PROBE_FAILED_CLOSED";
    const probeBefore = [];
    for (const project of PROJECTS) {
      probeBefore.push({
        projectName: project.projectName,
        observation: await probeBrowser(project, evidenceServer.origin, indexBinding, outputTreeBefore.treeDigest)
      });
    }
    const testEnvironment = {
      ...environment,
      HAKIMI_ZIWEI_EVIDENCE_BASE_URL: evidenceServer.origin,
      HAKIMI_ZIWEI_EVIDENCE_SUMMARY_PATH: summaryPath,
      HAKIMI_ZIWEI_EVIDENCE_PLAYWRIGHT_OUT_DIR: playwrightOutDir,
      HAKIMI_ZIWEI_EVIDENCE_CONFIG_PROBE: "0"
    };
    failureStageCode = "EDGE_CHROME_MATRIX_FAILED_CLOSED";
    const playwright = await runControlledChild([
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config",
      "packages/ziwei-workspace-artifact-draft/playwright.same-artifact-evidence.config.ts"
    ], {
      cwd: workspaceRoot,
      env: testEnvironment
    }, 46 * 60 * 1000);
    if (playwright.status !== 0 || playwright.timedOut || playwright.signal !== null) {
      throw new Error(`exact Edge/Chrome matrix failed with exit ${String(playwright.status)}`);
    }
    failureStageCode = "SANITIZED_SUMMARY_READ_FAILED_CLOSED";
    const sanitizedSummary = parseSanitizedSummary(summaryPath);
    failureStageCode = "POST_MATRIX_BROWSER_PROBE_FAILED_CLOSED";
    const probeAfter = [];
    for (const project of PROJECTS) {
      probeAfter.push({
        projectName: project.projectName,
        observation: await probeBrowser(project, evidenceServer.origin, indexBinding, outputTreeBefore.treeDigest)
      });
    }
    failureStageCode = "SERVED_BODY_LEDGER_FAILED_CLOSED";
    const serverObservation = evidenceServer.summarize();
    await evidenceServer.close();
    evidenceServer = undefined;
    failureStageCode = "OUTPUT_SOURCE_GRAPH_AFTER_FAILED_CLOSED";
    const outputTreeAfter = captureOutputTree(outDir);
    const sourceAfter = sourceSnapshot();
    const evidenceToolingAfter = evidenceToolingSnapshot();
    const observedAt = new Date().toISOString();
    failureStageCode = "RUNTIME_NORMALIZATION_FAILED_CLOSED";
    const runtime = normalizeRuntimeObservation({
      schemaVersion: ZIWEI_SAME_ARTIFACT_RUNTIME_SCHEMA,
      observedAt,
      nodeVersion: process.versions.node,
      viteVersion,
      playwrightVersion,
      buildExecutionCount: 1,
      buildExitCode: 0,
      transformedModuleCount,
      sourceGraphDigestBefore: sourceBefore.graphDigest,
      sourceGraphDigestAfter: sourceAfter.graphDigest,
      sourceGraphPrePostDigestEqual: sourceBefore.graphDigest === sourceAfter.graphDigest,
      evidenceToolGraphDigestBefore: evidenceToolingBefore.graphDigest,
      evidenceToolGraphDigestAfter: evidenceToolingAfter.graphDigest,
      evidenceToolGraphPrePostDigestEqual:
        evidenceToolingBefore.graphDigest === evidenceToolingAfter.graphDigest,
      outputTreeBefore,
      outputTreeAfter,
      outputTreePrePostDigestEqual: canonicalStringify(outputTreeBefore) === canonicalStringify(outputTreeAfter),
      server: serverObservation,
      browserProbes: combineBrowserProbes(probeBefore, probeAfter),
      playwrightSummary: sanitizedSummary,
      dataHandling: {
        syntheticInputsOnly: true,
        actualPersonDataEntered: false,
        candidateAnonymous: false,
        rawBirthInputIncluded: false,
        derivedChartDigestIncluded: false,
        feedbackNarrativeIncluded: false,
        backupBodyOrDigestIncluded: false,
        revisionOrStudyIdentifiersIncluded: false,
        screenshotTraceVideoOrDownloadIncluded: false,
        rawPlaywrightReportIncluded: false,
        safeToLog: false,
        safeToPublish: false
      }
    });
    failureStageCode = "RAW_TEMP_EVIDENCE_CLEANUP_FAILED_CLOSED";
    cleanupOwnedTemporaryRoot(ownedRoot);
    cleanupCompleted = true;
    failureStageCode = "RUNTIME_RECEIPT_WRITE_FAILED_CLOSED";
    writeFileSync(evidenceOutputPath, `${JSON.stringify(runtime, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    process.stdout.write(`${JSON.stringify({
      status: "isolated_same_artifact_observation_passed",
      evidenceOutputPath,
      outputTreeDigest: runtime.outputTreeBefore.treeDigest,
      chromeVersion: runtime.browserProbes.find((entry) => entry.projectName === "chrome")?.versionBefore,
      edgeVersion: runtime.browserProbes.find((entry) => entry.projectName === "msedge")?.versionBefore,
      passedOutcomeCount: runtime.playwrightSummary.passedOutcomeCount,
      rawPersonalOrDerivedEvidenceIncludedInReceipt: false,
      runnerOwnedTempTreeCleanupCompleted: true
    })}\n`);
  } finally {
    if (evidenceServer) await evidenceServer.close().catch(() => undefined);
    if (!cleanupCompleted) cleanupOwnedTemporaryRoot(ownedRoot);
  }
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: "isolated_same_artifact_observation_failed",
    errorCode: failureStageCode,
    errorClass: error instanceof Error ? error.name : "NonErrorFailure",
    validationCode: error instanceof ZiweiSameArtifactObservationError ? error.code : null
  })}\n`);
  process.exitCode = 1;
});
