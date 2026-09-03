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
import { gunzipSync } from "node:zlib";
import { JSDOM } from "jsdom";

const libraryPath = fileURLToPath(import.meta.url);
const defaultWorkspaceRoot = path.resolve(path.dirname(libraryPath), "..");

export const ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY = Object.freeze({
  packageName: "iztro",
  version: "2.5.8",
  resolved: "https://registry.npmjs.org/iztro/-/iztro-2.5.8.tgz",
  integrity: "sha512-kgyyvxdSEvgJxi6zvHpvzGbXZLGXCdhTHYK2Pe/sRdBIQ7RfCArvupmg2ChUMQCSQGomW7XCI0gWwUuKJwPENg==",
  installedPackageManifestPath: "node_modules/iztro/package.json",
  installedPackageManifestBytes: 2255,
  installedPackageManifestSha256: "a5a85df951d28965caa7bf9a9fe6b44e3df676c8dd938573061257cff681a20f",
  installedEntryPath: "node_modules/iztro/lib/index.js",
  installedEntryBytes: 1368,
  installedEntrySha256: "10ab83d0ebfe3e5b335589767f4851034e1cf029c7ca7cbc231c22b562c7e4fb",
  installedLicensePath: "node_modules/iztro/LICENSE",
  licenseAssetPath: "licenses/iztro-2.5.8-LICENSE.txt",
  localLicensePath: "packages/ziwei-iztro-adapter-draft/licenses/iztro-2.5.8-LICENSE.txt",
  licenseBytes: 1073,
  licenseSha256: "e6c7b6e313cbda3135b41bccc66c98be132cb8319d0d465903d17e669e748b36",
  lockClosurePath: "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json",
  lockClosureBytes: 3846,
  lockClosureSha256: "c372bf14630eee36fa01ac654b8939622900a3e469a8f69db7bd2c7baa1d2724"
});

export const ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES = Object.freeze({
  "browser-preview": Object.freeze({
    surfaceId: "browser-preview",
    configPath: "packages/ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs",
    sourceHtmlPath: "packages/ziwei-iztro-adapter-draft/browser-preview/index.html"
  }),
  "browser-workspace": Object.freeze({
    surfaceId: "browser-workspace",
    configPath: "packages/ziwei-workspace-artifact-draft/vite.browser-app.config.mjs",
    sourceHtmlPath: "packages/ziwei-workspace-artifact-draft/browser-app/index.html"
  })
});

export const ZIWEI_IZTRO_LICENSE_NOTICE_EVIDENCE_PATH =
  "content/system-admission/ziwei-iztro-build-notice-evidence.v1.json";

export const ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY = Object.freeze({
  sourceEvidence: Object.freeze({
    path: "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json",
    bytes: 8316,
    sha256: "61a9607aaa9b1133501fb9194f7be97e01f42e360b069fe38aa34d6eb8e2fd0e"
  }),
  rawSnapshotFixture: Object.freeze({
    path: "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json",
    bytes: 15501,
    sha256: "32dfd1a9ed204c5b96a100a082d1d02f0b9391ddcc867f32c2c06d39f2972fe2"
  }),
  candidateId: "hakimi.ziwei.source-candidate/hko-calendar-boundary-replay-2023-2028/1.0.0",
  sourceBodySetDigest: "580108d977a4a4586115921e03502306ea8b5f8efe4558f76f37d072e8e8a445",
  annualBodyCount: 6,
  storagePolicy: "existing_workspace_snapshot_pending_independent_rights_review"
});

const EXPECTED_LICENSE_HREF = `./${ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseAssetPath}`;
const WORKER_FILE_PATTERN = /^assets\/browser-worker-[A-Za-z0-9_-]+\.js$/u;
const BUILD_INPUT_ATTESTATION_ASSET_PATH =
  "build-attestations/ziwei-iztro-license-inputs.v1.json";
const BUILD_INPUT_ATTESTATION_SCHEMA = "ziwei-iztro-build-input-attestation/1";
const BUILD_INPUT_ATTESTATION_PRODUCER = "hakimi-ziwei-iztro-top-level-license";
const MAX_BUILD_INPUT_ATTESTATION_BYTES = 64 * 1024;
const EVIDENCE_DIGEST_DOMAIN = "hakimi.ziwei.iztro-build-notice-evidence/1\0";
const TEMPORARY_PREFIX = "hakimi-ziwei-iztro-license-verification-";
const MAX_EVIDENCE_BYTES = 1024 * 1024;
const VITE_BUILD_IDENTITY = Object.freeze({
  version: "7.3.6",
  resolved: "https://registry.npmjs.org/vite/-/vite-7.3.6.tgz",
  integrity: "sha512-4XP60spRGjSZFf1qYH+dJIkK2znL3zQfl9KkOV9MkkRR/3Dls0dxaBsQPTloEc5BLXWPL9vsOxopxyKoMmDueg==",
  lockPackagePath: "apps/web/node_modules/vite",
  packageManifestPath: "apps/web/node_modules/vite/package.json",
  packageManifestBytes: 5158,
  packageManifestSha256: "e5ed0f85215f871fe22a48987dcd77fcfbe14064a53c0c9f7f48186a6b7e2cf0",
  launcherPath: "apps/web/node_modules/vite/bin/vite.js",
  launcherBytes: 2574,
  launcherSha256: "fa03478846d229651a3c6aa64833ba2c6cbf580a798b92bd8f47c7480bafb5d8",
  cliPath: "apps/web/node_modules/vite/dist/node/cli.js",
  cliBytes: 26755,
  cliSha256: "6b9001816eb5fb0979cbe380ed2116db93e315ff22ebf7fe55a4fc60458fa067",
  rootLockPath: "package-lock.json"
});
const BASIS_ARTIFACTS = Object.freeze([
  Object.freeze({ role: "adapter_package_manifest", path: "packages/ziwei-iztro-adapter-draft/package.json" }),
  Object.freeze({ role: "package_lock_closure", path: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.lockClosurePath }),
  Object.freeze({ role: "controlled_top_level_license_copy", path: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.localLicensePath }),
  Object.freeze({ role: "browser_preview_build_config", path: ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES["browser-preview"].configPath }),
  Object.freeze({ role: "browser_preview_source_html", path: ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES["browser-preview"].sourceHtmlPath }),
  Object.freeze({ role: "workspace_package_manifest", path: "packages/ziwei-workspace-artifact-draft/package.json" }),
  Object.freeze({ role: "browser_workspace_build_config", path: ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES["browser-workspace"].configPath }),
  Object.freeze({ role: "browser_workspace_source_html", path: ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES["browser-workspace"].sourceHtmlPath })
]);
const INSTALLED_ENDPOINTS = Object.freeze([
  Object.freeze({
    role: "installed_package_manifest_endpoint",
    path: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.installedPackageManifestPath,
    bytes: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.installedPackageManifestBytes,
    sha256: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.installedPackageManifestSha256
  }),
  Object.freeze({
    role: "installed_commonjs_entry_endpoint",
    path: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.installedEntryPath,
    bytes: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.installedEntryBytes,
    sha256: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.installedEntrySha256
  }),
  Object.freeze({
    role: "installed_top_level_license_endpoint",
    path: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.installedLicensePath,
    bytes: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseBytes,
    sha256: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseSha256
  })
]);
const BUILD_EXECUTION_ARTIFACTS = Object.freeze([
  Object.freeze({
    role: "vite_package_manifest_endpoint",
    path: VITE_BUILD_IDENTITY.packageManifestPath,
    bytes: VITE_BUILD_IDENTITY.packageManifestBytes,
    sha256: VITE_BUILD_IDENTITY.packageManifestSha256
  }),
  Object.freeze({
    role: "vite_launcher_endpoint",
    path: VITE_BUILD_IDENTITY.launcherPath,
    bytes: VITE_BUILD_IDENTITY.launcherBytes,
    sha256: VITE_BUILD_IDENTITY.launcherSha256
  }),
  Object.freeze({
    role: "vite_cli_endpoint",
    path: VITE_BUILD_IDENTITY.cliPath,
    bytes: VITE_BUILD_IDENTITY.cliBytes,
    sha256: VITE_BUILD_IDENTITY.cliSha256
  }),
  Object.freeze({ role: "root_package_lock", path: VITE_BUILD_IDENTITY.rootLockPath })
]);
const CONTROLLED_RECEIPTS = new WeakMap();
const CONTROLLED_BUILD_SNAPSHOTS = new WeakMap();
const CONTROLLED_RESTRICTED_SOURCE_SNAPSHOTS = new WeakMap();
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const REFLECT_APPLY = Reflect.apply;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;

