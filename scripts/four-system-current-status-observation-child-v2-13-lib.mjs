import { createHash } from "node:crypto";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_12_RELATIVE_PATH,
  isVerifiedFourSystemCurrentStatusObservationChildV212,
  loadFourSystemCurrentStatusObservationChildV212
} from "./four-system-current-status-observation-child-v2-12-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH,
  getZiweiIndependentEngineeringManifestV4Summary,
  isVerifiedZiweiIndependentEngineeringManifestV4,
  loadZiweiIndependentEngineeringManifestV4
} from "./ziwei-independent-engineering-manifest-v4-lib.mjs";

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_13_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.13.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.13.0";
const CREATED_AT = "2026-09-03T06:46:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-03T06:47:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.13";
const SHA256 = /^[a-f0-9]{64}$/u;

const PARENT_IDENTITY = Object.freeze({
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_12_RELATIVE_PATH,
  rawBytes: 20_369,
  rawSha256: "f5280c1ba72d4e1da3968f7b9a82db078ebd54f39e19b0b3665871b5787f32e4",
  semanticDigest: "9921847ccc30df5cb8e000eac70e7241031eea172bd4675b71ba2f6d967c5dc0"
});

const ZIWEI_MANIFEST_IDENTITY = Object.freeze({
  path: ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH,
  rawBytes: 40_230,
  rawSha256: "f1aa27896f589a3b1070ff6eb00b4c60fe3f77811365d760ee86b80b5e35ea3e",
  semanticDigest: "46c2784875462e1851d0e3c7e352163660fbe29916e6ad6abd4f50065db42170"
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 20_784,
  rawSha256: "5d8ecab2d59c8897ad27d9ba6226e1093231d33f874e58b49c9194b8166d74ff",
  childDigest: "5d1cbad8a5c49fe970e9bc6f30fbe949a3eb56947e08efc9099ce0077bc01864"
});

const BRAND = new WeakSet();

export class FourSystemCurrentStatusObservationChildV213Error extends Error {
  constructor(code, detail = "", options = undefined) {
    super(detail ? `${code}: ${detail}` : code, options);
    this.name = "FourSystemCurrentStatusObservationChildV213Error";
    this.code = code;
  }
}

