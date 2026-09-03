import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  FourSystemCurrentStatusObservationChildV26Error,
  buildCurrentFourSystemCurrentStatusObservationChildV26,
  computeFourSystemCurrentStatusObservationChildV26Digest,
  fourSystemCurrentStatusObservationChildV26TestOnly as testOnly,
  getFourSystemCurrentStatusObservationChildV26Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV26,
  loadFourSystemCurrentStatusObservationChildV26,
  serializeFourSystemCurrentStatusObservationChildV26
} from "./four-system-current-status-observation-child-v2-6-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV25
} from "./four-system-current-status-observation-child-v2-5-lib.mjs";
import {
  loadWesternIndependentEngineeringManifestV2
} from "./western-independent-engineering-manifest-v2-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(
  HERE,
  "verify-four-system-current-status-observation-child-v2-6.mjs"
);
const ARTIFACT = path.join(
  ROOT,
  "content",
  "system-admission",
  "four-system-current-status-observation-child.v2.6.0.json"
);
const PRELOAD_FAILURE =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_6_FAILED"
  + " VISIBLE_PRELOAD_OPTIONS_REJECTED\n";

let fixturePromise;

function fixture() {
  if (!fixturePromise) {
    fixturePromise = Promise.all([
      loadFourSystemCurrentStatusObservationChildV26(ROOT),
      loadFourSystemCurrentStatusObservationChildV25(ROOT),
      loadWesternIndependentEngineeringManifestV2(ROOT),
      buildCurrentFourSystemCurrentStatusObservationChildV26(ROOT)
    ]).then(([loaded, parent, westernManifest, built]) => ({
      loaded,
      parent,
      westernManifest,
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
    error instanceof FourSystemCurrentStatusObservationChildV26Error
    && error.code === expected;
}

function reseal(value) {
  value.childDigest =
    computeFourSystemCurrentStatusObservationChildV26Digest(value);
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
  "exact persisted loader grants the v2.6 private brand and builder does not",
  async () => {
    const { loaded, built } = await fixture();
    assert.deepEqual(built, loaded);
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV26(built),
      false
    );
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV26(loaded),
      true
    );
    assertActuallyDeepFrozen(loaded);
  }
);

test(
  "persisted raw bytes SHA-256 self digest and canonical materialization are frozen",
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
      computeFourSystemCurrentStatusObservationChildV26Digest(parsed)
    );
    assert.equal(
      bytes.toString("utf8"),
      serializeFourSystemCurrentStatusObservationChildV26(parsed)
    );
  }
);

