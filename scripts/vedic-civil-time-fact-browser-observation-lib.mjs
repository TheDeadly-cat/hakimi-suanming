import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync
} from "node:fs";
import path from "node:path";

import { parse } from "@babel/parser";

export const VEDIC_CIVIL_TIME_FACT_BROWSER_DRAFT =
  "isolated-drafts/vedic-civil-time-fact-browser-draft";
export const RESTRICTED_APPS_WEB_SOURCE =
  "apps/web/src/lib/local-user-data-cleanup.ts";
export const VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE =
  "content/system-admission/vedic-civil-time-fact-browser-observation-candidate.v1.0.0.json";

const DRAFT_PREFIX = VEDIC_CIVIL_TIME_FACT_BROWSER_DRAFT + "/";
const VITE_CONFIG = DRAFT_PREFIX + "vite.config.mjs";
const HTML_ENTRY = DRAFT_PREFIX + "browser-app/index.html";
const MAIN_MODULE = DRAFT_PREFIX + "src/main.ts";
const CLIENT_MODULE = DRAFT_PREFIX + "src/civil-client.ts";
const CIVIL_TIME_MODULE = DRAFT_PREFIX + "src/civil-time.ts";
const CIVIL_WORKER_MODULE = DRAFT_PREFIX + "src/civil-worker.ts";
const PRODUCER_MODULE = DRAFT_PREFIX + "src/worker-fact-projection.ts";
const TZDB_INDEX_MODULE = "packages/tzdb-core/src/index.ts";
const TZDB_RESOLVER_MODULE = "packages/tzdb-core/src/packed-resolver.ts";
const TZDB_2025B_MODULE = "packages/tzdb-core/src/artifacts/iana-2025b.ts";
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.vedic.civil-time-fact-browser-observation-candidate.v1\0";
const BUILD_OUTPUT_DIGEST_DOMAIN =
  "hakimi.vedic.civil-time-fact-browser-build-output-identity.v1\0";
const STATIC_DIGEST_DOMAIN =
  "hakimi.vedic.civil-time-fact-browser-static-observation.v1\0";
const SHA256 = /^[a-f0-9]{64}$/u;
const TEMP_LEAF = /^hakimi-vedic-facts-[a-f0-9]{32}$/u;
const LOOPBACK_ORIGIN = /^http:\/\/127\.0\.0\.1:(?:[1-9]\d{0,4})$/u;
const STATIC_RESULT_BRAND = new WeakSet();
const CANDIDATE_RESULT_BRAND = new WeakSet();

const EXPECTED_DRAFT_RUNTIME_SOURCE_FILES = Object.freeze([
  DRAFT_PREFIX + "src/browser-fact-projection.ts",
  DRAFT_PREFIX + "src/civil-client.ts",
  DRAFT_PREFIX + "src/civil-time.ts",
  DRAFT_PREFIX + "src/civil-worker.ts",
  DRAFT_PREFIX + "src/constants.ts",
  DRAFT_PREFIX + "src/input-contract.ts",
  DRAFT_PREFIX + "src/main.ts",
  DRAFT_PREFIX + "src/protocol.ts",
  DRAFT_PREFIX + "src/ui-format.ts",
  DRAFT_PREFIX + "src/worker-fact-projection.ts"
]);

const EXPECTED_RUNTIME_IMPORT_GRAPH = deepFreeze({
  [DRAFT_PREFIX + "src/browser-fact-projection.ts"]: [
    "./constants.ts",
    "./input-contract.ts",
    "./protocol.ts",
    "./ui-format.ts"
  ],
  [DRAFT_PREFIX + "src/civil-client.ts"]: [
    "./browser-fact-projection.ts",
    "./constants.ts",
    "./input-contract.ts",
    "./protocol.ts"
  ],
  [DRAFT_PREFIX + "src/civil-time.ts"]: [
    "../../../packages/tzdb-core/src/index.ts",
    "./constants.ts",
    "./input-contract.ts",
    "./protocol.ts",
    "./ui-format.ts"
  ],
  [DRAFT_PREFIX + "src/civil-worker.ts"]: [
    "./civil-time.ts",
    "./constants.ts",
    "./protocol.ts",
    "./worker-fact-projection.ts"
  ],
  [DRAFT_PREFIX + "src/constants.ts"]: [],
  [DRAFT_PREFIX + "src/input-contract.ts"]: ["./protocol.ts"],
  [DRAFT_PREFIX + "src/main.ts"]: [
    "./civil-client.ts",
    "./input-contract.ts",
    "./styles.css",
    "./ui-format.ts"
  ],
  [DRAFT_PREFIX + "src/protocol.ts"]: [],
  [DRAFT_PREFIX + "src/ui-format.ts"]: [],
  [DRAFT_PREFIX + "src/worker-fact-projection.ts"]: [
    "./browser-fact-projection.ts",
    "./civil-time.ts",
    "./constants.ts",
    "./protocol.ts"
  ],
  [TZDB_2025B_MODULE]: [
    "moment-timezone-2025b/data/packed/latest.json"
  ],
  [TZDB_INDEX_MODULE]: [
    "./artifacts/iana-2025b.ts",
    "./packed-resolver.ts",
    "moment-timezone"
  ],
  [TZDB_RESOLVER_MODULE]: ["moment-timezone"]
});

const EXPECTED_PRODUCER_IMPORTERS = Object.freeze([
  DRAFT_PREFIX + "src/browser-fact-projection.test.ts",
  DRAFT_PREFIX + "src/civil-client.test.ts",
  CIVIL_WORKER_MODULE
]);

const STATIC_IDENTITY_FILES = Object.freeze([
  ...Object.keys(EXPECTED_RUNTIME_IMPORT_GRAPH).sort(),
  HTML_ENTRY,
  VITE_CONFIG
].sort());

const FORMAL_CONTEXT_FILES = Object.freeze([
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json",
  "content/system-admission/vedic-input-contract-requirements.v1.json",
  "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json",
  "content/system-admission/vedic-fact-contract-requirements.v1.json",
  "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json",
  "content/system-admission/vedic-rule-contract-requirements.v1.json",
  "content/system-admission/vedic-independent-productization-requirements.v1.json"
]);

const VERIFIER_FILES = Object.freeze([
  "scripts/vedic-civil-time-fact-browser-observation-lib.mjs",
  "scripts/verify-vedic-civil-time-fact-browser-observation.mjs",
  "scripts/verify-vedic-civil-time-fact-browser-observation.test.mjs"
]);

