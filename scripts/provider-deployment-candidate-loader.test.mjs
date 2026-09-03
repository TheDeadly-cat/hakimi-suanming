import assert from "node:assert/strict";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadVerifiedProviderDeploymentCandidateOutput,
  parseProviderDeploymentCandidateLoaderInput
} from "./provider-deployment-candidate-loader.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hostingPolicyPath = path.join(workspaceRoot, "docs", "security", "hosting-security-policy.json");
const hostingPolicyBytes = await readFile(hostingPolicyPath);
const hostingPolicy = JSON.parse(hostingPolicyBytes.toString("utf8"));
const canonicalHostingPolicy = canonicalJson(hostingPolicy);
const provider = "fixture-provider-neutral";
const origin = "https://staging.example.com";
const evidenceId = `hre1-${"a".repeat(32)}`;
const buildVersion = "abcdef123456";
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
const fileNames = Object.freeze({
  "raw-action-response": "raw-action-response.json",
  "raw-final-readback": "raw-final-readback.json",
  "synthetic-normalized-projection": "synthetic-normalized-projection.json",
  "artifact-initial": "artifact-initial.json",
  "artifact-final": "artifact-final.json"
});
const pendingTerminalCommitFileName =
  ".provider-deployment-candidate-receipt-publication-pending";
const terminalCommitFileName = "provider-deployment-candidate-receipt-commit.sha256";