test("createdAt is one canonical fixed UTC instant", async () => {
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

test(
  "v2.5 parent and Western Manifest v2 require exact fixed loader brands",
  async () => {
    const { loaded, parent, westernManifest } = await fixture();
    assert.doesNotThrow(() => testOnly.assertParentV25(parent));
    assert.doesNotThrow(
      () => testOnly.assertWesternManifestV2(westernManifest)
    );
    assert.throws(
      () => testOnly.assertParentV25(clone(parent)),
      codeIs("PARENT_V25_BRAND_REQUIRED")
    );
    assert.throws(
      () => testOnly.assertWesternManifestV2(clone(westernManifest)),
      codeIs("WESTERN_MANIFEST_V2_BRAND_REQUIRED")
    );
    assert.deepEqual(loaded.artifactBindings, [
      binding(testOnly.PARENT_V25),
      binding(testOnly.WESTERN_MANIFEST_V2)
    ]);
  }
);

test(
  "top-level delta is limited to v2.6 identity bindings lineage digest and Western",
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

test("Bazi Ziwei and Vedic are canonical exact v2.5 copies", async () => {
  const { loaded, parent } = await fixture();
  for (const id of ["bazi", "ziwei-doushu", "vedic-astrology"]) {
    assert.deepEqual(bySystem(loaded, id), bySystem(parent, id));
  }
});

test(
  "Western appends exactly one selected-roots manifest endpoint",
  async () => {
    const { loaded, parent } = await fixture();
    const western = bySystem(loaded, "western-astrology");
    const oldWestern = bySystem(parent, "western-astrology");
    assert.deepEqual(
      western.currentEvidence.endpoints.slice(0, 2),
      oldWestern.currentEvidence.endpoints
    );
    assert.deepEqual(
      western.currentEvidence.endpoints[2],
      binding(testOnly.WESTERN_MANIFEST_V2)
    );
    assert.equal(western.currentEvidence.endpoints.length, 3);
    assert.equal(western.currentStatus, testOnly.WESTERN_CURRENT_STATUS);
  }
);

test(
  "Western engineering currentness means only three exact selected package roots",
  async () => {
    const { loaded, westernManifest } = await fixture();
    const western = bySystem(loaded, "western-astrology");
    const manifest = westernManifest.manifest;
    assert.equal(
      western.currentEvidence.currentEngineeringManifestMechanicallyVerified,
      true
    );
    assert.equal(
      western.currentEvidence.currentFullDomainManifestMechanicallyVerified,
      false
    );
    assert.equal(
      western.currentEvidence.browserRuntimeEvidence,
      "not_assessed_by_this_child"
    );
    assert.equal(
      manifest.threePackageAuthoredFileClosure.threeSelectedPackageRootsExact,
      true
    );
    assert.equal(
      manifest.threePackageAuthoredFileClosure
        .entireWesternEngineeringClosureEstablished,
      false
    );
    assert.deepEqual(manifest.componentAccounting, {
      componentCount: 9,
      componentFileReferences: 152,
      componentIds: [
        "execution_rules",
        "interpretation_rules",
        "input_policy",
        "fact_contract",
        "source_bundle",
        "rights_bundle",
        "expert_review_bundle",
        "high_risk_policy",
        "report_contract"
      ],
      uniquePhysicalPaths: 70
    });
  }
);

test(
  "path-name component routing is not laundered into semantic or domain truth",
  async () => {
    const { westernManifest } = await fixture();
    assert.deepEqual(
      westernManifest.manifest.componentClassificationBoundary,
      {
        componentMembershipEstablishesDomainTruth: false,
        componentReferenceFanoutEqualsIndependentSemanticChanges: false,
        pathNameHeuristicRoutingOnly: true,
        semanticDependencyOrCallgraphEstablished: false
      }
    );
  }
);

test("all 32 admission gates and authority ledgers remain red", async () => {
  const { loaded } = await fixture();
  assert.equal(loaded.currentStatusSummary.totalAdmissionGatesRequired, 32);
  assert.equal(loaded.currentStatusSummary.totalAdmissionGatesSatisfied, 0);
  assert.equal(loaded.currentStatusSummary.systemsFormallyAdmitted, 0);
  assert.equal(loaded.currentStatusSummary.systemsDomainAuthorityAuthorized, 0);
  assert.equal(loaded.currentStatusSummary.systemsReleaseReady, 0);
  assert.equal(loaded.currentStatusSummary.systemsPublicReleaseAuthorized, 0);
  for (const system of loaded.systems) {
    assert.equal(system.gateSummary.admissionGatesSatisfied, 0);
    assert.equal(system.gateSummary.bindingFrozenVerified, 0);
    assert.equal(system.gateSummary.independentExpertReviewsVerified, 0);
    assert.equal(
      system.currentEvidence.currentFullDomainManifestMechanicallyVerified,
      false
    );
    for (const value of Object.values(system.authorityBoundary)) {
      assert.equal(value, false);
    }
  }
  for (const value of Object.values(loaded.authorityBoundary)) {
    assert.equal(value, false);
  }
});

test("legacy v13 remains project context only", async () => {
  const { loaded } = await fixture();
  assert.deepEqual(loaded.projectReleaseGovernanceContext, {
    activeLine: "legacy-v13",
    expertClaimsAuthorized: false,
    inheritedByZiweiWesternOrVedicProductIdentity: false,
    migrationId: null,
    mutationEpochAvailableForSchema13: false,
    mutationEpochBoundaryRequired: true,
    mutationEpochReceipt: null,
    projectContextOnly: true,
    publicDeploymentAuthorized: false,
    targetSchema: 13
  });
  const western = bySystem(loaded, "western-astrology");
  assert.deepEqual(western.productBoundary, {
    baziAuthorityInherited: false,
    independentSystemBoundaryPreserved: true,
    mainApplicationIntegrated: false,
    migrationId: null,
    releaseIdentity: null,
    targetSchema: null
  });
});

test("epoch atomic interval and ABA remain explicitly unavailable", async () => {
  const { loaded } = await fixture();
  assert.equal(loaded.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(
    loaded.observationBoundary.mutationEpochAvailableForSchema13,
    false
  );
  assert.equal(loaded.observationBoundary.mutationEpochReceipt, null);
  assert.equal(
    loaded.observationBoundary.intervalMutationExcludedAcrossFiles,
    false
  );
  assert.equal(loaded.observationBoundary.abaExcluded, false);
  assert.equal(loaded.observationBoundary.childDigestIsDigitalSignature, false);
});

test("lineage names the exact narrow Western transition", async () => {
  const { loaded } = await fixture();
  assert.deepEqual(loaded.lineage, {
    parent: binding(testOnly.PARENT_V25),
    westernEngineeringManifest: binding(testOnly.WESTERN_MANIFEST_V2),
    parentMechanicallyCurrent: true,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    westernEngineeringManifestMechanicallyCurrent: true,
    westernEngineeringManifestPrivateBrandLoaderRecursivelyReverifiedItsUpstreams:
      true,
    parentPreservedUnmodified: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    westernManifestEndpointAppended: true,
    westernCurrentEngineeringManifestFlagRaised: true,
    westernCurrentFullDomainManifestFlagRemainsFalse: true,
    westernBrowserRuntimeEvidenceUnchangedAndNotAssessed: true,
    otherSystemCanonicalCopiesPreserved: [
      "bazi",
      "ziwei-doushu",
      "vedic-astrology"
    ],
    uniqueBlockerClaimed: false
  });
});

test("Western engineering flag cannot be rolled back after resealing", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  const forged = reseal(clone(loaded));
  bySystem(forged, "western-astrology")
    .currentEvidence.currentEngineeringManifestMechanicallyVerified = false;
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      westernManifest,
      loaded
    ),
    codeIs("WESTERN_PROJECTION_DRIFT")
  );
});

test("Western full-domain flag cannot be promoted after resealing", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "western-astrology")
    .currentEvidence.currentFullDomainManifestMechanicallyVerified = true;
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      westernManifest,
      loaded
    ),
    codeIs("WESTERN_PROJECTION_DRIFT")
  );
});

