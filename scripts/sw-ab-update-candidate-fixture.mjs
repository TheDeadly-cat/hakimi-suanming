import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalJson, computeEvidenceId, sha256 } from "./release-evidence-lib.mjs";
import {
  buildReleaseBrowserResultSummary,
  CROSS_SCHEMA_V13_V16_RECEIPT_ID,
  CROSS_SCHEMA_V13_V16_SPEC_PATH,
  CROSS_SCHEMA_V13_V16_TEST_TITLES,
  isReleaseBrowserCompletionReceiptId
} from "../apps/web/playwright.release-browser-result.ts";
import {
  computeSwAbUpdateCandidateArtifactIdentityDigest,
  computeSwAbUpdateCandidateAttachmentDigest,
  computeSwAbUpdateCandidateAttemptMarkerDigest,
  computeSwAbUpdateCandidateBrowserReceiptDigest,
  computeSwAbUpdateCandidateClientChallengeResponseDigest,
  computeSwAbUpdateCandidateDeploymentLedgerDigest,
  computeSwAbUpdateCandidateEvidenceDigest,
  computeSwAbUpdateCandidateProviderDeploymentDigest,
  SW_AB_UPDATE_CANDIDATE_AUTHORITY,
  SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS,
  SW_AB_UPDATE_CANDIDATE_CAPABILITIES,
  SW_AB_UPDATE_CANDIDATE_DEPLOYMENT_EVENT_IDS,
  SW_AB_UPDATE_CANDIDATE_GOVERNANCE_BINDINGS,
  SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES,
  SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY,
  SW_AB_UPDATE_CANDIDATE_TIMELINE,
  verifySwAbUpdateCandidate
} from "./sw-ab-update-candidate-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testParent = path.join(workspaceRoot, "tmp", "sw-ab-update-candidate-contract-tests");
const ORIGIN = "https://pwa.hakimi.cn";

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function digest(seed) {
  return sha256(String(seed));
}

export function iso(second, millisecond = 0) {
  return new Date(Date.UTC(2026, 7, 27, 0, 0, second, millisecond)).toISOString();
}

export function attachmentReference(attachment) {
  return {
    role: attachment.role,
    path: attachment.path,
    size: attachment.size,
    sha256: attachment.sha256,
    digest: attachment.digest
  };
}

export function artifactReference(artifact) {
  return {
    label: artifact.label,
    releaseEvidenceId: artifact.releaseEvidenceId,
    buildVersion: artifact.buildVersion,
    artifactIdentityDigest: artifact.artifactIdentityDigest,
    artifactSetDigest: artifact.artifactSetDigest,
    artifactRootInventoryDigest: artifact.artifactRoot.inventoryDigest,
    identityLockDigest: artifact.identityLock.digest,
    releaseEvidenceDigest: artifact.releaseEvidence.digest,
    remoteArtifactCaptureDigest: artifact.remoteArtifactCapture.digest,
    serviceWorkerSha256: artifact.serviceWorkerSha256
  };
}

function releaseBrowserSummary(receiptId) {
  if (receiptId === CROSS_SCHEMA_V13_V16_RECEIPT_ID) {
    return buildReleaseBrowserResultSummary({
      receiptId,
      fullResultStatus: "passed",
      expectedTestsPerProject: 13,
      observations: SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS.flatMap((projectName) =>
        CROSS_SCHEMA_V13_V16_TEST_TITLES.map((title) => ({
          projectName,
          title,
          file: CROSS_SCHEMA_V13_V16_SPEC_PATH,
          expectedStatus: "passed",
          outcome: "expected",
          resultStatuses: ["passed"],
          retryIndexes: [0]
        }))
      )
    });
  }
  const expectedTestsPerProject = {
    backup: 4,
    boot: 8,
    pwa: 1,
    "web-v1-flow": 1
  }[receiptId];
  const project = (projectName) => ({
    projectName,
    discovered: expectedTestsPerProject,
    passed: expectedTestsPerProject,
    skipped: 0,
    failed: 0,
    timedOut: 0,
    interrupted: 0,
    unexpected: 0,
    flaky: 0,
    nonPassedExpectedStatus: 0,
    attempts: expectedTestsPerProject
  });
  return {
    schemaVersion: 1,
    summaryType: "release_browser_test_summary",
    receiptId,
    expectedTestsPerProject,
    expectedProjectNames: ["msedge", "chrome"],
    fullResultStatus: "passed",
    strictGatePassed: true,
    unexpectedProjectNames: [],
    errors: [],
    projects: [project("msedge"), project("chrome")]
  };
}

