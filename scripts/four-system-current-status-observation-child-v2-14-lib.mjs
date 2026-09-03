import { createHash } from "node:crypto";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_13_RELATIVE_PATH,
  isVerifiedFourSystemCurrentStatusObservationChildV213,
  loadFourSystemCurrentStatusObservationChildV213
} from "./four-system-current-status-observation-child-v2-13-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V5_RELATIVE_PATH,
  getWesternIndependentEngineeringManifestV5Summary,
  isVerifiedWesternIndependentEngineeringManifestV5,
  loadWesternIndependentEngineeringManifestV5
} from "./western-independent-engineering-manifest-v5-lib.mjs";

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_14_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.14.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.14.0";
const RECORD_TYPE = "four_system_current_status_observation_child_v2_14";
const STATUS =
  "append_only_non_atomic_western_six_root_recursive_machine_identity_status_observation_child_zero_admission_effect";
const CREATED_AT = "2026-09-03T07:45:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-03T07:46:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.14";
const SHA256 = /^[0-9a-f]{64}$/u;

const PARENT_IDENTITY = Object.freeze({
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_13_RELATIVE_PATH,
  rawBytes: 20_784,
  rawSha256: "5d8ecab2d59c8897ad27d9ba6226e1093231d33f874e58b49c9194b8166d74ff",
  semanticDigest: "5d1cbad8a5c49fe970e9bc6f30fbe949a3eb56947e08efc9099ce0077bc01864"
});

const WESTERN_V5_IDENTITY = Object.freeze({
  path: WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V5_RELATIVE_PATH,
  rawBytes: 43_571,
  rawSha256: "8dfe4a25fb4194d8e9e7b53f8d5b786813b11db9a7ed11e8a88c4f96aad41904",
  semanticDigest: "3617e2bb812e64ea6a79c5a9c6660344e09ed85f5869ff1528415cab13f434b4"
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 21_317,
  rawSha256: "5aae5229c9e4cac8f15e31cfaa43f8f4bc6156fddedd74cbb206236dd29f954a",
  childDigest: "78e493c478737baca20b73338310f3077fd172e20e5d1546077c9514b6b16eee"
});

const APPENDED_DOES_NOT_ESTABLISH = Object.freeze([
  "western_excluded_runtime_subtree_contents_or_complete_physical_root_closure",
  "western_six_allowlisted_root_identity_as_entire_engineering_domain_or_product_closure",
  "western_previously_unselected_files_as_authorized_unauthorized_or_formally_promoted_content",
  "western_input_adapter_identity_as_formal_input_fact_content_expert_rights_or_release_authority"
]);

const BRAND = new WeakSet();

export class FourSystemCurrentStatusObservationChildV214Error extends Error {
  constructor(code, detail = "", options = undefined) {
    super(detail ? `${code}: ${detail}` : code, options);
    this.name = "FourSystemCurrentStatusObservationChildV214Error";
    this.code = code;
  }
}

