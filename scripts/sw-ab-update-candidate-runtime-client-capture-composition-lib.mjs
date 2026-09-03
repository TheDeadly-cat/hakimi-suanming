import { isIP } from "node:net";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_AUTHORITY,
  SW_AB_UPDATE_CANDIDATE_CAPABILITIES,
  SW_AB_UPDATE_CANDIDATE_POLICY_PATH,
  SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY,
  computeSwAbUpdateCandidateEvidenceDigest,
  parseSwAbUpdateCandidateJsonBytes,
  validateSwAbUpdateCandidatePolicy,
  verifySwAbUpdateCandidate
} from "./sw-ab-update-candidate-lib.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH,
  compileSwAbUpdateCandidateSchema
} from "./sw-ab-update-candidate-schema.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES,
  parseSwAbUpdateRuntimeClientCaptureJsonBytes,
  validateSwAbUpdateRuntimeClientCapturePolicy
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeClientCapture
} from "./sw-ab-update-runtime-client-capture-loader.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH,
  compileSwAbUpdateRuntimeClientCaptureSchema
} from "./sw-ab-update-runtime-client-capture-schema.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_PATH,
  compileSwAbUpdateCandidateRuntimeClientCaptureCompositionSchema
} from "./sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_PATH =
  "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json";

const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_SET_BYTES = 32 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RUN_ID_PATTERN = /^run-[a-f0-9]{64}$/u;
const ATTEMPT_ID_PATTERN = /^attempt-[a-f0-9]{64}$/u;
const CLIENT_ID_PATTERN = /^client-[a-f0-9]{64}$/u;
const TARGET_ID_PATTERN = /^target-[a-f0-9]{64}$/u;
const CHALLENGE_PATTERN = /^challenge-[a-f0-9]{64}$/u;

const SOURCE_SPECS = Object.freeze([
  Object.freeze({
    role: "composition-policy",
    path: SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_PATH
  }),
  Object.freeze({
    role: "composition-schema",
    path: SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_PATH
  }),
  Object.freeze({ role: "sw-ab-update-policy", path: SW_AB_UPDATE_CANDIDATE_POLICY_PATH }),
  Object.freeze({ role: "sw-ab-update-schema", path: SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH }),
  Object.freeze({
    role: "runtime-client-capture-policy",
    path: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH
  }),
  Object.freeze({
    role: "runtime-client-capture-schema",
    path: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
  })
]);

const LIMITATIONS = Object.freeze([
  "runtime_capture_is_caller_supplied_page_adapter_untrusted",
  "runtime_capture_covers_only_page_target_and_read_only_sw_challenge",
  "candidate_document_controller_and_change_count_are_not_runtime_observed_here",
  "candidate_and_capture_remain_untrusted_non_formal_inputs",
  "synthetic_two_generation_fixture_is_not_an_admissible_input",
  "endpoint_snapshots_do_not_establish_continuous_mutation_or_aba_resistance",
  "composition_does_not_authorize_deployment_release_content_expert_or_rights_claims"
]);

const REQUIRED_CROSS_BINDINGS = Object.freeze([
  "run_and_attempt_identity",
  "canonical_https_origin",
  "legacy_v13_release_identity_and_capabilities",
  "artifact_a_and_b_identity",
  "phase_major_observation_tuple_order",
  "pseudonymous_window_client_identity",
  "pseudonymous_cdp_target_identity",
  "runtime_challenge_nonce",
  "shared_switch_chronology"
]);

const CLOSED_PROVENANCE_AND_CLAIMS = Object.freeze({
  callerSuppliedPageAuthenticityVerified: false,
  runtimeCollectorProvenanceVerified: false,
  twoClientRuntimeProvenanceVerified: false,
  documentGenerationRuntimeVerified: false,
  controllerTagRuntimeVerified: false,
  controllerChangeRuntimeVerified: false,
  serviceWorkerInstallWaitingActivationRuntimeVerified: false,
  sharedProviderSwitchRuntimeVerified: false,
  networkInterruptionRuntimeVerified: false,
  osProcessRestartProvenanceVerified: false,
  offlineColdStartRuntimeVerified: false,
  serviceWorkerResponseProvenanceVerified: false,
  cacheApiProvenanceVerified: false,
  staleAProductionWriteRuntimeVerified: false,
  realBrowserExecutionVerified: false,
  realHttpsHostVerified: false,
  trustedProviderVerified: false,
  trustedHostVerified: false,
  trustedBrowserRuntimeVerified: false,
  attemptFreshnessExternallyVerified: false,
  bundleReplayResistanceVerified: false,
  concurrentFilesystemMutationResistanceVerified: false,
  continuousMutationEpochVerified: false,
  abaResistanceVerified: false,
  aToBToARollbackVerified: false,
  defaultV13ReceiptAllowlistMember: false,
  formalReleaseEvidenceReceipt: false,
  deploymentReady: false,
  releaseReady: false,
  externalDeploymentExecutionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false,
  schemaPromotionAuthorized: false
});

const EXPECTED_CANDIDATE_RESULT_KEYS = Object.freeze([
  "schemaVersion",
  "resultType",
  "verificationKind",
  "internalConsistencyVerified",
  "trustClass",
  "status",
  "executionAdmission",
  "strictGatePassed",
  "usableForAdmission",
  "formalReleaseEvidenceReceipt",
  "attemptFreshnessExternallyVerified",
  "bundleReplayResistanceVerified",
  "runtimeCollectorProvenanceVerified",
  "osProcessRestartProvenanceVerified",
  "twoClientRuntimeProvenanceVerified",
  "serviceWorkerResponseProvenanceVerified",
  "cacheApiProvenanceVerified",
  "concurrentFilesystemMutationResistanceVerified",
  "runId",
  "attemptId",
  "evidenceDigest",
  "compositionProjection",
  "browserProjects",
  "authority",
  "verifierNetworkAttempted",
  "verifierBrowserAttempted",
  "verifierDeploymentAttempted",
  "code",
  "messageDigest"
]);

const EXPECTED_RUNTIME_RESULT_KEYS = Object.freeze([
  "code",
  "status",
  "executionAdmission",
  "internalConsistencyVerified",
  "implementedObservationScopeCount",
  "deferredObservationScopeCount",
  "observationCount",
  "compositionProjection",
  "callerSuppliedPageAuthenticityVerified",
  "runtimeCollectorProvenanceVerified",
  "osProcessRestartProvenanceVerified",
  "twoClientRuntimeProvenanceVerified",
  "serviceWorkerResponseProvenanceVerified",
  "cacheApiProvenanceVerified",
  "usableForCandidateAssembly",
  "formalReleaseEvidenceReceipt",
  "publicDeploymentAuthorized",
  "expertClaimsAuthorized",
  "verifierNetworkAttempted",
  "cliExitCode"
]);

export class SwAbUpdateCandidateRuntimeClientCaptureCompositionError extends Error {
  constructor(stage, code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "SwAbUpdateCandidateRuntimeClientCaptureCompositionError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new SwAbUpdateCandidateRuntimeClientCaptureCompositionError(
    stage,
    code,
    message,
    cause
  );
}

