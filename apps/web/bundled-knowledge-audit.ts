import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { buildKnowledgeContentSnapshot, validateBundledKnowledgeRelease, type BundledKnowledgeReleaseEntry } from "@hakimi/knowledge-core";

export type AuditedBundledKnowledgeEntry = BundledKnowledgeReleaseEntry & {
  content: string;
  outputPath: string;
};

export type BundledKnowledgeAuditResult = {
  schemaVersion: "1.0.0";
  entries: AuditedBundledKnowledgeEntry[];
};

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

async function listDocumentFiles(directory: string, prefix = "documents"): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (reason) {
    if ((reason as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw reason;
  }
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    if (entry.name.startsWith(".")) continue;
    const absolute = path.join(directory, entry.name);
    const relative = `${prefix}/${entry.name}`.replaceAll("\\", "/");
    if (entry.isDirectory()) files.push(...await listDocumentFiles(absolute, relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

export async function auditBundledKnowledgeDirectory(contentRoot: string): Promise<BundledKnowledgeAuditResult> {
  const manifestPath = path.join(contentRoot, "manifest.v1.json");
  const rawManifest = object(JSON.parse(await readFile(manifestPath, "utf8")), "随包资料 manifest");
  exactKeys(rawManifest, ["schemaVersion", "entries"], "随包资料 manifest");
  if (rawManifest.schemaVersion !== "1.0.0" || !Array.isArray(rawManifest.entries)) {
    throw new Error("随包资料 manifest 版本或 entries 无效。");
  }

  const discovered = await listDocumentFiles(path.join(contentRoot, "documents"));
  const audited: AuditedBundledKnowledgeEntry[] = [];
  for (const [index, rawEntry] of rawManifest.entries.entries()) {
    const entry = object(rawEntry, `entries[${index}]`);
    exactKeys(entry, ["path", "documentId", "contentHash", "sourceRights"], `entries[${index}]`);
    if (typeof entry.path !== "string" || typeof entry.documentId !== "string" || typeof entry.contentHash !== "string") {
      throw new Error(`entries[${index}] 的 path、documentId 或 contentHash 无效。`);
    }
    const extension = path.extname(entry.path).toLocaleLowerCase("en-US");
    if (extension !== ".md" && extension !== ".markdown" && extension !== ".txt") {
      throw new Error(`随包资料只允许 Markdown/TXT：${entry.path}`);
    }
    const absolutePath = path.resolve(contentRoot, ...entry.path.split("/"));
    const safeRoot = `${path.resolve(contentRoot)}${path.sep}`;
    if (!absolutePath.startsWith(safeRoot)) throw new Error(`随包资料路径越界：${entry.path}`);
    const content = await readFile(absolutePath, "utf8");
    const format = extension === ".txt" ? "text" : "markdown";
    const snapshot = await buildKnowledgeContentSnapshot(content, format);
    if (snapshot.contentHash !== entry.contentHash) {
      throw new Error(`随包资料 ${entry.path} 的实际正文哈希与 manifest 不匹配。`);
    }
    audited.push({
      path: entry.path,
      documentId: entry.documentId,
      contentHash: entry.contentHash,
      sourceRights: entry.sourceRights as BundledKnowledgeReleaseEntry["sourceRights"],
      content: snapshot.content,
      outputPath: `knowledge/${entry.path.replace(/^documents\//, "")}`
    });
  }

  const declared = audited.map((entry) => entry.path).sort();
  if (JSON.stringify(declared) !== JSON.stringify(discovered.sort())) {
    const undeclared = discovered.filter((file) => !declared.includes(file));
    const missing = declared.filter((file) => !discovered.includes(file));
    throw new Error(`随包正文与权利 manifest 不一致。未登记：${undeclared.join("、") || "无"}；缺文件：${missing.join("、") || "无"}。`);
  }

  validateBundledKnowledgeRelease(audited);
  return { schemaVersion: "1.0.0", entries: audited };
}
