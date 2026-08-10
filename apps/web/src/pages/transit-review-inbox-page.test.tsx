import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransitReviewInboxProjection } from "../lib/transit-review-inbox";
import { TransitReviewInboxPage } from "./transit-review-inbox-page";

const mocks = vi.hoisted(() => ({
  pickFile: vi.fn(),
  saveBlobFile: vi.fn(),
  saveTextFile: vi.fn(),
  importArtifact: vi.fn(),
  readBytes: vi.fn(),
  readProjection: vi.fn(),
  deleteArtifact: vi.fn(),
  createBundle: vi.fn(),
  serializeBundle: vi.fn()
}));

vi.mock("@hakimi/platform", () => ({
  pickFile: mocks.pickFile,
  saveBlobFile: mocks.saveBlobFile,
  saveTextFile: mocks.saveTextFile
}));

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
  byteLength: 320,
  rawContentHash: "a".repeat(64),
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
      candidates: [{
        candidateId: "transit-review-dayun-resolved",
        candidateDigest: "c".repeat(64),
        title: "大运目标节点",
        nodeType: "dayun",
        reviewArtifactIds: [],
        passedReviewCount: 0,
        adjudicationArtifactIds: [],
        passedAdjudicationCount: 0
      }],
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
    Object.values(mocks).forEach((mock) => mock.mockReset());
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
    expect(screen.getByText("尚无结构通过的审核")).toBeTruthy();
    expect(screen.getAllByText("当前候选包")).toHaveLength(2);
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
    mocks.importArtifact.mockResolvedValue({
      artifact: { kind: "independent_review" },
      attachment: {},
      created: false
    });
    mocks.readBytes.mockResolvedValue(new TextEncoder().encode("{}"));
    mocks.deleteArtifact.mockResolvedValue(undefined);

    render(<TransitReviewInboxPage />);
    await screen.findByText("大运目标节点");

    fireEvent.click(screen.getByRole("button", { name: /导入审核工件/ }));
    expect(await screen.findByText("相同原件已存在")).toBeTruthy();
    expect(mocks.importArtifact).toHaveBeenCalledWith(expect.objectContaining({ fileName: "expert-return.json" }));

    fireEvent.click(screen.getByRole("button", { name: /导出原件/ }));
    await waitFor(() => expect(mocks.readBytes).toHaveBeenCalledWith(artifact));
    expect(mocks.saveBlobFile).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    expect(screen.getByRole("group", { name: `确认删除审核原件 ${artifact.fileName}` })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(mocks.deleteArtifact).toHaveBeenCalledWith(artifact));
    expect(await screen.findByText("审核原件已永久删除")).toBeTruthy();
  });
});
