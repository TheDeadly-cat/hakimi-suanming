import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  BookOpen,
  BotOff,
  DatabaseBackup,
  FolderOpen,
  Printer,
  Settings,
  ShieldCheck
} from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FULL_BACKUP_FORMAT_VERSION } from "@hakimi/contracts";
import { webReportExportPort } from "@hakimi/platform";
import { RUNTIME_TIME_ZONE_DATABASE } from "@hakimi/time-core";
import { PageHeading } from "../components/page-heading";
import { ResearchContentCatalog } from "../components/research-content-catalog";
import { ResearchSystemRoadmap } from "../components/research-system-roadmap";
import { StatusPill } from "../components/status-pill";
import { APP_VERSION } from "../lib/app-version";
import { CURRENT_RELEASE_DATABASE, CURRENT_RELEASE_ENGINEERING_IDENTITY } from "../lib/current-release";
import { AppLink } from "../lib/router";
import { safeVisibleErrorMessage } from "../lib/visible-text";
import "./help-page.css";

const helpTopics = [
  { id: "local-data", label: "本地数据" },
  { id: "offline", label: "离线与安装" },
  { id: "rules", label: "规则与证据" },
  { id: "ai", label: "AI 边界" },
  { id: "responsible-use", label: "使用边界" },
  { id: "recovery", label: "异常恢复" },
  { id: "system", label: "应用身份" },
  { id: "faq", label: "常见问题" },
  { id: "appendix", label: "研究目录" }
] as const;

type HelpTopicId = (typeof helpTopics)[number]["id"];

function helpTopicFromHash(hash: string): HelpTopicId | null {
  if (!hash.startsWith("#")) return null;
  try {
    const decoded = decodeURIComponent(hash.slice(1));
    return helpTopics.find((topic) => topic.id === decoded)?.id ?? null;
  } catch {
    return null;
  }
}

const evidenceLevels = [
  {
    code: "E1",
    state: "当前具备",
    title: "工程可复算",
    description: "固定输入、规则和版本后，可以复算结果并核对摘要、测试与差分记录。",
    boundary: "只证明指定实现可重复，不证明历表权威、术理正确或现实结论成立。",
    tone: "ready"
  },
  {
    code: "E2",
    state: "持续建设",
    title: "来源可追溯",
    description: "内容条目保留来源、版本、适用范围与待审缺口，让引用能够回到原始依据。",
    boundary: "链接存在不等于来源已核验，也不等于该观点已经被项目正式采用。",
    tone: "trace"
  },
  {
    code: "E3",
    state: "门禁关闭",
    title: "专家审核与发布",
    description: "还需要独立专家评审、跨实现证据、审核身份和发布门共同成立。",
    boundary: "当前不宣称专家批准，也不把本地工程构建视作公开发布授权。",
    tone: "closed"
  }
] as const;

const capabilityRegister = [
  {
    code: "NOW",
    label: "当前可用",
    title: "本地研究闭环",
    description: "八字排盘、Revision、CandidateSet、案例、知识检索、正式对照与完整备份。",
    tone: "ready"
  },
  {
    code: "EXPLICIT",
    label: "需主动触发",
    title: "本机验证与规则变更",
    description: "AI 断言草稿只在用户触发后于本机验证；第三方规则先隔离，确认后才允许激活。",
    tone: "trace"
  },
  {
    code: "CLOSED",
    label: "仍保持关闭",
    title: "未获授权的能力",
    description: "AI Provider 外发、账号与云同步、跨体系自动评分、专家真值和公开发布授权都不是当前能力。",
    tone: "closed"
  }
] as const;

