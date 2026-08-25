import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  GitCompareArrows,
  LoaderCircle,
  Printer,
  ShieldAlert,
  Upload
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE,
  preflightCalendarDivergenceWindows
} from "@hakimi/gold-standard/calendar-divergence-windows";
import type {
  CalendarDivergenceAdjudicationPreflight,
  CalendarDivergenceIndependentReviewEnvelope,
  CalendarDivergenceReviewBundleEnvelope
} from "@hakimi/gold-standard/calendar-divergence-review";
import { pickTextFile, webReportExportPort } from "@hakimi/platform";
import { PageHeading } from "../components/page-heading";
import {
  PreparedFileDeliveryDialog,
  type PreparedFileArtifact
} from "../components/prepared-file-delivery-dialog";
import { StatusPill } from "../components/status-pill";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage, safeVisibleText } from "../lib/visible-text";
import "./calendar-divergence-audit-page.css";

type RowFilter = "all" | "divergence" | "trigger";
type ReviewOperation = "export_bundle" | "load_bundle" | "review_a" | "review_b" | "adjudication";
type ReviewBundleReceipt = Readonly<{
  origin: "generated" | "imported";
  fileName: string;
  deliveryStatus: "prepared" | "preflighted";
  boundAt: string;
  contentByteLength: number;
  bundleDigest: string;
  fixtureDigest: string;
}>;

const FILTERS: Array<{ id: RowFilter; label: string }> = [
  { id: "all", label: "全部日期" },
  { id: "divergence", label: "连续分歧" },
  { id: "trigger", label: "原始触发" }
];

const SOURCE_ROLE_LABELS = {
  authoritative: "权威历表",
  astronomical_reference: "政府天文事件",
  current_adapter: "当前适配器",
  crosscheck: "独立软件差分"
} as const;

const REVIEW_OPERATION_LABELS: Record<ReviewOperation, string> = {
  export_bundle: "正在生成、复算并冻结当前候选包",
  load_bundle: "正在读取并预检候选包",
  review_a: "正在预检独立审核 A",
  review_b: "正在预检独立审核 B",
  adjudication: "正在预检第三方逐日裁决"
};

const REVIEW_BUNDLE_MAX_BYTES = 4 * 1024 * 1024;
const REVIEW_RESPONSE_MAX_BYTES = 2 * 1024 * 1024;
const SHA256_DIGEST_PATTERN = /^[a-f0-9]{64}$/u;

function checkedTextByteLength(value: string, maxBytes: number, label: string): number {
  const byteLength = new Blob([value]).size;
  if (!Number.isSafeInteger(byteLength) || byteLength <= 0 || byteLength > maxBytes) {
    throw new Error(`${label}必须是非空文本，且不得超过 ${(maxBytes / 1024 / 1024).toLocaleString("zh-CN")} MiB。`);
  }
  return byteLength;
}

function lunarText(value: { lunarDate: string; lunarLeapMonth: boolean }) {
  return `${safeVisibleText(value.lunarDate, "未识别农历日期", 60)}${value.lunarLeapMonth ? " · 闰月" : ""}`;
}

function windowTitle(windowId: string) {
  if (windowId.includes("2089")) return "2089 年八月月首窗口";
  if (windowId.includes("2097")) return "2097 年七月月首窗口";
  return `未识别连续窗口 ${safeVisibleText(windowId, "未知窗口", 100)}`;
}

function calendarAuditWindowId(windowId: string) {
  const safeWindowId = safeVisibleText(windowId, "unknown", 80).replace(/[^a-zA-Z0-9_-]/g, "-");
  return `calendar-audit-window-${safeWindowId}`;
}

function favoredLineage(value: "hko_current_icu" | "dotnet") {
  return value === "hko_current_icu"
    ? "分钟值倾向 HKO / 当前适配器 / ICU"
    : "分钟值倾向 .NET 的次日月首";
}

function httpsSourceHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function resolveReviewBundleBindingIssue(
  bundle: CalendarDivergenceReviewBundleEnvelope | null,
  receipt: ReviewBundleReceipt | null,
  fixtureDigest: string,
  expectedCaseCount: number
): string | null {
  if (!bundle && !receipt) return null;
  if (!bundle || !receipt) return "候选包与页面绑定回执没有同时存在。";
  if (!receipt.fileName.trim() || receipt.fileName.length > 512) {
    return "候选包绑定回执没有有效文件名。";
  }
  if (
    !Number.isSafeInteger(receipt.contentByteLength) ||
    receipt.contentByteLength <= 0 ||
    receipt.contentByteLength > REVIEW_BUNDLE_MAX_BYTES
  ) {
    return "候选包绑定回执没有有效的预检内容字节数。";
  }
  if (
    (receipt.origin === "generated" && receipt.deliveryStatus !== "prepared") ||
    (receipt.origin === "imported" && receipt.deliveryStatus !== "preflighted")
  ) {
    return "候选包来源与交付状态自相矛盾。";
  }
  const boundAt = Date.parse(receipt.boundAt);
  if (!Number.isFinite(boundAt) || new Date(boundAt).toISOString() !== receipt.boundAt) {
    return "候选包绑定回执没有有效的绑定时间。";
  }
  if (
    !SHA256_DIGEST_PATTERN.test(bundle.digest) ||
    !SHA256_DIGEST_PATTERN.test(bundle.payload.fixtureDigest) ||
    !SHA256_DIGEST_PATTERN.test(receipt.bundleDigest) ||
    !SHA256_DIGEST_PATTERN.test(receipt.fixtureDigest) ||
    !SHA256_DIGEST_PATTERN.test(fixtureDigest)
  ) {
    return "候选包、fixture 或绑定回执包含非规范 SHA-256 摘要。";
  }
  if (bundle.digest !== receipt.bundleDigest) return "候选包摘要与页面绑定回执不一致。";
  if (
    bundle.payload.fixtureDigest !== receipt.fixtureDigest ||
    receipt.fixtureDigest !== fixtureDigest
  ) {
    return "候选包没有精确绑定当前冻结 fixture 摘要。";
  }
  if (bundle.payload.cases.length !== expectedCaseCount) {
    return `候选包覆盖 ${bundle.payload.cases.length} 日，与当前 ${expectedCaseCount} 日冻结窗口不一致。`;
  }
  return null;
}