const EXPECTED_LOCKED_BUILD_INPUTS = deepFreeze([
  { pathIdentifier: "tzdbCorePath", bytes: 7819, sha256: "7c144f6446b3fdba55f7b7b947fe242348ba5010025af36868c39436bfea638e" },
  { pathIdentifier: "tzdbResolverPath", bytes: 8495, sha256: "bc13da5d2d9b8309aaad972662f8a31761a40afffbd9226bdf80159d43e5081f" },
  { pathIdentifier: "momentEntryPath", bytes: 114, sha256: "b93bc1a0ab15d56e12f0e281bf005d39166952d9208b828e8d056563f3ff1fd1" },
  { pathIdentifier: "momentImplementationPath", bytes: 17137, sha256: "c6ea311984ec62f79570fe9d440295978ec21518d4b8e3ac88117e729e85bc7b" },
  { pathIdentifier: "momentPackageJsonPath", bytes: 1076, sha256: "131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b" },
  { pathIdentifier: "momentDataPath", bytes: 715527, sha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" },
  { pathIdentifier: "momentLicensePath", bytes: 1097, sha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" },
  { pathIdentifier: "retainedTzdbAdapterPath", bytes: 396, sha256: "b1236071105653538a259d929a57e7cd2bb97928429cefaef2ead9dd5019e613" },
  { pathIdentifier: "retainedMomentEntryPath", bytes: 114, sha256: "b93bc1a0ab15d56e12f0e281bf005d39166952d9208b828e8d056563f3ff1fd1" },
  { pathIdentifier: "retainedMomentImplementationPath", bytes: 17139, sha256: "11de898e2d5abf498f56633f7f425512bb90bdfa0c1ad527eb4e88bb86e6c443" },
  { pathIdentifier: "retainedMomentPackageJsonPath", bytes: 1077, sha256: "4b5a6218fe37ea04bbe19f463fc2477e141bfb8ee18506bd99e871a0d25c3dad" },
  { pathIdentifier: "retainedMomentDataPath", bytes: 727104, sha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425" },
  { pathIdentifier: "retainedMomentLicensePath", bytes: 1097, sha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7" },
  { pathIdentifier: "sharedMomentImplementationPath", bytes: 176435, sha256: "7dc0a51c32dae143f2eade235145dfd6a7756388c0f0bf409fa373dd6c233629" },
  { pathIdentifier: "sharedMomentBrowserImplementationPath", bytes: 156326, sha256: "1e949937d4266c65affeb189ff0f4c0dafed235d8d314e32d6746f0334c95852" },
  { pathIdentifier: "sharedMomentPackageJsonPath", bytes: 3556, sha256: "5e2f0870f4d1bbef11e8bf90babd72a4399b86b19da81de796a58457a37b8e13" },
  { pathIdentifier: "sharedMomentLicensePath", bytes: 1075, sha256: "8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3" }
]);

const EXPECTED_NOTICE_OUTPUTS = deepFreeze([
  {
    path: "licenses/moment-2.30.1-LICENSE.txt",
    bytes: 1075,
    sha256: "8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3"
  },
  {
    path: "licenses/moment-timezone-0.5.48-retained-LICENSE.txt",
    bytes: 1097,
    sha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"
  },
  {
    path: "licenses/moment-timezone-0.6.3-LICENSE.txt",
    bytes: 1097,
    sha256: "b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7"
  }
]);

const FORBIDDEN_IMPORT_PATTERNS = Object.freeze([
  { label: "apps/web", pattern: /(?:^|\/)apps\/web(?:\/|$)/u },
  { label: "astronomy", pattern: /astronomy/iu },
  { label: "rules", pattern: /(?:^|[-_/])rules?(?:[-_/]|$)/iu },
  { label: "cross-system", pattern: /cross[-_/]?system/iu },
  { label: "bazi", pattern: /(?:^|[-_/])bazi(?:[-_/]|$)/iu },
  { label: "ziwei", pattern: /(?:^|[-_/])ziwei(?:[-_/]|$)/iu },
  { label: "western", pattern: /(?:^|[-_/])western(?:[-_/]|$)/iu },
  { label: "other-system-cn", pattern: /八字|紫微|西洋/u }
]);

const FORBIDDEN_IDENTIFIERS = new Set([
  "Cache",
  "CacheStorage",
  "EventSource",
  "Image",
  "IDBDatabase",
  "IDBFactory",
  "ServiceWorker",
  "ServiceWorkerContainer",
  "ServiceWorkerRegistration",
  "SharedWorker",
  "Storage",
  "WebSocket",
  "XMLHttpRequest",
  "caches",
  "console",
  "fetch",
  "indexedDB",
  "localStorage",
  "sessionStorage"
]);

const FORBIDDEN_MEMBER_PROPERTIES = new Set([
  "clipboard",
  "caches",
  "console",
  "cookie",
  "download",
  "EventSource",
  "fetch",
  "indexedDB",
  "localStorage",
  "sendBeacon",
  "serviceWorker",
  "sessionStorage",
  "storage",
  "WebSocket",
  "XMLHttpRequest"
]);

const FORBIDDEN_CALL_NAMES = new Set([
  "importScripts",
  "showDirectoryPicker",
  "showOpenFilePicker",
  "showSaveFilePicker"
]);

const APPS_WEB_SOURCE_EXTENSIONS = new Set([
  ".cjs", ".css", ".cts", ".html", ".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx"
]);
const SKIPPED_DIRECTORY_NAMES = new Set([
  ".git", ".vite", "build", "coverage", "dist", "node_modules"
]);

const FALSE_AUTHORITY_KEYS = Object.freeze([
  "formalInputContractAdmitted",
  "civilTimeDomainTruthCertified",
  "astronomicalFactsEstablished",
  "contentTruthEstablished",
  "expertTruthEstablished",
  "expertIdentityCredentialsIndependenceEstablished",
  "sourceFreezeEstablished",
  "rightsLegalConclusionEstablished",
  "domainAuthorityAuthorized",
  "formalAdmissionAuthorized",
  "highRiskClaimsAuthorized",
  "releaseEvidenceComplete",
  "releaseReady",
  "publicDeploymentAuthorized",
  "publicReleaseAuthorized",
  "expertClaimsAuthorized",
  "crossSystemAuthorityInherited"
]);

export class VedicCivilTimeFactBrowserObservationError extends Error {
  constructor(code, detail, options) {
    super(code + ": " + detail, options);
    this.name = "VedicCivilTimeFactBrowserObservationError";
    this.code = code;
  }
}

function fail(code, detail, cause) {
  throw new VedicCivilTimeFactBrowserObservationError(
    code,
    detail,
    cause === undefined ? undefined : { cause }
  );
}

export function isVedicCivilTimeFactBrowserObservation(value) {
  return value !== null
    && typeof value === "object"
    && STATIC_RESULT_BRAND.has(value)
    && Object.isFrozen(value);
}

export function isVerifiedVedicCivilTimeFactBrowserObservationCandidate(value) {
  return value !== null
    && typeof value === "object"
    && CANDIDATE_RESULT_BRAND.has(value)
    && Object.isFrozen(value);
}

export function computeVedicCivilTimeFactBrowserBuildOutputIdentityDigest(value) {
  const captured = captureJsonData(value, "BUILD_OUTPUT_IDENTITY");
  return sha256Text(BUILD_OUTPUT_DIGEST_DOMAIN + canonicalCompact(captured));
}

export function computeVedicCivilTimeFactBrowserObservationCandidateDigest(value) {
  const captured = captureJsonData(value, "OBSERVATION_CANDIDATE");
  const projection = omitRootKey(captured, "observationDigest");
  return sha256Text(CANDIDATE_DIGEST_DOMAIN + canonicalCompact(projection));
}

export function verifyVedicCivilTimeFactBrowserObservation(workspaceRoot = process.cwd()) {
  const root = requireWorkspaceRoot(workspaceRoot);
  const cache = new Map();
  verifyDraftRuntimeInventory(root);

  const parsedModules = new Map();
  const observedGraph = {};
  for (const [relativePath, expectedSpecifiers] of Object.entries(EXPECTED_RUNTIME_IMPORT_GRAPH)) {
    const source = readWorkspaceArtifact(root, relativePath, cache).text;
    const ast = parseModule(source, relativePath);
    parsedModules.set(relativePath, ast);
    const observedSpecifiers = collectRuntimeModuleSpecifiers(ast, relativePath);
    assertStringArrayEqual(
      observedSpecifiers,
      expectedSpecifiers,
      "RUNTIME_IMPORT_GRAPH_MISMATCH",
      relativePath
    );
    for (const specifier of observedSpecifiers) {
      verifyRuntimeImportSpecifier(relativePath, specifier);
    }
    observedGraph[relativePath] = observedSpecifiers;
  }

  verifyForbiddenRuntimeCapabilities(parsedModules);
  const worker = verifyWorkerBoundary(root, parsedModules, cache);
  const mainThread = verifyMainThreadBoundary(observedGraph);
  const producer = verifyProducerImporters(root, cache);
  const build = verifyViteBuildBoundary(root, cache);
  const html = verifyHtmlBoundary(root, cache);
  const productionReachability = scanAppsWebReverseReferences(root);
  const runtimeSourceIdentities = STATIC_IDENTITY_FILES.map((relativePath) =>
    publicArtifactIdentity(readWorkspaceArtifact(root, relativePath, cache)));
  const runtimeImportEdgeCount = Object.values(observedGraph)
    .reduce((sum, edges) => sum + edges.length, 0);

  const unsigned = {
    kind: "vedic_civil_time_fact_browser_static_boundary_observation",
    schemaVersion: "1.0.0",
    draftRoot: VEDIC_CIVIL_TIME_FACT_BROWSER_DRAFT,
    runtimeImportGraph: observedGraph,
    runtimeModuleCount: Object.keys(observedGraph).length,
    runtimeImportEdgeCount,
    draftRuntimeSourceFileCount: EXPECTED_DRAFT_RUNTIME_SOURCE_FILES.length,
    runtimeSourceIdentities,
    runtimeSourceIdentityCount: runtimeSourceIdentities.length,
    sameBufferByteLengthSha256AndStrictUtf8Verified: true,
    forbiddenRuntimeImportCount: 0,
    forbiddenRuntimeCapabilityReferenceCount: 0,
    worker,
    mainThread,
    producer,
    build,
    html,
    productionReachability,
    incompleteProductionReachabilityAudit: true,
    wholeRepositoryProductionUnreachableEstablished: false,
    engineeringEvidenceObserved: true,
    browserRuntimeEvidenceEstablished: false,
    contentAuthorityEstablished: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    sourceRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    formalAdmissionAuthorized: false,
    releaseReadyEstablished: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    expertClaimsAuthorized: false
  };
  const result = deepFreeze({
    ...unsigned,
    staticObservationDigest: sha256Text(STATIC_DIGEST_DOMAIN + canonicalCompact(unsigned))
  });
  STATIC_RESULT_BRAND.add(result);
  return result;
}

export function buildExpectedVedicCivilTimeFactBrowserObservationCandidate(
  workspaceRootOrEvidence,
  maybeEvidence
) {
  const { workspaceRoot, evidence } = resolveBuildArguments(
    workspaceRootOrEvidence,
    maybeEvidence
  );
  const root = requireWorkspaceRoot(workspaceRoot);
  const staticObservation = verifyVedicCivilTimeFactBrowserObservation(root);
  const normalizedEvidence = normalizeCandidateEvidence(evidence);
  const formalContext = verifyFormalContextBoundary(root);
  const artifactBindings = buildCandidateArtifactBindings(
    root,
    staticObservation,
    formalContext
  );
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "vedic_civil_time_fact_only_browser_observation_candidate_v1",
    observationId: "hakimi.vedic.civil-time-fact-only-browser-observation/1.0.0",
    status: "operator_supplied_two_build_identity_and_one_browser_observation_candidate_only",
    createdAt: normalizedEvidence.createdAt,
    activeAdmissionEffect: "none",
    systemIdentity: {
      contractSystemId: "vedic",
      productSystemId: null,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      contextOnlyNotInheritedProductIdentity: true
    },
    scopeBoundary: {
      civilTimeEngineeringFactsOnly: true,
      utcInstantIncluded: true,
      utcOffsetSecondsIncluded: true,
      localWallTimeOverlapGapHandlingIncluded: true,
      daylightSavingClassificationEstablished: false,
      tzdbBindingIncluded: true,
      ut1Included: false,
      ttIncluded: false,
      tdbIncluded: false,
      eopIncluded: false,
      ramcIncluded: false,
      ephemerisIncluded: false,
      chartIncluded: false,
      housesIncluded: false,
      aspectsIncluded: false,
      interpretationIncluded: false,
      rulesIncluded: false
    },
    staticBoundaryObservation: {
      kind: staticObservation.kind,
      staticObservationDigest: staticObservation.staticObservationDigest,
      runtimeModuleCount: staticObservation.runtimeModuleCount,
      runtimeImportEdgeCount: staticObservation.runtimeImportEdgeCount,
      runtimeSourceIdentityCount: staticObservation.runtimeSourceIdentityCount,
      sameBufferByteLengthSha256AndStrictUtf8Verified:
        staticObservation.sameBufferByteLengthSha256AndStrictUtf8Verified,
      lockedBuildInputCount: staticObservation.build.lockedBuildInputCount,
      emittedNoticeCount: staticObservation.build.emittedNoticeCount,
      buildManifestFileName: staticObservation.build.buildManifestFileName,
      finalBuildEnvelopeFileCount:
        staticObservation.build.finalBuildEnvelopeFileCount,
      manifestEnumeratedOutputFileCount:
        staticObservation.build.manifestEnumeratedOutputFileCount,
      previewRevalidatesManifestAndExactEnvelope:
        staticObservation.build.previewRevalidatesManifestAndExactEnvelope,
      concurrentSameAccountPathReplacementExcluded:
        staticObservation.build.concurrentSameAccountPathReplacementExcluded,
      concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded:
        staticObservation.build
          .concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded,
      osLevelAdversarialReplacementExcluded: false,
      authoredSourceForbiddenCapabilityReferenceCount: 0,
      workerOnlyTzdbReachabilityEstablished:
        staticObservation.worker.workerOnlyTzdbReachabilityEstablished,
      productionReachabilityAudit: {
        appsWebReadableSourceFilesScanned:
          staticObservation.productionReachability.appsWebReadableSourceFilesScanned,
        appsWebReverseReferenceCount: 0,
        restrictedPathIntentionallySkipped: RESTRICTED_APPS_WEB_SOURCE,
        incompleteProductionReachabilityAudit: true,
        wholeRepositoryProductionUnreachableEstablished: false
      }
    },
    buildOutputIdentities: normalizedEvidence.buildOutputIdentities,
    browserObservation: normalizedEvidence.browserObservation,
    artifactBindings,
    artifactBindingCount: artifactBindings.length,
    formalContext: {
      boundLedgerCount: formalContext.bindings.length,
      bindings: formalContext.bindings,
      authorityBoundaryAllFalseVerified: true,
      productizationGateSummaryVerified: true
    },
    evidenceAccounts: [
      {
        accountId: "engineering_evidence",
        observationPresent: true,
        admitted: false,
        authorityGranted: false
      },
      {
        accountId: "browser_runtime_evidence",
        observationPresent: true,
        productionValidated: false,
        authorityGranted: false
      },
      {
        accountId: "content_truth",
        established: false,
        authorityGranted: false
      },
      {
        accountId: "expert_truth",
        established: false,
        authorityGranted: false
      },
      {
        accountId: "rights_legal_judgment",
        established: false,
        authorityGranted: false
      },
      {
        accountId: "release_readiness",
        established: false,
        authorityGranted: false
      },
      {
        accountId: "public_release_authorization",
        established: false,
        authorityGranted: false
      }
    ],
    gateSummary: {
      evidenceAccountCount: 7,
      bindingRequired: 38,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      rereviewRequirementsRequired: 7,
      rereviewRequirementsComplete: 3,
      requirementsUniverseClosed: false,
      sourceBindingEstablished: false,
      rightsLegalConclusionEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    authorityBoundary: Object.fromEntries(
      FALSE_AUTHORITY_KEYS.map((key) => [key, false])
    ),
    dataHandling: {
      personDerivedData: true,
      candidateDigestIsAnonymous: false,
      realPersonDataUsedInRecordedObservation: false,
      loggingAuthorized: false,
      persistenceAuthorized: false,
      networkTransmissionAuthorized: false,
      publicationAuthorized: false,
      noLogNoPersistNoPublishBoundary: true
    },
    observationBoundary: {
      operatorSuppliedEvidence: true,
      toolAttestationEstablished: false,
      twoBuildOutputsByteIdenticalObserved: true,
      oneSyntheticBrowserObservationRecorded: true,
      crossFileAtomicSnapshot: false,
      mutationEpochClaimed: false,
      mutationEpochReceipt: null,
      intervalMutationExcluded: false,
      abaExcluded: false,
      osLevelAdversarialReplacementExcluded: false
    },
    doesNotEstablish: [
      "astronomy_ephemeris_chart_houses_aspects_or_interpretation",
      "content_truth_or_expert_truth",
      "source_freeze_rights_or_legal_clearance",
      "production_browser_cross_browser_pwa_or_service_worker_validation",
      "formal_admission_release_readiness_or_public_release_authorization",
      "mutation_epoch_cross_file_atomicity_interval_integrity_or_aba_exclusion"
    ]
  };
  const candidate = deepFreeze({
    ...unsigned,
    observationDigest:
      computeVedicCivilTimeFactBrowserObservationCandidateDigest(unsigned)
  });
  validateCandidateContract(candidate);
  CANDIDATE_RESULT_BRAND.add(candidate);
  return candidate;
}

export const buildExpectedVedicCivilTimeFactBrowserObservation =
  buildExpectedVedicCivilTimeFactBrowserObservationCandidate;
export const buildExpected =
  buildExpectedVedicCivilTimeFactBrowserObservationCandidate;

export function verifyVedicCivilTimeFactBrowserObservationCandidate(
  workspaceRoot,
  candidateInput
) {
  const root = requireWorkspaceRoot(workspaceRoot);
  const candidate = captureJsonData(candidateInput, "OBSERVATION_CANDIDATE");
  validateCandidateContract(candidate);
  const evidence = {
    createdAt: candidate.createdAt,
    buildOutputIdentities: candidate.buildOutputIdentities,
    browserObservation: candidate.browserObservation
  };
  const expected = buildExpectedVedicCivilTimeFactBrowserObservationCandidate(
    root,
    evidence
  );
  if (canonicalCompact(candidate) !== canonicalCompact(expected)) {
    fail(
      "OBSERVATION_CANDIDATE_CONTRACT_MISMATCH",
      "candidate differs from current source identities or fixed fail-closed contract"
    );
  }
  const result = deepFreeze(candidate);
  CANDIDATE_RESULT_BRAND.add(result);
  return result;
}

export function serializeVedicCivilTimeFactBrowserObservationCandidate(value) {
  const candidate = captureJsonData(value, "OBSERVATION_CANDIDATE");
  validateCandidateContract(candidate);
  return JSON.stringify(canonicalJsonValue(candidate), null, 2) + "\n";
}

export const serializeVedicCivilTimeFactBrowserObservation =
  serializeVedicCivilTimeFactBrowserObservationCandidate;
export const serialize =
  serializeVedicCivilTimeFactBrowserObservationCandidate;

export function loadVedicCivilTimeFactBrowserObservationCandidate(
  workspaceRoot = process.cwd()
) {
  const root = requireWorkspaceRoot(workspaceRoot);
  const artifact = readWorkspaceArtifact(
    root,
    VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE,
    new Map()
  );
  if (artifact.bytes.byteLength >= 3
    && artifact.bytes[0] === 0xef
    && artifact.bytes[1] === 0xbb
    && artifact.bytes[2] === 0xbf) {
    fail(
      "OBSERVATION_CANDIDATE_NOT_CANONICAL",
      "candidate JSON must not contain a UTF-8 BOM"
    );
  }
  const candidate = parseStrictJsonText(
    artifact.text,
    VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE
  );
  const verified = verifyVedicCivilTimeFactBrowserObservationCandidate(
    root,
    candidate
  );
  if (artifact.text
    !== serializeVedicCivilTimeFactBrowserObservationCandidate(verified)) {
    fail(
      "OBSERVATION_CANDIDATE_NOT_CANONICAL",
      "candidate must use sorted two-space JSON with one LF terminator"
    );
  }
  return verified;
}

export const load = loadVedicCivilTimeFactBrowserObservationCandidate;
export const verify = verifyVedicCivilTimeFactBrowserObservation;

export function summarizeVedicCivilTimeFactBrowserObservation(value) {
  if (isVedicCivilTimeFactBrowserObservation(value)) {
    return deepFreeze({
      kind: value.kind,
      schemaVersion: value.schemaVersion,
      runtimeModuleCount: value.runtimeModuleCount,
      runtimeImportEdgeCount: value.runtimeImportEdgeCount,
      runtimeSourceIdentityCount: value.runtimeSourceIdentityCount,
      lockedBuildInputCount: value.build.lockedBuildInputCount,
      emittedNoticeCount: value.build.emittedNoticeCount,
      appsWebReadableSourceFilesScanned:
        value.productionReachability.appsWebReadableSourceFilesScanned,
      appsWebReverseReferenceCount: 0,
      incompleteProductionReachabilityAudit: true,
      wholeRepositoryProductionUnreachableEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReadyEstablished: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false
    });
  }
  if (isVerifiedVedicCivilTimeFactBrowserObservationCandidate(value)) {
    return deepFreeze({
      recordType: value.recordType,
      observationId: value.observationId,
      observationDigest: value.observationDigest,
      artifactBindingCount: value.artifactBindingCount,
      buildOutputIdentityCount: value.buildOutputIdentities.length,
      browserObservationCount: 1,
      evidenceAccountCount: value.gateSummary.evidenceAccountCount,
      incompleteProductionReachabilityAudit: true,
      wholeRepositoryProductionUnreachableEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false,
      activeAdmissionEffect: "none"
    });
  }
  fail(
    "SUMMARY_PRIVATE_BRAND_REQUIRED",
    "summary requires a result returned by this verifier"
  );
}

export const summary = summarizeVedicCivilTimeFactBrowserObservation;

function resolveBuildArguments(workspaceRootOrEvidence, maybeEvidence) {
  if (typeof workspaceRootOrEvidence === "string") {
    return { workspaceRoot: workspaceRootOrEvidence, evidence: maybeEvidence };
  }
  return {
    workspaceRoot: process.cwd(),
    evidence: workspaceRootOrEvidence
  };
}

function normalizeCandidateEvidence(input) {
  const evidence = requireExactRecord(
    captureJsonData(input, "CANDIDATE_EVIDENCE"),
    ["browserObservation", "buildOutputIdentities", "createdAt"],
    "CANDIDATE_EVIDENCE_SHAPE_INVALID"
  );
  const createdAt = requireCanonicalIsoInstant(
    evidence.createdAt,
    "CANDIDATE_CREATED_AT_INVALID"
  );
  if (!Array.isArray(evidence.buildOutputIdentities)
    || evidence.buildOutputIdentities.length !== 2) {
    fail(
      "BUILD_OUTPUT_IDENTITY_COUNT_INVALID",
      "exactly two build output identities are required"
    );
  }
  const buildOutputIdentities = evidence.buildOutputIdentities.map(
    (entry, index) => normalizeBuildOutputIdentity(entry, index)
  );
  if (buildOutputIdentities[0].runId === buildOutputIdentities[1].runId
    || buildOutputIdentities[0].outDirLeaf
      === buildOutputIdentities[1].outDirLeaf) {
    fail(
      "BUILD_OUTPUT_RUN_INDEPENDENCE_INVALID",
      "build run ids and OS-temp leaves must be distinct"
    );
  }
  if (buildOutputIdentities[0].outputIdentityDigest
      !== buildOutputIdentities[1].outputIdentityDigest
    || canonicalCompact(buildOutputIdentities[0].artifacts)
      !== canonicalCompact(buildOutputIdentities[1].artifacts)
    || buildOutputIdentities[0].transformedModuleCount
      !== buildOutputIdentities[1].transformedModuleCount) {
    fail(
      "BUILD_OUTPUT_IDENTITY_MISMATCH",
      "the two build outputs must have byte-identical artifact identities"
    );
  }
  const browserObservation = normalizeBrowserObservation(
    evidence.browserObservation,
    buildOutputIdentities,
    createdAt
  );
  return deepFreeze({
    createdAt,
    buildOutputIdentities,
    browserObservation
  });
}

function normalizeBuildOutputIdentity(input, index) {
  const record = requireExactRecord(
    input,
    [
      "artifacts",
      "exitCode",
      "outDirLeaf",
      "outputIdentityDigest",
      "runId",
      "transformedModuleCount",
      "viteVersion"
    ],
    "BUILD_OUTPUT_IDENTITY_SHAPE_INVALID"
  );
  const runId = requireShortString(record.runId, "BUILD_RUN_ID_INVALID", 80);
  const outDirLeaf = requireShortString(
    record.outDirLeaf,
    "BUILD_OUTDIR_LEAF_INVALID",
    80
  );
  if (!TEMP_LEAF.test(outDirLeaf)) {
    fail(
      "BUILD_OUTDIR_LEAF_INVALID",
      "build " + (index + 1) + " did not use the required OS-temp GUID leaf"
    );
  }
  if (record.exitCode !== 0 || record.viteVersion !== "7.3.6"
    || !Number.isSafeInteger(record.transformedModuleCount)
    || record.transformedModuleCount < 1
    || record.transformedModuleCount > 10000) {
    fail(
      "BUILD_EXECUTION_IDENTITY_INVALID",
      "build must record Vite 7.3.6, exit code 0, and a bounded module count"
    );
  }
  const artifacts = normalizeBuildArtifacts(record.artifacts);
  const digestProjection = {
    artifacts,
    transformedModuleCount: record.transformedModuleCount,
    viteVersion: "7.3.6"
  };
  const digest =
    computeVedicCivilTimeFactBrowserBuildOutputIdentityDigest(digestProjection);
  if (!SHA256.test(record.outputIdentityDigest ?? "")
    || record.outputIdentityDigest !== digest) {
    fail(
      "BUILD_OUTPUT_DIGEST_MISMATCH",
      "build output identity digest is invalid"
    );
  }
  return deepFreeze({
    runId,
    outDirLeaf,
    exitCode: 0,
    viteVersion: "7.3.6",
    transformedModuleCount: record.transformedModuleCount,
    artifacts,
    outputIdentityDigest: digest
  });
}

function normalizeBuildArtifacts(input) {
  if (!Array.isArray(input) || input.length !== 12) {
    fail(
      "BUILD_ARTIFACT_COUNT_INVALID",
      "build identity must contain the 11 payload files and one manifest"
    );
  }
  const artifacts = input.map((entry) => {
    const record = requireExactRecord(
      entry,
      ["bytes", "path", "sha256"],
      "BUILD_ARTIFACT_SHAPE_INVALID"
    );
    const relativePath = requireSafeOutputPath(record.path);
    if (!Number.isSafeInteger(record.bytes) || record.bytes < 1
      || !SHA256.test(record.sha256 ?? "")) {
      fail(
        "BUILD_ARTIFACT_IDENTITY_INVALID",
        "build artifact bytes or SHA-256 is invalid"
      );
    }
    return {
      path: relativePath,
      bytes: record.bytes,
      sha256: record.sha256
    };
  }).sort((left, right) => left.path.localeCompare(right.path, "en"));
  const paths = artifacts.map((entry) => entry.path);
  if (new Set(paths).size !== paths.length) {
    fail("BUILD_ARTIFACT_PATH_DUPLICATE", "build artifact paths must be unique");
  }
  const rolePatterns = [
    /^index\.html$/u,
    /^assets\/index-[A-Za-z0-9_-]+\.js$/u,
    /^assets\/index-[A-Za-z0-9_-]+\.js\.map$/u,
    /^assets\/index-[A-Za-z0-9_-]+\.css$/u,
    /^assets\/civil-worker-[A-Za-z0-9_-]+\.js$/u,
    /^assets\/civil-worker-[A-Za-z0-9_-]+\.js\.map$/u,
    /^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u,
    /^assets\/iana-2025b-[A-Za-z0-9_-]+\.js\.map$/u,
    /^hakimi-vedic-fact-only-build-manifest\.v1\.json$/u,
    /^licenses\/moment-2\.30\.1-LICENSE\.txt$/u,
    /^licenses\/moment-timezone-0\.5\.48-retained-LICENSE\.txt$/u,
    /^licenses\/moment-timezone-0\.6\.3-LICENSE\.txt$/u
  ];
  for (const pattern of rolePatterns) {
    if (paths.filter((candidate) => pattern.test(candidate)).length !== 1) {
      fail(
        "BUILD_ARTIFACT_ROLE_SET_INVALID",
        "build output artifact roles are incomplete or ambiguous"
      );
    }
  }
  for (const notice of EXPECTED_NOTICE_OUTPUTS) {
    const observed = artifacts.find((entry) => entry.path === notice.path);
    if (!observed || observed.bytes !== notice.bytes
      || observed.sha256 !== notice.sha256) {
      fail(
        "BUILD_NOTICE_IDENTITY_INVALID",
        notice.path + " identity drifted"
      );
    }
  }
  return deepFreeze(artifacts);
}

function normalizeBrowserObservation(input, builds, candidateCreatedAt) {
  const record = requireExactRecord(
    input,
    [
      "actualPersonDataEntered",
      "allButtonsTypeButtonBrowserObserved",
      "astronomyOrInterpretationFieldsBrowserObserved",
      "browserProduct",
      "browserVersion",
      "chromeValidated",
      "connectSrcNoneResponseHeaderObserved",
      "consoleProbePerformed",
      "consoleWarningOrErrorCountObserved",
      "controlsDisabledDuringRunBrowserObserved",
      "cookieInspectionProhibited",
      "cookieProbePerformed",
      "cookieMutationObserved",
      "crossBrowserValidated",
      "edgeValidated",
      "factOnlyFieldsBrowserObserved",
      "failureAllowlistBrowserObserved",
      "formActionNoneResponseHeaderObserved",
      "formSubmissionBehaviorBrowserObserved",
      "historicalSecondPrecisionOffsetBrowserObserved",
      "inputClearedOnChangeBrowserObserved",
      "namedControlsBrowserObserved",
      "networkProbePerformed",
      "networkRequestCountObserved",
      "observedAt",
      "origin",
      "productionBrowserRuntimeEvidenceEstablished",
      "productionHostValidated",
      "requestDigestBindingBrowserObserved",
      "responseDescriptorCaptureBrowserObserved",
      "scenarios",
      "serviceWorkerProbePerformed",
      "serviceWorkerRegistrationObserved",
      "sourceBuildOutputIdentityDigest",
      "sourceBuildRunId",
      "storageInspectionProhibited",
      "storageProbePerformed",
      "storageMutationObserved",
      "syntheticDataOnly",
      "utcOffsetIncludesSecondsBrowserObserved"
    ],
    "BROWSER_OBSERVATION_SHAPE_INVALID"
  );
  const observedAt = requireCanonicalIsoInstant(
    record.observedAt,
    "BROWSER_OBSERVED_AT_INVALID"
  );
  if (Date.parse(observedAt) > Date.parse(candidateCreatedAt)) {
    fail(
      "BROWSER_OBSERVATION_TIME_INVALID",
      "browser observation cannot postdate the candidate"
    );
  }
  if (record.browserProduct !== "Codex In-app Browser"
    || record.browserVersion !== null
    || typeof record.origin !== "string"
    || !LOOPBACK_ORIGIN.test(record.origin)
    || record.syntheticDataOnly !== true
    || record.actualPersonDataEntered !== false
    || record.requestDigestBindingBrowserObserved !== false
    || record.responseDescriptorCaptureBrowserObserved !== false
    || record.failureAllowlistBrowserObserved !== false
    || record.factOnlyFieldsBrowserObserved !== true
    || record.astronomyOrInterpretationFieldsBrowserObserved !== false
    || record.utcOffsetIncludesSecondsBrowserObserved !== true
    || record.namedControlsBrowserObserved !== 0
    || record.allButtonsTypeButtonBrowserObserved !== true
    || record.formSubmissionBehaviorBrowserObserved !== false
    || record.historicalSecondPrecisionOffsetBrowserObserved
      !== "UTC+08:05:43"
    || record.inputClearedOnChangeBrowserObserved !== true
    || record.controlsDisabledDuringRunBrowserObserved !== false
    || record.connectSrcNoneResponseHeaderObserved !== true
    || record.formActionNoneResponseHeaderObserved !== true
    || record.networkProbePerformed !== false
    || record.networkRequestCountObserved !== null
    || record.consoleProbePerformed !== true
    || record.consoleWarningOrErrorCountObserved !== 0
    || record.storageInspectionProhibited !== true
    || record.storageProbePerformed !== false
    || record.storageMutationObserved !== null
    || record.cookieInspectionProhibited !== true
    || record.cookieProbePerformed !== false
    || record.cookieMutationObserved !== null
    || record.serviceWorkerProbePerformed !== false
    || record.serviceWorkerRegistrationObserved !== null
    || record.chromeValidated !== false
    || record.edgeValidated !== false
    || record.crossBrowserValidated !== false
    || record.productionHostValidated !== false
    || record.productionBrowserRuntimeEvidenceEstablished !== false) {
    fail(
      "BROWSER_OBSERVATION_BOUNDARY_INVALID",
      "browser observation must remain synthetic, loopback-only, fact-only, and non-production"
    );
  }
  const sourceBuild = builds.find((entry) => entry.runId === record.sourceBuildRunId);
  if (!sourceBuild
    || record.sourceBuildOutputIdentityDigest
      !== sourceBuild.outputIdentityDigest) {
    fail(
      "BROWSER_BUILD_BINDING_INVALID",
      "browser observation is not bound to one of the two build identities"
    );
  }
  const scenarios = normalizeBrowserScenarios(record.scenarios);
  return deepFreeze({
    browserProduct: "Codex In-app Browser",
    browserVersion: null,
    observedAt,
    origin: record.origin,
    sourceBuildRunId: record.sourceBuildRunId,
    sourceBuildOutputIdentityDigest:
      record.sourceBuildOutputIdentityDigest,
    syntheticDataOnly: true,
    actualPersonDataEntered: false,
    scenarios,
    requestDigestBindingBrowserObserved: false,
    responseDescriptorCaptureBrowserObserved: false,
    failureAllowlistBrowserObserved: false,
    factOnlyFieldsBrowserObserved: true,
    astronomyOrInterpretationFieldsBrowserObserved: false,
    utcOffsetIncludesSecondsBrowserObserved: true,
    namedControlsBrowserObserved: 0,
    allButtonsTypeButtonBrowserObserved: true,
    formSubmissionBehaviorBrowserObserved: false,
    historicalSecondPrecisionOffsetBrowserObserved: "UTC+08:05:43",
    inputClearedOnChangeBrowserObserved: true,
    controlsDisabledDuringRunBrowserObserved: false,
    connectSrcNoneResponseHeaderObserved: true,
    formActionNoneResponseHeaderObserved: true,
    networkProbePerformed: false,
    networkRequestCountObserved: null,
    consoleProbePerformed: true,
    consoleWarningOrErrorCountObserved: 0,
    storageInspectionProhibited: true,
    storageProbePerformed: false,
    storageMutationObserved: null,
    cookieInspectionProhibited: true,
    cookieProbePerformed: false,
    cookieMutationObserved: null,
    serviceWorkerProbePerformed: false,
    serviceWorkerRegistrationObserved: null,
    chromeValidated: false,
    edgeValidated: false,
    crossBrowserValidated: false,
    productionHostValidated: false,
    productionBrowserRuntimeEvidenceEstablished: false
  });
}

function normalizeBrowserScenarios(input) {
  if (!Array.isArray(input) || input.length !== 5) {
    fail(
      "BROWSER_SCENARIO_COUNT_INVALID",
      "five civil-time scenarios are required"
    );
  }
  const expected = [
    { scenarioId: "unique", outcome: "resolved", code: null, decision: "unique" },
    { scenarioId: "gap", outcome: "failed_closed", code: "LOCAL_WALL_TIME_GAP_REJECTED", decision: null },
    { scenarioId: "overlap_reject", outcome: "failed_closed", code: "LOCAL_WALL_TIME_OVERLAP_REJECTED", decision: null },
    { scenarioId: "overlap_earlier", outcome: "resolved", code: null, decision: "vedic_adapter_draft_earlier" },
    { scenarioId: "overlap_later", outcome: "resolved", code: null, decision: "vedic_adapter_draft_later" }
  ];
  const observed = input.map((entry) => {
    const record = requireExactRecord(
      entry,
      ["code", "decision", "outcome", "partialFactsReturned", "scenarioId"],
      "BROWSER_SCENARIO_SHAPE_INVALID"
    );
    return {
      scenarioId: record.scenarioId,
      outcome: record.outcome,
      code: record.code,
      decision: record.decision,
      partialFactsReturned: record.partialFactsReturned
    };
  });
  for (let index = 0; index < expected.length; index += 1) {
    const left = observed[index];
    const right = expected[index];
    if (left.scenarioId !== right.scenarioId
      || left.outcome !== right.outcome
      || left.code !== right.code
      || left.decision !== right.decision
      || left.partialFactsReturned !== false) {
      fail(
        "BROWSER_SCENARIO_RESULT_INVALID",
        "scenario " + right.scenarioId + " drifted"
      );
    }
  }
  return deepFreeze(observed);
}

function validateCandidateContract(candidate) {
  requireExactRecord(
    candidate,
    [
      "activeAdmissionEffect",
      "artifactBindingCount",
      "artifactBindings",
      "authorityBoundary",
      "browserObservation",
      "buildOutputIdentities",
      "createdAt",
      "dataHandling",
      "doesNotEstablish",
      "evidenceAccounts",
      "formalContext",
      "gateSummary",
      "observationBoundary",
      "observationDigest",
      "observationId",
      "projectReleaseGovernanceContext",
      "recordType",
      "schemaVersion",
      "scopeBoundary",
      "staticBoundaryObservation",
      "status",
      "systemIdentity"
    ],
    "OBSERVATION_CANDIDATE_SHAPE_INVALID"
  );
  if (candidate.schemaVersion !== "1.0.0"
    || candidate.recordType
      !== "vedic_civil_time_fact_only_browser_observation_candidate_v1"
    || candidate.observationId
      !== "hakimi.vedic.civil-time-fact-only-browser-observation/1.0.0"
    || candidate.status
      !== "operator_supplied_two_build_identity_and_one_browser_observation_candidate_only"
    || candidate.activeAdmissionEffect !== "none"
    || candidate.systemIdentity?.contractSystemId !== "vedic"
    || candidate.systemIdentity?.productSystemId !== null
    || candidate.systemIdentity?.releaseIdentity !== null
    || candidate.systemIdentity?.targetSchema !== null
    || candidate.systemIdentity?.migrationId !== null
    || candidate.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || candidate.projectReleaseGovernanceContext?.targetSchema !== 13
    || candidate.projectReleaseGovernanceContext?.migrationId !== null
    || candidate.projectReleaseGovernanceContext
      ?.contextOnlyNotInheritedProductIdentity !== true) {
    fail(
      "OBSERVATION_CANDIDATE_IDENTITY_MISMATCH",
      "candidate identity or governance context drifted"
    );
  }
  requireCanonicalIsoInstant(
    candidate.createdAt,
    "CANDIDATE_CREATED_AT_INVALID"
  );
  normalizeCandidateEvidence({
    createdAt: candidate.createdAt,
    buildOutputIdentities: candidate.buildOutputIdentities,
    browserObservation: candidate.browserObservation
  });
  if (!SHA256.test(candidate.observationDigest ?? "")
    || candidate.observationDigest
      !== computeVedicCivilTimeFactBrowserObservationCandidateDigest(candidate)) {
    fail(
      "OBSERVATION_CANDIDATE_DIGEST_MISMATCH",
      "observationDigest does not match the canonical candidate projection"
    );
  }
  if (!Array.isArray(candidate.artifactBindings)
    || candidate.artifactBindingCount !== 25
    || candidate.artifactBindings.length !== 25) {
    fail(
      "OBSERVATION_CANDIDATE_ARTIFACT_COUNT_MISMATCH",
      "candidate must bind exactly 25 source, governance, and verifier artifacts"
    );
  }
  const bindingPaths = new Set();
  for (const binding of candidate.artifactBindings) {
    requireExactRecord(
      binding,
      ["bytes", "path", "rawHashAndUtf8DecodeUseSameBuffer", "sha256"],
      "OBSERVATION_CANDIDATE_ARTIFACT_BINDING_INVALID"
    );
    if (typeof binding.path !== "string"
      || binding.path === RESTRICTED_APPS_WEB_SOURCE
      || binding.path === VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE
      || bindingPaths.has(binding.path)
      || !Number.isSafeInteger(binding.bytes)
      || binding.bytes < 1
      || !SHA256.test(binding.sha256 ?? "")
      || binding.rawHashAndUtf8DecodeUseSameBuffer !== true) {
      fail(
        "OBSERVATION_CANDIDATE_ARTIFACT_BINDING_INVALID",
        "artifact binding path or identity is invalid"
      );
    }
    bindingPaths.add(binding.path);
  }
  if (candidate.staticBoundaryObservation?.productionReachabilityAudit
      ?.restrictedPathIntentionallySkipped !== RESTRICTED_APPS_WEB_SOURCE
    || candidate.staticBoundaryObservation?.productionReachabilityAudit
      ?.appsWebReverseReferenceCount !== 0
    || candidate.staticBoundaryObservation?.productionReachabilityAudit
      ?.incompleteProductionReachabilityAudit !== true
    || candidate.staticBoundaryObservation?.productionReachabilityAudit
      ?.wholeRepositoryProductionUnreachableEstablished !== false
    || candidate.staticBoundaryObservation
      ?.sameBufferByteLengthSha256AndStrictUtf8Verified !== true
    || candidate.staticBoundaryObservation
      ?.workerOnlyTzdbReachabilityEstablished !== true
    || candidate.staticBoundaryObservation?.lockedBuildInputCount !== 17
    || candidate.staticBoundaryObservation?.emittedNoticeCount !== 3
    || candidate.staticBoundaryObservation?.buildManifestFileName
      !== "hakimi-vedic-fact-only-build-manifest.v1.json"
    || candidate.staticBoundaryObservation?.finalBuildEnvelopeFileCount !== 12
    || candidate.staticBoundaryObservation
      ?.manifestEnumeratedOutputFileCount !== 11
    || candidate.staticBoundaryObservation
      ?.previewRevalidatesManifestAndExactEnvelope !== true
    || candidate.staticBoundaryObservation
      ?.concurrentSameAccountPathReplacementExcluded !== true
    || candidate.staticBoundaryObservation
      ?.concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded
        !== true
    || candidate.staticBoundaryObservation
      ?.osLevelAdversarialReplacementExcluded !== false
    || candidate.staticBoundaryObservation
      ?.authoredSourceForbiddenCapabilityReferenceCount !== 0) {
    fail(
      "OBSERVATION_CANDIDATE_STATIC_BOUNDARY_MISMATCH",
      "static, build, or incomplete reachability boundary drifted"
    );
  }
  if (!Array.isArray(candidate.evidenceAccounts)
    || candidate.evidenceAccounts.length !== 7
    || candidate.gateSummary?.evidenceAccountCount !== 7
    || candidate.gateSummary?.bindingRequired !== 38
    || candidate.gateSummary?.bindingFrozenVerified !== 0
    || candidate.gateSummary?.independentExpertsRequired !== 2
    || candidate.gateSummary?.independentExpertReviewsVerified !== 0
    || candidate.gateSummary?.admissionGatesRequired !== 8
    || candidate.gateSummary?.admissionGatesSatisfied !== 0
    || candidate.gateSummary?.rereviewRequirementsRequired !== 7
    || candidate.gateSummary?.rereviewRequirementsComplete !== 3
    || candidate.gateSummary?.requirementsUniverseClosed !== false
    || candidate.gateSummary?.sourceBindingEstablished !== false
    || candidate.gateSummary?.rightsLegalConclusionEstablished !== false
    || candidate.gateSummary?.contentTruthEstablished !== false
    || candidate.gateSummary?.expertTruthEstablished !== false
    || candidate.gateSummary?.releaseReady !== false
    || candidate.gateSummary?.publicReleaseAuthorized !== false) {
    fail(
      "OBSERVATION_CANDIDATE_GATE_ESCALATION",
      "seven-account or productization gates drifted"
    );
  }
  if (FALSE_AUTHORITY_KEYS.some((key) =>
    candidate.authorityBoundary?.[key] !== false)
    || Object.keys(candidate.authorityBoundary ?? {}).length
      !== FALSE_AUTHORITY_KEYS.length) {
    fail(
      "OBSERVATION_CANDIDATE_AUTHORITY_ESCALATION",
      "all authority fields must remain false"
    );
  }
  if (candidate.dataHandling?.personDerivedData !== true
    || candidate.dataHandling?.candidateDigestIsAnonymous !== false
    || candidate.dataHandling?.realPersonDataUsedInRecordedObservation !== false
    || candidate.dataHandling?.loggingAuthorized !== false
    || candidate.dataHandling?.persistenceAuthorized !== false
    || candidate.dataHandling?.networkTransmissionAuthorized !== false
    || candidate.dataHandling?.publicationAuthorized !== false
    || candidate.dataHandling?.noLogNoPersistNoPublishBoundary !== true
    || candidate.observationBoundary?.mutationEpochClaimed !== false
    || candidate.observationBoundary?.mutationEpochReceipt !== null
    || candidate.observationBoundary?.crossFileAtomicSnapshot !== false
    || candidate.observationBoundary?.intervalMutationExcluded !== false
    || candidate.observationBoundary?.abaExcluded !== false
    || candidate.observationBoundary
      ?.osLevelAdversarialReplacementExcluded !== false) {
    fail(
      "OBSERVATION_CANDIDATE_PRIVACY_OR_EPOCH_ESCALATION",
      "data handling or mutation-epoch boundary drifted"
    );
  }
  if (candidate.scopeBoundary?.civilTimeEngineeringFactsOnly !== true
    || candidate.scopeBoundary?.astronomyIncluded !== undefined
    || candidate.scopeBoundary
      ?.localWallTimeOverlapGapHandlingIncluded !== true
    || candidate.scopeBoundary
      ?.daylightSavingClassificationEstablished !== false
    || candidate.scopeBoundary?.ut1Included !== false
    || candidate.scopeBoundary?.ttIncluded !== false
    || candidate.scopeBoundary?.tdbIncluded !== false
    || candidate.scopeBoundary?.eopIncluded !== false
    || candidate.scopeBoundary?.ramcIncluded !== false
    || candidate.scopeBoundary?.ephemerisIncluded !== false
    || candidate.scopeBoundary?.chartIncluded !== false
    || candidate.scopeBoundary?.housesIncluded !== false
    || candidate.scopeBoundary?.aspectsIncluded !== false
    || candidate.scopeBoundary?.interpretationIncluded !== false
    || candidate.scopeBoundary?.rulesIncluded !== false) {
    fail(
      "OBSERVATION_CANDIDATE_SCOPE_ESCALATION",
      "candidate escaped the civil-time fact-only scope"
    );
  }
}

function buildCandidateArtifactBindings(root, staticObservation, formalContext) {
  const cache = new Map();
  const identities = new Map();
  for (const identity of staticObservation.runtimeSourceIdentities) {
    identities.set(identity.path, { ...identity });
  }
  for (const identity of formalContext.bindings) {
    identities.set(identity.path, { ...identity });
  }
  for (const relativePath of VERIFIER_FILES) {
    const identity = publicArtifactIdentity(
      readWorkspaceArtifact(root, relativePath, cache)
    );
    identities.set(relativePath, identity);
  }
  const result = [...identities.values()]
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (result.length !== 25) {
    fail(
      "OBSERVATION_CANDIDATE_ARTIFACT_COUNT_MISMATCH",
      "expected 25 unique source, governance, and verifier artifacts"
    );
  }
  return deepFreeze(result);
}

function verifyFormalContextBoundary(root) {
  const cache = new Map();
  const parsed = new Map();
  const bindings = [];
  for (const relativePath of FORMAL_CONTEXT_FILES) {
    const artifact = readWorkspaceArtifact(root, relativePath, cache);
    bindings.push(publicArtifactIdentity(artifact));
    parsed.set(
      relativePath,
      parseStrictJsonText(artifact.text, relativePath)
    );
  }
  for (const relativePath of [
    FORMAL_CONTEXT_FILES[1],
    FORMAL_CONTEXT_FILES[3],
    FORMAL_CONTEXT_FILES[5],
    FORMAL_CONTEXT_FILES[6]
  ]) {
    const authority = parsed.get(relativePath)?.authorityBoundary;
    if (!authority || typeof authority !== "object"
      || Array.isArray(authority)
      || Object.values(authority).length === 0
      || Object.values(authority).some((value) => value !== false)) {
      fail(
        "FORMAL_CONTEXT_AUTHORITY_NOT_ALL_FALSE",
        relativePath
      );
    }
  }
  const parent = parsed.get(FORMAL_CONTEXT_FILES[6]);
  const gate = parent?.gateSummary;
  if (gate?.bindingRequired !== 38
    || gate.bindingFrozenVerified !== 0
    || gate.independentExpertsRequired !== 2
    || gate.independentExpertReviewsVerified !== 0
    || gate.admissionGatesRequired !== 8
    || gate.admissionGatesSatisfied !== 0
    || gate.rereviewRequirementsRequired !== 7
    || gate.rereviewRequirementsComplete !== 3
    || gate.requirementsUniverseClosed !== false
    || gate.releaseReady !== false
    || gate.publicReleaseAuthorized !== false) {
    fail(
      "FORMAL_CONTEXT_GATE_DRIFT",
      FORMAL_CONTEXT_FILES[6]
    );
  }
  return deepFreeze({
    bindings: bindings.sort((left, right) =>
      left.path.localeCompare(right.path, "en"))
  });
}

function verifyDraftRuntimeInventory(root) {
  const sourceDirectory = resolveWorkspacePath(root, DRAFT_PREFIX + "src");
  const observed = readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) =>
      entry.isFile()
      && entry.name.endsWith(".ts")
      && !entry.name.endsWith(".test.ts"))
    .map((entry) => DRAFT_PREFIX + "src/" + entry.name)
    .sort();
  assertStringArrayEqual(
    observed,
    EXPECTED_DRAFT_RUNTIME_SOURCE_FILES,
    "DRAFT_RUNTIME_INVENTORY_MISMATCH",
    DRAFT_PREFIX + "src"
  );
}

function verifyRuntimeImportSpecifier(importer, specifier) {
  if (specifier.startsWith("node:")) {
    fail(
      "NODE_RUNTIME_IMPORT_FORBIDDEN",
      importer + " imports " + specifier
    );
  }
  const normalized = normalizeSlashes(specifier);
  for (const { label, pattern } of FORBIDDEN_IMPORT_PATTERNS) {
    if (pattern.test(normalized)) {
      fail(
        "FORBIDDEN_RUNTIME_IMPORT",
        importer + " imports " + label
      );
    }
  }
}

function verifyForbiddenRuntimeCapabilities(parsedModules) {
  for (const [relativePath, ast] of parsedModules) {
    walkAst(ast, (node, ancestors) => {
      if (node.type === "Identifier"
        && FORBIDDEN_IDENTIFIERS.has(node.name)
        && isRelevantIdentifier(node, ancestors)) {
        fail(
          "FORBIDDEN_RUNTIME_CAPABILITY",
          relativePath + " references " + node.name
        );
      }
      if (node.type === "MemberExpression"
        || node.type === "OptionalMemberExpression") {
        const propertyName = staticMemberName(node);
        if (propertyName && FORBIDDEN_MEMBER_PROPERTIES.has(propertyName)) {
          fail(
            "FORBIDDEN_RUNTIME_CAPABILITY",
            relativePath + " references " + propertyName
          );
        }
      }
      if ((node.type === "CallExpression"
          || node.type === "OptionalCallExpression")
        && node.callee?.type === "Identifier"
        && FORBIDDEN_CALL_NAMES.has(node.callee.name)) {
        fail(
          "FORBIDDEN_RUNTIME_CAPABILITY",
          relativePath + " references " + node.callee.name
        );
      }
    });
  }
}

function isRelevantIdentifier(node, ancestors) {
  const parent = ancestors.at(-1);
  if (!parent) return true;
  if ((parent.type === "ObjectProperty"
      || parent.type === "ObjectMethod"
      || parent.type === "ClassMethod"
      || parent.type === "ClassProperty")
    && parent.key === node && !parent.computed) return false;
  if ((parent.type === "MemberExpression"
      || parent.type === "OptionalMemberExpression")
    && parent.property === node && !parent.computed) return false;
  if (parent.type === "ImportSpecifier"
    || parent.type === "ImportDefaultSpecifier"
    || parent.type === "ImportNamespaceSpecifier"
    || parent.type === "ExportSpecifier") return false;
  if (parent.type === "TSPropertySignature"
    && parent.key === node && !parent.computed) return false;
  return true;
}

function verifyWorkerBoundary(root, parsedModules, cache) {
  const workerConstructions = [];
  for (const [relativePath, ast] of parsedModules) {
    walkAst(ast, (node, ancestors) => {
      if (node.type === "NewExpression"
        && node.callee?.type === "Identifier"
        && node.callee.name === "Worker") {
        workerConstructions.push({
          relativePath,
          node,
          ancestors: [...ancestors]
        });
      }
    });
  }
  if (workerConstructions.length !== 1) {
    fail(
      "WORKER_BOUNDARY_INVALID",
      "expected one Worker construction, observed "
        + workerConstructions.length
    );
  }
  const construction = workerConstructions[0];
  if (construction.relativePath !== CLIENT_MODULE) {
    fail(
      "WORKER_BOUNDARY_INVALID",
      "Worker construction escaped civil-client.ts"
    );
  }
  const [workerUrl, workerOptions] = construction.node.arguments;
  if (!isStaticFreshWorkerUrl(workerUrl, "./civil-worker.ts")) {
    fail(
      "WORKER_BOUNDARY_INVALID",
      "Worker URL must be a static fresh civil-worker URL"
    );
  }
  if (workerOptions?.type !== "ObjectExpression"
    || readSingleStaticObjectProperty(workerOptions, "type")?.value
      !== "module") {
    fail(
      "WORKER_BOUNDARY_INVALID",
      "Worker options must statically require type=module"
    );
  }
  const containingFunction = construction.ancestors
    .slice()
    .reverse()
    .find((node) =>
      node.type === "FunctionDeclaration"
      || node.type === "FunctionExpression"
      || node.type === "ArrowFunctionExpression");
  if (containingFunction?.type !== "FunctionDeclaration"
    || containingFunction.id?.name !== "runVedicCivilFactWorker") {
    fail(
      "WORKER_BOUNDARY_INVALID",
      "Worker must be freshly constructed inside runVedicCivilFactWorker"
    );
  }
  const clientSource = readWorkspaceArtifact(root, CLIENT_MODULE, cache).text;
  const workerSource =
    readWorkspaceArtifact(root, CIVIL_WORKER_MODULE, cache).text;
  if (countMatches(clientSource, /\bworker\.terminate\s*\(/gu) !== 1
    || countMatches(workerSource, /\bworkerScope\.close\s*\(/gu) !== 1
    || countMatches(
      workerSource,
      /\bworkerScope\.addEventListener\s*\(\s*["']message["']/gu
    ) !== 1) {
    fail(
      "WORKER_LIFECYCLE_INVALID",
      "worker termination, one message listener, and close are required"
    );
  }
  return {
    constructorCount: 1,
    staticUrl: "./civil-worker.ts",
    moduleType: "module",
    freshPerRequestStaticallyRequired: true,
    clientTerminationStaticallyRequired: true,
    workerCloseStaticallyRequired: true,
    workerOnlyTzdbReachabilityEstablished: true
  };
}

function verifyMainThreadBoundary(observedGraph) {
  const mainReachable = collectReachableModules(MAIN_MODULE, observedGraph);
  const clientReachable = collectReachableModules(CLIENT_MODULE, observedGraph);
  const workerReachable =
    collectReachableModules(CIVIL_WORKER_MODULE, observedGraph);
  const forbiddenMain = [...new Set([...mainReachable, ...clientReachable])]
    .filter((relativePath) =>
      relativePath === CIVIL_WORKER_MODULE
      || relativePath === CIVIL_TIME_MODULE
      || relativePath === TZDB_INDEX_MODULE
      || relativePath === TZDB_RESOLVER_MODULE
      || relativePath === TZDB_2025B_MODULE);
  if (forbiddenMain.length > 0) {
    fail(
      "MAIN_THREAD_RUNTIME_BOUNDARY_INVALID",
      "main/client reaches " + forbiddenMain[0]
    );
  }
  for (const required of [
    CIVIL_TIME_MODULE,
    TZDB_INDEX_MODULE,
    TZDB_RESOLVER_MODULE,
    TZDB_2025B_MODULE
  ]) {
    if (!workerReachable.has(required)) {
      fail(
        "WORKER_TZDB_REACHABILITY_INVALID",
        "worker does not reach " + required
      );
    }
  }
  return {
    mainEntry: MAIN_MODULE,
    clientEntry: CLIENT_MODULE,
    mainReachableRuntimeModules: [...mainReachable].sort(),
    clientReachableRuntimeModules: [...clientReachable].sort(),
    civilTimeRuntimeImportObservedOnMainOrClient: false,
    tzdbRuntimeImportObservedOnMainOrClient: false,
    workerOnlyTzdbReachabilityEstablished: true
  };
}

function collectReachableModules(entry, graph) {
  const reachable = new Set();
  const pending = [entry];
  while (pending.length > 0) {
    const current = pending.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const specifier of graph[current] ?? []) {
      const resolved = resolveRelativeModule(current, specifier);
      if (resolved && Object.hasOwn(graph, resolved)) pending.push(resolved);
    }
  }
  return reachable;
}

function verifyProducerImporters(root, cache) {
  const importers = [];
  for (const relativePath of listDraftModuleFiles(root)) {
    const ast = parseModule(
      readWorkspaceArtifact(root, relativePath, cache).text,
      relativePath
    );
    const references = collectAllModuleSpecifiers(ast, relativePath);
    if (references.some((specifier) =>
      resolveRelativeModule(relativePath, specifier) === PRODUCER_MODULE)) {
      importers.push(relativePath);
    }
  }
  importers.sort();
  assertStringArrayEqual(
    importers,
    EXPECTED_PRODUCER_IMPORTERS,
    "PRODUCER_IMPORTER_BOUNDARY_INVALID",
    PRODUCER_MODULE
  );
  const productionImporters = importers.filter((relativePath) =>
    !relativePath.endsWith(".test.ts"));
  if (productionImporters.length !== 1
    || productionImporters[0] !== CIVIL_WORKER_MODULE) {
    fail(
      "PRODUCER_IMPORTER_BOUNDARY_INVALID",
      "producer builder may be imported only by civil-worker and tests"
    );
  }
  return {
    module: PRODUCER_MODULE,
    importers,
    productionImporter: CIVIL_WORKER_MODULE,
    nonWorkerProductionImporterCount: 0
  };
}

function verifyViteBuildBoundary(root, cache) {
  const source = readWorkspaceArtifact(root, VITE_CONFIG, cache).text;
  const ast = parseModule(source, VITE_CONFIG);
  const exportedObject = findDefaultExportObject(ast);
  const buildObject = readSingleStaticObjectProperty(exportedObject, "build");
  const workerObject = readSingleStaticObjectProperty(exportedObject, "worker");
  if (buildObject?.type !== "ObjectExpression"
    || readSingleStaticObjectProperty(buildObject, "emptyOutDir")?.value
      !== false) {
    fail(
      "VITE_BUILD_BOUNDARY_INVALID",
      "build.emptyOutDir must be statically false"
    );
  }
  if (workerObject?.type !== "ObjectExpression"
    || readSingleStaticObjectProperty(workerObject, "format")?.value
      !== "es") {
    fail(
      "VITE_WORKER_FORMAT_INVALID",
      "worker.format must be statically es"
    );
  }
  const requiredMarkers = [
    "const requestedOutDir = process.env.HAKIMI_VEDIC_FACT_ONLY_OUT_DIR;",
    "if (!requestedOutDir)",
    "const outDir = path.resolve(requestedOutDir);",
    "const temporaryRoot = realpathSync(os.tmpdir());",
    "isStrictDescendant(temporaryRoot, initialRealOutDir)",
    "/^hakimi-vedic-facts-[a-f0-9]{32}$/u.test(leaf)",
    "const initialOutDirStat = lstatSync(outDir);",
    "const initialRealOutDir = realpathSync(outDir);",
    "function assertSameOutputDirectory({ requireEmpty })",
    "assertSameOutputDirectory({ requireEmpty: true });",
    "assertSameOutputDirectory({ requireEmpty: false });",
    "currentStat.dev !== initialOutDirStat.dev",
    "currentStat.ino !== initialOutDirStat.ino",
    "const buildManifestName = \"hakimi-vedic-fact-only-build-manifest.v1.json\";",
    "recordType: \"hakimi_vedic_fact_only_temp_build_manifest_v1\"",
    "generatedBy: \"hakimi-vedic-fact-only-output-envelope/1\"",
    "concurrentSameAccountPathReplacementExcluded: true",
    "concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded: true",
    "const loadedConfigSha256 = sha256(readFileSync(configPath));",
    "function assertLoadedConfigUnchanged()",
    "notDigitalSignature: true",
    "writeFileSync(buildManifestPath",
    "{ flag: \"wx\" }",
    "if (isPreview) verifyCompletedBuildEnvelope();",
    "allPaths.length !== records.length + 1",
    "const bytes = readFileSync(input.path);",
    "createHash(\"sha256\").update(bytes).digest(\"hex\")",
    "bytes.byteLength !== input.bytes",
    "return Buffer.from(bytes);"
  ];
  for (const marker of requiredMarkers) {
    if (!source.includes(marker)) {
      fail(
        "VITE_BUILD_BOUNDARY_INVALID",
        "missing static build marker " + marker
      );
    }
  }
  if (countMatches(source, /\bemptyOutDir\s*:/gu) !== 1
    || countMatches(source, /\bworker\s*:\s*\{/gu) !== 1
    || countMatches(source, /HAKIMI_VEDIC_FACT_ONLY_OUT_DIR/gu) < 3
    || countMatches(source, /readFileSync\(input\.path\)/gu) !== 1
    || countMatches(
      source,
      /assertSameOutputDirectory\(\{ requireEmpty: false \}\);/gu
    ) !== 2
    || countMatches(source, /verifyCompletedBuildEnvelope\(\);/gu) !== 2) {
    fail(
      "VITE_BUILD_BOUNDARY_INVALID",
      "build boundary or same-buffer lock verification is ambiguous"
    );
  }
  const lockedInputs =
    extractLockedBuildInputs(ast, "LOCKED_BUILD_INPUTS");
  if (canonicalCompact(lockedInputs)
    !== canonicalCompact(EXPECTED_LOCKED_BUILD_INPUTS)) {
    fail(
      "VITE_LOCKED_INPUT_SET_INVALID",
      "the exact 17 locked build inputs drifted"
    );
  }
  const noticeNames = [...source.matchAll(
    /\bfileName\s*:\s*["'](licenses\/[^"']+)["']/gu
  )].map((match) => match[1]).sort();
  assertStringArrayEqual(
    noticeNames,
    EXPECTED_NOTICE_OUTPUTS.map((entry) => entry.path),
    "VITE_NOTICE_OUTPUT_SET_INVALID",
    VITE_CONFIG
  );
  if (countMatches(
    source,
    /connect-src\s+'none'.*form-action\s+'none'/gu
  ) !== 2) {
    fail(
      "VITE_CSP_HEADER_INVALID",
      "server and preview CSP must both deny connect and form action"
    );
  }
  return {
    viteVersionRequired: "7.3.6",
    workerFormat: "es",
    emptyOutDir: false,
    explicitTemporaryOutDirRequired: true,
    defaultOutDirAvailable: false,
    temporaryOutDirRequiresOsTempStrictDescendant: true,
    temporaryOutDirLeafPattern: "hakimi-vedic-facts-[a-f0-9]{32}",
    outputDirectoryIdentityRevalidatedAtBuildStartAndCloseBundle: true,
    buildManifestFileName:
      "hakimi-vedic-fact-only-build-manifest.v1.json",
    manifestEnumeratedOutputFileCount: 11,
    finalBuildEnvelopeFileCount: 12,
    manifestCanonicalJsonRequired: true,
    manifestConfigSha256Required: true,
    manifestExactOutputAllowlistRequired: true,
    manifestLicenseDigestsRequired: true,
    previewRevalidatesManifestAndExactEnvelope: true,
    concurrentSameAccountPathReplacementExcluded: true,
    concurrentSameAccountConfigReplacementDuringLoaderWindowExcluded: true,
    osLevelAdversarialReplacementExcluded: false,
    lockedBuildInputCount: lockedInputs.length,
    lockedBuildInputs: lockedInputs,
    lockedInputSameBufferBytesAndSha256Verified: true,
    emittedNoticeCount: noticeNames.length,
    emittedNotices: noticeNames
  };
}

function extractLockedBuildInputs(ast, variableName) {
  const declarations = [];
  walkAst(ast, (node) => {
    if (node.type === "VariableDeclarator"
      && node.id?.type === "Identifier"
      && node.id.name === variableName) declarations.push(node);
  });
  if (declarations.length !== 1) {
    fail(
      "VITE_LOCKED_INPUT_SET_INVALID",
      variableName + " must have one declaration"
    );
  }
  const array = unwrapObjectFreeze(declarations[0].init);
  if (array?.type !== "ArrayExpression") {
    fail(
      "VITE_LOCKED_INPUT_SET_INVALID",
      variableName + " must be a frozen array literal"
    );
  }
  return array.elements.map((element) => {
    const object = unwrapObjectFreeze(element);
    if (object?.type !== "ObjectExpression") {
      fail(
        "VITE_LOCKED_INPUT_SET_INVALID",
        "each locked input must be a frozen object literal"
      );
    }
    const pathValue = readSingleStaticObjectProperty(object, "path");
    const bytesValue = readSingleStaticObjectProperty(object, "bytes");
    const shaValue = readSingleStaticObjectProperty(object, "sha256");
    if (pathValue?.type !== "Identifier"
      || bytesValue?.type !== "NumericLiteral"
      || shaValue?.type !== "StringLiteral"
      || !Number.isSafeInteger(bytesValue.value)
      || bytesValue.value < 1
      || !SHA256.test(shaValue.value)) {
      fail(
        "VITE_LOCKED_INPUT_SET_INVALID",
        "locked input literal shape is invalid"
      );
    }
    return {
      pathIdentifier: pathValue.name,
      bytes: bytesValue.value,
      sha256: shaValue.value
    };
  });
}

function unwrapObjectFreeze(node) {
  if (node?.type !== "CallExpression"
    || node.arguments.length !== 1
    || node.callee?.type !== "MemberExpression"
    || node.callee.computed
    || node.callee.object?.type !== "Identifier"
    || node.callee.object.name !== "Object"
    || node.callee.property?.type !== "Identifier"
    || node.callee.property.name !== "freeze") return undefined;
  return node.arguments[0];
}

function verifyHtmlBoundary(root, cache) {
  const html = readWorkspaceArtifact(root, HTML_ENTRY, cache).text;
  const withoutComments = html.replace(/<!--[\s\S]*?-->/gu, "");
  const cspMetaTags = [...withoutComments.matchAll(/<meta\b[^>]*>/giu)]
    .map((match) => match[0])
    .filter((tag) =>
      readHtmlAttribute(tag, "http-equiv")?.toLowerCase()
        === "content-security-policy");
  const csp = cspMetaTags.length === 1
    ? readHtmlAttribute(cspMetaTags[0], "content")
    : undefined;
  if (!csp
    || !/(?:^|;)\s*connect-src\s+'none'\s*(?:;|$)/iu.test(csp)
    || !/(?:^|;)\s*form-action\s+'none'\s*(?:;|$)/iu.test(csp)) {
    fail(
      "HTML_CSP_BOUNDARY_INVALID",
      "HTML CSP must include connect-src and form-action none"
    );
  }
  const controls = [
    ...withoutComments.matchAll(
      /<(?:button|fieldset|form|input|output|select|textarea)\b[^>]*>/giu
    )
  ].map((match) => match[0]);
  if (controls.some((tag) => /\sname(?:\s*=|\s|\/?\s*>)/iu.test(tag))) {
    fail(
      "HTML_NAME_ATTRIBUTE_FORBIDDEN",
      "HTML controls must not declare name attributes"
    );
  }
  if (/<form\b[^>]*\baction\s*=/iu.test(withoutComments)
    || /<base\b/iu.test(withoutComments)) {
    fail(
      "HTML_FORM_BOUNDARY_INVALID",
      "form action and base elements are forbidden"
    );
  }
  const buttons = [
    ...withoutComments.matchAll(/<button\b[^>]*>/giu)
  ].map((match) => match[0]);
  if (buttons.length !== 2
    || buttons.some((tag) =>
      readHtmlAttribute(tag, "type")?.toLowerCase() !== "button")) {
    fail(
      "HTML_BUTTON_BOUNDARY_INVALID",
      "both buttons must explicitly use type=button"
    );
  }
  const moduleScripts = [
    ...withoutComments.matchAll(
      /<script\b[^>]*\btype\s*=\s*["']module["'][^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/giu
    )
  ].map((match) => match[1]);
  assertStringArrayEqual(
    moduleScripts,
    ["../src/main.ts"],
    "HTML_ENTRY_BOUNDARY_INVALID",
    HTML_ENTRY
  );
  if (/\b(?:https?:)?\/\//iu.test(withoutComments)) {
    fail(
      "HTML_EXTERNAL_RESOURCE_FORBIDDEN",
      "HTML must not reference external network resources"
    );
  }
  return {
    cspConnectSrcNone: true,
    cspFormActionNone: true,
    formAssociatedNameAttributeCount: 0,
    formActionAttributeCount: 0,
    buttonCount: 2,
    allButtonTypes: "button",
    moduleEntry: "../src/main.ts"
  };
}

function scanAppsWebReverseReferences(root) {
  const appsWebRoot = resolveWorkspacePath(root, "apps/web");
  const stat = lstatSync(appsWebRoot, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
    fail("APPS_WEB_SCAN_ROOT_INVALID", "apps/web must be a real directory");
  }
  const scannedFiles = [];
  const references = [];
  const excludedDirectories = [];
  walk("apps/web");
  if (references.length > 0) {
    fail(
      "PRODUCTION_REVERSE_REFERENCE_OBSERVED",
      references[0] + " references the isolated Vedic fact-only draft"
    );
  }
  return {
    appsWebReadableSourceFilesScanned: scannedFiles.length,
    appsWebReverseReferenceCount: 0,
    excludedGeneratedOrDependencyDirectories:
      [...new Set(excludedDirectories)].sort(),
    explicitlySkippedRestrictedPaths: [RESTRICTED_APPS_WEB_SOURCE],
    restrictedPathIntentionallySkipped: RESTRICTED_APPS_WEB_SOURCE,
    incompleteProductionReachabilityAudit: true,
    wholeRepositoryProductionUnreachableEstablished: false
  };

  function walk(directoryRelativePath) {
    const directory = resolveWorkspacePath(root, directoryRelativePath);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath =
        normalizeSlashes(directoryRelativePath + "/" + entry.name);
      if (relativePath === RESTRICTED_APPS_WEB_SOURCE) continue;
      if (entry.isSymbolicLink()) {
        fail("APPS_WEB_SCAN_SYMLINK_FORBIDDEN", relativePath);
      }
      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
          excludedDirectories.push(relativePath);
        } else {
          walk(relativePath);
        }
        continue;
      }
      if (!entry.isFile()
        || !APPS_WEB_SOURCE_EXTENSIONS.has(
          path.extname(entry.name).toLowerCase()
        )) continue;
      const source =
        readWorkspaceArtifact(root, relativePath, new Map()).text;
      scannedFiles.push(relativePath);
      if (source.includes("vedic-civil-time-fact-browser-draft")
        || source.includes(
          "@hakimi/vedic-civil-time-fact-browser-draft"
        )) references.push(relativePath);
    }
  }
}

function listDraftModuleFiles(root) {
  const result = [];
  walk(VEDIC_CIVIL_TIME_FACT_BROWSER_DRAFT);
  return result.sort();

  function walk(directoryRelativePath) {
    const directory = resolveWorkspacePath(root, directoryRelativePath);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath =
        normalizeSlashes(directoryRelativePath + "/" + entry.name);
      if (entry.isSymbolicLink()) fail("DRAFT_SYMLINK_FORBIDDEN", relativePath);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORY_NAMES.has(entry.name)) walk(relativePath);
      } else if (entry.isFile()
        && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name)) {
        result.push(relativePath);
      }
    }
  }
}

