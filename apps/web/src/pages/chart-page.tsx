import { ArrowLeft, Columns3, FilePlus2, History, Info, RotateCcw, TriangleAlert } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaseBundle, RevisionRecord, TransitNode, TransitSnapshot } from "@hakimi/contracts";
import {
  caseRepository,
  researchRepository,
  RevisionCalculationReceiptStorageError
} from "@hakimi/storage";
import {
  bindLuckCycleRuleProfile,
  calculateLuckCycle,
  type LuckCycleResult,
  type LuckCycleRule,
  type LuckDirection
} from "@hakimi/luck-core";
import { calculatePillarRelations, type RelationType } from "@hakimi/relations-core";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import type {
  RevisionNatalReplayCapability,
  RevisionNatalReplayChangedField,
  RevisionNatalReplayProjection
} from "@hakimi/chart-integrity";
import type { RevisionDerivedReplayRequest } from "@hakimi/revision-replay";
import { EvidencePanel } from "../components/evidence-panel";
import { FourPillarsMatrix, type MatrixSelection } from "../components/four-pillars-matrix";
import { BaziInterpretationPanel, BaziInterpretationSummary } from "../components/bazi-interpretation-panel";
import { BirthTimePerturbationPanel } from "../components/birth-time-perturbation-panel";
import { DeepSeekAssistantPanel } from "../components/deepseek-assistant-panel";
import { ResearchJournal } from "../components/research-journal";
import { RevisionDerivedReplayPanel } from "../components/revision-derived-replay-panel";
import { StatusPill } from "../components/status-pill";
import { TransitWorkbench } from "../components/transit-workbench";
import { useAppBootReady } from "../lib/app-boot-ready";
import { formatDateTime, shortHash } from "../lib/format";
import { useExpertMode } from "../lib/expert-mode";
import { AppLink, navigate, useAppLocation } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import {
  buildChartSearch,
  canonicalInstant,
  parseChartRoute,
  type ChartView,
  type TransitRouteState
} from "../lib/transit-route";
import "./chart-page.css";

const RevisionCalculationReceiptsPanel = lazy(() =>
  import("../components/revision-calculation-receipts-panel").then((module) => ({
    default: module.RevisionCalculationReceiptsPanel
  }))
);

const timePrecisionLabels: Record<RevisionRecord["input"]["timePrecision"], string> = {
  exact_second: "秒",
  exact_minute: "分钟",
  hour_range: "时间范围",
  unknown_hour: "未知时辰",
  date_only: "仅日期"
};

const relationTypeLabels: Record<RelationType, string> = {
  stem_five_combination: "天干五合",
  stem_clash: "天干四冲",
  branch_six_combination: "地支六合",
  branch_six_clash: "地支六冲",
  branch_three_harmony: "地支三合",
  branch_three_meeting: "地支三会",
  branch_three_punishment: "三刑集合",
  branch_binary_punishment: "子卯刑",
  branch_self_punishment: "自刑",
  branch_six_harm: "地支六害",
  branch_six_break: "地支六破"
};

const pillarPositionLabels = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" } as const;
const pillarPositions = ["year", "month", "day", "hour"] as const;

const chartViewItems: ReadonlyArray<{ key: ChartView; label: string; caption: string }> = [
  { key: "overview", label: "概览", caption: "原局与历法" },
  { key: "structure", label: "结构", caption: "四柱与依据" },
  { key: "transit", label: "运限", caption: "时间切片" },
  { key: "research", label: "研读", caption: "笔记与复演" }
];

const CHART_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy",
  "data-target-schema": "13",
  "data-schema-version": "13",
  "data-db-schema-version": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-evidence-authority": "engineering-only",
  "data-formal-validation-complete": "false",
  "data-scientific-validation-complete": "false",
  "data-mutation-mode": "epoch-governed-user-initiated-writes",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-public-release-authorized": "false",
  "data-expert-truth-claimed": "false"
} as const;

const CHART_IDENTIFIER_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._:-]{0,191}$/;
const CHART_UNSAFE_RUNTIME_TEXT_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_CHART_REVISIONS = 512;
const MAX_CHART_EVENT_INDEX_RECORDS = 5_000;

type ChartRuntimePayloadLimits = {
  arrayItems: number;
  depth: number;
  nodes: number;
  objectKeys: number;
  stringLength: number;
};

const DEFAULT_CHART_RUNTIME_PAYLOAD_LIMITS: ChartRuntimePayloadLimits = {
  arrayItems: 512,
  depth: 20,
  nodes: 100_000,
  objectKeys: 256,
  stringLength: 16_384
};

function chartIdentifierIssue(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !CHART_IDENTIFIER_PATTERN.test(value)) {
    return `${label} 不是可接受的内部标识符，已拒绝读取或建立深链。`;
  }
  return null;
}

function assertBoundedChartRuntimePayload(
  value: unknown,
  label: string,
  overrides: Partial<ChartRuntimePayloadLimits> = {}
): void {
  const limits = { ...DEFAULT_CHART_RUNTIME_PAYLOAD_LIMITS, ...overrides };
  const activeObjects = new Set<object>();
  let visitedNodes = 0;

  const visit = (entry: unknown, depth: number): void => {
    visitedNodes += 1;
    if (visitedNodes > limits.nodes) {
      throw new Error(`${label} 的运行时节点数量超出页面安全上限。`);
    }
    if (depth > limits.depth) {
      throw new Error(`${label} 的运行时结构深度超出页面安全上限。`);
    }
    if (typeof entry === "string") {
      if (entry.length > limits.stringLength || CHART_UNSAFE_RUNTIME_TEXT_PATTERN.test(entry)) {
        throw new Error(`${label} 包含过长文本或不安全控制字符。`);
      }
      return;
    }
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) throw new Error(`${label} 包含非有限数值。`);
      return;
    }
    if (entry === null || entry === undefined || typeof entry === "boolean") return;
    if (typeof entry !== "object") {
      throw new Error(`${label} 包含无法展示的运行时值。`);
    }
    if (activeObjects.has(entry)) {
      throw new Error(`${label} 包含循环引用，已拒绝展示。`);
    }

    activeObjects.add(entry);
    if (Array.isArray(entry)) {
      if (entry.length > limits.arrayItems) {
        throw new Error(`${label} 的列表项目数量超出页面安全上限。`);
      }
      entry.forEach((item) => visit(item, depth + 1));
      activeObjects.delete(entry);
      return;
    }

    const keys = Object.keys(entry);
    if (keys.length > limits.objectKeys) {
      throw new Error(`${label} 的字段数量超出页面安全上限。`);
    }
    keys.forEach((key) => {
      if (key.length > limits.stringLength || CHART_UNSAFE_RUNTIME_TEXT_PATTERN.test(key)) {
        throw new Error(`${label} 包含过长字段名或不安全控制字符。`);
      }
      visit((entry as Record<string, unknown>)[key], depth + 1);
    });
    activeObjects.delete(entry);
  };

  visit(value, 0);
}

type ResearchEventIndex = Awaited<ReturnType<typeof researchRepository.listEventsByCase>>;

