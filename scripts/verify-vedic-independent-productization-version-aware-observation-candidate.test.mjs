import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  cp,
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { before, test } from "node:test";

import {
  buildCurrentVedicProductizationVersionAwareObservationCandidate,
  canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate,
  computeVedicProductizationVersionAwareObservationCandidateDigest,
  isVerifiedVedicProductizationVersionAwareObservationCandidate,
  loadVedicProductizationVersionAwareObservationCandidate,
  parseVedicProductizationVersionAwareObservationCandidateJsonBytes,
  readCurrentVedicProductizationVersionAwareObservationCandidate,
  VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
  verifyVedicProductizationVersionAwareObservationCandidateObject,
  vedicProductizationVersionAwareObservationCandidateTestOnly as testOnly
} from "./vedic-independent-productization-version-aware-observation-candidate-lib.mjs";
import {
  canonicalPrettyStringifyVedicProductizationRequirements,
  computeVedicProductizationRequirementsDigest
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  canonicalPrettyStringifyVedicInputStructuralRejectionEvidence,
  computeVedicInputStructuralRejectionEvidenceDigest
} from "./vedic-input-structural-rejection-evidence-lib.mjs";
import {
  canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft,
  computeVedicHighRiskExpressionPolicyDraftDigest
} from "./vedic-high-risk-expression-policy-draft-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const candidateAbsolutePath = path.join(
  workspaceRoot,
  ...VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH.split("/")
);
const libraryAbsolutePath = path.join(
  scriptsDirectory,
  "vedic-independent-productization-version-aware-observation-candidate-lib.mjs"
);
const cliAbsolutePath = path.join(
  scriptsDirectory,
  "verify-vedic-independent-productization-version-aware-observation-candidate.mjs"
);

let built;
let readCurrent;
let loaded;
let persistedBytes;
let persisted;

before(async () => {
  persistedBytes = await readFile(candidateAbsolutePath);
  persisted =
    parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
      persistedBytes
    );
  built =
    await buildCurrentVedicProductizationVersionAwareObservationCandidate(
      workspaceRoot
    );
  readCurrent =
    await readCurrentVedicProductizationVersionAwareObservationCandidate(
      workspaceRoot
    );
  loaded =
    await loadVedicProductizationVersionAwareObservationCandidate(workspaceRoot);
});

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

function sanitizedEnvironment(overrides = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_PATH;
  return { ...environment, ...overrides };
}

function resignCandidate(mutator) {
  const candidate = structuredClone(built);
  mutator(candidate);
  candidate.candidateDigest =
    computeVedicProductizationVersionAwareObservationCandidateDigest(candidate);
  return candidate;
}

function assertSelfResignedRejected(mutator) {
  const candidate = resignCandidate(mutator);
  assert.equal(
    candidate.candidateDigest,
    computeVedicProductizationVersionAwareObservationCandidateDigest(candidate)
  );
  assert.throws(
    () => verifyVedicProductizationVersionAwareObservationCandidateObject(
      candidate
    ),
    (error) => error?.code === "CANDIDATE_OBJECT_MISMATCH"
  );
  assert.equal(
    isVerifiedVedicProductizationVersionAwareObservationCandidate(candidate),
    false
  );
}

async function createWorkspaceFixture(t) {
  const fixtureRoot = await mkdtemp(
    path.join(tmpdir(), "hakimi-vedic-observation-")
  );
  t.after(async () => {
    const resolved = path.resolve(fixtureRoot);
    assert.equal(
      path.basename(resolved).startsWith("hakimi-vedic-observation-"),
      true
    );
    await rm(resolved, { recursive: true, force: true });
  });
  for (const relative of ["content/system-admission", "docs", "scripts"]) {
    await cp(
      path.join(workspaceRoot, ...relative.split("/")),
      path.join(fixtureRoot, ...relative.split("/")),
      { recursive: true }
    );
  }
  return fixtureRoot;
}

async function readJson(relativePath, root = workspaceRoot) {
  return JSON.parse(await readFile(
    path.join(root, ...relativePath.split("/")),
    "utf8"
  ));
}

async function writeCanonical(relativePath, value, serializer, root) {
  await writeFile(
    path.join(root, ...relativePath.split("/")),
    serializer(value),
    "utf8"
  );
}

test("fixed loader uniquely mints the private current observation brand", async () => {
  const verifiedObject =
    verifyVedicProductizationVersionAwareObservationCandidateObject(persisted);
  assert.deepEqual(built, persisted);
  assert.deepEqual(readCurrent, persisted);
  assert.equal(
    isVerifiedVedicProductizationVersionAwareObservationCandidate(loaded),
    true
  );
  for (const value of [
    built,
    readCurrent,
    persisted,
    verifiedObject,
    structuredClone(loaded),
    { ...loaded },
    Object.create(loaded),
    new Proxy({}, {})
  ]) {
    assert.equal(
      isVerifiedVedicProductizationVersionAwareObservationCandidate(value),
      false
    );
  }
  assert.deepEqual(Object.keys(loaded), [
    "activeAdmissionEffect",
    "admissionAccounting",
    "artifact",
    "authorityRedGates",
    "candidateDigest",
    "candidateId",
    "currentVedicProductizationObservationMechanicallyVerified",
    "directCurrentContextAccounting",
    "fixedProjectGovernanceContext",
    "highRiskPolicyAccounting",
    "inputDiagnosticAccounting",
    "observationRedGates",
    "parentLedgerUpdated",
    "registryUpdated",
    "vedicProductIdentity",
    "versionBoundary"
  ]);
  assertDeepFrozen(loaded);
  assert.equal("storedParentSnapshot" in loaded, false);
  assert.equal("currentObservationOverlays" in loaded, false);

  const isolated = await import(
    "./vedic-independent-productization-version-aware-observation-candidate-lib.mjs?brand-isolation-test"
  );
  assert.equal(
    isolated.isVerifiedVedicProductizationVersionAwareObservationCandidate(
      loaded
    ),
    false
  );
  const isolatedResult =
    await isolated.loadVedicProductizationVersionAwareObservationCandidate(
      workspaceRoot
    );
  assert.equal(
    isVerifiedVedicProductizationVersionAwareObservationCandidate(
      isolatedResult
    ),
    false
  );
  assert.equal(
    isolated.isVerifiedVedicProductizationVersionAwareObservationCandidate(
      isolatedResult
    ),
    true
  );
});

