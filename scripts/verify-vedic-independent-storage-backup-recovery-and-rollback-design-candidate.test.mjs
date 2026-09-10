import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
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
  buildCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  canonicalPrettyStringifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest,
  isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes,
  readCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate,
  VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH,
  verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject,
  vedicIndependentStorageBackupRecoveryRollbackDesignCandidateTestOnly as testOnly
} from "./vedic-independent-storage-backup-recovery-and-rollback-design-candidate-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const candidateAbsolutePath = path.join(
  workspaceRoot,
  ...VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH
    .split("/")
);
const libraryAbsolutePath = path.join(
  scriptsDirectory,
  "vedic-independent-storage-backup-recovery-and-rollback-design-candidate-lib.mjs"
);
const cliAbsolutePath = path.join(
  scriptsDirectory,
  "verify-vedic-independent-storage-backup-recovery-and-rollback-design-candidate.mjs"
);
const expectedTransitiveRawContexts = [
  {
    bindingRole: "parent_input_contract_draft",
    bytes: 16529,
    contextId: "transitive_input_contract_draft_v0_1",
    path: "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json",
    sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
  },
  {
    bindingRole: "parent_input_contract_requirements",
    bytes: 15859,
    contextId: "transitive_input_contract_requirements_v1",
    path: "content/system-admission/vedic-input-contract-requirements.v1.json",
    sha256: "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59"
  },
  {
    bindingRole: "parent_fact_contract_draft",
    bytes: 14240,
    contextId: "transitive_fact_contract_draft_v0_1",
    path: "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json",
    sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
  },
  {
    bindingRole: "parent_fact_contract_requirements",
    bytes: 42634,
    contextId: "transitive_fact_contract_requirements_v1",
    path: "content/system-admission/vedic-fact-contract-requirements.v1.json",
    sha256: "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38"
  },
  {
    bindingRole: "parent_rule_contract_draft",
    bytes: 12140,
    contextId: "transitive_rule_contract_draft_v0_1",
    path: "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json",
    sha256: "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d"
  },
  {
    bindingRole: "parent_rule_contract_requirements",
    bytes: 30734,
    contextId: "transitive_rule_contract_requirements_v1",
    path: "content/system-admission/vedic-rule-contract-requirements.v1.json",
    sha256: "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94"
  },
  {
    bindingRole: "runtime_proposal_license_evidence_child",
    bytes: 23919,
    contextId: "transitive_runtime_dependency_license_evidence_v1",
    path: "content/system-admission/vedic-runtime-dependency-license-evidence.v1.json",
    sha256: "ed51e68438bc3b00613986e082d6064ceea41e9f75dc9992613e1b91449105e1"
  },
  {
    bindingRole: "parent_source_binding_and_rights_requirements_child",
    bytes: 85752,
    contextId: "transitive_source_binding_and_three_layer_rights_requirements_v1",
    path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
    sha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9"
  },
  {
    bindingRole: "parent_real_independent_expert_review_plan_child",
    bytes: 37131,
    contextId: "transitive_real_independent_expert_review_plan_v1",
    path: "content/system-admission/vedic-real-independent-expert-review-plan.v1.json",
    sha256: "9bcbff519dd38d40f26dfba1ccabe1c2987700200cf3a7f6eb7bf68254d7cf89"
  },
  {
    bindingRole: "parent_external_observation_document",
    bytes: 97473,
    contextId: "transitive_github_external_reference_audit_2026_08_24",
    path: "docs/GitHub外部参考审计-2026-08-24.md",
    sha256: "ac3b4620de3d183f60511b1ec0dacb268281f43fee75018ae533efb5ddd957bc"
  },
  {
    bindingRole: "parent_external_observation_document",
    bytes: 19451,
    contextId: "transitive_public_sites_and_repositories_audit_2026_08_25",
    path: "docs/公开命理网站与五仓库吸收审计-2026-08-25.md",
    sha256: "082c1a852b129c3ca5e35c6e619603071dff59a9615702862af4316538db34c0"
  },
  {
    bindingRole: "observation_input_structural_rejection_evidence_child",
    bytes: 26585,
    contextId: "transitive_input_structural_rejection_execution_evidence_v1",
    path: "content/system-admission/vedic-input-structural-rejection-execution-evidence.v1.json",
    sha256: "da953b36a3bef662833ae5763e3cdde7dd84b129089e96a8445ddbc582d1a67f"
  },
  {
    bindingRole: "observation_high_risk_expression_policy_child",
    bytes: 15788,
    contextId: "transitive_high_risk_expression_policy_draft_v0_1",
    path: "content/system-admission/vedic-high-risk-expression-policy-draft.v0.1.0.json",
    sha256: "8a1295c4f68da87a50ac2d6f8689765c271e007a68d63dfe2afa88377d94f5fa"
  },
  {
    bindingRole: "input_evidence_disk_helper_identity_not_loaded_module_identity",
    bytes: 23349,
    contextId: "transitive_input_structural_rejection_execution_helper_source",
    path: "scripts/vedic-input-structural-rejection-execution-lib.mjs",
    sha256: "a49e065a98b30512a6486998650e66009568503eab20a379663e3d8d178cb88a"
  },
  {
    bindingRole: "input_evidence_disk_helper_identity_not_loaded_module_identity",
    bytes: 30839,
    contextId: "transitive_input_contract_draft_helper_source",
    path: "scripts/vedic-input-contract-draft-lib.mjs",
    sha256: "a20cf2b30c848bda5d813db9b2b431185f1ffb1123c39fc1436b9309e0c84db0"
  },
  {
    bindingRole: "input_evidence_disk_helper_identity_not_loaded_module_identity",
    bytes: 48822,
    contextId: "transitive_input_contract_requirements_helper_source",
    path: "scripts/vedic-input-contract-requirements-lib.mjs",
    sha256: "b188481682fa0923e502c73064cae24f44bb7d2f2934814d4a8de1d20cc8e0dc"
  }
];

let built;
let readCurrent;
let loaded;
let persisted;
let persistedBytes;

before(async () => {
  persistedBytes = await readFile(candidateAbsolutePath);
  persisted =
    parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
      persistedBytes
    );
  built =
    await buildCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      workspaceRoot
    );
  readCurrent =
    await readCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      workspaceRoot
    );
  loaded =
    await loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      workspaceRoot
    );
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
  candidate.designDigest =
    computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest(
      candidate
    );
  return candidate;
}

function assertSelfResignedRejected(mutator) {
  const candidate = resignCandidate(mutator);
  assert.equal(
    candidate.designDigest,
    computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest(
      candidate
    )
  );
  assert.throws(
    () =>
      verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(
        candidate
      ),
    (error) => error?.code === "DESIGN_OBJECT_MISMATCH"
  );
  assert.equal(
    isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      candidate
    ),
    false
  );
}

async function createWorkspaceFixture(t, prefix = "hakimi-vedic-storage-design-") {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(async () => {
    const resolved = path.resolve(fixtureRoot);
    assert.equal(path.basename(resolved).startsWith(prefix), true);
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

test("fixed loader uniquely mints a narrow private sequential endpoint-observation brand", async () => {
  const verifiedObject =
    verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(
      persisted
    );
  assert.deepEqual(built, persisted);
  assert.deepEqual(readCurrent, persisted);
  assert.equal(
    isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      loaded
    ),
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
      isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
        value
      ),
      false
    );
  }
  assert.deepEqual(Object.keys(loaded), [
    "activeAdmissionEffect",
    "artifact",
    "authorityRedGates",
    "currentVedicStorageDesignMechanicallyVerified",
    "designCoverage",
    "designDigest",
    "designId",
    "implementationAccounting",
    "mutationRedGates",
    "productIdentity",
    "projectReleaseGovernanceContext",
    "rereviewBoundary",
    "sequentialEndpointObservationMechanicallyVerified",
    "simultaneousCurrentRawClosureVerified"
  ]);
  assert.equal(loaded.currentVedicStorageDesignMechanicallyVerified, false);
  assert.equal(
    loaded.sequentialEndpointObservationMechanicallyVerified,
    true
  );
  assert.equal(loaded.simultaneousCurrentRawClosureVerified, false);
  assertDeepFrozen(loaded);
  assert.equal("interfaceRequirements" in loaded, false);
  assert.equal("candidateCeilingObservations" in loaded, false);

  const isolated = await import(
    "./vedic-independent-storage-backup-recovery-and-rollback-design-candidate-lib.mjs?brand-isolation-test"
  );
  assert.equal(
    isolated.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      loaded
    ),
    false
  );
  const isolatedResult =
    await isolated.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      workspaceRoot
    );
  assert.equal(
    isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      isolatedResult
    ),
    false
  );
  assert.equal(
    isolated.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      isolatedResult
    ),
    true
  );
});

test("four exact direct contexts are current-compared and only one upstream brand is consumed", async () => {
  const closure = await testOnly.collectDirectCurrentContexts(workspaceRoot);
  assert.equal(closure.directCurrentContextCount, 4);
  assert.equal(closure.upstreamCapabilityBrandCount, 1);
  assert.deepEqual(
    closure.contexts.map((context) => ({
      contextId: context.contextId,
      path: context.path,
      sha256: context.sha256,
      semanticDigest: context.semanticDigest ?? null
    })),
    [
      testOnly.ADR_CONTEXT,
      testOnly.PARENT_CONTEXT,
      testOnly.RUNTIME_CONTEXT,
      testOnly.OBSERVATION_CONTEXT
    ].map((context) => ({
      contextId: context.contextId,
      path: context.path,
      sha256: context.sha256,
      semanticDigest: context.semanticDigest ?? null
    }))
  );
  assert.deepEqual(closure.currentVerifierPasses, {
    historicalParent: true,
    independentProductBoundaryAdr: true,
    runtimeAndBundleSizeProposal: true,
    versionAwareObservationCandidate: true
  });
  assertDeepFrozen(closure);
});

