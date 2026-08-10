import { describe, expect, it, vi } from "vitest";
import { decodeKnowledgeFileOffMainThread } from "./knowledge-import-worker-client";
import { KnowledgeImportDecodeError, MAX_KNOWLEDGE_IMPORT_BYTES } from "./knowledge-import-worker-protocol";

describe("knowledge import decoder", () => {
  it("严格解码 UTF-8", async () => {
    await expect(decodeKnowledgeFileOffMainThread(new Blob(["# 滴天髓\n藏干"]))).resolves.toBe("# 滴天髓\n藏干");
    await expect(decodeKnowledgeFileOffMainThread(new Blob([new Uint8Array([0xc3, 0x28])]))).rejects.toMatchObject({
      code: "INVALID_UTF8"
    });
  });

  it("拒绝超过 2 MiB 的文件", async () => {
    const oversized = new Blob([new Uint8Array(MAX_KNOWLEDGE_IMPORT_BYTES + 1)]);
    await expect(decodeKnowledgeFileOffMainThread(oversized)).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("取消时终止一次性 Worker", async () => {
    const controller = new AbortController();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
      onmessageerror: null
    };
    const promise = decodeKnowledgeFileOffMainThread(new Blob(["内容"]), controller.signal, {
      forceWorker: true,
      createWorker: () => worker
    });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(KnowledgeImportDecodeError);
    expect(worker.postMessage).toHaveBeenLastCalledWith({ type: "cancel" });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
