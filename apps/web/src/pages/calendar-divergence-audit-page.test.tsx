import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarDivergenceAuditPage } from "./calendar-divergence-audit-page";

const {
  getCapabilitiesMock,
  pickTextFileMock,
  printReportMock,
  saveFileMock,
  saveFileToChosenLocationMock,
  saveTextFileMock,
  shareFileMock
} = vi.hoisted(() => ({
  getCapabilitiesMock: vi.fn(),
  pickTextFileMock: vi.fn(),
  printReportMock: vi.fn(),
  saveFileMock: vi.fn(),
  saveFileToChosenLocationMock: vi.fn(),
  saveTextFileMock: vi.fn(),
  shareFileMock: vi.fn()
}));

vi.mock("@hakimi/platform", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hakimi/platform")>()),
  saveTextFile: saveTextFileMock,
  pickTextFile: pickTextFileMock,
  webReportExportPort: {
    getCapabilities: getCapabilitiesMock,
    printReport: printReportMock,
    saveFile: saveFileMock,
    saveFileToChosenLocation: saveFileToChosenLocationMock,
    shareFile: shareFileMock
  }
}));

function rowFor(date: string): HTMLTableRowElement {
  const row = [...document.querySelectorAll<HTMLTableRowElement>("tbody tr")]
    .find((candidate) => candidate.textContent?.includes(date));
  if (!row) throw new Error(`missing row ${date}`);
  return row;
}

