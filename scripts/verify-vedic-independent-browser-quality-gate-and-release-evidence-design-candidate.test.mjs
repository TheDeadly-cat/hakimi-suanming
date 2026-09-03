import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";

import {
  buildCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate,
  canonicalPrettyStringifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate,
  computeVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateDigest,
  isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate,
  loadVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate,
  parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes,
  readCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate,
  VEDIC_INDEPENDENT_BROWSER_QUALITY_GATE_RELEASE_EVIDENCE_DESIGN_CANDIDATE_RELATIVE_PATH,
  verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject
} from "./vedic-independent-browser-quality-gate-and-release-evidence-design-candidate-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const candidateAbsolutePath = path.join(
  workspaceRoot,
  ...VEDIC_INDEPENDENT_BROWSER_QUALITY_GATE_RELEASE_EVIDENCE_DESIGN_CANDIDATE_RELATIVE_PATH
    .split("/")
);
const cliAbsolutePath = path.join(
  scriptsDirectory,
  "verify-vedic-independent-browser-quality-gate-and-release-evidence-design-candidate.mjs"
);
const expectedInterfaceIds = [
  "microsoft_edge_browser_receipt_interface",
  "google_chrome_browser_receipt_interface",
  "artifact_identity_receipt_interface",
  "build_receipt_interface",
  "runtime_execution_receipt_interface",
  "deployment_receipt_interface",
  "rollback_receipt_interface",
  "evidence_retention_receipt_interface"
];
const expectedBrowserRunRoles = [
  {
    cacheState: "cold_empty_before_exact_release_load",
    connectivitySequence: "online_only",
    currentExecutedInstances: 0,
    formalReceiptInstances: 0,
    profileState: "new_empty_browser_profile",
    requiredScenarioIds: [
      "unique",
      "gap",
      "overlap_reject",
      "overlap_earlier",
      "overlap_later"
    ],
    runRoleId: "fresh_profile_online_desktop",
    serviceWorkerLifecycle:
      "no_registration_before_run_then_record_actual_registration_state",
    updateLifecycle: "initial_exact_release_load_no_update",
    viewportProfile: "owner_selected_fixed_desktop_viewport"
  },
  {
    cacheState: "cold_empty_before_exact_release_load",
    connectivitySequence: "online_only",
    currentExecutedInstances: 0,
    formalReceiptInstances: 0,
    profileState: "second_new_empty_browser_profile",
    requiredScenarioIds: [
      "unique",
      "gap",
      "overlap_reject",
      "overlap_earlier",
      "overlap_later"
    ],
    runRoleId: "fresh_profile_online_390x844",
    serviceWorkerLifecycle:
      "no_registration_before_run_then_record_actual_registration_state",
    updateLifecycle: "initial_exact_release_load_no_update",
    viewportProfile: "desktop_browser_emulated_390x844_viewport"
  },
  {
    cacheState: "warm_release_n_cache_then_measured_release_n_plus_1_convergence",
    connectivitySequence:
      "online_release_n_then_offline_cold_start_then_online_update_then_offline_recheck",
    currentExecutedInstances: 0,
    formalReceiptInstances: 0,
    profileState: "retained_profile_from_accepted_release_n_install",
    requiredScenarioIds: [
      "unique",
      "gap",
      "overlap_reject",
      "overlap_earlier",
      "overlap_later"
    ],
    runRoleId: "retained_profile_offline_update_transition",
    serviceWorkerLifecycle:
      "record_release_n_controller_then_release_n_plus_1_controller_and_cache_convergence",
    updateLifecycle:
      "bind_subject_release_n_plus_1_and_predecessor_release_n_artifact_identities_or_fail_closed",
    viewportProfile: "owner_selected_fixed_desktop_viewport"
  }
];
const directContextPaths = [
  "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md",
  "content/system-admission/vedic-independent-productization-requirements.v1.json",
  "content/system-admission/vedic-runtime-and-bundle-size-proposal.v1.json",
  "content/system-admission/vedic-independent-storage-backup-recovery-and-rollback-design-candidate.v0.1.0.json",
  "content/system-admission/vedic-civil-time-fact-browser-observation-candidate.v1.0.0.json"
];

let built;
let persisted;
let persistedBytes;
let readCurrent;
let loaded;

before(async () => {
  persistedBytes = await readFile(candidateAbsolutePath);
  persisted =
    parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      persistedBytes
    );
  built =
    await buildCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      workspaceRoot
    );
  readCurrent =
    await readCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      workspaceRoot
    );
  loaded =
    await loadVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
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
    computeVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateDigest(
      candidate
    );
  return candidate;
}

function assertSelfResignedRejected(mutator) {
  const candidate = resignCandidate(mutator);
  assert.equal(
    candidate.designDigest,
    computeVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateDigest(
      candidate
    )
  );
  assert.throws(
    () =>
      verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(
        candidate
      ),
    (error) => error?.code === "DESIGN_OBJECT_MISMATCH"
  );
  assert.equal(
    isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      candidate
    ),
    false
  );
}

