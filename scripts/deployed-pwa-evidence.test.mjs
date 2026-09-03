import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildDeployedPwaVerificationFailure,
  DEPLOYED_PWA_EVIDENCE_POLICY_PATH,
  DEPLOYED_PWA_GATE_NAMES,
  DEPLOYED_PWA_HOSTING_POLICY_PATH,
  DEPLOYED_PWA_RELEASE_DECISIONS_PATH,
  DeployedPwaEvidenceVerificationError,
  validateDeployedPwaEvidencePolicy,
  validateDeployedPwaGovernanceState,
  verifyDeployedPwaEvidence
} from "./deployed-pwa-evidence-lib.mjs";
import {
  compileDeployedPwaEvidenceSchema,
  DEPLOYED_PWA_EVIDENCE_SCHEMA_PATH
} from "./deployed-pwa-evidence-schema.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(await readFile(
  path.join(workspaceRoot, relativePath),
  "utf8"
));
const [schema, policy, hostingPolicy, decisions] = await Promise.all([
  readJson(DEPLOYED_PWA_EVIDENCE_SCHEMA_PATH),
  readJson(DEPLOYED_PWA_EVIDENCE_POLICY_PATH),
  readJson(DEPLOYED_PWA_HOSTING_POLICY_PATH),
  readJson(DEPLOYED_PWA_RELEASE_DECISIONS_PATH)
]);

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const SHA_D = "d".repeat(64);
const RELEASE_EVIDENCE_ID = `hre1-${"a".repeat(32)}`;
const ORIGIN = "https://staging.hakimi.dev";
const OBSERVED_AT = "2026-08-26T00:00:00.000Z";
const DESCRIPTOR = Object.freeze({
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
});

function artifactEntry(pathname, digest = SHA_A) {
  return { path: pathname, size: 1, sha256: digest };
}

function browserReceipt(projectName) {
  const isEdge = projectName === "msedge";
  return {
    path: `receipts/${projectName}-pwa.json`,
    sha256: isEdge ? SHA_A : SHA_B,
    receiptId: `deployed-pwa-${projectName}`,
    projectName,
    browserChannel: projectName,
    actualProduct: isEdge ? "Edg/151.0.7922.34" : "Chrome/151.0.7922.34",
    targetOrigin: ORIGIN,
    releaseEvidenceId: RELEASE_EVIDENCE_ID,
    artifactSetDigest: SHA_C,
    profileBindingDigest: isEdge ? SHA_A : SHA_B,
    profileDirectoryExistedBeforeRun: false,
    profileCreatedByRunner: true,
    registrationScope: `${ORIGIN}/`,
    controllerPresent: true,
    controllerScriptUrl: `${ORIGIN}/sw.js`,
    controllerState: "activated",
    activeScriptUrl: `${ORIGIN}/sw.js`,
    activeState: "activated",
    waitingScriptUrl: null,
    installingScriptUrl: null,
    controllerBuildVersion: "abcdef123456",
    controllerDescriptor: structuredClone(DESCRIPTOR),
    remoteServiceWorkerSha256: SHA_D,
    controllerSourceSha256: SHA_D,
    controllerSourceEvidenceMethod: "cdp_debugger_get_script_source_v1",
    attemptCount: 1,
    retryCount: 0,
    skippedCount: 0,
    flakyCount: 0,
    onlineRootVerified: true,
    offlineSettingsDataFromServiceWorkerVerified: true,
    offlineCaseRevisionFromServiceWorkerVerified: true,
    offlineHelpColdStartFromServiceWorkerVerified: true,
    offlineHelpReloadFromServiceWorkerVerified: true,
    playwrightFromServiceWorkerVerified: true,
    cdpFromServiceWorkerVerified: true,
    caseRevisionPath: "/cases/00000000-0000-4000-8000-000000000000/revisions/00000000-0000-4000-8000-000000000001",
    caseRevisionFingerprintBefore: SHA_C,
    caseRevisionFingerprintAfter: SHA_C,
    unexpectedExternalRequestCount: 0,
    rawAttachmentSetDigest: SHA_D,
    strictGatePassed: true,
    startedAt: OBSERVED_AT,
    completedAt: "2026-08-26T00:01:00.000Z"
  };
}

