export const CONTROLLER_TAKEOVER_MAX_ATTEMPTS = 3 as const;
export const CONTROLLER_TAKEOVER_RETRY_DELAYS_MS = Object.freeze([1_000, 4_000] as const);

export type ControllerTakeoverFailureOutcome =
  | "known_not_committed"
  | "known_commit_rejected"
  | "commit_outcome_unknown";

export type ControllerTakeoverFailure = Readonly<{
  reasonCode: string;
  outcome: ControllerTakeoverFailureOutcome;
}>;

export type ControllerTakeoverAttemptPhase =
  | "idle"
  | "in_flight"
  | "backoff"
  | "succeeded"
  | "terminal"
  | "commit_outcome_unknown"
  | "exhausted";

export type ControllerTakeoverAttemptState = Readonly<{
  phase: ControllerTakeoverAttemptPhase;
  attemptsStarted: number;
  lastReasonCode: string | null;
}>;

export type ControllerTakeoverFailureDisposition =
  | "retry"
  | "terminal"
  | "commit_outcome_unknown"
  | "exhausted"
  | "ignored";

const EXPLICIT_TRANSIENT_FAILURES = new Set<string>([
  "REQUEST_POST_FAILED",
  "TAKEOVER_SESSION_BUSY",
  "WAITING_WORKER_NOT_INSTALLED",
  "WAITING_PREPARATION_TIMEOUT",
  "WAITING_PREPARATION_POST_FAILED",
  "CLIENT_SET_DID_NOT_STABILIZE",
  "WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED"
]);

export function createControllerTakeoverAttemptState(): ControllerTakeoverAttemptState {
  return Object.freeze({ phase: "idle", attemptsStarted: 0, lastReasonCode: null });
}

export function isExplicitControllerTakeoverTransientFailure(
  failure: ControllerTakeoverFailure
): boolean {
  return failure.outcome !== "commit_outcome_unknown"
    && EXPLICIT_TRANSIENT_FAILURES.has(failure.reasonCode);
}

export function controllerTakeoverFailureFromNack(reasonCode: string): ControllerTakeoverFailure {
  if (reasonCode === "WAITING_COMMIT_OUTCOME_UNKNOWN") {
    return Object.freeze({ reasonCode, outcome: "commit_outcome_unknown" as const });
  }
  if (
    reasonCode === "WAITING_COMMIT_KNOWN_REJECTED:PROTOCOL_MISMATCH" ||
    reasonCode === "WAITING_COMMIT_KNOWN_REJECTED:SKIP_WAITING_FAILED"
  ) {
    return Object.freeze({ reasonCode, outcome: "known_commit_rejected" as const });
  }
  return Object.freeze({ reasonCode, outcome: "known_not_committed" as const });
}

export function beginControllerTakeoverAttempt(
  state: ControllerTakeoverAttemptState,
  anotherAttemptInFlight = false
): Readonly<{ state: ControllerTakeoverAttemptState; started: boolean }> {
  if (anotherAttemptInFlight || state.phase !== "idle") {
    return Object.freeze({ state, started: false });
  }
  if (state.attemptsStarted >= CONTROLLER_TAKEOVER_MAX_ATTEMPTS) {
    return Object.freeze({
      state: Object.freeze({ ...state, phase: "exhausted" as const }),
      started: false
    });
  }
  return Object.freeze({
    state: Object.freeze({
      phase: "in_flight" as const,
      attemptsStarted: state.attemptsStarted + 1,
      lastReasonCode: null
    }),
    started: true
  });
}

export function completeControllerTakeoverAttempt(
  state: ControllerTakeoverAttemptState
): ControllerTakeoverAttemptState {
  if (state.phase !== "in_flight") return state;
  return Object.freeze({ ...state, phase: "succeeded" as const, lastReasonCode: null });
}

