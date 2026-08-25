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
import { caseRepository, researchRepository } from "@hakimi/storage";
import { APP_VERSION } from "./app-version";
import type { ResearchRuleProfileOption } from "./research-query-form";

const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const MAX_RULE_PROFILE_LABEL_CHARACTERS = 240;
const MAX_RULE_PROFILE_VERSION_CHARACTERS = 128;

function requireVisibleProfileText(
  value: unknown,
  field: string,
  maximumCharacters: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    Array.from(value).length > maximumCharacters ||
    /[\p{Cc}\p{Cf}]/u.test(value)
  ) {
    throw new Error(`规则档案 ${field} 不是有界且可见的规范文本；已拒绝研究查询。`);
  }
  return value;
}

function requireCanonicalExportInstant(value: unknown): string {
  if (typeof value !== "string") throw new Error("研究查询导出时间无效。");
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw new Error("研究查询导出时间不是规范 UTC 时间。");
  }
  return value;
}

export type ExecuteWebResearchQueryOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: ResearchQueryProgress) => void;
};

export type PreparedResearchQueryExportFile = Readonly<{
  filename: string;
  content: string;
  mediaType: "application/json;charset=utf-8";
}>;

export async function readWebResearchQuerySnapshot(signal?: AbortSignal): Promise<ResearchQuerySnapshot> {
  const snapshot = await caseRepository.readResearchQuerySnapshot({ signal });
  ruleProfileOptionsFromSnapshot(snapshot);
  return snapshot;
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
    const digest = revision.manifest.ruleProfileDigest;
    if (typeof digest !== "string" || !LOWERCASE_SHA256.test(digest)) {
      throw new Error("Revision 包含非规范规则摘要；本地快照不一致，已拒绝研究查询。");
    }
    const profile = {
      digest,
      label: requireVisibleProfileText(
        revision.ruleProfile.label,
        "标签",
        MAX_RULE_PROFILE_LABEL_CHARACTERS,
      ),
      version: requireVisibleProfileText(
        revision.ruleProfile.profileVersion,
        "版本",
        MAX_RULE_PROFILE_VERSION_CHARACTERS,
      ),
    };
    const existing = profiles.get(digest);
    if (existing && (existing.label !== profile.label || existing.version !== profile.version)) {
      throw new Error("相同规则摘要对应了不同标签或版本；本地 Revision 快照不一致，已拒绝研究查询。");
    }
    profiles.set(digest, profile);
  }
  return [...profiles.values()].sort((left, right) => left.digest < right.digest ? -1 : left.digest > right.digest ? 1 : 0);
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

export async function prepareResearchQueryExecutionExport(
  execution: ResearchQueryExecution,
): Promise<PreparedResearchQueryExportFile> {
  const envelope = await buildResearchQueryExport(execution, { appVersion: APP_VERSION });
  const timestamp = requireCanonicalExportInstant(envelope.manifest.exportedAt).replaceAll(":", "-");
  return {
    filename: `hakimi-research-query-${timestamp}.json`,
    content: encodeResearchQueryExport(envelope),
    mediaType: "application/json;charset=utf-8",
  };
}