test("three exact ordered contexts are current-compared without invented upstream brands", async () => {
  const closure = await testOnly.collectDirectCurrentContexts(workspaceRoot);
  assert.deepEqual(closure, {
    contexts: [
      {
        artifactId: "hakimi.vedic.independent-productization-requirements/1.0.0",
        bytes: 25578,
        contextId: "historical_parent_requirements_ledger_v1",
        path: "content/system-admission/vedic-independent-productization-requirements.v1.json",
        role: "stored_parent_baseline",
        semanticDigest: "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb",
        semanticDigestField: "ledgerDigest",
        sha256: "c9f0fbb3b25c3ad582dc4c3f5534e7e27cb44e47721dbf806b8085cefb6b26f8",
        status:
          "input_fact_rule_contract_drafts_runtime_bundle_proposal_source_rights_requirements_only_inventory_and_two_vacant_seat_expert_review_plan_present_open_universe_zero_bindings_zero_expert_instances_research_only_not_admitted"
      },
      {
        artifactId: "hakimi.vedic.input-structural-rejection-execution-evidence/1.0.0",
        bytes: 26585,
        contextId: "post_parent_input_structural_rejection_diagnostics_v1",
        path: "content/system-admission/vedic-input-structural-rejection-execution-evidence.v1.json",
        role: "post_parent_observation_child",
        semanticDigest: "b068269d809d49e6ff2f8a80ee2c3ee2bcb649f9fbfc0cb1fa3240b3722422a2",
        semanticDigestField: "evidenceDigest",
        sha256: "da953b36a3bef662833ae5763e3cdde7dd84b129089e96a8445ddbc582d1a67f",
        status: "four_fixed_diagnostic_rejection_probes_verified_not_product_admitted"
      },
      {
        artifactId: "hakimi.vedic.high-risk-expression-policy-draft/0.1.0",
        bytes: 15788,
        contextId: "post_parent_high_risk_requirements_policy_v0_1",
        path: "content/system-admission/vedic-high-risk-expression-policy-draft.v0.1.0.json",
        role: "post_parent_requirements_only_child",
        semanticDigest: "bc1996b042e84214f86d35416c4589e3309a5654250e43c30688568a28ee9fb9",
        semanticDigestField: "policyDigest",
        sha256: "8a1295c4f68da87a50ac2d6f8689765c271e007a68d63dfe2afa88377d94f5fa",
        status: "requirements_only_engineering_candidate_not_admitted"
      }
    ],
    currentVerifierPasses: {
      highRiskRequirementsPolicy: true,
      historicalParent: true,
      inputStructuralDiagnostics: true
    },
    directCurrentContextCount: 3,
    upstreamCapabilityBrandCount: 0
  });
  assert.equal(
    new Set(built.directCurrentContextBoundary.contexts.map(
      (context) => context.path
    )).size,
    3
  );
  assert.equal(
    built.directCurrentContextBoundary.contexts.every(
      (context) => context.currentClosureVerifierPassed === true
        && context.privateCapabilityBrandConsumed === false
        && context.activeAdmissionEffect === "none"
    ),
    true
  );
});

test("version-aware candidate remains an observation and never rewrites its parent", () => {
  assert.deepEqual(built.versionComparison, {
    baselineParentSchemaVersion: "1.0.0",
    candidateIsFormalParent: false,
    observationCandidateSchemaVersion: "1.1.0",
    ownerAcceptanceVerified: false,
    ownerDecision: null,
    parentRewritten: false,
    supersedesBaseline: false,
    supersessionReceipt: null
  });
  assert.equal(built.storedParentSnapshot.parentLedgerUpdated, false);
  assert.equal(built.storedParentSnapshot.registryUpdated, false);
  assert.equal(built.storedParentSnapshot.storedParentReflectsCurrentChildren, false);
  assert.equal(
    built.storedParentSnapshot.baselineParentIncludesInputEvidenceChild,
    false
  );
  assert.equal(
    built.storedParentSnapshot.baselineParentIncludesHighRiskPolicyChild,
    false
  );
  assert.equal(built.productBoundary.runtimeImplementation, "absent");
  assert.equal(built.productBoundary.productSurface, "absent");
  assert.equal(built.productBoundary.activeAdmissionEffect, "none");
});

