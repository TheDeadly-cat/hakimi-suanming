import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFile,
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  truncate,
  unlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test, { before } from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH,
  VedicInputAdmissionTransitionAndReceiptRequirementsError,
  canonicalPrettyStringifyVedicInputAdmissionTransitionAndReceiptRequirements,
  computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest,
  isVerifiedVedicInputAdmissionTransitionAndReceiptRequirements,
  loadVedicInputAdmissionTransitionAndReceiptRequirements,
  parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes,
  readCurrentVedicInputAdmissionTransitionAndReceiptRequirements,
  vedicInputAdmissionTransitionAndReceiptRequirementsTestOnly as testOnly,
  verifyVedicInputAdmissionTransitionAndReceiptRequirementsObject
} from "./vedic-input-admission-transition-and-receipt-requirements-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const contractAbsolutePath = path.resolve(
  workspaceRoot,
  ...VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH.split("/")
);
const cliAbsolutePath = path.join(
  scriptsDirectory,
  "verify-vedic-input-admission-transition-and-receipt-requirements.mjs"
);
const restrictedRelativePath = "apps/web/src/lib/local-user-data-cleanup.ts";
const expectedPersistedBytes = 57125;
const expectedPersistedSha256 =
  "e394f26f581b517666fec4b8361cba85c6c2761d0dfd06ba5cab23710bafde4d";
const expectedContractDigest =
  "548a0ab95dbe030dda2c158a7a4583c4591d98be75bc9f9a604ff98cff3d52ac";

const expectedRequirementIds = Object.freeze([
  "civil_calendar_and_date",
  "local_wall_time_and_precision",
  "birth_time_uncertainty_interval_or_candidates",
  "place_coordinates_and_precision",
  "iana_time_zone_and_tzdb_identity",
  "dst_gap_overlap_resolution",
  "utc_conversion_and_time_scale",
  "ephemeris_identity_version_and_coverage",
  "sidereal_zodiac_declaration",
  "ayanamsa_identity_and_version",
  "rahu_ketu_mode",
  "bhava_house_definition",
  "birth_time_perturbation_candidates_and_transition_points"
]);

const expectedInvariantIds = Object.freeze([
  "civil_date_validity",
  "calendar_identity_version",
  "canonical_wall_time",
  "precision_vocabulary",
  "uncertainty_representation",
  "interval_ordering",
  "candidate_semantics",
  "coordinate_reference_system",
  "coordinate_precision_semantics",
  "location_privacy_boundary",
  "iana_zone_identity",
  "tzdb_version_identity",
  "coverage_update_policy",
  "dst_gap_overlap_classification",
  "dst_resolution_policy",
  "utc_conversion_consistency",
  "time_scale_identity",
  "ephemeris_identity_version_digest",
  "ephemeris_coverage",
  "sidereal_zodiac_identity_version",
  "ayanamsa_identity_version",
  "node_mode_definition_version",
  "bhava_definition_version",
  "perturbation_candidate_semantics",
  "transition_ordering",
  "perturbation_policy_identity"
]);

const expectedConditionIds = Object.freeze([
  "all_thirteen_owner_selections_and_scope_decisions_accepted",
  "all_thirteen_source_or_first_party_provenance_bindings_frozen_verified",
  "all_thirteen_work_version_carrier_rights_and_distribution_dispositions_complete",
  "two_independent_domain_opinions_cover_same_frozen_thirteen_requirement_packet",
  "two_independent_source_rights_reviews_and_legal_authority_disposition_complete",
  "schema_specific_structural_and_semantic_validator_receipts_complete",
  "mutation_epoch_atomic_snapshot_aba_and_private_input_lifecycle_receipts_complete",
  "owner_supersession_formal_parent_and_central_registry_projection_complete"
]);

const expectedReviewContentBindingFields = Object.freeze([
  "selectedValueSetDigest",
  "targetUseProfileDigest",
  "questionSetDigest",
  "sourceBindingManifestDigest",
  "threeLayerRightsEvidenceManifestDigest",
  "validatorProfileSetDigest",
  "privateLifecyclePolicyDigest",
  "distributionOperationSetDigest",
  "targetJurisdictionSetDigest",
  "reviewInstructionAndDisagreementPolicyDigest"
]);

const expectedCasPreconditionFields = Object.freeze([
  "storageNamespaceId",
  "ledgerId",
  "ledgerGenerationId",
  "beforeEpoch",
  "previousStateDigest",
  "previousChainHeadDigest",
  "previousRevocationHeadDigest",
  "generationScopedOperationNonce",
  "previousConsumedNonceSetHeadDigest",
  "operationId",
  "idempotencyKey"
]);

const expectedAtomicCommitFields = Object.freeze([
  "nextState",
  "afterEpoch",
  "usedOperationId",
  "usedIdempotencyKey",
  "usedGenerationScopedOperationNonce",
  "nextConsumedNonceSetHeadDigest",
  "receipt",
  "nextChainHeadDigest",
  "nextRevocationHeadDigest",
  "nextSupersessionHeadDigest"
]);

const expectedReceiptStateTransitionFields = Object.freeze([
  "transitionType",
  "fromState",
  "toState",
  "beforeEpoch",
  "afterEpoch",
  "previousStateDigest",
  "nextStateDigest",
  "previousChainHeadDigest",
  "nextChainHeadDigest",
  "previousConsumedNonceSetHeadDigest",
  "nextConsumedNonceSetHeadDigest",
  "revocationLedgerHeadDigest"
]);

const expectedForwardInvalidationPayloadTail = Object.freeze([
  "reasonCode",
  "protectedReasonContextRef",
  "previousRevocationLedgerHeadDigest",
  "nextRevocationLedgerHeadDigest",
  "previousConsumedNonceSetHeadDigest",
  "nextConsumedNonceSetHeadDigest",
  "generationScopedOperationNonce",
  "beforeEpoch",
  "afterEpoch"
]);

const expectedRevocationCasIdentityRule = Object.freeze({
  receiptPreviousField: "previousRevocationLedgerHeadDigest",
  casPreviousField: "previousRevocationHeadDigest",
  receiptNextField: "nextRevocationLedgerHeadDigest",
  atomicCommitNextField: "nextRevocationHeadDigest",
  correspondingValuesMustBeExactlyEqual: true
});

const expectedForwardConsumedNonceHeadRule =
  "next_must_differ_from_previous_and_advance_atomically_by_adding_only_this_generation_scoped_operation_nonce";

const expectedCommonReceiptFields = Object.freeze([
  "receiptSchemaVersion",
  "receiptKind",
  "receiptId",
  "operationId",
  "idempotencyKey",
  "generationScopedOperationNonce",
  "systemId",
  "independentProductId",
  "storageNamespaceId",
  "ledgerId",
  "ledgerGenerationId",
  "admissionCycleId",
  "packetSchemaVersion",
  "packetId",
  "packetDigestDomain",
  "packetDigest",
  "packetManifestDigest",
  ...expectedReviewContentBindingFields,
  "requirementIds",
  "requirementSetDigest",
  "invariantIds",
  "invariantSetDigest",
  "conditionIds",
  "conditionSetDigest",
  "evidenceSetDigest",
  "issuerRoleId",
  "protectedIssuerContextRef",
  "authorityEvidenceContextRef",
  "payloadContextRef",
  "payloadDigestDomain",
  "payloadDigest",
  "issuedAtMutationEpoch",
  "custodyRef",
  "validityPolicyId",
  "canonicalizationProfile",
  "digestAlgorithm",
  "receiptDigestDomain",
  "receiptDigest",
  "signatureProfile",
  "signatureContextRef",
  "signingKeyContextRef",
  "trustAnchorSnapshotDigest"
]);

const expectedSuccessReceiptKinds = Object.freeze([
  "frozen_packet_receipt",
  "owner_selection_receipt",
  "source_or_first_party_binding_receipt",
  "three_layer_rights_evidence_receipt",
  "vedic_domain_expert_opinion_binding_receipt",
  "domain_disagreement_inventory_receipt",
  "source_rights_review_receipt",
  "legal_authority_disposition_receipt",
  "structural_validator_receipt",
  "semantic_validator_receipt",
  "private_lifecycle_public_non_person_attestation_receipt",
  "admission_epoch_snapshot_receipt",
  "supersession_intent_receipt",
  "supersession_commit_receipt",
  "conditions_one_to_seven_evaluation_receipt",
  "final_readiness_evaluation_receipt"
]);

const expectedNonSuccessLifecycleReceiptKinds = Object.freeze([
  "evidence_correction_receipt",
  "evidence_withdrawal_receipt",
  "evidence_revocation_receipt",
  "transition_rejection_receipt"
]);

let persistedBytes;
let persisted;
let readCurrent;
let loaded;

before(async () => {
  persistedBytes = await readFile(contractAbsolutePath);
  persisted =
    parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes(
      persistedBytes
    );
  readCurrent =
    await readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(
      workspaceRoot
    );
  loaded =
    await loadVedicInputAdmissionTransitionAndReceiptRequirements(workspaceRoot);
});

function clone(value) {
  return structuredClone(value);
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

function resignContract(mutator) {
  const contract = clone(persisted);
  mutator(contract);
  contract.contractDigest =
    computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest(contract);
  return contract;
}

function assertSelfResignedRejected(
  mutator,
  expectedCode = "CONTRACT_DIGEST_MISMATCH"
) {
  const expectedCodes = Array.isArray(expectedCode) ? expectedCode : [expectedCode];
  const contract = resignContract(mutator);
  assert.equal(
    contract.contractDigest,
    computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest(contract),
    "attack fixture must carry its valid self-computed digest"
  );
  assert.throws(
    () => verifyVedicInputAdmissionTransitionAndReceiptRequirementsObject(contract),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && expectedCodes.includes(error.code)
  );
  assert.equal(
    isVerifiedVedicInputAdmissionTransitionAndReceiptRequirements(contract),
    false
  );
}

function sanitizedEnvironment(overrides = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_PATH;
  return { ...environment, ...overrides };
}

function collectDeclaredPaths(value) {
  const paths = [];
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === null || typeof current !== "object") continue;
    if (Object.hasOwn(current, "path")
      && typeof current.path === "string"
      && !paths.includes(current.path)) {
      paths.push(current.path);
    }
    for (const child of Object.values(current)) stack.push(child);
  }
  return paths;
}

function assertSafeFixtureRelativePath(relativePath) {
  assert.equal(typeof relativePath, "string");
  assert.notEqual(relativePath, restrictedRelativePath);
  assert.equal(relativePath.includes("\\"), false);
  assert.equal(relativePath.includes(":"), false);
  assert.equal(relativePath.startsWith("/"), false);
  assert.equal(path.posix.normalize(relativePath), relativePath);
  assert.equal(
    relativePath.split("/").some((segment) =>
      segment === "" || segment === "." || segment === ".."),
    false
  );
}

async function createWorkspaceFixture(
  t,
  prefix = "hakimi-vedic-transition-receipt-"
) {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    const resolved = path.resolve(fixtureRoot);
    assert.equal(path.basename(resolved).startsWith(prefix), true);
    await rm(resolved, { recursive: true, force: true });
  });

  const pending = [
    VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH,
    ...collectDeclaredPaths(persisted.upstreamBindings)
  ];
  const copied = new Set();
  while (pending.length > 0) {
    const relativePath = pending.shift();
    if (copied.has(relativePath)) continue;
    assertSafeFixtureRelativePath(relativePath);
    const source = path.resolve(workspaceRoot, ...relativePath.split("/"));
    const destination = path.resolve(fixtureRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    copied.add(relativePath);

    if (relativePath.endsWith(".json")) {
      const parsed = JSON.parse(await readFile(source, "utf8"));
      for (const nested of collectDeclaredPaths(parsed)) {
        if (!copied.has(nested)) pending.push(nested);
      }
    }
  }
  return fixtureRoot;
}

