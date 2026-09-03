import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
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
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { renderWesternSameArtifactCandidate } from
  "./render-western-civil-time-same-artifact-browser-observation-candidate.mjs";
import {
  WesternSameArtifactObservationError,
  collectWesternAuthoredBuildSourceSnapshot,
  collectWesternEvidenceToolSnapshot,
  collectWesternFormalContextSnapshot,
  collectWesternLockedBuildInputSnapshot,
  collectWesternOutputTree,
  deriveWesternEvidenceOnlyOutputBodyProbePaths,
  deriveWesternRequiredRuntimePaths,
  deriveWesternScenarioRuntimePaths,
  inspectWesternE2EAssertionContract,
  verifyWesternBuildManifest,
  westernSameArtifactTestOnly
} from "./western-civil-time-same-artifact-browser-observation-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = realpathSync.native(path.resolve(scriptDirectory, ".."));
const originalSystemTempRoot = realpathSync.native(os.tmpdir());
const PROJECT_HEADER = "x-hakimi-western-evidence-project";
const OUTPUT_TREE_HEADER = "x-hakimi-western-output-tree-sha256";
const IANA_PROBE_QUERY = "?hakimi-western-evidence-only=1";
const PROJECTS = Object.freeze([
  Object.freeze({ projectName: "chrome", channel: "chrome", browserProduct: "Google Chrome" }),
  Object.freeze({ projectName: "msedge", channel: "msedge", browserProduct: "Microsoft Edge" })
]);
const SCENARIO_IDS = Object.freeze([
  "unique", "gap", "overlap_reject", "overlap_earlier", "overlap_later"
]);
const SERVED_BODY_LEDGER_FAILURE_REASONS = Object.freeze([
  "per_browser_runtime_path_set",
  "per_browser_probe_path_set",
  "per_browser_probe_response_count",
  "per_browser_count_inconsistent",
  "per_browser_default_favicon_response_count",
  "cross_browser_manifest_mismatch",
  "aggregate_default_favicon_response_count",
  "unattributed_response",
  "unexpected_response",
  "body_mismatch",
  "unmarked_probe"
]);
const PER_BROWSER_LEDGER_FAILURE_REASONS = Object.freeze([
  "per_browser_runtime_path_set",
  "per_browser_probe_path_set",
  "per_browser_probe_response_count",
  "per_browser_count_inconsistent",
  "per_browser_default_favicon_response_count"
]);
const activeChildren = new Set();
let failureStageCode = "INITIALIZATION_FAILED_CLOSED";
let failureProject = null;
let failureScenarioId = null;
let failureStatus = null;
let servedBodyLedgerDiagnostic = null;

export function normalizeServedBodyLedgerDiagnostic(value) {
  const keys = [
    "actualCount",
    "bodyMismatchResponseCount",
    "browserDefaultFaviconControlledResponseCount",
    "expectedCount",
    "failureReason",
    "projectName",
    "unattributedResponseCount",
    "unexpectedResponseCount",
    "unmarkedProbeResponseCount"
  ];
  if (!exactObjectKeys(value, keys)
      || !SERVED_BODY_LEDGER_FAILURE_REASONS.includes(value.failureReason)
      || !Number.isSafeInteger(value.expectedCount) || value.expectedCount < 0
      || !Number.isSafeInteger(value.actualCount) || value.actualCount < 0
      || !Number.isSafeInteger(value.unattributedResponseCount) || value.unattributedResponseCount < 0
      || !Number.isSafeInteger(value.unexpectedResponseCount) || value.unexpectedResponseCount < 0
      || !Number.isSafeInteger(value.bodyMismatchResponseCount) || value.bodyMismatchResponseCount < 0
      || !Number.isSafeInteger(value.browserDefaultFaviconControlledResponseCount)
      || value.browserDefaultFaviconControlledResponseCount < 0
      || !Number.isSafeInteger(value.unmarkedProbeResponseCount) || value.unmarkedProbeResponseCount < 0) {
    throw new Error("served-body ledger diagnostic shape invalid");
  }
  const projectRequired = PER_BROWSER_LEDGER_FAILURE_REASONS.includes(value.failureReason);
  if ((projectRequired && !PROJECTS.some((entry) => entry.projectName === value.projectName))
      || (!projectRequired && value.projectName !== null)) {
    throw new Error("served-body ledger diagnostic project invalid");
  }
  return Object.freeze({
    failureReason: value.failureReason,
    projectName: value.projectName,
    expectedCount: value.expectedCount,
    actualCount: value.actualCount,
    unattributedResponseCount: value.unattributedResponseCount,
    unexpectedResponseCount: value.unexpectedResponseCount,
    bodyMismatchResponseCount: value.bodyMismatchResponseCount,
    browserDefaultFaviconControlledResponseCount: value.browserDefaultFaviconControlledResponseCount,
    unmarkedProbeResponseCount: value.unmarkedProbeResponseCount
  });
}

