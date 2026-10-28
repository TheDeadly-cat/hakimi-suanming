import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppFeedbackDetails } from "./app-feedback-details";

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
afterEach(() => {
  if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
  vi.restoreAllMocks();
});

describe("AppFeedbackDetails", () => {
  it("copies only on an explicit click and offers a selectable fallback on clipboard failure", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { container } = render(<AppFeedbackDetails pathname="/reports" search="?report=private-id&name=PrivateName" />);
    expect(container.querySelector("details")?.open).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText(/关于与反馈/));
    fireEvent.click(screen.getByRole("button", { name: "复制反馈模板" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("手动复制"));
    const text = (screen.getByLabelText("反馈版本与页面") as HTMLTextAreaElement).value;
    expect(writeText).toHaveBeenCalledWith(text);
    expect(text).toContain("档案 / 已保存报告");
    expect(text).not.toContain("private-id");
    expect(text).not.toContain("PrivateName");
  });

  it("marks copied only after the clipboard confirms the write", async () => {
    let confirmCopy!: () => void;
    const writeText = vi.fn(() => new Promise<void>((resolve) => { confirmCopy = resolve; }));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<AppFeedbackDetails pathname="/new" search="?date=1992-03-09" />);
    fireEvent.click(screen.getByText(/关于与反馈/));
    fireEvent.click(screen.getByRole("button", { name: "复制反馈模板" }));
    expect(screen.getByRole("status").textContent).not.toContain("已复制");
    expect(screen.getByRole("button", { name: "正在复制" }).hasAttribute("disabled")).toBe(true);
    confirmCopy();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("已复制"));
  });
});
