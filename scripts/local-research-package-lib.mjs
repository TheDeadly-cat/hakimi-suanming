import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";
import { canonicalJson, collectArtifactEntries, readStableRegularFileSnapshot, sha256 } from "./release-evidence-lib.mjs";

// Selection of the already verified personal-use artifact. This does not select
// a new source build or confer content/expert/public-release admission.
export const LOCAL_RESEARCH_RELEASE = Object.freeze({
  buildVersion: "c15ef05bb165",
  evidenceId: "hre1-fe550f335b9d1166535e59d0dbb5db13",
  lockSha256: "1403c9d765fff226b68d5b51e9cbe2c9cb724d7e3fc47893d3d3fa081d38227e",
  artifactSetDigest: "d6774223f58104c78a88df7daef9c771b23a7dc854cf46de240fbe54a7da7cd6",
  fileCount: 137,
  origin: "http://127.0.0.1:5188/",
  nodeVersion: "24.16.0"
});
const LOCK_PATH = "tmp/release-artifact-identity.json";
const PACKAGE_MANIFEST = "local-package-files.json";
const RUNTIME_FILES = Object.freeze([
  "LOCAL-RESEARCH-INSTALL.txt",
  "scripts/local-research.mjs",
  "scripts/local-research-package-lib.mjs",
  "scripts/release-artifact-identity-lib.mjs",
  "scripts/release-evidence-lib.mjs",
  "scripts/formal-npm-lifecycle-closure-lib.mjs",
  "scripts/install-local-research.ps1",
  "scripts/launch-local-research.ps1"
]);
const SOURCE_ROOT = fileURLToPath(new URL("../", import.meta.url));

function requireOutside(source, destination) {
  const relative = path.relative(path.resolve(source), path.resolve(destination));
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Output must be outside the input package/artifact workspace.");
  }
}
async function copyBytes(source, destination, containmentRoot) {
  const snapshot = await readStableRegularFileSnapshot(source, { containmentRoot, label: "Local package input" });
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, snapshot.bytes, { flag: "wx" });
  return snapshot;
}
export async function verifyFixedLocalArtifact(root) {
  const absolute = path.resolve(root);
  const lockPath = path.join(absolute, LOCK_PATH);
  const snapshot = await readStableRegularFileSnapshot(lockPath, { containmentRoot: absolute, label: "Pinned local artifact lock" });
  if (snapshot.sha256 !== LOCAL_RESEARCH_RELEASE.lockSha256) throw new Error("Fixed local artifact lock identity mismatch.");
  const result = await verifyReleaseArtifactIdentityLock({
    cwd: absolute, dist: path.join(absolute, "dist/web"), lockPath,
    evidenceId: LOCAL_RESEARCH_RELEASE.evidenceId
  });
  if (result.lock.buildVersion !== LOCAL_RESEARCH_RELEASE.buildVersion
    || result.lock.artifactSetDigest !== LOCAL_RESEARCH_RELEASE.artifactSetDigest
    || result.lock.fileCount !== LOCAL_RESEARCH_RELEASE.fileCount) throw new Error("Fixed local artifact identity mismatch.");
  return result;
}

export async function packageFixedLocalArtifact({ artifactWorkspace, outputDirectory }) {
  const source = path.resolve(artifactWorkspace);
  const output = path.resolve(outputDirectory);
  requireOutside(source, output);
  requireOutside(output, source);
  const verified = await verifyFixedLocalArtifact(source);
  await mkdir(output, { recursive: false });
  for (const entry of verified.lock.files) {
    const rel = `dist/web/${entry.path}`;
    const copied = await copyBytes(path.join(source, rel), path.join(output, rel), source);
    if (copied.sha256 !== entry.sha256 || copied.size !== entry.size) throw new Error("Artifact changed while packaging.");
  }
  await copyBytes(path.join(source, LOCK_PATH), path.join(output, LOCK_PATH), source);
  for (const rel of RUNTIME_FILES) await copyBytes(path.join(SOURCE_ROOT, rel), path.join(output, rel), SOURCE_ROOT);
  const files = await collectArtifactEntries(output, [], { containmentRoot: output });
  const manifest = { schemaVersion: 1, kind: "fixed_local_research_package", release: LOCAL_RESEARCH_RELEASE, files };
  await writeFile(path.join(output, PACKAGE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
  await verifyLocalPackage(output);
  await verifyFixedLocalArtifact(source);
  return { packageRoot: output, ...LOCAL_RESEARCH_RELEASE, packageFileCount: files.length + 1, rebuilt: false };
}

export async function verifyLocalPackage(root) {
  const absolute = path.resolve(root);
  const snapshot = await readStableRegularFileSnapshot(path.join(absolute, PACKAGE_MANIFEST), {
    containmentRoot: absolute, label: "Local package file manifest"
  });
  const manifest = JSON.parse(snapshot.bytes.toString("utf8"));
  if (manifest?.schemaVersion !== 1 || manifest.kind !== "fixed_local_research_package"
    || canonicalJson(manifest.release) !== canonicalJson(LOCAL_RESEARCH_RELEASE)
    || !Array.isArray(manifest.files)) throw new Error("Local package manifest is invalid.");
  const verified = await verifyFixedLocalArtifact(absolute);
  const expectedPaths = [...verified.lock.files.map((entry) => `dist/web/${entry.path}`), LOCK_PATH, ...RUNTIME_FILES].sort();
  const actualPaths = manifest.files.map((entry) => entry.path).sort();
  if (canonicalJson(actualPaths) !== canonicalJson(expectedPaths)) throw new Error("Local package required file set is incomplete or duplicated.");
  const actual = await collectArtifactEntries(absolute, [PACKAGE_MANIFEST], { containmentRoot: absolute });
  if (canonicalJson(actual) !== canonicalJson(manifest.files)) throw new Error("Local package bytes differ from its complete file manifest.");
  return { packageRoot: absolute, manifest, manifestSha256: snapshot.sha256, artifact: verified };
}

export async function installLocalPackage({ packageRoot, destination }) {
  const source = path.resolve(packageRoot);
  const target = path.resolve(destination);
  if (source === target) {
    await verifyLocalPackage(source);
    return { installedRoot: target, reused: true, origin: LOCAL_RESEARCH_RELEASE.origin };
  }
  requireOutside(source, target);
  requireOutside(target, source);
  const verified = await verifyLocalPackage(source);
  await mkdir(path.dirname(target), { recursive: true });
  try { await mkdir(target); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = await verifyLocalPackage(target);
    if (existing.manifestSha256 !== verified.manifestSha256) throw new Error("Destination contains another package; it will not be replaced.");
    return { installedRoot: target, reused: true, origin: LOCAL_RESEARCH_RELEASE.origin };
  }
  // The destination is create-only. A failed copy is retained for diagnostics;
  // it cannot be launched and a later install will not overwrite it silently.
  for (const rel of [...verified.manifest.files.map((entry) => entry.path), PACKAGE_MANIFEST]) {
    await copyBytes(path.join(source, rel), path.join(target, rel), source);
  }
  const installed = await verifyLocalPackage(target);
  if (installed.manifestSha256 !== verified.manifestSha256) throw new Error("Installed package differs from input.");
  return { installedRoot: target, reused: false, origin: LOCAL_RESEARCH_RELEASE.origin };
}

function globalHeaders(text) {
  const headers = {};
  let active = false;
  for (const line of text.split(/\r?\n/u)) {
    if (line && !/^\s/u.test(line)) { active = line.trim() === "/*"; continue; }
    const match = /^\s+([^:]+):\s*(.+)$/u.exec(line);
    if (active && match) headers[match[1]] = match[2];
  }
  return headers;
}
const CONTENT_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".wasm": "application/wasm"
});

