import { createHash } from "node:crypto";

import {
  FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_RELATIVE_PATH,
  isVerifiedFourSystemCurrentStatusObservationChildV29,
  loadFourSystemCurrentStatusObservationChildV29
} from "./four-system-current-status-observation-child-v2-9-lib.mjs";
import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
  getWesternIndependentEngineeringManifestV3Summary,
  isVerifiedWesternIndependentEngineeringManifestV3,
  loadWesternIndependentEngineeringManifestV3
} from "./western-independent-engineering-manifest-v3-lib.mjs";
import {
  WESTERN_SAME_ARTIFACT_CANDIDATE_PATH,
  isVerifiedWesternSameArtifactCandidate,
  loadWesternSameArtifactCandidate,
  summarizeWesternSameArtifactCandidate
} from "./western-civil-time-same-artifact-browser-observation-lib.mjs";

export const FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH =
  "content/system-admission/four-system-current-status-observation-child.v2.10.0.json";

const CHILD_ID = "hakimi.system-admission/four-system-current-status-observation-child/2.10.0";
const CREATED_AT = "2026-09-03T04:15:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-03T04:16:00.000Z";
const DIGEST_DOMAIN = "hakimi.system-admission.four-system-current-status-observation-child.v2.10\0";
const SHA256 = /^[a-f0-9]{64}$/u;
const VERIFIED_CHILDREN = new WeakSet();

export class FourSystemCurrentStatusObservationChildV210Error extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "FourSystemCurrentStatusObservationChildV210Error";
    this.code = code;
  }
}

function fail(code, detail = "") {
  throw new FourSystemCurrentStatusObservationChildV210Error(code, detail);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  return value;
}

function canonicalCompact(value) {
  return JSON.stringify(canonicalValue(value));
}

export function serializeFourSystemCurrentStatusObservationChildV210(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function computeFourSystemCurrentStatusObservationChildV210Digest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.childDigest;
  return sha256(Buffer.from(`${DIGEST_DOMAIN}${canonicalCompact(unsigned)}`, "utf8"));
}

function requireAllFalse(record, code) {
  if (record === null || typeof record !== "object" || Array.isArray(record)
      || Object.keys(record).length === 0 || Object.values(record).some((value) => value !== false)) {
    fail(code);
  }
}

async function identityForPath(root, relativePath) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(root, relativePath);
  return {
    path: relativePath,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  };
}

function semanticBinding(identity, role, semanticDigest, semanticDigestField) {
  return {
    path: identity.path,
    rawBytes: identity.rawBytes,
    rawSha256: identity.rawSha256,
    role,
    semanticDigest,
    semanticDigestField
  };
}

async function collectCurrentInputs(workspaceRoot) {
  const parent = await loadFourSystemCurrentStatusObservationChildV29(workspaceRoot);
  if (!isVerifiedFourSystemCurrentStatusObservationChildV29(parent)) {
    fail("PARENT_PRIVATE_BRAND_REQUIRED");
  }
  const manifestResult = await loadWesternIndependentEngineeringManifestV3(workspaceRoot);
  if (!isVerifiedWesternIndependentEngineeringManifestV3(manifestResult)) {
    fail("WESTERN_MANIFEST_PRIVATE_BRAND_REQUIRED");
  }
  const browserChild = loadWesternSameArtifactCandidate(workspaceRoot);
  if (!isVerifiedWesternSameArtifactCandidate(browserChild)) {
    fail("WESTERN_BROWSER_CHILD_PRIVATE_BRAND_REQUIRED");
  }
  const parentIdentity = await identityForPath(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_9_RELATIVE_PATH
  );
  const manifestIdentity = await identityForPath(
    workspaceRoot,
    WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH
  );
  const browserIdentity = await identityForPath(workspaceRoot, WESTERN_SAME_ARTIFACT_CANDIDATE_PATH);
  return {
    parent,
    manifestResult,
    manifestSummary: getWesternIndependentEngineeringManifestV3Summary(manifestResult),
    browserChild,
    browserSummary: summarizeWesternSameArtifactCandidate(browserChild),
    parentIdentity,
    manifestIdentity,
    browserIdentity
  };
}

