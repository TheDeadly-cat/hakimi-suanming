import { AlertTriangle, BookLock, ExternalLink, FileKey2, RefreshCw, Search, Shield } from "lucide-react";
import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import {
  knowledgeDocumentRecordSchema,
  sourceRightsRecordSchema,
  type KnowledgeDocumentRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import { isRedistributableSourceRights } from "@hakimi/knowledge-core";
import { knowledgeRepository } from "@hakimi/storage";
import { buildKnowledgeSearch } from "../lib/knowledge-route";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import { StatusPill } from "./status-pill";
import "./source-rights-ledger.css";

type LedgerRow = {
  document: KnowledgeDocumentRecord;
  rights: SourceRightsRecord | null;
  integrity: "ok" | "missing" | "invalid_hash" | "hash_mismatch";
  originBinding: "ok" | "missing" | "mismatch";
  gateCriteria: readonly RightsGateCriterion[];
  gatePassed: boolean;
};

type RightsGateCriterion = Readonly<{
  key: string;
  label: string;
  passed: boolean;
}>;

type LedgerView = "all" | "private" | "cleared" | "closed" | "anomalous";

type LedgerLoadReceipt = Readonly<{
  attempt: number;
  completedAt: string;
  documentCount: number | null;
  rightsCount: number | null;
  sidesLoaded: boolean;
}>;

const ledgerViewOptions: ReadonlyArray<{ value: LedgerView; label: string }> = [
  { value: "all", label: "全部" },
  { value: "private", label: "仅本机" },
  { value: "cleared", label: "权利条件齐备" },
  { value: "closed", label: "门禁关闭" },
  { value: "anomalous", label: "正文异常" }
];

const rightsStatusLabels: Record<SourceRightsRecord["rights"]["status"], string> = {
  user_unverified: "用户提供 · 未核验",
  public_domain_verified: "公版已核验",
  licensed_verified: "许可已核验",
  project_original_verified: "项目原创已核验",
  blocked: "禁止分发"
};

const layerLabels = {
  unknown: "未知",
  public_domain_verified: "公版已核验",
  licensed_verified: "许可已核验",
  project_original_verified: "项目原创已核验",
  copyrighted: "受版权保护"
} as const;

const integrityLabels: Record<LedgerRow["integrity"], string> = {
  ok: "正文哈希已登记且一致",
  missing: "权利记录缺失",
  invalid_hash: "正文哈希未登记",
  hash_mismatch: "正文哈希失配"
};

const originBindingLabels: Record<LedgerRow["originBinding"], string> = {
  ok: "来源身份一致",
  missing: "权利记录缺失",
  mismatch: "正文与权利来源身份失配"
};

const CANONICAL_SHA256 = /^[a-f0-9]{64}$/;
const MAX_LEDGER_SOURCE_RECORDS = 10_000;
const INITIAL_VISIBLE_RECORDS = 48;
const VISIBLE_RECORD_STEP = 48;
const INITIAL_VISIBLE_ORPHANS = 24;
const VISIBLE_ORPHAN_STEP = 24;
const STRUCTURAL_ISSUE_PREVIEW_LIMIT = 24;

function previewStableKeys(values: readonly string[]): string {
  const shown = values
    .slice(0, STRUCTURAL_ISSUE_PREVIEW_LIMIT)
    .map((value) => safeVisibleText(value, "不可显示", 256));
  const omitted = values.length - shown.length;
  return shown.join(" · ") + (omitted > 0 ? " · …另 " + omitted + " 项" : "");
}

function previewRecordIndexes(values: readonly number[]): string {
  const shown = values.slice(0, STRUCTURAL_ISSUE_PREVIEW_LIMIT);
  const omitted = values.length - shown.length;
  return shown.join(" · ") + (omitted > 0 ? " · …另 " + omitted + " 项" : "");
}
const localReceiptTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});

function shortHash(value: unknown): string {
  if (typeof value !== "string") return "格式无效";
  const trimmed = value.trim();
  const normalized = safeVisibleText(trimmed, "", 512);
  if (!normalized || normalized !== trimmed) return "格式无效";
  if (normalized.length <= 20) return normalized;
  return `${normalized.slice(0, 10)}…${normalized.slice(-8)}`;
}

function message(reason: unknown, fallback: string): string {
  return safeVisibleErrorMessage(reason, fallback);
}

function parseKnowledgeDocuments(value: unknown): KnowledgeDocumentRecord[] {
  if (!Array.isArray(value)) throw new TypeError("本地正文目录返回了非列表数据");
  if (value.length > MAX_LEDGER_SOURCE_RECORDS) {
    throw new RangeError(`本地正文目录超过 ${MAX_LEDGER_SOURCE_RECORDS} 条账本读取上限`);
  }
  return value.map((candidate, index) => {
    const parsed = knowledgeDocumentRecordSchema.safeParse(candidate);
    if (!parsed.success) throw new TypeError(`本地正文目录第 ${index + 1} 条不符合当前契约`);
    return parsed.data;
  });
}

