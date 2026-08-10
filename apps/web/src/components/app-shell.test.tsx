import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell candidate-set navigation", () => {
  it("候选详情在桌面与手机导航中都归属案例库", () => {
    render(
      <AppShell pathname="/candidate-sets/11111111-1111-4111-8111-111111111111">
        <p>候选组内容</p>
      </AppShell>
    );

    const desktopCases = within(screen.getByRole("navigation", { name: "主导航" })).getByRole("link", { name: "案例库" });
    const mobileCases = within(screen.getByRole("navigation", { name: "手机主导航" })).getByRole("link", { name: "案例" });
    expect(screen.getByRole("complementary", { name: "研究台侧栏" })).toBeTruthy();
    expect(desktopCases.getAttribute("aria-current")).toBe("page");
    expect(mobileCases.getAttribute("aria-current")).toBe("page");
  });

  it("为桌面新建、桌面设置和手机顶部设置暴露当前页面状态", () => {
    const { rerender } = render(
      <AppShell pathname="/new">
        <h1>新建排盘</h1>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: "新建排盘" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "排盘" }).getAttribute("aria-current")).toBe("page");

    rerender(
      <AppShell pathname="/settings">
        <h1>设置与诊断</h1>
      </AppShell>
    );
    const settingsLinks = screen.getAllByRole("link", { name: "设置与诊断" });
    expect(settingsLinks).toHaveLength(2);
    expect(settingsLinks.every((link) => link.getAttribute("aria-current") === "page")).toBe(true);

    rerender(
      <AppShell pathname="/settings/data">
        <h1>数据管理与完整备份</h1>
      </AppShell>
    );
    expect(screen.getAllByRole("link", { name: "设置与诊断" }).every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });

  it("把帮助放在桌面页脚与手机顶栏，保持手机主导航固定五项", () => {
    render(
      <AppShell pathname="/help">
        <h1>帮助与安全边界</h1>
      </AppShell>
    );

    const helpLinks = screen.getAllByRole("link", { name: "帮助与安全边界" });
    expect(helpLinks).toHaveLength(2);
    expect(helpLinks.every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getAllByRole("link", { name: "设置与诊断" }).every((link) => !link.hasAttribute("aria-current"))).toBe(true);

    const mobileNavigation = screen.getByRole("navigation", { name: "手机主导航" });
    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(5);
    expect(within(mobileNavigation).getAllByRole("link").every((link) => !link.hasAttribute("aria-current"))).toBe(true);
  });

  it("让双案例子路由继续归属桌面与手机对照导航", () => {
    render(
      <AppShell pathname="/compare/pair">
        <h1>双案例结构研究</h1>
      </AppShell>
    );

    const desktopCompare = within(screen.getByRole("navigation", { name: "主导航" })).getByRole("link", { name: "对照台" });
    const mobileCompare = within(screen.getByRole("navigation", { name: "手机主导航" })).getByRole("link", { name: "对照" });
    expect(desktopCompare.getAttribute("aria-current")).toBe("page");
    expect(mobileCompare.getAttribute("aria-current")).toBe("page");
  });

  it("提供正文跳转，并在跨页面导航后把焦点移到主内容区", () => {
    const { rerender } = render(
      <AppShell pathname="/cases">
        <h1>案例库</h1>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: "跳到主要内容" }).getAttribute("href")).toBe("#main-content");
    const main = screen.getByRole("main");
    expect(main.id).toBe("main-content");

    rerender(
      <AppShell pathname="/knowledge">
        <h1>典籍与术语</h1>
      </AppShell>
    );
    expect(document.activeElement).toBe(main);
  });
});
