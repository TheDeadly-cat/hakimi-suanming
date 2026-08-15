import { BookOpen, Calculator, CircleHelp, GitCompareArrows, Link2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CitationRecord, RevisionRecord } from "@hakimi/contracts";
import { evidenceSubjectIdForField } from "@hakimi/knowledge-core";
import { knowledgeRepository } from "@hakimi/storage";
import { buildKnowledgeSearch, knowledgeChartFieldHref } from "../lib/knowledge-route";
import { AppLink } from "../lib/router";
import { StatusPill } from "./status-pill";
import { matrixFieldLabel, matrixValue, type MatrixSelection } from "./four-pillars-matrix";

type FieldProvenance = RevisionRecord["facts"]["fieldProvenance"][number];
type Citation = CitationRecord;

const provenanceKindLabels: Record<FieldProvenance["kind"], string> = {
  calendar_fact: "历法事实",
  rule_derived: "规则推导",
  interpretive_claim: "解释观点",
  ai_expression: "AI 表达"
};

const verificationStatusLabels: Record<FieldProvenance["verificationStatus"], string> = {
  gold_verified: "金标准已验证",
  adjudicated: "已裁定",
  disputed: "有争议",
  experimental: "实验"
};

const compactEvidenceQuery = "(max-width: 1099px)";

function compactEvidenceViewport(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.matchMedia === "function"
    ? window.matchMedia(compactEvidenceQuery).matches
    : window.innerWidth <= 1099;
}

export function EvidencePanel({ revision, selection, open, onClose }: { revision: RevisionRecord; selection: MatrixSelection; open: boolean; onClose: () => void }) {
  const pillar = revision.facts.pillars[selection.pillar];
  const value = matrixValue(pillar, selection.field);
  const requestedProvenanceField = `pillars.${selection.pillar}.${selection.field === "stem" || selection.field === "branch" ? "ganZhi" : selection.field}`;
  const provenance = revision.facts.fieldProvenance.find((item) => item.field === requestedProvenanceField);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citationError, setCitationError] = useState<string | null>(null);
  const [compact, setCompact] = useState(compactEvidenceViewport);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const citationTarget = {
    kind: "chart_field" as const,
    caseId: revision.caseId,
    revisionId: revision.id,
    field: requestedProvenanceField
  };
  const evidenceSubjectId = evidenceSubjectIdForField(requestedProvenanceField);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const media = typeof window.matchMedia === "function"
      ? window.matchMedia(compactEvidenceQuery)
      : null;
    const sync = () => setCompact(media?.matches ?? window.innerWidth <= 1099);
    sync();
    if (media) {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (!compact || !open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const focusableElements = () => panel
      ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => (
        element.getAttribute("aria-hidden") !== "true" && !element.hasAttribute("hidden")
      ))
      : [];

    document.body.style.overflow = "hidden";
    panel?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === panel || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [compact, open]);

  useEffect(() => {
    let active = true;
    setCitationError(null);
    const targets = evidenceSubjectId
      ? [citationTarget, { kind: "evidence_subject" as const, subjectId: evidenceSubjectId }]
      : [citationTarget];
    void Promise.all(targets.map((target) => knowledgeRepository.listCitationsByTarget(target))).then((groups: CitationRecord[][]) => {
      if (!active) return;
      const byId = new Map(groups.flat().map((citation) => [citation.id, citation]));
      setCitations([...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    }).catch((reason: unknown) => {
      if (!active) return;
      setCitations([]);
      setCitationError(reason instanceof Error ? reason.message : "结构化引用读取失败。");
    });
    return () => { active = false; };
  }, [revision.caseId, revision.id, requestedProvenanceField, evidenceSubjectId]);

  return (
    <aside
      ref={panelRef}
      className={`evidence-panel ${open ? "is-open" : ""}`}
      role={compact && open ? "dialog" : undefined}
      aria-modal={compact && open ? "true" : undefined}
      aria-label={compact && open ? undefined : "字段依据"}
      aria-labelledby={compact && open ? "evidence-panel-title" : undefined}
      tabIndex={compact && open ? -1 : undefined}
    >
      <div className="evidence-drag-handle" aria-hidden="true" />
      <header className="evidence-header">
        <div><p className="eyebrow">Evidence</p><h2 id="evidence-panel-title">{pillar.label} · {matrixFieldLabel(selection.field)}</h2><p className="evidence-value">{value}</p></div>
        <button type="button" className="icon-button evidence-close" onClick={onClose} aria-label="关闭依据面板"><X aria-hidden="true" /></button>
      </header>
      <div className="evidence-sections">
        <section>
          <div className="evidence-title"><Calculator aria-hidden="true" /><h3>算得出</h3><StatusPill tone="warning">{provenance ? verificationStatusLabels[provenance.verificationStatus] : "待补证据"}</StatusPill></div>
          <dl>
            <div><dt>字段</dt><dd>{requestedProvenanceField}</dd></div>
            <div><dt>类型</dt><dd>{provenance ? provenanceKindLabels[provenance.kind] : "暂无直接来源"}</dd></div>
            <div><dt>算法</dt><dd>{provenance?.algorithmId ?? "待补证据"}</dd></div>
            <div><dt>引擎</dt><dd>{revision.manifest.engine.name} {revision.manifest.engine.version}</dd></div>
          </dl>
          <p>{provenance?.note ?? "当前字段暂无直接证据记录；系统不会借用干支字段的算法或来源。"}</p>
        </section>
        <section>
          <div className="evidence-title"><GitCompareArrows aria-hidden="true" /><h3>怎么解</h3></div>
          <p>此字段依据只证明确定性候选结构；旺衰与十神请到“概览”查看 0.1.0 规则候选，格局、调候与用神仍未下结论。日柱按“{revision.ruleProfile.calendar.dayBoundary === "zi_start_23" ? "23:00 子初换日" : "00:00 午夜换日"}”计算。</p>
        </section>
        <section>
          <div className="evidence-title"><BookOpen aria-hidden="true" /><h3>来源</h3></div>
          {citations.length ? <div className="structured-citation-list">
            {citations.map((citation) => <AppLink key={citation.id} href={`/knowledge${buildKnowledgeSearch({
              documentId: citation.documentId,
              sectionId: citation.locator.sectionId,
              lineNumber: citation.locator.startLine,
              citationId: citation.id,
              target: citationTarget
            })}`}>
              <blockquote>{citation.quote}</blockquote>
              <small>{citation.status === "verified" ? "双人核验" : citation.status === "rejected" ? "已拒绝" : "用户候选"} · 第 {citation.locator.startLine}{citation.locator.endLine === citation.locator.startLine ? "" : `–${citation.locator.endLine}`} 行</small>
            </AppLink>)}
          </div> : null}
          {provenance?.sourceRefs.length ? <div className="legacy-source-refs"><small>旧来源记录（保留）</small><ul>{provenance.sourceRefs.map((source) => <li key={source}>{source}</li>)}</ul></div> : !citations.length ? <div className="source-missing"><CircleHelp aria-hidden="true" /><p><strong>{provenance ? "来源待核验" : "待补证据"}</strong> {provenance ? "目前仅记录上游实现与规则参数，尚未绑定经双人复核的书名、版本和章节。" : "当前字段暂无直接来源，不展示或借用干支字段的来源。"}</p></div> : null}
          {citationError ? <p className="citation-load-error">{citationError}</p> : null}
          <AppLink className="secondary-action evidence-add-citation" href={knowledgeChartFieldHref(citationTarget)}><Link2 aria-hidden="true" />去知识库添加来源</AppLink>
        </section>
      </div>
    </aside>
  );
}