test("four fixed diagnostics cannot be self-resigned into an input admission gate", () => {
  const normal = built.currentObservationOverlays[0];
  assert.deepEqual({
    diagnosticProbeExecutions: normal.diagnosticProbeExecutions,
    acceptedInputs: normal.acceptedInputs,
    inputInstances: normal.inputInstances,
    productInputRejectionReceipts: normal.productInputRejectionReceipts,
    inputRejectionCapabilityEstablished:
      normal.inputRejectionCapabilityEstablished,
    probeCoverageComplete: normal.probeCoverageComplete,
    inputContractGateSatisfied: normal.inputContractGateSatisfied
  }, {
    diagnosticProbeExecutions: 4,
    acceptedInputs: 0,
    inputInstances: 0,
    productInputRejectionReceipts: 0,
    inputRejectionCapabilityEstablished: false,
    probeCoverageComplete: false,
    inputContractGateSatisfied: false
  });
  const attacks = [
    (value) => { value.currentObservationOverlays[0].acceptedInputs = 1; },
    (value) => { value.currentObservationOverlays[0].inputInstances = 1; },
    (value) => {
      value.currentObservationOverlays[0].productInputRejectionReceipts = 1;
    },
    (value) => {
      value.currentObservationOverlays[0].inputRejectionCapabilityEstablished = true;
    },
    (value) => {
      value.currentObservationOverlays[0].probeCoverageComplete = true;
    },
    (value) => {
      value.currentObservationOverlays[0].inputContractGateSatisfied = true;
    },
    (value) => {
      value.currentObservationOverlays[0].requirementsResolved = 1;
    },
    (value) => {
      value.currentObservationOverlays[0].requirementsUniverseClosed = true;
    },
    (value) => { value.gateSummary.admissionGatesSatisfied = 1; }
  ];
  for (const attack of attacks) assertSelfResignedRejected(attack);
});

test("requirements-only policy cannot be self-resigned into admission or enforcement", () => {
  const normal = built.currentObservationOverlays[1];
  assert.deepEqual({
    requirementsMaterialDefined: normal.requirementsMaterialDefined,
    highRiskPolicyCandidatePresent: normal.highRiskPolicyCandidatePresent,
    highRiskPolicyEstablished: normal.highRiskPolicyEstablished,
    highRiskPolicyGateSatisfied: normal.highRiskPolicyGateSatisfied,
    enforcementImplemented: normal.enforcementImplemented,
    receiptIssued: normal.receiptIssued,
    enforcementReceipts: normal.enforcementReceipts,
    riskUniverseClosed: normal.riskUniverseClosed
  }, {
    requirementsMaterialDefined: true,
    highRiskPolicyCandidatePresent: true,
    highRiskPolicyEstablished: false,
    highRiskPolicyGateSatisfied: false,
    enforcementImplemented: false,
    receiptIssued: false,
    enforcementReceipts: 0,
    riskUniverseClosed: false
  });
  const attacks = [
    (value) => {
      value.currentObservationOverlays[1].highRiskPolicyEstablished = true;
    },
    (value) => {
      value.currentObservationOverlays[1].highRiskPolicyGateSatisfied = true;
    },
    (value) => {
      value.currentObservationOverlays[1].enforcementImplemented = true;
    },
    (value) => {
      value.currentObservationOverlays[1].receiptIssued = true;
    },
    (value) => {
      value.currentObservationOverlays[1].enforcementReceipts = 1;
    },
    (value) => {
      value.currentObservationOverlays[1].riskUniverseClosed = true;
    },
    (value) => { value.gateSummary.highRiskPolicyGateSatisfied = true; }
  ];
  for (const attack of attacks) assertSelfResignedRejected(attack);
});

test("global red accounting and independent Vedic identity cannot be promoted", () => {
  assert.deepEqual(built.gateSummary, {
    admissionGatesRequired: 8,
    admissionGatesSatisfied: 0,
    bindingFrozenVerified: 0,
    bindingRequired: 38,
    bindingRequirementsInventoryDefined: true,
    expertOpinionsVerified: 0,
    expertReviewBundleComplete: false,
    formalAdmissionPromotionBlocked: true,
    highRiskPolicyGateSatisfied: false,
    independentExpertReviewsVerified: 0,
    independentExpertsRequired: 2,
    inputContractGateSatisfied: false,
    productArtifactIncrementFromOverlays: 0,
    productArtifactsPresent: 3,
    publicReleaseAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    requirementsUniverseClosed: false,
    rereviewRequirementsComplete: 3,
    rereviewRequirementsRequired: 7,
    rereviewTriggered: false,
    reviewerSeatsFilled: 0,
    rightsBundleComplete: false,
    sourceBundleComplete: false
  });
  assert.deepEqual({
    releaseIdentity: built.productBoundary.releaseIdentity,
    targetSchema: built.productBoundary.targetSchema,
    migrationId: built.productBoundary.migrationId,
    legacyV13Inherited: built.productBoundary.legacyV13Inherited,
    schema13Inherited: built.productBoundary.schema13Inherited,
    baziAuthorityInherited: built.productBoundary.baziAuthorityInherited
  }, {
    releaseIdentity: null,
    targetSchema: null,
    migrationId: null,
    legacyV13Inherited: false,
    schema13Inherited: false,
    baziAuthorityInherited: false
  });
  const attacks = [
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.gateSummary.requirementsUniverseClosed = true; },
    (value) => { value.gateSummary.independentExpertReviewsVerified = 1; },
    (value) => { value.gateSummary.reviewerSeatsFilled = 1; },
    (value) => { value.gateSummary.productArtifactsPresent = 5; },
    (value) => { value.gateSummary.rereviewRequirementsComplete = 4; },
    (value) => { value.gateSummary.rereviewTriggered = true; },
    (value) => { value.productBoundary.releaseIdentity = "legacy-v13"; },
    (value) => { value.productBoundary.targetSchema = 13; },
    (value) => { value.productBoundary.legacyV13Inherited = true; },
    (value) => { value.productBoundary.schema13Inherited = true; },
    (value) => { value.productBoundary.baziAuthorityInherited = true; },
    (value) => { value.productBoundary.parentLedgerUpdated = true; },
    (value) => { value.productBoundary.registryUpdated = true; },
    (value) => { value.productBoundary.activeAdmissionEffect = "admit"; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.authorityBoundary.expertClaimsAuthorized = true; }
  ];
  for (const attack of attacks) assertSelfResignedRejected(attack);
});

