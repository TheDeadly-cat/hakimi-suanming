import { createHash } from "node:crypto";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH,
  isVerifiedFourSystemCurrentStatusObservationChildV210,
  loadFourSystemCurrentStatusObservationChildV210
} from "./four-system-current-status-observation-child-v2-10-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH,
  getWesternIndependentEngineeringManifestV4Summary,
  isVerifiedWesternIndependentEngineeringManifestV4,
  loadWesternIndependentEngineeringManifestV4
} from "./western-independent-engineering-manifest-v4-lib.mjs";
import {
  WESTERN_SAME_ARTIFACT_V11_CANDIDATE_PATH,
  isVerifiedWesternSameArtifactV11Candidate,
  loadWesternSameArtifactV11Candidate,
  summarizeWesternSameArtifactV11Candidate
} from "./western-civil-time-same-artifact-browser-observation-v1-1-lib.mjs";

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_11_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.11.0.json";
const CHILD_ID = "hakimi.system-admission/four-system-current-status-observation-child/2.11.0";
const CREATED_AT = "2026-09-03T04:55:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-03T04:56:00.000Z";
const DIGEST_DOMAIN = "hakimi.system-admission.four-system-current-status-observation-child.v2.11\0";
const SHA256 = /^[a-f0-9]{64}$/u;
const BRAND = new WeakSet();

export class FourSystemCurrentStatusObservationChildV211Error extends Error {
  constructor(code, detail = "") { super(detail ? `${code}: ${detail}` : code); this.code = code; }
}
function fail(code, detail = "") { throw new FourSystemCurrentStatusObservationChildV211Error(code, detail); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}
function compact(value) { return JSON.stringify(canonical(value)); }
function freeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value); for (const child of Object.values(value)) freeze(child, seen); return Object.freeze(value);
}
function allFalse(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).length === 0 || Object.values(value).some((entry) => entry !== false)) fail(code);
}
async function identity(root, relativePath) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(root, relativePath);
  return { path: relativePath, rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 };
}
function binding(identityValue, role, semanticDigest, semanticDigestField) {
  return { ...identityValue, role, semanticDigest, semanticDigestField };
}

async function collectInputs(root) {
  const parent = await loadFourSystemCurrentStatusObservationChildV210(root);
  if (!isVerifiedFourSystemCurrentStatusObservationChildV210(parent)) fail("PARENT_PRIVATE_BRAND_REQUIRED");
  const manifest = await loadWesternIndependentEngineeringManifestV4(root);
  if (!isVerifiedWesternIndependentEngineeringManifestV4(manifest)) fail("MANIFEST_PRIVATE_BRAND_REQUIRED");
  const browser = loadWesternSameArtifactV11Candidate(root);
  if (!isVerifiedWesternSameArtifactV11Candidate(browser)) fail("BROWSER_PRIVATE_BRAND_REQUIRED");
  return {
    parent, manifest, browser,
    manifestSummary: getWesternIndependentEngineeringManifestV4Summary(manifest),
    browserSummary: summarizeWesternSameArtifactV11Candidate(browser),
    parentIdentity: await identity(root, FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH),
    manifestIdentity: await identity(root, WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH),
    browserIdentity: await identity(root, WESTERN_SAME_ARTIFACT_V11_CANDIDATE_PATH)
  };
}

