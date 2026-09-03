import { isIP } from "node:net";

import { parseExpression } from "@babel/parser";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_PATH =
  "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json";

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY = Object.freeze({
  channel: "default-v13",
  dbGeneration: "legacy-v13",
  targetSchema: 13,
  migrationId: null
});

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES = Object.freeze({
  mutationEpochCapability: "absent_schema13",
  epoch: null
});

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS = Object.freeze([
  "msedge",
  "chrome"
]);

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES = Object.freeze([
  "initial-a",
  "post-claim"
]);

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS = Object.freeze([
  "retained-old-a",
  "reload-to-b"
]);

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES = Object.freeze(
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES.flatMap((phase) =>
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS.flatMap((projectName) =>
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS.map((slot) => Object.freeze({
        projectName,
        phase,
        slot
      }))
    )
  )
);

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES = Object.freeze([
  "cdp_page_target_info_projection",
  "sw_runtime_challenge_v1"
]);

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES = Object.freeze([
  "os_process_restart",
  "service_worker_target_and_source",
  "service_worker_response",
  "cache_api_raw_bodies",
  "offline_request_closure",
  "stale_a_production_write",
  "provider_switch",
  "host_tls_and_response_bytes"
]);

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE = Object.freeze({
  callerSuppliedPageAuthenticityVerified: false,
  runtimeCollectorProvenanceVerified: false,
  osProcessRestartProvenanceVerified: false,
  twoClientRuntimeProvenanceVerified: false,
  serviceWorkerResponseProvenanceVerified: false,
  cacheApiProvenanceVerified: false,
  attemptFreshnessExternallyVerified: false,
  bundleReplayResistanceVerified: false,
  concurrentFilesystemMutationResistanceVerified: false
});

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY = Object.freeze({
  defaultV13ReceiptAllowlistMember: false,
  formalReleaseEvidenceReceipt: false,
  trustedProviderVerified: false,
  trustedHostVerified: false,
  trustedBrowserRuntimeVerified: false,
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

export const SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: Object.freeze([null]),
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RAW_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/u;
const TERMINAL_CODE =
  "SW_AB_RUNTIME_CLIENT_CAPTURE_INTERNALLY_CONSISTENT_BUT_INCOMPLETE";

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

function requireCondition(condition, code, message) {
  if (!condition) throw new Error(`${code}: ${message}`);
}

function walkAst(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visit);
    } else if (value && typeof value === "object") {
      walkAst(value, visit);
    }
  }
}

export function parseSwAbUpdateRuntimeClientCaptureJsonBytes(bytes, label = "runtime capture") {
  requireCondition(Buffer.isBuffer(bytes), "SW_AB_RUNTIME_CAPTURE_BYTES_INVALID", `${label} must be bytes.`);
  requireCondition(
    !(bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf),
    "SW_AB_RUNTIME_CAPTURE_BOM_FORBIDDEN",
    `${label} must not contain a UTF-8 BOM.`
  );
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`SW_AB_RUNTIME_CAPTURE_UTF8_INVALID: ${label} is not strict UTF-8.`, {
      cause: error
    });
  }
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceType: "script",
      sourceFilename: label,
      errorRecovery: false,
      attachComment: false
    });
  } catch (error) {
    throw new Error(`SW_AB_RUNTIME_CAPTURE_JSON_INVALID: ${label} is not strict JSON.`, {
      cause: error
    });
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      requireCondition(
        property.type === "ObjectProperty"
          && property.computed === false
          && property.key?.type === "StringLiteral",
        "SW_AB_RUNTIME_CAPTURE_JSON_INVALID",
        `${label} contains a non-JSON property.`
      );
      requireCondition(
        !keys.has(property.key.value),
        "SW_AB_RUNTIME_CAPTURE_JSON_DUPLICATE_KEY",
        `${label} contains duplicate key ${JSON.stringify(property.key.value)}.`
      );
      keys.add(property.key.value);
    }
  });
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`SW_AB_RUNTIME_CAPTURE_JSON_INVALID: ${label} is not valid JSON.`, {
      cause: error
    });
  }
}

function parseCanonicalTimestamp(value, label) {
  requireCondition(
    typeof value === "string"
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
      && new Date(value).toISOString() === value,
    "SW_AB_RUNTIME_CAPTURE_TIMESTAMP_INVALID",
    `${label} must be a canonical UTC timestamp.`
  );
  return Date.parse(value);
}

function validateCanonicalOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error("SW_AB_RUNTIME_CAPTURE_ORIGIN_INVALID: origin is not a URL.", {
      cause: error
    });
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
    "SW_AB_RUNTIME_CAPTURE_ORIGIN_INVALID",
    "origin must be a canonical public-DNS HTTPS origin without credentials, port, path, query, or fragment."
  );
  return parsed.origin;
}

export function computeSwAbUpdateRuntimeClientId({
  runId,
  attemptId,
  projectName,
  rawSourceClientId
}) {
  return `client-${sha256(canonicalJson({
    namespace: "hakimi-sw-ab-runtime-window-client-id-v1",
    runId,
    attemptId,
    projectName,
    rawSourceClientId
  }))}`;
}

export function computeSwAbUpdateRuntimeTargetId({
  runId,
  attemptId,
  projectName,
  rawTargetId
}) {
  return `target-${sha256(canonicalJson({
    namespace: "hakimi-sw-ab-runtime-cdp-target-id-v1",
    runId,
    attemptId,
    projectName,
    rawTargetId
  }))}`;
}

export function computeSwAbUpdateRuntimeObservationDigest(observation) {
  const copy = structuredClone(observation);
  delete copy.observationDigest;
  return sha256(canonicalJson(copy));
}

export function computeSwAbUpdateRuntimeClientCaptureDigest(evidence) {
  const copy = structuredClone(evidence);
  delete copy.evidenceDigest;
  return sha256(canonicalJson(copy));
}

export function validateSwAbUpdateRuntimeClientCapturePolicy(policy) {
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
      "requiredObservationTuples",
      "implementedObservationScopes",
      "deferredObservationScopes",
      "executionAdmission",
      "terminalState",
      "provenance",
      "authority"
    ])
      && policy.schemaVersion === 1
      && policy.policyId === "hakimi.web-v1.sw-ab-update-runtime-client-capture/v1"
      && policy.evidenceClass === "untrusted_partial_runtime_capture_candidate"
      && exactJson(policy.releaseIdentity, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY)
      && exactJson(policy.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
      && exactJson(policy.requiredBrowserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
      && exactJson(policy.requiredPhases, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES)
      && exactJson(policy.requiredSlots, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
      && exactJson(
        policy.requiredObservationTuples,
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
      )
      && exactJson(
        policy.implementedObservationScopes,
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES
      )
      && exactJson(
        policy.deferredObservationScopes,
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES
      )
      && exactJson(policy.executionAdmission, {
        status: "closed_missing_https_origin",
        canonicalHttpsOriginConfigured: false,
        artifactADeploymentObserved: false,
        artifactBDeploymentObserved: false,
        realBrowserExecutionObserved: false
      })
      && exactJson(policy.terminalState, {
        trustClass: "untrusted_raw_capture_candidate",
        status: "capture_incomplete",
        usableForCandidateAssembly: false,
        formalReleaseEvidenceReceipt: false,
        cliExitCode: 1
      })
      && exactJson(policy.provenance, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE)
      && exactJson(policy.authority, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY),
    "SW_AB_RUNTIME_CAPTURE_POLICY_INVALID",
    "runtime client capture policy drifted from its exact fail-closed contract."
  );
  return policy;
}

function expectedTuples() {
  return SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES;
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
    "SW_AB_RUNTIME_CAPTURE_ARTIFACT_BINDING_INVALID",
    "A and B artifact bindings must be exact and distinct."
  );
}

