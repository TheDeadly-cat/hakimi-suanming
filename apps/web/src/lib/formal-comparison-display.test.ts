import { describe, expect, it } from "vitest";
import type { ComparisonCell, ComparisonMatrix, ComparisonRow } from "@hakimi/contracts";
import { buildFormalComparisonDisplay } from "./formal-comparison-display";

function valueCell(value: string, status: ComparisonCell["status"]): ComparisonCell {
  return { value, availability: "value", status };
}

function unavailableCell(
  availability: Exclude<ComparisonCell["availability"], "value">,
  value: string
): ComparisonCell {
  return { value, availability, status: availability };
}

function row(id: string, cells: ComparisonCell[], status: ComparisonRow["status"], different: boolean): ComparisonRow {
  return {
    id,
    category: "input",
    label: id,
    values: cells.map((cell) => cell.value),
    cells,
    status,
    different
  };
}

function matrix(rows: ComparisonRow[]): ComparisonMatrix {
  return {
    items: [{}, {}, {}, {}] as ComparisonMatrix["items"],
    sections: [{
      category: "input",
      label: "输入",
      rows,
      differenceCount: rows.filter((item) => item.different).length
    }],
    rowCount: rows.length,
    differenceCount: rows.filter((item) => item.different).length,
    changedCategories: rows.some((item) => item.different) ? ["input"] : [],
    sameBirthInput: !rows.some((item) => item.different)
  };
}

describe("formal comparison display projection", () => {
  it("桌面保留 A—D 全局差异，窄屏按当前 A—B/C/D 独立计算", () => {
    const source = matrix([row("input.sex", [
      valueCell("男", "baseline"),
      valueCell("女", "changed"),
      valueCell("男", "same"),
      valueCell("女", "changed")
    ], "changed", true)]);

    expect(buildFormalComparisonDisplay(source, { kind: "global" })).toMatchObject({
      differenceCount: 1,
      sameBirthInput: false
    });
    expect(buildFormalComparisonDisplay(source, { kind: "active_pair", compareIndex: 1 }).sections[0].rows[0])
      .toMatchObject({ status: "changed", different: true });
    expect(buildFormalComparisonDisplay(source, { kind: "active_pair", compareIndex: 2 })).toMatchObject({
      differenceCount: 0,
      sameBirthInput: true
    });
    expect(buildFormalComparisonDisplay(source, { kind: "active_pair", compareIndex: 3 }).sections[0].rows[0])
      .toMatchObject({ status: "changed", different: true });
  });

  it("共同缺失不算差异，缺失与普通值并列时按 mixed 失败关闭", () => {
    const source = matrix([
      row("input.shared_missing", [
        unavailableCell("missing", "A 未记录"),
        unavailableCell("missing", "B 未记录"),
        unavailableCell("missing", "C 的提示文本可以不同"),
        unavailableCell("missing", "D 未记录")
      ], "missing", false),
      row("input.mixed", [
        unavailableCell("missing", "A 未记录"),
        unavailableCell("missing", "B 未记录"),
        valueCell("已记录", "added"),
        unavailableCell("missing", "D 未记录")
      ], "mixed", true)
    ]);

    const activeC = buildFormalComparisonDisplay(source, { kind: "active_pair", compareIndex: 2 });
    expect(activeC.sections[0].rows.map(({ status, different }) => ({ status, different }))).toEqual([
      { status: "missing", different: false },
      { status: "mixed", different: true }
    ]);
    expect(activeC.differenceCount).toBe(1);
    expect(activeC.sameBirthInput).toBe(false);
  });

  it("活动索引和字段单元格数量越界时拒绝静默改用其他盘", () => {
    const source = matrix([row("input.sex", [
      valueCell("男", "baseline"),
      valueCell("女", "changed"),
      valueCell("男", "same"),
      valueCell("女", "changed")
    ], "changed", true)]);
    expect(() => buildFormalComparisonDisplay(source, { kind: "active_pair", compareIndex: 0 })).toThrow(/索引/);
    expect(() => buildFormalComparisonDisplay(source, { kind: "active_pair", compareIndex: 4 })).toThrow(/索引/);

    const broken = matrix([{ ...source.sections[0].rows[0], cells: source.sections[0].rows[0].cells.slice(0, 3) }]);
    expect(() => buildFormalComparisonDisplay(broken, { kind: "active_pair", compareIndex: 2 }))
      .toThrow(/单元格数量/);
  });
});
