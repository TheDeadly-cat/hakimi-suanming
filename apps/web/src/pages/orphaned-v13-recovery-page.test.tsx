import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportExportPort } from "@hakimi/platform";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR
} from "../../release-protocol";
import {
  getPreparedFileDeliverySnapshot,
  resetPreparedFileDeliveryCoordinatorForTests
} from "../components/prepared-file-delivery-coordinator";
import {
  OrphanedV13RecoveryPage,
  type OrphanedV13BackupCapture,
  type OrphanedV13RecoveryPageProps,
  type OrphanedV13RecoveryState
} from "./orphaned-v13-recovery-page";

const {
  getDeliveryCapabilitiesMock,
  savePreparedFileMock,
  savePreparedFileToChosenLocationMock,
  sharePreparedFileMock,
  printPreparedReportMock
} = vi.hoisted(() => ({
  getDeliveryCapabilitiesMock: vi.fn(),
  savePreparedFileMock: vi.fn(),
  savePreparedFileToChosenLocationMock: vi.fn(),
  sharePreparedFileMock: vi.fn(),
  printPreparedReportMock: vi.fn()
}));

vi.mock("@hakimi/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hakimi/platform")>();
  return {
    ...actual,
    webReportExportPort: {
      getCapabilities: getDeliveryCapabilitiesMock,
      saveFile: savePreparedFileMock,
      saveFileToChosenLocation: savePreparedFileToChosenLocationMock,
      shareFile: sharePreparedFileMock,
      printReport: printPreparedReportMock
    }
  };
});

const SOURCE_DATABASE_NAME = BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName;
const SOURCE_NATIVE_VERSION = 130;

function RecoveryPage(
  props: Omit<OrphanedV13RecoveryPageProps, "recoveryShellDescriptor">
) {
  return (
    <OrphanedV13RecoveryPage
      {...props}
      recoveryShellDescriptor={PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR}
    />
  );
}

const orphanedState: OrphanedV13RecoveryState = {
  kind: "orphaned_v13",
  reasonCode: "ORPHANED_V13_WITHOUT_CONTROL",
  sourceDatabaseName: SOURCE_DATABASE_NAME,
  nativeVersion: SOURCE_NATIVE_VERSION,
  inventory: [
    { name: SOURCE_DATABASE_NAME, version: SOURCE_NATIVE_VERSION }
  ]
};

const ambiguousState: OrphanedV13RecoveryState = {
  kind: "ambiguous",
  reasonCode: "AMBIGUOUS_DATABASE_LINEAGE",
  inventory: [
    { name: SOURCE_DATABASE_NAME, version: SOURCE_NATIVE_VERSION },
    { name: "hakimi-bazi-research-v15", version: 150 }
  ]
};

function backupCapture(
  sourceDatabaseName = SOURCE_DATABASE_NAME,
  sourceNativeVersion = SOURCE_NATIVE_VERSION
): OrphanedV13BackupCapture {
  const blob = new Blob([new Uint8Array([80, 75, 3, 4])], { type: "application/zip" });
  const capturedAt = new Date().toISOString();
  return {
    blob,
    payloadDigest: "8b7e41c6c8f70b3db8fbc39173a6ca15299b980809ac3230f60b8f2d52a9751d",
    outputByteLength: blob.size,
    canonicalJsonByteLength: 2048,
    capturedAt,
    filename: `hakimi-v13-read-only-full-backup-${capturedAt.slice(0, 10)}.zip`,
    sourceDatabaseName,
    sourceNativeVersion
  };
}

function expectNoDeliverySideEffect(): void {
  expect(savePreparedFileMock).not.toHaveBeenCalled();
  expect(savePreparedFileToChosenLocationMock).not.toHaveBeenCalled();
  expect(sharePreparedFileMock).not.toHaveBeenCalled();
  expect(printPreparedReportMock).not.toHaveBeenCalled();
}

function preservationCheckpoint(): HTMLElement {
  const checkpoint = document.getElementById("orphaned-v13-preservation-state");
  if (!checkpoint) throw new Error("preservation checkpoint not rendered");
  return checkpoint;
}