async function createWorkspaceFixture(t, prefix = "hakimi-vedic-browser-release-design-") {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), prefix));
  t.after(async () => {
    const resolved = path.resolve(fixtureRoot);
    assert.equal(path.basename(resolved).startsWith(prefix), true);
    await rm(resolved, { recursive: true, force: true });
  });
  for (const relative of [
    "content/system-admission",
    "docs",
    "isolated-drafts/vedic-civil-time-fact-browser-draft",
    "packages/tzdb-core/src",
    "scripts"
  ]) {
    await cp(
      path.join(workspaceRoot, ...relative.split("/")),
      path.join(fixtureRoot, ...relative.split("/")),
      { recursive: true }
    );
  }
  await symlink(
    path.join(workspaceRoot, "node_modules"),
    path.join(fixtureRoot, "node_modules"),
    "junction"
  );
  const appsWebFixture = path.join(fixtureRoot, "apps", "web");
  await mkdir(appsWebFixture, { recursive: true });
  await mkdir(path.join(appsWebFixture, "node_modules"));
  const browserObservationCandidate = JSON.parse(await readFile(
    path.join(
      workspaceRoot,
      "content",
      "system-admission",
      "vedic-civil-time-fact-browser-observation-candidate.v1.0.0.json"
    ),
    "utf8"
  ));
  const syntheticScanFileCount =
    browserObservationCandidate.staticBoundaryObservation
      .productionReachabilityAudit.appsWebReadableSourceFilesScanned;
  assert.equal(Number.isSafeInteger(syntheticScanFileCount), true);
  assert.equal(syntheticScanFileCount > 0, true);
  await Promise.all(Array.from(
    { length: syntheticScanFileCount },
    (_, index) => writeFile(
      path.join(appsWebFixture, `fixture-${String(index).padStart(3, "0")}.ts`),
      "export {};\n",
      "utf8"
    )
  ));
  return fixtureRoot;
}

async function runCli(
  args = [],
  env = sanitizedEnvironment(),
  cli = cliAbsolutePath,
  nodeExecArgv = []
) {
  try {
    const result = await execFileAsync(
      process.execPath,
      [...nodeExecArgv, cli, ...args],
      {
      cwd: workspaceRoot,
      env,
      windowsHide: true
      }
    );
    return { code: 0, stderr: result.stderr, stdout: result.stdout };
  } catch (error) {
    return {
      code: error.code,
      stderr: error.stderr ?? "",
      stdout: error.stdout ?? ""
    };
  }
}

test("fixed-path loader alone mints a narrow immutable private brand", () => {
  assert.deepEqual(built, persisted);
  assert.deepEqual(readCurrent, persisted);
  assert.equal(
    canonicalPrettyStringifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      persisted
    ),
    persistedBytes.toString("utf8")
  );
  assert.equal(
    persisted.designDigest,
    computeVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateDigest(
      persisted
    )
  );
  assert.equal(
    isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      built
    ),
    false
  );
  assert.equal(
    isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      readCurrent
    ),
    false
  );
  assert.equal(
    isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      loaded
    ),
    true
  );
  assert.equal(loaded.sequentialFixedPathObservationMechanicallyVerified, true);
  assert.equal(loaded.simultaneousCurrentRawClosureVerified, false);
  assertDeepFrozen(built);
  assertDeepFrozen(readCurrent);
  assertDeepFrozen(loaded);
});

test("post-import WeakSet and Object.isFrozen poisoning cannot forge or shallow-mint the private brand", async () => {
  const weakSetHasDescriptor = Object.getOwnPropertyDescriptor(
    WeakSet.prototype,
    "has"
  );
  const objectIsFrozenDescriptor = Object.getOwnPropertyDescriptor(
    Object,
    "isFrozen"
  );
  const objectGetOwnPropertyDescriptorDescriptor =
    Object.getOwnPropertyDescriptor(Object, "getOwnPropertyDescriptor");
  const arrayIteratorDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    Symbol.iterator
  );
  const forged = Object.freeze({ activeAdmissionEffect: "none" });
  let mintedDuringPoison;
  assert.equal(
    isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      forged
    ),
    false
  );
  try {
    Object.defineProperty(WeakSet.prototype, "has", {
      ...weakSetHasDescriptor,
      value(value) {
        if (value === forged) return true;
        if (value !== null
          && typeof value === "object"
          && Object.hasOwn(value, "artifact")
          && Object.hasOwn(value, "simultaneousCurrentRawClosureVerified")) {
          Object.freeze(value);
          return true;
        }
        return Reflect.apply(weakSetHasDescriptor.value, this, [value]);
      }
    });
    Object.defineProperty(Object, "isFrozen", {
      ...objectIsFrozenDescriptor,
      value: () => true
    });
    Object.defineProperty(Object, "getOwnPropertyDescriptor", {
      ...objectGetOwnPropertyDescriptorDescriptor,
      value(target, key) {
        const descriptor = Reflect.apply(
          objectGetOwnPropertyDescriptorDescriptor.value,
          Object,
          [target, key]
        );
        if (descriptor
          && target !== null
          && typeof target === "object"
          && Object.hasOwn(target, "scientificTruthEstablished")
          && (key === "publicReleaseAuthorized" || key === "releaseReady")) {
          return { ...descriptor, value: true };
        }
        return descriptor;
      }
    });
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      ...arrayIteratorDescriptor,
      value() {
        for (let index = 0; index < this.length; index += 1) {
          if (this[index] === "microsoft_edge_browser_receipt_interface"
            || this[index]?.runRoleId === "fresh_profile_online_desktop") {
            return { next: () => ({ done: true, value: undefined }) };
          }
        }
        return Reflect.apply(arrayIteratorDescriptor.value, this, []);
      }
    });
    assert.equal(
      isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
        forged
      ),
      false
    );
    assert.equal(
      isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
        loaded
      ),
      true
    );
    mintedDuringPoison =
      await loadVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
        workspaceRoot
      );
    assert.equal(
      isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
        mintedDuringPoison
      ),
      true
    );
    assert.throws(
      () => { mintedDuringPoison.authorityBoundary.releaseReady = true; },
      TypeError
    );
  } finally {
    Object.defineProperty(WeakSet.prototype, "has", weakSetHasDescriptor);
    Object.defineProperty(
      Array.prototype,
      Symbol.iterator,
      arrayIteratorDescriptor
    );
    Object.defineProperty(
      Object,
      "getOwnPropertyDescriptor",
      objectGetOwnPropertyDescriptorDescriptor
    );
    Object.defineProperty(Object, "isFrozen", objectIsFrozenDescriptor);
  }
  assertDeepFrozen(mintedDuringPoison);
  assert.equal(mintedDuringPoison.authorityBoundary.releaseReady, false);
});

