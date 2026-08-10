import { BadgeCheck, BookMarked, CircleAlert, FileSearch, Link2, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CaseBundle, CaseRecord, CitationRecord, RevisionRecord, SourceRightsRecord } from "@hakimi/contracts";
import { buildEvidenceCoverageReport, type EvidenceCoverageReport as CoverageReport } from "@hakimi/knowledge-core";
import { caseRepository, knowledgeRepository } from "@hakimi/storage";
import { knowledgeEvidenceSubjectHref } from "../lib/knowledge-route";
import { AppLink } from "../lib/router";
import { StatusPill } from "./status-pill";

const gapLabels: Record<CoverageReport["rows"][number]["gaps"][number], string> = {
  missing_provenance: "缺字段 provenance",
  unregistered_algorithm: "算法未注册",
  duplicate_provenance: "字段记录重复",
  legacy_source_refs_only: "只有旧字符串来源",
  no_structured_citation: "缺结构化引用",
  only_candidate_citations: "只有候选引用",
  no_redistributable_verified_source: "缺可分发核验来源"
};

function percent(rate: number | null): string {
  return rate === null ? "不适用" : `${Math.round(rate * 100)}%`;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "依据覆盖报告生成失败。";
}

function latestRevision(bundle: CaseBundle): RevisionRecord | null {
  return bundle.revisions.find((revision) => revision.id === bundle.caseRecord.latestRevisionId)
    ?? bundle.revisions.at(-1)
    ?? null;
}

