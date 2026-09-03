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
  WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
  WesternSourceAndManifestIdentityDriftReceiptCandidateError,
  buildWesternSourceAndManifestIdentityDriftReceiptCandidate,
  computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest,
  isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate,
  loadWesternSourceAndManifestIdentityDriftReceiptCandidate,
  serializeWesternSourceAndManifestIdentityDriftReceiptCandidate,
  westernSourceAndManifestIdentityDriftReceiptCandidateTestOnly as testOnly
} from "./western-source-and-manifest-identity-drift-receipt-candidate-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const persistedPath = path.resolve(
  workspaceRoot,
  ...WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
    .split("/")
);
const cliPath = path.join(
  scriptsDirectory,
  "verify-western-source-and-manifest-identity-drift-receipt-candidate.mjs"
);
const OK_PREFIX =
  "WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_OK ";
const FAILED_PREFIX =
  "WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_FAILED ";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizedEnvironment(extra = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  return { ...environment, ...extra };
}

function expectCode(code) {
  return (error) => {
    assert.ok(
      error instanceof WesternSourceAndManifestIdentityDriftReceiptCandidateError,
      "unexpected " + (error?.constructor?.name ?? typeof error)
        + " " + (error?.code ?? "NO_CODE")
    );
    assert.equal(error.code, code);
    return true;
  };
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
  const sourceV1 = JSON.parse(await readFile(
    path.resolve(workspaceRoot, ...testOnly.FORMAL_SOURCE_CHAIN[0].path.split("/")),
    "utf8"
  ));
  const paths = new Set([
    testOnly.FORMAL_MANIFEST.path,
    testOnly.CURRENT_OBSERVATION.path,
    testOnly.HIGH_RISK_CANDIDATE.path,
    WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
  ]);
  for (const source of testOnly.FORMAL_SOURCE_CHAIN) paths.add(source.path);
  for (const source of testOnly.CURRENT_SOURCES) paths.add(source.path);
  for (const basis of sourceV1.basisArtifacts) paths.add(basis.path);
  for (const component of manifest.components) {
    for (const file of component.files) paths.add(file.path);
  }
  return [...paths];
}

async function withFixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-western-drift-"));
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

test("builder is unbranded while exact persisted load returns a frozen private receipt", async () => {
  const built = await buildWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const loaded = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.deepEqual(loaded, built);
  assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(built), false);
  assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(loaded), true);
  assert.equal(
    isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(
      structuredClone(loaded)
    ),
    false
  );
  assertDeepFrozen(loaded);
});

