import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChartFacts } from "@hakimi/contracts";
import { FourPillarsMatrix } from "./four-pillars-matrix";

const pillar = (name: "year" | "month" | "day" | "hour", label: "年柱" | "月柱" | "日柱" | "时柱", stem: string, branch: string) => ({
  name,
  label,
  ganZhi: `${stem}${branch}`,
  stem,
  branch,
  hiddenStems: [stem],
  stemTenGod: name === "day" ? "日主" : "比肩",
  branchTenGods: ["比肩"],
  wuXing: "木木",
  nayin: "示例",
  twelveGrowth: "长生",
  xun: "甲子",
  voidBranches: "戌亥"
});

const facts: ChartFacts = {
  schemaVersion: "1.0.0",
  calendar: { solarText: "", lunarText: "", lunarYear: 1995, lunarMonth: 1, lunarDay: 1, isLeapMonth: false, previousJie: null, nextJie: null },
  pillars: {
    year: pillar("year", "年柱", "乙", "亥"),
    month: pillar("month", "月柱", "甲", "申"),
    day: pillar("day", "日柱", "辛", "巳"),
    hour: pillar("hour", "时柱", "壬", "辰")
  },
  fieldProvenance: []
};

describe("FourPillarsMatrix", () => {
  it("保留行标题与年/月/日/时四列，并可选择字段", () => {
    const onSelect = vi.fn();
    render(<FourPillarsMatrix facts={facts} selection={{ pillar: "day", field: "stem" }} onSelect={onSelect} />);
    expect(screen.getByRole("columnheader", { name: "年柱" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "时柱" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "藏干" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "时柱地支：辰" }));
    expect(onSelect).toHaveBeenCalledWith({ pillar: "hour", field: "branch" });
  });
});