export function EvidenceCoverageReport() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [bundles, setBundles] = useState<CaseBundle[]>([]);
  const [citations, setCitations] = useState<CitationRecord[]>([]);
  const [sourceRights, setSourceRights] = useState<SourceRightsRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedRevisionId, setSelectedRevisionId] = useState("");
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [onlyGaps, setOnlyGaps] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      const nextCases = await caseRepository.listCases();
      const nextBundles = (await Promise.all(nextCases.map((item) => caseRepository.getCase(item.id))))
        .filter((item): item is CaseBundle => item !== null);
      const [nextCitations, nextRights] = await Promise.all([
        knowledgeRepository.listCitations(),
        knowledgeRepository.listSourceRights()
      ]);
      if (!active) return;
      setCases(nextCases);
      setBundles(nextBundles);
      setCitations(nextCitations);
      setSourceRights(nextRights);
      const initialCase = nextCases[0];
      const initialBundle = initialCase ? nextBundles.find((item) => item.caseRecord.id === initialCase.id) : null;
      const initialRevision = initialBundle ? latestRevision(initialBundle) : null;
      setSelectedCaseId(initialCase?.id ?? "");
      setSelectedRevisionId(initialRevision?.id ?? "");
    })().catch((reason: unknown) => {
      if (active) setError(errorMessage(reason));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const selectedBundle = bundles.find((bundle) => bundle.caseRecord.id === selectedCaseId) ?? null;
  const selectedRevision = selectedBundle?.revisions.find((revision) => revision.id === selectedRevisionId)
    ?? (selectedBundle ? latestRevision(selectedBundle) : null);

  useEffect(() => {
    let active = true;
    setError(null);
    void buildEvidenceCoverageReport({
      provenance: selectedRevision?.facts.fieldProvenance ?? [],
      citations,
      sourceRights
    }).then((nextReport) => {
      if (active) setReport(nextReport);
    }).catch((reason: unknown) => {
      if (active) setError(errorMessage(reason));
    });
    return () => { active = false; };
  }, [selectedRevision?.id, citations, sourceRights]);

  const visibleRows = useMemo(() => report?.rows.filter((row) => !onlyGaps || row.gaps.length > 0) ?? [], [report, onlyGaps]);

  const chooseCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    const bundle = bundles.find((item) => item.caseRecord.id === caseId);
    setSelectedRevisionId(bundle ? latestRevision(bundle)?.id ?? "" : "");
  };

  return (
    <section className="coverage-report" aria-labelledby="coverage-report-title">
      <div className="audit-intro">
        <div><p className="eyebrow">Evidence coverage</p><h2 id="coverage-report-title">依据覆盖审计</h2><p>固定 36 个四柱事实主题作为分母。结构化引用、双人核验和来源可分发分别计算，不把一个“有链接”百分比冒充可信度。</p></div>
        <StatusPill tone={report?.metrics.doubleReviewed.numerator ? "jade" : "warning"}>金标 {report?.goldVerifiedCount ?? 0} · 双人核验 {report?.metrics.doubleReviewed.numerator ?? 0}</StatusPill>
      </div>

      <div className="coverage-controls">
        <label className="field"><span>案例</span><select aria-label="覆盖审计案例" value={selectedCaseId} onChange={(event) => chooseCase(event.target.value)}>
          {!cases.length ? <option value="">尚无案例（显示注册表缺口）</option> : null}
          {cases.map((item) => <option key={item.id} value={item.id}>{item.alias}</option>)}
        </select></label>
        <label className="field"><span>修订</span><select aria-label="覆盖审计修订" value={selectedRevision?.id ?? ""} onChange={(event) => setSelectedRevisionId(event.target.value)} disabled={!selectedBundle}>
          {!selectedBundle ? <option value="">不适用</option> : selectedBundle.revisions.map((revision) => <option key={revision.id} value={revision.id}>第 {revision.revisionNumber} 版{revision.id === selectedBundle.caseRecord.latestRevisionId ? " · 最新" : ""}</option>)}
        </select></label>
        <label className="coverage-gap-toggle"><input type="checkbox" checked={onlyGaps} onChange={(event) => setOnlyGaps(event.target.checked)} />只看缺口</label>
      </div>

      {report ? <div className="audit-metrics coverage-metrics" role="group" aria-label="依据覆盖率">
        <div><FileSearch aria-hidden="true" /><strong>{percent(report.metrics.provenanceCompleteness.rate)}</strong><span>provenance 完整 · {report.metrics.provenanceCompleteness.numerator}/{report.metrics.provenanceCompleteness.denominator}</span></div>
        <div><Link2 aria-hidden="true" /><strong>{percent(report.metrics.structuredLink.rate)}</strong><span>结构化链接 · {report.metrics.structuredLink.numerator}/{report.metrics.structuredLink.denominator}</span></div>
        <div><BadgeCheck aria-hidden="true" /><strong>{percent(report.metrics.doubleReviewed.rate)}</strong><span>双人核验 · {report.metrics.doubleReviewed.numerator}/{report.metrics.doubleReviewed.denominator}</span></div>
        <div><PackageCheck aria-hidden="true" /><strong>{percent(report.metrics.redistributableSource.rate)}</strong><span>可分发来源 · {report.metrics.redistributableSource.numerator}/{report.metrics.redistributableSource.denominator}</span></div>
      </div> : null}

      <div className="coverage-honesty-note"><CircleAlert aria-hidden="true" /><p>“用户候选”可以提高结构化链接率，但不会提高双人核验率；仅本机资料即使被引用，也不会提高可分发来源率。旧 <code>sourceRefs</code> 只保留为待迁移线索。</p></div>
      {error ? <div className="inline-error" role="alert"><strong>覆盖审计不可用</strong><p>{error}</p></div> : null}
      {loading || !report ? <p role="status">正在复算 36 个依据主题…</p> : null}

      {report ? <>
        <div className="coverage-summary-line"><span>显示 {visibleRows.length} / {report.rows.length} 个主题</span><span>实验 {report.provenanceStatusCounts.experimental} · 裁定 {report.provenanceStatusCounts.adjudicated} · 争议 {report.provenanceStatusCounts.disputed} · 金标 {report.provenanceStatusCounts.gold_verified}</span><code title={report.digest}>报告 {report.digest.slice(0, 12)}</code></div>
        <div className="coverage-row-list">
          {visibleRows.map((row) => <article key={row.subject.subjectId}>
            <header><div><p className="eyebrow">{row.subject.category === "calendar_fact" ? "Calendar fact" : "Rule derived"}</p><h3>{row.subject.label}</h3><code>{row.subject.subjectId}</code></div><StatusPill tone={row.gaps.length ? "warning" : "jade"}>{row.gaps.length ? `${row.gaps.length} 个缺口` : "当前层级齐全"}</StatusPill></header>
            <dl>
              <div><dt>字段</dt><dd>{row.subject.fieldPaths.join("、")}</dd></div>
              <div><dt>算法</dt><dd>{row.provenance?.algorithmId ?? "未生成 provenance"}</dd></div>
              <div><dt>引用</dt><dd>候选 {row.candidateCitationIds.length} · 核验 {row.verifiedCitationIds.length}</dd></div>
              <div><dt>可分发</dt><dd>{row.redistributableCitationIds.length} 条核验引用</dd></div>
            </dl>
            {row.gaps.length ? <ul className="coverage-gap-list">{row.gaps.map((gap) => <li key={gap}>{gapLabels[gap]}</li>)}</ul> : null}
            <AppLink className="secondary-action" href={knowledgeEvidenceSubjectHref(row.subject.subjectId)}><BookMarked aria-hidden="true" />去资料库添加主题来源</AppLink>
          </article>)}
        </div>
      </> : null}
    </section>
  );
}
