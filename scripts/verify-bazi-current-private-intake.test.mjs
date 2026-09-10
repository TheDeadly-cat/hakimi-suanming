import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadCurrentIndex } from "./current-index-lib.mjs";
import {
  BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS,
  BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH,
  BAZI_EXPERT_REVIEW_QUESTION_IDS,
  computeBaziExpertReviewIntakeRecordDigest,
  parseBaziExpertPrivateIntakeRequestJsonBytes,
  parseBaziExpertReviewJsonBytes,
  verifyBaziPrivateIdentityDossierArtifact,
  verifyBaziPrivateOriginalOpinionFile
} from "./bazi-expert-review-packet-lib.mjs";
import {
  loadBaziCurrentExpertIntakeSessionBinding,
  loadBaziCurrentExpertReviewProgressFromPrivateContexts,
  loadBaziCurrentExpertReviewProgressFromPrivateFiles,
  loadBaziCurrentExpertReviewProgressFromPrivateIntakeFile,
  verifyBaziCurrentPrivateIdentityDossierArtifact,
  verifyBaziCurrentPrivateOriginalOpinionFile
} from "./bazi-scoped-current-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(ROOT, "scripts", "resolve-bazi-current-expert-review-packet.mjs");
const BODY_MARKER = "SYNTHETIC_PRIVATE_BODY_NOT_A_REAL_EXPERT_OPINION";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const recordRef = (record) => ({ recordId: record.recordId, recordDigest: record.integrity.recordDigest });
const expectCode = (code) => (error) => error?.code === code;

function signedRecord(sessionBinding, recordType, recordId, createdAt, payload) {
  const record = {
    schemaVersion: "1.0.0", recordType, recordId, recordVersion: "1.0.0", createdAt,
    reviewPurpose: "candidate_feedback_only",
    sessionBinding: structuredClone(sessionBinding),
    payload,
    integrity: {
      hashAlgorithm: "SHA-256", digestDomain: "hakimi.bazi.expert-review-intake-record.v1",
      recordDigest: "0".repeat(64), digestIsDigitalSignature: false, authenticityEstablished: false
    }
  };
  record.integrity.recordDigest = computeBaziExpertReviewIntakeRecordDigest(record);
  return record;
}

function resigned(record, change) {
  const candidate = structuredClone(record);
  change(candidate);
  candidate.integrity.recordDigest = computeBaziExpertReviewIntakeRecordDigest(candidate);
  return candidate;
}

