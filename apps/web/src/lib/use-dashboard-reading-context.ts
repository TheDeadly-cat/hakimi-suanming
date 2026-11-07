import { useCallback, useEffect, useRef, useState } from "react";
import type { CaseRecord, RevisionRecord } from "@hakimi/contracts";
import { caseRepository } from "@hakimi/storage";
import { readLearningReportLocator } from "./reading-learning";
import { READING_NAVIGATION_STORAGE_KEY } from "./reading-navigation-context";
import { LOCAL_READING_EDITION_VERSION } from "./local-reading-version";
import { READING_EXPLANATION_INDEX_VERSION } from "./reading-explanation-index";
import { MAIN_ROUTE_READING_VERSION } from "./main-route-reading";

export type DashboardReadingContext =
  | { status: "checking" | "none" | "unavailable" }
  | { status: "ready"; caseRecord: CaseRecord; revision: RevisionRecord; href: string };

/** A recent update is not a reading choice. Reuse the reader's exact identity,
 * then verify it against storage before offering a continuation. */
async function resolveDashboardReadingContext(): Promise<DashboardReadingContext> {
  const locator = readLearningReportLocator();
  if (locator.status !== "candidate") return locator;
  const raw = window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY);
  if (!raw || raw.length > 4096) return { status: "unavailable" };
  const saved = JSON.parse(raw);
  const identity = JSON.parse(saved.identity);
  if (identity[4] !== LOCAL_READING_EDITION_VERSION || identity[5] !== READING_EXPLANATION_INDEX_VERSION
    || saved.presentation?.mainRouteVersion !== MAIN_ROUTE_READING_VERSION) return { status: "unavailable" };
  const bundle = await caseRepository.getCase(locator.caseId);
  const revision = bundle?.revisions.find(item => item.id === locator.revisionId && item.caseId === locator.caseId);
  if (!bundle || bundle.caseRecord.id !== locator.caseId || bundle.caseRecord.deletedAt !== null || !revision
    || revision.manifest.resultHash !== locator.resultHash
    || revision.manifest.ruleProfileDigest !== locator.ruleProfileDigest
    || identity[6] !== (revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only")) return { status: "unavailable" };
  const current = readLearningReportLocator();
  if (current.status !== "candidate" || current.caseId !== locator.caseId || current.revisionId !== locator.revisionId
    || current.resultHash !== locator.resultHash || current.ruleProfileDigest !== locator.ruleProfileDigest
    || window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY) !== raw) return { status: "unavailable" };
  return { status: "ready", caseRecord: bundle.caseRecord, revision, href: locator.href };
}

export function useDashboardReadingContext() {
  const [context, setContext] = useState<DashboardReadingContext>({ status: "checking" });
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    const request = ++requestRef.current;
    setContext({ status: "checking" });
    try {
      const next = await resolveDashboardReadingContext();
      if (mountedRef.current && request === requestRef.current) setContext(next);
    } catch {
      if (mountedRef.current && request === requestRef.current) setContext({ status: "unavailable" });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const refreshOnResume = () => { void refresh(); };
    const refreshOnVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const refreshOnStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === READING_NAVIGATION_STORAGE_KEY) void refresh();
    };
    window.addEventListener("focus", refreshOnResume);
    window.addEventListener("pageshow", refreshOnResume);
    window.addEventListener("storage", refreshOnStorage);
    document.addEventListener("visibilitychange", refreshOnVisible);
    void refresh();
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      window.removeEventListener("focus", refreshOnResume);
      window.removeEventListener("pageshow", refreshOnResume);
      window.removeEventListener("storage", refreshOnStorage);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [refresh]);

  return { context, refresh };
}