function fail(message) {
  throw new Error(`Ziwei iztro isolated build license notice verification failed: ${message}`);
}

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

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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

function resolveContainedWorkspaceFile(workspaceRoot, relativePath, label) {
  if (typeof relativePath !== "string" || relativePath.length === 0
    || relativePath.includes("\\") || path.posix.normalize(relativePath) !== relativePath
    || relativePath.startsWith("/") || relativePath.startsWith("../") || relativePath.includes(":")) {
    fail(`${label} has an unsafe workspace-relative path`);
  }
  const absoluteRoot = path.resolve(workspaceRoot);
  const rootBefore = lstatSync(absoluteRoot, { bigint: true });
  if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink()) fail("workspace root must be a non-symlink directory");
  const rootRealPath = realpathSync.native(absoluteRoot);
  let cursor = absoluteRoot;
  const segments = relativePath.split("/");
  for (let index = 0; index < segments.length; index += 1) {
    cursor = path.join(cursor, segments[index]);
    const endpoint = lstatSync(cursor, { bigint: true });
    if (endpoint.isSymbolicLink()) fail(`${label} crosses a symlink or junction`);
    if (index < segments.length - 1 && !endpoint.isDirectory()) fail(`${label} crosses a non-directory path segment`);
    if (!isWithin(rootRealPath, realpathSync.native(cursor))) fail(`${label} escapes the workspace root`);
  }
  const rootAfter = lstatSync(absoluteRoot, { bigint: true });
  if (!sameStatIdentity(statIdentity(rootBefore), statIdentity(rootAfter))
    || rootRealPath !== realpathSync.native(absoluteRoot)) {
    fail("workspace root changed while resolving a fixed endpoint");
  }
  return cursor;
}

