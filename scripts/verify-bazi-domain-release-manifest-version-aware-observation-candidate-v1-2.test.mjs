import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_RELATIVE_PATH,
  baziDomainReleaseManifestObservationCandidateV12TestOnly,
  computeBaziDomainReleaseManifestObservationCandidateV12Digest,
  isVerifiedBaziDomainReleaseManifestObservationCandidateV12,
  loadBaziDomainReleaseManifestObservationCandidateV12,
  serializeBaziDomainReleaseManifestObservationCandidateV12
} from "./bazi-domain-release-manifest-version-aware-observation-candidate-v1-2-lib.mjs";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const CLI_PATH = path.join(
  SCRIPT_DIRECTORY,
  "verify-bazi-domain-release-manifest-version-aware-observation-candidate-v1-2.mjs"
);
const OK_PREFIX =
  "BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_MECHANICS_OK ";
const FAIL_PREFIX =
  "BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_MECHANICS_FAILED ";
const NEW_FILES = [
  "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0.json",
  "scripts/bazi-domain-release-manifest-version-aware-observation-candidate-v1-2-lib.mjs",
  "scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate-v1-2.mjs",
  "scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate-v1-2.test.mjs",
  "docs/阶段D八字v1.7领域Manifest版本感知观察候选-v1.2-2026-08-31.md"
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  delete environment.NODE_OPTIONS;
  return environment;
}

function runCli(args = [], options = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: path.dirname(WORKSPACE_ROOT),
    encoding: "utf8",
    env: options.env ?? cleanEnvironment()
  });
}

test("loads the exact persisted v1.2 observation with its own private brand", async () => {
  const verified = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
  assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(verified), true);
  assert.equal(verified.privateBrandVerified, true);
  assert.equal(
    verified.candidateId,
    "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.2.0"
  );
  assert.equal(
    verified.candidateDigest,
    "8634c6dba6591014040107d53b0dd6bb38a98fc67cc977f022f234525b47e6a2"
  );
  assert.deepEqual(verified.artifact, {
    path: BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_RELATIVE_PATH,
    rawBytes: 22454,
    rawSha256: "88ada4ca435228e7802b97eb0f19665392fb03445d7b065a36aac7a7efe18491"
  });
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(Object.isFrozen(verified.candidate), true);

  const prospective = await baziDomainReleaseManifestObservationCandidateV12TestOnly
    .buildExpectedCandidate(WORKSPACE_ROOT);
  assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(prospective), false);
  assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(clone(verified)), false);
  assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(clone(verified.candidate)), false);
});

test("post-import WeakSet intrinsic poisoning cannot intercept or forge the private brand", async () => {
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  const interceptedSets = new Set();
  try {
    WeakSet.prototype.add = function poisonedAdd(value) {
      if (value?.privateBrandVerified === true
        && value?.candidateId
          === "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.2.0") {
        interceptedSets.add(this);
      }
      return Reflect.apply(originalAdd, this, [value]);
    };
    const verified = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
    const forged = { candidateId: verified.candidateId, privateBrandVerified: true };
    for (const interceptedSet of interceptedSets) {
      Reflect.apply(originalAdd, interceptedSet, [forged]);
    }
    assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(forged), false);
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(verified), true);
    assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(forged), false);
  } finally {
    WeakSet.prototype.add = originalAdd;
    WeakSet.prototype.has = originalHas;
  }
});

test("canonicalization preserves __proto__ as JSON data and rejects semantic collisions", () => {
  const withProtoData = JSON.parse('{"__proto__":{"polluted":true}}');
  const empty = {};
  assert.notEqual(
    baziDomainReleaseManifestObservationCandidateV12TestOnly.canonicalStringify(withProtoData),
    baziDomainReleaseManifestObservationCandidateV12TestOnly.canonicalStringify(empty)
  );
  assert.notEqual(
    computeBaziDomainReleaseManifestObservationCandidateV12Digest(withProtoData),
    computeBaziDomainReleaseManifestObservationCandidateV12Digest(empty)
  );
  const accessor = {};
  Object.defineProperty(accessor, "x", { enumerable: true, get() { return 1; } });
  const originalValueDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, "value");
  try {
    Object.defineProperty(Object.prototype, "value", {
      configurable: true,
      value: 1,
      writable: true
    });
    assert.throws(
      () => computeBaziDomainReleaseManifestObservationCandidateV12Digest(accessor),
      (error) => error?.code === "NON_PASSIVE_OBJECT"
    );
  } finally {
    if (originalValueDescriptor) {
      Object.defineProperty(Object.prototype, "value", originalValueDescriptor);
    } else {
      delete Object.prototype.value;
    }
  }
});

