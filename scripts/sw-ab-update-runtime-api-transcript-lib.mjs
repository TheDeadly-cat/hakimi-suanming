import { isIP } from "node:net";

import { parseExpression } from "@babel/parser";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  computeSwAbUpdateRuntimeClientCaptureDigest,
  computeSwAbUpdateRuntimeClientId,
  computeSwAbUpdateRuntimeObservationDigest,
  computeSwAbUpdateRuntimeTargetId,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES,
  verifySwAbUpdateRuntimeClientCapture
} from "./sw-ab-update-runtime-client-capture-lib.mjs";

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_PATH =
  "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json";

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH =
  "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json";

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE = "bundle-manifest.json";

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES = Object.freeze([
  "01-msedge-initial-a-retained-old-a.json",
  "02-msedge-initial-a-reload-to-b.json",
  "03-chrome-initial-a-retained-old-a.json",
  "04-chrome-initial-a-reload-to-b.json",
  "05-msedge-post-claim-retained-old-a.json",
  "06-msedge-post-claim-reload-to-b.json",
  "07-chrome-post-claim-retained-old-a.json",
  "08-chrome-post-claim-reload-to-b.json"
]);

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS = Object.freeze([
  Object.freeze({
    role: "api-transcript-policy",
    path: SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_PATH
  }),
  Object.freeze({
    role: "api-transcript-schema",
    path: SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH
  }),
  Object.freeze({
    role: "runtime-capture-policy",
    path: "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json"
  }),
  Object.freeze({
    role: "runtime-capture-schema",
    path: "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json"
  })
]);

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE = Object.freeze({
  cdpApi: "playwright_cdp_session_decoded_object_v1",
  serviceWorkerMessageApi: "page_main_world_structured_clone_decoded_object_v1",
  serialization: "canonical_json_utf8_file_v1",
  cdpWireBytesCaptured: false,
  devtoolsWebSocketFramesCaptured: false,
  browserTransportAuthenticityVerified: false
});

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_PROVENANCE = Object.freeze({
  callerSuppliedPageAuthenticityVerified: false,
  runtimeCollectorProvenanceVerified: false,
  browserBinaryProvenanceVerified: false,
  browserTransportAuthenticityVerified: false,
  osProcessRestartProvenanceVerified: false,
  twoClientRuntimeProvenanceVerified: false,
  serviceWorkerResponseProvenanceVerified: false,
  offlineTransportClosureVerified: false,
  attemptFreshnessExternallyVerified: false,
  bundleReplayResistanceVerified: false,
  concurrentFilesystemMutationResistanceVerified: false
});

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_AUTHORITY = Object.freeze({
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

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RUN_ID_PATTERN = /^run-[a-f0-9]{64}$/u;
const ATTEMPT_ID_PATTERN = /^attempt-[a-f0-9]{64}$/u;
const RAW_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/u;
const SESSION_NONCE_PATTERN = /^session-[a-f0-9]{64}$/u;
const CHALLENGE_NONCE_PATTERN = /^challenge-[a-f0-9]{64}$/u;
const BUNDLE_ID_PATTERN = /^swabapi1-[a-f0-9]{32}$/u;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function exactKeys(value, keys) {
  return isRecord(value) && exactJson(Object.keys(value).sort(), [...keys].sort());
}

function requireCondition(condition, code, message) {
  if (!condition) throw new Error(`${code}: ${message}`);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function immutableJsonSnapshot(value) {
  return deepFreezeJson(structuredClone(value));
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

export function parseSwAbUpdateRuntimeApiTranscriptJsonBytes(
  bytes,
  label = "SW runtime API transcript JSON"
) {
  requireCondition(
    Buffer.isBuffer(bytes),
    "SW_AB_RUNTIME_API_TRANSCRIPT_BYTES_INVALID",
    `${label} must be bytes.`
  );
  requireCondition(
    bytes.length > 0 && bytes.length <= 8 * 1024 * 1024,
    "SW_AB_RUNTIME_API_TRANSCRIPT_SIZE_LIMIT_EXCEEDED",
    `${label} must be non-empty and bounded.`
  );
  requireCondition(
    !(bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf),
    "SW_AB_RUNTIME_API_TRANSCRIPT_BOM_FORBIDDEN",
    `${label} must not contain a UTF-8 BOM.`
  );
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`SW_AB_RUNTIME_API_TRANSCRIPT_UTF8_INVALID: ${label} is not strict UTF-8.`, {
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
    throw new Error(`SW_AB_RUNTIME_API_TRANSCRIPT_JSON_INVALID: ${label} is not strict JSON.`, {
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
        "SW_AB_RUNTIME_API_TRANSCRIPT_JSON_INVALID",
        `${label} contains a non-JSON property.`
      );
      requireCondition(
        !keys.has(property.key.value),
        "SW_AB_RUNTIME_API_TRANSCRIPT_JSON_DUPLICATE_KEY",
        `${label} contains duplicate key ${JSON.stringify(property.key.value)}.`
      );
      keys.add(property.key.value);
    }
  });
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`SW_AB_RUNTIME_API_TRANSCRIPT_JSON_INVALID: ${label} is not valid JSON.`, {
      cause: error
    });
  }
}

function parseCanonicalTimestamp(value, label) {
  requireCondition(
    typeof value === "string"
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
      && new Date(value).toISOString() === value,
    "SW_AB_RUNTIME_API_TRANSCRIPT_TIMESTAMP_INVALID",
    `${label} must be a canonical UTC timestamp.`
  );
  return Date.parse(value);
}

function validateCanonicalOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error("SW_AB_RUNTIME_API_TRANSCRIPT_ORIGIN_INVALID: origin is not a URL.", {
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
    "SW_AB_RUNTIME_API_TRANSCRIPT_ORIGIN_INVALID",
    "origin must be a canonical public-DNS HTTPS origin without credentials, port, path, query, or fragment."
  );
  return parsed.origin;
}

export function computeSwAbUpdateRuntimeApiTranscriptRecordDigest(record) {
  const copy = structuredClone(record);
  delete copy.recordDigest;
  return sha256(canonicalJson(copy));
}

export function computeSwAbUpdateRuntimeApiTranscriptBundleDigest(manifest) {
  const copy = structuredClone(manifest);
  delete copy.bundleId;
  delete copy.bundleDigest;
  return sha256(canonicalJson(copy));
}

export function computeSwAbUpdateRuntimeApiTranscriptBundleId(manifest) {
  return `swabapi1-${computeSwAbUpdateRuntimeApiTranscriptBundleDigest(manifest).slice(0, 32)}`;
}

export function validateSwAbUpdateRuntimeApiTranscriptPolicy(policy) {
  requireCondition(
    exactKeys(policy, [
      "schemaVersion",
      "policyId",
      "recordClass",
      "releaseIdentity",
      "capabilities",
      "requiredBrowserProjects",
      "requiredPhases",
      "requiredSlots",
      "requiredTupleFiles",
      "requiredObservationTuples",
      "requiredSourceBindings",
      "captureSurface",
      "mutationBoundary",
      "executionAdmission",
      "terminalState",
      "provenance",
      "authority"
    ])
      && policy.schemaVersion === 1
      && policy.policyId === "hakimi.web-v1.sw-ab-update-runtime-api-transcript-candidate/v1"
      && policy.recordClass === "untrusted_decoded_browser_api_transcript_candidate"
      && exactJson(policy.releaseIdentity, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY)
      && exactJson(policy.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
      && exactJson(policy.requiredBrowserProjects, ["msedge", "chrome"])
      && exactJson(policy.requiredPhases, ["initial-a", "post-claim"])
      && exactJson(policy.requiredSlots, ["retained-old-a", "reload-to-b"])
      && exactJson(policy.requiredTupleFiles, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES)
      && exactJson(policy.requiredObservationTuples, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES)
      && exactJson(
        policy.requiredSourceBindings,
        SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS
      )
      && exactJson(policy.captureSurface, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE)
      && exactJson(policy.mutationBoundary, {
        overlappingFileHandleEpochEstablished: false,
        intervalMutationExcluded: false,
        abaExcluded: false
      })
      && exactJson(policy.executionAdmission, {
        status: "closed_missing_selected_https_origin",
        selectedHttpsOriginConfigured: false,
        artifactADeploymentObserved: false,
        artifactBDeploymentObserved: false,
        realBrowserExecutionObserved: false
      })
      && exactJson(policy.terminalState, {
        status: "capture_incomplete",
        decodedApiObjectProjectionDerivationVerified: true,
        usableForRuntimeEvidence: false,
        usableForCandidateAssembly: false,
        formalReleaseEvidenceReceipt: false,
        cliExitCode: 1
      })
      && exactJson(policy.provenance, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_PROVENANCE)
      && exactJson(policy.authority, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_AUTHORITY),
    "SW_AB_RUNTIME_API_TRANSCRIPT_POLICY_INVALID",
    "API transcript policy drifted from its exact fail-closed contract."
  );
  return policy;
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
          && /^hre1-[a-f0-9]{32}$/u.test(binding.releaseEvidenceId ?? "")
          && /^[a-f0-9]{12}$/u.test(binding.buildVersion ?? "")
          && SHA256_PATTERN.test(binding.serviceWorkerSha256 ?? "")
          && SHA256_PATTERN.test(binding.artifactSetDigest ?? "");
      })
      && bindings.A.releaseEvidenceId !== bindings.B.releaseEvidenceId
      && bindings.A.buildVersion !== bindings.B.buildVersion
      && bindings.A.serviceWorkerSha256 !== bindings.B.serviceWorkerSha256
      && bindings.A.artifactSetDigest !== bindings.B.artifactSetDigest,
    "SW_AB_RUNTIME_API_TRANSCRIPT_ARTIFACT_BINDING_INVALID",
    "A and B artifact claims must be exact and distinct."
  );
}