function normalizedRelative(from, to) {
  return path.relative(from, to).replaceAll("\\", "/");
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function digestReceipt(document) {
  const { receiptDigest: _receiptDigest, ...unsigned } = document;
  return sha256(canonicalJson(unsigned));
}

async function writeReceiptBytes(fixture, bytes) {
  await writeFile(fixture.receiptPath, bytes);
  await writeFile(fixture.terminalCommitPath, `${sha256(bytes)}\n`, "utf8");
}

function refreshReceiptDigests(receipt) {
  receipt.attachmentSetDigest = sha256(canonicalJson(receipt.attachments));
  receipt.receiptDigest = "0".repeat(64);
  receipt.receiptDigest = digestReceipt(receipt);
  return receipt;
}

function projectionFor(action) {
  const deploy = action === "deploy_candidate";
  return {
    schemaVersion: 1,
    recordType: "synthetic_provider_deployment_projection_v1",
    provider,
    action,
    actionResponse: {
      provider,
      action,
      operationId: deploy ? "operation-deploy-001" : "operation-restore-001",
      accountId: "account-1",
      projectId: "project-1",
      environment: "staging",
      origin,
      beforeActiveDeploymentId: deploy ? "deployment-a" : "deployment-b",
      requestedTargetDeploymentId: deploy ? null : "deployment-a",
      resultActiveDeploymentId: deploy ? "deployment-b" : "deployment-a",
      immutableDeploymentUrl: deploy
        ? "https://deployment-b.example.net"
        : "https://deployment-a.example.net",
      resultDerivation: deploy ? "provider_assigned_new" : "activated_requested",
      derivedFromDeploymentId: null,
      sequenceEligible: true,
      startedAt: "2020-01-01T00:00:00.000Z",
      acceptedAt: "2020-01-01T00:00:01.000Z",
      completedAt: "2020-01-01T00:00:02.000Z",
      credentialMaterialEmbedded: false
    },
    finalReadback: {
      provider,
      action,
      operationId: deploy ? "operation-deploy-001" : "operation-restore-001",
      accountId: "account-1",
      projectId: "project-1",
      environment: "staging",
      origin,
      activeDeploymentId: deploy ? "deployment-b" : "deployment-a",
      immutableDeploymentUrl: deploy
        ? "https://deployment-b.example.net"
        : "https://deployment-a.example.net",
      providerStatus: "success",
      terminal: true,
      successful: true,
      observedAt: "2020-01-01T00:00:03.000Z",
      credentialMaterialEmbedded: false
    }
  };
}

function artifactExpectation(root) {
  const artifactHashes = {
    "_headers": "1".repeat(64),
    "index.html": "2".repeat(64),
    "manifest.webmanifest": "3".repeat(64),
    "sw.js": "4".repeat(64)
  };
  const artifacts = Object.entries(artifactHashes).map(([artifactPath, digest], index) => ({
    path: artifactPath,
    size: index + 1,
    sha256: digest
  }));
  const artifactSetDigest = sha256(canonicalJson(artifacts));
  return {
    expectationKind: "schema-validated-release-evidence-expectation-v1",
    evidenceId,
    artifactSetDigest,
    descriptor: structuredClone(descriptor),
    releaseIdentity: {
      descriptor: structuredClone(descriptor),
      manifestVersion: 1,
      manifestDigest: "5".repeat(64),
      buildVersion,
      evidenceId
    },
    policyBinding: {
      path: "docs/security/hosting-security-policy.json",
      policyId: hostingPolicy.policyId,
      sha256: sha256(hostingPolicyBytes),
      canonicalSha256: sha256(canonicalHostingPolicy),
      canonicalPolicy: canonicalHostingPolicy
    },
    artifactIdentityLockBinding: {
      path: normalizedRelative(workspaceRoot, path.join(root, "private-lock", "release-artifact-identity.json")),
      sha256: "7".repeat(64),
      lockDigest: "8".repeat(64),
      artifactSetDigest
    },
    releaseEvidence: {
      size: 123,
      sha256: "9".repeat(64)
    },
    artifacts,
    lockedBytes: {
      indexHtmlSha256: artifactHashes["index.html"],
      manifestSha256: artifactHashes["manifest.webmanifest"],
      serviceWorkerSha256: artifactHashes["sw.js"]
    }
  };
}

function artifactSnapshot({ phase, capturedAt, expectation }) {
  return {
    schemaVersion: 1,
    recordType: "provider_deployment_candidate_artifact_snapshot_v1",
    phase,
    capturedAt,
    releaseEvidenceId: evidenceId,
    descriptor: structuredClone(descriptor),
    buildVersion,
    artifactSetDigest: expectation.artifactSetDigest,
    releaseEvidenceExpectationDigest: sha256(canonicalJson(expectation)),
    releaseEvidenceExpectation: structuredClone(expectation),
    artifactLock: {
      path: expectation.artifactIdentityLockBinding.path,
      sha256: expectation.artifactIdentityLockBinding.sha256,
      lockDigest: expectation.artifactIdentityLockBinding.lockDigest
    }
  };
}

async function createCandidatePackage(t, { action = "deploy_candidate" } = {}) {
  const tmpRoot = path.join(workspaceRoot, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(path.join(tmpRoot, "provider-candidate-loader-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outputRoot = path.join(root, "candidate-output");
  const rawRoot = path.join(root, "private-raw");
  const receiptPath = path.join(outputRoot, "provider-deployment-candidate-receipt.json");
  const terminalCommitPath = path.join(outputRoot, terminalCommitFileName);
  await Promise.all([mkdir(outputRoot), mkdir(rawRoot)]);

  const rawActionBytes = jsonBytes({ kind: "sanitized-action-response", provider });
  const rawReadbackBytes = jsonBytes({ kind: "sanitized-final-readback", provider });
  const projection = projectionFor(action);
  const expectation = artifactExpectation(root);
  const initialArtifact = artifactSnapshot({
    phase: "initial",
    capturedAt: "2020-01-01T01:00:01.000Z",
    expectation
  });
  const finalArtifact = artifactSnapshot({
    phase: "final",
    capturedAt: "2020-01-01T01:00:02.000Z",
    expectation
  });
  const attachmentBytes = new Map([
    ["raw-action-response", rawActionBytes],
    ["raw-final-readback", rawReadbackBytes],
    ["synthetic-normalized-projection", jsonBytes(projection)],
    ["artifact-initial", jsonBytes(initialArtifact)],
    ["artifact-final", jsonBytes(finalArtifact)]
  ]);
  const attachments = Object.fromEntries(Object.entries(fileNames).map(([role, fileName]) => {
    const bytes = attachmentBytes.get(role);
    return [role, {
      path: normalizedRelative(workspaceRoot, path.join(outputRoot, fileName)),
      size: bytes.length,
      sha256: sha256(bytes),
      mediaType: "application/json"
    }];
  }));
  const actionProjection = projection.actionResponse;
  const readbackProjection = projection.finalReadback;
  const receipt = {
    schemaVersion: 1,
    receiptType: "provider_deployment_receipt_candidate_v1",
    receiptId: action === "deploy_candidate"
      ? "loader-run-0001-deploy-candidate"
      : "loader-run-0002-restore-baseline",
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    verificationKind: "synthetic-offline-adapter-contract-existing-sanitized-files",
    adapter: {
      adapterId: "fixture-synthetic-adapter",
      adapterVersion: "1.0.0",
      trustClass: "synthetic_contract_only",
      providerAuthenticated: false
    },
    candidateScope: {
      provider,
      action,
      accountId: actionProjection.accountId,
      projectId: actionProjection.projectId,
      environment: actionProjection.environment,
      origin: actionProjection.origin,
      immutableDeploymentUrl: actionProjection.immutableDeploymentUrl
    },
    operation: {
      operationId: actionProjection.operationId,
      beforeActiveDeploymentId: actionProjection.beforeActiveDeploymentId,
      requestedTargetDeploymentId: actionProjection.requestedTargetDeploymentId,
      resultActiveDeploymentId: actionProjection.resultActiveDeploymentId,
      resultDerivation: actionProjection.resultDerivation,
      derivedFromDeploymentId: actionProjection.derivedFromDeploymentId,
      sequenceEligible: actionProjection.sequenceEligible,
      providerStatus: readbackProjection.providerStatus,
      terminal: true,
      successful: true,
      startedAt: actionProjection.startedAt,
      acceptedAt: actionProjection.acceptedAt,
      completedAt: actionProjection.completedAt,
      finalReadbackObservedAt: readbackProjection.observedAt
    },
    artifactIdentity: {
      channel: "default-v13",
      releaseEvidenceId: evidenceId,
      descriptor: structuredClone(descriptor),
      buildVersion,
      artifactSetDigest: expectation.artifactSetDigest,
      identityLock: {
        path: expectation.artifactIdentityLockBinding.path,
        sha256: expectation.artifactIdentityLockBinding.sha256,
        lockDigest: expectation.artifactIdentityLockBinding.lockDigest
      },
      releaseEvidence: {
        path: normalizedRelative(workspaceRoot, path.join(root, "dist", "web", "release-evidence.json")),
        size: expectation.releaseEvidence.size,
        sha256: expectation.releaseEvidence.sha256
      },
      hostingPolicy: {
        path: expectation.policyBinding.path,
        policyId: expectation.policyBinding.policyId,
        sha256: expectation.policyBinding.sha256,
        canonicalSha256: expectation.policyBinding.canonicalSha256
      },
      expectationDigest: sha256(canonicalJson(expectation))
    },
    rawInputs: {
      credentialMaterialEmbedded: false,
      actionResponse: {
        path: normalizedRelative(workspaceRoot, path.join(rawRoot, "action-response.json")),
        size: rawActionBytes.length,
        sha256: sha256(rawActionBytes)
      },
      finalReadback: {
        path: normalizedRelative(workspaceRoot, path.join(rawRoot, "final-readback.json")),
        size: rawReadbackBytes.length,
        sha256: sha256(rawReadbackBytes)
      }
    },
    semanticGates: {
      rawFilesStable: true,
      artifactIdentityStableDuringOfflineParse: true,
      syntheticProjectionConsistent: true,
      operationTerminal: true,
      operationSuccessful: true,
      credentialMaterialAbsent: true
    },
    attempts: {
      networkAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false
    },
    admissionGates: {
      trustedProviderParserVerified: false,
      providerAuthenticatedReceiptVerified: false,
      deploymentAdmissionPassed: false,
      rollbackAdmissionPassed: false,
      publicReleaseGatePassed: false
    },
    authorizationBoundary: {
      externalDeploymentExecutionAuthorized: false,
      rollbackExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      authorizationMayNotBeDerivedFromCandidateEvidence: true
    },
    claims: {
      networkObserved: false,
      providerAuthenticated: false,
      deploymentOperationObserved: false,
      rollbackObserved: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      contentTruthAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false
    },
    attachments,
    attachmentSetDigest: sha256(canonicalJson(attachments)),
    startedAt: "2020-01-01T01:00:00.000Z",
    completedAt: "2020-01-01T01:00:03.000Z",
    receiptDigest: "0".repeat(64)
  };
  receipt.receiptDigest = digestReceipt(receipt);

  for (const [role, fileName] of Object.entries(fileNames)) {
    await writeFile(path.join(outputRoot, fileName), attachmentBytes.get(role));
  }
  const receiptBytes = jsonBytes(receipt);
  await writeFile(receiptPath, receiptBytes);
  await writeFile(terminalCommitPath, `${sha256(receiptBytes)}\n`, "utf8");
  return {
    root,
    outputRoot,
    receiptPath,
    terminalCommitPath,
    receipt,
    attachmentBytes,
    expectation
  };
}

async function loadCandidate(fixture, overrides = {}) {
  return loadVerifiedProviderDeploymentCandidateOutput({
    bindingRoot: workspaceRoot,
    outputRoot: fixture.outputRoot,
    receiptPath: fixture.receiptPath,
    cwd: workspaceRoot,
    ...overrides
  });
}

async function writeReceipt(fixture, receipt) {
  refreshReceiptDigests(receipt);
  await writeReceiptBytes(fixture, jsonBytes(receipt));
}

async function replaceAttachment(fixture, role, value, { refreshRawBinding = false } = {}) {
  const bytes = Buffer.isBuffer(value) ? value : jsonBytes(value);
  await writeFile(path.join(fixture.outputRoot, fileNames[role]), bytes);
  fixture.receipt.attachments[role].size = bytes.length;
  fixture.receipt.attachments[role].sha256 = sha256(bytes);
  if (refreshRawBinding && role === "raw-action-response") {
    fixture.receipt.rawInputs.actionResponse.size = bytes.length;
    fixture.receipt.rawInputs.actionResponse.sha256 = sha256(bytes);
  }
  if (refreshRawBinding && role === "raw-final-readback") {
    fixture.receipt.rawInputs.finalReadback.size = bytes.length;
    fixture.receipt.rawInputs.finalReadback.sha256 = sha256(bytes);
  }
  await writeReceipt(fixture, fixture.receipt);
}

test("independent loader accepts closed deploy and restore packages without promoting trust", async (t) => {
  for (const action of ["deploy_candidate", "restore_baseline"]) {
    const fixture = await createCandidatePackage(t, { action });
    const result = await loadCandidate(fixture);
    assert.equal(result.candidateOutputIntegrityVerified, true);
    assert.equal(result.trustClass, "untrusted_candidate");
    assert.equal(result.admissionStatus, "not_admitted");
    const terminalBytes = await readFile(fixture.terminalCommitPath);
    assert.equal(terminalBytes.length, 65);
    assert.equal(terminalBytes.toString("utf8"), `${sha256(await readFile(fixture.receiptPath))}\n`);
    assert.deepEqual(result.terminalGateBinding, {
      path: normalizedRelative(workspaceRoot, fixture.terminalCommitPath),
      size: 65,
      sha256: sha256(terminalBytes),
      commitsReceiptSha256: sha256(await readFile(fixture.receiptPath))
    });
    assert.equal(result.gates.terminalCommitMarkerVerified, true);
    assert.equal(result.gates.rawProjectionDerivationVerified, false);
    assert.equal(result.gates.providerAuthenticatedReceiptVerified, false);
    assert.equal(Object.isFrozen(result.document), true);
    assert.equal(Object.isFrozen(result.document.claims), true);
    assert.equal(Object.isFrozen(result.document.attachments["artifact-final"]), true);
    assert.throws(() => {
      result.document.claims.publicReleaseAuthorized = true;
    }, TypeError);
    assert.equal(result.document.claims.publicReleaseAuthorized, false);
    assert.ok(Object.values(result.attempts).every((value) => value === false));
    assert.equal(result.authorizationBoundary.authorizationMayNotBeDerivedFromCandidateEvidence, true);
    assert.ok(Object.entries(result.authorizationBoundary)
      .filter(([key]) => key !== "authorizationMayNotBeDerivedFromCandidateEvidence")
      .every(([, value]) => value === false));
    assert.ok(Object.values(result.claims).every((value) => value === false));
  }
});

test("recorded artifact projection is deeply frozen without claiming raw or artifact current-source verification", async (t) => {
  const fixture = await createCandidatePackage(t);
  for (const recordedPath of [
    fixture.receipt.rawInputs.actionResponse.path,
    fixture.receipt.rawInputs.finalReadback.path,
    fixture.receipt.artifactIdentity.identityLock.path,
    fixture.receipt.artifactIdentity.releaseEvidence.path
  ]) {
    await assert.rejects(
      readFile(path.resolve(workspaceRoot, ...recordedPath.split("/"))),
      (error) => error?.code === "ENOENT"
    );
  }

  const result = await loadCandidate(fixture);
  const projection = result.recordedArtifactProjection;
  assert.deepEqual(projection, fixture.expectation);
  assert.notStrictEqual(projection, fixture.expectation);
  assert.equal(Object.hasOwn(result, "currentArtifactProjection"), false);
  assert.equal(result.gates.rawProjectionDerivationVerified, false);
  assert.equal(result.gates.artifactSnapshotCrossBindingVerified, true);
  assert.equal(projection.releaseIdentity.manifestVersion, 1);
  assert.equal(
    projection.releaseIdentity.manifestDigest,
    fixture.expectation.releaseIdentity.manifestDigest
  );
  assert.deepEqual(
    projection.artifactIdentityLockBinding,
    fixture.expectation.artifactIdentityLockBinding
  );
  assert.deepEqual(projection.releaseEvidence, fixture.expectation.releaseEvidence);
  assert.deepEqual(projection.policyBinding, fixture.expectation.policyBinding);
  assert.deepEqual(projection.lockedBytes, fixture.expectation.lockedBytes);
  assert.deepEqual(projection.artifacts, fixture.expectation.artifacts);
  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.releaseIdentity), true);
  assert.equal(Object.isFrozen(projection.releaseIdentity.descriptor), true);
  assert.equal(Object.isFrozen(projection.artifactIdentityLockBinding), true);
  assert.equal(Object.isFrozen(projection.releaseEvidence), true);
  assert.equal(Object.isFrozen(projection.policyBinding), true);
  assert.equal(Object.isFrozen(projection.lockedBytes), true);
  assert.equal(Object.isFrozen(projection.artifacts), true);
  assert.equal(Object.isFrozen(projection.artifacts[0]), true);
});

test("loader rejects duplicate JSON keys and independently recomputes receipt digest", async (t) => {
  const duplicateFixture = await createCandidatePackage(t);
  await writeReceiptBytes(
    duplicateFixture,
    Buffer.from('{"schemaVersion":1,"schemaVersion":1}\n', "utf8")
  );
  await assert.rejects(loadCandidate(duplicateFixture), /JSON_DUPLICATE_KEY/u);

  const digestFixture = await createCandidatePackage(t);
  digestFixture.receipt.receiptDigest = "f".repeat(64);
  await writeReceiptBytes(digestFixture, jsonBytes(digestFixture.receipt));
  await assert.rejects(loadCandidate(digestFixture), /RECEIPT_DIGEST_MISMATCH/u);
});

test("loader applies strict UTF-8, no-BOM, and duplicate-key parsing to copied attachments", async (t) => {
  const cases = [
    {
      bytes: Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]),
      error: /JSON_BOM_FORBIDDEN/u
    },
    {
      bytes: Buffer.from([0xc3, 0x28]),
      error: /JSON_UTF8_INVALID/u
    },
    {
      bytes: Buffer.from('{"nested":{"a":1,"a":2}}\n', "utf8"),
      error: /JSON_DUPLICATE_KEY/u
    }
  ];
  for (const candidate of cases) {
    const fixture = await createCandidatePackage(t);
    await replaceAttachment(fixture, "raw-action-response", candidate.bytes, { refreshRawBinding: true });
    await assert.rejects(loadCandidate(fixture), candidate.error);
  }
});