function parseModule(source, relativePath) {
  try {
    return parse(source, {
      sourceType: "module",
      allowAwaitOutsideFunction: false,
      errorRecovery: false,
      plugins: ["typescript", "jsx", "importAttributes"]
    });
  } catch (cause) {
    fail(
      "MODULE_PARSE_FAILED",
      relativePath + ": "
        + (cause instanceof Error ? cause.message : "unknown parse error"),
      cause
    );
  }
}

function collectRuntimeModuleSpecifiers(ast, relativePath) {
  const specifiers = new Set();
  walkAst(ast, (node) => {
    if (node.type === "ImportDeclaration") {
      if (isRuntimeImportDeclaration(node)) {
        specifiers.add(requireStringLiteralSource(node.source, relativePath));
      }
      return;
    }
    if (node.type === "ExportAllDeclaration"
      || node.type === "ExportNamedDeclaration") {
      if (node.source && isRuntimeExportDeclaration(node)) {
        specifiers.add(requireStringLiteralSource(node.source, relativePath));
      }
      return;
    }
    if (node.type === "ImportExpression") {
      specifiers.add(requireStaticDynamicImport(node.source, relativePath));
      return;
    }
    if (node.type === "CallExpression"
      && node.callee?.type === "Import") {
      if (node.arguments.length !== 1) {
        fail("DYNAMIC_IMPORT_NOT_STATIC", relativePath);
      }
      specifiers.add(
        requireStaticDynamicImport(node.arguments[0], relativePath)
      );
    }
  });
  return [...specifiers].sort();
}

