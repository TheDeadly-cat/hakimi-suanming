import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  parseSwAbUpdateCandidateJsonBytes,
  SW_AB_UPDATE_CANDIDATE_AUTHORITY,
  SW_AB_UPDATE_CANDIDATE_CAPABILITIES,
  SW_AB_UPDATE_CANDIDATE_POLICY_PATH,
  SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY,
  validateSwAbUpdateCandidatePolicy
} from "./sw-ab-update-candidate-lib.mjs";
import {
  compileSwAbUpdateCandidateSchema,
  SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH
} from "./sw-ab-update-candidate-schema.mjs";
import {
  composeSwAbUpdateCandidateRuntimeClientCapture,
  SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_PATH,
  validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy
} from "./sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs";
import {
  compileSwAbUpdateCandidateRuntimeClientCaptureCompositionSchema,
  SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_PATH
} from "./sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES,
  validateSwAbUpdateRuntimeClientCapturePolicy
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  compileSwAbUpdateRuntimeClientCaptureSchema,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
} from "./sw-ab-update-runtime-client-capture-schema.mjs";
import {
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_PATH,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH,
  validateSwAbUpdateRuntimeApiTranscriptPolicy
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  compileSwAbUpdateRuntimeApiTranscriptSchema
} from "./sw-ab-update-runtime-api-transcript-schema.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-loader.mjs";
import {
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_POLICY_PATH,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
  validateSwAbRuntimeCollectorIssuancePolicy
} from "./sw-ab-update-runtime-collector-issuance-lib.mjs";
import {
  compileSwAbUpdateRuntimeCollectorIssuanceSchema
} from "./sw-ab-update-runtime-collector-issuance-schema.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeCollectorIssuance
} from "./sw-ab-update-runtime-collector-issuance-loader.mjs";
import {
  compileSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchema,
  SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_COMPOSITION_SCHEMA_PATH
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-schema.mjs";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_COMPOSITION_POLICY_PATH =
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json";

const POLICY_ID =
  "hakimi.web-v1.sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition/v1";
const RECORD_TYPE =
  "sw_ab_update_candidate_runtime_client_capture_collector_issuance_composition_v1";
const FAILURE_RECORD_TYPE =
  "sw_ab_update_candidate_runtime_client_capture_collector_issuance_composition_failure_v1";
const EXECUTION_ADMISSION = "closed_missing_selected_https_origin";
const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_SET_BYTES = 64 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export const SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS = Object.freeze([
  Object.freeze({
    role: "four-chain-composition-policy",
    path: SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_COMPOSITION_POLICY_PATH
  }),
  Object.freeze({
    role: "four-chain-composition-schema",
    path: SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_COMPOSITION_SCHEMA_PATH
  }),
  Object.freeze({
    role: "two-chain-composition-policy",
    path: SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_PATH
  }),
  Object.freeze({
    role: "two-chain-composition-schema",
    path: SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_PATH
  }),
  Object.freeze({ role: "sw-ab-update-candidate-policy", path: SW_AB_UPDATE_CANDIDATE_POLICY_PATH }),
  Object.freeze({ role: "sw-ab-update-candidate-schema", path: SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH }),
  Object.freeze({
    role: "runtime-client-capture-policy",
    path: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH
  }),
  Object.freeze({
    role: "runtime-client-capture-schema",
    path: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
  }),
  Object.freeze({
    role: "runtime-api-transcript-policy",
    path: SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_PATH
  }),
  Object.freeze({
    role: "runtime-api-transcript-schema",
    path: SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH
  }),
  Object.freeze({
    role: "runtime-collector-issuance-policy",
    path: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_POLICY_PATH
  }),
  Object.freeze({
    role: "runtime-collector-issuance-schema",
    path: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH
  })
]);

const REQUIRED_CROSS_BINDINGS = Object.freeze([
  "old_two_chain_composition_projection",
  "candidate_and_runtime_primary_inputs_held_across_issuance",
  "runtime_input_transcript_and_issuance_evidence_digest",
  "transcript_complete_derived_projection",
  "collector_issuance_identity_and_receipt",
  "phase_major_exact_eight_tuple_projection",
  "canonical_origin_artifacts_release_capabilities_run_attempt_and_capture_time",
  "twelve_unique_checked_policy_and_schema_sources",
  "issuance_files_held_across_old_composition_and_transcript_reverification"
]);

const FALSE_AUTHORITY = Object.freeze(structuredClone(SW_AB_UPDATE_CANDIDATE_AUTHORITY));
const FALSE_CLAIMS = Object.freeze({
  producerBridgePresent: false,
  runtimeCollectorProvenanceVerified: false,
  browserTransportAuthenticityVerified: false,
  realBrowserExecutionVerified: false,
  realHttpsHostVerified: false,
  attemptFreshnessExternallyVerified: false,
  bundleReplayResistanceVerified: false,
  trustedProviderVerified: false,
  trustedHostVerified: false,
  trustedBrowserRuntimeVerified: false,
  deploymentReady: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  contentTruthAuthorized: false,
  expertClaimsAuthorized: false,
  rightsLegalConclusionAuthorized: false,
  schemaPromotionAuthorized: false
});

const LIMITATIONS = Object.freeze([
  "producer_bridge_absent",
  "inputs_remain_untrusted_non_formal_candidates",
  "ephemeral_self_signature_is_not_external_collector_trust",
  "decoded_api_objects_are_not_wire_bytes_or_browser_transport_proof",
  "candidate_attachments_and_artifacts_inherit_only_the_old_composition_endpoint_boundary",
  "overlapping_held_window_does_not_exclude_same_permission_or_interval_mutation",
  "schema13_has_no_mutation_epoch_and_no_epoch_is_fabricated",
  "composition_does_not_authorize_runtime_admission_deployment_release_content_expert_or_rights_claims"
]);

export class SwAbFourChainCompositionError extends Error {
  constructor(stage, code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "SwAbFourChainCompositionError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new SwAbFourChainCompositionError(stage, code, message, cause);
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

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function immutableSnapshot(value) {
  return deepFreeze(structuredClone(value));
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function relativeWithin(root, candidate, label, { allowEqual = false } = {}) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  requireCondition(
    (allowEqual || relative !== "")
      && !path.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${path.sep}`),
    "arguments",
    "SW_AB_FOUR_CHAIN_PATH_OUTSIDE_ROOT",
    `${label} escapes its required root.`
  );
  return relative.split(path.sep).join("/");
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
    "SW_AB_FOUR_CHAIN_PATH_INVALID",
    `${label} must be one explicit absolute canonical path.`
  );
  return value;
}

export function parseSwAbFourChainCompositionInput(input) {
  const keys = [
    "bindingRoot",
    "candidateInputPath",
    "attachmentsRoot",
    "privateRoot",
    "artifactARoot",
    "artifactBRoot",
    "runtimeCaptureInputPath",
    "issuanceRunRoot"
  ];
  requireCondition(
    exactKeys(input, keys),
    "arguments",
    "SW_AB_FOUR_CHAIN_INPUT_INVALID",
    "Four-chain composition input must contain exactly eight path bindings."
  );
  const parsed = Object.fromEntries(keys.map((key) => [
    key,
    requireAbsoluteCanonicalPath(input[key], key)
  ]));
  for (const [key, value] of Object.entries(parsed)) {
    if (key !== "bindingRoot") relativeWithin(parsed.bindingRoot, value, key);
  }
  relativeWithin(parsed.privateRoot, parsed.candidateInputPath, "candidateInputPath");
  requireCondition(
    comparablePath(parsed.candidateInputPath) !== comparablePath(parsed.runtimeCaptureInputPath),
    "arguments",
    "SW_AB_FOUR_CHAIN_INPUT_ALIAS",
    "Candidate and runtime capture inputs must be distinct files."
  );
  return Object.freeze(parsed);
}

function sameIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

function identityProjection(stat, physicalPath) {
  return Object.freeze({
    realPath: comparablePath(physicalPath),
    dev: String(stat.dev),
    ino: String(stat.ino),
    birthtimeNs: String(stat.birthtimeNs),
    size: String(stat.size),
    mtimeNs: String(stat.mtimeNs),
    ctimeNs: String(stat.ctimeNs),
    nlink: String(stat.nlink)
  });
}

async function readAtZero(handle, expectedSize) {
  const target = Buffer.alloc(expectedSize + 1);
  let offset = 0;
  while (offset < target.length) {
    const { bytesRead } = await handle.read(target, offset, target.length - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return target.subarray(0, offset);
}

async function holdStableFile({ bindingRoot, filePath, label, maximumSize }) {
  const absolutePath = path.resolve(filePath);
  const relativePath = relativeWithin(bindingRoot, absolutePath, label);
  let pathBefore;
  let physicalBefore;
  try {
    pathBefore = await lstat(absolutePath, { bigint: true });
    physicalBefore = await realpath(absolutePath);
  } catch (cause) {
    fail("filesystem", "SW_AB_FOUR_CHAIN_FILE_UNREADABLE", `${label} is unreadable.`, cause);
  }
  requireCondition(
    pathBefore.isFile()
      && !pathBefore.isSymbolicLink()
      && pathBefore.nlink === 1n
      && pathBefore.size > 0n
      && pathBefore.size <= BigInt(maximumSize),
    "filesystem",
    "SW_AB_FOUR_CHAIN_FILE_INVALID",
    `${label} must be one bounded regular single-link file.`
  );
  relativeWithin(bindingRoot, physicalBefore, `${label} physical path`);
  let handle;
  try {
    handle = await open(absolutePath, "r");
    const before = await handle.stat({ bigint: true });
    requireCondition(
      sameIdentity(pathBefore, before) && before.nlink === 1n,
      "filesystem",
      "SW_AB_FOUR_CHAIN_FILE_REBOUND",
      `${label} rebound before its held read.`
    );
    const bytes = await readAtZero(handle, Number(before.size));
    const after = await handle.stat({ bigint: true });
    requireCondition(
      sameIdentity(before, after)
        && before.size === after.size
        && before.mtimeNs === after.mtimeNs
        && before.ctimeNs === after.ctimeNs
        && bytes.length === Number(before.size),
      "filesystem",
      "SW_AB_FOUR_CHAIN_FILE_CHANGED",
      `${label} changed during its held read.`
    );
    return Object.freeze({
      label,
      absolutePath,
      handle,
      bytes,
      binding: Object.freeze({ path: relativePath, size: bytes.length, sha256: sha256(bytes) }),
      identity: identityProjection(after, physicalBefore)
    });
  } catch (error) {
    await handle?.close().catch(() => undefined);
    throw error;
  }
}

async function assertHeldFileStable(held) {
  const handleBefore = await held.handle.stat({ bigint: true });
  const bytes = await readAtZero(held.handle, Number(handleBefore.size));
  const handleAfter = await held.handle.stat({ bigint: true });
  let pathAfter;
  let physicalAfter;
  try {
    [pathAfter, physicalAfter] = await Promise.all([
      lstat(held.absolutePath, { bigint: true }),
      realpath(held.absolutePath)
    ]);
  } catch (cause) {
    fail(
      "mutation",
      "SW_AB_FOUR_CHAIN_HELD_FILE_CHANGED",
      `${held.label} path disappeared or rebound after its held read.`,
      cause
    );
  }
  requireCondition(
    sameIdentity(handleBefore, handleAfter)
      && sameIdentity(handleAfter, pathAfter)
      && pathAfter.isFile()
      && !pathAfter.isSymbolicLink()
      && handleAfter.nlink === 1n
      && pathAfter.nlink === 1n
      && bytes.equals(held.bytes)
      && sha256(bytes) === held.binding.sha256
      && exactJson(identityProjection(handleAfter, physicalAfter), held.identity),
    "mutation",
    "SW_AB_FOUR_CHAIN_HELD_FILE_CHANGED",
    `${held.label} changed inside the overlapping held window.`
  );
}

function identityCollision(left, right) {
  return left.realPath === right.realPath
    || (left.dev === right.dev
      && left.ino === right.ino
      && left.birthtimeNs === right.birthtimeNs);
}

function requireDistinctIdentities(entries, code, message) {
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      requireCondition(
        !identityCollision(entries[left].identity, entries[right].identity),
        "filesystem",
        code,
        message
      );
    }
  }
}

export function validateSwAbFourChainCompositionPolicy(policy) {
  requireCondition(
    exactKeys(policy, [
      "schemaVersion",
      "policyId",
      "evidenceClass",
      "producerBridgeStatus",
      "releaseIdentity",
      "capabilities",
      "requiredSourceBindings",
      "requiredCrossBindings",
      "executionAdmission",
      "terminalState",
      "mutationBoundary",
      "attempts",
      "authority"
    ])
      && policy.schemaVersion === 1
      && policy.policyId === POLICY_ID
      && policy.evidenceClass === "offline_untrusted_four_chain_composition_candidate"
      && policy.producerBridgeStatus === "producer_bridge_absent"
      && exactJson(policy.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(policy.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && exactJson(policy.requiredSourceBindings, SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS)
      && new Set(policy.requiredSourceBindings.map(({ path: sourcePath }) => sourcePath)).size === 12
      && exactJson(policy.requiredCrossBindings, REQUIRED_CROSS_BINDINGS)
      && policy.executionAdmission === EXECUTION_ADMISSION
      && exactJson(policy.terminalState, {
        trustClass: "untrusted_four_chain_composition_candidate",
        status: "not_admitted",
        strictGatePassed: false,
        usableForRuntimeEvidence: false,
        usableForCandidateAssembly: false,
        usableForAdmission: false,
        formalReleaseEvidenceReceipt: false,
        cliExitCode: 1
      })
      && exactJson(policy.mutationBoundary, {
        candidateAndRuntimePrimaryInputsHeldAcrossIssuance: true,
        issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification: true,
        allEvidenceFilesContinuouslyHeldAcrossComposition: false,
        continuousMutationEpochVerified: false,
        samePermissionMutationExcluded: false,
        intervalMutationExcluded: false,
        abaExcluded: false,
        mutationEpochCapability: "absent_schema13",
        epoch: null
      })
      && exactJson(policy.attempts, {
        networkAttempted: false,
        browserAttempted: false,
        deploymentAttempted: false,
        rollbackAttempted: false,
        gitAttempted: false
      })
      && exactJson(policy.authority, FALSE_AUTHORITY),
    "policy",
    "SW_AB_FOUR_CHAIN_POLICY_INVALID",
    "Four-chain policy drifted from its exact closed legacy-v13 boundary."
  );
  return policy;
}

async function holdCheckedSources(bindingRoot) {
  const held = [];
  let totalSize = 0;
  try {
    for (const spec of SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS) {
      const source = await holdStableFile({
        bindingRoot,
        filePath: path.resolve(bindingRoot, ...spec.path.split("/")),
        label: spec.role,
        maximumSize: MAX_SOURCE_BYTES
      });
      requireCondition(
        source.binding.path === spec.path,
        "source",
        "SW_AB_FOUR_CHAIN_SOURCE_PATH_INVALID",
        `${spec.role} is not at its frozen path.`
      );
      totalSize += source.binding.size;
      requireCondition(
        totalSize <= MAX_SOURCE_SET_BYTES,
        "source",
        "SW_AB_FOUR_CHAIN_SOURCE_SET_SIZE_INVALID",
        "Four-chain checked sources exceed their aggregate bound."
      );
      const value = parseSwAbUpdateCandidateJsonBytes(source.bytes, spec.role);
      held.push(Object.freeze({
        ...source,
        spec,
        value,
        canonicalSha256: sha256(canonicalJson(value))
      }));
    }
    requireDistinctIdentities(
      held,
      "SW_AB_FOUR_CHAIN_SOURCE_PHYSICAL_ALIAS",
      "The twelve checked policy and Schema paths must be physically distinct."
    );
    validateSwAbFourChainCompositionPolicy(held[0].value);
    let schemaValidator;
    try {
      schemaValidator =
        compileSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchema(
          held[1].value
        );
      validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy(held[2].value);
      compileSwAbUpdateCandidateRuntimeClientCaptureCompositionSchema(held[3].value);
      validateSwAbUpdateCandidatePolicy(held[4].value);
      compileSwAbUpdateCandidateSchema(held[5].value);
      validateSwAbUpdateRuntimeClientCapturePolicy(held[6].value);
      compileSwAbUpdateRuntimeClientCaptureSchema(held[7].value);
      validateSwAbUpdateRuntimeApiTranscriptPolicy(held[8].value);
      compileSwAbUpdateRuntimeApiTranscriptSchema(held[9].value);
      validateSwAbRuntimeCollectorIssuancePolicy(held[10].value);
      compileSwAbUpdateRuntimeCollectorIssuanceSchema(held[11].value);
    } catch (cause) {
      fail(
        "source",
        "SW_AB_FOUR_CHAIN_CHECKED_SOURCE_INVALID",
        "One checked policy or Schema failed its authoritative validator.",
        cause
      );
    }
    return Object.freeze({ held: Object.freeze(held), schemaValidator });
  } catch (error) {
    for (const source of held.reverse()) await source.handle.close().catch(() => undefined);
    throw error;
  }
}

function checkedSourceBindings(sources) {
  return immutableSnapshot(sources.held.map(({ spec, binding, canonicalSha256 }) => ({
    role: spec.role,
    path: binding.path,
    size: binding.size,
    rawSha256: binding.sha256,
    canonicalSha256
  })));
}

function sourceByPath(sourceBindings) {
  return new Map(sourceBindings.map((binding) => [binding.path, binding]));
}

function normalizeNestedSourceBinding(binding, label) {
  requireCondition(
    isRecord(binding)
      && typeof binding.path === "string"
      && Number.isInteger(binding.size)
      && binding.size > 0
      && SHA256_PATTERN.test(binding.rawSha256 ?? binding.sha256 ?? "")
      && SHA256_PATTERN.test(binding.canonicalSha256 ?? ""),
    "source",
    "SW_AB_FOUR_CHAIN_NESTED_SOURCE_BINDING_INVALID",
    `${label} contains an invalid source binding.`
  );
  return Object.freeze({
    path: binding.path,
    size: binding.size,
    rawSha256: binding.rawSha256 ?? binding.sha256,
    canonicalSha256: binding.canonicalSha256
  });
}

function assertNestedSourceSet({ label, nestedBindings, expectedPaths, outerBindings }) {
  requireCondition(
    Array.isArray(nestedBindings)
      && exactJson(nestedBindings.map(({ path: sourcePath }) => sourcePath), expectedPaths),
    "source",
    "SW_AB_FOUR_CHAIN_NESTED_SOURCE_PATH_SET_INVALID",
    `${label} source path set drifted.`
  );
  const outerByPath = sourceByPath(outerBindings);
  for (const binding of nestedBindings) {
    const normalized = normalizeNestedSourceBinding(binding, label);
    const expected = outerByPath.get(normalized.path);
    requireCondition(
      expected !== undefined
        && normalized.size === expected.size
        && normalized.rawSha256 === expected.rawSha256
        && normalized.canonicalSha256 === expected.canonicalSha256,
      "source",
      "SW_AB_FOUR_CHAIN_NESTED_SOURCE_DRIFT",
      `${label} source bytes or canonical digest drifted from the held source.`
    );
  }
}

function assertAllNestedSourceBindings({ oldComposition, transcriptLoaded, issuanceLoaded, outer }) {
  assertNestedSourceSet({
    label: "old two-chain composition",
    nestedBindings: oldComposition.sourceBindings,
    expectedPaths: SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS.slice(2, 8)
      .map(({ path: sourcePath }) => sourcePath),
    outerBindings: outer
  });
  assertNestedSourceSet({
    label: "decoded API transcript",
    nestedBindings: transcriptLoaded.sourceBindings,
    expectedPaths: [
      SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_PATH,
      SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH,
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH,
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
    ],
    outerBindings: outer
  });
  assertNestedSourceSet({
    label: "collector issuance",
    nestedBindings: issuanceLoaded.sourceBindings,
    expectedPaths: [
      SW_AB_RUNTIME_COLLECTOR_ISSUANCE_POLICY_PATH,
      SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH,
      SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_PATH,
      SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH,
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH,
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH
    ],
    outerBindings: outer
  });
  const nestedUnion = new Set([
    ...oldComposition.sourceBindings,
    ...transcriptLoaded.sourceBindings,
    ...issuanceLoaded.sourceBindings,
    outer[0],
    outer[1]
  ].map(({ path: sourcePath }) => sourcePath));
  requireCondition(
    nestedUnion.size === 12
      && SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS.every(({ path: sourcePath }) =>
        nestedUnion.has(sourcePath)
      ),
    "source",
    "SW_AB_FOUR_CHAIN_SOURCE_UNION_INVALID",
    "Nested verifier source union is not the exact twelve-path checked set."
  );
}

function tupleProjection(observation) {
  return {
    sequence: observation.sequence,
    projectName: observation.projectName,
    phase: observation.phase,
    slot: observation.slot,
    observedAt: observation.observedAt,
    pseudonymousClientId: observation.pseudonymousClientId,
    pseudonymousTargetId: observation.pseudonymousTargetId,
    challengeNonce: observation.challengeNonce,
    runtimeRequestDigest: observation.runtimeRequestDigest,
    runtimeResponseDigest: observation.runtimeResponseDigest,
    runtimeObservationDigest: observation.runtimeObservationDigest
  };
}

function mappingTupleProjection(mapping) {
  return {
    sequence: mapping.sequence,
    projectName: mapping.projectName,
    phase: mapping.phase,
    slot: mapping.slot,
    observedAt: mapping.runtimeObservedAt,
    pseudonymousClientId: mapping.pseudonymousClientId,
    pseudonymousTargetId: mapping.pseudonymousTargetId,
    challengeNonce: mapping.challengeNonce,
    runtimeRequestDigest: mapping.runtimeRequestDigest,
    runtimeResponseDigest: mapping.runtimeResponseDigest,
    runtimeObservationDigest: mapping.runtimeObservationDigest
  };
}

function assertOldComposition(oldComposition) {
  requireCondition(
    isRecord(oldComposition)
      && oldComposition.schemaVersion === 1
      && oldComposition.recordType
        === "sw_ab_update_candidate_runtime_client_capture_composition_v1"
      && oldComposition.trustClass === "untrusted_candidate_composition"
      && oldComposition.status === "not_admitted"
      && oldComposition.executionAdmission === "closed_missing_https_origin"
      && oldComposition.strictGatePassed === false
      && oldComposition.usableForCandidateAssembly === false
      && oldComposition.usableForAdmission === false
      && oldComposition.formalReleaseEvidenceReceipt === false
      && oldComposition.cliExitCode === 1
      && isRecord(oldComposition.scope)
      && isRecord(oldComposition.artifactBindings)
      && isRecord(oldComposition.inputBindings)
      && Array.isArray(oldComposition.clientMappings)
      && oldComposition.clientMappings.length === 8
      && isRecord(oldComposition.chronologyBindings)
      && Array.isArray(oldComposition.sourceBindings)
      && oldComposition.sourceBindings.length === 6
      && SHA256_PATTERN.test(oldComposition.compositionDigest ?? ""),
    "old-composition",
    "SW_AB_FOUR_CHAIN_OLD_COMPOSITION_INVALID",
    "Old two-chain composition did not return its exact closed document."
  );
}

function assertTranscriptLoaded(transcriptLoaded) {
  const result = transcriptLoaded?.result;
  requireCondition(
    isRecord(transcriptLoaded)
      && isRecord(result)
      && result.code === "SW_AB_RUNTIME_API_TRANSCRIPT_DERIVED_NOT_ADMITTED"
      && result.status === "capture_incomplete"
      && result.executionAdmission === EXECUTION_ADMISSION
      && result.decodedApiObjectProjectionDerivationVerified === true
      && result.terminalEndpointSnapshotsMatched === true
      && result.overlappingFileHandleEpochEstablished === false
      && result.intervalMutationExcluded === false
      && result.abaExcluded === false
      && result.mutationEpochCapability === "absent_schema13"
      && result.epoch === null
      && result.usableForRuntimeEvidence === false
      && result.usableForCandidateAssembly === false
      && result.formalReleaseEvidenceReceipt === false
      && result.publicDeploymentAuthorized === false
      && result.expertClaimsAuthorized === false
      && result.rightsLegalConclusionAuthorized === false
      && result.verifierNetworkAttempted === false
      && result.verifierBrowserAttempted === false
      && result.verifierDeploymentAttempted === false
      && result.tupleCount === 8
      && result.sourceBindingCount === 4
      && SHA256_PATTERN.test(result.bundleDigest ?? "")
      && SHA256_PATTERN.test(result.derivedEvidenceDigest ?? "")
      && isRecord(result.derivedProjection)
      && Array.isArray(result.derivedProjection.observations)
      && result.derivedProjection.observations.length === 8
      && result.cliExitCode === 1
      && isRecord(transcriptLoaded.manifestBinding)
      && Array.isArray(transcriptLoaded.tupleBindings)
      && transcriptLoaded.tupleBindings.length === 8
      && Array.isArray(transcriptLoaded.sourceBindings)
      && isRecord(transcriptLoaded.endpointFingerprint),
    "transcript",
    "SW_AB_FOUR_CHAIN_TRANSCRIPT_INVALID",
    "Independent decoded API transcript verifier did not return its exact closed projection."
  );
}

function assertIssuanceLoaded(issuanceLoaded) {
  const result = issuanceLoaded?.result;
  requireCondition(
    isRecord(issuanceLoaded)
      && isRecord(result)
      && result.code === "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_NOT_ADMITTED"
      && result.trustClass === "untrusted_ephemeral_self_signed_collector_issuance_candidate"
      && result.status === "issuance_incomplete"
      && result.executionAdmission === EXECUTION_ADMISSION
      && result.ephemeralSelfSignatureChainVerified === true
      && result.collectorIssuanceProjectionVerified === true
      && result.phaseMajorIssuanceChainVerified === true
      && result.transcriptBundleBindingVerified === true
      && result.terminalEndpointSnapshotsMatched === true
      && result.overlappingHeldFileEpochEstablished === true
      && result.attemptMarkerHandleHeldAcrossIssuance === false
      && result.continuousMutationEpochVerified === false
      && result.samePermissionMutationExcluded === false
      && result.intervalMutationExcluded === false
      && result.abaExcluded === false
      && result.mutationEpochCapability === "absent_schema13"
      && result.epoch === null
      && result.usableForRuntimeEvidence === false
      && result.usableForCandidateAssembly === false
      && result.formalReleaseEvidenceReceipt === false
      && result.publicDeploymentAuthorized === false
      && result.expertClaimsAuthorized === false
      && result.rightsLegalConclusionAuthorized === false
      && result.tupleCount === 8
      && result.verifierNetworkAttempted === false
      && result.verifierBrowserAttempted === false
      && result.verifierDeploymentAttempted === false
      && result.cliExitCode === 1
      && isRecord(issuanceLoaded.markerBinding)
      && isRecord(issuanceLoaded.receiptBinding)
      && isRecord(issuanceLoaded.transcriptBundleBinding)
      && Array.isArray(issuanceLoaded.sourceBindings)
      && isRecord(issuanceLoaded.endpointFingerprint),
    "issuance",
    "SW_AB_FOUR_CHAIN_ISSUANCE_INVALID",
    "Collector issuance verifier did not return its exact closed result."
  );
}

function requireInputHeldBinding(oldBinding, held, label) {
  requireCondition(
    isRecord(oldBinding)
      && oldBinding.path === held.binding.path
      && oldBinding.size === held.binding.size
      && oldBinding.sha256 === held.binding.sha256
      && SHA256_PATTERN.test(oldBinding.evidenceDigest ?? "")
      && typeof oldBinding.capturedAt === "string",
    "binding",
    "SW_AB_FOUR_CHAIN_INPUT_BINDING_MISMATCH",
    `${label} old-composition binding is not the exact held bytes.`
  );
  return immutableSnapshot({
    ...oldBinding,
    heldIdentityDigest: sha256(canonicalJson(held.identity))
  });
}

function assertTranscriptIssuanceBundle(transcriptLoaded, issuanceLoaded) {
  const transcript = transcriptLoaded.result;
  const issuance = issuanceLoaded.result;
  const bundle = issuanceLoaded.transcriptBundleBinding;
  requireCondition(
    issuance.bundleId === transcript.bundleId
      && issuance.bundleDigest === transcript.bundleDigest
      && issuance.derivedEvidenceDigest === transcript.derivedEvidenceDigest
      && bundle.bundleId === transcript.bundleId
      && bundle.bundleDigest === transcript.bundleDigest
      && bundle.derivedEvidenceDigest === transcript.derivedEvidenceDigest
      && bundle.tupleFileCount === 8
      && bundle.manifestSize === transcriptLoaded.manifestBinding.size
      && bundle.manifestSha256 === transcriptLoaded.manifestBinding.sha256
      && Array.isArray(bundle.tupleBindings)
      && bundle.tupleBindings.length === 8
      && bundle.tupleBindings.every((binding, index) =>
        binding.path === transcriptLoaded.tupleBindings[index].path
          && binding.size === transcriptLoaded.tupleBindings[index].size
          && binding.sha256 === transcriptLoaded.tupleBindings[index].sha256
      ),
    "binding",
    "SW_AB_FOUR_CHAIN_TRANSCRIPT_ISSUANCE_DRIFT",
    "Issuance receipt/bundle binding drifted from the independently decoded transcript."
  );
}

export function validateSwAbFourChainCompositionBindings({
  oldComposition,
  transcriptLoaded,
  issuanceLoaded,
  candidateHeld,
  runtimeHeld,
  outerSourceBindings
}) {
  assertOldComposition(oldComposition);
  assertTranscriptLoaded(transcriptLoaded);
  assertIssuanceLoaded(issuanceLoaded);
  assertTranscriptIssuanceBundle(transcriptLoaded, issuanceLoaded);
  requireCondition(
    Array.isArray(outerSourceBindings) && outerSourceBindings.length === 12,
    "source",
    "SW_AB_FOUR_CHAIN_OUTER_SOURCE_SET_INVALID",
    "Exactly twelve outer checked source bindings are required."
  );
  assertAllNestedSourceBindings({
    oldComposition,
    transcriptLoaded,
    issuanceLoaded,
    outer: outerSourceBindings
  });

  const scope = oldComposition.scope;
  const transcript = transcriptLoaded.result;
  const runtime = transcript.derivedProjection;
  const issuance = issuanceLoaded.result;
  const candidateInput = requireInputHeldBinding(
    oldComposition.inputBindings.candidate,
    candidateHeld,
    "candidate input"
  );
  const runtimeInput = requireInputHeldBinding(
    oldComposition.inputBindings.runtimeCapture,
    runtimeHeld,
    "runtime capture input"
  );
  requireCondition(
    candidateInput.path !== runtimeInput.path
      && candidateInput.sha256 !== runtimeInput.sha256
      && runtimeInput.evidenceDigest === transcript.derivedEvidenceDigest
      && runtimeInput.evidenceDigest === issuance.derivedEvidenceDigest
      && runtime.evidenceDigest === transcript.derivedEvidenceDigest,
    "binding",
    "SW_AB_FOUR_CHAIN_EVIDENCE_DIGEST_MISMATCH",
    "Runtime input, transcript projection, and issuance do not share one evidence digest."
  );
  requireCondition(
    scope.runId === runtime.runId
      && scope.attemptId === runtime.attemptId
      && scope.runId === issuance.runId
      && scope.attemptId === issuance.attemptId
      && scope.canonicalHttpsOrigin === runtime.canonicalHttpsOrigin
      && exactJson(scope.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(scope.releaseIdentity, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY)
      && exactJson(scope.releaseIdentity, runtime.releaseIdentity)
      && exactJson(scope.releaseIdentity, issuance.releaseIdentity)
      && exactJson(scope.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && exactJson(scope.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
      && exactJson(scope.capabilities, runtime.capabilities)
      && exactJson(scope.capabilities, issuance.capabilities),
    "binding",
    "SW_AB_FOUR_CHAIN_SCOPE_MISMATCH",
    "Four evidence chains do not share origin, release, capabilities, run, and attempt scope."
  );
  requireCondition(
    exactJson(oldComposition.artifactBindings, runtime.artifactBindings),
    "binding",
    "SW_AB_FOUR_CHAIN_ARTIFACT_MISMATCH",
    "Old composition and decoded transcript A/B artifact bindings differ."
  );
  requireCondition(
    runtime.capturedAt === oldComposition.chronologyBindings.runtimeCaptureCapturedAt
      && runtime.capturedAt === runtimeInput.capturedAt,
    "binding",
    "SW_AB_FOUR_CHAIN_CAPTURE_TIME_MISMATCH",
    "Runtime input and transcript capturedAt values differ."
  );
  const transcriptTuples = runtime.observations.map(tupleProjection);
  const oldTuples = oldComposition.clientMappings.map(mappingTupleProjection);
  requireCondition(
    exactJson(
      transcriptTuples.map(({ projectName, phase, slot }) => ({ projectName, phase, slot })),
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
    )
      && exactJson(oldTuples, transcriptTuples),
    "binding",
    "SW_AB_FOUR_CHAIN_TUPLE_MISMATCH",
    "Old composition and transcript differ on an exact phase-major tuple field."
  );
  requireCondition(
    typeof issuance.issuanceId === "string"
      && issuance.issuanceId.length > 0
      && SHA256_PATTERN.test(issuance.receiptDigest ?? ""),
    "binding",
    "SW_AB_FOUR_CHAIN_ISSUANCE_IDENTITY_INVALID",
    "Collector issuance identity or receipt digest is invalid."
  );
  return immutableSnapshot({
    scope,
    artifactBindings: oldComposition.artifactBindings,
    inputBindings: {
      candidate: candidateInput,
      runtimeCapture: runtimeInput
    },
    oldCompositionBinding: {
      compositionId: oldComposition.compositionId,
      compositionDigest: oldComposition.compositionDigest,
      sourceSetDigest: oldComposition.sourceSetDigest
    },
    transcriptBinding: {
      bundleId: transcript.bundleId,
      bundleDigest: transcript.bundleDigest,
      derivedEvidenceDigest: transcript.derivedEvidenceDigest,
      manifestBinding: transcriptLoaded.manifestBinding,
      tupleBindings: transcriptLoaded.tupleBindings,
      endpointFingerprintDigest: sha256(canonicalJson(transcriptLoaded.endpointFingerprint))
    },
    issuanceBinding: {
      issuanceId: issuance.issuanceId,
      receiptDigest: issuance.receiptDigest,
      bundleId: issuance.bundleId,
      bundleDigest: issuance.bundleDigest,
      derivedEvidenceDigest: issuance.derivedEvidenceDigest,
      markerBinding: issuanceLoaded.markerBinding,
      receiptBinding: issuanceLoaded.receiptBinding,
      endpointFingerprintDigest: sha256(canonicalJson(issuanceLoaded.endpointFingerprint))
    },
    runtimeTupleBindings: transcriptTuples,
    clientMappings: oldComposition.clientMappings,
    chronologyBindings: oldComposition.chronologyBindings
  });
}

function identityEntry(label, identity) {
  requireCondition(
    isRecord(identity)
      && typeof identity.realPath === "string"
      && typeof identity.dev === "string"
      && typeof identity.ino === "string"
      && typeof identity.birthtimeNs === "string",
    "filesystem",
    "SW_AB_FOUR_CHAIN_ENDPOINT_IDENTITY_INVALID",
    `${label} does not expose one verified physical identity.`
  );
  return Object.freeze({ label, identity });
}

function assertIdentityExactly(left, right, message) {
  requireCondition(
    exactJson(left, right),
    "filesystem",
    "SW_AB_FOUR_CHAIN_SHARED_IDENTITY_DRIFT",
    message
  );
}

export function assertSwAbFourChainPhysicalSeparation({
  candidateHeld,
  runtimeHeld,
  sourceHeld,
  transcriptLoaded,
  issuanceLoaded
}) {
  const issuanceFingerprint = issuanceLoaded.endpointFingerprint;
  const transcriptFingerprint = transcriptLoaded.endpointFingerprint;
  requireCondition(
    isRecord(issuanceFingerprint)
      && isRecord(issuanceFingerprint.marker)
      && isRecord(issuanceFingerprint.receipt)
      && Array.isArray(issuanceFingerprint.transcript)
      && issuanceFingerprint.transcript.length === 9
      && Array.isArray(issuanceFingerprint.sources)
      && issuanceFingerprint.sources.length === 6
      && isRecord(transcriptFingerprint)
      && Array.isArray(transcriptFingerprint.tuples)
      && transcriptFingerprint.tuples.length === 8
      && isRecord(transcriptFingerprint.manifest)
      && Array.isArray(transcriptFingerprint.sources)
      && transcriptFingerprint.sources.length === 4,
    "filesystem",
    "SW_AB_FOUR_CHAIN_ENDPOINT_FINGERPRINT_INVALID",
    "Transcript or issuance endpoint fingerprint is incomplete."
  );
  const issuanceCore = [
    identityEntry("issuance marker", issuanceFingerprint.marker),
    ...issuanceFingerprint.transcript.map((identity, index) =>
      identityEntry(`issuance transcript ${index + 1}`, identity)
    ),
    identityEntry("issuance receipt", issuanceFingerprint.receipt)
  ];
  requireDistinctIdentities(
    issuanceCore,
    "SW_AB_FOUR_CHAIN_ISSUANCE_PHYSICAL_ALIAS",
    "Marker, receipt, and nine transcript files must be physically distinct."
  );
  const outerInputsAndSources = [
    identityEntry("candidate input", candidateHeld.identity),
    identityEntry("runtime capture input", runtimeHeld.identity),
    ...sourceHeld.map(({ spec, identity }) => identityEntry(spec.role, identity))
  ];
  requireDistinctIdentities(
    outerInputsAndSources,
    "SW_AB_FOUR_CHAIN_OUTER_PHYSICAL_ALIAS",
    "Candidate, runtime capture, and twelve checked sources must be physically distinct."
  );
  for (const outer of outerInputsAndSources) {
    for (const issuance of issuanceCore) {
      requireCondition(
        !identityCollision(outer.identity, issuance.identity),
        "filesystem",
        "SW_AB_FOUR_CHAIN_EVIDENCE_PHYSICAL_ALIAS",
        "Candidate/runtime/source input aliases marker, receipt, or transcript evidence."
      );
    }
  }
  const transcriptOrder = [
    ...transcriptFingerprint.tuples,
    transcriptFingerprint.manifest
  ];
  for (let index = 0; index < transcriptOrder.length; index += 1) {
    assertIdentityExactly(
      transcriptOrder[index],
      issuanceFingerprint.transcript[index],
      "Independent transcript and issuance-held transcript identities differ."
    );
  }
  const outerByPath = new Map(sourceHeld.map(({ spec, identity }) => [spec.path, identity]));
  issuanceLoaded.sourceBindings.forEach((binding, index) => {
    assertIdentityExactly(
      outerByPath.get(binding.path),
      issuanceFingerprint.sources[index],
      "Issuance shared source identity drifted from the outer held source."
    );
  });
  transcriptLoaded.sourceBindings.forEach((binding, index) => {
    assertIdentityExactly(
      outerByPath.get(binding.path),
      transcriptFingerprint.sources[index],
      "Transcript shared source identity drifted from the outer held source."
    );
  });
  return true;
}

function computeCompositionIdentity(document) {
  const unsigned = structuredClone(document);
  delete unsigned.compositionId;
  delete unsigned.compositionDigest;
  const compositionId = `swab4c1-${sha256(canonicalJson({
    namespace: "hakimi-sw-ab-four-chain-composition-id-v1",
    scope: unsigned.scope,
    artifactBindings: unsigned.artifactBindings,
    inputBindings: unsigned.inputBindings,
    oldCompositionBinding: unsigned.oldCompositionBinding,
    transcriptBinding: unsigned.transcriptBinding,
    issuanceBinding: unsigned.issuanceBinding,
    runtimeTupleBindings: unsigned.runtimeTupleBindings,
    sourceSetDigest: unsigned.sourceSetDigest
  })).slice(0, 32)}`;
  return Object.freeze({
    compositionId,
    compositionDigest: sha256(canonicalJson({ ...unsigned, compositionId }))
  });
}

function buildDocument(projection, sourceBindings) {
  const document = {
    schemaVersion: 1,
    policyId: POLICY_ID,
    evidenceClass: "offline_untrusted_four_chain_composition_candidate",
    producerBridgeStatus: "producer_bridge_absent",
    recordType: RECORD_TYPE,
    verificationKind: "offline_four_chain_primary_input_and_issuance_overlap_v1",
    trustClass: "untrusted_four_chain_composition_candidate",
    status: "not_admitted",
    executionAdmission: EXECUTION_ADMISSION,
    strictGatePassed: false,
    runtimeAdmissionPassed: false,
    admissionPassed: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    cliExitCode: 1,
    compositionId: `swab4c1-${"0".repeat(32)}`,
    ...projection,
    sourceBindings,
    sourceSetDigest: sha256(canonicalJson(sourceBindings)),
    mechanicalChecks: {
      oldTwoChainCompositionReverified: true,
      candidateAndRuntimePrimaryInputsHeldAcrossIssuance: true,
      issuanceCheckpointCalledExactlyOnce: true,
      issuanceCheckpointPhaseMatched: true,
      independentTranscriptReverifiedInsideIssuanceHeldWindow: true,
      nestedSourceBytesAndCanonicalDigestsMatched: true,
      physicalAliasRejectedExceptExactSharedSources: true,
      scopeArtifactAndEvidenceDigestsMatched: true,
      exactPhaseMajorTupleProjectionMatched: true,
      issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification: true,
      allEvidenceFilesContinuouslyHeldAcrossComposition: false,
      endpointStabilityVerified: true,
      compositionDigestMatched: true
    },
    mutationBoundary: {
      candidateAndRuntimePrimaryInputsHeldAcrossIssuance: true,
      issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification: true,
      allEvidenceFilesContinuouslyHeldAcrossComposition: false,
      endpointStabilityVerified: true,
      continuousMutationEpochVerified: false,
      samePermissionMutationExcluded: false,
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
    provenanceAndClaims: FALSE_CLAIMS,
    authority: FALSE_AUTHORITY,
    limitations: LIMITATIONS,
    compositionDigest: "0".repeat(64)
  };
  Object.assign(document, computeCompositionIdentity(document));
  return immutableSnapshot(document);
}

export function validateSwAbFourChainCompositionDocument(document, schemaValidator) {
  try {
    schemaValidator.assert(document);
  } catch (cause) {
    fail(
      "schema",
      "SW_AB_FOUR_CHAIN_DOCUMENT_SCHEMA_INVALID",
      "Four-chain document does not match its checked closed Schema.",
      cause
    );
  }
  const identity = computeCompositionIdentity(document);
  requireCondition(
    document.policyId === POLICY_ID
      && document.recordType === RECORD_TYPE
      && document.producerBridgeStatus === "producer_bridge_absent"
      && document.status === "not_admitted"
      && document.executionAdmission === EXECUTION_ADMISSION
      && document.strictGatePassed === false
      && document.runtimeAdmissionPassed === false
      && document.admissionPassed === false
      && document.usableForRuntimeEvidence === false
      && document.usableForCandidateAssembly === false
      && document.usableForAdmission === false
      && document.formalReleaseEvidenceReceipt === false
      && document.cliExitCode === 1
      && document.sourceBindings.length === 12
      && exactJson(
        document.sourceBindings.map(({ role, path: sourcePath }) => ({ role, path: sourcePath })),
        SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS
      )
      && document.sourceSetDigest === sha256(canonicalJson(document.sourceBindings))
      && exactJson(document.scope.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(document.scope.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && exactJson(document.scope.browserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
      && exactJson(document.scope.phases, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES)
      && exactJson(document.scope.slots, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
      && exactJson(
        document.runtimeTupleBindings.map(({ projectName, phase, slot }) => ({
          projectName,
          phase,
          slot
        })),
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
      )
      && exactJson(
        document.runtimeTupleBindings,
        document.clientMappings.map(mappingTupleProjection)
      )
      && document.inputBindings.runtimeCapture.evidenceDigest
        === document.transcriptBinding.derivedEvidenceDigest
      && document.transcriptBinding.derivedEvidenceDigest
        === document.issuanceBinding.derivedEvidenceDigest
      && document.transcriptBinding.bundleId === document.issuanceBinding.bundleId
      && document.transcriptBinding.bundleDigest === document.issuanceBinding.bundleDigest
      && exactJson(document.provenanceAndClaims, FALSE_CLAIMS)
      && exactJson(document.authority, FALSE_AUTHORITY)
      && exactJson(document.limitations, LIMITATIONS)
      && document.mutationBoundary.continuousMutationEpochVerified === false
      && document.mutationBoundary.samePermissionMutationExcluded === false
      && document.mutationBoundary.intervalMutationExcluded === false
      && document.mutationBoundary.abaExcluded === false
      && document.mutationBoundary.mutationEpochCapability === "absent_schema13"
      && document.mutationBoundary.epoch === null
      && document.compositionId === identity.compositionId
      && document.compositionDigest === identity.compositionDigest,
    "identity",
    "SW_AB_FOUR_CHAIN_DOCUMENT_INVALID",
    "Four-chain document drifted from its exact fail-closed identity."
  );
  return document;
}

const DEFAULT_DEPENDENCIES = Object.freeze({
  composeOld: composeSwAbUpdateCandidateRuntimeClientCapture,
  loadTranscript: loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle,
  loadIssuance: loadVerifiedSwAbUpdateRuntimeCollectorIssuance
});

async function composeWithDependencies(
  rawInput,
  { cwd = process.cwd(), dependencies }
) {
  const input = parseSwAbFourChainCompositionInput(rawInput);
  requireCondition(
    comparablePath(input.bindingRoot) === comparablePath(path.resolve(cwd)),
    "arguments",
    "SW_AB_FOUR_CHAIN_BINDING_ROOT_CWD_MISMATCH",
    "bindingRoot must equal cwd."
  );
  requireCondition(
    isRecord(dependencies)
      && typeof dependencies.composeOld === "function"
      && typeof dependencies.loadTranscript === "function"
      && typeof dependencies.loadIssuance === "function",
    "arguments",
    "SW_AB_FOUR_CHAIN_DEPENDENCIES_INVALID",
    "Composer dependencies are invalid."
  );
  const sources = await holdCheckedSources(input.bindingRoot);
  const heldInputs = [];
  try {
    const [candidateHeld, runtimeHeld] = await Promise.all([
      holdStableFile({
        bindingRoot: input.bindingRoot,
        filePath: input.candidateInputPath,
        label: "candidate evidence input",
        maximumSize: MAX_INPUT_BYTES
      }),
      holdStableFile({
        bindingRoot: input.bindingRoot,
        filePath: input.runtimeCaptureInputPath,
        label: "runtime capture input",
        maximumSize: MAX_INPUT_BYTES
      })
    ]);
    heldInputs.push(candidateHeld, runtimeHeld);
    requireDistinctIdentities(
      [
        identityEntry("candidate input", candidateHeld.identity),
        identityEntry("runtime capture input", runtimeHeld.identity),
        ...sources.held.map(({ spec, identity }) => identityEntry(spec.role, identity))
      ],
      "SW_AB_FOUR_CHAIN_OUTER_PHYSICAL_ALIAS",
      "Candidate/runtime inputs and checked sources must be physically distinct."
    );

    let checkpointCount = 0;
    let oldComposition;
    let transcriptLoaded;
    const oldInput = {
      bindingRoot: input.bindingRoot,
      candidateInputPath: input.candidateInputPath,
      attachmentsRoot: input.attachmentsRoot,
      privateRoot: input.privateRoot,
      artifactARoot: input.artifactARoot,
      artifactBRoot: input.artifactBRoot,
      runtimeCaptureInputPath: input.runtimeCaptureInputPath
    };
    const issuanceLoaded = await dependencies.loadIssuance({
      cwd: input.bindingRoot,
      bindingRoot: input.bindingRoot,
      runRoot: input.issuanceRunRoot,
      onHeldEpochCheckpoint: async (checkpoint) => {
        requireCondition(
          checkpointCount === 0,
          "checkpoint",
          "SW_AB_FOUR_CHAIN_CHECKPOINT_COUNT_INVALID",
          "Issuance held checkpoint must be called exactly once."
        );
        checkpointCount += 1;
        requireCondition(
          checkpoint?.phase === "after_initial_validation_before_terminal_reread"
            && comparablePath(checkpoint.runRoot) === comparablePath(input.issuanceRunRoot),
          "checkpoint",
          "SW_AB_FOUR_CHAIN_CHECKPOINT_PHASE_INVALID",
          "Issuance held checkpoint phase or run root drifted."
        );
        const settled = await Promise.allSettled([
          dependencies.composeOld(oldInput, { cwd: input.bindingRoot }),
          dependencies.loadTranscript({
            cwd: input.bindingRoot,
            bindingRoot: input.bindingRoot,
            bundleDirectory: path.join(
              input.issuanceRunRoot,
              SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY
            )
          })
        ]);
        requireCondition(
          settled.every(({ status }) => status === "fulfilled"),
          "checkpoint",
          "SW_AB_FOUR_CHAIN_CHECKPOINT_BRANCH_FAILED",
          "One held-window verifier branch failed; both branches were awaited before rejection."
        );
        oldComposition = settled[0].value;
        transcriptLoaded = settled[1].value;
      }
    });
    requireCondition(
      checkpointCount === 1 && oldComposition !== undefined && transcriptLoaded !== undefined,
      "checkpoint",
      "SW_AB_FOUR_CHAIN_CHECKPOINT_COUNT_INVALID",
      "Issuance loader did not complete exactly one held checkpoint."
    );
    for (const held of [...heldInputs, ...sources.held]) await assertHeldFileStable(held);
    assertSwAbFourChainPhysicalSeparation({
      candidateHeld,
      runtimeHeld,
      sourceHeld: sources.held,
      transcriptLoaded,
      issuanceLoaded
    });
    const sourceBindings = checkedSourceBindings(sources);
    const projection = validateSwAbFourChainCompositionBindings({
      oldComposition,
      transcriptLoaded,
      issuanceLoaded,
      candidateHeld,
      runtimeHeld,
      outerSourceBindings: sourceBindings
    });
    return validateSwAbFourChainCompositionDocument(
      buildDocument(projection, sourceBindings),
      sources.schemaValidator
    );
  } finally {
    for (const held of heldInputs.reverse()) await held.handle.close().catch(() => undefined);
    for (const source of [...sources.held].reverse()) {
      await source.handle.close().catch(() => undefined);
    }
  }
}

export async function composeSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuance(
  rawInput,
  options = {}
) {
  requireCondition(
    exactKeys(options, []) || exactKeys(options, ["cwd"]),
    "arguments",
    "SW_AB_FOUR_CHAIN_PUBLIC_OPTIONS_INVALID",
    "Public composer options may contain only cwd; verifier dependencies are fixed internally."
  );
  return composeWithDependencies(rawInput, {
    cwd: options.cwd ?? process.cwd(),
    dependencies: DEFAULT_DEPENDENCIES
  });
}

export function buildSwAbFourChainCompositionFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  return Object.freeze({
    schemaVersion: 1,
    recordType: FAILURE_RECORD_TYPE,
    verificationKind: "offline_four_chain_primary_input_and_issuance_overlap_v1",
    producerBridgeStatus: "producer_bridge_absent",
    trustClass: "untrusted_four_chain_composition_candidate",
    status: "not_admitted",
    executionAdmission: EXECUTION_ADMISSION,
    strictGatePassed: false,
    runtimeAdmissionPassed: false,
    admissionPassed: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    authority: FALSE_AUTHORITY,
    networkAttempted: false,
    browserAttempted: false,
    deploymentAttempted: false,
    rollbackAttempted: false,
    gitAttempted: false,
    cliExitCode: 1,
    failure: Object.freeze({
      stage: error instanceof SwAbFourChainCompositionError ? error.stage : "internal",
      code: error instanceof SwAbFourChainCompositionError
        ? error.code
        : "SW_AB_FOUR_CHAIN_INTERNAL_ERROR",
      messageDigest: sha256(message)
    })
  });
}

export const swAbFourChainCompositionTestOnly = Object.freeze({
  buildDocument,
  composeWithDependencies,
  computeCompositionIdentity,
  sourceSpecs: SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS,
  requiredCrossBindings: REQUIRED_CROSS_BINDINGS,
  falseClaims: FALSE_CLAIMS,
  limitations: LIMITATIONS
});
