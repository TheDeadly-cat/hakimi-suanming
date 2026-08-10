import {
  isCandidateSetRecord,
  type ResearchSubjectRecord,
  type SavedViewRecord
} from "@hakimi/contracts";
import { BAZI_RESEARCH_SYSTEM } from "./research-system-roadmap";
import { buildResearchQuerySearch } from "./research-query-route";

export function presentBaziResearchSubject(subject: ResearchSubjectRecord) {
  const candidate = isCandidateSetRecord(subject);
  return {
    systemId: BAZI_RESEARCH_SYSTEM.systemId,
    systemLabel: BAZI_RESEARCH_SYSTEM.label,
    kind: candidate ? "candidate_set" as const : "case" as const,
    href: candidate
      ? `/candidate-sets/${subject.id}`
      : `/cases/${subject.id}/revisions/${subject.latestRevisionId}`,
    status: candidate
      ? `${BAZI_RESEARCH_SYSTEM.label} · 时辰待考`
      : `${BAZI_RESEARCH_SYSTEM.label} · 修订 ${subject.revisionCount}`,
    detail: candidate
      ? `${BAZI_RESEARCH_SYSTEM.label} · ${subject.candidateSet.candidates.length} 个候选 · 时辰待考`
      : `${BAZI_RESEARCH_SYSTEM.label} · 修订 ${subject.revisionCount}`
  };
}

export function presentBaziSavedView(view: SavedViewRecord) {
  const scope = view.state === "migration_required"
    ? "待审核迁移"
    : view.query.scope === "cases"
      ? "正式命盘"
      : view.query.scope === "candidate_sets"
        ? "候选组"
        : view.query.scope === "events"
          ? "真实事件"
          : "知识资料";
  return {
    systemId: BAZI_RESEARCH_SYSTEM.systemId,
    systemLabel: BAZI_RESEARCH_SYSTEM.label,
    label: `${BAZI_RESEARCH_SYSTEM.label} · ${scope}`,
    href: `/cases/research${buildResearchQuerySearch({
      source: "view",
      referenceId: view.id,
      resultKey: null
    })}`
  };
}
