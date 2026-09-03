import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginControllerTakeoverAttempt,
  completeControllerTakeoverAttempt,
  CONTROLLER_TAKEOVER_MAX_ATTEMPTS,
  CONTROLLER_TAKEOVER_RETRY_DELAYS_MS,
  controllerTakeoverFailureFromNack,
  createControllerTakeoverAttemptState,
  createControllerTakeoverScheduler,
  releaseControllerTakeoverBackoff,
  settleControllerTakeoverFailure,
  type ControllerTakeoverAttemptState,
  type ControllerTakeoverFailure,
  type ControllerTakeoverSchedulerTransition
} from "./service-worker-takeover-retry";

const failure = (
  reasonCode: string,
  outcome: ControllerTakeoverFailure["outcome"] = "known_not_committed"
): ControllerTakeoverFailure => ({ reasonCode, outcome });

describe("service worker takeover retry policy", () => {
  it("admits at most one in-flight attempt for one waiting worker", () => {
    const first = beginControllerTakeoverAttempt(createControllerTakeoverAttemptState());
    expect(first).toMatchObject({ started: true, state: { phase: "in_flight", attemptsStarted: 1 } });

    const duplicate = beginControllerTakeoverAttempt(first.state);
    expect(duplicate).toEqual({ started: false, state: first.state });
    const otherWorker = beginControllerTakeoverAttempt(
      createControllerTakeoverAttemptState(),
      true
    );
    expect(otherWorker).toEqual({
      started: false,
      state: createControllerTakeoverAttemptState()
    });
    expect(completeControllerTakeoverAttempt(first.state)).toMatchObject({
      phase: "succeeded",
      attemptsStarted: 1
    });
  });

  it.each([
    "PROTOCOL_MISMATCH",
    "WAITING_PREPARATION_REJECTED",
    "CLIENT_NOT_FROZEN",
    "SOURCE_CLIENT_NOT_ENUMERATED",
    "TAKEOVER_HOLD_PRESENT",
    "TAKEOVER_HOLD_STATUS_UNKNOWN",
    "TAKEOVER_HOLD_PERSIST_FAILED",
    "TAKEOVER_HOLD_CLEAR_FAILED",
    "WAITING_COMMIT_KNOWN_REJECTED:PROTOCOL_MISMATCH",
    "UNRECOGNIZED_NACK"
  ])("keeps terminal NACK %s terminal without a retry", (reasonCode) => {
    const started = beginControllerTakeoverAttempt(createControllerTakeoverAttemptState()).state;
    const settled = settleControllerTakeoverFailure(started, failure(reasonCode));
    expect(settled).toMatchObject({
      disposition: "terminal",
      retryDelayMs: null,
      state: { phase: "terminal", attemptsStarted: 1, lastReasonCode: reasonCode }
    });
    expect(beginControllerTakeoverAttempt(settled.state).started).toBe(false);
  });

  it.each([
    ["REQUEST_POST_FAILED", "known_not_committed"],
    ["TAKEOVER_SESSION_BUSY", "known_not_committed"],
    ["WAITING_WORKER_NOT_INSTALLED", "known_not_committed"],
    ["WAITING_PREPARATION_TIMEOUT", "known_not_committed"],
    ["WAITING_PREPARATION_POST_FAILED", "known_not_committed"],
    ["CLIENT_SET_DID_NOT_STABILIZE", "known_not_committed"],
    ["WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED", "known_commit_rejected"]
  ] as const)("retries only the explicit transient failure %s", (reasonCode, outcome) => {
    const started = beginControllerTakeoverAttempt(createControllerTakeoverAttemptState()).state;
    const settled = settleControllerTakeoverFailure(started, failure(reasonCode, outcome));
    expect(settled).toMatchObject({
      disposition: "retry",
      retryDelayMs: 1_000,
      state: { phase: "backoff", attemptsStarted: 1, lastReasonCode: reasonCode }
    });
  });

  it("does not prefix-match a lookalike transient NACK", () => {
    const started = beginControllerTakeoverAttempt(createControllerTakeoverAttemptState()).state;
    const reasonCode = "WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED:EXTRA";
    const settled = settleControllerTakeoverFailure(
      started,
      failure(reasonCode, "known_commit_rejected")
    );
    expect(settled).toMatchObject({
      disposition: "terminal",
      retryDelayMs: null,
      state: { phase: "terminal", lastReasonCode: reasonCode }
    });
  });

  it("retries only the exact busy code, not a lookalike", () => {
    const exactStarted = beginControllerTakeoverAttempt(
      createControllerTakeoverAttemptState()
    ).state;
    expect(settleControllerTakeoverFailure(
      exactStarted,
      controllerTakeoverFailureFromNack("TAKEOVER_SESSION_BUSY")
    )).toMatchObject({ disposition: "retry", retryDelayMs: 1_000 });

    const lookalikeStarted = beginControllerTakeoverAttempt(
      createControllerTakeoverAttemptState()
    ).state;
    expect(settleControllerTakeoverFailure(
      lookalikeStarted,
      controllerTakeoverFailureFromNack("TAKEOVER_SESSION_BUSY:EXTRA")
    )).toMatchObject({ disposition: "terminal", retryDelayMs: null });
  });

  it.each([
    "REQUEST_ACK_TIMEOUT",
    "INVALID_ACK_IDENTITY",
    "INVALID_ACCEPTED_ACK",
    "WAITING_COMMIT_OUTCOME_UNKNOWN"
  ])("never retries commit outcome unknown %s", (reasonCode) => {
    const started = beginControllerTakeoverAttempt(createControllerTakeoverAttemptState()).state;
    const settled = settleControllerTakeoverFailure(
      started,
      failure(reasonCode, "commit_outcome_unknown")
    );
    expect(settled).toMatchObject({
      disposition: "commit_outcome_unknown",
      retryDelayMs: null,
      state: { phase: "commit_outcome_unknown", attemptsStarted: 1 }
    });
    expect(beginControllerTakeoverAttempt(settled.state).started).toBe(false);
  });

  it("derives commit certainty conservatively from an authenticated NACK reason", () => {
    expect(controllerTakeoverFailureFromNack("PROTOCOL_MISMATCH")).toEqual({
      reasonCode: "PROTOCOL_MISMATCH",
      outcome: "known_not_committed"
    });
    expect(controllerTakeoverFailureFromNack(
      "WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED"
    )).toEqual({
      reasonCode: "WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED",
      outcome: "known_commit_rejected"
    });
    expect(controllerTakeoverFailureFromNack("WAITING_COMMIT_OUTCOME_UNKNOWN")).toEqual({
      reasonCode: "WAITING_COMMIT_OUTCOME_UNKNOWN",
      outcome: "commit_outcome_unknown"
    });
    expect(controllerTakeoverFailureFromNack(
      "WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED:EXTRA"
    )).toEqual({
      reasonCode: "WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED:EXTRA",
      outcome: "known_not_committed"
    });
  });

  it("applies bounded backoff and stops after the third explicit transient failure", () => {
    expect(CONTROLLER_TAKEOVER_MAX_ATTEMPTS).toBe(3);
    expect(CONTROLLER_TAKEOVER_RETRY_DELAYS_MS).toEqual([1_000, 4_000]);
    let state: ControllerTakeoverAttemptState = createControllerTakeoverAttemptState();

    for (let attempt = 1; attempt <= CONTROLLER_TAKEOVER_MAX_ATTEMPTS; attempt += 1) {
      const started = beginControllerTakeoverAttempt(state);
      expect(started.started).toBe(true);
      expect(started.state.attemptsStarted).toBe(attempt);
      const settled = settleControllerTakeoverFailure(
        started.state,
        failure("WAITING_PREPARATION_TIMEOUT")
      );
      if (attempt < CONTROLLER_TAKEOVER_MAX_ATTEMPTS) {
        expect(settled.disposition).toBe("retry");
        expect(settled.retryDelayMs).toBe(CONTROLLER_TAKEOVER_RETRY_DELAYS_MS[attempt - 1]);
        state = releaseControllerTakeoverBackoff(settled.state);
        expect(state.phase).toBe("idle");
      } else {
        expect(settled).toMatchObject({
          disposition: "exhausted",
          retryDelayMs: null,
          state: { phase: "exhausted", attemptsStarted: 3 }
        });
        state = settled.state;
      }
    }

    expect(beginControllerTakeoverAttempt(state).started).toBe(false);
  });

  it("admits a fresh bounded retry after an explicit skipWaiting rejection", () => {
    const started = beginControllerTakeoverAttempt(createControllerTakeoverAttemptState()).state;
    const settled = settleControllerTakeoverFailure(
      started,
      failure("WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED", "known_commit_rejected")
    );
    expect(settled).toMatchObject({ disposition: "retry", retryDelayMs: 1_000 });
    const fresh = beginControllerTakeoverAttempt(releaseControllerTakeoverBackoff(settled.state));
    expect(fresh).toMatchObject({
      started: true,
      state: { phase: "in_flight", attemptsStarted: 2, lastReasonCode: null }
    });
  });
});