function buildProjection(inputs) {
  const systems = clone(inputs.parent.systems);
  const western = systems.find((entry) => entry.contractSystemId === "western");
  if (!western || western.currentEvidence.endpoints.length !== 4) fail("WESTERN_PARENT_INVALID");
  const manifestIndex = western.currentEvidence.endpoints.findIndex((entry) =>
    entry.path === "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v3.json");
  const browserIndex = western.currentEvidence.endpoints.findIndex((entry) =>
    entry.path === "content/system-admission/western-civil-time-same-artifact-browser-observation-child.v1.0.0.json");
  if (manifestIndex < 0 || browserIndex < 0) fail("WESTERN_PARENT_ENDPOINT_SET_INVALID");
  const parentBinding = binding(inputs.parentIdentity,
    "current_direct_predecessor_four_system_current_status_observation_child_v2_10",
    inputs.parent.childDigest, "childDigest");
  const manifestBinding = binding(inputs.manifestIdentity,
    "current_western_nonce_bound_browser_selected_path_engineering_manifest_v4",
    inputs.manifestSummary.manifestDigest, "manifestDigest");
  const browserBinding = binding(inputs.browserIdentity,
    "current_western_nonce_bound_in_matrix_browser_observation_child_v1_1",
    inputs.browserSummary.observationDigest, "observationDigest");
  western.currentEvidence.endpoints[manifestIndex] = manifestBinding;
  western.currentEvidence.endpoints[browserIndex] = browserBinding;
  western.currentEvidence.browserRuntimeEvidence =
    "isolated_same_artifact_nonce_correlated_in_matrix_cdp_identity_chrome_edge_10_of_10_not_web_pwa_or_product_runtime";
  western.currentEvidence.currentEndpointMechanicallyVerified = true;
  western.currentEvidence.currentEngineeringManifestMechanicallyVerified = true;
  western.currentEvidence.currentFullDomainManifestMechanicallyVerified = false;
  western.currentStatus =
    "current_version_observation_plus_drift_receipt_plus_manifest_v4_plus_nonce_bound_browser_child_v1_1_full_domain_false";
  const unsigned = {
    ...clone(inputs.parent),
    schemaVersion: "2.11.0",
    recordType: "four_system_current_status_observation_child_v2_11",
    childId: CHILD_ID,
    status: "append_only_non_atomic_western_nonce_bound_browser_status_observation_child_zero_admission_effect",
    createdAt: CREATED_AT,
    artifactBindings: [parentBinding, manifestBinding, browserBinding],
    systems,
    lineage: {
      parent: parentBinding,
      parentPreservedUnmodified: true, parentOverwritten: false,
      parentBacklinkToThisChildPresent: false, parentMechanicallyCurrent: true,
      parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
      westernManifestV3EndpointReplacedByV4: true,
      westernBrowserChildV1EndpointReplacedByV1_1: true,
      westernEndpointCountBefore: 4, westernEndpointCountAfter: 4,
      westernEngineeringFlagRemainsTrue: true, westernBrowserRuntimeEvidenceUpdated: true,
      baziZiweiVedicCanonicalCopiesPreserved: true, uniqueBlockerClaimed: false,
      childCreatedAtClock: "untrusted_local_clock_label",
      childCreatedAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      trustedTimestampEstablished: false, externalTimeAuthorityEstablished: false,
      crossArtifactTemporalOrderEstablished: false
    },
    observationBoundary: { ...clone(inputs.parent.observationBoundary),
      exactPersistedRawIdentitiesVerified: 3, upstreamPrivateBrandsVerified: 3 },
    doesNotEstablish: [...clone(inputs.parent.doesNotEstablish),
      "western_nonce_or_cdp_identity_as_browser_executable_os_process_network_peer_vendor_signature_or_tool_attestation",
      "western_nonce_bound_browser_child_as_full_application_pwa_service_worker_public_host_fixed_device_or_production_evidence"]
  };
  delete unsigned.childDigest;
  return { ...unsigned, childDigest: computeFourSystemCurrentStatusObservationChildV211Digest(unsigned) };
}

