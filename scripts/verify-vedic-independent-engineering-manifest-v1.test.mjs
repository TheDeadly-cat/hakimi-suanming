import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V1_RELATIVE_PATH,
  buildCurrentVedicIndependentEngineeringManifestV1,
  canonicalPrettyStringifyVedicIndependentEngineeringManifestV1,
  computeVedicIndependentEngineeringManifestV1Digest,
  getVedicIndependentEngineeringManifestV1Summary,
  isVerifiedVedicIndependentEngineeringManifestV1,
  parseVedicIndependentEngineeringManifestV1JsonBytes,
  readCurrentVedicIndependentEngineeringManifestV1,
  vedicIndependentEngineeringManifestV1TestOnly as testOnly
} from "./vedic-independent-engineering-manifest-v1-lib.mjs";
import {
  readCurrentVedicProductizationVersionAwareObservationChildV12
} from "./vedic-independent-productization-version-aware-observation-child-v1-2-lib.mjs";
import {
  readVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";
import {
  isVerifiedVedicSourceBindingRequirementsSuccessor,
  loadVedicSourceBindingRequirementsSuccessor
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(
  workspaceRoot,
  ...VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V1_RELATIVE_PATH.split("/")
);
const cliPath = path.join(
  workspaceRoot,
  "scripts/verify-vedic-independent-engineering-manifest-v1.mjs"
);
const expected = await buildCurrentVedicIndependentEngineeringManifestV1(workspaceRoot);
const verified = await readCurrentVedicIndependentEngineeringManifestV1(workspaceRoot);
const parent = await readCurrentVedicProductizationVersionAwareObservationChildV12(workspaceRoot);
const sourceSuccessor = await loadVedicSourceBindingRequirementsSuccessor(workspaceRoot);
const oldSourceRequirements =
  await readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
const persistedText = await readFile(artifactPath, "utf8");
const persisted = JSON.parse(persistedText);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.manifestDigest = computeVedicIndependentEngineeringManifestV1Digest(value);
  return value;
}

function rejectsProjection(value, codes = ["CURRENT_MANIFEST_MISMATCH"]) {
  assert.throws(
    () => testOnly.assertExpectedProjection(resign(value), expected),
    (error) => codes.includes(error?.code)
  );
}

function assertRecursivelyFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (Object.hasOwn(descriptor, "value")) assertRecursivelyFrozen(descriptor.value, seen);
  }
}

test("loader returns one private branded recursively frozen current manifest result", () => {
  assert.equal(isVerifiedVedicIndependentEngineeringManifestV1(verified), true);
  assertRecursivelyFrozen(verified);
  assert.equal(isVerifiedVedicIndependentEngineeringManifestV1(clone(verified)), false);
});

test("summary requires the original loader brand and remains recursively frozen", () => {
  const summary = getVedicIndependentEngineeringManifestV1Summary(verified);
  assertRecursivelyFrozen(summary);
  assert.equal(summary.manifestId, testOnly.MANIFEST_ID);
  assert.equal(summary.activeAdmissionEffect, "none");
  assert.throws(
    () => getVedicIndependentEngineeringManifestV1Summary(clone(verified)),
    (error) => error?.code === "VERIFIED_BRAND_REQUIRED"
  );
});