function validateObservation(observation, evidence, tuple, index) {
  requireCondition(
    exactKeys(observation, [
      "projectName",
      "phase",
      "slot",
      "sequence",
      "observedAt",
      "pageUrl",
      "cdp",
      "serviceWorkerMessage",
      "observationDigest"
    ])
      && observation.projectName === tuple.projectName
      && observation.phase === tuple.phase
      && observation.slot === tuple.slot
      && observation.sequence === index + 1,
    "SW_AB_RUNTIME_CAPTURE_OBSERVATION_TUPLE_INVALID",
    `observation ${index + 1} tuple or sequence is invalid.`
  );
  const observedAt = parseCanonicalTimestamp(
    observation.observedAt,
    `observation ${index + 1} observedAt`
  );
  let pageUrl;
  try {
    pageUrl = new URL(observation.pageUrl);
  } catch (error) {
    throw new Error(
      `SW_AB_RUNTIME_CAPTURE_PAGE_URL_INVALID: observation ${index + 1} page URL is invalid.`,
      { cause: error }
    );
  }
  requireCondition(
    pageUrl.origin === evidence.origin
      && pageUrl.username === ""
      && pageUrl.password === ""
      && pageUrl.hash === "",
    "SW_AB_RUNTIME_CAPTURE_PAGE_URL_INVALID",
    `observation ${index + 1} page URL escapes the capture origin.`
  );
  const cdp = observation.cdp;
  requireCondition(
    exactKeys(cdp, [
      "method",
      "sourceTrust",
      "sessionHeldAcrossChallenge",
      "preChallengeResponseProjection",
      "preChallengeResponseProjectionDigest",
      "postChallengeResponseProjection",
      "postChallengeResponseProjectionDigest",
      "rawTargetId",
      "pseudonymousTargetId"
    ])
      && cdp.method === "Target.getTargetInfo"
      && cdp.sourceTrust === "caller_supplied_page_adapter_untrusted"
      && cdp.sessionHeldAcrossChallenge === true
      && RAW_ID_PATTERN.test(cdp.rawTargetId)
      && exactJson(cdp.preChallengeResponseProjection, {
        targetId: cdp.rawTargetId,
        type: "page",
        url: observation.pageUrl,
        attached: true
      })
      && exactJson(cdp.postChallengeResponseProjection, cdp.preChallengeResponseProjection)
      && cdp.preChallengeResponseProjectionDigest
        === sha256(canonicalJson(cdp.preChallengeResponseProjection))
      && cdp.postChallengeResponseProjectionDigest
        === sha256(canonicalJson(cdp.postChallengeResponseProjection))
      && cdp.pseudonymousTargetId === computeSwAbUpdateRuntimeTargetId({
        runId: evidence.runId,
        attemptId: evidence.attemptId,
        projectName: observation.projectName,
        rawTargetId: cdp.rawTargetId
      }),
    "SW_AB_RUNTIME_CAPTURE_CDP_OBSERVATION_INVALID",
    `observation ${index + 1} CDP target projection is invalid.`
  );
  const message = observation.serviceWorkerMessage;
  const expectedArtifact = evidence.artifactBindings[
    observation.phase === "initial-a" ? "A" : "B"
  ];
  requireCondition(
    exactKeys(message, [
      "realm",
      "request",
      "requestDigest",
      "response",
      "responseDigest",
      "rawSourceClientId",
      "pseudonymousClientId"
    ])
      && message.realm === "page_main_world_untrusted"
      && RAW_ID_PATTERN.test(message.rawSourceClientId)
      && exactJson(message.request, {
        type: "SW_AB_RUNTIME_CHALLENGE_V1",
        challengeNonce: message.request.challengeNonce
      })
      && /^challenge-[a-f0-9]{64}$/u.test(message.request.challengeNonce)
      && message.requestDigest === sha256(canonicalJson(message.request))
      && exactJson(message.response, {
        type: "SW_AB_RUNTIME_CHALLENGE_RESULT_V1",
        challengeNonce: message.request.challengeNonce,
        sourceClientId: message.rawSourceClientId,
        buildVersion: expectedArtifact.buildVersion,
        ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR
      })
      && message.responseDigest === sha256(canonicalJson(message.response))
      && message.pseudonymousClientId === computeSwAbUpdateRuntimeClientId({
        runId: evidence.runId,
        attemptId: evidence.attemptId,
        projectName: observation.projectName,
        rawSourceClientId: message.rawSourceClientId
      })
      && observation.observationDigest
        === computeSwAbUpdateRuntimeObservationDigest(observation),
    "SW_AB_RUNTIME_CAPTURE_SW_MESSAGE_INVALID",
    `observation ${index + 1} Service Worker challenge is invalid.`
  );
  return observedAt;
}

