import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  ComparisonCellStatus,
  ComparisonRow,
  ComparisonRowStatus,
  FormalComparisonProjection
} from "@hakimi/comparison-core";
import { transitSnapshotSchema, type TransitNodeType } from "@hakimi/contracts";
import {
  buildFormalComparisonDisplay,
  type FormalComparisonDisplayScope
} from "../lib/formal-comparison-display";
import "./formal-comparison-tables.css";

export type ComparisonDisplayMode = "formal" | "pair";
const GLOBAL_DIFFERENCE_SCOPE: FormalComparisonDisplayScope = { kind: "global" };
type FormalComparisonDisplay = ReturnType<typeof buildFormalComparisonDisplay>;

const TRACKS = ["dayun", "xiaoyun", "year", "month", "day", "hour"] as const;
const FORMAL_COLUMN_MARKS = ["A", "B", "C", "D"] as const;
const UNSAFE_COMPARISON_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/u;
const SENSITIVE_COMPARISON_ERROR_PATTERN = /(?:https?:\/\/|file:\/\/|[a-z]:\\|\/(?:users|home)\/|api[_-]?key|authorization|bearer\s|secret|token|password|stack\s*trace|(?:\r?\n)\s*at\s)/iu;
const MAX_COMPARISON_IDENTIFIER_CHARACTERS = 256;
const MAX_COMPARISON_LABEL_CHARACTERS = 512;
const MAX_COMPARISON_MESSAGE_CHARACTERS = 4_000;
const MAX_COMPARISON_AUDIT_VALUE_CHARACTERS = 24_000;
const MAX_COMPARISON_TOTAL_AUDIT_CHARACTERS = 2_000_000;
const MAX_COMPARISON_SECTIONS = 64;
const MAX_COMPARISON_ROWS = 1_024;
const MAX_COMPARISON_ROWS_PER_SECTION = 256;
type HorizontalScrollState = "fit" | "start" | "middle" | "end";
const TRACK_LABELS: Record<TransitNodeType, string> = {
  dayun: "大运",
  xiaoyun: "小运",
  year: "流年",
  month: "流月",
  day: "流日",
  hour: "流时"
};
const CELL_STATUS_LABELS: Record<ComparisonCellStatus, string> = {
  baseline: "基准值",
  same: "值一致",
  changed: "值不同",
  added: "相对基准有值",
  missing: "数据缺失",
  not_applicable: "不适用",
  unsupported: "不支持"
};
const ROW_STATUS_LABELS: Record<ComparisonRowStatus, string> = {
  same: "各列值一致",
  changed: "字段值不同",
  mixed: "值或可用状态不同",
  missing: "各列均缺失",
  not_applicable: "各列均不适用",
  unsupported: "各列均未支持"
};

function comparisonCodePointLength(value: string, stopAfter = Number.POSITIVE_INFINITY): number {
  let count = 0;

  for (let index = 0; index < value.length; index += 1) {
    if ((value.codePointAt(index) ?? 0) > 0xffff) index += 1;
    count += 1;
    if (count > stopAfter) return count;
  }

  return count;
}

function horizontalScrollHint(state: HorizontalScrollState): string {
  if (state === "fit") return "全部对照列已显示";
  if (state === "start") return "向右滚动查看后续列";
  if (state === "end") return "已到最右列，可向左返回";
  return "左右滚动核对各列";
}

function useHorizontalScrollState(contentIdentity: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<HorizontalScrollState>("fit");

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    const updateScrollState = () => {
      const maximumScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
      const nextState: HorizontalScrollState = maximumScrollLeft <= 1
        ? "fit"
        : element.scrollLeft <= 1
          ? "start"
          : element.scrollLeft >= maximumScrollLeft - 1
            ? "end"
            : "middle";
      setScrollState((current) => current === nextState ? current : nextState);
    };

    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(updateScrollState)
      : null;
    resizeObserver?.observe(element);
    if (!resizeObserver) window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", updateScrollState);
    };
  }, [contentIdentity]);

  return { scrollRef, scrollState };
}

function columnMark(index: number, mode: ComparisonDisplayMode): string {
  if (mode === "pair") return index === 0 ? "甲" : "乙";
  return FORMAL_COLUMN_MARKS[index] ?? "D";
}

function cellStatusLabel(status: ComparisonCellStatus, mode: ComparisonDisplayMode, columnIndex: number): string {
  if (status === "baseline") return mode === "pair" ? "对象甲基准值" : "基准值";
  if (columnIndex === 0) {
    const subject = mode === "pair" ? "对象甲" : "基准列";
    if (status === "missing") return `${subject}数据缺失`;
    if (status === "not_applicable") return `${subject}口径不适用`;
    if (status === "unsupported") return `${subject}当前未支持`;
  }
  return CELL_STATUS_LABELS[status];
}

function tableInstanceSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "") || "instance";
}

function isSafeComparisonText(value: unknown, maximumCharacters: number, requireContent = true): value is string {
  if (typeof value !== "string"
    || value.length > maximumCharacters * 2
    || comparisonCodePointLength(value, maximumCharacters) > maximumCharacters
    || UNSAFE_COMPARISON_TEXT_PATTERN.test(value)) return false;
  return !requireContent || value.trim().length > 0;
}

function columnRole(index: number, activeCompareIndex: number): "baseline" | "active" | "inactive" {
  if (index === 0) return "baseline";
  return index === activeCompareIndex ? "active" : "inactive";
}