test("post-import inherited setters and Array.push poisoning cannot corrupt a minted summary", async () => {
  const releaseReadyDescriptor = Object.getOwnPropertyDescriptor(
    Object.prototype,
    "releaseReady"
  );
  const arrayPushDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    "push"
  );
  const pending =
    loadVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      workspaceRoot
    );
  let mintedDuringPoison;
  try {
    Object.defineProperty(Object.prototype, "releaseReady", {
      configurable: true,
      enumerable: false,
      get: () => true,
      set(value) {
        const callerLine = (new Error().stack ?? "").split("\n")[2] ?? "";
        if (callerLine.includes(
          "vedic-independent-browser-quality-gate-and-release-evidence-design-candidate-lib.mjs"
        )) return;
        Object.defineProperty(this, "releaseReady", {
          configurable: true,
          enumerable: true,
          value,
          writable: true
        });
      }
    });
    Object.defineProperty(Array.prototype, "push", {
      ...arrayPushDescriptor,
      value(...values) {
        if (values.length === 1
          && values[0] === "microsoft_edge_browser_receipt_interface") {
          const callerLine = (new Error().stack ?? "").split("\n")[2] ?? "";
          if (callerLine.includes(
            "vedic-independent-browser-quality-gate-and-release-evidence-design-candidate-lib.mjs"
          )) return this.length;
        }
        return Reflect.apply(arrayPushDescriptor.value, this, values);
      }
    });
    mintedDuringPoison = await pending;
    assert.equal(
      isVerifiedVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
        mintedDuringPoison
      ),
      true
    );
    assert.equal(
      Object.hasOwn(mintedDuringPoison.authorityBoundary, "releaseReady"),
      true
    );
    assert.equal(mintedDuringPoison.authorityBoundary.releaseReady, false);
    assert.deepEqual(
      mintedDuringPoison.designCoverage.interfaceRequirementIds,
      expectedInterfaceIds
    );
  } finally {
    Object.defineProperty(Array.prototype, "push", arrayPushDescriptor);
    if (releaseReadyDescriptor === undefined) {
      delete Object.prototype.releaseReady;
    } else {
      Object.defineProperty(
        Object.prototype,
        "releaseReady",
        releaseReadyDescriptor
      );
    }
  }
  assertDeepFrozen(mintedDuringPoison);
});

test("eight canonical interfaces use the exact requirements-only shape and zero instances", () => {
  assert.deepEqual(built.designCoverage.interfaceRequirementIds, expectedInterfaceIds);
  assert.equal(built.designCoverage.interfaceRequirementsRequired, 8);
  assert.equal(built.designCoverage.interfaceRequirementsDefined, 8);
  assert.equal(built.designCoverage.designExecutionStarted, false);
  assert.equal(built.designCoverage.designReceiptsIssued, 0);
  assert.equal(
    built.designCoverage.designMaterialCandidateCompleteMeans,
    "eight_requirements_texts_present_only"
  );
  assert.deepEqual(
    built.interfaceRequirements.map((row) => row.interfaceRequirementId),
    expectedInterfaceIds
  );
  const exactKeys = [
    "failClosedConditions",
    "interfaceRequirementId",
    "invariants",
    "nonClaims",
    "requiredEvidenceBeforeImplementation",
    "requiredInputs",
    "requiredOutputs",
    "requirementsDefined",
    "runtimeImplementationInstances",
    "status"
  ].sort();
  for (const row of built.interfaceRequirements) {
    assert.deepEqual(Object.keys(row).sort(), exactKeys);
    assert.equal(row.requirementsDefined, true);
    assert.equal(row.runtimeImplementationInstances, 0);
    assert.equal(row.status, "requirements_only_zero_implementation");
    for (const field of [
      "failClosedConditions",
      "invariants",
      "nonClaims",
      "requiredEvidenceBeforeImplementation",
      "requiredInputs",
      "requiredOutputs"
    ]) {
      assert.equal(row[field].length > 0, true);
    }
  }
});

