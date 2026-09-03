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
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH,
  VedicRealIndependentExpertReviewPlanError,
  buildCurrentVedicRealIndependentExpertReviewPlan,
  canonicalPrettyStringifyVedicRealIndependentExpertReviewPlan,
  computeVedicRealIndependentExpertReviewPlanDigest,
  parseVedicRealIndependentExpertReviewPlanJsonBytes,
  readVedicRealIndependentExpertReviewPlan,
  vedicRealIndependentExpertReviewPlanTestOnly,
  verifyVedicRealIndependentExpertReviewPlan
} from "./vedic-real-independent-expert-review-plan-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-vedic-real-independent-expert-review-plan.mjs"
);
const closurePaths = Object.freeze([
  VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH,
  ...vedicRealIndependentExpertReviewPlanTestOnly.CHAIN_ORDER
]);
const expectedStatus =
  "complete_verifiable_material_contract_for_two_vacant_real_independent_expert_seats_zero_expert_instances_review_not_started";
const expectedDigest = "2eb4dc9c037403e47f332cc105755bfb86aa8ad6dc0b95dbaf29e80d7bdfd1af";
const expectedRawSha256 = "9bcbff519dd38d40f26dfba1ccabe1c2987700200cf3a7f6eb7bf68254d7cf89";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectObjectGraph(root) {
  const objects = new Set();
  const stack = [root];
  while (stack.length > 0) {
    const value = stack.pop();
    if (value === null || typeof value !== "object" || objects.has(value)) continue;
    objects.add(value);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (Object.hasOwn(descriptor, "value")) stack.push(descriptor.value);
    }
  }
  return objects;
}

function assertFullyFrozenAndDetached(input, result) {
  const inputObjects = collectObjectGraph(input);
  const resultObjects = collectObjectGraph(result);
  for (const value of resultObjects) {
    assert.equal(Object.isFrozen(value), true);
    assert.equal(inputObjects.has(value), false);
  }
  for (const value of inputObjects) assert.equal(Object.isFrozen(value), false);
}

function resign(candidate) {
  candidate.planDigest = computeVedicRealIndependentExpertReviewPlanDigest(candidate);
  return candidate;
}

let currentPlanPromise;

async function currentPlan() {
  currentPlanPromise ??= readVedicRealIndependentExpertReviewPlan(workspaceRoot);
  return currentPlanPromise;
}

async function expectResignedFailure(mutator, code) {
  const candidate = clone(await currentPlan());
  mutator(candidate);
  resign(candidate);
  await assert.rejects(
    () => verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, candidate),
    (error) => error instanceof VedicRealIndependentExpertReviewPlanError
      && error.code === code
  );
}

function mutationTest(name, mutator, code) {
  test(name, async () => expectResignedFailure(mutator, code));
}

async function makeFixture(t, prefix = "hakimi-vedic-expert-plan-") {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of closurePaths) {
    const source = path.resolve(workspaceRoot, ...relativePath.split("/"));
    const target = path.resolve(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  return root;
}

test("current Vedic expert-review plan is complete material with exactly two vacant seats and zero instances", async () => {
  const result = await verifyVedicRealIndependentExpertReviewPlan(
    workspaceRoot,
    await currentPlan()
  );
  assert.equal(result.status, expectedStatus);
  assert.equal(result.planCoverageComplete, true);
  assert.equal(result.reviewerSlotsDefined, 2);
  assert.equal(result.reviewerSlotsOccupied, 0);
  assert.equal(result.reviewStarted, false);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.expertReviewBundleComplete, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.planDigest, expectedDigest);
});

test("CLI reports neutral plan closure without expert or release promotion", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.equal(stdout.endsWith("\n"), true);
  assert.equal(stdout.trim().includes("\n"), false);
  const output = JSON.parse(stdout);
  assert.equal(output.expertReviewPlanClosureVerified, true);
  assert.equal(output.status, expectedStatus);
  assert.equal(output.planCoverageComplete, true);
  assert.equal(
    output.planCoverageMeaning,
    "material_contract_coverage_only_no_reviewer_eligibility_identity_independence_opinion_truth_or_gate_instance"
  );
  assert.equal(output.reviewerSlotsDefined, 2);
  assert.equal(output.reviewerSlotsOccupied, 0);
  assert.equal(output.reviewStarted, false);
  assert.equal(output.independentExpertReviewsVerified, 0);
  assert.equal(output.expertReviewBundleComplete, false);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicReleaseAuthorized, false);
  for (const forbidden of ["ok", "ready", "admission", "expertTruthEstablished"]) {
    assert.equal(Object.hasOwn(output, forbidden), false);
  }
});

test("CLI rejects every operand with one scoped JSON error", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "other.json"], {
      cwd: workspaceRoot,
      windowsHide: true
    }),
    (error) => {
      assert.equal(error.code, 2);
      assert.equal(error.stdout, "");
      const output = JSON.parse(error.stderr);
      assert.equal(output.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(output.expertReviewPlanClosureVerified, false);
      assert.equal(Object.hasOwn(output, "ok"), false);
      return true;
    }
  );
});

