import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH,
  buildCurrentFourSystemCurrentStatusObservationChildV23,
  computeFourSystemCurrentStatusObservationChildV23Digest,
  isVerifiedFourSystemCurrentStatusObservationChildV23,
  loadFourSystemCurrentStatusObservationChildV23,
  serializeFourSystemCurrentStatusObservationChildV23,
  fourSystemCurrentStatusObservationChildV23TestOnly as testOnly
} from "./four-system-current-status-observation-child-v2-3-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV22,
  isVerifiedFourSystemCurrentStatusObservationChildV22
} from "./four-system-current-status-observation-child-v2-2-lib.mjs";
import {
  loadWesternSourceAndManifestIdentityDriftReceiptCandidate,
  isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate
} from "./western-source-and-manifest-identity-drift-receipt-candidate-lib.mjs";
import { attachCurrentFourSystemCli } from "./four-system-v22-history.test-fixture.mjs";
import {
  FOUR_SYSTEM_V23_ADDITIONAL_ARCHIVE_URL,
  createFourSystemV23HistoricalInputs,
  parseFourSystemV23AdditionalArchive
} from "./four-system-v23-history.test-fixture.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const persistedPath = path.resolve(
  workspaceRoot,
  ...FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH.split("/")
);
const actualCliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-four-system-current-status-observation-child-v2-3.mjs"
);
let historicalInputs;
let cliPath;
let cliUrl;
before(async () => {
  historicalInputs = await createFourSystemV23HistoricalInputs();
  cliPath = await attachCurrentFourSystemCli(historicalInputs, 3);
  cliUrl = pathToFileURL(cliPath).href;
  assert.deepEqual(await readFile(persistedPath), await readFile(path.join(
    historicalInputs.root, FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH)));
});
after(async () => { await historicalInputs?.cleanup(); });
const FAILED_PREFIX =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_MECHANICS_FAILED";

test("current checkout and source v2.3 CLI cannot inherit a historical input context", async () => {
  await assert.rejects(loadFourSystemCurrentStatusObservationChildV23(workspaceRoot),
    { code: "MANIFEST_IDENTITY_DRIFT" });
  const run = spawnSync(process.execPath, [actualCliPath], {
    cwd: historicalInputs.root, env: sanitizedEnvironment(), encoding: "utf8", windowsHide: true
  });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, `${FAILED_PREFIX} UNEXPECTED_ERROR\n`);
});

test("v2.3 supplemental input archive rejects tampering, truncation and valid empty ZIPs", async () => {
  const original = await readFile(FOUR_SYSTEM_V23_ADDITIONAL_ARCHIVE_URL);
  assert.equal(Object.keys(parseFourSystemV23AdditionalArchive(original)).length, 29);
  const changed = Buffer.from(original); changed[Math.floor(changed.length / 2)] ^= 1;
  const { zipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
  for (const bytes of [changed, original.subarray(0, -1), zipSync({})]) {
    assert.throws(() => parseFourSystemV23AdditionalArchive(bytes), /v2.3 additional archive identity changed/u);
  }
});

test("v2.3 rechecks the Western page input and rejects the current page or same-length corruption", async () => {
  const inputs = await createFourSystemV23HistoricalInputs();
  try {
    const relativePath = "packages/western-astrology-rules-preview-draft/src/browser-app/main.ts";
    const target = path.join(inputs.root, relativePath);
    const original = await readFile(target);
    const changed = Buffer.from(original); changed[0] ^= 1;
    for (const bytes of [changed, await readFile(path.join(workspaceRoot, relativePath))]) {
      await writeFile(target, bytes);
      await assert.rejects(loadFourSystemCurrentStatusObservationChildV23(inputs.root),
        { code: "CURRENT_SOURCE_DRIFT" });
    }
  } finally {
    await inputs.cleanup();
  }
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
  const keys = Reflect.ownKeys(value);
  for (let index = 0; index < keys.length; index += 1) {
    assertDeepFrozen(value[keys[index]], seen);
  }
}

test("v2.3 has one fixed canonical persisted identity and only its loader grants the private brand", async () => {
  const built = await buildCurrentFourSystemCurrentStatusObservationChildV23(historicalInputs.root);
  const loaded = await loadFourSystemCurrentStatusObservationChildV23(historicalInputs.root);
  const bytes = await readFile(persistedPath);
  assert.equal(bytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(built.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
  assert.equal(
    bytes.toString("utf8"),
    serializeFourSystemCurrentStatusObservationChildV23(built)
  );
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV23(built), false);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV23(loaded), true);
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV23(structuredClone(loaded)), false);
  assertDeepFrozen(loaded);
});

test("v2.3 directly consumes exactly the branded current v2.2 parent and Western receipt", async () => {
  const child = await buildCurrentFourSystemCurrentStatusObservationChildV23(historicalInputs.root);
  const parent = await loadFourSystemCurrentStatusObservationChildV22(historicalInputs.root);
  const receipt = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    historicalInputs.root
  );
  assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV22(parent), true);
  assert.equal(isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(receipt), true);
  assert.deepEqual(child.artifactBindings, [
    {
      path: testOnly.PARENT_V22.path,
      rawBytes: testOnly.PARENT_V22.rawBytes,
      rawSha256: testOnly.PARENT_V22.rawSha256,
      role: testOnly.PARENT_V22.role,
      semanticDigest: testOnly.PARENT_V22.semanticDigest,
      semanticDigestField: testOnly.PARENT_V22.semanticDigestField
    },
    {
      path: testOnly.WESTERN_RECEIPT.path,
      rawBytes: testOnly.WESTERN_RECEIPT.rawBytes,
      rawSha256: testOnly.WESTERN_RECEIPT.rawSha256,
      role: testOnly.WESTERN_RECEIPT.role,
      semanticDigest: testOnly.WESTERN_RECEIPT.semanticDigest,
      semanticDigestField: testOnly.WESTERN_RECEIPT.semanticDigestField
    }
  ]);
  assert.equal(child.observationBoundary.upstreamPrivateBrandsVerified, 2);
  assert.equal(child.observationBoundary.exactPersistedRawIdentitiesVerified, 2);
  assert.equal(
    child.lineage.parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams,
    true
  );
});

