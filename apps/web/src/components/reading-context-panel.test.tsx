import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReadingContextDraft } from "../lib/local-reading-context";
import { ReadingContextPanel } from "./reading-context-panel";

const saved: ReadingContextDraft = { work: "employed", relationship: "married", fromYear: 2025, toYear: 2027, notes: "已保存的用户自述。" };
const work = () => screen.getByLabelText("职业或主要日常状态") as HTMLSelectElement;
const relationship = () => screen.getByLabelText("关系背景") as HTMLSelectElement;
const from = () => screen.getByLabelText("开始年份") as HTMLInputElement;
const to = () => screen.getByLabelText("结束年份") as HTMLInputElement;
const notes = () => screen.getByLabelText("补充自述（可选，不自动参与判断）") as HTMLTextAreaElement;
const open = () => userEvent.click(screen.getByText("补充当前生活背景"));

describe("optional reading context editor", () => {
  it("starts collapsed with unspecified choices and the requested current year, without saving anything", async () => {
    const onSave = vi.fn(); const { container } = render(<ReadingContextPanel contextKey="case-A" context={null} defaultYear={2026} onSave={onSave} />);
    expect(container.querySelector("details")!.open).toBe(false);
    expect(screen.getByText("未填写背景，仍可完整阅读")).toBeTruthy();
    await open(); expect(work().value).toBe("unspecified"); expect(relationship().value).toBe("unspecified");
    expect(work().options).toHaveLength(7); expect(relationship().options).toHaveLength(5);
    expect(from().value).toBe("2026"); expect(to().value).toBe("2026"); expect(onSave).not.toHaveBeenCalled();
  });
  it("passes only selected background and literal notes, disabling edits and clear while saving", async () => {
    let finish!: () => void; const pending = new Promise<void>((resolve) => { finish = resolve; });
    const onSave = vi.fn(() => pending), onClear = vi.fn();
    render(<ReadingContextPanel contextKey="case-A" context={null} defaultYear={2026} onSave={onSave} onClear={onClear} />);
    await open(); await userEvent.selectOptions(work(), "student"); await userEvent.selectOptions(relationship(), "single");
    await userEvent.clear(to()); await userEvent.type(to(), "2028");
    await userEvent.type(notes(), "我写了退休两字，但选择仍是学生。<script>literal</script>");
    await userEvent.click(screen.getByRole("button", { name: "保存生活背景" }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ work: "student", relationship: "single", fromYear: 2026, toYear: 2028, notes: "我写了退休两字，但选择仍是学生。<script>literal</script>" });
    expect(work().disabled).toBe(true); expect(notes().disabled).toBe(true);
    expect(screen.getByRole("button", { name: "清空已保存的背景" }).hasAttribute("disabled")).toBe(true);
    expect(onClear).not.toHaveBeenCalled(); expect(document.querySelector("script")).toBeNull();
    await act(async () => { finish(); await pending; });
    expect(screen.getByRole("status").textContent).toContain("仅在适用年份内"); expect(notes().value).toContain("选择仍是学生");
  });
  it("keeps an edited draft and the specific unknown-write message when a save fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("保存结果尚未确认，已停止重复写入。请先重新读取记录。"));
    render(<ReadingContextPanel contextKey="case-A" context={saved} defaultYear={2026} onSave={onSave} />);
    await open(); await userEvent.selectOptions(work(), "caregiving"); await userEvent.type(notes(), "新增补充");
    await userEvent.click(screen.getByRole("button", { name: "保存生活背景" }));
    expect((await screen.findByRole("alert")).textContent).toContain("已停止重复写入");
    expect(work().value).toBe("caregiving"); expect(notes().value).toBe(saved.notes + "新增补充");
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("hydrates loaded context before editing and preserves edits across reload/error changes", async () => {
    const onReload = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<ReadingContextPanel contextKey="case-A" context={null} defaultYear={2026} loading onReload={onReload} />);
    await open(); expect(screen.getByRole("status").textContent).toContain("正在读取");
    rerender(<ReadingContextPanel contextKey="case-A" context={saved} defaultYear={2026} onReload={onReload} />);
    expect(work().value).toBe("employed"); expect(notes().value).toBe(saved.notes);
    await userEvent.selectOptions(work(), "seeking_work"); await userEvent.type(notes(), "草稿");
    rerender(<ReadingContextPanel contextKey="case-A" context={{ ...saved, work: "retired" }} defaultYear={2026} error="读取失败" onReload={onReload} />);
    expect(work().value).toBe("seeking_work"); expect(notes().value).toContain("草稿");
    expect(screen.getByText(/已保存的背景有变化/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "重新读取背景" }));
    expect(onReload).toHaveBeenCalledTimes(1); expect(notes().value).toContain("草稿");
  });
  it("delegates clear as its own append action while retaining the loaded object unchanged", async () => {
    const original = JSON.stringify(saved), onSave = vi.fn(), onClear = vi.fn().mockResolvedValue(undefined);
    render(<ReadingContextPanel contextKey="case-A" context={saved} defaultYear={2026} onSave={onSave} onClear={onClear} />);
    await open(); await userEvent.click(screen.getByRole("button", { name: "清空已保存的背景" }));
    expect(onClear).toHaveBeenCalledExactlyOnceWith(); expect(onSave).not.toHaveBeenCalled();
    expect(work().value).toBe("unspecified"); expect(relationship().value).toBe("unspecified"); expect(notes().value).toBe("");
    expect(from().value).toBe("2025"); expect(to().value).toBe("2027");
    expect(screen.getByRole("status").textContent).toContain("此前记录仍保留"); expect(JSON.stringify(saved)).toBe(original);
  });
  it("keeps read-only fields inspectable but exposes no mutation actions", async () => {
    render(<ReadingContextPanel contextKey="case-A" context={saved} defaultYear={2026} readOnly onSave={vi.fn()} onClear={vi.fn()} />);
    await open(); expect(work().disabled).toBe(true); expect(notes().value).toBe(saved.notes);
    expect(screen.queryByRole("button", { name: "保存生活背景" })).toBeNull(); expect(screen.queryByRole("button", { name: "清空已保存的背景" })).toBeNull();
  });
  it("refuses an inverted or out-of-range period without losing the draft", async () => {
    const onSave = vi.fn(); render(<ReadingContextPanel contextKey="case-A" context={null} defaultYear={2026} onSave={onSave} />);
    await open(); await userEvent.clear(to()); await userEvent.type(to(), "2020"); await userEvent.click(screen.getByRole("button", { name: "保存生活背景" }));
    expect(screen.getByRole("alert").textContent).toContain("结束年份不能早于"); expect(to().value).toBe("2020");
    await userEvent.clear(to()); await userEvent.type(to(), "2100"); await userEvent.click(screen.getByRole("button", { name: "保存生活背景" }));
    expect(onSave).not.toHaveBeenCalled(); expect(to().value).toBe("2100");
  });
  it("resets for a different source key and discards a prior source's late result", async () => {
    let reject!: (reason: Error) => void; const pending = new Promise<void>((_, deny) => { reject = deny; });
    const onSave = vi.fn(() => pending);
    const { rerender } = render(<ReadingContextPanel contextKey="case-A" context={saved} defaultYear={2026} onSave={onSave} />);
    await open(); await userEvent.click(screen.getByRole("button", { name: "保存生活背景" }));
    rerender(<ReadingContextPanel contextKey="case-B" context={null} defaultYear={2030} onSave={onSave} />);
    await act(async () => { reject(new Error("A 的迟到错误")); await pending.catch(() => undefined); });
    expect(screen.queryByRole("alert")).toBeNull(); await open(); expect(work().value).toBe("unspecified"); expect(from().value).toBe("2030");
  });
});
