import type { LocalOutlookJudgment } from "./local-outlook-judgment";
import type { LocalAnnualOutlook, LocalAnnualYear } from "./local-annual-outlook";

export const READING_YEAR_SUMMARY_VERSION = "hakimi.reading-year-summary/0.1.0";

/** Keep the qualifying conclusion visible instead of reducing it to "条件性". */
export function outlookDirectionCaption(judgment: LocalOutlookJudgment | null | undefined, fallback: string | null): string {
  if (!judgment) return fallback ?? "暂不可判";
  if (judgment.label !== "条件性") return judgment.label;
  const separator = judgment.headline.indexOf("：");
  return separator >= 0 ? judgment.headline.slice(separator + 1) : judgment.headline;
}

/** Display-only: a parallel direction is not a chronological handover.
 * Keep the producer's aggregate and saved feedback text untouched. */
export function annualHandoverPresentation(year: LocalAnnualYear): { caption: string; summary: string } | null {
  const branches = new Map<string, typeof year.judgmentSegments>();
  for (const segment of year.judgmentSegments) {
    const list = branches.get(segment.branchId) ?? [];
    list.push(segment); branches.set(segment.branchId, list);
  }
  const signature = (judgment: LocalOutlookJudgment) => JSON.stringify([
    outlookDirectionCaption(judgment, judgment.label),
    judgment.axes.map(axis => [axis.axis, axis.effect])
  ]);
  let changed = false;
  for (const original of branches.values()) {
    const parts = [...original].sort((a, b) => Date.parse(a.startInstant) - Date.parse(b.startInstant));
    for (let i = 1; i < parts.length; i++) {
      const before = parts[i - 1]!, after = parts[i]!;
      const previousLuck = before.judgment.backgroundRefs.find(ref => ref.nodeType === "dayun");
      const nextLuck = after.judgment.backgroundRefs.find(ref => ref.nodeType === "dayun");
      if (Date.parse(before.endExclusiveInstant) === Date.parse(after.startInstant)
        && previousLuck && nextLuck && previousLuck.nodeId !== nextLuck.nodeId
        && signature(before.judgment) !== signature(after.judgment)) changed = true;
    }
  }
  if (!changed) return null;
  const date = (instant: string) => new Date(Date.parse(instant) + 8 * 60 * 60 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const descriptions = [...branches.values()].flatMap(parts => [...parts].sort((a, b) => Date.parse(a.startInstant) - Date.parse(b.startInstant)).map(segment =>
    `${branches.size > 1 ? `${segment.branchLabel}：` : ""}${date(segment.startInstant)} 至 ${date(segment.endExclusiveInstant)}前，${outlookDirectionCaption(segment.judgment, segment.judgment.label)}。`));
  return { caption: "交运前后分别看", summary: `交运前后分别看（北京时间）：${descriptions.join("")}` };
}

/** Group identical complete captions; never strip conditions or choose among branches. */
export function summarizeAnnualJudgmentCaptions(outlook: LocalAnnualOutlook): string {
  const groups = new Map<string, number[]>();
  for (const year of outlook.years) {
    const caption = outlookDirectionCaption(year.judgment, year.label);
    const years = groups.get(caption) ?? [];
    years.push(year.year); groups.set(caption, years);
  }
  return [...groups].map(([caption, years]) => `${years.join("、")}年：${caption}。`).join("\n");
}
