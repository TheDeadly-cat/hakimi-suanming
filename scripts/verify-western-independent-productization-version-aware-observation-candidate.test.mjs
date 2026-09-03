import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  buildExpectedWesternProductizationVersionAwareObservationCandidate,
  canonicalPrettyStringifyWesternProductizationVersionAwareObservationCandidate,
  computeWesternProductizationVersionAwareObservationCandidateDigest,
  isVerifiedWesternProductizationVersionAwareObservationResult,
  loadWesternProductizationVersionAwareObservationCandidate,
  parseWesternProductizationVersionAwareObservationCandidateJsonBytes,
  testOnly,
  verifyWesternProductizationVersionAwareObservationCandidate,
  WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
} from "./western-independent-productization-version-aware-observation-candidate-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const cliAbsolutePath = path.join(
  scriptsDirectory,
  "verify-western-independent-productization-version-aware-observation-candidate.mjs"
);

function absoluteFrom(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function sanitizedEnvironment(overrides = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_PATH;
  return { ...environment, ...overrides };
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

function resignCandidate(mutator) {
  const candidate = structuredClone(
    buildExpectedWesternProductizationVersionAwareObservationCandidate()
  );
  mutator(candidate);
  candidate.candidateDigest =
    computeWesternProductizationVersionAwareObservationCandidateDigest(candidate);
  return candidate;
}

function assertSelfResignedRejected(mutator) {
  const candidate = resignCandidate(mutator);
  assert.equal(
    candidate.candidateDigest,
    computeWesternProductizationVersionAwareObservationCandidateDigest(candidate)
  );
  assert.throws(
    () => verifyWesternProductizationVersionAwareObservationCandidate(candidate),
    (error) => error?.code === "CANDIDATE_SEMANTICS_MISMATCH"
  );
  assert.equal(isVerifiedWesternProductizationVersionAwareObservationResult(candidate), false);
}

async function createBoundWorkspaceFixture(t) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "hakimi-western-observation-"));
  t.after(async () => {
    const resolved = path.resolve(fixtureRoot);
    assert.equal(path.basename(resolved).startsWith("hakimi-western-observation-"), true);
    await rm(resolved, { recursive: true, force: true });
  });

  const relativePaths = new Set([
    WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
    testOnly.CENTRAL_REGISTRY.path,
    ...testOnly.CURRENT_CONTEXTS.map((entry) => entry.path),
    ...testOnly.IMPLEMENTATION_ARTIFACTS.map((entry) => entry.path),
    ...testOnly.WESTERN_REGISTRY_COMPARISONS.map((entry) => entry.path)
  ]);
  const noticeDescriptor = testOnly.CURRENT_CONTEXTS.find(
    (entry) => entry.contextId === "western_astronomy_engine_notice_child_v1"
  );
  const notice = JSON.parse(await readFile(
    absoluteFrom(workspaceRoot, noticeDescriptor.path),
    "utf8"
  ));
  for (const artifact of notice.basisArtifacts) relativePaths.add(artifact.path);

  for (const relativePath of relativePaths) {
    const destination = absoluteFrom(fixtureRoot, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(absoluteFrom(workspaceRoot, relativePath), destination);
  }
  return fixtureRoot;
}

