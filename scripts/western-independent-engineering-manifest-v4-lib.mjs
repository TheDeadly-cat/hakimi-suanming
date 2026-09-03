import { createHash } from "node:crypto";

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
  WESTERN_SAME_ARTIFACT_V11_CANDIDATE_PATH,
  isVerifiedWesternSameArtifactV11Candidate,
  loadWesternSameArtifactV11Candidate,
  summarizeWesternSameArtifactV11Candidate
} from "./western-civil-time-same-artifact-browser-observation-v1-1-lib.mjs";

export const WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH =
  "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v4.json";
const MANIFEST_ID = "hakimi.western-astrology.nonce-bound-browser-child-selected-path-manifest/4.0.0";
const CREATED_AT = "2026-09-03T04:50:00.000Z";
const DIGEST_DOMAIN = "hakimi.western-astrology.engineering-manifest.v4\0";
const SELECTED_DOMAIN = "hakimi.western-astrology.manifest-v4-selected-paths\0";
const SHA256 = /^[a-f0-9]{64}$/u;
const BRAND = new WeakSet();
const TOOL_PATHS = Object.freeze([
  "scripts/western-independent-engineering-manifest-v4-lib.mjs",
  "scripts/verify-western-independent-engineering-manifest-v4.mjs",
  "scripts/verify-western-independent-engineering-manifest-v4.test.mjs"
]);

const FALSE_AUTHORITY = Object.freeze({
  contentTruthEstablished: false, domainAuthorityAuthorized: false,
  expertClaimsAuthorized: false, expertIdentityQualificationIndependenceEstablished: false,
  expertTruthEstablished: false, formalAdmissionAuthorized: false,
  highRiskClaimsAuthorized: false, publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false, redistributionAuthorized: false,
  releaseEvidenceComplete: false, releaseReady: false,
  rightsLegalConclusionEstablished: false, safeToPublish: false
});

export class WesternIndependentEngineeringManifestV4Error extends Error {
  constructor(code, detail = "") { super(detail ? `${code}: ${detail}` : code); this.code = code; }
}
function fail(code, detail = "") { throw new WesternIndependentEngineeringManifestV4Error(code, detail); }
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
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
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
function addSelected(map, entry, role) {
  const previous = map.get(entry.path);
  const bytes = entry.bytes ?? entry.rawBytes;
  const digest = entry.sha256 ?? entry.rawSha256;
  if (previous) {
    if (previous.bytes !== bytes || previous.sha256 !== digest) fail("SELECTED_IDENTITY_CONFLICT", entry.path);
    previous.originRoles.add(role); return;
  }
  map.set(entry.path, { path: entry.path, bytes, sha256: digest, originRoles: new Set([role]) });
}

async function collectInputs(root) {
  const predecessor = await loadWesternIndependentEngineeringManifestV3(root);
  if (!isVerifiedWesternIndependentEngineeringManifestV3(predecessor)) fail("PREDECESSOR_PRIVATE_BRAND_REQUIRED");
  const child = loadWesternSameArtifactV11Candidate(root);
  if (!isVerifiedWesternSameArtifactV11Candidate(child)) fail("BROWSER_CHILD_PRIVATE_BRAND_REQUIRED");
  const predecessorIdentity = await identity(root, WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH);
  const childIdentity = await identity(root, WESTERN_SAME_ARTIFACT_V11_CANDIDATE_PATH);
  const tools = [];
  for (const toolPath of TOOL_PATHS) tools.push(await identity(root, toolPath));
  const selected = new Map();
  for (const file of predecessor.manifest.selectedPathMachineIdentity.files) addSelected(selected, file, "manifest_v3_selected_path");
  for (const file of child.currentInputBindings.authoredBuildSource.files) addSelected(selected, file, "browser_child_v1_1_authored_source");
  for (const file of child.currentInputBindings.lockedBuildInputs.inputs) addSelected(selected, file, "browser_child_v1_1_locked_input");
  for (const file of child.currentInputBindings.evidenceTooling.files) addSelected(selected, file, "browser_child_v1_1_evidence_tool");
  addSelected(selected, childIdentity, "browser_child_v1_1_persisted_observation");
  for (const file of tools) addSelected(selected, file, "manifest_v4_verification_tool");
  const selectedFiles = [...selected.values()].map((entry) => ({
    path: entry.path, bytes: entry.bytes, sha256: entry.sha256,
    originRoles: [...entry.originRoles].sort()
  })).sort((a, b) => a.path < b.path ? -1 : 1);
  return { predecessor, child, predecessorIdentity, childIdentity, tools, selectedFiles };
}