test("post-import iterator and Hash method poisoning cannot collapse public candidate digests", () => {
  const originalIterator = Array.prototype[Symbol.iterator];
  const originalToJsonDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "toJSON");
  const originalString = globalThis.String;
  const hashPrototype = Object.getPrototypeOf(createHash("sha256"));
  const originalUpdate = hashPrototype.update;
  const originalDigest = hashPrototype.digest;
  const baselineEmpty = computeBaziDomainReleaseManifestObservationCandidateV12Digest({});
  const baselineValue = computeBaziDomainReleaseManifestObservationCandidateV12Digest({ a: 1 });
  const baselineArray = computeBaziDomainReleaseManifestObservationCandidateV12Digest([1, 2]);
  assert.notEqual(baselineEmpty, baselineValue);
  try {
    Array.prototype[Symbol.iterator] = function* poisonedIterator() {};
    Array.prototype.toJSON = () => [];
    globalThis.String = () => "0";
    hashPrototype.update = function poisonedUpdate() { return this; };
    hashPrototype.digest = () => "f".repeat(64);
    assert.equal(
      computeBaziDomainReleaseManifestObservationCandidateV12Digest({}),
      baselineEmpty
    );
    assert.equal(
      computeBaziDomainReleaseManifestObservationCandidateV12Digest({ a: 1 }),
      baselineValue
    );
    assert.equal(
      computeBaziDomainReleaseManifestObservationCandidateV12Digest([1, 2]),
      baselineArray
    );
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
    if (originalToJsonDescriptor) {
      Object.defineProperty(Array.prototype, "toJSON", originalToJsonDescriptor);
    } else {
      delete Array.prototype.toJSON;
    }
    globalThis.String = originalString;
    hashPrototype.update = originalUpdate;
    hashPrototype.digest = originalDigest;
  }
});

test("post-import Map prototype poisoning cannot bypass the 34 stable component reads", async () => {
  const saved = JSON.parse(await readFile(
    path.join(WORKSPACE_ROOT, "content/domain-release/bazi.single-chart-report.v1.7.0.json"),
    "utf8"
  ));
  const observation = JSON.parse(await readFile(
    path.join(
      WORKSPACE_ROOT,
      "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0.json"
    ),
    "utf8"
  ));
  const hashes = Object.create(null);
  for (let componentIndex = 0; componentIndex < saved.components.length; componentIndex += 1) {
    const files = saved.components[componentIndex].files;
    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      hashes[files[fileIndex].path] = files[fileIndex].sha256;
    }
  }
  const driftEntries = observation.currentPreviewObservation.driftEntries;
  for (let index = 0; index < driftEntries.length; index += 1) {
    hashes[driftEntries[index].path] = driftEntries[index].currentSha256;
  }
  const originalHas = Map.prototype.has;
  const originalGet = Map.prototype.get;
  const originalSize = Object.getOwnPropertyDescriptor(Map.prototype, "size");
  let fakeHits = 0;
  try {
    Map.prototype.has = function poisonedHas(key) {
      if (typeof key === "string" && key.includes("/") && hashes[key]) {
        fakeHits += 1;
        return true;
      }
      return Reflect.apply(originalHas, this, [key]);
    };
    Map.prototype.get = function poisonedGet(key) {
      if (typeof key === "string" && key.includes("/") && hashes[key]) {
        return { rawSha256: hashes[key] };
      }
      return Reflect.apply(originalGet, this, [key]);
    };
    Object.defineProperty(Map.prototype, "size", {
      configurable: true,
      get() { return 34; }
    });
    const verified = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
    assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(verified), true);
    assert.equal(
      verified.candidate.currentPreviewObservation.totalUniqueComponentFilesObserved,
      34
    );
    assert.equal(fakeHits, 0);
  } finally {
    Map.prototype.has = originalHas;
    Map.prototype.get = originalGet;
    Object.defineProperty(Map.prototype, "size", originalSize);
  }
});

test("post-import reflection poisoning cannot leave a branded result partially mutable", async () => {
  const originalOwnKeys = Reflect.ownKeys;
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  let verified;
  try {
    Reflect.ownKeys = () => [];
    Object.getOwnPropertyDescriptor = () => undefined;
    verified = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
  } finally {
    Reflect.ownKeys = originalOwnKeys;
    Object.getOwnPropertyDescriptor = originalGetOwnPropertyDescriptor;
  }
  assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(verified), true);
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(Object.isFrozen(verified.candidate), true);
  assert.equal(Object.isFrozen(verified.artifact), true);
  assert.throws(() => {
    verified.artifact.rawSha256 = "forged";
  }, TypeError);
});