test("future receipt exact-set and cross-binding rules are frozen while every instance is zero", () => {
  assert.deepEqual(
    built.receiptTypeDefinitions.map((row) => row.interfaceRequirementId),
    expectedInterfaceIds
  );
  assert.deepEqual(
    built.receiptTypeDefinitions.map((row) => row.minimumAcceptedReceipts),
    [3, 3, 1, 2, 6, 1, 1, 1]
  );
  assert.deepEqual(
    built.receiptTypeDefinitions.map((row) => row.issuerRoleId),
    [
      "independent_browser_matrix_observer",
      "independent_browser_matrix_observer",
      "engineering_artifact_identity_recorder",
      "independent_build_executor",
      "runtime_security_privacy_observer",
      "deployment_provider_operator",
      "rollback_recovery_operator",
      "evidence_retention_custodian"
    ]
  );
  assert.deepEqual(
    built.receiptTypeDefinitions.map((row) => row.currentAcceptedReceipts),
    Array(8).fill(0)
  );
  assert.deepEqual(
    built.releaseEvidenceConjunctiveGate.requiredInterfaceIds,
    expectedInterfaceIds
  );
  assert.deepEqual(
    built.releaseEvidenceConjunctiveGate.requiredReceiptTypesAndMinimumCounts,
    built.receiptTypeDefinitions
  );
  assert.equal(built.releaseEvidenceConjunctiveGate.receiptRoleExactSetRequired, true);
  assert.equal(built.releaseEvidenceConjunctiveGate.missingReceiptRoleRejected, true);
  assert.equal(built.releaseEvidenceConjunctiveGate.extraReceiptRoleRejected, true);
  assert.equal(built.releaseEvidenceConjunctiveGate.duplicateReceiptIdRejected, true);
  assert.equal(built.releaseEvidenceConjunctiveGate.receiptMaySatisfyMultipleRoles, false);
  assert.equal(
    built.releaseEvidenceConjunctiveGate.mixedReleaseArtifactRuntimeOrHostBundleRejected,
    true
  );
  assert.deepEqual(
    built.releaseEvidenceConjunctiveGate.crossReceiptBindingFields,
    [
      "independent_vedic_product_identity",
      "release_identity",
      "target_schema_identity",
      "migration_identity",
      "release_evidence_set_identity",
      "source_lock_identity",
      "subject_artifact_set_digest",
      "runtime_option_identity",
      "build_identity",
      "storage_identity",
      "deployment_host_identity",
      "mutation_epoch_lineage",
      "rollback_release_lineage"
    ]
  );
  assert.equal(
    built.releaseEvidenceConjunctiveGate.exactBrowserRunRoleMatricesRequired,
    true
  );
  assert.equal(
    built.releaseEvidenceConjunctiveGate
      .allReceiptsMustBindSameSubjectArtifactReleaseAndEvidenceSet,
    true
  );
  assert.equal(
    built.releaseEvidenceConjunctiveGate.predecessorArtifactMayReplaceSubjectArtifact,
    false
  );
  assert.deepEqual(
    built.releaseEvidenceConjunctiveGate.transitionRoleAdditionalBindingFields,
    [
      "predecessor_release_identity",
      "predecessor_artifact_set_digest",
      "update_source_identity",
      "before_after_cache_and_controller_lineage"
    ]
  );
  assert.equal(
    built.releaseEvidenceConjunctiveGate.transitionRoleId,
    "retained_profile_offline_update_transition"
  );
  assert.equal(
    built.releaseEvidenceConjunctiveGate
      .transitionRolePredecessorBindingsAreAdditionalOnly,
    true
  );
  assert.equal(built.releaseEvidenceConjunctiveGate.currentGateSatisfied, false);
  assert.equal(built.releaseEvidenceConjunctiveGate.currentReleaseEvidenceSetId, null);
  assert.deepEqual(
    built.actorRoleRequirements.map((row) => row.roleInstances),
    Array(8).fill(0)
  );
  assert.deepEqual(Object.values(built.evidenceBoundary), [0, 0, 0, 0, 0, 0, 0, 0, false, 0]);
});

test("Edge and Chrome each require three exact non-repeatable run roles", () => {
  assert.deepEqual(
    built.browserRunMatrixRequirements.map((matrix) => matrix.browserId),
    ["microsoft_edge", "google_chrome"]
  );
  for (const [index, matrix] of built.browserRunMatrixRequirements.entries()) {
    assert.equal(matrix.interfaceRequirementId, expectedInterfaceIds[index]);
    assert.equal(matrix.plannedRuns, 3);
    assert.equal(matrix.currentExecutedRuns, 0);
    assert.equal(matrix.currentAcceptedReceipts, 0);
    assert.equal(matrix.exactBrowserVersionRequired, true);
    assert.equal(matrix.exactRunRoleSetRequired, true);
    assert.equal(matrix.uniqueProfileDirectoriesRequired, true);
    assert.equal(matrix.uniqueRunIdsRequired, true);
    assert.deepEqual(matrix.runRoles, expectedBrowserRunRoles);
    for (const role of matrix.runRoles) {
      assert.equal(role.currentExecutedInstances, 0);
      assert.equal(role.formalReceiptInstances, 0);
      assert.deepEqual(
        role.requiredScenarioIds,
        ["unique", "gap", "overlap_reject", "overlap_earlier", "overlap_later"]
      );
    }
  }
});