function validateCanonicalExchange(exchange, label) {
  requireCondition(
    exactKeys(exchange, [
      "requestStartedAt",
      "responseReceivedAt",
      "request",
      "response",
      "canonicalRequestSha256",
      "canonicalResponseSha256"
    ])
      && isRecord(exchange.request)
      && isRecord(exchange.response)
      && exchange.canonicalRequestSha256 === sha256(canonicalJson(exchange.request))
      && exchange.canonicalResponseSha256 === sha256(canonicalJson(exchange.response)),
    "SW_AB_RUNTIME_API_TRANSCRIPT_EXCHANGE_INVALID",
    `${label} request, response, or canonical digest is invalid.`
  );
  const requestStartedAt = parseCanonicalTimestamp(
    exchange.requestStartedAt,
    `${label} requestStartedAt`
  );
  const responseReceivedAt = parseCanonicalTimestamp(
    exchange.responseReceivedAt,
    `${label} responseReceivedAt`
  );
  requireCondition(
    requestStartedAt <= responseReceivedAt,
    "SW_AB_RUNTIME_API_TRANSCRIPT_EXCHANGE_ORDER_INVALID",
    `${label} response precedes its request.`
  );
  return Object.freeze({ requestStartedAt, responseReceivedAt });
}

function validateCdpRequest(value, label) {
  requireCondition(
    exactKeys(value, ["method", "params"])
      && value.method === "Target.getTargetInfo"
      && exactKeys(value.params, []),
    "SW_AB_RUNTIME_API_TRANSCRIPT_CDP_REQUEST_INVALID",
    `${label} is not the exact decoded collector API request.`
  );
}