export function verifySwAbUpdateRuntimeClientCapture({
  evidence,
  policy,
  schemaValidator
}) {
  validateSwAbUpdateRuntimeClientCapturePolicy(policy);
  try {
    schemaValidator.assert(evidence);
  } catch (error) {
    throw new Error("SW_AB_RUNTIME_CAPTURE_SCHEMA_INVALID: evidence does not match Schema.", {
      cause: error
    });
  }
  requireCondition(
    evidence.evidenceType === "sw_ab_update_runtime_client_capture_candidate_v1"
      && evidence.trustClass === "untrusted_raw_capture_candidate"
      && evidence.status === "capture_incomplete"
      && evidence.executionAdmission === "closed_missing_https_origin"
      && evidence.usableForCandidateAssembly === false
      && exactJson(evidence.releaseIdentity, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY)
      && exactJson(evidence.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
      && exactJson(
        evidence.implementedObservationScopes,
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES
      )
      && exactJson(
        evidence.deferredObservationScopes,
        SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES
      )
      && exactJson(evidence.provenance, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE)
      && exactJson(evidence.authority, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY),
    "SW_AB_RUNTIME_CAPTURE_TERMINAL_BOUNDARY_INVALID",
    "capture evidence promoted a closed identity, provenance, or authority boundary."
  );
  validateCanonicalOrigin(evidence.origin);
  validateArtifactBindings(evidence.artifactBindings);
  const tuples = expectedTuples();
  requireCondition(
    exactJson(
      evidence.observations.map(({ projectName, phase, slot }) => ({
        projectName,
        phase,
        slot
      })),
      tuples
    ),
    "SW_AB_RUNTIME_CAPTURE_OBSERVATION_SET_INVALID",
    "capture must contain the exact Edge/Chrome, phase, and slot tuple set."
  );
  const observedTimes = evidence.observations.map((observation, index) =>
    validateObservation(observation, evidence, tuples[index], index)
  );
  const initialPhaseTimes = evidence.observations
    .map((observation, index) => ({ phase: observation.phase, observedAt: observedTimes[index] }))
    .filter((entry) => entry.phase === "initial-a")
    .map((entry) => entry.observedAt);
  const postClaimPhaseTimes = evidence.observations
    .map((observation, index) => ({ phase: observation.phase, observedAt: observedTimes[index] }))
    .filter((entry) => entry.phase === "post-claim")
    .map((entry) => entry.observedAt);
  requireCondition(
    Math.max(...initialPhaseTimes) < Math.min(...postClaimPhaseTimes),
    "SW_AB_RUNTIME_CAPTURE_PHASE_BARRIER_INVALID",
    "all Edge and Chrome initial-A observations must precede every post-claim observation."
  );
  requireCondition(
    observedTimes.every((value, index) => index === 0 || value >= observedTimes[index - 1]),
    "SW_AB_RUNTIME_CAPTURE_TIME_ORDER_INVALID",
    "capture observations must be monotonic in global sequence order."
  );
  const byTuple = new Map(evidence.observations.map((observation) => [
    `${observation.projectName}\0${observation.phase}\0${observation.slot}`,
    observation
  ]));
  for (const projectName of SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS) {
    const initialRetained = byTuple.get(`${projectName}\0initial-a\0retained-old-a`);
    const initialReload = byTuple.get(`${projectName}\0initial-a\0reload-to-b`);
    const postRetained = byTuple.get(`${projectName}\0post-claim\0retained-old-a`);
    const postReload = byTuple.get(`${projectName}\0post-claim\0reload-to-b`);
    requireCondition(
      initialRetained.cdp.rawTargetId !== initialReload.cdp.rawTargetId
        && postRetained.cdp.rawTargetId !== postReload.cdp.rawTargetId
        && initialRetained.cdp.rawTargetId === postRetained.cdp.rawTargetId
        && initialReload.cdp.rawTargetId === postReload.cdp.rawTargetId
        && initialRetained.serviceWorkerMessage.rawSourceClientId
          !== initialReload.serviceWorkerMessage.rawSourceClientId
        && postRetained.serviceWorkerMessage.rawSourceClientId
          !== postReload.serviceWorkerMessage.rawSourceClientId
        && initialRetained.serviceWorkerMessage.rawSourceClientId
          === postRetained.serviceWorkerMessage.rawSourceClientId
        && initialReload.serviceWorkerMessage.rawSourceClientId
          !== postReload.serviceWorkerMessage.rawSourceClientId,
      "SW_AB_RUNTIME_CAPTURE_CLIENT_CONTINUITY_INVALID",
      `${projectName} retain/reload raw targets and clients must be distinct within each phase and preserve exact cross-phase continuity.`
    );
  }
  const edgeRawClients = new Set(evidence.observations
    .filter((entry) => entry.projectName === "msedge")
    .map((entry) => entry.serviceWorkerMessage.rawSourceClientId));
  const chromeRawClients = new Set(evidence.observations
    .filter((entry) => entry.projectName === "chrome")
    .map((entry) => entry.serviceWorkerMessage.rawSourceClientId));
  const edgeRawTargets = new Set(evidence.observations
    .filter((entry) => entry.projectName === "msedge")
    .map((entry) => entry.cdp.rawTargetId));
  const chromeRawTargets = new Set(evidence.observations
    .filter((entry) => entry.projectName === "chrome")
    .map((entry) => entry.cdp.rawTargetId));
  const overlaps = (left, right) => [...left].some((value) => right.has(value));
  requireCondition(
    !overlaps(edgeRawClients, chromeRawClients)
      && !overlaps(edgeRawTargets, chromeRawTargets)
      && new Set(evidence.observations.map((entry) =>
        entry.serviceWorkerMessage.request.challengeNonce
      )).size === 8,
    "SW_AB_RUNTIME_CAPTURE_CROSS_BROWSER_ALIAS",
    "Edge and Chrome raw IDs must be disjoint and all challenge nonces must be unique."
  );
  const capturedAt = parseCanonicalTimestamp(evidence.capturedAt, "capture capturedAt");
  requireCondition(
    capturedAt >= Math.max(...observedTimes)
      && evidence.evidenceDigest === computeSwAbUpdateRuntimeClientCaptureDigest(evidence),
    "SW_AB_RUNTIME_CAPTURE_DIGEST_OR_TIME_INVALID",
    "capture time or evidence digest is invalid."
  );
  const compositionProjection = immutableJsonSnapshot({
    projectionType: "sw_ab_update_runtime_client_capture_composition_projection_v1",
    runId: evidence.runId,
    attemptId: evidence.attemptId,
    canonicalHttpsOrigin: evidence.origin,
    releaseIdentity: evidence.releaseIdentity,
    capabilities: evidence.capabilities,
    artifactBindings: evidence.artifactBindings,
    observations: evidence.observations.map((observation) => ({
      projectName: observation.projectName,
      phase: observation.phase,
      slot: observation.slot,
      sequence: observation.sequence,
      observedAt: observation.observedAt,
      pseudonymousClientId: observation.serviceWorkerMessage.pseudonymousClientId,
      pseudonymousTargetId: observation.cdp.pseudonymousTargetId,
      challengeNonce: observation.serviceWorkerMessage.request.challengeNonce,
      runtimeRequestDigest: observation.serviceWorkerMessage.requestDigest,
      runtimeResponseDigest: observation.serviceWorkerMessage.responseDigest,
      runtimeObservationDigest: observation.observationDigest
    })),
    capturedAt: evidence.capturedAt,
    evidenceDigest: evidence.evidenceDigest
  });
  return Object.freeze({
    code: TERMINAL_CODE,
    status: "capture_incomplete",
    executionAdmission: "closed_missing_https_origin",
    internalConsistencyVerified: true,
    implementedObservationScopeCount:
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES.length,
    deferredObservationScopeCount:
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES.length,
    observationCount: evidence.observations.length,
    compositionProjection,
    callerSuppliedPageAuthenticityVerified: false,
    runtimeCollectorProvenanceVerified: false,
    osProcessRestartProvenanceVerified: false,
    twoClientRuntimeProvenanceVerified: false,
    serviceWorkerResponseProvenanceVerified: false,
    cacheApiProvenanceVerified: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    verifierNetworkAttempted: false,
    cliExitCode: 1
  });
}

export function buildSwAbUpdateRuntimeClientCaptureFailure(error) {
  return Object.freeze({
    code: "SW_AB_RUNTIME_CLIENT_CAPTURE_REJECTED",
    status: "capture_incomplete",
    executionAdmission: "closed_missing_https_origin",
    internalConsistencyVerified: false,
    callerSuppliedPageAuthenticityVerified: false,
    runtimeCollectorProvenanceVerified: false,
    osProcessRestartProvenanceVerified: false,
    twoClientRuntimeProvenanceVerified: false,
    serviceWorkerResponseProvenanceVerified: false,
    cacheApiProvenanceVerified: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    verifierNetworkAttempted: false,
    cliExitCode: 1,
    failure: {
      name: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : String(error)
    }
  });
}