test("IAB and two-build observations remain operator-supplied engineering baseline only", () => {
  const baseline = built.baselineEngineeringObservation;
  assert.equal(baseline.browserProduct, "Codex In-app Browser");
  assert.equal(baseline.browserVersion, null);
  assert.equal(baseline.origin, "http://127.0.0.1:4226");
  assert.equal(baseline.operatorSuppliedEvidence, true);
  assert.equal(baseline.toolAttestationEstablished, false);
  assert.equal(baseline.currentObservationIsFormalReleaseEvidence, false);
  assert.equal(baseline.buildOutputIdentityCount, 2);
  assert.equal(baseline.buildArtifactFileCountPerRun, 12);
  assert.equal(baseline.buildManifestPayloadEntryCount, 11);
  assert.equal(baseline.iabObservationCount, 1);
  assert.equal(baseline.productionBrowserObservationCount, 0);
  assert.equal(baseline.edgeValidated, false);
  assert.equal(baseline.chromeValidated, false);
  assert.equal(baseline.productionBrowserRuntimeEvidenceEstablished, false);
  assert.equal(baseline.productionHostValidated, false);
  assert.deepEqual(
    baseline.scenarioIds,
    ["unique", "gap", "overlap_reject", "overlap_earlier", "overlap_later"]
  );
  assert.equal(baseline.networkProbePerformed, false);
  assert.equal(baseline.networkRequestCountObserved, null);
  assert.equal(baseline.storageProbePerformed, false);
  assert.equal(baseline.storageMutationObserved, null);
  assert.equal(baseline.cookieProbePerformed, false);
  assert.equal(baseline.cookieMutationObserved, null);
  assert.equal(baseline.serviceWorkerProbePerformed, false);
  assert.equal(baseline.serviceWorkerRegistrationObserved, null);
  assert.equal(
    baseline.headerObservationProvenance,
    "separate_http_response_read_not_iab_dom_observation"
  );
});

test("runtime ceilings and storage design remain unmeasured unapproved and unimplemented", () => {
  const plan = built.quantitativePlanObservations;
  assert.equal(plan.runtimeOptionsObserved, 2);
  assert.equal(plan.candidateCeilingEntriesObserved, 18);
  assert.equal(plan.browserMatrixEntriesObserved, 2);
  assert.equal(plan.edgePlannedRuns, 3);
  assert.equal(plan.chromePlannedRuns, 3);
  assert.equal(plan.plannedBrowserRunsTotal, 6);
  assert.equal(plan.edgeExecutedRuns, 0);
  assert.equal(plan.chromeExecutedRuns, 0);
  assert.equal(plan.observedMeasurements, 0);
  assert.equal(plan.candidateCeilingsMeasured, 0);
  assert.equal(plan.candidateCeilingsApproved, 0);
  assert.deepEqual(
    plan.retentionCeilings.map((row) => row.proposedCeiling),
    [50000000, 100000000]
  );
  for (const row of plan.retentionCeilings) {
    assert.equal(row.measurementStatus, "not_measured");
    assert.equal(row.approvalStatus, "unapproved_candidate");
    assert.equal(row.observedValue, null);
    assert.equal(row.inheritedAsMeasurement, false);
    assert.equal(row.inheritedAsApprovedBudget, false);
  }
  for (const [key, value] of Object.entries(built.storageDesignBaseline)) {
    if (key === "releaseRollbackReceiptInterchangeableWithStorageDesignInterface") {
      assert.equal(value, false);
    }
  }
  assert.equal(built.storageDesignBaseline.designInterfaceRequirementsDefined, 6);
  assert.equal(built.storageDesignBaseline.designInterfaceRequirementsRequired, 6);
  assert.equal(built.storageDesignBaseline.backupImplementations, 0);
  assert.equal(built.storageDesignBaseline.recoveryImplementations, 0);
  assert.equal(built.storageDesignBaseline.rollbackImplementations, 0);
  assert.equal(built.storageDesignBaseline.mutationEpochAvailable, false);
  assert.equal(built.storageDesignBaseline.mutationEpochReceipt, null);
});

