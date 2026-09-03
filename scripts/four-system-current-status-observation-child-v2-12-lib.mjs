import { createHash } from "node:crypto";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_11_RELATIVE_PATH,
  isVerifiedFourSystemCurrentStatusObservationChildV211,
  loadFourSystemCurrentStatusObservationChildV211
} from "./four-system-current-status-observation-child-v2-11-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
  getVedicIndependentEngineeringManifestV3Summary,
  isVerifiedVedicIndependentEngineeringManifestV3,
  loadVedicIndependentEngineeringManifestV3
} from "./vedic-independent-engineering-manifest-v3-lib.mjs";

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_12_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.12.0.json";

const CHILD_ID =
  "hakimi.system-admission/four-system-current-status-observation-child/2.12.0";
const CREATED_AT = "2026-09-03T06:45:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-03T06:46:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.system-admission.four-system-current-status-observation-child.v2.12";
const SHA256 = /^[a-f0-9]{64}$/u;

const PARENT_IDENTITY = Object.freeze({
  path: FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_11_RELATIVE_PATH,
  rawBytes: 20_331,
  rawSha256: "8d9f4cede20391bb81f9c6037c4f0ec0f157479713edec01dcfaab7d0f0f3e25",
  semanticDigest: "21d12ce28ba635f7e6ca8f79478421122705f12586266dc1866eb08c083cd2e9"
});

const VEDIC_MANIFEST_IDENTITY = Object.freeze({
  path: VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
  rawBytes: 35_325,
  rawSha256: "c3d35e24073e7be14be971dae4e6825758b9fbfc3efd4adbc372e91fb74bf278",
  semanticDigest: "b466a83ada3c9f39721cfc4a54628eb1a9afa03ff4794f51461fb6b4100041b2"
});

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 20_369,
  rawSha256: "f5280c1ba72d4e1da3968f7b9a82db078ebd54f39e19b0b3665871b5787f32e4",
  childDigest: "9921847ccc30df5cb8e000eac70e7241031eea172bd4675b71ba2f6d967c5dc0"
});

const BRAND = new WeakSet();

export class FourSystemCurrentStatusObservationChildV212Error extends Error {
  constructor(code, detail = "", options = undefined) {
    super(detail ? `${code}: ${detail}` : code, options);
    this.name = "FourSystemCurrentStatusObservationChildV212Error";
    this.code = code;
  }
}