function collectAllModuleSpecifiers(ast, relativePath) {
  const specifiers = new Set();
  walkAst(ast, (node) => {
    if (node.type === "ImportDeclaration"
      || node.type === "ExportAllDeclaration"
      || node.type === "ExportNamedDeclaration") {
      if (node.source) {
        specifiers.add(requireStringLiteralSource(node.source, relativePath));
      }
    } else if (node.type === "ImportExpression") {
      specifiers.add(requireStaticDynamicImport(node.source, relativePath));
    } else if (node.type === "CallExpression"
      && node.callee?.type === "Import") {
      if (node.arguments.length !== 1) {
        fail("DYNAMIC_IMPORT_NOT_STATIC", relativePath);
      }
      specifiers.add(
        requireStaticDynamicImport(node.arguments[0], relativePath)
      );
    }
  });
  return [...specifiers].sort();
}

function isRuntimeImportDeclaration(node) {
  if (node.importKind === "type" || node.importKind === "typeof") return false;
  if (node.specifiers.length === 0) return true;
  return node.specifiers.some((specifier) =>
    specifier.type !== "ImportSpecifier"
    || (specifier.importKind !== "type"
      && specifier.importKind !== "typeof"));
}

function isRuntimeExportDeclaration(node) {
  if (node.exportKind === "type") return false;
  if (node.type === "ExportAllDeclaration"
    || node.specifiers.length === 0) return true;
  return node.specifiers.some((specifier) =>
    specifier.exportKind !== "type");
}

