#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX = "VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_OBSERVATION_OK";
const FAILED_PREFIX = "VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_FAILED";
const cliPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(cliPath), "..");
const isDirectEntry = typeof process.argv[1] === "string"
  && path.resolve(process.argv[1]) === cliPath;

function writeFailure(code) {
  process.stderr.write(`${FAILED_PREFIX} ${code}\n`);
  process.exitCode = 1;
}

function visibleLoaderInjectionPresent() {
  if (typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS !== "") {
    return true;
  }
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (typeof argument === "string"
      && /^(?:--experimental-loader|--import|--loader|--require|-r)(?:=|$)/u.test(argument)) {
      return true;
    }
  }
  return false;
}

function safeCode(error) {
  const allowed = new Set([
    "PARENT_BRAND_REQUIRED",
    "PARENT_IDENTITY_MISMATCH",
    "PARENT_RAW_IDENTITY_MISMATCH",
    "UPSTREAM_CLOSURE_MISMATCH",
    "RED_BOUNDARY_MISMATCH",
    "MANIFEST_DIGEST_MISMATCH",
    "MANIFEST_MATERIALIZATION_MISMATCH",
    "CURRENT_MANIFEST_MISMATCH",
    "PERSISTED_IDENTITY_MISMATCH",
    "COMPONENT_ENDPOINT_INVALID",
    "COMPONENT_MISSING",
    "MANIFEST_ENDPOINT_INVALID",
    "MANIFEST_MISSING"
  ]);
  return typeof error?.code === "string" && allowed.has(error.code)
    ? error.code
    : "VERIFICATION_FAILED";
}

if (isDirectEntry) {
  if (process.argv.length !== 2) {
    writeFailure("CLI_ARGUMENTS_FORBIDDEN");
  } else if (visibleLoaderInjectionPresent()) {
    writeFailure("VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN");
  } else {
    try {
      const module = await import("./vedic-independent-engineering-manifest-v1-lib.mjs");
      const verified =
        await module.readCurrentVedicIndependentEngineeringManifestV1(workspaceRoot);
      if (!module.isVerifiedVedicIndependentEngineeringManifestV1(verified)) {
        const error = new Error("unbranded manifest result");
        error.code = "VERIFIED_BRAND_REQUIRED";
        throw error;
      }
      const summary = module.getVedicIndependentEngineeringManifestV1Summary(verified);
      const manifest = verified.manifest;
      process.stdout.write(`${OK_PREFIX} ${JSON.stringify({
        mechanicalCurrentMachineIdentityObserved: true,
        artifact: summary.artifact,
        manifestId: summary.manifestId,
        manifestDigest: summary.manifestDigest,
        componentAccounting: manifest.componentAccounting,
        requirementsAccounting: manifest.requirementsAccounting,
        gateState: {
          admission: `${summary.admissionGatesSatisfied}/${summary.admissionGatesRequired}`,
          binding: `${summary.bindingFrozenVerified}/${summary.bindingRequired}`,
          experts: `${summary.independentExpertReviewsVerified}/${summary.independentExpertsRequired}`
        },
        productBoundary: {
          productIdentity: summary.productIdentity,
          releaseIdentity: summary.releaseIdentity,
          targetSchema: summary.targetSchema,
          migrationId: summary.migrationId,
          mainApplicationIntegrated: summary.mainApplicationIntegrated,
          activeAdmissionEffect: summary.activeAdmissionEffect
        },
        authorityBoundary: {
          releaseReady: summary.releaseReady,
          publicDeploymentAuthorized: summary.publicDeploymentAuthorized,
          publicReleaseAuthorized: summary.publicReleaseAuthorized,
          expertClaimsAuthorized: summary.expertClaimsAuthorized
        },
        runtimeTrustCalibration: {
          hiddenPreloadExcluded: false,
          nodeRuntimeIdentityEstablished: false,
          loaderIdentityEstablished: false,
          runtimeLauncherIdentityEstablished: false,
          cliOutputTrustedAttestation: false,
          visibleLoaderGuardIsSecurityBoundary: false,
          mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
        }
      })}\n`);
    } catch (error) {
      writeFailure(safeCode(error));
    }
  }
}