test("private brands cannot be forged by cloning either direct input", async () => {
  const parent = await loadFourSystemCurrentStatusObservationChildV22(historicalInputs.root);
  const receipt = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    historicalInputs.root
  );
  assert.doesNotThrow(() => testOnly.assertUpstreams(parent, receipt));
  assert.throws(
    () => testOnly.assertUpstreams(clone(parent), receipt),
    (error) => error?.code === "PARENT_V22_PRIVATE_PROJECTION_INVALID"
  );
  assert.throws(
    () => testOnly.assertUpstreams(parent, clone(receipt)),
    (error) => error?.code === "WESTERN_RECEIPT_PRIVATE_PROJECTION_INVALID"
  );
});

test("fixed parent and receipt raw identity drift fails closed", () => {
  assert.throws(
    () => testOnly.assertSnapshot({
      path: testOnly.PARENT_V22.path,
      rawBytes: testOnly.PARENT_V22.rawBytes + 1,
      rawSha256: testOnly.PARENT_V22.rawSha256
    }, testOnly.PARENT_V22, "PARENT_V22_RAW_DRIFT"),
    (error) => error?.code === "PARENT_V22_RAW_DRIFT"
  );
  assert.throws(
    () => testOnly.assertSnapshot({
      path: testOnly.WESTERN_RECEIPT.path,
      rawBytes: testOnly.WESTERN_RECEIPT.rawBytes,
      rawSha256: "0".repeat(64)
    }, testOnly.WESTERN_RECEIPT, "WESTERN_RECEIPT_RAW_DRIFT"),
    (error) => error?.code === "WESTERN_RECEIPT_RAW_DRIFT"
  );
});

test("lineage binds v2.2, preserves its Ziwei reason, and appends only the Western receipt reason", async () => {
  const child = await buildCurrentFourSystemCurrentStatusObservationChildV23(historicalInputs.root);
  const parent = await loadFourSystemCurrentStatusObservationChildV22(historicalInputs.root);
  assert.deepEqual(child.lineage.parent, child.artifactBindings[0]);
  assert.equal(child.lineage.parentPreservedUnmodified, true);
  assert.equal(child.lineage.parentMechanicallyCurrent, true);
  assert.equal(child.lineage.parentOverwritten, false);
  assert.equal(child.lineage.parentCurrentVerifierExpectedToFailClosed, false);
  assert.equal(child.lineage.uniqueBlockerClaimed, false);
  assert.deepEqual(
    child.lineage.stalenessReasons.slice(0, 1),
    parent.lineage.stalenessReasons
  );
  assert.equal(child.lineage.stalenessReasons.length, 2);
  assert.equal(child.lineage.stalenessReasons[1].productSystemId, "western-astrology");
  assert.equal(
    child.lineage.stalenessReasons[1].currentEndpointRole,
    testOnly.WESTERN_RECEIPT.role
  );
});

