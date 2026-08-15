import { BAZI_CONTENT_REVIEW_QUEUE } from "@hakimi/bazi-interpretation";
import { describe, expect, it } from "vitest";
import {
  RESEARCH_CONTENT_CATALOG,
  RESEARCH_CONTENT_CATALOG_PROFILE,
  buildResearchContentCatalog,
  type ResearchContentCatalogSystem
} from "./research-content-catalog";
import { RESEARCH_SYSTEM_IDS } from "./research-system-roadmap";

describe("research content catalog", () => {
  it("以不同计量单位固定三体系目录，不生成跨体系总分", () => {
    expect(RESEARCH_CONTENT_CATALOG.profile).toBe(RESEARCH_CONTENT_CATALOG_PROFILE);
    expect(RESEARCH_CONTENT_CATALOG.systems.map((system) => system.systemId)).toEqual(RESEARCH_SYSTEM_IDS);
    expect(RESEARCH_CONTENT_CATALOG.counts).toEqual({
      systems: 3,
      liveActive: 1,
      staticIsolatedSnapshots: 2,
      expertApproved: 0,
      formalPublished: 0
    });
    expect("fixedInventory" in RESEARCH_CONTENT_CATALOG.counts).toBe(false);

    const [bazi, ziwei, western] = RESEARCH_CONTENT_CATALOG.systems;
    expect(bazi).toMatchObject({
      systemId: "bazi",
      catalogState: "live_active",
      fixedInventoryCount: BAZI_CONTENT_REVIEW_QUEUE.counts.total,
      sourceRegistryCount: BAZI_CONTENT_REVIEW_QUEUE.sources.length,
      inventoryUnit: "未裁决审稿项",
      runtimeReachable: true,
      entryHref: "/"
    });
    expect(bazi?.sections.map((section) => [section.sectionId, section.itemCount])).toEqual([
      ["strength_method", 4],
      ["ten_god_position", 40],
      ["shensha_rule", 5],
      ["shensha_position", 20]
    ]);
    expect(ziwei).toMatchObject({
      systemId: "ziwei-doushu",
      catalogState: "static_isolated_snapshot",
      fixedInventoryCount: 246,
      sourceRegistryCount: 11,
      inventoryUnit: "中性候选条目",
      runtimeReachable: false,
      entryHref: null
    });
    expect(ziwei?.sections.map((section) => section.itemCount)).toEqual([14, 12, 168, 4, 48]);
    expect(western).toMatchObject({
      systemId: "western-astrology",
      catalogState: "static_isolated_snapshot",
      fixedInventoryCount: 43,
      sourceRegistryCount: 31,
      inventoryUnit: "来源绑定语义基元",
      runtimeReachable: false,
      entryHref: null
    });
    expect(western?.sections.map((section) => section.itemCount)).toEqual([10, 12, 12, 5, 4]);
    expect(Object.isFrozen(RESEARCH_CONTENT_CATALOG)).toBe(true);
    expect(Object.isFrozen(RESEARCH_CONTENT_CATALOG.systems)).toBe(true);
    expect(RESEARCH_CONTENT_CATALOG.systems.every(Object.isFrozen)).toBe(true);
  });

  it("所有体系都保留来源和证据，同时把专家真值、吉凶与发布保持关闭", () => {
    expect(RESEARCH_CONTENT_CATALOG.profile).toMatchObject({
      runtimeImportPolicy: "isolated_draft_imports_forbidden",
      navigationPolicy: "no_draft_runtime_entry",
      countComparisonPolicy: "inventory_units_are_not_cross_system_scores",
      expertTruthClaimed: false,
      formalActivationAllowed: false,
      scoringAllowed: false
    });

    for (const system of RESEARCH_CONTENT_CATALOG.systems) {
      expect(system.representativeSources.length).toBeGreaterThan(0);
      expect(system.representativeSources.length).toBeLessThanOrEqual(system.sourceRegistryCount);
      expect(new Set(system.representativeSources.map((source) => source.sourceId)).size)
        .toBe(system.representativeSources.length);
      expect(system.representativeSources.every((source) => source.url.startsWith("https://"))).toBe(true);
      expect(system.evidenceDocuments.every((path) => path.startsWith("docs/"))).toBe(true);
      expect(system.expertApprovedCount).toBe(0);
      expect(system.formalPublishedCount).toBe(0);
      expect(system.expertTruthClaimed).toBe(false);
      expect(system.formalActivationAllowed).toBe(false);
      expect(system.goodBadScore).toBeNull();
      expect(system.result).toBeNull();
    }
    expect(RESEARCH_CONTENT_CATALOG.knownBoundaries.join(" ")).toMatch(/不能相加|不等于专家真值/);
  });

  it("对数量、隔离入口、来源协议和结论字段篡改均失效关闭", () => {
    const replaceSystem = (
      systemId: ResearchContentCatalogSystem["systemId"],
      replacement: (system: ResearchContentCatalogSystem) => ResearchContentCatalogSystem
    ): readonly ResearchContentCatalogSystem[] => RESEARCH_CONTENT_CATALOG.systems.map((system) => (
      system.systemId === systemId ? replacement(system) : system
    ));

    expect(() => buildResearchContentCatalog({
      systems: replaceSystem("ziwei-doushu", (system) => ({ ...system, fixedInventoryCount: 247 }))
    })).toThrow(/固定目录数量必须为 246/);

    expect(() => buildResearchContentCatalog({
      systems: replaceSystem("ziwei-doushu", (system) => ({
        ...system,
        entryHref: "/ziwei",
        entryLabel: "打开紫微"
      }))
    })).toThrow(/隔离快照不得拥有主应用运行时入口/);

    expect(() => buildResearchContentCatalog({
      systems: replaceSystem("western-astrology", (system) => ({
        ...system,
        representativeSources: system.representativeSources.map((source, index) => (
          index === 0 ? { ...source, url: "http://example.test/source" } : source
        ))
      }))
    })).toThrow(/代表来源无效/);

    const truthTamper = replaceSystem("bazi", (system) => ({
      ...system,
      expertApprovedCount: 1,
      goodBadScore: "auspicious"
    } as unknown as ResearchContentCatalogSystem));
    expect(() => buildResearchContentCatalog({ systems: truthTamper }))
      .toThrow(/越过专家真值或正式发布边界/);
  });
});
