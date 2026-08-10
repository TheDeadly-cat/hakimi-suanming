import { FileText, FileUp, RotateCcw, Save, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { KnowledgeDocumentRecord } from "@hakimi/contracts";
import { pickFile, type PickedFile } from "@hakimi/platform";
import { knowledgeRepository } from "@hakimi/storage";
import { decodeKnowledgeFileOffMainThread } from "../lib/knowledge-import-worker-client";
import { MAX_KNOWLEDGE_IMPORT_BYTES } from "../lib/knowledge-import-worker-protocol";
import { StatusPill } from "./status-pill";

type KnowledgeFormat = "markdown" | "text";

type PreparedFile = {
  picked: PickedFile;
  content: string;
  format: KnowledgeFormat;
  lineCount: number;
  headingCount: number;
};

export type KnowledgeImporterProps = {
  onCreated: (document: KnowledgeDocumentRecord) => void | Promise<void>;
  onClose?: () => void;
};

function inferFormat(fileName: string): KnowledgeFormat | null {
  const normalized = fileName.toLocaleLowerCase("en-US");
  if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) return "markdown";
  if (normalized.endsWith(".txt")) return "text";
  return null;
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.(?:md|markdown|txt)$/i, "").trim();
}

function countMarkdownHeadings(content: string): number {
  return content.split(/\r\n?|\n/).filter((line) => /^#{1,6}[\t ]+\S/.test(line)).length;
}

function errorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error ? reason.message : fallback;
}

export function KnowledgeImporter({ onCreated, onClose }: KnowledgeImporterProps) {
  const [prepared, setPrepared] = useState<PreparedFile | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [edition, setEdition] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const reset = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPrepared(null);
    setTitle("");
    setAuthor("");
    setEdition("");
    setSourceNote("");
    setSourceUrl("");
    setPublisher("");
    setPublicationYear("");
    setReading(false);
    setSaving(false);
    setError(null);
  };

  const chooseFile = async () => {
    setError(null);
    try {
      const picked = await pickFile({
        accept: ".md,.markdown,.txt,text/markdown,text/plain",
        maxBytes: MAX_KNOWLEDGE_IMPORT_BYTES
      });
      if (!picked) return;
      const format = inferFormat(picked.name);
      if (!format) throw new Error("仅支持 .md、.markdown 或 .txt 资料。");
      const controller = new AbortController();
      controllerRef.current?.abort();
      controllerRef.current = controller;
      setReading(true);
      const content = await decodeKnowledgeFileOffMainThread(picked.blob, controller.signal);
      if (controller.signal.aborted) return;
      const lineCount = content.split(/\r\n?|\n/).length;
      setPrepared({
        picked,
        content,
        format,
        lineCount,
        headingCount: format === "markdown" ? countMarkdownHeadings(content) : 0
      });
      setTitle(titleFromFileName(picked.name));
      setAuthor("");
      setEdition("");
      setSourceNote("");
      setSourceUrl("");
      setPublisher("");
      setPublicationYear("");
    } catch (reason) {
      if (!(reason instanceof Error && "code" in reason && reason.code === "IMPORT_CANCELLED")) {
        setError(errorMessage(reason, "无法读取资料文件。"));
      }
    } finally {
      setReading(false);
      controllerRef.current = null;
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!prepared || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const document = await knowledgeRepository.createDocument({
        title: title.trim(),
        author: author.trim(),
        edition: edition.trim(),
        sourceNote: sourceNote.trim(),
        sourceUrl: sourceUrl.trim() || null,
        publisher: publisher.trim(),
        publicationYear: publicationYear ? Number(publicationYear) : null,
        fileName: prepared.picked.name,
        format: prepared.format,
        content: prepared.content,
        byteSize: prepared.picked.size
      });
      reset();
      await onCreated(document);
    } catch (reason) {
      setError(errorMessage(reason, "资料写入失败。"));
      setSaving(false);
    }
  };

  return (
    <section className="knowledge-importer" aria-labelledby="knowledge-import-title">
      <header className="section-heading-row">
        <div>
          <p className="eyebrow">Private source</p>
          <h2 id="knowledge-import-title">导入个人 Markdown / TXT 资料</h2>
        </div>
        {onClose ? <button type="button" className="icon-button" aria-label="关闭资料导入" onClick={onClose}><X aria-hidden="true" /></button> : null}
      </header>
      <div className="knowledge-rights-notice">
        <StatusPill tone="warning">用户私有资料</StatusPill>
        <p>未经项目核验。请只导入你有权保存和研究的内容；导入不会把资料自动变成命盘事实。</p>
      </div>
      {error ? <div className="inline-error" role="alert"><strong>资料尚未导入</strong><p>{error}</p></div> : null}
      {!prepared ? (
        <button type="button" className="secondary-action knowledge-file-picker" disabled={reading} onClick={() => void chooseFile()}>
          <FileUp aria-hidden="true" />{reading ? "正在严格解码 UTF-8…" : "选择资料文件"}
        </button>
      ) : (
        <form className="knowledge-import-form" onSubmit={save}>
          <div className="knowledge-file-summary">
            <FileText aria-hidden="true" />
            <div><strong>{prepared.picked.name}</strong><small>{prepared.format === "markdown" ? "Markdown" : "纯文本"} · {(prepared.picked.size / 1024).toFixed(1)} KiB · {prepared.lineCount} 行{prepared.format === "markdown" ? ` · ${prepared.headingCount} 个标题` : ""}</small></div>
          </div>
          <div className="field-grid">
            <label className="field"><span>资料标题 <em>必填</em></span><input value={title} maxLength={200} required onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="field"><span>作者</span><input value={author} maxLength={160} onChange={(event) => setAuthor(event.target.value)} /></label>
          </div>
          <div className="field-grid">
            <label className="field"><span>版本 / 版次</span><input value={edition} maxLength={120} onChange={(event) => setEdition(event.target.value)} /></label>
            <label className="field"><span>来源备注</span><input value={sourceNote} maxLength={500} onChange={(event) => setSourceNote(event.target.value)} placeholder="购入版本、整理者或使用限制" /></label>
          </div>
          <div className="field-grid knowledge-source-fields">
            <label className="field"><span>来源网址</span><input type="url" value={sourceUrl} maxLength={1_000} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…（可选）" /></label>
            <label className="field"><span>出版者</span><input value={publisher} maxLength={200} onChange={(event) => setPublisher(event.target.value)} /></label>
            <label className="field"><span>出版年份</span><input type="number" inputMode="numeric" min="1" max="9999" value={publicationYear} onChange={(event) => setPublicationYear(event.target.value)} placeholder="例如 1936" /></label>
          </div>
          <p className="knowledge-local-only-note">这些书目信息只帮助你追溯来源，不会把资料提升为“公版已核验”或“允许随安装包分发”。</p>
          <div className="journal-actions">
            <button type="submit" className="primary-action" disabled={saving || !title.trim()}><Save aria-hidden="true" />{saving ? "正在保存…" : "确认导入"}</button>
            <button type="button" className="secondary-action" disabled={saving} onClick={reset}><RotateCcw aria-hidden="true" />重选文件</button>
          </div>
        </form>
      )}
    </section>
  );
}
