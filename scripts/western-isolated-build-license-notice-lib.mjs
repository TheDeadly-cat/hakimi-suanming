import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const libraryPath = fileURLToPath(import.meta.url);
const defaultWorkspaceRoot = path.resolve(path.dirname(libraryPath), "..");

export const WESTERN_LICENSE_NOTICE_IDENTITY = Object.freeze({
  packageName: "astronomy-engine",
  version: "2.1.19",
  integrity: "sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==",
  engineEsmBytes: 412025,
  engineEsmSha256: "068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7",
  licenseAssetPath: "licenses/astronomy-engine-2.1.19-LICENSE.txt",
  licenseBytes: 1095,
  licenseSha256: "690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023",
  sourceLockBytes: 2547,
  sourceLockSha256: "a0d929d78cff75aa543e78350aece6a35636c4c081f5620c5a7cc9aaaf400975"
});

export const WESTERN_LICENSE_NOTICE_SURFACES = Object.freeze({
  "browser-parity": Object.freeze({
    surfaceId: "browser-parity",
    configPath: "packages/western-astronomy-engine-adapter-draft/vite.browser-parity.config.mjs",
    sourceHtmlPath: "packages/western-astronomy-engine-adapter-draft/browser-parity/index.html",
    localLicensePath: "packages/western-astronomy-engine-adapter-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt"
  }),
  "rules-preview": Object.freeze({
    surfaceId: "rules-preview",
    configPath: "packages/western-astrology-rules-preview-draft/vite.rules-preview.config.mjs",
    sourceHtmlPath: "packages/western-astrology-rules-preview-draft/browser-app/index.html",
    localLicensePath: "packages/western-astrology-rules-preview-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt"
  })
});

const SOURCE_LOCK_PATH = "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-source-lock.json";
export const WESTERN_LICENSE_NOTICE_EVIDENCE_PATH = "content/system-admission/western-astronomy-engine-build-notice-evidence.v1.json";
const EXPECTED_LICENSE_HREF = `./${WESTERN_LICENSE_NOTICE_IDENTITY.licenseAssetPath}`;
const WORKER_FILE_PATTERN = /^assets\/browser-worker-[A-Za-z0-9_-]+\.js$/u;
const EVIDENCE_DIGEST_DOMAIN = "hakimi.western.astronomy-engine-build-notice-evidence/1\0";
const CONTROLLED_BUILD_TEMPORARY_PREFIX = "hakimi-western-license-verification-";
const BASIS_ARTIFACTS = Object.freeze([
  Object.freeze({ role: "adapter_package_manifest", path: "packages/western-astronomy-engine-adapter-draft/package.json" }),
  Object.freeze({ role: "package_lock_closure", path: "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json" }),
  Object.freeze({ role: "source_lock", path: SOURCE_LOCK_PATH }),
  Object.freeze({ role: "adapter_local_license_copy", path: "packages/western-astronomy-engine-adapter-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt" }),
  Object.freeze({ role: "browser_parity_build_config", path: "packages/western-astronomy-engine-adapter-draft/vite.browser-parity.config.mjs" }),
  Object.freeze({ role: "browser_parity_source_html", path: "packages/western-astronomy-engine-adapter-draft/browser-parity/index.html" }),
  Object.freeze({ role: "rules_preview_local_license_copy", path: "packages/western-astrology-rules-preview-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt" }),
  Object.freeze({ role: "rules_preview_build_config", path: "packages/western-astrology-rules-preview-draft/vite.rules-preview.config.mjs" }),
  Object.freeze({ role: "rules_preview_source_html", path: "packages/western-astrology-rules-preview-draft/browser-app/index.html" })
]);
const CONTROLLED_RECEIPT_CONTEXTS = new WeakMap();
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const REFLECT_APPLY = Reflect.apply;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  fail("evidence contains a non-canonical JSON value");
}

function fail(message) {
  throw new Error(`Western isolated build license notice verification failed: ${message}`);
}

