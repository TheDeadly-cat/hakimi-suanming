import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  captureSwAbUpdateRuntimeCollectorDecodedObservationFromPage,
  consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope,
  SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES
} from "./sw-ab-update-runtime-collector-live-adapter.mjs";
import {
  createCollectorLivePageFixture,
  fixtureArtifactBindings,
  fixtureOrigin
} from "./sw-ab-update-runtime-collector-issuance.test-fixture.mjs";
import {
  abortSwAbUpdateRuntimeCollectorIssuance,
  beginSwAbUpdateRuntimeCollectorIssuance,
  collectNextSwAbUpdateRuntimeCollectorTupleFromPage,
  finalizeSwAbUpdateRuntimeCollectorIssuance
} from "./sw-ab-update-runtime-collector-issuance-writer.mjs";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const testParent = path.join(workspaceRoot, "tmp");
const testRoots = new Set();

async function beginSession(prefix = "collector-live-adapter-") {
  await mkdir(testParent, { recursive: true });
  const holder = await mkdtemp(path.join(testParent, prefix));
  testRoots.add(holder);
  const session = await beginSwAbUpdateRuntimeCollectorIssuance({
    cwd: workspaceRoot,
    runRoot: path.join(holder, "run"),
    origin: fixtureOrigin,
    artifactBindings: fixtureArtifactBindings
  });
  return { holder, session };
}

test.after(async () => {
  for (const root of testRoots) {
    const relative = path.relative(testParent, root);
    assert.notEqual(relative, "");
    assert.equal(path.isAbsolute(relative), false);
    assert.equal(relative === ".." || relative.startsWith(`..${path.sep}`), false);
    await rm(root, { recursive: true, force: true });
  }
});

const createFakePage = createCollectorLivePageFixture;

async function expectLiveFailureInvalidates({ session, fake }) {
  let capturedFailure;
  await assert.rejects(
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({ session, page: fake.page }),
    (error) => {
      capturedFailure = error;
      return error?.failureCode === "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_LIVE_CAPTURE_FAILED"
        && error?.stage === "live-capture";
    }
  );
  assert.equal(Object.hasOwn(capturedFailure, "cause"), false);
  assert.equal(String(capturedFailure).includes(fake.failureSecret), false);
  const unusedPage = createFakePage();
  await assert.rejects(
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({ session, page: unusedPage.page }),
    /SW_AB_RUNTIME_COLLECTOR_ISSUANCE_CAPSULE_NOT_ISSUED/u
  );
  assert.deepEqual(unusedPage.events, []);
  await assert.rejects(
    abortSwAbUpdateRuntimeCollectorIssuance(session),
    /SW_AB_RUNTIME_COLLECTOR_ISSUANCE_CAPSULE_NOT_ISSUED/u
  );
}

async function withImmediateAdapterDeadlines(operation) {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, _milliseconds, ...args) =>
    originalSetTimeout(callback, 0, ...args);
  try {
    const result = await operation();
    await new Promise((resolve) => originalSetTimeout(resolve, 10));
    return result;
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
}

test("live production entry captures all eight fixed tuples and finalizes the unchanged v13 ledger", async () => {
  const { session } = await beginSession();
  for (const tuple of SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES) {
    const fake = createFakePage(tuple);
    const result = await collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
      session,
      page: fake.page
    });
    assert.deepEqual(
      {
        projectName: result.projectName,
        phase: result.phase,
        slot: result.slot
      },
      tuple
    );
    assert.deepEqual(fake.events, [
      "url-before",
      "context",
      "new-cdp-session",
      "cdp-pre",
      "challenge",
      "url-after",
      "cdp-post",
      "detach"
    ]);
    assert.equal(fake.seenNonces.length, 1);
    assert.match(fake.seenNonces[0], /^challenge-[a-f0-9]{64}$/u);
  }
  const result = await finalizeSwAbUpdateRuntimeCollectorIssuance(session);
  assert.deepEqual(result.releaseIdentity, {
    channel: "default-v13",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  assert.deepEqual(result.capabilities, {
    mutationEpochCapability: "absent_schema13",
    epoch: null
  });
  assert.equal(result.authority.publicDeploymentAuthorized, false);
  assert.equal(result.authority.expertClaimsAuthorized, false);
});