test("keeps the frozen golden separate from current manifest closure", async () => {
  const { candidate } = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
  assert.equal(
    candidate.currentPreviewObservation.frozenGoldenSha256,
    "aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29"
  );
  assert.equal(candidate.currentPreviewObservation.frozenGoldenMatchesCurrentBytes, true);
  assert.equal(candidate.savedManifestObservation.manifestDigest,
    "60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932");
  assert.equal(candidate.savedManifestObservation.savedManifestCurrent, false);
  assert.equal(candidate.savedManifestObservation.formalVerifierReplayPerformed, false);
  assert.equal(candidate.savedManifestObservation.formalVerifierOutputCaptured, false);
  assert.deepEqual(
    candidate.savedManifestObservation.observedBlockingRelationships,
    [{
      basis: "saved_manifest_differs_from_recomputed_non_authoritative_preview",
      code: "MANIFEST_MISMATCH"
    }]
  );
  assert.equal(
    candidate.currentPreviewObservation.nonAuthoritativeCurrentExpectedPreviewDigest,
    "0c6a1003b3b26215da6be7dc5f68999684993564785cc99ffe0373f9019247d0"
  );
  assert.deepEqual(
    [
      candidate.currentPreviewObservation.componentsObserved,
      candidate.currentPreviewObservation.unchangedComponentsObserved,
      candidate.currentPreviewObservation.changedComponentsObserved,
      candidate.currentPreviewObservation.componentFileDriftEntryCount,
      candidate.currentPreviewObservation.uniqueDriftPathCount,
      candidate.currentPreviewObservation.totalUniqueComponentFilesObserved
    ],
    [9, 5, 4, 11, 8, 34]
  );
});

test("counts four direct and one transitive current context brands without release authority", async () => {
  const { candidate } = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
  const boundary = candidate.contextBrandBoundary;
  assert.equal(boundary.verifiedDirectMechanicalContextBrandCount, 4);
  assert.equal(boundary.verifiedTransitiveMechanicalContextBrandCount, 1);
  assert.equal(boundary.verifiedMechanicalContextBrandResultCount, 5);
  assert.equal(boundary.verifiedReleaseParentBrandCount, 0);
  assert.equal(boundary.authorityInherited, false);
  assert.equal(boundary.activeAdmissionEffect, "none");
  assert.equal(boundary.directLogicalParentArtifactCount, 5);
  assert.equal(boundary.supportingReceiptArtifactCount, 1);
  assert.equal(boundary.verifiedContexts.length, 4);
  assert.deepEqual(
    boundary.verifiedContexts.map((entry) => entry.contextId),
    [
      "hakimi.bazi.dtt-versioned-parent-supersession/1.0.0",
      "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0",
      "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
      "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0"
    ]
  );
  assert.equal(
    boundary.verifiedContexts.reduce(
      (count, entry) => count + entry.directParentArtifacts.length,
      0
    ),
    5
  );
  assert.equal(
    boundary.verifiedContexts.reduce(
      (count, entry) => count + entry.supportingReceiptArtifacts.length,
      0
    ),
    1
  );
  assert.deepEqual(
    boundary.staleObservedContexts.map((entry) => ({
      id: entry.contextId,
      passed: entry.loaderPassed,
      code: entry.loaderFailureCode,
      branded: entry.countsTowardVerifiedDirectMechanicalContextBrand
    })),
    [
      {
        id: "hakimi.bazi/policy-weights-value-evidence.version-aware-candidate/1.1.0",
        passed: false,
        code: "UNCHANGED_BASIS_RAW_DRIFT",
        branded: false
      },
      {
        id: "hakimi.bazi.engineering_binding_value_subject_gaps.version-aware-candidate/1.1.0",
        passed: false,
        code: "UNCHANGED_BASIS_RAW_DRIFT",
        branded: false
      }
    ]
  );
  assert.equal(boundary.verifiedTransitiveObservations.length, 1);
  assert.equal(
    boundary.verifiedTransitiveObservations[0].contextId,
    "hakimi.bazi.pr10bc.version-aware-candidate-scope-reconciliation/1.1.0"
  );
  assert.equal(
    boundary.verifiedTransitiveObservations[0].countsTowardVerifiedDirectMechanicalContextBrand,
    false);
  assert.deepEqual(boundary.staleBasisObservation, {
    path: "package-lock.json",
    priorPinnedSha256: "9c9b3a1c569929b46d3dd5a2f084f6e44209ae0d55f27ff8467990f98e524013",
    currentBytes: 174994,
    currentSha256: "5c0a532cc8061e970e4b0fb8e13a68546f558fc487d8249abc65983a95dccd25",
    acceptedForRebind: false
  });
});

