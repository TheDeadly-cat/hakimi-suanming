import { lstat, mkdir, open, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  compileSwAbUpdateRuntimeClientCaptureSchema
} from "./sw-ab-update-runtime-client-capture-schema.mjs";
import {
  computeSwAbUpdateRuntimeApiTranscriptBundleDigest,
  computeSwAbUpdateRuntimeApiTranscriptBundleId,
  deriveSwAbUpdateRuntimeClientCaptureFromApiTranscript,
  parseSwAbUpdateRuntimeApiTranscriptJsonBytes,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_AUTHORITY,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_PATH,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_PROVENANCE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
  validateSwAbUpdateRuntimeApiTranscriptPolicy
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  compileSwAbUpdateRuntimeApiTranscriptSchema
} from "./sw-ab-update-runtime-api-transcript-schema.mjs";

const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_TUPLE_BYTES = 512 * 1024;
const MAX_MANIFEST_BYTES = 1024 * 1024;

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function relativeWithin(root, candidate, label) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (
    relative === ""
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_PATH_OUTSIDE_ROOT: ${label} escapes its required root.`
    );
  }
  return relative.replaceAll("\\", "/");
}

async function readCheckedSource(cwd, requirement) {
  const absolutePath = path.resolve(cwd, ...requirement.path.split("/"));
  relativeWithin(cwd, absolutePath, requirement.role);
  const before = await lstat(absolutePath, { bigint: true });
  const physical = await realpath(absolutePath);
  relativeWithin(cwd, physical, `${requirement.role} physical path`);
  if (
    !before.isFile()
    || before.isSymbolicLink()
    || before.nlink !== 1n
    || before.size <= 0n
    || before.size > BigInt(MAX_SOURCE_BYTES)
  ) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_SOURCE_INVALID: ${requirement.role} is not one bounded regular single-link file.`
    );
  }
  const bytes = await readFile(absolutePath);
  const after = await lstat(absolutePath, { bigint: true });
  if (
    before.dev !== after.dev
    || before.ino !== after.ino
    || before.birthtimeNs !== after.birthtimeNs
    || before.size !== after.size
    || before.mtimeNs !== after.mtimeNs
    || before.ctimeNs !== after.ctimeNs
    || bytes.length !== Number(after.size)
  ) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_SOURCE_CHANGED: ${requirement.role} changed during read.`
    );
  }
  const value = parseSwAbUpdateRuntimeApiTranscriptJsonBytes(bytes, requirement.role);
  return Object.freeze({
    value,
    binding: Object.freeze({
      role: requirement.role,
      path: requirement.path,
      size: bytes.length,
      rawSha256: sha256(bytes),
      canonicalSha256: sha256(canonicalJson(value))
    }),
    physical: comparablePath(physical),
    inodeKey: `${after.dev}\0${after.ino}\0${after.birthtimeNs}`
  });
}

function jsonFileBytes(value, maximumSize, label) {
  const bytes = Buffer.from(`${canonicalJson(value)}\n`, "utf8");
  if (bytes.length <= 0 || bytes.length > maximumSize) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_SIZE_LIMIT_EXCEEDED: ${label} exceeds its byte bound.`
    );
  }
  return bytes;
}

