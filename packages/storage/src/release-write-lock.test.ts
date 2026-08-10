import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import {
  CaseRepository,
  ReleaseDatabaseWriteLockedError,
  ResearchDatabase
} from "./index";

const databaseNames: string[] = [];

afterEach(async () => {
  for (const name of databaseNames.splice(0)) await Dexie.delete(name);
});

describe("release-generation database write lock", () => {
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
