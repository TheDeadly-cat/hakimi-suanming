import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  assertStrictReleaseBrowserResultSummary,
  CROSS_SCHEMA_V13_V16_RECEIPT_ID,
  REQUIRED_RELEASE_BROWSER_RECEIPT_IDS
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
  parseSwAbUpdateCandidateJsonBytes,
  validateSwAbUpdateCandidatePolicy,
  verifySwAbUpdateCandidate
} from "./sw-ab-update-candidate-lib.mjs";
import {
  artifactReference,
  attachmentReference,
  createFixture,
  digest,
  iso,
  writeJson
} from "./sw-ab-update-candidate-fixture.mjs";
import { loadSwAbUpdateCandidateSchemaValidator } from "./sw-ab-update-candidate-schema.mjs";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
async function persistEvidence(fixture) {
  fixture.evidence.evidenceDigest = computeSwAbUpdateCandidateEvidenceDigest(fixture.evidence);
  const bytes = await writeJson(fixture.inputPath, fixture.evidence);
  await writeFile(`${fixture.inputPath}.sha256`, `${sha256(bytes)}  evidence.json\n`, "ascii");
}

async function mutateAttachment(fixture, browserProject, role, mutate) {
  const attachment = fixture.evidence.attachments.find((entry) =>
    entry.browserProject === browserProject && entry.role === role
  );
  const absolute = path.join(fixture.attachmentsRoot, ...attachment.path.split("/"));
  const envelope = JSON.parse(await readFile(absolute, "utf8"));
  mutate(envelope.payload);
  envelope.payloadDigest = sha256(canonicalJson(envelope.payload));
  const bytes = await writeJson(absolute, envelope);
  attachment.size = bytes.byteLength;
  attachment.sha256 = sha256(bytes);
  attachment.digest = computeSwAbUpdateCandidateAttachmentDigest(attachment);
  await persistEvidence(fixture);
  return attachment;
}

async function mutateReleaseEvidenceAttachment(fixture, label, mutate) {
  const attachment = await mutateAttachment(
    fixture,
    null,
    `artifact-${label.toLowerCase()}-release-evidence`,
    (payload) => mutate(payload.document)
  );
  Object.assign(fixture.evidence.artifacts[label].releaseEvidence, attachmentReference(attachment));
  fixture.evidence.artifacts[label].artifactIdentityDigest =
    computeSwAbUpdateCandidateArtifactIdentityDigest(fixture.evidence.artifacts[label]);
  const providerKey = `artifact${label}DeploymentDigest`;
  fixture.evidence.deploymentCandidate.provider[providerKey] =
    computeSwAbUpdateCandidateProviderDeploymentDigest({ evidence: fixture.evidence, label });
  for (const receipt of fixture.evidence.browserReceipts) {
    receipt.artifactBindings[label] = artifactReference(fixture.evidence.artifacts[label]);
    receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  }
  await persistEvidence(fixture);
}

async function expectCode(promise, code) {
  await assert.rejects(
    promise,
    (error) => error && typeof error === "object" && error.code === code
  );
}

test("checked-in policy and Schema compile as the exact closed v1 contract", async () => {
  const policy = JSON.parse(await readFile(
    path.join(workspaceRoot, "docs/release/sw-ab-update-candidate-policy.v1.json"),
    "utf8"
  ));
  assert.equal(validateSwAbUpdateCandidatePolicy(policy), policy);
  const validator = await loadSwAbUpdateCandidateSchemaValidator(workspaceRoot);
  assert.equal(validator.schema.$id, "https://hakimi.invalid/schemas/sw-ab-update-candidate-v1.json");
  assert.equal(validator.schema.properties.strictGatePassed.const, false);
  assert.equal(validator.schema.properties.attachments.minItems, 38);
});

