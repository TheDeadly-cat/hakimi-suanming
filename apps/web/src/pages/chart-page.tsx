import { ArrowLeft, Columns3, FilePlus2, History, Info, RotateCcw } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { ResearchJournal } from "../components/research-journal";
import { RevisionDerivedReplayPanel } from "../components/revision-derived-replay-panel";
import { StatusPill } from "../components/status-pill";
import { TransitWorkbench } from "../components/transit-workbench";
import { useAppBootReady } from "../lib/app-boot-ready";
import { formatDateTime, shortHash } from "../lib/format";
import { AppLink, navigate, useAppLocation } from "../lib/router";
import {
  buildChartSearch,
  canonicalInstant,
  parseChartRoute,
  type ChartView,
  type TransitRouteState
} from "../lib/transit-route";

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

function PillarStrip({ revision }: { revision: RevisionRecord }) {
  return (
    <div className="pillar-strip">
      {Object.values(revision.facts.pillars).map((pillar) => (
        <div key={pillar.name}><small>{pillar.label}</small><strong>{pillar.stem}</strong><strong>{pillar.branch}</strong><span>{pillar.stemTenGod}</span></div>
      ))}
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
      <section className="flat-section limitation-section"><Info aria-hidden="true" /><div><h2>哪些结果还不能下结论</h2><p>当前起运、大运与流年至流时都未通过金标；小运只锁定了出生时柱相邻、精确立春增龄的工程工作口径，仍待专家裁决。旺衰、格局、调候、用神、神煞与吉凶断语也未启用或未完成发布验证。</p></div></section>
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
      <div className="section-heading-row"><div><p className="eyebrow">复算脊线</p><h2 id="process-title">从输入到修订</h2></div><StatusPill tone="cinnabar">当前修订</StatusPill></div>
      <ol>{steps.map((item, index) => <li key={item.label} className={index === steps.length - 1 ? "is-current" : ""}><span /><strong>{item.label}</strong><small>{item.detail}</small></li>)}</ol>
      <p className="track-note">完整大运规则已随修订锁版；六层切片与节点事件绑定已进入“运限”页，小运裁决、人工金标与跨 DST 验收仍属于 v1 发布范围。</p>
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
      return {
        result: calculateLuckCycle({
          schemaVersion: "1.0.0",
          birthInstant: revision.timeCalibration.utcInstant,
          sex: revision.input.sex,
          ...(manualDirection ? { manualDirection } : {}),
          expectedYearGanZhi: revision.facts.pillars.year.ganZhi,
          expectedMonthGanZhi: revision.facts.pillars.month.ganZhi
        }, (revision.luckCycleRuleSnapshot ?? bindLuckCycleRuleProfile(revision.ruleProfile)) as LuckCycleRule),
        error: null
      };
    } catch (reason) {
      return { result: null, error: reason instanceof Error ? reason.message : "运限事实计算失败。" };
    }
  }, [manualDirection, revision]);

  return (
    <section className="luck-cycle-panel" aria-labelledby="luck-cycle-title">
      <div className="section-heading-row">
        <div><p className="eyebrow">Luck cycle facts</p><h2 id="luck-cycle-title">起运与十柱大运</h2></div>
        <StatusPill tone="warning">0 金标 · 工程预览</StatusPill>
      </div>
      <p className="section-help">只展示顺逆、节令时差、起运年龄和时间区间；不输出吉凶、旺衰或事件预测。</p>
      {revision.input.sex === "unspecified" && manualDirection === null ? (
        <div className="luck-manual-direction">
          <strong>性别未指定，不能静默决定顺逆</strong>
          <p>请选择仅用于本次查看的方向；它不会改写出生资料或创建修订。</p>
          <div className="button-row"><button type="button" className="secondary-action" onClick={() => setManualDirection("forward")}>人工指定顺行</button><button type="button" className="secondary-action" onClick={() => setManualDirection("backward")}>人工指定逆行</button></div>
        </div>
      ) : null}
      {calculation.error ? <div className="inline-error" role="alert"><strong>暂不能生成运限事实</strong><p>{calculation.error}</p></div> : null}
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
          <details className="known-gaps"><summary>查看当前运限发布门与已知缺口</summary><ul>{calculation.result.knownGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul></details>
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
          <div><dt>引擎</dt><dd>{result.manifest.engine.name} {result.manifest.engine.version}</dd></div>
          <div><dt>上游</dt><dd>{result.manifest.engine.upstreamName} {result.manifest.engine.upstreamVersion}</dd></div>
          <div><dt>规则配置</dt><dd>{result.ruleProfile.profileId} {result.ruleProfile.profileVersion}</dd></div>
          <div><dt>解释层</dt><dd>{result.manifest.interpretationIncluded ? "包含" : "不包含"}</dd></div>
        </dl>
        {knownGaps.length ? <ul>{knownGaps.map((gap) => <li key={gap}>{gap}</li>)}</ul> : <p>当前命中的关系没有额外已知缺口。</p>}
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

  useEffect(() => {
    let active = true;
    setCapability(null);
    setCapabilityError(null);
    setProjection(null);
    setReplayError(null);
    import("@hakimi/chart-integrity")
      .then(({ classifyRevisionNatalReplay }) => classifyRevisionNatalReplay(revision))
      .then((nextCapability) => {
        if (active) setCapability(nextCapability);
      })
      .catch((reason: unknown) => {
        if (active) {
          setCapabilityError(reason instanceof Error ? reason.message : "无法核对 Revision 复演边界");
        }
      });
    return () => { active = false; };
  }, [revision]);

  const runReplay = async () => {
    setReplaying(true);
    setProjection(null);
    setReplayError(null);
    try {
      const { replayRevisionNatalChart } = await import("@hakimi/chart-integrity");
      setProjection(await replayRevisionNatalChart(revision));
    } catch (reason) {
      setReplayError(reason instanceof Error ? reason.message : "本命盘只读复演失败");
    } finally {
      setReplaying(false);
    }
  };

  return (
    <section className="flat-section revision-replay-panel" aria-labelledby="revision-replay-title">
      <div className="section-heading-row">
        <div><p className="eyebrow">Read-only natal replay</p><h2 id="revision-replay-title">本命盘只读复演</h2></div>
        <StatusPill tone={projection?.status === "matched" ? "jade" : capability?.status === "replayable_exact" ? "warning" : "neutral"}>
          {projection?.status === "matched" ? "复演一致" : projection?.status === "mismatch" ? "发现差异" : capability?.status === "replayable_exact" ? "可精确复演" : "边界核对"}
        </StatusPill>
      </div>
      <p className="revision-replay-copy">使用冻结的出生输入、RuleProfile、完整引擎描述符与 IANA 工件在本机重新计算；不会写入数据库、创建新 Revision 或改动原记录。关系、运势与流年仍属于当前版本算法派生，不纳入本次复演声明。</p>
      {!capability && !capabilityError ? <p role="status">正在核对执行器与时区工件…</p> : null}
      {capabilityError ? <div className="inline-error" role="alert"><strong>无法验证复演能力</strong><p>{capabilityError}</p></div> : null}
      {capability?.status !== "replayable_exact" && capability ? (
        <div className="revision-replay-boundary" role="status">
          <strong>{replayUnavailableLabels[capability.status]}</strong>
          <p>{capability.reason} 系统不会改用当前引擎或 IANA 2026c 猜测旧结果。</p>
        </div>
      ) : null}
      {capability?.status === "replayable_exact" ? (
        <div className="revision-replay-ready">
          <dl className="metadata-list">
            <div><dt>历史执行器</dt><dd>{capability.executorId}</dd></div>
            <div><dt>时区工件</dt><dd>{capability.artifactRole === "current" ? "当前随包工件" : "保留随包工件"} · {revision.manifest.timeZoneDatabase?.ianaVersion}</dd></div>
            <div><dt>源快照摘要</dt><dd title={capability.revisionSnapshotDigest}>{capability.revisionSnapshotDigest}</dd></div>
          </dl>
          <button type="button" className="secondary-action" disabled={replaying} onClick={runReplay}>
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
  receiptSchemaAvailable,
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
  receiptSchemaAvailable: boolean;
  receiptWritesAllowed: boolean;
}) {
  const [receiptRefreshToken, setReceiptRefreshToken] = useState(0);
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
      ) : null}
      <RevisionDerivedReplayPanel
        key={`${revision.id}:${transitAtInstant ?? "no-transit"}`}
        revision={revision}
        atInstant={transitAtInstant}
        routeManualDirection={transitManualDirection}
        onSaveSnapshot={receiptSchemaAvailable && receiptWritesAllowed ? saveCalculationSnapshot : undefined}
      />
      <section className="flat-section">
        <div className="section-heading-row"><div><p className="eyebrow">Reproducibility</p><h2>复算元数据</h2></div><StatusPill tone="warning">{revision.manifest.verificationStatus}</StatusPill></div>
        <dl className="metadata-list">
          <div><dt>结果哈希</dt><dd title={revision.manifest.resultHash}>{revision.manifest.resultHash}</dd></div>
          <div><dt>规则哈希</dt><dd title={revision.manifest.ruleProfileDigest}>{revision.manifest.ruleProfileDigest}</dd></div>
          {revision.rulePackBinding ? <>
            <div><dt>规则包来源</dt><dd>{revision.rulePackBinding.packId}</dd></div>
            <div><dt>规则包摘要</dt><dd title={revision.rulePackBinding.packDigest}>{revision.rulePackBinding.packDigest}</dd></div>
            <div><dt>绑定 Profile</dt><dd>{revision.rulePackBinding.profileId}@{revision.rulePackBinding.profileVersion} · {revision.rulePackBinding.useMode === "exact" ? "精确使用" : revision.rulePackBinding.useMode}</dd></div>
            <div><dt>Profile 摘要</dt><dd title={revision.rulePackBinding.profileDigest}>{revision.rulePackBinding.profileDigest}</dd></div>
          </> : <div><dt>规则包来源</dt><dd>未绑定安装包 · 内置或派生规则快照</dd></div>}
          <div><dt>引擎</dt><dd>{revision.manifest.engine.name} {revision.manifest.engine.version}</dd></div>
          <div><dt>上游</dt><dd>{revision.manifest.engine.upstreamName} {revision.manifest.engine.upstreamVersion}</dd></div>
          <div><dt>时区库</dt><dd>{revision.manifest.timeZoneDatabase ? `IANA ${revision.manifest.timeZoneDatabase.ianaVersion} · 固定工件` : "旧版浏览器 Intl · 具体版本未识别"}</dd></div>
          {revision.manifest.timeZoneDatabase ? <div><dt>tzdb 数据摘要</dt><dd title={revision.manifest.timeZoneDatabase.dataSha256}>{revision.manifest.timeZoneDatabase.dataSha256}</dd></div> : null}
          <div><dt>DST 解析</dt><dd>{revision.timeCalibration.timeZoneResolution?.status ?? revision.timeCalibration.dstStatus}</dd></div>
          <div><dt>太阳时模型</dt><dd>{revision.timeCalibration.solarTime?.modelId ?? "未生成"}</dd></div>
          <div><dt>Schema</dt><dd>{revision.manifest.schemaVersion} · hash {revision.manifest.hashSchemaVersion}</dd></div>
        </dl>
      </section>
      <section className="flat-section">
        <div className="section-heading-row"><div><p className="eyebrow">Rule profile</p><h2>{revision.ruleProfile.label}</h2></div><StatusPill tone="warning">{revision.ruleProfile.status}</StatusPill></div>
        <dl className="rule-grid">
          <div><dt>界年</dt><dd>{revision.ruleProfile.calendar.yearBoundary}</dd></div>
          <div><dt>界月</dt><dd>{revision.ruleProfile.calendar.monthBoundary}</dd></div>
          <div><dt>换日</dt><dd>{revision.ruleProfile.calendar.dayBoundary}</dd></div>
          <div><dt>时间基准</dt><dd>{revision.ruleProfile.calendar.hourBasis}</dd></div>
          <div><dt>真太阳时</dt><dd>{revision.ruleProfile.solarTime.enabled ? "采用" : "未采用"}</dd></div>
          <div><dt>神煞</dt><dd>{revision.ruleProfile.layers.shensha ? "开启" : "关闭"}</dd></div>
        </dl>
        <p className="snapshot-notice">{revision.ruleProfile.notice}</p>
      </section>
      <section className="flat-section">
        <p className="eyebrow">Field provenance</p><h2>字段溯源状态</h2>
        <div className="provenance-list">{revision.facts.fieldProvenance.map((item) => <div key={item.field}><code>{item.field}</code><span>{item.algorithmId}</span><StatusPill tone="warning">{item.verificationStatus}</StatusPill></div>)}</div>
      </section>
      <ResearchJournal
        caseId={caseId}
        revision={revision}
        selection={selection}
        transitNode={transitNode}
        defaultTimeZone={revision.input.timeZone}
        selectedEventId={selectedEventId}
        selectedEventError={selectedEventError}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
}

export function ChartPage({ caseId, revisionId }: { caseId: string; revisionId: string }) {
  const appBootReady = useAppBootReady();
  const location = useAppLocation();
  const route = useMemo(() => parseChartRoute(location.search), [location.search]);
  const view = route.view;
  const [bundle, setBundle] = useState<CaseBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<MatrixSelection>({ pillar: "day", field: "stem" });
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [transitSnapshot, setTransitSnapshot] = useState<TransitSnapshot | null>(null);
  const [transitEvents, setTransitEvents] = useState<Awaited<ReturnType<typeof researchRepository.listEventsByCase>>>([]);
  const [transitEventsReady, setTransitEventsReady] = useState(false);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitError, setTransitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    caseRepository.getCase(caseId).then((result) => {
      if (!active) return;
      if (!result) setError("案例不存在或已经从此浏览器删除。");
      else setBundle(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "无法读取案例");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [caseId]);

  const revision = useMemo(() => bundle?.revisions.find((item) => item.id === revisionId) ?? null, [bundle, revisionId]);

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
    setTransitError(null);
    calculateTransitSnapshot({
      revision,
      atInstant: route.transit.atInstant,
      ...(route.transit.manualDirection ? { manualDirection: route.transit.manualDirection } : {})
    }).then((result) => {
      if (active) setTransitSnapshot(result);
    }).catch((reason: unknown) => {
      if (!active) return;
      setTransitSnapshot(null);
      setTransitError(reason instanceof Error ? reason.message : "无法生成运限切片。");
    }).finally(() => {
      if (active) setTransitLoading(false);
    });
    return () => { active = false; };
  }, [revision, route.transit.atInstant, route.transit.manualDirection, view]);

  useEffect(() => {
    if (!revision || (view !== "transit" && view !== "research")) {
      setTransitEvents([]);
      setTransitEventsReady(false);
      return;
    }
    let active = true;
    setTransitEventsReady(false);
    researchRepository.listEventsByCase(caseId, { includeDeleted: true }).then((records) => {
      if (active) setTransitEvents(records);
    }).catch(() => {
      if (active) setTransitEvents([]);
    }).finally(() => {
      if (active) setTransitEventsReady(true);
    });
    return () => { active = false; };
  }, [caseId, revision, view]);

  const selectedTransitNode = useMemo(() => {
    if (!transitSnapshot || !route.transit.selection) return null;
    return Object.values(transitSnapshot.tracks)
      .flat()
      .find((node) =>
        node.nodeType === route.transit.selection?.nodeType &&
        node.ref.nodeId === route.transit.selection.nodeId
      ) ?? null;
  }, [route.transit.selection, transitSnapshot]);

  const selectedEventRoute = useMemo(() => {
    const routeIssue = route.issues.find((issue) => issue.includes("事件")) ?? null;
    if (routeIssue) return { eventId: null, error: routeIssue };
    const eventId = route.research.eventId;
    if (!eventId || view !== "research") return { eventId: null, error: null };
    if (!transitEventsReady) return { eventId: null, error: null };
    const record = transitEvents.find((event) => event.id === eventId) ?? null;
    if (!record || record.caseId !== caseId) {
      return { eventId: null, error: "事件深链不属于当前案例或记录不存在；不会定位到近似事件。" };
    }
    if (record.revisionId !== revision?.id) {
      return { eventId: null, error: "事件深链属于其他 Revision；请从该事件绑定的精确修订打开，不会在当前修订近似定位。" };
    }
    return { eventId: record.id, error: null };
  }, [caseId, revision?.id, route.issues, route.research.eventId, transitEvents, transitEventsReady, view]);

  const changeTransitRoute = (next: TransitRouteState, options?: { replace?: boolean }) => {
    navigate(`${location.pathname}${buildChartSearch("transit", next)}`, { replace: options?.replace, scroll: false });
  };

  const viewHref = (nextView: ChartView) => {
    const transit = nextView === "transit" && !route.transit.atInstant
      ? { ...route.transit, atInstant: canonicalInstant(Date.now()) }
      : route.transit;
    return `${location.pathname}${buildChartSearch(nextView, transit)}`;
  };

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
    return `/cases/${caseId}/revisions/${nextRevisionId}${buildChartSearch(view, retainedTransit)}`;
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
    if (window.innerWidth < 768) {
      window.setTimeout(() => {
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

  if (loading) return <div className="chart-loading" role="status" aria-label="正在读取命盘"><span /><span /><span /></div>;
  if (error || !bundle || !revision) return <div className="error-panel page" role="alert"><strong>命盘暂不可用</strong><p>{error ?? "找不到指定修订。"}</p><AppLink href="/cases" className="secondary-action"><ArrowLeft aria-hidden="true" />返回案例库</AppLink></div>;

  const isTrashed = bundle.caseRecord.deletedAt !== null;

  return (
    <div className="chart-page">
      <header className="chart-context-header">
        <div className="chart-title-row">
          <AppLink href="/cases" className="icon-button" aria-label="返回案例库"><ArrowLeft aria-hidden="true" /></AppLink>
          <div><p className="eyebrow">Case · {bundle.caseRecord.id.slice(0, 8)}</p><h1>{bundle.caseRecord.alias}</h1><p>修订 {revision.revisionNumber} · 时间精度：{timePrecisionLabels[revision.input.timePrecision]} · {revision.input.timeZone}</p></div>
        </div>
        <div className="chart-header-actions">
          <StatusPill tone={isTrashed ? "cinnabar" : "warning"}>{isTrashed ? "案例已在回收站" : `工作默认 ${revision.ruleProfile.profileVersion}`}</StatusPill>
          <AppLink href={`/compare?item=${encodeURIComponent(`revision:${caseId}:${revisionId}`)}`} className="secondary-action"><Columns3 aria-hidden="true" />正式对照</AppLink>
          {isTrashed
            ? <button type="button" className="primary-action" disabled title="请先在案例库恢复此案例"><FilePlus2 aria-hidden="true" />由此修订派生新版</button>
            : <AppLink href={`/cases/${caseId}/revisions/${revisionId}/revise`} className="primary-action"><FilePlus2 aria-hidden="true" />由此修订派生新版</AppLink>}
        </div>
      </header>

      <div className="chart-meta-bar">
        <span><RotateCcw aria-hidden="true" />{revision.manifest.engine.name} {revision.manifest.engine.version}</span>
        <span><History aria-hidden="true" />{formatDateTime(revision.createdAt)}</span>
        <span className="mono" title={revision.manifest.resultHash}>hash {shortHash(revision.manifest.resultHash)}</span>
        <label className="chart-revision-history"><span>历史 Revision</span><select aria-label="历史 Revision" value={revision.id} onChange={(event) => navigate(revisionHref(event.target.value), { scroll: false })}>{bundle.revisions.map((item) => <option key={item.id} value={item.id}>R{item.revisionNumber} · {formatDateTime(item.createdAt)}</option>)}</select></label>
        {isTrashed ? <span><Info aria-hidden="true" />当前为回收站只读状态；恢复后才能派生新版。</span> : null}
      </div>

      {!revision.manifest.timeZoneDatabase ? <div className="inline-error" role="status"><strong>此历史修订未绑定可识别 tzdb</strong><p>已有事实与旧 hash 保持只读可验；运限等新时间推导会失败关闭。请使用“由此修订派生新版”，生成绑定 IANA 2026c 的新 Revision，原修订不会被覆盖。</p></div> : null}

      <nav className="chart-tabs" aria-label="命盘视图">
        {(["overview", "structure", "transit", "research"] as const).map((key) => {
          const labels = { overview: "概览", structure: "结构", transit: "运限", research: "研读" };
          return <AppLink key={key} href={viewHref(key)} navigationOptions={{ scroll: false }} className={view === key ? "is-active" : ""} aria-current={view === key ? "page" : undefined} onClick={() => setEvidenceOpen(false)}>{labels[key]}</AppLink>;
        })}
      </nav>

      <div className={`chart-workspace ${view === "structure" ? "" : "chart-workspace--full"}`}>
        <div className="chart-main-pane">
          {view === "overview" ? <OverviewView revision={revision} /> : null}
          {view === "structure" ? <><section className="matrix-section"><div className="section-heading-row"><div><p className="eyebrow">Four pillars</p><h2>四柱结构矩阵</h2></div><p className="section-help">点击任一字段查看依据</p></div><FourPillarsMatrix facts={revision.facts} selection={selection} onSelect={selectCell} /></section><PillarRelationsPanel revision={revision} /><LuckCyclePanel key={revision.id} revision={revision} /><ProcessTrack revision={revision} /></> : null}
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
              receiptSchemaAvailable={caseRepository.database.targetSchemaVersion >= 15}
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
