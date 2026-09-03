import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
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
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH,
  BAZI_EXPERT_AUTHORITY_PRECHECK_INDEPENDENCE_FACTOR_IDS,
  BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS,
  baziExpertAuthorityMaterialPrecheckTestOnly,
  buildCurrentBaziExpertAuthorityMaterialPrecheck,
  canonicalPrettyStringifyBaziExpertAuthorityMaterialPrecheck,
  computeBaziExpertAuthorityMaterialCandidateDigest,
  computeBaziExpertAuthorityMaterialPrecheckDigest,
  isTrustedBaziExpertAuthorityMaterialPrecheckResult,
  isVerifiedBaziExpertAuthorityMaterialPrecheck,
  loadBaziExpertAuthorityMaterialPrecheck,
  parseBaziExpertAuthorityMaterialPrecheckJsonBytes,
  preflightBaziExpertAuthorityMaterialCandidate,
  preflightBaziExpertAuthorityMaterialCandidateJsonBytes,
  readBaziExpertAuthorityMaterialPrecheck,
  verifyBaziExpertAuthorityMaterialPrecheck
} from "./bazi-expert-authority-material-precheck-lib.mjs";

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_PATH = path.join(WORKSPACE_ROOT, "scripts", "verify-bazi-expert-authority-material-precheck.mjs");
const CANDIDATE_DIGEST_DOMAIN = baziExpertAuthorityMaterialPrecheckTestOnly.candidateDigestDomain;
const CATEGORIES = baziExpertAuthorityMaterialPrecheckTestOnly.evidenceCategories;

function hash(label) {
  return createHash("sha256").update(`test-only:${label}`, "utf8").digest("hex");
}

