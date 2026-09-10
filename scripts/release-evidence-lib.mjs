import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { constants as fsConstants, existsSync } from "node:fs";
import { lstat, open, readFile, readdir, readlink, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  computeDefaultLifecyclePlanDigest,
  resolveDefaultLifecyclePlan
} from "./formal-npm-lifecycle-closure-lib.mjs";

export const RELEASE_POLICY_PATHS = Object.freeze([
  "docs/release/web-v1-release-decisions.json",
  "docs/release/release-generation-history.json",
  "docs/security/hosting-security-policy.json",
  "docs/release/release-evidence.schema.json"
]);

export const REQUIRED_RELEASE_ARTIFACT_COMPONENT_PATHS = Object.freeze({
  applicationShell: "index.html",
  pwaManifest: "manifest.webmanifest",
  serviceWorker: "sw.js",
  hostingHeaders: "_headers"
});

const EPHEMERAL_PREFIXES = [
  ".release-evidence/",
  "dist/",
  "node_modules/",
  "playwright-report/",
  "test-results/",
  "tmp/"
];

const BOUND_RELEASE_EVIDENCE_ID = /^hre1-[a-f0-9]{32}$/u;
const UNBOUND_RELEASE_EVIDENCE_ID = "unbound-local-build";

function normalizedPath(value) {
  return value.replaceAll("\\", "/");
}