function samePath(left, right) {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function toWorkspaceIdentifier(absolutePath) {
  const resolved = path.resolve(absolutePath);
  const relative = path.relative(workspaceRoot, resolved);
  if (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("runtime tool resolution escaped the workspace");
  }
  return relative.replaceAll("\\", "/");
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function classifyControlledRequestTarget(method, rawTarget, scenarioRuntimePaths, ianaPath) {
  if (method !== "GET" || typeof rawTarget !== "string"
      || !Array.isArray(scenarioRuntimePaths) || typeof ianaPath !== "string") {
    return Object.freeze({ kind: "unexpected" });
  }
  if (rawTarget === "/favicon.ico") {
    return Object.freeze({ kind: "browser_default_favicon" });
  }
  if (rawTarget === "/" && scenarioRuntimePaths.includes("index.html")) {
    return Object.freeze({ kind: "scenario_runtime", relativePath: "index.html" });
  }
  for (const relativePath of scenarioRuntimePaths) {
    if (relativePath !== "index.html" && rawTarget === `/${relativePath}`) {
      return Object.freeze({ kind: "scenario_runtime", relativePath });
    }
  }
  const exactIanaOriginPath = `/${ianaPath}`;
  if (rawTarget === `${exactIanaOriginPath}${IANA_PROBE_QUERY}`) {
    return Object.freeze({ kind: "evidence_only_probe", relativePath: ianaPath });
  }
  if (rawTarget === exactIanaOriginPath || rawTarget.startsWith(`${exactIanaOriginPath}?`)) {
    return Object.freeze({ kind: "unmarked_probe" });
  }
  return Object.freeze({ kind: "unexpected" });
}

function directoryIdentity(directory) {
  const stat = lstatSync(directory, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("temporary endpoint is not a real directory");
  }
  return Object.freeze({ dev: stat.dev, ino: stat.ino, mode: stat.mode });
}

function createOwnedTemporaryRoot() {
  const root = path.join(originalSystemTempRoot, `hakimi-western-same-artifact-${randomUUID()}`);
  mkdirSync(root, { recursive: false });
  const real = realpathSync.native(root);
  const relative = path.relative(originalSystemTempRoot, real);
  if (!samePath(root, real) || relative.length === 0 || relative.startsWith("..")
      || path.isAbsolute(relative)) {
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
  if (!samePath(directory, real) || relative !== leaf) {
    throw new Error("temporary child escaped its owner root");
  }
  return real;
}

function assertOwnedTreeSafe(directory, ownedRoot) {
  const rootStat = lstatSync(ownedRoot.root, { bigint: true });
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()
      || rootStat.dev !== ownedRoot.identity.dev || rootStat.ino !== ownedRoot.identity.ino
      || rootStat.mode !== ownedRoot.identity.mode
      || !samePath(realpathSync.native(ownedRoot.root), ownedRoot.root)) {
    throw new Error("runner-owned temporary root identity changed; cleanup refused");
  }
  const visit = (current) => {
    const currentStat = lstatSync(current);
    if (!currentStat.isDirectory() || currentStat.isSymbolicLink()) {
      throw new Error("runner-owned temporary tree contains a link or non-directory container");
    }
    const real = realpathSync.native(current);
    const relative = path.relative(ownedRoot.root, real);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("temporary tree escaped its owner root");
    }
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
  rmSync(ownedRoot.root, { recursive: true, force: false, maxRetries: 2, retryDelay: 100 });
  if (existsSync(ownedRoot.root)) throw new Error("runner-owned temporary root remained after cleanup");
}

function isolatedEnvironment(ownedRoot, extra = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_PATH;
  Object.assign(environment, {
    TEMP: ownedRoot.root,
    TMP: ownedRoot.root,
    TMPDIR: ownedRoot.root,
    ...extra
  });
  return environment;
}

function restoreProcessTempEnvironment(originalTemp, originalTmp, originalTmpDir) {
  if (originalTemp === undefined) delete process.env.TEMP;
  else process.env.TEMP = originalTemp;
  if (originalTmp === undefined) delete process.env.TMP;
  else process.env.TMP = originalTmp;
  if (originalTmpDir === undefined) delete process.env.TMPDIR;
  else process.env.TMPDIR = originalTmpDir;
}

function runControlledChild(args, options, { timeoutMs, captureOutput = false, outputLimit = 0 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      ...options,
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "ignore",
      windowsHide: true
    });
    activeChildren.add(child);
    let timedOut = false;
    let outputExceeded = false;
    let capturedBytes = 0;
    const chunks = [];
    const capture = (chunk) => {
      capturedBytes += chunk.byteLength;
      if (capturedBytes > outputLimit) {
        outputExceeded = true;
        child.kill("SIGKILL");
        return;
      }
      chunks.push(Buffer.from(chunk));
    };
    if (captureOutput) {
      child.stdout.on("data", capture);
      child.stderr.on("data", capture);
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.once("error", () => {
      clearTimeout(timer);
      activeChildren.delete(child);
      reject(new Error("controlled child launch failed"));
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      activeChildren.delete(child);
      resolve(Object.freeze({
        status: code,
        signal,
        timedOut,
        outputExceeded,
        output: captureOutput ? Buffer.concat(chunks).toString("utf8") : ""
      }));
    });
  });
}

async function stopControlledChildren() {
  const pending = [...activeChildren];
  for (const child of pending) child.kill("SIGKILL");
  await Promise.all(pending.map((child) => new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, 10_000);
    child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  })));
  if (activeChildren.size !== 0) throw new Error("runner-controlled child process remained active");
}

function readPackageVersion(identifier) {
  const parsed = JSON.parse(readFileSync(path.join(workspaceRoot, ...identifier.split("/")), "utf8"));
  if (typeof parsed.version !== "string") throw new Error("runtime tool package version missing");
  return parsed.version;
}