test("sixteen exact unique transitive raw pins close a non-atomic 4-plus-16 context ledger", async () => {
  const closure = await testOnly.collectDirectCurrentContexts(workspaceRoot);
  const transitive = closure.transitiveRawClosure;
  assert.deepEqual(testOnly.TRANSITIVE_CURRENT_RAW_CONTEXTS, expectedTransitiveRawContexts);
  assert.deepEqual(persisted.transitiveCurrentRawBindings, expectedTransitiveRawContexts);
  assert.equal(expectedTransitiveRawContexts.length, 16);
  assert.equal(
    new Set(expectedTransitiveRawContexts.map((context) => context.contextId)).size,
    16
  );
  assert.equal(
    new Set(expectedTransitiveRawContexts.map((context) => context.path)).size,
    16
  );
  assert.deepEqual(
    transitive.contexts,
    expectedTransitiveRawContexts.map(({ bytes, contextId, path, sha256 }) => ({
      bytes,
      contextId,
      path,
      sha256
    }))
  );
  assert.equal(transitive.endpointSnapshotOnly, true);
  assert.equal(transitive.transitiveRawContextCount, 16);
  assert.equal(transitive.totalRawContextCountIncludingDirect, 20);
  assert.equal(closure.directCurrentContextCount, 4);
  assert.equal(closure.transitiveRawContextCount, 16);
  assert.equal(closure.totalRawContextCount, 20);
  assert.equal(persisted.integrityBoundary.directContextCount, 4);
  assert.equal(persisted.integrityBoundary.transitiveRawContextCount, 16);
  assert.equal(persisted.integrityBoundary.totalRawContextCount, 20);
  assert.equal(
    persisted.integrityBoundary.transitiveClosureIndependentlyRawPinned,
    true
  );
  assert.deepEqual(persisted.observationBoundary, {
    abaExcluded: false,
    crossFileAtomicSnapshot: false,
    directContextEndpointSnapshots: 4,
    endpointSnapshotOnly: true,
    intervalMutationExcluded: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    parentRuntimeAndDesignAtomicSnapshot: false,
    totalContextEndpointSnapshots: 20,
    transitiveContextEndpointSnapshots: 16
  });
  assert.equal(persisted.mutationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(persisted.mutationBoundary.intervalMutationExcluded, false);
  assert.equal(persisted.mutationBoundary.abaExcluded, false);
  assert.equal(persisted.mutationBoundary.mutationEpochAvailable, false);
  assertDeepFrozen(transitive);
});

test("all six ordered interfaces define every required requirements group with zero implementation", () => {
  assert.deepEqual(
    persisted.designCoverage.interfaceRequirementIds,
    testOnly.INTERFACE_REQUIREMENT_IDS
  );
  assert.equal(persisted.designCoverage.interfaceRequirementsDefined, 6);
  assert.equal(persisted.designCoverage.interfaceRequirementsRequired, 6);
  assert.equal(persisted.designCoverage.designMaterialCandidateComplete, true);
  assert.equal(persisted.designCoverage.designExecutionStarted, false);
  assert.equal(persisted.designCoverage.designReceiptsIssued, 0);
  assert.equal(persisted.interfaceRequirements.length, 6);
  for (const [index, requirement] of persisted.interfaceRequirements.entries()) {
    assert.equal(
      requirement.interfaceRequirementId,
      testOnly.INTERFACE_REQUIREMENT_IDS[index]
    );
    for (const key of [
      "failClosedConditions",
      "invariants",
      "nonClaims",
      "requiredEvidenceBeforeImplementation",
      "requiredInputs",
      "requiredOutputs"
    ]) {
      assert.equal(Array.isArray(requirement[key]), true);
      assert.equal(requirement[key].length > 0, true, requirement.interfaceRequirementId + ":" + key);
      assert.equal(new Set(requirement[key]).size, requirement[key].length);
    }
    assert.equal(requirement.requirementsDefined, true);
    assert.equal(requirement.runtimeImplementationInstances, 0);
    assert.equal(requirement.status, "requirements_only_zero_implementation");
  }
});

test("four capacity observations preserve unmeasured unapproved plan ceilings", () => {
  assert.deepEqual(persisted.candidateCeilingObservations, [
    {
      approvalStatus: "unapproved_candidate",
      measurementStatus: "not_measured",
      metricId: "installed_offline_footprint_bytes",
      observedValue: null,
      optionId: "browser_embedded",
      planRef: "#/runtimeOptions/0/candidateCeilings/2/proposedCeiling",
      proposedCeiling: 100000000,
      unit: "bytes"
    },
    {
      approvalStatus: "unapproved_candidate",
      measurementStatus: "not_measured",
      metricId: "evidence_retention_bytes_per_release",
      observedValue: null,
      optionId: "browser_embedded",
      planRef: "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
      proposedCeiling: 50000000,
      unit: "bytes"
    },
    {
      approvalStatus: "unapproved_candidate",
      measurementStatus: "not_measured",
      metricId: "installed_offline_footprint_bytes",
      observedValue: null,
      optionId: "loopback_local_service",
      planRef: "#/runtimeOptions/1/candidateCeilings/2/proposedCeiling",
      proposedCeiling: 750000000,
      unit: "bytes"
    },
    {
      approvalStatus: "unapproved_candidate",
      measurementStatus: "not_measured",
      metricId: "evidence_retention_bytes_per_release",
      observedValue: null,
      optionId: "loopback_local_service",
      planRef: "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling",
      proposedCeiling: 100000000,
      unit: "bytes"
    }
  ]);
  assert.equal(persisted.capacityBoundary.approvedCapacityBudgets, 0);
  assert.equal(persisted.capacityBoundary.capacityBudgetApproved, false);
  assert.equal(persisted.capacityBoundary.measuredCapacityValues, 0);
  assert.equal(persisted.capacityBoundary.runtimeOptionSelected, false);
});

test("historical parent remains required_absent at 3-of-7 with no rereview effect", () => {
  assert.deepEqual(persisted.rereviewBoundary, {
    currentDesignCandidateMaterialPresent: true,
    formalRereviewRequirementSatisfied: false,
    historicalParentRequirementState: "required_absent",
    historicalParentRereviewRequirementsComplete: 3,
    historicalParentRereviewRequirementsRequired: 7,
    ownerDecision: null,
    parentLedgerUpdated: false,
    registryUpdated: false
  });
  assert.equal(persisted.gateSummary.rereviewRequirementsComplete, 3);
  assert.equal(persisted.gateSummary.rereviewRequirementsRequired, 7);
  assert.equal(persisted.gateSummary.rereviewTriggered, false);
  assert.equal(persisted.activeAdmissionEffect, "none");
});

test("implementation authority and independent product identity remain entirely red", () => {
  assert.deepEqual(persisted.productBoundary, {
    centralRegistryIntegration: "absent",
    databaseInstances: 0,
    domainManifest: "absent",
    legacyV13Inherited: false,
    migrationId: null,
    namespaceInstances: 0,
    productSurface: "absent",
    releaseIdentity: null,
    runtimeImplementation: "absent",
    runtimeOption: "unselected",
    schema13Inherited: false,
    storageBackend: "unselected",
    storageSchema: "absent",
    targetSchema: null
  });
  assert.deepEqual(new Set(Object.values(persisted.authorityBoundary)), new Set([false]));
  for (const [key, value] of Object.entries(persisted.backupRecoveryRollbackBoundary)) {
    assert.equal(value, 0, key);
  }
  assert.equal(persisted.systemIdentity.projectDefaultReleaseGovernanceInherited, false);
  assert.deepEqual(persisted.systemIdentity.projectDefaultReleaseGovernanceContext, {
    activeLine: "legacy-v13",
    migrationId: null,
    targetSchema: 13
  });
});

test("self-resigning cannot mark the parent requirement satisfied or trigger rereview", () => {
  for (const mutate of [
    (candidate) => { candidate.rereviewBoundary.formalRereviewRequirementSatisfied = true; },
    (candidate) => { candidate.rereviewBoundary.historicalParentRequirementState = "satisfied"; },
    (candidate) => { candidate.rereviewBoundary.historicalParentRereviewRequirementsComplete = 4; },
    (candidate) => { candidate.rereviewBoundary.parentLedgerUpdated = true; },
    (candidate) => { candidate.rereviewBoundary.registryUpdated = true; },
    (candidate) => { candidate.gateSummary.rereviewRequirementsComplete = 4; },
    (candidate) => { candidate.gateSummary.rereviewTriggered = true; }
  ]) assertSelfResignedRejected(mutate);
});

test("self-resigning cannot select a backend namespace runtime schema or v13 identity", () => {
  for (const mutate of [
    (candidate) => { candidate.productBoundary.storageBackend = "indexeddb"; },
    (candidate) => { candidate.productBoundary.namespaceInstances = 1; },
    (candidate) => { candidate.productBoundary.databaseInstances = 1; },
    (candidate) => { candidate.productBoundary.runtimeOption = "browser_embedded"; },
    (candidate) => { candidate.productBoundary.runtimeImplementation = "present"; },
    (candidate) => { candidate.productBoundary.storageSchema = "vedic-v1"; },
    (candidate) => { candidate.productBoundary.targetSchema = 13; },
    (candidate) => { candidate.productBoundary.schema13Inherited = true; },
    (candidate) => { candidate.productBoundary.legacyV13Inherited = true; }
  ]) assertSelfResignedRejected(mutate);
});

test("self-resigning cannot invent implementation execution receipts or approved capacity", () => {
  for (const mutate of [
    (candidate) => { candidate.backupRecoveryRollbackBoundary.backupImplementations = 1; },
    (candidate) => { candidate.backupRecoveryRollbackBoundary.backupReceiptsIssued = 1; },
    (candidate) => { candidate.backupRecoveryRollbackBoundary.recoveryImplementations = 1; },
    (candidate) => { candidate.backupRecoveryRollbackBoundary.rollbackImplementations = 1; },
    (candidate) => { candidate.evidenceBoundary.storageExecutionReceipts = 1; },
    (candidate) => { candidate.designCoverage.designExecutionStarted = true; },
    (candidate) => { candidate.interfaceRequirements[0].runtimeImplementationInstances = 1; },
    (candidate) => { candidate.capacityBoundary.capacityBudgetApproved = true; },
    (candidate) => { candidate.candidateCeilingObservations[0].measurementStatus = "measured"; },
    (candidate) => { candidate.candidateCeilingObservations[0].observedValue = 1; }
  ]) assertSelfResignedRejected(mutate);
});

test("self-resigning cannot forge mutation epoch atomicity interval or ABA evidence", () => {
  for (const mutate of [
    (candidate) => { candidate.mutationBoundary.mutationEpochAvailable = true; },
    (candidate) => { candidate.mutationBoundary.mutationEpochReceipt = "receipt"; },
    (candidate) => { candidate.mutationBoundary.mutationEpochReceiptsIssued = 1; },
    (candidate) => { candidate.mutationBoundary.compareAndSwapImplementations = 1; },
    (candidate) => { candidate.mutationBoundary.crossFileAtomicSnapshot = true; },
    (candidate) => { candidate.mutationBoundary.intervalMutationExcluded = true; },
    (candidate) => { candidate.mutationBoundary.abaExcluded = true; },
    (candidate) => { candidate.observationBoundary.parentRuntimeAndDesignAtomicSnapshot = true; }
  ]) assertSelfResignedRejected(mutate);
});

test("self-resigning cannot authorize content expert rights release or deployment", () => {
  for (const key of Object.keys(persisted.authorityBoundary)) {
    assertSelfResignedRejected((candidate) => {
      candidate.authorityBoundary[key] = true;
    });
  }
  assertSelfResignedRejected((candidate) => {
    candidate.activeAdmissionEffect = "admit";
  });
  assertSelfResignedRejected((candidate) => {
    candidate.evidenceBoundary.releaseEvidenceComplete = true;
  });
});

test("strict parser rejects duplicate keys BOM invalid UTF-8 non-object and unsafe byte views", () => {
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
    assert.throws(() =>
      parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
        input
      )
    );
  }
  assert.throws(() =>
    parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
      new Uint8Array(testOnly.MAX_ARTIFACT_BYTES + 1)
    )
  );
  if (typeof SharedArrayBuffer === "function") {
    const shared = new Uint8Array(new SharedArrayBuffer(2));
    shared[0] = 123;
    shared[1] = 125;
    assert.throws(() =>
      parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
        shared
      )
    );
  }
  if (typeof structuredClone === "function") {
    const buffer = new ArrayBuffer(2);
    const detached = new Uint8Array(buffer);
    structuredClone(buffer, { transfer: [buffer] });
    assert.throws(() =>
      parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
        detached
      )
    );
  }
});