test("loader rejects attachment drift even when an attacker refreshes outer receipt digests", async (t) => {
  const driftFixture = await createCandidatePackage(t);
  await writeFile(
    path.join(driftFixture.outputRoot, fileNames["raw-action-response"]),
    jsonBytes({ kind: "changed" })
  );
  await assert.rejects(loadCandidate(driftFixture), /ATTACHMENT_BINDING_MISMATCH/u);

  const credentialFixture = await createCandidatePackage(t);
  await replaceAttachment(
    credentialFixture,
    "raw-action-response",
    { kind: "sanitized-action-response", note: "postgres://single-user@database.example.com/app" },
    { refreshRawBinding: true }
  );
  await assert.rejects(loadCandidate(credentialFixture), /CREDENTIAL_PRESENT/u);

  for (const note of [
    "https://example.com/?access%5Ftoken=opaque",
    "https://example.com/callback#access_token=opaque",
    "https://example.com/callback#access%5Ftoken=opaque",
    "https://example.com/#/callback?access_token=opaque"
  ]) {
    const encodedFixture = await createCandidatePackage(t);
    await replaceAttachment(
      encodedFixture,
      "raw-action-response",
      { kind: "sanitized-action-response", note },
      { refreshRawBinding: true }
    );
    await assert.rejects(loadCandidate(encodedFixture), /CREDENTIAL_PRESENT/u);
  }
  for (const rawAction of [
    { kind: "sanitized-action-response", headers: [["Authorization", "opaque"]] },
    { kind: "sanitized-action-response", headers: [{ name: "X-API-Key", value: "opaque" }] },
    { kind: "sanitized-action-response", query: [["access%5Ftoken", "opaque"]] },
    { kind: "sanitized-action-response", AWS_SECRET_ACCESS_KEY: "opaque" },
    { kind: "sanitized-action-response", aws_access_key_id: "AKIAEXAMPLE" }
  ]) {
    const structuredFixture = await createCandidatePackage(t);
    await replaceAttachment(
      structuredFixture,
      "raw-action-response",
      rawAction,
      { refreshRawBinding: true }
    );
    await assert.rejects(loadCandidate(structuredFixture), /CREDENTIAL_PRESENT/u);
  }
});

