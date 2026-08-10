import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KnowledgePage } from "./knowledge-page";

const documentId = "11111111-1111-4111-8111-111111111111";
const noteId = "22222222-2222-4222-8222-222222222222";
const citationId = "33333333-3333-4333-8333-333333333333";

const documentRecord = {
  schemaVersion: "1.0.0",
  id: documentId,
  recordType: "user_knowledge_document",
  title: "藏干研究摘录",
  author: "研究者",
  edition: "第一版",
  sourceNote: "个人整理",
  fileName: "藏干.md",
  format: "markdown",
  content: "# 藏干\n巳中藏丙戊庚。",
  contentHash: "a".repeat(64),
  byteSize: 31,
  lineCount: 2,
  sections: [{ id: "section-1", title: "藏干", level: 1, startLine: 1, endLine: 2 }],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  editVersion: 1
};

const citationRecord = {
  schemaVersion: "1.0.0",
  id: citationId,
  documentId,
  documentContentHash: "a".repeat(64),
  locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
  quote: "巳中藏丙戊庚。",
  annotation: "",
  targets: [{ kind: "research_note", noteId }],
  status: "user_candidate",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  editVersion: 1
};

const repositoryMocks = vi.hoisted(() => ({
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  searchDocuments: vi.fn(),
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  listCitations: vi.fn(),
  listCitationsByDocument: vi.fn(),
  createCitation: vi.fn(),
  deleteCitation: vi.fn()
}));

vi.mock("@hakimi/storage", () => ({ knowledgeRepository: repositoryMocks }));

beforeEach(() => {
  window.history.replaceState({}, "", "/knowledge");
  Object.values(repositoryMocks).forEach((mock) => mock.mockReset());
  repositoryMocks.listDocuments.mockResolvedValue([documentRecord]);
  repositoryMocks.getDocument.mockResolvedValue(documentRecord);
  repositoryMocks.searchDocuments.mockResolvedValue([]);
  repositoryMocks.listCitations.mockResolvedValue([]);
  repositoryMocks.listCitationsByDocument.mockResolvedValue([]);
  repositoryMocks.createCitation.mockResolvedValue(citationRecord);
  repositoryMocks.deleteDocument.mockResolvedValue(undefined);
  repositoryMocks.deleteCitation.mockResolvedValue(undefined);
});