// Independent ordinary data fixture: the old test module is never imported.
// Opaque bytes are conspicuously synthetic; no encryption or identity is claimed.
async function syntheticPrivateGraph(sessionOverride, { sharedReviewerId = false } = {}) {
  const session = sessionOverride ?? await loadBaziCurrentExpertIntakeSessionBinding(ROOT);
  const packet = JSON.parse(await readFile(path.join(ROOT, "content", "bazi-strength-expert-review-packet.current.json"), "utf8"));
  const epoch = Date.parse(packet.createdAt);
  assert.ok(Number.isFinite(epoch));
  const at = (minutes) => new Date(epoch + minutes * 60_000).toISOString();
  const dossiers = ["a", "b"].map((suffix, index) => {
    const raw = Buffer.concat([Buffer.from([0x00, 0xff - index, 0x41 + index]),
      Buffer.from(`SYNTHETIC OPAQUE DOSSIER ${suffix}; NO PERSON OR CREDENTIAL`, "utf8")]);
    const digest = sha256(raw);
    const identity = signedRecord(session, "bazi_expert_public_identity_binding_v1",
      `synthetic.current.identity-${suffix}`, at(20), {
        reviewerId: `synthetic-current-reviewer-${sharedReviewerId ? "a" : suffix}`,
        displayNameOrControlledPseudonym: `SYNTHETIC reviewer ${suffix}; not a person`,
        roleId: "domain_expert", verificationMethod: "private_dossier_review",
        verificationDate: at(10),
        reviewScope: [...packet.roleSeparation.find((role) => role.roleId === "domain_expert").allowedScope],
        evidenceType: "credential_and_scope_evidence",
        verifiedBy: { verifierId: "synthetic-unverified-custodian", verifierBindingRef: null },
        credentialDigest: digest,
        privateDossierRef: {
          opaqueRecordId: `synthetic-current-dossier-${suffix}`, storageClass: "encrypted_offline_private",
          encryptedArtifactSha256: digest, repositoryStorageAllowed: false
        },
        roleOverlapDisclosures: []
      });
    return { raw, identity, relativePath: `dossiers/synthetic-${suffix}.opaque` };
  });
  assert.notEqual(sha256(dossiers[0].raw), sha256(dossiers[1].raw));
  const orderedIdentities = dossiers.map((entry) => entry.identity).sort((left, right) =>
    `${left.integrity.recordDigest}:${left.recordId}`.localeCompare(`${right.integrity.recordDigest}:${right.recordId}`));
  const independence = signedRecord(session, "bazi_expert_pairwise_independence_assessment_v1",
    "synthetic.current.independence-a-b", at(61), {
      assessmentId: "synthetic-current-assessment-a-b",
      reviewerPair: orderedIdentities.map((identity) => ({ reviewerId: identity.payload.reviewerId, bindingRef: recordRef(identity) })),
      assessedBy: "synthetic-unverified-assessor", assessmentStartedAt: at(30), assessmentCompletedAt: at(60),
      factors: session.independenceFactorIds.map((factorId, index) => ({
        factorId, reviewerADeclaration: "no_conflict_disclosed", reviewerBDeclaration: "no_conflict_disclosed",
        privateEvidenceRefs: [], assessorDisposition: "no_material_conflict_observed",
        disclosureDigest: sha256(Buffer.from(`SYNTHETIC:${factorId}`, "utf8")), assessedAt: at(40 + index)
      })),
      sharedDependencyDisclosures: [], overallDisposition: "not_established", collectionEligibility: "blocked"
    });
  const opinions = dossiers.map((dossier, index) => {
    const suffix = index === 0 ? "a" : "b";
    const opinion = signedRecord(session, "bazi_expert_original_opinion_v1",
      `synthetic.current.opinion-${suffix}`, at(181 + index), {
        opinionKind: "original", slotId: `domain-expert-${suffix}`,
        reviewerBindingRef: recordRef(dossier.identity), independenceAssessmentRef: recordRef(independence),
        independenceCompletedAt: independence.payload.assessmentCompletedAt,
        reviewStartedAt: at(120 + index), submittedAt: at(180 + index), priorExposureState: "none_declared",
        responses: session.reviewQuestionIds.map((questionId, position) => ({
          responseId: `synthetic-current-response-${suffix}-${position}`, questionId,
          position: "cannot_decide", originalText: `${BODY_MARKER}:${suffix}:${position}`,
          rationale: "SYNTHETIC structure only; no identity, qualification or domain truth.",
          evidenceRefs: [], uncertainties: ["synthetic-only"], affectedBindingIds: [], affectedStructures: [],
          highRiskBoundary: "defer"
        })),
        scopeStatement: "SYNTHETIC current intake contract fixture only",
        excludedScopes: [...packet.reviewScope.excludedScopes], parentOriginalOpinionRef: null
      });
    const raw = Buffer.from(JSON.stringify(opinion), "utf8");
    const sealReceipt = signedRecord(session, "bazi_expert_private_opinion_seal_receipt_v1",
      `synthetic.current.seal-${suffix}`, at(241 + index), {
        sealReceiptId: `synthetic-current-seal-${suffix}`, opinionRef: recordRef(opinion),
        reviewerBindingRef: recordRef(dossier.identity), opinionSubmittedAt: opinion.payload.submittedAt,
        rawOpinionArtifact: { sha256: sha256(raw), byteLength: raw.length, mediaType: "application/json", encoding: "utf-8" },
        privateStorage: {
          storageClass: "encrypted_offline_private", opaqueRecordId: `synthetic-current-opinion-store-${suffix}`,
          encryptedArtifactSha256: sha256(Buffer.from(`SYNTHETIC seal declaration ${suffix}`, "utf8")), repositoryStorageAllowed: false
        },
        sealedAt: at(240 + index), sealedByCustodian: "synthetic-unverified-custodian",
        firstSeenReceiptRef: null, retrievalVerificationReceiptRef: null
      });
    return { opinion, raw, sealReceipt, relativePath: `opinions/synthetic-${suffix}.json` };
  });
  assert.equal(session.reviewQuestionIds.length, 4);
  assert.equal(independence.payload.factors.length, 10);
  assert.equal(packet.reviewScope.excludedScopes.length, 7);
  return { session, packet, dossiers, opinions, independence };
}

