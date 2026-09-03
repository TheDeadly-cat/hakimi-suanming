const CHALLENGE_NONCE_PATTERN = /^challenge-[a-f0-9]{64}$/u;

export const SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES = Object.freeze({
  cdpSessionMilliseconds: 10_000,
  cdpRequestMilliseconds: 10_000,
  challengeMilliseconds: 7_500,
  detachMilliseconds: 5_000
});

const LIVE_CAPTURE_ENVELOPES = new WeakSet();
let lastCaptureTimestampMilliseconds = Date.now() - 1;

class SwAbRuntimeCollectorLiveAdapterError extends Error {
  constructor(code, message) {
    super(`SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_${code}: ${message}`);
    this.name = "SwAbRuntimeCollectorLiveAdapterError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: true },
      failureCode: {
        value: `SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_${code}`,
        enumerable: true
      }
    });
  }
}

function fail(code, message) {
  throw new SwAbRuntimeCollectorLiveAdapterError(code, message);
}

function exactOwnDataRecord(value, expectedKeys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("INPUT_INVALID", `${label} must be one plain own-data object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).sort();
  const expected = [...expectedKeys].sort();
  if (
    (prototype !== Object.prototype && prototype !== null)
    || Object.getOwnPropertySymbols(value).length !== 0
    || JSON.stringify(keys) !== JSON.stringify(expected)
    || expectedKeys.some((key) => {
      const descriptor = descriptors[key];
      return descriptor === undefined
        || !Object.hasOwn(descriptor, "value")
        || descriptor.enumerable !== true;
    })
  ) {
    fail(
      "INPUT_INVALID",
      `${label} must expose exactly the required enumerable own data fields without accessors.`
    );
  }
  return descriptors;
}

function challengeNonceFromReservation(reservation) {
  if (reservation === null || typeof reservation !== "object" || Array.isArray(reservation)) {
    fail("RESERVATION_INVALID", "Collector reservation is not an issued object.");
  }
  let challengeRequest;
  try {
    challengeRequest = reservation.challengeRequest;
  } catch {
    fail("RESERVATION_INVALID", "Collector reservation challenge request is unavailable.");
  }
  if (
    challengeRequest === null
    || typeof challengeRequest !== "object"
    || Array.isArray(challengeRequest)
  ) {
    fail("RESERVATION_INVALID", "Collector reservation challenge request is invalid.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(challengeRequest);
  const keys = Object.keys(descriptors).sort();
  if (
    JSON.stringify(keys) !== JSON.stringify(["challengeNonce", "type"])
    || Object.getOwnPropertySymbols(challengeRequest).length !== 0
    || Object.getPrototypeOf(challengeRequest) !== Object.prototype
    || !Object.hasOwn(descriptors.type ?? {}, "value")
    || !Object.hasOwn(descriptors.challengeNonce ?? {}, "value")
    || descriptors.type.value !== "SW_AB_RUNTIME_CHALLENGE_V1"
    || !CHALLENGE_NONCE_PATTERN.test(descriptors.challengeNonce.value ?? "")
  ) {
    fail("RESERVATION_INVALID", "Collector reservation challenge request is invalid.");
  }
  return descriptors.challengeNonce.value;
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
      try {
        controller.postMessage({
          type: "SW_AB_RUNTIME_CHALLENGE_V1",
          challengeNonce: nonce
        }, [channel.port2]);
      } catch (error) {
        finish(reject, error);
      }
    });
  }, challengeNonce);
}

function safeFailure(code, message) {
  return new SwAbRuntimeCollectorLiveAdapterError(code, message);
}

function canonicalTimestamp() {
  const sampledMilliseconds = Date.now();
  lastCaptureTimestampMilliseconds = Math.max(
    sampledMilliseconds,
    lastCaptureTimestampMilliseconds + 1
  );
  return new Date(lastCaptureTimestampMilliseconds).toISOString();
}

async function awaitWithDeadline(operation, milliseconds, code, message) {
  let timeout;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => {
          reject(safeFailure(code, message));
        }, milliseconds);
      })
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function captureFailure(error, code, message) {
  return error instanceof SwAbRuntimeCollectorLiveAdapterError
    ? error
    : safeFailure(code, message);
}

function scheduleLateCdpSessionDetach(cdpSessionPromise) {
  void Promise.resolve(cdpSessionPromise).then(async (lateSession) => {
    await awaitWithDeadline(
      () => lateSession.detach(),
      SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES.detachMilliseconds,
      "CDP_LATE_DETACH_TIMEOUT",
      "Late CDP session cleanup exceeded its fixed deadline."
    );
  }).catch(() => {});
}

export function consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope(captureEnvelope) {
  if (
    captureEnvelope === null
    || typeof captureEnvelope !== "object"
    || !LIVE_CAPTURE_ENVELOPES.has(captureEnvelope)
  ) {
    fail("CAPTURE_ENVELOPE_INVALID", "Live capture envelope was not issued here or was reused.");
  }
  LIVE_CAPTURE_ENVELOPES.delete(captureEnvelope);
  return captureEnvelope;
}

export async function captureSwAbUpdateRuntimeCollectorDecodedObservationFromPage(rawInput) {
  const descriptors = exactOwnDataRecord(
    rawInput,
    ["page", "reservation"],
    "live collector adapter input"
  );
  const page = descriptors.page.value;
  const reservation = descriptors.reservation.value;
  const challengeNonce = challengeNonceFromReservation(reservation);
  let cdpSession = null;
  let primaryFailure = null;
  let observation = null;
  let timeline = null;
  try {
    const startedAt = canonicalTimestamp();
    let pageUrlBefore;
    try {
      pageUrlBefore = page.url();
    } catch {
      throw safeFailure("PAGE_URL_FAILED", "Page URL capture failed closed.");
    }
    let cdpSessionPromise = null;
    try {
      const context = page.context();
      cdpSessionPromise = Promise.resolve().then(() => context.newCDPSession(page));
      cdpSession = await awaitWithDeadline(
        () => cdpSessionPromise,
        SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES.cdpSessionMilliseconds,
        "CDP_SESSION_TIMEOUT",
        "CDP session creation exceeded its fixed deadline."
      );
    } catch (error) {
      if (error?.code === "CDP_SESSION_TIMEOUT" && cdpSessionPromise !== null) {
        scheduleLateCdpSessionDetach(cdpSessionPromise);
      }
      throw captureFailure(
        error,
        "CDP_SESSION_FAILED",
        "CDP session creation failed closed."
      );
    }
    const sessionCreatedAt = canonicalTimestamp();
    let cdpPreChallengeResponse;
    const preRequestStartedAt = canonicalTimestamp();
    try {
      cdpPreChallengeResponse = await awaitWithDeadline(
        () => cdpSession.send("Target.getTargetInfo"),
        SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES.cdpRequestMilliseconds,
        "CDP_PRE_TIMEOUT",
        "Pre-challenge CDP request exceeded its fixed deadline."
      );
    } catch (error) {
      throw captureFailure(error, "CDP_PRE_FAILED", "Pre-challenge CDP request failed closed.");
    }
    const preResponseReceivedAt = canonicalTimestamp();
    let serviceWorkerChallengeResponse;
    const challengeRequestStartedAt = canonicalTimestamp();
    try {
      serviceWorkerChallengeResponse = await awaitWithDeadline(
        () => exchangeRuntimeChallenge(page, challengeNonce),
        SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES.challengeMilliseconds,
        "CHALLENGE_TIMEOUT",
        "Service Worker challenge exceeded its fixed transport deadline."
      );
    } catch (error) {
      throw captureFailure(error, "CHALLENGE_FAILED", "Service Worker challenge failed closed.");
    }
    const challengeResponseReceivedAt = canonicalTimestamp();
    let pageUrlAfter;
    try {
      pageUrlAfter = page.url();
    } catch {
      throw safeFailure("PAGE_URL_FAILED", "Page URL capture failed closed.");
    }
    let cdpPostChallengeResponse;
    const postRequestStartedAt = canonicalTimestamp();
    try {
      cdpPostChallengeResponse = await awaitWithDeadline(
        () => cdpSession.send("Target.getTargetInfo"),
        SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES.cdpRequestMilliseconds,
        "CDP_POST_TIMEOUT",
        "Post-challenge CDP request exceeded its fixed deadline."
      );
    } catch (error) {
      throw captureFailure(error, "CDP_POST_FAILED", "Post-challenge CDP request failed closed.");
    }
    const postResponseReceivedAt = canonicalTimestamp();
    observation = {
      pageUrlBefore,
      pageUrlAfter,
      cdpPreChallengeResponse,
      cdpPostChallengeResponse,
      serviceWorkerChallengeResponse
    };
    timeline = {
      startedAt,
      sessionCreatedAt,
      preRequestStartedAt,
      preResponseReceivedAt,
      challengeRequestStartedAt,
      challengeResponseReceivedAt,
      postRequestStartedAt,
      postResponseReceivedAt,
      sessionDetachedAt: null,
      completedAt: null
    };
  } catch (error) {
    primaryFailure = captureFailure(
      error,
      "CAPTURE_FAILED",
      "Live decoded capture failed closed."
    );
  }
  if (cdpSession !== null) {
    try {
      await awaitWithDeadline(
        () => cdpSession.detach(),
        SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES.detachMilliseconds,
        "CDP_DETACH_TIMEOUT",
        "CDP session detach exceeded its fixed deadline."
      );
    } catch (error) {
      throw captureFailure(error, "CDP_DETACH_FAILED", "CDP session detach failed closed.");
    }
  }
  if (primaryFailure !== null) throw primaryFailure;
  timeline.sessionDetachedAt = canonicalTimestamp();
  timeline.completedAt = canonicalTimestamp();
  const captureEnvelope = Object.freeze({
    observation: Object.freeze(observation),
    timeline: Object.freeze(timeline)
  });
  LIVE_CAPTURE_ENVELOPES.add(captureEnvelope);
  return captureEnvelope;
}
