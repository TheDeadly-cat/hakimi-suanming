import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  appendFile,
  link,
  readFile,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadVerifiedDeployedHostCandidateOutput } from "./deployed-host-candidate-loader.mjs";
import {
  DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES,
  DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES,
  DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES,
  DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES,
  verifyDeployedPwaEvidenceV3
} from "./deployed-pwa-evidence-v3-lib.mjs";
import {
  DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_ENVIRONMENT_KEYS,
  DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_SCHEMA_ID,
  buildDeployedPwaHostProviderCompositionFailure,
  composeDeployedPwaHostProviderCandidate,
  computeDeployedPwaHostProviderCompositionIdentity,
  deployedPwaHostProviderCompositionTestOnly,
  parseDeployedPwaHostProviderCompositionInput,
} from "./deployed-pwa-host-provider-composition.mjs";
import {
  cleanupCompositionCandidateHappyPathFixture,
  compositionFixtureContract,
  createCompositionCandidateHappyPathFixture
} from "./deployed-pwa-host-provider-composition.test-fixture.mjs";
import { persistDeployedPwaEvidenceV3TestFixture } from "./deployed-pwa-evidence-v3.test-fixture.mjs";
import { loadVerifiedProviderDeploymentCandidateOutput } from "./provider-deployment-candidate-loader.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

const sourceWorkspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compositionCliPath = path.join(
  sourceWorkspace,
  "scripts",
  "deployed-pwa-host-provider-composition.mjs"
);

function relativePath(root, candidate) {
  return path.relative(root, candidate).replaceAll("\\", "/");
}

async function fileBinding(root, filePath) {
  const bytes = await readFile(filePath);
  return {
    path: relativePath(root, filePath),
    size: bytes.length,
    sha256: sha256(bytes)
  };
}

