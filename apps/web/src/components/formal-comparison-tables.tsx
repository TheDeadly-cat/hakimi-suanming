import type { ReactNode } from "react";
import type {
  ComparisonCellStatus,
  ComparisonRow,
  FormalComparisonProjection
} from "@hakimi/comparison-core";
import type { TransitNodeType } from "@hakimi/contracts";
import {
  buildFormalComparisonDisplay,
  type FormalComparisonDisplayScope
} from "../lib/formal-comparison-display";

export type ComparisonDisplayMode = "formal" | "pair";
const GLOBAL_DIFFERENCE_SCOPE: FormalComparisonDisplayScope = { kind: "global" };

const TRACKS = ["dayun", "xiaoyun", "year", "month", "day", "hour"] as const;
const TRACK_LABELS: Record<TransitNodeType, string> = {
  dayun: "大运",
  xiaoyun: "小运",
  year: "流年",
  month: "流月",
  day: "流日",
  hour: "流时"
};
const CELL_STATUS_LABELS: Record<ComparisonCellStatus, string> = {
  baseline: "基准",
  same: "相同",
  changed: "改变",
  added: "新增",
  missing: "缺失",
  not_applicable: "不适用",
  unsupported: "不支持"
};

function columnMark(index: number, mode: ComparisonDisplayMode): string {
  if (mode === "pair") return index === 0 ? "甲" : "乙";
  return ["A", "B", "C", "D"][index] ?? "D";
}

function cellStatusLabel(status: ComparisonCellStatus, mode: ComparisonDisplayMode): string {
  if (mode === "pair" && status === "baseline") return "对象甲";
  return CELL_STATUS_LABELS[status];
}