test("Western browser evidence cannot be invented after resealing", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "western-astrology")
    .currentEvidence.browserRuntimeEvidence = "production_browser_verified";
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      westernManifest,
      loaded
    ),
    codeIs("WESTERN_PROJECTION_DRIFT")
  );
});

test("Western endpoint substitution cannot pass after resealing", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "western-astrology")
    .currentEvidence.endpoints[2].rawSha256 = "f".repeat(64);
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      westernManifest,
      loaded
    ),
    codeIs("WESTERN_PROJECTION_DRIFT")
  );
});

test("non-Western system drift cannot pass after resealing", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "ziwei-doushu").currentStatus = "forged";
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      westernManifest,
      loaded
    ),
    codeIs("NON_WESTERN_PROJECTION_DRIFT")
  );
});

test("gate or authority promotion cannot pass after resealing", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  for (const mutate of [
    (value) => {
      bySystem(value, "western-astrology")
        .gateSummary.bindingFrozenVerified = 1;
    },
    (value) => {
      bySystem(value, "western-astrology")
        .authorityBoundary.releaseReady = true;
    },
    (value) => {
      value.authorityBoundary.publicDeploymentAuthorized = true;
    }
  ]) {
    const forged = clone(loaded);
    mutate(forged);
    reseal(forged);
    assert.throws(
      () => testOnly.assertChildBoundary(
        forged,
        parent,
        westernManifest,
        loaded
      ),
      (error) =>
        error instanceof FourSystemCurrentStatusObservationChildV26Error
    );
  }
});

test("epoch atomic and ABA promotion cannot pass after resealing", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  for (const key of [
    "crossFileAtomicSnapshot",
    "mutationEpochAvailableForSchema13",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]) {
    const forged = clone(loaded);
    forged.observationBoundary[key] = true;
    reseal(forged);
    assert.throws(
      () => testOnly.assertChildBoundary(
        forged,
        parent,
        westernManifest,
        loaded
      ),
      codeIs("BOUNDARY_PROMOTION_FORBIDDEN")
    );
  }
});

test("product release and schema inheritance cannot pass", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  for (const mutate of [
    (value) => {
      bySystem(value, "western-astrology").productBoundary.releaseIdentity =
        "legacy-v13";
    },
    (value) => {
      bySystem(value, "western-astrology").productBoundary.targetSchema = 13;
    },
    (value) => {
      bySystem(value, "western-astrology").productBoundary.baziAuthorityInherited =
        true;
    }
  ]) {
    const forged = clone(loaded);
    mutate(forged);
    reseal(forged);
    assert.throws(
      () => testOnly.assertChildBoundary(
        forged,
        parent,
        westernManifest,
        loaded
      ),
      codeIs("WESTERN_PROJECTION_DRIFT")
    );
  }
});