async function privateFixture(t, graph) {
  const tempRoot = await realpath(os.tmpdir());
  const privateRoot = await mkdtemp(path.join(tempRoot, "hbpi-"));
  const owned = await lstat(privateRoot, { bigint: true });
  const ownedReal = await realpath(privateRoot);
  assert.equal(owned.isDirectory(), true);
  assert.equal(owned.isSymbolicLink(), false);
  assert.notEqual(owned.ino, 0n);
  assert.equal(ownedReal, privateRoot);
  assert.equal(path.dirname(ownedReal), tempRoot);
  const relativeToWorkspace = path.relative(await realpath(ROOT), ownedReal);
  assert.ok(relativeToWorkspace.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToWorkspace));
  t.after(async () => {
    const current = await lstat(privateRoot, { bigint: true });
    assert.equal(current.isDirectory(), true);
    assert.equal(current.isSymbolicLink(), false);
    assert.equal(current.dev, owned.dev);
    assert.equal(current.ino, owned.ino);
    assert.equal(await realpath(privateRoot), ownedReal);
    assert.equal(path.dirname(ownedReal), tempRoot);
    await rm(ownedReal, { recursive: true, force: false });
  });
  await mkdir(path.join(privateRoot, "dossiers"));
  await mkdir(path.join(privateRoot, "opinions"));
  for (const artifact of [...graph.dossiers, ...graph.opinions]) {
    await writeFile(path.join(privateRoot, artifact.relativePath), artifact.raw, { flag: "wx" });
  }
  return privateRoot;
}

function submissions(graph, count, withIdentity = true) {
  return graph.opinions.slice(0, count).map((artifact, index) => ({
    opinionRelativePath: artifact.relativePath,
    sealReceiptRecord: artifact.sealReceipt,
    ...(withIdentity ? { identity: {
      dossierRelativePath: graph.dossiers[index].relativePath,
      identityBindingRecord: graph.dossiers[index].identity
    } } : {})
  }));
}

const opinionOptions = (privateRoot, artifact, sealReceiptRecord = artifact.sealReceipt) => ({
  workspaceRoot: ROOT, privateRoot, opinionRelativePath: artifact.relativePath, sealReceiptRecord
});
const identityOptions = (privateRoot, artifact) => ({
  workspaceRoot: ROOT, privateRoot, dossierRelativePath: artifact.relativePath, identityBindingRecord: artifact.identity
});

function assertBlockedProgress(result, received, opinionFiles, dossierFiles) {
  const progress = result.expertReviewProgress;
  assert.equal(result.currentAvailable, true);
  assert.equal(progress.status, "blocked");
  assert.equal(progress.receivedOriginalOpinions, received);
  assert.equal(progress.qualifiedIndependentOpinions, 0);
  assert.equal(progress.qualificationReceiptLoaderAvailable, false);
  assert.equal(progress.independenceState, "not_established");
  assert.equal(progress.structuralScope, "verified_current_packet_and_readiness");
  assert.deepEqual(progress.privateFileEvidence, {
    originalOpinionFilesVerified: opinionFiles,
    identityDossierArtifactsVerified: dossierFiles,
    qualificationsEstablished: false
  });
  assert.ok(Object.values(result.authorityBoundary).every((value) => value === false));
  assert.equal(progress.expertReviewBundleComplete, false);
  assert.equal(progress.releaseReady, false);
  assert.equal(progress.expertClaimsAuthorized, false);
  assert.equal(progress.publicDeploymentAuthorized, false);
  for (const seat of progress.seats) {
    assert.equal(seat.qualified, false);
    if (seat.originalReceived) assert.equal(seat.currentScopeMatched, true);
    assert.ok(seat.missingEvidence.includes("TRUSTED_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE"));
  }
}