test("live timeline samples real API boundaries and preserves a controlled challenge delay", async () => {
  const { holder, session } = await beginSession("collector-live-timeline-");
  const first = createFakePage({
    ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[0],
    evaluateDelayMilliseconds: 30
  });
  await collectNextSwAbUpdateRuntimeCollectorTupleFromPage({ session, page: first.page });
  for (const tuple of SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.slice(1)) {
    const fake = createFakePage(tuple);
    await collectNextSwAbUpdateRuntimeCollectorTupleFromPage({ session, page: fake.page });
  }
  await finalizeSwAbUpdateRuntimeCollectorIssuance(session);
  const firstTuple = JSON.parse(await readFile(
    path.join(
      holder,
      "run",
      "api-transcript",
      SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[0]
    ),
    "utf8"
  ));
  const challengeStarted = Date.parse(firstTuple.serviceWorkerChallenge.requestStartedAt);
  const challengeCompleted = Date.parse(firstTuple.serviceWorkerChallenge.responseReceivedAt);
  assert.ok(challengeCompleted - challengeStarted >= 20);
  assert.ok(Date.parse(firstTuple.completedAt) - Date.parse(firstTuple.startedAt) >= 20);
});

test("live adapter deadlines are fixed production constants", () => {
  assert.deepEqual(SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_DEADLINES, {
    cdpSessionMilliseconds: 10_000,
    cdpRequestMilliseconds: 10_000,
    challengeMilliseconds: 7_500,
    detachMilliseconds: 5_000
  });
});

for (const [index, scenario] of [
  { name: "CDP session creation", options: { neverResolveNewSession: true }, detached: false },
  { name: "pre-challenge CDP", options: { neverResolvePre: true }, detached: true },
  { name: "Page challenge transport", options: { neverResolveEvaluate: true }, detached: true },
  { name: "post-challenge CDP", options: { neverResolvePost: true }, detached: true },
  { name: "CDP detach", options: { neverResolveDetach: true }, detached: true }
].entries()) {
  test(`${scenario.name} never-settle path hits its deadline and invalidates`, async () => {
    const { session } = await beginSession(`collector-live-timeout-${index}-`);
    const fake = createFakePage(scenario.options);
    await withImmediateAdapterDeadlines(() =>
      expectLiveFailureInvalidates({ session, fake })
    );
    assert.equal(fake.events.includes("detach"), scenario.detached);
  });
}

test("a CDP session resolving after its deadline is detached by bounded late cleanup", async () => {
  const { session } = await beginSession("collector-live-late-session-");
  const fake = createFakePage({ resolveNewSessionAfterMilliseconds: 50 });
  await withImmediateAdapterDeadlines(() =>
    expectLiveFailureInvalidates({ session, fake })
  );
  assert.equal(fake.events.at(-1), "detach");
});

test("live production entry accepts only exact own-data session and page", async () => {
  const { session } = await beginSession();
  const fake = createFakePage();
  for (const extraKey of [
    "runId",
    "attemptId",
    "nonce",
    "timestamp",
    "origin",
    "buildVersion",
    "decodedObservation",
    "callback"
  ]) {
    await assert.rejects(
      collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
        session,
        page: fake.page,
        [extraKey]: "caller-supplied"
      }),
      /SW_AB_RUNTIME_COLLECTOR_ISSUANCE_INPUT_INVALID/u
    );
  }
  assert.deepEqual(fake.events, []);
  await abortSwAbUpdateRuntimeCollectorIssuance(session);
});

test("writer exposes the live collector without any public reserve or complete hook", async () => {
  const writer = await import("./sw-ab-update-runtime-collector-issuance-writer.mjs");
  assert.deepEqual(Object.keys(writer).sort(), [
    "abortSwAbUpdateRuntimeCollectorIssuance",
    "beginSwAbUpdateRuntimeCollectorIssuance",
    "collectNextSwAbUpdateRuntimeCollectorTupleFromPage",
    "finalizeSwAbUpdateRuntimeCollectorIssuance"
  ]);
});

test("live capture envelope rejects clones and a second consume", async () => {
  const fake = createFakePage();
  const captureEnvelope =
    await captureSwAbUpdateRuntimeCollectorDecodedObservationFromPage({
      page: fake.page,
      reservation: {
        challengeRequest: {
          type: "SW_AB_RUNTIME_CHALLENGE_V1",
          challengeNonce: `challenge-${"a".repeat(64)}`
        }
      }
    });
  assert.throws(
    () => consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope({ ...captureEnvelope }),
    /SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_CAPTURE_ENVELOPE_INVALID/u
  );
  assert.equal(
    consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope(captureEnvelope),
    captureEnvelope
  );
  assert.throws(
    () => consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope(captureEnvelope),
    /SW_AB_RUNTIME_COLLECTOR_LIVE_ADAPTER_CAPTURE_ENVELOPE_INVALID/u
  );
});