test("persisted manifest is the unique pretty materialization with frozen raw identity", () => {
  assert.equal(
    persistedText,
    canonicalPrettyStringifyVedicIndependentEngineeringManifestV1(expected)
  );
  assert.equal(Buffer.byteLength(persistedText), testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(persistedText).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(persisted.manifestDigest, testOnly.EXPECTED_PERSISTED.manifestDigest);
});

test("manifest consumes the exact Vedic v1.2 observation identity", () => {
  assert.deepEqual(persisted.upstreamObservation, {
    artifact: {
      bytes: testOnly.EXPECTED_PARENT.rawBytes,
      path: testOnly.EXPECTED_PARENT.path,
      sha256: testOnly.EXPECTED_PARENT.rawSha256
    },
    candidateDigest: testOnly.EXPECTED_PARENT.candidateDigest,
    candidateId: testOnly.EXPECTED_PARENT.candidateId,
    privateBrandVerified: true
  });
});

test("Vedic v1.2 parent acceptance is private and fixed-path with no raw injection seam", async () => {
  assert.equal(Object.hasOwn(testOnly, "requireVerifiedParent"), false);
  assert.equal(Object.hasOwn(testOnly, "collectCurrentInputs"), false);
  assert.deepEqual(
    await buildCurrentVedicIndependentEngineeringManifestV1(workspaceRoot),
    persisted
  );
});

test("nine existing governance and requirements children remain exact", () => {
  assert.equal(persisted.upstreamRequirementsChildren.length, 9);
  assert.deepEqual(persisted.upstreamRequirementsChildren, parent.artifactBindings);
  assert.equal(persisted.components[0].files.length, 9);
});

test("five component closures contain exactly 33 unique paths", () => {
  assert.deepEqual(
    persisted.components.map((entry) => entry.componentId),
    [
      "governance_and_requirements_children",
      "civil_time_input_resolution_adapter",
      "input_admission_kernel_draft",
      "temporary_mutation_epoch_experiment",
      "source_binding_and_three_layer_rights_requirements_successor"
    ]
  );
  assert.deepEqual(persisted.componentAccounting, {
    componentClosures: 5,
    componentFileReferences: 33,
    uniquePhysicalPaths: 33
  });
  const paths = persisted.components.flatMap((entry) => entry.files.map((file) => file.path));
  assert.equal(new Set(paths).size, 33);
});

test("civil-time adapter closure is the exact five-file isolated node-test-only draft", () => {
  assert.deepEqual(
    persisted.components[1].files.map((entry) => entry.path),
    testOnly.CIVIL_TIME_FILES
  );
  assert.equal(
    persisted.components[1].status,
    "bound_node_test_only_engineering_candidate"
  );
});

test("input kernel closure remains exact and is not formally integrated", () => {
  assert.deepEqual(
    persisted.components[2].files,
    parent.inputKernelObservation.sourceClosure.files
  );
  assert.equal(parent.inputKernelObservation.formalParentIntegrated, false);
  assert.equal(parent.inputKernelObservation.runtimeEstablished, false);
});

test("temporary epoch experiment closure stays an ephemeral non-product runtime", () => {
  assert.deepEqual(
    persisted.components[3].files,
    parent.mutationEpochExperimentObservation.sourceClosure.files
  );
  assert.equal(parent.mutationEpochExperimentObservation.productMutationGateSatisfied, false);
  assert.equal(parent.mutationEpochExperimentObservation.productMutationReceiptIssued, false);
});

test("latest source-rights successor is fixed-path private-branded requirements-only context", () => {
  assert.equal(isVerifiedVedicSourceBindingRequirementsSuccessor(sourceSuccessor), true);
  assert.deepEqual(persisted.sourceRequirementsSuccessor, {
    artifact: {
      bytes: testOnly.EXPECTED_SOURCE_SUCCESSOR.rawBytes,
      path: testOnly.EXPECTED_SOURCE_SUCCESSOR.path,
      sha256: testOnly.EXPECTED_SOURCE_SUCCESSOR.rawSha256
    },
    bindingFrozenVerified: 0,
    bindingRequired: 38,
    candidateExactQuoteObservationsStored: 3,
    exactQuotesBound: 0,
    formalParentIntegrated: false,
    formalRegistryIntegrated: false,
    ledgerDigest: testOnly.EXPECTED_SOURCE_SUCCESSOR.ledgerDigest,
    ledgerId: testOnly.EXPECTED_SOURCE_SUCCESSOR.ledgerId,
    partialCandidatesAttached: 2,
    predecessorRemainsFormalCurrent: true,
    privateBrandVerified: true,
    publicReleaseAuthorized: false,
    releaseReady: false,
    status: testOnly.EXPECTED_SOURCE_SUCCESSOR.status,
    subjectFullySatisfied: 0,
    successorActiveEffect: "none",
    successorIsFormalCurrent: false
  });
  assert.deepEqual(persisted.components[4], {
    closureDigest: persisted.components[4].closureDigest,
    componentId: "source_binding_and_three_layer_rights_requirements_successor",
    files: [persisted.sourceRequirementsSuccessor.artifact],
    status: "bound_requirements_only_nonformal_successor_zero_active_effect"
  });
});

test("a cloned successor result cannot supply the fixed-loader private brand", () => {
  assert.equal(isVerifiedVedicSourceBindingRequirementsSuccessor(clone(sourceSuccessor)), false);
  assert.throws(
    () => testOnly.requireVerifiedSourceSuccessor(clone(sourceSuccessor)),
    (error) => error?.code === "SOURCE_SUCCESSOR_BRAND_REQUIRED"
  );
});

test("old formal v1 alone cannot substitute for the v1.1 successor", () => {
  assert.throws(
    () => testOnly.requireVerifiedSourceSuccessor(oldSourceRequirements),
    (error) => error?.code === "SOURCE_SUCCESSOR_BRAND_REQUIRED"
  );
  const forged = clone(persisted);
  forged.sourceRequirementsSuccessor.artifact = {
    bytes: 85752,
    path: "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json",
    sha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9"
  };
  forged.sourceRequirementsSuccessor.ledgerId =
    "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.0.0";
  forged.sourceRequirementsSuccessor.ledgerDigest =
    "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e";
  rejectsProjection(forged, ["RED_BOUNDARY_MISMATCH"]);
});

test("a missing v1.1 successor component cannot pass after self-resigning", () => {
  assert.throws(
    () => testOnly.requireVerifiedSourceSuccessor(undefined),
    (error) => error?.code === "SOURCE_SUCCESSOR_BRAND_REQUIRED"
  );
  const forged = clone(persisted);
  forged.components.pop();
  forged.componentAccounting = {
    componentClosures: 4,
    componentFileReferences: 32,
    uniquePhysicalPaths: 32
  };
  delete forged.sourceRequirementsSuccessor;
  rejectsProjection(forged, ["RED_BOUNDARY_MISMATCH"]);
});

test("successor formal-current or active-effect promotion cannot pass after self-resigning", () => {
  for (const mutate of [
    (value) => { value.sourceRequirementsSuccessor.successorIsFormalCurrent = true; },
    (value) => { value.sourceRequirementsSuccessor.successorActiveEffect = "active"; },
    (value) => { value.sourceRequirementsSuccessor.bindingFrozenVerified = 1; }
  ]) {
    const forged = clone(persisted);
    mutate(forged);
    rejectsProjection(forged, ["RED_BOUNDARY_MISMATCH"]);
  }
});

test("input fact and rule requirements total 38 with zero resolution", () => {
  assert.deepEqual(persisted.requirementsAccounting, {
    factRequirementsDefined: 12,
    inputRequirementsDefined: 13,
    requirementsResolved: 0,
    ruleRequirementsDefined: 13,
    totalRequirementsDefined: 38
  });
});

test("all eight admission gates, 38 bindings, and two expert seats remain empty", () => {
  assert.deepEqual(persisted.gateState, {
    admissionGatesRequired: 8,
    admissionGatesSatisfied: 0,
    bindingFrozenVerified: 0,
    bindingRequired: 38,
    independentExpertReviewsVerified: 0,
    independentExpertsRequired: 2,
    releaseEvidenceComplete: false,
    requirementsUniverseClosed: false,
    rereviewRequirementsComplete: 3,
    rereviewRequirementsRequired: 7
  });
});

test("product release schema and migration identities all remain null", () => {
  assert.deepEqual(persisted.productBoundary, {
    formalProductSurface: "absent",
    migrationId: null,
    productIdentity: null,
    releaseIdentity: null,
    runtimeOption: "unselected",
    storageBackend: "unselected",
    targetSchema: null
  });
});

test("Bazi legacy-v13 is context only and cannot be inherited", () => {
  assert.deepEqual(persisted.projectDefaultReleaseGovernance, {
    activeLine: "legacy-v13",
    inheritedByThisSystem: false,
    migrationId: null,
    targetSchema: 13
  });
  assert.equal(persisted.authorityBoundary.baziAuthorityInherited, false);
});

test("main app central registries and cross-system receipts do not consume this manifest", () => {
  assert.deepEqual(persisted.integrationBoundary, {
    centralFormalRegistryConsumesThisManifest: false,
    crossSystemEngineeringReceiptsConsumeThisManifest: false,
    fourSystemObservationRegistryV2ConsumesThisManifest: false,
    mainApplicationIntegrated: false,
    ownerAcceptanceForFormalAdmissionEstablished: false
  });
});

test("all content expert legal release and public authority stays false", () => {
  for (const [key, value] of Object.entries(persisted.authorityBoundary)) {
    assert.equal(value, false, key);
  }
  assert.equal(persisted.activeAdmissionEffect, "none");
});

test("snapshot boundary does not invent an atomic or product epoch guarantee", () => {
  assert.deepEqual(persisted.snapshotBoundary, {
    abaExcluded: false,
    crossFileAtomicSnapshot: false,
    endpointSnapshotOnly: true,
    intervalMutationExcludedAcrossFiles: false,
    manifestDigestIsDigitalSignature: false,
    mutationEpochAvailableForProduct: false,
    mutationEpochReceipt: null
  });
});

test("component deletion cannot pass after recomputing the digest", () => {
  const forged = clone(persisted);
  forged.components[1].files.pop();
  rejectsProjection(forged);
});

test("component raw identity drift cannot pass after recomputing the digest", () => {
  const forged = clone(persisted);
  forged.components[2].files[0].sha256 = "0".repeat(64);
  rejectsProjection(forged);
});

test("parent identity promotion cannot pass after recomputing the digest", () => {
  const forged = clone(persisted);
  forged.upstreamObservation.privateBrandVerified = false;
  forged.upstreamObservation.candidateDigest = "f".repeat(64);
  rejectsProjection(forged);
});

test("binding expert and admission counts cannot be promoted", () => {
  for (const key of [
    "bindingFrozenVerified",
    "independentExpertReviewsVerified",
    "admissionGatesSatisfied"
  ]) {
    const forged = clone(persisted);
    forged.gateState[key] = 1;
    rejectsProjection(forged, ["RED_BOUNDARY_MISMATCH"]);
  }
});

test("product main-app and Bazi inheritance cannot be promoted", () => {
  const cases = [
    (value) => { value.productBoundary.productIdentity = "vedic-product"; },
    (value) => { value.productBoundary.releaseIdentity = "legacy-v13"; },
    (value) => { value.productBoundary.targetSchema = 13; },
    (value) => { value.integrationBoundary.mainApplicationIntegrated = true; },
    (value) => { value.authorityBoundary.baziAuthorityInherited = true; }
  ];
  for (const mutate of cases) {
    const forged = clone(persisted);
    mutate(forged);
    rejectsProjection(forged, ["RED_BOUNDARY_MISMATCH"]);
  }
});

test("truth legal release and public authority cannot be promoted", () => {
  for (const key of [
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized",
    "expertClaimsAuthorized"
  ]) {
    const forged = clone(persisted);
    forged.authorityBoundary[key] = true;
    rejectsProjection(forged, ["RED_BOUNDARY_MISMATCH"]);
  }
});

test("unknown fields cannot pass even with a valid recomputed manifest digest", () => {
  const forged = clone(persisted);
  forged.formalRegistryBacklink = true;
  rejectsProjection(forged);
});

test("strict parser rejects BOM malformed JSON duplicate keys and non-object roots", () => {
  assert.throws(() => parseVedicIndependentEngineeringManifestV1JsonBytes(
    Buffer.from(`\ufeff${persistedText}`, "utf8")
  ));
  assert.throws(() => parseVedicIndependentEngineeringManifestV1JsonBytes(
    Buffer.from("{", "utf8")
  ));
  assert.throws(() => parseVedicIndependentEngineeringManifestV1JsonBytes(
    Buffer.from('{"manifestId":"a","manifestId":"b"}', "utf8")
  ));
  assert.throws(() => testOnly.requireFixedRedBoundary([]));
});

test("canonical digest rejects aliases accessors and negative zero", () => {
  const aliased = { a: {} };
  aliased.b = aliased.a;
  assert.throws(() => computeVedicIndependentEngineeringManifestV1Digest(aliased));
  let getterCalled = false;
  const accessor = {};
  Object.defineProperty(accessor, "x", {
    enumerable: true,
    get() { getterCalled = true; return 1; }
  });
  assert.throws(() => computeVedicIndependentEngineeringManifestV1Digest(accessor));
  assert.equal(getterCalled, false);
  assert.throws(() => computeVedicIndependentEngineeringManifestV1Digest({ x: -0 }));
});

test("post-import Array Hash Set freeze descriptor and JSON pollution cannot alter projection", () => {
  const defineProperty = Object.defineProperty;
  const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  const hashPrototype = Object.getPrototypeOf(createHash("sha256"));
  const targets = [
    [Array.prototype, "map"],
    [Array.prototype, "push"],
    [hashPrototype, "update"],
    [hashPrototype, "digest"],
    [Set.prototype, "add"],
    [Set.prototype, "has"],
    [Object, "freeze"],
    [Object, "getOwnPropertyDescriptors"],
    [Object, "hasOwn"],
    [JSON, "parse"],
    [JSON, "stringify"]
  ];
  const originals = targets.map(([target, key]) => [
    target,
    key,
    getOwnPropertyDescriptor(target, key)
  ]);
  const poison = () => { throw new Error("post-import primordial poison executed"); };
  let rebuilt;
  let recomputedDigest;
  let mappedRequirements;
  let appended;
  let summary;
  const projectionInputs = {
    parent,
    parentArtifact: persisted.upstreamObservation.artifact,
    requirementFiles: persisted.components[0].files,
    civilTimeFiles: persisted.components[1].files,
    kernelFiles: persisted.components[2].files,
    epochFiles: persisted.components[3].files,
    sourceSuccessor,
    sourceSuccessorFile: persisted.sourceRequirementsSuccessor.artifact
  };
  try {
    for (const [target, key] of targets) {
      defineProperty(target, key, { configurable: true, writable: true, value: poison });
    }
    mappedRequirements = testOnly.mapRequirementBindings(parent.artifactBindings);
    appended = testOnly.appendSnapshot([], persisted.components[1].files[0]);
    rebuilt = testOnly.buildProjection(projectionInputs);
    recomputedDigest = computeVedicIndependentEngineeringManifestV1Digest(rebuilt);
    summary = getVedicIndependentEngineeringManifestV1Summary(verified);
  } finally {
    for (const [target, key, descriptor] of originals) {
      defineProperty(target, key, descriptor);
    }
  }
  assert.equal(recomputedDigest, rebuilt.manifestDigest);
  assert.deepEqual(rebuilt, expected);
  assert.deepEqual(mappedRequirements.paths, parent.artifactBindings.map((entry) => entry.path));
  assert.deepEqual(appended, [persisted.components[1].files[0]]);
  assertRecursivelyFrozen(summary);
});

test("post-import WeakSet pollution cannot forge the loader brand", () => {
  const defineProperty = Object.defineProperty;
  const hasDescriptor = Object.getOwnPropertyDescriptor(WeakSet.prototype, "has");
  const addDescriptor = Object.getOwnPropertyDescriptor(WeakSet.prototype, "add");
  let originalStillVerified;
  let cloneForged;
  let summary;
  try {
    defineProperty(WeakSet.prototype, "has", {
      configurable: true,
      writable: true,
      value: () => true
    });
    defineProperty(WeakSet.prototype, "add", {
      configurable: true,
      writable: true,
      value: () => { throw new Error("post-import WeakSet.add poison executed"); }
    });
    originalStillVerified = isVerifiedVedicIndependentEngineeringManifestV1(verified);
    cloneForged = isVerifiedVedicIndependentEngineeringManifestV1(clone(verified));
    summary = getVedicIndependentEngineeringManifestV1Summary(verified);
  } finally {
    defineProperty(WeakSet.prototype, "has", hasDescriptor);
    defineProperty(WeakSet.prototype, "add", addDescriptor);
  }
  assert.equal(originalStillVerified, true);
  assert.equal(cloneForged, false);
  assert.equal(summary.manifestId, testOnly.MANIFEST_ID);
  assertRecursivelyFrozen(summary);
});

test("CLI reports exact red product authority and runtime-trust calibration", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  const child = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    env: cleanEnv,
    encoding: "utf8"
  });
  const prefix = "VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_OBSERVATION_OK ";
  assert.equal(child.status, 0);
  assert.equal(child.stderr, "");
  assert.equal(child.stdout.startsWith(prefix), true);
  const output = JSON.parse(child.stdout.slice(prefix.length));
  assert.deepEqual(output.gateState, {
    admission: "0/8",
    binding: "0/38",
    experts: "0/2"
  });
  assert.deepEqual(output.productBoundary, {
    productIdentity: null,
    releaseIdentity: null,
    targetSchema: null,
    migrationId: null,
    mainApplicationIntegrated: false,
    activeAdmissionEffect: "none"
  });
  assert.deepEqual(output.authorityBoundary, {
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.deepEqual(output.runtimeTrustCalibration, {
    hiddenPreloadExcluded: false,
    nodeRuntimeIdentityEstablished: false,
    loaderIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    cliOutputTrustedAttestation: false,
    visibleLoaderGuardIsSecurityBoundary: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
  });
});