function safeSlug(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function evidence(category, label, visibility = "private_opaque") {
  const slug = safeSlug(label);
  return {
    evidenceCategory: category,
    evidenceRefId: `evidence-${slug}`,
    privateOpaqueContextRef: visibility === "private_opaque" ? `private-${slug}` : null,
    provenance: {
      contentLineageGroupId: `lineage-${slug}`,
      controlGroupId: `control-${slug}`,
      derivationGroupId: `derivation-${slug}`
    },
    publicObservationRef: visibility === "public_link_only" ? `observation-${slug}` : null,
    rawSha256: hash(`evidence:${slug}`),
    visibility
  };
}

function evidencePair(categories, label) {
  return {
    corroboratingEvidence: evidence(categories[1], `${label}-corroborating`, "public_link_only"),
    primaryEvidence: evidence(categories[0], `${label}-primary`)
  };
}

function authorityMaterial(label, verifierBindingId, surface) {
  return {
    authenticityEstablished: false,
    authorityScope: {
      reviewPurpose: "expert_identity_credential_scope_and_independence_material_precheck",
      reviewQuestionIds: [...BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS],
      reviewerSeatIds: ["domain-expert-a", "domain-expert-b"],
      surface,
      systemId: "bazi-strength-v1.7"
    },
    ...evidencePair(CATEGORIES.verifierAuthority, `authority-${label}`),
    custodyEstablished: false,
    digestIsDigitalSignature: false,
    firstSeenEstablished: false,
    grantIssuerBindingId: `issuer-${label}`,
    issuerIdentityEstablished: false,
    materialId: `authority-material-${label}`,
    observedEffectiveFrom: "2026-01-01T00:00:00.000Z",
    observedExpiresAt: "2027-01-01T00:00:00.000Z",
    observedGrantStatus: "candidate_unverified",
    observedRevocationCheckedAt: "2026-08-29T00:00:00.000Z",
    verifierAuthorityEstablished: false,
    verifierBindingId,
    verifierIdentityEstablished: false
  };
}

function reviewerMaterial(suffix, index) {
  const reviewerBindingId = `synthetic-reviewer-${suffix}`;
  const seatId = `domain-expert-${suffix}`;
  return {
    credentialMaterial: {
      authenticityEstablished: false,
      ...evidencePair(CATEGORIES.reviewerCredential, `credential-${suffix}`),
      credentialState: "candidate_unverified",
      credentialVerified: false,
      issuerBindingId: `credential-issuer-${suffix}`,
      issuerIdentityEstablished: false,
      materialId: `credential-material-${suffix}`,
      observedEffectiveFrom: "2026-01-01T00:00:00.000Z",
      observedExpiresAt: "2027-01-01T00:00:00.000Z",
      observedRevocationCheckedAt: "2026-08-29T00:00:00.000Z",
      reviewerBindingId
    },
    identityMaterial: {
      authenticityEstablished: false,
      ...evidencePair(CATEGORIES.reviewerIdentity, `identity-${suffix}`),
      custodyEstablished: false,
      firstSeenEstablished: false,
      identityEstablished: false,
      identityState: "candidate_unverified",
      materialId: `identity-material-${suffix}`,
      privateDossierOpaqueContextRef: {
        byteLength: 1024 + index,
        contextId: `dossier-context-${suffix}`,
        contextRuntimeVerified: false,
        custodianRef: `custodian-${suffix}`,
        firstSeenRef: `first-seen-${suffix}`,
        redactedPublicBindingRef: `redacted-binding-${suffix}`,
        retrievalRef: `retrieval-${suffix}`,
        sha256: hash(`dossier-${suffix}`)
      },
      reviewerBindingId
    },
    questionScopeMaterial: {
      coverage: BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS.map((questionId, questionIndex) => ({
        ...evidencePair(CATEGORIES.reviewerQuestionScope, `scope-${suffix}-${questionIndex + 1}`),
        coverageState: "candidate_unverified",
        questionId
      })),
      generalTopicMaySubstitute: false,
      materialId: `scope-material-${suffix}`,
      reviewerBindingId,
      scopeVerified: false,
      unrelatedSystemExpertiseMaySubstitute: false
    },
    reviewerBindingId,
    seatId,
    verifierAuthorityMaterialRef: `authority-material-verifier-${suffix}`,
    verifierBindingId: `synthetic-verifier-${suffix}`
  };
}

function unsignedCandidate() {
  const reviewers = [reviewerMaterial("a", 0), reviewerMaterial("b", 1)];
  return {
    createdAt: "2026-08-30T00:00:00.000Z",
    decision: {
      authenticityEstablished: false,
      contentTruthEstablished: false,
      countsTowardExpertGate: false,
      credentialVerified: false,
      expertGateEligible: false,
      expertStatusVerified: false,
      expertTruthEstablished: false,
      identityVerified: false,
      pairwiseIndependenceEstablished: false,
      publicDeploymentAuthorized: false,
      reasonCodes: [...baziExpertAuthorityMaterialPrecheckTestOnly.fixedDecisionReasonCodes],
      releaseReady: false,
      requestedDisposition: "structural_precheck_only",
      rightsLegalConclusionEstablished: false,
      scopeVerified: false,
      verifierAuthorityEstablished: false
    },
    integrity: {
      authenticityEstablished: false,
      digestDomain: CANDIDATE_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      hashAlgorithm: "sha256",
      recordDigest: "0".repeat(64)
    },
    pairwiseIndependenceMaterial: {
      assessedBy: {
        assessorAuthorityMaterialRef: "authority-material-assessor",
        assessorBindingId: "synthetic-assessor"
      },
      countsTowardExpertGate: false,
      factors: BAZI_EXPERT_AUTHORITY_PRECHECK_INDEPENDENCE_FACTOR_IDS.map((factorId, index) => ({
        assessorDisposition: "not_established",
        ...evidencePair(CATEGORIES.pairwiseFactor, `pairwise-${index + 1}`),
        factorId,
        reviewerADeclaration: "not_established",
        reviewerBDeclaration: "not_established"
      })),
      materialId: "pairwise-material-a-b",
      overallDisposition: "not_established",
      pairwiseIndependenceEstablished: false,
      reviewerPair: reviewers.map((reviewer) => ({
        credentialMaterialRef: reviewer.credentialMaterial.materialId,
        identityMaterialRef: reviewer.identityMaterial.materialId,
        questionScopeMaterialRef: reviewer.questionScopeMaterial.materialId,
        reviewerBindingId: reviewer.reviewerBindingId,
        seatId: reviewer.seatId
      })),
      sameUpstreamAgreementClassification: "agree_same_upstream_not_independent_corroboration",
      sharedDependencyDisclosures: []
    },
    recordId: "synthetic-authority-material-bundle",
    recordType: "bazi_expert_authority_material_bundle_v1",
    recordVersion: "1.0.0",
    reviewerMaterials: reviewers,
    schemaVersion: "1.0.0",
    systemBinding: {
      currentReadinessLedgerDigest:
        baziExpertAuthorityMaterialPrecheckTestOnly.parentIdentities.currentBindingReadiness.digest,
      currentReadinessLedgerId:
        baziExpertAuthorityMaterialPrecheckTestOnly.parentIdentities.currentBindingReadiness.id,
      expertPacketDigest:
        baziExpertAuthorityMaterialPrecheckTestOnly.parentIdentities.expertReviewPacket.digest,
      expertPacketId:
        baziExpertAuthorityMaterialPrecheckTestOnly.parentIdentities.expertReviewPacket.id,
      reviewPurpose: "expert_identity_credential_scope_and_independence_material_precheck",
      reviewQuestionIds: [...BAZI_EXPERT_AUTHORITY_PRECHECK_REVIEW_QUESTION_IDS],
      systemId: "bazi-strength-v1.7"
    },
    verifierAuthorityMaterials: [
      authorityMaterial("verifier-a", "synthetic-verifier-a", "reviewer_identity_credential_scope_verification"),
      authorityMaterial("verifier-b", "synthetic-verifier-b", "reviewer_identity_credential_scope_verification"),
      authorityMaterial("assessor", "synthetic-assessor", "pairwise_independence_assessment")
    ]
  };
}

function signedCandidate() {
  const candidate = unsignedCandidate();
  candidate.integrity.recordDigest = computeBaziExpertAuthorityMaterialCandidateDigest(candidate);
  return candidate;
}

function reseal(candidate, mutator) {
  const value = structuredClone(candidate);
  mutator(value);
  value.integrity.recordDigest = computeBaziExpertAuthorityMaterialCandidateDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code);
}

