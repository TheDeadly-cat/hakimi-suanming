import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, link, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS,
  BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH,
  BAZI_EXPERT_REVIEW_INTAKE_READINESS_BASIS_RELATIVE_PATH,
  BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
  BAZI_EXPERT_REVIEW_QUESTION_IDS,
  canonicalStringifyExpertReviewPacket,
  computeBaziExpertReviewIntakeRecordDigest,
  computeExpertReviewPacketDigest,
  parseBaziExpertReviewJsonBytes,
  preflightBaziExpertDisagreementInventory,
  preflightBaziExpertOriginalOpinion,
  preflightBaziExpertPairwiseIndependenceAssessment,
  preflightBaziExpertPrivateOpinionSealReceipt,
  preflightBaziExpertPublicIdentityBinding,
  preflightBaziExpertReconciliationNote,
  preflightBaziExpertReviewBundle,
  preflightBaziExpertReviewBundleFromPrivateEvidenceContexts,
  preflightBaziExpertReviewBundleFromPrivateOpinionContexts,
  preflightBaziExpertReviewIntakeJsonBytes,
  preflightBaziExpertReviewIntakeRecord,
  readBaziExpertReviewPacket,
  verifyBaziPrivateIdentityDossierArtifact,
  verifyBaziPrivateOriginalOpinionFile,
  verifyBaziExpertReviewIntakeGapLedger,
  verifyBaziExpertReviewSourceTrustChain,
  verifyBaziExpertReviewPacket
} from "./bazi-expert-review-packet-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packet = await readBaziExpertReviewPacket(workspaceRoot);
const intakeGap = JSON.parse(await readFile(
  path.join(workspaceRoot, ...BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH.split("/")),
  "utf8"
));
const readinessRelativePath = intakeGap.readinessLedgerBinding.path;
const SHA_A = "1".repeat(64);
const SHA_B = "2".repeat(64);
const SHA_C = "3".repeat(64);

async function makeHistoricalGapWorkspace(t, { includeBasis = true, includeCurrentAlias = false } = {}) {
  const temporaryParent = await realpath(os.tmpdir());
  const temporaryRoot = await mkdtemp(path.join(temporaryParent, "hbeg-"));
  const ownedReal = await realpath(temporaryRoot);
  const owned = await lstat(temporaryRoot, { bigint: true });
  assert.equal(ownedReal, temporaryRoot);
  assert.equal(path.dirname(ownedReal), temporaryParent);
  assert.equal(owned.isDirectory(), true);
  assert.equal(owned.isSymbolicLink(), false);
  assert.notEqual(owned.ino, 0n);
  t.after(async () => {
    const current = await lstat(temporaryRoot, { bigint: true });
    assert.equal(current.isDirectory(), true);
    assert.equal(current.isSymbolicLink(), false);
    assert.equal(current.dev, owned.dev);
    assert.equal(current.ino, owned.ino);
    assert.equal(await realpath(temporaryRoot), ownedReal);
    assert.equal(path.dirname(ownedReal), temporaryParent);
    await rm(ownedReal, { recursive: true, force: false });
  });
  const inputs = [BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH, BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH];
  if (includeBasis) inputs.push(BAZI_EXPERT_REVIEW_INTAKE_READINESS_BASIS_RELATIVE_PATH);
  if (includeCurrentAlias) inputs.push(readinessRelativePath);
  for (const relativePath of inputs) {
    const target = path.resolve(temporaryRoot, ...relativePath.split("/"));
    assert.equal(path.relative(temporaryRoot, target).startsWith(".."), false);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(workspaceRoot, ...relativePath.split("/")), target);
  }
  return temporaryRoot;
}

function refreshedPacket(mutator) {
  const candidate = structuredClone(packet);
  mutator(candidate);
  candidate.packetDigest = computeExpertReviewPacketDigest(candidate);
  return candidate;
}

function recordRef(record) {
  return {
    recordId: record.recordId,
    recordDigest: record.integrity.recordDigest
  };
}

function recordRefToken(record) {
  const ref = recordRef(record);
  return `${ref.recordDigest}:${ref.recordId}`;
}

function stableRecordOrder(records) {
  return [...records].sort((left, right) => recordRefToken(left).localeCompare(recordRefToken(right)));
}

function intakeSessionBinding() {
  return {
    systemId: "bazi",
    surfaceId: "single-chart-report",
    surfaceVersion: "1.7.0",
    packetId: intakeGap.approvedPacketBinding.packetId,
    packetDigest: intakeGap.approvedPacketBinding.packetDigest,
    packetRawSha256: intakeGap.approvedPacketBinding.rawSha256,
    readinessLedgerId: intakeGap.readinessLedgerBinding.ledgerId,
    readinessLedgerDigest: intakeGap.readinessLedgerBinding.ledgerDigest,
    reviewQuestionIds: [...BAZI_EXPERT_REVIEW_QUESTION_IDS],
    independenceFactorIds: [...BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS]
  };
}

function signedIntakeRecord({ recordType, recordId, createdAt, payload, reviewPurpose = "candidate_feedback_only" }) {
  const record = {
    schemaVersion: "1.0.0",
    recordType,
    recordId,
    recordVersion: "1.0.0",
    createdAt,
    reviewPurpose,
    sessionBinding: intakeSessionBinding(),
    payload,
    integrity: {
      hashAlgorithm: "SHA-256",
      digestDomain: "hakimi.bazi.expert-review-intake-record.v1",
      recordDigest: "0".repeat(64),
      digestIsDigitalSignature: false,
      authenticityEstablished: false
    }
  };
  record.integrity.recordDigest = computeBaziExpertReviewIntakeRecordDigest(record);
  return record;
}

function resignedIntakeRecord(record, mutator) {
  const candidate = structuredClone(record);
  mutator(candidate);
  candidate.integrity.recordDigest = computeBaziExpertReviewIntakeRecordDigest(candidate);
  return candidate;
}

function responseRef(opinion, responseId) {
  return {
    ...recordRef(opinion),
    responseId
  };
}

function buildSyntheticIntakeFixture() {
  const makeIdentity = (suffix, digest) => signedIntakeRecord({
    recordType: "bazi_expert_public_identity_binding_v1",
    recordId: `test-only.identity-${suffix}`,
    createdAt: "2026-08-29T00:30:00.000Z",
    payload: {
      reviewerId: `test-only-reviewer-${suffix}`,
      displayNameOrControlledPseudonym: `Test-only reviewer ${suffix.toUpperCase()}`,
      roleId: "domain_expert",
      verificationMethod: "private_dossier_review",
      verificationDate: "2026-08-29T00:20:00.000Z",
      reviewScope: [
        "bazi_rule_interpretation",
        "school_profile",
        "counterexample_cases",
        "high_risk_expression_boundary"
      ],
      evidenceType: "credential_and_scope_evidence",
      verifiedBy: {
        verifierId: "test-only-independent-verifier",
        verifierBindingRef: null
      },
      credentialDigest: digest,
      privateDossierRef: {
        opaqueRecordId: `test-only-dossier-${suffix}`,
        storageClass: "encrypted_offline_private",
        encryptedArtifactSha256: digest,
        repositoryStorageAllowed: false
      },
      roleOverlapDisclosures: []
    }
  });
  const identityA = makeIdentity("a", SHA_A);
  const identityB = makeIdentity("b", SHA_B);
  const identityBindings = stableRecordOrder([identityA, identityB]);
  const independenceAssessment = signedIntakeRecord({
    recordType: "bazi_expert_pairwise_independence_assessment_v1",
    recordId: "test-only.independence-a-b",
    createdAt: "2026-08-29T01:31:00.000Z",
    payload: {
      assessmentId: "test-only-assessment-a-b",
      reviewerPair: identityBindings.map((identity) => ({
        reviewerId: identity.payload.reviewerId,
        bindingRef: recordRef(identity)
      })),
      assessedBy: "test-only-independence-assessor",
      assessmentStartedAt: "2026-08-29T01:00:00.000Z",
      assessmentCompletedAt: "2026-08-29T01:30:00.000Z",
      factors: BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS.map((factorId, index) => ({
        factorId,
        reviewerADeclaration: "no_conflict_disclosed",
        reviewerBDeclaration: "no_conflict_disclosed",
        privateEvidenceRefs: [],
        assessorDisposition: "no_material_conflict_observed",
        disclosureDigest: createHash("sha256").update(`test-only:${factorId}`, "utf8").digest("hex"),
        assessedAt: `2026-08-29T01:${String(10 + index).padStart(2, "0")}:00.000Z`
      })),
      sharedDependencyDisclosures: [],
      overallDisposition: "not_established",
      collectionEligibility: "blocked"
    }
  });

  const makeOpinion = (suffix, slotId, identity, startAt, submitAt, createdAt) => signedIntakeRecord({
    recordType: "bazi_expert_original_opinion_v1",
    recordId: `test-only.opinion-${suffix}`,
    createdAt,
    payload: {
      opinionKind: "original",
      slotId,
      reviewerBindingRef: recordRef(identity),
      independenceAssessmentRef: recordRef(independenceAssessment),
      independenceCompletedAt: independenceAssessment.payload.assessmentCompletedAt,
      reviewStartedAt: startAt,
      submittedAt: submitAt,
      priorExposureState: "none_declared",
      responses: BAZI_EXPERT_REVIEW_QUESTION_IDS.map((questionId, index) => ({
        responseId: `test-only-response-${suffix}-${index + 1}`,
        questionId,
        position: suffix === "a" ? "support" : "oppose",
        originalText: `Test-only synthetic response ${suffix}-${index + 1}`,
        rationale: `Test-only synthetic rationale ${suffix}-${index + 1}`,
        evidenceRefs: [],
        uncertainties: ["test-only synthetic uncertainty"],
        affectedBindingIds: [],
        affectedStructures: [],
        highRiskBoundary: "defer"
      })),
      scopeStatement: "Test-only structural candidate; not an expert opinion.",
      excludedScopes: [...packet.reviewScope.excludedScopes],
      parentOriginalOpinionRef: null
    }
  });
  const opinionA = makeOpinion(
    "a", "domain-expert-a", identityA,
    "2026-08-29T02:00:00.000Z", "2026-08-29T03:00:00.000Z", "2026-08-29T03:20:00.000Z"
  );
  const opinionB = makeOpinion(
    "b", "domain-expert-b", identityB,
    "2026-08-29T02:10:00.000Z", "2026-08-29T03:10:00.000Z", "2026-08-29T03:30:00.000Z"
  );
  const opinions = stableRecordOrder([opinionA, opinionB]);

  const makeSeal = (suffix, opinion, identity, sealedAt, createdAt) => signedIntakeRecord({
    recordType: "bazi_expert_private_opinion_seal_receipt_v1",
    recordId: `test-only.seal-${suffix}`,
    createdAt,
    payload: {
      sealReceiptId: `test-only-seal-${suffix}`,
      opinionRef: recordRef(opinion),
      reviewerBindingRef: recordRef(identity),
      opinionSubmittedAt: opinion.payload.submittedAt,
      rawOpinionArtifact: {
        sha256: createHash("sha256").update(`test-only-opinion-artifact-${suffix}`, "utf8").digest("hex"),
        byteLength: 512,
        mediaType: "application/json",
        encoding: "utf-8"
      },
      privateStorage: {
        storageClass: "encrypted_offline_private",
        opaqueRecordId: `test-only-opinion-store-${suffix}`,
        encryptedArtifactSha256: createHash("sha256").update(`test-only-encrypted-${suffix}`, "utf8").digest("hex"),
        repositoryStorageAllowed: false
      },
      sealedAt,
      sealedByCustodian: "test-only-custodian",
      firstSeenReceiptRef: null,
      retrievalVerificationReceiptRef: null
    }
  });
  const sealA = makeSeal(
    "a", opinionA, identityA,
    "2026-08-29T04:00:00.000Z", "2026-08-29T04:20:00.000Z"
  );
  const sealB = makeSeal(
    "b", opinionB, identityB,
    "2026-08-29T04:10:00.000Z", "2026-08-29T04:30:00.000Z"
  );
  const sealReceipts = stableRecordOrder([sealA, sealB]);

  const questionComparisons = BAZI_EXPERT_REVIEW_QUESTION_IDS.map((questionId, index) => ({
    questionId,
    comparisonState: "different_declared_position",
    expertAResponseRef: responseRef(opinionA, opinionA.payload.responses[index].responseId),
    expertBResponseRef: responseRef(opinionB, opinionB.payload.responses[index].responseId)
  }));
  const disagreements = questionComparisons.map((comparison, index) => ({
    disagreementId: `test-only-disagreement-${index + 1}`,
    disagreementType: "rule_interpretation",
    questionIds: [comparison.questionId],
    bindingIds: [],
    structureIds: [],
    opinionEvidenceRefs: [comparison.expertAResponseRef, comparison.expertBResponseRef],
    requiredDisposition: "preserve_parallel_interpretations_no_winner",
    status: "unresolved",
    selectedWinner: null,
    majorityVoteApplied: false,
    opinionAveragingApplied: false,
    generatedModelWinnerSelectionApplied: false,
    requiresNewPacketAndBothReviews: false
  }));
  const disagreementInventory = signedIntakeRecord({
    recordType: "bazi_expert_disagreement_inventory_v1",
    recordId: "test-only.disagreement-inventory",
    createdAt: "2026-08-29T05:10:00.000Z",
    payload: {
      inventoryId: "test-only-inventory",
      opinionRefs: opinions.map(recordRef),
      sealReceiptRefs: sealReceipts.map(recordRef),
      comparedAt: "2026-08-29T05:00:00.000Z",
      createdBy: "test-only-comparison-custodian",
      latestSealAt: "2026-08-29T04:10:00.000Z",
      questionComparisons,
      agreementItems: [],
      disagreements,
      comparisonMethod: "human_side_by_side_no_winner"
    }
  });
  const reconciliationNote = signedIntakeRecord({
    recordType: "bazi_expert_reconciliation_note_v1",
    recordId: "test-only.reconciliation-note",
    createdAt: "2026-08-29T05:40:00.000Z",
    payload: {
      noteId: "test-only-reconciliation",
      inventoryRef: recordRef(disagreementInventory),
      opinionRefs: opinions.map(recordRef),
      sealReceiptRefs: sealReceipts.map(recordRef),
      inventoryCreatedAt: disagreementInventory.createdAt,
      latestSealAt: disagreementInventory.payload.latestSealAt,
      reconciledAt: "2026-08-29T05:30:00.000Z",
      dispositions: disagreements.map((disagreement) => ({
        disagreementId: disagreement.disagreementId,
        disagreementType: disagreement.disagreementType,
        disposition: disagreement.requiredDisposition,
        proposalRef: null,
        selectedWinner: null,
        requiresNewPacketAndBothReviews: false
      })),
      originalsOverwritten: false,
      productMutation: false,
      majorityVoteApplied: false,
      opinionAveragingApplied: false,
      generatedModelWinnerSelectionApplied: false
    }
  });
  const componentRefs = {
    identityBindings: identityBindings.map(recordRef),
    independenceAssessment: recordRef(independenceAssessment),
    opinions: opinions.map(recordRef),
    sealReceipts: sealReceipts.map(recordRef),
    disagreementInventory: recordRef(disagreementInventory),
    reconciliationNote: recordRef(reconciliationNote),
    supplements: []
  };
  const bundle = signedIntakeRecord({
    recordType: "bazi_expert_review_bundle_v1",
    recordId: "test-only.review-bundle",
    createdAt: "2026-08-29T06:00:00.000Z",
    payload: {
      bundleId: "test-only-bundle",
      componentRefs,
      componentChronology: {
        independenceCompletedAt: independenceAssessment.payload.assessmentCompletedAt,
        expertAReviewStartedAt: opinionA.payload.reviewStartedAt,
        expertBReviewStartedAt: opinionB.payload.reviewStartedAt,
        expertASubmittedAt: opinionA.payload.submittedAt,
        expertBSubmittedAt: opinionB.payload.submittedAt,
        expertASealedAt: sealA.payload.sealedAt,
        expertBSealedAt: sealB.payload.sealedAt,
        inventoryCreatedAt: disagreementInventory.createdAt,
        reconciliationCreatedAt: reconciliationNote.createdAt
      },
      inputClosureBindings: null,
      componentSetDigest: createHash("sha256")
        .update(canonicalStringifyExpertReviewPacket(componentRefs), "utf8")
        .digest("hex"),
      derivedGateProjection: {
        identityBindingsVerified: 0,
        sealedOriginalOpinionsVerified: 0,
        pairwiseIndependenceVerified: 0,
        independentExpertReviewsVerified: 0,
        expertReviewBundleComplete: false,
        countsTowardExpertGate: false,
        contentTruthEstablished: false,
        expertTruthEstablished: false,
        releaseReady: false
      },
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    }
  });
  const componentRecords = {
    identityBindings,
    independenceAssessment,
    originalOpinions: opinions,
    sealReceipts,
    disagreementInventory,
    reconciliationNote,
    supplements: []
  };
  return {
    identityA,
    identityB,
    identityBindings,
    independenceAssessment,
    opinionA,
    opinionB,
    opinions,
    sealA,
    sealB,
    sealReceipts,
    disagreementInventory,
    reconciliationNote,
    bundle,
    componentRecords
  };
}

