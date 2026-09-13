import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, before, test } from "node:test";

import {
  FourSystemCurrentStatusObservationChildV29Error,
  buildCurrentFourSystemCurrentStatusObservationChildV29,
  computeFourSystemCurrentStatusObservationChildV29Digest,
  fourSystemCurrentStatusObservationChildV29TestOnly as testOnly,
  getFourSystemCurrentStatusObservationChildV29Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV29,
  loadFourSystemCurrentStatusObservationChildV29,
  serializeFourSystemCurrentStatusObservationChildV29
} from "./four-system-current-status-observation-child-v2-9-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV28
} from "./four-system-current-status-observation-child-v2-8-lib.mjs";
import {
  loadBaziCurrentMachineIdentitySuccessorV11
} from "./bazi-current-machine-identity-successor-v1-1-lib.mjs";
import { attachCurrentFourSystemCli } from "./four-system-v22-history.test-fixture.mjs";
import {
  FOUR_SYSTEM_V29_ADDITIONAL_ARCHIVE_URL,
  createFourSystemV29HistoricalInputs,
  parseFourSystemV29AdditionalArchive
} from "./four-system-v29-history.test-fixture.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const ACTUAL_CLI = path.join(
  HERE,
  "verify-four-system-current-status-observation-child-v2-9.mjs"
);
const ARTIFACT = path.join(
  ROOT,
  "content",
  "system-admission",
  "four-system-current-status-observation-child.v2.9.0.json"
);
const PRELOAD_FAILURE =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_FAILED"
  + " VISIBLE_PRELOAD_OPTIONS_REJECTED\n";
let historicalInputs;
let CLI;
before(async () => {
  historicalInputs = await createFourSystemV29HistoricalInputs();
  CLI = await attachCurrentFourSystemCli(historicalInputs, 9);
  assert.deepEqual(await readFile(ARTIFACT), await readFile(path.join(historicalInputs.root,
    "content/system-admission/four-system-current-status-observation-child.v2.9.0.json")));
});
after(async () => { await historicalInputs?.cleanup(); });

test("current v2.9 loader and source CLI cannot inherit historical input success", async () => {
  await assert.rejects(loadFourSystemCurrentStatusObservationChildV29(ROOT),
    { code: "MANIFEST_IDENTITY_DRIFT" });
  const run = spawnSync(process.execPath, [ACTUAL_CLI], {
    cwd: historicalInputs.root, encoding: "utf8", env: cleanEnv(), windowsHide: true
  });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_FAILED VERIFICATION_FAILED\n");
});

test("v2.9 supplemental archive rejects tampering, truncation and a valid empty ZIP", async () => {
  const original = await readFile(FOUR_SYSTEM_V29_ADDITIONAL_ARCHIVE_URL);
  assert.equal(parseFourSystemV29AdditionalArchive(original).manifest.files.length, 4);
  const changed = Buffer.from(original); changed[Math.floor(changed.length / 2)] ^= 1;
  const { zipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
  for (const bytes of [changed, original.subarray(0, -1), zipSync({})]) {
    assert.throws(() => parseFourSystemV29AdditionalArchive(bytes), /v2.9 additional archive identity changed/u);
  }
});

test("v2.9 refuses altered or missing Bazi timestamp erratum bytes", async () => {
  const inputs = await createFourSystemV29HistoricalInputs();
  const relativePath = "content/system-admission/bazi-expert-current-line-created-at-label-erratum.v1.0.0.json";
  try {
    const target = path.join(inputs.root, relativePath);
    const changed = Buffer.from(await readFile(target));
    assert.equal(changed.at(-1), 0x0a);
    changed[changed.length - 1] = 0x20;
    await writeFile(target, changed);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV29(inputs.root),
      { code: "PERSISTED_ERRATUM_RAW_DRIFT" });
    await rm(target);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV29(inputs.root), (error) =>
      error.code === "ARTIFACT_UNREADABLE" && error.cause?.code === "ENOENT"
        && error.message.includes(relativePath));
  } finally {
    await inputs.cleanup();
  }
});

let fixturePromise;