export function HelpPage() {
  const [activeTopic, setActiveTopic] = useState<HelpTopicId | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const topicNavLinksRef = useRef<HTMLDivElement>(null);
  const topicLinkRefs = useRef(new Map<HelpTopicId, HTMLAnchorElement>());

  const printSafetyGuide = async () => {
    setPrintError(null);
    try {
      await webReportExportPort.printReport();
    } catch (reason) {
      setPrintError(safeVisibleErrorMessage(reason, "安全指南未能打开系统打印。"));
    }
  };

  useEffect(() => {
    let frame: number | null = null;
    const syncHashTarget = () => {
      const nextTopic = helpTopicFromHash(window.location.hash);
      setActiveTopic(nextTopic);
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = nextTopic
        ? window.requestAnimationFrame(() => {
            frame = null;
            document.getElementById(nextTopic)?.focus({ preventScroll: true });
          })
        : null;
    };
    syncHashTarget();
    window.addEventListener("hashchange", syncHashTarget);
    return () => {
      window.removeEventListener("hashchange", syncHashTarget);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!activeTopic) return;
    const container = topicNavLinksRef.current;
    if (!container) return;
    let frame: number | null = null;
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const centerActiveLink = () => {
      frame = null;
      const container = topicNavLinksRef.current;
      const link = topicLinkRefs.current.get(activeTopic);
      if (!container || !link) return;
      const containerRect = container.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const visibleInset = 10;
      const fullyVisible = linkRect.left >= containerRect.left + visibleInset
        && linkRect.right <= containerRect.right - visibleInset;
      if (fullyVisible) return;
      const centeredDelta = linkRect.left - containerRect.left
        - ((containerRect.width - linkRect.width) / 2);
      container.scrollTo({
        left: Math.max(0, container.scrollLeft + centeredDelta),
        behavior: reducedMotionQuery.matches ? "auto" : "smooth"
      });
    };
    const scheduleCenter = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(centerActiveLink);
    };
    scheduleCenter();
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(scheduleCenter);
    if (resizeObserver) resizeObserver.observe(container);
    else window.addEventListener("resize", scheduleCenter);
    return () => {
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", scheduleCenter);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [activeTopic]);

  useEffect(() => {
    const trackedTopics: Array<{ id: HelpTopicId; element: HTMLElement }> = [];
    for (const topic of helpTopics) {
      const element = document.getElementById(topic.id);
      if (element) trackedTopics.push({ id: topic.id, element });
    }

    let frame: number | null = null;
    const syncVisibleTopic = () => {
      frame = null;
      const marker = Math.min(window.innerHeight * 0.28, 220);
      let closestTopic: HelpTopicId | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const topic of trackedTopics) {
        const rect = topic.element.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
        const distance = Math.abs(rect.top - marker);
        if (distance >= closestDistance) continue;
        closestTopic = topic.id;
        closestDistance = distance;
      }

      setActiveTopic(closestTopic);
    };
    const scheduleSync = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(syncVisibleTopic);
    };
    scheduleSync();
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    return () => {
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const activeTopicIndex = activeTopic
    ? helpTopics.findIndex((topic) => topic.id === activeTopic)
    : -1;
  const activeTopicProgress = activeTopicIndex >= 0
    ? (activeTopicIndex + 1) / helpTopics.length
    : 0;

  const focusTopicByKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const focusedLink = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
    const currentTopic = focusedLink ? helpTopicFromHash(focusedLink.hash) : null;
    if (!currentTopic) return;
    const currentIndex = helpTopics.findIndex((topic) => topic.id === currentTopic);
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % helpTopics.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + helpTopics.length) % helpTopics.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = helpTopics.length - 1;
    else return;
    event.preventDefault();
    topicLinkRefs.current.get(helpTopics[nextIndex]!.id)?.focus();
  };

  return (
    <div
      className="page page--help"
      id="help-page-top"
      data-release-identity={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-db-generation={CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration}
      data-target-schema={CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema}
      data-migration-id={CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null"}
      data-active-help-topic={activeTopic ?? "none"}
      data-active-help-topic-index={activeTopicIndex >= 0 ? String(activeTopicIndex + 1) : "none"}
      data-help-topic-count={String(helpTopics.length)}
      data-release-evidence-bound={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound)}
      data-engineering-evidence-only={String(CURRENT_RELEASE_ENGINEERING_IDENTITY.engineeringEvidenceOnly)}
      data-evidence-authority="engineering-only"
      data-source-authenticity-claimed="false"
      data-formal-validation="false"
      data-scientific-validation="false"
      data-print-delivery="dialog-only-not-saved"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      data-mutation-epoch-bypassed="false"
      tabIndex={-1}
    >
      <PageHeading
        eyebrow="Help and boundaries"
        title="帮助与安全边界"
        description="先弄清数据保存在哪里、哪些结论仍待验证，以及出现异常时该保留什么。这里说明当前版本真实具备的能力，不把未来计划写成现成功能。"
        actions={(
          <>
            <button
              type="button"
              className="secondary-action help-print-action"
              title="只打开系统打印对话框；仍需自行确认纸张或 PDF 已实际保存"
              onClick={() => void printSafetyGuide()}
            >
              <Printer aria-hidden="true" />打印安全指南
            </button>
            <AppLink href="/settings/data" className="primary-action">
              <DatabaseBackup aria-hidden="true" />检查完整备份
            </AppLink>
          </>
        )}
      />

      {printError ? <div className="inline-error" role="alert"><strong>打印未启动</strong><p>{printError}</p></div> : null}

      <section className="help-start" aria-labelledby="help-start-title">
        <div className="help-start-copy">
          <ShieldCheck aria-hidden="true" />
          <div>
            <p className="eyebrow">开始前一分钟</p>
            <h2 id="help-start-title">先把研究资料的退路留好</h2>
            <p>本工具把可复算、可追溯和诚实边界放在解释之前。第一次使用时，建议先用演示资料走一遍，再决定是否录入真实人物资料。</p>
            <div className="help-status-line" aria-label="当前产品边界">
              <StatusPill tone="jade">本地优先</StatusPill>
              <StatusPill tone="info">无账号</StatusPill>
              <StatusPill tone="info">无云同步</StatusPill>
              <StatusPill tone="warning">首版 18+</StatusPill>
              <StatusPill tone="warning">研究预览</StatusPill>
            </div>
          </div>
        </div>

        <aside className="help-release-ledger" aria-label="当前发布身份">
          <div className="help-release-ledger-heading">
            <span>Release boundary</span>
            <strong>发布门保持关闭</strong>
          </div>
          <dl>
            <div><dt>身份</dt><dd>{CURRENT_RELEASE_DATABASE.dbGeneration}</dd></div>
            <div><dt>目标 Schema</dt><dd>{CURRENT_RELEASE_DATABASE.targetSchema}</dd></div>
            <div><dt>迁移任务</dt><dd>{CURRENT_RELEASE_DATABASE.migrationId ?? "null"}</dd></div>
            <div><dt>工程证据</dt><dd>{CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound ? "已绑定" : "未绑定"}</dd></div>
            <div><dt>专家真值</dt><dd>未声称</dd></div>
            <div><dt>公开发布</dt><dd>未授权</dd></div>
          </dl>
          <p>当前没有迁移任务；未来写入迁移仍须通过正式 mutation epoch。工程证据不构成专家真值或公开发布授权。</p>
        </aside>

        <div className="help-start-checklist">
          <div className="help-checklist-heading">
            <span>01—04</span>
            <div>
              <p className="eyebrow">First-run route</p>
              <h3>首次使用路径</h3>
            </div>
          </div>
          <ol className="help-first-steps">
            <li><span><strong>用演示值排盘</strong><small>先熟悉时间、规则、Revision（修订快照）与 CandidateSet（候选组）。</small></span><AppLink href="/new?demo=1">打开演示排盘<ArrowRight aria-hidden="true" /></AppLink></li>
            <li><span><strong>确认输入语义</strong><small>公历/农历、地点、时区、换日与真太阳时都会影响结果。</small></span></li>
            <li><span><strong>导出完整备份</strong><small>真实录入后尽早保存 full {FULL_BACKUP_FORMAT_VERSION} 文件，并确认已经落盘、大小非零且能够打开。</small></span><AppLink href="/settings/data">前往数据管理<ArrowRight aria-hidden="true" /></AppLink></li>
            <li><span><strong>记住证据边界</strong><small>工程复算一致不等于专家真值，当前状态以设置页总账为准。</small></span><AppLink href="/settings">查看版本与诊断<ArrowRight aria-hidden="true" /></AppLink></li>
          </ol>
        </div>
      </section>

      <section className="help-task-router" aria-labelledby="help-task-router-title">
        <header className="help-task-router-heading">
          <div>
            <p className="eyebrow">Task router</p>
            <h2 id="help-task-router-title">现在需要解决什么？</h2>
          </div>
          <p>无需先读完整页。按当前任务进入最短路径；页面入口只负责定位，不会替你执行恢复、重算或发布。</p>
        </header>

        <div className="help-task-routes">
          <a className="help-task-route help-task-route--urgent" href="#recovery">
            <span className="help-task-route-icon"><AlertTriangle aria-hidden="true" /></span>
            <span className="help-task-route-copy">
              <small>RECOVER</small>
              <strong>页面异常或状态不明</strong>
              <span>先停止写入，保留原始文件、地址与复现条件。</span>
            </span>
            <ArrowRight aria-hidden="true" />
          </a>
          <AppLink className="help-task-route" href="/cases">
            <span className="help-task-route-icon"><FolderOpen aria-hidden="true" /></span>
            <span className="help-task-route-copy">
              <small>CASES</small>
              <strong>找案例或确切修订</strong>
              <span>从案例库重新定位 Case、Revision 与 CandidateSet。</span>
            </span>
            <ArrowRight aria-hidden="true" />
          </AppLink>
          <AppLink className="help-task-route" href="/knowledge">
            <span className="help-task-route-icon"><BookOpen aria-hidden="true" /></span>
            <span className="help-task-route-copy">
              <small>SOURCES</small>
              <strong>核对来源与引文</strong>
              <span>查看知识材料、引文关系和仍待补齐的证据。</span>
            </span>
            <ArrowRight aria-hidden="true" />
          </AppLink>
          <AppLink className="help-task-route" href="/settings">
            <span className="help-task-route-icon"><Settings aria-hidden="true" /></span>
            <span className="help-task-route-copy">
              <small>IDENTITY</small>
              <strong>核对版本与诊断</strong>
              <span>查看当前发布身份、规则、时区与诊断总账。</span>
            </span>
            <ArrowRight aria-hidden="true" />
          </AppLink>
        </div>
      </section>

      <section className="help-evidence-guide" aria-labelledby="help-evidence-title">
        <header className="help-evidence-heading">
          <div>
            <p className="eyebrow">Evidence ladder</p>
            <h2 id="help-evidence-title">先看证据到了哪一层</h2>
          </div>
          <p>“能运行”“有来源”和“已由专家审核”是三种不同状态。任何上层结论都不能由下层工程结果自动推导。</p>
        </header>

        <ol className="help-evidence-levels">
          {evidenceLevels.map((level) => (
            <li className={`help-evidence-card help-evidence-card--${level.tone}`} key={level.code}>
              <div className="help-evidence-card-meta"><span>{level.code}</span><small>{level.state}</small></div>
              <h3>{level.title}</h3>
              <p>{level.description}</p>
              <strong>{level.boundary}</strong>
            </li>
          ))}
        </ol>

        <ul className="help-capability-register" aria-label="当前能力状态">
          {capabilityRegister.map((item) => (
            <li className={`help-capability-item help-capability-item--${item.tone}`} key={item.code}>
              <span>{item.code}</span>
              <div><small>{item.label}</small><strong>{item.title}</strong><p>{item.description}</p></div>
            </li>
          ))}
        </ul>
      </section>

      <nav className="help-topic-nav" aria-label="帮助主题">
        <span className="help-topic-nav-label" aria-hidden="true">
          <small>{activeTopicIndex >= 0 ? `${String(activeTopicIndex + 1).padStart(2, "0")} / ${String(helpTopics.length).padStart(2, "0")}` : "Page index"}</small>
          <strong>本页目录</strong>
        </span>
        <div className="help-topic-nav-links" ref={topicNavLinksRef} onKeyDown={focusTopicByKeyboard}>
          {helpTopics.map((topic, index) => (
            <a
              key={topic.id}
              ref={(node) => {
                if (node) topicLinkRefs.current.set(topic.id, node);
                else topicLinkRefs.current.delete(topic.id);
              }}
              href={`#${topic.id}`}
              aria-current={activeTopic === topic.id ? "location" : undefined}
              aria-keyshortcuts="ArrowLeft ArrowRight Home End"
              onClick={(event) => {
                if (helpTopicFromHash(window.location.hash) !== topic.id) return;
                event.preventDefault();
                const target = document.getElementById(topic.id);
                if (!target) return;
                target.scrollIntoView({ block: "start" });
                target.focus({ preventScroll: true });
                setActiveTopic(topic.id);
              }}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {topic.label}
            </a>
          ))}
        </div>
        <span className="help-topic-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${activeTopicProgress})` }} />
        </span>
      </nav>

      <div className="help-sections">
        <section className="help-section" id="local-data" aria-labelledby="local-data-title" tabIndex={-1}>
          <div className="help-section-heading"><span>01</span><h2 id="local-data-title">本地数据与备份</h2></div>
          <div className="help-section-body">
            <p><strong>案例不会自动跟着你换设备。</strong>命盘、修订、笔记、事件、个人资料、文献、规则包和附件默认只保存在当前浏览器资料中；当前没有账号、服务器同步或自动云备份。</p>
            <ul>
              <li>清除站点数据、删除浏览器资料、重装系统或浏览器资料损坏，都可能让本机记录永久消失；无痕/隐私窗口不适合作为长期研究库。</li>
              <li>完整备份是<strong>未加密的敏感明文</strong>，可能包含出生资料、别名、笔记、事件、研究者资料和附件原始字节。只保存到可信位置，不要直接发到公开群聊或网盘共享链接。</li>
              <li>恢复、清空站点数据、迁移设备或升级重大版本前，先导出当前完整备份，并实际确认文件已经落盘且能够打开；“浏览器已触发下载”不等于文件一定保存成功。</li>
              <li>未来 Android APK 不会自动继承当前浏览器里的资料；从网页迁移到 APK 时，仍以完整备份的只读预检与恢复流程为边界。</li>
              <li>用于分享的单盘/双案例报告优先选择匿名模式；即使匿名，也要留意组合信息可能重新识别现实人物。</li>
            </ul>
            <div className="help-inline-actions">
              <AppLink href="/settings/data" className="secondary-action">导出或预检完整备份</AppLink>
            </div>
          </div>
        </section>

        <section className="help-section" id="offline" aria-labelledby="offline-title" tabIndex={-1}>
          <div className="help-section-heading"><span>02</span><h2 id="offline-title">离线与安装</h2></div>
          <div className="help-section-body">
            <p>生产版 PWA 在首次完整在线载入并由浏览器确认缓存后，可以离线打开已随应用打包的核心页面和本地研究资料。开发服务器、一次普通访问或“接受安装提示”都不能单独证明离线安装已经完成。</p>
            <ul>
              <li>离线发布验收范围包括基础排盘、规则切换、运限、案例检索、正式对照、知识检索、导入导出与完整备份；只有真实生产构建和目标设备记录成立后，才可声称对应发布已通过。尚未开放的在线地点搜索不会在离线时被伪装成可用。</li>
              <li>PWA 安装只是在设备上提供应用式入口，不会创建账号、上传资料或把数据同步到另一台设备。</li>
              <li>在线时浏览器仍可能向本应用站点检查并下载新版应用资源；这与云端保存你的案例是两回事。</li>
            </ul>
          </div>
        </section>

        <section className="help-section" id="rules" aria-labelledby="rules-title" tabIndex={-1}>
          <div className="help-section-heading"><span>03</span><h2 id="rules-title">规则、Revision 与证据</h2></div>
          <div className="help-section-body">
            <p>排盘结果取决于出生输入、时区数据、历法、真太阳时、换日口径和规则 Profile（规则配置）。不同口径得到不同结果并不一定代表程序随机；比较时必须同时核对输入与规则快照。</p>
            <ul>
              <li>每个 Revision 冻结当时的输入、规则、版本和结果摘要。修改设置或激活新规则包不会静默改写历史 Revision；需要变化时应从确切历史版本派生新 Revision。</li>
              <li>出生时辰未知时使用 CandidateSet 保留多个候选，不猜一个“最可能时辰”；需要性别方向而输入未指定时，页面要求人工明确顺逆。</li>
              <li>第三方规则包先进入本机隔离库，绝不因导入而自动激活；内容摘要只能证明文件没有变化，不能认证作者身份、专业资质或规则正确性。</li>
              <li>摘要一致、自动测试通过和两次复算相同，只证明指定实现可复现，不能代替权威历表、命理专家真值、来源真实性或现实审核身份。</li>
              <li>设置与诊断页的金标准总账、引擎、规则、时区数据库和 DB 版本是当前状态的权威入口；发布门未通过时，不应把工程候选称为已验证结论。</li>
            </ul>
            <div className="help-inline-actions">
              <AppLink href="/settings" className="secondary-action">查看规则、版本与金标总账</AppLink>
              <AppLink href="/compare" className="secondary-action">打开正式对照台</AppLink>
            </div>
          </div>
        </section>

        <section className="help-section" id="ai" aria-labelledby="ai-title" tabIndex={-1}>
          <div className="help-section-heading"><span>04</span><h2 id="ai-title">AI 能做什么、当前没做什么</h2></div>
          <div className="help-section-body">
            <div className="help-boundary-note">
              <BotOff aria-hidden="true" />
              <p><strong>应用内 AI Provider 外发保持关闭。</strong>默认 legacy-v13 没有可复核的 mutation epoch，因此命盘研读页不提供 DeepSeek API Key 或发送入口；它只允许你显式准备本机证据上下文、粘贴严格结构化的断言草稿，并在本机显示白名单内与规范证据逐字匹配的项目。</p>
            </div>
            <p>本机验证不会请求密钥、调用 Provider、传输命盘上下文或草稿、写入 Revision、数据库或 Web Storage，也不会展示 Provider 原始自由文本。验证模块按需加载时可能请求同源静态代码，这不等于用户数据外发。上下文不复制原始出生输入，但仍含派生四柱、规则和证据文本；用户若自行复制到应用之外，属于另一段由用户控制的数据处理。未来若要恢复 Provider 外发，仍须先补可用 mutation epoch、紧邻发送的 Revision/摘要重验、结构化响应适配和逐次第三方处理授权。</p>
          </div>
        </section>

        <section className="help-section" id="responsible-use" aria-labelledby="responsible-use-title" tabIndex={-1}>
          <div className="help-section-heading"><span>05</span><h2 id="responsible-use-title">负责任地使用</h2></div>
          <div className="help-section-body">
            <p>这是八字学习与研究工具，不是医学、心理危机、法律、财务或人身安全决策系统。不要用命理推演替代相关专业判断，也不要把结果当作对一个人的能力、品格或未来的确定判决。</p>
            <ul>
              <li><strong>首版公开使用建议 18+，不为未成年人建立个性化命理档案。</strong>如果未来明确服务未成年人，必须先做独立的内容、数据与交互评估。</li>
              <li>录入其他成年人的出生资料前，应取得明确同意并尽量减少可识别信息；研究结束后及时匿名化、备份或删除。</li>
              <li>不要把结果用于招聘、录取、保险、信贷、医疗安排等会实质影响他人权益的筛选或歧视性决定。</li>
              <li>涉及自伤、暴力、重病、重大财务损失或法律风险时，应联系现实中的专业机构与可信任的人，而不是等待排盘结论。</li>
            </ul>
          </div>
        </section>

        <section className="help-section" id="recovery" aria-labelledby="recovery-title" tabIndex={-1}>
          <div className="help-section-heading"><span>06</span><h2 id="recovery-title">异常时先做什么</h2></div>
          <div className="help-section-body">
            <ol className="help-recovery-steps">
              <li><strong>先停止写入。</strong>不要立刻清除站点数据、卸载 PWA、删除浏览器资料或反复导入同一备份。</li>
              <li><strong>能打开数据管理页时，先导出完整安全备份。</strong>把故障前的原始文件另存一份，不要覆盖唯一副本。</li>
              <li><strong>再导出诊断 JSON。</strong>诊断包含应用、引擎、规则摘要、时区、数据库和浏览器信息，不应包含出生资料、别名或笔记；但数据库名等用户可命名的环境标签仍可能泄露信息，分享前必须自行检查。</li>
              <li><strong>记录复现条件。</strong>保留页面网址、发生时间、操作步骤、浏览器/系统版本和错误画面；敏感案例内容先打码。</li>
            </ol>
            <div className="help-inline-actions">
              <AppLink href="/settings/data" className="primary-action">先做完整备份</AppLink>
              <AppLink href="/settings" className="secondary-action">导出诊断 JSON</AppLink>
            </div>
          </div>
        </section>
      </div>

      <section className="help-system help-anchor-section" id="system" aria-labelledby="help-system-title" tabIndex={-1}>
        <div>
          <p className="eyebrow">Current shell identity</p>
          <h2 id="help-system-title">当前应用壳身份</h2>
          <p>这些值直接来自当前运行构建，用于判断备份与复现环境；完整摘要仍以设置页导出的诊断为准。</p>
        </div>
        <dl>
          <div><dt>应用版本</dt><dd>{APP_VERSION}</dd></div>
          <div><dt>发布身份</dt><dd>{CURRENT_RELEASE_DATABASE.dbGeneration}</dd></div>
          <div><dt>本地数据库</dt><dd>Dexie {CURRENT_RELEASE_DATABASE.targetSchema}</dd></div>
          <div><dt>迁移任务</dt><dd>{CURRENT_RELEASE_DATABASE.migrationId ?? "null"}</dd></div>
          <div><dt>发布证据</dt><dd>{CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceBound && CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceId ? CURRENT_RELEASE_ENGINEERING_IDENTITY.evidenceId : "未绑定正式证据"}</dd></div>
          <div><dt>完整备份</dt><dd>full {FULL_BACKUP_FORMAT_VERSION}</dd></div>
          <div><dt>时区数据</dt><dd>IANA {RUNTIME_TIME_ZONE_DATABASE.ianaVersion}</dd></div>
          <div><dt>账号 / 云同步</dt><dd>未接入</dd></div>
          <div><dt>AI Provider</dt><dd>未接入 · 仅本机结构化草稿验证</dd></div>
        </dl>
      </section>

      <section className="help-faq help-anchor-section" id="faq" aria-labelledby="help-faq-title" tabIndex={-1}>
        <p className="eyebrow">Quick answers</p>
        <h2 id="help-faq-title">常见问题</h2>
        <details><summary>换浏览器、换手机或安装未来 APK 后，原案例会自动出现吗？</summary><p>不会。当前没有账号或云同步，未来 Android APK 也不会自动继承浏览器资料；请在原环境导出完整备份，再在新环境只读预检并按安全确认流程恢复。</p></details>
        <details><summary>完整备份有密码或加密吗？</summary><p>没有。当前 full {FULL_BACKUP_FORMAT_VERSION} ZIP/JSON 是未加密敏感明文，应像保管原始研究档案一样保管。</p></details>
        <details><summary>规则包激活后，旧命盘会自动重算吗？</summary><p>不会。旧 Revision 保留原规则快照；要研究新口径，应从确切历史 Revision 派生新版并通过对照台比较。</p></details>
        <details><summary>为什么结果可复现，仍然写着“研究预览”？</summary><p>可复现只说明同一输入、版本和规则会得到同一工程结果；权威来源、专家真值、跨实现差分和现实审核身份仍需独立证据。</p></details>
        <details><summary>页面显示“已准备”，是否代表备份或报告已经保存？</summary><p>不代表。“已准备”只说明当前会话冻结了待交付字节；只有下载、保存或打印流程明确返回，并且你在目标位置确认文件存在、大小合理且能够打开，才能把它记为已交付。</p></details>
        <details><summary>导入或删除调用结果未知时，可以直接重试吗？</summary><p>不要直接重试。先停止同类写入，保留原始文件与回执，再使用页面提供的只读重核或数据管理入口确认当前事实；未知提交不能凭错误提示推断为成功或失败。</p></details>
      </section>

      <section className="help-appendix help-anchor-section" id="appendix" aria-labelledby="help-appendix-title" tabIndex={-1}>
        <header className="help-appendix-heading">
          <div>
            <p className="eyebrow">Research appendix</p>
            <h2 id="help-appendix-title">研究体系与内容总目录</h2>
          </div>
          <p>以下是路线与来源清单，不是功能承诺。只有带真实入口的体系能够进入当前应用工作台，其余状态继续按隔离预览或计划项展示。</p>
        </header>
        <ResearchSystemRoadmap />
        <ResearchContentCatalog />
      </section>

      <a
        className="help-back-to-top"
        href="#help-page-top"
        onClick={() => {
          window.requestAnimationFrame(() => {
            document.getElementById("help-page-top")?.focus({ preventScroll: true });
          });
        }}
      >
        <span><small>End of guide</small><strong>返回帮助页顶部</strong></span>
        <ArrowUp aria-hidden="true" />
      </a>
    </div>
  );
}
