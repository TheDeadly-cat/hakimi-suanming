import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installFileTransferPort,
  decodeUtf8Blob,
  pickFile,
  saveBlobFile,
  saveBlobFileToChosenLocation,
  saveTextFile,
  shareBlobFile,
  validateTransferFilename,
  webFileTransferPort,
  webReportExportPort,
  type FileTransferPort
} from "./index";

const restorePorts: Array<() => void> = [];
const originalNavigatorShare = Object.getOwnPropertyDescriptor(navigator, "share");
const originalNavigatorCanShare = Object.getOwnPropertyDescriptor(navigator, "canShare");
const originalShowSaveFilePicker = Object.getOwnPropertyDescriptor(window, "showSaveFilePicker");
const originalSecureContext = Object.getOwnPropertyDescriptor(globalThis, "isSecureContext");

function restoreNavigatorProperty(name: "share" | "canShare", descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(navigator, name, descriptor);
  else Reflect.deleteProperty(navigator, name);
}

function restoreGlobalProperty(target: object, name: string, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(target, name, descriptor);
  else Reflect.deleteProperty(target, name);
}

function installTestPort(overrides: Partial<FileTransferPort> = {}) {
  const port: FileTransferPort = {
    getCapabilities: () => ({ canDownloadFiles: true, canChooseSaveLocation: true, canShareFiles: false }),
    pickFile: vi.fn().mockResolvedValue({ status: "cancelled" }),
    saveFile: vi.fn().mockImplementation(async ({ filename }) => ({
      status: "saved" as const,
      filename,
      method: "native" as const
    })),
    shareFile: vi.fn().mockImplementation(async ({ filename }) => ({
      status: "unsupported" as const,
      filename,
      operation: "share" as const,
      reason: "test adapter does not share"
    })),
    ...overrides
  };
  restorePorts.push(installFileTransferPort(port));
  return port;
}