test("endpoint observations cannot be self-resigned into atomic or epoch evidence", () => {
  assert.deepEqual(built.observationBoundary, {
    abaExcluded: false,
    candidateHashAndParseUseSameHeldHandleBuffer: true,
    candidateObjectCarriesPrivateBrand: false,
    crossFileAtomicSnapshot: false,
    directContextEndpointSnapshots: 3,
    endpointSnapshotOnly: true,
    fixedLoaderMayReturnPrivateBrandedEnvelope: true,
    heldFileHandleReads: true,
    intervalMutationExcluded: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    parentAndChildrenAtomicSnapshot: false,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true,
    privateBrandMeaning:
      "fixed_path_endpoint_mechanical_observation_only_not_continued_currentness_or_authority",
    sameBufferHashAndParsePerDirectContext: true
  });
  const attacks = [
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => {
      value.observationBoundary.parentAndChildrenAtomicSnapshot = true;
    },
    (value) => { value.observationBoundary.mutationEpochAvailable = true; },
    (value) => {
      value.observationBoundary.mutationEpochReceipt = { epoch: 1 };
    },
    (value) => { value.observationBoundary.intervalMutationExcluded = true; },
    (value) => { value.observationBoundary.abaExcluded = true; },
    (value) => {
      value.observationBoundary.candidateObjectCarriesPrivateBrand = true;
    }
  ];
  for (const attack of attacks) assertSelfResignedRejected(attack);
});

test("self-resigned candidate and each self-resigned direct context fail closed", async (t) => {
  await t.test("candidate", async (t) => {
    const fixture = await createWorkspaceFixture(t);
    const candidate = await readJson(
      VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
      fixture
    );
    candidate.authorityBoundary.releaseReady = true;
    candidate.candidateDigest =
      computeVedicProductizationVersionAwareObservationCandidateDigest(
        candidate
      );
    await writeCanonical(
      VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
      candidate,
      canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate,
      fixture
    );
    await assert.rejects(
      loadVedicProductizationVersionAwareObservationCandidate(fixture),
      (error) => error?.code === "CANDIDATE_OBJECT_MISMATCH"
        || error?.code === "PERSISTED_RAW_IDENTITY_DRIFT"
    );
  });

  await t.test("historical parent", async (t) => {
    const fixture = await createWorkspaceFixture(t);
    const relative = testOnly.PARENT_CONTEXT.path;
    const parent = await readJson(relative, fixture);
    parent.gateSummary.admissionGatesSatisfied = 1;
    parent.ledgerDigest = computeVedicProductizationRequirementsDigest(parent);
    await writeCanonical(
      relative,
      parent,
      canonicalPrettyStringifyVedicProductizationRequirements,
      fixture
    );
    await assert.rejects(
      loadVedicProductizationVersionAwareObservationCandidate(fixture),
      (error) => error?.code === "DIRECT_CONTEXT_RAW_IDENTITY_MISMATCH"
    );
  });

  await t.test("input diagnostics", async (t) => {
    const fixture = await createWorkspaceFixture(t);
    const relative = testOnly.INPUT_CONTEXT.path;
    const input = await readJson(relative, fixture);
    input.receiptBoundary.inputContractGateSatisfied = true;
    input.evidenceDigest =
      computeVedicInputStructuralRejectionEvidenceDigest(input);
    await writeCanonical(
      relative,
      input,
      canonicalPrettyStringifyVedicInputStructuralRejectionEvidence,
      fixture
    );
    await assert.rejects(
      loadVedicProductizationVersionAwareObservationCandidate(fixture),
      (error) => error?.code === "DIRECT_CONTEXT_RAW_IDENTITY_MISMATCH"
    );
  });

  await t.test("high-risk requirements policy", async (t) => {
    const fixture = await createWorkspaceFixture(t);
    const relative = testOnly.HIGH_RISK_CONTEXT.path;
    const policy = await readJson(relative, fixture);
    policy.admissionProjection.highRiskPolicyGateSatisfied = true;
    policy.policyDigest = computeVedicHighRiskExpressionPolicyDraftDigest(policy);
    await writeCanonical(
      relative,
      policy,
      canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft,
      fixture
    );
    await assert.rejects(
      loadVedicProductizationVersionAwareObservationCandidate(fixture),
      (error) => error?.code === "DIRECT_CONTEXT_RAW_IDENTITY_MISMATCH"
    );
  });
});

test("transitive upstream drift is rejected by current verifiers while direct raw identities stay unchanged", async (t) => {
  await t.test("parent ADR closure", async (t) => {
    const fixture = await createWorkspaceFixture(t);
    const relative = "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
    const absolute = path.join(fixture, ...relative.split("/"));
    const source = await readFile(absolute, "utf8");
    await writeFile(absolute, source + "\n", "utf8");
    await assert.rejects(
      loadVedicProductizationVersionAwareObservationCandidate(fixture),
      (error) => error?.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
        || error?.code === "LEDGER_MISMATCH"
    );
  });

  await t.test("input execution closure", async (t) => {
    const fixture = await createWorkspaceFixture(t);
    const relative =
      "scripts/vedic-input-structural-rejection-execution-lib.mjs";
    const absolute = path.join(fixture, ...relative.split("/"));
    const source = await readFile(absolute, "utf8");
    await writeFile(absolute, source + "\n", "utf8");
    await assert.rejects(
      loadVedicProductizationVersionAwareObservationCandidate(fixture),
      (error) => error?.code === "EVIDENCE_CURRENT_CLOSURE_MISMATCH"
        || error?.code === "LOCAL_EXECUTION_CLOSURE_INVALID"
    );
  });
});

