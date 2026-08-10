import {
  CaseImportCancelledError,
  CaseImportConfigurationError,
  type DecodedCsvChunk,
  type RepeatableDecodedCsvSource
} from "@hakimi/case-import";

export const DEFAULT_CASE_IMPORT_BLOB_CHUNK_BYTES = 64 * 1024;

export type BlobCsvSourceOptions = {
  chunkBytes?: number;
};

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new CaseImportCancelledError();
}

function invalidUtf8Error(): CaseImportConfigurationError {
  return new CaseImportConfigurationError([{
    code: "CSV_INVALID_UTF8",
    message: "CSV 必须使用有效的 UTF-8 编码；文件包含非法或截断的字节序列"
  }]);
}

async function* decodeUtf8Blob(
  blob: Blob,
  chunkBytes: number,
  signal?: AbortSignal
): AsyncGenerator<DecodedCsvChunk, void, void> {
  throwIfAborted(signal);
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  let offset = 0;

  while (offset < blob.size) {
    throwIfAborted(signal);
    const end = Math.min(blob.size, offset + chunkBytes);
    const buffer = await blob.slice(offset, end).arrayBuffer();
    throwIfAborted(signal);

    let text: string;
    try {
      text = decoder.decode(new Uint8Array(buffer), { stream: true });
    } catch {
      throw invalidUtf8Error();
    }
    offset = end;
    yield { text, processedUnits: offset };
    throwIfAborted(signal);
  }

  try {
    const tail = decoder.decode();
    if (tail.length > 0) yield { text: tail, processedUnits: blob.size };
  } catch {
    throw invalidUtf8Error();
  }
  throwIfAborted(signal);
}

/**
 * Adapts an immutable browser Blob to a repeatable, byte-accounted UTF-8 text
 * source without ever materializing the complete file as one JavaScript string.
 */
export function createBlobCsvSource(
  blob: Blob,
  options: BlobCsvSourceOptions = {}
): RepeatableDecodedCsvSource {
  const chunkBytes = options.chunkBytes ?? DEFAULT_CASE_IMPORT_BLOB_CHUNK_BYTES;
  if (!Number.isInteger(chunkBytes) || chunkBytes < 1) {
    throw new RangeError("chunkBytes 必须是大于 0 的整数");
  }
  return {
    unit: "utf8_bytes",
    totalUnits: blob.size,
    open: (signal) => decodeUtf8Blob(blob, chunkBytes, signal)
  };
}