async function expectCodeAsync(fn, code) {
  await assert.rejects(fn, (error) => error?.code === code);
}

async function trustedLedger() {
  return loadBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT);
}

const COPIED_FILES = [
  BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH,
  ...Object.values(baziExpertAuthorityMaterialPrecheckTestOnly.parentIdentities).map((entry) => entry.path),
  baziExpertAuthorityMaterialPrecheckTestOnly.formalVerifierHelperIdentity.path
];

const LF_PINNED_FILES = [
  "scripts/bazi-expert-authority-material-precheck-lib.mjs",
  "scripts/verify-bazi-expert-authority-material-precheck.mjs",
  "scripts/verify-bazi-expert-authority-material-precheck.test.mjs",
  BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH,
  "docs/阶段D八字现实专家资格与核验Authority零实例预检-v1-2026-08-30.md",
  ...Object.values(baziExpertAuthorityMaterialPrecheckTestOnly.parentIdentities).map((entry) => entry.path),
  baziExpertAuthorityMaterialPrecheckTestOnly.formalVerifierHelperIdentity.path
];

async function makeWorkspaceFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "bazi-authority-precheck-"));
  t.after(async () => rm(root, { force: true, recursive: true }));
  for (const relativePath of COPIED_FILES) {
    const destination = path.join(root, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(WORKSPACE_ROOT, ...relativePath.split("/")), destination);
  }
  return root;
}

test("persisted zero-instance child has exact raw and semantic identity", async () => {
  const bytes = await readFile(path.join(WORKSPACE_ROOT, ...BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH.split("/")));
  const expected = baziExpertAuthorityMaterialPrecheckTestOnly.expectedLedgerRawIdentity;
  assert.equal(bytes.byteLength, expected.rawBytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.rawSha256);
  const ledger = parseBaziExpertAuthorityMaterialPrecheckJsonBytes(bytes);
  assert.equal(ledger.ledgerDigest, computeBaziExpertAuthorityMaterialPrecheckDigest(ledger));
  assert.equal(bytes.toString("utf8"), canonicalPrettyStringifyBaziExpertAuthorityMaterialPrecheck(ledger));
});

test("LF checkout semantics are pinned for the child and every raw-bound parent", async () => {
  const attributes = await readFile(path.join(WORKSPACE_ROOT, ".gitattributes"), "utf8");
  for (const relativePath of LF_PINNED_FILES) {
    assert.equal(
      attributes.split(/\r?\n/u).includes(`/${relativePath} text eol=lf`),
      true,
      relativePath
    );
  }
});

test("build, read, verify and load agree on the current one-way child", async () => {
  const [built, read] = await Promise.all([
    buildCurrentBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT),
    readBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT)
  ]);
  assert.deepEqual(read, built);
  const verified = await verifyBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT, read);
  const loaded = await loadBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT);
  assert.equal(isVerifiedBaziExpertAuthorityMaterialPrecheck(verified), true);
  assert.equal(isVerifiedBaziExpertAuthorityMaterialPrecheck(loaded), true);
  assert.equal(loaded.firstFormalParentFailureCode, "INTAKE_GAP_BINDING_DRIFT");
  assert.equal(loaded.realReviewerInstances, 0);
  assert.equal(loaded.verifierAuthorityGrantInstances, 0);
});

