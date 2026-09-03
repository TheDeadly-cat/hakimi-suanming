import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeDeployedPwaEvidenceV3Identity,
  DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES,
  DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES,
  DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES,
  DEPLOYED_PWA_EVIDENCE_V3_HOSTING_POLICY_PATH,
  DEPLOYED_PWA_EVIDENCE_V3_POLICY_BINDINGS,
  DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES
} from "./deployed-pwa-evidence-v3-lib.mjs";
import { writeReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";
import {
  canonicalJson,
  collectArtifactEntries,
  releaseArtifactComponents,
  sha256
} from "./release-evidence-lib.mjs";

const sourceWorkspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePrefix = "hakimi-deployed-pwa-v3-test-";
const FIXTURE_CLEANUP_IDENTITY = Symbol("deployed-pwa-v3-fixture-cleanup-identity");

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function sameDirectoryIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs
    && comparablePath(left.realPath) === comparablePath(right.realPath);
}

function assertRandomFixtureBasename(workspaceRealPath, temporaryRootRealPath) {
  const basename = path.basename(workspaceRealPath);
  const suffix = basename.slice(fixturePrefix.length);
  if (
    path.dirname(workspaceRealPath) !== temporaryRootRealPath
    || !basename.startsWith(fixturePrefix)
    || suffix.length < 6
    || !/^[A-Za-z0-9]+$/u.test(suffix)
  ) {
    throw new Error("Synthetic deployed-PWA v3 fixture root is not a direct random child of the physical temporary root.");
  }
}

