import { MoveHorizontal } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { ChartFacts, PillarFact } from "@hakimi/contracts";
import "./chart-evidence-surfaces.css";
import "./four-pillars-matrix.css";

export type MatrixField = "stemTenGod" | "stem" | "branch" | "hiddenStems" | "branchTenGods" | "wuXing" | "nayin" | "twelveGrowth" | "voidBranches";
export type MatrixSelection = { pillar: keyof ChartFacts["pillars"]; field: MatrixField };
export type FourPillarsMatrixProps = Readonly<{
  facts: ChartFacts;
  selection: MatrixSelection;
  onSelect: (selection: MatrixSelection) => void;
}>;

type MatrixKeyboardCursor = Readonly<{
  anchorSelectionKey: string;
  selection: MatrixSelection;
}>;

const MATRIX_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-evaluative-score-present": "false",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-record-write-performed": "false",
  "data-record-write-state": "not_started",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-public-release-authorized": "false",
  "data-expert-truth-claimed": "false",
} as const;

const pillarOrder: ReadonlyArray<keyof ChartFacts["pillars"]> = ["year", "month", "day", "hour"];
const expectedPillarIdentity = {
  year: { name: "year", label: "年柱" },
  month: { name: "month", label: "月柱" },
  day: { name: "day", label: "日柱" },
  hour: { name: "hour", label: "时柱" }
} as const;
const unsafeMatrixTextPattern = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const maximumMatrixTextCharacters = 160;

function normalizedMatrixText(value: unknown): string {
  if (typeof value !== "string" || unsafeMatrixTextPattern.test(value)) return "";
  const normalized = value.replace(/\s+/gu, " ").trim();
  return Array.from(normalized).length <= maximumMatrixTextCharacters ? normalized : "";
}

function displayMatrixText(value: unknown): string {
  return normalizedMatrixText(value) || "—";
}

function displayMatrixList(values: readonly unknown[]): string {
  return values.map(normalizedMatrixText).filter(Boolean).join(" · ") || "—";
}

const rows: ReadonlyArray<{ key: MatrixField; label: string; className?: string; value: (pillar: PillarFact) => string }> = [
  { key: "stemTenGod", label: "十神", value: (pillar) => displayMatrixText(pillar.stemTenGod) },
  { key: "stem", label: "天干", className: "matrix-main-row", value: (pillar) => displayMatrixText(pillar.stem) },
  { key: "branch", label: "地支", className: "matrix-main-row", value: (pillar) => displayMatrixText(pillar.branch) },
  { key: "hiddenStems", label: "藏干", value: (pillar) => displayMatrixList(pillar.hiddenStems) },
  { key: "branchTenGods", label: "支神", value: (pillar) => displayMatrixList(pillar.branchTenGods) },
  { key: "wuXing", label: "五行", value: (pillar) => displayMatrixText(pillar.wuXing) },
  { key: "nayin", label: "纳音", value: (pillar) => displayMatrixText(pillar.nayin) },
  { key: "twelveGrowth", label: "长生", value: (pillar) => displayMatrixText(pillar.twelveGrowth) },
  { key: "voidBranches", label: "空亡", value: (pillar) => displayMatrixText(pillar.voidBranches) }
];

const rowByField = new Map(rows.map((row) => [row.key, row] as const));