function fixture() {
  if (!fixturePromise) {
    fixturePromise = Promise.all([
      loadFourSystemCurrentStatusObservationChildV29(historicalInputs.root),
      loadFourSystemCurrentStatusObservationChildV28(historicalInputs.root),
      loadBaziCurrentMachineIdentitySuccessorV11(historicalInputs.root),
      buildCurrentFourSystemCurrentStatusObservationChildV29(historicalInputs.root)
    ]).then(([loaded, parent, successor, built]) => ({
      loaded,
      parent,
      successor,
      built
    }));
  }
  return fixturePromise;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function codeIs(expected) {
  return (error) =>
    error instanceof FourSystemCurrentStatusObservationChildV29Error
    && error.code === expected;
}

function reseal(value) {
  value.childDigest =
    computeFourSystemCurrentStatusObservationChildV29Digest(value);
  return value;
}

function bySystem(value, id) {
  return value.systems.find((system) => system.productSystemId === id);
}

function binding(pin) {
  return {
    role: pin.role,
    path: pin.path,
    rawBytes: pin.rawBytes,
    rawSha256: pin.rawSha256,
    semanticDigestField: pin.semanticDigestField,
    semanticDigest: pin.semanticDigest
  };
}

function cleanEnv() {
  const env = { ...process.env, NODE_OPTIONS: "" };
  delete env.NODE_PATH;
  return env;
}

function assertActuallyDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) {
      assertActuallyDeepFrozen(descriptor.value, seen);
    }
  }
}

test(
  "exact persisted loader grants the v2.9 private brand and builder does not",
  async () => {
    const { loaded, built } = await fixture();
    assert.deepEqual(built, loaded);
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV29(built),
      false
    );
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV29(loaded),
      true
    );
    assertActuallyDeepFrozen(loaded);
  }
);

