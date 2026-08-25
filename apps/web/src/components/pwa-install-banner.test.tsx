import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PwaInstallBanner } from "./pwa-install-banner";

type ChoiceOutcome = "accepted" | "dismissed";

function dispatchInstallPrompt(input: {
  outcome?: ChoiceOutcome;
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: ChoiceOutcome; platform: string }>;
} = {}) {
  const prompt = vi.fn(input.prompt ?? (async () => undefined));
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: {
      value: input.userChoice ?? Promise.resolve({ outcome: input.outcome ?? "accepted", platform: "web" })
    }
  });
  fireEvent(window, event);
  return { event, prompt };
}

describe("PwaInstallBanner", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("浏览器没有报告可安装时不占用页面空间", () => {
    render(<PwaInstallBanner />);
    expect(screen.queryByText("请求创建研究台应用入口")).toBeNull();
  });

  it("只在用户点击时调用一次安装面板，并区分接受请求与确认完成", async () => {
    const user = userEvent.setup();
    render(<PwaInstallBanner />);
    const { event, prompt } = dispatchInstallPrompt({ outcome: "accepted" });

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByText("请求创建研究台应用入口")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "打开系统安装面板" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    const accepted = await screen.findByText(/浏览器已接受本次安装选择/);
    expect(accepted).toBeTruthy();
    expect(document.activeElement).toBe(accepted);
    expect(screen.getByText("安装请求已交给浏览器")).toBeTruthy();
    expect(screen.getByText("事件未收到")).toBeTruthy();
    expect(screen.queryByText("系统已报告应用入口创建完成")).toBeNull();

    fireEvent(window, new Event("appinstalled"));
    expect(await screen.findByText("系统已报告应用入口创建完成")).toBeTruthy();
    expect(screen.getByText(/浏览器已发出安装完成事件/)).toBeTruthy();
    expect(screen.getByText("事件已收到")).toBeTruthy();
  });

  it("明确呈现用户取消，不把取消冒充安装成功", async () => {
    const user = userEvent.setup();
    render(<PwaInstallBanner />);
    const { prompt } = dispatchInstallPrompt({ outcome: "dismissed" });

    await user.click(screen.getByRole("button", { name: "打开系统安装面板" }));
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    const dismissed = await screen.findByText(/你取消了本次安装/);
    expect(dismissed).toBeTruthy();
    expect(document.activeElement).toBe(dismissed);
    expect(screen.queryByText("Web 应用安装完成")).toBeNull();
  });

  it("安装面板失败时给出警报且不回报成功", async () => {
    const user = userEvent.setup();
    render(<PwaInstallBanner />);
    dispatchInstallPrompt({ prompt: async () => { throw new Error("prompt failed"); } });

    await user.click(screen.getByRole("button", { name: "打开系统安装面板" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("浏览器安装流程没有返回可核对结果");
    expect(document.activeElement).toBe(alert);
    expect(screen.queryByText("系统已报告应用入口创建完成")).toBeNull();
  });

  it("安装完成事件抢先到达时不会被迟到的选择结果覆盖", async () => {
    const user = userEvent.setup();
    let resolveChoice!: (choice: { outcome: ChoiceOutcome; platform: string }) => void;
    const userChoice = new Promise<{ outcome: ChoiceOutcome; platform: string }>((resolve) => {
      resolveChoice = resolve;
    });
    render(<PwaInstallBanner />);
    dispatchInstallPrompt({ userChoice });

    await user.click(screen.getByRole("button", { name: "打开系统安装面板" }));
    expect(await screen.findByText("等待浏览器安装确认")).toBeTruthy();

    fireEvent(window, new Event("appinstalled"));
    expect(await screen.findByText("系统已报告应用入口创建完成")).toBeTruthy();

    resolveChoice({ outcome: "accepted", platform: "web" });
    await waitFor(() => expect(screen.queryByText("安装请求已交给浏览器")).toBeNull());
    expect(screen.getByText("事件已收到")).toBeTruthy();
  });

  it("主动关闭后在本会话内抑制后续安装事件提示", async () => {
    const user = userEvent.setup();
    render(<PwaInstallBanner />);
    dispatchInstallPrompt();

    await user.click(screen.getByRole("button", { name: /暂不安装/ }));
    expect(screen.queryByText("请求创建研究台应用入口")).toBeNull();

    const { event } = dispatchInstallPrompt({ outcome: "dismissed" });
    expect(event.defaultPrevented).toBe(true);
    expect(screen.queryByText("请求创建研究台应用入口")).toBeNull();
  });
});
