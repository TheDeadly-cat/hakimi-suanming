import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME
} from "./provider-deployment-candidate-sequence-loader.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const provider = "fixture-provider-neutral";
const origin = "https://staging.example.com";
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
const terminalCommitFileName = "provider-deployment-candidate-receipt-commit.sha256";
const hostingPolicyPath = path.join(workspaceRoot, "docs", "security", "hosting-security-policy.json");
const hostingPolicyBytes = await readFile(hostingPolicyPath);
const hostingPolicy = JSON.parse(hostingPolicyBytes.toString("utf8"));
const canonicalHostingPolicy = canonicalJson(hostingPolicy);

function normalizedRelative(from, to) {
  return path.relative(from, to).replaceAll("\\", "/");
}

export function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function digestReceipt(document) {
  const { receiptDigest: _receiptDigest, ...unsigned } = document;
  return sha256(canonicalJson(unsigned));
}

function identityFor(variant) {
  return Object.freeze({
    evidenceId: `hre1-${sha256(`evidence:${variant}`).slice(0, 32)}`,
    buildVersion: sha256(`build:${variant}`).slice(0, 12),
    manifestDigest: sha256(`manifest:${variant}`),
    identityLockSha256: sha256(`identity-lock-file:${variant}`),
    identityLockDigest: sha256(`identity-lock-document:${variant}`),
    releaseEvidenceSha256: sha256(`release-evidence:${variant}`)
  });
}

function operationFor(action, overrides = {}) {
  const deploy = action === "deploy_candidate";
  const defaults = deploy ? {
    operationId: "operation-deploy-001",
    beforeActiveDeploymentId: "deployment-a",
    requestedTargetDeploymentId: null,
    resultActiveDeploymentId: "deployment-b",
    immutableDeploymentUrl: "https://deployment-b.example.net",
    resultDerivation: "provider_assigned_new",
    derivedFromDeploymentId: null,
    sequenceEligible: true,
    startedAt: "2020-01-01T00:00:00.000Z",
    acceptedAt: "2020-01-01T00:00:01.000Z",
    completedAt: "2020-01-01T00:00:02.000Z",
    observedAt: "2020-01-01T00:00:03.000Z"
  } : {
    operationId: "operation-restore-001",
    beforeActiveDeploymentId: "deployment-b",
    requestedTargetDeploymentId: "deployment-a",
    resultActiveDeploymentId: "deployment-a",
    immutableDeploymentUrl: "https://deployment-a.example.net",
    resultDerivation: "activated_requested",
    derivedFromDeploymentId: null,
    sequenceEligible: true,
    startedAt: "2020-01-01T00:10:00.000Z",
    acceptedAt: "2020-01-01T00:10:01.000Z",
    completedAt: "2020-01-01T00:10:02.000Z",
    observedAt: "2020-01-01T00:10:03.000Z"
  };
  return { ...defaults, ...overrides };
}

function projectionFor({ action, candidateProvider, accountId, projectId, environment, providerStatus, operation }) {
  return {
    schemaVersion: 1,
    recordType: "synthetic_provider_deployment_projection_v1",
    provider: candidateProvider,
    action,
    actionResponse: {
      provider: candidateProvider,
      action,
      operationId: operation.operationId,
      accountId,
      projectId,
      environment,
      origin,
      beforeActiveDeploymentId: operation.beforeActiveDeploymentId,
      requestedTargetDeploymentId: operation.requestedTargetDeploymentId,
      resultActiveDeploymentId: operation.resultActiveDeploymentId,
      immutableDeploymentUrl: operation.immutableDeploymentUrl,
      resultDerivation: operation.resultDerivation,
      derivedFromDeploymentId: operation.derivedFromDeploymentId,
      sequenceEligible: operation.sequenceEligible,
      startedAt: operation.startedAt,
      acceptedAt: operation.acceptedAt,
      completedAt: operation.completedAt,
      credentialMaterialEmbedded: false
    },
    finalReadback: {
      provider: candidateProvider,
      action,
      operationId: operation.operationId,
      accountId,
      projectId,
      environment,
      origin,
      activeDeploymentId: operation.resultActiveDeploymentId,
      immutableDeploymentUrl: operation.immutableDeploymentUrl,
      providerStatus,
      terminal: true,
      successful: true,
      observedAt: operation.observedAt,
      credentialMaterialEmbedded: false
    }
  };
}