function resignSyntheticIntakeGraph(fixture, mutators = {}) {
  const identityA = resignedIntakeRecord(fixture.identityA, (value) => mutators.identityA?.(value));
  const identityB = resignedIntakeRecord(fixture.identityB, (value) => mutators.identityB?.(value));
  const identityBindings = stableRecordOrder([identityA, identityB]);
  const independenceAssessment = resignedIntakeRecord(fixture.independenceAssessment, (value) => {
    value.payload.reviewerPair = identityBindings.map((identity) => ({
      reviewerId: identity.payload.reviewerId,
      bindingRef: recordRef(identity)
    }));
    mutators.independenceAssessment?.(value);
  });
  const opinionA = resignedIntakeRecord(fixture.opinionA, (value) => {
    value.payload.reviewerBindingRef = recordRef(identityA);
    value.payload.independenceAssessmentRef = recordRef(independenceAssessment);
    mutators.opinionA?.(value);
  });
  const opinionB = resignedIntakeRecord(fixture.opinionB, (value) => {
    value.payload.reviewerBindingRef = recordRef(identityB);
    value.payload.independenceAssessmentRef = recordRef(independenceAssessment);
    mutators.opinionB?.(value);
  });
  const opinions = stableRecordOrder([opinionA, opinionB]);
  const sealA = resignedIntakeRecord(fixture.sealA, (value) => {
    value.payload.opinionRef = recordRef(opinionA);
    value.payload.reviewerBindingRef = recordRef(identityA);
    mutators.sealA?.(value);
  });
  const sealB = resignedIntakeRecord(fixture.sealB, (value) => {
    value.payload.opinionRef = recordRef(opinionB);
    value.payload.reviewerBindingRef = recordRef(identityB);
    mutators.sealB?.(value);
  });
  const sealReceipts = stableRecordOrder([sealA, sealB]);
  const disagreementInventory = resignedIntakeRecord(fixture.disagreementInventory, (value) => {
    value.payload.opinionRefs = opinions.map(recordRef);
    value.payload.sealReceiptRefs = sealReceipts.map(recordRef);
    value.payload.latestSealAt = [sealA.payload.sealedAt, sealB.payload.sealedAt].sort().at(-1);
    value.payload.questionComparisons = BAZI_EXPERT_REVIEW_QUESTION_IDS.map((questionId, index) => ({
      questionId,
      comparisonState: "different_declared_position",
      expertAResponseRef: responseRef(opinionA, opinionA.payload.responses[index].responseId),
      expertBResponseRef: responseRef(opinionB, opinionB.payload.responses[index].responseId)
    }));
    value.payload.disagreements = value.payload.disagreements.map((disagreement, index) => ({
      ...disagreement,
      opinionEvidenceRefs: [
        value.payload.questionComparisons[index].expertAResponseRef,
        value.payload.questionComparisons[index].expertBResponseRef
      ]
    }));
    mutators.disagreementInventory?.(value);
  });
  const reconciliationNote = resignedIntakeRecord(fixture.reconciliationNote, (value) => {
    value.payload.inventoryRef = recordRef(disagreementInventory);
    value.payload.opinionRefs = opinions.map(recordRef);
    value.payload.sealReceiptRefs = sealReceipts.map(recordRef);
    value.payload.inventoryCreatedAt = disagreementInventory.createdAt;
    value.payload.latestSealAt = disagreementInventory.payload.latestSealAt;
    mutators.reconciliationNote?.(value);
  });
  const componentRefs = {
    identityBindings: identityBindings.map(recordRef),
    independenceAssessment: recordRef(independenceAssessment),
    opinions: opinions.map(recordRef),
    sealReceipts: sealReceipts.map(recordRef),
    disagreementInventory: recordRef(disagreementInventory),
    reconciliationNote: recordRef(reconciliationNote),
    supplements: []
  };
  const bundle = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs = componentRefs;
    value.payload.componentChronology = {
      independenceCompletedAt: independenceAssessment.payload.assessmentCompletedAt,
      expertAReviewStartedAt: opinionA.payload.reviewStartedAt,
      expertBReviewStartedAt: opinionB.payload.reviewStartedAt,
      expertASubmittedAt: opinionA.payload.submittedAt,
      expertBSubmittedAt: opinionB.payload.submittedAt,
      expertASealedAt: sealA.payload.sealedAt,
      expertBSealedAt: sealB.payload.sealedAt,
      inventoryCreatedAt: disagreementInventory.createdAt,
      reconciliationCreatedAt: reconciliationNote.createdAt
    };
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(componentRefs), "utf8")
      .digest("hex");
    mutators.bundle?.(value);
  });
  return {
    identityA,
    identityB,
    identityBindings,
    independenceAssessment,
    opinionA,
    opinionB,
    opinions,
    sealA,
    sealB,
    sealReceipts,
    disagreementInventory,
    reconciliationNote,
    bundle,
    componentRecords: {
      identityBindings,
      independenceAssessment,
      originalOpinions: opinions,
      sealReceipts,
      disagreementInventory,
      reconciliationNote,
      supplements: []
    }
  };
}

function buildPrivateOriginalOpinionGraph({ externalReceiptRefs = false } = {}) {
  const fixture = buildSyntheticIntakeFixture();
  const rawByRecordId = new Map([
    [fixture.opinionA.recordId, Buffer.from(JSON.stringify(fixture.opinionA), "utf8")],
    [fixture.opinionB.recordId, Buffer.from(JSON.stringify(fixture.opinionB), "utf8")]
  ]);
  const bindRawArtifact = (suffix) => (seal) => {
    const raw = rawByRecordId.get(`test-only.opinion-${suffix}`);
    seal.payload.rawOpinionArtifact = {
      sha256: createHash("sha256").update(raw).digest("hex"),
      byteLength: raw.byteLength,
      mediaType: "application/json",
      encoding: "utf-8"
    };
    if (externalReceiptRefs) {
      seal.payload.firstSeenReceiptRef = {
        recordId: `test-only.first-seen-${suffix}`,
        recordDigest: createHash("sha256").update(`first-seen-${suffix}`, "utf8").digest("hex")
      };
      seal.payload.retrievalVerificationReceiptRef = {
        recordId: `test-only.retrieval-${suffix}`,
        recordDigest: createHash("sha256").update(`retrieval-${suffix}`, "utf8").digest("hex")
      };
    }
  };
  const graph = resignSyntheticIntakeGraph(fixture, {
    sealA: bindRawArtifact("a"),
    sealB: bindRawArtifact("b")
  });
  const artifacts = graph.componentRecords.originalOpinions.map((opinion) => {
    const raw = rawByRecordId.get(opinion.recordId);
    assert.equal(raw.toString("utf8"), JSON.stringify(opinion));
    const sealReceipt = graph.componentRecords.sealReceipts.find((seal) =>
      seal.payload.opinionRef.recordId === opinion.recordId
      && seal.payload.opinionRef.recordDigest === opinion.integrity.recordDigest);
    assert.ok(sealReceipt);
    return {
      opinion,
      sealReceipt,
      raw,
      relativePath: `opinions/${opinion.payload.slotId}.json`
    };
  });
  return { ...graph, artifacts };
}

