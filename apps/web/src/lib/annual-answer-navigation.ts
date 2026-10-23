import { ANNUAL_LIFE_STORY_VERSION, type AnnualLifeStory, type AnnualLifeStorySegment, type LocalReadingAnnualLifeStories } from "./annual-life-story";
import type { LocalAnnualYear } from "./local-annual-outlook";
import type { LocalReadingPriorities, ReadingPrioritySegment, ReadingPriorityYear } from "./local-reading-priorities";
import type { LocalPersonalReadingEntry } from "./local-personal-reading";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";

export type AnnualAnswerPersonalSources = Record<string, LocalPersonalReadingEntry[]>;
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (left: unknown, right: unknown) => stable(left) === stable(right);
const sameBinding = (a: LocalReadingPriorities["sourceBinding"], b: LocalReadingPriorities["sourceBinding"]) =>
  a.revisionId === b.revisionId && a.chartResultHash === b.chartResultHash && a.includeHour === b.includeHour;

function findStory(year: number, collection: LocalReadingAnnualLifeStories | null | undefined): AnnualLifeStory | null {
  if (!collection || collection.version !== ANNUAL_LIFE_STORY_VERSION || year < collection.startYear || year > collection.endYear) return null;
  const candidates = collection.years.filter((entry) => entry.year === year), story = candidates[0];
  if (candidates.length !== 1 || !story || story.version !== ANNUAL_LIFE_STORY_VERSION
    || !same(story.sourceBinding, collection.sourceBinding) || !["ready", "partial"].includes(story.status)
    || !story.branches.length || new Set(story.branches.map((branch) => branch.id)).size !== story.branches.length
    || story.branches.some((branch) => !branch.segments.length || new Set(branch.segments.map((segment) => segment.id)).size !== branch.segments.length
      || branch.segments.some((segment) => segment.branchId !== branch.id || !segment.sourceVersions.includes(ANNUAL_LIFE_STORY_VERSION)))) return null;
  return story;
}

/** Navigation displays the same conclusion as the full reading. It does not
 * derive a new event or direction from a year badge, or collapse two scopes. */
export function annualAnswerForYear(year: LocalAnnualYear, collection?: LocalReadingAnnualLifeStories | null): AnnualLifeStory | null {
  const story = findStory(year.year, collection), binding = year.judgment?.sourceBinding ?? year.ownJudgment?.sourceBinding;
  if (!story || !binding || !sameBinding(story.sourceBinding, binding) || !same(story.yearNodeRef, year.transitNodeRef)
    || story.yearGanZhi !== year.yearGanZhi || story.startInstant !== year.startInstant || story.endExclusiveInstant !== year.endExclusiveInstant) return null;
  const segments = story.branches.flatMap((branch) => branch.segments);
  if (segments.length !== year.judgmentSegments.length || !segments.every((segment) => {
    const originals = year.judgmentSegments.filter((item) => item.id === segment.id && item.branchId === segment.branchId), original = originals[0];
    return originals.length === 1 && original && segment.startInstant === original.startInstant
      && segment.endExclusiveInstant === original.endExclusiveInstant && segment.judgmentVersion === original.judgment.version
      && segment.policyVersion === original.judgment.policyVersion && same(segment.backgroundRefs, original.judgment.backgroundRefs)
      && segment.caption === outlookDirectionCaption(original.judgment, null);
  })) return null;
  return story;
}

export function annualAnswerForPriority(year: ReadingPriorityYear, segment: ReadingPrioritySegment,
  binding: LocalReadingPriorities["sourceBinding"], collection?: LocalReadingAnnualLifeStories | null): { story: AnnualLifeStory; segment: AnnualLifeStorySegment } | null {
  const story = findStory(year.year, collection);
  if (!story || !sameBinding(story.sourceBinding, binding) || !same(story.yearNodeRef, year.nodeRef)
    || story.yearGanZhi !== year.yearGanZhi || story.startInstant !== year.startInstant || story.endExclusiveInstant !== year.endExclusiveInstant) return null;
  const candidates = story.branches.filter((branch) => branch.id === segment.branchId)
    .flatMap((branch) => branch.segments.filter((item) => item.id === segment.id)), candidate = candidates[0];
  if (candidates.length !== 1 || !candidate || candidate.startInstant !== segment.startInstant
    || candidate.endExclusiveInstant !== segment.endExclusiveInstant || candidate.personalStartInstant !== segment.personalStartInstant
    || candidate.caption !== segment.caption || candidate.judgmentVersion !== segment.judgment.version
    || candidate.policyVersion !== segment.judgment.policyVersion || !same(candidate.backgroundRefs, segment.judgment.backgroundRefs)) return null;
  return { story, segment: candidate };
}

export function annualAnswerSegmentTitle(year: number, segment: AnnualLifeStorySegment, personal?: AnnualAnswerPersonalSources): string {
  // The caller supplies only exact-original/version-checked adoption entries
  // from annualLifeStoryPersonalSources. Do not truncate their personal prose
  // into a button label or silently replace it with an automatic conclusion.
  return personal?.[`${year}:${segment.id}`]?.some((entry) => entry.state === "adopted" && !entry.issues.length)
    ? "已有个人修订，展开查看" : segment.headline;
}

export function annualAnswerYearTitle(story: AnnualLifeStory, personal?: AnnualAnswerPersonalSources): string {
  const branchTitle = (branch: AnnualLifeStory["branches"][number]) => {
    const titles = [...new Set(branch.segments.map((segment) => annualAnswerSegmentTitle(story.year, segment, personal)))];
    return branch.segments.length > 1 ? `交运前后：${titles.join(" → ")}` : titles[0]!;
  };
  return story.branches.length === 1 ? branchTitle(story.branches[0]!)
    : story.branches.map((branch) => `${branch.id === "forward" ? "顺行" : "逆行"}：${branchTitle(branch)}`).join("；");
}