test("Western retains v1.1 and appends the current drift receipt while every gate remains red", async () => {
  const western = (await buildCurrentFourSystemCurrentStatusObservationChildV23(
    historicalInputs.root
  )).systems[2];
  assert.equal(western.currentStatus, testOnly.WESTERN_CURRENT_STATUS);
  assert.deepEqual(
    western.currentEvidence.endpoints.map((entry) => entry.role),
    [testOnly.WESTERN_OBSERVATION_V11.role, testOnly.WESTERN_RECEIPT.role]
  );
  assert.equal(western.currentEvidence.currentEndpointMechanicallyVerified, true);
  assert.equal(western.currentEvidence.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(western.currentEvidence.currentEngineeringManifestMechanicallyVerified, false);
  assert.equal(western.currentEvidence.browserRuntimeEvidence, "not_assessed_by_this_child");
  assert.equal(western.gateSummary.bindingFrozenVerified, 0);
  assert.equal(western.gateSummary.bindingRequired, 28);
  assert.equal(western.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(western.gateSummary.independentExpertsRequired, 2);
  assert.equal(western.productBoundary.releaseIdentity, null);
  assert.equal(western.productBoundary.targetSchema, null);
  assert.equal(western.productBoundary.migrationId, null);
  assert.ok(Object.values(western.authorityBoundary).every((value) => value === false));
});

test("Bazi, Ziwei, Vedic, summary, cross-system policy and governance remain byte-for-byte JSON-equal to v2.2", async () => {
  const child = await buildCurrentFourSystemCurrentStatusObservationChildV23(historicalInputs.root);
  const parent = await loadFourSystemCurrentStatusObservationChildV22(historicalInputs.root);
  assert.deepEqual(child.systems[0], parent.systems[0]);
  assert.deepEqual(child.systems[1], parent.systems[1]);
  assert.deepEqual(child.systems[3], parent.systems[3]);
  assert.deepEqual(child.currentStatusSummary, parent.currentStatusSummary);
  assert.deepEqual(child.crossSystemPolicy, parent.crossSystemPolicy);
  assert.deepEqual(
    child.projectReleaseGovernanceContext,
    parent.projectReleaseGovernanceContext
  );
  assert.deepEqual(child.versionBoundary, parent.versionBoundary);
  assert.deepEqual(child.authorityBoundary, parent.authorityBoundary);
});

test("authority, Western manifest/browser/status and cross-system promotions are rejected after re-digest", async () => {
  const expected = await buildCurrentFourSystemCurrentStatusObservationChildV23(
    historicalInputs.root
  );
  const mutations = [
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => {
      value.systems[2].currentEvidence.currentFullDomainManifestMechanicallyVerified = true;
    },
    (value) => {
      value.systems[2].currentEvidence.currentEngineeringManifestMechanicallyVerified = true;
    },
    (value) => { value.systems[2].currentEvidence.browserRuntimeEvidence = "current"; },
    (value) => { value.systems[2].currentStatus = "formally_admitted"; },
    (value) => { value.systems[2].gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.crossSystemPolicy.generatedModelWinnerSelectionAllowed = true; },
    (value) => { value.versionBoundary.persistedAsCentralRegistry = true; }
  ];
  for (let index = 0; index < mutations.length; index += 1) {
    const candidate = clone(expected);
    mutations[index](candidate);
    candidate.childDigest = computeFourSystemCurrentStatusObservationChildV23Digest(candidate);
    assert.throws(() => testOnly.assertChildBoundary(candidate, expected));
  }
});

test("changes to any non-Western system or the unchanged summary fail exact parent projection", async () => {
  const expected = await buildCurrentFourSystemCurrentStatusObservationChildV23(
    historicalInputs.root
  );
  const mutations = [
    (value) => { value.systems[0].currentStatus = "changed"; },
    (value) => { value.systems[1].currentEvidence.endpoints[0].role = "changed"; },
    (value) => { value.systems[3].gateSummary.bindingRequired = 39; },
    (value) => { value.currentStatusSummary.systemsReleaseReady = 1; }
  ];
  for (let index = 0; index < mutations.length; index += 1) {
    const candidate = clone(expected);
    mutations[index](candidate);
    candidate.childDigest = computeFourSystemCurrentStatusObservationChildV23Digest(candidate);
    assert.throws(() => testOnly.assertChildBoundary(candidate, expected));
  }
});

test("unknown top-level keys, own __proto__ fields and invalid digests fail closed", async () => {
  const expected = await buildCurrentFourSystemCurrentStatusObservationChildV23(
    historicalInputs.root
  );
  const unknown = clone(expected);
  unknown.unexpected = false;
  unknown.childDigest = computeFourSystemCurrentStatusObservationChildV23Digest(unknown);
  assert.throws(
    () => testOnly.assertChildBoundary(unknown, expected),
    (error) => error?.code === "KEY_SET_INVALID"
  );

  const proto = clone(expected);
  Object.defineProperty(proto, "__proto__", {
    configurable: true,
    enumerable: true,
    value: "bound",
    writable: true
  });
  proto.childDigest = computeFourSystemCurrentStatusObservationChildV23Digest(proto);
  assert.throws(
    () => testOnly.assertChildBoundary(proto, expected),
    (error) => error?.code === "KEY_SET_INVALID"
  );

  const digest = clone(expected);
  digest.childDigest = "0".repeat(64);
  assert.throws(
    () => testOnly.assertChildBoundary(digest, expected),
    (error) => error?.code === "CHILD_DIGEST_INVALID"
  );
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

test("canonical capture, digest, exact comparison and key checks resist Array numeric setters and global String replacement", async () => {
  const child = clone(await buildCurrentFourSystemCurrentStatusObservationChildV23(
    historicalInputs.root
  ));
  const originalDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "0");
  const originalString = globalThis.String;
  Object.defineProperty(Array.prototype, "0", {
    configurable: true,
    set() {
      Object.defineProperty(this, "0", {
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
  let keyErrorCode = null;
  try {
    exactResult = testOnly.exactJson(["evil"], ["legit"]);
    digestResult = computeFourSystemCurrentStatusObservationChildV23Digest(child);
    capturedValue = testOnly.captureJson({ values: ["legit"] }).values[0];
    try {
      testOnly.requireExactKeys({ evil: false }, testOnly.ownArray("legit"), "probe");
    } catch (error) {
      keyErrorCode = error?.code ?? null;
    }
  } finally {
    globalThis.String = originalString;
    if (originalDescriptor) {
      Object.defineProperty(Array.prototype, "0", originalDescriptor);
    } else {
      delete Array.prototype[0];
    }
  }
  assert.equal(exactResult, false);
  assert.equal(digestResult, child.childDigest);
  assert.equal(capturedValue, "legit");
  assert.equal(keyErrorCode, "KEY_SET_INVALID");
});

test("local branded projection survives global Promise replacement without hiding the recursive parent-loader boundary", async () => {
  const parent = await loadFourSystemCurrentStatusObservationChildV22(historicalInputs.root);
  const receipt = await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(
    historicalInputs.root
  );
  const originalPromise = globalThis.Promise;
  class ForbiddenPromise {
    constructor() {
      throw new Error("GLOBAL_PROMISE_CONSTRUCTOR_USED");
    }
    static all() {
      throw new Error("GLOBAL_PROMISE_ALL_USED");
    }
  }
  let built;
  try {
    globalThis.Promise = ForbiddenPromise;
    testOnly.assertUpstreams(parent, receipt);
    built = testOnly.buildProjection(parent);
    testOnly.assertChildBoundary(built);
  } finally {
    globalThis.Promise = originalPromise;
  }
  assert.equal(built.childId, testOnly.CHILD_ID);
  assert.equal(built.observationBoundary.upstreamPrivateBrandsVerified, 2);
});

test("raw and semantic persisted identity drift fails before private brand grant", async () => {
  const persisted = await buildCurrentFourSystemCurrentStatusObservationChildV23(
    historicalInputs.root
  );
  assert.throws(
    () => testOnly.assertPersistedIdentity({
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH,
      rawBytes: testOnly.EXPECTED_PERSISTED.rawBytes + 1,
      rawSha256: testOnly.EXPECTED_PERSISTED.rawSha256
    }, persisted),
    (error) => error?.code === "PERSISTED_IDENTITY_DRIFT"
  );
  const changed = clone(persisted);
  changed.childDigest = "0".repeat(64);
  assert.throws(
    () => testOnly.assertPersistedIdentity({
      path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_3_RELATIVE_PATH,
      rawBytes: testOnly.EXPECTED_PERSISTED.rawBytes,
      rawSha256: testOnly.EXPECTED_PERSISTED.rawSha256
    }, changed),
    (error) => error?.code === "PERSISTED_IDENTITY_DRIFT"
  );
});

test("CLI reports calibrated v2.3 claims from its own workspace", () => {
  const outsideCwd = path.parse(workspaceRoot).root;
  const run = spawnSync(process.execPath, [cliPath], {
    cwd: outsideCwd,
    env: sanitizedEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(run.status, 0);
  assert.equal(run.stderr, "");
  const report = JSON.parse(run.stdout);
  assert.equal(report.currentStatusObservationChildV23MechanicallyVerified, true);
  assert.equal(report.parentV22MechanicallyCurrent, true);
  assert.equal(report.parentV22PreservedUnmodified, true);
  assert.equal(report.parentLoaderRecursivelyReverifiedItsUpstreams, true);
  assert.equal(report.uniqueBlockerClaimed, false);
  assert.equal(report.systems.length, 4);
  assert.equal(report.systems[2].productSystemId, "western-astrology");
  assert.equal(report.systems[2].currentStatus, testOnly.WESTERN_CURRENT_STATUS);
  assert.equal(report.systems[2].currentEndpointMechanicallyVerified, true);
  assert.equal(report.systems[2].currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(report.systems[2].currentEngineeringManifestMechanicallyVerified, false);
  assert.equal(report.systems[2].browserRuntimeEvidence, "not_assessed_by_this_child");
  assert.equal(report.exactPersistedRawIdentitiesVerified, 2);
  assert.equal(report.upstreamPrivateBrandsVerified, 2);
  assert.equal(report.systemsFormallyAdmitted, 0);
  assert.equal(report.totalAdmissionGatesSatisfied, 0);
  assert.equal(report.formalCrossSystemComparisonAuthorized, false);
  assert.equal(report.crossFileAtomicSnapshot, false);
  assert.equal(report.mutationEpochAvailableForSchema13, false);
  assert.equal(report.mutationEpochReceipt, null);
  assert.equal(report.intervalMutationExcludedAcrossFiles, false);
  assert.equal(report.abaExcluded, false);
  assert.equal(report.childDigestIsDigitalSignature, false);
  assert.equal(report.releaseReady, false);
  assert.equal(report.publicDeploymentAuthorized, false);
  assert.equal(report.publicReleaseAuthorized, false);
  assert.equal(report.expertClaimsAuthorized, false);
  assert.equal(report.persistedAsCentralRegistry, false);
  assert.equal(report.activeAdmissionEffect, "none");
});

test("CLI rejects operands, NODE_OPTIONS and visible --import preload without leaking paths", () => {
  const cases = [
    {
      args: [cliPath, "unexpected"],
      env: sanitizedEnvironment(),
      code: "ARGUMENTS_FORBIDDEN"
    },
    {
      args: [cliPath],
      env: sanitizedEnvironment({ NODE_OPTIONS: "--trace-warnings" }),
      code: "PRELOAD_ENVIRONMENT_FORBIDDEN"
    },
    {
      args: ["--import=data:text/javascript,void%200", cliPath],
      env: sanitizedEnvironment(),
      code: "PRELOAD_ENVIRONMENT_FORBIDDEN"
    }
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const item = cases[index];
    const run = spawnSync(process.execPath, item.args, {
      cwd: workspaceRoot,
      env: item.env,
      encoding: "utf8",
      windowsHide: true
    });
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, `${FAILED_PREFIX} ${item.code}\n`);
    assert.equal(run.stderr.includes(workspaceRoot), false);
    assert.equal(run.stderr.includes("at "), false);
  }
});

test("importing CLI is silent and preserves a pre-existing process.exitCode", () => {
  const program = `process.exitCode=7;await import(${JSON.stringify(cliUrl)});process.stdout.write(JSON.stringify({exitCode:process.exitCode}));`;
  const run = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", program],
    {
      cwd: path.parse(workspaceRoot).root,
      env: sanitizedEnvironment(),
      encoding: "utf8",
      windowsHide: true
    }
  );
  assert.equal(run.status, 7);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, '{"exitCode":7}');
});

test("the v2.3 source contains no Promise.all, array push or live String(index) construction", async () => {
  const source = await readFile(
    path.join(workspaceRoot, "scripts", "four-system-current-status-observation-child-v2-3-lib.mjs"),
    "utf8"
  );
  assert.doesNotMatch(source, /Promise\.all/u);
  assert.doesNotMatch(source, /\.push\(/u);
  assert.doesNotMatch(source, /String\s*\(\s*index\s*\)/u);
});