function projectWesternSystem(parentSystem, inputs) {
  const projected = cloneJson(parentSystem);
  const predecessorManifestPath =
    "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v2.json";
  const index = projected.currentEvidence.endpoints.findIndex(
    (entry) => entry.path === predecessorManifestPath
  );
  if (index < 0 || projected.currentEvidence.endpoints.length !== 3) {
    fail("WESTERN_PARENT_ENDPOINT_SET_INVALID");
  }
  projected.currentEvidence.endpoints[index] = semanticBinding(
    inputs.manifestIdentity,
    "current_western_browser_child_selected_path_engineering_manifest_v3",
    inputs.manifestSummary.manifestDigest,
    "manifestDigest"
  );
  projected.currentEvidence.endpoints.push(semanticBinding(
    inputs.browserIdentity,
    "current_western_isolated_same_artifact_browser_observation_child_v1",
    inputs.browserSummary.observationDigest,
    "observationDigest"
  ));
  projected.currentEvidence.browserRuntimeEvidence =
    "isolated_same_artifact_chrome_edge_10_of_10_current_source_graph_not_web_pwa_or_product_runtime";
  projected.currentEvidence.currentEndpointMechanicallyVerified = true;
  projected.currentEvidence.currentEngineeringManifestMechanicallyVerified = true;
  projected.currentEvidence.currentFullDomainManifestMechanicallyVerified = false;
  projected.currentStatus =
    "current_version_observation_plus_drift_receipt_plus_browser_child_selected_path_manifest_v3_plus_isolated_same_artifact_browser_child_full_domain_false";
  return projected;
}

function buildProjection(inputs) {
  const systems = inputs.parent.systems.map((system) => (
    system.contractSystemId === "western" ? projectWesternSystem(system, inputs) : cloneJson(system)
  ));
  const parentBinding = semanticBinding(
    inputs.parentIdentity,
    "current_direct_predecessor_four_system_current_status_observation_child_v2_9",
    inputs.parent.childDigest,
    "childDigest"
  );
  const manifestBinding = semanticBinding(
    inputs.manifestIdentity,
    "current_western_browser_child_selected_path_engineering_manifest_v3",
    inputs.manifestSummary.manifestDigest,
    "manifestDigest"
  );
  const browserBinding = semanticBinding(
    inputs.browserIdentity,
    "current_western_isolated_same_artifact_browser_observation_child_v1",
    inputs.browserSummary.observationDigest,
    "observationDigest"
  );
  const unsigned = {
    ...cloneJson(inputs.parent),
    schemaVersion: "2.10.0",
    recordType: "four_system_current_status_observation_child_v2_10",
    childId: CHILD_ID,
    status: "append_only_non_atomic_western_browser_current_status_observation_child_zero_admission_effect",
    createdAt: CREATED_AT,
    artifactBindings: [parentBinding, manifestBinding, browserBinding],
    systems,
    lineage: {
      parent: parentBinding,
      parentPreservedUnmodified: true,
      parentOverwritten: false,
      parentBacklinkToThisChildPresent: false,
      parentMechanicallyCurrent: true,
      parentPrivateBrandLoaderRecursivelyReverifiedItsUpstreams: true,
      westernManifestV2EndpointReplacedByV3: true,
      westernBrowserChildEndpointAppended: true,
      westernEndpointCountBefore: 3,
      westernEndpointCountAfter: 4,
      westernEngineeringFlagRemainsTrue: true,
      westernBrowserRuntimeEvidenceUpdated: true,
      baziZiweiVedicCanonicalCopiesPreserved: true,
      uniqueBlockerClaimed: false,
      childCreatedAtClock: "untrusted_local_clock_label",
      childCreatedAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      trustedTimestampEstablished: false,
      externalTimeAuthorityEstablished: false,
      crossArtifactTemporalOrderEstablished: false
    },
    observationBoundary: {
      ...cloneJson(inputs.parent.observationBoundary),
      exactPersistedRawIdentitiesVerified: 3,
      upstreamPrivateBrandsVerified: 3
    },
    doesNotEstablish: [
      ...cloneJson(inputs.parent.doesNotEstablish),
      "western_isolated_same_artifact_browser_child_as_full_application_pwa_service_worker_public_host_fixed_device_or_production_evidence"
    ]
  };
  delete unsigned.childDigest;
  return {
    ...unsigned,
    childDigest: computeFourSystemCurrentStatusObservationChildV210Digest(unsigned)
  };
}