function assertNoPrivateOutput(output, privateRoot, graph) {
  assert.equal(output.includes(privateRoot), false);
  assert.equal(output.includes(JSON.stringify(privateRoot).slice(1, -1)), false);
  assert.equal(output.includes(BODY_MARKER), false);
  for (const entry of [...graph.dossiers, ...graph.opinions]) assert.equal(output.includes(entry.relativePath), false);
  const inspect = (value) => {
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(["privateRoot", "opinionRelativePath", "dossierRelativePath", "payload", "originalText", "rationale"].includes(key), false, key);
      inspect(child);
    }
  };
  inspect(JSON.parse(output));
}

function privateCliEnvironment() {
  const env = {};
  for (const key of ["SystemRoot", "WINDIR", "SystemDrive", "COMSPEC", "PATH", "PATHEXT", "TEMP", "TMP"]) {
    if (typeof process.env[key] === "string") env[key] = process.env[key];
  }
  return env;
}

test("current private intake derives the exact selected session with four questions and ten factors", async () => {
  const session = await loadBaziCurrentExpertIntakeSessionBinding(ROOT);
  const index = await loadCurrentIndex(ROOT);
  const selected = index.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent;
  const readiness = index.entries.find((entry) => entry.familyKey === "content/system-admission/bazi-binding-freeze-requirements").selectedCurrent;
  assert.equal(selected.version, "1.6.0");
  assert.deepEqual(session, {
    systemId: "bazi", surfaceId: "single-chart-report", surfaceVersion: "1.7.0",
    packetId: selected.packetId, packetDigest: selected.packetDigest, packetRawSha256: selected.rawSha256,
    readinessLedgerId: readiness.artifactId, readinessLedgerDigest: readiness.semanticDigest,
    reviewQuestionIds: [...BAZI_EXPERT_REVIEW_QUESTION_IDS],
    independenceFactorIds: [...BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS]
  });
});

test("current private files report received zero one and two while every qualification remains zero", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  for (const count of [0, 1, 2]) {
    const result = await loadBaziCurrentExpertReviewProgressFromPrivateFiles(ROOT, { privateRoot, submissions: submissions(graph, count) });
    assertBlockedProgress(result, count, count, count);
    assertNoPrivateOutput(JSON.stringify(result), privateRoot, graph);
  }
});

test("the first current original is received without an optional identity dossier", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const result = await loadBaziCurrentExpertReviewProgressFromPrivateFiles(ROOT, { privateRoot, submissions: submissions(graph, 1, false) });
  assertBlockedProgress(result, 1, 1, 0);
  const received = result.expertReviewProgress.seats.find((seat) => seat.originalReceived);
  assert.equal(received.privateIdentityDossierArtifactVerified, false);
  assert.ok(received.missingEvidence.includes("PRIVATE_IDENTITY_DOSSIER_ARTIFACT_MISSING"));
  assert.ok(received.missingEvidence.includes("REVIEWER_IDENTITY_NOT_VERIFIED"));
  const context = await verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, graph.opinions[0]));
  assertBlockedProgress(await loadBaziCurrentExpertReviewProgressFromPrivateContexts(ROOT, [context]), 1, 1, 0);
});