test("CLI rejects operands and visible loader options with fixed non-leaking failures", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  const cases = [
    {
      args: [cliPath, path.join(workspaceRoot, "private", "secret.json")],
      env: cleanEnv,
      code: "CLI_ARGUMENTS_FORBIDDEN"
    },
    {
      args: [cliPath],
      env: { ...cleanEnv, NODE_OPTIONS: "--no-warnings" },
      code: "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN"
    },
    {
      args: ["--import", "data:text/javascript,globalThis.__vedicPoc%3Dtrue", cliPath],
      env: cleanEnv,
      code: "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN"
    }
  ];
  for (const current of cases) {
    const child = spawnSync(process.execPath, current.args, {
      cwd: workspaceRoot,
      env: current.env,
      encoding: "utf8"
    });
    assert.equal(child.status, 1);
    assert.equal(child.stdout, "");
    assert.equal(
      child.stderr,
      `VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_FAILED ${current.code}\n`
    );
    assert.equal(child.stderr.includes(workspaceRoot), false);
    assert.equal(child.stderr.includes("secret.json"), false);
    assert.equal(child.stderr.includes("Error:"), false);
  }
});

test("importing the CLI is side-effect free and keeps business import behind direct entry", async () => {
  const cliSource = await readFile(cliPath, "utf8");
  assert.match(
    cliSource,
    /await import\("\.\/vedic-independent-engineering-manifest-v1-lib\.mjs"\)/u
  );
  assert.doesNotMatch(
    cliSource,
    /^import .*vedic-independent-engineering-manifest-v1-lib/mu
  );
  const program = `process.exitCode=7;await import(${JSON.stringify(pathToFileURL(cliPath).href)});process.stdout.write(JSON.stringify({exitCode:process.exitCode}));`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", program], {
    cwd: workspaceRoot,
    env: { ...process.env, NODE_OPTIONS: "" },
    encoding: "utf8"
  });
  assert.equal(child.status, 7);
  assert.equal(child.stdout, '{"exitCode":7}');
  assert.equal(child.stderr, "");
});