export function settleControllerTakeoverFailure(
  state: ControllerTakeoverAttemptState,
  failure: ControllerTakeoverFailure
): Readonly<{
  state: ControllerTakeoverAttemptState;
  disposition: ControllerTakeoverFailureDisposition;
  retryDelayMs: number | null;
}> {
  if (state.phase !== "in_flight") {
    return Object.freeze({ state, disposition: "ignored", retryDelayMs: null });
  }
  if (failure.outcome === "commit_outcome_unknown") {
    return Object.freeze({
      state: Object.freeze({
        ...state,
        phase: "commit_outcome_unknown" as const,
        lastReasonCode: failure.reasonCode
      }),
      disposition: "commit_outcome_unknown",
      retryDelayMs: null
    });
  }
  if (!isExplicitControllerTakeoverTransientFailure(failure)) {
    return Object.freeze({
      state: Object.freeze({
        ...state,
        phase: "terminal" as const,
        lastReasonCode: failure.reasonCode
      }),
      disposition: "terminal",
      retryDelayMs: null
    });
  }
  if (state.attemptsStarted >= CONTROLLER_TAKEOVER_MAX_ATTEMPTS) {
    return Object.freeze({
      state: Object.freeze({
        ...state,
        phase: "exhausted" as const,
        lastReasonCode: failure.reasonCode
      }),
      disposition: "exhausted",
      retryDelayMs: null
    });
  }
  const retryDelayMs = CONTROLLER_TAKEOVER_RETRY_DELAYS_MS[state.attemptsStarted - 1];
  if (retryDelayMs === undefined) {
    return Object.freeze({
      state: Object.freeze({
        ...state,
        phase: "exhausted" as const,
        lastReasonCode: failure.reasonCode
      }),
      disposition: "exhausted",
      retryDelayMs: null
    });
  }
  return Object.freeze({
    state: Object.freeze({
      ...state,
      phase: "backoff" as const,
      lastReasonCode: failure.reasonCode
    }),
    disposition: "retry",
    retryDelayMs
  });
}

export function releaseControllerTakeoverBackoff(
  state: ControllerTakeoverAttemptState
): ControllerTakeoverAttemptState {
  if (state.phase !== "backoff") return state;
  return Object.freeze({ ...state, phase: "idle" as const });
}

export type ControllerTakeoverSchedulerClock<TTimer> = Readonly<{
  setTimeout: (callback: () => void, delayMs: number) => TTimer;
  clearTimeout: (timer: TTimer) => void;
}>;

export type ControllerTakeoverSchedulerTransition<TWorker extends object, TController extends object> =
  Readonly<{
    kind:
      | "attempt_started"
      | "succeeded"
      | "retry_scheduled"
      | "terminal"
      | "commit_outcome_unknown"
      | "exhausted";
    worker: TWorker;
    controller: TController;
    state: ControllerTakeoverAttemptState;
    failure: ControllerTakeoverFailure | null;
    retryDelayMs: number | null;
  }>;

export type ControllerTakeoverScheduler<TWorker extends object> = Readonly<{
  promoteWaiting: () => void;
  close: (reasonCode?: string) => void;
  stateFor: (worker: TWorker) => ControllerTakeoverAttemptState;
  pendingRetryCount: () => number;
  isClosed: () => boolean;
}>;

export function createControllerTakeoverScheduler<
  TWorker extends object,
  TController extends object,
  TTimer