test("CLI is anchored to its module workspace rather than caller cwd", async () => {
  const { stdout } = await execFileAsync(process.execPath, [cliPath], {
    cwd: os.tmpdir(),
    windowsHide: true
  });
  assert.equal(JSON.parse(stdout).expertReviewPlanClosureVerified, true);
});

test("plan bytes are one exact canonical materialization", async () => {
  const absolute = path.resolve(
    workspaceRoot,
    ...VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH.split("/")
  );
  const raw = await readFile(absolute);
  const plan = parseVedicRealIndependentExpertReviewPlanJsonBytes(raw);
  assert.equal(
    raw.toString("utf8"),
    canonicalPrettyStringifyVedicRealIndependentExpertReviewPlan(plan)
  );
  assert.equal(raw.byteLength, 37_131);
  assert.equal(createHash("sha256").update(raw).digest("hex"), expectedRawSha256);
  assert.equal(computeVedicRealIndependentExpertReviewPlanDigest(plan), expectedDigest);
});

test("raw parser rejects UTF-8 BOM", () => {
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(
      Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
    ),
    (error) => error instanceof VedicRealIndependentExpertReviewPlanError
      && error.code === "JSON_BOM_FORBIDDEN"
  );
});

test("raw parser rejects invalid UTF-8", () => {
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
});

test("raw parser rejects duplicate keys before JSON.parse collapse", () => {
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(
      Buffer.from('{"a":1,"a":2}', "utf8")
    ),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
});

test("raw parser rejects non-object JSON roots", () => {
  for (const source of ["[]", "null", "1", '"x"']) {
    assert.throws(
      () => parseVedicRealIndependentExpertReviewPlanJsonBytes(
        Buffer.from(source, "utf8")
      ),
      (error) => error.code === "JSON_INVALID"
    );
  }
});

test("raw parser enforces intrinsic Uint8Array and max byte length", () => {
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(
      Buffer.from("{}", "utf8"),
      "fixture",
      1
    ),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(new ArrayBuffer(2)),
    (error) => error.code === "JSON_BYTES_INVALID"
  );
});

test("raw parser rejects SharedArrayBuffer storage", () => {
  if (typeof SharedArrayBuffer !== "function") return;
  const shared = new Uint8Array(new SharedArrayBuffer(2));
  shared.set(Buffer.from("{}", "utf8"));
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(shared),
    (error) => error?.code === "JSON_SHARED_BUFFER_FORBIDDEN"
  );
});

test("raw parser rejects resizable ArrayBuffer storage", () => {
  if (typeof ArrayBuffer.prototype.resize !== "function") return;
  const resizable = new ArrayBuffer(2, { maxByteLength: 4 });
  new Uint8Array(resizable).set(Buffer.from("{}", "utf8"));
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(new Uint8Array(resizable)),
    (error) => error?.code === "JSON_RESIZABLE_BUFFER_FORBIDDEN"
  );
});

test("raw parser rejects detached typed-array storage with one scoped code", () => {
  const detachedBuffer = new ArrayBuffer(2);
  const detachedView = new Uint8Array(detachedBuffer);
  structuredClone(detachedBuffer, { transfer: [detachedBuffer] });
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(detachedView),
    (error) => error?.code === "JSON_BYTES_INVALID"
  );
});

test("raw parser rejects typed-array Proxy without invoking traps", () => {
  let traps = 0;
  const proxy = new Proxy(Buffer.from("{}", "utf8"), {
    get() {
      traps += 1;
      throw new Error("trap must not run");
    }
  });
  assert.throws(
    () => parseVedicRealIndependentExpertReviewPlanJsonBytes(proxy),
    (error) => error.code === "JSON_PROXY_FORBIDDEN"
  );
  assert.equal(traps, 0);
});

test("object API rejects Proxy without invoking traps", async () => {
  let traps = 0;
  const proxy = new Proxy({}, {
    get() {
      traps += 1;
      throw new Error("trap must not run");
    },
    ownKeys() {
      traps += 1;
      throw new Error("trap must not run");
    }
  });
  await assert.rejects(
    () => verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, proxy),
    (error) => error.code === "INPUT_PROXY_FORBIDDEN"
  );
  assert.equal(traps, 0);
});

test("object API rejects accessors without invoking them", async () => {
  let getterRuns = 0;
  const candidate = {};
  Object.defineProperty(candidate, "schemaVersion", {
    enumerable: true,
    get() {
      getterRuns += 1;
      return "1.0.0";
    }
  });
  await assert.rejects(
    () => verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, candidate),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(getterRuns, 0);
});

