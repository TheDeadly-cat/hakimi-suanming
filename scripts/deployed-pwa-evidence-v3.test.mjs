import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  link,
  mkdir,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assertDeployedPwaEvidenceV3RootsStillLocked,
  assertIsolatedDeployedPwaEvidenceV3Roots,
  DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES,
  DEPLOYED_PWA_EVIDENCE_V3_ROUTE_IDS,
  DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES,
  DeployedPwaEvidenceV3VerificationError,
  verifyDeployedPwaEvidenceV3
} from "./deployed-pwa-evidence-v3-lib.mjs";
import {
  artifactMutationBoundary,
  attachDeployedPwaV3DeploymentReceipt,
  bindingWithoutRole,
  candidateOrigin,
  caseCapture,
  caseProjection,
  cleanupDeployedPwaEvidenceV3TestFixture,
  createDeployedPwaEvidenceV3TestFixture,
  digestReceipt,
  fileBinding,
  jsonBytes,
  materializeBrowserReceipt,
  persistDeployedPwaEvidenceV3TestFixture,
  pwaManifestDocument,
  writeAttachment,
  writeExactSidecar,
  writeJson
} from "./deployed-pwa-evidence-v3.test-fixture.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

const sourceWorkspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(sourceWorkspace, "scripts", "verify-deployed-pwa-evidence-v3.mjs");

async function withFixture(callback) {
  const fixture = await createDeployedPwaEvidenceV3TestFixture();
  try {
    return await callback(fixture);
  } finally {
    await cleanupDeployedPwaEvidenceV3TestFixture(fixture);
  }
}

async function rejectCode(action, expectedCode) {
  await assert.rejects(
    action,
    (error) => error instanceof DeployedPwaEvidenceV3VerificationError
      && error.code === expectedCode
  );
}

async function readBrowserDocument(fixture, browserKey) {
  return JSON.parse(await readFile(fixture.browserReceiptPaths[browserKey], "utf8"));
}

function attachmentFor(document, role) {
  const attachment = document.attachments.find((entry) => entry.role === role);
  assert.ok(attachment, `missing ${role} attachment`);
  return attachment;
}

async function readAttachmentBytes(fixture, document, role) {
  return readFile(path.join(fixture.workspace, attachmentFor(document, role).path));
}