test("object API rejects aliases cycles accessors sparse arrays symbols and non-JSON numbers", () => {
  const accessor = {};
  Object.defineProperty(accessor, "x", {
    enumerable: true,
    get() { return 1; }
  });
  const symbolValue = { x: 1 };
  symbolValue[Symbol("x")] = 2;
  const sparse = [];
  sparse[1] = 1;
  const shared = { x: 1 };
  const cycle = {};
  cycle.self = cycle;
  for (const value of [
    accessor,
    symbolValue,
    sparse,
    { left: shared, right: shared },
    cycle,
    Object.assign(Object.create({ inherited: true }), { x: 1 }),
    { x: Number.NaN },
    { x: Number.POSITIVE_INFINITY },
    { x: -0 },
    new Proxy({}, {})
  ]) {
    assert.throws(() =>
      computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest(
        value
      )
    );
  }
  const unknown = resignCandidate((candidate) => {
    candidate.unexpected = true;
  });
  assert.throws(
    () =>
      verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(
        unknown
      ),
    (error) => error?.code === "DESIGN_OBJECT_MISMATCH"
  );
});

test("fixed endpoint reader rejects unsafe paths hardlinks and linked directory chains", async (t) => {
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

  const root = await mkdtemp(path.join(tmpdir(), "hakimi-vedic-storage-endpoint-"));
  t.after(async () => {
    const resolved = path.resolve(root);
    assert.equal(path.basename(resolved).startsWith("hakimi-vedic-storage-endpoint-"), true);
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

test("post-import and pre-import Hash and TextDecoder poisoning cannot brand a forged same-size candidate", async (t) => {
  const fixture = await createWorkspaceFixture(
    t,
    "hakimi-vedic-storage-prototype-poison-"
  );
  const forged = Buffer.from(persistedBytes);
  const marker = Buffer.from(testOnly.STATUS, "utf8");
  const markerOffset = forged.indexOf(marker);
  assert.equal(markerOffset >= 0, true);
  forged[markerOffset] = forged[markerOffset] === 0x72 ? 0x73 : 0x72;
  assert.equal(forged.byteLength, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.notEqual(
    createHash("sha256").update(forged).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  await writeFile(
    path.join(
      fixture,
      ...VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH
        .split("/")
    ),
    forged
  );

  async function runPoisonScenario(mode) {
    const moduleUrl = pathToFileURL(libraryAbsolutePath).href;
    const importUrl = mode === "pre-import"
      ? moduleUrl + "?pre-import-poison=" + Date.now()
      : moduleUrl;
    const attackLines = [
      "import { createHash } from 'node:crypto';",
      "import { readFile } from 'node:fs/promises';",
      "let m;",
      "const legitimateBytes = await readFile(" + JSON.stringify(candidateAbsolutePath) + ");",
      "const legitimateText = legitimateBytes.toString('utf8');"
    ];
    if (mode === "post-import") {
      attackLines.push("m = await import(" + JSON.stringify(importUrl) + ");");
    }
    attackLines.push(
      "const hashPrototype = Object.getPrototypeOf(createHash('sha256'));",
      "const originalUpdate = hashPrototype.update;",
      "const originalDigest = hashPrototype.digest;",
      "const forgedHashes = new WeakSet();",
      "hashPrototype.update = function(value, ...rest) {",
      "  if (value && typeof value === 'object' && value.byteLength === "
        + String(testOnly.EXPECTED_PERSISTED.rawBytes) + ") {",
      "    forgedHashes.add(this);",
      "    return this;",
      "  }",
      "  return Reflect.apply(originalUpdate, this, [value, ...rest]);",
      "};",
      "hashPrototype.digest = function(...args) {",
      "  if (forgedHashes.has(this)) {",
      "    return args[0] === 'hex'",
      "      ? " + JSON.stringify(testOnly.EXPECTED_PERSISTED.rawSha256),
      "      : Buffer.from(" + JSON.stringify(testOnly.EXPECTED_PERSISTED.rawSha256) + ", 'hex');",
      "  }",
      "  return Reflect.apply(originalDigest, this, args);",
      "};",
      "const originalDecode = TextDecoder.prototype.decode;",
      "TextDecoder.prototype.decode = function(value, ...rest) {",
      "  if (value && value.byteLength === "
        + String(testOnly.EXPECTED_PERSISTED.rawBytes) + ") return legitimateText;",
      "  return Reflect.apply(originalDecode, this, [value, ...rest]);",
      "};"
    );
    if (mode === "pre-import") {
      attackLines.push("m = await import(" + JSON.stringify(importUrl) + ");");
    }
    attackLines.push(
      "let output;",
      "try {",
      "  const result = await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate("
        + JSON.stringify(fixture) + ");",
      "  output = { branded: m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(result), code: null, loaded: true };",
      "} catch (error) {",
      "  output = { branded: false, code: error?.code ?? null, loaded: false };",
      "}",
      "process.stdout.write(JSON.stringify(output));"
    );
    const attack = await execFileAsync(process.execPath, [
      "--input-type=module",
      "-e",
      attackLines.join("\n")
    ], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      windowsHide: true,
      timeout: 60_000
    });
    assert.deepEqual(JSON.parse(attack.stdout), {
      branded: false,
      code: "DESIGN_RAW_IDENTITY_MISMATCH",
      loaded: false
    });
  }

  await t.test("post-import prototype poisoning", async () => {
    await runPoisonScenario("post-import");
  });
  await t.test("pre-import prototype poisoning before fresh query import", async () => {
    await runPoisonScenario("pre-import");
  });
});

test("pre-import utilTypes.isProxy state-promotion poison cannot mint an upgraded fresh-query result", async () => {
  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?pre-import-is-proxy-promotion=" + Date.now();
  const attackScript = [
    "import { types as utilTypes } from 'node:util';",
    "utilTypes.isProxy = (value) => {",
    "  if (value !== null && typeof value === 'object') {",
    "    const promotions = {",
    "      activeAdmissionEffect: 'admit',",
    "      abaExcluded: true,",
    "      crossFileAtomicSnapshot: true,",
    "      designExecutionStarted: true,",
    "      designReceiptsIssued: 1,",
    "      expertClaimsAuthorized: true,",
    "      formalRereviewRequirementSatisfied: true,",
    "      historicalParentRequirementState: 'satisfied',",
    "      intervalMutationExcluded: true,",
    "      parentLedgerUpdated: true,",
    "      publicDeploymentAuthorized: true,",
    "      publicReleaseAuthorized: true,",
    "      registryUpdated: true,",
    "      releaseReady: true",
    "    };",
    "    for (const [key, promoted] of Object.entries(promotions)) {",
    "      try { if (key in value) value[key] = promoted; } catch {}",
    "    }",
    "  }",
    "  return false;",
    "};",
    "let m;",
    "let output;",
    "try {",
    "  m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "  const result = await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate("
      + JSON.stringify(workspaceRoot) + ");",
    "  output = {",
    "    loaded: true,",
    "    branded: m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(result),",
    "    activeAdmissionEffect: result.activeAdmissionEffect,",
    "    authorityRedGates: result.authorityRedGates,",
    "    designExecutionStarted: result.designCoverage.designExecutionStarted,",
    "    designReceiptsIssued: result.designCoverage.designReceiptsIssued,",
    "    abaExcluded: result.mutationRedGates.abaExcluded,",
    "    crossFileAtomicSnapshot: result.mutationRedGates.crossFileAtomicSnapshot,",
    "    intervalMutationExcluded: result.mutationRedGates.intervalMutationExcluded,",
    "    formalRereviewRequirementSatisfied: result.rereviewBoundary.formalRereviewRequirementSatisfied,",
    "    historicalParentRequirementState: result.rereviewBoundary.historicalParentRequirementState,",
    "    parentLedgerUpdated: result.rereviewBoundary.parentLedgerUpdated,",
    "    registryUpdated: result.rereviewBoundary.registryUpdated",
    "  };",
    "} catch (error) {",
    "  output = {",
    "    loaded: false,",
    "    branded: false,",
    "    code: typeof error?.code === 'string' ? error.code : error?.name ?? 'UNKNOWN_FAILURE'",
    "  };",
    "}",
    "process.stdout.write(JSON.stringify(output));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  const output = JSON.parse(attack.stdout);
  if (!output.loaded) {
    assert.equal(output.branded, false);
    assert.equal(typeof output.code, "string");
    assert.equal(output.code.length > 0, true);
    return;
  }
  assert.equal(output.branded, true);
  assert.equal(output.activeAdmissionEffect, "none");
  assert.equal(output.designExecutionStarted, false);
  assert.equal(output.designReceiptsIssued, 0);
  assert.equal(output.abaExcluded, false);
  assert.equal(output.crossFileAtomicSnapshot, false);
  assert.equal(output.intervalMutationExcluded, false);
  assert.equal(output.formalRereviewRequirementSatisfied, false);
  assert.equal(output.historicalParentRequirementState, "required_absent");
  assert.equal(output.parentLedgerUpdated, false);
  assert.equal(output.registryUpdated, false);
  assert.deepEqual(output.authorityRedGates, {
    contentTruthEstablished: false,
    expertClaimsAuthorized: false,
    expertTruthEstablished: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false
  });
});

test("pure local SHA-256 matches standard known vectors", () => {
  const vectors = [
    [
      "",
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    ],
    [
      "abc",
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    ],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
    ]
  ];
  for (const [input, expected] of vectors) {
    assert.equal(
      testOnly.sha256Bytes(testOnly.utf8EncodeString(input)),
      expected
    );
  }
});

test("local UTF-8 helpers round-trip multilingual Unicode exactly", () => {
  const source = "哈基米算命 · ज्योतिष · 🐈‍⬛ · 𝄞";
  const encoded = testOnly.utf8EncodeString(source);
  assert.deepEqual(Buffer.from(encoded), Buffer.from(source, "utf8"));
  assert.equal(testOnly.decodeStrictUtf8(encoded, "Unicode roundtrip"), source);
  assert.throws(
    () => testOnly.utf8EncodeString({ toString: () => source }),
    (error) => error?.code === "UTF8_SOURCE_INVALID"
  );
});

test("test-only byte views and promises expose only outer-realm constructors", async () => {
  function assertOuterRealmConstructor(value, expectedConstructor) {
    assert.equal(value.constructor, expectedConstructor);
    assert.equal(
      value.constructor.constructor("return globalThis")(),
      globalThis
    );
  }

  const encoded = testOnly.utf8EncodeString("outer-realm-byte-boundary");
  assertOuterRealmConstructor(encoded, Uint8Array);

  const pendingSnapshot = testOnly.readStableWorkspaceFile(
    workspaceRoot,
    VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH
  );
  assertOuterRealmConstructor(pendingSnapshot, Promise);
  const snapshot = await pendingSnapshot;
  assertOuterRealmConstructor(snapshot.bytes, Uint8Array);
  assert.equal(
    snapshot.bytes.constructor.constructor("return Promise")(),
    Promise
  );
  assert.equal(Object.hasOwn(testOnly, "canonicalStringify"), false);
  assert.equal(Object.hasOwn(testOnly, "exactJson"), false);
});

test("outer-only test boundary blocks clean-Promise held-fd substitution of a transitive drift", async (t) => {
  const targetIndex = 12;
  const target = expectedTransitiveRawContexts[targetIndex];
  assert.equal(
    target.contextId,
    "transitive_high_risk_expression_policy_draft_v0_1"
  );
  const fixture = await createWorkspaceFixture(
    t,
    "hakimi-vedic-clean-promise-fd-swap-"
  );
  const sourcePath = path.join(workspaceRoot, ...target.path.split("/"));
  const fixturePath = path.join(fixture, ...target.path.split("/"));
  const legitimateBytes = await readFile(sourcePath);
  const forgedBytes = Buffer.from(legitimateBytes);
  const marker = Buffer.from(
    "requirements_only_engineering_candidate_not_admitted",
    "utf8"
  );
  const markerOffset = forgedBytes.indexOf(marker);
  assert.equal(markerOffset >= 0, true);
  forgedBytes[markerOffset] ^= 1;
  assert.equal(forgedBytes.byteLength, target.bytes);
  assert.notEqual(
    createHash("sha256").update(forgedBytes).digest("hex"),
    target.sha256
  );
  await writeFile(fixturePath, forgedBytes);

  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?clean-promise-fd-swap=" + Date.now();
  const attackScript = [
    "import { createHash } from 'node:crypto';",
    "import { closeSync, openSync } from 'node:fs';",
    "import { lstat, readFile } from 'node:fs/promises';",
    "const m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "const legitimateBytes = await readFile(" + JSON.stringify(sourcePath) + ");",
    "const legitimateText = legitimateBytes.toString('utf8');",
    "const fixtureStats = await lstat(" + JSON.stringify(fixturePath) + ");",
    "const originalFd = openSync(" + JSON.stringify(sourcePath) + ", 'r');",
    "const probe = m.vedicIndependentStorageBackupRecoveryRollbackDesignCandidateTestOnly.utf8EncodeString('');",
    "const cleanGlobal = probe.constructor.constructor('return globalThis')();",
    "const cleanPromisePoisonActive = cleanGlobal !== globalThis;",
    "const originalThen = cleanGlobal.Promise.prototype.then;",
    "let fileIndex = 0;",
    "let phase = 'open';",
    "cleanGlobal.Promise.prototype.then = function(onFulfilled, onRejected) {",
    "  return Reflect.apply(originalThen, this, [function(value) {",
    "    let transformed = value;",
    "    if (phase === 'open') {",
    "      if (typeof value !== 'number') throw new Error('unexpected open phase');",
    "      if (fileIndex === " + String(targetIndex) + ") transformed = originalFd;",
    "      phase = 'firstStat';",
    "    } else if (phase === 'firstStat') {",
    "      if (!value || typeof value !== 'object') throw new Error('unexpected firstStat phase');",
    "      if (fileIndex === " + String(targetIndex) + ") transformed = fixtureStats;",
    "      phase = 'read';",
    "    } else if (phase === 'read') {",
    "      if (typeof value !== 'number') throw new Error('unexpected read phase');",
    "      if (value === 0) phase = 'afterStat';",
    "    } else if (phase === 'afterStat') {",
    "      if (!value || typeof value !== 'object') throw new Error('unexpected afterStat phase');",
    "      if (fileIndex === " + String(targetIndex) + ") transformed = fixtureStats;",
    "      phase = 'close';",
    "    } else if (phase === 'close') {",
    "      if (value !== undefined) throw new Error('unexpected close phase');",
    "      fileIndex += 1;",
    "      phase = 'open';",
    "    }",
    "    return typeof onFulfilled === 'function' ? onFulfilled(transformed) : transformed;",
    "  }, onRejected]);",
    "};",
    "const hashPrototype = Object.getPrototypeOf(createHash('sha256'));",
    "const originalUpdate = hashPrototype.update;",
    "const originalDigest = hashPrototype.digest;",
    "const forgedHashes = new WeakSet();",
    "hashPrototype.update = function(value, ...rest) {",
    "  if (value && typeof value === 'object' && value.byteLength === "
      + String(target.bytes) + ") {",
    "    forgedHashes.add(this);",
    "    return this;",
    "  }",
    "  return Reflect.apply(originalUpdate, this, [value, ...rest]);",
    "};",
    "hashPrototype.digest = function(...args) {",
    "  if (forgedHashes.has(this)) {",
    "    return args[0] === 'hex'",
    "      ? " + JSON.stringify(target.sha256),
    "      : Buffer.from(" + JSON.stringify(target.sha256) + ", 'hex');",
    "  }",
    "  return Reflect.apply(originalDigest, this, args);",
    "};",
    "const originalDecode = TextDecoder.prototype.decode;",
    "TextDecoder.prototype.decode = function(value, ...rest) {",
    "  if (value && value.byteLength === " + String(target.bytes) + ") return legitimateText;",
    "  return Reflect.apply(originalDecode, this, [value, ...rest]);",
    "};",
    "let output;",
    "try {",
    "  const result = await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate("
      + JSON.stringify(fixture) + ");",
    "  output = {",
    "    branded: m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(result),",
    "    cleanPromisePoisonActive,",
    "    code: null,",
    "    fileIndex,",
    "    loaded: true,",
    "    phase",
    "  };",
    "} catch (error) {",
    "  output = {",
    "    branded: false,",
    "    cleanPromisePoisonActive,",
    "    code: error?.code ?? null,",
    "    fileIndex,",
    "    loaded: false,",
    "    phase",
    "  };",
    "} finally {",
    "  cleanGlobal.Promise.prototype.then = originalThen;",
    "  hashPrototype.update = originalUpdate;",
    "  hashPrototype.digest = originalDigest;",
    "  TextDecoder.prototype.decode = originalDecode;",
    "  try { closeSync(originalFd); } catch {}",
    "}",
    "process.stdout.write(JSON.stringify(output));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.deepEqual(JSON.parse(attack.stdout), {
    branded: false,
    cleanPromisePoisonActive: false,
    code: "OUTER_PROMISE_INTRINSIC_MISMATCH",
    fileIndex: 0,
    loaded: false,
    phase: "open"
  });
});

test("outer Promise pollution cannot replace raw snapshots or mint an own-green private brand", async (t) => {
  const target = expectedTransitiveRawContexts[0];
  const fixture = await createWorkspaceFixture(
    t,
    "hakimi-vedic-outer-promise-replacement-"
  );
  const fixturePath = path.join(fixture, ...target.path.split("/"));
  const driftedBytes = Buffer.from(await readFile(fixturePath));
  driftedBytes[0] ^= 1;
  assert.equal(driftedBytes.byteLength, target.bytes);
  assert.notEqual(
    createHash("sha256").update(driftedBytes).digest("hex"),
    target.sha256
  );
  await writeFile(fixturePath, driftedBytes);

  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?outer-promise-replacement=" + Date.now();
  const attackScript = [
    "const m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "const fixture = " + JSON.stringify(fixture) + ";",
    "const target = " + JSON.stringify(target) + ";",
    "const originalConstructorDescriptor = Object.getOwnPropertyDescriptor(",
    "  Promise.prototype, 'constructor'",
    ");",
    "const originalThenDescriptor = Object.getOwnPropertyDescriptor(",
    "  Promise.prototype, 'then'",
    ");",
    "const originalThen = originalThenDescriptor.value;",
    "let replacements = 0;",
    "let substitutions = 0;",
    "function installPollution() {",
    "  Object.defineProperty(Promise.prototype, 'constructor', {",
    "    configurable: true,",
    "    enumerable: false,",
    "    value: function PollutedPromise() {},",
    "    writable: true",
    "  });",
    "  Object.defineProperty(Promise.prototype, 'then', {",
    "    configurable: true,",
    "    enumerable: false,",
    "    value: function(onFulfilled, onRejected) {",
    "      return Reflect.apply(originalThen, this, [function(value) {",
    "        let delivered = value;",
    "        if (value && typeof value === 'object'",
    "          && value.bytes",
    "          && value.rawBytes === target.bytes",
    "          && typeof value.rawSha256 === 'string'",
    "          && value.rawSha256 !== target.sha256) {",
    "          replacements += 1;",
    "          delivered = {",
    "            bytes: value.bytes,",
    "            rawBytes: target.bytes,",
    "            rawSha256: target.sha256",
    "          };",
    "        }",
    "        if (value && typeof value === 'object'",
    "          && typeof value.designId === 'string'",
    "          && value.mutationBoundary",
    "          && !value.mutationRedGates) {",
    "          substitutions += 1;",
    "          delivered = {",
    "            ...value,",
    "            designId: 'attacker-forged-design-id',",
    "            designDigest: '00'.repeat(32),",
    "            designCoverage: {",
    "              ...value.designCoverage,",
    "              releaseReady: true,",
    "              extraOwnGreenField: true",
    "            },",
    "            mutationBoundary: {",
    "              ...value.mutationBoundary,",
    "              mutationEpochAvailable: false,",
    "              writesAuthorized: true",
    "            },",
    "            rereviewBoundary: {",
    "              ...value.rereviewBoundary,",
    "              formalRereviewRequirementSatisfied: true,",
    "              publicReleaseAuthorized: true",
    "            }",
    "          };",
    "        }",
    "        return typeof onFulfilled === 'function'",
    "          ? onFulfilled(delivered)",
    "          : delivered;",
    "      }, onRejected]);",
    "    },",
    "    writable: true",
    "  });",
    "}",
    "function restorePollution() {",
    "  Object.defineProperty(",
    "    Promise.prototype,",
    "    'constructor',",
    "    originalConstructorDescriptor",
    "  );",
    "  Object.defineProperty(",
    "    Promise.prototype,",
    "    'then',",
    "    originalThenDescriptor",
    "  );",
    "}",
    "let rawAccepted = false;",
    "let rawCode = null;",
    "let rawOuterError = false;",
    "let rawOwnCause = null;",
    "installPollution();",
    "try {",
    "  await m.vedicIndependentStorageBackupRecoveryRollbackDesignCandidateTestOnly",
    "    .collectTransitiveCurrentRawContexts(fixture);",
    "  rawAccepted = true;",
    "} catch (error) {",
    "  rawCode = error?.code ?? null;",
    "  rawOuterError = error instanceof Error;",
    "  rawOwnCause = Object.hasOwn(error, 'cause');",
    "} finally {",
    "  restorePollution();",
    "}",
    "let brandLoaded = false;",
    "let branded = false;",
    "let brandCode = null;",
    "let brandOuterError = false;",
    "let brandOwnCause = null;",
    "let ownGreenFields = null;",
    "installPollution();",
    "try {",
    "  const result =",
    "    await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(",
    "      fixture",
    "    );",
    "  brandLoaded = true;",
    "  branded =",
    "    m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(",
    "      result",
    "    );",
    "  ownGreenFields = {",
    "    designId: result.designId,",
    "    releaseReady: result.designCoverage?.releaseReady ?? null,",
    "    extraOwnGreenField:",
    "      Object.hasOwn(result.designCoverage ?? {}, 'extraOwnGreenField'),",
    "    writesAuthorized:",
    "      Object.hasOwn(result.mutationRedGates ?? {}, 'writesAuthorized'),",
    "    formalRereviewRequirementSatisfied:",
    "      result.rereviewBoundary?.formalRereviewRequirementSatisfied ?? null,",
    "    publicReleaseAuthorized:",
    "      Object.hasOwn(result.rereviewBoundary ?? {}, 'publicReleaseAuthorized')",
    "  };",
    "} catch (error) {",
    "  brandCode = error?.code ?? null;",
    "  brandOuterError = error instanceof Error;",
    "  brandOwnCause = Object.hasOwn(error, 'cause');",
    "} finally {",
    "  restorePollution();",
    "}",
    "process.stdout.write(JSON.stringify({",
    "  brandCode,",
    "  brandLoaded,",
    "  brandOuterError,",
    "  brandOwnCause,",
    "  branded,",
    "  ownGreenFields,",
    "  rawAccepted,",
    "  rawCode,",
    "  rawOuterError,",
    "  rawOwnCause,",
    "  replacements,",
    "  substitutions",
    "}));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.deepEqual(JSON.parse(attack.stdout), {
    brandCode: "OUTER_PROMISE_INTRINSIC_MISMATCH",
    brandLoaded: false,
    brandOuterError: true,
    brandOwnCause: false,
    branded: false,
    ownGreenFields: null,
    rawAccepted: false,
    rawCode: "OUTER_PROMISE_INTRINSIC_MISMATCH",
    rawOuterError: true,
    rawOwnCause: false,
    replacements: 0,
    substitutions: 0
  });
});

test("outer Object and Array prototype then pollution cannot reach the private brand", async () => {
  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?outer-thenable-prototypes=" + Date.now();
  const attackScript = [
    "const m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "const workspaceRoot = " + JSON.stringify(workspaceRoot) + ";",
    "const probes = [];",
    "for (const [label, prototype] of [",
    "  ['Object.prototype', Object.prototype],",
    "  ['Array.prototype', Array.prototype]",
    "]) {",
    "  const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, 'then');",
    "  let thenCalls = 0;",
    "  let branded = false;",
    "  let code = null;",
    "  let loaded = false;",
    "  let outerError = false;",
    "  let ownCause = null;",
    "  try {",
    "    Object.defineProperty(prototype, 'then', {",
    "      configurable: true,",
    "      enumerable: false,",
    "      value(resolve) {",
    "        thenCalls += 1;",
    "        resolve({ forged: true });",
    "      },",
    "      writable: true",
    "    });",
    "    const result =",
    "      await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(",
    "        workspaceRoot",
    "      );",
    "    loaded = true;",
    "    branded =",
    "      m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(",
    "        result",
    "      );",
    "  } catch (error) {",
    "    code = error?.code ?? null;",
    "    outerError = error instanceof Error;",
    "    ownCause = Object.hasOwn(error, 'cause');",
    "  } finally {",
    "    if (originalDescriptor === undefined) delete prototype.then;",
    "    else Object.defineProperty(prototype, 'then', originalDescriptor);",
    "  }",
    "  probes.push({ branded, code, label, loaded, outerError, ownCause, thenCalls });",
    "}",
    "process.stdout.write(JSON.stringify(probes));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.deepEqual(JSON.parse(attack.stdout), [
    {
      branded: false,
      code: "OUTER_PROMISE_INTRINSIC_MISMATCH",
      label: "Object.prototype",
      loaded: false,
      outerError: true,
      ownCause: false,
      thenCalls: 0
    },
    {
      branded: false,
      code: "OUTER_PROMISE_INTRINSIC_MISMATCH",
      label: "Array.prototype",
      loaded: false,
      outerError: true,
      ownCause: false,
      thenCalls: 0
    }
  ]);
});

test("async_hooks Promise own constructor and then cannot bypass a missing root or leak an unhandled rejection", async () => {
  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?async-hooks-own-awaitable=" + Date.now();
  const nonexistentRoot = path.join(
    tmpdir(),
    `hakimi-vedic-nonexistent-${process.pid}-${Date.now()}`
  );
  const attackScript = [
    "import { createHook } from 'node:async_hooks';",
    "const m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "const testOnly =",
    "  m.vedicIndependentStorageBackupRecoveryRollbackDesignCandidateTestOnly;",
    "const forged = testOnly.buildDesignProjection();",
    "const nativeThen = Promise.prototype.then;",
    "let attacked = false;",
    "const hook = createHook({",
    "  init(_asyncId, type, _triggerAsyncId, promise) {",
    "    if (type !== 'PROMISE' || attacked) return;",
    "    const stack = new Error().stack ?? '';",
    "    if (stack.includes(",
    "      'at readCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate'",
    "    ) && stack.includes(",
    "      'at Module.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate'",
    "    )) {",
    "      attacked = true;",
    "      Object.defineProperties(promise, {",
    "        constructor: { configurable: true, value: Object },",
    "        then: {",
    "          configurable: true,",
    "          value(resolve) {",
    "            Reflect.apply(nativeThen, this, [() => {}, () => {}]);",
    "            resolve(forged);",
    "          }",
    "        }",
    "      });",
    "    }",
    "  }",
    "});",
    "hook.enable();",
    "let loaded = false;",
    "let branded = false;",
    "let code = null;",
    "let outerError = false;",
    "let ownCause = null;",
    "let currentMechanical = null;",
    "try {",
    "  const result =",
    "    await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(",
    "      " + JSON.stringify(nonexistentRoot),
    "    );",
    "  loaded = true;",
    "  branded =",
    "    m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(",
    "      result",
    "    );",
    "  currentMechanical =",
    "    result.currentVedicStorageDesignMechanicallyVerified ?? null;",
    "} catch (error) {",
    "  code = error?.code ?? null;",
    "  outerError = error instanceof Error;",
    "  ownCause = Object.hasOwn(error, 'cause');",
    "} finally {",
    "  hook.disable();",
    "}",
    "process.stdout.write(JSON.stringify({",
    "  attacked,",
    "  branded,",
    "  code,",
    "  currentMechanical,",
    "  loaded,",
    "  outerError,",
    "  ownCause",
    "}));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(attack.stderr, "");
  assert.deepEqual(JSON.parse(attack.stdout), {
    attacked: true,
    branded: false,
    code: "AWAITABLE_IDENTITY_MISMATCH",
    currentMechanical: null,
    loaded: false,
    outerError: true,
    ownCause: false
  });
});

test("a transitive drift after readCurrent resolution is rejected by the final synchronous seal", async (t) => {
  const target = expectedTransitiveRawContexts[0];
  const fixture = await createWorkspaceFixture(
    t,
    "hakimi-vedic-post-readcurrent-drift-"
  );
  const targetPath = path.join(fixture, ...target.path.split("/"));
  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?post-readcurrent-drift=" + Date.now();
  const attackScript = [
    "import { createHook } from 'node:async_hooks';",
    "import { createHash } from 'node:crypto';",
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "const target = " + JSON.stringify(target) + ";",
    "const targetPath = " + JSON.stringify(targetPath) + ";",
    "const legitimateBytes = readFileSync(targetPath);",
    "const driftedBytes = Buffer.from(legitimateBytes);",
    "driftedBytes[0] ^= 1;",
    "if (driftedBytes.byteLength !== target.bytes) {",
    "  throw new Error('same-size drift precondition failed');",
    "}",
    "if (createHash('sha256').update(driftedBytes).digest('hex') === target.sha256) {",
    "  throw new Error('raw drift precondition failed');",
    "}",
    "const m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "let readCurrentPromiseId = null;",
    "let drifted = false;",
    "const hook = createHook({",
    "  init(asyncId, type) {",
    "    if (type !== 'PROMISE' || readCurrentPromiseId !== null) return;",
    "    const stack = new Error().stack ?? '';",
    "    if (stack.includes(",
    "      'at readCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate'",
    "    ) && stack.includes(",
    "      'at Module.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate'",
    "    )) {",
    "      readCurrentPromiseId = asyncId;",
    "    }",
    "  },",
    "  promiseResolve(asyncId) {",
    "    if (asyncId === readCurrentPromiseId && !drifted) {",
    "      writeFileSync(targetPath, driftedBytes);",
    "      drifted = true;",
    "    }",
    "  }",
    "});",
    "hook.enable();",
    "let loaded = false;",
    "let branded = false;",
    "let code = null;",
    "let outerError = false;",
    "let ownCause = null;",
    "try {",
    "  const result =",
    "    await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(",
    "      " + JSON.stringify(fixture),
    "    );",
    "  loaded = true;",
    "  branded =",
    "    m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(",
    "      result",
    "    );",
    "} catch (error) {",
    "  code = error?.code ?? null;",
    "  outerError = error instanceof Error;",
    "  ownCause = Object.hasOwn(error, 'cause');",
    "} finally {",
    "  hook.disable();",
    "}",
    "process.stdout.write(JSON.stringify({",
    "  branded,",
    "  code,",
    "  drifted,",
    "  loaded,",
    "  outerError,",
    "  ownCause,",
    "  readCurrentPromiseObserved: readCurrentPromiseId !== null",
    "}));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.equal(attack.stderr, "");
  assert.deepEqual(JSON.parse(attack.stdout), {
    branded: false,
    code: "UPSTREAM_RAW_IDENTITY_MISMATCH",
    drifted: true,
    loaded: false,
    outerError: true,
    ownCause: false,
    readCurrentPromiseObserved: true
  });
});

test("local strict UTF-8 decoder rejects overlong surrogate out-of-range truncated and stray sequences", () => {
  const invalidSequences = [
    [0xc0, 0xaf],
    [0xe0, 0x80, 0x80],
    [0xed, 0xa0, 0x80],
    [0xf4, 0x90, 0x80, 0x80],
    [0xe2, 0x82],
    [0x80]
  ];
  for (const sequence of invalidSequences) {
    assert.throws(
      () => testOnly.decodeStrictUtf8(
        new Uint8Array(sequence),
        "invalid UTF-8 vector"
      ),
      (error) => error?.code === "JSON_UTF8_INVALID"
    );
  }
});

test("ambient JSON.parse poisoning cannot make empty object bytes pass public parse then verify", () => {
  const originalParse = JSON.parse;
  try {
    JSON.parse = () => structuredClone(persisted);
    assert.throws(
      () => {
        const parsed =
          parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
            Buffer.from("{}\n", "utf8")
          );
        return verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(
          parsed
        );
      },
      (error) => [
        "INDEPENDENT_JSON_PARSE_MISMATCH",
        "DESIGN_OBJECT_MISMATCH"
      ].includes(error?.code)
    );
  } finally {
    JSON.parse = originalParse;
  }
});

test("ambient JSON.parse cannot admit invalid JSON or expose an internal clean-realm cause", () => {
  const originalParse = JSON.parse;
  let caught;
  try {
    JSON.parse = () => structuredClone(persisted);
    try {
      parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
        Buffer.from("{\"x\":1,}", "utf8"),
        "ambient-invalid-json"
      );
    } catch (error) {
      caught = error;
    }
  } finally {
    JSON.parse = originalParse;
  }
  assert.equal(caught instanceof Error, true);
  assert.equal(caught?.code, "JSON_PARSE_INVALID");
  assert.equal(Object.hasOwn(caught, "cause"), false);
});

test("revoked outer parse proxy yields fixed outer NON_PASSIVE_OBJECT without clean leakage", () => {
  const originalParse = JSON.parse;
  const originalIsArray = Array.isArray;
  const revocable = Proxy.revocable(structuredClone(persisted), {});
  let caught;
  let revokedByOuterProbe = false;
  try {
    JSON.parse = () => revocable.proxy;
    Array.isArray = (value) => {
      if (value === revocable.proxy) {
        revokedByOuterProbe = true;
        revocable.revoke();
        return false;
      }
      return Reflect.apply(originalIsArray, Array, [value]);
    };
    try {
      parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
        persistedBytes,
        "revoked-outer-parse-proxy"
      );
    } catch (error) {
      caught = error;
    }
  } finally {
    JSON.parse = originalParse;
    Array.isArray = originalIsArray;
  }
  assert.equal(revokedByOuterProbe, true);
  assert.equal(caught instanceof Error, true);
  assert.equal(caught?.code, "NON_PASSIVE_OBJECT");
  assert.equal(Object.hasOwn(caught, "cause"), false);
  assert.equal(
    caught.constructor.constructor("return globalThis")(),
    globalThis
  );
});

test("inherited outer Object.prototype.toJSON cannot alter canonical pretty materialization", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Object.prototype,
    "toJSON"
  );
  let caught;
  let materialized;
  try {
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      enumerable: false,
      value() {
        return 1n;
      },
      writable: true
    });
    try {
      materialized =
        canonicalPrettyStringifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
          {}
        );
    } catch (error) {
      caught = error;
    }
  } finally {
    if (originalDescriptor === undefined) {
      delete Object.prototype.toJSON;
    } else {
      Object.defineProperty(Object.prototype, "toJSON", originalDescriptor);
    }
  }
  assert.deepEqual(
    Object.getOwnPropertyDescriptor(Object.prototype, "toJSON"),
    originalDescriptor
  );
  assert.equal(caught, undefined);
  assert.equal(materialized, "{}\n");
});