test("valid future bytes remain internally consistent but terminally untrusted and not admitted", async (t) => {
  const fixture = await createFixture(t);
  const result = await fixture.verify();
  assert.equal(result.internalConsistencyVerified, true);
  assert.equal(result.status, "not_admitted");
  assert.equal(result.executionAdmission, "closed_missing_https_origin");
  assert.equal(result.strictGatePassed, false);
  assert.equal(result.usableForAdmission, false);
  assert.equal(result.attemptFreshnessExternallyVerified, false);
  assert.equal(result.bundleReplayResistanceVerified, false);
  assert.ok(Object.values(result.authority).every((value) => value === false));
  assert.equal(Object.isFrozen(result.compositionProjection), true);
  assert.equal(Object.isFrozen(result.compositionProjection.artifactBindings), true);
  assert.equal(Object.isFrozen(result.compositionProjection.browserReceipts[0]), true);
  assert.deepEqual(
    result.compositionProjection.browserReceipts.map((receipt) => receipt.projectName),
    ["msedge", "chrome"]
  );
  assert.deepEqual(
    result.compositionProjection.browserReceipts[0].initialAClients.map((client) => client.slot),
    ["retained-old-a", "reload-to-b"]
  );
});

test("whole-bundle replay never acquires freshness, replay resistance, or admission", async (t) => {
  const fixture = await createFixture(t);
  const first = await fixture.verify();
  const replay = await fixture.verify();
  for (const result of [first, replay]) {
    assert.equal(result.internalConsistencyVerified, true);
    assert.equal(result.attemptFreshnessExternallyVerified, false);
    assert.equal(result.bundleReplayResistanceVerified, false);
    assert.equal(result.strictGatePassed, false);
    assert.equal(result.usableForAdmission, false);
  }
});

test("CLI always exits 1 even when the candidate is internally consistent", async (t) => {
  const fixture = await createFixture(t);
  const outcome = spawnSync(process.execPath, [
    "scripts/verify-sw-ab-update-candidate.mjs",
    "--input", fixture.inputPath,
    "--attachments-root", fixture.attachmentsRoot,
    "--private-root", fixture.privateRoot,
    "--artifact-a-root", fixture.artifactARoot,
    "--artifact-b-root", fixture.artifactBRoot
  ], { cwd: workspaceRoot, encoding: "utf8" });
  assert.equal(outcome.status, 1);
  const result = JSON.parse(outcome.stdout);
  assert.equal(result.internalConsistencyVerified, true);
  assert.equal(result.strictGatePassed, false);
});

test("strict JSON rejects duplicate raw keys before schema validation", () => {
  assert.throws(
    () => parseSwAbUpdateCandidateJsonBytes(Buffer.from('{"runId":"a","runId":"b"}')),
    (error) => error.code === "SW_AB_UPDATE_JSON_DUPLICATE_KEY"
  );
});

test("receipt rebinding to another attempt is rejected", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.browserReceipts[0].attemptId = `attempt-${digest("rebound")}`;
  fixture.evidence.browserReceipts[0].receiptDigest =
    computeSwAbUpdateCandidateBrowserReceiptDigest(fixture.evidence.browserReceipts[0]);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_BROWSER_BINDING_MISMATCH");
});

test("process reopen and first navigation timestamps must bracket the fifteen-event timeline", async (t) => {
  const fixture = await createFixture(t);
  const receipt = fixture.evidence.browserReceipts[0];
  receipt.profile.reopenedProcess.createdAt = iso(45, 1);
  receipt.profile.firstNavigationAfterReopenAt = iso(46, 1);
  for (const role of ["fresh-persistent-profile-preflight", "process-and-profile-reopen"]) {
    await mutateAttachment(fixture, "msedge", role, (payload) => {
      payload.profile = structuredClone(receipt.profile);
    });
  }
  receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_PROCESS_RESTART_ORDER_INVALID");
});

test("A equals B artifact rebinding is rejected", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.artifacts.B.releaseEvidenceId = fixture.evidence.artifacts.A.releaseEvidenceId;
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_ARTIFACT_IDENTITY_INVALID");
});

test("cross-browser receipt mixing is rejected", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.browserReceipts[1] = structuredClone(fixture.evidence.browserReceipts[0]);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_EVIDENCE_SCHEMA_INVALID");
});

