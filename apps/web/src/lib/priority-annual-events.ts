import type { LocalReadingPriorities } from "./local-reading-priorities";
import { READING_ANNUAL_EVENTS_VERSION, type LocalReadingAnnualEvents } from "./local-annual-event-record";
import { ANNUAL_EVENT_READING_VERSION } from "./local-annual-event-reading";
import { ANNUAL_EVENT_READING_PROSE_VERSION } from "./annual-event-reading-prose";
import { composeAnnualEvents, type AnnualEventCompositionSegment } from "./local-annual-event-composition";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const bindingMatches = (a: LocalReadingPriorities["sourceBinding"], b: LocalReadingPriorities["sourceBinding"]) =>
  a.revisionId === b.revisionId && a.chartResultHash === b.chartResultHash && a.includeHour === b.includeHour;
export const priorityEventKey = (year: number, branchId: string, segmentId: string) => JSON.stringify([year, branchId, segmentId]);

/** Match existing event prose to an exact priority period. This neither picks
 * priority years nor derives events from captions or neighbouring periods. */
export function projectPriorityAnnualEvents(priorities: LocalReadingPriorities, events?: LocalReadingAnnualEvents | null): Map<string, AnnualEventCompositionSegment> {
  const result = new Map<string, AnnualEventCompositionSegment>();
  if (!events || events.version !== READING_ANNUAL_EVENTS_VERSION || !bindingMatches(priorities.sourceBinding, events.sourceBinding)
    || events.startYear !== priorities.startYear || events.endYear !== priorities.endYear) return result;
  for (const branch of priorities.branches) for (const year of branch.years) {
    const matches = events.years.filter((candidate) => candidate.year === year.year);
    if (matches.length !== 1) continue;
    const original = matches[0]!;
    const proseVersions = original.sourceVersions.filter((version) => version.startsWith("hakimi.annual-event-reading-prose/"));
    if (original.version !== ANNUAL_EVENT_READING_VERSION || !["ready", "partial"].includes(original.status)
      || proseVersions.length !== 1 || proseVersions[0] !== ANNUAL_EVENT_READING_PROSE_VERSION
      || !same(original.sourceBinding, events.sourceBinding) || original.yearGanZhi !== year.yearGanZhi
      || original.startInstant !== year.startInstant || original.endExclusiveInstant !== year.endExclusiveInstant
      || !same(original.yearNodeRef, year.nodeRef)) continue;
    const branches = original.branches.filter((candidate) => candidate.id === branch.id);
    if (branches.length !== 1) continue;
    const composed = composeAnnualEvents(original).branches.find((candidate) => candidate.id === branch.id)!;
    for (const segment of year.segments) {
      const segments = composed.segments.filter((candidate) => candidate.id === segment.id);
      if (segments.length !== 1) continue;
      const candidate = segments[0]!;
      if (segment.branchId !== branch.id || candidate.branchId !== branch.id
        || candidate.startInstant !== segment.startInstant || candidate.endExclusiveInstant !== segment.endExclusiveInstant
        || candidate.personalStartInstant !== segment.personalStartInstant || candidate.ageStage !== segment.ageStage
        || candidate.judgmentVersion !== segment.judgment.version || candidate.policyVersion !== segment.judgment.policyVersion
        || !same(candidate.backgroundRefs.map(stable).sort(), segment.judgment.backgroundRefs.map(stable).sort())) continue;
      // Stable priority order; a settlement keeps its complete original members.
      candidate.items.sort((left, right) => Number(right.members.some((item) => item.priority === "primary"))
        - Number(left.members.some((item) => item.priority === "primary")));
      candidate.conditions = [...new Set([...candidate.conditions, ...branches[0]!.conditions, ...original.limitations])];
      if (candidate.items.length) result.set(priorityEventKey(year.year, branch.id, segment.id), candidate);
    }
  }
  return result;
}