function requireStringLiteralSource(node, relativePath) {
  if (node?.type !== "StringLiteral") {
    fail("MODULE_SPECIFIER_NOT_STATIC", relativePath);
  }
  return node.value;
}

function requireStaticDynamicImport(node, relativePath) {
  if (node?.type !== "StringLiteral") {
    fail("DYNAMIC_IMPORT_NOT_STATIC", relativePath);
  }
  return node.value;
}

function findDefaultExportObject(ast) {
  const declarations = ast.program.body.filter((node) =>
    node.type === "ExportDefaultDeclaration");
  if (declarations.length !== 1) {
    fail(
      "VITE_CONFIG_EXPORT_INVALID",
      "vite config must have one default export"
    );
  }
  const declaration = declarations[0].declaration;
  if (declaration?.type === "ObjectExpression") return declaration;
  if (declaration?.type === "ArrowFunctionExpression"
    && declaration.body?.type === "BlockStatement") {
    const returns = declaration.body.body.filter((node) =>
      node.type === "ReturnStatement");
    if (returns.length === 1
      && returns[0].argument?.type === "ObjectExpression") {
      return returns[0].argument;
    }
  }
  fail(
    "VITE_CONFIG_EXPORT_INVALID",
    "vite config must return one static object literal"
  );
}

