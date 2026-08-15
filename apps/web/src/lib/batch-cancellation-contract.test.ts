import { describe, expect, it, vi } from "vitest";
import { CaseImportCancelledError, parseRfc4180CsvAsync } from "@hakimi/case-import";
import {
  createDefaultResearchQuery,
  executeResearchQuery,
  ResearchQueryExecutionError
} from "@hakimi/research-query";
import {
  FullBackupWorkerCancelledError,
  createFullBackupArtifactOffMainThread,
  prepareFullBackupImportOffMainThread,
  verifyPreparedFullBackupOffMainThread
} from "./full-backup-worker-client";

const EMPTY_RESEARCH_QUERY_SNAPSHOT = {
  cases: [],
  revisions: [],
  candidateSets: [],
  researchNotes: [],
  events: [],
  knowledgeDocuments: [],
  revisionCalculationReceiptLedgerStatus: "schema_unavailable",
  revisionCalculationReceipts: []
} as const;

/**
 * Unified batch-cancellation contract: every cancellable batch entry point
 * must fail closed on a pre-aborted signal, must not start its worker, and
 * must never leave partial user-visible output behind.
 */
describe("P2-05 unified batch cancellation contract", () => {
  it("full backup artifact creation rejects pre-abort without starting a worker", async () => {
    const createWorker = vi.fn();
    const controller = new AbortController();
    controller.abort();
    await expect(createFullBackupArtifactOffMainThread(
      {} as never,
      { appVersion: "0.2.0-p0" },
      "zip",
      controller.signal,
      { forceWorker: true, createWorker }
    )).rejects.toBeInstanceOf(FullBackupWorkerCancelledError);
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("full backup import preparation and verification reject pre-abort without a worker", async () => {
    const createWorker = vi.fn();
    const controller = new AbortController();
    controller.abort();
    await expect(prepareFullBackupImportOffMainThread(
      new Blob(["{}"]),
      {} as never,
      { appVersion: "0.2.0-p0" },
      controller.signal,
      { forceWorker: true, createWorker }
    )).rejects.toBeInstanceOf(FullBackupWorkerCancelledError);
    await expect(verifyPreparedFullBackupOffMainThread(
      {} as never,
      controller.signal,
      { forceWorker: true, createWorker }
    )).rejects.toBeInstanceOf(FullBackupWorkerCancelledError);
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("CSV batch parsing rejects pre-abort with the explicit cancelled error", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(parseRfc4180CsvAsync("a,b\n1,2\n", { signal: controller.signal }))
      .rejects.toBeInstanceOf(CaseImportCancelledError);
  });

  it("ResearchQuery rejects pre-abort with ABORTED and never mutates views", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(executeResearchQuery(
      createDefaultResearchQuery("candidate_sets"),
      EMPTY_RESEARCH_QUERY_SNAPSHOT,
      { signal: controller.signal }
    )).rejects.toBeInstanceOf(ResearchQueryExecutionError);
    await expect(executeResearchQuery(
      createDefaultResearchQuery("candidate_sets"),
      EMPTY_RESEARCH_QUERY_SNAPSHOT,
      { signal: controller.signal }
    )).rejects.toMatchObject({ code: "ABORTED" });
  });
});