test("loader independently cross-binds projection scope, operation, and derivation", async (t) => {
  const projectionFixture = await createCandidatePackage(t);
  const projection = JSON.parse(await readFile(
    path.join(projectionFixture.outputRoot, fileNames["synthetic-normalized-projection"]),
    "utf8"
  ));
  projection.finalReadback.accountId = "account-2";
  await replaceAttachment(projectionFixture, "synthetic-normalized-projection", projection);
  await assert.rejects(loadCandidate(projectionFixture), /PROJECTION_MISMATCH/u);

  const receiptFixture = await createCandidatePackage(t);
  receiptFixture.receipt.operation.resultActiveDeploymentId = "deployment-c";
  await writeReceipt(receiptFixture, receiptFixture.receipt);
  await assert.rejects(loadCandidate(receiptFixture), /PROJECTION_CROSS_BINDING_INVALID/u);
});

test("loader independently cross-binds artifact snapshots and closed hosting policy", async (t) => {
  const snapshotFixture = await createCandidatePackage(t);
  const finalSnapshot = JSON.parse(await readFile(
    path.join(snapshotFixture.outputRoot, fileNames["artifact-final"]),
    "utf8"
  ));
  finalSnapshot.buildVersion = "fedcba654321";
  await replaceAttachment(snapshotFixture, "artifact-final", finalSnapshot);
  await assert.rejects(loadCandidate(snapshotFixture), /ARTIFACT_CROSS_BINDING_INVALID/u);

  const policyFixture = await createCandidatePackage(t);
  const initialSnapshot = JSON.parse(await readFile(
    path.join(policyFixture.outputRoot, fileNames["artifact-initial"]),
    "utf8"
  ));
  initialSnapshot.releaseEvidenceExpectation.policyBinding.canonicalPolicy = canonicalJson({
    canonicalOrigin: "https://public.example.com",
    deploymentPlatform: "selected",
    publicReleaseGate: {
      cspBlockingModeVerified: true,
      realHostHeadersVerified: true
    }
  });
  initialSnapshot.releaseEvidenceExpectation.policyBinding.canonicalSha256 = sha256(
    initialSnapshot.releaseEvidenceExpectation.policyBinding.canonicalPolicy
  );
  initialSnapshot.releaseEvidenceExpectationDigest = sha256(canonicalJson(
    initialSnapshot.releaseEvidenceExpectation
  ));
  policyFixture.receipt.artifactIdentity.expectationDigest = initialSnapshot.releaseEvidenceExpectationDigest;
  policyFixture.receipt.artifactIdentity.hostingPolicy.canonicalSha256 =
    initialSnapshot.releaseEvidenceExpectation.policyBinding.canonicalSha256;
  await replaceAttachment(policyFixture, "artifact-initial", initialSnapshot);
  await assert.rejects(loadCandidate(policyFixture), /POLICY_NOT_CLOSED|ARTIFACT_CROSS_BINDING_INVALID/u);

  const policyIdFixture = await createCandidatePackage(t);
  const policyIdSnapshot = JSON.parse(await readFile(
    path.join(policyIdFixture.outputRoot, fileNames["artifact-initial"]),
    "utf8"
  ));
  policyIdSnapshot.releaseEvidenceExpectation.policyBinding.policyId = "attacker-policy-v2";
  policyIdSnapshot.releaseEvidenceExpectationDigest = sha256(canonicalJson(
    policyIdSnapshot.releaseEvidenceExpectation
  ));
  policyIdFixture.receipt.artifactIdentity.hostingPolicy.policyId = "attacker-policy-v2";
  policyIdFixture.receipt.artifactIdentity.expectationDigest = policyIdSnapshot.releaseEvidenceExpectationDigest;
  await replaceAttachment(policyIdFixture, "artifact-initial", policyIdSnapshot);
  await assert.rejects(loadCandidate(policyIdFixture), /POLICY_SOURCE_MISMATCH/u);

  const headersFixture = await createCandidatePackage(t);
  const headersSnapshot = JSON.parse(await readFile(
    path.join(headersFixture.outputRoot, fileNames["artifact-initial"]),
    "utf8"
  ));
  headersSnapshot.releaseEvidenceExpectation.artifacts =
    headersSnapshot.releaseEvidenceExpectation.artifacts.filter((entry) => entry.path !== "_headers");
  headersSnapshot.releaseEvidenceExpectation.artifactSetDigest = sha256(canonicalJson(
    headersSnapshot.releaseEvidenceExpectation.artifacts
  ));
  headersSnapshot.releaseEvidenceExpectationDigest = sha256(canonicalJson(
    headersSnapshot.releaseEvidenceExpectation
  ));
  await replaceAttachment(headersFixture, "artifact-initial", headersSnapshot);
  await assert.rejects(loadCandidate(headersFixture), /ARTIFACT_SNAPSHOT_INVALID/u);
});

