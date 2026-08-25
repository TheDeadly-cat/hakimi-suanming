import { useCallback, useEffect, useRef, useState } from "react";
import { isCandidateSetRecord, type CaseRecord, type ResearchSubjectRecord } from "@hakimi/contracts";
import {
  caseRepository,
  type ResearchSubjectKind,
  type ResearchSubjectOverview,
  type ResearchSubjectPageCursor
} from "@hakimi/storage";
import { safeVisibleErrorMessage } from "./visible-text";

export type ResearchSubjectLifecycle = "active" | "trashed" | "all";

export type ResearchSubjectListOptions = {
  lifecycle?: ResearchSubjectLifecycle;
  favoritesOnly?: boolean;
};

export type ResearchSubjectPageOptions = ResearchSubjectListOptions & {
  kind?: ResearchSubjectKind;
  limit?: number;
  cursor?: ResearchSubjectPageCursor | null;
};

const MAX_RESEARCH_SUBJECT_PAGE_LIMIT = 100;
const RESEARCH_SUBJECT_OVERVIEW_FIELDS = [
  "activeCaseCount",
  "activeCandidateSetCount",
  "activeSubjectCount",
  "trashedSubjectCount",
  "activeFavoriteSubjectCount",
  "activeRevisionCount"
] as const satisfies readonly (keyof ResearchSubjectOverview)[];

function duplicateIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function assertDescendingTimestamps(records: readonly { id: string; updatedAt: string }[], label: string): void {
  let previous = Number.POSITIVE_INFINITY;
  for (const record of records) {
    const timestamp = Date.parse(record.updatedAt);
    if (!Number.isFinite(timestamp)) throw new Error(`${label} ${record.id} 的更新时间无法解析。`);
    if (timestamp > previous) throw new Error(`${label}未按更新时间降序返回。`);
    previous = timestamp;
  }
}

function assertCaseIndex(records: readonly CaseRecord[]): void {
  const duplicates = duplicateIds(records.map((record) => record.id));
  if (duplicates.length) throw new Error(`案例索引包含重复 ID：${duplicates.join("、")}。`);
  assertDescendingTimestamps(records, "案例索引");
}

function assertResearchSubjects(
  records: readonly ResearchSubjectRecord[],
  lifecycle: ResearchSubjectLifecycle,
  favoritesOnly: boolean,
  kind: ResearchSubjectKind
): void {
  const duplicates = duplicateIds(records.map((record) => record.id));
  if (duplicates.length) throw new Error(`研究记录索引包含重复 ID：${duplicates.join("、")}。`);
  assertDescendingTimestamps(records, "研究记录索引");
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    const previous = index > 0 ? records[index - 1]! : null;
    if (previous && previous.updatedAt === record.updatedAt && previous.id > record.id) {
      throw new Error("研究记录索引在相同更新时间下未按 ID 升序返回。");
    }
    const trashed = record.deletedAt !== null;
    if ((lifecycle === "active" && trashed) || (lifecycle === "trashed" && !trashed)) {
      throw new Error(`研究记录 ${record.id} 不符合当前生命周期筛选。`);
    }
    if (favoritesOnly && !record.favorite) throw new Error(`研究记录 ${record.id} 不符合收藏筛选。`);
    if (kind === "cases" && isCandidateSetRecord(record)) throw new Error(`候选组 ${record.id} 混入正式案例筛选。`);
    if (kind === "candidate_sets" && !isCandidateSetRecord(record)) throw new Error(`正式案例 ${record.id} 混入候选组筛选。`);
    if (!isCandidateSetRecord(record) && !record.latestRevisionId) {
      throw new Error(`正式案例 ${record.id} 缺少 latestRevisionId。`);
    }
  }
}

function assertResearchSubjectFilters(
  lifecycle: unknown,
  favoritesOnly: unknown,
  kind: unknown = "all"
): void {
  if (lifecycle !== "active" && lifecycle !== "trashed" && lifecycle !== "all") {
    throw new TypeError("研究记录 lifecycle 必须是 active、trashed 或 all。");
  }
  if (typeof favoritesOnly !== "boolean") {
    throw new TypeError("研究记录 favoritesOnly 必须是布尔值。");
  }
  if (kind !== "all" && kind !== "cases" && kind !== "candidate_sets") {
    throw new TypeError("研究记录 kind 必须是 all、cases 或 candidate_sets。");
  }
}