function readHeldRegularFile(filePath, label, maxBytes = Number.POSITIVE_INFINITY) {
  let before;
  let beforeRealPath;
  try {
    before = lstatSync(filePath, { bigint: true });
    beforeRealPath = realpathSync.native(filePath);
  } catch (cause) {
    fail(`${label} is not a readable endpoint: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  if (!before.isFile() || before.isSymbolicLink()) fail(`${label} must be a non-symlink regular file`);
  if (before.nlink !== 1n) fail(`${label} must not be hard-linked`);
  if (Number.isFinite(maxBytes) && before.size > BigInt(maxBytes)) fail(`${label} exceeds its byte limit`);
  let handle;
  try {
    handle = openSync(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(handle, { bigint: true });
    if (!opened.isFile() || !sameStatIdentity(statIdentity(before), statIdentity(opened))) {
      fail(`${label} changed before held-handle open`);
    }
    const bytes = readFileSync(handle);
    const afterHandle = fstatSync(handle, { bigint: true });
    const afterPath = lstatSync(filePath, { bigint: true });
    if (!sameStatIdentity(statIdentity(opened), statIdentity(afterHandle))
      || !sameStatIdentity(statIdentity(opened), statIdentity(afterPath))
      || beforeRealPath !== realpathSync.native(filePath)) {
      fail(`${label} changed during held-handle read`);
    }
    return Object.freeze({
      bytes,
      byteLength: bytes.byteLength,
      sha256: sha256(bytes),
      realPath: beforeRealPath,
      identity: statIdentity(opened)
    });
  } finally {
    if (handle !== undefined) closeSync(handle);
  }
}

function inventoryOutputRoot(outputRoot) {
  const absoluteRoot = path.resolve(outputRoot);
  const rootBefore = lstatSync(absoluteRoot, { bigint: true });
  if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink()) fail("output root must be a non-symlink directory");
  const rootRealPath = realpathSync.native(absoluteRoot);
  const files = new Map();
  const caseFolded = new Map();
  const pending = [absoluteRoot];
  while (pending.length > 0) {
    const directory = pending.pop();
    const directoryStat = lstatSync(directory, { bigint: true });
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) fail("output tree crosses a symlink or junction");
    if (!isWithin(rootRealPath, realpathSync.native(directory))) fail("output directory escapes its root");
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const endpoint = path.join(directory, entry.name);
      const endpointStat = lstatSync(endpoint, { bigint: true });
      if (endpointStat.isSymbolicLink()) fail("output tree contains a symlink or junction");
      if (!isWithin(rootRealPath, realpathSync.native(endpoint))) fail("output endpoint escapes its root");
      if (endpointStat.isDirectory()) {
        pending.push(endpoint);
        continue;
      }
      if (!endpointStat.isFile()) fail("output tree contains a non-regular endpoint");
      if (endpointStat.nlink !== 1n) fail("output tree contains a hard-linked file");
      const relative = path.relative(absoluteRoot, endpoint).split(path.sep).join("/");
      if (relative === "" || relative.startsWith("../") || relative.includes("\\") || relative.includes(":")) {
        fail("output tree contains an unsafe path");
      }
      const folded = relative.toLowerCase();
      if (caseFolded.has(folded)) fail("output tree contains a case-colliding path");
      caseFolded.set(folded, relative);
      const observed = readHeldRegularFile(endpoint, `output ${relative}`);
      files.set(relative, observed);
    }
  }
  const rootAfter = lstatSync(absoluteRoot, { bigint: true });
  if (!sameStatIdentity(statIdentity(rootBefore), statIdentity(rootAfter))
    || rootRealPath !== realpathSync.native(absoluteRoot)) {
    fail("output root changed during inventory");
  }
  return files;
}

function parseExactJson(bytes, label) {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_EVIDENCE_BYTES) fail(`${label} has an invalid byte length`);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail(`${label} must not contain a BOM`);
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) fail(`${label} must be exact UTF-8`);
  let parsed;
  try {
    parsed = REFLECT_APPLY(JSON_PARSE, JSON, [text]);
  } catch (cause) {
    fail(`${label} is invalid JSON: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return Object.freeze({ parsed, text });
}

function observeHkoRestrictedSourceMaterial(workspaceRoot = defaultWorkspaceRoot) {
  const absoluteWorkspaceRoot = path.resolve(workspaceRoot);
  const evidenceFile = readHeldRegularFile(
    resolveContainedWorkspaceFile(
      absoluteWorkspaceRoot,
      ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceEvidence.path,
      "HKO source evidence"
    ),
    "HKO source evidence",
    MAX_EVIDENCE_BYTES
  );
  const fixtureFile = readHeldRegularFile(
    resolveContainedWorkspaceFile(
      absoluteWorkspaceRoot,
      ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path,
      "HKO raw source snapshot fixture"
    ),
    "HKO raw source snapshot fixture",
    MAX_EVIDENCE_BYTES
  );
  for (const [label, observed, expected] of [
    ["HKO source evidence", evidenceFile, ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceEvidence],
    ["HKO raw source snapshot fixture", fixtureFile, ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture]
  ]) {
    if (observed.byteLength !== expected.bytes || observed.sha256 !== expected.sha256) {
      fail(`${label} drifted from the fixed restricted-material identity`);
    }
  }

  const sourceEvidence = parseExactJson(evidenceFile.bytes, "HKO source evidence").parsed;
  const fixture = parseExactJson(fixtureFile.bytes, "HKO raw source snapshot fixture").parsed;
  if (sourceEvidence?.candidateIdentity?.candidateId
      !== ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.candidateId
    || sourceEvidence?.candidateIdentity?.sourceBodySetDigest
      !== ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceBodySetDigest
    || sourceEvidence?.derivedCoverage?.rawSourceBodiesStored
      !== ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.annualBodyCount
    || sourceEvidence?.rightsBoundary?.storagePolicy
      !== ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.storagePolicy
    || sourceEvidence?.rightsBoundary?.workRightsEstablished !== false
    || sourceEvidence?.rightsBoundary?.editionRightsEstablished !== false
    || sourceEvidence?.rightsBoundary?.carrierRightsEstablished !== false
    || sourceEvidence?.rightsBoundary?.redistributionAuthorized !== false
    || sourceEvidence?.rightsBoundary?.publicRepositoryBodyInclusionAuthorized !== false
    || sourceEvidence?.rightsBoundary?.publicBuildInclusionAuthorized !== false
    || sourceEvidence?.authorityBoundary?.releaseReady !== false
    || sourceEvidence?.authorityBoundary?.publicDeploymentAuthorized !== false
    || !Array.isArray(sourceEvidence?.resources)
    || sourceEvidence.resources.length
      !== ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.annualBodyCount) {
    fail("HKO source evidence no longer carries the fixed unresolved-rights boundary");
  }
  if (fixture?.format !== "hakimi-hko-annual-csv-source-snapshots/0.1-draft"
    || fixture?.compression !== "gzip"
    || fixture?.contentTransferEncoding !== "base64"
    || fixture?.productionEligible !== false
    || !Array.isArray(fixture?.snapshots)
    || fixture.snapshots.length !== ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.annualBodyCount) {
    fail("HKO raw source snapshot fixture no longer has the fixed private replay shape");
  }

  const resourcesByYear = new Map(sourceEvidence.resources.map((resource) => [resource?.year, resource]));
  if (resourcesByYear.size !== ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.annualBodyCount) {
    fail("HKO source evidence resource years are not unique");
  }
  const needles = [
    Object.freeze({ kind: "source_evidence_exact_json", year: null, bytes: Buffer.from(evidenceFile.bytes) }),
    Object.freeze({ kind: "raw_snapshot_fixture_exact_json", year: null, bytes: Buffer.from(fixtureFile.bytes) })
  ];
  const years = [];
  for (const snapshot of fixture.snapshots) {
    const resource = resourcesByYear.get(snapshot?.year);
    if (!resource || !Number.isInteger(snapshot.year)
      || typeof snapshot.payload !== "string"
      || snapshot.payload.length === 0
      || snapshot.payload.length % 4 !== 0
      || !/^[A-Za-z0-9+/]+={0,2}$/u.test(snapshot.payload)) {
      fail("HKO raw source snapshot has an invalid annual payload identity");
    }
    const gzipBytes = Buffer.from(snapshot.payload, "base64");
    if (gzipBytes.toString("base64") !== snapshot.payload
      || gzipBytes.byteLength !== snapshot.gzipBytes
      || gzipBytes.byteLength !== resource.gzipBytes
      || sha256(gzipBytes) !== resource.gzipSha256) {
      fail(`HKO ${snapshot.year} gzip payload drifted from source evidence`);
    }
    let rawBytes;
    try {
      rawBytes = gunzipSync(gzipBytes);
    } catch {
      fail(`HKO ${snapshot.year} gzip payload cannot be decoded`);
    }
    if (rawBytes.byteLength !== resource.rawBytes || sha256(rawBytes) !== resource.rawSha256) {
      fail(`HKO ${snapshot.year} raw response body drifted from source evidence`);
    }
    years.push(snapshot.year);
    needles.push(
      Object.freeze({ kind: "gzip_base64_payload_utf8", year: snapshot.year, bytes: Buffer.from(snapshot.payload, "utf8") }),
      Object.freeze({ kind: "gzip_payload_bytes", year: snapshot.year, bytes: Buffer.from(gzipBytes) }),
      Object.freeze({ kind: "decompressed_raw_csv_bytes", year: snapshot.year, bytes: Buffer.from(rawBytes) })
    );
  }
  if (JSON.stringify(years) !== JSON.stringify([2023, 2024, 2025, 2026, 2027, 2028])) {
    fail("HKO restricted source years drifted from the fixed 2023-2028 order");
  }
  for (const [role, artifactPath] of [
    ["source_evidence", ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceEvidence.path],
    ["raw_snapshot_fixture", ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path]
  ]) {
    needles.push(
      Object.freeze({
        kind: `${role}_workspace_path_utf8`,
        year: null,
        bytes: Buffer.from(artifactPath, "utf8")
      }),
      Object.freeze({
        kind: `${role}_basename_utf8`,
        year: null,
        bytes: Buffer.from(path.posix.basename(artifactPath), "utf8")
      })
    );
  }

  const summary = Object.freeze({
    candidateId: ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.candidateId,
    sourceBodySetDigest: ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceBodySetDigest,
    storagePolicy: ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.storagePolicy,
    sourceEvidenceArtifact: Object.freeze({
      path: ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceEvidence.path,
      bytes: evidenceFile.byteLength,
      sha256: evidenceFile.sha256
    }),
    rawSnapshotFixtureArtifact: Object.freeze({
      path: ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path,
      bytes: fixtureFile.byteLength,
      sha256: fixtureFile.sha256
    }),
    annualBodyCount: years.length,
    years: Object.freeze(years),
    workRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    publicBuildInclusionAuthorized: false
  });
  REFLECT_APPLY(WEAK_MAP_SET, CONTROLLED_RESTRICTED_SOURCE_SNAPSHOTS, [summary, Object.freeze({
    endpoints: Object.freeze([
      Object.freeze({ realPath: evidenceFile.realPath, identity: evidenceFile.identity }),
      Object.freeze({ realPath: fixtureFile.realPath, identity: fixtureFile.identity })
    ]),
    needles: Object.freeze(needles)
  })]);
  return summary;
}

function requireHkoRestrictedSourceMaterialContext(snapshot) {
  const context = snapshot && typeof snapshot === "object"
    ? REFLECT_APPLY(WEAK_MAP_GET, CONTROLLED_RESTRICTED_SOURCE_SNAPSHOTS, [snapshot])
    : undefined;
  if (!context) fail("HKO restricted source material snapshot is invalid");
  return context;
}

function requireSameHkoRestrictedSourceMaterial(left, right, phaseLabel) {
  const leftContext = requireHkoRestrictedSourceMaterialContext(left);
  const rightContext = requireHkoRestrictedSourceMaterialContext(right);
  if (left.sourceEvidenceArtifact.sha256 !== right.sourceEvidenceArtifact.sha256
    || left.rawSnapshotFixtureArtifact.sha256 !== right.rawSnapshotFixtureArtifact.sha256
    || leftContext.endpoints.length !== rightContext.endpoints.length) {
    fail(`HKO restricted source material changed ${phaseLabel}`);
  }
  for (let index = 0; index < leftContext.endpoints.length; index += 1) {
    const before = leftContext.endpoints[index];
    const after = rightContext.endpoints[index];
    if (before.realPath !== after.realPath || !sameStatIdentity(before.identity, after.identity)) {
      fail(`HKO restricted source material changed ${phaseLabel}`);
    }
  }
}

function verifyHkoRestrictedSourceMaterialExcluded(files, surfaceId, restrictedSnapshot) {
  const context = requireHkoRestrictedSourceMaterialContext(restrictedSnapshot);
  const forbiddenBasenames = new Set([
    path.posix.basename(restrictedSnapshot.sourceEvidenceArtifact.path).toLowerCase(),
    path.posix.basename(restrictedSnapshot.rawSnapshotFixtureArtifact.path).toLowerCase()
  ]);
  for (const [relativePath, observed] of files) {
    const pathSegments = relativePath.toLowerCase().split("/");
    if (pathSegments.some((segment) => forbiddenBasenames.has(segment))) {
      fail(`${surfaceId} output exposes a restricted HKO source artifact path`);
    }
    for (const needle of context.needles) {
      if (observed.bytes.indexOf(needle.bytes) !== -1) {
        const yearLabel = needle.year === null ? "artifact" : String(needle.year);
        fail(`${surfaceId} output contains restricted HKO ${yearLabel} ${needle.kind}`);
      }
    }
  }
  return Object.freeze({
    scope: "current_known_hko_2023_2028_exact_representations_in_one_ephemeral_output_tree",
    candidateId: restrictedSnapshot.candidateId,
    sourceBodySetDigest: restrictedSnapshot.sourceBodySetDigest,
    annualBodyCount: restrictedSnapshot.annualBodyCount,
    outputFilesScanned: files.size,
    representationClassesScanned: Object.freeze([
      "source_evidence_exact_json",
      "raw_snapshot_fixture_exact_json",
      "restricted_artifact_path_reference_utf8",
      "gzip_base64_payload_utf8",
      "gzip_payload_bytes",
      "decompressed_raw_csv_bytes"
    ]),
    exactRestrictedRepresentationObserved: false,
    transformedOrUnknownEncodingAbsenceEstablished: false,
    workRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    publicBuildInclusionAuthorized: false
  });
}

function buildHkoRestrictedSourceMaterialBoundary(
  restrictedSnapshot,
  surfaces,
  controlledEquality = undefined,
  outputScanPrePostEqual = false
) {
  requireHkoRestrictedSourceMaterialContext(restrictedSnapshot);
  const controlled = controlledEquality ?? Object.freeze({
    browserPreviewPrePostEqual: false,
    browserWorkspacePrePostEqual: false,
    betweenBuildsEqual: false
  });
  return Object.freeze({
    mode: controlledEquality
      ? "fixed_dual_ephemeral_build_exact_restricted_representation_exclusion"
      : "uncontrolled_output_observation_only",
    candidateId: restrictedSnapshot.candidateId,
    sourceBodySetDigest: restrictedSnapshot.sourceBodySetDigest,
    storagePolicy: restrictedSnapshot.storagePolicy,
    sourceEvidenceArtifact: restrictedSnapshot.sourceEvidenceArtifact,
    rawSnapshotFixtureArtifact: restrictedSnapshot.rawSnapshotFixtureArtifact,
    annualBodyCount: restrictedSnapshot.annualBodyCount,
    years: restrictedSnapshot.years,
    surfaceObservations: Object.freeze(surfaces.map((surface) => Object.freeze({
      surfaceId: surface.surfaceId,
      outputFilesScanned: surface.hkoRestrictedSourceMaterialExclusion.outputFilesScanned,
      representationClassesScanned: surface.hkoRestrictedSourceMaterialExclusion.representationClassesScanned,
      exactRestrictedRepresentationObserved:
        surface.hkoRestrictedSourceMaterialExclusion.exactRestrictedRepresentationObserved,
      transformedOrUnknownEncodingAbsenceEstablished:
        surface.hkoRestrictedSourceMaterialExclusion.transformedOrUnknownEncodingAbsenceEstablished
    }))),
    currentKnownExactRepresentationsAbsentFromBothOutputs: surfaces.every(
      (surface) => surface.hkoRestrictedSourceMaterialExclusion.exactRestrictedRepresentationObserved === false
    ),
    controlledMaterialIdentityEquality: Object.freeze({
      browserPreviewPrePostEqual: controlled.browserPreviewPrePostEqual === true,
      browserWorkspacePrePostEqual: controlled.browserWorkspacePrePostEqual === true,
      betweenBuildsEqual: controlled.betweenBuildsEqual === true,
      outputScanPrePostEqual: outputScanPrePostEqual === true,
      crossFileAtomicityEstablished: false,
      intervalIntegrityEstablished: false,
      abaResistanceEstablished: false,
      mutationEpochEstablished: false
    }),
    exactCurrentRepresentationsOnly: true,
    universalTranscodingAbsenceEstablished: false,
    workspaceRawBodiesRemovedOrVaulted: false,
    linkOnlyStorageEstablished: false,
    workRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    publicBuildInclusionAuthorized: false,
    releaseReady: false,
    publicDeploymentAuthorized: false
  });
}

function requireExactCanonicalEvidenceBytes(bytes, expected) {
  const { parsed, text } = parseExactJson(bytes, "evidence child");
  const expectedText = `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [expected, null, 2])}\n`;
  if (text !== expectedText) fail("one-way evidence child is not the unique current canonical pretty JSON");
  if (parsed.evidenceDigest !== computeZiweiIztroLicenseNoticeEvidenceDigest(parsed)
    || canonicalJson(parsed) !== canonicalJson(expected)) {
    fail("one-way evidence child no longer matches the fixed current build observations");
  }
  return parsed;
}

function verifyLicenseHtml(bytes, surfaceId) {
  const text = bytes.toString("utf8");
  if (!Buffer.from(text, "utf8").equals(bytes)) fail(`${surfaceId} index.html must be exact UTF-8`);
  const dom = new JSDOM(text);
  const { document } = dom.window;
  if (document.querySelector("base")) fail(`${surfaceId} index.html must not contain a base element`);
  for (const container of document.querySelectorAll("template, noscript")) {
    if (container.innerHTML.toLowerCase().includes("license")) {
      fail(`${surfaceId} index.html must not place license metadata in an inert container`);
    }
  }
  const licenseElements = [...document.querySelectorAll("[rel]")].filter((element) =>
    (element.getAttribute("rel") ?? "").trim().toLowerCase().split(/\s+/u).includes("license"));
  if (licenseElements.length !== 1) fail(`${surfaceId} index.html must contain exactly one rel=license element`);
  const link = licenseElements[0];
  if (link.namespaceURI !== "http://www.w3.org/1999/xhtml"
    || link.tagName !== "LINK" || link.parentElement !== document.head) {
    fail(`${surfaceId} rel=license must be a direct HTML head link`);
  }
  if (link.getAttribute("rel") !== "license"
    || link.getAttribute("type") !== "text/plain"
    || link.getAttribute("href") !== EXPECTED_LICENSE_HREF) {
    fail(`${surfaceId} rel=license must target the exact same-origin top-level iztro license asset`);
  }
  return Object.freeze({ href: EXPECTED_LICENSE_HREF, linkCount: 1 });
}

function verifyBuildInputAttestation(files, surfaceId, expected) {
  const attestationEntries = [...files.keys()].filter((entry) =>
    entry.toLowerCase().startsWith("build-attestations/"));
  if (attestationEntries.length !== 1
    || attestationEntries[0] !== BUILD_INPUT_ATTESTATION_ASSET_PATH) {
    fail(`${surfaceId} must contain exactly the canonical build-input attestation asset`);
  }
  const observed = files.get(BUILD_INPUT_ATTESTATION_ASSET_PATH);
  if (observed.byteLength === 0 || observed.byteLength > MAX_BUILD_INPUT_ATTESTATION_BYTES) {
    fail(`${surfaceId} build-input attestation has an invalid byte length`);
  }
  const { parsed, text } = parseExactJson(observed.bytes, `${surfaceId} build-input attestation`);
  const expectedText = `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [expected, null, 2])}\n`;
  if (text !== expectedText || canonicalJson(parsed) !== canonicalJson(expected)) {
    fail(`${surfaceId} build-input attestation is not the unique canonical observation of the fixed inputs`);
  }
  return Object.freeze({
    path: BUILD_INPUT_ATTESTATION_ASSET_PATH,
    bytes: observed.byteLength,
    sha256: observed.sha256,
    schemaVersion: BUILD_INPUT_ATTESTATION_SCHEMA,
    surfaceId,
    producerPlugin: BUILD_INPUT_ATTESTATION_PRODUCER,
    inputCount: expected.inputs.length
  });
}

function verifyLockClosure(lock) {
  if (!lock || typeof lock !== "object" || Array.isArray(lock)
    || lock.schemaVersion !== 1
    || lock.proofScope !== "package_lock_closure_identity_not_installed_bytes"
    || lock.lockfileVersion !== 3
    || lock.entryPackage?.packagePath !== "packages/ziwei-iztro-adapter-draft"
    || lock.entryPackage?.name !== "@hakimi/ziwei-iztro-adapter-draft"
    || lock.entryPackage?.version !== "0.0.0-draft.0"
    || lock.entryPackage?.dependencies?.length !== 1
    || lock.entryPackage.dependencies[0]?.name !== "iztro"
    || lock.entryPackage.dependencies[0]?.requested !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version
    || lock.entryPackage.dependencies[0]?.resolvedPackagePath !== "node_modules/iztro"
    || lock.entryPackage.dependencies[0]?.resolvedVersion !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version
    || !Array.isArray(lock.nodes) || lock.nodes.length !== 6) {
    fail("iztro package-lock closure identity is invalid");
  }
  const iztroNode = lock.nodes.find((node) => node?.packagePath === "node_modules/iztro");
  if (!iztroNode || iztroNode.name !== "iztro"
    || iztroNode.version !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version
    || iztroNode.resolved !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.resolved
    || iztroNode.integrity !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.integrity) {
    fail("iztro node in the package-lock closure drifted");
  }
}

function controlledBuildInputSpecs() {
  const unique = new Map();
  for (const artifact of [...BUILD_EXECUTION_ARTIFACTS, ...BASIS_ARTIFACTS, ...INSTALLED_ENDPOINTS]) {
    if (!unique.has(artifact.path)) unique.set(artifact.path, artifact);
  }
  return [...unique.values()];
}

const CONTROLLED_BUILD_INPUT_SPECS = Object.freeze(controlledBuildInputSpecs());

function attestedInputSpecs(surfaceId) {
  const surface = ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES[surfaceId];
  if (!surface) fail(`unsupported surface ${String(surfaceId)}`);
  return Object.freeze([
    Object.freeze({ role: "surface_build_config", path: surface.configPath }),
    ...(surfaceId === "browser-workspace"
      ? [Object.freeze({
        role: "shared_adapter_build_config",
        path: ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES["browser-preview"].configPath
      })]
      : []),
    Object.freeze({ role: "surface_source_html", path: surface.sourceHtmlPath }),
    ...INSTALLED_ENDPOINTS.map((endpoint) => Object.freeze({ role: endpoint.role, path: endpoint.path })),
    Object.freeze({ role: "package_lock_closure", path: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.lockClosurePath }),
    Object.freeze({
      role: "controlled_top_level_license_copy",
      path: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.localLicensePath
    })
  ]);
}

function requireBuildSnapshotFiles(snapshot) {
  const context = snapshot && typeof snapshot === "object"
    ? REFLECT_APPLY(WEAK_MAP_GET, CONTROLLED_BUILD_SNAPSHOTS, [snapshot])
    : undefined;
  if (!context) fail("controlled build input snapshot is invalid");
  return context.filesByPath;
}

function buildExpectedInputAttestation(surfaceId, filesByPath) {
  const inputs = attestedInputSpecs(surfaceId).map((input) => {
    const observed = filesByPath.get(input.path);
    if (!observed) fail(`${surfaceId} attestation input ${input.path} was not observed`);
    return Object.freeze({
      role: input.role,
      path: input.path,
      bytes: observed.byteLength,
      sha256: observed.sha256
    });
  });
  return Object.freeze({
    schemaVersion: BUILD_INPUT_ATTESTATION_SCHEMA,
    surfaceId,
    producerPlugin: BUILD_INPUT_ATTESTATION_PRODUCER,
    inputs: Object.freeze(inputs)
  });
}

function verifyViteBuildIdentity(filesByPath) {
  for (const expected of BUILD_EXECUTION_ARTIFACTS) {
    if (expected.bytes === undefined) continue;
    const observed = filesByPath.get(expected.path);
    if (!observed || observed.byteLength !== expected.bytes || observed.sha256 !== expected.sha256) {
      fail(`${expected.role} drifted from the fixed Vite ${VITE_BUILD_IDENTITY.version} endpoint`);
    }
  }
  const packageManifestFile = filesByPath.get(VITE_BUILD_IDENTITY.packageManifestPath);
  const packageManifest = parseExactJson(packageManifestFile.bytes, "Vite package manifest").parsed;
  if (packageManifest?.name !== "vite"
    || packageManifest?.version !== VITE_BUILD_IDENTITY.version
    || packageManifest?.type !== "module"
    || packageManifest?.bin?.vite !== "bin/vite.js") {
    fail("installed Vite package manifest semantic identity is invalid");
  }
  const rootLockFile = filesByPath.get(VITE_BUILD_IDENTITY.rootLockPath);
  const rootLock = parseExactJson(rootLockFile.bytes, "root package lock").parsed;
  const appPackage = rootLock?.packages?.["apps/web"];
  const viteNode = rootLock?.packages?.[VITE_BUILD_IDENTITY.lockPackagePath];
  if (rootLock?.lockfileVersion !== 3
    || appPackage?.devDependencies?.vite !== VITE_BUILD_IDENTITY.version
    || viteNode?.version !== VITE_BUILD_IDENTITY.version
    || viteNode?.resolved !== VITE_BUILD_IDENTITY.resolved
    || viteNode?.integrity !== VITE_BUILD_IDENTITY.integrity
    || viteNode?.bin?.vite !== "bin/vite.js") {
    fail("root package lock does not bind the fixed Vite 7.3.6 execution identity");
  }
}

function observeControlledBuildInputs(workspaceRoot, surfaceId) {
  if (!ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES[surfaceId]) {
    fail(`unsupported surface ${String(surfaceId)}`);
  }
  const absoluteWorkspaceRoot = path.resolve(workspaceRoot);
  const filesByPath = new Map();
  const inputs = CONTROLLED_BUILD_INPUT_SPECS.map((artifact) => {
    const observed = readHeldRegularFile(
      resolveContainedWorkspaceFile(absoluteWorkspaceRoot, artifact.path, artifact.role),
      artifact.role,
      artifact.path === VITE_BUILD_IDENTITY.rootLockPath ? MAX_EVIDENCE_BYTES : Number.POSITIVE_INFINITY
    );
    filesByPath.set(artifact.path, observed);
    return Object.freeze({
      role: artifact.role,
      path: artifact.path,
      bytes: observed.byteLength,
      sha256: observed.sha256
    });
  });
  verifyViteBuildIdentity(filesByPath);
  const snapshot = Object.freeze({
    surfaceId,
    inputs: Object.freeze(inputs),
    attestation: buildExpectedInputAttestation(surfaceId, filesByPath),
    nodeRuntimeBinaryIdentityEstablished: false
  });
  REFLECT_APPLY(WEAK_MAP_SET, CONTROLLED_BUILD_SNAPSHOTS, [snapshot, Object.freeze({ filesByPath })]);
  observeCanonicalInputs(absoluteWorkspaceRoot, snapshot);
  return snapshot;
}

function requireSameControlledBuildInputs(left, right, phaseLabel) {
  const leftFiles = requireBuildSnapshotFiles(left);
  const rightFiles = requireBuildSnapshotFiles(right);
  if (leftFiles.size !== rightFiles.size) fail(`controlled build input set changed ${phaseLabel}`);
  for (const [relativePath, before] of leftFiles) {
    const after = rightFiles.get(relativePath);
    if (!after
      || before.realPath !== after.realPath
      || before.byteLength !== after.byteLength
      || before.sha256 !== after.sha256
      || !sameStatIdentity(before.identity, after.identity)) {
      fail(`controlled build input changed ${phaseLabel}: ${relativePath}`);
    }
  }
}

function controlledBuildChildEnvironment() {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    const normalized = key.toUpperCase();
    if (normalized.startsWith("NODE_") || normalized.startsWith("VITE_")) continue;
    env[key] = value;
  }
  env.NO_COLOR = "1";
  return env;
}

function observedCanonicalFile(workspaceRoot, snapshot, relativePath, label) {
  if (snapshot) {
    const observed = requireBuildSnapshotFiles(snapshot).get(relativePath);
    if (!observed) fail(`${label} is absent from the controlled build input snapshot`);
    return observed;
  }
  return readHeldRegularFile(
    resolveContainedWorkspaceFile(workspaceRoot, relativePath, label),
    label
  );
}

function observeCanonicalInputs(workspaceRoot, snapshot = undefined) {
  const basisArtifacts = BASIS_ARTIFACTS.map((artifact) => {
    const observed = observedCanonicalFile(workspaceRoot, snapshot, artifact.path, artifact.role);
    return Object.freeze({ role: artifact.role, path: artifact.path, bytes: observed.byteLength, sha256: observed.sha256 });
  });
  const localLicense = basisArtifacts.find((artifact) => artifact.role === "controlled_top_level_license_copy");
  if (localLicense.bytes !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseBytes
    || localLicense.sha256 !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseSha256) {
    fail("controlled iztro license copy drifted");
  }
  const closureArtifact = basisArtifacts.find((artifact) => artifact.role === "package_lock_closure");
  if (closureArtifact.bytes !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.lockClosureBytes
    || closureArtifact.sha256 !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.lockClosureSha256) {
    fail("iztro package-lock closure bytes drifted");
  }
  const lockBytes = observedCanonicalFile(
    workspaceRoot,
    snapshot,
    ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.lockClosurePath,
    "package-lock closure"
  ).bytes;
  verifyLockClosure(parseExactJson(lockBytes, "package-lock closure").parsed);
  const packageManifestBytes = observedCanonicalFile(
    workspaceRoot,
    snapshot,
    "packages/ziwei-iztro-adapter-draft/package.json",
    "adapter package manifest"
  ).bytes;
  const packageManifest = parseExactJson(packageManifestBytes, "adapter package manifest").parsed;
  if (packageManifest?.dependencies?.iztro !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version) {
    fail("adapter package manifest no longer requests exact iztro 2.5.8");
  }
  for (const surface of Object.values(ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES)) {
    const htmlBytes = observedCanonicalFile(
      workspaceRoot,
      snapshot,
      surface.sourceHtmlPath,
      `${surface.surfaceId} source HTML`
    ).bytes;
    verifyLicenseHtml(htmlBytes, `${surface.surfaceId} source`);
  }
  const installedEndpoints = INSTALLED_ENDPOINTS.map((endpoint) => {
    const observed = observedCanonicalFile(workspaceRoot, snapshot, endpoint.path, endpoint.role);
    if (observed.byteLength !== endpoint.bytes || observed.sha256 !== endpoint.sha256) {
      fail(`${endpoint.role} drifted`);
    }
    return Object.freeze({ role: endpoint.role, path: endpoint.path, bytes: observed.byteLength, sha256: observed.sha256 });
  });
  return Object.freeze({ basisArtifacts: Object.freeze(basisArtifacts), installedEndpoints: Object.freeze(installedEndpoints) });
}

export function verifyZiweiIztroIsolatedBuildLicenseSurface(
  surfaceId,
  outputRoot,
  expectedBuildInputAttestation = undefined,
  restrictedSourceMaterialSnapshot = undefined
) {
  const surface = ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES[surfaceId];
  if (!surface) fail(`unsupported surface ${String(surfaceId)}`);
  const files = inventoryOutputRoot(outputRoot);
  const restrictedSnapshot = restrictedSourceMaterialSnapshot
    ?? observeHkoRestrictedSourceMaterial(defaultWorkspaceRoot);
  const hkoRestrictedSourceMaterialExclusion = verifyHkoRestrictedSourceMaterialExcluded(
    files,
    surfaceId,
    restrictedSnapshot
  );
  const expectedAttestation = expectedBuildInputAttestation
    ?? observeControlledBuildInputs(defaultWorkspaceRoot, surfaceId).attestation;
  const buildInputAttestation = verifyBuildInputAttestation(files, surfaceId, expectedAttestation);
  const licenseEntries = [...files.keys()].filter((entry) => entry.toLowerCase().startsWith("licenses/"));
  if (licenseEntries.length !== 1 || licenseEntries[0] !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseAssetPath) {
    fail(`${surfaceId} must contain exactly the fixed top-level iztro license asset`);
  }
  const licenseAsset = files.get(ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseAssetPath);
  if (licenseAsset.byteLength !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseBytes
    || licenseAsset.sha256 !== ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseSha256) {
    fail(`${surfaceId} emitted iztro license bytes drifted`);
  }
  const htmlFile = files.get("index.html");
  if (!htmlFile) fail(`${surfaceId} index.html is missing`);
  const htmlLicenseLink = verifyLicenseHtml(htmlFile.bytes, surfaceId);
  const workerEntries = [...files.entries()].filter(([entry]) => WORKER_FILE_PATTERN.test(entry));
  if (workerEntries.length !== 1) fail(`${surfaceId} must contain exactly one non-sourcemap Browser Worker chunk`);
  const [workerPath, worker] = workerEntries[0];
  const workerText = worker.bytes.toString("utf8");
  if (!Buffer.from(workerText, "utf8").equals(worker.bytes)
    || !workerText.includes(ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version)
    || !workerText.includes(ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.integrity)) {
    fail(`${surfaceId} Browser Worker does not carry the locked adapter identity markers`);
  }
  return Object.freeze({
    surfaceId,
    sourceConfigPath: surface.configPath,
    sourceHtmlPath: surface.sourceHtmlPath,
    fileCount: files.size,
    licenseAsset: Object.freeze({
      path: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseAssetPath,
      bytes: licenseAsset.byteLength,
      sha256: licenseAsset.sha256
    }),
    htmlLicenseLink,
    buildInputAttestation,
    hkoRestrictedSourceMaterialExclusion,
    workerObservation: Object.freeze({
      path: workerPath,
      bytes: worker.byteLength,
      sha256: worker.sha256,
      versionMarkerObserved: true,
      integrityMarkerObserved: true,
      dependencyExecutionEstablished: false
    })
  });
}

export function verifyZiweiIztroIsolatedBuildLicenseNotices({
  browserPreviewOutputRoot,
  browserWorkspaceOutputRoot,
  workspaceRoot = defaultWorkspaceRoot,
  controlledBuildSnapshot = undefined,
  expectedBuildInputAttestations = undefined,
  controlledBuildBoundary = undefined,
  restrictedSourceMaterialSnapshot = undefined
}) {
  const absoluteWorkspaceRoot = path.resolve(workspaceRoot);
  const canonicalInputs = observeCanonicalInputs(absoluteWorkspaceRoot, controlledBuildSnapshot);
  const restrictedSnapshot = restrictedSourceMaterialSnapshot
    ?? observeHkoRestrictedSourceMaterial(absoluteWorkspaceRoot);
  const surfaces = Object.freeze([
    verifyZiweiIztroIsolatedBuildLicenseSurface(
      "browser-preview",
      browserPreviewOutputRoot,
      expectedBuildInputAttestations?.["browser-preview"],
      restrictedSnapshot
    ),
    verifyZiweiIztroIsolatedBuildLicenseSurface(
      "browser-workspace",
      browserWorkspaceOutputRoot,
      expectedBuildInputAttestations?.["browser-workspace"],
      restrictedSnapshot
    )
  ]);
  const restrictedAfterOutputScan = observeHkoRestrictedSourceMaterial(absoluteWorkspaceRoot);
  requireSameHkoRestrictedSourceMaterial(
    restrictedSnapshot,
    restrictedAfterOutputScan,
    "during dual output scan"
  );
  return Object.freeze({
    schemaVersion: "ziwei-iztro-isolated-build-license-notice-verification/1",
    status: "top_level_license_notice_bytes_observed_without_legal_clearance",
    canonicalInputs,
    buildExecutionBoundary: controlledBuildBoundary ?? Object.freeze({
      mode: "uncontrolled_output_observation_only",
      fixedViteExecutionEndpointsVerified: false,
      rootLockSemanticIdentityVerified: false,
      nodeRuntimeBinaryIdentityEstablished: false,
      browserPreviewPrePostControlledInputsEqual: false,
      browserWorkspacePrePostControlledInputsEqual: false,
      betweenBuildsControlledInputsEqual: false
    }),
    surfaces,
    hkoRestrictedSourceMaterialBoundary: buildHkoRestrictedSourceMaterialBoundary(
      restrictedAfterOutputScan,
      surfaces,
      undefined,
      true
    ),
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
      bindingFrozenVerified: false,
      formalAdmissionAuthorized: false,
      expertClaimsAuthorized: false,
      releaseReady: false,
      publicDeploymentAuthorized: false
    })
  });
}