async function readAttachmentJson(fixture, document, role) {
  return JSON.parse(await readAttachmentBytes(fixture, document, role));
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

async function replaceNetworkEventsAttachment(fixture, document, projectName = "msedge") {
  await replaceAttachment(fixture, document, "network-events", {
    schemaVersion: 1,
    recordType: "deployed_pwa_cdp_network_events_v1",
    projectName,
    routeObservations: document.routeObservations
  });
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

const persistEvidence = persistDeployedPwaEvidenceV3TestFixture;
const createFixture = createDeployedPwaEvidenceV3TestFixture;
const cleanupFixture = cleanupDeployedPwaEvidenceV3TestFixture;
const attachDeploymentReceipt = attachDeployedPwaV3DeploymentReceipt;

test("complete synthetic candidate is only semantically consistent and not admitted", async () => {
  await withFixture(async (fixture) => {
    const result = await verifyDeployedPwaEvidenceV3({
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
    assert.equal(
      result.receiptSetMutationBoundary.boundaryType,
      "deployed_pwa_v3_receipt_set_endpoint_snapshot_boundary_v1"
    );
    assert.equal(result.receiptSetMutationBoundary.coveredReceiptPathCount, 25);
    assert.match(result.receiptSetMutationBoundary.receiptPathSetDigest, /^[a-f0-9]{64}$/u);
    assert.equal(result.receiptSetMutationBoundary.endpointSnapshotsMatched, true);
    assert.equal(result.receiptSetMutationBoundary.terminalReceiptFileSetEnumerated, true);
    assert.equal(result.receiptSetMutationBoundary.receiptBytesTerminallyRevalidated, false);
    assert.equal(result.receiptSetMutationBoundary.overlappingFileHandleEpochEstablished, false);
    assert.equal(result.receiptSetMutationBoundary.intervalMutationExclusionClaimed, false);
    assert.equal(result.receiptSetMutationBoundary.abaMutationExclusionClaimed, false);
    assert.equal(Object.isFrozen(result.receiptSetMutationBoundary), true);
    assert.equal(Object.values(result.gates.semantic).every((value) => value === true), true);
    assert.equal(Object.values(result.gates.admission).every((value) => value === false), true);
    assert.equal(Object.values(result.claims).every((value) => value === false), true);
    assert.equal(result.attempts.formalVerifierAttempted, false);
    assert.equal(result.attempts.gitAttempted, false);
    assert.equal(result.attempts.networkAttempted, false);
    assert.equal(result.attempts.browserAttempted, false);
    assert.equal(result.attempts.deploymentAttempted, false);
    assert.equal(result.errors[0].code, "DEPLOYED_PWA_V3_SEMANTICALLY_CONSISTENT_NOT_ADMITTED");

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
    assert.equal(
      cliResult.receiptSetMutationBoundary.verificationScope,
      "canonical_receipt_file_path_set_endpoint_snapshots_only_no_interval_or_aba_exclusion"
    );
    assert.equal(cliResult.receiptSetMutationBoundary.receiptBytesTerminallyRevalidated, false);
  });
});

test("internally bound provider deployment candidate remains offline and not admitted", async () => {
  await withFixture(async (fixture) => {
    await attachDeploymentReceipt(fixture);

    const result = await verifyDeployedPwaEvidenceV3({
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_DEPLOYMENT_RECEIPT_MISMATCH"
    );
  });
});

test("single-field policy opening fails before candidate roots are admitted", async () => {
  await withFixture(async (fixture) => {
    const policyPath = path.join(
      fixture.workspace,
      "docs/release/deployed-pwa-evidence-policy.v3.json"
    );
    const policy = JSON.parse(await readFile(policyPath, "utf8"));
    policy.executionAdmission.canonicalHttpsOriginConfigured = true;
    await writeJson(policyPath, policy);
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_POLICY_INVALID"
    );
  });
});

test("candidate origin rejects localhost, IP literals, single-label, and local-only DNS names", async () => {
  const invalidOrigins = [
    "https://localhost",
    "https://127.0.0.1",
    "https://intranet",
    "https://app.localhost",
    "https://preview.local"
  ];
  for (const invalidOrigin of invalidOrigins) {
    await withFixture(async (fixture) => {
      fixture.evidence.scope.candidateCanonicalOrigin = invalidOrigin;
      await persistEvidence(fixture);
      await rejectCode(
        () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
        "DEPLOYED_PWA_V3_ORIGIN_INVALID"
      );
    });
  }
});

test("duplicate raw JSON keys are rejected even with a refreshed byte sidecar", async () => {
  await withFixture(async (fixture) => {
    const source = await readFile(fixture.inputPath, "utf8");
    const duplicate = source.replace(
      '  "schemaVersion": 3,',
      '  "schemaVersion": 3,\n  "schemaVersion": 3,'
    );
    assert.notEqual(duplicate, source);
    await writeFile(fixture.inputPath, duplicate, "utf8");
    await writeExactSidecar(fixture.inputPath);
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_JSON_DUPLICATE_KEY"
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_TREE_HARDLINK"
    );
  });
});

test("receipt root regular files must exactly match every referenced canonical path", async (t) => {
  const extraFiles = [
    ["extra ordinary file", "unexpected.json"],
    ["discard tombstone", "msedge/output-discard-required.json"],
    ["temporary file", "chrome/.candidate-interrupted.tmp"]
  ];
  for (const [label, relativeFile] of extraFiles) {
    await t.test(label, async () => {
      await withFixture(async (fixture) => {
        await writeFile(path.join(fixture.receiptsRoot, relativeFile), "{}\n", "utf8");
        await rejectCode(
          () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
          "DEPLOYED_PWA_V3_RECEIPT_FILE_SET_INVALID"
        );
      });
    });
  }

  await t.test("missing referenced attachment", async () => {
    await withFixture(async (fixture) => {
      const missingPath = fixture.evidence.receipts.edge.receipt.attachments[0].path;
      await rm(path.join(fixture.workspace, missingPath));
      await rejectCode(
        () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
        "DEPLOYED_PWA_V3_RECEIPT_FILE_SET_INVALID"
      );
    });
  });
});

test("terminal receipt-set enumeration rejects a late nested file", async () => {
  await withFixture(async (fixture) => {
    let checkpointReached = false;
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({
        cwd: fixture.workspace,
        ...fixture.args,
        onBeforeTerminalReceiptSetSnapshotForTest: async (checkpoint) => {
          assert.equal(checkpoint.phase, "before_terminal_receipt_set_snapshot");
          assert.equal(checkpoint.expectedReceiptPathCount, 25);
          assert.equal(Object.isFrozen(checkpoint), true);
          checkpointReached = true;
          await writeFile(
            path.join(fixture.receiptsRoot, "msedge", "late-extra.json"),
            "{}\n",
            "utf8"
          );
        }
      }),
      "DEPLOYED_PWA_V3_RECEIPT_FILE_SET_INVALID"
    );
    assert.equal(checkpointReached, true);
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_ROOT_ALIAS"
    );
  });
});

test("a preflighted evidence root cannot be rebound through a junction", async (t) => {
  await withFixture(async (fixture) => {
    const roots = await assertIsolatedDeployedPwaEvidenceV3Roots({
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
        () => assertDeployedPwaEvidenceV3RootsStillLocked(roots),
        "DEPLOYED_PWA_V3_ROOT_REBOUND"
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_RECEIPT_PATH_ALIAS"
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      (error) => error instanceof DeployedPwaEvidenceV3VerificationError
        && [
          "DEPLOYED_PWA_V3_INPUT_SCHEMA_INVALID",
          "DEPLOYED_PWA_V3_RECEIPT_PATH_ALIAS"
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_RELEASE_EVIDENCE_PATH_INVALID"
    );
  });
});

test("canonical Evidence digest cannot be replaced while refreshing the raw sidecar", async () => {
  await withFixture(async (fixture) => {
    fixture.evidence.evidenceDigest = "f".repeat(64);
    await persistEvidence(fixture, { recomputeIdentity: false });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_EVIDENCE_IDENTITY_MISMATCH"
    );
  });
});

test("new manifest semantic gate cannot be omitted or downgraded", async () => {
  await withFixture(async (fixture) => {
    fixture.evidence.semanticGates.pwaInstallabilityAndManifestCandidateConsistent = false;
    await persistEvidence(fixture);
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_TERMINAL_LEDGER_INVALID"
    );
  });
});

test("formal engineering receipt cannot assert public-release authorization", async () => {
  await withFixture(async (fixture) => {
    await rewriteFormalReceipt(fixture, async (document) => {
      document.claims.publicReleaseAuthorized = true;
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_FORMAL_RECEIPT_BINDING_MISMATCH"
    );
  });
});

test("formal receipt cannot promote endpoint equality into ABA exclusion", async () => {
  await withFixture(async (fixture) => {
    await rewriteFormalReceipt(fixture, async (document) => {
      document.artifacts.mutationBoundary.abaMutationExclusionClaimed = true;
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_FORMAL_RECEIPT_BINDING_MISMATCH"
    );
  });
});

test("browser tuple in the bound receipt cannot diverge from its Edge envelope", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      document.actualProduct = "Chrome/151.0.7922.34";
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_BROWSER_RECEIPT_MISMATCH"
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_RECEIPT_ORDER_OR_PROFILE_INVALID"
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_SERVICE_WORKER_BYTES_MISMATCH"
    );
  });
});