test("object API rejects negative zero, sparse arrays, aliases, cycles and custom prototypes", async () => {
  const base = clone(await currentPlan());
  const cases = [];
  const negativeZero = clone(base);
  negativeZero.zeroInstanceReceipt.reviewerSlotsOccupied = -0;
  cases.push([negativeZero, "INPUT_VALUE_INVALID"]);
  const sparse = clone(base);
  sparse.reviewQuestions = new Array(8);
  cases.push([sparse, "INPUT_ARRAY_INVALID"]);
  const alias = clone(base);
  alias.authorityBoundary = alias.productBoundary;
  cases.push([alias, "INPUT_CYCLE_OR_ALIAS_FORBIDDEN"]);
  const cycle = clone(base);
  cycle.self = cycle;
  cases.push([cycle, "INPUT_CYCLE_OR_ALIAS_FORBIDDEN"]);
  class FakePlan {}
  cases.push([Object.assign(new FakePlan(), base), "INPUT_PROTOTYPE_INVALID"]);
  for (const [candidate, code] of cases) {
    await assert.rejects(
      () => verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, candidate),
      (error) => error.code === code
    );
  }
});

test("object API returns a deeply frozen detached private snapshot", async () => {
  const candidate = clone(await currentPlan());
  const result = await verifyVedicRealIndependentExpertReviewPlan(
    workspaceRoot,
    candidate
  );
  assertFullyFrozenAndDetached(candidate, result);
  candidate.reviewerSeats[0].status = "occupied";
  assert.equal(result.plan.reviewerSeats[0].status, "vacant");
});

test("review scope and eight-question set cover each current subject exactly once", async () => {
  const plan = await currentPlan();
  assert.deepEqual(plan.reviewScope.countsByLayer, { fact: 12, input: 13, rule: 13 });
  assert.equal(plan.reviewScope.requirementSubjectCount, 38);
  const covered = plan.reviewQuestions.flatMap((question) => question.coveredSubjectIds);
  assert.equal(plan.reviewQuestions.length, 8);
  assert.equal(covered.length, 38);
  assert.equal(new Set(covered).size, 38);
  assert.deepEqual(new Set(covered), new Set(plan.reviewScope.requirementSubjectIds));
});

test("two seat definitions are vacant and contain no identity or opinion context", async () => {
  const plan = await currentPlan();
  assert.deepEqual(plan.reviewerSeats.map((seat) => seat.slotId), [
    "vedic-domain-expert-a",
    "vedic-domain-expert-b"
  ]);
  for (const seat of plan.reviewerSeats) {
    assert.equal(seat.status, "vacant");
    assert.equal(seat.reviewerBinding, null);
    assert.equal(seat.identityDossierContextId, null);
    assert.equal(seat.originalOpinionContextId, null);
    assert.equal(seat.originalOpinionDigest, null);
    assert.equal(seat.originalOpinionStored, false);
  }
});

test("privacy plan keeps raw identity and opinion material outside the repository", async () => {
  const policy = (await currentPlan()).identityPrivacyPlan;
  assert.equal(policy.privateIdentityDossier.rawMaterialRepositoryStorageAllowed, false);
  assert.equal(policy.privateOriginalOpinion.rawMaterialRepositoryStorageAllowed, false);
  assert.equal(policy.privateOriginalOpinion.authenticityAndCustodyVerificationRequired, true);
  assert.equal(policy.privateOriginalOpinion.samePacketAndQuestionSetBindingRequired, true);
  assert.equal(policy.privateOriginalOpinion.storageMechanismVerificationRequired, true);
  assert.equal(policy.privateOriginalOpinion.requiredRawFields.includes("opinion_sha256"), true);
  assert.equal(policy.privateOriginalOpinion.requiredRawFields.includes("custody_ref"), true);
  assert.equal(policy.repositoryOpaqueContextsMayEstablishAuthenticity, false);
  assert.deepEqual(policy.identityContextInstances, []);
  assert.deepEqual(policy.opinionContextInstances, []);
});

test("expert eligibility requires attributable Vedic evidence, full scope mapping and a distinct verifier", async () => {
  const policy = (await currentPlan()).expertEligibilityAndVerificationPlan;
  assert.equal(policy.minimumPrimaryVedicEvidenceCategories, 1);
  assert.equal(policy.minimumCorroboratingEvidenceCategories, 1);
  assert.equal(policy.requiredVedicScopeCoverageCount, 5);
  assert.equal(policy.requiredVedicScopeCoverage.length, 5);
  assert.equal(policy.requiredVedicScopeCoverageRoleMappings.length, 5);
  assert.equal(policy.scopeCoverageEvidenceMappingRequired, true);
  assert.equal(policy.verifierMustBeOutsideBothReviewerSeats, true);
  assert.equal(policy.verifierMustBeDistinctFromReviewer, true);
  assert.equal(policy.reviewerSeatsMayVerifyEachOther, false);
  assert.equal(policy.reviewerSelfVerificationAllowed, false);
  assert.equal(policy.primaryAndCorroboratingEvidenceRefsMustBeDistinctRecords, true);
  assert.equal(policy.unrelatedSystemExpertiseMaySubstituteForVedicScope, false);
  assert.equal(policy.aiOnlyOrGeneratedProfileMayQualify, false);
  const domainAllowed = new Set((await currentPlan()).roleSeparation[0].allowedScope);
  assert.deepEqual(
    new Set(policy.requiredVedicScopeCoverageRoleMappings.map((entry) => entry.scopeCoverageId)),
    new Set(policy.requiredVedicScopeCoverage)
  );
  for (const mapping of policy.requiredVedicScopeCoverageRoleMappings) {
    assert.equal(mapping.allowedScopeIds.every((id) => domainAllowed.has(id)), true);
  }
});

