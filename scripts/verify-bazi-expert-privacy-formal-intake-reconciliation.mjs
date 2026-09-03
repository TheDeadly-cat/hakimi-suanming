#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX = "BAZI_EXPERT_PRIVACY_FORMAL_INTAKE_RECONCILIATION_OBSERVATION_OK";
const FAILED_PREFIX = "BAZI_EXPERT_PRIVACY_FORMAL_INTAKE_RECONCILIATION_FAILED";
const cliPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(cliPath), "..");
const isDirectEntry = typeof process.argv[1] === "string"
  && path.resolve(process.argv[1]) === cliPath;

function writeFailure(code) {
  process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
  process.exitCode = 1;
}

function safeCode(error) {
  const allowed = [
    "PRECHECK_BRAND_REQUIRED", "INTAKE_BRAND_REQUIRED", "PARENT_BOUNDARY_MISMATCH",
    "LEDGER_DIGEST_MISMATCH", "EXPECTED_PROJECTION_MISMATCH", "PERSISTED_RAW_DRIFT",
    "PERSISTED_DIGEST_DRIFT", "RAW_PIN_NOT_FROZEN", "SUMMARY_RED_GATE_MISMATCH"
  ];
  const candidate = typeof error?.code === "string" ? error.code : "";
  for (let index = 0; index < allowed.length; index += 1) {
    if (candidate === allowed[index]) return candidate;
  }
  return "VERIFICATION_FAILED";
}

const EXPECTED_SUMMARY = {
  privacyFormalIntakeReconciliationMechanicallyVerified: true,
  ledgerId: "hakimi.bazi.expert-privacy-formal-intake-reconciliation/1.0.0",
  ledgerDigest: "cdf1a4d73a07b99a915e19f24672adbf6a4b42fb98754a0d679b32ec91eca3a2",
  verifiedParentPrivateBrandCount: 2,
  historicalPublicIdentityBindingFieldCount: 8,
  currentOpaqueContextInstances: 0,
  persistedRealPersonInstancesAllowed: false,
  collectionAuthorized: false,
  personDataPresenceAssessed: false,
  personDerivedDigestExcluded: false,
  safeToPublish: false,
  hiddenPreloadExcluded: false,
  nodeRuntimeIdentityEstablished: false,
  loaderIdentityEstablished: false,
  runtimeLauncherIdentityEstablished: false,
  cliOutputTrustedAttestation: false,
  visibleLoaderGuardIsSecurityBoundary: false,
  mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true,
  domainExpertsRequired: 2,
  reviewerSlotsOccupied: 0,
  currentFormalIntakeRecordInstances: 0,
  sealedOriginalOpinions: 0,
  bindingRequired: 12,
  bindingFrozenVerified: 0,
  candidateProjectedArtifactLockExactMatches: 11,
  candidateProjectedArtifactLockDrifts: 1,
  packetArtifactLocksCurrent: false,
  firstFormalParentFailureCode: "INTAKE_GAP_BINDING_DRIFT",
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  activeAdmissionEffect: "none",
  releaseReady: false,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false,
  crossFileAtomicSnapshot: false,
  mutationEpochAvailableForSchema13: false,
  mutationEpochReceipt: null,
  intervalMutationExcludedAcrossFiles: false,
  abaExcluded: false
};
const EXPECTED_ARTIFACT = {
  path: "content/system-admission/bazi-expert-privacy-formal-intake-reconciliation.v1.json",
  bytes: 10260,
  sha256: "f99612bd68adbe42145b0cc92030f44d54ee91eed574617690de8a4f109c9a17"
};

function exactFrozenDataObject(actual, expected, nestedArtifact = false) {
  if (actual === null || typeof actual !== "object" || Object.getPrototypeOf(actual) !== Object.prototype) return false;
  const actualKeys = Reflect.ownKeys(actual);
  const expectedKeys = Reflect.ownKeys(expected);
  if (actualKeys.length !== expectedKeys.length || !Object.isFrozen(actual)) return false;
  for (let index = 0; index < expectedKeys.length; index += 1) {
    const key = expectedKeys[index];
    const descriptor = Object.getOwnPropertyDescriptor(actual, key);
    const valueDescriptor = descriptor === undefined
      ? undefined
      : Object.getOwnPropertyDescriptor(descriptor, "value");
    if (!descriptor || !valueDescriptor || descriptor.enumerable !== true
      || descriptor.writable !== false || descriptor.configurable !== false) return false;
    if (key === "artifact" && !nestedArtifact) {
      if (!exactFrozenDataObject(descriptor.value, EXPECTED_ARTIFACT, true)) return false;
    } else if (descriptor.value !== expected[key]) {
      return false;
    }
  }
  return true;
}

