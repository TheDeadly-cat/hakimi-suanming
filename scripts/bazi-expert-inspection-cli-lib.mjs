import path from "node:path";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  getSafeBaziScopedCurrentErrorCode,
  loadBaziCurrentExpertReviewPacket,
  loadBaziCurrentExpertReviewProgress,
  loadBaziCurrentExpertReviewProgressFromPrivateIntakeFile,
  serializeBaziScopedCurrentResolution
} from "./bazi-scoped-current-lib.mjs";
import { visibleLoaderInjectionPresent } from "./bazi-scoped-current-cli-lib.mjs";

const parsedRequests = new WeakSet();
function parsedRequest(role, privateIntakePath) {
  const request = Object.freeze({ role, privateIntakePath });
  parsedRequests.add(request);
  return request;
}
function freezeJson(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeJson);
    Object.freeze(value);
  }
  return value;
}

export function parseBaziExpertInspectionArguments(args) {
  if (!Array.isArray(args)) throw new Error("ARGUMENTS_FORBIDDEN");
  if (args.length === 1 && args[0] === "--structure") {
    return parsedRequest("packet_structure", null);
  }
  if (args[0] === "--progress" && (args.length === 1 || (args.length === 3
    && args[1] === "--private-intake" && typeof args[2] === "string"
    && args[2].trim().length > 0 && !args[2].startsWith("-")))) {
    return parsedRequest("review_progress", args[2] ?? null);
  }
  throw new Error("ARGUMENTS_FORBIDDEN");
}

export async function inspectBaziCurrentExpertReview(workspaceRoot, request) {
  // Require a parsed, closed argument vocabulary. No callback, result object, or
  // caller qualification flag can replace the actual current-object loaders.
  if (!parsedRequests.has(request)) {
    throw new Error("ARGUMENTS_FORBIDDEN");
  }
  const resolution = request.role === "packet_structure"
    ? await loadBaziCurrentExpertReviewPacket(workspaceRoot)
    : request.privateIntakePath === null
      ? await loadBaziCurrentExpertReviewProgress(workspaceRoot)
      : await loadBaziCurrentExpertReviewProgressFromPrivateIntakeFile(workspaceRoot, request.privateIntakePath);
  // Serialization requires the loader's private brand, not a lookalike object.
  const verified = JSON.parse(serializeBaziScopedCurrentResolution(resolution));
  const available = verified.currentAvailable === true;
  return freezeJson({
    exitCode: available ? 0 : 1,
    output: {
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_inspection_result_v1",
      commandRole: request.role,
      status: available ? (request.role === "packet_structure" ? "structure_verified" : "progress_reported") : "current_unavailable",
      inputScope: request.role === "packet_structure" ? "current_packet_no_private_originals"
        : request.privateIntakePath === null ? "none_supplied" : "explicit_private_intake_file",
      expertAdmissionAssessed: false,
      expertAdmissionAuthorized: false,
      resolution: verified
    }
  });
}

export async function runBaziExpertInspectionCli(moduleUrl) {
  if (visibleLoaderInjectionPresent()) {
    process.stderr.write("PRELOAD_ENVIRONMENT_FORBIDDEN\n");
    return 1;
  }
  let request;
  try { request = parseBaziExpertInspectionArguments(process.argv.slice(2)); }
  catch { process.stderr.write("ARGUMENTS_FORBIDDEN\n"); return 1; }
  const workspaceRoot = path.resolve(path.dirname(realpathSync(fileURLToPath(moduleUrl))), "..");
  try {
    const result = await inspectBaziCurrentExpertReview(workspaceRoot, request);
    process.stdout.write(`${JSON.stringify(result.output)}\n`);
    if (result.exitCode !== 0) process.stderr.write("CURRENT_UNAVAILABLE\n");
    return result.exitCode;
  } catch (error) {
    process.stderr.write(`${getSafeBaziScopedCurrentErrorCode(error)}\n`);
    return 1;
  }
}
