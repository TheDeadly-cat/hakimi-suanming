import { createHash } from "node:crypto";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  canonicalStringifyZiweiExpertPublicCandidatePrescreen,
  isVerifiedZiweiExpertPublicCandidatePrescreen,
  loadZiweiExpertPublicCandidatePrescreen
} from "./ziwei-expert-public-candidate-prescreen-lib.mjs";

export const ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_RELATIVE_PATH =
  "content/system-admission/ziwei-expert-public-candidate-prescreen-cli-runtime-boundary-erratum.v1.json";

const ERRATUM_ID = "hakimi.ziwei.expert-public-candidate-prescreen-cli-runtime-boundary-erratum/1.0.0";
const DIGEST_DOMAIN = `${ERRATUM_ID}\0`;
const SHA256 = /^[0-9a-f]{64}$/u;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const REFLECT_APPLY = Reflect.apply;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_VALUES = Object.values;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

function freeze(value) {
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

const EXPECTED_PERSISTED_RAW = freeze({
  rawBytes: 9_359,
  rawSha256: "60948f362cb4d6125b047cf93e491d0a58bd1b90dce6e4c8866f44b61a6d7ce0"
});

const BASIS_ARTIFACT = freeze({
  path: "docs/阶段E-紫微公开候选预筛CLI运行时边界勘误-2026-09-03.md",
  role: "runtime_boundary_erratum_narrative_basis",
  rawBytes: 5_670,
  rawSha256: "688f3116fcdfc496af0a54a485731bf147c25270b951f4164c89310f667092a9"
});

const ORIGINAL_FIVE_ARTIFACTS = freeze([
  freeze({
    role: "predecessor_public_candidate_prescreen_ledger",
    path: "content/system-admission/ziwei-expert-public-candidate-prescreen.v1.json",
    rawBytes: 29_196,
    rawSha256: "3dcf8c849aae41e5afec8b08653432504160a53006a3e82458a5bc5dc4947f89"
  }),
  freeze({
    role: "predecessor_full_loader_library",
    path: "scripts/ziwei-expert-public-candidate-prescreen-lib.mjs",
    rawBytes: 43_868,
    rawSha256: "466ac907d9a5f3dde85e5930b75543e6520db14c9ee7c7a77273dc6da24bbbbc"
  }),
  freeze({
    role: "affected_legacy_fixed_cli",
    path: "scripts/verify-ziwei-expert-public-candidate-prescreen.mjs",
    rawBytes: 4_291,
    rawSha256: "3d9c34ae24319f833035987b22207a01a85a6f1e54328413ea6ef69e18d8774a"
  }),
  freeze({
    role: "predecessor_test_evidence",
    path: "scripts/verify-ziwei-expert-public-candidate-prescreen.test.mjs",
    rawBytes: 21_295,
    rawSha256: "7c6c6c822263d27459fa4a050a12ec1ae1a42c59e743c9b7b4bc63707bd308d4"
  }),
  freeze({
    role: "predecessor_narrative_basis",
    path: "docs/阶段E-紫微现实专家公开候选预筛-2026-09-01.md",
    rawBytes: 7_524,
    rawSha256: "f5f1b56c486072f8c1ea7453a1328db78eeb936d69a8bee5c26a0e7b3b965da5"
  })
]);

const POC_STDOUT = freeze({
  prefix: "ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_OK",
  bytes: 611,
  sha256: "8098f69663eb58cf04d333ee546f5e38e8ee06833700295e940622591584b5bf"
});

const OWN_SOURCE_PATHS = freeze([
  "scripts/ziwei-expert-public-candidate-prescreen-cli-runtime-boundary-erratum-lib.mjs",
  "scripts/verify-ziwei-expert-public-candidate-prescreen-cli-runtime-boundary-erratum.mjs"
]);

const NODE_PREFIX = "node:";
const FORBIDDEN_DIRECT_NETWORK_TOKENS = freeze([
  NODE_PREFIX + "http",
  NODE_PREFIX + "https",
  NODE_PREFIX + "net",
  NODE_PREFIX + "tls",
  NODE_PREFIX + "dns",
  "fetch" + "("
]);

const AUTHORITY_KEYS = freeze([
  "identityVerified",
  "credentialVerified",
  "scopeVerified",
  "independenceVerified",
  "participationConsentVerified",
  "expertStatusVerified",
  "contentTruthEstablished",
  "expertTruthEstablished",
  "sourceRightsEstablished",
  "rightsLegalConclusionEstablished",
  "redistributionAuthorized",
  "formalAdmissionAuthorized",
  "releaseReady",
  "expertClaimsAuthorized",
  "publicDeploymentAuthorized",
  "publicReleaseAuthorized",
  "crossSystemAuthorityInheritanceAuthorized"
]);

export class ZiweiPrescreenCliRuntimeBoundaryErratumError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ZiweiPrescreenCliRuntimeBoundaryErratumError";
    REFLECT_APPLY(OBJECT_DEFINE_PROPERTY, Object, [this, "code", { value: code, enumerable: false }]);
  }
}