function privateContextBundleComponents(componentRecords) {
  return {
    identityBindings: componentRecords.identityBindings,
    independenceAssessment: componentRecords.independenceAssessment,
    disagreementInventory: componentRecords.disagreementInventory,
    reconciliationNote: componentRecords.reconciliationNote,
    supplements: componentRecords.supplements
  };
}

async function writePrivateOriginalOpinionArtifacts(privateRoot, graph) {
  await mkdir(path.join(privateRoot, "opinions"), { recursive: true });
  for (const artifact of graph.artifacts) {
    await writeFile(path.join(privateRoot, ...artifact.relativePath.split("/")), artifact.raw);
  }
}

async function verifyPrivateOriginalOpinionContexts(privateRoot, graph) {
  return Promise.all(graph.artifacts.map((artifact) => verifyBaziPrivateOriginalOpinionFile({
    workspaceRoot,
    privateRoot,
    opinionRelativePath: artifact.relativePath,
    sealReceiptRecord: artifact.sealReceipt
  })));
}

function buildPrivateIdentityAndOpinionGraph() {
  const dossierBytesByReviewerId = new Map([
    ["test-only-reviewer-a", Buffer.from([0x00, 0xff, 0x91, 0x10, 0x41, 0x2d, 0x64, 0x6f, 0x73, 0x73, 0x69, 0x65, 0x72])],
    ["test-only-reviewer-b", Buffer.from([0x00, 0xfe, 0x92, 0x20, 0x42, 0x2d, 0x64, 0x6f, 0x73, 0x73, 0x69, 0x65, 0x72])]
  ]);
  const fixture = buildSyntheticIntakeFixture();
  const dossierSha = (reviewerId) => createHash("sha256")
    .update(dossierBytesByReviewerId.get(reviewerId))
    .digest("hex");
  const dossierBoundGraph = resignSyntheticIntakeGraph(fixture, {
    identityA(value) {
      const digest = dossierSha(value.payload.reviewerId);
      value.payload.credentialDigest = digest;
      value.payload.privateDossierRef.encryptedArtifactSha256 = digest;
    },
    identityB(value) {
      const digest = dossierSha(value.payload.reviewerId);
      value.payload.credentialDigest = digest;
      value.payload.privateDossierRef.encryptedArtifactSha256 = digest;
    }
  });
  const opinionRawByRecordId = new Map(dossierBoundGraph.opinions.map((opinion) => [
    opinion.recordId,
    Buffer.from(JSON.stringify(opinion), "utf8")
  ]));
  const bindOpinionRaw = (recordId) => (seal) => {
    const raw = opinionRawByRecordId.get(recordId);
    seal.payload.rawOpinionArtifact = {
      sha256: createHash("sha256").update(raw).digest("hex"),
      byteLength: raw.byteLength,
      mediaType: "application/json",
      encoding: "utf-8"
    };
  };
  const graph = resignSyntheticIntakeGraph(dossierBoundGraph, {
    sealA: bindOpinionRaw("test-only.opinion-a"),
    sealB: bindOpinionRaw("test-only.opinion-b")
  });
  const dossierArtifacts = graph.identityBindings.map((identity) => ({
    identity,
    raw: dossierBytesByReviewerId.get(identity.payload.reviewerId),
    relativePath: `dossiers/${identity.payload.reviewerId}.opaque`
  }));
  const opinionArtifacts = graph.opinions.map((opinion) => {
    const raw = opinionRawByRecordId.get(opinion.recordId);
    assert.equal(raw.toString("utf8"), JSON.stringify(opinion));
    const sealReceipt = graph.sealReceipts.find((seal) =>
      seal.payload.opinionRef.recordId === opinion.recordId
      && seal.payload.opinionRef.recordDigest === opinion.integrity.recordDigest);
    assert.ok(sealReceipt);
    return {
      opinion,
      sealReceipt,
      raw,
      relativePath: `opinions/${opinion.payload.slotId}.json`
    };
  });
  return { ...graph, dossierArtifacts, opinionArtifacts, artifacts: opinionArtifacts };
}

function privateEvidenceContextBundleComponents(componentRecords) {
  return {
    independenceAssessment: componentRecords.independenceAssessment,
    disagreementInventory: componentRecords.disagreementInventory,
    reconciliationNote: componentRecords.reconciliationNote,
    supplements: componentRecords.supplements
  };
}

async function writePrivateIdentityAndOpinionArtifacts(privateRoot, graph) {
  await mkdir(path.join(privateRoot, "dossiers"), { recursive: true });
  await writePrivateOriginalOpinionArtifacts(privateRoot, graph);
  for (const artifact of graph.dossierArtifacts) {
    await writeFile(path.join(privateRoot, ...artifact.relativePath.split("/")), artifact.raw);
  }
}

async function verifyPrivateIdentityDossierContexts(privateRoot, graph) {
  return Promise.all(graph.dossierArtifacts.map((artifact) => verifyBaziPrivateIdentityDossierArtifact({
    workspaceRoot,
    privateRoot,
    dossierRelativePath: artifact.relativePath,
    identityBindingRecord: artifact.identity
  })));
}

test("current vacant packet fails closed on the known bazi-core artifact drift", async () => {
  await assert.rejects(
    verifyBaziExpertReviewPacket(workspaceRoot, structuredClone(packet)),
    (error) => error?.code === "ARTIFACT_DRIFT" && /packages\/bazi-core\/src\/index\.ts/u.test(error.message)
  );
});

test("raw expert JSON rejects BOM invalid UTF-8 and duplicate keys", () => {
  assert.throws(
    () => parseBaziExpertReviewJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error?.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseBaziExpertReviewJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error?.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseBaziExpertReviewJsonBytes(Buffer.from('{"packetId":"one","packetId":"two"}', "utf8")),
    (error) => error?.code === "JSON_DUPLICATE_KEY"
  );
});

test("object API rejects a time-varying accessor without invoking it", async () => {
  const candidate = structuredClone(packet);
  let reads = 0;
  Object.defineProperty(candidate.gateSummary, "expertClaimsAuthorized", {
    configurable: true,
    enumerable: true,
    get() {
      reads += 1;
      return reads > 1;
    }
  });
  await assert.rejects(
    verifyBaziExpertReviewPacket(workspaceRoot, candidate),
    (error) => error?.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);
});

test("packet identity only accepts the approved canonical millisecond UTC timestamp", async () => {
  for (const createdAt of [
    "0",
    "2026-02-30T00:00:00.000Z",
    "2026-08-29T08:00:00+08:00",
    "2026-08-29T00:00:00Z"
  ]) {
    await assert.rejects(
      verifyBaziExpertReviewPacket(workspaceRoot, refreshedPacket((value) => { value.createdAt = createdAt; })),
      (error) => error?.code === "PACKET_IDENTITY_INVALID"
    );
  }
});

test("malformed packet containers return stable domain errors rather than native TypeError", async () => {
  for (const mutation of [
    (value) => { value.disagreementPolicy = {}; },
    (value) => { value.reviewerSlots = {}; }
  ]) {
    await assert.rejects(
      verifyBaziExpertReviewPacket(workspaceRoot, refreshedPacket(mutation)),
      (error) => error?.name === "BaziExpertReviewPacketError" && error?.code === "PACKET_INVALID"
    );
  }
});

test("approved zero-instance intake gap returns a detached deeply frozen fail-closed ledger", async () => {
  const result = await verifyBaziExpertReviewIntakeGapLedger(workspaceRoot, structuredClone(packet));
  assert.equal(result.verificationScope, "historical_intake_gap_snapshot");
  assert.equal(result.currentApplicabilityAssessed, false);
  assert.equal(result.ledger.readinessLedgerBinding.path, readinessRelativePath);
  assert.notEqual(result.ledger, intakeGap);
  assert.equal(Object.isFrozen(result.ledger), true);
  assert.equal(Object.isFrozen(result.ledger.currentInstances), true);
  assert.equal(Object.isFrozen(result.ledger.expertReviewBundle), true);
  assert.equal(result.currentRecordInstances, 0);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.expertReviewBundleComplete, false);
  assert.equal(result.candidateFeedbackCollectionReady, false);
  assert.equal(result.releaseClosureReviewReady, false);
  assert.equal(result.ledger.expertReviewBundle.state, "absent");
  assert.equal(result.ledger.expertReviewBundle.count, 0);
  assert.equal(result.ledger.releaseGovernance.publicDeploymentAuthorized, false);
  assert.equal(result.ledger.releaseGovernance.expertClaimsAuthorized, false);
  assert.equal(Reflect.set(result.ledger.expertReviewBundle, "state", "bound"), false);
});

test("same packet id cannot be self-resigned onto current artifact bytes", async () => {
  const currentCoreBytes = await readFile(path.join(workspaceRoot, "packages/bazi-core/src/index.ts"));
  const currentCoreSha256 = createHash("sha256").update(currentCoreBytes).digest("hex");
  const candidate = refreshedPacket((value) => {
    value.artifactLocks[0].sha256 = currentCoreSha256;
  });
  await assert.rejects(
    verifyBaziExpertReviewPacket(workspaceRoot, candidate),
    (error) => error?.code === "PACKET_DIGEST_MISMATCH"
  );
});

