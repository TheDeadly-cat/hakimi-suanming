import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransitReviewInboxProjection } from "../lib/transit-review-inbox";
import { resetPreparedFileDeliveryCoordinatorForTests } from "../components/prepared-file-delivery-coordinator";
import { TransitReviewInboxPage } from "./transit-review-inbox-page";

const mocks = vi.hoisted(() => ({
  pickFile: vi.fn(),
  getCapabilities: vi.fn(),
  saveBlobFile: vi.fn(),
  saveTextFile: vi.fn(),
  importArtifact: vi.fn(),
  readBytes: vi.fn(),
  readProjection: vi.fn(),
  deleteArtifact: vi.fn(),
  createBundle: vi.fn(),
  serializeBundle: vi.fn()
}));

vi.mock("@hakimi/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hakimi/platform")>();
  return {
    ...actual,
    pickFile: mocks.pickFile,
    saveBlobFile: mocks.saveBlobFile,
    saveTextFile: mocks.saveTextFile,
    webReportExportPort: {
      getCapabilities: mocks.getCapabilities,
      saveFile: mocks.saveBlobFile
    }
  };
});

vi.mock("@hakimi/research-query/transit-review", () => ({
  createTransitQueryReviewBundle: mocks.createBundle,
  serializeTransitQueryReviewBundle: mocks.serializeBundle
}));

vi.mock("../lib/transit-review-inbox", () => ({
  MAX_TRANSIT_REVIEW_INBOX_ARTIFACT_BYTES: 2 * 1024 * 1024,
  deleteTransitReviewInboxArtifact: mocks.deleteArtifact,
  importTransitReviewInboxArtifact: mocks.importArtifact,
  readTransitReviewInboxArtifactBytes: mocks.readBytes,
  readTransitReviewInboxProjection: mocks.readProjection
}));

const artifact = {
  attachmentId: "11111111-1111-4111-8111-111111111111",
  fileName: "review-bundle.json",
  byteLength: 2,
  rawContentHash: "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  importedAt: "2026-08-03T01:00:00.000Z",
  kind: "review_bundle" as const,
  artifactDigest: "b".repeat(64),
  reviewBundleDigest: "b".repeat(64),
  candidateId: null,
  candidateDigest: null,
  status: "bundle_current" as const,
  errorCode: null,
  errorMessage: null
};

function projection(overrides: Partial<TransitReviewInboxProjection> = {}): TransitReviewInboxProjection {
  return {
    refreshedAt: "2026-08-03T02:00:00.000Z",
    evidenceBoundary: "local_unverified",
    identityVerified: false,
    sourceAuthenticityVerified: false,
    eligibleForFixtureIntegration: false,
    countsAsVerifiedGold: false,
    verifiedTransitFactsDelta: 0,
    verifiedQueryAdjudicationsDelta: 0,
    artifacts: [artifact],
    batches: [{
      reviewBundleDigest: artifact.reviewBundleDigest,
      bundleArtifactIds: [artifact.attachmentId],
      currentBundle: true,
      candidates: Array.from({ length: 18 }, (_, index) => ({
        candidateId: index === 0 ? "transit-review-dayun-resolved" : `transit-review-candidate-${index + 1}`,
        candidateDigest: (index + 1).toString(16).padStart(64, "0"),
        title: index === 0 ? "大运目标节点" : `候选节点 ${index + 1}`,
        nodeType: "dayun" as const,
        reviewArtifactIds: [],
        passedReviewCount: 0,
        adjudicationArtifactIds: [],
        passedAdjudicationCount: 0
      })),
      orphanArtifactIds: []
    }],
    summary: {
      storedArtifacts: 1,
      currentBundles: 1,
      passedIndependentReviews: 0,
      passedAdjudications: 0,
      waitingDependencies: 0,
      failedOrCorrupt: 0
    },
    ...overrides
  };
}