test("strict byte parser rejects ambiguous or unsafe byte sources", () => {
  const invalidInputs = [
    Buffer.from("{\"x\":1,\"x\":2}\n", "utf8"),
    Buffer.from("{\"x\":1,\"\\u0078\":2}\n", "utf8"),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}\n")]),
    Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]),
    Buffer.from("[]\n", "utf8"),
    Buffer.from("{} trailing", "utf8"),
    new Int8Array([123, 125]),
    { 0: 123, 1: 125, length: 2 },
    new Proxy(new Uint8Array([123, 125]), {})
  ];
  for (const input of invalidInputs) {
    assert.throws(
      () =>
        parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
          input
        )
    );
  }
  assert.throws(() =>
    parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
      new Uint8Array(testOnly.MAX_CANDIDATE_BYTES + 1)
    )
  );

  if (typeof SharedArrayBuffer === "function") {
    const shared = new Uint8Array(new SharedArrayBuffer(2));
    shared[0] = 123;
    shared[1] = 125;
    assert.throws(() =>
      parseVedicProductizationVersionAwareObservationCandidateJsonBytes(shared)
    );
  }
  const resizableDescriptor = Object.getOwnPropertyDescriptor(
    ArrayBuffer.prototype,
    "resizable"
  );
  if (typeof resizableDescriptor?.get === "function") {
    const resizable = new ArrayBuffer(2, { maxByteLength: 4 });
    const view = new Uint8Array(resizable);
    view[0] = 123;
    view[1] = 125;
    assert.throws(() =>
      parseVedicProductizationVersionAwareObservationCandidateJsonBytes(view)
    );
  }
  if (typeof structuredClone === "function") {
    const buffer = new ArrayBuffer(2);
    const detached = new Uint8Array(buffer);
    structuredClone(buffer, { transfer: [buffer] });
    assert.throws(() =>
      parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
        detached
      )
    );
  }

  let hookCalled = false;
  class PassiveSubclass extends Uint8Array {
    toJSON() {
      hookCalled = true;
      return [];
    }

    [Symbol.iterator]() {
      hookCalled = true;
      return super[Symbol.iterator]();
    }
  }
  const subclass = new PassiveSubclass(persistedBytes.byteLength);
  Uint8Array.prototype.set.call(subclass, persistedBytes);
  const parsedSubclass =
    parseVedicProductizationVersionAwareObservationCandidateJsonBytes(
      subclass
    );
  assert.equal(parsedSubclass.candidateId, testOnly.CANDIDATE_ID);
  assert.equal(hookCalled, false);
});

test("object API rejects active objects, aliases, non-finite values and unknown fields", () => {
  let proxyTrapCalled = false;
  const proxy = new Proxy({}, {
    ownKeys() {
      proxyTrapCalled = true;
      return [];
    }
  });
  assert.throws(() =>
    computeVedicProductizationVersionAwareObservationCandidateDigest(proxy)
  );
  assert.equal(proxyTrapCalled, false);

  let getterCalled = false;
  const accessor = {};
  Object.defineProperty(accessor, "x", {
    enumerable: true,
    get() {
      getterCalled = true;
      return 1;
    }
  });
  assert.throws(() =>
    computeVedicProductizationVersionAwareObservationCandidateDigest(accessor)
  );
  assert.equal(getterCalled, false);

  const symbolValue = { x: 1 };
  symbolValue[Symbol("x")] = 2;
  const customPrototype = Object.create({ inherited: true });
  customPrototype.x = 1;
  const sparse = [];
  sparse[1] = 1;
  const shared = { x: 1 };
  const alias = { left: shared, right: shared };
  const cycle = {};
  cycle.self = cycle;
  for (const value of [
    symbolValue,
    customPrototype,
    sparse,
    alias,
    cycle,
    { x: Number.NaN },
    { x: Number.POSITIVE_INFINITY },
    { x: -0 }
  ]) {
    assert.throws(() =>
      computeVedicProductizationVersionAwareObservationCandidateDigest(value)
    );
  }

  const unknown = structuredClone(built);
  unknown.unexpected = true;
  unknown.candidateDigest =
    computeVedicProductizationVersionAwareObservationCandidateDigest(unknown);
  assert.throws(
    () => verifyVedicProductizationVersionAwareObservationCandidateObject(
      unknown
    ),
    (error) => error?.code === "CANDIDATE_OBJECT_MISMATCH"
  );
});

test("fixed endpoint reader rejects unsafe paths, hardlinks and linked directory chains", async (t) => {
  for (const unsafe of [
    "../x.json",
    "/absolute.json",
    "C:/absolute.json",
    "content\\x.json",
    "content/x:ads.json",
    "content/./x.json",
    "content/../x.json",
    "content//x.json",
    "\0.json"
  ]) {
    assert.throws(() => testOnly.safeWorkspaceFile(workspaceRoot, unsafe));
  }

  const root = await mkdtemp(path.join(tmpdir(), "hakimi-vedic-endpoint-"));
  t.after(async () => {
    const resolved = path.resolve(root);
    assert.equal(
      path.basename(resolved).startsWith("hakimi-vedic-endpoint-"),
      true
    );
    await rm(resolved, { recursive: true, force: true });
  });
  await mkdir(path.join(root, "content"), { recursive: true });
  const first = path.join(root, "content", "a.json");
  const second = path.join(root, "content", "b.json");
  await writeFile(first, "{}\n", "utf8");
  await link(first, second);
  await assert.rejects(
    testOnly.readStableWorkspaceFile(root, "content/a.json"),
    (error) => error?.code === "ARTIFACT_ENDPOINT_INVALID"
  );

  const realDirectory = path.join(root, "real");
  const linkedDirectory = path.join(root, "linked");
  await mkdir(realDirectory);
  await writeFile(path.join(realDirectory, "x.json"), "{}\n", "utf8");
  try {
    await symlink(realDirectory, linkedDirectory, "junction");
    await assert.rejects(
      testOnly.readStableWorkspaceFile(root, "linked/x.json"),
      (error) => error?.code === "ARTIFACT_ENDPOINT_INVALID"
    );
  } catch (error) {
    if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) throw error;
  }
});