afterEach(() => {
  while (restorePorts.length) restorePorts.pop()?.();
  restoreNavigatorProperty("share", originalNavigatorShare);
  restoreNavigatorProperty("canShare", originalNavigatorCanShare);
  restoreGlobalProperty(window, "showSaveFilePicker", originalShowSaveFilePicker);
  restoreGlobalProperty(globalThis, "isSecureContext", originalSecureContext);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("web file transfer port", () => {
  it("reports an anchor click as download_requested and revokes the object URL", async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:single-chart");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const blob = new Blob(["report"], { type: "text/plain" });

    const result = await webFileTransferPort.saveFile({ filename: "report.txt", blob });

    expect(result).toEqual({
      status: "download_requested",
      filename: "report.txt",
      method: "browser_download"
    });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:single-chart");
    expect(document.querySelector("a[download='report.txt']")).toBeNull();
  });

  it("writes the exact Blob through a chosen location and reports saved only after close", async () => {
    Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const abort = vi.fn().mockResolvedValue(undefined);
    const createWritable = vi.fn().mockResolvedValue({ write, close, abort });
    const showSaveFilePicker = vi.fn().mockResolvedValue({ name: "已选择.json", createWritable });
    Object.defineProperty(window, "showSaveFilePicker", { configurable: true, value: showSaveFilePicker });
    const blob = new Blob(["{\"ok\":true}"], { type: "application/json;charset=utf-8" });

    const result = await webFileTransferPort.saveFile(
      { filename: "建议名称.json", blob },
      { destination: "chosen_location" }
    );

    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: "建议名称.json",
      types: [{ description: "JSON 文件", accept: { "application/json": [".json"] } }]
    });
    expect(createWritable).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(blob);
    expect(close).toHaveBeenCalledTimes(1);
    expect(write.mock.invocationCallOrder[0]).toBeLessThan(close.mock.invocationCallOrder[0]);
    expect(result).toEqual({
      status: "saved",
      filename: "已选择.json",
      method: "file_system_access",
      bytesWritten: blob.size
    });
  });

  it("does not download when the chosen-location picker is dismissed or blocked", async () => {
    Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("dismissed", "AbortError"))
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await expect(saveBlobFileToChosenLocation("backup.zip", new Blob(["zip"]))).resolves.toEqual({
      status: "cancelled",
      filename: "backup.zip",
      operation: "save",
      reason: "未选择保存位置，或浏览器阻止了该目标。"
    });
    expect(click).not.toHaveBeenCalled();
  });

  it("reports chosen-location save as unsupported outside a secure context", async () => {
    Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: false });
    const showSaveFilePicker = vi.fn();
    Object.defineProperty(window, "showSaveFilePicker", { configurable: true, value: showSaveFilePicker });

    await expect(saveBlobFileToChosenLocation("report.md", new Blob(["report"]))).resolves.toEqual({
      status: "unsupported",
      filename: "report.md",
      operation: "save",
      reason: "当前浏览器不支持选择保存位置；请改用下载文件。"
    });
    expect(webFileTransferPort.getCapabilities().canChooseSaveLocation).toBe(false);
    expect(showSaveFilePicker).not.toHaveBeenCalled();
  });

  it("aborts the temporary writer after a write failure and does not attempt close or download", async () => {
    Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
    const writeError = new Error("storage quota exhausted");
    const write = vi.fn().mockRejectedValue(writeError);
    const abort = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: vi.fn().mockResolvedValue({
        name: "report.md",
        createWritable: vi.fn().mockResolvedValue({ write, abort, close })
      })
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await expect(saveBlobFileToChosenLocation("report.md", new Blob(["report"]))).resolves.toEqual({
      status: "failed",
      filename: "report.md",
      operation: "save",
      stage: "write",
      reason: "storage quota exhausted"
    });
    expect(abort).toHaveBeenCalledWith(writeError);
    expect(close).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
  });

  it("treats close failure as failed and never claims or falls back to a saved download", async () => {
    Object.defineProperty(globalThis, "isSecureContext", { configurable: true, value: true });
    const closeError = new DOMException("safe browsing rejected", "AbortError");
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockRejectedValue(closeError);
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: vi.fn().mockResolvedValue({
        name: "report.md",
        createWritable: vi.fn().mockResolvedValue({ write, close, abort: vi.fn() })
      })
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const result = await saveBlobFileToChosenLocation("report.md", new Blob(["report"]));

    expect(result).toEqual({
      status: "failed",
      filename: "report.md",
      operation: "save",
      stage: "close",
      reason: "safe browsing rejected"
    });
    expect(click).not.toHaveBeenCalled();
  });

  it("returns the exact selected file through the runtime wrapper", async () => {
    const file = new File(["甲,乙"], "cases.csv", { type: "text/csv" });
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function click(this: HTMLInputElement) {
      Object.defineProperty(this, "files", { configurable: true, value: [file] });
      this.dispatchEvent(new Event("change"));
    });

    const result = await pickFile({ accept: ".csv,text/csv", maxBytes: 1024 });

    expect(result).toEqual({
      name: "cases.csv",
      size: file.size,
      type: "text/csv",
      blob: file
    });
    expect(document.querySelector("input[type='file']")).toBeNull();
  });

  it("maps a picker cancel to null and removes its temporary input", async () => {
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function click(this: HTMLInputElement) {
      this.dispatchEvent(new Event("cancel"));
    });

    await expect(pickFile({ accept: ".json" })).resolves.toBeNull();
    expect(document.querySelector("input[type='file']")).toBeNull();
  });

  it("rejects an oversized selection before returning its bytes", async () => {
    const file = new File(["oversized"], "large.txt", { type: "text/plain" });
    vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function click(this: HTMLInputElement) {
      Object.defineProperty(this, "files", { configurable: true, value: [file] });
      this.dispatchEvent(new Event("change"));
    });

    await expect(pickFile({ maxBytes: 2 })).rejects.toThrow("文件超过 0 MB 安全上限");
    expect(document.querySelector("input[type='file']")).toBeNull();
  });

  it("decodes text strictly and rejects malformed UTF-8 instead of inserting replacement characters", async () => {
    await expect(decodeUtf8Blob(new Blob([Uint8Array.from([0x68, 0x69])]))).resolves.toBe("hi");
    await expect(decodeUtf8Blob(new Blob([Uint8Array.from([0xc3, 0x28])]))).rejects.toThrow(
      "文件不是有效的 UTF-8 文本"
    );
  });

  it("shares a file only when the browser explicitly accepts file sharing", async () => {
    const canShare = vi.fn(() => true);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "canShare", { configurable: true, value: canShare });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    const result = await webFileTransferPort.shareFile({
      filename: "report.md",
      blob: new Blob(["# report"], { type: "text/markdown" }),
      title: "八字报告"
    });

    expect(result).toEqual({ status: "shared", filename: "report.md", method: "web_share" });
    expect(canShare).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "八字报告", files: [expect.any(File)] }));
  });

  it("returns unsupported without opening the share sheet when canShare rejects the file", async () => {
    const share = vi.fn();
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => false) });
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    const result = await webFileTransferPort.shareFile({
      filename: "backup.zip",
      blob: new Blob(["zip"], { type: "application/zip" })
    });

    expect(result.status).toBe("unsupported");
    expect(share).not.toHaveBeenCalled();
  });

  it("maps an explicit Web Share dismissal to cancelled", async () => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn(() => true) });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"))
    });

    await expect(webFileTransferPort.shareFile({
      filename: "report.md",
      blob: new Blob(["report"], { type: "text/markdown" })
    })).resolves.toEqual({ status: "cancelled", filename: "report.md", operation: "share" });
  });

  it("routes an explicit runtime share without invoking save", async () => {
    const shareFile = vi.fn().mockImplementation(async ({ filename }) => ({
      status: "shared" as const,
      filename,
      method: "native" as const
    }));
    const saveFile = vi.fn();
    installTestPort({ shareFile, saveFile });
    const blob = new Blob(["report"], { type: "text/markdown" });

    await expect(shareBlobFile("report.md", blob, "匿名报告")).resolves.toEqual({
      status: "shared",
      filename: "report.md",
      method: "native"
    });
    expect(shareFile).toHaveBeenCalledWith({ filename: "report.md", blob, title: "匿名报告" });
    expect(saveFile).not.toHaveBeenCalled();
  });

});