function chartBundleIntegrityIssue(bundle: CaseBundle, expectedCaseId: string): string | null {
  const caseIdentifierIssue = chartIdentifierIssue(bundle.caseRecord.id, "案例返回的 Case ID");
  if (caseIdentifierIssue) return caseIdentifierIssue;
  if (bundle.caseRecord.id !== expectedCaseId) {
    return "案例仓库返回了不匹配的 Case 来源。";
  }
  if (bundle.revisions.length === 0) {
    return "正式案例没有任何 Revision，无法建立可复算来源。";
  }
  if (bundle.revisions.length > MAX_CHART_REVISIONS) {
    return `案例包含超过 ${MAX_CHART_REVISIONS.toLocaleString("zh-CN")} 个 Revision，已拒绝在单页展开。`;
  }
  if (bundle.revisions.some((revision) =>
    chartIdentifierIssue(revision.id, "Revision ID") !== null ||
    !Number.isSafeInteger(revision.revisionNumber) ||
    revision.revisionNumber < 1
  )) {
    return "案例包含无效 Revision ID 或 Revision 序号，无法建立唯一历史路由。";
  }
  if (bundle.caseRecord.revisionCount !== bundle.revisions.length) {
    return `案例声明 ${bundle.caseRecord.revisionCount} 个 Revision，但实际读取到 ${bundle.revisions.length} 个。`;
  }
  if (new Set(bundle.revisions.map((revision) => revision.id)).size !== bundle.revisions.length) {
    return "案例包含重复 Revision ID，无法建立唯一历史路由。";
  }
  if (new Set(bundle.revisions.map((revision) => revision.revisionNumber)).size !== bundle.revisions.length) {
    return "案例包含重复 Revision 序号，无法建立唯一历史顺序。";
  }
  if (bundle.revisions.some((revision) => revision.caseId !== expectedCaseId)) {
    return "案例包混入了属于其他 Case 的 Revision。";
  }
  const latestRevisionIdentifierIssue = chartIdentifierIssue(
    bundle.caseRecord.latestRevisionId,
    "latestRevisionId"
  );
  if (latestRevisionIdentifierIssue) return latestRevisionIdentifierIssue;
  const latestRevision = bundle.revisions.find((revision) => revision.id === bundle.caseRecord.latestRevisionId);
  if (!latestRevision) {
    return "案例声明的 latestRevisionId 不在当前 Revision 集合中。";
  }
  if (bundle.revisions.some((revision) => revision.revisionNumber > latestRevision.revisionNumber)) {
    return "案例声明的 latestRevisionId 未指向最高 Revision 序号。";
  }
  return null;
}

function eventIndexIntegrityIssue(
  records: ResearchEventIndex,
  expectedCaseId: string,
  expectedRevisionIds: ReadonlySet<string>
): string | null {
  if (records.length > MAX_CHART_EVENT_INDEX_RECORDS) {
    return `事件索引超过 ${MAX_CHART_EVENT_INDEX_RECORDS.toLocaleString("zh-CN")} 条，已拒绝在单页建立关联。`;
  }
  if (records.some((record) => chartIdentifierIssue(record.id, "事件 ID") !== null)) {
    return "事件索引包含无效事件 ID，已拒绝用于运限关联。";
  }
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    return "事件索引包含重复事件 ID，已拒绝用于运限关联。";
  }
  if (records.some((record) => record.caseId !== expectedCaseId)) {
    return "事件索引混入了其他 Case 的记录，已拒绝用于当前 Revision。";
  }
  if (records.some((record) =>
    typeof record.revisionId !== "string" ||
    chartIdentifierIssue(record.revisionId, "事件 Revision ID") !== null ||
    !expectedRevisionIds.has(record.revisionId)
  )) {
    return "事件索引包含不属于当前 Case Bundle 的 Revision 绑定，已拒绝用于运限关联。";
  }
  return null;
}

function PillarStrip({ revision }: { revision: RevisionRecord }) {
  return (
    <div className="pillar-strip">
      {pillarPositions.map((position) => {
        const pillar = revision.facts.pillars[position];
        return <div key={pillar.name}><small>{pillar.label}</small><strong>{pillar.stem}</strong><strong>{pillar.branch}</strong><span>{pillar.stemTenGod}</span></div>;
      })}
    </div>
  );
}

