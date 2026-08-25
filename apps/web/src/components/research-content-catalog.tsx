import { ExternalLink, Lock } from "lucide-react";
import { useId } from "react";
import {
  RESEARCH_CONTENT_CATALOG,
  isResearchContentSourceId,
  type ResearchContentCatalogSystem,
  type ResearchContentReviewState,
  type ResearchContentSourceRole
} from "../lib/research-content-catalog";
import { RESEARCH_SYSTEM_IDS } from "../lib/research-system-roadmap";
import { AppLink } from "../lib/router";
import { safeVisibleText } from "../lib/visible-text";
import { StatusPill } from "./status-pill";
import "./research-system-overview.css";
import "./research-content-catalog.css";

const SOURCE_ROLE_LABELS: Readonly<Record<ResearchContentSourceRole, string>> = Object.freeze({
  classical_source: "古籍定位",
  modern_learning: "现代研习",
  interpretation_boundary: "解释边界",
  scientific_boundary: "科学边界"
});
const REVIEW_STATE_LABELS: Readonly<Record<ResearchContentReviewState, string>> = Object.freeze({
  unresolved_review_queue: "未裁决审稿项",
  neutral_candidate_snapshot: "中性候选快照"
});
const EXPECTED_SYSTEM_IDS = new Set<string>(RESEARCH_SYSTEM_IDS);
const CATALOG_STATE_IDS = new Set<string>(["live_active", "static_isolated_snapshot"]);
const REVIEW_STATE_IDS = new Set<string>(Object.keys(REVIEW_STATE_LABELS));
const SOURCE_ROLE_IDS = new Set<string>(Object.keys(SOURCE_ROLE_LABELS));
const UNSAFE_CATALOG_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const MAX_CATALOG_TEXT_LENGTH = 2_000;
const MAX_CATALOG_ITEMS = 256;
const MAX_CATALOG_COUNT = 1_000_000;
const CATALOG_RELEASE_BOUNDARY_ATTRIBUTES = {
  "data-release-family": "legacy-v13",
  "data-release-identity": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-current-build-evidence-verified": "false",
  "data-public-release-authorized": "false",
  "data-expert-truth-established": "false",
  "data-formal-truth-established": "false",
  "data-scientific-validity-claimed": "false",
  "data-display-authority": "inventory-only",
  "data-mutation-mode": "read-only-no-mutation",
  "data-mutation-epoch-bypassed": "false",
  "data-record-write-performed": "false",
  "data-record-write-state": "not_started",
  "data-good-bad-score": "null",
  "data-result": "null"
} as const;

function safeCatalogText(value: unknown, maxLength = MAX_CATALOG_TEXT_LENGTH): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !UNSAFE_CATALOG_TEXT_PATTERN.test(value);
}

function safeCatalogSystemId(value: string): boolean {
  return value.length <= 80 && value === value.trim() && /^[a-z0-9][a-z0-9_-]*$/i.test(value);
}

