import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  link,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_2_RELATIVE_PATH,
  buildCurrentVedicProductizationVersionAwareObservationChildV12,
  canonicalPrettyStringifyVedicProductizationVersionAwareObservationChildV12,
  computeVedicProductizationVersionAwareObservationChildV12Digest,
  isVerifiedVedicProductizationVersionAwareObservationChildV12,
  parseVedicProductizationVersionAwareObservationChildV12JsonBytes,
  readCurrentVedicProductizationVersionAwareObservationChildV12,
  vedicProductizationVersionAwareObservationChildV12TestOnly as testOnly,
  verifyVedicProductizationVersionAwareObservationChildV12Object
} from "./vedic-independent-productization-version-aware-observation-child-v1-2-lib.mjs";
import {
  verifyVedicProductizationVersionAwareObservationChildV12
} from "./verify-vedic-independent-productization-version-aware-observation-child-v1-2.mjs";

const execFileAsync = promisify(execFile);
const WORKSPACE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const CLI_PATH = path.join(
  WORKSPACE_ROOT,
  "scripts",
  "verify-vedic-independent-productization-version-aware-observation-child-v1-2.mjs"
);
const BASELINE_PROMISE =
  buildCurrentVedicProductizationVersionAwareObservationChildV12(
    WORKSPACE_ROOT
  );

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.candidateDigest =
    computeVedicProductizationVersionAwareObservationChildV12Digest(value);
  return value;
}

async function currentClone() {
  return clone(await BASELINE_PROMISE);
}

test("v1.2 current child is canonical, pinned, versioned and fully red", async () => {
  const built = await BASELINE_PROMISE;
  const persisted =
    await readCurrentVedicProductizationVersionAwareObservationChildV12(
      WORKSPACE_ROOT
    );
  assert.deepEqual(persisted, built);
  assert.equal(
    isVerifiedVedicProductizationVersionAwareObservationChildV12(persisted),
    true
  );
  assert.equal(persisted.schemaVersion, "1.2.0");
  assert.equal(persisted.versionBoundary.priorArtifactPreserved, true);
  assert.equal(persisted.versionBoundary.overwritesPriorArtifact, false);
  assert.equal(persisted.gateSummary.admissionGatesSatisfied, 0);
  assert.equal(persisted.gateSummary.bindingFrozenVerified, 0);
  assert.equal(persisted.gateSummary.independentExpertReviewsVerified, 0);
  assert.ok(Object.values(persisted.authorityBoundary).every((value) => value === false));
  const bytes = await readFile(
    path.join(
      WORKSPACE_ROOT,
      ...VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_2_RELATIVE_PATH.split("/")
    )
  );
  assert.equal(
    bytes.toString("utf8"),
    canonicalPrettyStringifyVedicProductizationVersionAwareObservationChildV12(
      persisted
    )
  );
  assert.equal(bytes.byteLength, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(persisted.candidateDigest, testOnly.EXPECTED_PERSISTED.candidateDigest);
});

test("independent verifier and CLI report only the non-authoritative projection", async () => {
  const report =
    await verifyVedicProductizationVersionAwareObservationChildV12(
      WORKSPACE_ROOT
    );
  assert.equal(report.admissionGatesSatisfied, 0);
  assert.equal(report.bindingFrozenVerified, 0);
  assert.equal(report.independentExpertReviewsVerified, 0);
  assert.equal(report.inputKernelMechanicallyObserved, true);
  assert.equal(report.inputKernelFormalParentIntegrated, false);
  assert.equal(report.mutationExperimentProductGateSatisfied, false);
  assert.equal(report.formalAdmissionAuthorized, false);
  assert.equal(report.publicReleaseAuthorized, false);

  const { stdout, stderr } = await execFileAsync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8"
  });
  assert.equal(stderr, "");
  const cliReport = JSON.parse(stdout);
  assert.equal(cliReport.candidateDigest, report.candidateDigest);
  assert.equal(cliReport.observationClass, "version_aware_non_atomic_engineering_child");
  assert.equal(cliReport.releaseReady, false);
});

