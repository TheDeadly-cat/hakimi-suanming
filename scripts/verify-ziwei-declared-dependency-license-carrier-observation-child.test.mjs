import assert from "node:assert/strict";
import { Buffer as NodeBuffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ZIWEI_DECLARED_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH,
  buildCurrentZiweiDeclaredDependencyLicenseCarrierChild,
  computeZiweiDeclaredDependencyLicenseCarrierChildDigest,
  getZiweiDeclaredDependencyLicenseCarrierChildSummary,
  isVerifiedZiweiDeclaredDependencyLicenseCarrierChild,
  loadZiweiDeclaredDependencyLicenseCarrierChild,
  parseZiweiDeclaredDependencyLicenseCarrierChildArtifact,
  serializeZiweiDeclaredDependencyLicenseCarrierChild,
  verifyZiweiDeclaredDependencyLicenseCarrierChildLedger,
  ziweiDeclaredDependencyLicenseCarrierChildTestOnly
} from "./ziwei-declared-dependency-license-carrier-observation-child-lib.mjs";

const WORKSPACE_ROOT = ziweiDeclaredDependencyLicenseCarrierChildTestOnly.DEFAULT_WORKSPACE_ROOT;
const CLI_PATH = join(
  WORKSPACE_ROOT,
  "scripts",
  "verify-ziwei-declared-dependency-license-carrier-observation-child.mjs"
);

function mutableCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function refreshDigest(child) {
  child.childDigest = computeZiweiDeclaredDependencyLicenseCarrierChildDigest(child);
  return child;
}

function runCli(extraArgs = [], envPatch = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...extraArgs], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: undefined, NODE_PATH: undefined, ...envPatch }
  });
}

test("fixed child loader verifies the exact persisted identity and private brand", async () => {
  const verified = await loadZiweiDeclaredDependencyLicenseCarrierChild();
  assert.equal(isVerifiedZiweiDeclaredDependencyLicenseCarrierChild(verified), true);
  assert.deepEqual(getZiweiDeclaredDependencyLicenseCarrierChildSummary(verified), {
    childId: "hakimi.ziwei.declared-dependency-license-carrier-observation-child/1.0.0",
    childDigest: "714b5e0b1ff2c75a85bd3804ca53f01b07ad2e663c0f89b381b3cdcbb4df0c27",
    status: "seven_declared_local_license_carriers_observed_unbound_no_legal_conclusion",
    createdAt: "2026-09-01T12:22:00.000Z",
    dependencyCarrierCount: 7,
    bindingFrozenVerified: 0,
    bindingRequired: 27,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    rawBytes: 14812,
    rawSha256: "201c5b85cf94bf9467ff18e5391fcbdfee4de54893c5fe997994a39c1f0685e8"
  });
  const forged = { ...verified };
  assert.equal(isVerifiedZiweiDeclaredDependencyLicenseCarrierChild(forged), false);
  assert.throws(
    () => getZiweiDeclaredDependencyLicenseCarrierChildSummary(forged),
    (reason) => reason?.code === "PRIVATE_BRAND_MISSING"
  );
});

