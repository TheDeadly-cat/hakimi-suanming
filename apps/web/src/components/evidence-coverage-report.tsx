import { BadgeCheck, BookMarked, CircleAlert, FileSearch, Link2, PackageCheck } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  caseRecordSchema,
  citationRecordSchema,
  storedRevisionRecordSchema,
  sourceRightsRecordSchema,
  type CaseBundle,
  type CaseRecord,
  type CitationRecord,
  type RevisionRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import {
  buildEvidenceCoverageReport,
  isRedistributableSourceRights,
  verifyEvidenceCoverageReportDigest,
  type EvidenceCoverageReport as CoverageReport
} from "@hakimi/knowledge-core";
import { caseRepository, knowledgeRepository } from "@hakimi/storage";
import { knowledgeEvidenceSubjectHref } from "../lib/knowledge-route";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import { StatusPill } from "./status-pill";
import "./evidence-coverage-report.css";

type CoverageGap = CoverageReport["rows"][number]["gaps"][number];
type CoverageSourceKey = "cases" | "citations" | "rights";
type CoverageSourceState = {
  state: "loading" | "loaded" | "error";
  detail: string;
};
type CoverageLoadResult<T> = { ok: true; value: T } | { ok: false; error: string };

const gapLabels: Record<CoverageGap, string> = {
  missing_provenance: "缺字段 provenance",
  unregistered_algorithm: "算法未注册",
  duplicate_provenance: "字段记录重复",
  legacy_source_refs_only: "只有旧字符串来源",
  no_structured_citation: "缺结构化引用",
  only_candidate_citations: "只有候选引用",
  no_redistributable_verified_source: "缺权利门禁通过的核验来源"
};

const knownCoverageGaps = new Set<string>(Object.keys(gapLabels));
const COVERAGE_LIMITS = {
  cases: 5_000,
  revisionsPerCase: 5_000,
  citations: 50_000,
  sourceRights: 50_000,
  reportRows: 1_024,
  unregistered: 5_000,
  fieldPathsPerSubject: 128,
  algorithmIdsPerSubject: 128,
  legacyRefsPerSubject: 512,
  citationsPerSubject: 512
} as const;
const CASE_BUNDLE_READ_CONCURRENCY = 8;
const INITIAL_VISIBLE_REPORT_ROWS = 48;
const VISIBLE_REPORT_ROW_STEP = 48;
const INITIAL_VISIBLE_UNREGISTERED = 80;
const VISIBLE_UNREGISTERED_STEP = 80;
const VISIBLE_BINDING_ID_LIMIT = 24;

function percent(rate: number | null): string {
  if (rate === null) return "不适用";
  if (rate === 0) return "0%";
  if (rate === 1) return "100%";
  const value = rate * 100;
  if (value < 0.1) return "<0.1%";
  const truncated = Math.floor(value * 10) / 10;
  return `${Number.isInteger(truncated) ? truncated.toFixed(0) : truncated.toFixed(1)}%`;
}

function errorMessage(reason: unknown, fallback: string): string {
  return safeVisibleErrorMessage(reason, fallback);
}

function safeCoverageText(value: unknown, fallback: string, maxLength = 240): string {
  return safeVisibleText(value, fallback, maxLength);
}

function createLoadingSourceStates(): Record<CoverageSourceKey, CoverageSourceState> {
  return {
    cases: { state: "loading", detail: "正在读取案例目录与修订 Bundle" },
    citations: { state: "loading", detail: "正在读取结构化引用索引" },
    rights: { state: "loading", detail: "正在读取来源权利记录" }
  };
}

function captureSource<T>(operation: () => Promise<T>, fallback: string): Promise<CoverageLoadResult<T>> {
  return Promise.resolve()
    .then(operation)
    .then((value) => ({ ok: true as const, value }))
    .catch((reason: unknown) => ({ ok: false as const, error: errorMessage(reason, fallback) }));
}

async function mapWithConcurrency<T, Result>(
  values: readonly T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<Result>
): Promise<Result[]> {
  const results = new Array<Result>(values.length);
  let nextIndex = 0;
  let failed = false;
  let failure: unknown;
  const workerCount = Math.min(Math.max(1, concurrency), values.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (!failed && nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await operation(values[index]!, index);
      } catch (reason) {
        if (!failed) {
          failed = true;
          failure = reason;
        }
      }
    }
  });
  await Promise.all(workers);
  if (failed) throw failure;
  return results;
}

function latestRevision(bundle: CaseBundle): RevisionRecord | null {
  return bundle.revisions.find((revision) => revision.id === bundle.caseRecord.latestRevisionId) ?? null;
}

function hasStableId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return value === trimmed && trimmed.length > 0 && safeVisibleText(trimmed, "", 512) === trimmed;
}

function duplicateIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (!hasStableId(value)) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function shortCoverageBinding(value: unknown): string {
  const visible = safeVisibleText(value, "不可显示", 256);
  return visible.length > 24 ? `${visible.slice(0, 12)}…${visible.slice(-8)}` : visible;
}

