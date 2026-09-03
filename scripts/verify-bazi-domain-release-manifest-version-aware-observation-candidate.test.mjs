import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
  buildBaziDomainReleaseManifestVersionAwareObservationCandidate,
  computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest,
  isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate,
  loadBaziDomainReleaseManifestVersionAwareObservationCandidate,
  verifyBaziDomainReleaseManifestVersionAwareObservationCandidateObject,
  baziDomainReleaseManifestVersionAwareObservationCandidateTestOnly
} from "./bazi-domain-release-manifest-version-aware-observation-candidate-lib.mjs";
import {
  baziDttVersionedParentSupersessionTestOnly,
  isVerifiedBaziDttVersionedParentSupersession,
  loadBaziDttVersionedParentSupersession,
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  isVerifiedBaziBindingFreezeRequirementsV17,
  loadBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";
import {
  isVerifiedBaziPolicyWeightsVersionAwareCandidate,
  loadBaziPolicyWeightsVersionAwareCandidate
} from "./bazi-policy-weights-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate,
  loadBaziProjectCopyMaterializationVersionAwareCandidate
} from "./bazi-project-copy-materialization-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate,
  loadBaziExpertReviewIntakeGapVersionAwareCandidate
} from "./bazi-expert-review-intake-gap-version-aware-candidate-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const CLI_PATH = path.join(
  workspaceRoot,
  "scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate.mjs"
);
const OK_PREFIX =
  "BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_MECHANICS_OK ";
const FAILED_PREFIX =
  "BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_MECHANICS_FAILED";
const FINAL_IDENTITY = Object.freeze({
  bytes: 21859,
  rawSha256: "7768590bc117a229919bcd119a2bfada97d7e77712677947a2a650d6f518233d",
  candidateDigest: "be41925d72904e8eb90eea2b77f7de553f7c743d87fd975ae33fa99040571dc2"
});
const PUBLIC_KEYS = Object.freeze([
  "versionAwareBaziManifestObservationMechanicallyVerified",
  "candidateId",
  "candidateDigest",
  "artifact",
  "fixedDefaultGovernance",
  "activeAdmissionEffect",
  "historicalBasisAccounting",
  "contextBrandAccounting",
  "currentPreviewAccounting",
  "ownerDecisionAccounting",
  "observationRedGates",
  "authorityRedGates"
]);

const testOnly =
  baziDomainReleaseManifestVersionAwareObservationCandidateTestOnly;
let expectedBundlePromise;
let liveResultPromise;
let contextBrandsPromise;

function expectedBundle() {
  expectedBundlePromise ??= testOnly.buildExpectedBundle(workspaceRoot);
  return expectedBundlePromise;
}

function liveResult() {
  liveResultPromise ??=
    loadBaziDomainReleaseManifestVersionAwareObservationCandidate(workspaceRoot);
  return liveResultPromise;
}

function contextBrands() {
  contextBrandsPromise ??= Promise.all([
    loadBaziDttVersionedParentSupersession(workspaceRoot),
    loadBaziBindingFreezeRequirementsV17(workspaceRoot),
    loadBaziPolicyWeightsVersionAwareCandidate(workspaceRoot),
    loadBaziProjectCopyMaterializationVersionAwareCandidate(workspaceRoot),
    loadBaziExpertReviewIntakeGapVersionAwareCandidate(workspaceRoot)
  ]);
  return contextBrandsPromise;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function snapshot(bytes, label = "candidate-test.json") {
  const captured = Buffer.from(bytes);
  return Object.freeze({
    path: label,
    rawBytes: captured.byteLength,
    rawSha256: sha256(captured),
    bytes: captured
  });
}

function expectCode(...codes) {
  return (error) => codes.includes(error?.code);
}

function reseal(value) {
  value.candidateDigest =
    computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(value);
  return value;
}

function assertRecursivelyFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) {
      assertRecursivelyFrozen(descriptor.value, seen);
    }
  }
}

async function temporaryRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-manifest-observation-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  return root;
}

