import { AppLink } from "../lib/router";
import { useId } from "react";
import "./interface-primitives.css";

export type ComparisonMode = "formal" | "pair";
export type ComparisonModeNavProps = Readonly<{ active: ComparisonMode }>;

const COMPARISON_MODES = [
  {
    id: "formal",
    index: "01",
    href: "/compare",
    title: "多盘 / 多规则",
    description: "2—4 个确切 Revision",
    boundary: "允许同一 Case 多修订；A 只作字段差异基准，不代表优劣",
    task: "在工程事实层定位同一或不同命盘的字段、规则与可用状态差异",
    handoff: "转入双案例后必须重新满足“两个不同 Case”，不会沿用同 Case 多修订语义。"
  },
  {
    id: "pair",
    index: "02",
    href: "/compare/pair",
    title: "双案例结构研究",
    description: "恰好两个不同 Case · 事实层",
    boundary: "拒绝同一 Case；不评分，也不生成跨盘关系结论",
    task: "在工程事实层并置两个不同案例的结构，不推导关系叙事",
    handoff: "转入多盘模式后 A 才成为差异基准，双案例关系叙事不会被带入。"
  }
] as const satisfies readonly Readonly<{
  id: ComparisonMode;
  index: string;
  href: string;
  title: string;
  description: string;
  boundary: string;
  task: string;
  handoff: string;
}>[];

const EXPECTED_COMPARISON_MODE_IDS = ["formal", "pair"] as const satisfies readonly ComparisonMode[];

const COMPARISON_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-scoring-allowed": "false",
  "data-cross-case-conclusion-generated": "false",
  "data-record-write-performed": "false",
  "data-record-write-state": "not_started",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-public-release-authorized": "false",
  "data-expert-truth-claimed": "false",
} as const;

function safeComparisonModeHref(value: string): boolean {
  return value.startsWith("/")
    && !value.startsWith("//")
    && !/[\\\u0000-\u0020\u007f]/u.test(value);
}

function comparisonModeConfigIssue(): string | null {
  if (COMPARISON_MODES.length !== EXPECTED_COMPARISON_MODE_IDS.length) {
    return "对照模式数量与受支持模式登记不一致。";
  }
  const ids = new Set<string>();
  const indexes = new Set<string>();
  const hrefs = new Set<string>();
  for (let index = 0; index < COMPARISON_MODES.length; index += 1) {
    const mode = COMPARISON_MODES[index]!;
    if (mode.id !== EXPECTED_COMPARISON_MODE_IDS[index]) {
      return `第 ${index + 1} 个对照模式与受支持顺序不一致。`;
    }
    if (ids.has(mode.id) || indexes.has(mode.index) || hrefs.has(mode.href)) {
      return `对照模式 ${mode.id} 包含重复 ID、序号或入口路径。`;
    }
    if (!/^\d{2}$/u.test(mode.index) || !safeComparisonModeHref(mode.href)) {
      return `对照模式 ${mode.id} 的序号或内部入口路径不安全。`;
    }
    if ([mode.title, mode.description, mode.boundary, mode.task, mode.handoff].some((value) => !value.trim())) {
      return `对照模式 ${mode.id} 缺少任务、范围或切换边界。`;
    }
    ids.add(mode.id);
    indexes.add(mode.index);
    hrefs.add(mode.href);
  }
  return null;
}

const COMPARISON_MODE_CONFIG_ISSUE = comparisonModeConfigIssue();

