import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync
} from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectWesternAuthoredBuildSourceSnapshot,
  collectWesternLockedBuildInputSnapshot,
  collectWesternOutputTree,
  deriveWesternEvidenceOnlyOutputBodyProbePaths,
  deriveWesternRequiredRuntimePaths,
  deriveWesternScenarioRuntimePaths,
  verifyWesternBuildManifest,
  westernSameArtifactTestOnly
} from "./western-civil-time-same-artifact-browser-observation-lib.mjs";
import {
  buildExpectedWesternSameArtifactV11Candidate,
  collectWesternSameArtifactV11ToolSnapshot,
  serializeWesternSameArtifactV11Candidate
} from "./western-civil-time-same-artifact-browser-observation-v1-1-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = realpathSync.native(path.resolve(scriptDirectory, ".."));
const originalSystemTempRoot = realpathSync.native(os.tmpdir());
const PROJECT_HEADER = "x-hakimi-western-evidence-project";
const TOKEN_HEADER = "x-hakimi-western-evidence-run-token";
const TOKEN_DOMAIN = "hakimi.western.same-artifact.project-token.v1\0";
const OUTPUT_TREE_HEADER = "x-hakimi-western-output-tree-sha256";
const activeChildren = new Set();
let failureStage = "INITIALIZATION_FAILED_CLOSED";

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function compact(value) {
  if (Array.isArray(value)) return `[${value.map(compact).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${compact(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function token(rawNonce, projectName) {
  return createHmac("sha256", Buffer.from(rawNonce, "hex"))
    .update(`${TOKEN_DOMAIN}${projectName}`, "utf8").digest("hex");
}

export function classifyWesternV11ProjectCredential(projectName, suppliedToken, expectedTokens) {
  if (typeof projectName !== "string" || typeof suppliedToken !== "string") return "missing";
  if (!Object.hasOwn(expectedTokens, projectName)) return "invalid_project";
  if (suppliedToken === expectedTokens[projectName]) return "accepted";
  if (Object.values(expectedTokens).includes(suppliedToken)) return "cross_project";
  return "replayed_or_stale";
}

function samePath(left, right) {
  const a = path.normalize(left);
  const b = path.normalize(right);
  return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}
function createOwnedRoot() {
  const root = path.join(originalSystemTempRoot, `hakimi-western-same-artifact-${randomUUID()}`);
  if (existsSync(root) || !samePath(realpathSync.native(path.dirname(root)), originalSystemTempRoot)) {
    throw new Error("owned root endpoint invalid");
  }
  mkdirSync(root);
  if (!lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()
      || !samePath(realpathSync.native(root), root)) throw new Error("owned root identity invalid");
  return root;
}
function childDirectory(root, leaf) {
  const absolute = path.join(root, leaf);
  mkdirSync(absolute);
  if (!samePath(realpathSync.native(absolute), absolute) || lstatSync(absolute).isSymbolicLink()) {
    throw new Error("owned child directory invalid");
  }
  return absolute;
}
function cleanupOwnedRoot(root) {
  if (!/^hakimi-western-same-artifact-[a-f0-9-]{36}$/u.test(path.basename(root))
      || !samePath(realpathSync.native(path.dirname(root)), originalSystemTempRoot)) {
    throw new Error("cleanup target invalid");
  }
  if (existsSync(root)) rmSync(root, { recursive: true, force: false });
}
function childEnvironment(root, extra = {}) {
  const result = { ...process.env, ...extra, TEMP: root, TMP: root, TMPDIR: root, NO_COLOR: "1" };
  delete result.NODE_OPTIONS;
  delete result.NODE_PATH;
  return result;
}

function runChild(args, { env, timeoutMs, captureOutput = false }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: workspaceRoot,
      env,
      windowsHide: true,
      stdio: ["ignore", captureOutput ? "pipe" : "ignore", captureOutput ? "pipe" : "ignore"]
    });
    activeChildren.add(child);
    const chunks = [];
    if (captureOutput) {
      child.stdout.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      child.stderr.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    }
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeoutMs);
    child.once("error", (error) => { clearTimeout(timer); activeChildren.delete(child); reject(error); });
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      activeChildren.delete(child);
      resolve({ status, signal, timedOut, output: Buffer.concat(chunks).toString("utf8") });
    });
  });
}
async function stopChildren() {
  for (const child of activeChildren) child.kill("SIGKILL");
  await Promise.all([...activeChildren].map((child) => new Promise((resolve) => child.once("close", resolve))));
}

function classifyTarget(method, rawTarget, runtimePaths, probePath) {
  if (method !== "GET" || typeof rawTarget !== "string") return { kind: "unexpected" };
  if (rawTarget === "/favicon.ico") return { kind: "favicon" };
  if (rawTarget === "/") return { kind: "body", path: "index.html" };
  for (const item of runtimePaths) if (item !== "index.html" && rawTarget === `/${item}`) return { kind: "body", path: item };
  if (rawTarget === `/${probePath}?hakimi-western-evidence-only=1`) return { kind: "body", path: probePath };
  return { kind: "unexpected" };
}

async function startServer(outDir, tree, rawNonce) {
  const runtimePaths = deriveWesternScenarioRuntimePaths(tree);
  const requiredRuntimePaths = deriveWesternRequiredRuntimePaths(tree);
  const probePaths = deriveWesternEvidenceOnlyOutputBodyProbePaths(tree);
  const bodyPaths = [...runtimePaths, ...probePaths];
  const treeByPath = new Map(tree.files.map((entry) => [entry.path, entry]));
  const held = new Map(bodyPaths.map((relativePath) => {
    const bytes = readFileSync(path.join(outDir, ...relativePath.split("/")));
    const expected = treeByPath.get(relativePath);
    if (!expected || bytes.byteLength !== expected.bytes || sha256(bytes) !== expected.sha256) {
      throw new Error("held body mismatched output tree");
    }
    return [relativePath, { bytes, identity: expected }];
  }));
  const expectedTokens = Object.freeze({ chrome: token(rawNonce, "chrome"), msedge: token(rawNonce, "msedge") });
  const ledgers = new Map(["chrome", "msedge"].map((projectName) => [projectName, new Map()]));
  const counters = {
    missing: 0, invalid_project: 0, cross_project: 0, replayed_or_stale: 0,
    unexpected: 0, bodyMismatch: 0
  };
  const server = http.createServer((request, response) => {
    const projectName = request.headers[PROJECT_HEADER];
    const suppliedToken = request.headers[TOKEN_HEADER];
    const credential = classifyWesternV11ProjectCredential(projectName, suppliedToken, expectedTokens);
    if (credential !== "accepted") {
      counters[credential] += 1;
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("run-bound project credential rejected");
      return;
    }
    const target = classifyTarget(request.method, request.url, runtimePaths, probePaths[0]);
    if (target.kind === "favicon") {
      response.writeHead(204, { "cache-control": "no-store", "x-content-type-options": "nosniff" });
      response.end();
      return;
    }
    if (target.kind !== "body") {
      counters.unexpected += 1;
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not in controlled body set");
      return;
    }
    const body = held.get(target.path);
    if (!body || body.bytes.byteLength !== body.identity.bytes || sha256(body.bytes) !== body.identity.sha256) {
      counters.bodyMismatch += 1;
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("held body identity drifted");
      return;
    }
    const ledger = ledgers.get(projectName);
    const previous = ledger.get(target.path);
    ledger.set(target.path, { ...body.identity, responseCount: (previous?.responseCount ?? 0) + 1 });
    const evidenceOnly = target.path === probePaths[0];
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
      "content-type": evidenceOnly ? "text/plain; charset=utf-8"
        : target.path.endsWith(".html") ? "text/html; charset=utf-8"
          : target.path.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8",
      ...(evidenceOnly ? { "content-disposition": "inline" } : {}),
      "x-content-type-options": "nosniff",
      [OUTPUT_TREE_HEADER]: tree.treeDigest
    });
    response.end(body.bytes);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1") throw new Error("server address invalid");
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    port: address.port,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
    summarize(nonceCommitment) {
      if (Object.values(counters).some((value) => value !== 0)) throw new Error("controlled request rejection observed");
      const servedArtifactsByProject = ["chrome", "msedge"].map((projectName) => {
        const files = [...ledgers.get(projectName).values()].sort((a, b) => a.path < b.path ? -1 : 1);
        if (files.length !== 5 || !bodyPaths.every((item) => files.some((file) => file.path === item))) {
          throw new Error("served body path set incomplete");
        }
        const identities = files.map(({ path: filePath, bytes, sha256: digest }) => ({
          path: filePath, bytes, sha256: digest
        }));
        return {
          projectName,
          servedResponseCount: files.reduce((sum, file) => sum + file.responseCount, 0),
          files,
          bodyManifestDigest: sha256(Buffer.from(
            `hakimi.western.same-artifact-v1.1-served-bodies\0${compact(identities)}`, "utf8"
          ))
        };
      });
      if (servedArtifactsByProject[0].bodyManifestDigest !== servedArtifactsByProject[1].bodyManifestDigest) {
        throw new Error("cross-project body manifests differ");
      }
      return {
        origin,
        host: "127.0.0.1",
        projectHeaderName: PROJECT_HEADER,
        tokenHeaderName: TOKEN_HEADER,
        tokenDerivation: "hmac-sha256-256-bit-run-nonce-domain-plus-project-v1",
        runNonceCommitment: nonceCommitment,
        rawNoncePersisted: false,
        projectTokenCommitments: ["chrome", "msedge"].map((projectName) => ({
          projectName, tokenSha256: sha256(Buffer.from(expectedTokens[projectName], "utf8"))
        })),
        outputTreeDigest: tree.treeDigest,
        requiredRuntimePaths,
        scenarioRuntimePaths: runtimePaths,
        evidenceOnlyOutputBodyProbePaths: probePaths,
        servedArtifactsByProject,
        servedResponseCount: servedArtifactsByProject.reduce((sum, item) => sum + item.servedResponseCount, 0),
        missingCredentialResponseCount: 0,
        invalidProjectResponseCount: 0,
        crossProjectTokenRejectedCount: 0,
        replayedOrStaleTokenRejectedCount: 0,
        unexpectedResponseCount: 0,
        bodyMismatchResponseCount: 0,
        allServedBodiesMatchedOutputTree: true,
        perBrowserServedBodyManifestsEqual: true,
        singleHeldOutputTreeServedWithoutRebuild: true
      };
    }
  };
}

async function portReleased(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
}
async function browserVersion(channel, environment) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel, headless: true, env: environment });
  try { return browser.version(); } finally { await browser.close(); }
}
async function versions(environment) {
  return [
    { projectName: "chrome", channel: "chrome", version: await browserVersion("chrome", environment) },
    { projectName: "msedge", channel: "msedge", version: await browserVersion("msedge", environment) }
  ];
}
function combineVersions(before, after) {
  return before.map((entry) => {
    const later = after.find((item) => item.projectName === entry.projectName);
    if (!later || later.version !== entry.version || !/^\d+(?:\.\d+){1,3}$/u.test(entry.version)) {
      throw new Error("browser probe version changed");
    }
    return { projectName: entry.projectName, channel: entry.channel,
      versionBefore: entry.version, versionAfter: later.version };
  });
}
function transformedCount(output) {
  const plain = output.replace(/\u001b\[[0-9;]*m/gu, "");
  const match = [...plain.matchAll(/(?:^|\s)(\d+) modules transformed(?:\.|\s|$)/gu)];
  if (match.length !== 1 || Number.parseInt(match[0][1], 10) !== 88) throw new Error("module count drifted");
  return 88;
}
function versionFromPackage(relativePath) {
  return JSON.parse(readFileSync(path.join(workspaceRoot, ...relativePath.split("/")), "utf8")).version;
}

export async function runWesternSameArtifactV11() {
  if (process.execArgv.length !== 0 || process.argv.length !== 2
      || Object.hasOwn(process.env, "NODE_OPTIONS") || Object.hasOwn(process.env, "NODE_PATH")) {
    throw new Error("operands or Node loader environment forbidden");
  }
  const candidatePath = path.join(originalSystemTempRoot, `hakimi-western-same-artifact-v1-1-${randomUUID()}.json`);
  const ownedRoot = createOwnedRoot();
  const originalTemp = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR };
  process.env.TEMP = ownedRoot;
  process.env.TMP = ownedRoot;
  process.env.TMPDIR = ownedRoot;
  let server;
  let cleaned = false;
  try {
    const outDir = childDirectory(ownedRoot, `hakimi-western-facts-${randomUUID().replaceAll("-", "")}`);
    const cacheDir = childDirectory(ownedRoot, "vite-cache");
    const playwrightOut = childDirectory(ownedRoot, "playwright-output");
    const sidecar = childDirectory(ownedRoot, "sidecar");
    const summaryPath = path.join(sidecar, "summary.json");
    const rawNonce = randomBytes(32).toString("hex");
    const nonceCommitment = sha256(Buffer.from(rawNonce, "hex"));
    const baseEnvironment = childEnvironment(ownedRoot, {
      HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT: ownedRoot,
      HAKIMI_WESTERN_EVIDENCE_OUT_DIR: outDir,
      HAKIMI_WESTERN_EVIDENCE_CACHE_DIR: cacheDir,
      HAKIMI_WESTERN_FACT_ONLY_OUT_DIR: outDir
    });
    failureStage = "TOOL_AND_GRAPH_BEFORE_FAILED_CLOSED";
    const nodeVersion = process.versions.node;
    const viteVersion = versionFromPackage("apps/web/node_modules/vite/package.json");
    const playwrightVersion = versionFromPackage("node_modules/@playwright/test/package.json");
    if (nodeVersion !== "24.16.0" || viteVersion !== "7.3.6" || playwrightVersion !== "1.62.1") {
      throw new Error("runtime tool version drifted");
    }
    const sourceBefore = collectWesternAuthoredBuildSourceSnapshot(workspaceRoot);
    const lockedBefore = collectWesternLockedBuildInputSnapshot(workspaceRoot);
    const toolsBefore = collectWesternSameArtifactV11ToolSnapshot(workspaceRoot);
    failureStage = "SINGLE_VITE_BUILD_FAILED_CLOSED";
    const build = await runChild([
      "apps/web/node_modules/vite/bin/vite.js", "build", "--config",
      "isolated-drafts/western-civil-time-fact-browser-draft/vite.same-artifact-evidence.config.mjs",
      "--configLoader", "runner"
    ], { env: baseEnvironment, timeoutMs: 10 * 60_000, captureOutput: true });
    if (build.status !== 0 || build.signal !== null || build.timedOut) throw new Error("Vite build failed");
    const transformedModuleCount = transformedCount(build.output);
    const outputTreeBefore = collectWesternOutputTree(outDir);
    verifyWesternBuildManifest(outDir, outputTreeBefore, workspaceRoot);
    const ianaPath = deriveWesternEvidenceOnlyOutputBodyProbePaths(outputTreeBefore)[0];
    failureStage = "PRE_MATRIX_VERSION_PROBE_FAILED_CLOSED";
    const versionsBefore = await versions(baseEnvironment);
    server = await startServer(outDir, outputTreeBefore, rawNonce);
    const testEnvironment = childEnvironment(ownedRoot, {
      ...baseEnvironment,
      HAKIMI_WESTERN_EVIDENCE_BASE_URL: server.origin,
      HAKIMI_WESTERN_EVIDENCE_OUTPUT_TREE_SHA256: outputTreeBefore.treeDigest,
      HAKIMI_WESTERN_EVIDENCE_IANA_PATH: ianaPath,
      HAKIMI_WESTERN_EVIDENCE_SUMMARY_PATH: summaryPath,
      HAKIMI_WESTERN_EVIDENCE_PLAYWRIGHT_OUT_DIR: playwrightOut,
      HAKIMI_WESTERN_EVIDENCE_RUN_NONCE: rawNonce,
      HAKIMI_WESTERN_EVIDENCE_RUN_NONCE_COMMITMENT: nonceCommitment
    });
    failureStage = "NONCE_BOUND_EDGE_CHROME_MATRIX_FAILED_CLOSED";
    const matrix = await runChild([
      "node_modules/@playwright/test/cli.js", "test", "--config",
      "isolated-drafts/western-civil-time-fact-browser-draft/playwright.same-artifact-evidence-v1-1.config.ts"
    ], { env: testEnvironment, timeoutMs: 30 * 60_000, captureOutput: true });
    if (matrix.status !== 0 || matrix.signal !== null || matrix.timedOut) {
      throw new Error("nonce-bound Edge/Chrome matrix failed closed");
    }
    const playwrightSummary = westernSameArtifactTestOnly.parseStrictJsonBytes(
      readFileSync(summaryPath), "v1.1 Playwright summary"
    );
    failureStage = "POST_MATRIX_IDENTITY_AND_VERSION_FAILED_CLOSED";
    const versionsAfter = await versions(baseEnvironment);
    const browserProbes = combineVersions(versionsBefore, versionsAfter);
    const serverObservation = server.summarize(nonceCommitment);
    const usedPort = server.port;
    await server.close();
    server = undefined;
    await portReleased(usedPort);
    const outputTreeAfter = collectWesternOutputTree(outDir);
    const sourceAfter = collectWesternAuthoredBuildSourceSnapshot(workspaceRoot);
    const lockedAfter = collectWesternLockedBuildInputSnapshot(workspaceRoot);
    const toolsAfter = collectWesternSameArtifactV11ToolSnapshot(workspaceRoot);
    failureStage = "OWNED_TEMP_CLEANUP_FAILED_CLOSED";
    cleanupOwnedRoot(ownedRoot);
    cleaned = true;
    process.env.TEMP = originalTemp.TEMP;
    process.env.TMP = originalTemp.TMP;
    process.env.TMPDIR = originalTemp.TMPDIR;
    failureStage = "CANDIDATE_RENDER_FAILED_CLOSED";
    const observation = {
      observedAt: new Date().toISOString(), nodeVersion, viteVersion, playwrightVersion,
      nonceGeneration: { generator: "node_crypto_randomBytes_32", rawNoncePersisted: false,
        randomQualityAttested: false },
      runNonceCommitment: nonceCommitment,
      buildExecutionCount: 1, buildExitCode: 0, transformedModuleCount,
      sourceGraphDigestBefore: sourceBefore.graphDigest, sourceGraphDigestAfter: sourceAfter.graphDigest,
      lockedBuildInputGraphDigestBefore: lockedBefore.graphDigest,
      lockedBuildInputGraphDigestAfter: lockedAfter.graphDigest,
      evidenceToolGraphDigestBefore: toolsBefore.graphDigest,
      evidenceToolGraphDigestAfter: toolsAfter.graphDigest,
      outputTreeBefore, outputTreeAfter, server: serverObservation, browserProbes, playwrightSummary,
      cleanup: {
        viteCliExited: true, playwrightCliExited: true, browserVersionProbeHandlesClosed: true,
        runnerControlledChildProcessesStopped: activeChildren.size === 0, serverStopped: true,
        portReleased: true, temporaryRootRemoved: !existsSync(ownedRoot)
      }
    };
    const candidate = buildExpectedWesternSameArtifactV11Candidate(workspaceRoot, observation);
    const serialized = serializeWesternSameArtifactV11Candidate(candidate);
    writeFileSync(candidatePath, serialized, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`${JSON.stringify({
      status: "nonce_bound_in_matrix_chrome_edge_observation_passed",
      candidatePath,
      rawSha256: sha256(Buffer.from(serialized, "utf8")),
      observationDigest: candidate.observationDigest,
      outputTreeDigest: outputTreeAfter.treeDigest,
      chromeVersion: browserProbes[0].versionAfter,
      edgeVersion: browserProbes[1].versionAfter,
      passedOutcomeCount: 10,
      runNonceCommitment: nonceCommitment,
      admissionGatesSatisfied: 0,
      authorityRaised: false
    })}\n`);
    return candidatePath;
  } finally {
    if (server) await server.close().catch(() => undefined);
    await stopChildren().catch(() => undefined);
    if (!cleaned) cleanupOwnedRoot(ownedRoot);
    if (originalTemp.TEMP === undefined) delete process.env.TEMP; else process.env.TEMP = originalTemp.TEMP;
    if (originalTemp.TMP === undefined) delete process.env.TMP; else process.env.TMP = originalTemp.TMP;
    if (originalTemp.TMPDIR === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = originalTemp.TMPDIR;
  }
}

if (import.meta.main) {
  runWesternSameArtifactV11().catch((error) => {
    process.stderr.write(`${JSON.stringify({ status: "failed_closed", failureStage,
      error: error instanceof Error ? error.message : "unknown" })}\n`);
    process.exitCode = 1;
  });
}
