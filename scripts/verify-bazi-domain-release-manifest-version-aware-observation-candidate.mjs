import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX =
  "BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_MECHANICS_OK";
const FAILED_PREFIX =
  "BAZI_DOMAIN_RELEASE_MANIFEST_VERSION_AWARE_OBSERVATION_CANDIDATE_MECHANICS_FAILED";
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function safeCode(error) {
  return typeof error?.code === "string" && /^[A-Z0-9_]{1,80}$/u.test(error.code)
    ? error.code
    : "UNEXPECTED_FAILURE";
}

function writeFailure(code) {
  process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
  process.exitCode = 1;
}

function visibleLoaderInjectionPresent() {
  const nodeOptions = typeof process.env.NODE_OPTIONS === "string"
    ? process.env.NODE_OPTIONS.trim()
    : "";
  const injectedExecArgument = process.execArgv.some((argument) =>
    /^(?:--experimental-loader|--import|--loader|--require|-r)(?:=|$)/u.test(argument)
  );
  return nodeOptions !== "" || injectedExecArgument;
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function safeRelativeArtifact(artifact) {
  return typeof artifact?.path === "string"
    && !path.isAbsolute(artifact.path)
    && !artifact.path.split(/[\\/]/u).includes("..")
    && Number.isInteger(artifact.bytes)
    && artifact.bytes > 0
    && typeof artifact.sha256 === "string"
    && /^[0-9a-f]{64}$/u.test(artifact.sha256);
}

if (process.argv.length !== 2) {
  writeFailure("CLI_ARGUMENTS_FORBIDDEN");
} else if (visibleLoaderInjectionPresent()) {
  writeFailure("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
} else {
  try {
    const module = await import(
      "./bazi-domain-release-manifest-version-aware-observation-candidate-lib.mjs"
    );
    const result =
      await module.loadBaziDomainReleaseManifestVersionAwareObservationCandidate(
        workspaceRoot
      );
    if (!module.isVerifiedBaziDomainReleaseManifestVersionAwareObservationCandidate(result)) {
      fail("UNBRANDED_CANDIDATE_RESULT");
    }
    if (!safeRelativeArtifact(result.artifact)) {
      fail("UNSAFE_PUBLIC_ARTIFACT_TUPLE");
    }

    const historical = result.historicalBasisAccounting;
    const context = result.contextBrandAccounting;
    const preview = result.currentPreviewAccounting;
    const owner = result.ownerDecisionAccounting;
    const observation = result.observationRedGates;
    const authority = result.authorityRedGates;

    if (
      result.versionAwareBaziManifestObservationMechanicallyVerified !== true
      || result.fixedDefaultGovernance?.activeLine !== "legacy-v13"
      || result.fixedDefaultGovernance?.targetSchema !== 13
      || result.fixedDefaultGovernance?.migrationId !== null
      || result.activeAdmissionEffect !== "none"
      || historical?.historicalBasisArtifactCount !== 2
      || historical?.verifiedReleaseParentBrandCount !== 0
      || historical?.savedManifestCurrent !== false
      || historical?.savedManifestVerifierFailureCode !== "MANIFEST_MISMATCH"
      || historical?.oldD0Current !== false
      || historical?.oldD0VerifierFailureCode !== "CURRENT_EXPECTED_MANIFEST_CHANGED"
      || context?.verifiedMechanicalContextBrandCount !== 5
      || context?.verifiedReleaseParentBrandCount !== 0
      || context?.directLogicalParentArtifactCount !== 6
      || context?.supportingReceiptArtifactCount !== 1
      || context?.transitivePolicyClosureArtifactCount !== 2
      || context?.authorityInherited !== false
      || preview?.authoritative !== false
      || preview?.persistedAsDomainManifest !== false
      || preview?.nonAuthoritativeCurrentExpectedPreviewDigest
        !== "85e0a454c76bead4eac239a98a56b55fb662bcc77ff6f1e49e52ee2a6e65ea68"
      || preview?.componentsObserved !== 9
      || preview?.unchangedComponentsObserved !== 5
      || preview?.changedComponentsObserved !== 4
      || preview?.componentFileDriftEntryCount !== 11
      || preview?.uniqueDriftPathCount !== 8
      || JSON.stringify(preview?.componentDriftIds) !== JSON.stringify([
        "fact_contract",
        "source_bundle",
        "rights_bundle",
        "high_risk_policy"
      ])
      || owner?.ownerDecisionsRecorded !== 0
      || owner?.manifestRebindAuthorized !== false
      || owner?.manifestResignAuthorized !== false
      || observation?.endpointSnapshotOnly !== true
      || observation?.crossFileAtomicSnapshot !== false
      || observation?.mutationEpochAvailableForSchema13 !== false
      || observation?.mutationEpochReceipt !== null
      || observation?.intervalMutationExcludedAcrossFiles !== false
      || observation?.abaExcluded !== false
      || authority?.bindingRequired !== 12
      || authority?.bindingFrozenVerified !== 0
      || authority?.independentExpertsRequired !== 2
      || authority?.independentExpertReviewsVerified !== 0
      || authority?.sourceBundleComplete !== false
      || authority?.rightsBundleComplete !== false
      || authority?.expertReviewBundleComplete !== false
      || authority?.contentTruthEstablished !== false
      || authority?.expertTruthEstablished !== false
      || authority?.rightsLegalConclusionEstablished !== false
      || authority?.browserRuntimeEvidenceEstablished !== false
      || authority?.releaseEvidenceComplete !== false
      || authority?.releaseReady !== false
      || authority?.publicDeploymentAuthorized !== false
      || authority?.expertClaimsAuthorized !== false
    ) {
      fail("PUBLIC_SUMMARY_DRIFT");
    }

    const output = {
      versionAwareBaziManifestObservationMechanicallyVerified:
        result.versionAwareBaziManifestObservationMechanicallyVerified,
      candidateResultWeakSetBrandVerified: true,
      candidateId: result.candidateId,
      candidateDigest: result.candidateDigest,
      artifact: {
        path: result.artifact.path,
        bytes: result.artifact.bytes,
        sha256: result.artifact.sha256
      },
      fixedDefaultGovernance: result.fixedDefaultGovernance,
      activeAdmissionEffect: result.activeAdmissionEffect,
      historicalBasisAccounting: historical,
      contextBrandAccounting: context,
      currentPreviewAccounting: preview,
      ownerDecisionAccounting: owner,
      observationRedGates: observation,
      authorityRedGates: authority
    };

    process.stdout.write(`${OK_PREFIX} ${JSON.stringify(output)}\n`);
  } catch (error) {
    writeFailure(safeCode(error));
  }
}