export async function writeJson(filePath, document) {
  const bytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
  await writeFile(filePath, bytes);
  return bytes;
}

async function createArtifactRoot(root, label) {
  await mkdir(root, { recursive: true });
  const bodies = new Map([
    ["index.html", Buffer.from(`<html data-generation="${label}">Hakimi ${label}</html>\n`)],
    ["manifest.webmanifest", Buffer.from(`${JSON.stringify({
      name: `Hakimi ${label}`,
      start_url: "/",
      display: "standalone"
    })}\n`)],
    ["sw.js", Buffer.from(`self.__HAKIMI_GENERATION__ = "${label}";\n`)],
    ["_headers", Buffer.from("/*\n  Cache-Control: no-cache\n")]
  ]);
  for (const [relative, bytes] of bodies) await writeFile(path.join(root, relative), bytes);
  const files = [];
  for (const [relative, bytes] of [...bodies].sort(([left], [right]) => left.localeCompare(right))) {
    files.push({
      path: relative,
      urlPath: relative === "index.html" ? "/" : `/${relative}`,
      size: bytes.byteLength,
      sha256: sha256(bytes)
    });
  }
  const rootStat = await lstat(root, { bigint: true });
  const rootRealPath = path.resolve(await realpath(root));
  const comparableRealPath = process.platform === "win32" ? rootRealPath.toLowerCase() : rootRealPath;
  const inventoryDigest = sha256(canonicalJson(files));
  const artifactSetDigest = sha256(canonicalJson(files.map(({ path: filePath, size, sha256: fileSha }) => ({
    path: filePath,
    size,
    sha256: fileSha
  }))));
  return { bodies, files, rootStat, comparableRealPath, inventoryDigest, artifactSetDigest };
}

