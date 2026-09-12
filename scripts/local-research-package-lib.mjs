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
const FIXED_RUNTIME_FILES = Object.freeze([
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
// Explicit next local engineering candidate; never selected by version ordering.
// The built application belongs to this source commit; packaging changes are separate.
export const LOCAL_RESEARCH_CANDIDATE = Object.freeze({
  buildVersion: "9057371baf85",
  sourceCommit: "3a44f360dd62345a67f6b5e7e38d63a3082b5e66",
  evidenceId: "hre1-0615e1bed9fb529461d073780fecc5d5",
  lockSha256: "75b4ae48b72b252ff7e8d17c007de207cf973d2a513ea25417a9558d150c158d",
  artifactSetDigest: "154ea0f6e2c1f76b7dcc39d1c3033e070b91c127a97560cccca40ac50c1d319c",
  fileCount: 137,
  origin: "http://127.0.0.1:5189/",
  nodeVersion: "24.16.0",
  packageRevision: "4",
  localEngineeringCandidate: true,
  formalAdmissionAuthorized: false,
  expertClaimsAuthorized: false,
  publicReleaseAuthorized: false
});
const CANDIDATE_RECEIPTS = Object.freeze([
  {
    "path": "tmp/integration-receipts-9057371baf85/pwa.json",
    "sha256": "e1927281aa3b4650fef532a9e9fc7c5c7f19f5bbf364c1c5d4dcb2e0258f884c"
  },
  {
    "path": "tmp/integration-receipts-9057371baf85/browser-results/pwa-56700-3446ee85-5142-4fd0-ab72-8944f505860b.json",
    "sha256": "72a5455f85e0bad05407cd5b1b08bf1f8a899cf61a100785723dfc7e37038d1c"
  },
  {
    "path": "tmp/integration-receipts-9057371baf85/web-v1-flow.json",
    "sha256": "635c94bbbc35139551c679d403015455a3ad1b04219f52b308a3d63e3bbebd29"
  },
  {
    "path": "tmp/integration-receipts-9057371baf85/browser-results/web-v1-flow-41280-1f5e83fb-8044-46f9-bf1a-79b726c460a2.json",
    "sha256": "1e011b5244afd795a5cd40e6b902fabb80dc722d915e40f552bfb55c3dcb1e2b"
  }
].map((entry) => Object.freeze(entry)));

// Only the two explicit selections are accepted. Existing imports retain c15ef.
export function createLocalPackageTools(release) {
  if (release !== LOCAL_RESEARCH_RELEASE && release !== LOCAL_RESEARCH_CANDIDATE) {
    throw new Error("Select a documented local artifact; arbitrary release definitions are not accepted.");
  }
  const isCandidate = release === LOCAL_RESEARCH_CANDIDATE;
  const packageKind = isCandidate ? "local_research_candidate_package" : "fixed_local_research_package";
  const proofFiles = isCandidate ? CANDIDATE_RECEIPTS : [];
  const RUNTIME_FILES = isCandidate ? FIXED_RUNTIME_FILES.map((name) => ({
    "LOCAL-RESEARCH-INSTALL.txt": "LOCAL-CANDIDATE-INSTALL.txt",
    "scripts/local-research.mjs": "scripts/local-research-candidate.mjs",
    "scripts/install-local-research.ps1": "scripts/install-local-candidate.ps1",
    "scripts/launch-local-research.ps1": "scripts/launch-local-candidate.ps1"
  })[name] ?? name) : FIXED_RUNTIME_FILES;
  async function verifyCandidateReceipts(root) {
    for (const entry of proofFiles) {
      const snapshot = await readStableRegularFileSnapshot(path.join(root, entry.path), {
        containmentRoot: root, label: "Original same-artifact browser receipt"
      });
      if (snapshot.sha256 !== entry.sha256) throw new Error("Candidate browser receipt identity mismatch.");
    }
  }
  async function verifyFixedLocalArtifact(root) {
    const absolute = path.resolve(root);
    const lockPath = path.join(absolute, LOCK_PATH);
    const snapshot = await readStableRegularFileSnapshot(lockPath, { containmentRoot: absolute, label: "Pinned local artifact lock" });
    if (snapshot.sha256 !== release.lockSha256) throw new Error("Fixed local artifact lock identity mismatch.");
    const result = await verifyReleaseArtifactIdentityLock({
      cwd: absolute, dist: path.join(absolute, "dist/web"), lockPath,
      evidenceId: release.evidenceId
    });
    if (result.lock.buildVersion !== release.buildVersion
      || result.lock.artifactSetDigest !== release.artifactSetDigest
      || result.lock.fileCount !== release.fileCount) throw new Error("Fixed local artifact identity mismatch.");
    await verifyCandidateReceipts(absolute);
    return result;
  }

  async function packageFixedLocalArtifact({ artifactWorkspace, outputDirectory }) {
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
    for (const entry of proofFiles) await copyBytes(path.join(source, entry.path), path.join(output, entry.path), source);
    for (const rel of RUNTIME_FILES) await copyBytes(path.join(SOURCE_ROOT, rel), path.join(output, rel), SOURCE_ROOT);
    const files = await collectArtifactEntries(output, [], { containmentRoot: output });
    const manifest = { schemaVersion: 1, kind: packageKind, release: release, files };
    await writeFile(path.join(output, PACKAGE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    await verifyLocalPackage(output);
    await verifyFixedLocalArtifact(source);
    return { packageRoot: output, ...release, packageFileCount: files.length + 1, rebuilt: false };
  }

  async function verifyLocalPackage(root) {
    const absolute = path.resolve(root);
    const snapshot = await readStableRegularFileSnapshot(path.join(absolute, PACKAGE_MANIFEST), {
      containmentRoot: absolute, label: "Local package file manifest"
    });
    const manifest = JSON.parse(snapshot.bytes.toString("utf8"));
    if (manifest?.schemaVersion !== 1 || manifest.kind !== packageKind
      || canonicalJson(manifest.release) !== canonicalJson(release)
      || !Array.isArray(manifest.files)) throw new Error("Local package manifest is invalid.");
    const verified = await verifyFixedLocalArtifact(absolute);
    const expectedPaths = [...verified.lock.files.map((entry) => `dist/web/${entry.path}`), LOCK_PATH, ...RUNTIME_FILES, ...proofFiles.map((entry) => entry.path)].sort();
    const actualPaths = manifest.files.map((entry) => entry.path).sort();
    if (canonicalJson(actualPaths) !== canonicalJson(expectedPaths)) throw new Error("Local package required file set is incomplete or duplicated.");
    const actual = await collectArtifactEntries(absolute, [PACKAGE_MANIFEST], { containmentRoot: absolute });
    if (canonicalJson(actual) !== canonicalJson(manifest.files)) throw new Error("Local package bytes differ from its complete file manifest.");
    return { packageRoot: absolute, manifest, manifestSha256: snapshot.sha256, artifact: verified };
  }

  async function installLocalPackage({ packageRoot, destination }) {
    const source = path.resolve(packageRoot);
    const target = path.resolve(destination);
    if (source === target) {
      await verifyLocalPackage(source);
      return { installedRoot: target, reused: true, origin: release.origin };
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
      return { installedRoot: target, reused: true, origin: release.origin };
    }
    // The destination is create-only. A failed copy is retained for diagnostics;
    // it cannot be launched and a later install will not overwrite it silently.
    for (const rel of [...verified.manifest.files.map((entry) => entry.path), PACKAGE_MANIFEST]) {
      await copyBytes(path.join(source, rel), path.join(target, rel), source);
    }
    const installed = await verifyLocalPackage(target);
    if (installed.manifestSha256 !== verified.manifestSha256) throw new Error("Installed package differs from input.");
    return { installedRoot: target, reused: false, origin: release.origin };
  }

  function globalHeaders(text) {
    const headers = {};
    let active = false;
    for (const line of text.split(/\r?\n/u)) {
      if (line && !/^\s/u.test(line)) { active = line.trim() === "/*"; continue; }
      const match = /^\s+([^:]+):\s*(.+)$/u.exec(line);
      if (active && match) {
        // This directive is ignored in Report-Only (W3C upgrade-insecure-requests
        // section 3.1) and creates console errors. Adapt only the candidate HTTP
        // response; retain every other directive and the locked hosting file.
        const value = isCandidate && match[1].toLowerCase() === "content-security-policy-report-only"
          ? match[2].split(";").map((part) => part.trim())
            .filter((part) => !/^upgrade-insecure-requests(?:\s|$)/iu.test(part)).join("; ")
          : match[2];
        headers[match[1]] = value;
      }
    }
    return headers;
  }
  const CONTENT_TYPES = Object.freeze({
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
    ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".wasm": "application/wasm"
  });

  // The port is an explicit caller input only for isolated automated tests.
  // Each installed CLI binds only its selected, pinned loopback origin.
  async function startLocalPackageServer(packageRoot, { port = Number(new URL(release.origin).port) } = {}) {
    if (isCandidate && (!Number.isInteger(port) || port < 0 || port > 65535)) throw new Error("Candidate port must be an explicit integer.");
    if (isCandidate && port === 5188) throw new Error("Candidate serving may not use the daily 5188 origin.");
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
    return { server, origin: `http://127.0.0.1:${server.address().port}/`, release: release };
  }

  async function probeLocalPackage(packageRoot, { origin = release.origin } = {}) {
    const verified = await verifyLocalPackage(packageRoot);
    const url = new URL(origin);
    if (isCandidate && url.port === "5188") throw new Error("Candidate probing may not use the daily 5188 origin.");
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
    return { state: "matching", origin, buildVersion: release.buildVersion };
  }
  return Object.freeze({ verifyFixedLocalArtifact, packageFixedLocalArtifact, verifyLocalPackage, installLocalPackage, startLocalPackageServer, probeLocalPackage });
}

export const { verifyFixedLocalArtifact, packageFixedLocalArtifact, verifyLocalPackage, installLocalPackage, startLocalPackageServer, probeLocalPackage } = createLocalPackageTools(LOCAL_RESEARCH_RELEASE);
