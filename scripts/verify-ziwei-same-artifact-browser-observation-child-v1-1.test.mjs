import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  BUILD_SOURCE_PATHS,
  EVIDENCE_TOOL_PATHS,
  FORMAL_CONTEXT_PATHS,
  computeCandidateDigest as computeBaseObservationDigest
} from "./ziwei-same-artifact-browser-observation-lib.mjs";
import {
  ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_RELATIVE_PATH,
  assertZiweiSameArtifactBrowserObservationChildV11Boundary,
  computeZiweiSameArtifactBrowserObservationChildV11Digest,
  getZiweiSameArtifactBrowserObservationChildV11Summary,
  isVerifiedZiweiSameArtifactBrowserObservationChildV11,
  loadZiweiSameArtifactBrowserObservationChildV11,
  serializeZiweiSameArtifactBrowserObservationChildV11,
  verifyCurrentZiweiSameArtifactBaseObservation,
  ziweiSameArtifactBrowserObservationChildV11TestOnly as testOnly
} from "./ziwei-same-artifact-browser-observation-child-v1-1-lib.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, "..");
const CLI_PATH = path.join(
  SCRIPT_DIR,
  "verify-ziwei-same-artifact-browser-observation-child-v1-1.mjs"
);
const CLI_URL = pathToFileURL(CLI_PATH).href;
const ARTIFACT_PATH = path.join(
  WORKSPACE_ROOT,
  ...ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V11_RELATIVE_PATH.split("/")
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectCode(code) {
  return (error) => error?.code === code;
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (Object.hasOwn(descriptor, "value")) assertDeepFrozen(descriptor.value, seen);
  }
}

function sanitizedEnvironment(extra = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return { ...env, ...extra };
}

function persistedObject() {
  return JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));
}

function resealChild(value) {
  value.childDigest = computeZiweiSameArtifactBrowserObservationChildV11Digest(value);
  return value;
}