async function writeExclusiveFile(filePath, bytes) {
  const handle = await open(filePath, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function prepareOutputDirectory(cwd, outputDirectory) {
  const resolvedCwd = path.resolve(cwd);
  const resolvedOutput = path.resolve(outputDirectory);
  relativeWithin(resolvedCwd, resolvedOutput, "bundle output directory");
  const parent = path.dirname(resolvedOutput);
  const physicalCwd = await realpath(resolvedCwd);
  const physicalParent = await realpath(parent);
  relativeWithin(physicalCwd, physicalParent, "bundle output parent");
  try {
    await lstat(resolvedOutput);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(resolvedOutput, { recursive: false, mode: 0o700 });
    return resolvedOutput;
  }
  throw new Error(
    "SW_AB_RUNTIME_API_TRANSCRIPT_OVERWRITE_REFUSED: bundle output directory already exists."
  );
}

export async function writeSwAbUpdateRuntimeApiTranscriptBundle({
  cwd = process.cwd(),
  outputDirectory,
  runId,
  attemptId,
  capturedAt,
  origin,
  artifactBindings,
  tupleRecords
}) {
  if (!Array.isArray(tupleRecords) || tupleRecords.length !== 8) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_TUPLE_SET_INVALID: writer requires exactly eight tuple records."
    );
  }
  const sources = await Promise.all(
    SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS.map((requirement) =>
      readCheckedSource(cwd, requirement)
    )
  );
  if (
    new Set(sources.map((entry) => entry.physical)).size !== sources.length
    || new Set(sources.map((entry) => entry.inodeKey)).size !== sources.length
  ) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_PHYSICAL_ALIAS: checked source files must be physically distinct."
    );
  }
  const sourceByRole = new Map(sources.map((entry) => [entry.binding.role, entry]));
  const policy = sourceByRole.get("api-transcript-policy").value;
  validateSwAbUpdateRuntimeApiTranscriptPolicy(policy);
  const schemaValidator = compileSwAbUpdateRuntimeApiTranscriptSchema(
    sourceByRole.get("api-transcript-schema").value
  );
  const runtimePolicy = sourceByRole.get("runtime-capture-policy").value;
  const runtimeSchemaValidator = compileSwAbUpdateRuntimeClientCaptureSchema(
    sourceByRole.get("runtime-capture-schema").value
  );
  const tupleBytes = tupleRecords.map((record, index) =>
    jsonFileBytes(record, MAX_TUPLE_BYTES, `tuple ${index + 1}`)
  );
  const tupleBindings = tupleRecords.map((record, index) => Object.freeze({
    sequence: index + 1,
    projectName: record.projectName,
    phase: record.phase,
    slot: record.slot,
    path: SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[index],
    size: tupleBytes[index].length,
    sha256: sha256(tupleBytes[index]),
    recordDigest: record.recordDigest
  }));
  const sourceBindings = sources.map((entry) => entry.binding);
  const manifest = {
    schemaVersion: 1,
    recordType: "sw_ab_update_runtime_api_transcript_bundle_candidate_v1",
    trustClass: "untrusted_decoded_browser_api_transcript_candidate",
    status: "capture_incomplete",
    executionAdmission: "closed_missing_selected_https_origin",
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    runId,
    attemptId,
    capturedAt,
    origin,
    releaseIdentity: structuredClone(policy.releaseIdentity),
    capabilities: structuredClone(policy.capabilities),
    artifactBindings: structuredClone(artifactBindings),
    captureSurface: structuredClone(SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE),
    tupleBindings,
    sourceBindings,
    sourceSetDigest: sha256(canonicalJson(sourceBindings)),
    provenance: structuredClone(SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_PROVENANCE),
    authority: structuredClone(SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_AUTHORITY),
    bundleId: "swabapi1-" + "0".repeat(32),
    bundleDigest: "0".repeat(64)
  };
  manifest.bundleDigest = computeSwAbUpdateRuntimeApiTranscriptBundleDigest(manifest);
  manifest.bundleId = computeSwAbUpdateRuntimeApiTranscriptBundleId(manifest);
  const tupleInputs = tupleRecords.map((record, index) => ({
    record,
    binding: {
      path: tupleBindings[index].path,
      size: tupleBindings[index].size,
      sha256: tupleBindings[index].sha256
    }
  }));
  deriveSwAbUpdateRuntimeClientCaptureFromApiTranscript({
    manifest,
    tupleInputs,
    checkedSourceBindings: sourceBindings,
    policy,
    schemaValidator,
    runtimePolicy,
    runtimeSchemaValidator
  });
  const manifestBytes = jsonFileBytes(manifest, MAX_MANIFEST_BYTES, "bundle manifest");
  const preparedOutput = await prepareOutputDirectory(cwd, outputDirectory);
  for (let index = 0; index < tupleBytes.length; index += 1) {
    await writeExclusiveFile(
      path.join(preparedOutput, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[index]),
      tupleBytes[index]
    );
  }
  await writeExclusiveFile(
    path.join(preparedOutput, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE),
    manifestBytes
  );
  return Object.freeze({
    status: "capture_incomplete",
    outputDirectory: preparedOutput,
    bundleId: manifest.bundleId,
    bundleDigest: manifest.bundleDigest,
    tupleCount: 8,
    manifestPublishedLast: true,
    usableForRuntimeEvidence: false,
    cliExitCode: 1
  });
}