test("independence plan requires distinct real persons and classifies shared-upstream agreement separately", async () => {
  const policy = (await currentPlan()).independencePlan;
  assert.equal(policy.distinctRealNaturalPersonsRequired, true);
  assert.equal(policy.pairwiseAssessmentRequired, true);
  assert.equal(policy.pairwiseIndependenceVerified, false);
  assert.equal(
    policy.sameUpstreamAgreementClassification,
    "agree_same_upstream_not_independent_corroboration"
  );
  assert.equal(policy.factorIds.length, 10);
});

test("review process is same-packet same-question blind collection with immutable originals", async () => {
  const process = (await currentPlan()).reviewProcess;
  assert.equal(process.sameFrozenPacketRequired, true);
  assert.equal(process.sameQuestionSetRequired, true);
  assert.equal(process.mutualDisclosureBeforeBothOriginalOpinionsSealedAllowed, false);
  assert.equal(process.immutableOriginalOpinionsRequired, true);
  assert.equal(process.reconciliationMayOverwriteOriginals, false);
  assert.equal(process.substantiveReviewStarted, false);
  assert.equal((await currentPlan()).reviewQuestions.every((question) =>
    question.assignedReviewerRoleId === "vedic_domain_expert"), true);
});

test("review packet contract binds manifest digests, custody, current scope and the same packet for both seats", async () => {
  const packet = (await currentPlan()).reviewPacketContract;
  assert.equal(packet.currentReviewPacketId, null);
  assert.equal(packet.currentReviewPacketDigest, null);
  assert.deepEqual(packet.reviewPacketInstances, []);
  assert.equal(packet.custodyIntegrityEvidenceRequired, true);
  assert.equal(packet.questionSetDigestMustBindCurrentEightQuestions, true);
  assert.equal(packet.requirementSubjectDigestMustBindCurrentThirtyEightSubjects, true);
  assert.equal(packet.samePacketDigestBoundToBothSeatsRequired, true);
  assert.equal(packet.sameQuestionSetDigestBoundToBothSeatsRequired, true);
  assert.equal(packet.packetMayContainOtherReviewerOpinion, false);
  assert.equal(packet.minimumManifestEntryTypes.length, 8);
});

test("disagreement policy forbids vote, averaging, model winner and unresolved adoption", async () => {
  const plan = await currentPlan();
  assert.equal(plan.automatedResolutionPolicy.majorityVoteAllowed, false);
  assert.equal(plan.automatedResolutionPolicy.opinionAveragingAllowed, false);
  assert.equal(plan.automatedResolutionPolicy.generatedModelWinnerSelectionAllowed, false);
  assert.equal(plan.automatedResolutionPolicy.unresolvedDisagreementMayBeAdopted, false);
  assert.deepEqual(plan.automatedResolutionPolicy.allowedUnresolvedDisposition, [
    "defer",
    "reject"
  ]);
});

test("opinion lifecycle is append-only and revocation re-closes affected seats and gates", async () => {
  const policy = (await currentPlan()).withdrawalCorrectionRevocationPolicy;
  assert.equal(policy.authorityVerificationRequiredForCorrectionWithdrawalOrRevocation, true);
  assert.equal(policy.correctionMayOverwriteOriginal, false);
  assert.equal(policy.correctionMustBeSeparateAppendOnlyRecord, true);
  assert.equal(
    policy.correctionReopensAffectedSeatAndGateUntilVerifiedResealedAndReconciled,
    true
  );
  assert.equal(policy.withdrawalMustBeSeparateAppendOnlyRecord, true);
  assert.equal(policy.withdrawalImmediatelyInvalidatesAffectedSeatAndGate, true);
  assert.equal(policy.revocationMustBeSeparateAppendOnlyRecord, true);
  assert.equal(policy.originalRecordRetentionRequired, true);
  assert.equal(policy.revocationImmediatelyInvalidatesAffectedSeatAndGate, true);
  assert.equal(policy.localWithholdingOrFileAbsenceCountsAsReviewerWithdrawal, false);
  assert.deepEqual(policy.withdrawalCorrectionOrRevocationInstances, []);
});

