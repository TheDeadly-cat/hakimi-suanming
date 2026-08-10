import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  GitCompareArrows,
  ShieldAlert,
  Upload
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE,
  preflightCalendarDivergenceWindows
} from "@hakimi/gold-standard/calendar-divergence-windows";
import type {
  CalendarDivergenceAdjudicationPreflight,
  CalendarDivergenceIndependentReviewEnvelope,
  CalendarDivergenceReviewBundleEnvelope
} from "@hakimi/gold-standard/calendar-divergence-review";
import { pickTextFile, saveTextFile } from "@hakimi/platform";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import { resolveFileDelivery } from "../lib/file-transfer-feedback";
import { AppLink } from "../lib/router";

type RowFilter = "all" | "divergence" | "trigger";

const FILTERS: Array<{ id: RowFilter; label: string }> = [
  { id: "all", label: "全部 64 日" },
  { id: "divergence", label: "只看 60 日分歧" },
  { id: "trigger", label: "只看 7 个原始触发" }
];

const SOURCE_ROLE_LABELS = {
  authoritative: "权威历表",
  astronomical_reference: "政府天文事件",
  current_adapter: "当前适配器",
  crosscheck: "独立软件差分"
} as const;

function lunarText(value: { lunarDate: string; lunarLeapMonth: boolean }) {
  return `${value.lunarDate}${value.lunarLeapMonth ? " · 闰月" : ""}`;
}

function windowTitle(windowId: string) {
  return windowId.includes("2089") ? "2089 年八月月首窗口" : "2097 年七月月首窗口";
}

function favoredLineage(value: "hko_current_icu" | "dotnet") {
  return value === "hko_current_icu"
    ? "分钟值倾向 HKO / 当前适配器 / ICU"
    : "分钟值倾向 .NET 的次日月首";
}

