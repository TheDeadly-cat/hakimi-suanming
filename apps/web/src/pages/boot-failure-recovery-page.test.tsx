import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportExportPort } from "@hakimi/platform";
import type {
  PreparedFileArtifact,
  PreparedFileDeliveryResolution
} from "../components/prepared-file-delivery-dialog";
import type { AppBootFailure } from "../lib/app-boot-failure";
import { BootFailureRecoveryPage } from "./boot-failure-recovery-page";

type DeliveryDialogProps = Readonly<{
  artifact: PreparedFileArtifact;
  exportPort: ReportExportPort;
  onClose(): void;
  onDeliveryResolution?(event: PreparedFileDeliveryResolution): void;
}>;

const mocks = vi.hoisted(() => {
  const saveFile = vi.fn();
  const saveFileToChosenLocation = vi.fn();
  const shareFile = vi.fn();
  return {
    createFullBackupArtifactOffMainThread: vi.fn(),
    readFullDataSnapshot: vi.fn(),
    dialogProps: [] as unknown[],
    saveFile,
    saveFileToChosenLocation,
    shareFile,
    webReportExportPort: {
      getCapabilities: vi.fn(() => ({
        canDownloadFiles: true,
        canChooseSaveLocation: true,
        canShareFiles: true
      })),
      printReport: vi.fn(async () => undefined),
      saveFile,
      saveFileToChosenLocation,
      shareFile
    }
  };
});

vi.mock("@hakimi/platform", () => ({
  webReportExportPort: mocks.webReportExportPort
}));

vi.mock("@hakimi/storage", () => ({
  caseRepository: {
    readFullDataSnapshot: mocks.readFullDataSnapshot
  }
}));

vi.mock("../lib/full-backup-worker-client", () => ({
  createFullBackupArtifactOffMainThread: mocks.createFullBackupArtifactOffMainThread
}));

vi.mock("../components/prepared-file-delivery-dialog", () => ({
  PreparedFileDeliveryDialog: (props: DeliveryDialogProps) => {
    mocks.dialogProps.push(props);
    return (
      <section
        role="dialog"
        aria-label={props.artifact.title}
        data-share-policy={props.artifact.sharePolicy}
      >
        <span>{props.artifact.filename}</span>
      </section>
    );
  }
}));

function bootFailure(
  storageReady: boolean,
  source: AppBootFailure["source"] = "calculation"
): AppBootFailure {
  return {
    storageReady,
    source,
    error: new TypeError(`${source} failed`)
  };
}

function latestDialogProps(): DeliveryDialogProps {
  const props = mocks.dialogProps.at(-1);
  if (!props) throw new Error("Prepared delivery dialog was not rendered.");
  return props as DeliveryDialogProps;
}

async function preparedDialog(): Promise<DeliveryDialogProps> {
  await screen.findByRole("dialog");
  return latestDialogProps();
}

function emitResolution(
  props: DeliveryDialogProps,
  event: PreparedFileDeliveryResolution
): void {
  act(() => props.onDeliveryResolution?.(event));
}

function completedEvent(
  props: DeliveryDialogProps,
  artifact: PreparedFileArtifact = props.artifact
): PreparedFileDeliveryResolution {
  return {
    artifact,
    intent: "download",
    result: {
      status: "saved",
      filename: props.artifact.filename,
      method: "native",
      bytesWritten: props.artifact.blob.size
    },
    resolution: {
      kind: "completed",
      message: `${props.artifact.filename} 已由当前平台确认写入。`
    }
  };
}

function requestedEvent(props: DeliveryDialogProps): PreparedFileDeliveryResolution {
  return {
    artifact: props.artifact,
    intent: "download",
    result: {
      status: "download_requested",
      filename: props.artifact.filename,
      method: "browser_download"
    },
    resolution: {
      kind: "requested",
      message: `${props.artifact.filename} 已请求浏览器下载。`
    }
  };
}