function resolveRuntimeTools() {
  const vitePackageIdentifier = "apps/web/node_modules/vite/package.json";
  const viteCliIdentifier = "apps/web/node_modules/vite/bin/vite.js";
  const requireFromVite = createRequire(path.join(workspaceRoot, ...vitePackageIdentifier.split("/")));
  const resolved = {
    vitePackage: toWorkspaceIdentifier(requireFromVite.resolve("vite/package.json")),
    esbuildPackage: toWorkspaceIdentifier(requireFromVite.resolve("esbuild/package.json")),
    esbuildEntry: toWorkspaceIdentifier(requireFromVite.resolve("esbuild")),
    rollupPackage: toWorkspaceIdentifier(requireFromVite.resolve("rollup/package.json")),
    rollupEntry: toWorkspaceIdentifier(requireFromVite.resolve("rollup"))
  };
  const expected = {
    vitePackage: vitePackageIdentifier,
    esbuildPackage: "node_modules/esbuild/package.json",
    esbuildEntry: "node_modules/esbuild/lib/main.js",
    rollupPackage: "node_modules/rollup/package.json",
    rollupEntry: "node_modules/rollup/dist/rollup.js"
  };
  if (JSON.stringify(resolved) !== JSON.stringify(expected)
      || !existsSync(path.join(workspaceRoot, ...viteCliIdentifier.split("/")))) {
    throw new Error("Vite-anchored runtime tool resolution drifted");
  }
  return Object.freeze({
    resolutionAnchorIdentifier: vitePackageIdentifier,
    viteCliIdentifier,
    viteConfigLoader: "runner",
    tools: Object.freeze([
      Object.freeze({
        role: "esbuild",
        resolutionMode: "resolved_from_vite_package_anchor",
        packageIdentifier: resolved.esbuildPackage,
        entryIdentifier: resolved.esbuildEntry,
        version: readPackageVersion(resolved.esbuildPackage)
      }),
      Object.freeze({
        role: "rollup",
        resolutionMode: "resolved_from_vite_package_anchor",
        packageIdentifier: resolved.rollupPackage,
        entryIdentifier: resolved.rollupEntry,
        version: readPackageVersion(resolved.rollupPackage)
      }),
      Object.freeze({
        role: "vite",
        resolutionMode: "explicit_workspace_relative_cli",
        packageIdentifier: resolved.vitePackage,
        entryIdentifier: viteCliIdentifier,
        version: readPackageVersion(resolved.vitePackage)
      })
    ]),
    completeInstalledRuntimeDependencyClosureBound: false
  });
}

