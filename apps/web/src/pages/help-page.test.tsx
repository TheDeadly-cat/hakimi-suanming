import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HelpPage } from "./help-page";

const { printReportMock } = vi.hoisted(() => ({ printReportMock: vi.fn() }));

vi.mock("@hakimi/platform", () => ({
  webReportExportPort: { printReport: printReportMock }
}));

beforeEach(() => {
  printReportMock.mockReset().mockResolvedValue(undefined);
});

describe("HelpPage", () => {
  it("只通过平台端口打印，并在适配器拒绝时显示可重试错误", async () => {
    printReportMock.mockRejectedValueOnce(new Error("安全指南打印不可用。"));
    render(<HelpPage />);

    const printButton = screen.getByRole("button", { name: "打印安全指南" });
    fireEvent.click(printButton);

    expect((await screen.findByText("安全指南打印不可用。")).closest("[role='alert']")).toBeTruthy();
    expect(printReportMock).toHaveBeenCalledTimes(1);

    fireEvent.click(printButton);
    await waitFor(() => expect(screen.queryByText("安全指南打印不可用。")).toBeNull());
    expect(printReportMock).toHaveBeenCalledTimes(2);
  });

  it("提供首次使用清单与可执行的数据安全入口", () => {
    render(<HelpPage />);

    expect(screen.getByRole("heading", { name: "帮助与安全边界" })).toBeTruthy();
    const checklist = document.querySelector("ol.help-first-steps");
    expect(checklist).toBeTruthy();
    expect(within(checklist as HTMLElement).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /打开演示排盘/ }).getAttribute("href")).toBe("/new?demo=1");
    expect(screen.getAllByRole("link", { name: /前往数据管理|检查完整备份|导出或预检完整备份|先做完整备份/ }).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("link", { name: /查看版本与诊断/ }).getAttribute("href")).toBe("/settings");
  });

  it("明确覆盖本地、明文备份、离线、规则与 AI 边界", () => {
    render(<HelpPage />);

    expect(screen.getByText(/默认只保存在当前浏览器资料中/)).toBeTruthy();
    expect(screen.getAllByText(/未加密的敏感明文/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Android APK.*不会自动继承/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/首次完整在线载入并由浏览器确认缓存后/)).toBeTruthy();
    expect(screen.getByText(/规则切换、运限、案例检索、正式对照、知识检索、导入导出与完整备份/)).toBeTruthy();
    expect(screen.getByText(/摘要一致、自动测试通过和两次复算相同/)).toBeTruthy();
    expect(screen.getByText(/应用内 AI Provider 外发保持关闭/)).toBeTruthy();
    expect(screen.getByText(/不提供 DeepSeek API Key 或发送入口/)).toBeTruthy();
    expect(screen.getByText(/按需加载时可能请求同源静态代码.*不等于用户数据外发/)).toBeTruthy();
    expect(screen.getByText(/仅本机结构化草稿验证/)).toBeTruthy();
    expect(screen.getByText(/不是医学、心理危机、法律、财务或人身安全决策系统/)).toBeTruthy();
    expect(screen.queryByText(/已经通过 360 例|自动云备份已开启|AI 已启用/)).toBeNull();
  });

  it("显示来自当前构建的版本身份并保留语义化主题导航", () => {
    render(<HelpPage />);

    const topicNavigation = screen.getByRole("navigation", { name: "帮助主题" });
    expect(within(topicNavigation).getAllByRole("link")).toHaveLength(9);
    expect(within(topicNavigation).getByRole("link", { name: "AI 边界" }).getAttribute("href")).toBe("#ai");
    expect(within(topicNavigation).getByRole("link", { name: "研究目录" }).getAttribute("href")).toBe("#appendix");
    expect(screen.getByText("Dexie 13")).toBeTruthy();
    expect(screen.getAllByText("full 1.2.0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("IANA 2026c")).toBeTruthy();
    expect(screen.getAllByText("未接入")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "常见问题" })).toBeTruthy();
  });

  it("只给八字提供真实入口，计划体系保持纯文本且不进入键盘顺序", () => {
    render(<HelpPage />);

    const roadmap = screen.getByRole("region", { name: "研究体系路线" });
    expect(within(roadmap).getAllByRole("listitem").length).toBeGreaterThanOrEqual(9);
    const bazi = within(roadmap).getByRole("article", { name: "八字" });
    expect(within(bazi).getByRole("link", { name: "进入八字研究工作台" }).getAttribute("href")).toBe("/");
    expect(within(bazi).getAllByText(/工程研究预览/)).toHaveLength(2);

    for (const label of ["紫微斗数", "西洋星盘"]) {
      const planned = within(roadmap).getByRole("article", { name: label });
      expect(within(planned).queryByRole("link")).toBeNull();
      expect(within(planned).queryByRole("button")).toBeNull();
      expect(planned.querySelector("[tabindex]")).toBeNull();
    }

    expect(within(roadmap).getByText(/隔离工程预览：可在独立 4218 地址完成计算/)).toBeTruthy();
    expect(within(roadmap).getByText(/诊断\/规则预览：4219 无存储规则预览与 Astronomy Engine 诊断可复算/)).toBeTruthy();
    expect(within(roadmap).getByText(/跨体系首先只做并列研究，不生成“准确率”或“一致率”/)).toBeTruthy();
  });

  it("展示三体系内容总目录，并区分实时目录、隔离快照与外部来源链接", () => {
    render(<HelpPage />);

    const catalog = screen.getByRole("region", { name: "跨术数内容总目录" });
    expect(within(catalog).getAllByRole("article")).toHaveLength(3);
    expect(catalog.getAttribute("data-binding-state")).toBe("bound");
    expect(catalog.getAttribute("data-scoring-allowed")).toBe("false");
    expect(catalog.getAttribute("data-public-release-authorized")).toBe("false");
    expect(within(catalog).getByText(/69 个八字审稿项、246 条紫微候选和 43 个西洋语义基元/)).toBeTruthy();

    const bazi = within(catalog).getByRole("article", { name: "八字" });
    expect(within(bazi).getByText("69", { selector: "strong" })).toBeTruthy();
    expect(within(bazi).getByText("10", { selector: "strong" })).toBeTruthy();
    expect(within(bazi).getByRole("link", { name: "进入八字研究工作台" }).getAttribute("href")).toBe("/");
    const baziSourceLinks = within(bazi).getAllByRole("link").filter((link) => link.getAttribute("target") === "_blank");
    expect(baziSourceLinks.length).toBeGreaterThan(0);
    expect(baziSourceLinks.every((link) => link.getAttribute("href")?.startsWith("https://"))).toBe(true);
    expect(within(within(bazi).getByRole("navigation", { name: "八字卡片导航" }))
      .getByRole("link", { name: "返回快速定位" }).getAttribute("href")).toMatch(/^#/);

    const ziwei = within(catalog).getByRole("article", { name: "紫微斗数" });
    expect(within(ziwei).getByText("246", { selector: "strong" })).toBeTruthy();
    expect(within(ziwei).getByText("11", { selector: "strong" })).toBeTruthy();
    expect(ziwei.querySelector(".research-content-catalog-entry")).toBeNull();
    const ziweiSourceLinks = within(ziwei).getAllByRole("link").filter((link) => link.getAttribute("target") === "_blank");
    expect(ziweiSourceLinks.length).toBeGreaterThan(0);
    expect(ziweiSourceLinks.every((link) => link.getAttribute("href")?.startsWith("https://"))).toBe(true);
    expect(within(within(ziwei).getByRole("navigation", { name: "紫微斗数卡片导航" }))
      .getByRole("link", { name: "返回快速定位" }).getAttribute("href")).toMatch(/^#/);
    expect(ziwei.closest("li")?.getAttribute("data-runtime-reachable")).toBe("false");
    expect(ziwei.closest("li")?.getAttribute("data-entry-href")).toBe("none");

    const western = within(catalog).getByRole("article", { name: "西洋星盘" });
    expect(within(western).getByText("43", { selector: "strong" })).toBeTruthy();
    expect(within(western).getByText("31", { selector: "strong" })).toBeTruthy();
    expect(western.querySelector(".research-content-catalog-entry")).toBeNull();
    expect(within(western).getByRole("link", { name: /Limits of Interpretation/ }).getAttribute("href"))
      .toBe("https://www.astro.com/astrowiki/en/Limits_of_Interpretation");

    for (const card of within(catalog).getAllByRole("article")) {
      const item = card.closest("li");
      expect(item?.getAttribute("data-expert-approved-count")).toBe("0");
      expect(item?.getAttribute("data-formal-published-count")).toBe("0");
      expect(item?.getAttribute("data-expert-truth-claimed")).toBe("false");
      expect(item?.getAttribute("data-formal-activation-allowed")).toBe("false");
      expect(item?.getAttribute("data-good-bad-score")).toBe("null");
      expect(item?.getAttribute("data-result")).toBe("null");
    }
  });
});
