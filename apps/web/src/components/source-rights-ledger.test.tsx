import { render, screen } from "@testing-library/react";
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

beforeEach(() => {
  listDocumentsMock.mockReset();
  listSourceRightsMock.mockReset();
  listDocumentsMock.mockResolvedValue([{
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
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
  listSourceRightsMock.mockResolvedValue([{
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId: "11111111-1111-4111-8111-111111111111",
    documentContentHash: "a".repeat(64),
    origin: "user_import",
    source: { sourceUrl: "https://example.com/source", publisher: "", publicationYear: null, acquiredAt: "2026-08-01T00:00:00.000Z" },
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
  }]);
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
});
