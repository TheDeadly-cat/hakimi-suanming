import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgeImporter } from "./knowledge-importer";

const { pickFileMock, decodeMock, createDocumentMock, getSourceRightsMock } = vi.hoisted(() => ({
  pickFileMock: vi.fn(),
  decodeMock: vi.fn(),
  createDocumentMock: vi.fn(),
  getSourceRightsMock: vi.fn()
}));

vi.mock("@hakimi/platform", () => ({ pickFile: pickFileMock }));
vi.mock("../lib/knowledge-import-worker-client", () => ({ decodeKnowledgeFileOffMainThread: decodeMock }));
vi.mock("@hakimi/storage", () => ({
  knowledgeRepository: {
    createDocument: createDocumentMock,
    getSourceRights: getSourceRightsMock
  }
}));

async function contentHashFor(content: string): Promise<string> {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    return "0".repeat(64);
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function buildCreatedDocument(payload: Record<string, unknown>) {
  const content = String(payload.content ?? "");
  const now = "2026-08-01T00:00:00.000Z";
  const {
    sourceUrl: _sourceUrl,
    publisher: _publisher,
    publicationYear: _publicationYear,
    acquiredAt: _acquiredAt,
    ...documentPayload
  } = payload;

  return {
    schemaVersion: "1.0.0",
    recordType: "user_knowledge_document",
    id: "11111111-1111-4111-8111-111111111111",
    ...documentPayload,
    contentHash: await contentHashFor(content),
    lineCount: content.split(/\r\n|\r|\n/u).length,
    sections: [{ id: "section-1", title: "总论", level: 1, startLine: 1, endLine: 2 }],
    editVersion: 1,
    createdAt: now,
    updatedAt: now,
  };
}

beforeEach(() => {
  pickFileMock.mockReset();
  decodeMock.mockReset();
  createDocumentMock.mockReset();
  getSourceRightsMock.mockReset();
  const blob = new Blob(["# 总论\n原文"], { type: "text/markdown" });
  pickFileMock.mockResolvedValue({ name: "滴天髓摘录.md", size: blob.size, type: blob.type, blob });
  decodeMock.mockResolvedValue("# 总论\n原文");
  createDocumentMock.mockImplementation(buildCreatedDocument);
  getSourceRightsMock.mockImplementation(async (documentId: string) => {
    const payload = createDocumentMock.mock.calls.at(-1)?.[0] ?? {};
    const document = await buildCreatedDocument(payload);
    return {
      schemaVersion: "1.0.0",
      recordType: "knowledge_source_rights",
      documentId,
      documentContentHash: document.contentHash,
      origin: "user_import",
      source: {
        sourceUrl: payload.sourceUrl ?? null,
        publisher: payload.publisher ?? "",
        publicationYear: payload.publicationYear ?? null,
        acquiredAt: "2026-08-01T00:00:00.000Z"
      },
      rights: {
        status: "user_unverified",
        workStatus: "unknown",
        editionStatus: "unknown",
        basis: "user_declaration",
        jurisdiction: null,
        distributionPolicy: "local_private_only",
        copyrightNotice: "",
        licenseId: null,
        evidenceRefs: []
      },
      review: { status: "unreviewed", attestations: [], note: "" },
      editVersion: 1,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    };
  });
});

describe("KnowledgeImporter", () => {
  async function prepareCurrentFileForSave() {
    fireEvent.click(screen.getByRole("button", { name: /选择/u }));
    const confirmation = await screen.findByRole("checkbox", {
      name: /确认私有使用边界/u,
    });
    fireEvent.click(confirmation);
  }
  it("先严格解码，再由仓储创建章节与哈希快照", async () => {
    const onCreated = vi.fn();
    render(<KnowledgeImporter onCreated={onCreated} />);

    fireEvent.click(screen.getByRole("button", { name: "选择资料文件" }));
    expect(await screen.findByText(/Markdown · .* · 2 行 · 1 个标题/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("作者"), { target: { value: " 任铁樵 " } });
    fireEvent.change(screen.getByLabelText("版本 / 版次"), { target: { value: "民国排印本" } });
    fireEvent.change(screen.getByLabelText("来源备注"), { target: { value: "个人研究摘录" } });
    fireEvent.change(screen.getByLabelText(/^来源网址/u), { target: { value: "https://example.com/source" } });
    fireEvent.change(screen.getByLabelText("出版者"), { target: { value: " 示例书局 " } });
    fireEvent.change(screen.getByLabelText("出版年份"), { target: { value: "1936" } });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /确认私有使用边界/u }),
    );
    fireEvent.click(screen.getByRole("button", { name: "确认导入" }));

    await waitFor(() => expect(createDocumentMock).toHaveBeenCalledWith({
      title: "滴天髓摘录",
      author: "任铁樵",
      edition: "民国排印本",
      sourceNote: "个人研究摘录",
      sourceUrl: "https://example.com/source",
      publisher: "示例书局",
      publicationYear: 1936,
      fileName: "滴天髓摘录.md",
      format: "markdown",
      content: "# 总论\n原文",
      byteSize: new Blob(["# 总论\n原文"], { type: "text/markdown" }).size
    }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "11111111-1111-4111-8111-111111111111",
        recordType: "user_knowledge_document",
        fileName: "滴天髓摘录.md",
        title: "滴天髓摘录",
      }),
    ));
    expect(getSourceRightsMock).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(createDocumentMock.mock.calls[0][0]).not.toHaveProperty("sections");
    expect(createDocumentMock.mock.calls[0][0]).not.toHaveProperty("contentHash");
  });

  it("拒绝扩展名伪装的非文本资料", async () => {
    pickFileMock.mockResolvedValue({ name: "资料.pdf", size: 3, type: "text/plain", blob: new Blob(["abc"]) });
    render(<KnowledgeImporter onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "选择资料文件" }));
    expect(await screen.findByText("仅支持 .md、.markdown 或 .txt 资料。")).toBeTruthy();
    expect(decodeMock).not.toHaveBeenCalled();
  });
  it("写入调用结果未知时保留阻断收据，防止重复导入", async () => {
    createDocumentMock.mockRejectedValueOnce(new Error("write response lost"));
    const onCommitIssue = vi.fn();
    const { container } = render(
      <KnowledgeImporter
        onCreated={vi.fn()}
        onCommitIssue={onCommitIssue}
      />,
    );

    await prepareCurrentFileForSave();
    fireEvent.click(screen.getByRole("button", { name: "确认导入" }));

    await vi.waitFor(() => {
      expect(container.querySelector(".knowledge-import-commit-receipt")?.getAttribute("data-receipt-state"))
        .toBe("call_unknown");
    });
    expect(container.querySelector(".knowledge-importer")?.getAttribute("data-record-write-state"))
      .toBe("unknown");
    expect(onCommitIssue).toHaveBeenCalledWith(
      expect.objectContaining({ certainty: "call_unknown" }),
    );
    expect(createDocumentMock).toHaveBeenCalledTimes(1);
  });

  it("mutation lease 被拒绝时保持 fail-closed 且不调用仓储写入", async () => {
    const acquireMutation = vi.fn().mockReturnValue(null);
    const { container } = render(
      <KnowledgeImporter
        onCreated={vi.fn()}
        acquireMutation={acquireMutation}
      />,
    );

    await prepareCurrentFileForSave();
    fireEvent.click(screen.getByRole("button", { name: "确认导入" }));

    await vi.waitFor(() => {
      expect(acquireMutation).toHaveBeenCalledTimes(1);
      expect(container.querySelector(".inline-error")).not.toBeNull();
    });
    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(container.querySelector(".knowledge-importer")?.getAttribute("data-mutation-epoch-bypassed"))
      .toBe("false");
  });

});