test("a copied session capsule is rejected before touching the Page adapter", async () => {
  const { session } = await beginSession();
  const fake = createFakePage();
  await assert.rejects(
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
      session: { ...session },
      page: fake.page
    }),
    /SW_AB_RUNTIME_COLLECTOR_ISSUANCE_CAPSULE_NOT_ISSUED/u
  );
  assert.deepEqual(fake.events, []);
  await abortSwAbUpdateRuntimeCollectorIssuance(session);
});

test("a challenge nonce replayed into the next tuple fails closed", async () => {
  const { session } = await beginSession();
  const first = createFakePage({
    projectName: "msedge",
    phase: "initial-a",
    slot: "retained-old-a"
  });
  await collectNextSwAbUpdateRuntimeCollectorTupleFromPage({ session, page: first.page });
  const replay = createFakePage({
    projectName: "msedge",
    phase: "initial-a",
    slot: "reload-to-b",
    challengeNonceOverride: first.seenNonces[0]
  });
  await expectLiveFailureInvalidates({ session, fake: replay });
  assert.equal(replay.events.at(-1), "detach");
});

test("an arbitrary substituted challenge nonce fails closed", async () => {
  const { session } = await beginSession();
  const fake = createFakePage({
    challengeNonceOverride: `challenge-${"f".repeat(64)}`
  });
  await expectLiveFailureInvalidates({ session, fake });
  assert.equal(fake.events.at(-1), "detach");
});

test("a challenge response from another session cannot be replayed across capsules", async () => {
  const first = await beginSession("collector-live-cross-source-");
  const second = await beginSession("collector-live-cross-target-");
  const sourcePage = createFakePage();
  await collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
    session: first.session,
    page: sourcePage.page
  });
  const replay = createFakePage({ challengeNonceOverride: sourcePage.seenNonces[0] });
  await expectLiveFailureInvalidates({ session: second.session, fake: replay });
  await abortSwAbUpdateRuntimeCollectorIssuance(first.session);
});

test("page URL drift across the challenge fails after a successful detach", async () => {
  const { session } = await beginSession();
  const fake = createFakePage({ pageUrlAfter: `${fixtureOrigin}/help` });
  await expectLiveFailureInvalidates({ session, fake });
  assert.equal(fake.events.at(-1), "detach");
});

for (const scenario of [
  {
    name: "target id drift",
    options: { postTargetOverrides: { targetId: "changed-target" } }
  },
  {
    name: "target URL drift",
    options: { postTargetOverrides: { url: `${fixtureOrigin}/help` } }
  }
]) {
  test(`${scenario.name} fails closed`, async () => {
    const { session } = await beginSession();
    const fake = createFakePage(scenario.options);
    await expectLiveFailureInvalidates({ session, fake });
    assert.equal(fake.events.at(-1), "detach");
  });
}

for (const scenario of [
  {
    name: "initial Page URL rejection",
    options: { rejectPageUrlBefore: true },
    expectedDetach: false
  },
  {
    name: "CDP session creation rejection",
    options: { rejectNewSession: true },
    expectedDetach: false
  },
  { name: "pre-challenge CDP rejection", options: { rejectPre: true }, expectedDetach: true },
  { name: "post-challenge CDP rejection", options: { rejectPost: true }, expectedDetach: true },
  { name: "page evaluate rejection", options: { rejectEvaluate: true }, expectedDetach: true },
  { name: "CDP detach rejection", options: { rejectDetach: true }, expectedDetach: true }
]) {
  test(`${scenario.name} invalidates the session without leaking the original error`, async () => {
    const { session } = await beginSession();
    const fake = createFakePage(scenario.options);
    await expectLiveFailureInvalidates({ session, fake });
    assert.equal(fake.events.includes("detach"), scenario.expectedDetach);
  });
}

for (const scenario of [
  {
    name: "build binding drift",
    options: { buildVersionOverride: "9".repeat(12) }
  },
  {
    name: "legacy-v13 descriptor drift",
    options: { descriptorOverride: { targetSchema: 14 } }
  },
  {
    name: "unexpected decoded payload",
    options: {
      descriptorOverride: { unexpectedDecodedPayload: "decoded-payload-must-not-leak" }
    }
  }
]) {
  test(`${scenario.name} is rejected only after capture and detach, then invalidates the session`, async () => {
    const { session } = await beginSession();
    const fake = createFakePage(scenario.options);
    await expectLiveFailureInvalidates({ session, fake });
    assert.equal(fake.events.at(-1), "detach");
  });
}
