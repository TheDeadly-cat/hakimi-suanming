import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH,
  baziExpertCurrentLineZeroInstanceObservationChildV11TestOnly as testOnly,
  buildCurrentBaziExpertCurrentLineZeroInstanceObservationChildV11,
  computeBaziExpertCurrentLineZeroInstanceObservationChildV11Digest,
  getBaziExpertCurrentLineZeroInstanceObservationChildV11Summary,
  isVerifiedBaziExpertCurrentLineZeroInstanceObservationChildV11,
  loadBaziExpertCurrentLineZeroInstanceObservationChildV11,
  serializeBaziExpertCurrentLineZeroInstanceObservationChildV11,
  verifyBaziExpertCurrentLineZeroInstanceObservationChildV11
} from "./bazi-expert-current-line-zero-instance-observation-child-v1-1-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(HERE, "verify-bazi-expert-current-line-zero-instance-observation-child-v1-1.mjs");
const LIB = path.join(HERE, "bazi-expert-current-line-zero-instance-observation-child-v1-1-lib.mjs");
const ERRATUM_LIB = path.join(HERE, "bazi-expert-current-line-created-at-label-erratum-lib.mjs");
const ARTIFACT = path.join(
  ROOT,
  ...BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_V1_1_RELATIVE_PATH.split("/")
);
const temporaryRoots = [];

function mutableCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function refreshDigest(value) {
  value.childDigest = computeBaziExpertCurrentLineZeroInstanceObservationChildV11Digest(value);
  return value;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function cleanEnvironment() {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return env;
}

async function makeOldV1WorkspaceCopy() {
  const root = await mkdtemp(path.join(tmpdir(), "hakimi-bazi-expert-v11-old-v1-"));
  temporaryRoots.push(root);
  const source = path.join(ROOT, ...testOnly.OLD_V1.path.split("/"));
  const target = path.join(root, ...testOnly.OLD_V1.path.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  return { root, target };
}

test.after(async () => {
  for (let index = 0; index < temporaryRoots.length; index += 1) {
    await rm(temporaryRoots[index], { recursive: true, force: true });
  }
});

test("persisted v1.1 child has exact raw/self identity, private brand, and actual deep freeze", async () => {
  const bytes = await readFile(ARTIFACT);
  assert.equal(bytes.byteLength, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(sha256(bytes), testOnly.EXPECTED_PERSISTED.rawSha256);
  const verified = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChildV11(verified), true);
  assert.equal(
    verified.childDigest,
    computeBaziExpertCurrentLineZeroInstanceObservationChildV11Digest(verified)
  );
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(Object.isFrozen(verified.currentParentBrands), true);
  assert.equal(Object.isFrozen(verified.reviewContract.reviewerSeats), true);
  assert.equal(bytes.toString("utf8"), serializeBaziExpertCurrentLineZeroInstanceObservationChildV11(verified));
});

test("builder reconstructs exact semantics but cannot mint the persisted private brand", async () => {
  const built = await buildCurrentBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  const loaded = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.equal(
    serializeBaziExpertCurrentLineZeroInstanceObservationChildV11(built),
    serializeBaziExpertCurrentLineZeroInstanceObservationChildV11(loaded)
  );
  assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChildV11(built), false);
  const clone = mutableCopy(loaded);
  assert.equal(isVerifiedBaziExpertCurrentLineZeroInstanceObservationChildV11(clone), false);
  assert.throws(
    () => getBaziExpertCurrentLineZeroInstanceObservationChildV11Summary(clone),
    (reason) => reason?.code === "PRIVATE_BRAND_REQUIRED"
  );
});

test("the exact three current private brands are readiness v1.9, authority precheck v1, and erratum v1", async () => {
  const value = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.equal(value.currentParentBrands.exactCurrentPrivateBrandsVerified, 3);
  assert.deepEqual(
    [
      value.currentParentBrands.readinessV19.path,
      value.currentParentBrands.authorityPrecheckV1.path,
      value.currentParentBrands.createdAtErratumV1.path
    ],
    [testOnly.READINESS_V19.path, testOnly.AUTHORITY_PRECHECK_V1.path, testOnly.CREATED_AT_ERRATUM_V1.path]
  );
  assert.equal(value.currentParentBrands.readinessV19.exactFullLoaderPrivateBrandVerified, true);
  assert.equal(value.currentParentBrands.authorityPrecheckV1.exactFullLoaderPrivateBrandVerified, true);
  assert.equal(value.currentParentBrands.createdAtErratumV1.exactFullLoaderPrivateBrandVerified, true);
});

test("old v1 is raw+self historical context only and its full loader is absent from the new chain", async () => {
  const value = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.deepEqual(value.historicalPredecessorV1, {
    role: testOnly.OLD_V1.role,
    path: testOnly.OLD_V1.path,
    rawBytes: testOnly.OLD_V1.rawBytes,
    rawSha256: testOnly.OLD_V1.rawSha256,
    childId: testOnly.OLD_V1.childId,
    childDigest: testOnly.OLD_V1.childDigest,
    observedCreatedAtLabel: testOnly.OLD_V1.createdAt,
    correctedCreatedAt: null,
    rawAndSelfDigestVerified: true,
    fullLoaderImportedByThisChild: false,
    fullLoaderInvokedByThisChild: false,
    privateBrandConsumed: false,
    brandCurrent: false,
    chronologyMeaningWithdrawnByErratum: true
  });
  const forbiddenModule = "bazi-expert-current-line-zero-instance-observation-child-lib.mjs";
  const forbiddenLoaderCall =
    /\bloadBaziExpertCurrentLineZeroInstanceObservationChild\s*\(/u;
  for (const sourcePath of [LIB, ERRATUM_LIB]) {
    const source = await readFile(sourcePath, "utf8");
    assert.equal(source.includes(forbiddenModule), false);
    assert.equal(forbiddenLoaderCall.test(source), false);
  }
});

test("two reviewer seats remain vacant with four questions, ten independence factors, and no-winner rules", async () => {
  const value = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.equal(value.reviewContract.reviewerSeats.length, 2);
  assert.deepEqual(value.reviewContract.reviewerSeats.map((seat) => seat.status), ["vacant", "vacant"]);
  assert.equal(value.reviewContract.reviewQuestionIds.length, 4);
  assert.equal(value.reviewContract.independenceFactorIds.length, 10);
  assert.deepEqual(value.reviewContract.noWinnerPolicy, {
    majorityVoteAllowed: false,
    opinionAveragingAllowed: false,
    generatedModelWinnerSelectionAllowed: false,
    unresolvedDisagreementMayBeAdopted: false,
    allowedUnresolvedDisposition: ["defer", "reject"]
  });
});

test("identity, credential, scope, independence, opinion, bundle, and authority-grant counts remain zero", async () => {
  const value = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  const projection = value.currentRepositoryZeroInstanceProjection;
  for (const [field, current] of Object.entries(projection)) {
    if (field.endsWith("Verified") || field === "reviewerSlotsOccupied") assert.equal(current, 0, field);
  }
  assert.equal(projection.projectionIsRealWorldAbsenceAttestation, false);
  assert.equal(projection.realWorldPrivateMaterialExistenceAssessed, false);
  assert.equal(projection.absenceOfPrivateMaterialInRealityClaimed, false);
  assert.equal(value.currentMechanicalGate.bindingFrozenVerified, 0);
  assert.equal(value.currentMechanicalGate.bindingRequired, 12);
  assert.equal(value.currentMechanicalGate.domainExpertReviewsVerified, 0);
  assert.equal(value.currentMechanicalGate.domainExpertsRequired, 2);
  assert.equal(value.currentMechanicalGate.countsTowardExpertGate, false);
});

test("no PII, private dossier, private opinion, or private runtime was read by this child", async () => {
  const value = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.deepEqual(value.materialAccessBoundary, {
    privateDossierArtifactsReadByThisChild: 0,
    privateOpinionFilesReadByThisChild: 0,
    piiBearingArtifactsReadByThisChild: 0,
    realPersonMaterialCollectedByThisChild: 0,
    privateRuntimeEndpointInvokedByThisChild: false,
    personDataPresenceAssessed: false,
    personDerivedDigestExcluded: false,
    realWorldPrivateMaterialExistenceAssessed: false,
    absenceOfPrivateMaterialInRealityClaimed: false,
    safeToPublish: false
  });
});

test("source, rights, carrier, materialization, content, and legal counts remain zero or false", async () => {
  const boundary = (await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT)).sourceRightsBoundary;
  assert.deepEqual(boundary, {
    formalKnowledgeDocuments: 0,
    formalSourceRightsRecords: 0,
    formalSourceCarrierRecords: 0,
    projectCopyMaterializationRecords: 0,
    materializationsVerified: 0,
    verifiedNaturalPersonRightsReviewers: 0,
    rightsLegalReviewsVerified: 0,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    contentTruthEstablished: false,
    rightsLegalConclusionEstablished: false
  });
});

test("formal manifest, central registry, global current endpoint, runtime, and release remain unchanged", async () => {
  const value = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.equal(value.manifestAndEndpointBoundary.currentFullDomainManifestEstablished, false);
  assert.equal(value.manifestAndEndpointBoundary.formalManifestLoadedByThisChild, false);
  assert.equal(value.manifestAndEndpointBoundary.formalManifestModified, false);
  assert.equal(value.manifestAndEndpointBoundary.centralRegistryModified, false);
  assert.equal(value.manifestAndEndpointBoundary.globalCurrentEndpointRegistrationModified, false);
  assert.equal(value.manifestAndEndpointBoundary.thisChildReplacesBaziMachineIdentityEndpoint, false);
  assert.equal(value.manifestAndEndpointBoundary.thisChildReplacesFourSystemStatusEndpoint, false);
  assert.equal(value.manifestAndEndpointBoundary.defaultOrRuntimeIntegration, "absent");
  assert.equal(value.releaseGovernance.releaseIdentity, "legacy-v13");
  assert.equal(value.releaseGovernance.targetSchema, 13);
  assert.equal(value.releaseGovernance.migrationId, null);
  assert.equal(value.observationBoundary.mutationEpochReceipt, null);
  assert.equal(value.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(value.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(value.observationBoundary.abaExcluded, false);
});

test("new createdAt is below a fixed same-untrusted-clock upper bound and does not repair old chronology", async () => {
  const value = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.equal(value.createdAt, testOnly.CREATED_AT);
  assert.equal(
    value.timeBoundary.createdAtUpperBoundObservedOnSameUntrustedLocalClock,
    testOnly.CREATED_AT_UPPER_BOUND
  );
  assert.equal(Date.parse(value.createdAt) <= Date.parse(testOnly.CREATED_AT_UPPER_BOUND), true);
  assert.equal(Date.parse(value.historicalPredecessorV1.observedCreatedAtLabel) > Date.parse(value.createdAt), true);
  assert.equal(value.timeBoundary.predecessorV1ChronologyMeaningWithdrawnByErratum, true);
  assert.equal(value.timeBoundary.predecessorV1CorrectedCreatedAt, null);
  assert.equal(value.timeBoundary.crossArtifactTemporalOrderEstablished, false);
});

test("future createdAt and an upper bound earlier than createdAt fail closed after re-signing", async () => {
  const baseline = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  const future = mutableCopy(baseline);
  future.createdAt = "2026-09-01T13:22:09.884Z";
  refreshDigest(future);
  await assert.rejects(
    verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(future, ROOT),
    (reason) => reason?.code === "FUTURE_CREATED_AT_FORBIDDEN"
  );
  const earlyUpper = mutableCopy(baseline);
  earlyUpper.timeBoundary.createdAtUpperBoundObservedOnSameUntrustedLocalClock =
    "2026-09-01T13:21:29.999Z";
  refreshDigest(earlyUpper);
  await assert.rejects(
    verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(earlyUpper, ROOT),
    (reason) => reason?.code === "FUTURE_CREATED_AT_FORBIDDEN"
  );
});

test("a corrected predecessor time cannot be invented", async () => {
  const candidate = mutableCopy(await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT));
  candidate.historicalPredecessorV1.correctedCreatedAt = "2026-09-01T07:17:40.943Z";
  refreshDigest(candidate);
  await assert.rejects(
    verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(candidate, ROOT),
    (reason) => reason?.code === "CORRECTED_TIME_INVENTION_FORBIDDEN"
  );
});

test("all time-authority promotions fail closed", async (context) => {
  const baseline = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  for (const field of [
    "trustedTimestampEstablished",
    "externalTimeAuthorityEstablished",
    "crossArtifactTemporalOrderEstablished",
    "monotonicClockEstablished",
    "notaryReceiptEstablished",
    "filesystemTimestampsUsedAsAuthority"
  ]) {
    await context.test(field, async () => {
      const candidate = mutableCopy(baseline);
      candidate.timeBoundary[field] = true;
      refreshDigest(candidate);
      await assert.rejects(
        verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(candidate, ROOT),
        (reason) => reason?.code === "TIME_AUTHORITY_PROMOTION_FORBIDDEN"
      );
    });
  }
});

test("expert identity, credential, scope, independence, and opinion instance invention fails closed", async (context) => {
  const baseline = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  for (const field of [
    "reviewerSlotsOccupied",
    "realReviewerInstancesVerified",
    "publicIdentityBindingsVerified",
    "identitiesVerified",
    "credentialsVerified",
    "scopesVerified",
    "pairwiseIndependenceAssessmentsVerified",
    "originalOpinionsVerified",
    "sealedOriginalOpinionsVerified",
    "disagreementInventoriesVerified",
    "expertReviewBundlesVerified",
    "independentExpertReviewsVerified",
    "verifierAuthorityGrantInstancesVerified"
  ]) {
    await context.test(field, async () => {
      const candidate = mutableCopy(baseline);
      candidate.currentRepositoryZeroInstanceProjection[field] = 1;
      refreshDigest(candidate);
      await assert.rejects(
        verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(candidate, ROOT),
        (reason) => reason?.code === "EXPERT_INSTANCE_INVENTION_FORBIDDEN"
      );
    });
  }
});

test("PII and private-material access promotion fails closed", async (context) => {
  const baseline = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  for (const field of [
    "privateDossierArtifactsReadByThisChild",
    "privateOpinionFilesReadByThisChild",
    "piiBearingArtifactsReadByThisChild",
    "realPersonMaterialCollectedByThisChild"
  ]) {
    await context.test(field, async () => {
      const candidate = mutableCopy(baseline);
      candidate.materialAccessBoundary[field] = 1;
      refreshDigest(candidate);
      await assert.rejects(
        verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(candidate, ROOT),
        (reason) => reason?.code === "PRIVATE_MATERIAL_ACCESS_PROMOTION_FORBIDDEN"
      );
    });
  }
  await context.test("privateRuntimeEndpointInvokedByThisChild", async () => {
    const candidate = mutableCopy(baseline);
    candidate.materialAccessBoundary.privateRuntimeEndpointInvokedByThisChild = true;
    refreshDigest(candidate);
    await assert.rejects(
      verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(candidate, ROOT),
      (reason) => reason?.code === "PRIVATE_MATERIAL_ACCESS_PROMOTION_FORBIDDEN"
    );
  });
});

test("every expert, content, rights, legal, admission, and release authority promotion fails closed", async (context) => {
  const baseline = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  for (const field of Object.keys(baseline.authorityBoundary)) {
    await context.test(field, async () => {
      const candidate = mutableCopy(baseline);
      candidate.authorityBoundary[field] = true;
      refreshDigest(candidate);
      await assert.rejects(
        verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(candidate, ROOT),
        (reason) => reason?.code === "AUTHORITY_PROMOTION_FORBIDDEN"
      );
    });
  }
});

test("unknown fields, endpoint replacement, and occupied-seat laundering fail closed", async () => {
  const baseline = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  for (const mutate of [
    (candidate) => { candidate.unboundClaim = true; },
    (candidate) => { candidate.manifestAndEndpointBoundary.globalCurrentEndpointRegistrationModified = true; },
    (candidate) => { candidate.reviewContract.reviewerSeats[0].status = "occupied"; }
  ]) {
    const candidate = mutableCopy(baseline);
    mutate(candidate);
    refreshDigest(candidate);
    await assert.rejects(
      verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(candidate, ROOT),
      (reason) => reason?.code === "CHILD_SEMANTIC_DRIFT"
    );
  }
});

test("duplicate JSON keys are rejected by the strict parser", () => {
  assert.throws(
    () => testOnly.parseStrictJson({
      path: "duplicate.json",
      bytes: Buffer.from('{"schemaVersion":"1.1.0","schemaVersion":"1.1.0"}', "utf8")
    }),
    (reason) => typeof reason?.code === "string"
  );
});

test("self-digest tampering fails closed", async () => {
  const candidate = mutableCopy(await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT));
  candidate.childDigest = "0".repeat(64);
  await assert.rejects(
    verifyBaziExpertCurrentLineZeroInstanceObservationChildV11(candidate, ROOT),
    (reason) => reason?.code === "CHILD_DIGEST_MISMATCH"
  );
});

test("old v1 raw drift fails in the historical-only reader", async () => {
  const { root, target } = await makeOldV1WorkspaceCopy();
  const original = await readFile(target, "utf8");
  await writeFile(target, original.replace(
    '"status": "current_line_mechanical_zero_instance_observation_no_admission_effect"',
    '"status": "current_line_mechanical_zero_instance_observation_no_admission_effect "'
  ), "utf8");
  await assert.rejects(
    testOnly.readOldV1HistoricalContext(root),
    (reason) => reason?.code === "OLD_V1_RAW_DRIFT"
  );
});

test("fixed CLI succeeds from unrelated cwd with zero instances and all authority red", () => {
  const result = spawnSync(process.execPath, [CLI], {
    cwd: tmpdir(),
    env: cleanEnvironment(),
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^BAZI_EXPERT_CURRENT_LINE_ZERO_INSTANCE_OBSERVATION_CHILD_V1_1_OK /u);
  const summary = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")).trim());
  assert.equal(summary.currentPrivateBrandsVerified, 3);
  assert.equal(summary.historicalPredecessorRawSelfVerified, true);
  assert.equal(summary.oldV1FullLoaderImported, false);
  assert.equal(summary.oldV1FullLoaderInvoked, false);
  assert.equal(summary.correctedCreatedAt, null);
  assert.equal(summary.reviewerSeatsVacant, 2);
  assert.equal(summary.realReviewerInstancesVerified, 0);
  assert.equal(summary.identitiesVerified, 0);
  assert.equal(summary.credentialsVerified, 0);
  assert.equal(summary.scopesVerified, 0);
  assert.equal(summary.pairwiseIndependenceAssessmentsVerified, 0);
  assert.equal(summary.originalOpinionsVerified, 0);
  assert.equal(summary.independentExpertReviewsVerified, 0);
  assert.equal(summary.countsTowardExpertGate, false);
  assert.equal(summary.replacesCurrentEndpoint, false);
  assert.equal(summary.contentTruthEstablished, false);
  assert.equal(summary.expertTruthEstablished, false);
  assert.equal(summary.rightsLegalConclusionEstablished, false);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
  assert.equal(summary.releaseIdentity, "legacy-v13");
  assert.equal(summary.targetSchema, 13);
  assert.equal(summary.migrationId, null);
  assert.equal(summary.mutationEpochReceipt, null);
  assert.equal(summary.crossArtifactTemporalOrderEstablished, false);
});

test("fixed CLI rejects operands and visible preload environment", () => {
  const operand = spawnSync(process.execPath, [CLI, "unexpected"], {
    cwd: ROOT,
    env: cleanEnvironment(),
    encoding: "utf8"
  });
  assert.equal(operand.status, 1);
  assert.match(operand.stderr, /ARGUMENTS_FORBIDDEN/u);

  const preload = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    env: { ...cleanEnvironment(), NODE_OPTIONS: "--no-warnings" },
    encoding: "utf8"
  });
  assert.equal(preload.status, 1);
  assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});
