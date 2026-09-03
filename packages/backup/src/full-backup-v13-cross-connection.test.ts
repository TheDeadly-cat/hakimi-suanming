import { afterEach, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { SCHEMA_VERSION, type BirthInput, type CalculatedChart } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase } from "@hakimi/storage";
import {
  FullBackupError,
  applyVerifiedFullBackup,
  createFullBackup,
  prepareFullBackupImport,
  verifyPreparedFullBackup,
  type VerifiedFullBackupReplacement
} from "./index";

const databases: ResearchDatabase[] = [];
const backupOptions = {
  appVersion: "0.1.0-v13-cross-connection",
  exportedAt: "2026-08-27T00:00:00.000Z"
} as const;
const input: BirthInput = {
  schemaVersion: SCHEMA_VERSION,
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

let chartPromise: Promise<CalculatedChart> | undefined;

function chart(): Promise<CalculatedChart> {
  chartPromise ??= calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  return chartPromise;
}

function repository(name = `hakimi-full-backup-v13-${crypto.randomUUID()}`): {
  database: ResearchDatabase;
  cases: CaseRepository;
} {
  const database = new ResearchDatabase(name, { targetSchema: 13 });
  databases.push(database);
  return { database, cases: new CaseRepository(database) };
}

async function seedCase(cases: CaseRepository, alias: string): Promise<void> {
  await cases.createCase({
    alias,
    calculated: await chart(),
    duplicateGuard: "allow"
  });
}

async function expectExactV13PhysicalBoundary(database: ResearchDatabase): Promise<void> {
  await database.open();
  const storeNames = database.tables.map((table) => table.name).sort();

  expect(database.targetSchemaVersion).toBe(13);
  expect(storeNames).not.toContain("mutationState");
  expect(storeNames).not.toContain("revisionCalculationReceipts");
  await expect(database.readMutationState()).rejects.toMatchObject({
    code: "SCHEMA_UNSUPPORTED"
  });
}

type InvalidVerifiedReplacement = Readonly<{
  value: unknown;
  assertSideEffects?: () => void;
}>;

const invalidVerifiedReplacementCases: ReadonlyArray<Readonly<{
  name: string;
  create: (verified: VerifiedFullBackupReplacement) => InvalidVerifiedReplacement;
}>> = [
  {
    name: "missing current-payload digest",
    create(verified) {
      const value = structuredClone(verified) as Partial<VerifiedFullBackupReplacement>;
      delete value.expectedCurrentPayloadDigest;
      return { value };
    }
  },
  {
    name: "explicit undefined current-payload digest",
    create(verified) {
      return {
        value: {
          ...structuredClone(verified),
          expectedCurrentPayloadDigest: undefined
        }
      };
    }
  },
  {
    name: "accessor-backed current-payload digest",
    create(verified) {
      let getterCalls = 0;
      const value = Object.defineProperty({ incoming: verified.incoming }, "expectedCurrentPayloadDigest", {
        configurable: true,
        enumerable: true,
        get() {
          getterCalls += 1;
          return verified.expectedCurrentPayloadDigest;
        }
      });
      return {
        value,
        assertSideEffects: () => expect(getterCalls).toBe(0)
      };
    }
  },
  {
    name: "extra root key",
    create(verified) {
      return { value: { ...structuredClone(verified), unexpected: true } };
    }
  },
  {
    name: "custom root prototype",
    create(verified) {
      return {
        value: Object.assign(Object.create({ inherited: true }), structuredClone(verified))
      };
    }
  },
  {
    name: "uppercase current-payload digest",
    create(verified) {
      return {
        value: {
          ...structuredClone(verified),
          expectedCurrentPayloadDigest: verified.expectedCurrentPayloadDigest.toUpperCase()
        }
      };
    }
  }
];

afterEach(async () => {
  const current = databases.splice(0);
  const deletionTargets = [...new Map(current.map((database) => [database.name, database])).values()];
  current.forEach((database) => database.close());
  await Promise.all(deletionTargets.map((database) => database.delete()));
});

describe("full backup exact-v13 cross-connection boundary", () => {
  it("rejects a stale restore after a second repository connection commits and preserves that write", async () => {
    const source = repository();
    await seedCase(source.cases, "incoming-v13");
    const incoming = await createFullBackup(source.cases, backupOptions);

    const databaseName = `hakimi-full-backup-v13-shared-${crypto.randomUUID()}`;
    const first = repository(databaseName);
    await seedCase(first.cases, "current-v13");
    const preparation = await prepareFullBackupImport(first.cases, incoming, backupOptions);
    const verified = await verifyPreparedFullBackup(preparation);

    const second = repository(databaseName);
    await seedCase(second.cases, "concurrent-v13");
    const postConcurrentWrite = await second.cases.readFullDataSnapshot();

    const failure = await applyVerifiedFullBackup(first.cases, verified).then(
      () => null,
      (cause: unknown) => cause
    );
    expect(failure).toBeInstanceOf(FullBackupError);
    expect(failure).toMatchObject({ code: "CURRENT_DATA_CHANGED" });

    first.database.close();
    second.database.close();
    const reopened = repository(databaseName);
    const reopenedSnapshot = await reopened.cases.readFullDataSnapshot();
    const reopenedAliases = reopenedSnapshot.cases.map((record) => record.alias).sort();

    expect(reopenedSnapshot).toEqual(postConcurrentWrite);
    expect(reopenedAliases).toEqual(["concurrent-v13", "current-v13"]);
    expect(reopenedAliases).not.toContain("incoming-v13");
    await expectExactV13PhysicalBoundary(reopened.database);
  });

  it.each(invalidVerifiedReplacementCases)(
    "rejects $name before a stale exact-v13 restore can reach the repository",
    async ({ create }) => {
      const source = repository();
      await seedCase(source.cases, "incoming-invalid-envelope-v13");
      const incoming = await createFullBackup(source.cases, backupOptions);

      const databaseName = `hakimi-full-backup-v13-invalid-${crypto.randomUUID()}`;
      const first = repository(databaseName);
      await seedCase(first.cases, "current-invalid-envelope-v13");
      const preparation = await prepareFullBackupImport(first.cases, incoming, backupOptions);
      const verified = await verifyPreparedFullBackup(preparation);

      const second = repository(databaseName);
      await seedCase(second.cases, "concurrent-invalid-envelope-v13");
      const postConcurrentWrite = await second.cases.readFullDataSnapshot();
      const malformed = create(verified);

      await expect(applyVerifiedFullBackup(first.cases, malformed.value as never)).rejects.toMatchObject({
        code: "VERIFIED_REPLACEMENT_INVALID"
      });
      malformed.assertSideEffects?.();

      first.database.close();
      second.database.close();
      const reopened = repository(databaseName);
      const reopenedSnapshot = await reopened.cases.readFullDataSnapshot();
      expect(reopenedSnapshot).toEqual(postConcurrentWrite);
      expect(reopenedSnapshot.cases.map((record) => record.alias).sort()).toEqual([
        "concurrent-invalid-envelope-v13",
        "current-invalid-envelope-v13"
      ]);
      expect(reopenedSnapshot.cases.map((record) => record.alias)).not.toContain(
        "incoming-invalid-envelope-v13"
      );
      await expectExactV13PhysicalBoundary(reopened.database);
    }
  );

  it("applies the same verified restore when no competing repository write occurs", async () => {
    const source = repository();
    await seedCase(source.cases, "incoming-v13-control");
    const incoming = await createFullBackup(source.cases, backupOptions);

    const databaseName = `hakimi-full-backup-v13-control-${crypto.randomUUID()}`;
    const destination = repository(databaseName);
    await seedCase(destination.cases, "current-v13-control");
    const preparation = await prepareFullBackupImport(destination.cases, incoming, backupOptions);
    const verified = await verifyPreparedFullBackup(preparation);

    const applied = await applyVerifiedFullBackup(destination.cases, verified);
    expect(applied.payload).toEqual(incoming.payload);

    destination.database.close();
    const reopened = repository(databaseName);
    const reopenedSnapshot = await reopened.cases.readFullDataSnapshot();
    const reopenedAliases = reopenedSnapshot.cases.map((record) => record.alias);

    expect(reopenedSnapshot).toEqual(incoming.payload);
    expect(reopenedAliases).toEqual(["incoming-v13-control"]);
    expect(reopenedAliases).not.toContain("current-v13-control");
    await expectExactV13PhysicalBoundary(reopened.database);
  });
});
