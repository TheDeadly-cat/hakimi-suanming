import {
  ArrowRight,
  Bookmark,
  BookOpenText,
  Database,
  FilePlus2,
  FileSearch,
  FileUp,
  GitCompareArrows,
  HardDriveDownload,
  Layers3,
  MoveHorizontal,
  RefreshCw
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLink } from "../lib/router";
import { useResearchSubjectPage } from "../lib/use-cases";
import { RECENT_SAVED_VIEW_INDEX_LIMIT, useRecentSavedViews } from "../lib/use-recent-saved-views";
import { formatDateTime } from "../lib/format";
import { safeVisibleText } from "../lib/visible-text";
import {
  FULL_BACKUP_EXPORT_MARKER_KEY,
  inspectFullBackupExportMarker,
  type FullBackupExportMarkerInspection
} from "../lib/backup-health";
import {
  presentBaziResearchSubject,
  presentBaziSavedView
} from "../lib/research-workspace-presentation";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";
import "./dashboard-page.css";

const DASHBOARD_RECENT_SUBJECT_LIMIT = 4;
const DASHBOARD_RECENT_SAVED_VIEW_DISPLAY_LIMIT = 6;
const DASHBOARD_SUBJECT_TAG_LIMIT = 256;
const MAX_DASHBOARD_IDENTIFIER_LENGTH = 512;
const DASHBOARD_SUBJECT_PAGE_QUERY = { limit: DASHBOARD_RECENT_SUBJECT_LIMIT };
const UNSAFE_DASHBOARD_IDENTIFIER_PATTERN = /[\s/\\?#%\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const UNSAFE_DASHBOARD_HREF_PATTERN = /[\\\u0000-\u0020\u007f-\u009f\u00a0\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/u;

const DASHBOARD_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
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
  "data-system-share-allowed": "false",
  "data-mutation-mode": "read-only-no-mutation",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-record-write-performed": "false",
  "data-record-write-state": "not_started",
  "data-chart-or-storage-mutation-performed": "false",
  "data-result": "null"
} as const;

function readDashboardBackupMarker(): FullBackupExportMarkerInspection {
  if (typeof window === "undefined") {
    return { status: "storage_unavailable", exportedAt: null, exportedAtMs: null };
  }
  try {
    return inspectFullBackupExportMarker(window.localStorage);
  } catch {
    return { status: "storage_unavailable", exportedAt: null, exportedAtMs: null };
  }
}

function safeDashboardIdentifier(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= MAX_DASHBOARD_IDENTIFIER_LENGTH
    && value === value.trim()
    && !UNSAFE_DASHBOARD_IDENTIFIER_PATTERN.test(value);
}

