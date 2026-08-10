import type {
  ReadySavedViewRecord,
  MigrationRequiredSavedViewRecord,
  ResearchQuery,
  SavedViewRecord,
} from "@hakimi/contracts";
import {
  buildResearchQueryExport,
  encodeResearchQueryExport,
  executeResearchQuery,
  type ResearchQueryExecution,
  type ResearchQueryProgress,
  type ResearchQuerySnapshot,
} from "@hakimi/research-query";
import { saveTextFile, type FileSaveResult } from "@hakimi/platform";
import { caseRepository, researchRepository } from "@hakimi/storage";
import { APP_VERSION } from "./app-version";
import type { ResearchRuleProfileOption } from "./research-query-form";

export type ExecuteWebResearchQueryOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: ResearchQueryProgress) => void;
};

export async function readWebResearchQuerySnapshot(signal?: AbortSignal): Promise<ResearchQuerySnapshot> {
  const full = await caseRepository.readFullDataSnapshot({ signal });
  return {
    cases: full.cases,
    revisions: full.revisions,
    candidateSets: full.candidateSets,
    researchNotes: full.researchNotes,
    events: full.events,
    knowledgeDocuments: full.knowledgeDocuments,
    revisionCalculationReceiptLedgerStatus:
      caseRepository.database.targetSchemaVersion >= 15 ? "available" : "schema_unavailable",
    revisionCalculationReceipts: full.revisionCalculationReceipts,
  };
}

export async function executeWebResearchQuery(
  query: ResearchQuery,
  options: ExecuteWebResearchQueryOptions = {},
): Promise<{ execution: ResearchQueryExecution; snapshot: ResearchQuerySnapshot }> {
  options.signal?.throwIfAborted();
  const snapshot = await readWebResearchQuerySnapshot(options.signal);
  options.signal?.throwIfAborted();
  const execution = await executeResearchQuery(query, snapshot, options);
  return { execution, snapshot };
}

export function ruleProfileOptionsFromSnapshot(snapshot: ResearchQuerySnapshot): ResearchRuleProfileOption[] {
  const profiles = new Map<string, ResearchRuleProfileOption>();
  for (const revision of snapshot.revisions) {
    profiles.set(revision.manifest.ruleProfileDigest, {
      digest: revision.manifest.ruleProfileDigest,
      label: revision.ruleProfile.label,
      version: revision.ruleProfile.profileVersion,
    });
  }
  return [...profiles.values()].sort((left, right) => left.digest.localeCompare(right.digest));
}

export async function listResearchSavedViews(): Promise<SavedViewRecord[]> {
  return researchRepository.listSavedViews();
}

export async function getResearchSavedView(viewId: string): Promise<SavedViewRecord | null> {
  return researchRepository.getSavedView(viewId);
}

export async function createResearchSavedView(name: string, query: ResearchQuery): Promise<ReadySavedViewRecord> {
  return researchRepository.createSavedView({ name, query });
}

export async function updateResearchSavedView(
  view: ReadySavedViewRecord,
  query: ResearchQuery,
  name = view.name,
): Promise<ReadySavedViewRecord> {
  return researchRepository.updateSavedView(view.id, {
    expectedEditVersion: view.editVersion,
    patch: { name, query },
  });
}

export async function resolveResearchSavedViewMigration(
  view: MigrationRequiredSavedViewRecord,
  query: ResearchQuery,
  name = view.name,
): Promise<ReadySavedViewRecord> {
  return researchRepository.resolveSavedViewMigration(view.id, {
    expectedEditVersion: view.editVersion,
    query,
    name,
  });
}

export async function downloadResearchQueryExecution(execution: ResearchQueryExecution): Promise<FileSaveResult> {
  const envelope = await buildResearchQueryExport(execution, { appVersion: APP_VERSION });
  const timestamp = envelope.manifest.exportedAt.replaceAll(":", "-");
  return saveTextFile(
    `hakimi-research-query-${timestamp}.json`,
    encodeResearchQueryExport(envelope),
    "application/json;charset=utf-8",
  );
}