test("manifest attachment roles require their exact frozen filenames", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const attachment = attachmentFor(document, "browser-manifest-audit");
      const currentPath = path.join(fixture.workspace, attachment.path);
      const renamedPath = path.join(path.dirname(currentPath), "renamed-manifest-audit.json");
      await rename(currentPath, renamedPath);
      Object.assign(attachment, await fileBinding(fixture.workspace, renamedPath));
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_MANIFEST_ATTACHMENT_PATH_INVALID"
    );
  });
});

test("installability errors must remain independently empty", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const audit = await readAttachmentJson(
        fixture,
        document,
        "browser-manifest-audit"
      );
      audit.installability.installabilityErrors = [{
        errorId: "synthetic-installability-error",
        errorArguments: []
      }];
      await replaceAttachment(fixture, document, "browser-manifest-audit", audit);
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_BROWSER_MANIFEST_AUDIT_INVALID"
    );
  });
});

test("processed manifest parse errors must remain independently empty", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const audit = await readAttachmentJson(
        fixture,
        document,
        "browser-manifest-audit"
      );
      audit.processedManifest.errors = [{
        message: "synthetic manifest parse error",
        critical: 1,
        line: 1,
        column: 1
      }];
      await replaceAttachment(fixture, document, "browser-manifest-audit", audit);
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_BROWSER_MANIFEST_AUDIT_INVALID"
    );
  });
});