function artifactExpectation(root, variant) {
  const identity = identityFor(variant);
  const artifactHashes = {
    "_headers": sha256(`${variant}:headers`),
    "index.html": sha256(`${variant}:index`),
    "manifest.webmanifest": sha256(`${variant}:manifest`),
    "sw.js": sha256(`${variant}:worker`)
  };
  const artifacts = Object.entries(artifactHashes).map(([artifactPath, digest], index) => ({
    path: artifactPath,
    size: index + 1,
    sha256: digest
  }));
  const artifactSetDigest = sha256(canonicalJson(artifacts));
  return {
    expectationKind: "schema-validated-release-evidence-expectation-v1",
    evidenceId: identity.evidenceId,
    artifactSetDigest,
    descriptor: structuredClone(descriptor),
    releaseIdentity: {
      descriptor: structuredClone(descriptor),
      manifestVersion: 1,
      manifestDigest: identity.manifestDigest,
      buildVersion: identity.buildVersion,
      evidenceId: identity.evidenceId
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
      sha256: identity.identityLockSha256,
      lockDigest: identity.identityLockDigest,
      artifactSetDigest
    },
    releaseEvidence: {
      size: 123,
      sha256: identity.releaseEvidenceSha256
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
    releaseEvidenceId: expectation.evidenceId,
    descriptor: structuredClone(descriptor),
    buildVersion: expectation.releaseIdentity.buildVersion,
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

export async function createCandidatePackage(t, {
  action,
  variant,
  candidateProvider = provider,
  accountId = "account-1",
  projectId = "project-1",
  environment = "staging",
  adapterId = "fixture-synthetic-adapter",
  adapterVersion = "1.0.0",
  providerStatus = "success",
  operationOverrides = {},
  receiptId = null,
  offlineOrder = null
}) {
  const tmpRoot = path.join(workspaceRoot, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(path.join(tmpRoot, `provider-sequence-${action === "deploy_candidate" ? "deploy" : "restore"}-`));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outputRoot = path.join(root, "candidate-output");
  const rawRoot = path.join(root, "private-raw");
  const receiptPath = path.join(outputRoot, "provider-deployment-candidate-receipt.json");
  await Promise.all([mkdir(outputRoot), mkdir(rawRoot)]);

  const operation = operationFor(action, operationOverrides);
  const projection = projectionFor({
    action,
    candidateProvider,
    accountId,
    projectId,
    environment,
    providerStatus,
    operation
  });
  const expectation = artifactExpectation(root, variant);
  const offline = offlineOrder ?? (action === "deploy_candidate" ? {
    startedAt: "2020-01-01T01:00:00.000Z",
    initialAt: "2020-01-01T01:00:01.000Z",
    finalAt: "2020-01-01T01:00:02.000Z",
    completedAt: "2020-01-01T01:00:03.000Z"
  } : {
    startedAt: "2020-01-01T00:50:00.000Z",
    initialAt: "2020-01-01T00:50:01.000Z",
    finalAt: "2020-01-01T00:50:02.000Z",
    completedAt: "2020-01-01T00:50:03.000Z"
  });
  const initialArtifact = artifactSnapshot({ phase: "initial", capturedAt: offline.initialAt, expectation });
  const finalArtifact = artifactSnapshot({ phase: "final", capturedAt: offline.finalAt, expectation });
  const rawActionBytes = jsonBytes({ kind: "sanitized-action-response", candidateProvider, operation: operation.operationId });
  const rawReadbackBytes = jsonBytes({ kind: "sanitized-final-readback", candidateProvider, operation: operation.operationId });
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
    receiptId: receiptId ?? (action === "deploy_candidate"
      ? "sequence-run-0001-deploy-candidate"
      : "sequence-run-0002-restore-baseline"),
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    verificationKind: "synthetic-offline-adapter-contract-existing-sanitized-files",
    adapter: {
      adapterId,
      adapterVersion,
      trustClass: "synthetic_contract_only",
      providerAuthenticated: false
    },
    candidateScope: {
      provider: candidateProvider,
      action,
      accountId,
      projectId,
      environment,
      origin,
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
      releaseEvidenceId: expectation.evidenceId,
      descriptor: structuredClone(descriptor),
      buildVersion: expectation.releaseIdentity.buildVersion,
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
    startedAt: offline.startedAt,
    completedAt: offline.completedAt,
    receiptDigest: "0".repeat(64)
  };
  receipt.receiptDigest = digestReceipt(receipt);
  for (const [role, fileName] of Object.entries(fileNames)) {
    await writeFile(path.join(outputRoot, fileName), attachmentBytes.get(role));
  }
  const receiptBytes = jsonBytes(receipt);
  await writeFile(receiptPath, receiptBytes);
  await writeFile(
    path.join(outputRoot, terminalCommitFileName),
    Buffer.from(`${sha256(receiptBytes)}\n`, "utf8")
  );
  return { root, outputRoot, receiptPath, receipt };
}

export async function createValidPair(t, overrides = {}) {
  const deploy = await createCandidatePackage(t, {
    action: "deploy_candidate",
    variant: overrides.deployVariant ?? "candidate-b",
    ...(overrides.deploy ?? {})
  });
  const restore = await createCandidatePackage(t, {
    action: "restore_baseline",
    variant: overrides.restoreVariant ?? "baseline-a",
    ...(overrides.restore ?? {})
  });
  return { deploy, restore };
}

export function sequenceArgs(pair, overrides = {}) {
  return {
    bindingRoot: workspaceRoot,
    deployOutputRoot: pair.deploy.outputRoot,
    deployReceiptPath: pair.deploy.receiptPath,
    restoreOutputRoot: pair.restore.outputRoot,
    restoreReceiptPath: pair.restore.receiptPath,
    cwd: workspaceRoot,
    ...overrides
  };
}

export function sequenceOutputRoot(pair, suffix = "sequence-output") {
  return path.join(pair.deploy.root, suffix);
}

export function writerArgs(pair, outputRoot, overrides = {}) {
  return {
    ...sequenceArgs(pair),
    sequenceOutputRoot: outputRoot,
    ...overrides
  };
}

export function runWriterCli(environment) {
  return spawnSync(
    process.execPath,
    [path.join(workspaceRoot, "scripts", "provider-deployment-candidate-sequence-writer.mjs")],
    {
      cwd: workspaceRoot,
      env: environment,
      encoding: "utf8",
      timeout: 30_000
    }
  );
}

export function verifierArgs(pair, outputRoot, overrides = {}) {
  return {
    ...sequenceArgs(pair),
    sequenceOutputRoot: outputRoot,
    sequencePath: path.join(outputRoot, PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_FILE_NAME),
    ...overrides
  };
}
