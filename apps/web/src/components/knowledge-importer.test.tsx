import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgeImporter } from "./knowledge-importer";

const { pickFileMock, decodeMock, createDocumentMock } = vi.hoisted(() => ({
  pickFileMock: vi.fn(),
  decodeMock: vi.fn(),
  createDocumentMock: vi.fn()
}));

vi.mock("@hakimi/platform", () => ({ pickFile: pickFileMock }));
vi.mock("../lib/knowledge-import-worker-client", () => ({ decodeKnowledgeFileOffMainThread: decodeMock }));
vi.mock("@hakimi/storage", () => ({ knowledgeRepository: { createDocument: createDocumentMock } }));

const createdDocument = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "滴天髓摘录",
  sections: [{ id: "section-1", title: "总论", level: 1, startLine: 1, endLine: 2 }]
};

beforeEach(() => {
  pickFileMock.mockReset();
  decodeMock.mockReset();
  createDocumentMock.mockReset();
  const blob = new Blob(["# 总论\n原文"], { type: "text/markdown" });
  pickFileMock.mockResolvedValue({ name: "滴天髓摘录.md", size: blob.size, type: blob.type, blob });
  decodeMock.mockResolvedValue("# 总论\n原文");
  createDocumentMock.mockResolvedValue(createdDocument);
});

describe("KnowledgeImporter", () => {
  it("先严格解码，再由仓储创建章节与哈希快照", async () => {
    const onCreated = vi.fn();
    render(<KnowledgeImporter onCreated={onCreated} />);

    fireEvent.click(screen.getByRole("button", { name: "选择资料文件" }));
    expect(await screen.findByText(/Markdown · .* · 2 行 · 1 个标题/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("作者"), { target: { value: " 任铁樵 " } });
    fireEvent.change(screen.getByLabelText("版本 / 版次"), { target: { value: "民国排印本" } });
    fireEvent.change(screen.getByLabelText("来源备注"), { target: { value: "个人研究摘录" } });
    fireEvent.change(screen.getByLabelText("来源网址"), { target: { value: "https://example.com/source" } });
    fireEvent.change(screen.getByLabelText("出版者"), { target: { value: " 示例书局 " } });
    fireEvent.change(screen.getByLabelText("出版年份"), { target: { value: "1936" } });
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
    expect(onCreated).toHaveBeenCalledWith(createdDocument);
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
});