function contentType(relativePath) {
  if (relativePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (relativePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (relativePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

function updateArtifactLedger(ledger, identity) {
  const previous = ledger.get(identity.path);
  if (previous && (previous.bytes !== identity.bytes || previous.sha256 !== identity.sha256)) {
    throw new Error("served body variant changed within one browser ledger");
  }
  ledger.set(identity.path, Object.freeze({
    ...identity,
    responseCount: (previous?.responseCount ?? 0) + 1
  }));
}

async function startStaticEvidenceServer(outDir, outputTree) {
  const outputByPath = new Map(outputTree.files.map((entry) => [entry.path, entry]));
  const scenarioRuntimePaths = deriveWesternScenarioRuntimePaths(outputTree);
  const requiredRuntimePaths = deriveWesternRequiredRuntimePaths(outputTree);
  const evidenceOnlyPaths = deriveWesternEvidenceOnlyOutputBodyProbePaths(outputTree);
  const ianaPath = evidenceOnlyPaths[0];
  const heldOutputBodies = new Map([...scenarioRuntimePaths, ...evidenceOnlyPaths].map((relativePath) => {
    const binding = outputByPath.get(relativePath);
    if (!binding) throw new Error("controlled served-body binding is missing");
    const absolute = path.join(outDir, ...relativePath.split("/"));
    const real = realpathSync.native(absolute);
    const relativeToOutput = path.relative(outDir, real);
    if (relativeToOutput.startsWith("..") || path.isAbsolute(relativeToOutput)) {
      throw new Error("held served-body endpoint escaped output root");
    }
    const bytes = readFileSync(real);
    const actual = Object.freeze({ path: relativePath, bytes: bytes.byteLength, sha256: sha256(bytes) });
    if (actual.bytes !== binding.bytes || actual.sha256 !== binding.sha256) {
      throw new Error("held served-body identity mismatched the output snapshot");
    }
    return [relativePath, Object.freeze({ identity: actual, bytes })];
  }));
  const observations = new Map(PROJECTS.map((project) => [project.projectName, {
    servedResponseCount: 0,
    browserDefaultFaviconResponseCount: 0,
    scenarioRuntimeArtifacts: new Map(),
    evidenceOnlyProbeArtifacts: new Map()
  }]));
  let unattributedResponseCount = 0;
  let unexpectedResponseCount = 0;
  let bodyMismatchResponseCount = 0;
  let unmarkedRetainedChunkResponseCount = 0;
  const server = http.createServer((request, response) => {
    try {
      const projectName = request.headers[PROJECT_HEADER];
      if (typeof projectName !== "string" || !observations.has(projectName)) {
        unattributedResponseCount += 1;
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end("controlled project header required");
        return;
      }
      const classification = classifyControlledRequestTarget(
        request.method,
        request.url,
        scenarioRuntimePaths,
        ianaPath
      );
      if (classification.kind === "browser_default_favicon") {
        const project = observations.get(projectName);
        project.browserDefaultFaviconResponseCount += 1;
        response.writeHead(204, {
          "cache-control": "no-store",
          "content-security-policy": "default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
          "x-content-type-options": "nosniff"
        });
        response.end();
        return;
      }
      if (classification.kind === "unmarked_probe") {
        unmarkedRetainedChunkResponseCount += 1;
        unexpectedResponseCount += 1;
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        response.end("retained chunk is evidence-probe only");
        return;
      }
      if (classification.kind === "unexpected") {
        unexpectedResponseCount += 1;
        response.writeHead(request.method === "GET" ? 404 : 405, {
          "content-type": "text/plain; charset=utf-8"
        });
        response.end("not in controlled served-body set");
        return;
      }
      const relativePath = classification.relativePath;
      const ledgerKind = classification.kind === "evidence_only_probe"
        ? "evidenceOnlyProbeArtifacts"
        : "scenarioRuntimeArtifacts";
      const held = heldOutputBodies.get(relativePath);
      if (!held) {
        unexpectedResponseCount += 1;
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("output binding missing");
        return;
      }
      const actual = Object.freeze({
        path: relativePath,
        bytes: held.bytes.byteLength,
        sha256: sha256(held.bytes)
      });
      if (actual.bytes !== held.identity.bytes || actual.sha256 !== held.identity.sha256) {
        bodyMismatchResponseCount += 1;
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end("served body identity drifted");
        return;
      }
      const project = observations.get(projectName);
      updateArtifactLedger(project[ledgerKind], actual);
      project.servedResponseCount += 1;
      response.writeHead(200, {
        "cache-control": "no-store",
        ...(ledgerKind === "evidenceOnlyProbeArtifacts"
          ? { "content-disposition": "inline" }
          : {}),
        "content-security-policy": "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
        "content-type": ledgerKind === "evidenceOnlyProbeArtifacts"
          ? "text/plain; charset=utf-8"
          : contentType(relativePath),
        "x-content-type-options": "nosniff",
        [OUTPUT_TREE_HEADER]: outputTree.treeDigest
      });
      response.end(held.bytes);
    } catch {
      unexpectedResponseCount += 1;
      if (!response.headersSent) response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("controlled static server failed closed");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1" || address.port < 1) {
    await new Promise((resolve) => server.close(resolve));
    throw new Error("loopback evidence server address invalid");
  }
  const origin = `http://127.0.0.1:${address.port}`;
  return Object.freeze({
    origin,
    port: address.port,
    async close() {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          server.closeAllConnections?.();
          reject(new Error("loopback evidence server close timed out"));
        }, 10_000);
        server.close((error) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        });
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
      });
    },
    summarize() {
      const identityOnly = (files) => files.map(({ path: filePath, bytes, sha256: digest }) => ({
        path: filePath,
        bytes,
        sha256: digest
      }));
      const failLedger = (failureReason, projectName, expectedCount, actualCount) => {
        servedBodyLedgerDiagnostic = normalizeServedBodyLedgerDiagnostic({
          failureReason,
          projectName,
          expectedCount,
          actualCount,
          unattributedResponseCount,
          unexpectedResponseCount,
          bodyMismatchResponseCount,
          browserDefaultFaviconControlledResponseCount: [...observations.values()].reduce(
            (sum, entry) => sum + entry.browserDefaultFaviconResponseCount,
            0
          ),
          unmarkedProbeResponseCount: unmarkedRetainedChunkResponseCount
        });
        throw new Error("served-body ledger failed closed");
      };
      const byProject = PROJECTS.map((definition) => {
        const observed = observations.get(definition.projectName);
        const runtimeFiles = [...observed.scenarioRuntimeArtifacts.values()].sort(
          (left, right) => compareCodeUnits(left.path, right.path)
        );
        const probeFiles = [...observed.evidenceOnlyProbeArtifacts.values()].sort(
          (left, right) => compareCodeUnits(left.path, right.path)
        );
        if (JSON.stringify(runtimeFiles.map((entry) => entry.path)) !== JSON.stringify(scenarioRuntimePaths)) {
          failLedger("per_browser_runtime_path_set", definition.projectName,
            scenarioRuntimePaths.length, runtimeFiles.length);
        }
        if (JSON.stringify(probeFiles.map((entry) => entry.path)) !== JSON.stringify(evidenceOnlyPaths)) {
          failLedger("per_browser_probe_path_set", definition.projectName,
            evidenceOnlyPaths.length, probeFiles.length);
        }
        if (probeFiles[0]?.responseCount !== 1) {
          failLedger("per_browser_probe_response_count", definition.projectName,
            1, probeFiles[0]?.responseCount ?? 0);
        }
        const combined = [...runtimeFiles, ...probeFiles].sort(
          (left, right) => compareCodeUnits(left.path, right.path)
        );
        const counted = combined.reduce((sum, entry) => sum + entry.responseCount, 0);
        if (counted !== observed.servedResponseCount) {
          failLedger("per_browser_count_inconsistent", definition.projectName,
            counted, observed.servedResponseCount);
        }
        if (observed.browserDefaultFaviconResponseCount !== 6) {
          failLedger("per_browser_default_favicon_response_count", definition.projectName,
            6, observed.browserDefaultFaviconResponseCount);
        }
        return Object.freeze({
          projectName: definition.projectName,
          servedResponseCount: observed.servedResponseCount,
          scenarioRuntimeArtifactCount: runtimeFiles.length,
          scenarioRuntimeArtifacts: Object.freeze(runtimeFiles),
          scenarioRuntimeBodyManifestDigest:
            westernSameArtifactTestOnly.servedBodyManifestDigest(identityOnly(runtimeFiles)),
          scenarioRuntimeResponseLedgerDigest:
            westernSameArtifactTestOnly.servedResponseLedgerDigest(runtimeFiles),
          evidenceOnlyProbeArtifactCount: probeFiles.length,
          evidenceOnlyProbeArtifacts: Object.freeze(probeFiles),
          evidenceOnlyProbeBodyManifestDigest:
            westernSameArtifactTestOnly.servedBodyManifestDigest(identityOnly(probeFiles)),
          evidenceOnlyProbeResponseLedgerDigest:
            westernSameArtifactTestOnly.servedResponseLedgerDigest(probeFiles),
          combinedServedBodyManifestDigest:
            westernSameArtifactTestOnly.servedBodyManifestDigest(identityOnly(combined)),
          combinedServedResponseLedgerDigest:
            westernSameArtifactTestOnly.servedResponseLedgerDigest(combined)
        });
      });
      const bodyManifestsEqual = byProject[0].combinedServedBodyManifestDigest
        === byProject[1].combinedServedBodyManifestDigest;
      const runtimeManifestsEqual = byProject[0].scenarioRuntimeBodyManifestDigest
        === byProject[1].scenarioRuntimeBodyManifestDigest;
      const probeManifestsEqual = byProject[0].evidenceOnlyProbeBodyManifestDigest
        === byProject[1].evidenceOnlyProbeBodyManifestDigest;
      const equalManifestCount = Number(bodyManifestsEqual)
        + Number(runtimeManifestsEqual) + Number(probeManifestsEqual);
      const faviconResponsesByProject = PROJECTS.map((definition) => Object.freeze({
        projectName: definition.projectName,
        responseCount: observations.get(definition.projectName).browserDefaultFaviconResponseCount
      }));
      const faviconAggregateResponseCount = faviconResponsesByProject.reduce(
        (sum, entry) => sum + entry.responseCount,
        0
      );
      if (equalManifestCount !== 3) {
        failLedger("cross_browser_manifest_mismatch", null, 3, equalManifestCount);
      }
      if (faviconAggregateResponseCount !== 12) {
        failLedger("aggregate_default_favicon_response_count", null,
          12, faviconAggregateResponseCount);
      }
      if (unmarkedRetainedChunkResponseCount !== 0) {
        failLedger("unmarked_probe", null, 0, unmarkedRetainedChunkResponseCount);
      }
      if (bodyMismatchResponseCount !== 0) {
        failLedger("body_mismatch", null, 0, bodyMismatchResponseCount);
      }
      if (unattributedResponseCount !== 0) {
        failLedger("unattributed_response", null, 0, unattributedResponseCount);
      }
      if (unexpectedResponseCount !== 0) {
        failLedger("unexpected_response", null, 0, unexpectedResponseCount);
      }
      const servedResponseCount = byProject.reduce((sum, entry) => sum + entry.servedResponseCount, 0);
      return Object.freeze({
        origin,
        host: "127.0.0.1",
        scheme: "http",
        projectHeaderName: PROJECT_HEADER,
        responseHeaderName: OUTPUT_TREE_HEADER,
        responseHeaderValue: outputTree.treeDigest,
        requiredRuntimePaths,
        requiredRuntimePathsServedByBothBrowsers: true,
        scenarioRuntimePaths,
        scenarioRuntimePathsServedByBothBrowsers: true,
        evidenceOnlyOutputBodyProbePaths: evidenceOnlyPaths,
        evidenceOnlyOutputBodyProbePathsServedByBothBrowsers: true,
        retained2025bChunkScenarioRuntimeRequested: false,
        retained2025bChunkEvidenceOnlyBodyProbeObserved: true,
        browserDefaultFaviconControl: Object.freeze({
          requestMethod: "GET",
          canonicalPath: "/favicon.ico",
          query: "",
          responseStatus: 204,
          noBody: true,
          cacheControl: "no-store",
          contentSecurityPolicy: "default-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
          xContentTypeOptions: "nosniff",
          outputTreeResponseHeaderIncluded: false,
          excludedFromOutputTree: true,
          excludedFromServedBodyLedger: true,
          responsesByProject: Object.freeze(faviconResponsesByProject),
          aggregateResponseCount: faviconAggregateResponseCount
        }),
        servedResponseCount,
        totalControlledHttpResponseCount: servedResponseCount + faviconAggregateResponseCount,
        unattributedResponseCount: 0,
        unexpectedResponseCount: 0,
        bodyMismatchResponseCount: 0,
        unmarkedRetainedChunkResponseCount: 0,
        servedArtifactsByProject: Object.freeze(byProject),
        perBrowserServedBodyManifestsEqual: true,
        perBrowserScenarioRuntimeBodyManifestsEqual: true,
        perBrowserEvidenceOnlyProbeBodyManifestsEqual: true,
        allServedBodiesMatchedOutputTree: true,
        singleOutputTreeServedWithoutRebuild: true
      });
    }
  });
}

async function assertPortReleased(port) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
}

