import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SourceRightsLedger } from "./source-rights-ledger";

const { listDocumentsMock, listSourceRightsMock } = vi.hoisted(() => ({
  listDocumentsMock: vi.fn(),
  listSourceRightsMock: vi.fn()
}));

vi.mock("@hakimi/storage", () => ({ knowledgeRepository: {
  listDocuments: listDocumentsMock,
  listSourceRights: listSourceRightsMock
} }));

const DEFAULT_DOCUMENT_ID = "11111111-1111-4111-8111-111111111111";

function makeRightsRecord({
  documentId = DEFAULT_DOCUMENT_ID,
  documentContentHash = "a".repeat(64),
  sourceUrl = "https://example.com/source"
}: {
  documentId?: string;
  documentContentHash?: string;
  sourceUrl?: string;
} = {}) {
  return {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId,
    documentContentHash,
    origin: "user_import",
    source: { sourceUrl, publisher: "", publicationYear: null, acquiredAt: "2026-08-01T00:00:00.000Z" },
    rights: {
      status: "user_unverified",
      workStatus: "unknown",
      editionStatus: "unknown",
      basis: "user_declaration",
      jurisdiction: null,
      licenseId: null,
      copyrightNotice: "",
      evidenceRefs: [],
      distributionPolicy: "local_private_only"
    },
    review: { status: "unreviewed", attestations: [], note: "" },
    editVersion: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z"
  };
}

beforeEach(() => {
  listDocumentsMock.mockReset();
  listSourceRightsMock.mockReset();
  listDocumentsMock.mockResolvedValue([{
    schemaVersion: "1.0.0",
    id: DEFAULT_DOCUMENT_ID,
    recordType: "user_knowledge_document",
    title: "滴天髓摘录",
    author: "",
    edition: "用户文件",
    sourceNote: "",
    fileName: "source.md",
    format: "markdown",
    byteSize: 10,
    content: "原文",
    contentHash: "a".repeat(64),
    lineCount: 1,
    sections: [{ id: "section-1", title: "全文", level: 0, startLine: 1, endLine: 1 }],
    editVersion: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z"
  }]);
  listSourceRightsMock.mockResolvedValue([makeRightsRecord()]);
});

describe("SourceRightsLedger", () => {
  it("把作品权利、现代版本权利和命理核验分开呈现", async () => {
    render(<SourceRightsLedger />);
    expect(await screen.findByRole("heading", { name: "滴天髓摘录" })).toBeTruthy();
    expect(screen.getByText("用户提供 · 未核验")).toBeTruthy();
    expect(screen.getByText("现代版本层")).toBeTruthy();
    expect(screen.getByText("仅本机私有研究")).toBeTruthy();
    expect(screen.getByText(/这里不评价命理结论是否正确/)).toBeTruthy();
  });

  it("缺少权利记录时 fail closed", async () => {
    listSourceRightsMock.mockResolvedValue([]);
    render(<SourceRightsLedger />);
    expect(await screen.findByText("权利记录缺失")).toBeTruthy();
    expect(screen.getByText(/不会回退为“已核验”或“可分发”/)).toBeTruthy();
  });

  it("暴露只读 legacy-v13 边界，并可清除零结果筛选", async () => {
    render(<SourceRightsLedger />);
    await screen.findByRole("heading", { name: "滴天髓摘录" });
    const ledger = screen.getByRole("region", { name: "来源权利台账" });

    expect(ledger.getAttribute("data-release-identity")).toBe("legacy-v13");
    expect(ledger.getAttribute("data-schema-family")).toBe("legacy-v13");
    expect(ledger.getAttribute("data-db-generation")).toBe("13");
    expect(ledger.getAttribute("data-target-schema")).toBe("13");
    expect(ledger.getAttribute("data-migration-id")).toBe("null");
    expect(ledger.getAttribute("data-current-build-evidence-verified")).toBe("false");
    expect(ledger.getAttribute("data-public-release-authorized")).toBe("false");
    expect(ledger.getAttribute("data-expert-truth-established")).toBe("false");
    expect(ledger.getAttribute("data-formal-truth-established")).toBe("false");
    expect(ledger.getAttribute("data-scientific-validity-claimed")).toBe("false");
    expect(ledger.getAttribute("data-record-write-state")).toBe("not_started");

    fireEvent.click(screen.getByRole("button", { name: /权利条件齐备，0 份正文/ }));
    expect(screen.getByText("当前条件没有匹配的正文记录")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "滴天髓摘录" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(await screen.findByRole("heading", { name: "滴天髓摘录" })).toBeTruthy();
  });

  it("默认折叠孤立记录明细，并保留异常计数与渐进装载证据", async () => {
    const orphanId = "22222222-2222-4222-8222-222222222222";
    listSourceRightsMock.mockResolvedValue([
      makeRightsRecord(),
      makeRightsRecord({ documentId: orphanId, documentContentHash: "b".repeat(64) })
    ]);
    render(<SourceRightsLedger />);

    expect(await screen.findByRole("heading", { name: "发现 1 条孤立权利记录" })).toBeTruthy();
    const summary = screen.getByText("查看孤立记录明细").closest("summary");
    const details = summary?.closest("details");
    expect(details?.open).toBe(false);
    expect(screen.getByRole("region", { name: "来源权利台账" }).getAttribute("data-rendered-orphans")).toBe("1");

    fireEvent.click(summary!);
    expect(details?.open).toBe(true);
    expect(screen.getByText(orphanId)).toBeTruthy();
  });

  it("只把无凭据 HTTPS 来源开放为新窗口链接", async () => {
    const { rerender } = render(<SourceRightsLedger />);
    const sourceLink = await screen.findByRole("link", { name: /HTTPS 来源页面/ });
    expect(sourceLink.getAttribute("href")).toBe("https://example.com/source");
    expect(sourceLink.getAttribute("target")).toBe("_blank");
    expect(sourceLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(sourceLink.getAttribute("referrerpolicy")).toBe("no-referrer");

    listSourceRightsMock.mockResolvedValue([makeRightsRecord({ sourceUrl: "http://example.com/source" })]);
    rerender(<SourceRightsLedger key="unsafe-source" />);
    expect(await screen.findByText("来源网址不是无凭据的 HTTPS 地址")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /HTTPS 来源页面/ })).toBeNull();
  });
});