describe("KnowledgePage", () => {
  it("普通入口只提供检索和阅读，不创建游离引用", async () => {
    window.history.replaceState({}, "", `/knowledge?document=${documentId}`);
    render(<KnowledgePage />);

    expect(await screen.findByRole("heading", { name: "藏干研究摘录", level: 2 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "个人典籍与引用", level: 1 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "藏干", level: 3 })).toBeTruthy();
    expect(document.querySelector(".knowledge-layout")?.classList.contains("is-reader-view")).toBe(true);
    expect(document.querySelector(".knowledge-reader")?.hasAttribute("aria-live")).toBe(false);
    expect(screen.getByText(/《藏干研究摘录》 · 藏干 · 第 1–2 行/).getAttribute("role")).toBe("status");
    expect(screen.getByRole("link", { name: /藏干研究摘录/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "藏干" }).getAttribute("aria-current")).toBe("location");
    expect(screen.getByText("巳中藏丙戊庚。")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "引用第 2 行" })).toBeNull();
    expect(screen.queryByRole("button", { name: "建立候选引用" })).toBeNull();
    expect(screen.getByText(/当前为只读入口/)).toBeTruthy();
  });

  it("导入开关公开展开状态并关联导入面板", async () => {
    render(<KnowledgePage />);
    const toggle = screen.getByRole("button", { name: "导入资料" });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe("knowledge-importer-panel");
    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "收起导入" }).getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("knowledge-importer-panel")).toBeTruthy();
  });

  it("只在合法研究目标上下文中建立带 targets 的候选引用", async () => {
    window.history.replaceState({}, "", `/knowledge?document=${documentId}&target=research_note&note=${noteId}`);
    render(<KnowledgePage />);

    const citationTrigger = await screen.findByRole("button", { name: "引用第 2 行" });
    citationTrigger.focus();
    fireEvent.click(citationTrigger);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "引用第 2 行" }));
    expect(citationTrigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(document.activeElement).toBe(citationTrigger);
    expect(citationTrigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(citationTrigger);
    fireEvent.change(screen.getByLabelText("批注（可选）"), { target: { value: "核对藏干表" } });
    fireEvent.click(screen.getByRole("button", { name: "建立候选引用" }));

    await waitFor(() => expect(repositoryMocks.createCitation).toHaveBeenCalledWith({
      documentId,
      locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
      annotation: "核对藏干表",
      targets: [{ kind: "research_note", noteId }]
    }));
    await waitFor(() => expect(document.activeElement).toBe(citationTrigger));
  });

  it("删除确认在打开、取消与成功删除后保持可预测的键盘焦点", async () => {
    window.history.replaceState({}, "", `/knowledge?document=${documentId}`);
    render(<KnowledgePage />);

    await screen.findByRole("heading", { name: "藏干研究摘录", level: 2 });
    const deleteTrigger = screen.getByRole("button", { name: "删除此资料" });
    deleteTrigger.focus();
    fireEvent.click(deleteTrigger);

    const confirmation = screen.getByRole("group", { name: /确认删除“藏干研究摘录”/ });
    expect(document.activeElement).toBe(confirmation);
    fireEvent.keyDown(confirmation, { key: "Escape" });
    const restoredDeleteTrigger = screen.getByRole("button", { name: "删除此资料" });
    expect(document.activeElement).toBe(restoredDeleteTrigger);

    fireEvent.click(restoredDeleteTrigger);
    const confirmDelete = screen.getByRole("button", { name: "确认删除" });
    confirmDelete.focus();
    fireEvent.click(confirmDelete);

    await waitFor(() => expect(repositoryMocks.deleteDocument).toHaveBeenCalledWith(documentId));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "检索资料" })));
  });

  it("搜索时使用仓储命中提供的 sectionId、行号与摘要", async () => {
    repositoryMocks.searchDocuments.mockResolvedValue([{ document: documentRecord, sectionId: "section-1", lineNumber: 2, excerpt: "巳中藏丙戊庚。" }]);
    render(<KnowledgePage />);
    expect(document.querySelector(".knowledge-layout")?.classList.contains("is-list-view")).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("检索书名、作者或全文"), { target: { value: "藏干" } });
    fireEvent.click(screen.getByRole("button", { name: "检索" }));

    expect(await screen.findByText(/第 2 行 · 巳中藏丙戊庚/)).toBeTruthy();
    expect(repositoryMocks.searchDocuments).toHaveBeenCalledWith("藏干", { limit: 100 });
  });

  it("搜索无命中时仍保留全部资料入口", async () => {
    render(<KnowledgePage />);
    fireEvent.change(screen.getByPlaceholderText("检索书名、作者或全文"), { target: { value: "不存在" } });
    fireEvent.click(screen.getByRole("button", { name: "检索" }));

    expect(await screen.findByText("“不存在” · 0 条结果；显示全部 1 份资料")).toBeTruthy();
    expect(screen.getByRole("link", { name: /藏干研究摘录/ })).toBeTruthy();
  });

  it("长文只渲染 route.line 所在的固定 400 行窗口", async () => {
    const longLines = Array.from({ length: 850 }, (_, index) => `第 ${index + 1} 行`);
    repositoryMocks.getDocument.mockResolvedValue({
      ...documentRecord,
      format: "text",
      content: longLines.join("\n"),
      lineCount: 850,
      sections: [{ id: "section-1", title: "全文", level: 0, startLine: 1, endLine: 850 }]
    });
    window.history.replaceState({}, "", `/knowledge?document=${documentId}&section=section-1&line=450`);
    render(<KnowledgePage />);

    expect(await screen.findByText("第 450 行")).toBeTruthy();
    expect(screen.getByText("第 401 行")).toBeTruthy();
    expect(screen.getByText("第 800 行")).toBeTruthy();
    expect(screen.queryByText("第 400 行")).toBeNull();
    expect(screen.queryByText("第 801 行")).toBeNull();
    expect(screen.getByRole("link", { name: "上一页" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "下一页" })).toBeTruthy();
    expect(document.querySelectorAll(".knowledge-line")).toHaveLength(400);
  });

  it("只按仓储 sections 标记标题，围栏代码里的井号保持原文", async () => {
    repositoryMocks.getDocument.mockResolvedValue({
      ...documentRecord,
      content: "# 真标题\n```\n# 假标题\n```",
      lineCount: 4,
      sections: [{ id: "section-1", title: "真标题", level: 1, startLine: 1, endLine: 4 }]
    });
    window.history.replaceState({}, "", `/knowledge?document=${documentId}`);
    render(<KnowledgePage />);

    expect(await screen.findByText("# 假标题")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "真标题", level: 3 })).toBeTruthy();
    const codeLine = document.getElementById("knowledge-line-3");
    expect(codeLine?.classList.contains("is-heading")).toBe(false);
    expect(codeLine?.querySelector("[role='heading']")).toBeNull();
  });

  it("把 Markdown 标题放在页面标题和资料标题之后并把深层标题限制在六级", async () => {
    repositoryMocks.getDocument.mockResolvedValue({
      ...documentRecord,
      content: "# 一级\n## 二级\n##### 五级",
      lineCount: 3,
      sections: [
        { id: "section-1", title: "一级", level: 1, startLine: 1, endLine: 3 },
        { id: "section-2", title: "二级", level: 2, startLine: 2, endLine: 2 },
        { id: "section-3", title: "五级", level: 5, startLine: 3, endLine: 3 }
      ]
    });
    window.history.replaceState({}, "", `/knowledge?document=${documentId}`);
    render(<KnowledgePage />);

    expect(await screen.findByRole("heading", { name: "一级", level: 3 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "二级", level: 4 })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "五级", level: 6 })).toBeTruthy();
  });

  it("把 Markdown 中的 HTML 当作普通文本渲染", async () => {
    const unsafeText = `<img src=x onerror="globalThis.hacked=true">`;
    repositoryMocks.getDocument.mockResolvedValue({
      ...documentRecord,
      content: `# 藏干\n${unsafeText}`
    });
    window.history.replaceState({}, "", `/knowledge?document=${documentId}`);
    render(<KnowledgePage />);

    expect(await screen.findByText(unsafeText)).toBeTruthy();
    expect(document.querySelector(".knowledge-content img")).toBeNull();
  });
});