function fail(code, detail = "", cause = undefined) {
  throw new FourSystemCurrentStatusObservationChildV213Error(
    code,
    detail,
    cause === undefined ? undefined : { cause }
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}

function compact(value) {
  return JSON.stringify(canonical(value));
}

function exactJson(left, right) {
  return compact(left) === compact(right);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function computeFourSystemCurrentStatusObservationChildV213Digest(value) {
  const unsigned = clone(value);
  delete unsigned.childDigest;
  return sha256(Buffer.from(`${DIGEST_DOMAIN}\0${compact(unsigned)}`, "utf8"));
}

export function serializeFourSystemCurrentStatusObservationChildV213(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function binding(identity, role, semanticDigest, semanticDigestField) {
  return { ...identity, role, semanticDigest, semanticDigestField };
}

function requireParent(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV212(parent)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED");
  }
  if (parent.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.12.0"
      || parent.childDigest !== PARENT_IDENTITY.semanticDigest
      || parent.currentStatusSummary?.totalAdmissionGatesSatisfied !== 0
      || parent.currentStatusSummary?.totalAdmissionGatesRequired !== 32
      || parent.authorityBoundary?.releaseReady !== false
      || parent.authorityBoundary?.publicReleaseAuthorized !== false) {
    fail("PARENT_IDENTITY_OR_BOUNDARY_INVALID");
  }
  return parent;
}

function requireManifest(manifest) {
  if (!isVerifiedZiweiIndependentEngineeringManifestV4(manifest)) {
    fail("ZIWEI_MANIFEST_PRIVATE_BRAND_REQUIRED");
  }
  const summary = getZiweiIndependentEngineeringManifestV4Summary(manifest);
  if (summary.manifestDigest !== ZIWEI_MANIFEST_IDENTITY.semanticDigest
      || summary.authoredFileCount !== 91
      || summary.newlyCoveredExtraCount !== 33
      || summary.prePostTreeDigestEqual !== true
      || summary.currentFourPackageAuthoredSourceRootManifestMechanicallyVerified !== true
      || summary.currentFullDomainManifestMechanicallyVerified !== false
      || summary.bindingFrozenVerified !== 0 || summary.bindingRequired !== 27
      || summary.independentExpertReviewsVerified !== 0
      || summary.independentExpertsRequired !== 2
      || summary.releaseReady !== false || summary.publicReleaseAuthorized !== false) {
    fail("ZIWEI_MANIFEST_IDENTITY_OR_BOUNDARY_INVALID");
  }
  return summary;
}

async function exactIdentity(root, expected, code) {
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(root, expected.path);
  } catch (cause) {
    fail(code, expected.path, cause);
  }
  if (snapshot.rawBytes !== expected.rawBytes
      || snapshot.rawSha256 !== expected.rawSha256) fail(code, expected.path);
  return {
    path: expected.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  };
}

async function collectInputs(root) {
  let parent;
  let manifest;
  try {
    parent = requireParent(await loadFourSystemCurrentStatusObservationChildV212(root));
  } catch (cause) {
    if (cause instanceof FourSystemCurrentStatusObservationChildV213Error) throw cause;
    fail("PARENT_REVERIFICATION_FAILED", "four-system v2.12 复验失败。", cause);
  }
  try {
    manifest = await loadZiweiIndependentEngineeringManifestV4(root);
  } catch (cause) {
    fail("ZIWEI_MANIFEST_REVERIFICATION_FAILED", "Ziwei Manifest v4 复验失败。", cause);
  }
  const manifestSummary = requireManifest(manifest);
  return {
    parent,
    manifest,
    manifestSummary,
    parentIdentity: await exactIdentity(root, PARENT_IDENTITY, "PARENT_RAW_IDENTITY_INVALID"),
    manifestIdentity: await exactIdentity(
      root,
      ZIWEI_MANIFEST_IDENTITY,
      "ZIWEI_MANIFEST_RAW_IDENTITY_INVALID"
    )
  };
}

function buildProjection(inputs) {
  const systems = clone(inputs.parent.systems);
  const ziwei = systems.find((entry) => entry.contractSystemId === "ziwei");
  if (!ziwei || ziwei.currentEvidence?.endpoints?.length !== 3) {
    fail("ZIWEI_PARENT_PROJECTION_INVALID");
  }
  const oldManifestIndex = ziwei.currentEvidence.endpoints.findIndex((entry) =>
    entry.path
      === "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v3.json"
  );
  if (oldManifestIndex < 0
      || ziwei.currentEvidence.endpoints.some((entry) =>
        entry.path === ZIWEI_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH)) {
    fail("ZIWEI_PARENT_ENDPOINT_SET_INVALID");
  }
  const parentBinding = binding(
    inputs.parentIdentity,
    "current_direct_predecessor_four_system_current_status_observation_child_v2_12",
    inputs.parent.childDigest,
    "childDigest"
  );
  const manifestBinding = binding(
    inputs.manifestIdentity,
    "current_ziwei_four_package_authored_source_root_machine_identity_manifest_v4",
    inputs.manifestSummary.manifestDigest,
    "manifestDigest"
  );
  ziwei.currentEvidence.endpoints[oldManifestIndex] = manifestBinding;
  ziwei.currentEvidence.currentEndpointMechanicallyVerified = true;
  ziwei.currentEvidence.currentEngineeringManifestMechanicallyVerified = true;
  ziwei.currentEvidence.currentFullDomainManifestMechanicallyVerified = false;
  ziwei.currentStatus =
    "current_expert_promotion_boundary_identity_drift_receipt_plus_current_isolated_same_artifact_browser_child_plus_current_four_package_authored_source_root_manifest_v4_full_domain_false";

  const unsigned = {
    ...clone(inputs.parent),
    schemaVersion: "2.13.0",
    recordType: "four_system_current_status_observation_child_v2_13",
    childId: CHILD_ID,
    status:
      "append_only_non_atomic_ziwei_four_package_authored_source_root_identity_status_observation_child_zero_admission_effect",
    createdAt: CREATED_AT,
    artifactBindings: [parentBinding, manifestBinding],
    systems,
    lineage: {
      parent: parentBinding,
      parentPreservedUnmodified: true,
      parentOverwritten: false,
      parentBacklinkToThisChildPresent: false,
      parentMechanicallyCurrent: true,
      parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
      ziweiManifestV3EndpointReplacedByV4: true,
      ziweiEndpointCountBefore: 3,
      ziweiEndpointCountAfter: 3,
      ziweiEngineeringFlagRemainsTrue: true,
      ziweiFourPackageAuthoredSourceRootIdentityAdded: true,
      ziweiAuthoredSourceRootCount: 4,
      ziweiAuthoredOrdinaryFileCount: 91,
      ziweiNewlyCoveredV3UnselectedFileCount: 33,
      baziWesternVedicCanonicalCopiesPreserved: true,
      uniqueBlockerClaimed: false,
      childCreatedAtClock: "untrusted_local_clock_label",
      childCreatedAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      trustedTimestampEstablished: false,
      externalTimeAuthorityEstablished: false,
      crossArtifactTemporalOrderEstablished: false
    },
    observationBoundary: {
      ...clone(inputs.parent.observationBoundary),
      exactPersistedRawIdentitiesVerified: 2,
      upstreamPrivateBrandsVerified: 2
    },
    doesNotEstablish: [
      ...clone(inputs.parent.doesNotEstablish),
      "ziwei_excluded_generated_subtree_contents_or_complete_physical_package_root_closure",
      "ziwei_four_package_authored_source_root_identity_as_entire_engineering_domain_or_product_closure",
      "ziwei_newly_covered_v3_unselected_files_as_unauthorized_or_formally_promoted_content",
      "ziwei_product_runtime_storage_sources_rights_expert_domain_or_release_authority"
    ]
  };
  delete unsigned.childDigest;
  return {
    ...unsigned,
    childDigest: computeFourSystemCurrentStatusObservationChildV213Digest(unsigned)
  };
}

function allFalse(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).length === 0
      || Object.values(value).some((entry) => entry !== false)) fail(code);
}