test("current identity and opinion contexts require the matching reviewer binding", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const opinions = await Promise.all(graph.opinions.map((entry) => verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, entry))));
  const identities = await Promise.all(graph.dossiers.map((entry) => verifyBaziCurrentPrivateIdentityDossierArtifact(identityOptions(privateRoot, entry))));
  const result = await loadBaziCurrentExpertReviewProgressFromPrivateContexts(ROOT, opinions, identities);
  assertBlockedProgress(result, 2, 2, 2);
  for (const seat of result.expertReviewProgress.seats) {
    assert.equal(seat.privateIdentityDossierArtifactVerified, true);
    assert.equal(seat.missingEvidence.includes("PRIVATE_IDENTITY_DOSSIER_ARTIFACT_MISSING"), false);
    assert.ok(seat.missingEvidence.includes("REVIEWER_IDENTITY_NOT_VERIFIED"));
  }
  await assert.rejects(loadBaziCurrentExpertReviewProgressFromPrivateContexts(ROOT, [opinions[0]], [identities[1]]),
    expectCode("CURRENT_PRIVATE_IDENTITY_REFERENCE_MISMATCH"));
});

test("two supplied identity records with one reviewer ID cannot occupy both current seats", async (t) => {
  const graph = await syntheticPrivateGraph(undefined, { sharedReviewerId: true });
  const privateRoot = await privateFixture(t, graph);
  const [identityA, identityB] = graph.dossiers.map((entry) => entry.identity);
  assert.equal(identityA.payload.reviewerId, identityB.payload.reviewerId);
  assert.notEqual(identityA.recordId, identityB.recordId);
  assert.notEqual(identityA.integrity.recordDigest, identityB.integrity.recordDigest);
  // Without dossiers the distinct public references establish no reviewer identity.
  assertBlockedProgress(await loadBaziCurrentExpertReviewProgressFromPrivateFiles(ROOT,
    { privateRoot, submissions: submissions(graph, 2, false) }), 2, 2, 0);
  await assert.rejects(loadBaziCurrentExpertReviewProgressFromPrivateFiles(ROOT,
    { privateRoot, submissions: submissions(graph, 2) }), expectCode("EXPERT_REVIEWER_DUPLICATE"));
});

test("plain context clones cannot supply private file evidence and duplicates do not occupy another seat", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const opinion = await verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, graph.opinions[0]));
  const identity = await verifyBaziCurrentPrivateIdentityDossierArtifact(identityOptions(privateRoot, graph.dossiers[0]));
  await assert.rejects(loadBaziCurrentExpertReviewProgressFromPrivateContexts(ROOT, [structuredClone(opinion)]),
    expectCode("CURRENT_PRIVATE_CONTEXT_INVALID"));
  await assert.rejects(loadBaziCurrentExpertReviewProgressFromPrivateContexts(ROOT, [opinion], [structuredClone(identity)]),
    expectCode("CURRENT_PRIVATE_CONTEXT_INVALID"));
  const duplicate = await loadBaziCurrentExpertReviewProgressFromPrivateContexts(ROOT, [opinion, opinion]);
  assert.equal(duplicate.expertReviewProgress.receivedOriginalOpinions, 1);
  assert.equal(duplicate.expertReviewProgress.duplicateOriginalRecords, 1);
  assert.equal(duplicate.expertReviewProgress.qualifiedIndependentOpinions, 0);
  assert.equal(duplicate.expertReviewProgress.seats.filter((seat) => seat.originalReceived).length, 1);
});

test("the current private entry rejects the original legacy session without rewriting it", async (t) => {
  const gap = JSON.parse(await readFile(path.join(ROOT, BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH), "utf8"));
  const legacySession = {
    systemId: "bazi", surfaceId: "single-chart-report", surfaceVersion: "1.7.0",
    packetId: gap.approvedPacketBinding.packetId, packetDigest: gap.approvedPacketBinding.packetDigest,
    packetRawSha256: gap.approvedPacketBinding.rawSha256,
    readinessLedgerId: gap.readinessLedgerBinding.ledgerId, readinessLedgerDigest: gap.readinessLedgerBinding.ledgerDigest,
    reviewQuestionIds: [...gap.reviewQuestionIds], independenceFactorIds: [...gap.independenceFactorIds]
  };
  const graph = await syntheticPrivateGraph(legacySession);
  const privateRoot = await privateFixture(t, graph);
  const before = JSON.stringify(graph.opinions[0].opinion);
  await assert.rejects(verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, graph.opinions[0])),
    expectCode("CURRENT_REVIEW_SCOPE_MISMATCH"));
  await assert.rejects(verifyBaziCurrentPrivateIdentityDossierArtifact(identityOptions(privateRoot, graph.dossiers[0])),
    expectCode("CURRENT_REVIEW_SCOPE_MISMATCH"));
  assert.equal(JSON.stringify(graph.opinions[0].opinion), before);
});