test("unknown fields cannot pass exact current projection", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  const forged = clone(loaded);
  forged.releaseAuthorized = false;
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      westernManifest,
      loaded
    ),
    codeIs("CURRENT_STATUS_MISMATCH")
  );
});

test("child digest tamper fails before any authority interpretation", async () => {
  const { loaded, parent, westernManifest } = await fixture();
  const forged = clone(loaded);
  forged.childDigest = "f".repeat(64);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      westernManifest,
      loaded
    ),
    codeIs("CHILD_DIGEST_INVALID")
  );
});

test("summary requires the exact persisted private brand", async () => {
  const { loaded } = await fixture();
  const summary =
    getFourSystemCurrentStatusObservationChildV26Summary(loaded);
  assert.equal(
    summary.westernCurrentEngineeringManifestMechanicallyVerified,
    true
  );
  assert.equal(
    summary.westernCurrentFullDomainManifestMechanicallyVerified,
    false
  );
  assert.equal(
    summary.westernManifestScope,
    "three_selected_package_roots_exact_not_entire_western_engineering_closure"
  );
  assert.throws(
    () => getFourSystemCurrentStatusObservationChildV26Summary(clone(loaded)),
    codeIs("CHILD_BRAND_REQUIRED")
  );
});

test("CLI emits one narrow calibrated all-red summary", () => {
  const run = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv()
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.match(
    run.stdout,
    /^FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_6_OK \{/u
  );
  const summary =
    JSON.parse(run.stdout.slice(run.stdout.indexOf("{")).trim());
  assert.equal(summary.systemsRequired, 4);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.systemsFormallyAdmitted, 0);
  assert.equal(summary.systemsDomainAuthorityAuthorized, 0);
  assert.equal(summary.systemsReleaseReady, 0);
  assert.equal(summary.systemsPublicReleaseAuthorized, 0);
  assert.equal(
    summary.westernCurrentEngineeringManifestMechanicallyVerified,
    true
  );
  assert.equal(
    summary.westernCurrentFullDomainManifestMechanicallyVerified,
    false
  );
  assert.equal(summary.westernBrowserRuntimeEvidence, "not_assessed_by_this_child");
  assert.equal(summary.crossFileAtomicSnapshot, false);
  assert.equal(summary.mutationEpochReceipt, null);
  assert.equal(summary.abaExcluded, false);
  assert.equal(summary.releaseIdentity, "legacy-v13");
  assert.equal(summary.targetSchema, 13);
  assert.equal(summary.migrationId, null);
});

test(
  "CLI rejects operands and visible NODE_OPTIONS without detail leakage",
  () => {
    const operand = spawnSync(process.execPath, [CLI, "unexpected"], {
      cwd: ROOT,
      encoding: "utf8",
      env: cleanEnv()
    });
    assert.equal(operand.status, 1);
    assert.equal(operand.stdout, "");
    assert.equal(
      operand.stderr,
      "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_6_FAILED"
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
  }
);

test(
  "CLI fails closed when malicious import poisons String.prototype.toLowerCase",
  () => {
    const malicious =
      "data:text/javascript,"
      + "String.prototype.toLowerCase%3D()%3D%3E%22poisoned%22";
    const run = spawnSync(
      process.execPath,
      ["--import", malicious, CLI],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: cleanEnv()
      }
    );
    assert.notEqual(run.status, 0);
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, PRELOAD_FAILURE);
  }
);

test(
  "CLI fails closed when malicious import rewrites process.argv[1]",
  () => {
    const malicious =
      "data:text/javascript,"
      + "process.argv%5B1%5D%3D%22x%22";
    const run = spawnSync(
      process.execPath,
      ["--import", malicious, CLI],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: cleanEnv()
      }
    );
    assert.notEqual(run.status, 0);
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, PRELOAD_FAILURE);
  }
);

test("importing the CLI is side-effect free without visible preloads", () => {
  const code =
    "await import("
    + JSON.stringify(pathToFileURL(CLI).href)
    + '); process.stdout.write("IMPORTED\\n");';
  const run = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", code],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: cleanEnv()
    }
  );
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, "IMPORTED\n");
});