test("child binds exactly the six-node iztro closure plus direct zod carrier", async () => {
  const child = (await loadZiweiDeclaredDependencyLicenseCarrierChild()).child;
  assert.deepEqual(
    child.dependencyCarriers.map((entry) => [
      entry.ordinal,
      entry.relationship,
      entry.packageName,
      entry.version,
      entry.lockEntry.declaredLicense,
      entry.licenseCarrier.bodyCopiedIntoChild,
      entry.licenseCarrier.exactQuoteStoredInChild
    ]),
    [
      [1, "iztro_declared_lock_closure", "@babel/runtime", "7.29.7", "MIT", false, false],
      [2, "iztro_declared_lock_closure", "dayjs", "1.11.21", "MIT", false, false],
      [3, "iztro_declared_lock_closure", "i18next", "23.16.8", "MIT", false, false],
      [4, "iztro_declared_lock_closure", "iztro", "2.5.8", "MIT", false, false],
      [5, "iztro_declared_lock_closure", "lunar-lite", "0.2.8", "MIT", false, false],
      [6, "iztro_declared_lock_closure", "lunar-typescript", "1.8.6", "MIT", false, false],
      [7, "ziwei_adapter_direct_dependency_outside_iztro_closure", "zod", "4.4.3", "MIT", false, false]
    ]
  );
  assert.equal(child.observationScope.iztroDeclaredClosureNodeCount, 6);
  assert.equal(child.observationScope.observedDependencyCarrierCount, 7);
  assert.equal(child.observationScope.completeInstalledRuntimeClosureBound, false);
  assert.equal(child.observationScope.buildToolingDependencyClosureCovered, false);
  assert.equal(child.observationScope.fortelCovered, false);
});

test("child keeps rights, authority, release, mutation, and runtime trust red", async () => {
  const child = (await loadZiweiDeclaredDependencyLicenseCarrierChild()).child;
  assert.deepEqual(child.gateSummary, {
    bindingFrozenVerified: 0,
    bindingRequired: 27,
    carrierRightsEstablished: 0,
    dependenciesExpected: 7,
    dependenciesObserved: 7,
    exactQuotesStored: 0,
    expertReviewsVerified: 0,
    licenseCarrierEndpointsVerified: 7,
    packageManifestsVerified: 7,
    redistributionAuthorizations: 0,
    sourceBodiesCopied: 0,
    subjectFullySatisfied: 0,
    versionRightsEstablished: 0,
    workRightsEstablished: 0
  });
  for (const key of [
    "licenseAuthenticityEstablished",
    "licenseApplicabilityEstablished",
    "workRightsEstablished",
    "versionRightsEstablished",
    "carrierRightsEstablished",
    "rightsLegalConclusionEstablished",
    "redistributionAuthorized",
    "noticeObligationSatisfied"
  ]) assert.equal(child.rightsBoundary[key], false, key);
  for (const key of Object.keys(child.authorityBoundary)) {
    assert.equal(child.authorityBoundary[key], false, key);
  }
  assert.equal(child.observationBoundary.mutationEpochAvailable, false);
  assert.equal(child.observationBoundary.crossFileAtomicSnapshotEstablished, false);
  assert.equal(child.observationBoundary.intervalMutationExcluded, false);
  assert.equal(child.observationBoundary.abaExcluded, false);
  assert.equal(child.runtimeTrustBoundary.hiddenPreEvaluationCodeExecutionExcluded, false);
  assert.equal(child.runtimeTrustBoundary.nodeRuntimeIdentityEstablished, false);
  assert.equal(child.runtimeTrustBoundary.loaderIdentityEstablished, false);
  assert.equal(child.runtimeTrustBoundary.launcherIdentityEstablished, false);
  assert.equal(child.runtimeTrustBoundary.cliOutputTrustedAttestation, false);
  assert.equal(child.runtimeTrustBoundary.visibleGuardIsSecurityBoundary, false);
  assert.equal(child.runtimeTrustBoundary.assumesNoArbitraryPreEvaluationCodeExecution, true);
  assert.equal(child.runtimeTrustBoundary.selectedChildIdentityBindsCliImplementation, false);
});

test("persisted artifact is the unique serialized child and contains no copied license prose", async () => {
  const verified = await loadZiweiDeclaredDependencyLicenseCarrierChild();
  const source = await readFile(
    join(WORKSPACE_ROOT, ZIWEI_DECLARED_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH),
    "utf8"
  );
  assert.equal(source, serializeZiweiDeclaredDependencyLicenseCarrierChild(verified.child));
  assert.equal(source.includes("Permission is hereby granted"), false);
  assert.equal(source.includes("THE SOFTWARE IS PROVIDED"), false);
});

