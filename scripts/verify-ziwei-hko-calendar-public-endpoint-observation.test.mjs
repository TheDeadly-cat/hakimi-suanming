import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { test } from "node:test";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH,
  computeZiweiHkoPublicEndpointObservationDigest,
  isVerifiedZiweiHkoPublicEndpointObservation,
  parseZiweiHkoPublicEndpointObservationJsonBytes,
  readZiweiHkoPublicEndpointObservation,
  verifyZiweiHkoPublicEndpointObservation,
  ziweiHkoPublicEndpointObservationTestOnly
} from "./ziwei-hko-calendar-public-endpoint-observation-lib.mjs";
import { verifyZiweiHkoCalendarSourceEvidence } from "./ziwei-hko-calendar-source-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function removeTempRoot(tempRoot) {
  const temporaryBase = path.resolve(os.tmpdir());
  const target = path.resolve(tempRoot);
  const relative = path.relative(temporaryBase, target);
  assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  await rm(target, { recursive: true, force: true });
}

async function expectMismatch(mutate, { recomputeDigest = false } = {}) {
  const observation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  mutate(observation);
  if (recomputeDigest) {
    observation.observationDigest = computeZiweiHkoPublicEndpointObservationDigest(observation);
  }
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, observation),
    /调用方 HKO observation 与持久化工件不一致/u
  );
}

async function expectSemanticError(sourceResult, mutate, expectedCode) {
  const observation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  mutate(observation);
  observation.observationDigest = computeZiweiHkoPublicEndpointObservationDigest(observation);
  assert.throws(
    () => ziweiHkoPublicEndpointObservationTestOnly.validateObservation(observation, sourceResult),
    (reason) => reason?.code === expectedCode
  );
}

function assertRecursivelyFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertRecursivelyFrozen(child, seen);
}

test("verifies six exact HKO bodies while every formal authority gate stays closed", async () => {
  const result = await verifyZiweiHkoPublicEndpointObservation(workspaceRoot);
  assert.equal(result.observation.observationId,
    "hakimi.ziwei.hko-calendar-public-endpoint-observation/2026-08-29T12:37:27.146Z");
  assert.equal(result.operatorRecordedExactResourceBodyMatches, 6);
  assert.equal(result.preExistingCandidateAnnualRawBodiesStored, 6);
  assert.equal(result.automaticDecompressionClaimedByOperator, true);
  assert.equal(result.automaticDecompressionMechanicallyVerified, false);
  assert.equal(result.contentEncodingCaptured, false);
  assert.equal(result.httpClientDeliveredBodyHashOperatorRecorded, true);
  assert.equal(result.captureExecutionReceiptStored, false);
  assert.equal(result.remoteCaptureMechanicallyVerified, false);
  assert.equal(result.requestedToFinalUrlBindingEstablished, false);
  assert.equal(result.observation.candidateCrossCheck.allResourceStatus200OperatorRecorded, true);
  assert.equal(result.observation.candidateCrossCheck.allResourceBodiesExactMatchOperatorRecorded, true);
  assert.equal(result.termsApplicabilityConflictOrAmbiguityObserved, true);
  assert.equal(result.rightsLegalConclusion, "not_established");
  assert.equal(result.preExistingCandidateRawBodiesStorageRightsEstablished, false);
  assert.equal(result.formalSourceRightsRecordsCreated, 0);
  assert.equal(result.formalSourceCarrierRecordsCreated, 0);
  assert.equal(result.independentRightsReviewsVerified, 0);
  assert.equal(result.bindingFrozenVerified, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);
  assert.deepEqual(result.sourceCandidateArtifact, {
    path: "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json",
    bytes: 8316,
    sha256: "61a9607aaa9b1133501fb9194f7be97e01f42e360b069fe38aa34d6eb8e2fd0e",
    evidenceDigest: "10fb1417fcca03b9a106aff5cfb11469bf454199b9cfb3ec35ee16b5b03f9b9d",
    sourceBodySetDigest: "580108d977a4a4586115921e03502306ea8b5f8efe4558f76f37d072e8e8a445"
  });
});

