import { createHash } from "node:crypto";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  getWesternIndependentEngineeringManifestV2Summary,
  isVerifiedWesternIndependentEngineeringManifestV2,
  loadWesternIndependentEngineeringManifestV2
} from "./western-independent-engineering-manifest-v2-lib.mjs";
import {
  WESTERN_SAME_ARTIFACT_CANDIDATE_PATH,
  isVerifiedWesternSameArtifactCandidate,
  loadWesternSameArtifactCandidate,
  summarizeWesternSameArtifactCandidate
} from "./western-civil-time-same-artifact-browser-observation-lib.mjs";

export const WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH =
  "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v3.json";

const MANIFEST_ID =
  "hakimi.western-astrology.browser-child-selected-path-machine-identity-manifest/3.0.0";
const CREATED_AT = "2026-09-03T04:00:00.000Z";
const MANIFEST_DIGEST_DOMAIN =
  "hakimi.western-astrology.browser-child-selected-path-machine-identity-manifest.v3\0";
const SELECTED_PATH_DIGEST_DOMAIN =
  "hakimi.western-astrology.manifest-v3-selected-paths\0";
const SHA256 = /^[a-f0-9]{64}$/u;
const VERIFIED_RESULTS = new WeakSet();
const TOOL_PATHS = Object.freeze([
  "scripts/western-independent-engineering-manifest-v3-lib.mjs",
  "scripts/verify-western-independent-engineering-manifest-v3.mjs",
  "scripts/verify-western-independent-engineering-manifest-v3.test.mjs"
]);

export class WesternIndependentEngineeringManifestV3Error extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "WesternIndependentEngineeringManifestV3Error";
    this.code = code;
  }
}

function fail(code, detail = "") {
  throw new WesternIndependentEngineeringManifestV3Error(code, detail);
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

export function canonicalPrettyStringifyWesternIndependentEngineeringManifestV3(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function computeWesternIndependentEngineeringManifestV3Digest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.manifestDigest;
  return sha256(Buffer.from(`${MANIFEST_DIGEST_DOMAIN}${canonicalCompact(unsigned)}`, "utf8"));
}

function requireExactKeys(value, keys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || canonicalCompact(Object.keys(value).sort()) !== canonicalCompact([...keys].sort())) {
    fail(code);
  }
}

function requireAllFalse(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).length === 0 || Object.values(value).some((entry) => entry !== false)) {
    fail(code);
  }
}

async function identityForPath(root, relativePath) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(root, relativePath);
  return {
    path: relativePath,
    bytes: snapshot.rawBytes,
    sha256: snapshot.rawSha256
  };
}

function addSelectedPath(map, identity, originRole) {
  if (typeof identity?.path !== "string" || !Number.isSafeInteger(identity.bytes)
      || identity.bytes < 1 || !SHA256.test(identity.sha256 ?? "")
      || typeof originRole !== "string" || originRole.length === 0) {
    fail("SELECTED_PATH_IDENTITY_INVALID", originRole);
  }
  const previous = map.get(identity.path);
  if (previous && (previous.bytes !== identity.bytes || previous.sha256 !== identity.sha256)) {
    fail("SELECTED_PATH_IDENTITY_CONFLICT", identity.path);
  }
  if (previous) {
    previous.originRoles.add(originRole);
    return;
  }
  map.set(identity.path, {
    path: identity.path,
    bytes: identity.bytes,
    sha256: identity.sha256,
    originRoles: new Set([originRole])
  });
}

