export const MAX_KNOWLEDGE_IMPORT_BYTES = 2 * 1024 * 1024;

export type KnowledgeImportWorkerRequest =
  | { type: "decode"; blob: Blob }
  | { type: "cancel" };

export type KnowledgeImportWorkerResponse =
  | { type: "decoded"; content: string }
  | { type: "error"; error: { name: string; message: string; code?: string } };

export class KnowledgeImportDecodeError extends Error {
  constructor(
    readonly code: "FILE_TOO_LARGE" | "INVALID_UTF8" | "IMPORT_CANCELLED",
    message: string
  ) {
    super(message);
    this.name = "KnowledgeImportDecodeError";
  }
}

export async function decodeKnowledgeBlob(blob: Blob, signal?: AbortSignal): Promise<string> {
  if (signal?.aborted) {
    throw new KnowledgeImportDecodeError("IMPORT_CANCELLED", "资料读取已取消。");
  }
  if (blob.size > MAX_KNOWLEDGE_IMPORT_BYTES) {
    throw new KnowledgeImportDecodeError("FILE_TOO_LARGE", "单份资料不能超过 2 MiB。");
  }
  const bytes = await blob.arrayBuffer();
  if (signal?.aborted) {
    throw new KnowledgeImportDecodeError("IMPORT_CANCELLED", "资料读取已取消。");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    throw new KnowledgeImportDecodeError("INVALID_UTF8", "资料不是严格 UTF-8 编码，请转换编码后再导入。");
  }
}