function projectTargetResponse(value, pageUrl, label) {
  requireCondition(
    exactKeys(value, ["targetInfo"])
      && isRecord(value.targetInfo)
      && RAW_ID_PATTERN.test(value.targetInfo.targetId ?? "")
      && value.targetInfo.type === "page"
      && value.targetInfo.url === pageUrl
      && value.targetInfo.attached === true,
    "SW_AB_RUNTIME_API_TRANSCRIPT_CDP_RESPONSE_INVALID",
    `${label} does not identify the exact attached page.`
  );
  return Object.freeze({
    targetId: value.targetInfo.targetId,
    type: "page",
    url: pageUrl,
    attached: true
  });
}

function validateChallenge(request, response, expectedBuildVersion, label) {
  requireCondition(
    exactKeys(request, ["type", "challengeNonce"])
      && request.type === "SW_AB_RUNTIME_CHALLENGE_V1"
      && CHALLENGE_NONCE_PATTERN.test(request.challengeNonce ?? ""),
    "SW_AB_RUNTIME_API_TRANSCRIPT_CHALLENGE_REQUEST_INVALID",
    `${label} challenge request is invalid.`
  );
  requireCondition(
    exactKeys(response, [
      "type",
      "challengeNonce",
      "sourceClientId",
      "buildVersion",
      "protocolVersion",
      "dbGeneration",
      "databaseName",
      "targetSchema",
      "minReadableSchema",
      "maxReadableSchema",
      "migrationId",
      "acceptedCommittedMigrationIds",
      "sourceGeneration",
      "sourceDatabaseName",
      "sourceSchema"
    ])
      && response.type === "SW_AB_RUNTIME_CHALLENGE_RESULT_V1"
      && response.challengeNonce === request.challengeNonce
      && RAW_ID_PATTERN.test(response.sourceClientId ?? "")
      && response.buildVersion === expectedBuildVersion
      && exactJson({
        protocolVersion: response.protocolVersion,
        dbGeneration: response.dbGeneration,
        databaseName: response.databaseName,
        targetSchema: response.targetSchema,
        minReadableSchema: response.minReadableSchema,
        maxReadableSchema: response.maxReadableSchema,
        migrationId: response.migrationId,
        acceptedCommittedMigrationIds: response.acceptedCommittedMigrationIds,
        sourceGeneration: response.sourceGeneration,
        sourceDatabaseName: response.sourceDatabaseName,
        sourceSchema: response.sourceSchema
      }, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR),
    "SW_AB_RUNTIME_API_TRANSCRIPT_CHALLENGE_RESPONSE_INVALID",
    `${label} challenge response is invalid.`
  );
}