test("persisted candidate is canonical, exact, zero-authority, and privately branded only after fixed loading", async () => {
  const persistedBytes = await readFile(absoluteFrom(
    workspaceRoot,
    WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
  ));
  const persisted =
    parseWesternProductizationVersionAwareObservationCandidateJsonBytes(persistedBytes);
  const expected = buildExpectedWesternProductizationVersionAwareObservationCandidate();
  assert.deepEqual(persisted, expected);
  assert.equal(
    persistedBytes.toString("utf8"),
    canonicalPrettyStringifyWesternProductizationVersionAwareObservationCandidate(expected)
  );
  assert.equal(
    persisted.candidateDigest,
    computeWesternProductizationVersionAwareObservationCandidateDigest(persisted)
  );
  assert.equal(isVerifiedWesternProductizationVersionAwareObservationResult(persisted), false);

  const loaded = await loadWesternProductizationVersionAwareObservationCandidate(workspaceRoot);
  assert.equal(isVerifiedWesternProductizationVersionAwareObservationResult(loaded), true);
  assertDeepFrozen(loaded);
  assert.deepEqual(loaded, {
    ok: true,
    candidateId:
      "hakimi.western.independent-productization.version-aware-observation-candidate/1.0.0",
    candidateDigest:
      "6f71eb3e0f8745c82b383e6e05bf9130d6249530f4ad1d872620480796b1deeb",
    currentContextCount: 3,
    implementationArtifactCount: 19,
    centralRegistryStaleForWestern: true,
    matchingWesternRegistryArtifacts: 3,
    mismatchingWesternRegistryArtifacts: 3,
    bindingRequired: 28,
    bindingFrozenVerified: 0,
    independentExpertsRequired: 2,
    independentExpertReviewsVerified: 0,
    activeAdmissionEffect: "none",
    formalAdmissionAuthorized: false,
    rightsLegalConclusionEstablished: false,
    expertClaimsAuthorized: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  });
  assert.equal(
    isVerifiedWesternProductizationVersionAwareObservationResult(structuredClone(loaded)),
    false
  );

  assert.equal(persisted.currentContexts.contextCount, 3);
  assert.equal(persisted.implementationObservation.artifactCount, 19);
  assert.equal(persisted.implementationObservation.tzdbDescriptors.length, 2);
  assert.equal(persisted.admissionAccounting.bindingRequired, 28);
  assert.equal(persisted.admissionAccounting.bindingFrozenVerified, 0);
  assert.equal(persisted.admissionAccounting.independentExpertsRequired, 2);
  assert.equal(persisted.admissionAccounting.independentExpertReviewsVerified, 0);
  assert.equal(persisted.centralRegistryStaleness.staleForWestern, true);
  assert.equal(persisted.centralRegistryStaleness.centralRegistryCurrentForWestern, false);
  assert.equal(persisted.centralRegistryStaleness.centralRegistryUsableForWesternAdmission, false);
  assert.equal(persisted.productBoundary.releaseIdentity, null);
  assert.equal(persisted.productBoundary.targetSchema, null);
  assert.equal(persisted.productBoundary.migrationId, null);
  assert.equal(persisted.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(persisted.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(persisted.projectReleaseGovernanceContext.inheritedByWesternProductIdentity, false);

  for (const key of [
    "browserRuntimeEvidenceEstablished",
    "contentTruthEstablished",
    "domainAuthorityAuthorized",
    "expertIdentityCredentialsIndependenceEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "sourceFreezeEstablished",
    "highRiskClaimsAuthorized",
    "formalAdmissionAuthorized",
    "expertClaimsAuthorized",
    "releaseEvidenceComplete",
    "releaseReady",
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized",
    "crossSystemAuthorityInheritanceAllowed"
  ]) {
    assert.equal(persisted.authorityBoundary[key], false, key);
  }
});

test("self-resigned authority, source, expert, registry, adapter, and schema escalations remain rejected", () => {
  const mutations = [
    (candidate) => { candidate.authorityBoundary.formalAdmissionAuthorized = true; },
    (candidate) => { candidate.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (candidate) => { candidate.admissionAccounting.bindingFrozenVerified = 1; },
    (candidate) => { candidate.admissionAccounting.independentExpertReviewsVerified = 1; },
    (candidate) => { candidate.centralRegistryStaleness.centralRegistryCurrentForWestern = true; },
    (candidate) => { candidate.centralRegistryStaleness.staleForWestern = false; },
    (candidate) => { candidate.implementationObservation.civilTimeAdapter.manifestBound = true; },
    (candidate) => { candidate.productBoundary.targetSchema = 13; },
    (candidate) => { candidate.unexpectedAuthorityField = false; }
  ];
  for (const mutation of mutations) assertSelfResignedRejected(mutation);
});

test("non-canonical persisted bytes fail closed before endpoint evidence is considered", async (t) => {
  const fixtureRoot = await createBoundWorkspaceFixture(t);
  const candidatePath = absoluteFrom(
    fixtureRoot,
    WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
  );
  const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
  const canonical = await readFile(candidatePath, "utf8");
  const duplicate = canonical.replace(
    "{\n",
    "{\n  \"candidateDigest\": \"" + candidate.candidateDigest + "\",\n"
  );
  await writeFile(candidatePath, duplicate, "utf8");
  await assert.rejects(
    () => loadWesternProductizationVersionAwareObservationCandidate(fixtureRoot),
    (error) => error?.code === "CANDIDATE_NOT_CANONICAL"
  );
});

test("a bound civil-time implementation byte drift fails closed", async (t) => {
  const fixtureRoot = await createBoundWorkspaceFixture(t);
  const descriptor = testOnly.IMPLEMENTATION_ARTIFACTS.find(
    (entry) => entry.role === "civil_time_adapter_implementation"
  );
  const target = absoluteFrom(fixtureRoot, descriptor.path);
  const original = await readFile(target);
  await writeFile(target, Buffer.concat([original, Buffer.from("\n")]));
  await assert.rejects(
    () => loadWesternProductizationVersionAwareObservationCandidate(fixtureRoot),
    (error) => error?.code === "ARTIFACT_DRIFT"
  );
});

test("an unexpected official Horizons candidate path invalidates the zero-candidate observation", async (t) => {
  const fixtureRoot = await createBoundWorkspaceFixture(t);
  const relativePath = testOnly.HORIZONS_ABSENT_PATHS[0];
  const target = absoluteFrom(fixtureRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, "not official evidence\n", "utf8");
  await assert.rejects(
    () => loadWesternProductizationVersionAwareObservationCandidate(fixtureRoot),
    (error) => error?.code === "OFFICIAL_HORIZONS_CANDIDATE_PRESENT"
  );
});

test("the child remains one-way: current contexts and central registry contain no backlink", async () => {
  const candidate = buildExpectedWesternProductizationVersionAwareObservationCandidate();
  const needles = [
    candidate.candidateId,
    WESTERN_PRODUCTIZATION_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
  ];
  for (const relativePath of [
    ...testOnly.CURRENT_CONTEXTS.map((entry) => entry.path),
    testOnly.CENTRAL_REGISTRY.path
  ]) {
    const text = await readFile(absoluteFrom(workspaceRoot, relativePath), "utf8");
    for (const needle of needles) assert.equal(text.includes(needle), false, relativePath);
  }
});

test("CLI loads only its fixed workspace and exposes the deliberately limited runtime claims", async () => {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [cliAbsolutePath],
    { cwd: tmpdir(), env: sanitizedEnvironment(), windowsHide: true }
  );
  assert.equal(stderr, "");
  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.equal(result.currentBrandVerified, true);
  assert.equal(result.centralRegistryStaleForWestern, true);
  assert.equal(result.formalAdmissionAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.loadedModuleByteIdentityVerified, false);
  assert.equal(result.nodeLoaderIntegrityVerified, false);
  assert.equal(result.runtimeLauncherIdentityVerified, false);
});

test("CLI rejects caller operands and visible Node launch state", async () => {
  await assert.rejects(
    () => execFileAsync(
      process.execPath,
      [cliAbsolutePath, "caller-controlled.json"],
      { env: sanitizedEnvironment(), windowsHide: true }
    ),
    (error) => error?.code === 2
      && JSON.parse(error.stderr).code === "CLI_OPERAND_FORBIDDEN"
  );
  await assert.rejects(
    () => execFileAsync(
      process.execPath,
      [cliAbsolutePath],
      { env: sanitizedEnvironment({ NODE_PATH: "caller-controlled" }), windowsHide: true }
    ),
    (error) => error?.code === 2
      && JSON.parse(error.stderr).code === "NODE_LAUNCH_STATE_FORBIDDEN"
  );
});