function safeCatalogSourceUrl(value: string): boolean {
  if (value.length > 2_048 || value !== value.trim() || UNSAFE_CATALOG_TEXT_PATTERN.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function catalogSourceHost(value: string): string {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function safeCatalogEntryHref(value: unknown): value is string {
  if (
    typeof value !== "string"
    || value.length > 2_048
    || value !== value.trim()
    || !value.startsWith("/")
    || value.startsWith("//")
    || /[\\\u0000-\u0020\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)
  ) return false;
  try {
    const path = decodeURIComponent(value.split(/[?#]/u, 1)[0] ?? "");
    return !path.split("/").some((segment) => segment === "." || segment === "..");
  } catch {
    return false;
  }
}

function validUtcDateStamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function hasBlankOrDuplicateText(
  values: readonly string[],
  maxItems = MAX_CATALOG_ITEMS,
  maxLength = MAX_CATALOG_TEXT_LENGTH
): boolean {
  return values.length > maxItems
    || values.some((value) => !safeCatalogText(value, maxLength))
    || new Set(values).size !== values.length;
}

function catalogBindingIssue(): string | null {
  const catalog = RESEARCH_CONTENT_CATALOG;
  if (
    catalog.profile.scoringAllowed
    || catalog.profile.expertTruthClaimed
    || catalog.profile.formalActivationAllowed
  ) {
    return "内容目录 Profile 错误开放了评分、专家真值或正式激活能力。";
  }
  if (catalog.profile.expectedSystemCount !== RESEARCH_SYSTEM_IDS.length) {
    return "内容目录 Profile 的预期体系数与权威体系登记不一致。";
  }
  if ([
    catalog.profile.projectionVersion,
    catalog.profile.catalogVersion,
    catalog.profile.sourceMode,
    catalog.profile.runtimeImportPolicy,
    catalog.profile.navigationPolicy
  ].some((value) => !safeCatalogText(value, 240))) {
    return "内容目录 Profile 缺少版本、来源或导航策略身份。";
  }
  if (!validUtcDateStamp(catalog.profile.snapshotDate)) {
    return "内容目录缺少有效审计快照日期。";
  }
  if (!catalog.knownBoundaries.length || hasBlankOrDuplicateText(catalog.knownBoundaries)) {
    return "内容目录缺少可展示且互不重复的已知边界。";
  }
  const countValues = [
    catalog.counts.systems,
    catalog.counts.liveActive,
    catalog.counts.staticIsolatedSnapshots,
    catalog.counts.expertApproved,
    catalog.counts.formalPublished
  ];
  if (countValues.some((count) => !Number.isSafeInteger(count) || count < 0)) return "内容目录汇总包含无效计数。";
  if (catalog.counts.systems !== catalog.systems.length) return "内容目录体系汇总与实际卡片数量不一致。";
  if (catalog.systems.length !== RESEARCH_SYSTEM_IDS.length) return "内容目录体系数量与权威体系登记不一致。";
  const orderMismatchIndex = catalog.systems.findIndex((system, index) => system.systemId !== RESEARCH_SYSTEM_IDS[index]);
  if (orderMismatchIndex >= 0) {
    return `内容目录第 ${orderMismatchIndex + 1} 个体系与权威登记顺序不一致。`;
  }
  if (catalog.counts.expertApproved !== 0 || catalog.counts.formalPublished !== 0) {
    return "当前内容目录不得声明专家批准或正式发布项目。";
  }
  const liveSystems = catalog.systems.filter((system) => system.catalogState === "live_active");
  if (liveSystems.length !== 1 || liveSystems[0]?.systemId !== "bazi") {
    return "当前内容目录必须且只能保留八字这一条主应用实时目录。";
  }

  const systemIds = new Set<string>();
  let liveActive = 0;
  let staticIsolatedSnapshots = 0;
  let expertApproved = 0;
  let formalPublished = 0;
  for (const system of catalog.systems) {
    if (!safeCatalogSystemId(system.systemId) || systemIds.has(system.systemId)) return `内容目录包含空、重复或不安全的体系 ID：${system.systemId}。`;
    if (!EXPECTED_SYSTEM_IDS.has(system.systemId)) return `内容目录包含未登记体系 ID：${system.systemId}。`;
    systemIds.add(system.systemId);
    if (!CATALOG_STATE_IDS.has(system.catalogState)) return `内容目录体系 ${system.systemId} 的目录状态无效。`;
    if (!validUtcDateStamp(system.auditedAt) || system.auditedAt !== catalog.profile.snapshotDate) return `内容目录体系 ${system.systemId} 的审计日期与目录快照不一致。`;
    if ([
      system.label,
      system.internationalLabel,
      system.stateLabel,
      system.inventoryMetricLabel,
      system.inventoryUnit,
      system.boundary
    ].some((value) => !safeCatalogText(value))) return `内容目录体系 ${system.systemId} 缺少安全标签、计量口径或边界。`;
    if (
      system.sections.length > MAX_CATALOG_ITEMS
      || system.derivedCoverage.length > MAX_CATALOG_ITEMS
      || system.currentGaps.length > MAX_CATALOG_ITEMS
      || system.evidenceDocuments.length > MAX_CATALOG_ITEMS
      || system.representativeSources.length > MAX_CATALOG_ITEMS
    ) return `内容目录体系 ${system.systemId} 的嵌套目录超过本地展示上限。`;
    const systemCounts = [
      system.fixedInventoryCount,
      system.sourceRegistryCount,
      system.expertApprovedCount,
      system.formalPublishedCount
    ];
    if (systemCounts.some((count) => !Number.isSafeInteger(count) || count < 0 || count > MAX_CATALOG_COUNT)) return `内容目录体系 ${system.systemId} 包含无效或过大的计数。`;
    if (system.expertTruthClaimed || system.formalActivationAllowed || system.expertApprovedCount > 0 || system.formalPublishedCount > 0) return `内容目录体系 ${system.systemId} 错误声明了专家批准、专家真值或正式发布能力。`;
    if (system.expertApprovedCount > system.fixedInventoryCount || system.formalPublishedCount > system.expertApprovedCount) return `内容目录体系 ${system.systemId} 的批准或发布计数超过上游范围。`;

    const sectionIds = new Set<string>();
    let fixedInventoryCount = 0;
    for (const section of system.sections) {
      if (!safeCatalogSystemId(section.sectionId) || sectionIds.has(section.sectionId)) return `内容目录体系 ${system.systemId} 包含空、重复或不安全的分项 ID：${section.sectionId}。`;
      sectionIds.add(section.sectionId);
      if (!REVIEW_STATE_IDS.has(section.reviewState)) return `内容目录体系 ${system.systemId} 包含无效审稿状态。`;
      if (!safeCatalogText(section.label, 240) || !safeCatalogText(section.unitLabel, 120) || !Number.isSafeInteger(section.itemCount) || section.itemCount < 0 || section.itemCount > MAX_CATALOG_COUNT) return `内容目录体系 ${system.systemId} 包含无效分项。`;
      fixedInventoryCount += section.itemCount;
      if (!Number.isSafeInteger(fixedInventoryCount) || fixedInventoryCount > MAX_CATALOG_COUNT) return `内容目录体系 ${system.systemId} 的分项目录总计超出安全计数范围。`;
    }
    if (fixedInventoryCount !== system.fixedInventoryCount) return `内容目录体系 ${system.systemId} 的固定目录总计与分项之和不一致。`;
    if (
      hasBlankOrDuplicateText(system.derivedCoverage)
      || hasBlankOrDuplicateText(system.currentGaps)
      || hasBlankOrDuplicateText(system.evidenceDocuments)
    ) {
      return `内容目录体系 ${system.systemId} 的派生层、缺口或证据路径包含空白或重复项。`;
    }

    const sourceIds = new Set<string>();
    if (system.representativeSources.length > system.sourceRegistryCount) return `内容目录体系 ${system.systemId} 的代表来源超过来源登记总数。`;
    for (const source of system.representativeSources) {
      if (!isResearchContentSourceId(source.sourceId) || sourceIds.has(source.sourceId)) return `内容目录体系 ${system.systemId} 包含空、重复或不安全的来源 ID：${source.sourceId}。`;
      sourceIds.add(source.sourceId);
      if (!SOURCE_ROLE_IDS.has(source.role)) return `内容目录体系 ${system.systemId} 包含无效来源角色。`;
      if (!safeCatalogText(source.title, 500) || !safeCatalogSourceUrl(source.url)) return `内容目录体系 ${system.systemId} 包含空标题或非安全 HTTPS 代表来源。`;
    }

    if (system.catalogState === "live_active") {
      liveActive += 1;
      if (!system.runtimeReachable || !safeCatalogEntryHref(system.entryHref) || !safeCatalogText(system.entryLabel, 160)) return `实时目录体系 ${system.systemId} 缺少安全主应用入口。`;
    } else {
      staticIsolatedSnapshots += 1;
      if (system.runtimeReachable || system.entryHref !== null || system.entryLabel !== null) {
        return `隔离目录体系 ${system.systemId} 不得拥有主应用入口。`;
      }
    }
    expertApproved += system.expertApprovedCount;
    formalPublished += system.formalPublishedCount;
  }
  const missingSystemId = RESEARCH_SYSTEM_IDS.find((systemId) => !systemIds.has(systemId));
  if (missingSystemId) return `内容目录缺少已登记体系 ID：${missingSystemId}。`;
  if (
    catalog.counts.liveActive !== liveActive
    || catalog.counts.staticIsolatedSnapshots !== staticIsolatedSnapshots
    || catalog.counts.expertApproved !== expertApproved
    || catalog.counts.formalPublished !== formalPublished
  ) {
    return "内容目录汇总与逐体系计数不一致。";
  }
  return null;
}

const CATALOG_BINDING_ISSUE = catalogBindingIssue();

function ResearchContentCatalogCard({
  system,
  ordinal,
  total,
  jumpId
}: {
  system: ResearchContentCatalogSystem;
  ordinal: number;
  total: number;
  jumpId: string;
}) {
  const cardId = useId();
  const titleId = `${cardId}-title`;
  const boundaryId = `${cardId}-boundary`;
  const runtimeEntry = system.runtimeReachable && safeCatalogEntryHref(system.entryHref) && safeCatalogText(system.entryLabel, 160)
    ? { href: system.entryHref, label: system.entryLabel }
    : null;
  const primaryGap = system.currentGaps[0] ?? "未登记额外缺口；仍不等于已经完成专家批准或正式发布。";

  return (
    <li
      id={`research-content-system-${system.systemId}`}
      className={`research-content-catalog-card research-content-catalog-card--${system.catalogState}`}
      data-system-id={system.systemId}
      data-catalog-state={system.catalogState}
      data-runtime-reachable={String(system.runtimeReachable)}
      data-entry-href={system.entryHref ?? "none"}
      data-entry-enabled={String(runtimeEntry !== null)}
      data-expert-approved-count={system.expertApprovedCount}
      data-formal-published-count={system.formalPublishedCount}
      data-expert-truth-claimed={String(system.expertTruthClaimed)}
      data-formal-activation-allowed={String(system.formalActivationAllowed)}
      {...CATALOG_RELEASE_BOUNDARY_ATTRIBUTES}
    >
      <article aria-labelledby={titleId} aria-describedby={boundaryId}>
        <header>
          <div>
            <span className="research-content-catalog-card__ordinal" aria-hidden="true">{String(ordinal).padStart(2, "0")}</span>
            <p className="eyebrow">{system.internationalLabel}</p>
            <h3 id={titleId}>{system.label}</h3>
          </div>
          <StatusPill tone={system.catalogState === "live_active" ? "info" : "warning"}>
            {system.stateLabel}
          </StatusPill>
        </header>

        <dl className="research-content-catalog-metrics" aria-label={`${system.label}内容目录数字`}>
          <div data-metric-state="inventory">
            <dt>{system.inventoryMetricLabel}</dt>
            <dd><strong>{system.fixedInventoryCount}</strong><span>{system.inventoryUnit}</span></dd>
          </div>
          <div data-metric-state="sources">
            <dt>来源登记</dt>
            <dd><strong>{system.sourceRegistryCount}</strong><span>个来源</span></dd>
          </div>
          <div data-metric-state="locked">
            <dt><Lock aria-hidden="true" />专家批准</dt>
            <dd><strong>{system.expertApprovedCount}</strong><span>项 · 无专家批准记录</span></dd>
          </div>
          <div data-metric-state="locked">
            <dt><Lock aria-hidden="true" />正式发布</dt>
            <dd><strong>{system.formalPublishedCount}</strong><span>项 · 未发布</span></dd>
          </div>
        </dl>

        <div
          className="research-content-catalog-route"
          data-route-state={runtimeEntry ? "runtime" : "snapshot"}
          role="note"
        >
          <span className="research-content-catalog-route__index" aria-hidden="true">{runtimeEntry ? "RUNTIME" : "ISOLATED"}</span>
          <p>
            <small>当前阅读路径</small>
            <strong>{runtimeEntry ? `从${runtimeEntry.label}进入本地主应用实时目录` : "只读本卡隔离静态快照"}</strong>
          </p>
          <span className="research-content-catalog-route__gap"><b>首个未完成项</b><small>{primaryGap}</small></span>
        </div>

        <section className="research-content-catalog-block" aria-labelledby={`${titleId}-sections`}>
          <h4 id={`${titleId}-sections`}>固定目录分项</h4>
          <ul className="research-content-catalog-sections">
            {system.sections.map((section) => (
              <li key={section.sectionId} data-review-state={section.reviewState}>
                <span>{section.label}</span>
                <strong>{section.itemCount}</strong>
                <small>{section.unitLabel}</small>
                <em>{REVIEW_STATE_LABELS[section.reviewState]}</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="research-content-catalog-block" aria-labelledby={`${titleId}-derived`}>
          <h4 id={`${titleId}-derived`}>派生阅读层 <small>不计入固定目录</small></h4>
          <ul className="research-content-catalog-copy-list">
            {system.derivedCoverage.length
              ? system.derivedCoverage.map((item) => <li key={item}>{item}</li>)
              : <li>当前未登记派生阅读层。</li>}
          </ul>
        </section>

        <section className="research-content-catalog-block" aria-labelledby={`${titleId}-sources`}>
          <h4 id={`${titleId}-sources`}>代表来源 <small>{system.representativeSources.length}/{system.sourceRegistryCount}</small></h4>
          <ul className="research-content-catalog-sources">
            {system.representativeSources.length ? system.representativeSources.map((source) => {
              const sourceHost = catalogSourceHost(source.url);
              return (
                <li key={source.sourceId}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    aria-label={`${source.title}，${SOURCE_ROLE_LABELS[source.role]}，来源域名 ${sourceHost}，在新窗口打开`}
                  >
                    <span>
                      <small className="research-content-catalog-source-meta"><span>{SOURCE_ROLE_LABELS[source.role]}</span><span>{sourceHost}</span></small>
                      <strong>{source.title}</strong>
                      <code>{source.sourceId}</code>
                    </span>
                    <ExternalLink aria-hidden="true" />
                  </a>
                </li>
              );
            }) : <li>当前未登记可公开定位的代表来源。</li>}
          </ul>
        </section>

        <section className="research-content-catalog-block" aria-labelledby={`${titleId}-gaps`}>
          <h4 id={`${titleId}-gaps`}>尚未完成</h4>
          <ul className="research-content-catalog-copy-list research-content-catalog-copy-list--gaps">
            {system.currentGaps.length
              ? system.currentGaps.map((gap) => <li key={gap}>{gap}</li>)
              : <li>当前目录未登记额外缺口；这不等于已完成专家验证或正式发布。</li>}
          </ul>
        </section>

        <details className="research-content-catalog-evidence">
          <summary>查看工程证据文档路径 <small>{system.evidenceDocuments.length} 项</small></summary>
          <p className="research-content-catalog-evidence-boundary" role="note"><Lock aria-hidden="true" /><span>这些路径只定位工程审计材料，不证明原文版本、现实专家身份、术数结论或公开发布授权。</span></p>
          <ul>
            {system.evidenceDocuments.length
              ? system.evidenceDocuments.map((documentPath) => <li key={documentPath}><code>{documentPath}</code></li>)
              : <li>当前未登记工程证据文档路径。</li>}
          </ul>
        </details>

        {runtimeEntry ? (
          <AppLink href={runtimeEntry.href} className="secondary-action research-content-catalog-entry">
            {runtimeEntry.label}
          </AppLink>
        ) : (
          <p className="research-content-catalog-no-entry">
            <Lock aria-hidden="true" />主应用无入口；此卡不能打开隔离预览。
          </p>
        )}

        <p className="research-content-catalog-boundary" id={boundaryId}>{system.boundary}</p>
        <nav className="research-content-catalog-card-nav" aria-label={`${system.label}卡片导航`}>
          <a href={`#${jumpId}`}>返回快速定位</a>
          <span>目录 {ordinal}/{total}</span>
        </nav>
      </article>
    </li>
  );
}

export function ResearchContentCatalog() {
  const titleId = useId();
  const jumpId = `${titleId}-jump`;
  if (CATALOG_BINDING_ISSUE) {
    return (
      <section
        className="research-content-catalog-section"
        aria-labelledby={titleId}
        data-binding-state="invalid"
        data-expert-truth-claimed="false"
        data-formal-activation-allowed="false"
        {...CATALOG_RELEASE_BOUNDARY_ATTRIBUTES}
      >
        <div className="research-content-catalog-heading">
          <div><p className="eyebrow">Content inventory</p><h2 id={titleId}>跨术数内容总目录</h2></div>
          <StatusPill tone="cinnabar">失败关闭</StatusPill>
        </div>
        <div className="research-atlas-integrity-error" role="alert">
          <strong>内容目录绑定不一致</strong>
          <p>{safeVisibleText(CATALOG_BINDING_ISSUE, "内容目录绑定校验失败。", 800)} 为避免错误排名、开放入口或发布计数，目录卡片已全部拒绝显示。</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="research-content-catalog-section"
      aria-labelledby={titleId}
      data-catalog-profile={RESEARCH_CONTENT_CATALOG.profile.projectionVersion}
      data-source-mode={RESEARCH_CONTENT_CATALOG.profile.sourceMode}
      data-runtime-import-policy={RESEARCH_CONTENT_CATALOG.profile.runtimeImportPolicy}
      data-navigation-policy={RESEARCH_CONTENT_CATALOG.profile.navigationPolicy}
      data-scoring-allowed={String(RESEARCH_CONTENT_CATALOG.profile.scoringAllowed)}
      data-expert-truth-claimed={String(RESEARCH_CONTENT_CATALOG.profile.expertTruthClaimed)}
      data-formal-activation-allowed={String(RESEARCH_CONTENT_CATALOG.profile.formalActivationAllowed)}
      data-binding-state="bound"
      {...CATALOG_RELEASE_BOUNDARY_ATTRIBUTES}
    >
      <div className="research-content-catalog-heading">
        <div>
          <p className="eyebrow">Content inventory</p>
          <h2 id={titleId}>跨术数内容总目录</h2>
        </div>
        <div>
          <StatusPill tone="warning">
            {RESEARCH_CONTENT_CATALOG.counts.systems} 体系 · 专家批准记录 {RESEARCH_CONTENT_CATALOG.counts.expertApproved}
          </StatusPill>
          <p>八字读取主应用实时审稿清单；紫微与西洋只显示 {RESEARCH_CONTENT_CATALOG.profile.snapshotDate} 隔离源码静态快照。</p>
        </div>
      </div>

      <aside className="research-content-catalog-count-boundary" aria-label="目录数字与发布口径">
        <div>
          <strong>数字不能横向排名</strong>
          <small>legacy-v13 · Schema 13 · migration null · public release false</small>
        </div>
        <p>{RESEARCH_CONTENT_CATALOG.knownBoundaries[0]}</p>
      </aside>

      <dl className="research-atlas-ledger" aria-label="跨术数内容目录状态账本">
        <div><dt>目录版本</dt><dd>{RESEARCH_CONTENT_CATALOG.profile.catalogVersion}</dd></div>
        <div><dt>审计快照</dt><dd>{RESEARCH_CONTENT_CATALOG.profile.snapshotDate}</dd></div>
        <div><dt>主应用实时目录</dt><dd>{RESEARCH_CONTENT_CATALOG.counts.liveActive}/{RESEARCH_CONTENT_CATALOG.counts.systems}</dd></div>
        <div data-ledger-state="locked"><dt>正式发布记录</dt><dd>{RESEARCH_CONTENT_CATALOG.counts.formalPublished}</dd></div>
        <div data-ledger-state="locked"><dt>公开发布授权</dt><dd>否</dd></div>
      </dl>

      <div className="research-atlas-state-key" role="group" aria-label="内容目录状态图例">
        <strong>目录状态 · 不是成熟度评分</strong>
        <ul>
          <li data-atlas-state="runtime">主应用实时目录</li>
          <li data-atlas-state="isolated">隔离静态快照</li>
          <li data-atlas-state="approval">专家批准与正式发布仍为 0</li>
        </ul>
      </div>

      <nav id={jumpId} tabIndex={-1} className="research-content-catalog-jump" aria-label="快速定位内容体系">
        <strong>快速定位</strong>
        <ul>
          {RESEARCH_CONTENT_CATALOG.systems.map((system, index) => (
            <li key={system.systemId}>
              <a href={`#research-content-system-${system.systemId}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{system.label}</strong>
                <small>{system.catalogState === "live_active" ? "本地主应用实时目录" : "隔离静态快照"}</small>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <ul className="research-content-catalog-grid" aria-label="八字、紫微斗数与西洋星盘内容目录">
        {RESEARCH_CONTENT_CATALOG.systems.map((system, index) => (
          <ResearchContentCatalogCard
            key={system.systemId}
            system={system}
            ordinal={index + 1}
            total={RESEARCH_CONTENT_CATALOG.systems.length}
            jumpId={jumpId}
          />
        ))}
      </ul>

      <ul className="research-content-catalog-boundaries" aria-label="跨术数内容边界">
        {RESEARCH_CONTENT_CATALOG.knownBoundaries.slice(1).map((boundary) => <li key={boundary}>{boundary}</li>)}
      </ul>
    </section>
  );
}