// The port is an explicit caller input only for isolated automated tests.
// The installed CLI always binds the fixed 127.0.0.1:5188 origin.
export async function startLocalPackageServer(packageRoot, { port = 5188 } = {}) {
  const verified = await verifyLocalPackage(packageRoot);
  const content = new Map();
  for (const entry of verified.artifact.lock.files) {
    const snapshot = await readStableRegularFileSnapshot(path.join(verified.packageRoot, "dist/web", entry.path), {
      containmentRoot: verified.packageRoot, label: "Served local artifact"
    });
    if (snapshot.sha256 !== entry.sha256) throw new Error("Artifact changed before preview startup.");
    content.set(`/${entry.path}`, snapshot.bytes);
  }
  const headers = globalHeaders(content.get("/_headers").toString("utf8"));
  const server = createServer((request, response) => {
    if (request.headers.host !== `127.0.0.1:${server.address().port}`) { response.writeHead(403).end(); return; }
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1/").pathname); }
    catch { response.writeHead(400).end(); return; }
    if (pathname.includes("\\") || pathname.includes("\0") || pathname.includes("..")) { response.writeHead(400).end(); return; }
    if (pathname === "/_headers" || pathname === "/release-evidence.json.sha256") { response.writeHead(404).end(); return; }
    let selected = pathname === "/" ? "/index.html" : pathname;
    if (!content.has(selected) && (request.headers.accept ?? "").includes("text/html") && !path.posix.extname(selected)) selected = "/index.html";
    const bytes = content.get(selected);
    if (!bytes) { response.writeHead(404, { "Cache-Control": "no-store" }).end(); return; }
    response.writeHead(200, { ...headers, "Content-Type": CONTENT_TYPES[path.posix.extname(selected)] ?? "application/octet-stream",
      "Cache-Control": "no-store", "Content-Length": bytes.length });
    response.end(request.method === "HEAD" ? undefined : bytes);
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen({ host: "127.0.0.1", port, exclusive: true }, resolve); });
  return { server, origin: `http://127.0.0.1:${server.address().port}/`, release: LOCAL_RESEARCH_RELEASE };
}

export async function probeLocalPackage(packageRoot, { origin = LOCAL_RESEARCH_RELEASE.origin } = {}) {
  const verified = await verifyLocalPackage(packageRoot);
  const url = new URL(origin);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.pathname !== "/" || url.search || url.hash || url.username) throw new Error("Probe requires an explicit loopback origin.");
  for (const name of ["index.html", "sw.js"]) {
    const expected = verified.artifact.lock.files.find((entry) => entry.path === name);
    try {
      const response = await fetch(new URL(name === "index.html" ? "" : name, url), {
        redirect: "error", signal: AbortSignal.timeout(2000), headers: { "Cache-Control": "no-cache", "Accept-Encoding": "identity" }
      });
      if (response.status !== 200 || sha256(Buffer.from(await response.arrayBuffer())) !== expected.sha256) return { state: "foreign", origin, reason: `${name} identity mismatch` };
    } catch (error) {
      if (name === "index.html" && error.cause?.code === "ECONNREFUSED") return { state: "stopped", origin };
      return { state: "foreign", origin, reason: "Listener did not return the exact fixed artifact." };
    }
  }
  return { state: "matching", origin, buildVersion: LOCAL_RESEARCH_RELEASE.buildVersion };
}