test("parent gates identity authority and current-closure claims stay red", () => {
  assert.deepEqual(built.gateSummary, {
    admissionGatesRequired: 8,
    admissionGatesSatisfied: 0,
    bindingFrozenVerified: 0,
    bindingRequired: 38,
    independentExpertReviewsVerified: 0,
    independentExpertsRequired: 2,
    requirementsUniverseClosed: false,
    rereviewRequirementsComplete: 3,
    rereviewRequirementsRequired: 7,
    rereviewTriggered: false
  });
  assert.equal(built.rereviewBoundary.formalRereviewRequirementSatisfied, false);
  assert.equal(built.rereviewBoundary.historicalParentRequirementState, "required_absent");
  assert.equal(built.rereviewBoundary.parentLedgerUpdated, false);
  assert.equal(built.rereviewBoundary.registryUpdated, false);
  assert.equal(built.rereviewBoundary.ownerDecision, null);
  assert.deepEqual(
    [
      built.systemIdentity.productIdentity,
      built.systemIdentity.releaseIdentity,
      built.systemIdentity.targetSchema,
      built.systemIdentity.migrationId
    ],
    [null, null, null, null]
  );
  assert.deepEqual(
    built.projectDefaultReleaseGovernanceContext,
    {
      activeLine: "legacy-v13",
      inheritedByVedicProductIdentity: false,
      migrationId: null,
      targetSchema: 13
    }
  );
  assert.equal(Object.values(built.authorityBoundary).every((value) => value === false), true);
  assert.deepEqual(built.evidenceAccounts, [
    {
      accountId: "engineering_evidence",
      authorityGranted: false,
      formalReceiptAccepted: false,
      observationPresent: true
    },
    {
      accountId: "browser_runtime_evidence",
      authorityGranted: false,
      formalReceiptAccepted: false,
      observationPresent: true,
      productionValidated: false
    },
    { accountId: "content_truth", authorityGranted: false, established: false },
    { accountId: "expert_truth", authorityGranted: false, established: false },
    {
      accountId: "rights_legal_judgment",
      authorityGranted: false,
      established: false
    },
    {
      accountId: "release_readiness",
      authorityGranted: false,
      established: false
    },
    {
      accountId: "public_release_authorization",
      authorityGranted: false,
      established: false
    }
  ]);
  assert.equal(built.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(built.observationBoundary.intervalMutationExcluded, false);
  assert.equal(built.observationBoundary.abaExcluded, false);
  assert.equal(built.observationBoundary.mutationEpochAvailable, false);
  assert.equal(built.observationBoundary.mutationEpochReceipt, null);
  assert.equal(built.transitiveRawClosureBoundary.completeCurrentRawClosureClaimed, false);
  assert.equal(built.transitiveRawClosureBoundary.transitiveClosureIndependentlyRawPinned, false);
  assert.equal(built.transitiveRawClosureBoundary.transitiveCurrentRawContextsIndependentlyPinned, 0);
  assert.equal(built.integrityBoundary.sameBufferHashParsePerBoundFile, false);
  assert.equal(
    built.integrityBoundary.directJsonContextHashAndLocalParseSameBufferCount,
    3
  );
  assert.equal(built.integrityBoundary.adrSnapshotHashAndMarkerUseSameBuffer, true);
  assert.equal(
    built.integrityBoundary.browserSnapshotHashAndFullLoaderSerializationUseSeparateReads,
    true
  );
});

test("self-resigning cannot promote any gate receipt identity observation or authority", () => {
  const mutations = [
    (candidate) => { candidate.rereviewBoundary.formalRereviewRequirementSatisfied = true; },
    (candidate) => { candidate.gateSummary.rereviewRequirementsComplete = 4; },
    (candidate) => { candidate.gateSummary.admissionGatesSatisfied = 1; },
    (candidate) => { candidate.gateSummary.bindingFrozenVerified = 1; },
    (candidate) => { candidate.gateSummary.independentExpertReviewsVerified = 1; },
    (candidate) => { candidate.receiptTypeDefinitions[0].currentAcceptedReceipts = 1; },
    (candidate) => { candidate.evidenceBoundary.acceptedBuildReceipts = 1; },
    (candidate) => {
      candidate.browserRunMatrixRequirements[0].runRoles[2].runRoleId =
        "fresh_profile_online_desktop";
    },
    (candidate) => {
      candidate.releaseEvidenceConjunctiveGate.crossReceiptBindingFields =
        candidate.releaseEvidenceConjunctiveGate.crossReceiptBindingFields.filter(
          (field) => field !== "target_schema_identity"
        );
    },
    (candidate) => { candidate.baselineEngineeringObservation.edgeValidated = true; },
    (candidate) => { candidate.baselineEngineeringObservation.chromeValidated = true; },
    (candidate) => { candidate.baselineEngineeringObservation.productionBrowserRuntimeEvidenceEstablished = true; },
    (candidate) => { candidate.baselineEngineeringObservation.networkRequestCountObserved = 0; },
    (candidate) => { candidate.authorityBoundary.releaseEvidenceComplete = true; },
    (candidate) => { candidate.authorityBoundary.publicReleaseAuthorized = true; },
    (candidate) => { candidate.evidenceAccounts[2].authorityGranted = true; },
    (candidate) => { candidate.systemIdentity.productIdentity = "forged"; },
    (candidate) => { candidate.productBoundary.targetSchema = 13; },
    (candidate) => { candidate.transitiveRawClosureBoundary.completeCurrentRawClosureClaimed = true; },
    (candidate) => { candidate.observationBoundary.mutationEpochAvailable = true; }
  ];
  for (const mutation of mutations) assertSelfResignedRejected(mutation);
});

test("object API rejects extra missing aliased accessor proxied custom and sparse values", () => {
  const extra = structuredClone(built);
  extra.extra = true;
  assert.throws(
    () => verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(extra),
    (error) => error?.code === "DESIGN_OBJECT_MISMATCH"
  );
  const missing = structuredClone(built);
  delete missing.designId;
  assert.throws(
    () => verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(missing),
    (error) => error?.code === "DESIGN_OBJECT_MISMATCH"
  );
  const aliased = structuredClone(built);
  aliased.productBoundary = aliased.systemIdentity;
  assert.throws(
    () => verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(aliased),
    (error) => error?.code === "ALIASED_OR_CYCLIC_GRAPH"
  );
  const accessor = structuredClone(built);
  Object.defineProperty(accessor, "designId", {
    enumerable: true,
    get() { return built.designId; }
  });
  assert.throws(
    () => verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(accessor),
    (error) => error?.code === "ACCESSOR_REJECTED"
  );
  const custom = structuredClone(built);
  Object.setPrototypeOf(custom, { forged: true });
  assert.throws(
    () => verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(custom),
    (error) => error?.code === "CUSTOM_PROTOTYPE_REJECTED"
  );
  const sparse = structuredClone(built);
  delete sparse.designCoverage.interfaceRequirementIds[0];
  assert.throws(
    () => verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(sparse),
    (error) => error?.code === "ARRAY_SHAPE_REJECTED"
      || error?.code === "ACCESSOR_OR_SPARSE_REJECTED"
  );
  assert.throws(
    () => verifyVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateObject(
      new Proxy(structuredClone(built), {})
    ),
    (error) => error?.code === "UNTRUSTED_PROXY_REJECTED"
  );
});

test("strict JSON parser rejects duplicate escaped noncanonical BOM non-object and unsafe views", () => {
  assert.deepEqual(
    parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      persistedBytes
    ),
    persisted
  );
  const duplicate = Buffer.from(
    persistedBytes.toString("utf8").replace(
      /^\{/u,
      "{\n  \"schemaVersion\": \"forged\","
    ),
    "utf8"
  );
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(duplicate),
    (error) => error?.code === "JSON_DUPLICATE_KEY"
  );
  const escapedDuplicate = Buffer.from(
    persistedBytes.toString("utf8").replace(
      /^\{/u,
      "{\n  \"\\u0073chemaVersion\": \"forged\","
    ),
    "utf8"
  );
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      escapedDuplicate
    ),
    (error) => error?.code === "JSON_DUPLICATE_KEY"
  );
  const escapedField = Buffer.from(
    persistedBytes.toString("utf8").replace(
      "\"schemaVersion\"",
      "\"schema\\u0056ersion\""
    ),
    "utf8"
  );
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      escapedField
    ),
    (error) => error?.code === "JSON_MATERIALIZATION_NON_CANONICAL"
  );
  const compact = Buffer.from(JSON.stringify(persisted) + "\n", "utf8");
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(compact),
    (error) => error?.code === "JSON_MATERIALIZATION_NON_CANONICAL"
  );
  const reordered = Buffer.from(
    JSON.stringify({ designDigest: persisted.designDigest, ...persisted }, null, 2) + "\n",
    "utf8"
  );
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      reordered
    ),
    (error) => error?.code === "JSON_MATERIALIZATION_NON_CANONICAL"
  );
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      Buffer.concat([persistedBytes, Buffer.from("\n")])
    ),
    (error) => error?.code === "JSON_MATERIALIZATION_NON_CANONICAL"
  );
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), persistedBytes])
    )
  );
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      Buffer.from("[]\n", "utf8")
    )
  );
  const shared = new SharedArrayBuffer(persistedBytes.length);
  new Uint8Array(shared).set(persistedBytes);
  assert.throws(
    () => parseVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidateJsonBytes(
      new Uint8Array(shared)
    )
  );
});