export function computeFourSystemCurrentStatusObservationChildV211Digest(value) {
  const unsigned = clone(value); delete unsigned.childDigest;
  return sha256(Buffer.from(`${DIGEST_DOMAIN}${compact(unsigned)}`, "utf8"));
}
export function serializeFourSystemCurrentStatusObservationChildV211(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
function assertBoundary(value, parent) {
  if (value.schemaVersion !== "2.11.0" || value.recordType !== "four_system_current_status_observation_child_v2_11"
      || value.childId !== CHILD_ID || value.createdAt !== CREATED_AT || value.createdAt >= CREATED_AT_UPPER_BOUND
      || value.activeAdmissionEffect !== "none" || !SHA256.test(value.childDigest)
      || computeFourSystemCurrentStatusObservationChildV211Digest(value) !== value.childDigest
      || value.currentStatusSummary.totalAdmissionGatesRequired !== 32
      || value.currentStatusSummary.totalAdmissionGatesSatisfied !== 0
      || value.currentStatusSummary.systemsFormallyAdmitted !== 0
      || value.currentStatusSummary.systemsDomainAuthorityAuthorized !== 0
      || value.currentStatusSummary.systemsReleaseReady !== 0
      || value.currentStatusSummary.systemsPublicReleaseAuthorized !== 0
      || value.projectReleaseGovernanceContext.activeLine !== "legacy-v13"
      || value.projectReleaseGovernanceContext.targetSchema !== 13
      || value.projectReleaseGovernanceContext.migrationId !== null
      || value.projectReleaseGovernanceContext.mutationEpochAvailableForSchema13 !== false
      || value.projectReleaseGovernanceContext.mutationEpochReceipt !== null
      || value.observationBoundary.crossFileAtomicSnapshot !== false
      || value.observationBoundary.intervalMutationExcludedAcrossFiles !== false
      || value.observationBoundary.abaExcluded !== false) fail("CHILD_BOUNDARY_INVALID");
  allFalse(value.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  for (const id of ["bazi", "ziwei", "western", "vedic"]) {
    const system = value.systems.find((entry) => entry.contractSystemId === id);
    const parentSystem = parent.systems.find((entry) => entry.contractSystemId === id);
    if (!system || system.gateSummary.admissionGatesSatisfied !== 0
        || system.gateSummary.bindingFrozenVerified !== 0
        || system.gateSummary.independentExpertReviewsVerified !== 0
        || system.currentEvidence.currentFullDomainManifestMechanicallyVerified !== false) fail("SYSTEM_RED_BOUNDARY_INVALID", id);
    allFalse(system.authorityBoundary, "SYSTEM_AUTHORITY_BOUNDARY_INVALID");
    if (id !== "western" && compact(system) !== compact(parentSystem)) fail("NON_WESTERN_SYSTEM_DRIFT", id);
  }
  const western = value.systems.find((entry) => entry.contractSystemId === "western");
  if (western.currentEvidence.endpoints.length !== 4
      || western.gateSummary.bindingRequired !== 28 || western.gateSummary.independentExpertsRequired !== 2
      || western.currentEvidence.browserRuntimeEvidence
        !== "isolated_same_artifact_nonce_correlated_in_matrix_cdp_identity_chrome_edge_10_of_10_not_web_pwa_or_product_runtime"
      || (western.productBoundary.productIdentity ?? null) !== null || western.productBoundary.releaseIdentity !== null
      || western.productBoundary.targetSchema !== null || western.productBoundary.migrationId !== null) fail("WESTERN_PROJECTION_INVALID");
  return value;
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV211(root = process.cwd()) {
  const inputs = await collectInputs(root); return freeze(assertBoundary(buildProjection(inputs), inputs.parent));
}
export async function loadFourSystemCurrentStatusObservationChildV211(root = process.cwd()) {
  const inputs = await collectInputs(root);
  const expected = freeze(assertBoundary(buildProjection(inputs), inputs.parent));
  const snapshot = await readBaziDttStableWorkspaceArtifact(root,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_11_RELATIVE_PATH);
  const persisted = assertBoundary(parseBaziDttStrictJsonArtifact(snapshot), inputs.parent);
  if (Buffer.from(snapshot.bytes).toString("utf8") !== serializeFourSystemCurrentStatusObservationChildV211(persisted)
      || compact(persisted) !== compact(expected)) fail("CURRENT_STATUS_MISMATCH");
  const result = freeze(clone(persisted)); BRAND.add(result); return result;
}
export function isVerifiedFourSystemCurrentStatusObservationChildV211(value) {
  return value && typeof value === "object" && Object.isFrozen(value) && BRAND.has(value);
}
export function getFourSystemCurrentStatusObservationChildV211Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV211(value)) fail("CHILD_PRIVATE_BRAND_REQUIRED");
  const western = value.systems.find((entry) => entry.contractSystemId === "western");
  return freeze({ childId: value.childId, childDigest: value.childDigest,
    westernStatus: western.currentStatus, westernEndpointCount: western.currentEvidence.endpoints.length,
    westernBrowserRuntimeEvidence: western.currentEvidence.browserRuntimeEvidence,
    westernCurrentEngineeringManifestMechanicallyVerified: western.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    westernCurrentFullDomainManifestMechanicallyVerified: western.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    admissionGatesSatisfied: value.currentStatusSummary.totalAdmissionGatesSatisfied,
    admissionGatesRequired: value.currentStatusSummary.totalAdmissionGatesRequired,
    releaseReadySystems: value.currentStatusSummary.systemsReleaseReady,
    publicReleaseAuthorizedSystems: value.currentStatusSummary.systemsPublicReleaseAuthorized,
    projectDefaultActiveLine: value.projectReleaseGovernanceContext.activeLine,
    projectDefaultTargetSchema: value.projectReleaseGovernanceContext.targetSchema,
    projectDefaultMigrationId: value.projectReleaseGovernanceContext.migrationId,
    mutationEpochAvailableForSchema13: value.projectReleaseGovernanceContext.mutationEpochAvailableForSchema13,
    publicDeploymentAuthorized: value.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: value.authorityBoundary.expertClaimsAuthorized });
}
export const fourSystemCurrentStatusObservationChildV211TestOnly = freeze({ compact, assertBoundary });