test("packet reader rejects a workspace-internal junction in its directory chain", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-expert-junction-"));
  try {
    const materializedContent = path.join(temporaryRoot, "materialized-content");
    await mkdir(materializedContent);
    await copyFile(
      path.join(workspaceRoot, ...BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH.split("/")),
      path.join(materializedContent, path.basename(BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH))
    );
    await symlink(
      materializedContent,
      path.join(temporaryRoot, "content"),
      process.platform === "win32" ? "junction" : "dir"
    );
    await assert.rejects(
      readBaziExpertReviewPacket(temporaryRoot),
      (error) => error?.code === "PACKET_INVALID" && /目录链/u.test(error.message)
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("intake gap raw identity and caller packet binding fail closed", async (t) => {
  const temporaryRoot = await makeHistoricalGapWorkspace(t, { includeCurrentAlias: true });
  const gapPath = path.join(temporaryRoot, ...BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH.split("/"));
  const originalBytes = await readFile(gapPath);
  await writeFile(gapPath, Buffer.concat([originalBytes, Buffer.from(" ", "utf8")]));
  await assert.rejects(
    verifyBaziExpertReviewIntakeGapLedger(temporaryRoot, structuredClone(packet)),
    (error) => error?.code === "INTAKE_GAP_INVALID"
  );
  await writeFile(gapPath, originalBytes);
  const selfResigned = refreshedPacket((value) => { value.gateSummary.releaseReady = true; });
  await assert.rejects(
    verifyBaziExpertReviewIntakeGapLedger(temporaryRoot, selfResigned),
    (error) => error?.code === "PACKET_APPROVAL_BINDING_MISMATCH"
  );
});

test("historical intake gap rejects a missing readiness archive without alias fallback", async (t) => {
  const temporaryRoot = await makeHistoricalGapWorkspace(t, { includeBasis: false, includeCurrentAlias: true });
  await assert.rejects(
    verifyBaziExpertReviewIntakeGapLedger(temporaryRoot, structuredClone(packet)),
    (error) => error?.code === "INTAKE_GAP_INVALID"
  );
});

test("historical intake gap rejects corrupted readiness archive bytes", async (t) => {
  const temporaryRoot = await makeHistoricalGapWorkspace(t);
  const basisPath = path.join(temporaryRoot, ...BAZI_EXPERT_REVIEW_INTAKE_READINESS_BASIS_RELATIVE_PATH.split("/"));
  const bytes = await readFile(basisPath);
  assert.equal(bytes.length, 26_038);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201");
  await writeFile(basisPath, Buffer.concat([bytes, Buffer.from(" ", "utf8")]));
  await assert.rejects(
    verifyBaziExpertReviewIntakeGapLedger(temporaryRoot, structuredClone(packet)),
    (error) => error?.code === "INTAKE_GAP_BINDING_DRIFT"
  );
});

test("historical intake gap uses the original basis with an absent or current 1.6 readiness alias", async (t) => {
  for (const includeCurrentAlias of [false, true]) {
    const temporaryRoot = await makeHistoricalGapWorkspace(t, { includeCurrentAlias });
    const aliasPath = path.join(temporaryRoot, ...readinessRelativePath.split("/"));
    if (includeCurrentAlias) {
      const alias = JSON.parse(await readFile(aliasPath, "utf8"));
      assert.equal(alias.ledgerId, "hakimi.bazi.strength.binding-freeze-readiness/1.6.0");
    } else {
      await assert.rejects(readFile(aliasPath), (error) => error?.code === "ENOENT");
    }
    const result = await verifyBaziExpertReviewIntakeGapLedger(temporaryRoot, structuredClone(packet));
    assert.equal(result.verificationScope, "historical_intake_gap_snapshot");
    assert.equal(result.currentApplicabilityAssessed, false);
    assert.equal(result.currentRecordInstances, 0);
    assert.equal(result.independentExpertReviewsVerified, 0);
    assert.equal(result.expertReviewBundleComplete, false);
    assert.equal(result.candidateFeedbackCollectionReady, false);
    assert.equal(result.releaseClosureReviewReady, false);
    assert.ok(Object.values(result.ledger.currentInstances.counts).every((value) => value === 0));
    assert.equal(result.ledger.readinessLedgerBinding.path, "content/system-admission/bazi-binding-freeze-requirements.v1.json");
    assert.equal(result.ledger.readinessLedgerBinding.rawBytes, 26_038);
    assert.equal(result.ledger.readinessLedgerBinding.rawSha256, "662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201");
    assert.equal(result.ledger.readinessLedgerBinding.ledgerId, "hakimi.bazi.strength.binding-freeze-readiness/1.5.0");
  }
});

test("the current 1.6 expert packet cannot replace the historical 1.5 gap packet", async (t) => {
  const temporaryRoot = await makeHistoricalGapWorkspace(t);
  const currentPacket = JSON.parse(await readFile(path.join(workspaceRoot,
    "content", "bazi-strength-expert-review-packet.current.json"), "utf8"));
  assert.equal(currentPacket.packetId, "hakimi.bazi.strength.expert-review-packet/1.6.0");
  await assert.rejects(
    verifyBaziExpertReviewIntakeGapLedger(temporaryRoot, currentPacket),
    (error) => error?.code === "PACKET_APPROVAL_BINDING_MISMATCH"
  );
});

test("expert packet directly verifies the complete source and three-layer rights candidate trust chain", async () => {
  const [sourceLedger, rightsLedger] = await Promise.all([
    readFile(path.join(workspaceRoot, "content/bazi-strength-source-binding-candidates.v1.json"), "utf8").then(JSON.parse),
    readFile(path.join(workspaceRoot, "content/bazi-strength-source-rights-candidates.v1.json"), "utf8").then(JSON.parse)
  ]);
  assert.deepEqual(
    verifyBaziExpertReviewSourceTrustChain(sourceLedger, rightsLedger),
    {
      sourceCandidatesVerified: 4,
      rightsCandidatesVerified: 4,
      carrierAnchorsVerified: 5
    }
  );

  const forgedSourceRevision = structuredClone(sourceLedger);
  forgedSourceRevision.candidates[0].carrierIdentity.revisionId += 1;
  assert.throws(
    () => verifyBaziExpertReviewSourceTrustChain(forgedSourceRevision, rightsLedger),
    /来源／三层权利候选信任链无效/u
  );

  const detachedRights = structuredClone(rightsLedger);
  detachedRights.candidates[0].sourceCandidateId = rightsLedger.candidates[1].sourceCandidateId;
  assert.throws(
    () => verifyBaziExpertReviewSourceTrustChain(sourceLedger, detachedRights),
    /来源／三层权利候选信任链无效/u
  );

  const missingCarrier = structuredClone(rightsLedger);
  missingCarrier.candidates[1].carrierLayers.pop();
  assert.throws(
    () => verifyBaziExpertReviewSourceTrustChain(sourceLedger, missingCarrier),
    /来源／三层权利候选信任链无效/u
  );
});

test("rejects an unapproved packet digest before consuming refreshed artifact locks", async () => {
  const candidate = refreshedPacket((value) => { value.artifactLocks[0].sha256 = "f".repeat(64); });
  await assert.rejects(
    verifyBaziExpertReviewPacket(workspaceRoot, candidate),
    (error) => error?.code === "PACKET_DIGEST_MISMATCH"
  );
});

test("rejects fabricating a reviewer identity or opinion in the public candidate packet", async () => {
  const candidate = refreshedPacket((value) => {
    value.reviewerSlots[0].reviewerBinding = { reviewerId: "fake-expert" };
    value.reviewerSlots[0].status = "submitted";
  });
  await assert.rejects(verifyBaziExpertReviewPacket(workspaceRoot, candidate), /不能伪造现实专家或意见/u);
});

test("rejects promoted expert counts or authorization", async () => {
  const mutations = [
    (value) => { value.gateSummary.reviewerSlotsOccupied = 2; },
    (value) => { value.gateSummary.independentExpertReviewsVerified = 2; },
    (value) => { value.gateSummary.expertTruthEstablished = true; },
    (value) => { value.releaseGovernance.expertClaimsAuthorized = true; },
    (value) => { value.releaseGovernance.publicDeploymentAuthorized = true; }
  ];
  for (const mutate of mutations) {
    await assert.rejects(verifyBaziExpertReviewPacket(workspaceRoot, refreshedPacket(mutate)), /(必须保持|不得改变)/u);
  }
});

test("rejects deleting an independence conflict factor", async () => {
  const candidate = refreshedPacket((value) => { value.independenceChecklist.pop(); });
  await assert.rejects(verifyBaziExpertReviewPacket(workspaceRoot, candidate), /independenceChecklist/u);
});

test("rejects drifting the common question set, role separation or review sequence", async () => {
  const mutations = [
    (value) => { value.reviewQuestions[0].question = "different question"; },
    (value) => { value.roleSeparation[0].allowedScope.push("rights_legal_conclusion"); },
    (value) => { value.reviewProcess.sameQuestionSetRequired = false; },
    (value) => { value.reviewProcess.steps.reverse(); }
  ];
  for (const mutate of mutations) {
    await assert.rejects(
      verifyBaziExpertReviewPacket(workspaceRoot, refreshedPacket(mutate)),
      /(reviewQuestions|roleSeparation|审阅|reviewProcess)/u
    );
  }
});

test("rejects weakening the private dossier and public identity field split", async () => {
  const mutations = [
    (value) => { value.identityPrivacyPolicy.privateDossier.repositoryStorageAllowed = true; },
    (value) => { value.identityPrivacyPolicy.privateDossier.fields.pop(); },
    (value) => { value.identityPrivacyPolicy.publicIdentityBindingFields.push("rawCredentialDocument"); },
    (value) => { value.identityPrivacyPolicy.publicPacketProhibitedFields.pop(); }
  ];
  for (const mutate of mutations) {
    await assert.rejects(
      verifyBaziExpertReviewPacket(workspaceRoot, refreshedPacket(mutate)),
      /(身份|identityPrivacyPolicy)/u
    );
  }
});

test("rejects majority vote, averaging, model-selected winners or unresolved adoption", async () => {
  const keys = [
    "majorityVoteAllowed",
    "opinionAveragingAllowed",
    "generatedModelWinnerSelectionAllowed",
    "unresolvedDisagreementMayBeAdopted"
  ];
  for (const key of keys) {
    const candidate = refreshedPacket((value) => { value.automatedResolutionPolicy[key] = true; });
    await assert.rejects(verifyBaziExpertReviewPacket(workspaceRoot, candidate), /不得多数表决、平均或由生成模型选赢家/u);
  }
});

test("rejects replacing parallel disagreement preservation with winner selection", async () => {
  const candidate = refreshedPacket((value) => {
    value.disagreementPolicy[3].requiredDisposition = "select_winner";
  });
  await assert.rejects(verifyBaziExpertReviewPacket(workspaceRoot, candidate), /disagreementPolicy/u);
});

test("rejects adding private identity fields to a public reviewer slot", async () => {
  const candidate = refreshedPacket((value) => { value.reviewerSlots[0].legalName = "private"; });
  await assert.rejects(verifyBaziExpertReviewPacket(workspaceRoot, candidate), /(字段集合不匹配|不得包含身份字段)/u);
});

test("seven intake record formats preflight only structural candidates and keep every authority projection false", () => {
  const fixture = buildSyntheticIntakeFixture();
  const results = [
    preflightBaziExpertPublicIdentityBinding(fixture.identityA),
    preflightBaziExpertOriginalOpinion(fixture.opinionA),
    preflightBaziExpertPrivateOpinionSealReceipt(fixture.sealA),
    preflightBaziExpertPairwiseIndependenceAssessment(fixture.independenceAssessment),
    preflightBaziExpertDisagreementInventory(fixture.disagreementInventory),
    preflightBaziExpertReconciliationNote(fixture.reconciliationNote),
    preflightBaziExpertReviewBundle(fixture.bundle, fixture.componentRecords)
  ];
  assert.equal(results.length, 7);
  for (const result of results) {
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.record), true);
    assert.equal(Object.isFrozen(result.record.sessionBinding), true);
    assert.equal(result.identityVerified, false);
    assert.equal(result.realIdentityEstablished, false);
    assert.equal(result.authenticityEstablished, false);
    assert.equal(result.opinionAuthenticityEstablished, false);
    assert.equal(result.independenceVerified, false);
    assert.equal(result.pairwiseIndependenceEstablished, false);
    assert.equal(result.countsTowardExpertGate, false);
    assert.equal(result.expertReviewBundleComplete, false);
    assert.equal(result.expertTruthEstablished, false);
    assert.equal(result.candidateFeedbackCollectionReady, false);
    assert.equal(result.releaseClosureReviewReady, false);
    assert.equal(result.releaseReady, false);
    assert.equal(result.publicDeploymentAuthorized, false);
    assert.equal(result.expertClaimsAuthorized, false);
  }
  assert.equal(results.at(-1).bundleAssemblyStructurallyPreflighted, true);
  assert.deepEqual(results.at(-1).componentCounts, {
    identityBindings: 2,
    independenceAssessments: 1,
    originalOpinions: 2,
    sealReceipts: 2,
    disagreementInventories: 1,
    reconciliationNotes: 1,
    supplements: 0
  });
  const identityJsonResult = preflightBaziExpertReviewIntakeJsonBytes(
    Buffer.from(JSON.stringify(fixture.identityA), "utf8")
  );
  assert.equal(identityJsonResult.recordType, "bazi_expert_public_identity_binding_v1");
  fixture.identityA.payload.displayNameOrControlledPseudonym = "mutated after preflight";
  assert.notEqual(results[0].record.payload.displayNameOrControlledPseudonym, "mutated after preflight");
});

test("private original-opinion files bind held-handle bytes to seals and rebuild a redacted structural bundle", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-opinion-happy-"));
  try {
    const graph = buildPrivateOriginalOpinionGraph();
    await writePrivateOriginalOpinionArtifacts(privateRoot, graph);
    const contexts = await verifyPrivateOriginalOpinionContexts(privateRoot, graph);
    assert.equal(contexts.length, 2);
    for (const context of contexts) {
      const artifact = graph.artifacts.find((entry) => entry.opinion.recordId === context.recordId);
      assert.ok(artifact);
      assert.equal(Object.isFrozen(context), true);
      assert.equal(Object.isFrozen(context.rawOpinionArtifact), true);
      assert.equal(context.rawOpinionArtifact.sha256, createHash("sha256").update(artifact.raw).digest("hex"));
      assert.equal(context.rawOpinionArtifact.byteLength, artifact.raw.byteLength);
      assert.equal(context.sameBufferHashAndStrictJsonParse, true);
      assert.equal(context.heldHandleReadMechanicallyVerified, true);
      assert.equal(context.rawArtifactMatchesSealReceipt, true);
      assert.equal(context.identityVerified, false);
      assert.equal(context.authenticityEstablished, false);
      assert.equal(context.firstSeenEstablished, false);
      assert.equal(context.immutableFirstSeenEstablished, false);
      assert.equal(context.custodyEstablished, false);
      assert.equal(context.independenceVerified, false);
      assert.equal(context.countsTowardExpertGate, false);
      assert.equal(context.expertTruthEstablished, false);
      assert.equal(context.releaseReady, false);
      assert.equal(context.publicDeploymentAuthorized, false);
      assert.equal(context.expertClaimsAuthorized, false);
      assert.equal(Object.hasOwn(context, "record"), false);
      assert.equal(Object.hasOwn(context, "payload"), false);
      const serialized = JSON.stringify(context);
      assert.equal(serialized.includes("Test-only synthetic response"), false);
      assert.equal(serialized.includes(privateRoot), false);
      assert.equal(serialized.includes(artifact.relativePath), false);
    }

    const bundleResult = preflightBaziExpertReviewBundleFromPrivateOpinionContexts(
      graph.bundle,
      contexts,
      privateContextBundleComponents(graph.componentRecords)
    );
    assert.equal(bundleResult.bundleAssemblyStructurallyPreflighted, true);
    assert.equal(bundleResult.privateOriginalOpinionFilesMechanicallyBound, 2);
    assert.equal(bundleResult.identityVerified, false);
    assert.equal(bundleResult.authenticityEstablished, false);
    assert.equal(bundleResult.independenceVerified, false);
    assert.equal(bundleResult.countsTowardExpertGate, false);
    assert.equal(bundleResult.expertReviewBundleComplete, false);
    assert.equal(bundleResult.expertTruthEstablished, false);
    assert.equal(bundleResult.releaseReady, false);
    assert.equal(bundleResult.publicDeploymentAuthorized, false);
    assert.equal(bundleResult.expertClaimsAuthorized, false);
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private original-opinion root and relative-path boundaries reject overlap, escape, UNC and ADS", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-opinion-path-"));
  try {
    const graph = buildPrivateOriginalOpinionGraph();
    await writePrivateOriginalOpinionArtifacts(privateRoot, graph);
    const artifact = graph.artifacts[0];
    for (const overlappingRoot of [workspaceRoot, path.dirname(workspaceRoot)]) {
      await assert.rejects(
        verifyBaziPrivateOriginalOpinionFile({
          workspaceRoot,
          privateRoot: overlappingRoot,
          opinionRelativePath: artifact.relativePath,
          sealReceiptRecord: artifact.sealReceipt
        }),
        (error) => error?.name === "BaziExpertReviewPacketError"
          && error?.code === "PRIVATE_OPINION_ROOT_OVERLAPS_WORKSPACE"
          && !error.message.includes(overlappingRoot)
      );
    }
    for (const opinionRelativePath of [
      "../outside.json", "opinions//a.json", "opinions/./a.json", "opinions/a.json:stream",
      "opinions\\a.json", "/absolute.json", "C:/absolute.json", "//server/share/a.json", "opinions/a\0.json"
    ]) {
      await assert.rejects(
        verifyBaziPrivateOriginalOpinionFile({
          workspaceRoot,
          privateRoot,
          opinionRelativePath,
          sealReceiptRecord: artifact.sealReceipt
        }),
        (error) => error?.name === "BaziExpertReviewPacketError"
          && error?.code === "PRIVATE_OPINION_PATH_INVALID"
          && !error.message.includes(privateRoot)
          && !error.message.includes(opinionRelativePath)
      );
    }
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private original-opinion endpoint rejects hardlinks and directory or file redirects", async (t) => {
  const tempBase = await mkdtemp(path.join(os.tmpdir(), "bazi-private-opinion-links-"));
  const privateRoot = path.join(tempBase, "private");
  const outsideRoot = path.join(tempBase, "outside");
  try {
    await mkdir(privateRoot, { recursive: true });
    await mkdir(outsideRoot, { recursive: true });
    const graph = buildPrivateOriginalOpinionGraph();
    await writePrivateOriginalOpinionArtifacts(privateRoot, graph);
    const artifact = graph.artifacts[0];

    await t.test("hardlink alias", async (subtest) => {
      const source = path.join(privateRoot, "hardlink-source.json");
      const alias = path.join(privateRoot, "hardlink-alias.json");
      await writeFile(source, artifact.raw);
      try {
        await link(source, alias);
      } catch (error) {
        if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
          subtest.skip(`hardlink unsupported: ${error.code}`);
          return;
        }
        throw error;
      }
      await assert.rejects(
        verifyBaziPrivateOriginalOpinionFile({
          workspaceRoot,
          privateRoot,
          opinionRelativePath: "hardlink-alias.json",
          sealReceiptRecord: artifact.sealReceipt
        }),
        (error) => error?.code === "PRIVATE_OPINION_FILE_INVALID"
      );
    });

    await t.test("file symlink", async (subtest) => {
      const linkPath = path.join(privateRoot, "opinion-link.json");
      try {
        await symlink(path.join(privateRoot, ...artifact.relativePath.split("/")), linkPath, "file");
      } catch (error) {
        if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
          subtest.skip(`file symlink unsupported: ${error.code}`);
          return;
        }
        throw error;
      }
      await assert.rejects(
        verifyBaziPrivateOriginalOpinionFile({
          workspaceRoot,
          privateRoot,
          opinionRelativePath: "opinion-link.json",
          sealReceiptRecord: artifact.sealReceipt
        }),
        (error) => error?.code === "PRIVATE_OPINION_FILE_INVALID"
      );
    });

    await t.test("intermediate junction", async (subtest) => {
      await writeFile(path.join(outsideRoot, "opinion.json"), artifact.raw);
      const junctionPath = path.join(privateRoot, "junction");
      try {
        await symlink(outsideRoot, junctionPath, process.platform === "win32" ? "junction" : "dir");
      } catch (error) {
        if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
          subtest.skip(`junction unsupported: ${error.code}`);
          return;
        }
        throw error;
      }
      await assert.rejects(
        verifyBaziPrivateOriginalOpinionFile({
          workspaceRoot,
          privateRoot,
          opinionRelativePath: "junction/opinion.json",
          sealReceiptRecord: artifact.sealReceipt
        }),
        (error) => error?.code === "PRIVATE_OPINION_DIRECTORY_INVALID"
      );
    });
  } finally {
    await rm(tempBase, { recursive: true, force: true });
  }
});

