import { forwardRef, useId } from "react";
import type { SingleChartResearchReport as SingleChartResearchReportModel } from "@hakimi/research-export";

type ReportRow = SingleChartResearchReportModel["caseRows"][number];
type EventTimeDerivation = SingleChartResearchReportModel["eventTimeDerivations"][number];
type CalculationSource = SingleChartResearchReportModel["calculationSource"];
type CalculationComponent = CalculationSource["components"][number];

function ReportRowList({ rows, keyPrefix }: { rows: ReportRow[]; keyPrefix: string }) {
  return (
    <dl className="single-chart-report-rows">
      {rows.map((item, index) => (
        <div key={`${keyPrefix}:${index}:${item.label}`}>
          <dt>{item.label}</dt>
          <dd>{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportRows({ title, rows }: { title: string; rows: ReportRow[] }) {
  return (
    <section className="single-chart-report-section">
      <h2>{title}</h2>
      <ReportRowList rows={rows} keyPrefix={title} />
    </section>
  );
}

function EventTimeDerivationCard({ derivation }: { derivation: EventTimeDerivation }) {
  return (
    <article
      className="single-chart-event-time-derivation"
      aria-label={`事件时间迁移凭证 ${derivation.reference}`}
    >
      <header>
        <div>
          <small>Migration receipt · {derivation.createdAt}</small>
          <h3><code>{derivation.reference}</code></h3>
        </div>
        <span>显式用户确认</span>
      </header>
      <dl className="single-chart-event-time-meta">
        <div><dt>授权</dt><dd><code>{derivation.authorization}</code></dd></div>
        <div><dt>源 Event</dt><dd><code>{derivation.sourceReference}</code></dd></div>
        <div><dt>目标 Event</dt><dd><code>{derivation.targetReference}</code></dd></div>
        <div><dt>源快照摘要</dt><dd><code>{derivation.sourceSnapshotDigest}</code></dd></div>
        <div><dt>目标快照摘要</dt><dd><code>{derivation.targetSnapshotDigest}</code></dd></div>
      </dl>
      <div className="single-chart-event-time-details">
        <section>
          <h4>冻结研究谱系</h4>
          <ReportRowList rows={derivation.lineage} keyPrefix={`${derivation.reference}:lineage`} />
        </section>
        <section>
          <h4>时间解释</h4>
          <ReportRowList rows={derivation.interpretation} keyPrefix={`${derivation.reference}:interpretation`} />
        </section>
      </div>
    </article>
  );
}

function CitationStatus({ status, label }: { status: SingleChartResearchReportModel["citations"][number]["status"]; label: string }) {
  return <span className={`report-citation-status report-citation-status--${status}`}>{label}</span>;
}

function downstreamSourceLabel(source: CalculationSource["downstreamSource"]): string {
  if (source === "stored_receipt") return "已保存计算收据";
  if (source === "explicit_projection") return "当前版本即时投影";
  return "无可核验计算来源";
}

function comparisonStatusLabel(status: CalculationSource["comparisonStatus"]): string {
  if (status === "matched") return "精确复演一致";
  if (status === "mismatch") return "精确复演有差异";
  if (status === "exact_executor_unavailable") return "精确执行器未保留";
  return "不适用";
}

function receiptLedgerStatusLabel(status: CalculationSource["receiptLedgerStatus"]): string {
  return status === "available" ? "收据账本可用" : "当前发布代无收据账本";
}

function componentStatusLabel(status: CalculationComponent["status"]): string {
  if (status === "projected") return "已计算";
  if (status === "unavailable") return "精确执行器不可用";
  if (status === "not_requested") return "本次未请求";
  return "不可计算";
}

function componentSourceLabel(
  component: CalculationComponent,
  downstreamSource: CalculationSource["downstreamSource"]
): string {
  if (component.status === "not_requested") return "本次未请求";
  if (component.status === "unavailable") return "精确执行器不可用";
  if (component.status === "not_evaluable") return "无可核验计算来源";
  return downstreamSourceLabel(downstreamSource);
}

function CalculationSourceSection({
  source,
  anonymized
}: {
  source: CalculationSource;
  anonymized: boolean;
}) {
  const headingId = useId();
  const sourceLabel = downstreamSourceLabel(source.downstreamSource);
  const hasLocalSourceDetails = Boolean(source.receiptReference || source.projectionDigest);
  return (
    <section
      className="single-chart-report-section single-chart-calculation-source"
      aria-labelledby={headingId}
      data-source={source.downstreamSource}
      data-ledger-status={source.receiptLedgerStatus}
      data-comparison-status={source.comparisonStatus}
    >
      <h2 id={headingId}>下游计算来源</h2>
      <p className="single-chart-calculation-source-notice">{source.notice}</p>
      <dl className="single-chart-report-rows">
        <div><dt>本命来源</dt><dd>已校验冻结 Revision</dd></div>
        <div><dt>下游来源</dt><dd>{sourceLabel}（<code>{source.downstreamSource}</code>）</dd></div>
        <div><dt>收据账本</dt><dd>{receiptLedgerStatusLabel(source.receiptLedgerStatus)}（<code>{source.receiptLedgerStatus}</code>）</dd></div>
        <div><dt>历史输出比对</dt><dd>{source.storedHistoricalOutputCompared ? "已比较" : "未比较"}</dd></div>
        <div><dt>精确复演</dt><dd>{comparisonStatusLabel(source.comparisonStatus)}（<code>{source.comparisonStatus}</code>）</dd></div>
        <div><dt>专家证据</dt><dd>未核验</dd></div>
        <div><dt>执行器 Profile</dt><dd><code>{source.profileId}</code></dd></div>
      </dl>
      <div className="single-chart-calculation-components" aria-label="下游组件来源状态">
        {source.components.map((component) => {
          const componentSource = componentSourceLabel(component, source.downstreamSource);
          const statusLabel = componentStatusLabel(component.status);
          return (
            <article
              key={component.key}
              aria-label={`${component.label}：${statusLabel}；来源：${componentSource}`}
            >
              <header><strong>{component.label}</strong><span>{statusLabel}</span></header>
              <dl>
                <div><dt>计算来源</dt><dd>{componentSource}</dd></div>
                <div><dt>组件状态</dt><dd>{statusLabel}（<code>{component.status}</code>）</dd></div>
                <div><dt>执行器</dt><dd><code>{component.executorId ?? "—"}</code></dd></div>
                {component.resultDigest ? <div><dt>结果摘要</dt><dd><code>{component.resultDigest}</code></dd></div> : null}
              </dl>
            </article>
          );
        })}
      </div>
      {anonymized ? (
        <p className="single-chart-report-empty">
          匿名模式仅保留来源分类与核验状态；收据引用、请求指纹、收据 / 投影 / 组件摘要及保存时间均已移除。
        </p>
      ) : hasLocalSourceDetails ? (
        <details className="single-chart-calculation-source-details">
          <summary>查看完整本地摘要</summary>
          <dl>
            {source.receiptReference ? <div><dt>收据引用</dt><dd><code>{source.receiptReference}</code></dd></div> : null}
            {source.requestFingerprint ? <div><dt>请求指纹</dt><dd><code>{source.requestFingerprint}</code></dd></div> : null}
            {source.receiptDigest ? <div><dt>收据摘要</dt><dd><code>{source.receiptDigest}</code></dd></div> : null}
            {source.projectionDigest ? <div><dt>投影摘要</dt><dd><code>{source.projectionDigest}</code></dd></div> : null}
            {source.capturedAt ? <div><dt>保存时间</dt><dd>{source.capturedAt}</dd></div> : null}
          </dl>
        </details>
      ) : (
        <p className="single-chart-report-empty">当前来源没有可展示的本地摘要。</p>
      )}
    </section>
  );
}

export const SingleChartReport = forwardRef<HTMLDivElement, { report: SingleChartResearchReportModel }>(
  function SingleChartReport({ report }, summaryRef) {
    const citationCounts = report.citations.reduce(
      (counts, citation) => ({ ...counts, [citation.status]: counts[citation.status] + 1 }),
      { verified: 0, user_candidate: 0, rejected: 0 }
    );
    const summaryRows = [
      ...report.birthRows.filter((row) => ["输入历法", "原始日期", "出生时间", "时区"].includes(row.label)),
      ...report.calibrationRows.filter((row) => ["排盘墙上时间", "UTC 瞬时点"].includes(row.label)),
      ...report.ruleRows.filter((row) => ["规则方案", "界年 / 换月", "换日 / 子时日干", "时柱时间基准"].includes(row.label)),
      ...report.integrityRows.filter((row) => ["引擎", "规则摘要", "验证状态"].includes(row.label))
    ];

    return (
      <article className="single-chart-report-print-root" data-anonymized={report.anonymized ? "true" : "false"}>
        <section ref={summaryRef} className="single-chart-report-summary" aria-label="单盘报告摘要">
          <header className="single-chart-report-cover">
            <div>
              <p className="single-chart-report-kicker">HAKIMI · BAZI RESEARCH</p>
              <h1>{report.title}</h1>
              <p>{report.subtitle}</p>
            </div>
            <div className="single-chart-report-identity">
              <strong>{report.caseLabel}</strong>
              <span>{report.revisionLabel}</span>
              <small>{report.anonymized ? "匿名模式" : "完整资料模式"} · 格式 {report.formatVersion}</small>
            </div>
          </header>

          <p className="single-chart-report-notice">{report.previewNotice}</p>

          <div
            className={`single-chart-calculation-source-marker single-chart-calculation-source-marker--${report.calculationSource.downstreamSource}`}
            role="group"
            data-source={report.calculationSource.downstreamSource}
            data-ledger-status={report.calculationSource.receiptLedgerStatus}
            data-comparison-status={report.calculationSource.comparisonStatus}
            aria-label={`下游计算来源：${downstreamSourceLabel(report.calculationSource.downstreamSource)}；精确复演：${comparisonStatusLabel(report.calculationSource.comparisonStatus)}；收据账本：${receiptLedgerStatusLabel(report.calculationSource.receiptLedgerStatus)}`}
          >
            <span>本命来源：已校验冻结 Revision</span>
            <strong>下游来源：{downstreamSourceLabel(report.calculationSource.downstreamSource)}</strong>
            <small>{comparisonStatusLabel(report.calculationSource.comparisonStatus)} · {receiptLedgerStatusLabel(report.calculationSource.receiptLedgerStatus)} · 专家证据未核验</small>
          </div>

          <div className="single-chart-pillar-grid">
            {report.pillars.map((pillar) => (
              <article key={pillar.key}>
                <span>{pillar.label}</span>
                <strong>{pillar.ganZhi}</strong>
                <dl>
                  <div><dt>十神</dt><dd>{pillar.stemTenGod}</dd></div>
                  <div><dt>藏干</dt><dd>{pillar.hiddenStems}</dd></div>
                  <div><dt>纳音</dt><dd>{pillar.nayin}</dd></div>
                  <div><dt>旬空</dt><dd>{pillar.xun} · {pillar.voidBranches}</dd></div>
                </dl>
              </article>
            ))}
          </div>

          <dl className="single-chart-summary-meta">
            {summaryRows.map((item) => (
              <div key={`summary:${item.label}`}><dt>{item.label}</dt><dd>{item.value || "—"}</dd></div>
            ))}
          </dl>

          <div className="single-chart-report-evidence-summary">
            <div><span>字段来源</span><strong>{report.provenance.length}</strong><small>条可追溯字段</small></div>
            <div><span>双人核验</span><strong>{citationCounts.verified}</strong><small>条结构化引用</small></div>
            <div><span>用户候选</span><strong>{citationCounts.user_candidate}</strong><small>不会升级为核验</small></div>
            <div><span>反证 / 拒绝</span><strong>{citationCounts.rejected}</strong><small>原样保留</small></div>
          </div>

          {!report.anonymized && report.citations.length > 0 ? (
            <div className="single-chart-summary-citations">
              <h2>必要引用摘要</h2>
              {report.citations.slice(0, 3).map((citation) => (
                <p key={`summary:${citation.reference}`}>
                  <strong>{citation.reference}</strong>
                  <CitationStatus status={citation.status} label={citation.statusLabel} />
                  <span>{citation.source.title} · {citation.locator}</span>
                </p>
              ))}
              {report.citations.length > 3 ? <small>另有 {report.citations.length - 3} 条，见报告正文。</small> : null}
            </div>
          ) : (
            <p className="single-chart-summary-redaction">
              {report.anonymized ? "结构化本地文献引用已按匿名策略移除。" : "当前单盘尚无结构化文献引用。"}
            </p>
          )}

          {!report.anonymized && report.eventTimeDerivations.length > 0 ? (
            <div className="single-chart-summary-derivations">
              <div><span>事件时间迁移血缘</span><strong>{report.eventTimeDerivations.length} 条显式派生凭证</strong></div>
              <small>源/目标快照摘要、研究谱系与 IANA/DST/UTC 解释见报告正文。</small>
            </div>
          ) : null}

          <footer>
            <span>{report.privacyWarning}</span>
            <span>{report.caseReference} · {report.revisionReference}</span>
          </footer>
        </section>

        <div className="single-chart-report-body">
          <div className="single-chart-report-two-column">
            <ReportRows title="案例与修订" rows={report.caseRows} />
            <ReportRows title="出生输入" rows={report.birthRows} />
          </div>
          <ReportRows title="时间校准" rows={report.calibrationRows} />
          <div className="single-chart-report-two-column">
            <ReportRows title="规则快照" rows={report.ruleRows} />
            <ReportRows title="计算完整性" rows={report.integrityRows} />
          </div>
          <CalculationSourceSection source={report.calculationSource} anonymized={report.anonymized} />

          <section className="single-chart-report-section" aria-label="完整四柱事实">
            <h2>完整四柱事实</h2>
            <div className="single-chart-pillar-facts-grid">
              {report.pillars.map((pillar) => (
                <article key={`facts:${pillar.key}`} aria-label={`${pillar.label}完整事实`}>
                  <header><span>{pillar.label}</span><strong>{pillar.ganZhi}</strong></header>
                  <dl>
                    <div><dt>干十神</dt><dd>{pillar.stemTenGod}</dd></div>
                    <div><dt>藏干</dt><dd>{pillar.hiddenStems}</dd></div>
                    <div><dt>支十神</dt><dd>{pillar.branchTenGods}</dd></div>
                    <div><dt>五行</dt><dd>{pillar.wuXing}</dd></div>
                    <div><dt>纳音</dt><dd>{pillar.nayin}</dd></div>
                    <div><dt>长生</dt><dd>{pillar.twelveGrowth}</dd></div>
                    <div><dt>旬</dt><dd>{pillar.xun}</dd></div>
                    <div><dt>空亡</dt><dd>{pillar.voidBranches}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="single-chart-report-section">
            <h2>字段来源与核验状态</h2>
            <div className="single-chart-provenance-table" role="table" aria-label="字段来源与核验状态">
              <div role="row">
                <strong role="columnheader">字段</strong>
                <span role="columnheader">来源类型</span>
                <span role="columnheader">算法 / 规则</span>
                <span role="columnheader">核验状态</span>
                <small role="columnheader">来源引用 / 备注</small>
              </div>
              {report.provenance.map((item) => (
                <div role="row" key={item.field}>
                  <strong role="cell">{item.field}</strong>
                  <span role="cell">{item.kind}</span>
                  <span role="cell">{item.algorithmId}</span>
                  <span role="cell">{item.verificationStatus}</span>
                  <small role="cell">{item.sourceRefs.join("；") || "—"}{item.note ? ` · ${item.note}` : ""}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="single-chart-report-section">
            <h2>研究笔记与真实事件</h2>
            {report.anonymized ? (
              <p className="single-chart-report-empty">匿名模式已移除研究笔记、事件日期、正文与节点引用。</p>
            ) : (
              <div className="single-chart-research-grid">
                {[...report.researchNotes, ...report.events].map((entry) => (
                  <article key={entry.reference}>
                    <small>{entry.reference}</small>
                    <h3>{entry.title}</h3>
                    <p>{entry.body}</p>
                    <dl>{entry.meta.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
                    {entry.sourceRefs.length ? <footer>旧来源字符串：{entry.sourceRefs.join("；")}</footer> : null}
                  </article>
                ))}
                {!report.researchNotes.length && !report.events.length ? <p className="single-chart-report-empty">当前单盘没有研究笔记或真实事件。</p> : null}
              </div>
            )}
          </section>

          <section className="single-chart-report-section">
            <h2>事件时间迁移血缘</h2>
            {report.anonymized ? (
              <p className="single-chart-report-empty">匿名模式已移除事件时间上下文与迁移凭证。</p>
            ) : (
              <div className="single-chart-event-time-derivations">
                {report.eventTimeDerivations.map((derivation) => (
                  <EventTimeDerivationCard key={derivation.reference} derivation={derivation} />
                ))}
                {!report.eventTimeDerivations.length ? <p className="single-chart-report-empty">当前单盘没有事件时间迁移凭证。</p> : null}
              </div>
            )}
          </section>

          <section className="single-chart-report-section">
            <h2>结构化引用与权利状态</h2>
            {report.anonymized ? (
              <p className="single-chart-report-empty">匿名模式已移除本地文献身份、引文、定位和审查记录。</p>
            ) : (
              <div className="single-chart-citation-list">
                {report.citations.map((citation) => (
                  <article key={citation.reference} className={`single-chart-citation single-chart-citation--${citation.status}`}>
                    <header>
                      <strong>{citation.reference} · {citation.source.title}</strong>
                      <CitationStatus status={citation.status} label={citation.statusLabel} />
                    </header>
                    <blockquote>{citation.quote}</blockquote>
                    <p>{citation.annotation || "无批注"}</p>
                    <dl>
                      <div><dt>目标</dt><dd>{citation.targets.join("；")}</dd></div>
                      <div><dt>定位</dt><dd>{citation.locator}</dd></div>
                      <div><dt>作者 / 版本</dt><dd>{citation.source.author || "—"} / {citation.source.edition || "—"}</dd></div>
                      <div><dt>出版信息</dt><dd>{citation.source.publisher || "—"} {citation.source.publicationYear}</dd></div>
                      <div><dt>来源网址</dt><dd>{citation.source.sourceUrl || "—"}</dd></div>
                      <div><dt>正文哈希</dt><dd>{citation.source.contentHash}</dd></div>
                      <div><dt>权利</dt><dd>{citation.source.rightsStatus} · {citation.source.workStatus} · {citation.source.editionStatus}</dd></div>
                      <div><dt>分发 / 复核</dt><dd>{citation.source.distributionPolicy} · {citation.source.reviewStatus} · {citation.reviewerCount} 人</dd></div>
                      {citation.decisionNote ? <div><dt>决定说明</dt><dd>{citation.decisionNote}</dd></div> : null}
                    </dl>
                  </article>
                ))}
                {!report.citations.length ? <p className="single-chart-report-empty">当前单盘没有结构化引用。</p> : null}
              </div>
            )}
          </section>

          {report.redactions.length ? (
            <section className="single-chart-report-section single-chart-report-redactions">
              <h2>匿名移除清单</h2>
              <ul>{report.redactions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          ) : null}
        </div>
      </article>
    );
  }
);