test("locks the raw observation bytes, SHA-256 and canonical digest", async () => {
  const absolute = path.resolve(workspaceRoot, ...ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH.split("/"));
  const bytes = await readFile(absolute);
  assert.equal(bytes.byteLength, ziweiHkoPublicEndpointObservationTestOnly.OBSERVATION_RAW_IDENTITY.bytes);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    ziweiHkoPublicEndpointObservationTestOnly.OBSERVATION_RAW_IDENTITY.sha256
  );
  const observation = await readZiweiHkoPublicEndpointObservation(workspaceRoot);
  assert.equal(
    computeZiweiHkoPublicEndpointObservationDigest(observation),
    "7acc61b617564f8446f986ee90126fe968845959cdb13a334cc6ec6e1f05977a"
  );
});

test("strict byte parser rejects BOM, invalid UTF-8, duplicate keys and Proxy bytes", () => {
  assert.throws(
    () => parseZiweiHkoPublicEndpointObservationJsonBytes(
      Uint8Array.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
    ),
    /不得包含 UTF-8 BOM/u
  );
  assert.throws(
    () => parseZiweiHkoPublicEndpointObservationJsonBytes(Uint8Array.from([0xc3, 0x28])),
    /不是严格 UTF-8/u
  );
  assert.throws(
    () => parseZiweiHkoPublicEndpointObservationJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    /重复对象键/u
  );
  assert.throws(
    () => parseZiweiHkoPublicEndpointObservationJsonBytes(new Proxy(Uint8Array.from([0x7b, 0x7d]), {})),
    /不接受 Proxy 字节/u
  );
});

test("strict byte parser rejects shared and resizable backing buffers when available", () => {
  if (typeof SharedArrayBuffer === "function") {
    const shared = new Uint8Array(new SharedArrayBuffer(2));
    shared.set([0x7b, 0x7d]);
    assert.throws(
      () => parseZiweiHkoPublicEndpointObservationJsonBytes(shared),
      /不接受 SharedArrayBuffer/u
    );
  }
  const resizable = new ArrayBuffer(2, { maxByteLength: 4 });
  if (resizable.resizable === true) {
    const view = new Uint8Array(resizable);
    view.set([0x7b, 0x7d]);
    assert.throws(
      () => parseZiweiHkoPublicEndpointObservationJsonBytes(view),
      /不接受 resizable ArrayBuffer/u
    );
  }
});

test("strict byte parser reports oversized ASTs with a controlled complexity error", () => {
  const wideArray = Buffer.from(`[${"0,".repeat(100_001)}0]`, "utf8");
  assert.throws(
    () => parseZiweiHkoPublicEndpointObservationJsonBytes(wideArray),
    (reason) => reason?.code === "JSON_TOO_COMPLEX"
  );
});

test("artifact reader rejects hard links and bounded helper rejects input already past the cap", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-hko-observation-"));
  try {
    const artifactPath = path.join(
      tempRoot,
      ...ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH.split("/")
    );
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await copyFile(
      path.resolve(workspaceRoot, ...ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH.split("/")),
      artifactPath
    );
    await link(artifactPath, `${artifactPath}.alias`);
    await assert.rejects(
      ziweiHkoPublicEndpointObservationTestOnly.readObservationArtifact(tempRoot),
      /拒绝符号链接或路径别名/u
    );

    const oversizedPath = path.join(tempRoot, "oversized.bin");
    await writeFile(oversizedPath, Buffer.alloc(9, 0x61));
    const handle = await open(oversizedPath, "r");
    try {
      await assert.rejects(
        ziweiHkoPublicEndpointObservationTestOnly.readBoundedHandle(handle, 8),
        /读取时超过上限/u
      );
    } finally {
      await handle.close();
    }
  } finally {
    await removeTempRoot(tempRoot);
  }
});