async function createContractOnlyFixture(
  t,
  prefix = "hakimi-vedic-transition-contract-"
) {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    const resolved = path.resolve(fixtureRoot);
    assert.equal(path.basename(resolved).startsWith(prefix), true);
    await rm(resolved, { recursive: true, force: true });
  });
  const destination = path.resolve(
    fixtureRoot,
    ...VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(contractAbsolutePath, destination);
  return fixtureRoot;
}

function fixtureContractPath(fixtureRoot) {
  return path.resolve(
    fixtureRoot,
    ...VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
}

async function captureCliFailure(args, options = {}) {
  try {
    await execFileAsync(process.execPath, args, {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(options.env),
      windowsHide: true
    });
  } catch (error) {
    return { error, failure: JSON.parse(error.stderr) };
  }
  assert.fail("CLI unexpectedly succeeded");
}

test("fixed reader and private loader accept only the current zero-instance contract", async () => {
  assert.deepEqual(readCurrent, persisted);
  assert.equal(
    isVerifiedVedicInputAdmissionTransitionAndReceiptRequirements(loaded),
    true
  );
  assert.equal(
    isVerifiedVedicInputAdmissionTransitionAndReceiptRequirements(persisted),
    false
  );
  assert.equal(
    isVerifiedVedicInputAdmissionTransitionAndReceiptRequirements(clone(loaded)),
    false
  );
  assert.equal(
    loaded.artifact.path,
    VEDIC_INPUT_ADMISSION_TRANSITION_AND_RECEIPT_REQUIREMENTS_RELATIVE_PATH
  );
  assert.equal(loaded.artifact.bytes, persistedBytes.byteLength);
  assert.equal(loaded.artifact.bytes, expectedPersistedBytes);
  assert.equal(
    loaded.artifact.sha256,
    createHash("sha256").update(persistedBytes).digest("hex")
  );
  assert.equal(loaded.artifact.sha256, expectedPersistedSha256);
  assert.equal(loaded.requirementIdsRequired, 13);
  assert.equal(loaded.invariantIdsRequired, 26);
  assert.equal(loaded.conditionsRequired, 8);
  assert.equal(loaded.positiveTransitionEvaluatorImplemented, false);
  assert.equal(loaded.receiptInstances, 0);
  assert.equal(loaded.transitionInstances, 0);
  assert.equal(loaded.admissionCycleInstances, 0);
  assert.equal(loaded.ledgerGenerationInstances, 0);
  assert.equal(loaded.evaluationSnapshotInstances, 0);
  assert.equal(loaded.mutationEpochAvailable, false);
  assert.equal(loaded.intervalMutationExcluded, false);
  assert.equal(loaded.abaExcluded, false);
  assert.equal(loaded.inputContractGateSatisfied, false);
  assert.equal(loaded.formalAdmissionAuthorized, false);
  assert.equal(loaded.releaseReady, false);
  assert.equal(loaded.publicDeploymentAuthorized, false);
  assert.equal(loaded.publicReleaseAuthorized, false);
  assert.equal(loaded.expertClaimsAuthorized, false);
  assert.equal(loaded.legalConclusionAuthorized, false);
  assert.equal(loaded.formalProjectionAuthorized, false);
  assert.equal(loaded.activeAdmissionEffect, "none");
  assert.equal(loaded.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(loaded.observationBoundary.parentAndChildrenAtomicSnapshot, false);
  assert.equal(loaded.observationBoundary.mutationEpochAvailable, false);
  assert.equal(loaded.observationBoundary.intervalMutationExcluded, false);
  assert.equal(loaded.observationBoundary.abaExcluded, false);
  assertDeepFrozen(readCurrent);
  assertDeepFrozen(loaded);
});

test("persisted contract has fixed identity, exact top-level keys, digest and canonical LF", () => {
  assert.equal(
    persisted.schemaVersion,
    "vedic-input-admission-transition-and-receipt-requirements/v0.1.0"
  );
  assert.equal(
    persisted.recordType,
    "vedic-input-admission-transition-and-receipt-requirements"
  );
  assert.equal(
    persisted.contractId,
    "vedic-input-admission-transition-and-receipt-requirements-v0.1.0"
  );
  assert.equal(
    testOnly.digestDomain,
    "hakimi/vedic-input-admission-transition-and-receipt-requirements/v0.1.0"
  );
  assert.deepEqual(
    Object.keys(persisted).sort(),
    [...testOnly.EXPECTED_TOP_LEVEL_KEYS].sort()
  );
  assert.equal(
    persisted.contractDigest,
    computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest(persisted)
  );
  assert.equal(persisted.contractDigest, expectedContractDigest);
  assert.equal(persistedBytes.byteLength, expectedPersistedBytes);
  assert.equal(
    createHash("sha256").update(persistedBytes).digest("hex"),
    expectedPersistedSha256
  );
  assert.equal(
    persistedBytes.toString("utf8"),
    canonicalPrettyStringifyVedicInputAdmissionTransitionAndReceiptRequirements(
      persisted
    )
  );
  assert.equal(persistedBytes.includes(Buffer.from("\r\n")), false);
  assert.equal(persistedBytes[persistedBytes.byteLength - 1], 0x0a);
  assert.equal(
    persistedBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])),
    false
  );
  assert.match(persisted.contractDigest, /^[0-9a-f]{64}$/u);
});

test("fixed 13 requirements, 26 invariants and 8 conditions are exact ordered sets", () => {
  assert.deepEqual(testOnly.requirementIds, expectedRequirementIds);
  assert.deepEqual(testOnly.invariantIds, expectedInvariantIds);
  assert.deepEqual(testOnly.conditionIds, expectedConditionIds);
  assert.equal(new Set(testOnly.requirementIds).size, 13);
  assert.equal(new Set(testOnly.invariantIds).size, 26);
  assert.equal(new Set(testOnly.conditionIds).size, 8);
});

test("strict JSON bytes reject BOM, malformed UTF-8, duplicate keys, invalid roots and oversize", () => {
  for (const [bytes, code] of [
    [Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]), "JSON_BOM_FORBIDDEN"],
    [Buffer.from([0xc3, 0x28]), "JSON_UTF8_INVALID"],
    [Buffer.from([0xe2, 0x82]), "JSON_UTF8_INVALID"],
    [Buffer.from([0xc0, 0xaf]), "JSON_UTF8_INVALID"],
    [Buffer.from('{"a":1,"a":2}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.from('{"a":1,"\\u0061":2}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.from('{"outer":{"a":1,"\\u0061":2}}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.from('{"a/b":1,"a\\/b":2}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.alloc(0), "JSON_INVALID"],
    [Buffer.from("{", "utf8"), "JSON_INVALID"]
  ]) {
    assert.throws(
      () => parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes(bytes),
      (error) =>
        error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
        && error.code === code
    );
  }
  for (const json of ["[]", "null", "true", '"contract"']) {
    assert.throws(
      () => parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes(
        Buffer.from(json, "utf8")
      ),
      (error) =>
        error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
        && error.code === "JSON_INVALID"
    );
  }
  assert.throws(
    () => parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes(
      Buffer.alloc(testOnly.MAX_CONTRACT_BYTES + 1, 0x20)
    ),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "JSON_TOO_LARGE"
  );

  const sensitiveLabel = "birth-2000-01-01T01:02:03Z-private";
  assert.throws(
    () => parseVedicInputAdmissionTransitionAndReceiptRequirementsJsonBytes(
      Buffer.from("{", "utf8"),
      sensitiveLabel
    ),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "JSON_INVALID"
      && !error.message.includes(sensitiveLabel)
  );
});

test("frozen packet repeats the exact 13/26/8 identities and rejects counts as a substitute", () => {
  const packet = persisted.frozenPacketRequirements;
  assert.deepEqual(packet.reviewContentBindingFields, expectedReviewContentBindingFields);
  assert.equal(new Set(packet.reviewContentBindingFields).size, 10);
  for (const field of expectedReviewContentBindingFields) {
    assert.equal(packet.requiredFields.includes(field), true, field);
  }
  assert.equal(packet.requiredFields.includes("packetManifestDigest"), true);
  assert.equal(packet.requirementCount, 13);
  assert.deepEqual(packet.requirementIds, expectedRequirementIds);
  assert.equal(packet.invariantCount, 26);
  assert.deepEqual(packet.invariantIds, expectedInvariantIds);
  assert.equal(packet.conditionCount, 8);
  assert.deepEqual(packet.conditionIds, expectedConditionIds);
  assert.equal(packet.exactSetEqualityRequired, true);
  assert.equal(packet.countsAloneSufficient, false);
  assert.equal(packet.packetChangeRequiresNewAdmissionCycle, true);
  assert.equal(packet.oldOpinionsAutomaticallyCarryForward, false);
  assert.equal(packet.candidateInputInstancesAllowed, 0);
  assert.equal(packet.currentAdmissionCycleId, null);
  assert.equal(packet.currentPacketId, null);
  assert.equal(packet.currentPacketDigest, null);
  assert.deepEqual(packet.currentPacketInstances, []);
});

test("five authority roles plus formal governance stay exactly separated and vacant", () => {
  const actors = persisted.actorRoleRequirements;
  assert.deepEqual(
    actors.roles.map((role) => role.roleId),
    [
      "product_owner",
      "vedic_domain_expert",
      "source_rights_reviewer",
      "engineering_reproducibility_reviewer",
      "independent_legal_authority",
      "formal_admission_governance"
    ]
  );
  assert.deepEqual(
    actors.roles.map((role) => role.currentSeatCount),
    [0, 0, 0, 0, 0, 0]
  );
  assert.deepEqual(
    actors.roles.map((role) => role.minimumSeatCount),
    [1, 2, 2, 1, "required_undefined", 1]
  );
  assert.deepEqual(actors.roleInstances, []);
  assert.deepEqual(actors.seatInstances, []);
  assert.deepEqual(actors.identityVerificationInstances, []);
  assert.deepEqual(actors.eligibilityVerificationInstances, []);
  assert.deepEqual(actors.signatureVerificationInstances, []);
  assert.equal(actors.signerMayVerifyOwnEligibility, false);
  assert.equal(actors.rawIdentityCredentialsOrContactDataMayEnterPublicRepository, false);
  assert.equal(actors.generativeModelMayOccupyAnyRoleOrSeat, false);

  const byId = Object.fromEntries(actors.roles.map((role) => [role.roleId, role]));
  assert.equal(
    byId.vedic_domain_expert.forbiddenScopes.includes("rights_legal_conclusion"),
    true
  );
  assert.equal(
    byId.source_rights_reviewer.forbiddenScopes.includes(
      "final_rights_legal_conclusion"
    ),
    true
  );
  assert.equal(
    byId.engineering_reproducibility_reviewer.forbiddenScopes.includes(
      "real_identity_truth"
    ),
    true
  );
  assert.equal(
    byId.product_owner.forbiddenScopes.includes(
      "override_deferred_negative_or_revoked_disposition"
    ),
    true
  );
  assert.deepEqual(byId.independent_legal_authority, {
    roleId: "independent_legal_authority",
    minimumSeatCount: "required_undefined",
    allowedScopes: [
      "jurisdiction_use_material_operation_scoped_legal_disposition"
    ],
    forbiddenScopes: [
      "self_review_source_evidence",
      "vedic_domain_truth",
      "engineering_reproducibility_attestation",
      "product_owner_decision",
      "public_release_authorization"
    ],
    currentSeatCount: 0,
    roleDefinitionStatus: "required_undefined",
    eligibilityPolicyRef: null,
    jurisdictionPolicyRef: null,
    capacityPolicyRef: null,
    signatureProfileRef: null
  });
});