function withCurrentGraphFixture(run) {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "ziwei-v11-current-graph-"));
  try {
    const paths = [...new Set([
      ...BUILD_SOURCE_PATHS,
      ...EVIDENCE_TOOL_PATHS,
      ...FORMAL_CONTEXT_PATHS
    ])];
    for (const relativePath of paths) {
      const source = path.join(WORKSPACE_ROOT, ...relativePath.split("/"));
      const target = path.join(fixtureRoot, ...relativePath.split("/"));
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
    return run(fixtureRoot);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test("full loader verifies exact current child and grants only the private brand", async () => {
  const child = await loadZiweiSameArtifactBrowserObservationChildV11(WORKSPACE_ROOT);
  assert.equal(isVerifiedZiweiSameArtifactBrowserObservationChildV11(child), true);
  assert.equal(isVerifiedZiweiSameArtifactBrowserObservationChildV11(clone(child)), false);
  assertDeepFrozen(child);
  const summary = getZiweiSameArtifactBrowserObservationChildV11Summary(child);
  assert.equal(summary.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
  assert.equal(summary.baseObservationDigest, testOnly.CURRENT_BASE.observationDigest);
  assert.equal(summary.outputTreeDigest, testOnly.CURRENT_BASE.outputTreeDigest);
  assert.equal(summary.chromeVersion, "151.0.7922.174");
  assert.equal(summary.edgeVersion, "152.0.4191.53");
  assert.equal(summary.totalPassedScenarioOutcomes, 28);
  assert.equal(summary.historicalV1Current, false);
  assert.equal(summary.historicalManifestMechanicallyCurrent, false);
  assert.equal(summary.publicReleaseAuthorized, false);
  assert.throws(
    () => getZiweiSameArtifactBrowserObservationChildV11Summary(clone(child)),
    expectCode("PRIVATE_CHILD_BRAND_REQUIRED")
  );
});

test("persisted raw identity, LF materialization, child digest and embedded base are exact", async () => {
  const raw = readFileSync(ARTIFACT_PATH);
  const child = persistedObject();
  assert.equal(raw.byteLength, testOnly.EXPECTED_PERSISTED.rawBytes);
  const { createHash } = await import("node:crypto");
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(child.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
  assert.equal(
    computeZiweiSameArtifactBrowserObservationChildV11Digest(child),
    child.childDigest
  );
  assert.equal(raw.toString("utf8"), serializeZiweiSameArtifactBrowserObservationChildV11(child));
  assert.equal(child.currentBaseObservation.observationDigest, testOnly.CURRENT_BASE.observationDigest);
  assert.equal(child.browserEvidenceBoundary.outputTreeDigest, testOnly.CURRENT_BASE.outputTreeDigest);
});

test("embedded base passes the v1 verifier and current runtime canonical rebuild", () => {
  const base = persistedObject().currentBaseObservation;
  const verified = verifyCurrentZiweiSameArtifactBaseObservation(WORKSPACE_ROOT, base);
  assert.equal(verified.observationDigest, testOnly.CURRENT_BASE.observationDigest);
  assertDeepFrozen(verified);
});

test("a changed current authored source graph fails the runtime rebuild", () => {
  const base = persistedObject().currentBaseObservation;
  withCurrentGraphFixture((fixtureRoot) => {
    const target = path.join(
      fixtureRoot,
      "packages",
      "ziwei-doushu-contracts-draft",
      "src",
      "index.ts"
    );
    writeFileSync(target, Buffer.concat([readFileSync(target), Buffer.from("\n")]))
    assert.throws(
      () => verifyCurrentZiweiSameArtifactBaseObservation(fixtureRoot, base),
      expectCode("CURRENT_BASE_REBUILD_FAILED")
    );
  });
});

test("embedded runtime identity cannot be replaced and resealed", () => {
  const base = clone(persistedObject().currentBaseObservation);
  base.runtimeObservation.browserProbes[0].versionBefore = "999.0.0.0";
  base.runtimeObservation.browserProbes[0].versionAfter = "999.0.0.0";
  base.observationDigest = computeBaseObservationDigest(base);
  assert.throws(
    () => verifyCurrentZiweiSameArtifactBaseObservation(WORKSPACE_ROOT, base),
    expectCode("BASE_OBSERVATION_IDENTITY_DRIFT")
  );
});

test("authority, manifest, runtime, epoch, atomicity and ABA promotions fail closed", () => {
  const mutations = [
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.manifestBoundary.historicalManifestMechanicallyCurrent = true; },
    (value) => { value.manifestBoundary.manifestRebindOrResignPerformed = true; },
    (value) => { value.browserEvidenceBoundary.productionBrowserRuntimeEvidenceEstablished = true; },
    (value) => {
      value.observationBoundary.mutationEpochAvailable = true;
      value.observationBoundary.mutationEpochReceipt = { epoch: 1 };
    },
    (value) => { value.observationBoundary.repositoryCrossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.repositoryAbaExcluded = true; }
  ];
  for (const mutate of mutations) {
    const value = clone(persistedObject());
    mutate(value);
    resealChild(value);
    assert.throws(
      () => assertZiweiSameArtifactBrowserObservationChildV11Boundary(value),
      (error) => error?.code === "AUTHORITY_PROMOTION_FORBIDDEN"
        || error?.code === "BOUNDARY_PROMOTION_FORBIDDEN"
        || error?.code === "CHILD_PROJECTION_MISMATCH"
    );
  }
});

test("historical v1 remains raw/self-only, current false and cannot be resealed", async () => {
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    WORKSPACE_ROOT,
    testOnly.HISTORICAL_V1.path
  );
  const historical = parseBaziDttStrictJsonArtifact(snapshot);
  testOnly.assertHistoricalV1Snapshot(snapshot, historical);
  const resealed = clone(historical);
  resealed.createdAt = "2026-09-01T09:09:15.323Z";
  resealed.observationDigest = computeBaseObservationDigest(resealed);
  assert.notEqual(resealed.observationDigest, testOnly.HISTORICAL_V1.observationDigest);
  assert.throws(
    () => testOnly.assertHistoricalV1Snapshot(snapshot, resealed),
    expectCode("HISTORICAL_V1_IDENTITY_DRIFT")
  );
  const child = clone(persistedObject());
  child.lineage.historicalBrowserObservationV1.current = true;
  child.lineage.historicalBrowserObservationV1.resealedAsCurrent = true;
  resealChild(child);
  assert.throws(
    () => assertZiweiSameArtifactBrowserObservationChildV11Boundary(child),
    expectCode("BOUNDARY_PROMOTION_FORBIDDEN")
  );
});

test("expert-drift receipt is an exact branded current dependency", async () => {
  const child = await loadZiweiSameArtifactBrowserObservationChildV11(WORKSPACE_ROOT);
  assert.equal(child.lineage.expertDriftReceipt.privateBrandConsumed, true);
  assert.equal(child.lineage.expertDriftReceipt.receiptDigest, testOnly.EXPERT_DRIFT_RECEIPT.receiptDigest);
  assert.equal(child.expertPromotionBoundary.externalVerifiedExpertReceiptsVerified, 0);
  assert.equal(child.expertPromotionBoundary.expertClaimsAuthorized, false);
});

test("zero external personal data and all receipt/authority counters stay red", () => {
  const child = persistedObject();
  assert.deepEqual(child.dataHandlingBoundary, {
    syntheticInputsOnly: true,
    actualPersonDataEntered: false,
    zeroExternalPersonalData: true,
    rawBirthInputIncluded: false,
    derivedChartDigestIncluded: false,
    feedbackNarrativeIncluded: false,
    backupBodyOrDigestIncluded: false,
    revisionOrStudyIdentifiersIncluded: false,
    screenshotTraceVideoOrDownloadIncluded: false,
    rawPlaywrightReportIncluded: false,
    safeToLog: false,
    safeToPublish: false
  });
  assert.equal(Object.values(child.formalReceiptCounts).every((value) => value === 0), true);
  assert.equal(Object.values(child.authorityBoundary).every((value) => value === false), true);
});

test("proxy, accessor and cloned-brand forgery inputs fail closed", async () => {
  const child = persistedObject();
  assert.throws(
    () => assertZiweiSameArtifactBrowserObservationChildV11Boundary(new Proxy(child, {})),
    expectCode("NON_CANONICAL_JSON")
  );
  const accessor = clone(child);
  Object.defineProperty(accessor.authorityBoundary, "releaseReady", {
    enumerable: true,
    get() { return false; }
  });
  assert.throws(
    () => assertZiweiSameArtifactBrowserObservationChildV11Boundary(accessor),
    expectCode("NON_CANONICAL_JSON")
  );
  const loaded = await loadZiweiSameArtifactBrowserObservationChildV11(WORKSPACE_ROOT);
  assert.equal(isVerifiedZiweiSameArtifactBrowserObservationChildV11({ ...loaded }), false);
});

test("post-import intrinsic poisoning is detected before v1 or upstream verification", async () => {
  const originalValues = Object.values;
  try {
    Object.values = () => [true];
    await assert.rejects(
      () => loadZiweiSameArtifactBrowserObservationChildV11(WORKSPACE_ROOT),
      expectCode("INTRINSIC_DRIFT")
    );
  } finally {
    Object.values = originalValues;
  }
  const originalMap = Array.prototype.map;
  try {
    Array.prototype.map = function poisonedMap() { return []; };
    await assert.rejects(
      () => loadZiweiSameArtifactBrowserObservationChildV11(WORKSPACE_ROOT),
      expectCode("INTRINSIC_DRIFT")
    );
  } finally {
    Array.prototype.map = originalMap;
  }
  const child = await loadZiweiSameArtifactBrowserObservationChildV11(WORKSPACE_ROOT);
  assert.equal(isVerifiedZiweiSameArtifactBrowserObservationChildV11(child), true);
});

test("CLI emits a narrow branded summary", () => {
  const result = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    env: sanitizedEnvironment(),
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  const prefix = "ZIWEI_SAME_ARTIFACT_BROWSER_OBSERVATION_CHILD_V1_1_OK ";
  assert.equal(result.stdout.startsWith(prefix), true);
  const summary = JSON.parse(result.stdout.slice(prefix.length));
  assert.equal(summary.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
  assert.equal(summary.totalPassedScenarioOutcomes, 28);
  assert.equal(summary.historicalV1Current, false);
  assert.equal(summary.historicalManifestMechanicallyCurrent, false);
  assert.equal(summary.publicReleaseAuthorized, false);
});

test("CLI rejects operands and visible preload environments or arguments", () => {
  const operand = spawnSync(process.execPath, [CLI_PATH, "extra"], {
    cwd: WORKSPACE_ROOT,
    env: sanitizedEnvironment(),
    encoding: "utf8"
  });
  assert.notEqual(operand.status, 0);
  assert.match(operand.stderr, /CLI_OPERANDS_FORBIDDEN/u);

  const preloadEnvironment = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    env: sanitizedEnvironment({ NODE_OPTIONS: "--require=node:path" }),
    encoding: "utf8"
  });
  assert.notEqual(preloadEnvironment.status, 0);
  assert.match(preloadEnvironment.stderr, /VISIBLE_PRELOAD_ENVIRONMENT_FORBIDDEN/u);

  const preloadArgument = spawnSync(
    process.execPath,
    ["--import=data:text/javascript,export default 0", CLI_PATH],
    { cwd: WORKSPACE_ROOT, env: sanitizedEnvironment(), encoding: "utf8" }
  );
  assert.notEqual(preloadArgument.status, 0);
  assert.match(preloadArgument.stderr, /VISIBLE_PRELOAD_ARGUMENT_FORBIDDEN/u);

  const maliciousPreloadArgument = spawnSync(
    process.execPath,
    [
      "--import=data:text/javascript,String.prototype.toLowerCase%20%3D%20function%20poisonedToLowerCase()%20%7B%20return%20%22%22%3B%20%7D%3B",
      CLI_PATH
    ],
    { cwd: WORKSPACE_ROOT, env: sanitizedEnvironment(), encoding: "utf8" }
  );
  assert.notEqual(maliciousPreloadArgument.status, 0);
  assert.match(
    maliciousPreloadArgument.stderr,
    /VISIBLE_PRELOAD_ARGUMENT_FORBIDDEN/u
  );
  assert.equal(maliciousPreloadArgument.stdout, "");

  const argvPathPoisoningPreload = spawnSync(
    process.execPath,
    [
      "--import=data:text/javascript,process.argv[1]=%22x%22",
      CLI_PATH
    ],
    { cwd: WORKSPACE_ROOT, env: sanitizedEnvironment(), encoding: "utf8" }
  );
  assert.notEqual(argvPathPoisoningPreload.status, 0);
  assert.match(
    argvPathPoisoningPreload.stderr,
    /VISIBLE_PRELOAD_ARGUMENT_FORBIDDEN/u
  );
  assert.equal(argvPathPoisoningPreload.stdout, "");
});

test("importing the CLI does not overwrite an existing process exit code", () => {
  const source = `process.exitCode=7;await import(${JSON.stringify(CLI_URL)});process.stdout.write(String(process.exitCode));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: WORKSPACE_ROOT,
    env: sanitizedEnvironment(),
    encoding: "utf8"
  });
  assert.equal(result.status, 7);
  assert.equal(result.stdout, "7");
  assert.equal(result.stderr, "");
});