export function CalendarDivergenceAuditPage() {
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [activeWindowId, setActiveWindowId] = useState(
    CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload.windows[0]?.windowId ?? ""
  );
  const [fixtureIntegrity, setFixtureIntegrity] = useState<"checking" | "valid" | "invalid">("checking");
  const [fixtureIntegrityError, setFixtureIntegrityError] = useState<string | null>(null);
  const [fixtureRetryVersion, setFixtureRetryVersion] = useState(0);
  const [reviewBundle, setReviewBundle] = useState<CalendarDivergenceReviewBundleEnvelope | null>(null);
  const [reviewBundleReceipt, setReviewBundleReceipt] = useState<ReviewBundleReceipt | null>(null);
  const [reviewA, setReviewA] = useState<CalendarDivergenceIndependentReviewEnvelope | null>(null);
  const [reviewB, setReviewB] = useState<CalendarDivergenceIndependentReviewEnvelope | null>(null);
  const [adjudication, setAdjudication] = useState<CalendarDivergenceAdjudicationPreflight | null>(null);
  const [reviewOperation, setReviewOperation] = useState<ReviewOperation | null>(null);
  const [preparedDelivery, setPreparedDelivery] = useState<PreparedFileArtifact | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const reviewOperationRef = useRef<ReviewOperation | null>(null);
  const mountedRef = useRef(true);
  const { payload, digest } = CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE;
  const reviewBusy = reviewOperation !== null;
  const reviewBindingIssue = resolveReviewBundleBindingIssue(
    reviewBundle,
    reviewBundleReceipt,
    digest,
    payload.declaredCounts.cases
  );
  const reviewBundleBound = reviewBundle !== null && reviewBindingIssue === null;
  const filterCounts: Record<RowFilter, number> = {
    all: payload.declaredCounts.cases,
    divergence: payload.declaredCounts.divergence,
    trigger: payload.declaredCounts.triggerCases
  };
  const activeFilterLabel = FILTERS.find((filter) => filter.id === rowFilter)?.label ?? "全部日期";
  const { visibleWindows, visibleCaseCount } = useMemo(() => {
    let caseCount = 0;
    const windows = payload.windows.map((window) => {
      const visibleCases = window.cases.filter((candidate) => {
        if (rowFilter === "divergence") return candidate.role === "divergence";
        if (rowFilter === "trigger") return candidate.triggerCaseIds.length > 0;
        return true;
      });
      caseCount += visibleCases.length;
      return { window, visibleCases };
    });
    return { visibleWindows: windows, visibleCaseCount: caseCount };
  }, [payload.windows, rowFilter]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      reviewOperationRef.current = null;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setFixtureIntegrity("checking");
    setFixtureIntegrityError(null);
    void preflightCalendarDivergenceWindows(CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE)
      .then(() => {
        if (active) setFixtureIntegrity("valid");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setFixtureIntegrity("invalid");
        setFixtureIntegrityError(safeVisibleErrorMessage(reason, "连续窗口摘要验证失败。"));
      });
    return () => {
      active = false;
    };
  }, [fixtureRetryVersion]);

  useEffect(() => {
    if (fixtureIntegrity !== "valid" || typeof IntersectionObserver === "undefined") return;
    const windowSections = payload.windows
      .map((window) => document.getElementById(calendarAuditWindowId(window.windowId)))
      .filter((element): element is HTMLElement => element !== null);
    if (!windowSections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const nearestVisible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top - 150) - Math.abs(right.boundingClientRect.top - 150))[0];
      const nextWindowId = (nearestVisible?.target as HTMLElement | undefined)?.dataset.windowId;
      const nextWindow = payload.windows.find((window) => window.windowId === nextWindowId);
      if (nextWindow) setActiveWindowId(nextWindow.windowId);
    }, { rootMargin: "-140px 0px -58% 0px", threshold: [0, 0.08, 0.35] });
    windowSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [fixtureIntegrity, payload.windows]);

  useEffect(() => {
    if (!reviewBindingIssue) return;
    setReviewA(null);
    setReviewB(null);
    setAdjudication(null);
    setPreparedDelivery(null);
  }, [reviewBindingIssue]);

  const retryFixtureIntegrity = () => {
    setFixtureIntegrity("checking");
    setFixtureIntegrityError(null);
    setFixtureRetryVersion((current) => current + 1);
  };

  const printCurrentView = async () => {
    setPrintError(null);
    try {
      await webReportExportPort.printReport();
    } catch (reason) {
      if (!mountedRef.current) return;
      setPrintError(safeVisibleErrorMessage(reason, "当前工程视图未能打开系统打印。"));
    }
  };

  const resetReviewChain = () => {
    setReviewA(null);
    setReviewB(null);
    setAdjudication(null);
  };

  const beginReviewOperation = (operation: ReviewOperation): boolean => {
    if (!mountedRef.current || reviewOperationRef.current !== null) return false;
    reviewOperationRef.current = operation;
    setReviewOperation(operation);
    return true;
  };

  const finishReviewOperation = (operation: ReviewOperation) => {
    if (reviewOperationRef.current !== operation) return;
    reviewOperationRef.current = null;
    if (mountedRef.current) setReviewOperation(null);
  };

  const exportReviewBundle = async () => {
    if (!beginReviewOperation("export_bundle")) return;
    setReviewError(null);
    setReviewMessage(null);
    try {
      const {
        createCalendarDivergenceReviewBundle,
        preflightCalendarDivergenceReviewBundle,
        serializeCalendarDivergenceReviewBundle
      } = await import("@hakimi/gold-standard/calendar-divergence-review");
      const envelope = await createCalendarDivergenceReviewBundle();
      const serialized = serializeCalendarDivergenceReviewBundle(envelope);
      checkedTextByteLength(serialized, REVIEW_BUNDLE_MAX_BYTES, "生成的连续历法候选包");
      const verifiedEnvelope = await preflightCalendarDivergenceReviewBundle(serialized);
      const boundAt = new Date().toISOString();
      const artifactBlob = new Blob([serialized], { type: "application/json;charset=utf-8" });
      const fileName = `hakimi-calendar-divergence-review-${boundAt.slice(0, 10)}.json`;
      if (!mountedRef.current) return;
      setReviewBundle(verifiedEnvelope);
      setReviewBundleReceipt({
        origin: "generated",
        fileName,
        deliveryStatus: "prepared",
        boundAt,
        contentByteLength: artifactBlob.size,
        bundleDigest: verifiedEnvelope.digest,
        fixtureDigest: verifiedEnvelope.payload.fixtureDigest
      });
      setPreparedDelivery({
        blob: artifactBlob,
        filename: fileName,
        title: `连续历法 ${payload.declaredCounts.cases} 日候选审核包`,
        sharePolicy: "allowed",
        description: `候选包已重新预检并绑定 fixture SHA-256 ${verifiedEnvelope.payload.fixtureDigest}；可交给指定复核人，但交付不会核验身份、增加金标或获得公开发布授权。`
      });
      resetReviewChain();
      setReviewMessage(`内容寻址的 ${payload.declaredCounts.cases} 日候选包已冻结并载入审核链；同一份内容将用于后续下载、指定位置保存或系统分享，目前尚未发生交付，也不会增加金标。`);
    } catch (reason) {
      if (!mountedRef.current) return;
      setReviewError(safeVisibleErrorMessage(reason, "连续历法候选包未能完成冻结与摘要校验。"));
    } finally {
      finishReviewOperation("export_bundle");
    }
  };

  const chooseReviewBundle = async () => {
    if (!beginReviewOperation("load_bundle")) return;
    setReviewError(null);
    setReviewMessage(null);
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: REVIEW_BUNDLE_MAX_BYTES });
      if (!mountedRef.current) return;
      if (!file) {
        setReviewMessage("已取消候选包选择；当前已预检审核链保持不变。");
        return;
      }
      const contentByteLength = checkedTextByteLength(file.text, REVIEW_BUNDLE_MAX_BYTES, "连续历法候选包");
      const { preflightCalendarDivergenceReviewBundle } = await import(
        "@hakimi/gold-standard/calendar-divergence-review"
      );
      const envelope = await preflightCalendarDivergenceReviewBundle(file.text);
      if (!mountedRef.current) return;
      const boundAt = new Date().toISOString();
      setPreparedDelivery(null);
      setReviewBundle(envelope);
      setReviewBundleReceipt({
        origin: "imported",
        fileName: file.name,
        deliveryStatus: "preflighted",
        boundAt,
        contentByteLength,
        bundleDigest: envelope.digest,
        fixtureDigest: envelope.payload.fixtureDigest
      });
      resetReviewChain();
      setReviewMessage(`候选包已预检并载入：${file.name}。`);
    } catch (reason) {
      if (!mountedRef.current) return;
      setReviewError(`${safeVisibleErrorMessage(reason, "连续历法候选包预检失败。")} 当前已预检审核链保持不变。`);
    } finally {
      finishReviewOperation("load_bundle");
    }
  };

  const chooseIndependentReview = async (slot: "A" | "B") => {
    const operation = slot === "A" ? "review_a" : "review_b";
    if (!beginReviewOperation(operation)) return;
    setReviewError(null);
    setReviewMessage(null);
    if (!reviewBundle || !reviewBundleBound) {
      setReviewError(reviewBindingIssue ?? "请先导出当前候选包，或载入并预检审核人实际使用的候选包。");
      finishReviewOperation(operation);
      return;
    }
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: REVIEW_RESPONSE_MAX_BYTES });
      if (!mountedRef.current) return;
      if (!file) {
        setReviewMessage(`已取消独立审核 ${slot} 选择；当前已预检审核链保持不变。`);
        return;
      }
      checkedTextByteLength(file.text, REVIEW_RESPONSE_MAX_BYTES, `独立审核 ${slot}`);
      const { preflightCalendarDivergenceIndependentReview } = await import(
        "@hakimi/gold-standard/calendar-divergence-review"
      );
      const result = await preflightCalendarDivergenceIndependentReview(file.text, {
        reviewBundle
      });
      if (!mountedRef.current) return;
      const otherReview = slot === "A" ? reviewB : reviewA;
      if (otherReview?.digest === result.envelope.digest) {
        throw new Error(`独立审核 ${slot} 与另一审核是同一内容摘要；不能复用同一文件组成双审链。`);
      }
      if (otherReview?.payload.reviewer.reviewerId === result.envelope.payload.reviewer.reviewerId) {
        throw new Error(`独立审核 ${slot} 与另一审核使用相同 reviewer ID；不能组成双审链。`);
      }
      if (slot === "A") setReviewA(result.envelope);
      else setReviewB(result.envelope);
      setAdjudication(null);
      setReviewMessage(
        `独立审核 ${slot} 已通过摘要与 ${payload.declaredCounts.cases} 日覆盖预检；仍有 ${result.unresolvedCaseCount} 日未决，现实身份尚未核验。`
      );
    } catch (reason) {
      if (!mountedRef.current) return;
      setReviewError(`${safeVisibleErrorMessage(reason, `独立审核 ${slot} 预检失败。`)} 当前已预检审核链保持不变。`);
    } finally {
      finishReviewOperation(operation);
    }
  };

  const chooseAdjudication = async () => {
    if (!beginReviewOperation("adjudication")) return;
    setReviewError(null);
    setReviewMessage(null);
    if (!reviewBundle || !reviewBundleBound || !reviewA || !reviewB) {
      setReviewError(reviewBindingIssue ?? "请先载入当前候选包及两份独立审核，再预检第三方裁决。");
      finishReviewOperation("adjudication");
      return;
    }
    try {
      const file = await pickTextFile({ accept: ".json,application/json", maxBytes: REVIEW_RESPONSE_MAX_BYTES });
      if (!mountedRef.current) return;
      if (!file) {
        setReviewMessage("已取消第三方裁决选择；当前已预检审核链保持不变。");
        return;
      }
      checkedTextByteLength(file.text, REVIEW_RESPONSE_MAX_BYTES, "第三方逐日裁决");
      const { preflightCalendarDivergenceAdjudication } = await import(
        "@hakimi/gold-standard/calendar-divergence-review"
      );
      const result = await preflightCalendarDivergenceAdjudication(file.text, {
        reviewBundle,
        independentReviews: [reviewA, reviewB]
      });
      if (!mountedRef.current) return;
      setAdjudication(result);
      setReviewMessage(
        result.allCaseDecisionsResolved
          ? `${payload.declaredCounts.cases} 日逐日裁决在结构上均已解决；离线身份核验和维护者整合门仍保持关闭。`
          : `裁决预检通过，但仍有 ${result.unresolvedCaseCount} 日未决，禁止整合。`
      );
    } catch (reason) {
      if (!mountedRef.current) return;
      setReviewError(`${safeVisibleErrorMessage(reason, "第三方裁决预检失败。")} 当前已预检审核链保持不变。`);
    } finally {
      finishReviewOperation("adjudication");
    }
  };

  if (fixtureIntegrity !== "valid") {
    return (
      <div
        className="page calendar-divergence-audit-page"
        aria-busy={fixtureIntegrity === "checking"}
        data-fixture-integrity={fixtureIntegrity}
        data-release-identity={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
        data-target-schema={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema)}
        data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
        data-engineering-evidence-only="true"
        data-formal-validation="false"
        data-scientific-validation="false"
        data-curated-integration-eligible="false"
        data-verified-gold-delta="0"
        data-write-reconciliation-required="false"
        data-public-release-authorized="false"
        data-expert-truth-claimed="false"
        data-mutation-epoch-bypassed="false"
      >
        <PageHeading
          eyebrow="P0-03 · Calendar boundary audit"
          title="连续历法差异审计"
          description={`先验证 ${payload.declaredCounts.cases} 日冻结窗口的规范摘要，再显示逐日证据与审核入口。`}
          actions={<AppLink href="/settings" className="secondary-action">返回设置与诊断</AppLink>}
        />
        <section
          className="calendar-audit-integrity-gate"
          data-state={fixtureIntegrity}
          role={fixtureIntegrity === "invalid" ? "alert" : "status"}
        >
          <ShieldAlert aria-hidden="true" />
          <div>
            <h2>{fixtureIntegrity === "invalid" ? "冻结窗口完整性验证失败" : `正在验证 ${payload.declaredCounts.cases} 日冻结窗口…`}</h2>
            <p>{fixtureIntegrity === "invalid"
              ? `${safeVisibleText(fixtureIntegrityError, "摘要不匹配。")} 页面已失败关闭，不显示或导出未通过摘要核验的审计数据。`
              : `正在复算 payload SHA-256，并检查 ${payload.declaredCounts.cases} 日连续覆盖、来源角色与零金标边界。`}</p>
            {fixtureIntegrity === "invalid" ? (
              <button type="button" className="secondary-action" onClick={retryFixtureIntegrity}>
                重新验证冻结窗口
              </button>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className="page calendar-divergence-audit-page"
      aria-busy={reviewBusy}
      data-fixture-integrity="valid"
      data-review-binding={reviewBindingIssue ? "invalid" : reviewBundleBound ? "valid" : "not_loaded"}
      data-prepared-delivery={preparedDelivery ? "ready" : "none"}
      data-review-operation={reviewOperation ?? "idle"}
      data-row-filter={rowFilter}
      data-active-window={activeWindowId || "none"}
      data-release-identity={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-target-schema={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema)}
      data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
      data-engineering-evidence-only="true"
      data-formal-validation="false"
      data-scientific-validation="false"
      data-curated-integration-eligible="false"
      data-verified-gold-delta="0"
      data-write-reconciliation-required="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-mutation-epoch-bypassed="false"
    >
      {preparedDelivery ? (
        <PreparedFileDeliveryDialog
          artifact={preparedDelivery}
          exportPort={webReportExportPort}
          onClose={() => setPreparedDelivery(null)}
        />
      ) : null}

      <PageHeading
        eyebrow="P0-03 · Calendar boundary audit"
        title="连续历法差异审计"
        description="把 7 个随机差异点还原成两个完整月段，并同时保留 HKO 历表、USNO 朔时刻、ICU 与 .NET 的不同证据角色。"
        actions={(
          <>
            <button type="button" className="secondary-action" disabled={reviewBusy} onClick={() => void printCurrentView()}>
              <Printer aria-hidden="true" />打印当前工程视图
            </button>
            <AppLink href="/settings" className="secondary-action">返回设置与诊断</AppLink>
          </>
        )}
      />

      {printError ? <p className="calendar-audit-review-error" role="alert">{safeVisibleText(printError, "当前工程视图未能打开系统打印。")}</p> : null}

      <aside className="calendar-audit-print-boundary" aria-label="工程打印边界">
        <strong>当前工程复核打印，不是发布金标。</strong>
        <span>打印范围为“{activeFilterLabel}”筛选下的 {visibleCaseCount} / {payload.declaredCounts.cases} 日；筛选视图不等于完整候选包，也不核验专家身份。</span>
        <code>fixture sha256:{safeVisibleText(digest, "摘要不可用", 180)}</code>
      </aside>

      <section className="calendar-audit-lead" aria-labelledby="calendar-audit-state-title">
        <div>
          <p className="eyebrow">Fail-closed result</p>
          <h2 id="calendar-audit-state-title">两处朔日都紧贴 UTC+8 午夜，当前必须保持未决</h2>
          <p>2089 年事件落在 23:59，2097 年事件落在次日 00:01。它们不是“某个实现总是慢一天”的同一类错误；香港天文台也公开点名这两处远期朔日可能出现一日差异。</p>
        </div>
        <div className="calendar-audit-state">
          <StatusPill tone="warning">engineering diagnostic · unresolved</StatusPill>
          <strong>专家金标 +0</strong>
          <span>不进入 360 条金标配额</span>
        </div>
      </section>

      <section className="calendar-audit-metrics" aria-label="连续窗口摘要">
        <div><CalendarDays aria-hidden="true" /><strong>{payload.declaredCounts.windows}</strong><span>连续窗口</span></div>
        <div><FileCheck2 aria-hidden="true" /><strong>{payload.declaredCounts.cases}</strong><span>逐日案例</span></div>
        <div><GitCompareArrows aria-hidden="true" /><strong>{payload.declaredCounts.divergence}</strong><span>连续分歧日</span></div>
        <div><CheckCircle2 aria-hidden="true" /><strong>{payload.declaredCounts.controls}</strong><span>前后控制日</span></div>
        <div><AlertTriangle aria-hidden="true" /><strong>{payload.declaredCounts.triggerCases}</strong><span>原报告触发已绑定</span></div>
        <div><ShieldAlert aria-hidden="true" /><strong>0</strong><span>已验证金标增量</span></div>
      </section>

      <section className="calendar-audit-midnight-map" aria-labelledby="calendar-audit-midnight-title">
        <header>
          <div>
            <p className="eyebrow">Midnight boundary map</p>
            <h2 id="calendar-audit-midnight-title">两次新月，分列午夜前后一分钟</h2>
          </div>
          <p>同样接近 UTC+8 月首边界，却分别支持不同实现谱系，因此不能合并成一个固定偏移补丁。</p>
        </header>
        <div className="calendar-audit-midnight-scale" aria-label="两次朔时刻相对 UTC 加八午夜的位置">
          {payload.windows.map((window) => {
            const beforeMidnight = window.rootCauseAssessment.favors === "hko_current_icu";
            return (
              <article className={beforeMidnight ? "is-before" : "is-after"} key={window.windowId}>
                <span>{beforeMidnight ? "−01 min" : "+01 min"}</span>
                <div>
                  <small>{windowTitle(window.windowId)}</small>
                  <strong>{safeVisibleText(window.rootCauseAssessment.fixedPlus08Local.slice(11, 16), "时间未识别", 20)}</strong>
                  <p>{beforeMidnight ? "HKO / ICU 谱系一侧" : ".NET 次日月首一侧"}</p>
                </div>
              </article>
            );
          })}
          <div className="calendar-audit-midnight-origin" aria-hidden="true">
            <i />
            <strong>00:00</strong>
            <span>UTC+8 月首边界</span>
          </div>
        </div>
      </section>

      <section className="calendar-audit-boundary-note" aria-labelledby="calendar-audit-boundary-title">
        <Clock3 aria-hidden="true" />
        <div>
          <p className="eyebrow">Why unresolved</p>
          <h2 id="calendar-audit-boundary-title">USNO 是天文事件证据，不是第二份完整中国农历表</h2>
          <p>USNO API v4.0.1 只给出分钟级朔时刻：2089-09-04 15:59 UT 与 2097-08-07 16:01 UT。前者倾向当前实现，后者倾向 .NET；两者距固定 UTC+8 午夜都约 1 分钟，因此证据增强了边界归因，却没有消除不确定性。</p>
          <div className="calendar-audit-source-links">
            <a href="https://www.hko.gov.hk/en/gts/time/conversion.htm" target="_blank" rel="noopener noreferrer" aria-label="HKO 不确定性备注（在新窗口打开）">HKO 不确定性备注 <ExternalLink aria-hidden="true" /></a>
            <a href="https://aa.usno.navy.mil/data/api" target="_blank" rel="noopener noreferrer" aria-label="USNO API 文档（在新窗口打开）">USNO API 文档 <ExternalLink aria-hidden="true" /></a>
            <a href="https://unicode-org.github.io/icu/userguide/datetime/calendar/" target="_blank" rel="noopener noreferrer" aria-label="ICU Calendar 文档（在新窗口打开）">ICU Calendar 文档 <ExternalLink aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className="calendar-audit-evidence-workspace" aria-label="逐日证据工作区">
        <div className="calendar-audit-toolbar" aria-label="逐日案例筛选">
          <div role="group" aria-label="筛选逐日案例">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={rowFilter === filter.id ? "is-active" : ""}
                aria-pressed={rowFilter === filter.id}
                aria-controls="calendar-audit-window-list"
                onClick={() => setRowFilter(filter.id)}
              >
                <span>{filter.label}</span>
                <strong>{filterCounts[filter.id]}</strong>
              </button>
            ))}
          </div>
          <p role="status" aria-live="polite"><span>Visible rows</span><strong>{visibleCaseCount}</strong><small>/ {payload.declaredCounts.cases} 日 · 筛选不改冻结数据</small></p>
        </div>

        <div className="calendar-audit-reading-rail" role="note" aria-label="当前逐日证据阅读范围">
          <div className="calendar-audit-reading-rail__scope">
            <small>Active evidence scope</small>
            <strong>{activeFilterLabel}</strong>
            <span>{visibleCaseCount} / {payload.declaredCounts.cases} 日 · 只读显示</span>
          </div>
          <nav className="calendar-audit-window-jumps" aria-label="跳转至连续窗口">
            {payload.windows.map((window, index) => (
              <a
                key={window.windowId}
                href={`#${calendarAuditWindowId(window.windowId)}`}
                aria-current={activeWindowId === window.windowId ? "location" : undefined}
                onClick={() => setActiveWindowId(window.windowId)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{windowTitle(window.windowId)}</strong>
              </a>
            ))}
          </nav>
        </div>

        <div className="calendar-audit-window-list" id="calendar-audit-window-list">
          {visibleWindows.map(({ window, visibleCases }) => {
            const divergenceCount = window.cases.filter((candidate) => candidate.role === "divergence").length;
            const controlCount = window.cases.length - divergenceCount;
            const windowSectionId = calendarAuditWindowId(window.windowId);
            const windowHeadingId = `${windowSectionId}-title`;
            return (
            <section
              className="calendar-audit-window"
              id={windowSectionId}
              data-window-id={window.windowId}
              key={window.windowId}
              aria-labelledby={windowHeadingId}
            >
              <header>
                <div>
                  <p className="eyebrow">{safeVisibleText(window.startDate, "起始日期未识别", 40)} → {safeVisibleText(window.endDate, "结束日期未识别", 40)}</p>
                  <h2 id={windowHeadingId}>{windowTitle(window.windowId)}</h2>
                  <p>{window.cases.length} 日闭区间 · {divergenceCount} 日连续偏移 · {controlCount} 个边界控制日 · 原始触发 {window.triggerCaseIds.length} 个</p>
                </div>
                <StatusPill tone="warning">未决</StatusPill>
              </header>

              <div className="calendar-audit-root-cause">
                <div><span>USNO 朔时刻（UT）</span><strong>{safeVisibleText(window.rootCauseAssessment.newMoonUtc.replace("T", " ").replace(":00.000Z", " UT"), "时间未识别", 100)}</strong></div>
                <div><span>固定 UTC+8</span><strong>{safeVisibleText(window.rootCauseAssessment.fixedPlus08Local.replace("T", " ").replace("+08:00", " UTC+8"), "时间未识别", 100)}</strong></div>
                <div><span>距午夜</span><strong>约 {window.rootCauseAssessment.distanceFromLocalMidnightMinutes} 分钟</strong></div>
                <div><span>分钟级倾向</span><strong>{favoredLineage(window.rootCauseAssessment.favors)}</strong></div>
                <p>{safeVisibleText(window.rootCauseAssessment.authorityCaveat, "来源限制未说明。")}</p>
              </div>

              {visibleCases.length > 0 ? (
                 <div className="calendar-audit-table-wrap" role="region" aria-label={`${windowTitle(window.windowId)}逐日证据矩阵；桌面表格可滚动，窄屏按字段卡片显示`} tabIndex={0}>
                   <table className="calendar-audit-table">
                    <caption><span>{windowTitle(window.windowId)}逐日证据矩阵</span><small>当前筛选显示 {visibleCases.length} / {window.cases.length} 日 · 结构对照不等于人工裁决</small></caption>
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
                            {safeVisibleText(candidate.gregorianDate, "日期未识别", 40)}
                            {candidate.triggerCaseIds.map((caseId) => <small key={caseId}>{safeVisibleText(caseId, "未知触发", 120)}</small>)}
                          </th>
                          <td data-label="HKO">{lunarText(candidate.observations.hko)}</td>
                          <td data-label="当前适配器">{lunarText(candidate.observations.currentAdapter)}</td>
                          <td data-label="ICU 78.3">{lunarText(candidate.observations.icu)}</td>
                          <td data-label=".NET 4.8">{lunarText(candidate.observations.dotnet)}</td>
                          <td data-label="证据角色">
                            <StatusPill tone={candidate.role === "control" ? "info" : "warning"}>
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
      </section>

      <section className="calendar-audit-sources" aria-labelledby="calendar-audit-sources-title">
        <div className="calendar-audit-section-heading">
          <div>
            <p className="eyebrow">Frozen provenance</p>
            <h2 id="calendar-audit-sources-title">{payload.sources.length} 个来源快照，角色严格分离</h2>
          </div>
          <p>HKO 两个年份仍属于同一来源谱系；不同文件不能重复冒充两个权威来源。</p>
        </div>
        <div className="calendar-audit-source-grid">
          {payload.sources.map((source) => {
            const sourceHref = httpsSourceHref(source.sourceRef);
            return (
            <article key={source.sourceId}>
              <StatusPill tone={source.role === "authoritative" || source.role === "astronomical_reference" ? "info" : "neutral"}>
                {SOURCE_ROLE_LABELS[source.role]}
              </StatusPill>
              <h3>{safeVisibleText(source.title, "未命名来源", 180)}</h3>
              <p>{safeVisibleText(source.note, "未提供来源说明。")}</p>
              <dl>
                <div><dt>版本</dt><dd>{safeVisibleText(source.version, "版本未识别", 100)}</dd></div>
                <div><dt>来源 ID</dt><dd>{safeVisibleText(source.sourceId, "来源未识别", 160)}</dd></div>
                {source.artifacts.map((artifact) => (
                  <div key={artifact.sha256}><dt>{safeVisibleText(artifact.label, "来源工件", 120)}</dt><dd>{safeVisibleText(artifact.sha256, "摘要不可用", 180)}</dd></div>
                ))}
              </dl>
              {sourceHref
                ? <a href={sourceHref} target="_blank" rel="noopener noreferrer" aria-label="打开公开来源（在新窗口打开）">打开公开来源 <ExternalLink aria-hidden="true" /></a>
                : <span className="calendar-audit-source-unavailable">公开来源链接不可用</span>}
            </article>
            );
          })}
        </div>
      </section>

      <section className="calendar-audit-review-protocol" aria-labelledby="calendar-audit-review-title" aria-busy={reviewBusy}>
        <div className="calendar-audit-section-heading">
          <div>
            <p className="eyebrow">Independent review protocol</p>
            <h2 id="calendar-audit-review-title">候选包 → 独立审核 A / B → 第三方裁决</h2>
          </div>
          <StatusPill tone="warning">任何未决都阻止整合</StatusPill>
        </div>
        <ol>
          <li data-state={reviewBindingIssue ? "attention" : reviewBundleBound ? "structure" : "waiting"}><strong>1</strong><div><h3>内容寻址候选包</h3><p>绑定 {payload.declaredCounts.cases} 日、{payload.declaredCounts.triggerCases} 个触发、P0-03 原报告、来源快照与逐日摘要。</p></div><StatusPill tone={reviewBindingIssue ? "warning" : reviewBundleBound ? "info" : "neutral"}>{reviewBindingIssue ? "绑定异常" : reviewBundleBound ? "内容已预检" : "等待文件"}</StatusPill></li>
          <li data-state={reviewA ? "structure" : reviewBundleBound ? "waiting" : "locked"}><strong>2A</strong><div><h3>独立审核 A</h3><p>现实审核人逐日判断；绑定 reviewer ID 与离线身份记录摘要。</p></div><StatusPill tone={reviewA ? "info" : reviewBundleBound ? "neutral" : "warning"}>{reviewA ? "结构已预检" : reviewBundleBound ? "等待文件" : "等待候选包"}</StatusPill></li>
          <li data-state={reviewB ? "structure" : reviewBundleBound ? "waiting" : "locked"}><strong>2B</strong><div><h3>独立审核 B</h3><p>另一位审核人独立覆盖同一 {payload.declaredCounts.cases} 日，不能复用 A 的 reviewer ID。</p></div><StatusPill tone={reviewB ? "info" : reviewBundleBound ? "neutral" : "warning"}>{reviewB ? "结构已预检" : reviewBundleBound ? "等待文件" : "等待候选包"}</StatusPill></li>
          <li data-state={adjudication ? adjudication.allCaseDecisionsResolved ? "structure" : "attention" : reviewA && reviewB ? "waiting" : "locked"}><strong>3</strong><div><h3>第三方裁决</h3><p>裁决人必须与 A/B 不同；不能用“全部接受”跳过逐日决定。</p></div><StatusPill tone={adjudication ? "warning" : reviewA && reviewB ? "neutral" : "warning"}>{adjudication ? adjudication.allCaseDecisionsResolved ? "结构已解决 · 身份未核验" : "仍有未决" : reviewA && reviewB ? "等待文件" : "等待双审"}</StatusPill></li>
          <li data-state="locked"><strong>4</strong><div><h3>身份核验与版本化整合</h3><p>只由维护者在离线可信账本核验后，以显式 fixture 变更完成。</p></div><StatusPill tone="warning">本页始终关闭</StatusPill></li>
        </ol>
        <div className="calendar-audit-review-console" aria-label="连续历法审核文件预检" aria-busy={reviewBusy}>
          <aside className="calendar-audit-delivery-boundary" aria-label="候选审核包交付边界">
            <Download aria-hidden="true" />
            <div><p className="eyebrow">Review handoff boundary</p><strong>冻结后才交付给指定复核人</strong><p>候选包可下载、保存或指定分享；它只固定 {payload.declaredCounts.cases} 日工程候选与来源快照，不核验现实身份，不增加金标，也不构成公开发布授权。</p></div>
            <span>公开授权 · 否</span>
          </aside>
          <div className="calendar-audit-review-actions">
            <button type="button" className="secondary-action" disabled={reviewBusy} onClick={() => void exportReviewBundle()}>
              <Download aria-hidden="true" />准备 {payload.declaredCounts.cases} 日候选包
            </button>
            <button type="button" className="secondary-action" disabled={reviewBusy} onClick={() => void chooseReviewBundle()}>
              <Upload aria-hidden="true" />载入候选包
            </button>
            <button type="button" className="secondary-action" disabled={reviewBusy || !reviewBundleBound} onClick={() => void chooseIndependentReview("A")}>
              <Upload aria-hidden="true" />预检独立审核 A
            </button>
            <button type="button" className="secondary-action" disabled={reviewBusy || !reviewBundleBound} onClick={() => void chooseIndependentReview("B")}>
              <Upload aria-hidden="true" />预检独立审核 B
            </button>
            <button type="button" className="secondary-action" disabled={reviewBusy || !reviewBundleBound || !reviewA || !reviewB} onClick={() => void chooseAdjudication()}>
              <Upload aria-hidden="true" />预检第三方裁决
            </button>
          </div>
          {reviewOperation ? <div className="calendar-audit-review-operation" role="status" aria-live="polite" aria-atomic="true"><LoaderCircle className="spin" aria-hidden="true" /><div><strong>{REVIEW_OPERATION_LABELS[reviewOperation]}</strong><p>新内容或文件完整通过前不会替换当前已预检审核链。</p></div></div> : null}
          {reviewMessage ? <p className="calendar-audit-review-message" role="status">{safeVisibleText(reviewMessage, "审核链状态已更新。")}</p> : null}
          {reviewError ? <p className="calendar-audit-review-error" role="alert">{safeVisibleText(reviewError, "审核文件预检失败。")}</p> : null}
          {reviewBindingIssue ? <p className="calendar-audit-binding-error" role="alert"><strong>候选包绑定门已关闭。</strong> {safeVisibleText(reviewBindingIssue, "候选包无法绑定当前 fixture。")} A/B 审核与第三方裁决均不可继续。</p> : null}
          {reviewBundleReceipt ? (
            <section
              className="calendar-audit-bundle-receipt"
              data-delivery={reviewBundleReceipt.deliveryStatus}
              data-origin={reviewBundleReceipt.origin}
              data-binding={reviewBindingIssue ? "invalid" : "valid"}
              aria-labelledby="calendar-audit-bundle-receipt-title"
            >
              <header>
                <FileCheck2 aria-hidden="true" />
                <div>
                  <p className="eyebrow">Bound candidate receipt</p>
                  <h3 id="calendar-audit-bundle-receipt-title">{reviewBindingIssue ? "候选包未能绑定当前冻结 fixture" : `候选包已精确绑定当前 ${payload.declaredCounts.cases} 日 fixture`}</h3>
                </div>
                <span>{reviewBindingIssue ? "绑定异常 · 禁止继续" : reviewBundleReceipt.deliveryStatus === "prepared" ? "冻结内容已准备 · 尚未交付" : "本地文件已预检"}</span>
              </header>
              <dl>
                <div><dt>工作集来源</dt><dd>{reviewBundleReceipt.origin === "generated" ? "当前页面生成、复算并冻结" : "本地候选包文件"}</dd></div>
                <div><dt>文件</dt><dd>{safeVisibleText(reviewBundleReceipt.fileName, "未命名候选包", 180)}</dd></div>
                <div><dt>绑定时间 / 预检内容</dt><dd>{safeVisibleText(reviewBundleReceipt.boundAt, "时间未识别", 100)} · {reviewBundleReceipt.contentByteLength.toLocaleString("zh-CN")} 字节</dd></div>
                <div><dt>候选包 SHA-256</dt><dd><code>{safeVisibleText(reviewBundleReceipt.bundleDigest, "摘要不可用", 180)}</code></dd></div>
                <div><dt>Fixture SHA-256</dt><dd><code>{safeVisibleText(reviewBundleReceipt.fixtureDigest, "摘要不可用", 180)}</code></dd></div>
                <div><dt>当前页面绑定</dt><dd>{reviewBindingIssue ? safeVisibleText(reviewBindingIssue, "绑定状态不可用。") : "摘要、回执与规范 payload 精确匹配"}</dd></div>
              </dl>
              <p>预检已重新验证嵌入 fixture、规范 payload 和全部 {payload.declaredCounts.cases} 个逐日案例绑定；这仍只是工程结构证据，不核验现实审核身份，也不增加金标。</p>
            </section>
          ) : null}
          <dl className="calendar-audit-review-chain">
            <div><dt>候选包</dt><dd>{reviewBundleBound && reviewBundle ? <><span>{reviewBundle.payload.cases.length} 日 · 内容已绑定</span><code>sha256:{safeVisibleText(reviewBundle.digest, "摘要不可用", 180)}</code></> : reviewBundle ? "已载入但绑定异常 · 禁止使用" : "尚未载入"}</dd></div>
            <div><dt>审核 A</dt><dd>{reviewA ? <><span>{safeVisibleText(reviewA.payload.reviewer.reviewerId, "审核人 ID 未识别", 120)} · 未决 {reviewA.payload.declaredCounts.unresolved}</span><code>sha256:{safeVisibleText(reviewA.digest, "摘要不可用", 180)}</code></> : "尚未载入"}</dd></div>
            <div><dt>审核 B</dt><dd>{reviewB ? <><span>{safeVisibleText(reviewB.payload.reviewer.reviewerId, "审核人 ID 未识别", 120)} · 未决 {reviewB.payload.declaredCounts.unresolved}</span><code>sha256:{safeVisibleText(reviewB.digest, "摘要不可用", 180)}</code></> : "尚未载入"}</dd></div>
            <div><dt>裁决</dt><dd>{adjudication ? `${adjudication.unresolvedCaseCount} 日未决 · 不可自动整合` : "尚未载入"}</dd></div>
            <div><dt>现实身份</dt><dd>未在本页核验</dd></div>
            <div><dt>维护者整合</dt><dd>关闭 · verifiedGoldDelta=0</dd></div>
          </dl>
          <p className="calendar-audit-review-disclaimer">所有通过结果仍固定 `identityVerified=false`、`eligibleForCuratedIntegration=false`、`verifiedGoldDelta=0`；页面只做本地只读预检。</p>
        </div>
        <div className="calendar-audit-release-boundary">
          <ShieldAlert aria-hidden="true" />
          <div>
            <strong>本页是工程证据，不是发布金标。</strong>
            <p>{safeVisibleText(payload.releaseBoundary.notice, "发布边界未说明。")}</p>
            <code>dataset sha256:{safeVisibleText(digest, "摘要不可用", 180)}</code>
            <code>parent report sha256:{safeVisibleText(payload.parentDiagnostic.reportDigest, "摘要不可用", 180)}</code>
          </div>
        </div>
      </section>
    </div>
  );
}