function readSingleStaticObjectProperty(objectExpression, propertyName) {
  if (objectExpression?.type !== "ObjectExpression") return undefined;
  const properties = objectExpression.properties.filter((property) =>
    property.type === "ObjectProperty"
    && !property.computed
    && staticPropertyKey(property.key) === propertyName);
  if (properties.length !== 1) return undefined;
  return properties[0].value;
}

function staticPropertyKey(key) {
  if (key?.type === "Identifier") return key.name;
  if (key?.type === "StringLiteral") return key.value;
  return undefined;
}

function isStaticFreshWorkerUrl(node, expectedPath) {
  if (node?.type !== "NewExpression"
    || node.callee?.type !== "Identifier"
    || node.callee.name !== "URL"
    || node.arguments.length !== 2) return false;
  const [urlPath, base] = node.arguments;
  return urlPath?.type === "StringLiteral"
    && urlPath.value === expectedPath
    && base?.type === "MemberExpression"
    && base.computed === false
    && base.property?.type === "Identifier"
    && base.property.name === "url"
    && base.object?.type === "MetaProperty"
    && base.object.meta?.name === "import"
    && base.object.property?.name === "meta";
}

function staticMemberName(node) {
  if (!node.computed && node.property?.type === "Identifier") {
    return node.property.name;
  }
  if (node.computed && node.property?.type === "StringLiteral") {
    return node.property.value;
  }
  return undefined;
}

