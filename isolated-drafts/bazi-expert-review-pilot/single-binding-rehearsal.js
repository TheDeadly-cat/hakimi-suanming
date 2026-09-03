import {
  ASSISTANCE_CATEGORY_OPTIONS,
  CANNOT_DECIDE_REASON_OPTIONS,
  ENTRY_METHOD_OPTIONS,
  HIGH_RISK_OPTIONS,
  POSITION_OPTIONS,
  SINGLE_BINDING_REHEARSAL_BOUNDARY,
  SYNTHETIC_REHEARSAL_FIXTURE_REF,
  SYNTHETIC_SINGLE_BINDING_FIXTURE,
  SingleBindingRehearsalError,
  createSingleBindingRehearsalDraft,
  finalizeSingleBindingRehearsal,
  prepareSingleBindingRehearsalReadback
} from "./single-binding-rehearsal-contract.js";

const main = document.querySelector("#main");
const announcer = document.querySelector("#announcer");
const seatId = document.body.dataset.seatId;

if (!(main instanceof HTMLElement) || !(announcer instanceof HTMLElement) || !new Set(["A", "B"]).has(seatId)) {
  throw new Error("SINGLE_BINDING_REHEARSAL_BOOT_INVALID");
}

let draft = createSingleBindingRehearsalDraft(seatId);
let readbackCandidate = null;
let submissionCandidate = null;