test("any of the five direct current contexts drifting fails closed", async (t) => {
  const fixtureRoot = await createWorkspaceFixture(t, "hakimi-vedic-release-upstream-");
  const clean =
    await buildCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      fixtureRoot
    );
  assert.deepEqual(clean, built);
  for (const relativePath of directContextPaths) {
    const absolutePath = path.join(fixtureRoot, ...relativePath.split("/"));
    const original = await readFile(absolutePath);
    const sameLengthDrift = Buffer.from(original);
    sameLengthDrift[0] ^= 0x01;
    try {
      await writeFile(absolutePath, sameLengthDrift);
      await assert.rejects(
        () => buildCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
          fixtureRoot
        ),
        (error) => error?.code === "BOUND_CONTEXT_IDENTITY_MISMATCH"
      );
    } finally {
      await writeFile(absolutePath, original);
    }
  }
});

test("any junction in a bound path chain fails closed", async (t) => {
  const fixtureRoot = await createWorkspaceFixture(t, "hakimi-vedic-release-junction-");
  const linkedPath = path.join(fixtureRoot, "docs");
  const realPath = path.join(fixtureRoot, "docs-real");
  await rename(linkedPath, realPath);
  await symlink(realPath, linkedPath, "junction");
  await assert.rejects(
    () => buildCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      fixtureRoot
    ),
    (error) => error?.code === "BOUND_PATH_LINK_REJECTED"
  );
});