async function captureFixtureDirectoryIdentity(directoryPath, label) {
  const metadata = await lstat(directoryPath, { bigint: true });
  const resolved = path.resolve(await realpath(directoryPath));
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a physical non-link directory.`);
  }
  return Object.freeze({
    dev: metadata.dev,
    ino: metadata.ino,
    birthtimeNs: metadata.birthtimeNs,
    realPath: resolved
  });
}

async function createFixtureWorkspace() {
  const temporaryRootPath = path.resolve(os.tmpdir());
  const temporaryRootIdentity = await captureFixtureDirectoryIdentity(
    temporaryRootPath,
    "Operating-system temporary root"
  );
  if (comparablePath(temporaryRootIdentity.realPath) !== comparablePath(temporaryRootPath)) {
    throw new Error("Operating-system temporary root must not be reached through an alias.");
  }
  const workspace = await mkdtemp(path.join(temporaryRootIdentity.realPath, fixturePrefix));
  const workspaceIdentity = await captureFixtureDirectoryIdentity(
    workspace,
    "Synthetic deployed-PWA v3 fixture root"
  );
  if (comparablePath(workspaceIdentity.realPath) !== comparablePath(path.resolve(workspace))) {
    throw new Error("Synthetic deployed-PWA v3 fixture root must not be reached through an alias.");
  }
  assertRandomFixtureBasename(workspaceIdentity.realPath, temporaryRootIdentity.realPath);
  return Object.freeze({
    workspace,
    cleanupIdentity: Object.freeze({
      temporaryRoot: temporaryRootIdentity,
      workspace: workspaceIdentity
    })
  });
}

async function removeFixtureWorkspace(workspace, cleanupIdentity) {
  if (
    typeof workspace !== "string"
    || !path.isAbsolute(workspace)
    || cleanupIdentity === null
    || typeof cleanupIdentity !== "object"
  ) {
    throw new Error("Synthetic deployed-PWA v3 fixture cleanup identity is missing.");
  }
  const currentTemporaryRoot = await captureFixtureDirectoryIdentity(
    cleanupIdentity.temporaryRoot.realPath,
    "Operating-system temporary root before fixture cleanup"
  );
  if (!sameDirectoryIdentity(currentTemporaryRoot, cleanupIdentity.temporaryRoot)) {
    throw new Error("Operating-system temporary root identity changed before fixture cleanup.");
  }
  const currentWorkspace = await captureFixtureDirectoryIdentity(
    workspace,
    "Synthetic deployed-PWA v3 fixture root before cleanup"
  );
  if (!sameDirectoryIdentity(currentWorkspace, cleanupIdentity.workspace)) {
    throw new Error("Synthetic deployed-PWA v3 fixture root identity changed before cleanup.");
  }
  if (comparablePath(currentWorkspace.realPath) !== comparablePath(path.resolve(workspace))) {
    throw new Error("Synthetic deployed-PWA v3 fixture cleanup target is now reached through an alias.");
  }
  assertRandomFixtureBasename(currentWorkspace.realPath, currentTemporaryRoot.realPath);
  await rm(workspace, { recursive: true, force: true });
}
const releaseEvidenceId = `hre1-${"a".repeat(32)}`;
const buildVersion = "abcdef123456";
export const candidateOrigin = "https://staging.hakimi-bazi.cn";
const candidatePlatform = "fixture-host";
const caseId = "00000000-0000-4000-8000-000000000000";
const revisionId = "00000000-0000-4000-8000-000000000001";

export function artifactMutationBoundary() {
  return {
    schemaVersion: 1,
    boundaryType: "release_artifact_endpoint_snapshot_boundary_v1",
    coveredReceiptIds: ["backup", "boot", "pwa", "web-v1-flow"],
    endpointSnapshotsMatched: true,
    verificationScope: "endpoint_snapshots_only_no_interval_mutation_epoch",
    mutationEpochCapability: "absent_schema13",
    intervalMutationExclusionClaimed: false,
    abaMutationExclusionClaimed: false
  };
}
const caseRevisionPath = `/cases/${caseId}/revisions/${revisionId}`;
const releaseGeneratedAt = "2026-08-26T00:00:00.000Z";
const lockCreatedAt = "2026-08-26T00:00:30.000Z";
const formalVerifiedAt = "2026-08-26T00:01:00.000Z";
const deploymentCompletedAt = "2026-08-26T00:01:30.000Z";
const hostCompletedAt = "2026-08-26T00:02:00.000Z";
const browserStartedAt = "2026-08-26T00:03:00.000Z";
const browserCompletedAt = "2026-08-26T00:04:00.000Z";
const evidenceGeneratedAt = "2026-08-26T00:05:00.000Z";
const terminalMessage =
  "Deployed-PWA v3 bytes are internally consistent, but trusted producers, real execution admission, and all public authorization remain absent.";
export const pwaManifestDocument = Object.freeze({
  name: "Hakimi Bazi",
  short_name: "Hakimi",
  description: "Synthetic deployed-PWA v3 fixture",
  id: "/",
  lang: "zh-CN",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "any",
  background_color: "#ffffff",
  theme_color: "#ffffff",
  categories: ["productivity"],
  prefer_related_applications: false,
  icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" }],
  shortcuts: []
});

const descriptor = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: Object.freeze([null]),
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});

function slashPath(value) {
  return value.split(path.sep).join("/");
}

function relativePath(workspace, absolutePath) {
  return slashPath(path.relative(workspace, absolutePath));
}

export function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeBytes(filePath, bytes) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}

export async function writeJson(filePath, value) {
  await writeBytes(filePath, jsonBytes(value));
}

export async function fileBinding(workspace, filePath) {
  const bytes = await readFile(filePath);
  return Object.freeze({
    path: relativePath(workspace, filePath),
    size: bytes.byteLength,
    sha256: sha256(bytes)
  });
}

export async function writeExactSidecar(targetPath) {
  const bytes = await readFile(targetPath);
  await writeFile(
    `${targetPath}.sha256`,
    `${sha256(bytes)}  ${path.basename(targetPath)}\n`,
    "utf8"
  );
}

export function digestReceipt(document) {
  const unsigned = structuredClone(document);
  delete unsigned.receiptDigest;
  return sha256(canonicalJson(unsigned));
}

function releaseBrowserProject(projectName) {
  return {
    projectName,
    discovered: 1,
    passed: 1,
    skipped: 0,
    failed: 0,
    timedOut: 0,
    interrupted: 0,
    unexpected: 0,
    flaky: 0,
    nonPassedExpectedStatus: 0,
    attempts: 1
  };
}

function releaseBrowserSummary() {
  return {
    schemaVersion: 1,
    summaryType: "release_browser_test_summary",
    receiptId: "pwa",
    expectedTestsPerProject: 1,
    expectedProjectNames: ["msedge", "chrome"],
    fullResultStatus: "passed",
    strictGatePassed: true,
    unexpectedProjectNames: [],
    errors: [],
    projects: [releaseBrowserProject("msedge"), releaseBrowserProject("chrome")]
  };
}

function releaseEvidenceDocument({
  artifactRoot,
  artifactEntries,
  artifactSetDigest,
  components,
  identityLock,
  manifestDigest,
  hostingPolicySha256 = null
}) {
  const hashes = Array.from({ length: 10 }, (_, index) =>
    sha256(`release-evidence-synthetic-${index}`)
  );
  return {
    schemaVersion: 1,
    evidenceType: "engineering_release_evidence",
    evidenceId: releaseEvidenceId,
    generatedAt: releaseGeneratedAt,
    source: {
      repository: null,
      commit: "b".repeat(40),
      branch: "main",
      dirty: false,
      untrackedSourceFileCount: 0,
      sourceTreeDigest: hashes[0],
      packageLockSha256: hashes[1]
    },
    release: {
      channel: "default-v13",
      candidateLabel: "deployed-pwa-v3-synthetic",
      descriptor,
      manifestVersion: 1,
      manifestDigest,
      buildVersion,
      builtEvidenceId: releaseEvidenceId,
      evidenceIdBound: true,
      requiredReceiptIds: ["pwa"]
    },
    toolchain: {
      node: "v34.16.0",
      npm: "11.0.0",
      platform: "win32",
      arch: "x64",
      osRelease: "10.0.26200",
      browsers: {
        edge: "Microsoft Edge 151.0.0.0",
        chrome: "Google Chrome 151.0.0.0"
      }
    },
    policyFiles: [
      { path: "docs/release/web-v1-release-decisions.json", sha256: hashes[2] },
      { path: "docs/release/release-generation-history.json", sha256: hashes[3] },
      {
        path: "docs/security/hosting-security-policy.json",
        sha256: hostingPolicySha256 ?? hashes[4]
      },
      { path: "docs/release/release-evidence.schema.json", sha256: hashes[5] }
    ],
    testReceipts: [{
      id: "pwa",
      evidenceId: releaseEvidenceId,
      status: "passed",
      exitCode: 0,
      command: ["npm", "run", "test:release:pwa-artifact"],
      startedAt: releaseGeneratedAt,
      completedAt: formalVerifiedAt,
      durationMs: 60_000,
      browserResultSummary: {
        path: "synthetic/browser-results/pwa.json",
        sha256: hashes[6],
        summary: releaseBrowserSummary()
      },
      path: "synthetic/receipts/pwa.json",
      sha256: hashes[7]
    }],
    artifacts: {
      root: artifactRoot,
      count: artifactEntries.length,
      artifactSetDigest,
      identityLock: {
        path: identityLock.path,
        sha256: identityLock.sha256,
        lockDigest: identityLock.lockDigest,
        artifactSetDigest,
        verified: true
      },
      mutationBoundary: artifactMutationBoundary(),
      components,
      files: artifactEntries
    },
    gates: {
      sourceTreeClean: true,
      evidenceIdBound: true,
      defaultReleaseDescriptorMatched: true,
      requiredReceiptsPresent: true,
      allRecordedReceiptsPassed: true,
      policyReceiptSetMatched: true,
      recordedReceiptSetMatched: true,
      policyReceiptCommandsMatched: true,
      browserResultSummariesMatched: true,
      artifactIdentityStable: true,
      requiredArtifactComponentsPresent: true,
      engineeringGatePassed: true,
      releaseHistoryOwnerConfirmed: false,
      hostingSecurityVerified: false,
      publicDeploymentAuthorized: false,
      licenseOwnerSelectionRecorded: false,
      expertClaimsAuthorized: false
    },
    claims: {
      engineeringEvidenceOnly: true,
      codeSignature: false,
      expertSignature: false,
      contentRightsGrant: false,
      publicReleaseAuthorized: false
    }
  };
}

async function copyCheckedPolicies(workspace) {
  const required = new Set([
    ...DEPLOYED_PWA_EVIDENCE_V3_POLICY_BINDINGS.map((binding) => binding.path),
    "docs/release/release-evidence.schema.json"
  ]);
  for (const relative of required) {
    const source = path.join(sourceWorkspace, relative);
    const destination = path.join(workspace, relative);
    await writeBytes(destination, await readFile(source));
  }
}

async function writeBaseArtifact(artifactRoot) {
  const serializedManifest = JSON.stringify({
    manifestVersion: 1,
    database: descriptor,
    requiredStorageTables: [
      "cases", "revisions", "candidateSets", "researchNotes", "events", "savedViews",
      "knowledgeDocuments", "sourceRights", "citations", "attachments", "researcherProfiles",
      "appSettings", "ruleRegistry", "tzdbMigrationReceipts", "eventTimeMigrationReceipts",
      "birthFingerprints"
    ],
    requiredStorageIndexes: []
  });
  const manifestDigest = sha256(serializedManifest);
  const escapedDescriptor = JSON.stringify(descriptor).replaceAll('"', "&quot;");
  const escapedManifest = serializedManifest.replaceAll('"', "&quot;");
  await mkdir(artifactRoot, { recursive: true });
  await writeFile(path.join(artifactRoot, "index.html"), `<!doctype html><html><head>
  <meta name="hakimi-release-database" content="${escapedDescriptor}" />
  <meta name="hakimi-release-storage-manifest" content="${escapedManifest}" />
  <meta name="hakimi-release-storage-manifest-digest" content="${manifestDigest}" />
  <meta name="hakimi-build-version" content="${buildVersion}" />
  <meta name="hakimi-release-evidence-id" content="${releaseEvidenceId}" />
  <link rel="icon" href="/brand.svg" type="image/svg+xml" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="stylesheet" href="/assets/app.css" />
</head><body><img src="/brand.svg" alt="" /><script type="module" crossorigin src="/assets/app.js"></script></body></html>
`, "utf8");
  await writeBytes(path.join(artifactRoot, "manifest.webmanifest"), jsonBytes(pwaManifestDocument));
  await writeFile(
    path.join(artifactRoot, "sw.js"),
    [
      `const CACHE_VERSION = "${buildVersion}";`,
      `const RELEASE_DATABASE = JSON.parse(${JSON.stringify(JSON.stringify(descriptor))});`,
      `const LEGACY_BRIDGE_DATABASE = Object.freeze(JSON.parse(${JSON.stringify(JSON.stringify(descriptor))}));`,
      "self.addEventListener('fetch', () => undefined);"
    ].join("\n"),
    "utf8"
  );
  await writeFile(path.join(artifactRoot, "_headers"), "/*\n  Cache-Control: no-cache\n", "utf8");
  await writeFile(path.join(artifactRoot, "brand.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>", "utf8");
  await writeBytes(path.join(artifactRoot, "icon.png"), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  await writeBytes(path.join(artifactRoot, "assets", "app.js"), Buffer.from("export const release = 'legacy-v13';", "utf8"));
  await writeBytes(path.join(artifactRoot, "assets", "app.css"), Buffer.from("body{color:#111}", "utf8"));
  return manifestDigest;
}

function routeObservations(projectName) {
  return [
    {
      routeId: "online-root",
      path: "/",
      navigationKind: "online",
      offline: false,
      playwrightFromServiceWorkerRecorded: false,
      cdpFromServiceWorkerRecorded: false,
      cdpRequestId: `${projectName}-request-0`,
      observedAt: "2026-08-26T00:03:05.000Z"
    },
    {
      routeId: "offline-settings-data",
      path: "/settings/data",
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true,
      cdpRequestId: `${projectName}-request-1`,
      observedAt: "2026-08-26T00:03:10.000Z"
    },
    {
      routeId: "offline-case-revision",
      path: caseRevisionPath,
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true,
      cdpRequestId: `${projectName}-request-2`,
      observedAt: "2026-08-26T00:03:15.000Z"
    },
    {
      routeId: "offline-help-cold-start",
      path: "/help",
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true,
      cdpRequestId: `${projectName}-request-3`,
      observedAt: "2026-08-26T00:03:20.000Z"
    },
    {
      routeId: "offline-help-reload",
      path: "/help",
      navigationKind: "reload",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true,
      cdpRequestId: `${projectName}-request-4`,
      observedAt: "2026-08-26T00:03:25.000Z"
    }
  ];
}

export function caseProjection() {
  return {
    databaseName: descriptor.databaseName,
    dbGeneration: descriptor.dbGeneration,
    targetSchema: descriptor.targetSchema,
    migrationId: descriptor.migrationId,
    caseId,
    revisionId,
    caseRecordSha256: sha256("synthetic-case-record"),
    revisionRecordSha256: sha256("synthetic-revision-record")
  };
}

export function caseCapture(projectName, capturePhase, capturedAt, projection) {
  return {
    schemaVersion: 1,
    recordType: "deployed-pwa-case-revision-observation-v1",
    projectName,
    captureId: `${projectName}-${capturePhase.replaceAll("_", "-")}`,
    capturePhase,
    capturedAt,
    projection
  };
}

function controllerIdentity(serviceWorkerSha256) {
  return {
    registrationScope: `${candidateOrigin}/`,
    controllerScriptUrl: `${candidateOrigin}/sw.js`,
    controllerState: "activated",
    activeScriptUrl: `${candidateOrigin}/sw.js`,
    activeState: "activated",
    waitingScriptUrl: null,
    installingScriptUrl: null,
    buildVersion,
    descriptor,
    remoteServiceWorkerSha256: serviceWorkerSha256,
    controllerSourceSha256: serviceWorkerSha256,
    controllerSourceEvidenceMethod: "cdp_debugger_get_script_source_v1"
  };
}

export async function writeAttachment(workspace, filePath, role, value, raw = false) {
  await writeBytes(filePath, raw ? Buffer.from(value) : jsonBytes(value));
  return {
    role,
    ...await fileBinding(workspace, filePath)
  };
}

export function bindingWithoutRole(binding) {
  return {
    path: binding.path,
    size: binding.size,
    sha256: binding.sha256
  };
}

export async function materializeBrowserReceipt({
  workspace,
  receiptPath,
  envelope,
  document
}) {
  document.receiptDigest = digestReceipt(document);
  await writeJson(receiptPath, document);
  const binding = await fileBinding(workspace, receiptPath);
  const core = structuredClone(document);
  delete core.schemaVersion;
  delete core.receiptType;
  delete core.projectName;
  delete core.browserChannel;
  delete core.actualProduct;
  envelope.receipt = {
    ...binding,
    ...core
  };
  return document;
}

async function createBrowserReceipt({
  workspace,
  receiptsRoot,
  projectName,
  browserChannel,
  actualProduct,
  profileBindingDigest,
  pwaManifestBytes,
  serviceWorkerBytes,
  serviceWorkerSha256,
  artifactSetDigest
}) {
  const browserRoot = path.join(receiptsRoot, projectName);
  const routes = routeObservations(projectName);
  const controller = controllerIdentity(serviceWorkerSha256);
  const projection = caseProjection();
  const projectionDigest = sha256(canonicalJson(projection));
  const manifestData = Buffer.from(pwaManifestBytes).toString("utf8");
  const processedManifest = {
    id: `${candidateOrigin}/`,
    startUrl: `${candidateOrigin}/`,
    scope: `${candidateOrigin}/`,
    display: "standalone"
  };
  const attachmentInputs = new Map([
    ["browser-version", {
      value: { schemaVersion: 1, projectName, browserChannel, actualProduct }
    }],
    ["profile-preflight", {
      value: {
        schemaVersion: 1,
        projectName,
        profileBindingDigest,
        directoryExistedBeforeRun: false,
        createdByRunner: true
      }
    }],
    ["browser-manifest-audit", {
      fileName: "browser-manifest-audit.json",
      value: {
        schemaVersion: 1,
        recordType: "deployed_pwa_browser_manifest_audit_v1",
        projectName,
        browserChannel,
        actualProduct,
        installability: {
          method: "cdp_page_get_installability_errors_v1",
          installabilityErrors: []
        },
        processedManifest: {
          method: "cdp_page_get_app_manifest_v1",
          url: `${candidateOrigin}/manifest.webmanifest`,
          errors: [],
          data: manifestData,
          manifest: processedManifest
        }
      }
    }],
    ["remote-pwa-manifest-body", {
      fileName: "remote-pwa-manifest-body.webmanifest",
      value: pwaManifestBytes,
      raw: true
    }],
    ["network-events", {
      value: {
        schemaVersion: 1,
        recordType: "deployed_pwa_cdp_network_events_v1",
        projectName,
        routeObservations: routes
      }
    }],
    ["controller-script-meta", {
      value: { schemaVersion: 1, projectName, controller }
    }],
    ["controller-source", { value: serviceWorkerBytes, raw: true }],
    ["remote-service-worker-body", { value: serviceWorkerBytes, raw: true }],
    ["case-revision-before", {
      value: caseCapture(
        projectName,
        "before_offline_cold_start",
        "2026-08-26T00:03:14.000Z",
        projection
      )
    }],
    ["case-revision-after", {
      value: caseCapture(
        projectName,
        "after_offline_cold_start",
        "2026-08-26T00:03:16.000Z",
        projection
      )
    }]
  ]);
  const attachments = [];
  for (const role of DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES) {
    const input = attachmentInputs.get(role);
    attachments.push(await writeAttachment(
      workspace,
      path.join(browserRoot, input.fileName ?? `${role}.${input.raw ? "bin" : "json"}`),
      role,
      input.value,
      input.raw === true
    ));
  }
  const before = attachments.find((attachment) => attachment.role === "case-revision-before");
  const after = attachments.find((attachment) => attachment.role === "case-revision-after");
  const document = {
    schemaVersion: 3,
    receiptType: "deployed_pwa_browser_runtime_receipt_candidate_v3",
    projectName,
    browserChannel,
    actualProduct,
    receiptId: `deployed-pwa-${projectName}`,
    targetOrigin: candidateOrigin,
    releaseEvidenceId,
    artifactSetDigest,
    profileBindingDigest,
    profileDirectoryExistedBeforeRun: false,
    profileCreatedByRunner: true,
    controller,
    manifest: {
      manifestUrl: `${candidateOrigin}/manifest.webmanifest`,
      installabilityEvidenceMethod: "cdp_page_get_installability_errors_v1",
      processedManifestEvidenceMethod: "cdp_page_get_app_manifest_v1",
      remoteManifestEvidenceMethod: "browser_context_request_identity_v1",
      installabilityErrorCount: 0,
      manifestParseErrorCount: 0,
      browserManifestContentSha256: sha256(Buffer.from(manifestData, "utf8")),
      manifestSemanticProjectionSha256: sha256(canonicalJson(processedManifest)),
      remoteManifestSha256: sha256(pwaManifestBytes)
    },
    attemptCount: 1,
    retryCount: 0,
    skippedCount: 0,
    flakyCount: 0,
    routeObservations: routes,
    caseRevision: {
      path: caseRevisionPath,
      projectionVersion: "deployed-pwa-case-revision-observation-v1",
      before: bindingWithoutRole(before),
      after: bindingWithoutRole(after),
      beforeDigest: projectionDigest,
      afterDigest: projectionDigest
    },
    unexpectedExternalRequestCount: 0,
    attachments,
    rawAttachmentSetDigest: sha256(canonicalJson(attachments)),
    receiptDigest: "0".repeat(64),
    startedAt: browserStartedAt,
    completedAt: browserCompletedAt
  };
  const envelope = { projectName, browserChannel, actualProduct, receipt: null };
  const receiptPath = path.join(browserRoot, "browser-receipt.json");
  await materializeBrowserReceipt({ workspace, receiptPath, envelope, document });
  return { envelope, receiptPath };
}

export async function persistDeployedPwaEvidenceV3TestFixture(
  fixture,
  { recomputeIdentity = true } = {}
) {
  if (recomputeIdentity) {
    Object.assign(
      fixture.evidence,
      computeDeployedPwaEvidenceV3Identity(fixture.evidence)
    );
  }
  await writeJson(fixture.inputPath, fixture.evidence);
  await writeExactSidecar(fixture.inputPath);
}

export async function createDeployedPwaEvidenceV3TestFixture({
  bindCurrentHostingPolicyInReleaseEvidence = false
} = {}) {
  const { workspace, cleanupIdentity } = await createFixtureWorkspace();
  try {
  const artifactRoot = path.join(workspace, "synthetic", "artifact");
  const receiptsRoot = path.join(workspace, "synthetic", "receipts");
  const privateRoot = path.join(workspace, "synthetic", "private");
  const inputPath = path.join(privateRoot, "deployed-pwa-evidence-v3.json");
  await copyCheckedPolicies(workspace);
  const manifestDigest = await writeBaseArtifact(artifactRoot);
  await mkdir(receiptsRoot, { recursive: true });
  await mkdir(privateRoot, { recursive: true });

  const lockPath = path.join(receiptsRoot, "release-artifact-identity.json");
  const lockResult = await writeReleaseArtifactIdentityLock({
    cwd: workspace,
    dist: artifactRoot,
    lockPath,
    channel: "default-v13",
    evidenceId: releaseEvidenceId,
    createdAt: lockCreatedAt
  });
  const lockBinding = {
    ...await fileBinding(workspace, lockPath),
    evidenceId: releaseEvidenceId,
    lockDigest: lockResult.lock.lockDigest,
    artifactSetDigest: lockResult.lock.artifactSetDigest,
    createdAt: lockCreatedAt
  };

  const artifactEntries = await collectArtifactEntries(artifactRoot);
  const artifactSetDigest = sha256(canonicalJson(artifactEntries));
  const components = releaseArtifactComponents(artifactEntries);
  if (artifactSetDigest !== lockResult.lock.artifactSetDigest) {
    throw new Error("Synthetic deployed-PWA v3 fixture artifact identity did not close.");
  }
  const releasePath = path.join(artifactRoot, "release-evidence.json");
  const releaseDocument = releaseEvidenceDocument({
    artifactRoot: relativePath(workspace, artifactRoot),
    artifactEntries,
    artifactSetDigest,
    components,
    identityLock: lockBinding,
    manifestDigest,
    hostingPolicySha256: bindCurrentHostingPolicyInReleaseEvidence
      ? sha256(await readFile(path.join(workspace, DEPLOYED_PWA_EVIDENCE_V3_HOSTING_POLICY_PATH)))
      : null
  });
  await writeJson(releasePath, releaseDocument);
  await writeExactSidecar(releasePath);
  const releaseFile = await fileBinding(workspace, releasePath);
  const releaseSidecar = await fileBinding(workspace, `${releasePath}.sha256`);
  const releaseBinding = {
    ...releaseFile,
    sidecarPath: releaseSidecar.path,
    sidecarSize: releaseSidecar.size,
    sidecarSha256: releaseSidecar.sha256,
    schemaVersion: 1,
    schemaId: "https://hakimi.invalid/schemas/release-evidence-v1.json",
    evidenceType: "engineering_release_evidence",
    evidenceId: releaseEvidenceId,
    generatedAt: releaseGeneratedAt
  };

  const formalPath = path.join(receiptsRoot, "formal-verification.json");
  const formalDocument = {
    schemaVersion: 1,
    receiptType: "formal_release_evidence_verification",
    receiptId: `formal-${releaseEvidenceId}`,
    summaryType: "formal_release_evidence_verification_v1",
    verificationKind: "formal-current-source-and-artifact",
    releaseEvidenceId,
    status: "passed",
    verifiedAt: formalVerifiedAt,
    evidenceId: releaseEvidenceId,
    formalReleaseEvidenceVerified: true,
    releaseEvidence: {
      path: releaseBinding.path,
      sha256: releaseBinding.sha256
    },
    release: {
      descriptor,
      manifestVersion: 1,
      manifestDigest,
      buildVersion
    },
    artifacts: {
      root: relativePath(workspace, artifactRoot),
      count: artifactEntries.length,
      artifactSetDigest,
      identityLock: {
        path: lockBinding.path,
        sha256: lockBinding.sha256,
        lockDigest: lockBinding.lockDigest,
        artifactSetDigest
      },
      mutationBoundary: artifactMutationBoundary()
    },
    receiptCount: releaseDocument.testReceipts.length,
    gates: {
      sourceTreeClean: true,
      evidenceIdBound: true,
      defaultReleaseDescriptorMatched: true,
      requiredReceiptsPresent: true,
      allRecordedReceiptsPassed: true,
      policyReceiptSetMatched: true,
      recordedReceiptSetMatched: true,
      policyReceiptCommandsMatched: true,
      browserResultSummariesMatched: true,
      artifactIdentityStable: true,
      requiredArtifactComponentsPresent: true,
      engineeringGatePassed: true
    },
    claims: {
      engineeringEvidenceOnly: true,
      sourceAndArtifactCurrentVerified: true,
      codeSignature: false,
      browserRuntimeBeyondBoundReceiptsVerified: false,
      publicReleaseAuthorized: false
    }
  };
  await writeJson(formalPath, formalDocument);
  const formalBinding = {
    ...await fileBinding(workspace, formalPath),
    schemaVersion: 1,
    receiptType: "formal_release_evidence_verification",
    receiptId: `formal-${releaseEvidenceId}`,
    releaseEvidenceId,
    status: "passed",
    verifiedAt: formalVerifiedAt
  };

  const hostPath = path.join(receiptsRoot, "deployed-host.json");
  const hostDocument = {
    schemaVersion: 3,
    receiptType: "deployed_pwa_host_receipt_candidate_v3",
    receiptId: "deployed-host-synthetic",
    summaryType: "deployed_host_verification_v1",
    verificationKind: "real-network",
    targetOrigin: candidateOrigin,
    deploymentPlatform: candidatePlatform,
    releaseEvidenceId,
    artifactSetDigest,
    networkCompleted: true,
    strictGatePassed: true,
    realHostVerified: true,
    publicDeploymentAuthorized: false,
    completedAt: hostCompletedAt,
    receiptDigest: "0".repeat(64)
  };
  hostDocument.receiptDigest = digestReceipt(hostDocument);
  await writeJson(hostPath, hostDocument);
  const hostBinding = {
    ...await fileBinding(workspace, hostPath),
    receiptId: hostDocument.receiptId,
    summaryType: hostDocument.summaryType,
    verificationKind: hostDocument.verificationKind,
    targetOrigin: candidateOrigin,
    deploymentPlatform: candidatePlatform,
    releaseEvidenceId,
    artifactSetDigest,
    completedAt: hostCompletedAt,
    receiptDigest: hostDocument.receiptDigest
  };

  const pwaManifestBytes = await readFile(path.join(artifactRoot, "manifest.webmanifest"));
  const serviceWorkerBytes = await readFile(path.join(artifactRoot, "sw.js"));
  const edge = await createBrowserReceipt({
    workspace,
    receiptsRoot,
    projectName: "msedge",
    browserChannel: "msedge",
    actualProduct: "Edg/151.0.7922.34",
    profileBindingDigest: sha256("msedge-profile"),
    pwaManifestBytes,
    serviceWorkerBytes,
    serviceWorkerSha256: components.serviceWorker.sha256,
    artifactSetDigest
  });
  const chrome = await createBrowserReceipt({
    workspace,
    receiptsRoot,
    projectName: "chrome",
    browserChannel: "chrome",
    actualProduct: "Chrome/151.0.7922.34",
    profileBindingDigest: sha256("chrome-profile"),
    pwaManifestBytes,
    serviceWorkerBytes,
    serviceWorkerSha256: components.serviceWorker.sha256,
    artifactSetDigest
  });

  const policyBindings = [];
  for (const binding of DEPLOYED_PWA_EVIDENCE_V3_POLICY_BINDINGS) {
    policyBindings.push({
      role: binding.role,
      ...await fileBinding(workspace, path.join(workspace, binding.path))
    });
  }
  const evidence = {
    schemaVersion: 3,
    evidenceType: "deployed_pwa_semantic_candidate",
    evidenceId: `hpwa3-${"0".repeat(32)}`,
    verificationKind: "offline-no-git-no-network-no-browser-no-deployment",
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    generatedAt: evidenceGeneratedAt,
    scope: {
      candidateDeploymentPlatform: candidatePlatform,
      candidateCanonicalOrigin: candidateOrigin,
      hostVerificationKind: "real-network",
      browserProjects: ["msedge", "chrome"],
      releaseIdentity: {
        channel: "default-v13",
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      }
    },
    policyBindings,
    artifactIdentity: {
      artifactRoot: relativePath(workspace, artifactRoot),
      releaseEvidence: releaseBinding,
      formalReceipt: formalBinding,
      identityLock: lockBinding,
      descriptor,
      manifestVersion: 1,
      manifestDigest,
      buildVersion,
      artifactSetDigest,
      components
    },
    receipts: {
      host: hostBinding,
      edge: edge.envelope,
      chrome: chrome.envelope,
      deployment: null
    },
    semanticGates: Object.fromEntries(
      DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES.map((name) => [name, true])
    ),
    admissionGates: Object.fromEntries(
      DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES.map((name) => [name, false])
    ),
    claims: Object.fromEntries(
      DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES.map((name) => [name, false])
    ),
    failures: [{
      code: "DEPLOYED_PWA_V3_SEMANTICALLY_CONSISTENT_NOT_ADMITTED",
      category: "execution_admission",
      messageDigest: sha256(terminalMessage),
      detailBinding: null
    }],
    evidenceDigest: "0".repeat(64)
  };
  const fixture = {
    workspace,
    artifactRoot,
    receiptsRoot,
    privateRoot,
    inputPath,
    artifactLockPath: lockPath,
    releaseEvidencePath: releasePath,
    formalReceiptPath: formalPath,
    pwaHostReceiptPath: hostPath,
    evidence,
    browserReceiptPaths: {
      edge: edge.receiptPath,
      chrome: chrome.receiptPath
    },
    args: {
      inputPath: relativePath(workspace, inputPath),
      artifactRoot: relativePath(workspace, artifactRoot),
      receiptsRoot: relativePath(workspace, receiptsRoot),
      privateRoot: relativePath(workspace, privateRoot)
    }
  };
  Object.defineProperty(fixture, FIXTURE_CLEANUP_IDENTITY, {
    value: cleanupIdentity,
    enumerable: false,
    configurable: false,
    writable: false
  });
  await persistDeployedPwaEvidenceV3TestFixture(fixture);
  return fixture;
  } catch (error) {
    await removeFixtureWorkspace(workspace, cleanupIdentity);
    throw error;
  }
}

export async function cleanupDeployedPwaEvidenceV3TestFixture(fixture) {
  const cleanupIdentity = fixture?.[FIXTURE_CLEANUP_IDENTITY];
  await removeFixtureWorkspace(fixture?.workspace, cleanupIdentity);
}

export async function attachDeployedPwaV3DeploymentReceipt(fixture) {
  const receiptPath = path.join(fixture.receiptsRoot, "provider-deployment.json");
  const document = {
    schemaVersion: 3,
    receiptType: "deployed_pwa_provider_deployment_receipt_candidate_v3",
    receiptId: "provider-deployment-synthetic",
    provider: candidatePlatform,
    deploymentId: "fixture-deployment-001",
    targetOrigin: candidateOrigin,
    releaseEvidenceId,
    artifactSetDigest: fixture.evidence.artifactIdentity.artifactSetDigest,
    action: "deploy_candidate",
    completedAt: deploymentCompletedAt,
    receiptDigest: "0".repeat(64)
  };
  document.receiptDigest = digestReceipt(document);
  await writeJson(receiptPath, document);
  fixture.evidence.receipts.deployment = {
    ...await fileBinding(fixture.workspace, receiptPath),
    receiptId: document.receiptId,
    provider: document.provider,
    deploymentId: document.deploymentId,
    targetOrigin: document.targetOrigin,
    releaseEvidenceId: document.releaseEvidenceId,
    artifactSetDigest: document.artifactSetDigest,
    action: document.action,
    completedAt: document.completedAt,
    receiptDigest: document.receiptDigest
  };
  await persistDeployedPwaEvidenceV3TestFixture(fixture);
  return { receiptPath, document };
}

