import { FileText, FileUp, RotateCcw, Save, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  knowledgeDocumentRecordSchema,
  sourceRightsRecordSchema,
  type KnowledgeDocumentRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import { pickFile } from "@hakimi/platform";
import { knowledgeRepository } from "@hakimi/storage";
import { decodeKnowledgeFileOffMainThread } from "../lib/knowledge-import-worker-client";
import { MAX_KNOWLEDGE_IMPORT_BYTES } from "../lib/knowledge-import-worker-protocol";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import { StatusPill } from "./status-pill";
import "./knowledge-importer.css";

type KnowledgeFormat = "markdown" | "text";

type FieldValidation<T> = {
  value: T;
  error: string | null;
};

type PreparedFile = {
  fileName: string;
  byteSize: number;
  content: string;
  fingerprint: string | null;
  format: KnowledgeFormat;
  lineCount: number;
  headingCount: number;
  characterCount: number;
  preview: string;
};

type LocalPickedFile = {
  name: string;
  size: number;
  blob: Blob;
};

type CommitPhase = "idle" | "writing" | "refreshing";

type KnowledgeImportCommitReceipt = Readonly<{
  status: "synced" | "refresh_failed" | "call_unknown" | "binding_unknown" | "coordination_failed";
  title: string;
  documentId: string | null;
  contentHash: string | null;
  fileName: string;
  format: KnowledgeFormat;
  byteSize: number;
  committedAt: string | null;
  sessionFingerprint: string | null;
  message: string;
}>;

export type KnowledgeImporterProps = {
  onCreated: (document: KnowledgeDocumentRecord) => void | Promise<void>;
  onCommitIssue?: (issue: KnowledgeImporterCommitIssue) => void;
  onClose?: () => void;
  acquireMutation?: (subjectId: string) => (() => void) | null;
  mutationBlocked?: boolean;
};

export type KnowledgeImporterCommitIssue = Readonly<{
  certainty: "call_unknown" | "returned_unreconciled";
  subjectId: string;
  reference: string;
  message: string;
}>;

const unsafeInterfaceTextPattern = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const unsafeKnowledgeControlPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;

function assertPickedFile(value: unknown): asserts value is LocalPickedFile {
  if (!value || typeof value !== "object") {
    throw new Error("文件选择器没有返回结构化文件载荷。");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || !record.name.trim()) {
    throw new Error("文件选择器返回的文件名不可识别。");
  }
  if (!Number.isSafeInteger(record.size) || (record.size as number) <= 0) {
    throw new Error("文件选择器返回的文件大小不可识别。");
  }
  if (typeof Blob === "undefined" || !(record.blob instanceof Blob)) {
    throw new Error("文件选择器没有返回有效的 Blob 文件载荷。");
  }
}

function validateMetadataText(
  rawValue: string,
  label: string,
  maxLength: number,
  required = false
): FieldValidation<string> {
  const value = rawValue.normalize("NFC").trim();
  if (required && !value) return { value, error: `${label}不能为空。` };
  if (unsafeInterfaceTextPattern.test(rawValue)) {
    return { value, error: `${label}包含不可见控制字符或双向文本控制符，请移除后再导入。` };
  }
  if (Array.from(value).length > maxLength) {
    return { value, error: `${label}超过 ${maxLength} 个字符。` };
  }
  return { value, error: null };
}

function sanitizePickedFileName(fileName: string): string {
  const segments = fileName.split(/[\\/]/);
  const normalizedLeafName = (segments[segments.length - 1] ?? "").normalize("NFC");
  if (unsafeInterfaceTextPattern.test(normalizedLeafName)) {
    throw new Error("文件名包含不可见控制字符或双向文本控制符，无法建立稳定的本机资料身份。");
  }
  const leafName = normalizedLeafName.trim();
  if (!leafName) throw new Error("文件名为空，无法建立本机资料身份。");
  if (Array.from(leafName).length > 240) throw new Error("文件名超过 240 个字符，无法建立稳定的本机资料身份。");
  if (leafName === "." || leafName === "..") throw new Error("文件名不能使用当前目录或上级目录标记。");
  return leafName;
}

function inferFormat(fileName: string): KnowledgeFormat | null {
  const normalized = fileName.toLocaleLowerCase("en-US");
  if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) return "markdown";
  if (normalized.endsWith(".txt")) return "text";
  return null;
}

function titleFromFileName(fileName: string): string {
  return Array.from(fileName.replace(/\.(?:md|markdown|txt)$/i, "").trim()).slice(0, 200).join("");
}

