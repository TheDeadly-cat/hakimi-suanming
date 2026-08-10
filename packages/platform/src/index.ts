export type PlatformKind = "web" | "android";

export type PlatformCapabilities = {
  kind: PlatformKind;
  canInstall: boolean;
  canDownloadFiles: boolean;
  canChooseSaveLocation: boolean;
  canShareFiles: boolean;
  canHandleNativeBack: boolean;
};

function supportsWebSavePicker(): boolean {
  return typeof window !== "undefined"
    && window.top === window
    && typeof (window as SaveFilePickerWindow).showSaveFilePicker === "function"
    && (typeof globalThis.isSecureContext === "undefined" || globalThis.isSecureContext);
}

function supportsWebFileShare(): boolean {
  return typeof navigator !== "undefined"
    && typeof navigator.share === "function"
    && typeof navigator.canShare === "function";
}

export const webPlatformCapabilities: PlatformCapabilities = {
  kind: "web",
  canInstall: typeof navigator !== "undefined" && "serviceWorker" in navigator,
  canDownloadFiles: typeof document !== "undefined",
  canChooseSaveLocation: supportsWebSavePicker(),
  canShareFiles: supportsWebFileShare(),
  canHandleNativeBack: false
};

export type PickedTextFile = {
  name: string;
  size: number;
  type: string;
  text: string;
};

export type PickedFile = {
  name: string;
  size: number;
  type: string;
  blob: Blob;
};

export type PickFileOptions = {
  accept?: string;
  maxBytes?: number;
};

export type PickTextFileOptions = PickFileOptions;

export type FilePayload = {
  filename: string;
  blob: Blob;
  title?: string;
};

export type FileTransferCapabilities = {
  canDownloadFiles: boolean;
  canChooseSaveLocation: boolean;
  canShareFiles: boolean;
};

export type FileSaveOptions = {
  destination?: "default" | "chosen_location";
};

export type FileSaveFailureStage = "download" | "pick" | "create_writable" | "write" | "close";

export type FilePickResult =
  | { status: "selected"; file: PickedFile }
  | { status: "cancelled" }
  | { status: "unsupported"; reason: string };

export type FileSaveResult =
  | { status: "saved"; filename: string; method: "native"; bytesWritten?: number }
  | { status: "saved"; filename: string; method: "file_system_access"; bytesWritten: number }
  | { status: "download_requested"; filename: string; method: "browser_download" }
  | { status: "cancelled"; filename: string; operation: "save"; reason?: string }
  | { status: "unsupported"; filename: string; operation: "save"; reason: string }
  | { status: "failed"; filename: string; operation: "save"; stage: FileSaveFailureStage; reason: string };

export type FileShareResult =
  | { status: "shared"; filename: string; method: "native" | "web_share" }
  | { status: "cancelled"; filename: string; operation: "share" }
  | { status: "unsupported"; filename: string; operation: "share"; reason: string }
  | { status: "failed"; filename: string; operation: "share"; stage: "share"; reason: string };

export type FileDeliveryResult = FileSaveResult | FileShareResult;

export type FileTransferPort = {
  getCapabilities(): FileTransferCapabilities;
  pickFile(options?: PickFileOptions): Promise<FilePickResult>;
  saveFile(payload: FilePayload, options?: FileSaveOptions): Promise<FileSaveResult>;
  shareFile(payload: FilePayload): Promise<FileShareResult>;
};

type SaveFilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: SaveFilePickerAcceptType[];
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
};

export function validateTransferFilename(filename: string): string {
  if (
    !filename
    || filename === "."
    || filename === ".."
    || filename.length > 255
    || /[\\/\u0000-\u001f\u007f]/.test(filename)
  ) {
    throw new Error("文件名必须是 1～255 个字符的普通文件名，不能包含路径或控制字符。");
  }
  return filename;
}

function errorMessage(reason: unknown, fallback: string): string {
  if (reason instanceof Error && reason.message) return reason.message;
  if (
    typeof reason === "object"
    && reason !== null
    && "message" in reason
    && typeof (reason as { message?: unknown }).message === "string"
    && (reason as { message: string }).message
  ) {
    return (reason as { message: string }).message;
  }
  return fallback;
}

function isAbortError(reason: unknown): boolean {
  return typeof reason === "object"
    && reason !== null
    && "name" in reason
    && (reason as { name?: unknown }).name === "AbortError";
}

function pickerOptions({ filename, blob }: FilePayload): SaveFilePickerOptions {
  const options: SaveFilePickerOptions = { suggestedName: filename };
  const extension = filename.match(/(\.[^.]+)$/)?.[1];
  const mimeType = blob.type.split(";", 1)[0]?.trim();
  if (
    extension
    && extension.length <= 16
    && /^\.[a-zA-Z0-9][a-zA-Z0-9._+-]*$/.test(extension)
    && mimeType
    && /^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/.test(mimeType)
  ) {
    options.types = [{ description: `${extension.slice(1).toUpperCase()} 文件`, accept: { [mimeType]: [extension] } }];
  }
  return options;
}