function OverviewView({ revision }: { revision: RevisionRecord }) {
  return (
    <div className="chart-overview">
      <section className="flat-section">
        <div className="section-heading-row"><div><p className="eyebrow">原局概览</p><h2>四柱与历法输入</h2></div><StatusPill tone="warning">工程预览</StatusPill></div>
        <PillarStrip revision={revision} />
        <dl className="overview-facts">
          <div><dt>原始历法输入</dt><dd>{revision.input.date} {revision.input.lunarLeapMonth ? "· 闰月 " : ""}{revision.input.time ?? "时辰未知"} · {revision.input.calendarType === "lunar" ? "农历" : "公历"}</dd></div>
          <div><dt>历法解析</dt><dd>{revision.timeCalibration.calendarResolution ? `${revision.timeCalibration.calendarResolution.inputCalendarType === "lunar" ? "转换至" : "保持"}公历 ${revision.timeCalibration.calendarResolution.resolvedGregorianDate} · 往返校验通过` : "旧修订未保存独立历法解析快照"}</dd></div>
          <div><dt>公历</dt><dd>{revision.facts.calendar.solarText}</dd></div>
          <div><dt>农历候选</dt><dd>{revision.facts.calendar.lunarText}</dd></div>
          <div><dt>上一个节</dt><dd>{revision.facts.calendar.previousJie ?? "未计算"}</dd></div>
          <div><dt>下一个节</dt><dd>{revision.facts.calendar.nextJie ?? "未计算"}</dd></div>
          <div><dt>公历民用时</dt><dd>{revision.timeCalibration.originalCivilDateTime} · {revision.timeCalibration.timeZone}</dd></div>
          <div><dt>UTC 瞬时点</dt><dd>{revision.timeCalibration.utcInstant ?? "未解析"} {revision.timeCalibration.utcOffset ?? ""}</dd></div>
          <div><dt>视太阳时对照</dt><dd>{revision.timeCalibration.solarTimePreview ?? "未提供完整坐标"} · 未采用</dd></div>
        </dl>
      </section>
      <BaziInterpretationPanel revision={revision} />
      <section className="flat-section limitation-section" aria-labelledby="chart-limitations-title">
        <Info aria-hidden="true" />
        <div>
          <p className="eyebrow">Interpretation boundary</p>
          <h2 id="chart-limitations-title">哪些结果还不能下最终结论</h2>
          <p className="limitation-lead">当前页面把可审计候选、待复核层与仍关闭的综合结论分开呈现，不用首屏焦点或出现次数替代专家判断。</p>
          <ul className="limitation-grid">
            <li><strong>旺衰与十神</strong><span>仅提供 0.1.0 规则候选、10×4 文案审稿表与条件化平衡方向；透干、藏干出现项不合并计分。</span></li>
            <li><strong>结构复核门</strong><span>格局与救应、寒暖燥湿、合化与生克链、运限引动仍未评估，不能从单层候选推出综合判断。</span></li>
            <li><strong>神煞边界</strong><span>只保留主动展开的基准事实、5×4 位置议题候选与同柱复核包；多柱出现逐项保留但不计分。</span></li>
            <li><strong>综合结论</strong><span>综合喜忌固定为 null；从格、专旺、化气、用神、运限吉凶以及起运至流时的人工金标仍未启用。</span></li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function ProcessTrack({ revision }: { revision: RevisionRecord }) {
  const steps = [
    { label: "输入快照", detail: `${revision.input.calendarType === "lunar" ? "农历" : "公历"} ${revision.input.date} ${revision.input.time ?? "时辰未知"}` },
    { label: "历法候选", detail: revision.manifest.engine.upstreamVersion },
    { label: "规则绑定", detail: revision.ruleProfile.profileVersion },
    { label: "本地修订", detail: `Revision ${revision.revisionNumber}` }
  ];
  return (
    <section className="process-track" aria-labelledby="process-title">
      <div className="section-heading-row"><div><p className="eyebrow">复算脊线</p><h2 id="process-title">从输入到修订</h2></div><StatusPill tone="info">当前修订</StatusPill></div>
      <ol>{steps.map((item, index) => <li key={item.label} className={index === steps.length - 1 ? "is-current" : ""}><span /><strong>{item.label}</strong><small>{safeVisibleText(item.detail, "复算步骤信息不可用。", 240)}</small></li>)}</ol>
      <p className="track-note">完整大运规则已随修订锁版；六层切片与节点事件绑定已进入“运限”页，小运裁决、人工金标与跨 DST 验收仍是 v1 发布前待关闭项。</p>
    </section>
  );
}

function formatLuckAge(age: LuckCycleResult["startAge"] | LuckCycleResult["decades"][number]["startAge"]): string {
  const value = age.components;
  return `${value.years}年${value.months}月${value.days}日${value.hours}时${value.minutes}分`;
}

export function LuckCyclePanel({ revision }: { revision: RevisionRecord }) {
  const [manualDirection, setManualDirection] = useState<LuckDirection | null>(null);
  const calculation = useMemo(() => {
    if (!revision.timeCalibration.utcInstant) {
      return { result: null, error: "当前修订没有唯一 UTC 瞬时点，不能计算起运。" };
    }
    if (revision.input.sex === "unspecified" && manualDirection === null) {
      return { result: null, error: null };
    }
    try {
      const result = calculateLuckCycle({
          schemaVersion: "1.0.0",
          birthInstant: revision.timeCalibration.utcInstant,
          sex: revision.input.sex,
          ...(manualDirection ? { manualDirection } : {}),
          expectedYearGanZhi: revision.facts.pillars.year.ganZhi,
          expectedMonthGanZhi: revision.facts.pillars.month.ganZhi
        }, (revision.luckCycleRuleSnapshot ?? bindLuckCycleRuleProfile(revision.ruleProfile)) as LuckCycleRule);
      assertBoundedChartRuntimePayload(result, "运限结果");
      return { result, error: null };
    } catch (reason) {
      return { result: null, error: safeVisibleErrorMessage(reason, "运限事实计算失败。") };
    }
  }, [manualDirection, revision]);

  return (
    <section className="luck-cycle-panel" aria-labelledby="luck-cycle-title">
      <div className="section-heading-row">
        <div><p className="eyebrow">Luck cycle facts</p><h2 id="luck-cycle-title">起运与十柱大运</h2></div>
        <StatusPill tone="warning">0 金标 · 工程预览</StatusPill>
      </div>
      <p className="section-help">只展示顺逆、节令时差、起运年龄和时间区间；不输出吉凶、旺衰或事件预测。</p>
      {revision.input.sex === "unspecified" ? (
        <div className="luck-manual-direction">
          <strong>{manualDirection ? `本次查看已人工指定${manualDirection === "forward" ? "顺行" : "逆行"}` : "性别未指定，不能静默决定顺逆"}</strong>
          <p>方向只用于本次查看；可随时切换或清除，不会改写出生资料或创建修订。</p>
          <div className="button-row" role="group" aria-label="本次查看的人工顺逆选择">
            <button type="button" className="secondary-action" aria-pressed={manualDirection === "forward"} onClick={() => setManualDirection("forward")}>人工指定顺行</button>
            <button type="button" className="secondary-action" aria-pressed={manualDirection === "backward"} onClick={() => setManualDirection("backward")}>人工指定逆行</button>
            {manualDirection ? <button type="button" className="secondary-action" onClick={() => setManualDirection(null)}>清除本次指定</button> : null}
          </div>
        </div>
      ) : null}
      {calculation.error ? <div className="inline-error" role="alert"><strong>暂不能生成运限事实</strong><p>{safeVisibleText(calculation.error, "运限事实计算失败。", 800)}</p></div> : null}
      {calculation.result ? (
        <>
          <dl className="luck-summary">
            <div><dt>顺逆</dt><dd>{calculation.result.direction.value === "forward" ? "顺行" : "逆行"} · {calculation.result.direction.yearStem}{calculation.result.direction.yearStemPolarity === "yang" ? "阳" : "阴"}年干</dd></div>
            <div><dt>取节</dt><dd>{calculation.result.adjacentJie.selectedAnchor.name} · {calculation.result.adjacentJie.selectedAnchor.fixedPlusEightWallDateTime}</dd></div>
            <div><dt>起运折算</dt><dd>{formatLuckAge(calculation.result.startAge)} · 未舍入</dd></div>
            <div><dt>交运时刻</dt><dd>{calculation.result.handover.fixedPlusEightWallDateTime} UTC+08:00</dd></div>
          </dl>
          <span className="sr-only" id="luck-decade-scroll-help">该列表可横向滚动。</span>
          <ol className="luck-decade-track" aria-label="十柱大运半开区间" aria-describedby="luck-decade-scroll-help" tabIndex={0}>
            {calculation.result.decades.map((decade) => (
              <li key={decade.index}>
                <small>第 {decade.index} 柱</small>
                <strong>{decade.ganZhi}</strong>
                <span>{formatLuckAge(decade.startAge)}起</span>
                <time>{decade.startFixedPlusEightWallDateTime.slice(0, 10)} — {decade.endExclusiveFixedPlusEightWallDateTime.slice(0, 10)}</time>
              </li>
            ))}
          </ol>
          <details className="known-gaps"><summary>查看当前运限发布门与已知缺口</summary><ul>{calculation.result.knownGaps.map((gap, index) => <li key={`${index}-${gap}`}>{safeVisibleText(gap, "未提供可显示的运限缺口说明。")}</li>)}</ul></details>
        </>
      ) : null}
    </section>
  );
}

export function PillarRelationsPanel({ revision }: { revision: RevisionRecord }) {
  const result = useMemo(() => calculatePillarRelations(revision.facts), [revision.facts]);
  const pendingCount = result.facts.filter((fact) => fact.verificationStatus === "embedded_table_pending_consultant_review").length;
  const knownGaps = [...new Set(result.facts.flatMap((fact) => fact.knownGaps))];

  return (
    <section className="relations-panel" aria-labelledby="relations-title">
      <div className="section-heading-row">
        <div><p className="eyebrow">Pillar relation facts</p><h2 id="relations-title">干支关系事实</h2></div>
        <StatusPill tone={pendingCount ? "warning" : "info"}>{result.facts.length} 条 · {pendingCount} 条待顾问复核</StatusPill>
      </div>
      <p className="section-help">只陈述四柱中出现的成员关系；“二缺一”不会被写成完整三合、三会或三刑，也不判断合化、力量或吉凶。</p>
      {result.facts.length ? (
        <ul className="relation-fact-list" aria-label="干支关系事实列表">
          {result.facts.map((fact) => (
            <li key={fact.id}>
              <div>
                <strong>{relationTypeLabels[fact.relationType]}</strong>
                <span>{fact.participants.map((participant) => `${pillarPositionLabels[participant.position]}${participant.value}`).join(" · ")}</span>
              </div>
              <StatusPill tone={fact.verificationStatus === "upstream_public_constant_audited" ? "info" : "warning"}>
                {fact.completeness === "incomplete_set" ? `二缺一 · 缺${fact.missingMembers.join("、")}` : fact.completeness === "complete_set" ? "完整集合" : "二元关系"}
              </StatusPill>
              <small>{fact.verificationStatus === "upstream_public_constant_audited" ? "已审计上游公开常量" : "内嵌表 · 待顾问逐表复核"}</small>
            </li>
          ))}
        </ul>
      ) : <p className="empty-relation-facts">当前四柱在已启用关系表中没有命中；这不等于对命局作出解释。</p>}
      <details className="known-gaps relation-evidence">
        <summary>查看关系规则版本、来源状态与已知缺口</summary>
        <dl>
          <div><dt>引擎</dt><dd>{safeVisibleText(result.manifest.engine.name, "引擎不可显示", 120)} {safeVisibleText(result.manifest.engine.version, "版本不可显示", 80)}</dd></div>
          <div><dt>上游</dt><dd>{safeVisibleText(result.manifest.engine.upstreamName, "上游不可显示", 120)} {safeVisibleText(result.manifest.engine.upstreamVersion, "版本不可显示", 80)}</dd></div>
          <div><dt>规则配置</dt><dd>{safeVisibleText(result.ruleProfile.profileId, "规则 ID 不可显示", 160)} {safeVisibleText(result.ruleProfile.profileVersion, "版本不可显示", 80)}</dd></div>
          <div><dt>解释层</dt><dd>{result.manifest.interpretationIncluded ? "包含" : "不包含"}</dd></div>
        </dl>
        {knownGaps.length ? <ul>{knownGaps.map((gap, index) => <li key={`${index}-${gap}`}>{safeVisibleText(gap, "未提供可显示的关系缺口说明。")}</li>)}</ul> : <p>当前命中的关系没有额外已知缺口。</p>}
      </details>
    </section>
  );
}

const replayUnavailableLabels: Record<
  Exclude<RevisionNatalReplayCapability["status"], "replayable_exact">,
  string
> = {
  legacy_tzdb_integrity_only: "仅支持冻结内容完整性验证",
  unsupported_engine: "未保留匹配的历史本命盘执行器",
  artifact_unavailable: "绑定的时区工件未随包保留",
  descriptor_mismatch: "时区描述符与随包注册表不一致",
  unsupported_rule_semantics: "规则语义不受该执行器支持",
  unsupported_input_precision: "出生时间精度不支持本命盘复演",
  unresolved_dst_selection: "缺少冻结的 DST 选择"
};

const replayChangedFieldLabels: Record<RevisionNatalReplayChangedField, string> = {
  time_calibration: "时间校准",
  luck_cycle_rule_snapshot: "起运规则快照",
  facts: "历法或四柱事实",
  result_hash: "结果摘要"
};

function RevisionNatalReplayPanel({ revision }: { revision: RevisionRecord }) {
  const [capability, setCapability] = useState<RevisionNatalReplayCapability | null>(null);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [projection, setProjection] = useState<RevisionNatalReplayProjection | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);
  const replayOperationRef = useRef(false);

  useEffect(() => {
    let active = true;
    setCapability(null);
    setCapabilityError(null);
    setProjection(null);
    setReplayError(null);
    import("@hakimi/chart-integrity")
      .then(({ classifyRevisionNatalReplay }) => classifyRevisionNatalReplay(revision))
      .then((nextCapability) => {
        if (!active) return;
        assertBoundedChartRuntimePayload(nextCapability, "本命盘复演能力结果");
        setCapability(nextCapability);
      })
      .catch((reason: unknown) => {
        if (active) {
          setCapabilityError(safeVisibleErrorMessage(reason, "无法核对 Revision 复演边界。"));
        }
      });
    return () => { active = false; };
  }, [revision]);

  const runReplay = async () => {
    if (replayOperationRef.current) return;
    replayOperationRef.current = true;
    setReplaying(true);
    setProjection(null);
    setReplayError(null);
    try {
      const { replayRevisionNatalChart } = await import("@hakimi/chart-integrity");
      const nextProjection = await replayRevisionNatalChart(revision);
      assertBoundedChartRuntimePayload(nextProjection, "本命盘复演投影");
      setProjection(nextProjection);
    } catch (reason) {
      setReplayError(safeVisibleErrorMessage(reason, "本命盘只读复演失败。"));
    } finally {
      replayOperationRef.current = false;
      setReplaying(false);
    }
  };

  return (
    <section className="flat-section revision-replay-panel" aria-labelledby="revision-replay-title" aria-busy={replaying}>
      <div className="section-heading-row">
        <div><p className="eyebrow">Read-only natal replay</p><h2 id="revision-replay-title">本命盘只读复演</h2></div>
        <StatusPill tone={projection?.status === "matched" ? "info" : capability?.status === "replayable_exact" ? "warning" : "neutral"}>
          {projection?.status === "matched" ? "复演一致" : projection?.status === "mismatch" ? "发现差异" : capability?.status === "replayable_exact" ? "可精确复演" : "边界核对"}
        </StatusPill>
      </div>
      <p className="revision-replay-copy">使用冻结的出生输入、RuleProfile、完整引擎描述符与 IANA 工件在本机重新计算；不会写入数据库、创建新 Revision 或改动原记录。关系、运势与流年仍属于当前版本算法派生，不纳入本次复演声明。</p>
      {!capability && !capabilityError ? <p role="status">正在核对执行器与时区工件…</p> : null}
      {capabilityError ? <div className="inline-error" role="alert"><strong>无法验证复演能力</strong><p>{capabilityError}</p></div> : null}
      {capability?.status !== "replayable_exact" && capability ? (
        <div className="revision-replay-boundary" role="status">
          <strong>{replayUnavailableLabels[capability.status]}</strong>
          <p>{safeVisibleText(capability.reason, "未提供可显示的复演边界说明。", 700)} 系统不会改用当前引擎或当前随包 IANA 工件猜测旧结果。</p>
        </div>
      ) : null}
      {capability?.status === "replayable_exact" ? (
        <div className="revision-replay-ready">
          <dl className="metadata-list">
            <div><dt>历史执行器</dt><dd>{safeVisibleText(capability.executorId, "执行器不可显示", 160)}</dd></div>
            <div><dt>时区工件</dt><dd>{capability.artifactRole === "current" ? "当前随包工件" : "保留随包工件"} · {safeVisibleText(revision.manifest.timeZoneDatabase?.ianaVersion, "版本不可显示", 80)}</dd></div>
            <div><dt>源快照摘要</dt><dd title={safeVisibleText(capability.revisionSnapshotDigest, "", 700)}>{safeVisibleText(capability.revisionSnapshotDigest, "摘要不可显示", 700)}</dd></div>
          </dl>
          <button type="button" className="secondary-action" disabled={replaying} aria-busy={replaying} onClick={runReplay}>
            <RotateCcw aria-hidden="true" />{replaying ? "正在只读复演…" : "运行本命盘只读复演"}
          </button>
        </div>
      ) : null}
      {replayError ? <div className="inline-error" role="alert"><strong>复演未完成</strong><p>{replayError}</p></div> : null}
      {projection?.status === "matched" ? (
        <div className="revision-replay-result revision-replay-result--matched" role="status">
          <strong>冻结结果与精确执行器复演一致</strong>
          <p>结果摘要 {projection.replayedResultHash}；源 Revision 未改写，复演投影摘要 {projection.projectionDigest}。</p>
        </div>
      ) : null}
      {projection?.status === "mismatch" ? (
        <div className="inline-error" role="alert">
          <strong>冻结记录与精确复演不一致</strong>
          <p>差异字段：{projection.changedFields.map((field) => replayChangedFieldLabels[field]).join("、")}。冻结摘要 {projection.storedResultHash}；复演摘要 {projection.replayedResultHash}。原记录保持只读。</p>
        </div>
      ) : null}
    </section>
  );
}

function ResearchView({
  caseId,
  revision,
  selection,
  transitNode,
  transitAtInstant,
  transitManualDirection,
  selectedEventId,
  selectedEventError,
  onSelectEvent,
  receiptSchemaVersion,
  receiptWritesAllowed
}: {
  caseId: string;
  revision: RevisionRecord;
  selection: MatrixSelection;
  transitNode: TransitNode | null;
  transitAtInstant: string | null;
  transitManualDirection: LuckDirection | null;
  selectedEventId: string | null;
  selectedEventError: string | null;
  onSelectEvent: (eventId: string, options?: { replace?: boolean }) => void;
  receiptSchemaVersion: number;
  receiptWritesAllowed: boolean;
}) {
  const [receiptRefreshToken, setReceiptRefreshToken] = useState(0);
  const { expertMode } = useExpertMode();
  const receiptSchemaAvailable = receiptSchemaVersion >= 15;
  const saveCalculationSnapshot = useCallback(async (request: RevisionDerivedReplayRequest) => {
    try {
      await caseRepository.appendRevisionCalculationReceipt({ revisionId: revision.id, request });
      setReceiptRefreshToken((value) => value + 1);
      return "saved" as const;
    } catch (reason) {
      if (
        reason instanceof RevisionCalculationReceiptStorageError &&
        reason.code === "DUPLICATE_REQUEST_FINGERPRINT"
      ) {
        setReceiptRefreshToken((value) => value + 1);
        return "already_saved" as const;
      }
      throw reason;
    }
  }, [revision.id]);

  return (
    <div className="research-view">
      <RevisionNatalReplayPanel key={revision.id} revision={revision} />
      {receiptSchemaAvailable ? (
        <Suspense fallback={<section className="flat-section" role="status">正在载入历史计算收据…</section>}>
          <RevisionCalculationReceiptsPanel
            revisionId={revision.id}
            refreshToken={receiptRefreshToken}
          />
        </Suspense>
      ) : (
        <section className="flat-section revision-receipt-schema-boundary" aria-labelledby="revision-receipt-schema-title">
          <div className="section-heading-row">
            <div><p className="eyebrow">Receipt ledger boundary</p><h2 id="revision-receipt-schema-title">历史计算收据保持关闭</h2></div>
            <StatusPill tone="neutral">targetSchema {receiptSchemaVersion}</StatusPill>
          </div>
          <p>当前数据库目标身份未启用 Schema 15 的计算收据表。冻结 Revision、本命盘只读复演与即时派生计算仍可使用，但“保存计算快照”和历史收据列表保持关闭；页面不会自动迁移、创建旁路表或把未保存结果伪装成收据。</p>
        </section>
      )}
      <RevisionDerivedReplayPanel
        key={`${revision.id}:${transitAtInstant ?? "no-transit"}`}
        revision={revision}
        atInstant={transitAtInstant}
        routeManualDirection={transitManualDirection}
        onSaveSnapshot={receiptSchemaAvailable && receiptWritesAllowed ? saveCalculationSnapshot : undefined}
      />
      <BirthTimePerturbationPanel revision={revision} />
      <DeepSeekAssistantPanel revision={revision} />
      <section className="flat-section">
        <div className="section-heading-row"><div><p className="eyebrow">Reproducibility</p><h2>复算元数据</h2></div><StatusPill tone="warning">{revision.manifest.verificationStatus}</StatusPill></div>
        <dl className="metadata-list">
          {expertMode ? <>
            <div><dt>Case ID</dt><dd className="mono">{caseId}</dd></div>
            <div><dt>Revision ID</dt><dd className="mono">{revision.id}</dd></div>
          </> : null}
          <div><dt>结果哈希</dt><dd title={revision.manifest.resultHash}>{expertMode ? revision.manifest.resultHash : shortHash(revision.manifest.resultHash)}</dd></div>
          <div><dt>规则哈希</dt><dd title={revision.manifest.ruleProfileDigest}>{expertMode ? revision.manifest.ruleProfileDigest : shortHash(revision.manifest.ruleProfileDigest)}</dd></div>
          {revision.rulePackBinding ? <>
            <div><dt>规则包来源</dt><dd>{safeVisibleText(revision.rulePackBinding.packId, "规则包不可显示", 160)}</dd></div>
            <div><dt>规则包摘要</dt><dd title={revision.rulePackBinding.packDigest}>{expertMode ? revision.rulePackBinding.packDigest : shortHash(revision.rulePackBinding.packDigest)}</dd></div>
            <div><dt>绑定 Profile</dt><dd>{safeVisibleText(revision.rulePackBinding.profileId, "Profile 不可显示", 160)}@{safeVisibleText(revision.rulePackBinding.profileVersion, "版本不可显示", 80)} · {revision.rulePackBinding.useMode === "exact" ? "精确使用" : revision.rulePackBinding.useMode}</dd></div>
            <div><dt>Profile 摘要</dt><dd title={revision.rulePackBinding.profileDigest}>{expertMode ? revision.rulePackBinding.profileDigest : shortHash(revision.rulePackBinding.profileDigest)}</dd></div>
          </> : <div><dt>规则包来源</dt><dd>未绑定安装包 · 内置或派生规则快照</dd></div>}
          <div><dt>引擎</dt><dd>{safeVisibleText(revision.manifest.engine.name, "引擎不可显示", 120)} {safeVisibleText(revision.manifest.engine.version, "版本不可显示", 80)}</dd></div>
          <div><dt>上游</dt><dd>{safeVisibleText(revision.manifest.engine.upstreamName, "上游不可显示", 120)} {safeVisibleText(revision.manifest.engine.upstreamVersion, "版本不可显示", 80)}</dd></div>
          <div><dt>时区库</dt><dd>{revision.manifest.timeZoneDatabase ? `IANA ${safeVisibleText(revision.manifest.timeZoneDatabase.ianaVersion, "版本不可显示", 80)} · 固定工件` : "旧版浏览器 Intl · 具体版本未识别"}</dd></div>
          {revision.manifest.timeZoneDatabase ? <div><dt>tzdb 数据摘要</dt><dd title={revision.manifest.timeZoneDatabase.dataSha256}>{expertMode ? revision.manifest.timeZoneDatabase.dataSha256 : shortHash(revision.manifest.timeZoneDatabase.dataSha256)}</dd></div> : null}
          <div><dt>DST 解析</dt><dd>{revision.timeCalibration.timeZoneResolution?.status ?? revision.timeCalibration.dstStatus}</dd></div>
          <div><dt>太阳时模型</dt><dd>{revision.timeCalibration.solarTime?.modelId ?? "未生成"}</dd></div>
          <div><dt>Schema</dt><dd>{revision.manifest.schemaVersion} · hash {revision.manifest.hashSchemaVersion}</dd></div>
        </dl>
      </section>
      <section className="flat-section">
        <div className="section-heading-row"><div><p className="eyebrow">Rule profile</p><h2>{safeVisibleText(revision.ruleProfile.label, "未命名规则", 180)}</h2></div><StatusPill tone="warning">{revision.ruleProfile.status}</StatusPill></div>
        <dl className="rule-grid">
          <div><dt>界年</dt><dd>{revision.ruleProfile.calendar.yearBoundary}</dd></div>
          <div><dt>界月</dt><dd>{revision.ruleProfile.calendar.monthBoundary}</dd></div>
          <div><dt>换日</dt><dd>{revision.ruleProfile.calendar.dayBoundary}</dd></div>
          <div><dt>时间基准</dt><dd>{revision.ruleProfile.calendar.hourBasis}</dd></div>
          <div><dt>真太阳时</dt><dd>{revision.ruleProfile.solarTime.enabled ? "采用" : "未采用"}</dd></div>
          <div><dt>神煞</dt><dd>{revision.ruleProfile.layers.shensha ? "开启" : "关闭"}</dd></div>
        </dl>
        <p className="snapshot-notice">{safeVisibleText(revision.ruleProfile.notice, "当前规则没有可显示的说明。", 900)}</p>
      </section>
      <section className="flat-section">
        <p className="eyebrow">Field provenance</p><h2>字段溯源状态</h2>
        <div className="provenance-list">{revision.facts.fieldProvenance.map((item) => <div key={item.field}><code>{safeVisibleText(item.field, "字段不可显示", 180)}</code><span>{safeVisibleText(item.algorithmId, "算法不可显示", 180)}</span><StatusPill tone="warning">{item.verificationStatus}</StatusPill></div>)}</div>
      </section>
      <ResearchJournal
        caseId={caseId}
        revision={revision}
        selection={selection}
        transitNode={transitNode}
        defaultTimeZone={revision.input.timeZone}
        selectedEventId={selectedEventId}
        selectedEventError={selectedEventError}
        selectedEventErrorAnnouncedByParent={selectedEventError !== null}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
}

type ChartCaseLoadState =
  | { requestedCaseId: string; status: "loading"; bundle: null; error: null }
  | { requestedCaseId: string; status: "ready"; bundle: CaseBundle; error: null }
  | { requestedCaseId: string; status: "error"; bundle: null; error: string };

function loadingChartCase(requestedCaseId: string): ChartCaseLoadState {
  return { requestedCaseId, status: "loading", bundle: null, error: null };
}

export function ChartPage({ caseId, revisionId }: { caseId: string; revisionId: string }) {
  const appBootReady = useAppBootReady();
  const location = useAppLocation();
  const route = useMemo(() => parseChartRoute(location.search), [location.search]);
  const view = route.view;
  const routeIdentifierIssue = chartIdentifierIssue(caseId, "地址中的 Case ID")
    ?? chartIdentifierIssue(revisionId, "地址中的 Revision ID");
  const [caseLoad, setCaseLoad] = useState<ChartCaseLoadState>(() => loadingChartCase(caseId));
  const [caseLoadVersion, setCaseLoadVersion] = useState(0);
  const [selection, setSelection] = useState<MatrixSelection>({ pillar: "day", field: "stem" });
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [transitSnapshot, setTransitSnapshot] = useState<TransitSnapshot | null>(null);
  const [transitEvents, setTransitEvents] = useState<Awaited<ReturnType<typeof researchRepository.listEventsByCase>>>([]);
  const [transitEventsReady, setTransitEventsReady] = useState(false);
  const [transitEventsError, setTransitEventsError] = useState<string | null>(null);
  const [transitEventsReloadVersion, setTransitEventsReloadVersion] = useState(0);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitError, setTransitError] = useState<string | null>(null);
  const evidenceScrollTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (evidenceScrollTimerRef.current !== null) {
      window.clearTimeout(evidenceScrollTimerRef.current);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setCaseLoad(loadingChartCase(caseId));
    setSelection({ pillar: "day", field: "stem" });
    setEvidenceOpen(false);
    if (routeIdentifierIssue) {
      setCaseLoad({
        requestedCaseId: caseId,
        status: "error",
        bundle: null,
        error: routeIdentifierIssue
      });
      return;
    }
    const load = async () => {
      try {
        const result = await caseRepository.getCase(caseId);
        if (!active) return;
        if (!result) {
          setCaseLoad({
            requestedCaseId: caseId,
            status: "error",
            bundle: null,
            error: "案例不存在或已经从此浏览器删除。"
          });
          return;
        }
        assertBoundedChartRuntimePayload(result, "案例包");
        if (result.caseRecord.id !== caseId) {
          setCaseLoad({
            requestedCaseId: caseId,
            status: "error",
            bundle: null,
            error: "案例仓库返回了不匹配的来源，已拒绝显示。"
          });
          return;
        }
        const integrityIssue = chartBundleIntegrityIssue(result, caseId);
        if (integrityIssue) {
          setCaseLoad({
            requestedCaseId: caseId,
            status: "error",
            bundle: null,
            error: integrityIssue
          });
          return;
        }
        setCaseLoad({ requestedCaseId: caseId, status: "ready", bundle: result, error: null });
      } catch (reason) {
        if (active) {
          setCaseLoad({
            requestedCaseId: caseId,
            status: "error",
            bundle: null,
            error: safeVisibleErrorMessage(reason, "无法读取案例。")
          });
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [caseId, caseLoadVersion, routeIdentifierIssue]);

  const caseLoading = caseLoad.requestedCaseId !== caseId || caseLoad.status === "loading";
  const bundle = caseLoad.requestedCaseId === caseId ? caseLoad.bundle : null;
  const caseError = caseLoad.requestedCaseId === caseId ? caseLoad.error : null;

  const revision = useMemo(() => bundle?.revisions.find((item) => item.id === revisionId) ?? null, [bundle, revisionId]);
  const revisionsNewestFirst = useMemo(
    () => bundle
      ? [...bundle.revisions].sort((left, right) =>
          right.revisionNumber - left.revisionNumber || left.id.localeCompare(right.id)
        )
      : [],
    [bundle]
  );
  const transitContextActive = view === "transit" || view === "research";
  const transitEventContextReady = Boolean(revision) && transitContextActive;

  useEffect(() => {
    if (!appBootReady || view !== "transit" || route.transit.atInstant) return;
    navigate(`${location.pathname}${buildChartSearch("transit", {
      ...route.transit,
      atInstant: canonicalInstant(Date.now())
    })}`, { replace: true, scroll: false });
  }, [appBootReady, location.pathname, route.transit, view]);

  useEffect(() => {
    if (!revision || (view !== "transit" && view !== "research") || !route.transit.atInstant) {
      setTransitSnapshot(null);
      setTransitLoading(false);
      setTransitError(null);
      return;
    }
    let active = true;
    setTransitLoading(true);
    setTransitSnapshot(null);
    setTransitError(null);
    calculateTransitSnapshot({
      revision,
      atInstant: route.transit.atInstant,
      ...(route.transit.manualDirection ? { manualDirection: route.transit.manualDirection } : {})
    }).then((result) => {
      if (!active) return;
      assertBoundedChartRuntimePayload(result, "运限切片");
      setTransitSnapshot(result);
    }).catch((reason: unknown) => {
      if (!active) return;
      setTransitSnapshot(null);
      setTransitError(safeVisibleErrorMessage(reason, "无法生成运限切片。"));
    }).finally(() => {
      if (active) setTransitLoading(false);
    });
    return () => { active = false; };
  }, [revision, route.transit.atInstant, route.transit.manualDirection, view]);

  useEffect(() => {
    if (!transitEventContextReady || !bundle) {
      setTransitEvents([]);
      setTransitEventsReady(false);
      setTransitEventsError(null);
      return;
    }
    let active = true;
    const expectedRevisionIds = new Set(bundle.revisions.map((item) => item.id));
    setTransitEvents([]);
    setTransitEventsReady(false);
    setTransitEventsError(null);
    researchRepository.listEventsByCase(caseId, { includeDeleted: true }).then((records) => {
      if (!active) return;
      assertBoundedChartRuntimePayload(records, "事件索引", {
        arrayItems: MAX_CHART_EVENT_INDEX_RECORDS,
        nodes: 200_000
      });
      const integrityIssue = eventIndexIntegrityIssue(records, caseId, expectedRevisionIds);
      if (integrityIssue) throw new Error(integrityIssue);
      setTransitEvents(records);
    }).catch((reason: unknown) => {
      if (!active) return;
      setTransitEvents([]);
      setTransitEventsError(safeVisibleErrorMessage(reason, "无法读取当前案例的事件索引。"));
    }).finally(() => {
      if (active) setTransitEventsReady(true);
    });
    return () => { active = false; };
  }, [bundle, caseId, caseLoadVersion, transitEventContextReady, transitEventsReloadVersion]);

  const selectedTransitNode = useMemo(() => {
    if (!transitSnapshot || !route.transit.selection) return null;
    return Object.values(transitSnapshot.tracks)
      .flat()
      .find((node) =>
        node.nodeType === route.transit.selection?.nodeType &&
        node.ref.nodeId === route.transit.selection.nodeId
      ) ?? null;
  }, [route.transit.selection, transitSnapshot]);

  const selectedTransitNodeError = useMemo(() => {
    if (view !== "research" || !route.transit.selection) return null;
    if (!route.transit.atInstant) {
      return "运限节点深链缺少精确观察时刻，已拒绝近似定位。";
    }
    if (transitError) {
      return "运限切片暂不可用；未把读取失败解释为节点不存在。";
    }
    if (!transitSnapshot) return null;
    if (!selectedTransitNode) {
      return "运限节点深链不属于当前 Revision 的精确切片；不会定位到同名或相邻节点。";
    }
    return null;
  }, [route.transit.atInstant, route.transit.selection, selectedTransitNode, transitError, transitSnapshot, view]);

  const selectedEventRoute = useMemo(() => {
    const routeIssue = route.issues.find((issue) => issue.includes("事件")) ?? null;
    if (routeIssue) return { eventId: null, error: routeIssue };
    const eventId = route.research.eventId;
    if (!eventId || view !== "research") return { eventId: null, error: null };
    if (!transitEventsReady) return { eventId: null, error: null };
    if (transitEventsError) {
      return { eventId: null, error: "事件索引暂不可用；未把读取失败解释为记录不存在。" };
    }
    const record = transitEvents.find((event) => event.id === eventId) ?? null;
    if (!record || record.caseId !== caseId) {
      return { eventId: null, error: "事件深链不属于当前案例或记录不存在；不会定位到近似事件。" };
    }
    if (record.revisionId !== revision?.id) {
      return { eventId: null, error: "事件深链属于其他 Revision；请从该事件绑定的精确修订打开，不会在当前修订近似定位。" };
    }
    return { eventId: record.id, error: null };
  }, [caseId, revision?.id, route.issues, route.research.eventId, transitEvents, transitEventsError, transitEventsReady, view]);

  const changeTransitRoute = (next: TransitRouteState, options?: { replace?: boolean }) => {
    navigate(`${location.pathname}${buildChartSearch("transit", next)}`, { replace: options?.replace, scroll: false });
  };

  const viewHref = (nextView: ChartView) => {
    const transit = nextView === "transit" && !route.transit.atInstant
      ? { ...route.transit, atInstant: canonicalInstant(Date.now()) }
      : route.transit;
    return `${location.pathname}${buildChartSearch(nextView, transit)}`;
  };

  const visibleRouteIssues = [...new Set([
    ...route.issues,
    ...(selectedTransitNodeError ? [selectedTransitNodeError] : []),
    ...(selectedEventRoute.error ? [selectedEventRoute.error] : [])
  ])];
  const safeTransitRoute = selectedTransitNodeError
    ? { ...route.transit, selection: null }
    : route.transit;
  const safeRouteHref = `${location.pathname}${buildChartSearch(
    view,
    safeTransitRoute,
    view === "research" && selectedEventRoute.eventId
      ? { eventId: selectedEventRoute.eventId }
      : undefined
  )}`;

  const revisionHref = (nextRevisionId: string) => {
    const retainedTransit = view === "transit" || view === "research"
      ? {
          atInstant: route.transit.atInstant,
          selection: null,
          manualDirection: null,
          scale: route.transit.scale,
          tracks: route.transit.tracks
        }
      : undefined;
    return `/cases/${encodeURIComponent(caseId)}/revisions/${encodeURIComponent(nextRevisionId)}${buildChartSearch(view, retainedTransit)}`;
  };

  const openResearchForNode = (node: TransitNode) => {
    navigate(`${location.pathname}${buildChartSearch("research", {
      ...route.transit,
      atInstant: route.transit.atInstant ?? canonicalInstant(node.startInstant),
      selection: { nodeType: node.nodeType, nodeId: node.ref.nodeId }
    })}`, { scroll: false });
  };

  const selectResearchEvent = (eventId: string, options?: { replace?: boolean }) => {
    navigate(`${location.pathname}${buildChartSearch("research", route.transit, { eventId })}`, {
      replace: options?.replace,
      scroll: false
    });
  };
  const selectCell = (next: MatrixSelection) => {
    setSelection(next);
    setEvidenceOpen(true);
    if (evidenceScrollTimerRef.current !== null) {
      window.clearTimeout(evidenceScrollTimerRef.current);
      evidenceScrollTimerRef.current = null;
    }
    if (window.innerWidth < 768) {
      evidenceScrollTimerRef.current = window.setTimeout(() => {
        evidenceScrollTimerRef.current = null;
        const cell = document.querySelector<HTMLElement>('.matrix-cell[aria-pressed="true"]');
        const sheet = document.querySelector<HTMLElement>(".evidence-panel.is-open");
        if (!cell || !sheet) return;
        const cellRect = cell.getBoundingClientRect();
        const visibleBottom = sheet.getBoundingClientRect().top - 12;
        if (cellRect.bottom > visibleBottom) {
          window.scrollBy({ top: cellRect.bottom - visibleBottom, behavior: "auto" });
        }
      }, 300);
    }
  };

  const retryCaseLoad = () => {
    setCaseLoad(loadingChartCase(caseId));
    setCaseLoadVersion((current) => current + 1);
  };

  const retryTransitEvents = () => {
    setTransitEvents([]);
    setTransitEventsReady(false);
    setTransitEventsError(null);
    setTransitEventsReloadVersion((current) => current + 1);
  };

  if (caseLoading) return (
    <div
      className="chart-loading"
      {...CHART_SAFETY_ATTRIBUTES}
      role="status"
      aria-label="正在读取命盘"
    ><span /><span /><span /></div>
  );
  if (caseError || !bundle || !revision) {
    const missingRevision = Boolean(bundle && !revision && !caseError);
    return (
      <main
        className="chart-unavailable page"
        {...CHART_SAFETY_ATTRIBUTES}
        role="alert"
      >
        <div className="chart-unavailable__index" aria-hidden="true"><span>Revision route</span><strong>{missingRevision ? "SOURCE MISSING" : "READ CLOSED"}</strong></div>
        <div className="chart-unavailable__copy">
          <p className="eyebrow">Exact revision required</p>
          <h1>{missingRevision ? "确切修订不存在" : "命盘暂不可用"}</h1>
          <p>{safeVisibleText(caseError, "找不到指定修订；未自动回退到最新 Revision。")}</p>
          <small>当前地址保持不变，便于核对原始 Case 与 Revision 标识。</small>
        </div>
        <div className="chart-unavailable__actions">
          <button type="button" className="primary-action" onClick={retryCaseLoad}><RotateCcw aria-hidden="true" />{missingRevision ? "重新读取确切修订" : "重新读取"}</button>
          <AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink>
        </div>
      </main>
    );
  }

  const isTrashed = bundle.caseRecord.deletedAt !== null;
  const isLatestRevision = bundle.caseRecord.latestRevisionId === revision.id;
  const revisionHistoryLabel = `${isLatestRevision ? "当前最新" : "历史快照"} · 共 ${revisionsNewestFirst.length.toLocaleString("zh-CN")} 个修订`;
  const currentReadingTask = view === "overview"
    ? {
        index: "01",
        title: "冻结事实总览",
        description: "先核对出生输入、四柱事实与结果摘要，再进入解释或时间推导。",
        boundary: "只读浏览；不会改写当前 Revision"
      }
    : view === "structure"
      ? {
          index: "02",
          title: "结构与字段依据",
          description: "从四柱结构进入字段级依据；选择动作只改变阅读焦点，不会重算命盘。",
          boundary: evidenceOpen ? "字段依据面板已打开；Revision 保持不变" : "等待字段选择；Revision 保持不变"
        }
      : view === "transit"
        ? {
            index: "03",
            title: "冻结规则下的运限切片",
            description: "按本修订绑定的规则与时区工件读取时间切片；缺失必要前提时失败关闭。",
            boundary: transitLoading ? "正在计算精确切片" : transitError ? "时间推导已失败关闭" : "切片只读；不会覆盖原修订"
          }
        : {
            index: "04",
            title: "修订绑定的研究工作台",
            description: "把事件、运限节点和研究记录锚定在当前 Case 与 Revision，不接受近似深链。",
            boundary: selectedTransitNodeError ? "运限节点深链已失败关闭" : selectedEventRoute.error ? "事件深链已失败关闭" : selectedEventRoute.eventId ? "事件深链已精确绑定" : "研究上下文保持精确修订绑定"
          };

  return (
    <div
      className="chart-page"
      data-view={view}
      data-readonly={isTrashed ? "true" : "false"}
      data-revision-state={isLatestRevision ? "latest" : "historical"}
      {...CHART_SAFETY_ATTRIBUTES}
      aria-busy={transitContextActive && transitLoading}
    >
      <header className="chart-context-header" data-revision={`R${revision.revisionNumber}`}>
        <div className="chart-title-row">
          <AppLink href="/cases" className="icon-button" aria-label="返回案例库"><ArrowLeft aria-hidden="true" /></AppLink>
          <div className="chart-title-copy"><p className="eyebrow">Case · {bundle.caseRecord.id.slice(0, 8)}</p><h1>{safeVisibleText(bundle.caseRecord.alias, "未命名案例", 160)}</h1><p>修订 {revision.revisionNumber} · 时间精度：{timePrecisionLabels[revision.input.timePrecision]} · {safeVisibleText(revision.input.timeZone, "时区不可显示", 120)}</p></div>
        </div>
        <dl className="chart-title-pillars" aria-label="当前修订四柱摘要">
          {pillarPositions.map((position) => {
            const pillar = revision.facts.pillars[position];
            return <div key={pillar.name}><dt>{pillar.label}</dt><dd>{pillar.ganZhi}</dd></div>;
          })}
        </dl>
        <div className="chart-header-actions">
          <StatusPill tone={isTrashed ? "cinnabar" : "info"}>{isTrashed ? "案例已在回收站" : `冻结规则 ${safeVisibleText(revision.ruleProfile.profileVersion, "版本不可显示", 80)}`}</StatusPill>
          <AppLink href={`/compare?item=${encodeURIComponent(`revision:${caseId}:${revisionId}`)}`} className="secondary-action"><Columns3 aria-hidden="true" />命盘结构对照</AppLink>
          {isTrashed
            ? <button type="button" className="primary-action" disabled title="请先在案例库恢复此案例"><FilePlus2 aria-hidden="true" />由此修订派生新版</button>
            : <AppLink href={`/cases/${encodeURIComponent(caseId)}/revisions/${encodeURIComponent(revisionId)}/revise`} className="primary-action"><FilePlus2 aria-hidden="true" />由此修订派生新版</AppLink>}
        </div>
      </header>

      <div className="chart-meta-bar" role="group" aria-label="修订元数据">
        <span className="chart-meta-item chart-meta-engine"><RotateCcw aria-hidden="true" />{safeVisibleText(revision.manifest.engine.name, "引擎不可显示", 120)} {safeVisibleText(revision.manifest.engine.version, "版本不可显示", 80)}</span>
        <span className="chart-meta-item"><History aria-hidden="true" />{formatDateTime(revision.createdAt)}</span>
        <span className="chart-meta-item chart-meta-hash mono" title={revision.manifest.resultHash}>hash {shortHash(revision.manifest.resultHash)}</span>
        <label className="chart-revision-history" data-state={isLatestRevision ? "latest" : "historical"}>
          <span><strong>历史 Revision</strong><small>{revisionHistoryLabel}</small></span>
          <select aria-label="历史 Revision" value={revision.id} onChange={(event) => navigate(revisionHref(event.target.value), { scroll: false })}>{revisionsNewestFirst.map((item) => <option key={item.id} value={item.id}>R{item.revisionNumber} · {formatDateTime(item.createdAt)}</option>)}</select>
        </label>
        {isTrashed ? <span className="chart-meta-item chart-meta-readonly"><Info aria-hidden="true" />当前为回收站只读状态；恢复后才能派生新版。</span> : null}
      </div>

      {!revision.manifest.timeZoneDatabase ? <div className="inline-error" role="status"><strong>此历史修订未绑定可识别 tzdb</strong><p>已有事实与旧 hash 保持只读可验；运限等新时间推导会失败关闭。{isTrashed ? "请先在案例库恢复此案例，再由该修订派生绑定当前随包 IANA 工件的新版；" : "可由此修订派生绑定当前随包 IANA 工件的新版；"}原修订不会被覆盖。</p></div> : null}

      <section className="chart-binding-strip" aria-label="当前修订三重绑定状态">
        <div data-state="ready">
          <span aria-hidden="true">01</span>
          <div><small>Exact source</small><strong>Revision {revision.revisionNumber} 已固定</strong><p>地址中的确切 Revision ID 不会回退为最新修订。</p></div>
        </div>
        <div data-state="ready">
          <span aria-hidden="true">02</span>
          <div><small>Result digest</small><strong>结果摘要 {shortHash(revision.manifest.resultHash)}</strong><p>事实、规则和引擎描述继续受原始结果摘要约束。</p></div>
        </div>
        <div data-state={revision.manifest.timeZoneDatabase ? "ready" : "closed"}>
          <span aria-hidden="true">03</span>
          <div><small>Time artifact</small><strong>{revision.manifest.timeZoneDatabase ? `IANA ${safeVisibleText(revision.manifest.timeZoneDatabase.ianaVersion, "版本不可显示", 80)} 已绑定` : "新时间推导保持关闭"}</strong><p>{revision.manifest.timeZoneDatabase ? "运限请求使用该修订列明的固定时区工件。" : "旧事实仍可读，但不会用当前浏览器时区数据猜测新结果。"}</p></div>
        </div>
      </section>

      <section className="chart-evidence-boundary" aria-labelledby="chart-evidence-boundary-title">
        <div className="chart-evidence-boundary__heading">
          <Info aria-hidden="true" />
          <div>
            <p className="eyebrow">Evidence boundary</p>
            <h2 id="chart-evidence-boundary-title">可复算，不等于专家真值</h2>
            <p>本页固定的是本地 Case、确切 Revision、规则描述与结果摘要之间的工程绑定。复演一致只能证明当前工程链条一致，不产生专家验证、命理真值或公开发布授权。</p>
          </div>
          <StatusPill tone="warning">工程证据</StatusPill>
        </div>
        <dl className="chart-evidence-boundary__facts">
          <div><dt>精确来源</dt><dd>Case {bundle.caseRecord.id.slice(0, 8)} · Revision {revision.revisionNumber}</dd></div>
          <div><dt>确定性摘要</dt><dd className="mono" title={revision.manifest.resultHash}>{shortHash(revision.manifest.resultHash)}</dd></div>
          <div><dt>解释与发布权限</dt><dd>未由此页面授予</dd></div>
        </dl>
      </section>

      {visibleRouteIssues.length ? (
        <section className="chart-route-issues" role="alert" aria-labelledby="chart-route-issues-title">
          <TriangleAlert aria-hidden="true" />
          <div>
            <strong id="chart-route-issues-title">地址或深链参数未全部接受</strong>
            <ul>{visibleRouteIssues.map((issue, index) => <li key={`${issue}:${index}`}>{safeVisibleText(issue, "地址参数包含不可显示的问题。", 500)}</li>)}</ul>
            <small>页面没有把无效值改写为近似事实；可明确采用已经解析且仍绑定当前 Revision 的安全参数。</small>
          </div>
          <AppLink href={safeRouteHref} navigationOptions={{ scroll: false }} className="secondary-action">采用安全参数</AppLink>
        </section>
      ) : null}

      <nav className="chart-tabs" aria-label="命盘视图">
        {chartViewItems.map((item, index) => (
          <AppLink
            key={item.key}
            href={viewHref(item.key)}
            navigationOptions={{ scroll: false }}
            className={view === item.key ? "is-active" : ""}
            aria-label={item.label}
            aria-current={view === item.key ? "page" : undefined}
            aria-controls="chart-active-view"
            onClick={() => setEvidenceOpen(false)}
          >
            <span className="chart-tab-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.label}</strong>
            <small>{item.caption}</small>
          </AppLink>
        ))}
      </nav>

      <section className="chart-reading-context" data-view={view} aria-labelledby="chart-reading-context-title">
        <div className="chart-reading-context__lead">
          <span className="chart-reading-context__index" aria-hidden="true">{currentReadingTask.index}</span>
          <div>
            <p className="chart-reading-context__kicker">Active reading task · {currentReadingTask.index}/04</p>
            <h2 id="chart-reading-context-title">{currentReadingTask.title}</h2>
            <p>{currentReadingTask.description}</p>
          </div>
        </div>
        <dl className="chart-reading-context__facts">
          <div>
            <dt>读取身份</dt>
            <dd><strong>Case {safeVisibleText(bundle.caseRecord.id.slice(0, 8), "不可用", 24)} · R{revision.revisionNumber}</strong><span title={safeVisibleText(revision.id, "Revision ID 不可用", 160)}>Revision ID {safeVisibleText(revision.id.slice(0, 8), "不可用", 24)} · 冻结规则 {safeVisibleText(revision.ruleProfile.profileVersion, "版本不可显示", 80)}</span></dd>
          </div>
          <div>
            <dt>当前交互边界</dt>
            <dd><strong>{currentReadingTask.boundary}</strong><span>视图切换不会自动回退到其他 Revision</span></dd>
          </div>
          <div>
            <dt>证据口径</dt>
            <dd><strong>工程链条可复算</strong><span>不授予专家真值或公开发布权限</span></dd>
          </div>
        </dl>
      </section>

      {transitContextActive && !transitEventsReady ? (
        <div className="chart-events-status" role="status">
          <RotateCcw className="spin" aria-hidden="true" />
          <span><strong>正在读取事件索引</strong><small>完成前不定位事件深链</small></span>
        </div>
      ) : null}
      {transitContextActive && transitEventsReady && transitEventsError ? (
        <div className="chart-events-unavailable" role="alert">
          <Info aria-hidden="true" />
          <div><strong>事件索引暂不可用</strong><p>{safeVisibleText(transitEventsError, "事件索引返回了不可显示的错误。")} 运限事实仍按当前 Revision 独立计算；事件关联和深链定位保持关闭。</p></div>
          <button type="button" className="text-button" onClick={retryTransitEvents}><RotateCcw aria-hidden="true" />重试事件索引</button>
        </div>
      ) : null}

      <div id="chart-active-view" className={`chart-workspace ${view === "structure" ? "" : "chart-workspace--full"}`} role="region" aria-labelledby="chart-reading-context-title" tabIndex={-1}>
        <div className="chart-main-pane">
          {view === "overview" ? <OverviewView revision={revision} /> : null}
          {view === "structure" ? <><BaziInterpretationSummary revision={revision} /><section className="matrix-section"><div className="section-heading-row"><div><p className="eyebrow">Four pillars</p><h2>四柱结构矩阵</h2></div><p className="section-help">点击任一字段查看依据</p></div><FourPillarsMatrix facts={revision.facts} selection={selection} onSelect={selectCell} /></section><PillarRelationsPanel revision={revision} /><LuckCyclePanel key={revision.id} revision={revision} /><ProcessTrack revision={revision} /></> : null}
          {view === "transit" ? <TransitWorkbench revision={revision} route={route.transit} snapshot={transitSnapshot} events={transitEvents} loading={transitLoading} error={transitError} onRouteChange={changeTransitRoute} onOpenResearch={openResearchForNode} /> : null}
          {view === "research" ? (
            <ResearchView
              caseId={caseId}
              revision={revision}
              selection={selection}
              transitNode={selectedTransitNode}
              transitAtInstant={route.transit.atInstant}
              transitManualDirection={route.transit.manualDirection}
              selectedEventId={selectedEventRoute.eventId}
              selectedEventError={selectedEventRoute.error}
              onSelectEvent={selectResearchEvent}
              receiptSchemaVersion={caseRepository.database.targetSchemaVersion}
              receiptWritesAllowed={!isTrashed}
            />
          ) : null}
        </div>
        {view === "structure" ? <EvidencePanel revision={revision} selection={selection} open={evidenceOpen} onClose={() => setEvidenceOpen(false)} /> : null}
      </div>
      {view === "structure" && evidenceOpen ? <button type="button" className="evidence-scrim" aria-label="关闭依据面板" onClick={() => setEvidenceOpen(false)} /> : null}
    </div>
  );
}
