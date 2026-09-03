import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";

import {
  buildCurrentZiweiIndependentEngineeringManifestV3,
  canonicalPrettyStringifyZiweiIndependentEngineeringManifestV3,
  computeZiweiIndependentEngineeringManifestV3Digest,
  getZiweiIndependentEngineeringManifestV3Summary,
  isVerifiedZiweiIndependentEngineeringManifestV3,
  loadZiweiIndependentEngineeringManifestV3,
  parseZiweiIndependentEngineeringManifestV3JsonBytes,
  ziweiIndependentEngineeringManifestV3TestOnly as testOnly
} from "./ziwei-independent-engineering-manifest-v3-lib.mjs";
import {
  loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate
} from "./ziwei-expert-promotion-boundary-identity-drift-receipt-candidate-lib.mjs";
import {
  loadZiweiSameArtifactBrowserObservationChildV11
} from "./ziwei-same-artifact-browser-observation-child-v1-1-lib.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, "..");
const CLI_PATH = path.join(
  SCRIPT_DIR,
  "verify-ziwei-independent-engineering-manifest-v3.mjs"
);
const ARTIFACT_PATH = path.join(
  WORKSPACE_ROOT,
  "content",
  "domain-release",
  "ziwei-doushu.engineering-draft.v0.1.0.manifest.v3.json"
);

let expected;
let loaded;
let driftReceipt;
let browserChild;

function clone(value) {
  return structuredClone(value);
}

function resign(value) {
  const candidate = clone(value);
  candidate.manifestDigest = computeZiweiIndependentEngineeringManifestV3Digest(candidate);
  return candidate;
}

function assertRejectsProjection(candidate) {
  assert.throws(
    () => testOnly.assertExpectedProjection(candidate, expected),
    (error) => error?.code === "RED_OR_SCOPE_BOUNDARY_MISMATCH"
      || error?.code === "CURRENT_MANIFEST_MISMATCH"
  );
}

function cleanCliEnvironment(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return env;
}

before(async () => {
  expected = await buildCurrentZiweiIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  loaded = await loadZiweiIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  driftReceipt =
    await loadZiweiExpertPromotionBoundaryIdentityDriftReceiptCandidate(WORKSPACE_ROOT);
  browserChild = await loadZiweiSameArtifactBrowserObservationChildV11(WORKSPACE_ROOT);
});

test("fixed-path loader returns a private brand and exact frozen summary", () => {
  assert.equal(isVerifiedZiweiIndependentEngineeringManifestV3(loaded), true);
  assert.equal(Object.isFrozen(loaded), true);
  const summary = getZiweiIndependentEngineeringManifestV3Summary(loaded);
  assert.deepEqual(summary.artifact, {
    bytes: 68_696,
    path:
      "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v3.json",
    sha256: "6a95c2eca3524763c20b03d389c4d7d14d0639bafb6db31c361b384946430396"
  });
  assert.equal(
    summary.manifestDigest,
    "7018bf1df4bec8f6c753a11f72bcb2f3f2d63f3d46b194ef27fc2991dd06cb60"
  );
  assert.equal(summary.selectedUniquePhysicalPaths, 76);
  assert.equal(summary.componentFileReferences, 59);
  assert.equal(summary.engineeringAttachmentPaths, 30);
  assert.equal(summary.currentEngineeringManifestMechanicallyVerified, true);
  assert.equal(summary.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.browserRuntimeEvidenceEstablishedByThisManifest, false);
});

test("persisted artifact is exact current canonical LF materialization", async () => {
  assert.deepEqual(loaded.manifest, expected);
  const canonical =
    canonicalPrettyStringifyZiweiIndependentEngineeringManifestV3(expected);
  const persisted = await readFile(ARTIFACT_PATH, "utf8");
  assert.equal(persisted, canonical);
  assert.equal(Buffer.byteLength(canonical, "utf8"), 68_696);
  assert.equal(
    testOnly.sha256Text(canonical),
    "6a95c2eca3524763c20b03d389c4d7d14d0639bafb6db31c361b384946430396"
  );
});