function saveFailure(
  filename: string,
  stage: FileSaveFailureStage,
  reason: unknown,
  fallback: string
): FileSaveResult {
  return {
    status: "failed",
    filename,
    operation: "save",
    stage,
    reason: errorMessage(reason, fallback)
  };
}

function pickWebFile(options: PickFileOptions = {}): Promise<FilePickResult> {
  if (typeof document === "undefined") {
    return Promise.resolve({ status: "unsupported", reason: "当前平台没有可用的文件选择器。" });
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.accept ?? ".json,application/json,text/plain";
    input.hidden = true;
    document.body.append(input);
    let settled = false;

    const finish = (value: FilePickResult) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ status: "cancelled" });
        return;
      }
      if (options.maxBytes !== undefined && file.size > options.maxBytes) {
        settled = true;
        input.remove();
        reject(new Error(`文件超过 ${Math.round(options.maxBytes / 1024 / 1024)} MB 安全上限。`));
        return;
      }
      finish({
        status: "selected",
        file: { name: file.name, size: file.size, type: file.type, blob: file }
      });
    }, { once: true });
    input.addEventListener("cancel", () => finish({ status: "cancelled" }), { once: true });
    input.click();
  });
}

async function requestWebDownload({ filename, blob }: FilePayload): Promise<FileSaveResult> {
  validateTransferFilename(filename);
  if (
    typeof document === "undefined"
    || typeof URL === "undefined"
    || typeof URL.createObjectURL !== "function"
    || typeof URL.revokeObjectURL !== "function"
  ) {
    return {
      status: "unsupported",
      filename,
      operation: "save",
      reason: "当前平台不支持浏览器文件下载。"
    };
  }

  let url: string | null = null;
  let anchor: HTMLAnchorElement | null = null;
  try {
    url = URL.createObjectURL(blob);
    anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    return { status: "download_requested", filename, method: "browser_download" };
  } catch (reason) {
    return saveFailure(filename, "download", reason, "浏览器没有接受文件下载请求。");
  } finally {
    anchor?.remove();
    if (url) {
      const revokeUrl = url;
      globalThis.setTimeout(() => URL.revokeObjectURL(revokeUrl), 0);
    }
  }
}

async function saveWebFileToChosenLocation(payload: FilePayload): Promise<FileSaveResult> {
  const filename = validateTransferFilename(payload.filename);
  const picker = typeof window !== "undefined"
    ? (window as SaveFilePickerWindow).showSaveFilePicker
    : undefined;
  if (typeof picker !== "function" || !supportsWebSavePicker()) {
    return {
      status: "unsupported",
      filename,
      operation: "save",
      reason: "当前浏览器不支持选择保存位置；请改用下载文件。"
    };
  }

  let handle: FileSystemFileHandle;
  try {
    handle = await picker.call(window, pickerOptions(payload));
  } catch (reason) {
    if (isAbortError(reason)) {
      return {
        status: "cancelled",
        filename,
        operation: "save",
        reason: "未选择保存位置，或浏览器阻止了该目标。"
      };
    }
    return saveFailure(filename, "pick", reason, "浏览器未能打开保存位置选择器。");
  }

  const selectedFilename = handle.name && !/[\\/\u0000-\u001f\u007f]/.test(handle.name)
    ? handle.name
    : filename;
  let writable: FileSystemWritableFileStream;
  try {
    writable = await handle.createWritable();
  } catch (reason) {
    return saveFailure(selectedFilename, "create_writable", reason, "浏览器未授予文件写入权限。");
  }

  try {
    await writable.write(payload.blob);
  } catch (reason) {
    try {
      await writable.abort(reason);
    } catch {
      // Preserve the original write failure as the actionable result.
    }
    return saveFailure(selectedFilename, "write", reason, "文件内容写入失败。");
  }

  try {
    await writable.close();
  } catch (reason) {
    return saveFailure(selectedFilename, "close", reason, "浏览器未能完成文件提交。");
  }

  return {
    status: "saved",
    filename: selectedFilename,
    method: "file_system_access",
    bytesWritten: payload.blob.size
  };
}

async function shareWebFile({ filename, blob, title }: FilePayload): Promise<FileShareResult> {
  validateTransferFilename(filename);
  if (
    typeof navigator === "undefined"
    || typeof navigator.share !== "function"
    || typeof navigator.canShare !== "function"
    || typeof File === "undefined"
  ) {
    return {
      status: "unsupported",
      filename,
      operation: "share",
      reason: "当前平台不支持文件分享。"
    };
  }

  const file = new File([blob], filename, {
    type: blob.type || "application/octet-stream",
    lastModified: Date.now()
  });
  const shareData: ShareData = { files: [file], title: title ?? filename };
  if (!navigator.canShare(shareData)) {
    return {
      status: "unsupported",
      filename,
      operation: "share",
      reason: "当前平台的分享面板不接受此文件。"
    };
  }

  try {
    await navigator.share(shareData);
    return { status: "shared", filename, method: "web_share" };
  } catch (reason) {
    if (isAbortError(reason)) return { status: "cancelled", filename, operation: "share" };
    return {
      status: "failed",
      filename,
      operation: "share",
      stage: "share",
      reason: errorMessage(reason, "当前平台未能打开文件分享面板。")
    };
  }
}