test("all substantive review prerequisites remain false and review cannot start", async () => {
  const prerequisites = (await currentPlan()).reviewStartPrerequisites;
  assert.equal(prerequisites.required, 16);
  assert.equal(prerequisites.satisfied, 0);
  assert.equal(prerequisites.substantiveReviewMayStart, false);
  assert.equal(prerequisites.protectedExternalIntakeAuthorized, false);
  assert.equal(prerequisites.states.every((entry) =>
    entry.currentState === false && entry.requiredState === true), true);
  const ids = new Set(prerequisites.states.map((entry) => entry.prerequisiteId));
  for (const id of [
    "two_distinct_real_reviewer_seats_occupied",
    "both_reviewer_identity_authenticity_verified",
    "both_reviewer_credentials_and_vedic_scope_fit_verified_under_plan",
    "pairwise_independence_and_same_upstream_disclosures_verified",
    "private_identity_dossier_authenticity_and_custody_mechanism_ready",
    "original_opinion_sealing_append_only_custody_and_storage_mechanism_ready",
    "review_packet_manifest_digest_custody_and_same_question_bindings_verified",
    "future_expert_instance_and_lifecycle_implementation_frozen"
  ]) assert.equal(ids.has(id), true);
});

test("product, authority, evidence and observation boundaries stay fail-closed", async () => {
  const plan = await currentPlan();
  assert.equal(plan.productBoundary.releaseIdentity, null);
  assert.equal(plan.productBoundary.targetSchema, null);
  assert.equal(plan.productBoundary.migrationId, null);
  assert.equal(plan.productBoundary.legacyV13Inherited, false);
  assert.equal(plan.authorityBoundary.expertClaimsAuthorized, false);
  assert.equal(plan.authorityBoundary.publicDeploymentAuthorized, false);
  assert.equal(plan.evidenceBoundary.expertTruth, "not_established");
  assert.equal(plan.observationBoundary.mutationEpochAvailable, false);
  assert.equal(plan.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(plan.observationBoundary.intervalMutationExcluded, false);
  assert.equal(plan.observationBoundary.abaExcluded, false);
});

test("closure is exact eight-layer one-way and excludes runtime, parent and central registry", async () => {
  const bindings = (await currentPlan()).boundaryBindings;
  assert.deepEqual(bindings.chainOrder, vedicRealIndependentExpertReviewPlanTestOnly.CHAIN_ORDER);
  assert.deepEqual(
    bindings.upstreamArtifacts.map((entry) => entry.path),
    vedicRealIndependentExpertReviewPlanTestOnly.CHAIN_ORDER
  );
  assert.equal(bindings.planBindsSourceRightsRequirements, true);
  assert.equal(bindings.planBindsRuntimeProposal, false);
  assert.equal(bindings.planBindsParent, false);
  assert.equal(bindings.planBindsCentralRegistry, false);
});

test("digest is explicitly not a signature or authenticity proof", async () => {
  const integrity = (await currentPlan()).integrityBoundary;
  assert.equal(integrity.digestAlgorithm, "SHA-256");
  assert.equal(
    integrity.digestDomain,
    vedicRealIndependentExpertReviewPlanTestOnly.DIGEST_DOMAIN
  );
  assert.equal(integrity.digestIsDigitalSignature, false);
  assert.equal(integrity.authenticityEstablished, false);
  assert.equal(integrity.digitalSignature, null);
  assert.equal(integrity.signerIdentity, null);
});

mutationTest(
  "plan material coverage cannot be downgraded or aliased to execution",
  (value) => { value.planCoverageComplete = false; },
  "PLAN_COVERAGE_OR_REVIEW_STATE_INVALID"
);
mutationTest(
  "plan material coverage meaning cannot be promoted to executed expert review",
  (value) => { value.planCoverageMeaning = "expert_review_complete"; },
  "PLAN_COVERAGE_OR_REVIEW_STATE_INVALID"
);
mutationTest(
  "review cannot be promoted to started",
  (value) => { value.reviewStarted = true; },
  "PLAN_COVERAGE_OR_REVIEW_STATE_INVALID"
);
mutationTest(
  "a vacant seat cannot be occupied by self-resigning the plan",
  (value) => { value.reviewerSeats[0].status = "occupied"; },
  "EXPERT_INSTANCE_PROMOTED"
);
mutationTest(
  "zero-instance counts cannot be promoted",
  (value) => { value.zeroInstanceReceipt.identitiesVerified = 1; },
  "EXPERT_INSTANCE_PROMOTED"
);
mutationTest(
  "scope-fit zero instance cannot be promoted",
  (value) => { value.zeroInstanceReceipt.scopeFitsVerified = 1; },
  "EXPERT_INSTANCE_PROMOTED"
);
mutationTest(
  "raw identity dossier cannot move into repository",
  (value) => {
    value.identityPrivacyPlan.privateIdentityDossier.rawMaterialRepositoryStorageAllowed = true;
  },
  "IDENTITY_PRIVACY_PLAN_INVALID"
);
mutationTest(
  "a reviewer cannot self-verify Vedic eligibility",
  (value) => {
    value.expertEligibilityAndVerificationPlan.reviewerSelfVerificationAllowed = true;
  },
  "EXPERT_ELIGIBILITY_PLAN_INVALID"
);
mutationTest(
  "the two expert seats cannot verify each other's eligibility",
  (value) => {
    value.expertEligibilityAndVerificationPlan.reviewerSeatsMayVerifyEachOther = true;
  },
  "EXPERT_ELIGIBILITY_PLAN_INVALID"
);
mutationTest(
  "eligibility verifier must remain outside both expert seats",
  (value) => {
    value.expertEligibilityAndVerificationPlan.verifierMustBeOutsideBothReviewerSeats = false;
  },
  "EXPERT_ELIGIBILITY_PLAN_INVALID"
);
mutationTest(
  "primary and corroborating eligibility evidence cannot double-count one record",
  (value) => {
    value.expertEligibilityAndVerificationPlan.primaryAndCorroboratingEvidenceRefsMustBeDistinctRecords = false;
  },
  "EXPERT_ELIGIBILITY_PLAN_INVALID"
);
mutationTest(
  "corroborating evidence must have provenance independent from primary evidence",
  (value) => {
    value.expertEligibilityAndVerificationPlan.corroboratingEvidenceMustHaveIndependentProvenanceFromPrimary = false;
  },
  "EXPERT_ELIGIBILITY_PLAN_INVALID"
);
mutationTest(
  "unrelated-system expertise cannot substitute for Vedic scope evidence",
  (value) => {
    value.expertEligibilityAndVerificationPlan.unrelatedSystemExpertiseMaySubstituteForVedicScope = true;
  },
  "EXPERT_ELIGIBILITY_PLAN_INVALID"
);
mutationTest(
  "pairwise independence cannot be self-promoted",
  (value) => { value.independencePlan.pairwiseIndependenceVerified = true; },
  "INDEPENDENCE_PLAN_INVALID"
);
mutationTest(
  "blind review cannot be weakened",
  (value) => {
    value.reviewProcess.mutualDisclosureBeforeBothOriginalOpinionsSealedAllowed = true;
  },
  "OPINION_PROCESS_INVALID"
);
mutationTest(
  "original opinions cannot become overwritable",
  (value) => { value.opinionPreservationPlan.originalsMayBeOverwritten = true; },
  "OPINION_PROCESS_INVALID"
);
mutationTest(
  "majority vote cannot be enabled",
  (value) => { value.automatedResolutionPolicy.majorityVoteAllowed = true; },
  "DISAGREEMENT_POLICY_INVALID"
);
mutationTest(
  "generated model winner selection cannot be enabled",
  (value) => {
    value.automatedResolutionPolicy.generatedModelWinnerSelectionAllowed = true;
  },
  "DISAGREEMENT_POLICY_INVALID"
);
mutationTest(
  "withdrawal cannot overwrite or erase an original",
  (value) => {
    value.withdrawalCorrectionRevocationPolicy.correctionMayOverwriteOriginal = true;
  },
  "OPINION_LIFECYCLE_POLICY_INVALID"
);
mutationTest(
  "correction withdrawal and revocation authority verification cannot be removed",
  (value) => {
    value.withdrawalCorrectionRevocationPolicy.authorityVerificationRequiredForCorrectionWithdrawalOrRevocation = false;
  },
  "OPINION_LIFECYCLE_POLICY_INVALID"
);
mutationTest(
  "correction must remain a separate append-only lifecycle record",
  (value) => {
    value.withdrawalCorrectionRevocationPolicy.correctionMustBeSeparateAppendOnlyRecord = false;
  },
  "OPINION_LIFECYCLE_POLICY_INVALID"
);
mutationTest(
  "withdrawal must immediately re-close the affected seat and gate",
  (value) => {
    value.withdrawalCorrectionRevocationPolicy.withdrawalImmediatelyInvalidatesAffectedSeatAndGate = false;
  },
  "OPINION_LIFECYCLE_POLICY_INVALID"
);
mutationTest(
  "high-risk review plan cannot masquerade as policy completion",
  (value) => { value.highRiskExpressionReviewPlan.highRiskPolicyEstablished = true; },
  "HIGH_RISK_REVIEW_PLAN_INVALID"
);
mutationTest(
  "one prerequisite cannot be self-promoted",
  (value) => { value.reviewStartPrerequisites.states[0].currentState = true; },
  "REVIEW_START_PREREQUISITES_PROMOTED"
);
mutationTest(
  "review packet cannot omit same-packet binding for both seats",
  (value) => {
    value.reviewPacketContract.samePacketDigestBoundToBothSeatsRequired = false;
  },
  "REVIEW_PACKET_CONTRACT_INVALID"
);
mutationTest(
  "plan cannot count toward expert gate",
  (value) => { value.gateBoundary.countsTowardExpertGate = true; },
  "EXPERT_GATE_OR_EVIDENCE_PROMOTED"
);
mutationTest(
  "public deployment authority cannot be promoted",
  (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
  "AUTHORITY_PROMOTED"
);
mutationTest(
  "Vedic plan cannot inherit Schema 13",
  (value) => { value.productBoundary.targetSchema = 13; },
  "PRODUCT_BOUNDARY_PROMOTED"
);
mutationTest(
  "mutation epoch cannot be claimed",
  (value) => { value.observationBoundary.mutationEpochAvailable = true; },
  "OBSERVATION_BOUNDARY_PROMOTED"
);
mutationTest(
  "domain expert cannot gain legal-adjudication authority",
  (value) => {
    value.roleSeparation[0].forbiddenScope =
      value.roleSeparation[0].forbiddenScope.filter((entry) => entry !== "rights_legal_conclusion");
  },
  "ROLE_SEPARATION_INVALID"
);
mutationTest(
  "source-rights reviewer cannot gain rights legal-adjudication authority",
  (value) => {
    value.roleSeparation[1].forbiddenScope =
      value.roleSeparation[1].forbiddenScope.filter((entry) => entry !== "rights_legal_conclusion");
  },
  "ROLE_SEPARATION_INVALID"
);
mutationTest(
  "domain expert scope cannot omit source text translation commentary and carrier relevance",
  (value) => {
    value.roleSeparation[0].allowedScope = value.roleSeparation[0].allowedScope.filter(
      (entry) => entry !== "vedic_source_text_translation_commentary_and_carrier_content_relevance"
    );
  },
  "ROLE_SEPARATION_INVALID"
);
mutationTest(
  "all eight questions must remain assigned to the Vedic domain-expert role",
  (value) => { value.reviewQuestions[0].assignedReviewerRoleId = "source_rights_reviewer"; },
  "QUESTION_COVERAGE_INVALID"
);
mutationTest(
  "review scope cannot drop one current subject",
  (value) => {
    value.reviewScope.requirementSubjectIds.pop();
    value.reviewScope.requirementSubjectCount = 37;
  },
  "REVIEW_SCOPE_INVALID"
);
mutationTest(
  "question coverage cannot duplicate a subject",
  (value) => {
    value.reviewQuestions[7].coveredSubjectIds[1] =
      value.reviewQuestions[7].coveredSubjectIds[0];
  },
  "QUESTION_COVERAGE_INVALID"
);
mutationTest(
  "plan cannot bind its parent",
  (value) => { value.boundaryBindings.planBindsParent = true; },
  "BOUND_ARTIFACT_CLOSURE_INVALID"
);
mutationTest(
  "plan cannot bind runtime proposal",
  (value) => { value.boundaryBindings.planBindsRuntimeProposal = true; },
  "BOUND_ARTIFACT_CLOSURE_INVALID"
);
mutationTest(
  "plan cannot remove source-rights prerequisite binding",
  (value) => { value.boundaryBindings.planBindsSourceRightsRequirements = false; },
  "BOUND_ARTIFACT_CLOSURE_INVALID"
);
mutationTest(
  "plan cannot omit one closure path",
  (value) => { value.boundaryBindings.chainOrder.pop(); },
  "BOUND_ARTIFACT_CLOSURE_INVALID"
);

test("wrong digest is rejected before current closure comparison", async () => {
  const candidate = clone(await currentPlan());
  candidate.planDigest = "0".repeat(64);
  await assert.rejects(
    () => verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, candidate),
    (error) => error.code === "PLAN_DIGEST_MISMATCH"
  );
});

test("unknown top-level field is rejected even after re-signing", async () => {
  const candidate = clone(await currentPlan());
  candidate.ready = false;
  resign(candidate);
  await assert.rejects(
    () => verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, candidate),
    (error) => error.code === "PLAN_INVALID"
  );
});