function assertResearchSubjectOverview(overview: ResearchSubjectOverview): void {
  if (!overview || typeof overview !== "object") throw new TypeError("研究记录概览不是对象。");
  for (const field of RESEARCH_SUBJECT_OVERVIEW_FIELDS) {
    if (!Number.isSafeInteger(overview[field]) || overview[field] < 0) {
      throw new TypeError(`研究记录概览 ${field} 不是非负安全整数。`);
    }
  }
  if (overview.activeSubjectCount !== overview.activeCaseCount + overview.activeCandidateSetCount) {
    throw new Error("研究记录概览的活跃总数与分项计数不一致。");
  }
  if (overview.activeFavoriteSubjectCount > overview.activeSubjectCount) {
    throw new Error("研究记录概览的收藏数超过活跃记录总数。");
  }
  if (overview.activeRevisionCount < overview.activeCaseCount) {
    throw new Error("研究记录概览的活跃修订数少于活跃正式案例数。");
  }
}

function useRefreshOnResume(refresh: () => void): void {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [refresh]);
}

export function useCases() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const requestVersionRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setLoading(true);
    setError(null);
    try {
      const records = await caseRepository.listCases();
      assertCaseIndex(records);
      if (mountedRef.current && requestVersion === requestVersionRef.current) setCases(records);
    } catch (reason) {
      if (mountedRef.current && requestVersion === requestVersionRef.current) {
        setError(safeVisibleErrorMessage(reason, "无法读取本地案例库"));
      }
    } finally {
      if (mountedRef.current && requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
    };
  }, [refresh]);

  useRefreshOnResume(refresh);

  return { cases, loading, error, refresh };
}

export function useResearchSubjects(options: ResearchSubjectListOptions = {}) {
  const lifecycle = options.lifecycle ?? "active";
  const favoritesOnly = options.favoritesOnly ?? false;
  const [subjects, setSubjects] = useState<ResearchSubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const requestVersionRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setLoading(true);
    setError(null);
    try {
      assertResearchSubjectFilters(lifecycle, favoritesOnly);
      const records = await caseRepository.listResearchSubjects({ lifecycle, favoritesOnly });
      assertResearchSubjects(records, lifecycle, favoritesOnly, "all");
      if (mountedRef.current && requestVersion === requestVersionRef.current) setSubjects(records);
    } catch (reason) {
      if (mountedRef.current && requestVersion === requestVersionRef.current) {
        setError(safeVisibleErrorMessage(reason, "无法读取本地研究记录"));
      }
    } finally {
      if (mountedRef.current && requestVersion === requestVersionRef.current) setLoading(false);
    }
  }, [favoritesOnly, lifecycle]);

  useEffect(() => {
    mountedRef.current = true;
    setSubjects([]);
    void refresh();
    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
    };
  }, [refresh]);

  useRefreshOnResume(refresh);

  return { subjects, loading, error, refresh };
}

