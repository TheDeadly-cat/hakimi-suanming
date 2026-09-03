import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  FourSystemCurrentStatusObservationChildV27Error,
  buildCurrentFourSystemCurrentStatusObservationChildV27,
  computeFourSystemCurrentStatusObservationChildV27Digest,
  fourSystemCurrentStatusObservationChildV27TestOnly as testOnly,
  getFourSystemCurrentStatusObservationChildV27Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV27,
  loadFourSystemCurrentStatusObservationChildV27,
  serializeFourSystemCurrentStatusObservationChildV27
} from "./four-system-current-status-observation-child-v2-7-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV26
} from "./four-system-current-status-observation-child-v2-6-lib.mjs";
import {
  loadVedicIndependentEngineeringManifestV2
} from "./vedic-independent-engineering-manifest-v2-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(
  HERE,
  "verify-four-system-current-status-observation-child-v2-7.mjs"
);
const ARTIFACT = path.join(
  ROOT,
  "content",
  "system-admission",
  "four-system-current-status-observation-child.v2.7.0.json"
);
const PRELOAD_FAILURE =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_FAILED"
  + " VISIBLE_PRELOAD_OPTIONS_REJECTED\n";

let fixturePromise;

function fixture() {
  if (!fixturePromise) {
    fixturePromise = Promise.all([
      loadFourSystemCurrentStatusObservationChildV27(ROOT),
      loadFourSystemCurrentStatusObservationChildV26(ROOT),
      loadVedicIndependentEngineeringManifestV2(ROOT),
      buildCurrentFourSystemCurrentStatusObservationChildV27(ROOT)
    ]).then(([loaded, parent, vedicManifest, built]) => ({
      loaded,
      parent,
      vedicManifest,
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
    error instanceof FourSystemCurrentStatusObservationChildV27Error
    && error.code === expected;
}

function reseal(value) {
  value.childDigest =
    computeFourSystemCurrentStatusObservationChildV27Digest(value);
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
  "exact persisted loader grants the v2.7 private brand and builder does not",
  async () => {
    const { loaded, built } = await fixture();
    assert.deepEqual(built, loaded);
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV27(built),
      false
    );
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV27(loaded),
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
      computeFourSystemCurrentStatusObservationChildV27Digest(parsed)
    );
    assert.equal(
      bytes.toString("utf8"),
      serializeFourSystemCurrentStatusObservationChildV27(parsed)
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
  "v2.6 parent and Vedic Manifest v2 require exact fixed loader brands",
  async () => {
    const { loaded, parent, vedicManifest } = await fixture();
    assert.doesNotThrow(() => testOnly.assertParentV26(parent));
    assert.doesNotThrow(
      () => testOnly.assertVedicManifestV2(vedicManifest)
    );
    assert.throws(
      () => testOnly.assertParentV26(clone(parent)),
      codeIs("PARENT_V26_BRAND_REQUIRED")
    );
    assert.throws(
      () => testOnly.assertVedicManifestV2(clone(vedicManifest)),
      codeIs("VEDIC_MANIFEST_V2_BRAND_REQUIRED")
    );
    assert.deepEqual(loaded.artifactBindings, [
      binding(testOnly.PARENT_V26),
      binding(testOnly.VEDIC_MANIFEST_V2)
    ]);
  }
);

test(
  "top-level delta is limited to v2.6 identity bindings lineage digest and Vedic",
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

test("Bazi Ziwei and Western are canonical exact v2.6 copies", async () => {
  const { loaded, parent } = await fixture();
  for (const id of ["bazi", "ziwei-doushu", "western-astrology"]) {
    assert.deepEqual(bySystem(loaded, id), bySystem(parent, id));
  }
});

test(
  "Vedic replaces only manifest endpoint index one and preserves endpoint order",
  async () => {
    const { loaded, parent } = await fixture();
    const vedic = bySystem(loaded, "vedic-astrology");
    const oldVedic = bySystem(parent, "vedic-astrology");
    assert.deepEqual(
      vedic.currentEvidence.endpoints[0],
      oldVedic.currentEvidence.endpoints[0]
    );
    assert.deepEqual(
      vedic.currentEvidence.endpoints[1],
      binding(testOnly.VEDIC_MANIFEST_V2)
    );
    assert.deepEqual(
      oldVedic.currentEvidence.endpoints[1],
      binding(testOnly.PARENT_VEDIC_MANIFEST_V1_ENDPOINT)
    );
    assert.deepEqual(
      vedic.currentEvidence.endpoints[2],
      oldVedic.currentEvidence.endpoints[2]
    );
    assert.equal(vedic.currentEvidence.endpoints.length, 3);
    assert.equal(vedic.currentStatus, testOnly.VEDIC_CURRENT_STATUS);
    assert.equal(vedic.currentStatus, oldVedic.currentStatus);
  }
);

test(
  "Vedic engineering true remains true only for the selected parent-declared 57 paths",
  async () => {
    const { loaded, parent, vedicManifest } = await fixture();
    const vedic = bySystem(loaded, "vedic-astrology");
    const oldVedic = bySystem(parent, "vedic-astrology");
    const manifest = vedicManifest.manifest;
    assert.equal(
      oldVedic.currentEvidence.currentEngineeringManifestMechanicallyVerified,
      true
    );
    assert.equal(
      vedic.currentEvidence.currentEngineeringManifestMechanicallyVerified,
      true
    );
    assert.equal(
      vedic.currentEvidence.currentFullDomainManifestMechanicallyVerified,
      false
    );
    assert.equal(
      vedic.currentEvidence.browserRuntimeEvidence,
      "isolated_civil_time_fact_only_edge_chrome_10_of_10_not_web_pwa_or_product_runtime"
    );
    assert.equal(
      vedic.currentEvidence.browserRuntimeEvidence,
      oldVedic.currentEvidence.browserRuntimeEvidence
    );
    assert.deepEqual(
      {
        childDeclaredAuthoredBuildPaths:
          manifest.selectedClosure.childDeclaredAuthoredBuildPaths,
        entireFactBrowserDraftRootClosureEstablished:
          manifest.selectedClosure.entireFactBrowserDraftRootClosureEstablished,
        entireTzdbCorePackageClosureEstablished:
          manifest.selectedClosure.entireTzdbCorePackageClosureEstablished,
        entireVedicEngineeringClosureEstablished:
          manifest.selectedClosure.entireVedicEngineeringClosureEstablished,
        extraFileAbsenceEstablished:
          manifest.selectedClosure.extraFileAbsenceEstablished,
        overlapBetweenParentSets:
          manifest.selectedClosure.overlapBetweenParentSets,
        predecessorDeclaredPaths:
          manifest.selectedClosure.predecessorDeclaredPaths,
        recursiveDirectoryEnumerationPerformed:
          manifest.selectedClosure.recursiveDirectoryEnumerationPerformed,
        scopeClass: manifest.selectedClosure.scopeClass,
        selectedUniquePhysicalPaths:
          manifest.selectedClosure.selectedUniquePhysicalPaths
      },
      {
        childDeclaredAuthoredBuildPaths: 24,
        entireFactBrowserDraftRootClosureEstablished: false,
        entireTzdbCorePackageClosureEstablished: false,
        entireVedicEngineeringClosureEstablished: false,
        extraFileAbsenceEstablished: false,
        overlapBetweenParentSets: 0,
        predecessorDeclaredPaths: 33,
        recursiveDirectoryEnumerationPerformed: false,
        scopeClass:
          "parent_declared_selected_path_union_not_directory_or_domain_closure",
        selectedUniquePhysicalPaths: 57
      }
    );
    assert.deepEqual(manifest.componentAccounting, {
      componentCount: 9,
      componentFileReferences: 35,
      engineeringAttachmentPaths: 31,
      mappedUniquePhysicalPaths: 26,
      selectedUniquePhysicalPaths: 57
    });
    assert.equal(
      manifest.versionBoundary.currentEngineeringManifestMechanicallyVerified,
      true
    );
    assert.equal(
      manifest.versionBoundary.currentFullDomainManifestMechanicallyVerified,
      false
    );
    assert.equal(
      manifest.browserEvidenceBoundary
        .browserRuntimeEvidenceEstablishedByThisManifest,
      false
    );
  }
);

test(
  "path-name component routing is not laundered into semantic or domain truth",
  async () => {
    const { vedicManifest } = await fixture();
    assert.deepEqual(
      vedicManifest.manifest.componentClassificationBoundary,
      {
        classificationIsDomainOrExpertJudgment: false,
        classificationIsSemanticCompletenessProof: false,
        classificationMethod: "path_name_and_file_role_heuristic_only",
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
        semanticMembershipEstablished: false
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
  const vedic = bySystem(loaded, "vedic-astrology");
  assert.deepEqual(vedic.productBoundary, {
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

test("lineage names the exact narrow Vedic transition", async () => {
  const { loaded } = await fixture();
  assert.deepEqual(loaded.lineage, {
    parent: binding(testOnly.PARENT_V26),
    vedicEngineeringManifest: binding(testOnly.VEDIC_MANIFEST_V2),
    parentMechanicallyCurrent: true,
    parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
    vedicEngineeringManifestMechanicallyCurrent: true,
    vedicEngineeringManifestPrivateBrandLoaderRecursivelyReverifiedItsUpstreams:
      true,
    parentPreservedUnmodified: true,
    parentOverwritten: false,
    parentBacklinkToThisChildPresent: false,
    vedicManifestEndpointReplacedFromV1ToV2: true,
    vedicCurrentEngineeringManifestFlagRemainsTrue: true,
    vedicCurrentFullDomainManifestFlagRemainsFalse: true,
    vedicBrowserRuntimeEvidenceUnchangedAtIsolatedCivilTimeFactOnly10Of10:
      true,
    otherSystemCanonicalCopiesPreserved: [
      "bazi",
      "ziwei-doushu",
      "western-astrology"
    ],
    uniqueBlockerClaimed: false
  });
});

test("Vedic engineering flag cannot be rolled back after resealing", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  const forged = reseal(clone(loaded));
  bySystem(forged, "vedic-astrology")
    .currentEvidence.currentEngineeringManifestMechanicallyVerified = false;
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      vedicManifest,
      loaded
    ),
    codeIs("VEDIC_PROJECTION_DRIFT")
  );
});

test("Vedic full-domain flag cannot be promoted after resealing", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "vedic-astrology")
    .currentEvidence.currentFullDomainManifestMechanicallyVerified = true;
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      vedicManifest,
      loaded
    ),
    codeIs("VEDIC_PROJECTION_DRIFT")
  );
});

test("Vedic browser evidence cannot be invented after resealing", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "vedic-astrology")
    .currentEvidence.browserRuntimeEvidence = "production_browser_verified";
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      vedicManifest,
      loaded
    ),
    codeIs("VEDIC_PROJECTION_DRIFT")
  );
});