test("identity eligibility conflict signature and legal authority remain requirements-only undefined", () => {
  assert.deepEqual(persisted.actorRoleRequirements.requiredActorBindingFields, [
    "actorBindingId",
    "roleId",
    "seatId",
    "principalType",
    "accountableNaturalPersonBindingId",
    "privateIdentityContextId",
    "publicOpaqueIdentityBindingId",
    "identityVerificationMethod",
    "identityVerificationStatus",
    "identityVerifiedAt",
    "identityVerifiedByBindingId",
    "credentialOrCapacityEvidenceRefs",
    "verifiedScopeIds",
    "eligibilityDecision",
    "effectiveFrom",
    "effectiveUntil",
    "conflictDisclosureRefs",
    "rawEvidenceCustodyRef"
  ]);
  assert.equal(
    persisted.requiredUndefined.items.includes(
      "independentLegalAuthorityRoleEligibilityMinimumSeatsJurisdictionCapacityAndSignatureProfiles"
    ),
    true
  );
  assert.equal(
    persisted.requiredUndefined.undefinedValuesMayBeInferredFromBaziOrOtherSystems,
    false
  );
  assert.equal(
    persisted.requiredUndefined.verifiedPrivateOrVerifiedRedistributableVocabularyInheritedFromBazi,
    false
  );
  const legalReceipt = persisted.receiptTypeRequirements.families.find(
    (family) => family.receiptKind === "legal_authority_disposition_receipt"
  );
  assert.deepEqual(legalReceipt, {
    receiptKind: "legal_authority_disposition_receipt",
    minimumCount: "required_undefined",
    maximumCount: "required_undefined",
    issuerRoleId: "independent_legal_authority",
    coverage: "all_target_jurisdictions_material_layers_and_requested_operations"
  });
  assert.equal(
    persisted.receiptTypeRequirements.legalDispositionReceiptStructurallyVerified,
    false
  );
  assert.equal(persisted.receiptTypeRequirements.rightsLegalConclusionRecorded, false);
  assert.equal(
    persisted.receiptTypeRequirements
      .structuralVerificationAloneMaySetRightsLegalConclusionRecorded,
    false
  );
});

test("receipt envelope is opaque, non-self-authorizing and cannot derive IDs from people", () => {
  const envelope = persisted.receiptEnvelopeRequirements;
  assert.equal(envelope.draftReceiptEnvelopeRequirementsDefined, true);
  assert.equal(envelope.executableReceiptSchema, false);
  assert.deepEqual(envelope.executableReceiptSchemaIds, []);
  assert.equal(envelope.acceptedOrGateSatisfiedMayBeIssuerSupplied, false);
  assert.equal(envelope.authenticMayBeIssuerSupplied, false);
  assert.equal(envelope.opaqueProtectedContextRefsRequired, true);
  assert.equal(
    envelope.rawIdentityOpinionSourceBodyOrLegalTextMayBeCopiedIntoPublicEnvelope,
    false
  );
  assert.equal(envelope.receiptDigestIsDigitalSignature, false);
  assert.equal(
    envelope.digitalSignatureAloneEstablishesRealIdentityEligibilityAuthorityOrTruth,
    false
  );
  assert.equal(envelope.receiptIdMinimumRandomBits, 128);
  assert.equal(envelope.receiptIdMayDeriveFromPersonalData, false);
  assert.equal(envelope.operationNonceMayDeriveFromPersonalData, false);
  assert.deepEqual(envelope.commonRequiredFields, expectedCommonReceiptFields);
  assert.equal(
    Object.hasOwn(envelope, "aggregateAndTransitionAdditionalFields"),
    false
  );
  assert.equal(
    envelope
      .aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements,
    true
  );
  assert.equal(
    new Set(envelope.commonRequiredFields).size,
    envelope.commonRequiredFields.length
  );
});

test("privacy is exact-schema governance-only with all person material and derived digests absent", () => {
  const privacy = persisted.privacyBoundary;
  assert.deepEqual(Object.keys(privacy), [
    "allowedPayloadClass",
    "exactSchemaRequired",
    "governanceDigestAllowlistRequired",
    "booleanPrivacySelfDeclarationSufficient",
    "keyBlacklistAloneSufficient",
    "candidateInstanceCount",
    "personalDataFieldCount",
    "personDerivedDigestCount",
    "candidateInstanceRefs",
    "personalDataRefs",
    "freeTextFieldsPresent",
    "prohibitedPersonalFieldClasses",
    "prohibitedStableDerivedIdentifiers",
    "futurePersonalInputLifecycleUsesSeparatePrivateSchemaAndNamespace",
    "futurePrivateLifecycleReceiptConsumableByAdmissionEvaluator",
    "publicNonPersonLifecycleAttestationRequired",
    "publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator",
    "publicNonPersonLifecycleAttestationCurrentInstances",
    "publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead",
    "publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest",
    "publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage",
    "publicProjectionMayClaimAnonymous",
    "runtimeNoLeakageEstablished",
    "browserDomUrlHistoryConsoleNetworkStorageServiceWorkerNoLeakageEstablished",
    "stableDigestMechanicallyBlockedForArbitraryCandidate"
  ]);
  assert.equal(privacy.allowedPayloadClass, "governance_policy_packet_only");
  assert.equal(privacy.exactSchemaRequired, true);
  assert.equal(privacy.governanceDigestAllowlistRequired, true);
  assert.equal(privacy.booleanPrivacySelfDeclarationSufficient, false);
  assert.equal(privacy.keyBlacklistAloneSufficient, false);
  assert.equal(privacy.candidateInstanceCount, 0);
  assert.equal(privacy.personalDataFieldCount, 0);
  assert.equal(privacy.personDerivedDigestCount, 0);
  assert.deepEqual(privacy.candidateInstanceRefs, []);
  assert.deepEqual(privacy.personalDataRefs, []);
  assert.equal(privacy.freeTextFieldsPresent, false);
  assert.deepEqual(privacy.prohibitedStableDerivedIdentifiers, [
    "candidate_input_digest",
    "personal_payload_digest",
    "birth_data_fingerprint",
    "deterministic_person_linkable_identifier"
  ]);
  assert.equal(
    privacy.futurePersonalInputLifecycleUsesSeparatePrivateSchemaAndNamespace,
    true
  );
  assert.equal(privacy.futurePrivateLifecycleReceiptConsumableByAdmissionEvaluator, false);
  assert.equal(privacy.publicNonPersonLifecycleAttestationRequired, true);
  assert.equal(
    privacy.publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator,
    true
  );
  assert.equal(privacy.publicNonPersonLifecycleAttestationCurrentInstances, 0);
  assert.equal(
    privacy
      .publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead,
    true
  );
  assert.equal(
    privacy
      .publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest,
    false
  );
  assert.equal(
    privacy.publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage,
    false
  );
  assert.equal(privacy.publicProjectionMayClaimAnonymous, false);
  assert.equal(privacy.runtimeNoLeakageEstablished, false);
  assert.equal(
    privacy.browserDomUrlHistoryConsoleNetworkStorageServiceWorkerNoLeakageEstablished,
    false
  );
  assert.equal(privacy.stableDigestMechanicallyBlockedForArbitraryCandidate, false);
});

test("cycle packet, mutation clock and evaluation snapshot are three distinct identity planes", () => {
  const epoch = persisted.admissionEpochRequirements;
  assert.equal(epoch.identityPlanesMustRemainSeparate, true);
  assert.deepEqual(epoch.identityPlanes.map((plane) => plane.planeId), [
    "admission_cycle_and_packet",
    "ledger_mutation_clock",
    "evaluation_snapshot"
  ]);
  assert.deepEqual(epoch.identityPlanes[0].requiredIdentityFields, [
    "admissionCycleId",
    "packetId",
    "packetDigest"
  ]);
  assert.deepEqual(epoch.identityPlanes[1].requiredIdentityFields, [
    "ledgerGenerationId",
    "mutationEpoch",
    "stateDigest",
    "chainHeadDigest"
  ]);
  assert.deepEqual(epoch.identityPlanes[2].requiredIdentityFields, [
    "evaluationSnapshotEpoch",
    "snapshotDigest",
    "evaluationInputManifestDigest",
    "revocationLedgerHeadDigest"
  ]);
  assert.equal(epoch.currentLedgerGenerationId, null);
  assert.equal(epoch.currentMutationEpoch, null);
  assert.equal(epoch.currentEvaluationSnapshotEpoch, null);
  assert.equal(epoch.currentConsumedNonceSetHeadDigest, null);
  assert.equal(epoch.mutationEpochAvailable, false);
  assert.equal(epoch.mutationEpochReceipt, null);
  assert.equal(epoch.mutationEpochReceiptsIssued, 0);
  assert.equal(epoch.operationNoncesConsumed, 0);
  assert.equal(epoch.crossFileAtomicSnapshot, false);
  assert.equal(epoch.intervalMutationExcluded, false);
  assert.equal(epoch.abaExcluded, false);
  assert.equal(epoch.singleWriterFencingEstablished, false);
  assert.equal(epoch.externalMonotonicAnchorEstablished, false);
  assert.equal(epoch.offlineCloneOrOldBackupRollbackResistanceEstablished, false);
  assert.equal(epoch.successfulMutationAdvancesEpochByExactlyOne, true);
  assert.equal(epoch.failedMutationChangesNoAtomicCommitField, true);
  assert.equal(epoch.sameStateDigestAfterAbaStillRequiresDifferentEpochAndChainHead, true);
  assert.equal(epoch.generationScopedNonceRequired, true);
  assert.equal(epoch.consumedNonceHeadCommittedAtomically, true);
  assert.deepEqual(epoch.futureCasPreconditionFields, expectedCasPreconditionFields);
  assert.deepEqual(epoch.futureAtomicCommitFields, expectedAtomicCommitFields);
  assert.equal(epoch.restoreAndRollbackAreForwardMutations, true);
  assert.equal(epoch.allEvidenceMustHaveSameIssuanceMutationEpoch, false);
  assert.equal(epoch.allEvidenceMustBeReverifiedAtSameEvaluationSnapshotEpoch, true);
});

test("three acyclic manifests have distinct domains and exclude every own output receipt", () => {
  const evaluation = persisted.evaluationRequirements;
  assert.equal(evaluation.manifestLayeringAcyclicRequired, true);
  assert.equal(
    evaluation.manifestCoverageUnit,
    "receipt_kind_plus_receipt_id_plus_receipt_digest"
  );
  assert.equal(evaluation.manifestLayerCount, 3);
  assert.deepEqual(evaluation.manifestLayers, [
    {
      manifestId: "pre_snapshot_evidence_manifest",
      digestDomain:
        "hakimi/vedic-input-admission/pre-snapshot-evidence-manifest/v0.1.0",
      includedReceiptKinds: expectedSuccessReceiptKinds.slice(0, 11),
      excludedOutputReceiptKinds: [
        "admission_epoch_snapshot_receipt",
        "conditions_one_to_seven_evaluation_receipt",
        "supersession_intent_receipt",
        "supersession_commit_receipt",
        "final_readiness_evaluation_receipt"
      ],
      currentInstances: 0
    },
    {
      manifestId: "conditions_one_to_seven_evaluation_input_manifest",
      digestDomain:
        "hakimi/vedic-input-admission/conditions-one-to-seven-evaluation-input-manifest/v0.1.0",
      includedComponentIds: [
        "pre_snapshot_evidence_manifest_digest",
        "admission_epoch_snapshot_receipt_digest"
      ],
      excludedOutputReceiptKinds: [
        "conditions_one_to_seven_evaluation_receipt"
      ],
      currentInstances: 0
    },
    {
      manifestId: "final_readiness_evaluation_input_manifest",
      digestDomain:
        "hakimi/vedic-input-admission/final-readiness-evaluation-input-manifest/v0.1.0",
      includedComponentIds: [
        "conditions_one_to_seven_evaluation_receipt_digest",
        "supersession_intent_receipt_digest",
        "supersession_commit_receipt_digest"
      ],
      excludedOutputReceiptKinds: ["final_readiness_evaluation_receipt"],
      currentInstances: 0
    }
  ]);
  assert.equal(
    new Set(evaluation.manifestLayers.map((layer) => layer.digestDomain)).size,
    3
  );
  assert.equal(evaluation.outputReceiptMayBeIncludedInOwnInputManifest, false);
  assert.equal(evaluation.manifestDigestDomainsMustBeDistinct, true);
  assert.equal(
    persisted.receiptTypeRequirements.successFamiliesFormOneFlatManifest,
    false
  );
});