test("formal parent drift is preserved exactly and cannot become a success claim", async () => {
  const ledger = await readBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT);
  assert.equal(ledger.formalParentDrift.intakeGapMatchesCurrentReadiness, false);
  assert.equal(ledger.formalParentDrift.formalPacketVerifierPasses, false);
  assert.equal(ledger.formalParentDrift.firstFailureCode, "INTAKE_GAP_BINDING_DRIFT");
  assert.equal(ledger.formalParentDrift.intakeGapLockedReadinessIdentity.ledgerId.endsWith("/1.5.0"), true);
  assert.equal(ledger.formalParentDrift.currentReadinessIdentity.ledgerId.endsWith("/1.6.0"), true);
  assert.equal(ledger.formalParentDrift.parentMutated, false);
  assert.equal(ledger.formalParentDrift.parentBacklinkAdded, false);
});

test("all persisted expert, truth, rights and release ledgers remain zero or false", async () => {
  const ledger = await readBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT);
  assert.deepEqual(Object.values(ledger.persistedInstances), Object.values(ledger.persistedInstances).map(() => []));
  for (const [key, value] of Object.entries(ledger.authorityBoundary)) {
    assert.equal(value, false, key);
  }
  assert.equal(ledger.zeroInstanceReceipt.reviewerSlotsOccupied, 0);
  assert.equal(ledger.zeroInstanceReceipt.realReviewerInstances, 0);
  assert.equal(ledger.gateBoundary.bindingFrozenVerified, 0);
  assert.equal(ledger.gateBoundary.bindingFrozenRequired, 12);
  assert.equal(ledger.releaseGovernance.activeLine, "legacy-v13");
  assert.equal(ledger.releaseGovernance.targetSchema, 13);
  assert.equal(ledger.releaseGovernance.migrationId, null);
});

test("strict parser rejects duplicate keys, BOM, invalid UTF-8, non-object roots and oversize", () => {
  expectCode(() => parseBaziExpertAuthorityMaterialPrecheckJsonBytes(Buffer.from('{"a":1,"a":2}')), "JSON_DUPLICATE_KEY");
  expectCode(() => parseBaziExpertAuthorityMaterialPrecheckJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])), "JSON_BOM_FORBIDDEN");
  expectCode(() => parseBaziExpertAuthorityMaterialPrecheckJsonBytes(Buffer.from([0xc3, 0x28])), "JSON_UTF8_INVALID");
  expectCode(() => parseBaziExpertAuthorityMaterialPrecheckJsonBytes(Buffer.from("[]")), "JSON_INVALID");
  expectCode(() => parseBaziExpertAuthorityMaterialPrecheckJsonBytes(Buffer.alloc(1_000_001)), "JSON_TOO_LARGE");
});

test("strict parser rejects Proxy and SharedArrayBuffer byte views", () => {
  expectCode(() => parseBaziExpertAuthorityMaterialPrecheckJsonBytes(new Proxy(Buffer.from("{}"), {})), "JSON_PROXY_FORBIDDEN");
  if (typeof SharedArrayBuffer === "function") {
    const shared = new Uint8Array(new SharedArrayBuffer(2));
    shared.set([0x7b, 0x7d]);
    expectCode(() => parseBaziExpertAuthorityMaterialPrecheckJsonBytes(shared), "JSON_SHARED_BUFFER_FORBIDDEN");
  }
});

test("candidate object capture rejects Proxy, accessors, symbols, cycles and negative zero", async () => {
  const verified = await trustedLedger();
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, new Proxy(signedCandidate(), {})), "INPUT_PROXY_FORBIDDEN");

  let getterInvoked = false;
  const accessor = signedCandidate();
  Object.defineProperty(accessor, "createdAt", {
    enumerable: true,
    get() {
      getterInvoked = true;
      return "2026-08-30T00:00:00.000Z";
    }
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, accessor), "INPUT_ACCESSOR_FORBIDDEN");
  assert.equal(getterInvoked, false);

  const symbol = signedCandidate();
  symbol[Symbol("hidden")] = true;
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, symbol), "INPUT_SYMBOL_FORBIDDEN");

  const cycle = signedCandidate();
  cycle.loop = cycle;
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, cycle), "INPUT_CYCLE_FORBIDDEN");

  const negativeZero = signedCandidate();
  negativeZero.reviewerMaterials[0].identityMaterial.privateDossierOpaqueContextRef.byteLength = -0;
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, negativeZero), "INPUT_VALUE_INVALID");
});

test("complete synthetic no-person material shape yields only a frozen non-authoritative result", async () => {
  const verified = await trustedLedger();
  const result = preflightBaziExpertAuthorityMaterialCandidate(verified, signedCandidate());
  assert.equal(result.materialStructurePreflighted, true);
  assert.equal(result.status, "zero_instance_authority_precheck_structure_only");
  for (const [key, value] of Object.entries(result)) {
    if (key === "candidateDigest" || key === "materialStructurePreflighted" || key === "status") continue;
    assert.equal(value, false, key);
  }
  assert.equal(isTrustedBaziExpertAuthorityMaterialPrecheckResult(result), true);
  assert.equal(isTrustedBaziExpertAuthorityMaterialPrecheckResult({ ...result }), false);
  assert.equal(Object.isFrozen(result), true);
});