export function relativePathWithin(root, candidate, label) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes its required root.`);
  }
  return normalizedPath(relative);
}

function resolveWindowsNpmCli(command) {
  const cliName = command === "npx" ? "npx-cli.js" : "npm-cli.js";
  const candidates = [];
  if (process.env.npm_execpath) {
    candidates.push(command === "npm"
      ? process.env.npm_execpath
      : path.join(path.dirname(process.env.npm_execpath), cliName));
  }
  candidates.push(path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", cliName));
  try {
    const shims = execFileSync("where.exe", [`${command}.cmd`], {
      encoding: "utf8",
      windowsHide: true
    }).split(/\r?\n/u).map((value) => value.trim()).filter(Boolean);
    for (const shim of shims) {
      candidates.push(path.join(path.dirname(shim), "node_modules", "npm", "bin", cliName));
    }
  } catch {
    // Fall through to the deterministic candidate check and fail closed.
  }
  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) throw new Error(`Unable to resolve ${cliName} without a command shell.`);
  return resolved;
}

export function releaseCommandInvocation(
  command,
  commandArgs,
  { platform = process.platform, npmCliPath = null, nodeExecutable = process.execPath } = {}
) {
  if (platform === "win32" && (command === "npm" || command === "npx")) {
    return Object.freeze({
      executable: nodeExecutable,
      args: [npmCliPath ?? resolveWindowsNpmCli(command), ...commandArgs]
    });
  }
  return Object.freeze({ executable: command, args: [...commandArgs] });
}

export function canonicalReleaseChannel(value) {
  const channel = String(value);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(channel)) throw new Error("Release channel is not canonical.");
  return channel;
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}

function canonicalReceiptIds(values, label) {
  if (
    !Array.isArray(values)
    || values.some((value) => typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/u.test(value))
  ) throw new Error(`${label} is malformed.`);
  const ids = [...values].sort();
  if (new Set(ids).size !== ids.length) throw new Error(`${label} contains duplicates.`);
  return ids;
}

export function releaseReceiptSetMatchesPolicy(receipts, policyReceiptIds) {
  if (!Array.isArray(receipts)) throw new Error("Recorded release receipts are malformed.");
  const recordedIds = canonicalReceiptIds(
    receipts.map((receipt) => receipt?.id),
    "Recorded release receipt id set"
  );
  const policyIds = canonicalReceiptIds(policyReceiptIds, "Release receipt policy id set");
  return canonicalJson(recordedIds) === canonicalJson(policyIds);
}

export function defaultV13ReleaseDescriptorMatches({
  channel,
  descriptor,
  decision,
  canonicalDescriptor
}) {
  return channel === "default-v13"
    && decision?.dbGeneration === canonicalDescriptor?.dbGeneration
    && decision?.targetSchema === canonicalDescriptor?.targetSchema
    && decision?.migrationId === canonicalDescriptor?.migrationId
    && canonicalJson(descriptor) === canonicalJson(canonicalDescriptor);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sameResolvedPath(left, right) {
  const comparable = (value) => {
    const resolved = path.resolve(value);
    return process.platform === "win32"
      ? path.toNamespacedPath(resolved).toLocaleLowerCase("en-US")
      : resolved;
  };
  return comparable(left) === comparable(right);
}

function stableStatIdentity(details) {
  return Object.freeze({
    dev: String(details.dev),
    ino: String(details.ino),
    mode: String(details.mode),
    nlink: String(details.nlink),
    size: String(details.size),
    mtimeNs: String(details.mtimeNs),
    ctimeNs: String(details.ctimeNs),
    birthtimeNs: String(details.birthtimeNs)
  });
}

function sameStableStat(left, right) {
  return canonicalJson(stableStatIdentity(left)) === canonicalJson(stableStatIdentity(right));
}

function requireStableDirectoryStat(details, label) {
  if (details.isSymbolicLink() || !details.isDirectory()) {
    throw new Error(`${label} must be a regular directory and cannot be a symlink, junction, or reparse alias.`);
  }
  if (details.dev === 0n || details.ino === 0n) {
    throw new Error(`${label} filesystem does not expose a usable device/inode identity.`);
  }
}

function requireStableRegularFileStat(details, label) {
  if (details.isSymbolicLink() || !details.isFile()) {
    throw new Error(`${label} must be a regular file and cannot be a symlink, junction, reparse alias, or non-regular entry.`);
  }
  if (details.dev === 0n || details.ino === 0n) {
    throw new Error(`${label} filesystem does not expose a usable device/inode identity.`);
  }
  if (details.nlink !== 1n) {
    throw new Error(`${label} must not be a hardlink.`);
  }
}

async function stableContainmentRoot(containmentRoot, label) {
  const absoluteRoot = path.resolve(containmentRoot);
  const details = await lstat(absoluteRoot, { bigint: true });
  requireStableDirectoryStat(details, `${label} containment root`);
  const realPath = await realpath(absoluteRoot);
  if (!sameResolvedPath(absoluteRoot, realPath)) {
    throw new Error(`${label} containment root real path does not match its lexical path; ancestor aliases and reparse redirection are forbidden.`);
  }
  return Object.freeze({
    absolutePath: absoluteRoot,
    realPath,
    details
  });
}

async function stableDirectoryState({
  containmentRoot,
  containmentRealPath,
  directory,
  label
}) {
  const absoluteDirectory = path.resolve(directory);
  const relativeDirectory = relativePathWithin(containmentRoot, absoluteDirectory, label);
  const details = await lstat(absoluteDirectory, { bigint: true });
  requireStableDirectoryStat(details, label);
  const realDirectory = await realpath(absoluteDirectory);
  const expectedRealDirectory = path.resolve(containmentRealPath, relativeDirectory);
  if (!sameResolvedPath(realDirectory, expectedRealDirectory)) {
    throw new Error(`${label} real path does not match its lexical path; aliases and reparse redirection are forbidden.`);
  }
  return Object.freeze({
    absolutePath: absoluteDirectory,
    realPath: realDirectory,
    identity: stableStatIdentity(details),
    details
  });
}

export async function assertStableDirectoryPathWithin(containmentRoot, directory, label) {
  const root = await stableContainmentRoot(containmentRoot, label);
  const absoluteDirectory = path.resolve(directory);
  const relativeDirectory = relativePathWithin(root.absolutePath, absoluteDirectory, label);
  const segments = relativeDirectory === "" ? [] : relativeDirectory.split(/[\\/]+/u);
  let current = root.absolutePath;
  let state = Object.freeze({
    absolutePath: root.absolutePath,
    realPath: root.realPath,
    identity: stableStatIdentity(root.details),
    details: root.details
  });
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    state = await stableDirectoryState({
      containmentRoot: root.absolutePath,
      containmentRealPath: root.realPath,
      directory: current,
      label: index === segments.length - 1 ? label : `${label} parent directory`
    });
  }
  return Object.freeze({
    ...state,
    containmentRoot: root.absolutePath,
    containmentRealPath: root.realPath
  });
}

async function readStableRegularFileSnapshotFromRoot({
  containmentRoot,
  containmentRealPath,
  filePath,
  label
}) {
  const absolutePath = path.resolve(filePath);
  const relativePath = relativePathWithin(containmentRoot, absolutePath, label);
  const expectedRealPath = path.resolve(containmentRealPath, relativePath);
  const beforeLstat = await lstat(absolutePath, { bigint: true });
  requireStableRegularFileStat(beforeLstat, label);
  const beforeRealPath = await realpath(absolutePath);
  if (!sameResolvedPath(beforeRealPath, expectedRealPath)) {
    throw new Error(`${label} real path does not match its lexical path; aliases and reparse redirection are forbidden.`);
  }

  const noFollow = process.platform === "win32" || !Number.isInteger(fsConstants.O_NOFOLLOW)
    ? 0
    : fsConstants.O_NOFOLLOW;
  const handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
  try {
    const beforeFstat = await handle.stat({ bigint: true });
    requireStableRegularFileStat(beforeFstat, label);
    if (!sameStableStat(beforeLstat, beforeFstat)) {
      throw new Error(`${label} changed identity between lstat and held-file open.`);
    }
    const bytes = await handle.readFile();
    const afterFstat = await handle.stat({ bigint: true });
    requireStableRegularFileStat(afterFstat, label);
    const afterLstat = await lstat(absolutePath, { bigint: true });
    requireStableRegularFileStat(afterLstat, label);
    const afterRealPath = await realpath(absolutePath);
    if (!sameResolvedPath(afterRealPath, expectedRealPath)
      || !sameResolvedPath(beforeRealPath, afterRealPath)
      || !sameStableStat(beforeFstat, afterFstat)
      || !sameStableStat(beforeLstat, afterLstat)
      || !sameStableStat(afterFstat, afterLstat)) {
      throw new Error(`${label} changed while its held-file byte snapshot was read.`);
    }
    if (afterFstat.size > BigInt(Number.MAX_SAFE_INTEGER)
      || bytes.byteLength !== Number(afterFstat.size)) {
      throw new Error(`${label} byte length does not match its stable file identity.`);
    }
    return Object.freeze({
      absolutePath,
      realPath: afterRealPath,
      identity: stableStatIdentity(afterFstat),
      bytes,
      size: bytes.byteLength,
      sha256: sha256(bytes)
    });
  } finally {
    await handle.close();
  }
}

export async function readStableRegularFileSnapshot(
  filePath,
  { containmentRoot = path.dirname(path.resolve(filePath)), label = "File" } = {}
) {
  const parent = await assertStableDirectoryPathWithin(
    containmentRoot,
    path.dirname(path.resolve(filePath)),
    `${label} parent directory`
  );
  return readStableRegularFileSnapshotFromRoot({
    containmentRoot: parent.containmentRoot,
    containmentRealPath: parent.containmentRealPath,
    filePath,
    label
  });
}


const RELEASE_LIFECYCLE_STAGES = Object.freeze({
  typecheck: "typecheck",
  unit: "vitest",
  build: "build"
});
const LIFECYCLE_RUN_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;

export function isReleaseLifecycleReceiptId(id) {
  return typeof id === "string" && Object.hasOwn(RELEASE_LIFECYCLE_STAGES, id);
}

function lifecycleExactKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function lifecycleFailure(id, message) {
  throw new Error("Release lifecycle " + id + ": " + message + ".");
}

function lifecycleUtc(value) {
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value ? time : null;
}

async function readReleaseLifecycleInputs(cwd) {
  const contexts = [];
  const packageIdentities = [];
  for (const relativePath of ["package.json", "apps/web/package.json"]) {
    const snapshot = await readStableRegularFileSnapshot(path.resolve(cwd, relativePath), {
      containmentRoot: cwd,
      label: "Lifecycle package " + relativePath
    });
    if (snapshot.size === 0 || snapshot.size > 2_000_000) {
      throw new Error("Lifecycle package input size is invalid: " + relativePath);
    }
    const packageJson = JSON.parse(snapshot.bytes.toString("utf8"));
    contexts.push({ path: relativePath, packageJson });
    packageIdentities.push({
      path: relativePath, rawBytes: snapshot.size, rawSha256: snapshot.sha256
    });
  }
  return { root: contexts[0], web: contexts[1], packageIdentities };
}

function assertReleaseLifecycleTerminalReport(report, receipt, plan, packageIdentities) {
  const id = receipt.id;
  if (!lifecycleExactKeys(report, [
    "schemaVersion", "recordType", "stage", "originalCommand", "runId", "receiptId",
    "packageIdentities", "planDigest", "startedAt", "completedAt", "terminal",
    "authorization", "phases", "programStarted", "aggregateExitCode", "status"
  ]) || report.schemaVersion !== 1
    || report.recordType !== "default_npm_lifecycle_phase_report"
    || report.terminal !== true) lifecycleFailure(id, "terminal report shape is invalid");
  if (report.runId !== receipt.lifecycleRunId || report.receiptId !== id
    || report.stage !== plan.stage
    || canonicalJson(report.originalCommand) !== canonicalJson(plan.originalCommand)
    || canonicalJson(receipt.command) !== canonicalJson(plan.originalCommand)) {
    lifecycleFailure(id, "run, stage or original command binding mismatch");
  }
  if (report.planDigest !== computeDefaultLifecyclePlanDigest(plan)
    || canonicalJson(report.packageIdentities) !== canonicalJson(packageIdentities)) {
    lifecycleFailure(id, "current fixed plan or package identities mismatch");
  }
  const start = lifecycleUtc(report.startedAt);
  const end = lifecycleUtc(report.completedAt);
  const outerStart = lifecycleUtc(receipt.startedAt);
  const outerEnd = lifecycleUtc(receipt.completedAt);
  if (start === null || end === null || outerStart === null || outerEnd === null
    || end < start || start < outerStart || end > outerEnd) {
    lifecycleFailure(id, "terminal report time interval is invalid");
  }
  if (!lifecycleExactKeys(report.authorization, ["status", "blockers"])
    || !["allowed", "blocked"].includes(report.authorization.status)
    || !Array.isArray(report.authorization.blockers)
    || (report.authorization.status === "allowed") !== (report.authorization.blockers.length === 0)) {
    lifecycleFailure(id, "authorization terminal state is invalid");
  }
  if (!Array.isArray(report.phases) || report.phases.length !== plan.steps.length) {
    lifecycleFailure(id, "complete fixed phase inventory is required");
  }
  let previousPhaseEnd = start;
  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];
    const phase = report.phases[index];
    if (!lifecycleExactKeys(phase, [
      "id", "required", "status", "started", "exitCode", "signal", "error",
      "startedAt", "completedAt"
    ]) || phase.id !== step.id || phase.required !== step.required
      || ![true, false, null].includes(phase.started)
      || !(phase.exitCode === null || (Number.isSafeInteger(phase.exitCode) && phase.exitCode >= 0))
      || !(phase.signal === null || (typeof phase.signal === "string" && phase.signal.length > 0))
      || !(phase.error === null || (typeof phase.error === "string" && phase.error.length > 0))) {
      lifecycleFailure(id, "phase shape or fixed order is invalid");
    }
    const absent = step.kind === "none";
    const blocked = !absent && (report.authorization.status === "blocked"
      || (step.id === "program" && plan.stage === "build"
        && report.phases[1].status !== "passed"));
    if (absent || blocked) {
      const expectedStatus = absent ? step.absentStatus : "blocked";
      if (phase.status !== expectedStatus || phase.started !== false
        || phase.exitCode !== null || phase.signal !== null
        || phase.startedAt !== null || phase.completedAt !== null
        || (absent && phase.error !== null)) {
        lifecycleFailure(id, "absent or blocked phase claims execution");
      }
      continue;
    }
    const phaseStart = lifecycleUtc(phase.startedAt);
    const phaseEnd = lifecycleUtc(phase.completedAt);
    if (phaseStart === null || phaseEnd === null || phaseStart < previousPhaseEnd
      || phaseEnd < phaseStart || phaseEnd > end) {
      lifecycleFailure(id, "attempted phase time interval is invalid");
    }
    previousPhaseEnd = phaseEnd;
    const passed = phase.status === "passed" && phase.started === true
      && phase.exitCode === 0 && phase.signal === null && phase.error === null;
    const failed = phase.status === "failed" && (
      (phase.started === true && (
        (Number.isSafeInteger(phase.exitCode) && phase.exitCode > 0 && phase.signal === null)
        || (phase.signal !== null && phase.exitCode === null)
      ))
      || (phase.started === false && phase.exitCode === null
        && phase.signal === null && phase.error !== null)
    );
    const unknown = phase.status === "unknown"
      && phase.exitCode === null && phase.signal === null;
    if (!passed && !failed && !unknown) {
      lifecycleFailure(id, "phase execution facts and status contradict");
    }
  }
  const program = report.phases[2];
  const aggregateExitCode = report.authorization.status === "blocked" ? 2
    : report.phases.every((phase) => !phase.required || phase.status === "passed") ? 0 : 1;
  const status = report.authorization.status === "blocked" ? "blocked"
    : aggregateExitCode === 0 ? "passed" : "failed";
  if (report.programStarted !== program.started
    || receipt.programStarted !== report.programStarted
    || report.aggregateExitCode !== aggregateExitCode || report.status !== status
    || receipt.exitCode !== aggregateExitCode
    || receipt.status !== (status === "passed" ? "passed" : "failed")
    || receipt.signal !== null || receipt.launchErrorCode !== null) {
    lifecycleFailure(id, "program, aggregate or outer receipt terminal state contradicts");
  }
}

export async function verifyReleaseLifecyclePhaseReportBinding({
  cwd,
  sourceRoot = cwd,
  receiptsDirectory,
  receipt
}) {
  if (!isReleaseLifecycleReceiptId(receipt?.id)) {
    if (receipt?.lifecycleRunId != null || receipt?.lifecyclePhaseReport != null
      || receipt?.lifecyclePhaseReportError != null || receipt?.programStarted != null) {
      throw new Error("Non-lifecycle receipt contains lifecycle result data: " + receipt?.id);
    }
    return null;
  }
  const id = receipt.id;
  if (typeof receipt.lifecycleRunId !== "string" || !LIFECYCLE_RUN_ID.test(receipt.lifecycleRunId)
    || receipt.lifecyclePhaseReportError !== null) {
    lifecycleFailure(id, "run id or report error state is invalid");
  }
  const binding = receipt.lifecyclePhaseReport;
  if (!lifecycleExactKeys(binding, ["path", "sha256"])
    || typeof binding.path !== "string" || binding.path.length === 0
    || typeof binding.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(binding.sha256)) {
    lifecycleFailure(id, "phase report binding is malformed");
  }
  const reportPath = path.resolve(cwd, binding.path);
  relativePathWithin(cwd, receiptsDirectory, "Lifecycle receipt directory");
  relativePathWithin(receiptsDirectory, reportPath, "Lifecycle phase report " + id);
  if (binding.path !== relativePathWithin(cwd, reportPath, "Lifecycle phase report " + id)) {
    lifecycleFailure(id, "phase report path is not canonical");
  }
  const snapshot = await readStableRegularFileSnapshot(reportPath, {
    containmentRoot: receiptsDirectory,
    label: "Lifecycle phase report " + id
  });
  if (snapshot.sha256 !== binding.sha256) lifecycleFailure(id, "phase report digest mismatch");
  const report = JSON.parse(snapshot.bytes.toString("utf8"));
  const inputs = await readReleaseLifecycleInputs(sourceRoot);
  const plan = resolveDefaultLifecyclePlan(RELEASE_LIFECYCLE_STAGES[id], inputs);
  assertReleaseLifecycleTerminalReport(report, receipt, plan, inputs.packageIdentities);
  return Object.freeze({ path: binding.path, sha256: binding.sha256, report });
}

export async function sha256File(filePath) {
  return sha256(await readFile(filePath));
}

function gitText(cwd, args, optional = false) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", windowsHide: true }).trim();
  } catch (error) {
    if (optional) return null;
    throw error;
  }
}

function gitPaths(cwd, args) {
  const raw = execFileSync("git", [...args, "-z"], { cwd, encoding: "utf8", windowsHide: true });
  return raw.split("\0").filter(Boolean).map(normalizedPath);
}

function isEphemeralUntracked(filePath) {
  return EPHEMERAL_PREFIXES.some((prefix) => filePath === prefix.slice(0, -1) || filePath.startsWith(prefix));
}

export function sourcePaths(cwd) {
  const tracked = gitPaths(cwd, ["ls-files", "--cached"]);
  const untracked = gitPaths(cwd, ["ls-files", "--others", "--exclude-standard"])
    .filter((filePath) => !isEphemeralUntracked(filePath));
  return [...new Set([...tracked, ...untracked])].sort();
}

export function readGitState(cwd) {
  const trackedDiff = spawnSync("git", ["diff", "--quiet", "HEAD", "--"], { cwd, windowsHide: true }).status !== 0;
  const stagedDiff = spawnSync("git", ["diff", "--cached", "--quiet", "HEAD", "--"], { cwd, windowsHide: true }).status !== 0;
  const untracked = gitPaths(cwd, ["ls-files", "--others", "--exclude-standard"])
    .filter((filePath) => !isEphemeralUntracked(filePath));
  return Object.freeze({
    commit: gitText(cwd, ["rev-parse", "HEAD"]),
    branch: gitText(cwd, ["branch", "--show-current"], true) || "detached",
    repository: gitText(cwd, ["config", "--get", "remote.origin.url"], true),
    dirty: trackedDiff || stagedDiff || untracked.length > 0,
    untrackedSourceFileCount: untracked.length
  });
}

export async function computeSourceTreeDigest(cwd) {
  const hash = createHash("sha256");
  hash.update("hakimi-source-tree-v1\0");
  for (const filePath of sourcePaths(cwd)) {
    const absolutePath = path.resolve(cwd, filePath);
    hash.update(filePath);
    hash.update("\0");
    try {
      const details = await lstat(absolutePath);
      if (details.isSymbolicLink()) {
        hash.update("symlink\0");
        hash.update(await readlink(absolutePath));
      } else if (details.isFile()) {
        hash.update("file\0");
        hash.update(await sha256File(absolutePath));
      } else {
        hash.update("other\0");
      }
    } catch (error) {
      if (error && error.code === "ENOENT") hash.update("deleted\0");
      else throw error;
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

export function readHtmlMeta(html, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = html.match(new RegExp(
    `<meta\\s+name=["']${escapedName}["']\\s+content=(["'])(.*?)\\1\\s*\\/?>`,
    "iu"
  ));
  if (!match?.[2]) throw new Error(`Built index is missing ${name} metadata.`);
  return decodeHtmlAttribute(match[2]);
}

export async function readBuiltReleaseMetadata(
  distDirectory,
  { containmentRoot = distDirectory } = {}
) {
  const indexSnapshot = await readStableRegularFileSnapshot(
    path.resolve(distDirectory, "index.html"),
    { containmentRoot, label: "Built release index" }
  );
  const html = indexSnapshot.bytes.toString("utf8");
  const serializedManifest = readHtmlMeta(html, "hakimi-release-storage-manifest");
  const manifestDigest = sha256(serializedManifest);
  const injectedDigest = readHtmlMeta(html, "hakimi-release-storage-manifest-digest");
  if (manifestDigest !== injectedDigest) throw new Error("Built manifest digest does not match canonical bytes.");
  const descriptor = JSON.parse(readHtmlMeta(html, "hakimi-release-database"));
  const manifest = JSON.parse(serializedManifest);
  if (canonicalJson(descriptor) !== canonicalJson(manifest?.database)) {
    throw new Error("Built release descriptor does not match the storage manifest database descriptor.");
  }
  const evidenceId = readHtmlMeta(html, "hakimi-release-evidence-id");
  if (evidenceId !== UNBOUND_RELEASE_EVIDENCE_ID && !BOUND_RELEASE_EVIDENCE_ID.test(evidenceId)) {
    throw new Error("Built release evidence id is not canonical.");
  }
  return Object.freeze({
    descriptor,
    manifest,
    manifestDigest,
    buildVersion: readHtmlMeta(html, "hakimi-build-version"),
    evidenceId,
    indexSha256: indexSnapshot.sha256,
    indexSize: indexSnapshot.size
  });
}

export function computeEvidenceId({ gitCommit, sourceTreeDigest, lockfileDigest, channel }) {
  const digest = sha256(canonicalJson({
    namespace: "hakimi-release-evidence-id-v1",
    gitCommit,
    sourceTreeDigest,
    lockfileDigest,
    channel
  }));
  return `hre1-${digest.slice(0, 32)}`;
}

async function walkArtifactFiles({
  artifactRoot,
  containmentRoot,
  containmentRealPath,
  directory,
  excluded,
  files
}) {
  const label = `Release artifact directory ${normalizedPath(path.relative(artifactRoot, directory)) || "."}`;
  const before = await stableDirectoryState({
    containmentRoot,
    containmentRealPath,
    directory,
    label
  });
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = normalizedPath(path.relative(artifactRoot, absolutePath));
    const details = await lstat(absolutePath, { bigint: true });
    const entryLabel = `Release artifact ${relativePath}`;
    if (details.isSymbolicLink() || entry.isSymbolicLink()) {
      throw new Error(`${entryLabel} cannot be a symlink, junction, or reparse alias.`);
    }
    if (details.isDirectory() && entry.isDirectory()) {
      await walkArtifactFiles({
        artifactRoot,
        containmentRoot,
        containmentRealPath,
        directory: absolutePath,
        excluded,
        files
      });
    } else if (details.isFile() && entry.isFile()) {
      const snapshot = await readStableRegularFileSnapshotFromRoot({
        containmentRoot,
        containmentRealPath,
        filePath: absolutePath,
        label: entryLabel
      });
      if (!excluded.has(relativePath)) {
        files.push({ path: relativePath, size: snapshot.size, sha256: snapshot.sha256 });
      }
    } else {
      throw new Error(`${entryLabel} is non-regular or changed type during artifact enumeration.`);
    }
  }
  const after = await stableDirectoryState({
    containmentRoot,
    containmentRealPath,
    directory,
    label
  });
  if (canonicalJson(before.identity) !== canonicalJson(after.identity)
    || !sameResolvedPath(before.realPath, after.realPath)) {
    throw new Error(`${label} changed while the artifact snapshot was enumerated.`);
  }
}

export async function collectArtifactEntries(
  root,
  excludedPaths = [],
  { containmentRoot = root } = {}
) {
  const artifactRoot = path.resolve(root);
  const stableRoot = await assertStableDirectoryPathWithin(
    containmentRoot,
    artifactRoot,
    "Release artifact root"
  );
  const excluded = new Set(excludedPaths.map(normalizedPath));
  const files = [];
  await walkArtifactFiles({
    artifactRoot,
    containmentRoot: stableRoot.containmentRoot,
    containmentRealPath: stableRoot.containmentRealPath,
    directory: artifactRoot,
    excluded,
    files
  });
  return files;
}

export function releaseArtifactComponents(artifactEntries) {
  if (!Array.isArray(artifactEntries)) {
    throw new Error("Release artifact inventory must be an array.");
  }
  const components = {};
  for (const [componentId, componentPath] of Object.entries(
    REQUIRED_RELEASE_ARTIFACT_COMPONENT_PATHS
  )) {
    const matches = artifactEntries.filter((entry) => entry?.path === componentPath);
    if (matches.length !== 1) {
      throw new Error(
        `Required release artifact component must appear exactly once: ${componentId}/${componentPath}.`
      );
    }
    const entry = matches[0];
    if (
      !Number.isInteger(entry.size)
      || entry.size <= 0
      || typeof entry.sha256 !== "string"
      || !/^[a-f0-9]{64}$/u.test(entry.sha256)
    ) {
      throw new Error(`Required release artifact component is malformed: ${componentId}.`);
    }
    components[componentId] = Object.freeze({
      path: entry.path,
      size: entry.size,
      sha256: entry.sha256
    });
  }
  return Object.freeze(components);
}

function browserCandidates(name) {
  const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
  if (name === "edge") {
    return [
      ...roots.map((root) => path.join(root, "Microsoft", "Edge", "Application", "msedge.exe")),
      "microsoft-edge",
      "msedge"
    ];
  }
  return [
    ...roots.map((root) => path.join(root, "Google", "Chrome", "Application", "chrome.exe")),
    "google-chrome",
    "chrome"
  ];
}

function detectBrowser(name) {
  for (const executable of browserCandidates(name)) {
    if (process.platform === "win32" && path.isAbsolute(executable)) {
      if (!existsSync(executable)) continue;
      const result = spawnSync("powershell.exe", [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "(Get-Item -LiteralPath $env:HAKIMI_BROWSER_VERSION_PATH).VersionInfo.ProductVersion"
      ], {
        encoding: "utf8",
        windowsHide: true,
        timeout: 5_000,
        env: { ...process.env, HAKIMI_BROWSER_VERSION_PATH: executable }
      });
      if (result.status === 0) {
        const version = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
        if (version) return `${name === "edge" ? "Microsoft Edge" : "Google Chrome"} ${version}`;
      }
      continue;
    }
    const result = spawnSync(executable, ["--version"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5_000
    });
    if (result.status === 0) {
      const version = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
      if (version) return version;
    }
  }
  return "not-detected";
}

export function detectBrowserVersions() {
  return Object.freeze({ edge: detectBrowser("edge"), chrome: detectBrowser("chrome") });
}

export function npmVersion(cwd) {
  const invocation = releaseCommandInvocation("npm", ["--version"]);
  return execFileSync(invocation.executable, invocation.args, {
    cwd,
    encoding: "utf8",
    windowsHide: true
  }).trim();
}

export function releaseToolchain(cwd) {
  return Object.freeze({
    node: process.version,
    npm: npmVersion(cwd),
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    browsers: detectBrowserVersions()
  });
}

export async function policyFileEntries(cwd) {
  return Promise.all(RELEASE_POLICY_PATHS.map(async (filePath) => ({
    path: filePath,
    sha256: await sha256File(path.resolve(cwd, filePath))
  })));
}

export function parseCli(argv) {
  const flags = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (flags.has(key)) throw new Error(`Duplicate argument: --${key}`);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) flags.set(key, true);
    else {
      flags.set(key, next);
      index += 1;
    }
  }
  return flags;
}
