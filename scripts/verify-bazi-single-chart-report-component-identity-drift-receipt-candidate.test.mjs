import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
  BaziSingleChartReportComponentIdentityDriftReceiptCandidateError,
  baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly,
  buildBaziSingleChartReportComponentIdentityDriftReceiptCandidate,
  computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest,
  isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate,
  loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate,
  serializeBaziSingleChartReportComponentIdentityDriftReceiptCandidate
} from "./bazi-single-chart-report-component-identity-drift-receipt-candidate-lib.mjs";

const testPath = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(testPath);
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const cliPath = path.join(
  scriptsDirectory,
  "verify-bazi-single-chart-report-component-identity-drift-receipt-candidate.mjs"
);
const OK_PREFIX =
  "BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_OK ";
const FAILED_PREFIX =
  "BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_FAILED ";

const fixedPaths = [
  baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.FORMAL_MANIFEST.path,
  baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.REPORT_SOURCE.path,
  baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.FROZEN_GOLDEN.path,
  BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
];

async function withFixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-report-drift-receipt-"));
  try {
    for (const relativePath of fixedPaths) {
      const destination = path.join(root, ...relativePath.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(workspaceRoot, ...relativePath.split("/")), destination);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function expectCode(code) {
  return (error) => {
    assert.ok(error instanceof BaziSingleChartReportComponentIdentityDriftReceiptCandidateError);
    assert.equal(error.code, code);
    return true;
  };
}

test("builder and loader return exact deeply frozen private candidate receipts", async () => {
  const built = await buildBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  const loaded = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  assert.deepEqual(loaded, built);
  assert.equal(isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(built), false);
  assert.equal(isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(loaded), true);
  assert.equal(Object.isFrozen(loaded), true);
  assert.equal(Object.isFrozen(loaded.scope.reportComponent.driftEntries[0]), true);
});

test("persisted bytes, deterministic serialization and receipt digest are exact", async () => {
  const loaded = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  const raw = await readFile(path.join(
    workspaceRoot,
    ...BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH.split("/")
  ));
  assert.equal(raw.toString("utf8"), serializeBaziSingleChartReportComponentIdentityDriftReceiptCandidate(loaded));
  assert.equal(
    computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest(loaded),
    loaded.receiptDigest
  );
  assert.equal(raw.length, baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(
    loaded.receiptDigest,
    baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.EXPECTED_PERSISTED.receiptDigest
  );
});

test("receipt pins the formal v2.2 baseline, current report source, changed component digest and unchanged golden", async () => {
  const receipt = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  const { FORMAL_MANIFEST, REPORT_SOURCE, FROZEN_GOLDEN, REPORT_COMPONENT } =
    baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly;
  assert.deepEqual(receipt.scope.formalManifest, {
    currentAfterComponentChange: false,
    fullLoaderReplayPerformed: false,
    manifestDigest: FORMAL_MANIFEST.manifestDigest,
    manifestId: FORMAL_MANIFEST.manifestId,
    manifestRevision: FORMAL_MANIFEST.manifestRevision,
    path: FORMAL_MANIFEST.path,
    privateBrandCurrent: false,
    rawBytes: FORMAL_MANIFEST.rawBytes,
    rawSha256: FORMAL_MANIFEST.rawSha256
  });
  assert.equal(receipt.scope.reportComponent.persistedDigest, REPORT_COMPONENT.persistedDigest);
  assert.equal(receipt.scope.reportComponent.currentObservedDigest, REPORT_COMPONENT.currentObservedDigest);
  assert.equal(receipt.scope.reportComponent.digestChanged, true);
  assert.deepEqual(receipt.scope.reportComponent.driftEntries, [{
    currentRawBytes: REPORT_SOURCE.currentRawBytes,
    currentSha256: REPORT_SOURCE.currentSha256,
    failureCode: "COMPONENT_FILE_IDENTITY_DRIFT",
    path: REPORT_SOURCE.path,
    persistedRawBytes: REPORT_SOURCE.persistedRawBytes,
    persistedSha256: REPORT_SOURCE.persistedSha256
  }]);
  assert.equal(receipt.scope.frozenGolden.expectedSha256, FROZEN_GOLDEN.sha256);
  assert.equal(receipt.scope.frozenGolden.currentSha256, FROZEN_GOLDEN.sha256);
  assert.equal(receipt.scope.frozenGolden.unchanged, true);
});

test("receipt is only a sufficient blocking observation and does not claim unique or full-manifest closure", async () => {
  const receipt = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  assert.deepEqual(receipt.blockingRelationship, {
    blocksCallingFormalV22Current: true,
    blocksCurrentReportComponentIdentityClosure: true,
    code: "COMPONENT_FILE_IDENTITY_DRIFT",
    otherFormalComponentIdentitiesAssessedByThisReceipt: false,
    path: "packages/research-export/src/single-chart-report.ts",
    uniqueBlockerClaimed: false
  });
  assert.equal(receipt.observationBoundary.currentFullDomainManifestEstablished, false);
  assert.equal(receipt.observationBoundary.currentFullComponentSetObserved, false);
  assert.equal(receipt.observationBoundary.persistedAsDomainManifest, false);
  assert.equal(receipt.observationBoundary.activeAdmissionEffect, "none");
});

test("governance, snapshot, owner, admission and authority accounts remain red", async () => {
  const receipt = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  assert.deepEqual(receipt.releaseGovernance, {
    migrationId: null,
    releaseIdentity: "legacy-v13",
    targetSchema: 13
  });
  assert.equal(receipt.gateSummary.bindingFrozenVerified, 0);
  assert.equal(receipt.gateSummary.bindingRequired, 12);
  assert.equal(receipt.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(receipt.gateSummary.independentExpertsRequired, 2);
  assert.equal(receipt.gateSummary.currentAdmissionReplayPerformedByThisReceipt, false);
  assert.equal(receipt.observationBoundary.sameHeldBufferPerFile, true);
  assert.equal(receipt.observationBoundary.endpointObservationOnly, true);
  assert.equal(receipt.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(receipt.observationBoundary.mutationEpochAvailableForSchema13, false);
  assert.equal(receipt.observationBoundary.mutationEpochReceipt, null);
  assert.equal(receipt.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(receipt.observationBoundary.abaExcluded, false);
  assert.deepEqual(receipt.ownerDecisionBoundary, {
    manifestRebindAuthorized: false,
    manifestResignAuthorized: false,
    ownerAcceptanceVerified: false,
    ownerAttributionVerified: false,
    ownerDecisionsRecorded: 0,
    releaseCandidateFreezeAuthorized: false
  });
  assert.equal(Object.values(receipt.authorityBoundary).every((value) => value === false), true);
  assert.deepEqual(receipt.runtimeTrustBoundary, {
    cliOutputTrustedAttestation: false,
    hiddenPreloadExcluded: false,
    loaderIdentityEstablished: false,
    mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true,
    nodeRuntimeIdentityEstablished: false,
    runtimeLauncherIdentityEstablished: false,
    visiblePreloadGuardIsSecurityBoundary: false
  });
});

test("a structural clone cannot acquire the private candidate brand", async () => {
  const receipt = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  assert.equal(isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(structuredClone(receipt)), false);
});

test("post-import WeakSet prototype poisoning cannot forge or suppress the private candidate brand", async () => {
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  WeakSet.prototype.add = function poisonedAdd() { return this; };
  WeakSet.prototype.has = function poisonedHas() { return true; };
  try {
    const receipt = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
    assert.equal(isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(receipt), true);
    assert.equal(isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(Object.freeze({})), false);
  } finally {
    WeakSet.prototype.add = originalAdd;
    WeakSet.prototype.has = originalHas;
  }
});

test("current report source drift fails closed", async () => {
  await withFixture(async (root) => {
    const relativePath = baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.REPORT_SOURCE.path;
    const target = path.join(root, ...relativePath.split("/"));
    await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n") ]));
    await assert.rejects(
      () => buildBaziSingleChartReportComponentIdentityDriftReceiptCandidate(root),
      expectCode("CURRENT_REPORT_SOURCE_CHANGED")
    );
  });
});

test("frozen golden drift fails closed", async () => {
  await withFixture(async (root) => {
    const relativePath = baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.FROZEN_GOLDEN.path;
    const target = path.join(root, ...relativePath.split("/"));
    await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n") ]));
    await assert.rejects(
      () => buildBaziSingleChartReportComponentIdentityDriftReceiptCandidate(root),
      expectCode("FROZEN_GOLDEN_DRIFT")
    );
  });
});

test("formal v2.2 historical artifact drift fails closed", async () => {
  await withFixture(async (root) => {
    const relativePath = baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly.FORMAL_MANIFEST.path;
    const target = path.join(root, ...relativePath.split("/"));
    await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n") ]));
    await assert.rejects(
      () => buildBaziSingleChartReportComponentIdentityDriftReceiptCandidate(root),
      expectCode("FORMAL_MANIFEST_RAW_DRIFT")
    );
  });
});

test("a re-digested semantic receipt mutation cannot replace the exact persisted candidate bytes", async () => {
  await withFixture(async (root) => {
    const relativePath = BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH;
    const target = path.join(root, ...relativePath.split("/"));
    const candidate = JSON.parse(await readFile(target, "utf8"));
    candidate.authorityBoundary.releaseReady = true;
    candidate.receiptDigest = computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest(candidate);
    await writeFile(target, serializeBaziSingleChartReportComponentIdentityDriftReceiptCandidate(candidate));
    await assert.rejects(
      () => loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(root),
      expectCode("RECEIPT_RAW_DRIFT")
    );
  });
});

test("non-deterministic persisted receipt whitespace changes the pinned raw identity and fails closed", async () => {
  await withFixture(async (root) => {
    const relativePath = BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH;
    const target = path.join(root, ...relativePath.split("/"));
    await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n") ]));
    await assert.rejects(
      () => loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(root),
      expectCode("RECEIPT_RAW_DRIFT")
    );
  });
});

test("canonical digest rejects non-canonical values", () => {
  assert.throws(
    () => computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest({ value: -0 }),
    expectCode("NON_CANONICAL_JSON")
  );
  assert.throws(
    () => computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest(Object.create(null)),
    expectCode("NON_CANONICAL_JSON")
  );
  const aliased = {};
  assert.throws(
    () => computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest({ left: aliased, right: aliased }),
    expectCode("NON_CANONICAL_JSON")
  );
});

test("CLI emits the narrow candidate observation and all authority gates remain red", () => {
  const result = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.startsWith(OK_PREFIX), true);
  const payload = JSON.parse(result.stdout.slice(OK_PREFIX.length));
  assert.equal(payload.candidateOnly, true);
  assert.equal(payload.persistedAsDomainManifest, false);
  assert.equal(payload.activeAdmissionEffect, "none");
  assert.equal(payload.formalManifestCurrent, false);
  assert.equal(payload.failureCode, "COMPONENT_FILE_IDENTITY_DRIFT");
  assert.equal(payload.driftEntryCount, 1);
  assert.equal(payload.frozenGoldenUnchanged, true);
  assert.equal(payload.currentFullDomainManifestEstablished, false);
  assert.equal(payload.ownerDecisionsRecorded, 0);
  assert.equal(payload.manifestRebindAuthorized, false);
  assert.equal(payload.manifestResignAuthorized, false);
  assert.equal(payload.releaseReady, false);
  assert.equal(payload.publicDeploymentAuthorized, false);
  assert.equal(payload.expertClaimsAuthorized, false);
  assert.equal(payload.releaseIdentity, "legacy-v13");
  assert.equal(payload.targetSchema, 13);
  assert.equal(payload.migrationId, null);
  assert.equal(result.stdout.includes("driftEntries"), false);
});

test("CLI rejects operands and preload environments without leaking paths", () => {
  const extraArgument = spawnSync(process.execPath, [cliPath, "unexpected"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(extraArgument.status, 1);
  assert.equal(extraArgument.stdout, "");
  assert.equal(extraArgument.stderr, `${FAILED_PREFIX}ARGUMENTS_FORBIDDEN\n`);

  const nodeOptions = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "--trace-warnings" }
  });
  assert.equal(nodeOptions.status, 1);
  assert.equal(nodeOptions.stdout, "");
  assert.equal(nodeOptions.stderr, `${FAILED_PREFIX}PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
  assert.equal(nodeOptions.stderr.includes(workspaceRoot), false);
});

test("importing the CLI is side-effect free", () => {
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(new URL(`file:///${cliPath.replaceAll("\\", "/")}`).href)})`],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "" }
    }
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});