test("builder and saved materialization are exactly equal", async () => {
  assert.deepEqual(
    await buildCurrentVedicRealIndependentExpertReviewPlan(workspaceRoot),
    await currentPlan()
  );
});

test("read API accepts a copied exact closure", async (t) => {
  const root = await makeFixture(t);
  const plan = await readVedicRealIndependentExpertReviewPlan(root);
  assert.equal(plan.planDigest, expectedDigest);
});

test("read API rejects a missing plan with scoped code", async (t) => {
  const root = await makeFixture(t);
  await rm(path.resolve(
    root,
    ...VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH.split("/")
  ));
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(root),
    (error) => error.code === "PLAN_MISSING"
  );
});

test("read API rejects non-canonical extra newline", async (t) => {
  const root = await makeFixture(t);
  await appendFile(
    path.resolve(root, ...VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH.split("/")),
    "\n",
    "utf8"
  );
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(root),
    (error) => error.code === "JSON_NON_CANONICAL"
  );
});

test("source-rights child raw drift fails the plan closure before semantic promotion", async (t) => {
  const root = await makeFixture(t);
  const sourcePath = path.resolve(
    root,
    ...vedicRealIndependentExpertReviewPlanTestOnly.CHAIN_ORDER.at(-1).split("/")
  );
  await appendFile(sourcePath, "\n", "utf8");
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(root),
    (error) => error.code === "SOURCE_RIGHTS_REQUIREMENTS_IDENTITY_MISMATCH"
  );
});