function visibleLoaderInjectionPresent() {
  if (typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS !== "") return true;
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (typeof argument === "string"
      && /^(?:--experimental-loader|--import|--loader|--require|-r)(?:=|$)/u.test(argument)) return true;
  }
  return false;
}

if (isDirectEntry) {
  if (process.argv.length !== 2) {
    writeFailure("CLI_ARGUMENTS_FORBIDDEN");
  } else if (visibleLoaderInjectionPresent()) {
    writeFailure("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
  } else {
  try {
    const module = await import("./bazi-expert-privacy-formal-intake-reconciliation-lib.mjs");
    const result = await module.loadBaziExpertPrivacyFormalIntakeReconciliation(workspaceRoot);
    if (!module.isVerifiedBaziExpertPrivacyFormalIntakeReconciliation(result)) {
      const error = new Error("unbranded result");
      error.code = "UNBRANDED_RESULT";
      throw error;
    }
    if (!exactFrozenDataObject(result, { ...EXPECTED_SUMMARY, artifact: EXPECTED_ARTIFACT })) {
      const error = new Error("summary red gate mismatch");
      error.code = "SUMMARY_RED_GATE_MISMATCH";
      throw error;
    }

    const output = {
      mechanicalObservationVerified: result.privacyFormalIntakeReconciliationMechanicallyVerified,
      ledger: { id: result.ledgerId, digest: result.ledgerDigest },
      artifact: result.artifact,
      parentAndTemplateAccounting: {
        verifiedPrivateBrands: result.verifiedParentPrivateBrandCount,
        historicalPublicIdentityBindingFields: result.historicalPublicIdentityBindingFieldCount
      },
      privacyRedGates: {
        currentOpaqueContextInstances: result.currentOpaqueContextInstances,
        persistedRealPersonInstancesAllowed: result.persistedRealPersonInstancesAllowed,
        collectionAuthorized: result.collectionAuthorized,
        personDataPresenceAssessed: result.personDataPresenceAssessed,
        personDerivedDigestExcluded: result.personDerivedDigestExcluded,
        safeToPublish: result.safeToPublish
      },
      runtimeTrustCalibration: {
        hiddenPreloadExcluded: result.hiddenPreloadExcluded,
        nodeRuntimeIdentityEstablished: result.nodeRuntimeIdentityEstablished,
        loaderIdentityEstablished: result.loaderIdentityEstablished,
        runtimeLauncherIdentityEstablished: result.runtimeLauncherIdentityEstablished,
        cliOutputTrustedAttestation: result.cliOutputTrustedAttestation,
        visibleLoaderGuardIsSecurityBoundary: result.visibleLoaderGuardIsSecurityBoundary,
        mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution:
          result.mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution
      },
      formalIntakeRedGates: {
        domainExpertsRequired: result.domainExpertsRequired,
        reviewerSlotsOccupied: result.reviewerSlotsOccupied,
        currentFormalIntakeRecordInstances: result.currentFormalIntakeRecordInstances,
        sealedOriginalOpinions: result.sealedOriginalOpinions,
        bindingRequired: result.bindingRequired,
        bindingFrozenVerified: result.bindingFrozenVerified,
        artifactLockExactMatches: result.candidateProjectedArtifactLockExactMatches,
        artifactLockDrifts: result.candidateProjectedArtifactLockDrifts,
        packetArtifactLocksCurrent: result.packetArtifactLocksCurrent,
        firstFailureCode: result.firstFormalParentFailureCode
      },
      fixedGovernance: { activeLine: "legacy-v13", targetSchema: 13, migrationId: null },
      integrityRedGates: {
        crossFileAtomicSnapshot: result.crossFileAtomicSnapshot,
        mutationEpochAvailableForSchema13: result.mutationEpochAvailableForSchema13,
        mutationEpochReceipt: result.mutationEpochReceipt,
        intervalMutationExcludedAcrossFiles: result.intervalMutationExcludedAcrossFiles,
        abaExcluded: result.abaExcluded
      },
      authorityRedGates: {
        activeAdmissionEffect: result.activeAdmissionEffect,
        contentTruthEstablished: result.contentTruthEstablished,
        expertTruthEstablished: result.expertTruthEstablished,
        rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
        releaseReady: result.releaseReady,
        publicDeploymentAuthorized: result.publicDeploymentAuthorized,
        expertClaimsAuthorized: result.expertClaimsAuthorized
      }
    };
    process.stdout.write(`${OK_PREFIX} ${JSON.stringify(output)}\n`);
    } catch (error) {
      writeFailure(safeCode(error));
    }
  }
}