export async function createFixture(t) {
  const workspaceRootStat = await lstat(workspaceRoot, { bigint: true });
  const workspaceRootRealPath = path.resolve(await realpath(workspaceRoot));
  assert.ok(
    workspaceRootStat.isDirectory()
      && !workspaceRootStat.isSymbolicLink()
      && comparablePath(workspaceRootRealPath) === comparablePath(workspaceRoot)
  );

  const tmpRoot = path.join(workspaceRoot, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const tmpRootStat = await lstat(tmpRoot, { bigint: true });
  const tmpRootRealPath = path.resolve(await realpath(tmpRoot));
  assert.ok(
    tmpRootStat.isDirectory()
      && !tmpRootStat.isSymbolicLink()
      && comparablePath(tmpRootRealPath)
        === comparablePath(path.join(workspaceRootRealPath, "tmp"))
  );

  await mkdir(testParent, { recursive: true });
  const testParentStat = await lstat(testParent, { bigint: true });
  const testParentRealPath = path.resolve(await realpath(testParent));
  const expectedTestParentRealPath = path.join(
    workspaceRootRealPath,
    "tmp",
    "sw-ab-update-candidate-contract-tests"
  );
  assert.ok(
    testParentStat.isDirectory()
      && !testParentStat.isSymbolicLink()
      && comparablePath(testParentRealPath) === comparablePath(expectedTestParentRealPath)
      && path.relative(workspaceRootRealPath, testParentRealPath)
        === path.join("tmp", "sw-ab-update-candidate-contract-tests")
  );

  const fixtureRoot = path.join(testParent, randomBytes(24).toString("hex"));
  const attachmentsRoot = path.join(fixtureRoot, "attachments");
  const privateRoot = path.join(fixtureRoot, "private");
  const artifactARoot = path.join(fixtureRoot, "artifact-a");
  const artifactBRoot = path.join(fixtureRoot, "artifact-b");
  await mkdir(fixtureRoot);
  const fixtureRootStat = await lstat(fixtureRoot, { bigint: true });
  const fixtureRootRealPath = path.resolve(await realpath(fixtureRoot));
  const cleanupRelative = path.relative(testParentRealPath, fixtureRootRealPath);
  assert.ok(
    fixtureRootStat.isDirectory()
      && !fixtureRootStat.isSymbolicLink()
      && cleanupRelative !== ""
      && !path.isAbsolute(cleanupRelative)
      && cleanupRelative !== ".."
      && !cleanupRelative.startsWith(`..${path.sep}`)
  );
  t.after(async () => {
    const currentStat = await lstat(fixtureRoot, { bigint: true });
    const currentRealPath = path.resolve(await realpath(fixtureRoot));
    assert.ok(
      currentStat.isDirectory()
        && !currentStat.isSymbolicLink()
        && currentStat.dev === fixtureRootStat.dev
        && currentStat.ino === fixtureRootStat.ino
        && currentStat.birthtimeNs === fixtureRootStat.birthtimeNs
        && currentRealPath === fixtureRootRealPath
    );
    await rm(fixtureRoot, { recursive: true, force: true });
  });
  await Promise.all([
    mkdir(attachmentsRoot, { recursive: true }),
    mkdir(privateRoot, { recursive: true })
  ]);
  const [rootA, rootB] = await Promise.all([
    createArtifactRoot(artifactARoot, "A"),
    createArtifactRoot(artifactBRoot, "B")
  ]);
  const runId = `run-${randomBytes(32).toString("hex")}`;
  const attemptId = `attempt-${randomBytes(32).toString("hex")}`;
  const attachments = [];
  const attachmentEnvelopes = new Map();
  const releaseDecisions = JSON.parse(await readFile(
    path.join(workspaceRoot, "docs/release/web-v1-release-decisions.json"),
    "utf8"
  ));
  const policyReceiptCommands = releaseDecisions.releaseEvidence.defaultV13RequiredReceiptCommands;
  const policyReceiptIds = Object.keys(policyReceiptCommands).sort();
  const releasePolicyPaths = [
    "docs/release/web-v1-release-decisions.json",
    "docs/release/release-generation-history.json",
    "docs/security/hosting-security-policy.json",
    "docs/release/release-evidence.schema.json"
  ];
  const releasePolicyFiles = await Promise.all(releasePolicyPaths.map(async (policyPath) => ({
    path: policyPath,
    sha256: sha256(await readFile(path.join(workspaceRoot, ...policyPath.split("/"))))
  })));

  const addAttachment = async (browserProject, role, payload) => {
    const directory = browserProject ?? "shared";
    const relative = `${directory}/${role}.json`;
    const absolute = path.join(attachmentsRoot, ...relative.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    const envelope = {
      schemaVersion: 1,
      attachmentType: "sw_ab_update_candidate_attachment_v1",
      role,
      browserProject,
      runId,
      attemptId,
      payload,
      payloadDigest: sha256(canonicalJson(payload))
    };
    const bytes = await writeJson(absolute, envelope);
    const attachment = {
      role,
      browserProject,
      runId,
      attemptId,
      path: relative,
      size: bytes.byteLength,
      sha256: sha256(bytes),
      digest: "0".repeat(64)
    };
    attachment.digest = computeSwAbUpdateCandidateAttachmentDigest(attachment);
    attachments.push(attachment);
    attachmentEnvelopes.set(`${browserProject ?? "shared"}\0${role}`, envelope);
    return attachment;
  };

  const artifactInputs = { A: rootA, B: rootB };
  const artifactRoots = { A: artifactARoot, B: artifactBRoot };
  const artifacts = {};
  const remoteCapturePayloads = {};
  for (const label of ["A", "B"]) {
    const lower = label.toLowerCase();
    const input = artifactInputs[label];
    const releaseSource = {
      repository: null,
      commit: digest(`commit-${label}`).slice(0, 40),
      branch: "fixture",
      dirty: false,
      untrackedSourceFileCount: 0,
      sourceTreeDigest: digest(`source-tree-${label}`),
      packageLockSha256: digest(`lockfile-${label}`)
    };
    const releaseEvidenceId = computeEvidenceId({
      gitCommit: releaseSource.commit,
      sourceTreeDigest: releaseSource.sourceTreeDigest,
      lockfileDigest: releaseSource.packageLockSha256,
      channel: "default-v13"
    });
    const buildVersion = digest(`build-${label}`).slice(0, 12);
    const lockDocument = {
      schemaVersion: 1,
      recordType: "release_artifact_identity_lock",
      channel: "default-v13",
      evidenceId: releaseEvidenceId,
      createdAt: iso(label === "A" ? 1 : 2),
      artifactRoot: path.relative(workspaceRoot, artifactRoots[label]).replaceAll("\\", "/"),
      descriptor: {
        protocolVersion: 1,
        dbGeneration: "legacy-v13",
        databaseName: "hakimi-bazi-research",
        targetSchema: 13,
        minReadableSchema: 13,
        maxReadableSchema: 13,
        migrationId: null,
        acceptedCommittedMigrationIds: [null],
        sourceGeneration: null,
        sourceDatabaseName: null,
        sourceSchema: null
      },
      manifestDigest: digest(`manifest-${label}`),
      buildVersion,
      fileCount: input.files.length,
      artifactSetDigest: input.artifactSetDigest,
      files: input.files.map(({ path: filePath, size, sha256: fileSha }) => ({
        path: filePath,
        size,
        sha256: fileSha
      })),
      lockDigest: "0".repeat(64)
    };
    const unsignedLock = structuredClone(lockDocument);
    delete unsignedLock.lockDigest;
    lockDocument.lockDigest = sha256(canonicalJson(unsignedLock));
    const identityLockAttachment = await addAttachment(
      null,
      `artifact-${lower}-identity-lock`,
      { document: lockDocument }
    );
    const component = (componentPath) => structuredClone(
      lockDocument.files.find((entry) => entry.path === componentPath)
    );
    const releaseEvidence = {
      schemaVersion: 1,
      evidenceType: "engineering_release_evidence",
      evidenceId: releaseEvidenceId,
      generatedAt: iso(label === "A" ? 3 : 4),
      source: structuredClone(releaseSource),
      release: {
        channel: "default-v13",
        candidateLabel: `sw-ab-${lower}-fixture`,
        descriptor: structuredClone(lockDocument.descriptor),
        manifestVersion: 1,
        manifestDigest: lockDocument.manifestDigest,
        buildVersion,
        builtEvidenceId: releaseEvidenceId,
        evidenceIdBound: true,
        requiredReceiptIds: policyReceiptIds
      },
      toolchain: {
        node: process.version,
        npm: "11.13.0",
        platform: process.platform,
        arch: process.arch,
        osRelease: "fixture",
        browsers: {
          edge: "Microsoft Edge 140.0.1000.1",
          chrome: "Google Chrome 140.0.1000.2"
        }
      },
      policyFiles: structuredClone(releasePolicyFiles),
      testReceipts: policyReceiptIds.map((receiptId, receiptIndex) => ({
        id: receiptId,
        evidenceId: releaseEvidenceId,
        status: "passed",
        exitCode: 0,
        command: structuredClone(policyReceiptCommands[receiptId]),
        startedAt: iso(1, receiptIndex + 1),
        completedAt: iso(2, receiptIndex + 1),
        durationMs: 1000,
        browserResultSummary: isReleaseBrowserCompletionReceiptId(receiptId)
          ? {
              path: `fixture/${lower}-${receiptId}-browser-summary.json`,
              sha256: digest(`browser-summary-${label}-${receiptId}`),
              summary: releaseBrowserSummary(receiptId)
            }
          : null,
        path: `fixture/${lower}-${receiptId}-receipt.json`,
        sha256: digest(`receipt-${label}-${receiptId}`)
      })),
      artifacts: {
        root: lockDocument.artifactRoot,
        count: lockDocument.files.length,
        artifactSetDigest: input.artifactSetDigest,
        identityLock: {
          path: identityLockAttachment.path,
          sha256: identityLockAttachment.sha256,
          lockDigest: lockDocument.lockDigest,
          artifactSetDigest: input.artifactSetDigest,
          verified: true
        },
        mutationBoundary: {
          schemaVersion: 1,
          boundaryType: "release_artifact_endpoint_snapshot_boundary_v1",
          coveredReceiptIds: ["backup", "boot", "pwa", "web-v1-flow"],
          endpointSnapshotsMatched: true,
          verificationScope: "endpoint_snapshots_only_no_interval_mutation_epoch",
          mutationEpochCapability: "absent_schema13",
          intervalMutationExclusionClaimed: false,
          abaMutationExclusionClaimed: false
        },
        components: {
          applicationShell: component("index.html"),
          pwaManifest: component("manifest.webmanifest"),
          serviceWorker: component("sw.js"),
          hostingHeaders: component("_headers")
        },
        files: structuredClone(lockDocument.files)
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
    const remoteEntries = input.files.map((entry) => {
      const body = input.bodies.get(entry.path);
      return {
        path: entry.path,
        url: `${ORIGIN}${entry.urlPath}`,
        status: 200,
        redirectCount: 0,
        contentEncoding: "identity",
        size: body.byteLength,
        sha256: sha256(body),
        bodyBase64: body.toString("base64")
      };
    });
    const remoteCapture = {
      label,
      origin: ORIGIN,
      artifactSetDigest: input.artifactSetDigest,
      capturedAt: iso(label === "A" ? 1 : 22, label === "A" ? 0 : 500),
      entries: remoteEntries,
      captureDigest: "0".repeat(64)
    };
    remoteCapture.captureDigest = sha256(canonicalJson({
      label,
      origin: ORIGIN,
      artifactSetDigest: input.artifactSetDigest,
      capturedAt: remoteCapture.capturedAt,
      entries: remoteEntries
    }));
    remoteCapturePayloads[label] = remoteCapture;
    const releaseEvidenceAttachment = await addAttachment(
      null,
      `artifact-${lower}-release-evidence`,
      { document: releaseEvidence }
    );
    const remoteAttachment = await addAttachment(
      null,
      `artifact-${lower}-remote-artifact-capture`,
      remoteCapture
    );
    const artifact = {
      label,
      releaseIdentity: structuredClone(SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY),
      releaseEvidenceId,
      buildVersion,
      artifactIdentityDigest: "0".repeat(64),
      artifactSetDigest: input.artifactSetDigest,
      serviceWorkerSha256: input.files.find((entry) => entry.path === "sw.js").sha256,
      artifactRoot: {
        path: path.relative(workspaceRoot, artifactRoots[label]).replaceAll("\\", "/"),
        dev: input.rootStat.dev.toString(10),
        ino: input.rootStat.ino.toString(10),
        birthtimeNs: input.rootStat.birthtimeNs.toString(10),
        realPathDigest: sha256(input.comparableRealPath),
        fileCount: input.files.length,
        inventoryDigest: input.inventoryDigest,
        immutableSnapshot: true
      },
      files: structuredClone(input.files),
      identityLock: attachmentReference(identityLockAttachment),
      releaseEvidence: attachmentReference(releaseEvidenceAttachment),
      remoteArtifactCapture: attachmentReference(remoteAttachment)
    };
    artifact.artifactIdentityDigest = computeSwAbUpdateCandidateArtifactIdentityDigest(artifact);
    artifacts[label] = artifact;
  }

  const marker = {
    markerType: "sw_ab_update_candidate_attempt_marker_v1",
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    runId,
    attemptId,
    createdAt: iso(0),
    privateRootPath: path.relative(workspaceRoot, privateRoot).replaceAll("\\", "/"),
    attachmentsRootPath: path.relative(workspaceRoot, attachmentsRoot).replaceAll("\\", "/"),
    artifactARootPath: path.relative(workspaceRoot, artifactARoot).replaceAll("\\", "/"),
    artifactBRootPath: path.relative(workspaceRoot, artifactBRoot).replaceAll("\\", "/"),
    createdFresh: true,
    preexistingEntryCount: 0,
    markerDigest: "0".repeat(64)
  };
  marker.markerDigest = computeSwAbUpdateCandidateAttemptMarkerDigest(marker);
  await writeJson(path.join(privateRoot, ".sw-ab-update-attempt-marker.json"), marker);

  const deploymentEventLedger = {
    runId,
    attemptId,
    deploymentMode: "one_global_a_to_b_switch_both_browsers_already_on_a",
    events: SW_AB_UPDATE_CANDIDATE_DEPLOYMENT_EVENT_IDS.map((eventId, index) => ({
      sequence: index + 1,
      eventId,
      observedAt: [
        iso(0),
        iso(1),
        iso(21, 1),
        iso(21, 2),
        iso(21, 500),
        iso(22, 500),
        iso(23, 2),
        iso(24, 2),
        iso(25, 2),
        iso(26, 2),
        iso(28, 2),
        iso(30, 2),
        iso(31, 2),
        iso(33, 2)
      ][index]
    })),
    ledgerDigest: "0".repeat(64)
  };
  deploymentEventLedger.ledgerDigest =
    computeSwAbUpdateCandidateDeploymentLedgerDigest(deploymentEventLedger);

  const deploymentCandidate = {
    canonicalHttpsOrigin: ORIGIN,
    provider: {
      platformId: "candidate-host",
      accountBindingDigest: digest("provider-account"),
      projectBindingDigest: digest("provider-project"),
      artifactADeploymentDigest: "0".repeat(64),
      artifactBDeploymentDigest: "0".repeat(64),
      bindingTrust: "untrusted_candidate"
    },
    host: {
      hostname: "pwa.hakimi.cn",
      hostBindingDigest: digest("host-binding"),
      tlsBindingDigest: digest("tls-binding"),
      artifactAResponseSetDigest: remoteCapturePayloads.A.captureDigest,
      artifactBResponseSetDigest: remoteCapturePayloads.B.captureDigest,
      bindingTrust: "untrusted_candidate"
    },
    deploymentEventLedgerDigest: deploymentEventLedger.ledgerDigest
  };

  const evidence = {
    schemaVersion: 1,
    evidenceType: "sw_ab_update_candidate_v1",
    trustClass: "untrusted_candidate",
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    strictGatePassed: false,
    runId,
    attemptId,
    attemptMarker: structuredClone(marker),
    capturedAt: iso(59),
    releaseIdentity: structuredClone(SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_CANDIDATE_CAPABILITIES),
    governanceBindings: [],
    deploymentCandidate,
    deploymentEventLedger,
    artifacts,
    attachments,
    browserReceipts: [],
    authority: structuredClone(SW_AB_UPDATE_CANDIDATE_AUTHORITY),
    evidenceDigest: "0".repeat(64)
  };
  deploymentCandidate.provider.artifactADeploymentDigest =
    computeSwAbUpdateCandidateProviderDeploymentDigest({ evidence, label: "A" });
  deploymentCandidate.provider.artifactBDeploymentDigest =
    computeSwAbUpdateCandidateProviderDeploymentDigest({ evidence, label: "B" });

  for (const binding of SW_AB_UPDATE_CANDIDATE_GOVERNANCE_BINDINGS) {
    const bytes = await readFile(path.join(workspaceRoot, ...binding.path.split("/")));
    const document = JSON.parse(bytes.toString("utf8"));
    evidence.governanceBindings.push({
      role: binding.role,
      path: binding.path,
      size: bytes.byteLength,
      sha256: sha256(bytes),
      canonicalSha256: sha256(canonicalJson(document))
    });
  }

  for (const [projectIndex, projectName] of SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS.entries()) {
    const actualProduct = projectName === "msedge" ? "Microsoft Edge" : "Google Chrome";
    const profile = {
      freshProfile: true,
      persistentProfile: true,
      preflightEntryCount: 0,
      profileInstanceId: `profile-${digest(`${projectName}-profile`)}`,
      physicalProfileRootDigest: digest(`${projectName}-profile-root`),
      initialContextId: `context-${digest(`${projectName}-context`)}`,
      initialProcess: {
        processIdDigest: digest(`${projectName}-process-a`),
        createdAt: iso(18, projectIndex + 1)
      },
      reopenedProcess: {
        processIdDigest: digest(`${projectName}-process-b`),
        createdAt: iso(30, 500 + projectIndex)
      },
      allPagesClosedBeforeRestart: true,
      browserProcessClosed: true,
      oldProcessExitObserved: true,
      differentProcessIdentity: true,
      samePhysicalProfileRoot: true,
      persistentProfileReopened: true,
      reopenedOffline: true,
      offlineBeforeFirstNavigation: true,
      firstNavigationAfterReopenAt: iso(32, projectIndex + 1),
      attempts: 1
    };
    const clientFor = (phase, slot, index, documentTag, controllerTag, controllerChangeCount) => {
      const client = {
        slot,
        documentTag,
        controllerTag,
        clientId: `client-${digest(
          `${projectName}-${slot}-${phase === "post-claim" && slot === "reload-to-b" ? "post" : "initial"}-client`
        )}`,
        cdpTargetId: `target-${digest(`${projectName}-${slot}-target`)}`,
        challengeNonce: `challenge-${digest(`${projectName}-${phase}-${slot}-challenge`)}`,
        challengeResponseDigest: "0".repeat(64),
        controllerChangeCount
      };
      client.challengeResponseDigest = computeSwAbUpdateCandidateClientChallengeResponseDigest({
        evidence,
        projectName,
        phase,
        client
      });
      return client;
    };
    const initialAClients = [
      clientFor("initial-a", "retained-old-a", 0, "A", "A", 0),
      clientFor("initial-a", "reload-to-b", 1, "A", "A", 0)
    ];
    const postClaimClients = [
      clientFor("post-claim", "retained-old-a", 0, "A", "B", 1),
      clientFor("post-claim", "reload-to-b", 1, "B", "B", 1)
    ];
    const timeline = SW_AB_UPDATE_CANDIDATE_TIMELINE.map((event, index) => ({
      sequence: index + 1,
      eventId: event.eventId,
      observedAt: iso(20 + index, projectIndex + 1),
      documentTags: [...event.documentTags],
      controllerTags: [...event.controllerTags],
      installingTag: event.installingTag,
      waitingTag: event.waitingTag,
      activeTag: event.activeTag,
      networkState: event.networkState,
      pageCount: event.pageCount,
      processState: event.processState
    }));
    const rootBody = artifactInputs.B.bodies.get("index.html");
    const deepBody = artifactInputs.B.bodies.get("index.html");
    const cacheName = `hakimi-shell-${artifacts.B.buildVersion}`;
    const offlineRoutes = [
      { routeId: "offline-root", path: "/", body: rootBody },
      { routeId: "offline-deep-link", path: "/help", body: deepBody }
    ].map(({ routeId, path: routePath, body }) => ({
      routeId,
      path: routePath,
      networkState: "offline",
      controllerTag: "B",
      servedArtifactTag: "B",
      loadSucceeded: true,
      fromServiceWorker: true,
      networkForwarded: false,
      cacheName,
      requestUrl: `${ORIGIN}${routePath}`,
      matchedCacheEntryUrl: `${ORIGIN}/`,
      cacheBodySha256: sha256(body),
      responseDigest: sha256(body)
    }));
    const cacheEntries = [{
      url: `${ORIGIN}/`,
      cacheName,
      size: rootBody.byteLength,
      sha256: sha256(rootBody),
      bodyBase64: rootBody.toString("base64")
    }];
    const cacheMetadataDocument = {
      cacheName,
      installedAt: Date.parse(iso(23, 500 + projectIndex)),
      bootAttempted: false,
      bootConfirmed: false,
      protocolVersion: 1,
      dbGeneration: "legacy-v13",
      databaseName: "hakimi-bazi-research",
      targetSchema: 13,
      minReadableSchema: 13,
      maxReadableSchema: 13,
      migrationId: null,
      acceptedCommittedMigrationIds: [null],
      sourceGeneration: null,
      sourceDatabaseName: null,
      sourceSchema: null
    };
    const cacheMetadataBody = Buffer.from(JSON.stringify(cacheMetadataDocument));
    const cacheMetadata = {
      url: `${ORIGIN}/__hakimi_cache_meta__`,
      cacheName,
      size: cacheMetadataBody.byteLength,
      sha256: sha256(cacheMetadataBody),
      bodyBase64: cacheMetadataBody.toString("base64")
    };
    const cacheProof = {
      artifactTag: "B",
      serviceWorkerSha256: artifacts.B.serviceWorkerSha256,
      cacheInventoryDigest: sha256(canonicalJson({ metadata: cacheMetadata, entries: cacheEntries })),
      cacheMetadataSha256: cacheMetadata.sha256,
      rootBodySha256: offlineRoutes[0].responseDigest,
      deepLinkBodySha256: offlineRoutes[1].responseDigest
    };
    const snapshot = {
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochCapability: "absent_schema13",
      epoch: null,
      storeSetDigest: digest(`${projectName}-stores`),
      dataFingerprint: digest(`${projectName}-data`),
      recordCount: 23
    };
    const snapshotDigest = sha256(canonicalJson(snapshot));
    const staleAWrite = {
      attempted: true,
      productionWritePath: true,
      repositoryLayer: "production_repository_dbcore",
      pageControllerTag: "B",
      pageDocumentTag: "A",
      targetActiveTag: "B",
      rejected: true,
      reasonCode: "STALE_CONTROLLER_PRODUCTION_WRITE_REJECTED",
      typedErrorName: "ReleaseDatabaseWriteLockedError",
      errorInstanceOf: true,
      databaseAreReleaseWritesLocked: true,
      productionWriteCommitted: false,
      transactionCommitCount: 0,
      beforeSnapshotDigest: snapshotDigest,
      afterAttemptSnapshotDigest: snapshotDigest,
      finalSnapshotDigest: snapshotDigest,
      finalSnapshotUnchanged: true
    };
    const receipt = {
      projectName,
      receiptType: "sw_ab_update_browser_receipt_candidate_v1",
      evidenceClass: "untrusted_candidate",
      actualProduct,
      attempts: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      flaky: 0,
      runId,
      attemptId,
      attemptMarkerDigest: marker.markerDigest,
      deploymentEventLedgerDigest: deploymentEventLedger.ledgerDigest,
      capturedAt: iso(50, projectIndex + 1),
      releaseIdentity: structuredClone(SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY),
      profile,
      clientProofs: { initialAClients, postClaimClients },
      artifactBindings: {
        A: artifactReference(artifacts.A),
        B: artifactReference(artifacts.B)
      },
      timeline,
      networkInterruption: {
        observed: true,
        duringUpdate: true,
        afterBInstallStarted: true,
        afterBWaitingObserved: true,
        beforeBActivation: true,
        unexpectedOnlineRequestCount: 0
      },
      offlineRoutes,
      offlineUncachedCanary: {
        path: `/__sw_ab_uncached_canary__/${digest(`${projectName}-canary`)}`,
        offlineBeforeRequest: true,
        cacheMatch: false,
        responseReceived: false,
        loadFailed: true
      },
      cacheProof,
      dataIntegrity: {
        before: structuredClone(snapshot),
        after: structuredClone(snapshot),
        endpointFingerprintsEqual: true,
        intervalNoMutationVerified: false,
        abaResistance: "absent_schema13"
      },
      staleAWrite,
      attachmentRoles: [...SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES],
      receiptDigest: "0".repeat(64)
    };
    const staleWriteRuntimeFacts = {
      staleAWrite: structuredClone(staleAWrite),
      invocation: {
        invocationId: `write-${digest(`${projectName}-stale-write`)}`,
        repositoryLayer: "production_repository_dbcore",
        productionWritePath: true,
        pageDocumentTag: "A",
        pageControllerTag: "B",
        targetActiveTag: "B",
        sentinelKey: `sentinel-${digest(`${projectName}-stale-sentinel`)}`,
        intendedValueDigest: digest(`${projectName}-stale-value`)
      },
      error: {
        name: "ReleaseDatabaseWriteLockedError",
        constructorName: "ReleaseDatabaseWriteLockedError",
        prototypeChain: ["ReleaseDatabaseWriteLockedError", "Error", "Object"],
        instanceOfReleaseDatabaseWriteLockedError: true,
        reasonCode: "STALE_CONTROLLER_PRODUCTION_WRITE_REJECTED",
        databaseAreReleaseWritesLocked: true
      },
      transaction: {
        writeInvocationReachedProductionRepository: true,
        dbcoreWriteAttempted: true,
        commitObserved: false,
        transactionCommitCount: 0
      },
      snapshots: {
        before: structuredClone(snapshot),
        afterAttempt: structuredClone(snapshot),
        final: structuredClone(snapshot)
      },
      sentinel: {
        key: `sentinel-${digest(`${projectName}-stale-sentinel`)}`,
        presentBefore: false,
        presentAfterAttempt: false,
        presentFinal: false,
        queryCount: 3
      }
    };
    await addAttachment(projectName, "browser-version", {
      actualProduct,
      version: projectName === "msedge" ? "140.0.1000.1" : "140.0.1000.2",
      executableSha256: digest(`${projectName}-executable`)
    });
    await addAttachment(projectName, "fresh-persistent-profile-preflight", { profile });
    await addAttachment(projectName, "initial-two-client-census", {
      contextId: profile.initialContextId,
      clients: initialAClients
    });
    await addAttachment(projectName, "post-claim-two-client-census", {
      contextId: profile.initialContextId,
      clients: postClaimClients
    });
    for (const label of ["A", "B"]) {
      const source = artifactInputs[label].bodies.get("sw.js");
      await addAttachment(projectName, `artifact-${label.toLowerCase()}-controller-source`, {
        label,
        scriptUrl: `${ORIGIN}/sw.js`,
        sourceBase64: source.toString("base64"),
        sourceSha256: sha256(source)
      });
    }
    await addAttachment(projectName, "sw-controller-install-wait-activation-timeline", { timeline });
    await addAttachment(projectName, "update-network-interruption", {
      networkInterruption: receipt.networkInterruption
    });
    await addAttachment(projectName, "process-and-profile-reopen", { profile });
    await addAttachment(projectName, "offline-root-result", {
      route: offlineRoutes[0],
      responseBodyBase64: rootBody.toString("base64")
    });
    await addAttachment(projectName, "offline-deep-link-result", {
      route: offlineRoutes[1],
      responseBodyBase64: deepBody.toString("base64")
    });
    await addAttachment(projectName, "offline-uncached-canary", {
      canary: receipt.offlineUncachedCanary
    });
    await addAttachment(projectName, "artifact-b-cache-inventory", {
      proof: cacheProof,
      metadata: cacheMetadata,
      entries: cacheEntries
    });
    await addAttachment(projectName, "v13-data-before", { snapshot });
    await addAttachment(projectName, "v13-data-after", { snapshot });
    await addAttachment(projectName, "stale-a-write-rejection", staleWriteRuntimeFacts);
    receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
    evidence.browserReceipts.push(receipt);
  }
  evidence.evidenceDigest = computeSwAbUpdateCandidateEvidenceDigest(evidence);
  const inputPath = path.join(privateRoot, "evidence.json");
  const inputBytes = await writeJson(inputPath, evidence);
  await writeFile(`${inputPath}.sha256`, `${sha256(inputBytes)}  evidence.json\n`, "ascii");
  return {
    fixtureRoot,
    attachmentsRoot,
    privateRoot,
    artifactARoot,
    artifactBRoot,
    inputPath,
    evidence,
    attachmentEnvelopes,
    verify: () => verifySwAbUpdateCandidate({
      cwd: workspaceRoot,
      inputPath,
      attachmentsRoot,
      privateRoot,
      artifactARoot,
      artifactBRoot
    })
  };
}