test("keeps owner, binding, expert, epoch, ABA and all authority gates red", async () => {
  const { candidate } = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
  assert.deepEqual(candidate.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(candidate.ownerDecisionBoundary.ownerDecisionsRecorded, 0);
  assert.equal(candidate.ownerDecisionBoundary.ownerAcceptanceVerified, false);
  assert.equal(candidate.ownerDecisionBoundary.ownerAttributionVerified, false);
  assert.equal(candidate.ownerDecisionBoundary.manifestRebindAuthorized, false);
  assert.equal(candidate.ownerDecisionBoundary.manifestResignAuthorized, false);
  assert.equal(candidate.gateSummary.bindingFrozenVerified, 0);
  assert.equal(candidate.gateSummary.bindingRequired, 12);
  assert.equal(candidate.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(candidate.gateSummary.independentExpertsRequired, 2);
  for (const field of [
    "sourceBundleComplete",
    "rightsBundleComplete",
    "expertReviewBundleComplete",
    "formalActivationAllowed",
    "admissionAuthorized",
    "releaseCandidateFreezeAllowed",
    "releaseReady"
  ]) assert.equal(candidate.gateSummary[field], false, field);
  assert.equal(candidate.gateSummary.formalAdmissionPromotionBlocked, true);
  for (const field of [
    "authoritative",
    "persistedAsDomainManifest",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailableForSchema13",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]) assert.equal(candidate.currentPreviewObservation[field], false, field);
  assert.equal(candidate.currentPreviewObservation.endpointSnapshotOnly, true);
  assert.equal(candidate.currentPreviewObservation.mutationEpochReceipt, null);
  for (const [field, value] of Object.entries(candidate.authorityBoundary)) {
    if (field === "engineeringObservationOnly") assert.equal(value, true);
    else assert.equal(value, false, field);
  }
});

test("self-resealed clones and custom prototype inputs never obtain authority or the brand", async () => {
  const verified = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
  const promoted = clone(verified.candidate);
  promoted.gateSummary.releaseReady = true;
  promoted.candidateDigest =
    computeBaziDomainReleaseManifestObservationCandidateV12Digest(promoted);
  assert.equal(
    promoted.candidateDigest,
    computeBaziDomainReleaseManifestObservationCandidateV12Digest(promoted)
  );
  assert.throws(
    () => baziDomainReleaseManifestObservationCandidateV12TestOnly
      .assertCandidateBoundary(promoted),
    (error) => error?.code === "CANDIDATE_BOUNDARY_DRIFT"
  );
  assert.equal(isVerifiedBaziDomainReleaseManifestObservationCandidateV12(promoted), false);

  const customPrototype = Object.create({ inherited: true });
  customPrototype.candidateId = verified.candidateId;
  assert.throws(
    () => computeBaziDomainReleaseManifestObservationCandidateV12Digest(customPrototype),
    (error) => error?.code === "NON_PASSIVE_OBJECT"
  );
});

test("preserves historical v1.1 and D0 bytes and stays outside active consumers", async () => {
  const { candidate } = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
  assert.equal(candidate.historicalAccounting.historicalD0.legacyVerifierReplayPerformed, false);
  assert.equal(candidate.historicalAccounting.historicalD0.legacyVerifierOutputCaptured, false);
  assert.deepEqual(
    candidate.historicalAccounting.historicalD0.observedBlockingRelationships,
    [{
      basis: "stored_preview_digest_differs_from_current_preview_digest",
      code: "CURRENT_EXPECTED_MANIFEST_CHANGED"
    }]
  );
  assert.equal(
    candidate.historicalAccounting.historicalV11Observation.legacyLoaderReplayPerformed,
    false
  );
  assert.equal(
    candidate.historicalAccounting.historicalV11Observation.legacyLoaderOutputCaptured,
    false
  );
  assert.deepEqual(
    candidate.historicalAccounting.historicalV11Observation.observedBlockingRelationships,
    [{
      basis: "stored_preview_digest_differs_from_current_preview_digest",
      code: "CURRENT_PREVIEW_CHANGED"
    }]
  );
  const historical = [
    {
      path: "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.1.0.json",
      bytes: 21859,
      sha256: "7768590bc117a229919bcd119a2bfada97d7e77712677947a2a650d6f518233d"
    },
    {
      path: "content/system-admission/bazi-v17-manifest-drift-decisions.v1.json",
      bytes: 11291,
      sha256: "91e6cda96190b43f65018c913ffa31f5346500d82842f6ebbd4e8af543734486"
    },
    {
      path: "content/domain-release/bazi.single-chart-report.v1.7.0.json",
      bytes: 12777,
      sha256: "d63d80502c6186a66f2eabc4bd2749687978a8cfb22d420842aa4a9d6e0eccd6"
    }
  ];
  for (const entry of historical) {
    const bytes = await readFile(path.join(WORKSPACE_ROOT, entry.path));
    assert.equal(bytes.length, entry.bytes, entry.path);
    assert.equal(sha256(bytes), entry.sha256, entry.path);
  }
  const forbiddenConsumers = [
    "package.json",
    "content/system-admission/four-system-admission.v1.json",
    "scripts/system-admission-registry-lib.mjs",
    ".github/workflows/quick-ci.yml"
  ];
  for (const relativePath of forbiddenConsumers) {
    const text = await readFile(path.join(WORKSPACE_ROOT, relativePath), "utf8");
    assert.equal(text.includes("observation-candidate.v1.2.0"), false, relativePath);
    assert.equal(text.includes("observation-candidate-v1-2"), false, relativePath);
  }
});

test("CLI emits only the narrow branded observation from its fixed workspace", () => {
  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.startsWith(OK_PREFIX), true);
  const payload = JSON.parse(result.stdout.slice(OK_PREFIX.length));
  assert.equal(payload.candidateDigest,
    "8634c6dba6591014040107d53b0dd6bb38a98fc67cc977f022f234525b47e6a2");
  assert.equal(payload.contextAccounting.verifiedDirectMechanicalContextBrandCount, 4);
  assert.equal(payload.contextAccounting.verifiedTransitiveMechanicalContextBrandCount, 1);
  assert.equal(payload.contextAccounting.verifiedMechanicalContextBrandResultCount, 5);
  assert.equal(payload.contextAccounting.staleObservedContextCount, 2);
  assert.equal(payload.contextAccounting.verifiedReleaseParentBrandCount, 0);
  assert.equal(payload.ownerAndGateAccounting.ownerDecisionsRecorded, 0);
  assert.equal(payload.ownerAndGateAccounting.bindingFrozenVerified, 0);
  assert.equal(payload.ownerAndGateAccounting.independentExpertReviewsVerified, 0);
  assert.equal(payload.ownerAndGateAccounting.releaseReady, false);
  assert.equal(payload.epochAndAuthorityAccounting.mutationEpochReceipt, null);
  assert.equal(payload.epochAndAuthorityAccounting.abaExcluded, false);
  assert.equal(result.stdout.includes(WORKSPACE_ROOT), false);
  assert.equal(result.stdout.includes("driftEntries"), false);
  assert.equal(result.stdout.includes("componentReceipts"), false);
});

test("CLI rejects extra argv and visible NODE_OPTIONS with fixed sanitized codes", () => {
  const extra = runCli(["unexpected"]);
  assert.equal(extra.status, 1);
  assert.equal(extra.stdout, "");
  assert.equal(extra.stderr, FAIL_PREFIX + "CLI_ARGUMENTS_FORBIDDEN\n");

  const environment = cleanEnvironment();
  environment.NODE_OPTIONS = "--no-warnings";
  const injected = runCli([], { env: environment });
  assert.equal(injected.status, 1);
  assert.equal(injected.stdout, "");
  assert.equal(
    injected.stderr,
    FAIL_PREFIX + "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN\n"
  );
});

test("persisted bytes are canonical and all five new files use one terminal LF", async () => {
  const verified = await loadBaziDomainReleaseManifestObservationCandidateV12(WORKSPACE_ROOT);
  const persisted = await readFile(
    path.join(WORKSPACE_ROOT,
      BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_V12_RELATIVE_PATH),
    "utf8"
  );
  assert.equal(persisted, serializeBaziDomainReleaseManifestObservationCandidateV12(
    verified.candidate
  ));
  for (const relativePath of NEW_FILES) {
    const text = await readFile(path.join(WORKSPACE_ROOT, relativePath), "utf8");
    assert.equal(text.includes("\r\n"), false, relativePath);
    assert.equal(text.endsWith("\n"), true, relativePath);
    assert.equal(text.endsWith("\n\n"), false, relativePath);
  }
});