function parseSourceRightsRecords(value: unknown): SourceRightsRecord[] {
  if (!Array.isArray(value)) throw new TypeError("来源权利记录返回了非列表数据");
  if (value.length > MAX_LEDGER_SOURCE_RECORDS) {
    throw new RangeError(`来源权利记录超过 ${MAX_LEDGER_SOURCE_RECORDS} 条账本读取上限`);
  }
  return value.map((candidate, index) => {
    const parsed = sourceRightsRecordSchema.safeParse(candidate);
    if (!parsed.success) throw new TypeError(`来源权利记录第 ${index + 1} 条不符合当前契约`);
    return parsed.data;
  });
}

function formatLocalReceiptTime(value: string): string {
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? "时间无效" : localReceiptTimeFormatter.format(instant);
}

function hasStableKey(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return value === trimmed && trimmed.length > 0 && safeVisibleText(trimmed, "", 256) === trimmed;
}

function hasUsableContentHash(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return value === trimmed && CANONICAL_SHA256.test(trimmed);
}

function displayKnowledgeFileName(value: unknown): string {
  if (typeof value !== "string") return "未登记文件";
  const segments = value.split(/[\\/]/);
  const leafName = (segments[segments.length - 1] ?? "").normalize("NFC");
  return safeVisibleText(leafName, "未登记文件", 240);
}

function duplicateIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (!hasStableKey(value)) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function sourceOriginBinding(document: KnowledgeDocumentRecord, rights: SourceRightsRecord | null): LedgerRow["originBinding"] {
  if (!rights) return "missing";
  const documentIsBundled = document.recordType === "bundled_knowledge_document";
  const rightsAreBundled = rights.origin === "bundled";
  return documentIsBundled === rightsAreBundled ? "ok" : "mismatch";
}

function rowIsAnomalous(row: LedgerRow): boolean {
  return row.integrity !== "ok" || row.originBinding === "mismatch";
}

function rowMatchesView(row: LedgerRow, view: LedgerView): boolean {
  if (view === "private") {
    return row.rights?.rights.distributionPolicy === "local_private_only";
  }
  if (view === "cleared") return row.gatePassed;
  if (view === "closed") return !row.gatePassed;
  if (view === "anomalous") return rowIsAnomalous(row);
  return true;
}

function ledgerRowSearchText(row: LedgerRow): string {
  const { document, rights, integrity } = row;
  return [
    document.title,
    document.author,
    document.edition,
    displayKnowledgeFileName(document.fileName),
    document.id,
    integrityLabels[integrity],
    originBindingLabels[row.originBinding],
    rights ? rightsStatusLabels[rights.rights.status] : "",
    rights ? layerLabels[rights.rights.workStatus] : "",
    rights ? layerLabels[rights.rights.editionStatus] : "",
    rights?.source.publisher,
    rights?.source.publicationYear,
    rights?.source.sourceUrl
  ]
    .map((value) => value === null || value === undefined ? "" : String(value))
    .join("\n")
    .toLocaleLowerCase("zh-CN");
}

function rightsGateCriteria(document: KnowledgeDocumentRecord, rights: SourceRightsRecord, integrity: LedgerRow["integrity"]) {
  const workClear = rights.rights.workStatus === "public_domain_verified"
    || rights.rights.workStatus === "project_original_verified";
  const editionClear = rights.rights.editionStatus === "public_domain_verified"
    || rights.rights.editionStatus === "licensed_verified"
    || rights.rights.editionStatus === "project_original_verified";
  const bundledIdentityBound = document.recordType === "bundled_knowledge_document"
    && rights.origin === "bundled"
    && sourceOriginBinding(document, rights) === "ok";
  return [
    { key: "content_hash", label: "正文哈希已登记且一致", passed: integrity === "ok" },
    { key: "bundled_origin", label: "随包身份双向绑定", passed: bundledIdentityBound },
    { key: "work_layer", label: "作品层已核验", passed: workClear },
    { key: "edition_layer", label: "现代版本层已核验", passed: editionClear },
    { key: "double_review", label: "双人复核", passed: rights.review.status === "double_reviewed" },
    { key: "distribution", label: "可再分发策略", passed: rights.rights.distributionPolicy === "redistributable" },
    { key: "rights_status", label: "总权利状态可用", passed: rights.rights.status !== "user_unverified" && rights.rights.status !== "blocked" },
    { key: "canonical_gate", label: "核心权利判定", passed: isRedistributableSourceRights(rights) }
  ] as const;
}

