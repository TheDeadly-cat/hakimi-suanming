import { AppLink } from "../lib/router";
import {
  RESEARCH_SYSTEM_ROADMAP,
  type ResearchSystemRoadmapItem
} from "../lib/research-system-roadmap";
import { StatusPill } from "./status-pill";

function ResearchSystemRoadmapCard({ item }: { item: ResearchSystemRoadmapItem }) {
  const titleId = `research-system-${item.systemId}-title`;
  const statusId = `research-system-${item.systemId}-status`;

  return (
    <li className={`research-system-card research-system-card--${item.status}`}>
      <article aria-labelledby={titleId} aria-describedby={statusId}>
        <header>
          <div>
            <p className="eyebrow">{item.internationalLabel}</p>
            <h3 id={titleId}>{item.label}</h3>
          </div>
          {item.status === "active"
            ? <StatusPill tone="jade">当前研究预览</StatusPill>
            : item.deliveryStatus === "isolated_engineering_preview"
              ? <StatusPill tone="info">隔离工程预览</StatusPill>
              : <StatusPill tone="warning">诊断预览</StatusPill>}
        </header>
        <p>{item.summary}</p>
        <p className="research-system-boundary">{item.boundary}</p>
        {item.status === "active" ? (
          <>
            <ul className="research-system-scope" aria-label={`${item.label}当前范围`}>
              {item.deliveredScope.map((scope) => <li key={scope}>{scope}</li>)}
            </ul>
            <AppLink href={item.entryHref} className="secondary-action research-system-entry">
              {item.entryLabel}
            </AppLink>
            <p className="research-system-state" id={statusId}>当前可用，但仍属于工程研究预览。</p>
          </>
        ) : (
          <>
            <ul className="research-system-scope" aria-label={`${item.label}独立实现要求`}>
              {item.independentRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}
            </ul>
            <p className="research-system-state" id={statusId}>{item.progressNote}</p>
          </>
        )}
      </article>
    </li>
  );
}

export function ResearchSystemRoadmap() {
  return (
    <section className="research-system-roadmap-section" aria-labelledby="research-system-roadmap-title">
      <div className="research-system-roadmap-heading">
        <div>
          <p className="eyebrow">Research systems</p>
          <h2 id="research-system-roadmap-title">研究体系路线</h2>
        </div>
        <p>当前只启用八字。紫微斗数与西洋星盘会作为独立研究模块接入，不会为了“看起来已融合”而借用八字字段、算法或真值。</p>
      </div>
      <ul className="research-system-roadmap" aria-label="研究体系路线">
        {RESEARCH_SYSTEM_ROADMAP.map((item) => <ResearchSystemRoadmapCard key={item.systemId} item={item} />)}
      </ul>
      <p className="research-system-roadmap-note">
        未来可共享工作台外壳和经用户确认的原始出生来源；各体系的计算事实、版本、证据、同体系对照与备份仍须独立。跨体系首先只做并列研究，不生成“准确率”或“一致率”；人物关联必须显式、可删除，不按姓名或出生时间自动合并。
      </p>
    </section>
  );
}