test(
  "persisted raw SHA self digest and canonical LF materialization are frozen",
  async () => {
    const bytes = await readFile(ARTIFACT);
    const parsed = JSON.parse(bytes.toString("utf8"));
    assert.equal(bytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
    assert.equal(sha256(bytes), testOnly.EXPECTED_PERSISTED.rawSha256);
    assert.equal(parsed.childDigest, testOnly.EXPECTED_PERSISTED.childDigest);
    assert.equal(
      parsed.childDigest,
      computeFourSystemCurrentStatusObservationChildV29Digest(parsed)
    );
    assert.equal(
      bytes.toString("utf8"),
      serializeFourSystemCurrentStatusObservationChildV29(parsed)
    );
  }
);

test("createdAt is canonical but remains an untrusted clock label", async () => {
  const { loaded } = await fixture();
  assert.equal(loaded.createdAt, testOnly.CREATED_AT);
  assert.match(
    loaded.createdAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u
  );
  assert.equal(new Date(Date.parse(loaded.createdAt)).toISOString(), loaded.createdAt);
  assert.equal(loaded.createdAt < testOnly.CREATED_AT_UPPER_BOUND, true);
  assert.equal(loaded.lineage.childCreatedAtClock, "untrusted_local_clock_label");
  assert.equal(loaded.lineage.trustedTimestampEstablished, false);
  assert.equal(loaded.lineage.externalTimeAuthorityEstablished, false);
  assert.equal(loaded.lineage.crossArtifactTemporalOrderEstablished, false);
});

test("v2.8 parent and Bazi v1.1 require exact private brands", async () => {
  const { loaded, parent, successor } = await fixture();
  assert.doesNotThrow(() => testOnly.assertParentV28(parent));
  assert.doesNotThrow(() => testOnly.assertBaziSuccessorV11(successor));
  assert.throws(
    () => testOnly.assertParentV28(clone(parent)),
    codeIs("PARENT_V28_BRAND_REQUIRED")
  );
  assert.throws(
    () => testOnly.assertBaziSuccessorV11(clone(successor)),
    codeIs("BAZI_SUCCESSOR_V11_BRAND_REQUIRED")
  );
  assert.deepEqual(loaded.artifactBindings, [
    binding(testOnly.PARENT_V28),
    binding(testOnly.BAZI_SUCCESSOR_V11)
  ]);
});

test(
  "top-level delta is limited to v2.8 identity lineage digest and Bazi projection",
  async () => {
    const { loaded, parent } = await fixture();
    const normalized = clone(loaded);
    for (const key of [
      "schemaVersion",
      "recordType",
      "childId",
      "createdAt",
      "artifactBindings",
      "lineage",
      "childDigest"
    ]) {
      normalized[key] = clone(parent[key]);
    }
    normalized.systems = clone(parent.systems);
    assert.deepEqual(normalized, parent);
    assert.equal(loaded.status, parent.status);
    assert.deepEqual(loaded.doesNotEstablish, parent.doesNotEstablish);
  }
);

test("Ziwei Western and Vedic are canonical exact v2.8 copies", async () => {
  const { loaded, parent } = await fixture();
  for (const id of ["ziwei-doushu", "western-astrology", "vedic-astrology"]) {
    assert.deepEqual(bySystem(loaded, id), bySystem(parent, id), id);
  }
});

test("Bazi changes only endpoint zero and currentStatus", async () => {
  const { loaded, parent } = await fixture();
  const bazi = clone(bySystem(loaded, "bazi"));
  const oldBazi = clone(bySystem(parent, "bazi"));
  assert.equal(bazi.currentStatus, testOnly.BAZI_CURRENT_STATUS);
  assert.equal(oldBazi.currentStatus, testOnly.PARENT_BAZI_CURRENT_STATUS);
  assert.equal(bazi.currentEvidence.endpoints.length, 1);
  assert.equal(oldBazi.currentEvidence.endpoints.length, 1);
  assert.deepEqual(
    oldBazi.currentEvidence.endpoints[0],
    binding(testOnly.PARENT_BAZI_SUCCESSOR_V10_ENDPOINT)
  );
  assert.deepEqual(
    bazi.currentEvidence.endpoints[0],
    binding(testOnly.BAZI_SUCCESSOR_V11)
  );
  bazi.currentStatus = oldBazi.currentStatus;
  bazi.currentEvidence.endpoints = oldBazi.currentEvidence.endpoints;
  assert.deepEqual(bazi, oldBazi);
});

test("Bazi v1.1 identity time and zero-gate boundaries are exact", async () => {
  const { successor } = await fixture();
  assert.equal(
    successor.currentMachineIdentity.currentMachineIdentityDigest,
    testOnly.BAZI_SUCCESSOR_V11.currentMachineIdentityDigest
  );
  assert.equal(successor.currentMachineIdentity.orderedUniqueFileIdentityCount, 28);
  assert.equal(successor.currentMachineIdentity.uniqueFileDriftCount, 1);
  assert.equal(successor.currentMachineIdentity.componentDriftCount, 1);
  assert.equal(successor.gateSummary.bindingFrozenVerified, 0);
  assert.equal(successor.gateSummary.bindingRequired, 12);
  assert.equal(successor.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(successor.gateSummary.independentExpertsRequired, 2);
  assert.equal(successor.timeBoundary.createdAtClock, "untrusted_local_clock_label");
  assert.equal(successor.timeBoundary.trustedTimestampEstablished, false);
  assert.equal(successor.timeBoundary.externalTimeAuthorityEstablished, false);
  assert.equal(successor.timeBoundary.filesystemTimestampsUsedAsAuthority, false);
  assert.equal(successor.timeBoundary.monotonicClockEstablished, false);
  assert.equal(successor.timeBoundary.notaryReceiptEstablished, false);
  assert.equal(successor.timeBoundary.predecessorV1ChronologyAuthorityEstablished, false);
  assert.equal(successor.timeBoundary.predecessorV1CorrectedCreatedAt, null);
  assert.equal(successor.timeBoundary.crossArtifactTemporalOrderEstablished, false);
  assert.equal(successor.lineage.thisSuccessorReplacesFourSystemStatusEndpoint, false);
  for (const value of Object.values(successor.authorityBoundary)) {
    assert.equal(value, false);
  }
});

test("all 32 admission gates and authority ledgers remain red", async () => {
  const { loaded } = await fixture();
  assert.equal(loaded.currentStatusSummary.totalAdmissionGatesRequired, 32);
  assert.equal(loaded.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(loaded.currentStatusSummary.systemsFormallyAdmitted, 0);
  assert.equal(loaded.currentStatusSummary.systemsDomainAuthorityAuthorized, 0);
  assert.equal(loaded.currentStatusSummary.systemsReleaseReady, 0);
  assert.equal(loaded.currentStatusSummary.systemsPublicReleaseAuthorized, 0);
  assert.equal(
    loaded.currentStatusSummary.allSystemsCurrentFullDomainManifestMechanicallyVerified,
    false
  );
  for (const system of loaded.systems) {
    assert.equal(system.gateSummary.admissionGatesSatisfied, 0);
    assert.equal(system.gateSummary.bindingFrozenVerified, 0);
    assert.equal(system.gateSummary.independentExpertReviewsVerified, 0);
    for (const value of Object.values(system.authorityBoundary)) {
      assert.equal(value, false);
    }
  }
  for (const value of Object.values(loaded.authorityBoundary)) {
    assert.equal(value, false);
  }
});

test("legacy v13 epoch atomic interval and ABA boundaries are exact copies", async () => {
  const { loaded, parent } = await fixture();
  assert.deepEqual(
    loaded.projectReleaseGovernanceContext,
    parent.projectReleaseGovernanceContext
  );
  assert.deepEqual(loaded.observationBoundary, parent.observationBoundary);
  assert.equal(loaded.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(loaded.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(loaded.projectReleaseGovernanceContext.migrationId, null);
  assert.equal(loaded.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(loaded.observationBoundary.mutationEpochAvailableForSchema13, false);
  assert.equal(loaded.observationBoundary.mutationEpochReceipt, null);
  assert.equal(loaded.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(loaded.observationBoundary.abaExcluded, false);
});

test("lineage names only the append-only Bazi v1.1 transition", async () => {
  const { loaded } = await fixture();
  assert.deepEqual(loaded.lineage.parent, binding(testOnly.PARENT_V28));
  assert.deepEqual(
    loaded.lineage.baziCurrentMachineIdentitySuccessorV11,
    binding(testOnly.BAZI_SUCCESSOR_V11)
  );
  assert.equal(loaded.lineage.parentPreservedUnmodified, true);
  assert.equal(loaded.lineage.parentOverwritten, false);
  assert.equal(loaded.lineage.parentBacklinkToThisChildPresent, false);
  assert.equal(loaded.lineage.baziEndpointReplacedFromV10ToV11, true);
  assert.equal(loaded.lineage.baziStatusUpdatedForV11, true);
  assert.equal(loaded.lineage.crossArtifactTemporalOrderEstablished, false);
  assert.deepEqual(loaded.lineage.otherSystemCanonicalCopiesPreserved, [
    "ziwei-doushu",
    "western-astrology",
    "vedic-astrology"
  ]);
  assert.equal(loaded.lineage.uniqueBlockerClaimed, false);
});

test("old double missing or substituted Bazi endpoints cannot pass", async () => {
  const { loaded, parent, successor } = await fixture();
  const mutations = [
    (endpoints) => {
      endpoints[0] = binding(testOnly.PARENT_BAZI_SUCCESSOR_V10_ENDPOINT);
    },
    (endpoints) => {
      endpoints.push(binding(testOnly.PARENT_BAZI_SUCCESSOR_V10_ENDPOINT));
    },
    (endpoints) => { endpoints.length = 0; },
    (endpoints) => { endpoints[0].role = "forged"; },
    (endpoints) => { endpoints[0].semanticDigest = "0".repeat(64); }
  ];
  for (const mutate of mutations) {
    const tampered = clone(loaded);
    mutate(bySystem(tampered, "bazi").currentEvidence.endpoints);
    reseal(tampered);
    assert.throws(
      () => testOnly.assertChildBoundary(tampered, parent, successor),
      codeIs("BAZI_PROJECTION_DRIFT")
    );
  }
});

test("Bazi status and non-endpoint drift cannot pass after resealing", async () => {
  const { loaded, parent, successor } = await fixture();
  for (const mutate of [
    (value) => { bySystem(value, "bazi").currentStatus = "forged"; },
    (value) => {
      bySystem(value, "bazi")
        .currentEvidence.currentFullDomainManifestMechanicallyVerified = true;
    },
    (value) => { bySystem(value, "bazi").gateSummary.bindingFrozenVerified = 1; },
    (value) => { bySystem(value, "bazi").productBoundary.targetSchema = 14; }
  ]) {
    const tampered = clone(loaded);
    mutate(tampered);
    reseal(tampered);
    assert.throws(
      () => testOnly.assertChildBoundary(tampered, parent, successor),
      codeIs("BAZI_PROJECTION_DRIFT")
    );
  }
});

test("non-Bazi system drift cannot pass after resealing", async () => {
  const { loaded, parent, successor } = await fixture();
  for (const id of ["ziwei-doushu", "western-astrology", "vedic-astrology"]) {
    const tampered = clone(loaded);
    bySystem(tampered, id).currentStatus = "forged";
    reseal(tampered);
    assert.throws(
      () => testOnly.assertChildBoundary(tampered, parent, successor),
      codeIs("NON_BAZI_PROJECTION_DRIFT")
    );
  }
});

test("time order gate authority epoch registry and manifest promotion cannot pass", async () => {
  const { loaded, parent, successor } = await fixture();
  const mutations = [
    (value) => { value.lineage.crossArtifactTemporalOrderEstablished = true; },
    (value) => { value.lineage.trustedTimestampEstablished = true; },
    (value) => { value.currentStatusSummary.totalAdmissionGatesSatisfied = 1; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; },
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.mutationEpochReceipt = "invented"; },
    (value) => { value.observationBoundary.abaExcluded = true; },
    (value) => { value.projectReleaseGovernanceContext.targetSchema = 14; },
    (value) => { value.versionBoundary.centralRegistryModifiedByThisChild = true; },
    (value) => { value.versionBoundary.existingDomainManifestsModifiedByThisChild = true; },
    (value) => { value.versionBoundary.manifestRebindOrResignPerformed = true; }
  ];
  for (const mutate of mutations) {
    const tampered = clone(loaded);
    mutate(tampered);
    reseal(tampered);
    assert.throws(
      () => testOnly.assertChildBoundary(tampered, parent, successor)
    );
  }
});

test("unknown fields cannot pass the exact current projection", async () => {
  const { loaded, parent, successor } = await fixture();
  const tampered = clone(loaded);
  tampered.unexpectedAuthority = false;
  reseal(tampered);
  assert.throws(
    () => testOnly.assertChildBoundary(
      tampered,
      parent,
      successor,
      loaded
    ),
    codeIs("CURRENT_STATUS_MISMATCH")
  );
});

test("child digest tamper fails before authority interpretation", async () => {
  const { loaded, parent, successor } = await fixture();
  const tampered = clone(loaded);
  tampered.childDigest = "0".repeat(64);
  assert.throws(
    () => testOnly.assertChildBoundary(tampered, parent, successor),
    codeIs("CHILD_DIGEST_INVALID")
  );
});

test("canonicalizer rejects active aliased accessor and invalid number values", () => {
  assert.throws(() => testOnly.canonicalStringify(new Proxy({}, {})));
  const accessor = {};
  Object.defineProperty(accessor, "x", { enumerable: true, get() { return 1; } });
  assert.throws(() => testOnly.canonicalStringify(accessor));
  const shared = {};
  assert.throws(() => testOnly.canonicalStringify({ a: shared, b: shared }));
  assert.throws(() => testOnly.canonicalStringify({ value: -0 }));
  assert.throws(() => testOnly.canonicalStringify({ value: Infinity }));
});

test("captured brand intrinsics resist post-import WeakSet poisoning", async () => {
  const { loaded } = await fixture();
  const oldAdd = WeakSet.prototype.add;
  const oldHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.add = () => { throw new Error("poisoned"); };
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV29(loaded), true);
    assert.equal(isVerifiedFourSystemCurrentStatusObservationChildV29(clone(loaded)), false);
  } finally {
    WeakSet.prototype.add = oldAdd;
    WeakSet.prototype.has = oldHas;
  }
});

test("summary is narrow and requires the persisted private brand", async () => {
  const { loaded } = await fixture();
  const summary = getFourSystemCurrentStatusObservationChildV29Summary(loaded);
  assert.equal(summary.systemsRequired, 4);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.baziStatus, testOnly.BAZI_CURRENT_STATUS);
  assert.equal(summary.baziEndpointPath, testOnly.BAZI_SUCCESSOR_V11.path);
  assert.equal(summary.baziBindingFrozenVerified, 0);
  assert.equal(summary.baziIndependentExpertReviewsVerified, 0);
  assert.equal(summary.trustedTimestampEstablished, false);
  assert.equal(summary.crossArtifactTemporalOrderEstablished, false);
  assert.equal(summary.projectDefaultActiveLine, "legacy-v13");
  assert.equal(summary.projectDefaultTargetSchema, 13);
  assert.equal(summary.projectDefaultMigrationId, null);
  assert.throws(
    () => getFourSystemCurrentStatusObservationChildV29Summary(clone(loaded)),
    codeIs("CHILD_BRAND_REQUIRED")
  );
});

test("CLI emits one calibrated all-red summary", () => {
  const run = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv()
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.match(
    run.stdout,
    /^FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_OK \{/u
  );
  const summary = JSON.parse(run.stdout.slice(run.stdout.indexOf("{")).trim());
  assert.equal(summary.systemsRequired, 4);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.systemsFormallyAdmitted, 0);
  assert.equal(summary.systemsReleaseReady, 0);
  assert.equal(summary.systemsPublicReleaseAuthorized, 0);
  assert.equal(summary.baziCurrentEngineeringManifestMechanicallyVerified, false);
  assert.equal(summary.baziCurrentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.trustedTimestampEstablished, false);
  assert.equal(summary.crossArtifactTemporalOrderEstablished, false);
  assert.equal(summary.crossFileAtomicSnapshot, false);
  assert.equal(summary.mutationEpochReceipt, null);
  assert.equal(summary.abaExcluded, false);
  assert.equal(summary.projectDefaultActiveLine, "legacy-v13");
});

test("CLI rejects operands and visible NODE_OPTIONS without leakage", () => {
  const operand = spawnSync(process.execPath, [CLI, "unexpected"], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv()
  });
  assert.equal(operand.status, 1);
  assert.equal(operand.stdout, "");
  assert.equal(
    operand.stderr,
    "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_FAILED"
      + " CLI_ARGUMENTS_REJECTED\n"
  );
  const env = cleanEnv();
  env.NODE_OPTIONS = "--trace-warnings";
  const preload = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env
  });
  assert.equal(preload.status, 1);
  assert.equal(preload.stdout, "");
  assert.equal(preload.stderr, PRELOAD_FAILURE);

  const nodePathEnv = cleanEnv();
  nodePathEnv.NODE_PATH = ".";
  const nodePath = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: nodePathEnv
  });
  assert.equal(nodePath.status, 1);
  assert.equal(nodePath.stdout, "");
  assert.equal(nodePath.stderr, PRELOAD_FAILURE);

  const requireEquals = spawnSync(
    process.execPath,
    ["--require=node:path", CLI],
    { cwd: ROOT, encoding: "utf8", env: cleanEnv() }
  );
  assert.notEqual(requireEquals.status, 0);
  assert.equal(requireEquals.stdout, "");
  assert.equal(requireEquals.stderr, PRELOAD_FAILURE);
});