test("stateful outer Array.slice poisoning cannot hide a self-resigned release promotion", async () => {
  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?pre-import-stateful-array-slice=" + Date.now();
  const attackScript = [
    "import { readFile } from 'node:fs/promises';",
    "const candidate = JSON.parse(await readFile("
      + JSON.stringify(candidateAbsolutePath) + ", 'utf8'));",
    "const originalSlice = Array.prototype.slice;",
    "let armed = false;",
    "let promotionTargetCalls = 0;",
    "Array.prototype.slice = function(...args) {",
    "  const copied = Reflect.apply(originalSlice, this, args);",
    "  if (!armed && Array.isArray(this) && this.length === 1 && this[0] === '__outer_slice_probe__') {",
    "    armed = true;",
    "    copied.push('__outer_pollution_active__');",
    "    return copied;",
    "  }",
    "  if (armed && Array.isArray(copied) && copied.includes('publicReleaseAuthorized')) {",
    "    promotionTargetCalls += 1;",
    "    return copied.filter((key) => key !== 'publicReleaseAuthorized');",
    "  }",
    "  return copied;",
    "};",
    "const probe = ['__outer_slice_probe__'].slice();",
    "let output;",
    "try {",
    "  const m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "  const promoted = structuredClone(candidate);",
    "  promoted.publicReleaseAuthorized = true;",
    "  promoted.designDigest = m.computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest(promoted);",
    "  let verified;",
    "  let code = null;",
    "  try {",
    "    verified = m.verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(promoted);",
    "  } catch (error) {",
    "    code = error?.code ?? null;",
    "  }",
    "  output = {",
    "    branded: m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(verified ?? promoted),",
    "    code,",
    "    outerProbePolluted: probe.includes('__outer_pollution_active__'),",
    "    promotionTargetCalls,",
    "    verifiedReturned: verified !== undefined",
    "  };",
    "} finally {",
    "  Array.prototype.slice = originalSlice;",
    "}",
    "process.stdout.write(JSON.stringify(output));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.deepEqual(JSON.parse(attack.stdout), {
    branded: false,
    code: "DESIGN_OBJECT_MISMATCH",
    outerProbePolluted: true,
    promotionTargetCalls: 0,
    verifiedReturned: false
  });
});

