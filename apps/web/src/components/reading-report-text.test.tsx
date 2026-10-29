import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReadingReportText } from "./reading-report-text";

afterEach(cleanup);

describe("brief report and complete reading disclosure", () => {
  it("shows the main report and keeps the complete reading behind its own disclosure", () => {
    render(<ReadingReportText text={"# 本次解读\n\n## 主报告\n\n### 事业\n\n**先看实际成果**\n\n工作先看已有成果能否被采用。\n\n## 完整详细阅读（按需展开）\n\n### 一、整盘主线\n\n完整详细说明仍然保留。\n\n### 二、命局九章详读\n\n这里保留全部九章内容。"} />);
    expect(screen.getByText("先看实际成果").tagName).toBe("STRONG");
    expect(screen.getByText("工作先看已有成果能否被采用。").closest("details:not([open])")).toBeNull();
    const full = screen.getByText("完整详细说明仍然保留。").closest("details")!;
    expect(full.open).toBe(false);
    expect(full.textContent).toContain("这里保留全部九章内容。");
    fireEvent.click(screen.getByRole("link", { name: "完整详细阅读（按需展开）" }));
    expect(full.open).toBe(true);
  });

  it("opens the full appendix when a main-report condition links to its nested original note", () => {
    render(<ReadingReportText text={"# 本次解读\n\n## 主报告\n\n结论见[注1](#reading-condition-1)。\n\n## 完整详细阅读（按需展开）\n\n### 适用条件注释\n\n以下条件均保留原文，同一句只记录一次。\n\n#### 注1\n\n只适用于这一命盘与所列年份。\n\n### 原文与来源\n\n原判断保留。"} />);
    const note = screen.getByRole("heading", { name: "注1", hidden: true });
    const full = note.closest("details")!;
    expect(full.open).toBe(false);
    fireEvent.click(screen.getByRole("link", { name: "注1" }));
    expect(full.open).toBe(true);
    expect(document.activeElement).toBe(note);
    expect(within(full).getByText("只适用于这一命盘与所列年份。")).toBeTruthy();
  });

  it("preserves long adopted text as literal text in the separate personal appendix", () => {
    const personal = "## 这是我的原文，不是报告章节\n<script>危险标签只是文字</script>\n" + "完整保留个人经历。".repeat(100);
    render(<ReadingReportText text={`# 本次解读\n\n## 主报告\n\n这项采用你的个人修订。\n\n## 已采用的个人修订原文\n\n\`\`\`text\n${personal}\n\`\`\`\n`} />);
    const original = screen.getByLabelText("已采用个人原文");
    expect(original.textContent).toBe(personal);
    expect(original.closest("details")!.open).toBe(false);
    expect(original.querySelector("script")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "已采用的个人修订原文" }));
    expect(original.closest("details")!.open).toBe(true);
  });

  it("keeps an old saved report's original chapter and condition navigation usable", () => {
    const original = "# 旧报告\n\n## 一、整盘主线\n\n旧版原句。参见[注1](#reading-condition-1)。\n\n## 适用条件注释\n\n以下条件均保留原文，同一句只记录一次。\n\n### 注1\n\n旧版适用条件。";
    render(<ReadingReportText text={original} />);
    expect(screen.getByText(/旧版原句/).closest("details")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "注1" }));
    expect(screen.getByText("旧版适用条件。").closest("details")!.open).toBe(true);
  });
});