export function useResearchSubjectPage(options: ResearchSubjectPageOptions = {}) {
  const lifecycle = options.lifecycle ?? "active";
  const favoritesOnly = options.favoritesOnly ?? false;
  const kind = options.kind ?? "all";
  const limit = options.limit ?? 50;
  const cursor = options.cursor ?? null;
  const cursorUpdatedAt = cursor?.updatedAt ?? "";
  const cursorId = cursor?.id ?? "";
  const cursorKind = cursor?.kind ?? "";
  const cursorQueryKey = cursor?.queryKey ?? "";
  const [subjects, setSubjects] = useState<ResearchSubjectRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<ResearchSubjectPageCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestVersionRef = useRef(0);
  const previousQueryIdentityRef = useRef<string | null>(null);
  const queryIdentity = JSON.stringify([
    lifecycle,
    favoritesOnly,
    kind,
    limit,
    cursorUpdatedAt,
    cursorId,
    cursorKind,
    cursorQueryKey
  ]);

  const refresh = useCallback(() => {
    requestVersionRef.current += 1;
    setError(null);
    setLoading(true);
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    const queryChanged = previousQueryIdentityRef.current !== queryIdentity;
    previousQueryIdentityRef.current = queryIdentity;
    setLoading(true);
    setError(null);
    if (queryChanged) {
      setSubjects([]);
      setTotal(0);
      setNextCursor(null);
    }
    void Promise.resolve().then(() => {
      assertResearchSubjectFilters(lifecycle, favoritesOnly, kind);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_RESEARCH_SUBJECT_PAGE_LIMIT) {
        throw new RangeError(`研究记录分页 limit 必须是 1 到 ${MAX_RESEARCH_SUBJECT_PAGE_LIMIT} 的整数。`);
      }
      return caseRepository.listResearchSubjectsPage({
        lifecycle,
        favoritesOnly,
        kind,
        limit,
        cursor
      });
    }).then((page) => {
      if (!active || requestVersionRef.current !== requestVersion) return;
      if (!page || typeof page !== "object" || !Array.isArray(page.items)) {
        throw new TypeError("研究记录分页响应不是有效对象。");
      }
      if (!Number.isSafeInteger(page.total) || page.total < 0 || page.total < page.items.length) {
        throw new Error(`分页总数 ${page.total} 与本页 ${page.items.length} 条记录不一致。`);
      }
      if (page.items.length > limit) throw new Error(`本页记录数超过请求上限 ${limit}。`);
      assertResearchSubjects(page.items, lifecycle, favoritesOnly, kind);
      if (page.nextCursor !== null) {
        if (!page.nextCursor || typeof page.nextCursor !== "object" || !page.items.length) {
          throw new Error("空分页或无效响应返回了下一页游标。");
        }
        const last = page.items.at(-1)!;
        const lastKind = isCandidateSetRecord(last) ? "candidate_sets" : "cases";
        if (
          page.nextCursor.id !== last.id
          || page.nextCursor.kind !== lastKind
          || page.nextCursor.updatedAt !== last.updatedAt
          || typeof page.nextCursor.queryKey !== "string"
          || !page.nextCursor.queryKey
          || (cursor !== null && page.nextCursor.queryKey !== cursor.queryKey)
        ) {
          throw new Error("下一页游标未绑定本页末项或当前筛选条件。");
        }
        if (
          cursor
          && page.nextCursor.id === cursor.id
          && page.nextCursor.kind === cursor.kind
          && page.nextCursor.updatedAt === cursor.updatedAt
          && page.nextCursor.queryKey === cursor.queryKey
        ) {
          throw new Error("下一页游标与当前游标相同。");
        }
      }
      setSubjects(page.items);
      setTotal(page.total);
      setNextCursor(page.nextCursor);
    }).catch((reason: unknown) => {
      if (!active || requestVersionRef.current !== requestVersion) return;
      setError(safeVisibleErrorMessage(reason, "无法读取本地研究记录分页"));
    }).finally(() => {
      if (active && requestVersionRef.current === requestVersion) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [cursorId, cursorKind, cursorQueryKey, cursorUpdatedAt, favoritesOnly, kind, lifecycle, limit, reloadToken]);

  useRefreshOnResume(refresh);

  return { subjects, total, nextCursor, loading, error, refresh };
}

export function useResearchSubjectOverview() {
  const [overview, setOverview] = useState<ResearchSubjectOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestVersionRef = useRef(0);

  const refresh = useCallback(() => {
    requestVersionRef.current += 1;
    setError(null);
    setLoading(true);
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setLoading(true);
    setError(null);
    void Promise.resolve().then(() => caseRepository.getResearchSubjectOverview()).then((result) => {
      if (!active || requestVersionRef.current !== requestVersion) return;
      assertResearchSubjectOverview(result);
      setOverview(result);
    }).catch((reason: unknown) => {
      if (!active || requestVersionRef.current !== requestVersion) return;
      setError(safeVisibleErrorMessage(reason, "无法读取本地研究记录计数"));
    }).finally(() => {
      if (active && requestVersionRef.current === requestVersion) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  useRefreshOnResume(refresh);

  return { overview, loading, error, refresh };
}
