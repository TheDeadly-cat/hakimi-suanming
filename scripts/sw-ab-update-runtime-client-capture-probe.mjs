import { randomBytes } from "node:crypto";

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
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";

const untrustedProbeIssuedCaptures = new WeakSet();
const RUN_ID_PATTERN = /^run-[a-f0-9]{64}$/u;
const ATTEMPT_ID_PATTERN = /^attempt-[a-f0-9]{64}$/u;
const BUILD_VERSION_PATTERN = /^[a-f0-9]{12}$/u;
const RAW_ID_PATTERN = /^[A-Za-z0-9_-]{1,256}$/u;

function fail(code, message) {
  throw new Error(`${code}: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function exactKeys(value, keys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function requireCaptureTuple({ projectName, phase, slot }) {
  if (
    !SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS.includes(projectName)
    || !SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES.includes(phase)
    || !SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS.includes(slot)
  ) {
    fail("SW_AB_RUNTIME_PROBE_TUPLE_INVALID", "project, phase, and slot tuple is invalid.");
  }
}

async function exchangeRuntimeChallenge(page, challengeNonce) {
  return page.evaluate(async (nonce) => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const expectedScope = new URL("/", window.location.origin).href;
    const registration = registrations.length === 1 && registrations[0].scope === expectedScope
      ? registrations[0]
      : null;
    const controller = navigator.serviceWorker.controller;
    if (
      !registration
      || !controller
      || !registration.active
      || registration.active.scriptURL !== controller.scriptURL
    ) {
      throw new Error(
        "Runtime challenge requires one root registration whose active worker is the controller."
      );
    }
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        channel.port1.close();
        callback(value);
      };
      const timeout = window.setTimeout(() => {
        finish(reject, new Error("SW A-to-B runtime challenge timed out."));
      }, 5_000);
      channel.port1.onmessage = (event) => finish(resolve, event.data);
      channel.port1.onmessageerror = () => finish(
        reject,
        new Error("SW A-to-B runtime challenge response could not be decoded.")
      );
      controller.postMessage({
        type: "SW_AB_RUNTIME_CHALLENGE_V1",
        challengeNonce: nonce
      }, [channel.port2]);
    });
  }, challengeNonce);
}

function projectAttachedPageTarget(targetResponse, expectedPageUrl) {
  const targetInfo = targetResponse?.targetInfo;
  if (
    typeof targetInfo?.targetId !== "string"
    || !RAW_ID_PATTERN.test(targetInfo.targetId)
    || targetInfo.type !== "page"
    || targetInfo.url !== expectedPageUrl
    || targetInfo.attached !== true
  ) {
    fail("SW_AB_RUNTIME_PROBE_CDP_TARGET_INVALID", "CDP target info does not identify the exact attached page.");
  }
  return Object.freeze({
    targetId: targetInfo.targetId,
    type: "page",
    url: expectedPageUrl,
    attached: true
  });
}

export async function captureUntrustedSwAbUpdateRuntimeClientObservation({
  page,
  runId,
  attemptId,
  origin,
  projectName,
  phase,
  slot,
  expectedBuildVersion
}) {
  if (!RUN_ID_PATTERN.test(runId ?? "") || !ATTEMPT_ID_PATTERN.test(attemptId ?? "")) {
    fail("SW_AB_RUNTIME_PROBE_ATTEMPT_INVALID", "runId and attemptId must be 256-bit identifiers.");
  }
  requireCaptureTuple({ projectName, phase, slot });
  if (!BUILD_VERSION_PATTERN.test(expectedBuildVersion ?? "")) {
    fail("SW_AB_RUNTIME_PROBE_BUILD_VERSION_INVALID", "expected build version is invalid.");
  }
  const pageUrl = page?.url?.();
  let parsedPageUrl;
  try {
    parsedPageUrl = new URL(pageUrl);
  } catch {
    fail("SW_AB_RUNTIME_PROBE_PAGE_URL_INVALID", "page URL is invalid.");
  }
  if (parsedPageUrl.origin !== origin || parsedPageUrl.hash !== "") {
    fail("SW_AB_RUNTIME_PROBE_PAGE_URL_INVALID", "page URL is outside the exact capture origin.");
  }
  const challengeNonce = `challenge-${randomBytes(32).toString("hex")}`;
  const session = await page.context().newCDPSession(page);
  let preChallengeResponseProjection;
  let postChallengeResponseProjection;
  let response;
  try {
    preChallengeResponseProjection = projectAttachedPageTarget(
      await session.send("Target.getTargetInfo"),
      pageUrl
    );
    response = await exchangeRuntimeChallenge(page, challengeNonce);
    const postChallengePageUrl = page?.url?.();
    if (postChallengePageUrl !== pageUrl) {
      fail(
        "SW_AB_RUNTIME_PROBE_TARGET_CHANGED_DURING_CHALLENGE",
        "page URL changed while the runtime challenge was in flight."
      );
    }
    postChallengeResponseProjection = projectAttachedPageTarget(
      await session.send("Target.getTargetInfo"),
      pageUrl
    );
    if (canonicalJson(preChallengeResponseProjection) !== canonicalJson(postChallengeResponseProjection)) {
      fail(
        "SW_AB_RUNTIME_PROBE_TARGET_CHANGED_DURING_CHALLENGE",
        "CDP target changed while the runtime challenge was in flight."
      );
    }
  } finally {
    await session.detach();
  }
  const request = Object.freeze({
    type: "SW_AB_RUNTIME_CHALLENGE_V1",
    challengeNonce
  });
  if (
    !exactKeys(response, [
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
    || response.type !== "SW_AB_RUNTIME_CHALLENGE_RESULT_V1"
    || response.challengeNonce !== challengeNonce
    || !RAW_ID_PATTERN.test(response.sourceClientId ?? "")
    || response.buildVersion !== expectedBuildVersion
    || canonicalJson({
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
    }) !== canonicalJson(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR)
  ) {
    fail("SW_AB_RUNTIME_PROBE_CHALLENGE_INVALID", "Service Worker challenge response is not exact.");
  }
  const observation = deepFreeze({
    projectName,
    phase,
    slot,
    observedAt: new Date().toISOString(),
    pageUrl,
    cdp: {
      method: "Target.getTargetInfo",
      sourceTrust: "caller_supplied_page_adapter_untrusted",
      sessionHeldAcrossChallenge: true,
      preChallengeResponseProjection,
      preChallengeResponseProjectionDigest:
        sha256(canonicalJson(preChallengeResponseProjection)),
      postChallengeResponseProjection,
      postChallengeResponseProjectionDigest:
        sha256(canonicalJson(postChallengeResponseProjection)),
      rawTargetId: preChallengeResponseProjection.targetId,
      pseudonymousTargetId: computeSwAbUpdateRuntimeTargetId({
        runId,
        attemptId,
        projectName,
        rawTargetId: preChallengeResponseProjection.targetId
      })
    },
    serviceWorkerMessage: {
      realm: "page_main_world_untrusted",
      request,
      requestDigest: sha256(canonicalJson(request)),
      response: structuredClone(response),
      responseDigest: sha256(canonicalJson(response)),
      rawSourceClientId: response.sourceClientId,
      pseudonymousClientId: computeSwAbUpdateRuntimeClientId({
        runId,
        attemptId,
        projectName,
        rawSourceClientId: response.sourceClientId
      })
    }
  });
  const capsule = deepFreeze({
    runId,
    attemptId,
    origin,
    observation
  });
  untrustedProbeIssuedCaptures.add(capsule);
  return capsule;
}

export function buildSwAbUpdateRuntimeClientCaptureEvidence({
  runId,
  attemptId,
  origin,
  artifactBindings,
  captures
}) {
  if (
    !RUN_ID_PATTERN.test(runId ?? "")
    || !ATTEMPT_ID_PATTERN.test(attemptId ?? "")
    || !Array.isArray(captures)
    || captures.length !== 8
    || captures.some((capture, index) =>
      !untrustedProbeIssuedCaptures.has(capture)
      || capture.runId !== runId
      || capture.attemptId !== attemptId
      || capture.origin !== origin
      || capture.observation.projectName
        !== SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[index]?.projectName
      || capture.observation.phase !== SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[index]?.phase
      || capture.observation.slot !== SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[index]?.slot
    )
  ) {
    fail(
      "SW_AB_RUNTIME_PROBE_CAPTURE_SET_INVALID",
      "evidence builder accepts only eight untrusted probe-issued capsules for one run."
    );
  }
  const observations = captures.map((capture, index) => {
    const observation = structuredClone(capture.observation);
    observation.sequence = index + 1;
    observation.observationDigest = "0".repeat(64);
    observation.observationDigest = computeSwAbUpdateRuntimeObservationDigest(observation);
    return observation;
  });
  const initialPhaseTimes = observations
    .filter((entry) => entry.phase === "initial-a")
    .map((entry) => Date.parse(entry.observedAt));
  const postClaimPhaseTimes = observations
    .filter((entry) => entry.phase === "post-claim")
    .map((entry) => Date.parse(entry.observedAt));
  if (Math.max(...initialPhaseTimes) >= Math.min(...postClaimPhaseTimes)) {
    fail(
      "SW_AB_RUNTIME_PROBE_PHASE_BARRIER_INVALID",
      "all Edge and Chrome initial-A captures must precede every post-claim capture."
    );
  }
  const lastObservedAt = Math.max(...observations.map((entry) => Date.parse(entry.observedAt)));
  const evidence = {
    schemaVersion: 1,
    evidenceType: "sw_ab_update_runtime_client_capture_candidate_v1",
    trustClass: "untrusted_raw_capture_candidate",
    status: "capture_incomplete",
    executionAdmission: "closed_missing_https_origin",
    usableForCandidateAssembly: false,
    runId,
    attemptId,
    capturedAt: new Date(Math.max(Date.now(), lastObservedAt)).toISOString(),
    origin,
    releaseIdentity: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY),
    capabilities: structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES),
    artifactBindings: structuredClone(artifactBindings),
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
  return deepFreeze(evidence);
}
