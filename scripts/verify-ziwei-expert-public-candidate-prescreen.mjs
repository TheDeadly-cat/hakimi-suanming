#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const OK_PREFIX = "ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_OK";
const FAILED_PREFIX = "ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_FAILED";
const PRELOAD_REJECTED = "VISIBLE_PRELOAD_OPTIONS_REJECTED";
const FORBIDDEN_EXEC_OPTIONS = [
  "-r",
  "--require",
  "--import",
  "--loader",
  "--experimental-loader"
];

function isOptionOrAttachedForm(value, option) {
  if (value === option) return true;
  if (typeof value !== "string" || value.length <= option.length) return false;
  if (option === "-r") return value[0] === "-" && value[1] === "r";
  if (value[option.length] !== "=") return false;
  for (let index = 0; index < option.length; index += 1) {
    if (value[index] !== option[index]) return false;
  }
  return true;
}

function visiblePreloadRejection() {
  if (typeof process.env.NODE_OPTIONS === "string" && process.env.NODE_OPTIONS !== "") {
    return PRELOAD_REJECTED;
  }
  if (typeof process.env.NODE_PATH === "string") return PRELOAD_REJECTED;
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const value = process.execArgv[index];
    for (let optionIndex = 0; optionIndex < FORBIDDEN_EXEC_OPTIONS.length; optionIndex += 1) {
      if (isOptionOrAttachedForm(value, FORBIDDEN_EXEC_OPTIONS[optionIndex])) return PRELOAD_REJECTED;
    }
  }
  return null;
}

function modulePathAfterPreloadCheck() {
  return fileURLToPath(import.meta.url);
}

function isDirectExecution(modulePath) {
  return typeof process.argv[1] === "string"
    && path.resolve(process.argv[1]) === path.resolve(modulePath);
}

function fixedWorkspaceRoot(modulePath) {
  return path.resolve(path.dirname(modulePath), "..");
}

function assertNarrowInvocation(modulePath) {
  const preload = visiblePreloadRejection();
  if (preload !== null) throw new Error(preload);
  if (process.argv.length !== 2) throw new Error("CLI_ARGUMENTS_REJECTED");
  if (path.resolve(process.cwd()) !== fixedWorkspaceRoot(modulePath)) {
    throw new Error("FIXED_WORKSPACE_ROOT_REQUIRED");
  }
}

export async function main() {
  const modulePath = modulePathAfterPreloadCheck();
  assertNarrowInvocation(modulePath);
  const workspaceRoot = fixedWorkspaceRoot(modulePath);
  const {
    isVerifiedZiweiExpertPublicCandidatePrescreen,
    loadZiweiExpertPublicCandidatePrescreen
  } = await import("./ziwei-expert-public-candidate-prescreen-lib.mjs");
  const result = await loadZiweiExpertPublicCandidatePrescreen(workspaceRoot);
  if (!isVerifiedZiweiExpertPublicCandidatePrescreen(result)) {
    throw new Error("PRIVATE_BRAND_REQUIRED");
  }
  process.stdout.write(OK_PREFIX + " " + JSON.stringify({
    ok: result.ok,
    ledgerId: result.ledgerId,
    ledgerDigest: result.ledgerDigest,
    publicCandidateLeadsObserved: result.publicCandidateLeadsObserved,
    sourceObservations: result.sourceObservations,
    deduplicatedSourceGroups: result.deduplicatedSourceGroups,
    reviewQuestions: result.reviewQuestions,
    pairwiseAssessments: result.pairwiseAssessments,
    reviewerSlots: `${result.reviewerSlotsOccupied}/${result.reviewerSlotsRequired}`,
    sourceBindings: `${result.sourceBindingsFrozenVerified}/${result.sourceBindingsRequired}`,
    sourceRequirementPartialCandidates: result.sourceRequirementPartialCandidates,
    independentExpertReviewsVerified: result.independentExpertReviewsVerified,
    fixedVerifierNetworkAttempted: result.fixedVerifierNetworkAttempted,
    expertClaimsAuthorized: result.expertClaimsAuthorized,
    releaseReady: result.releaseReady,
    publicDeploymentAuthorized: result.publicDeploymentAuthorized,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
}

const preloadAtDispatch = visiblePreloadRejection();
if (preloadAtDispatch !== null) {
  process.stderr.write(FAILED_PREFIX + " " + PRELOAD_REJECTED + "\n");
  process.exitCode = 1;
} else {
  const modulePath = modulePathAfterPreloadCheck();
  if (isDirectExecution(modulePath)) {
    main().catch((error) => {
      const code = typeof error?.message === "string" && /^[A-Z0-9_]+$/u.test(error.message)
        ? error.message
        : "VERIFICATION_FAILED";
      process.stderr.write(FAILED_PREFIX + " " + code + "\n");
      process.exitCode = 1;
    });
  }
}