function AuditValue({ row, value }: { row: ComparisonRow; value: string }) {
  if (row.id.endsWith("complete_snapshot") || value.length > 320) {
    return (
      <details className="comparison-audit-value">
        <summary>查看完整值</summary>
        <code>{value}</code>
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
  mode = "formal"
}: {
  projection: Pick<FormalComparisonProjection, "matrix">;
  activeCompareIndex: number;
  differencesOnly: boolean;
  differenceScope?: FormalComparisonDisplayScope;
  mode?: ComparisonDisplayMode;
}) {
  const display = buildFormalComparisonDisplay(projection.matrix, differenceScope);
  const sections = display.sections.map((section) => ({
    ...section,
    rows: differencesOnly ? section.rows.filter((row) => row.different) : section.rows
  })).filter((section) => section.rows.length > 0);
  const tablePrefix = mode === "pair" ? "pair-comparison" : "formal-comparison";
  const activeItem = projection.matrix.items[activeCompareIndex];
  const activePairCaption = activeItem
    ? `当前窄屏按 A 与 ${columnMark(activeCompareIndex, mode)} · ${activeItem.caseAlias} 计算差异；隐藏列不参与本视图的行标记和筛选。`
    : "当前活动比较盘不可用。";

  return (
    <div
      className="comparison-matrix-scroll"
      role="region"
      aria-label={mode === "pair" ? "双案例事实字段并列表" : "正式命盘字段对照表"}
      tabIndex={0}
      data-difference-scope={differenceScope.kind}
    >
      <table className="comparison-matrix">
        <caption>{mode === "pair"
          ? "全部字段只并列两个案例各自的可审计事实；差异不表达两人关系、吉凶、相合、相克、因果或优劣。"
          : differenceScope.kind === "active_pair"
            ? `${activePairCaption} 差异不表达吉凶、优劣或因果。`
            : "全部差异只表示任一比较盘相对 A 的字段值或可用状态不同，不表达吉凶、优劣或因果。"}</caption>
        <thead>
          <tr>
            <th id={`${tablePrefix}-column-field`} scope="col" className="comparison-field-heading">字段</th>
            {projection.matrix.items.map((item, index) => (
              <th
                id={`${tablePrefix}-column-${index}`}
                scope="col"
                key={item.key}
                className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}
              >
                <span className="comparison-slot-mark">{columnMark(index, mode)}</span>
                <strong>{item.caseAlias}</strong>
                <small>Revision {item.revision.revisionNumber} · RuleProfile {item.revision.ruleProfile.profileId}@{item.revision.ruleProfile.profileVersion}</small>
                <small>{item.revision.rulePackBinding
                  ? `规则包 ${item.revision.rulePackBinding.packId} · ${item.revision.rulePackBinding.useMode}`
                  : "内置 / 未绑定规则快照"}</small>
              </th>
            ))}
          </tr>
        </thead>
        {sections.map((section) => {
          const sectionHeaderId = `${tablePrefix}-section-${section.category}`;
          return (
            <tbody key={section.category} aria-labelledby={sectionHeaderId}>
              <tr className="comparison-section-row">
                <th id={sectionHeaderId} scope="rowgroup" colSpan={projection.matrix.items.length + 1}>
                  <span
                    className="comparison-section-anchor"
                    id={`compare-section-${section.category}`}
                  >{section.label}</span>
                  <small>{section.differenceCount} 项变化</small>
                </th>
              </tr>
              {section.rows.map((displayRow) => {
                const row = displayRow.row;
                const rowHeaderId = `${tablePrefix}-row-${row.id}`;
                return (
                  <tr
                    key={row.id}
                    data-field-id={row.id}
                    className={displayRow.different ? "is-different" : `is-${displayRow.status}`}
                  >
                    <th id={rowHeaderId} scope="row">
                      <span>{row.label}</span>
                      <small>{displayRow.different
                        ? "变化"
                        : displayRow.status === "same"
                          ? "相同"
                          : cellStatusLabel(row.cells[0].status, mode)}</small>
                    </th>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.id}:${projection.matrix.items[index].key}`}
                        headers={`${sectionHeaderId} ${rowHeaderId} ${tablePrefix}-column-${index}`}
                        className={`${index > 0 && index !== activeCompareIndex ? "is-inactive-compare " : ""}cell-status-${cell.status}`}
                      >
                        <small className="comparison-cell-status">{cellStatusLabel(cell.status, mode)}</small>
                        <AuditValue row={row} value={cell.value} />
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

function TransitCell({ children, status }: { children: ReactNode; status: string }) {
  return <div className="transit-compare-cell"><small>{status}</small>{children}</div>;
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
  const resultByKey = new Map(projection.transits.map((result) => [result.itemKey, result]));
  const tablePrefix = mode === "pair" ? "pair-transit" : "formal-transit";
  return (
    <div
      className="comparison-matrix-scroll"
      role="region"
      aria-label={mode === "pair" ? "双案例同一瞬时点六层运限并列表" : "同一瞬时点六层运限对照"}
      tabIndex={0}
    >
      <table className="comparison-matrix transit-comparison-matrix">
        <caption>{mode === "pair"
          ? "同一个 UTC 瞬时点分别投影到两个案例自己的时区与锁版规则；只展示各自节点事实，不计算跨盘关系。"
          : "同一个 UTC 瞬时点分别投影到各修订自身的时区与锁版规则；节点 ID 不要求相同。"}</caption>
        <thead>
          <tr>
            <th id={`${tablePrefix}-column-field`} scope="col" className="comparison-field-heading">同步运限</th>
            {projection.matrix.items.map((item, index) => (
              <th id={`${tablePrefix}-column-${index}`} key={item.key} scope="col" className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}>
                <span className="comparison-slot-mark">{columnMark(index, mode)}</span>
                <strong>{item.caseAlias}</strong>
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
                <td key={item.key} headers={`${tablePrefix}-row-wall-time ${tablePrefix}-column-${index}`} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}>
                  {result?.status === "resolved"
                    ? <TransitCell status={result.snapshot.target.displayTimeZone}>{result.snapshot.target.revisionWallDateTime}</TransitCell>
                    : <TransitCell status={result?.status === "error" ? result.code : "未计算"}>{result?.status === "error" ? result.message : "未生成运限快照"}</TransitCell>}
                </td>
              );
            })}
          </tr>
          {TRACKS.map((track) => (
            <tr key={track} data-field-id={`transit.${track}`}>
              <th id={`${tablePrefix}-row-${track}`} scope="row"><span>{TRACK_LABELS[track]}</span><small>{track}</small></th>
              {projection.matrix.items.map((item, index) => {
                const result = resultByKey.get(item.key);
                if (!result) {
                  return <td key={item.key} headers={`${tablePrefix}-row-${track} ${tablePrefix}-column-${index}`} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}><TransitCell status="未计算">—</TransitCell></td>;
                }
                if (result.status === "error") {
                  return <td key={item.key} headers={`${tablePrefix}-row-${track} ${tablePrefix}-column-${index}`} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}><TransitCell status={result.code}>{result.message}</TransitCell></td>;
                }
                const slot = result.snapshot.slots[track];
                return (
                  <td key={item.key} headers={`${tablePrefix}-row-${track} ${tablePrefix}-column-${index}`} className={index > 0 && index !== activeCompareIndex ? "is-inactive-compare" : ""}>
                    {slot.status === "resolved"
                      ? <TransitCell status={slot.node.frame === "fixed_plus08" ? "固定 +08" : "修订本地"}><strong>{slot.node.ganZhi}</strong><span>{slot.node.label}</span></TransitCell>
                      : <TransitCell status={slot.status === "unsupported" ? "不支持" : "不适用"}><strong>{slot.reasonCode}</strong><span>{slot.message}</span></TransitCell>}
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
