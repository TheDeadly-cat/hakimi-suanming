import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAZI_SCOPED_CURRENT_PURPOSES,
  getSafeBaziScopedCurrentErrorCode,
  loadBaziCurrentDomainManifest,
  loadBaziCurrentExpertReviewPacket,
  loadBaziCurrentExpertReviewProgress,
  loadBaziCurrentExpertReviewProgressFromPrivateIntakeFile,
  loadBaziCurrentSourceBinding,
  loadBaziCurrentSourceRights,
  serializeBaziScopedCurrentResolution
} from "./bazi-scoped-current-lib.mjs";

const LOADERS = Object.freeze({
  [BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding]: loadBaziCurrentSourceBinding,
  [BAZI_SCOPED_CURRENT_PURPOSES.sourceRights]: loadBaziCurrentSourceRights,
  [BAZI_SCOPED_CURRENT_PURPOSES.domainManifest]: loadBaziCurrentDomainManifest,
  [BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket]: loadBaziCurrentExpertReviewPacket
});

export function visibleLoaderInjectionPresent() {
  if (!Array.isArray(process.execArgv)) return true;
  for (let index = 0; index < process.execArgv.length; index += 1) {
    const argument = process.execArgv[index];
    if (typeof argument !== "string") return true;
    if (argument === "--require" || argument.slice(0, 10) === "--require="
      || argument === "--import" || argument.slice(0, 9) === "--import="
      || argument === "--loader" || argument.slice(0, 9) === "--loader="
      || argument === "--experimental-loader"
      || argument.slice(0, 22) === "--experimental-loader="
      || /^-[^-]*r/u.test(argument)) return true;
  }
  return (process.env.NODE_OPTIONS !== undefined && process.env.NODE_OPTIONS !== "")
    || (process.env.NODE_PATH !== undefined && process.env.NODE_PATH !== "");
}

export function invokedThroughRealEntrypoint(moduleUrl) {
  const normalize = (value) => process.platform === "win32"
    ? value.toLowerCase()
    : value;
  const invokedReal = realpathSync(path.resolve(process.argv[1]));
  const moduleReal = realpathSync(path.resolve(fileURLToPath(moduleUrl)));
  return normalize(invokedReal) === normalize(moduleReal);
}

// Selection is not the expert gate. Until a trusted qualification receipt
// consumer exists, this command has no successful expert-admission outcome.
export function getBaziExpertProgressCliOutcome(output) {
  return Object.freeze({
    exitCode: 1,
    code: output?.currentAvailable !== true
      ? "CURRENT_UNAVAILABLE"
      : output?.expertReviewProgress?.qualificationReceiptLoaderAvailable !== true
        ? "EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE"
        : "EXPERT_REVIEW_GATE_BLOCKED"
  });
}

export async function runFixedBaziScopedCurrentCli(purpose, moduleUrl) {
  if (visibleLoaderInjectionPresent()) {
    process.stderr.write("PRELOAD_ENVIRONMENT_FORBIDDEN\n");
    return 1;
  }
  const privateIntakeMode = purpose === BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket
    && process.argv.length === 4
    && process.argv[2] === "--private-intake"
    && typeof process.argv[3] === "string"
    && process.argv[3].trim().length > 0
    && process.argv[3].slice(0, 1) !== "-";
  if (process.argv.length !== 2 && !privateIntakeMode) {
    process.stderr.write("ARGUMENTS_FORBIDDEN\n");
    return 1;
  }
  const loader = LOADERS[purpose];
  if (loader === undefined) {
    process.stderr.write("PURPOSE_INVALID\n");
    return 1;
  }
  const moduleReal = realpathSync(path.resolve(fileURLToPath(moduleUrl)));
  const workspaceRoot = path.resolve(path.dirname(moduleReal), "..");
  try {
    if (privateIntakeMode) {
      const output = await loadBaziCurrentExpertReviewProgressFromPrivateIntakeFile(workspaceRoot, process.argv[3]);
      process.stdout.write(serializeBaziScopedCurrentResolution(output));
      const outcome = getBaziExpertProgressCliOutcome(output);
      process.stderr.write(`${outcome.code}\n`);
      return outcome.exitCode;
    }
    const resolution = await loader(workspaceRoot);
    const output = purpose === BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket
      ? await loadBaziCurrentExpertReviewProgress(workspaceRoot)
      : resolution;
    process.stdout.write(serializeBaziScopedCurrentResolution(output));
    if (purpose === BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket) {
      const outcome = getBaziExpertProgressCliOutcome(output);
      process.stderr.write(`${outcome.code}\n`);
      return outcome.exitCode;
    }
    return 0;
  } catch (error) {
    if (!privateIntakeMode && purpose === BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket
      && getSafeBaziScopedCurrentErrorCode(error) === "CURRENT_UNAVAILABLE") {
      try {
        const progress = await loadBaziCurrentExpertReviewProgress(workspaceRoot);
        process.stdout.write(serializeBaziScopedCurrentResolution(progress));
      } catch (progressError) {
        process.stderr.write(`${getSafeBaziScopedCurrentErrorCode(progressError)}\n`);
        return 1;
      }
    }
    process.stderr.write(`${getSafeBaziScopedCurrentErrorCode(error)}\n`);
    return 1;
  }
}
