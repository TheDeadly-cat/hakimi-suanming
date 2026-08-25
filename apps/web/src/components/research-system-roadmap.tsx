import { Lock } from "lucide-react";
import { useId } from "react";
import { RESEARCH_CONTENT_CATALOG } from "../lib/research-content-catalog";
import { AppLink } from "../lib/router";
import { safeVisibleText } from "../lib/visible-text";
import {
  RESEARCH_SYSTEM_IDS,
  RESEARCH_SYSTEM_ROADMAP,
  type ResearchSystemDeliveryStatus,
  type ResearchSystemRoadmapItem
} from "../lib/research-system-roadmap";
import { StatusPill } from "./status-pill";
import "./research-system-overview.css";
import "./research-system-roadmap.css";

const deliveryStatusLabels: Record<ResearchSystemDeliveryStatus, string> = {
  research_preview: "主应用研究预览",
  isolated_engineering_preview: "隔离工程快照",
  diagnostic_preview: "诊断源码"
};
const EXPECTED_SYSTEM_IDS = new Set<string>(RESEARCH_SYSTEM_IDS);
const DELIVERY_STATUS_IDS = new Set<string>(Object.keys(deliveryStatusLabels));
const CONTENT_CATALOG_BY_SYSTEM_ID = new Map(RESEARCH_CONTENT_CATALOG.systems.map((system) => [system.systemId, system] as const));
const UNSAFE_ROADMAP_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const UNSAFE_ROADMAP_HREF_PATTERN = /[\\\u0000-\u0020\u007f-\u009f\u00a0\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u;
const MAX_ROADMAP_TEXT_LENGTH = 2_000;
const MAX_ROADMAP_STEPS = 128;
const MAX_RESEARCH_SYSTEMS = 32;
const INITIAL_ROADMAP_STEP_COUNT = 3;

const RESEARCH_ROADMAP_SAFETY_ATTRIBUTES = {
  "data-release-family": "legacy-v13",
  "data-release-identity": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-expert-truth-claimed": "false",
  "data-scientific-validity-claimed": "false",
  "data-public-release-authorized": "false",
  "data-formal-activation-allowed": "false",
  "data-display-authority": "roadmap-only",
  "data-mutation-mode": "read-only-no-mutation",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-record-write-performed": "false",
  "data-record-write-state": "not_started",
  "data-chart-or-storage-mutation-performed": "false"
} as const;

function nonBlankRoadmapText(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_ROADMAP_TEXT_LENGTH
    && value === value.trim()
    && !UNSAFE_ROADMAP_TEXT_PATTERN.test(value);
}

function safeRoadmapEntryHref(value: unknown): value is string {
  if (
    typeof value !== "string"
    || value.length > 2_048
    || value !== value.trim()
    || !value.startsWith("/")
    || value.startsWith("//")
    || UNSAFE_ROADMAP_HREF_PATTERN.test(value)
  ) return false;
  try {
    const decodedValue = decodeURIComponent(value);
    const decodedPath = decodedValue.split(/[?#]/u, 1)[0] ?? "";
    return decodedPath.startsWith("/")
      && !decodedPath.startsWith("//")
      && !UNSAFE_ROADMAP_HREF_PATTERN.test(decodedValue)
      && !decodedPath.split("/").some((segment) => segment === "." || segment === "..");
  } catch {
    return false;
  }
}

function validRoadmapSnapshotDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function roadmapStepsIssue(values: readonly string[]): boolean {
  return values.length > MAX_ROADMAP_STEPS
    || values.some((value) => !nonBlankRoadmapText(value))
    || new Set(values).size !== values.length;
}

function roadmapCatalogBindingIssue(): string | null {
  const registeredSystemIds: readonly string[] = RESEARCH_SYSTEM_IDS;
  const roadmapItems: readonly ResearchSystemRoadmapItem[] = RESEARCH_SYSTEM_ROADMAP;
  if (registeredSystemIds.length === 0 || registeredSystemIds.length > MAX_RESEARCH_SYSTEMS) {
    return `权威体系登记必须包含 1 至 ${MAX_RESEARCH_SYSTEMS} 个体系。`;
  }
  if (roadmapItems.length !== registeredSystemIds.length) {
    return "研究路线与权威体系登记的数量不一致。";
  }
  if (RESEARCH_CONTENT_CATALOG.systems.length !== registeredSystemIds.length) {
    return "内容目录与权威体系登记的数量不一致。";
  }
  if (!validRoadmapSnapshotDate(RESEARCH_CONTENT_CATALOG.profile.snapshotDate)) {
    return "内容目录缺少有效的路线图审计快照日期。";
  }
  if (
    RESEARCH_CONTENT_CATALOG.profile.scoringAllowed
    || RESEARCH_CONTENT_CATALOG.profile.expertTruthClaimed
    || RESEARCH_CONTENT_CATALOG.profile.formalActivationAllowed
    || RESEARCH_CONTENT_CATALOG.counts.expertApproved !== 0
    || RESEARCH_CONTENT_CATALOG.counts.formalPublished !== 0
  ) {
    return "内容目录错误开放了评分、专家真值、专家批准或正式发布边界。";
  }
  const roadmapOrderMismatch = roadmapItems.findIndex((item, index) => item.systemId !== registeredSystemIds[index]);
  if (roadmapOrderMismatch >= 0) {
    return `研究路线第 ${roadmapOrderMismatch + 1} 个体系与权威登记顺序不一致。`;
  }
  const catalogOrderMismatch = RESEARCH_CONTENT_CATALOG.systems.findIndex((system, index) => system.systemId !== registeredSystemIds[index]);
  if (catalogOrderMismatch >= 0) {
    return `内容目录第 ${catalogOrderMismatch + 1} 个体系与权威登记顺序不一致。`;
  }
  const activeItems = roadmapItems.filter((item) => item.status === "active");
  if (activeItems.length !== 1 || activeItems[0]?.systemId !== "bazi") {
    return "当前主应用必须且只能保留八字这一条活动研究入口。";
  }
  if (CONTENT_CATALOG_BY_SYSTEM_ID.size !== RESEARCH_CONTENT_CATALOG.systems.length) {
    return "内容目录包含重复体系 ID。";
  }
  const roadmapIds = new Set<string>();
  for (const item of roadmapItems) {
    const itemStatus: string = item.status;
    const deliveryStatus: string = item.deliveryStatus;
    if (item.systemId.length > 80 || item.systemId !== item.systemId.trim() || !/^[a-z0-9][a-z0-9_-]*$/i.test(item.systemId)) return `研究路线包含不可用于唯一界面绑定的体系 ID：${item.systemId}。`;
    if (!EXPECTED_SYSTEM_IDS.has(item.systemId)) return `研究路线包含未登记体系 ID：${item.systemId}。`;
    if (itemStatus !== "active" && itemStatus !== "planned") return `研究路线体系 ${item.systemId} 的状态无效。`;
    if (!DELIVERY_STATUS_IDS.has(deliveryStatus)) return `研究路线体系 ${item.systemId} 的交付层无效。`;
    if (![item.label, item.internationalLabel, item.summary, item.boundary].every(nonBlankRoadmapText)) {
      return `研究路线体系 ${item.systemId} 缺少标签、摘要或边界。`;
    }
    if (roadmapIds.has(item.systemId)) return `研究路线包含重复体系 ID：${item.systemId}。`;
    roadmapIds.add(item.systemId);
    const registeredSteps = item.status === "active" ? item.deliveredScope : item.independentRequirements;
    if (!Array.isArray(registeredSteps) || registeredSteps.length === 0) {
      return `研究路线体系 ${item.systemId} 没有登记可核对的范围或独立要求。`;
    }
    if (roadmapStepsIssue(registeredSteps)) {
      return `研究路线体系 ${item.systemId} 的范围或独立要求包含过多、空白、不安全或重复条目。`;
    }
    const catalog = CONTENT_CATALOG_BY_SYSTEM_ID.get(item.systemId);
    if (!catalog) return `研究路线体系 ${item.systemId} 缺少内容目录绑定。`;
    if (catalog.label !== item.label || catalog.internationalLabel !== item.internationalLabel) {
      return `研究路线体系 ${item.systemId} 与内容目录标签不一致。`;
    }
    if (
      catalog.expertTruthClaimed
      || catalog.formalActivationAllowed
      || catalog.expertApprovedCount !== 0
      || catalog.formalPublishedCount !== 0
    ) {
      return `内容目录体系 ${item.systemId} 错误声明了专家真值、专家批准或正式发布能力。`;
    }
    if (item.status === "active") {
      if (
        item.deliveryStatus !== "research_preview"
        || !nonBlankRoadmapText(item.entryLabel)
        || !safeRoadmapEntryHref(item.entryHref)
        || !catalog.runtimeReachable
        || catalog.catalogState !== "live_active"
        || catalog.entryHref !== item.entryHref
        || catalog.entryLabel !== item.entryLabel
      ) {
        return `活动体系 ${item.systemId} 的运行时入口与内容目录不一致。`;
      }
    } else if (
      deliveryStatus === "research_preview"
      || !nonBlankRoadmapText(item.progressNote)
      || catalog.runtimeReachable
      || catalog.catalogState !== "static_isolated_snapshot"
      || catalog.entryHref !== null
      || catalog.entryLabel !== null
      || item.entryHref !== null
      || ("entryLabel" in item && item.entryLabel !== null)
    ) {
      return `规划体系 ${item.systemId} 不得拥有主应用运行时入口。`;
    }
  }
  const missingRoadmapId = registeredSystemIds.find((systemId) => !roadmapIds.has(systemId));
  if (missingRoadmapId) return `研究路线缺少已登记体系 ID：${missingRoadmapId}。`;
  return null;
}

const ROADMAP_CATALOG_BINDING_ISSUE = roadmapCatalogBindingIssue();
type RoadmapDeliveryCounts = Record<ResearchSystemDeliveryStatus, number>;

function countRoadmapDeliveryStatuses(): Readonly<RoadmapDeliveryCounts> {
  const counts: RoadmapDeliveryCounts = {
    research_preview: 0,
    isolated_engineering_preview: 0,
    diagnostic_preview: 0
  };
  if (!ROADMAP_CATALOG_BINDING_ISSUE) {
    for (const item of RESEARCH_SYSTEM_ROADMAP) counts[item.deliveryStatus] += 1;
  }
  return Object.freeze(counts);
}

const ROADMAP_COUNTS = countRoadmapDeliveryStatuses();

function ResearchSystemRoadmapCard({ item, ordinal }: { item: ResearchSystemRoadmapItem; ordinal: number }) {
  const cardId = useId();
  const titleId = `${cardId}-title`;
  const statusId = `${cardId}-status`;
  const catalog = CONTENT_CATALOG_BY_SYSTEM_ID.get(item.systemId)!;
  const registeredSteps = item.status === "active"
    ? item.deliveredScope
    : item.independentRequirements;
  const initialSteps = registeredSteps.slice(0, INITIAL_ROADMAP_STEP_COUNT);
  const additionalSteps = registeredSteps.slice(INITIAL_ROADMAP_STEP_COUNT);
  const scopeLabel = item.status === "active" ? "当前范围" : "独立实现要求";
  const nextStep = item.status === "active"
    ? {
        label: "当前可执行动作",
        title: `进入${item.entryLabel}`,
        detail: `当前登记 ${registeredSteps.length} 项可用范围；入口只打开研究预览，不扩大内容、真值或正式发布权限。`
      }
    : {
        label: "首项登记要求",
        title: item.independentRequirements[0] ?? "登记独立实现要求",
        detail: `这是 ${registeredSteps.length} 项独立要求中的首项；完成后也不会自动开放入口，其余要求仍须逐项满足。`
      };

  return (
    <li
      id={`research-roadmap-system-${item.systemId}`}
      className={`research-system-card research-system-card--${item.status}`}
      data-ordinal={ordinal}
      data-delivery-status={item.deliveryStatus}
      data-runtime-reachable={item.status === "active"}
      data-catalog-state={catalog.catalogState}
      data-catalog-snapshot={RESEARCH_CONTENT_CATALOG.profile.snapshotDate}
      data-registered-step-count={registeredSteps.length}
      {...RESEARCH_ROADMAP_SAFETY_ATTRIBUTES}
      tabIndex={-1}
    >
      <article aria-labelledby={titleId} aria-describedby={statusId}>
        <header>
          <div>
            <span className="research-system-card__ordinal" aria-hidden="true">{String(ordinal).padStart(2, "0")}</span>
            <p className="eyebrow">{item.internationalLabel}</p>
            <h3 id={titleId}>{item.label}</h3>
          </div>
          {item.status === "active"
            ? <StatusPill tone="info">本地主应用研究预览</StatusPill>
            : item.deliveryStatus === "isolated_engineering_preview"
              ? <StatusPill tone="warning">隔离工程快照</StatusPill>
              : <StatusPill tone="warning">诊断源码</StatusPill>}
        </header>
        <p>{item.summary}</p>
        <dl className="research-system-card-ledger" aria-label={`${item.label}交付状态`}>
          <div><dt>体系 ID</dt><dd><code>{item.systemId}</code></dd></div>
          <div><dt>内容快照</dt><dd><time dateTime={RESEARCH_CONTENT_CATALOG.profile.snapshotDate}>{RESEARCH_CONTENT_CATALOG.profile.snapshotDate}</time></dd></div>
          <div><dt>运行时入口</dt><dd>{item.status === "active" ? "主应用可达" : "主应用未开放"}</dd></div>
          <div><dt>交付层</dt><dd>{deliveryStatusLabels[item.deliveryStatus]}</dd></div>
        </dl>
        <p className="research-system-boundary">{item.boundary}</p>
        <div
          className="research-system-next-step"
          data-next-step-state={item.status === "active" ? "available" : "locked"}
          role="note"
        >
          <span className="research-system-next-step__index" aria-hidden="true">{item.status === "active" ? "LOCAL" : "LOCKED"}</span>
          <p><small>{nextStep.label}</small><strong>{nextStep.title}</strong></p>
          <span className="research-system-next-step__boundary">{nextStep.detail}</span>
        </div>
        <ul
          className="research-system-scope"
          data-additional-step-count={additionalSteps.length}
          aria-label={`${item.label}${scopeLabel}`}
        >
          {initialSteps.length
            ? initialSteps.map((step) => <li key={step}>{step}</li>)
            : <li>当前未登记{scopeLabel}；不据此开放或扩大主应用能力。</li>}
        </ul>
        {additionalSteps.length ? (
          <details className="research-system-scope-more" data-remaining-count={additionalSteps.length}>
            <summary><span>其余{scopeLabel}</span><strong>{additionalSteps.length} 项</strong></summary>
            <ul className="research-system-scope" aria-label={`${item.label}其余${scopeLabel}`}>
              {additionalSteps.map((step) => <li key={step}>{step}</li>)}
            </ul>
          </details>
        ) : null}
        {item.status === "active" ? (
          <>
            <AppLink href={item.entryHref} className="secondary-action research-system-entry">
              {item.entryLabel}
            </AppLink>
            <p className="research-system-state" id={statusId}>本地主应用当前可达，但仍只属于工程研究预览，不构成正式激活或公开发布授权。</p>
          </>
        ) : (
          <>
            <p className="research-system-no-entry"><Lock aria-hidden="true" />主应用入口保持关闭</p>
            <p className="research-system-state" id={statusId}>{item.progressNote}</p>
          </>
        )}
      </article>
    </li>
  );
}

export function ResearchSystemRoadmap() {
  const titleId = useId();
  if (ROADMAP_CATALOG_BINDING_ISSUE) {
    return (
      <section
        className="research-system-roadmap-section"
        aria-labelledby={titleId}
        data-binding-state="invalid"
        {...RESEARCH_ROADMAP_SAFETY_ATTRIBUTES}
      >
        <div className="research-system-roadmap-heading">
          <div><p className="eyebrow">Research systems</p><h2 id={titleId}>研究体系路线</h2></div>
          <StatusPill tone="cinnabar">失败关闭</StatusPill>
        </div>
        <div className="research-atlas-integrity-error" role="alert">
          <strong>研究路线与内容目录绑定不一致</strong>
          <p>{safeVisibleText(ROADMAP_CATALOG_BINDING_ISSUE, "研究路线绑定校验失败。", 800)} 为避免错误开放入口，路线卡片已全部拒绝显示。</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="research-system-roadmap-section"
      aria-labelledby={titleId}
      data-binding-state="bound"
      data-system-count={RESEARCH_SYSTEM_ROADMAP.length}
      data-catalog-snapshot={RESEARCH_CONTENT_CATALOG.profile.snapshotDate}
      {...RESEARCH_ROADMAP_SAFETY_ATTRIBUTES}
    >
      <div className="research-system-roadmap-heading">
        <div>
          <p className="eyebrow">Research systems</p>
          <h2 id={titleId}>研究体系路线</h2>
        </div>
        <p>当前主应用只提供八字工程研究预览。紫微斗数与西洋星盘保持独立来源，不会为了“看起来已融合”而借用八字字段、算法或真值。</p>
      </div>
      <dl className="research-atlas-ledger" aria-label="研究体系交付状态账本">
        <div><dt>主应用研究预览</dt><dd>{ROADMAP_COUNTS.research_preview}</dd></div>
        <div><dt>隔离工程快照</dt><dd>{ROADMAP_COUNTS.isolated_engineering_preview}</dd></div>
        <div><dt>诊断源码</dt><dd>{ROADMAP_COUNTS.diagnostic_preview}</dd></div>
        <div data-ledger-state="locked"><dt>正式激活记录</dt><dd>0</dd></div>
        <div data-ledger-state="locked"><dt>公开发布授权</dt><dd>否</dd></div>
      </dl>
      <div className="research-atlas-state-key" role="group" aria-label="研究体系状态图例">
        <strong>交付位置 · 不是准确率或成熟度排名</strong>
        <ul>
          <li data-atlas-state="runtime">主应用可达</li>
          <li data-atlas-state="isolated">隔离工程来源</li>
          <li data-atlas-state="diagnostic">诊断源码</li>
        </ul>
      </div>
      <aside className="research-system-roadmap-authority" aria-label="研究路线授权边界">
        <Lock aria-hidden="true" />
        <div>
          <strong>交付位置不等于成熟度，运行入口不等于正式激活</strong>
          <p>本路线只说明代码或快照当前放在哪里。任何体系进入主应用、形成专家真值或公开发布，仍需要独立证据与单独授权。</p>
          <small>legacy-v13 · Schema 13 · migration null · public release false</small>
        </div>
        <span>公开授权 · 否</span>
      </aside>
      <nav className="research-system-roadmap-jump" aria-label="跳转到研究体系路线卡">
        <div className="research-system-roadmap-jump__intro">
          <p className="eyebrow">Route index / 页内索引</p>
          <strong>{RESEARCH_SYSTEM_ROADMAP.length} 个体系 · 审计快照 <time dateTime={RESEARCH_CONTENT_CATALOG.profile.snapshotDate}>{RESEARCH_CONTENT_CATALOG.profile.snapshotDate}</time></strong>
          <span>选择索引只移动到对应登记卡，不开放入口，也不改变交付状态。</span>
        </div>
        <ol>
          {RESEARCH_SYSTEM_ROADMAP.map((item, index) => (
            <li key={item.systemId}>
              <a
                href={`#research-roadmap-system-${item.systemId}`}
                data-delivery-status={item.deliveryStatus}
                data-runtime-reachable={item.status === "active"}
                aria-label={`跳转到${item.label}路线卡`}
              >
                <span className="research-system-roadmap-jump__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="research-system-roadmap-jump__copy"><strong>{item.label}</strong><small>{deliveryStatusLabels[item.deliveryStatus]}</small></span>
                <span className="research-system-roadmap-jump__state">{item.status === "active" ? "主应用可达" : "入口关闭"}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <ul className="research-system-roadmap" aria-label="研究体系路线">
        {RESEARCH_SYSTEM_ROADMAP.map((item, index) => <ResearchSystemRoadmapCard key={item.systemId} item={item} ordinal={index + 1} />)}
      </ul>
      <p className="research-system-roadmap-note">
        未来可共享工作台外壳和经用户确认的原始出生来源；各体系的计算事实、版本、证据、同体系对照与备份仍须独立。跨体系首先只做并列研究，不生成“准确率”或“一致率”；人物关联必须显式、可删除，不按姓名或出生时间自动合并。
      </p>
    </section>
  );
}
