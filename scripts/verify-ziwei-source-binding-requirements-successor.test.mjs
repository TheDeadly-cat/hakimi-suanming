import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH,
  buildExpectedZiweiSourceBindingRequirementsSuccessor,
  computeZiweiSourceBindingRequirementsSuccessorDigest,
  isVerifiedZiweiSourceBindingRequirementsSuccessor,
  loadZiweiSourceBindingRequirementsSuccessor,
  parseZiweiSourceBindingRequirementsSuccessorJsonBytes,
  readZiweiSourceBindingRequirementsPredecessor,
  serializeZiweiSourceBindingRequirementsSuccessor,
  verifyZiweiSourceBindingRequirementsSuccessorLedger,
  ziweiSourceBindingRequirementsSuccessorTestOnly as fixed
} from "./ziwei-source-binding-requirements-successor-lib.mjs";
import {
  loadZiweiDeclaredDependencyLicenseCarrierChild
} from "./ziwei-declared-dependency-license-carrier-observation-child-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARTIFACT = path.resolve(
  ROOT,
  ...ZIWEI_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH.split("/")
);
const CLI = path.resolve(
  ROOT,
  "scripts",
  "verify-ziwei-source-binding-requirements-successor.mjs"
);
const persistedBytes = await readFile(ARTIFACT);
const persisted = JSON.parse(persistedBytes.toString("utf8"));
const predecessorResult = await readZiweiSourceBindingRequirementsPredecessor(ROOT);
const predecessor = predecessorResult.ledger;
const child = await loadZiweiDeclaredDependencyLicenseCarrierChild();

function clone(value = persisted) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.ledgerDigest = computeZiweiSourceBindingRequirementsSuccessorDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code);
}

function cleanEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return { ...env, ...overrides };
}

function runCli(args = [], options = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: options.cwd ?? ROOT,
    env: cleanEnv(options.env),
    encoding: "utf8"
  });
}

test("current Ziwei source requirements v1.1 successor loads with private brand", async () => {
  const result = await loadZiweiSourceBindingRequirementsSuccessor();
  assert.equal(isVerifiedZiweiSourceBindingRequirementsSuccessor(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.ledgerId, fixed.LEDGER_ID);
  assert.equal(result.ledgerDigest, persisted.ledgerDigest);
  assert.equal(result.predecessorRemainsFormalCurrent, true);
  assert.equal(result.successorIsFormalCurrent, false);
  assert.equal(result.successorActiveEffect, "none");
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.bindingRequired, 27);
  assert.equal(result.partialCandidatesAttached, 2);
  assert.equal(result.subjectFullySatisfied, 0);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.deepEqual(result.childArtifact, {
    path: fixed.CHILD.path,
    rawBytes: fixed.CHILD.rawBytes,
    rawSha256: fixed.CHILD.rawSha256
  });
});

test("persisted raw canonical and domain-separated identities are exact", () => {
  assert.equal(persistedBytes.byteLength, fixed.EXPECTED_PERSISTED_RAW.rawBytes);
  assert.equal(
    createHash("sha256").update(persistedBytes).digest("hex"),
    fixed.EXPECTED_PERSISTED_RAW.rawSha256
  );
  const expected = buildExpectedZiweiSourceBindingRequirementsSuccessor(predecessor, child);
  assert.deepEqual(persisted, expected);
  assert.equal(
    persistedBytes.toString("utf8"),
    serializeZiweiSourceBindingRequirementsSuccessor(persisted, predecessor, child)
  );
  assert.equal(
    persisted.ledgerDigest,
    computeZiweiSourceBindingRequirementsSuccessorDigest(persisted)
  );
});

test("HKO stays canonical-exact first and only rights target changes", () => {
  assert.equal(persisted.subjects.length, 27);
  assert.equal(persisted.candidateEvidenceBindings.length, 2);
  assert.deepEqual(
    persisted.candidateEvidenceBindings[0],
    predecessor.candidateEvidenceBindings[0]
  );
  assert.equal(
    persisted.candidateEvidenceBindings[1].subjectId,
    fixed.TARGET_SUBJECT_ID
  );
  assert.equal(
    persisted.candidateEvidenceBindings[1].candidateId,
    fixed.CANDIDATE_ID
  );
  assert.deepEqual(persisted.candidateEvidenceBindings[1].evidenceArtifact, {
    path: fixed.CHILD.path,
    rawBytes: 14_812,
    rawSha256: "201c5b85cf94bf9467ff18e5391fcbdfee4de54893c5fe997994a39c1f0685e8",
    childId: fixed.CHILD.childId,
    childDigest: "714b5e0b1ff2c75a85bd3804ca53f01b07ad2e663c0f89b381b3cdcbb4df0c27"
  });
  let changes = 0;
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    const before = predecessor.subjects[index];
    const after = persisted.subjects[index];
    assert.equal(after.subjectId, before.subjectId);
    if (before.subjectId === fixed.TARGET_SUBJECT_ID) {
      changes += 1;
      assert.equal(after.bindingState, "candidate_only_unbound");
      assert.deepEqual(after.sourceCandidateIds, [fixed.CANDIDATE_ID]);
      assert.equal(after.subjectFullySatisfied, false);
      assert.equal(after.exactQuoteStored, false);
      assert.equal(after.exactLocatorEstablished, false);
      assert.equal(after.workRightsEstablished, false);
      assert.equal(after.editionRightsEstablished, false);
      assert.equal(after.carrierRightsEstablished, false);
      assert.equal(after.rightsLegalConclusion, "not_established");
      assert.deepEqual(after.expertReviewIds, []);
      assert.equal(after.frozenBindingId, null);
    } else {
      assert.deepEqual(after, before);
    }
  }
  assert.equal(changes, 1);
});

