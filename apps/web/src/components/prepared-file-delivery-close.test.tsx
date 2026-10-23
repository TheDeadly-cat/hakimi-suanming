import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportExportPort } from "@hakimi/platform";
import { PreparedFileDeliveryDialog, type PreparedFileArtifact } from "./prepared-file-delivery-dialog";
import { getPreparedFileDeliverySnapshot, resetPreparedFileDeliveryCoordinatorForTests } from "./prepared-file-delivery-coordinator";

const artifact: PreparedFileArtifact = {
  blob: new Blob(["synthetic local file"], { type: "text/plain" }),
  filename: "synthetic-delivery.txt", title: "合成交付文件", description: "仅用于核对关闭行为。", sharePolicy: "allowed"
};

function port() {
  return {
    getCapabilities: () => ({ canDownloadFiles: true, canChooseSaveLocation: false, canShareFiles: true }),
    saveFile: vi.fn<ReportExportPort["saveFile"]>().mockResolvedValue({
      status: "download_requested", filename: artifact.filename, method: "browser_download"
    }),
    shareFile: vi.fn<ReportExportPort["shareFile"]>().mockResolvedValue({
      status: "shared", filename: artifact.filename, method: "web_share"
    }),
    saveFileToChosenLocation: vi.fn<ReportExportPort["saveFileToChosenLocation"]>(),
    printReport: vi.fn<ReportExportPort["printReport"]>()
  } satisfies ReportExportPort;
}

beforeEach(() => resetPreparedFileDeliveryCoordinatorForTests());

describe("prepared file delivery can finish without authorizing a retry", () => {
  it.each(["download", "share"] as const)("acknowledges and closes %s without inventing completion or requesting it again", async (intent) => {
    const user = userEvent.setup();
    const delivery = port();
    const onClose = vi.fn();
    const onDeliveryResolution = vi.fn();
    render(<PreparedFileDeliveryDialog artifact={artifact} exportPort={delivery} onClose={onClose} onDeliveryResolution={onDeliveryResolution} />);
    await user.click(screen.getByRole("button", { name: intent === "download" ? /下载文件/ : /系统分享/ }));
    await waitFor(() => expect(onDeliveryResolution).toHaveBeenCalledTimes(1));
    const original = structuredClone(onDeliveryResolution.mock.calls[0]![0].result);
    expect(onDeliveryResolution.mock.calls[0]![0].resolution.kind).toBe("requested");
    await user.click(screen.getByRole("button", { name: intent === "download" ? "已核对文件并关闭" : "已核对接收并关闭" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getPreparedFileDeliverySnapshot().status).toBe("idle");
    expect(onDeliveryResolution).toHaveBeenCalledTimes(1);
    expect(onDeliveryResolution.mock.calls[0]![0].result).toEqual(original);
    expect(delivery.saveFile).toHaveBeenCalledTimes(intent === "download" ? 1 : 0);
    expect(delivery.shareFile).toHaveBeenCalledTimes(intent === "share" ? 1 : 0);
  });

  it.each(["requested", "uncertain"] as const)("closing an unchecked %s result retains the exact retry guard across remount", async (kind) => {
    const user = userEvent.setup();
    const delivery = port();
    if (kind === "uncertain") delivery.saveFile.mockRejectedValueOnce(new Error("synthetic interrupted call"));
    const onClose = vi.fn();
    const onDeliveryResolution = vi.fn();
    const first = render(<PreparedFileDeliveryDialog artifact={artifact} exportPort={delivery} onClose={onClose} onDeliveryResolution={onDeliveryResolution} />);
    await user.click(screen.getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(getPreparedFileDeliverySnapshot().status).toBe("manual_check_required"));
    const pending = getPreparedFileDeliverySnapshot();
    await user.click(screen.getByRole("button", { name: "暂不核对，关闭" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getPreparedFileDeliverySnapshot()).toBe(pending);
    first.unmount();
    const next = port();
    render(<PreparedFileDeliveryDialog artifact={{ ...artifact, blob: new Blob(["new synthetic file"]) }} exportPort={next} onClose={onClose} />);
    expect(screen.getByRole("button", { name: /下载文件/ }).hasAttribute("disabled")).toBe(true);
    expect(getPreparedFileDeliverySnapshot()).toBe(pending);
    expect(next.saveFile).not.toHaveBeenCalled();
    expect(delivery.saveFile).toHaveBeenCalledTimes(1);
    expect(onDeliveryResolution).toHaveBeenCalledTimes(kind === "requested" ? 1 : 0);
    const exit = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(exit)).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(getPreparedFileDeliverySnapshot()).toBe(pending);
  });

  it("acknowledges uncertainty and closes without producing a saved receipt", async () => {
    const user = userEvent.setup();
    const delivery = port();
    delivery.saveFile.mockRejectedValueOnce(new Error("synthetic interrupted call"));
    const onClose = vi.fn(), onDeliveryResolution = vi.fn();
    render(<PreparedFileDeliveryDialog artifact={artifact} exportPort={delivery} onClose={onClose} onDeliveryResolution={onDeliveryResolution} />);
    await user.click(screen.getByRole("button", { name: /下载文件/ }));
    await screen.findByText("不要直接重复交付");
    await user.click(screen.getByRole("button", { name: "已核对交付情况并关闭" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getPreparedFileDeliverySnapshot().status).toBe("idle");
    expect(delivery.saveFile).toHaveBeenCalledTimes(1);
    expect(onDeliveryResolution).not.toHaveBeenCalled();
  });
});