const labels = {
  position: new Map(POSITION_OPTIONS.map((option) => [option.value, option.label])),
  cannotReason: new Map(CANNOT_DECIDE_REASON_OPTIONS.map((option) => [option.value, option.label])),
  entryMethod: new Map(ENTRY_METHOD_OPTIONS.map((option) => [option.value, option.label])),
  assistance: new Map(ASSISTANCE_CATEGORY_OPTIONS.map((option) => [option.value, option.label])),
  risk: new Map(HIGH_RISK_OPTIONS.map((option) => [option.value, option.label]))
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function radioOptions(name, options) {
  return options.map((option) => `
    <label class="option-row">
      <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.value)}">
      <span>${escapeHtml(option.label)}</span>
    </label>`).join("");
}

function assistanceOptions() {
  return ASSISTANCE_CATEGORY_OPTIONS.map((option) => `
    <label class="option-row">
      <input type="checkbox" name="assistance" value="${escapeHtml(option.value)}">
      <span>${escapeHtml(option.label)}</span>
    </label>`).join("");
}

function materialItems(items, descriptionKey) {
  return items.map((item) => `
    <li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item[descriptionKey])}</span></li>`).join("");
}

main.innerHTML = `
  <section class="warning-banner" aria-labelledby="rehearsal-warning-title">
    <h2 id="rehearsal-warning-title">只排练怎样审题，不是正式专家审定</h2>
    <p>本页只有固定合成材料，不得填写姓名、联系方式、出生资料或真人案例；明显模式会被阻断，但这不构成匿名证明。结果不进入产品、不公开、不冻结 Binding，也不比较专家和 AI 谁更准。</p>
  </section>

  <div class="grid-two">
    <section class="card" aria-labelledby="review-what-title">
      <h2 id="review-what-title">这次只审什么</h2>
      <ul class="scope-list">${SYNTHETIC_SINGLE_BINDING_FIXTURE.reviewWhat.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <section class="card" aria-labelledby="not-reviewing-title">
      <h2 id="not-reviewing-title">这次明确不审什么</h2>
      <ul class="scope-list">${SYNTHETIC_SINGLE_BINDING_FIXTURE.notReviewing.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  </div>

  <div class="grid-two">
    <section class="card available-card" aria-labelledby="available-title">
      <h2 id="available-title">本页已有材料</h2>
      <ul class="material-list">${materialItems(SYNTHETIC_SINGLE_BINDING_FIXTURE.availableMaterials, "description")}</ul>
    </section>
    <section class="card missing-card" aria-labelledby="missing-title">
      <h2 id="missing-title">仍然缺少的材料</h2>
      <ul class="material-list">${materialItems(SYNTHETIC_SINGLE_BINDING_FIXTURE.missingMaterials, "consequence")}</ul>
    </section>
  </div>

  <section class="card" aria-labelledby="binding-title">
    <p class="eyebrow">只审一条规则候选</p>
    <h2 id="binding-title">${escapeHtml(SYNTHETIC_SINGLE_BINDING_FIXTURE.title)}</h2>
    <div class="question-panel"><strong>请回答：</strong> ${escapeHtml(SYNTHETIC_SINGLE_BINDING_FIXTURE.question)}</div>
    <h3>固定合成临界例子</h3>
    <div class="boundary-table-wrap" tabindex="0" role="region" aria-label="固定合成临界例子，可横向滚动">
      <table class="boundary-table">
        <thead><tr><th>助身侧比例</th><th>当前候选分档</th><th>本页能证明什么</th></tr></thead>
        <tbody>${SYNTHETIC_SINGLE_BINDING_FIXTURE.boundaryExamples.map((item) => `<tr><td>${item.supportPercent}%</td><td>${escapeHtml(item.candidateBand)}</td><td>只展示候选边界，不证明准确</td></tr>`).join("")}</tbody>
      </table>
    </div>
    <details class="technical-details"><summary>协调人信息（专家无需处理）</summary><p>独立席位 ${seatId}；固定 synthetic fixture；本页不提供另一席入口、状态或意见。Binding：<code>${escapeHtml(SYNTHETIC_SINGLE_BINDING_FIXTURE.bindingId)}</code></p><p>题面身份仅是 synthetic rehearsal manifest，不是 formal review input manifest：<code>${escapeHtml(SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestId)}</code>；candidate status 为 <code>pre_freeze_candidate</code>，formal binding digest 为 <code>null</code>。</p></details>
  </section>

  <section class="card" aria-labelledby="response-title">
    <h2 id="response-title">请填写您的专业判断</h2>
    <p>无法判断不会扣分。请明确说明是材料不足、题意不清、超出流派，还是来源／版本不清。</p>

    <label class="option-row">
      <input id="synthetic-ack" type="checkbox">
      <span>我理解固定题面和材料都是合成的；自由文本仍按未评估私密内容处理，我不会填写任何真人或可识别个人资料。</span>
    </label>

    <fieldset class="field-group" data-field-path="reviewResponse.position">
      <legend>对这组候选分界的意见</legend>
      <div class="option-list">${radioOptions("position", POSITION_OPTIONS)}</div>
    </fieldset>

    <div id="cannot-reason-panel" class="conditional-panel" hidden>
      <label class="field-label" for="cannot-reason">目前无法判断的主要原因</label>
      <select id="cannot-reason">
        <option value="">请选择</option>
        ${CANNOT_DECIDE_REASON_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </div>

    <label class="field-stack" for="rationale"><span class="field-label">理由</span><span class="field-help">说明为什么支持、反对、有条件支持或无法判断。不要补写真人案例。</span><textarea id="rationale" maxlength="4000"></textarea></label>
    <label class="field-stack" for="conditions"><span class="field-label">成立条件</span><span class="field-help">没有补充时可填写“无”。</span><textarea id="conditions" maxlength="4000"></textarea></label>
    <label class="field-stack" for="counterexamples"><span class="field-label">反例或仍需补充的证据</span><span class="field-help">可以写“需要可靠案例集”，但不要写个人身份或真实案例细节。</span><textarea id="counterexamples" maxlength="4000"></textarea></label>
    <label class="field-stack" for="risk"><span class="field-label">面向用户应怎样处理</span><select id="risk"><option value="">请选择</option>${HIGH_RISK_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("")}</select></label>
    <label class="field-stack" for="revision"><span class="field-label">建议怎样改写或补充</span><span class="field-help">没有补充时可填写“无”。</span><textarea id="revision" maxlength="4000"></textarea></label>
  </section>

  <section class="card" aria-labelledby="capture-title">
    <h2 id="capture-title">怎样记录这份意见</h2>
    <fieldset class="field-group" data-field-path="captureContext.entryMethod">
      <legend>填写方式</legend>
      <div class="option-list">${radioOptions("entry-method", ENTRY_METHOD_OPTIONS)}</div>
    </fieldset>
    <div id="transcription-panel" class="conditional-panel" hidden>
      <p class="transcription-warning">协调人只能逐字代录：不得概括、润色、改成项目术语，也不得替专家选择答案。听不清时应停下询问。</p>
      <label class="option-row"><input id="verbatim-ack" type="checkbox"><span>协调人自述：只逐字录入，没有概括、润色或替换术语；最终将由专家逐项听读或通读确认。</span></label>
    </div>

    <fieldset class="field-group" data-field-path="captureContext.assistanceCategories">
      <legend>作答时使用过哪些协助</legend>
      <span class="field-help">只记录类别，不写人名、账号或资料正文。这里是自述，不证明已经排除外部 AI 或他人影响。</span>
      <div class="option-list">${assistanceOptions()}</div>
    </fieldset>
  </section>

  <section class="card" aria-labelledby="readback-title">
    <h2 id="readback-title">逐字核对与完成</h2>
    <p>先生成核对稿。专家必须亲自通读，或由协调人逐项读回并由专家确认；任何修改都会使旧核对稿失效。</p>
    <div class="action-row"><button id="prepare-readback" class="button button-primary" type="button">生成逐字核对稿</button></div>
    <div id="error-summary" class="error-summary" role="alert" tabindex="-1" hidden></div>
    <section id="readback-panel" class="readback-panel" tabindex="-1" aria-live="polite" hidden>
      <h3>请逐字通读或听取以下核对稿</h3>
      <p>核对稿只显示当前席位，不包含另一席意见。</p>
      <dl id="readback-grid" class="readback-grid"></dl>
    </section>
    <fieldset id="final-confirmations" class="final-confirmations" disabled>
      <legend>专家最终确认</legend>
      <div class="option-list">
        <label class="option-row"><input type="checkbox" data-final-key="fullTextReadBackAndAccurate"><span>我已逐字通读，或已逐项听完以上核对稿；这些文字准确表达我的意见。</span></label>
        <label class="option-row"><input type="checkbox" data-final-key="noCrossSeatOpinionAccess"><span>截至本次确认，我没有查看另一席的状态或意见。</span></label>
        <label class="option-row"><input type="checkbox" data-final-key="accuracyStudyExcluded"><span>我理解这不是专家与 AI 的准确度研究，也不会产生准确度结论。</span></label>
        <label class="option-row"><input type="checkbox" data-final-key="privateSyntheticHandling"><span>我理解固定题面是合成的、自由文本仍未评估；结果只是私密内存演练候选，不进入正式审定或公开发布。</span></label>
      </div>
      <div class="action-row"><button id="finalize" class="button button-primary" type="button">确认并完成演练</button><button id="restart-readback" class="button button-secondary" type="button">修改内容并重新核对</button></div>
    </fieldset>
  </section>

  <section id="result" class="result-card" tabindex="-1" hidden>
    <h2>合成题面演练候选已生成</h2>
    <p>固定题面是合成的；自由文本仍是未评估私密内容。明显敏感／准确度叙述预检不构成匿名证明。这只证明本页完成了结构检查和当前进程内的逐字核对绑定，不证明真人身份、代录真实性、专家真值、内容真值或准确度。</p>
    <div class="ledger-zero">
      <div><strong>0 / 2</strong><span>现实专家</span></div>
      <div><strong>0 / 12</strong><span>冻结 Binding</span></div>
      <div><strong>false</strong><span>正式准入</span></div>
      <div><strong>false</strong><span>准确度已评估</span></div>
    </div>
    <p><strong>专家操作到此结束，请把设备交回协调人。</strong> 当前旧版演练没有下载或回件入口；不得把屏幕状态当作已保存。</p>
    <p><strong>没有另一席意见、赢家、投票、平均、自动合并或模型裁决。</strong></p>
    <details class="technical-details"><summary>协调人查看当前内存候选摘要</summary><p><code id="submission-digest"></code></p><p>SHA-256 不是数字签名、本人认证、首次出现时间或保管链。</p></details>
  </section>`;

const syntheticAck = document.querySelector("#synthetic-ack");
const cannotReasonPanel = document.querySelector("#cannot-reason-panel");
const cannotReason = document.querySelector("#cannot-reason");
const transcriptionPanel = document.querySelector("#transcription-panel");
const verbatimAck = document.querySelector("#verbatim-ack");
const readbackPanel = document.querySelector("#readback-panel");
const readbackGrid = document.querySelector("#readback-grid");
const finalConfirmations = document.querySelector("#final-confirmations");
const errorSummary = document.querySelector("#error-summary");
const result = document.querySelector("#result");
const prepareButton = document.querySelector("#prepare-readback");
const finalizeButton = document.querySelector("#finalize");
const restartButton = document.querySelector("#restart-readback");

function announce(message) {
  announcer.textContent = "";
  requestAnimationFrame(() => { announcer.textContent = message; });
}

function setBodyState(value) {
  document.body.dataset.rehearsalState = value;
}

function clearFinalConfirmations() {
  for (const control of document.querySelectorAll("[data-final-key]")) control.checked = false;
  for (const key of Object.keys(draft.finalConfirmations)) draft.finalConfirmations[key] = false;
}

function invalidateReadback() {
  if (!readbackCandidate && !submissionCandidate) return;
  readbackCandidate = null;
  submissionCandidate = null;
  clearFinalConfirmations();
  finalConfirmations.disabled = true;
  readbackPanel.hidden = true;
  result.hidden = true;
  setBodyState("initial");
  announce("内容已改变；旧核对稿已失效，请重新生成。 ");
}

function showErrors(error) {
  const entries = error instanceof SingleBindingRehearsalError && error.errors.length > 0
    ? error.errors
    : [{ path: "contract", message: error instanceof Error ? error.message : "演练检查失败。" }];
  errorSummary.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = `还有 ${entries.length} 项需要处理`;
  const list = document.createElement("ul");
  for (const entry of entries) {
    const item = document.createElement("li");
    item.textContent = entry.message;
    list.append(item);
  }
  errorSummary.append(heading, list);
  errorSummary.hidden = false;
  errorSummary.focus();
  setBodyState("error");
  announce(`演练检查失败，还有 ${entries.length} 项需要处理。`);
}

function hideErrors() {
  errorSummary.hidden = true;
  errorSummary.replaceChildren();
}

function selectedAssistance() {
  const checked = [...document.querySelectorAll('input[name="assistance"]:checked')].map((control) => control.value);
  return ASSISTANCE_CATEGORY_OPTIONS.map((option) => option.value).filter((value) => checked.includes(value));
}

function handleAssistanceChange(changed) {
  const exclusive = new Set(["none_declared", "unknown_or_not_disclosed"]);
  const controls = [...document.querySelectorAll('input[name="assistance"]')];
  if (changed.checked && exclusive.has(changed.value)) {
    for (const control of controls) if (control !== changed) control.checked = false;
  } else if (changed.checked) {
    for (const control of controls) if (exclusive.has(control.value)) control.checked = false;
  }
  draft.captureContext.assistanceCategories = selectedAssistance();
}

function addReadbackRow(label, value) {
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = value;
  readbackGrid.append(term, detail);
}

function renderReadback(candidate) {
  const snapshot = candidate.reviewSnapshot;
  const response = snapshot.reviewResponse;
  readbackGrid.replaceChildren();
  addReadbackRow("独立席位", snapshot.seatId);
  addReadbackRow("只审规则", SYNTHETIC_SINGLE_BINDING_FIXTURE.title);
  addReadbackRow("判断", labels.position.get(response.position) ?? response.position);
  addReadbackRow("无法判断原因", response.cannotDecideReason === null ? "不适用" : labels.cannotReason.get(response.cannotDecideReason));
  addReadbackRow("理由", response.rationale);
  addReadbackRow("成立条件", response.applicabilityConditions);
  addReadbackRow("反例或仍需证据", response.counterexamplesOrNeededEvidence);
  addReadbackRow("面向用户的处理", labels.risk.get(response.highRiskDisposition) ?? response.highRiskDisposition);
  addReadbackRow("修改建议", response.revisionSuggestion);
  addReadbackRow("填写方式", labels.entryMethod.get(snapshot.captureContext.entryMethod) ?? snapshot.captureContext.entryMethod);
  addReadbackRow(
    "协助披露（仅自述）",
    snapshot.captureContext.assistanceCategories.map((value) => labels.assistance.get(value) ?? value).join("；")
  );
  addReadbackRow("准确度研究", "本流程未执行；禁止录入此类材料，但不能据此证明自由文本已完全排除相关内容");
  readbackPanel.hidden = false;
  finalConfirmations.disabled = false;
  readbackPanel.focus();
}

syntheticAck.addEventListener("change", () => {
  invalidateReadback();
  draft.startAcknowledgement.syntheticOnly = syntheticAck.checked;
});

for (const control of document.querySelectorAll('input[name="position"]')) {
  control.setAttribute("aria-controls", "cannot-reason-panel");
  control.setAttribute("aria-expanded", "false");
  control.addEventListener("change", () => {
    invalidateReadback();
    draft.reviewResponse.position = control.value;
    const cannot = control.value === "cannot_decide";
    cannotReasonPanel.hidden = !cannot;
    for (const peer of document.querySelectorAll('input[name="position"]')) {
      peer.setAttribute("aria-expanded", String(peer === control && cannot));
    }
    if (!cannot) {
      cannotReason.value = "";
      draft.reviewResponse.cannotDecideReason = null;
    }
  });
}

cannotReason.addEventListener("change", () => {
  invalidateReadback();
  draft.reviewResponse.cannotDecideReason = cannotReason.value || null;
});

const textBindings = new Map([
  ["#rationale", "rationale"],
  ["#conditions", "applicabilityConditions"],
  ["#counterexamples", "counterexamplesOrNeededEvidence"],
  ["#revision", "revisionSuggestion"]
]);
for (const [selector, key] of textBindings) {
  document.querySelector(selector).addEventListener("input", (event) => {
    invalidateReadback();
    draft.reviewResponse[key] = event.target.value;
  });
}

document.querySelector("#risk").addEventListener("change", (event) => {
  invalidateReadback();
  draft.reviewResponse.highRiskDisposition = event.target.value;
});

for (const control of document.querySelectorAll('input[name="entry-method"]')) {
  control.setAttribute("aria-controls", "transcription-panel");
  control.setAttribute("aria-expanded", "false");
  control.addEventListener("change", () => {
    invalidateReadback();
    draft.captureContext.entryMethod = control.value;
    const transcribed = control.value === "coordinator_verbatim_transcription";
    transcriptionPanel.hidden = !transcribed;
    for (const peer of document.querySelectorAll('input[name="entry-method"]')) {
      peer.setAttribute("aria-expanded", String(peer === control && transcribed));
    }
    verbatimAck.checked = false;
    draft.captureContext.coordinatorVerbatimNoSummarySelfDeclared = false;
  });
}

verbatimAck.addEventListener("change", () => {
  invalidateReadback();
  draft.captureContext.coordinatorVerbatimNoSummarySelfDeclared = verbatimAck.checked;
});

for (const control of document.querySelectorAll('input[name="assistance"]')) {
  control.addEventListener("change", () => {
    invalidateReadback();
    handleAssistanceChange(control);
  });
}

for (const control of document.querySelectorAll("[data-final-key]")) {
  control.addEventListener("change", () => {
    draft.finalConfirmations[control.dataset.finalKey] = control.checked;
  });
}

prepareButton.addEventListener("click", async () => {
  prepareButton.disabled = true;
  try {
    hideErrors();
    readbackCandidate = await prepareSingleBindingRehearsalReadback(draft);
    submissionCandidate = null;
    clearFinalConfirmations();
    renderReadback(readbackCandidate);
    result.hidden = true;
    setBodyState("readback_ready");
    announce("逐字核对稿已生成；请专家本人通读或逐项听取后完成确认。 ");
  } catch (error) {
    readbackCandidate = null;
    showErrors(error);
  } finally {
    if (submissionCandidate === null) prepareButton.disabled = false;
  }
});

restartButton.addEventListener("click", () => {
  readbackCandidate = null;
  submissionCandidate = null;
  clearFinalConfirmations();
  finalConfirmations.disabled = true;
  readbackPanel.hidden = true;
  result.hidden = true;
  setBodyState("initial");
  document.querySelector("#response-title").scrollIntoView({ block: "start" });
  announce("核对稿已撤下；修改后请重新生成并逐字核对。 ");
});

finalizeButton.addEventListener("click", async () => {
  finalizeButton.disabled = true;
  restartButton.disabled = true;
  try {
    hideErrors();
    submissionCandidate = await finalizeSingleBindingRehearsal(draft, readbackCandidate);
    document.querySelector("#submission-digest").textContent = submissionCandidate.submissionDigest;
    result.hidden = false;
    for (const control of main.querySelectorAll("input, textarea, select, button")) control.disabled = true;
    setBodyState("completed");
    result.focus();
    announce("合成题面演练候选已生成；自由文本仍未评估，正式专家和 Binding 计数仍为零。 ");
  } catch (error) {
    showErrors(error);
  } finally {
    if (submissionCandidate === null) {
      finalizeButton.disabled = false;
      restartButton.disabled = false;
    }
  }
});

if (SINGLE_BINDING_REHEARSAL_BOUNDARY.verifiedExpertCount !== 0
  || SINGLE_BINDING_REHEARSAL_BOUNDARY.frozenBindingCount !== 0
  || SINGLE_BINDING_REHEARSAL_BOUNDARY.formalAdmissionAllowed !== false) {
  throw new Error("SINGLE_BINDING_REHEARSAL_BOUNDARY_INVALID");
}