const numberFormatter = new Intl.NumberFormat("zh-CN");

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MiB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KiB`;
  return `${size} B`;
}

function inspectDecodedContent(content: string, format: KnowledgeFormat): Pick<PreparedFile, "lineCount" | "headingCount" | "characterCount" | "preview"> {
  if (unsafeKnowledgeControlPattern.test(content)) {
    throw new Error("文件包含不可见控制字符或双向文本控制符，已停止导入以避免隐藏内容进入研究资料库。");
  }
  const lines = content.split(/\r\n?|\n/);
  const previewLines: string[] = [];
  let headingCount = 0;
  for (const line of lines) {
    if (format === "markdown" && /^#{1,6}[\t ]+\S/.test(line)) headingCount += 1;
    if (previewLines.length >= 4) continue;
    const trimmed = line.trim();
    if (trimmed) previewLines.push(trimmed);
  }
  if (previewLines.length === 0) {
    throw new Error("文件没有可导入的可见文字。");
  }
  return {
    lineCount: lines.length,
    headingCount,
    characterCount: countUnicodeCodePoints(content),
    preview: safeVisibleText(previewLines.join(" "), "正文预览不可显示。", 280)
  };
}

function countUnicodeCodePoints(content: string): number {
  let count = 0;

  for (let index = 0; index < content.length; index += 1) {
    const codeUnit = content.charCodeAt(index);
    const nextCodeUnit = content.charCodeAt(index + 1);
    const isSurrogatePair =
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      nextCodeUnit >= 0xdc00 &&
      nextCodeUnit <= 0xdfff;

    if (isSurrogatePair) {
      index += 1;
    }
    count += 1;
  }

  return count;
}

function errorMessage(reason: unknown, fallback: string): string {
  return safeVisibleErrorMessage(reason, fallback);
}

async function createContentFingerprint(content: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  try {
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(content));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function assertCreatedDocumentBinding(
  document: KnowledgeDocumentRecord,
  prepared: PreparedFile,
  expected: Pick<
    KnowledgeDocumentRecord,
    "title" | "author" | "edition" | "sourceNote"
  >
): KnowledgeDocumentRecord {
  const validation = knowledgeDocumentRecordSchema.safeParse(document);
  if (!validation.success) {
    throw new Error("知识仓储返回值没有通过当前文档契约。");
  }
  const boundDocument = validation.data;
  if (
    boundDocument.recordType !== "user_knowledge_document"
    || !boundDocument.id.trim()
    || !/^[a-f0-9]{64}$/.test(boundDocument.contentHash)
    || !Number.isFinite(Date.parse(boundDocument.createdAt))
    || boundDocument.updatedAt !== boundDocument.createdAt
    || boundDocument.editVersion !== 1
    || boundDocument.title !== expected.title
    || boundDocument.author !== expected.author
    || boundDocument.edition !== expected.edition
    || boundDocument.sourceNote !== expected.sourceNote
    || boundDocument.fileName !== prepared.fileName
    || boundDocument.format !== prepared.format
    || boundDocument.byteSize !== prepared.byteSize
    || boundDocument.content !== prepared.content
    || (prepared.fingerprint !== null && boundDocument.contentHash !== prepared.fingerprint)
  ) {
    throw new Error("知识仓储返回的文档身份与本次提交不一致。");
  }
  return boundDocument;
}

function assertCreatedSourceRightsBinding(
  rawRights: SourceRightsRecord | null,
  document: KnowledgeDocumentRecord,
  expected: Pick<SourceRightsRecord["source"], "sourceUrl" | "publisher" | "publicationYear">
): SourceRightsRecord {
  const validation = sourceRightsRecordSchema.safeParse(rawRights);
  if (!validation.success) {
    throw new Error("知识仓储没有返回当前来源权利台账契约。");
  }
  const rights = validation.data;
  if (
    rights.documentId !== document.id
    || rights.documentContentHash !== document.contentHash
    || rights.origin !== "user_import"
    || rights.source.sourceUrl !== expected.sourceUrl
    || rights.source.publisher !== expected.publisher
    || rights.source.publicationYear !== expected.publicationYear
    || rights.rights.status !== "user_unverified"
    || rights.rights.workStatus !== "unknown"
    || rights.rights.editionStatus !== "unknown"
    || rights.rights.distributionPolicy !== "local_private_only"
    || rights.review.status !== "unreviewed"
    || rights.review.attestations.length !== 0
    || rights.editVersion !== 1
  ) {
    throw new Error("知识仓储返回的来源权利台账与本次私有导入不一致。");
  }
  return rights;
}

function buildCommitReceipt(
  status: KnowledgeImportCommitReceipt["status"],
  document: KnowledgeDocumentRecord,
  prepared: PreparedFile,
  expectedTitle: string,
  message: string
): KnowledgeImportCommitReceipt {
  return {
    status,
    title: expectedTitle,
    documentId: typeof document.id === "string" && document.id.trim() ? document.id : null,
    contentHash: typeof document.contentHash === "string" && document.contentHash.trim() ? document.contentHash : null,
    fileName: prepared.fileName,
    format: prepared.format,
    byteSize: prepared.byteSize,
    committedAt: typeof document.createdAt === "string" && Number.isFinite(Date.parse(document.createdAt))
      ? document.createdAt
      : null,
    sessionFingerprint: prepared.fingerprint,
    message
  };
}

function buildUnknownCommitReceipt(
  prepared: PreparedFile,
  expectedTitle: string,
  message: string
): KnowledgeImportCommitReceipt {
  return {
    status: "call_unknown",
    title: expectedTitle,
    documentId: null,
    contentHash: null,
    fileName: prepared.fileName,
    format: prepared.format,
    byteSize: prepared.byteSize,
    committedAt: null,
    sessionFingerprint: prepared.fingerprint,
    message
  };
}

function validateSourceUrl(rawValue: string): FieldValidation<string | null> {
  const value = rawValue.trim();
  if (!value) return { value: null, error: null };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { value: null, error: "请输入完整的 https:// 来源网址。" };
  }
  if (parsed.protocol !== "https:") {
    return { value: null, error: "来源网址仅接受 HTTPS，不保存 HTTP、file、data 等协议。" };
  }
  if (parsed.username || parsed.password) {
    return { value: null, error: "来源网址不能包含用户名或密码，请先移除凭据。" };
  }
  if (parsed.href.length > 1_000) {
    return { value: null, error: "规范化后的来源网址超过 1000 个字符。" };
  }
  return { value: parsed.href, error: null };
}

function validatePublicationYear(rawValue: string): FieldValidation<number | null> {
  const value = rawValue.trim();
  if (!value) return { value: null, error: null };
  if (!/^\d{1,4}$/.test(value)) {
    return { value: null, error: "出版年份需为 1 至 9999 的整数。" };
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 9999) {
    return { value: null, error: "出版年份需为 1 至 9999 的整数。" };
  }
  return { value: parsed, error: null };
}

export function KnowledgeImporter({ onCreated, onCommitIssue, onClose, acquireMutation, mutationBlocked = false }: KnowledgeImporterProps) {
  const importerTitleId = useId();
  const preflightTitleId = useId();
  const confirmationId = useId();
  const confirmationNoteId = `${confirmationId}-note`;
  const sourceUrlHintId = useId();
  const sourceUrlErrorId = useId();
  const publicationYearErrorId = useId();
  const metadataTextErrorId = useId();
  const [prepared, setPrepared] = useState<PreparedFile | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [edition, setEdition] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [privateUseConfirmed, setPrivateUseConfirmed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [reading, setReading] = useState(false);
  const [commitPhase, setCommitPhase] = useState<CommitPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [commitReceipt, setCommitReceipt] = useState<KnowledgeImportCommitReceipt | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const operationRef = useRef(0);
  const operationLockRef = useRef(false);
  const savedFingerprintsRef = useRef(new Map<string, string>());
  const filePickerRef = useRef<HTMLButtonElement>(null);
  const preflightTitleRef = useRef<HTMLHeadingElement>(null);
  const commitReceiptRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const sourceUrlInputRef = useRef<HTMLInputElement>(null);
  const publicationYearInputRef = useRef<HTMLInputElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  const returnFocusToPickerRef = useRef(false);
  const titleValidation = validateMetadataText(title, "资料标题", 200, true);
  const authorValidation = validateMetadataText(author, "作者", 160);
  const editionValidation = validateMetadataText(edition, "版本或版次", 120);
  const sourceNoteValidation = validateMetadataText(sourceNote, "来源备注", 500);
  const publisherValidation = validateMetadataText(publisher, "出版者", 200);
  const sourceUrlValidation = validateSourceUrl(sourceUrl);
  const publicationYearValidation = validatePublicationYear(publicationYear);
  const metadataTextIssue = [titleValidation, authorValidation, editionValidation, sourceNoteValidation, publisherValidation]
    .find((validation) => validation.error)?.error ?? null;
  const sourceTextIssueCount = [authorValidation, editionValidation, sourceNoteValidation, publisherValidation]
    .filter((validation) => validation.error).length;
  const sourceFieldCount = [authorValidation, editionValidation, sourceNoteValidation, publisherValidation]
    .filter((validation) => validation.value.length > 0 && !validation.error).length
    + (sourceUrlValidation.value ? 1 : 0)
    + (publicationYearValidation.value ? 1 : 0);
  const sourceIssueCount = sourceTextIssueCount
    + Number(Boolean(sourceUrlValidation.error))
    + Number(Boolean(publicationYearValidation.error));
  const metadataReady = Boolean(!titleValidation.error && sourceIssueCount === 0);
  const readyToSave = Boolean(prepared && metadataReady && privateUseConfirmed);
  const saving = commitPhase !== "idle";
  const commitBlocked = commitReceipt !== null && commitReceipt.status !== "synced";
  const recordWriteState = commitPhase === "writing"
    ? "in_progress"
    : commitPhase === "refreshing"
      ? "confirmed"
      : commitReceipt?.status === "call_unknown"
        ? "unknown"
        : commitReceipt?.status === "binding_unknown" || commitReceipt?.status === "coordination_failed"
          ? "returned_unreconciled"
          : commitReceipt
            ? "confirmed"
            : "not_started";
  const importStage = saving || readyToSave ? "save" : prepared ? "metadata" : commitReceipt ? "complete" : "decode";
  const decodeStepState = reading ? "active" : importStage === "decode" ? "current" : "complete";
  const metadataStepState = importStage === "metadata" ? "current" : importStage === "save" || importStage === "complete" ? "complete" : "pending";
  const saveStepState = saving
    ? "active"
    : commitReceipt
      ? commitBlocked ? "warning" : "complete"
      : importStage === "save" ? "current" : "pending";
  const importerState = reading
    ? "reading"
    : saving
      ? "saving"
      : commitReceipt?.status === "refresh_failed"
        ? "refresh-warning"
        : commitBlocked
          ? "error"
        : error
          ? "error"
          : commitReceipt
            ? "saved"
            : prepared
              ? "prepared"
              : "empty";
  const canSave = Boolean(readyToSave && !saving && !mutationBlocked && !commitBlocked);

  useEffect(() => () => {
    operationRef.current += 1;
    operationLockRef.current = false;
    controllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (prepared) {
      preflightTitleRef.current?.focus();
      return;
    }
    if (!returnFocusToPickerRef.current) return;
    returnFocusToPickerRef.current = false;
    filePickerRef.current?.focus();
  }, [prepared]);

  useEffect(() => {
    if (commitBlocked) commitReceiptRef.current?.focus();
  }, [commitBlocked]);

  const clearPreparedForm = () => {
    setPrepared(null);
    setTitle("");
    setAuthor("");
    setEdition("");
    setSourceNote("");
    setSourceUrl("");
    setPublisher("");
    setPublicationYear("");
    setPrivateUseConfirmed(false);
    setDragActive(false);
  };

  const reset = () => {
    operationRef.current += 1;
    operationLockRef.current = false;
    controllerRef.current?.abort();
    controllerRef.current = null;
    returnFocusToPickerRef.current = true;
    clearPreparedForm();
    setReading(false);
    setCommitPhase("idle");
    setError(null);
    setCommitReceipt(null);
  };

  const importPickedFile = async (loadPickedFile: () => Promise<unknown>) => {
    if (operationLockRef.current || commitBlocked) return;
    operationLockRef.current = true;
    const operationId = operationRef.current + 1;
    operationRef.current = operationId;
    setReading(true);
    setError(null);
    setCommitReceipt(null);
    let controller: AbortController | null = null;
    try {
      const picked = await loadPickedFile();
      if (!picked) return;
      if (operationRef.current !== operationId) return;
      assertPickedFile(picked);
      if (picked.size > MAX_KNOWLEDGE_IMPORT_BYTES) {
        throw new Error(`文件大小为 ${formatFileSize(picked.size)}，超过 ${formatFileSize(MAX_KNOWLEDGE_IMPORT_BYTES)} 上限。`);
      }
      if (picked.blob.size !== picked.size) {
        throw new Error("文件大小在选择与读取之间不一致，已停止导入以避免身份错配。");
      }
      const fileName = sanitizePickedFileName(picked.name);
      const format = inferFormat(fileName);
      if (!format) throw new Error("仅支持 .md、.markdown 或 .txt 资料。");
      controller = new AbortController();
      controllerRef.current?.abort();
      controllerRef.current = controller;
      const content = await decodeKnowledgeFileOffMainThread(picked.blob, controller.signal);
      if (controller.signal.aborted || operationRef.current !== operationId) return;
      const fingerprint = await createContentFingerprint(content);
      if (controller.signal.aborted || operationRef.current !== operationId) return;
      const savedAsTitle = fingerprint ? savedFingerprintsRef.current.get(fingerprint) : undefined;
      if (savedAsTitle) {
        throw new Error(`相同解码文本已在本窗口成功写入为“${savedAsTitle}”。请先到资料库核对，不要重复导入。`);
      }
      const inspection = inspectDecodedContent(content, format);
      setPrepared({
        fileName,
        byteSize: picked.size,
        content,
        fingerprint,
        format,
        ...inspection
      });
      setTitle(titleFromFileName(fileName));
      setAuthor("");
      setEdition("");
      setSourceNote("");
      setSourceUrl("");
      setPublisher("");
      setPublicationYear("");
      setPrivateUseConfirmed(false);
    } catch (reason) {
      if (operationRef.current === operationId && !(reason instanceof Error && "code" in reason && reason.code === "IMPORT_CANCELLED")) {
        setError(errorMessage(reason, "无法读取资料文件。"));
      }
    } finally {
      if (operationRef.current === operationId) {
        operationLockRef.current = false;
        setReading(false);
        if (controllerRef.current === controller) controllerRef.current = null;
      }
    }
  };

  const chooseFile = async () => {
    await importPickedFile(() => pickFile({
      accept: ".md,.markdown,.txt,text/markdown,text/plain",
      maxBytes: MAX_KNOWLEDGE_IMPORT_BYTES
    }));
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (reading || saving || commitBlocked) return;
    event.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (reading || saving || commitBlocked) return;
    if (event.dataTransfer.files.length !== 1) {
      setError("每次只能拖入一份 Markdown 或 TXT 文件。");
      return;
    }
    const file = event.dataTransfer.files.item(0);
    if (!file) {
      setError("拖入操作没有提供可读取的本机文件。");
      return;
    }
    void importPickedFile(async () => ({ name: file.name, size: file.size, blob: file }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!prepared || operationLockRef.current) return;
    if (titleValidation.error) {
      setError(titleValidation.error);
      titleInputRef.current?.focus();
      return;
    }
    if (metadataTextIssue) {
      setError(metadataTextIssue);
      return;
    }
    if (sourceUrlValidation.error) {
      setError(sourceUrlValidation.error);
      sourceUrlInputRef.current?.focus();
      return;
    }
    if (publicationYearValidation.error) {
      setError(publicationYearValidation.error);
      publicationYearInputRef.current?.focus();
      return;
    }
    if (!privateUseConfirmed) {
      setError("请先确认私有保存和研究边界。");
      confirmationInputRef.current?.focus();
      return;
    }
    if (mutationBlocked) {
      setError("另一个知识库写操作正在进行，请等待完成后再导入。");
      return;
    }
    const preparedSnapshot = prepared;
    const normalizedTitle = titleValidation.value;
    const commitPayload = {
      title: normalizedTitle,
      author: authorValidation.value,
      edition: editionValidation.value,
      sourceNote: sourceNoteValidation.value,
      sourceUrl: sourceUrlValidation.value,
      publisher: publisherValidation.value,
      publicationYear: publicationYearValidation.value,
      fileName: preparedSnapshot.fileName,
      format: preparedSnapshot.format,
      content: preparedSnapshot.content,
      byteSize: preparedSnapshot.byteSize
    };
    let releaseMutation: (() => void) | null = null;
    try {
      releaseMutation = acquireMutation?.(preparedSnapshot.fileName) ?? null;
    } catch (reason) {
      setError(errorMessage(reason, "无法取得知识库写入租约。"));
      return;
    }
    if (acquireMutation && !releaseMutation) {
      setError("另一个知识库写操作已先取得租约，本次没有开始写入。");
      return;
    }
    operationLockRef.current = true;
    const operationId = operationRef.current + 1;
    operationRef.current = operationId;
    setCommitPhase("writing");
    setError(null);
    setCommitReceipt(null);
    let document: KnowledgeDocumentRecord | null = null;
    let repositoryAcknowledged = false;
    let nextReceipt: KnowledgeImportCommitReceipt | null = null;
    try {
      try {
        document = await knowledgeRepository.createDocument(commitPayload);
        repositoryAcknowledged = true;
      } catch (reason) {
        if (operationRef.current === operationId) {
          clearPreparedForm();
          nextReceipt = buildUnknownCommitReceipt(
            preparedSnapshot,
            normalizedTitle,
            `知识仓储调用已开始但未取得可信返回值：${errorMessage(reason, "仓储调用抛出未知错误。")} 调用可能已提交，也可能未提交；请重新打开资料库按文件身份与内容摘要核对。`
          );
        }
        return;
      }
      if (!document || operationRef.current !== operationId) return;
      if (preparedSnapshot.fingerprint) savedFingerprintsRef.current.set(preparedSnapshot.fingerprint, normalizedTitle);
      try {
        document = assertCreatedDocumentBinding(document, preparedSnapshot, commitPayload);
        const sourceRights = await knowledgeRepository.getSourceRights(document.id);
        assertCreatedSourceRightsBinding(sourceRights, document, commitPayload);
      } catch (reason) {
        clearPreparedForm();
        nextReceipt = buildCommitReceipt(
          "binding_unknown",
          document,
          preparedSnapshot,
          normalizedTitle,
          `${errorMessage(reason, "知识仓储返回身份异常。")} 仓储事务已经返回完成，不能据此推断未写入；请重新打开资料库核对。`
        );
        return;
      }

      clearPreparedForm();
      setCommitPhase("refreshing");
      try {
        await onCreated(document);
        nextReceipt = buildCommitReceipt(
          "synced",
          document,
          preparedSnapshot,
          normalizedTitle,
          "仓储事务与资料列表刷新均已返回成功；这只证明本机工程状态，不证明来源权利或内容真伪。"
        );
      } catch (reason) {
        nextReceipt = buildCommitReceipt(
          "refresh_failed",
          document,
          preparedSnapshot,
          normalizedTitle,
          `${errorMessage(reason, "资料列表未能刷新。")} 文档已经写入本机；请重新打开资料库核对，不要重复导入同一内容。`
        );
      }
    } finally {
      let releaseIssue: string | null = null;
      try {
        releaseMutation?.();
      } catch (reason) {
        releaseIssue = errorMessage(reason, "知识库写入租约未能释放。");
      }
      if (operationRef.current === operationId) {
        let finalReceipt = nextReceipt;
        setCommitPhase("idle");
        if (releaseIssue) {
          if (finalReceipt?.status === "call_unknown") {
            finalReceipt = {
              ...finalReceipt,
              message: `${finalReceipt.message} ${releaseIssue} 写入结果与租约释放状态都必须在重新进入资料库后核对。`
            };
          } else if (repositoryAcknowledged && document) {
            finalReceipt = buildCommitReceipt(
              "coordination_failed",
              document,
              preparedSnapshot,
              normalizedTitle,
              `${finalReceipt ? `${finalReceipt.message} ` : ""}${releaseIssue} 仓储写入已经返回，本导入器继续锁定后续操作；请重新打开资料库核对。`
            );
          } else {
            setError(`${releaseIssue} 本次仓储写入未返回成功，请重新打开资料库后再操作。`);
          }
        }
        operationLockRef.current = Boolean(finalReceipt && finalReceipt.status !== "synced");
        if (finalReceipt) {
          if (finalReceipt.status !== "synced") {
            try {
              onCommitIssue?.({
                certainty: finalReceipt.status === "call_unknown" ? "call_unknown" : "returned_unreconciled",
                subjectId: preparedSnapshot.fileName,
                reference: [
                  `File ${preparedSnapshot.fileName}`,
                  finalReceipt.documentId ? `Document ${finalReceipt.documentId}` : null,
                  finalReceipt.contentHash ? `Hash ${finalReceipt.contentHash}` : null,
                  finalReceipt.sessionFingerprint ? `Session ${finalReceipt.sessionFingerprint}` : null
                ].filter(Boolean).join(" · "),
                message: finalReceipt.message
              });
            } catch (reason) {
              finalReceipt = {
                ...finalReceipt,
                message: `${finalReceipt.message} ${errorMessage(reason, "父级异常登记未完成。")} 本机收据仍保留，后续导入继续锁定。`
              };
            }
          }
          setCommitReceipt(finalReceipt);
        }
      }
    }
  };

  return (
    <section
      className="knowledge-importer"
      aria-labelledby={importerTitleId}
      aria-busy={reading || saving}
      data-state={importerState}
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-current-build-evidence-verified="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-scientific-validity-claimed="false"
      data-source-rights-established="false"
      data-good-bad-score="null"
      data-result="null"
      data-formal-activation-allowed="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-source-rights-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-mutation-mode="repository-lease-guarded"
      data-record-write-state={recordWriteState}
      data-existing-record-overwritten="false"
    >
      <header className="section-heading-row">
        <div>
          <p className="eyebrow">Private source</p>
          <h2 id={importerTitleId}>导入个人 Markdown / TXT 资料</h2>
        </div>
        {onClose ? <button type="button" className="icon-button" aria-label="关闭资料导入" disabled={reading || saving} onClick={onClose}><X aria-hidden="true" /></button> : null}
      </header>
      <div className="knowledge-rights-notice">
        <StatusPill tone="warning">用户私有资料</StatusPill>
        <div>
          <p>未经项目核验。请只导入你有权保存和研究的内容；导入不会把资料自动变成命盘事实。</p>
          <small className="knowledge-import-boundary">legacy-v13 · targetSchema 13 · migrationId null · local only · redistribution:false · expert truth:false</small>
        </div>
      </div>

      <ol className="knowledge-import-steps" aria-label="资料导入步骤">
        <li data-state={decodeStepState} aria-current={importStage === "decode" ? "step" : undefined}>
          <span>01</span>
          <div><strong>选择并解码</strong><small>{reading ? "解码与内容指纹计算中" : prepared ? "格式与 UTF-8 已通过" : commitReceipt || commitPhase === "refreshing" ? "文件已写入" : "等待本地文件"}</small></div>
        </li>
        <li data-state={metadataStepState} aria-current={importStage === "metadata" ? "step" : undefined}>
          <span>02</span>
          <div><strong>补录来源</strong><small>{prepared ? sourceIssueCount > 0 ? `${sourceIssueCount} 项格式需修正` : `${sourceFieldCount} / 6 项有效线索` : commitReceipt || commitPhase === "refreshing" ? "来源线索已随文档保存" : "选择文件后开放"}</small></div>
        </li>
        <li data-state={saveStepState} aria-current={importStage === "save" || commitBlocked ? "step" : undefined}>
          <span>03</span>
          <div><strong>保存到本机</strong><small>{commitPhase === "writing"
            ? "仓储事务执行中"
            : commitPhase === "refreshing"
              ? "写入已确认，正在刷新列表"
              : commitReceipt?.status === "synced"
                ? "写入与列表刷新已确认"
                : commitReceipt
                  ? "写入后状态需重新核对"
                  : mutationBlocked ? "等待其他写操作完成" : sourceIssueCount > 0 ? "先修正来源字段" : privateUseConfirmed ? "边界已确认，等待提交" : "需确认私有使用边界"}</small></div>
        </li>
      </ol>

      {reading || saving ? (
        <div className="knowledge-import-operation-status" role="status" aria-live="polite">
          <span className="knowledge-import-operation-status__indicator" aria-hidden="true" />
          <div>
            <strong>{reading ? "正在本机检查文件" : commitPhase === "refreshing" ? "本机写入已确认，正在刷新资料列表" : "正在执行单次本机写入"}</strong>
            <small>{reading
              ? "严格 UTF-8 解码并生成会话级内容摘要；此时尚未写入资料库。"
              : commitPhase === "refreshing"
                ? "重复提交继续锁定；刷新失败也不会把已完成写入描述成失败。"
                : "重复提交已锁定；Dexie 事务完成后才会进入列表刷新阶段。"}</small>
          </div>
        </div>
      ) : null}
      {error ? <div className="inline-error" role="alert"><strong>资料尚未导入</strong><p>{safeVisibleText(error, "资料导入错误不可显示。", 900)}</p></div> : null}
      {commitReceipt ? (
        <section
          ref={commitReceiptRef}
          className="knowledge-import-commit-receipt"
          data-receipt-state={commitReceipt.status}
          role={commitBlocked ? "alert" : "status"}
          aria-live={commitBlocked ? "assertive" : "polite"}
          tabIndex={commitBlocked ? -1 : undefined}
        >
          <header>
            <div><p className="eyebrow">Local commit receipt</p><h3>{commitBlocked ? "本机写入需重新核对" : "本机写入收据"}</h3></div>
            <StatusPill tone={commitReceipt.status === "synced" ? "jade" : commitReceipt.status === "refresh_failed" ? "warning" : "cinnabar"}>
              {commitReceipt.status === "synced"
                ? "写入与列表已确认"
                : commitReceipt.status === "refresh_failed"
                  ? "已写入 · 列表未刷新"
                  : commitReceipt.status === "call_unknown"
                    ? "调用结果未知"
                  : commitReceipt.status === "binding_unknown"
                    ? "返回绑定异常"
                    : "租约协调异常"}
            </StatusPill>
          </header>
          <p>{safeVisibleText(commitReceipt.message, "本机写入状态不可显示。", 1000)}</p>
          <dl aria-label="知识资料本机写入收据">
            <div><dt>资料标题</dt><dd>{safeVisibleText(commitReceipt.title, "未命名资料", 200)}</dd></div>
            <div><dt>文件身份</dt><dd>{safeVisibleText(commitReceipt.fileName, "未命名文件", 240)} · {commitReceipt.format === "markdown" ? "Markdown" : "纯文本"} · {formatFileSize(commitReceipt.byteSize)}</dd></div>
            <div><dt>文档 ID</dt><dd><code>{safeVisibleText(commitReceipt.documentId, "返回绑定不可用", 256)}</code></dd></div>
            <div><dt>仓储内容哈希</dt><dd><code>{safeVisibleText(commitReceipt.contentHash, "返回摘要不可用", 160)}</code></dd></div>
            <div><dt>会话文件指纹</dt><dd><code>{safeVisibleText(commitReceipt.sessionFingerprint, "当前环境未生成", 160)}</code></dd></div>
            <div><dt>仓储时间</dt><dd>{commitReceipt.committedAt ? <time dateTime={commitReceipt.committedAt}>{safeVisibleText(commitReceipt.committedAt, "返回时间不可用", 120)}</time> : "返回时间不可用"}</dd></div>
            <div><dt>研究边界</dt><dd>用户未核验 · 仅本机 · 不可再分发</dd></div>
          </dl>
          {commitBlocked ? (
            <div className="knowledge-import-commit-receipt__actions">
              <p>在重新进入资料库并读取仓储记录前，本导入器不会接受新的文件。</p>
              {onClose ? <button type="button" className="secondary-action" onClick={onClose}><X aria-hidden="true" />关闭导入器</button> : null}
            </div>
          ) : null}
        </section>
      ) : null}
      {!prepared && !saving && !commitBlocked ? (
        <div
          className="knowledge-file-intake"
          data-drag-active={dragActive}
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="knowledge-file-intake__mark" aria-hidden="true">
            <FileUp />
            <span>MD / TXT</span>
          </div>
          <div className="knowledge-file-intake__copy">
            <span
              className="knowledge-file-intake__state"
              data-state={dragActive ? "drag" : mutationBlocked ? "waiting" : "local"}
              role="status"
              aria-live="polite"
            >
              {dragActive
                ? "松开后仅在本机解码与预检"
                : mutationBlocked
                  ? "可先预检文件；写入需等待当前变更完成"
                  : "本机解码 · 不上传 · 写入前再确认"}
            </span>
            <p className="eyebrow">Local text intake</p>
            <h3>选择一份可追溯的文本资料</h3>
            <p>选择或拖入单个文件后，将在本机按扩展名筛选、严格 UTF-8 解码并检查隐藏控制字符；这一步仍不判断出处、权利或内容真伪。</p>
            <dl>
              <div><dt>支持格式</dt><dd>.md · .markdown · .txt</dd></div>
              <div><dt>大小上限</dt><dd>{(MAX_KNOWLEDGE_IMPORT_BYTES / 1024 / 1024).toFixed(0)} MiB</dd></div>
              <div><dt>写入时机</dt><dd>边界确认后</dd></div>
            </dl>
            <div className="knowledge-file-intake__actions">
              <button ref={filePickerRef} type="button" className="secondary-action knowledge-file-picker" disabled={reading || saving} aria-busy={reading || saving} onClick={() => void chooseFile()}>
                <FileUp aria-hidden="true" />{saving ? "正在刷新资料列表…" : reading ? "正在解码并生成指纹…" : "选择资料文件"}
              </button>
              {reading ? <button type="button" className="secondary-action" onClick={reset}><X aria-hidden="true" />取消读取</button> : null}
            </div>
          </div>
        </div>
      ) : prepared ? (
        <form className="knowledge-import-form" aria-busy={saving} onSubmit={save}>
          <div className="knowledge-file-summary">
            <span className="knowledge-file-summary__icon" aria-hidden="true"><FileText /></span>
            <div>
              <p className="eyebrow">Decoded locally</p>
              <strong>{safeVisibleText(prepared.fileName, "未命名文件", 240)}</strong>
              <small>{prepared.format === "markdown" ? "Markdown" : "纯文本"} · {formatFileSize(prepared.byteSize)} · {numberFormatter.format(prepared.lineCount)} 行{prepared.format === "markdown" ? ` · ${numberFormatter.format(prepared.headingCount)} 个标题` : ""}</small>
            </div>
            <StatusPill tone="jade">UTF-8 已通过</StatusPill>
          </div>
          {metadataTextIssue ? (
            <p id={metadataTextErrorId} className="knowledge-metadata-error" role="alert">{metadataTextIssue}</p>
          ) : null}

          <section className="knowledge-import-preflight" aria-labelledby={preflightTitleId}>
            <header>
              <div><p className="eyebrow">Local preflight</p><h3 ref={preflightTitleRef} id={preflightTitleId} tabIndex={-1}>写入前核对</h3></div>
              <StatusPill tone="warning">未核验 · 仅本机</StatusPill>
            </header>
            <div className="knowledge-preflight-grid">
              <article data-tone="pass">
                <span>FILE</span>
                <strong>{prepared.format === "markdown" ? "Markdown 载荷" : "纯文本载荷"}</strong>
                <small>{formatFileSize(prepared.byteSize)}；只保留叶文件名，不保存本机目录</small>
              </article>
              <article data-tone="pass">
                <span>DECODE</span>
                <strong>UTF-8 文本可读</strong>
                <small>{numberFormatter.format(prepared.lineCount)} 行，{numberFormatter.format(prepared.characterCount)} 字符</small>
              </article>
              <article data-tone={sourceFieldCount > 0 ? "info" : "pending"}>
                <span>PROVENANCE</span>
                <strong>{sourceFieldCount} / 6 项来源线索</strong>
                <small>{sourceFieldCount > 0 ? "将随文档保存，仍不等于已核验" : "可以留空，但会降低后续可追溯性"}</small>
              </article>
              <article data-tone="warning">
                <span>RIGHTS</span>
                <strong>未核验 / 仅本机</strong>
                <small>不获得再分发资格，也不成为专家真值</small>
              </article>
            </div>
            <div className="knowledge-import-identity" data-state={prepared.fingerprint ? "available" : "unavailable"}>
              <div className="knowledge-import-identity__heading">
                <div><span>SESSION CONTENT ID</span><strong>解码文本 SHA-256</strong></div>
                <StatusPill tone={prepared.fingerprint ? "info" : "warning"}>{prepared.fingerprint ? "本窗口防重开启" : "需人工查重"}</StatusPill>
              </div>
              <code>{safeVisibleText(prepared.fingerprint, "当前运行环境未提供 Web Crypto 内容摘要", 160)}</code>
              <p>{prepared.fingerprint ? "仅拦截本导入器本次挂载期间已成功写入的相同解码文本；不检查历史资料库，也不证明来源或内容真伪。" : "内容仍可按本机私有边界导入，但当前窗口无法自动识别重复文本，请先在资料库人工核对。"}</p>
            </div>
            <details className="knowledge-content-preview">
              <summary>
                <span>正文首段抽样</span>
                <small>{numberFormatter.format(prepared.characterCount)} 字符 · 仅在当前本机界面展示</small>
              </summary>
              <p>{safeVisibleText(prepared.preview, "正文预览不可显示。", 280)}</p>
            </details>
          </section>

          <div className="knowledge-import-form__section">
            <header>
              <div><p className="eyebrow">Bibliographic identity</p><h3>资料身份</h3></div>
              <StatusPill tone={!titleValidation.error ? "jade" : "warning"}>{!titleValidation.error ? "标题已填写" : "等待有效标题"}</StatusPill>
            </header>
            <div className="field-grid">
              <label className="field"><span>资料标题 <em>必填</em></span><input ref={titleInputRef} value={title} maxLength={200} required aria-invalid={titleValidation.error ? true : undefined} aria-describedby={titleValidation.error ? metadataTextErrorId : undefined} disabled={saving} onChange={(event) => { setTitle(event.target.value); setError(null); }} /></label>
              <label className="field"><span>作者</span><input value={author} maxLength={160} aria-invalid={authorValidation.error ? true : undefined} aria-describedby={authorValidation.error ? metadataTextErrorId : undefined} disabled={saving} onChange={(event) => { setAuthor(event.target.value); setError(null); }} /></label>
            </div>
            <div className="field-grid">
              <label className="field"><span>版本 / 版次</span><input value={edition} maxLength={120} aria-invalid={editionValidation.error ? true : undefined} aria-describedby={editionValidation.error ? metadataTextErrorId : undefined} disabled={saving} onChange={(event) => { setEdition(event.target.value); setError(null); }} /></label>
              <label className="field"><span>出版者</span><input value={publisher} maxLength={200} aria-invalid={publisherValidation.error ? true : undefined} aria-describedby={publisherValidation.error ? metadataTextErrorId : undefined} disabled={saving} onChange={(event) => { setPublisher(event.target.value); setError(null); }} /></label>
            </div>
          </div>

          <div className="knowledge-import-form__section">
            <header>
              <div><p className="eyebrow">Provenance notes</p><h3>来源与权利线索</h3></div>
              <StatusPill tone={sourceIssueCount > 0 ? "warning" : sourceFieldCount >= 3 ? "info" : "neutral"}>{sourceIssueCount > 0 ? `${sourceIssueCount} 项需修正` : `${sourceFieldCount} / 6 项有效`}</StatusPill>
            </header>
            <div className="knowledge-provenance-meter" data-count={sourceFieldCount}>
              <div>
                <span>TRACE FIELDS</span>
                <strong>来源线索覆盖</strong>
                <b>{sourceFieldCount} / 6</b>
              </div>
              <div
                className="knowledge-provenance-meter__segments"
                role="progressbar"
                aria-label="来源线索字段覆盖"
                aria-valuemin={0}
                aria-valuemax={6}
                aria-valuenow={sourceFieldCount}
                aria-valuetext={`${sourceFieldCount} 项格式有效但尚未核验的来源线索`}
              >
                {Array.from({ length: 6 }, (_, index) => <span key={index} data-filled={index < sourceFieldCount} />)}
              </div>
              <p>这里只计数已填写且格式有效的字段，不表示来源真实性、版权状态或专家审核进度。</p>
            </div>
            <div className="field-grid">
              <label className="field"><span>来源备注</span><input value={sourceNote} maxLength={500} aria-invalid={sourceNoteValidation.error ? true : undefined} aria-describedby={sourceNoteValidation.error ? metadataTextErrorId : undefined} disabled={saving} onChange={(event) => { setSourceNote(event.target.value); setError(null); }} placeholder="购入版本、整理者或使用限制" /></label>
              <label className="field">
                <span>出版年份</span>
                <input ref={publicationYearInputRef} type="number" inputMode="numeric" min="1" max="9999" step="1" value={publicationYear} aria-invalid={publicationYearValidation.error ? true : undefined} aria-describedby={publicationYearValidation.error ? publicationYearErrorId : undefined} disabled={saving} onChange={(event) => { setPublicationYear(event.target.value); setError(null); }} placeholder="例如 1936" />
                {publicationYearValidation.error ? <small id={publicationYearErrorId} className="knowledge-field-error">{publicationYearValidation.error}</small> : null}
              </label>
            </div>
            <label className="field">
              <span>来源网址</span>
              <input ref={sourceUrlInputRef} type="url" value={sourceUrl} maxLength={1_000} aria-invalid={sourceUrlValidation.error ? true : undefined} aria-describedby={sourceUrlValidation.error ? `${sourceUrlHintId} ${sourceUrlErrorId}` : sourceUrlHintId} disabled={saving} onChange={(event) => { setSourceUrl(event.target.value); setError(null); }} placeholder="https://…（可选）" />
              <small id={sourceUrlHintId} className="knowledge-field-hint">仅保存 HTTPS 地址，不接受 HTTP、其他协议或内嵌用户名与密码。</small>
              {sourceUrlValidation.error ? <small id={sourceUrlErrorId} className="knowledge-field-error">{sourceUrlValidation.error}</small> : null}
            </label>
            <p className="knowledge-local-only-note">这些书目信息只帮助你追溯来源，不会把资料提升为“公版已核验”或“允许随安装包分发”。</p>
          </div>

          <label className="knowledge-import-confirmation" data-state={privateUseConfirmed ? "confirmed" : "pending"} htmlFor={confirmationId}>
            <input
              ref={confirmationInputRef}
              id={confirmationId}
              type="checkbox"
              checked={privateUseConfirmed}
              required
              aria-describedby={confirmationNoteId}
              disabled={saving}
              onChange={(event) => setPrivateUseConfirmed(event.target.checked)}
            />
            <span>
              <strong>确认私有使用边界</strong>
              <small id={confirmationNoteId}>我确认有权在本机保存和研究此文件，并理解本次导入不会获得再分发、专家真值或公开发布资格。</small>
            </span>
          </label>

          <div className="journal-actions">
            <button type="submit" className="primary-action" disabled={!canSave} aria-busy={saving}><Save aria-hidden="true" />{saving ? "正在保存…" : mutationBlocked ? "等待其他写操作" : titleValidation.error ? "请填写有效标题" : sourceIssueCount > 0 ? "请修正来源格式" : !privateUseConfirmed ? "请先确认边界" : "确认导入"}</button>
            <button type="button" className="secondary-action" disabled={saving} onClick={reset}><RotateCcw aria-hidden="true" />重选文件</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
