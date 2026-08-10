import {
  ArrowRight,
  BotOff,
  DatabaseBackup,
  ShieldCheck
} from "lucide-react";
import { FULL_BACKUP_FORMAT_VERSION } from "@hakimi/contracts";
import { RUNTIME_TIME_ZONE_DATABASE } from "@hakimi/time-core";
import { PageHeading } from "../components/page-heading";
import { ResearchSystemRoadmap } from "../components/research-system-roadmap";
import { StatusPill } from "../components/status-pill";
import { APP_VERSION } from "../lib/app-version";
import { CURRENT_RELEASE_DATABASE } from "../lib/current-release";
import { AppLink } from "../lib/router";

const helpTopics = [
  { id: "local-data", label: "本地数据" },
  { id: "offline", label: "离线与安装" },
  { id: "rules", label: "规则与证据" },
  { id: "ai", label: "AI 边界" },
  { id: "responsible-use", label: "使用边界" },
  { id: "recovery", label: "异常恢复" }
] as const;

export function HelpPage() {
  return (
    <div className="page page--help">
      <PageHeading
        eyebrow="Help and boundaries"
        title="帮助与安全边界"
        description="先弄清数据保存在哪里、哪些结论仍待验证，以及出现异常时该保留什么。这里说明当前版本真实具备的能力，不把未来计划写成现成功能。"
        actions={(
          <AppLink href="/settings/data" className="primary-action">
            <DatabaseBackup aria-hidden="true" />检查完整备份
          </AppLink>
        )}
      />

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
        <ol className="help-first-steps">
          <li><span><strong>用演示值排盘</strong><small>先熟悉时间、规则、Revision（修订快照）与 CandidateSet（候选组）。</small></span><AppLink href="/new?demo=1">打开演示排盘<ArrowRight aria-hidden="true" /></AppLink></li>
          <li><span><strong>确认输入语义</strong><small>公历/农历、地点、时区、换日与真太阳时都会影响结果。</small></span></li>
          <li><span><strong>导出完整备份</strong><small>真实录入后尽早保存 full {FULL_BACKUP_FORMAT_VERSION} 文件并确认能打开。</small></span><AppLink href="/settings/data">前往数据管理<ArrowRight aria-hidden="true" /></AppLink></li>
          <li><span><strong>记住证据边界</strong><small>工程复算一致不等于专家真值，当前状态以设置页总账为准。</small></span><AppLink href="/settings">查看版本与诊断<ArrowRight aria-hidden="true" /></AppLink></li>
        </ol>
      </section>

      <ResearchSystemRoadmap />

      <nav className="help-topic-nav" aria-label="帮助主题">
        {helpTopics.map((topic) => <a key={topic.id} href={`#${topic.id}`}>{topic.label}</a>)}
      </nav>

      <div className="help-sections">
        <section className="help-section" id="local-data" aria-labelledby="local-data-title">
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

        <section className="help-section" id="offline" aria-labelledby="offline-title">
          <div className="help-section-heading"><span>02</span><h2 id="offline-title">离线与安装</h2></div>
          <div className="help-section-body">
            <p>生产版 PWA 在首次完整在线载入并由浏览器确认缓存后，可以离线打开已随应用打包的核心页面和本地研究资料。开发服务器、一次普通访问或“接受安装提示”都不能单独证明离线安装已经完成。</p>
            <ul>
              <li>离线发布验收覆盖基础排盘、规则切换、运限、案例检索、正式对照、知识检索、导入导出与完整备份；这些能力只使用本地资料和随包资源。尚未开放的在线地点搜索不会在离线时被伪装成可用。</li>
              <li>PWA 安装只是在设备上提供应用式入口，不会创建账号、上传资料或把数据同步到另一台设备。</li>
              <li>在线时浏览器仍可能向本应用站点检查并下载新版应用资源；这与云端保存你的案例是两回事。</li>
            </ul>
          </div>
        </section>

        <section className="help-section" id="rules" aria-labelledby="rules-title">
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

        <section className="help-section" id="ai" aria-labelledby="ai-title">
          <div className="help-section-heading"><span>04</span><h2 id="ai-title">AI 能做什么、当前没做什么</h2></div>
          <div className="help-section-body">
            <div className="help-boundary-note">
              <BotOff aria-hidden="true" />
              <p><strong>当前版本没有接入 AI Provider、远程模型解读或 AI 对话。</strong>核心排盘、运限、检索、对照、笔记和备份不依赖 AI，也不会为了生成解释而上传出生资料。</p>
            </div>
            <p>未来若增加 AI，它只能作为可关闭的语言解释层：必须在发送前说明服务商、联网状态和字段范围；项目密钥不得打包进 Web/PWA 或未来 APK，也不得进入完整备份；输出必须引用已冻结事实与来源，不得重算四柱、改写 Revision、把概率语言包装成确定事实，或在没有 Provider 时阻断现有研究闭环。</p>
          </div>
        </section>

        <section className="help-section" id="responsible-use" aria-labelledby="responsible-use-title">
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

        <section className="help-section" id="recovery" aria-labelledby="recovery-title">
          <div className="help-section-heading"><span>06</span><h2 id="recovery-title">异常时先做什么</h2></div>
          <div className="help-section-body">
            <ol className="help-recovery-steps">
              <li><strong>先停止写入。</strong>不要立刻清除站点数据、卸载 PWA、删除浏览器资料或反复导入同一备份。</li>
              <li><strong>能打开数据管理页时，先导出完整安全备份。</strong>把故障前的原始文件另存一份，不要覆盖唯一副本。</li>
              <li><strong>再导出诊断 JSON。</strong>诊断包含应用、引擎、规则摘要、时区、数据库和浏览器信息，不应包含出生资料、别名或笔记；分享前仍请自行检查。</li>
              <li><strong>记录复现条件。</strong>保留页面网址、发生时间、操作步骤、浏览器/系统版本和错误画面；敏感案例内容先打码。</li>
            </ol>
            <div className="help-inline-actions">
              <AppLink href="/settings/data" className="primary-action">先做完整备份</AppLink>
              <AppLink href="/settings" className="secondary-action">导出诊断 JSON</AppLink>
            </div>
          </div>
        </section>
      </div>

      <section className="help-system" aria-labelledby="help-system-title">
        <div>
          <p className="eyebrow">Current shell identity</p>
          <h2 id="help-system-title">当前应用壳身份</h2>
          <p>这些值直接来自当前运行构建，用于判断备份与复现环境；完整摘要仍以设置页导出的诊断为准。</p>
        </div>
        <dl>
          <div><dt>应用版本</dt><dd>{APP_VERSION}</dd></div>
          <div><dt>本地数据库</dt><dd>Dexie {CURRENT_RELEASE_DATABASE.targetSchema}</dd></div>
          <div><dt>完整备份</dt><dd>full {FULL_BACKUP_FORMAT_VERSION}</dd></div>
          <div><dt>时区数据</dt><dd>IANA {RUNTIME_TIME_ZONE_DATABASE.ianaVersion}</dd></div>
          <div><dt>账号 / 云同步</dt><dd>未接入</dd></div>
          <div><dt>AI Provider</dt><dd>未接入</dd></div>
        </dl>
      </section>

      <section className="help-faq" aria-labelledby="help-faq-title">
        <p className="eyebrow">Quick answers</p>
        <h2 id="help-faq-title">常见问题</h2>
        <details><summary>换浏览器、换手机或安装未来 APK 后，原案例会自动出现吗？</summary><p>不会。当前没有账号或云同步，未来 Android APK 也不会自动继承浏览器资料；请在原环境导出完整备份，再在新环境只读预检并按安全确认流程恢复。</p></details>
        <details><summary>完整备份有密码或加密吗？</summary><p>没有。当前 full {FULL_BACKUP_FORMAT_VERSION} ZIP/JSON 是未加密敏感明文，应像保管原始研究档案一样保管。</p></details>
        <details><summary>规则包激活后，旧命盘会自动重算吗？</summary><p>不会。旧 Revision 保留原规则快照；要研究新口径，应从确切历史 Revision 派生新版并通过对照台比较。</p></details>
        <details><summary>为什么结果可复现，仍然写着“研究预览”？</summary><p>可复现只说明同一输入、版本和规则会得到同一工程结果；权威来源、专家真值、跨实现差分和现实审核身份仍需独立证据。</p></details>
      </section>
    </div>
  );
}