function columnRoleLabel(
  index: number,
  activeCompareIndex: number,
  mode: ComparisonDisplayMode,
  scopeKind: FormalComparisonDisplayScope["kind"]
): string {
  if (mode === "pair") return index === 0 ? "对象甲" : "对象乙";
  if (index === 0) return "基准事实列";
  if (index === activeCompareIndex) return "当前活动比较列";
  return scopeKind === "global" ? "参与全局比较" : "非活动比较列";
}

function shortColumnIdentity(value: string): string {
  const characters = Array.from(value.trim());
  return characters.length > 22
    ? `${characters.slice(0, 10).join("")}…${characters.slice(-8).join("")}`
    : characters.join("");
}

function ActiveComparisonBinding({
  items,
  activeCompareIndex,
  mode,
  scopeKind
}: {
  items: FormalComparisonProjection["matrix"]["items"];
  activeCompareIndex: number;
  mode: ComparisonDisplayMode;
  scopeKind: FormalComparisonDisplayScope["kind"];
}) {
  const baseline = items[0]!;
  const active = items[activeCompareIndex]!;
  return (
    <div className="comparison-active-binding" role="group" aria-label="当前活动对照列绑定">
      <div className="comparison-active-binding__item" data-role="baseline">
        <small>{columnMark(0, mode)} · {columnRoleLabel(0, activeCompareIndex, mode, scopeKind)}</small>
        <strong>{baseline.caseAlias}</strong>
        <span>Slot {baseline.slotId} · Case <code title={baseline.caseId}>{shortColumnIdentity(baseline.caseId)}</code></span>
        <span>Revision {baseline.revision.revisionNumber} · <code title={baseline.revision.id}>{shortColumnIdentity(baseline.revision.id)}</code></span>
        <span>RuleProfile {baseline.revision.ruleProfile.profileId}@{baseline.revision.ruleProfile.profileVersion}</span>
        <span>记录摘要 <code title={baseline.revisionSnapshotDigest}>{shortColumnIdentity(baseline.revisionSnapshotDigest)}</code></span>
      </div>
      <span className="comparison-active-binding__connector" aria-hidden="true"><span>↔</span></span>
      <div className="comparison-active-binding__item" data-role="active">
        <small>{columnMark(activeCompareIndex, mode)} · {columnRoleLabel(activeCompareIndex, activeCompareIndex, mode, scopeKind)}</small>
        <strong>{active.caseAlias}</strong>
        <span>Slot {active.slotId} · Case <code title={active.caseId}>{shortColumnIdentity(active.caseId)}</code></span>
        <span>Revision {active.revision.revisionNumber} · <code title={active.revision.id}>{shortColumnIdentity(active.revision.id)}</code></span>
        <span>RuleProfile {active.revision.ruleProfile.profileId}@{active.revision.ruleProfile.profileVersion}</span>
        <span>记录摘要 <code title={active.revisionSnapshotDigest}>{shortColumnIdentity(active.revisionSnapshotDigest)}</code></span>
      </div>
    </div>
  );
}

function isHeaderToken(value: string): boolean {
  return isSafeComparisonText(value, MAX_COMPARISON_IDENTIFIER_CHARACTERS) && !/\s/u.test(value);
}

function errorMessage(error: unknown): string {
  const fallback = "显示投影构造器返回了未知错误。";
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  if (!isSafeComparisonText(message, 220) || SENSITIVE_COMPARISON_ERROR_PATTERN.test(message)) return fallback;
  return message;
}

function matrixBindingIssue(
  matrix: FormalComparisonProjection["matrix"],
  activeCompareIndex: number,
  mode: ComparisonDisplayMode
): string | null {
  const itemCount = matrix.items.length;
  if (mode === "pair" && itemCount !== 2) {
    return `双案例事实对照必须恰好包含 2 列，当前收到 ${itemCount} 列。`;
  }
  if (mode === "formal" && (itemCount < 2 || itemCount > 4)) {
    return `正式对照必须包含 2 至 4 列，当前收到 ${itemCount} 列。`;
  }
  if (!Number.isInteger(activeCompareIndex) || activeCompareIndex <= 0 || activeCompareIndex >= itemCount) {
    return `活动比较列 ${activeCompareIndex} 不属于当前非基准列。`;
  }
  const itemKeys = matrix.items.map((item) => item.key);
  if (itemKeys.some((key) => !isHeaderToken(key))) {
    return "对照投影包含空列键，无法建立列身份。";
  }
  if (new Set(itemKeys).size !== itemKeys.length) {
    return "对照投影包含重复列键，无法建立唯一列绑定。";
  }
  const slotIds = matrix.items.map((item) => item.slotId);
  if (slotIds.some((slotId) => !isHeaderToken(slotId)) || new Set(slotIds).size !== slotIds.length) {
    return "对照投影包含空 Slot 或重复 Slot，无法建立唯一位置绑定。";
  }
  if (matrix.items.some((item) => (
    !isHeaderToken(item.caseId)
    || !isHeaderToken(item.revision.caseId)
    || item.caseId !== item.revision.caseId
  ))) {
    return "对照投影包含空 Case 标识，或 Case 与 Revision 归属不一致。";
  }
  const revisionIds = matrix.items.map((item) => item.revision.id);
  if (new Set(revisionIds).size !== revisionIds.length) {
    return "同一 Revision 以不同列键重复进入对照，已拒绝渲染重复比较。";
  }
  if (matrix.items.some((item) => !isSafeComparisonText(item.caseAlias, MAX_COMPARISON_LABEL_CHARACTERS))) {
    return "对照投影包含空案例标签，无法辨识列身份。";
  }
  if (matrix.items.some((item) => (
    !isHeaderToken(item.revision.id)
    || !Number.isSafeInteger(item.revision.revisionNumber)
    || item.revision.revisionNumber < 1
    || !isHeaderToken(item.revision.ruleProfile.profileId)
    || !isHeaderToken(item.revision.ruleProfile.profileVersion)
    || !isHeaderToken(item.revision.input.timeZone)
    || (item.revision.rulePackBinding !== undefined
      && (!isHeaderToken(item.revision.rulePackBinding.packId)
        || !isHeaderToken(item.revision.rulePackBinding.useMode)))
  ))) {
    return "对照投影包含未绑定 Revision 或 RuleProfile 的列。";
  }
  if (matrix.items.some((item) => !/^[a-f0-9]{64}$/.test(item.revisionSnapshotDigest))) {
    return "对照投影包含格式无效的 Revision 记录摘要；本页不会把该字符串视为已验真证据。";
  }
  return null;
}