function brandControlledReceipt(receipt, workspaceRoot) {
  const context = Object.freeze({
    workspaceRootRealPath: realpathSync.native(path.resolve(workspaceRoot)),
    producer: "scripts/verify-ziwei-iztro-isolated-build-license-notices.mjs",
    mode: "fixed_dual_vite_build_into_owned_ephemeral_root"
  });
  REFLECT_APPLY(WEAK_MAP_SET, CONTROLLED_RECEIPTS, [receipt, context]);
  return receipt;
}

function requireControlledReceipt(receipt, workspaceRoot) {
  const context = receipt && typeof receipt === "object"
    ? REFLECT_APPLY(WEAK_MAP_GET, CONTROLLED_RECEIPTS, [receipt])
    : undefined;
  if (!context) fail("evidence construction requires the controlled fixed dual-build receipt");
  if (context.workspaceRootRealPath !== realpathSync.native(path.resolve(workspaceRoot))) {
    fail("controlled build receipt cannot be rebound to another workspace root");
  }
  return context;
}

function runFixedBuild(surfaceId, outputRoot, workspaceRoot = defaultWorkspaceRoot) {
  const surface = ZIWEI_IZTRO_LICENSE_NOTICE_SURFACES[surfaceId];
  if (!surface) fail(`unsupported surface ${String(surfaceId)}`);
  const absoluteWorkspaceRoot = path.resolve(workspaceRoot);
  const before = observeControlledBuildInputs(absoluteWorkspaceRoot, surfaceId);
  const restrictedBefore = observeHkoRestrictedSourceMaterial(absoluteWorkspaceRoot);
  const vitePath = resolveContainedWorkspaceFile(
    absoluteWorkspaceRoot,
    VITE_BUILD_IDENTITY.launcherPath,
    "fixed Vite launcher"
  );
  const configPath = resolveContainedWorkspaceFile(
    absoluteWorkspaceRoot,
    surface.configPath,
    `${surfaceId} fixed Vite config`
  );
  execFileSync(process.execPath, [
    vitePath,
    "build",
    "--config",
    configPath,
    "--configLoader",
    "runner",
    "--outDir",
    outputRoot,
    "--emptyOutDir",
    "--logLevel",
    "warn"
  ], {
    cwd: absoluteWorkspaceRoot,
    env: controlledBuildChildEnvironment(),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024
  });
  const after = observeControlledBuildInputs(absoluteWorkspaceRoot, surfaceId);
  const restrictedAfter = observeHkoRestrictedSourceMaterial(absoluteWorkspaceRoot);
  requireSameControlledBuildInputs(before, after, `during ${surfaceId} build`);
  requireSameHkoRestrictedSourceMaterial(
    restrictedBefore,
    restrictedAfter,
    `during ${surfaceId} build`
  );
  return Object.freeze({
    surfaceId,
    before,
    after,
    restrictedBefore,
    restrictedAfter,
    prePostControlledInputsEqual: true,
    prePostRestrictedSourceMaterialEqual: true
  });
}