function assertChildBoundary(candidate, parent) {
  if (candidate.schemaVersion !== "2.10.0" || candidate.recordType
      !== "four_system_current_status_observation_child_v2_10"
      || candidate.childId !== CHILD_ID || candidate.activeAdmissionEffect !== "none"
      || candidate.createdAt !== CREATED_AT || candidate.createdAt >= CREATED_AT_UPPER_BOUND
      || !SHA256.test(candidate.childDigest ?? "")
      || computeFourSystemCurrentStatusObservationChildV210Digest(candidate) !== candidate.childDigest
      || candidate.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
      || candidate.projectReleaseGovernanceContext?.targetSchema !== 13
      || candidate.projectReleaseGovernanceContext?.migrationId !== null
      || candidate.projectReleaseGovernanceContext?.mutationEpochAvailableForSchema13 !== false
      || candidate.projectReleaseGovernanceContext?.mutationEpochReceipt !== null
      || candidate.observationBoundary?.crossFileAtomicSnapshot !== false
      || candidate.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
      || candidate.observationBoundary?.abaExcluded !== false
      || candidate.observationBoundary?.mutationEpochAvailableForSchema13 !== false
      || candidate.observationBoundary?.mutationEpochReceipt !== null
      || candidate.currentStatusSummary?.totalAdmissionGatesRequired !== 32
      || candidate.currentStatusSummary?.totalAdmissionGatesSatisfied !== 0
      || candidate.currentStatusSummary?.systemsFormallyAdmitted !== 0
      || candidate.currentStatusSummary?.systemsDomainAuthorityAuthorized !== 0
      || candidate.currentStatusSummary?.systemsReleaseReady !== 0
      || candidate.currentStatusSummary?.systemsPublicReleaseAuthorized !== 0
      || candidate.currentStatusSummary?.allSystemsCurrentFullDomainManifestMechanicallyVerified !== false
      || candidate.versionBoundary?.persistedAsCentralRegistry !== false
      || candidate.versionBoundary?.centralRegistryModifiedByThisChild !== false
      || candidate.versionBoundary?.formalAdmissionRegistryModifiedByThisChild !== false
      || candidate.versionBoundary?.existingDomainManifestsModifiedByThisChild !== false
      || candidate.versionBoundary?.manifestRebindOrResignPerformed !== false
      || candidate.versionBoundary?.ownerPromotionDecisionReceipt !== null) {
    fail("CHILD_BOUNDARY_INVALID");
  }
  requireAllFalse(candidate.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  if (!Array.isArray(candidate.systems) || candidate.systems.length !== 4) {
    fail("SYSTEM_SET_INVALID");
  }
  for (const contractSystemId of ["bazi", "ziwei", "western", "vedic"]) {
    const system = candidate.systems.find((entry) => entry.contractSystemId === contractSystemId);
    const parentSystem = parent.systems.find((entry) => entry.contractSystemId === contractSystemId);
    if (!system || !parentSystem || system.gateSummary.admissionGatesSatisfied !== 0
        || system.gateSummary.bindingFrozenVerified !== 0
        || system.gateSummary.independentExpertReviewsVerified !== 0
        || system.currentEvidence.currentFullDomainManifestMechanicallyVerified !== false) {
      fail("SYSTEM_RED_BOUNDARY_INVALID", contractSystemId);
    }
    requireAllFalse(system.authorityBoundary, "SYSTEM_AUTHORITY_BOUNDARY_INVALID");
    if (contractSystemId !== "western" && canonicalCompact(system) !== canonicalCompact(parentSystem)) {
      fail("NON_WESTERN_SYSTEM_DRIFT", contractSystemId);
    }
  }
  const western = candidate.systems.find((entry) => entry.contractSystemId === "western");
  if (western.currentEvidence.endpoints.length !== 4
      || western.currentEvidence.browserRuntimeEvidence
        !== "isolated_same_artifact_chrome_edge_10_of_10_current_source_graph_not_web_pwa_or_product_runtime"
      || western.currentEvidence.currentEngineeringManifestMechanicallyVerified !== true
      || (western.productBoundary.productIdentity ?? null) !== null
      || western.productBoundary.releaseIdentity !== null
      || western.productBoundary.targetSchema !== null
      || western.productBoundary.migrationId !== null) {
    fail("WESTERN_PROJECTION_INVALID");
  }
  return candidate;
}

export async function buildCurrentFourSystemCurrentStatusObservationChildV210(
  workspaceRoot = process.cwd()
) {
  const inputs = await collectCurrentInputs(workspaceRoot);
  return deepFreeze(assertChildBoundary(buildProjection(inputs), inputs.parent));
}

export async function loadFourSystemCurrentStatusObservationChildV210(
  workspaceRoot = process.cwd()
) {
  const inputs = await collectCurrentInputs(workspaceRoot);
  const expected = deepFreeze(assertChildBoundary(buildProjection(inputs), inputs.parent));
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_10_RELATIVE_PATH
  );
  const persisted = assertChildBoundary(parseBaziDttStrictJsonArtifact(snapshot), inputs.parent);
  if (Buffer.from(snapshot.bytes).toString("utf8")
      !== serializeFourSystemCurrentStatusObservationChildV210(persisted)
      || canonicalCompact(persisted) !== canonicalCompact(expected)) {
    fail("CURRENT_STATUS_MISMATCH");
  }
  const verified = deepFreeze(cloneJson(persisted));
  VERIFIED_CHILDREN.add(verified);
  return verified;
}

