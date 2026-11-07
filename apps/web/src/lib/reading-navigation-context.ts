import type { RevisionRecord } from "@hakimi/contracts";
import type { ReadingExplanationIndex, ReadingExplanationQuery, ReadingExplanationTopic } from "./reading-explanation-index";
import { READING_EXPLANATION_INDEX_VERSION } from "./reading-explanation-index";
import { MAIN_ROUTE_READING_VERSION } from "./main-route-reading";
import { LOCAL_READING_EDITION_VERSION } from "./local-reading-version";

// One small same-tab record, containing selection identifiers only. Report text,
// birth input, search questions and selected old reports never enter this store.
export const READING_NAVIGATION_STORAGE_KEY = "hakimi:reading-navigation:v1";
export interface ReadingOverviewDetail {
  kind: "year" | "stage" | "turn";
  year: number;
  periods?: { year: number; startInstant: string; endExclusiveInstant: string }[];
}
export interface ReadingOverviewNavigation {
  view: "main" | "natal";
  range: "year" | "three_years" | "ten_years";
  detail?: ReadingOverviewDetail;
}
const maxContextLength = 4096;
const topics: ReadingExplanationTopic[] = ["summary", "career", "wealth", "relationship", "year_comparison", "month", "uncertainty", "report_comparison"];

/** Restore only a source-bound calculation window before its index exists.
 * The reader still revalidates topic, branch and periods against that index. */
export function readReadingNavigationYearSeed(revision: RevisionRecord): number | undefined {
  try {
    const raw = window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY);
    if (!raw || raw.length > maxContextLength) return undefined;
    const record = JSON.parse(raw);
    const expected = JSON.stringify([revision.caseId, revision.id, revision.manifest.resultHash, revision.manifest.ruleProfileDigest,
      LOCAL_READING_EDITION_VERSION, READING_EXPLANATION_INDEX_VERSION,
      revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only"]);
    if (record?.version !== 1 || record.identity !== expected || record.presentation?.mainRouteVersion !== MAIN_ROUTE_READING_VERSION) return undefined;
    const year = record.selection?.year;
    return Number.isSafeInteger(year) && year >= 1900 && year <= 2100 ? year : undefined;
  } catch { return undefined; }
}

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
    const selection = validSelection(index, query);
    const presentation = validOverview(index, readReadingOverviewNavigation(index, revision), selection);
    const value = JSON.stringify({ version: 1, identity, selection,
      presentation: { ...presentation, mainRouteVersion: MAIN_ROUTE_READING_VERSION } });
    if (value.length <= maxContextLength) window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, value);
  } catch { /* Reading remains available when same-tab storage is unavailable. */ }
}

function validOverview(index: ReadingExplanationIndex, value: unknown, selection: ReadingExplanationQuery): ReadingOverviewNavigation {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const overview: ReadingOverviewNavigation = { view: candidate.view === "natal" ? "natal" : "main",
    range: ["year", "three_years", "ten_years"].includes(candidate.range as string) ? candidate.range as ReadingOverviewNavigation["range"] : "three_years" };
  const detail = candidate.detail;
  if (overview.view !== "main" || selection.topic !== "summary" || selection.year === undefined
    || !detail || typeof detail !== "object" || Array.isArray(detail)) return overview;
  const requested = detail as Record<string, unknown>;
  const yearConclusions = index.conclusions.filter(item => item.scope.level === "year" && item.scope.branchId !== null);
  const branches = [...new Set(yearConclusions.map(item => item.scope.branchId!))];
  const branch = selection.branchId ?? (branches.length === 1 ? branches[0] : undefined);
  if (!branch || requested.year !== selection.year || !Number.isSafeInteger(requested.year)) return overview;
  if (requested.kind === "year") {
    if (requested.periods !== undefined || !yearConclusions.some(item => item.scope.year === requested.year && item.scope.branchId === branch)) return overview;
    return { ...overview, detail: { kind: "year", year: requested.year as number } };
  }
  if ((requested.kind !== "stage" && requested.kind !== "turn") || !Array.isArray(requested.periods)
    || requested.periods.length < 1 || requested.periods.length > 24
    || (requested.kind === "turn" && requested.periods.length !== 2)) return overview;
  const periods: NonNullable<ReadingOverviewDetail["periods"]> = [];
  const seen = new Set<string>();
  const endYear = selection.year + ({ year: 1, three_years: 3, ten_years: 10 }[overview.range]) - 1;
  for (const entry of requested.periods) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return overview;
    const period = entry as Record<string, unknown>;
    if (!Number.isSafeInteger(period.year) || (period.year as number) < selection.year || (period.year as number) > endYear
      || typeof period.startInstant !== "string" || typeof period.endExclusiveInstant !== "string"
      || !Number.isFinite(Date.parse(period.startInstant)) || !Number.isFinite(Date.parse(period.endExclusiveInstant))
      || Date.parse(period.startInstant) >= Date.parse(period.endExclusiveInstant)) return overview;
    const key = JSON.stringify([period.year, period.startInstant, period.endExclusiveInstant]);
    if (seen.has(key) || !yearConclusions.some(item => item.scope.branchId === branch && item.scope.year === period.year
      && item.scope.startInstant === period.startInstant && item.scope.endExclusiveInstant === period.endExclusiveInstant)) return overview;
    const previous = periods.at(-1);
    if (previous && Date.parse(previous.endExclusiveInstant) > Date.parse(period.startInstant)) return overview;
    seen.add(key);
    periods.push({ year: period.year as number, startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant });
  }
  if (periods[0]!.year !== selection.year) return overview;
  return { ...overview, detail: { kind: requested.kind, year: selection.year, periods } };
}

// Display preferences share the same source identity as the existing reading
// selection. They contain no report text and never change a saved snapshot.
export function readReadingOverviewNavigation(index: ReadingExplanationIndex, revision: RevisionRecord): ReadingOverviewNavigation {
  const fallback: ReadingOverviewNavigation = { view: "main", range: "three_years" };
  try {
    const identity = readingNavigationIdentity(index, revision);
    const raw = window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY);
    if (!identity || !raw || raw.length > maxContextLength) return fallback;
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || saved.identity !== identity) return fallback;
    const presentation = saved.presentation;
    if (presentation?.mainRouteVersion !== MAIN_ROUTE_READING_VERSION) return fallback;
    return validOverview(index, presentation, validSelection(index, saved.selection));
  } catch { return fallback; }
}

export function writeReadingOverviewNavigation(index: ReadingExplanationIndex, revision: RevisionRecord, presentation: ReadingOverviewNavigation): void {
  try {
    const identity = readingNavigationIdentity(index, revision);
    if (!identity) return;
    const selection = readReadingNavigation(index, revision);
    const value = JSON.stringify({ version: 1, identity, selection,
      presentation: { ...validOverview(index, presentation, selection), mainRouteVersion: MAIN_ROUTE_READING_VERSION } });
    if (value.length <= maxContextLength) window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, value);
  } catch { /* A blocked session store does not block reading. */ }
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