test("CLI rejects a malicious import preload before library import", () => {
  const malicious =
    "data:text/javascript,"
    + "String.prototype.toLowerCase%3D()%3D%3E%22poisoned%22";
  const run = spawnSync(
    process.execPath,
    ["--import", malicious, CLI],
    { cwd: ROOT, encoding: "utf8", env: cleanEnv() }
  );
  assert.notEqual(run.status, 0);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, PRELOAD_FAILURE);
});

test("CLI preload guard survives Array.prototype.some first-call sabotage", () => {
  const malicious =
    "data:text/javascript,const o=Array.prototype.some%3Blet n=0%3B"
    + "Array.prototype.some=function(...a)%7Bif(n%2B%2B===0)%7B"
    + "Array.prototype.some=o%3Breturn false%7D"
    + "return Reflect.apply(o,this,a)%7D";
  const run = spawnSync(
    process.execPath,
    ["--import=" + malicious, CLI],
    { cwd: ROOT, encoding: "utf8", env: cleanEnv() }
  );
  assert.notEqual(run.status, 0);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, PRELOAD_FAILURE);
});

test("CLI rejects a preload that rewrites process argv", () => {
  const malicious =
    "data:text/javascript,"
    + "process.argv%5B1%5D%3D%22x%22";
  const run = spawnSync(
    process.execPath,
    ["--import", malicious, CLI],
    { cwd: ROOT, encoding: "utf8", env: cleanEnv() }
  );
  assert.notEqual(run.status, 0);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, PRELOAD_FAILURE);
});

test("importing the CLI is side-effect free without preloads", () => {
  const code =
    "await import("
    + JSON.stringify(pathToFileURL(CLI).href)
    + "); process.stdout.write(\"IMPORTED\\n\");";
  const run = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", code],
    { cwd: ROOT, encoding: "utf8", env: cleanEnv() }
  );
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, "IMPORTED\n");
});
