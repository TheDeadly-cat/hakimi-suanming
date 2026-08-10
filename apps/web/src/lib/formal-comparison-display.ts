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
  if (cellSignature(baseline) === cellSignature(comparator)) {
    return {
      status: baseline.availability === "value" ? "same" : baseline.availability,
      different: false
    };
  }
  return {
    status: baseline.availability === "value" && comparator.availability === "value"
      ? "changed"
      : "mixed",
    different: true
  };
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
  return {
    scope,
    sections,
    differenceCount: sections.reduce((total, section) => total + section.differenceCount, 0),
    sameBirthInput: (sections.find((section) => section.category === "input")?.differenceCount ?? 0) === 0
  };
}