test("loader rejects missing, pending, malformed, mismatched, and hard-linked terminal markers", async (t) => {
  const missingFixture = await createCandidatePackage(t);
  await unlink(missingFixture.terminalCommitPath);
  await assert.rejects(loadCandidate(missingFixture), /OUTPUT_SET_INVALID/u);

  const pendingFixture = await createCandidatePackage(t);
  await rename(
    pendingFixture.terminalCommitPath,
    path.join(pendingFixture.outputRoot, pendingTerminalCommitFileName)
  );
  await assert.rejects(loadCandidate(pendingFixture), /OUTPUT_SET_INVALID/u);

  for (const marker of [
    `${"0".repeat(64)}\n`,
    `${"A".repeat(64)}\n`,
    "0".repeat(64)
  ]) {
    const malformedFixture = await createCandidatePackage(t);
    await writeFile(malformedFixture.terminalCommitPath, marker, "utf8");
    await assert.rejects(loadCandidate(malformedFixture), /TERMINAL_COMMIT_MARKER_INVALID/u);
  }

  const hardlinkFixture = await createCandidatePackage(t);
  const externalMarkerPath = path.join(hardlinkFixture.root, "external-terminal-marker.sha256");
  await writeFile(
    externalMarkerPath,
    `${sha256(await readFile(hardlinkFixture.receiptPath))}\n`,
    "utf8"
  );
  await unlink(hardlinkFixture.terminalCommitPath);
  await link(externalMarkerPath, hardlinkFixture.terminalCommitPath);
  await assert.rejects(loadCandidate(hardlinkFixture), /FILE_UNSAFE|FILE_IDENTITY_REUSED/u);
});

