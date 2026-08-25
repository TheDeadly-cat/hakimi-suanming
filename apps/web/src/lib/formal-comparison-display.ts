import type {
  ComparisonMatrix,
  ComparisonRow,
  ComparisonRowStatus,
  ComparisonSection
} from "@hakimi/contracts";

export type FormalComparisonDisplayScope =
  | { kind: "global" }
  | { kind: "active_pair"; compareIndex: number };

export type FormalComparisonDisplayRow = {
  row: ComparisonRow;
  status: ComparisonRowStatus;
  different: boolean;
};

export type FormalComparisonDisplaySection = Pick<ComparisonSection, "category" | "label"> & {
  rows: FormalComparisonDisplayRow[];
  differenceCount: number;
};

export type FormalComparisonDisplayProjection = {
  scope: FormalComparisonDisplayScope;
  sections: FormalComparisonDisplaySection[];
  differenceCount: number;
  sameBirthInput: boolean;
};

type DisplayMatrixSource = Pick<ComparisonMatrix, "sections" | "differenceCount" | "sameBirthInput"> & {
  items: readonly unknown[];
};

function cellSignature(cell: ComparisonRow["cells"][number]): string {
  return cell.availability === "value"
    ? `value:${cell.value}`
    : `availability:${cell.availability}`;
}

function displayStateForCells(
  cells: readonly ComparisonRow["cells"][number][]
): Pick<FormalComparisonDisplayRow, "status" | "different"> {
  const baseline = cells[0];
  if (!baseline || cells.length < 2) {
    throw new RangeError("正式对照字段至少需要两个单元格。");
  }
  const baselineSignature = cellSignature(baseline);
  if (cells.every((cell) => cellSignature(cell) === baselineSignature)) {
    return {
      status: baseline.availability === "value" ? "same" : baseline.availability,
      different: false
    };
  }
  return {
    status: cells.every((cell) => cell.availability === "value") ? "changed" : "mixed",
    different: true
  };
}

function activePairRow(
  row: ComparisonRow,
  compareIndex: number,
  itemCount: number
): Pick<FormalComparisonDisplayRow, "status" | "different"> {
  if (!Number.isInteger(compareIndex) || compareIndex < 1 || compareIndex >= itemCount) {
    throw new RangeError(`活动比较盘索引 ${compareIndex} 超出当前 ${itemCount} 盘对照范围。`);
  }
  if (row.cells.length !== itemCount) {
    throw new RangeError(`字段 ${row.id} 的单元格数量与当前对照盘数量不一致。`);
  }
  const baseline = row.cells[0];
  const comparator = row.cells[compareIndex];
  if (!baseline || !comparator) {
    throw new RangeError(`字段 ${row.id} 缺少 A 或活动比较盘单元格。`);
  }
  return displayStateForCells([baseline, comparator]);
}

export function buildFormalComparisonDisplay(
  matrix: DisplayMatrixSource,
  scope: FormalComparisonDisplayScope
): FormalComparisonDisplayProjection {
  if (matrix.items.length < 2 || matrix.items.length > 4) {
    throw new RangeError(`正式对照展示必须包含 2—4 盘，实际为 ${matrix.items.length} 盘。`);
  }
  if (scope.kind === "active_pair" && (
    !Number.isInteger(scope.compareIndex) ||
    scope.compareIndex < 1 ||
    scope.compareIndex >= matrix.items.length
  )) {
    throw new RangeError(`活动比较盘索引 ${scope.compareIndex} 超出当前 ${matrix.items.length} 盘对照范围。`);
  }
  const inputSectionCount = matrix.sections.filter((section) => section.category === "input").length;
  if (inputSectionCount !== 1) {
    throw new RangeError(`正式对照展示必须包含唯一输入分组，实际为 ${inputSectionCount} 个。`);
  }

  const seenSectionCategories = new Set<ComparisonSection["category"]>();
  const seenRowIds = new Set<string>();
  let derivedDifferenceCount = 0;
  let inputDifferenceCount: number | null = null;
  for (const section of matrix.sections) {
    if (seenSectionCategories.has(section.category)) {
      throw new RangeError(`正式对照展示重复包含分组 ${section.category}。`);
    }
    seenSectionCategories.add(section.category);
    let sectionDifferenceCount = 0;
    for (const row of section.rows) {
      if (seenRowIds.has(row.id)) {
        throw new RangeError(`正式对照展示重复包含字段 ${row.id}。`);
      }
      seenRowIds.add(row.id);
      if (row.category !== section.category) {
        throw new RangeError(`字段 ${row.id} 的分组身份与所在分组不一致。`);
      }
      if (
        row.values.length !== row.cells.length ||
        row.values.some((value, index) => value !== row.cells[index]?.value)
      ) {
        throw new RangeError(`字段 ${row.id} 的展示值与单元格证据不一致。`);
      }
      if (row.cells.length !== matrix.items.length) {
        throw new RangeError(`字段 ${row.id} 的单元格数量与当前对照盘数量不一致。`);
      }
      const derived = displayStateForCells(row.cells);
      if (row.status !== derived.status || row.different !== derived.different) {
        throw new RangeError(`字段 ${row.id} 的比较状态与单元格证据不一致。`);
      }
      if (derived.different) sectionDifferenceCount += 1;
    }
    if (section.differenceCount !== sectionDifferenceCount) {
      throw new RangeError(`分组 ${section.category} 的差异计数与字段证据不一致。`);
    }
    derivedDifferenceCount += sectionDifferenceCount;
    if (section.category === "input") inputDifferenceCount = sectionDifferenceCount;
  }
  if (matrix.differenceCount !== derivedDifferenceCount) {
    throw new RangeError("正式对照总差异计数与分组证据不一致。");
  }
  if (matrix.sameBirthInput !== (inputDifferenceCount === 0)) {
    throw new RangeError("出生输入一致性标记与输入分组证据不一致。");
  }

  if (scope.kind === "global") {
    return {
      scope,
      sections: matrix.sections.map((section) => ({
        category: section.category,
        label: section.label,
        rows: section.rows.map((row) => ({ row, status: row.status, different: row.different })),
        differenceCount: section.differenceCount
      })),
      differenceCount: matrix.differenceCount,
      sameBirthInput: matrix.sameBirthInput
    };
  }

  const sections = matrix.sections.map((section): FormalComparisonDisplaySection => {
    const rows = section.rows.map((row): FormalComparisonDisplayRow => ({
      row,
      ...activePairRow(row, scope.compareIndex, matrix.items.length)
    }));
    return {
      category: section.category,
      label: section.label,
      rows,
      differenceCount: rows.filter((row) => row.different).length
    };
  });
  const inputSection = sections.find((section) => section.category === "input");
  if (!inputSection) throw new RangeError("正式对照展示缺少输入分组。");
  return {
    scope,
    sections,
    differenceCount: sections.reduce((total, section) => total + section.differenceCount, 0),
    sameBirthInput: inputSection.differenceCount === 0
  };
}