function portableRelative(root, candidate) {
  return path.relative(root, candidate).split(path.sep).join("/");
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveContainedWorkspaceFile(workspaceRoot, relativePath, label) {
  if (typeof relativePath !== "string" || relativePath.length === 0
    || relativePath.includes("\\") || path.posix.normalize(relativePath) !== relativePath
    || relativePath.startsWith("/") || relativePath.startsWith("../")) {
    fail(`${label} has an unsafe workspace-relative path`);
  }
  const absoluteRoot = path.resolve(workspaceRoot);
  const rootBefore = lstatSync(absoluteRoot, { bigint: true });
  if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink()) {
    fail("workspace root must be a non-symlink directory");
  }
  const rootRealPath = realpathSync.native(absoluteRoot);
  let cursor = absoluteRoot;
  const segments = relativePath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    cursor = path.join(cursor, segments[index]);
    const endpoint = lstatSync(cursor, { bigint: true });
    if (endpoint.isSymbolicLink()) fail(`${label} crosses a symlink or junction`);
    if (index < segments.length - 1 && !endpoint.isDirectory()) {
      fail(`${label} crosses a non-directory path segment`);
    }
    const endpointRealPath = realpathSync.native(cursor);
    if (!isWithin(rootRealPath, endpointRealPath)) fail(`${label} escapes the workspace root`);
  }
  const rootAfter = lstatSync(absoluteRoot, { bigint: true });
  if (!sameStatIdentity(statIdentity(rootBefore), statIdentity(rootAfter))
    || rootRealPath !== realpathSync.native(absoluteRoot)) {
    fail("workspace root changed while resolving a fixed evidence endpoint");
  }
  return cursor;
}

function brandControlledBuildReceipt(receipt, workspaceRoot) {
  const context = Object.freeze({
    workspaceRootRealPath: realpathSync.native(path.resolve(workspaceRoot)),
    producer: "scripts/verify-western-isolated-build-license-notices.mjs",
    mode: "fixed_dual_vite_build_into_owned_ephemeral_root"
  });
  REFLECT_APPLY(WEAK_MAP_SET, CONTROLLED_RECEIPT_CONTEXTS, [receipt, context]);
  return receipt;
}

function requireControlledBuildReceipt(receipt, workspaceRoot) {
  const context = receipt && typeof receipt === "object"
    ? REFLECT_APPLY(WEAK_MAP_GET, CONTROLLED_RECEIPT_CONTEXTS, [receipt])
    : undefined;
  if (!context) {
    fail("evidence construction requires the controlled fixed dual-build receipt");
  }
  const requestedWorkspaceRoot = realpathSync.native(path.resolve(workspaceRoot));
  if (requestedWorkspaceRoot !== context.workspaceRootRealPath) {
    fail("controlled build receipt cannot be rebound to a different workspace root");
  }
  return context;
}

function statIdentity(stat) {
  return Object.freeze({
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    size: stat.size,
    mtimeNs: stat.mtimeNs,
    ctimeNs: stat.ctimeNs
  });
}

function sameStatIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function readHeldRegularFile(filePath, label) {
  let before;
  let beforeRealPath;
  try {
    before = lstatSync(filePath, { bigint: true });
    beforeRealPath = realpathSync.native(filePath);
  } catch (cause) {
    fail(`${label} is not a readable endpoint: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  if (!before.isFile() || before.isSymbolicLink()) fail(`${label} must be a non-symlink regular file`);
  if (before.nlink !== 1n) fail(`${label} must not be a hard-linked endpoint`);

  let fileHandle;
  try {
    fileHandle = openSync(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(fileHandle, { bigint: true });
    if (!opened.isFile() || !sameStatIdentity(statIdentity(before), statIdentity(opened))) {
      fail(`${label} changed between path inspection and held-handle open`);
    }
    const bytes = readFileSync(fileHandle);
    const afterHandle = fstatSync(fileHandle, { bigint: true });
    const afterPath = lstatSync(filePath, { bigint: true });
    const afterRealPath = realpathSync.native(filePath);
    if (!sameStatIdentity(statIdentity(opened), statIdentity(afterHandle))
      || !sameStatIdentity(statIdentity(opened), statIdentity(afterPath))
      || beforeRealPath !== afterRealPath) {
      fail(`${label} changed during the held-handle endpoint read`);
    }
    return Object.freeze({
      bytes,
      byteLength: bytes.byteLength,
      sha256: sha256(bytes)
    });
  } finally {
    if (fileHandle !== undefined) closeSync(fileHandle);
  }
}

function inventoryOutputRoot(outputRoot) {
  const absoluteRoot = path.resolve(outputRoot);
  let rootBefore;
  let rootRealPath;
  try {
    rootBefore = lstatSync(absoluteRoot, { bigint: true });
    rootRealPath = realpathSync.native(absoluteRoot);
  } catch (cause) {
    fail(`output root is unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink()) {
    fail("output root must be a non-symlink directory");
  }

  const files = new Map();
  const lowerCasePaths = new Map();
  const pending = [absoluteRoot];
  while (pending.length > 0) {
    const directory = pending.pop();
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const endpoint = path.join(directory, entry.name);
      const relativePath = portableRelative(absoluteRoot, endpoint);
      const endpointStat = lstatSync(endpoint, { bigint: true });
      if (endpointStat.isSymbolicLink()) fail(`${relativePath} must not be a symlink or junction`);
      const endpointRealPath = realpathSync.native(endpoint);
      if (!isWithin(rootRealPath, endpointRealPath)) fail(`${relativePath} escapes the output root`);
      if (endpointStat.isDirectory()) {
        pending.push(endpoint);
        continue;
      }
      if (!endpointStat.isFile()) fail(`${relativePath} must be a regular file or directory`);
      const foldedPath = relativePath.toLowerCase();
      if (lowerCasePaths.has(foldedPath)) {
        fail(`${relativePath} collides by case with ${lowerCasePaths.get(foldedPath)}`);
      }
      lowerCasePaths.set(foldedPath, relativePath);
      files.set(relativePath, readHeldRegularFile(endpoint, `output ${relativePath}`));
    }
  }

  const rootAfter = lstatSync(absoluteRoot, { bigint: true });
  const rootAfterRealPath = realpathSync.native(absoluteRoot);
  if (!sameStatIdentity(statIdentity(rootBefore), statIdentity(rootAfter))
    || rootRealPath !== rootAfterRealPath) {
    fail("output root changed during endpoint inventory");
  }
  return files;
}

function verifyLicenseHtml(htmlBytes, surfaceId) {
  const html = htmlBytes.toString("utf8");
  if (!Buffer.from(html, "utf8").equals(htmlBytes)) fail(`${surfaceId} index.html is not strict UTF-8`);
  const dom = new JSDOM(html, { contentType: "text/html", runScripts: "outside-only" });
  try {
    const { document } = dom.window;
    if (document.querySelector("base")) fail(`${surfaceId} index.html must not contain a base element`);
    if (document.querySelector("template")) {
      fail(`${surfaceId} index.html must not place license metadata behind an inert container`);
    }
    const licenseLinks = [...document.querySelectorAll("*")].filter((element) => {
      if (element.localName !== "link") return false;
      const relTokens = (element.getAttribute("rel") ?? "")
        .trim()
        .toLowerCase()
        .split(/\s+/u)
        .filter(Boolean);
      return relTokens.includes("license");
    });
    if (licenseLinks.length !== 1) fail(`${surfaceId} index.html must contain exactly one rel=license link`);
    const licenseLink = licenseLinks[0];
    if (licenseLink.namespaceURI !== "http://www.w3.org/1999/xhtml"
      || licenseLink.parentElement !== document.head) {
      fail(`${surfaceId} rel=license must be a direct HTML head child, not inert or foreign content`);
    }
    if (licenseLink.getAttribute("rel")?.trim().toLowerCase() !== "license"
      || licenseLink.getAttribute("href") !== EXPECTED_LICENSE_HREF) {
      fail(`${surfaceId} rel=license must target the exact same-origin relative license asset`);
    }
    return Object.freeze({
      href: EXPECTED_LICENSE_HREF,
      linkCount: 1
    });
  } finally {
    dom.window.close();
  }
}