function buildControlledBuildExecutionBoundary(snapshot) {
  const inputByPath = new Map(snapshot.inputs.map((input) => [input.path, input]));
  const viteEndpoints = BUILD_EXECUTION_ARTIFACTS
    .filter((artifact) => artifact.bytes !== undefined)
    .map((artifact) => {
      const observed = inputByPath.get(artifact.path);
      if (!observed) fail(`fixed Vite execution endpoint ${artifact.path} is absent from the build snapshot`);
      return Object.freeze({
        role: artifact.role,
        path: artifact.path,
        bytes: observed.bytes,
        sha256: observed.sha256
      });
    });
  return Object.freeze({
    mode: "fixed_vite_7_3_6_endpoints_and_controlled_input_attestations",
    viteIdentity: Object.freeze({
      packageName: "vite",
      version: VITE_BUILD_IDENTITY.version,
      fixedExecutionEndpointsVerified: true,
      endpoints: Object.freeze(viteEndpoints)
    }),
    rootLockSemanticIdentity: Object.freeze({
      path: VITE_BUILD_IDENTITY.rootLockPath,
      lockfileVersion: 3,
      appPackagePath: "apps/web",
      requestedVersion: VITE_BUILD_IDENTITY.version,
      packagePath: VITE_BUILD_IDENTITY.lockPackagePath,
      resolvedVersion: VITE_BUILD_IDENTITY.version,
      resolved: VITE_BUILD_IDENTITY.resolved,
      integrity: VITE_BUILD_IDENTITY.integrity,
      binPath: "bin/vite.js",
      semanticIdentityVerified: true,
      rawRootLockBytesPromotedToReleaseEvidence: false
    }),
    controlledInputEquality: Object.freeze({
      comparedInputCount: snapshot.inputs.length,
      browserPreviewPrePostEqual: true,
      browserWorkspacePrePostEqual: true,
      betweenBuildsEqual: true,
      crossFileAtomicityEstablished: false,
      intervalIntegrityEstablished: false,
      abaResistanceEstablished: false,
      mutationEpochEstablished: false
    }),
    inheritedNodeAndViteEnvironmentAccepted: false,
    nodeRuntimeBinaryIdentityEstablished: false
  });
}