test("self-resigned authority promotion is rejected", async () => {
  const candidate = await currentClone();
  candidate.authorityBoundary.formalAdmissionAuthorized = true;
  resign(candidate);
  assert.throws(
    () => verifyVedicProductizationVersionAwareObservationChildV12Object(candidate),
    (error) => error?.code === "AUTHORITY_PROMOTION_FORBIDDEN"
  );
});

test("self-resigned 1/8, 1/38 and 1/2 count promotions are rejected", async () => {
  for (const [field, value] of [
    ["admissionGatesSatisfied", 1],
    ["bindingFrozenVerified", 1],
    ["independentExpertReviewsVerified", 1]
  ]) {
    const candidate = await currentClone();
    candidate.gateSummary[field] = value;
    resign(candidate);
    assert.throws(
      () => verifyVedicProductizationVersionAwareObservationChildV12Object(candidate),
      (error) => error?.code === "GATE_PROMOTION_FORBIDDEN"
    );
  }
});

test("self-resigned parent, registry and v1.1 rewrite claims are rejected", async () => {
  for (const field of [
    "formalParentModifiedByThisChild",
    "centralRegistryModifiedByThisChild",
    "downstreamRegistryModifiedByThisChild",
    "kernelVerifierModifiedByThisChild",
    "overwritesPriorArtifact",
    "supersedesPriorArtifact"
  ]) {
    const candidate = await currentClone();
    candidate.versionBoundary[field] = true;
    resign(candidate);
    assert.throws(
      () => verifyVedicProductizationVersionAwareObservationChildV12Object(candidate),
      (error) => error?.code === "VERSION_BOUNDARY_PROMOTION_FORBIDDEN"
    );
  }
});

test("self-resigned kernel runtime, persistence and integration promotions are rejected", async () => {
  for (const field of [
    "trustedRuntimeObserved",
    "runtimeEstablished",
    "persistenceEstablished",
    "transitionPersisted",
    "productInputReceiptIssued",
    "formalParentIntegrated",
    "fourSystemRegistryIntegrated"
  ]) {
    const candidate = await currentClone();
    candidate.inputKernelObservation[field] = true;
    resign(candidate);
    assert.throws(
      () => verifyVedicProductizationVersionAwareObservationChildV12Object(candidate),
      (error) => error?.code === "KERNEL_OBSERVATION_PROMOTION_FORBIDDEN"
    );
  }
});

test("self-resigned mutation experiment product extrapolations are rejected", async () => {
  for (const field of [
    "testsExecutedByThisObservation",
    "browserButtonFlowObserved",
    "externalMonotonicAnchorAvailable",
    "abaExcludedForFormalProduct",
    "productMutationReceiptIssued",
    "productMutationGateSatisfied"
  ]) {
    const candidate = await currentClone();
    candidate.mutationEpochExperimentObservation[field] = true;
    resign(candidate);
    assert.throws(
      () => verifyVedicProductizationVersionAwareObservationChildV12Object(candidate),
      (error) => error?.code === "MUTATION_EXPERIMENT_PROMOTION_FORBIDDEN"
    );
  }
});

test("self-resigned Vedic product identity and legacy-v13 inheritance are rejected", async () => {
  const product = await currentClone();
  product.productBoundary.productIdentity = "vedic-product-v1";
  resign(product);
  assert.throws(
    () => verifyVedicProductizationVersionAwareObservationChildV12Object(product),
    (error) => error?.code === "PRODUCT_IDENTITY_PROMOTION_FORBIDDEN"
  );

  const inherited = await currentClone();
  inherited.projectReleaseGovernanceContext.inheritedByVedicProductIdentity = true;
  resign(inherited);
  assert.throws(
    () => verifyVedicProductizationVersionAwareObservationChildV12Object(inherited),
    (error) => error?.code === "PROJECT_CONTEXT_INHERITANCE_FORBIDDEN"
  );
});

