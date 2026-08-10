import { describe, expect, it } from "vitest";
import {
  BAZI_RESEARCH_SYSTEM,
  RESEARCH_SYSTEM_IDS,
  RESEARCH_SYSTEM_ROADMAP,
  getResearchSystemEntryHref,
  getResearchSystemRoadmapItem
} from "./research-system-roadmap";

describe("research system roadmap", () => {
  it("冻结稳定且唯一的三体系 ID，并只开放八字研究预览", () => {
    expect(RESEARCH_SYSTEM_IDS).toEqual(["bazi", "ziwei-doushu", "western-astrology"]);
    expect(RESEARCH_SYSTEM_ROADMAP.map((item) => item.systemId)).toEqual(RESEARCH_SYSTEM_IDS);
    expect(new Set(RESEARCH_SYSTEM_ROADMAP.map((item) => item.systemId)).size).toBe(3);
    expect(RESEARCH_SYSTEM_ROADMAP.filter((item) => item.status === "active")).toEqual([
      BAZI_RESEARCH_SYSTEM
    ]);
    expect(BAZI_RESEARCH_SYSTEM).toMatchObject({
      status: "active",
      deliveryStatus: "research_preview",
      entryHref: "/"
    });
    expect(Object.isFrozen(RESEARCH_SYSTEM_IDS)).toBe(true);
    expect(Object.isFrozen(RESEARCH_SYSTEM_ROADMAP)).toBe(true);
  });

  it("计划项没有入口，未知或计划 ID 绝不回退到八字", () => {
    const planned = RESEARCH_SYSTEM_ROADMAP.filter((item) => item.status === "planned");
    expect(planned).toHaveLength(2);
    expect(planned.map((item) => item.deliveryStatus).sort()).toEqual([
      "diagnostic_preview",
      "isolated_engineering_preview"
    ]);
    expect(planned.every((item) => item.entryHref === null)).toBe(true);
    expect(planned.every((item) => item.summary.includes("主应用") && item.summary.includes("入口"))).toBe(true);
    expect(planned.every((item) => item.progressNote.length > 0)).toBe(true);
    expect(planned.every((item) => !("adapter" in item) && !("capabilities" in item))).toBe(true);
    expect(getResearchSystemEntryHref("ziwei-doushu")).toBeNull();
    expect(getResearchSystemEntryHref("western-astrology")).toBeNull();
    expect(getResearchSystemEntryHref("unknown-system")).toBeNull();
    expect(getResearchSystemRoadmapItem("unknown-system")).toBeNull();
    expect(getResearchSystemEntryHref("bazi")).toBe("/");
  });
});
