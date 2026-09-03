import {
  PILOT_AUTHORITY_BOUNDARY,
  PILOT_PACK_ID,
  PILOT_PRIVACY_BOUNDARY,
  PilotContractError,
  assertPilotDraftExportable,
  buildFinalArtifacts,
  collectFinalizeErrors,
  createPilotSessionContext,
  createPilotDraft,
  parsePilotDraft,
  serializeUtf8Json
} from "./contract.js";
import {
  FACT_ASSESSMENTS,
  HIGH_RISK_DISPOSITIONS,
  INVALIDATION_STRUCTURES,
  OVERALL_QUESTIONS,
  RULE_POSITIONS
} from "./data/questions.js";
import { SCENARIO_BY_ID, SEAT_ORDERS } from "./data/scenarios.js";

const root = document.querySelector("#app");
const seatId = document.body.dataset.seat;
if (!(root instanceof HTMLElement) || !["A", "B"].includes(seatId)) {
  throw new Error("pilot entry identity invalid");
}

const query = new URLSearchParams(window.location.search);
const queryReviewCycleId = query.get("reviewCycleId");
const queryPackageManifestRawSha256 = query.get("packageManifestRawSha256");
if ((queryReviewCycleId === null) !== (queryPackageManifestRawSha256 === null)) {
  throw new Error("pilot session binding incomplete");
}
const sessionContext = createPilotSessionContext(queryReviewCycleId === null ? undefined : {
  reviewCycleId: queryReviewCycleId,
  packageManifestRawSha256: queryPackageManifestRawSha256
});
const cycleDisplay = sessionContext.bindingMode === "physical_seat_package"
  ? `本轮交接号 …${sessionContext.reviewCycleId.slice(-10)}`
  : "开发预览 · 未分配交接轮次";

let draft = await createPilotDraft(seatId, sessionContext);
let artifacts = null;
let currentSectionIndex = 0;
let mobileNavigationOpen = false;
let finalizeErrors = [];
let completePackageDownloadRequested = false;
let statusMessage = "答卷尚未保存；直接刷新或关闭页面会丢失当前内容。";

const SECTION_IDS = Object.freeze([
  "intro",
  ...SEAT_ORDERS[seatId],
  "overall",
  "usability",
  "export"
]);

const SECTION_LABELS = Object.freeze({
  intro: "开始试填",
  P01: "极弱规则测试",
  P02: "极强与特殊结构",
  P03: "月令主气去重",
  P04: "时柱不确定影响",
  P05: "分档临界值测试",
  overall: "四个总体问题",
  usability: "使用感受",
  export: "核对并保存"
});

const icon = (name) => {
  const paths = {
    save: '<path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-8h8v8"/>',
    warning: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 8v5M12 17h.01"/>',
    document: '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/>',
    folder: '<path d="M3 6h7l2 2h9v12H3z"/>',
    clipboard: '<path d="M8 5h8M9 3h6v4H9z"/><path d="M6 5H4v17h16V5h-2M8 12h8M8 16h8"/>',
    message: '<path d="M3 4h18v14H8l-5 4z"/><path d="M8 9h8M8 13h6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>'
  };
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
};

root.innerHTML = `
  <div class="pilot-shell" data-seat="${seatId}">
    <header class="app-header">
      <h1>八字规则复核试填</h1>
      <div class="local-only-mark">${icon("save")}<span>工具不主动上传</span></div>
    </header>
    <aside class="pilot-banner" role="note">
      ${icon("warning")}
      <strong>这里只检查题目是否清楚，不作为正式专家审定意见</strong>
    </aside>
    <button class="mobile-nav-toggle" type="button" aria-expanded="false" aria-controls="pilot-navigation">
      ${icon("menu")}<span>说明 / 5 个合成场景 / 4 个总体问题 / 使用感受 / 核对保存</span><span aria-hidden="true">⌄</span>
    </button>
    <div class="workspace-grid">
      <aside class="left-rail" id="pilot-navigation"></aside>
      <main class="review-main" id="review-main" tabindex="-1"></main>
      <aside class="right-rail" aria-label="审阅进度与本页操作"></aside>
    </div>
    <footer class="app-footer">仅供试填 · 不作为正式审定或准确度结论</footer>
    <div class="mobile-actions" aria-label="移动端页面操作"></div>
    <input id="draft-import-input" class="visually-hidden" type="file" accept="application/json,.json">
    <p id="app-live-status" class="visually-hidden" aria-live="polite"></p>
  </div>`;

const leftRail = root.querySelector(".left-rail");
const rightRail = root.querySelector(".right-rail");
const main = root.querySelector("#review-main");
const mobileActions = root.querySelector(".mobile-actions");
const mobileToggle = root.querySelector(".mobile-nav-toggle");
const importInput = root.querySelector("#draft-import-input");
const liveStatus = root.querySelector("#app-live-status");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAtPath(path) {
  return path.split(".").reduce((value, key) => value?.[key], draft);
}

function setAtPath(path, value) {
  if (artifacts) return;
  const parts = path.split(".");
  const last = parts.pop();
  const owner = parts.reduce((value, key) => value[key], draft);
  owner[last] = value;
}