test("candidate JSON byte API uses the same strict structure and digest gate", async () => {
  const verified = await trustedLedger();
  const candidate = signedCandidate();
  const bytes = Buffer.from(canonicalPrettyStringifyBaziExpertAuthorityMaterialPrecheck(candidate));
  const result = preflightBaziExpertAuthorityMaterialCandidateJsonBytes(verified, bytes);
  assert.equal(result.materialStructurePreflighted, true);
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidateJsonBytes(
    verified,
    Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"2.0.0"}')
  ), "JSON_DUPLICATE_KEY");
});

test("an arbitrary or cloned ledger result cannot authorize candidate preflight", async () => {
  const verified = await trustedLedger();
  const candidate = signedCandidate();
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate({}, candidate), "VERIFIED_LEDGER_AUTHORITY_REQUIRED");
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(structuredClone(verified), candidate), "VERIFIED_LEDGER_AUTHORITY_REQUIRED");
});

test("reviewer self-verification is rejected after attacker reseals", async () => {
  const verified = await trustedLedger();
  const candidate = reseal(signedCandidate(), (value) => {
    value.verifierAuthorityMaterials[0].verifierBindingId = value.reviewerMaterials[0].reviewerBindingId;
    value.reviewerMaterials[0].verifierBindingId = value.reviewerMaterials[0].reviewerBindingId;
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate), "REVIEWER_VERIFIER_SEPARATION_REQUIRED");
});

test("the two reviewer seats may not verify each other", async () => {
  const verified = await trustedLedger();
  const candidate = reseal(signedCandidate(), (value) => {
    value.verifierAuthorityMaterials[0].verifierBindingId = value.reviewerMaterials[1].reviewerBindingId;
    value.reviewerMaterials[0].verifierBindingId = value.reviewerMaterials[1].reviewerBindingId;
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate), "REVIEWER_VERIFIER_SEPARATION_REQUIRED");
});

test("nullable, unresolved and surface-mismatched verifier authority bindings are rejected", async () => {
  const verified = await trustedLedger();
  for (const [mutator, code] of [
    [(value) => { value.reviewerMaterials[0].verifierAuthorityMaterialRef = null; }, "OPAQUE_ID_INVALID"],
    [(value) => { value.reviewerMaterials[0].verifierAuthorityMaterialRef = "authority-material-missing"; }, "VERIFIER_AUTHORITY_BINDING_REQUIRED"],
    [(value) => { value.verifierAuthorityMaterials[0].authorityScope.surface = "pairwise_independence_assessment"; }, "AUTHORITY_MATERIAL_GRAPH_INVALID"]
  ]) {
    const candidate = reseal(signedCandidate(), mutator);
    expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate), code);
  }
});

test("inactive public or private evidence refs must be exactly null and cannot smuggle material", async () => {
  const verified = await trustedLedger();
  const privateSmuggle = reseal(signedCandidate(), (value) => {
    value.reviewerMaterials[0].identityMaterial.primaryEvidence.publicObservationRef = {
      email: "secret@example.invalid",
      exactQuote: "not allowed"
    };
  });
  expectCode(
    () => preflightBaziExpertAuthorityMaterialCandidate(verified, privateSmuggle),
    "EVIDENCE_VISIBILITY_INVALID"
  );
  const publicSmuggle = reseal(signedCandidate(), (value) => {
    value.reviewerMaterials[0].identityMaterial.corroboratingEvidence.privateOpaqueContextRef = {
      loginUrl: "https://example.invalid/login?token=secret"
    };
  });
  expectCode(
    () => preflightBaziExpertAuthorityMaterialCandidate(verified, publicSmuggle),
    "EVIDENCE_VISIBILITY_INVALID"
  );
});

test("three authority materials must be consumed once by two reviewers and one assessor", async () => {
  const verified = await trustedLedger();
  const crossWired = reseal(signedCandidate(), (value) => {
    value.reviewerMaterials[1].verifierAuthorityMaterialRef =
      value.reviewerMaterials[0].verifierAuthorityMaterialRef;
    value.reviewerMaterials[1].verifierBindingId = value.reviewerMaterials[0].verifierBindingId;
  });
  expectCode(
    () => preflightBaziExpertAuthorityMaterialCandidate(verified, crossWired),
    "AUTHORITY_MATERIAL_GRAPH_INVALID"
  );
  const wrongSurfaceCardinality = reseal(signedCandidate(), (value) => {
    value.verifierAuthorityMaterials[1].authorityScope.surface = "pairwise_independence_assessment";
  });
  expectCode(
    () => preflightBaziExpertAuthorityMaterialCandidate(verified, wrongSurfaceCardinality),
    "AUTHORITY_MATERIAL_GRAPH_INVALID"
  );
});