function derivedCellStatus(row: ComparisonRow, index: number): ComparisonCellStatus | null {
  const cell = row.cells[index];
  if (!cell) return null;
  if (cell.availability !== "value") return cell.availability;
  if (index === 0) return "baseline";
  const baseline = row.cells[0];
  if (!baseline) return null;
  if (baseline.availability !== "value") return "added";
  return cell.value === baseline.value ? "same" : "changed";
}

function displayBindingIssue(
  display: FormalComparisonDisplay,
  expected: FormalComparisonDisplay,
  itemCount: number
): string | null {
  if (display.sections.length > MAX_COMPARISON_SECTIONS) {
    return `显示投影包含 ${display.sections.length} 个分组，超过当前安全展示上限 ${MAX_COMPARISON_SECTIONS}。`;
  }
  const totalDisplayRows = display.sections.reduce((total, section) => total + section.rows.length, 0);
  if (!Number.isSafeInteger(totalDisplayRows) || totalDisplayRows > MAX_COMPARISON_ROWS) {
    return `显示投影字段总数超过当前安全展示上限 ${MAX_COMPARISON_ROWS}。`;
  }
  if (display.scope.kind !== expected.scope.kind) {
    return `显示投影范围 ${display.scope.kind} 与当前范围 ${expected.scope.kind} 不一致。`;
  }
  if (
    display.scope.kind === "active_pair"
    && expected.scope.kind === "active_pair"
    && display.scope.compareIndex !== expected.scope.compareIndex
  ) {
    return `显示投影活动列 ${display.scope.compareIndex} 与当前活动列 ${expected.scope.compareIndex} 不一致。`;
  }
  if (display.differenceCount !== expected.differenceCount || display.sameBirthInput !== expected.sameBirthInput) {
    return "显示投影汇总与当前矩阵重新计算结果不一致。";
  }
  if (display.sections.length !== expected.sections.length) {
    return `显示投影包含 ${display.sections.length} 个分组，当前矩阵应为 ${expected.sections.length} 个。`;
  }
  const sectionIds = new Set<string>();
  const rowIds = new Set<string>();
  let totalAuditValueCharacters = 0;
  for (let sectionIndex = 0; sectionIndex < display.sections.length; sectionIndex += 1) {
    const section = display.sections[sectionIndex]!;
    const expectedSection = expected.sections[sectionIndex]!;
    if (!isHeaderToken(section.category) || !isSafeComparisonText(section.label, MAX_COMPARISON_LABEL_CHARACTERS)) {
      return "对照分组包含空标签或不能用于表头关联的分类键。";
    }
    if (sectionIds.has(section.category)) return `对照分组 ${section.category} 重复。`;
    sectionIds.add(section.category);
    if (
      section.category !== expectedSection.category
      || section.label !== expectedSection.label
      || section.differenceCount !== expectedSection.differenceCount
    ) {
      return `显示投影分组 ${section.category} 与当前矩阵分组绑定不一致。`;
    }
    if (section.rows.length > MAX_COMPARISON_ROWS_PER_SECTION) {
      return `显示投影分组 ${section.category} 超过单组 ${MAX_COMPARISON_ROWS_PER_SECTION} 行的安全展示上限。`;
    }
    if (section.rows.length !== expectedSection.rows.length) {
      return `显示投影分组 ${section.category} 包含 ${section.rows.length} 行，当前矩阵应为 ${expectedSection.rows.length} 行。`;
    }
    for (let rowIndex = 0; rowIndex < section.rows.length; rowIndex += 1) {
      const displayRow = section.rows[rowIndex]!;
      const expectedRow = expectedSection.rows[rowIndex]!;
      const row = displayRow.row;
      if (!isHeaderToken(row.id)
        || !isHeaderToken(row.category)
        || !isSafeComparisonText(row.label, MAX_COMPARISON_LABEL_CHARACTERS)) {
        return `对照分组 ${section.category} 包含空标签或不能用于表头关联的字段 ID。`;
      }
      if (rowIds.has(row.id)) return `对照字段 ${row.id} 重复，无法建立唯一表头关联。`;
      rowIds.add(row.id);
      if (row.cells.length !== itemCount) {
        return `对照字段 ${row.id} 包含 ${row.cells.length} 个单元格，与 ${itemCount} 列投影不一致。`;
      }
      if (row.values.length !== itemCount || row.values.some((value, index) => value !== row.cells[index]?.value)) {
        return `对照字段 ${row.id} 的值数组与单元格证据不一致。`;
      }
      if (row.values.some((value) => !isSafeComparisonText(value, MAX_COMPARISON_AUDIT_VALUE_CHARACTERS, false))) {
        return `对照字段 ${row.id} 包含超长或不可安全显示的审计值。`;
      }
      totalAuditValueCharacters += row.values.reduce((total, value) => total + comparisonCodePointLength(value), 0);
      if (!Number.isSafeInteger(totalAuditValueCharacters) || totalAuditValueCharacters > MAX_COMPARISON_TOTAL_AUDIT_CHARACTERS) {
        return `显示投影审计文本总量超过当前安全展示上限 ${MAX_COMPARISON_TOTAL_AUDIT_CHARACTERS.toLocaleString("zh-CN")} 字符。`;
      }
      if (
        row.id !== expectedRow.row.id
        || row.category !== expectedRow.row.category
        || row.label !== expectedRow.row.label
        || row.status !== expectedRow.row.status
        || row.different !== expectedRow.row.different
        || displayRow.status !== expectedRow.status
        || displayRow.different !== expectedRow.different
      ) {
        return `显示投影字段 ${row.id} 与当前矩阵重新计算结果不一致。`;
      }
      for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex += 1) {
        const cell = row.cells[cellIndex]!;
        const expectedCell = expectedRow.row.cells[cellIndex]!;
        const expectedStatus = derivedCellStatus(row, cellIndex);
        if (!expectedStatus || cell.status !== expectedStatus) {
          return `对照字段 ${row.id} 的第 ${cellIndex + 1} 列状态不能由可用性与基准值重算。`;
        }
        if (
          cell.status !== expectedCell.status
          || cell.availability !== expectedCell.availability
          || cell.value !== expectedCell.value
        ) {
          return `显示投影字段 ${row.id} 的第 ${cellIndex + 1} 列不属于当前矩阵。`;
        }
      }
    }
  }
  return null;
}