async function collectCurrentInputs(workspaceRoot) {
  const predecessor = await loadWesternIndependentEngineeringManifestV2(workspaceRoot);
  if (!isVerifiedWesternIndependentEngineeringManifestV2(predecessor)) {
    fail("PREDECESSOR_PRIVATE_BRAND_REQUIRED");
  }
  const child = loadWesternSameArtifactCandidate(workspaceRoot);
  if (!isVerifiedWesternSameArtifactCandidate(child)) {
    fail("BROWSER_CHILD_PRIVATE_BRAND_REQUIRED");
  }
  const childArtifact = await identityForPath(workspaceRoot, WESTERN_SAME_ARTIFACT_CANDIDATE_PATH);
  const tools = [];
  for (const toolPath of TOOL_PATHS) tools.push(await identityForPath(workspaceRoot, toolPath));

  const selected = new Map();
  for (const file of predecessor.manifest.threePackageAuthoredFileClosure.files) {
    addSelectedPath(selected, file, "predecessor_three_package_authored_file");
  }
  for (const file of child.expectedAuthoredBuildInputClosure.files) {
    addSelectedPath(selected, file, "browser_child_authored_build_source");
  }
  for (const file of child.lockedBuildInputSnapshot.inputs) {
    addSelectedPath(selected, file, "browser_child_locked_build_input");
  }
  for (const file of child.evidenceToolingSnapshot.files) {
    addSelectedPath(selected, file, "browser_child_evidence_tooling");
  }
  addSelectedPath(selected, childArtifact, "browser_child_persisted_observation");
  for (const file of tools) addSelectedPath(selected, file, "manifest_v3_verification_tooling");

  const selectedFiles = [...selected.values()]
    .map((entry) => ({
      path: entry.path,
      bytes: entry.bytes,
      sha256: entry.sha256,
      originRoles: [...entry.originRoles].sort()
    }))
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return { predecessor, child, childArtifact, tools, selectedFiles };
}

function falseAuthorityBoundary() {
  return {
    contentTruthEstablished: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    expertIdentityQualificationIndependenceEstablished: false,
    expertTruthEstablished: false,
    formalAdmissionAuthorized: false,
    highRiskClaimsAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    redistributionAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false,
    safeToPublish: false
  };
}