test("descriptor and slice own-key injection cannot promote a private branded result", async () => {
  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?pre-import-private-brand-own-key-injection=" + Date.now();
  const attackScript = [
    "const originalDescriptors = Object.getOwnPropertyDescriptors;",
    "const originalSlice = Array.prototype.slice;",
    "Object.getOwnPropertyDescriptors = function(value) {",
    "  const descriptors = Reflect.apply(originalDescriptors, Object, [value]);",
    "  if (value !== null && typeof value === 'object'",
    "      && Object.hasOwn(value, 'activeAdmissionEffect')",
    "      && Object.hasOwn(value, 'authorityRedGates')",
    "      && !Object.hasOwn(value, 'publicReleaseAuthorized')) {",
    "    descriptors.publicReleaseAuthorized = { configurable: true, enumerable: true, value: true, writable: true };",
    "  }",
    "  return descriptors;",
    "};",
    "Array.prototype.slice = function(...args) {",
    "  const copied = Reflect.apply(originalSlice, this, args);",
    "  return Array.isArray(copied) && copied.includes('publicReleaseAuthorized')",
    "    ? copied.filter((key) => key !== 'publicReleaseAuthorized')",
    "    : copied;",
    "};",
    "const descriptorProbe = Object.getOwnPropertyDescriptors({ activeAdmissionEffect: 'none', authorityRedGates: {} });",
    "const sliceProbe = ['publicReleaseAuthorized'].slice();",
    "let result;",
    "let output;",
    "try {",
    "  const m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "  try {",
    "    result = await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate("
      + JSON.stringify(workspaceRoot) + ");",
    "    output = {",
    "      branded: m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(result),",
    "      code: null,",
    "      descriptorProbeInjected: descriptorProbe.publicReleaseAuthorized?.value === true,",
    "      hasOwnTopLevelPublicReleaseAuthorized: Object.hasOwn(result, 'publicReleaseAuthorized'),",
    "      loaded: true,",
    "      nestedPublicReleaseAuthorized: result.authorityRedGates.publicReleaseAuthorized,",
    "      rootOwnKeys: Reflect.ownKeys(result),",
    "      sliceProbeFiltered: sliceProbe.length === 0",
    "    };",
    "  } catch (error) {",
    "    output = {",
    "      branded: result === undefined ? false : m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(result),",
    "      code: error?.code ?? error?.name ?? null,",
    "      descriptorProbeInjected: descriptorProbe.publicReleaseAuthorized?.value === true,",
    "      loaded: false,",
    "      sliceProbeFiltered: sliceProbe.length === 0",
    "    };",
    "  }",
    "} finally {",
    "  Object.getOwnPropertyDescriptors = originalDescriptors;",
    "  Array.prototype.slice = originalSlice;",
    "}",
    "process.stdout.write(JSON.stringify(output));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  const output = JSON.parse(attack.stdout);
  assert.equal(output.descriptorProbeInjected, true);
  assert.equal(output.sliceProbeFiltered, true);
  if (!output.loaded) {
    assert.equal(output.branded, false);
    assert.equal(typeof output.code, "string");
    assert.equal(output.code.length > 0, true);
    return;
  }
  assert.equal(output.code, null);
  assert.equal(output.branded, true);
  assert.equal(output.hasOwnTopLevelPublicReleaseAuthorized, false);
  assert.deepEqual(output.rootOwnKeys, [...testOnly.VERIFIED_RESULT_ROOT_KEYS]);
  assert.equal(output.nestedPublicReleaseAuthorized, false);
});

test("post-import global Set poisoning cannot make duplicate last-wins status pass parse then verify", () => {
  const canonicalText = persistedBytes.toString("utf8");
  const canonicalStatusLine = "  \"status\": "
    + JSON.stringify(testOnly.STATUS) + ",";
  assert.equal(canonicalText.split(canonicalStatusLine).length, 2);
  const duplicateText = canonicalText.replace(
    canonicalStatusLine,
    "  \"status\": \"forged_promoted_state_decoy\",\n" + canonicalStatusLine
  );
  assert.notEqual(duplicateText, canonicalText);
  const originalSet = globalThis.Set;
  let caught;
  class FakeDuplicateBlindSet {
    add() { return this; }
    has() { return false; }
    get size() { return 0; }
  }
  try {
    globalThis.Set = FakeDuplicateBlindSet;
    try {
      const parsed =
        parseVedicIndependentStorageBackupRecoveryRollbackDesignCandidateJsonBytes(
          Buffer.from(duplicateText, "utf8")
        );
      verifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidateObject(
        parsed
      );
    } catch (error) {
      caught = error;
    }
  } finally {
    globalThis.Set = originalSet;
  }
  assert.equal(caught instanceof Error, true);
  assert.equal(
    [
      "JSON_MATERIALIZATION_NON_CANONICAL",
      "JSON_DUPLICATE_KEY",
      "INDEPENDENT_JSON_PARSE_MISMATCH",
      "DESIGN_OBJECT_MISMATCH"
    ].includes(caught?.code),
    true,
    "unexpected fail-closed code: " + String(caught?.code)
  );
});

test("a changed persisted candidate fails its fixed raw identity even when canonical", async (t) => {
  const fixture = await createWorkspaceFixture(t, "hakimi-vedic-storage-candidate-drift-");
  const changed = structuredClone(persisted);
  changed.status = changed.status + "_drift";
  changed.designDigest =
    computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest(
      changed
    );
  await writeFile(
    path.join(
      fixture,
      ...VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH
        .split("/")
    ),
    canonicalPrettyStringifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      changed
    ),
    "utf8"
  );
  await assert.rejects(
    readCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      fixture
    ),
    (error) => error?.code === "DESIGN_RAW_IDENTITY_MISMATCH"
  );
});