function ComparisonBindingFailure({ mode, label, issue }: {
  mode: ComparisonDisplayMode;
  label: string;
  issue: string;
}) {
  return (
    <div
      className="comparison-matrix-scroll comparison-binding-failure"
      role="region"
      aria-label={label}
      data-display-mode={mode}
      data-projection-state="invalid"
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-current-build-evidence-verified="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-scientific-validity-claimed="false"
      data-source-rights-established="false"
      data-good-bad-orientation="null"
      data-good-bad-score="null"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-state="not_started"
      data-result="null"
    >
      <div className="comparison-binding-error" role="alert">
        <strong>对照投影绑定无效，已拒绝显示</strong>
        <p>{issue}</p>
        <small>没有隐藏异常列、补造单元格或回退到近似结果。</small>
      </div>
    </div>
  );
}

function AuditValue({ row, value, status }: { row: ComparisonRow; value: string; status: ComparisonCellStatus }) {
  if (!value.trim()) {
    const label = status === "missing"
      ? "该列没有可用记录值"
      : status === "not_applicable"
        ? "该字段对本列不适用"
        : status === "unsupported"
          ? "当前规则未支持该字段"
          : "已记录空字符串";
    return <span className="comparison-cell-empty" data-empty-kind={status}>{label}</span>;
  }
  if (row.id.endsWith("complete_snapshot") || value.length > 320) {
    return (
      <details className="comparison-audit-value">
        <summary><span>查看{row.label}完整值</span><small>{comparisonCodePointLength(value).toLocaleString("zh-CN")} 字符</small></summary>
        <code tabIndex={0} dir="auto" aria-label={`${row.label}完整审计值`}>{value}</code>
      </details>
    );
  }
  return <span className="comparison-cell-value">{value}</span>;
}

