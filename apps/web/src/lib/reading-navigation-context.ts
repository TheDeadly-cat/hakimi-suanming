import type { RevisionRecord } from "@hakimi/contracts";
import type { ReadingExplanationIndex, ReadingExplanationQuery, ReadingExplanationTopic } from "./reading-explanation-index";

// One small same-tab record, containing selection identifiers only. Report text,
// birth input, search questions and selected old reports never enter this store.
export const READING_NAVIGATION_STORAGE_KEY = "hakimi:reading-navigation:v1";
const maxContextLength = 4096;
const topics: ReadingExplanationTopic[] = ["summary", "career", "wealth", "relationship", "year_comparison", "month", "uncertainty", "report_comparison"];

export function readingNavigationIdentity(index: ReadingExplanationIndex, revision: RevisionRecord): string | null {
  const source = index.sourceSnapshot;
  if (source.caseId !== revision.caseId || source.revisionId !== revision.id
    || source.chartResultHash !== revision.manifest.resultHash || source.ruleProfileDigest !== revision.manifest.ruleProfileDigest) return null;
  // Source-version coverage can grow when a requested month is prepared. It is
  // evidence metadata, not a new reading identity; selected IDs are revalidated
  // against the current index independently.
  return JSON.stringify([source.caseId, source.revisionId, source.chartResultHash, source.ruleProfileDigest,
    source.reportVersion, index.version, source.includeHour]);
}

function validSelection(index: ReadingExplanationIndex, value: unknown): ReadingExplanationQuery {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { topic: "summary" };
  const candidate = value as Record<string, unknown>;
  const topic = topics.includes(candidate.topic as ReadingExplanationTopic) ? candidate.topic as ReadingExplanationTopic : "summary";
  const years = new Set(index.conclusions.flatMap(item => item.scope.year === null ? [] : [item.scope.year]));
  const year = typeof candidate.year === "number" && years.has(candidate.year) ? candidate.year : undefined;
  const comparisonYear = typeof candidate.comparisonYear === "number" && years.has(candidate.comparisonYear) ? candidate.comparisonYear : undefined;
  const branchId = typeof candidate.branchId === "string" && index.conclusions.some(item => item.scope.branchId === candidate.branchId) ? candidate.branchId : undefined;
  const monthId = topic === "month" && typeof candidate.monthId === "string" && index.conclusions.some(item => item.stableId === candidate.monthId
    && item.scope.level === "month" && item.scope.year === year && (!branchId || item.scope.branchId === branchId)) ? candidate.monthId : undefined;
  return { topic, year, comparisonYear, branchId, monthId };
}

export function readReadingNavigation(index: ReadingExplanationIndex, revision: RevisionRecord): ReadingExplanationQuery {
  try {
    const identity = readingNavigationIdentity(index, revision);
    const raw = window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY);
    if (!identity || !raw || raw.length > maxContextLength) return { topic: "summary" };
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return { topic: "summary" };
    const record = saved as Record<string, unknown>;
    return record.version === 1 && record.identity === identity ? validSelection(index, record.selection) : { topic: "summary" };
  } catch { return { topic: "summary" }; }
}

export function writeReadingNavigation(index: ReadingExplanationIndex, revision: RevisionRecord, query: ReadingExplanationQuery): void {
  try {
    const identity = readingNavigationIdentity(index, revision);
    if (!identity) return;
    const value = JSON.stringify({ version: 1, identity, selection: validSelection(index, query) });
    if (value.length <= maxContextLength) window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, value);
  } catch { /* Reading remains available when same-tab storage is unavailable. */ }
}

export function readingTopicSelection(index: ReadingExplanationIndex, current: ReadingExplanationQuery, topic: ReadingExplanationTopic): ReadingExplanationQuery {
  const valid = validSelection(index, { ...current, topic });
  const years = [...new Set(index.conclusions.flatMap(item => item.scope.year === null ? [] : [item.scope.year]))].sort((a, b) => a - b);
  const year = valid.year ?? (topic === "month" || topic === "year_comparison" ? years[0] : undefined);
  const comparisonYear = topic === "year_comparison"
    ? valid.comparisonYear !== year ? valid.comparisonYear ?? years.find(item => item !== year) : years.find(item => item !== year)
    : valid.comparisonYear;
  return { topic, branchId: valid.branchId, year, comparisonYear };
}