test("current workspace reconstruction is identity-exact", async () => {
  const current = await buildCurrentZiweiDeclaredDependencyLicenseCarrierChild();
  const persisted = (await loadZiweiDeclaredDependencyLicenseCarrierChild()).child;
  assert.equal(
    serializeZiweiDeclaredDependencyLicenseCarrierChild(current),
    serializeZiweiDeclaredDependencyLicenseCarrierChild(persisted)
  );
});

test("future createdAt label is rejected even with a recomputed self digest", async () => {
  const child = mutableCopy((await loadZiweiDeclaredDependencyLicenseCarrierChild()).child);
  child.createdAt = "2026-09-01T12:22:29.818Z";
  refreshDigest(child);
  await assert.rejects(
    verifyZiweiDeclaredDependencyLicenseCarrierChildLedger(child),
    (reason) => reason?.code === "FUTURE_CREATED_AT_FORBIDDEN"
  );
});

test("untrusted local clock cannot be promoted to time authority", async () => {
  const child = mutableCopy((await loadZiweiDeclaredDependencyLicenseCarrierChild()).child);
  child.timeBoundary.trustedTimestampEstablished = true;
  refreshDigest(child);
  await assert.rejects(
    verifyZiweiDeclaredDependencyLicenseCarrierChildLedger(child),
    (reason) => reason?.code === "TIME_AUTHORITY_ELEVATION_FORBIDDEN"
  );
});

test("rights, runtime, unknown-field, and selected package elevations fail closed", async (context) => {
  const baseline = (await loadZiweiDeclaredDependencyLicenseCarrierChild()).child;
  const mutations = [
    ["rights legal promotion", (child) => { child.rightsBoundary.rightsLegalConclusionEstablished = true; }],
    ["runtime attestation promotion", (child) => { child.runtimeTrustBoundary.cliOutputTrustedAttestation = true; }],
    ["unknown field", (child) => { child.unboundClaim = true; }],
    ["package version drift", (child) => { child.dependencyCarriers[6].version = "4.4.4"; }],
    ["zod closure laundering", (child) => { child.dependencyCarriers[6].relationship = "iztro_declared_lock_closure"; }]
  ];
  for (const [name, mutate] of mutations) {
    await context.test(name, async () => {
      const child = mutableCopy(baseline);
      mutate(child);
      refreshDigest(child);
      await assert.rejects(
        verifyZiweiDeclaredDependencyLicenseCarrierChildLedger(child),
        (reason) => reason?.code === "CHILD_CONTRACT_MISMATCH"
      );
    });
  }
});

test("strict parser rejects duplicate JSON keys", () => {
  assert.throws(
    () => parseZiweiDeclaredDependencyLicenseCarrierChildArtifact({
      path: "duplicate.json",
      bytes: NodeBuffer.from('{"schemaVersion":"1","schemaVersion":"2"}', "utf8")
    }),
    (reason) => reason?.code !== undefined
  );
});

test("fixed CLI succeeds only without operands or visible preload inputs", async (context) => {
  const success = runCli();
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /^ZIWEI_DECLARED_DEPENDENCY_LICENSE_CARRIER_CHILD_OK /u);

  await context.test("operand rejected", () => {
    const result = runCli(["unexpected"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /"errorCode":"ARGUMENTS_FORBIDDEN"/u);
  });
  await context.test("NODE_OPTIONS rejected", () => {
    const result = runCli([], { NODE_OPTIONS: "--no-warnings" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /"errorCode":"PRELOAD_ENVIRONMENT_FORBIDDEN"/u);
  });
  await context.test("NODE_PATH rejected", () => {
    const result = runCli([], { NODE_PATH: WORKSPACE_ROOT });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /"errorCode":"PRELOAD_ENVIRONMENT_FORBIDDEN"/u);
  });
});

