import type { ChartFacts, PillarFact } from "@hakimi/contracts";

export type MatrixField = "stemTenGod" | "stem" | "branch" | "hiddenStems" | "branchTenGods" | "wuXing" | "nayin" | "twelveGrowth" | "voidBranches";
export type MatrixSelection = { pillar: keyof ChartFacts["pillars"]; field: MatrixField };

const pillarOrder: Array<keyof ChartFacts["pillars"]> = ["year", "month", "day", "hour"];

const rows: Array<{ key: MatrixField; label: string; className?: string; value: (pillar: PillarFact) => string }> = [
  { key: "stemTenGod", label: "十神", value: (pillar) => pillar.stemTenGod || "—" },
  { key: "stem", label: "天干", className: "matrix-main-row", value: (pillar) => pillar.stem },
  { key: "branch", label: "地支", className: "matrix-main-row", value: (pillar) => pillar.branch },
  { key: "hiddenStems", label: "藏干", value: (pillar) => pillar.hiddenStems.join(" · ") || "—" },
  { key: "branchTenGods", label: "支神", value: (pillar) => pillar.branchTenGods.join(" · ") || "—" },
  { key: "wuXing", label: "五行", value: (pillar) => pillar.wuXing || "—" },
  { key: "nayin", label: "纳音", value: (pillar) => pillar.nayin || "—" },
  { key: "twelveGrowth", label: "长生", value: (pillar) => pillar.twelveGrowth || "—" },
  { key: "voidBranches", label: "空亡", value: (pillar) => pillar.voidBranches || "—" }
];

const elementBySymbol: Record<string, string> = {
  甲: "wood", 乙: "wood", 寅: "wood", 卯: "wood",
  丙: "fire", 丁: "fire", 巳: "fire", 午: "fire",
  戊: "earth", 己: "earth", 辰: "earth", 戌: "earth", 丑: "earth", 未: "earth",
  庚: "metal", 辛: "metal", 申: "metal", 酉: "metal",
  壬: "water", 癸: "water", 亥: "water", 子: "water"
};

export function FourPillarsMatrix({ facts, selection, onSelect }: { facts: ChartFacts; selection: MatrixSelection; onSelect: (selection: MatrixSelection) => void }) {
  return (
    <div className="matrix-scroll" role="region" tabIndex={0} aria-label="四柱结构表，可横向滚动">
      <table className="pillars-matrix">
        <thead>
          <tr>
            <th scope="col">字段</th>
            {pillarOrder.map((key) => <th scope="col" key={key}>{facts.pillars[key].label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.className}>
              <th scope="row">{row.label}</th>
              {pillarOrder.map((pillarKey) => {
                const pillar = facts.pillars[pillarKey];
                const value = row.value(pillar);
                const active = selection.pillar === pillarKey && selection.field === row.key;
                const element = row.key === "stem" || row.key === "branch" ? elementBySymbol[value] : undefined;
                return (
                  <td key={pillarKey}>
                    <button
                      type="button"
                      className={`matrix-cell ${active ? "is-selected" : ""} ${element ? `element-${element}` : ""}`}
                      aria-pressed={active}
                      aria-label={`${pillar.label}${row.label}：${value}`}
                      onClick={() => onSelect({ pillar: pillarKey, field: row.key })}
                    >
                      {value}
                    </button>
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

export function matrixValue(pillar: PillarFact, field: MatrixField): string {
  const row = rows.find((candidate) => candidate.key === field);
  return row?.value(pillar) ?? "—";
}

export function matrixFieldLabel(field: MatrixField): string {
  return rows.find((row) => row.key === field)?.label ?? field;
}