test("processed manifest URL must be the exact scoped manifest URL", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const audit = await readAttachmentJson(
        fixture,
        document,
        "browser-manifest-audit"
      );
      audit.processedManifest.url = `${candidateOrigin}/other.webmanifest`;
      await replaceAttachment(fixture, document, "browser-manifest-audit", audit);
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_BROWSER_MANIFEST_AUDIT_INVALID"
    );
  });
});

test("browser manifest data must canonically equal the remote raw manifest JSON", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const audit = await readAttachmentJson(
        fixture,
        document,
        "browser-manifest-audit"
      );
      const changed = JSON.parse(audit.processedManifest.data);
      changed.name = "Semantically drifted manifest";
      audit.processedManifest.data = `${JSON.stringify(changed)}\n`;
      document.manifest.browserManifestContentSha256 = sha256(
        Buffer.from(audit.processedManifest.data, "utf8")
      );
      await replaceAttachment(fixture, document, "browser-manifest-audit", audit);
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_MANIFEST_JSON_SEMANTICS_MISMATCH"
    );
  });
});

test("raw manifest source fields must remain the fixed root standalone contract", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const changedManifestBytes = jsonBytes({
        ...pwaManifestDocument,
        start_url: "/help"
      });
      const audit = await readAttachmentJson(
        fixture,
        document,
        "browser-manifest-audit"
      );
      audit.processedManifest.data = changedManifestBytes.toString("utf8");
      document.manifest.browserManifestContentSha256 = sha256(changedManifestBytes);
      document.manifest.remoteManifestSha256 = sha256(changedManifestBytes);
      await replaceAttachment(fixture, document, "browser-manifest-audit", audit);
      await replaceAttachment(
        fixture,
        document,
        "remote-pwa-manifest-body",
        changedManifestBytes,
        true
      );
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_MANIFEST_SOURCE_FIELDS_INVALID"
    );
  });
});

test("browser processed manifest fields must resolve to the scoped root", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const audit = await readAttachmentJson(
        fixture,
        document,
        "browser-manifest-audit"
      );
      audit.processedManifest.manifest.scope = `${candidateOrigin}/help/`;
      await replaceAttachment(fixture, document, "browser-manifest-audit", audit);
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_MANIFEST_PROCESSED_FIELDS_INVALID"
    );
  });
});

test("remote manifest raw bytes must exactly equal the locked artifact bytes", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const original = await readAttachmentBytes(
        fixture,
        document,
        "remote-pwa-manifest-body"
      );
      const changedManifestBytes = Buffer.concat([original, Buffer.from("\n", "utf8")]);
      document.manifest.remoteManifestSha256 = sha256(changedManifestBytes);
      await replaceAttachment(
        fixture,
        document,
        "remote-pwa-manifest-body",
        changedManifestBytes,
        true
      );
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_MANIFEST_BYTES_MISMATCH"
    );
  });
});

test("remote manifest raw JSON rejects duplicate keys before semantic comparison", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      const duplicateManifestBytes = Buffer.from(
        '{"name":"Hakimi","id":"/","id":"/","start_url":"/","scope":"/","display":"standalone"}\n',
        "utf8"
      );
      document.manifest.remoteManifestSha256 = sha256(duplicateManifestBytes);
      await replaceAttachment(
        fixture,
        document,
        "remote-pwa-manifest-body",
        duplicateManifestBytes,
        true
      );
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_JSON_DUPLICATE_KEY"
    );
  });
});