function buildProjection(inputs) {
  const predecessorSummary = getWesternIndependentEngineeringManifestV2Summary(inputs.predecessor);
  const childSummary = summarizeWesternSameArtifactCandidate(inputs.child);
  const selectedPathDigest = sha256(Buffer.from(
    `${SELECTED_PATH_DIGEST_DOMAIN}${canonicalCompact(inputs.selectedFiles)}`,
    "utf8"
  ));
  const unsigned = {
    schemaVersion: "3.0.0",
    recordType: "western_engineering_manifest_browser_child_selected_path_successor_v3",
    manifestId: MANIFEST_ID,
    status: "current_predecessor_plus_browser_child_selected_path_machine_identity_zero_admission_effect",
    createdAt: CREATED_AT,
    activeAdmissionEffect: "none",
    systemIdentity: {
      productSystemId: "western-astrology",
      contractSystemId: "western",
      productStatus: "isolated_engineering_draft",
      baziAuthorityInherited: false
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByWesternProductIdentity: false,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    productBoundary: {
      productIdentity: null,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      formalProductSurface: "absent",
      mainApplicationIntegrated: false,
      centralRegistryIntegration: "absent"
    },
    artifactBindings: [
      {
        role: "current_predecessor_manifest_v2_private_brand",
        path: predecessorSummary.artifact.path,
        rawBytes: predecessorSummary.artifact.rawBytes,
        rawSha256: predecessorSummary.artifact.rawSha256,
        semanticDigest: predecessorSummary.manifestDigest,
        semanticDigestField: "manifestDigest",
        privateBrandConsumed: true
      },
      {
        role: "current_isolated_same_artifact_browser_child_private_brand",
        path: inputs.childArtifact.path,
        rawBytes: inputs.childArtifact.bytes,
        rawSha256: inputs.childArtifact.sha256,
        semanticDigest: childSummary.observationDigest,
        semanticDigestField: "observationDigest",
        privateBrandConsumed: true
      }
    ],
    manifestVerificationTooling: {
      fileCount: inputs.tools.length,
      files: cloneJson(inputs.tools),
      identitiesVerifiedFromIndividuallyHeldFileReads: true,
      trustedToolAttestationEstablished: false
    },
    selectedPathMachineIdentity: {
      scopeClass: "predecessor_three_package_plus_browser_child_declared_graphs_not_entire_western_engineering",
      predecessorSelectedPathCount: predecessorSummary.uniquePhysicalPaths,
      browserChildAuthoredSourcePathCount: inputs.child.expectedAuthoredBuildInputClosure.fileCount,
      browserChildLockedBuildInputPathCount: inputs.child.lockedBuildInputSnapshot.inputCount,
      browserChildEvidenceToolPathCount: inputs.child.evidenceToolingSnapshot.fileCount,
      browserChildPersistedObservationPathCount: 1,
      manifestVerificationToolPathCount: inputs.tools.length,
      selectedUniquePhysicalPathCount: inputs.selectedFiles.length,
      selectedPathDigest,
      files: cloneJson(inputs.selectedFiles),
      canonicalPathSortApplied: true,
      duplicatePathIdentityConflictsRejected: true,
      recursiveDirectoryEnumerationPerformed: false,
      extraFileAbsenceEstablished: false,
      entireWesternEngineeringClosureEstablished: false,
      currentFullDomainManifestMechanicallyVerified: false
    },
    componentBoundary: {
      predecessorComponentCount: predecessorSummary.componentCount,
      predecessorComponentFileReferences: predecessorSummary.componentFileReferences,
      predecessorComponentClassificationPreservedWithoutReinterpretation: true,
      browserChildRole: "engineering_and_isolated_browser_runtime_attachment_only",
      browserChildSemanticComponentMembershipEstablished: false,
      componentCompletenessEstablished: false,
      contentTruthEstablished: false
    },
    browserEvidenceBoundary: {
      childCurrentAtManifestVerification: true,
      manifestRerunsBrowserMatrix: false,
      exactSingleBuildAtChildIssuance: true,
      sameOutputTreeServedToBothBrowsersAtChildIssuance: true,
      chromeScenarioOutcomesAtChildIssuance: 5,
      edgeScenarioOutcomesAtChildIssuance: 5,
      totalPassedScenarioOutcomesAtChildIssuance: 10,
      chromeVersionAtChildIssuance: childSummary.browserVersions.chrome,
      edgeVersionAtChildIssuance: childSummary.browserVersions.msedge,
      outputTreeDigestAtChildIssuance: childSummary.outputTreeDigest,
      perBrowserServedBodyManifestsEqualAtChildIssuance: true,
      browserRuntimeEvidenceEstablishedByThisManifest: false,
      isolatedChildEvidenceAttached: true,
      fullApplicationRuntimeValidated: false,
      mainApplicationRuntimeValidated: false,
      fixedPhysicalDeviceValidated: false,
      productionBrowserRuntimeEvidenceEstablished: false,
      publicHostValidated: false,
      pwaOrServiceWorkerValidated: false
    },
    currentnessBoundary: {
      predecessorPrivateBrandVerified: true,
      browserChildPrivateBrandVerified: true,
      currentSelectedPathEngineeringManifestMechanicallyVerified: true,
      currentFullDomainManifestMechanicallyVerified: false,
      formalOrCurrentSourceRequirementsMechanicallyVerified: false,
      productIdentityEstablished: false,
      entireWesternEngineeringClosureEstablished: false,
      ownerPromotionDecisionReceipt: null
    },
    gateState: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 28,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      releaseEvidenceComplete: false
    },
    observationBoundary: {
      sameHeldBufferHashAndParsePerJsonArtifact: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      manifestDigestIsDigitalSignature: false,
      trustedTimestampEstablished: false,
      createdAtClock: "untrusted_local_clock_label"
    },
    runtimeTrustBoundary: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    evidenceLedger: {
      engineeringEvidence: "current_selected_path_machine_identity_with_current_isolated_browser_child",
      browserAndRuntimeEvidence: "attached_child_isolated_loopback_same_artifact_chrome_edge_only",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsAndLegalJudgment: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    authorityBoundary: falseAuthorityBoundary(),
    doesNotEstablish: [
      "recursive_directory_or_extra_file_absence_closure",
      "entire_western_engineering_or_current_full_domain_manifest",
      "formal_product_identity_surface_registry_or_admission",
      "source_body_exact_quote_frozen_binding_or_three_layer_rights",
      "astronomical_content_interpretation_or_scientific_truth",
      "real_expert_identity_qualification_independence_opinion_or_truth",
      "complete_high_risk_semantic_policy_or_claims_authority",
      "full_application_pwa_service_worker_public_host_fixed_device_or_production_runtime",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
      "legacy_v13_or_bazi_authority_inheritance"
    ]
  };
  return {
    ...unsigned,
    manifestDigest: computeWesternIndependentEngineeringManifestV3Digest(unsigned)
  };
}

function assertManifestBoundary(manifest) {
  requireExactKeys(manifest, [
    "activeAdmissionEffect", "artifactBindings", "authorityBoundary", "browserEvidenceBoundary",
    "componentBoundary", "createdAt", "currentnessBoundary", "doesNotEstablish",
    "evidenceLedger", "gateState", "manifestDigest", "manifestId",
    "manifestVerificationTooling", "observationBoundary", "productBoundary",
    "projectReleaseGovernanceContext", "recordType", "runtimeTrustBoundary", "schemaVersion",
    "selectedPathMachineIdentity", "status", "systemIdentity"
  ], "MANIFEST_SHAPE_INVALID");
  const selectedFiles = manifest.selectedPathMachineIdentity?.files;
  if (!Array.isArray(selectedFiles)
      || selectedFiles.length !== manifest.selectedPathMachineIdentity?.selectedUniquePhysicalPathCount
      || selectedFiles.some((entry, index) => {
        const previous = selectedFiles[index - 1];
        return entry === null || typeof entry !== "object" || Array.isArray(entry)
          || canonicalCompact(Object.keys(entry).sort())
            !== canonicalCompact(["bytes", "originRoles", "path", "sha256"].sort())
          || typeof entry.path !== "string" || entry.path.length === 0
          || entry.path.includes("\\") || entry.path.split("/").some((part) => !part || part === "." || part === "..")
          || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || !SHA256.test(entry.sha256 ?? "")
          || !Array.isArray(entry.originRoles) || entry.originRoles.length < 1
          || entry.originRoles.some((role, roleIndex) => typeof role !== "string" || role.length === 0
            || (roleIndex > 0 && entry.originRoles[roleIndex - 1] >= role))
          || (previous !== undefined && previous.path >= entry.path);
      })
      || manifest.selectedPathMachineIdentity?.selectedPathDigest !== sha256(Buffer.from(
        `${SELECTED_PATH_DIGEST_DOMAIN}${canonicalCompact(selectedFiles)}`,
        "utf8"
      ))) {
    fail("SELECTED_PATH_SET_INVALID");
  }
  const toolFiles = manifest.manifestVerificationTooling?.files;
  if (!Array.isArray(toolFiles) || toolFiles.length !== TOOL_PATHS.length
      || manifest.manifestVerificationTooling.fileCount !== TOOL_PATHS.length
      || toolFiles.some((entry, index) => entry.path !== TOOL_PATHS[index]
        || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || !SHA256.test(entry.sha256 ?? ""))) {
    fail("MANIFEST_TOOLING_INVALID");
  }
  if (manifest.schemaVersion !== "3.0.0" || manifest.manifestId !== MANIFEST_ID
      || manifest.status
        !== "current_predecessor_plus_browser_child_selected_path_machine_identity_zero_admission_effect"
      || manifest.activeAdmissionEffect !== "none"
      || !SHA256.test(manifest.manifestDigest ?? "")
      || computeWesternIndependentEngineeringManifestV3Digest(manifest) !== manifest.manifestDigest
      || manifest.gateState?.admissionGatesRequired !== 8
      || manifest.gateState?.admissionGatesSatisfied !== 0
      || manifest.gateState?.bindingRequired !== 28
      || manifest.gateState?.bindingFrozenVerified !== 0
      || manifest.gateState?.independentExpertsRequired !== 2
      || manifest.gateState?.independentExpertReviewsVerified !== 0
      || manifest.selectedPathMachineIdentity?.currentFullDomainManifestMechanicallyVerified !== false
      || manifest.selectedPathMachineIdentity?.entireWesternEngineeringClosureEstablished !== false
      || manifest.browserEvidenceBoundary?.totalPassedScenarioOutcomesAtChildIssuance !== 10
      || manifest.browserEvidenceBoundary?.browserRuntimeEvidenceEstablishedByThisManifest !== false
      || manifest.browserEvidenceBoundary?.productionBrowserRuntimeEvidenceEstablished !== false
      || manifest.productBoundary?.productIdentity !== null
      || manifest.productBoundary?.releaseIdentity !== null
      || manifest.productBoundary?.targetSchema !== null
      || manifest.productBoundary?.migrationId !== null
      || manifest.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
      || manifest.projectReleaseGovernanceContext?.targetSchema !== 13
      || manifest.projectReleaseGovernanceContext?.migrationId !== null
      || manifest.observationBoundary?.mutationEpochAvailable !== false
      || manifest.observationBoundary?.mutationEpochReceipt !== null) {
    fail("MANIFEST_BOUNDARY_INVALID");
  }
  requireAllFalse(manifest.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  return manifest;
}

export async function buildCurrentWesternIndependentEngineeringManifestV3(
  workspaceRoot = process.cwd()
) {
  return deepFreeze(assertManifestBoundary(buildProjection(await collectCurrentInputs(workspaceRoot))));
}

export async function loadWesternIndependentEngineeringManifestV3(
  workspaceRoot = process.cwd()
) {
  const expected = await buildCurrentWesternIndependentEngineeringManifestV3(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH
  );
  const persisted = assertManifestBoundary(parseBaziDttStrictJsonArtifact(snapshot));
  if (Buffer.from(snapshot.bytes).toString("utf8")
      !== canonicalPrettyStringifyWesternIndependentEngineeringManifestV3(persisted)
      || canonicalCompact(persisted) !== canonicalCompact(expected)) {
    fail("CURRENT_MANIFEST_MISMATCH");
  }
  const result = deepFreeze({
    artifact: {
      path: WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    },
    manifest: cloneJson(persisted)
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedWesternIndependentEngineeringManifestV3(value) {
  return value !== null && typeof value === "object" && VERIFIED_RESULTS.has(value)
    && Object.isFrozen(value);
}

export function getWesternIndependentEngineeringManifestV3Summary(value) {
  if (!isVerifiedWesternIndependentEngineeringManifestV3(value)) {
    fail("VERIFIED_BRAND_REQUIRED");
  }
  const manifest = value.manifest;
  return deepFreeze({
    artifact: cloneJson(value.artifact),
    manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest,
    selectedUniquePhysicalPathCount:
      manifest.selectedPathMachineIdentity.selectedUniquePhysicalPathCount,
    chromeVersion: manifest.browserEvidenceBoundary.chromeVersionAtChildIssuance,
    edgeVersion: manifest.browserEvidenceBoundary.edgeVersionAtChildIssuance,
    passedScenarioOutcomes:
      manifest.browserEvidenceBoundary.totalPassedScenarioOutcomesAtChildIssuance,
    currentFullDomainManifestMechanicallyVerified:
      manifest.currentnessBoundary.currentFullDomainManifestMechanicallyVerified,
    admissionGatesSatisfied: manifest.gateState.admissionGatesSatisfied,
    admissionGatesRequired: manifest.gateState.admissionGatesRequired,
    bindingFrozenVerified: manifest.gateState.bindingFrozenVerified,
    bindingRequired: manifest.gateState.bindingRequired,
    independentExpertReviewsVerified: manifest.gateState.independentExpertReviewsVerified,
    independentExpertsRequired: manifest.gateState.independentExpertsRequired,
    releaseReady: manifest.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: manifest.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: manifest.authorityBoundary.publicReleaseAuthorized,
    expertClaimsAuthorized: manifest.authorityBoundary.expertClaimsAuthorized
  });
}

export const westernIndependentEngineeringManifestV3TestOnly = Object.freeze({
  TOOL_PATHS,
  canonicalCompact,
  assertManifestBoundary
});
