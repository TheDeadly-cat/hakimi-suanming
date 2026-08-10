import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PwaInstallBanner } from "./pwa-install-banner";

type ChoiceOutcome = "accepted" | "dismissed";

function dispatchInstallPrompt(input: {
  outcome?: ChoiceOutcome;
  prompt?: () => Promise<void>;
} = {}) {
  const prompt = vi.fn(input.prompt ?? (async () => undefined));
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.defineProperties(event, {
    prompt: { value: prompt },
    userChoice: {
      value: Promise.resolve({ outcome: input.outcome ?? "accepted", platform: "web" })
    }
  });
  fireEvent(window, event);
  return { event, prompt };
}

describe("PwaInstallBanner", () => {
  it("浏览器没有报告可安装时不占用页面空间", () => {
    render(<PwaInstallBanner />);
    expect(screen.queryByText("把研究台安装为 Web 应用")).toBeNull();
  });

  it("只在用户点击时调用一次安装面板，并区分接受请求与确认完成", async () => {
    const user = userEvent.setup();
    render(<PwaInstallBanner />);
    const { event, prompt } = dispatchInstallPrompt({ outcome: "accepted" });

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByText("把研究台安装为 Web 应用")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "安装 Web 应用" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    const accepted = await screen.findByText(/浏览器已接受安装请求/);
    expect(accepted).toBeTruthy();
    expect(document.activeElement).toBe(accepted);
    expect(screen.queryByText("Web 应用安装完成")).toBeNull();

    fireEvent(window, new Event("appinstalled"));
    expect(await screen.findByText("Web 应用安装完成")).toBeTruthy();
    expect(screen.getByText(/浏览器已报告安装完成/)).toBeTruthy();
  });

  it("明确呈现用户取消，不把取消冒充安装成功", async () => {
    const user = userEvent.setup();
    render(<PwaInstallBanner />);
    const { prompt } = dispatchInstallPrompt({ outcome: "dismissed" });

    await user.click(screen.getByRole("button", { name: "安装 Web 应用" }));
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

    await user.click(screen.getByRole("button", { name: "安装 Web 应用" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("未能打开浏览器安装面板");
    expect(document.activeElement).toBe(alert);
    expect(screen.queryByText("Web 应用安装完成")).toBeNull();
  });

  it("关闭后隐藏当前提示，新一次可安装事件会重新打开", async () => {
    const user = userEvent.setup();
    render(<PwaInstallBanner />);
    dispatchInstallPrompt();

    await user.click(screen.getByRole("button", { name: "关闭安装提示" }));
    expect(screen.queryByText("把研究台安装为 Web 应用")).toBeNull();

    dispatchInstallPrompt({ outcome: "dismissed" });
    expect(screen.getByText("把研究台安装为 Web 应用")).toBeTruthy();
  });
});