test("persisted raw identity, canonical LF bytes and receipt digest are exact", async () => {
  const loaded = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const raw = await readFile(persistedPath);
  assert.equal(
    raw.toString("utf8"),
    serializeWesternSourceAndManifestIdentityDriftReceiptCandidate(loaded)
  );
  assert.equal(raw.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(loaded.receiptDigest, testOnly.EXPECTED_PERSISTED.receiptDigest);
  assert.equal(
    computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest(loaded),
    loaded.receiptDigest
  );
});

test("source and manifest accounts freeze old-definition counterfactuals without persistence", async () => {
  const receipt = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.deepEqual(
    receipt.formalSourceDrift.sourceChain,
    testOnly.FORMAL_SOURCE_CHAIN.map((entry) => ({
      versionRole: entry.versionRole,
      path: entry.path,
      rawBytes: entry.rawBytes,
      rawSha256: entry.rawSha256,
      ledgerId: entry.ledgerId,
      ledgerDigest: entry.ledgerDigest,
      preservedUnmodified: true,
      rebindOrResignPerformed: false
    }))
  );
  assert.equal(receipt.formalSourceDrift.currentV12LoaderFailureClass, "LEDGER_MISMATCH");
  assert.equal(receipt.formalSourceDrift.oldDefinitionCounterfactual.persisted, false);
  assert.equal(receipt.formalSourceDrift.oldDefinitionCounterfactual.currentCompleteClosure, false);
  assert.equal(receipt.formalManifestDrift.currentLoaderFailureClass, "MANIFEST_MISMATCH");
  assert.equal(receipt.formalManifestDrift.oldDefinitionCounterfactual.persisted, false);
  assert.equal(receipt.formalManifestDrift.oldDefinitionCounterfactual.currentCompleteClosure, false);
  assert.deepEqual(receipt.formalManifestDrift.changedComponents, testOnly.COMPONENT_DRIFTS);
  assert.equal(receipt.formalManifestDrift.changedComponentCount, 6);
  assert.equal(receipt.formalManifestDrift.contractIndexOneSourceFansOutToFiveComponentDigests, true);
  assert.equal(receipt.formalManifestDrift.rulesPreviewMainIsOnlyObservedReportContractHashDriftSource, true);
  assert.equal(receipt.formalManifestDrift.sixComponentDigestDriftsEqualSixIndependentSemanticChanges, false);
  assert.equal(receipt.formalManifestDrift.uniqueBlockerClaimed, false);
});

test("civil input, focused tests and new high-risk evidence remain outside the old complete definition", async () => {
  const receipt = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.ok(receipt.currentEndpointBindings.currentVersionAwareObservation);
  assert.ok(receipt.currentEndpointBindings.currentHighRiskCandidate);
  assert.deepEqual(
    receipt.currentEndpointBindings.currentSourceSnapshots,
    testOnly.CURRENT_SOURCES.map((entry) => ({
      role: entry.role,
      path: entry.path,
      rawBytes: entry.rawBytes,
      rawSha256: entry.rawSha256
    }))
  );
  assert.ok(Object.values(receipt.oldDefinitionCoverageBoundary).every((value) => value === false));
  assert.equal(receipt.gateSummary.bindingFrozenVerified, 0);
  assert.equal(receipt.gateSummary.bindingRequired, 28);
  assert.equal(receipt.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(receipt.gateSummary.independentExpertsRequired, 2);
});

test("project context, authority and non-atomic observation boundaries stay separate and red", async () => {
  const receipt = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  assert.deepEqual(receipt.releaseGovernance.projectDefaultContext, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    inheritedByWesternProductIdentity: false
  });
  assert.equal(receipt.releaseGovernance.releaseIdentity, null);
  assert.equal(receipt.releaseGovernance.targetSchema, null);
  assert.equal(receipt.releaseGovernance.migrationId, null);
  assert.equal(receipt.activeAdmissionEffect, "none");
  assert.equal(receipt.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(receipt.observationBoundary.mutationEpochAvailable, false);
  assert.equal(receipt.observationBoundary.mutationEpochReceipt, null);
  assert.equal(receipt.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(receipt.observationBoundary.abaExcluded, false);
  assert.equal(receipt.observationBoundary.receiptDigestIsDigitalSignature, false);
  assert.ok(Object.values(receipt.authorityBoundary).every((value) => value === false));
});

test("authority, receipt digest and counterfactual tampering fail closed", async () => {
  const expected = await buildWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const authority = clone(expected);
  authority.authorityBoundary.expertClaimsAuthorized = true;
  authority.receiptDigest =
    computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest(authority);
  assert.throws(
    () => testOnly.assertReceiptBoundary(authority),
    expectCode("AUTHORITY_PROMOTION_FORBIDDEN")
  );

  const digest = clone(expected);
  digest.receiptDigest = "0".repeat(64);
  assert.throws(
    () => testOnly.assertReceiptBoundary(digest),
    expectCode("RECEIPT_DIGEST_INVALID")
  );

  const sourceCounterfactual = clone(expected);
  sourceCounterfactual.formalSourceDrift.oldDefinitionCounterfactual.ledgerDigest =
    "1".repeat(64);
  sourceCounterfactual.receiptDigest =
    computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest(
      sourceCounterfactual
    );
  assert.throws(
    () => testOnly.assertReceiptBoundary(sourceCounterfactual),
    expectCode("IDENTITY_PROJECTION_INVALID")
  );

  const manifestCounterfactual = clone(expected);
  manifestCounterfactual.formalManifestDrift.oldDefinitionCounterfactual.manifestDigest =
    "2".repeat(64);
  manifestCounterfactual.receiptDigest =
    computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest(
      manifestCounterfactual
    );
  assert.throws(
    () => testOnly.assertReceiptBoundary(manifestCounterfactual),
    expectCode("IDENTITY_PROJECTION_INVALID")
  );
});

test("every frozen current endpoint and the persisted receipt fail closed on raw drift", async () => {
  const cases = [
    [testOnly.FORMAL_SOURCE_CHAIN[2].path, "SOURCE_RAW_IDENTITY_DRIFT", true],
    [testOnly.FORMAL_MANIFEST.path, "MANIFEST_RAW_IDENTITY_DRIFT", true],
    [testOnly.CURRENT_OBSERVATION.path, "CURRENT_OBSERVATION_RAW_DRIFT", true],
    [testOnly.HIGH_RISK_CANDIDATE.path, "HIGH_RISK_CANDIDATE_RAW_DRIFT", true],
    [testOnly.CURRENT_SOURCES[0].path, "CURRENT_SOURCE_DRIFT", true],
    [testOnly.CURRENT_SOURCES[1].path, "CURRENT_SOURCE_DRIFT", true],
    [testOnly.CURRENT_SOURCES[2].path, "CURRENT_SOURCE_DRIFT", true],
    [testOnly.CURRENT_SOURCES[3].path, "CURRENT_SOURCE_DRIFT", true],
    [testOnly.CURRENT_SOURCES[4].path, "CURRENT_SOURCE_DRIFT", true],
    [
      WESTERN_SOURCE_AND_MANIFEST_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH,
      "PERSISTED_IDENTITY_DRIFT",
      false
    ]
  ];
  for (const [relativePath, code, useBuilder] of cases) {
    await withFixture(async (root) => {
      const target = path.resolve(root, ...relativePath.split("/"));
      await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n")]));
      await assert.rejects(
        () => useBuilder
          ? buildWesternSourceAndManifestIdentityDriftReceiptCandidate(root)
          : loadWesternSourceAndManifestIdentityDriftReceiptCandidate(root),
        expectCode(code)
      );
    });
  }
});

test("passive canonical capture rejects accessors, proxies, aliases and cycles", () => {
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

test("own-index canonical operations resist Array numeric setters and global String replacement", async () => {
  const receipt = await buildWesternSourceAndManifestIdentityDriftReceiptCandidate(
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
    digestResult = computeWesternSourceAndManifestIdentityDriftReceiptCandidateDigest(
      receipt
    );
    capturedValue = testOnly.captureJson({ values: ["legit"] }).values[0];
  } finally {
    globalThis.String = originalString;
    if (originalDescriptor) Object.defineProperty(Array.prototype, "0", originalDescriptor);
    else delete Array.prototype[0];
  }
  assert.equal(exactResult, false);
  assert.equal(digestResult, testOnly.EXPECTED_PERSISTED.receiptDigest);
  assert.equal(capturedValue, "legit");
});

test("sequential direct awaits ignore a replaced global Promise constructor", async () => {
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
    globalThis.Promise = PoisonPromise;
    const built = await buildWesternSourceAndManifestIdentityDriftReceiptCandidate(
      workspaceRoot
    );
    assert.equal(built.candidateId, testOnly.CANDIDATE_ID);
  } finally {
    globalThis.Promise = originalPromise;
  }
});

test("captured private-brand primitives resist post-import poisoning", async () => {
  const loaded = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    workspaceRoot
  );
  const originalHas = WeakSet.prototype.has;
  const originalIsFrozen = Object.isFrozen;
  try {
    WeakSet.prototype.has = () => false;
    Object.isFrozen = () => false;
    assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(loaded), true);
  } finally {
    WeakSet.prototype.has = originalHas;
    Object.isFrozen = originalIsFrozen;
  }
});

test("CLI emits calibrated claims from any cwd", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: path.parse(workspaceRoot).root,
    env: sanitizedEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.equal(stdout.startsWith(OK_PREFIX), true);
  const report = JSON.parse(stdout.slice(OK_PREFIX.length));
  assert.equal(report.westernSourceAndManifestIdentityDriftReceiptCandidateMechanicallyVerified, true);
  assert.equal(report.candidateOnly, true);
  assert.equal(report.activeAdmissionEffect, "none");
  assert.equal(report.sourceLoaderMechanicallyCurrent, false);
  assert.equal(report.sourceLoaderFailureClass, "LEDGER_MISMATCH");
  assert.equal(report.manifestMechanicallyCurrent, false);
  assert.equal(report.manifestLoaderFailureClass, "MANIFEST_MISMATCH");
  assert.equal(report.sourceCounterfactualPersisted, false);
  assert.equal(report.manifestCounterfactualPersisted, false);
  assert.equal(report.currentEngineeringManifestComplete, false);
  assert.equal(report.changedComponentCount, 6);
  assert.equal(report.sixComponentDigestDriftsEqualSixIndependentSemanticChanges, false);
  assert.equal(report.uniqueBlockerClaimed, false);
  assert.equal(report.bindingFrozenVerified, 0);
  assert.equal(report.bindingRequired, 28);
  assert.equal(report.independentExpertReviewsVerified, 0);
  assert.equal(report.independentExpertsRequired, 2);
  assert.equal(report.projectDefaultReleaseIdentity, "legacy-v13");
  assert.equal(report.projectDefaultTargetSchema, 13);
  assert.equal(report.projectDefaultMigrationId, null);
  assert.equal(report.inheritedByWesternProductIdentity, false);
  assert.equal(report.crossFileAtomicSnapshot, false);
  assert.equal(report.mutationEpochReceipt, null);
  assert.equal(report.intervalMutationExcludedAcrossFiles, false);
  assert.equal(report.abaExcluded, false);
  assert.equal(report.receiptDigestIsDigitalSignature, false);
  assert.equal(report.expertClaimsAuthorized, false);
  assert.equal(report.releaseReady, false);
  assert.equal(report.publicDeploymentAuthorized, false);
  assert.equal(report.publicReleaseAuthorized, false);
});

test("CLI rejects operands and visible preload channels while import preserves an existing exit code", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "unexpected"], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1
      && error.stderr === FAILED_PREFIX + "ARGUMENTS_FORBIDDEN\n"
  );
  await assert.rejects(
    execFileAsync(process.execPath, ["-r", "node:path", cliPath], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1
      && error.stderr === FAILED_PREFIX + "PRELOAD_ENVIRONMENT_FORBIDDEN\n"
  );
  await assert.rejects(
    execFileAsync(process.execPath, [cliPath], {
      cwd: workspaceRoot,
      env: sanitizedEnvironment({ NODE_OPTIONS: "--trace-warnings" }),
      encoding: "utf8",
      windowsHide: true
    }),
    (error) => error?.code === 1
      && error.stderr === FAILED_PREFIX + "PRELOAD_ENVIRONMENT_FORBIDDEN\n"
  );
  const cliUrl = pathToFileURL(cliPath).href;
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "process.exitCode=7;await import(" + JSON.stringify(cliUrl)
          + ");process.stdout.write(JSON.stringify({exitCode:process.exitCode}));"
      ],
      {
        cwd: path.parse(workspaceRoot).root,
        env: sanitizedEnvironment(),
        encoding: "utf8",
        windowsHide: true
      }
    ),
    (error) => error?.code === 7
      && error.stdout === "{\"exitCode\":7}"
      && error.stderr === ""
  );
});