test("ordered guards cover ABA replay revocation restore fork privacy and supersession", () => {
  const guards = persisted.guardDefinitions.orderedGuards;
  assert.deepEqual(guards.map((guard) => guard.order),
    Array.from({ length: 21 }, (_, index) => index + 1));
  assert.deepEqual(guards.map((guard) => guard.guardId), [
    "strict_bytes_parser_and_canonical_materialization",
    "vedic_identity_no_cross_system_fallback",
    "packet_exact_identity",
    "same_cycle_and_packet_for_every_receipt",
    "pre_snapshot_evidence_manifest_closed",
    "manifest_layer_exact_set_coverage",
    "actor_role_eligible_authenticated_and_scope_allowed",
    "required_distinct_actors_verified",
    "disagreements_preserved_and_non_automatic",
    "no_active_correction_withdrawal_or_revocation",
    "evaluation_snapshot_exact_identity",
    "epoch_atomicity_interval_and_aba_receipt_valid",
    "replay_idempotency_restore_and_fork_safe",
    "no_person_input_instance_in_governance_packet",
    "append_only_invalidation_forward_epoch",
    "supersession_parent_registry_transaction_valid",
    "all_eight_conditions_necessary_not_sufficient",
    "unknown_missing_ambiguous_means_false",
    "packet_review_content_exact_identity",
    "acyclic_manifest_layering",
    "private_lifecycle_public_attestation_valid"
  ]);
  assert.equal(guards.every((guard) => guard.currentSatisfied === false), true);
  assert.equal(persisted.guardDefinitions.allGuardsRequired, true);
  assert.equal(persisted.guardDefinitions.guardEvaluatorImplemented, false);
  assert.deepEqual(persisted.guardDefinitions.guardInstances, []);
});

test("future state and transition vocabulary stays authority-none and invalidation is forward-only", () => {
  assert.equal(persisted.stateModel.stateMachineImplemented, false);
  assert.deepEqual(persisted.stateModel.stateInstances, []);
  assert.equal(
    persisted.stateModel.futureStateDefinitions.every(
      (state) => state.authorityEffect === "none"
    ),
    true
  );
  assert.equal(persisted.stateModel.positiveStateNamesMayUseAdmittedAuthorizedReady, false);
  assert.equal(persisted.stateModel.conditionsAreNecessaryNotSufficient, true);
  assert.equal(persisted.transitionRequirements.transitionEvaluatorImplemented, false);
  assert.deepEqual(persisted.transitionRequirements.transitionInstances, []);
  assert.deepEqual(
    persisted.transitionRequirements.futureTransitionDefinitions.map(
      (transition) => transition.transitionId
    ),
    [
      "freeze_packet",
      "seal_pre_snapshot_evidence_manifest",
      "verify_conditions_1_to_7",
      "verify_supersession_projection",
      "invalidate"
    ]
  );
  assert.equal(
    persisted.transitionRequirements.futureTransitionDefinitions.every(
      (transition) => transition.authorityEffect === "none"
    ),
    true
  );
  assert.equal(persisted.transitionRequirements.invalidatedStateMayReturnInPlace, false);
  assert.equal(
    persisted.transitionRequirements.recoveryRequiresNewCyclePacketEpochAndEvaluation,
    true
  );
});

test("zero instances, evaluator absence and every authority remain red", () => {
  const zero = persisted.zeroInstanceState;
  for (const [key, value] of Object.entries(zero)) {
    if (Array.isArray(value)) assert.deepEqual(value, [], key);
    else if (typeof value === "number") assert.equal(value, 0, key);
    else if (typeof value === "boolean") assert.equal(value, false, key);
    else assert.fail(`${key} is not a generic zero-state field`);
  }
  for (const key of [
    "preSnapshotEvidenceManifestInstances",
    "conditionsOneToSevenEvaluationInputManifestInstances",
    "finalReadinessEvaluationInputManifestInstances"
  ]) assert.deepEqual(zero[key], []);
  for (const key of [
    "acceptedReceipts",
    "operationNoncesConsumed",
    "privateLifecyclePublicAttestationReceipts",
    "evaluationReceipts",
    "supersessionReceipts"
  ]) assert.equal(zero[key], 0);
  assert.equal(Object.values(persisted.authorityBoundary).every((value) => value === false), true);
  assert.equal(persisted.evaluationRequirements.evaluatorImplemented, false);
  assert.equal(persisted.evaluationRequirements.evaluatorIdentity, null);
  assert.equal(persisted.evaluationRequirements.evaluatorByteDigest, null);
  assert.deepEqual(persisted.evaluationRequirements.evaluationInstances, []);
  assert.equal(persisted.evaluationRequirements.evaluationReceipts, 0);
  assert.equal(persisted.evaluationRequirements.partialCompletionMaySetGateTrue, false);
  assert.equal(persisted.evaluationRequirements.conditionSkippingAllowed, false);
  assert.equal(persisted.evaluationRequirements.majorityVoteAllowed, false);
  assert.equal(persisted.evaluationRequirements.opinionAveragingAllowed, false);
  assert.equal(persisted.evaluationRequirements.generativeModelWinnerSelectionAllowed, false);
  assert.equal(persisted.evaluationRequirements.allEightConditionsAloneConferFormalAdmission, false);
  assert.equal(persisted.evaluationRequirements.successfulMechanicalCandidateAuthorityEffect, "none");
});