function fail(code, detail = "", cause = undefined) {
  throw new FourSystemCurrentStatusObservationChildV212Error(
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

export function computeFourSystemCurrentStatusObservationChildV212Digest(value) {
  const unsigned = clone(value);
  delete unsigned.childDigest;
  return sha256(Buffer.from(`${DIGEST_DOMAIN}\0${compact(unsigned)}`, "utf8"));
}

export function serializeFourSystemCurrentStatusObservationChildV212(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function binding(identity, role, semanticDigest, semanticDigestField) {
  return { ...identity, role, semanticDigest, semanticDigestField };
}

function requireParent(parent) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV211(parent)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED");
  }
  if (parent.childId
      !== "hakimi.system-admission/four-system-current-status-observation-child/2.11.0"
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
  if (!isVerifiedVedicIndependentEngineeringManifestV3(manifest)) {
    fail("VEDIC_MANIFEST_PRIVATE_BRAND_REQUIRED");
  }
  const summary = getVedicIndependentEngineeringManifestV3Summary(manifest);
  if (summary.manifestDigest !== VEDIC_MANIFEST_IDENTITY.semanticDigest
      || summary.allowlistedRootCount !== 5
      || summary.authoredOrdinaryFileCount !== 58
      || summary.additionalDiscoveredFileCount !== 15
      || summary.currentEngineeringManifestMechanicallyVerified !== true
      || summary.currentFullDomainManifestMechanicallyVerified !== false
      || summary.admissionGatesSatisfied !== 0
      || summary.admissionGatesRequired !== 8
      || summary.bindingFrozenVerified !== 0 || summary.bindingRequired !== 38
      || summary.independentExpertReviewsVerified !== 0
      || summary.independentExpertsRequired !== 2
      || summary.productIdentity !== null || summary.releaseIdentity !== null
      || summary.targetSchema !== null || summary.migrationId !== null
      || summary.releaseReady !== false || summary.publicReleaseAuthorized !== false) {
    fail("VEDIC_MANIFEST_IDENTITY_OR_BOUNDARY_INVALID");
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
    parent = requireParent(await loadFourSystemCurrentStatusObservationChildV211(root));
  } catch (cause) {
    if (cause instanceof FourSystemCurrentStatusObservationChildV212Error) throw cause;
    fail("PARENT_REVERIFICATION_FAILED", "four-system v2.11 复验失败。", cause);
  }
  try {
    manifest = await loadVedicIndependentEngineeringManifestV3(root);
  } catch (cause) {
    fail("VEDIC_MANIFEST_REVERIFICATION_FAILED", "Vedic Manifest v3 复验失败。", cause);
  }
  const manifestSummary = requireManifest(manifest);
  return {
    parent,
    manifest,
    manifestSummary,
    parentIdentity: await exactIdentity(root, PARENT_IDENTITY, "PARENT_RAW_IDENTITY_INVALID"),
    manifestIdentity: await exactIdentity(
      root,
      VEDIC_MANIFEST_IDENTITY,
      "VEDIC_MANIFEST_RAW_IDENTITY_INVALID"
    )
  };
}

function buildProjection(inputs) {
  const systems = clone(inputs.parent.systems);
  const vedic = systems.find((entry) => entry.contractSystemId === "vedic");
  if (!vedic || vedic.currentEvidence?.endpoints?.length !== 3) {
    fail("VEDIC_PARENT_PROJECTION_INVALID");
  }
  const oldManifestIndex = vedic.currentEvidence.endpoints.findIndex((entry) =>
    entry.path
      === "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v2.json"
  );
  if (oldManifestIndex < 0
      || vedic.currentEvidence.endpoints.some((entry) =>
        entry.path === VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH)) {
    fail("VEDIC_PARENT_ENDPOINT_SET_INVALID");
  }
  const parentBinding = binding(
    inputs.parentIdentity,
    "current_direct_predecessor_four_system_current_status_observation_child_v2_11",
    inputs.parent.childDigest,
    "childDigest"
  );
  const manifestBinding = binding(
    inputs.manifestIdentity,
    "current_vedic_five_allowlisted_authored_root_recursive_machine_identity_manifest_v3",
    inputs.manifestSummary.manifestDigest,
    "manifestDigest"
  );
  vedic.currentEvidence.endpoints[oldManifestIndex] = manifestBinding;
  vedic.currentEvidence.currentEndpointMechanicallyVerified = true;
  vedic.currentEvidence.currentEngineeringManifestMechanicallyVerified = true;
  vedic.currentEvidence.currentFullDomainManifestMechanicallyVerified = false;
  vedic.currentStatus =
    "current_observation_plus_five_root_recursive_engineering_manifest_v3_plus_isolated_fact_browser_child_no_product_identity_full_domain_false";

  const unsigned = {
    ...clone(inputs.parent),
    schemaVersion: "2.12.0",
    recordType: "four_system_current_status_observation_child_v2_12",
    childId: CHILD_ID,
    status:
      "append_only_non_atomic_vedic_five_root_recursive_identity_status_observation_child_zero_admission_effect",
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
      vedicManifestV2EndpointReplacedByV3: true,
      vedicEndpointCountBefore: 3,
      vedicEndpointCountAfter: 3,
      vedicEngineeringFlagRemainsTrue: true,
      vedicRecursiveAuthoredRootIdentityAdded: true,
      vedicAuthoredRootCount: 5,
      vedicAuthoredOrdinaryFileCount: 58,
      vedicAdditionalDiscoveredFileCountBeyondV2Selection: 15,
      baziZiweiWesternCanonicalCopiesPreserved: true,
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
      "vedic_excluded_runtime_subtree_contents_or_entire_five_physical_root_closure",
      "vedic_five_root_recursive_authored_identity_as_full_engineering_or_full_domain_manifest",
      "vedic_additional_v2_unselected_files_as_unauthorized_or_formally_promoted_content",
      "vedic_product_runtime_storage_rules_sources_rights_expert_or_domain_authority"
    ]
  };
  delete unsigned.childDigest;
  return {
    ...unsigned,
    childDigest: computeFourSystemCurrentStatusObservationChildV212Digest(unsigned)
  };
}

function allFalse(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).length === 0
      || Object.values(value).some((entry) => entry !== false)) fail(code);
}