function validEvidenceFixture() {
  return {
    schemaVersion: 1,
    evidenceType: "deployed_pwa_engineering_evidence",
    evidenceId: `hpwa1-${"b".repeat(32)}`,
    status: "passed",
    generatedAt: "2026-08-26T00:02:00.000Z",
    scope: {
      deploymentPlatform: "fixture-host",
      canonicalOrigin: ORIGIN,
      hostVerificationKind: "real-network",
      browserProjects: ["msedge", "chrome"],
      releaseIdentity: {
        channel: "default-v13",
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      }
    },
    policyBindings: policy.requiredPolicyBindings.map((binding, index) => ({
      ...binding,
      sha256: [SHA_A, SHA_B, SHA_C, SHA_D, "e".repeat(64)][index]
    })),
    artifactIdentity: {
      releaseEvidence: {
        path: "dist/web/release-evidence.json",
        sha256: SHA_A,
        evidenceId: RELEASE_EVIDENCE_ID,
        generatedAt: OBSERVED_AT
      },
      formalVerification: {
        path: "receipts/formal-verification.json",
        sha256: SHA_B,
        receiptId: "formal-v13",
        releaseEvidenceId: RELEASE_EVIDENCE_ID,
        status: "passed",
        verifiedAt: OBSERVED_AT,
        formalReleaseEvidenceVerified: true
      },
      identityLock: {
        path: "receipts/release-artifact-identity.json",
        sha256: SHA_C,
        lockDigest: SHA_D,
        artifactSetDigest: SHA_C,
        createdAt: OBSERVED_AT
      },
      descriptor: structuredClone(DESCRIPTOR),
      manifestVersion: 1,
      manifestDigest: SHA_B,
      buildVersion: "abcdef123456",
      artifactSetDigest: SHA_C,
      components: {
        applicationShell: artifactEntry("index.html", SHA_A),
        pwaManifest: artifactEntry("manifest.webmanifest", SHA_B),
        serviceWorker: artifactEntry("sw.js", SHA_D),
        hostingHeaders: artifactEntry("_headers", SHA_C)
      }
    },
    receipts: {
      host: {
        path: "receipts/deployed-host.json",
        sha256: SHA_A,
        receiptId: "real-host-v13",
        summaryType: "deployed_host_verification_v1",
        verificationKind: "real-network",
        targetOrigin: ORIGIN,
        deploymentPlatform: "fixture-host",
        releaseEvidenceId: RELEASE_EVIDENCE_ID,
        artifactSetDigest: SHA_C,
        networkCompleted: true,
        strictGatePassed: true,
        realHostVerified: true,
        publicDeploymentAuthorized: false,
        completedAt: OBSERVED_AT
      },
      browsers: [browserReceipt("msedge"), browserReceipt("chrome")],
      deployment: null
    },
    gates: {
      policyBindingsVerified: true,
      releaseIdentityVerified: true,
      artifactIdentityVerified: true,
      formalReleaseEvidenceVerified: true,
      realHostReceiptVerified: true,
      edgePwaRuntimeReceiptVerified: true,
      chromePwaRuntimeReceiptVerified: true,
      deploymentReceiptVerified: false,
      deployedPwaEngineeringVerified: true
    },
    claims: {
      engineeringEvidenceOnly: true,
      sourceAndArtifactCurrentVerified: true,
      realHostVerified: true,
      pwaBrowserRuntimeVerified: true,
      deploymentOperationObserved: false,
      externalDeploymentExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      contentTruthAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false
    },
    failures: [],
    evidenceDigest: SHA_D
  };
}

test("checked deployed-PWA schema compiles and accepts a fully bound closed-authorization fixture", () => {
  const validator = compileDeployedPwaEvidenceSchema(schema);
  assert.doesNotThrow(() => validator.assert(validEvidenceFixture()));
});