test("Vedic endpoint substitution cannot pass after resealing", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "vedic-astrology")
    .currentEvidence.endpoints[1].rawSha256 = "f".repeat(64);
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      vedicManifest,
      loaded
    ),
    codeIs("VEDIC_PROJECTION_DRIFT")
  );
});

test("Vedic v2 cannot be appended beside the retained v1 endpoint", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  const forged = clone(loaded);
  const endpoints = bySystem(forged, "vedic-astrology").currentEvidence.endpoints;
  endpoints.splice(1, 0, binding(testOnly.PARENT_VEDIC_MANIFEST_V1_ENDPOINT));
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      vedicManifest,
      loaded
    ),
    codeIs("VEDIC_PROJECTION_DRIFT")
  );
});

test("non-Vedic system drift cannot pass after resealing", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  const forged = clone(loaded);
  bySystem(forged, "ziwei-doushu").currentStatus = "forged";
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      vedicManifest,
      loaded
    ),
    codeIs("NON_VEDIC_PROJECTION_DRIFT")
  );
});

test("gate or authority promotion cannot pass after resealing", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  for (const mutate of [
    (value) => {
      bySystem(value, "vedic-astrology")
        .gateSummary.bindingFrozenVerified = 1;
    },
    (value) => {
      bySystem(value, "vedic-astrology")
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
        vedicManifest,
        loaded
      ),
      (error) =>
        error instanceof FourSystemCurrentStatusObservationChildV27Error
    );
  }
});

