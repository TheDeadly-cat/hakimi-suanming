import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";

export const RELEASE_POLICY_PATHS = Object.freeze([
  "docs/release/web-v1-release-decisions.json",
  "docs/release/release-generation-history.json",
  "docs/security/hosting-security-policy.json",
  "docs/release/release-evidence.schema.json"
]);

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

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

export async function readBuiltReleaseMetadata(distDirectory) {
  const html = await readFile(path.resolve(distDirectory, "index.html"), "utf8");
  const serializedManifest = readHtmlMeta(html, "hakimi-release-storage-manifest");
  const manifestDigest = sha256(serializedManifest);
  const injectedDigest = readHtmlMeta(html, "hakimi-release-storage-manifest-digest");
  if (manifestDigest !== injectedDigest) throw new Error("Built manifest digest does not match canonical bytes.");
  const evidenceId = readHtmlMeta(html, "hakimi-release-evidence-id");
  if (evidenceId !== UNBOUND_RELEASE_EVIDENCE_ID && !BOUND_RELEASE_EVIDENCE_ID.test(evidenceId)) {
    throw new Error("Built release evidence id is not canonical.");
  }
  return Object.freeze({
    descriptor: JSON.parse(readHtmlMeta(html, "hakimi-release-database")),
    manifest: JSON.parse(serializedManifest),
    manifestDigest,
    buildVersion: readHtmlMeta(html, "hakimi-build-version"),
    evidenceId
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

async function walkFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, absolutePath));
    else if (entry.isFile()) files.push(normalizedPath(path.relative(root, absolutePath)));
  }
  return files;
}

export async function collectArtifactEntries(root, excludedPaths = []) {
  const excluded = new Set(excludedPaths.map(normalizedPath));
  const files = (await walkFiles(root)).filter((filePath) => !excluded.has(filePath));
  return Promise.all(files.map(async (filePath) => {
    const absolutePath = path.resolve(root, filePath);
    const bytes = await readFile(absolutePath);
    return { path: filePath, size: bytes.byteLength, sha256: sha256(bytes) };
  }));
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