async function probeBrowserVersion(definition, environment) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({
    channel: definition.channel,
    headless: true,
    env: environment
  });
  try {
    const version = browser.version();
    if (typeof version !== "string" || !/^\d+(?:\.\d+){1,3}$/u.test(version)) {
      throw new Error("browser version is not exact numeric product version");
    }
    return version;
  } finally {
    await browser.close();
  }
}

async function collectBrowserVersions(environment) {
  const observations = [];
  for (const definition of PROJECTS) {
    observations.push(Object.freeze({
      projectName: definition.projectName,
      version: await probeBrowserVersion(definition, environment)
    }));
  }
  return Object.freeze(observations);
}

function combineBrowserVersions(before, after) {
  return Object.freeze(PROJECTS.map((definition) => {
    const versionBefore = before.find((entry) => entry.projectName === definition.projectName)?.version;
    const versionAfter = after.find((entry) => entry.projectName === definition.projectName)?.version;
    if (!versionBefore || versionAfter !== versionBefore) {
      throw new Error("browser version changed during exact matrix");
    }
    return Object.freeze({
      projectName: definition.projectName,
      channel: definition.channel,
      browserProduct: definition.browserProduct,
      versionBefore,
      versionAfter,
      prePostVersionEqual: true
    });
  }));
}