test("authority grant issuer separation, scope and temporal validity fail closed", async () => {
  const verified = await trustedLedger();
  for (const [mutator, code] of [
    [(value) => { value.verifierAuthorityMaterials[0].grantIssuerBindingId = value.verifierAuthorityMaterials[0].verifierBindingId; }, "AUTHORITY_GRANT_ISSUER_INVALID"],
    [(value) => { value.verifierAuthorityMaterials[0].grantIssuerBindingId = "project-owner"; }, "AUTHORITY_GRANT_ISSUER_INVALID"],
    [(value) => { value.verifierAuthorityMaterials[0].authorityScope.systemId = "vedic"; }, "AUTHORITY_SCOPE_INVALID"],
    [(value) => { value.verifierAuthorityMaterials[0].observedExpiresAt = "2026-08-29T00:00:00.000Z"; }, "AUTHORITY_GRANT_TEMPORAL_INVALID"]
  ]) {
    expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, reseal(signedCandidate(), mutator)), code);
  }
});

test("self-digest cannot promote verifier identity, authority, authenticity or signature", async () => {
  const verified = await trustedLedger();
  for (const key of [
    "verifierIdentityEstablished", "verifierAuthorityEstablished", "authenticityEstablished", "digestIsDigitalSignature"
  ]) {
    const candidate = reseal(signedCandidate(), (value) => { value.verifierAuthorityMaterials[0][key] = true; });
    expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate), "AUTHORITY_ESCALATION_FORBIDDEN");
  }
});

test("public candidate leads cannot directly become reviewer identities", async () => {
  const verified = await trustedLedger();
  const candidate = reseal(signedCandidate(), (value) => {
    const oldId = value.reviewerMaterials[0].reviewerBindingId;
    const newId = "bazi-public-lead-002";
    value.reviewerMaterials[0].reviewerBindingId = newId;
    value.reviewerMaterials[0].identityMaterial.reviewerBindingId = newId;
    value.reviewerMaterials[0].credentialMaterial.reviewerBindingId = newId;
    value.reviewerMaterials[0].questionScopeMaterial.reviewerBindingId = newId;
    value.pairwiseIndependenceMaterial.reviewerPair[0].reviewerBindingId = newId;
    assert.notEqual(oldId, newId);
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate), "PUBLIC_LEAD_PROMOTION_FORBIDDEN");
});

test("one evidence record or digest cannot be double-counted across material layers", async () => {
  const verified = await trustedLedger();
  const reusedRecord = reseal(signedCandidate(), (value) => {
    value.reviewerMaterials[0].credentialMaterial.primaryEvidence.evidenceRefId =
      value.reviewerMaterials[0].identityMaterial.primaryEvidence.evidenceRefId;
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, reusedRecord), "EVIDENCE_RECORD_REUSED");

  const reusedDigest = reseal(signedCandidate(), (value) => {
    value.reviewerMaterials[0].credentialMaterial.primaryEvidence.rawSha256 =
      value.reviewerMaterials[0].identityMaterial.primaryEvidence.rawSha256;
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, reusedDigest), "EVIDENCE_DIGEST_REUSED");
});

test("same-upstream provenance aliases cannot be counted as independent corroboration", async () => {
  const verified = await trustedLedger();
  const candidate = reseal(signedCandidate(), (value) => {
    value.reviewerMaterials[0].identityMaterial.corroboratingEvidence.provenance.controlGroupId =
      value.reviewerMaterials[0].identityMaterial.primaryEvidence.provenance.controlGroupId;
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate), "EVIDENCE_PROVENANCE_REUSED");
});

test("a dossier context or digest cannot be reused by two reviewers", async () => {
  const verified = await trustedLedger();
  const candidate = reseal(signedCandidate(), (value) => {
    value.reviewerMaterials[1].identityMaterial.privateDossierOpaqueContextRef.contextId =
      value.reviewerMaterials[0].identityMaterial.privateDossierOpaqueContextRef.contextId;
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate), "PRIVATE_CONTEXT_REUSED");
});