test("deployed-PWA schema rejects identity drift, runtime weakening, unknown fields, and authorization promotion", () => {
  const validator = compileDeployedPwaEvidenceSchema(schema);
  const mutations = [
    (fixture) => { fixture.extra = true; },
    (fixture) => { fixture.evidenceId = `hre1-${"a".repeat(32)}`; },
    (fixture) => { fixture.artifactIdentity.buildVersion = "build-v13"; },
    (fixture) => { fixture.artifactIdentity.descriptor.acceptedCommittedMigrationIds = [13]; },
    (fixture) => { fixture.receipts.browsers[0].waitingScriptUrl = `${ORIGIN}/sw.js`; },
    (fixture) => { fixture.receipts.browsers[0].profileDirectoryExistedBeforeRun = true; },
    (fixture) => {
      fixture.receipts.browsers[0].caseRevisionPath =
        `/cases/${"a".repeat(36)}/revisions/${"b".repeat(36)}`;
    },
    (fixture) => { fixture.receipts.browsers[0].cdpFromServiceWorkerVerified = false; },
    (fixture) => { fixture.receipts.browsers[0].controllerSourceEvidenceMethod = "remote_fetch"; },
    (fixture) => { fixture.receipts.browsers = [fixture.receipts.browsers[0]]; },
    (fixture) => { fixture.receipts.browsers[1] = structuredClone(fixture.receipts.browsers[0]); },
    (fixture) => { fixture.claims.externalDeploymentExecutionAuthorized = true; },
    (fixture) => { fixture.claims.publicDeploymentAuthorized = true; },
    (fixture) => { fixture.claims.publicReleaseAuthorized = true; },
    (fixture) => { fixture.claims.releaseReady = true; }
  ];
  for (const mutate of mutations) {
    const fixture = validEvidenceFixture();
    mutate(fixture);
    assert.throws(() => validator.assert(fixture));
  }
});

test("checked deployed-PWA policy and current hosting ledgers remain exact and closed", () => {
  assert.doesNotThrow(() => validateDeployedPwaEvidencePolicy(policy));
  assert.doesNotThrow(() => validateDeployedPwaGovernanceState({
    policy,
    hostingPolicy,
    decisions
  }));
});

test("deployed-PWA policy rejects single-field opening, browser drift, missing blockers, and authorization promotion", () => {
  const mutations = [
    (candidate) => { candidate.status = "executed"; },
    (candidate) => { candidate.executionAdmission.canonicalHttpsOriginConfigured = true; },
    (candidate) => { candidate.executionAdmission.status = "open"; },
    (candidate) => { candidate.blockingReasons.pop(); },
    (candidate) => { candidate.requiredBrowserProjects.reverse(); },
    (candidate) => { candidate.authorizationBoundary.externalDeploymentExecutionAuthorized = true; },
    (candidate) => { candidate.authorizationBoundary.publicDeploymentAuthorized = true; },
    (candidate) => { candidate.authorizationBoundary.publicReleaseAuthorized = true; }
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(policy);
    mutate(candidate);
    assert.throws(
      () => validateDeployedPwaEvidencePolicy(candidate),
      (error) => error instanceof DeployedPwaEvidenceVerificationError
        && error.code === "DEPLOYED_PWA_POLICY_INVALID"
    );
  }
});

test("selected-host fixtures cannot open the checked v1 contract", () => {
  const selectedHosting = structuredClone(hostingPolicy);
  selectedHosting.deploymentPlatform = "fixture-host";
  selectedHosting.canonicalOrigin = ORIGIN;
  const selectedDecisions = structuredClone(decisions);
  selectedDecisions.hosting.platform = "fixture-host";
  assert.throws(
    () => validateDeployedPwaGovernanceState({
      policy,
      hostingPolicy: selectedHosting,
      decisions: selectedDecisions
    }),
    (error) => error instanceof DeployedPwaEvidenceVerificationError
      && error.code === "DEPLOYED_PWA_LEDGER_DIVERGENCE"
  );
});