function readHtmlAttribute(tag, attributeName) {
  const escapedName =
    attributeName.replace(/[.*+?^$\{\}()|[\]\\]/gu, "\\$&");
  const match = tag.match(new RegExp(
    "\\b" + escapedName
      + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))",
    "iu"
  ));
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

function resolveRelativeModule(importer, specifier) {
  if (!specifier.startsWith(".")) return null;
  const withoutQuery = specifier.split(/[?#]/u, 1)[0];
  return normalizeSlashes(
    path.posix.normalize(
      path.posix.join(path.posix.dirname(importer), withoutQuery)
    )
  );
}

function walkAst(node, visitor, ancestors = []) {
  if (node === null || typeof node !== "object") return;
  if (typeof node.type === "string") visitor(node, ancestors);
  const nextAncestors =
    typeof node.type === "string" ? [...ancestors, node] : ancestors;
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end"
      || key === "extra") continue;
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visitor, nextAncestors);
    } else if (value && typeof value === "object") {
      walkAst(value, visitor, nextAncestors);
    }
  }
}

function requireWorkspaceRoot(workspaceRoot) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    fail("WORKSPACE_ROOT_INVALID", "workspaceRoot must be a non-empty string");
  }
  const root = path.resolve(workspaceRoot);
  const stat = lstatSync(root, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
    fail("WORKSPACE_ROOT_INVALID", "workspaceRoot must be a real directory");
  }
  return root;
}

function readWorkspaceArtifact(root, relativePath, cache) {
  const normalized = normalizeSlashes(relativePath);
  if (normalized === RESTRICTED_APPS_WEB_SOURCE) {
    fail("RESTRICTED_SOURCE_READ_FORBIDDEN", RESTRICTED_APPS_WEB_SOURCE);
  }
  if (cache.has(normalized)) return cache.get(normalized);
  const absolutePath = resolveWorkspacePath(root, normalized);
  const stat = lstatSync(absolutePath, { throwIfNoEntry: false });
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    fail("SOURCE_FILE_INVALID", normalized);
  }
  const bytes = readFileSync(absolutePath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const text = decodeStrictUtf8(bytes, normalized);
  const artifact = Object.freeze({
    path: normalized,
    bytes,
    byteLength: bytes.byteLength,
    sha256,
    text
  });
  cache.set(normalized, artifact);
  return artifact;
}

function decodeStrictUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("UTF8_INVALID", label, cause);
  }
}

function publicArtifactIdentity(artifact) {
  return Object.freeze({
    path: artifact.path,
    bytes: artifact.byteLength,
    sha256: artifact.sha256,
    rawHashAndUtf8DecodeUseSameBuffer: true
  });
}

function resolveWorkspacePath(root, relativePath) {
  const normalized = normalizeSlashes(relativePath);
  if (path.posix.isAbsolute(normalized)
    || normalized.length === 0
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.includes("/../")
    || normalized.includes("\0")) {
    fail("WORKSPACE_PATH_INVALID", String(relativePath));
  }
  const absolutePath = path.resolve(root, ...normalized.split("/"));
  const relative = path.relative(root, absolutePath);
  if (relative === ".."
    || relative.startsWith(".." + path.sep)
    || path.isAbsolute(relative)) {
    fail("WORKSPACE_PATH_ESCAPED", normalized);
  }
  return absolutePath;
}

function requireSafeOutputPath(value) {
  if (typeof value !== "string"
    || value.length === 0
    || value.length > 240
    || value.includes("\\")
    || path.posix.isAbsolute(value)
    || value === ".."
    || value.startsWith("../")
    || value.includes("/../")
    || value.includes("//")
    || value.includes("\0")) {
    fail("BUILD_ARTIFACT_PATH_INVALID", "unsafe output path");
  }
  return value;
}

