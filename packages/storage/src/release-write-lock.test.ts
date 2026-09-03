import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import {
  CaseRepository,
  ReleaseDatabaseWriteLockedError,
  ResearchDatabase,
  type ReleaseControllerTakeoverWriteFence
} from "./index";

const databaseNames: string[] = [];

afterEach(async () => {
  for (const name of databaseNames.splice(0)) await Dexie.delete(name);
});

describe("release-generation database write lock", () => {
  it("observes a late controller-takeover fence through the installed runtime identity", async () => {
    const name = `release-controller-takeover-runtime-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const previousRuntime = globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__;
    let fenceLocked = false;
    const fence: ReleaseControllerTakeoverWriteFence = Object.freeze({
      kind: "release_controller_takeover_write_fence_v1",
      get locked() { return fenceLocked; }
    });
    globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = {
      databaseName: name,
      targetSchema: 13,
      releaseWritesLocked: false,
      controllerTakeoverWriteFence: fence
    };
    try {
      const database = new ResearchDatabase();
      await database.open();
      await database.table("appSettings").put({ id: "before-takeover" });

      globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = {
        databaseName: name,
        targetSchema: 13,
        releaseWritesLocked: false
      };
      fenceLocked = true;
      expect(database.areReleaseWritesLocked()).toBe(true);
      await expect(database.table("appSettings").put({ id: "stale-page-write" }))
        .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);

      // Migration recovery may release its own gate, but it cannot release a
      // controller takeover boundary owned by the page lifecycle.
      database.unlockReleaseWrites();
      expect(database.areReleaseWritesLocked()).toBe(true);
      await expect(database.table("appSettings").put({ id: "unlock-bypass" }))
        .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
      expect(await database.table("appSettings").toArray()).toEqual([{ id: "before-takeover" }]);
      database.close();
    } finally {
      globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = previousRuntime;
    }
  });

  it("does not let privileged materialization bypass takeover or bump the mutation epoch", async () => {
    const name = `release-controller-takeover-privileged-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const fence: ReleaseControllerTakeoverWriteFence = Object.freeze({
      kind: "release_controller_takeover_write_fence_v1",
      locked: true
    });
    const database = new ResearchDatabase(name, {
      targetSchema: 16,
      releaseWritesLocked: true,
      controllerTakeoverWriteFence: fence
    });
    await database.open();

    await expect(database.withReleaseMigrationWriteAccess(() =>
      database.table("appSettings").put({ id: "privileged-bypass" })
    )).rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);

    await expect(database.readMutationState()).resolves.toBeNull();
    expect(await database.table("appSettings").get("privileged-bypass")).toBeUndefined();
    database.close();
  });

  it("ORs an explicit open fence with the locked Web runtime fence", async () => {
    const name = `release-controller-takeover-runtime-or-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const previousRuntime = globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__;
    const runtimeFence: ReleaseControllerTakeoverWriteFence = Object.freeze({
      kind: "release_controller_takeover_write_fence_v1",
      locked: true
    });
    const explicitFence: ReleaseControllerTakeoverWriteFence = Object.freeze({
      kind: "release_controller_takeover_write_fence_v1",
      locked: false
    });
    globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = {
      databaseName: name,
      targetSchema: 13,
      releaseWritesLocked: false,
      controllerTakeoverWriteFence: runtimeFence
    };
    try {
      const database = new ResearchDatabase(undefined, {
        controllerTakeoverWriteFence: explicitFence
      });
      await database.open();
      await expect(database.table("appSettings").put({ id: "explicit-open-bypass" }))
        .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
      database.close();
    } finally {
      globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = previousRuntime;
    }
  });

  it("drains earlier writes and treats a corrupted fence getter as locked", async () => {
    const name = `release-controller-takeover-drain-${crypto.randomUUID()}`;
    databaseNames.push(name);
    let fenceLocked = false;
    let fenceCorrupt = false;
    const fence: ReleaseControllerTakeoverWriteFence = Object.freeze({
      kind: "release_controller_takeover_write_fence_v1",
      get locked() {
        if (fenceCorrupt) throw new Error("synthetic corrupted fence");
        return fenceLocked;
      }
    });
    const database = new ResearchDatabase(name, {
      targetSchema: 13,
      controllerTakeoverWriteFence: fence
    });
    await database.open();

    let releaseEarlierWrite!: () => void;
    let signalEarlierWriteStarted!: () => void;
    const earlierWriteCanFinish = new Promise<void>((resolve) => {
      releaseEarlierWrite = resolve;
    });
    const earlierWriteStarted = new Promise<void>((resolve) => {
      signalEarlierWriteStarted = resolve;
    });
    const appSettings = database.table("appSettings");
    const earlierWrite = database.transaction("rw", appSettings, async () => {
      await appSettings.put({ id: "before-fence" });
      signalEarlierWriteStarted();
      await Dexie.waitFor(earlierWriteCanFinish);
    });
    await earlierWriteStarted;

    fenceLocked = true;
    let drainFinished = false;
    const drain = database.drainControllerTakeoverWrites().then(() => {
      drainFinished = true;
    });
    await Promise.resolve();
    expect(drainFinished).toBe(false);
    releaseEarlierWrite();
    await earlierWrite;
    await drain;

    fenceCorrupt = true;
    expect(database.areReleaseWritesLocked()).toBe(true);
    await expect(Dexie.ignoreTransaction(() =>
      appSettings.put({ id: "corrupt-fence-write" })
    ))
      .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    expect(await Dexie.ignoreTransaction(() =>
      appSettings.get("corrupt-fence-write")
    )).toBeUndefined();
    database.close();
  });

  it("drains across two database connections and aborts a transaction that mutates again after the fence", async () => {
    const name = `release-controller-takeover-two-connection-${crypto.randomUUID()}`;
    databaseNames.push(name);
    let fenceLocked = false;
    const fence: ReleaseControllerTakeoverWriteFence = Object.freeze({
      kind: "release_controller_takeover_write_fence_v1",
      get locked() { return fenceLocked; }
    });
    const writer = new ResearchDatabase(name, {
      targetSchema: 13,
      controllerTakeoverWriteFence: fence
    });
    const drainer = new ResearchDatabase(name, {
      targetSchema: 13,
      controllerTakeoverWriteFence: fence
    });
    await writer.open();
    await drainer.open();

    let continueTransaction!: () => void;
    let signalFirstMutation!: () => void;
    const mayContinue = new Promise<void>((resolve) => {
      continueTransaction = resolve;
    });
    const firstMutationFinished = new Promise<void>((resolve) => {
      signalFirstMutation = resolve;
    });
    const writerSettings = writer.table("appSettings");
    const transaction = writer.transaction("rw", writerSettings, async () => {
      await writerSettings.put({ id: "partial-before-fence" });
      signalFirstMutation();
      await Dexie.waitFor(mayContinue);
      await writerSettings.put({ id: "late-after-fence" });
    });
    await firstMutationFinished;

    fenceLocked = true;
    let drainFinished = false;
    const drain = drainer.drainControllerTakeoverWrites().then(() => {
      drainFinished = true;
    });
    await Promise.resolve();
    expect(drainFinished).toBe(false);
    continueTransaction();

    await expect(transaction).rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    await drain;
    expect(drainFinished).toBe(true);
    expect(await drainer.table("appSettings").toArray()).toEqual([]);
    await expect(writerSettings.put({ id: "post-drain-writer" }))
      .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    await expect(drainer.table("appSettings").put({ id: "post-drain-drainer" }))
      .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);

    writer.close();
    drainer.close();
  });

  it("keeps ordinary writes closed until the release is acknowledged", async () => {
    const name = `release-write-lock-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const database = new ResearchDatabase(name, { releaseWritesLocked: true });
    await database.open();

    expect(database.areReleaseWritesLocked()).toBe(true);
    await expect(database.table("appSettings").put({ id: "settings", marker: "ordinary" }))
      .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);

    await database.withReleaseMigrationWriteAccess(() =>
      database.table("appSettings").put({ id: "settings", marker: "materialized" })
    );
    expect(await database.table("appSettings").get("settings")).toEqual({
      id: "settings",
      marker: "materialized"
    });

    database.unlockReleaseWrites();
    await database.table("appSettings").put({ id: "settings", marker: "confirmed" });
    expect(await database.table("appSettings").get("settings")).toEqual({
      id: "settings",
      marker: "confirmed"
    });

    database.close();
  });

  it("always restores the lock after privileged materialization fails", async () => {
    const name = `release-write-lock-failure-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const database = new ResearchDatabase(name, {
      targetSchema: 16,
      releaseWritesLocked: true
    });
    await database.open();

    await expect(database.withReleaseMigrationWriteAccess(async () => {
      await database.table("appSettings").put({ id: "rolled-back" });
      throw new Error("synthetic materialization failure");
    })).rejects.toThrow("synthetic materialization failure");

    expect(await database.table("appSettings").get("rolled-back")).toBeUndefined();
    await expect(database.readMutationState()).resolves.toBeNull();
    await expect(database.table("appSettings").put({ id: "settings" }))
      .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    database.close();
  });

  it("does not leak migration write access to an unrelated concurrent write on the same instance", async () => {
    const name = `release-write-lock-concurrent-${crypto.randomUUID()}`;
    databaseNames.push(name);
    const database = new ResearchDatabase(name, { releaseWritesLocked: true });
    await database.open();
    let signalPrivilegedOperationStarted!: () => void;
    const privilegedOperationStarted = new Promise<void>((resolve) => {
      signalPrivilegedOperationStarted = resolve;
    });

    const privilegedWrite = database.withReleaseMigrationWriteAccess(async () => {
      signalPrivilegedOperationStarted();
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      await database.table("appSettings").put({ id: "privileged" });
    });
    await privilegedOperationStarted;

    await expect(Dexie.ignoreTransaction(() =>
      database.table("appSettings").put({ id: "unrelated" })
    ))
      .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    await privilegedWrite;

    expect(await database.table("appSettings").toArray()).toEqual([{ id: "privileged" }]);
    database.close();
  });

  it("keeps repository materialization privileged across asynchronous validation", async () => {
    const sourceName = `release-write-lock-source-${crypto.randomUUID()}`;
    const targetName = `release-write-lock-target-${crypto.randomUUID()}`;
    databaseNames.push(sourceName, targetName);
    const source = new ResearchDatabase(sourceName, { targetSchema: 16 });
    const target = new ResearchDatabase(targetName, {
      targetSchema: 16,
      releaseWritesLocked: true
    });
    const sourceRepository = new CaseRepository(source);
    const targetRepository = new CaseRepository(target);
    await sourceRepository.saveAppSettings({
      defaultTimeZone: "Asia/Shanghai",
      defaultCalendarType: "gregorian",
      preferredDensity: "compact"
    });
    const snapshot = await sourceRepository.readFullDataSnapshot();

    await target.withReleaseMigrationWriteAccess(() =>
      targetRepository.replaceFullDataSnapshot(snapshot)
    );

    expect(await targetRepository.readAppSettings()).toEqual(snapshot.appSettings[0]);
    source.close();
    target.close();
  });
});