test("current opinion file raw SHA size and seal references must all match", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const artifact = graph.opinions[0];
  const changes = [
    (seal) => { seal.payload.rawOpinionArtifact.sha256 = "0".repeat(64); },
    (seal) => { seal.payload.rawOpinionArtifact.byteLength += 1; },
    (seal) => { seal.payload.opinionRef = recordRef(graph.opinions[1].opinion); },
    (seal) => { seal.payload.reviewerBindingRef = recordRef(graph.dossiers[1].identity); }
  ];
  for (const change of changes) {
    await assert.rejects(verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, artifact, resigned(artifact.sealReceipt, change))),
      expectCode("PRIVATE_OPINION_BINDING_INVALID"));
  }
  await writeFile(path.join(privateRoot, artifact.relativePath), Buffer.concat([artifact.raw, Buffer.from(" ")]));
  await assert.rejects(verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, artifact)),
    expectCode("PRIVATE_OPINION_BINDING_INVALID"));
});

test("current dossier bytes must match both identity digest declarations", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  await writeFile(path.join(privateRoot, graph.dossiers[0].relativePath), graph.dossiers[1].raw);
  await assert.rejects(verifyBaziCurrentPrivateIdentityDossierArtifact(identityOptions(privateRoot, graph.dossiers[0])),
    expectCode("PRIVATE_IDENTITY_DOSSIER_BINDING_INVALID"));
});

test("current sealing must follow original creation and precede seal receipt creation", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const artifact = graph.opinions[0];
  const earlyReceipt = resigned(artifact.sealReceipt, (seal) => {
    seal.createdAt = artifact.opinion.createdAt;
  });
  await assert.rejects(verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, artifact, earlyReceipt)),
    expectCode("INTAKE_RECORD_INVALID"));
  const earlySeal = resigned(artifact.sealReceipt, (seal) => {
    seal.payload.sealedAt = artifact.opinion.payload.submittedAt;
  });
  await assert.rejects(verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, artifact, earlySeal)),
    expectCode("PRIVATE_OPINION_BINDING_INVALID"));
});

test("legacy private APIs still reject current session records", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  await assert.rejects(verifyBaziPrivateOriginalOpinionFile(opinionOptions(privateRoot, graph.opinions[0])),
    expectCode("INTAKE_RECORD_INVALID"));
  await assert.rejects(verifyBaziPrivateIdentityDossierArtifact(identityOptions(privateRoot, graph.dossiers[0])),
    expectCode("INTAKE_RECORD_INVALID"));
});

test("current private intake submissions and context arrays remain bounded to two", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const submission = submissions(graph, 1)[0];
  await assert.rejects(loadBaziCurrentExpertReviewProgressFromPrivateFiles(ROOT, { privateRoot, submissions: [submission, submission, submission] }),
    expectCode("CURRENT_PRIVATE_INTAKE_REQUEST_INVALID"));
  const context = await verifyBaziCurrentPrivateOriginalOpinionFile(opinionOptions(privateRoot, graph.opinions[0]));
  await assert.rejects(loadBaziCurrentExpertReviewProgressFromPrivateContexts(ROOT, [context, context, context]),
    expectCode("CURRENT_PRIVATE_CONTEXT_INVALID"));
  const identity = await verifyBaziCurrentPrivateIdentityDossierArtifact(identityOptions(privateRoot, graph.dossiers[0]));
  await assert.rejects(loadBaziCurrentExpertReviewProgressFromPrivateContexts(ROOT, [context], [identity, identity, identity]),
    expectCode("CURRENT_PRIVATE_CONTEXT_INVALID"));
});