function pwaReceiptBindings(evidence) {
  return [
    ["artifact-identity-lock", evidence.artifactIdentity.identityLock],
    ["formal-release-receipt", evidence.artifactIdentity.formalReceipt],
    ["host-receipt", evidence.receipts.host],
    ["edge-browser-receipt", evidence.receipts.edge.receipt],
    ...DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES.map((role) => [
      `edge-${role}`,
      evidence.receipts.edge.receipt.attachments.find((entry) => entry.role === role)
    ]),
    ["chrome-browser-receipt", evidence.receipts.chrome.receipt],
    ...DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES.map((role) => [
      `chrome-${role}`,
      evidence.receipts.chrome.receipt.attachments.find((entry) => entry.role === role)
    ]),
    ["provider-deployment-receipt", evidence.receipts.deployment]
  ].map(([role, binding]) => ({
    role,
    path: binding.path,
    size: binding.size,
    sha256: binding.sha256
  })).sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

async function verifiedProjectionEndpoints(compositionFixture) {
  const { input, fixture } = compositionFixture;
  const [hostResult, providerResult, pwaResult] = await Promise.all([
    loadVerifiedDeployedHostCandidateOutput({
      bindingRoot: input.bindingRoot,
      outputRoot: input.hostOutputRoot,
      receiptPath: input.hostReceiptPath,
      artifactRoot: input.artifactRoot,
      artifactLock: input.artifactLock,
      releaseEvidenceId: input.releaseEvidenceId,
      cwd: input.bindingRoot
    }),
    loadVerifiedProviderDeploymentCandidateOutput({
      bindingRoot: input.bindingRoot,
      outputRoot: input.providerOutputRoot,
      receiptPath: input.providerReceiptPath,
      cwd: input.bindingRoot
    }),
    verifyDeployedPwaEvidenceV3({
      cwd: input.bindingRoot,
      inputPath: input.pwaInputPath,
      artifactRoot: input.artifactRoot,
      receiptsRoot: input.pwaReceiptsRoot,
      privateRoot: input.pwaPrivateRoot
    })
  ]);
  const evidence = JSON.parse(await readFile(input.pwaInputPath, "utf8"));
  const receiptBindings = pwaReceiptBindings(evidence);
  const inputBinding = await fileBinding(input.bindingRoot, input.pwaInputPath);
  const sidecarBinding = await fileBinding(input.bindingRoot, `${input.pwaInputPath}.sha256`);
  const hostReceiptBinding = await fileBinding(input.bindingRoot, input.hostReceiptPath);
  const providerReceiptBinding = await fileBinding(input.bindingRoot, input.providerReceiptPath);
  return {
    input,
    hostEndpoint: {
      result: hostResult,
      outputRoot: relativePath(input.bindingRoot, input.hostOutputRoot),
      receiptBinding: hostReceiptBinding,
      exactFileCount: 5,
      exactFileSetDigest: sha256("host-exact-set"),
      packageProjectionDigest: sha256("host-projection")
    },
    providerEndpoint: {
      result: providerResult,
      outputRoot: relativePath(input.bindingRoot, input.providerOutputRoot),
      receiptBinding: providerReceiptBinding,
      exactFileCount: 7,
      exactFileSetDigest: sha256("provider-exact-set"),
      packageProjectionDigest: sha256("provider-projection")
    },
    pwaEndpoint: {
      evidence,
      verifierResult: pwaResult,
      inputBinding,
      sidecarBinding,
      receiptBindings,
      receiptBindingSetDigest: sha256(canonicalJson(receiptBindings)),
      packageProjectionDigest: sha256("pwa-projection")
    },
    fixture
  };
}

async function withCompositionFixture(callback) {
  const compositionFixture = await createCompositionCandidateHappyPathFixture({
    sourceWorkspace
  });
  try {
    return await callback(compositionFixture);
  } finally {
    await cleanupCompositionCandidateHappyPathFixture(compositionFixture);
  }
}

function validInputShape() {
  const root = path.join(sourceWorkspace, "tmp", "composition-input-contract");
  return {
    bindingRoot: root,
    artifactRoot: path.join(root, "artifact"),
    artifactLock: path.join(root, "pwa-receipts", "release-artifact-identity.json"),
    releaseEvidenceId: `hre1-${"a".repeat(32)}`,
    hostOutputRoot: path.join(root, "host-output"),
    hostReceiptPath: path.join(root, "host-output", "host-receipt.json"),
    providerOutputRoot: path.join(root, "provider-output"),
    providerReceiptPath: path.join(root, "provider-output", "provider-deployment-candidate-receipt.json"),
    pwaInputPath: path.join(root, "pwa-private", "deployed-pwa-evidence-v3.json"),
    pwaReceiptsRoot: path.join(root, "pwa-receipts"),
    pwaPrivateRoot: path.join(root, "pwa-private")
  };
}

test("composition input is exact, canonical, contained, and root-disjoint", () => {
  const input = validInputShape();
  assert.deepEqual(parseDeployedPwaHostProviderCompositionInput(input), input);
  assert.throws(
    () => parseDeployedPwaHostProviderCompositionInput({ ...input, surprise: true }),
    /DEPLOYED_COMPOSITION_INPUT_INVALID/u
  );
  assert.throws(
    () => parseDeployedPwaHostProviderCompositionInput({
      ...input,
      providerOutputRoot: path.join(input.hostOutputRoot, "provider"),
      providerReceiptPath: path.join(input.hostOutputRoot, "provider", "provider-deployment-candidate-receipt.json")
    }),
    /DEPLOYED_COMPOSITION_ROOTS_OVERLAP/u
  );
  assert.throws(
    () => parseDeployedPwaHostProviderCompositionInput({
      ...input,
      artifactLock: path.join(input.bindingRoot, "outside-lock.json")
    }),
    /DEPLOYED_COMPOSITION_PATH_OUTSIDE_ROOT/u
  );
  assert.throws(
    () => parseDeployedPwaHostProviderCompositionInput({
      ...input,
      hostReceiptPath: path.join(input.hostOutputRoot, "renamed.json")
    }),
    /DEPLOYED_COMPOSITION_HOST_RECEIPT_PATH_INVALID/u
  );
});

test("full three-consumer composition remains not admitted and binds explicit package/source/artifact closure", async () => {
  await withCompositionFixture(async (compositionFixture) => {
    const document = await composeDeployedPwaHostProviderCandidate(
      compositionFixture.input,
      { cwd: compositionFixture.fixture.workspace }
    );
    assert.equal(document.status, "not_admitted");
    assert.equal(document.usableForAdmission, false);
    assert.equal(document.trustClass, "untrusted_candidate_composition");
    assert.equal(Object.values(document.claims).every((value) => value === false), true);
    assert.equal(Object.values(document.limitations).every((value) => value === false), true);
    assert.equal(Object.values(document.admissionGates).every((value) => value === false), true);
    assert.equal(document.authorizationBoundary.publicDeploymentAuthorized, false);
    assert.equal(document.authorizationBoundary.publicReleaseAuthorized, false);
    assert.equal(document.mutationBoundary.mutationEpochCapability, "absent_schema13");
    assert.equal(document.mutationBoundary.continuousMutationEpochVerified, false);
    assert.equal(document.mutationBoundary.intervalMutationExclusionClaimed, false);
    assert.equal(document.mutationBoundary.abaMutationExclusionClaimed, false);
    assert.equal(document.mutationBoundary.samePermissionMutationExcluded, false);
    assert.equal(document.scope.releaseIdentity.descriptor.dbGeneration, "legacy-v13");
    assert.equal(document.scope.releaseIdentity.descriptor.targetSchema, 13);
    assert.equal(document.scope.releaseIdentity.descriptor.migrationId, null);
    assert.equal(document.packageBindings.host.exactFileCount, 5);
    assert.equal(document.packageBindings.provider.exactFileCount, 7);
    assert.equal(document.packageBindings.host.terminalGateBinding.size, 65);
    assert.equal(document.packageBindings.provider.terminalGateBinding.size, 65);
    assert.equal(document.packageBindings.pwaV3.receiptFileCount, 26);
    assert.equal(
      document.packageBindings.provider.operationCompletedAt,
      compositionFixtureContract.providerOperationCompletedAt
    );
    assert.equal(document.commonArtifactIdentity.identityLock.path, relativePath(
      compositionFixture.input.bindingRoot,
      compositionFixture.input.artifactLock
    ));
    assert.equal(document.commonArtifactIdentity.components.applicationShell.path, "index.html");
    assert.equal(document.commonArtifactIdentity.hostingPolicy.path, "docs/security/hosting-security-policy.json");
    assert.deepEqual(Object.keys(document.sourceBindings), [
      "composition-schema",
      "host-receipt-schema",
      "provider-receipt-schema",
      "pwa-v3-schema",
      "pwa-v3-policy",
      "hosting-policy",
      "release-decisions",
      "release-evidence-schema"
    ]);
    assert.equal(
      document.sourceSetDigest,
      sha256(canonicalJson(document.sourceBindings))
    );
    assert.equal(Object.isFrozen(document), true);
    assert.equal(Object.isFrozen(document.commonArtifactIdentity.components), true);

    const schema = JSON.parse(await readFile(
      path.join(sourceWorkspace, "docs", "release", "deployed-pwa-host-provider-composition-candidate-v1.schema.json"),
      "utf8"
    ));
    const validator = compileEvidenceSchemaForId(
      schema,
      DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_SCHEMA_ID
    );
    assert.deepEqual(
      deployedPwaHostProviderCompositionTestOnly.validateDocumentShapeAndIdentity(document, validator),
      document
    );

    const idTamper = structuredClone(document);
    idTamper.compositionId = `hpcomp1-${"f".repeat(32)}`;
    assert.throws(
      () => deployedPwaHostProviderCompositionTestOnly.validateDocumentShapeAndIdentity(idTamper, validator),
      /DEPLOYED_COMPOSITION_IDENTITY_INVALID/u
    );
    const sourceSwap = structuredClone(document);
    sourceSwap.sourceBindings["host-receipt-schema"].path =
      sourceSwap.sourceBindings["provider-receipt-schema"].path;
    assert.throws(
      () => deployedPwaHostProviderCompositionTestOnly.validateDocumentShapeAndIdentity(sourceSwap, validator),
      /DEPLOYED_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u
    );
    const claimElevation = structuredClone(document);
    claimElevation.claims.releaseReady = true;
    assert.throws(
      () => deployedPwaHostProviderCompositionTestOnly.validateDocumentShapeAndIdentity(claimElevation, validator),
      /DEPLOYED_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u
    );
    const unselectedPlatform = structuredClone(document);
    unselectedPlatform.scope.candidatePlatform = "unselected";
    Object.assign(
      unselectedPlatform,
      computeDeployedPwaHostProviderCompositionIdentity(unselectedPlatform)
    );
    assert.throws(
      () => deployedPwaHostProviderCompositionTestOnly.validateDocumentShapeAndIdentity(
        unselectedPlatform,
        validator
      ),
      /DEPLOYED_COMPOSITION_DOCUMENT_SCHEMA_INVALID/u
    );

    const cliEnvironment = Object.fromEntries(
      Object.entries(DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_ENVIRONMENT_KEYS)
        .map(([inputKey, environmentKey]) => [environmentKey, compositionFixture.input[inputKey]])
    );
    const cliResult = spawnSync(process.execPath, [compositionCliPath], {
      cwd: compositionFixture.fixture.workspace,
      encoding: "utf8",
      env: { ...process.env, ...cliEnvironment }
    });
    assert.equal(cliResult.status, 1);
    assert.equal(cliResult.stderr, "");
    const cliDocument = JSON.parse(cliResult.stdout);
    assert.equal(cliDocument.status, "not_admitted");
    assert.equal(cliDocument.usableForAdmission, false);
    assert.equal(Object.values(cliDocument.claims).every((value) => value === false), true);
  });
});

test("pure cross-binding validator rejects artifact, origin, deployment, chronology, provenance, and claim drift", async () => {
  await withCompositionFixture(async (compositionFixture) => {
    const verified = await verifiedProjectionEndpoints(compositionFixture);
    const baseline = deployedPwaHostProviderCompositionTestOnly.validateProjection(verified);
    assert.equal(baseline.scope.releaseIdentity.descriptor.targetSchema, 13);
    assert.equal(baseline.packageBindings.host.sourceVerificationKind, "synthetic-offline-candidate-contract");
    assert.equal(baseline.packageBindings.provider.adapterId, "composition-synthetic-adapter");
    const pwaHostDocument = JSON.parse(await readFile(path.join(
      compositionFixture.fixture.workspace,
      ...verified.pwaEndpoint.evidence.receipts.host.path.split("/")
    ), "utf8"));
    assert.equal(pwaHostDocument.verificationKind, "real-network");
    assert.equal(pwaHostDocument.realHostVerified, true);

    const cases = [
      ["provider current-source elevation", /PROVIDER_RESULT_INVALID/u, (candidate) => {
        candidate.providerEndpoint.result.currentArtifactProjection = {};
      }],
      ["recorded artifact drift", /HOST_PROVIDER_ARTIFACT_MISMATCH/u, (candidate) => {
        candidate.providerEndpoint.result.recordedArtifactProjection.releaseIdentity.manifestDigest = "f".repeat(64);
      }],
      ["origin drift", /PLATFORM_ORIGIN_MISMATCH/u, (candidate) => {
        candidate.providerEndpoint.result.document.candidateScope.origin = "https://other.example.com";
      }],
      ["deployment drift", /DEPLOYMENT_PROJECTION_MISMATCH/u, (candidate) => {
        candidate.pwaEndpoint.evidence.receipts.deployment.deploymentId = "fixture-deployment-999";
      }],
      ["chronology drift", /CANDIDATE_CHRONOLOGY_INVALID/u, (candidate) => {
        candidate.providerEndpoint.result.document.operation.finalReadbackObservedAt = "2026-08-26T00:02:01.000Z";
      }],
      ["host provenance relabel", /HOST_PROVENANCE_LABEL_MISMATCH/u, (candidate) => {
        candidate.hostEndpoint.result.observationLabel = "node_http_pinned_real_network_v1";
      }],
      ["host authority elevation", /HOST_RESULT_INVALID/u, (candidate) => {
        candidate.hostEndpoint.result.claims.realHostVerified = true;
      }],
      ["provider authority elevation", /PROVIDER_RESULT_INVALID/u, (candidate) => {
        candidate.providerEndpoint.result.claims.providerAuthenticated = true;
        candidate.providerEndpoint.result.claims.deploymentOperationObserved = true;
      }],
      ["PWA claim elevation", /PWA_RESULT_INVALID/u, (candidate) => {
        candidate.pwaEndpoint.verifierResult.claims.releaseReady = true;
      }],
      ["missing deployment", /PWA_DEPLOYMENT_RECEIPT_REQUIRED/u, (candidate) => {
        candidate.pwaEndpoint.evidence.receipts.deployment = null;
      }]
    ];
    for (const [label, expected, mutate] of cases) {
      const candidate = structuredClone(verified);
      mutate(candidate);
      assert.throws(
        () => deployedPwaHostProviderCompositionTestOnly.validateProjection(candidate),
        expected,
        label
      );
    }
  });
});

test("composition refuses a PWA package with a missing or oversized provider deployment binding", async () => {
  await withCompositionFixture(async (compositionFixture) => {
    const deployment = compositionFixture.fixture.evidence.receipts.deployment;
    await unlink(path.join(compositionFixture.fixture.workspace, ...deployment.path.split("/")));
    compositionFixture.fixture.evidence.receipts.deployment = null;
    await persistDeployedPwaEvidenceV3TestFixture(compositionFixture.fixture);
    await assert.rejects(
      composeDeployedPwaHostProviderCandidate(
        compositionFixture.input,
        { cwd: compositionFixture.fixture.workspace }
      ),
      /DEPLOYED_COMPOSITION_PWA_DEPLOYMENT_RECEIPT_REQUIRED/u
    );
  });
  await withCompositionFixture(async (compositionFixture) => {
    compositionFixture.fixture.evidence.receipts.deployment.size = (32 * 1024 * 1024) + 1;
    await persistDeployedPwaEvidenceV3TestFixture(compositionFixture.fixture);
    await assert.rejects(
      composeDeployedPwaHostProviderCandidate(
        compositionFixture.input,
        { cwd: compositionFixture.fixture.workspace }
      ),
      /DEPLOYED_COMPOSITION_PWA_RECEIPT_BINDING_INVALID/u
    );
  });
  await withCompositionFixture(async (compositionFixture) => {
    const evidence = compositionFixture.fixture.evidence;
    const bindings = [
      evidence.artifactIdentity.identityLock,
      evidence.artifactIdentity.formalReceipt,
      evidence.receipts.host,
      evidence.receipts.edge.receipt,
      ...evidence.receipts.edge.receipt.attachments,
      evidence.receipts.chrome.receipt,
      ...evidence.receipts.chrome.receipt.attachments,
      evidence.receipts.deployment
    ];
    for (const binding of bindings) {
      binding.size = 8 * 1024 * 1024;
    }
    await persistDeployedPwaEvidenceV3TestFixture(compositionFixture.fixture);
    await assert.rejects(
      composeDeployedPwaHostProviderCandidate(
        compositionFixture.input,
        { cwd: compositionFixture.fixture.workspace }
      ),
      /DEPLOYED_COMPOSITION_PWA_RECEIPT_SET_SIZE_INVALID/u
    );
  });
});

test("terminal source raw-byte drift fails even when canonical JSON stays equal", async () => {
  await withCompositionFixture(async (compositionFixture) => {
    await assert.rejects(
      composeDeployedPwaHostProviderCandidate(compositionFixture.input, {
        cwd: compositionFixture.fixture.workspace,
        onBeforeTerminalEndpointSnapshotsForTest: async () => {
          await appendFile(
            path.join(
              compositionFixture.fixture.workspace,
              "docs",
              "release",
              "deployed-pwa-host-provider-composition-candidate-v1.schema.json"
            ),
            "\n",
            "utf8"
          );
        }
      }),
      /DEPLOYED_COMPOSITION_ENDPOINT_SNAPSHOT_CHANGED/u
    );
  });
});

test("terminal host/provider package sets, receipt bytes, and shared lock drift are rejected", async () => {
  const cases = [
    ["host extra file", /OUTPUT_SET_INVALID|FILE_SET_INVALID/u, async (fixture) => {
      await writeFile(path.join(fixture.input.hostOutputRoot, "late.tmp"), "late", "utf8");
    }],
    ["provider extra file", /OUTPUT_SET_INVALID|FILE_SET_INVALID/u, async (fixture) => {
      await writeFile(path.join(fixture.input.providerOutputRoot, "late.tmp"), "late", "utf8");
    }],
    ["host receipt raw bytes", /TERMINAL_COMMIT_INVALID|HOST_ENDPOINT_CHANGED|RECEIPT_DIGEST_MISMATCH|FILE_REBOUND/u, async (fixture) => {
      await appendFile(fixture.input.hostReceiptPath, "\n", "utf8");
    }],
    ["provider receipt raw bytes", /TERMINAL_COMMIT_MARKER_INVALID|PROVIDER_ENDPOINT_CHANGED|RECEIPT_DIGEST_MISMATCH|FILE_REBOUND/u, async (fixture) => {
      await appendFile(fixture.input.providerReceiptPath, "\n", "utf8");
    }],
    ["shared artifact lock raw bytes", /identity-lock|LOCK|ARTIFACT|ENDPOINT_CHANGED|FILE_REBOUND/u, async (fixture) => {
      await appendFile(fixture.input.artifactLock, "\n", "utf8");
    }]
  ];
  for (const [label, expected, mutate] of cases) {
    await withCompositionFixture(async (compositionFixture) => {
      await assert.rejects(
        composeDeployedPwaHostProviderCandidate(compositionFixture.input, {
          cwd: compositionFixture.fixture.workspace,
          onBeforeTerminalEndpointSnapshotsForTest: async () => mutate(compositionFixture)
        }),
        expected,
        label
      );
    });
  }
});

test("terminal PWA private package extra file is rejected", async () => {
  await withCompositionFixture(async (compositionFixture) => {
    await assert.rejects(
      composeDeployedPwaHostProviderCandidate(compositionFixture.input, {
        cwd: compositionFixture.fixture.workspace,
        onBeforeTerminalEndpointSnapshotsForTest: async () => {
          await writeFile(path.join(compositionFixture.input.pwaPrivateRoot, "late.tmp"), "late", "utf8");
        }
      }),
      /DEPLOYED_COMPOSITION_FILE_SET_INVALID/u
    );
  });
});

test("terminal PWA receipt byte drift is rejected independently of the v3 path-set digest", async () => {
  await withCompositionFixture(async (compositionFixture) => {
    const deploymentPath = path.join(
      compositionFixture.fixture.workspace,
      ...compositionFixture.fixture.evidence.receipts.deployment.path.split("/")
    );
    await assert.rejects(
      composeDeployedPwaHostProviderCandidate(compositionFixture.input, {
        cwd: compositionFixture.fixture.workspace,
        onBeforeTerminalEndpointSnapshotsForTest: async () => {
          await appendFile(deploymentPath, "\n", "utf8");
        }
      }),
      /PWA_RECEIPT_BYTES_MISMATCH|DEPLOYED_PWA_V3_FILE_BINDING_MISMATCH|DEPLOYED_COMPOSITION_FILE_SIZE_INVALID/u
    );
  });
});

test("hard-linked PWA, host, and provider package files are rejected before any admission claim", async () => {
  const cases = [
    ["PWA private input", (fixture) => [
      fixture.input.pwaInputPath,
      path.join(fixture.input.pwaPrivateRoot, "hardlink.json")
    ]],
    ["host receipt", (fixture) => [
      fixture.input.hostReceiptPath,
      path.join(fixture.fixture.workspace, "host-receipt-hardlink.json")
    ]],
    ["provider receipt", (fixture) => [
      fixture.input.providerReceiptPath,
      path.join(fixture.fixture.workspace, "provider-receipt-hardlink.json")
    ]]
  ];
  for (const [label, paths] of cases) {
    await withCompositionFixture(async (compositionFixture) => {
      await link(...paths(compositionFixture));
      await assert.rejects(
        composeDeployedPwaHostProviderCandidate(
          compositionFixture.input,
          { cwd: compositionFixture.fixture.workspace }
        ),
        /DEPLOYED_COMPOSITION_TREE_NON_REGULAR/u,
        label
      );
    });
  }
});

test("CLI failure is closed, non-admitting, and never reports an execution attempt", () => {
  const result = spawnSync(process.execPath, [compositionCliPath], {
    cwd: sourceWorkspace,
    encoding: "utf8",
    env: {}
  });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const failure = JSON.parse(result.stdout);
  assert.equal(failure.status, "failed");
  assert.equal(failure.usableForAdmission, false);
  assert.equal(Object.values(failure.claims).every((value) => value === false), true);
  assert.equal(Object.values(failure.attempts).every((value) => value === false), true);
  assert.equal(failure.authorizationBoundary.publicDeploymentAuthorized, false);
  assert.equal(failure.authorizationBoundary.publicReleaseAuthorized, false);
});

test("failure envelope hashes the message and preserves the closed authority ledger", () => {
  const failure = buildDeployedPwaHostProviderCompositionFailure(new Error("sensitive path detail"));
  assert.equal(failure.error.code, "DEPLOYED_COMPOSITION_FAILED");
  assert.equal(failure.error.messageDigest, sha256("sensitive path detail"));
  assert.equal(JSON.stringify(failure).includes("sensitive path detail"), false);
  assert.equal(Object.values(failure.claims).every((value) => value === false), true);
});

test("frozen PWA semantic/admission/claim vocabularies remain complete in composition tests", () => {
  assert.equal(DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES.length, 12);
  assert.equal(DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES.length, 12);
  assert.equal(DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES.length, 11);
  assert.equal(DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES.length, 10);
});