function bindingIssueMessage(integrity: LedgerRow["integrity"], originBinding: LedgerRow["originBinding"]): string {
  const issues: string[] = [];
  if (integrity === "invalid_hash") issues.push("当前正文或台账绑定哈希为空，不能建立内容快照身份。");
  if (integrity === "hash_mismatch") issues.push("台账绑定哈希不属于当前正文快照。");
  if (originBinding === "mismatch") issues.push("正文登记类型与权利记录的来源身份不一致。");
  return issues.join(" ");
}

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : null;
  } catch {
    return null;
  }
}

export function SourceRightsLedger() {
  const ledgerTitleId = useId();
  const guardrailId = useId();
  const loadReceiptTitleId = useId();
  const structureTitleId = useId();
  const orphanTitleId = useId();
  const [documents, setDocuments] = useState<KnowledgeDocumentRecord[]>([]);
  const [rightsRecords, setRightsRecords] = useState<SourceRightsRecord[]>([]);
  const [documentState, setDocumentState] = useState<"loading" | "loaded" | "error">("loading");
  const [rightsState, setRightsState] = useState<"loading" | "loaded" | "error">("loading");
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [rightsError, setRightsError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [loadReceipt, setLoadReceipt] = useState<LedgerLoadReceipt | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<LedgerView>("all");
  const [visibleRecordLimit, setVisibleRecordLimit] = useState(INITIAL_VISIBLE_RECORDS);
  const [visibleOrphanLimit, setVisibleOrphanLimit] = useState(INITIAL_VISIBLE_ORPHANS);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;
    setDocumentState("loading");
    setRightsState("loading");
    setDocumentError(null);
    setRightsError(null);
    setLoadReceipt(null);
    setDocuments([]);
    setRightsRecords([]);
    setVisibleRecordLimit(INITIAL_VISIBLE_RECORDS);
    setVisibleOrphanLimit(INITIAL_VISIBLE_ORPHANS);

    const documentsRequest = knowledgeRepository.listDocuments()
      .then((value) => ({ ok: true as const, value: parseKnowledgeDocuments(value) }))
      .catch((reason: unknown) => ({ ok: false as const, reason }));
    const rightsRequest = knowledgeRepository.listSourceRights()
      .then((value) => ({ ok: true as const, value: parseSourceRightsRecords(value) }))
      .catch((reason: unknown) => ({ ok: false as const, reason }));

    void Promise.all([documentsRequest, rightsRequest]).then(([documentsResult, rightsResult]) => {
      if (!active) return;

      setLoadReceipt({
        attempt: reloadToken + 1,
        completedAt: new Date().toISOString(),
        documentCount: documentsResult.ok ? documentsResult.value.length : null,
        rightsCount: rightsResult.ok ? rightsResult.value.length : null,
        sidesLoaded: documentsResult.ok && rightsResult.ok
      });

      if (documentsResult.ok) {
        setDocuments(documentsResult.value);
        setDocumentState("loaded");
      } else {
        setDocumentError(message(documentsResult.reason, "无法读取本地知识正文目录。"));
        setDocumentState("error");
      }

      if (rightsResult.ok) {
        setRightsRecords(rightsResult.value);
        setRightsState("loaded");
      } else {
        setRightsError(message(rightsResult.reason, "无法读取来源权利记录。"));
        setRightsState("error");
      }
    });
    return () => { active = false; };
  }, [reloadToken]);

  const {
    rows,
    orphanedRights,
    privateCount,
    rightsClearedCount,
    anomalyCount,
    duplicateDocumentIds,
    duplicateRightsDocumentIds,
    invalidDocumentIdIndexes,
    invalidRightsDocumentIdIndexes
  } = useMemo(() => {
    const nextDuplicateDocumentIds = duplicateIds(documents.map((document) => document.id));
    const nextDuplicateRightsDocumentIds = duplicateIds(rightsRecords.map((record) => record.documentId));
    const nextInvalidDocumentIdIndexes = documents.flatMap((document, index) => hasStableKey(document.id) ? [] : [index + 1]);
    const nextInvalidRightsDocumentIdIndexes = rightsRecords.flatMap((record, index) => hasStableKey(record.documentId) ? [] : [index + 1]);
    if (nextDuplicateDocumentIds.length || nextDuplicateRightsDocumentIds.length || nextInvalidDocumentIdIndexes.length || nextInvalidRightsDocumentIdIndexes.length) {
      return {
        rows: [],
        orphanedRights: [],
        privateCount: 0,
        rightsClearedCount: 0,
        anomalyCount: 0,
        duplicateDocumentIds: nextDuplicateDocumentIds,
        duplicateRightsDocumentIds: nextDuplicateRightsDocumentIds,
        invalidDocumentIdIndexes: nextInvalidDocumentIdIndexes,
        invalidRightsDocumentIdIndexes: nextInvalidRightsDocumentIdIndexes
      };
    }
    const byDocument = new Map(rightsRecords.map((record) => [record.documentId, record]));
    const documentIds = new Set(documents.map((document) => document.id));
    const nextRows: LedgerRow[] = documents.map((document) => {
      const rights = byDocument.get(document.id) ?? null;
      const integrity = !rights
        ? "missing"
        : !hasUsableContentHash(document.contentHash) || !hasUsableContentHash(rights.documentContentHash)
          ? "invalid_hash"
          : rights.documentContentHash === document.contentHash
            ? "ok"
            : "hash_mismatch";
      const originBinding = sourceOriginBinding(document, rights);
      const gateCriteria = rights ? rightsGateCriteria(document, rights, integrity) : [];
      return {
        document,
        rights,
        integrity,
        originBinding,
        gateCriteria,
        gatePassed: gateCriteria.length > 0 && gateCriteria.every((criterion) => criterion.passed)
      };
    });
    const nextOrphanedRights = rightsRecords.filter((record) => !documentIds.has(record.documentId));
    return {
      rows: nextRows,
      orphanedRights: nextOrphanedRights,
      privateCount: nextRows.filter((row) => row.rights?.rights.distributionPolicy === "local_private_only").length,
      rightsClearedCount: nextRows.filter((row) => row.gatePassed).length,
      anomalyCount: nextRows.filter(rowIsAnomalous).length + nextOrphanedRights.length,
      duplicateDocumentIds: nextDuplicateDocumentIds,
      duplicateRightsDocumentIds: nextDuplicateRightsDocumentIds,
      invalidDocumentIdIndexes: nextInvalidDocumentIdIndexes,
      invalidRightsDocumentIdIndexes: nextInvalidRightsDocumentIdIndexes
    };
  }, [documents, rightsRecords]);
  const loading = documentState === "loading" || rightsState === "loading";
  const ready = documentState === "loaded" && rightsState === "loaded";
  const structuralIssueCount = duplicateDocumentIds.length
    + duplicateRightsDocumentIds.length
    + invalidDocumentIdIndexes.length
    + invalidRightsDocumentIdIndexes.length;
  const joinSafe = ready && structuralIssueCount === 0;
  const totalAnomalyCount = structuralIssueCount + anomalyCount;
  const ledgerState = loading ? "loading" : !ready ? "error" : totalAnomalyCount ? "anomalous" : rows.length ? "bound" : "empty";
  const metricsAvailable = joinSafe;
  const reloadLedger = () => {
    if (loading) return;
    setReloadToken((current) => current + 1);
  };
  const documentStatus = documentState === "loading"
    ? "正在读取正文目录"
    : documentState === "loaded"
      ? `${documents.length} 份正文已读取`
      : documentError ?? "正文目录不可用";
  const rightsStatus = rightsState === "loading"
    ? "正在读取权利记录"
    : rightsState === "loaded"
      ? `${rightsRecords.length} 条权利记录已读取`
      : rightsError ?? "权利记录不可用";
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("zh-CN");
  const indexedRows = useMemo(
    () => rows.map((row) => ({ row, searchText: ledgerRowSearchText(row) })),
    [rows]
  );
  const visibleRows = useMemo(() => {
    if (!joinSafe) return [];
    return indexedRows
      .filter(({ row, searchText }) => rowMatchesView(row, view) && (!normalizedQuery || searchText.includes(normalizedQuery)))
      .map(({ row }) => row);
  }, [indexedRows, joinSafe, normalizedQuery, view]);
  const renderedRows = useMemo(
    () => visibleRows.slice(0, visibleRecordLimit),
    [visibleRecordLimit, visibleRows]
  );
  const renderedOrphanedRights = useMemo(
    () => orphanedRights.slice(0, visibleOrphanLimit),
    [orphanedRights, visibleOrphanLimit]
  );
  const filtering = query !== deferredQuery;
  const filterActive = view !== "all" || query.trim().length > 0;
  const viewCounts: Record<LedgerView, number> = {
    all: rows.length,
    private: privateCount,
    cleared: rightsClearedCount,
    closed: rows.length - rightsClearedCount,
    anomalous: rows.filter(rowIsAnomalous).length
  };
  const clearLedgerFilters = () => {
    setQuery("");
    setView("all");
    setVisibleRecordLimit(INITIAL_VISIBLE_RECORDS);
  };

  return (
    <section
      className="rights-ledger"
      aria-labelledby={ledgerTitleId}
      aria-describedby={guardrailId}
      aria-busy={loading}
      data-state={ledgerState}
      data-release-family="legacy-v13"
      data-release-identity="legacy-v13"
      data-schema-family="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-record-write-performed="false"
      data-record-write-state="not_started"
      data-engineering-evidence-only="true"
      data-current-build-evidence-verified="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-expert-truth-established="false"
      data-formal-truth-established="false"
      data-scientific-validity-claimed="false"
      data-mutation-mode="read-only-no-mutation"
      data-mutation-epoch-bypassed="false"
      data-good-bad-score="null"
      data-result="null"
      data-rendered-records={renderedRows.length}
      data-rendered-orphans={renderedOrphanedRights.length}
    >
      <div className="audit-intro">
        <div><p className="eyebrow">Source rights</p><h2 id={ledgerTitleId}>来源权利台账</h2><p>逐份绑定正文哈希，分别检查古代作品与现代版本/数字化文本。这里不评价命理结论是否正确，也不授予项目发布权限。</p></div>
        <StatusPill tone={loading ? "info" : !ready || totalAnomalyCount ? "cinnabar" : rows.length ? "info" : "warning"}>
          {loading ? "正在核对" : !ready ? "台账不可用" : totalAnomalyCount ? `${totalAnomalyCount} 项异常` : rows.length ? "工程联结正常 · 非发布授权" : "尚无资料"}
        </StatusPill>
      </div>

      <ol className="rights-audit-chain" aria-label="来源权利审计层级">
        <li><span>01</span><div><strong>正文完整性</strong><small>当前正文哈希必须与权利记录绑定值一致</small></div></li>
        <li><span>02</span><div><strong>作品权利</strong><small>古代作品、公版或受版权保护状态单独判断</small></div></li>
        <li><span>03</span><div><strong>现代版本权利</strong><small>校点、排印和数字化文本不会继承作品层结论</small></div></li>
        <li><span>04</span><div><strong>分发与复核门禁</strong><small>还须随包来源、双人复核和可再分发策略；通过仍不等于发布授权</small></div></li>
      </ol>

      <div className="audit-metrics" role="group" aria-label="权利台账摘要" data-available={metricsAvailable}>
        <div><FileKey2 aria-hidden="true" /><strong>{metricsAvailable ? rows.length : "—"}</strong><span>已登记资料</span></div>
        <div><BookLock aria-hidden="true" /><strong>{metricsAvailable ? privateCount : "—"}</strong><span>仅本机</span></div>
        <div data-metric="redistribution-gate"><Shield aria-hidden="true" /><strong>{metricsAvailable ? rightsClearedCount : "—"}</strong><span>工程再分发门禁通过 · 非发布授权</span></div>
        <div><AlertTriangle aria-hidden="true" /><strong>{metricsAvailable ? totalAnomalyCount : "—"}</strong><span>异常 / 孤儿</span></div>
      </div>

      <div id={guardrailId} className="rights-guardrail">
        <Shield aria-hidden="true" />
        <div>
          <p><strong>默认拒绝公开分发。</strong> 用户导入只能保持“未核验、仅本机”；作品公版也不会自动证明某个现代校点或数字化版本可再分发。工程再分发门禁通过只是一组本机规则结果，仍不代表项目已经获得公开发布授权。</p>
          <small>legacy-v13 · Schema 13 · migration null · public release false</small>
        </div>
      </div>
      <div className="rights-source-status" role="group" aria-label="台账输入状态" aria-live="polite" aria-busy={loading}>
        <div data-state={documentState}>
          <FileKey2 aria-hidden="true" />
          <span><strong>本地正文目录</strong><small>{documentStatus}</small></span>
        </div>
        <div data-state={rightsState}>
          <Shield aria-hidden="true" />
          <span><strong>来源权利记录</strong><small>{rightsStatus}</small></span>
        </div>
      </div>
      {loadReceipt ? (
        <section
          className="rights-ledger-load-receipt"
          aria-labelledby={loadReceiptTitleId}
          data-join-state={joinSafe ? "bound" : "closed"}
        >
          <header>
            <div><p className="eyebrow">Read cycle receipt</p><h3 id={loadReceiptTitleId}>台账读取收据</h3></div>
            <StatusPill tone={joinSafe ? "info" : "cinnabar"}>{joinSafe ? "当前可联结" : "联结失败关闭"}</StatusPill>
          </header>
          <dl>
            <div><dt>读取周期</dt><dd>#{loadReceipt.attempt}</dd></div>
            <div><dt>正文目录</dt><dd>{loadReceipt.documentCount === null ? "读取失败" : `${loadReceipt.documentCount} 份`}</dd></div>
            <div><dt>权利记录</dt><dd>{loadReceipt.rightsCount === null ? "读取失败" : `${loadReceipt.rightsCount} 条`}</dd></div>
            <div><dt>双侧状态</dt><dd>{loadReceipt.sidesLoaded ? "同周期均已返回" : "至少一侧未返回"}</dd></div>
            <div><dt>完成时间</dt><dd><time dateTime={loadReceipt.completedAt}>{formatLocalReceiptTime(loadReceipt.completedAt)}</time> · 本机时钟</dd></div>
          </dl>
          <footer>
            <p>正文目录与权利记录属于同一刷新周期，但由两个独立仓储调用返回，不冒充单一事务快照；并发变化会在联结检查中失败关闭。</p>
            <button type="button" disabled={loading} aria-busy={loading} onClick={reloadLedger}><RefreshCw aria-hidden="true" />重新读取两侧</button>
          </footer>
        </section>
      ) : null}
      {!loading && !ready ? (
        <div className="rights-ledger-failure" role="alert">
          <div><strong>台账联结保持关闭</strong><p>正文目录与权利记录未能同时核对，当前不展示联结行、异常数量或可分发结论。</p></div>
          <button type="button" onClick={reloadLedger}>
            <RefreshCw aria-hidden="true" />
            重新核对两侧来源
          </button>
        </div>
      ) : null}
      {loading ? <div className="rights-ledger-loading" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden="true" /><div><strong>正在核对来源台账…</strong><p>并行读取本地正文与权利记录，然后逐份比对内容哈希。</p></div></div> : null}

      {ready && structuralIssueCount ? (
        <section className="rights-ledger-structure" role="alert" aria-labelledby={structureTitleId}>
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong id={structureTitleId}>检测到重复或无效稳定键，台账联结已关闭</strong>
            <p>重复记录不能择一覆盖；当前不展示逐份联结、摘要数量或任何可分发结论。</p>
            <ul>
              {duplicateDocumentIds.length ? <li>重复 documentId（{duplicateDocumentIds.length}）：<code>{previewStableKeys(duplicateDocumentIds)}</code></li> : null}
              {duplicateRightsDocumentIds.length ? <li>重复权利记录 documentId（{duplicateRightsDocumentIds.length}）：<code>{previewStableKeys(duplicateRightsDocumentIds)}</code></li> : null}
              {invalidDocumentIdIndexes.length ? <li>正文目录空 documentId（{invalidDocumentIdIndexes.length}）：第 <code>{previewRecordIndexes(invalidDocumentIdIndexes)}</code> 条</li> : null}
              {invalidRightsDocumentIdIndexes.length ? <li>权利记录空 documentId（{invalidRightsDocumentIdIndexes.length}）：第 <code>{previewRecordIndexes(invalidRightsDocumentIdIndexes)}</code> 条</li> : null}
            </ul>
            <button type="button" className="rights-ledger-structure__action" onClick={reloadLedger}><RefreshCw aria-hidden="true" />重新读取并核对稳定键</button>
          </div>
        </section>
      ) : null}

      {joinSafe && !rows.length ? <div className="knowledge-empty"><BookLock aria-hidden="true" /><p>还没有本地资料。导入第一份 Markdown / TXT 后，系统会原子创建“用户提供 · 未核验 · 仅本机”权利记录。</p></div> : null}

      {joinSafe && orphanedRights.length ? (
        <section className="rights-orphan-records" aria-labelledby={orphanTitleId} role="alert">
          <header><div><p className="eyebrow">Orphaned rights records</p><h3 id={orphanTitleId}>发现 {orphanedRights.length} 条孤立权利记录</h3></div><StatusPill tone="cinnabar">分发关闭</StatusPill></header>
          <p>这些记录没有对应的本地正文，不能用于证明任何资料的权利或完整性。</p>
          <details className="rights-orphan-details">
            <summary>
              <span>查看孤立记录明细</span>
              <small>已装载 {renderedOrphanedRights.length} / {orphanedRights.length} 条</small>
            </summary>
            <ul>
              {renderedOrphanedRights.map((record) => (
                <li key={record.documentId}><code>{safeVisibleText(record.documentId, "不可显示", 256)}</code><span title={safeVisibleText(record.documentContentHash, "摘要不可显示", 160)}>{shortHash(record.documentContentHash)}</span></li>
              ))}
            </ul>
            {renderedOrphanedRights.length < orphanedRights.length ? (
              <div className="rights-orphan-load-more">
                <span>已显示 {renderedOrphanedRights.length} / {orphanedRights.length} 条孤立记录</span>
                <button type="button" onClick={() => setVisibleOrphanLimit((current) => current + VISIBLE_ORPHAN_STEP)}>再显示 {Math.min(VISIBLE_ORPHAN_STEP, orphanedRights.length - renderedOrphanedRights.length)} 条</button>
              </div>
            ) : null}
          </details>
        </section>
      ) : null}

      {joinSafe && rows.length ? (
        <div className="rights-ledger-tools" data-pending={filtering}>
          <label className="rights-ledger-search">
            <span>台账内检索</span>
            <span className="rights-ledger-search__control">
              <Search aria-hidden="true" />
              <input
                type="search"
                value={query}
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
                maxLength={240}
                aria-keyshortcuts="Escape"
                placeholder="标题、作者、文件名或 documentId"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleRecordLimit(INITIAL_VISIBLE_RECORDS);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Escape" || !query) return;
                  event.preventDefault();
                  setQuery("");
                  setVisibleRecordLimit(INITIAL_VISIBLE_RECORDS);
                }}
              />
            </span>
          </label>
          <div className="rights-ledger-filter-group">
            <span>记录视图</span>
            <div className="rights-ledger-filters" role="group" aria-label="按权利门禁状态筛选记录">
              {ledgerViewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-view={option.value}
                  aria-pressed={view === option.value}
                  aria-label={`${option.label}，${viewCounts[option.value]} 份正文`}
                  onClick={() => {
                    setView(option.value);
                    setVisibleRecordLimit(INITIAL_VISIBLE_RECORDS);
                  }}
                >
                  <span>{option.label}</span>
                  <small aria-hidden="true">{viewCounts[option.value]}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="rights-ledger-result-tools">
            <p className="rights-ledger-result-count" role="status" aria-live="polite">
              {filtering ? "正在更新筛选结果…" : filterActive ? `匹配 ${visibleRows.length} / ${rows.length} 份正文记录` : `共 ${rows.length} 份正文记录`}
            </p>
            {filterActive ? <button type="button" className="rights-ledger-clear-filters" onClick={clearLedgerFilters}>清除筛选</button> : null}
          </div>
        </div>
      ) : null}

      {joinSafe && rows.length && !visibleRows.length ? (
        <div className="rights-filter-empty" role="status">
          <Search aria-hidden="true" />
          <div><strong>当前条件没有匹配的正文记录</strong><p>摘要数量与孤立权利异常始终保持全量口径，不会被筛选隐藏。</p></div>
          <button type="button" className="secondary-action" onClick={clearLedgerFilters}>清除筛选</button>
        </div>
      ) : null}

      {joinSafe && renderedRows.length ? <div className="rights-record-list" role="region" aria-label={`来源权利记录，已渲染 ${renderedRows.length} 份，共匹配 ${visibleRows.length} 份`} aria-busy={filtering}>
        {renderedRows.map((row, rowIndex) => {
          const { document, rights, integrity, originBinding, gateCriteria, gatePassed } = row;
          const anomalous = rowIsAnomalous(row);
          const passedGateCriteriaCount = gateCriteria.filter((criterion) => criterion.passed).length;
          const firstBlockedCriterion = gateCriteria.find((criterion) => !criterion.passed) ?? null;
          const sourceHref = safeHttpsUrl(rights?.source.sourceUrl ?? null);
          const reviewNote = safeVisibleText(rights?.review.note ?? "", "", 2_000);
          const recordTitleId = `${ledgerTitleId}-record-${rowIndex}`;
          return (
            <article
              key={document.id}
              className={anomalous ? "is-anomalous" : ""}
              aria-labelledby={recordTitleId}
              data-integrity={integrity}
              data-origin-binding={originBinding}
              data-distribution={rights?.rights.distributionPolicy ?? "closed"}
              data-rights-gate={gatePassed}
            >
            <header>
              <div><p className="eyebrow">{document.recordType === "bundled_knowledge_document" ? "Bundled source" : "Local source"}</p><h3 id={recordTitleId}>{safeVisibleText(document.title, "未命名资料", 180)}</h3><p>{[document.author, document.edition].map((value) => safeVisibleText(value, "", 160)).filter(Boolean).join(" · ") || "作者与版本未录入"}</p></div>
              <StatusPill tone={!rights || anomalous || rights.rights.status === "blocked" ? "cinnabar" : gatePassed ? "info" : "warning"}>
                {!rights ? "权利记录缺失" : integrity === "invalid_hash" ? "正文哈希未登记" : integrity === "hash_mismatch" ? "正文哈希失配" : originBinding === "mismatch" ? "来源身份失配" : rightsStatusLabels[rights.rights.status]}
              </StatusPill>
            </header>
            {rights ? <>
              <dl className="rights-facts">
                <div data-state={anomalous ? "error" : "ok"}><dt>正文 / 来源绑定</dt><dd>{integrityLabels[integrity]} · {originBindingLabels[originBinding]}</dd></div>
                <div><dt>作品层</dt><dd>{layerLabels[rights.rights.workStatus]}</dd></div>
                <div><dt>现代版本层</dt><dd>{layerLabels[rights.rights.editionStatus]}</dd></div>
                <div><dt>分发范围</dt><dd>{gatePassed ? "工程再分发门禁通过 · 非发布授权" : !anomalous && rights.rights.status !== "blocked" && rights.rights.distributionPolicy === "local_private_only" ? "仅本机私有研究" : "门禁关闭 · 不可分发"}</dd></div>
                <div><dt>复核</dt><dd>{rights.review.status === "double_reviewed" ? "双人复核" : rights.review.status === "single_reviewed" ? "单人复核" : "未复核"}</dd></div>
                <div><dt>出版者 / 年份</dt><dd>{[safeVisibleText(rights.source.publisher, "", 160), rights.source.publicationYear].filter((value) => value !== "" && value !== null).join(" · ") || "未录入"}</dd></div>
                <div><dt>当前正文哈希</dt><dd><code title={safeVisibleText(document.contentHash, "摘要不可显示", 160)}>{shortHash(document.contentHash)}</code></dd></div>
                <div><dt>台账绑定哈希</dt><dd><code title={safeVisibleText(rights.documentContentHash, "摘要不可显示", 160)}>{shortHash(rights.documentContentHash)}</code></dd></div>
              </dl>
              <div className="rights-gate-progress" data-state={gatePassed ? "passed" : "blocked"}>
                <header>
                  <div><small>Gate coverage · not a score</small><strong>{passedGateCriteriaCount} / {gateCriteria.length} 项检查满足</strong></div>
                  <StatusPill tone={gatePassed ? "info" : "warning"}>{gatePassed ? "工程再分发门禁通过" : "门禁关闭"}</StatusPill>
                </header>
                <div className="rights-gate-coverage" aria-hidden="true">
                  {gateCriteria.map((criterion) => <span key={criterion.key} data-passed={criterion.passed} />)}
                </div>
                <p>{gatePassed
                  ? "当前八项工程条件均满足；仍不能据此推导法律意见、专家真值或项目公开发布授权。"
                  : <>当前首个阻断项：<strong>{firstBlockedCriterion?.label ?? "权利条件不完整"}</strong>。检查项计数只用于定位缺口，不是权利评分或发布进度。</>}
                </p>
              </div>
              <ul className="rights-gate-checks" aria-label={`${safeVisibleText(document.title, "未命名资料", 180)}权利门禁逐项核对`}>
                {gateCriteria.map((criterion) => <li key={criterion.key} data-passed={criterion.passed}><span>{criterion.label}</span><strong>{criterion.passed ? "满足" : "不满足"}</strong></li>)}
              </ul>
              <div className="rights-record-notes">
                {sourceHref ? <a className="rights-source-link" href={sourceHref} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`打开“${safeVisibleText(document.title, "未命名资料", 180)}”的 HTTPS 来源页面（新窗口）`}>打开 HTTPS 来源页面<ExternalLink aria-hidden="true" /></a> : <p className="rights-missing-source">{rights.source.sourceUrl ? "来源网址不是无凭据的 HTTPS 地址" : "来源网址未录入"}</p>}
                {reviewNote ? <p className="rights-review-note">复核备注：{reviewNote}</p> : null}
              </div>
              {anomalous ? <p className="rights-integrity-error"><strong>分发门禁保持关闭。</strong> {bindingIssueMessage(integrity, originBinding)}</p> : null}
            </> : <p className="rights-integrity-error"><strong>分发门禁保持关闭。</strong> 系统采取 fail closed：缺少台账时不会回退为“已核验”或“可分发”。</p>}
            <footer><AppLink className="secondary-action" href={`/knowledge${buildKnowledgeSearch({ documentId: document.id })}`} aria-label={`查看“${safeVisibleText(document.title, "未命名资料", 180)}”的精确正文`}>查看精确正文</AppLink></footer>
          </article>
          );
        })}
      </div> : null}
      {joinSafe && renderedRows.length < visibleRows.length ? (
        <div className="rights-record-load-more" role="status">
          <p>已渲染 {renderedRows.length} / {visibleRows.length} 份匹配记录，摘要指标仍保持全量口径。</p>
          <button type="button" onClick={() => setVisibleRecordLimit((current) => current + VISIBLE_RECORD_STEP)}>再显示 {Math.min(VISIBLE_RECORD_STEP, visibleRows.length - renderedRows.length)} 份</button>
        </div>
      ) : null}
    </section>
  );
}