function assertBoundary(value, parent) {
  if (value?.schemaVersion !== "2.13.0"
      || value?.recordType !== "four_system_current_status_observation_child_v2_13"
      || value?.childId !== CHILD_ID
      || value?.status
        !== "append_only_non_atomic_ziwei_four_package_authored_source_root_identity_status_observation_child_zero_admission_effect"
      || value?.createdAt !== CREATED_AT || value.createdAt >= CREATED_AT_UPPER_BOUND
      || value?.activeAdmissionEffect !== "none"
      || !SHA256.test(value?.childDigest ?? "")
      || computeFourSystemCurrentStatusObservationChildV213Digest(value)
        !== value.childDigest
      || value?.currentStatusSummary?.totalAdmissionGatesRequired !== 32
      || value?.currentStatusSummary?.totalAdmissionGatesSatisfied !== 0
      || value?.currentStatusSummary?.systemsFormallyAdmitted !== 0
      || value?.currentStatusSummary?.systemsDomainAuthorityAuthorized !== 0
      || value?.currentStatusSummary?.systemsReleaseReady !== 0
      || value?.currentStatusSummary?.systemsPublicReleaseAuthorized !== 0
      || value?.currentStatusSummary?.bindingFrozenVerifiedBySystem?.ziwei !== "0/27"
      || value?.currentStatusSummary?.independentExpertReviewsVerifiedBySystem?.ziwei !== "0/2"
      || value?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
      || value?.projectReleaseGovernanceContext?.targetSchema !== 13
      || value?.projectReleaseGovernanceContext?.migrationId !== null
      || value?.projectReleaseGovernanceContext?.mutationEpochAvailableForSchema13 !== false
      || value?.projectReleaseGovernanceContext?.mutationEpochReceipt !== null
      || value?.observationBoundary?.crossFileAtomicSnapshot !== false
      || value?.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
      || value?.observationBoundary?.abaExcluded !== false
      || value?.observationBoundary?.exactPersistedRawIdentitiesVerified !== 2
      || value?.observationBoundary?.upstreamPrivateBrandsVerified !== 2) {
    fail("CHILD_BOUNDARY_INVALID");
  }
  allFalse(value.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  if (!Array.isArray(value.systems) || value.systems.length !== 4) {
    fail("SYSTEM_SET_INVALID");
  }
  for (const id of ["bazi", "ziwei", "western", "vedic"]) {
    const system = value.systems.find((entry) => entry.contractSystemId === id);
    const parentSystem = parent.systems.find((entry) => entry.contractSystemId === id);
    if (!system || !parentSystem || system.gateSummary?.admissionGatesSatisfied !== 0
        || system.gateSummary?.bindingFrozenVerified !== 0
        || system.gateSummary?.independentExpertReviewsVerified !== 0
        || system.currentEvidence?.currentFullDomainManifestMechanicallyVerified !== false) {
      fail("SYSTEM_RED_BOUNDARY_INVALID", id);
    }
    allFalse(system.authorityBoundary, "SYSTEM_AUTHORITY_BOUNDARY_INVALID");
    if (id !== "ziwei" && !exactJson(system, parentSystem)) {
      fail("NON_ZIWEI_SYSTEM_DRIFT", id);
    }
  }
  const ziwei = value.systems.find((entry) => entry.contractSystemId === "ziwei");
  if (ziwei.currentEvidence.endpoints.length !== 3
      || ziwei.currentEvidence.currentEndpointMechanicallyVerified !== true
      || ziwei.currentEvidence.currentEngineeringManifestMechanicallyVerified !== true
      || ziwei.currentEvidence.currentFullDomainManifestMechanicallyVerified !== false
      || ziwei.currentEvidence.browserRuntimeEvidence
        !== "isolated_same_artifact_edge_chrome_28_of_28_current_source_graph_not_web_pwa_or_product_runtime"
      || ziwei.gateSummary.bindingRequired !== 27
      || ziwei.gateSummary.independentExpertsRequired !== 2
      || (ziwei.productBoundary.productIdentity ?? null) !== null
      || ziwei.productBoundary.releaseIdentity !== null
      || ziwei.productBoundary.targetSchema !== null
      || ziwei.productBoundary.migrationId !== null
      || ziwei.currentEvidence.endpoints.some((entry) =>
        entry.path
          === "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v3.json")) {
    fail("ZIWEI_PROJECTION_INVALID");
  }
  const v4Endpoints = ziwei.currentEvidence.endpoints.filter((entry) =>
    entry.path === ZIWEI_MANIFEST_IDENTITY.path
  );
  if (v4Endpoints.length !== 1 || !exactJson(v4Endpoints[0], binding(
    {
      path: ZIWEI_MANIFEST_IDENTITY.path,
      rawBytes: ZIWEI_MANIFEST_IDENTITY.rawBytes,
      rawSha256: ZIWEI_MANIFEST_IDENTITY.rawSha256
    },
    "current_ziwei_four_package_authored_source_root_machine_identity_manifest_v4",
    ZIWEI_MANIFEST_IDENTITY.semanticDigest,
    "manifestDigest"
  ))) fail("ZIWEI_MANIFEST_ENDPOINT_INVALID");
  if (!Array.isArray(value.artifactBindings) || value.artifactBindings.length !== 2
      || value.artifactBindings[0]?.path !== PARENT_IDENTITY.path
      || value.artifactBindings[0]?.rawBytes !== PARENT_IDENTITY.rawBytes
      || value.artifactBindings[0]?.rawSha256 !== PARENT_IDENTITY.rawSha256
      || value.artifactBindings[0]?.semanticDigest !== PARENT_IDENTITY.semanticDigest
      || !exactJson(value.artifactBindings[1], v4Endpoints[0])) {
    fail("ARTIFACT_BINDINGS_INVALID");
  }
  if (value.lineage?.parentPreservedUnmodified !== true
      || value.lineage?.parentOverwritten !== false
      || value.lineage?.ziweiManifestV3EndpointReplacedByV4 !== true
      || value.lineage?.ziweiEndpointCountBefore !== 3
      || value.lineage?.ziweiEndpointCountAfter !== 3
      || value.lineage?.ziweiFourPackageAuthoredSourceRootIdentityAdded !== true
      || value.lineage?.ziweiAuthoredSourceRootCount !== 4
      || value.lineage?.ziweiAuthoredOrdinaryFileCount !== 91
      || value.lineage?.ziweiNewlyCoveredV3UnselectedFileCount !== 33
      || value.lineage?.baziWesternVedicCanonicalCopiesPreserved !== true
      || value.lineage?.trustedTimestampEstablished !== false
      || value.lineage?.externalTimeAuthorityEstablished !== false
      || value.lineage?.crossArtifactTemporalOrderEstablished !== false) {
    fail("LINEAGE_BOUNDARY_INVALID");
  }
  return value;
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV213(
  root = process.cwd()
) {
  const inputs = await collectInputs(root);
  return deepFreeze(assertBoundary(buildProjection(inputs), inputs.parent));
}

export async function loadFourSystemCurrentStatusObservationChildV213(
  root = process.cwd()
) {
  const inputs = await collectInputs(root);
  const expected = deepFreeze(assertBoundary(buildProjection(inputs), inputs.parent));
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(
      root,
      FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_13_RELATIVE_PATH
    );
  } catch (cause) {
    fail("PERSISTED_CHILD_STABLE_READ_FAILED", "four-system v2.13 不可稳定读取。", cause);
  }
  const persisted = assertBoundary(parseBaziDttStrictJsonArtifact(snapshot), inputs.parent);
  if (Buffer.from(snapshot.bytes).toString("utf8")
      !== serializeFourSystemCurrentStatusObservationChildV213(persisted)
      || !exactJson(persisted, expected)) fail("CURRENT_STATUS_MISMATCH");
  if (EXPECTED_PERSISTED.rawBytes > 0
      && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
        || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
        || persisted.childDigest !== EXPECTED_PERSISTED.childDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH");
  }
  const result = deepFreeze(clone(persisted));
  BRAND.add(result);
  return result;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV213(value) {
  return value !== null && typeof value === "object" && Object.isFrozen(value)
    && BRAND.has(value);
}

export function getFourSystemCurrentStatusObservationChildV213Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV213(value)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED");
  }
  const ziwei = value.systems.find((entry) => entry.contractSystemId === "ziwei");
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    ziweiStatus: ziwei.currentStatus,
    ziweiEndpointCount: ziwei.currentEvidence.endpoints.length,
    ziweiCurrentEngineeringManifestMechanicallyVerified:
      ziwei.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    ziweiCurrentFullDomainManifestMechanicallyVerified:
      ziwei.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    ziweiBindingFrozenVerified: ziwei.gateSummary.bindingFrozenVerified,
    ziweiBindingRequired: ziwei.gateSummary.bindingRequired,
    ziweiIndependentExpertReviewsVerified:
      ziwei.gateSummary.independentExpertReviewsVerified,
    ziweiIndependentExpertsRequired: ziwei.gateSummary.independentExpertsRequired,
    totalAdmissionGatesSatisfied:
      value.currentStatusSummary.totalAdmissionGatesSatisfied,
    totalAdmissionGatesRequired: value.currentStatusSummary.totalAdmissionGatesRequired,
    releaseReadySystems: value.currentStatusSummary.systemsReleaseReady,
    publicReleaseAuthorizedSystems:
      value.currentStatusSummary.systemsPublicReleaseAuthorized,
    projectDefaultActiveLine: value.projectReleaseGovernanceContext.activeLine,
    projectDefaultTargetSchema: value.projectReleaseGovernanceContext.targetSchema,
    projectDefaultMigrationId: value.projectReleaseGovernanceContext.migrationId,
    mutationEpochAvailableForSchema13:
      value.projectReleaseGovernanceContext.mutationEpochAvailableForSchema13,
    publicDeploymentAuthorized: value.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: value.authorityBoundary.expertClaimsAuthorized
  });
}

export const fourSystemCurrentStatusObservationChildV213TestOnly = deepFreeze({
  CHILD_ID,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  PARENT_IDENTITY,
  ZIWEI_MANIFEST_IDENTITY,
  EXPECTED_PERSISTED,
  compact,
  exactJson,
  assertBoundary,
  buildProjection,
  collectInputs
});