test("timeline reordering is rejected even with refreshed receipt and evidence digests", async (t) => {
  const fixture = await createFixture(t);
  const receipt = fixture.evidence.browserReceipts[0];
  [receipt.timeline[4], receipt.timeline[5]] = [receipt.timeline[5], receipt.timeline[4]];
  receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_TIMELINE_INVALID");
});

test("duplicate attachment paths are rejected", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.attachments[1].path = fixture.evidence.attachments[0].path;
  fixture.evidence.attachments[1].digest =
    computeSwAbUpdateCandidateAttachmentDigest(fixture.evidence.attachments[1]);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_ATTACHMENT_PATH_DUPLICATE");
});

test("fake Schema13 mutation epoch is rejected by Schema", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.capabilities.epoch = 0;
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_EVIDENCE_SCHEMA_INVALID");
});

test("authority elevation is rejected by Schema", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.authority.publicDeploymentAuthorized = true;
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_EVIDENCE_SCHEMA_INVALID");
});

test("attempt marker rebound from another attempt is rejected", async (t) => {
  const fixture = await createFixture(t);
  const markerPath = path.join(fixture.privateRoot, ".sw-ab-update-attempt-marker.json");
  const marker = JSON.parse(await readFile(markerPath, "utf8"));
  marker.attemptId = `attempt-${digest("old-attempt")}`;
  marker.markerDigest = computeSwAbUpdateCandidateAttemptMarkerDigest(marker);
  await writeJson(markerPath, marker);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_ATTEMPT_MARKER_INVALID");
});

test("shared deployment ledger must project both browser timelines and remote captures", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.deploymentEventLedger.events[5].observedAt = iso(22, 750);
  fixture.evidence.deploymentEventLedger.ledgerDigest =
    computeSwAbUpdateCandidateDeploymentLedgerDigest(fixture.evidence.deploymentEventLedger);
  fixture.evidence.deploymentCandidate.deploymentEventLedgerDigest =
    fixture.evidence.deploymentEventLedger.ledgerDigest;
  for (const receipt of fixture.evidence.browserReceipts) {
    receipt.deploymentEventLedgerDigest = fixture.evidence.deploymentEventLedger.ledgerDigest;
    receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  }
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_DEPLOYMENT_RECEIPT_PROJECTION_INVALID");
});

test("one browser cannot run ahead of a shared two-browser deployment barrier", async (t) => {
  const fixture = await createFixture(t);
  const receipt = fixture.evidence.browserReceipts[0];
  for (const [eventId, observedAt] of [
    ["artifact_b_waiting_observed", iso(24, 0)],
    ["network_interrupted_during_update", iso(24, 1)]
  ]) {
    receipt.timeline.find((event) => event.eventId === eventId).observedAt = observedAt;
  }
  await mutateAttachment(
    fixture,
    "msedge",
    "sw-controller-install-wait-activation-timeline",
    (payload) => {
      payload.timeline = structuredClone(receipt.timeline);
    }
  );
  receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_DEPLOYMENT_RECEIPT_PROJECTION_INVALID");
});

test("A and B physical artifact roots cannot alias", async (t) => {
  const fixture = await createFixture(t);
  await expectCode(
    verifySwAbUpdateCandidate({
      cwd: workspaceRoot,
      inputPath: fixture.inputPath,
      attachmentsRoot: fixture.attachmentsRoot,
      privateRoot: fixture.privateRoot,
      artifactARoot: fixture.artifactARoot,
      artifactBRoot: fixture.artifactARoot
    }),
    "SW_AB_UPDATE_ROOTS_OVERLAP"
  );
});

test("attachment semantic mismatch is rejected after byte metadata is refreshed", async (t) => {
  const fixture = await createFixture(t);
  const attachment = fixture.evidence.attachments.find((entry) =>
    entry.browserProject === "msedge" && entry.role === "v13-data-before"
  );
  const absolute = path.join(fixture.attachmentsRoot, ...attachment.path.split("/"));
  const envelope = JSON.parse(await readFile(absolute, "utf8"));
  envelope.payload.snapshot.recordCount += 1;
  envelope.payloadDigest = sha256(canonicalJson(envelope.payload));
  const bytes = await writeJson(absolute, envelope);
  attachment.size = bytes.byteLength;
  attachment.sha256 = sha256(bytes);
  attachment.digest = computeSwAbUpdateCandidateAttachmentDigest(attachment);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_V13_OR_STALE_ATTACHMENT_MISMATCH");
});