test("current verifier closes before reading any evidence, artifact, receipt, network, browser, or deployment input", async () => {
  const reads = [];
  const sentinelInput = path.join(workspaceRoot, "tmp", "must-not-be-read-deployed-pwa.json");
  await assert.rejects(
    () => verifyDeployedPwaEvidence({
      cwd: workspaceRoot,
      inputPath: sentinelInput,
      readFileImpl: async (filePath) => {
        reads.push(path.resolve(filePath));
        if (path.resolve(filePath) === sentinelInput) {
          throw new Error("sentinel input was read");
        }
        return readFile(filePath);
      }
    }),
    (error) => error instanceof DeployedPwaEvidenceVerificationError
      && error.stage === "execution_admission"
      && error.code === "DEPLOYED_PWA_EXECUTION_ADMISSION_CLOSED"
  );
  assert.deepEqual(reads.sort(), [
    DEPLOYED_PWA_EVIDENCE_SCHEMA_PATH,
    DEPLOYED_PWA_EVIDENCE_POLICY_PATH,
    DEPLOYED_PWA_HOSTING_POLICY_PATH,
    DEPLOYED_PWA_RELEASE_DECISIONS_PATH
  ].map((relativePath) => path.resolve(workspaceRoot, relativePath)).sort());
  assert.equal(reads.includes(sentinelInput), false);
});

test("deployed-PWA failure ledger zeroes every engineering and authorization gate", () => {
  const failure = buildDeployedPwaVerificationFailure({
    inputPath: "private/deployed-pwa.json",
    error: new DeployedPwaEvidenceVerificationError(
      "execution_admission",
      "DEPLOYED_PWA_EXECUTION_ADMISSION_CLOSED",
      "closed"
    )
  });
  assert.equal(failure.inputProvided, true);
  assert.equal(failure.strictGatePassed, false);
  assert.equal(failure.artifactReadAttempted, false);
  assert.equal(failure.formalVerifierAttempted, false);
  assert.equal(failure.networkAttempted, false);
  assert.equal(failure.browserAttempted, false);
  assert.equal(failure.deploymentAttempted, false);
  const expectedGates = {
    policyBindingsVerified: false,
    releaseIdentityVerified: false,
    artifactIdentityVerified: false,
    formalReleaseEvidenceVerified: false,
    realHostReceiptVerified: false,
    edgePwaRuntimeReceiptVerified: false,
    chromePwaRuntimeReceiptVerified: false,
    deploymentReceiptVerified: false,
    deployedPwaEngineeringVerified: false
  };
  assert.deepEqual(DEPLOYED_PWA_GATE_NAMES, Object.keys(expectedGates));
  assert.deepEqual(failure.gates, expectedGates);
  assert.deepEqual(failure.claims, {
    engineeringEvidenceOnly: true,
    sourceAndArtifactCurrentVerified: false,
    realHostVerified: false,
    pwaBrowserRuntimeVerified: false,
    deploymentOperationObserved: false,
    externalDeploymentExecutionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    releaseReady: false,
    contentTruthAuthorized: false,
    expertClaimsAuthorized: false,
    rightsLegalConclusionAuthorized: false
  });
  const earlierFailure = buildDeployedPwaVerificationFailure({
    error: new Error("usage")
  });
  assert.equal(earlierFailure.executionAdmission, "unverified");
  assert.deepEqual(earlierFailure.gates, expectedGates);
  assert.deepEqual(earlierFailure.claims, failure.claims);
});

test("checked-in CLI emits stable closed JSON without launching a runtime path", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/verify-deployed-pwa-evidence.mjs", "--input", "tmp/not-read.json"],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      windowsHide: true
    }
  );
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.inputProvided, true);
  assert.equal(summary.executionAdmission, "closed_missing_https_origin");
  assert.equal(summary.errors[0].code, "DEPLOYED_PWA_EXECUTION_ADMISSION_CLOSED");
  assert.equal(summary.artifactReadAttempted, false);
  assert.equal(summary.networkAttempted, false);
  assert.equal(summary.browserAttempted, false);
  assert.equal(summary.deploymentAttempted, false);
});

test("CLI argument failure remains unverified instead of claiming admission was evaluated", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/verify-deployed-pwa-evidence.mjs", "--unknown"],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      windowsHide: true
    }
  );
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.executionAdmission, "unverified");
  assert.equal(summary.errors[0].code, "DEPLOYED_PWA_EVIDENCE_VERIFICATION_FAILED");
  assert.equal(Object.values(summary.gates).every((value) => value === false), true);
  assert.equal(summary.claims.engineeringEvidenceOnly, true);
  assert.equal(
    Object.entries(summary.claims)
      .filter(([name]) => name !== "engineeringEvidenceOnly")
      .every(([, value]) => value === false),
    true
  );
});
