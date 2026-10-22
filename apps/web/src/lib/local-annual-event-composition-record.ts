import { composeAnnualEvents, ANNUAL_EVENT_COMPOSITION_VERSION, annualEventCompositionSubjectId } from "./local-annual-event-composition";
import { annualEventFeedbackText, type LocalReadingAnnualEvents } from "./local-annual-event-record";
import type { LocalAnnualEventReading } from "./local-annual-event-reading";
import type { ReadingFeedbackChoice } from "./local-reading-feedback";

export { annualEventCompositionSubjectId } from "./local-annual-event-composition";
type Branch = LocalAnnualEventReading["branches"][number];
type Segment = Branch["segments"][number];
type Group = ReturnType<typeof composeAnnualEvents>["branches"][number]["segments"][number]["items"][number];

/** The new combined answer has its own feedback identity. Member identities,
 * original text and source versions remain unchanged and are still selectable. */
export function annualEventCompositionFeedbackText(reading: LocalAnnualEventReading, branch: Branch, segment: Segment, group: Group): string {
  if (group.kind !== "settlement") throw new Error("单项情境继续使用原反馈主题。");
  const sourceBranch = reading.branches.find((entry) => entry.id === branch.id);
  const sourceSegment = sourceBranch?.segments.find((entry) => entry.id === segment.id);
  if (!sourceBranch || !sourceSegment || JSON.stringify(sourceBranch) !== JSON.stringify(branch)
    || JSON.stringify(sourceSegment) !== JSON.stringify(segment)) throw new Error("合并事项与原年度、分支或分段不一致。");
  const expected = composeAnnualEvents(reading).branches.find((entry) => entry.id === branch.id)?.segments
    .find((entry) => entry.id === segment.id)?.items.find((entry) => entry.id === group.id);
  if (!expected || JSON.stringify(expected) !== JSON.stringify(group)) throw new Error("合并事项与原年度、分支或分段不一致。");
  return [`${reading.year}年 · ${branch.label} · ${group.title}`, group.summary,
    `适用时间：${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`,
    `合并规则：${ANNUAL_EVENT_COMPOSITION_VERSION}`,
    "以下两项是同一事项的原领域说明，各自的原反馈继续保留；单项修订不会自动替换整件事项。",
    ...group.members.flatMap((item) => [`### ${item.domain === "career" ? "事业侧" : "财务侧"}原说明`, annualEventFeedbackText(reading, branch, segment, item)])].join("\n");
}

export function annualEventCompositionChoices(collection: LocalReadingAnnualEvents | null): ReadingFeedbackChoice[] {
  return collection?.years.flatMap((reading) => {
    const composed = composeAnnualEvents(reading);
    return composed.branches.flatMap((branch) => branch.segments.flatMap((segment) => segment.items
      .filter((group) => group.kind === "settlement").map((group) => {
        const sourceBranch = reading.branches.find((entry) => entry.id === branch.id)!;
        const sourceSegment = sourceBranch.segments.find((entry) => entry.id === segment.id)!;
        const suffix = `${reading.branches.length > 1 ? ` · ${branch.label}` : ""}${branch.segments.length > 1 ? ` · ${new Date(Date.parse(segment.startInstant) + 8 * 3_600_000).toISOString().slice(0, 10)}起` : ""}`;
        return { id: annualEventCompositionSubjectId(reading.year, segment, group),
          label: `${reading.year}年整件事项 · ${group.kind === "settlement" ? group.title : ""}${suffix}`,
          originalConclusion: annualEventCompositionFeedbackText(reading, sourceBranch, sourceSegment, group),
          sourceVersions: [ANNUAL_EVENT_COMPOSITION_VERSION, collection.version, ...reading.sourceVersions] };
      })));
  }) ?? [];
}