describe("runtime file adapter", () => {
  it("maps an injected picker cancellation to null and unsupported to an actionable error", async () => {
    const pickFilePort = vi.fn()
      .mockResolvedValueOnce({ status: "cancelled" })
      .mockResolvedValueOnce({ status: "unsupported", reason: "Android 文件桥未安装" });
    installTestPort({ pickFile: pickFilePort });

    await expect(pickFile()).resolves.toBeNull();
    await expect(pickFile()).rejects.toThrow("Android 文件桥未安装");
  });

  it("rejects path-like or control-character filenames before invoking an adapter", async () => {
    const saveFile = vi.fn();
    installTestPort({ saveFile });

    expect(() => validateTransferFilename("../backup.zip")).toThrow("不能包含路径或控制字符");
    expect(() => saveBlobFile("folder\\backup.zip", new Blob())).toThrow("不能包含路径或控制字符");
    expect(saveFile).not.toHaveBeenCalled();
  });

  it("routes text and Blob saves through the installed adapter without changing bytes", async () => {
    const saveFile = vi.fn().mockImplementation(async ({ filename }) => ({
      status: "saved" as const,
      filename,
      method: "native" as const
    }));
    installTestPort({ saveFile });

    await saveTextFile("settings.json", "{\"ok\":true}", "application/json");
    const binary = new Blob([Uint8Array.from([0x50, 0x4b])], { type: "application/zip" });
    await saveBlobFile("backup.zip", binary);

    expect(saveFile).toHaveBeenCalledTimes(2);
    expect(saveFile.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ filename: "settings.json" }));
    expect(await (saveFile.mock.calls[0]?.[0].blob as Blob).text()).toBe("{\"ok\":true}");
    expect(saveFile.mock.calls[1]?.[0]).toEqual({ filename: "backup.zip", blob: binary });
  });

  it("uses the active save adapter for reports instead of opening a share sheet", async () => {
    const saveFile = vi.fn().mockResolvedValue({
      status: "saved",
      filename: "report.txt",
      method: "native"
    });
    const shareFile = vi.fn();
    installTestPort({ saveFile, shareFile });
    const blob = new Blob(["report"], { type: "text/plain" });

    await expect(webReportExportPort.saveFile(blob, "report.txt")).resolves.toEqual({
      status: "saved",
      filename: "report.txt",
      method: "native"
    });
    expect(saveFile).toHaveBeenCalledWith({ filename: "report.txt", blob });
    expect(shareFile).not.toHaveBeenCalled();
  });

  it("keeps report chosen-location save and share as separate explicit intents", async () => {
    const saveFile = vi.fn().mockImplementation(async ({ filename }, options) => ({
      status: "saved" as const,
      filename,
      method: "native" as const,
      bytesWritten: options?.destination === "chosen_location" ? 6 : undefined
    }));
    const shareFile = vi.fn().mockImplementation(async ({ filename }) => ({
      status: "shared" as const,
      filename,
      method: "native" as const
    }));
    installTestPort({ saveFile, shareFile });
    const blob = new Blob(["report"]);

    await webReportExportPort.saveFileToChosenLocation(blob, "report.md");
    await webReportExportPort.shareFile(blob, "report.md", "匿名报告");

    expect(saveFile).toHaveBeenCalledWith(
      { filename: "report.md", blob },
      { destination: "chosen_location" }
    );
    expect(shareFile).toHaveBeenCalledWith({ filename: "report.md", blob, title: "匿名报告" });
  });

  it("waits for Web fonts before invoking the browser print surface", async () => {
    let releaseFonts: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => { releaseFonts = resolve; });
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);

    const printing = webReportExportPort.printReport();
    expect(print).not.toHaveBeenCalled();
    releaseFonts?.();
    await printing;

    expect(print).toHaveBeenCalledTimes(1);
  });
});