beforeEach(() => {
  resetPreparedFileDeliveryCoordinatorForTests();
  vi.clearAllMocks();
  getDeliveryCapabilitiesMock.mockReset().mockReturnValue({
    canDownloadFiles: true,
    canChooseSaveLocation: false,
    canShareFiles: true
  });
  savePreparedFileMock.mockReset().mockImplementation(async (_blob: Blob, filename: string) => ({
    status: "download_requested",
    filename,
    method: "browser_download"
  }));
  savePreparedFileToChosenLocationMock.mockReset();
  sharePreparedFileMock.mockReset();
  printPreparedReportMock.mockReset();
});

describe("OrphanedV13RecoveryPage", () => {
  it("提供 writes-frozen 的 legacy-v13 独立救援壳，且没有普通导航或危险操作入口", () => {
    const captureBackup = vi.fn();
    const { container } = render(
      <RecoveryPage state={orphanedState} captureBackup={captureBackup} />
    );

    expect(screen.getByRole("heading", { level: 1, name: "检测到未登记的 v13 本地数据库" })).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("main").id).toBe("main-content");
    const links = screen.getAllByRole<HTMLAnchorElement>("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe("#main-content");
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByText("legacy-v13 / Schema 13 / migrationId null")).toBeTruthy();
    expect(screen.getByText("未绑定 · 仅本地构建")).toBeTruthy();

    const shell = container.querySelector<HTMLElement>(".orphaned-v13-shell");
    expect(shell?.getAttribute("data-mutation-mode")).toBe("writes-frozen-read-only-export-only");
    expect(shell?.getAttribute("data-write-mode")).toBe("frozen");
    expect(shell?.getAttribute("data-delivery-mode")).toBe("prepared-file-dialog");
    expect(shell?.getAttribute("data-release-identity")).toBe("legacy-v13");
    expect(shell?.getAttribute("data-target-schema")).toBe("13");
    expect(shell?.getAttribute("data-migration-id")).toBe("null");
    expect(shell?.getAttribute("data-recovery-shell-release-identity")).toBe(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.dbGeneration
    );
    expect(shell?.getAttribute("data-recovery-shell-target-schema")).toBe("15");
    expect(shell?.getAttribute("data-recovery-shell-migration-id")).toBe(
      PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId
    );
    expect(screen.getByRole("button", { name: "生成最小技术诊断 JSON" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "生成只读完整备份 ZIP" })).toBeTruthy();
    expect(captureBackup).not.toHaveBeenCalled();
    expectNoDeliverySideEffect();
    for (const forbiddenLabel of ["导入", "恢复", "编辑", "删除", "继续升级", "进入工作台"]) {
      expect(screen.queryByRole("button", { name: new RegExp(forbiddenLabel) })).toBeNull();
      expect(screen.queryByRole("link", { name: new RegExp(forbiddenLabel) })).toBeNull();
    }
  });

  it("v13 -> v16 壳保持 source ledger 与 shell ledger 分离并开放已绑定只读捕获", () => {
    const captureBackup = vi.fn();
    const { container } = render(
      <OrphanedV13RecoveryPage
        state={orphanedState}
        captureBackup={captureBackup}
        recoveryShellDescriptor={PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR}
      />
    );
    const shell = container.querySelector<HTMLElement>(".orphaned-v13-shell");
    expect(shell?.getAttribute("data-capture-capability")).toBe("bound_read_only");
    expect(shell?.getAttribute("data-release-identity")).toBe("legacy-v13");
    expect(shell?.getAttribute("data-target-schema")).toBe("13");
    expect(shell?.getAttribute("data-migration-id")).toBe("null");
    expect(shell?.getAttribute("data-recovery-shell-release-identity")).toBe(
      PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR.dbGeneration
    );
    expect(shell?.getAttribute("data-recovery-shell-target-schema")).toBe("16");
    expect(screen.getByRole("button", { name: "生成只读完整备份 ZIP" })).toBeTruthy();
  });

  it("bridge/null 不能作为恢复执行壳，页面保持只读诊断且不开放完整捕获", () => {
    const captureBackup = vi.fn();
    const { container } = render(
      <OrphanedV13RecoveryPage
        state={orphanedState}
        captureBackup={captureBackup}
        recoveryShellDescriptor={BRIDGE_RELEASE_DATABASE_DESCRIPTOR}
      />
    );
    expect(container.querySelector(".orphaned-v13-shell")?.getAttribute("data-capture-capability")).toBe("closed");
    expect(screen.getAllByText(/恢复执行壳不是精确绑定 legacy-v13 源/)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /完整备份 ZIP/ })).toBeNull();
    expect(captureBackup).not.toHaveBeenCalled();
  });

  it("状态有歧义时只开放最小诊断，不调用完整捕获", () => {
    const captureBackup = vi.fn();
    render(<RecoveryPage state={ambiguousState} captureBackup={captureBackup} />);

    expect(screen.getByRole("heading", { level: 1, name: "本地数据库状态无法安全判定" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "生成最小技术诊断 JSON" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /完整备份 ZIP/ })).toBeNull();
    expect(captureBackup).not.toHaveBeenCalled();
    expectNoDeliverySideEffect();
  });

  it("诊断和完整备份都先冻结工件且不调用文件端口，并在平台支持分享时仍关闭分享", async () => {
    const capture = backupCapture();
    const captureBackup = vi.fn().mockResolvedValue(capture);
    render(<RecoveryPage state={orphanedState} captureBackup={captureBackup} />);

    fireEvent.click(screen.getByRole("button", { name: "生成最小技术诊断 JSON" }));

    expect(screen.getByRole("dialog", { name: /待交付文件已在本机生成/ })).toBeTruthy();
    expect(screen.getByText("v13 最小技术诊断")).toBeTruthy();
    expect(screen.getByText(/包含敏感资料，系统分享已关闭/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /系统分享/ })).toBeNull();
    expect((screen.getByRole("button", { name: "生成最小技术诊断 JSON" }) as HTMLButtonElement).disabled).toBe(true);
    expect(captureBackup).not.toHaveBeenCalled();
    expectNoDeliverySideEffect();

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));

    expect(await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ })).toBeTruthy();
    expect(screen.getByText("只读 v13 完整备份")).toBeTruthy();
    expect(screen.getByText(/包含敏感资料，系统分享已关闭/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /系统分享/ })).toBeNull();
    expect(captureBackup).toHaveBeenCalledTimes(1);
    expectNoDeliverySideEffect();
  });

  it("重复点击不会并发捕获，也不会重复启动同一 prepared artifact 的交付", async () => {
    const capture = backupCapture();
    let resolveCapture!: (value: OrphanedV13BackupCapture) => void;
    let resolveDownload!: (result: Awaited<ReturnType<ReportExportPort["saveFile"]>>) => void;
    const captureBackup = vi.fn(() => new Promise<OrphanedV13BackupCapture>((resolve) => {
      resolveCapture = resolve;
    }));
    savePreparedFileMock.mockReturnValueOnce(new Promise((resolve) => {
      resolveDownload = resolve;
    }));
    render(<RecoveryPage state={orphanedState} captureBackup={captureBackup} />);

    const prepareButton = screen.getByRole("button", { name: "生成只读完整备份 ZIP" });
    fireEvent.click(prepareButton);
    fireEvent.click(prepareButton);
    expect(captureBackup).toHaveBeenCalledTimes(1);
    expectNoDeliverySideEffect();

    resolveCapture(capture);
    await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ });
    const downloadButton = screen.getByRole("button", { name: /下载文件/ });
    fireEvent.click(downloadButton);
    fireEvent.click(downloadButton);
    await waitFor(() => expect(savePreparedFileMock).toHaveBeenCalledTimes(1));
    expect(getPreparedFileDeliverySnapshot().status).toBe("in_flight");

    resolveDownload({
      status: "download_requested",
      filename: capture.filename ?? "missing-capture-filename.zip",
      method: "browser_download"
    });
    expect(await screen.findByText("只读完整备份已请求下载")).toBeTruthy();
    expect(savePreparedFileMock).toHaveBeenCalledTimes(1);
  });

  it("诊断 JSON 只包含允许的清洗字段，并在用户显式下载后交付 exact Blob", async () => {
    const stateWithUnexpectedRuntimeFields = ({
      ...orphanedState,
      inventory: [{
        name: SOURCE_DATABASE_NAME,
        version: SOURCE_NATIVE_VERSION,
        caseAlias: "不应进入诊断",
        recordCount: 42
      }]
    } as unknown) as OrphanedV13RecoveryState;
    render(<RecoveryPage state={stateWithUnexpectedRuntimeFields} captureBackup={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "生成最小技术诊断 JSON" }));
    expect(screen.getByRole("dialog", { name: /待交付文件已在本机生成/ })).toBeTruthy();
    expectNoDeliverySideEffect();

    fireEvent.click(screen.getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(savePreparedFileMock).toHaveBeenCalledTimes(1));
    const [blob, filename] = savePreparedFileMock.mock.calls[0] as [Blob, string];
    expect(filename).toMatch(/^hakimi-v13-recovery-diagnostic-\d{4}-\d{2}-\d{2}\.json$/);
    expect(blob.type).toBe("application/json;charset=utf-8");
    const raw = await blob.text();
    const diagnostic = JSON.parse(raw);
    expect(diagnostic).toMatchObject({
      format: "hakimi-orphaned-v13-recovery-diagnostic",
      formatVersion: "1.0.0",
      containsUserResearchData: false,
      containsLocalDatabaseIdentifiers: true,
      appVersion: expect.any(String),
      release: {
        dbGeneration: "legacy-v13",
        databaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
        targetSchema: 13,
        migrationId: null,
        nativeVersion: 130,
        engineeringEvidenceOnly: true
      },
      recoveryShell: {
        dbGeneration: PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.dbGeneration,
        databaseName: PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.databaseName,
        targetSchema: 15,
        migrationId: PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR.migrationId,
        sourceGeneration: "legacy-v13",
        sourceDatabaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
        sourceSchema: 13,
        evidenceBound: false,
        engineeringEvidenceOnly: true
      },
      recoveryState: "orphaned_v13",
      reasonCode: "ORPHANED_V13_WITHOUT_CONTROL",
      inventory: [{ name: SOURCE_DATABASE_NAME, version: SOURCE_NATIVE_VERSION }],
      source: { databaseName: SOURCE_DATABASE_NAME, nativeVersion: SOURCE_NATIVE_VERSION },
      safetyBoundary: {
        readOnlyBackupAvailable: true,
        normalNavigationAvailable: false,
        importAvailable: false,
        restoreAvailable: false,
        editAvailable: false,
        deleteAvailable: false,
        upgradeAvailable: false
      }
    });
    expect(raw).not.toContain("不应进入诊断");
    expect(raw).not.toContain("caseAlias");
    expect(raw).not.toContain("recordCount");
    expect(await screen.findByText("诊断文件已请求下载")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "v13 最小诊断收据" }).closest("section")?.getAttribute("data-delivery")).toBe("requested");
    expect(preservationCheckpoint().getAttribute("data-state")).toBe("diagnostic_only");
    expect(preservationCheckpoint().textContent).toContain("最小诊断已请求下载");
    expect(getPreparedFileDeliverySnapshot().status).toBe("manual_check_required");
  });

  it("只在显式下载后交付同一个只读捕获 Blob，并让 requested 保持人工核对 checkpoint", async () => {
    const capture = backupCapture();
    const captureBackup = vi.fn().mockResolvedValue(capture);
    render(<RecoveryPage state={orphanedState} captureBackup={captureBackup} />);

    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));
    expect(await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ })).toBeTruthy();
    expect(captureBackup).toHaveBeenCalledTimes(1);
    expectNoDeliverySideEffect();

    fireEvent.click(screen.getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(savePreparedFileMock).toHaveBeenCalledTimes(1));
    expect(savePreparedFileMock.mock.calls[0]?.[0]).toBe(capture.blob);
    expect(savePreparedFileMock.mock.calls[0]?.[1]).toBe(capture.filename);
    expect(await screen.findByText("只读完整备份已请求下载")).toBeTruthy();
    const receipt = screen.getByRole("heading", { name: "只读捕获收据" }).closest("section");
    expect(receipt?.getAttribute("data-delivery")).toBe("requested");
    expect(receipt?.textContent).toContain(SOURCE_DATABASE_NAME);
    expect(receipt?.textContent).toContain(capture.payloadDigest);
    expect(preservationCheckpoint().getAttribute("data-state")).toBe("requested");
    const snapshot = getPreparedFileDeliverySnapshot();
    expect(snapshot.status).toBe("manual_check_required");
    if (snapshot.status !== "manual_check_required") throw new Error("requested 未保留人工核对门禁");
    expect(snapshot.issue.kind).toBe("requested");
    expect(snapshot.issue.operation.filename).toBe(capture.filename);
  });

  it("只有 completed 回执把完整备份标记为 saved", async () => {
    const capture = backupCapture();
    savePreparedFileMock.mockImplementationOnce(async (blob: Blob, filename: string) => ({
      status: "saved",
      filename,
      method: "native",
      bytesWritten: blob.size
    }));
    render(
      <RecoveryPage
        state={orphanedState}
        captureBackup={vi.fn().mockResolvedValue(capture)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));
    await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ });
    fireEvent.click(screen.getByRole("button", { name: /下载文件/ }));

    expect(await screen.findByText("只读完整备份已保存")).toBeTruthy();
    expect(savePreparedFileMock.mock.calls[0]?.[0]).toBe(capture.blob);
    expect(screen.getByRole("heading", { name: "只读捕获收据" }).closest("section")?.getAttribute("data-delivery")).toBe("saved");
    expect(preservationCheckpoint().getAttribute("data-state")).toBe("saved");
    expect(preservationCheckpoint().textContent).toContain("平台已确认只读 v13 完整备份保存");
    expect(getPreparedFileDeliverySnapshot().status).toBe("idle");
  });

  it("cancelled 只更新反馈，不推进备份收据或 preservation checkpoint", async () => {
    const capture = backupCapture();
    savePreparedFileMock.mockImplementationOnce(async (_blob: Blob, filename: string) => ({
      status: "cancelled",
      filename,
      operation: "save"
    }));
    render(
      <RecoveryPage
        state={orphanedState}
        captureBackup={vi.fn().mockResolvedValue(capture)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));
    await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ });
    fireEvent.click(screen.getByRole("button", { name: /下载文件/ }));

    expect(await screen.findByText("已取消只读完整备份交付")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "只读捕获收据" })).toBeNull();
    expect(preservationCheckpoint().getAttribute("data-state")).toBe("pending");
    expect(getPreparedFileDeliverySnapshot().status).toBe("idle");
    expect(screen.getByRole("dialog", { name: /本次交付已取消/ })).toBeTruthy();
    expect((screen.getByRole("button", { name: /下载文件/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("只读捕获失败或 capture/source binding 不匹配时不准备工件也不调用文件端口", async () => {
    const captureBackup = vi.fn().mockRejectedValueOnce(new Error("v13 只读快照验真失败"));
    const view = render(
      <RecoveryPage state={orphanedState} captureBackup={captureBackup} />
    );

    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));
    expect(await screen.findByText("只读完整备份未能生成")).toBeTruthy();
    expect(screen.getByText(/v13 只读快照验真失败/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expectNoDeliverySideEffect();

    const mismatchedCapture = backupCapture("unexpected-v13-source", SOURCE_NATIVE_VERSION);
    captureBackup.mockResolvedValueOnce(mismatchedCapture);
    view.rerender(
      <RecoveryPage
        state={orphanedState}
        captureBackup={captureBackup}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));
    expect(await screen.findByText(/源库名称或原生版本与当前救援目标不一致/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expectNoDeliverySideEffect();
  });

  it("只读捕获缺少源库绑定时保持关闭，不回退到页面当前状态", async () => {
    const {
      sourceDatabaseName: _sourceDatabaseName,
      sourceNativeVersion: _sourceNativeVersion,
      ...captureWithoutSourceBinding
    } = backupCapture();
    const captureBackup = vi.fn().mockResolvedValue(captureWithoutSourceBinding);
    render(<RecoveryPage state={orphanedState} captureBackup={captureBackup} />);

    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));

    expect(await screen.findByText(/源库名称或原生版本与当前救援目标不一致/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expectNoDeliverySideEffect();
  });

  it("只读捕获缺少日期绑定文件名时保持关闭，不生成兼容文件名", async () => {
    const { filename: _filename, ...captureWithoutFilename } = backupCapture();
    const captureBackup = vi.fn().mockResolvedValue(captureWithoutFilename);
    render(<RecoveryPage state={orphanedState} captureBackup={captureBackup} />);

    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));

    expect(await screen.findByText(/文件名没有与捕获日期精确绑定/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expectNoDeliverySideEffect();
  });

  it("failed 回执进入 coordinator 人工核对门禁，但不伪造页面收据", async () => {
    savePreparedFileMock.mockImplementationOnce(async (_blob: Blob, filename: string) => ({
      status: "failed",
      filename,
      operation: "save",
      stage: "download",
      reason: "浏览器拒绝了文件下载"
    }));
    render(<RecoveryPage state={ambiguousState} captureBackup={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "生成最小技术诊断 JSON" }));
    expectNoDeliverySideEffect();
    fireEvent.click(screen.getByRole("button", { name: /下载文件/ }));

    expect(await screen.findByText("不要直接重复交付")).toBeTruthy();
    expect(screen.getByText(/浏览器拒绝了文件下载/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "v13 最小诊断收据" })).toBeNull();
    expect(preservationCheckpoint().getAttribute("data-state")).toBe("pending");
    const snapshot = getPreparedFileDeliverySnapshot();
    expect(snapshot.status).toBe("manual_check_required");
    if (snapshot.status !== "manual_check_required") throw new Error("failed 回执未进入人工核对门禁");
    expect(snapshot.issue.kind).toBe("uncertain");
  });

  it("recovery context/source 改变会撤下旧工件，但不清空全局 coordinator 或接受迟到回执", async () => {
    const capture = backupCapture();
    let resolveOldDownload!: (result: Awaited<ReturnType<ReportExportPort["saveFile"]>>) => void;
    savePreparedFileMock.mockReturnValueOnce(new Promise((resolve) => {
      resolveOldDownload = resolve;
    }));
    const view = render(
      <RecoveryPage
        state={orphanedState}
        captureBackup={vi.fn().mockResolvedValue(capture)}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "生成只读完整备份 ZIP" }));
    await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ });
    fireEvent.click(screen.getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(savePreparedFileMock).toHaveBeenCalledTimes(1));
    expect(getPreparedFileDeliverySnapshot().status).toBe("in_flight");

    const nextState: OrphanedV13RecoveryState = {
      kind: "orphaned_v13",
      reasonCode: "ORPHANED_V13_SOURCE_REBOUND",
      sourceDatabaseName: "hakimi-bazi-research-v13-rebound",
      nativeVersion: 131,
      inventory: [{ name: "hakimi-bazi-research-v13-rebound", version: 131 }]
    };
    view.rerender(
      <RecoveryPage
        state={nextState}
        captureBackup={vi.fn().mockResolvedValue(backupCapture("hakimi-bazi-research-v13-rebound", 131))}
      />
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("heading", { name: "只读捕获收据" })).toBeNull();
    expect(preservationCheckpoint().getAttribute("data-state")).toBe("pending");
    expect(getPreparedFileDeliverySnapshot().status).toBe("in_flight");

    resolveOldDownload({
      status: "download_requested",
      filename: capture.filename ?? "missing-capture-filename.zip",
      method: "browser_download"
    });
    await waitFor(() => expect(getPreparedFileDeliverySnapshot().status).toBe("manual_check_required"));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("heading", { name: "只读捕获收据" })).toBeNull();
    expect(screen.queryByText("只读完整备份已请求下载")).toBeNull();
    expect(preservationCheckpoint().getAttribute("data-state")).toBe("pending");
    resetPreparedFileDeliveryCoordinatorForTests();
  });
});