test("legacy governance time integrity cross-system and runtime trust remain fail closed", () => {
  assert.deepEqual(persisted.releaseGovernance, {
    activeLine: "legacy-v13",
    expertClaimsAuthorized: false,
    migrationId: null,
    mutationEpochAvailableForSchema13: false,
    mutationEpochBoundaryRequired: true,
    mutationEpochReceipt: null,
    publicDeploymentAuthorized: false,
    targetSchema: 13
  });
  assert.equal(persisted.createdAt, "2026-09-01T12:22:20.000Z");
  assert.equal(
    persisted.timeBoundary.createdAtUpperBoundObservedOnSameUntrustedLocalClock,
    "2026-09-01T12:22:29.817Z"
  );
  assert.equal(persisted.timeBoundary.trustedTimestampEstablished, false);
  for (const value of Object.values(persisted.crossSystemIsolationBoundary)) {
    assert.equal(value, false);
  }
  assert.deepEqual(persisted.runtimeTrustBoundary, {
    assumesNoArbitraryPreEvaluationCodeExecution: true,
    cliOutputTrustedAttestation: false,
    fixedPathCliImplementationBoundBySuccessorIdentity: false,
    hiddenPreEvaluationCodeExecutionExcluded: false,
    launcherIntegrityEstablished: false,
    loaderIdentityEstablished: false,
    nodeRuntimeIdentityEstablished: false,
    visibleGuardIsSecurityBoundary: false
  });
  assert.equal(persisted.integrityBoundary.mutationEpochAvailable, false);
  assert.equal(persisted.integrityBoundary.mutationEpochReceipt, null);
  assert.equal(persisted.integrityBoundary.crossFileAtomicSnapshotEstablished, false);
  assert.equal(persisted.integrityBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(persisted.integrityBoundary.abaExcluded, false);
  for (const [key, value] of Object.entries(persisted.authorityBoundary)) {
    assert.equal(value, false, key);
  }
});

test("private child brand cannot be forged", () => {
  const forged = JSON.parse(JSON.stringify(child));
  expectCode(
    () => buildExpectedZiweiSourceBindingRequirementsSuccessor(predecessor, forged),
    "CHILD_PRIVATE_BRAND_REQUIRED"
  );
  expectCode(
    () => verifyZiweiSourceBindingRequirementsSuccessorLedger(persisted, predecessor, forged),
    "CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("promotion mutation reordering cross-system and unknown fields fail closed", () => {
  const cases = [
    ["FORMAL_STATE_PROMOTION_FORBIDDEN", (x) => { x.formalStateBoundary.successorIsFormalCurrent = true; }],
    ["GATE_PROMOTION_FORBIDDEN", (x) => { x.gateSummary.bindingFrozenVerified = 1; }],
    ["AUTHORITY_PROMOTION_FORBIDDEN", (x) => { x.authorityBoundary.rightsLegalConclusionEstablished = true; }],
    ["CROSS_SYSTEM_INHERITANCE_FORBIDDEN", (x) => { x.crossSystemIsolationBoundary.westernAuthorityInherited = true; }],
    ["RUNTIME_TRUST_OVERCLAIM_FORBIDDEN", (x) => { x.runtimeTrustBoundary.loaderIdentityEstablished = true; }],
    ["RELEASE_GOVERNANCE_DRIFT", (x) => { x.releaseGovernance.mutationEpochAvailableForSchema13 = true; }],
    ["INTEGRITY_OVERCLAIM_FORBIDDEN", (x) => { x.integrityBoundary.abaExcluded = true; }],
    ["HKO_CANDIDATE_ORDER_OR_IDENTITY_DRIFT", (x) => { x.candidateEvidenceBindings.reverse(); }],
    ["NON_TARGET_SUBJECT_DRIFT", (x) => { x.subjects[0].title = "drift"; }],
    ["TARGET_SUBJECT_BOUNDARY_DRIFT", (x) => {
      const target = x.subjects.find((entry) => entry.subjectId === fixed.TARGET_SUBJECT_ID);
      target.carrierRightsEstablished = true;
    }],
    ["SUCCESSOR_CONTRACT_MISMATCH", (x) => { x.unexpected = true; }]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const candidate = clone();
    cases[index][1](candidate);
    reseal(candidate);
    expectCode(
      () => verifyZiweiSourceBindingRequirementsSuccessorLedger(
        candidate,
        predecessor,
        child
      ),
      cases[index][0]
    );
  }
});

test("strict parser rejects duplicate keys and hostile byte wrappers", () => {
  const duplicate = Buffer.from(
    persistedBytes.toString("utf8").replace(
      '  "schemaVersion": "1.1.0",',
      '  "schemaVersion": "forged",\n  "schemaVersion": "1.1.0",'
    ),
    "utf8"
  );
  assert.throws(
    () => parseZiweiSourceBindingRequirementsSuccessorJsonBytes(duplicate),
    /重复|duplicate|严格 JSON/u
  );
  const proxied = new Proxy(new Uint8Array(persistedBytes), {});
  assert.throws(
    () => parseZiweiSourceBindingRequirementsSuccessorJsonBytes(proxied),
    /不接受|内部槽|严格 JSON|buffer/u
  );
});

test("captured critical intrinsics survive post-import poisoning", () => {
  const originalJsonParse = JSON.parse;
  const originalDefine = Object.defineProperty;
  const originalDateParse = Date.parse;
  const originalRegExpTest = RegExp.prototype.test;
  const originalCwd = process.cwd;
  const hashPrototype = Object.getPrototypeOf(createHash("sha256"));
  const originalUpdate = hashPrototype.update;
  const originalDigest = hashPrototype.digest;
  try {
    JSON.parse = () => { throw new Error("poisoned JSON.parse"); };
    Object.defineProperty = () => { throw new Error("poisoned defineProperty"); };
    Date.parse = () => Number.NaN;
    RegExp.prototype.test = () => false;
    process.cwd = () => os.tmpdir();
    hashPrototype.update = () => { throw new Error("poisoned hash update"); };
    hashPrototype.digest = () => { throw new Error("poisoned hash digest"); };
    const verified = verifyZiweiSourceBindingRequirementsSuccessorLedger(
      persisted,
      predecessor,
      child
    );
    assert.equal(verified.ledgerDigest, persisted.ledgerDigest);
  } finally {
    JSON.parse = originalJsonParse;
    Object.defineProperty = originalDefine;
    Date.parse = originalDateParse;
    RegExp.prototype.test = originalRegExpTest;
    process.cwd = originalCwd;
    hashPrototype.update = originalUpdate;
    hashPrototype.digest = originalDigest;
  }
});

test("fixed-path CLI succeeds and rejects visible unsafe invocation", () => {
  const ok = runCli();
  assert.equal(ok.status, 0, ok.stderr);
  const summary = JSON.parse(ok.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.bindings, "0/27");
  assert.equal(summary.predecessorRemainsFormalCurrent, true);
  assert.equal(summary.successorIsFormalCurrent, false);
  assert.equal(summary.successorActiveEffect, "none");
  assert.notEqual(runCli(["extra"]).status, 0);
  assert.notEqual(runCli([], { env: { NODE_OPTIONS: "--trace-warnings" } }).status, 0);
  assert.notEqual(runCli([], { env: { NODE_PATH: ROOT } }).status, 0);
  assert.notEqual(runCli([], { cwd: os.tmpdir() }).status, 0);
  const visible = spawnSync(
    process.execPath,
    ["--import=data:text/javascript,", CLI],
    { cwd: ROOT, env: cleanEnv(), encoding: "utf8" }
  );
  assert.notEqual(visible.status, 0);
  assert.match(visible.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/);
});

test("CLI visible guard survives Array.prototype.some first-call sabotage", () => {
  const payload =
    "data:text/javascript,const o=Array.prototype.some%3Blet n=0%3B"
    + "Array.prototype.some=function(...a)%7Bif(n%2B%2B===0)%7B"
    + "Array.prototype.some=o%3Breturn false%7Dreturn Reflect.apply(o,this,a)%7D";
  const run = spawnSync(
    process.execPath,
    [`--import=${payload}`, CLI],
    { cwd: ROOT, env: cleanEnv(), encoding: "utf8" }
  );
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/);
  assert.equal(run.stdout, "");
});

test("preload can erase visible execArgv so launcher trust correctly remains false", () => {
  const run = spawnSync(
    process.execPath,
    ["--import=data:text/javascript,process.execArgv.length%3D0", CLI],
    { cwd: ROOT, env: cleanEnv(), encoding: "utf8" }
  );
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).ok, true);
  assert.equal(persisted.runtimeTrustBoundary.launcherIntegrityEstablished, false);
  assert.equal(persisted.runtimeTrustBoundary.visibleGuardIsSecurityBoundary, false);
  assert.equal(persisted.runtimeTrustBoundary.hiddenPreEvaluationCodeExecutionExcluded, false);
});