export function CalendarDivergenceAuditPage() {
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [fixtureIntegrity, setFixtureIntegrity] = useState<"checking" | "valid" | "invalid">("checking");
  const [fixtureIntegrityError, setFixtureIntegrityError] = useState<string | null>(null);
  const [reviewBundle, setReviewBundle] = useState<CalendarDivergenceReviewBundleEnvelope | null>(null);
  const [reviewA, setReviewA] = useState<CalendarDivergenceIndependentReviewEnvelope | null>(null);
  const [reviewB, setReviewB] = useState<CalendarDivergenceIndependentReviewEnvelope | null>(null);
  const [adjudication, setAdjudication] = useState<CalendarDivergenceAdjudicationPreflight | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const { payload, digest } = CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE;
  const visibleCaseCount = payload.windows.reduce((total, window) => total + window.cases.filter((candidate) => {
    if (rowFilter === "divergence") return candidate.role === "divergence";
    if (rowFilter === "trigger") return candidate.triggerCaseIds.length > 0;
    return true;
  }).length, 0);

  useEffect(() => {
    let active = true;
    void preflightCalendarDivergenceWindows(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE)
      .then(() => {
        if (active) setFixtureIntegrity("valid");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setFixtureIntegrity("invalid");
        setFixtureIntegrityError(reason instanceof Error ? reason.message : "连续窗口摘要验证失败。");
      });
    return () => {
      active = false;
    };
  }, []);

  const resetReviewChain = () => {
    setReviewA(null);
    setReviewB(null);
    setAdjudication(null);
  };

  const exportReviewBundle = async () => {
    setReviewBusy(true);
    setReviewError(null);
    setReviewMessage(null);
    try {
      const {
        createCalendarDivergenceReviewBundle,
        serializeCalendarDivergenceReviewBundle
      } = await import("@hakimi/gold-standard/calendar-divergence-review");
      const envelope = await createCalendarDivergenceReviewBundle();
      const fileName = `hakimi-calendar-divergence-review-${new Date().toISOString().slice(0, 10)}.json`;
      const delivery = resolveFileDelivery(await saveTextFile(
        fileName,
        serializeCalendarDivergenceReviewBundle(envelope),
        "application/json;charset=utf-8"
      ), "连续历法候选包导出");
      if (delivery.kind === "error") throw new Error(delivery.message);
      if (delivery.kind === "cancelled") {
        setReviewMessage(delivery.message);
        return;
      }
      setReviewBundle(envelope);
      resetReviewChain();
      setReviewMessage(`${delivery.message} 已载入内容寻址的 64 日候选包；该操作不会增加金标。`);
    } catch (reason) {
      setReviewError(reason instanceof Error ? reason.message : "连续历法候选包导出失败。");
    } finally {
      setReviewBusy(false);
    }
  };

  const chooseReviewBundle = async () => {
    setReviewBusy(true);
    setReviewError(null);
    setReviewMessage(null);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 4 * 1024 * 1024 });
      if (!file) return;
      const { preflightCalendarDivergenceReviewBundle } = await import(
        "@hakimi/gold-standard/calendar-divergence-review"
      );
      const envelope = await preflightCalendarDivergenceReviewBundle(file.text);
      setReviewBundle(envelope);
      resetReviewChain();
      setReviewMessage(`候选包已预检并载入：${file.name}。`);
    } catch (reason) {
      setReviewBundle(null);
      resetReviewChain();
      setReviewError(reason instanceof Error ? reason.message : "连续历法候选包预检失败。");
    } finally {
      setReviewBusy(false);
    }
  };

  const chooseIndependentReview = async (slot: "A" | "B") => {
    setReviewError(null);
    setReviewMessage(null);
    setAdjudication(null);
    if (!reviewBundle) {
      setReviewError("请先导出当前候选包，或载入并预检审核人实际使用的候选包。");
      return;
    }
    setReviewBusy(true);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 2 * 1024 * 1024 });
      if (!file) return;
      const { preflightCalendarDivergenceIndependentReview } = await import(
        "@hakimi/gold-standard/calendar-divergence-review"
      );
      const result = await preflightCalendarDivergenceIndependentReview(file.text, {
        reviewBundle
      });
      if (slot === "A") setReviewA(result.envelope);
      else setReviewB(result.envelope);
      setReviewMessage(
        `独立审核 ${slot} 已通过摘要与 64 日覆盖预检；仍有 ${result.unresolvedCaseCount} 日未决，现实身份尚未核验。`
      );
    } catch (reason) {
      if (slot === "A") setReviewA(null);
      else setReviewB(null);
      setReviewError(reason instanceof Error ? reason.message : `独立审核 ${slot} 预检失败。`);
    } finally {
      setReviewBusy(false);
    }
  };

  const chooseAdjudication = async () => {
    setReviewError(null);
    setReviewMessage(null);
    setAdjudication(null);
    if (!reviewBundle || !reviewA || !reviewB) {
      setReviewError("请先载入当前候选包及两份独立审核，再预检第三方裁决。");
      return;
    }
    setReviewBusy(true);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: 2 * 1024 * 1024 });
      if (!file) return;
      const { preflightCalendarDivergenceAdjudication } = await import(
        "@hakimi/gold-standard/calendar-divergence-review"
      );
      const result = await preflightCalendarDivergenceAdjudication(file.text, {
        reviewBundle,
        independentReviews: [reviewA, reviewB]
      });
      setAdjudication(result);
      setReviewMessage(
        result.allCaseDecisionsResolved
          ? "64 日逐日裁决在结构上均已解决；离线身份核验和维护者整合门仍保持关闭。"
          : `裁决预检通过，但仍有 ${result.unresolvedCaseCount} 日未决，禁止整合。`
      );
    } catch (reason) {
      setReviewError(reason instanceof Error ? reason.message : "第三方裁决预检失败。");
    } finally {
      setReviewBusy(false);
    }
  };

  if (fixtureIntegrity !== "valid") {
    return (
      <div className="page calendar-divergence-audit-page">
        <PageHeading
          eyebrow="P0-03 · Calendar boundary audit"
          title="连续历法差异审计"
          description="先验证冻结窗口的规范摘要，再显示逐日证据与审核入口。"
          actions={<AppLink href="/settings" className="secondary-action">返回设置与诊断</AppLink>}
        />
        <section
          className="calendar-audit-integrity-gate"
          role={fixtureIntegrity === "invalid" ? "alert" : "status"}
        >
          <ShieldAlert aria-hidden="true" />
          <div>
            <h2>{fixtureIntegrity === "invalid" ? "冻结窗口完整性验证失败" : "正在验证 64 日冻结窗口…"}</h2>
            <p>{fixtureIntegrity === "invalid"
              ? `${fixtureIntegrityError ?? "摘要不匹配。"} 页面已失败关闭，不显示或导出未验真的审计数据。`
              : "正在复算 payload SHA-256，并检查 64 日连续覆盖、来源角色与零金标边界。"}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page calendar-divergence-audit-page">
      <PageHeading
        eyebrow="P0-03 · Calendar boundary audit"
        title="连续历法差异审计"
        description="把 7 个随机差异点还原成两个完整月段，并同时保留 HKO 历表、USNO 朔时刻、ICU 与 .NET 的不同证据角色。"
        actions={<AppLink href="/settings" className="secondary-action">返回设置与诊断</AppLink>}
      />

      <section className="calendar-audit-lead" aria-labelledby="calendar-audit-state-title">
        <div>
          <p className="eyebrow">Fail-closed result</p>
          <h2 id="calendar-audit-state-title">两处朔日都紧贴 UTC+8 午夜，当前必须保持未决</h2>
          <p>2089 年事件落在 23:59，2097 年事件落在次日 00:01。它们不是“某个实现总是慢一天”的同一类错误；香港天文台也公开点名这两处远期朔日可能出现一日差异。</p>
        </div>
        <div className="calendar-audit-state">
          <StatusPill tone="warning">engineering diagnostic · unresolved</StatusPill>
          <strong>verified +0</strong>
          <span>不占用 360 金标配额</span>
        </div>
      </section>

      <section className="calendar-audit-metrics" aria-label="连续窗口摘要">
        <div><CalendarDays aria-hidden="true" /><strong>{payload.declaredCounts.windows}</strong><span>连续窗口</span></div>
        <div><FileCheck2 aria-hidden="true" /><strong>{payload.declaredCounts.cases}</strong><span>逐日案例</span></div>
        <div><GitCompareArrows aria-hidden="true" /><strong>{payload.declaredCounts.divergence}</strong><span>连续分歧日</span></div>
        <div><CheckCircle2 aria-hidden="true" /><strong>{payload.declaredCounts.controls}</strong><span>前后控制日</span></div>
        <div><AlertTriangle aria-hidden="true" /><strong>{payload.declaredCounts.triggerCases}/7</strong><span>原报告触发已绑定</span></div>
        <div><ShieldAlert aria-hidden="true" /><strong>0</strong><span>已验证金标增量</span></div>
      </section>

      <section className="calendar-audit-boundary-note" aria-labelledby="calendar-audit-boundary-title">
        <Clock3 aria-hidden="true" />
        <div>
          <p className="eyebrow">Why unresolved</p>
          <h2 id="calendar-audit-boundary-title">USNO 是天文事件证据，不是第二份完整中国农历表</h2>
          <p>USNO API v4.0.1 只给出分钟级朔时刻：2089-09-04 15:59 UT 与 2097-08-07 16:01 UT。前者倾向当前实现，后者倾向 .NET；两者距固定 UTC+8 午夜都约 1 分钟，因此证据增强了边界归因，却没有消除不确定性。</p>
          <div className="calendar-audit-source-links">
            <a href="https://www.hko.gov.hk/en/gts/time/conversion.htm" target="_blank" rel="noreferrer">HKO 不确定性备注 <ExternalLink aria-hidden="true" /></a>
            <a href="https://aa.usno.navy.mil/data/api" target="_blank" rel="noreferrer">USNO API 文档 <ExternalLink aria-hidden="true" /></a>
            <a href="https://unicode-org.github.io/icu/userguide/datetime/calendar/" target="_blank" rel="noreferrer">ICU Calendar 文档 <ExternalLink aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <div className="calendar-audit-toolbar" aria-label="逐日案例筛选">
        <div role="group" aria-label="筛选逐日案例">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={rowFilter === filter.id ? "is-active" : ""}
              aria-pressed={rowFilter === filter.id}
              onClick={() => setRowFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p role="status" aria-live="polite">当前显示 {visibleCaseCount} 日；筛选不会改变冻结数据。</p>
      </div>

      <div className="calendar-audit-window-list">
        {payload.windows.map((window) => {
          const visibleCases = window.cases.filter((candidate) => {
            if (rowFilter === "divergence") return candidate.role === "divergence";
            if (rowFilter === "trigger") return candidate.triggerCaseIds.length > 0;
            return true;
          });
          return (
            <section className="calendar-audit-window" key={window.windowId} aria-labelledby={`${window.windowId}-title`}>
              <header>
                <div>
                  <p className="eyebrow">{window.startDate} → {window.endDate}</p>
                  <h2 id={`${window.windowId}-title`}>{windowTitle(window.windowId)}</h2>
                  <p>32 日闭区间 · 30 日连续偏移 · 2 个边界控制日 · 原始触发 {window.triggerCaseIds.length} 个</p>
                </div>
                <StatusPill tone="warning">未决</StatusPill>
              </header>

              <div className="calendar-audit-root-cause">
                <div><span>USNO 朔时刻（UT）</span><strong>{window.rootCauseAssessment.newMoonUtc.replace("T", " ").replace(":00.000Z", " UT")}</strong></div>
                <div><span>固定 UTC+8</span><strong>{window.rootCauseAssessment.fixedPlus08Local.replace("T", " ").replace("+08:00", " UTC+8")}</strong></div>
                <div><span>距午夜</span><strong>约 {window.rootCauseAssessment.distanceFromLocalMidnightMinutes} 分钟</strong></div>
                <div><span>分钟级倾向</span><strong>{favoredLineage(window.rootCauseAssessment.favors)}</strong></div>
                <p>{window.rootCauseAssessment.authorityCaveat}</p>
              </div>

              {visibleCases.length > 0 ? (
                <div className="calendar-audit-table-wrap">
                  <table className="calendar-audit-table">
                    <thead>
                      <tr>
                        <th scope="col">公历日期</th>
                        <th scope="col">HKO</th>
                        <th scope="col">当前适配器</th>
                        <th scope="col">ICU 78.3</th>
                        <th scope="col">.NET 4.8</th>
                        <th scope="col">证据角色</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCases.map((candidate) => (
                        <tr key={candidate.caseId} className={candidate.role === "control" ? "is-control" : "is-divergence"}>
                          <th scope="row" data-label="公历日期">
                            {candidate.gregorianDate}
                            {candidate.triggerCaseIds.map((caseId) => <small key={caseId}>{caseId}</small>)}
                          </th>
                          <td data-label="HKO">{lunarText(candidate.observations.hko)}</td>
                          <td data-label="当前适配器">{lunarText(candidate.observations.currentAdapter)}</td>
                          <td data-label="ICU 78.3">{lunarText(candidate.observations.icu)}</td>
                          <td data-label=".NET 4.8">{lunarText(candidate.observations.dotnet)}</td>
                          <td data-label="证据角色">
                            <StatusPill tone={candidate.role === "control" ? "jade" : "warning"}>
                              {candidate.role === "control" ? "控制日一致" : "月首差异传播"}
                            </StatusPill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="calendar-audit-empty">这个窗口没有符合当前筛选条件的日期。</p>}
            </section>
          );
        })}
      </div>

      <section className="calendar-audit-sources" aria-labelledby="calendar-audit-sources-title">
        <div className="calendar-audit-section-heading">
          <div>
            <p className="eyebrow">Frozen provenance</p>
            <h2 id="calendar-audit-sources-title">7 个来源快照，角色严格分离</h2>
          </div>
          <p>HKO 两个年份仍属于同一来源谱系；不同文件不能重复冒充两个权威来源。</p>
        </div>
        <div className="calendar-audit-source-grid">
          {payload.sources.map((source) => (
            <article key={source.sourceId}>
              <StatusPill tone={source.role === "authoritative" || source.role === "astronomical_reference" ? "info" : "neutral"}>
                {SOURCE_ROLE_LABELS[source.role]}
              </StatusPill>
              <h3>{source.title}</h3>
              <p>{source.note}</p>
              <dl>
                <div><dt>版本</dt><dd>{source.version}</dd></div>
                <div><dt>来源 ID</dt><dd>{source.sourceId}</dd></div>
                {source.artifacts.map((artifact) => (
                  <div key={artifact.sha256}><dt>{artifact.label}</dt><dd>{artifact.sha256}</dd></div>
                ))}
              </dl>
              <a href={source.sourceRef} target="_blank" rel="noreferrer">打开公开来源 <ExternalLink aria-hidden="true" /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="calendar-audit-review-protocol" aria-labelledby="calendar-audit-review-title">
        <div className="calendar-audit-section-heading">
          <div>
            <p className="eyebrow">Independent review protocol</p>
            <h2 id="calendar-audit-review-title">候选包 → 独立审核 A / B → 第三方裁决</h2>
          </div>
          <StatusPill tone="warning">任何未决都阻止整合</StatusPill>
        </div>
        <ol>
          <li><strong>1</strong><div><h3>内容寻址候选包</h3><p>绑定 64 日、7 个触发、P0-03 原报告、来源快照与逐日摘要。</p></div></li>
          <li><strong>2A</strong><div><h3>独立审核 A</h3><p>现实审核人逐日判断；绑定 reviewer ID 与离线身份记录摘要。</p></div></li>
          <li><strong>2B</strong><div><h3>独立审核 B</h3><p>另一位审核人独立覆盖同一 64 日，不能复用 A 的身份或文件。</p></div></li>
          <li><strong>3</strong><div><h3>第三方裁决</h3><p>裁决人必须与 A/B 不同；不能用“全部接受”跳过逐日决定。</p></div></li>
        </ol>
        <div className="calendar-audit-review-console" aria-label="连续历法审核文件预检">
          <div className="calendar-audit-review-actions">
            <button type="button" className="secondary-action" disabled={reviewBusy} onClick={() => void exportReviewBundle()}>
              <Download aria-hidden="true" />导出 64 日候选包
            </button>
            <button type="button" className="secondary-action" disabled={reviewBusy} onClick={() => void chooseReviewBundle()}>
              <Upload aria-hidden="true" />载入候选包
            </button>
            <button type="button" className="secondary-action" disabled={reviewBusy || !reviewBundle} onClick={() => void chooseIndependentReview("A")}>
              <Upload aria-hidden="true" />预检独立审核 A
            </button>
            <button type="button" className="secondary-action" disabled={reviewBusy || !reviewBundle} onClick={() => void chooseIndependentReview("B")}>
              <Upload aria-hidden="true" />预检独立审核 B
            </button>
            <button type="button" className="secondary-action" disabled={reviewBusy || !reviewBundle || !reviewA || !reviewB} onClick={() => void chooseAdjudication()}>
              <Upload aria-hidden="true" />预检第三方裁决
            </button>
          </div>
          {reviewBusy ? <p role="status">正在执行内容摘要与覆盖预检…</p> : null}
          {reviewMessage ? <p className="calendar-audit-review-message" role="status">{reviewMessage}</p> : null}
          {reviewError ? <p className="calendar-audit-review-error" role="alert">{reviewError}</p> : null}
          <dl>
            <div><dt>候选包</dt><dd>{reviewBundle ? `64 日 · sha256:${reviewBundle.digest}` : "尚未载入"}</dd></div>
            <div><dt>审核 A</dt><dd>{reviewA ? `${reviewA.payload.reviewer.reviewerId} · 未决 ${reviewA.payload.declaredCounts.unresolved}` : "尚未载入"}</dd></div>
            <div><dt>审核 B</dt><dd>{reviewB ? `${reviewB.payload.reviewer.reviewerId} · 未决 ${reviewB.payload.declaredCounts.unresolved}` : "尚未载入"}</dd></div>
            <div><dt>裁决</dt><dd>{adjudication ? `${adjudication.unresolvedCaseCount} 日未决 · 不可自动整合` : "尚未载入"}</dd></div>
          </dl>
          <p className="calendar-audit-review-disclaimer">所有通过结果仍固定 `identityVerified=false`、`eligibleForCuratedIntegration=false`、`verifiedGoldDelta=0`；页面只做本地只读预检。</p>
        </div>
        <div className="calendar-audit-release-boundary">
          <ShieldAlert aria-hidden="true" />
          <div>
            <strong>本页是工程证据，不是发布金标。</strong>
            <p>{payload.releaseBoundary.notice}</p>
            <code>dataset sha256:{digest}</code>
            <code>parent report sha256:{payload.parentDiagnostic.reportDigest}</code>
          </div>
        </div>
      </section>
    </div>
  );
}