test("client challenge replay across phases is rejected", async (t) => {
  const fixture = await createFixture(t);
  const receipt = fixture.evidence.browserReceipts[0];
  receipt.clientProofs.postClaimClients[0].challengeNonce =
    receipt.clientProofs.initialAClients[0].challengeNonce;
  receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_CLIENT_PROOFS_INVALID");
});

test("Edge and Chrome cannot reuse a WindowClient identity", async (t) => {
  const fixture = await createFixture(t);
  const edgeClientId = fixture.evidence.browserReceipts[0].clientProofs.initialAClients[0].clientId;
  const receipt = fixture.evidence.browserReceipts[1];
  for (const [phase, clients] of [
    ["initial-a", receipt.clientProofs.initialAClients],
    ["post-claim", receipt.clientProofs.postClaimClients]
  ]) {
    clients[0].clientId = edgeClientId;
    clients[0].challengeResponseDigest = computeSwAbUpdateCandidateClientChallengeResponseDigest({
      evidence: fixture.evidence,
      projectName: receipt.projectName,
      phase,
      client: clients[0]
    });
  }
  await mutateAttachment(fixture, "chrome", "initial-two-client-census", (payload) => {
    payload.clients = structuredClone(receipt.clientProofs.initialAClients);
  });
  await mutateAttachment(fixture, "chrome", "post-claim-two-client-census", (payload) => {
    payload.clients = structuredClone(receipt.clientProofs.postClaimClients);
  });
  receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_CROSS_BROWSER_CLIENT_IDENTITY_ALIAS");
});

test("offline cache network forwarding promotion is rejected", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.browserReceipts[0].offlineRoutes[0].networkForwarded = true;
  fixture.evidence.browserReceipts[0].receiptDigest =
    computeSwAbUpdateCandidateBrowserReceiptDigest(fixture.evidence.browserReceipts[0]);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_EVIDENCE_SCHEMA_INVALID");
});