test("all four fixed Bazi question scope mappings are mandatory", async () => {
  const verified = await trustedLedger();
  const missing = reseal(signedCandidate(), (value) => { value.reviewerMaterials[0].questionScopeMaterial.coverage.pop(); });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, missing), "QUESTION_SCOPE_COVERAGE_INCOMPLETE");
  const substitute = reseal(signedCandidate(), (value) => { value.reviewerMaterials[0].questionScopeMaterial.generalTopicMaySubstitute = true; });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, substitute), "AUTHORITY_ESCALATION_FORBIDDEN");
});

test("credential status, issuer and freshness cannot be self-promoted", async () => {
  const verified = await trustedLedger();
  for (const [mutator, code] of [
    [(value) => { value.reviewerMaterials[0].credentialMaterial.credentialVerified = true; }, "AUTHORITY_ESCALATION_FORBIDDEN"],
    [(value) => { value.reviewerMaterials[0].credentialMaterial.issuerBindingId = value.reviewerMaterials[0].reviewerBindingId; }, "CREDENTIAL_MATERIAL_BINDING_INVALID"],
    [(value) => { value.reviewerMaterials[0].credentialMaterial.observedExpiresAt = "2026-08-29T00:00:00.000Z"; }, "CREDENTIAL_TEMPORAL_INVALID"]
  ]) {
    expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, reseal(signedCandidate(), mutator)), code);
  }
});

test("all ten independence factors and an outside assessor authority ref are mandatory", async () => {
  const verified = await trustedLedger();
  const missing = reseal(signedCandidate(), (value) => { value.pairwiseIndependenceMaterial.factors.pop(); });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, missing), "INDEPENDENCE_FACTOR_COVERAGE_INCOMPLETE");
  const reviewerAssessor = reseal(signedCandidate(), (value) => {
    value.verifierAuthorityMaterials[2].verifierBindingId = value.reviewerMaterials[0].reviewerBindingId;
    value.pairwiseIndependenceMaterial.assessedBy.assessorBindingId = value.reviewerMaterials[0].reviewerBindingId;
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, reviewerAssessor), "REVIEWER_VERIFIER_SEPARATION_REQUIRED");
});

test("same-upstream agreement and pairwise disposition cannot be promoted to independent", async () => {
  const verified = await trustedLedger();
  const promoted = reseal(signedCandidate(), (value) => {
    value.pairwiseIndependenceMaterial.overallDisposition = "independent";
    value.pairwiseIndependenceMaterial.pairwiseIndependenceEstablished = true;
  });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, promoted), "PAIRWISE_INDEPENDENCE_ESCALATION_FORBIDDEN");
});

test("candidate decision cannot self-promote any expert, truth, rights or release flag", async () => {
  const verified = await trustedLedger();
  for (const key of [
    "identityVerified", "credentialVerified", "scopeVerified", "verifierAuthorityEstablished",
    "pairwiseIndependenceEstablished", "expertStatusVerified", "expertTruthEstablished",
    "contentTruthEstablished", "rightsLegalConclusionEstablished", "countsTowardExpertGate",
    "expertGateEligible", "releaseReady", "publicDeploymentAuthorized", "authenticityEstablished"
  ]) {
    const candidate = reseal(signedCandidate(), (value) => { value.decision[key] = true; });
    expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate), "AUTHORITY_ESCALATION_FORBIDDEN");
  }
});

test("packet, readiness, system and review-purpose replay is rejected", async () => {
  const verified = await trustedLedger();
  for (const mutator of [
    (value) => { value.systemBinding.expertPacketId = "hakimi.bazi.strength.expert-review-packet/other"; },
    (value) => { value.systemBinding.currentReadinessLedgerDigest = hash("other-readiness"); },
    (value) => { value.systemBinding.systemId = "western"; },
    (value) => { value.systemBinding.reviewPurpose = "other-purpose"; }
  ]) {
    expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, reseal(signedCandidate(), mutator)), "CANDIDATE_SYSTEM_BINDING_INVALID");
  }
});

test("candidate digest is necessary but never a signature or authenticity proof", async () => {
  const verified = await trustedLedger();
  const stale = signedCandidate();
  stale.recordId = "synthetic-authority-material-bundle-changed";
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, stale), "CANDIDATE_DIGEST_MISMATCH");
  const signature = reseal(signedCandidate(), (value) => { value.integrity.digestIsDigitalSignature = true; });
  expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, signature), "AUTHORITY_ESCALATION_FORBIDDEN");
});