function fail(code, message, cause) {
  throw new ZiweiPrescreenCliRuntimeBoundaryErratumError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function canonical(value) {
  try {
    return canonicalStringifyZiweiExpertPublicCandidatePrescreen(value);
  } catch (cause) {
    fail("ERRATUM_INPUT_INVALID", "运行时边界勘误只接受被动 JSON 值。", cause);
  }
}

function passiveClone(value) {
  return JSON.parse(canonical(value));
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const children = REFLECT_APPLY(OBJECT_VALUES, Object, [value]);
  for (let index = 0; index < children.length; index += 1) deepFreeze(children[index], seen);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function computeZiweiPrescreenCliRuntimeBoundaryErratumDigest(value) {
  const unsigned = passiveClone(value);
  delete unsigned.erratumDigest;
  return sha256Text(DIGEST_DOMAIN + canonical(unsigned));
}

function artifactCopy(entry) {
  return {
    role: entry.role,
    path: entry.path,
    rawBytes: entry.rawBytes,
    rawSha256: entry.rawSha256
  };
}

function falseRecord(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

export function buildExpectedZiweiPrescreenCliRuntimeBoundaryErratum() {
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "ziwei_expert_public_candidate_prescreen_cli_runtime_boundary_erratum_v1",
    erratumId: ERRATUM_ID,
    status: "append_only_runtime_boundary_claim_correction_zero_admission_effect",
    createdOnLabel: "2026-09-03",
    basisArtifact: artifactCopy(BASIS_ARTIFACT),
    originalFiveArtifacts: ORIGINAL_FIVE_ARTIFACTS.map(artifactCopy),
    predecessorBinding: {
      ledgerId: "hakimi.ziwei.expert-public-candidate-prescreen/1.0.0",
      ledgerDigest: "d2885be87211af363cabddaa8f4ebc1d45774070429e3e2757496fde93f92294",
      fullLoaderPrivateBrandRequired: true,
      plainCloneCarriesPrivateBrand: false,
      predecessorContentSemanticsChanged: false,
      predecessorRuntimeClaimScopeCorrectedOnlyByThisChild: true
    },
    reproducedOperatorPocs: [
      {
        pocId: "direct-import-clears-execargv-before-cli-evaluation",
        observationMethod: "operator_local_read_only_process_reproduction",
        observedOnLabel: "2026-09-01",
        launchSurface: "direct_node_exec_argv_import",
        exactPreloadValue: "--import=data:text/javascript,process.execArgv.length=0",
        preEvaluationMutation: "process.execArgv.length=0",
        legacyCliExitCode: 0,
        legacyCliStdoutPrefix: POC_STDOUT.prefix,
        legacyCliStdoutBytes: POC_STDOUT.bytes,
        legacyCliStdoutSha256: POC_STDOUT.sha256,
        legacyCliStderrBytes: 0,
        legacyOkOutputTrustedAttestation: false,
        preloadArbitraryLocalCodeExecutionAlreadyAvailable: true,
        newAttackerCapabilityDemonstrated: false,
        networkAttemptedByPoc: false,
        projectFilesModifiedByPoc: false
      },
      {
        pocId: "node-options-import-deletes-env-and-clears-execargv-before-cli-evaluation",
        observationMethod: "operator_local_read_only_process_reproduction",
        observedOnLabel: "2026-09-01",
        launchSurface: "node_options_import",
        exactPreloadValue: "--import=data:text/javascript,delete%20process.env.NODE_OPTIONS%3Bprocess.execArgv.length%3D0",
        preEvaluationMutation: "delete process.env.NODE_OPTIONS; process.execArgv.length=0",
        legacyCliExitCode: 0,
        legacyCliStdoutPrefix: POC_STDOUT.prefix,
        legacyCliStdoutBytes: POC_STDOUT.bytes,
        legacyCliStdoutSha256: POC_STDOUT.sha256,
        legacyCliStderrBytes: 0,
        legacyOkOutputTrustedAttestation: false,
        preloadArbitraryLocalCodeExecutionAlreadyAvailable: true,
        newAttackerCapabilityDemonstrated: false,
        networkAttemptedByPoc: false,
        projectFilesModifiedByPoc: false
      }
    ],
    runtimeClaimCorrection: {
      allPreloadsRejected: false,
      wholeProcessOffline: false,
      cliOutputTrustedAttestation: false,
      launcherIdentityEstablished: false,
      loaderIdentityEstablished: false,
      nodeRuntimeIdentityEstablished: false,
      hiddenPreEvaluationExcluded: false,
      visibleInputGuardRejectsOnlyInputsStillVisibleAtCliEvaluationStart: true,
      visibleInputGuardSecurityBoundary: false,
      preloadAlreadyHasArbitraryLocalCodeExecution: true,
      erratumDemonstratesNewAttackerCapability: false
    },
    postImportPrimordialBoundary: {
      weakSetConstructorCapturedAtModuleEvaluation: true,
      weakSetPrototypeAddCapturedAtModuleEvaluation: true,
      weakSetPrototypeHasCapturedAtModuleEvaluation: true,
      reflectApplyCapturedAtModuleEvaluation: true,
      objectFreezeCapturedAtModuleEvaluation: true,
      objectIsFrozenCapturedAtModuleEvaluation: true,
      objectValuesCapturedAtModuleEvaluation: true,
      liveWeakSetPrototypeAddOrHasUsedByBrandPaths: false,
      postImportPrimordialPollutionResistanceMechanicallyTested: true,
      preEvaluationPrimordialIntegrityEstablished: false,
      hostilePreloadBlocked: false,
      securityBoundaryPromoted: false
    },
    fixedVerifierStaticScope: {
      scope: "own_source_static_token_absence_only",
      paths: [...OWN_SOURCE_PATHS],
      forbiddenDirectNetworkTokens: [...FORBIDDEN_DIRECT_NETWORK_TOKENS],
      forbiddenDirectNetworkTokensFound: 0,
      normalCleanInvocationRefetchesPublicSources: false,
      transitiveWholeProcessNetworkAbsenceEstablished: false,
      preloadOrLoaderHookNetworkAbsenceEstablished: false
    },
    zeroState: {
      publicCandidateLeadsObserved: 4,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceRequirementPartialCandidates: 2,
      sourceBindingsRequired: 27,
      sourceBindingsFrozenVerified: 0,
      formalExpertEntriesAdded: 0,
      currentExpertEntriesAdded: 0,
      formalOrCurrentEndpointIntegrationsAdded: 0
    },
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    authorityBoundary: falseRecord(AUTHORITY_KEYS),
    observationBoundary: {
      createdOnIsUntrustedDateLabelOnly: true,
      trustedTimestampEstablished: false,
      externalTimeAuthorityEstablished: false,
      serverDateHeaderCaptured: false,
      firstSeenEstablished: false,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      runtimeLauncherIdentityEstablished: false,
      loaderHookIdentityEstablished: false,
      nodeRuntimeIdentityEstablished: false,
      hiddenPreEvaluationExcluded: false
    },
    lineageBoundary: {
      appendOnlyChild: true,
      activeAdmissionEffect: "none",
      originalFiveArtifactsModified: 0,
      originalFiveBacklinksAdded: 0,
      predecessorLedgerReplaced: false,
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      currentRegistryIntegrated: false,
      fourSystemEndpointIntegrated: false,
      defaultBuildOrRuntimeIntegrated: false
    },
    doesNotEstablish: [
      "all_preloads_rejected_or_hostile_pre_evaluation_excluded",
      "whole_process_offline_or_network_absence",
      "trusted_cli_attestation_launcher_loader_or_node_runtime_identity",
      "real_person_identity_credentials_scope_consent_independence_opinion_or_expert_truth",
      "source_body_semantic_binding_content_truth_rights_legal_or_redistribution_conclusion",
      "formal_or_current_registry_manifest_endpoint_or_runtime_integration",
      "release_readiness_expert_claims_public_deployment_or_public_release_authorization",
      "trusted_time_first_seen_cross_file_atomic_snapshot_mutation_epoch_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({
    ...unsigned,
    erratumDigest: computeZiweiPrescreenCliRuntimeBoundaryErratumDigest(unsigned)
  });
}

function assertNoPromotion(value) {
  for (const key of AUTHORITY_KEYS) {
    if (value?.authorityBoundary?.[key] !== false) {
      fail("AUTHORITY_PROMOTION_FORBIDDEN", `authorityBoundary.${key} 必须保持 false。`);
    }
  }
  const correction = value?.runtimeClaimCorrection;
  for (const key of [
    "allPreloadsRejected",
    "wholeProcessOffline",
    "cliOutputTrustedAttestation",
    "launcherIdentityEstablished",
    "loaderIdentityEstablished",
    "nodeRuntimeIdentityEstablished",
    "hiddenPreEvaluationExcluded",
    "visibleInputGuardSecurityBoundary",
    "erratumDemonstratesNewAttackerCapability"
  ]) {
    if (correction?.[key] !== false) {
      fail("RUNTIME_CLAIM_PROMOTION_FORBIDDEN", `runtimeClaimCorrection.${key} 必须保持 false。`);
    }
  }
  for (const key of [
    "preEvaluationPrimordialIntegrityEstablished",
    "hostilePreloadBlocked",
    "securityBoundaryPromoted"
  ]) {
    if (value?.postImportPrimordialBoundary?.[key] !== false) {
      fail("PRE_EVALUATION_CLAIM_PROMOTION_FORBIDDEN", `postImportPrimordialBoundary.${key} 必须保持 false。`);
    }
  }
  if (value?.lineageBoundary?.activeAdmissionEffect !== "none"
    || value.lineageBoundary.originalFiveArtifactsModified !== 0
    || value.lineageBoundary.originalFiveBacklinksAdded !== 0
    || value.zeroState?.independentExpertReviewsVerified !== 0
    || value.zeroState?.sourceBindingsFrozenVerified !== 0
    || value.zeroState?.formalExpertEntriesAdded !== 0
    || value.zeroState?.currentExpertEntriesAdded !== 0
    || value.zeroState?.formalOrCurrentEndpointIntegrationsAdded !== 0) {
    fail("ZERO_EFFECT_PROMOTION_FORBIDDEN", "勘误不得产生专家、binding、endpoint 或 admission 效果。");
  }
}

export function verifyZiweiPrescreenCliRuntimeBoundaryErratum(input) {
  const value = passiveClone(input);
  assertNoPromotion(value);
  if (typeof value.erratumDigest !== "string" || !SHA256.test(value.erratumDigest)) {
    fail("ERRATUM_DIGEST_INVALID", "勘误必须具有小写 SHA-256 摘要。");
  }
  if (computeZiweiPrescreenCliRuntimeBoundaryErratumDigest(value) !== value.erratumDigest) {
    fail("ERRATUM_DIGEST_MISMATCH", "勘误摘要不匹配。");
  }
  const expected = buildExpectedZiweiPrescreenCliRuntimeBoundaryErratum();
  if (canonical(value) !== canonical(expected)) {
    fail("ERRATUM_CONTRACT_MISMATCH", "运行时边界勘误与固定合同不一致。");
  }
  return deepFreeze(value);
}

export function parseZiweiPrescreenCliRuntimeBoundaryErratumJsonBytes(bytes, label = "runtime-boundary-erratum.json") {
  try {
    return parseBaziDttStrictJsonArtifact({ path: label, bytes });
  } catch (cause) {
    fail("ERRATUM_JSON_INVALID", "运行时边界勘误不是严格 JSON。", cause);
  }
}

export function serializeZiweiPrescreenCliRuntimeBoundaryErratum(value) {
  verifyZiweiPrescreenCliRuntimeBoundaryErratum(value);
  return JSON.stringify(buildExpectedZiweiPrescreenCliRuntimeBoundaryErratum(), null, 2) + "\n";
}

function assertRawIdentity(snapshot, expected, label) {
  if (snapshot.path !== expected.path
    || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("BOUND_RAW_IDENTITY_DRIFT", `${label} raw identity 漂移。`);
  }
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("BOUND_UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

async function verifyBasis(workspaceRoot, value) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, BASIS_ARTIFACT.path);
  assertRawIdentity(snapshot, BASIS_ARTIFACT, BASIS_ARTIFACT.role);
  const text = decodeUtf8(snapshot.bytes, BASIS_ARTIFACT.role);
  for (const marker of [
    "# 阶段 E：紫微公开候选预筛 CLI 运行时边界勘误",
    "`allPreloadsRejected = false`",
    "`wholeProcessOffline = false`",
    "`cliOutputTrustedAttestation = false`",
    "post-import primordial resilience",
    POC_STDOUT.sha256,
    "紫微现实专家仍为 `0/2`"
  ]) {
    if (!text.includes(marker)) fail("BASIS_MARKER_MISSING", "勘误说明缺少固定边界标记。");
  }
  if (canonical(value.basisArtifact) !== canonical(artifactCopy(BASIS_ARTIFACT))) {
    fail("BASIS_BINDING_DRIFT", "勘误说明 binding 漂移。");
  }
  return snapshot;
}

async function verifyOriginalFive(workspaceRoot, value) {
  const snapshots = [];
  for (const expected of ORIGINAL_FIVE_ARTIFACTS) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    assertRawIdentity(snapshot, expected, expected.role);
    const text = decodeUtf8(snapshot.bytes, expected.role);
    if (text.includes(ERRATUM_ID)
      || text.includes(ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_RELATIVE_PATH)) {
      fail("ORIGINAL_FIVE_BACKLINK_FORBIDDEN", "旧五件套不得反向引用运行时边界勘误。");
    }
    snapshots.push(snapshot);
  }
  if (canonical(value.originalFiveArtifacts)
    !== canonical(ORIGINAL_FIVE_ARTIFACTS.map(artifactCopy))) {
    fail("ORIGINAL_FIVE_BINDING_DRIFT", "旧五件套 raw binding 漂移。");
  }
  return snapshots;
}

async function verifyPredecessorPrivateBrand(workspaceRoot, value) {
  const predecessor = await loadZiweiExpertPublicCandidatePrescreen(workspaceRoot);
  if (!isVerifiedZiweiExpertPublicCandidatePrescreen(predecessor)
    || isVerifiedZiweiExpertPublicCandidatePrescreen({ ...predecessor })
    || predecessor.ledgerId !== value.predecessorBinding.ledgerId
    || predecessor.ledgerDigest !== value.predecessorBinding.ledgerDigest
    || predecessor.ledgerArtifact?.rawBytes !== ORIGINAL_FIVE_ARTIFACTS[0].rawBytes
    || predecessor.ledgerArtifact?.rawSha256 !== ORIGINAL_FIVE_ARTIFACTS[0].rawSha256
    || predecessor.reviewerSlotsRequired !== 2
    || predecessor.reviewerSlotsOccupied !== 0
    || predecessor.independentExpertReviewsVerified !== 0
    || predecessor.sourceRequirementPartialCandidates !== 2
    || predecessor.sourceBindingsRequired !== 27
    || predecessor.sourceBindingsFrozenVerified !== 0
    || predecessor.expertClaimsAuthorized !== false
    || predecessor.releaseReady !== false
    || predecessor.publicDeploymentAuthorized !== false
    || predecessor.publicReleaseAuthorized !== false) {
    fail("PREDECESSOR_PRIVATE_BRAND_OR_ZERO_STATE_DRIFT", "旧预筛 full-loader 私有品牌或零实例边界漂移。");
  }
  return predecessor;
}

async function verifyOwnStaticScope(workspaceRoot, value) {
  let found = 0;
  const snapshots = [];
  for (const relativePath of OWN_SOURCE_PATHS) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, relativePath);
    const source = decodeUtf8(snapshot.bytes, relativePath);
    for (const token of FORBIDDEN_DIRECT_NETWORK_TOKENS) {
      if (source.includes(token)) found += 1;
    }
    snapshots.push(snapshot);
  }
  if (found !== 0
    || value.fixedVerifierStaticScope.forbiddenDirectNetworkTokensFound !== 0
    || canonical(value.fixedVerifierStaticScope.paths) !== canonical([...OWN_SOURCE_PATHS])
    || canonical(value.fixedVerifierStaticScope.forbiddenDirectNetworkTokens)
      !== canonical([...FORBIDDEN_DIRECT_NETWORK_TOKENS])) {
    fail("OWN_SOURCE_STATIC_NETWORK_SCOPE_DRIFT", "勘误 verifier 自身源码静态网络 token 范围漂移。");
  }
  return snapshots;
}