test("full loader returns only the exact narrow recursively frozen private brand", async () => {
  const result = await liveResult();
  assert.equal(isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate(result), true);
  assert.deepEqual(Object.keys(result), PUBLIC_KEYS);
  assertRecursivelyFrozen(result);
  assert.equal(result.versionAwareBaziManifestObservationMechanicallyVerified, true);
  assert.equal(result.candidateId, testOnly.CANDIDATE_ID);
  assert.equal(result.candidateDigest, FINAL_IDENTITY.candidateDigest);
  assert.deepEqual(result.artifact, {
    path: BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
    bytes: FINAL_IDENTITY.bytes,
    sha256: FINAL_IDENTITY.rawSha256
  });
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    "historicalLineage",
    "currentPreviewObservation",
    "componentReceipts",
    "driftEntries",
    "savedComponentDigest",
    "currentComponentDigest",
    "currentSha256",
    workspaceRoot
  ]) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("prospective builder deterministically reproduces final raw and semantic pins", async () => {
  const bundle = await expectedBundle();
  const rebuilt = buildBaziDomainReleaseManifestVersionAwareObservationCandidate(
    bundle.observations
  );
  assert.equal(bundle.snapshot.rawBytes, FINAL_IDENTITY.bytes);
  assert.equal(bundle.snapshot.rawSha256, FINAL_IDENTITY.rawSha256);
  assert.equal(bundle.candidate.candidateDigest, FINAL_IDENTITY.candidateDigest);
  assert.equal(
    computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(bundle.candidate),
    FINAL_IDENTITY.candidateDigest
  );
  assert.equal(testOnly.exactJson(rebuilt, bundle.candidate), true);
  const persisted = await readFile(path.join(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
  ));
  assert.equal(persisted.byteLength, FINAL_IDENTITY.bytes);
  assert.equal(sha256(persisted), FINAL_IDENTITY.rawSha256);
  assert.equal(persisted.toString("utf8"), testOnly.serialize(bundle.candidate));
});

test("saved manifest and stale D0 remain two fixed historical bases rather than parents", async () => {
  const { candidate } = await expectedBundle();
  assert.deepEqual(candidate.historicalLineage.savedManifest, {
    ...testOnly.SAVED_MANIFEST,
    current: false,
    currentVerifierPassed: false,
    currentVerifierFailureCode: "MANIFEST_MISMATCH"
  });
  assert.deepEqual(candidate.historicalLineage.oldD0, {
    path: testOnly.HISTORICAL_D0.path,
    rawBytes: testOnly.HISTORICAL_D0.rawBytes,
    rawSha256: testOnly.HISTORICAL_D0.rawSha256,
    ledgerId: testOnly.HISTORICAL_D0.ledgerId,
    ledgerDigest: testOnly.HISTORICAL_D0.ledgerDigest,
    storedPreviewDigest: testOnly.HISTORICAL_D0.storedPreviewDigest,
    storedDriftEntryCount: 7,
    ownerDecisionsRecorded: 0,
    current: false,
    currentVerifierPassed: false,
    currentVerifierFailureCode: "CURRENT_EXPECTED_MANIFEST_CHANGED"
  });
  assert.equal(candidate.historicalLineage.historicalBasisArtifactCount, 2);
  assert.equal(candidate.historicalLineage.verifiedReleaseParentBrandCount, 0);
});

test("independent held-handle replay is exactly the non-authoritative 9/5/4/11/8 preview", async () => {
  const { candidate, observations } = await expectedBundle();
  const preview = candidate.currentPreviewObservation;
  assert.equal(preview.nonAuthoritativeCurrentExpectedPreviewDigest,
    "85e0a454c76bead4eac239a98a56b55fb662bcc77ff6f1e49e52ee2a6e65ea68");
  assert.deepEqual({
    components: preview.componentsObserved,
    unchanged: preview.unchangedComponentsObserved,
    changed: preview.changedComponentsObserved,
    componentFileSlots: preview.componentFileDriftEntryCount,
    uniquePaths: preview.uniqueDriftPathCount,
    uniqueComponentFiles: preview.totalUniqueComponentFilesObserved
  }, {
    components: 9,
    unchanged: 5,
    changed: 4,
    componentFileSlots: 11,
    uniquePaths: 8,
    uniqueComponentFiles: 34
  });
  assert.deepEqual(preview.componentDriftIds, [
    "fact_contract",
    "source_bundle",
    "rights_bundle",
    "high_risk_policy"
  ]);
  assert.equal(preview.authoritative, false);
  assert.equal(preview.persistedAsDomainManifest, false);
  assert.equal(preview.historicalManifestCurrentArtifactClosure, false);
  assert.equal(observations.preview.componentReceipts.length, 9);
  assert.equal(observations.preview.driftEntries.length, 11);
  assert.equal(new Set(observations.preview.driftEntries.map((entry) => entry.path)).size, 8);
});