test("post-import Buffer and FileHandle prototype poisoning cannot substitute pinned bytes for a changed fixed candidate", async (t) => {
  const fixture = await createWorkspaceFixture(t);
  const absolute = path.join(
    fixture,
    ...VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
      .split("/")
  );
  const source = await readFile(absolute, "utf8");
  const evilSource = source.replace(
    "\"activeAdmissionEffect\": \"none\"",
    "\"activeAdmissionEffect\": \"evil\""
  );
  assert.notEqual(evilSource, source);
  assert.equal(Buffer.byteLength(evilSource), Buffer.byteLength(source));
  await writeFile(absolute, evilSource, "utf8");

  const originalSubarray = Buffer.prototype.subarray;
  Buffer.prototype.subarray = function poisonedSubarray(start, end) {
    if (this.byteLength === persistedBytes.byteLength) {
      return Buffer.from(persistedBytes);
    }
    return Reflect.apply(originalSubarray, this, [start, end]);
  };
  try {
    await assert.rejects(
      loadVedicProductizationVersionAwareObservationCandidate(fixture)
    );
  } finally {
    Buffer.prototype.subarray = originalSubarray;
  }

  const probeHandle = await open(absolute, "r");
  const fileHandlePrototype = Object.getPrototypeOf(probeHandle);
  const originalRead = fileHandlePrototype.read;
  await probeHandle.close();
  fileHandlePrototype.read = async function poisonedRead(...args) {
    const result = await Reflect.apply(originalRead, this, args);
    if (args[0]?.byteLength === persistedBytes.byteLength) {
      Uint8Array.prototype.set.call(args[0], persistedBytes, 0);
    }
    return result;
  };
  try {
    await assert.rejects(
      loadVedicProductizationVersionAwareObservationCandidate(fixture)
    );
  } finally {
    fileHandlePrototype.read = originalRead;
  }
  assert.equal((await readFile(absolute, "utf8")).includes(
    "\"activeAdmissionEffect\": \"evil\""
  ), true);
});

test("captured brand intrinsics resist post-import prototype poisoning", async () => {
  const moduleUrl = pathToFileURL(libraryAbsolutePath).href;
  const script = [
    "const m = await import(" + JSON.stringify(moduleUrl) + ");",
    "const r = await m.loadVedicProductizationVersionAwareObservationCandidate(" +
      JSON.stringify(workspaceRoot) + ");",
    "const originalHas = WeakSet.prototype.has;",
    "const originalAdd = WeakSet.prototype.add;",
    "const originalApply = Reflect.apply;",
    "try {",
    "  WeakSet.prototype.has = () => true;",
    "  WeakSet.prototype.add = () => { throw new Error('poisoned add'); };",
    "  Reflect.apply = () => { throw new Error('poisoned apply'); };",
    "  process.stdout.write(String(m.isVerifiedVedicProductizationVersionAwareObservationCandidate(r)) + ':' + String(m.isVerifiedVedicProductizationVersionAwareObservationCandidate({})));",
    "} finally {",
    "  WeakSet.prototype.has = originalHas;",
    "  WeakSet.prototype.add = originalAdd;",
    "  Reflect.apply = originalApply;",
    "}"
  ].join("\n");
  const result = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    script
  ], {
    cwd: workspaceRoot,
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(result.stdout, "true:false");
});