test("candidate materialization and fixed path fail closed on CRLF drift or absence", async (t) => {
  const fixtureRoot = await createWorkspaceFixture(t, "hakimi-vedic-release-candidate-");
  const candidatePath = path.join(
    fixtureRoot,
    ...VEDIC_INDEPENDENT_BROWSER_QUALITY_GATE_RELEASE_EVIDENCE_DESIGN_CANDIDATE_RELATIVE_PATH
      .split("/")
  );
  const original = await readFile(candidatePath);
  await writeFile(candidatePath, Buffer.from(original.toString("utf8").replace(/\n/g, "\r\n")));
  await assert.rejects(
    () => readCurrentVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      fixtureRoot
    ),
    (error) => error?.code === "JSON_MATERIALIZATION_NON_CANONICAL"
      || error?.code === "DESIGN_MATERIALIZATION_MISMATCH"
  );
  await rm(candidatePath);
  await assert.rejects(
    () => loadVedicIndependentBrowserQualityGateReleaseEvidenceDesignCandidate(
      fixtureRoot
    ),
    (error) => error?.code === "BOUND_ARTIFACT_MISSING"
  );
});

test("CLI accepts only its fixed present state and emits an all-red mechanical summary", async () => {
  const result = await runCli();
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.sequentialFixedPathObservationBrandVerified, true);
  assert.equal(output.simultaneousCurrentRawClosureVerified, false);
  assert.equal(output.activeAdmissionEffect, "none");
  assert.equal(output.rereviewBoundary.formalRereviewRequirementSatisfied, false);
  assert.equal(output.gateSummary.rereviewRequirementsComplete, 3);
  assert.equal(output.gateSummary.admissionGatesSatisfied, 0);
  assert.equal(output.authorityBoundary.releaseEvidenceComplete, false);
  assert.equal(output.authorityBoundary.publicReleaseAuthorized, false);
  assert.equal(output.currentBrandVerified, false);
  assert.equal(output.loadedModuleByteIdentityVerified, false);
  assert.equal(output.runtimeLauncherIdentityVerified, false);
});

test("CLI rejects operands visible Node launch state and a missing fixed candidate", async (t) => {
  const operand = await runCli(["forged.json"]);
  assert.equal(operand.code, 2);
  assert.match(operand.stderr, /CLI_OPERAND_FORBIDDEN/u);

  const nodePath = await runCli([], sanitizedEnvironment({ NODE_PATH: "forged" }));
  assert.equal(nodePath.code, 2);
  assert.match(nodePath.stderr, /NODE_LAUNCH_STATE_FORBIDDEN/u);

  const nodeOptions = await runCli([], sanitizedEnvironment({ NODE_OPTIONS: "--no-warnings" }));
  assert.equal(nodeOptions.code, 2);
  assert.match(nodeOptions.stderr, /NODE_LAUNCH_STATE_FORBIDDEN/u);

  const execArgv = await runCli(
    [],
    sanitizedEnvironment(),
    cliAbsolutePath,
    ["--no-warnings"]
  );
  assert.equal(execArgv.code, 2);
  assert.match(execArgv.stderr, /NODE_LAUNCH_STATE_FORBIDDEN/u);

  const fixtureRoot = await createWorkspaceFixture(t, "hakimi-vedic-release-cli-missing-");
  const fixtureCandidate = path.join(
    fixtureRoot,
    ...VEDIC_INDEPENDENT_BROWSER_QUALITY_GATE_RELEASE_EVIDENCE_DESIGN_CANDIDATE_RELATIVE_PATH
      .split("/")
  );
  await rm(fixtureCandidate);
  const fixtureCli = path.join(
    fixtureRoot,
    "scripts",
    "verify-vedic-independent-browser-quality-gate-and-release-evidence-design-candidate.mjs"
  );
  const missing = await runCli([], sanitizedEnvironment(), fixtureCli);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /BOUND_ARTIFACT_MISSING/u);
});

test("candidate is canonical LF with a stable raw SHA-256 and no product-app import", async () => {
  assert.equal(persistedBytes.includes(Buffer.from("\r\n")), false);
  assert.equal(persistedBytes.at(-1), 0x0a);
  assert.notEqual(persistedBytes.at(-2), 0x0a);
  const rawSha256 = createHash("sha256").update(persistedBytes).digest("hex");
  assert.equal(
    rawSha256,
    "4f2ecea6cb8d639c23fa3b06528b217319e93d171a7db57f0a5331172a5ae673"
  );
  const library = await readFile(
    path.join(
      scriptsDirectory,
      "vedic-independent-browser-quality-gate-and-release-evidence-design-candidate-lib.mjs"
    ),
    "utf8"
  );
  assert.equal(library.includes("apps/web/src/lib/local-user-data-cleanup.ts"), false);
  assert.equal(/from\s+["'][^"']*apps\/web/u.test(library), false);
});