function publicIdentity(snapshot) {
  return freeze({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

export async function loadZiweiPrescreenCliRuntimeBoundaryErratum(workspaceRoot = process.cwd()) {
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    ZIWEI_PRESCREEN_CLI_RUNTIME_BOUNDARY_ERRATUM_RELATIVE_PATH
  );
  if (snapshot.rawBytes !== EXPECTED_PERSISTED_RAW.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED_RAW.rawSha256) {
    fail("ERRATUM_RAW_IDENTITY_DRIFT", "运行时边界勘误 raw identity 漂移。");
  }
  const value = verifyZiweiPrescreenCliRuntimeBoundaryErratum(
    parseZiweiPrescreenCliRuntimeBoundaryErratumJsonBytes(snapshot.bytes, snapshot.path)
  );
  if (decodeUtf8(snapshot.bytes, snapshot.path)
    !== serializeZiweiPrescreenCliRuntimeBoundaryErratum(value)) {
    fail("ERRATUM_CANONICAL_BYTES_DRIFT", "运行时边界勘误必须保持唯一 pretty JSON 与 LF 终止。");
  }
  const [basis, originalFive, predecessor, ownSources] = await Promise.all([
    verifyBasis(workspaceRoot, value),
    verifyOriginalFive(workspaceRoot, value),
    verifyPredecessorPrivateBrand(workspaceRoot, value),
    verifyOwnStaticScope(workspaceRoot, value)
  ]);
  const result = deepFreeze({
    ok: true,
    erratumId: value.erratumId,
    erratumDigest: value.erratumDigest,
    scope: value.fixedVerifierStaticScope.scope,
    historicalPreloadLimitationsRecorded: value.reproducedOperatorPocs.length,
    visibleInputGuardSecurityBoundary: value.runtimeClaimCorrection.visibleInputGuardSecurityBoundary,
    allPreloadsRejected: value.runtimeClaimCorrection.allPreloadsRejected,
    wholeProcessOffline: value.runtimeClaimCorrection.wholeProcessOffline,
    cliOutputTrustedAttestation: value.runtimeClaimCorrection.cliOutputTrustedAttestation,
    launcherIdentityEstablished: value.runtimeClaimCorrection.launcherIdentityEstablished,
    loaderIdentityEstablished: value.runtimeClaimCorrection.loaderIdentityEstablished,
    nodeRuntimeIdentityEstablished: value.runtimeClaimCorrection.nodeRuntimeIdentityEstablished,
    hiddenPreEvaluationExcluded: value.runtimeClaimCorrection.hiddenPreEvaluationExcluded,
    postImportPrimordialPollutionResistanceMechanicallyTested:
      value.postImportPrimordialBoundary.postImportPrimordialPollutionResistanceMechanicallyTested,
    preEvaluationPrimordialIntegrityEstablished:
      value.postImportPrimordialBoundary.preEvaluationPrimordialIntegrityEstablished,
    ownSourceForbiddenDirectNetworkTokensFound:
      value.fixedVerifierStaticScope.forbiddenDirectNetworkTokensFound,
    reviewerSlots: `${predecessor.reviewerSlotsOccupied}/${predecessor.reviewerSlotsRequired}`,
    sourceBindings: `${predecessor.sourceBindingsFrozenVerified}/${predecessor.sourceBindingsRequired}`,
    sourceRequirementPartialCandidates: predecessor.sourceRequirementPartialCandidates,
    releaseIdentity: value.releaseGovernance.activeLine,
    targetSchema: value.releaseGovernance.targetSchema,
    migrationId: value.releaseGovernance.migrationId,
    mutationEpochReceipt: value.releaseGovernance.mutationEpochReceipt,
    expertClaimsAuthorized: value.authorityBoundary.expertClaimsAuthorized,
    releaseReady: value.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: value.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: value.authorityBoundary.publicReleaseAuthorized,
    artifact: publicIdentity(snapshot),
    basisArtifact: publicIdentity(basis),
    originalFiveArtifacts: originalFive.map(publicIdentity),
    ownSourceArtifacts: ownSources.map(publicIdentity),
    predecessor,
    value
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export function getZiweiPrescreenCliRuntimeBoundaryErratumSummary(value) {
  if (!isVerifiedZiweiPrescreenCliRuntimeBoundaryErratum(value)) {
    fail("PRIVATE_BRAND_REQUIRED", "运行时边界勘误 summary 只接受 full-loader 私有品牌。");
  }
  return deepFreeze({
    ok: value.ok,
    erratumId: value.erratumId,
    erratumDigest: value.erratumDigest,
    scope: value.scope,
    historicalPreloadLimitationsRecorded: value.historicalPreloadLimitationsRecorded,
    visibleInputGuardSecurityBoundary: value.visibleInputGuardSecurityBoundary,
    allPreloadsRejected: value.allPreloadsRejected,
    wholeProcessOffline: value.wholeProcessOffline,
    cliOutputTrustedAttestation: value.cliOutputTrustedAttestation,
    launcherIdentityEstablished: value.launcherIdentityEstablished,
    loaderIdentityEstablished: value.loaderIdentityEstablished,
    nodeRuntimeIdentityEstablished: value.nodeRuntimeIdentityEstablished,
    hiddenPreEvaluationExcluded: value.hiddenPreEvaluationExcluded,
    postImportPrimordialPollutionResistanceMechanicallyTested:
      value.postImportPrimordialPollutionResistanceMechanicallyTested,
    preEvaluationPrimordialIntegrityEstablished: value.preEvaluationPrimordialIntegrityEstablished,
    ownSourceForbiddenDirectNetworkTokensFound: value.ownSourceForbiddenDirectNetworkTokensFound,
    reviewerSlots: value.reviewerSlots,
    sourceBindings: value.sourceBindings,
    sourceRequirementPartialCandidates: value.sourceRequirementPartialCandidates,
    releaseIdentity: value.releaseIdentity,
    targetSchema: value.targetSchema,
    migrationId: value.migrationId,
    mutationEpochReceipt: value.mutationEpochReceipt,
    expertClaimsAuthorized: value.expertClaimsAuthorized,
    releaseReady: value.releaseReady,
    publicDeploymentAuthorized: value.publicDeploymentAuthorized,
    publicReleaseAuthorized: value.publicReleaseAuthorized
  });
}

export const ziweiPrescreenCliRuntimeBoundaryErratumTestOnly = freeze({
  AUTHORITY_KEYS,
  BASIS_ARTIFACT,
  DIGEST_DOMAIN,
  ERRATUM_ID,
  EXPECTED_PERSISTED_RAW,
  FORBIDDEN_DIRECT_NETWORK_TOKENS,
  ORIGINAL_FIVE_ARTIFACTS,
  OWN_SOURCE_PATHS,
  POC_STDOUT
});
