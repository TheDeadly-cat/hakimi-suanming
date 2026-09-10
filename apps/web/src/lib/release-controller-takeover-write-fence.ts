export const RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND =
  "release_controller_takeover_write_fence_v1" as const;

export type ReleaseControllerTakeoverWriteFenceFacade = Readonly<{
  kind: typeof RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND;
  locked: boolean;
}>;

export type ReleaseControllerTakeoverWriteFenceReason =
  | "controller_changed"
  | "pre_activation_freeze";

export class ReleaseControllerTakeoverFrozenError extends Error {
  constructor() {
    super("Service Worker 接管已冻结当前页面的发布控制写入。");
    this.name = "ReleaseControllerTakeoverFrozenError";
  }
}

/**
 * Page-generation latch. There is intentionally no unlock operation: once an
 * old document participates in, or observes, a controller takeover, only a
 * complete navigation may create a fresh writable page generation.
 */
export class ReleaseControllerTakeoverWriteLatch {
  readonly facade: ReleaseControllerTakeoverWriteFenceFacade;
  #locked = false;
  #reason: ReleaseControllerTakeoverWriteFenceReason | null = null;

  constructor() {
    const owner = this;
    this.facade = Object.freeze({
      kind: RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND,
      get locked() {
        return owner.#locked;
      }
    });
  }

  latch(reason: ReleaseControllerTakeoverWriteFenceReason): boolean {
    const changed = !this.#locked;
    this.#locked = true;
    this.#reason ??= reason;
    return changed;
  }

  get locked(): boolean {
    return this.#locked;
  }

  get reason(): ReleaseControllerTakeoverWriteFenceReason | null {
    return this.#reason;
  }
}

/** The listener is installed synchronously; registration alone waits on these gates. */
export async function registerServiceWorkerAfterBootCommit<TRegistration>(dependencies: {
  waitForDocumentLoad: () => Promise<void>;
  waitForBootCommit?: () => Promise<void>;
  assertRegistrationAllowed: () => void;
  register: () => Promise<TRegistration>;
}): Promise<TRegistration> {
  await dependencies.waitForDocumentLoad();
  if (dependencies.waitForBootCommit) await dependencies.waitForBootCommit();
  dependencies.assertRegistrationAllowed();
  return await dependencies.register();
}

/** First-claim navigation never resolves the frozen old document as ready. */
export function createFirstControllerClaimHandoff<TController extends object>(dependencies: {
  getController: () => TController | null;
  drainDatabaseWrites: () => Promise<void>;
  waitForBootPreflight: () => Promise<void>;
  verifyCommittedNavigationState: () => Promise<void>;
  assertNavigationAllowed: () => void;
  reload: () => void;
  onFailure: (reason: unknown) => void;
}) {
  let started = false;
  let failed = false;
  let failure: unknown;
  let handoff: Promise<never> | null = null;
  let rejectHandoff: ((reason: unknown) => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let commitOutcome: Promise<void> | null = null;

  const cancel = (reason: unknown) => {
    if (failed) return;
    failed = true;
    failure = reason;
    if (timer !== undefined) clearTimeout(timer);
    rejectHandoff?.(reason);
    if (started) {
      try { dependencies.onFailure(reason); } catch { /* Notification cannot reopen the old page. */ }
    }
  };

  return {
    get started() { return started; },
    cancel,
    schedule(controller: TController, coordinatorDrained: Promise<void>): void {
      if (started) return;
      started = true;
      handoff = new Promise<never>((_resolve, reject) => { rejectHandoff = reject; });
      // Boot may still be in its preflight phase when the handoff fails.
      void handoff.catch(() => undefined);
      if (failed) {
        rejectHandoff?.(failure);
        return;
      }
      timer = setTimeout(() => cancel(new Error("首次 Service Worker 接管未能在 15 秒内完成整页导航；旧页保持写入锁定。")), 15_000);
      void (async () => {
        await coordinatorDrained;
        await dependencies.drainDatabaseWrites();
        await dependencies.waitForBootPreflight();
        // Drain uses allSettled. Wait for the main caller to classify the raw
        // commit outcome as well, so an unrelated rejection cannot be hidden.
        if (commitOutcome) await commitOutcome;
        if (failed) return;
        // An existing but empty control database is invalid to the worker. A
        // frozen page must never navigate until a normal completed commit is
        // independently re-read and verified without initializing that pointer.
        await dependencies.verifyCommittedNavigationState();
        if (failed) return;
        if (dependencies.getController() !== controller) {
          throw new Error("首次 Service Worker 接管排空期间控制器已变化；旧页保持写入锁定。");
        }
        dependencies.assertNavigationAllowed();
        // No await between the final identity check and this single navigation.
        dependencies.reload();
      })().catch(cancel);
    },
    async runBootCommit<T>(commit: () => Promise<T>): Promise<T> {
      if (handoff) return await handoff;
      let settleOutcome!: () => void;
      commitOutcome = new Promise<void>((resolve) => { settleOutcome = resolve; });
      let result: T;
      try {
        result = await commit();
      } catch (reason) {
        const expectedFrozenExit = handoff !== null
          && reason instanceof ReleaseControllerTakeoverFrozenError;
        if (!expectedFrozenExit) cancel(reason);
        settleOutcome();
        if (expectedFrozenExit && handoff) return await handoff;
        throw reason;
      }
      settleOutcome();
      if (handoff) return await handoff;
      return result;
    }
  };
}
