import { useCallback, useEffect, useState } from "react";
import type { CaseRecord, ResearchSubjectRecord } from "@hakimi/contracts";
import {
  caseRepository,
  type ResearchSubjectKind,
  type ResearchSubjectOverview,
  type ResearchSubjectPageCursor
} from "@hakimi/storage";

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

export function useCases() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCases(await caseRepository.listCases());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取本地案例库");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cases, loading, error, refresh };
}

export function useResearchSubjects(options: ResearchSubjectListOptions = {}) {
  const lifecycle = options.lifecycle ?? "active";
  const favoritesOnly = options.favoritesOnly ?? false;
  const [subjects, setSubjects] = useState<ResearchSubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSubjects(await caseRepository.listResearchSubjects({ lifecycle, favoritesOnly }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取本地研究记录");
    } finally {
      setLoading(false);
    }
  }, [favoritesOnly, lifecycle]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void caseRepository.listResearchSubjectsPage({
      lifecycle,
      favoritesOnly,
      kind,
      limit,
      cursor
    }).then((page) => {
      if (!active) return;
      setSubjects(page.items);
      setTotal(page.total);
      setNextCursor(page.nextCursor);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "无法读取本地研究记录分页");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [cursorId, cursorKind, cursorQueryKey, cursorUpdatedAt, favoritesOnly, kind, lifecycle, limit, reloadToken]);

  return { subjects, total, nextCursor, loading, error, refresh };
}

export function useResearchSubjectOverview() {
  const [overview, setOverview] = useState<ResearchSubjectOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void caseRepository.getResearchSubjectOverview().then((result) => {
      if (active) setOverview(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "无法读取本地研究记录计数");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  return { overview, loading, error, refresh };
}
