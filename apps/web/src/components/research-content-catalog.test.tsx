import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RESEARCH_SYSTEM_IDS } from "../lib/research-system-roadmap";
import { ResearchContentCatalog } from "./research-content-catalog";

describe("ResearchContentCatalog", () => {
  it("按权威体系顺序展示只读目录，并统一暴露 legacy-v13 边界", () => {
    const { container } = render(<ResearchContentCatalog />);
    const catalog = screen.getByRole("region", { name: "跨术数内容总目录" });
    const cards = Array.from(container.querySelectorAll<HTMLElement>(".research-content-catalog-card"));

    expect(catalog.getAttribute("data-binding-state")).toBe("bound");
    expect(cards.map((card) => card.dataset.systemId)).toEqual([...RESEARCH_SYSTEM_IDS]);

    for (const node of [catalog, ...cards]) {
      expect(node.getAttribute("data-release-identity")).toBe("legacy-v13");
      expect(node.getAttribute("data-schema-family")).toBe("legacy-v13");
      expect(node.getAttribute("data-db-generation")).toBe("13");
      expect(node.getAttribute("data-target-schema")).toBe("13");
      expect(node.getAttribute("data-migration-id")).toBe("null");
      expect(node.getAttribute("data-current-build-evidence-verified")).toBe("false");
      expect(node.getAttribute("data-public-release-authorized")).toBe("false");
      expect(node.getAttribute("data-expert-truth-established")).toBe("false");
      expect(node.getAttribute("data-formal-truth-established")).toBe("false");
      expect(node.getAttribute("data-scientific-validity-claimed")).toBe("false");
      expect(node.getAttribute("data-mutation-mode")).toBe("read-only-no-mutation");
      expect(node.getAttribute("data-mutation-epoch-bypassed")).toBe("false");
      expect(node.getAttribute("data-record-write-state")).toBe("not_started");
      expect(node.getAttribute("data-good-bad-score")).toBe("null");
      expect(node.getAttribute("data-result")).toBe("null");
    }
  });

  it("提供体系跳转和每张长卡的返回路径，仅开放八字实时入口", () => {
    const { container } = render(<ResearchContentCatalog />);
    const jump = screen.getByRole("navigation", { name: "快速定位内容体系" });
    const jumpLinks = within(jump).getAllByRole("link");
    const cardNavigations = screen.getAllByRole("navigation", { name: /卡片导航$/ });

    expect(jump.getAttribute("tabindex")).toBe("-1");
    expect(jumpLinks.map((link) => link.getAttribute("href"))).toEqual(
      RESEARCH_SYSTEM_IDS.map((systemId) => `#research-content-system-${systemId}`)
    );
    expect(cardNavigations).toHaveLength(RESEARCH_SYSTEM_IDS.length);
    for (const navigation of cardNavigations) {
      expect(within(navigation).getByRole("link", { name: "返回快速定位" }).getAttribute("href"))
        .toBe(`#${jump.id}`);
    }

    const runtimeEntries = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(".research-content-catalog-entry")
    );
    expect(runtimeEntries).toHaveLength(1);
    expect(runtimeEntries[0]?.closest(".research-content-catalog-card")?.getAttribute("data-system-id")).toBe("bazi");
    expect(runtimeEntries[0]?.getAttribute("href")?.startsWith("/")).toBe(true);
    expect(container.querySelectorAll(".research-content-catalog-no-entry")).toHaveLength(
      RESEARCH_SYSTEM_IDS.length - 1
    );
  });

  it("代表来源只使用显式 HTTPS 新窗口链接且不发送 referrer", () => {
    const { container } = render(<ResearchContentCatalog />);
    const sourceLinks = Array.from(
      container.querySelectorAll<HTMLAnchorElement>(".research-content-catalog-sources a")
    );

    expect(sourceLinks.length).toBeGreaterThan(0);
    for (const link of sourceLinks) {
      const url = new URL(link.href);
      expect(url.protocol).toBe("https:");
      expect(link.target).toBe("_blank");
      expect(link.rel.split(/\s+/u).sort()).toEqual(["noopener", "noreferrer"]);
      expect(link.getAttribute("referrerpolicy")).toBe("no-referrer");
      expect(link.getAttribute("aria-label")).toMatch(/来源域名.+在新窗口打开/u);
    }
  });
});