function coverageReportIntegrityIssue(
  report: CoverageReport,
  citations: readonly CitationRecord[],
  sourceRights: readonly SourceRightsRecord[]
): string | null {
  if (report.scope !== "required_v1_subjects" || !hasStableId(report.registryVersion)) {
    return "报告范围或主题注册表版本不可识别。";
  }
  if (report.rows.length > COVERAGE_LIMITS.reportRows) {
    return `报告主题超过 ${COVERAGE_LIMITS.reportRows} 条本地审计上限。`;
  }
  if (report.unregistered.length > COVERAGE_LIMITS.unregistered) {
    return `注册表外 provenance 超过 ${COVERAGE_LIMITS.unregistered} 条本地审计上限。`;
  }
  if (citations.length > COVERAGE_LIMITS.citations || sourceRights.length > COVERAGE_LIMITS.sourceRights) {
    return "报告校验输入超过当前本地审计集合上限。";
  }
  if (!/^[a-f0-9]{64}$/u.test(report.digest)) {
    return "报告 digest 不是规范 SHA-256。";
  }
  const subjectIds = report.rows.map((row) => row.subject.subjectId);
  if (subjectIds.some((subjectId) => !hasStableId(subjectId))) {
    return "报告包含空主题稳定 ID。";
  }
  const duplicateSubjectIds = duplicateIds(subjectIds);
  if (duplicateSubjectIds.length) {
    return `报告包含重复主题：${duplicateSubjectIds.join("、")}。`;
  }
  const registeredFieldPaths = new Set(report.rows.flatMap((row) => row.subject.fieldPaths));
  const unregisteredKeys: string[] = [];
  for (const entry of report.unregistered) {
    if (!hasStableId(entry.field) || !hasStableId(entry.algorithmId)) {
      return "报告包含空的注册表外字段或算法 ID。";
    }
    if (registeredFieldPaths.has(entry.field)) {
      return `报告把已注册字段 ${entry.field} 错列为注册表外 provenance。`;
    }
    unregisteredKeys.push(JSON.stringify([entry.field, entry.algorithmId]));
  }
  if (duplicateIds(unregisteredKeys).length) {
    return "报告包含重复的注册表外 provenance 记录。";
  }

  const metrics = [
    ["provenance 完整", report.metrics.provenanceCompleteness],
    ["结构化链接", report.metrics.structuredLink],
    ["双人核验", report.metrics.doubleReviewed],
    ["权利门禁通过来源", report.metrics.redistributableSource]
  ] as const;
  for (const [label, metric] of metrics) {
    if (!Number.isInteger(metric.numerator) || !Number.isInteger(metric.denominator)) {
      return `${label}指标的分子或分母不是整数。`;
    }
    if (metric.numerator < 0 || metric.denominator < 0 || metric.numerator > metric.denominator) {
      return `${label}指标超出有效计数范围。`;
    }
    if (metric.denominator !== report.rows.length) {
      return `${label}指标分母 ${metric.denominator} 与冻结主题数 ${report.rows.length} 不一致。`;
    }
    if (metric.denominator === 0) {
      if (metric.rate !== null) return `${label}指标分母为零，但比率未标记为不适用。`;
      continue;
    }
    const expectedRate = metric.numerator / metric.denominator;
    if (metric.rate === null || !Number.isFinite(metric.rate) || Math.abs(metric.rate - expectedRate) > 1e-9) {
      return `${label}指标的比率与分子、分母不一致。`;
    }
  }

  const citationIndex = new Map(citations.map((citation) => [citation.id, citation]));
  const rightsIndex = new Map(sourceRights.map((rights) => [rights.documentId, rights]));
  for (const row of report.rows) {
    if (
      row.subject.fieldPaths.length > COVERAGE_LIMITS.fieldPathsPerSubject
      || row.subject.algorithmIds.length > COVERAGE_LIMITS.algorithmIdsPerSubject
      || row.legacySourceRefs.length > COVERAGE_LIMITS.legacyRefsPerSubject
      || row.candidateCitationIds.length > COVERAGE_LIMITS.citationsPerSubject
      || row.verifiedCitationIds.length > COVERAGE_LIMITS.citationsPerSubject
      || row.redistributableCitationIds.length > COVERAGE_LIMITS.citationsPerSubject
      || row.gaps.length > knownCoverageGaps.size
    ) {
      return `主题 ${row.subject.subjectId} 的嵌套集合超过本地审计上限。`;
    }
    if (!row.subject.fieldPaths.length || row.subject.fieldPaths.some((fieldPath) => !hasStableId(fieldPath))) {
      return `主题 ${row.subject.subjectId} 没有有效字段路径。`;
    }
    if (duplicateIds(row.subject.fieldPaths).length) {
      return `主题 ${row.subject.subjectId} 包含重复字段路径。`;
    }
    if (!row.subject.algorithmIds.length || row.subject.algorithmIds.some((algorithmId) => !hasStableId(algorithmId))) {
      return `主题 ${row.subject.subjectId} 没有有效算法注册项。`;
    }
    if (duplicateIds(row.subject.algorithmIds).length) {
      return `主题 ${row.subject.subjectId} 包含重复算法注册项。`;
    }
    if (!Number.isSafeInteger(row.provenanceCount) || row.provenanceCount < 0) {
      return `主题 ${row.subject.subjectId} 的 provenance 数量无效。`;
    }
    if ((row.provenance === null) !== (row.provenanceCount === 0)) {
      return `主题 ${row.subject.subjectId} 的 provenance 首项与数量不一致。`;
    }
    if (row.provenance && !row.subject.fieldPaths.includes(row.provenance.field)) {
      return `主题 ${row.subject.subjectId} 的 provenance 没有绑定该主题字段。`;
    }
    if (row.legacySourceRefs.some((sourceRef) => !hasStableId(sourceRef)) || duplicateIds(row.legacySourceRefs).length) {
      return `主题 ${row.subject.subjectId} 包含空或重复的旧字符串来源。`;
    }
    const unknownGap = row.gaps.find((gap) => !knownCoverageGaps.has(gap));
    if (unknownGap) return `主题 ${row.subject.subjectId} 包含未知缺口类型：${unknownGap}。`;
    const duplicateGaps = duplicateIds(row.gaps);
    if (duplicateGaps.length) return `主题 ${row.subject.subjectId} 包含重复缺口。`;
    const candidateDuplicates = duplicateIds(row.candidateCitationIds);
    const verifiedDuplicates = duplicateIds(row.verifiedCitationIds);
    const redistributableDuplicates = duplicateIds(row.redistributableCitationIds);
    if (candidateDuplicates.length || verifiedDuplicates.length || redistributableDuplicates.length) {
      return `主题 ${row.subject.subjectId} 包含重复引用 ID。`;
    }
    const referencedCitationIds = [...row.candidateCitationIds, ...row.verifiedCitationIds];
    if (referencedCitationIds.some((id) => !hasStableId(id))) {
      return `主题 ${row.subject.subjectId} 包含空引用 ID。`;
    }
    const verifiedIds = new Set(row.verifiedCitationIds);
    if (row.candidateCitationIds.some((id) => verifiedIds.has(id))) {
      return `主题 ${row.subject.subjectId} 的候选引用与核验引用重叠。`;
    }
    if (row.redistributableCitationIds.some((id) => !verifiedIds.has(id))) {
      return `主题 ${row.subject.subjectId} 的权利门禁引用不是核验引用子集。`;
    }
    for (const citationId of referencedCitationIds) {
      const citation = citationIndex.get(citationId);
      if (!citation) return `主题 ${row.subject.subjectId} 引用了当前索引中不存在的引用 ${citationId}。`;
      if (row.candidateCitationIds.includes(citationId) && citation.status !== "user_candidate") {
        return `主题 ${row.subject.subjectId} 的候选引用 ${citationId} 状态不是 user_candidate。`;
      }
      if (row.verifiedCitationIds.includes(citationId) && citation.status !== "verified") {
        return `主题 ${row.subject.subjectId} 的核验引用 ${citationId} 状态不是 verified。`;
      }
      const targetBound = citation.targets.some((target) => (
        target.kind === "evidence_subject" && target.subjectId === row.subject.subjectId
      ));
      if (!targetBound) return `引用 ${citationId} 没有反向绑定主题 ${row.subject.subjectId}。`;
    }
    for (const citationId of row.redistributableCitationIds) {
      const citation = citationIndex.get(citationId);
      const rights = citation ? rightsIndex.get(citation.documentId) : null;
      if (
        !citation
        || !rights
        || rights.documentContentHash !== citation.documentContentHash
        || !isRedistributableSourceRights(rights)
      ) {
        return `主题 ${row.subject.subjectId} 的引用 ${citationId} 未通过当前核心权利判定。`;
      }
    }
    const expectedGaps: CoverageGap[] = [];
    const algorithmRegistered = Boolean(
      row.provenance && row.subject.algorithmIds.includes(row.provenance.algorithmId)
    );
    if (!row.provenance) expectedGaps.push("missing_provenance");
    else if (!algorithmRegistered) expectedGaps.push("unregistered_algorithm");
    if (row.provenanceCount > 1) expectedGaps.push("duplicate_provenance");
    if (referencedCitationIds.length === 0) {
      if (row.legacySourceRefs.length) expectedGaps.push("legacy_source_refs_only");
      expectedGaps.push("no_structured_citation");
    } else if (row.verifiedCitationIds.length === 0) {
      expectedGaps.push("only_candidate_citations");
    }
    if (row.redistributableCitationIds.length === 0) {
      expectedGaps.push("no_redistributable_verified_source");
    }
    const actualGapSet = new Set(row.gaps);
    if (expectedGaps.length !== row.gaps.length || expectedGaps.some((gap) => !actualGapSet.has(gap))) {
      return `主题 ${row.subject.subjectId} 的缺口集合与逐项输入重算结果不一致。`;
    }
  }

  const provenanceBlockingGaps = new Set<CoverageGap>([
    "missing_provenance",
    "unregistered_algorithm",
    "duplicate_provenance"
  ]);
  const expectedNumerators = [
    ["provenance 完整", report.metrics.provenanceCompleteness.numerator, report.rows.filter((row) => (
      row.provenance !== null && !row.gaps.some((gap) => provenanceBlockingGaps.has(gap))
    )).length],
    ["结构化链接", report.metrics.structuredLink.numerator, report.rows.filter((row) => (
      row.candidateCitationIds.length + row.verifiedCitationIds.length > 0
    )).length],
    ["双人核验", report.metrics.doubleReviewed.numerator, report.rows.filter((row) => row.verifiedCitationIds.length > 0).length],
    ["权利门禁通过来源", report.metrics.redistributableSource.numerator, report.rows.filter((row) => row.redistributableCitationIds.length > 0).length]
  ] as const;
  for (const [label, reported, expected] of expectedNumerators) {
    if (reported !== expected) return `${label}指标分子 ${reported} 与逐主题账本重算值 ${expected} 不一致。`;
  }

  const provenanceStatusTotal = Object.values(report.provenanceStatusCounts).reduce((sum, count) => {
    return sum + count;
  }, 0);
  if (Object.values(report.provenanceStatusCounts).some((count) => !Number.isInteger(count) || count < 0)) {
    return "provenance 状态计数不是有效非负整数。";
  }
  if (provenanceStatusTotal !== report.rows.filter((row) => row.provenance !== null).length) {
    return "provenance 状态计数与已绑定主题数量不一致。";
  }
  if (report.goldVerifiedCount !== report.provenanceStatusCounts.gold_verified) {
    return "上游字段金标计数与 provenance 状态账本不一致。";
  }
  if (report.legacySourceRefCount !== report.rows.filter((row) => row.legacySourceRefs.length > 0).length) {
    return "旧字符串来源计数与逐主题账本不一致。";
  }
  return null;
}