test("offline response raw bytes cannot be replaced by a matching receipt claim", async (t) => {
  const fixture = await createFixture(t);
  await mutateAttachment(fixture, "msedge", "offline-root-result", (payload) => {
    payload.responseBodyBase64 = Buffer.from("forged offline response\n").toString("base64");
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_OFFLINE_RESPONSE_BODY_MISMATCH");
});

test("stale write typed error claim requires independent runtime fact projection", async (t) => {
  const fixture = await createFixture(t);
  await mutateAttachment(fixture, "msedge", "stale-a-write-rejection", (payload) => {
    payload.error.prototypeChain = ["Error", "Object"];
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_V13_OR_STALE_ATTACHMENT_MISMATCH");
});

test("nested Release Evidence claims must satisfy the checked formal Schema", async (t) => {
  const fixture = await createFixture(t);
  await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
    document.claims.hiddenAuthority = true;
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_SCHEMA_INVALID");
});

test("nested Release Evidence accepts cross completion while retaining four artifact receipts and no admission", async (t) => {
  const fixture = await createFixture(t);
  for (const label of ["A", "B"]) {
    const relative = fixture.evidence.artifacts[label].releaseEvidence.path;
    const envelope = JSON.parse(await readFile(path.join(fixture.attachmentsRoot, relative), "utf8"));
    const document = envelope.payload.document;
    const cross = document.testReceipts.find((receipt) => receipt.id === CROSS_SCHEMA_V13_V16_RECEIPT_ID);
    assert.ok(cross);
    assertStrictReleaseBrowserResultSummary(cross.browserResultSummary.summary, CROSS_SCHEMA_V13_V16_RECEIPT_ID);
    assert.deepEqual(cross.browserResultSummary.summary.projects.map(({ projectName, passed, attempts }) =>
      ({ projectName, passed, attempts })), [
      { projectName: "msedge", passed: 13, attempts: 13 },
      { projectName: "chrome", passed: 13, attempts: 13 }
    ]);
    // Release Evidence contains projected receipts; raw command artifact
    // bindings are not part of this closed projection.
    assert.equal(Object.hasOwn(cross, "artifactIdentityBinding"), false);
    assert.deepEqual(document.artifacts.mutationBoundary.coveredReceiptIds, REQUIRED_RELEASE_BROWSER_RECEIPT_IDS);
    for (const id of REQUIRED_RELEASE_BROWSER_RECEIPT_IDS) {
      const receipt = document.testReceipts.find((entry) => entry.id === id);
      assertStrictReleaseBrowserResultSummary(receipt.browserResultSummary.summary, id);
    }
  }
  const result = await fixture.verify();
  assert.equal(result.internalConsistencyVerified, true);
  assert.equal(result.status, "not_admitted");
  assert.equal(result.strictGatePassed, false);
  assert.equal(result.usableForAdmission, false);
  assert.ok(Object.values(result.authority).every((value) => value === false));
});

test("nested Release Evidence rejects a missing cross completion summary", async (t) => {
  const fixture = await createFixture(t);
  await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
    document.testReceipts.find((receipt) => receipt.id === CROSS_SCHEMA_V13_V16_RECEIPT_ID)
      .browserResultSummary = null;
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_DOCUMENT_INVALID");
});

test("nested Release Evidence rejects a cross completion summary for another receipt", async (t) => {
  const fixture = await createFixture(t);
  await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
    document.testReceipts.find((receipt) => receipt.id === CROSS_SCHEMA_V13_V16_RECEIPT_ID)
      .browserResultSummary = structuredClone(document.testReceipts.find((receipt) => receipt.id === "pwa").browserResultSummary);
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_DOCUMENT_INVALID");
});

test("nested Release Evidence keeps original four summaries required and non-browser summaries absent", async (t) => {
  for (const id of [...REQUIRED_RELEASE_BROWSER_RECEIPT_IDS, "unit"]) {
    const fixture = await createFixture(t);
    await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
      const receipt = document.testReceipts.find((entry) => entry.id === id);
      assert.ok(receipt, id);
      receipt.browserResultSummary = id === "unit"
        ? structuredClone(document.testReceipts.find((entry) => entry.id === "pwa").browserResultSummary)
        : null;
    });
    await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_DOCUMENT_INVALID");
  }
});

test("nested Release Evidence rejects same-id incomplete cross completion counts", async (t) => {
  const fixture = await createFixture(t);
  await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
    const summary = document.testReceipts.find((receipt) => receipt.id === CROSS_SCHEMA_V13_V16_RECEIPT_ID)
      .browserResultSummary.summary;
    Object.assign(summary.projects[0], { discovered: 12, passed: 12, attempts: 12 });
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_SCHEMA_INVALID");
});

test("nested Release Evidence rejects same-id incomplete original four completion counts", async (t) => {
  for (const id of REQUIRED_RELEASE_BROWSER_RECEIPT_IDS) {
    const fixture = await createFixture(t);
    await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
      const summary = document.testReceipts.find((receipt) => receipt.id === id).browserResultSummary.summary;
      const incompleteCount = summary.expectedTestsPerProject - 1;
      Object.assign(summary.projects[0], {
        discovered: incompleteCount,
        passed: incompleteCount,
        attempts: incompleteCount
      });
    });
    await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_SCHEMA_INVALID");
  }
});

test("nested Release Evidence cannot elevate owner-controlled gates", async (t) => {
  const fixture = await createFixture(t);
  await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
    document.gates.publicDeploymentAuthorized = true;
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_DOCUMENT_INVALID");
});

test("nested Release Evidence id must be recomputed from its source binding", async (t) => {
  const fixture = await createFixture(t);
  await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
    document.source.sourceTreeDigest = "f".repeat(64);
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_DOCUMENT_INVALID");
});