function validatePageUrl(value, origin, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error(`SW_AB_RUNTIME_API_TRANSCRIPT_PAGE_URL_INVALID: ${label} is invalid.`, {
      cause: error
    });
  }
  requireCondition(
    parsed.origin === origin
      && parsed.username === ""
      && parsed.password === ""
      && parsed.hash === "",
    "SW_AB_RUNTIME_API_TRANSCRIPT_PAGE_URL_INVALID",
    `${label} escapes the transcript origin.`
  );
  return value;
}

export function validateSwAbUpdateRuntimeApiTranscriptTuple({
  record,
  tuple,
  sequence,
  origin,
  artifactBindings,
  schemaValidator
}) {
  try {
    schemaValidator.assert(record);
  } catch (error) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_SCHEMA_INVALID: tuple ${sequence} does not match Schema.`,
      { cause: error }
    );
  }
  requireCondition(
    exactKeys(record, [
      "schemaVersion",
      "recordType",
      "projectName",
      "phase",
      "slot",
      "sequence",
      "startedAt",
      "completedAt",
      "pageUrlBefore",
      "pageUrlAfter",
      "cdpSession",
      "serviceWorkerChallenge",
      "recordDigest"
    ])
      && record.schemaVersion === 1
      && record.recordType === "sw_ab_update_runtime_api_transcript_tuple_candidate_v1"
      && record.projectName === tuple.projectName
      && record.phase === tuple.phase
      && record.slot === tuple.slot
      && record.sequence === sequence
      && record.recordDigest === computeSwAbUpdateRuntimeApiTranscriptRecordDigest(record),
    "SW_AB_RUNTIME_API_TRANSCRIPT_TUPLE_RECORD_INVALID",
    `tuple ${sequence} identity or record digest is invalid.`
  );
  validatePageUrl(record.pageUrlBefore, origin, `tuple ${sequence} pageUrlBefore`);
  validatePageUrl(record.pageUrlAfter, origin, `tuple ${sequence} pageUrlAfter`);
  requireCondition(
    record.pageUrlBefore === record.pageUrlAfter,
    "SW_AB_RUNTIME_API_TRANSCRIPT_PAGE_URL_CHANGED",
    `tuple ${sequence} page URL changed during capture.`
  );
  const startedAt = parseCanonicalTimestamp(record.startedAt, `tuple ${sequence} startedAt`);
  const completedAt = parseCanonicalTimestamp(record.completedAt, `tuple ${sequence} completedAt`);
  const cdp = record.cdpSession;
  requireCondition(
    exactKeys(cdp, [
      "surface",
      "instanceNonce",
      "createdAt",
      "detachedAt",
      "preChallenge",
      "postChallenge"
    ])
      && cdp.surface === SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE.cdpApi
      && SESSION_NONCE_PATTERN.test(cdp.instanceNonce ?? ""),
    "SW_AB_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE_INVALID",
    `tuple ${sequence} CDP session surface or nonce is invalid.`
  );
  const createdAt = parseCanonicalTimestamp(cdp.createdAt, `tuple ${sequence} session createdAt`);
  const detachedAt = parseCanonicalTimestamp(cdp.detachedAt, `tuple ${sequence} session detachedAt`);
  const preTimes = validateCanonicalExchange(cdp.preChallenge, `tuple ${sequence} preChallenge`);
  const postTimes = validateCanonicalExchange(cdp.postChallenge, `tuple ${sequence} postChallenge`);
  validateCdpRequest(cdp.preChallenge.request, `tuple ${sequence} preChallenge request`);
  validateCdpRequest(cdp.postChallenge.request, `tuple ${sequence} postChallenge request`);
  const preTarget = projectTargetResponse(
    cdp.preChallenge.response,
    record.pageUrlBefore,
    `tuple ${sequence} preChallenge response`
  );
  const postTarget = projectTargetResponse(
    cdp.postChallenge.response,
    record.pageUrlAfter,
    `tuple ${sequence} postChallenge response`
  );
  requireCondition(
    exactJson(preTarget, postTarget),
    "SW_AB_RUNTIME_API_TRANSCRIPT_CDP_TARGET_CHANGED",
    `tuple ${sequence} target projection changed across the challenge.`
  );
  const challenge = record.serviceWorkerChallenge;
  requireCondition(
    exactKeys(challenge, [
      "surface",
      "realm",
      "requestStartedAt",
      "responseReceivedAt",
      "request",
      "response",
      "canonicalRequestSha256",
      "canonicalResponseSha256"
    ])
      && challenge.surface
        === SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE.serviceWorkerMessageApi
      && challenge.realm === "page_main_world_untrusted",
    "SW_AB_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE_INVALID",
    `tuple ${sequence} Service Worker challenge surface is invalid.`
  );
  const challengeTimes = validateCanonicalExchange({
    requestStartedAt: challenge.requestStartedAt,
    responseReceivedAt: challenge.responseReceivedAt,
    request: challenge.request,
    response: challenge.response,
    canonicalRequestSha256: challenge.canonicalRequestSha256,
    canonicalResponseSha256: challenge.canonicalResponseSha256
  }, `tuple ${sequence} challenge`);
  const expectedArtifact = artifactBindings[record.phase === "initial-a" ? "A" : "B"];
  validateChallenge(
    challenge.request,
    challenge.response,
    expectedArtifact.buildVersion,
    `tuple ${sequence}`
  );
  requireCondition(
    startedAt <= createdAt
      && createdAt <= preTimes.requestStartedAt
      && preTimes.responseReceivedAt <= challengeTimes.requestStartedAt
      && challengeTimes.responseReceivedAt <= postTimes.requestStartedAt
      && postTimes.responseReceivedAt <= detachedAt
      && detachedAt <= completedAt,
    "SW_AB_RUNTIME_API_TRANSCRIPT_TUPLE_ORDER_INVALID",
    `tuple ${sequence} operation timestamps are not ordered.`
  );
  return Object.freeze({
    completedAt,
    sessionNonce: cdp.instanceNonce,
    rawTargetId: preTarget.targetId,
    rawSourceClientId: challenge.response.sourceClientId,
    challengeNonce: challenge.request.challengeNonce,
    observation: Object.freeze({
      projectName: record.projectName,
      phase: record.phase,
      slot: record.slot,
      sequence: record.sequence,
      observedAt: record.completedAt,
      pageUrl: record.pageUrlAfter,
      cdp: Object.freeze({
        method: "Target.getTargetInfo",
        sourceTrust: "caller_supplied_page_adapter_untrusted",
        sessionHeldAcrossChallenge: true,
        preChallengeResponseProjection: preTarget,
        preChallengeResponseProjectionDigest: sha256(canonicalJson(preTarget)),
        postChallengeResponseProjection: postTarget,
        postChallengeResponseProjectionDigest: sha256(canonicalJson(postTarget)),
        rawTargetId: preTarget.targetId,
        pseudonymousTargetId: null
      }),
      serviceWorkerMessage: Object.freeze({
        realm: "page_main_world_untrusted",
        request: immutableJsonSnapshot(challenge.request),
        requestDigest: sha256(canonicalJson(challenge.request)),
        response: immutableJsonSnapshot(challenge.response),
        responseDigest: sha256(canonicalJson(challenge.response)),
        rawSourceClientId: challenge.response.sourceClientId,
        pseudonymousClientId: null
      }),
      observationDigest: null
    })
  });
}

function validateContinuity(validated) {
  const byTuple = new Map(validated.map((entry) => [
    `${entry.observation.projectName}\0${entry.observation.phase}\0${entry.observation.slot}`,
    entry
  ]));
  for (const projectName of ["msedge", "chrome"]) {
    const initialRetained = byTuple.get(`${projectName}\0initial-a\0retained-old-a`);
    const initialReload = byTuple.get(`${projectName}\0initial-a\0reload-to-b`);
    const postRetained = byTuple.get(`${projectName}\0post-claim\0retained-old-a`);
    const postReload = byTuple.get(`${projectName}\0post-claim\0reload-to-b`);
    requireCondition(
      initialRetained.rawTargetId !== initialReload.rawTargetId
        && postRetained.rawTargetId !== postReload.rawTargetId
        && initialRetained.rawTargetId === postRetained.rawTargetId
        && initialReload.rawTargetId === postReload.rawTargetId
        && initialRetained.rawSourceClientId !== initialReload.rawSourceClientId
        && postRetained.rawSourceClientId !== postReload.rawSourceClientId
        && initialRetained.rawSourceClientId === postRetained.rawSourceClientId
        && initialReload.rawSourceClientId !== postReload.rawSourceClientId,
      "SW_AB_RUNTIME_API_TRANSCRIPT_CLIENT_CONTINUITY_INVALID",
      `${projectName} decoded target and client relations are invalid.`
    );
  }
  const edgeClients = new Set(validated
    .filter((entry) => entry.observation.projectName === "msedge")
    .map((entry) => entry.rawSourceClientId));
  const chromeClients = new Set(validated
    .filter((entry) => entry.observation.projectName === "chrome")
    .map((entry) => entry.rawSourceClientId));
  const edgeTargets = new Set(validated
    .filter((entry) => entry.observation.projectName === "msedge")
    .map((entry) => entry.rawTargetId));
  const chromeTargets = new Set(validated
    .filter((entry) => entry.observation.projectName === "chrome")
    .map((entry) => entry.rawTargetId));
  const overlaps = (left, right) => [...left].some((value) => right.has(value));
  requireCondition(
    !overlaps(edgeClients, chromeClients)
      && !overlaps(edgeTargets, chromeTargets)
      && new Set(validated.map((entry) => entry.challengeNonce)).size === 8
      && new Set(validated.map((entry) => entry.sessionNonce)).size === 8,
    "SW_AB_RUNTIME_API_TRANSCRIPT_CROSS_BROWSER_ALIAS",
    "browser IDs must be disjoint and challenge/session nonces unique."
  );
}

function validateManifest({ manifest, policy, schemaValidator }) {
  try {
    schemaValidator.assert(manifest);
  } catch (error) {
    throw new Error("SW_AB_RUNTIME_API_TRANSCRIPT_SCHEMA_INVALID: manifest does not match Schema.", {
      cause: error
    });
  }
  requireCondition(
    exactKeys(manifest, [
      "schemaVersion",
      "recordType",
      "trustClass",
      "status",
      "executionAdmission",
      "usableForRuntimeEvidence",
      "usableForCandidateAssembly",
      "formalReleaseEvidenceReceipt",
      "runId",
      "attemptId",
      "capturedAt",
      "origin",
      "releaseIdentity",
      "capabilities",
      "artifactBindings",
      "captureSurface",
      "tupleBindings",
      "sourceBindings",
      "sourceSetDigest",
      "provenance",
      "authority",
      "bundleId",
      "bundleDigest"
    ])
      && manifest.schemaVersion === 1
      && manifest.recordType === "sw_ab_update_runtime_api_transcript_bundle_candidate_v1"
      && manifest.trustClass === "untrusted_decoded_browser_api_transcript_candidate"
      && manifest.status === "capture_incomplete"
      && manifest.executionAdmission === "closed_missing_selected_https_origin"
      && manifest.usableForRuntimeEvidence === false
      && manifest.usableForCandidateAssembly === false
      && manifest.formalReleaseEvidenceReceipt === false
      && RUN_ID_PATTERN.test(manifest.runId ?? "")
      && ATTEMPT_ID_PATTERN.test(manifest.attemptId ?? "")
      && exactJson(manifest.releaseIdentity, policy.releaseIdentity)
      && exactJson(manifest.capabilities, policy.capabilities)
      && exactJson(manifest.captureSurface, policy.captureSurface)
      && exactJson(manifest.provenance, policy.provenance)
      && exactJson(manifest.authority, policy.authority)
      && Array.isArray(manifest.tupleBindings)
      && manifest.tupleBindings.length === 8
      && Array.isArray(manifest.sourceBindings)
      && manifest.sourceBindings.length === 4
      && manifest.sourceSetDigest === sha256(canonicalJson(manifest.sourceBindings))
      && BUNDLE_ID_PATTERN.test(manifest.bundleId ?? "")
      && manifest.bundleDigest === computeSwAbUpdateRuntimeApiTranscriptBundleDigest(manifest)
      && manifest.bundleId === computeSwAbUpdateRuntimeApiTranscriptBundleId(manifest),
    "SW_AB_RUNTIME_API_TRANSCRIPT_MANIFEST_INVALID",
    "manifest identity, terminal boundary, source set, or bundle digest is invalid."
  );
  validateCanonicalOrigin(manifest.origin);
  validateArtifactBindings(manifest.artifactBindings);
  parseCanonicalTimestamp(manifest.capturedAt, "manifest capturedAt");
}

export function deriveSwAbUpdateRuntimeClientCaptureFromApiTranscript({
  manifest,
  tupleInputs,
  checkedSourceBindings,
  policy,
  schemaValidator,
  runtimePolicy,
  runtimeSchemaValidator
}) {
  validateSwAbUpdateRuntimeApiTranscriptPolicy(policy);
  validateManifest({ manifest, policy, schemaValidator });
  requireCondition(
    exactJson(manifest.sourceBindings, checkedSourceBindings),
    "SW_AB_RUNTIME_API_TRANSCRIPT_SOURCE_BINDING_MISMATCH",
    "manifest source bindings do not match the independently checked source bytes."
  );
  requireCondition(
    Array.isArray(tupleInputs) && tupleInputs.length === 8,
    "SW_AB_RUNTIME_API_TRANSCRIPT_TUPLE_SET_INVALID",
    "exactly eight tuple inputs are required."
  );
  const validated = tupleInputs.map((input, index) => {
    const tuple = SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[index];
    const expectedBinding = manifest.tupleBindings[index];
    requireCondition(
      exactKeys(input, ["record", "binding"])
        && exactKeys(input.binding, ["path", "size", "sha256"])
        && exactKeys(expectedBinding, [
          "sequence",
          "projectName",
          "phase",
          "slot",
          "path",
          "size",
          "sha256",
          "recordDigest"
        ])
        && expectedBinding.sequence === index + 1
        && expectedBinding.projectName === tuple.projectName
        && expectedBinding.phase === tuple.phase
        && expectedBinding.slot === tuple.slot
        && expectedBinding.path === SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[index]
        && exactJson(input.binding, {
          path: expectedBinding.path,
          size: expectedBinding.size,
          sha256: expectedBinding.sha256
        })
        && expectedBinding.recordDigest === input.record.recordDigest,
      "SW_AB_RUNTIME_API_TRANSCRIPT_TUPLE_BINDING_MISMATCH",
      `tuple ${index + 1} file binding does not match the manifest.`
    );
    return validateSwAbUpdateRuntimeApiTranscriptTuple({
      record: input.record,
      tuple,
      sequence: index + 1,
      origin: manifest.origin,
      artifactBindings: manifest.artifactBindings,
      schemaValidator
    });
  });
  const completedTimes = validated.map((entry) => entry.completedAt);
  const initialTimes = validated
    .filter((entry) => entry.observation.phase === "initial-a")
    .map((entry) => entry.completedAt);
  const postTimes = validated
    .filter((entry) => entry.observation.phase === "post-claim")
    .map((entry) => entry.completedAt);
  requireCondition(
    completedTimes.every((value, index) => index === 0 || value >= completedTimes[index - 1])
      && Math.max(...initialTimes) < Math.min(...postTimes),
    "SW_AB_RUNTIME_API_TRANSCRIPT_PHASE_BARRIER_INVALID",
    "tuple completion times must be monotonic and phase-major."
  );
  validateContinuity(validated);
  const capturedAt = parseCanonicalTimestamp(manifest.capturedAt, "manifest capturedAt");
  requireCondition(
    capturedAt >= Math.max(...completedTimes),
    "SW_AB_RUNTIME_API_TRANSCRIPT_MANIFEST_TIME_INVALID",
    "manifest capture time precedes a tuple completion."
  );
  const observations = validated.map((entry) => {
    const observation = structuredClone(entry.observation);
    observation.cdp.pseudonymousTargetId = computeSwAbUpdateRuntimeTargetId({
      runId: manifest.runId,
      attemptId: manifest.attemptId,
      projectName: observation.projectName,
      rawTargetId: observation.cdp.rawTargetId
    });
    observation.serviceWorkerMessage.pseudonymousClientId = computeSwAbUpdateRuntimeClientId({
      runId: manifest.runId,
      attemptId: manifest.attemptId,
      projectName: observation.projectName,
      rawSourceClientId: observation.serviceWorkerMessage.rawSourceClientId
    });
    observation.observationDigest = computeSwAbUpdateRuntimeObservationDigest(observation);
    return observation;
  });
  const evidence = {
    schemaVersion: 1,
    evidenceType: "sw_ab_update_runtime_client_capture_candidate_v1",
    trustClass: "untrusted_raw_capture_candidate",
    status: "capture_incomplete",
    executionAdmission: "closed_missing_https_origin",
    usableForCandidateAssembly: false,
    runId: manifest.runId,
    attemptId: manifest.attemptId,
    capturedAt: manifest.capturedAt,
    origin: manifest.origin,
    releaseIdentity: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES),
    artifactBindings: structuredClone(manifest.artifactBindings),
    implementedObservationScopes: [
      ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES
    ],
    deferredObservationScopes: [
      ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES
    ],
    observations,
    provenance: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE),
    authority: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY),
    evidenceDigest: "0".repeat(64)
  };
  evidence.evidenceDigest = computeSwAbUpdateRuntimeClientCaptureDigest(evidence);
  let derivedVerification;
  try {
    derivedVerification = verifySwAbUpdateRuntimeClientCapture({
      evidence,
      policy: runtimePolicy,
      schemaValidator: runtimeSchemaValidator
    });
  } catch (error) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_DERIVED_EVIDENCE_REJECTED: derived v1 evidence was rejected.",
      { cause: error }
    );
  }
  return Object.freeze({
    code: "SW_AB_RUNTIME_API_TRANSCRIPT_DERIVED_NOT_ADMITTED",
    status: "capture_incomplete",
    executionAdmission: "closed_missing_selected_https_origin",
    decodedApiObjectProjectionDerivationVerified: true,
    terminalEndpointSnapshotsMatched: false,
    overlappingFileHandleEpochEstablished: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    mutationEpochCapability: "absent_schema13",
    epoch: null,
    cdpWireBytesCaptured: false,
    devtoolsWebSocketFramesCaptured: false,
    browserTransportAuthenticityVerified: false,
    callerSuppliedPageAuthenticityVerified: false,
    runtimeCollectorProvenanceVerified: false,
    realBrowserExecutionVerified: false,
    offlineTransportClosureVerified: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    rightsLegalConclusionAuthorized: false,
    verifierNetworkAttempted: false,
    verifierBrowserAttempted: false,
    verifierDeploymentAttempted: false,
    bundleId: manifest.bundleId,
    bundleDigest: manifest.bundleDigest,
    tupleCount: 8,
    sourceBindingCount: 4,
    derivedEvidenceDigest: evidence.evidenceDigest,
    derivedProjection: derivedVerification.compositionProjection,
    cliExitCode: 1
  });
}

export function buildSwAbUpdateRuntimeApiTranscriptFailure(error) {
  return Object.freeze({
    code: "SW_AB_RUNTIME_API_TRANSCRIPT_REJECTED",
    status: "capture_incomplete",
    executionAdmission: "closed_missing_selected_https_origin",
    decodedApiObjectProjectionDerivationVerified: false,
    terminalEndpointSnapshotsMatched: false,
    overlappingFileHandleEpochEstablished: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    mutationEpochCapability: "absent_schema13",
    epoch: null,
    cdpWireBytesCaptured: false,
    devtoolsWebSocketFramesCaptured: false,
    browserTransportAuthenticityVerified: false,
    callerSuppliedPageAuthenticityVerified: false,
    runtimeCollectorProvenanceVerified: false,
    realBrowserExecutionVerified: false,
    offlineTransportClosureVerified: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    rightsLegalConclusionAuthorized: false,
    verifierNetworkAttempted: false,
    verifierBrowserAttempted: false,
    verifierDeploymentAttempted: false,
    cliExitCode: 1,
    error: error instanceof Error ? error.message : String(error)
  });
}