test("artifact reader rejects directory links, post-open growth and post-read path replacement", async () => {
  const sourceArtifact = path.resolve(
    workspaceRoot,
    ...ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH.split("/")
  );

  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-hko-observation-link-"));
  try {
    const realContent = path.join(linkedRoot, "real-content");
    const realArtifact = path.join(realContent, "system-admission", path.basename(sourceArtifact));
    await mkdir(path.dirname(realArtifact), { recursive: true });
    await copyFile(sourceArtifact, realArtifact);
    await symlink(realContent, path.join(linkedRoot, "content"), "junction");
    await assert.rejects(
      ziweiHkoPublicEndpointObservationTestOnly.readObservationArtifact(linkedRoot),
      (reason) => reason?.code === "DIRECTORY_CHAIN_INVALID"
    );
  } finally {
    await removeTempRoot(linkedRoot);
  }

  const growthRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-hko-observation-growth-"));
  try {
    const artifactPath = path.join(
      growthRoot,
      ...ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH.split("/")
    );
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await copyFile(sourceArtifact, artifactPath);
    await assert.rejects(
      ziweiHkoPublicEndpointObservationTestOnly.readObservationArtifact(growthRoot, {
        async afterOpenBeforeRead({ absolutePath }) {
          await writeFile(absolutePath, Buffer.alloc(1_000_001, 0x61));
        }
      }),
      (reason) => reason?.code === "FILE_SIZE_INVALID"
    );
  } finally {
    await removeTempRoot(growthRoot);
  }

  const replacementRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-hko-observation-replace-"));
  try {
    const artifactPath = path.join(
      replacementRoot,
      ...ZIWEI_HKO_PUBLIC_ENDPOINT_OBSERVATION_PATH.split("/")
    );
    const replacementPath = `${artifactPath}.replacement`;
    const displacedPath = `${artifactPath}.displaced`;
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await copyFile(sourceArtifact, artifactPath);
    await copyFile(sourceArtifact, replacementPath);
    await assert.rejects(
      ziweiHkoPublicEndpointObservationTestOnly.readObservationArtifact(replacementRoot, {
        async afterBytesRead() {
          await rename(artifactPath, displacedPath);
          await rename(replacementPath, artifactPath);
        }
      }),
      (reason) => reason?.code === "ENDPOINT_CHANGED"
    );
  } finally {
    await removeTempRoot(replacementRoot);
  }
});

test("object input rejects accessors without invoking them plus Proxy, Symbol, sparse and non-canonical numbers", async () => {
  const getterObservation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  let getterInvoked = false;
  Object.defineProperty(getterObservation.rightsBoundary, "workRightsEstablished", {
    enumerable: true,
    configurable: true,
    get() {
      getterInvoked = true;
      throw new Error("must not run");
    }
  });
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, getterObservation),
    /必须是可枚举 data property/u
  );
  assert.equal(getterInvoked, false);

  const proxyObservation = new Proxy(
    clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot)),
    {}
  );
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, proxyObservation),
    /只接受非 Proxy JSON 值/u
  );

  const symbolObservation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  symbolObservation[Symbol("forged")] = true;
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, symbolObservation),
    /必须是普通无 Symbol 对象/u
  );

  const sparseObservation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  delete sparseObservation.resources[0];
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, sparseObservation),
    /不接受稀疏数组/u
  );

  const negativeZeroObservation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  negativeZeroObservation.resources[0].observedBytes = -0;
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, negativeZeroObservation),
    /含非规范数字/u
  );

  const infiniteObservation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  infiniteObservation.resources[0].observedBytes = Number.POSITIVE_INFINITY;
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, infiniteObservation),
    /含非规范数字/u
  );
});

test("object input rejects __proto__ and non-index numeric array-key canonical collisions", async () => {
  const protoObservation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  Object.defineProperty(protoObservation, "__proto__", {
    value: { publicDeploymentAuthorized: true },
    enumerable: true,
    configurable: true,
    writable: true
  });
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, protoObservation),
    /调用方 HKO observation 与持久化工件不一致/u
  );

  const numericKeyObservation = clone(await readZiweiHkoPublicEndpointObservation(workspaceRoot));
  Object.defineProperty(numericKeyObservation.resources, "4294967295", {
    value: "forged",
    enumerable: true,
    configurable: true,
    writable: true
  });
  await assert.rejects(
    verifyZiweiHkoPublicEndpointObservation(workspaceRoot, numericKeyObservation),
    /数组含额外属性/u
  );
});

test("self-recomputed digests cannot promote rights, redistribution or public inclusion", async () => {
  const mutations = [
    (x) => { x.rightsBoundary.applicableTermsResolved = true; },
    (x) => { x.rightsBoundary.termsVersionFrozen = true; },
    (x) => { x.rightsBoundary.workRightsEstablished = true; },
    (x) => { x.rightsBoundary.editionRightsEstablished = true; },
    (x) => { x.rightsBoundary.carrierRightsEstablished = true; },
    (x) => { x.rightsBoundary.redistributionAuthorized = true; },
    (x) => { x.rightsBoundary.publicRepositoryBodyInclusionAuthorized = true; },
    (x) => { x.rightsBoundary.publicBuildInclusionAuthorized = true; },
    (x) => { x.rightsBoundary.rightsLegalConclusion = "established"; }
  ];
  for (const mutate of mutations) await expectMismatch(mutate, { recomputeDigest: true });
});