test("visible preload with Array.prototype.some sabotage reaches the indexed guard", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ziwei-carrier-preload-"));
  try {
    const poisonPath = join(directory, "poison.cjs");
    await writeFile(
      poisonPath,
      'Array.prototype.some = function () { throw new Error("SABOTAGED_SOME"); };\n',
      "utf8"
    );
    const result = runCli([], { NODE_OPTIONS: "--require=" + poisonPath });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /"errorCode":"PRELOAD_ENVIRONMENT_FORBIDDEN"/u);
    assert.doesNotMatch(result.stderr, /SABOTAGED_SOME/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("captured critical intrinsics survive post-import prototype sabotage", () => {
  const source = String.raw`
    const m = await import('./scripts/ziwei-declared-dependency-license-carrier-observation-child-lib.mjs');
    const verified = await m.loadZiweiDeclaredDependencyLicenseCarrierChild();
    const originals = {
      bufferFrom: Buffer.from,
      finite: Number.isFinite,
      objectIs: Object.is,
      dateParse: Date.parse,
      arrayMap: Array.prototype.map,
      arraySplice: Array.prototype.splice,
      repeat: String.prototype.repeat,
      regexpTest: RegExp.prototype.test,
      decoderDecode: TextDecoder.prototype.decode
    };
    const poisoned = () => { throw new Error('POISONED_INTRINSIC'); };
    try {
      Buffer.from = poisoned;
      Number.isFinite = poisoned;
      Object.is = poisoned;
      Date.parse = poisoned;
      Array.prototype.map = poisoned;
      Array.prototype.splice = poisoned;
      String.prototype.repeat = poisoned;
      RegExp.prototype.test = poisoned;
      TextDecoder.prototype.decode = poisoned;
      m.ziweiDeclaredDependencyLicenseCarrierChildTestOnly.validateTimeBoundary(verified.child);
      const decoded = m.ziweiDeclaredDependencyLicenseCarrierChildTestOnly.decodeUtf8(
        new Uint8Array([111, 107]),
        'intrinsic probe'
      );
      if (decoded !== 'ok') throw new Error('DECODE_DRIFT');
      if (m.computeZiweiDeclaredDependencyLicenseCarrierChildDigest(verified.child) !== verified.child.childDigest) throw new Error('DIGEST_DRIFT');
      if (!m.serializeZiweiDeclaredDependencyLicenseCarrierChild(verified.child).endsWith('\n')) throw new Error('SERIALIZATION_DRIFT');
    } finally {
      Buffer.from = originals.bufferFrom;
      Number.isFinite = originals.finite;
      Object.is = originals.objectIs;
      Date.parse = originals.dateParse;
      Array.prototype.map = originals.arrayMap;
      Array.prototype.splice = originals.arraySplice;
      String.prototype.repeat = originals.repeat;
      RegExp.prototype.test = originals.regexpTest;
      TextDecoder.prototype.decode = originals.decoderDecode;
    }
    process.stdout.write('INTRINSICS_OK\n');
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: undefined, NODE_PATH: undefined }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "INTRINSICS_OK\n");
});

test("transitive strict parser prototype poisoning fails closed instead of attesting", () => {
  const source = String.raw`
    const m = await import('./scripts/ziwei-declared-dependency-license-carrier-observation-child-lib.mjs');
    await m.loadZiweiDeclaredDependencyLicenseCarrierChild();
    const original = Map.prototype.has;
    Map.prototype.has = function () { throw new Error('POISONED_TRANSITIVE_PARSER'); };
    let rejected = false;
    try {
      await m.buildCurrentZiweiDeclaredDependencyLicenseCarrierChild();
    } catch (reason) {
      rejected = reason?.code === 'JSON_INVALID';
    } finally {
      Map.prototype.has = original;
    }
    if (!rejected) throw new Error('TRANSITIVE_POISON_DID_NOT_FAIL_CLOSED');
    process.stdout.write('TRANSITIVE_POISON_FAIL_CLOSED\n');
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: undefined, NODE_PATH: undefined }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "TRANSITIVE_POISON_FAIL_CLOSED\n");
});
