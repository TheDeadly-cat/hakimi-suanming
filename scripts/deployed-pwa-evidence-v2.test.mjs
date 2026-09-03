import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertDeployedPwaEvidenceV2RootsStillLocked,
  assertIsolatedDeployedPwaEvidenceV2Roots,
  computeDeployedPwaEvidenceV2Identity,
  DEPLOYED_PWA_EVIDENCE_V2_ADMISSION_GATE_NAMES,
  DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES,
  DEPLOYED_PWA_EVIDENCE_V2_CLAIM_NAMES,
  DEPLOYED_PWA_EVIDENCE_V2_POLICY_BINDINGS,
  DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS,
  DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES,
  DeployedPwaEvidenceV2VerificationError,
  verifyDeployedPwaEvidenceV2
} from "./deployed-pwa-evidence-v2-lib.mjs";
import { writeReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";
import {
  canonicalJson,
  collectArtifactEntries,
  releaseArtifactComponents,
  sha256
} from "./release-evidence-lib.mjs";

const sourceWorkspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(sourceWorkspace, "scripts", "verify-deployed-pwa-evidence-v2.mjs");
const fixturePrefix = "hakimi-deployed-pwa-v2-test-";
const releaseEvidenceId = `hre1-${"a".repeat(32)}`;
const buildVersion = "abcdef123456";
const candidateOrigin = "https://staging.hakimi.test";
const candidatePlatform = "fixture-host";
const caseId = "00000000-0000-4000-8000-000000000000";
const revisionId = "00000000-0000-4000-8000-000000000001";

function artifactMutationBoundary() {
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
  "Deployed-PWA v2 bytes are internally consistent, but trusted producers, real execution admission, and all public authorization remain absent.";

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

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeBytes(filePath, bytes) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}

async function writeJson(filePath, value) {
  await writeBytes(filePath, jsonBytes(value));
}

async function fileBinding(workspace, filePath) {
  const bytes = await readFile(filePath);
  return Object.freeze({
    path: relativePath(workspace, filePath),
    size: bytes.byteLength,
    sha256: sha256(bytes)
  });
}

async function writeExactSidecar(targetPath) {
  const bytes = await readFile(targetPath);
  await writeFile(
    `${targetPath}.sha256`,
    `${sha256(bytes)}  ${path.basename(targetPath)}\n`,
    "utf8"
  );
}

function digestReceipt(document) {
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
  manifestDigest
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
      candidateLabel: "deployed-pwa-v2-synthetic",
      descriptor,
      manifestVersion: 1,
      manifestDigest,
      buildVersion,
      builtEvidenceId: releaseEvidenceId,
      evidenceIdBound: true,
      requiredReceiptIds: ["pwa"]
    },
    toolchain: {
      node: "v24.16.0",
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
      { path: "docs/security/hosting-security-policy.json", sha256: hashes[4] },
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
    ...DEPLOYED_PWA_EVIDENCE_V2_POLICY_BINDINGS.map((binding) => binding.path),
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
    database: descriptor
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
</head><body>synthetic deployed-PWA v2</body></html>
`, "utf8");
  await writeFile(path.join(artifactRoot, "manifest.webmanifest"), "{}\n", "utf8");
  await writeFile(
    path.join(artifactRoot, "sw.js"),
    "self.addEventListener('fetch', () => undefined);\n",
    "utf8"
  );
  await writeFile(path.join(artifactRoot, "_headers"), "/*\n  Cache-Control: no-cache\n", "utf8");
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

function caseProjection() {
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

function caseCapture(projectName, capturePhase, capturedAt, projection) {
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

async function writeAttachment(workspace, filePath, role, value, raw = false) {
  await writeBytes(filePath, raw ? Buffer.from(value) : jsonBytes(value));
  return {
    role,
    ...await fileBinding(workspace, filePath)
  };
}

function bindingWithoutRole(binding) {
  return {
    path: binding.path,
    size: binding.size,
    sha256: binding.sha256
  };
}

async function materializeBrowserReceipt({
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
  serviceWorkerBytes,
  serviceWorkerSha256,
  artifactSetDigest
}) {
  const browserRoot = path.join(receiptsRoot, projectName);
  const routes = routeObservations(projectName);
  const controller = controllerIdentity(serviceWorkerSha256);
  const projection = caseProjection();
  const projectionDigest = sha256(canonicalJson(projection));
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
  for (const role of DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES) {
    const input = attachmentInputs.get(role);
    attachments.push(await writeAttachment(
      workspace,
      path.join(browserRoot, `${role}.${input.raw ? "bin" : "json"}`),
      role,
      input.value,
      input.raw === true
    ));
  }
  const before = attachments.find((attachment) => attachment.role === "case-revision-before");
  const after = attachments.find((attachment) => attachment.role === "case-revision-after");
  const document = {
    schemaVersion: 2,
    receiptType: "deployed_pwa_browser_runtime_receipt_candidate_v2",
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

async function persistEvidence(fixture, { recomputeIdentity = true } = {}) {
  if (recomputeIdentity) {
    Object.assign(
      fixture.evidence,
      computeDeployedPwaEvidenceV2Identity(fixture.evidence)
    );
  }
  await writeJson(fixture.inputPath, fixture.evidence);
  await writeExactSidecar(fixture.inputPath);
}

async function createFixture() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), fixturePrefix));
  const artifactRoot = path.join(workspace, "synthetic", "artifact");
  const receiptsRoot = path.join(workspace, "synthetic", "receipts");
  const privateRoot = path.join(workspace, "synthetic", "private");
  const inputPath = path.join(privateRoot, "deployed-pwa-evidence-v2.json");
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
  assert.equal(artifactSetDigest, lockResult.lock.artifactSetDigest);
  const releasePath = path.join(artifactRoot, "release-evidence.json");
  const releaseDocument = releaseEvidenceDocument({
    artifactRoot: relativePath(workspace, artifactRoot),
    artifactEntries,
    artifactSetDigest,
    components,
    identityLock: lockBinding,
    manifestDigest
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
    schemaVersion: 2,
    receiptType: "deployed_pwa_host_receipt_candidate_v2",
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

  const serviceWorkerBytes = await readFile(path.join(artifactRoot, "sw.js"));
  const edge = await createBrowserReceipt({
    workspace,
    receiptsRoot,
    projectName: "msedge",
    browserChannel: "msedge",
    actualProduct: "Edg/151.0.7922.34",
    profileBindingDigest: sha256("msedge-profile"),
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
    serviceWorkerBytes,
    serviceWorkerSha256: components.serviceWorker.sha256,
    artifactSetDigest
  });

  const policyBindings = [];
  for (const binding of DEPLOYED_PWA_EVIDENCE_V2_POLICY_BINDINGS) {
    policyBindings.push({
      role: binding.role,
      ...await fileBinding(workspace, path.join(workspace, binding.path))
    });
  }
  const evidence = {
    schemaVersion: 2,
    evidenceType: "deployed_pwa_semantic_candidate",
    evidenceId: `hpwa2-${"0".repeat(32)}`,
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
      DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES.map((name) => [name, true])
    ),
    admissionGates: Object.fromEntries(
      DEPLOYED_PWA_EVIDENCE_V2_ADMISSION_GATE_NAMES.map((name) => [name, false])
    ),
    claims: Object.fromEntries(
      DEPLOYED_PWA_EVIDENCE_V2_CLAIM_NAMES.map((name) => [name, false])
    ),
    failures: [{
      code: "DEPLOYED_PWA_V2_SEMANTICALLY_CONSISTENT_NOT_ADMITTED",
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
  await persistEvidence(fixture);
  return fixture;
}

async function cleanupFixture(fixture) {
  const resolvedTmp = path.resolve(os.tmpdir());
  const resolvedWorkspace = path.resolve(fixture.workspace);
  assert.equal(path.dirname(resolvedWorkspace), resolvedTmp);
  assert.match(path.basename(resolvedWorkspace), new RegExp(`^${fixturePrefix}`));
  await rm(resolvedWorkspace, { recursive: true, force: true });
}

async function withFixture(callback) {
  const fixture = await createFixture();
  try {
    return await callback(fixture);
  } finally {
    await cleanupFixture(fixture);
  }
}

async function rejectCode(action, expectedCode) {
  await assert.rejects(
    action,
    (error) => error instanceof DeployedPwaEvidenceV2VerificationError
      && error.code === expectedCode
  );
}

async function readBrowserDocument(fixture, browserKey) {
  return JSON.parse(await readFile(fixture.browserReceiptPaths[browserKey], "utf8"));
}

async function replaceAttachment(fixture, document, role, value, raw = false) {
  const index = document.attachments.findIndex((attachment) => attachment.role === role);
  assert.notEqual(index, -1);
  const current = document.attachments[index];
  const absolute = path.join(fixture.workspace, current.path);
  document.attachments[index] = await writeAttachment(
    fixture.workspace,
    absolute,
    role,
    value,
    raw
  );
}

async function rewriteBrowser(fixture, browserKey, mutate) {
  const document = await readBrowserDocument(fixture, browserKey);
  await mutate(document);
  const before = document.attachments.find((attachment) => attachment.role === "case-revision-before");
  const after = document.attachments.find((attachment) => attachment.role === "case-revision-after");
  document.caseRevision.before = bindingWithoutRole(before);
  document.caseRevision.after = bindingWithoutRole(after);
  document.rawAttachmentSetDigest = sha256(canonicalJson(document.attachments));
  await materializeBrowserReceipt({
    workspace: fixture.workspace,
    receiptPath: fixture.browserReceiptPaths[browserKey],
    envelope: fixture.evidence.receipts[browserKey],
    document
  });
  await persistEvidence(fixture);
}

async function rewriteFormalReceipt(fixture, mutate) {
  const binding = fixture.evidence.artifactIdentity.formalReceipt;
  const receiptPath = path.join(fixture.workspace, binding.path);
  const document = JSON.parse(await readFile(receiptPath, "utf8"));
  await mutate(document);
  await writeJson(receiptPath, document);
  Object.assign(binding, await fileBinding(fixture.workspace, receiptPath));
  await persistEvidence(fixture);
}

async function attachDeploymentReceipt(fixture) {
  const receiptPath = path.join(fixture.receiptsRoot, "provider-deployment.json");
  const document = {
    schemaVersion: 2,
    receiptType: "deployed_pwa_provider_deployment_receipt_candidate_v2",
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
  await persistEvidence(fixture);
  return { receiptPath, document };
}

test("complete synthetic candidate is only semantically consistent and not admitted", async () => {
  await withFixture(async (fixture) => {
    const result = await verifyDeployedPwaEvidenceV2({
      cwd: fixture.workspace,
      ...fixture.args
    });
    assert.equal(result.status, "not_admitted");
    assert.equal(result.executionAdmission, "closed_missing_https_origin");
    assert.equal(result.receiptTrustClass, "untrusted_candidate_envelopes");
    assert.equal(result.semanticConsistencyVerified, true);
    assert.equal(result.strictGatePassed, false);
    assert.equal(result.deployedPwaEngineeringVerified, false);
    assert.deepEqual(result.artifactMutationBoundary, artifactMutationBoundary());
    assert.equal(Object.values(result.gates.semantic).every((value) => value === true), true);
    assert.equal(Object.values(result.gates.admission).every((value) => value === false), true);
    assert.equal(Object.values(result.claims).every((value) => value === false), true);
    assert.equal(result.attempts.formalVerifierAttempted, false);
    assert.equal(result.attempts.gitAttempted, false);
    assert.equal(result.attempts.networkAttempted, false);
    assert.equal(result.attempts.browserAttempted, false);
    assert.equal(result.attempts.deploymentAttempted, false);
    assert.equal(result.errors[0].code, "DEPLOYED_PWA_V2_SEMANTICALLY_CONSISTENT_NOT_ADMITTED");

    const cli = spawnSync(process.execPath, [
      cliPath,
      "--input", fixture.args.inputPath,
      "--artifact-root", fixture.args.artifactRoot,
      "--receipts-root", fixture.args.receiptsRoot,
      "--private-root", fixture.args.privateRoot
    ], {
      cwd: fixture.workspace,
      encoding: "utf8",
      windowsHide: true
    });
    assert.equal(cli.status, 1);
    assert.equal(cli.stderr, "");
    const cliResult = JSON.parse(cli.stdout);
    assert.equal(cliResult.status, "not_admitted");
    assert.equal(cliResult.receiptTrustClass, "untrusted_candidate_envelopes");
    assert.equal(cliResult.semanticConsistencyVerified, true);
    assert.equal(cliResult.strictGatePassed, false);
    assert.deepEqual(cliResult.artifactMutationBoundary, artifactMutationBoundary());
  });
});

test("internally bound provider deployment candidate remains offline and not admitted", async () => {
  await withFixture(async (fixture) => {
    await attachDeploymentReceipt(fixture);

    const result = await verifyDeployedPwaEvidenceV2({
      cwd: fixture.workspace,
      ...fixture.args
    });

    assert.equal(result.status, "not_admitted");
    assert.equal(result.executionAdmission, "closed_missing_https_origin");
    assert.equal(result.receiptTrustClass, "untrusted_candidate_envelopes");
    assert.equal(result.semanticConsistencyVerified, true);
    assert.equal(result.strictGatePassed, false);
    assert.equal(result.deployedPwaEngineeringVerified, false);
    assert.equal(Object.values(result.gates.admission).every((value) => value === false), true);
    assert.equal(Object.values(result.claims).every((value) => value === false), true);
    assert.equal(result.claims.deploymentOperationObserved, false);
    assert.equal(result.claims.externalDeploymentExecutionAuthorized, false);
    assert.equal(result.claims.publicDeploymentAuthorized, false);
    assert.equal(result.attempts.networkAttempted, false);
    assert.equal(result.attempts.browserAttempted, false);
    assert.equal(result.attempts.deploymentAttempted, false);
  });
});

test("provider deployment candidate cannot rebind provider away from scoped candidate", async () => {
  await withFixture(async (fixture) => {
    const { receiptPath, document } = await attachDeploymentReceipt(fixture);
    const binding = fixture.evidence.receipts.deployment;

    document.provider = "other-fixture-host";
    document.receiptDigest = digestReceipt(document);
    await writeJson(receiptPath, document);
    Object.assign(
      binding,
      await fileBinding(fixture.workspace, receiptPath),
      {
        provider: document.provider,
        receiptDigest: document.receiptDigest
      }
    );
    await persistEvidence(fixture);

    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_DEPLOYMENT_RECEIPT_MISMATCH"
    );
  });
});

test("single-field policy opening fails before candidate roots are admitted", async () => {
  await withFixture(async (fixture) => {
    const policyPath = path.join(
      fixture.workspace,
      "docs/release/deployed-pwa-evidence-policy.v2.json"
    );
    const policy = JSON.parse(await readFile(policyPath, "utf8"));
    policy.executionAdmission.canonicalHttpsOriginConfigured = true;
    await writeJson(policyPath, policy);
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_POLICY_INVALID"
    );
  });
});

test("duplicate raw JSON keys are rejected even with a refreshed byte sidecar", async () => {
  await withFixture(async (fixture) => {
    const source = await readFile(fixture.inputPath, "utf8");
    const duplicate = source.replace(
      '  "schemaVersion": 2,',
      '  "schemaVersion": 2,\n  "schemaVersion": 2,'
    );
    assert.notEqual(duplicate, source);
    await writeFile(fixture.inputPath, duplicate, "utf8");
    await writeExactSidecar(fixture.inputPath);
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_JSON_DUPLICATE_KEY"
    );
  });
});

test("a hard-linked file inside an evidence root is rejected", async () => {
  await withFixture(async (fixture) => {
    await link(
      path.join(fixture.artifactRoot, "sw.js"),
      path.join(fixture.artifactRoot, "sw-hardlink.js")
    );
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_TREE_HARDLINK"
    );
  });
});

test("a junction-backed evidence root is rejected", async (t) => {
  await withFixture(async (fixture) => {
    const realReceipts = `${fixture.receiptsRoot}-real`;
    await rename(fixture.receiptsRoot, realReceipts);
    try {
      await symlink(realReceipts, fixture.receiptsRoot, "junction");
    } catch (error) {
      if (error?.code === "EPERM" || error?.code === "EACCES") {
        t.skip(`junction creation is not permitted on this host: ${error.code}`);
        return;
      }
      throw error;
    }
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_ROOT_ALIAS"
    );
  });
});

test("a preflighted evidence root cannot be rebound through a junction", async (t) => {
  await withFixture(async (fixture) => {
    const roots = await assertIsolatedDeployedPwaEvidenceV2Roots({
      workspace: fixture.workspace,
      inputPath: fixture.inputPath,
      artifactRoot: fixture.artifactRoot,
      receiptsRoot: fixture.receiptsRoot,
      privateRoot: fixture.privateRoot
    });
    const movedReceipts = `${fixture.receiptsRoot}-moved`;
    await rename(fixture.receiptsRoot, movedReceipts);
    try {
      await symlink(movedReceipts, fixture.receiptsRoot, "junction");
    } catch (error) {
      if (error?.code === "EPERM" || error?.code === "EACCES") {
        await rename(movedReceipts, fixture.receiptsRoot);
        t.skip(`junction creation is not permitted on this host: ${error.code}`);
        return;
      }
      throw error;
    }
    try {
      await rejectCode(
        () => assertDeployedPwaEvidenceV2RootsStillLocked(roots),
        "DEPLOYED_PWA_V2_ROOT_REBOUND"
      );
    } finally {
      await rm(fixture.receiptsRoot, { recursive: true, force: true });
      await rename(movedReceipts, fixture.receiptsRoot);
    }
  });
});

test("browser attachment roles cannot reuse one bound receipt path", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const beforeIndex = document.attachments.findIndex(
        (attachment) => attachment.role === "case-revision-before"
      );
      const afterIndex = document.attachments.findIndex(
        (attachment) => attachment.role === "case-revision-after"
      );
      assert.notEqual(beforeIndex, -1);
      assert.notEqual(afterIndex, -1);
      document.attachments[afterIndex] = {
        ...document.attachments[beforeIndex],
        role: "case-revision-after"
      };
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_RECEIPT_PATH_ALIAS"
    );
  });
});

test("dot-segment attachment alias cannot disguise one bound file as two paths", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const beforeIndex = document.attachments.findIndex(
        (attachment) => attachment.role === "case-revision-before"
      );
      const afterIndex = document.attachments.findIndex(
        (attachment) => attachment.role === "case-revision-after"
      );
      assert.notEqual(beforeIndex, -1);
      assert.notEqual(afterIndex, -1);
      const before = document.attachments[beforeIndex];
      const aliasPath = path.posix.join(path.posix.dirname(before.path), ".", path.posix.basename(before.path));
      const explicitDotAlias = `${path.posix.dirname(before.path)}/./${path.posix.basename(before.path)}`;
      assert.equal(aliasPath, before.path);
      assert.notEqual(explicitDotAlias, before.path);
      document.attachments[afterIndex] = {
        ...before,
        role: "case-revision-after",
        path: explicitDotAlias
      };
    });
    await assert.rejects(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      (error) => error instanceof DeployedPwaEvidenceV2VerificationError
        && [
          "DEPLOYED_PWA_V2_INPUT_SCHEMA_INVALID",
          "DEPLOYED_PWA_V2_RECEIPT_PATH_ALIAS"
        ].includes(error.code)
    );
  });
});

test("Release Evidence and sidecar must remain at the artifact root", async () => {
  await withFixture(async (fixture) => {
    const binding = fixture.evidence.artifactIdentity.releaseEvidence;
    const currentReleasePath = path.join(fixture.workspace, binding.path);
    const currentSidecarPath = path.join(fixture.workspace, binding.sidecarPath);
    const nestedRoot = path.join(fixture.artifactRoot, "nested");
    const nestedReleasePath = path.join(nestedRoot, "release-evidence.json");
    const nestedSidecarPath = `${nestedReleasePath}.sha256`;
    await mkdir(nestedRoot, { recursive: true });
    await rename(currentReleasePath, nestedReleasePath);
    await rename(currentSidecarPath, nestedSidecarPath);
    Object.assign(binding, await fileBinding(fixture.workspace, nestedReleasePath));
    const nestedSidecarBinding = await fileBinding(fixture.workspace, nestedSidecarPath);
    binding.sidecarPath = nestedSidecarBinding.path;
    binding.sidecarSize = nestedSidecarBinding.size;
    binding.sidecarSha256 = nestedSidecarBinding.sha256;
    await persistEvidence(fixture);
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_RELEASE_EVIDENCE_PATH_INVALID"
    );
  });
});

test("canonical Evidence digest cannot be replaced while refreshing the raw sidecar", async () => {
  await withFixture(async (fixture) => {
    fixture.evidence.evidenceDigest = "f".repeat(64);
    await persistEvidence(fixture, { recomputeIdentity: false });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_EVIDENCE_IDENTITY_MISMATCH"
    );
  });
});

test("formal engineering receipt cannot assert public-release authorization", async () => {
  await withFixture(async (fixture) => {
    await rewriteFormalReceipt(fixture, async (document) => {
      document.claims.publicReleaseAuthorized = true;
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_FORMAL_RECEIPT_BINDING_MISMATCH"
    );
  });
});

test("formal receipt cannot promote endpoint equality into ABA exclusion", async () => {
  await withFixture(async (fixture) => {
    await rewriteFormalReceipt(fixture, async (document) => {
      document.artifacts.mutationBoundary.abaMutationExclusionClaimed = true;
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_FORMAL_RECEIPT_BINDING_MISMATCH"
    );
  });
});

test("browser tuple in the bound receipt cannot diverge from its Edge envelope", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      document.actualProduct = "Chrome/151.0.7922.34";
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_BROWSER_RECEIPT_MISMATCH"
    );
  });
});

test("Edge and Chrome cannot reuse one fresh-profile identity", async () => {
  await withFixture(async (fixture) => {
    const edgeDocument = await readBrowserDocument(fixture, "edge");
    await rewriteBrowser(fixture, "chrome", async (document) => {
      document.profileBindingDigest = edgeDocument.profileBindingDigest;
      await replaceAttachment(fixture, document, "profile-preflight", {
        schemaVersion: 1,
        projectName: "chrome",
        profileBindingDigest: edgeDocument.profileBindingDigest,
        directoryExistedBeforeRun: false,
        createdByRunner: true
      });
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_RECEIPT_ORDER_OR_PROFILE_INVALID"
    );
  });
});

test("controller source bytes must equal remote and artifact Service Worker bytes", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      await replaceAttachment(
        fixture,
        document,
        "controller-source",
        Buffer.from("synthetic mismatched controller source\n", "utf8"),
        true
      );
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_SERVICE_WORKER_BYTES_MISMATCH"
    );
  });
});

test("offline route cannot weaken its CDP fromServiceWorker observation", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      document.routeObservations[1].cdpFromServiceWorkerRecorded = false;
      await replaceAttachment(fixture, document, "network-events", {
        schemaVersion: 1,
        recordType: "deployed_pwa_cdp_network_events_v1",
        projectName: "msedge",
        routeObservations: document.routeObservations
      });
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_ROUTE_SEMANTICS_MISMATCH"
    );
  });
});

test("case/revision projection must remain canonically equal before and after offline start", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const changedProjection = caseProjection();
      changedProjection.revisionRecordSha256 = sha256("changed-synthetic-revision-record");
      const changedCapture = caseCapture(
        "msedge",
        "after_offline_cold_start",
        "2026-08-26T00:03:16.000Z",
        changedProjection
      );
      await replaceAttachment(fixture, document, "case-revision-after", changedCapture);
      document.caseRevision.afterDigest = sha256(canonicalJson(changedProjection));
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_CASE_PROJECTION_MISMATCH"
    );
  });
});

test("before and after case captures cannot reuse one capture identity", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const beforeBinding = document.attachments.find(
        (attachment) => attachment.role === "case-revision-before"
      );
      const afterBinding = document.attachments.find(
        (attachment) => attachment.role === "case-revision-after"
      );
      assert.ok(beforeBinding);
      assert.ok(afterBinding);
      const beforeCapture = JSON.parse(await readFile(
        path.join(fixture.workspace, beforeBinding.path),
        "utf8"
      ));
      const afterCapture = JSON.parse(await readFile(
        path.join(fixture.workspace, afterBinding.path),
        "utf8"
      ));
      afterCapture.captureId = beforeCapture.captureId;
      await replaceAttachment(
        fixture,
        document,
        "case-revision-after",
        afterCapture
      );
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV2({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V2_CASE_PROJECTION_MISMATCH"
    );
  });
});

test("synthetic fixture freezes the exact route and attachment vocabularies", () => {
  assert.deepEqual(DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS, [
    "online-root",
    "offline-settings-data",
    "offline-case-revision",
    "offline-help-cold-start",
    "offline-help-reload"
  ]);
  assert.deepEqual(DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES, [
    "browser-version",
    "profile-preflight",
    "network-events",
    "controller-script-meta",
    "controller-source",
    "remote-service-worker-body",
    "case-revision-before",
    "case-revision-after"
  ]);
});
