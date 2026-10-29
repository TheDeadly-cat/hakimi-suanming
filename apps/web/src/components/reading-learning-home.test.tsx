import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { KnowledgePage } from "../pages/knowledge-page";
import { LEARNING_ENTRIES, readLearningReportLocator } from "../lib/reading-learning";
import { READING_GLOSSARY } from "../lib/reading-plain-summary";
import { READING_NAVIGATION_STORAGE_KEY } from "../lib/reading-navigation-context";

const caseId = "11111111-1111-4111-8111-111111111111";
const revisionId = "22222222-2222-4222-8222-222222222222";
const resultHash = "a".repeat(64), ruleProfileDigest = "b".repeat(64);
const { getCase, listDocuments } = vi.hoisted(() => ({ getCase: vi.fn(), listDocuments: vi.fn() }));
vi.mock("@hakimi/storage", () => ({ caseRepository: { getCase }, knowledgeRepository: { listDocuments } }));

function currentNavigation(overrides: unknown[] = []) {
  const identity = [caseId, revisionId, resultHash, ruleProfileDigest, "hakimi.local-reading-edition/0.22.3", "hakimi.reading-explanation-index/0.1.0", true];
  overrides.forEach((value, index) => { identity[index] = value as string; });
  return JSON.stringify({ version: 1, identity: JSON.stringify(identity), selection: { topic: "wealth", year: 2030 } });
}
function availableCase() {
  return { caseRecord: { id: caseId, deletedAt: null }, revisions: [{ id: revisionId, caseId, manifest: { resultHash, ruleProfileDigest } }] };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/knowledge");
  window.sessionStorage.removeItem(READING_NAVIGATION_STORAGE_KEY);
  getCase.mockReset().mockResolvedValue(availableCase());
  listDocuments.mockReset();
});

it("opens the existing 31 glossary entries directly without requiring a document import", () => {
  const view = render(<KnowledgePage />);
  expect(screen.getByRole("heading", { level: 1, name: "读懂报告里的词" })).toBeTruthy();
  expect(view.container.querySelectorAll("[data-learning-term]")).toHaveLength(31);
  expect(LEARNING_ENTRIES.map(({ id, term, explanation }) => ({ id, term, explanation }))).toEqual(READING_GLOSSARY);
  expect(LEARNING_ENTRIES.every(entry => entry.group && entry.example.length > 10)).toBe(true);
  expect(screen.queryByRole("button", { name: "导入资料" })).toBeNull();
  expect(screen.getByRole("link", { name: "资料管理与导入" }).getAttribute("href")).toBe("/knowledge?view=library");
  expect(screen.getByRole("link", { name: "到档案看报告" }).getAttribute("href")).toBe("/reports");
  expect(listDocuments).not.toHaveBeenCalled();
  expect(getCase).not.toHaveBeenCalled();
});

it("searches a novice term, automatically reveals its original explanation and reading example, and clears an empty result", () => {
  const view = render(<KnowledgePage />);
  const search = screen.getByRole("searchbox", { name: "搜索术语" });
  fireEvent.change(search, { target: { value: " 偏弱 " } });
  const card = view.container.querySelector<HTMLDetailsElement>('[data-learning-term="weak"]')!;
  expect(card.open).toBe(true);
  expect(view.container.querySelectorAll("[data-learning-term]")).toHaveLength(1);
  expect(within(card).getByText(READING_GLOSSARY.find(entry => entry.id === "weak")!.explanation)).toBeTruthy();
  expect(within(card).getByText("阅读例子")).toBeTruthy();
  expect(card.textContent).toContain("不表示身体弱或能力差");
  fireEvent.change(search, { target: { value: "合成不存在的词" } });
  expect(screen.getByRole("heading", { name: "没有找到这个词" })).toBeTruthy();
  expect(view.container.querySelectorAll("[data-learning-term]")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "查看全部词条" }));
  expect(search).toHaveProperty("value", "");
  expect(document.activeElement).toBe(search);
  expect(view.container.querySelectorAll("[data-learning-term]")).toHaveLength(31);
});

it("supports browsing time terms and searching the familiar word 流月 without making a separate glossary", () => {
  const view = render(<KnowledgePage />);
  fireEvent.click(screen.getByRole("button", { name: "时间范围" }));
  expect(view.container.querySelectorAll("[data-learning-term]")).toHaveLength(4);
  fireEvent.change(screen.getByRole("searchbox", { name: "搜索术语" }), { target: { value: "流月" } });
  const card = view.container.querySelector<HTMLDetailsElement>('[data-learning-term="month"]')!;
  expect(card.open).toBe(true);
  expect(card.textContent).toContain("节令月");
  expect(card.textContent).toContain("不是公历二月整月");
});

it("returns only to the same available case and revision without persisting search or changing the reading context", async () => {
  const saved = currentNavigation();
  window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, saved);
  render(<KnowledgePage />);
  const link = await screen.findByRole("link", { name: "返回刚才报告" });
  expect(link.getAttribute("href")).toBe(`/cases/${caseId}/revisions/${revisionId}`);
  expect(getCase).toHaveBeenCalledExactlyOnceWith(caseId);
  fireEvent.change(screen.getByRole("searchbox", { name: "搜索术语" }), { target: { value: "偏弱" } });
  expect(window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY)).toBe(saved);
  fireEvent.click(link);
  expect(window.location.pathname).toBe(`/cases/${caseId}/revisions/${revisionId}`);
});

it.each(["deleted", "missing-revision", "wrong-case", "result-changed", "profile-changed", "unavailable"])("does not offer a stale report return link: %s", async variant => {
  window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, currentNavigation());
  const bundle = availableCase();
  if (variant === "deleted") Object.assign(bundle.caseRecord, { deletedAt: "2026-10-29T00:00:00.000Z" });
  if (variant === "missing-revision") bundle.revisions = [];
  if (variant === "wrong-case") bundle.caseRecord.id = revisionId;
  if (variant === "result-changed") bundle.revisions[0]!.manifest.resultHash = "changed";
  if (variant === "profile-changed") bundle.revisions[0]!.manifest.ruleProfileDigest = "changed";
  if (variant === "unavailable") getCase.mockRejectedValue(new Error("storage unavailable"));
  else getCase.mockResolvedValue(bundle);
  render(<KnowledgePage />);
  await waitFor(() => expect(screen.getByText(/刚才的报告已不可用/)).toBeTruthy());
  expect(screen.queryByRole("link", { name: "返回刚才报告" })).toBeNull();
  expect(screen.getByRole("link", { name: "到档案重新选择报告" }).getAttribute("href")).toBe("/reports");
  expect(screen.getByRole("searchbox", { name: "搜索术语" })).toBeTruthy();
});

it.each(["{broken", "x".repeat(4097), currentNavigation(["https://example.invalid/"]), JSON.stringify({ version: 2, identity: "[]" })])("rejects malformed or unsupported navigation identity without reading another case", raw => {
  window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, raw);
  expect(readLearningReportLocator()).toEqual({ status: "unavailable" });
  render(<KnowledgePage />);
  expect(screen.queryByRole("link", { name: "返回刚才报告" })).toBeNull();
  expect(getCase).not.toHaveBeenCalled();
});

it("keeps learning available when session storage is blocked", () => {
  const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  try {
    render(<KnowledgePage />);
    fireEvent.change(screen.getByRole("searchbox", { name: "搜索术语" }), { target: { value: "日主" } });
    expect(screen.getAllByText("阅读例子").length).toBeGreaterThan(0);
    expect(getCase).not.toHaveBeenCalled();
  } finally { read.mockRestore(); }
});