export function verifyWesternCanonicalLicenseInputs(workspaceRoot = defaultWorkspaceRoot) {
  const absoluteWorkspaceRoot = path.resolve(workspaceRoot);
  const sourceLock = readHeldRegularFile(
    resolveContainedWorkspaceFile(absoluteWorkspaceRoot, SOURCE_LOCK_PATH, "Astronomy Engine source lock"),
    "Astronomy Engine source lock"
  );
  if (sourceLock.byteLength !== WESTERN_LICENSE_NOTICE_IDENTITY.sourceLockBytes
    || sourceLock.sha256 !== WESTERN_LICENSE_NOTICE_IDENTITY.sourceLockSha256) {
    fail("Astronomy Engine source lock bytes drifted");
  }
  let parsedSourceLock;
  try {
    parsedSourceLock = JSON.parse(sourceLock.bytes.toString("utf8"));
  } catch (cause) {
    fail(`Astronomy Engine source lock is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  const licenseRecord = parsedSourceLock?.license;
  if (parsedSourceLock?.package?.name !== WESTERN_LICENSE_NOTICE_IDENTITY.packageName
    || parsedSourceLock?.package?.version !== WESTERN_LICENSE_NOTICE_IDENTITY.version
    || parsedSourceLock?.package?.integrity !== WESTERN_LICENSE_NOTICE_IDENTITY.integrity
    || licenseRecord?.spdx !== "MIT"
    || licenseRecord?.standaloneFilePresentInNpmTarball !== false
    || licenseRecord?.localCopy !== "licenses/astronomy-engine-2.1.19-LICENSE.txt"
    || licenseRecord?.bytes !== WESTERN_LICENSE_NOTICE_IDENTITY.licenseBytes
    || licenseRecord?.sha256 !== WESTERN_LICENSE_NOTICE_IDENTITY.licenseSha256) {
    fail("Astronomy Engine source lock no longer binds the exact package and local license identity");
  }

  const localCopies = {};
  for (const surface of Object.values(WESTERN_LICENSE_NOTICE_SURFACES)) {
    const observed = readHeldRegularFile(
      resolveContainedWorkspaceFile(
        absoluteWorkspaceRoot,
        surface.localLicensePath,
        `${surface.surfaceId} local license copy`
      ),
      `${surface.surfaceId} local license copy`
    );
    if (observed.byteLength !== WESTERN_LICENSE_NOTICE_IDENTITY.licenseBytes
      || observed.sha256 !== WESTERN_LICENSE_NOTICE_IDENTITY.licenseSha256) {
      fail(`${surface.surfaceId} local license copy drifted`);
    }
    localCopies[surface.surfaceId] = Object.freeze({
      path: surface.localLicensePath,
      bytes: observed.byteLength,
      sha256: observed.sha256
    });
  }

  return Object.freeze({
    packageName: WESTERN_LICENSE_NOTICE_IDENTITY.packageName,
    version: WESTERN_LICENSE_NOTICE_IDENTITY.version,
    sourceLock: Object.freeze({
      path: SOURCE_LOCK_PATH,
      bytes: sourceLock.byteLength,
      sha256: sourceLock.sha256
    }),
    localLicenseCopies: Object.freeze(localCopies)
  });
}

export function verifyWesternIsolatedBuildLicenseSurface(surfaceId, outputRoot) {
  const surface = WESTERN_LICENSE_NOTICE_SURFACES[surfaceId];
  if (!surface) fail(`unsupported surface ${String(surfaceId)}`);
  if (typeof outputRoot !== "string" || outputRoot.length === 0) fail(`${surfaceId} output root is required`);

  const files = inventoryOutputRoot(outputRoot);
  const licenseEntries = [...files.keys()].filter((entry) => entry.toLowerCase().startsWith("licenses/"));
  if (licenseEntries.length !== 1 || licenseEntries[0] !== WESTERN_LICENSE_NOTICE_IDENTITY.licenseAssetPath) {
    fail(`${surfaceId} must contain exactly the fixed Astronomy Engine license asset under licenses/`);
  }
  const licenseAsset = files.get(WESTERN_LICENSE_NOTICE_IDENTITY.licenseAssetPath);
  if (licenseAsset.byteLength !== WESTERN_LICENSE_NOTICE_IDENTITY.licenseBytes
    || licenseAsset.sha256 !== WESTERN_LICENSE_NOTICE_IDENTITY.licenseSha256) {
    fail(`${surfaceId} emitted license bytes drifted`);
  }

  const htmlFile = files.get("index.html");
  if (!htmlFile) fail(`${surfaceId} index.html is missing`);
  const htmlObservation = verifyLicenseHtml(htmlFile.bytes, surfaceId);

  const workerEntries = [...files.entries()].filter(([entry]) => WORKER_FILE_PATTERN.test(entry));
  if (workerEntries.length !== 1) fail(`${surfaceId} must contain exactly one non-sourcemap Browser Worker chunk`);
  const [workerPath, workerFile] = workerEntries[0];
  const workerSource = workerFile.bytes.toString("utf8");
  if (!Buffer.from(workerSource, "utf8").equals(workerFile.bytes)
    || !workerSource.includes(WESTERN_LICENSE_NOTICE_IDENTITY.version)
    || !workerSource.includes(WESTERN_LICENSE_NOTICE_IDENTITY.engineEsmSha256)) {
    fail(`${surfaceId} non-sourcemap Browser Worker does not carry the locked engine identity markers`);
  }

  const treeProjection = [...files.entries()]
    .map(([entry, observed]) => ({ path: entry, bytes: observed.byteLength, sha256: observed.sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return Object.freeze({
    surfaceId,
    sourceConfigPath: surface.configPath,
    sourceHtmlPath: surface.sourceHtmlPath,
    fileCount: treeProjection.length,
    outputTreeSha256: sha256(Buffer.from(JSON.stringify(treeProjection), "utf8")),
    licenseAsset: Object.freeze({
      path: WESTERN_LICENSE_NOTICE_IDENTITY.licenseAssetPath,
      bytes: licenseAsset.byteLength,
      sha256: licenseAsset.sha256
    }),
    htmlLicenseLink: htmlObservation,
    engineWorkerObservation: Object.freeze({
      path: workerPath,
      bytes: workerFile.byteLength,
      sha256: workerFile.sha256,
      versionMarkerObserved: true,
      engineEsmDigestMarkerObserved: true,
      executionEstablished: false
    })
  });
}

export function verifyWesternIsolatedBuildLicenseNotices({
  browserParityOutputRoot,
  rulesPreviewOutputRoot,
  workspaceRoot = defaultWorkspaceRoot
}) {
  const canonicalInputs = verifyWesternCanonicalLicenseInputs(workspaceRoot);
  const surfaces = Object.freeze([
    verifyWesternIsolatedBuildLicenseSurface("browser-parity", browserParityOutputRoot),
    verifyWesternIsolatedBuildLicenseSurface("rules-preview", rulesPreviewOutputRoot)
  ]);
  const receipt = Object.freeze({
    schemaVersion: "western-isolated-build-license-notice-verification/1",
    status: "isolated_build_notice_bytes_observed_without_legal_clearance",
    canonicalInputs,
    surfaces,
    readBoundary: Object.freeze({
      model: "held_file_handle_endpoint_snapshots",
      crossFileAtomicityEstablished: false,
      intervalIntegrityEstablished: false,
      abaResistanceEstablished: false,
      mutationEpochEstablished: false
    }),
    authorityBoundary: Object.freeze({
      publisherAuthenticityEstablished: false,
      licenseSemanticReviewComplete: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      noticeObligationSatisfied: false,
      formalAdmissionAuthorized: false,
      expertClaimsAuthorized: false,
      releaseReady: false,
      publicDeploymentAuthorized: false
    })
  });
  return receipt;
}

function runFixedWesternBuild(configPath, outputRoot) {
  const vitePath = path.join(defaultWorkspaceRoot, "apps", "web", "node_modules", "vite", "bin", "vite.js");
  execFileSync(process.execPath, [
    vitePath,
    "build",
    "--config",
    path.join(defaultWorkspaceRoot, configPath),
    "--configLoader",
    "runner",
    "--outDir",
    outputRoot,
    "--emptyOutDir",
    "--logLevel",
    "warn"
  ], {
    cwd: defaultWorkspaceRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024
  });
}

function removeOwnedWesternBuildRoot(temporaryRoot) {
  const absoluteTemporaryRoot = path.resolve(temporaryRoot);
  const expectedParent = realpathSync.native(os.tmpdir());
  const actualParent = realpathSync.native(path.dirname(absoluteTemporaryRoot));
  if (actualParent !== expectedParent
    || !path.basename(absoluteTemporaryRoot).startsWith(CONTROLLED_BUILD_TEMPORARY_PREFIX)) {
    fail("refusing to remove a temporary root outside the fixed verification prefix");
  }
  rmSync(absoluteTemporaryRoot, { recursive: true, force: true });
}

export function runWesternIsolatedBuildLicenseNoticeVerification({ evidenceMode = "verify" } = {}) {
  if (!new Set(["verify", "template", "none"]).has(evidenceMode)) {
    fail(`unsupported evidence mode ${String(evidenceMode)}`);
  }
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), CONTROLLED_BUILD_TEMPORARY_PREFIX));
  try {
    const browserParityOutputRoot = path.join(temporaryRoot, "browser-parity");
    const rulesPreviewOutputRoot = path.join(temporaryRoot, "rules-preview");
    runFixedWesternBuild(
      "packages/western-astronomy-engine-adapter-draft/vite.browser-parity.config.mjs",
      browserParityOutputRoot
    );
    runFixedWesternBuild(
      "packages/western-astrology-rules-preview-draft/vite.rules-preview.config.mjs",
      rulesPreviewOutputRoot
    );
    const receipt = brandControlledBuildReceipt(verifyWesternIsolatedBuildLicenseNotices({
      browserParityOutputRoot,
      rulesPreviewOutputRoot,
      workspaceRoot: defaultWorkspaceRoot
    }), defaultWorkspaceRoot);
    if (evidenceMode === "template") {
      return buildWesternLicenseNoticeEvidence(receipt, defaultWorkspaceRoot);
    }
    if (evidenceMode === "none") return receipt;
    return Object.freeze({
      ...receipt,
      evidenceChild: loadAndVerifyWesternLicenseNoticeEvidence(receipt, defaultWorkspaceRoot)
    });
  } finally {
    removeOwnedWesternBuildRoot(temporaryRoot);
  }
}

export function computeWesternLicenseNoticeEvidenceDigest(evidence) {
  const { evidenceDigest: _ignored, ...unsigned } = evidence;
  return sha256(Buffer.from(`${EVIDENCE_DIGEST_DOMAIN}${canonicalJson(unsigned)}`, "utf8"));
}

export function buildWesternLicenseNoticeEvidence(receipt, workspaceRoot = defaultWorkspaceRoot) {
  const receiptContext = requireControlledBuildReceipt(receipt, workspaceRoot);
  if (receipt?.schemaVersion !== "western-isolated-build-license-notice-verification/1"
    || receipt?.status !== "isolated_build_notice_bytes_observed_without_legal_clearance"
    || !Array.isArray(receipt?.surfaces)
    || receipt.surfaces.length !== 2) {
    fail("cannot build evidence from an invalid isolated build receipt");
  }
  const absoluteWorkspaceRoot = path.resolve(workspaceRoot);
  const basisArtifacts = BASIS_ARTIFACTS.map((artifact) => {
    const observed = readHeldRegularFile(
      resolveContainedWorkspaceFile(absoluteWorkspaceRoot, artifact.path, artifact.role),
      artifact.role
    );
    return Object.freeze({
      role: artifact.role,
      path: artifact.path,
      bytes: observed.byteLength,
      sha256: observed.sha256
    });
  });
  const licenseArtifact = basisArtifacts.find((artifact) => artifact.role === "adapter_local_license_copy");
  const licenseBytes = readHeldRegularFile(
    resolveContainedWorkspaceFile(
      absoluteWorkspaceRoot,
      licenseArtifact.path,
      "notice clause candidate source"
    ),
    "notice clause candidate source"
  ).bytes;
  const noticeClause = licenseBytes.subarray(506, 632);
  if (noticeClause.byteLength !== 126
    || sha256(noticeClause) !== "89fdc900e69446e48038e9db01dd71e62566997bd91135f0afbecc07ae997c8a") {
    fail("notice clause candidate locator drifted");
  }

  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "western_runtime_dependency_build_notice_evidence",
    evidenceLedgerId: "hakimi.western.astronomy-engine-build-notice-evidence/1.0.0",
    status: "controlled_ephemeral_build_notice_artifacts_observed_unbound",
    observedOn: "2026-08-30",
    systemIdentity: {
      productSystemId: "western-astrology",
      contractSystemId: "western",
      productStatus: "isolated_engineering_draft",
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null
    },
    dependencyIdentity: {
      packageName: WESTERN_LICENSE_NOTICE_IDENTITY.packageName,
      requestedVersion: WESTERN_LICENSE_NOTICE_IDENTITY.version,
      resolvedVersion: WESTERN_LICENSE_NOTICE_IDENTITY.version,
      resolved: "https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-2.1.19.tgz",
      integrity: WESTERN_LICENSE_NOTICE_IDENTITY.integrity
    },
    basisArtifacts,
    licenseTextObservation: {
      spdxIdentifierRecordedInSourceLock: "MIT",
      localCopyDigestMatched: true,
      standaloneLicenseInPublishedFilesRecordedBySourceLock: false,
      upstreamTarballIndependentlyReverifiedThisRun: false,
      publisherAuthenticityEstablished: false,
      semanticInterpretationReviewed: false
    },
    noticeCandidate: {
      mode: "verbatim_full_local_license",
      sourcePath: licenseArtifact.path,
      bytes: licenseArtifact.bytes,
      sha256: licenseArtifact.sha256,
      noticeClauseCandidateLocator: {
        byteStartInclusive: 506,
        byteEndExclusive: 632,
        bytes: 126,
        sha256: "89fdc900e69446e48038e9db01dd71e62566997bd91135f0afbecc07ae997c8a",
        semanticInterpretationReviewed: false
      },
      controlledBuildReceipt: {
        producer: receiptContext.producer,
        mode: receiptContext.mode,
        outputPersistence: "deleted_after_endpoint_verification",
        platformSpecificOutputTreeDigestsBound: false,
        surfaces: receipt.surfaces.map((surface) => Object.freeze({
          surfaceId: surface.surfaceId,
          sourceConfigPath: surface.sourceConfigPath,
          sourceHtmlPath: surface.sourceHtmlPath,
          fileCount: surface.fileCount,
          licenseAsset: Object.freeze({
            path: surface.licenseAsset.path,
            bytes: surface.licenseAsset.bytes,
            sha256: surface.licenseAsset.sha256
          }),
          htmlLicenseLink: Object.freeze({
            href: surface.htmlLicenseLink.href,
            linkCount: surface.htmlLicenseLink.linkCount
          }),
          engineWorkerObservation: Object.freeze({
            nonSourcemapWorkerCount: 1,
            versionMarkerObserved: surface.engineWorkerObservation.versionMarkerObserved,
            engineEsmDigestMarkerObserved: surface.engineWorkerObservation.engineEsmDigestMarkerObserved,
            executionEstablished: false
          })
        }))
      },
      buildNoticeInclusionStatus: "observed_in_two_controlled_ephemeral_isolated_builds",
      noticeArtifactObservation: "exact_standalone_asset_observed_at_fixed_path_on_both_surfaces",
      releaseBuildProvenanceEstablished: false
    },
    coverageBoundary: {
      coversAstronomyEngine2_1_19Only: true,
      coversSofa: false,
      coversSwissEphemeris: false,
      coversJplNaifKernels: false,
      coversTimeData: false,
      coversInterpretationAssets: false,
      westernRightsSubjectFullySatisfied: false
    },
    parentBindingBoundary: {
      bindingDirection: "fixed_dependency_and_build_artifacts_to_child_only",
      bindsWesternManifest: false,
      bindsWesternRequirements: false,
      bindsFourSystemRegistry: false,
      bindsCrossSystemReceipts: false,
      bindsDefaultWeb: false
    },
    readBoundary: {
      model: "held_file_handle_endpoint_snapshots",
      crossFileAtomicityEstablished: false,
      intervalIntegrityEstablished: false,
      abaResistanceEstablished: false,
      mutationEpochEstablished: false
    },
    authorityBoundary: {
      publisherAuthenticityEstablished: false,
      licenseReviewComplete: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      noticeObligationSatisfied: false,
      formalAdmissionAuthorized: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      baziAuthorityInherited: false
    },
    legalDecisionBoundary: {
      decisionStatus: "not_established",
      selectedLicenseModel: null,
      ownerDecisionRefs: [],
      legalReviewAttestationIds: [],
      executedContractRefs: []
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestIsDigitalSignature: false,
      signerIdentity: null,
      digitalSignature: null
    },
    doesNotEstablish: [
      "publisher_identity_or_upstream_signature",
      "license_authenticity_or_legal_interpretation",
      "notice_obligation_satisfaction_or_redistribution_authority",
      "sofa_swiss_ephemeris_jpl_naif_time_data_or_interpretation_asset_rights",
      "western_rights_bundle_or_any_of_28_source_binding_subjects",
      "domain_truth_expert_truth_scientific_validity_or_high_risk_expression_approval",
      "default_web_full_build_browser_host_pwa_deployment_or_rollback_readiness",
      "vite_watch_or_programmatic_rebuild_reference_freshness",
      "bazi_schema_authority_cross_system_scoring_comparison_or_winner_selection",
      "release_readiness_public_deployment_or_public_release_authorization",
      "cross_file_atomicity_interval_integrity_aba_resistance_or_mutation_epoch"
    ]
  };
  return Object.freeze({
    ...unsigned,
    evidenceDigest: computeWesternLicenseNoticeEvidenceDigest(unsigned)
  });
}

export function verifyWesternLicenseNoticeEvidence(evidence, receipt, workspaceRoot = defaultWorkspaceRoot) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    fail("one-way evidence child must be a JSON object");
  }
  if (evidence.evidenceDigest !== computeWesternLicenseNoticeEvidenceDigest(evidence)) {
    fail("one-way evidence child canonical digest drifted");
  }
  const expected = buildWesternLicenseNoticeEvidence(receipt, workspaceRoot);
  if (canonicalJson(evidence) !== canonicalJson(expected)) {
    fail("one-way evidence child no longer matches the fixed dependency and build observations");
  }
  return Object.freeze({
    path: WESTERN_LICENSE_NOTICE_EVIDENCE_PATH,
    status: evidence.status,
    evidenceDigest: evidence.evidenceDigest,
    bindsWesternManifest: false,
    bindsWesternRequirements: false,
    bindsFourSystemRegistry: false,
    rightsLegalConclusionEstablished: false,
    noticeObligationSatisfied: false,
    expertClaimsAuthorized: false,
    releaseReady: false,
    baziAuthorityInherited: false,
    publicDeploymentAuthorized: false
  });
}

export function parseWesternLicenseNoticeEvidenceJsonBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.byteLength === 0 || bytes.byteLength > 128 * 1024) {
    fail("one-way evidence child must be a non-empty bounded Buffer");
  }
  const source = bytes.toString("utf8");
  if (!Buffer.from(source, "utf8").equals(bytes)) {
    fail("one-way evidence child is not strict UTF-8");
  }
  let evidence;
  try {
    evidence = JSON_PARSE(source);
  } catch (cause) {
    fail(`one-way evidence child is not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    fail("one-way evidence child JSON root must be an object");
  }
  const canonicalMaterialization = `${JSON_STRINGIFY(evidence, null, 2)}\n`;
  if (source !== canonicalMaterialization) {
    fail("one-way evidence child must use the unique canonical duplicate-free JSON materialization");
  }
  return evidence;
}

export function loadAndVerifyWesternLicenseNoticeEvidence(receipt, workspaceRoot = defaultWorkspaceRoot) {
  const evidenceFile = readHeldRegularFile(
    resolveContainedWorkspaceFile(
      path.resolve(workspaceRoot),
      WESTERN_LICENSE_NOTICE_EVIDENCE_PATH,
      "Western Astronomy Engine build notice evidence child"
    ),
    "Western Astronomy Engine build notice evidence child"
  );
  const evidence = parseWesternLicenseNoticeEvidenceJsonBytes(evidenceFile.bytes);
  return verifyWesternLicenseNoticeEvidence(evidence, receipt, workspaceRoot);
}