test("receipt manifest hashes must be independently recomputed", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      document.manifest.manifestSemanticProjectionSha256 = sha256(
        "synthetic-wrong-manifest-projection"
      );
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_MANIFEST_RECEIPT_BINDING_MISMATCH"
    );
  });
});

test("offline route cannot weaken its CDP fromServiceWorker observation", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      document.routeObservations[1].cdpFromServiceWorkerRecorded = false;
      await replaceNetworkEventsAttachment(fixture, document);
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_ROUTE_SEMANTICS_MISMATCH"
    );
  });
});

test("all five route timestamps must be strictly increasing", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      document.routeObservations[1].observedAt = "2026-08-26T00:03:04.000Z";
      await replaceNetworkEventsAttachment(fixture, document);
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_BROWSER_TIME_ORDER_INVALID"
    );
  });
});

test("route timestamps must use canonical UTC ISO serialization", async () => {
  await withFixture(async (fixture) => {
    await rewriteBrowser(fixture, "edge", async (document) => {
      document.routeObservations[1].observedAt = "2026-08-26T00:03:10Z";
      await replaceNetworkEventsAttachment(fixture, document);
    });
    await rejectCode(
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_BROWSER_TIME_ORDER_INVALID"
    );
  });
});

test("browser startedAt and completedAt must each use canonical UTC ISO serialization", async () => {
  for (const field of ["startedAt", "completedAt"]) {
    await withFixture(async (fixture) => {
      await rewriteBrowser(fixture, "edge", async (document) => {
        document[field] = document[field].replace(".000Z", "Z");
      });
      await rejectCode(
        () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
        "DEPLOYED_PWA_V3_BROWSER_TIME_ORDER_INVALID"
      );
    });
  }
});

test("both case capture timestamps must use canonical UTC ISO serialization", async () => {
  for (const role of ["case-revision-before", "case-revision-after"]) {
    await withFixture(async (fixture) => {
      await rewriteBrowser(fixture, "edge", async (document) => {
        const capture = await readAttachmentJson(fixture, document, role);
        capture.capturedAt = capture.capturedAt.replace(".000Z", "Z");
        await replaceAttachment(fixture, document, role, capture);
      });
      await rejectCode(
        () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
        "DEPLOYED_PWA_V3_CASE_CAPTURE_INVALID"
      );
    });
  }
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_CASE_PROJECTION_MISMATCH"
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
      () => verifyDeployedPwaEvidenceV3({ cwd: fixture.workspace, ...fixture.args }),
      "DEPLOYED_PWA_V3_CASE_PROJECTION_MISMATCH"
    );
  });
});

test("synthetic fixture freezes the exact route and attachment vocabularies", () => {
  assert.deepEqual(DEPLOYED_PWA_EVIDENCE_V3_ROUTE_IDS, [
    "online-root",
    "offline-settings-data",
    "offline-case-revision",
    "offline-help-cold-start",
    "offline-help-reload"
  ]);
  assert.deepEqual(DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES, [
    "browser-version",
    "profile-preflight",
    "browser-manifest-audit",
    "remote-pwa-manifest-body",
    "network-events",
    "controller-script-meta",
    "controller-source",
    "remote-service-worker-body",
    "case-revision-before",
    "case-revision-after"
  ]);
  assert.deepEqual(DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES, [
    "policyBindingsVerified",
    "releaseIdentityVerified",
    "artifactIdentityVerified",
    "untrustedFormalReceiptEnvelopeConsistent",
    "untrustedHostReceiptEnvelopeConsistent",
    "untrustedEdgeBrowserEnvelopeConsistent",
    "untrustedChromeBrowserEnvelopeConsistent",
    "serviceWorkerCandidateBytesConsistent",
    "pwaInstallabilityAndManifestCandidateConsistent",
    "routeAndCaseRevisionCandidateBytesConsistent",
    "evidenceDigestVerified",
    "semanticConsistencyVerified"
  ]);
});