function fail(code, detail = "", cause = undefined) {
  throw new FourSystemCurrentStatusObservationChildV214Error(
    code,
    detail,
    cause === undefined ? undefined : { cause }
  );
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function compact(value) {
  return JSON.stringify(canonical(value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function exact(left, right) {
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

export function computeFourSystemCurrentStatusObservationChildV214Digest(value) {
  const unsigned = clone(value);
  delete unsigned.childDigest;
  return sha256(Buffer.from(`${DIGEST_DOMAIN}\0${compact(unsigned)}`, "utf8"));
}

export function serializeFourSystemCurrentStatusObservationChildV214(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function binding(identity, role, semanticDigest, semanticDigestField) {
  return { ...identity, role, semanticDigest, semanticDigestField };
}

function requireParent(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV213(parent)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED");
  }
  if (parent.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.13.0"
    || parent.childDigest !== PARENT_IDENTITY.semanticDigest
    || parent.currentStatusSummary?.totalAdmissionGatesRequired !== 32
    || parent.currentStatusSummary?.totalAdmissionGatesSatisfied !== 0
    || parent.currentStatusSummary?.systemsFormallyAdmitted !== 0
    || parent.currentStatusSummary?.systemsReleaseReady !== 0
    || parent.currentStatusSummary?.systemsPublicReleaseAuthorized !== 0
    || parent.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || parent.projectReleaseGovernanceContext?.targetSchema !== 13
    || parent.projectReleaseGovernanceContext?.migrationId !== null
    || parent.projectReleaseGovernanceContext?.mutationEpochAvailableForSchema13 !== false
    || parent.authorityBoundary?.releaseReady !== false
    || parent.authorityBoundary?.publicReleaseAuthorized !== false) {
    fail("PARENT_IDENTITY_OR_BOUNDARY_INVALID");
  }
  return parent;
}

function requireWesternManifest(manifest) {
  if (!isVerifiedWesternIndependentEngineeringManifestV5(manifest)) {
    fail("WESTERN_V5_PRIVATE_BRAND_REQUIRED");
  }
  const summary = getWesternIndependentEngineeringManifestV5Summary(manifest);
  if (summary.manifestDigest !== WESTERN_V5_IDENTITY.semanticDigest
    || summary.allowlistedRootCount !== 6
    || summary.authoredOrdinaryFileCount !== 110
    || summary.predecessorSelectedPathsInsideSixRoots !== 95
    || summary.previouslyUnselectedFileCount !== 15
    || summary.prePostTreeDigestEqual !== true
    || summary.currentSixAllowlistedAuthoredRootMachineIdentityMechanicallyVerified !== true
    || summary.currentFullDomainManifestMechanicallyVerified !== false
    || summary.gateState?.admissionGatesRequired !== 8
    || summary.gateState?.admissionGatesSatisfied !== 0
    || summary.gateState?.bindingRequired !== 28
    || summary.gateState?.bindingFrozenVerified !== 0
    || summary.gateState?.independentExpertsRequired !== 2
    || summary.gateState?.independentExpertReviewsVerified !== 0
    || summary.productBoundary?.productIdentity !== null
    || summary.productBoundary?.releaseIdentity !== null
    || summary.productBoundary?.targetSchema !== null
    || summary.productBoundary?.migrationId !== null
    || Object.values(summary.authorityBoundary).some((entry) => entry !== false)) {
    fail("WESTERN_V5_IDENTITY_OR_BOUNDARY_INVALID");
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
  if (snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail(code, expected.path);
  }
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
    parent = requireParent(await loadFourSystemCurrentStatusObservationChildV213(root));
  } catch (cause) {
    if (cause instanceof FourSystemCurrentStatusObservationChildV214Error) throw cause;
    fail("PARENT_REVERIFICATION_FAILED", "four-system v2.13 复验失败。", cause);
  }
  try {
    manifest = await loadWesternIndependentEngineeringManifestV5(root);
  } catch (cause) {
    fail("WESTERN_V5_REVERIFICATION_FAILED", "Western v5 复验失败。", cause);
  }
  const manifestSummary = requireWesternManifest(manifest);
  return {
    parent,
    manifest,
    manifestSummary,
    parentIdentity: await exactIdentity(root, PARENT_IDENTITY, "PARENT_RAW_IDENTITY_INVALID"),
    manifestIdentity: await exactIdentity(
      root,
      WESTERN_V5_IDENTITY,
      "WESTERN_V5_RAW_IDENTITY_INVALID"
    )
  };
}

function buildProjection(inputs) {
  const systems = clone(inputs.parent.systems);
  const western = systems.find((entry) => entry.contractSystemId === "western");
  if (!western || western.currentEvidence?.endpoints?.length !== 4) {
    fail("WESTERN_PARENT_PROJECTION_INVALID");
  }
  const oldManifestIndex = western.currentEvidence.endpoints.findIndex((entry) =>
    entry.path
      === "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v4.json"
  );
  if (oldManifestIndex < 0 || western.currentEvidence.endpoints.some((entry) =>
    entry.path === WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V5_RELATIVE_PATH)) {
    fail("WESTERN_PARENT_ENDPOINT_SET_INVALID");
  }
  const parentBinding = binding(
    inputs.parentIdentity,
    "current_direct_predecessor_four_system_current_status_observation_child_v2_13",
    inputs.parent.childDigest,
    "childDigest"
  );
  const manifestBinding = binding(
    inputs.manifestIdentity,
    "current_western_six_allowlisted_authored_root_recursive_machine_identity_manifest_v5",
    inputs.manifestSummary.manifestDigest,
    "manifestDigest"
  );
  western.currentEvidence.endpoints[oldManifestIndex] = manifestBinding;
  western.currentEvidence.currentEndpointMechanicallyVerified = true;
  western.currentEvidence.currentEngineeringManifestMechanicallyVerified = true;
  western.currentEvidence.currentFullDomainManifestMechanicallyVerified = false;
  western.currentStatus =
    "current_version_observation_plus_drift_receipt_plus_six_root_recursive_manifest_v5_plus_nonce_bound_browser_child_v1_1_full_domain_false";

  const unsigned = {
    ...clone(inputs.parent),
    schemaVersion: "2.14.0",
    recordType: RECORD_TYPE,
    childId: CHILD_ID,
    status: STATUS,
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
      westernManifestV4EndpointReplacedByV5: true,
      westernEndpointCountBefore: 4,
      westernEndpointCountAfter: 4,
      westernEngineeringFlagRemainsTrue: true,
      westernSixAllowlistedAuthoredRootIdentityAdded: true,
      westernAllowlistedAuthoredRootCount: 6,
      westernAuthoredOrdinaryFileCount: 110,
      westernV4SelectedPathsInsideSixRoots: 95,
      westernPreviouslyUnselectedFileCount: 15,
      westernBrowserEvidencePreservedWithoutRerun: true,
      baziZiweiVedicCanonicalCopiesPreserved: true,
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
      ...APPENDED_DOES_NOT_ESTABLISH
    ]
  };
  delete unsigned.childDigest;
  return { ...unsigned, childDigest: computeFourSystemCurrentStatusObservationChildV214Digest(unsigned) };
}

function allFalse(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length === 0
    || Object.values(value).some((entry) => entry !== false)) fail(code);
}

function assertBoundary(value, parent) {
  if (value?.schemaVersion !== "2.14.0" || value?.recordType !== RECORD_TYPE
    || value?.childId !== CHILD_ID || value?.status !== STATUS
    || value?.createdAt !== CREATED_AT || value.createdAt >= CREATED_AT_UPPER_BOUND
    || value?.activeAdmissionEffect !== "none"
    || !SHA256.test(value?.childDigest ?? "")
    || value.childDigest !== computeFourSystemCurrentStatusObservationChildV214Digest(value)
    || value?.currentStatusSummary?.totalAdmissionGatesRequired !== 32
    || value?.currentStatusSummary?.totalAdmissionGatesSatisfied !== 0
    || value?.currentStatusSummary?.systemsFormallyAdmitted !== 0
    || value?.currentStatusSummary?.systemsDomainAuthorityAuthorized !== 0
    || value?.currentStatusSummary?.systemsReleaseReady !== 0
    || value?.currentStatusSummary?.systemsPublicReleaseAuthorized !== 0
    || value?.currentStatusSummary?.bindingFrozenVerifiedBySystem?.western !== "0/28"
    || value?.currentStatusSummary?.independentExpertReviewsVerifiedBySystem?.western !== "0/2"
    || value?.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || value?.projectReleaseGovernanceContext?.targetSchema !== 13
    || value?.projectReleaseGovernanceContext?.migrationId !== null
    || value?.projectReleaseGovernanceContext?.mutationEpochAvailableForSchema13 !== false
    || value?.projectReleaseGovernanceContext?.mutationEpochReceipt !== null
    || value?.projectReleaseGovernanceContext?.expertClaimsAuthorized !== false
    || value?.projectReleaseGovernanceContext?.publicDeploymentAuthorized !== false
    || value?.observationBoundary?.crossFileAtomicSnapshot !== false
    || value?.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || value?.observationBoundary?.abaExcluded !== false
    || value?.observationBoundary?.exactPersistedRawIdentitiesVerified !== 2
    || value?.observationBoundary?.upstreamPrivateBrandsVerified !== 2) {
    fail("CHILD_BOUNDARY_INVALID");
  }
  allFalse(value.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  for (const key of [
    "currentStatusSummary",
    "crossSystemPolicy",
    "evidenceLedgerSeparation",
    "observationBoundary",
    "projectReleaseGovernanceContext",
    "runtimeTrustBoundary",
    "versionBoundary",
    "authorityBoundary"
  ]) {
    if (!exact(value[key], parent[key])) fail("PARENT_TOP_LEVEL_DRIFT", key);
  }
  if (!Array.isArray(value.systems) || value.systems.length !== 4) fail("SYSTEM_SET_INVALID");
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
    if (id !== "western" && !exact(system, parentSystem)) {
      fail("NON_WESTERN_SYSTEM_DRIFT", id);
    }
  }
  const western = value.systems.find((entry) => entry.contractSystemId === "western");
  const parentWestern = parent.systems.find((entry) => entry.contractSystemId === "western");
  if (western.currentEvidence.endpoints.length !== 4
    || western.currentEvidence.currentEndpointMechanicallyVerified !== true
    || western.currentEvidence.currentEngineeringManifestMechanicallyVerified !== true
    || western.currentEvidence.currentFullDomainManifestMechanicallyVerified !== false
    || western.currentEvidence.browserRuntimeEvidence
      !== parentWestern.currentEvidence.browserRuntimeEvidence
    || western.gateSummary.bindingRequired !== 28
    || western.gateSummary.bindingFrozenVerified !== 0
    || western.gateSummary.independentExpertsRequired !== 2
    || western.gateSummary.independentExpertReviewsVerified !== 0
    || (western.productBoundary.productIdentity ?? null) !== null
    || western.productBoundary.releaseIdentity !== null
    || western.productBoundary.targetSchema !== null
    || western.productBoundary.migrationId !== null
    || !exact(western.gateSummary, parentWestern.gateSummary)
    || !exact(western.productBoundary, parentWestern.productBoundary)
    || !exact(western.authorityBoundary, parentWestern.authorityBoundary)
    || western.currentEvidence.endpoints.some((entry) =>
      entry.path
        === "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v4.json")) {
    fail("WESTERN_PROJECTION_INVALID");
  }
  const v5Endpoints = western.currentEvidence.endpoints.filter((entry) =>
    entry.path === WESTERN_V5_IDENTITY.path);
  const expectedV5Binding = binding(
    {
      path: WESTERN_V5_IDENTITY.path,
      rawBytes: WESTERN_V5_IDENTITY.rawBytes,
      rawSha256: WESTERN_V5_IDENTITY.rawSha256
    },
    "current_western_six_allowlisted_authored_root_recursive_machine_identity_manifest_v5",
    WESTERN_V5_IDENTITY.semanticDigest,
    "manifestDigest"
  );
  if (v5Endpoints.length !== 1 || !exact(v5Endpoints[0], expectedV5Binding)) {
    fail("WESTERN_V5_ENDPOINT_INVALID");
  }
  const parentWesternWithoutV4 = parentWestern.currentEvidence.endpoints.filter((entry) =>
    entry.path
      !== "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v4.json");
  const westernWithoutV5 = western.currentEvidence.endpoints.filter((entry) =>
    entry.path !== WESTERN_V5_IDENTITY.path);
  if (!exact(westernWithoutV5, parentWesternWithoutV4)) {
    fail("WESTERN_NON_MANIFEST_ENDPOINT_DRIFT");
  }
  const expectedWestern = clone(parentWestern);
  const expectedOldIndex = expectedWestern.currentEvidence.endpoints.findIndex((entry) =>
    entry.path
      === "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v4.json");
  expectedWestern.currentEvidence.endpoints[expectedOldIndex] = expectedV5Binding;
  expectedWestern.currentEvidence.currentEndpointMechanicallyVerified = true;
  expectedWestern.currentEvidence.currentEngineeringManifestMechanicallyVerified = true;
  expectedWestern.currentEvidence.currentFullDomainManifestMechanicallyVerified = false;
  expectedWestern.currentStatus =
    "current_version_observation_plus_drift_receipt_plus_six_root_recursive_manifest_v5_plus_nonce_bound_browser_child_v1_1_full_domain_false";
  if (!exact(western, expectedWestern)) fail("WESTERN_UNAUTHORIZED_PROJECTION_DRIFT");
  const expectedParentBinding = binding(
    {
      path: PARENT_IDENTITY.path,
      rawBytes: PARENT_IDENTITY.rawBytes,
      rawSha256: PARENT_IDENTITY.rawSha256
    },
    "current_direct_predecessor_four_system_current_status_observation_child_v2_13",
    PARENT_IDENTITY.semanticDigest,
    "childDigest"
  );
  if (!Array.isArray(value.artifactBindings) || value.artifactBindings.length !== 2
    || !exact(value.artifactBindings[0], expectedParentBinding)
    || !exact(value.artifactBindings[1], expectedV5Binding)) {
    fail("ARTIFACT_BINDINGS_INVALID");
  }
  if (value.lineage?.parentPreservedUnmodified !== true
    || value.lineage?.parentOverwritten !== false
    || value.lineage?.westernManifestV4EndpointReplacedByV5 !== true
    || value.lineage?.westernEndpointCountBefore !== 4
    || value.lineage?.westernEndpointCountAfter !== 4
    || value.lineage?.westernSixAllowlistedAuthoredRootIdentityAdded !== true
    || value.lineage?.westernAllowlistedAuthoredRootCount !== 6
    || value.lineage?.westernAuthoredOrdinaryFileCount !== 110
    || value.lineage?.westernV4SelectedPathsInsideSixRoots !== 95
    || value.lineage?.westernPreviouslyUnselectedFileCount !== 15
    || value.lineage?.westernBrowserEvidencePreservedWithoutRerun !== true
    || value.lineage?.baziZiweiVedicCanonicalCopiesPreserved !== true
    || value.lineage?.trustedTimestampEstablished !== false
    || value.lineage?.externalTimeAuthorityEstablished !== false
    || value.lineage?.crossArtifactTemporalOrderEstablished !== false) {
    fail("LINEAGE_BOUNDARY_INVALID");
  }
  if (!Array.isArray(value.doesNotEstablish)
    || !exact(value.doesNotEstablish.slice(0, parent.doesNotEstablish.length),
      parent.doesNotEstablish)
    || !exact(value.doesNotEstablish.slice(parent.doesNotEstablish.length),
      APPENDED_DOES_NOT_ESTABLISH)) {
    fail("DOES_NOT_ESTABLISH_DRIFT");
  }
  return value;
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV214(
  root = process.cwd()
) {
  const inputs = await collectInputs(root);
  return deepFreeze(assertBoundary(buildProjection(inputs), inputs.parent));
}

export async function loadFourSystemCurrentStatusObservationChildV214(
  root = process.cwd()
) {
  const inputs = await collectInputs(root);
  const expected = deepFreeze(assertBoundary(buildProjection(inputs), inputs.parent));
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(
      root,
      FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_14_RELATIVE_PATH
    );
  } catch (cause) {
    fail("PERSISTED_CHILD_STABLE_READ_FAILED", "four-system v2.14 不可稳定读取。", cause);
  }
  const persisted = assertBoundary(parseBaziDttStrictJsonArtifact(snapshot), inputs.parent);
  if (Buffer.from(snapshot.bytes).toString("utf8")
      !== serializeFourSystemCurrentStatusObservationChildV214(persisted)
    || !exact(persisted, expected)) fail("CURRENT_STATUS_MISMATCH");
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

export function isVerifiedFourSystemCurrentStatusObservationChildV214(value) {
  return value !== null && typeof value === "object" && Object.isFrozen(value)
    && BRAND.has(value);
}

export function getFourSystemCurrentStatusObservationChildV214Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV214(value)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED");
  }
  const western = value.systems.find((entry) => entry.contractSystemId === "western");
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    westernStatus: western.currentStatus,
    westernEndpointCount: western.currentEvidence.endpoints.length,
    westernCurrentEngineeringManifestMechanicallyVerified:
      western.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    westernCurrentFullDomainManifestMechanicallyVerified:
      western.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    westernBindingFrozenVerified: western.gateSummary.bindingFrozenVerified,
    westernBindingRequired: western.gateSummary.bindingRequired,
    westernIndependentExpertReviewsVerified:
      western.gateSummary.independentExpertReviewsVerified,
    westernIndependentExpertsRequired: western.gateSummary.independentExpertsRequired,
    totalAdmissionGatesSatisfied: value.currentStatusSummary.totalAdmissionGatesSatisfied,
    totalAdmissionGatesRequired: value.currentStatusSummary.totalAdmissionGatesRequired,
    releaseReadySystems: value.currentStatusSummary.systemsReleaseReady,
    publicReleaseAuthorizedSystems: value.currentStatusSummary.systemsPublicReleaseAuthorized,
    projectDefaultActiveLine: value.projectReleaseGovernanceContext.activeLine,
    projectDefaultTargetSchema: value.projectReleaseGovernanceContext.targetSchema,
    projectDefaultMigrationId: value.projectReleaseGovernanceContext.migrationId,
    mutationEpochAvailableForSchema13:
      value.projectReleaseGovernanceContext.mutationEpochAvailableForSchema13,
    publicDeploymentAuthorized: value.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: value.authorityBoundary.expertClaimsAuthorized
  });
}

export const fourSystemCurrentStatusObservationChildV214TestOnly = deepFreeze({
  APPENDED_DOES_NOT_ESTABLISH,
  CHILD_ID,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  EXPECTED_PERSISTED,
  PARENT_IDENTITY,
  RECORD_TYPE,
  STATUS,
  WESTERN_V5_IDENTITY,
  assertBoundary,
  buildProjection,
  collectInputs,
  exact
});
