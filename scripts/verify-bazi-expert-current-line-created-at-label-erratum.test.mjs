import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BAZI_EXPERT_CURRENT_LINE_CREATED_AT_LABEL_ERRATUM_RELATIVE_PATH,
  baziExpertCurrentLineCreatedAtLabelErratumTestOnly as testOnly,
  buildCurrentBaziExpertCurrentLineCreatedAtLabelErratum,
  computeBaziExpertCurrentLineCreatedAtLabelErratumDigest,
  getBaziExpertCurrentLineCreatedAtLabelErratumSummary,
  isVerifiedBaziExpertCurrentLineCreatedAtLabelErratum,
  loadBaziExpertCurrentLineCreatedAtLabelErratum,
  serializeBaziExpertCurrentLineCreatedAtLabelErratum,
  verifyBaziExpertCurrentLineCreatedAtLabelErratum
} from "./bazi-expert-current-line-created-at-label-erratum-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(HERE, "verify-bazi-expert-current-line-created-at-label-erratum.mjs");
const ARTIFACT = path.join(ROOT, ...BAZI_EXPERT_CURRENT_LINE_CREATED_AT_LABEL_ERRATUM_RELATIVE_PATH.split("/"));
const temporaryRoots = [];

function mutableCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function refreshDigest(value) {
  value.erratumDigest = computeBaziExpertCurrentLineCreatedAtLabelErratumDigest(value);
  return value;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function cleanEnvironment(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return env;
}

async function makeWorkspaceCopy() {
  const root = await mkdtemp(path.join(tmpdir(), "hakimi-bazi-created-at-erratum-"));
  temporaryRoots.push(root);
  const relativePaths = [
    testOnly.OLD_EXPERT_CHILD.path,
    testOnly.BAZI_SUCCESSOR_V1.path,
    testOnly.FOUR_SYSTEM_V28.path,
    testOnly.FOUR_SYSTEM_V23.path,
    testOnly.FOUR_SYSTEM_V24.path,
    BAZI_EXPERT_CURRENT_LINE_CREATED_AT_LABEL_ERRATUM_RELATIVE_PATH
  ];
  for (let index = 0; index < relativePaths.length; index += 1) {
    const relativePath = relativePaths[index];
    const source = path.join(ROOT, ...relativePath.split("/"));
    const target = path.join(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  return root;
}

test.after(async () => {
  for (let index = 0; index < temporaryRoots.length; index += 1) {
    await rm(temporaryRoots[index], { recursive: true, force: true });
  }
});

test("persisted erratum has exact raw identity, self digest, private brand, and actual deep freeze", async () => {
  const bytes = await readFile(ARTIFACT);
  assert.equal(bytes.byteLength, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(sha256(bytes), testOnly.EXPECTED_PERSISTED.rawSha256);
  const verified = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  assert.equal(isVerifiedBaziExpertCurrentLineCreatedAtLabelErratum(verified), true);
  assert.equal(
    verified.erratumDigest,
    computeBaziExpertCurrentLineCreatedAtLabelErratumDigest(verified)
  );
  assert.equal(Object.isFrozen(verified), true);
  assert.equal(Object.isFrozen(verified.temporalLabelIssues), true);
  assert.equal(Object.isFrozen(verified.temporalLabelIssues[0]), true);
  assert.equal(bytes.toString("utf8"), serializeBaziExpertCurrentLineCreatedAtLabelErratum(verified));
});

test("builder reconstructs exact semantics but cannot mint the persisted private brand", async () => {
  const built = await buildCurrentBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  const loaded = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  assert.equal(
    serializeBaziExpertCurrentLineCreatedAtLabelErratum(built),
    serializeBaziExpertCurrentLineCreatedAtLabelErratum(loaded)
  );
  assert.equal(isVerifiedBaziExpertCurrentLineCreatedAtLabelErratum(built), false);
  assert.equal(isVerifiedBaziExpertCurrentLineCreatedAtLabelErratum(mutableCopy(loaded)), false);
  assert.throws(
    () => getBaziExpertCurrentLineCreatedAtLabelErratumSummary(mutableCopy(loaded)),
    (reason) => reason?.code === "PRIVATE_BRAND_REQUIRED"
  );
});

test("main binding inventory is exact three and supplementary inversion evidence is exact two", async () => {
  const value = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  assert.deepEqual(
    value.boundArtifacts.map((entry) => entry.path),
    [testOnly.OLD_EXPERT_CHILD.path, testOnly.BAZI_SUCCESSOR_V1.path, testOnly.FOUR_SYSTEM_V28.path]
  );
  assert.deepEqual(
    value.additionalIssueEvidence.map((entry) => entry.path),
    [testOnly.FOUR_SYSTEM_V23.path, testOnly.FOUR_SYSTEM_V24.path]
  );
  for (const entry of [...value.boundArtifacts, ...value.additionalIssueEvidence]) {
    assert.equal(entry.fullLoaderImportedByErratum, false);
    assert.equal(entry.fullLoaderInvokedByErratum, false);
    assert.match(entry.rawSha256, /^[a-f0-9]{64}$/u);
    assert.match(entry.digest, /^[a-f0-9]{64}$/u);
  }
});

test("both persisted label inversions are explicit without inventing actual chronology", async () => {
  const value = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  assert.equal(value.temporalLabelIssues.length, 2);
  for (const issue of value.temporalLabelIssues) {
    assert.equal(Date.parse(issue.parentCreatedAtLabel) > Date.parse(issue.consumerCreatedAtLabel), true);
    assert.equal(issue.parentLabelLaterThanConsumerLabel, true);
    assert.equal(issue.chronologyMeaningWithdrawn, true);
    assert.equal(issue.correctedParentCreatedAt, null);
    assert.equal(issue.actualCreationOrderEstablished, false);
    assert.equal(issue.causeEstablished, false);
  }
  assert.equal(value.temporalLabelIssues[0].parentLabelLaterThanErratumUpperBoundOnSameUntrustedClock, true);
  assert.equal(value.temporalLabelIssues[1].parentLabelLaterThanErratumUpperBoundOnSameUntrustedClock, false);
});

test("erratum createdAt is bounded only by the same untrusted local clock", async () => {
  const value = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  assert.equal(value.createdAt, testOnly.CREATED_AT);
  assert.equal(
    value.timeBoundary.createdAtUpperBoundObservedOnSameUntrustedLocalClock,
    testOnly.CREATED_AT_UPPER_BOUND
  );
  assert.equal(Date.parse(value.createdAt) <= Date.parse(testOnly.CREATED_AT_UPPER_BOUND), true);
  assert.equal(value.correctedCreatedAt, null);
  assert.equal(value.timeBoundary.trustedTimestampEstablished, false);
  assert.equal(value.timeBoundary.externalTimeAuthorityEstablished, false);
  assert.equal(value.timeBoundary.crossArtifactTemporalOrderEstablished, false);
  assert.equal(value.timeBoundary.filesystemTimestampsUsedAsAuthority, false);
});

test("the erratum does not replace any current endpoint or mutate formal assets", async () => {
  const value = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  assert.deepEqual(value.currentEndpointBoundary, {
    activeAdmissionEffect: "none",
    replacesOldExpertChildAsCurrentEndpoint: false,
    replacesBaziMachineIdentitySuccessorAsCurrentEndpoint: false,
    replacesFourSystemStatusAggregateAsCurrentEndpoint: false,
    formalManifestModified: false,
    centralRegistryModified: false,
    oldFrozenArtifactsModified: false,
    parentBacklinksAdded: false,
    defaultOrRuntimeIntegration: "absent"
  });
});

test("expert counts remain zero and no content, expert, rights, legal, or release authority is promoted", async () => {
  const value = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  assert.deepEqual(value.expertBoundary, {
    realReviewerInstancesVerified: 0,
    independentExpertReviewsVerified: 0,
    independentExpertsRequired: 2,
    identitiesVerified: 0,
    credentialsVerified: 0,
    scopesVerified: 0,
    pairwiseIndependenceAssessments: 0,
    originalOpinionsVerified: 0,
    expertReviewBundleComplete: false,
    countsTowardExpertGate: false
  });
  for (const flag of Object.values(value.authorityBoundary)) assert.equal(flag, false);
  assert.equal(value.releaseGovernance.releaseIdentity, "legacy-v13");
  assert.equal(value.releaseGovernance.targetSchema, 13);
  assert.equal(value.releaseGovernance.migrationId, null);
  assert.equal(value.releaseGovernance.mutationEpochReceipt, null);
});

test("future createdAt is rejected even after self digest recomputation", async () => {
  const candidate = mutableCopy(await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT));
  candidate.createdAt = "2026-09-01T13:09:44.234Z";
  refreshDigest(candidate);
  await assert.rejects(
    verifyBaziExpertCurrentLineCreatedAtLabelErratum(candidate, ROOT),
    (reason) => reason?.code === "FUTURE_CREATED_AT_FORBIDDEN"
  );
});

test("an upper bound moved before createdAt is rejected after self digest recomputation", async () => {
  const candidate = mutableCopy(await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT));
  candidate.timeBoundary.createdAtUpperBoundObservedOnSameUntrustedLocalClock =
    "2026-09-01T13:08:59.999Z";
  refreshDigest(candidate);
  await assert.rejects(
    verifyBaziExpertCurrentLineCreatedAtLabelErratum(candidate, ROOT),
    (reason) => reason?.code === "FUTURE_CREATED_AT_FORBIDDEN"
  );
});

test("a corrected historical instant cannot be invented", async () => {
  const candidate = mutableCopy(await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT));
  candidate.correctedCreatedAt = "2026-09-01T07:17:40.943Z";
  refreshDigest(candidate);
  await assert.rejects(
    verifyBaziExpertCurrentLineCreatedAtLabelErratum(candidate, ROOT),
    (reason) => reason?.code === "CORRECTED_TIME_INVENTION_FORBIDDEN"
  );
});

test("every time-authority promotion fails closed", async (context) => {
  const baseline = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  const fields = [
    "trustedTimestampEstablished",
    "externalTimeAuthorityEstablished",
    "crossArtifactTemporalOrderEstablished",
    "monotonicClockEstablished",
    "notaryReceiptEstablished",
    "filesystemTimestampsUsedAsAuthority"
  ];
  for (const field of fields) {
    await context.test(field, async () => {
      const candidate = mutableCopy(baseline);
      candidate.timeBoundary[field] = true;
      refreshDigest(candidate);
      await assert.rejects(
        verifyBaziExpertCurrentLineCreatedAtLabelErratum(candidate, ROOT),
        (reason) => reason?.code === "TIME_AUTHORITY_PROMOTION_FORBIDDEN"
      );
    });
  }
});

test("every content, expert, rights, legal, and release authority promotion fails closed", async (context) => {
  const baseline = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  for (const field of Object.keys(baseline.authorityBoundary)) {
    await context.test(field, async () => {
      const candidate = mutableCopy(baseline);
      candidate.authorityBoundary[field] = true;
      refreshDigest(candidate);
      await assert.rejects(
        verifyBaziExpertCurrentLineCreatedAtLabelErratum(candidate, ROOT),
        (reason) => reason?.code === "AUTHORITY_PROMOTION_FORBIDDEN"
      );
    });
  }
});

test("unknown fields and temporal-inventory laundering fail closed", async () => {
  const baseline = await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT);
  const unknown = mutableCopy(baseline);
  unknown.unboundClaim = true;
  refreshDigest(unknown);
  await assert.rejects(
    verifyBaziExpertCurrentLineCreatedAtLabelErratum(unknown, ROOT),
    (reason) => reason?.code === "ERRATUM_SEMANTIC_DRIFT"
  );
  const laundered = mutableCopy(baseline);
  laundered.temporalLabelIssues[0].parentCreatedAtLabel =
    laundered.temporalLabelIssues[0].consumerCreatedAtLabel;
  refreshDigest(laundered);
  await assert.rejects(
    verifyBaziExpertCurrentLineCreatedAtLabelErratum(laundered, ROOT),
    (reason) => reason?.code === "TEMPORAL_LABEL_INVERSION_NOT_PRESERVED"
  );
});

