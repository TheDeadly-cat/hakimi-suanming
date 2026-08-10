import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PairStructureResearchProjection } from "@hakimi/contracts";
import type {
  FileSaveResult,
  FileShareResult,
  FileTransferCapabilities,
  ReportExportPort
} from "@hakimi/platform";
import { PairStructureReportExport } from "./pair-structure-report-export";

const mocks = vi.hoisted(() => ({
  exportAnonymous: vi.fn(),
  exportFull: vi.fn()
}));

vi.mock("@hakimi/research-export", () => ({
  exportPairStructureAnonymousMarkdown: mocks.exportAnonymous,
  exportPairStructureFullAuditJson: mocks.exportFull
}));

const projection = {
  manifest: { resultHash: "a".repeat(64) }
} as PairStructureResearchProjection;

const alternateProjection = {
  manifest: { resultHash: "b".repeat(64) }
} as PairStructureResearchProjection;

let saveFile: ReturnType<typeof vi.fn<(blob: Blob, filename: string) => Promise<FileSaveResult>>>;
let saveFileToChosenLocation: ReturnType<typeof vi.fn<(blob: Blob, filename: string) => Promise<FileSaveResult>>>;
let shareFile: ReturnType<typeof vi.fn<(blob: Blob, filename: string, title?: string) => Promise<FileShareResult>>>;
let getCapabilities: ReturnType<typeof vi.fn<() => FileTransferCapabilities>>;
let exportPort: ReportExportPort;

