import { lazy, Suspense, useMemo, useState } from "react";
import type { CaseRecord, RevisionRecord } from "@hakimi/contracts";
import { buildMainRouteReading } from "../lib/main-route-reading";
import { readReadingNavigation, readReadingOverviewNavigation, writeReadingNavigation, writeReadingOverviewNavigation,
  type ReadingOverviewNavigation } from "../lib/reading-navigation-context";
import type { ReadingExplanationIndex, ReadingExplanationQuery } from "../lib/reading-explanation-index";
import { navigate } from "../lib/router";
import { safeVisibleErrorMessage } from "../lib/visible-text";
import type { MainRoutePreviewInput } from "./local-reading-container";
import { ReadingMainRouteCard } from "./reading-main-route-card";

const PreviewSource = lazy(() => import("./local-reading-container").then(module => ({ default: module.LocalReadingContainer })));
const noAction = () => {};

function ReadyMainRoute({ source, index, caseName, href }: { source: MainRoutePreviewInput; index: ReadingExplanationIndex; caseName: string; href: string }) {
  const [query, setQuery] = useState(() => readReadingNavigation(index, source.revision));
  const [overview, setOverview] = useState(() => readReadingOverviewNavigation(index, source.revision));
  const [handoffError, setHandoffError] = useState("");
  const result = useMemo(() => {
    try { return { model: buildMainRouteReading({ revision: source.revision, annual: source.annual, timeline: source.timeline,
      includeHour: source.includeHour, explanationIndex: index, selectedYear: query.year, range: overview.range,
      branchId: query.branchId === "locked" || query.branchId === "forward" || query.branchId === "backward" ? query.branchId : undefined }), error: null }; }
    catch (reason) { return { model: null, error: safeVisibleErrorMessage(reason, "这份资料的主判断暂时无法核对，请打开原解读。") }; }
  }, [source.revision, source.annual, source.timeline, source.includeHour, index, query.year, query.branchId, overview.range]);
  const select = (next: ReadingExplanationQuery, presentation: ReadingOverviewNavigation) => {
    // This is the reader's own source-validated context, never a second route cache.
    writeReadingNavigation(index, source.revision, next);
    writeReadingOverviewNavigation(index, source.revision, presentation);
    setHandoffError("");
    setQuery(next); setOverview(presentation);
  };
  const open = (next: ReadingExplanationQuery, presentation: ReadingOverviewNavigation) => {
    select(next, presentation);
    const savedQuery = readReadingNavigation(index, source.revision);
    const savedOverview = readReadingOverviewNavigation(index, source.revision);
    if (savedQuery.topic !== next.topic || savedQuery.year !== next.year || savedQuery.branchId !== next.branchId
      || savedOverview.view !== presentation.view || savedOverview.range !== presentation.range
      || JSON.stringify(savedOverview.detail) !== JSON.stringify(presentation.detail)) {
      setHandoffError("浏览器没有保留这次阅读位置。请使用下方“继续阅读这份解读”，进入后重新选择年份与路径。");
      return;
    }
    navigate(href);
  };
  if (!result.model) return <p role="alert">{result.error}</p>;
  const model = result.model;
  return <div className="reading-explanation-workbench dashboard-main-route-card">
    <ReadingMainRouteCard model={model} caseName={caseName} range={overview.range} years={source.annual?.years.map(year => year.year) ?? []}
      editHref={`${href}/revise`}
      onRangeChange={range => select({ ...query, topic: "summary" }, { view: "main", range })}
      onYearChange={year => { select({ topic: "summary", year, branchId: model.selectedBranchId ?? query.branchId }, { view: "main", range: overview.range }); source.onRequestYear(year); }}
      onBranchChange={branchId => select({ ...query, topic: "summary", branchId }, { ...overview, view: "main" })}
      onOpenYear={year => open({ topic: "summary", year: model.range.requestedStartYear ?? query.year ?? year, branchId: model.selectedBranchId ?? query.branchId },
        { view: "main", range: overview.range, detail: { kind: "year", year } })}
      onOpenPeriods={(label, periods) => {
        const first = periods[0]; if (!first) return;
        open({ topic: "summary", year: model.range.requestedStartYear ?? query.year ?? first.year, branchId: model.selectedBranchId ?? query.branchId },
          { view: "main", range: overview.range,
            detail: { kind: label === "转折前后" ? "turn" : "stage", year: first.year,
              periods: periods.map(period => ({ year: period.year, startInstant: period.startInstant, endExclusiveInstant: period.endExclusiveInstant })) } });
      }} />
    {handoffError ? <p role="alert">{handoffError}</p> : null}
  </div>;
}

export function DashboardMainRoute({ caseRecord, revision, href }: { caseRecord: CaseRecord; revision: RevisionRecord; href: string }) {
  const pending = <p role="status">{caseRecord.alias} · 正在核对主判断与时间范围…</p>;
  return <div className="chart-reading-workbench dashboard-main-route-preview">
    <Suspense fallback={pending}><PreviewSource revision={revision} caseName={caseRecord.alias} readOnly
      onEditBirthData={noAction} onOpenDetails={noAction} onOpenTransit={noAction} onOpenRecords={noAction}
      renderMainRoutePreview={source => source.error ? <p role="alert">{source.error} 可打开原解读核对。</p>
        : source.loading || !source.index ? pending
          : <ReadyMainRoute key={`${revision.caseId}:${revision.id}`} source={source} index={source.index} caseName={caseRecord.alias} href={href} />} />
    </Suspense>
  </div>;
}