const heavenlyStems = new Set(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const earthlyBranches = new Set(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const tenGods = new Set(["比肩", "劫财", "食神", "伤官", "偏财", "正财", "七杀", "正官", "偏印", "正印", "日主"]);
const twelveGrowthStages = new Set(["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]);
const fiveElements = new Set(["木", "火", "土", "金", "水"]);
const matrixStringFields = [
  ["stemTenGod", "十神"],
  ["wuXing", "五行"],
  ["nayin", "纳音"],
  ["twelveGrowth", "长生"],
  ["voidBranches", "空亡"]
] as const;

const elementBySymbol: Record<string, string> = {
  甲: "wood", 乙: "wood", 寅: "wood", 卯: "wood",
  丙: "fire", 丁: "fire", 巳: "fire", 午: "fire",
  戊: "earth", 己: "earth", 辰: "earth", 戌: "earth", 丑: "earth", 未: "earth",
  庚: "metal", 辛: "metal", 申: "metal", 酉: "metal",
  壬: "water", 癸: "water", 亥: "water", 子: "water"
};

const elementLabelByKey: Record<string, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水"
};

const elementLegend = [
  { key: "wood", label: "木" },
  { key: "fire", label: "火" },
  { key: "earth", label: "土" },
  { key: "metal", label: "金" },
  { key: "water", label: "水" }
] as const;

function matrixText(value: unknown, key: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const field = (value as Record<string, unknown>)[key];
  return normalizedMatrixText(field);
}

function matrixBindingIssue(facts: ChartFacts): string | null {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return "命盘事实不是可核对对象";
  const pillars = (facts as unknown as Record<string, unknown>).pillars;
  if (!pillars || typeof pillars !== "object" || Array.isArray(pillars)) return "命盘事实缺少四柱对象";

  const labels: string[] = [];
  for (const pillarKey of pillarOrder) {
    const pillar = (pillars as Record<string, unknown>)[pillarKey];
    const expectedIdentity = expectedPillarIdentity[pillarKey];
    if (!pillar || typeof pillar !== "object" || Array.isArray(pillar)) return `${expectedIdentity.label}不是可核对的柱事实`;
    const record = pillar as Record<string, unknown>;
    const label = matrixText(pillar, "label");
    const stem = matrixText(pillar, "stem");
    const branch = matrixText(pillar, "branch");
    if (record.name !== expectedIdentity.name) return `${expectedIdentity.label}的柱名没有绑定 ${pillarKey} 键`;
    if (record.label !== expectedIdentity.label || label !== expectedIdentity.label) {
      return `${pillarKey} 键没有绑定固定标签 ${expectedIdentity.label}`;
    }
    if (!heavenlyStems.has(stem)) return `${label}的天干不属于既有十天干契约`;
    if (!earthlyBranches.has(branch)) return `${label}的地支不属于既有十二地支契约`;
    if (record.stem !== stem || record.branch !== branch) return `${label}的天干或地支包含非规范空白`;
    if (record.ganZhi !== `${stem}${branch}` || matrixText(pillar, "ganZhi") !== `${stem}${branch}`) {
      return `${label}的干支文本与天干地支字段不一致`;
    }
    for (const [field, fieldLabel] of matrixStringFields) {
      if (typeof record[field] !== "string") return `${label}的${fieldLabel}字段不是可显示文本`;
      if (unsafeMatrixTextPattern.test(record[field] as string)) return `${label}的${fieldLabel}包含不可见控制字符`;
      if (Array.from((record[field] as string).replace(/\s+/gu, " ").trim()).length > 80) {
        return `${label}的${fieldLabel}超过 80 个字符`;
      }
    }
    const stemTenGod = matrixText(pillar, "stemTenGod");
    if (stemTenGod && !tenGods.has(stemTenGod)) return `${label}的十神不属于已知十神契约`;
    if (pillarKey === "day" && stemTenGod !== "日主") return `${label}的十神没有绑定日主身份`;
    if (pillarKey !== "day" && stemTenGod === "日主") return `${label}错误声明为日主`;
    const twelveGrowth = matrixText(pillar, "twelveGrowth");
    if (twelveGrowth && !twelveGrowthStages.has(twelveGrowth)) return `${label}的长生状态不属于十二长生契约`;
    const wuXing = matrixText(pillar, "wuXing");
    if (wuXing && (Array.from(wuXing).length !== 2 || Array.from(wuXing).some((item) => !fiveElements.has(item)))) {
      return `${label}的五行字段不是两个已知五行字符`;
    }
    const stemElementLabel = elementLabelByKey[elementBySymbol[stem] ?? ""];
    const branchElementLabel = elementLabelByKey[elementBySymbol[branch] ?? ""];
    if (!stemElementLabel || !branchElementLabel) {
      return `${label}的天干地支缺少五行映射`;
    }
    if (wuXing && wuXing !== `${stemElementLabel}${branchElementLabel}`) {
      return `${label}的五行字段与天干地支映射不一致`;
    }
    const voidBranches = matrixText(pillar, "voidBranches");
    if (voidBranches && (
      Array.from(voidBranches).length !== 2
      || Array.from(voidBranches).some((item) => !earthlyBranches.has(item))
      || new Set(Array.from(voidBranches)).size !== 2
    )) {
      return `${label}的空亡字段不是两个不同的十二地支`;
    }
    if (
      !Array.isArray(record.hiddenStems)
      || record.hiddenStems.length === 0
      || record.hiddenStems.some((item) => (
        typeof item !== "string"
        || item !== item.trim()
        || !heavenlyStems.has(item)
      ))
    ) {
      return `${label}的藏干不是非空且符合十天干契约的列表`;
    }
    const hiddenStems = record.hiddenStems as string[];
    if (new Set(hiddenStems).size !== hiddenStems.length) {
      return `${label}的藏干包含重复天干`;
    }
    if (
      !Array.isArray(record.branchTenGods)
      || record.branchTenGods.some((item) => (
        typeof item !== "string"
        || item !== item.trim()
        || !tenGods.has(item)
        || unsafeMatrixTextPattern.test(item)
      ))
    ) {
      return `${label}的支神不是非空文本列表`;
    }
    if (record.branchTenGods.length !== hiddenStems.length) {
      return `${label}的支神数量与藏干数量不一致`;
    }
    labels.push(label);
  }
  if (new Set(labels).size !== labels.length) return "四柱显示标签存在重复，矩阵列身份不唯一";
  return null;
}

type MatrixFactsInspection =
  | Readonly<{
      state: "error";
      issue: string;
    }>
  | Readonly<{
      state: "bound";
      valuesByCell: ReadonlyMap<string, string>;
      missingCountByPillar: ReadonlyMap<keyof ChartFacts["pillars"], number>;
      totalMatrixFieldCount: number;
      totalMissingFieldCount: number;
      totalProvidedFieldCount: number;
      dayMasterElement: string;
    }>;

function matrixCellKey(pillar: keyof ChartFacts["pillars"], field: MatrixField): string {
  return `${pillar}:${field}`;
}

function inspectMatrixFacts(facts: ChartFacts): MatrixFactsInspection {
  const issue = matrixBindingIssue(facts);
  if (issue) return { state: "error", issue };

  const valuesByCell = new Map<string, string>();
  const missingCountByPillar = new Map<keyof ChartFacts["pillars"], number>();
  let totalMissingFieldCount = 0;

  for (const pillarKey of pillarOrder) {
    const pillar = facts.pillars[pillarKey];
    let missingFieldCount = 0;
    for (const row of rows) {
      const value = row.value(pillar);
      valuesByCell.set(matrixCellKey(pillarKey, row.key), value);
      if (value === "—") missingFieldCount += 1;
    }
    missingCountByPillar.set(pillarKey, missingFieldCount);
    totalMissingFieldCount += missingFieldCount;
  }

  const totalMatrixFieldCount = pillarOrder.length * rows.length;
  const dayStem = valuesByCell.get(matrixCellKey("day", "stem")) ?? "—";
  return {
    state: "bound",
    valuesByCell,
    missingCountByPillar,
    totalMatrixFieldCount,
    totalMissingFieldCount,
    totalProvidedFieldCount: totalMatrixFieldCount - totalMissingFieldCount,
    dayMasterElement: elementBySymbol[dayStem] ?? "unknown",
  };
}

export function isKnownMatrixSelection(value: unknown): value is MatrixSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.pillar === "string"
    && pillarOrder.includes(record.pillar as keyof ChartFacts["pillars"])
    && typeof record.field === "string"
    && rowByField.has(record.field as MatrixField);
}

export function FourPillarsMatrix({ facts, selection, onSelect }: FourPillarsMatrixProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const instructionsId = useId();
  const titleId = useId();
  const boundaryId = useId();
  const [keyboardCursor, setKeyboardCursor] = useState<MatrixKeyboardCursor | null>(null);
  const matrixInspection = useMemo(() => inspectMatrixFacts(facts), [facts]);

  if (matrixInspection.state === "error") {
    return (
      <div
        className="four-pillars-matrix-frame"
        data-binding-state="error"
        {...MATRIX_SAFETY_ATTRIBUTES}
      >
        <div className="matrix-binding-failure" role="alert">
          <strong>四柱事实矩阵未展示</strong>
          <p>{matrixInspection.issue}。系统没有用空值、近似符号或错误五行颜色补齐。</p>
        </div>
      </div>
    );
  }

  const {
    valuesByCell,
    missingCountByPillar,
    totalMatrixFieldCount,
    totalMissingFieldCount,
    totalProvidedFieldCount,
    dayMasterElement,
  } = matrixInspection;

  const selectionIsKnown = isKnownMatrixSelection(selection);
  const selectedPillar = selectionIsKnown ? selection.pillar : null;
  const selectedField = selectionIsKnown ? selection.field : null;
  const externalSelectionKey = selectionIsKnown
    ? `${selection.pillar}:${selection.field}`
    : "unbound";
  const fallbackKeyboardSelection: MatrixSelection = selectionIsKnown
    ? selection
    : { pillar: pillarOrder[0]!, field: rows[0]!.key };
  const currentKeyboardSelection =
    keyboardCursor?.anchorSelectionKey === externalSelectionKey
      ? keyboardCursor.selection
      : fallbackKeyboardSelection;
  const tabStopPillar = currentKeyboardSelection.pillar;
  const tabStopField = currentKeyboardSelection.field;
  const keyboardCursorPendingActivation = selectionIsKnown
    && (selectedPillar !== tabStopPillar || selectedField !== tabStopField);
  const keyboardCursorState = !selectionIsKnown
    ? keyboardCursor?.anchorSelectionKey === externalSelectionKey
      ? "unbound-navigation"
      : "defaulted-entry"
    : keyboardCursorPendingActivation
      ? "pending-activation"
      : "aligned";
  const readingPillar = facts.pillars[tabStopPillar];
  const readingRow = rowByField.get(tabStopField)!;
  const readingValue = valuesByCell.get(matrixCellKey(tabStopPillar, tabStopField)) ?? "—";
  const dayPillar = facts.pillars.day;

  const activateSelection = (nextSelection: MatrixSelection) => {
    setKeyboardCursor({
      anchorSelectionKey: externalSelectionKey,
      selection: nextSelection,
    });
    onSelect(nextSelection);
  };

  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, pillarIndex: number, rowIndex: number) => {
    let nextPillarIndex = pillarIndex;
    let nextRowIndex = rowIndex;
    switch (event.key) {
      case "ArrowLeft":
        nextPillarIndex = Math.max(0, pillarIndex - 1);
        break;
      case "ArrowRight":
        nextPillarIndex = Math.min(pillarOrder.length - 1, pillarIndex + 1);
        break;
      case "ArrowUp":
        nextRowIndex = Math.max(0, rowIndex - 1);
        break;
      case "ArrowDown":
        nextRowIndex = Math.min(rows.length - 1, rowIndex + 1);
        break;
      case "Home":
        nextPillarIndex = 0;
        break;
      case "End":
        nextPillarIndex = pillarOrder.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextPillar = pillarOrder[nextPillarIndex]!;
    const nextField = rows[nextRowIndex]!.key;
    setKeyboardCursor({
      anchorSelectionKey: externalSelectionKey,
      selection: { pillar: nextPillar, field: nextField },
    });
    tableRef.current
      ?.querySelector<HTMLButtonElement>(`[data-pillar="${nextPillar}"][data-field="${nextField}"]`)
      ?.focus();
  };

  return (
    <div
      className="four-pillars-matrix-frame"
      role="group"
      aria-labelledby={titleId}
      aria-describedby={boundaryId}
      data-binding-state="bound"
      data-selection-state={selectionIsKnown ? "bound" : "unbound"}
      data-selected-pillar={selectedPillar ?? "unbound"}
      data-selected-field={selectedField ?? "unbound"}
      data-keyboard-cursor-state={keyboardCursorState}
      data-missing-field-count={totalMissingFieldCount}
      data-provided-field-count={totalProvidedFieldCount}
      data-total-field-count={totalMatrixFieldCount}
      data-evidence-kind="field-source-and-calculation-receipt"
      {...MATRIX_SAFETY_ATTRIBUTES}
    >
      <div className="matrix-utility-bar">
        <div className="matrix-utility-bar__identity">
          <span aria-hidden="true">{pillarOrder.length} × {rows.length}</span>
          <p><strong id={titleId}>四柱结构矩阵</strong><small>{pillarOrder.length} 柱 / {rows.length} 个登记字段</small></p>
        </div>
        <ul className="matrix-element-key" aria-label="天干地支五行辨识色索引，不表示吉凶或强弱">
          {elementLegend.map((element) => (
            <li key={element.key} className={`element-${element.key}`}>
              <span aria-hidden="true" />{element.label}
            </li>
          ))}
        </ul>
      </div>
      <div id={boundaryId} className="matrix-fact-boundary" role="note">
        <strong>Revision 结构字段</strong>
        <p>这里复述当前 Revision 已登记的结构字段；颜色只帮助辨识五行，不表示旺衰、吉凶或喜忌。选择单元格只打开字段来源与计算收据，不构成专家真值。</p>
        <span>LEGACY-V13 · SCHEMA 13 · MIGRATION NULL · {totalProvidedFieldCount}/{totalMatrixFieldCount} FIELDS · READ ONLY</span>
      </div>
      {!selectionIsKnown ? (
        <p className="matrix-selection-recovery" role="status">原选择未绑定矩阵字段；键盘入口已回到年柱十神，选择任一单元格即可恢复。</p>
      ) : null}
      <div className="matrix-reading-compass" role="group" aria-label="日主锚点与当前矩阵字段">
        <div className="matrix-reading-compass__item matrix-reading-compass__anchor" data-element={dayMasterElement}>
          <span className="matrix-reading-compass__eyebrow">日主定位 / DAY-MASTER ANCHOR</span>
          <div className="matrix-reading-compass__content">
            <strong className="matrix-reading-compass__glyph" aria-hidden="true">{displayMatrixText(dayPillar.stem)}</strong>
            <p><b>日主身份锚点</b><small>{dayPillar.label} · {displayMatrixText(dayPillar.stem)}{displayMatrixText(dayPillar.branch)}</small></p>
          </div>
          <span className="matrix-reading-compass__boundary">只定位日柱，不表示旺衰、喜忌或吉凶</span>
        </div>
        <div
          className="matrix-reading-compass__item matrix-reading-compass__selection"
          data-recovered={!selectionIsKnown}
          data-navigation-state={keyboardCursorState}
          data-value-state={readingValue === "—" ? "missing" : "present"}
        >
          <span className="matrix-reading-compass__eyebrow">{!selectionIsKnown ? "恢复键盘入口 / RECOVERED" : keyboardCursorPendingActivation ? "键盘游标待打开 / PENDING" : "当前依据目标 / EVIDENCE TARGET"}</span>
          <div className="matrix-reading-compass__content">
            <p><b>{readingPillar.label} · {readingRow.label}</b><small>{!selectionIsKnown ? "恢复后的键盘入口" : keyboardCursorPendingActivation ? "按 Enter 或空格打开此字段依据" : "当前字段来源入口"}</small></p>
            <strong className="matrix-reading-compass__value" dir="auto">{readingValue === "—" ? "未提供" : readingValue}</strong>
          </div>
          <span className="matrix-reading-compass__boundary">
            {(missingCountByPillar.get(tabStopPillar) ?? 0) > 0
              ? `本柱另有 ${missingCountByPillar.get(tabStopPillar)} 项未提供`
              : `本柱 ${rows.length} 个矩阵字段均有值`}
          </span>
        </div>
      </div>
      <p className="matrix-scroll-cue" aria-hidden="true">
        <MoveHorizontal />横向滑动查看四柱，点按字段查看来源
      </p>
      <div className="matrix-scroll" role="region" tabIndex={0} aria-label="四柱结构字段表，可横向滚动" aria-describedby={`${instructionsId} ${boundaryId}`}>
        <p className="sr-only" id={instructionsId}>使用方向键在字段之间移动，Home 和 End 键跳到当前行首尾，回车或空格打开字段依据。</p>
        <table ref={tableRef} className="pillars-matrix" aria-describedby={`${instructionsId} ${boundaryId}`}>
          <caption className="sr-only">当前 Revision 的四柱结构字段矩阵</caption>
          <thead>
            <tr>
              <th scope="col">字段</th>
              {pillarOrder.map((key, pillarIndex) => {
                const missingFieldCount = missingCountByPillar.get(key) ?? 0;
                const providedFieldCount = rows.length - missingFieldCount;
                const columnLabel = [
                  facts.pillars[key].label,
                  key === "day" ? "日主锚点" : null,
                  `${providedFieldCount}/${rows.length} 个字段已提供`,
                  missingFieldCount ? `${missingFieldCount} 项未提供` : null
                ].filter(Boolean).join("，");
                return (
                  <th
                    scope="col"
                    key={key}
                    data-pillar={key}
                    data-selected={selectedPillar === key ? "true" : undefined}
                    data-keyboard-cursor={tabStopPillar === key ? "true" : undefined}
                    data-day-master={key === "day"}
                    data-missing-field-count={missingFieldCount}
                    aria-label={columnLabel}
                  >
                    <span className="matrix-column-heading__index" aria-hidden="true">0{pillarIndex + 1}</span>
                    <span className="matrix-column-heading__label">{facts.pillars[key].label}</span>
                    <span className="matrix-column-heading__meta" aria-hidden="true">
                      <small data-role="coverage" data-complete={missingFieldCount === 0}>{providedFieldCount}/{rows.length}</small>
                      {key === "day" ? <small data-role="day-master">日主</small> : null}
                      {missingFieldCount ? <small data-role="missing">{missingFieldCount} 项未提供</small> : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.key} className={row.className}>
                <th scope="row" data-selected={selectedField === row.key ? "true" : undefined} data-keyboard-cursor={tabStopField === row.key ? "true" : undefined}>{row.label}</th>
                {pillarOrder.map((pillarKey, pillarIndex) => {
                  const pillar = facts.pillars[pillarKey];
                  const value = valuesByCell.get(matrixCellKey(pillarKey, row.key)) ?? "—";
                  const active = selectedPillar === pillarKey && selectedField === row.key;
                  const isTabStop = tabStopPillar === pillarKey && tabStopField === row.key;
                  const element = row.key === "stem" || row.key === "branch" ? elementBySymbol[value] : undefined;
                  const spokenValue = value === "—" ? "未提供" : value;
                  return (
                    <td
                      key={pillarKey}
                      data-pillar={pillarKey}
                      data-day-master={pillarKey === "day"}
                      data-selected-column={selectedPillar === pillarKey ? "true" : undefined}
                      data-keyboard-cursor={isTabStop ? "true" : undefined}
                    >
                      <button
                        type="button"
                        className={`matrix-cell ${active ? "is-selected" : ""} ${element ? `element-${element}` : ""}`}
                        aria-pressed={active}
                        aria-label={`${pillar.label}${row.label}：${spokenValue}；打开字段来源与计算收据`}
                        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
                        data-pillar={pillarKey}
                        data-field={row.key}
                        data-value-state={value === "—" ? "missing" : "present"}
                        data-keyboard-cursor={isTabStop ? "true" : undefined}
                        tabIndex={isTabStop ? 0 : -1}
                        onClick={() => activateSelection({ pillar: pillarKey, field: row.key })}
                        onKeyDown={(event) => moveSelection(event, pillarIndex, rowIndex)}
                      >
                        <span className="matrix-cell__value" dir="auto">{value}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function matrixValue(pillar: PillarFact, field: MatrixField): string {
  const row = rowByField.get(field);
  return row?.value(pillar) ?? "—";
}

export function matrixFieldLabel(field: MatrixField): string {
  return rowByField.get(field)?.label ?? field;
}