export function isVerifiedFourSystemCurrentStatusObservationChildV210(value) {
  return value !== null && typeof value === "object" && VERIFIED_CHILDREN.has(value)
    && Object.isFrozen(value);
}

export function getFourSystemCurrentStatusObservationChildV210Summary(value) {
  if (!isVerifiedFourSystemCurrentStatusObservationChildV210(value)) {
    fail("CHILD_PRIVATE_BRAND_REQUIRED");
  }
  const western = value.systems.find((entry) => entry.contractSystemId === "western");
  return deepFreeze({
    childId: value.childId,
    childDigest: value.childDigest,
    westernStatus: western.currentStatus,
    westernEndpointCount: western.currentEvidence.endpoints.length,
    westernBrowserRuntimeEvidence: western.currentEvidence.browserRuntimeEvidence,
    westernCurrentEngineeringManifestMechanicallyVerified:
      western.currentEvidence.currentEngineeringManifestMechanicallyVerified,
    westernCurrentFullDomainManifestMechanicallyVerified:
      western.currentEvidence.currentFullDomainManifestMechanicallyVerified,
    admissionGatesSatisfied: value.currentStatusSummary.totalAdmissionGatesSatisfied,
    admissionGatesRequired: value.currentStatusSummary.totalAdmissionGatesRequired,
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

export const fourSystemCurrentStatusObservationChildV210TestOnly = Object.freeze({
  canonicalCompact,
  assertChildBoundary
});