test("self-recomputed digests cannot promote provenance, freshness, mutation or authority", async () => {
  const mutations = [
    (x) => { x.integrityBoundary.futureRemoteFreshnessEstablished = true; },
    (x) => { x.integrityBoundary.networkProvenanceEstablished = true; },
    (x) => { x.integrityBoundary.publisherAuthenticityEstablished = true; },
    (x) => { x.integrityBoundary.digestIsDigitalSignature = true; },
    (x) => { x.integrityBoundary.crossFileAtomicSnapshot = true; },
    (x) => { x.integrityBoundary.mutationEpochAvailable = true; },
    (x) => { x.integrityBoundary.intervalMutationExcluded = true; },
    (x) => { x.integrityBoundary.abaExcluded = true; },
    (x) => { x.authorityBoundary.contentTruthEstablished = true; },
    (x) => { x.authorityBoundary.ziweiRuleTruthEstablished = true; },
    (x) => { x.authorityBoundary.sourceBundleComplete = true; },
    (x) => { x.authorityBoundary.rightsBundleComplete = true; },
    (x) => { x.authorityBoundary.expertReviewBundleComplete = true; },
    (x) => { x.authorityBoundary.releaseReady = true; },
    (x) => { x.authorityBoundary.publicDeploymentAuthorized = true; },
    (x) => { x.authorityBoundary.expertClaimsAuthorized = true; }
  ];
  for (const mutate of mutations) await expectMismatch(mutate, { recomputeDigest: true });
});

test("semantic validator directly rejects every capture, rights, integrity and authority promotion", async () => {
  const sourceResult = await verifyZiweiHkoCalendarSourceEvidence(workspaceRoot);
  const promotionMutations = [
    (x) => { x.captureBoundary.automaticDecompressionMechanicallyVerified = true; },
    (x) => { x.captureBoundary.contentEncodingCaptured = true; },
    (x) => { x.captureBoundary.liveRunResponseBodiesPersisted = true; },
    (x) => { x.captureBoundary.captureExecutionReceiptStored = true; },
    (x) => { x.captureBoundary.remoteCaptureMechanicallyVerified = true; },
    (x) => { x.captureBoundary.redirectChainCaptured = true; },
    (x) => { x.captureBoundary.requestedToFinalUrlBindingEstablished = true; },
    (x) => { x.captureBoundary.wireBytesCaptured = true; },
    (x) => { x.captureBoundary.tlsPeerCertificateCaptured = true; },
    (x) => { x.captureBoundary.credentialUsed = true; },
    (x) => { x.captureBoundary.loginOrProtectedBackendUsed = true; },
    (x) => { x.rightsBoundary.applicableTermsResolved = true; },
    (x) => { x.rightsBoundary.termsVersionFrozen = true; },
    (x) => { x.rightsBoundary.workRightsEstablished = true; },
    (x) => { x.rightsBoundary.editionRightsEstablished = true; },
    (x) => { x.rightsBoundary.carrierRightsEstablished = true; },
    (x) => { x.rightsBoundary.preExistingCandidateRawBodiesStorageRightsEstablished = true; },
    (x) => { x.rightsBoundary.redistributionAuthorized = true; },
    (x) => { x.rightsBoundary.publicRepositoryBodyInclusionAuthorized = true; },
    (x) => { x.rightsBoundary.publicBuildInclusionAuthorized = true; },
    (x) => { x.integrityBoundary.futureRemoteFreshnessEstablished = true; },
    (x) => { x.integrityBoundary.networkProvenanceEstablished = true; },
    (x) => { x.integrityBoundary.publisherAuthenticityEstablished = true; },
    (x) => { x.integrityBoundary.digestIsDigitalSignature = true; },
    (x) => { x.integrityBoundary.crossFileAtomicSnapshot = true; },
    (x) => { x.integrityBoundary.mutationEpochAvailable = true; },
    (x) => { x.integrityBoundary.intervalMutationExcluded = true; },
    (x) => { x.integrityBoundary.abaExcluded = true; },
    (x) => { x.authorityBoundary.contentTruthEstablished = true; },
    (x) => { x.authorityBoundary.ziweiRuleTruthEstablished = true; },
    (x) => { x.authorityBoundary.sourceBundleComplete = true; },
    (x) => { x.authorityBoundary.rightsBundleComplete = true; },
    (x) => { x.authorityBoundary.expertReviewBundleComplete = true; },
    (x) => { x.authorityBoundary.releaseReady = true; },
    (x) => { x.authorityBoundary.publicDeploymentAuthorized = true; },
    (x) => { x.authorityBoundary.expertClaimsAuthorized = true; }
  ];
  for (const mutate of promotionMutations) {
    await expectSemanticError(sourceResult, mutate, "AUTHORITY_PROMOTION_FORBIDDEN");
  }

  const invalidClaimMutations = [
    (x) => { x.captureBoundary.automaticDecompressionClaimedByOperator = false; },
    (x) => { x.captureBoundary.httpClientDeliveredBodyHashOperatorRecorded = false; },
    (x) => { x.rightsBoundary.permissionLanguageObservedNotAdjudicated = false; },
    (x) => { x.rightsBoundary.hkoPriorWrittenAuthorisationLanguageObserved = false; },
    (x) => { x.rightsBoundary.termsApplicabilityConflictOrAmbiguityObserved = false; },
    (x) => { x.rightsBoundary.rightsLegalConclusion = "established"; },
    (x) => { x.integrityBoundary.operatorRecordedPointInTimeRemoteBodyHashObservation = false; },
    (x) => { x.integrityBoundary.pointInTimeOnly = false; }
  ];
  for (const mutate of invalidClaimMutations) {
    await expectSemanticError(sourceResult, mutate, "OBSERVATION_INVALID");
  }
});