test("a byte drift in any direct current context fails closed before design construction", async (t) => {
  for (const [index, context] of [
    testOnly.ADR_CONTEXT,
    testOnly.PARENT_CONTEXT,
    testOnly.RUNTIME_CONTEXT,
    testOnly.OBSERVATION_CONTEXT
  ].entries()) {
    await t.test(context.contextId, async (subtest) => {
      const fixture = await createWorkspaceFixture(
        subtest,
        "hakimi-vedic-storage-upstream-" + index + "-"
      );
      const absolute = path.join(fixture, ...context.path.split("/"));
      const bytes = await readFile(absolute);
      await writeFile(absolute, Buffer.concat([bytes, Buffer.from("\n")]));
      await assert.rejects(
        buildCurrentVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
          fixture
        ),
        (error) => typeof error?.code === "string"
          && /(?:IDENTITY|MISMATCH|CLOSURE|INVALID)/.test(error.code)
      );
    });
  }
});

test("every transitive child drift is rejected by the independent raw pins before legacy verifiers", async (t) => {
  const fixture = await createWorkspaceFixture(
    t,
    "hakimi-vedic-storage-transitive-drift-"
  );
  for (const [index, context] of expectedTransitiveRawContexts.entries()) {
    await t.test(context.contextId, async () => {
      const absolute = path.join(fixture, ...context.path.split("/"));
      const original = await readFile(absolute);
      try {
        await writeFile(
          absolute,
          Buffer.concat([original, Buffer.from("\n" + String(index))])
        );
        await assert.rejects(
          testOnly.collectDirectCurrentContexts(fixture),
          (error) => error?.code === "UPSTREAM_RAW_IDENTITY_MISMATCH"
        );
      } finally {
        await writeFile(absolute, original);
      }
    });
  }
});

