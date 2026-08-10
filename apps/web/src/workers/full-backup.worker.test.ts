import { describe, expect, it, vi } from "vitest";
import { preflightFullBackupFile } from "@hakimi/backup";
import type { FullBackupPayload } from "@hakimi/contracts";
import {
  FULL_BACKUP_WORKER_PROTOCOL,
  FULL_BACKUP_WORKER_PROTOCOL_VERSION,
  type FullBackupWorkerRequest,
  type FullBackupWorkerResponse
} from "../lib/full-backup-worker-protocol";

const emptySnapshot: FullBackupPayload = {
  cases: [],
  revisions: [],
  candidateSets: [],
  researchNotes: [],
  events: [],
  savedViews: [],
  knowledgeDocuments: [],
  citations: [],
  sourceRights: [],
  attachments: [],
  researcherProfiles: [],
  appSettings: [],
  ruleRegistry: [],
  tzdbMigrationReceipts: [],
  eventTimeMigrationReceipts: [],
  revisionCalculationReceipts: []
};

describe("full backup worker entry", () => {
  it("从纯快照生成真实 ZIP Blob，并可由正式预检器重新验证", async () => {
    const responses: FullBackupWorkerResponse[] = [];
    const previousOnMessage = globalThis.onmessage;
    const postMessageSpy = vi.spyOn(globalThis, "postMessage").mockImplementation((message: unknown) => {
      responses.push(message as FullBackupWorkerResponse);
    });

    try {
      vi.resetModules();
      await import("./full-backup.worker");
      const workerOnMessage = globalThis.onmessage as
        ((event: MessageEvent<FullBackupWorkerRequest>) => void) | null;
      if (!workerOnMessage) throw new Error("完整备份 Worker 测试入口未注册");
      workerOnMessage(new MessageEvent("message", { data: {
        protocol: FULL_BACKUP_WORKER_PROTOCOL,
        version: FULL_BACKUP_WORKER_PROTOCOL_VERSION,
        jobId: "integration-job",
        type: "create_from_snapshot",
        output: "zip",
        snapshot: emptySnapshot,
        options: {
          appVersion: "0.2.0-p0",
          exportedAt: "2026-08-03T00:00:00.000Z"
        }
      } satisfies FullBackupWorkerRequest }));

      await vi.waitFor(() => expect(responses.some((message) => message.type === "artifact_ready")).toBe(true));
      const response = responses.find((message) => message.type === "artifact_ready");
      if (!response || response.type !== "artifact_ready") throw new Error("Worker 未返回 ZIP");
      expect(response).toMatchObject({
        protocol: FULL_BACKUP_WORKER_PROTOCOL,
        version: 1,
        jobId: "integration-job",
        output: "zip",
        outputByteLength: response.blob.size,
        payloadDigest: expect.stringMatching(/^[0-9a-f]{64}$/u)
      });
      const verified = await preflightFullBackupFile(new Uint8Array(await response.blob.arrayBuffer()));
      expect(verified.manifest.counts).toMatchObject({ cases: 0, attachments: 0 });
      expect(verified.digests.payload).toBe(response.payloadDigest);
    } finally {
      postMessageSpy.mockRestore();
      globalThis.onmessage = previousOnMessage;
    }
  });
});