test("plan file hard-link endpoint is rejected", async (t) => {
  const root = await makeFixture(t);
  const planPath = path.resolve(
    root,
    ...VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH.split("/")
  );
  const seed = path.join(root, "hardlink-plan-seed.json");
  await copyFile(planPath, seed);
  await rm(planPath);
  await link(seed, planPath);
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(root),
    (error) => error.code === "PLAN_ENDPOINT_INVALID"
  );
});

test("source-rights child hard-link endpoint is rejected", async (t) => {
  const root = await makeFixture(t);
  const relativePath = vedicRealIndependentExpertReviewPlanTestOnly.CHAIN_ORDER.at(-1);
  const sourcePath = path.resolve(root, ...relativePath.split("/"));
  const seed = path.join(root, "hardlink-source-rights-seed.json");
  await copyFile(sourcePath, seed);
  await rm(sourcePath);
  await link(seed, sourcePath);
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(root),
    (error) => error.code === "SOURCE_RIGHTS_REQUIREMENTS_ENDPOINT_INVALID"
  );
});

test("plan file symlink endpoint is rejected when symlink creation is available", async (t) => {
  const root = await makeFixture(t);
  const planPath = path.resolve(
    root,
    ...VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH.split("/")
  );
  const alternate = path.join(root, "alternate-plan.json");
  await copyFile(planPath, alternate);
  await rm(planPath);
  try {
    await symlink(alternate, planPath, "file");
  } catch (cause) {
    if (cause?.code === "EPERM") {
      t.skip("Windows symlink privilege unavailable");
      return;
    }
    throw cause;
  }
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(root),
    (error) => error.code === "PLAN_ENDPOINT_INVALID"
  );
});