test("post-import path.resolve fixture-root redirection cannot substitute the real workspace", async (t) => {
  const fixture = await createWorkspaceFixture(
    t,
    "hakimi-vedic-storage-path-resolve-poison-"
  );
  const fixtureCandidate = path.join(
    fixture,
    ...VEDIC_INDEPENDENT_STORAGE_BACKUP_RECOVERY_ROLLBACK_DESIGN_CANDIDATE_RELATIVE_PATH
      .split("/")
  );
  await writeFile(
    fixtureCandidate,
    Buffer.concat([await readFile(fixtureCandidate), Buffer.from("\n")])
  );
  const freshModuleUrl = pathToFileURL(libraryAbsolutePath).href
    + "?post-import-path-resolve-poison=" + Date.now();
  const attackScript = [
    "import path from 'node:path';",
    "const m = await import(" + JSON.stringify(freshModuleUrl) + ");",
    "const originalResolve = path.resolve;",
    "path.resolve = (...args) => args.length === 1 && args[0] === "
      + JSON.stringify(fixture),
    "  ? " + JSON.stringify(workspaceRoot),
    "  : Reflect.apply(originalResolve, path, args);",
    "let output;",
    "try {",
    "  const result = await m.loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate("
      + JSON.stringify(fixture) + ");",
    "  output = { loaded: true, branded: m.isVerifiedVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(result), code: null };",
    "} catch (error) {",
    "  output = { loaded: false, branded: false, code: error?.code ?? null };",
    "}",
    "process.stdout.write(JSON.stringify(output));"
  ].join("\n");
  const attack = await execFileAsync(process.execPath, [
    "--input-type=module",
    "-e",
    attackScript
  ], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    windowsHide: true,
    timeout: 60_000
  });
  assert.deepEqual(JSON.parse(attack.stdout), {
    branded: false,
    code: "UNSAFE_ARTIFACT_PATH",
    loaded: false
  });
});