function parseSanitizedSummary(summaryPath) {
  const bytes = readFileSync(summaryPath);
  if (bytes.byteLength < 1 || bytes.byteLength > 256 * 1024) {
    throw new Error("sanitized Playwright sidecar size invalid");
  }
  return westernSameArtifactTestOnly.parseStrictJsonBytes(bytes, "sanitized Playwright sidecar");
}

function exactObjectKeys(value, expectedKeys) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expectedKeys].sort());
}

export function parseFixedMatrixFailureSummaryBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.byteLength < 1 || bytes.byteLength > 256 * 1024) {
    throw new Error("fixed matrix failure sidecar size invalid");
  }
  const value = westernSameArtifactTestOnly.parseStrictJsonBytes(bytes, "fixed matrix failure sidecar");
  if (!exactObjectKeys(value, [
    "configuredProjectNames", "outcomeCount", "outcomes", "overallStatus", "schemaVersion"
  ]) || value.schemaVersion !== "hakimi.western.same-artifact-playwright-summary/1"
      || value.overallStatus !== "failed"
      || JSON.stringify(value.configuredProjectNames) !== JSON.stringify(["chrome", "msedge"])
      || !Number.isSafeInteger(value.outcomeCount) || value.outcomeCount < 1 || value.outcomeCount > 10
      || !Array.isArray(value.outcomes) || value.outcomes.length !== value.outcomeCount) {
    throw new Error("fixed matrix failure sidecar shape invalid");
  }
  const allowedStatuses = [
    "passed", "timedOut", "skipped", "interrupted",
    "failed_stage_bootstrap",
    "failed_stage_after_each_problem_check_console_warning",
    "failed_stage_after_each_problem_check_console_error",
    "failed_stage_after_each_problem_check_pageerror",
    "failed_stage_after_each_problem_check_requestfailed",
    "failed_stage_unique_input", "failed_stage_unique_run_resolved",
    "failed_stage_unique_exact_facts", "failed_stage_unique_input_clear",
    "failed_stage_unique_iana_navigation"
  ];
  const seen = new Set();
  const outcomes = value.outcomes.map((entry) => {
    if (!exactObjectKeys(entry, ["projectName", "retry", "scenarioId", "status"])
        || !PROJECTS.some((project) => project.projectName === entry.projectName)
        || !SCENARIO_IDS.includes(entry.scenarioId) || !allowedStatuses.includes(entry.status)
        || entry.retry !== 0) {
      throw new Error("fixed matrix failure outcome invalid");
    }
    const key = `${entry.projectName}\0${entry.scenarioId}`;
    if (seen.has(key)) throw new Error("fixed matrix failure outcome duplicate");
    seen.add(key);
    return Object.freeze({
      projectName: entry.projectName,
      scenarioId: entry.scenarioId,
      status: entry.status,
      retry: 0
    });
  });
  const failed = outcomes.find((entry) => entry.status !== "passed");
  if (!failed) throw new Error("fixed matrix failure sidecar lacks a failed outcome");
  return failed;
}

function captureFixedMatrixFailureDiagnostic(summaryPath) {
  if (!existsSync(summaryPath)) return;
  try {
    const failed = parseFixedMatrixFailureSummaryBytes(readFileSync(summaryPath));
    failureProject = failed.projectName;
    failureScenarioId = failed.scenarioId;
    failureStatus = failed.status;
    failureStageCode = "EDGE_CHROME_MATRIX_FIXED_SCENARIO_FAILED_CLOSED";
  } catch {
    failureStageCode = "EDGE_CHROME_MATRIX_FAILURE_SIDECAR_INVALID_CLOSED";
  }
}