test("clean-realm brand and freeze primordials fail closed under pre-import global replacement", async () => {
  const moduleUrl = pathToFileURL(libraryAbsolutePath).href;
  const weakSetScript = [
    "globalThis.WeakSet = class PoisonedWeakSet {",
    "  add() { return this; }",
    "  has() { return true; }",
    "};",
    "const m = await import(" +
      JSON.stringify(moduleUrl + "?preimport-weakset=" + Date.now()) + ");",
    "process.stdout.write(String(m.isVerifiedVedicProductizationVersionAwareObservationCandidate({})));"
  ].join("\n");
  const weakSetResult = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    weakSetScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(weakSetResult.stdout, "false");

  const freezeScript = [
    "const originalIsFrozen = Object.isFrozen;",
    "Object.freeze = (value) => value;",
    "const m = await import(" +
      JSON.stringify(moduleUrl + "?preimport-freeze=" + Date.now()) + ");",
    "const result = await m.loadVedicProductizationVersionAwareObservationCandidate(" +
      JSON.stringify(workspaceRoot) + ");",
    "try { result.activeAdmissionEffect = 'admit'; } catch {}",
    "process.stdout.write([originalIsFrozen(result), result.activeAdmissionEffect, m.isVerifiedVedicProductizationVersionAwareObservationCandidate(result)].join(':'));"
  ].join("\n");
  const freezeResult = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    freezeScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(freezeResult.stdout, "true:none:true");

  const ownKeysScript = [
    "const nativeOwnKeys = Reflect.ownKeys;",
    "const originalIsFrozen = Object.isFrozen;",
    "Reflect.ownKeys = (value) =>",
    "  value?.currentVedicProductizationObservationMechanicallyVerified === true",
    "    ? []",
    "    : nativeOwnKeys(value);",
    "const m = await import(" +
      JSON.stringify(moduleUrl + "?preimport-ownkeys=" + Date.now()) + ");",
    "const result = await m.loadVedicProductizationVersionAwareObservationCandidate(" +
      JSON.stringify(workspaceRoot) + ");",
    "try { result.authorityRedGates.releaseReady = true; } catch {}",
    "process.stdout.write([originalIsFrozen(result), originalIsFrozen(result.authorityRedGates), result.authorityRedGates.releaseReady, m.isVerifiedVedicProductizationVersionAwareObservationCandidate(result)].join(':'));"
  ].join("\n");
  const ownKeysResult = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    ownKeysScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(ownKeysResult.stdout, "true:true:false:true");

  const jsonScript = [
    "const nativeParse = JSON.parse;",
    "const nativeStringify = JSON.stringify;",
    "JSON.parse = (...args) => {",
    "  const value = nativeParse(...args);",
    "  if (value?.currentVedicProductizationObservationMechanicallyVerified === true) {",
    "    value.activeAdmissionEffect = 'admit';",
    "    value.authorityRedGates.releaseReady = true;",
    "  }",
    "  return value;",
    "};",
    "JSON.stringify = (value, ...rest) =>",
    "  value === 'currentVedicProductizationObservationMechanicallyVerified'",
    "    ? '\"poisonedMarker\"'",
    "    : nativeStringify(value, ...rest);",
    "const m = await import(" +
      JSON.stringify(moduleUrl + "?preimport-json=" + Date.now()) + ");",
    "const result = await m.loadVedicProductizationVersionAwareObservationCandidate(" +
      JSON.stringify(workspaceRoot) + ");",
    "process.stdout.write([result.activeAdmissionEffect, result.authorityRedGates.releaseReady, Object.isFrozen(result), Object.isFrozen(result.authorityRedGates), m.isVerifiedVedicProductizationVersionAwareObservationCandidate(result), result.currentVedicProductizationObservationMechanicallyVerified].join(':'));"
  ].join("\n");
  const jsonResult = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    jsonScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(jsonResult.stdout, "none:false:true:true:true:true");

  const proxyDetectorScript = [
    "import { types as utilTypes } from 'node:util';",
    "const nativeIsProxy = utilTypes.isProxy;",
    "utilTypes.isProxy = (value) => {",
    "  if (value?.currentVedicProductizationObservationMechanicallyVerified === true) {",
    "    try { value.activeAdmissionEffect = 'admit'; } catch {}",
    "    try { value.authorityRedGates.releaseReady = true; } catch {}",
    "    try { value.authorityRedGates.publicDeploymentAuthorized = true; } catch {}",
    "  }",
    "  return nativeIsProxy(value);",
    "};",
    "const m = await import(" +
      JSON.stringify(moduleUrl + "?preimport-isproxy=" + Date.now()) + ");",
    "const result = await m.loadVedicProductizationVersionAwareObservationCandidate(" +
      JSON.stringify(workspaceRoot) + ");",
    "process.stdout.write([result.activeAdmissionEffect, result.authorityRedGates.releaseReady, result.authorityRedGates.publicDeploymentAuthorized, m.isVerifiedVedicProductizationVersionAwareObservationCandidate(result)].join(':'));"
  ].join("\n");
  const proxyDetectorResult = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    proxyDetectorScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(proxyDetectorResult.stdout, "none:false:false:true");

  const vmFactoryScript = [
    "import vm from 'node:vm';",
    "import { syncBuiltinESMExports } from 'node:module';",
    "const nativeRunInNewContext = vm.runInNewContext;",
    "vm.runInNewContext = (code, ...rest) => {",
    "  const table = nativeRunInNewContext(code, ...rest);",
    "  table.ObjectFreeze = (value) => value;",
    "  table.ObjectIsFrozen = () => true;",
    "  return table;",
    "};",
    "syncBuiltinESMExports();",
    "const m = await import(" +
      JSON.stringify(moduleUrl + "?preimport-vm-factory=" + Date.now()) + ");",
    "try {",
    "  await m.loadVedicProductizationVersionAwareObservationCandidate(" +
      JSON.stringify(workspaceRoot) + ");",
    "  process.stdout.write('unexpected-success');",
    "} catch (error) {",
    "  process.stdout.write('rejected:' + String(error?.code));",
    "}"
  ].join("\n");
  const vmFactoryResult = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    vmFactoryScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(vmFactoryResult.stdout, "rejected:VERIFIED_RESULT_NOT_IMMUTABLE");
});