test("sixteen layered success families and four non-success lifecycle kinds stay exact", () => {
  const types = persisted.receiptTypeRequirements;
  const payloads = types.typeSpecificRequiredPayloadFields;
  assert.deepEqual(
    payloads.legal_authority_disposition_receipt,
    [
      "legalAuthoritySeatId",
      "identityEligibilityCapacityVerificationRefs",
      "professionalStatusContextRef",
      "engagementOrMandateContextRef",
      "sourceRightsReviewReceiptIds",
      "targetUseProfileDigest",
      "targetJurisdictionSetDigest",
      "applicableLawCandidateSetDigest",
      "lawVersionAndEffectiveDateDigest",
      "conflictOfLawsAnalysisContextRef",
      "uncoveredJurisdictionIds",
      "materialOperationJurisdictionDispositionMatrixDigest",
      "assumptionsLimitationsAndUnresolvedIssuesDigest",
      "requiredProductRestrictionsDigest",
      "conflictDisclosureAndMitigationDigest",
      "signedPayloadSha256",
      "signatureOrAttestationMethod",
      "signatureEvidenceContextRef",
      "keyOrCertificateBindingRef",
      "signatureVerificationStatus",
      "certificateOrAuthorityRevocationStatusRef"
    ]
  );
  assert.deepEqual(
    payloads.private_lifecycle_public_non_person_attestation_receipt,
    [
      "payloadClass",
      "privateLifecycleSchemaDigest",
      "privateNamespaceClassId",
      "retentionDeletionPolicyDigest",
      "runtimeCanaryTestCorpusDigest",
      "protectedRuntimeEvidenceContextRef",
      "evidenceFreshnessPolicyId",
      "revocationLedgerHeadDigest",
      "publicGovernanceProjectionDigest",
      "candidateInstanceCount",
      "personalDataFieldCount",
      "personDerivedDigestCount",
      "candidateInstanceRefs",
      "personalDataRefs",
      "freeTextFieldsPresent",
      "result"
    ]
  );
  assert.deepEqual(payloads.admission_epoch_snapshot_receipt, [
    "transitionType",
    "fromState",
    "toState",
    "ledgerGenerationId",
    "beforeEpoch",
    "afterEpoch",
    "generationScopedOperationNonce",
    "previousStateDigest",
    "nextStateDigest",
    "previousChainHeadDigest",
    "nextChainHeadDigest",
    "previousConsumedNonceSetHeadDigest",
    "nextConsumedNonceSetHeadDigest",
    "preSnapshotEvidenceManifestDigest",
    "readSetDigest",
    "writeSetDigest",
    "revocationLedgerHeadDigest",
    "atomicityMechanismRef",
    "abaDefenseEvidenceRef",
    "privateLifecyclePolicyRef",
    "privateLifecyclePublicAttestationReceiptId",
    "evaluationSnapshotEpoch"
  ]);
  assert.deepEqual(payloads.supersession_commit_receipt, [
    ...expectedReceiptStateTransitionFields,
    "formalParentPreimageDigest",
    "formalParentPostimageDigest",
    "registrySlotId",
    "registryPreimageDigest",
    "registryPostimageDigest",
    "oldLedgerGenerationId",
    "newLedgerGenerationId",
    "transactionContextRef",
    "rollbackContextRef"
  ]);
  assert.deepEqual(payloads.conditions_one_to_seven_evaluation_receipt, [
    ...expectedReceiptStateTransitionFields,
    "preSnapshotEvidenceManifestDigest",
    "admissionEpochSnapshotReceiptId",
    "privateLifecyclePublicAttestationReceiptId",
    "conditionOneToSevenEvaluationInputManifestDigest",
    "evaluationSnapshotEpoch",
    "orderedGuardResultDigest",
    "conditionResultDigest",
    "resultingState",
    "evaluatorIdentityDigest",
    "authorityEffect"
  ]);
  assert.deepEqual(payloads.final_readiness_evaluation_receipt, [
    ...expectedReceiptStateTransitionFields,
    "conditionsOneToSevenEvaluationReceiptId",
    "supersessionIntentReceiptId",
    "supersessionCommitReceiptId",
    "finalEvaluationInputManifestDigest",
    "evaluationSnapshotEpoch",
    "orderedGuardResultDigest",
    "conditionResultDigest",
    "resultingState",
    "evaluatorIdentityDigest",
    "authorityEffect"
  ]);
  for (const fields of [
    payloads.admission_epoch_snapshot_receipt,
    payloads.supersession_commit_receipt,
    payloads.conditions_one_to_seven_evaluation_receipt,
    payloads.final_readiness_evaluation_receipt
  ]) assert.equal(new Set(fields).size, fields.length);
  for (const [fields, forbiddenCycleFields] of [
    [payloads.admission_epoch_snapshot_receipt, [
      "admissionEpochSnapshotReceiptId",
      "conditionsOneToSevenEvaluationReceiptId",
      "supersessionCommitReceiptId",
      "finalReadinessEvaluationReceiptId"
    ]],
    [payloads.supersession_commit_receipt, [
      "supersessionCommitReceiptId",
      "conditionsOneToSevenEvaluationReceiptId",
      "finalReadinessEvaluationReceiptId"
    ]],
    [payloads.conditions_one_to_seven_evaluation_receipt, [
      "conditionsOneToSevenEvaluationReceiptId",
      "finalReadinessEvaluationReceiptId"
    ]],
    [payloads.final_readiness_evaluation_receipt, [
      "finalReadinessEvaluationReceiptId"
    ]]
  ]) {
    for (const field of forbiddenCycleFields) {
      assert.equal(fields.includes(field), false, field);
    }
  }
  assert.equal(
    Object.keys(payloads).length,
    expectedSuccessReceiptKinds.length
  );
  assert.deepEqual(Object.keys(payloads), expectedSuccessReceiptKinds);
  assert.deepEqual(
    types.families.map((family) => family.receiptKind),
    expectedSuccessReceiptKinds
  );
  assert.equal(types.families.length, 16);
  assert.equal(new Set(expectedSuccessReceiptKinds).size, 16);
  assert.equal(types.successFamiliesFormOneFlatManifest, false);
  assert.equal(
    types.successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput,
    true
  );
  const nonSuccess = types.nonSuccessLifecycleReceiptRequirements;
  assert.deepEqual(nonSuccess.currentInstances, []);
  assert.equal(nonSuccess.mayEnterSuccessExactSet, false);
  assert.deepEqual(nonSuccess.receiptKinds, expectedNonSuccessLifecycleReceiptKinds);
  assert.equal(new Set(nonSuccess.receiptKinds).size, 4);
  assert.deepEqual(nonSuccess.forwardInvalidationReceiptKinds, [
    "evidence_correction_receipt",
    "evidence_withdrawal_receipt",
    "evidence_revocation_receipt"
  ]);
  assert.deepEqual(nonSuccess.noMutationReceiptKinds, [
    "transition_rejection_receipt"
  ]);
  assert.deepEqual(nonSuccess.typeSpecificRequirements, {
    evidence_correction_receipt: {
      mutationSemantics: "append_only_forward_invalidation_and_replacement",
      afterEpochRule: "before_epoch_plus_one",
      revocationHeadRule: "advance_atomically",
      revocationCasIdentityRule: expectedRevocationCasIdentityRule,
      consumedNonceHeadRule: expectedForwardConsumedNonceHeadRule,
      operationNonceRule: "consume_atomically",
      requiredPayloadFields: [
        "targetReceiptId",
        "targetReceiptDigest",
        "replacementReceiptId",
        "replacementReceiptDigest",
        ...expectedForwardInvalidationPayloadTail
      ]
    },
    evidence_withdrawal_receipt: {
      mutationSemantics: "append_only_forward_invalidation",
      afterEpochRule: "before_epoch_plus_one",
      revocationHeadRule: "advance_atomically",
      revocationCasIdentityRule: expectedRevocationCasIdentityRule,
      consumedNonceHeadRule: expectedForwardConsumedNonceHeadRule,
      operationNonceRule: "consume_atomically",
      requiredPayloadFields: [
        "targetReceiptId",
        "targetReceiptDigest",
        ...expectedForwardInvalidationPayloadTail
      ]
    },
    evidence_revocation_receipt: {
      mutationSemantics: "append_only_forward_invalidation",
      afterEpochRule: "before_epoch_plus_one",
      revocationHeadRule: "advance_atomically",
      revocationCasIdentityRule: expectedRevocationCasIdentityRule,
      consumedNonceHeadRule: expectedForwardConsumedNonceHeadRule,
      operationNonceRule: "consume_atomically",
      requiredPayloadFields: [
        "targetReceiptId",
        "targetReceiptDigest",
        ...expectedForwardInvalidationPayloadTail
      ]
    },
    transition_rejection_receipt: {
      mutationSemantics: "deterministic_no_ledger_mutation_failure_response",
      afterEpochRule: "equals_before_epoch",
      stateDigestRule: "next_equals_previous",
      chainHeadRule: "next_equals_previous",
      revocationHeadRule: "next_equals_previous",
      revocationCasIdentityRule: expectedRevocationCasIdentityRule,
      consumedNonceHeadRule: "next_equals_previous",
      operationNonceRule: "not_consumed",
      requiredPayloadFields: [
        "attemptedTransitionId",
        "rejectionCode",
        "failedGuardIds",
        "protectedReasonContextRef",
        "generationScopedOperationNonce",
        "beforeEpoch",
        "afterEpoch",
        "previousStateDigest",
        "nextStateDigest",
        "previousChainHeadDigest",
        "nextChainHeadDigest",
        "previousRevocationLedgerHeadDigest",
        "nextRevocationLedgerHeadDigest",
        "previousConsumedNonceSetHeadDigest",
        "nextConsumedNonceSetHeadDigest"
      ]
    }
  });
  for (const kind of nonSuccess.forwardInvalidationReceiptKinds) {
    const requirements = nonSuccess.typeSpecificRequirements[kind];
    assert.equal(requirements.afterEpochRule, "before_epoch_plus_one");
    assert.equal(requirements.revocationHeadRule, "advance_atomically");
    assert.deepEqual(
      requirements.revocationCasIdentityRule,
      expectedRevocationCasIdentityRule
    );
    assert.equal(
      requirements.consumedNonceHeadRule,
      expectedForwardConsumedNonceHeadRule
    );
    assert.equal(requirements.operationNonceRule, "consume_atomically");
    for (const field of [
      "previousRevocationLedgerHeadDigest",
      "nextRevocationLedgerHeadDigest",
      "previousConsumedNonceSetHeadDigest",
      "nextConsumedNonceSetHeadDigest",
      "generationScopedOperationNonce",
      "beforeEpoch",
      "afterEpoch"
    ]) assert.equal(requirements.requiredPayloadFields.includes(field), true, field);
  }
  const rejection =
    nonSuccess.typeSpecificRequirements.transition_rejection_receipt;
  assert.equal(rejection.requiredPayloadFields.includes("targetReceiptId"), false);
  assert.equal(rejection.requiredPayloadFields.includes("targetReceiptDigest"), false);
  assert.equal(rejection.afterEpochRule, "equals_before_epoch");
  assert.equal(rejection.stateDigestRule, "next_equals_previous");
  assert.equal(rejection.chainHeadRule, "next_equals_previous");
  assert.equal(rejection.revocationHeadRule, "next_equals_previous");
  assert.deepEqual(
    rejection.revocationCasIdentityRule,
    expectedRevocationCasIdentityRule
  );
  assert.equal(rejection.consumedNonceHeadRule, "next_equals_previous");
  assert.equal(rejection.operationNonceRule, "not_consumed");
  assert.equal(nonSuccess.unrevokeAllowed, false);
  assert.equal(nonSuccess.deletionOrOverwriteOfTargetAllowed, false);
  assert.equal(nonSuccess.failedTransitionChangesAnyAtomicCommitField, false);
  assert.equal(types.rejectionReceiptMayEnterSuccessExactSet, false);
  assert.deepEqual(types.receiptInstances, []);
  assert.equal(types.acceptedReceipts, 0);
  assert.equal(types.requirementsOnlyNoExecutableSchemas, true);
});

