import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFirstControllerClaimHandoff,
  registerServiceWorkerAfterBootCommit,
  RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND,
  ReleaseControllerTakeoverFrozenError,
  ReleaseControllerTakeoverWriteLatch
} from "./release-controller-takeover-write-fence";
import { ReleaseDatabaseCoordinator, type ReleaseBootConfirmation } from "./release-database-coordinator";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../../release-protocol";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function handoffFixture() {
  vi.useFakeTimers();
  const claimedController = {};
  let controller: object | null = claimedController;
  const databaseDrain = deferred<void>();
  const preflight = deferred<void>();
  const reload = vi.fn();
  const onFailure = vi.fn();
  const verifyCommittedNavigationState = vi.fn(async (): Promise<void> => undefined);
  const handoff = createFirstControllerClaimHandoff({
    getController: () => controller,
    drainDatabaseWrites: () => databaseDrain.promise,
    waitForBootPreflight: () => preflight.promise,
    verifyCommittedNavigationState,
    assertNavigationAllowed: () => undefined,
    reload,
    onFailure
  });
  return { handoff, claimedController, databaseDrain, preflight, verifyCommittedNavigationState, reload, onFailure, setController: (next: object | null) => { controller = next; } };
}

describe("service worker registration after boot commit", () => {
  it("does not register while either document load or the normal commit is pending", async () => {
    const load = deferred<void>();
    const commit = deferred<void>();
    const registration = {};
    const register = vi.fn(async () => registration);
    const result = registerServiceWorkerAfterBootCommit({
      waitForDocumentLoad: () => load.promise,
      waitForBootCommit: () => commit.promise,
      assertRegistrationAllowed: () => undefined,
      register
    });
    expect(register).not.toHaveBeenCalled();
    load.resolve();
    await Promise.resolve();
    expect(register).not.toHaveBeenCalled();
    commit.resolve();
    await expect(result).resolves.toBe(registration);
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("does not register after a failed normal commit", async () => {
    const failure = new Error("boot commit failed");
    const register = vi.fn();
    await expect(registerServiceWorkerAfterBootCommit({
      waitForDocumentLoad: async () => undefined,
      waitForBootCommit: async () => { throw failure; },
      assertRegistrationAllowed: () => undefined,
      register
    })).rejects.toBe(failure);
    expect(register).not.toHaveBeenCalled();
  });

  it("rechecks the synchronous takeover latch after waiting and never registers a frozen page", async () => {
    const commit = deferred<void>();
    const latch = new ReleaseControllerTakeoverWriteLatch();
    const register = vi.fn();
    const result = registerServiceWorkerAfterBootCommit({
      waitForDocumentLoad: async () => undefined,
      waitForBootCommit: () => commit.promise,
      assertRegistrationAllowed: () => {
        if (latch.locked) throw new ReleaseControllerTakeoverFrozenError();
      },
      register
    });
    latch.latch("controller_changed");
    commit.resolve();
    await expect(result).rejects.toBeInstanceOf(ReleaseControllerTakeoverFrozenError);
    expect(register).not.toHaveBeenCalled();
    expect(latch.locked).toBe(true);
  });

  it("preserves the existing document-load-only registration for other descriptors", async () => {
    const load = deferred<void>();
    const register = vi.fn(async () => "registered");
    const result = registerServiceWorkerAfterBootCommit({
      waitForDocumentLoad: () => load.promise,
      assertRegistrationAllowed: () => undefined,
      register
    });
    expect(register).not.toHaveBeenCalled();
    load.resolve();
    await expect(result).resolves.toBe("registered");
    expect(register).toHaveBeenCalledTimes(1);
  });
});

describe("release controller takeover write latch", () => {
  it("exposes a frozen exact-shape facade backed by a one-way closure", () => {
    const latch = new ReleaseControllerTakeoverWriteLatch();

    expect(Object.keys(latch.facade).sort()).toEqual(["kind", "locked"]);
    expect(latch.facade.kind).toBe(RELEASE_CONTROLLER_TAKEOVER_WRITE_FENCE_KIND);
    expect(latch.facade.locked).toBe(false);
    expect(Object.isFrozen(latch.facade)).toBe(true);
    expect(Reflect.set(latch.facade, "locked", false)).toBe(false);

    expect(latch.latch("pre_activation_freeze")).toBe(true);
    expect(latch.facade.locked).toBe(true);
    expect(latch.reason).toBe("pre_activation_freeze");
    expect(Reflect.set(latch.facade, "locked", false)).toBe(false);
    expect(latch.facade.locked).toBe(true);
  });

  it("keeps the first boundary reason and cannot be reopened by a later controller event", () => {
    const latch = new ReleaseControllerTakeoverWriteLatch();

    expect(latch.latch("controller_changed")).toBe(true);
    expect(latch.latch("pre_activation_freeze")).toBe(false);
    expect(latch.locked).toBe(true);
    expect(latch.reason).toBe("controller_changed");
  });
});

describe("first controller claim handoff", () => {
  it("keeps an early peer claim without a normal local commit in recovery without reading or reloading", async () => {
    const fixture = handoffFixture();
    const coordinator = new ReleaseDatabaseCoordinator(BRIDGE_RELEASE_DATABASE_DESCRIPTOR, "early-peer-claim");
    // The real constructor starts a dynamic storage import. Settle it before
    // replacing the controller so it cannot outlive this test environment.
    await (coordinator as unknown as { controllerPromise: Promise<unknown> }).controllerPromise;
    const readCommittedGeneration = vi.fn();
    const readCommittedGenerationFromOpenConnection = vi.fn();
    (coordinator as unknown as { controllerPromise: Promise<unknown> }).controllerPromise = Promise.resolve({ readCommittedGeneration, readCommittedGenerationFromOpenConnection });
    fixture.verifyCommittedNavigationState.mockImplementation(() => coordinator.verifyFirstControllerClaimNavigationState());
    fixture.handoff.schedule(fixture.claimedController, coordinator.freezeForControllerTakeover());
    const commit = vi.fn(() => coordinator.commitForBoot());
    const boot = fixture.handoff.runBootCommit(commit);
    const ready = vi.fn();
    void boot.then(ready, () => undefined);
    fixture.databaseDrain.resolve();
    fixture.preflight.resolve();
    await vi.advanceTimersByTimeAsync(0);
    await expect(boot).rejects.toThrow("尚未完成");
    expect(readCommittedGeneration).not.toHaveBeenCalled();
    expect(readCommittedGenerationFromOpenConnection).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(fixture.reload).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    expect(fixture.onFailure).toHaveBeenCalledTimes(1);
    await expect(coordinator.commitForBoot()).rejects.toBeInstanceOf(ReleaseControllerTakeoverFrozenError);
  });

  it("waits for the persisted commit verification before navigating", async () => {
    const fixture = handoffFixture();
    const verification = deferred<void>();
    fixture.verifyCommittedNavigationState.mockImplementation(() => verification.promise);
    fixture.handoff.schedule(fixture.claimedController, Promise.resolve());
    fixture.databaseDrain.resolve();
    fixture.preflight.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.verifyCommittedNavigationState).toHaveBeenCalledTimes(1);
    expect(fixture.reload).not.toHaveBeenCalled();
    verification.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.reload).toHaveBeenCalledTimes(1);
  });

  it.each(["failed_receipt", "controller_changed_during_read", "cancelled_during_read"] as const)(
    "does not navigate after %s", async (failure) => {
      const fixture = handoffFixture();
      const verification = deferred<void>();
      fixture.verifyCommittedNavigationState.mockImplementation(() => verification.promise);
      fixture.handoff.schedule(fixture.claimedController, Promise.resolve());
      const boot = fixture.handoff.runBootCommit(vi.fn());
      void boot.catch(() => undefined);
      fixture.databaseDrain.resolve();
      fixture.preflight.resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(fixture.verifyCommittedNavigationState).toHaveBeenCalledTimes(1);
      if (failure === "failed_receipt") verification.reject(new Error("committed receipt missing"));
      else {
        if (failure === "controller_changed_during_read") fixture.setController({});
        else fixture.handoff.cancel(new Error("takeover freeze changed"));
        verification.resolve();
      }
      await vi.advanceTimersByTimeAsync(0);
      await expect(boot).rejects.toBeInstanceOf(Error);
      expect(fixture.reload).not.toHaveBeenCalled();
      expect(fixture.onFailure).toHaveBeenCalledTimes(1);
    }
  );

  it("drains both writers and preflight before one navigation; the old boot never resolves ready", async () => {
    const fixture = handoffFixture();
    const coordinatorDrain = deferred<void>();
    const latch = new ReleaseControllerTakeoverWriteLatch();
    latch.latch("controller_changed");
    fixture.handoff.schedule(fixture.claimedController, coordinatorDrain.promise);
    const commit = vi.fn(async () => "ready");
    const boot = fixture.handoff.runBootCommit(commit);
    const ready = vi.fn();
    void boot.then(ready, () => undefined);

    coordinatorDrain.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.reload).not.toHaveBeenCalled();
    fixture.databaseDrain.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.reload).not.toHaveBeenCalled();
    fixture.preflight.resolve();
    await vi.advanceTimersByTimeAsync(0);
    fixture.handoff.schedule(fixture.claimedController, Promise.resolve());
    expect(fixture.reload).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    expect(latch.locked).toBe(true);
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(boot).rejects.toThrow("15 秒");
    expect(fixture.onFailure).toHaveBeenCalledTimes(1);
    expect(fixture.reload).toHaveBeenCalledTimes(1);
    expect(latch.locked).toBe(true);
  });

  it("a real coordinator drains an admitted commit before its typed frozen exit waits for navigation", async () => {
    const fixture = handoffFixture();
    const admitted = deferred<void>();
    const coordinator = new ReleaseDatabaseCoordinator(BRIDGE_RELEASE_DATABASE_DESCRIPTOR, "first-claim-fixture");
    await (coordinator as unknown as { controllerPromise: Promise<unknown> }).controllerPromise;
    const testable = coordinator as unknown as {
      commitForBootUntilSettled: () => Promise<ReleaseBootConfirmation>;
      ensureFailureFinalized: (reason: unknown) => Promise<void>;
      assertControllerTakeoverCommitOpen: () => void;
    };
    vi.spyOn(testable, "commitForBootUntilSettled").mockImplementation(async () => {
      await admitted.promise;
      testable.assertControllerTakeoverCommitOpen();
      throw new Error("fixture commit must be frozen");
    });
    vi.spyOn(testable, "ensureFailureFinalized").mockResolvedValue(undefined);
    const boot = fixture.handoff.runBootCommit(() => coordinator.commitForBoot());
    const ready = vi.fn();
    void boot.then(ready, () => undefined);
    const drained = coordinator.freezeForControllerTakeover();
    fixture.handoff.schedule(fixture.claimedController, drained);
    fixture.databaseDrain.resolve();
    fixture.preflight.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.reload).not.toHaveBeenCalled();
    admitted.resolve();
    await drained;
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.reload).toHaveBeenCalledTimes(1);
    expect(fixture.onFailure).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    await expect(coordinator.commitForBoot()).rejects.toBeInstanceOf(ReleaseControllerTakeoverFrozenError);
  });

  it.each([
    new Error("unrelated commit failure"),
    Object.assign(new Error("Service Worker 接管已冻结当前页面的发布控制写入。"), { name: "ReleaseControllerTakeoverFrozenError" }),
    new AggregateError([new ReleaseControllerTakeoverFrozenError(), new Error("finalization failed")])
  ])("does not hide an unknown in-flight commit rejection behind an allSettled drain: %s", async (reason) => {
    const fixture = handoffFixture();
    const rawCommit = deferred<string>();
    const boot = fixture.handoff.runBootCommit(() => rawCommit.promise);
    void boot.catch(() => undefined);
    fixture.handoff.schedule(fixture.claimedController, rawCommit.promise.then(() => undefined, () => undefined));
    fixture.databaseDrain.resolve();
    fixture.preflight.resolve();
    rawCommit.reject(reason);
    await expect(boot).rejects.toBe(reason);
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.reload).not.toHaveBeenCalled();
    expect(fixture.onFailure).toHaveBeenCalledWith(reason);
  });

  it("an already admitted successful commit still cannot mark the frozen old page ready", async () => {
    const fixture = handoffFixture();
    const rawCommit = deferred<string>();
    const boot = fixture.handoff.runBootCommit(() => rawCommit.promise);
    const ready = vi.fn();
    void boot.then(ready, () => undefined);
    fixture.handoff.schedule(fixture.claimedController, rawCommit.promise.then(() => undefined));
    fixture.databaseDrain.resolve();
    fixture.preflight.resolve();
    rawCommit.resolve("ready");
    await vi.advanceTimersByTimeAsync(0);
    expect(fixture.reload).toHaveBeenCalledTimes(1);
    expect(ready).not.toHaveBeenCalled();
  });

  it.each(["changed_controller", "failed_preflight", "repeated_controller_event"] as const)(
    "keeps the old document closed without navigation after %s", async (failure) => {
      const fixture = handoffFixture();
      fixture.handoff.schedule(fixture.claimedController, Promise.resolve());
      const boot = fixture.handoff.runBootCommit(vi.fn());
      void boot.catch(() => undefined);
      fixture.databaseDrain.resolve();
      if (failure === "changed_controller") fixture.setController({});
      if (failure === "failed_preflight") fixture.preflight.reject(new Error("preflight failed"));
      else fixture.preflight.resolve();
      if (failure === "repeated_controller_event") fixture.handoff.cancel(new Error("controller changed again"));
      await vi.advanceTimersByTimeAsync(0);
      await expect(boot).rejects.toBeInstanceOf(Error);
      expect(fixture.reload).not.toHaveBeenCalled();
      expect(fixture.onFailure).toHaveBeenCalledTimes(1);
    }
  );
});