/**
 * Browser adapter. A download click is deliberately reported as
 * `download_requested`, never as `saved`: only the user/browser can confirm
 * that the file reached durable storage.
 */
export const webFileTransferPort: FileTransferPort = {
  getCapabilities() {
    return {
      canDownloadFiles: typeof document !== "undefined",
      canChooseSaveLocation: supportsWebSavePicker(),
      canShareFiles: supportsWebFileShare()
    };
  },
  pickFile: pickWebFile,
  saveFile(payload, options) {
    return options?.destination === "chosen_location"
      ? saveWebFileToChosenLocation(payload)
      : requestWebDownload(payload);
  },
  shareFile: shareWebFile
};

let installedFileTransferPort: FileTransferPort | null = null;

/**
 * Installs a runtime adapter before rendering the app. The Android shell can
 * provide SAF/Filesystem/Share implementations without changing research UI.
 * The returned disposer keeps tests and nested runtime scopes deterministic.
 */
export function installFileTransferPort(port: FileTransferPort): () => void {
  const previous = installedFileTransferPort;
  installedFileTransferPort = port;
  return () => {
    if (installedFileTransferPort === port) installedFileTransferPort = previous;
  };
}

export function getFileTransferPort(): FileTransferPort {
  return installedFileTransferPort ?? webFileTransferPort;
}

export function getFileTransferCapabilities(): FileTransferCapabilities {
  return getFileTransferPort().getCapabilities();
}

export async function pickFile(options: PickFileOptions = {}): Promise<PickedFile | null> {
  const result = await getFileTransferPort().pickFile(options);
  if (result.status === "selected") {
    validateTransferFilename(result.file.name);
    return result.file;
  }
  if (result.status === "cancelled") return null;
  throw new Error(result.reason);
}

export async function decodeUtf8Blob(blob: Blob): Promise<string> {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(await blob.arrayBuffer());
  } catch (reason) {
    throw new Error("文件不是有效的 UTF-8 文本。", { cause: reason });
  }
}

/**
 * Backward-compatible text boundary for JSON/settings imports. Large-file callers that can defer
 * decoding to a Worker should use `pickFile` and keep the returned Blob intact instead.
 */
export async function pickTextFile(options: PickTextFileOptions = {}): Promise<PickedTextFile | null> {
  const picked = await pickFile(options);
  if (!picked) return null;
  const text = await decodeUtf8Blob(picked.blob);
  return { name: picked.name, size: picked.size, type: picked.type, text };
}

export function saveBlobFile(filename: string, blob: Blob): Promise<FileSaveResult> {
  return getFileTransferPort().saveFile({ filename: validateTransferFilename(filename), blob });
}

export function saveBlobFileToChosenLocation(filename: string, blob: Blob): Promise<FileSaveResult> {
  return getFileTransferPort().saveFile(
    { filename: validateTransferFilename(filename), blob },
    { destination: "chosen_location" }
  );
}

export function saveTextFile(filename: string, content: string, mimeType: string): Promise<FileSaveResult> {
  return saveBlobFile(filename, new Blob([content], { type: mimeType }));
}

export function shareBlobFile(filename: string, blob: Blob, title?: string): Promise<FileShareResult> {
  return getFileTransferPort().shareFile({ filename: validateTransferFilename(filename), blob, title });
}

export type ReportExportPort = {
  getCapabilities(): FileTransferCapabilities;
  printReport(): Promise<void>;
  saveFile(blob: Blob, filename: string): Promise<FileSaveResult>;
  saveFileToChosenLocation(blob: Blob, filename: string): Promise<FileSaveResult>;
  shareFile(blob: Blob, filename: string, title?: string): Promise<FileShareResult>;
};

/**
 * Web report adapter resolves the active file port at call time. Saving and
 * sharing stay separate user intents: an export button must not unexpectedly
 * open a share sheet. Android can install a native adapter before rendering
 * while reports remain platform-free.
 */
export const webReportExportPort: ReportExportPort = {
  getCapabilities: getFileTransferCapabilities,
  async printReport() {
    if (typeof window === "undefined" || typeof window.print !== "function") {
      throw new Error("当前平台不支持打印或保存 PDF。");
    }
    if (typeof document !== "undefined" && document.fonts) await document.fonts.ready;
    window.print();
  },
  saveFile(blob, filename) {
    return saveBlobFile(filename, blob);
  },
  saveFileToChosenLocation(blob, filename) {
    return saveBlobFileToChosenLocation(filename, blob);
  },
  shareFile(blob, filename, title) {
    return shareBlobFile(filename, blob, title);
  }
};