beforeEach(() => {
  saveFile = vi.fn<(blob: Blob, filename: string) => Promise<FileSaveResult>>().mockImplementation(async (_blob, filename) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  saveFileToChosenLocation = vi.fn<(blob: Blob, filename: string) => Promise<FileSaveResult>>().mockImplementation(async (blob, filename) => ({
    status: "saved",
    filename,
    method: "file_system_access",
    bytesWritten: blob.size
  }));
  shareFile = vi.fn<(blob: Blob, filename: string, title?: string) => Promise<FileShareResult>>().mockImplementation(async (_blob, filename) => ({
    status: "shared",
    filename,
    method: "web_share"
  }));
  getCapabilities = vi.fn<() => FileTransferCapabilities>().mockReturnValue({
    canDownloadFiles: true,
    canChooseSaveLocation: true,
    canShareFiles: true
  });
  exportPort = {
    getCapabilities,
    saveFile,
    saveFileToChosenLocation,
    shareFile,
    printReport: vi.fn()
  };
  mocks.exportAnonymous.mockReset().mockResolvedValue({
    content: "# 匿名双案例\n",
    mimeType: "text/markdown;charset=utf-8",
    suggestedFileName: "pair-anonymous.md"
  });
  mocks.exportFull.mockReset().mockResolvedValue({
    content: "{\"kind\":\"pair\"}\n",
    mimeType: "application/json;charset=utf-8",
    suggestedFileName: "pair-full.json"
  });
});

describe("PairStructureReportExport", () => {
  it("默认匿名可直接导出，完整审计必须先逐次确认", async () => {
    render(<PairStructureReportExport projection={projection} exportPort={exportPort} />);

    const anonymousButton = screen.getByRole("button", { name: "导出匿名双案例 Markdown" });
    const fullButton = screen.getByRole("button", { name: "导出完整审计 JSON" });
    const confirmation = screen.getByRole("checkbox", { name: /我确认这是包含两位对象可识别资料/ });
    expect((anonymousButton as HTMLButtonElement).disabled).toBe(false);
    expect((fullButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/76 项系统事实和各自六层活动节点/)).toBeTruthy();

    fireEvent.click(anonymousButton);
    expect(await screen.findByRole("dialog", { name: "文件已在本机生成" })).toBeTruthy();
    expect(saveFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "下载文件" }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    expect(mocks.exportAnonymous).toHaveBeenCalledWith(projection);
    expect(saveFile.mock.calls[0][1]).toBe("pair-anonymous.md");
    expect(await (saveFile.mock.calls[0][0] as Blob).text()).toBe("# 匿名双案例\n");
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "文件已在本机生成" })).toBeNull());

    fireEvent.click(confirmation);
    expect((fullButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(fullButton);
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(2));
    expect(mocks.exportFull).toHaveBeenCalledWith(
      projection,
      { acknowledgedSensitiveData: true }
    );
    expect(saveFile.mock.calls[1][1]).toBe("pair-full.json");
    expect((confirmation as HTMLInputElement).checked).toBe(false);
    expect((fullButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("再次导出前需要重新确认");
  });

  it("匿名文件的下载、指定位置保存和分享复用同一个已冻结 Blob", async () => {
    render(<PairStructureReportExport projection={projection} exportPort={exportPort} />);

    fireEvent.click(screen.getByRole("button", { name: "导出匿名双案例 Markdown" }));
    await screen.findByRole("dialog", { name: "文件已在本机生成" });

    fireEvent.click(screen.getByRole("button", { name: "系统分享" }));
    await waitFor(() => expect(shareFile).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "保存到指定位置" }));
    await waitFor(() => expect(saveFileToChosenLocation).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "下载文件" }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));

    const frozenBlob = shareFile.mock.calls[0][0];
    expect(saveFileToChosenLocation.mock.calls[0][0]).toBe(frozenBlob);
    expect(saveFile.mock.calls[0][0]).toBe(frozenBlob);
    expect(await frozenBlob.text()).toBe("# 匿名双案例\n");
    expect(shareFile.mock.calls[0].slice(1)).toEqual([
      "pair-anonymous.md",
      "匿名双案例 Markdown"
    ]);
  });

  it("取消匿名文件分享时保留弹层以便重试，且不静默改为下载或保存", async () => {
    shareFile
      .mockResolvedValueOnce({
        status: "cancelled",
        filename: "pair-anonymous.md",
        operation: "share"
      })
      .mockResolvedValueOnce({
        status: "shared",
        filename: "pair-anonymous.md",
        method: "web_share"
      });
    render(<PairStructureReportExport projection={projection} exportPort={exportPort} />);

    fireEvent.click(screen.getByRole("button", { name: "导出匿名双案例 Markdown" }));
    await screen.findByRole("dialog", { name: "文件已在本机生成" });
    fireEvent.click(screen.getByRole("button", { name: "系统分享" }));

    expect((await screen.findByRole("status")).textContent).toContain("已取消匿名双案例 Markdown分享操作");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(saveFile).not.toHaveBeenCalled();
    expect(saveFileToChosenLocation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "系统分享" }));
    await waitFor(() => expect(shareFile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("已交给系统分享面板"));
  });

  it("分享失败时明确显示错误且不静默回退为浏览器下载", async () => {
    shareFile.mockResolvedValueOnce({
      status: "failed",
      filename: "pair-anonymous.md",
      operation: "share",
      stage: "share",
      reason: "系统分享服务拒绝了这份文件。"
    });
    render(<PairStructureReportExport projection={projection} exportPort={exportPort} />);

    fireEvent.click(screen.getByRole("button", { name: "导出匿名双案例 Markdown" }));
    await screen.findByRole("dialog", { name: "文件已在本机生成" });
    fireEvent.click(screen.getByRole("button", { name: "系统分享" }));

    expect((await screen.findByRole("alert")).textContent).toContain("系统分享服务拒绝了这份文件");
    expect(shareFile).toHaveBeenCalledTimes(1);
    expect(saveFile).not.toHaveBeenCalled();
    expect(saveFileToChosenLocation).not.toHaveBeenCalled();
  });

  it("验签失败时显示 alert 且不触发下载", async () => {
    mocks.exportAnonymous.mockRejectedValueOnce(new Error("双案例结构研究投影摘要或内层事实不一致。"));
    render(<PairStructureReportExport projection={projection} exportPort={exportPort} />);

    fireEvent.click(screen.getByRole("button", { name: "导出匿名双案例 Markdown" }));

    expect((await screen.findByRole("alert")).textContent).toContain("投影摘要或内层事实不一致");
    expect(saveFile).not.toHaveBeenCalled();
  });

  it("取消敏感文件保存时不显示成功且保留本次确认以便重试", async () => {
    saveFile.mockResolvedValueOnce({
      status: "cancelled",
      filename: "pair-full.json",
      operation: "save"
    });
    render(<PairStructureReportExport projection={projection} exportPort={exportPort} />);
    const confirmation = screen.getByRole<HTMLInputElement>("checkbox", { name: /我确认这是包含两位对象可识别资料/ });
    fireEvent.click(confirmation);

    fireEvent.click(screen.getByRole("button", { name: "导出完整审计 JSON" }));

    expect((await screen.findByRole("status")).textContent).toContain("已取消完整审计文件导出操作");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(confirmation.checked).toBe(true);
    expect(screen.getByRole("button", { name: "导出完整审计 JSON" })).toHaveProperty("disabled", false);
  });

  it("校验期间禁用所有导出动作并给出文字进度", async () => {
    let resolveOutput!: (value: unknown) => void;
    mocks.exportAnonymous.mockReturnValueOnce(new Promise((resolve) => { resolveOutput = resolve; }));
    render(<PairStructureReportExport projection={projection} exportPort={exportPort} />);

    fireEvent.click(screen.getByRole("button", { name: "导出匿名双案例 Markdown" }));
    expect((await screen.findByRole("button", { name: "正在校验匿名报告" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "导出完整审计 JSON" }) as HTMLButtonElement).disabled).toBe(true);

    resolveOutput({
      content: "done",
      mimeType: "text/markdown;charset=utf-8",
      suggestedFileName: "done.md"
    });
    expect(await screen.findByRole("dialog", { name: "文件已在本机生成" })).toBeTruthy();
    expect(saveFile).not.toHaveBeenCalled();
  });

  it("投影摘要变化后通过组件 key 清空敏感确认", () => {
    const { rerender } = render(
      <PairStructureReportExport key={projection.manifest.resultHash} projection={projection} exportPort={exportPort} />
    );
    const confirmation = screen.getByRole("checkbox", { name: /我确认这是包含两位对象可识别资料/ });
    fireEvent.click(confirmation);
    expect((confirmation as HTMLInputElement).checked).toBe(true);

    rerender(
      <PairStructureReportExport
        key={alternateProjection.manifest.resultHash}
        projection={alternateProjection}
        exportPort={exportPort}
      />
    );
    expect((screen.getByRole("checkbox", { name: /我确认这是包含两位对象可识别资料/ }) as HTMLInputElement).checked).toBe(false);
  });
});