type FakeWorker = { readonly id: string; state: "installed" | "redundant" };
type FakeController = { readonly id: string };

const flushPromiseCallbacks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function createSchedulerHarness(
  requestActivation: (controller: FakeController, worker: FakeWorker) => Promise<void>
) {
  const workerA: FakeWorker = { id: "worker-a", state: "installed" };
  const workerB: FakeWorker = { id: "worker-b", state: "installed" };
  const controllerA: FakeController = { id: "controller-a" };
  const controllerB: FakeController = { id: "controller-b" };
  let waitingWorker: FakeWorker | null = workerA;
  let controller: FakeController | null = controllerA;
  const transitions: Array<ControllerTakeoverSchedulerTransition<FakeWorker, FakeController>> = [];
  const scheduler = createControllerTakeoverScheduler({
    clock: {
      setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
      clearTimeout: (timer) => globalThis.clearTimeout(timer)
    },
    getWaitingWorker: () => waitingWorker,
    getController: () => controller,
    isWaitingWorkerReady: (worker) => worker.state === "installed",
    requestActivation,
    classifyFailure: (reason) => {
      if (
        typeof reason === "object" &&
        reason !== null &&
        "reasonCode" in reason &&
        "outcome" in reason
      ) return reason as ControllerTakeoverFailure;
      return failure("UNCLASSIFIED_TEST_FAILURE", "commit_outcome_unknown");
    },
    onTransition: (transition) => transitions.push(transition)
  });
  return {
    controllerA,
    controllerB,
    scheduler,
    setController: (next: FakeController | null) => { controller = next; },
    setWaitingWorker: (next: FakeWorker | null) => { waitingWorker = next; },
    transitions,
    workerA,
    workerB
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("controller takeover page scheduler", () => {
  it("starts immediately, waits 1 s then 4 s, and stops after attempt three", async () => {
    vi.useFakeTimers();
    const request = vi.fn(() => Promise.reject(failure("WAITING_PREPARATION_TIMEOUT")));
    const { scheduler, workerA } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    expect(request).toHaveBeenCalledTimes(1);
    await flushPromiseCallbacks();
    expect(scheduler.pendingRetryCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(scheduler.pendingRetryCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(3_999);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(3);
    expect(scheduler.stateFor(workerA)).toMatchObject({
      phase: "exhausted",
      attemptsStarted: 3
    });
    expect(scheduler.pendingRetryCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("does not create a duplicate timer while the same failure is in backoff", async () => {
    vi.useFakeTimers();
    const request = vi.fn(() => Promise.reject(failure("TAKEOVER_SESSION_BUSY")));
    const { scheduler } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    await flushPromiseCallbacks();
    scheduler.promoteWaiting();
    scheduler.promoteWaiting();
    scheduler.promoteWaiting();

    expect(request).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingRetryCount()).toBe(1);
    expect(vi.getTimerCount()).toBe(1);
  });

  it.each([
    failure("REQUEST_ACK_TIMEOUT", "commit_outcome_unknown"),
    failure("PROTOCOL_MISMATCH", "known_not_committed")
  ])("never schedules a retry for $outcome / $reasonCode", async (result) => {
    vi.useFakeTimers();
    const request = vi.fn(() => Promise.reject(result));
    const { scheduler, workerA } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    await flushPromiseCallbacks();

    expect(request).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingRetryCount()).toBe(0);
    expect(scheduler.stateFor(workerA).phase).toBe(
      result.outcome === "commit_outcome_unknown" ? "commit_outcome_unknown" : "terminal"
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("closes page-wide promotion after an unknown outcome even if waiting is replaced", async () => {
    vi.useFakeTimers();
    const request = vi.fn(() => Promise.reject(
      failure("REQUEST_ACK_TIMEOUT", "commit_outcome_unknown")
    ));
    const { scheduler, setWaitingWorker, workerA, workerB } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    await flushPromiseCallbacks();
    expect(scheduler.isClosed()).toBe(true);
    expect(scheduler.stateFor(workerA).phase).toBe("commit_outcome_unknown");

    setWaitingWorker(workerB);
    scheduler.promoteWaiting();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(request).toHaveBeenCalledTimes(1);
    expect(scheduler.stateFor(workerB)).toEqual(createControllerTakeoverAttemptState());
    expect(scheduler.pendingRetryCount()).toBe(0);
  });

  it("closes page-wide promotion after success even if waiting is replaced before controllerchange", async () => {
    vi.useFakeTimers();
    const request = vi.fn(() => Promise.resolve());
    const { scheduler, setWaitingWorker, workerA, workerB } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    await flushPromiseCallbacks();
    expect(scheduler.isClosed()).toBe(true);
    expect(scheduler.stateFor(workerA).phase).toBe("succeeded");

    setWaitingWorker(workerB);
    scheduler.promoteWaiting();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(request).toHaveBeenCalledTimes(1);
    expect(scheduler.stateFor(workerB)).toEqual(createControllerTakeoverAttemptState());
    expect(scheduler.pendingRetryCount()).toBe(0);
  });

  it("does not let an old worker retry timer drive its replacement", async () => {
    vi.useFakeTimers();
    const request = vi.fn((_controller: FakeController, worker: FakeWorker) =>
      worker.id === "worker-a"
        ? Promise.reject(failure("WAITING_PREPARATION_TIMEOUT"))
        : Promise.resolve()
    );
    const { scheduler, setWaitingWorker, workerA, workerB } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    await flushPromiseCallbacks();
    expect(scheduler.pendingRetryCount()).toBe(1);
    setWaitingWorker(workerB);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(request).toHaveBeenCalledTimes(1);
    expect(scheduler.stateFor(workerA)).toMatchObject({
      phase: "terminal",
      lastReasonCode: "WAITING_OR_CONTROLLER_CHANGED_DURING_BACKOFF"
    });

    // A fresh observation may promote B; A's old timer was not that trigger.
    scheduler.promoteWaiting();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1]?.[1]).toBe(workerB);
  });

  it.each(["resolve", "reject"] as const)(
    "turns an already-dispatched %s callback into unknown after waiting identity changes",
    async (settlement) => {
      vi.useFakeTimers();
      let resolveRequest: (() => void) | undefined;
      let rejectRequest: ((reason: unknown) => void) | undefined;
      const request = vi.fn(() => new Promise<void>((resolve, reject) => {
        resolveRequest = resolve;
        rejectRequest = reject;
      }));
      const { scheduler, setWaitingWorker, transitions, workerA, workerB } =
        createSchedulerHarness(request);

      scheduler.promoteWaiting();
      setWaitingWorker(workerB);
      if (settlement === "resolve") resolveRequest?.();
      else rejectRequest?.(failure("WAITING_PREPARATION_TIMEOUT"));
      await flushPromiseCallbacks();

      expect(scheduler.isClosed()).toBe(true);
      expect(scheduler.stateFor(workerA)).toMatchObject({
        phase: "commit_outcome_unknown",
        lastReasonCode: "REQUEST_CONTEXT_CHANGED_AFTER_DISPATCH"
      });
      expect(scheduler.pendingRetryCount()).toBe(0);
      expect(transitions.some((transition) => transition.kind === "succeeded")).toBe(false);
      scheduler.promoteWaiting();
      expect(request).toHaveBeenCalledTimes(1);
    }
  );

  it("close cancels every retry timer", async () => {
    vi.useFakeTimers();
    const request = vi.fn(() => Promise.reject(failure("WAITING_PREPARATION_TIMEOUT")));
    const { scheduler } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    await flushPromiseCallbacks();
    expect(scheduler.pendingRetryCount()).toBe(1);
    scheduler.close("CONTROLLER_CHANGED_AFTER_DISPATCH");

    expect(scheduler.isClosed()).toBe(true);
    expect(scheduler.pendingRetryCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("close invalidates an in-flight callback and records unknown only once", async () => {
    vi.useFakeTimers();
    let resolveRequest: (() => void) | undefined;
    const request = vi.fn(() => new Promise<void>((resolve) => { resolveRequest = resolve; }));
    const { scheduler, transitions, workerA } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    scheduler.close("CONTROLLER_CHANGED_AFTER_DISPATCH");
    expect(scheduler.stateFor(workerA)).toMatchObject({
      phase: "commit_outcome_unknown",
      lastReasonCode: "CONTROLLER_CHANGED_AFTER_DISPATCH"
    });
    resolveRequest?.();
    await flushPromiseCallbacks();

    expect(transitions.filter(
      (transition) => transition.kind === "commit_outcome_unknown"
    )).toHaveLength(1);
    expect(transitions.some((transition) => transition.kind === "succeeded")).toBe(false);
  });

  it("a controller identity change is unknown and cannot safely retry", async () => {
    vi.useFakeTimers();
    let rejectRequest: ((reason: unknown) => void) | undefined;
    const request = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectRequest = reject; }));
    const { controllerB, scheduler, setController, workerA } = createSchedulerHarness(request);

    scheduler.promoteWaiting();
    setController(controllerB);
    rejectRequest?.(failure("WAITING_PREPARATION_TIMEOUT"));
    await flushPromiseCallbacks();

    expect(scheduler.isClosed()).toBe(true);
    expect(scheduler.stateFor(workerA).phase).toBe("commit_outcome_unknown");
    expect(scheduler.pendingRetryCount()).toBe(0);
  });
});