test("five actual context brands are mechanical context and zero release-parent brands", async () => {
  const values = await contextBrands();
  const predicates = [
    isVerifiedBaziDttVersionedParentSupersession,
    isVerifiedBaziBindingFreezeRequirementsV17,
    isVerifiedBaziPolicyWeightsVersionAwareCandidate,
    isVerifiedBaziProjectCopyMaterializationVersionAwareCandidate,
    isVerifiedBaziExpertReviewIntakeGapVersionAwareCandidate
  ];
  for (let index = 0; index < values.length; index += 1) {
    assert.equal(predicates[index](values[index]), true);
    assert.equal(
      isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate(values[index]),
      false
    );
  }
  const { candidate } = await expectedBundle();
  assert.equal(candidate.contextBrandBoundary.verifiedMechanicalContextBrandCount, 5);
  assert.equal(candidate.contextBrandBoundary.verifiedReleaseParentBrandCount, 0);
  assert.equal(candidate.contextBrandBoundary.directLogicalParentArtifactCount, 6);
  assert.equal(candidate.contextBrandBoundary.supportingReceiptArtifactCount, 1);
  assert.equal(candidate.contextBrandBoundary.transitivePolicyClosureArtifactCount, 2);
  assert.equal(candidate.contextBrandBoundary.authorityInherited, false);
  assert.equal(candidate.contextBrandBoundary.capabilities.length, 5);
});

test("pure verification, clones, self-resealed authority and cross-brand objects never gain the brand", async () => {
  const { candidate } = await expectedBundle();
  const pure = verifyBaziDomainReleaseManifestVersionAwareObservationCandidateObject(
    clone(candidate)
  );
  assertRecursivelyFrozen(pure);
  assert.equal(isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate(pure), false);
  assert.equal(isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate(candidate), false);
  assert.equal(isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate(clone(await liveResult())), false);

  const forged = clone(candidate);
  forged.authorityBoundary.publicDeploymentAuthorized = true;
  reseal(forged);
  assert.throws(
    () => verifyBaziDomainReleaseManifestVersionAwareObservationCandidateObject(forged),
    expectCode("CANDIDATE_AUTHORITY_NOT_RED", "CANDIDATE_OBJECT_MISMATCH")
  );
});