test("valid self-digests cannot flip authority, add instances or implement evaluator/schema", () => {
  const attacks = [
    (contract) => { contract.authorityBoundary.inputContractGateSatisfied = true; },
    (contract) => { contract.authorityBoundary.formalAdmissionAuthorized = true; },
    (contract) => { contract.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (contract) => { contract.authorityBoundary.expertClaimsAuthorized = true; },
    (contract) => { contract.authorityBoundary.releaseReady = true; },
    (contract) => { contract.authorityBoundary.publicDeploymentAuthorized = true; },
    (contract) => { contract.authorityBoundary.publicReleaseAuthorized = true; },
    (contract) => { contract.zeroInstanceState.receiptInstances.push({ receiptId: "fake" }); },
    (contract) => {
      contract.zeroInstanceState.preSnapshotEvidenceManifestInstances.push({
        manifestId: "fake"
      });
    },
    (contract) => {
      contract.zeroInstanceState.conditionsOneToSevenEvaluationInputManifestInstances.push({
        manifestId: "fake"
      });
    },
    (contract) => {
      contract.zeroInstanceState.finalReadinessEvaluationInputManifestInstances.push({
        manifestId: "fake"
      });
    },
    (contract) => { contract.zeroInstanceState.operationNoncesConsumed = 1; },
    (contract) => {
      contract.zeroInstanceState.privateLifecyclePublicAttestationReceipts = 1;
    },
    (contract) => { contract.receiptTypeRequirements.receiptInstances.push({ receiptId: "fake" }); },
    (contract) => { contract.transitionRequirements.transitionInstances.push({ transitionId: "fake" }); },
    (contract) => { contract.stateModel.stateInstances.push({ stateId: "fake" }); },
    (contract) => { contract.evaluationRequirements.evaluatorImplemented = true; },
    (contract) => { contract.evaluationRequirements.evaluatorIdentity = "fake"; },
    (contract) => { contract.evaluationRequirements.evaluationReceipts = 1; },
    (contract) => { contract.evaluationRequirements.manifestLayers[0].currentInstances = 1; },
    (contract) => { contract.receiptEnvelopeRequirements.executableReceiptSchema = true; },
    (contract) => { contract.receiptEnvelopeRequirements.executableReceiptSchemaIds.push("fake"); },
    (contract) => { contract.guardDefinitions.guardEvaluatorImplemented = true; }
  ];
  for (const attack of attacks) assertSelfResignedRejected(attack);
  assertSelfResignedRejected(
    (contract) => { contract.activeAdmissionEffect = "formal"; },
    "CONTRACT_OBJECT_MISMATCH"
  );
});

test("partial 12/13, 25/26 or 7/8 exact sets remain rejected after self-resigning", () => {
  for (const attack of [
    (contract) => { contract.frozenPacketRequirements.requirementCount = 12; },
    (contract) => { contract.frozenPacketRequirements.requirementIds.pop(); },
    (contract) => { contract.frozenPacketRequirements.invariantCount = 25; },
    (contract) => { contract.frozenPacketRequirements.invariantIds.pop(); },
    (contract) => { contract.frozenPacketRequirements.conditionCount = 7; },
    (contract) => { contract.frozenPacketRequirements.conditionIds.pop(); },
    (contract) => { contract.evaluationRequirements.exactRequirementSetRequired = 12; },
    (contract) => { contract.evaluationRequirements.exactInvariantSetRequired = 25; },
    (contract) => { contract.evaluationRequirements.exactConditionSetRequired = 7; },
    (contract) => { contract.frozenPacketRequirements.countsAloneSufficient = true; }
  ]) assertSelfResignedRejected(attack);
});

test("packet review-content bindings and their dedicated guard reject self-resigned drift", () => {
  for (const field of expectedReviewContentBindingFields) {
    assertSelfResignedRejected((contract) => {
      contract.frozenPacketRequirements.reviewContentBindingFields =
        contract.frozenPacketRequirements.reviewContentBindingFields.filter(
          (candidate) => candidate !== field
        );
    });
    assertSelfResignedRejected((contract) => {
      contract.frozenPacketRequirements.requiredFields =
        contract.frozenPacketRequirements.requiredFields.filter(
          (candidate) => candidate !== field
        );
    });
    assertSelfResignedRejected((contract) => {
      contract.receiptEnvelopeRequirements.commonRequiredFields =
        contract.receiptEnvelopeRequirements.commonRequiredFields.filter(
          (candidate) => candidate !== field
        );
    });
  }
  for (const attack of [
    (contract) => {
      contract.frozenPacketRequirements.reviewContentBindingFields[0] =
        "unboundSelectedValueSetDigest";
    },
    (contract) => {
      contract.guardDefinitions.orderedGuards =
        contract.guardDefinitions.orderedGuards.filter(
          (guard) => guard.guardId !== "packet_review_content_exact_identity"
        );
    },
    (contract) => {
      contract.guardDefinitions.orderedGuards.find(
        (guard) => guard.guardId === "packet_review_content_exact_identity"
      ).currentSatisfied = true;
    }
  ]) assertSelfResignedRejected(attack);
});

test("generation-scoped nonces and consumed-head CAS commit bindings reject shortcuts", () => {
  const remove = (items, field) => items.filter((candidate) => candidate !== field);
  for (const attack of [
    (contract) => { contract.admissionEpochRequirements.generationScopedNonceRequired = false; },
    (contract) => { contract.admissionEpochRequirements.consumedNonceHeadCommittedAtomically = false; },
    (contract) => { contract.admissionEpochRequirements.currentConsumedNonceSetHeadDigest = "0".repeat(64); },
    (contract) => { contract.admissionEpochRequirements.operationNoncesConsumed = 1; },
    (contract) => {
      contract.admissionEpochRequirements.futureCasPreconditionFields = remove(
        contract.admissionEpochRequirements.futureCasPreconditionFields,
        "generationScopedOperationNonce"
      );
    },
    (contract) => {
      contract.admissionEpochRequirements.futureCasPreconditionFields = remove(
        contract.admissionEpochRequirements.futureCasPreconditionFields,
        "previousConsumedNonceSetHeadDigest"
      );
    },
    (contract) => {
      contract.admissionEpochRequirements.futureAtomicCommitFields = remove(
        contract.admissionEpochRequirements.futureAtomicCommitFields,
        "usedGenerationScopedOperationNonce"
      );
    },
    (contract) => {
      contract.admissionEpochRequirements.futureAtomicCommitFields = remove(
        contract.admissionEpochRequirements.futureAtomicCommitFields,
        "nextConsumedNonceSetHeadDigest"
      );
    },
    (contract) => {
      contract.receiptEnvelopeRequirements.commonRequiredFields = remove(
        contract.receiptEnvelopeRequirements.commonRequiredFields,
        "generationScopedOperationNonce"
      );
    },
    (contract) => {
      contract.receiptEnvelopeRequirements
        .aggregateAndTransitionAdditionalFieldsUseOnlyTypeSpecificReceiptRequirements = false;
    },
    (contract) => {
      contract.receiptEnvelopeRequirements.aggregateAndTransitionAdditionalFields = [
        "previousConsumedNonceSetHeadDigest",
        "nextConsumedNonceSetHeadDigest"
      ];
    },
    (contract) => {
      contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields
        .admission_epoch_snapshot_receipt = remove(
          contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields
            .admission_epoch_snapshot_receipt,
          "generationScopedOperationNonce"
        );
    },
    (contract) => {
      contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields
        .admission_epoch_snapshot_receipt = remove(
          contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields
            .admission_epoch_snapshot_receipt,
          "previousConsumedNonceSetHeadDigest"
        );
    },
    (contract) => {
      contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields
        .admission_epoch_snapshot_receipt = remove(
          contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields
            .admission_epoch_snapshot_receipt,
          "nextConsumedNonceSetHeadDigest"
        );
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .typeSpecificRequirements.evidence_revocation_receipt.requiredPayloadFields =
        remove(
          contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
            .typeSpecificRequirements.evidence_revocation_receipt.requiredPayloadFields,
          "generationScopedOperationNonce"
        );
    },
    (contract) => {
      contract.receiptEnvelopeRequirements.operationNonceMayDeriveFromPersonalData = true;
    }
  ]) assertSelfResignedRejected(attack);
});

test("snapshot commit and evaluation receipt fields reject duplicates and dependency cycles", () => {
  const receiptKinds = [
    "admission_epoch_snapshot_receipt",
    "supersession_commit_receipt",
    "conditions_one_to_seven_evaluation_receipt",
    "final_readiness_evaluation_receipt"
  ];
  for (const receiptKind of receiptKinds) {
    assertSelfResignedRejected((contract) => {
      contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields[
        receiptKind
      ].push("transitionType");
    });
    assertSelfResignedRejected((contract) => {
      contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields[
        receiptKind
      ] = contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields[
        receiptKind
      ].filter((field) => field !== "nextConsumedNonceSetHeadDigest");
    });
  }
  for (const [receiptKind, selfReferenceField] of [
    ["admission_epoch_snapshot_receipt", "admissionEpochSnapshotReceiptId"],
    ["supersession_commit_receipt", "supersessionCommitReceiptId"],
    [
      "conditions_one_to_seven_evaluation_receipt",
      "conditionsOneToSevenEvaluationReceiptId"
    ],
    ["final_readiness_evaluation_receipt", "finalReadinessEvaluationReceiptId"]
  ]) {
    assertSelfResignedRejected((contract) => {
      contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields[
        receiptKind
      ].push(selfReferenceField);
    });
  }
});

test("forward invalidation and no-mutation rejection semantics reject self-resigned weakening", () => {
  const forwardKinds = [
    "evidence_correction_receipt",
    "evidence_withdrawal_receipt",
    "evidence_revocation_receipt"
  ];
  for (const kind of forwardKinds) {
    for (const [field, weakened] of [
      ["afterEpochRule", "equals_before_epoch"],
      ["revocationHeadRule", "next_equals_previous"],
      ["consumedNonceHeadRule", "next_equals_previous"],
      ["operationNonceRule", "not_consumed"]
    ]) {
      assertSelfResignedRejected((contract) => {
        contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
          .typeSpecificRequirements[kind][field] = weakened;
      });
    }
    for (const attack of [
      (requirement) => { delete requirement.revocationCasIdentityRule; },
      (requirement) => {
        requirement.revocationCasIdentityRule
          .correspondingValuesMustBeExactlyEqual = false;
      }
    ]) {
      assertSelfResignedRejected((contract) => {
        const requirement =
          contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
            .typeSpecificRequirements[kind];
        attack(requirement);
      });
    }
    for (const requiredField of [
      "previousRevocationLedgerHeadDigest",
      "nextRevocationLedgerHeadDigest",
      "previousConsumedNonceSetHeadDigest",
      "nextConsumedNonceSetHeadDigest",
      "generationScopedOperationNonce",
      "beforeEpoch",
      "afterEpoch"
    ]) {
      assertSelfResignedRejected((contract) => {
        const requirement =
          contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
            .typeSpecificRequirements[kind];
        requirement.requiredPayloadFields = requirement.requiredPayloadFields.filter(
          (field) => field !== requiredField
        );
      });
    }
  }
  for (const [field, weakened] of [
    ["afterEpochRule", "before_epoch_plus_one"],
    ["stateDigestRule", "advance"],
    ["chainHeadRule", "advance"],
    ["revocationHeadRule", "advance_atomically"],
    ["consumedNonceHeadRule", "advance_atomically"],
    ["operationNonceRule", "consume_atomically"]
  ]) {
    assertSelfResignedRejected((contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .typeSpecificRequirements.transition_rejection_receipt[field] = weakened;
    });
  }
  for (const attack of [
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .typeSpecificRequirements.transition_rejection_receipt
        .requiredPayloadFields.push("targetReceiptId", "targetReceiptDigest");
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .forwardInvalidationReceiptKinds.push("transition_rejection_receipt");
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .noMutationReceiptKinds = [];
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .failedTransitionChangesAnyAtomicCommitField = true;
    },
    (contract) => {
      delete contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .typeSpecificRequirements.transition_rejection_receipt
        .revocationCasIdentityRule;
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .typeSpecificRequirements.transition_rejection_receipt
        .revocationCasIdentityRule.correspondingValuesMustBeExactlyEqual = false;
    }
  ]) assertSelfResignedRejected(attack);
});

test("direct non-success exact validator rejects lifecycle weakening before the contract digest gate", () => {
  const baseline =
    persisted.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements;
  const validate =
    testOnly.requireNonSuccessLifecycleReceiptRequirements;
  assert.doesNotThrow(() => validate(clone(baseline)));

  const assertDirectRejected = (mutator) => {
    const candidate = clone(baseline);
    mutator(candidate);
    assert.throws(
      () => validate(candidate),
      (error) =>
        error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
        && error.code === "RECEIPT_TYPE_REQUIREMENTS_MISMATCH"
    );
  };

  for (const kind of [
    "evidence_correction_receipt",
    "evidence_withdrawal_receipt",
    "evidence_revocation_receipt"
  ]) {
    for (const attack of [
      (requirement) => { delete requirement.consumedNonceHeadRule; },
      (requirement) => {
        requirement.consumedNonceHeadRule = "next_equals_previous";
      },
      (requirement) => { delete requirement.revocationCasIdentityRule; },
      (requirement) => {
        requirement.revocationCasIdentityRule.casPreviousField =
          "previousRevocationLedgerHeadDigest";
      },
      (requirement) => {
        requirement.revocationCasIdentityRule
          .correspondingValuesMustBeExactlyEqual = false;
      }
    ]) {
      assertDirectRejected((candidate) => {
        attack(candidate.typeSpecificRequirements[kind]);
      });
    }
  }

  for (const attack of [
    (requirement) => { delete requirement.revocationCasIdentityRule; },
    (requirement) => {
      requirement.revocationCasIdentityRule.atomicCommitNextField =
        "nextRevocationLedgerHeadDigest";
    },
    (requirement) => {
      requirement.requiredPayloadFields.push("targetReceiptId");
    },
    (requirement) => {
      requirement.operationNonceRule = "consume_atomically";
    }
  ]) {
    assertDirectRejected((candidate) => {
      attack(candidate.typeSpecificRequirements.transition_rejection_receipt);
    });
  }
});

test("acyclic manifest layers reject flat success sets, domain aliasing and self-output", () => {
  for (const attack of [
    (contract) => { contract.evaluationRequirements.manifestLayeringAcyclicRequired = false; },
    (contract) => { contract.evaluationRequirements.manifestLayerCount = 2; },
    (contract) => { contract.evaluationRequirements.manifestDigestDomainsMustBeDistinct = false; },
    (contract) => { contract.evaluationRequirements.outputReceiptMayBeIncludedInOwnInputManifest = true; },
    (contract) => {
      contract.receiptTypeRequirements.successFamiliesFormOneFlatManifest = true;
    },
    (contract) => {
      contract.receiptTypeRequirements
        .successFamilyCardinalitiesApplyWithinDeclaredManifestLayerOrTransitionOutput = false;
    },
    (contract) => {
      contract.evaluationRequirements.manifestLayers[1].digestDomain =
        contract.evaluationRequirements.manifestLayers[0].digestDomain;
    },
    (contract) => {
      contract.evaluationRequirements.manifestLayers[0].includedReceiptKinds.push(
        "admission_epoch_snapshot_receipt"
      );
    },
    (contract) => {
      contract.evaluationRequirements.manifestLayers[0]
        .excludedOutputReceiptKinds = [];
    },
    (contract) => {
      contract.evaluationRequirements.manifestLayers[1].includedComponentIds.push(
        "conditions_one_to_seven_evaluation_receipt_digest"
      );
    },
    (contract) => {
      contract.evaluationRequirements.manifestLayers[1]
        .excludedOutputReceiptKinds = [];
    },
    (contract) => {
      contract.evaluationRequirements.manifestLayers[2].includedComponentIds.push(
        "final_readiness_evaluation_receipt_digest"
      );
    },
    (contract) => {
      contract.evaluationRequirements.manifestLayers[2]
        .excludedOutputReceiptKinds = [];
    },
    (contract) => {
      contract.guardDefinitions.orderedGuards =
        contract.guardDefinitions.orderedGuards.filter(
          (guard) => guard.guardId !== "manifest_layer_exact_set_coverage"
        );
    },
    (contract) => {
      contract.guardDefinitions.orderedGuards =
        contract.guardDefinitions.orderedGuards.filter(
          (guard) => guard.guardId !== "acyclic_manifest_layering"
        );
    }
  ]) assertSelfResignedRejected(attack);
});