export function ComparisonMatrixTable({
  projection,
  activeCompareIndex,
  differencesOnly,
  differenceScope = GLOBAL_DIFFERENCE_SCOPE,
  display,
  mode = "formal"
}: {
  projection: Pick<FormalComparisonProjection, "matrix">;
  activeCompareIndex: number;
  differencesOnly: boolean;
  differenceScope?: FormalComparisonDisplayScope;
  display?: FormalComparisonDisplay;
  mode?: ComparisonDisplayMode;
}) {
  const instanceId = useId();
  const matrixIssue = useMemo(
    () => matrixBindingIssue(projection.matrix, activeCompareIndex, mode)
      ?? (differenceScope.kind === "active_pair" && differenceScope.compareIndex !== activeCompareIndex
        ? `差异范围活动列 ${differenceScope.compareIndex} 与当前比较列 ${activeCompareIndex} 不一致。`
        : null),
    [activeCompareIndex, differenceScope, mode, projection.matrix]
  );
  const displayResolution = useMemo((): { resolved: FormalComparisonDisplay | null; issue: string | null } => {
    if (matrixIssue) return { resolved: null, issue: null };
    try {
      const expected = buildFormalComparisonDisplay(projection.matrix, differenceScope);
      const resolved = display ?? expected;
      const issue = displayBindingIssue(resolved, expected, projection.matrix.items.length);
      return {
        resolved: issue ? null : resolved,
        issue
      };
    } catch (error) {
      return { resolved: null, issue: `无法构建当前对照显示：${errorMessage(error)}` };
    }
  }, [differenceScope, display, matrixIssue, projection.matrix]);
  const resolvedDisplay = displayResolution.resolved;
  const sections = useMemo(() => resolvedDisplay
    ? resolvedDisplay.sections.map((section) => ({
      ...section,
      rows: differencesOnly ? section.rows.filter((row) => row.different) : section.rows
    })).filter((section) => section.rows.length > 0)
    : [], [differencesOnly, resolvedDisplay]);
  const visibleRowCount = useMemo(
    () => sections.reduce((total, section) => total + section.rows.length, 0),
    [sections]
  );
  const bindingIssue = matrixIssue ?? displayResolution.issue ?? (resolvedDisplay ? null : "当前对照显示不可用。");
  const tablePrefix = `${mode === "pair" ? "pair-comparison" : "formal-comparison"}-${tableInstanceSuffix(instanceId)}`;
  const activeItem = projection.matrix.items[activeCompareIndex];
  const activePairCaption = activeItem
    ? `当前活动范围按 ${columnMark(0, mode)} 与 ${columnMark(activeCompareIndex, mode)} · ${activeItem.caseAlias} 计算差异；非活动列不参与行标记和筛选，窄屏会隐藏，打印时仅作为上下文列显示。`
    : "当前活动比较盘不可用。";
  const viewScopeLabel = mode === "pair"
    ? "甲 ↔ 乙"
    : differenceScope.kind === "active_pair"
      ? `A ↔ ${columnMark(activeCompareIndex, mode)}`
      : `A ↔ ${projection.matrix.items.slice(1).map((_, index) => columnMark(index + 1, mode)).join(" / ")}`;
  const { scrollRef, scrollState } = useHorizontalScrollState(
    `${bindingIssue ?? "bound"}:${projection.matrix.items.length}:${visibleRowCount}:${differenceScope.kind}`,
  );

  if (bindingIssue) {
    return <ComparisonBindingFailure mode={mode} label={mode === "pair" ? "双案例事实字段并列表" : "正式命盘字段对照表"} issue={bindingIssue} />;
  }

  return (
    <div
      ref={scrollRef}
      className="comparison-matrix-scroll"
      role="region"
      aria-label={mode === "pair" ? "双案例事实字段并列表" : "正式命盘字段对照表"}
      tabIndex={0}
      data-difference-scope={differenceScope.kind}
      data-display-mode={mode}
      data-differences-only={differencesOnly}
      data-active-compare-index={activeCompareIndex}
      data-column-count={projection.matrix.items.length}
      data-visible-row-count={visibleRowCount}
      data-visible-section-count={sections.length}
      data-horizontal-scroll-state={scrollState}
      data-projection-state="bound"
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-current-build-evidence-verified="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-source-rights-established="false"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-state="not_started"
      data-pair-relationship-inferred="false"
      data-good-bad-orientation="null"
      data-good-bad-score="null"
      data-result="null"
    >
      <div className="comparison-status-key" role="group" aria-label="字段对照状态图例">
        <div className="comparison-status-key__heading">
          <span>状态图例 · 不是评分</span>
          <small role="status" aria-live="polite">{viewScopeLabel} · {sections.length} 个分组 · {visibleRowCount} 个字段可见</small>
        </div>
        <ul>
          <li data-key-status="same">值一致</li>
          <li data-key-status="changed">字段值不同</li>
          <li data-key-status="presence">有值或缺失状态不同</li>
          <li data-key-status="unavailable">口径不适用或未支持</li>
        </ul>
        <span className="comparison-scroll-hint" data-scroll-state={scrollState}>{horizontalScrollHint(scrollState)}</span>
        <ActiveComparisonBinding
          items={projection.matrix.items}
          activeCompareIndex={activeCompareIndex}
          mode={mode}
          scopeKind={differenceScope.kind}
        />
        <p className="comparison-evidence-boundary">legacy-v13 · Schema 13 · migration null · 只读工程对照 · 差异只表示字段值或可用状态不同，不构成关系、吉凶、优劣、因果、专家真值或公开发布授权。</p>
      </div>
      <table className="comparison-matrix">
        <caption>{mode === "pair"
          ? "全部字段只并列两个案例各自的可审计事实；差异不表达两人关系、吉凶、相合、相克、因果或优劣。Slot、Case、Revision、RuleProfile 与记录摘要只标示列绑定，本表不据此宣称摘要已验真。"
          : differenceScope.kind === "active_pair"
            ? `${activePairCaption} 差异不表达吉凶、优劣或因果；记录摘要只标示列绑定，不等于本表已完成摘要验真。`
            : "全部差异只表示任一比较盘相对 A 的字段值或可用状态不同，不表达吉凶、优劣或因果；记录摘要只标示列绑定，不等于本表已完成摘要验真。"}</caption>
        <thead>
          <tr>
            <th id={`${tablePrefix}-column-field`} scope="col" className="comparison-field-heading">字段</th>
            {projection.matrix.items.map((item, index) => (
              <th
                id={`${tablePrefix}-column-${index}`}
                scope="col"
                key={item.key}
                data-column-index={index}
                data-column-active={index === 0 || index === activeCompareIndex}
                data-column-role={columnRole(index, activeCompareIndex)}
                className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}
              >
                <span className="comparison-slot-mark">{columnMark(index, mode)}</span>
                <span className="comparison-column-role">{columnRoleLabel(index, activeCompareIndex, mode, differenceScope.kind)}</span>
                <strong>{item.caseAlias}</strong>
                <small>Slot {item.slotId} · Case <code title={item.caseId}>{shortColumnIdentity(item.caseId)}</code></small>
                <small>Revision {item.revision.revisionNumber} · <code title={item.revision.id}>{shortColumnIdentity(item.revision.id)}</code></small>
                <small>RuleProfile {item.revision.ruleProfile.profileId}@{item.revision.ruleProfile.profileVersion}</small>
                <small>{item.revision.rulePackBinding
                  ? `规则包 ${item.revision.rulePackBinding.packId} · ${item.revision.rulePackBinding.useMode}`
                  : "未提供规则包绑定 · 不推断迁移"}</small>
              </th>
            ))}
          </tr>
        </thead>
        {sections.length === 0 ? (
          <tbody className="comparison-empty-body">
            <tr>
              <td colSpan={projection.matrix.items.length + 1}>
                <div className="comparison-empty-state" role="status">
                  <strong>{differencesOnly ? "当前范围没有字段差异" : "当前没有可展示的审计字段"}</strong>
                  <span>{differencesOnly
                    ? "这只表示当前比较范围内的字段值与可用状态一致，不代表吉凶、适配度或现实结论。"
                    : "系统没有用空值或近似字段补造对照行。"}</span>
                </div>
              </td>
            </tr>
          </tbody>
        ) : null}
        {sections.map((section) => {
          const sectionHeaderId = `${tablePrefix}-section-${section.category}`;
          return (
            <tbody key={section.category} data-category={section.category} aria-labelledby={sectionHeaderId}>
              <tr className="comparison-section-row">
                <th id={sectionHeaderId} scope="rowgroup" colSpan={projection.matrix.items.length + 1}>
                  <span
                    className="comparison-section-anchor"
                    id={`compare-section-${section.category}`}
                    tabIndex={-1}
                  >{section.label}</span>
                  <small>{section.differenceCount} 项不同</small>
                </th>
              </tr>
              {section.rows.map((displayRow) => {
                const row = displayRow.row;
                const rowHeaderId = `${tablePrefix}-row-${row.id}`;
                return (
                  <tr
                    key={row.id}
                    data-field-id={row.id}
                    data-row-different={displayRow.different}
                    data-row-status={displayRow.status}
                    className={displayRow.different ? "is-different" : `is-${displayRow.status}`}
                  >
                    <th id={rowHeaderId} scope="row">
                      <span>{row.label}</span>
                      <small>{ROW_STATUS_LABELS[displayRow.status]}</small>
                    </th>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.id}:${projection.matrix.items[index].key}`}
                        headers={`${sectionHeaderId} ${rowHeaderId} ${tablePrefix}-column-${index}`}
                        data-cell-status={cell.status}
                        data-column-role={columnRole(index, activeCompareIndex)}
                        className={`${index > 0 && index !== activeCompareIndex ? "is-inactive-compare " : ""}cell-status-${cell.status}`}
                      >
                        <small className="comparison-cell-status">{cellStatusLabel(cell.status, mode, index)}</small>
                        <AuditValue row={row} value={cell.value} status={cell.status} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

type TransitCellState = "resolved" | "error" | "unsupported" | "not_applicable";

function TransitCell({ children, status, state }: { children: ReactNode; status: string; state: TransitCellState }) {
  return (
    <div className="transit-compare-cell" data-transit-state={state}>
      <small>{status}</small>
      <div className="transit-compare-content">{children}</div>
    </div>
  );
}

export function TransitComparisonTable({
  projection,
  activeCompareIndex,
  mode = "formal"
}: {
  projection: Pick<FormalComparisonProjection, "matrix" | "transits">;
  activeCompareIndex: number;
  mode?: ComparisonDisplayMode;
}) {
  const instanceId = useId();
  const matrixIssue = useMemo(
    () => matrixBindingIssue(projection.matrix, activeCompareIndex, mode),
    [activeCompareIndex, mode, projection.matrix]
  );
  const transitIndex = useMemo(() => {
    const itemByKey = new Map(projection.matrix.items.map((item) => [item.key, item] as const));
    const resultByKey = new Map<string, FormalComparisonProjection["transits"][number]>();
    let issue: string | null = null;
    let targetInstant: string | null = null;
    if (projection.transits.length !== projection.matrix.items.length) {
      issue = `运限投影必须为每个对照列返回一个结果；当前收到 ${projection.transits.length} 个结果，对照表包含 ${projection.matrix.items.length} 列。`;
    }
    for (const [resultIndex, result] of projection.transits.entries()) {
      if (issue) break;
      if (!itemByKey.has(result.itemKey)) {
        issue = `运限投影引用了未知对照列 ${result.itemKey}。`;
        break;
      }
      const expectedItem = projection.matrix.items[resultIndex];
      if (!expectedItem || result.itemKey !== expectedItem.key) {
        issue = `运限投影第 ${resultIndex + 1} 项未绑定到同位置对照列。`;
        break;
      }
      if (resultByKey.has(result.itemKey)) {
        issue = `运限投影重复返回对照列 ${result.itemKey}。`;
        break;
      }
      let indexedResult = result;
      if (result.status === "error") {
        if (!isHeaderToken(result.code)
          || !isSafeComparisonText(result.message, MAX_COMPARISON_MESSAGE_CHARACTERS)
          || SENSITIVE_COMPARISON_ERROR_PATTERN.test(result.message)) {
          issue = `运限投影列 ${result.itemKey} 返回了空错误代码或说明。`;
          break;
        }
      } else {
        const snapshotValidation = transitSnapshotSchema.safeParse(result.snapshot);
        if (!snapshotValidation.success) {
          issue = `运限投影列 ${result.itemKey} 未通过严格 TransitSnapshot 契约。`;
          break;
        }
        const snapshot = snapshotValidation.data;
        const expectedLuckCycleRuleDigest = expectedItem.revision.manifest.luckCycleRuleDigest ?? null;
        if (snapshot.caseId !== expectedItem.caseId
          || snapshot.revisionId !== expectedItem.revision.id
          || snapshot.revisionResultHash !== expectedItem.revision.manifest.resultHash
          || snapshot.ruleProfileDigest !== expectedItem.revision.manifest.ruleProfileDigest
          || snapshot.target.displayTimeZone !== expectedItem.revision.input.timeZone
          || (expectedLuckCycleRuleDigest !== null
            ? snapshot.luckCycleRuleDigest !== expectedLuckCycleRuleDigest || snapshot.luckCycleRuleSource !== "revision_snapshot"
            : snapshot.luckCycleRuleSource !== "legacy_inferred")) {
          issue = `运限投影列 ${result.itemKey} 与当前 Case、Revision、规则摘要或展示时区绑定不一致。`;
          break;
        }
        indexedResult = { ...result, snapshot };
        const instant = snapshot.target.instant.trim();
        if (!isSafeComparisonText(instant, 128)
          || instant !== snapshot.target.instant
          || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(instant)
          || Number.isNaN(Date.parse(instant))) {
          issue = `运限投影列 ${result.itemKey} 缺少有效 UTC 瞬时点。`;
          break;
        }
        if (targetInstant !== null && instant !== targetInstant) {
          issue = `运限投影列 ${result.itemKey} 的瞬时点与其他列不一致。`;
          break;
        }
        targetInstant = instant;
        if (!isHeaderToken(snapshot.target.displayTimeZone)
          || !isSafeComparisonText(snapshot.target.revisionWallDateTime, MAX_COMPARISON_LABEL_CHARACTERS)) {
          issue = `运限投影列 ${result.itemKey} 缺少显示时区或民用时。`;
          break;
        }
        for (const track of TRACKS) {
          const slot = snapshot.slots[track];
          if (!slot) {
            issue = `运限投影列 ${result.itemKey} 缺少 ${track} 槽。`;
            break;
          }
          if (slot.status === "resolved"
            && (!isSafeComparisonText(slot.node.ganZhi, 64)
              || !isSafeComparisonText(slot.node.label, MAX_COMPARISON_LABEL_CHARACTERS))) {
            issue = `运限投影列 ${result.itemKey} 的 ${track} 节点缺少干支或标签。`;
            break;
          }
          if (slot.status !== "resolved"
            && (!isHeaderToken(slot.reasonCode)
              || !isSafeComparisonText(slot.message, MAX_COMPARISON_MESSAGE_CHARACTERS))) {
            issue = `运限投影列 ${result.itemKey} 的 ${track} 不可用状态缺少原因代码或说明。`;
            break;
          }
        }
        if (issue) break;
      }
      resultByKey.set(result.itemKey, indexedResult);
    }
    return { resultByKey, issue, targetInstant };
  }, [projection.matrix.items, projection.transits]);
  const tablePrefix = `${mode === "pair" ? "pair-transit" : "formal-transit"}-${tableInstanceSuffix(instanceId)}`;
  const bindingIssue = matrixIssue ?? transitIndex.issue;
  const { scrollRef, scrollState } = useHorizontalScrollState(
    `${bindingIssue ?? "bound"}:${projection.matrix.items.length}:${transitIndex.targetInstant ?? "no-instant"}`,
  );
  if (bindingIssue) {
    return <ComparisonBindingFailure mode={mode} label={mode === "pair" ? "双案例同一瞬时点六层运限并列表" : "同一瞬时点六层运限对照"} issue={bindingIssue} />;
  }
  const resultByKey = transitIndex.resultByKey;
  const transitScopeLabel = mode === "pair"
    ? "甲 ↔ 乙"
    : `${columnMark(0, mode)} ↔ ${columnMark(activeCompareIndex, mode)}`;
  return (
    <div
      ref={scrollRef}
      className="comparison-matrix-scroll"
      role="region"
      aria-label={mode === "pair" ? "双案例同一瞬时点六层运限并列表" : "同一瞬时点六层运限对照"}
      tabIndex={0}
      data-display-mode={mode}
      data-active-compare-index={activeCompareIndex}
      data-difference-scope="active_pair"
      data-column-count={projection.matrix.items.length}
      data-target-instant={transitIndex.targetInstant ?? "error-only"}
      data-horizontal-scroll-state={scrollState}
      data-projection-state="bound"
      data-schema-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-current-build-evidence-verified="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-source-rights-established="false"
      data-public-release-authorized="false"
      data-mutation-epoch-bypassed="false"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-state="not_started"
      data-pair-relationship-inferred="false"
      data-good-bad-orientation="null"
      data-good-bad-score="null"
      data-result="null"
    >
      <div className="comparison-status-key comparison-transit-key" role="group" aria-label="运限投影状态图例">
        <div className="comparison-status-key__heading">
          <span>状态图例 · 各盘独立投影</span>
          <small>{transitScopeLabel} · {transitIndex.targetInstant ? `UTC ${transitIndex.targetInstant}` : "各列均为执行器错误，结果未携带快照瞬时点"}</small>
        </div>
        <ul>
          <li data-key-status="resolved">可复算节点</li>
          <li data-key-status="error">执行器错误</li>
          <li data-key-status="unavailable">口径不可用</li>
        </ul>
        <span className="comparison-scroll-hint" data-scroll-state={scrollState}>{horizontalScrollHint(scrollState)}</span>
        <ActiveComparisonBinding
          items={projection.matrix.items}
          activeCompareIndex={activeCompareIndex}
          mode={mode}
          scopeKind="active_pair"
        />
        <p className="comparison-evidence-boundary">legacy-v13 · Schema 13 · migration null · 同一 UTC 瞬时点只读投影 · 节点并列不计算跨盘关系，也不证明规则正确、专家认可或现实事件结果。</p>
      </div>
      <table className="comparison-matrix transit-comparison-matrix">
        <caption>{mode === "pair"
          ? "同一个 UTC 瞬时点请求分别投影到两个案例自己的时区与锁版规则；只展示各自节点事实，不计算跨盘关系。"
          : "同一个 UTC 瞬时点请求分别投影到各修订自身的时区与锁版规则；节点 ID 不要求相同。"}</caption>
        <thead>
          <tr>
            <th id={`${tablePrefix}-column-field`} scope="col" className="comparison-field-heading">同步运限</th>
            {projection.matrix.items.map((item, index) => (
              <th id={`${tablePrefix}-column-${index}`} key={item.key} scope="col" data-column-index={index} data-column-active={index === 0 || index === activeCompareIndex} data-column-role={columnRole(index, activeCompareIndex)} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}>
                <span className="comparison-slot-mark">{columnMark(index, mode)}</span>
                <span className="comparison-column-role">{columnRoleLabel(index, activeCompareIndex, mode, "active_pair")}</span>
                <strong>{item.caseAlias}</strong>
                <small>Slot {item.slotId} · Case <code title={item.caseId}>{shortColumnIdentity(item.caseId)}</code></small>
                <small>Revision {item.revision.revisionNumber} · <code title={item.revision.id}>{shortColumnIdentity(item.revision.id)}</code></small>
                <small>{item.revision.input.timeZone}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr data-field-id="transit.wall_time">
            <th id={`${tablePrefix}-row-wall-time`} scope="row"><span>对应民用时</span><small>同瞬时点</small></th>
            {projection.matrix.items.map((item, index) => {
              const result = resultByKey.get(item.key);
              return (
                <td key={item.key} headers={`${tablePrefix}-row-wall-time ${tablePrefix}-column-${index}`} data-column-role={columnRole(index, activeCompareIndex)} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}>
                  {result?.status === "resolved"
                    ? <TransitCell status={result.snapshot.target.displayTimeZone} state="resolved">{result.snapshot.target.revisionWallDateTime}</TransitCell>
                    : <TransitCell status={result?.status === "error" ? result.code : "绑定异常"} state="error">{result?.status === "error" ? result.message : "已校验索引中缺少当前列"}</TransitCell>}
                </td>
              );
            })}
          </tr>
          {TRACKS.map((track) => (
            <tr key={track} data-field-id={`transit.${track}`} data-track={track}>
              <th id={`${tablePrefix}-row-${track}`} scope="row"><span>{TRACK_LABELS[track]}</span><small>{track}</small></th>
              {projection.matrix.items.map((item, index) => {
                const result = resultByKey.get(item.key);
                if (!result) {
                  return <td key={item.key} headers={`${tablePrefix}-row-${track} ${tablePrefix}-column-${index}`} data-column-role={columnRole(index, activeCompareIndex)} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}><TransitCell status="绑定异常" state="error">已校验索引中缺少当前列</TransitCell></td>;
                }
                if (result.status === "error") {
                  return <td key={item.key} headers={`${tablePrefix}-row-${track} ${tablePrefix}-column-${index}`} data-column-role={columnRole(index, activeCompareIndex)} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}><TransitCell status={result.code} state="error">{result.message}</TransitCell></td>;
                }
                const slot = result.snapshot.slots[track];
                return (
                  <td key={item.key} headers={`${tablePrefix}-row-${track} ${tablePrefix}-column-${index}`} data-column-role={columnRole(index, activeCompareIndex)} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}>
                    {slot.status === "resolved"
                      ? <TransitCell status={slot.node.frame === "fixed_plus08" ? "固定 +08" : "修订本地"} state="resolved"><strong>{slot.node.ganZhi}</strong><span>{slot.node.label}</span></TransitCell>
                      : <TransitCell status={slot.status === "unsupported" ? "不支持" : "不适用"} state={slot.status === "unsupported" ? "unsupported" : "not_applicable"}><strong>{slot.reasonCode}</strong><span>{slot.message}</span></TransitCell>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