test("source-rights child symlink endpoint is rejected when symlink creation is available", async (t) => {
  const root = await makeFixture(t);
  const relativePath = vedicRealIndependentExpertReviewPlanTestOnly.CHAIN_ORDER.at(-1);
  const sourcePath = path.resolve(root, ...relativePath.split("/"));
  const alternate = path.join(root, "alternate-source-rights.json");
  await copyFile(sourcePath, alternate);
  await rm(sourcePath);
  try {
    await symlink(alternate, sourcePath, "file");
  } catch (cause) {
    if (cause?.code === "EPERM") {
      t.skip("Windows symlink privilege unavailable");
      return;
    }
    throw cause;
  }
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(root),
    (error) => error.code === "SOURCE_RIGHTS_REQUIREMENTS_ENDPOINT_INVALID"
  );
});

test("plan reader rejects a junction or directory symlink in its content chain", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-expert-plan-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-expert-plan-linked-"));
  t.after(async () => rm(linkedRoot, { recursive: true, force: true }));
  for (const relativePath of closurePaths.filter((entry) => entry.startsWith("docs/"))) {
    const source = path.resolve(realRoot, ...relativePath.split("/"));
    const target = path.resolve(linkedRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  try {
    await symlink(
      path.join(realRoot, "content"),
      path.join(linkedRoot, "content"),
      process.platform === "win32" ? "junction" : "dir"
    );
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.skip("platform does not permit a junction or directory symlink");
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(linkedRoot),
    (error) => error?.code === "PLAN_ENDPOINT_INVALID"
  );
});

test("safe path helper rejects absolute, traversal and noncanonical paths", () => {
  for (const candidate of [
    "../outside.json",
    "content/../outside.json",
    "/absolute.json",
    "C:/absolute.json",
    "content\\plan.json",
    "content//plan.json"
  ]) {
    assert.throws(
      () => vedicRealIndependentExpertReviewPlanTestOnly.safeWorkspaceFile(
        workspaceRoot,
        candidate
      ),
      (error) => error.code === "PATH_INVALID"
    );
  }
});

test("fixture cannot replace the plan with arbitrary canonical JSON", async (t) => {
  const root = await makeFixture(t);
  const planPath = path.resolve(
    root,
    ...VEDIC_REAL_INDEPENDENT_EXPERT_REVIEW_PLAN_RELATIVE_PATH.split("/")
  );
  await writeFile(planPath, "{}\n", "utf8");
  await assert.rejects(
    () => readVedicRealIndependentExpertReviewPlan(root),
    (error) => error.code === "PLAN_INVALID"
  );
});