function assertBoundary(value, parent) {
  if (value?.schemaVersion !== "2.12.0"
      || value?.recordType !== "four_system_current_status_observation_child_v2_12"
      || value?.childId !== CHILD_ID
      || value?.status
        !== "append_only_non_atomic_vedic_five_root_recursive_identity_status_observation_child_zero_admission_effect"
      || value?.createdAt !== CREATED_AT || value.createdAt >= CREATED_AT_UPPER_BOUND
      || value?.activeAdmissionEffect !== "none"
      || !SHA256.test(value?.childDigest ?? "")
      || computeFourSystemCurrentStatusObservationChildV212Digest(value)
        !== value.childDigest
      || value?.currentStatusSummary?.totalAdmissionGatesRequired !== 32
      || value?.currentStatusSummary?.totalAdmissionGatesSatisfied !== 0
      || value?.currentStatusSummary?.systemsFormallyAdmitted !== 0
      || value?.currentStatusSummary?.systemsDomainAuthorityAuthorized !== 0
      || value?.currentStatusSummary?.systemsReleaseReady !== 0
      || value?.currentStatusSummary?.systemsPublicReleaseAuthorized !== 0
      || value?.currentStatusSummary?.bindingFrozenVerifiedBySystem?.vedic !== "0/38"
      || value?.currentStatusSummary?.independentExpertReviewsVerifiedBySystem?.vedic !== "0/2"
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
    if (id !== "vedic" && !exactJson(system, parentSystem)) {
      fail("NON_VEDIC_SYSTEM_DRIFT", id);
    }
  }
  const vedic = value.systems.find((entry) => entry.contractSystemId === "vedic");
  if (vedic.currentEvidence.endpoints.length !== 3
      || vedic.currentEvidence.currentEndpointMechanicallyVerified !== true
      || vedic.currentEvidence.currentEngineeringManifestMechanicallyVerified !== true
      || vedic.currentEvidence.currentFullDomainManifestMechanicallyVerified !== false
      || vedic.currentEvidence.browserRuntimeEvidence
        !== "isolated_civil_time_fact_only_edge_chrome_10_of_10_not_web_pwa_or_product_runtime"
      || vedic.gateSummary.bindingRequired !== 38
      || vedic.gateSummary.independentExpertsRequired !== 2
      || (vedic.productBoundary.productIdentity ?? null) !== null
      || vedic.productBoundary.releaseIdentity !== null
      || vedic.productBoundary.targetSchema !== null
      || vedic.productBoundary.migrationId !== null
      || vedic.currentEvidence.endpoints.some((entry) =>
        entry.path
          === "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v2.json")) {
    fail("VEDIC_PROJECTION_INVALID");
  }
  const v3Endpoints = vedic.currentEvidence.endpoints.filter((entry) =>
    entry.path === VEDIC_MANIFEST_IDENTITY.path
  );
  if (v3Endpoints.length !== 1 || !exactJson(v3Endpoints[0], binding(
    {
      path: VEDIC_MANIFEST_IDENTITY.path,
      rawBytes: VEDIC_MANIFEST_IDENTITY.rawBytes,
      rawSha256: VEDIC_MANIFEST_IDENTITY.rawSha256
    },
    "current_vedic_five_allowlisted_authored_root_recursive_machine_identity_manifest_v3",
    VEDIC_MANIFEST_IDENTITY.semanticDigest,
    "manifestDigest"
  ))) fail("VEDIC_MANIFEST_ENDPOINT_INVALID");
  if (!Array.isArray(value.artifactBindings) || value.artifactBindings.length !== 2
      || value.artifactBindings[0]?.path !== PARENT_IDENTITY.path
      || value.artifactBindings[0]?.rawBytes !== PARENT_IDENTITY.rawBytes
      || value.artifactBindings[0]?.rawSha256 !== PARENT_IDENTITY.rawSha256
      || value.artifactBindings[0]?.semanticDigest !== PARENT_IDENTITY.semanticDigest
      || !exactJson(value.artifactBindings[1], v3Endpoints[0])) {
    fail("ARTIFACT_BINDINGS_INVALID");
  }
  if (value.lineage?.parentPreservedUnmodified !== true
      || value.lineage?.parentOverwritten !== false
      || value.lineage?.vedicManifestV2EndpointReplacedByV3 !== true
      || value.lineage?.vedicEndpointCountBefore !== 3
      || value.lineage?.vedicEndpointCountAfter !== 3
      || value.lineage?.vedicRecursiveAuthoredRootIdentityAdded !== true
      || value.lineage?.vedicAuthoredRootCount !== 5
      || value.lineage?.vedicAuthoredOrdinaryFileCount !== 58
      || value.lineage?.vedicAdditionalDiscoveredFileCountBeyondV2Selection !== 15
      || value.lineage?.baziZiweiWesternCanonicalCopiesPreserved !== true
      || value.lineage?.trustedTimestampEstablished !== false
      || value.lineage?.externalTimeAuthorityEstablished !== false
      || value.lineage?.crossArtifactTemporalOrderEstablished !== false) {
    fail("LINEAGE_BOUNDARY_INVALID");
  }
  return value;
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV212(
  root = process.cwd()
) {
  const inputs = await collectInputs(root);
  return deepFreeze(assertBoundary(buildProjection(inputs), inputs.parent));
}

export async function loadFourSystemCurrentStatusObservationChildV212(
  root = process.cwd()
) {
  const inputs = await collectInputs(root);
  const expected = deepFreeze(assertBoundary(buildProjection(inputs), inputs.parent));
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(
      root,
      FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_12_RELATIVE_PATH
    );
  } catch (cause) {
    fail("PERSISTED_CHILD_STABLE_READ_FAILED", "four-system v2.12 不可稳定读取。", cause);
  }
  const persisted = assertBoundary(parseBaziDttStrictJsonArtifact(snapshot), inputs.parent);
  if (Buffer.from(snapshot.bytes).toString("utf8")
      !== serializeFourSystemCurrentStatusObservationChildV212(persisted)
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

export function isVerifiedFourSystemCurrentStatusObservationChildV212(value) {
  return value !== null && typeof value === "object" && Object.isFrozen(value)
    && BRAND.has(value);
}

export function getFourSystemCurrentStatusObservationChildV212Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV212(value)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED");
  }
  const vedic = value.systems.find((entry) => entry.contractSystemId === "vedic");
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    vedicStatus: vedic.currentStatus,
    vedicEndpointCount: vedic.currentEvidence.endpoints.length,
    vedicCurrentEngineeringManifestMechanicallyVerified:
      vedic.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    vedicCurrentFullDomainManifestMechanicallyVerified:
      vedic.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    vedicBindingFrozenVerified: vedic.gateSummary.bindingFrozenVerified,
    vedicBindingRequired: vedic.gateSummary.bindingRequired,
    vedicIndependentExpertReviewsVerified:
      vedic.gateSummary.independentExpertReviewsVerified,
    vedicIndependentExpertsRequired: vedic.gateSummary.independentExpertsRequired,
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

export const fourSystemCurrentStatusObservationChildV212TestOnly = deepFreeze({
  CHILD_ID,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  PARENT_IDENTITY,
  VEDIC_MANIFEST_IDENTITY,
  EXPECTED_PERSISTED,
  compact,
  exactJson,
  assertBoundary,
  buildProjection,
  collectInputs
});