test("public non-person lifecycle attestation and lifecycle receipt partitions fail closed", () => {
  for (const attack of [
    (contract) => { contract.privacyBoundary.publicNonPersonLifecycleAttestationRequired = false; },
    (contract) => {
      contract.privacyBoundary
        .publicNonPersonLifecycleAttestationConsumableByAdmissionEvaluator = false;
    },
    (contract) => {
      contract.privacyBoundary.publicNonPersonLifecycleAttestationCurrentInstances = 1;
    },
    (contract) => {
      contract.privacyBoundary
        .publicNonPersonLifecycleAttestationMustBindPolicyRuntimeEvidenceFreshnessAndRevocationHead = false;
    },
    (contract) => {
      contract.privacyBoundary
        .publicNonPersonLifecycleAttestationMayContainPersonalDataOrPersonDerivedDigest = true;
    },
    (contract) => {
      contract.privacyBoundary
        .publicNonPersonLifecycleAttestationAloneEstablishesRuntimeNoLeakage = true;
    },
    (contract) => {
      contract.privacyBoundary.futurePrivateLifecycleReceiptConsumableByAdmissionEvaluator = true;
    },
    (contract) => {
      contract.zeroInstanceState.privateLifecyclePublicAttestationReceipts = 1;
    },
    (contract) => {
      contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields
        .private_lifecycle_public_non_person_attestation_receipt.pop();
    },
    (contract) => {
      contract.receiptTypeRequirements.families.pop();
    },
    (contract) => {
      contract.receiptTypeRequirements.families.push({
        receiptKind: "transition_rejection_receipt",
        minimumCount: 1,
        maximumCount: 1,
        issuerRoleId: "engineering_reproducibility_reviewer",
        coverage: "invalid_flat_success_inclusion"
      });
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .currentInstances.push({ receiptId: "fake-revocation" });
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .mayEnterSuccessExactSet = true;
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .receiptKinds.pop();
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .unrevokeAllowed = true;
    },
    (contract) => {
      contract.receiptTypeRequirements.nonSuccessLifecycleReceiptRequirements
        .deletionOrOverwriteOfTargetAllowed = true;
    },
    (contract) => {
      contract.receiptTypeRequirements.rejectionReceiptMayEnterSuccessExactSet = true;
    },
    (contract) => {
      contract.guardDefinitions.orderedGuards =
        contract.guardDefinitions.orderedGuards.filter(
          (guard) => guard.guardId !== "private_lifecycle_public_attestation_valid"
        );
    }
  ]) assertSelfResignedRejected(attack);
});

test("cross-packet generation epoch evaluation replay and ABA shortcuts are rejected", () => {
  for (const attack of [
    (contract) => { contract.frozenPacketRequirements.currentAdmissionCycleId = "cycle-a"; },
    (contract) => { contract.frozenPacketRequirements.currentPacketId = "packet-b"; },
    (contract) => { contract.frozenPacketRequirements.currentPacketDigest = "0".repeat(64); },
    (contract) => { contract.admissionEpochRequirements.identityPlanesMustRemainSeparate = false; },
    (contract) => { contract.admissionEpochRequirements.currentLedgerGenerationId = "generation-a"; },
    (contract) => { contract.admissionEpochRequirements.currentMutationEpoch = 1; },
    (contract) => { contract.admissionEpochRequirements.currentEvaluationSnapshotEpoch = 1; },
    (contract) => { contract.admissionEpochRequirements.mutationEpochAvailable = true; },
    (contract) => { contract.admissionEpochRequirements.crossFileAtomicSnapshot = true; },
    (contract) => { contract.admissionEpochRequirements.intervalMutationExcluded = true; },
    (contract) => { contract.admissionEpochRequirements.abaExcluded = true; },
    (contract) => { contract.admissionEpochRequirements.successfulMutationAdvancesEpochByExactlyOne = false; },
    (contract) => { contract.admissionEpochRequirements.sameStateDigestAfterAbaStillRequiresDifferentEpochAndChainHead = false; },
    (contract) => { contract.admissionEpochRequirements.restoreAndRollbackAreForwardMutations = false; },
    (contract) => { contract.admissionEpochRequirements.allEvidenceMustHaveSameIssuanceMutationEpoch = true; },
    (contract) => { contract.admissionEpochRequirements.allEvidenceMustBeReverifiedAtSameEvaluationSnapshotEpoch = false; },
    (contract) => { contract.transitionRequirements.invalidatedStateMayReturnInPlace = true; },
    (contract) => { contract.transitionRequirements.recoveryRequiresNewCyclePacketEpochAndEvaluation = false; },
    (contract) => {
      contract.guardDefinitions.orderedGuards = contract.guardDefinitions.orderedGuards.filter(
        (guard) => guard.guardId !== "replay_idempotency_restore_and_fork_safe"
      );
    },
    (contract) => {
      contract.guardDefinitions.orderedGuards.find(
        (guard) => guard.guardId === "epoch_atomicity_interval_and_aba_receipt_valid"
      ).currentSatisfied = true;
    }
  ]) assertSelfResignedRejected(attack);
});

test("role overlap self-verification majority averaging and model winner attacks are rejected", () => {
  for (const attack of [
    (contract) => { contract.actorRoleRequirements.signerMayVerifyOwnEligibility = true; },
    (contract) => { contract.actorRoleRequirements.generativeModelMayOccupyAnyRoleOrSeat = true; },
    (contract) => {
      contract.actorRoleRequirements.seatInstances.push({
        seatId: "overlap-a",
        actorBindingId: "same-actor",
        roleIds: ["source_rights_reviewer", "independent_legal_authority"]
      });
    },
    (contract) => {
      contract.actorRoleRequirements.roles.find(
        (role) => role.roleId === "independent_legal_authority"
      ).currentSeatCount = 1;
    },
    (contract) => {
      contract.actorRoleRequirements.roles.find(
        (role) => role.roleId === "independent_legal_authority"
      ).minimumSeatCount = 1;
    },
    (contract) => { contract.evaluationRequirements.majorityVoteAllowed = true; },
    (contract) => { contract.evaluationRequirements.opinionAveragingAllowed = true; },
    (contract) => { contract.evaluationRequirements.generativeModelWinnerSelectionAllowed = true; },
    (contract) => { contract.evaluationRequirements.unresolvedDisagreementDisposition = "winner"; },
    (contract) => {
      contract.receiptTypeRequirements.typeSpecificRequiredPayloadFields
        .domain_disagreement_inventory_receipt = ["winnerSelected"];
    }
  ]) assertSelfResignedRejected(attack);
});

test("PII, person-derived digests, anonymous claims and weakened exact-schema guards are rejected", () => {
  for (const attack of [
    (contract) => { contract.privacyBoundary.exactSchemaRequired = false; },
    (contract) => { contract.privacyBoundary.governanceDigestAllowlistRequired = false; },
    (contract) => { contract.privacyBoundary.booleanPrivacySelfDeclarationSufficient = true; },
    (contract) => { contract.privacyBoundary.keyBlacklistAloneSufficient = true; },
    (contract) => { contract.privacyBoundary.candidateInstanceCount = 1; },
    (contract) => { contract.privacyBoundary.personalDataFieldCount = 1; },
    (contract) => { contract.privacyBoundary.personDerivedDigestCount = 1; },
    (contract) => { contract.privacyBoundary.candidateInstanceRefs.push("person-1"); },
    (contract) => { contract.privacyBoundary.personalDataRefs.push("birth-date"); },
    (contract) => { contract.privacyBoundary.freeTextFieldsPresent = true; },
    (contract) => { contract.privacyBoundary.prohibitedPersonalFieldClasses.pop(); },
    (contract) => { contract.privacyBoundary.prohibitedStableDerivedIdentifiers.pop(); },
    (contract) => { contract.privacyBoundary.publicProjectionMayClaimAnonymous = true; },
    (contract) => { contract.receiptEnvelopeRequirements.receiptIdMayDeriveFromPersonalData = true; },
    (contract) => {
      contract.receiptEnvelopeRequirements
        .rawIdentityOpinionSourceBodyOrLegalTextMayBeCopiedIntoPublicEnvelope = true;
    },
    (contract) => {
      contract.guardDefinitions.orderedGuards = contract.guardDefinitions.orderedGuards.filter(
        (guard) => guard.guardId !== "no_person_input_instance_in_governance_packet"
      );
    }
  ]) assertSelfResignedRejected(attack);
  assertSelfResignedRejected(
    (contract) => { contract.person = { birthDate: "2000-01-01" }; },
    "CONTRACT_OBJECT_MISMATCH"
  );
});

test("legal, target-schema, supersession and upstream binding invention is rejected", () => {
  for (const attack of [
    (contract) => { contract.receiptTypeRequirements.legalDispositionReceiptStructurallyVerified = true; },
    (contract) => { contract.receiptTypeRequirements.rightsLegalConclusionRecorded = true; },
    (contract) => { contract.systemIdentity.targetSchema = 13; },
    (contract) => { contract.systemIdentity.releaseIdentity = "legacy-v13"; },
    (contract) => { contract.systemIdentity.crossSystemAuthorityInheritanceAllowed = true; },
    (contract) => { contract.supersessionRequirements.supersedesReadinessCandidate = true; },
    (contract) => { contract.supersessionRequirements.candidateIsFormalParent = true; },
    (contract) => { contract.supersessionRequirements.formalParentUpdated = true; },
    (contract) => { contract.supersessionRequirements.centralRegistryUpdated = true; },
    (contract) => { contract.upstreamBindings.readinessCandidate.bytes += 1; },
    (contract) => { contract.upstreamBindings.readinessCandidate.sha256 = "0".repeat(64); },
    (contract) => { contract.upstreamBindings.storageDesignCandidate.semanticDigest = "0".repeat(64); },
    (contract) => { contract.upstreamBindings.upstreamsBacklinkThisContract = true; }
  ]) assertSelfResignedRejected(attack);
});

test("digest drift plus missing extra duplicate and hostile object material fail closed", () => {
  const unsigned = clone(persisted);
  unsigned.status = `${unsigned.status}-tampered`;
  assert.throws(
    () => verifyVedicInputAdmissionTransitionAndReceiptRequirementsObject(unsigned),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "CONTRACT_DIGEST_MISMATCH"
  );
  assertSelfResignedRejected((contract) => { delete contract.status; }, "CONTRACT_OBJECT_MISMATCH");
  assertSelfResignedRejected((contract) => { contract.unexpected = true; }, "CONTRACT_OBJECT_MISMATCH");

  let accessorCalls = 0;
  const accessor = clone(persisted);
  Object.defineProperty(accessor, "status", {
    enumerable: true,
    configurable: true,
    get() {
      accessorCalls += 1;
      return persisted.status;
    }
  });
  const customPrototype = clone(persisted);
  Object.setPrototypeOf(customPrototype, Object.create(null));
  const cycle = clone(persisted);
  cycle.stateModel.cycle = cycle;
  const nestedProxy = clone(persisted);
  nestedProxy.privacyBoundary = new Proxy(nestedProxy.privacyBoundary, {});
  const revoked = Proxy.revocable(clone(persisted), {});
  revoked.revoke();
  for (const value of [
    new Proxy(clone(persisted), {}),
    accessor,
    customPrototype,
    cycle,
    nestedProxy,
    revoked.proxy
  ]) {
    assert.throws(
      () => verifyVedicInputAdmissionTransitionAndReceiptRequirementsObject(value),
      (error) =>
        error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
        && ["CONTRACT_OBJECT_MISMATCH", "NON_CANONICAL_JSON"].includes(error.code)
    );
  }
  assert.equal(accessorCalls, 0);
});