function safeCoverageReportIntegrityIssue(
  report: CoverageReport,
  citations: readonly CitationRecord[],
  sourceRights: readonly SourceRightsRecord[]
): string | null {
  try {
    return coverageReportIntegrityIssue(report, citations, sourceRights);
  } catch (reason) {
    return errorMessage(reason, "报告结构无法完成完整性校验。");
  }
}

export function EvidenceCoverageReport() {
  const reportTitleId = useId();
  const honestyNoteId = useId();
  const bindingTitleId = useId();
  const gapIndexTitleId = useId();
  const unregisteredTitleId = useId();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [bundles, setBundles] = useState<CaseBundle[]>([]);
  const [citations, setCitations] = useState<CitationRecord[]>([]);
  const [sourceRights, setSourceRights] = useState<SourceRightsRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [selectedRevisionId, setSelectedRevisionId] = useState("");
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [reportDigestVerified, setReportDigestVerified] = useState(false);
  const [onlyGaps, setOnlyGaps] = useState(true);
  const [selectedGap, setSelectedGap] = useState<CoverageGap | "all">("all");
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [sourceStates, setSourceStates] = useState<Record<CoverageSourceKey, CoverageSourceState>>(createLoadingSourceStates);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [reportVersion, setReportVersion] = useState(0);
  const [visibleRowLimit, setVisibleRowLimit] = useState(INITIAL_VISIBLE_REPORT_ROWS);
  const [visibleUnregisteredLimit, setVisibleUnregisteredLimit] = useState(INITIAL_VISIBLE_UNREGISTERED);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCalculating(false);
    setLoadError(null);
    setReportError(null);
    setSourceStates(createLoadingSourceStates());
    setCases([]);
    setBundles([]);
    setCitations([]);
    setSourceRights([]);
    setSelectedCaseId("");
    setSelectedRevisionId("");
    setSelectedGap("all");
    setVisibleRowLimit(INITIAL_VISIBLE_REPORT_ROWS);
    setVisibleUnregisteredLimit(INITIAL_VISIBLE_UNREGISTERED);
    setReport(null);
    setReportDigestVerified(false);
    const casesRequest = captureSource(async () => {
      const rawCases: unknown = await caseRepository.listCases();
      if (!Array.isArray(rawCases)) throw new Error("案例目录没有返回数组结构；覆盖审计已关闭。");
      if (rawCases.length > COVERAGE_LIMITS.cases) {
        throw new Error(`案例目录超过 ${COVERAGE_LIMITS.cases} 条本地审计上限；覆盖审计已关闭。`);
      }
      const nextCases = rawCases.map((item, index) => {
        const validation = caseRecordSchema.safeParse(item);
        if (!validation.success) throw new Error(`案例目录第 ${index + 1} 条记录没有通过当前 Case 契约；覆盖审计已关闭。`);
        return validation.data;
      });
      const invalidCaseIdIndexes = nextCases.flatMap((item, index) => hasStableId(item.id) ? [] : [index + 1]);
      if (invalidCaseIdIndexes.length) {
        throw new Error(`案例目录第 ${invalidCaseIdIndexes.join("、")} 条记录缺少稳定 ID；覆盖审计已关闭。`);
      }
      const duplicateCaseIds = duplicateIds(nextCases.map((item) => item.id));
      if (duplicateCaseIds.length) {
        throw new Error(`案例目录包含重复稳定 ID：${duplicateCaseIds.join("、")}；覆盖审计已关闭。`);
      }
      const rawBundles = await mapWithConcurrency(
        nextCases,
        CASE_BUNDLE_READ_CONCURRENCY,
        (item) => caseRepository.getCase(item.id)
      );
      const loadedBundles = rawBundles.map((bundle, index): CaseBundle | null => {
        if (!bundle) return null;
        const caseValidation = caseRecordSchema.safeParse(bundle.caseRecord);
        if (!caseValidation.success || !Array.isArray(bundle.revisions)) {
          throw new Error(`案例目录第 ${index + 1} 条对应 Bundle 没有通过基础结构校验；覆盖审计已关闭。`);
        }
        if (bundle.revisions.length > COVERAGE_LIMITS.revisionsPerCase) {
          throw new Error(`案例目录第 ${index + 1} 条对应 Bundle 超过 ${COVERAGE_LIMITS.revisionsPerCase} 个 Revision；覆盖审计已关闭。`);
        }
        const revisions = bundle.revisions.map((revision, revisionIndex) => {
          const validation = storedRevisionRecordSchema.safeParse(revision);
          if (!validation.success) {
            throw new Error(`案例“${safeCoverageText(caseValidation.data.alias, "未命名案例")}”第 ${revisionIndex + 1} 条 Revision 没有通过存储结构契约；覆盖审计已关闭。`);
          }
          return validation.data;
        });
        return { caseRecord: caseValidation.data, revisions };
      });
      for (let index = 0; index < nextCases.length; index += 1) {
        const caseRecord = nextCases[index];
        const bundle = loadedBundles[index];
        if (!bundle) throw new Error(`案例索引中的“${caseRecord.alias}”无法读取；未使用空 provenance 继续审计。`);
        if (bundle.caseRecord.id !== caseRecord.id) throw new Error(`案例“${caseRecord.alias}”返回了不匹配的 Bundle；覆盖审计已关闭。`);
        if (bundle.caseRecord.latestRevisionId !== caseRecord.latestRevisionId) throw new Error(`案例“${caseRecord.alias}”的最新修订指针与 Bundle 不一致；覆盖审计已关闭。`);
        if (!Number.isSafeInteger(bundle.caseRecord.revisionCount) || bundle.caseRecord.revisionCount < 0) {
          throw new Error(`案例“${caseRecord.alias}”声明了无效的 Revision 数量；覆盖审计已关闭。`);
        }
        if (bundle.caseRecord.revisionCount !== bundle.revisions.length) {
          throw new Error(`案例“${caseRecord.alias}”声明 ${bundle.caseRecord.revisionCount} 个 Revision，但 Bundle 返回 ${bundle.revisions.length} 个；覆盖审计已关闭。`);
        }
        if (bundle.revisions.some((revision) => !hasStableId(revision.id))) throw new Error(`案例“${caseRecord.alias}”包含空修订 ID；覆盖审计已关闭。`);
        if (bundle.revisions.some((revision) => revision.caseId !== caseRecord.id)) {
          throw new Error(`案例“${caseRecord.alias}”的 Bundle 混入其他 Case 的 Revision；覆盖审计已关闭。`);
        }
        if (bundle.revisions.some((revision) => !Number.isSafeInteger(revision.revisionNumber) || revision.revisionNumber < 1)) {
          throw new Error(`案例“${caseRecord.alias}”包含无效 Revision 序号；覆盖审计已关闭。`);
        }
        const duplicateRevisionIds = duplicateIds(bundle.revisions.map((revision) => revision.id));
        if (duplicateRevisionIds.length) throw new Error(`案例“${caseRecord.alias}”包含重复修订 ID；覆盖审计已关闭。`);
        if (new Set(bundle.revisions.map((revision) => revision.revisionNumber)).size !== bundle.revisions.length) {
          throw new Error(`案例“${caseRecord.alias}”包含重复 Revision 序号；覆盖审计已关闭。`);
        }
        const exactLatestRevision = latestRevision(bundle);
        if (bundle.revisions.length && !exactLatestRevision) throw new Error(`案例“${caseRecord.alias}”的 latestRevisionId 无法精确命中；覆盖审计已关闭。`);
        if (!bundle.revisions.length && bundle.caseRecord.latestRevisionId) throw new Error(`案例“${caseRecord.alias}”没有修订，但仍声明了 latestRevisionId；覆盖审计已关闭。`);
        if (exactLatestRevision && bundle.revisions.some((revision) => revision.revisionNumber > exactLatestRevision.revisionNumber)) {
          throw new Error(`案例“${caseRecord.alias}”的 latestRevisionId 未指向最高 Revision 序号；覆盖审计已关闭。`);
        }
      }
      const duplicateGlobalRevisionIds = duplicateIds(loadedBundles.flatMap((bundle) => bundle?.revisions.map((revision) => revision.id) ?? []));
      if (duplicateGlobalRevisionIds.length) {
        throw new Error(`不同案例复用了修订 ID：${duplicateGlobalRevisionIds.join("、")}；覆盖审计已关闭。`);
      }
      return { cases: nextCases, bundles: loadedBundles as CaseBundle[] };
    }, "无法读取案例目录与修订 Bundle。");
    const citationsRequest = captureSource(
      async () => {
        const rawRecords: unknown = await knowledgeRepository.listCitations();
        if (!Array.isArray(rawRecords)) throw new Error("结构化引用索引没有返回数组结构。");
        if (rawRecords.length > COVERAGE_LIMITS.citations) {
          throw new Error(`结构化引用索引超过 ${COVERAGE_LIMITS.citations} 条本地审计上限。`);
        }
        const records = rawRecords.map((record, index) => {
          const validation = citationRecordSchema.safeParse(record);
          if (!validation.success) throw new Error(`结构化引用索引第 ${index + 1} 条没有通过当前 Citation 契约。`);
          return validation.data;
        });
        const invalidIds = records.flatMap((record, index) => hasStableId(record.id) && hasStableId(record.documentId) ? [] : [index + 1]);
        if (invalidIds.length) throw new Error(`结构化引用索引第 ${invalidIds.join("、")} 条缺少引用或文档稳定 ID。`);
        const invalidTargets = records.filter((record) => record.targets.some((target) => (
          target.kind === "evidence_subject" && !hasStableId(target.subjectId)
        )));
        if (invalidTargets.length) throw new Error("结构化引用索引包含空 evidence_subject 目标 ID。");
        const duplicates = duplicateIds(records.map((record) => record.id));
        if (duplicates.length) throw new Error(`结构化引用索引包含重复 ID：${duplicates.join("、")}。`);
        return records;
      },
      "无法读取结构化引用索引。"
    );
    const rightsRequest = captureSource(
      async () => {
        const rawRecords: unknown = await knowledgeRepository.listSourceRights();
        if (!Array.isArray(rawRecords)) throw new Error("来源权利索引没有返回数组结构。");
        if (rawRecords.length > COVERAGE_LIMITS.sourceRights) {
          throw new Error(`来源权利索引超过 ${COVERAGE_LIMITS.sourceRights} 条本地审计上限。`);
        }
        const records = rawRecords.map((record, index) => {
          const validation = sourceRightsRecordSchema.safeParse(record);
          if (!validation.success) throw new Error(`来源权利索引第 ${index + 1} 条没有通过当前 Rights 契约。`);
          return validation.data;
        });
        const invalidIds = records.flatMap((record, index) => (
          hasStableId(record.documentId) && record.documentContentHash.trim().length > 0 ? [] : [index + 1]
        ));
        if (invalidIds.length) throw new Error(`来源权利索引第 ${invalidIds.join("、")} 条缺少文档 ID 或内容哈希。`);
        const duplicates = duplicateIds(records.map((record) => record.documentId));
        if (duplicates.length) throw new Error(`来源权利索引包含重复 documentId：${duplicates.join("、")}。`);
        return records;
      },
      "无法读取来源权利记录。"
    );

    void Promise.all([casesRequest, citationsRequest, rightsRequest]).then(([casesResult, citationsResult, rightsResult]) => {
      if (!active) return;

      setSourceStates({
        cases: casesResult.ok
          ? { state: "loaded", detail: `${casesResult.value.cases.length} 个案例 · ${casesResult.value.bundles.length} 个 Bundle · ${casesResult.value.bundles.reduce((total, bundle) => total + bundle.revisions.length, 0)} 个 Revision` }
          : { state: "error", detail: casesResult.error },
        citations: citationsResult.ok
          ? { state: "loaded", detail: `${citationsResult.value.length} 条结构化引用已读取` }
          : { state: "error", detail: citationsResult.error },
        rights: rightsResult.ok
          ? { state: "loaded", detail: `${rightsResult.value.length} 条权利记录已读取` }
          : { state: "error", detail: rightsResult.error }
      });

      if (!casesResult.ok || !citationsResult.ok || !rightsResult.ok) {
        const failedSources = [
          casesResult.ok ? null : "案例与修订",
          citationsResult.ok ? null : "引用索引",
          rightsResult.ok ? null : "来源权利"
        ].filter((label): label is string => label !== null);
        setLoadError(`${failedSources.join("、")}读取失败；覆盖审计保持关闭。`);
        setLoading(false);
        return;
      }

      setCases(casesResult.value.cases);
      setBundles(casesResult.value.bundles);
      setCitations(citationsResult.value);
      setSourceRights(rightsResult.value);
      const initialCase = casesResult.value.cases[0];
      const initialBundle = initialCase
        ? casesResult.value.bundles.find((item) => item.caseRecord.id === initialCase.id)
        : null;
      const initialRevision = initialBundle ? latestRevision(initialBundle) : null;
      setSelectedCaseId(initialCase?.id ?? "");
      setSelectedRevisionId(initialRevision?.id ?? "");
      setCalculating(true);
      setLoading(false);
    }).catch((reason: unknown) => {
      if (!active) return;
      const detail = errorMessage(reason, "覆盖审计来源读取失败。");
      setSourceStates({
        cases: { state: "error", detail },
        citations: { state: "error", detail },
        rights: { state: "error", detail }
      });
      setLoadError(detail);
      setCalculating(false);
      setLoading(false);
    });
    return () => { active = false; };
  }, [loadVersion]);

  const selectedBundle = bundles.find((bundle) => bundle.caseRecord.id === selectedCaseId) ?? null;
  const selectedCase = selectedBundle?.caseRecord ?? cases.find((item) => item.id === selectedCaseId) ?? null;
  const selectedRevision = selectedBundle?.revisions.find((revision) => revision.id === selectedRevisionId) ?? null;
  const selectionIssue = !loading && !loadError
    ? cases.length > 0 && !selectedCaseId
      ? "案例目录非空，但当前没有稳定的 Case 选择；覆盖审计已关闭。"
      : selectedCaseId && !selectedCase
        ? "当前 Case 选择不在已校验案例目录中；覆盖审计已关闭。"
        : selectedCase && !selectedBundle
          ? "当前 Case 没有可绑定的已校验 Bundle；覆盖审计已关闭。"
          : selectedBundle?.revisions.length && !selectedRevision
            ? "当前 Revision 选择没有精确命中所属 Bundle；未使用空 provenance 继续审计。"
            : selectedRevisionId && !selectedRevision
              ? "当前 Revision 选择不可识别；覆盖审计已关闭。"
              : null
    : null;

  useEffect(() => {
    if (loading || loadError || selectionIssue) {
      setCalculating(false);
      setReport(null);
      setReportDigestVerified(false);
      setReportError(selectionIssue);
      return;
    }
    let active = true;
    setCalculating(true);
    setReport(null);
    setReportDigestVerified(false);
    setReportError(null);
    void buildEvidenceCoverageReport({
      provenance: selectedRevision?.facts.fieldProvenance ?? [],
      citations,
      sourceRights
    }).then(async (nextReport) => {
      if (!active) return;
      const integrityIssue = safeCoverageReportIntegrityIssue(nextReport, citations, sourceRights);
      if (integrityIssue) throw new Error(integrityIssue);
      if (!await verifyEvidenceCoverageReportDigest(nextReport)) {
        throw new Error("覆盖报告 digest 与规范化报告正文不一致。");
      }
      if (active) {
        setReportDigestVerified(true);
        setReport(nextReport);
      }
    }).catch((reason: unknown) => {
      if (active) setReportError(errorMessage(reason, "依据覆盖报告生成失败。"));
    }).finally(() => {
      if (active) setCalculating(false);
    });
    return () => { active = false; };
  }, [loading, loadError, selectionIssue, selectedCaseId, selectedRevision?.id, citations, reportVersion, sourceRights]);

  const reportIntegrityError = useMemo(
    () => report ? safeCoverageReportIntegrityIssue(report, citations, sourceRights) : null,
    [report, citations, sourceRights]
  );
  const displayedReport = reportDigestVerified && !reportIntegrityError ? report : null;
  const visibleRows = useMemo(() => displayedReport?.rows.filter((row) => (
    (!onlyGaps || row.gaps.length > 0)
    && (selectedGap === "all" || row.gaps.includes(selectedGap))
  )) ?? [], [displayedReport, onlyGaps, selectedGap]);
  const renderedRows = useMemo(
    () => visibleRows.slice(0, visibleRowLimit),
    [visibleRowLimit, visibleRows]
  );
  const renderedUnregistered = useMemo(
    () => displayedReport?.unregistered.slice(0, visibleUnregisteredLimit) ?? [],
    [displayedReport, visibleUnregisteredLimit]
  );
  const gapCounts = useMemo(() => {
    const counts = new Map<CoverageGap, number>();
    for (const row of displayedReport?.rows ?? []) {
      for (const gap of row.gaps) counts.set(gap, (counts.get(gap) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => (
      right[1] - left[1] || left[0].localeCompare(right[0], "zh-CN")
    ));
  }, [displayedReport]);
  const gapOccurrenceCount = gapCounts.reduce((total, [, count]) => total + count, 0);
  const subjectsWithGapsCount = displayedReport?.rows.filter((row) => row.gaps.length > 0).length ?? 0;
  const unregisteredCount = displayedReport?.unregistered.length ?? 0;
  const totalAuditIssueCount = gapOccurrenceCount + unregisteredCount;
  const maxGapCount = gapCounts[0]?.[1] ?? 0;
  const selectedGapLabel = selectedGap === "all" ? null : gapLabels[selectedGap];
  const selectedGapCount = selectedGap === "all"
    ? null
    : gapCounts.find(([gap]) => gap === selectedGap)?.[1] ?? 0;
  const error = loadError ?? selectionIssue ?? reportError ?? reportIntegrityError;
  const busy = loading || calculating;
  const auditIssueLabel = gapOccurrenceCount && unregisteredCount
    ? `${gapOccurrenceCount} 项缺口 / ${subjectsWithGapsCount} 个主题 · ${unregisteredCount} 条注册表外`
    : gapOccurrenceCount
      ? `${gapOccurrenceCount} 项缺口 / ${subjectsWithGapsCount} 个主题`
      : unregisteredCount
        ? `${unregisteredCount} 条注册表外 provenance`
        : "四项工程缺口 0";

  const chooseCase = (caseId: string) => {
    setCalculating(true);
    setReport(null);
    setReportDigestVerified(false);
    setReportError(null);
    setSelectedGap("all");
    setVisibleRowLimit(INITIAL_VISIBLE_REPORT_ROWS);
    setVisibleUnregisteredLimit(INITIAL_VISIBLE_UNREGISTERED);
    setSelectedCaseId(caseId);
    const bundle = bundles.find((item) => item.caseRecord.id === caseId);
    setSelectedRevisionId(bundle ? latestRevision(bundle)?.id ?? "" : "");
  };

  const chooseRevision = (revisionId: string) => {
    setCalculating(true);
    setReport(null);
    setReportDigestVerified(false);
    setReportError(null);
    setSelectedGap("all");
    setVisibleRowLimit(INITIAL_VISIBLE_REPORT_ROWS);
    setVisibleUnregisteredLimit(INITIAL_VISIBLE_UNREGISTERED);
    setSelectedRevisionId(revisionId);
  };

  const retrySources = () => {
    setLoading(true);
    setCalculating(false);
    setSourceStates(createLoadingSourceStates());
    setLoadError(null);
    setReportError(null);
    setReport(null);
    setReportDigestVerified(false);
    setVisibleRowLimit(INITIAL_VISIBLE_REPORT_ROWS);
    setVisibleUnregisteredLimit(INITIAL_VISIBLE_UNREGISTERED);
    setLoadVersion((current) => current + 1);
  };

  const retryReport = () => {
    setCalculating(true);
    setReportError(null);
    setReport(null);
    setReportDigestVerified(false);
    setVisibleRowLimit(INITIAL_VISIBLE_REPORT_ROWS);
    setVisibleUnregisteredLimit(INITIAL_VISIBLE_UNREGISTERED);
    setReportVersion((current) => current + 1);
  };

  return (
    <section
      className="coverage-report"
      aria-labelledby={reportTitleId}
      aria-describedby={honestyNoteId}
      aria-busy={busy}
      data-state={loading ? "loading" : calculating ? "calculating" : error ? "error" : displayedReport ? "bound" : "empty"}
      data-audit-state={error ? "error" : busy ? "pending" : totalAuditIssueCount ? "issues" : "no-recorded-gaps"}
      data-case-id={selectedCaseId || "none"}
      data-revision-id={selectedRevision?.id ?? "none"}
      data-report-digest={displayedReport?.digest ?? "null"}
      data-report-digest-verified={reportDigestVerified}
      data-gap-filter={selectedGap}
      data-release-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-evaluative-score-present="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-mutation-mode="read-only-no-mutation"
      data-mutation-epoch-bypassed="false"
      data-record-write-performed="false"
    >
      <div className="audit-intro">
        <div><p className="eyebrow">Engineering evidence coverage</p><h2 id={reportTitleId}>工程依据覆盖审计</h2><p>以当前冻结的四柱事实主题注册表作为分母。结构化引用、双人核验和来源权利门禁分别计算；这些是工程证据状态，不证明术数内容正确，也不构成发布授权。</p></div>
        <StatusPill tone={busy ? "info" : error ? "cinnabar" : displayedReport && totalAuditIssueCount === 0 ? "neutral" : "warning"}>
          {busy ? "正在复算" : error ? "审计不可用" : displayedReport ? auditIssueLabel : "等待报告"}
        </StatusPill>
      </div>

      <div className="coverage-controls">
        <div className="coverage-controls__intro"><p className="eyebrow">Audit scope</p><strong>选择计算范围</strong><small>切换后会丢弃旧报告并重新生成摘要。</small></div>
        <label className="field"><span>案例</span><select aria-label="覆盖审计案例" value={selectedCaseId} disabled={loading || calculating || Boolean(loadError)} onChange={(event) => chooseCase(event.target.value)}>
          {loadError ? <option value="">案例来源不可用</option> : !cases.length ? <option value="">尚无案例（显示注册表缺口）</option> : null}
          {cases.map((item) => <option key={item.id} value={item.id}>{safeCoverageText(item.alias, "未命名案例", 160)} · {shortCoverageBinding(item.id).slice(0, 8)}</option>)}
        </select></label>
        <label className="field"><span>修订</span><select aria-label="覆盖审计修订" value={selectedRevision?.id ?? ""} onChange={(event) => chooseRevision(event.target.value)} disabled={!selectedBundle || !selectedBundle.revisions.length || loading || calculating || Boolean(loadError)}>
          {!selectedBundle ? <option value="">不适用</option> : !selectedBundle.revisions.length ? <option value="">该案例没有修订</option> : selectedBundle.revisions.map((revision) => <option key={revision.id} value={revision.id}>第 {revision.revisionNumber} 版 · {shortCoverageBinding(revision.id).slice(0, 8)}{revision.id === selectedBundle.caseRecord.latestRevisionId ? " · 最新" : ""}</option>)}
        </select></label>
        <label className="coverage-gap-toggle" data-selected={onlyGaps} data-disabled={!displayedReport}><input type="checkbox" checked={onlyGaps} disabled={!displayedReport} onChange={(event) => { setOnlyGaps(event.target.checked); setVisibleRowLimit(INITIAL_VISIBLE_REPORT_ROWS); }} /><span>只看缺口</span></label>
      </div>

      <div className="coverage-source-status" role="group" aria-label="覆盖审计输入状态" aria-live="polite">
        <div data-state={sourceStates.cases.state}><FileSearch aria-hidden="true" /><span><strong>案例与修订</strong><small>{sourceStates.cases.detail}</small></span></div>
        <div data-state={sourceStates.citations.state}><Link2 aria-hidden="true" /><span><strong>结构化引用</strong><small>{sourceStates.citations.detail}</small></span></div>
        <div data-state={sourceStates.rights.state}><PackageCheck aria-hidden="true" /><span><strong>来源权利</strong><small>{sourceStates.rights.detail}</small></span></div>
      </div>

      <section className="coverage-binding-ledger" data-state={error ? "error" : busy ? "loading" : displayedReport ? "bound" : "empty"} aria-labelledby={bindingTitleId}>
        <header>
          <div><p className="eyebrow">Audit binding</p><h3 id={bindingTitleId}>审计绑定账本</h3></div>
          <StatusPill tone={error ? "cinnabar" : busy ? "info" : "neutral"}>{error ? "绑定不可用" : busy ? "正在重建" : displayedReport ? "报告结构与 digest 已核对" : "等待报告"}</StatusPill>
        </header>
        <dl>
          <div><dt>Case</dt><dd>{selectedCase ? <><strong>{safeCoverageText(selectedCase.alias, "未命名案例", 160)}</strong><code title={safeVisibleText(selectedCase.id, "不可显示", 256)}>{shortCoverageBinding(selectedCase.id)}</code></> : "无案例，使用注册表基线"}</dd></div>
          <div><dt>Revision</dt><dd>{selectedRevision ? <><strong>第 {selectedRevision.revisionNumber} 版</strong><code title={safeVisibleText(selectedRevision.id, "不可显示", 256)}>{shortCoverageBinding(selectedRevision.id)}</code></> : selectedCase ? "无可绑定 Revision" : "不适用"}</dd></div>
          <div><dt>Bundle 完整性</dt><dd>{selectedBundle ? <><strong>{selectedBundle.revisions.length} 个 Revision · 序号唯一</strong><code title={safeVisibleText(selectedBundle.caseRecord.latestRevisionId, "不可显示", 256)}>latest {shortCoverageBinding(selectedBundle.caseRecord.latestRevisionId)}</code></> : selectedCase ? "Bundle 未绑定" : "不适用"}</dd></div>
          <div><dt>provenance 输入</dt><dd>{!loading && !loadError ? `${selectedRevision?.facts.fieldProvenance.length ?? 0} 条` : "未绑定"}</dd></div>
          <div><dt>注册表外 provenance</dt><dd>{displayedReport ? `${displayedReport.unregistered.length} 条` : "等待报告"}</dd></div>
          <div><dt>全局引用索引</dt><dd>{!loading && !loadError ? `${citations.length} 条` : "未绑定"}</dd></div>
          <div><dt>全局权利索引</dt><dd>{!loading && !loadError ? `${sourceRights.length} 条` : "未绑定"}</dd></div>
          <div><dt>主题注册表</dt><dd>{displayedReport ? <><strong>{displayedReport.rows.length} 个必需主题</strong><code>{safeVisibleText(displayedReport.registryVersion, "注册表版本不可显示", 160)}</code></> : "等待报告"}</dd></div>
          <div><dt>报告范围</dt><dd><code>{safeVisibleText(displayedReport?.scope, "required_v1_subjects", 160)}</code></dd></div>
          <div><dt>报告 digest</dt><dd>{displayedReport ? <code title={safeVisibleText(displayedReport.digest, "摘要不可显示", 160)}>{shortCoverageBinding(displayedReport.digest)}</code> : "null"}</dd></div>
          <div><dt>摘要复算</dt><dd className="coverage-digest-proof" data-verified={reportDigestVerified}>{reportDigestVerified ? <><strong>SHA-256 已独立复算</strong><small>规范化报告字节一致</small></> : "尚未验证"}</dd></div>
        </dl>
        <p>Case 与 Revision 只决定 provenance 输入；Citation 和 Rights 使用当前全局索引。“只看缺口”仅过滤主题明细，不改变分母、指标、注册表外 provenance 清单或 digest。</p>
      </section>

      {displayedReport ? <div className="audit-metrics coverage-metrics" role="group" aria-label="依据覆盖率">
        <div data-metric="provenance"><FileSearch aria-hidden="true" /><strong>{percent(displayedReport.metrics.provenanceCompleteness.rate)}</strong><span>provenance 完整 · {displayedReport.metrics.provenanceCompleteness.numerator}/{displayedReport.metrics.provenanceCompleteness.denominator}</span>{displayedReport.metrics.provenanceCompleteness.rate !== null ? <progress max={1} value={displayedReport.metrics.provenanceCompleteness.rate} aria-label={`provenance 完整率 ${percent(displayedReport.metrics.provenanceCompleteness.rate)}`} /> : null}</div>
        <div data-metric="structured"><Link2 aria-hidden="true" /><strong>{percent(displayedReport.metrics.structuredLink.rate)}</strong><span>结构化链接 · {displayedReport.metrics.structuredLink.numerator}/{displayedReport.metrics.structuredLink.denominator}</span>{displayedReport.metrics.structuredLink.rate !== null ? <progress max={1} value={displayedReport.metrics.structuredLink.rate} aria-label={`结构化链接率 ${percent(displayedReport.metrics.structuredLink.rate)}`} /> : null}</div>
        <div data-metric="reviewed"><BadgeCheck aria-hidden="true" /><strong>{percent(displayedReport.metrics.doubleReviewed.rate)}</strong><span>双人结构核验 · {displayedReport.metrics.doubleReviewed.numerator}/{displayedReport.metrics.doubleReviewed.denominator}</span>{displayedReport.metrics.doubleReviewed.rate !== null ? <progress max={1} value={displayedReport.metrics.doubleReviewed.rate} aria-label={`双人结构核验率 ${percent(displayedReport.metrics.doubleReviewed.rate)}`} /> : null}</div>
        <div data-metric="rights"><PackageCheck aria-hidden="true" /><strong>{percent(displayedReport.metrics.redistributableSource.rate)}</strong><span>工程权利门禁来源 · {displayedReport.metrics.redistributableSource.numerator}/{displayedReport.metrics.redistributableSource.denominator}</span>{displayedReport.metrics.redistributableSource.rate !== null ? <progress max={1} value={displayedReport.metrics.redistributableSource.rate} aria-label={`工程权利门禁来源覆盖率 ${percent(displayedReport.metrics.redistributableSource.rate)}，非内容评分`} /> : null}</div>
        <p className="coverage-metrics-caption"><b>Fixed-denominator audit</b><span>百分比只表示冻结主题分母下的工程输入覆盖，不是内容正确率、专业评分或发布许可。</span></p>
      </div> : null}

      {displayedReport ? <dl className="coverage-count-ledger" aria-label="覆盖审计计数口径">
        <div><dt>冻结分母</dt><dd><strong>{displayedReport.rows.length}</strong><span>个必需主题</span></dd></div>
        <div data-count-state={subjectsWithGapsCount ? "issues" : "clear"}><dt>涉及缺口</dt><dd><strong>{subjectsWithGapsCount}</strong><span>个主题</span></dd></div>
        <div data-count-state={gapOccurrenceCount ? "issues" : "clear"}><dt>缺口总量</dt><dd><strong>{gapOccurrenceCount}</strong><span>项出现次数</span></dd></div>
        <div data-count-state={unregisteredCount ? "outside" : "clear"}><dt>分母之外</dt><dd><strong>{unregisteredCount}</strong><span>条注册表外 provenance</span></dd></div>
      </dl> : null}

      <div id={honestyNoteId} className="coverage-honesty-note">
        <CircleAlert aria-hidden="true" />
        <div>
          <p>“用户候选”可以提高结构化链接率，但不会提高双人核验率；仅本机资料即使被引用，也不会提高权利门禁通过来源率。注册表外 provenance 不进入必需主题分母，必须单独处理。四项指标只描述工程证据状态，不是专家真值或公开发布许可；旧 <code>sourceRefs</code> 只保留为待迁移线索。</p>
          <small>legacy-v13 · Schema 13 · migration null · public release false</small>
        </div>
      </div>
      {loadError ? (
        <div className="coverage-unavailable" role="alert">
          <CircleAlert aria-hidden="true" />
          <div><strong>覆盖审计来源不可用</strong><p>{safeVisibleText(loadError, "覆盖审计来源不可用。", 900)}</p><small>上方状态卡保留各输入侧诊断；三侧必须同时成功，系统不会用空数组继续生成报告。</small></div>
          <button type="button" className="secondary-action" onClick={retrySources}>重新读取审计来源</button>
        </div>
      ) : null}
      {!loadError && reportError ? (
        <div className="coverage-unavailable" role="alert">
          <CircleAlert aria-hidden="true" />
          <div><strong>覆盖报告计算未完成</strong><p>{safeVisibleText(reportError, "覆盖报告计算未完成。", 900)}</p><small>当前来源仍保留；旧报告已经撤下，不显示零指标或旧摘要。</small></div>
          <button type="button" className="secondary-action" onClick={retryReport}>重新计算覆盖报告</button>
        </div>
      ) : null}
      {!loadError && !reportError && reportIntegrityError ? (
        <div className="coverage-unavailable" role="alert">
          <CircleAlert aria-hidden="true" />
          <div><strong>覆盖报告完整性校验失败</strong><p>{safeVisibleText(reportIntegrityError, "覆盖报告完整性校验失败。", 900)}</p><small>不可信报告已经撤下；当前不显示百分比、缺口数量或主题明细。</small></div>
        </div>
      ) : null}
      {busy ? <div className="coverage-loading" role="status"><span aria-hidden="true" /><div><strong>正在复算依据主题…</strong><p>{loading ? "正在读取案例、引用和来源权利记录。" : "正在重建四项独立指标与逐主题缺口。"}</p></div></div> : null}

      {displayedReport ? <>
        <div className="coverage-summary-line"><span role="status" aria-live="polite">已渲染 {renderedRows.length} / 匹配 {visibleRows.length} · 冻结分母 {displayedReport.rows.length} 个主题{selectedGapLabel ? ` · ${selectedGapLabel} ${selectedGapCount} 项` : ""}</span><span>provenance 状态：实验 {displayedReport.provenanceStatusCounts.experimental} · 裁定 {displayedReport.provenanceStatusCounts.adjudicated} · 争议 {displayedReport.provenanceStatusCounts.disputed} · 上游字段 gold_verified {displayedReport.provenanceStatusCounts.gold_verified} · 注册表外 {displayedReport.unregistered.length}</span><code title={safeVisibleText(displayedReport.digest, "摘要不可显示", 160)}>报告 {shortCoverageBinding(displayedReport.digest).slice(0, 12)}…</code></div>
        {displayedReport.unregistered.length ? (
          <section className="coverage-unregistered" role="alert" aria-labelledby={unregisteredTitleId}>
            <header>
              <div><p className="eyebrow">Outside registry</p><h3 id={unregisteredTitleId}>注册表外 provenance</h3><small>这些字段不属于当前必需主题注册表，因此不会进入四项指标分母，也不能被百分比掩盖。</small></div>
              <StatusPill tone="warning">{displayedReport.unregistered.length} 条待处理</StatusPill>
            </header>
            <ul>
              {renderedUnregistered.map((entry) => (
                <li key={JSON.stringify([entry.field, entry.algorithmId])}>
                  <span>字段</span><code>{safeVisibleText(entry.field, "字段不可显示", 240)}</code><span>算法</span><code>{safeVisibleText(entry.algorithmId, "算法不可显示", 240)}</code>
                </li>
              ))}
            </ul>
            {renderedUnregistered.length < displayedReport.unregistered.length ? (
              <div className="coverage-load-more" role="status">
                <span>已渲染 {renderedUnregistered.length} / {displayedReport.unregistered.length} 条注册表外记录</span>
                <button type="button" onClick={() => setVisibleUnregisteredLimit((current) => current + VISIBLE_UNREGISTERED_STEP)}>再显示 {Math.min(VISIBLE_UNREGISTERED_STEP, displayedReport.unregistered.length - renderedUnregistered.length)} 条</button>
              </div>
            ) : null}
          </section>
        ) : null}
        <div className="coverage-gap-index" role="region" aria-labelledby={gapIndexTitleId}>
          <header>
            <div><p className="eyebrow">Gap index</p><h3 id={gapIndexTitleId}>缺口分布</h3><small>按出现次数排序和归一化，可点击钻取；不代表专业严重性或内容权重。</small></div>
            <div className="coverage-gap-index__actions">
              <StatusPill tone={totalAuditIssueCount ? "warning" : "neutral"}>{gapOccurrenceCount ? `${gapOccurrenceCount} 项缺口 · ${subjectsWithGapsCount} 个主题` : unregisteredCount ? `主题缺口 0 · 注册表外 ${unregisteredCount}` : "四项检查无缺口"}</StatusPill>
              {selectedGapLabel ? <button type="button" className="text-button" onClick={() => { setSelectedGap("all"); setVisibleRowLimit(INITIAL_VISIBLE_REPORT_ROWS); }}>清除“{selectedGapLabel}”筛选</button> : null}
            </div>
          </header>
          {gapCounts.length ? <ul>{gapCounts.map(([gap, count]) => <li key={gap} data-selected={selectedGap === gap}><button type="button" aria-pressed={selectedGap === gap} aria-label={`${gapLabels[gap]}，${count} 个主题`} onClick={() => { setSelectedGap((current) => current === gap ? "all" : gap); setVisibleRowLimit(INITIAL_VISIBLE_REPORT_ROWS); }}><span>{gapLabels[gap]}</span><strong>{count}</strong><i className="coverage-gap-frequency" aria-hidden="true"><i style={{ inlineSize: `${(count / maxGapCount) * 100}%` }} /></i></button></li>)}</ul> : <p>{displayedReport.rows.length} 个必需主题在当前四项工程审计维度下未报告缺口{unregisteredCount ? `；另有 ${unregisteredCount} 条注册表外 provenance，见上方独立清单` : ""}。这不表示内容正确或已获发布授权。</p>}
        </div>
        <div className="coverage-row-list">
          {renderedRows.map((row) => <article key={row.subject.subjectId} data-has-gaps={row.gaps.length > 0}>
            <header><div><p className="eyebrow">{row.subject.category === "calendar_fact" ? "Calendar fact" : "Rule derived"}</p><h3>{safeVisibleText(row.subject.label, "未命名主题", 180)}</h3><code>{safeVisibleText(row.subject.subjectId, "主题 ID 不可显示", 240)}</code></div><StatusPill tone={row.gaps.length ? "warning" : "neutral"}>{row.gaps.length ? `${row.gaps.length} 个缺口` : "四项工程输入已覆盖"}</StatusPill></header>
            <dl>
              <div><dt>字段</dt><dd>{row.subject.fieldPaths.map((fieldPath) => safeVisibleText(fieldPath, "字段不可显示", 240)).join("、")}</dd></div>
              <div><dt>算法</dt><dd>{safeVisibleText(row.provenance?.algorithmId, "未生成 provenance", 240)}</dd></div>
              <div><dt>引用</dt><dd>候选 {row.candidateCitationIds.length} · 核验 {row.verifiedCitationIds.length}</dd></div>
              <div><dt>权利门禁</dt><dd>{row.redistributableCitationIds.length} 条核验引用通过</dd></div>
            </dl>
            {row.gaps.length ? <ul className="coverage-gap-list">{row.gaps.map((gap) => <li key={gap}>{gapLabels[gap]}</li>)}</ul> : null}
            {row.candidateCitationIds.length || row.verifiedCitationIds.length ? <details className="coverage-citation-bindings">
              <summary>查看引用绑定 ID</summary>
              <div>
                <section><strong>候选引用 · {row.candidateCitationIds.length}</strong>{row.candidateCitationIds.length ? <ul>{row.candidateCitationIds.slice(0, VISIBLE_BINDING_ID_LIMIT).map((id) => <li key={id}><code title={safeVisibleText(id, "引用 ID 不可显示", 256)}>{shortCoverageBinding(id)}</code></li>)}{row.candidateCitationIds.length > VISIBLE_BINDING_ID_LIMIT ? <li className="coverage-binding-omission">另 {row.candidateCitationIds.length - VISIBLE_BINDING_ID_LIMIT} 条未渲染</li> : null}</ul> : <p>无</p>}</section>
                <section><strong>核验引用 · {row.verifiedCitationIds.length}</strong>{row.verifiedCitationIds.length ? <ul>{row.verifiedCitationIds.slice(0, VISIBLE_BINDING_ID_LIMIT).map((id) => <li key={id}><code title={safeVisibleText(id, "引用 ID 不可显示", 256)}>{shortCoverageBinding(id)}</code></li>)}{row.verifiedCitationIds.length > VISIBLE_BINDING_ID_LIMIT ? <li className="coverage-binding-omission">另 {row.verifiedCitationIds.length - VISIBLE_BINDING_ID_LIMIT} 条未渲染</li> : null}</ul> : <p>无</p>}</section>
                <section><strong>工程权利门禁引用 · {row.redistributableCitationIds.length}</strong>{row.redistributableCitationIds.length ? <ul>{row.redistributableCitationIds.slice(0, VISIBLE_BINDING_ID_LIMIT).map((id) => <li key={id}><code title={safeVisibleText(id, "引用 ID 不可显示", 256)}>{shortCoverageBinding(id)}</code></li>)}{row.redistributableCitationIds.length > VISIBLE_BINDING_ID_LIMIT ? <li className="coverage-binding-omission">另 {row.redistributableCitationIds.length - VISIBLE_BINDING_ID_LIMIT} 条未渲染</li> : null}</ul> : <p>无</p>}</section>
              </div>
            </details> : null}
            <AppLink className="secondary-action" href={knowledgeEvidenceSubjectHref(row.subject.subjectId)}><BookMarked aria-hidden="true" />查看或补充主题来源</AppLink>
          </article>)}
        </div>
        {renderedRows.length < visibleRows.length ? (
          <div className="coverage-load-more" role="status">
            <span>已渲染 {renderedRows.length} / {visibleRows.length} 个匹配主题，冻结分母与指标保持全量口径</span>
            <button type="button" onClick={() => setVisibleRowLimit((current) => current + VISIBLE_REPORT_ROW_STEP)}>再显示 {Math.min(VISIBLE_REPORT_ROW_STEP, visibleRows.length - renderedRows.length)} 个主题</button>
          </div>
        ) : null}
        {!visibleRows.length ? <div className="coverage-filter-empty"><FileSearch aria-hidden="true" /><p>{selectedGapLabel ? `当前报告没有“${selectedGapLabel}”对应主题；可清除缺口筛选查看其他条目。` : onlyGaps ? `当前四项工程筛选没有缺口条目。关闭“只看缺口”可浏览全部 ${displayedReport.rows.length} 个主题；这不表示内容正确。` : "当前报告没有可显示的主题。"}</p></div> : null}
      </> : null}
    </section>
  );
}