test("loader rejects partial, extra, hard-linked, and aliased output sets", async (t) => {
  const extraFixture = await createCandidatePackage(t);
  await writeFile(path.join(extraFixture.outputRoot, "unexpected.tmp"), "partial", "utf8");
  await assert.rejects(loadCandidate(extraFixture), /OUTPUT_SET_INVALID/u);

  const partialFixture = await createCandidatePackage(t);
  await unlink(partialFixture.receiptPath);
  await assert.rejects(loadCandidate(partialFixture), /OUTPUT_SET_INVALID/u);

  const hardlinkFixture = await createCandidatePackage(t);
  const actionPath = path.join(hardlinkFixture.outputRoot, fileNames["raw-action-response"]);
  const readbackPath = path.join(hardlinkFixture.outputRoot, fileNames["raw-final-readback"]);
  await unlink(readbackPath);
  await link(actionPath, readbackPath);
  await assert.rejects(loadCandidate(hardlinkFixture), /FILE_UNSAFE|FILE_IDENTITY_REUSED/u);

  const aliasFixture = await createCandidatePackage(t);
  const realOutputRoot = path.join(aliasFixture.root, "candidate-output-physical");
  await rename(aliasFixture.outputRoot, realOutputRoot);
  await symlink(
    realOutputRoot,
    aliasFixture.outputRoot,
    process.platform === "win32" ? "junction" : "dir"
  );
  await assert.rejects(loadCandidate(aliasFixture), /ROOT_LOCK_INVALID|PATH_ALIAS/u);
});