>(options: Readonly<{
  clock: ControllerTakeoverSchedulerClock<TTimer>;
  getWaitingWorker: () => TWorker | null;
  getController: () => TController | null;
  isWaitingWorkerReady: (worker: TWorker) => boolean;
  requestActivation: (controller: TController, worker: TWorker) => Promise<void>;
  classifyFailure: (reason: unknown) => ControllerTakeoverFailure;
  onTransition?: (
    transition: ControllerTakeoverSchedulerTransition<TWorker, TController>
  ) => void;
}>): ControllerTakeoverScheduler<TWorker> {
  type Attempt = Readonly<{
    controller: TController;
    epoch: number;
    token: object;
    worker: TWorker;
  }>;
  type RetryTimer = Readonly<{
    controller: TController;
    epoch: number;
    handle: TTimer;
  }>;

  const states = new Map<TWorker, ControllerTakeoverAttemptState>();
  const retryTimers = new Map<TWorker, RetryTimer>();
  let activeAttempt: Attempt | null = null;
  let epoch = 0;
  let closed = false;

  const stateFor = (worker: TWorker): ControllerTakeoverAttemptState =>
    states.get(worker) ?? createControllerTakeoverAttemptState();

  const notify = (
    transition: ControllerTakeoverSchedulerTransition<TWorker, TController>
  ) => {
    try {
      options.onTransition?.(transition);
    } catch {
      // Diagnostics must not alter takeover certainty or retry state.
    }
  };

  const clearRetryTimer = (worker: TWorker) => {
    const pending = retryTimers.get(worker);
    if (!pending) return;
    retryTimers.delete(worker);
    try {
      options.clock.clearTimeout(pending.handle);
    } catch {
      // A timer callback is independently fenced by epoch and object identity.
    }
  };

  const clearAllRetryTimers = () => {
    for (const worker of [...retryTimers.keys()]) clearRetryTimer(worker);
  };

  const markBackoffContextChanged = (
    worker: TWorker,
    controller: TController,
    reasonCode: string
  ) => {
    const current = stateFor(worker);
    if (current.phase !== "backoff") return;
    const failure = Object.freeze({
      reasonCode,
      outcome: "known_not_committed" as const
    });
    const state = Object.freeze({
      ...current,
      phase: "terminal" as const,
      lastReasonCode: reasonCode
    });
    states.set(worker, state);
    notify(Object.freeze({
      kind: "terminal" as const,
      worker,
      controller,
      state,
      failure,
      retryDelayMs: null
    }));
  };

  const cancelStaleBackoffTimers = (waitingWorker: TWorker | null) => {
    for (const [worker, pending] of [...retryTimers.entries()]) {
      if (worker === waitingWorker) continue;
      clearRetryTimer(worker);
      markBackoffContextChanged(worker, pending.controller, "WAITING_WORKER_CHANGED_DURING_BACKOFF");
    }
  };

  const attemptIsCurrent = (attempt: Attempt): boolean =>
    !closed &&
    activeAttempt?.token === attempt.token &&
    attempt.epoch === epoch;

  const markDispatchedAttemptUnknown = (attempt: Attempt, reasonCode: string) => {
    if (!attemptIsCurrent(attempt)) return;
    const failure = Object.freeze({
      reasonCode,
      outcome: "commit_outcome_unknown" as const
    });
    const settled = settleControllerTakeoverFailure(stateFor(attempt.worker), failure);
    states.set(attempt.worker, settled.state);
    activeAttempt = null;
    closed = true;
    epoch += 1;
    clearAllRetryTimers();
    notify(Object.freeze({
      kind: "commit_outcome_unknown" as const,
      worker: attempt.worker,
      controller: attempt.controller,
      state: settled.state,
      failure,
      retryDelayMs: null
    }));
  };

  const dispatchedContextStillMatches = (attempt: Attempt): boolean =>
    options.getController() === attempt.controller &&
    options.getWaitingWorker() === attempt.worker;

  const scheduleRetry = (
    attempt: Attempt,
    failure: ControllerTakeoverFailure,
    state: ControllerTakeoverAttemptState,
    retryDelayMs: number
  ) => {
    // A Promise has one settlement, but this guard also makes the timer
    // invariant explicit against future callback refactors.
    if (retryTimers.has(attempt.worker)) return;
    let handle: TTimer;
    try {
      handle = options.clock.setTimeout(() => {
        const pending = retryTimers.get(attempt.worker);
        if (
          !pending ||
          pending.handle !== handle ||
          closed ||
          pending.epoch !== epoch
        ) return;
        retryTimers.delete(attempt.worker);
        if (
          options.getController() !== pending.controller ||
          options.getWaitingWorker() !== attempt.worker
        ) {
          markBackoffContextChanged(
            attempt.worker,
            pending.controller,
            "WAITING_OR_CONTROLLER_CHANGED_DURING_BACKOFF"
          );
          return;
        }
        states.set(
          attempt.worker,
          releaseControllerTakeoverBackoff(stateFor(attempt.worker))
        );
        promoteWaiting();
      }, retryDelayMs);
    } catch {
      const terminalFailure = Object.freeze({
        reasonCode: "RETRY_TIMER_SCHEDULE_FAILED",
        outcome: "known_not_committed" as const
      });
      const terminalState = Object.freeze({
        ...state,
        phase: "terminal" as const,
        lastReasonCode: terminalFailure.reasonCode
      });
      states.set(attempt.worker, terminalState);
      notify(Object.freeze({
        kind: "terminal" as const,
        worker: attempt.worker,
        controller: attempt.controller,
        state: terminalState,
        failure: terminalFailure,
        retryDelayMs: null
      }));
      return;
    }
    retryTimers.set(attempt.worker, Object.freeze({
      controller: attempt.controller,
      epoch: attempt.epoch,
      handle
    }));
    notify(Object.freeze({
      kind: "retry_scheduled" as const,
      worker: attempt.worker,
      controller: attempt.controller,
      state,
      failure,
      retryDelayMs
    }));
  };

  const settleSuccess = (attempt: Attempt) => {
    if (!attemptIsCurrent(attempt)) return;
    if (!dispatchedContextStillMatches(attempt)) {
      markDispatchedAttemptUnknown(attempt, "REQUEST_CONTEXT_CHANGED_AFTER_DISPATCH");
      return;
    }
    const state = completeControllerTakeoverAttempt(stateFor(attempt.worker));
    states.set(attempt.worker, state);
    activeAttempt = null;
    // An authenticated success means the active controller has already asked
    // this exact waiting generation to skip waiting. Until controllerchange,
    // the page must not dispatch a second commit to a replacement candidate.
    closed = true;
    epoch += 1;
    clearAllRetryTimers();
    notify(Object.freeze({
      kind: "succeeded" as const,
      worker: attempt.worker,
      controller: attempt.controller,
      state,
      failure: null,
      retryDelayMs: null
    }));
  };

  const settleFailure = (attempt: Attempt, reason: unknown) => {
    if (!attemptIsCurrent(attempt)) return;
    if (!dispatchedContextStillMatches(attempt)) {
      markDispatchedAttemptUnknown(attempt, "REQUEST_CONTEXT_CHANGED_AFTER_DISPATCH");
      return;
    }
    const failure = options.classifyFailure(reason);
    const settled = settleControllerTakeoverFailure(stateFor(attempt.worker), failure);
    states.set(attempt.worker, settled.state);
    activeAttempt = null;
    if (settled.disposition === "commit_outcome_unknown") {
      closed = true;
      epoch += 1;
      clearAllRetryTimers();
      notify(Object.freeze({
        kind: "commit_outcome_unknown" as const,
        worker: attempt.worker,
        controller: attempt.controller,
        state: settled.state,
        failure,
        retryDelayMs: null
      }));
      return;
    }
    if (settled.disposition === "retry" && settled.retryDelayMs !== null) {
      scheduleRetry(attempt, failure, settled.state, settled.retryDelayMs);
      return;
    }
    const kind = settled.disposition === "exhausted"
        ? "exhausted"
        : "terminal";
    notify(Object.freeze({
      kind,
      worker: attempt.worker,
      controller: attempt.controller,
      state: settled.state,
      failure,
      retryDelayMs: null
    }));
  };

  const promoteWaiting = () => {
    if (closed) return;
    const waitingWorker = options.getWaitingWorker();
    if (activeAttempt) {
      if (
        options.getController() !== activeAttempt.controller ||
        waitingWorker !== activeAttempt.worker
      ) {
        markDispatchedAttemptUnknown(activeAttempt, "REQUEST_CONTEXT_CHANGED_AFTER_DISPATCH");
      }
      return;
    }
    cancelStaleBackoffTimers(waitingWorker);
    if (!waitingWorker || !options.isWaitingWorkerReady(waitingWorker)) return;
    const controller = options.getController();
    if (!controller) return;
    const begun = beginControllerTakeoverAttempt(stateFor(waitingWorker));
    states.set(waitingWorker, begun.state);
    if (!begun.started) return;
    const attempt = Object.freeze({
      controller,
      epoch,
      token: Object.freeze({}),
      worker: waitingWorker
    });
    activeAttempt = attempt;
    notify(Object.freeze({
      kind: "attempt_started" as const,
      worker: waitingWorker,
      controller,
      state: begun.state,
      failure: null,
      retryDelayMs: null
    }));
    let request: Promise<void>;
    try {
      request = options.requestActivation(controller, waitingWorker);
    } catch (reason) {
      settleFailure(attempt, reason);
      return;
    }
    void Promise.resolve(request).then(
      () => settleSuccess(attempt),
      (reason: unknown) => settleFailure(attempt, reason)
    );
  };

  const close = (reasonCode = "CONTROLLER_TAKEOVER_SCHEDULER_CLOSED") => {
    if (closed) return;
    const attempt = activeAttempt;
    closed = true;
    epoch += 1;
    activeAttempt = null;
    clearAllRetryTimers();
    if (!attempt) return;
    const failure = Object.freeze({
      reasonCode,
      outcome: "commit_outcome_unknown" as const
    });
    const settled = settleControllerTakeoverFailure(stateFor(attempt.worker), failure);
    states.set(attempt.worker, settled.state);
    notify(Object.freeze({
      kind: "commit_outcome_unknown" as const,
      worker: attempt.worker,
      controller: attempt.controller,
      state: settled.state,
      failure,
      retryDelayMs: null
    }));
  };

  return Object.freeze({
    promoteWaiting,
    close,
    stateFor,
    pendingRetryCount: () => retryTimers.size,
    isClosed: () => closed
  });
}