function exactTransformedModuleCount(buildOutput) {
  const plain = buildOutput.replace(/\u001b\[[0-9;]*m/gu, "");
  const matches = [...plain.matchAll(/(?:^|\s)(\d+) modules transformed(?:\.|\s|$)/gu)];
  if (matches.length !== 1) throw new Error("Vite module-count observation missing or ambiguous");
  const count = Number.parseInt(matches[0][1], 10);
  if (count !== 88) throw new Error("Vite transformed module count drifted");
  return count;
}

function temporaryCandidateOutputPath() {
  const candidate = path.join(
    originalSystemTempRoot,
    `hakimi-western-same-artifact-candidate-${randomUUID()}.json`
  );
  if (existsSync(candidate) || !samePath(realpathSync.native(path.dirname(candidate)), originalSystemTempRoot)) {
    throw new Error("sanitized candidate temp endpoint must be a new direct system-temp file");
  }
  return candidate;
}

async function main() {
  if (process.execArgv.length !== 0 || Object.hasOwn(process.env, "NODE_OPTIONS")
      || Object.hasOwn(process.env, "NODE_PATH") || process.argv.length !== 2) {
    throw new Error("operands or Node loader environment are forbidden");
  }
  const sanitizedCandidateTempPath = temporaryCandidateOutputPath();
  const ownedRoot = createOwnedTemporaryRoot();
  const originalTemp = process.env.TEMP;
  const originalTmp = process.env.TMP;
  const originalTmpDir = process.env.TMPDIR;
  process.env.TEMP = ownedRoot.root;
  process.env.TMP = ownedRoot.root;
  process.env.TMPDIR = ownedRoot.root;
  let evidenceServer;
  let cleanupCompleted = false;
  let browserHandlesClosed = false;
  let viteCliExited = false;
  let playwrightCliExited = false;
  try {
    const outLeaf = `hakimi-western-facts-${randomUUID().replaceAll("-", "")}`;
    const outDir = createOwnedChildDirectory(ownedRoot, outLeaf);
    const cacheDir = createOwnedChildDirectory(ownedRoot, "vite-cache");
    const playwrightOutDir = createOwnedChildDirectory(ownedRoot, "playwright-output");
    const sidecarDir = createOwnedChildDirectory(ownedRoot, "sidecar");
    const summaryPath = path.join(sidecarDir, "summary.json");
    const environment = isolatedEnvironment(ownedRoot, {
      HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT: ownedRoot.root,
      HAKIMI_WESTERN_EVIDENCE_OUT_DIR: outDir,
      HAKIMI_WESTERN_EVIDENCE_CACHE_DIR: cacheDir,
      HAKIMI_WESTERN_FACT_ONLY_OUT_DIR: outDir
    });

    failureStageCode = "ASSERTION_CONTRACT_CHECK_FAILED_CLOSED";
    inspectWesternE2EAssertionContract(workspaceRoot);
    failureStageCode = "FORMAL_CONTEXT_CHECK_FAILED_CLOSED";
    collectWesternFormalContextSnapshot(workspaceRoot);
    failureStageCode = "TOOL_IDENTITY_CHECK_FAILED_CLOSED";
    const viteVersion = readPackageVersion("apps/web/node_modules/vite/package.json");
    const playwrightVersion = readPackageVersion("node_modules/@playwright/test/package.json");
    if (viteVersion !== "7.3.6" || playwrightVersion !== "1.62.1"
        || process.versions.node !== "24.16.0") {
      throw new Error("fixed Node, Vite, or Playwright tool identity is unavailable");
    }
    const runtimeToolResolution = resolveRuntimeTools();
    failureStageCode = "SOURCE_TOOL_LOCK_GRAPH_BEFORE_FAILED_CLOSED";
    const sourceBefore = collectWesternAuthoredBuildSourceSnapshot(workspaceRoot);
    const toolsBefore = collectWesternEvidenceToolSnapshot(workspaceRoot);
    const lockedBefore = collectWesternLockedBuildInputSnapshot(workspaceRoot);

    failureStageCode = "ISOLATED_VITE_BUILD_FAILED_CLOSED";
    const build = await runControlledChild([
      "apps/web/node_modules/vite/bin/vite.js",
      "build",
      "--config",
      "isolated-drafts/western-civil-time-fact-browser-draft/vite.same-artifact-evidence.config.mjs",
      "--configLoader",
      "runner"
    ], {
      cwd: workspaceRoot,
      env: environment
    }, {
      timeoutMs: 10 * 60_000,
      captureOutput: true,
      outputLimit: 8 * 1024 * 1024
    });
    viteCliExited = activeChildren.size === 0;
    if (build.status !== 0 || build.signal !== null || build.timedOut || build.outputExceeded) {
      throw new Error("isolated Vite build failed closed");
    }
    const transformedModuleCount = exactTransformedModuleCount(build.output);
    failureStageCode = "OUTPUT_TREE_BEFORE_FAILED_CLOSED";
    const outputTreeBefore = collectWesternOutputTree(outDir);
    verifyWesternBuildManifest(outDir, outputTreeBefore, workspaceRoot);
    const ianaEvidencePath = deriveWesternEvidenceOnlyOutputBodyProbePaths(outputTreeBefore)[0];

    failureStageCode = "PRE_MATRIX_BROWSER_VERSION_PROBE_FAILED_CLOSED";
    const browserVersionsBefore = await collectBrowserVersions(environment);
    browserHandlesClosed = true;
    failureStageCode = "LOOPBACK_SERVER_START_FAILED_CLOSED";
    evidenceServer = await startStaticEvidenceServer(outDir, outputTreeBefore);
    const testEnvironment = isolatedEnvironment(ownedRoot, {
      HAKIMI_WESTERN_EVIDENCE_TEMP_ROOT: ownedRoot.root,
      HAKIMI_WESTERN_EVIDENCE_OUT_DIR: outDir,
      HAKIMI_WESTERN_EVIDENCE_CACHE_DIR: cacheDir,
      HAKIMI_WESTERN_FACT_ONLY_OUT_DIR: outDir,
      HAKIMI_WESTERN_EVIDENCE_BASE_URL: evidenceServer.origin,
      HAKIMI_WESTERN_EVIDENCE_OUTPUT_TREE_SHA256: outputTreeBefore.treeDigest,
      HAKIMI_WESTERN_EVIDENCE_IANA_PATH: ianaEvidencePath,
      HAKIMI_WESTERN_EVIDENCE_SUMMARY_PATH: summaryPath,
      HAKIMI_WESTERN_EVIDENCE_PLAYWRIGHT_OUT_DIR: playwrightOutDir,
      HAKIMI_WESTERN_EVIDENCE_CONFIG_PROBE: "0"
    });
    failureStageCode = "EDGE_CHROME_MATRIX_FAILED_CLOSED";
    const playwright = await runControlledChild([
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config",
      "isolated-drafts/western-civil-time-fact-browser-draft/playwright.same-artifact-evidence.config.ts"
    ], {
      cwd: workspaceRoot,
      env: testEnvironment
    }, {
      timeoutMs: 30 * 60_000
    });
    playwrightCliExited = activeChildren.size === 0;
    if (playwright.status !== 0 || playwright.signal !== null || playwright.timedOut) {
      captureFixedMatrixFailureDiagnostic(summaryPath);
      throw new Error("exact Edge and Chrome matrix failed closed");
    }
    failureStageCode = "SANITIZED_SUMMARY_READ_FAILED_CLOSED";
    const playwrightSummary = parseSanitizedSummary(summaryPath);
    westernSameArtifactTestOnly.normalizePlaywrightSummary(playwrightSummary);
    failureStageCode = "POST_MATRIX_BROWSER_VERSION_PROBE_FAILED_CLOSED";
    browserHandlesClosed = false;
    const browserVersionsAfter = await collectBrowserVersions(environment);
    browserHandlesClosed = true;
    const browserProbes = combineBrowserVersions(browserVersionsBefore, browserVersionsAfter);

    failureStageCode = "SERVED_BODY_LEDGER_FAILED_CLOSED";
    const serverObservation = evidenceServer.summarize();
    westernSameArtifactTestOnly.normalizeServer(serverObservation, outputTreeBefore);
    const usedPort = evidenceServer.port;
    await evidenceServer.close();
    evidenceServer = undefined;
    await assertPortReleased(usedPort);
    failureStageCode = "OUTPUT_SOURCE_TOOL_LOCK_GRAPH_AFTER_FAILED_CLOSED";
    const outputTreeAfter = collectWesternOutputTree(outDir);
    const sourceAfter = collectWesternAuthoredBuildSourceSnapshot(workspaceRoot);
    const toolsAfter = collectWesternEvidenceToolSnapshot(workspaceRoot);
    const lockedAfter = collectWesternLockedBuildInputSnapshot(workspaceRoot);
    if (activeChildren.size !== 0) throw new Error("runner-controlled child process remained active");

    failureStageCode = "RAW_TEMP_TREE_CLEANUP_FAILED_CLOSED";
    cleanupOwnedTemporaryRoot(ownedRoot);
    cleanupCompleted = true;
    restoreProcessTempEnvironment(originalTemp, originalTmp, originalTmpDir);

    failureStageCode = "SANITIZED_CANDIDATE_RENDER_FAILED_CLOSED";
    const observation = {
      observedAt: new Date().toISOString(),
      nodeVersion: process.versions.node,
      viteVersion,
      playwrightVersion,
      buildExecutionCount: 1,
      buildExitCode: 0,
      transformedModuleCount,
      sourceGraphDigestBefore: sourceBefore.graphDigest,
      sourceGraphDigestAfter: sourceAfter.graphDigest,
      lockedBuildInputGraphDigestBefore: lockedBefore.graphDigest,
      lockedBuildInputGraphDigestAfter: lockedAfter.graphDigest,
      evidenceToolGraphDigestBefore: toolsBefore.graphDigest,
      evidenceToolGraphDigestAfter: toolsAfter.graphDigest,
      outputTreeBefore,
      outputTreeAfter,
      runtimeToolResolution,
      server: serverObservation,
      browserProbes,
      playwrightSummary,
      cleanup: {
        viteCliExited,
        playwrightCliExited,
        browserVersionProbeHandlesClosed: browserHandlesClosed,
        runnerControlledChildProcessesStopped: activeChildren.size === 0,
        serverStopped: true,
        portReleased: true,
        temporaryRootRemoved: !existsSync(ownedRoot.root)
      }
    };
    const rendered = renderWesternSameArtifactCandidate(workspaceRoot, observation);
    failureStageCode = "SANITIZED_TEMP_CANDIDATE_WRITE_FAILED_CLOSED";
    writeFileSync(sanitizedCandidateTempPath, rendered.serialized, { encoding: "utf8", flag: "wx" });
    const rawSha256 = sha256(Buffer.from(rendered.serialized, "utf8"));
    process.stdout.write(`${JSON.stringify({
      status: "isolated_fact_only_single_build_dual_browser_observation_passed",
      sanitizedCandidateTempPath,
      rawSha256,
      observationDigest: rendered.candidate.observationDigest,
      outputTreeDigest: outputTreeAfter.treeDigest,
      expectedAuthoredBuildInputFileCount: sourceAfter.fileCount,
      lockedBuildInputCount: lockedAfter.inputCount,
      evidenceToolFileCount: toolsAfter.fileCount,
      chromeVersion: browserProbes.find((entry) => entry.projectName === "chrome")?.versionAfter,
      edgeVersion: browserProbes.find((entry) => entry.projectName === "msedge")?.versionAfter,
      passedOutcomeCount: playwrightSummary.outcomeCount,
      servedResponseCount: serverObservation.servedResponseCount,
      browserDefaultFaviconResponseCount:
        serverObservation.browserDefaultFaviconControl.aggregateResponseCount,
      totalControlledHttpResponseCount: serverObservation.totalControlledHttpResponseCount,
      runnerOwnedTempTreeCleanupCompleted: true,
      authorityRaised: false
    })}\n`);
  } finally {
    if (evidenceServer) await evidenceServer.close().catch(() => undefined);
    await stopControlledChildren().catch(() => undefined);
    if (!cleanupCompleted) cleanupOwnedTemporaryRoot(ownedRoot);
    restoreProcessTempEnvironment(originalTemp, originalTmp, originalTmpDir);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      status: "isolated_same_artifact_observation_failed",
      errorCode: failureStageCode,
      failureProject,
      failureScenarioId,
      failureStatus,
      validationCode: error instanceof WesternSameArtifactObservationError ? error.code : null,
      ...(servedBodyLedgerDiagnostic === null ? {} : {
        servedBodyLedgerDiagnostic: normalizeServedBodyLedgerDiagnostic(servedBodyLedgerDiagnostic)
      })
    })}\n`);
    process.exitCode = 1;
  });
}
