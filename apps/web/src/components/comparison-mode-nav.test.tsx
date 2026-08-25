import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonModeNav, type ComparisonMode } from "./comparison-mode-nav";

describe("ComparisonModeNav", () => {
  it("用短名称标记当前与切换入口，并把边界拆到描述关系", () => {
    render(<ComparisonModeNav active="formal" />);

    const navigation = screen.getByRole("navigation", { name: "对照研究模式，当前为多盘 / 多规则" });
    expect(navigation.getAttribute("data-binding-state")).toBe("bound");
    expect(navigation.getAttribute("data-active-mode")).toBe("formal");

    const activeLink = screen.getByRole("link", { name: "当前模式：多盘 / 多规则" });
    const pairLink = screen.getByRole("link", { name: "切换到模式：双案例结构研究" });
    expect(activeLink.getAttribute("aria-current")).toBe("page");
    expect(activeLink.getAttribute("href")).toBe("/compare");
    expect(pairLink.getAttribute("href")).toBe("/compare/pair");

    const pairDescription = (pairLink.getAttribute("aria-describedby") ?? "")
      .split(/\s+/u)
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    expect(pairDescription).toContain("恰好两个不同 Case");
    expect(pairDescription).toContain("拒绝同一 Case");
    expect(pairDescription).toContain("不会沿用同 Case 多修订语义");

    expect(fireEvent.click(activeLink)).toBe(false);
  });

  it("未知模式失败关闭并把两个入口标记为恢复", () => {
    render(<ComparisonModeNav active={"unknown" as ComparisonMode} />);

    const navigation = screen.getByRole("navigation", { name: "对照研究模式，当前绑定无法识别" });
    expect(navigation.getAttribute("data-binding-state")).toBe("error");
    expect(navigation.getAttribute("data-active-mode")).toBe("unknown");
    expect(screen.getByRole("alert").textContent).toContain("没有自动猜测为多盘或双案例");
    expect(screen.getByRole("link", { name: "恢复到模式：多盘 / 多规则" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "恢复到模式：双案例结构研究" }).getAttribute("aria-current")).toBeNull();
  });
});