function downloadText(filename, text, mediaType = "application/json;charset=utf-8") {
  const blob = new Blob([text], { type: mediaType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function announce(message) {
  statusMessage = message;
  if (liveStatus) liveStatus.textContent = message;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sectionIcon(sectionId) {
  if (sectionId === "intro") return "document";
  if (sectionId.startsWith("P")) return "folder";
  if (sectionId === "overall") return "clipboard";
  if (sectionId === "usability") return "message";
  return "download";
}

function isNonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function scenarioComplete(scenarioId) {
  const response = draft.caseResponses[scenarioId];
  return Boolean(
    response.factAssessment
    && response.rulePosition
    && isNonEmpty(response.reason)
    && isNonEmpty(response.applicabilityConditions)
    && isNonEmpty(response.counterexamples)
    && response.invalidationStructures.length
    && response.highRiskDisposition
    && isNonEmpty(response.revisionSuggestion)
  );
}

function completedScenarioCount() {
  return Object.keys(SCENARIO_BY_ID).filter(scenarioComplete).length;
}

function overallQuestionComplete(questionId) {
  const response = draft.overallResponses[questionId];
  return Boolean(
    response.position
    && isNonEmpty(response.expertOriginalText)
    && isNonEmpty(response.rationale)
    && isNonEmpty(response.uncertainties)
  );
}

function completedOverallQuestionCount() {
  return OVERALL_QUESTIONS.filter((question) => overallQuestionComplete(question.id)).length;
}

function usabilityComplete() {
  return Boolean(
    draft.usabilityFeedback.clarityRating
    && isNonEmpty(draft.usabilityFeedback.difficultTerms)
    && isNonEmpty(draft.usabilityFeedback.workflowComments)
  );
}

function sectionComplete(sectionId) {
  if (sectionId.startsWith("P")) return scenarioComplete(sectionId);
  if (sectionId === "overall") return completedOverallQuestionCount() === OVERALL_QUESTIONS.length;
  if (sectionId === "usability") return usabilityComplete();
  return sectionId === "export" && artifacts !== null;
}

function renderNavigation() {
  const items = SECTION_IDS.map((sectionId, index) => {
    const active = index === currentSectionIndex;
    const complete = sectionComplete(sectionId);
    return `<li>
      <button type="button" data-nav-index="${index}" ${active ? 'aria-current="page"' : ""}>
        ${icon(sectionIcon(sectionId))}<span>${SECTION_LABELS[sectionId]}</span>
        ${complete ? `<span class="nav-check" aria-label="已完成">${icon("check")}</span>` : ""}
        ${active ? icon("chevron") : ""}
      </button>
    </li>`;
  }).join("");
  leftRail.innerHTML = `<nav aria-label="试填步骤"><ol>${items}</ol></nav>`;
  leftRail.hidden = !mobileNavigationOpen && matchMedia("(max-width: 760px)").matches;
  leftRail.querySelectorAll("[data-nav-index]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(Number(button.dataset.navIndex)));
  });
}

function currentScenarioOrdinal() {
  const sectionId = SECTION_IDS[currentSectionIndex];
  const index = SEAT_ORDERS[seatId].indexOf(sectionId);
  return index < 0 ? null : index + 1;
}

function renderRightRail() {
  const completeScenarios = completedScenarioCount();
  const completeOverall = completedOverallQuestionCount();
  const completeUsability = usabilityComplete();
  const answerProgress = completeScenarios + completeOverall + (completeUsability ? 1 : 0);
  const previousDisabled = currentSectionIndex === 0;
  const nextDisabled = currentSectionIndex === SECTION_IDS.length - 1;
  rightRail.innerHTML = `
    <section class="rail-section">
      <h2>答题进度</h2>
      <strong class="progress-number">${answerProgress} / 10</strong>
      <p>当前：${SECTION_LABELS[SECTION_IDS[currentSectionIndex]]}</p>
      <progress max="10" value="${answerProgress}">${answerProgress}/10</progress>
      <ul class="progress-breakdown">
        <li>合成场景 ${completeScenarios} / 5</li>
        <li>总体问题 ${completeOverall} / 4</li>
        <li>使用感受 ${completeUsability ? "已完成" : "待填写"}</li>
      </ul>
    </section>
    <section class="rail-section">
      <h2>本机草稿状态</h2>
      <p class="local-state">${icon(artifacts ? "check" : "save")}<strong>${artifacts ? (completePackageDownloadRequested ? "协调人已发起文件保存" : "答卷已锁定，尚未保存") : "尚未保存"}</strong></p>
      <p>${escapeHtml(statusMessage)}</p>
      <details class="rail-coordinator"><summary>协调人操作</summary><button class="button button-secondary" type="button" data-action="import-draft" ${artifacts ? "disabled" : ""}>恢复暂存答卷</button></details>
    </section>
    <section class="rail-section">
      <h2>跳转页面</h2>
      <button class="button button-secondary" type="button" data-action="previous" ${previousDisabled ? "disabled" : ""}>上一页</button>
      <button class="button button-secondary" type="button" data-action="next" ${nextDisabled ? "disabled" : ""}>下一页：${nextDisabled ? "已到末页" : SECTION_LABELS[SECTION_IDS[currentSectionIndex + 1]]}</button>
      <button class="button button-secondary" type="button" data-action="list">回到开始说明</button>
    </section>
    <section class="rail-section rail-primary-actions">
      <h2>本页操作</h2>
      <button class="button button-primary" type="button" data-action="export-page">核对并保存</button>
    </section>`;
  bindActionButtons(rightRail);
}

function renderMobileActions() {
  const nextDisabled = currentSectionIndex === SECTION_IDS.length - 1;
  const mobileSaveWarning = completePackageDownloadRequested
    ? "协调人已发起保存；关闭前仍请确认文件确实存在。"
    : artifacts
      ? "答卷已锁定但尚未保存；现在关闭仍会丢失内容。"
      : "尚未由协调人保存时，直接刷新或关闭会丢失内容。";
  mobileActions.innerHTML = `
    <p class="mobile-memory-warning">${mobileSaveWarning}</p>
    <button class="button button-secondary" type="button" data-action="export-page">核对并保存</button>
    <button class="button button-primary" type="button" data-action="next" ${nextDisabled ? "disabled" : ""}>${nextDisabled ? "已到末页" : `下一页 ${SECTION_LABELS[SECTION_IDS[currentSectionIndex + 1]]}`}</button>`;
  bindActionButtons(mobileActions);
}

function renderIntro() {
  main.innerHTML = `
    <article class="section-card intro-card">
      <header class="section-heading">
        <div><h2>开始试填</h2><p>您正在填写一份独立答卷；全部题目都是人工构造的场景。</p></div>
        <span class="seat-mark" aria-label="当前为独立答卷">独立填写</span>
      </header>
      <div class="boundary-panel">
        <h3>您只需完成三件事</h3>
        <p>这不是在比较您和 AI 谁更准，而是请您指出规则是否合理、在什么条件下成立，以及哪些例外不能忽略。</p>
        <ol>
          <li>查看五个合成场景，判断其中的命盘事实和当前规则。</li>
          <li>写下依据、成立条件、反例和修改建议；无法判断可以直接选择“无法判断”。</li>
          <li>最后通读答卷并锁定内容，再请协调人保存文件。</li>
        </ol>
        <p><strong>不需要懂 AI 或代码。</strong>如果不方便打字，可以口述，由协调人逐字录入；锁定前请您亲自核对。</p>
      </div>
      <details class="export-summary"><summary>协调人信息（专家无需处理）</summary><p>内部采用两份相互独立的答卷；当前为 ${seatId} 份 · ${cycleDisplay}。本工具不会显示另一份答卷的状态或意见。</p></details>
      <fieldset class="acknowledgement-list">
        <legend>开始前确认</legend>
        ${checkboxField("acknowledgements.pilotOnly", "我理解这只是题目试填，不作为正式专家审定意见。")} 
        ${checkboxField("acknowledgements.syntheticOnly", "我理解五项均为人工构造的测试场景，没有对应真人。")} 
      </fieldset>
      <section class="self-description" aria-labelledby="self-description-title">
        <h3 id="self-description-title">自述流派与复核范围</h3>
        <p class="field-help">只写流派、方法和本次能判断的范围。禁止填写姓名、机构、联系方式、证件或可识别身份的信息。</p>
        ${textareaField("reviewerSelfDescription.selfDescribedTradition", "自述流派 / 传统", "例如：子平旺衰；若无固定流派，请如实说明", 1000)}
        ${textareaField("reviewerSelfDescription.selfDescribedScope", "本次可复核范围", "说明您能判断和不能判断的范围", 2000)}
      </section>
    </article>`;
  hydrateBoundControls(main);
}

function checkboxField(path, label) {
  return `<label class="check-row"><input type="checkbox" data-bind="${path}"><span>${escapeHtml(label)}</span></label>`;
}

function textareaField(path, label, placeholder, maxLength = 4000, help = "") {
  const id = `field-${path.replaceAll(".", "-")}`;
  return `<label class="field-stack" for="${id}">
    <span>${escapeHtml(label)}</span>
    ${help ? `<small>${escapeHtml(help)}</small>` : ""}
    <textarea id="${id}" data-bind="${path}" data-field-path="${path}" maxlength="${maxLength}" placeholder="${escapeHtml(placeholder)}" ${artifacts ? "disabled" : ""}></textarea>
    <small class="character-count" data-count-for="${path}">0 / ${maxLength}</small>
  </label>`;
}

function radioGroup(path, legend, options) {
  return `<fieldset class="radio-field" data-field-path="${path}">
    <legend>${escapeHtml(legend)}</legend>
    <div class="radio-options">${options.map((option) => `<label><input type="radio" name="${path}" value="${option.value}" data-bind="${path}" ${artifacts ? "disabled" : ""}><span>${escapeHtml(option.label)}</span></label>`).join("")}</div>
  </fieldset>`;
}

function renderPillars(scenario) {
  return `<div class="pillar-grid" role="table" aria-label="${scenario.id} 合成四柱事实">
    ${scenario.pillars.map((pillar) => `<div role="columnheader">${escapeHtml(pillar.label)}</div>`).join("")}
    ${scenario.pillars.map((pillar, index) => `<div role="cell" ${!scenario.includeHour && index === 3 ? 'data-withheld="true"' : ""}>${escapeHtml(pillar.value)}${!scenario.includeHour && index === 3 ? "（未计入）" : ""}</div>`).join("")}
  </div>`;
}

function renderFactorLedger(scenario) {
  return `<details class="section-card ledger-card">
    <summary class="ledger-summary"><span>查看当前计算明细（可选）</span><small>需要核对分值或具体项目时再展开</small></summary>
    <div class="ledger-content">
    <header class="subsection-heading"><h3 id="ledger-title-${scenario.id}">当前计算明细</h3><p>标为“未计入”的项目只供参考。</p></header>
    <div class="table-scroll" tabindex="0" role="region" aria-label="${scenario.id} 当前计算明细，可横向滚动">
      <table class="factor-table">
        <thead><tr><th>编号</th><th>要素描述</th><th>所属位置</th><th>为什么列出</th><th>作用方向</th><th>当前分值</th><th>是否采用</th></tr></thead>
        <tbody>${scenario.factors.map((factor) => `<tr ${factor.active ? "" : 'data-excluded="true"'}>
          <td>${factor.id}</td><td>${escapeHtml(factor.description)}</td><td>${escapeHtml(factor.source)}</td>
          <td>${escapeHtml(factor.evidence)}</td><td>${escapeHtml(factor.side)}</td>
          <td>${factor.active ? factor.appliedWeight : `${factor.weight} → 0`}</td>
          <td>${factor.active ? (factor.keyFactor ? "关键" : "计入") : "未计入"}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
    <footer class="ledger-footer"><strong>助身侧 ${scenario.totals.support} / 泄耗克侧 ${scenario.totals.demand} / ${scenario.totals.ratioPercent}%</strong><span>${escapeHtml(scenario.totals.band)}</span></footer>
    <p class="ledger-explanation">这里只表示当前计算的两侧，不代表吉凶、喜忌或正式个案结论。</p>
    <details><summary>展开条件变化与边界</summary>
      <dl class="comparison-list">${scenario.comparisons.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("")}</dl>
      <p>${escapeHtml(scenario.notice)}</p>
      <p class="technical-source">内部测试来源（协调人用）：${escapeHtml(scenario.vectorSource)}</p>
    </details>
    </div>
  </details>`;
}

function renderStructureChecks(scenarioId) {
  const path = `caseResponses.${scenarioId}.invalidationStructures`;
  return `<fieldset class="structure-field" data-field-path="${path}"><legend>可能使结论失效的结构</legend>
    <p class="field-help">至少选择一项；“无”或“无法判断”不能与其他项同时选择。</p>
    <div class="check-grid">${INVALIDATION_STRUCTURES.map((structure) => `<label><input type="checkbox" data-array-bind="${path}" value="${structure}" ${artifacts ? "disabled" : ""}><span>${structure}</span></label>`).join("")}</div>
  </fieldset>`;
}

function renderRiskSelect(scenarioId) {
  const path = `caseResponses.${scenarioId}.highRiskDisposition`;
  return `<label class="field-stack" for="risk-${scenarioId}"><span>这类结论应怎样呈现</span>
    <select id="risk-${scenarioId}" data-bind="${path}" data-field-path="${path}" ${artifacts ? "disabled" : ""}>
      <option value="">请选择</option>${HIGH_RISK_DISPOSITIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join("")}
    </select></label>`;
}

function renderScenario(scenarioId) {
  const scenario = SCENARIO_BY_ID[scenarioId];
  main.innerHTML = `
    <article class="scenario-page" aria-labelledby="scenario-title-${scenarioId}">
      <section class="section-card scenario-summary">
        <header class="section-heading"><div><h2 id="scenario-title-${scenarioId}">${escapeHtml(scenario.title)}</h2><p>合成场景 ${scenarioId.slice(0, 1)}-${scenarioId.slice(1)}</p></div><span class="scenario-index">${currentScenarioOrdinal()} / 5</span></header>
        <p class="scenario-meta"><strong>人工构造场景</strong><span>无对应真人</span><span>${scenario.isCurrentFormalOutput ? "" : "仅供试填"}</span></p>
        ${renderPillars(scenario)}
        <aside class="plain-note" role="note"><strong>请判断：</strong>${escapeHtml(scenario.reviewQuestion)}</aside>
        <p class="scenario-description">${escapeHtml(scenario.summary)}</p>
        <p class="scenario-notice">${escapeHtml(scenario.notice)}</p>
      </section>
      <div class="scenario-workspace">
        ${renderFactorLedger(scenario)}
        <section class="section-card response-card" aria-labelledby="response-title-${scenarioId}">
          <header class="subsection-heading"><h3 id="response-title-${scenarioId}">请填写您的判断</h3><p>只需按您的专业理解作答；没有补充时请填写“无”。</p></header>
          <button class="button button-secondary fill-none-button" type="button" data-action="fill-empty-scenario" data-scenario-id="${scenarioId}" ${artifacts ? "disabled" : ""}>本场景没有补充内容：将空白文字栏填为“无”</button>
          ${radioGroup(`caseResponses.${scenarioId}.factAssessment`, "1. 命盘事实是否正确", FACT_ASSESSMENTS)}
          ${radioGroup(`caseResponses.${scenarioId}.rulePosition`, "2. 对当前规则的意见", RULE_POSITIONS)}
          ${textareaField(`caseResponses.${scenarioId}.reason`, "理由（请说明判断依据）", "可以口述给协调人；请说明为何同意或不同意", 4000)}
          ${textareaField(`caseResponses.${scenarioId}.applicabilityConditions`, "成立条件", "说明该判断适用的条件或边界", 4000)}
          ${textareaField(`caseResponses.${scenarioId}.counterexamples`, "反例", "列出能推翻或削弱本场景结论的情形", 4000)}
          ${renderStructureChecks(scenarioId)}
          <div class="two-column-fields">${renderRiskSelect(scenarioId)}${textareaField(`caseResponses.${scenarioId}.revisionSuggestion`, "修改建议", "给出具体修改建议；没有请填写“无”", 4000)}</div>
        </section>
      </div>
    </article>`;
  hydrateBoundControls(main);
  bindActionButtons(main);
}

function renderOverall() {
  main.innerHTML = `
    <article class="section-card overall-page">
      <header class="section-heading"><div><h2>四个总体问题</h2><p>请按您的专业理解逐题回答；无法判断可以明确写出。</p></div></header>
      <aside class="plain-note" role="note">请保留您的原始措辞。工具只做结构化保存，不概括、不润色、不替您选择立场。</aside>
      <div class="overall-questions">${OVERALL_QUESTIONS.map((question, index) => {
        const prefix = `overallResponses.${question.id}`;
        return `<section class="overall-question" aria-labelledby="overall-${question.id}">
         <header><span>${String(index + 1).padStart(2, "0")}</span><div><h3 id="overall-${question.id}">${escapeHtml(question.title)}</h3><p>${escapeHtml(question.question)}</p></div></header>
          ${radioGroup(`${prefix}.position`, "总体意见", RULE_POSITIONS)}
          <button class="button button-secondary fill-none-button" type="button" data-action="fill-empty-overall" data-question-id="${question.id}" ${artifacts ? "disabled" : ""}>本题没有补充内容：将空白说明栏填为“无”</button>
          ${textareaField(`${prefix}.expertOriginalText`, "专家原文", "请直接写下您的原始意见", 4000)}
          ${textareaField(`${prefix}.rationale`, "理由", "说明依据、条件与案例联系", 4000)}
          ${textareaField(`${prefix}.uncertainties`, "不确定点", "无法确定的部分；没有请填写“无”", 4000)}
        </section>`;
      }).join("")}</div>
    </article>`;
  hydrateBoundControls(main);
  bindActionButtons(main);
}

function renderUsability() {
  main.innerHTML = `
    <article class="section-card usability-page">
      <header class="section-heading"><div><h2>使用感受</h2><p>这里只评价题目和页面是否好用，不会与您的规则意见混在一起。</p></div></header>
      <fieldset class="radio-field" data-field-path="usabilityFeedback.clarityRating"><legend>整体易懂程度</legend>
        <div class="rating-options">${[1, 2, 3, 4, 5].map((rating) => `<label><input type="radio" name="clarity" value="${rating}" data-bind="usabilityFeedback.clarityRating" ${artifacts ? "disabled" : ""}><span>${rating}<small>${rating === 1 ? "很难懂" : rating === 5 ? "很易懂" : ""}</small></span></label>`).join("")}</div>
      </fieldset>
      ${textareaField("usabilityFeedback.difficultTerms", "最难理解的词或页面", "请指出具体词语、表格或步骤；没有请填写“无”", 4000)}
      ${textareaField("usabilityFeedback.workflowComments", "流程建议", "哪些地方应删减、换词或重新排序；没有请填写“无”", 4000)}
    </article>`;
  hydrateBoundControls(main);
}

function sectionIdForPath(path) {
  const scenarioMatch = path.match(/^caseResponses\.(P\d{2})\./);
  if (scenarioMatch) return scenarioMatch[1];
  if (path.startsWith("overallResponses.")) return "overall";
  if (path.startsWith("usabilityFeedback.")) return "usability";
  if (["acknowledgements.noCrossOpinionAccess", "acknowledgements.privateOffRepositoryHandling"].includes(path)) return "export";
  return "intro";
}

function renderErrorSummary() {
  if (!finalizeErrors.length) return "";
  const groups = [];
  for (const error of finalizeErrors) {
    const sectionId = sectionIdForPath(error.path);
    let group = groups.find((item) => item.sectionId === sectionId);
    if (!group) {
      group = { sectionId, first: error, count: 0 };
      groups.push(group);
    }
    group.count += 1;
  }
  return `<section class="error-summary" role="alert" tabindex="-1"><h3>请先处理以下项目</h3><p>还有 ${finalizeErrors.length} 项未完成，已按页面归类：</p><ol>${groups.map((group) => `<li><button type="button" data-error-path="${escapeHtml(group.first.path)}"><strong>${escapeHtml(SECTION_LABELS[group.sectionId])}（${group.count} 项）</strong><span>${escapeHtml(group.first.message)}</span></button></li>`).join("")}</ol></section>`;
}

function renderExport() {
  const boundaryRows = Object.entries(PILOT_AUTHORITY_BOUNDARY).map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${String(value)}</dd></div>`).join("");
  const privacyRows = Object.entries(PILOT_PRIVACY_BOUNDARY).map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd></div>`).join("");
  main.innerHTML = `
    <article class="section-card export-page">
      <header class="section-heading"><div><h2>核对并保存</h2><p>${artifacts ? "答卷已锁定；当前页面及全部输入现为只读。锁定不等于文件已经保存。" : "锁定前会检查五个场景、四个总体问题和使用感受。"}</p></div></header>
      ${renderErrorSummary()}
      <details class="export-summary"><summary>协调人保存说明（专家无需处理）</summary>
        <h3>固定技术边界</h3><dl>${boundaryRows}</dl>
        <h3>隐私与保存边界</h3><dl>${privacyRows}</dl><p>敏感资料预检只拦截明显模式，不是匿名证明。工具未主动上传；实际下载位置由浏览器/系统决定。</p>
        <h3>会生成什么</h3><ul>
          <li>一份完整提交资料：包含彼此分账的领域意见原件、使用感受和文件校验信息。</li>
          <li>打印：浏览器中的易读副本；本工具不自动生成或上传 PDF。</li>
        </ul>
      </details>
      <details class="export-summary"><summary>展开核对将写入文件的全部文字</summary><div data-export-text-preview></div></details>
      ${artifacts ? "" : `<fieldset class="acknowledgement-list export-confirmation"><legend>锁定答卷前确认</legend>
        ${checkboxField("acknowledgements.noCrossOpinionAccess", "截至现在，我未查看另一份独立答卷的状态或意见；若情况已经改变，我不会锁定本答卷。")} 
        ${checkboxField("acknowledgements.privateOffRepositoryHandling", "我已核对上述文字，不含现实身份、出生资料或真实案例；答卷将由协调人私密保存，不会公开。")} 
      </fieldset>`}
      ${artifacts ? `<section class="finalized-result" role="status">
        <h3>${completePackageDownloadRequested ? "答卷已锁定，协调人已发起保存" : "答卷填写完成，请交给协调人保存"}</h3>
        <p>专家填写到这里已经完成；请勿刷新或关闭页面，直到协调人确认文件已经保存。</p>
        <details class="coordinator-save"><summary>协调人：保存答卷文件</summary>
          <p><strong>关闭本页前：</strong>${completePackageDownloadRequested ? "请确认完整提交资料文件确实出现在目标目录。" : "请先点击下方主按钮；现在关闭页面仍会丢失全部成果。"}</p>
          <div class="artifact-actions">
            <button class="button button-primary" type="button" data-download="complete">保存完整提交资料（一个文件）</button>
            <button class="button button-secondary" type="button" data-action="print">打印易读副本</button>
          </div>
        </details>
        <details><summary>协调人：查看校验值</summary>
          <p><strong>记录校验值</strong><code>${artifacts.recordDigest}</code></p>
          <p><strong>原件文件校验值（SHA-256）</strong><code>${artifacts.rawOpinionSha256}</code></p>
          <p>校验值不是数字签名，不证明作者身份、真实性、首次出现时间、保管链或可信时间。</p>
        </details>
        <details><summary>协调人：单独保存内部文件</summary><div class="artifact-actions">
          <button class="button button-secondary" type="button" data-download="opinion">下载领域意见原件</button>
          <button class="button button-secondary" type="button" data-download="usability">保存使用感受</button>
          <button class="button button-secondary" type="button" data-download="seal">下载文件校验回执</button>
          <button class="button button-secondary" type="button" data-download="sha">下载校验值文本</button>
        </div></details>
      </section>` : `<div class="pre-finalize-actions">
        <details class="coordinator-save"><summary>协调人：暂停并保存草稿</summary><button class="button button-secondary" type="button" data-action="save-draft">保存全部草稿备份</button></details>
        <button class="button button-primary" type="button" data-action="finalize">检查并锁定答卷</button>
      </div>`}
    </article>`;
  renderExportTextPreview();
  hydrateBoundControls(main);
  bindActionButtons(main);
  main.querySelectorAll("[data-error-path]").forEach((button) => {
    button.addEventListener("click", () => navigateToPath(button.dataset.errorPath));
  });
  main.querySelectorAll("[data-download]").forEach((button) => {
    button.addEventListener("click", () => downloadArtifact(button.dataset.download));
  });
  renderPrintProjection();
}

function exportTextEntries() {
  const rows = [
    ["自述流派", draft.reviewerSelfDescription.selfDescribedTradition],
    ["复核范围", draft.reviewerSelfDescription.selfDescribedScope]
  ];
  for (const scenarioId of Object.keys(draft.caseResponses)) {
    const response = draft.caseResponses[scenarioId];
    rows.push(
      [`${scenarioId} 理由`, response.reason],
      [`${scenarioId} 成立条件`, response.applicabilityConditions],
      [`${scenarioId} 反例`, response.counterexamples],
      [`${scenarioId} 修改建议`, response.revisionSuggestion]
    );
  }
  for (const questionId of Object.keys(draft.overallResponses)) {
    const response = draft.overallResponses[questionId];
    rows.push(
      [`${questionId} 专家原文`, response.expertOriginalText],
      [`${questionId} 理由`, response.rationale],
      [`${questionId} 不确定点`, response.uncertainties]
    );
  }
  rows.push(
    ["最难理解的词或页面", draft.usabilityFeedback.difficultTerms],
    ["流程建议", draft.usabilityFeedback.workflowComments]
  );
  return rows;
}

function renderExportTextPreview() {
  const host = main.querySelector("[data-export-text-preview]");
  if (!host) return;
  for (const [label, value] of exportTextEntries()) {
    const row = document.createElement("div");
    row.className = "print-text-row";
    const term = document.createElement("strong");
    term.textContent = label;
    const text = document.createElement("p");
    text.textContent = value || "（未填写）";
    row.append(term, text);
    host.append(row);
  }
}

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function renderPrintProjection() {
  root.querySelector(".print-projection")?.remove();
  if (!artifacts) return;
  const opinion = artifacts.opinionRecord;
  const section = document.createElement("section");
  section.className = "print-projection";
  const heading = document.createElement("header");
  const title = document.createElement("h1");
  title.textContent = `八字规则复核试填 · 独立答卷 ${seatId} · 易读副本`;
  const meta = document.createElement("p");
  meta.textContent = `${PILOT_PACK_ID} · record digest ${artifacts.recordDigest}`;
  heading.append(title, meta);
  section.append(heading);
  const warning = document.createElement("p");
  warning.className = "print-warning";
  warning.textContent = "仅供题目试填，不作为正式专家审定意见或准确度结论；不证明专家意见、规则或内容正确，也不产生任何发布授权；未证明个人资料已完全排除；只能由协调人私密保存，不可公开。";
  section.append(warning);
  const reviewer = document.createElement("section");
  reviewer.append(Object.assign(document.createElement("h2"), { textContent: "自述范围" }));
  reviewer.append(textBlock("自述流派", opinion.reviewerSelfDescription.selfDescribedTradition));
  reviewer.append(textBlock("复核范围", opinion.reviewerSelfDescription.selfDescribedScope));
  section.append(reviewer);
  for (const response of opinion.caseResponses) {
    const block = document.createElement("section");
    block.className = "print-block";
    const scenario = SCENARIO_BY_ID[response.scenarioId];
    block.append(Object.assign(document.createElement("h2"), { textContent: `${response.scenarioId} · ${scenario.title}` }));
    block.append(textBlock("命盘事实是否正确", optionLabel(FACT_ASSESSMENTS, response.factAssessment)));
    block.append(textBlock("对当前规则的意见", optionLabel(RULE_POSITIONS, response.rulePosition)));
    block.append(textBlock("理由", response.reason));
    block.append(textBlock("成立条件", response.applicabilityConditions));
    block.append(textBlock("反例", response.counterexamples));
    block.append(textBlock("可能失效结构", response.invalidationStructures.join("、")));
    block.append(textBlock("这类结论应怎样呈现", optionLabel(HIGH_RISK_DISPOSITIONS, response.highRiskDisposition)));
    block.append(textBlock("修改建议", response.revisionSuggestion));
    section.append(block);
  }
  const questionsHeading = document.createElement("h2");
  questionsHeading.textContent = "四个总体问题";
  section.append(questionsHeading);
  for (const response of opinion.overallQuestionResponses) {
    const question = OVERALL_QUESTIONS.find((item) => item.id === response.questionId);
    const block = document.createElement("section");
    block.className = "print-block";
    block.append(Object.assign(document.createElement("h3"), { textContent: question.title }));
    block.append(textBlock("总体意见", optionLabel(RULE_POSITIONS, response.position)));
    block.append(textBlock("专家原文", response.expertOriginalText));
    block.append(textBlock("理由", response.rationale));
    block.append(textBlock("不确定点", response.uncertainties));
    section.append(block);
  }
  root.append(section);
}

function textBlock(label, value) {
  const row = document.createElement("div");
  row.className = "print-text-row";
  const term = document.createElement("strong");
  term.textContent = label;
  const text = document.createElement("p");
  text.textContent = value;
  row.append(term, text);
  return row;
}

function markDraftChanged(message) {
  draft.acknowledgements.noCrossOpinionAccess = false;
  draft.acknowledgements.privateOffRepositoryHandling = false;
  finalizeErrors = [];
  statusMessage = message;
}

function fillEmptyScenarioText(scenarioId) {
  const response = draft.caseResponses[scenarioId];
  if (!response) return;
  for (const key of ["reason", "applicabilityConditions", "counterexamples", "revisionSuggestion"]) {
    if (!isNonEmpty(response[key])) response[key] = "无";
  }
  markDraftChanged("已将本场景仍为空白的文字栏填写为“无”；选择项仍需您亲自判断。");
  renderAll({ focusMain: true });
}

function fillEmptyOverallText(questionId) {
  const response = draft.overallResponses[questionId];
  if (!response) return;
  for (const key of ["expertOriginalText", "rationale", "uncertainties"]) {
    if (!isNonEmpty(response[key])) response[key] = "无";
  }
  markDraftChanged("已将本题仍为空白的说明栏填写为“无”；总体意见仍需您亲自选择。");
  renderAll({ focusMain: true });
}

function renderCurrentSection() {
  const sectionId = SECTION_IDS[currentSectionIndex];
  if (sectionId === "intro") renderIntro();
  else if (sectionId.startsWith("P")) renderScenario(sectionId);
  else if (sectionId === "overall") renderOverall();
  else if (sectionId === "usability") renderUsability();
  else renderExport();
}

function hydrateBoundControls(container) {
  container.querySelectorAll("[data-bind]").forEach((control) => {
    const path = control.dataset.bind;
    const value = getAtPath(path);
    if (control instanceof HTMLInputElement && control.type === "checkbox") control.checked = value === true;
    else if (control instanceof HTMLInputElement && control.type === "radio") control.checked = control.value === value;
    else control.value = value;
    control.disabled = Boolean(artifacts);
    const eventName = control instanceof HTMLTextAreaElement ? "input" : "change";
    control.addEventListener(eventName, () => {
      if (control instanceof HTMLInputElement && control.type === "checkbox") setAtPath(path, control.checked);
      else setAtPath(path, control.value);
      if (!["acknowledgements.noCrossOpinionAccess", "acknowledgements.privateOffRepositoryHandling"].includes(path)) {
        draft.acknowledgements.noCrossOpinionAccess = false;
        draft.acknowledgements.privateOffRepositoryHandling = false;
      }
      finalizeErrors = [];
      main.querySelector(".error-summary")?.remove();
      statusMessage = "当前修改只保存在页面内存中；保存或锁定答卷前会重新检查。";
      updateCharacterCount(path, control);
      renderProgressOnly();
    });
    updateCharacterCount(path, control);
  });
  container.querySelectorAll("[data-array-bind]").forEach((control) => {
    const path = control.dataset.arrayBind;
    const selected = getAtPath(path);
    control.checked = selected.includes(control.value);
    control.disabled = Boolean(artifacts);
    control.addEventListener("change", () => {
      const current = [...getAtPath(path)];
      const singleton = ["无", "无法判断"].includes(control.value);
      let next;
      if (control.checked && singleton) next = [control.value];
      else if (control.checked) next = [...current.filter((value) => !["无", "无法判断"].includes(value)), control.value];
      else next = current.filter((value) => value !== control.value);
      setAtPath(path, next);
      draft.acknowledgements.noCrossOpinionAccess = false;
      draft.acknowledgements.privateOffRepositoryHandling = false;
      finalizeErrors = [];
      main.querySelector(".error-summary")?.remove();
      statusMessage = "当前修改只保存在页面内存中；保存或锁定答卷前会重新检查。";
      container.querySelectorAll(`[data-array-bind="${path}"]`).forEach((box) => {
        box.checked = next.includes(box.value);
      });
      renderProgressOnly();
    });
  });
}

function updateCharacterCount(path, control) {
  if (!(control instanceof HTMLTextAreaElement)) return;
  const counter = main.querySelector(`[data-count-for="${path}"]`);
  if (counter) counter.textContent = `${control.value.length} / ${control.maxLength}`;
}

function renderProgressOnly() {
  renderNavigation();
  renderRightRail();
  renderMobileActions();
}

function renderAll({ focusMain = false } = {}) {
  renderNavigation();
  renderCurrentSection();
  renderRightRail();
  renderMobileActions();
  mobileToggle.setAttribute("aria-expanded", String(mobileNavigationOpen));
  if (focusMain) main.focus();
}

function navigateTo(index) {
  if (!Number.isInteger(index) || index < 0 || index >= SECTION_IDS.length) return;
  currentSectionIndex = index;
  mobileNavigationOpen = false;
  renderAll({ focusMain: true });
  scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function navigateToPath(path) {
  const sectionId = sectionIdForPath(path);
  const index = SECTION_IDS.indexOf(sectionId);
  navigateTo(index);
  requestAnimationFrame(() => {
    const field = main.querySelector(`[data-field-path="${CSS.escape(path)}"], [data-bind="${CSS.escape(path)}"]`);
    field?.focus();
  });
}

async function saveDraft() {
  if (artifacts) return;
  try {
    await assertPilotDraftExportable(draft);
  } catch (error) {
    if (error instanceof PilotContractError) {
      finalizeErrors = error.errors.length > 0
        ? error.errors
        : [{ path: "contract", message: error.message }];
      announce("草稿保存被隐私检查阻断；请处理列出的字段，并确认只由协调人私密保存。");
      currentSectionIndex = SECTION_IDS.indexOf("export");
      renderAll({ focusMain: true });
      main.querySelector(".error-summary")?.focus();
      return;
    }
    throw error;
  }
  downloadText(`hakimi-bazi-pilot-seat-${seatId.toLowerCase()}-draft.json`, serializeUtf8Json(draft));
  draft.acknowledgements.noCrossOpinionAccess = false;
  draft.acknowledgements.privateOffRepositoryHandling = false;
  finalizeErrors = [];
  announce("草稿备份已交给浏览器保存；工具未主动上传，实际位置由浏览器或系统决定，请仅由协调人私密保管。再次保存前需要重新确认。");
  renderAll();
}

async function importDraftFile(file) {
  if (artifacts) return;
  if (file.size > 1024 * 1024) throw new PilotContractError("导入文件超过 1 MiB 上限。");
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch (cause) {
    throw new PilotContractError("导入文件不是严格 UTF-8。", [{ path: "import", message: String(cause) }]);
  }
  draft = await parsePilotDraft(text, seatId, sessionContext);
  draft.acknowledgements.noCrossOpinionAccess = false;
  draft.acknowledgements.privateOffRepositoryHandling = false;
  finalizeErrors = [];
  announce(`已导入备份 ${file.name}；仍未写入产品存储。保存或锁定答卷前请重新核对并确认私密保存。`);
  renderAll({ focusMain: true });
}

async function finalizeDraft() {
  if (artifacts) return;
  finalizeErrors = await collectFinalizeErrors(draft);
  if (finalizeErrors.length) {
    announce(`仍有 ${finalizeErrors.length} 个必填项未完成。`);
    renderExport();
    renderRightRail();
    main.querySelector(".error-summary")?.focus();
    return;
  }
  try {
    artifacts = await buildFinalArtifacts(draft);
    draft = deepFreeze(draft);
    finalizeErrors = [];
    completePackageDownloadRequested = false;
    announce("答卷已在页面中锁定，但尚未保存文件；请交给协调人保存完整提交资料，并在关闭前确认文件存在。");
    renderAll({ focusMain: true });
  } catch (error) {
    if (error instanceof PilotContractError) finalizeErrors = error.errors;
    else finalizeErrors = [{ path: "contract", message: "答卷锁定失败。" }];
    announce("答卷锁定失败；没有生成文件。");
    renderExport();
    main.querySelector(".error-summary")?.focus();
  }
}

function downloadArtifact(kind) {
  if (!artifacts) return;
  if (kind === "complete") {
    downloadText(artifacts.completePackageFilename, artifacts.completePackageText);
    completePackageDownloadRequested = true;
    announce("已向浏览器发起完整提交资料下载；工具不能确认最终保存位置，请由协调人看到文件后再关闭页面。");
    renderExport();
    renderRightRail();
    return;
  }
  if (kind === "opinion") downloadText(artifacts.opinionFilename, artifacts.opinionText);
  else if (kind === "usability") downloadText(artifacts.usabilityFilename, artifacts.usabilityText);
  else if (kind === "seal") downloadText(artifacts.sealFilename, artifacts.sealText);
  else if (kind === "sha") downloadText(artifacts.shaFilename, artifacts.shaText, "text/plain;charset=utf-8");
  announce(`已交给浏览器保存：${kind}。工具未主动上传；实际位置由浏览器/系统决定，请仅由协调人私密保管。`);
}

function bindActionButtons(container) {
  container.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;
      if (action === "save-draft") await saveDraft();
      else if (action === "import-draft") importInput.click();
      else if (action === "previous") navigateTo(currentSectionIndex - 1);
      else if (action === "next") navigateTo(currentSectionIndex + 1);
      else if (action === "list") navigateTo(0);
      else if (action === "export-page") navigateTo(SECTION_IDS.indexOf("export"));
      else if (action === "finalize") await finalizeDraft();
      else if (action === "print") window.print();
      else if (action === "fill-empty-scenario") fillEmptyScenarioText(button.dataset.scenarioId);
      else if (action === "fill-empty-overall") fillEmptyOverallText(button.dataset.questionId);
    });
  });
}

mobileToggle.addEventListener("click", () => {
  mobileNavigationOpen = !mobileNavigationOpen;
  mobileToggle.setAttribute("aria-expanded", String(mobileNavigationOpen));
  renderNavigation();
});

importInput.addEventListener("change", async () => {
  const [file] = importInput.files ?? [];
  importInput.value = "";
  if (!file) return;
  try {
    await importDraftFile(file);
  } catch (error) {
    if (error instanceof PilotContractError) {
      finalizeErrors = error.errors.length > 0
        ? error.errors
        : [{ path: "import", message: error.message }];
      announce(error.message);
      currentSectionIndex = SECTION_IDS.indexOf("export");
      renderAll({ focusMain: true });
      main.querySelector(".error-summary")?.focus();
    } else {
      announce(error instanceof Error ? error.message : "导入失败。");
      renderRightRail();
    }
  }
});

matchMedia("(max-width: 760px)").addEventListener?.("change", () => renderNavigation());
renderAll();