function safeDashboardInternalHref(value: unknown): value is string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 2_048
    || value !== value.trim()
    || !value.startsWith("/")
    || value.startsWith("//")
    || UNSAFE_DASHBOARD_HREF_PATTERN.test(value)
  ) return false;
  try {
    const decodedValue = decodeURIComponent(value);
    const decodedPath = decodedValue.split(/[?#]/u, 1)[0] ?? "";
    return decodedPath.startsWith("/")
      && !decodedPath.startsWith("//")
      && !UNSAFE_DASHBOARD_HREF_PATTERN.test(decodedValue)
      && !decodedPath.split("/").some((segment) => segment === "." || segment === "..");
  } catch {
    return false;
  }
}

function duplicateIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function orderByUpdatedAt<T extends { id: string; updatedAt: string }>(records: readonly T[]): T[] {
  return records
    .map((record) => ({ record, timestamp: Date.parse(record.updatedAt) }))
    .sort((left, right) => {
      const leftTimestamp = Number.isFinite(left.timestamp) ? left.timestamp : Number.NEGATIVE_INFINITY;
      const rightTimestamp = Number.isFinite(right.timestamp) ? right.timestamp : Number.NEGATIVE_INFINITY;
      if (rightTimestamp !== leftTimestamp) return rightTimestamp - leftTimestamp;
      return left.record.id < right.record.id ? -1 : left.record.id > right.record.id ? 1 : 0;
    })
    .map(({ record }) => record);
}

function dashboardRecordAlias(value: unknown): string {
  return safeVisibleText(value, "未命名记录", 120);
}

function dashboardSavedViewName(value: unknown): string {
  return safeVisibleText(value, "未命名保存视图", 120);
}

function dashboardTagsCaption(values: readonly string[]): string {
  if (!values.length) return "尚未添加标签";
  const visibleTags = values
    .map((value) => safeVisibleText(value, "", 80))
    .filter(Boolean);
  if (!visibleTags.length) return "标签内容不可显示";
  const displayedTags = visibleTags.slice(0, 12);
  const remaining = visibleTags.length - displayedTags.length;
  return `${displayedTags.join(" · ")}${remaining ? ` · 另 ${remaining} 项` : ""}`;
}

function shortDashboardReference(value: string): string {
  const visible = safeVisibleText(value, "不可显示", 240);
  return visible.length > 24 ? `${visible.slice(0, 12)}…${visible.slice(-8)}` : visible;
}

function dashboardDuplicateCaption(values: readonly string[]): string {
  const visible = values.slice(0, 8).map(shortDashboardReference);
  return `${visible.join("、")}${values.length > visible.length ? `，另有 ${values.length - visible.length} 个未展开` : ""}`;
}

function dashboardBackupMarkerCaption(marker: FullBackupExportMarkerInspection): string {
  switch (marker.status) {
    case "recorded": return "导出后仍需人工验档";
    case "missing": return "未发现导出提醒";
    case "storage_unavailable": return "标记存储不可读";
    case "invalid": return "标记时间格式无效";
    case "future": return "标记晚于设备时间";
    case "clock_unavailable": return "设备时间不可校验";
  }
}

function dashboardBackupMarkerIssueDetail(marker: FullBackupExportMarkerInspection): string {
  switch (marker.status) {
    case "storage_unavailable":
      return "浏览器无法读取本机备份标记；这不等于没有备份，也不能证明已有备份。";
    case "invalid":
      return "本机备份标记不是有效 UTC 时间；当前不会把它当作导出记录。";
    case "future":
      return "本机备份标记晚于当前设备时间；请核对设备时钟和实际备份文件。";
    case "clock_unavailable":
      return "当前设备时间无法用于校验本机备份标记；请核对系统时钟和实际备份文件。";
    case "missing":
      return "本机没有完整备份导出提醒；这不等于已确认没有外部备份文件。";
    case "recorded":
      return "本机存在完整备份导出提醒，但它不是文件可打开或可恢复的证据。";
  }
}

export function DashboardPage() {
  const { subjects, total, loading, error, refresh: refreshSubjects } = useResearchSubjectPage(DASHBOARD_SUBJECT_PAGE_QUERY);
  const {
    savedViews,
    loading: savedViewsLoading,
    error: savedViewsError,
    refresh: refreshSavedViews
  } = useRecentSavedViews();
  const subjectIntegrityError = useMemo(() => {
    if (loading || error) return null;
    if (!Number.isSafeInteger(total) || total < 0 || total < subjects.length) {
      return `案例索引总数 ${total} 与当前页 ${subjects.length} 条记录不一致。`;
    }
    if (subjects.length > DASHBOARD_RECENT_SUBJECT_LIMIT) {
      return `案例索引返回 ${subjects.length} 条记录，超过首页约定的 ${DASHBOARD_RECENT_SUBJECT_LIMIT} 条上限。`;
    }
    if (subjects.some((subject) => (
      !safeDashboardIdentifier(subject.id)
      || typeof subject.alias !== "string"
      || typeof subject.updatedAt !== "string"
      || !subject.alias.trim()
      || subject.alias !== subject.alias.trim()
      || !subject.updatedAt.trim()
      || subject.updatedAt !== subject.updatedAt.trim()
    ))) {
      return "案例索引包含类型无效、空白或带首尾空格的 ID / 别名 / 更新时间，已拒绝建立首页最近记录。";
    }
    if (subjects.some((subject) => (
      !Array.isArray(subject.tags)
      || subject.tags.some((tag) => typeof tag !== "string")
    ))) {
      return "案例索引包含类型无效的标签列表，已拒绝建立首页标签摘要。";
    }
    const excessiveTagSubject = subjects.find((subject) => subject.tags.length > DASHBOARD_SUBJECT_TAG_LIMIT);
    if (excessiveTagSubject) {
      return `记录“${dashboardRecordAlias(excessiveTagSubject.alias)}”包含 ${excessiveTagSubject.tags.length} 个标签，超过首页 ${DASHBOARD_SUBJECT_TAG_LIMIT} 项安全处理上限。`;
    }
    const duplicates = duplicateIds(subjects.map((subject) => subject.id));
    if (duplicates.length) return `案例索引包含重复记录：${dashboardDuplicateCaption(duplicates)}。`;
    const invalidTimestamp = subjects.find((subject) => !Number.isFinite(Date.parse(subject.updatedAt)));
    if (invalidTimestamp) return `记录“${dashboardRecordAlias(invalidTimestamp.alias)}”的更新时间无法解析。`;
    try {
      const invalidRouteSubject = subjects.find((subject) => (
        !safeDashboardInternalHref(presentBaziResearchSubject(subject).href)
      ));
      return invalidRouteSubject
        ? `记录“${dashboardRecordAlias(invalidRouteSubject.alias)}”没有通过首页内部路由绑定校验。`
        : null;
    } catch {
      return "案例索引无法生成可验证的首页内部路由。";
    }
  }, [error, loading, subjects, total]);
  const savedViewIntegrityError = useMemo(() => {
    if (savedViewsLoading || savedViewsError) return null;
    if (savedViews.length > RECENT_SAVED_VIEW_INDEX_LIMIT) {
      return `保存视图索引返回 ${savedViews.length} 条记录，超过首页 ${RECENT_SAVED_VIEW_INDEX_LIMIT} 条安全处理上限。`;
    }
    if (savedViews.some((view) => (
      !safeDashboardIdentifier(view.id)
      || typeof view.name !== "string"
      || typeof view.updatedAt !== "string"
      || !view.name.trim()
      || view.name !== view.name.trim()
      || !view.updatedAt.trim()
      || view.updatedAt !== view.updatedAt.trim()
    ))) {
      return "保存视图包含类型无效、空白或带首尾空格的 ID / 名称 / 更新时间，已拒绝建立首页快捷入口。";
    }
    const duplicates = duplicateIds(savedViews.map((view) => view.id));
    if (duplicates.length) return `保存视图包含重复记录：${dashboardDuplicateCaption(duplicates)}。`;
    const invalidTimestamp = savedViews.find((view) => !Number.isFinite(Date.parse(view.updatedAt)));
    if (invalidTimestamp) return `保存视图“${dashboardSavedViewName(invalidTimestamp.name)}”的更新时间无法解析。`;
    try {
      const invalidRouteView = savedViews.find((view) => (
        !safeDashboardInternalHref(presentBaziSavedView(view).href)
      ));
      return invalidRouteView
        ? `保存视图“${dashboardSavedViewName(invalidRouteView.name)}”没有通过首页内部路由绑定校验。`
        : null;
    } catch {
      return "保存视图索引无法生成可验证的首页内部路由。";
    }
  }, [savedViews, savedViewsError, savedViewsLoading]);
  const subjectError = error ?? subjectIntegrityError;
  const savedViewError = savedViewsError ?? savedViewIntegrityError;
  const subjectIndexState = loading ? "reading" : subjectError ? "unavailable" : "readable";
  const savedViewIndexState = savedViewsLoading ? "reading" : savedViewError ? "unavailable" : "readable";
  const visibleSubjectError = subjectError
    ? safeVisibleText(subjectError, "案例索引返回了不可显示的错误。", 800)
    : null;
  const visibleSavedViewError = savedViewError
    ? safeVisibleText(savedViewError, "保存视图索引返回了不可显示的错误。", 800)
    : null;
  const orderedSubjects = useMemo(
    () => subjectError ? [] : orderByUpdatedAt(subjects),
    [subjectError, subjects]
  );
  const orderedSavedViews = useMemo(
    () => savedViewError ? [] : orderByUpdatedAt(savedViews),
    [savedViewError, savedViews]
  );
  const visibleSavedViews = orderedSavedViews.slice(0, DASHBOARD_RECENT_SAVED_VIEW_DISPLAY_LIMIT);
  const latest = subjectError ? undefined : orderedSubjects[0];
  const latestPresentation = latest ? presentBaziResearchSubject(latest) : null;
  const [backupMarker, setBackupMarker] = useState<FullBackupExportMarkerInspection>(readDashboardBackupMarker);
  const lastFullBackupExportedAt = backupMarker.exportedAt;
  const backupMarkerUnavailable = backupMarker.status === "storage_unavailable"
    || backupMarker.status === "clock_unavailable";
  const backupMarkerInvalid = backupMarker.status === "invalid" || backupMarker.status === "future";
  const backupExportedAtMs = backupMarker.exportedAtMs;
  const backupMarkerIssueDetail = dashboardBackupMarkerIssueDetail(backupMarker);
  const latestKnownUpdateMs = useMemo(() => {
    const timestamps: number[] = [];
    if (!subjectError && orderedSubjects[0]) timestamps.push(Date.parse(orderedSubjects[0].updatedAt));
    if (!savedViewError && orderedSavedViews[0]) timestamps.push(Date.parse(orderedSavedViews[0].updatedAt));
    return timestamps.length ? Math.max(...timestamps) : null;
  }, [orderedSavedViews, orderedSubjects, savedViewError, subjectError]);
  const latestKnownUpdateIso = latestKnownUpdateMs === null
    ? null
    : new Date(latestKnownUpdateMs).toISOString();
  const knownUpdatesAfterBackup = Boolean(
    backupExportedAtMs !== null
    && Number.isFinite(backupExportedAtMs)
    && latestKnownUpdateMs !== null
    && latestKnownUpdateMs > backupExportedAtMs
  );
  const hasKnownLocalRecords = (!subjectError && total > 0)
    || (!savedViewsLoading && !savedViewError && savedViews.length > 0);

  useEffect(() => {
    const refreshBackupMarker = () => setBackupMarker(readDashboardBackupMarker());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === FULL_BACKUP_EXPORT_MARKER_KEY) refreshBackupMarker();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshBackupMarker();
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refreshBackupMarker);
    document.addEventListener("visibilitychange", handleVisibility);
    refreshBackupMarker();
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refreshBackupMarker);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const refreshDashboardIndexes = () => {
    void refreshSubjects();
    void refreshSavedViews();
  };

  const recordsPulse = loading ? "读取中" : subjectError ? "不可用" : total;
  const backupPulse = loading || savedViewsLoading
    ? "检查中"
    : subjectError || savedViewError
      ? "暂不可判定"
    : !hasKnownLocalRecords
      ? "暂无可见资料"
      : backupMarkerUnavailable || backupMarkerInvalid
        ? "暂不可判定"
      : knownUpdatesAfterBackup
        ? "可见资料已更新"
      : lastFullBackupExportedAt
        ? "有导出记录"
        : "待处理";
  const backupTone = !loading && !savedViewsLoading && (
    Boolean(subjectError)
    || Boolean(savedViewError)
    || (hasKnownLocalRecords && (
      backupMarkerUnavailable
      || backupMarkerInvalid
      || knownUpdatesAfterBackup
      || !lastFullBackupExportedAt
    ))
  ) ? "attention" : "quiet";
  const savedViewPulse = savedViewsLoading ? "读取中" : savedViewError ? "不可用" : String(savedViews.length);
  const dashboardState = loading || savedViewsLoading
    ? "loading"
    : subjectError || savedViewError
      ? "degraded"
      : backupTone === "attention"
        ? "attention"
        : "ready";
  const dashboardStateLabel = dashboardState === "loading"
    ? "首页索引读取中"
    : dashboardState === "degraded"
      ? "部分首页索引不可用"
      : dashboardState === "attention"
        ? "备份状态需要核对"
        : "首页所需索引可读";
  const backupPanelStateClass = backupMarker.status === "invalid"
    ? "marker-invalid"
    : backupMarker.status === "future"
      ? "marker-future"
      : backupMarkerUnavailable
        ? "marker-unavailable"
        : knownUpdatesAfterBackup
          ? "known-updates-after-export"
          : lastFullBackupExportedAt
            ? "has-export-record"
            : "needs-attention";
  const dashboardNextAction = loading || savedViewsLoading
    ? {
        href: "/cases",
        code: "READING",
        title: "等待本机索引完成",
        detail: "进入案例库查看完整读取状态，不把尚未完成的读取解释成空库。",
        icon: Database,
        tone: "reading"
      }
    : subjectError
      ? {
          href: "/settings/data",
          code: "RECOVER",
          title: "先检查本机数据",
          detail: "案例索引当前不可读；先核对数据与备份，不继续新建或近似恢复。",
          icon: HardDriveDownload,
          tone: "attention"
        }
      : savedViewError
        ? {
            href: "/settings/data",
            code: "VIEWS",
            title: "先恢复保存视图索引",
            detail: "案例记录仍可读取，但保存视图索引不可用；先核对本机数据，不近似恢复查询条件。",
            icon: Bookmark,
            tone: "attention"
          }
      : backupTone === "attention"
        ? {
            href: "/settings/data",
            code: "BACKUP",
            title: knownUpdatesAfterBackup ? "可见资料更新后重新备份" : "先核对本机资料与备份",
            detail: "打开数据管理页核对导出记录和实际文件，不把本机标记当作恢复证据。",
            icon: HardDriveDownload,
            tone: "attention"
          }
        : latest && latestPresentation
          ? {
              href: latestPresentation.href,
              code: "CONTINUE",
              title: `继续「${dashboardRecordAlias(latest.alias)}」`,
              detail: `${latestPresentation.detail} · 打开确切本地记录继续研究。`,
              icon: latestPresentation.kind === "candidate_set" ? Layers3 : Database,
              tone: "continue"
            }
          : {
              href: "/new?demo=1",
              code: "START",
              title: "建立第一份研究样本",
              detail: "先从明确标记的演示输入熟悉规则快照与保存边界。",
              icon: FilePlus2,
              tone: "quiet"
            };
  const DashboardNextActionIcon = dashboardNextAction.icon;

  return (
    <div
      className="page page--dashboard"
      data-state={dashboardState}
      data-subject-index-state={subjectIndexState}
      data-saved-view-index-state={savedViewIndexState}
      data-backup-marker-status={backupMarker.status}
      data-backup-evidence-state={backupPanelStateClass}
      data-known-updates-after-export={String(knownUpdatesAfterBackup)}
      data-dashboard-authority="index-summary-only"
      {...DASHBOARD_SAFETY_ATTRIBUTES}
      aria-busy={loading || savedViewsLoading}
    >
      <div className="dashboard-masthead">
        <PageHeading
          eyebrow="本地研究空间"
          title="今天从哪份研究继续？"
          description="本页只汇总当前浏览器可读的案例索引、保存视图与备份提示。核心计算不依赖 AI，备份标记也不等于文件可恢复。"
          actions={subjectError ? (
            <AppLink href="/settings/data" className="secondary-action">
              <HardDriveDownload aria-hidden="true" /> 检查本机数据
            </AppLink>
          ) : <>
              <AppLink href="/cases/research" className="secondary-action">
                <FileSearch aria-hidden="true" /> 专业研究检索
              </AppLink>
              <AppLink href="/new" className="primary-action">
                <FilePlus2 aria-hidden="true" /> 新建排盘
              </AppLink>
            </>}
        />
        <dl className="dashboard-pulse" aria-label="本机工作台摘要" aria-live="polite" aria-atomic="true" aria-busy={loading || savedViewsLoading}>
          <div data-tone={subjectError ? "attention" : "quiet"}>
            <dt>研究记录</dt>
            <dd><strong>{recordsPulse}</strong><small>{subjectError ? "未取得可靠计数" : "当前浏览器"}</small></dd>
          </div>
          <div data-tone={savedViewError ? "attention" : "quiet"}>
            <dt>近期视图</dt>
            <dd><strong>{savedViewPulse}</strong><small>仅显示已保存条件</small></dd>
          </div>
          <div data-tone={backupTone}>
            <dt>完整备份</dt>
            <dd><strong>{backupPulse}</strong><small>{dashboardBackupMarkerCaption(backupMarker)}</small></dd>
          </div>
        </dl>
      </div>

      <div className="dashboard-route-guide">
        <p id="dashboard-route-guide-copy">
          <strong>研究路径</strong>
          <span>入口按当前可读取的本机状态排序，不代表术数结论。</span>
        </p>
        <div className="dashboard-route-guide__meta">
          <span className="dashboard-route-guide__identity">legacy-v13 · Schema 13 · migrationId null</span>
          <span className="dashboard-route-guide__state" data-state={dashboardState} role="status" aria-atomic="true">{dashboardStateLabel}</span>
          <span className="dashboard-route-guide__mobile" aria-hidden="true">
            <MoveHorizontal /> 横向查看
          </span>
        </div>
      </div>
      <nav className="dashboard-route-deck" aria-label="工作台任务罗盘" aria-describedby="dashboard-route-guide-copy">
        <AppLink
          href={dashboardNextAction.href}
          className="dashboard-route-card dashboard-route-card--next"
          data-tone={dashboardNextAction.tone}
        >
          <span className="dashboard-route-card__meta">
            <small>NEXT / {dashboardNextAction.code}</small>
            <DashboardNextActionIcon aria-hidden="true" />
          </span>
          <span className="dashboard-route-card__copy">
            <strong>{safeVisibleText(dashboardNextAction.title, "下一步操作不可显示。", 240)}</strong>
            <span>{safeVisibleText(dashboardNextAction.detail, "下一步说明不可显示。", 500)}</span>
          </span>
          <ArrowRight className="dashboard-route-card__arrow" aria-hidden="true" />
        </AppLink>
        <AppLink href="/cases" className="dashboard-route-card">
          <span className="dashboard-route-card__meta"><small>LIBRARY / LOCAL</small><Database aria-hidden="true" /></span>
          <span className="dashboard-route-card__copy"><strong>浏览案例库</strong><span>只读定位 Case、Revision 与未知时辰候选组。</span></span>
          <ArrowRight className="dashboard-route-card__arrow" aria-hidden="true" />
        </AppLink>
        <AppLink href="/compare" className="dashboard-route-card">
          <span className="dashboard-route-card__meta"><small>COMPARE / FROZEN</small><GitCompareArrows aria-hidden="true" /></span>
          <span className="dashboard-route-card__copy"><strong>命盘结构对照</strong><span>选择冻结 Revision，核对静态字段差异与来源边界。</span></span>
          <ArrowRight className="dashboard-route-card__arrow" aria-hidden="true" />
        </AppLink>
        <AppLink href="/knowledge" className="dashboard-route-card">
          <span className="dashboard-route-card__meta"><small>SOURCES / TRACE</small><BookOpenText aria-hidden="true" /></span>
          <span className="dashboard-route-card__copy"><strong>核对知识来源</strong><span>查看材料、引文关系和仍待补齐的来源缺口。</span></span>
          <ArrowRight className="dashboard-route-card__arrow" aria-hidden="true" />
        </AppLink>
      </nav>

      {loading ? (
        <div className="dashboard-skeleton" role="status" aria-label="正在读取本地案例">
          <span />
          <span />
          <span />
        </div>
      ) : subjectError ? (
        <section className="dashboard-library-unavailable" aria-labelledby="dashboard-library-unavailable-title">
          <div className="empty-mark" aria-hidden="true"><Database /></div>
          <div>
            <p className="eyebrow">Case library unavailable</p>
            <h2 id="dashboard-library-unavailable-title">没有把读取失败解释成空库</h2>
            <p>首页未取得可靠的案例数量，因此不会建议新建记录或显示“暂无资料”。现有浏览器数据没有被清空、迁移或近似恢复。</p>
            <div className="dashboard-library-error-detail" role="alert">
              <strong>案例索引诊断</strong>
              <p>{visibleSubjectError}</p>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="secondary-action dashboard-library-retry"
                data-retry-scope="subject-and-saved-view-indexes"
                disabled={loading || savedViewsLoading}
                aria-busy={loading || savedViewsLoading}
                onClick={refreshDashboardIndexes}
              >
                <RefreshCw aria-hidden="true" />{loading || savedViewsLoading ? "正在读取首页索引" : "重新读取首页索引"}
              </button>
              <AppLink href="/settings/data" className="secondary-action">检查数据与备份</AppLink>
              <AppLink href="/help" className="text-link">查看本地数据说明</AppLink>
            </div>
          </div>
        </section>
      ) : latest && latestPresentation ? (
        <section className={`continue-research continue-research--${latestPresentation.kind}`} aria-labelledby="continue-title">
          <div className="section-label"><span className="spine-dot" />继续研究</div>
          <div className="continue-row">
            <div className="continue-row__copy">
              <StatusPill tone={latestPresentation.kind === "candidate_set" ? "warning" : "info"}>{safeVisibleText(latestPresentation.status, "记录状态不可显示", 120)}</StatusPill>
              <h2 id="continue-title">{dashboardRecordAlias(latest.alias)}</h2>
              <dl className="continue-row__ledger" aria-label="继续研究记录绑定">
                <div><dt>记录类型</dt><dd>{safeVisibleText(latestPresentation.detail, "记录类型不可显示", 160)}</dd></div>
                <div><dt>标签</dt><dd>{dashboardTagsCaption(latest.tags)}</dd></div>
                <div><dt>最近更新</dt><dd><time dateTime={latest.updatedAt}>{formatDateTime(latest.updatedAt)}</time></dd></div>
                <div><dt>本地引用</dt><dd><code title={safeVisibleText(latest.id, "", 512)}>{shortDashboardReference(latest.id)}</code></dd></div>
              </dl>
            </div>
            <AppLink href={latestPresentation.href} className="secondary-action">
              {latestPresentation.kind === "candidate_set" ? "打开候选组" : "打开命盘"} <ArrowRight aria-hidden="true" />
            </AppLink>
          </div>
        </section>
      ) : (
        <section className="empty-workspace" aria-labelledby="empty-title">
          <div className="empty-mark" aria-hidden="true"><Layers3 /></div>
          <div>
            <p className="eyebrow">还没有本地研究记录</p>
            <h2 id="empty-title">先建立第一张可复算的研究样本</h2>
            <p>你可以从空白输入开始，也可以载入一组明确标记的演示值。两种方式都会调用当前本地计算适配层并保存完整规则快照；演示值不构成真实个案或专家结论。</p>
            <div className="button-row">
              <AppLink href="/new" className="primary-action">从空白开始</AppLink>
              <AppLink href="/new?demo=1" className="secondary-action">载入演示值</AppLink>
              <AppLink href="/cases?import=csv" className="secondary-action">导入 CSV</AppLink>
            </div>
          </div>
        </section>
      )}

      <div className="dashboard-grid">
        <section className="flat-section dashboard-recent" aria-labelledby="dashboard-recent-title">
          <div className="section-heading-row">
            <div><p className="eyebrow">最近研究</p><h2 id="dashboard-recent-title">{loading ? "正在读取本地记录" : subjectError ? "案例库不可用" : total ? `${total} 条本地记录` : "等待第一条记录"}</h2></div>
            <AppLink href="/cases" className="text-link">查看案例库 <ArrowRight aria-hidden="true" /></AppLink>
          </div>
          {!loading && !subjectError && total > orderedSubjects.length ? <p className="dashboard-recent-scope">首页按更新时间仅展示最近 {orderedSubjects.length} 条；完整的 {total} 条记录请进入案例库核对。</p> : null}
          <div className="recent-list" data-has-records={!subjectError && orderedSubjects.length > 0}>
            {!subjectError ? orderedSubjects.map((item, index) => {
              const presentation = presentBaziResearchSubject(item);
              return (
                <AppLink key={item.id} href={presentation.href} className="recent-row">
                  <span
                    className="recent-icon"
                    data-recency-rank={String(index + 1).padStart(2, "0")}
                    data-record-kind={presentation.kind}
                    aria-hidden="true"
                  >
                    {presentation.kind === "candidate_set" ? <Layers3 /> : <Database />}
                  </span>
                  <span><strong>{dashboardRecordAlias(item.alias)}</strong><small>{safeVisibleText(presentation.detail, "记录详情不可显示", 160)} · {formatDateTime(item.updatedAt)}</small></span>
                  <ArrowRight aria-hidden="true" />
                </AppLink>
              );
            }) : null}
            {!loading && subjectError ? <p className="muted-copy">案例库读取失败；这里没有显示空库结论或近似记录。</p> : null}
            {!loading && !subjectError && !orderedSubjects.length ? <p className="muted-copy">保存正式命盘或未知时辰候选组后，这里会沿“岁序脊线”显示最近研究。</p> : null}
          </div>
        </section>

        <aside className="dashboard-side-stack" aria-label="研究快捷入口">
          {!loading && !subjectError && hasKnownLocalRecords ? (
            <section className={`dashboard-panel dashboard-panel--backup ${backupPanelStateClass}`} aria-labelledby="backup-health-title">
              <div className="dashboard-panel-heading">
                <div><p className="eyebrow">Backup record</p><h2 id="backup-health-title">备份记录</h2></div>
                <HardDriveDownload aria-hidden="true" />
              </div>
              {backupMarkerUnavailable || backupMarkerInvalid ? (
                <div className="dashboard-panel-message is-error" role={backupMarkerInvalid ? "alert" : "status"}>
                  <strong>备份状态暂不可判定</strong>
                  <small>{backupMarkerIssueDetail} 请打开数据管理页核对文件与导出记录。</small>
                </div>
              ) : knownUpdatesAfterBackup && latestKnownUpdateIso && lastFullBackupExportedAt ? (
                <div className="dashboard-panel-message is-warning" role="status">
                  <strong>可见资料晚于上次导出记录</strong>
                  <small>上次导出记录为 {formatDateTime(lastFullBackupExportedAt)}，当前已读取资料最近更新于 {formatDateTime(latestKnownUpdateIso)}。这已经足以提示重新备份，但仍不代表其他分区没有更晚变化。</small>
                </div>
              ) : lastFullBackupExportedAt ? (
                <div className="dashboard-panel-message">
                  <strong>上次完整备份导出记录：{formatDateTime(lastFullBackupExportedAt)}</strong>
                  <small>{savedViewError ? "保存视图索引当前不可读，无法完整比较已知更新时间。" : "当前首页已读取的案例与保存视图没有显示更晚时间。"} 这仍只表示导出曾被请求或保存；请人工确认文件可打开，不能据此证明十六分区完整可恢复。</small>
                </div>
              ) : (
                <div className="dashboard-panel-message is-warning" role="status">
                  <strong>尚未确认完整备份</strong>
                  <small>已存在本地研究记录；浏览器数据可能被系统清理，请尽快导出完整备份并确认文件可打开。</small>
                </div>
              )}
              <AppLink href="/settings/data" className="text-link">导出完整备份 <ArrowRight aria-hidden="true" /></AppLink>
            </section>
          ) : null}

          <section className="dashboard-panel dashboard-panel--saved" aria-labelledby="saved-view-title">
            <div className="dashboard-panel-heading">
              <div><p className="eyebrow">Saved research</p><h2 id="saved-view-title">最近保存视图</h2></div>
              <Bookmark aria-hidden="true" />
            </div>
            {savedViewsLoading ? <p className="dashboard-panel-message" role="status">正在读取本机保存视图…</p> : null}
            {savedViewError ? (
              <div className="dashboard-panel-message is-error" role="alert">
                <strong>保存视图暂不可读</strong>
                <small>{visibleSavedViewError}；没有执行或近似恢复任何查询。</small>
                <button type="button" className="secondary-action dashboard-inline-retry" disabled={savedViewsLoading} aria-busy={savedViewsLoading} onClick={() => void refreshSavedViews()}>
                  <RefreshCw aria-hidden="true" />{savedViewsLoading ? "正在读取" : "重新读取"}
                </button>
              </div>
            ) : null}
            {!savedViewsLoading && !savedViewError ? (
              <div className="saved-view-list">
                {orderedSavedViews.length > visibleSavedViews.length ? <p className="dashboard-saved-view-scope">首页仅展示最近 {visibleSavedViews.length} / {orderedSavedViews.length} 个保存视图；完整条件请进入专业研究检索核对。</p> : null}
                {visibleSavedViews.map((view, index) => {
                  const presentation = presentBaziSavedView(view);
                  return (
                    <AppLink key={view.id} href={presentation.href} className="saved-view-row">
                      <span className="saved-view-row__rank" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <span><strong>{dashboardSavedViewName(view.name)}</strong><small>{safeVisibleText(presentation.label, "视图类型不可显示", 160)} · {formatDateTime(view.updatedAt)}</small></span>
                      <ArrowRight aria-hidden="true" />
                    </AppLink>
                  );
                })}
                {!visibleSavedViews.length ? <p className="dashboard-panel-message">在专业研究检索中保存常用条件后，会出现在这里。</p> : null}
              </div>
            ) : null}
            <AppLink href="/cases/research" className="text-link">打开专业研究检索 <ArrowRight aria-hidden="true" /></AppLink>
          </section>

          <section className="dashboard-panel dashboard-panel--actions" aria-labelledby="quick-action-title">
            <div className="dashboard-panel-heading">
              <div><p className="eyebrow">Local workflow</p><h2 id="quick-action-title">本机资料入口</h2></div>
            </div>
            <nav className="dashboard-quick-list" aria-label="本机资料操作">
              <AppLink href="/cases?import=csv" className="dashboard-quick-row"><FileUp aria-hidden="true" /><span><strong>CSV 批量导入</strong><small>先映射、预检，再逐行写入</small></span><ArrowRight aria-hidden="true" /></AppLink>
              <AppLink href="/settings/data" className="dashboard-quick-row"><HardDriveDownload aria-hidden="true" /><span><strong>完整备份与恢复</strong><small>十六分区、摘要和恢复前安全快照</small></span><ArrowRight aria-hidden="true" /></AppLink>
            </nav>
          </section>
        </aside>
      </div>
    </div>
  );
}