function cancelledEvent(props: DeliveryDialogProps): PreparedFileDeliveryResolution {
  return {
    artifact: props.artifact,
    intent: "download",
    result: {
      status: "cancelled",
      filename: props.artifact.filename,
      operation: "save"
    },
    resolution: {
      kind: "cancelled",
      message: "已取消启动诊断保存；系统没有报告该操作成功。"
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dialogProps.length = 0;
  mocks.readFullDataSnapshot.mockReset().mockResolvedValue({ snapshot: "read-only" });
  const blob = new Blob([new Uint8Array([80, 75, 3, 4])], { type: "application/zip" });
  mocks.createFullBackupArtifactOffMainThread.mockReset().mockResolvedValue({
    blob,
    payloadDigest: "8b7e41c6c8f70b3db8fbc39173a6ca15299b980809ac3230f60b8f2d52a9751d",
    outputByteLength: blob.size,
    canonicalJsonByteLength: 2048
  });
  delete document.documentElement.dataset.appBootReady;
  delete document.documentElement.dataset.swBootSignalSent;
});

describe("BootFailureRecoveryPage", () => {
  it("只生成冻结的最小诊断，不在生成阶段调用任何文件交付端口", async () => {
    const { container } = render(
      <BootFailureRecoveryPage failure={bootFailure(true)} view="diagnostic" />
    );
    expect(screen.getAllByText(/legacy-v13 \/ Schema 13/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "生成启动诊断 JSON" }));

    const dialog = await preparedDialog();
    expect(dialog.exportPort).toBe(mocks.webReportExportPort);
    expect(dialog.artifact.sharePolicy).toBe("blocked_sensitive");
    expect(dialog.artifact.filename).toMatch(/^hakimi-boot-failure-diagnostic-\d{4}-\d{2}-\d{2}\.json$/u);
    expect(dialog.artifact.blob.type).toBe("application/json;charset=utf-8");
    expect(mocks.saveFile).not.toHaveBeenCalled();
    expect(mocks.saveFileToChosenLocation).not.toHaveBeenCalled();
    expect(mocks.shareFile).not.toHaveBeenCalled();
    expect(mocks.readFullDataSnapshot).not.toHaveBeenCalled();

    const raw = await dialog.artifact.blob.text();
    const diagnostic = JSON.parse(raw);
    expect(diagnostic).toMatchObject({
      format: "hakimi-boot-failure-diagnostic",
      formatVersion: "1.0.0",
      containsUserResearchData: false,
      release: {
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null,
        evidenceBound: false,
        engineeringEvidenceOnly: true
      },
      readiness: { storageReadinessConfirmed: true },
      failure: {
        source: "calculation",
        errorName: "TypeError",
        messageCode: "HAKIMI_BOOT_CALCULATION",
        message: "The deterministic calculation smoke test did not pass."
      }
    });
    expect(raw).not.toContain("caseId");
    expect(raw).not.toContain("calculation failed");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-file-delivery-certainty")).toBe("prepared");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-preservation-state")).toBe("pending");
  });

  it("只接受 exact 当前诊断工件的 validated requested，并且不把下载请求写成 saved", async () => {
    const { container } = render(
      <BootFailureRecoveryPage failure={bootFailure(false)} view="diagnostic" />
    );
    fireEvent.click(screen.getByRole("button", { name: "生成启动诊断 JSON" }));
    const dialog = await preparedDialog();

    emitResolution(dialog, {
      artifact: dialog.artifact,
      intent: "share",
      result: {
        status: "shared",
        filename: dialog.artifact.filename,
        method: "native"
      },
      resolution: {
        kind: "requested",
        message: "不应接受的分享回执"
      }
    });
    expect(container.querySelector(".boot-recovery-receipt")).toBeNull();
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-preservation-state")).toBe("pending");

    emitResolution(dialog, requestedEvent(dialog));

    expect(await screen.findByText("启动诊断已请求下载")).toBeTruthy();
    expect(screen.queryByText("启动诊断已保存")).toBeNull();
    expect(container.querySelector(".boot-recovery-receipt")?.getAttribute("data-delivery")).toBe("requested");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-file-delivery-certainty")).toBe("requested");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-preservation-state")).toBe("requested");
    expect(container.querySelector(".boot-recovery-receipt > p")?.textContent).toContain("不证明文件已落盘");
  });

  it("取消 exact 当前诊断交付时保留工件且不推进 preservation checkpoint", async () => {
    const { container } = render(
      <BootFailureRecoveryPage failure={bootFailure(false)} view="diagnostic" />
    );
    fireEvent.click(screen.getByRole("button", { name: "生成启动诊断 JSON" }));
    const dialog = await preparedDialog();

    emitResolution(dialog, cancelledEvent(dialog));

    expect(await screen.findByText("已取消启动诊断交付")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(container.querySelector(".boot-recovery-receipt")).toBeNull();
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-preservation-state")).toBe("pending");
  });

  it("上下文变化撤下旧工件，迟到或非 exact 工件回执不能推进新上下文", async () => {
    const { container, rerender } = render(
      <BootFailureRecoveryPage failure={bootFailure(false, "calculation")} view="diagnostic" />
    );
    fireEvent.click(screen.getByRole("button", { name: "生成启动诊断 JSON" }));
    const oldDialog = await preparedDialog();

    rerender(<BootFailureRecoveryPage failure={bootFailure(false, "storage")} view="diagnostic" />);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    emitResolution(oldDialog, completedEvent(oldDialog));
    expect(container.querySelector(".boot-recovery-receipt")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "生成启动诊断 JSON" }));
    const currentDialog = await preparedDialog();
    const foreignArtifact: PreparedFileArtifact = {
      ...currentDialog.artifact,
      blob: new Blob(["different"], { type: currentDialog.artifact.blob.type })
    };
    emitResolution(currentDialog, completedEvent(currentDialog, foreignArtifact));
    expect(container.querySelector(".boot-recovery-receipt")).toBeNull();

    emitResolution(currentDialog, completedEvent(currentDialog));
    expect(await screen.findByText("启动诊断已保存")).toBeTruthy();
    expect(container.querySelector(".boot-recovery-receipt")?.getAttribute("data-delivery")).toBe("saved");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-preservation-state")).toBe("saved");
  });

  it("存储探针未通过时不允许打开数据库生成备份", () => {
    render(<BootFailureRecoveryPage failure={bootFailure(false)} view="backup" />);

    const button = screen.getByRole<HTMLButtonElement>("button", { name: "生成只读完整备份 ZIP" });
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(mocks.readFullDataSnapshot).not.toHaveBeenCalled();
    expect(mocks.createFullBackupArtifactOffMainThread).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("备份生成阶段只读快照并冻结 Worker ZIP，不调用文件端口且关闭分享", async () => {
    const snapshot = { snapshot: "bound-current-context" };
    mocks.readFullDataSnapshot.mockResolvedValueOnce(snapshot);
    const { container } = render(
      <BootFailureRecoveryPage failure={bootFailure(true)} view="backup" />
    );

    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));

    const dialog = await preparedDialog();
    const workerArtifact = await mocks.createFullBackupArtifactOffMainThread.mock.results[0]?.value;
    expect(mocks.readFullDataSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.createFullBackupArtifactOffMainThread).toHaveBeenCalledWith(
      snapshot,
      { appVersion: expect.any(String) },
      "zip"
    );
    expect(dialog.artifact.blob).toBe(workerArtifact.blob);
    expect(dialog.artifact.sharePolicy).toBe("blocked_sensitive");
    expect(dialog.artifact.filename).toMatch(/^hakimi-boot-failure-safety-backup-\d{4}-\d{2}-\d{2}\.zip$/u);
    expect(mocks.saveFile).not.toHaveBeenCalled();
    expect(mocks.saveFileToChosenLocation).not.toHaveBeenCalled();
    expect(mocks.shareFile).not.toHaveBeenCalled();
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-file-delivery-certainty")).toBe("prepared");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-mutation-mode")).toBe("writes-frozen-read-only-export-only");
  });

  it("备份 requested 只进入人工核对，validated completed 才推进 saved", async () => {
    const { container } = render(
      <BootFailureRecoveryPage failure={bootFailure(true)} view="backup" />
    );
    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));
    const dialog = await preparedDialog();

    emitResolution(dialog, requestedEvent(dialog));
    expect(await screen.findByText("只读安全备份已请求下载")).toBeTruthy();
    expect(screen.queryByText("只读安全备份已保存")).toBeNull();
    expect(container.querySelector(".boot-recovery-receipt")?.getAttribute("data-delivery")).toBe("requested");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-file-delivery-certainty")).toBe("requested");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-preservation-state")).toBe("requested");

    emitResolution(dialog, completedEvent(dialog));
    expect(await screen.findByText("只读安全备份已保存")).toBeTruthy();
    expect(container.querySelector(".boot-recovery-receipt")?.getAttribute("data-delivery")).toBe("saved");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-file-delivery-certainty")).toBe("saved");
    expect(container.querySelector(".page--boot-recovery")?.getAttribute("data-preservation-state")).toBe("saved");
    expect(screen.getByText(/该摘要仅是工程完整性证据/)).toBeTruthy();
  });
});