function requireCanonicalIsoInstant(value, code) {
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    || Number.isNaN(Date.parse(value))
    || new Date(value).toISOString() !== value) {
    fail(code, "expected canonical UTC ISO instant");
  }
  return value;
}

function requireShortString(value, code, maximumLength) {
  if (typeof value !== "string"
    || value.length === 0
    || value.length > maximumLength
    || /[\u0000-\u001f\u007f]/u.test(value)) {
    fail(code, "expected a bounded non-control string");
  }
  return value;
}

function requireExactRecord(value, expectedKeys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    && Object.getPrototypeOf(value) !== null) {
    fail(code, "expected a plain object");
  }
  const keys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length
    || keys.some((key, index) => key !== expected[index])) {
    fail(
      code,
      "expected keys " + JSON.stringify(expected)
        + ", observed " + JSON.stringify(keys)
    );
  }
  return value;
}

function captureJsonData(value, label) {
  const state = {
    seen: new WeakSet(),
    objects: 0,
    keys: 0,
    stringUnits: 0
  };
  try {
    return deepFreeze(capture(value, 0));
  } catch (cause) {
    if (cause instanceof VedicCivilTimeFactBrowserObservationError) throw cause;
    fail("JSON_VALUE_CAPTURE_FAILED", label, cause);
  }

  function capture(current, depth) {
    if (current === null || typeof current === "boolean") return current;
    if (typeof current === "string") {
      state.stringUnits += current.length;
      if (state.stringUnits > 2_000_000) {
        fail("JSON_VALUE_LIMIT_EXCEEDED", label + " text");
      }
      return current;
    }
    if (typeof current === "number") {
      if (!Number.isFinite(current) || Object.is(current, -0)) {
        fail("JSON_NUMBER_INVALID", label);
      }
      return current;
    }
    if (typeof current !== "object" || depth > 40) {
      fail("JSON_VALUE_INVALID", label);
    }
    if (state.seen.has(current)) {
      fail("JSON_ALIAS_OR_CYCLE_FORBIDDEN", label);
    }
    state.seen.add(current);
    state.objects += 1;
    if (state.objects > 10000) fail("JSON_VALUE_LIMIT_EXCEEDED", label);
    if (Reflect.ownKeys(current).some((key) => typeof key === "symbol")) {
      fail("JSON_SYMBOL_FORBIDDEN", label);
    }
    const descriptors = Object.getOwnPropertyDescriptors(current);
    const keys = Object.keys(descriptors);
    state.keys += keys.length;
    if (state.keys > 100000) fail("JSON_VALUE_LIMIT_EXCEEDED", label);
    if (Array.isArray(current)) {
      if (Object.getPrototypeOf(current) !== Array.prototype
        || keys.length !== current.length + 1
        || descriptors.length?.value !== current.length) {
        fail("JSON_ARRAY_SHAPE_INVALID", label);
      }
      const output = [];
      for (let index = 0; index < current.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.enumerable !== true
          || !("value" in descriptor)) {
          fail("JSON_ARRAY_SHAPE_INVALID", label);
        }
        output.push(capture(descriptor.value, depth + 1));
      }
      return output;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      fail("JSON_OBJECT_PROTOTYPE_INVALID", label);
    }
    const output = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.enumerable !== true
        || !("value" in descriptor)
        || key === "__proto__"
        || key === "prototype"
        || key === "constructor") {
        fail("JSON_OBJECT_DESCRIPTOR_INVALID", label);
      }
      Object.defineProperty(output, key, {
        value: capture(descriptor.value, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
}

function parseStrictJsonText(text, label) {
  rejectDuplicateJsonKeys(text, label);
  try {
    return captureJsonData(JSON.parse(text), label);
  } catch (cause) {
    if (cause instanceof VedicCivilTimeFactBrowserObservationError) throw cause;
    fail("JSON_PARSE_FAILED", label, cause);
  }
}

function rejectDuplicateJsonKeys(text, label) {
  let index = 0;
  parseValue();
  skipWhitespace();
  if (index !== text.length) fail("JSON_PARSE_FAILED", label);

  function skipWhitespace() {
    while (index < text.length && /[\u0009\u000a\u000d\u0020]/u.test(text[index])) {
      index += 1;
    }
  }
  function parseValue() {
    skipWhitespace();
    const character = text[index];
    if (character === "{") return parseObject();
    if (character === "[") return parseArray();
    if (character === "\"") return parseString();
    const literal = text.slice(index);
    const match = literal.match(
      /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u
    );
    if (!match) fail("JSON_PARSE_FAILED", label);
    index += match[0].length;
  }
  function parseObject() {
    index += 1;
    skipWhitespace();
    const keys = new Set();
    if (text[index] === "}") {
      index += 1;
      return;
    }
    while (index < text.length) {
      skipWhitespace();
      if (text[index] !== "\"") fail("JSON_PARSE_FAILED", label);
      const key = parseString();
      if (keys.has(key)) fail("JSON_DUPLICATE_KEY", label + ": " + key);
      keys.add(key);
      skipWhitespace();
      if (text[index] !== ":") fail("JSON_PARSE_FAILED", label);
      index += 1;
      parseValue();
      skipWhitespace();
      if (text[index] === "}") {
        index += 1;
        return;
      }
      if (text[index] !== ",") fail("JSON_PARSE_FAILED", label);
      index += 1;
    }
    fail("JSON_PARSE_FAILED", label);
  }
  function parseArray() {
    index += 1;
    skipWhitespace();
    if (text[index] === "]") {
      index += 1;
      return;
    }
    while (index < text.length) {
      parseValue();
      skipWhitespace();
      if (text[index] === "]") {
        index += 1;
        return;
      }
      if (text[index] !== ",") fail("JSON_PARSE_FAILED", label);
      index += 1;
    }
    fail("JSON_PARSE_FAILED", label);
  }
  function parseString() {
    const start = index;
    index += 1;
    while (index < text.length) {
      const character = text[index];
      if (character === "\"") {
        index += 1;
        try {
          return JSON.parse(text.slice(start, index));
        } catch (cause) {
          fail("JSON_PARSE_FAILED", label, cause);
        }
      }
      if (character === "\\") {
        index += 2;
      } else {
        if (character < " ") fail("JSON_PARSE_FAILED", label);
        index += 1;
      }
    }
    fail("JSON_PARSE_FAILED", label);
  }
}

function omitRootKey(value, omittedKey) {
  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (key !== omittedKey) output[key] = value[key];
  }
  return output;
}

function canonicalJsonValue(value) {
  if (value === null || typeof value === "string"
    || typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  const result = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = canonicalJsonValue(value[key]);
  }
  return result;
}

function canonicalCompact(value) {
  return JSON.stringify(canonicalJsonValue(value));
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertStringArrayEqual(observed, expected, code, label) {
  const left = [...observed].sort();
  const right = [...expected].sort();
  if (left.length !== right.length
    || left.some((value, index) => value !== right[index])) {
    fail(
      code,
      label + "; expected " + JSON.stringify(right)
        + ", observed " + JSON.stringify(left)
    );
  }
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function makeTestBuildArtifacts() {
  const hashes = [
    "0", "1", "2", "3", "4", "5", "6", "7"
  ].map((character) => character.repeat(64));
  return [
    { path: "index.html", bytes: 901, sha256: hashes[0] },
    { path: "assets/index-a1b2c3d4.js", bytes: 1001, sha256: hashes[1] },
    { path: "assets/index-a1b2c3d4.js.map", bytes: 1002, sha256: hashes[2] },
    { path: "assets/index-a1b2c3d4.css", bytes: 1003, sha256: hashes[3] },
    { path: "assets/civil-worker-b2c3d4e5.js", bytes: 1004, sha256: hashes[4] },
    { path: "assets/civil-worker-b2c3d4e5.js.map", bytes: 1005, sha256: hashes[5] },
    { path: "assets/iana-2025b-c3d4e5f6.js", bytes: 1006, sha256: hashes[6] },
    { path: "assets/iana-2025b-c3d4e5f6.js.map", bytes: 1007, sha256: hashes[7] },
    {
      path: "hakimi-vedic-fact-only-build-manifest.v1.json",
      bytes: 2400,
      sha256: "8".repeat(64)
    },
    ...EXPECTED_NOTICE_OUTPUTS
  ];
}

function makeTestEvidence() {
  const artifacts = makeTestBuildArtifacts();
  const digestProjection = {
    artifacts: [...artifacts].sort((left, right) =>
      left.path.localeCompare(right.path, "en")),
    transformedModuleCount: 42,
    viteVersion: "7.3.6"
  };
  const outputIdentityDigest =
    computeVedicCivilTimeFactBrowserBuildOutputIdentityDigest(digestProjection);
  const builds = [
    {
      runId: "build-run-a",
      outDirLeaf: "hakimi-vedic-facts-" + "a".repeat(32),
      exitCode: 0,
      viteVersion: "7.3.6",
      transformedModuleCount: 42,
      artifacts: artifacts.map((entry) => ({ ...entry })),
      outputIdentityDigest
    },
    {
      runId: "build-run-b",
      outDirLeaf: "hakimi-vedic-facts-" + "b".repeat(32),
      exitCode: 0,
      viteVersion: "7.3.6",
      transformedModuleCount: 42,
      artifacts: artifacts.map((entry) => ({ ...entry })),
      outputIdentityDigest
    }
  ];
  return {
    createdAt: "2026-09-01T08:00:00.000Z",
    buildOutputIdentities: builds,
    browserObservation: {
      browserProduct: "Codex In-app Browser",
      browserVersion: null,
      observedAt: "2026-09-01T07:50:00.000Z",
      origin: "http://127.0.0.1:4226",
      sourceBuildRunId: "build-run-b",
      sourceBuildOutputIdentityDigest: outputIdentityDigest,
      syntheticDataOnly: true,
      actualPersonDataEntered: false,
      scenarios: [
        { scenarioId: "unique", outcome: "resolved", code: null, decision: "unique", partialFactsReturned: false },
        { scenarioId: "gap", outcome: "failed_closed", code: "LOCAL_WALL_TIME_GAP_REJECTED", decision: null, partialFactsReturned: false },
        { scenarioId: "overlap_reject", outcome: "failed_closed", code: "LOCAL_WALL_TIME_OVERLAP_REJECTED", decision: null, partialFactsReturned: false },
        { scenarioId: "overlap_earlier", outcome: "resolved", code: null, decision: "vedic_adapter_draft_earlier", partialFactsReturned: false },
        { scenarioId: "overlap_later", outcome: "resolved", code: null, decision: "vedic_adapter_draft_later", partialFactsReturned: false }
      ],
      requestDigestBindingBrowserObserved: false,
      responseDescriptorCaptureBrowserObserved: false,
      failureAllowlistBrowserObserved: false,
      factOnlyFieldsBrowserObserved: true,
      astronomyOrInterpretationFieldsBrowserObserved: false,
      utcOffsetIncludesSecondsBrowserObserved: true,
      namedControlsBrowserObserved: 0,
      allButtonsTypeButtonBrowserObserved: true,
      formSubmissionBehaviorBrowserObserved: false,
      historicalSecondPrecisionOffsetBrowserObserved: "UTC+08:05:43",
      inputClearedOnChangeBrowserObserved: true,
      controlsDisabledDuringRunBrowserObserved: false,
      connectSrcNoneResponseHeaderObserved: true,
      formActionNoneResponseHeaderObserved: true,
      networkProbePerformed: false,
      networkRequestCountObserved: null,
      consoleProbePerformed: true,
      consoleWarningOrErrorCountObserved: 0,
      storageInspectionProhibited: true,
      storageProbePerformed: false,
      storageMutationObserved: null,
      cookieInspectionProhibited: true,
      cookieProbePerformed: false,
      cookieMutationObserved: null,
      serviceWorkerProbePerformed: false,
      serviceWorkerRegistrationObserved: null,
      chromeValidated: false,
      edgeValidated: false,
      crossBrowserValidated: false,
      productionHostValidated: false,
      productionBrowserRuntimeEvidenceEstablished: false
    }
  };
}

export const vedicCivilTimeFactBrowserObservationTestOnly = deepFreeze({
  expectedDraftRuntimeSourceFiles: [...EXPECTED_DRAFT_RUNTIME_SOURCE_FILES],
  expectedRuntimeImportGraph: EXPECTED_RUNTIME_IMPORT_GRAPH,
  expectedLockedBuildInputs: EXPECTED_LOCKED_BUILD_INPUTS,
  expectedNoticeOutputs: EXPECTED_NOTICE_OUTPUTS,
  formalContextFiles: [...FORMAL_CONTEXT_FILES],
  verifierFiles: [...VERIFIER_FILES],
  decodeStrictUtf8,
  parseStrictJsonText,
  captureJsonData,
  normalizeCandidateEvidence,
  makeTestBuildArtifacts,
  makeTestEvidence
});

export const testOnly = vedicCivilTimeFactBrowserObservationTestOnly;