test("epoch atomic and ABA promotion cannot pass after resealing", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
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
        vedicManifest,
        loaded
      ),
      codeIs("BOUNDARY_PROMOTION_FORBIDDEN")
    );
  }
});

test("product release and schema inheritance cannot pass", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  for (const mutate of [
    (value) => {
      bySystem(value, "vedic-astrology").productBoundary.releaseIdentity =
        "legacy-v13";
    },
    (value) => {
      bySystem(value, "vedic-astrology").productBoundary.targetSchema = 13;
    },
    (value) => {
      bySystem(value, "vedic-astrology").productBoundary.baziAuthorityInherited =
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
        vedicManifest,
        loaded
      ),
      codeIs("VEDIC_PROJECTION_DRIFT")
    );
  }
});

test("unknown fields cannot pass exact current projection", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  const forged = clone(loaded);
  forged.releaseAuthorized = false;
  reseal(forged);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      vedicManifest,
      loaded
    ),
    codeIs("CURRENT_STATUS_MISMATCH")
  );
});

test("child digest tamper fails before any authority interpretation", async () => {
  const { loaded, parent, vedicManifest } = await fixture();
  const forged = clone(loaded);
  forged.childDigest = "f".repeat(64);
  assert.throws(
    () => testOnly.assertChildBoundary(
      forged,
      parent,
      vedicManifest,
      loaded
    ),
    codeIs("CHILD_DIGEST_INVALID")
  );
});