test("drift receipt and browser child require fixed-path full-loader private brands", () => {
  assert.doesNotThrow(() => testOnly.requireVerifiedDriftReceipt(driftReceipt));
  assert.doesNotThrow(() => testOnly.requireVerifiedBrowserChild(browserChild));
  assert.throws(
    () => testOnly.requireVerifiedDriftReceipt(clone(driftReceipt)),
    (error) => error?.code === "DRIFT_RECEIPT_PRIVATE_BRAND_REQUIRED"
  );
  assert.throws(
    () => testOnly.requireVerifiedBrowserChild(clone(browserChild)),
    (error) => error?.code === "BROWSER_CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("summary rejects an exact structural clone without the v3 private brand", () => {
  const impostor = clone(loaded);
  assert.equal(isVerifiedZiweiIndependentEngineeringManifestV3(impostor), false);
  assert.throws(
    () => getZiweiIndependentEngineeringManifestV3Summary(impostor),
    (error) => error?.code === "VERIFIED_BRAND_REQUIRED"
  );
});

test("selected closure is exactly definition 46 plus browser child 50 minus overlap 20", () => {
  const selected = expected.selectedClosure.files;
  assert.equal(selected.length, 76);
  assert.equal(new Set(selected.map((file) => file.path)).size, 76);
  assert.equal(
    selected.filter((file) => file.declarationSources.includes(
      "current_old_schema_definition_projection"
    )).length,
    46
  );
  assert.equal(
    selected.filter((file) => file.declarationSources.includes(
      "browser_child_v1_1_authored_build_graph"
    )).length,
    50
  );
  assert.equal(
    selected.filter((file) => file.declarationSources.length === 2).length,
    20
  );
  assert.equal(expected.selectedClosure.overlapBetweenDeclaredSets, 20);
  assert.equal(expected.selectedClosure.recursiveDirectoryEnumerationPerformed, false);
  assert.equal(expected.selectedClosure.extraFileAbsenceEstablished, false);
});

test("component ledger stays 59 refs, 46 definition-mapped paths, 30 child-only attachments", () => {
  assert.deepEqual(expected.componentAccounting, {
    componentCount: 9,
    componentFileReferences: 59,
    engineeringAttachmentPaths: 30,
    mappedUniquePhysicalPaths: 46,
    selectedUniquePhysicalPaths: 76
  });
  assert.deepEqual(
    expected.components.map((component) => [
      component.componentId,
      component.files.length
    ]),
    [
      ["execution_rules", 5],
      ["interpretation_rules", 7],
      ["input_policy", 1],
      ["fact_contract", 4],
      ["source_bundle", 16],
      ["rights_bundle", 11],
      ["expert_review_bundle", 0],
      ["high_risk_policy", 10],
      ["report_contract", 5]
    ]
  );
  for (const component of expected.components) {
    assert.equal(
      component.classificationBasis,
      "historical_v2_fixed_definition_membership_only"
    );
    assert.equal(component.boundary.semanticMembershipEstablished, false);
    assert.equal(component.boundary.componentComplete, false);
    assert.equal(component.boundary.domainTruthEstablished, false);
  }
});

test("all 30 attachments are child-only and are not laundered into components", () => {
  const componentPaths = new Set(
    expected.components.flatMap((component) => component.files.map((file) => file.path))
  );
  const attachmentPaths = new Set(
    expected.engineeringAttachments.map((file) => file.path)
  );
  assert.equal(attachmentPaths.size, 30);
  for (const file of expected.selectedClosure.files) {
    const childOnly = file.declarationSources.length === 1
      && file.declarationSources[0] === "browser_child_v1_1_authored_build_graph";
    assert.equal(attachmentPaths.has(file.path), childOnly);
    if (childOnly) assert.equal(componentPaths.has(file.path), false);
  }
});

test("fixed old projection records one physical source fanout, five changed, four unchanged", () => {
  assert.equal(
    expected.lineage.currentOldSchemaProjection.manifestDigest,
    "24ddffd0caebbce4f800154ad70fb24e441e67b3580785b798044b0393d70b66"
  );
  assert.equal(
    expected.lineage.currentOldSchemaProjection.historicalCreatedAt,
    "2026-08-31T06:00:00.000Z"
  );
  assert.equal(
    expected.lineage.currentOldSchemaProjection.createdAtFixedToHistoricalV2CreatedAt,
    true
  );
  assert.deepEqual(
    expected.lineage.onePhysicalSourceFanout.changedComponentIds,
    testOnly.CHANGED_COMPONENT_IDS
  );
  assert.deepEqual(
    expected.lineage.onePhysicalSourceFanout.unchangedComponentIds,
    testOnly.UNCHANGED_COMPONENT_IDS
  );
  assert.equal(expected.lineage.onePhysicalSourceFanout.changedPhysicalSourceCount, 1);
  assert.equal(
    expected.lineage.onePhysicalSourceFanout.path,
    "packages/ziwei-doushu-contracts-draft/src/index.ts"
  );
  assert.equal(
    expected.lineage.onePhysicalSourceFanout.fiveIndependentSemanticChangesClaimed,
    false
  );
  const currentSource = expected.selectedClosure.files.find(
    (file) => file.path === testOnly.CONTRACT_SOURCE.path
  );
  assert.equal(currentSource.bytes, testOnly.CONTRACT_SOURCE.currentRawBytes);
  assert.equal(currentSource.sha256, testOnly.CONTRACT_SOURCE.currentRawSha256);
  assert.equal(
    driftReceipt.scope.sourceChange.persistedRawBytes,
    testOnly.CONTRACT_SOURCE.persistedRawBytes
  );
  assert.equal(
    driftReceipt.scope.sourceChange.persistedRawSha256,
    testOnly.CONTRACT_SOURCE.persistedRawSha256
  );
});

test("source, rights, high-risk, and report remain incomplete while expert is absent", () => {
  const components = Object.fromEntries(
    expected.components.map((component) => [component.componentId, component])
  );
  assert.match(components.source_bundle.status, /^incomplete_/);
  assert.match(components.rights_bundle.status, /^incomplete_/);
  assert.match(components.high_risk_policy.status, /^incomplete_/);
  assert.match(components.report_contract.status, /^incomplete_/);
  assert.match(components.expert_review_bundle.status, /^absent_/);
  assert.equal(components.expert_review_bundle.files.length, 0);
});

test("focused CLI preload rejection is not laundered into selected manifest identity", () => {
  assert.equal(
    expected.runtimeTrustBoundary.visibleCliLoaderInjectionRejectedBySelectedIdentity,
    false
  );
  assert.equal(
    Object.hasOwn(expected.runtimeTrustBoundary, "visibleCliLoaderInjectionRejected"),
    false
  );
  const candidate = clone(expected);
  candidate.runtimeTrustBoundary.visibleCliLoaderInjectionRejectedBySelectedIdentity = true;
  assertRejectsProjection(resign(candidate));
});

test("historical v2, drift receipt, and browser child identities are exact", () => {
  assert.deepEqual(expected.artifactBindings[0], {
    currentCandidateManifestDigest:
      "24ddffd0caebbce4f800154ad70fb24e441e67b3580785b798044b0393d70b66",
    mechanicallyCurrent: false,
    path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json",
    persistedManifestDigest:
      "f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e",
    rawBytes: 17_968,
    rawSha256: "f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867",
    role: "historical_ziwei_domain_manifest_v2_raw_and_self_identity",
    selfDigestVerified: true
  });
  assert.equal(expected.artifactBindings[1].receiptDigest, testOnly.EXPECTED_DRIFT_RECEIPT.receiptDigest);
  assert.equal(expected.artifactBindings[1].privateBrandConsumed, true);
  assert.equal(expected.artifactBindings[2].childDigest, testOnly.EXPECTED_BROWSER_CHILD.childDigest);
  assert.equal(expected.artifactBindings[2].authoredBuildPathCount, 50);
  assert.equal(expected.artifactBindings[2].privateBrandConsumed, true);
});

test("known 33 non-runtime package-root omissions stay outside selected identity", () => {
  const selectedPaths = new Set(
    expected.selectedClosure.files.map((file) => file.path)
  );
  const omitted = Object.values(testOnly.KNOWN_OMITTED_BY_ROOT).flat();
  assert.equal(omitted.length, 33);
  assert.equal(new Set(omitted).size, 33);
  for (const pathName of omitted) assert.equal(selectedPaths.has(pathName), false);
  assert.equal(
    expected.scopeOmissions.omissionListsMechanicallyReverifiedByThisLoader,
    false
  );
  assert.equal(
    expected.scopeOmissions.runtimeDirectoryContentsBoundByThisManifest,
    false
  );
});

test("directory, package, engineering, and full-domain closure laundering is rejected", () => {
  for (const mutate of [
    (value) => { value.selectedClosure.recursiveDirectoryEnumerationPerformed = true; },
    (value) => { value.selectedClosure.extraFileAbsenceEstablished = true; },
    (value) => { value.selectedClosure.entireContractsPackageRootClosureEstablished = true; },
    (value) => { value.selectedClosure.entireIztroPackageRootClosureEstablished = true; },
    (value) => { value.selectedClosure.entireFortelPackageRootClosureEstablished = true; },
    (value) => { value.selectedClosure.entireWorkspacePackageRootClosureEstablished = true; },
    (value) => { value.selectedClosure.entireZiweiEngineeringClosureEstablished = true; },
    (value) => { value.versionBoundary.currentFullDomainManifestMechanicallyVerified = true; }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("component semantic membership and completeness cannot be raised", () => {
  for (const mutate of [
    (value) => { value.componentClassificationBoundary.semanticMembershipEstablished = true; },
    (value) => { value.componentClassificationBoundary.componentComplete = true; },
    (value) => { value.components[0].boundary.semanticMembershipEstablished = true; },
    (value) => { value.components[4].boundary.componentComplete = true; },
    (value) => { value.components[6].status = "complete"; }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("a child-only attachment cannot enter a component or disappear", () => {
  const attachment = clone(expected.engineeringAttachments[0]);
  const injected = clone(expected);
  injected.components[0].files.push({
    bytes: attachment.bytes,
    path: attachment.path,
    sha256: attachment.sha256
  });
  injected.components[0].fileReferenceCount += 1;
  injected.componentAccounting.componentFileReferences += 1;
  assertRejectsProjection(resign(injected));

  const removed = clone(expected);
  removed.engineeringAttachments.shift();
  removed.componentAccounting.engineeringAttachmentPaths -= 1;
  assertRejectsProjection(resign(removed));
});

test("browser child 28/28 cannot become product, PWA, public-host, or production evidence", () => {
  assert.equal(expected.browserEvidenceBoundary.childIssuanceTotalPassedScenarioOutcomes, 28);
  for (const mutate of [
    (value) => { value.browserEvidenceBoundary.browserRuntimeEvidenceEstablishedByThisManifest = true; },
    (value) => { value.browserEvidenceBoundary.runtimeObservationRerunByThisManifest = true; },
    (value) => { value.browserEvidenceBoundary.fullApplicationRuntimeValidated = true; },
    (value) => { value.browserEvidenceBoundary.productionBrowserRuntimeEvidenceEstablished = true; },
    (value) => { value.browserEvidenceBoundary.pwaOrServiceWorkerValidated = true; },
    (value) => { value.browserEvidenceBoundary.publicHostValidated = true; }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("product, release, schema, migration, and legacy inheritance remain absent", () => {
  for (const mutate of [
    (value) => { value.productBoundary.productIdentity = "ziwei"; },
    (value) => { value.productBoundary.releaseIdentity = "legacy-v13"; },
    (value) => { value.productBoundary.targetSchema = 13; },
    (value) => { value.productBoundary.migrationId = "forged"; },
    (value) => { value.projectDefaultReleaseGovernance.inheritedByThisSystem = true; },
    (value) => { value.surface.ownerAssignedProductIdentity = true; }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("gates, truth, rights, expert, release, and publication flags cannot be raised", () => {
  for (const mutate of [
    (value) => { value.gateState.admissionGatesSatisfied = 1; },
    (value) => { value.gateState.bindingFrozenVerified = 1; },
    (value) => { value.gateState.independentExpertReviewsVerified = 1; },
    (value) => { value.gateState.sourceBundleComplete = true; },
    (value) => { value.gateState.rightsBundleComplete = true; },
    (value) => { value.gateState.highRiskPolicyBound = true; },
    (value) => { value.authorityBoundary.contentTruthEstablished = true; },
    (value) => { value.authorityBoundary.expertTruthEstablished = true; },
    (value) => { value.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("mutation epoch, atomicity, interval integrity, and ABA stay unestablished", () => {
  for (const mutate of [
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.intervalMutationExcludedAcrossFiles = true; },
    (value) => { value.observationBoundary.abaExcluded = true; },
    (value) => { value.observationBoundary.mutationEpochAvailableForProduct = true; },
    (value) => { value.observationBoundary.mutationEpochReceipt = "forged"; }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("artifact binding drift and clone substitution are rejected", () => {
  for (const mutate of [
    (value) => { value.artifactBindings[0].rawSha256 = "0".repeat(64); },
    (value) => { value.artifactBindings[1].receiptDigest = "0".repeat(64); },
    (value) => { value.artifactBindings[2].childDigest = "0".repeat(64); },
    (value) => { value.artifactBindings.push(clone(value.artifactBindings[2])); }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("unknown top-level and nested data remain forbidden after digest recomputation", () => {
  for (const mutate of [
    (value) => { value.futureAuthority = false; },
    (value) => { value.selectedClosure.futurePathClass = "none"; }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("strict JSON parser rejects duplicate keys and BOM", () => {
  assert.throws(() => parseZiweiIndependentEngineeringManifestV3JsonBytes(
    Buffer.from('{"schemaVersion":"3.0.0","schemaVersion":"3.0.0"}', "utf8")
  ));
  assert.throws(() => parseZiweiIndependentEngineeringManifestV3JsonBytes(
    Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
  ));
});

test("canonical materialization rejects aliases, accessors, sparse arrays, and negative zero", () => {
  const shared = {};
  assert.throws(() =>
    canonicalPrettyStringifyZiweiIndependentEngineeringManifestV3({
      left: shared,
      right: shared
    })
  );
  const accessor = {};
  Object.defineProperty(accessor, "value", { enumerable: true, get() { return 1; } });
  assert.throws(() =>
    canonicalPrettyStringifyZiweiIndependentEngineeringManifestV3(accessor)
  );
  const sparse = [];
  sparse.length = 1;
  assert.throws(() =>
    canonicalPrettyStringifyZiweiIndependentEngineeringManifestV3(sparse)
  );
  assert.throws(() =>
    canonicalPrettyStringifyZiweiIndependentEngineeringManifestV3({ value: -0 })
  );
});

test("CLI succeeds only with no caller-supplied operands", () => {
  const ok = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: cleanCliEnvironment()
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(
    ok.stdout,
    /^ZIWEI_DEFINITION_AND_BROWSER_CHILD_SELECTED_PATH_MACHINE_IDENTITY_MANIFEST_V3_OK /
  );

  const extra = spawnSync(process.execPath, [CLI_PATH, "caller-path.json"], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: cleanCliEnvironment()
  });
  assert.equal(extra.status, 1);
  assert.match(extra.stderr, /ARGUMENTS_FORBIDDEN/);
});

test("CLI rejects visible NODE_OPTIONS and NODE_PATH before dynamic imports", () => {
  for (const extra of [
    { NODE_OPTIONS: "--no-warnings" },
    { NODE_PATH: WORKSPACE_ROOT }
  ]) {
    const result = spawnSync(process.execPath, [CLI_PATH], {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
      env: { ...cleanCliEnvironment(), ...extra }
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/);
  }
});

test("CLI rejects a visible --import pre-evaluation path", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "data:text/javascript,", CLI_PATH],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
      env: cleanCliEnvironment()
    }
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/);
});

test("CLI visible preload guard survives Array.prototype.some first-call sabotage", () => {
  const payload =
    "data:text/javascript,const o=Array.prototype.some%3Blet n=0%3B"
    + "Array.prototype.some=function(...a)%7Bif(n%2B%2B===0)%7B"
    + "Array.prototype.some=o%3Breturn false%7Dreturn Reflect.apply(o,this,a)%7D";
  const result = spawnSync(
    process.execPath,
    [`--import=${payload}`, CLI_PATH],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
      env: cleanCliEnvironment()
    }
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/);
  assert.doesNotMatch(
    result.stdout,
    /ZIWEI_DEFINITION_AND_BROWSER_CHILD_SELECTED_PATH_MACHINE_IDENTITY_MANIFEST_V3_OK/
  );
});