test("owner acceptance, release authority and all epoch/interval/ABA claims stay red", async () => {
  const { candidate } = await expectedBundle();
  assert.deepEqual(candidate.ownerDecisionBoundary, {
    ownerAttributionVerified: false,
    ownerAcceptanceVerified: false,
    ownerDecisionsRecorded: 0,
    manifestRebindAuthorized: false,
    manifestResignAuthorized: false,
    generatedModelMayChooseOrSign: false
  });
  assert.deepEqual(candidate.observationBoundary, {
    savedManifestHashAndParseUseSameHeldHandleBuffer: true,
    oldD0HashAndParseUseSameHeldHandleBuffer: true,
    componentFileHashUsesSameHeldHandleBuffer: true,
    endpointSnapshotOnly: true,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false
  });
  for (const [key, value] of Object.entries(candidate.authorityBoundary)) {
    if (key === "engineeringObservationOnly") assert.equal(value, true);
    else assert.equal(value, false, key);
  }
  assert.equal(candidate.gateSummary.bindingRequired, 12);
  assert.equal(candidate.gateSummary.bindingFrozenVerified, 0);
  assert.equal(candidate.gateSummary.independentExpertsRequired, 2);
  assert.equal(candidate.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(candidate.gateSummary.formalAdmissionPromotionBlocked, true);
  assert.equal(candidate.gateSummary.releaseCandidateFreezeAllowed, false);
  assert.equal(candidate.gateSummary.releaseReady, false);
});

test("strict byte parser rejects duplicate keys, BOM and invalid UTF-8", () => {
  const attacks = [
    [Buffer.from('{"candidateId":"a","candidateId":"b"}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.from('{"candidateId":"a","\\u0063andidateId":"b"}', "utf8"), "JSON_DUPLICATE_KEY"],
    [Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}")]), "JSON_BOM_FORBIDDEN"],
    [Buffer.from([0xc3, 0x28]), "JSON_UTF8_INVALID"]
  ];
  for (const [bytes, code] of attacks) {
    assert.throws(
      () => parseBaziDttStrictJsonArtifact(snapshot(bytes)),
      expectCode(code)
    );
  }
});

test("canonical digesting rejects active or non-JSON object shapes without invoking accessors", () => {
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "releaseReady", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return true;
    }
  });
  const sparse = [];
  sparse.length = 1;
  const extra = [];
  extra.extra = true;
  const symbolObject = { value: 1 };
  symbolObject[Symbol("hidden")] = true;
  const alias = {};
  const inputs = [
    [accessor, "NON_PASSIVE_OBJECT"],
    [new Map(), "NON_PASSIVE_OBJECT"],
    [new Date(0), "NON_PASSIVE_OBJECT"],
    [sparse, "NON_PASSIVE_OBJECT"],
    [extra, "NON_PASSIVE_OBJECT"],
    [symbolObject, "NON_JSON_KEY"],
    [{ left: alias, right: alias }, "NON_JSON_GRAPH"]
  ];
  for (const [value, code] of inputs) {
    assert.throws(
      () => computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(value),
      expectCode(code)
    );
  }
  assert.equal(getterCalls, 0);
});

test("same-semantic candidate raw drift remains distinguishable from the frozen raw pin", async () => {
  const official = await readFile(path.join(
    workspaceRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH
  ));
  const source = official.toString("utf8");
  const driftedText = source.replace('\n  "', '\n\t "');
  const drifted = Buffer.from(driftedText, "utf8");
  assert.equal(drifted.byteLength, official.byteLength);
  assert.deepEqual(JSON.parse(driftedText), JSON.parse(source));
  assert.notEqual(sha256(drifted), FINAL_IDENTITY.rawSha256);
  const parsed = parseBaziDttStrictJsonArtifact(snapshot(drifted));
  const { candidate } = await expectedBundle();
  assert.equal(testOnly.exactJson(parsed, candidate), true);
});

test("fixed loader path ignores a caller decoy and extra path-like arguments", async (t) => {
  const root = await temporaryRoot(t);
  const decoy = path.join(root, "forged-manifest-observation.json");
  await writeFile(decoy, JSON.stringify({
    publicDeploymentAuthorized: true,
    candidateDigest: "0".repeat(64)
  }), "utf8");
  const result = await loadBaziDomainReleaseManifestVersionAwareObservationCandidate(
    workspaceRoot,
    decoy,
    { artifactPath: decoy, ownerAccepted: true }
  );
  assert.equal(result.artifact.path,
    BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH);
  assert.equal(result.candidateDigest, FINAL_IDENTITY.candidateDigest);
  assert.equal(result.authorityRedGates.publicDeploymentAuthorized, false);
});

test("current preview replay reads each of the 34 unique component files once through the stable reader", async () => {
  const savedSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    testOnly.SAVED_MANIFEST.path
  );
  const saved = parseBaziDttStrictJsonArtifact(savedSnapshot);
  const paths = [];
  const replay = await testOnly.replayCurrentPreview(
    workspaceRoot,
    saved,
    async (root, relativePath) => {
      paths.push(relativePath);
      return readBaziDttStableWorkspaceArtifact(root, relativePath);
    }
  );
  assert.equal(paths.length, 34);
  assert.equal(new Set(paths).size, 34);
  assert.equal(replay.componentFileDriftEntryCount, 11);
  assert.equal(replay.uniqueDriftPathCount, 8);
});

test("a changed component observation cannot be hidden behind a resealed current preview", async () => {
  const savedSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    testOnly.SAVED_MANIFEST.path
  );
  const saved = parseBaziDttStrictJsonArtifact(savedSnapshot);
  await assert.rejects(
    testOnly.replayCurrentPreview(
      workspaceRoot,
      saved,
      async (root, relativePath) => {
        const observed = await readBaziDttStableWorkspaceArtifact(root, relativePath);
        if (relativePath !== "packages/bazi-core/src/index.ts") return observed;
        return Object.freeze({ ...observed, rawSha256: "0".repeat(64) });
      }
    ),
    expectCode("CURRENT_PREVIEW_CHANGED")
  );
});

