import { ExternalLink, Lock } from "lucide-react";
import {
  RESEARCH_CONTENT_CATALOG,
  type ResearchContentCatalogSystem,
  type ResearchContentSourceRole
} from "../lib/research-content-catalog";
import { AppLink } from "../lib/router";
import { StatusPill } from "./status-pill";

const SOURCE_ROLE_LABELS: Readonly<Record<ResearchContentSourceRole, string>> = Object.freeze({
  classical_source: "古籍定位",
  modern_learning: "现代研习",
  interpretation_boundary: "解释边界",
  scientific_boundary: "科学边界"
});

function ResearchContentCatalogCard({ system }: { system: ResearchContentCatalogSystem }) {
  const titleId = `research-content-catalog-${system.systemId}-title`;
  const boundaryId = `research-content-catalog-${system.systemId}-boundary`;

  return (
    <li
      className={`research-content-catalog-card research-content-catalog-card--${system.catalogState}`}
      data-system-id={system.systemId}
      data-catalog-state={system.catalogState}
      data-runtime-reachable={String(system.runtimeReachable)}
      data-entry-href={system.entryHref ?? "none"}
      data-expert-approved-count={system.expertApprovedCount}
      data-formal-published-count={system.formalPublishedCount}
      data-expert-truth-claimed={String(system.expertTruthClaimed)}
      data-formal-activation-allowed={String(system.formalActivationAllowed)}
      data-good-bad-score="null"
      data-result="null"
    >
      <article aria-labelledby={titleId} aria-describedby={boundaryId}>
        <header>
          <div>
            <p className="eyebrow">{system.internationalLabel}</p>
            <h3 id={titleId}>{system.label}</h3>
          </div>
          <StatusPill tone={system.catalogState === "live_active" ? "jade" : "info"}>
            {system.stateLabel}
          </StatusPill>
        </header>

        <dl className="research-content-catalog-metrics" aria-label={`${system.label}内容目录数字`}>
          <div>
            <dt>{system.inventoryMetricLabel}</dt>
            <dd><strong>{system.fixedInventoryCount}</strong><span>{system.inventoryUnit}</span></dd>
          </div>
          <div>
            <dt>来源登记</dt>
            <dd><strong>{system.sourceRegistryCount}</strong><span>个来源</span></dd>
          </div>
          <div>
            <dt>专家批准</dt>
            <dd><strong>{system.expertApprovedCount}</strong><span>项</span></dd>
          </div>
          <div>
            <dt>正式发布</dt>
            <dd><strong>{system.formalPublishedCount}</strong><span>项</span></dd>
          </div>
        </dl>

        <section className="research-content-catalog-block" aria-labelledby={`${titleId}-sections`}>
          <h4 id={`${titleId}-sections`}>固定目录分项</h4>
          <ul className="research-content-catalog-sections">
            {system.sections.map((section) => (
              <li key={section.sectionId}>
                <span>{section.label}</span>
                <strong>{section.itemCount}</strong>
                <small>{section.unitLabel}</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="research-content-catalog-block" aria-labelledby={`${titleId}-derived`}>
          <h4 id={`${titleId}-derived`}>派生阅读层 <small>不计入固定目录</small></h4>
          <ul className="research-content-catalog-copy-list">
            {system.derivedCoverage.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="research-content-catalog-block" aria-labelledby={`${titleId}-sources`}>
          <h4 id={`${titleId}-sources`}>代表来源 <small>{system.representativeSources.length}/{system.sourceRegistryCount}</small></h4>
          <ul className="research-content-catalog-sources">
            {system.representativeSources.map((source) => (
              <li key={source.sourceId}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  <span><small>{SOURCE_ROLE_LABELS[source.role]}</small>{source.title}</span>
                  <ExternalLink aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="research-content-catalog-block" aria-labelledby={`${titleId}-gaps`}>
          <h4 id={`${titleId}-gaps`}>尚未完成</h4>
          <ul className="research-content-catalog-copy-list research-content-catalog-copy-list--gaps">
            {system.currentGaps.map((gap) => <li key={gap}>{gap}</li>)}
          </ul>
        </section>

        <details className="research-content-catalog-evidence">
          <summary>查看证据文档路径</summary>
          <ul>
            {system.evidenceDocuments.map((documentPath) => <li key={documentPath}><code>{documentPath}</code></li>)}
          </ul>
        </details>

        {system.entryHref !== null && system.entryLabel !== null ? (
          <AppLink href={system.entryHref} className="secondary-action research-content-catalog-entry">
            {system.entryLabel}
          </AppLink>
        ) : (
          <p className="research-content-catalog-no-entry">
            <Lock aria-hidden="true" />主应用无入口；此卡不能打开隔离预览。
          </p>
        )}

        <p className="research-content-catalog-boundary" id={boundaryId}>{system.boundary}</p>
      </article>
    </li>
  );
}

export function ResearchContentCatalog() {
  return (
    <section
      className="research-content-catalog-section"
      aria-labelledby="research-content-catalog-title"
      data-catalog-profile={RESEARCH_CONTENT_CATALOG.profile.projectionVersion}
      data-source-mode={RESEARCH_CONTENT_CATALOG.profile.sourceMode}
      data-runtime-import-policy={RESEARCH_CONTENT_CATALOG.profile.runtimeImportPolicy}
      data-navigation-policy={RESEARCH_CONTENT_CATALOG.profile.navigationPolicy}
      data-scoring-allowed={String(RESEARCH_CONTENT_CATALOG.profile.scoringAllowed)}
      data-expert-truth-claimed={String(RESEARCH_CONTENT_CATALOG.profile.expertTruthClaimed)}
      data-formal-activation-allowed={String(RESEARCH_CONTENT_CATALOG.profile.formalActivationAllowed)}
    >
      <div className="research-content-catalog-heading">
        <div>
          <p className="eyebrow">Content inventory</p>
          <h2 id="research-content-catalog-title">跨术数内容总目录</h2>
        </div>
        <div>
          <StatusPill tone="warning">
            {RESEARCH_CONTENT_CATALOG.counts.systems} 体系 · {RESEARCH_CONTENT_CATALOG.counts.expertApproved} 专家批准
          </StatusPill>
          <p>八字读取主应用实时审稿清单；紫微与西洋只显示 2026-08-12 隔离源码静态快照。</p>
        </div>
      </div>

      <aside className="research-content-catalog-count-boundary" aria-label="目录数字口径">
        <strong>数字不能横向排名</strong>
        <p>{RESEARCH_CONTENT_CATALOG.knownBoundaries[0]}</p>
      </aside>

      <ul className="research-content-catalog-grid" aria-label="八字、紫微斗数与西洋星盘内容目录">
        {RESEARCH_CONTENT_CATALOG.systems.map((system) => (
          <ResearchContentCatalogCard key={system.systemId} system={system} />
        ))}
      </ul>

      <ul className="research-content-catalog-boundaries" aria-label="跨术数内容边界">
        {RESEARCH_CONTENT_CATALOG.knownBoundaries.slice(1).map((boundary) => <li key={boundary}>{boundary}</li>)}
      </ul>
    </section>
  );
}
