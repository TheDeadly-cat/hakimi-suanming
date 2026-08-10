import {
  ArrowRight,
  Bookmark,
  Database,
  FilePlus2,
  FileSearch,
  FileUp,
  HardDriveDownload,
  Layers3
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppLink } from "../lib/router";
import { useResearchSubjectPage } from "../lib/use-cases";
import { useRecentSavedViews } from "../lib/use-recent-saved-views";
import { formatDateTime } from "../lib/format";
import { readLastFullBackupExportedAt } from "../lib/backup-health";
import {
  presentBaziResearchSubject,
  presentBaziSavedView
} from "../lib/research-workspace-presentation";
import { PageHeading } from "../components/page-heading";
import { StatusPill } from "../components/status-pill";

export function DashboardPage() {
  const { subjects, total, loading, error } = useResearchSubjectPage({ limit: 4 });
  const {
    savedViews,
    loading: savedViewsLoading,
    error: savedViewsError
  } = useRecentSavedViews();
  const latest = subjects[0];
  const latestPresentation = latest ? presentBaziResearchSubject(latest) : null;
  const [lastFullBackupExportedAt, setLastFullBackupExportedAt] = useState<string | null>(null);

  useEffect(() => {
    setLastFullBackupExportedAt(readLastFullBackupExportedAt(window.localStorage));
  }, []);

  return (
    <div className="page page--dashboard">
      <PageHeading
        eyebrow="本地研究空间"
        title="今天从哪一张盘继续？"
        description="命盘、规则快照和笔记都保存在当前浏览器。核心计算不依赖 AI，也不会上传出生资料。"
        actions={<>
          <AppLink href="/cases/research" className="secondary-action">
            <FileSearch aria-hidden="true" /> 专业研究检索
          </AppLink>
          <AppLink href="/new" className="primary-action">
            <FilePlus2 aria-hidden="true" /> 新建排盘
          </AppLink>
        </>}
      />

      {error ? <div className="error-panel" role="alert"><strong>案例库暂不可读</strong><p>{error}</p></div> : null}

      {loading ? (
        <div className="dashboard-skeleton" role="status" aria-label="正在读取本地案例">
          <span />
          <span />
          <span />
        </div>
      ) : latest ? (
        <section className="continue-research" aria-labelledby="continue-title">
          <div className="section-label"><span className="spine-dot" />继续研究</div>
          <div className="continue-row">
            <div>
              <StatusPill tone={latestPresentation?.kind === "candidate_set" ? "warning" : "jade"}>{latestPresentation?.status}</StatusPill>
              <h2 id="continue-title">{latest.alias}</h2>
              <p>{latest.tags.length ? latest.tags.join(" · ") : "尚未添加标签"} · {formatDateTime(latest.updatedAt)}</p>
            </div>
            <AppLink href={latestPresentation!.href} className="secondary-action">
              {latestPresentation!.kind === "candidate_set" ? "打开候选组" : "打开命盘"} <ArrowRight aria-hidden="true" />
            </AppLink>
          </div>
        </section>
      ) : (
        <section className="empty-workspace" aria-labelledby="empty-title">
          <div className="empty-mark" aria-hidden="true"><Layers3 /></div>
          <div>
            <p className="eyebrow">还没有本地研究记录</p>
            <h2 id="empty-title">先建立第一张可复算的研究样本</h2>
            <p>你可以从空白输入开始，也可以载入一组明确标记的演示值。两种方式都会调用真实适配层并保存完整规则快照。</p>
            <div className="button-row">
              <AppLink href="/new" className="primary-action">从空白开始</AppLink>
              <AppLink href="/new?demo=1" className="secondary-action">载入演示值</AppLink>
              <AppLink href="/cases" className="secondary-action">导入 CSV</AppLink>
            </div>
          </div>
        </section>
      )}

      <div className="dashboard-grid">
        <section className="flat-section">
          <div className="section-heading-row">
            <div><p className="eyebrow">最近研究</p><h2>{total ? `${total} 条本地记录` : "等待第一条记录"}</h2></div>
            <AppLink href="/cases" className="text-link">查看案例库 <ArrowRight aria-hidden="true" /></AppLink>
          </div>
          <div className="recent-list">
            {subjects.map((item) => {
              const presentation = presentBaziResearchSubject(item);
              return (
                <AppLink key={item.id} href={presentation.href} className="recent-row">
                  <span className="recent-icon">{presentation.kind === "candidate_set" ? <Layers3 aria-hidden="true" /> : <Database aria-hidden="true" />}</span>
                  <span><strong>{item.alias}</strong><small>{presentation.detail} · {formatDateTime(item.updatedAt)}</small></span>
                  <ArrowRight aria-hidden="true" />
                </AppLink>
              );
            })}
            {!subjects.length ? <p className="muted-copy">保存正式命盘或未知时辰候选组后，这里会沿“岁序脊线”显示最近研究。</p> : null}
          </div>
        </section>

        <aside className="dashboard-side-stack" aria-label="研究快捷入口">
          {!loading && total > 0 ? (
            <section className="dashboard-panel" aria-labelledby="backup-health-title">
              <div className="dashboard-panel-heading">
                <div><p className="eyebrow">Backup health</p><h2 id="backup-health-title">备份健康</h2></div>
                <HardDriveDownload aria-hidden="true" />
              </div>
              {lastFullBackupExportedAt ? (
                <div className="dashboard-panel-message">
                  <strong>上次完整备份：{formatDateTime(lastFullBackupExportedAt)}</strong>
                  <small>这表示导出已请求或保存；请人工确认文件可以打开，并在资料变化后重新备份。</small>
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

          <section className="dashboard-panel" aria-labelledby="saved-view-title">
            <div className="dashboard-panel-heading">
              <div><p className="eyebrow">Saved research</p><h2 id="saved-view-title">最近保存视图</h2></div>
              <Bookmark aria-hidden="true" />
            </div>
            {savedViewsLoading ? <p className="dashboard-panel-message" role="status">正在读取本机保存视图…</p> : null}
            {savedViewsError ? <p className="dashboard-panel-message is-error" role="alert">保存视图暂不可读；没有执行或近似恢复任何查询。</p> : null}
            {!savedViewsLoading && !savedViewsError ? (
              <div className="saved-view-list">
                {savedViews.map((view) => {
                  const presentation = presentBaziSavedView(view);
                  return (
                    <AppLink key={view.id} href={presentation.href} className="saved-view-row">
                      <span><strong>{view.name}</strong><small>{presentation.label} · {formatDateTime(view.updatedAt)}</small></span>
                      <ArrowRight aria-hidden="true" />
                    </AppLink>
                  );
                })}
                {!savedViews.length ? <p className="dashboard-panel-message">在专业研究检索中保存常用条件后，会出现在这里。</p> : null}
              </div>
            ) : null}
            <AppLink href="/cases/research" className="text-link">打开专业研究检索 <ArrowRight aria-hidden="true" /></AppLink>
          </section>

          <section className="dashboard-panel" aria-labelledby="quick-action-title">
            <div className="dashboard-panel-heading">
              <div><p className="eyebrow">Local workflow</p><h2 id="quick-action-title">本机资料入口</h2></div>
            </div>
            <nav className="dashboard-quick-list" aria-label="本机资料操作">
              <AppLink href="/cases" className="dashboard-quick-row"><FileUp aria-hidden="true" /><span><strong>CSV 批量导入</strong><small>先映射、预检，再逐行写入</small></span><ArrowRight aria-hidden="true" /></AppLink>
              <AppLink href="/settings/data" className="dashboard-quick-row"><HardDriveDownload aria-hidden="true" /><span><strong>完整备份与恢复</strong><small>十六分区、摘要和恢复前安全快照</small></span><ArrowRight aria-hidden="true" /></AppLink>
            </nav>
          </section>
        </aside>
      </div>
    </div>
  );
}