test("unknown PII, URL, quote or raw dossier fields fail exact schemas without value echo", async () => {
  const verified = await trustedLedger();
  for (const [target, key] of [
    [(value) => value, "email"],
    [(value) => value.reviewerMaterials[0].identityMaterial, "rawCredentialDocument"],
    [(value) => value.reviewerMaterials[0].questionScopeMaterial.coverage[0], "exactQuote"],
    [(value) => value.verifierAuthorityMaterials[0], "url"]
  ]) {
    const candidate = reseal(signedCandidate(), (value) => { target(value)[key] = "secret@example.invalid"; });
    expectCode(() => preflightBaziExpertAuthorityMaterialCandidate(verified, candidate),
      key === "email" ? "CANDIDATE_SHAPE_INVALID"
        : key === "rawCredentialDocument" ? "IDENTITY_MATERIAL_SHAPE_INVALID"
          : key === "exactQuote" ? "SCOPE_MATERIAL_SHAPE_INVALID"
            : "AUTHORITY_MATERIAL_SHAPE_INVALID");
  }
});

test("current parent raw drift fails closed without refreshing old formal pins", async (t) => {
  const root = await makeWorkspaceFixture(t);
  const readinessPath = path.join(root, ...baziExpertAuthorityMaterialPrecheckTestOnly.parentIdentities.currentBindingReadiness.path.split("/"));
  const bytes = await readFile(readinessPath);
  await writeFile(readinessPath, Buffer.concat([bytes, Buffer.from("\n")]));
  await expectCodeAsync(() => loadBaziExpertAuthorityMaterialPrecheck(root), "PARENT_IDENTITY_MISMATCH");
});

test("caller re-signing cannot bypass the persisted child identity", async () => {
  const ledger = await readBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT);
  const changed = structuredClone(ledger);
  changed.authorityBoundary.expertTruthEstablished = true;
  changed.ledgerDigest = computeBaziExpertAuthorityMaterialPrecheckDigest(changed);
  await expectCodeAsync(
    () => verifyBaziExpertAuthorityMaterialPrecheck(WORKSPACE_ROOT, changed),
    "CALLER_PERSISTED_LEDGER_MISMATCH"
  );
});

test("persisted child symlink and hardlink endpoints fail closed", async (t) => {
  const hardRoot = await makeWorkspaceFixture(t);
  const ledgerPath = path.join(hardRoot, ...BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH.split("/"));
  const backing = `${ledgerPath}.backing`;
  await rename(ledgerPath, backing);
  await link(backing, ledgerPath);
  await expectCodeAsync(() => loadBaziExpertAuthorityMaterialPrecheck(hardRoot), "LEDGER_ENDPOINT_INVALID");

  const symlinkRoot = await makeWorkspaceFixture(t);
  const symlinkLedger = path.join(symlinkRoot, ...BAZI_EXPERT_AUTHORITY_MATERIAL_PRECHECK_RELATIVE_PATH.split("/"));
  const symlinkBacking = `${symlinkLedger}.backing`;
  await rename(symlinkLedger, symlinkBacking);
  try {
    await symlink(path.basename(symlinkBacking), symlinkLedger, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.diagnostic("symlink capability unavailable; hardlink endpoint assertion still ran");
      return;
    }
    throw error;
  }
  await expectCodeAsync(() => loadBaziExpertAuthorityMaterialPrecheck(symlinkRoot), "LEDGER_ENDPOINT_INVALID");
});

test("CLI prints a calibrated zero-instance success and no generic approval", () => {
  const run = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const output = JSON.parse(run.stdout);
  assert.equal(output.authorityMaterialContractStructurallyPrechecked, true);
  assert.equal(output.firstFormalParentFailureCode, "INTAKE_GAP_BINDING_DRIFT");
  assert.equal(output.realReviewerInstances, 0);
  assert.equal(output.verifierAuthorityGrantInstances, 0);
  assert.equal(output.expertTruthEstablished, false);
  assert.equal(output.releaseReady, false);
  assert.equal("ok" in output, false);
  assert.equal(/approved|qualified|verifiedExpert/iu.test(run.stdout), false);
});

test("CLI rejects visible NODE_OPTIONS and keeps failure output path-free", async (t) => {
  const injected = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "--no-warnings" }
  });
  assert.equal(injected.status, 1);
  assert.equal(injected.stdout, "");
  assert.deepEqual(JSON.parse(injected.stderr), {
    code: "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN",
    status: "bazi_expert_authority_material_precheck_failed"
  });

  const emptyRoot = await mkdtemp(path.join(os.tmpdir(), "bazi-authority-cli-empty-"));
  t.after(async () => rm(emptyRoot, { force: true, recursive: true }));
  const missing = spawnSync(process.execPath, [CLI_PATH], {
    cwd: emptyRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, "");
  assert.deepEqual(JSON.parse(missing.stderr), {
    code: "LEDGER_ENDPOINT_INVALID",
    status: "bazi_expert_authority_material_precheck_failed"
  });
  assert.equal(missing.stderr.includes(emptyRoot), false);
});
