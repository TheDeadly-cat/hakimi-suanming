import { Blob as NodeBlob } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { CaseImportCancelledError } from "@hakimi/case-import";
import {
  createBlobCsvSource,
  DEFAULT_CASE_IMPORT_BLOB_CHUNK_BYTES
} from "./case-import-blob-source";

async function collectSource(source: ReturnType<typeof createBlobCsvSource>): Promise<{
  text: string;
  processedUnits: number[];
}> {
  let text = "";
  const processedUnits: number[] = [];
  for await (const chunk of source.open()) {
    text += chunk.text;
    processedUnits.push(chunk.processedUnits);
  }
  return { text, processedUnits };
}

describe("Blob CSV UTF-8 source", () => {
  it.each([1, 2, 3, 4, 7, DEFAULT_CASE_IMPORT_BLOB_CHUNK_BYTES])(
    "preserves BOM, Chinese and emoji across %i-byte boundaries",
    async (chunkBytes) => {
      const csv = "\ufeff案例名,备注\r\n甲,跨块中文🙂\r\n乙,尾行";
      const blob = new NodeBlob([csv], { type: "text/csv" }) as unknown as Blob;
      const textSpy = vi.spyOn(blob, "text");
      const first = await collectSource(createBlobCsvSource(blob, { chunkBytes }));
      const second = await collectSource(createBlobCsvSource(blob, { chunkBytes }));

      // TextDecoder consumes the UTF-8 BOM; the RFC parser accepts the same
      // logical input with or without the decoded BOM marker.
      expect(first.text).toBe(csv.slice(1));
      expect(second).toEqual(first);
      expect(first.processedUnits.at(-1)).toBe(blob.size);
      expect(first.processedUnits).toEqual([...first.processedUnits].sort((a, b) => a - b));
      expect(textSpy).not.toHaveBeenCalled();
    }
  );

  it("rejects invalid and truncated UTF-8 with a stable configuration code", async () => {
    const blob = new NodeBlob([
      new Uint8Array([0x61, 0x2c, 0x62, 0x0a, 0xe4, 0xb8])
    ]) as unknown as Blob;

    await expect(collectSource(createBlobCsvSource(blob, { chunkBytes: 1 }))).rejects.toMatchObject({
      code: "CASE_IMPORT_CONFIGURATION_INVALID",
      issues: [expect.objectContaining({ code: "CSV_INVALID_UTF8" })]
    });
  });

  it("checks cancellation before and between bounded Blob reads", async () => {
    const blob = new NodeBlob(["a".repeat(DEFAULT_CASE_IMPORT_BLOB_CHUNK_BYTES * 2)]) as unknown as Blob;
    const beforeStart = new AbortController();
    beforeStart.abort();
    const unopened = createBlobCsvSource(blob).open(beforeStart.signal)[Symbol.asyncIterator]();
    await expect(unopened.next()).rejects.toBeInstanceOf(CaseImportCancelledError);

    const controller = new AbortController();
    const iterator = createBlobCsvSource(blob).open(controller.signal)[Symbol.asyncIterator]();
    await expect(iterator.next()).resolves.toMatchObject({
      done: false,
      value: { processedUnits: DEFAULT_CASE_IMPORT_BLOB_CHUNK_BYTES }
    });
    controller.abort();
    await expect(iterator.next()).rejects.toBeInstanceOf(CaseImportCancelledError);
  });

  it("validates the byte budget and handles an empty Blob without synthetic chunks", async () => {
    const empty = new NodeBlob([]) as unknown as Blob;
    expect(await collectSource(createBlobCsvSource(empty))).toEqual({ text: "", processedUnits: [] });
    expect(() => createBlobCsvSource(empty, { chunkBytes: 0 })).toThrow(RangeError);
    expect(() => createBlobCsvSource(empty, { chunkBytes: 1.5 })).toThrow(RangeError);
  });
});
