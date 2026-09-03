import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  FourSystemCurrentStatusObservationChildV28Error,
  buildCurrentFourSystemCurrentStatusObservationChildV28,
  computeFourSystemCurrentStatusObservationChildV28Digest,
  fourSystemCurrentStatusObservationChildV28TestOnly as testOnly,
  getFourSystemCurrentStatusObservationChildV28Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV28,
  loadFourSystemCurrentStatusObservationChildV28,
  serializeFourSystemCurrentStatusObservationChildV28
} from "./four-system-current-status-observation-child-v2-8-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV27
} from "./four-system-current-status-observation-child-v2-7-lib.mjs";
import {
  loadZiweiIndependentEngineeringManifestV3
} from "./ziwei-independent-engineering-manifest-v3-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(
  HERE,
  "verify-four-system-current-status-observation-child-v2-8.mjs"
);
const ARTIFACT = path.join(
  ROOT,
  "content",
  "system-admission",
  "four-system-current-status-observation-child.v2.8.0.json"
);
const PRELOAD_FAILURE =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_8_FAILED"
  + " VISIBLE_PRELOAD_OPTIONS_REJECTED\n";

let fixturePromise;

function fixture() {
  if (!fixturePromise) {
    fixturePromise = Promise.all([
      loadFourSystemCurrentStatusObservationChildV28(ROOT),
      loadFourSystemCurrentStatusObservationChildV27(ROOT),
      loadZiweiIndependentEngineeringManifestV3(ROOT),
      buildCurrentFourSystemCurrentStatusObservationChildV28(ROOT)
    ]).then(([loaded, parent, ziweiManifest, built]) => ({
      loaded,
      parent,
      ziweiManifest,
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
    error instanceof FourSystemCurrentStatusObservationChildV28Error
    && error.code === expected;
}

function reseal(value) {
  value.childDigest =
    computeFourSystemCurrentStatusObservationChildV28Digest(value);
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
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return;
  }
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
  "exact persisted loader grants the v2.8 private brand and builder does not",
  async () => {
    const { loaded, built } = await fixture();
    assert.deepEqual(built, loaded);
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV28(built),
      false
    );
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV28(loaded),
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
    assert.equal(
      parsed.childDigest,
      testOnly.EXPECTED_PERSISTED.childDigest
    );
    assert.equal(
      parsed.childDigest,
      computeFourSystemCurrentStatusObservationChildV28Digest(parsed)
    );
    assert.equal(
      bytes.toString("utf8"),
      serializeFourSystemCurrentStatusObservationChildV28(parsed)
    );
  }
);

test("createdAt is one fixed canonical UTC instant", async () => {
  const { loaded } = await fixture();
  assert.equal(loaded.createdAt, testOnly.CREATED_AT);
  assert.match(
    loaded.createdAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u
  );
  assert.equal(
    new Date(Date.parse(loaded.createdAt)).toISOString(),
    loaded.createdAt
  );
});

test("v2.7 parent and Ziwei v3 require exact private brands", async () => {
  const { loaded, parent, ziweiManifest } = await fixture();
  assert.doesNotThrow(() => testOnly.assertParentV27(parent));
  assert.doesNotThrow(
    () => testOnly.assertZiweiManifestV3(ziweiManifest)
  );
  assert.throws(
    () => testOnly.assertParentV27(clone(parent)),
    codeIs("PARENT_V27_BRAND_REQUIRED")
  );
  assert.throws(
    () => testOnly.assertZiweiManifestV3(clone(ziweiManifest)),
    codeIs("ZIWEI_MANIFEST_V3_BRAND_REQUIRED")
  );
  assert.deepEqual(loaded.artifactBindings, [
    binding(testOnly.PARENT_V27),
    binding(testOnly.ZIWEI_MANIFEST_V3)
  ]);
});

test(
  "top-level delta is limited to v2.7 identity lineage digest and Ziwei projection",
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

test("Bazi Western and Vedic are canonical exact v2.7 copies", async () => {
  const { loaded, parent } = await fixture();
  for (const id of ["bazi", "western-astrology", "vedic-astrology"]) {
    assert.deepEqual(bySystem(loaded, id), bySystem(parent, id));
  }
});

test(
  "Ziwei preserves receipt and browser endpoints then appends v3 exactly",
  async () => {
    const { loaded, parent } = await fixture();
    const ziwei = bySystem(loaded, "ziwei-doushu");
    const oldZiwei = bySystem(parent, "ziwei-doushu");
    assert.equal(oldZiwei.currentEvidence.endpoints.length, 2);
    assert.equal(ziwei.currentEvidence.endpoints.length, 3);
    assert.deepEqual(
      ziwei.currentEvidence.endpoints.slice(0, 2),
      oldZiwei.currentEvidence.endpoints
    );
    assert.deepEqual(
      ziwei.currentEvidence.endpoints[2],
      binding(testOnly.ZIWEI_MANIFEST_V3)
    );
    assert.equal(
      oldZiwei.currentEvidence.currentEngineeringManifestMechanicallyVerified,
      false
    );
    assert.equal(
      ziwei.currentEvidence.currentEngineeringManifestMechanicallyVerified,
      true
    );
    assert.equal(
      ziwei.currentEvidence.currentFullDomainManifestMechanicallyVerified,
      false
    );
    assert.equal(
      ziwei.currentEvidence.browserRuntimeEvidence,
      oldZiwei.currentEvidence.browserRuntimeEvidence
    );
    assert.equal(ziwei.currentStatus, testOnly.ZIWEI_CURRENT_STATUS);
  }
);

test("Ziwei v3 remains selected-path only and all domain gates stay red", async () => {
  const { ziweiManifest } = await fixture();
  const manifest = ziweiManifest.manifest;
  assert.equal(manifest.componentAccounting.componentCount, 9);
  assert.equal(manifest.componentAccounting.componentFileReferences, 59);
  assert.equal(manifest.componentAccounting.mappedUniquePhysicalPaths, 46);
  assert.equal(manifest.componentAccounting.engineeringAttachmentPaths, 30);
  assert.equal(manifest.selectedClosure.selectedUniquePhysicalPaths, 76);
  assert.equal(manifest.selectedClosure.recursiveDirectoryEnumerationPerformed, false);
  assert.equal(manifest.selectedClosure.extraFileAbsenceEstablished, false);
  assert.equal(manifest.selectedClosure.entireZiweiEngineeringClosureEstablished, false);
  assert.equal(manifest.versionBoundary.currentEngineeringManifestMechanicallyVerified, true);
  assert.equal(manifest.versionBoundary.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(manifest.browserEvidenceBoundary.browserRuntimeEvidenceEstablishedByThisManifest, false);
  assert.equal(manifest.browserEvidenceBoundary.childIssuanceTotalPassedScenarioOutcomes, 28);
  assert.equal(
    manifest.runtimeTrustBoundary.visibleCliLoaderInjectionRejectedBySelectedIdentity,
    false
  );
  assert.equal(
    Object.hasOwn(
      manifest.runtimeTrustBoundary,
      "visibleCliLoaderInjectionRejected"
    ),
    false
  );
  assert.equal(manifest.gateState.bindingFrozenVerified, 0);
  assert.equal(manifest.gateState.bindingRequired, 27);
  assert.equal(manifest.gateState.independentExpertReviewsVerified, 0);
  assert.equal(manifest.gateState.independentExpertsRequired, 2);
  assert.equal(manifest.gateState.admissionGatesSatisfied, 0);
  assert.equal(manifest.gateState.admissionGatesRequired, 8);
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
  assert.equal(loaded.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(loaded.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(loaded.projectReleaseGovernanceContext.migrationId, null);
  assert.deepEqual(loaded.observationBoundary, parent.observationBoundary);
  assert.equal(loaded.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(loaded.observationBoundary.mutationEpochAvailableForSchema13, false);
  assert.equal(loaded.observationBoundary.mutationEpochReceipt, null);
  assert.equal(loaded.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(loaded.observationBoundary.abaExcluded, false);
});

test("lineage names the exact append-only Ziwei transition", async () => {
  const { loaded } = await fixture();
  assert.deepEqual(loaded.lineage.parent, binding(testOnly.PARENT_V27));
  assert.deepEqual(
    loaded.lineage.ziweiEngineeringManifest,
    binding(testOnly.ZIWEI_MANIFEST_V3)
  );
  assert.equal(loaded.lineage.parentPreservedUnmodified, true);
  assert.equal(loaded.lineage.parentOverwritten, false);
  assert.equal(
    loaded.lineage.ziweiManifestEndpointAppendedAfterExistingReceiptAndBrowserEndpoints,
    true
  );
  assert.equal(
    loaded.lineage.ziweiCurrentEngineeringManifestFlagChangedFromFalseToTrue,
    true
  );
  assert.equal(loaded.lineage.ziweiCurrentFullDomainManifestFlagRemainsFalse, true);
  assert.deepEqual(loaded.lineage.otherSystemCanonicalCopiesPreserved, [
    "bazi",
    "western-astrology",
    "vedic-astrology"
  ]);
  assert.equal(loaded.lineage.uniqueBlockerClaimed, false);
});

test("Ziwei engineering flag rollback cannot pass after resealing", async () => {
  const { loaded, parent, ziweiManifest } = await fixture();
  const tampered = clone(loaded);
  bySystem(tampered, "ziwei-doushu")
    .currentEvidence.currentEngineeringManifestMechanicallyVerified = false;
  reseal(tampered);
  assert.throws(
    () => testOnly.assertChildBoundary(tampered, parent, ziweiManifest),
    codeIs("ZIWEI_PROJECTION_DRIFT")
  );
});

test("Ziwei full-domain or browser promotion cannot pass", async () => {
  const { loaded, parent, ziweiManifest } = await fixture();
  for (const mutate of [
    (value) => {
      bySystem(value, "ziwei-doushu")
        .currentEvidence.currentFullDomainManifestMechanicallyVerified = true;
    },
    (value) => {
      bySystem(value, "ziwei-doushu").currentEvidence.browserRuntimeEvidence =
        "production_browser_runtime_verified";
    }
  ]) {
    const tampered = clone(loaded);
    mutate(tampered);
    reseal(tampered);
    assert.throws(
      () => testOnly.assertChildBoundary(tampered, parent, ziweiManifest),
      codeIs("ZIWEI_PROJECTION_DRIFT")
    );
  }
});

test("Ziwei endpoint deletion reorder or substitution cannot pass", async () => {
  const { loaded, parent, ziweiManifest } = await fixture();
  for (const mutate of [
    (endpoints) => endpoints.pop(),
    (endpoints) => endpoints.reverse(),
    (endpoints) => {
      endpoints[2] = clone(endpoints[0]);
    }
  ]) {
    const tampered = clone(loaded);
    mutate(bySystem(tampered, "ziwei-doushu").currentEvidence.endpoints);
    reseal(tampered);
    assert.throws(
      () => testOnly.assertChildBoundary(tampered, parent, ziweiManifest),
      codeIs("ZIWEI_PROJECTION_DRIFT")
    );
  }
});

test("non-Ziwei system drift cannot pass after resealing", async () => {
  const { loaded, parent, ziweiManifest } = await fixture();
  const tampered = clone(loaded);
  bySystem(tampered, "western-astrology").currentStatus = "changed";
  reseal(tampered);
  assert.throws(
    () => testOnly.assertChildBoundary(tampered, parent, ziweiManifest),
    codeIs("NON_ZIWEI_PROJECTION_DRIFT")
  );
});

test("gate authority product and epoch promotion cannot pass", async () => {
  const { loaded, parent, ziweiManifest } = await fixture();
  const mutations = [
    (value) => { value.currentStatusSummary.totalAdmissionGatesSatisfied = 1; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; },
    (value) => {
      bySystem(value, "ziwei-doushu").gateSummary.bindingFrozenVerified = 1;
    },
    (value) => {
      bySystem(value, "ziwei-doushu").productBoundary.releaseIdentity = "legacy-v13";
    },
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.mutationEpochReceipt = "invented"; },
    (value) => { value.observationBoundary.abaExcluded = true; }
  ];
  for (const mutate of mutations) {
    const tampered = clone(loaded);
    mutate(tampered);
    reseal(tampered);
    assert.throws(
      () => testOnly.assertChildBoundary(tampered, parent, ziweiManifest)
    );
  }
});

test("unknown fields cannot pass the exact current projection", async () => {
  const { loaded, parent, ziweiManifest } = await fixture();
  const tampered = clone(loaded);
  tampered.unexpectedAuthority = false;
  reseal(tampered);
  assert.throws(
    () => testOnly.assertChildBoundary(
      tampered,
      parent,
      ziweiManifest,
      loaded
    ),
    codeIs("CURRENT_STATUS_MISMATCH")
  );
});

test("child digest tamper fails before authority interpretation", async () => {
  const { loaded, parent, ziweiManifest } = await fixture();
  const tampered = clone(loaded);
  tampered.childDigest = "0".repeat(64);
  assert.throws(
    () => testOnly.assertChildBoundary(tampered, parent, ziweiManifest),
    codeIs("CHILD_DIGEST_INVALID")
  );
});

test("summary is narrow and requires the persisted private brand", async () => {
  const { loaded } = await fixture();
  const summary = getFourSystemCurrentStatusObservationChildV28Summary(loaded);
  assert.equal(summary.systemsRequired, 4);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.ziweiCurrentEngineeringManifestMechanicallyVerified, true);
  assert.equal(summary.ziweiCurrentFullDomainManifestMechanicallyVerified, false);
  assert.equal(
    summary.ziweiManifestScope,
    "selected_path_current_manifest_not_directory_or_full_domain_closure"
  );
  assert.equal(summary.projectDefaultActiveLine, "legacy-v13");
  assert.equal(summary.projectDefaultTargetSchema, 13);
  assert.equal(summary.projectDefaultMigrationId, null);
  assert.equal(summary.ziweiProductReleaseIdentity, null);
  assert.equal(summary.ziweiProductTargetSchema, null);
  assert.equal(summary.ziweiProductMigrationId, null);
  assert.throws(
    () => getFourSystemCurrentStatusObservationChildV28Summary(clone(loaded)),
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
    /^FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_8_OK \{/u
  );
  const summary =
    JSON.parse(run.stdout.slice(run.stdout.indexOf("{")).trim());
  assert.equal(summary.systemsRequired, 4);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.systemsFormallyAdmitted, 0);
  assert.equal(summary.systemsReleaseReady, 0);
  assert.equal(summary.systemsPublicReleaseAuthorized, 0);
  assert.equal(summary.ziweiCurrentEngineeringManifestMechanicallyVerified, true);
  assert.equal(summary.ziweiCurrentFullDomainManifestMechanicallyVerified, false);
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
    "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_8_FAILED"
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
    [`--import=${malicious}`, CLI],
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
    + '); process.stdout.write("IMPORTED\\n");';
  const run = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", code],
    { cwd: ROOT, encoding: "utf8", env: cleanEnv() }
  );
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, "IMPORTED\n");
});