test("fixed reader rejects noncanonical and raw-order-drifted contract materialization", async (t) => {
  const noncanonicalRoot = await createContractOnlyFixture(
    t,
    "hakimi-vedic-transition-noncanonical-"
  );
  await writeFile(
    fixtureContractPath(noncanonicalRoot),
    testOnly.canonicalStringify(persisted),
    "utf8"
  );
  await assert.rejects(
    () => readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(
      noncanonicalRoot
    ),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "CONTRACT_MATERIALIZATION_MISMATCH"
  );

  const rawOrderRoot = await createContractOnlyFixture(
    t,
    "hakimi-vedic-transition-raw-order-"
  );
  const reordered = Object.fromEntries(Object.entries(persisted).reverse());
  assert.equal(
    computeVedicInputAdmissionTransitionAndReceiptRequirementsDigest(reordered),
    persisted.contractDigest
  );
  await writeFile(
    fixtureContractPath(rawOrderRoot),
    canonicalPrettyStringifyVedicInputAdmissionTransitionAndReceiptRequirements(
      reordered
    ),
    "utf8"
  );
  await assert.rejects(
    () => readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(
      rawOrderRoot
    ),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "PERSISTED_RAW_IDENTITY_DRIFT"
  );
});

test("fixed endpoint rejects missing, empty, oversize, hardlink and symlink material", async (t) => {
  const missingRoot = await createContractOnlyFixture(
    t,
    "hakimi-vedic-transition-missing-"
  );
  await unlink(fixtureContractPath(missingRoot));
  await assert.rejects(
    () => readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(
      missingRoot
    ),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "CONTRACT_MISSING"
  );

  const emptyRoot = await createContractOnlyFixture(
    t,
    "hakimi-vedic-transition-empty-"
  );
  await writeFile(fixtureContractPath(emptyRoot), Buffer.alloc(0));
  await assert.rejects(
    () => readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(emptyRoot),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "CONTRACT_ENDPOINT_INVALID"
  );

  const oversizeRoot = await createContractOnlyFixture(
    t,
    "hakimi-vedic-transition-oversize-"
  );
  await writeFile(
    fixtureContractPath(oversizeRoot),
    Buffer.alloc(testOnly.MAX_CONTRACT_BYTES + 1, 0x20)
  );
  await assert.rejects(
    () => readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(
      oversizeRoot
    ),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "CONTRACT_ENDPOINT_INVALID"
  );

  const hardlinkRoot = await createContractOnlyFixture(
    t,
    "hakimi-vedic-transition-hardlink-"
  );
  const hardlinkContract = fixtureContractPath(hardlinkRoot);
  const hardlinkSibling = `${hardlinkContract}.sibling`;
  await copyFile(hardlinkContract, hardlinkSibling);
  await unlink(hardlinkContract);
  await link(hardlinkSibling, hardlinkContract);
  await assert.rejects(
    () => readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(
      hardlinkRoot
    ),
    (error) =>
      error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
      && error.code === "CONTRACT_ENDPOINT_INVALID"
  );

  const symlinkRoot = await createContractOnlyFixture(
    t,
    "hakimi-vedic-transition-symlink-"
  );
  const symlinkContract = fixtureContractPath(symlinkRoot);
  const symlinkSibling = `${symlinkContract}.sibling`;
  await copyFile(symlinkContract, symlinkSibling);
  await unlink(symlinkContract);
  try {
    await symlink(path.basename(symlinkSibling), symlinkContract, "file");
    await assert.rejects(
      () => readCurrentVedicInputAdmissionTransitionAndReceiptRequirements(
        symlinkRoot
      ),
      (error) =>
        error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
        && error.code === "CONTRACT_ENDPOINT_INVALID"
    );
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.diagnostic(`symlink creation unavailable on this host: ${error.code}`);
    } else {
      throw error;
    }
  }
});

test("safe path boundary rejects traversal, absolute, backslash and NUL paths", async () => {
  for (const unsafe of [
    "../outside.json",
    "/absolute.json",
    "content//contract.json",
    "content/../contract.json",
    "C:/outside.json",
    "content\\contract.json",
    "content/contract.json\0tail"
  ]) {
    await assert.rejects(
      () => testOnly.readStableWorkspaceFile(
        workspaceRoot,
        unsafe,
        testOnly.MAX_CONTRACT_BYTES,
        {
          invalidCode: "ARTIFACT_ENDPOINT_INVALID",
          missingCode: "ARTIFACT_MISSING",
          label: "unsafe-contract-test"
        }
      ),
      (error) =>
        error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
        && error.code === "UNSAFE_ARTIFACT_PATH"
    );
  }
});

test("held-handle reader rejects truncate, growth and same-path replacement", async (t) => {
  const prefix = "hakimi-vedic-transition-held-read-";
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    const resolved = path.resolve(fixtureRoot);
    assert.equal(path.basename(resolved).startsWith(prefix), true);
    await rm(resolved, { recursive: true, force: true });
  });
  const relativePath = "artifact.bin";
  const absolutePath = path.join(fixtureRoot, relativePath);
  const original = Buffer.from("held-handle-original", "utf8");

  async function assertMutationRejected(mutate) {
    await writeFile(absolutePath, original);
    const phases = [];
    await assert.rejects(
      () => testOnly.readStableWorkspaceFile(
        fixtureRoot,
        relativePath,
        testOnly.MAX_CONTRACT_BYTES,
        {
          invalidCode: "ARTIFACT_ENDPOINT_INVALID",
          missingCode: "ARTIFACT_MISSING",
          label: "held-read-test-artifact",
          testOnlyReadPhaseHook: async (phase) => {
            phases.push(phase);
            if (phase === "before-read") await mutate();
          }
        }
      ),
      (error) =>
        error instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError
        && error.code === "ARTIFACT_ENDPOINT_INVALID"
    );
    assert.deepEqual(phases, ["after-open", "before-read"]);
  }

  await assertMutationRejected(() => truncate(absolutePath, 1));
  await assertMutationRejected(() => appendFile(absolutePath, "-growth", "utf8"));

  await writeFile(absolutePath, original);
  const replacementPath = path.join(fixtureRoot, "opened-original.bin");
  const replacementPhases = [];
  let replacementError;
  try {
    await testOnly.readStableWorkspaceFile(
      fixtureRoot,
      relativePath,
      testOnly.MAX_CONTRACT_BYTES,
      {
        invalidCode: "ARTIFACT_ENDPOINT_INVALID",
        missingCode: "ARTIFACT_MISSING",
        label: "held-read-replacement-artifact",
        testOnlyReadPhaseHook: async (phase) => {
          replacementPhases.push(phase);
          if (phase === "before-read") {
            await rename(absolutePath, replacementPath);
            await writeFile(
              absolutePath,
              Buffer.from("replacement-endpoint", "utf8")
            );
          }
        }
      }
    );
  } catch (error) {
    replacementError = error;
  }
  if (replacementError?.code === "TEST_ONLY_READ_HOOK_FAILED"
    && ["EPERM", "EACCES", "EBUSY", "ENOTSUP"].includes(
      replacementError.cause?.code
    )) {
    t.diagnostic(
      `open-file replacement unavailable on this host: ${replacementError.cause.code}`
    );
    return;
  }
  assert.equal(
    replacementError instanceof VedicInputAdmissionTransitionAndReceiptRequirementsError,
    true
  );
  assert.equal(replacementError.code, "ARTIFACT_ENDPOINT_INVALID");
  assert.deepEqual(replacementPhases, ["after-open", "before-read", "after-read"]);
});

test("CLI succeeds only as a zero-instance requirements observation and proves no runtime or authority", async () => {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [cliAbsolutePath],
    {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      windowsHide: true
    }
  );
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(
    output.requirementsOnlyContractMechanicallyObservedUnderUnverifiedRuntime,
    true
  );
  assert.equal(output.endpointSetObservationBrandVerified, true);
  assert.equal(output.visibleNodeLaunchStateCleanObserved, true);
  assert.equal(output.requirementIdsRequired, 13);
  assert.equal(output.invariantIdsRequired, 26);
  assert.equal(output.conditionsRequired, 8);
  assert.equal(output.receiptInstances, 0);
  assert.equal(output.transitionInstances, 0);
  assert.equal(output.admissionCycleInstances, 0);
  assert.equal(output.ledgerGenerationInstances, 0);
  assert.equal(output.evaluationSnapshotInstances, 0);
  assert.equal(output.positiveTransitionEvaluatorImplemented, false);
  assert.equal(output.mutationEpochAvailable, false);
  assert.equal(output.intervalMutationExcluded, false);
  assert.equal(output.abaExcluded, false);
  assert.equal(output.crossFileAtomicSnapshot, false);
  assert.equal(output.parentAndChildrenAtomicSnapshot, false);
  assert.equal(output.simultaneousCurrentRawClosureVerified, false);
  assert.equal(output.erasedPreloadExcluded, false);
  assert.equal(output.loadedModuleByteIdentityVerified, false);
  assert.equal(output.nodeLoaderIntegrityVerified, false);
  assert.equal(output.runtimeLauncherIdentityVerified, false);
  assert.equal(output.runtimeIntrinsicIntegrityVerified, false);
  assert.equal(output.inputContractGateSatisfied, false);
  assert.equal(output.legalConclusionAuthorized, false);
  assert.equal(output.formalProjectionAuthorized, false);
  assert.equal(output.formalAdmissionAuthorized, false);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicDeploymentAuthorized, false);
  assert.equal(output.publicReleaseAuthorized, false);
  assert.equal(output.expertClaimsAuthorized, false);
  assert.equal(output.activeAdmissionEffect, "none");
});

test("CLI rejects operands, NODE_PATH, NODE_OPTIONS and execArgv without echoing sensitive values", async () => {
  const operandSecret = "birth-2000-01-01T01:02:03Z";
  const operand = await captureCliFailure([cliAbsolutePath, operandSecret]);
  assert.equal(operand.error.code, 2);
  assert.equal(operand.failure.code, "CLI_ARGUMENTS_FORBIDDEN");
  assert.equal(
    operand.failure.requirementsOnlyContractMechanicallyObservedUnderUnverifiedRuntime,
    false
  );
  assert.equal(operand.failure.endpointSetObservationBrandVerified, false);
  assert.equal(operand.failure.visibleNodeLaunchStateCleanObserved, false);
  assert.equal(operand.failure.formalAdmissionAuthorized, false);
  assert.equal(operand.failure.publicReleaseAuthorized, false);
  assert.equal(operand.error.stderr.includes(operandSecret), false);

  for (const [name, value] of [
    ["NODE_PATH", "C:\\private-birth-fixture"],
    ["NODE_OPTIONS", "--no-warnings"]
  ]) {
    const failure = await captureCliFailure([cliAbsolutePath], {
      env: { [name]: value }
    });
    assert.equal(failure.error.code, 2);
    assert.equal(failure.failure.code, "NODE_LAUNCH_STATE_FORBIDDEN");
    assert.equal(failure.failure.endpointSetObservationBrandVerified, false);
    assert.equal(failure.failure.visibleNodeLaunchStateCleanObserved, false);
    assert.equal(failure.failure.releaseReady, false);
    assert.equal(failure.failure.publicDeploymentAuthorized, false);
    assert.equal(failure.error.stderr.includes(value), false);
  }

  const execArgv = await captureCliFailure(["--no-warnings", cliAbsolutePath]);
  assert.equal(execArgv.error.code, 2);
  assert.equal(execArgv.failure.code, "NODE_LAUNCH_STATE_FORBIDDEN");
  assert.equal(execArgv.failure.visibleNodeLaunchStateCleanObserved, false);
  assert.equal(execArgv.failure.erasedPreloadExcluded, false);
});
