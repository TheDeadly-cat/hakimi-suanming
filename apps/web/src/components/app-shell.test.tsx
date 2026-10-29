import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell candidate-set navigation", () => {
  it("候选详情在桌面与手机导航中都归属案例库", () => {
    render(
      <AppShell pathname="/candidate-sets/11111111-1111-4111-8111-111111111111">
        <p>候选组内容</p>
      </AppShell>
    );

    const desktopCases = within(screen.getByRole("navigation", { name: "主导航" })).getByRole("link", { name: "案例库" });
    const mobileCases = within(screen.getByRole("navigation", { name: "手机主导航" })).getByRole("link", { name: "档案" });
    expect(screen.getByRole("complementary", { name: "研究台侧栏" })).toBeTruthy();
    expect(desktopCases.getAttribute("aria-current")).toBe("page");
    expect(mobileCases.getAttribute("aria-current")).toBe("page");
    expect(mobileCases.getAttribute("href")).toBe("/reports");
  });

  it("为桌面新建、桌面设置和手机顶部设置暴露当前页面状态", () => {
    const { rerender } = render(
      <AppShell pathname="/new">
        <h1>新建排盘</h1>
      </AppShell>
    );

    const desktopCreate = within(screen.getByRole("complementary", { name: "命盘侧栏" }))
      .getByRole("link", { name: "新建排盘" });
    const mobileCreate = within(screen.getByRole("navigation", { name: "手机主导航" }))
      .getByRole("link", { name: "首页" });
    expect(desktopCreate.getAttribute("aria-current")).toBe("page");
    expect(mobileCreate.getAttribute("aria-current")).toBe("page");

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

  it("把帮助放在桌面页脚与手机顶栏，并归属固定四项导航中的我的", () => {
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
    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(4);
    expect(mobileNavigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(within(mobileNavigation).getByRole("link", { name: "我的" }).getAttribute("aria-current")).toBe("page");
  });

  it("双案例子路由保留桌面对照导航，并归属手机档案入口", () => {
    render(
      <AppShell pathname="/compare/pair">
        <h1>双案例结构研究</h1>
      </AppShell>
    );

    const desktopCompare = within(screen.getByRole("navigation", { name: "主导航" })).getByRole("link", { name: "对照台" });
    const mobileCompare = within(screen.getByRole("navigation", { name: "手机主导航" })).getByRole("link", { name: "档案" });
    expect(desktopCompare.getAttribute("aria-current")).toBe("page");
    expect(mobileCompare.getAttribute("aria-current")).toBe("page");
  });

  it("从阅读进入专业盘、学习与设置时，一级导航的名称和目的地保持不变", () => {
    const chartPath = "/cases/11111111-1111-4111-8111-111111111111/revisions/22222222-2222-4222-8222-222222222222";
    const { rerender } = render(<AppShell pathname={chartPath} search="?view=reading"><p>阅读内容</p></AppShell>);
    const assertNavigation = (active: string) => {
      const nav = screen.getByRole("navigation", { name: "手机主导航" });
      expect(within(nav).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
        ["首页", "/"], ["档案", "/reports"], ["学习", "/knowledge"], ["我的", "/settings"]
      ]);
      expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
      expect(within(nav).getByRole("link", { name: active }).getAttribute("aria-current")).toBe("page");
    };
    assertNavigation("档案");
    rerender(<AppShell pathname="/reports"><p>正式档案与报告</p></AppShell>);
    assertNavigation("档案");
    rerender(<AppShell pathname="/cases/11111111-1111-4111-8111-111111111111"><p>个人档案</p></AppShell>);
    assertNavigation("档案");
    rerender(<AppShell pathname="/cases"><p>全部资料管理</p></AppShell>);
    assertNavigation("档案");
    rerender(<AppShell pathname={chartPath} search="?view=structure"><p>专业盘</p></AppShell>);
    assertNavigation("档案");
    rerender(<AppShell pathname="/knowledge"><p>学习</p></AppShell>);
    assertNavigation("学习");
    rerender(<AppShell pathname="/settings/data"><p>本机数据</p></AppShell>);
    assertNavigation("我的");
  });

  it("档案提供资料与保存时原文两个入口，报告页仍归属档案", () => {
    const { rerender } = render(<AppShell pathname="/cases"><p>资料列表</p></AppShell>);
    const nav = screen.getByRole("navigation", { name: "档案内容" });
    expect(within(nav).getByRole("link", { name: "已保存报告" }).getAttribute("href")).toBe("/reports");
    expect(within(nav).getByRole("link", { name: "命盘资料" }).getAttribute("aria-current")).toBe("page");
    rerender(<AppShell pathname="/reports"><p>原文报告列表</p></AppShell>);
    expect(within(screen.getByRole("navigation", { name: "档案内容" })).getByRole("link", { name: "已保存报告" }).getAttribute("aria-current")).toBe("page");
    expect(within(screen.getByRole("navigation", { name: "手机主导航" })).getByRole("link", { name: "档案" }).getAttribute("aria-current")).toBe("page");
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

  it("更换预加载端口后忽略旧端口的迟到失败，不清除新 epoch 的路由族去重", async () => {
    let rejectFirst!: (reason?: unknown) => void;
    const firstPreload = vi.fn(() => new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    }));
    const secondPreload = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <AppShell pathname="/" onPreloadRoute={firstPreload}>
        <h1>工作台</h1>
      </AppShell>
    );
    const getDesktopCasesLink = () => within(screen.getByRole("navigation", { name: "主导航" }))
      .getByRole("link", { name: "我的命盘" });

    fireEvent.pointerOver(getDesktopCasesLink());
    expect(firstPreload).toHaveBeenCalledTimes(1);
    expect(firstPreload).toHaveBeenCalledWith("/cases");

    rerender(
      <AppShell pathname="/" onPreloadRoute={secondPreload}>
        <h1>工作台</h1>
      </AppShell>
    );
    fireEvent.pointerOver(getDesktopCasesLink());
    expect(secondPreload).toHaveBeenCalledTimes(1);

    rejectFirst(new Error("旧预加载端口迟到失败"));
    await Promise.resolve();
    await Promise.resolve();
    fireEvent.pointerOver(getDesktopCasesLink());
    expect(secondPreload).toHaveBeenCalledTimes(1);
  });

  it("首页壳层保留安全身份而不重复工程横幅，专业页继续显示研究边界", () => {
    const { container, rerender } = render(
      <AppShell pathname="/">
        <h1>工作台</h1>
      </AppShell>
    );
    const assertSafetyIdentity = (node: Element | null) => {
      expect(node?.getAttribute("data-release-identity")).toBe("legacy-v13");
      expect(node?.getAttribute("data-schema-family")).toBe("legacy-v13");
      expect(node?.getAttribute("data-db-generation")).toBe("legacy-v13");
      expect(node?.getAttribute("data-target-schema")).toBe("13");
      expect(node?.getAttribute("data-migration-id")).toBe("null");
      expect(node?.getAttribute("data-mutation-epoch-bypassed")).toBe("false");
      expect(node?.getAttribute("data-public-release-authorized")).toBe("false");
      expect(node?.getAttribute("data-expert-truth-claimed")).toBe("false");
    };
    assertSafetyIdentity(container.querySelector(".app-shell"));
    expect(screen.queryByLabelText("研究预览边界")).toBeNull();
    rerender(<AppShell pathname="/knowledge"><h1>读懂报告里的词</h1></AppShell>);
    assertSafetyIdentity(container.querySelector(".app-shell"));
    expect(screen.queryByLabelText("研究预览边界")).toBeNull();
    expect(container.querySelector(".app-shell--reading")).toBeTruthy();
    rerender(<AppShell pathname="/knowledge" search="?view=library"><h1>知识来源</h1></AppShell>);
    assertSafetyIdentity(container.querySelector(".app-shell"));
    assertSafetyIdentity(screen.getByLabelText("研究预览边界"));
  });
});
