import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarDivergenceAuditPage } from "./calendar-divergence-audit-page";

const { saveTextFileMock, pickTextFileMock } = vi.hoisted(() => ({
  saveTextFileMock: vi.fn(),
  pickTextFileMock: vi.fn()
}));

vi.mock("@hakimi/platform", () => ({
  saveTextFile: saveTextFileMock,
  pickTextFile: pickTextFileMock
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
  });

  it("验证冻结摘要后展示两个完整窗口、四路逐日观察和零金标边界", async () => {
    render(<CalendarDivergenceAuditPage />);

    expect(screen.getByRole("heading", { name: "连续历法差异审计" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("正在验证 64 日冻结窗口");
    expect(await screen.findByRole("heading", { name: "2089 年八月月首窗口" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "2097 年七月月首窗口" })).toBeTruthy();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(64);
    expect(screen.getByText("verified +0")).toBeTruthy();
    expect(screen.getByText("engineering diagnostic · unresolved")).toBeTruthy();
    expect(screen.getByText("不占用 360 金标配额")).toBeTruthy();
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

    const divergenceFilter = await screen.findByRole("button", { name: "只看 60 日分歧" });
    fireEvent.click(divergenceFilter);
    expect(divergenceFilter.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/当前显示 60 日；筛选不会改变冻结数据/)).toBeTruthy();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(60);
    expect(document.querySelector("tbody tr.is-control")).toBeNull();

    const triggerFilter = screen.getByRole("button", { name: "只看 7 个原始触发" });
    fireEvent.click(triggerFilter);
    expect(triggerFilter.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/当前显示 7 日；筛选不会改变冻结数据/)).toBeTruthy();
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

  it("导出并载入 64 日内容寻址候选包，同时保持双审和裁决按钮失败关闭", async () => {
    render(<CalendarDivergenceAuditPage />);

    expect(await screen.findByRole("button", { name: /预检独立审核 A/ })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: /预检第三方裁决/ })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: /导出 64 日候选包/ }));
    await waitFor(() => expect(saveTextFileMock).toHaveBeenCalledTimes(1));
    const [fileName, raw, mediaType] = saveTextFileMock.mock.calls[0] as [string, string, string];
    expect(fileName).toMatch(/^hakimi-calendar-divergence-review-\d{4}-\d{2}-\d{2}\.json$/);
    expect(raw).toContain('"datasetId":"hakimi-p0-03-calendar-divergence-windows-v1"');
    expect(mediaType).toBe("application/json;charset=utf-8");
    expect(screen.getByText(/已请求浏览器下载.*已载入内容寻址的 64 日候选包/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /预检独立审核 A/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /预检独立审核 B/ })).toHaveProperty("disabled", false);
    expect(screen.getByRole("button", { name: /预检第三方裁决/ })).toHaveProperty("disabled", true);
    expect(screen.getByText(/identityVerified=false/)).toBeTruthy();
    expect(screen.getByText(/eligibleForCuratedIntegration=false/)).toBeTruthy();
  });
});