test("semantic validator directly rejects source, candidate, resource and terms identity drift", async () => {
  const sourceResult = await verifyZiweiHkoCalendarSourceEvidence(workspaceRoot);
  const cases = [
    [(x) => { x.sourceCandidateArtifact.sha256 = "0".repeat(64); }, "SOURCE_CANDIDATE_DRIFT"],
    [(x) => { x.candidateCrossCheck.candidateId = "candidate:alias"; }, "OBSERVATION_INVALID"],
    [(x) => { x.candidateCrossCheck.subjectId = "ziwei.rules.year-and-day-boundaries"; }, "OBSERVATION_INVALID"],
    [(x) => { x.resources[0].requestedUrl = "https://example.invalid/calendar.csv"; }, "OBSERVATION_INVALID"],
    [(x) => { x.resources[0].observedSha256 = "0".repeat(64); }, "REMOTE_BODY_MISMATCH"],
    [(x) => { x.resources.reverse(); }, "OBSERVATION_INVALID"],
    [(x) => { x.runCompletedAt = "2026-08-29T12:37:27.145Z"; }, "OBSERVATION_INVALID"],
    [(x) => { x.termsObservation.requestedUrl = "https://example.invalid/terms"; }, "OBSERVATION_INVALID"],
    [(x) => { x.termsObservation.versionObserved = "1.3"; }, "OBSERVATION_INVALID"]
  ];
  for (const [mutate, expectedCode] of cases) {
    await expectSemanticError(sourceResult, mutate, expectedCode);
  }
});

test("candidate, resource and terms identities cannot be rewritten", async () => {
  const mutations = [
    (x) => { x.sourceCandidateArtifact.sha256 = "0".repeat(64); },
    (x) => { x.candidateCrossCheck.candidateId = "candidate:alias"; },
    (x) => { x.candidateCrossCheck.subjectId = "ziwei.rules.year-and-day-boundaries"; },
    (x) => { x.resources[0].requestedUrl = "https://example.invalid/calendar.csv"; },
    (x) => { x.resources[0].observedSha256 = "0".repeat(64); },
    (x) => { x.resources.reverse(); },
    (x) => { x.runCompletedAt = "2026-08-29T12:37:27.145Z"; },
    (x) => { x.termsObservation.requestedUrl = "https://example.invalid/terms"; },
    (x) => { x.termsObservation.versionObserved = "1.3"; },
    (x) => { x.rightsBoundary.termsApplicabilityConflictOrAmbiguityObserved = false; }
  ];
  for (const mutate of mutations) await expectMismatch(mutate, { recomputeDigest: true });
});

test("verified result uses an unforgeable module brand and is recursively frozen", async () => {
  const result = await verifyZiweiHkoPublicEndpointObservation(workspaceRoot);
  assert.equal(isVerifiedZiweiHkoPublicEndpointObservation(result), true);
  assert.equal(isVerifiedZiweiHkoPublicEndpointObservation({ ...result }), false);
  assert.equal(isVerifiedZiweiHkoPublicEndpointObservation(result.observation), false);
  assertRecursivelyFrozen(result);
});
