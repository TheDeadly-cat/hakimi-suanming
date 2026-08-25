import {
  isCandidateSetRecord,
  type ReadySavedViewRecord,
  type ResearchSubjectRecord,
  type SavedViewRecord
} from "@hakimi/contracts";
import { BAZI_RESEARCH_SYSTEM } from "./research-system-roadmap";
import { buildResearchQuerySearch } from "./research-query-route";

const SAVED_VIEW_SCOPE_LABELS = {
  cases: "正式命盘",
  candidate_sets: "候选组",
  events: "真实事件",
  knowledge: "知识资料"
} satisfies Record<ReadySavedViewRecord["query"]["scope"], string>;

export function presentBaziResearchSubject(subject: ResearchSubjectRecord) {
  if (isCandidateSetRecord(subject)) {
    return {
      systemId: BAZI_RESEARCH_SYSTEM.systemId,
      systemLabel: BAZI_RESEARCH_SYSTEM.label,
      kind: "candidate_set" as const,
      href: `/candidate-sets/${subject.id}`,
      status: `${BAZI_RESEARCH_SYSTEM.label} · 时辰待考`,
      detail: `${BAZI_RESEARCH_SYSTEM.label} · ${subject.candidateSet.candidates.length} 个候选 · 时辰待考`
    };
  }

  const revisionLabel = `${BAZI_RESEARCH_SYSTEM.label} · 修订 ${subject.revisionCount}`;
  return {
    systemId: BAZI_RESEARCH_SYSTEM.systemId,
    systemLabel: BAZI_RESEARCH_SYSTEM.label,
    kind: "case" as const,
    href: `/cases/${subject.id}/revisions/${subject.latestRevisionId}`,
    status: revisionLabel,
    detail: revisionLabel
  };
}

export function presentBaziSavedView(view: SavedViewRecord) {
  const scope = view.state === "migration_required"
    ? "待审核迁移"
    : SAVED_VIEW_SCOPE_LABELS[view.query.scope];
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
