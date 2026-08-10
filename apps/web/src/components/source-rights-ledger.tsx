import { AlertTriangle, BookLock, ExternalLink, FileKey2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { KnowledgeDocumentRecord, SourceRightsRecord } from "@hakimi/contracts";
import { knowledgeRepository } from "@hakimi/storage";
import { buildKnowledgeSearch } from "../lib/knowledge-route";
import { AppLink } from "../lib/router";
import { StatusPill } from "./status-pill";

type LedgerRow = {
  document: KnowledgeDocumentRecord;
  rights: SourceRightsRecord | null;
  integrity: "ok" | "missing" | "hash_mismatch";
};

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

function shortHash(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function message(reason: unknown): string {
  return reason instanceof Error ? reason.message : "来源台账读取失败。";
}

export function SourceRightsLedger() {
  const [documents, setDocuments] = useState<KnowledgeDocumentRecord[]>([]);
  const [rightsRecords, setRightsRecords] = useState<SourceRightsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      knowledgeRepository.listDocuments(),
      knowledgeRepository.listSourceRights()
    ]).then(([nextDocuments, nextRights]) => {
      if (!active) return;
      setDocuments(nextDocuments);
      setRightsRecords(nextRights);
    }).catch((reason: unknown) => {
      if (active) setError(message(reason));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const rows = useMemo<LedgerRow[]>(() => {
    const byDocument = new Map(rightsRecords.map((record) => [record.documentId, record]));
    return documents.map((document) => {
      const rights = byDocument.get(document.id) ?? null;
      return {
        document,
        rights,
        integrity: !rights ? "missing" : rights.documentContentHash === document.contentHash ? "ok" : "hash_mismatch"
      };
    });
  }, [documents, rightsRecords]);

  const privateCount = rows.filter((row) => row.rights?.rights.distributionPolicy === "local_private_only").length;
  const distributableCount = rows.filter((row) => row.rights?.rights.distributionPolicy === "redistributable" && row.integrity === "ok").length;
  const anomalyCount = rows.filter((row) => row.integrity !== "ok").length
    + rightsRecords.filter((record) => !documents.some((document) => document.id === record.documentId)).length;

  return (
    <section className="rights-ledger" aria-labelledby="rights-ledger-title">
      <div className="audit-intro">
        <div><p className="eyebrow">Source rights</p><h2 id="rights-ledger-title">来源权利台账</h2><p>逐份绑定正文哈希，分别检查古代作品与现代版本/数字化文本。这里不评价命理结论是否正确。</p></div>
        <StatusPill tone={anomalyCount ? "cinnabar" : "info"}>{anomalyCount ? `${anomalyCount} 项异常` : "完整性正常"}</StatusPill>
      </div>

      <div className="audit-metrics" role="group" aria-label="权利台账摘要">
        <div><FileKey2 aria-hidden="true" /><strong>{rows.length}</strong><span>已登记资料</span></div>
        <div><BookLock aria-hidden="true" /><strong>{privateCount}</strong><span>仅本机</span></div>
        <div><ShieldCheck aria-hidden="true" /><strong>{distributableCount}</strong><span>可随包分发</span></div>
        <div><AlertTriangle aria-hidden="true" /><strong>{anomalyCount}</strong><span>异常 / 孤儿</span></div>
      </div>

      <div className="rights-guardrail"><ShieldCheck aria-hidden="true" /><p><strong>默认拒绝公开分发。</strong> 用户导入只能保持“未核验、仅本机”；作品公版也不会自动证明某个现代校点或数字化版本可再分发。</p></div>
      {error ? <div className="inline-error" role="alert"><strong>台账不可用</strong><p>{error}</p></div> : null}
      {loading ? <p role="status">正在核对来源台账…</p> : null}

      {!loading && !rows.length ? <div className="knowledge-empty"><BookLock aria-hidden="true" /><p>还没有本地资料。导入第一份 Markdown / TXT 后，系统会原子创建“用户提供 · 未核验 · 仅本机”权利记录。</p></div> : null}
      <div className="rights-record-list">
        {rows.map(({ document, rights, integrity }) => (
          <article key={document.id} className={integrity === "ok" ? "" : "is-anomalous"}>
            <header>
              <div><p className="eyebrow">{document.recordType === "bundled_knowledge_document" ? "Bundled source" : "Local source"}</p><h3>{document.title}</h3><p>{[document.author, document.edition].filter(Boolean).join(" · ") || "作者与版本未录入"}</p></div>
              <StatusPill tone={!rights || integrity !== "ok" || rights.rights.status === "blocked" ? "cinnabar" : rights.rights.distributionPolicy === "redistributable" ? "info" : "warning"}>
                {!rights ? "权利记录缺失" : integrity === "hash_mismatch" ? "正文哈希失配" : rightsStatusLabels[rights.rights.status]}
              </StatusPill>
            </header>
            {rights ? <>
              <dl className="rights-facts">
                <div><dt>作品层</dt><dd>{layerLabels[rights.rights.workStatus]}</dd></div>
                <div><dt>现代版本层</dt><dd>{layerLabels[rights.rights.editionStatus]}</dd></div>
                <div><dt>分发范围</dt><dd>{rights.rights.distributionPolicy === "redistributable" ? "允许随包分发" : "仅本机私有研究"}</dd></div>
                <div><dt>复核</dt><dd>{rights.review.status === "double_reviewed" ? "双人复核" : rights.review.status === "single_reviewed" ? "单人复核" : "未复核"}</dd></div>
                <div><dt>出版者 / 年份</dt><dd>{[rights.source.publisher, rights.source.publicationYear].filter((value) => value !== "" && value !== null).join(" · ") || "未录入"}</dd></div>
                <div><dt>内容哈希</dt><dd><code title={document.contentHash}>{shortHash(document.contentHash)}</code></dd></div>
              </dl>
              {rights.source.sourceUrl ? <a className="rights-source-link" href={rights.source.sourceUrl} target="_blank" rel="noreferrer">打开来源页面<ExternalLink aria-hidden="true" /></a> : <p className="rights-missing-source">来源网址未录入</p>}
              {rights.review.note ? <p className="rights-review-note">复核备注：{rights.review.note}</p> : null}
            </> : <p className="rights-integrity-error">系统采取 fail closed：缺少台账时不会回退为“已核验”或“可分发”。</p>}
            <AppLink className="secondary-action" href={`/knowledge${buildKnowledgeSearch({ documentId: document.id })}`}>查看精确正文</AppLink>
          </article>
        ))}
      </div>
    </section>
  );
}
