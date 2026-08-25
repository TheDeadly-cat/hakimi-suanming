import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChartFacts } from "@hakimi/contracts";
import { FourPillarsMatrix } from "./four-pillars-matrix";

const elementBySymbol: Record<string, string> = {
  甲: "木", 乙: "木", 寅: "木", 卯: "木",
  丙: "火", 丁: "火", 巳: "火", 午: "火",
  戊: "土", 己: "土", 辰: "土", 戌: "土", 丑: "土", 未: "土",
  庚: "金", 辛: "金", 申: "金", 酉: "金",
  壬: "水", 癸: "水", 亥: "水", 子: "水"
};

const pillar = (name: "year" | "month" | "day" | "hour", label: "年柱" | "月柱" | "日柱" | "时柱", stem: string, branch: string) => ({
  name,
  label,
  ganZhi: `${stem}${branch}`,
  stem,
  branch,
  hiddenStems: [stem],
  stemTenGod: name === "day" ? "日主" : "比肩",
  branchTenGods: ["比肩"],
  wuXing: `${elementBySymbol[stem]}${elementBySymbol[branch]}`,
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
  it("保留四柱语义、逐柱覆盖章并可选择字段", () => {
    const onSelect = vi.fn();
    render(<FourPillarsMatrix facts={facts} selection={{ pillar: "day", field: "stem" }} onSelect={onSelect} />);
    expect(screen.getByRole("columnheader", { name: /年柱，9\/9 个字段已提供/ })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /日柱，日主锚点，9\/9 个字段已提供/ })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /时柱，9\/9 个字段已提供/ })).toBeTruthy();
    expect(screen.getAllByText("9/9")).toHaveLength(4);
    expect(screen.getByRole("rowheader", { name: "藏干" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /时柱地支：辰；打开字段来源与计算收据/ }));
    expect(onSelect).toHaveBeenCalledWith({ pillar: "hour", field: "branch" });
  });

  it("方向键只移动键盘游标，明确激活后才打开字段依据", () => {
    const onSelect = vi.fn();
    render(<FourPillarsMatrix facts={facts} selection={{ pillar: "day", field: "stem" }} onSelect={onSelect} />);
    const dayStem = screen.getByRole("button", { name: /日柱天干：辛；打开字段来源与计算收据/ });
    dayStem.focus();

    fireEvent.keyDown(dayStem, { key: "ArrowRight" });
    const hourStem = screen.getByRole("button", { name: /时柱天干：壬；打开字段来源与计算收据/ });
    expect(document.activeElement).toBe(hourStem);
    expect(hourStem.tabIndex).toBe(0);
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(hourStem);
    expect(onSelect).toHaveBeenCalledWith({ pillar: "hour", field: "stem" });
  });

  it("日柱没有绑定日主身份时失败关闭", () => {
    const invalidFacts: ChartFacts = {
      ...facts,
      pillars: {
        ...facts.pillars,
        day: { ...facts.pillars.day, stemTenGod: "比肩" }
      }
    };

    render(<FourPillarsMatrix facts={invalidFacts} selection={{ pillar: "day", field: "stem" }} onSelect={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("日柱的十神没有绑定日主身份");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("五行字段与干支映射矛盾时拒绝着色展示", () => {
    const invalidFacts: ChartFacts = {
      ...facts,
      pillars: {
        ...facts.pillars,
        year: { ...facts.pillars.year, wuXing: "火火" }
      }
    };

    render(<FourPillarsMatrix facts={invalidFacts} selection={{ pillar: "year", field: "wuXing" }} onSelect={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("年柱的五行字段与天干地支映射不一致");
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("空五行字段保留为未提供并计入逐柱覆盖", () => {
    const incompleteFacts: ChartFacts = {
      ...facts,
      pillars: {
        ...facts.pillars,
        year: { ...facts.pillars.year, wuXing: "" }
      }
    };

    render(<FourPillarsMatrix facts={incompleteFacts} selection={{ pillar: "year", field: "wuXing" }} onSelect={vi.fn()} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("columnheader", { name: /年柱，8\/9 个字段已提供，1 项未提供/ })).toBeTruthy();
    expect(screen.getByText("8/9")).toBeTruthy();
    expect(screen.getByRole("button", { name: /年柱五行：未提供；打开字段来源与计算收据/ })).toBeTruthy();
  });
});