test("private intake JSON resolves files from its own directory and exposes no private paths or body", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const requestPath = path.join(privateRoot, "intake.json");
  await writeFile(requestPath, JSON.stringify(submissions(graph, 2)), { flag: "wx" });
  const result = await loadBaziCurrentExpertReviewProgressFromPrivateIntakeFile(ROOT, requestPath);
  assertBlockedProgress(result, 2, 2, 2);
  assertNoPrivateOutput(JSON.stringify(result), privateRoot, graph);
});

test("the private request array parser remains strict and the legacy object parser still rejects arrays", () => {
  assert.deepEqual(parseBaziExpertPrivateIntakeRequestJsonBytes(Buffer.from("[]", "utf8")), []);
  assert.deepEqual(parseBaziExpertReviewJsonBytes(Buffer.from("{}", "utf8")), {});
  assert.throws(() => parseBaziExpertReviewJsonBytes(Buffer.from("[]", "utf8")), expectCode("JSON_INVALID"));
  assert.throws(() => parseBaziExpertPrivateIntakeRequestJsonBytes(Buffer.from("{}", "utf8")), expectCode("JSON_INVALID"));
  assert.throws(() => parseBaziExpertPrivateIntakeRequestJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x5b, 0x5d])),
    expectCode("JSON_BOM_FORBIDDEN"));
  assert.throws(() => parseBaziExpertPrivateIntakeRequestJsonBytes(Buffer.from([0xc3, 0x28])),
    expectCode("JSON_UTF8_INVALID"));
  assert.throws(() => parseBaziExpertPrivateIntakeRequestJsonBytes(Buffer.from(
    '[{"opinionRelativePath":"synthetic-a.json","opinionRelativePath":"synthetic-b.json"}]', "utf8")),
  expectCode("JSON_DUPLICATE_KEY"));
});

test("expert CLI private intake emits only safe progress and still exits one with zero qualifications", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const requestPath = path.join(privateRoot, "intake.json");
  await writeFile(requestPath, JSON.stringify(submissions(graph, 2)), { flag: "wx" });
  const env = privateCliEnvironment();
  const privateRun = spawnSync(process.execPath, [CLI, "--private-intake", requestPath], {
    cwd: privateRoot, env, encoding: "utf8", timeout: 120_000
  });
  assert.equal(privateRun.error, undefined);
  assert.equal(privateRun.status, 1);
  assert.equal(privateRun.stderr, "EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE\n");
  assertNoPrivateOutput(privateRun.stdout, privateRoot, graph);
  assertBlockedProgress(JSON.parse(privateRun.stdout), 2, 2, 2);
  const normal = spawnSync(process.execPath, [CLI], { cwd: privateRoot, env, encoding: "utf8", timeout: 120_000 });
  assert.equal(normal.error, undefined);
  assert.equal(normal.status, 1);
  assert.equal(normal.stderr, "EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE\n");
  const progress = JSON.parse(normal.stdout).expertReviewProgress;
  assert.equal(progress.receivedOriginalOpinions, 0);
  assert.equal(progress.qualifiedIndependentOpinions, 0);
  assert.equal(progress.qualificationReceiptLoaderAvailable, false);
});

test("expert CLI malformed private request errors expose neither private paths nor body", async (t) => {
  const graph = await syntheticPrivateGraph();
  const privateRoot = await privateFixture(t, graph);
  const requestPath = path.join(privateRoot, "malformed-intake.json");
  await writeFile(requestPath, `[${JSON.stringify({ privateRoot, body: BODY_MARKER })},`, { flag: "wx" });
  const outcome = spawnSync(process.execPath, [CLI, "--private-intake", requestPath], {
    cwd: privateRoot, env: privateCliEnvironment(), encoding: "utf8", timeout: 120_000
  });
  assert.equal(outcome.error, undefined);
  assert.equal(outcome.status, 1);
  assert.equal(outcome.stdout, "");
  assert.equal(outcome.stderr, "JSON_INVALID\n");
  for (const privateValue of [privateRoot, requestPath, BODY_MARKER]) {
    assert.equal(`${outcome.stdout}${outcome.stderr}`.includes(privateValue), false);
  }
});