test("summary requires the exact persisted private brand", async () => {
  const { loaded } = await fixture();
  const summary =
    getFourSystemCurrentStatusObservationChildV27Summary(loaded);
  assert.equal(
    summary.vedicCurrentEngineeringManifestMechanicallyVerified,
    true
  );
  assert.equal(
    summary.vedicCurrentFullDomainManifestMechanicallyVerified,
    false
  );
  assert.equal(
    summary.vedicManifestScope,
    "parent_declared_selected_path_union_not_directory_or_domain_closure"
  );
  assert.equal(summary.projectDefaultActiveLine, "legacy-v13");
  assert.equal(summary.projectDefaultTargetSchema, 13);
  assert.equal(summary.projectDefaultMigrationId, null);
  assert.equal(summary.vedicProductReleaseIdentity, null);
  assert.equal(summary.vedicProductTargetSchema, null);
  assert.equal(summary.vedicProductMigrationId, null);
  assert.equal(Object.hasOwn(summary, "releaseIdentity"), false);
  assert.equal(Object.hasOwn(summary, "targetSchema"), false);
  assert.equal(Object.hasOwn(summary, "migrationId"), false);
  assert.throws(
    () => getFourSystemCurrentStatusObservationChildV27Summary(clone(loaded)),
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
    /^FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_OK \{/u
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
    summary.vedicCurrentEngineeringManifestMechanicallyVerified,
    true
  );
  assert.equal(
    summary.vedicCurrentFullDomainManifestMechanicallyVerified,
    false
  );
  assert.equal(
    summary.vedicBrowserRuntimeEvidence,
    "isolated_civil_time_fact_only_edge_chrome_10_of_10_not_web_pwa_or_product_runtime"
  );
  assert.equal(summary.crossFileAtomicSnapshot, false);
  assert.equal(summary.mutationEpochReceipt, null);
  assert.equal(summary.abaExcluded, false);
  assert.equal(summary.projectDefaultActiveLine, "legacy-v13");
  assert.equal(summary.projectDefaultTargetSchema, 13);
  assert.equal(summary.projectDefaultMigrationId, null);
  assert.equal(summary.vedicProductReleaseIdentity, null);
  assert.equal(summary.vedicProductTargetSchema, null);
  assert.equal(summary.vedicProductMigrationId, null);
  assert.equal(Object.hasOwn(summary, "releaseIdentity"), false);
  assert.equal(Object.hasOwn(summary, "targetSchema"), false);
  assert.equal(Object.hasOwn(summary, "migrationId"), false);
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
      "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_7_FAILED"
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