test("CLI is module-root fixed narrow and reports only red mechanical closure", async () => {
  const success = await execFileAsync(process.execPath, [cliAbsolutePath], {
    cwd: tmpdir(),
    env: sanitizedEnvironment({
      VEDIC_STORAGE_DESIGN_CANDIDATE_PATH: "does-not-exist.json"
    }),
    windowsHide: true,
    timeout: 60_000
  });
  const output = JSON.parse(success.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.currentBrandVerified, false);
  assert.equal(output.sequentialEndpointObservationBrandVerified, true);
  assert.equal(output.simultaneousCurrentRawClosureVerified, false);
  assert.equal(output.loadedModuleByteIdentityVerified, false);
  assert.equal(output.nodeLoaderIntegrityVerified, false);
  assert.equal(output.postImportPollutionExcluded, false);
  assert.equal(output.runtimeIntrinsicIntegrityVerified, false);
  assert.equal(output.runtimeLauncherIdentityVerified, false);
  assert.equal(output.activeAdmissionEffect, "none");
  assert.equal(output.currentVedicStorageDesignMechanicallyVerified, false);
  assert.equal(
    output.sequentialEndpointObservationMechanicallyVerified,
    true
  );
  assert.equal(output.designCoverage.interfaceRequirementsDefined, 6);
  assert.equal(output.designCoverage.designExecutionStarted, false);
  assert.equal(output.rereviewBoundary.historicalParentRequirementState, "required_absent");
  assert.equal(output.rereviewBoundary.historicalParentRereviewRequirementsComplete, 3);
  assert.equal(output.rereviewBoundary.formalRereviewRequirementSatisfied, false);
  assert.equal(output.implementationAccounting.namespaceInstances, 0);
  assert.equal(output.implementationAccounting.backupImplementations, 0);
  assert.equal(output.mutationRedGates.mutationEpochAvailable, false);
  assert.equal(output.mutationRedGates.abaExcluded, false);
  assert.deepEqual(output.productIdentity, {
    migrationId: null,
    releaseIdentity: null,
    targetSchema: null
  });
  assert.deepEqual(output.projectReleaseGovernanceContext, {
    activeLine: "legacy-v13",
    inheritedByVedicProductIdentity: false,
    migrationId: null,
    targetSchema: 13
  });
  for (const [key, value] of Object.entries(output.authorityRedGates)) {
    assert.equal(value, false, key);
  }
});

test("CLI rejects operands visible NODE launch state and preserves identity non-claims", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cliAbsolutePath, "decoy.json"], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      windowsHide: true,
      timeout: 60_000
    }),
    (error) => {
      const failure = JSON.parse(error.stderr);
      return error.code === 2 && failure.code === "CLI_OPERAND_FORBIDDEN";
    }
  );
  for (const environment of [
    { NODE_PATH: "C:\\decoy" },
    { NODE_OPTIONS: "--import=data:text/javascript,globalThis.__decoy%3Dtrue" }
  ]) {
    await assert.rejects(
      execFileAsync(process.execPath, [cliAbsolutePath], {
        cwd: workspaceRoot,
        env: sanitizedEnvironment(environment),
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
  assert.equal(erasedOutput.currentBrandVerified, false);
  assert.equal(
    erasedOutput.sequentialEndpointObservationBrandVerified,
    true
  );
  assert.equal(erasedOutput.simultaneousCurrentRawClosureVerified, false);
  assert.equal(erasedOutput.loadedModuleByteIdentityVerified, false);
  assert.equal(erasedOutput.nodeLoaderIntegrityVerified, false);
  assert.equal(erasedOutput.postImportPollutionExcluded, false);
  assert.equal(erasedOutput.runtimeIntrinsicIntegrityVerified, false);
  assert.equal(erasedOutput.runtimeLauncherIdentityVerified, false);
});

test("candidate is canonical LF and exact raw identity is pinned", () => {
  assert.equal(persistedBytes.byteLength, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(persistedBytes).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(
    canonicalPrettyStringifyVedicIndependentStorageBackupRecoveryRollbackDesignCandidate(
      persisted
    ),
    persistedBytes.toString("utf8")
  );
  assert.equal(persistedBytes.includes(Buffer.from("\r\n")), false);
  assert.equal(persistedBytes[persistedBytes.byteLength - 1], 0x0a);
  assert.equal(
    persisted.designDigest,
    computeVedicIndependentStorageBackupRecoveryRollbackDesignCandidateDigest(
      persisted
    )
  );
});

test("parent runtime observation registry apps and packages have no candidate backlink", async () => {
  const forbiddenNeedles = [
    "vedic-independent-storage-backup-recovery-and-rollback-design-candidate",
    "loadVedicIndependentStorageBackupRecoveryRollbackDesignCandidate"
  ];
  const fixedFiles = [
    testOnly.PARENT_CONTEXT.path,
    testOnly.RUNTIME_CONTEXT.path,
    testOnly.OBSERVATION_CONTEXT.path,
    "content/system-admission/four-system-admission.v1.json",
    "scripts/system-admission-registry-lib.mjs"
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
    const queue = [path.join(workspaceRoot, relativeDirectory)];
    while (queue.length > 0) {
      const directory = queue.pop();
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        const relative = path.relative(workspaceRoot, absolute);
        if (path.normalize(relative) === restricted) continue;
        if (entry.isDirectory()) {
          if (!["node_modules", "dist", "coverage"].includes(entry.name)) {
            queue.push(absolute);
          }
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

test("design library imports no product storage backup web or restricted implementation", async () => {
  const source = await readFile(libraryAbsolutePath, "utf8");
  for (const forbidden of [
    "packages/storage",
    "packages/backup",
    "apps/web",
    "local-user-data-cleanup"
  ]) {
    assert.equal(source.includes(forbidden), false, "library contains " + forbidden);
  }
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => match[1]);
  assert.deepEqual(imports.filter((specifier) =>
    specifier.includes("storage")
      || specifier.includes("backup")
      || specifier.includes("apps/web")
  ), []);
});