function removeOwnedTemporaryRoot(temporaryRoot) {
  const absolute = path.resolve(temporaryRoot);
  const expectedParent = realpathSync.native(os.tmpdir());
  const endpoint = lstatSync(absolute, { bigint: true });
  const actualRealPath = realpathSync.native(absolute);
  const realRelative = path.relative(expectedParent, actualRealPath);
  if (!endpoint.isDirectory() || endpoint.isSymbolicLink()
    || realpathSync.native(path.dirname(absolute)) !== expectedParent
    || path.dirname(actualRealPath) !== expectedParent
    || realRelative !== path.basename(absolute)
    || !path.basename(absolute).startsWith(TEMPORARY_PREFIX)) {
    fail("refusing to remove a directory outside the owned temporary prefix");
  }
  rmSync(absolute, { recursive: true, force: true });
}

export function computeZiweiIztroLicenseNoticeEvidenceDigest(evidence) {
  const { evidenceDigest: _ignored, ...unsigned } = evidence;
  return sha256(Buffer.from(`${EVIDENCE_DIGEST_DOMAIN}${canonicalJson(unsigned)}`, "utf8"));
}

export function buildZiweiIztroLicenseNoticeEvidence(receipt, workspaceRoot = defaultWorkspaceRoot) {
  const context = requireControlledReceipt(receipt, workspaceRoot);
  if (receipt?.schemaVersion !== "ziwei-iztro-isolated-build-license-notice-verification/1"
    || receipt?.status !== "top_level_license_notice_bytes_observed_without_legal_clearance"
    || receipt?.surfaces?.length !== 2) {
    fail("controlled build receipt is invalid");
  }
  const licenseArtifact = receipt.canonicalInputs.basisArtifacts.find(
    (artifact) => artifact.role === "controlled_top_level_license_copy"
  );
  const licenseBytes = readHeldRegularFile(
    resolveContainedWorkspaceFile(workspaceRoot, licenseArtifact.path, "notice clause candidate source"),
    "notice clause candidate source"
  ).bytes;
  const noticeClause = licenseBytes.subarray(484, 610);
  if (noticeClause.byteLength !== 126
    || sha256(noticeClause) !== "89fdc900e69446e48038e9db01dd71e62566997bd91135f0afbecc07ae997c8a") {
    fail("top-level notice clause candidate locator drifted");
  }
  const evidence = {
    schemaVersion: "1.0.0",
    recordType: "ziwei_iztro_top_level_build_notice_evidence",
    evidenceLedgerId: "hakimi.ziwei.iztro-build-notice-evidence/1.0.0",
    status: "controlled_ephemeral_build_top_level_notice_observed_unbound",
    observedOn: "2026-08-30",
    systemIdentity: {
      productSystemId: "ziwei-doushu",
      contractSystemId: "ziwei",
      productStatus: "isolated_engineering_draft",
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null
    },
    dependencyIdentity: {
      packageName: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.packageName,
      requestedVersion: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version,
      resolvedVersion: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version,
      resolved: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.resolved,
      integrity: ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.integrity
    },
    basisArtifacts: receipt.canonicalInputs.basisArtifacts,
    installedEndpointObservation: {
      scope: "three_fixed_endpoints_only_not_complete_installed_package_bytes",
      endpoints: receipt.canonicalInputs.installedEndpoints,
      installedPackageFullBytesCovered: false,
      packageLockClosureIdentityOnly: true
    },
    buildExecutionObservation: receipt.buildExecutionBoundary,
    licenseTextObservation: {
      declaredSpdxIdentifier: "MIT",
      controlledCopyMatchesInstalledTopLevelLicenseEndpoint: true,
      upstreamTarballIndependentlyReverifiedThisRun: false,
      publisherAuthenticityEstablished: false,
      semanticInterpretationReviewed: false
    },
    noticeCandidate: {
      mode: "verbatim_full_top_level_license_only",
      sourcePath: licenseArtifact.path,
      bytes: licenseArtifact.bytes,
      sha256: licenseArtifact.sha256,
      noticeClauseCandidateLocator: {
        byteStartInclusive: 484,
        byteEndExclusive: 610,
        bytes: 126,
        sha256: "89fdc900e69446e48038e9db01dd71e62566997bd91135f0afbecc07ae997c8a",
        semanticInterpretationReviewed: false
      },
      controlledBuildReceipt: {
        producer: context.producer,
        mode: context.mode,
        outputPersistence: "deleted_after_endpoint_verification",
        platformSpecificOutputTreeDigestsBound: false,
        controlledInputEquality: receipt.buildExecutionBoundary.controlledInputEquality,
        nodeRuntimeBinaryIdentityEstablished: false,
        surfaces: receipt.surfaces.map((surface) => ({
          surfaceId: surface.surfaceId,
          sourceConfigPath: surface.sourceConfigPath,
          sourceHtmlPath: surface.sourceHtmlPath,
          licenseAsset: surface.licenseAsset,
          htmlLicenseLink: surface.htmlLicenseLink,
          buildInputAttestation: surface.buildInputAttestation,
          workerObservation: {
            nonSourcemapWorkerCount: 1,
            versionMarkerObserved: surface.workerObservation.versionMarkerObserved,
            integrityMarkerObserved: surface.workerObservation.integrityMarkerObserved,
            dependencyExecutionEstablished: false
          }
        }))
      },
      buildNoticeInclusionStatus: "observed_in_two_controlled_ephemeral_isolated_builds",
      releaseBuildProvenanceEstablished: false
    },
    coverageBoundary: {
      coversIztro2_5_8TopLevelLicenseOnly: true,
      completeDependencyClosureCovered: false,
      fortelCovered: false,
      zodCovered: false,
      installedPackageFullBytesCovered: false,
      sourceBindingSubjectId: "ziwei.rights.engine-code-and-dependency-notices",
      subjectFullySatisfied: false
    },
    parentBindingBoundary: {
      bindingDirection: "fixed_dependency_and_build_artifacts_to_child_only",
      bindsZiweiManifest: false,
      bindsZiweiRequirements: false,
      bindsFourSystemRegistry: false,
      bindsCrossSystemReceipts: false,
      bindsDefaultWeb: false
    },
    readBoundary: receipt.readBoundary,
    authorityBoundary: receipt.authorityBoundary,
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
      "publisher_identity_upstream_signature_or_independent_tarball_authenticity",
      "license_authenticity_legal_interpretation_or_notice_obligation_satisfaction",
      "complete_iztro_dependency_closure_fortel_zod_or_other_dependency_notice_coverage",
      "ziwei_source_binding_freeze_rights_bundle_or_any_of_27_required_subjects",
      "installed_package_full_byte_identity_or_dependency_execution",
      "domain_truth_expert_truth_scientific_validity_or_high_risk_expression_approval",
      "default_web_full_build_browser_host_pwa_service_worker_deployment_or_rollback_readiness",
      "vite_watch_or_programmatic_rebuild_reference_freshness",
      "complete_vite_package_or_build_toolchain_byte_identity",
      "node_runtime_binary_identity",
      "uninterrupted_execution_interval_integrity_or_true_release_build_provenance",
      "bazi_authority_vedic_authority_cross_system_consensus_scoring_or_winner_selection",
      "release_readiness_public_deployment_or_public_release_authorization",
      "cross_file_atomicity_interval_integrity_aba_resistance_or_mutation_epoch"
    ]
  };
  return Object.freeze({
    ...evidence,
    evidenceDigest: computeZiweiIztroLicenseNoticeEvidenceDigest(evidence)
  });
}

