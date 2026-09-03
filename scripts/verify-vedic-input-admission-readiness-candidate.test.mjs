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
  VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH,
  VedicInputAdmissionReadinessCandidateError,
  canonicalPrettyStringifyVedicInputAdmissionReadinessCandidate,
  canonicalStringifyVedicInputAdmissionReadinessCandidate,
  computeVedicInputAdmissionReadinessCandidateDigest,
  isVerifiedVedicInputAdmissionReadinessCandidate,
  loadVedicInputAdmissionReadinessCandidate,
  parseVedicInputAdmissionReadinessCandidateJsonBytes,
  readCurrentVedicInputAdmissionReadinessCandidate,
  vedicInputAdmissionReadinessCandidateTestOnly as testOnly,
  verifyVedicInputAdmissionReadinessCandidateObject
} from "./vedic-input-admission-readiness-candidate-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const candidateAbsolutePath = path.resolve(
  workspaceRoot,
  ...VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH.split("/")
);
const cliAbsolutePath = path.join(
  scriptsDirectory,
  "verify-vedic-input-admission-readiness-candidate.mjs"
);
const restrictedRelativePath = "apps/web/src/lib/local-user-data-cleanup.ts";

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

const expectedSemanticInvariantIds = Object.freeze([
  ["civil_date_validity", "calendar_identity_version"],
  ["canonical_wall_time", "precision_vocabulary"],
  ["uncertainty_representation", "interval_ordering", "candidate_semantics"],
  ["coordinate_reference_system", "coordinate_precision_semantics", "location_privacy_boundary"],
  ["iana_zone_identity", "tzdb_version_identity", "coverage_update_policy"],
  ["dst_gap_overlap_classification", "dst_resolution_policy"],
  ["utc_conversion_consistency", "time_scale_identity"],
  ["ephemeris_identity_version_digest", "ephemeris_coverage"],
  ["sidereal_zodiac_identity_version"],
  ["ayanamsa_identity_version"],
  ["node_mode_definition_version"],
  ["bhava_definition_version"],
  ["perturbation_candidate_semantics", "transition_ordering", "perturbation_policy_identity"]
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

let persistedBytes;
let persisted;
let readCurrent;
let loaded;

before(async () => {
  persistedBytes = await readFile(candidateAbsolutePath);
  persisted = parseVedicInputAdmissionReadinessCandidateJsonBytes(persistedBytes);
  readCurrent = await readCurrentVedicInputAdmissionReadinessCandidate(workspaceRoot);
  loaded = await loadVedicInputAdmissionReadinessCandidate(workspaceRoot);
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

function resignCandidate(mutator) {
  const candidate = clone(persisted);
  mutator(candidate);
  candidate.candidateDigest = computeVedicInputAdmissionReadinessCandidateDigest(candidate);
  return candidate;
}

function assertSelfResignedRejected(mutator, expectedCode = "CANDIDATE_OBJECT_MISMATCH") {
  const candidate = resignCandidate(mutator);
  assert.equal(
    candidate.candidateDigest,
    computeVedicInputAdmissionReadinessCandidateDigest(candidate),
    "attack fixture must carry a valid self-computed digest"
  );
  assert.throws(
    () => verifyVedicInputAdmissionReadinessCandidateObject(candidate),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === expectedCode
  );
  assert.equal(isVerifiedVedicInputAdmissionReadinessCandidate(candidate), false);
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
  assert.equal(relativePath.split("/").some((segment) =>
    segment === "" || segment === "." || segment === ".."), false);
}

async function createWorkspaceFixture(t, prefix = "hakimi-vedic-input-readiness-") {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    const resolved = path.resolve(fixtureRoot);
    assert.equal(path.basename(resolved).startsWith(prefix), true);
    await rm(resolved, { recursive: true, force: true });
  });

  const pending = [
    VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH,
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

function fixtureCandidatePath(fixtureRoot) {
  return path.resolve(
    fixtureRoot,
    ...VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH.split("/")
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

test("fixed reader and private loader accept only the current zero-readiness candidate", async () => {
  assert.deepEqual(readCurrent, persisted);
  assert.equal(isVerifiedVedicInputAdmissionReadinessCandidate(loaded), true);
  assert.equal(isVerifiedVedicInputAdmissionReadinessCandidate(persisted), false);
  assert.equal(isVerifiedVedicInputAdmissionReadinessCandidate(clone(loaded)), false);
  assert.equal(isVerifiedVedicInputAdmissionReadinessCandidate({ ...loaded }), false);
  assert.equal(loaded.artifact.path, VEDIC_INPUT_ADMISSION_READINESS_CANDIDATE_RELATIVE_PATH);
  assert.equal(loaded.artifact.bytes, persistedBytes.byteLength);
  assert.equal(
    loaded.artifact.sha256,
    createHash("sha256").update(persistedBytes).digest("hex")
  );
  assert.equal(loaded.observationBoundary.heldFileHandleReads, true);
  assert.equal(loaded.observationBoundary.pathEndpointRevalidated, true);
  assert.equal(
    loaded.observationBoundary.upstreamEndpointsObservedInOneNonAtomicBatch,
    true
  );
  assert.equal(loaded.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(loaded.observationBoundary.simultaneousCurrentRawClosureVerified, false);
  assert.equal(loaded.observationBoundary.mutationEpochAvailable, false);
  assert.equal(loaded.observationBoundary.intervalMutationExcluded, false);
  assert.equal(loaded.observationBoundary.abaExcluded, false);
  assert.equal(loaded.observationBoundary.erasedPreloadExcluded, false);
  assert.equal(loaded.observationBoundary.loadedModuleByteIdentityVerified, false);
  assert.equal(loaded.observationBoundary.nodeLoaderIntegrityVerified, false);
  assert.equal(loaded.observationBoundary.runtimeLauncherIdentityVerified, false);
  assert.equal(loaded.observationBoundary.runtimeIntrinsicIntegrityVerified, false);
  assertDeepFrozen(readCurrent);
  assertDeepFrozen(loaded);
});

test("persisted candidate uses fixed identity, exact keys, slash domain and canonical LF", () => {
  assert.equal(persisted.schemaVersion, "vedic-input-admission-readiness-candidate/v0.1.0");
  assert.equal(persisted.recordType, "vedic-input-admission-readiness-candidate");
  assert.equal(persisted.candidateId, "vedic-input-admission-readiness-candidate-v0.1.0");
  assert.equal(testOnly.digestDomain, "hakimi/vedic-input-admission-readiness-candidate/v0.1.0");
  assert.deepEqual(
    Object.keys(persisted).sort(),
    [...testOnly.EXPECTED_TOP_LEVEL_KEYS].sort()
  );
  assert.equal(
    persisted.candidateDigest,
    computeVedicInputAdmissionReadinessCandidateDigest(persisted)
  );
  assert.equal(
    persistedBytes.toString("utf8"),
    canonicalPrettyStringifyVedicInputAdmissionReadinessCandidate(persisted)
  );
  assert.equal(persistedBytes.includes(Buffer.from("\r\n")), false);
  assert.equal(persistedBytes[persistedBytes.byteLength - 1], 0x0a);
  assert.equal(persistedBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
  assert.match(persisted.candidateDigest, /^[0-9a-f]{64}$/u);
});

test("strict bytes boundary rejects BOM, malformed UTF-8, escaped duplicates, invalid roots and real oversize", () => {
  for (const [bytes, code] of [
    [Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]), "JSON_BOM_FORBIDDEN"],
    [Buffer.from([0xc3, 0x28]), "JSON_UTF8_INVALID"],
    [Buffer.from([0xe2, 0x82]), "JSON_UTF8_INVALID"],
    [Buffer.from([0xc0, 0xaf]), "JSON_UTF8_INVALID"],
    [Buffer.from('{"a":1,"a":2}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.from('{"a":1,"\\u0061":2}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.from('{"outer":{"a":1,"\\u0061":2}}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.from('{"a/b":1,"a\\/b":2}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.from('{"😀":1,"\\ud83d\\ude00":2}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.alloc(0), "JSON_INVALID"],
    [Buffer.from("{", "utf8"), "JSON_INVALID"]
  ]) {
    assert.throws(
      () => parseVedicInputAdmissionReadinessCandidateJsonBytes(bytes),
      (error) => error instanceof VedicInputAdmissionReadinessCandidateError
        && error.code === code
    );
  }
  for (const json of ["[]", "null", "true", '"candidate"']) {
    assert.throws(
      () => parseVedicInputAdmissionReadinessCandidateJsonBytes(
        Buffer.from(json, "utf8")
      ),
      (error) => error instanceof VedicInputAdmissionReadinessCandidateError
        && error.code === "JSON_INVALID"
    );
  }
  assert.throws(
    () => parseVedicInputAdmissionReadinessCandidateJsonBytes(
      Buffer.alloc(testOnly.MAX_CANDIDATE_BYTES + 1, 0x20)
    ),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "JSON_TOO_LARGE"
  );

  const sensitiveCallerLabel = "birth-2000-01-01T01:02:03Z-private";
  assert.throws(
    () => parseVedicInputAdmissionReadinessCandidateJsonBytes(
      Buffer.from("{", "utf8"),
      sensitiveCallerLabel
    ),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "JSON_INVALID"
      && !error.message.includes(sensitiveCallerLabel)
  );
});

test("thirteen rows preserve exact order, mapping, semantic allowlists and all-red ledgers", () => {
  assert.deepEqual(testOnly.EXPECTED_REQUIREMENT_IDS, expectedRequirementIds);
  assert.equal(persisted.requirementRows.length, 13);
  assert.equal(new Set(persisted.requirementRows.map((row) => row.requirementId)).size, 13);
  let invariantCount = 0;
  persisted.requirementRows.forEach((row, index) => {
    const requirementId = expectedRequirementIds[index];
    assert.deepEqual(Object.keys(row).sort(), [
      "currentEvidenceCounts",
      "currentGateProjection",
      "currentState",
      "draftRequirementPointer",
      "order",
      "requirementClass",
      "requirementId",
      "requiredSemanticInvariantIds",
      "subjectId"
    ].sort());
    assert.equal(row.order, index + 1);
    assert.equal(row.requirementId, requirementId);
    assert.equal(row.subjectId, `vedic.input.${requirementId}`);
    assert.equal(
      row.draftRequirementPointer,
      `content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json#/properties/${requirementId}`
    );
    assert.equal(
      row.requirementClass,
      index < 6 ? "input_declaration" : "calculation_policy_declaration"
    );
    assert.equal(row.currentState, "draft_shape_defined_value_unselected_required_unbound");
    assert.deepEqual(row.requiredSemanticInvariantIds, expectedSemanticInvariantIds[index]);
    invariantCount += row.requiredSemanticInvariantIds.length;
    assert.deepEqual(Object.values(row.currentEvidenceCounts), [0, 0, 0, 0, 0]);
    assert.equal(Object.values(row.currentGateProjection).every((value) => value === false), true);
  });
  assert.equal(invariantCount, 26);
});

test("summary, necessary conjunctive readiness conditions, privacy/version and every authority remain 0/13 red", () => {
  assert.equal(
    persisted.status,
    "thirteen_requirement_conjunctive_readiness_conditions_defined_zero_resolved_zero_admission_effect"
  );
  assert.equal(persisted.gateSummary.requirementsDefined, 13);
  assert.equal(persisted.gateSummary.requirementsDraftCovered, 13);
  assert.equal(persisted.gateSummary.requirementsResolved, 0);
  assert.equal(persisted.gateSummary.requirementsSelected, 0);
  assert.equal(persisted.gateSummary.acceptedInputs, 0);
  assert.equal(persisted.gateSummary.productInputInstances, 0);
  assert.equal(persisted.gateSummary.productInputRejectionReceipts, 0);
  assert.equal(persisted.gateSummary.admissionGatesSatisfied, 0);
  assert.equal(persisted.gateSummary.admissionGatesRequired, 8);
  assert.equal(persisted.gateSummary.necessaryConditionsSatisfied, 0);
  assert.equal(persisted.gateSummary.necessaryConditionsRequired, 8);
  assert.equal(Object.values(persisted.authorityBoundary).every((value) => value === false), true);

  const machine = persisted.conjunctiveReadinessConditions;
  assert.equal(machine.readinessModelType, "conjunctive_fail_closed_necessary_conditions_only");
  assert.equal(machine.conditionsAreNecessaryNotSufficient, true);
  assert.equal(machine.allConditionsAloneConferEligibility, false);
  assert.equal(machine.allConditionsRequiredForFutureEligibility, true);
  assert.equal(machine.allRequirementsMustSatisfyAllRowPrerequisites, true);
  assert.equal(machine.allEvidenceMustBindSameFrozenPacket, true);
  assert.equal(machine.allEvidenceMustBindSameAdmissionEpoch, true);
  assert.equal(machine.conditionSkippingAllowed, false);
  assert.equal(machine.partialCompletionMaySetGateTrue, false);
  assert.equal(machine.automaticPromotionAllowed, false);
  assert.equal(machine.generativeModelMaySelectValuesOrWinners, false);
  assert.equal(machine.majorityVoteAllowed, false);
  assert.equal(machine.currentFrozenPacketDigest, null);
  assert.equal(machine.currentAdmissionEpochReceipt, null);
  assert.equal(machine.currentReadinessState, "requirements_only_not_admitted");
  assert.equal(machine.formalSystemAdmissionRequiresOtherProductizationGates, true);
  assert.equal(machine.positiveReceiptSchemasDefined, false);
  assert.equal(machine.positiveTransitionEvaluatorImplemented, false);
  assert.equal(machine.positiveTransitionReceiptsAccepted, 0);
  assert.equal(machine.futurePositiveTransitionsMechanicallyAccepted, false);
  assert.deepEqual(machine.conditions.map((condition) => condition.conditionId), expectedConditionIds);
  assert.deepEqual(machine.conditions.map((condition) => condition.order), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(machine.conditions.every((condition) =>
    condition.currentState === false
      && condition.requiredState === true
      && condition.satisfied === false), true);

  assert.deepEqual(persisted.privacyBoundary, {
    arbitraryCandidateInputAuthorized: false,
    candidateDigestIsAnonymous: false,
    candidateDigestSafeToPublish: false,
    candidateInstancesIncluded: 0,
    fixedProbeReceiptsSafeOnlyBecauseNoPersonData: true,
    personalDataProcessedByThisCandidate: false,
    stableDigestForArbitraryCandidateForbiddenByGovernance: true,
    stableDigestMechanicallyBlockedForArbitraryCandidate: false
  });
  assert.deepEqual(persisted.roleSeparationBoundary, {
    conditionFiveBlocked: true,
    conditionFiveBlockedReason:
      "independent_legal_authority_role_seat_eligibility_signing_and_authenticity_schemas_absent",
    conditionFiveId:
      "two_independent_source_rights_reviews_and_legal_authority_disposition_complete",
    domainExpertMaySignRightsLegalConclusion: false,
    independentLegalAuthority: {
      authenticitySchemaDefined: false,
      eligibilitySchemaDefined: false,
      roleDefinition: "absent",
      seatCount: 0,
      signingSchemaDefined: false
    },
    rightsLegalConclusionEstablished: false,
    sourceRightsReviewerMaySignRightsLegalConclusion: false
  });
  assert.deepEqual(persisted.versionBoundary, {
    candidateIsFormalParent: false,
    centralRegistryUpdated: false,
    formalParentUpdated: false,
    ownerAcceptanceVerified: false,
    ownerDecision: null,
    supersedesBaseline: false,
    supersessionReceipt: null
  });
  assert.equal(persisted.observationBoundary.mutationEpochAvailable, false);
  assert.equal(persisted.observationBoundary.mutationEpochReceipt, null);
  assert.equal(persisted.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(persisted.observationBoundary.intervalMutationExcluded, false);
  assert.equal(persisted.observationBoundary.abaExcluded, false);
  assert.equal(
    persisted.integrityBoundary.canonicalizationProfile,
    "sorted_object_keys_compact_json_finite_numbers_aliases_expanded_active_cycles_rejected_v1"
  );
  assert.equal(persisted.activeAdmissionEffect, "none");
});

test("a valid self-digest cannot authorize selected values or evidence ledgers", () => {
  const attacks = [
    (candidate) => { candidate.requirementRows[0].selectedValue = "gregorian"; },
    (candidate) => { candidate.requirementRows[0].currentState = "selected"; },
    (candidate) => { candidate.requirementRows[0].currentEvidenceCounts.ownerDecisionRefs = 1; },
    (candidate) => { candidate.requirementRows[0].currentGateProjection.ownerSelectionAccepted = true; },
    (candidate) => { candidate.requirementRows[0].currentEvidenceCounts.sourceBindingRefs = 1; },
    (candidate) => { candidate.requirementRows[0].currentGateProjection.sourceBindingFrozenVerified = true; },
    (candidate) => { candidate.requirementRows[0].currentEvidenceCounts.rightsEvidenceRefs = 1; },
    (candidate) => { candidate.requirementRows[0].currentGateProjection.rightsClosureComplete = true; },
    (candidate) => { candidate.requirementRows[0].currentEvidenceCounts.expertOpinionRefs = 1; },
    (candidate) => { candidate.requirementRows[0].currentGateProjection.expertReviewComplete = true; }
  ];
  for (const attack of attacks) assertSelfResignedRejected(attack);
});

test("a valid self-digest cannot invent general, semantic, epoch, ABA or skip receipts", () => {
  const attacks = [
    (candidate) => { candidate.engineeringPrerequisites.nodeFixedProbeChild.structuralValidatorComplete = true; },
    (candidate) => { candidate.engineeringPrerequisites.generalStructuralValidatorComplete = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.conditions[5].currentState = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.conditions[5].satisfied = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.allEvidenceMustBindSameFrozenPacket = false; },
    (candidate) => { candidate.conjunctiveReadinessConditions.allEvidenceMustBindSameAdmissionEpoch = false; },
    (candidate) => { candidate.conjunctiveReadinessConditions.conditionSkippingAllowed = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.conditionsAreNecessaryNotSufficient = false; },
    (candidate) => { candidate.conjunctiveReadinessConditions.allConditionsAloneConferEligibility = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.positiveReceiptSchemasDefined = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.positiveTransitionEvaluatorImplemented = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.positiveTransitionReceiptsAccepted = 1; },
    (candidate) => { candidate.conjunctiveReadinessConditions.futurePositiveTransitionsMechanicallyAccepted = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.currentFrozenPacketDigest = "0".repeat(64); },
    (candidate) => { candidate.conjunctiveReadinessConditions.currentAdmissionEpochReceipt = "epoch-1"; },
    (candidate) => { candidate.observationBoundary.mutationEpochAvailable = true; },
    (candidate) => { candidate.observationBoundary.mutationEpochReceipt = "epoch-1"; },
    (candidate) => { candidate.observationBoundary.crossFileAtomicSnapshot = true; },
    (candidate) => { candidate.observationBoundary.intervalMutationExcluded = true; },
    (candidate) => { candidate.observationBoundary.abaExcluded = true; },
    (candidate) => { candidate.requirementRows[0].currentGateProjection.mutationEpochProtected = true; }
  ];
  for (const attack of attacks) assertSelfResignedRejected(attack);
});

test("a valid self-digest cannot claim owner, supersession, registry, release or public authority", () => {
  const attacks = [
    (candidate) => { candidate.versionBoundary.ownerAcceptanceVerified = true; },
    (candidate) => { candidate.versionBoundary.ownerDecision = "accepted"; },
    (candidate) => { candidate.versionBoundary.supersedesBaseline = true; },
    (candidate) => { candidate.versionBoundary.supersessionReceipt = "receipt"; },
    (candidate) => { candidate.versionBoundary.candidateIsFormalParent = true; },
    (candidate) => { candidate.versionBoundary.formalParentUpdated = true; },
    (candidate) => { candidate.versionBoundary.centralRegistryUpdated = true; },
    (candidate) => { candidate.productBoundary.parentLedgerUpdated = true; },
    (candidate) => { candidate.productBoundary.registryUpdated = true; },
    (candidate) => { candidate.productBoundary.centralRegistryIntegration = "present"; },
    (candidate) => { candidate.roleSeparationBoundary.conditionFiveBlocked = false; },
    (candidate) => { candidate.roleSeparationBoundary.independentLegalAuthority.roleDefinition = "legal_authority"; },
    (candidate) => { candidate.roleSeparationBoundary.independentLegalAuthority.seatCount = 1; },
    (candidate) => { candidate.roleSeparationBoundary.independentLegalAuthority.eligibilitySchemaDefined = true; },
    (candidate) => { candidate.roleSeparationBoundary.independentLegalAuthority.signingSchemaDefined = true; },
    (candidate) => { candidate.roleSeparationBoundary.independentLegalAuthority.authenticitySchemaDefined = true; },
    (candidate) => { candidate.roleSeparationBoundary.domainExpertMaySignRightsLegalConclusion = true; },
    (candidate) => { candidate.roleSeparationBoundary.sourceRightsReviewerMaySignRightsLegalConclusion = true; },
    (candidate) => { candidate.roleSeparationBoundary.rightsLegalConclusionEstablished = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.formalSystemAdmissionConferred = true; },
    (candidate) => { candidate.conjunctiveReadinessConditions.publicReleaseAuthorizationConferred = true; },
    (candidate) => { candidate.authorityBoundary.formalAdmissionAuthorized = true; },
    (candidate) => { candidate.authorityBoundary.inputContractGateSatisfied = true; },
    (candidate) => { candidate.authorityBoundary.releaseReady = true; },
    (candidate) => { candidate.authorityBoundary.releaseEvidenceComplete = true; },
    (candidate) => { candidate.authorityBoundary.publicDeploymentAuthorized = true; },
    (candidate) => { candidate.authorityBoundary.publicReleaseAuthorized = true; },
    (candidate) => { candidate.authorityBoundary.expertClaimsAuthorized = true; },
    (candidate) => { candidate.activeAdmissionEffect = "formal"; }
  ];
  for (const attack of attacks) assertSelfResignedRejected(attack);
});

test("a valid self-digest cannot turn fixed no-person probes into arbitrary or anonymous input", () => {
  assert.equal(
    persisted.doesNotEstablish.includes("admitted_vedic_input_contract_or_product_input_instance"),
    true
  );
  assert.equal(
    persisted.doesNotEstablish.includes("complete_structural_validator_or_semantic_validator"),
    true
  );
  assert.equal(persisted.engineeringPrerequisites.nodeFixedProbeChild.acceptedInputs, 0);
  assert.equal(persisted.engineeringPrerequisites.nodeFixedProbeChild.inputInstances, 0);
  assert.equal(persisted.engineeringPrerequisites.nodeFixedProbeChild.structuralValidatorComplete, false);
  for (const attack of [
    (candidate) => { candidate.privacyBoundary.arbitraryCandidateInputAuthorized = true; },
    (candidate) => { candidate.privacyBoundary.candidateDigestIsAnonymous = true; },
    (candidate) => { candidate.privacyBoundary.candidateDigestSafeToPublish = true; },
    (candidate) => { candidate.privacyBoundary.candidateInstancesIncluded = 1; },
    (candidate) => { candidate.privacyBoundary.personalDataProcessedByThisCandidate = true; },
    (candidate) => { candidate.privacyBoundary.stableDigestForArbitraryCandidateForbiddenByGovernance = false; },
    (candidate) => { candidate.privacyBoundary.stableDigestMechanicallyBlockedForArbitraryCandidate = true; },
    (candidate) => { candidate.engineeringPrerequisites.nodeFixedProbeChild.acceptedInputs = 1; },
    (candidate) => { candidate.engineeringPrerequisites.nodeFixedProbeChild.inputInstances = 1; },
    (candidate) => { candidate.arbitraryCandidate = { birthDate: "2000-01-01" }; }
  ]) assertSelfResignedRejected(attack);
});

test("digest drift plus missing, extra and duplicate material fail closed", () => {
  const unsigned = clone(persisted);
  unsigned.status = `${unsigned.status}-tampered`;
  assert.throws(
    () => verifyVedicInputAdmissionReadinessCandidateObject(unsigned),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "CANDIDATE_DIGEST_MISMATCH"
  );
  assertSelfResignedRejected((candidate) => { delete candidate.status; });
  assertSelfResignedRejected((candidate) => { candidate.unexpected = true; });
  assertSelfResignedRejected((candidate) => { delete candidate.requirementRows[0].subjectId; });
  assertSelfResignedRejected((candidate) => { candidate.requirementRows[0].unexpected = true; });
  assertSelfResignedRejected((candidate) => {
    candidate.requirementRows.push(clone(candidate.requirementRows[0]));
  });
  assertSelfResignedRejected((candidate) => {
    candidate.requirementRows[1] = clone(candidate.requirementRows[0]);
  });
});

test("object API normalizes hostile graphs and expands passive sibling aliases", () => {
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
  cycle.requirementRows[0].cycle = cycle;

  const nestedProxy = clone(persisted);
  nestedProxy.privacyBoundary = new Proxy(nestedProxy.privacyBoundary, {});

  const revoked = Proxy.revocable(clone(persisted), {});
  revoked.revoke();

  for (const value of [
    new Proxy(clone(persisted), {}),
    nestedProxy,
    accessor,
    customPrototype,
    cycle,
    revoked.proxy
  ]) {
    assert.throws(
      () => verifyVedicInputAdmissionReadinessCandidateObject(value),
      (error) => error instanceof VedicInputAdmissionReadinessCandidateError
        && error.code === "CANDIDATE_OBJECT_MISMATCH"
    );
  }
  assert.equal(accessorCalls, 0, "passive validation must not invoke getters");

  const aliased = clone(persisted);
  aliased.requirementRows[1].currentGateProjection =
    aliased.requirementRows[0].currentGateProjection;
  assert.equal(
    computeVedicInputAdmissionReadinessCandidateDigest(aliased),
    persisted.candidateDigest
  );
  const expanded = verifyVedicInputAdmissionReadinessCandidateObject(aliased);
  assert.deepEqual(expanded, persisted);
  assert.notEqual(
    expanded.requirementRows[0].currentGateProjection,
    expanded.requirementRows[1].currentGateProjection,
    "accepted sibling aliases must be expanded into independent passive values"
  );
  assert.equal(
    testOnly.canonicalizationProfile,
    "sorted_object_keys_compact_json_finite_numbers_aliases_expanded_active_cycles_rejected_v1"
  );
});

test("fixed reader rejects noncanonical materialization and current upstream hash drift", async (t) => {
  const noncanonicalRoot = await createWorkspaceFixture(t, "hakimi-vedic-input-noncanonical-");
  await writeFile(
    fixtureCandidatePath(noncanonicalRoot),
    canonicalStringifyVedicInputAdmissionReadinessCandidate(persisted),
    "utf8"
  );
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(noncanonicalRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "CANDIDATE_MATERIALIZATION_MISMATCH"
  );

  const rawOrderDriftRoot = await createWorkspaceFixture(
    t,
    "hakimi-vedic-input-raw-order-drift-"
  );
  const reordered = Object.fromEntries(Object.entries(persisted).reverse());
  assert.equal(
    computeVedicInputAdmissionReadinessCandidateDigest(reordered),
    persisted.candidateDigest,
    "top-level raw key order must not change the semantic digest"
  );
  await writeFile(
    fixtureCandidatePath(rawOrderDriftRoot),
    canonicalPrettyStringifyVedicInputAdmissionReadinessCandidate(reordered),
    "utf8"
  );
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(rawOrderDriftRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "PERSISTED_RAW_IDENTITY_DRIFT"
  );

  const driftRoot = await createWorkspaceFixture(t, "hakimi-vedic-input-upstream-drift-");
  const upstreamRelativePath =
    persisted.upstreamBindings.browserWorkerEngineeringClosure.sourceEndpoints[0].path;
  await appendFile(
    path.resolve(driftRoot, ...upstreamRelativePath.split("/")),
    "\nupstream-drift",
    "utf8"
  );
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(driftRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "UPSTREAM_RAW_IDENTITY_MISMATCH"
  );
});

test("ordinary endpoint and safe-path boundary reject hardlinks, symlinks and escapes", async (t) => {
  for (const unsafe of [
    "../outside.json",
    "/absolute.json",
    "content//candidate.json",
    "content/../candidate.json",
    "C:/outside.json",
    "content\\candidate.json",
    "content/candidate.json\0tail"
  ]) {
    assert.throws(
      () => testOnly.safeWorkspaceFile(workspaceRoot, unsafe),
      (error) => error instanceof VedicInputAdmissionReadinessCandidateError
        && error.code === "UNSAFE_ARTIFACT_PATH"
    );
  }

  const hardlinkRoot = await createWorkspaceFixture(t, "hakimi-vedic-input-hardlink-");
  const hardlinkCandidate = fixtureCandidatePath(hardlinkRoot);
  const hardlinkSibling = `${hardlinkCandidate}.sibling`;
  await copyFile(hardlinkCandidate, hardlinkSibling);
  await unlink(hardlinkCandidate);
  await link(hardlinkSibling, hardlinkCandidate);
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(hardlinkRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "CANDIDATE_ENDPOINT_INVALID"
  );

  const symlinkRoot = await createWorkspaceFixture(t, "hakimi-vedic-input-symlink-");
  const symlinkCandidate = fixtureCandidatePath(symlinkRoot);
  const symlinkSibling = `${symlinkCandidate}.sibling`;
  await copyFile(symlinkCandidate, symlinkSibling);
  await unlink(symlinkCandidate);
  try {
    await symlink(path.basename(symlinkSibling), symlinkCandidate, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.diagnostic(`symlink creation unavailable on this host: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(symlinkRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "CANDIDATE_ENDPOINT_INVALID"
  );
});

test("candidate and upstream endpoints reject missing, linked, empty and oversize material", async (t) => {
  const upstreamRelativePath =
    persisted.upstreamBindings.browserWorkerEngineeringClosure.sourceEndpoints[0].path;
  const fixtureUpstreamPath = (root) =>
    path.resolve(root, ...upstreamRelativePath.split("/"));

  const candidateMissingRoot = await createWorkspaceFixture(
    t,
    "hakimi-vedic-input-candidate-missing-"
  );
  await unlink(fixtureCandidatePath(candidateMissingRoot));
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(candidateMissingRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "CANDIDATE_MISSING"
  );

  const upstreamMissingRoot = await createWorkspaceFixture(
    t,
    "hakimi-vedic-input-upstream-missing-"
  );
  await unlink(fixtureUpstreamPath(upstreamMissingRoot));
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(upstreamMissingRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "UPSTREAM_MISSING"
  );

  const upstreamHardlinkRoot = await createWorkspaceFixture(
    t,
    "hakimi-vedic-input-upstream-hardlink-"
  );
  const upstreamHardlink = fixtureUpstreamPath(upstreamHardlinkRoot);
  const upstreamHardlinkSibling = `${upstreamHardlink}.sibling`;
  await copyFile(upstreamHardlink, upstreamHardlinkSibling);
  await unlink(upstreamHardlink);
  await link(upstreamHardlinkSibling, upstreamHardlink);
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(upstreamHardlinkRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "UPSTREAM_ENDPOINT_INVALID"
  );

  const upstreamSymlinkRoot = await createWorkspaceFixture(
    t,
    "hakimi-vedic-input-upstream-symlink-"
  );
  const upstreamSymlink = fixtureUpstreamPath(upstreamSymlinkRoot);
  const upstreamSymlinkSibling = `${upstreamSymlink}.sibling`;
  await copyFile(upstreamSymlink, upstreamSymlinkSibling);
  await unlink(upstreamSymlink);
  try {
    await symlink(path.basename(upstreamSymlinkSibling), upstreamSymlink, "file");
    await assert.rejects(
      () => readCurrentVedicInputAdmissionReadinessCandidate(upstreamSymlinkRoot),
      (error) => error instanceof VedicInputAdmissionReadinessCandidateError
        && error.code === "UPSTREAM_ENDPOINT_INVALID"
    );
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.diagnostic(`upstream symlink creation unavailable on this host: ${error.code}`);
    } else {
      throw error;
    }
  }

  const upstreamEmptyRoot = await createWorkspaceFixture(
    t,
    "hakimi-vedic-input-upstream-empty-"
  );
  await writeFile(fixtureUpstreamPath(upstreamEmptyRoot), Buffer.alloc(0));
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(upstreamEmptyRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "UPSTREAM_ENDPOINT_INVALID"
  );

  const upstreamOversizeRoot = await createWorkspaceFixture(
    t,
    "hakimi-vedic-input-upstream-oversize-"
  );
  await writeFile(
    fixtureUpstreamPath(upstreamOversizeRoot),
    Buffer.alloc(testOnly.MAX_UPSTREAM_BYTES + 1, 0x20)
  );
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(upstreamOversizeRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "UPSTREAM_ENDPOINT_INVALID"
  );
});

test("Windows directory junction escape is rejected when junction creation is available", async (t) => {
  if (process.platform !== "win32") {
    t.diagnostic("Windows directory-junction case is not applicable on this host");
    return;
  }
  const fixtureRoot = await createWorkspaceFixture(
    t,
    "hakimi-vedic-input-junction-workspace-"
  );
  const outsidePrefix = "hakimi-vedic-input-junction-outside-";
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), outsidePrefix));
  t.after(async () => {
    const resolved = path.resolve(outsideRoot);
    assert.equal(path.basename(resolved).startsWith(outsidePrefix), true);
    await rm(resolved, { recursive: true, force: true });
  });
  const originalDirectory = path.dirname(fixtureCandidatePath(fixtureRoot));
  const escapedDirectory = path.join(outsideRoot, "system-admission");
  await rename(originalDirectory, escapedDirectory);
  try {
    await symlink(escapedDirectory, originalDirectory, "junction");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.diagnostic(`directory junction creation unavailable on this host: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => readCurrentVedicInputAdmissionReadinessCandidate(fixtureRoot),
    (error) => error instanceof VedicInputAdmissionReadinessCandidateError
      && error.code === "CANDIDATE_ENDPOINT_INVALID"
  );
});

test("held-handle reader deterministically rejects truncate, growth and path replacement", async (t) => {
  const prefix = "hakimi-vedic-input-held-read-";
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
        testOnly.MAX_CANDIDATE_BYTES,
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
      (error) => error instanceof VedicInputAdmissionReadinessCandidateError
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
      testOnly.MAX_CANDIDATE_BYTES,
      {
        invalidCode: "ARTIFACT_ENDPOINT_INVALID",
        missingCode: "ARTIFACT_MISSING",
        label: "held-read-replacement-artifact",
        testOnlyReadPhaseHook: async (phase) => {
          replacementPhases.push(phase);
          if (phase === "before-read") {
            await rename(absolutePath, replacementPath);
            await writeFile(absolutePath, Buffer.from("replacement-endpoint", "utf8"));
          }
        }
      }
    );
  } catch (error) {
    replacementError = error;
  }
  if (replacementError?.code === "TEST_ONLY_READ_HOOK_FAILED"
    && ["EPERM", "EACCES", "EBUSY", "ENOTSUP"].includes(replacementError.cause?.code)) {
    t.diagnostic(`open-file replacement unavailable on this host: ${replacementError.cause.code}`);
    return;
  }
  assert.equal(
    replacementError instanceof VedicInputAdmissionReadinessCandidateError,
    true
  );
  assert.equal(replacementError.code, "ARTIFACT_ENDPOINT_INVALID");
  assert.deepEqual(replacementPhases, ["after-open", "before-read", "after-read"]);
});

test("CLI is fixed-path and reports only zero readiness with all authority red", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliAbsolutePath], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true
  });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.requirementsDefined, 13);
  assert.equal(output.requirementsResolved, 0);
  assert.equal(output.inputContractGateSatisfied, false);
  assert.equal(output.admissionGatesSatisfied, 0);
  assert.equal(output.activeAdmissionEffect, "none");
  assert.equal(output.formalAdmissionAuthorized, false);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicDeploymentAuthorized, false);
  assert.equal(output.publicReleaseAuthorized, false);
  assert.equal(output.expertClaimsAuthorized, false);
  assert.equal(output.necessaryConditionsRequired, 8);
  assert.equal(output.necessaryConditionsSatisfied, 0);
  assert.equal(output.conditionsAreNecessaryNotSufficient, true);
  assert.equal(output.allConditionsAloneConferEligibility, false);
  assert.equal(output.positiveTransitionEvaluatorImplemented, false);
  assert.equal(output.positiveReceiptSchemasDefined, false);
  assert.equal(output.positiveTransitionReceiptsAccepted, 0);
  assert.equal(output.legalAuthorityRoleDefinition, "absent");
  assert.equal(output.legalAuthoritySeatCount, 0);
  assert.equal(output.rightsLegalConclusionEstablished, false);
  assert.equal(output.candidateEndpointMechanicallyObservedUnderUnverifiedRuntime, true);
  assert.equal(output.endpointSetObservationBrandVerified, true);
  assert.equal(output.visibleNodeLaunchStateCleanObserved, true);
  assert.equal(output.erasedPreloadExcluded, false);
  assert.equal(output.currentBrandVerified, false);
  assert.equal(output.crossFileAtomicSnapshot, false);
  assert.equal(output.mutationEpochAvailable, false);
  assert.equal(output.intervalMutationExcluded, false);
  assert.equal(output.abaExcluded, false);
  assert.equal(output.loadedModuleByteIdentityVerified, false);
  assert.equal(output.nodeLoaderIntegrityVerified, false);
  assert.equal(output.runtimeLauncherIdentityVerified, false);
  assert.equal(output.runtimeIntrinsicIntegrityVerified, false);
  assert.equal(output.simultaneousCurrentRawClosureVerified, false);
  assert.equal(Object.hasOwn(output, "candidateEndpointMechanicallyVerified"), false);
  assert.equal(Object.hasOwn(output, "sequentialEndpointObservationBrandVerified"), false);
  assert.equal(Object.hasOwn(output, "arbitraryCandidateInputAuthorized"), false);
  assert.equal(Object.hasOwn(output, "candidateDigestIsAnonymous"), false);
});

test("CLI rejects operands and still-visible NODE_PATH, NODE_OPTIONS and execArgv without echoing values", async () => {
  const operandSecret = "birth-2000-01-01T01:02:03Z";
  const operand = await captureCliFailure([cliAbsolutePath, operandSecret]);
  assert.equal(operand.error.code, 2);
  assert.equal(operand.failure.code, "CLI_ARGUMENTS_FORBIDDEN");
  assert.equal(operand.failure.candidateEndpointMechanicallyObservedUnderUnverifiedRuntime, false);
  assert.equal(operand.failure.endpointSetObservationBrandVerified, false);
  assert.equal(operand.failure.visibleNodeLaunchStateCleanObserved, false);
  assert.equal(operand.failure.erasedPreloadExcluded, false);
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
    assert.equal(failure.failure.candidateEndpointMechanicallyObservedUnderUnverifiedRuntime, false);
    assert.equal(failure.failure.endpointSetObservationBrandVerified, false);
    assert.equal(failure.failure.visibleNodeLaunchStateCleanObserved, false);
    assert.equal(failure.failure.erasedPreloadExcluded, false);
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

test("erased data preload may exit zero but output stays visible-only and runtime-untrusted", async (t) => {
  const prefix = "hakimi-vedic-input-erased-preload-";
  const preloadRoot = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    const resolved = path.resolve(preloadRoot);
    assert.equal(path.basename(resolved).startsWith(prefix), true);
    await rm(resolved, { recursive: true, force: true });
  });
  const markerPath = path.join(preloadRoot, "preload-executed.txt");
  const preloadSource = [
    'import { writeFileSync } from "node:fs";',
    `writeFileSync(${JSON.stringify(markerPath)}, "executed");`,
    "delete process.env.NODE_OPTIONS;"
  ].join("");
  const nodeOptions =
    `--import=data:text/javascript,${encodeURIComponent(preloadSource)}`;
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliAbsolutePath], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment({ NODE_OPTIONS: nodeOptions }),
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.equal(await readFile(markerPath, "utf8"), "executed");
  const output = JSON.parse(stdout);
  assert.equal(output.candidateEndpointMechanicallyObservedUnderUnverifiedRuntime, true);
  assert.equal(output.endpointSetObservationBrandVerified, true);
  assert.equal(output.visibleNodeLaunchStateCleanObserved, true);
  assert.equal(output.erasedPreloadExcluded, false);
  assert.equal(output.currentBrandVerified, false);
  assert.equal(output.loadedModuleByteIdentityVerified, false);
  assert.equal(output.nodeLoaderIntegrityVerified, false);
  assert.equal(output.runtimeLauncherIdentityVerified, false);
  assert.equal(output.runtimeIntrinsicIntegrityVerified, false);
  assert.equal(output.simultaneousCurrentRawClosureVerified, false);
  assert.equal(output.crossFileAtomicSnapshot, false);
  assert.equal(output.mutationEpochAvailable, false);
  assert.equal(output.intervalMutationExcluded, false);
  assert.equal(output.abaExcluded, false);
});