test("private original-opinion parser rejects BOM and duplicate keys while raw-byte drift cannot reuse a seal", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-opinion-json-"));
  try {
    const graph = buildPrivateOriginalOpinionGraph();
    await writePrivateOriginalOpinionArtifacts(privateRoot, graph);
    const artifact = graph.artifacts[0];
    const absolute = path.join(privateRoot, ...artifact.relativePath.split("/"));
    const invoke = () => verifyBaziPrivateOriginalOpinionFile({
      workspaceRoot,
      privateRoot,
      opinionRelativePath: artifact.relativePath,
      sealReceiptRecord: artifact.sealReceipt
    });

    await writeFile(absolute, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), artifact.raw]));
    await assert.rejects(invoke(), (error) => error?.code === "JSON_BOM_FORBIDDEN");

    await writeFile(absolute, Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8"));
    await assert.rejects(invoke(), (error) => error?.code === "JSON_DUPLICATE_KEY");

    await writeFile(absolute, Buffer.concat([artifact.raw, Buffer.from("\n", "utf8")]));
    await assert.rejects(
      invoke(),
      (error) => error?.code === "PRIVATE_OPINION_BINDING_INVALID"
        && !error.message.includes(privateRoot)
        && !error.message.includes("Test-only synthetic response")
    );
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private original-opinion seal binding rejects digest, length, refs, time, media and supplements", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-opinion-seal-"));
  try {
    const graph = buildPrivateOriginalOpinionGraph();
    await writePrivateOriginalOpinionArtifacts(privateRoot, graph);
    const artifact = graph.artifacts[0];
    const mutations = [
      (value) => { value.payload.rawOpinionArtifact.sha256 = SHA_C; },
      (value) => { value.payload.rawOpinionArtifact.byteLength += 1; },
      (value) => { value.payload.opinionRef.recordDigest = SHA_C; },
      (value) => { value.payload.reviewerBindingRef.recordDigest = SHA_C; },
      (value) => { value.payload.opinionSubmittedAt = "2026-08-29T02:59:00.000Z"; },
      (value) => { value.payload.rawOpinionArtifact.mediaType = "text/plain"; },
      (value) => { value.payload.rawOpinionArtifact.encoding = "utf-16"; }
    ];
    for (const mutation of mutations) {
      const sealReceiptRecord = resignedIntakeRecord(artifact.sealReceipt, mutation);
      await assert.rejects(
        verifyBaziPrivateOriginalOpinionFile({
          workspaceRoot,
          privateRoot,
          opinionRelativePath: artifact.relativePath,
          sealReceiptRecord
        }),
        (error) => error?.name === "BaziExpertReviewPacketError"
          && ["PRIVATE_OPINION_BINDING_INVALID", "INTAKE_RECORD_INVALID"].includes(error?.code)
          && !error.message.includes(privateRoot)
          && !error.message.includes("Test-only synthetic response")
      );
    }

    const supplement = resignedIntakeRecord(artifact.opinion, (value) => {
      value.recordId = "test-only.private-supplement";
      value.payload.opinionKind = "supplement";
      value.payload.priorExposureState = "exposure_disclosed";
      value.payload.parentOriginalOpinionRef = recordRef(artifact.opinion);
      value.payload.responses = value.payload.responses.map((response, index) => ({
        ...response,
        responseId: `test-only-private-supplement-response-${index + 1}`
      }));
    });
    const supplementRaw = Buffer.from(JSON.stringify(supplement), "utf8");
    const supplementRelativePath = "opinions/supplement.json";
    await writeFile(path.join(privateRoot, ...supplementRelativePath.split("/")), supplementRaw);
    const supplementSeal = resignedIntakeRecord(artifact.sealReceipt, (value) => {
      value.recordId = "test-only.private-supplement-seal";
      value.payload.sealReceiptId = "test-only-private-supplement-seal";
      value.payload.opinionRef = recordRef(supplement);
      value.payload.opinionSubmittedAt = supplement.payload.submittedAt;
      value.payload.rawOpinionArtifact.sha256 = createHash("sha256").update(supplementRaw).digest("hex");
      value.payload.rawOpinionArtifact.byteLength = supplementRaw.byteLength;
    });
    await assert.rejects(
      verifyBaziPrivateOriginalOpinionFile({
        workspaceRoot,
        privateRoot,
        opinionRelativePath: supplementRelativePath,
        sealReceiptRecord: supplementSeal
      }),
      (error) => error?.code === "PRIVATE_OPINION_BINDING_INVALID"
    );
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private opinion contexts cannot be forged, cloned or duplicated and external receipts never promote authority", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-opinion-context-"));
  try {
    const graph = buildPrivateOriginalOpinionGraph({ externalReceiptRefs: true });
    await writePrivateOriginalOpinionArtifacts(privateRoot, graph);
    const contexts = await verifyPrivateOriginalOpinionContexts(privateRoot, graph);
    for (const context of contexts) {
      assert.equal(context.firstSeenReceiptReferencePresent, true);
      assert.equal(context.retrievalVerificationReceiptReferencePresent, true);
      assert.equal(context.firstSeenEstablished, false);
      assert.equal(context.immutableFirstSeenEstablished, false);
      assert.equal(context.custodyEstablished, false);
      assert.equal(context.authenticityEstablished, false);
    }
    const components = privateContextBundleComponents(graph.componentRecords);
    const forgedVariants = [
      structuredClone(contexts[0]),
      JSON.parse(JSON.stringify(contexts[0])),
      { ...contexts[0] }
    ];
    for (const forged of forgedVariants) {
      assert.throws(
        () => preflightBaziExpertReviewBundleFromPrivateOpinionContexts(
          graph.bundle,
          [forged, contexts[1]],
          components
        ),
        (error) => error?.code === "INTAKE_RECORD_INVALID"
      );
    }
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateOpinionContexts(
        graph.bundle,
        [contexts[0], contexts[0]],
        components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    let contextReads = 0;
    const accessorContexts = [contexts[0], contexts[1]];
    Object.defineProperty(accessorContexts, "0", {
      configurable: true,
      enumerable: true,
      get() {
        contextReads += 1;
        return contexts[0];
      }
    });
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateOpinionContexts(
        graph.bundle,
        accessorContexts,
        components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    assert.equal(contextReads, 0);
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateOpinionContexts(
        graph.bundle,
        new Proxy([contexts[0], contexts[1]], {}),
        components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateOpinionContexts(
        graph.bundle,
        new Array(2),
        components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateOpinionContexts(
        graph.bundle,
        contexts,
        { ...components, originalOpinions: graph.componentRecords.originalOpinions }
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private identity dossier artifacts bind opaque held-handle bytes and join opinion contexts without authority promotion", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-identity-happy-"));
  try {
    const graph = buildPrivateIdentityAndOpinionGraph();
    await writePrivateIdentityAndOpinionArtifacts(privateRoot, graph);
    const identityContexts = await verifyPrivateIdentityDossierContexts(privateRoot, graph);
    const opinionContexts = await verifyPrivateOriginalOpinionContexts(privateRoot, graph);
    assert.equal(identityContexts.length, 2);
    for (const context of identityContexts) {
      const artifact = graph.dossierArtifacts.find((entry) =>
        entry.identity.payload.reviewerId === context.reviewerId);
      assert.ok(artifact);
      assert.equal(Object.isFrozen(context), true);
      assert.equal(Object.isFrozen(context.dossierArtifact), true);
      assert.equal(context.dossierArtifact.sha256, createHash("sha256").update(artifact.raw).digest("hex"));
      assert.equal(context.dossierArtifact.byteLength, artifact.raw.byteLength);
      assert.equal(context.privateRootOutsideWorkspaceMechanicallyVerified, true);
      assert.equal(context.plainDirectoryChainMechanicallyVerified, true);
      assert.equal(context.heldHandleReadMechanicallyVerified, true);
      assert.equal(context.sameHeldBufferShaMatchesCredentialAndDossierDigests, true);
      assert.equal(context.privateIdentityDossierArtifactMechanicallyBound, true);
      assert.equal(context.artifactEncryptionEstablished, false);
      assert.equal(context.encryptedStorageEstablished, false);
      assert.equal(context.requiredPrivateDossierFieldsVerified, false);
      assert.equal(context.identityVerified, false);
      assert.equal(context.realIdentityEstablished, false);
      assert.equal(context.credentialsVerified, false);
      assert.equal(context.scopeVerified, false);
      assert.equal(context.verifierIdentityEstablished, false);
      assert.equal(context.verifierAuthorityEstablished, false);
      assert.equal(context.authenticityEstablished, false);
      assert.equal(context.firstSeenEstablished, false);
      assert.equal(context.custodyEstablished, false);
      assert.equal(context.independenceVerified, false);
      assert.equal(context.countsTowardExpertGate, false);
      assert.equal(context.expertTruthEstablished, false);
      assert.equal(context.releaseReady, false);
      assert.equal(context.publicDeploymentAuthorized, false);
      assert.equal(context.expertClaimsAuthorized, false);
      assert.equal(Object.hasOwn(context, "record"), false);
      assert.equal(Object.hasOwn(context, "payload"), false);
      assert.equal(Object.hasOwn(context, "path"), false);
      assert.equal(Object.hasOwn(context, "bytes"), false);
      const serialized = JSON.stringify(context);
      assert.equal(serialized.includes(privateRoot), false);
      assert.equal(serialized.includes(artifact.relativePath), false);
      assert.equal(serialized.includes(artifact.raw.toString("hex")), false);
    }

    const result = preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
      graph.bundle,
      identityContexts,
      opinionContexts,
      privateEvidenceContextBundleComponents(graph.componentRecords)
    );
    assert.equal(result.bundleAssemblyStructurallyPreflighted, true);
    assert.equal(result.privateIdentityDossierArtifactsMechanicallyBound, 2);
    assert.equal(result.privateOriginalOpinionFilesMechanicallyBound, 2);
    for (const field of [
      "artifactEncryptionEstablished", "encryptedStorageEstablished", "requiredPrivateDossierFieldsVerified",
      "identityVerified", "realIdentityEstablished", "credentialsVerified", "scopeVerified",
      "verifierIdentityEstablished", "verifierAuthorityEstablished", "authenticityEstablished",
      "opinionAuthenticityEstablished", "firstSeenEstablished", "immutableFirstSeenEstablished",
      "custodyEstablished", "privateStorageVerified", "independenceVerified",
      "pairwiseIndependenceEstablished", "countsTowardExpertGate", "expertGateEligible",
      "expertReviewBundleComplete", "expertTruthEstablished", "sourceBindingClosureComplete",
      "sourceRightsClosureComplete", "candidateFeedbackCollectionReady", "releaseClosureReviewReady",
      "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"
    ]) assert.equal(result[field], false, field);
    assert.equal(result.bindingFrozenVerified, 0);
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private identity dossier root and relative paths reject overlap escape UNC ADS and redact inputs", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-identity-path-"));
  try {
    const graph = buildPrivateIdentityAndOpinionGraph();
    await writePrivateIdentityAndOpinionArtifacts(privateRoot, graph);
    const artifact = graph.dossierArtifacts[0];
    const invalidIdentity = resignedIntakeRecord(artifact.identity, (value) => {
      value.payload.roleId = "source_rights_reviewer";
    });
    await assert.rejects(
      verifyBaziPrivateIdentityDossierArtifact({
        workspaceRoot,
        privateRoot: path.join(privateRoot, "does-not-exist"),
        dossierRelativePath: artifact.relativePath,
        identityBindingRecord: invalidIdentity
      }),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    for (const overlappingRoot of [workspaceRoot, path.dirname(workspaceRoot)]) {
      await assert.rejects(
        verifyBaziPrivateIdentityDossierArtifact({
          workspaceRoot,
          privateRoot: overlappingRoot,
          dossierRelativePath: artifact.relativePath,
          identityBindingRecord: artifact.identity
        }),
        (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_ROOT_OVERLAPS_WORKSPACE"
          && !error.message.includes(overlappingRoot)
      );
    }
    for (const dossierRelativePath of [
      "../outside.bin", "dossiers//a.bin", "dossiers/./a.bin", "dossiers/a.bin:stream",
      "dossiers:stream/a.bin", "dossiers\\a.bin", "/absolute.bin", "C:/absolute.bin",
      "//server/share/a.bin", "dossiers/a\0.bin"
    ]) {
      await assert.rejects(
        verifyBaziPrivateIdentityDossierArtifact({
          workspaceRoot,
          privateRoot,
          dossierRelativePath,
          identityBindingRecord: artifact.identity
        }),
        (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_PATH_INVALID"
          && !error.message.includes(privateRoot)
          && !error.message.includes(dossierRelativePath)
          && !error.message.includes(artifact.raw.toString("hex"))
      );
    }
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private evidence endpoints reject a caller-spoofed workspace root before signing off-repo provenance", async () => {
  const spoofWorkspaceRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-spoof-workspace-"));
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-spoof-root-"));
  try {
    const graph = buildPrivateIdentityAndOpinionGraph();
    await writePrivateIdentityAndOpinionArtifacts(privateRoot, graph);
    const dossierArtifact = graph.dossierArtifacts[0];
    const opinionArtifact = graph.opinionArtifacts[0];

    await assert.rejects(
      verifyBaziPrivateIdentityDossierArtifact({
        workspaceRoot: spoofWorkspaceRoot,
        privateRoot,
        dossierRelativePath: dossierArtifact.relativePath,
        identityBindingRecord: dossierArtifact.identity
      }),
      (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_WORKSPACE_ROOT_UNTRUSTED"
        && !error.message.includes(spoofWorkspaceRoot)
        && !error.message.includes(privateRoot)
    );
    await assert.rejects(
      verifyBaziPrivateOriginalOpinionFile({
        workspaceRoot: spoofWorkspaceRoot,
        privateRoot,
        opinionRelativePath: opinionArtifact.relativePath,
        sealReceiptRecord: opinionArtifact.sealReceipt
      }),
      (error) => error?.code === "PRIVATE_OPINION_WORKSPACE_ROOT_UNTRUSTED"
        && !error.message.includes(spoofWorkspaceRoot)
        && !error.message.includes(privateRoot)
    );
  } finally {
    await rm(spoofWorkspaceRoot, { recursive: true, force: true });
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private identity dossier endpoint rejects hardlinks file symlinks and intermediate junctions", async (t) => {
  const tempBase = await mkdtemp(path.join(os.tmpdir(), "bazi-private-identity-links-"));
  const privateRoot = path.join(tempBase, "private");
  const outsideRoot = path.join(tempBase, "outside");
  try {
    await mkdir(privateRoot, { recursive: true });
    await mkdir(outsideRoot, { recursive: true });
    const graph = buildPrivateIdentityAndOpinionGraph();
    await writePrivateIdentityAndOpinionArtifacts(privateRoot, graph);
    const artifact = graph.dossierArtifacts[0];

    await t.test("hardlink alias", async (subtest) => {
      const source = path.join(privateRoot, "identity-source.opaque");
      const alias = path.join(privateRoot, "identity-alias.opaque");
      await writeFile(source, artifact.raw);
      try {
        await link(source, alias);
      } catch (error) {
        if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
          subtest.skip(`hardlink unsupported: ${error.code}`);
          return;
        }
        throw error;
      }
      await assert.rejects(
        verifyBaziPrivateIdentityDossierArtifact({
          workspaceRoot,
          privateRoot,
          dossierRelativePath: "identity-alias.opaque",
          identityBindingRecord: artifact.identity
        }),
        (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_FILE_INVALID"
      );
    });

    await t.test("file symlink", async (subtest) => {
      const linkPath = path.join(privateRoot, "identity-link.opaque");
      try {
        await symlink(path.join(privateRoot, ...artifact.relativePath.split("/")), linkPath, "file");
      } catch (error) {
        if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
          subtest.skip(`file symlink unsupported: ${error.code}`);
          return;
        }
        throw error;
      }
      await assert.rejects(
        verifyBaziPrivateIdentityDossierArtifact({
          workspaceRoot,
          privateRoot,
          dossierRelativePath: "identity-link.opaque",
          identityBindingRecord: artifact.identity
        }),
        (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_FILE_INVALID"
      );
    });

    await t.test("intermediate junction", async (subtest) => {
      await writeFile(path.join(outsideRoot, "identity.opaque"), artifact.raw);
      const junctionPath = path.join(privateRoot, "junction");
      try {
        await symlink(outsideRoot, junctionPath, process.platform === "win32" ? "junction" : "dir");
      } catch (error) {
        if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
          subtest.skip(`junction unsupported: ${error.code}`);
          return;
        }
        throw error;
      }
      await assert.rejects(
        verifyBaziPrivateIdentityDossierArtifact({
          workspaceRoot,
          privateRoot,
          dossierRelativePath: "junction/identity.opaque",
          identityBindingRecord: artifact.identity
        }),
        (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_DIRECTORY_INVALID"
      );
    });
  } finally {
    await rm(tempBase, { recursive: true, force: true });
  }
});

test("private identity dossier bytes and identity records cannot be cross-wired or self-resigned around the held buffer", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-identity-binding-"));
  try {
    const graph = buildPrivateIdentityAndOpinionGraph();
    await writePrivateIdentityAndOpinionArtifacts(privateRoot, graph);
    const artifactA = graph.dossierArtifacts.find((entry) => entry.identity.payload.reviewerId.endsWith("-a"));
    const artifactB = graph.dossierArtifacts.find((entry) => entry.identity.payload.reviewerId.endsWith("-b"));
    assert.ok(artifactA && artifactB);

    await assert.rejects(
      verifyBaziPrivateIdentityDossierArtifact({
        workspaceRoot,
        privateRoot,
        dossierRelativePath: artifactA.relativePath,
        identityBindingRecord: artifactB.identity
      }),
      (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_BINDING_INVALID"
        && !error.message.includes(privateRoot)
        && !error.message.includes(artifactA.relativePath)
        && !error.message.includes(artifactA.raw.toString("hex"))
    );

    const selfResigned = resignedIntakeRecord(artifactA.identity, (value) => {
      value.payload.credentialDigest = SHA_C;
      value.payload.privateDossierRef.encryptedArtifactSha256 = SHA_C;
    });
    await assert.rejects(
      verifyBaziPrivateIdentityDossierArtifact({
        workspaceRoot,
        privateRoot,
        dossierRelativePath: artifactA.relativePath,
        identityBindingRecord: selfResigned
      }),
      (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_BINDING_INVALID"
    );

    const absolute = path.join(privateRoot, ...artifactA.relativePath.split("/"));
    await writeFile(absolute, Buffer.concat([artifactA.raw, Buffer.from([0x00, 0x01])]));
    await assert.rejects(
      verifyBaziPrivateIdentityDossierArtifact({
        workspaceRoot,
        privateRoot,
        dossierRelativePath: artifactA.relativePath,
        identityBindingRecord: artifactA.identity
      }),
      (error) => error?.code === "PRIVATE_IDENTITY_DOSSIER_BINDING_INVALID"
        && !error.message.includes(privateRoot)
        && !error.message.includes(artifactA.relativePath)
    );
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private identity contexts resist forgery cloning proxies accessors sparse arrays duplicates and graph cross-wiring", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-identity-context-"));
  const otherRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-private-identity-cross-"));
  try {
    const graph = buildPrivateIdentityAndOpinionGraph();
    await writePrivateIdentityAndOpinionArtifacts(privateRoot, graph);
    const identityContexts = await verifyPrivateIdentityDossierContexts(privateRoot, graph);
    const opinionContexts = await verifyPrivateOriginalOpinionContexts(privateRoot, graph);
    const components = privateEvidenceContextBundleComponents(graph.componentRecords);
    for (const forged of [
      structuredClone(identityContexts[0]),
      JSON.parse(JSON.stringify(identityContexts[0])),
      { ...identityContexts[0] }
    ]) {
      assert.throws(
        () => preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
          graph.bundle, [forged, identityContexts[1]], opinionContexts, components
        ),
        (error) => error?.code === "INTAKE_RECORD_INVALID"
      );
    }
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
        graph.bundle, [identityContexts[0], identityContexts[0]], opinionContexts, components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    const firstIdentityArtifact = graph.dossierArtifacts.find((entry) =>
      entry.identity.payload.reviewerId === identityContexts[0].reviewerId);
    const secondIdentityArtifact = graph.dossierArtifacts.find((entry) =>
      entry.identity.payload.reviewerId !== identityContexts[0].reviewerId);
    assert.ok(firstIdentityArtifact && secondIdentityArtifact);
    const duplicateArtifactIdentity = resignedIntakeRecord(secondIdentityArtifact.identity, (value) => {
      const duplicateSha = createHash("sha256").update(firstIdentityArtifact.raw).digest("hex");
      value.payload.credentialDigest = duplicateSha;
      value.payload.privateDossierRef.encryptedArtifactSha256 = duplicateSha;
    });
    const duplicateArtifactPath = "dossiers/duplicate-artifact.opaque";
    await writeFile(path.join(privateRoot, ...duplicateArtifactPath.split("/")), firstIdentityArtifact.raw);
    const duplicateArtifactContext = await verifyBaziPrivateIdentityDossierArtifact({
      workspaceRoot,
      privateRoot,
      dossierRelativePath: duplicateArtifactPath,
      identityBindingRecord: duplicateArtifactIdentity
    });
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
        graph.bundle, [identityContexts[0], duplicateArtifactContext], opinionContexts, components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
        graph.bundle, new Proxy(identityContexts, {}), opinionContexts, components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
        graph.bundle, new Array(2), opinionContexts, components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    let reads = 0;
    const accessorContexts = [identityContexts[0], identityContexts[1]];
    Object.defineProperty(accessorContexts, "0", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return identityContexts[0];
      }
    });
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
        graph.bundle, accessorContexts, opinionContexts, components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
    assert.equal(reads, 0);
    for (const forbidden of [
      { identityBindings: graph.componentRecords.identityBindings },
      { originalOpinions: graph.componentRecords.originalOpinions },
      { sealReceipts: graph.componentRecords.sealReceipts }
    ]) {
      assert.throws(
        () => preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
          graph.bundle, identityContexts, opinionContexts, { ...components, ...forbidden }
        ),
        (error) => error?.code === "INTAKE_RECORD_INVALID"
      );
    }

    const opinionOnlyGraph = buildPrivateOriginalOpinionGraph();
    await writePrivateOriginalOpinionArtifacts(otherRoot, opinionOnlyGraph);
    const crossWiredOpinionContexts = await verifyPrivateOriginalOpinionContexts(otherRoot, opinionOnlyGraph);
    assert.throws(
      () => preflightBaziExpertReviewBundleFromPrivateEvidenceContexts(
        graph.bundle, identityContexts, crossWiredOpinionContexts, components
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
    await rm(otherRoot, { recursive: true, force: true });
  }
});

test("generic intake preflight refuses a bundle without the complete component graph", () => {
  const fixture = buildSyntheticIntakeFixture();
  assert.throws(
    () => preflightBaziExpertReviewIntakeRecord(fixture.bundle),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  assert.throws(
    () => preflightBaziExpertReviewIntakeJsonBytes(Buffer.from(JSON.stringify(fixture.bundle), "utf8")),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  assert.throws(
    () => preflightBaziExpertReviewBundle(fixture.bundle, {
      ...fixture.componentRecords,
      identityBindings: [fixture.identityA]
    }),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
});

test("intake records bind the exact bazi v1.7 session and strict canonical UTC", () => {
  const fixture = buildSyntheticIntakeFixture();
  const mutations = [
    (value) => { value.sessionBinding.systemId = "ziwei"; },
    (value) => { value.sessionBinding.surfaceVersion = "1.7.1"; },
    (value) => { value.sessionBinding.packetDigest = SHA_C; },
    (value) => { value.sessionBinding.reviewQuestionIds.reverse(); },
    (value) => { value.sessionBinding.independenceFactorIds.pop(); },
    (value) => { value.createdAt = "0"; },
    (value) => { value.createdAt = "2026-02-30T00:00:00.000Z"; },
    (value) => { value.createdAt = "2026-08-29T08:00:00+08:00"; },
    (value) => { value.createdAt = "2026-08-29T00:00:00Z"; }
  ];
  for (const mutation of mutations) {
    assert.throws(
      () => preflightBaziExpertPublicIdentityBinding(resignedIntakeRecord(fixture.identityA, mutation)),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  }
});

test("a SHA-256 self-digest cannot be relabeled as a signature, authenticity, truth or authorization", () => {
  const fixture = buildSyntheticIntakeFixture();
  for (const mutation of [
    (value) => { value.integrity.digestIsDigitalSignature = true; },
    (value) => { value.integrity.authenticityEstablished = true; }
  ]) {
    assert.throws(
      () => preflightBaziExpertPublicIdentityBinding(resignedIntakeRecord(fixture.identityA, mutation)),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  }
  const promotedBundle = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.publicDeploymentAuthorized = true;
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(promotedBundle, fixture.componentRecords),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
});

test("identity and opinion candidates reject public PII disclosures, duplicate responses, exposure ambiguity and unsafe high-risk labels", () => {
  const fixture = buildSyntheticIntakeFixture();
  const identityMutations = [
    (value) => { value.payload.verifiedBy.verifierId = value.payload.reviewerId; },
    (value) => { value.payload.roleOverlapDisclosures = ["contact-reviewer@example.com"]; },
    (value) => { value.payload.privateDossierRef.repositoryStorageAllowed = true; },
    (value) => { value.payload.legalName = "test-only forbidden"; }
  ];
  for (const mutation of identityMutations) {
    assert.throws(
      () => preflightBaziExpertPublicIdentityBinding(resignedIntakeRecord(fixture.identityA, mutation)),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  }
  const opinionMutations = [
    (value) => { value.payload.responses[1].responseId = value.payload.responses[0].responseId; },
    (value) => { value.payload.priorExposureState = "unknown"; },
    (value) => { value.payload.responses[0].highRiskBoundary = "publish_as_is"; },
    (value) => { value.payload.responses[0].questionId = value.payload.responses[1].questionId; }
  ];
  for (const mutation of opinionMutations) {
    assert.throws(
      () => preflightBaziExpertOriginalOpinion(resignedIntakeRecord(fixture.opinionA, mutation)),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  }
});

test("independence candidates reject pre-start assessments, shared upstream contradictions and collection promotion", () => {
  const fixture = buildSyntheticIntakeFixture();
  const mutations = [
    (value) => { value.payload.factors[0].assessedAt = "2026-08-29T00:59:59.999Z"; },
    (value) => {
      value.payload.sharedDependencyDisclosures = ["same_upstream_algorithm_or_textbook_dependency"];
      value.payload.overallDisposition = "independent_with_disclosures";
    },
    (value) => { value.payload.collectionEligibility = "candidate_feedback_only_allowed"; },
    (value) => { value.payload.assessedBy = value.payload.reviewerPair[0].reviewerId; }
  ];
  for (const mutation of mutations) {
    assert.throws(
      () => preflightBaziExpertPairwiseIndependenceAssessment(
        resignedIntakeRecord(fixture.independenceAssessment, mutation)
      ),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  }
});

test("four-question inventory and reconciliation cannot be emptied, voted, averaged or winner-selected", () => {
  const fixture = buildSyntheticIntakeFixture();
  const emptyInventory = resignedIntakeRecord(fixture.disagreementInventory, (value) => {
    value.payload.agreementItems = [];
    value.payload.disagreements = [];
  });
  assert.throws(
    () => preflightBaziExpertDisagreementInventory(emptyInventory),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  const mismatchedEvidence = resignedIntakeRecord(fixture.disagreementInventory, (value) => {
    value.payload.disagreements[0].opinionEvidenceRefs = value.payload.disagreements[1].opinionEvidenceRefs;
  });
  assert.throws(
    () => preflightBaziExpertDisagreementInventory(mismatchedEvidence),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  const voted = resignedIntakeRecord(fixture.disagreementInventory, (value) => {
    value.payload.disagreements[0].majorityVoteApplied = true;
  });
  assert.throws(
    () => preflightBaziExpertDisagreementInventory(voted),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  const emptyReconciliation = resignedIntakeRecord(fixture.reconciliationNote, (value) => {
    value.payload.dispositions = [];
  });
  assert.throws(
    () => preflightBaziExpertReconciliationNote(emptyReconciliation),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  const selfSignedEngineeringProposal = resignedIntakeRecord(fixture.reconciliationNote, (value) => {
    value.payload.dispositions[0] = {
      ...value.payload.dispositions[0],
      disagreementType: "engineering_error",
      disposition: "correct_artifact_and_repeat_both_reviews",
      proposalRef: { recordId: "test-only.unapproved-engineering-proposal", recordDigest: SHA_C },
      requiresNewPacketAndBothReviews: true
    };
  });
  assert.throws(
    () => preflightBaziExpertReconciliationNote(selfSignedEngineeringProposal),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
});

test("dedicated bundle preflight rejects invented refs, cross-record chronology drift and incomplete reconciliation", () => {
  const fixture = buildSyntheticIntakeFixture();
  const inventedRef = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs.opinions[0] = {
      recordId: "test-only.invented-opinion",
      recordDigest: SHA_C
    };
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(value.payload.componentRefs), "utf8")
      .digest("hex");
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(inventedRef, fixture.componentRecords),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  const chronologyDrift = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentChronology.expertASubmittedAt = "2026-08-29T03:05:00.000Z";
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(chronologyDrift, fixture.componentRecords),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
  const missingReconciliation = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs.reconciliationNote = null;
    value.payload.componentChronology.reconciliationCreatedAt = null;
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(value.payload.componentRefs), "utf8")
      .digest("hex");
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(missingReconciliation, fixture.componentRecords),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );

  const falseAgreementInventory = resignedIntakeRecord(fixture.disagreementInventory, (value) => {
    for (const comparison of value.payload.questionComparisons) {
      comparison.comparisonState = "same_declared_position";
    }
    value.payload.agreementItems = value.payload.questionComparisons.map((comparison, index) => ({
      agreementId: `test-only-false-agreement-${index + 1}`,
      questionIds: [comparison.questionId],
      opinionEvidenceRefs: [comparison.expertAResponseRef, comparison.expertBResponseRef],
      declaredAgreementOnly: true,
      consensusTruthEstablished: false
    }));
    value.payload.disagreements = [];
  });
  const falseAgreementBundle = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs.disagreementInventory = recordRef(falseAgreementInventory);
    value.payload.componentRefs.reconciliationNote = null;
    value.payload.componentChronology.reconciliationCreatedAt = null;
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(value.payload.componentRefs), "utf8")
      .digest("hex");
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(falseAgreementBundle, {
      ...fixture.componentRecords,
      disagreementInventory: falseAgreementInventory,
      reconciliationNote: null
    }),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );

  const earlySupplement = signedIntakeRecord({
    recordType: "bazi_expert_original_opinion_v1",
    recordId: "test-only.early-supplement",
    createdAt: "2026-08-29T01:41:00.000Z",
    payload: {
      ...structuredClone(fixture.opinionA.payload),
      opinionKind: "supplement",
      reviewStartedAt: "2026-08-29T01:31:00.000Z",
      submittedAt: "2026-08-29T01:40:00.000Z",
      priorExposureState: "exposure_disclosed",
      parentOriginalOpinionRef: recordRef(fixture.opinionA),
      responses: fixture.opinionA.payload.responses.map((response, index) => ({
        ...structuredClone(response),
        responseId: `test-only-early-supplement-response-${index + 1}`
      }))
    }
  });
  const earlySupplementBundle = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs.supplements = [recordRef(earlySupplement)];
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(value.payload.componentRefs), "utf8")
      .digest("hex");
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(earlySupplementBundle, {
      ...fixture.componentRecords,
      supplements: [earlySupplement]
    }),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );

  const parentIdAliasSupplement = signedIntakeRecord({
    recordType: "bazi_expert_original_opinion_v1",
    recordId: fixture.opinionA.recordId,
    createdAt: "2026-08-29T05:21:00.000Z",
    payload: {
      ...structuredClone(fixture.opinionA.payload),
      opinionKind: "supplement",
      reviewStartedAt: "2026-08-29T05:11:00.000Z",
      submittedAt: "2026-08-29T05:20:00.000Z",
      priorExposureState: "exposure_disclosed",
      parentOriginalOpinionRef: recordRef(fixture.opinionA),
      responses: fixture.opinionA.payload.responses.map((response, index) => ({
        ...structuredClone(response),
        responseId: `test-only-alias-supplement-response-${index + 1}`
      }))
    }
  });
  const parentIdAliasBundle = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs.supplements = [recordRef(parentIdAliasSupplement)];
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(value.payload.componentRefs), "utf8")
      .digest("hex");
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(parentIdAliasBundle, {
      ...fixture.componentRecords,
      supplements: [parentIdAliasSupplement]
    }),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );

  const wrongSlotSupplement = resignedIntakeRecord(parentIdAliasSupplement, (value) => {
    value.recordId = "test-only.wrong-slot-supplement";
    value.payload.slotId = "domain-expert-b";
  });
  const wrongSlotBundle = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs.supplements = [recordRef(wrongSlotSupplement)];
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(value.payload.componentRefs), "utf8")
      .digest("hex");
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(wrongSlotBundle, {
      ...fixture.componentRecords,
      supplements: [wrongSlotSupplement]
    }),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );

  const wrongIndependenceTimeSupplement = resignedIntakeRecord(parentIdAliasSupplement, (value) => {
    value.recordId = "test-only.wrong-independence-time-supplement";
    value.payload.independenceCompletedAt = "2026-08-29T01:00:00.000Z";
  });
  const wrongIndependenceTimeBundle = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs.supplements = [recordRef(wrongIndependenceTimeSupplement)];
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(value.payload.componentRefs), "utf8")
      .digest("hex");
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(wrongIndependenceTimeBundle, {
      ...fixture.componentRecords,
      supplements: [wrongIndependenceTimeSupplement]
    }),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
});

test("dedicated bundle rejects late identity verification after a complete graph re-sign", () => {
  const fixture = buildSyntheticIntakeFixture();
  const lateIdentityA = resignedIntakeRecord(fixture.identityA, (value) => {
    value.payload.verificationDate = "2026-08-29T02:30:00.000Z";
    value.createdAt = "2026-08-29T02:40:00.000Z";
  });
  const lateIdentityBindings = stableRecordOrder([lateIdentityA, fixture.identityB]);
  const lateIndependence = resignedIntakeRecord(fixture.independenceAssessment, (value) => {
    value.payload.reviewerPair = lateIdentityBindings.map((identity) => ({
      reviewerId: identity.payload.reviewerId,
      bindingRef: recordRef(identity)
    }));
  });
  const lateOpinionA = resignedIntakeRecord(fixture.opinionA, (value) => {
    value.payload.reviewerBindingRef = recordRef(lateIdentityA);
    value.payload.independenceAssessmentRef = recordRef(lateIndependence);
  });
  const lateOpinionB = resignedIntakeRecord(fixture.opinionB, (value) => {
    value.payload.independenceAssessmentRef = recordRef(lateIndependence);
  });
  const lateOpinions = stableRecordOrder([lateOpinionA, lateOpinionB]);
  const lateSealA = resignedIntakeRecord(fixture.sealA, (value) => {
    value.payload.opinionRef = recordRef(lateOpinionA);
    value.payload.reviewerBindingRef = recordRef(lateIdentityA);
  });
  const lateSealB = resignedIntakeRecord(fixture.sealB, (value) => {
    value.payload.opinionRef = recordRef(lateOpinionB);
  });
  const lateSeals = stableRecordOrder([lateSealA, lateSealB]);
  const lateInventory = resignedIntakeRecord(fixture.disagreementInventory, (value) => {
    value.payload.opinionRefs = lateOpinions.map(recordRef);
    value.payload.sealReceiptRefs = lateSeals.map(recordRef);
    value.payload.questionComparisons = BAZI_EXPERT_REVIEW_QUESTION_IDS.map((questionId, index) => ({
      questionId,
      comparisonState: "different_declared_position",
      expertAResponseRef: responseRef(lateOpinionA, lateOpinionA.payload.responses[index].responseId),
      expertBResponseRef: responseRef(lateOpinionB, lateOpinionB.payload.responses[index].responseId)
    }));
    value.payload.disagreements = value.payload.disagreements.map((disagreement, index) => ({
      ...disagreement,
      opinionEvidenceRefs: [
        value.payload.questionComparisons[index].expertAResponseRef,
        value.payload.questionComparisons[index].expertBResponseRef
      ]
    }));
  });
  const lateReconciliation = resignedIntakeRecord(fixture.reconciliationNote, (value) => {
    value.payload.inventoryRef = recordRef(lateInventory);
    value.payload.opinionRefs = lateOpinions.map(recordRef);
    value.payload.sealReceiptRefs = lateSeals.map(recordRef);
  });
  const lateComponentRefs = {
    identityBindings: lateIdentityBindings.map(recordRef),
    independenceAssessment: recordRef(lateIndependence),
    opinions: lateOpinions.map(recordRef),
    sealReceipts: lateSeals.map(recordRef),
    disagreementInventory: recordRef(lateInventory),
    reconciliationNote: recordRef(lateReconciliation),
    supplements: []
  };
  const lateBundle = resignedIntakeRecord(fixture.bundle, (value) => {
    value.payload.componentRefs = lateComponentRefs;
    value.payload.componentSetDigest = createHash("sha256")
      .update(canonicalStringifyExpertReviewPacket(lateComponentRefs), "utf8")
      .digest("hex");
  });
  assert.throws(
    () => preflightBaziExpertReviewBundle(lateBundle, {
      identityBindings: lateIdentityBindings,
      independenceAssessment: lateIndependence,
      originalOpinions: lateOpinions,
      sealReceipts: lateSeals,
      disagreementInventory: lateInventory,
      reconciliationNote: lateReconciliation,
      supplements: []
    }),
    (error) => error?.code === "INTAKE_RECORD_INVALID"
  );
});

test("complete re-signed bundle DAG rejects records materialized after downstream consumption", () => {
  const fixture = buildSyntheticIntakeFixture();
  const assertGraphRejects = (mutators) => {
    const candidate = resignSyntheticIntakeGraph(fixture, mutators);
    assert.throws(
      () => preflightBaziExpertReviewBundle(candidate.bundle, candidate.componentRecords),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  };

  assertGraphRejects({
    identityA(value) {
      value.payload.verificationDate = "2026-08-29T01:05:00.000Z";
      value.createdAt = "2026-08-29T01:06:00.000Z";
    }
  });
  assertGraphRejects({
    independenceAssessment(value) {
      value.createdAt = "2026-08-29T02:30:00.000Z";
    }
  });
  assertGraphRejects({
    opinionA(value) {
      value.createdAt = "2026-08-29T04:05:00.000Z";
    }
  });
  assertGraphRejects({
    sealA(value) {
      value.createdAt = "2026-08-29T05:05:00.000Z";
    }
  });
  assertGraphRejects({
    reconciliationNote(value) {
      value.createdAt = "2026-08-29T06:05:00.000Z";
    }
  });

  const makeSupplement = (recordId, createdAt) => signedIntakeRecord({
    recordType: "bazi_expert_original_opinion_v1",
    recordId,
    createdAt,
    payload: {
      ...structuredClone(fixture.opinionA.payload),
      opinionKind: "supplement",
      reviewStartedAt: "2026-08-29T05:11:00.000Z",
      submittedAt: "2026-08-29T05:20:00.000Z",
      priorExposureState: "exposure_disclosed",
      parentOriginalOpinionRef: recordRef(fixture.opinionA),
      responses: fixture.opinionA.payload.responses.map((response, index) => ({
        ...structuredClone(response),
        responseId: `${recordId}-response-${index + 1}`
      }))
    }
  });
  const assertSupplementBundleRejects = (supplement, reconciliationNote) => {
    const componentRefs = {
      ...structuredClone(fixture.bundle.payload.componentRefs),
      reconciliationNote: recordRef(reconciliationNote),
      supplements: [recordRef(supplement)]
    };
    const bundle = resignedIntakeRecord(fixture.bundle, (value) => {
      value.payload.componentRefs = componentRefs;
      value.payload.componentChronology.reconciliationCreatedAt = reconciliationNote.createdAt;
      value.payload.componentSetDigest = createHash("sha256")
        .update(canonicalStringifyExpertReviewPacket(componentRefs), "utf8")
        .digest("hex");
    });
    assert.throws(
      () => preflightBaziExpertReviewBundle(bundle, {
        ...fixture.componentRecords,
        reconciliationNote,
        supplements: [supplement]
      }),
      (error) => error?.code === "INTAKE_RECORD_INVALID"
    );
  };

  const lateSupplement = makeSupplement(
    "test-only.late-materialized-supplement",
    "2026-08-29T05:35:00.000Z"
  );
  const supplementResolvingReconciliation = resignedIntakeRecord(fixture.reconciliationNote, (value) => {
    value.payload.dispositions[0].proposalRef = recordRef(lateSupplement);
  });
  assertSupplementBundleRejects(lateSupplement, supplementResolvingReconciliation);

  const orphanSupplement = makeSupplement(
    "test-only.orphan-supplement",
    "2026-08-29T05:21:00.000Z"
  );
  assertSupplementBundleRejects(orphanSupplement, fixture.reconciliationNote);
});