test("semantic binding drift and source-closure drift fail even when re-signed", async () => {
  const semantic = await currentClone();
  semantic.artifactBindings[0].semanticDigest = "0".repeat(64);
  resign(semantic);
  assert.throws(
    () => verifyVedicProductizationVersionAwareObservationChildV12Object(semantic),
    (error) => error?.code === "ARTIFACT_BINDING_IDENTITY_MISMATCH"
  );

  const closure = await currentClone();
  closure.mutationEpochExperimentObservation.sourceClosure.files[0].sha256 =
    "0".repeat(64);
  resign(closure);
  assert.throws(
    () => verifyVedicProductizationVersionAwareObservationChildV12Object(closure),
    (error) => error?.code === "SOURCE_CLOSURE_INVALID"
  );
});

test("BOM, duplicate JSON keys and non-passive objects are rejected", async () => {
  const persistedPath = path.join(
    WORKSPACE_ROOT,
    ...VEDIC_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CHILD_V1_2_RELATIVE_PATH.split("/")
  );
  const bytes = await readFile(persistedPath);
  assert.throws(
    () => parseVedicProductizationVersionAwareObservationChildV12JsonBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes])
    )
  );
  assert.throws(
    () => parseVedicProductizationVersionAwareObservationChildV12JsonBytes(
      Buffer.from('{"schemaVersion":"1.2.0","schemaVersion":"1.2.0"}\n')
    )
  );
  assert.throws(
    () => verifyVedicProductizationVersionAwareObservationChildV12Object(
      new Proxy({}, {})
    )
  );
});

test("stable reader rejects symlink and hardlink endpoints", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "vedic-v12-endpoint-"));
  t.after(() => rm(temporaryRoot, { force: true, recursive: true }));
  await writeFile(path.join(temporaryRoot, "source.json"), "{}\n", "utf8");
  await link(
    path.join(temporaryRoot, "source.json"),
    path.join(temporaryRoot, "hardlink.json")
  );
  await assert.rejects(
    testOnly.readStableWorkspaceFile(temporaryRoot, "hardlink.json", 1024)
  );
  try {
    await symlink(
      path.join(temporaryRoot, "source.json"),
      path.join(temporaryRoot, "symlink.json"),
      "file"
    );
    await assert.rejects(
      testOnly.readStableWorkspaceFile(temporaryRoot, "symlink.json", 1024)
    );
  } catch (error) {
    if (!["EPERM", "EACCES"].includes(error?.code)) throw error;
  }
});

test("verified result remains recursively immutable at authority and product boundaries", async () => {
  const candidate =
    await readCurrentVedicProductizationVersionAwareObservationChildV12(
      WORKSPACE_ROOT
    );
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(Object.isFrozen(candidate.authorityBoundary), true);
  assert.equal(Object.isFrozen(candidate.productBoundary), true);
  assert.throws(() => {
    candidate.authorityBoundary.releaseReady = true;
  }, TypeError);
  assert.throws(() => {
    candidate.productBoundary.productIdentity = "forged";
  }, TypeError);
  assert.equal(candidate.authorityBoundary.releaseReady, false);
  assert.equal(candidate.productBoundary.productIdentity, null);
});

test("new v1.2 implementation contains no dynamic import expression", async () => {
  for (const fileName of [
    "vedic-independent-productization-version-aware-observation-child-v1-2-lib.mjs",
    "verify-vedic-independent-productization-version-aware-observation-child-v1-2.mjs",
    "verify-vedic-independent-productization-version-aware-observation-child-v1-2.test.mjs"
  ]) {
    const source = await readFile(path.join(WORKSPACE_ROOT, "scripts", fileName), "utf8");
    assert.equal(/\bimport\s*\(/u.test(source), false, fileName);
  }
});
