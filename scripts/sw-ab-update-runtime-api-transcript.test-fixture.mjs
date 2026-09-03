import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  computeSwAbUpdateRuntimeApiTranscriptRecordDigest
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";

export const apiTranscriptFixtureOrigin = "https://pwa.hakimi.cn";
export const apiTranscriptFixtureRunId = `run-${"1".repeat(64)}`;
export const apiTranscriptFixtureAttemptId = `attempt-${"2".repeat(64)}`;

export const apiTranscriptFixtureArtifactBindings = Object.freeze({
  A: Object.freeze({
    label: "A",
    releaseEvidenceId: `hre1-${"a".repeat(32)}`,
    buildVersion: "a".repeat(12),
    serviceWorkerSha256: "b".repeat(64),
    artifactSetDigest: "c".repeat(64)
  }),
  B: Object.freeze({
    label: "B",
    releaseEvidenceId: `hre1-${"d".repeat(32)}`,
    buildVersion: "e".repeat(12),
    serviceWorkerSha256: "f".repeat(64),
    artifactSetDigest: "1".repeat(64)
  })
});

function timestamp(milliseconds) {
  return new Date(Date.UTC(2026, 7, 27, 6, 0, 0, milliseconds)).toISOString();
}

function targetId(projectName, slot) {
  return `${projectName}-${slot}-target`;
}

function clientId(projectName, phase, slot) {
  if (slot === "retained-old-a") return `${projectName}-retained-client`;
  return `${projectName}-${phase}-reload-client`;
}

function canonicalExchange({ requestStartedAt, responseReceivedAt, request, response }) {
  return {
    requestStartedAt,
    responseReceivedAt,
    request,
    response,
    canonicalRequestSha256: sha256(canonicalJson(request)),
    canonicalResponseSha256: sha256(canonicalJson(response))
  };
}

export function finalizeApiTranscriptTuple(record) {
  const result = structuredClone(record);
  result.recordDigest = "0".repeat(64);
  result.recordDigest = computeSwAbUpdateRuntimeApiTranscriptRecordDigest(result);
  return result;
}

export function createApiTranscriptTupleRecords() {
  return SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.map((tuple, index) => {
    const sequence = index + 1;
    const base = sequence * 20;
    const pageUrl = `${apiTranscriptFixtureOrigin}/cases/${tuple.projectName}-${tuple.slot}`;
    const rawTargetId = targetId(tuple.projectName, tuple.slot);
    const rawClientId = clientId(tuple.projectName, tuple.phase, tuple.slot);
    const challengeNonce = `challenge-${sequence.toString(16).padStart(64, "0")}`;
    const buildVersion = tuple.phase === "initial-a"
      ? apiTranscriptFixtureArtifactBindings.A.buildVersion
      : apiTranscriptFixtureArtifactBindings.B.buildVersion;
    const cdpRequest = {
      method: "Target.getTargetInfo",
      params: {}
    };
    const cdpResponse = {
      targetInfo: {
        targetId: rawTargetId,
        type: "page",
        title: `complete decoded ${tuple.projectName} ${tuple.slot} object`,
        url: pageUrl,
        attached: true,
        browserContextId: `${tuple.projectName}-fixture-context`
      }
    };
    const challengeRequest = {
      type: "SW_AB_RUNTIME_CHALLENGE_V1",
      challengeNonce
    };
    const challengeResponse = {
      type: "SW_AB_RUNTIME_CHALLENGE_RESULT_V1",
      challengeNonce,
      sourceClientId: rawClientId,
      buildVersion,
      ...structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR)
    };
    return finalizeApiTranscriptTuple({
      schemaVersion: 1,
      recordType: "sw_ab_update_runtime_api_transcript_tuple_candidate_v1",
      projectName: tuple.projectName,
      phase: tuple.phase,
      slot: tuple.slot,
      sequence,
      startedAt: timestamp(base),
      completedAt: timestamp(base + 7),
      pageUrlBefore: pageUrl,
      pageUrlAfter: pageUrl,
      cdpSession: {
        surface: "playwright_cdp_session_decoded_object_v1",
        instanceNonce: `session-${sequence.toString(16).padStart(64, "0")}`,
        createdAt: timestamp(base + 1),
        detachedAt: timestamp(base + 6),
        preChallenge: canonicalExchange({
          requestStartedAt: timestamp(base + 2),
          responseReceivedAt: timestamp(base + 2),
          request: cdpRequest,
          response: cdpResponse
        }),
        postChallenge: canonicalExchange({
          requestStartedAt: timestamp(base + 5),
          responseReceivedAt: timestamp(base + 5),
          request: structuredClone(cdpRequest),
          response: structuredClone(cdpResponse)
        })
      },
      serviceWorkerChallenge: {
        surface: "page_main_world_structured_clone_decoded_object_v1",
        realm: "page_main_world_untrusted",
        ...canonicalExchange({
          requestStartedAt: timestamp(base + 3),
          responseReceivedAt: timestamp(base + 4),
          request: challengeRequest,
          response: challengeResponse
        })
      }
    });
  });
}

export const apiTranscriptFixtureCapturedAt = timestamp(200);
