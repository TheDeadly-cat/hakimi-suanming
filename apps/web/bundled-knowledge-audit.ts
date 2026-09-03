import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  MAX_KNOWLEDGE_DOCUMENT_BYTES,
  buildKnowledgeContentSnapshot,
  compareBundledKnowledgePaths,
  inferKnowledgeFormat,
  validateBundledKnowledgeManifestRelease,
  type BundledKnowledgeReleaseEntry
} from "@hakimi/knowledge-core";

export type AuditedBundledKnowledgeEntry = BundledKnowledgeReleaseEntry & {
  content: string;
  outputPath: string;
};

export type BundledKnowledgeAuditResult = {
  schemaVersion: "2.0.0";
  entries: AuditedBundledKnowledgeEntry[];
};

const MAX_BUNDLED_KNOWLEDGE_MANIFEST_BYTES = 5 * 1024 * 1024;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 必须是对象。`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: string[], label: string): void {
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(canonical)) {
    throw new Error(`${label} 字段不完整或包含未知字段。`);
  }
}

function isSameOrWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (
    relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function sameFileEndpoint(
  left: Awaited<ReturnType<typeof lstat>>,
  right: Awaited<ReturnType<typeof lstat>>
): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

type DirectoryEndpoint = {
  absolutePath: string;
  resolvedPath: string;
  metadata: Awaited<ReturnType<typeof lstat>>;
};

async function capturePlainDirectoryChain(
  containmentRoot: string,
  absolutePath: string,
  label: string
): Promise<DirectoryEndpoint[]> {
  const root = path.resolve(containmentRoot);
  const targetDirectory = path.dirname(path.resolve(absolutePath));
  if (!isSameOrWithin(root, targetDirectory)) {
    throw new Error(`${label} 的目录链越出允许目录。`);
  }
  const relative = path.relative(root, targetDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  const endpoints: DirectoryEndpoint[] = [];
  let cursor = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) cursor = path.join(cursor, segment);
    const metadata = await lstat(cursor);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error(`${label} 的目录链必须全部是普通目录，不能包含符号链接、junction 或特殊端点。`);
    }
    const resolvedPath = await realpath(cursor);
    if (endpoints.length > 0 && !isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
      throw new Error(`${label} 的目录链 realpath 越出允许目录。`);
    }
    endpoints.push({ absolutePath: cursor, resolvedPath, metadata });
  }
  return endpoints;
}

function sameDirectoryChain(left: DirectoryEndpoint[], right: DirectoryEndpoint[]): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && entry.absolutePath === other.absolutePath
      && entry.resolvedPath === other.resolvedPath
      && sameFileEndpoint(entry.metadata, other.metadata);
  });
}

async function readAtMost(
  handle: Awaited<ReturnType<typeof open>>,
  maxBytes: number,
  label: string
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  while (total <= maxBytes) {
    const capacity = Math.min(64 * 1024, maxBytes + 1 - total);
    const chunk = Buffer.allocUnsafe(capacity);
    const { bytesRead } = await handle.read(chunk, 0, capacity, total);
    if (bytesRead === 0) break;
    chunks.push(Buffer.from(chunk.subarray(0, bytesRead)));
    total += bytesRead;
  }
  if (total > maxBytes) {
    throw new Error(`${label} 字节数无效或超过上限。`);
  }
  return Buffer.concat(chunks, total);
}

async function readStableRegularFile(
  absolutePath: string,
  containmentRoot: string,
  maxBytes: number,
  label: string
): Promise<Buffer> {
  const directoryChainBefore = await capturePlainDirectoryChain(containmentRoot, absolutePath, label);
  const before = await lstat(absolutePath);
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error(`${label} 必须是普通文件，不能是符号链接、junction 或特殊文件。`);
  }
  if (before.nlink !== 1) {
    throw new Error(`${label} 不能是 hard-link alias。`);
  }
  if (before.size <= 0 || before.size > maxBytes) {
    throw new Error(`${label} 字节数无效或超过上限。`);
  }
  const resolvedBefore = await realpath(absolutePath);
  if (!isSameOrWithin(directoryChainBefore[0].resolvedPath, resolvedBefore)) {
    throw new Error(`${label} 的 realpath 越出允许目录。`);
  }

  const handle = await open(resolvedBefore, "r");
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 || !sameFileEndpoint(before, opened)) {
      throw new Error(`${label} 在打开前发生身份换绑。`);
    }
    const bytes = await readAtMost(handle, maxBytes, label);
    const [afterHandle, afterPath, resolvedAfter, directoryChainAfter] = await Promise.all([
      handle.stat(),
      lstat(absolutePath),
      realpath(absolutePath),
      capturePlainDirectoryChain(containmentRoot, absolutePath, label)
    ]);
    if (
      afterPath.isSymbolicLink()
      || !afterPath.isFile()
      || afterPath.nlink !== 1
      || bytes.byteLength !== opened.size
      || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(opened, afterPath)
      || resolvedAfter !== resolvedBefore
      || !sameDirectoryChain(directoryChainBefore, directoryChainAfter)
    ) {
      throw new Error(`${label} 在读取端点之间发生变化。`);
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

async function listDocumentFiles(directory: string, prefix = "documents"): Promise<string[]> {
  let directoryMetadata;
  try {
    directoryMetadata = await lstat(directory);
  } catch (reason) {
    if ((reason as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw reason;
  }
  if (directoryMetadata.isSymbolicLink() || !directoryMetadata.isDirectory()) {
    throw new Error(`随包正文目录 ${prefix} 必须是普通目录，不能是符号链接、junction 或特殊文件。`);
  }
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (reason) {
    if ((reason as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw reason;
  }
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => compareBundledKnowledgePaths(left.name, right.name))) {
    const absolute = path.join(directory, entry.name);
    const relative = `${prefix}/${entry.name}`.replaceAll("\\", "/");
    const metadata = await lstat(absolute);
    if (entry.isSymbolicLink() || metadata.isSymbolicLink()) {
      throw new Error(`随包正文 ${relative} 不能是符号链接或 junction。`);
    }
    if (entry.isDirectory() && metadata.isDirectory()) {
      files.push(...await listDocumentFiles(absolute, relative));
    } else if (entry.isFile() && metadata.isFile()) {
      if (metadata.nlink !== 1) throw new Error(`随包正文 ${relative} 不能是 hard-link alias。`);
      files.push(relative);
    } else {
      throw new Error(`随包正文 ${relative} 不是可审计的普通文件或目录。`);
    }
  }
  return files;
}

function assertExactInventory(declared: string[], discovered: string[], phase: string): void {
  const actual = [...discovered].sort(compareBundledKnowledgePaths);
  if (JSON.stringify(declared) !== JSON.stringify(actual)) {
    const undeclared = actual.filter((file) => !declared.includes(file));
    const missing = declared.filter((file) => !actual.includes(file));
    throw new Error(`随包正文与权利 manifest 在${phase}不一致。未登记：${undeclared.join("、") || "无"}；缺文件：${missing.join("、") || "无"}。`);
  }
}

export async function auditBundledKnowledgeDirectory(contentRoot: string): Promise<BundledKnowledgeAuditResult> {
  const resolvedContentRoot = await realpath(path.resolve(contentRoot));
  const manifestPath = path.join(resolvedContentRoot, "manifest.v2.json");
  const manifestBytes = await readStableRegularFile(
    manifestPath,
    resolvedContentRoot,
    MAX_BUNDLED_KNOWLEDGE_MANIFEST_BYTES,
    "随包资料 manifest"
  );
  let manifestText;
  try {
    manifestText = UTF8_DECODER.decode(manifestBytes);
  } catch {
    throw new Error("随包资料 manifest 必须是有效 UTF-8。");
  }
  const rawManifest = object(JSON.parse(manifestText), "随包资料 manifest");
  exactKeys(rawManifest, ["schemaVersion", "entries"], "随包资料 manifest");
  if (rawManifest.schemaVersion !== "2.0.0" || !Array.isArray(rawManifest.entries)) {
    throw new Error("随包资料 manifest 版本或 entries 无效。");
  }

  const preflightEntries: BundledKnowledgeReleaseEntry[] = [];
  for (const [index, rawEntry] of rawManifest.entries.entries()) {
    const entry = object(rawEntry, `entries[${index}]`);
    exactKeys(entry, ["path", "documentId", "contentHash", "sourceRights", "sourceCarrier"], `entries[${index}]`);
    if (typeof entry.path !== "string" || typeof entry.documentId !== "string" || typeof entry.contentHash !== "string") {
      throw new Error(`entries[${index}] 的 path、documentId 或 contentHash 无效。`);
    }
    preflightEntries.push({
      path: entry.path,
      documentId: entry.documentId,
      contentHash: entry.contentHash,
      sourceRights: entry.sourceRights as BundledKnowledgeReleaseEntry["sourceRights"],
      sourceCarrier: entry.sourceCarrier as BundledKnowledgeReleaseEntry["sourceCarrier"]
    });
  }

  const admittedEntries = validateBundledKnowledgeManifestRelease(preflightEntries);
  const documentsRoot = path.join(resolvedContentRoot, "documents");
  const discovered = await listDocumentFiles(documentsRoot);
  const declared = admittedEntries.map((entry) => entry.path).sort(compareBundledKnowledgePaths);
  assertExactInventory(declared, discovered, "正文读取前");

  const audited: AuditedBundledKnowledgeEntry[] = [];
  for (const entry of admittedEntries) {
    const absolutePath = path.resolve(resolvedContentRoot, ...entry.path.split("/"));
    const bytes = await readStableRegularFile(
      absolutePath,
      documentsRoot,
      MAX_KNOWLEDGE_DOCUMENT_BYTES,
      `随包正文 ${entry.path}`
    );
    let content;
    try {
      content = UTF8_DECODER.decode(bytes);
    } catch {
      throw new Error(`随包正文 ${entry.path} 必须是有效 UTF-8。`);
    }
    const format = inferKnowledgeFormat(entry.path);
    const snapshot = await buildKnowledgeContentSnapshot(content, format);
    if (snapshot.contentHash !== entry.contentHash) {
      throw new Error(`随包资料 ${entry.path} 的实际正文哈希与 manifest 不匹配。`);
    }
    audited.push({
      path: entry.path,
      documentId: entry.documentId,
      contentHash: entry.contentHash,
      sourceRights: entry.sourceRights as BundledKnowledgeReleaseEntry["sourceRights"],
      sourceCarrier: entry.sourceCarrier as BundledKnowledgeReleaseEntry["sourceCarrier"],
      content: snapshot.content,
      outputPath: `knowledge/${entry.path.replace(/^documents\//, "")}`
    });
  }
  const discoveredAfterBodyReads = await listDocumentFiles(documentsRoot);
  assertExactInventory(declared, discoveredAfterBodyReads, "正文读取后");
  if (JSON.stringify([...discovered].sort(compareBundledKnowledgePaths))
    !== JSON.stringify([...discoveredAfterBodyReads].sort(compareBundledKnowledgePaths))) {
    throw new Error("随包正文目录库存在线程端点之间发生变化。");
  }
  return { schemaVersion: "2.0.0", entries: audited };
}
