import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie, { type Transaction } from "dexie";
import {
  createDefaultResearchQuery,
  executeResearchQuery,
  ResearchQueryExecutionError
} from "@hakimi/research-query";
import { CaseRepository, ResearchDatabase } from "./index";

const databases: ResearchDatabase[] = [];

function createRepository(targetSchema: 13 | 15): CaseRepository {
  const database = new ResearchDatabase(
    `hakimi-research-query-snapshot-${crypto.randomUUID()}`,
    { targetSchema }
  );
  databases.push(database);
  return new CaseRepository(database);
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

afterEach(async () => {
  vi.restoreAllMocks();
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("CaseRepository.readResearchQuerySnapshot", () => {
  it("reads only the seven schema-15 stores in one readonly transaction and never reads attachments", async () => {
    const repository = createRepository(15);
    const { database } = repository;
    await database.open();

    const storeNames = [
      "cases",
      "revisions",
      "candidateSets",
      "researchNotes",
      "events",
      "knowledgeDocuments",
      "revisionCalculationReceipts"
    ] as const;
    const stores = [
      database.cases,
      database.revisions,
      database.candidateSets,
      database.researchNotes,
      database.events,
      database.knowledgeDocuments,
      database.revisionCalculationReceipts
    ] as const;
    const observedTransactions: unknown[] = [];
    for (const table of stores) {
      const originalToArray = table.toArray.bind(table);
      vi.spyOn(table, "toArray").mockImplementation(() => {
        observedTransactions.push(Dexie.currentTransaction);
        return originalToArray();
      });
    }
    const attachmentRead = vi.spyOn(database.attachments, "toArray")
      .mockRejectedValue(new Error("attachments must not be read"));
    const transactionSpy = vi.spyOn(database, "transaction");

    const snapshot = await repository.readResearchQuerySnapshot();

    expect(Object.keys(snapshot)).toEqual([
      "cases",
      "revisions",
      "candidateSets",
      "researchNotes",
      "events",
      "knowledgeDocuments",
      "revisionCalculationReceiptLedgerStatus",
      "revisionCalculationReceipts"
    ]);
    expect(snapshot).toEqual({
      cases: [],
      revisions: [],
      candidateSets: [],
      researchNotes: [],
      events: [],
      knowledgeDocuments: [],
      revisionCalculationReceiptLedgerStatus: "available",
      revisionCalculationReceipts: []
    });
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    const transactionCall = transactionSpy.mock.calls[0] as unknown[];
    expect(transactionCall[0]).toBe("r");
    expect((transactionCall[1] as Array<{ name: string }>).map((table) => table.name)).toEqual(storeNames);
    expect(observedTransactions).toHaveLength(storeNames.length);
    expect(observedTransactions[0]).not.toBeNull();
    expect(new Set(observedTransactions).size).toBe(1);
    expect(attachmentRead).not.toHaveBeenCalled();
  });

  it("keeps targetSchema 13 explicitly unavailable without registering or opening the receipt store", async () => {
    const repository = createRepository(13);
    const { database } = repository;
    await database.open();
    expect(database.tables.map((table) => table.name)).not.toContain("revisionCalculationReceipts");
    const attachmentRead = vi.spyOn(database.attachments, "toArray")
      .mockRejectedValue(new Error("attachments must not be read"));
    const transactionSpy = vi.spyOn(database, "transaction");

    const snapshot = await repository.readResearchQuerySnapshot();

    expect(snapshot.revisionCalculationReceiptLedgerStatus).toBe("schema_unavailable");
    expect(snapshot.revisionCalculationReceipts).toEqual([]);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    const transactionCall = transactionSpy.mock.calls[0] as unknown[];
    expect((transactionCall[1] as Array<{ name: string }>).map((table) => table.name)).toEqual([
      "cases",
      "revisions",
      "candidateSets",
      "researchNotes",
      "events",
      "knowledgeDocuments"
    ]);
    expect(attachmentRead).not.toHaveBeenCalled();
  });

  it("aborts the live readonly transaction when its signal is cancelled", async () => {
    const repository = createRepository(15);
    const { database } = repository;
    await database.open();
    const controller = new AbortController();
    const originalCasesToArray = database.cases.toArray.bind(database.cases);
    let observedTransaction: Transaction | null = null;
    const readObservedTransaction = (): Transaction | null => observedTransaction;
    vi.spyOn(database.cases, "toArray").mockImplementation(() => {
      observedTransaction = Dexie.currentTransaction;
      controller.abort();
      return originalCasesToArray();
    });

    await expect(repository.readResearchQuerySnapshot({ signal: controller.signal }))
      .rejects.toMatchObject({ name: "AbortError" });
    const completedTransaction = readObservedTransaction();
    expect(completedTransaction).not.toBeNull();
    expect(completedTransaction?.active).toBe(false);
  });

  it("rejects cancellation after the callback returns but before the transaction result is delivered", async () => {
    const repository = createRepository(15);
    const { database } = repository;
    await database.open();
    const controller = new AbortController();
    const callbackReturned = deferred();
    const releaseTransactionResult = deferred();
    const originalTransaction = database.transaction.bind(database);
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    vi.spyOn(database, "transaction").mockImplementation((function (
      mode: "r",
      tables: Dexie.Table[],
      scope: () => Promise<unknown>
    ) {
      return originalTransaction(mode, tables, scope).then(async (result) => {
        callbackReturned.resolve();
        await releaseTransactionResult.promise;
        return result;
      });
    }) as typeof database.transaction);

    const pending = repository.readResearchQuerySnapshot({ signal: controller.signal });
    const settled = pending.then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason: unknown) => ({ status: "rejected" as const, reason })
    );
    await callbackReturned.promise;
    expect(removeListener).not.toHaveBeenCalled();

    controller.abort();
    releaseTransactionResult.resolve();

    const outcome = await settled;
    expect(outcome.status).toBe("rejected");
    if (outcome.status === "rejected") {
      expect(outcome.reason).toMatchObject({ name: "AbortError" });
    }
    expect(removeListener).toHaveBeenCalled();
  });

  it("leaves strict record and relationship rejection to the single research-query verification pass", async () => {
    const repository = createRepository(13);
    const invalidCase = { id: crypto.randomUUID(), alias: "invalid-unversioned-row" };
    await repository.database.table("cases").add(invalidCase);

    const snapshot = await repository.readResearchQuerySnapshot();
    expect(snapshot.cases).toEqual([invalidCase]);

    await expect(executeResearchQuery(createDefaultResearchQuery("cases"), snapshot))
      .rejects.toBeInstanceOf(ResearchQueryExecutionError);
    await expect(executeResearchQuery(createDefaultResearchQuery("cases"), snapshot))
      .rejects.toMatchObject({ code: "INVALID_DATASET" });
  });
});