test("loader fixes cwd as the only binding base and keeps source bindings outside output", async (t) => {
  const baseFixture = await createCandidatePackage(t);
  assert.throws(() => parseProviderDeploymentCandidateLoaderInput({
    bindingRoot: workspaceRoot,
    outputRoot: `${baseFixture.outputRoot}${path.sep}`,
    receiptPath: baseFixture.receiptPath
  }), /PATH_INVALID/u);
  assert.throws(() => parseProviderDeploymentCandidateLoaderInput({
    bindingRoot: workspaceRoot,
    outputRoot: baseFixture.outputRoot,
    receiptPath: path.join(baseFixture.outputRoot, "other.json")
  }), /RECEIPT_PATH_INVALID/u);
  await assert.rejects(loadCandidate(baseFixture, { bindingRoot: baseFixture.root }), /BINDING_ROOT_CWD_MISMATCH/u);

  const sourceFixture = await createCandidatePackage(t);
  sourceFixture.receipt.rawInputs.finalReadback.path = sourceFixture.receipt.rawInputs.actionResponse.path;
  await writeReceipt(sourceFixture, sourceFixture.receipt);
  await assert.rejects(loadCandidate(sourceFixture), /RAW_BINDING_MISMATCH/u);
});

test("loader remains outside the formal Release Evidence test aggregate", async () => {
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  assert.doesNotMatch(packageJson.scripts["test:release-evidence"], /provider-deployment-candidate-loader/u);
});