test("duplicate JSON keys are rejected by the strict parser", () => {
  assert.throws(
    () => testOnly.parseStrictJson({
      path: "duplicate.json",
      bytes: Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8")
    }),
    (reason) => typeof reason?.code === "string"
  );
});

test("self-digest tampering fails closed", async () => {
  const candidate = mutableCopy(await loadBaziExpertCurrentLineCreatedAtLabelErratum(ROOT));
  candidate.erratumDigest = "0".repeat(64);
  await assert.rejects(
    verifyBaziExpertCurrentLineCreatedAtLabelErratum(candidate, ROOT),
    (reason) => reason?.code === "ERRATUM_DIGEST_MISMATCH"
  );
});

test("a bound parent raw-byte drift fails before it can alter the erratum", async () => {
  const workspace = await makeWorkspaceCopy();
  const target = path.join(workspace, ...testOnly.OLD_EXPERT_CHILD.path.split("/"));
  const original = await readFile(target, "utf8");
  await writeFile(target, original.replace(
    '"status": "current_line_mechanical_zero_instance_observation_no_admission_effect"',
    '"status": "current_line_mechanical_zero_instance_observation_no_admission_effect "'
  ), "utf8");
  await assert.rejects(
    loadBaziExpertCurrentLineCreatedAtLabelErratum(workspace),
    (reason) => reason?.code === "BOUND_ARTIFACT_RAW_DRIFT"
  );
});

test("fixed-path CLI succeeds from an unrelated cwd and reports only calibrated red accounts", () => {
  const result = spawnSync(process.execPath, [CLI], {
    cwd: tmpdir(),
    env: cleanEnvironment(),
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^BAZI_EXPERT_CURRENT_LINE_CREATED_AT_LABEL_ERRATUM_OK /u);
  const summary = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")).trim());
  assert.equal(summary.temporalLabelIssuesRecorded, 2);
  assert.equal(summary.correctedCreatedAt, null);
  assert.equal(summary.replacesCurrentEndpoint, false);
  assert.equal(summary.independentExpertReviewsVerified, 0);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
  assert.equal(summary.releaseIdentity, "legacy-v13");
  assert.equal(summary.targetSchema, 13);
  assert.equal(summary.migrationId, null);
  assert.equal(summary.mutationEpochReceipt, null);
  assert.equal(summary.crossArtifactTemporalOrderEstablished, false);
});

test("fixed-path CLI rejects operands and visible preload environment", () => {
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
