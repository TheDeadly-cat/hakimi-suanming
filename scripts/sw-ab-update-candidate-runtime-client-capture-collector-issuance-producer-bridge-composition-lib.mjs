import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_AUTHORITY,
  SW_AB_UPDATE_CANDIDATE_CAPABILITIES,
  SW_AB_UPDATE_CANDIDATE_POLICY_PATH,
  SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY,
  parseSwAbUpdateCandidateJsonBytes,
  validateSwAbUpdateCandidatePolicy
} from "./sw-ab-update-candidate-lib.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_SCHEMA_PATH,
  compileSwAbUpdateCandidateSchema
} from "./sw-ab-update-candidate-schema.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_PATH,
  composeSwAbUpdateCandidateRuntimeClientCapture,
  validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy
} from "./sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_PATH,
  compileSwAbUpdateCandidateRuntimeClientCaptureCompositionSchema
} from "./sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES,
  parseSwAbUpdateRuntimeClientCaptureJsonBytes,
  validateSwAbUpdateRuntimeClientCapturePolicy
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_PATH,
  compileSwAbUpdateRuntimeClientCaptureSchema
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
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE,
  parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes,
  validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";
import {
  compileSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchema
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-schema.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_PATH,
  compileSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchema
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-schema.mjs";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_POLICY_PATH =
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json";

const POLICY_ID =
  "hakimi.web-v1.sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition/v2";
const RECORD_TYPE =
  "sw_ab_update_candidate_runtime_client_capture_collector_issuance_producer_bridge_composition_v2";
const FAILURE_RECORD_TYPE =
  "sw_ab_update_candidate_runtime_client_capture_collector_issuance_producer_bridge_composition_failure_v2";
const VERIFICATION_KIND =
  "offline_four_chain_producer_bridge_primary_input_and_issuance_overlap_v2";
const EXECUTION_ADMISSION = "closed_missing_selected_https_origin";
const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_SET_BYTES = 64 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export const SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS = Object.freeze([
  Object.freeze({
    role: "producer-bridge-composition-v2-policy",
    path: SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_POLICY_PATH
  }),
  Object.freeze({
    role: "producer-bridge-composition-v2-schema",
    path: SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_PATH
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
  }),
  Object.freeze({
    role: "runtime-derived-evidence-producer-bridge-policy",
    path: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH
  }),
  Object.freeze({
    role: "runtime-derived-evidence-producer-bridge-schema",
    path: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH
  })
]);

const REQUIRED_CROSS_BINDINGS = Object.freeze([
  "old_two_chain_composition_reverified_without_four_chain_v1",
  "fixed_bridge_derived_runtime_primary_input",
  "candidate_and_bridge_primary_inputs_held_across_issuance",
  "runtime_input_transcript_issuance_and_bridge_evidence_digest",
  "bridge_derived_file_raw_canonical_and_semantic_digest",
  "transcript_complete_derived_projection",
  "collector_issuance_identity_and_receipt",
  "producer_bridge_identity_and_publication",
  "phase_major_exact_eight_tuple_projection",
  "canonical_origin_artifacts_release_capabilities_run_attempt_and_capture_time",
  "fourteen_unique_checked_policy_and_schema_sources",
  "issuance_files_held_across_composition_branches"
]);

const RUN_ATTEMPT_BOUNDARY = Object.freeze({
  runAttemptIdentifiersMatched: true,
  runAttemptCoordinationStatus: "run_attempt_coordination_absent",
  runAttemptCoordinationVerified: false,
  candidateProducerBoundToIssuanceAttempt: false
});

const FALSE_ATTEMPTS = Object.freeze({
  networkAttempted: false,
  browserAttempted: false,
  deploymentAttempted: false,
  rollbackAttempted: false,
  gitAttempted: false
});

const FALSE_PROVENANCE = Object.freeze({
  candidateProducerProvenanceVerified: false,
  trustedProducerBridgeVerified: false,
  runtimeCollectorProvenanceVerified: false,
  callerSuppliedObservationAuthenticityVerified: false,
  browserObjectIssuanceAuthenticityVerified: false,
  browserBinaryProvenanceVerified: false,
  browserRuntimeProvenanceVerified: false,
  browserTransportAuthenticityVerified: false,
  realBrowserExecutionVerified: false,
  realHttpsHostVerified: false,
  externalAttemptFreshnessVerified: false,
  bundleReplayResistanceVerified: false,
  deploymentExecutionVerified: false,
  rollbackExecutionVerified: false,
  releaseReadinessVerified: false,
  contentTruthVerified: false,
  expertClaimsVerified: false,
  rightsLegalConclusionVerified: false
});

const FALSE_AUTHORITY = Object.freeze(structuredClone(SW_AB_UPDATE_CANDIDATE_AUTHORITY));

const LIMITATIONS = Object.freeze([
  "producer_bridge_is_mechanically_present_but_untrusted",
  "matching_run_attempt_identifiers_do_not_establish_natural_candidate_coordination",
  "candidate_producer_is_not_bound_to_the_issuance_attempt",
  "four_bound_views_share_producer_lineage_and_are_not_independent_attestations",
  "schema13_has_no_mutation_epoch_and_no_epoch_is_fabricated",
  "composition_does_not_authorize_runtime_admission_deployment_release_content_expert_or_rights_claims"
]);

export class SwAbProducerBridgeCompositionError extends Error {
  constructor(stage, code, message, cause) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "SwAbProducerBridgeCompositionError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new SwAbProducerBridgeCompositionError(stage, code, message, cause);
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
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function immutableSnapshot(value) {
  return deepFreeze(structuredClone(value));
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32"
    ? path.toNamespacedPath(resolved).toLocaleLowerCase("en-US")
    : resolved;
}

function requireCanonicalAbsolutePath(value, label) {
  requireCondition(
    typeof value === "string"
      && path.isAbsolute(value)
      && path.normalize(value) === value
      && !value.endsWith(path.sep),
    "arguments",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_PATH_INVALID",
    `${label} must be one canonical absolute path.`
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
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_PATH_OUTSIDE_ROOT",
    `${label} must remain inside bindingRoot.`
  );
  return relative.split(path.sep).join("/");
}

export function parseSwAbProducerBridgeCompositionInput(input) {
  const keys = [
    "bindingRoot",
    "candidateInputPath",
    "attachmentsRoot",
    "privateRoot",
    "artifactARoot",
    "artifactBRoot",
    "issuanceRunRoot",
    "bridgeRoot"
  ];
  requireCondition(
    exactKeys(input, keys),
    "arguments",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_INPUT_INVALID",
    "Composer requires exactly eight path inputs and never accepts runtimeCaptureInputPath."
  );
  const normalized = Object.fromEntries(keys.map((key) => [
    key,
    requireCanonicalAbsolutePath(input[key], key)
  ]));
  for (const key of keys.slice(1)) relativeWithin(normalized.bindingRoot, normalized[key], key);
  requireCondition(
    comparablePath(normalized.issuanceRunRoot) !== comparablePath(normalized.bridgeRoot),
    "arguments",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_ROOT_ALIAS",
    "issuanceRunRoot and bridgeRoot must be distinct."
  );
  const runtimeCaptureInputPath = path.join(
    normalized.bridgeRoot,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE
  );
  const bridgePublicationPath = path.join(
    normalized.bridgeRoot,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE
  );
  relativeWithin(normalized.bindingRoot, runtimeCaptureInputPath, "fixed bridge runtime evidence");
  relativeWithin(normalized.bindingRoot, bridgePublicationPath, "fixed bridge publication");
  return Object.freeze({
    ...normalized,
    runtimeCaptureInputPath,
    bridgePublicationPath
  });
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
  let handle;
  try {
    const [pathBefore, physicalBefore] = await Promise.all([
      lstat(absolutePath, { bigint: true }),
      realpath(absolutePath)
    ]);
    requireCondition(
      pathBefore.isFile()
        && !pathBefore.isSymbolicLink()
        && pathBefore.ino !== 0n
        && pathBefore.nlink === 1n
        && pathBefore.size > 0n
        && pathBefore.size <= BigInt(maximumSize)
        && comparablePath(physicalBefore) === comparablePath(absolutePath),
      "filesystem",
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_FILE_INVALID",
      `${label} must be a bounded real single-link file.`
    );
    handle = await open(absolutePath, "r");
    const before = await handle.stat({ bigint: true });
    requireCondition(
      sameIdentity(pathBefore, before),
      "filesystem",
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_FILE_REBOUND",
      `${label} rebound before held read.`
    );
    const bytes = await readAtZero(handle, Number(before.size));
    const [after, pathAfter, physicalAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(absolutePath, { bigint: true }),
      realpath(absolutePath)
    ]);
    requireCondition(
      sameIdentity(before, after)
        && sameIdentity(after, pathAfter)
        && before.size === after.size
        && before.mtimeNs === after.mtimeNs
        && before.ctimeNs === after.ctimeNs
        && after.nlink === 1n
        && pathAfter.nlink === 1n
        && bytes.length === Number(after.size)
        && comparablePath(physicalAfter) === comparablePath(absolutePath),
      "filesystem",
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_FILE_CHANGED",
      `${label} changed during held read.`
    );
    return {
      label,
      path: absolutePath,
      handle,
      bytes,
      identity: identityProjection(after, physicalAfter),
      binding: Object.freeze({ path: relativePath, size: bytes.length, sha256: sha256(bytes) })
    };
  } catch (error) {
    await handle?.close().catch(() => undefined);
    throw error;
  }
}

async function assertHeldFileStable(held) {
  const bytes = await readAtZero(held.handle, Number(held.identity.size));
  const [after, pathAfter, physicalAfter] = await Promise.all([
    held.handle.stat({ bigint: true }),
    lstat(held.path, { bigint: true }),
    realpath(held.path)
  ]);
  requireCondition(
    String(after.dev) === held.identity.dev
      && String(after.ino) === held.identity.ino
      && String(after.birthtimeNs) === held.identity.birthtimeNs
      && String(after.size) === held.identity.size
      && String(after.mtimeNs) === held.identity.mtimeNs
      && String(after.ctimeNs) === held.identity.ctimeNs
      && after.nlink === 1n
      && pathAfter.isFile()
      && !pathAfter.isSymbolicLink()
      && pathAfter.nlink === 1n
      && String(pathAfter.dev) === held.identity.dev
      && String(pathAfter.ino) === held.identity.ino
      && String(pathAfter.birthtimeNs) === held.identity.birthtimeNs
      && comparablePath(physicalAfter) === held.identity.realPath
      && bytes.length === held.bytes.length
      && bytes.equals(held.bytes),
    "filesystem",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_TERMINAL_FILE_CHANGED",
    `${held.label} changed inside the held composition window.`
  );
}

function identityKey(identity) {
  return `${identity.dev}\0${identity.ino}\0${identity.birthtimeNs}`;
}

function requireDistinctOuterFiles(entries) {
  const paths = entries.map(({ identity }) => identity.realPath);
  const identities = entries.map(({ identity }) => identityKey(identity));
  requireCondition(
    new Set(paths).size === entries.length && new Set(identities).size === entries.length,
    "filesystem",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_OUTER_PHYSICAL_ALIAS",
    "Candidate, bridge files, and fourteen checked sources must be physically distinct."
  );
}

export function validateSwAbProducerBridgeCompositionPolicy(policy) {
  requireCondition(
    exactKeys(policy, [
      "schemaVersion", "policyId", "evidenceClass", "producerBridgeStatus",
      "candidateBridgeArtifactPresent", "trustedProducerBridgeVerified",
      "runAttemptCoordinationStatus", "releaseIdentity", "capabilities",
      "requiredSourceBindings", "requiredCrossBindings", "executionAdmission",
      "terminalState", "runAttemptBoundary", "mutationBoundary", "attempts",
      "provenance", "authority", "limitations"
    ])
      && policy.schemaVersion === 2
      && policy.policyId === POLICY_ID
      && policy.evidenceClass
        === "offline_untrusted_four_chain_producer_bridge_composition_candidate"
      && policy.producerBridgeStatus === "producer_bridge_present_mechanically_untrusted"
      && policy.candidateBridgeArtifactPresent === true
      && policy.trustedProducerBridgeVerified === false
      && policy.runAttemptCoordinationStatus === "run_attempt_coordination_absent"
      && exactJson(policy.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(policy.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && exactJson(policy.requiredSourceBindings, SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS)
      && new Set(policy.requiredSourceBindings.map(({ path: sourcePath }) => sourcePath)).size === 14
      && exactJson(policy.requiredCrossBindings, REQUIRED_CROSS_BINDINGS)
      && policy.executionAdmission === EXECUTION_ADMISSION
      && exactJson(policy.terminalState, {
        trustClass: "untrusted_four_chain_producer_bridge_composition_candidate",
        status: "not_admitted",
        strictGatePassed: false,
        runtimeAdmissionPassed: false,
        admissionPassed: false,
        usableForRuntimeEvidence: false,
        usableForCandidateAssembly: false,
        usableForAdmission: false,
        formalReleaseEvidenceReceipt: false,
        cliExitCode: 1
      })
      && exactJson(policy.runAttemptBoundary, RUN_ATTEMPT_BOUNDARY)
      && exactJson(policy.mutationBoundary, {
        candidateAndBridgePrimaryInputsHeldAcrossIssuance: true,
        issuanceFilesHeldAcrossCompositionBranches: true,
        allEvidenceFilesContinuouslyHeldAcrossCaptureAndComposition: false,
        continuousMutationEpochVerified: false,
        samePermissionMutationExcluded: false,
        intervalMutationExcluded: false,
        abaExcluded: false,
        mutationEpochCapability: "absent_schema13",
        epoch: null
      })
      && exactJson(policy.attempts, FALSE_ATTEMPTS)
      && exactJson(policy.provenance, FALSE_PROVENANCE)
      && exactJson(policy.authority, FALSE_AUTHORITY)
      && exactJson(policy.limitations, [
        "The mechanically present bridge republishes a transcript-derived runtime document but is not a trusted producer.",
        "Matching run and attempt identifiers do not establish a natural candidate-to-issuance coordinator.",
        "The candidate producer remains absent; injected or synthetic equality is not natural production reachability.",
        "The four bound views share producer lineage and are not four independent runtime attestations.",
        "Schema 13 exposes no mutation epoch and cannot exclude interval mutation, same-permission mutation, or ABA.",
        "Offline composition does not establish browser, HTTPS host, deployment, content, expert, rights, or release authority."
      ]),
    "policy",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_INVALID",
    "Producer-bridge composition policy drifted from its exact closed v2 boundary."
  );
  return policy;
}

async function holdCheckedSources(bindingRoot) {
  const held = [];
  let totalSize = 0;
  try {
    for (const spec of SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS) {
      const source = await holdStableFile({
        bindingRoot,
        filePath: path.resolve(bindingRoot, ...spec.path.split("/")),
        label: spec.role,
        maximumSize: MAX_SOURCE_BYTES
      });
      requireCondition(
        source.binding.path === spec.path,
        "source",
        "SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_PATH_INVALID",
        `${spec.role} is not at its frozen path.`
      );
      totalSize += source.binding.size;
      requireCondition(
        totalSize <= MAX_SOURCE_SET_BYTES,
        "source",
        "SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SET_SIZE_INVALID",
        "Fourteen checked sources exceed their aggregate bound."
      );
      const value = parseSwAbUpdateCandidateJsonBytes(source.bytes, spec.role);
      held.push({
        ...source,
        spec,
        value,
        canonicalSha256: sha256(canonicalJson(value))
      });
    }
    requireDistinctOuterFiles(held);
    validateSwAbProducerBridgeCompositionPolicy(held[0].value);
    let schemaValidator;
    try {
      schemaValidator =
        compileSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchema(
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
      validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy(held[12].value);
      compileSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchema(held[13].value);
    } catch (cause) {
      fail(
        "source",
        "SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKED_SOURCE_INVALID",
        "One checked policy or Schema failed its authoritative validator.",
        cause
      );
    }
    return { held, schemaValidator };
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

function normalizeNestedSourceBinding(binding, label) {
  requireCondition(
    isRecord(binding)
      && typeof binding.path === "string"
      && Number.isInteger(binding.size)
      && binding.size > 0
      && SHA256_PATTERN.test(binding.rawSha256 ?? binding.sha256 ?? "")
      && SHA256_PATTERN.test(binding.canonicalSha256 ?? ""),
    "source",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_NESTED_SOURCE_INVALID",
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
      && nestedBindings.length === expectedPaths.length
      && exactJson(nestedBindings.map(({ path: sourcePath }) => sourcePath), expectedPaths),
    "source",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_NESTED_SOURCE_PATH_SET_INVALID",
    `${label} source path order drifted.`
  );
  const outerByPath = new Map(outerBindings.map((binding) => [binding.path, binding]));
  for (const binding of nestedBindings) {
    const normalized = normalizeNestedSourceBinding(binding, label);
    const expected = outerByPath.get(normalized.path);
    requireCondition(
      expected !== undefined
        && normalized.size === expected.size
        && normalized.rawSha256 === expected.rawSha256
        && normalized.canonicalSha256 === expected.canonicalSha256,
      "source",
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_NESTED_SOURCE_DRIFT",
      `${label} source bytes or canonical digest drifted.`
    );
  }
}

function assertAllNestedSourceBindings({ oldComposition, transcriptLoaded, issuanceLoaded, bridgeLoaded, outer }) {
  assertNestedSourceSet({
    label: "old two-chain composition",
    nestedBindings: oldComposition.sourceBindings,
    expectedPaths: SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS.slice(2, 8)
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
  assertNestedSourceSet({
    label: "derived evidence producer bridge",
    nestedBindings: bridgeLoaded.sourceBindings,
    expectedPaths: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS
      .map(({ path: sourcePath }) => sourcePath),
    outerBindings: outer
  });
  const union = new Set([
    ...oldComposition.sourceBindings,
    ...transcriptLoaded.sourceBindings,
    ...issuanceLoaded.sourceBindings,
    ...bridgeLoaded.sourceBindings,
    outer[0],
    outer[1]
  ].map(({ path: sourcePath }) => sourcePath));
  requireCondition(
    union.size === 14
      && SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS.every(({ path: sourcePath }) =>
        union.has(sourcePath)
      ),
    "source",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_UNION_INVALID",
    "Nested verifier source union is not the exact fourteen-path set."
  );
}

function assertOldComposition(oldComposition) {
  requireCondition(
    isRecord(oldComposition)
      && oldComposition.recordType
        === "sw_ab_update_candidate_runtime_client_capture_composition_v1"
      && oldComposition.status === "not_admitted"
      && oldComposition.strictGatePassed === false
      && oldComposition.usableForCandidateAssembly === false
      && oldComposition.usableForAdmission === false
      && oldComposition.formalReleaseEvidenceReceipt === false
      && oldComposition.cliExitCode === 1
      && /^swabrc1-[a-f0-9]{32}$/u.test(oldComposition.compositionId ?? "")
      && SHA256_PATTERN.test(oldComposition.compositionDigest ?? "")
      && SHA256_PATTERN.test(oldComposition.sourceSetDigest ?? "")
      && isRecord(oldComposition.scope)
      && isRecord(oldComposition.artifactBindings)
      && isRecord(oldComposition.inputBindings)
      && Array.isArray(oldComposition.clientMappings)
      && oldComposition.clientMappings.length === 8
      && isRecord(oldComposition.chronologyBindings)
      && Array.isArray(oldComposition.sourceBindings)
      && oldComposition.sourceBindings.length === 6,
    "two-chain",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_OLD_COMPOSITION_INVALID",
    "Frozen two-chain composer did not return its exact closed v1 result."
  );
}

function assertTranscriptLoaded(transcriptLoaded) {
  const result = transcriptLoaded?.result;
  requireCondition(
    isRecord(transcriptLoaded)
      && isRecord(result)
      && result.code === "SW_AB_RUNTIME_API_TRANSCRIPT_DERIVED_NOT_ADMITTED"
      && result.status === "capture_incomplete"
      && result.terminalEndpointSnapshotsMatched === true
      && result.usableForRuntimeEvidence === false
      && result.usableForCandidateAssembly === false
      && result.formalReleaseEvidenceReceipt === false
      && result.cliExitCode === 1
      && SHA256_PATTERN.test(result.derivedEvidenceDigest ?? "")
      && isRecord(result.derivedProjection)
      && Array.isArray(result.derivedProjection.observations)
      && result.derivedProjection.observations.length === 8
      && isRecord(transcriptLoaded.manifestBinding)
      && Array.isArray(transcriptLoaded.tupleBindings)
      && transcriptLoaded.tupleBindings.length === 8
      && Array.isArray(transcriptLoaded.sourceBindings)
      && isRecord(transcriptLoaded.endpointFingerprint),
    "transcript",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_TRANSCRIPT_INVALID",
    "Independent transcript loader did not return its exact closed projection."
  );
}

function assertIssuanceLoaded(issuanceLoaded) {
  const result = issuanceLoaded?.result;
  requireCondition(
    isRecord(issuanceLoaded)
      && isRecord(result)
      && result.code === "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_NOT_ADMITTED"
      && result.status === "issuance_incomplete"
      && result.transcriptBundleBindingVerified === true
      && result.terminalEndpointSnapshotsMatched === true
      && result.overlappingHeldFileEpochEstablished === true
      && result.continuousMutationEpochVerified === false
      && result.samePermissionMutationExcluded === false
      && result.intervalMutationExcluded === false
      && result.abaExcluded === false
      && result.mutationEpochCapability === "absent_schema13"
      && result.epoch === null
      && result.usableForRuntimeEvidence === false
      && result.usableForCandidateAssembly === false
      && result.formalReleaseEvidenceReceipt === false
      && result.cliExitCode === 1
      && typeof result.issuanceId === "string"
      && SHA256_PATTERN.test(result.receiptDigest ?? "")
      && SHA256_PATTERN.test(result.derivedEvidenceDigest ?? "")
      && isRecord(issuanceLoaded.markerBinding)
      && isRecord(issuanceLoaded.receiptBinding)
      && isRecord(issuanceLoaded.transcriptBundleBinding)
      && Array.isArray(issuanceLoaded.sourceBindings)
      && isRecord(issuanceLoaded.endpointFingerprint),
    "issuance",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_ISSUANCE_INVALID",
    "Collector issuance loader did not return its exact closed candidate."
  );
}

function assertBridgeLoaded(bridgeLoaded) {
  const result = bridgeLoaded?.result;
  requireCondition(
    isRecord(bridgeLoaded)
      && isRecord(result)
      && result.code === "SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_NOT_ADMITTED"
      && result.producerBridgeStatus === "producer_bridge_present_mechanically_untrusted"
      && result.status === "bridge_candidate_not_admitted"
      && result.usableForRuntimeEvidence === false
      && result.usableForCandidateAssembly === false
      && result.formalReleaseEvidenceReceipt === false
      && result.cliExitCode === 1
      && typeof result.bridgeId === "string"
      && /^swabpb1-[a-f0-9]{32}$/u.test(result.bridgeId)
      && SHA256_PATTERN.test(result.publicationDigest ?? "")
      && SHA256_PATTERN.test(result.derivedEvidenceDigest ?? "")
      && isRecord(result.derivedProjection)
      && Array.isArray(result.derivedProjection.observations)
      && result.derivedProjection.observations.length === 8
      && isRecord(bridgeLoaded.publication)
      && isRecord(bridgeLoaded.derivedEvidenceBinding)
      && Array.isArray(bridgeLoaded.sourceBindings)
      && bridgeLoaded.sourceBindings.length === 8
      && isRecord(bridgeLoaded.endpointFingerprint)
      && Array.isArray(bridgeLoaded.endpointFingerprint.outputs)
      && bridgeLoaded.endpointFingerprint.outputs.length === 2
      && isRecord(bridgeLoaded.endpointFingerprint.terminalGate)
      && Array.isArray(bridgeLoaded.endpointFingerprint.bridgeSources)
      && bridgeLoaded.endpointFingerprint.bridgeSources.length === 2
      && isRecord(bridgeLoaded.endpointFingerprint.issuance),
    "bridge",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_BRIDGE_INVALID",
    "Producer bridge loader did not return its exact closed candidate."
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

function requireOldInputBinding(oldBinding, held, label) {
  requireCondition(
    isRecord(oldBinding)
      && oldBinding.path === held.binding.path
      && oldBinding.size === held.binding.size
      && oldBinding.sha256 === held.binding.sha256
      && SHA256_PATTERN.test(oldBinding.evidenceDigest ?? "")
      && typeof oldBinding.capturedAt === "string",
    "binding",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_INPUT_BINDING_MISMATCH",
    `${label} drifted from its outer held bytes.`
  );
  return oldBinding;
}

function requireBridgeDerivedBinding(bridgeLoaded, runtimeHeld, runtimeEvidence) {
  const binding = bridgeLoaded.derivedEvidenceBinding;
  const canonicalSha256 = sha256(canonicalJson(runtimeEvidence));
  requireCondition(
    binding.path === SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE
      && binding.size === runtimeHeld.binding.size
      && binding.rawSha256 === runtimeHeld.binding.sha256
      && binding.canonicalSha256 === canonicalSha256
      && binding.semanticDigest === runtimeEvidence.evidenceDigest,
    "bridge",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_BRIDGE_DERIVED_BINDING_MISMATCH",
    "Bridge 01 raw, canonical, or semantic digest drifted from the held runtime document."
  );
  return Object.freeze({ ...binding });
}

function assertTranscriptIssuanceBridgeIdentity(transcriptLoaded, issuanceLoaded, bridgeLoaded) {
  const transcript = transcriptLoaded.result;
  const issuance = issuanceLoaded.result;
  const bridge = bridgeLoaded.result;
  requireCondition(
    issuance.bundleId === transcript.bundleId
      && issuance.bundleDigest === transcript.bundleDigest
      && issuance.derivedEvidenceDigest === transcript.derivedEvidenceDigest
      && bridge.bundleId === transcript.bundleId
      && bridge.bundleDigest === transcript.bundleDigest
      && bridge.derivedEvidenceDigest === transcript.derivedEvidenceDigest
      && bridge.issuanceId === issuance.issuanceId
      && bridge.receiptDigest === issuance.receiptDigest,
    "binding",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHAIN_IDENTITY_MISMATCH",
    "Transcript, issuance, and producer bridge identities drifted."
  );
}

function endpointFingerprintDigest(value) {
  requireCondition(
    isRecord(value),
    "filesystem",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_ENDPOINT_FINGERPRINT_INVALID",
    "Nested loader omitted its endpoint fingerprint."
  );
  return sha256(canonicalJson(value));
}

export function validateSwAbProducerBridgeCompositionBindings({
  oldComposition,
  transcriptLoaded,
  issuanceLoaded,
  bridgeLoaded,
  candidateHeld,
  runtimeHeld,
  publicationHeld,
  runtimeEvidence,
  publication,
  outerSourceBindings
}) {
  assertOldComposition(oldComposition);
  assertTranscriptLoaded(transcriptLoaded);
  assertIssuanceLoaded(issuanceLoaded);
  assertBridgeLoaded(bridgeLoaded);
  requireCondition(
    Array.isArray(outerSourceBindings) && outerSourceBindings.length === 14,
    "source",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_OUTER_SOURCE_SET_INVALID",
    "Exactly fourteen outer checked source bindings are required."
  );
  assertAllNestedSourceBindings({
    oldComposition,
    transcriptLoaded,
    issuanceLoaded,
    bridgeLoaded,
    outer: outerSourceBindings
  });
  assertTranscriptIssuanceBridgeIdentity(transcriptLoaded, issuanceLoaded, bridgeLoaded);

  const scope = oldComposition.scope;
  const transcript = transcriptLoaded.result;
  const runtime = transcript.derivedProjection;
  const issuance = issuanceLoaded.result;
  const bridge = bridgeLoaded.result;
  const candidateInput = requireOldInputBinding(
    oldComposition.inputBindings.candidate,
    candidateHeld,
    "candidate input"
  );
  const runtimeInput = requireOldInputBinding(
    oldComposition.inputBindings.runtimeCapture,
    runtimeHeld,
    "fixed bridge runtime input"
  );
  const derivedEvidenceBinding = requireBridgeDerivedBinding(
    bridgeLoaded,
    runtimeHeld,
    runtimeEvidence
  );
  requireCondition(
    exactJson(publication, bridgeLoaded.publication)
      && publication.bridgeId === bridge.bridgeId
      && publication.publicationDigest === bridge.publicationDigest,
    "bridge",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_PUBLICATION_MISMATCH",
    "Held bridge publication drifted from the independent bridge loader."
  );
  requireCondition(
    candidateInput.path !== runtimeInput.path
      && candidateInput.sha256 !== runtimeInput.sha256
      && runtimeEvidence.evidenceDigest === runtimeInput.evidenceDigest
      && runtimeEvidence.evidenceDigest === transcript.derivedEvidenceDigest
      && runtimeEvidence.evidenceDigest === issuance.derivedEvidenceDigest
      && runtimeEvidence.evidenceDigest === bridge.derivedEvidenceDigest
      && runtime.evidenceDigest === runtimeEvidence.evidenceDigest,
    "binding",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_EVIDENCE_DIGEST_MISMATCH",
    "Runtime input, transcript, issuance, and producer bridge do not share one evidence digest."
  );
  requireCondition(
    scope.runId === runtime.runId
      && scope.attemptId === runtime.attemptId
      && scope.runId === issuance.runId
      && scope.attemptId === issuance.attemptId
      && scope.runId === bridge.runId
      && scope.attemptId === bridge.attemptId
      && scope.runId === runtimeEvidence.runId
      && scope.attemptId === runtimeEvidence.attemptId
      && scope.canonicalHttpsOrigin === runtime.canonicalHttpsOrigin
      && scope.canonicalHttpsOrigin === runtimeEvidence.origin
      && exactJson(scope.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(scope.releaseIdentity, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY)
      && exactJson(scope.releaseIdentity, runtime.releaseIdentity)
      && exactJson(scope.releaseIdentity, issuance.releaseIdentity)
      && exactJson(scope.releaseIdentity, bridge.releaseIdentity)
      && exactJson(scope.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && exactJson(scope.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
      && exactJson(scope.capabilities, runtime.capabilities)
      && exactJson(scope.capabilities, issuance.capabilities)
      && exactJson(scope.capabilities, bridge.capabilities),
    "binding",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCOPE_MISMATCH",
    "Four views do not share origin, release, capabilities, run, and attempt identifiers."
  );
  requireCondition(
    exactJson(oldComposition.artifactBindings, runtime.artifactBindings)
      && exactJson(oldComposition.artifactBindings, runtimeEvidence.artifactBindings)
      && exactJson(runtime, bridge.derivedProjection),
    "binding",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_ARTIFACT_OR_PROJECTION_MISMATCH",
    "A/B artifact bindings or complete producer-bridge projection drifted."
  );
  requireCondition(
    runtime.capturedAt === oldComposition.chronologyBindings.runtimeCaptureCapturedAt
      && runtime.capturedAt === runtimeInput.capturedAt
      && runtime.capturedAt === runtimeEvidence.capturedAt,
    "binding",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_CAPTURE_TIME_MISMATCH",
    "Runtime input and transcript capturedAt values differ."
  );
  const transcriptTuples = runtime.observations.map(tupleProjection);
  const bridgeTuples = bridge.derivedProjection.observations.map(tupleProjection);
  const oldTuples = oldComposition.clientMappings.map(mappingTupleProjection);
  requireCondition(
    exactJson(
      transcriptTuples.map(({ projectName, phase, slot }) => ({ projectName, phase, slot })),
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
    )
      && exactJson(oldTuples, transcriptTuples)
      && exactJson(bridgeTuples, transcriptTuples),
    "binding",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_TUPLE_MISMATCH",
    "Two-chain, transcript, and producer bridge differ on an exact phase-major tuple field."
  );
  return immutableSnapshot({
    scope,
    artifactBindings: oldComposition.artifactBindings,
    inputBindings: {
      candidate: {
        path: candidateInput.path,
        size: candidateInput.size,
        rawSha256: candidateInput.sha256,
        evidenceDigest: candidateInput.evidenceDigest,
        capturedAt: candidateInput.capturedAt,
        heldIdentityDigest: sha256(canonicalJson(candidateHeld.identity))
      },
      runtimeCapture: {
        path: runtimeInput.path,
        size: runtimeInput.size,
        rawSha256: runtimeInput.sha256,
        canonicalSha256: derivedEvidenceBinding.canonicalSha256,
        evidenceDigest: runtimeInput.evidenceDigest,
        capturedAt: runtimeInput.capturedAt,
        heldIdentityDigest: sha256(canonicalJson(runtimeHeld.identity))
      },
      producerBridgePublication: {
        path: publicationHeld.binding.path,
        size: publicationHeld.binding.size,
        rawSha256: publicationHeld.binding.sha256,
        canonicalSha256: sha256(canonicalJson(publication)),
        bridgeId: bridge.bridgeId,
        publicationDigest: bridge.publicationDigest,
        heldIdentityDigest: sha256(canonicalJson(publicationHeld.identity))
      }
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
      endpointFingerprintDigest: endpointFingerprintDigest(transcriptLoaded.endpointFingerprint)
    },
    issuanceBinding: {
      issuanceId: issuance.issuanceId,
      receiptDigest: issuance.receiptDigest,
      bundleId: issuance.bundleId,
      bundleDigest: issuance.bundleDigest,
      derivedEvidenceDigest: issuance.derivedEvidenceDigest,
      markerBinding: issuanceLoaded.markerBinding,
      receiptBinding: issuanceLoaded.receiptBinding,
      endpointFingerprintDigest: endpointFingerprintDigest(issuanceLoaded.endpointFingerprint)
    },
    producerBridgeBinding: {
      bridgeId: bridge.bridgeId,
      publicationDigest: bridge.publicationDigest,
      producerBridgeStatus: bridge.producerBridgeStatus,
      issuanceId: bridge.issuanceId,
      receiptDigest: bridge.receiptDigest,
      bundleId: bridge.bundleId,
      bundleDigest: bridge.bundleDigest,
      derivedEvidenceBinding,
      sourceSetDigest: publication.sourceSetDigest,
      endpointFingerprintDigest: endpointFingerprintDigest(bridgeLoaded.endpointFingerprint)
    },
    runtimeTupleBindings: transcriptTuples,
    clientMappings: oldComposition.clientMappings,
    chronologyBindings: oldComposition.chronologyBindings
  });
}

export function assertSwAbProducerBridgeCompositionPhysicalIdentities(entries) {
  const byLogicalPath = new Map();
  const byIdentity = new Map();
  for (const entry of entries) {
    requireCondition(
      isRecord(entry)
        && typeof entry.logicalPath === "string"
        && isRecord(entry.identity)
        && typeof entry.identity.realPath === "string"
        && typeof entry.identity.dev === "string"
        && typeof entry.identity.ino === "string"
        && typeof entry.identity.birthtimeNs === "string",
      "filesystem",
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_ENDPOINT_IDENTITY_INVALID",
      "One endpoint identity entry is invalid."
    );
    const existingForPath = byLogicalPath.get(entry.logicalPath);
    if (existingForPath !== undefined) {
      requireCondition(
        exactJson(existingForPath, entry.identity),
        "filesystem",
        "SW_AB_PRODUCER_BRIDGE_COMPOSITION_SHARED_ENDPOINT_DRIFT",
        `${entry.logicalPath} was loaded with different physical identities.`
      );
    } else {
      byLogicalPath.set(entry.logicalPath, entry.identity);
    }
    const key = identityKey(entry.identity);
    const existingPath = byIdentity.get(key);
    requireCondition(
      existingPath === undefined || existingPath === entry.logicalPath,
      "filesystem",
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_PHYSICAL_ALIAS",
      "Different logical evidence endpoints share one physical identity."
    );
    byIdentity.set(key, entry.logicalPath);
  }
  return true;
}

function appendFingerprintEntries(entries, { prefix, bindings, identities }) {
  if (!Array.isArray(bindings) || !Array.isArray(identities) || bindings.length !== identities.length) {
    return;
  }
  for (let index = 0; index < bindings.length; index += 1) {
    entries.push({ logicalPath: `${prefix}/${bindings[index].path}`, identity: identities[index] });
  }
}

function appendIssuanceFingerprintEntries(entries, {
  issuancePrefix,
  transcriptBindings,
  sourceBindings,
  markerBinding,
  receiptBinding,
  fingerprint
}) {
  if (!isRecord(fingerprint)) return;
  if (isRecord(fingerprint.marker)) {
    entries.push({
      logicalPath: `${issuancePrefix}/${markerBinding.path}`,
      identity: fingerprint.marker
    });
  }
  if (isRecord(fingerprint.receipt)) {
    entries.push({
      logicalPath: `${issuancePrefix}/${receiptBinding.path}`,
      identity: fingerprint.receipt
    });
  }
  appendFingerprintEntries(entries, {
    prefix: `${issuancePrefix}/${SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY}`,
    bindings: transcriptBindings,
    identities: fingerprint.transcript
  });
  appendFingerprintEntries(entries, {
    prefix: "",
    bindings: sourceBindings,
    identities: fingerprint.sources
  });
}

function assertPhysicalSeparation({
  input,
  candidateHeld,
  runtimeHeld,
  publicationHeld,
  sourceHeld,
  transcriptLoaded,
  issuanceLoaded,
  bridgeLoaded
}) {
  const entries = [
    { logicalPath: candidateHeld.binding.path, identity: candidateHeld.identity },
    { logicalPath: runtimeHeld.binding.path, identity: runtimeHeld.identity },
    { logicalPath: publicationHeld.binding.path, identity: publicationHeld.identity },
    ...sourceHeld.map(({ binding, identity }) => ({ logicalPath: binding.path, identity }))
  ];
  const issuancePrefix = relativeWithin(input.bindingRoot, input.issuanceRunRoot, "issuanceRunRoot");
  const bridgePrefix = relativeWithin(input.bindingRoot, input.bridgeRoot, "bridgeRoot");
  if (isRecord(transcriptLoaded.endpointFingerprint)) {
    appendFingerprintEntries(entries, {
      prefix: `${issuancePrefix}/${SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY}`,
      bindings: transcriptLoaded.tupleBindings,
      identities: transcriptLoaded.endpointFingerprint.tuples
    });
    if (isRecord(transcriptLoaded.endpointFingerprint.manifest)) {
      entries.push({
        logicalPath: `${issuancePrefix}/${SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY}/${transcriptLoaded.manifestBinding.path}`,
        identity: transcriptLoaded.endpointFingerprint.manifest
      });
    }
    appendFingerprintEntries(entries, {
      prefix: "",
      bindings: transcriptLoaded.sourceBindings,
      identities: transcriptLoaded.endpointFingerprint.sources
    });
  }
  if (isRecord(issuanceLoaded.endpointFingerprint)) {
    const transcriptBindings = [
      ...transcriptLoaded.tupleBindings,
      transcriptLoaded.manifestBinding
    ];
    appendIssuanceFingerprintEntries(entries, {
      issuancePrefix,
      transcriptBindings,
      sourceBindings: issuanceLoaded.sourceBindings,
      markerBinding: issuanceLoaded.markerBinding,
      receiptBinding: issuanceLoaded.receiptBinding,
      fingerprint: issuanceLoaded.endpointFingerprint
    });
  }
  if (isRecord(bridgeLoaded.endpointFingerprint)) {
    const evidenceIdentity = bridgeLoaded.endpointFingerprint.outputs?.[0];
    const publicationIdentity = bridgeLoaded.endpointFingerprint.outputs?.[1];
    if (isRecord(evidenceIdentity)) {
      entries.push({
        logicalPath: `${bridgePrefix}/${SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE}`,
        identity: evidenceIdentity
      });
    }
    if (isRecord(publicationIdentity)) {
      entries.push({
        logicalPath: `${bridgePrefix}/${SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE}`,
        identity: publicationIdentity
      });
    }
    if (isRecord(bridgeLoaded.endpointFingerprint.terminalGate)) {
      entries.push({
        logicalPath: `${bridgePrefix}/${SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE}`,
        identity: bridgeLoaded.endpointFingerprint.terminalGate
      });
    }
    appendFingerprintEntries(entries, {
      prefix: "",
      bindings: bridgeLoaded.sourceBindings.slice(0, 2),
      identities: bridgeLoaded.endpointFingerprint.bridgeSources
    });
    appendIssuanceFingerprintEntries(entries, {
      issuancePrefix,
      transcriptBindings: [
        ...transcriptLoaded.tupleBindings,
        transcriptLoaded.manifestBinding
      ],
      sourceBindings: issuanceLoaded.sourceBindings,
      markerBinding: issuanceLoaded.markerBinding,
      receiptBinding: issuanceLoaded.receiptBinding,
      fingerprint: bridgeLoaded.endpointFingerprint.issuance
    });
  }
  return assertSwAbProducerBridgeCompositionPhysicalIdentities(entries.map((entry) => ({
    logicalPath: entry.logicalPath.replace(/^\//u, ""),
    identity: entry.identity
  })));
}

function computeCompositionIdentity(document) {
  const unsigned = structuredClone(document);
  delete unsigned.compositionId;
  delete unsigned.compositionDigest;
  const compositionId = `swab4pb2-${sha256(canonicalJson({
    namespace: "hakimi-sw-ab-producer-bridge-composition-id-v2",
    scope: unsigned.scope,
    artifactBindings: unsigned.artifactBindings,
    inputBindings: unsigned.inputBindings,
    oldCompositionBinding: unsigned.oldCompositionBinding,
    transcriptBinding: unsigned.transcriptBinding,
    issuanceBinding: unsigned.issuanceBinding,
    producerBridgeBinding: unsigned.producerBridgeBinding,
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
    schemaVersion: 2,
    policyId: POLICY_ID,
    evidenceClass: "offline_untrusted_four_chain_producer_bridge_composition_candidate",
    producerBridgeStatus: "producer_bridge_present_mechanically_untrusted",
    candidateBridgeArtifactPresent: true,
    trustedProducerBridgeVerified: false,
    runAttemptIdentifiersMatched: true,
    runAttemptCoordinationStatus: "run_attempt_coordination_absent",
    runAttemptCoordinationVerified: false,
    candidateProducerBoundToIssuanceAttempt: false,
    recordType: RECORD_TYPE,
    verificationKind: VERIFICATION_KIND,
    trustClass: "untrusted_four_chain_producer_bridge_composition_candidate",
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
    compositionId: `swab4pb2-${"0".repeat(32)}`,
    ...projection,
    sourceBindings,
    sourceSetDigest: sha256(canonicalJson(sourceBindings)),
    runAttemptBoundary: RUN_ATTEMPT_BOUNDARY,
    mechanicalChecks: {
      oldTwoChainCompositionReverified: true,
      fixedBridgeRuntimeInputEnforced: true,
      candidateAndBridgePrimaryInputsHeldAcrossIssuance: true,
      issuanceCheckpointCalledExactlyOnce: true,
      issuanceCheckpointPhaseMatched: true,
      allCompositionBranchesSettledInsideIssuanceHeldWindow: true,
      independentTranscriptReverifiedInsideIssuanceHeldWindow: true,
      producerBridgeReverifiedInsideIssuanceHeldWindow: true,
      nestedSourceBytesAndCanonicalDigestsMatched: true,
      physicalAliasRejectedExceptExactSharedEndpoints: true,
      scopeArtifactAndEvidenceDigestsMatched: true,
      bridgeRawCanonicalAndSemanticDigestsMatched: true,
      exactPhaseMajorTupleProjectionMatched: true,
      runAttemptIdentifiersMatched: true,
      runAttemptCoordinationVerified: false,
      issuanceFilesHeldAcrossCompositionBranches: true,
      allEvidenceFilesContinuouslyHeldAcrossCaptureAndComposition: false,
      endpointStabilityVerified: true,
      compositionDigestMatched: true
    },
    mutationBoundary: {
      candidateAndBridgePrimaryInputsHeldAcrossIssuance: true,
      issuanceFilesHeldAcrossCompositionBranches: true,
      allEvidenceFilesContinuouslyHeldAcrossCaptureAndComposition: false,
      continuousMutationEpochVerified: false,
      samePermissionMutationExcluded: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      mutationEpochCapability: "absent_schema13",
      epoch: null
    },
    attempts: FALSE_ATTEMPTS,
    provenance: FALSE_PROVENANCE,
    authority: FALSE_AUTHORITY,
    limitations: LIMITATIONS,
    compositionDigest: "0".repeat(64)
  };
  Object.assign(document, computeCompositionIdentity(document));
  return immutableSnapshot(document);
}

export function validateSwAbProducerBridgeCompositionDocument(document, schemaValidator) {
  try {
    schemaValidator.assert(document);
  } catch (cause) {
    fail(
      "schema",
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_DOCUMENT_SCHEMA_INVALID",
      "Producer-bridge composition document does not match its checked closed Schema.",
      cause
    );
  }
  const identity = computeCompositionIdentity(document);
  requireCondition(
    document.policyId === POLICY_ID
      && document.recordType === RECORD_TYPE
      && document.producerBridgeStatus === "producer_bridge_present_mechanically_untrusted"
      && document.candidateBridgeArtifactPresent === true
      && document.trustedProducerBridgeVerified === false
      && document.runAttemptIdentifiersMatched === true
      && document.runAttemptCoordinationStatus === "run_attempt_coordination_absent"
      && document.runAttemptCoordinationVerified === false
      && document.candidateProducerBoundToIssuanceAttempt === false
      && exactJson(document.runAttemptBoundary, RUN_ATTEMPT_BOUNDARY)
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
      && document.sourceBindings.length === 14
      && exactJson(
        document.sourceBindings.map(({ role, path: sourcePath }) => ({ role, path: sourcePath })),
        SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS
      )
      && document.sourceSetDigest === sha256(canonicalJson(document.sourceBindings))
      && exactJson(document.scope.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
      && exactJson(document.scope.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
      && exactJson(document.scope.browserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
      && exactJson(document.scope.phases, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES)
      && exactJson(document.scope.slots, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
      && exactJson(document.runtimeTupleBindings, document.clientMappings.map(mappingTupleProjection))
      && document.inputBindings.runtimeCapture.evidenceDigest
        === document.transcriptBinding.derivedEvidenceDigest
      && document.transcriptBinding.derivedEvidenceDigest
        === document.issuanceBinding.derivedEvidenceDigest
      && document.transcriptBinding.derivedEvidenceDigest
        === document.producerBridgeBinding.derivedEvidenceBinding.semanticDigest
      && document.transcriptBinding.bundleId === document.issuanceBinding.bundleId
      && document.transcriptBinding.bundleDigest === document.issuanceBinding.bundleDigest
      && document.transcriptBinding.bundleId === document.producerBridgeBinding.bundleId
      && document.transcriptBinding.bundleDigest === document.producerBridgeBinding.bundleDigest
      && document.issuanceBinding.issuanceId === document.producerBridgeBinding.issuanceId
      && document.issuanceBinding.receiptDigest === document.producerBridgeBinding.receiptDigest
      && exactJson(document.attempts, FALSE_ATTEMPTS)
      && exactJson(document.provenance, FALSE_PROVENANCE)
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
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_DOCUMENT_INVALID",
    "Producer-bridge composition document drifted from its exact fail-closed identity."
  );
  return document;
}

const DEFAULT_DEPENDENCIES = Object.freeze({
  composeOld: composeSwAbUpdateCandidateRuntimeClientCapture,
  loadTranscript: loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle,
  loadIssuance: loadVerifiedSwAbUpdateRuntimeCollectorIssuance,
  loadBridge: loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge,
  holdFile: holdStableFile,
  assertHeldStable: assertHeldFileStable,
  holdSources: holdCheckedSources
});

async function composeWithDependencies(rawInput, { cwd = process.cwd(), dependencies }) {
  const input = parseSwAbProducerBridgeCompositionInput(rawInput);
  requireCondition(
    comparablePath(input.bindingRoot) === comparablePath(path.resolve(cwd)),
    "arguments",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_BINDING_ROOT_CWD_MISMATCH",
    "bindingRoot must equal cwd."
  );
  requireCondition(
    isRecord(dependencies)
      && typeof dependencies.composeOld === "function"
      && typeof dependencies.loadTranscript === "function"
      && typeof dependencies.loadIssuance === "function"
      && typeof dependencies.loadBridge === "function"
      && typeof dependencies.holdFile === "function"
      && typeof dependencies.assertHeldStable === "function"
      && typeof dependencies.holdSources === "function",
    "arguments",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_DEPENDENCIES_INVALID",
    "Composer dependencies are invalid."
  );
  const sources = await dependencies.holdSources(input.bindingRoot);
  const heldInputs = [];
  try {
    const inputHoldResults = await Promise.allSettled([
      dependencies.holdFile({
        bindingRoot: input.bindingRoot,
        filePath: input.candidateInputPath,
        label: "candidate evidence input",
        maximumSize: MAX_INPUT_BYTES
      }),
      dependencies.holdFile({
        bindingRoot: input.bindingRoot,
        filePath: input.runtimeCaptureInputPath,
        label: "fixed producer-bridge runtime evidence",
        maximumSize: MAX_INPUT_BYTES
      }),
      dependencies.holdFile({
        bindingRoot: input.bindingRoot,
        filePath: input.bridgePublicationPath,
        label: "producer-bridge terminal publication",
        maximumSize: MAX_INPUT_BYTES
      })
    ]);
    for (const result of inputHoldResults) {
      if (result.status === "fulfilled") heldInputs.push(result.value);
    }
    const rejectedInputHold = inputHoldResults.find(({ status }) => status === "rejected");
    if (rejectedInputHold) throw rejectedInputHold.reason;
    const [candidateHeld, runtimeHeld, publicationHeld] = inputHoldResults.map(({ value }) => value);
    requireDistinctOuterFiles([
      candidateHeld,
      runtimeHeld,
      publicationHeld,
      ...sources.held
    ]);
    const runtimeEvidence = parseSwAbUpdateRuntimeClientCaptureJsonBytes(
      runtimeHeld.bytes,
      "fixed producer-bridge runtime evidence"
    );
    const publication = parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes(
      publicationHeld.bytes,
      "producer-bridge terminal publication"
    );
    let checkpointCount = 0;
    let oldComposition;
    let transcriptLoaded;
    let bridgeLoaded;
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
          "SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKPOINT_COUNT_INVALID",
          "Issuance held checkpoint must be called exactly once."
        );
        checkpointCount += 1;
        requireCondition(
          checkpoint?.phase === "after_initial_validation_before_terminal_reread"
            && comparablePath(checkpoint.runRoot) === comparablePath(input.issuanceRunRoot),
          "checkpoint",
          "SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKPOINT_PHASE_INVALID",
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
          }),
          dependencies.loadBridge({
            cwd: input.bindingRoot,
            bindingRoot: input.bindingRoot,
            issuanceRunRoot: input.issuanceRunRoot,
            bridgeRoot: input.bridgeRoot
          })
        ]);
        requireCondition(
          settled.every(({ status }) => status === "fulfilled"),
          "checkpoint",
          "SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKPOINT_BRANCH_FAILED",
          "One held-window branch failed; all three branches settled before rejection."
        );
        oldComposition = settled[0].value;
        transcriptLoaded = settled[1].value;
        bridgeLoaded = settled[2].value;
      }
    });
    requireCondition(
      checkpointCount === 1
        && oldComposition !== undefined
        && transcriptLoaded !== undefined
        && bridgeLoaded !== undefined,
      "checkpoint",
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_CHECKPOINT_COUNT_INVALID",
      "Issuance loader did not complete exactly one three-branch held checkpoint."
    );
    for (const held of [...heldInputs, ...sources.held]) {
      await dependencies.assertHeldStable(held);
    }
    assertPhysicalSeparation({
      input,
      candidateHeld,
      runtimeHeld,
      publicationHeld,
      sourceHeld: sources.held,
      transcriptLoaded,
      issuanceLoaded,
      bridgeLoaded
    });
    const sourceBindings = checkedSourceBindings(sources);
    const projection = validateSwAbProducerBridgeCompositionBindings({
      oldComposition,
      transcriptLoaded,
      issuanceLoaded,
      bridgeLoaded,
      candidateHeld,
      runtimeHeld,
      publicationHeld,
      runtimeEvidence,
      publication,
      outerSourceBindings: sourceBindings
    });
    return validateSwAbProducerBridgeCompositionDocument(
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

export async function composeSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridge(
  rawInput,
  options = {}
) {
  requireCondition(
    exactKeys(options, []) || exactKeys(options, ["cwd"]),
    "arguments",
    "SW_AB_PRODUCER_BRIDGE_COMPOSITION_PUBLIC_OPTIONS_INVALID",
    "Public composer options may contain only cwd; verifier dependencies are fixed internally."
  );
  return composeWithDependencies(rawInput, {
    cwd: options.cwd ?? process.cwd(),
    dependencies: DEFAULT_DEPENDENCIES
  });
}

export function buildSwAbProducerBridgeCompositionFailure(error) {
  const stage = error instanceof SwAbProducerBridgeCompositionError ? error.stage : "internal";
  const code = error instanceof SwAbProducerBridgeCompositionError
    ? error.code
    : "SW_AB_PRODUCER_BRIDGE_COMPOSITION_INTERNAL_ERROR";
  return Object.freeze({
    schemaVersion: 2,
    recordType: FAILURE_RECORD_TYPE,
    verificationKind: VERIFICATION_KIND,
    producerBridgeStatus: "producer_bridge_present_mechanically_untrusted",
    candidateBridgeArtifactPresent: false,
    trustedProducerBridgeVerified: false,
    runAttemptIdentifiersMatched: false,
    runAttemptCoordinationStatus: "run_attempt_coordination_absent",
    runAttemptCoordinationVerified: false,
    candidateProducerBoundToIssuanceAttempt: false,
    trustClass: "untrusted_four_chain_producer_bridge_composition_candidate",
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
      stage,
      code,
      messageDigest: sha256(canonicalJson({
        family: "sw-ab-update-producer-bridge-composition-v2",
        stage,
        code
      }))
    })
  });
}

export const swAbProducerBridgeCompositionTestOnly = Object.freeze({
  buildDocument,
  composeWithDependencies,
  computeCompositionIdentity,
  sourceSpecs: SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS,
  requiredCrossBindings: REQUIRED_CROSS_BINDINGS,
  runAttemptBoundary: RUN_ATTEMPT_BOUNDARY,
  falseAttempts: FALSE_ATTEMPTS,
  falseProvenance: FALSE_PROVENANCE,
  falseAuthority: FALSE_AUTHORITY,
  limitations: LIMITATIONS
});