test("CLI is fixed-path, narrow, red, and ignores path-like environment decoys", async () => {
  const success = await execFileAsync(process.execPath, [cliAbsolutePath], {
    cwd: tmpdir(),
    env: sanitizedEnvironment({
      VEDIC_OBSERVATION_CANDIDATE_PATH: "does-not-exist.json"
    }),
    windowsHide: true,
    timeout: 60_000
  });
  const output = JSON.parse(success.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.currentBrandVerified, true);
  assert.equal(output.loadedModuleByteIdentityVerified, false);
  assert.equal(output.nodeLoaderIntegrityVerified, false);
  assert.equal(output.runtimeLauncherIdentityVerified, false);
  assert.equal(output.activeAdmissionEffect, "none");
  assert.equal(output.admissionAccounting.admissionGatesSatisfied, 0);
  assert.equal(output.admissionAccounting.admissionGatesRequired, 8);
  assert.equal(output.admissionAccounting.bindingFrozenVerified, 0);
  assert.equal(output.admissionAccounting.bindingRequired, 38);
  assert.equal(output.admissionAccounting.independentExpertReviewsVerified, 0);
  assert.equal(output.admissionAccounting.independentExpertsRequired, 2);
  assert.equal(output.inputDiagnosticAccounting.diagnosticProbeExecutions, 4);
  assert.equal(output.inputDiagnosticAccounting.inputContractGateSatisfied, false);
  assert.equal(output.highRiskPolicyAccounting.highRiskPolicyGateSatisfied, false);
  assert.equal(output.highRiskPolicyAccounting.policyEnforced, false);
  assert.deepEqual(output.vedicProductIdentity, {
    migrationId: null,
    releaseIdentity: null,
    targetSchema: null
  });
  assert.equal(output.authorityRedGates.releaseReady, false);
  assert.equal(output.authorityRedGates.publicDeploymentAuthorized, false);
  assert.equal(output.authorityRedGates.expertClaimsAuthorized, false);

  await assert.rejects(
    execFileAsync(process.execPath, [cliAbsolutePath, "decoy.json"], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      windowsHide: true,
      timeout: 60_000
    }),
    (error) => {
      const failure = JSON.parse(error.stderr);
      return failure.code === "CLI_OPERAND_FORBIDDEN";
    }
  );

  const visibleNodeOptions = [
    "--import=data:text/javascript,Object.freeze%3D(value)%3D%3Evalue"
  ];
  for (const nodeOptions of visibleNodeOptions) {
    await assert.rejects(
      execFileAsync(process.execPath, [cliAbsolutePath], {
        cwd: workspaceRoot,
        env: sanitizedEnvironment({ NODE_OPTIONS: nodeOptions }),
        windowsHide: true,
        timeout: 60_000
      }),
      (error) => {
        const failure = JSON.parse(error.stderr);
        return error.code === 2
          && failure.code === "NODE_LAUNCH_STATE_FORBIDDEN";
      }
    );
  }

  await assert.rejects(
    execFileAsync(process.execPath, ["--no-warnings", cliAbsolutePath], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      windowsHide: true,
      timeout: 60_000
    }),
    (error) => {
      const failure = JSON.parse(error.stderr);
      return error.code === 2
        && failure.code === "NODE_LAUNCH_STATE_FORBIDDEN";
    }
  );

  const erasedTrace = await execFileAsync(process.execPath, [cliAbsolutePath], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment({
      NODE_OPTIONS:
        "--import=data:text/javascript,delete%20process.env.NODE_OPTIONS"
    }),
    windowsHide: true,
    timeout: 60_000
  });
  const erasedOutput = JSON.parse(erasedTrace.stdout);
  assert.equal(erasedOutput.currentBrandVerified, true);
  assert.equal(erasedOutput.loadedModuleByteIdentityVerified, false);
  assert.equal(erasedOutput.nodeLoaderIntegrityVerified, false);
  assert.equal(erasedOutput.runtimeLauncherIdentityVerified, false);
});

test("candidate is canonical LF, raw pinned, and has no production or registry backlink", async () => {
  assert.equal(
    persistedBytes.byteLength,
    testOnly.EXPECTED_PERSISTED.rawBytes
  );
  assert.equal(persisted.candidateDigest, testOnly.EXPECTED_PERSISTED.candidateDigest);
  assert.equal(
    canonicalPrettyStringifyVedicProductizationVersionAwareObservationCandidate(
      persisted
    ),
    persistedBytes.toString("utf8")
  );
  assert.equal(persistedBytes.includes(Buffer.from("\r\n")), false);
  assert.equal(persistedBytes[persistedBytes.byteLength - 1], 0x0a);

  const forbiddenNeedles = [
    "vedic-independent-productization-version-aware-observation-candidate",
    "loadVedicProductizationVersionAwareObservationCandidate"
  ];
  const fixedFiles = [
    "content/system-admission/four-system-admission.v1.json",
    "scripts/system-admission-registry-lib.mjs",
    "scripts/vedic-independent-productization-requirements-lib.mjs",
    "scripts/vedic-input-structural-rejection-evidence-lib.mjs",
    "scripts/vedic-high-risk-expression-policy-draft-lib.mjs",
    testOnly.PARENT_CONTEXT.path,
    testOnly.INPUT_CONTEXT.path,
    testOnly.HIGH_RISK_CONTEXT.path
  ];
  for (const relative of fixedFiles) {
    const text = await readFile(
      path.join(workspaceRoot, ...relative.split("/")),
      "utf8"
    );
    for (const needle of forbiddenNeedles) {
      assert.equal(text.includes(needle), false, relative + " contains " + needle);
    }
  }

  const restricted = path.normalize(
    path.join("apps", "web", "src", "lib", "local-user-data-cleanup.ts")
  );
  async function scanDirectory(relativeDirectory) {
    const { readdir } = await import("node:fs/promises");
    const root = path.join(workspaceRoot, relativeDirectory);
    const queue = [root];
    while (queue.length > 0) {
      const directory = queue.pop();
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const absolute = path.join(directory, entry.name);
        const relative = path.relative(workspaceRoot, absolute);
        if (path.normalize(relative) === restricted) continue;
        if (entry.isDirectory()) {
          queue.push(absolute);
        } else if (entry.isFile()
          && /\.(?:[cm]?[jt]sx?|json)$/.test(entry.name)) {
          const text = await readFile(absolute, "utf8");
          for (const needle of forbiddenNeedles) {
            assert.equal(
              text.includes(needle),
              false,
              relative + " contains " + needle
            );
          }
        }
      }
    }
  }
  await scanDirectory("apps");
  await scanDirectory("packages");
});