function loadAndVerifyEvidence(receipt, workspaceRoot) {
  const evidenceFile = readHeldRegularFile(
    resolveContainedWorkspaceFile(workspaceRoot, ZIWEI_IZTRO_LICENSE_NOTICE_EVIDENCE_PATH, "evidence child"),
    "evidence child",
    MAX_EVIDENCE_BYTES
  );
  const expected = buildZiweiIztroLicenseNoticeEvidence(receipt, workspaceRoot);
  const parsed = requireExactCanonicalEvidenceBytes(evidenceFile.bytes, expected);
  return Object.freeze({
    path: ZIWEI_IZTRO_LICENSE_NOTICE_EVIDENCE_PATH,
    bytes: evidenceFile.byteLength,
    sha256: evidenceFile.sha256,
    evidenceDigest: parsed.evidenceDigest,
    subjectFullySatisfied: false,
    completeDependencyClosureCovered: false,
    fortelCovered: false,
    bindingFrozenVerified: false,
    rightsLegalConclusionEstablished: false,
    expertClaimsAuthorized: false,
    releaseReady: false,
    publicDeploymentAuthorized: false
  });
}

export function runZiweiIztroIsolatedBuildLicenseNoticeVerification({ evidenceMode = "verify" } = {}) {
  if (!new Set(["verify", "template", "none"]).has(evidenceMode)) fail("unsupported evidence mode");
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), TEMPORARY_PREFIX));
  try {
    const browserPreviewOutputRoot = path.join(temporaryRoot, "browser-preview");
    const browserWorkspaceOutputRoot = path.join(temporaryRoot, "browser-workspace");
    const browserPreviewBuild = runFixedBuild("browser-preview", browserPreviewOutputRoot);
    const browserWorkspaceBuild = runFixedBuild("browser-workspace", browserWorkspaceOutputRoot);
    requireSameControlledBuildInputs(
      browserPreviewBuild.after,
      browserWorkspaceBuild.before,
      "between browser-preview and browser-workspace builds"
    );
    requireSameHkoRestrictedSourceMaterial(
      browserPreviewBuild.restrictedAfter,
      browserWorkspaceBuild.restrictedBefore,
      "between browser-preview and browser-workspace builds"
    );
    const controlledBuildBoundary = buildControlledBuildExecutionBoundary(browserWorkspaceBuild.after);
    const observedReceipt = verifyZiweiIztroIsolatedBuildLicenseNotices({
      browserPreviewOutputRoot,
      browserWorkspaceOutputRoot,
      workspaceRoot: defaultWorkspaceRoot,
      controlledBuildSnapshot: browserWorkspaceBuild.after,
      expectedBuildInputAttestations: Object.freeze({
        "browser-preview": browserPreviewBuild.before.attestation,
        "browser-workspace": browserWorkspaceBuild.before.attestation
      }),
      controlledBuildBoundary,
      restrictedSourceMaterialSnapshot: browserWorkspaceBuild.restrictedAfter
    });
    const restrictedAtReceiptIssuance = observeHkoRestrictedSourceMaterial(defaultWorkspaceRoot);
    requireSameHkoRestrictedSourceMaterial(
      browserWorkspaceBuild.restrictedAfter,
      restrictedAtReceiptIssuance,
      "through dual output scan and receipt issuance"
    );
    const receipt = brandControlledReceipt(Object.freeze({
      ...observedReceipt,
      hkoRestrictedSourceMaterialBoundary: buildHkoRestrictedSourceMaterialBoundary(
        restrictedAtReceiptIssuance,
        observedReceipt.surfaces,
        Object.freeze({
          browserPreviewPrePostEqual: true,
          browserWorkspacePrePostEqual: true,
          betweenBuildsEqual: true
        }),
        true
      )
    }), defaultWorkspaceRoot);
    if (evidenceMode === "template") return buildZiweiIztroLicenseNoticeEvidence(receipt, defaultWorkspaceRoot);
    if (evidenceMode === "none") return receipt;
    return Object.freeze({
      ...receipt,
      evidenceChild: loadAndVerifyEvidence(receipt, defaultWorkspaceRoot)
    });
  } finally {
    removeOwnedTemporaryRoot(temporaryRoot);
  }
}

export const ziweiIztroLicenseNoticeTestOnly = Object.freeze({
  BASIS_ARTIFACTS,
  BUILD_INPUT_ATTESTATION_ASSET_PATH,
  BUILD_INPUT_ATTESTATION_PRODUCER,
  BUILD_INPUT_ATTESTATION_SCHEMA,
  CONTROLLED_BUILD_INPUT_PATHS: Object.freeze(CONTROLLED_BUILD_INPUT_SPECS.map((artifact) => artifact.path)),
  INSTALLED_ENDPOINTS,
  EXPECTED_LICENSE_HREF,
  TEMPORARY_PREFIX,
  VITE_BUILD_IDENTITY,
  canonicalJson,
  inventoryOutputRoot,
  loadAndVerifyEvidence,
  observeControlledBuildInputs,
  observeCanonicalInputs,
  requireSameControlledBuildInputs,
  requireExactCanonicalEvidenceBytes,
  runFixedBuild,
  verifyLicenseHtml
});