test("held-handle reader binds hash and parse to one buffer and rejects path and hardlink aliases", async (t) => {
  const root = await temporaryRoot(t);
  const directory = path.join(root, "data");
  const target = path.join(directory, "candidate.json");
  const alias = path.join(directory, "candidate-alias.json");
  await mkdir(directory, { recursive: true });
  await writeFile(target, '{"observed":true}\n', "utf8");
  const observed = await baziDttVersionedParentSupersessionTestOnly.readStableWorkspaceFile(
    root,
    "data/candidate.json",
    1024
  );
  assert.equal(observed.rawSha256, sha256(observed.bytes));
  assert.deepEqual(parseBaziDttStrictJsonArtifact(observed), { observed: true });
  await assert.rejects(
    baziDttVersionedParentSupersessionTestOnly.readStableWorkspaceFile(
      root,
      "../candidate.json",
      1024
    ),
    expectCode("PATH_INVALID", "PATH_ESCAPE")
  );
  try {
    await link(target, alias);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.skip(`hardlink unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    baziDttVersionedParentSupersessionTestOnly.readStableWorkspaceFile(
      root,
      "data/candidate.json",
      1024
    ),
    expectCode("HARDLINK_REJECTED")
  );
});

test("held-handle replacement hook detects endpoint change during the read interval", async (t) => {
  const root = await temporaryRoot(t);
  const directory = path.join(root, "data");
  const target = path.join(directory, "candidate.json");
  const displaced = path.join(directory, "candidate.displaced.json");
  const replacement = path.join(directory, "candidate.replacement.json");
  await mkdir(directory, { recursive: true });
  await writeFile(target, '{"value":"A"}\n', "utf8");
  await writeFile(replacement, '{"value":"B"}\n', "utf8");
  let unsupported = null;
  let failure = null;
  try {
    await baziDttVersionedParentSupersessionTestOnly.readStableWorkspaceFile(
      root,
      "data/candidate.json",
      1024,
      {
        async afterOpenBeforeRead() {
          try {
            await rename(target, displaced);
            await rename(replacement, target);
          } catch (error) {
            unsupported = error;
          }
        }
      }
    );
  } catch (error) {
    failure = error;
  }
  if (unsupported && ["EPERM", "EACCES", "ENOTSUP"].includes(unsupported.code)) {
    t.skip(`open-file replacement unavailable: ${unsupported.code}`);
    return;
  }
  assert.equal(failure?.code, "ENDPOINT_CHANGED");
});

test("captured canonical and WeakSet intrinsics resist post-import poisoning", async () => {
  const branded = await liveResult();
  const input = { beta: [1, true, null], alpha: "stable" };
  const expected = computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(input);
  const originals = {
    getPrototypeOf: Object.getPrototypeOf,
    getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    ownKeys: Reflect.ownKeys,
    apply: Reflect.apply,
    sort: Array.prototype.sort,
    stringify: JSON.stringify,
    weakSetHas: WeakSet.prototype.has
  };
  const poison = () => { throw new Error("poisoned intrinsic invoked"); };
  let observed;
  let brandedStillVerified;
  let forgedVerified;
  try {
    Object.getPrototypeOf = poison;
    Object.getOwnPropertyDescriptor = poison;
    Reflect.ownKeys = poison;
    Reflect.apply = poison;
    Array.prototype.sort = poison;
    JSON.stringify = poison;
    WeakSet.prototype.has = () => true;
    observed = computeBaziDomainReleaseManifestVersionAwareObservationCandidateDigest(input);
    brandedStillVerified =
      isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate(branded);
    forgedVerified =
      isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate({});
  } finally {
    Object.getPrototypeOf = originals.getPrototypeOf;
    Object.getOwnPropertyDescriptor = originals.getOwnPropertyDescriptor;
    Reflect.ownKeys = originals.ownKeys;
    Reflect.apply = originals.apply;
    Array.prototype.sort = originals.sort;
    JSON.stringify = originals.stringify;
    WeakSet.prototype.has = originals.weakSetHas;
  }
  assert.equal(observed, expected);
  assert.equal(brandedStillVerified, true);
  assert.equal(forgedVerified, false);
});

test("CLI emits the exact narrow branded observation and rejects argv or loader injection", () => {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, [CLI_PATH], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: environment
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout.startsWith(OK_PREFIX), true);
  const payload = JSON.parse(run.stdout.slice(OK_PREFIX.length));
  assert.deepEqual(Object.keys(payload), [
    "versionAwareBaziManifestObservationMechanicallyVerified",
    "candidateResultWeakSetBrandVerified",
    ...PUBLIC_KEYS.slice(1)
  ]);
  assert.equal(payload.candidateResultWeakSetBrandVerified, true);
  assert.equal(payload.candidateDigest, FINAL_IDENTITY.candidateDigest);
  assert.equal(payload.contextBrandAccounting.verifiedMechanicalContextBrandCount, 5);
  assert.equal(payload.contextBrandAccounting.verifiedReleaseParentBrandCount, 0);
  assert.equal(payload.currentPreviewAccounting.componentFileDriftEntryCount, 11);
  assert.equal(payload.ownerDecisionAccounting.ownerDecisionsRecorded, 0);
  assert.equal(payload.observationRedGates.crossFileAtomicSnapshot, false);
  assert.equal(payload.observationRedGates.mutationEpochReceipt, null);
  assert.equal(payload.authorityRedGates.releaseReady, false);
  assert.equal(payload.authorityRedGates.publicDeploymentAuthorized, false);

  const argv = spawnSync(process.execPath, [CLI_PATH, "--artifact", "forged.json"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: environment
  });
  assert.equal(argv.status, 1);
  assert.equal(argv.stdout, "");
  assert.equal(argv.stderr, `${FAILED_PREFIX} CLI_ARGUMENTS_FORBIDDEN\n`);

  const injected = spawnSync(process.execPath, [CLI_PATH], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...environment, NODE_OPTIONS: "--no-warnings" }
  });
  assert.equal(injected.status, 1);
  assert.equal(injected.stdout, "");
  assert.equal(injected.stderr,
    `${FAILED_PREFIX} VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN\n`);
});

test("old manifest, D0, registry, default and runtime consumers remain isolated", async () => {
  const capability = "bazi-domain-release-manifest-version-aware-observation-candidate";
  const artifact =
    BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH;
  const consumers = [
    "scripts/bazi-domain-release-manifest-lib.mjs",
    "scripts/verify-bazi-domain-release-manifest.mjs",
    "scripts/bazi-v17-manifest-drift-decision-lib.mjs",
    "scripts/verify-bazi-v17-manifest-drift-decisions.mjs",
    "scripts/system-admission-registry-lib.mjs",
    "scripts/verify-system-admission-registry.mjs",
    "packages/bazi-interpretation/src/index.ts",
    "apps/web/src/components/bazi-interpretation-panel.tsx",
    "apps/web/src/components/bazi-strength-evidence-ledger.tsx"
  ];
  for (const relativePath of consumers) {
    const source = await readFile(path.join(workspaceRoot, relativePath), "utf8");
    assert.equal(source.includes(capability), false, relativePath);
    assert.equal(source.includes(artifact), false, relativePath);
  }
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  for (const scriptName of ["build", "test", "typecheck", "prebuild", "pretest", "pretypecheck"]) {
    const script = packageJson.scripts?.[scriptName] ?? "";
    assert.equal(script.includes(capability), false, scriptName);
  }
});

test("new artifact, lib, CLI and test source remain LF-only with a final newline", async () => {
  for (const relativePath of [
    BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_RELATIVE_PATH,
    "scripts/bazi-domain-release-manifest-version-aware-observation-candidate-lib.mjs",
    "scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate.mjs",
    "scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate.test.mjs"
  ]) {
    const bytes = await readFile(path.join(workspaceRoot, relativePath));
    assert.equal(bytes.includes(0x0d), false, `${relativePath} contains CR`);
    assert.equal(bytes.at(-1), 0x0a, `${relativePath} lacks final LF`);
  }
});