export function ComparisonModeNav({ active }: ComparisonModeNavProps) {
  const modeDescriptionBaseId = useId();
  if (COMPARISON_MODE_CONFIG_ISSUE) {
    return (
      <nav
        className="comparison-mode-nav"
        aria-label="对照研究模式配置不可用"
        data-active-mode="unknown"
        data-binding-state="error"
        {...COMPARISON_SAFETY_ATTRIBUTES}
      >
        <div className="comparison-mode-nav__header">
          <span className="comparison-mode-nav__axis" aria-hidden="true">MODE</span>
          <p><small>COMPARISON PROTOCOL · legacy-v13 / S13 / migration null</small><strong>对照研究入口已关闭</strong></p>
          <span className="comparison-mode-nav__header-current" data-state="error"><small>配置状态</small><strong>绑定异常</strong></span>
        </div>
        <div className="comparison-mode-nav__protocol" data-state="error" role="alert">
          <span className="comparison-mode-nav__protocol-index" aria-hidden="true">MODE !</span>
          <p><small>Mode configuration failed</small><strong>{COMPARISON_MODE_CONFIG_ISSUE}</strong></p>
          <span className="comparison-mode-nav__handoff">系统没有显示任何可能错误、重复或越界的对照入口。</span>
        </div>
      </nav>
    );
  }
  const activeMode = COMPARISON_MODES.find((mode) => mode.id === active);
  const alternateMode = activeMode?.id === "formal"
    ? COMPARISON_MODES[1]
    : activeMode?.id === "pair"
      ? COMPARISON_MODES[0]
      : null;

  return (
    <nav
      className="comparison-mode-nav"
      aria-label={activeMode ? `对照研究模式，当前为${activeMode.title}` : "对照研究模式，当前绑定无法识别"}
      data-active-mode={activeMode?.id ?? "unknown"}
      data-binding-state={activeMode ? "bound" : "error"}
      {...COMPARISON_SAFETY_ATTRIBUTES}
    >
      <div className="comparison-mode-nav__header">
        <span className="comparison-mode-nav__axis" aria-hidden="true">MODE</span>
        <p><small>COMPARISON PROTOCOL · legacy-v13 / S13 / migration null</small><strong>选择对照研究口径</strong></p>
        <span className="comparison-mode-nav__header-current" data-state={activeMode ? "bound" : "error"}>
          <small>当前模式</small>
          <strong>{activeMode?.title ?? "绑定未知"}</strong>
        </span>
      </div>
      <div className="comparison-mode-nav__modes">
        <span className="comparison-mode-nav__switch-gate" aria-hidden="true">
          <i />
          <b>NO CONTEXT TRANSFER</b>
          <i />
        </span>
        {COMPARISON_MODES.map((mode) => {
          const descriptionId = `${modeDescriptionBaseId}-${mode.id}-description`;
          const boundaryId = `${modeDescriptionBaseId}-${mode.id}-boundary`;
          const transitionId = `${modeDescriptionBaseId}-${mode.id}-transition`;
          const isActive = activeMode?.id === mode.id;
          const navigationLabel = isActive
            ? "当前模式"
            : activeMode
              ? "切换到模式"
              : "恢复到模式";
          const navigationStateLabel = isActive
            ? "当前"
            : activeMode
              ? "切换"
              : "恢复";
          const transitionDetail = isActive
            ? "普通激活保留当前上下文，不重新导航。"
            : activeMode
              ? `切换说明：${activeMode.handoff}`
              : "该入口用于恢复未知模式绑定，进入后按目标模式重新校验。";
          return (
            <AppLink
              key={mode.id}
              href={mode.href}
              aria-label={`${navigationLabel}：${mode.title}`}
              aria-describedby={`${descriptionId} ${boundaryId} ${transitionId}`}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "is-active" : ""}
              data-mode={mode.id}
              data-state={isActive ? "active" : activeMode ? "available" : "recovery"}
              data-navigation-state={isActive ? "current-context" : activeMode ? "switch-context" : "recover-context"}
              data-context-transfer={isActive ? "unchanged" : "none"}
              data-target-mode={mode.id}
              {...COMPARISON_SAFETY_ATTRIBUTES}
              title={`${mode.title} · ${mode.description} · ${mode.boundary} · ${transitionDetail}`}
              onClick={isActive ? (event) => {
                if (
                  event.button === 0
                  && !event.metaKey
                  && !event.ctrlKey
                  && !event.shiftKey
                  && !event.altKey
                ) {
                  event.preventDefault();
                }
              } : undefined}
            >
              <span className="comparison-mode-nav__index" aria-hidden="true">{mode.index}</span>
              <span className="comparison-mode-nav__copy">
                <span>{mode.title}</span>
                <small id={descriptionId}>{mode.description}</small>
                <small id={boundaryId} className="comparison-mode-nav__boundary">边界：{mode.boundary}</small>
                <span id={transitionId} className="sr-only">{transitionDetail}</span>
              </span>
              <span className="comparison-mode-nav__state" aria-hidden="true">
                {navigationStateLabel}
              </span>
            </AppLink>
          );
        })}
      </div>
      {activeMode && alternateMode ? (
        <div
          className="comparison-mode-nav__protocol"
          data-active-mode={activeMode.id}
          data-state="bound"
          role="note"
        >
          <span className="comparison-mode-nav__protocol-index" aria-hidden="true">ACTIVE {activeMode.index}</span>
          <p><small>当前研究问题</small><strong>{activeMode.task}</strong></p>
          <span className="comparison-mode-nav__handoff">
            <b>切换到{alternateMode.title}</b>
            <small>{activeMode.handoff}</small>
          </span>
        </div>
      ) : (
        <div className="comparison-mode-nav__protocol" data-state="error" role="alert">
          <span className="comparison-mode-nav__protocol-index" aria-hidden="true">MODE ?</span>
          <p><small>Mode binding failed</small><strong>无法识别当前对照研究模式</strong></p>
          <span className="comparison-mode-nav__handoff">系统没有自动猜测为多盘或双案例；请选择上方受支持入口重新进入。</span>
        </div>
      )}
    </nav>
  );
}
