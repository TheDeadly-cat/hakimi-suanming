import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  abortSwAbUpdateRuntimeCollectorIssuance,
  beginSwAbUpdateRuntimeCollectorIssuance,
  collectNextSwAbUpdateRuntimeCollectorTupleFromPage,
  finalizeSwAbUpdateRuntimeCollectorIssuance,
} from "./sw-ab-update-runtime-collector-issuance-writer.mjs";

export const fixtureOrigin = "https://pwa.hakimi.cn";

export const fixtureArtifactBindings = Object.freeze({
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

function targetId(projectName, slot) {
  return `${projectName}-${slot}-target`;
}

function sourceClientId(projectName, phase, slot) {
  if (slot === "retained-old-a") return `${projectName}-retained-client`;
  return `${projectName}-${phase}-reload-client`;
}

function targetResponse({ projectName, slot, url, overrides = {} }) {
  return {
    targetInfo: {
      targetId: targetId(projectName, slot),
      type: "page",
      title: `collector fixture ${projectName} ${slot}`,
      url,
      attached: true,
      browserContextId: `${projectName}-fixture-context`,
      ...overrides
    }
  };
}

export function createCollectorLivePageFixture({
  projectName = "msedge",
  phase = "initial-a",
  slot = "retained-old-a",
  pageUrl = `${fixtureOrigin}/cases/${projectName}-${slot}`,
  pageUrlAfter = pageUrl,
  preTargetOverrides = {},
  postTargetOverrides = {},
  challengeNonceOverride,
  buildVersionOverride,
  descriptorOverride = {},
  challengeResponseAccessor = null,
  rejectPageUrlBefore = false,
  rejectNewSession = false,
  rejectPre = false,
  rejectPost = false,
  rejectEvaluate = false,
  rejectDetach = false,
  neverResolveNewSession = false,
  neverResolvePre = false,
  neverResolveEvaluate = false,
  neverResolvePost = false,
  neverResolveDetach = false,
  resolveNewSessionAfterMilliseconds = null,
  evaluateDelayMilliseconds = 0,
  failureSecret = "decoded-payload-must-not-leak"
} = {}) {
  const events = [];
  const seenNonces = [];
  let urlCallCount = 0;
  let sendCount = 0;
  const cdpSession = {
    async send(method) {
      if (method !== "Target.getTargetInfo") throw new Error("Unexpected fake CDP method.");
      sendCount += 1;
      events.push(sendCount === 1 ? "cdp-pre" : "cdp-post");
      if (sendCount === 1 && neverResolvePre) return new Promise(() => {});
      if (sendCount === 2 && neverResolvePost) return new Promise(() => {});
      if (sendCount === 1 && rejectPre) throw new Error(failureSecret);
      if (sendCount === 2 && rejectPost) throw new Error(failureSecret);
      return sendCount === 1
        ? targetResponse({
          projectName,
          slot,
          url: pageUrl,
          overrides: preTargetOverrides
        })
        : targetResponse({
          projectName,
          slot,
          url: pageUrlAfter,
          overrides: postTargetOverrides
        });
    },
    async detach() {
      events.push("detach");
      if (neverResolveDetach) return new Promise(() => {});
      if (rejectDetach) throw new Error(failureSecret);
    }
  };
  const page = {
    url() {
      urlCallCount += 1;
      events.push(urlCallCount === 1 ? "url-before" : "url-after");
      if (urlCallCount === 1 && rejectPageUrlBefore) throw new Error(failureSecret);
      return urlCallCount === 1 ? pageUrl : pageUrlAfter;
    },
    context() {
      events.push("context");
      return {
        async newCDPSession(pageArgument) {
          if (pageArgument !== page) throw new Error("Unexpected fake Page capsule.");
          events.push("new-cdp-session");
          if (neverResolveNewSession) return new Promise(() => {});
          if (Number.isInteger(resolveNewSessionAfterMilliseconds)) {
            return new Promise((resolve) => {
              setTimeout(() => resolve(cdpSession), resolveNewSessionAfterMilliseconds);
            });
          }
          if (rejectNewSession) throw new Error(failureSecret);
          return cdpSession;
        }
      };
    },
    async evaluate(pageFunction, nonce) {
      events.push("challenge");
      if (
        typeof pageFunction !== "function"
        || !/navigator\.serviceWorker/u.test(String(pageFunction))
      ) {
        throw new Error("Unexpected fake Page evaluate function.");
      }
      seenNonces.push(nonce);
      if (rejectEvaluate) throw new Error(failureSecret);
      if (neverResolveEvaluate) return new Promise(() => {});
      if (evaluateDelayMilliseconds > 0) {
        await new Promise((resolve) => setTimeout(resolve, evaluateDelayMilliseconds));
      }
      const buildVersion = phase === "initial-a"
        ? fixtureArtifactBindings.A.buildVersion
        : fixtureArtifactBindings.B.buildVersion;
      const response = {
        type: "SW_AB_RUNTIME_CHALLENGE_RESULT_V1",
        challengeNonce: challengeNonceOverride ?? nonce,
        sourceClientId: sourceClientId(projectName, phase, slot),
        buildVersion: buildVersionOverride ?? buildVersion,
        ...structuredClone(SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DESCRIPTOR),
        ...structuredClone(descriptorOverride)
      };
      if (challengeResponseAccessor !== null) {
        Object.defineProperty(response, challengeResponseAccessor.key, {
          enumerable: true,
          get() {
            challengeResponseAccessor.tracker.calls += 1;
            return challengeResponseAccessor.value;
          }
        });
      }
      return response;
    }
  };
  return Object.freeze({ page, events, seenNonces, failureSecret });
}

export async function writeCollectorIssuanceFixture({ workspaceRoot, runRoot }) {
  let session;
  try {
    session = await beginSwAbUpdateRuntimeCollectorIssuance({
      cwd: workspaceRoot,
      runRoot,
      origin: fixtureOrigin,
      artifactBindings: fixtureArtifactBindings
    });
    for (const tuple of SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES) {
      const fixture = createCollectorLivePageFixture(tuple);
      await collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
        session,
        page: fixture.page
      });
    }
    const result = await finalizeSwAbUpdateRuntimeCollectorIssuance(session);
    return Object.freeze({ runRoot, result });
  } catch (error) {
    if (session !== undefined) {
      await abortSwAbUpdateRuntimeCollectorIssuance(session).catch(() => {});
    }
    throw error;
  }
}