describe("CalendarDivergenceAuditPage", () => {
  beforeEach(() => {
    saveTextFileMock.mockReset().mockImplementation(async (filename: string) => ({
      status: "download_requested",
      filename,
      method: "browser_download"
    }));
    pickTextFileMock.mockReset();
    getCapabilitiesMock.mockReset().mockReturnValue({
      canDownloadFiles: true,
      canChooseSaveLocation: false,
      canShareFiles: false
    });
    printReportMock.mockReset().mockResolvedValue(undefined);
    saveFileMock.mockReset().mockImplementation(async (_blob: Blob, filename: string) => ({
      status: "download_requested",
      filename,
      method: "browser_download"
    }));
    saveFileToChosenLocationMock.mockReset();
    shareFileMock.mockReset();
  });

  it("只通过平台端口打印，并在适配器拒绝时显示可重试错误", async () => {
    printReportMock.mockRejectedValueOnce(new Error("打印适配器拒绝了当前请求。"));
    render(<CalendarDivergenceAuditPage />);

    const printButton = await screen.findByRole("button", { name: "打印当前工程视图" });
    fireEvent.click(printButton);

    expect((await screen.findByText("打印适配器拒绝了当前请求。")).closest("[role='alert']")).toBeTruthy();
    expect(printReportMock).toHaveBeenCalledTimes(1);

    fireEvent.click(printButton);
    await waitFor(() => expect(screen.queryByText("打印适配器拒绝了当前请求。")).toBeNull());
    expect(printReportMock).toHaveBeenCalledTimes(2);
  });

  it("验证冻结摘要后展示两个完整窗口、四路逐日观察和零金标边界", async () => {
    render(<CalendarDivergenceAuditPage />);

    expect(screen.getByRole("heading", { name: "连续历法差异审计" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("正在验证 64 日冻结窗口");
    expect(await screen.findByRole("heading", { name: "2089 年八月月首窗口" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "2097 年七月月首窗口" })).toBeTruthy();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(64);
    const page = document.querySelector<HTMLElement>(".calendar-divergence-audit-page");
    expect(page?.getAttribute("data-engineering-evidence-only")).toBe("true");
    expect(page?.getAttribute("data-verified-gold-delta")).toBe("0");
    expect(page?.getAttribute("data-curated-integration-eligible")).toBe("false");
    expect(screen.getByText(/USNO 是天文事件证据，不是第二份完整中国农历表/)).toBeTruthy();

    expect(rowFor("2089-09-03").textContent).toContain("2089-07-29");
    expect(rowFor("2089-09-03").textContent).toContain("控制日一致");
    expect(rowFor("2089-09-04").textContent).toContain("2089-08-01");
    expect(rowFor("2089-09-04").textContent).toContain("2089-07-30");
    expect(rowFor("2097-08-07").textContent).toContain("2097-07-01");
    expect(rowFor("2097-08-07").textContent).toContain("2097-06-30");
    expect(screen.getByText(/dataset sha256:52ab3d6af80ff086cb1db8b32bf1c14a8ff23f35602faedea48623804f50f931/)).toBeTruthy();
  });

  it("用真实交互筛选 60 日分歧与 7 个原始触发，不改写冻结数据", async () => {
    render(<CalendarDivergenceAuditPage />);

    const page = document.querySelector<HTMLElement>(".calendar-divergence-audit-page");
    const divergenceFilter = await screen.findByRole("button", { name: /连续分歧/ });
    fireEvent.click(divergenceFilter);
    expect(divergenceFilter.getAttribute("aria-pressed")).toBe("true");
    expect(page?.getAttribute("data-row-filter")).toBe("divergence");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(60);
    expect(document.querySelector("tbody tr.is-control")).toBeNull();

    const triggerFilter = screen.getByRole("button", { name: /原始触发/ });
    fireEvent.click(triggerFilter);
    expect(triggerFilter.getAttribute("aria-pressed")).toBe("true");
    expect(page?.getAttribute("data-row-filter")).toBe("trigger");
    expect(document.querySelectorAll("tbody tr")).toHaveLength(7);
    expect(screen.getByText("p003-18374")).toBeTruthy();
    expect(screen.getByText("p003-18221")).toBeTruthy();
  });

  it("明确分离 HKO、USNO、ICU 与 .NET 的证据角色", async () => {
    render(<CalendarDivergenceAuditPage />);

    await screen.findByRole("heading", { name: "2089 年八月月首窗口" });
    expect(screen.getAllByText("权威历表")).toHaveLength(2);
    expect(screen.getAllByText("政府天文事件")).toHaveLength(2);
    expect(screen.getAllByText("独立软件差分")).toHaveLength(2);
    expect(screen.getAllByText("当前适配器")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /HKO 不确定性备注/ }).getAttribute("href"))
      .toBe("https://www.hko.gov.hk/en/gts/time/conversion.htm");
    expect(screen.getByRole("heading", { name: /候选包 → 独立审核 A \/ B → 第三方裁决/ })).toBeTruthy();
    expect(screen.getByText("任何未决都阻止整合")).toBeTruthy();
  });

  it("准备、交付并绑定 64 日内容寻址候选包，同时保持双审和裁决按钮失败关闭", async () => {
    render(<CalendarDivergenceAuditPage />);

    expect(await screen.findByRole("button", { name: /预检独立审核 A/ })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /预检第三方裁决/ })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: /准备 64 日候选包/ }));
    const deliveryDialog = await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ });
    expect(document.querySelector(".calendar-divergence-audit-page")?.getAttribute("data-prepared-delivery")).toBe("ready");
    expect(document.querySelector(".calendar-divergence-audit-page")?.getAttribute("data-review-binding")).toBe("valid");

    fireEvent.click(within(deliveryDialog).getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(saveFileMock).toHaveBeenCalledTimes(1));
    const [blob, fileName] = saveFileMock.mock.calls[0] as [Blob, string];
    expect(fileName).toMatch(/^hakimi-calendar-divergence-review-\d{4}-\d{2}-\d{2}\.json$/);
    expect(await blob.text()).toContain('"datasetId":"hakimi-p0-03-calendar-divergence-windows-v1"');
    expect(blob.type).toBe("application/json;charset=utf-8");
    await waitFor(() => expect(deliveryDialog.getAttribute("data-delivery-state")).toBe("requested"));
    expect(saveTextFileMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /预检独立审核 A/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /预检独立审核 B/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /预检第三方裁决/ })).toHaveProperty("disabled", true);
    expect(screen.getByText(/identityVerified=false/)).toBeTruthy();
    expect(screen.getByText(/eligibleForCuratedIntegration=false/)).toBeTruthy();
  });
});