function requireCondition(condition, stage, code, message) {
  if (!condition) fail(stage, code, message);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function exactKeys(value, keys) {
  return isRecord(value) && exactJson(Object.keys(value).sort(), [...keys].sort());
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function immutableJsonSnapshot(value) {
  return deepFreezeJson(structuredClone(value));
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function requireAbsoluteCanonicalPath(value, label) {
  requireCondition(
    typeof value === "string"
      && value.length > 0
      && value.trim() === value
      && path.isAbsolute(value)
      && path.resolve(value) === value
      && !value.replaceAll("\\", "/").split("/").some((segment) =>
        segment === "." || segment === ".."
      ),
    "arguments",
    "SW_AB_COMPOSITION_PATH_INVALID",
    `${label} must be an exact resolved absolute path without dot segments.`
  );
  return value;
}

function relativeWithin(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  requireCondition(
    (allowEqual || relative !== "")
      && !path.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${path.sep}`),
    "arguments",
    "SW_AB_COMPOSITION_PATH_OUTSIDE_ROOT",
    `${label} escapes its required root.`
  );
  return relative.replaceAll("\\", "/");
}

function canonicalTimestamp(value, label) {
  const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;
  requireCondition(
    Number.isFinite(timestamp)
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
      && new Date(timestamp).toISOString() === value,
    "binding",
    "SW_AB_COMPOSITION_TIMESTAMP_INVALID",
    `${label} must be a canonical UTC timestamp.`
  );
  return timestamp;
}

function canonicalPublicHttpsOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    fail("binding", "SW_AB_COMPOSITION_ORIGIN_INVALID", "Composition origin is not a URL.", error);
  }
  const hostname = parsed.hostname;
  requireCondition(
    parsed.protocol === "https:"
      && parsed.username === ""
      && parsed.password === ""
      && parsed.port === ""
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      && parsed.origin === value
      && hostname === hostname.toLowerCase()
      && hostname.includes(".")
      && isIP(hostname) === 0
      && !["localhost", "invalid", "test", "example"].includes(hostname.split(".").at(-1)),
    "binding",
    "SW_AB_COMPOSITION_ORIGIN_INVALID",
    "Composition origin must be one canonical public-DNS HTTPS origin."
  );
  return value;
}

export function parseSwAbUpdateCandidateRuntimeClientCaptureCompositionInput(input) {
  const keys = [
    "bindingRoot",
    "candidateInputPath",
    "attachmentsRoot",
    "privateRoot",
    "artifactARoot",
    "artifactBRoot",
    "runtimeCaptureInputPath"
  ];
  requireCondition(
    exactKeys(input, keys),
    "arguments",
    "SW_AB_COMPOSITION_INPUT_INVALID",
    "Composition input must contain exactly seven explicit filesystem bindings."
  );
  const parsed = Object.fromEntries(keys.map((key) => [
    key,
    requireAbsoluteCanonicalPath(input[key], key)
  ]));
  for (const [key, candidate] of Object.entries(parsed)) {
    if (key !== "bindingRoot") relativeWithin(parsed.bindingRoot, candidate, key);
  }
  relativeWithin(parsed.privateRoot, parsed.candidateInputPath, "candidate input");
  requireCondition(
    comparablePath(parsed.candidateInputPath) !== comparablePath(parsed.runtimeCaptureInputPath),
    "arguments",
    "SW_AB_COMPOSITION_INPUT_ALIAS",
    "Candidate evidence and runtime capture must be distinct files."
  );
  return Object.freeze(parsed);
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

function identityProjection(stat, resolvedPath) {
  return Object.freeze({
    realPath: comparablePath(resolvedPath),
    dev: String(stat.dev),
    ino: String(stat.ino),
    birthtimeNs: String(stat.birthtimeNs),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
    nlink: String(stat.nlink)
  });
}

async function readOpenedFileBounded(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.length) {
    const { bytesRead } = await handle.read(target, offset, target.length - offset, null);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

async function readStableFile({ bindingRoot, requiredRoot, filePath, label, maximumSize }) {
  const absolutePath = path.resolve(filePath);
  const bindingPath = relativeWithin(bindingRoot, absolutePath, `${label} binding`);
  relativeWithin(requiredRoot, absolutePath, label);
  let pathBefore;
  let resolvedBefore;
  try {
    pathBefore = await lstat(absolutePath, { bigint: true });
    resolvedBefore = await realpath(absolutePath);
  } catch (error) {
    fail("filesystem", "SW_AB_COMPOSITION_FILE_UNREADABLE", `${label} is unreadable.`, error);
  }
  requireCondition(
    pathBefore.isFile()
      && !pathBefore.isSymbolicLink()
      && pathBefore.nlink === 1n
      && pathBefore.size > 0n
      && pathBefore.size <= BigInt(maximumSize),
    "filesystem",
    "SW_AB_COMPOSITION_FILE_INVALID",
    `${label} must be one bounded regular single-link file.`
  );
  relativeWithin(bindingRoot, resolvedBefore, `${label} physical path`);
  relativeWithin(requiredRoot, resolvedBefore, `${label} physical required path`);
  let handle;
  try {
    handle = await open(absolutePath, "r");
  } catch (error) {
    fail("filesystem", "SW_AB_COMPOSITION_FILE_OPEN_FAILED", `${label} could not be opened.`, error);
  }
  try {
    const before = await handle.stat({ bigint: true });
    requireCondition(
      sameIdentity(pathBefore, before)
        && before.isFile()
        && !before.isSymbolicLink()
        && before.nlink === 1n
        && before.size > 0n
        && before.size <= BigInt(maximumSize),
      "filesystem",
      "SW_AB_COMPOSITION_FILE_REBOUND",
      `${label} path changed or exceeded its bound before its held read.`
    );
    const bytes = await readOpenedFileBounded(handle, Number(before.size));
    const after = await handle.stat({ bigint: true });
    const pathAfter = await lstat(absolutePath, { bigint: true });
    const resolvedAfter = await realpath(absolutePath);
    requireCondition(
      sameIdentity(before, after)
        && sameIdentity(after, pathAfter)
        && pathAfter.isFile()
        && !pathAfter.isSymbolicLink()
        && after.nlink === 1n
        && pathAfter.nlink === 1n
        && before.size === after.size
        && before.mtimeNs === after.mtimeNs
        && before.ctimeNs === after.ctimeNs
        && after.size === pathAfter.size
        && after.mtimeNs === pathAfter.mtimeNs
        && after.ctimeNs === pathAfter.ctimeNs
        && bytes.length === Number(before.size)
        && comparablePath(resolvedBefore) === comparablePath(resolvedAfter),
      "filesystem",
      "SW_AB_COMPOSITION_FILE_CHANGED",
      `${label} changed during its held read.`
    );
    relativeWithin(bindingRoot, resolvedAfter, `${label} terminal physical path`);
    relativeWithin(requiredRoot, resolvedAfter, `${label} terminal physical required path`);
    return Object.freeze({
      bytes,
      binding: Object.freeze({ path: bindingPath, size: bytes.length, sha256: sha256(bytes) }),
      identity: identityProjection(after, resolvedAfter)
    });
  } finally {
    await handle.close();
  }
}

function snapshotFingerprint(snapshot) {
  return Object.freeze({ binding: snapshot.binding, identity: snapshot.identity });
}

function assertSnapshotMatch(initial, terminal, label) {
  requireCondition(
    exactJson(snapshotFingerprint(initial), snapshotFingerprint(terminal)),
    "mutation",
    "SW_AB_COMPOSITION_ENDPOINT_SNAPSHOT_CHANGED",
    `${label} changed between endpoint snapshots.`
  );
}

export function validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy(policy) {
  requireCondition(
    exactKeys(policy, [
      "schemaVersion",
      "policyId",
      "evidenceClass",
      "releaseIdentity",
      "capabilities",
      "requiredBrowserProjects",
      "requiredPhases",
      "requiredSlots",
      "requiredCrossBindings",
      "executionAdmission",
      "terminalState",
      "provenance",
      "authority"
    ])
      && policy.schemaVersion === 1
      && policy.policyId
        === "hakimi.web-v1.sw-ab-update-candidate-runtime-client-capture-composition/v1"
      && policy.evidenceClass === "offline_untrusted_supplemental_crosscheck"
      && exactJson(policy.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(policy.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && exactJson(policy.requiredBrowserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
      && exactJson(policy.requiredPhases, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES)
      && exactJson(policy.requiredSlots, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
      && exactJson(policy.requiredCrossBindings, REQUIRED_CROSS_BINDINGS)
      && policy.executionAdmission === "closed_missing_https_origin"
      && exactJson(policy.terminalState, {
        trustClass: "untrusted_candidate_composition",
        status: "not_admitted",
        strictGatePassed: false,
        usableForCandidateAssembly: false,
        usableForAdmission: false,
        formalReleaseEvidenceReceipt: false,
        cliExitCode: 1
      })
      && exactJson(policy.provenance, {
        callerSuppliedPageAuthenticityVerified: false,
        runtimeCollectorProvenanceVerified: false,
        twoClientRuntimeProvenanceVerified: false,
        serviceWorkerResponseProvenanceVerified: false,
        osProcessRestartProvenanceVerified: false,
        cacheApiProvenanceVerified: false,
        attemptFreshnessExternallyVerified: false,
        bundleReplayResistanceVerified: false,
        concurrentFilesystemMutationResistanceVerified: false
      })
      && exactJson(policy.authority, SW_AB_UPDATE_CANDIDATE_AUTHORITY),
    "policy",
    "SW_AB_COMPOSITION_POLICY_INVALID",
    "Composition policy drifted from its exact closed legacy-v13 boundary."
  );
  return policy;
}

async function readCheckedSources(input) {
  const snapshots = [];
  let totalBytes = 0;
  for (const spec of SOURCE_SPECS) {
    const remaining = MAX_SOURCE_SET_BYTES - totalBytes;
    requireCondition(
      remaining > 0,
      "source",
      "SW_AB_COMPOSITION_SOURCE_SET_SIZE_INVALID",
      "Composition checked source set exceeds its aggregate limit."
    );
    const absolutePath = path.resolve(input.bindingRoot, ...spec.path.split("/"));
    const snapshot = await readStableFile({
      bindingRoot: input.bindingRoot,
      requiredRoot: input.bindingRoot,
      filePath: absolutePath,
      label: spec.role,
      maximumSize: Math.min(MAX_SOURCE_BYTES, remaining)
    });
    totalBytes += snapshot.binding.size;
    requireCondition(
      snapshot.binding.path === spec.path,
      "source",
      "SW_AB_COMPOSITION_SOURCE_PATH_INVALID",
      `${spec.role} is not at its frozen checked path.`
    );
    const value = parseSwAbUpdateCandidateJsonBytes(snapshot.bytes, spec.role);
    snapshots.push(Object.freeze({
      spec,
      snapshot,
      value,
      canonicalSha256: sha256(canonicalJson(value))
    }));
  }
  validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy(snapshots[0].value);
  let compositionSchemaValidator;
  try {
    compositionSchemaValidator =
      compileSwAbUpdateCandidateRuntimeClientCaptureCompositionSchema(snapshots[1].value);
    validateSwAbUpdateCandidatePolicy(snapshots[2].value);
    compileSwAbUpdateCandidateSchema(snapshots[3].value);
    validateSwAbUpdateRuntimeClientCapturePolicy(snapshots[4].value);
    compileSwAbUpdateRuntimeClientCaptureSchema(snapshots[5].value);
  } catch (error) {
    fail(
      "source",
      "SW_AB_COMPOSITION_CHECKED_SOURCE_INVALID",
      "One checked policy or Schema failed its authoritative validation.",
      error
    );
  }
  return Object.freeze({ snapshots: Object.freeze(snapshots), compositionSchemaValidator });
}

function sourceBindings(sourceSet) {
  return Object.freeze(sourceSet.snapshots.map(({ spec, snapshot, canonicalSha256 }) =>
    Object.freeze({
      role: spec.role,
      path: snapshot.binding.path,
      size: snapshot.binding.size,
      sha256: snapshot.binding.sha256,
      canonicalSha256
    })
  ));
}

function assertSourceSetsMatch(initial, terminal) {
  requireCondition(
    initial.snapshots.length === terminal.snapshots.length,
    "mutation",
    "SW_AB_COMPOSITION_SOURCE_SET_CHANGED",
    "Checked source count changed between endpoint snapshots."
  );
  for (let index = 0; index < initial.snapshots.length; index += 1) {
    const left = initial.snapshots[index];
    const right = terminal.snapshots[index];
    requireCondition(
      exactJson(left.spec, right.spec)
        && left.canonicalSha256 === right.canonicalSha256,
      "mutation",
      "SW_AB_COMPOSITION_SOURCE_SET_CHANGED",
      `Checked source ${left.spec.role} changed semantically between endpoints.`
    );
    assertSnapshotMatch(left.snapshot, right.snapshot, left.spec.role);
  }
}

function assertVerifierSourceBindingsMatch(sourceSet, candidateEndpoint, runtimeEndpoint) {
  const checked = sourceBindings(sourceSet);
  const expectedCandidate = checked.filter(({ role }) =>
    role === "sw-ab-update-policy" || role === "sw-ab-update-schema"
  );
  const expectedRuntime = checked.filter(({ role }) =>
    role === "runtime-client-capture-policy" || role === "runtime-client-capture-schema"
  );
  requireCondition(
    exactJson(candidateEndpoint.sourceBindings, expectedCandidate),
    "mutation",
    "SW_AB_COMPOSITION_CANDIDATE_SOURCE_BINDING_MISMATCH",
    "Candidate verifier did not consume the checked candidate policy and Schema bytes."
  );
  requireCondition(
    exactJson(runtimeEndpoint.sourceBindings, expectedRuntime),
    "mutation",
    "SW_AB_COMPOSITION_RUNTIME_SOURCE_BINDING_MISMATCH",
    "Runtime verifier did not consume the checked runtime policy and Schema bytes."
  );
}

function assertDistinctPhysicalCompositionInputs(sourceSet, candidateEndpoint, runtimeEndpoint) {
  const identities = [
    ...sourceSet.snapshots.map(({ snapshot }) => snapshot.identity),
    candidateEndpoint.inputIdentity,
    runtimeEndpoint.endpointFingerprint.input.identity
  ];
  const realPaths = identities.map((identity) => identity.realPath);
  const inodeKeys = identities.map((identity) =>
    `${identity.dev}\0${identity.ino}\0${identity.birthtimeNs}`
  );
  requireCondition(
    new Set(realPaths).size === identities.length
      && new Set(inodeKeys).size === identities.length,
    "filesystem",
    "SW_AB_COMPOSITION_PHYSICAL_INPUT_ALIAS",
    "Candidate, runtime, policy, and Schema inputs must be distinct physical files."
  );
}

function assertCandidateVerification(result) {
  requireCondition(
    exactKeys(result, EXPECTED_CANDIDATE_RESULT_KEYS)
      && result.schemaVersion === 1
      && result.resultType === "sw_ab_update_candidate_offline_verification_v1"
      && result.verificationKind === "offline_no_git_no_network_no_browser_no_deployment"
      && result.internalConsistencyVerified === true
      && result.trustClass === "untrusted_candidate"
      && result.status === "not_admitted"
      && result.executionAdmission === "closed_missing_https_origin"
      && result.strictGatePassed === false
      && result.usableForAdmission === false
      && result.formalReleaseEvidenceReceipt === false
      && result.attemptFreshnessExternallyVerified === false
      && result.bundleReplayResistanceVerified === false
      && result.runtimeCollectorProvenanceVerified === false
      && result.osProcessRestartProvenanceVerified === false
      && result.twoClientRuntimeProvenanceVerified === false
      && result.serviceWorkerResponseProvenanceVerified === false
      && result.cacheApiProvenanceVerified === false
      && result.concurrentFilesystemMutationResistanceVerified === false
      && exactJson(result.browserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
      && exactJson(result.authority, SW_AB_UPDATE_CANDIDATE_AUTHORITY)
      && result.verifierNetworkAttempted === false
      && result.verifierBrowserAttempted === false
      && result.verifierDeploymentAttempted === false
      && result.code === "SW_AB_UPDATE_CANDIDATE_INTERNALLY_CONSISTENT_NOT_ADMITTED"
      && SHA256_PATTERN.test(result.messageDigest ?? "")
      && isRecord(result.compositionProjection),
    "candidate",
    "SW_AB_COMPOSITION_CANDIDATE_RESULT_INVALID",
    "Candidate verifier did not return its exact internally-consistent closed result."
  );
}

function assertRuntimeVerification(result) {
  requireCondition(
    exactKeys(result, EXPECTED_RUNTIME_RESULT_KEYS)
      && result.status === "capture_incomplete"
      && result.executionAdmission === "closed_missing_https_origin"
      && result.internalConsistencyVerified === true
      && result.code
        === "SW_AB_RUNTIME_CLIENT_CAPTURE_INTERNALLY_CONSISTENT_BUT_INCOMPLETE"
      && result.implementedObservationScopeCount === 2
      && result.deferredObservationScopeCount === 8
      && result.observationCount === 8
      && result.callerSuppliedPageAuthenticityVerified === false
      && result.runtimeCollectorProvenanceVerified === false
      && result.osProcessRestartProvenanceVerified === false
      && result.twoClientRuntimeProvenanceVerified === false
      && result.serviceWorkerResponseProvenanceVerified === false
      && result.cacheApiProvenanceVerified === false
      && result.usableForCandidateAssembly === false
      && result.formalReleaseEvidenceReceipt === false
      && result.publicDeploymentAuthorized === false
      && result.expertClaimsAuthorized === false
      && result.verifierNetworkAttempted === false
      && result.cliExitCode === 1
      && isRecord(result.compositionProjection),
    "runtime",
    "SW_AB_COMPOSITION_RUNTIME_RESULT_INVALID",
    "Runtime verifier did not return its exact internally-consistent closed result."
  );
}

function validateArtifactBindings(bindings) {
  requireCondition(
    exactKeys(bindings, ["A", "B"])
      && ["A", "B"].every((label) => {
        const binding = bindings[label];
        return exactKeys(binding, [
          "label",
          "releaseEvidenceId",
          "buildVersion",
          "serviceWorkerSha256",
          "artifactSetDigest"
        ])
          && binding.label === label
          && /^hre1-[a-f0-9]{32}$/u.test(binding.releaseEvidenceId)
          && /^[a-f0-9]{12}$/u.test(binding.buildVersion)
          && SHA256_PATTERN.test(binding.serviceWorkerSha256)
          && SHA256_PATTERN.test(binding.artifactSetDigest);
      })
      && bindings.A.releaseEvidenceId !== bindings.B.releaseEvidenceId
      && bindings.A.buildVersion !== bindings.B.buildVersion
      && bindings.A.serviceWorkerSha256 !== bindings.B.serviceWorkerSha256
      && bindings.A.artifactSetDigest !== bindings.B.artifactSetDigest,
    "binding",
    "SW_AB_COMPOSITION_ARTIFACT_BINDING_INVALID",
    "Composition requires exact and distinct A/B artifact bindings."
  );
}

function candidateProofEntries(candidateProjection) {
  requireCondition(
    exactKeys(candidateProjection, [
      "projectionType",
      "runId",
      "attemptId",
      "canonicalHttpsOrigin",
      "releaseIdentity",
      "capabilities",
      "artifactBindings",
      "deploymentChronology",
      "browserReceipts",
      "capturedAt",
      "evidenceDigest"
    ])
      && candidateProjection.projectionType
        === "sw_ab_update_candidate_composition_projection_v1"
      && RUN_ID_PATTERN.test(candidateProjection.runId ?? "")
      && ATTEMPT_ID_PATTERN.test(candidateProjection.attemptId ?? "")
      && exactJson(candidateProjection.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(candidateProjection.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && SHA256_PATTERN.test(candidateProjection.evidenceDigest ?? ""),
    "candidate",
    "SW_AB_COMPOSITION_CANDIDATE_PROJECTION_INVALID",
    "Candidate composition projection shape or fixed release boundary is invalid."
  );
  canonicalPublicHttpsOrigin(candidateProjection.canonicalHttpsOrigin);
  validateArtifactBindings(candidateProjection.artifactBindings);
  requireCondition(
    Array.isArray(candidateProjection.browserReceipts)
      && exactJson(
        candidateProjection.browserReceipts.map((receipt) => receipt.projectName),
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS
      ),
    "candidate",
    "SW_AB_COMPOSITION_CANDIDATE_BROWSER_SET_INVALID",
    "Candidate projection must contain Edge then Chrome exactly once."
  );
  const entries = [];
  for (const receipt of candidateProjection.browserReceipts) {
    requireCondition(
      exactKeys(receipt, [
        "projectName",
        "capturedAt",
        "initialAClients",
        "postClaimClients",
        "timeline"
      ])
        && exactKeys(receipt.timeline, [
          "twoArtifactAClientsControlledAt",
          "artifactBActivationAndClaimObservedAt",
          "oneADocumentReloadedToBAt",
          "staleAProductionWriteRejectedAt"
        ])
        && exactJson(receipt.initialAClients.map((proof) => proof.slot),
          SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
        && exactJson(receipt.postClaimClients.map((proof) => proof.slot),
          SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS),
      "candidate",
      "SW_AB_COMPOSITION_CANDIDATE_CLIENT_SET_INVALID",
      `${receipt.projectName} candidate client projection is not exact.`
    );
    for (const [phase, proofs] of [
      ["initial-a", receipt.initialAClients],
      ["post-claim", receipt.postClaimClients]
    ]) {
      for (const proof of proofs) {
        const expected = phase === "initial-a"
          ? { documentTag: "A", controllerTag: "A", controllerChangeCount: 0 }
          : proof.slot === "retained-old-a"
            ? { documentTag: "A", controllerTag: "B", controllerChangeCount: 1 }
            : { documentTag: "B", controllerTag: "B", controllerChangeCount: 1 };
        requireCondition(
          exactKeys(proof, [
            "slot",
            "documentTag",
            "controllerTag",
            "clientId",
            "cdpTargetId",
            "challengeNonce",
            "challengeResponseDigest",
            "controllerChangeCount"
          ])
            && proof.documentTag === expected.documentTag
            && proof.controllerTag === expected.controllerTag
            && proof.controllerChangeCount === expected.controllerChangeCount
            && CLIENT_ID_PATTERN.test(proof.clientId)
            && TARGET_ID_PATTERN.test(proof.cdpTargetId)
            && CHALLENGE_PATTERN.test(proof.challengeNonce)
            && SHA256_PATTERN.test(proof.challengeResponseDigest),
          "candidate",
          "SW_AB_COMPOSITION_CANDIDATE_CLIENT_INVALID",
          `${receipt.projectName} ${phase} ${proof.slot} candidate client is invalid.`
        );
        entries.push(Object.freeze({
          projectName: receipt.projectName,
          phase,
          slot: proof.slot,
          receipt,
          proof
        }));
      }
    }
  }
  return Object.freeze(entries);
}

function runtimeObservationEntries(runtimeProjection) {
  requireCondition(
    exactKeys(runtimeProjection, [
      "projectionType",
      "runId",
      "attemptId",
      "canonicalHttpsOrigin",
      "releaseIdentity",
      "capabilities",
      "artifactBindings",
      "observations",
      "capturedAt",
      "evidenceDigest"
    ])
      && runtimeProjection.projectionType
        === "sw_ab_update_runtime_client_capture_composition_projection_v1"
      && RUN_ID_PATTERN.test(runtimeProjection.runId ?? "")
      && ATTEMPT_ID_PATTERN.test(runtimeProjection.attemptId ?? "")
      && exactJson(runtimeProjection.releaseIdentity, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY)
      && exactJson(runtimeProjection.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
      && SHA256_PATTERN.test(runtimeProjection.evidenceDigest ?? "")
      && Array.isArray(runtimeProjection.observations)
      && exactJson(
        runtimeProjection.observations.map(({ projectName, phase, slot }) => ({
          projectName,
          phase,
          slot
        })),
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
      ),
    "runtime",
    "SW_AB_COMPOSITION_RUNTIME_PROJECTION_INVALID",
    "Runtime composition projection shape, tuple order, or fixed release boundary is invalid."
  );
  canonicalPublicHttpsOrigin(runtimeProjection.canonicalHttpsOrigin);
  validateArtifactBindings(runtimeProjection.artifactBindings);
  for (let index = 0; index < runtimeProjection.observations.length; index += 1) {
    const observation = runtimeProjection.observations[index];
    requireCondition(
      exactKeys(observation, [
        "projectName",
        "phase",
        "slot",
        "sequence",
        "observedAt",
        "pseudonymousClientId",
        "pseudonymousTargetId",
        "challengeNonce",
        "runtimeRequestDigest",
        "runtimeResponseDigest",
        "runtimeObservationDigest"
      ])
        && observation.sequence === index + 1
        && CLIENT_ID_PATTERN.test(observation.pseudonymousClientId)
        && TARGET_ID_PATTERN.test(observation.pseudonymousTargetId)
        && CHALLENGE_PATTERN.test(observation.challengeNonce)
        && SHA256_PATTERN.test(observation.runtimeRequestDigest)
        && SHA256_PATTERN.test(observation.runtimeResponseDigest)
        && SHA256_PATTERN.test(observation.runtimeObservationDigest),
      "runtime",
      "SW_AB_COMPOSITION_RUNTIME_OBSERVATION_INVALID",
      `Runtime observation ${index + 1} is invalid.`
    );
    canonicalTimestamp(observation.observedAt, `runtime observation ${index + 1}`);
  }
  return runtimeProjection.observations;
}

function tupleKey({ projectName, phase, slot }) {
  return `${projectName}\0${phase}\0${slot}`;
}

function requireInputBinding(binding, projection, label) {
  requireCondition(
    exactKeys(binding, ["path", "size", "sha256"])
      && typeof binding.path === "string"
      && binding.path.length > 0
      && Number.isSafeInteger(binding.size)
      && binding.size > 0
      && binding.size <= MAX_INPUT_BYTES
      && SHA256_PATTERN.test(binding.sha256 ?? "")
      && SHA256_PATTERN.test(projection.evidenceDigest ?? ""),
    "binding",
    "SW_AB_COMPOSITION_INPUT_BINDING_INVALID",
    `${label} input binding is invalid.`
  );
  return Object.freeze({
    path: binding.path,
    size: binding.size,
    sha256: binding.sha256,
    evidenceDigest: projection.evidenceDigest,
    capturedAt: projection.capturedAt
  });
}

function validateCompositionChronology(candidateProjection, runtimeProjection, runtimeByTuple) {
  const chronology = candidateProjection.deploymentChronology;
  requireCondition(
    exactKeys(chronology, [
      "edgeTwoAClientsReadyAt",
      "chromeTwoAClientsReadyAt",
      "artifactBProviderSwitchStartedAt",
      "bothBrowsersBActivatedAndClaimedAt",
      "bothOldAWritesRejectedAt"
    ]),
    "chronology",
    "SW_AB_COMPOSITION_CHRONOLOGY_INVALID",
    "Candidate shared chronology projection is not exact."
  );
  const globalTimes = Object.fromEntries(Object.entries(chronology).map(([key, value]) => [
    key,
    canonicalTimestamp(value, key)
  ]));
  requireCondition(
    globalTimes.edgeTwoAClientsReadyAt < globalTimes.chromeTwoAClientsReadyAt
      && globalTimes.chromeTwoAClientsReadyAt < globalTimes.artifactBProviderSwitchStartedAt
      && globalTimes.artifactBProviderSwitchStartedAt
        < globalTimes.bothBrowsersBActivatedAndClaimedAt
      && globalTimes.bothBrowsersBActivatedAndClaimedAt
        < globalTimes.bothOldAWritesRejectedAt,
    "chronology",
    "SW_AB_COMPOSITION_SHARED_SWITCH_ORDER_INVALID",
    "Candidate shared A-to-B switch chronology is not strictly ordered."
  );
  const initialTimes = runtimeProjection.observations
    .filter((entry) => entry.phase === "initial-a")
    .map((entry) => canonicalTimestamp(entry.observedAt, "initial runtime observation"));
  const postTimes = runtimeProjection.observations
    .filter((entry) => entry.phase === "post-claim")
    .map((entry) => canonicalTimestamp(entry.observedAt, "post-claim runtime observation"));
  requireCondition(
    Math.max(...initialTimes) < Math.min(...postTimes),
    "chronology",
    "SW_AB_COMPOSITION_PHASE_BARRIER_INVALID",
    "All cross-browser initial observations must precede every post-claim observation."
  );
  for (const receipt of candidateProjection.browserReceipts) {
    const timeline = Object.fromEntries(Object.entries(receipt.timeline).map(([key, value]) => [
      key,
      canonicalTimestamp(value, `${receipt.projectName} ${key}`)
    ]));
    const readyAt = receipt.projectName === "msedge"
      ? globalTimes.edgeTwoAClientsReadyAt
      : globalTimes.chromeTwoAClientsReadyAt;
    requireCondition(
      timeline.twoArtifactAClientsControlledAt === readyAt
        && timeline.artifactBActivationAndClaimObservedAt
          <= globalTimes.bothBrowsersBActivatedAndClaimedAt
        && timeline.staleAProductionWriteRejectedAt <= globalTimes.bothOldAWritesRejectedAt,
      "chronology",
      "SW_AB_COMPOSITION_CANDIDATE_TIMELINE_PROJECTION_INVALID",
      `${receipt.projectName} receipt chronology does not project into the shared ledger.`
    );
    const initialProjectTimes = SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS.map((slot) =>
      canonicalTimestamp(
        runtimeByTuple.get(tupleKey({ projectName: receipt.projectName, phase: "initial-a", slot }))
          .observedAt,
        `${receipt.projectName} initial ${slot}`
      )
    );
    const postRetainedAt = canonicalTimestamp(
      runtimeByTuple.get(tupleKey({
        projectName: receipt.projectName,
        phase: "post-claim",
        slot: "retained-old-a"
      })).observedAt,
      `${receipt.projectName} post retained`
    );
    const postReloadAt = canonicalTimestamp(
      runtimeByTuple.get(tupleKey({
        projectName: receipt.projectName,
        phase: "post-claim",
        slot: "reload-to-b"
      })).observedAt,
      `${receipt.projectName} post reload`
    );
    const receiptCapturedAt = canonicalTimestamp(receipt.capturedAt, `${receipt.projectName} receipt`);
    requireCondition(
      Math.max(...initialProjectTimes) <= timeline.twoArtifactAClientsControlledAt
        && globalTimes.bothBrowsersBActivatedAndClaimedAt <= postRetainedAt
        && timeline.artifactBActivationAndClaimObservedAt <= postRetainedAt
        && timeline.oneADocumentReloadedToBAt <= postReloadAt
        && postRetainedAt <= timeline.staleAProductionWriteRejectedAt
        && postReloadAt <= timeline.staleAProductionWriteRejectedAt
        && timeline.staleAProductionWriteRejectedAt <= receiptCapturedAt,
      "chronology",
      "SW_AB_COMPOSITION_RUNTIME_CANDIDATE_TIME_INVALID",
      `${receipt.projectName} runtime observations do not fit the candidate shared-switch windows.`
    );
  }
  requireCondition(
    canonicalTimestamp(runtimeProjection.capturedAt, "runtime capture")
      <= canonicalTimestamp(candidateProjection.capturedAt, "candidate capture"),
    "chronology",
    "SW_AB_COMPOSITION_CAPTURE_ORDER_INVALID",
    "Runtime capture must be complete before the terminal candidate evidence capture."
  );
  return immutableJsonSnapshot({
    ...candidateProjection.deploymentChronology,
    browserReceipts: candidateProjection.browserReceipts.map((receipt) => ({
      projectName: receipt.projectName,
      capturedAt: receipt.capturedAt,
      ...receipt.timeline
    })),
    runtimeCaptureCapturedAt: runtimeProjection.capturedAt,
    candidateCapturedAt: candidateProjection.capturedAt
  });
}

function mappingIdentity(mapping) {
  const unsigned = structuredClone(mapping);
  delete unsigned.mappingDigest;
  return sha256(canonicalJson({
    namespace: "hakimi-sw-ab-candidate-runtime-client-mapping-v1",
    ...unsigned
  }));
}

export function validateSwAbUpdateCandidateRuntimeClientCaptureCompositionProjections({
  candidateVerification,
  runtimeVerification,
  candidateInputBinding,
  runtimeInputBinding
}) {
  assertCandidateVerification(candidateVerification);
  assertRuntimeVerification(runtimeVerification);
  const candidate = candidateVerification.compositionProjection;
  const runtime = runtimeVerification.compositionProjection;
  const candidateEntries = candidateProofEntries(candidate);
  const runtimeEntries = runtimeObservationEntries(runtime);
  requireCondition(
    candidateVerification.runId === candidate.runId
      && candidateVerification.attemptId === candidate.attemptId
      && candidateVerification.evidenceDigest === candidate.evidenceDigest,
    "candidate",
    "SW_AB_COMPOSITION_CANDIDATE_RESULT_PROJECTION_MISMATCH",
    "Candidate result identity does not match its immutable composition projection."
  );
  requireCondition(
    candidate.runId === runtime.runId
      && candidate.attemptId === runtime.attemptId
      && candidate.canonicalHttpsOrigin === runtime.canonicalHttpsOrigin
      && exactJson(candidate.releaseIdentity, runtime.releaseIdentity)
      && exactJson(candidate.capabilities, runtime.capabilities),
    "binding",
    "SW_AB_COMPOSITION_SCOPE_MISMATCH",
    "Candidate and runtime capture do not share the exact run, attempt, origin, or v13 scope."
  );
  requireCondition(
    exactJson(candidate.artifactBindings, runtime.artifactBindings),
    "binding",
    "SW_AB_COMPOSITION_ARTIFACT_MISMATCH",
    "Candidate and runtime capture A/B artifact bindings differ."
  );
  const candidateByTuple = new Map(candidateEntries.map((entry) => [tupleKey(entry), entry]));
  const runtimeByTuple = new Map(runtimeEntries.map((entry) => [tupleKey(entry), entry]));
  requireCondition(
    candidateByTuple.size === 8
      && runtimeByTuple.size === 8
      && SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.every((tuple) =>
        candidateByTuple.has(tupleKey(tuple)) && runtimeByTuple.has(tupleKey(tuple))
      ),
    "binding",
    "SW_AB_COMPOSITION_TUPLE_SET_MISMATCH",
    "Candidate and runtime capture do not expose the exact eight tuple keys."
  );
  const mappings = runtimeEntries.map((observation) => {
    const candidateEntry = candidateByTuple.get(tupleKey(observation));
    const proof = candidateEntry.proof;
    requireCondition(
      proof.clientId === observation.pseudonymousClientId,
      "binding",
      "SW_AB_COMPOSITION_CLIENT_ID_MISMATCH",
      `${tupleKey(observation)} WindowClient pseudonym differs.`
    );
    requireCondition(
      proof.cdpTargetId === observation.pseudonymousTargetId,
      "binding",
      "SW_AB_COMPOSITION_TARGET_ID_MISMATCH",
      `${tupleKey(observation)} CDP target pseudonym differs.`
    );
    requireCondition(
      proof.challengeNonce === observation.challengeNonce,
      "binding",
      "SW_AB_COMPOSITION_CHALLENGE_NONCE_MISMATCH",
      `${tupleKey(observation)} runtime challenge nonce differs.`
    );
    const mapping = {
      sequence: observation.sequence,
      projectName: observation.projectName,
      phase: observation.phase,
      slot: observation.slot,
      artifactLabel: observation.phase === "initial-a" ? "A" : "B",
      documentTag: proof.documentTag,
      controllerTag: proof.controllerTag,
      controllerChangeCount: proof.controllerChangeCount,
      pseudonymousClientId: observation.pseudonymousClientId,
      pseudonymousTargetId: observation.pseudonymousTargetId,
      challengeNonce: observation.challengeNonce,
      candidateChallengeResponseDigest: proof.challengeResponseDigest,
      runtimeRequestDigest: observation.runtimeRequestDigest,
      runtimeResponseDigest: observation.runtimeResponseDigest,
      runtimeObservationDigest: observation.runtimeObservationDigest,
      runtimeObservedAt: observation.observedAt
    };
    mapping.mappingDigest = mappingIdentity(mapping);
    return Object.freeze(mapping);
  });
  const chronologyBindings = validateCompositionChronology(candidate, runtime, runtimeByTuple);
  const candidateBinding = requireInputBinding(candidateInputBinding, candidate, "candidate");
  const runtimeBinding = requireInputBinding(runtimeInputBinding, runtime, "runtime capture");
  requireCondition(
    candidateBinding.path !== runtimeBinding.path
      && candidateBinding.sha256 !== runtimeBinding.sha256,
    "binding",
    "SW_AB_COMPOSITION_INPUT_BINDING_ALIAS",
    "Candidate and runtime capture input bindings must be distinct."
  );
  return immutableJsonSnapshot({
    scope: {
      runId: candidate.runId,
      attemptId: candidate.attemptId,
      canonicalHttpsOrigin: candidate.canonicalHttpsOrigin,
      releaseIdentity: candidate.releaseIdentity,
      capabilities: candidate.capabilities,
      browserProjects: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS,
      phases: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES,
      slots: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS
    },
    artifactBindings: candidate.artifactBindings,
    inputBindings: {
      candidate: candidateBinding,
      runtimeCapture: runtimeBinding
    },
    clientMappings: mappings,
    chronologyBindings
  });
}

function computeCompositionId(document) {
  return `swabrc1-${sha256(canonicalJson({
    namespace: "hakimi-sw-ab-candidate-runtime-client-composition-id-v1",
    scope: document.scope,
    artifactBindings: document.artifactBindings,
    inputBindings: document.inputBindings,
    clientMappings: document.clientMappings,
    chronologyBindings: document.chronologyBindings,
    sourceSetDigest: document.sourceSetDigest
  })).slice(0, 32)}`;
}

export function computeSwAbUpdateCandidateRuntimeClientCaptureCompositionIdentity(document) {
  const identityFree = structuredClone(document);
  delete identityFree.compositionId;
  delete identityFree.compositionDigest;
  const compositionId = computeCompositionId(identityFree);
  return Object.freeze({
    compositionId,
    compositionDigest: sha256(canonicalJson({ ...identityFree, compositionId }))
  });
}

function buildCompositionDocument(projection, checkedSourceBindings) {
  const document = {
    schemaVersion: 1,
    policyId:
      "hakimi.web-v1.sw-ab-update-candidate-runtime-client-capture-composition/v1",
    evidenceClass: "offline_untrusted_supplemental_crosscheck",
    requiredCrossBindings: REQUIRED_CROSS_BINDINGS,
    recordType: "sw_ab_update_candidate_runtime_client_capture_composition_v1",
    verificationKind: "offline_two_untrusted_candidate_verifiers_v1",
    trustClass: "untrusted_candidate_composition",
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    strictGatePassed: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    cliExitCode: 1,
    compositionId: "swabrc1-00000000000000000000000000000000",
    ...projection,
    sourceBindings: checkedSourceBindings,
    sourceSetDigest: sha256(canonicalJson(checkedSourceBindings)),
    mechanicalChecks: {
      candidateInternalConsistencyReverified: true,
      runtimeInternalConsistencyReverified: true,
      scopeMatched: true,
      artifactBindingsMatched: true,
      exactTupleSetMatched: true,
      pseudonymousClientIdsMatched: true,
      pseudonymousTargetIdsMatched: true,
      challengeNoncesMatched: true,
      continuityProjectionMatched: true,
      phaseBarrierProjectionMatched: true,
      inputEndpointSnapshotsMatched: true,
      compositionDigestMatched: true
    },
    limitations: LIMITATIONS,
    mutationBoundary: {
      candidateEndpointSnapshotsVerified: true,
      runtimeCaptureEndpointSnapshotsVerified: true,
      sourceEndpointSnapshotsVerified: true,
      intervalMutationExcluded: false,
      abaExcluded: false,
      mutationEpochCapability: "absent_schema13",
      epoch: null
    },
    attempts: {
      networkAttempted: false,
      browserAttempted: false,
      deploymentAttempted: false,
      rollbackAttempted: false,
      gitAttempted: false
    },
    provenanceAndClaims: CLOSED_PROVENANCE_AND_CLAIMS,
    compositionDigest: "0".repeat(64)
  };
  Object.assign(
    document,
    computeSwAbUpdateCandidateRuntimeClientCaptureCompositionIdentity(document)
  );
  return immutableJsonSnapshot(document);
}

function validateCompositionDocumentChronology(document) {
  const chronology = document.chronologyBindings;
  requireCondition(
    exactKeys(chronology, [
      "edgeTwoAClientsReadyAt",
      "chromeTwoAClientsReadyAt",
      "artifactBProviderSwitchStartedAt",
      "bothBrowsersBActivatedAndClaimedAt",
      "bothOldAWritesRejectedAt",
      "browserReceipts",
      "runtimeCaptureCapturedAt",
      "candidateCapturedAt"
    ])
      && Array.isArray(chronology.browserReceipts)
      && exactJson(
        chronology.browserReceipts.map((receipt) => receipt.projectName),
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS
      )
      && chronology.runtimeCaptureCapturedAt === document.inputBindings.runtimeCapture.capturedAt
      && chronology.candidateCapturedAt === document.inputBindings.candidate.capturedAt,
    "chronology",
    "SW_AB_COMPOSITION_DOCUMENT_CHRONOLOGY_INVALID",
    "Composition chronology bindings are incomplete or not bound to both input captures."
  );
  const global = Object.fromEntries([
    "edgeTwoAClientsReadyAt",
    "chromeTwoAClientsReadyAt",
    "artifactBProviderSwitchStartedAt",
    "bothBrowsersBActivatedAndClaimedAt",
    "bothOldAWritesRejectedAt",
    "runtimeCaptureCapturedAt",
    "candidateCapturedAt"
  ].map((key) => [key, canonicalTimestamp(chronology[key], `document ${key}`)]));
  requireCondition(
    global.edgeTwoAClientsReadyAt < global.chromeTwoAClientsReadyAt
      && global.chromeTwoAClientsReadyAt < global.artifactBProviderSwitchStartedAt
      && global.artifactBProviderSwitchStartedAt
        < global.bothBrowsersBActivatedAndClaimedAt
      && global.bothBrowsersBActivatedAndClaimedAt < global.bothOldAWritesRejectedAt
      && global.runtimeCaptureCapturedAt <= global.candidateCapturedAt,
    "chronology",
    "SW_AB_COMPOSITION_DOCUMENT_SHARED_SWITCH_ORDER_INVALID",
    "Composition shared-switch or terminal capture chronology is invalid."
  );
  const byTuple = new Map(document.clientMappings.map((mapping) => [tupleKey(mapping), mapping]));
  const initialTimes = document.clientMappings
    .filter((mapping) => mapping.phase === "initial-a")
    .map((mapping) => canonicalTimestamp(mapping.runtimeObservedAt, "document initial observation"));
  const postTimes = document.clientMappings
    .filter((mapping) => mapping.phase === "post-claim")
    .map((mapping) => canonicalTimestamp(mapping.runtimeObservedAt, "document post observation"));
  const allRuntimeTimes = document.clientMappings.map((mapping) =>
    canonicalTimestamp(mapping.runtimeObservedAt, "document runtime observation")
  );
  requireCondition(
    Math.max(...initialTimes) < Math.min(...postTimes)
      && allRuntimeTimes.every((value, index) =>
        index === 0 || value >= allRuntimeTimes[index - 1]
      )
      && Math.max(...allRuntimeTimes) <= global.runtimeCaptureCapturedAt,
    "chronology",
    "SW_AB_COMPOSITION_DOCUMENT_PHASE_BARRIER_INVALID",
    "Document runtime observations violate phase, sequence-time, or terminal capture order."
  );
  const browserTimesByProject = new Map();
  for (const receipt of chronology.browserReceipts) {
    requireCondition(
      exactKeys(receipt, [
        "projectName",
        "capturedAt",
        "twoArtifactAClientsControlledAt",
        "artifactBActivationAndClaimObservedAt",
        "oneADocumentReloadedToBAt",
        "staleAProductionWriteRejectedAt"
      ]),
      "chronology",
      "SW_AB_COMPOSITION_DOCUMENT_BROWSER_CHRONOLOGY_INVALID",
      `${receipt.projectName} document chronology shape is invalid.`
    );
    const times = Object.fromEntries(Object.entries(receipt)
      .filter(([key]) => key !== "projectName")
      .map(([key, value]) => [key, canonicalTimestamp(value, `${receipt.projectName} ${key}`)]));
    browserTimesByProject.set(receipt.projectName, times);
    const ready = receipt.projectName === "msedge"
      ? global.edgeTwoAClientsReadyAt
      : global.chromeTwoAClientsReadyAt;
    const initialProject = SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS.map((slot) =>
      canonicalTimestamp(byTuple.get(tupleKey({
        projectName: receipt.projectName,
        phase: "initial-a",
        slot
      })).runtimeObservedAt, `${receipt.projectName} initial ${slot}`)
    );
    const postRetained = canonicalTimestamp(byTuple.get(tupleKey({
      projectName: receipt.projectName,
      phase: "post-claim",
      slot: "retained-old-a"
    })).runtimeObservedAt, `${receipt.projectName} post retained`);
    const postReload = canonicalTimestamp(byTuple.get(tupleKey({
      projectName: receipt.projectName,
      phase: "post-claim",
      slot: "reload-to-b"
    })).runtimeObservedAt, `${receipt.projectName} post reload`);
    requireCondition(
      times.twoArtifactAClientsControlledAt === ready
        && times.twoArtifactAClientsControlledAt
          < times.artifactBActivationAndClaimObservedAt
        && global.artifactBProviderSwitchStartedAt
          < times.artifactBActivationAndClaimObservedAt
        && times.artifactBActivationAndClaimObservedAt < times.oneADocumentReloadedToBAt
        && global.bothBrowsersBActivatedAndClaimedAt < times.oneADocumentReloadedToBAt
        && times.oneADocumentReloadedToBAt < times.staleAProductionWriteRejectedAt
        && times.staleAProductionWriteRejectedAt < times.capturedAt
        && Math.max(...initialProject) <= ready
        && times.artifactBActivationAndClaimObservedAt
          <= global.bothBrowsersBActivatedAndClaimedAt
        && global.bothBrowsersBActivatedAndClaimedAt <= postRetained
        && times.artifactBActivationAndClaimObservedAt <= postRetained
        && times.oneADocumentReloadedToBAt <= postReload
        && postRetained <= times.staleAProductionWriteRejectedAt
        && postReload <= times.staleAProductionWriteRejectedAt
        && times.staleAProductionWriteRejectedAt <= global.bothOldAWritesRejectedAt
        && times.staleAProductionWriteRejectedAt <= times.capturedAt
        && global.bothOldAWritesRejectedAt < times.capturedAt
        && times.capturedAt <= global.candidateCapturedAt,
      "chronology",
      "SW_AB_COMPOSITION_DOCUMENT_RUNTIME_WINDOW_INVALID",
      `${receipt.projectName} document runtime observation windows are invalid.`
    );
  }
  const browserTimes = [...browserTimesByProject.values()];
  requireCondition(
    Math.max(...browserTimes.map((times) =>
      times.artifactBActivationAndClaimObservedAt
    )) < Math.min(...browserTimes.map((times) => times.oneADocumentReloadedToBAt))
      && Math.max(...browserTimes.map((times) =>
        times.oneADocumentReloadedToBAt
      )) < Math.min(...browserTimes.map((times) =>
        times.staleAProductionWriteRejectedAt
      )),
    "chronology",
    "SW_AB_COMPOSITION_DOCUMENT_CROSS_BROWSER_BARRIER_INVALID",
    "Document browser receipts violate shared activation, reload, or stale-write barriers."
  );
  requireCondition(
    global.bothBrowsersBActivatedAndClaimedAt === Math.max(
      ...browserTimes
        .map((times) => times.artifactBActivationAndClaimObservedAt)
    )
      && global.bothOldAWritesRejectedAt === Math.max(
        ...browserTimes
          .map((times) => times.staleAProductionWriteRejectedAt)
      ),
    "chronology",
    "SW_AB_COMPOSITION_DOCUMENT_SHARED_PROJECTION_INVALID",
    "Shared activation/claim and stale-write events must equal the two-browser maxima."
  );
}

function validateCompositionDocumentMappings(document) {
  const byTuple = new Map(document.clientMappings.map((mapping) => [tupleKey(mapping), mapping]));
  requireCondition(
    byTuple.size === 8
      && document.clientMappings.every((mapping, index) => {
        const expected = mapping.phase === "initial-a"
          ? {
              artifactLabel: "A",
              documentTag: "A",
              controllerTag: "A",
              controllerChangeCount: 0
            }
          : mapping.slot === "retained-old-a"
            ? {
                artifactLabel: "B",
                documentTag: "A",
                controllerTag: "B",
                controllerChangeCount: 1
              }
            : {
                artifactLabel: "B",
                documentTag: "B",
                controllerTag: "B",
                controllerChangeCount: 1
              };
        return mapping.sequence === index + 1
          && mapping.artifactLabel === expected.artifactLabel
          && mapping.documentTag === expected.documentTag
          && mapping.controllerTag === expected.controllerTag
          && mapping.controllerChangeCount === expected.controllerChangeCount;
      }),
    "identity",
    "SW_AB_COMPOSITION_DOCUMENT_MAPPING_SEMANTICS_INVALID",
    "Composition mappings do not preserve exact sequence, tuple uniqueness, or A/B client semantics."
  );
  for (const projectName of SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS) {
    const initialRetained = byTuple.get(tupleKey({
      projectName,
      phase: "initial-a",
      slot: "retained-old-a"
    }));
    const initialReload = byTuple.get(tupleKey({
      projectName,
      phase: "initial-a",
      slot: "reload-to-b"
    }));
    const postRetained = byTuple.get(tupleKey({
      projectName,
      phase: "post-claim",
      slot: "retained-old-a"
    }));
    const postReload = byTuple.get(tupleKey({
      projectName,
      phase: "post-claim",
      slot: "reload-to-b"
    }));
    requireCondition(
      initialRetained.pseudonymousClientId !== initialReload.pseudonymousClientId
        && postRetained.pseudonymousClientId !== postReload.pseudonymousClientId
        && initialRetained.pseudonymousTargetId !== initialReload.pseudonymousTargetId
        && postRetained.pseudonymousTargetId !== postReload.pseudonymousTargetId
        && initialRetained.pseudonymousClientId === postRetained.pseudonymousClientId
        && initialRetained.pseudonymousTargetId === postRetained.pseudonymousTargetId
        && initialReload.pseudonymousTargetId === postReload.pseudonymousTargetId
        && initialReload.pseudonymousClientId !== postReload.pseudonymousClientId,
      "identity",
      "SW_AB_COMPOSITION_DOCUMENT_CONTINUITY_INVALID",
      `${projectName} document client continuity projection is invalid.`
    );
  }
  const edge = document.clientMappings.filter((mapping) => mapping.projectName === "msedge");
  const chrome = document.clientMappings.filter((mapping) => mapping.projectName === "chrome");
  const overlaps = (left, right) => [...left].some((value) => right.has(value));
  requireCondition(
    !overlaps(
      new Set(edge.map((mapping) => mapping.pseudonymousClientId)),
      new Set(chrome.map((mapping) => mapping.pseudonymousClientId))
    )
      && !overlaps(
        new Set(edge.map((mapping) => mapping.pseudonymousTargetId)),
        new Set(chrome.map((mapping) => mapping.pseudonymousTargetId))
      )
      && new Set(document.clientMappings.map((mapping) => mapping.challengeNonce)).size === 8,
    "identity",
    "SW_AB_COMPOSITION_DOCUMENT_CROSS_BROWSER_ALIAS",
    "Composition mappings alias browser identities or runtime challenges."
  );
}

export function validateSwAbUpdateCandidateRuntimeClientCaptureCompositionDocument(
  document,
  schemaValidator
) {
  try {
    schemaValidator.assert(document);
  } catch (error) {
    fail(
      "schema",
      "SW_AB_COMPOSITION_DOCUMENT_SCHEMA_INVALID",
      "Composition document does not match its checked closed Schema.",
      error
    );
  }
  canonicalPublicHttpsOrigin(document.scope.canonicalHttpsOrigin);
  validateArtifactBindings(document.artifactBindings);
  requireCondition(
    exactJson(document.scope.browserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
      && exactJson(document.scope.phases, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES)
      && exactJson(document.scope.slots, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
      && exactJson(document.requiredCrossBindings, REQUIRED_CROSS_BINDINGS)
      && exactJson(
        document.clientMappings.map(({ projectName, phase, slot }) => ({
          projectName,
          phase,
          slot
        })),
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
      )
      && exactJson(document.sourceBindings.map(({ role, path }) => ({ role, path })),
        SOURCE_SPECS)
      && document.sourceBindings.every(({ size }) => size <= MAX_SOURCE_BYTES)
      && document.sourceBindings.reduce((total, { size }) => total + size, 0)
        <= MAX_SOURCE_SET_BYTES
      && document.sourceSetDigest === sha256(canonicalJson(document.sourceBindings))
      && document.clientMappings.every((mapping) =>
        mapping.mappingDigest === mappingIdentity(mapping)
      )
      && exactJson(document.limitations, LIMITATIONS)
      && exactJson(document.provenanceAndClaims, CLOSED_PROVENANCE_AND_CLAIMS),
    "identity",
    "SW_AB_COMPOSITION_DOCUMENT_BINDING_INVALID",
    "Composition document tuple, source, mapping, limitation, or closed-claim binding is invalid."
  );
  requireCondition(
    document.inputBindings.candidate.path !== document.inputBindings.runtimeCapture.path
      && document.inputBindings.candidate.sha256
        !== document.inputBindings.runtimeCapture.sha256,
    "identity",
    "SW_AB_COMPOSITION_DOCUMENT_INPUT_ALIAS",
    "Composition document candidate and runtime input bindings must remain distinct."
  );
  validateCompositionDocumentMappings(document);
  validateCompositionDocumentChronology(document);
  const identity = computeSwAbUpdateCandidateRuntimeClientCaptureCompositionIdentity(document);
  requireCondition(
    document.compositionId === identity.compositionId
      && document.compositionDigest === identity.compositionDigest,
    "identity",
    "SW_AB_COMPOSITION_IDENTITY_INVALID",
    "Composition id or digest is invalid."
  );
  return document;
}

async function loadCandidateEndpoint(input) {
  const before = await readStableFile({
    bindingRoot: input.bindingRoot,
    requiredRoot: input.privateRoot,
    filePath: input.candidateInputPath,
    label: "candidate evidence input",
    maximumSize: MAX_INPUT_BYTES
  });
  const result = await verifySwAbUpdateCandidate({
    cwd: input.bindingRoot,
    inputPath: input.candidateInputPath,
    attachmentsRoot: input.attachmentsRoot,
    privateRoot: input.privateRoot,
    artifactARoot: input.artifactARoot,
    artifactBRoot: input.artifactBRoot
  });
  assertCandidateVerification(result);
  const after = await readStableFile({
    bindingRoot: input.bindingRoot,
    requiredRoot: input.privateRoot,
    filePath: input.candidateInputPath,
    label: "candidate evidence input after verifier",
    maximumSize: MAX_INPUT_BYTES
  });
  assertSnapshotMatch(before, after, "candidate evidence input across verifier execution");
  const evidence = parseSwAbUpdateCandidateJsonBytes(
    after.bytes,
    "candidate evidence input after verifier"
  );
  const computedEvidenceDigest = computeSwAbUpdateCandidateEvidenceDigest(evidence);
  requireCondition(
    evidence.evidenceDigest === computedEvidenceDigest
      && result.evidenceDigest === computedEvidenceDigest
      && result.compositionProjection.evidenceDigest === computedEvidenceDigest,
    "mutation",
    "SW_AB_COMPOSITION_CANDIDATE_RESULT_INPUT_MISMATCH",
    "Candidate verifier result is not bound to the held candidate evidence bytes."
  );
  const candidateSourceBindings = immutableJsonSnapshot(
    evidence.governanceBindings.filter(({ role }) =>
      role === "sw-ab-update-policy" || role === "sw-ab-update-schema"
    )
  );
  return Object.freeze({
    result,
    inputBinding: after.binding,
    inputIdentity: after.identity,
    sourceBindings: candidateSourceBindings,
    endpointFingerprint: immutableJsonSnapshot({
      input: snapshotFingerprint(after),
      projection: result.compositionProjection,
      sourceBindings: candidateSourceBindings
    })
  });
}

async function loadRuntimeEndpoint(input) {
  const endpoint = await loadVerifiedSwAbUpdateRuntimeClientCapture({
    cwd: input.bindingRoot,
    bindingRoot: input.bindingRoot,
    inputPath: input.runtimeCaptureInputPath
  });
  assertRuntimeVerification(endpoint.result);
  return endpoint;
}

export async function composeSwAbUpdateCandidateRuntimeClientCapture(
  rawInput,
  { cwd = process.cwd() } = {}
) {
  const input = parseSwAbUpdateCandidateRuntimeClientCaptureCompositionInput(rawInput);
  requireCondition(
    comparablePath(input.bindingRoot) === comparablePath(path.resolve(cwd)),
    "arguments",
    "SW_AB_COMPOSITION_BINDING_ROOT_CWD_MISMATCH",
    "Composition binding root must equal cwd."
  );
  const initialSources = await readCheckedSources(input);
  const [initialCandidate, initialRuntime] = await Promise.all([
    loadCandidateEndpoint(input),
    loadRuntimeEndpoint(input)
  ]);
  assertVerifierSourceBindingsMatch(initialSources, initialCandidate, initialRuntime);
  assertDistinctPhysicalCompositionInputs(initialSources, initialCandidate, initialRuntime);
  const initialProjection =
    validateSwAbUpdateCandidateRuntimeClientCaptureCompositionProjections({
      candidateVerification: initialCandidate.result,
      runtimeVerification: initialRuntime.result,
      candidateInputBinding: initialCandidate.inputBinding,
      runtimeInputBinding: initialRuntime.inputBinding
    });
  const [terminalCandidate, terminalRuntime] = await Promise.all([
    loadCandidateEndpoint(input),
    loadRuntimeEndpoint(input)
  ]);
  const terminalSources = await readCheckedSources(input);
  assertSourceSetsMatch(initialSources, terminalSources);
  assertVerifierSourceBindingsMatch(terminalSources, terminalCandidate, terminalRuntime);
  assertDistinctPhysicalCompositionInputs(terminalSources, terminalCandidate, terminalRuntime);
  requireCondition(
    exactJson(initialCandidate.endpointFingerprint, terminalCandidate.endpointFingerprint),
    "mutation",
    "SW_AB_COMPOSITION_CANDIDATE_ENDPOINT_CHANGED",
    "Candidate verifier projection or input identity changed between endpoints."
  );
  requireCondition(
    exactJson(initialRuntime.endpointFingerprint, terminalRuntime.endpointFingerprint),
    "mutation",
    "SW_AB_COMPOSITION_RUNTIME_ENDPOINT_CHANGED",
    "Runtime verifier projection or input identity changed between endpoints."
  );
  const terminalProjection =
    validateSwAbUpdateCandidateRuntimeClientCaptureCompositionProjections({
      candidateVerification: terminalCandidate.result,
      runtimeVerification: terminalRuntime.result,
      candidateInputBinding: terminalCandidate.inputBinding,
      runtimeInputBinding: terminalRuntime.inputBinding
    });
  requireCondition(
    exactJson(initialProjection, terminalProjection),
    "mutation",
    "SW_AB_COMPOSITION_PROJECTION_CHANGED",
    "Cross-evidence composition projection changed between endpoint verifications."
  );
  const document = buildCompositionDocument(
    terminalProjection,
    sourceBindings(terminalSources)
  );
  return validateSwAbUpdateCandidateRuntimeClientCaptureCompositionDocument(
    document,
    terminalSources.compositionSchemaValidator
  );
}

export function buildSwAbUpdateCandidateRuntimeClientCaptureCompositionFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  return Object.freeze({
    schemaVersion: 1,
    recordType: "sw_ab_update_candidate_runtime_client_capture_composition_failure_v1",
    verificationKind: "offline_two_untrusted_candidate_verifiers_v1",
    trustClass: "untrusted_candidate_composition",
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    strictGatePassed: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    networkAttempted: false,
    browserAttempted: false,
    deploymentAttempted: false,
    gitAttempted: false,
    cliExitCode: 1,
    failure: Object.freeze({
      stage: error instanceof SwAbUpdateCandidateRuntimeClientCaptureCompositionError
        ? error.stage
        : "internal",
      code: error instanceof SwAbUpdateCandidateRuntimeClientCaptureCompositionError
        ? error.code
        : "SW_AB_COMPOSITION_INTERNAL_ERROR",
      messageDigest: sha256(message)
    })
  });
}

export const swAbUpdateCandidateRuntimeClientCaptureCompositionTestOnly = Object.freeze({
  buildDocument: buildCompositionDocument,
  mappingIdentity,
  sourceSpecs: SOURCE_SPECS,
  requiredCrossBindings: REQUIRED_CROSS_BINDINGS,
  limitations: LIMITATIONS,
  closedProvenanceAndClaims: CLOSED_PROVENANCE_AND_CLAIMS
});