function buildProjection(inputs) {
  const predecessorSummary = getWesternIndependentEngineeringManifestV3Summary(inputs.predecessor);
  const childSummary = summarizeWesternSameArtifactV11Candidate(inputs.child);
  const selectedPathDigest = sha256(Buffer.from(`${SELECTED_DOMAIN}${compact(inputs.selectedFiles)}`, "utf8"));
  const unsigned = {
    schemaVersion: "4.0.0",
    recordType: "western_engineering_manifest_nonce_bound_browser_child_selected_path_successor_v4",
    manifestId: MANIFEST_ID,
    status: "current_v3_plus_nonce_bound_browser_child_selected_path_machine_identity_zero_admission_effect",
    createdAt: CREATED_AT,
    activeAdmissionEffect: "none",
    systemIdentity: { productSystemId: "western-astrology", contractSystemId: "western",
      productStatus: "isolated_engineering_draft", baziAuthorityInherited: false },
    projectReleaseGovernanceContext: { activeLine: "legacy-v13", targetSchema: 13, migrationId: null,
      projectContextOnly: true, inheritedByWesternProductIdentity: false,
      mutationEpochBoundaryRequired: true, mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null, expertClaimsAuthorized: false, publicDeploymentAuthorized: false },
    productBoundary: { productIdentity: null, releaseIdentity: null, targetSchema: null,
      migrationId: null, runtimeOption: "unselected", storageBackend: "unselected",
      formalProductSurface: "absent", mainApplicationIntegrated: false,
      centralRegistryIntegration: "absent" },
    artifactBindings: [
      { role: "current_predecessor_manifest_v3_private_brand", ...inputs.predecessorIdentity,
        semanticDigest: predecessorSummary.manifestDigest, semanticDigestField: "manifestDigest",
        privateBrandConsumed: true },
      { role: "current_nonce_bound_browser_child_v1_1_private_brand", ...inputs.childIdentity,
        semanticDigest: childSummary.observationDigest, semanticDigestField: "observationDigest",
        privateBrandConsumed: true }
    ],
    manifestVerificationTooling: { fileCount: inputs.tools.length, files: inputs.tools,
      identitiesVerifiedFromIndividuallyHeldFileReads: true, trustedToolAttestationEstablished: false },
    selectedPathMachineIdentity: {
      scopeClass: "manifest_v3_selected_paths_plus_browser_child_v1_1_declared_graphs_not_entire_western_engineering",
      selectedUniquePhysicalPathCount: inputs.selectedFiles.length,
      selectedPathDigest, files: inputs.selectedFiles,
      canonicalPathSortApplied: true, duplicatePathIdentityConflictsRejected: true,
      recursiveDirectoryEnumerationPerformed: false, extraFileAbsenceEstablished: false,
      entireWesternEngineeringClosureEstablished: false,
      currentFullDomainManifestMechanicallyVerified: false
    },
    browserEvidenceBoundary: {
      childCurrentAtManifestVerification: true, manifestRerunsBrowserMatrix: false,
      exactSingleBuildAtChildIssuance: true, sameOutputTreeServedToBothBrowsersAtChildIssuance: true,
      runNonceCommitmentAtChildIssuance: childSummary.runNonceCommitment,
      inMatrixCdpProductProtocolAndUserAgentsAttachedAtChildIssuance: true,
      chromeScenarioOutcomesAtChildIssuance: 5, edgeScenarioOutcomesAtChildIssuance: 5,
      totalPassedScenarioOutcomesAtChildIssuance: 10,
      chromeVersionAtChildIssuance: childSummary.chromeVersion,
      edgeVersionAtChildIssuance: childSummary.edgeVersion,
      outputTreeDigestAtChildIssuance: childSummary.outputTreeDigest,
      browserExecutablePathOrHashEstablished: false,
      browserOsProcessOrNetworkPeerBindingEstablished: false,
      browserVendorSignatureEstablished: false,
      browserRuntimeEvidenceEstablishedByThisManifest: false,
      fullApplicationRuntimeValidated: false, mainApplicationRuntimeValidated: false,
      productionBrowserRuntimeEvidenceEstablished: false, publicHostValidated: false,
      pwaOrServiceWorkerValidated: false
    },
    currentnessBoundary: { predecessorPrivateBrandVerified: true, browserChildPrivateBrandVerified: true,
      currentSelectedPathEngineeringManifestMechanicallyVerified: true,
      currentFullDomainManifestMechanicallyVerified: false,
      formalOrCurrentSourceRequirementsMechanicallyVerified: false,
      productIdentityEstablished: false, entireWesternEngineeringClosureEstablished: false,
      ownerPromotionDecisionReceipt: null },
    gateState: { admissionGatesRequired: 8, admissionGatesSatisfied: 0,
      bindingRequired: 28, bindingFrozenVerified: 0,
      independentExpertsRequired: 2, independentExpertReviewsVerified: 0,
      sourceBundleComplete: false, rightsBundleComplete: false,
      expertReviewBundleComplete: false, highRiskPolicyBound: false,
      releaseEvidenceComplete: false },
    observationBoundary: { sameHeldBufferHashAndParsePerJsonArtifact: true,
      crossFileAtomicSnapshot: false, mutationEpochAvailable: false, mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false, abaExcluded: false,
      manifestDigestIsDigitalSignature: false, trustedTimestampEstablished: false,
      createdAtClock: "untrusted_local_clock_label" },
    runtimeTrustBoundary: { hiddenPreloadExcluded: false, nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false, runtimeLauncherIdentityEstablished: false,
      completeRuntimeToolClosureBound: false, cliOutputTrustedAttestation: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true },
    evidenceLedger: { engineeringEvidence: "current_selected_path_machine_identity_with_nonce_bound_browser_child",
      browserAndRuntimeEvidence: "attached_child_isolated_loopback_same_artifact_nonce_correlated_in_matrix_cdp_identity_only",
      contentTruth: "not_established", expertTruth: "not_established",
      rightsAndLegalJudgment: "not_established", releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized" },
    authorityBoundary: FALSE_AUTHORITY,
    doesNotEstablish: [
      "entire_western_engineering_or_current_full_domain_manifest",
      "formal_product_identity_surface_registry_or_admission",
      "browser_executable_hash_os_process_network_peer_vendor_signature_or_trusted_tool_attestation",
      "full_application_pwa_service_worker_public_host_fixed_device_or_production_runtime",
      "source_body_exact_quote_frozen_binding_or_three_layer_rights",
      "content_truth_real_expert_identity_qualification_independence_opinion_or_truth",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
      "legacy_v13_or_bazi_authority_inheritance"
    ]
  };
  return { ...unsigned, manifestDigest: computeWesternIndependentEngineeringManifestV4Digest(unsigned) };
}

export function computeWesternIndependentEngineeringManifestV4Digest(value) {
  const unsigned = clone(value); delete unsigned.manifestDigest;
  return sha256(Buffer.from(`${DIGEST_DOMAIN}${compact(unsigned)}`, "utf8"));
}
export function serializeWesternIndependentEngineeringManifestV4(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
function assertBoundary(value) {
  if (value.schemaVersion !== "4.0.0" || value.manifestId !== MANIFEST_ID
      || value.activeAdmissionEffect !== "none" || value.createdAt !== CREATED_AT
      || !SHA256.test(value.manifestDigest) || computeWesternIndependentEngineeringManifestV4Digest(value) !== value.manifestDigest
      || value.selectedPathMachineIdentity.currentFullDomainManifestMechanicallyVerified !== false
      || value.selectedPathMachineIdentity.entireWesternEngineeringClosureEstablished !== false
      || value.gateState.admissionGatesSatisfied !== 0 || value.gateState.admissionGatesRequired !== 8
      || value.gateState.bindingFrozenVerified !== 0 || value.gateState.bindingRequired !== 28
      || value.gateState.independentExpertReviewsVerified !== 0 || value.gateState.independentExpertsRequired !== 2
      || value.productBoundary.productIdentity !== null || value.productBoundary.releaseIdentity !== null
      || value.productBoundary.targetSchema !== null || value.productBoundary.migrationId !== null
      || value.observationBoundary.mutationEpochAvailable !== false || value.observationBoundary.mutationEpochReceipt !== null
      || value.browserEvidenceBoundary.browserExecutablePathOrHashEstablished !== false
      || value.browserEvidenceBoundary.browserRuntimeEvidenceEstablishedByThisManifest !== false) fail("MANIFEST_BOUNDARY_INVALID");
  allFalse(value.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  const files = value.selectedPathMachineIdentity.files;
  if (!Array.isArray(files) || files.length !== value.selectedPathMachineIdentity.selectedUniquePhysicalPathCount
      || value.selectedPathMachineIdentity.selectedPathDigest
        !== sha256(Buffer.from(`${SELECTED_DOMAIN}${compact(files)}`, "utf8"))) fail("SELECTED_PATH_SET_INVALID");
  return value;
}

export async function buildCurrentWesternIndependentEngineeringManifestV4(root = process.cwd()) {
  return freeze(assertBoundary(buildProjection(await collectInputs(root))));
}
export async function loadWesternIndependentEngineeringManifestV4(root = process.cwd()) {
  const expected = await buildCurrentWesternIndependentEngineeringManifestV4(root);
  const snapshot = await readBaziDttStableWorkspaceArtifact(root,
    WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH);
  const persisted = assertBoundary(parseBaziDttStrictJsonArtifact(snapshot));
  if (Buffer.from(snapshot.bytes).toString("utf8") !== serializeWesternIndependentEngineeringManifestV4(persisted)
      || compact(persisted) !== compact(expected)) fail("CURRENT_MANIFEST_MISMATCH");
  const result = freeze({ artifact: { path: WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V4_RELATIVE_PATH,
    rawBytes: snapshot.rawBytes, rawSha256: snapshot.rawSha256 }, manifest: clone(persisted) });
  BRAND.add(result); return result;
}
export function isVerifiedWesternIndependentEngineeringManifestV4(value) {
  return value && typeof value === "object" && Object.isFrozen(value) && BRAND.has(value);
}
export function getWesternIndependentEngineeringManifestV4Summary(value) {
  if (!isVerifiedWesternIndependentEngineeringManifestV4(value)) fail("MANIFEST_PRIVATE_BRAND_REQUIRED");
  return freeze({ manifestId: value.manifest.manifestId, manifestDigest: value.manifest.manifestDigest,
    selectedUniquePhysicalPathCount: value.manifest.selectedPathMachineIdentity.selectedUniquePhysicalPathCount,
    chromeVersion: value.manifest.browserEvidenceBoundary.chromeVersionAtChildIssuance,
    edgeVersion: value.manifest.browserEvidenceBoundary.edgeVersionAtChildIssuance,
    passedScenarioOutcomes: 10, currentFullDomainManifestMechanicallyVerified: false,
    gateState: value.manifest.gateState, authorityBoundary: value.manifest.authorityBoundary });
}
export const westernIndependentEngineeringManifestV4TestOnly = freeze({ compact, assertBoundary });