test("nested Release Evidence cannot replace the formal receipt set with the SW candidate", async (t) => {
  const fixture = await createFixture(t);
  await mutateReleaseEvidenceAttachment(fixture, "A", (document) => {
    document.release.requiredReceiptIds = ["sw-ab-candidate"];
    document.testReceipts = [{
      id: "sw-ab-candidate",
      evidenceId: document.evidenceId,
      status: "passed",
      exitCode: 0,
      command: ["node", "scripts/verify-sw-ab-update-candidate.mjs"],
      startedAt: iso(1),
      completedAt: iso(2),
      durationMs: 1000,
      browserResultSummary: null,
      path: "fixture/sw-ab-candidate.json",
      sha256: digest("fake-formal-sw-ab-receipt")
    }];
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_RELEASE_EVIDENCE_DOCUMENT_INVALID");
});

test("B cache metadata must bind the exact B build and default-v13 descriptor", async (t) => {
  const fixture = await createFixture(t);
  await mutateAttachment(fixture, "msedge", "artifact-b-cache-inventory", (payload) => {
    const metadata = JSON.parse(Buffer.from(payload.metadata.bodyBase64, "base64").toString("utf8"));
    metadata.cacheName = "hakimi-shell-forged000000";
    const bytes = Buffer.from(JSON.stringify(metadata));
    payload.metadata.size = bytes.byteLength;
    payload.metadata.sha256 = sha256(bytes);
    payload.metadata.bodyBase64 = bytes.toString("base64");
  });
  await expectCode(fixture.verify(), "SW_AB_UPDATE_CACHE_METADATA_INVALID");
});

test("B cache installation metadata must fall inside the observed install-to-wait window", async (t) => {
  const fixture = await createFixture(t);
  let updatedProof;
  await mutateAttachment(fixture, "msedge", "artifact-b-cache-inventory", (payload) => {
    const metadata = JSON.parse(Buffer.from(payload.metadata.bodyBase64, "base64").toString("utf8"));
    metadata.installedAt = Date.parse(iso(17));
    const bytes = Buffer.from(JSON.stringify(metadata));
    payload.metadata.size = bytes.byteLength;
    payload.metadata.sha256 = sha256(bytes);
    payload.metadata.bodyBase64 = bytes.toString("base64");
    payload.proof.cacheMetadataSha256 = payload.metadata.sha256;
    payload.proof.cacheInventoryDigest = sha256(canonicalJson({
      metadata: payload.metadata,
      entries: payload.entries
    }));
    updatedProof = structuredClone(payload.proof);
  });
  const receipt = fixture.evidence.browserReceipts[0];
  receipt.cacheProof = updatedProof;
  receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_CACHE_METADATA_INVALID");
});

test("typed production repository rejection cannot be replaced by a UI claim", async (t) => {
  const fixture = await createFixture(t);
  const receipt = fixture.evidence.browserReceipts[0];
  receipt.staleAWrite.repositoryLayer = "ui_button_disabled";
  receipt.receiptDigest = computeSwAbUpdateCandidateBrowserReceiptDigest(receipt);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_EVIDENCE_SCHEMA_INVALID");
});

test("endpoint equality cannot be promoted to interval no-mutation proof", async (t) => {
  const fixture = await createFixture(t);
  fixture.evidence.browserReceipts[0].dataIntegrity.intervalNoMutationVerified = true;
  fixture.evidence.browserReceipts[0].receiptDigest =
    computeSwAbUpdateCandidateBrowserReceiptDigest(fixture.evidence.browserReceipts[0]);
  await persistEvidence(fixture);
  await expectCode(fixture.verify(), "SW_AB_UPDATE_EVIDENCE_SCHEMA_INVALID");
});

test("CLI rejects missing or appended flags and still exits 1", () => {
  for (const args of [[], ["--input", "x", "--unknown", "y"]]) {
    const outcome = spawnSync(
      process.execPath,
      ["scripts/verify-sw-ab-update-candidate.mjs", ...args],
      { cwd: workspaceRoot, encoding: "utf8" }
    );
    assert.equal(outcome.status, 1);
    assert.equal(JSON.parse(outcome.stdout).failure.code, "SW_AB_UPDATE_ARGUMENTS_INVALID");
  }
});
