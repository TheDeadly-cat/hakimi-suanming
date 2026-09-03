import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
  ZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateError,
  buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate,
  computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest,
  isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate,
  loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate,
  serializeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate,
  ziweiExpertPromotionBoundaryIdentityDriftReceiptCandidateTestOnly as testOnly
} from "./ziwei-expert-promotion-boundary-identity-drift-receipt-candidate-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const persistedPath = path.resolve(
  workspaceRoot,
  ...ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
    .split("/")
);
const cliPath = path.join(
  scriptsDirectory,
  "verify-ziwei-expert-promotion-boundary-identity-drift-receipt-candidate.mjs"
);
const OK_PREFIX =
  "ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_OK ";
const FAILED_PREFIX =
  "ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_FAILED ";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectCode(code) {
  return (error) => {
    assert.ok(
      error instanceof ZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateError,
      `unexpected ${error?.constructor?.name ?? typeof error} ${error?.code ?? "NO_CODE"}`
    );
    assert.equal(error.code, code);
    return true;
  };
}

function sanitizedEnvironment(extra = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  return { ...environment, ...extra };
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

async function fixturePaths() {
  const manifest = JSON.parse(await readFile(
    path.resolve(workspaceRoot, ...testOnly.FORMAL_MANIFEST.path.split("/")),
    "utf8"
  ));
  const paths = new Set([
    testOnly.FORMAL_MANIFEST.path,
    testOnly.CONTRACT_SOURCE.path,
    testOnly.CONTRACT_TEST.path,
    testOnly.HISTORICAL_BROWSER_CHILD.path,
    ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
  ]);
  for (const component of manifest.components) {
    for (const file of component.files) paths.add(file.path);
  }
  return [...paths];
}

async function withFixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-ziwei-expert-drift-"));
  try {
    for (const relativePath of await fixturePaths()) {
      const destination = path.resolve(root, ...relativePath.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(
        path.resolve(workspaceRoot, ...relativePath.split("/")),
        destination
      );
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("builder is unbranded while the exact persisted loader returns a deeply frozen private receipt", async () => {
  const built = await buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const loaded = await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.deepEqual(loaded, built);
  assert.equal(isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(built), false);
  assert.equal(isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(loaded), true);
  assert.equal(
    isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
      structuredClone(loaded)
    ),
    false
  );
  assertDeepFrozen(loaded);
});

test("persisted raw identity, canonical LF materialization and semantic receipt digest are exact", async () => {
  const loaded = await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const raw = await readFile(persistedPath);
  assert.equal(
    raw.toString("utf8"),
    serializeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(loaded)
  );
  assert.equal(raw.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(loaded.receiptDigest, testOnly.EXPECTED_PERSISTED.receiptDigest);
  assert.equal(
    computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest(loaded),
    loaded.receiptDigest
  );
});

test("one contract source identity fans out to five component digests without claiming five semantic changes", async () => {
  const receipt = await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.deepEqual(receipt.scope.sourceChange, {
    path: testOnly.CONTRACT_SOURCE.path,
    persistedRawBytes: testOnly.CONTRACT_SOURCE.persistedRawBytes,
    persistedRawSha256: testOnly.CONTRACT_SOURCE.persistedRawSha256,
    currentRawBytes: testOnly.CONTRACT_SOURCE.currentRawBytes,
    currentRawSha256: testOnly.CONTRACT_SOURCE.currentRawSha256,
    uniqueRootSourceClaimedForObservedComponentFanout: true
  });
  assert.equal(receipt.manifestDrift.changedComponentCount, 5);
  assert.deepEqual(receipt.manifestDrift.changedComponents, testOnly.COMPONENT_DRIFTS);
  assert.deepEqual(receipt.manifestDrift.unchangedComponentIds, testOnly.UNCHANGED_COMPONENT_IDS);
  assert.equal(receipt.manifestDrift.oneSourceIdentityFansOutToFiveComponentDigests, true);
  assert.equal(receipt.manifestDrift.fiveIndependentSemanticChangesClaimed, false);
  assert.equal(receipt.manifestDrift.uniqueBlockerClaimed, false);
  assert.equal(receipt.manifestDrift.currentCandidateManifestPersisted, false);
  assert.equal(receipt.manifestDrift.manifestRebindOrResignPerformed, false);
});

test("self-attested local reviewer metadata cannot promote either reserved expert state", async () => {
  const receipt = await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.deepEqual(receipt.scope.expertPromotionBoundary, {
    localReviewerIdsEstablishRealIdentityQualificationOrIndependence: false,
    localDoubleReviewedMetadataMayRemainStructural: true,
    expertReviewedRuleReservedUntilExternalVerifiedReceipt: true,
    expertDoubleReviewedProvenanceReservedUntilExternalVerifiedReceipt: true,
    externalVerifiedExpertReceiptSchemaIntegrated: false,
    verifiedExpertReceiptCount: 0
  });
  assert.equal(receipt.gateSummary.bindingFrozenVerified, 0);
  assert.equal(receipt.gateSummary.bindingRequired, 27);
  assert.equal(receipt.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(receipt.gateSummary.independentExpertsRequired, 2);
  assert.equal(receipt.gateSummary.externalVerifiedExpertReceiptsVerified, 0);
  assert.equal(receipt.gateSummary.externalVerifiedExpertReceiptsRequired, 2);
});

test("historical manifest and browser child stay preserved but stale, with no re-sign or browser rerun", async () => {
  const receipt = await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.deepEqual(receipt.manifestDrift.historicalManifest, {
    path: testOnly.FORMAL_MANIFEST.path,
    rawBytes: testOnly.FORMAL_MANIFEST.rawBytes,
    rawSha256: testOnly.FORMAL_MANIFEST.rawSha256,
    manifestId: testOnly.FORMAL_MANIFEST.manifestId,
    manifestDigest: testOnly.FORMAL_MANIFEST.persistedManifestDigest
  });
  assert.equal(receipt.manifestDrift.historicalManifestPreservedUnmodified, true);
  assert.equal(receipt.manifestDrift.historicalManifestMechanicallyCurrent, false);
  assert.deepEqual(receipt.browserObservationDrift.historicalChild, {
    path: testOnly.HISTORICAL_BROWSER_CHILD.path,
    rawBytes: testOnly.HISTORICAL_BROWSER_CHILD.rawBytes,
    rawSha256: testOnly.HISTORICAL_BROWSER_CHILD.rawSha256,
    childId: testOnly.HISTORICAL_BROWSER_CHILD.childId,
    observationDigest: testOnly.HISTORICAL_BROWSER_CHILD.observationDigest
  });
  assert.equal(receipt.browserObservationDrift.historicalChildPreservedUnmodified, true);
  assert.equal(receipt.browserObservationDrift.historicalChildMechanicallyCurrent, false);
  assert.equal(receipt.browserObservationDrift.failureClass, "SOURCE_GRAPH_MISMATCH");
  assert.equal(receipt.browserObservationDrift.uniqueBlockerClaimed, false);
  assert.equal(receipt.browserObservationDrift.browserRerunPerformedByThisReceipt, false);
  assert.equal(receipt.browserObservationDrift.currentBrowserRuntimeEvidenceEstablished, false);
});

test("project context, snapshot, owner, runtime-trust and authority ledgers remain separate and red", async () => {
  const receipt = await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.deepEqual(receipt.releaseGovernance.projectDefaultContext, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    inheritedByZiweiProductIdentity: false
  });
  assert.equal(receipt.releaseGovernance.releaseIdentity, null);
  assert.equal(receipt.releaseGovernance.targetSchema, null);
  assert.equal(receipt.releaseGovernance.migrationId, null);
  assert.equal(receipt.activeAdmissionEffect, "none");
  assert.equal(receipt.ownerDecisionBoundary.ownerDecisionsRecorded, 0);
  assert.ok(Object.values(receipt.ownerDecisionBoundary).every((value) => (
    value === false || value === 0
  )));
  assert.equal(receipt.observationBoundary.sameHeldBufferHashAndParsePerJsonArtifact, true);
  assert.equal(receipt.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(receipt.observationBoundary.mutationEpochAvailable, false);
  assert.equal(receipt.observationBoundary.mutationEpochReceipt, null);
  assert.equal(receipt.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(receipt.observationBoundary.abaExcluded, false);
  assert.equal(receipt.observationBoundary.receiptDigestIsDigitalSignature, false);
  assert.ok(Object.values(receipt.runtimeTrustBoundary).every((value) => (
    value === false || value === true
  )));
  assert.equal(receipt.runtimeTrustBoundary.cliOutputTrustedAttestation, false);
  assert.ok(Object.values(receipt.authorityBoundary).every((value) => value === false));
});

test("re-digested authority, gate, epoch and current-evidence promotions are rejected", async () => {
  const expected = await buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const mutations = [
    (value) => { value.authorityBoundary.expertClaimsAuthorized = true; },
    (value) => { value.gateSummary.independentExpertReviewsVerified = 1; },
    (value) => { value.manifestDrift.historicalManifestMechanicallyCurrent = true; },
    (value) => { value.browserObservationDrift.currentBrowserRuntimeEvidenceEstablished = true; },
    (value) => { value.observationBoundary.mutationEpochAvailable = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(expected);
    mutate(candidate);
    candidate.receiptDigest =
      computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest(candidate);
    assert.throws(
      () => testOnly.assertReceiptBoundary(candidate),
      (error) => /PROMOTION_FORBIDDEN$/u.test(error?.code ?? "")
    );
  }
});

test("source, focused test, manifest, browser child and persisted receipt drift all fail closed", async () => {
  const cases = [
    [testOnly.CONTRACT_SOURCE.path, ["CONTRACT_SOURCE_DRIFT"], true],
    [testOnly.CONTRACT_TEST.path, ["CONTRACT_TEST_DRIFT"], true],
    [
      testOnly.FORMAL_MANIFEST.path,
      ["FORMAL_MANIFEST_RAW_DRIFT", "PERSISTED_RAW_DRIFT"],
      true
    ],
    [testOnly.HISTORICAL_BROWSER_CHILD.path, ["BROWSER_CHILD_RAW_DRIFT"], true],
    [
      ZIWEI_EXPERT_PROMOTION_BOUNDARY_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
      ["PERSISTED_IDENTITY_DRIFT"],
      false
    ]
  ];
  for (const [relativePath, expectedCodes, useBuilder] of cases) {
    await withFixture(async (root) => {
      const target = path.resolve(root, ...relativePath.split("/"));
      await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n")]));
      await assert.rejects(
        () => useBuilder
          ? buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(root)
          : loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(root),
        (error) => {
          assert.ok(
            expectedCodes.includes(error?.code),
            `${relativePath}: unexpected ${error?.constructor?.name ?? typeof error} ${error?.code ?? "NO_CODE"}`
          );
          return true;
        }
      );
    });
  }
});

test("canonical capture rejects accessors, proxies, aliases and cycles without invoking getters", () => {
  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return false;
    }
  });
  assert.throws(() => testOnly.captureJson(accessor));
  assert.equal(getterCalls, 0);
  assert.throws(() => testOnly.captureJson(new Proxy({}, {})));
  const shared = {};
  assert.throws(() => testOnly.captureJson({ left: shared, right: shared }));
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => testOnly.captureJson(cyclic));
});

test("semantic digest binds an own __proto__ field and the exact boundary rejects it", async () => {
  const left = clone(await buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  ));
  const right = clone(left);
  Object.defineProperty(left, "__proto__", {
    configurable: true,
    enumerable: true,
    value: "left",
    writable: true
  });
  Object.defineProperty(right, "__proto__", {
    configurable: true,
    enumerable: true,
    value: "right",
    writable: true
  });
  left.receiptDigest =
    computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest(left);
  right.receiptDigest =
    computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest(right);
  assert.notEqual(left.receiptDigest, right.receiptDigest);
  assert.throws(() => testOnly.assertReceiptBoundary(left), expectCode("KEY_SET_INVALID"));
});

test("local canonical capture resists Array index setters and global String replacement", async () => {
  const receipt = await buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const originalDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const originalString = globalThis.String;
  Object.defineProperty(Array.prototype, "0", {
    configurable: true,
    set() {
      Object.defineProperty(this, 0, {
        configurable: true,
        enumerable: true,
        value: "evil",
        writable: true
      });
    }
  });
  globalThis.String = () => "__proto__";
  let exactResult;
  let digestResult;
  let capturedValue;
  try {
    exactResult = testOnly.exactJson(["evil"], ["legit"]);
    digestResult = computeZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidateDigest(
      receipt
    );
    const captured = testOnly.captureJson({ values: ["legit"] });
    capturedValue = captured.values[0];
  } finally {
    globalThis.String = originalString;
    if (originalDescriptor) {
      Object.defineProperty(Array.prototype, "0", originalDescriptor);
    } else {
      delete Array.prototype[0];
    }
  }
  assert.equal(exactResult, false);
  assert.equal(digestResult, receipt.receiptDigest);
  assert.equal(capturedValue, "legit");
});

test("captured private-brand primitives resist post-import WeakSet and Object.isFrozen poisoning", async () => {
  const loaded = await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const originalHas = WeakSet.prototype.has;
  const originalIsFrozen = Object.isFrozen;
  try {
    WeakSet.prototype.has = () => false;
    Object.isFrozen = () => false;
    assert.equal(isVerifiedZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(loaded), true);
  } finally {
    WeakSet.prototype.has = originalHas;
    Object.isFrozen = originalIsFrozen;
  }
});

test("captured find and regexp primitives plus sequential awaits ignore a replaced global Promise constructor", async () => {
  const originalFind = Array.prototype.find;
  const originalTest = RegExp.prototype.test;
  const originalPromise = globalThis.Promise;
  class PoisonPromise extends originalPromise {
    static all() {
      throw new Error("poisoned Promise.all");
    }

    static resolve() {
      return { then(resolve) { resolve("poisoned Promise.resolve"); } };
    }
  }
  try {
    Array.prototype.find = () => undefined;
    RegExp.prototype.test = () => false;
    globalThis.Promise = PoisonPromise;
    const built = await buildZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(
      workspaceRoot
    );
    assert.equal(built.candidateId, testOnly.CANDIDATE_ID);
  } finally {
    Array.prototype.find = originalFind;
    RegExp.prototype.test = originalTest;
    globalThis.Promise = originalPromise;
  }
});

test("CLI emits only calibrated candidate claims and all promotion lines remain red", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    env: sanitizedEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.equal(stdout.startsWith(OK_PREFIX), true);
  const report = JSON.parse(stdout.slice(OK_PREFIX.length));
  assert.equal(report.ziweiExpertPromotionBoundaryIdentityDriftReceiptCandidateMechanicallyVerified, true);
  assert.equal(report.candidateOnly, true);
  assert.equal(report.activeAdmissionEffect, "none");
  assert.equal(report.oneSourceIdentityFansOutToFiveComponentDigests, true);
  assert.equal(report.fiveIndependentSemanticChangesClaimed, false);
  assert.equal(report.uniqueBlockerClaimed, false);
  assert.equal(report.historicalManifestMechanicallyCurrent, false);
  assert.equal(report.currentCandidateManifestPersisted, false);
  assert.equal(report.historicalBrowserChildMechanicallyCurrent, false);
  assert.equal(report.browserFailureClass, "SOURCE_GRAPH_MISMATCH");
  assert.equal(report.browserRerunPerformedByThisReceipt, false);
  assert.equal(report.currentBrowserRuntimeEvidenceEstablished, false);
  assert.equal(report.externalVerifiedExpertReceiptsVerified, 0);
  assert.equal(report.externalVerifiedExpertReceiptsRequired, 2);
  assert.equal(report.localReviewerIdsEstablishRealIdentityQualificationOrIndependence, false);
  assert.equal(report.projectDefaultReleaseIdentity, "legacy-v13");
  assert.equal(report.projectDefaultTargetSchema, 13);
  assert.equal(report.projectDefaultMigrationId, null);
  assert.equal(report.inheritedByZiweiProductIdentity, false);
  assert.equal(report.crossFileAtomicSnapshot, false);
  assert.equal(report.mutationEpochReceipt, null);
  assert.equal(report.abaExcluded, false);
  assert.equal(report.expertClaimsAuthorized, false);
  assert.equal(report.releaseReady, false);
  assert.equal(report.publicDeploymentAuthorized, false);
  assert.equal(report.publicReleaseAuthorized, false);
});

test("CLI anchors to its script workspace, rejects operands and preload environments, and imports silently", async () => {
  const outsideCwd = path.parse(workspaceRoot).root;
  const fromOutside = await execFileAsync(process.execPath, [cliPath], {
    cwd: outsideCwd,
    env: sanitizedEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(fromOutside.stderr, "");
  assert.equal(fromOutside.stdout.startsWith(OK_PREFIX), true);

  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "unexpected"], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1
      && error.stderr === `${FAILED_PREFIX}ARGUMENTS_FORBIDDEN\n`
  );
  await assert.rejects(
    execFileAsync(process.execPath, [cliPath], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment({ NODE_OPTIONS: "--trace-warnings" }),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1
      && error.stderr === `${FAILED_PREFIX}PRELOAD_ENVIRONMENT_FORBIDDEN\n`
  );
  const imported = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(cliPath).href)});`],
    {
      cwd: outsideCwd,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }
  );
  assert.equal(imported.stdout, "");
  assert.equal(imported.stderr, "");
});