describe("TransitReviewInboxPage", () => {
  beforeEach(() => {
    resetPreparedFileDeliveryCoordinatorForTests();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.getCapabilities.mockReturnValue({
      canDownloadFiles: true,
      canChooseSaveLocation: false,
      canShareFiles: false
    });
    mocks.readProjection.mockResolvedValue(projection());
    mocks.saveBlobFile.mockResolvedValue({
      status: "download_requested",
      filename: artifact.fileName,
      method: "browser_download"
    });
    mocks.saveTextFile.mockResolvedValue({
      status: "download_requested",
      filename: "bundle.json",
      method: "browser_download"
    });
  });

  it("展示批次、候选进度与永久为零的可信边界", async () => {
    render(<StrictMode><TransitReviewInboxPage /></StrictMode>);

    expect(screen.getByRole("heading", { name: "未核验审核收件箱" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "结构通过不等于专家身份已验证" })).toBeTruthy();
    expect(screen.getByText("专家金标增量").previousElementSibling?.textContent).toBe("0");
    expect(await screen.findByText("大运目标节点")).toBeTruthy();
    expect(screen.getAllByText("尚无结构通过的审核")).toHaveLength(18);
    expect(screen.getAllByText("当前候选包")).toHaveLength(3);
    expect(screen.getByText(/原件进入完整备份/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /返回设置/ }).getAttribute("href")).toBe("/settings");
  });

  it("统一导入、内容重复反馈、原件导出与摘要 CAS 双步删除都可操作", async () => {
    mocks.pickFile.mockResolvedValue({
      name: "expert-return.json",
      size: 2,
      type: "application/json",
      blob: new Blob(["{}"], { type: "application/json" })
    });
    const emptyProjection = projection({
      artifacts: [],
      batches: [],
      summary: {
        storedArtifacts: 0,
        currentBundles: 0,
        passedIndependentReviews: 0,
        passedAdjudications: 0,
        waitingDependencies: 0,
        failedOrCorrupt: 0
      }
    });
    mocks.readProjection
      .mockReset()
      .mockResolvedValueOnce(projection())
      .mockResolvedValueOnce(projection())
      .mockResolvedValueOnce(emptyProjection);
    mocks.importArtifact.mockResolvedValue({
      artifact,
      attachment: {
        id: artifact.attachmentId,
        fileName: artifact.fileName,
        contentHash: artifact.rawContentHash,
        byteLength: artifact.byteLength
      },
      created: false
    });
    mocks.readBytes.mockResolvedValue(new TextEncoder().encode("{}"));
    mocks.deleteArtifact.mockResolvedValue(undefined);

    render(<TransitReviewInboxPage />);
    await screen.findByText("大运目标节点");

    fireEvent.click(screen.getByRole("button", { name: /导入审核工件/ }));
    expect(await screen.findByText("相同原件已存在")).toBeTruthy();
    expect(mocks.importArtifact).toHaveBeenCalledWith(expect.objectContaining({ fileName: "expert-return.json" }));

    fireEvent.click(screen.getByRole("button", { name: /准备原件/ }));
    await waitFor(() => expect(mocks.readBytes).toHaveBeenCalledWith(artifact));
    const deliveryDialog = await screen.findByRole("dialog", { name: /待交付文件已在本机生成/ });
    expect(mocks.saveBlobFile).not.toHaveBeenCalled();
    fireEvent.click(within(deliveryDialog).getByRole("button", { name: /下载文件/ }));
    await waitFor(() => expect(mocks.saveBlobFile).toHaveBeenCalledWith(expect.any(Blob), artifact.fileName));
    fireEvent.click(within(deliveryDialog).getByRole("button", { name: "已核对，允许再次下载" }));
    fireEvent.click(within(deliveryDialog).getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByRole("group", { name: `确认删除审核原件 ${artifact.fileName}` })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(mocks.deleteArtifact).toHaveBeenCalledWith(artifact));
    expect(await screen.findByText("审核原件已永久删除")).toBeTruthy();
  });
});
