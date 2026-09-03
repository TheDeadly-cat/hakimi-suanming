import {
  SINGLE_BINDING_INTEGRATED_BOUNDARY,
  SingleBindingIntegratedError,
  createSingleBindingIntegratedDraft,
  createSingleBindingIntegratedSessionBinding,
  finalizeSingleBindingIntegratedSubmission,
  prepareSingleBindingIntegratedReadback
} from "./single-binding-integrated-contract.js";
import {
  SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY,
  SingleBindingIntegratedHandoffError,
  createSingleBindingIntegratedHandoffArtifacts
} from "./single-binding-integrated-handoff.js";
import {
  parseSingleBindingIntegratedStrictJsonText
} from "./single-binding-integrated-json.js";
import {
  ASSISTANCE_CATEGORY_OPTIONS,
  CANNOT_DECIDE_REASON_OPTIONS,
  ENTRY_METHOD_OPTIONS,
  HIGH_RISK_OPTIONS,
  POSITION_OPTIONS,
  SYNTHETIC_REHEARSAL_FIXTURE_REF,
  SYNTHETIC_SINGLE_BINDING_FIXTURE,
  SingleBindingRehearsalError
} from "./single-binding-rehearsal-contract.js";

const SESSION_PLACEHOLDER = "__HAKIMI_SINGLE_BINDING_SESSION_BINDING_JSON__";
const RETURN_TOKEN_PLACEHOLDER = "__HAKIMI_SINGLE_BINDING_RETURN_TOKEN__";
const RETURN_TOKEN_PATTERN = /^[a-f0-9]{64}$/u;
const main = document.querySelector("#main");
const announcer = document.querySelector("#announcer");
const sessionMeta = document.querySelector('meta[name="hakimi-single-binding-session"]');
const returnTokenMeta = document.querySelector('meta[name="hakimi-single-binding-return-token"]');
const seatId = document.body.dataset.seatId;

if (!(main instanceof HTMLElement) || !(announcer instanceof HTMLElement)
  || !new Set(["A", "B"]).has(seatId)) {
  throw new Error("SINGLE_BINDING_INTEGRATED_BOOT_SHELL_INVALID");
}

let sessionBinding;
let draft;
let readbackCandidate = null;
let submissionCandidate = null;
let handoffArtifacts = null;

const labels = {
  position: new Map(POSITION_OPTIONS.map((option) => [option.value, option.label])),
  cannotReason: new Map(CANNOT_DECIDE_REASON_OPTIONS.map((option) => [option.value, option.label])),
  entryMethod: new Map(ENTRY_METHOD_OPTIONS.map((option) => [option.value, option.label])),
  assistance: new Map(ASSISTANCE_CATEGORY_OPTIONS.map((option) => [option.value, option.label])),
  risk: new Map(HIGH_RISK_OPTIONS.map((option) => [option.value, option.label]))
};

const PHYSICAL_EXPERT_ASSISTANCE_OPTIONS = Object.freeze(ASSISTANCE_CATEGORY_OPTIONS.map((option) => ({
  value: option.value,
  label: option.value === "ai_or_software_tool"
    ? "使用了聊天机器人、排盘软件或其他软件工具"
    : option.label
})));
const PHYSICAL_EXPERT_ASSISTANCE_LABELS = new Map(
  PHYSICAL_EXPERT_ASSISTANCE_OPTIONS.map((option) => [option.value, option.label])
);

const PHYSICAL_EXPERT_DISPLAY = Object.freeze({
  notReviewing: Object.freeze([
    "不判断任何真人命盘、人生事件或吉凶",
    "不比较人与电脑工具谁更准确，也不产生准确度分数",
    "不裁定材料使用许可、法律结论或公开发布",
    "不审其他规则，也不外推到紫微、西洋或吠陀"
  ]),
  availableMaterials: Object.freeze([
    Object.freeze({ title: "固定候选分界", description: "25%、43%、57%、75%；这里只把它当作待复核草案。" }),
    Object.freeze({ title: "四个临界例子", description: "42%→偏弱，43%→相对中和，57%→相对中和，58%→偏强。" }),
    Object.freeze({ title: "页面用词说明", description: "“助身侧／泄耗克侧”只说明当前两侧计算，不表示吉凶、喜忌或准确度。" }),
    Object.freeze({ title: "复核范围", description: "本次只看中文题面、回答结构和口述确认流程。" })
  ]),
  missingMaterials: Object.freeze([
    Object.freeze({ title: "可靠且带结果标签的案例集", consequence: "尚未提供；不能据此证明预测准确度或分界有效。" }),
    Object.freeze({ title: "固定版本的可靠原始依据及对应原文", consequence: "尚未提供；不能据此确认内容依据。" }),
    Object.freeze({ title: "材料使用权依据", consequence: "尚未提供；不能据此形成许可或法律结论。" }),
    Object.freeze({ title: "两位身份、资质与独立性经过核实的现实专家", consequence: "尚未完成；本次练习不增加专家计数。" }),
    Object.freeze({ title: "其余规则的正式定稿", consequence: "尚未完成；本次练习不定稿任何规则。" })
  ])
});

const PHYSICAL_EXPERT_ERROR_MESSAGES = new Map([
  ["required", "请补充必填内容；没有补充时可填写“无”。"],
  ["too_long", "文字超过长度上限，请缩短后再试。"],
  ["contact_detail", "请删除联系方式；本次练习不接收真人资料。"],
  ["identity_detail", "请删除姓名、身份、证件或机构信息；本次练习不接收真人资料。"],
  ["birth_detail", "请删除出生或地址信息；本次练习不接收真人资料。"],
  ["real_case_detail", "请删除现实案例叙述，只讨论本页练习题。"],
  ["accuracy_study_detail", "请删除准确度、命中率或人与电脑工具比较内容；本题不收集这类材料。"],
  ["synthetic_ack_required", "请先确认本页只是固定练习题。"],
  ["position_required", "请选择对这组分界的意见。"],
  ["cannot_reason_required", "请选择目前无法判断的原因。"],
  ["cannot_reason_not_applicable", "只有选择“目前无法判断”时才能填写该原因。"],
  ["risk_required", "请选择面向用户应怎样处理。"],
  ["entry_method_required", "请选择本人输入或协调人逐字代录。"],
  ["verbatim_ack_required", "逐字代录时，请先确认没有概括、润色或替换术语。"],
  ["verbatim_ack_not_applicable", "本人输入时不应勾选代录确认。"],
  ["assistance_required", "请至少选择一项作答协助说明。"],
  ["assistance_duplicate", "作答协助说明中有重复选项，请重新选择。"],
  ["assistance_order", "作答协助说明无效，请重新选择。"],
  ["assistance_exclusive", "“未使用”或“不确定／不披露”不能与其他选项同时选择。"],
  ["confirmation_before_readback_forbidden", "请先生成并核对全部文字，再进行最终确认。"],
  ["final_confirmation_required", "请完成全部最终确认。"]
]);

function isPhysicalExpertMode() {
  return sessionBinding?.bindingMode === "physical_synthetic_single_binding_pair";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function announce(message) {
  announcer.textContent = "";
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

function setBodyState(value) {
  document.body.dataset.integratedState = value;
}

function blockBoot(error) {
  main.setAttribute("aria-busy", "false");
  main.innerHTML = `
    <section class="boot-blocked" role="alert" tabindex="-1">
      <h2>本次复核无法开始</h2>
      <p>页面准备没有完成，因此不会显示填写表单，也不会保存任何意见。</p>
      <p>请把设备交回协调人处理；不要继续填写或刷新页面。</p>
    </section>`;
  setBodyState("blocked");
  main.querySelector(".boot-blocked")?.focus();
  announce("本席演练已阻断；请把设备交回协调人。 ");
}

function readInjectedSessionBinding() {
  if (!(sessionMeta instanceof HTMLMetaElement)) {
    throw new Error("SESSION_BINDING_META_MISSING");
  }
  const raw = sessionMeta.content;
  if (!raw || raw === SESSION_PLACEHOLDER || raw.includes(SESSION_PLACEHOLDER)) {
    throw new Error("SESSION_BINDING_NOT_INJECTED");
  }
  const parsed = parseSingleBindingIntegratedStrictJsonText(raw, {
    label: "injected single-binding session binding",
    maxBytes: 64 * 1024
  });
  const validated = createSingleBindingIntegratedSessionBinding(parsed);
  if (validated.seatId !== seatId) {
    throw new Error("SESSION_BINDING_SEAT_MISMATCH");
  }
  return validated;
}

function readPhysicalReturnToken() {
  if (!isPhysicalExpertMode() || !(returnTokenMeta instanceof HTMLMetaElement)
    || returnTokenMeta.content === RETURN_TOKEN_PLACEHOLDER
    || !RETURN_TOKEN_PATTERN.test(returnTokenMeta.content)
    || /^0{64}$/u.test(returnTokenMeta.content)) {
    throw new Error("PHYSICAL_RETURN_TOKEN_INVALID");
  }
  return returnTokenMeta.content;
}

async function submitPhysicalCompleteReturn(artifacts) {
  const response = await fetch("/__complete-return", {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "X-Hakimi-Return-Token": readPhysicalReturnToken()
    },
    body: artifacts.completeReturnText,
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer"
  });
  if (response.status !== 200) throw new Error("PHYSICAL_COMPLETE_RETURN_NOT_ACCEPTED");
  if (response.headers.get("content-type") !== "application/json;charset=utf-8") {
    throw new Error("PHYSICAL_COMPLETE_RETURN_RECEIPT_INVALID");
  }
  const receipt = parseSingleBindingIntegratedStrictJsonText(await response.text(), {
    label: "physical complete return receipt",
    maxBytes: 4 * 1024
  });
  const expectedKeys = ["accepted", "byteLength", "duplicate", "rawSha256"];
  const observedKeys = receipt && typeof receipt === "object" && !Array.isArray(receipt)
    ? Object.keys(receipt).sort()
    : [];
  if (JSON.stringify(observedKeys) !== JSON.stringify(expectedKeys.sort())
    || receipt.accepted !== true || typeof receipt.duplicate !== "boolean"
    || receipt.rawSha256 !== artifacts.completeReturnRawSha256
    || receipt.byteLength !== new TextEncoder().encode(artifacts.completeReturnText).byteLength) {
    throw new Error("PHYSICAL_COMPLETE_RETURN_RECEIPT_INVALID");
  }
}

function radioOptions(name, options) {
  return options.map((option) => `
    <label class="option-row">
      <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(option.value)}">
      <span>${escapeHtml(option.label)}</span>
    </label>`).join("");
}

function assistanceOptions() {
  const options = isPhysicalExpertMode()
    ? PHYSICAL_EXPERT_ASSISTANCE_OPTIONS
    : ASSISTANCE_CATEGORY_OPTIONS;
  return options.map((option) => `
    <label class="option-row">
      <input type="checkbox" name="assistance" value="${escapeHtml(option.value)}">
      <span>${escapeHtml(option.label)}</span>
    </label>`).join("");
}

function materialItems(items, descriptionKey) {
  return items.map((item) => `
    <li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item[descriptionKey])}</span></li>`).join("");
}

function cycleSuffix(reviewCycleId) {
  return reviewCycleId.slice(-10);
}

function renderWorkflow() {
  const physical = isPhysicalExpertMode();
  const notReviewing = physical
    ? PHYSICAL_EXPERT_DISPLAY.notReviewing
    : SYNTHETIC_SINGLE_BINDING_FIXTURE.notReviewing;
  const availableMaterials = physical
    ? PHYSICAL_EXPERT_DISPLAY.availableMaterials
    : SYNTHETIC_SINGLE_BINDING_FIXTURE.availableMaterials;
  const missingMaterials = physical
    ? PHYSICAL_EXPERT_DISPLAY.missingMaterials
    : SYNTHETIC_SINGLE_BINDING_FIXTURE.missingMaterials;
  const technicalDetails = physical ? "" : `
      <details class="technical-details">
        <summary>协调人会话详情（专家无需处理）</summary>
        <p>以下完整标识在创建草稿前已经核验，并会进入逐字核对与回件摘要；SHA-256 不是签名、本人认证、可信时间或保管链。</p>
        <dl id="session-technical-ledger" class="technical-ledger"></dl>
      </details>`;
  const resultDetails = physical ? `
      <div class="handoff-callout"><strong>本席操作已经结束，请把设备交回协调人。</strong> 不要截图、复制或继续操作本页。</div>
      <p>本机协调流程已经接收本席回件；它仍只在当前本机流程中等待协调人处理，没有进入正式产品或公开位置。</p>
      <p>本次仅为固定练习材料的流程测试，不会增加正式专家计数，也不会把任何规则定稿。</p>
      <p><strong>两位复核人的意见只会并列保留。</strong> 出现差异时继续记录理由和适用条件，不投票、不平均，也不自动选出一方。</p>` : `
      <div class="handoff-callout"><strong>请把设备交回协调人。</strong> 后续下载与包外校验由协调人操作；本页不声称任何文件已经保存。</div>
      <p>完整回件内嵌本席 session submission、独立封条回执与对应校验文本，但这只建立机械交叉引用，不建立专家身份、真实性、首次出现时间或保管链。</p>
      <div class="ledger-zero">
        <div><strong>0 / 2</strong><span>现实专家</span></div>
        <div><strong>0 / 12</strong><span>冻结 Binding</span></div>
        <div><strong>false</strong><span>正式准入</span></div>
        <div><strong>false</strong><span>公开发布授权</span></div>
      </div>
      <p><strong>没有赢家、投票、平均、自动合并或模型裁决。</strong> A/B 差异只能并列保留为未解决。</p>
      <section aria-labelledby="coordinator-download-title">
        <h3 id="coordinator-download-title">以下仅由协调人操作</h3>
        <div class="download-actions" role="group" aria-label="协调人回件下载">
          <button class="button button-primary" type="button" data-download-role="complete-return">发起下载完整回件</button>
          <button class="button button-secondary" type="button" data-download-role="complete-return-sidecar">发起下载包外 SHA-256 校验值</button>
        </div>
        <p id="download-status" class="download-status" role="status" aria-live="polite">尚未发起下载；请先把设备交回协调人。</p>
      </section>
      <details class="technical-details"><summary>协调人查看当前内存回件摘要</summary><dl class="technical-ledger"><dt>完整回件文件名</dt><dd><code id="complete-return-filename"></code></dd><dt>完整回件 SHA-256</dt><dd><code id="complete-return-sha"></code></dd><dt>session submission SHA-256</dt><dd><code id="session-submission-sha"></code></dd><dt>seal receipt SHA-256</dt><dd><code id="seal-receipt-sha"></code></dd></dl><p>所有摘要都不是数字签名、本人认证、可信时间、来源许可或保管链。</p></details>`;
  main.innerHTML = `
    <section class="warning-banner" aria-labelledby="integrated-warning-title">
      <h2 id="integrated-warning-title">${physical ? "本次只练习复核流程" : "只演练复核流程，不采集真实专家材料"}</h2>
      <p>${physical
    ? "本页使用固定练习题，不是任何真人资料。请不要填写姓名、联系方式、出生资料或真人案例；结果不会进入正式审定或公开发布。"
    : "本页固定使用合成题面。不得填写姓名、联系方式、出生资料或真人案例；自由文本仍按未评估私密内容处理。结果不进入产品、不公开、不冻结 Binding，也不比较专家与 AI 谁更准。"}</p>
    </section>

    <section class="session-strip" aria-label="本席会话摘要">
      <div><span>${physical ? "本次编号" : "演练轮次后缀"}</span><strong id="cycle-suffix">${escapeHtml(cycleSuffix(sessionBinding.reviewCycleId))}</strong></div>
      <div><span>${physical ? "复核席位" : "独立席位"}</span><strong>${escapeHtml(seatId)}</strong></div>
      <div><span>本次题目</span><strong>${escapeHtml(SYNTHETIC_SINGLE_BINDING_FIXTURE.title)}</strong></div>
    </section>

    <ol class="progress-list" aria-label="四步流程">
      <li>1　阅读题面</li>
      <li>2　本人输入或逐字代录</li>
      <li>3　专家逐字读回</li>
      <li>4　交回协调人</li>
    </ol>

    <div class="grid-two">
      <section class="card" aria-labelledby="review-what-title">
        <h2 id="review-what-title">这次只审什么</h2>
        <ul class="scope-list">${SYNTHETIC_SINGLE_BINDING_FIXTURE.reviewWhat.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section class="card" aria-labelledby="not-reviewing-title">
        <h2 id="not-reviewing-title">这次明确不审什么</h2>
        <ul class="scope-list">${notReviewing.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
    </div>

    <div class="grid-two">
      <section class="card available-card" aria-labelledby="available-title">
        <h2 id="available-title">本页已有材料</h2>
        <ul class="material-list">${materialItems(availableMaterials, "description")}</ul>
      </section>
      <section class="card missing-card" aria-labelledby="missing-title">
        <h2 id="missing-title">仍然缺少的材料</h2>
        <ul class="material-list">${materialItems(missingMaterials, "consequence")}</ul>
      </section>
    </div>

    <section class="card" aria-labelledby="binding-title">
      <p class="eyebrow">第 1 步 · ${physical ? "阅读一条规则草案" : "只读一条规则候选"}</p>
      <h2 id="binding-title">${escapeHtml(SYNTHETIC_SINGLE_BINDING_FIXTURE.title)}</h2>
      <div class="question-panel"><strong>请回答：</strong> ${escapeHtml(SYNTHETIC_SINGLE_BINDING_FIXTURE.question)}</div>
      <h3>${physical ? "固定练习例子" : "固定合成临界例子"}</h3>
      <div class="boundary-table-wrap" tabindex="0" role="region" aria-label="${physical ? "固定练习例子" : "固定合成临界例子"}，可横向滚动">
        <table class="boundary-table">
          <thead><tr><th>助身侧比例</th><th>${physical ? "暂定分档" : "当前候选分档"}</th><th>说明</th></tr></thead>
          <tbody>${SYNTHETIC_SINGLE_BINDING_FIXTURE.boundaryExamples.map((item) => `<tr><td>${item.supportPercent}%</td><td>${escapeHtml(item.candidateBand)}</td><td>${physical ? "只展示草案边界，不代表准确" : "只展示候选边界，不证明准确"}</td></tr>`).join("")}</tbody>
        </table>
      </div>
      ${technicalDetails}
    </section>

    <section class="card" aria-labelledby="capture-title">
      <p class="eyebrow">第 2 步 · 先说明怎样填写</p>
      <h2 id="capture-title">本人输入，或协调人逐字代录</h2>
      <fieldset class="field-group" data-field-path="captureContext.entryMethod">
        <legend>请选择且只能选择一种填写方式</legend>
        <div class="option-list">${radioOptions("entry-method", ENTRY_METHOD_OPTIONS)}</div>
      </fieldset>
      <div id="transcription-panel" class="conditional-panel" hidden>
        <p class="transcription-warning">协调人只能逐字代录：不得概括、润色、改成项目术语，也不得替专家选择答案。听不清时应停下询问。</p>
        <label class="option-row"><input id="verbatim-ack" type="checkbox"><span>协调人自述：只逐字录入，没有概括、润色或替换术语；最终将由专家逐项听读或通读确认。</span></label>
      </div>
      <fieldset class="field-group" data-field-path="captureContext.assistanceCategories">
        <legend>作答时使用过哪些协助</legend>
        <span class="field-help">${physical
    ? "只记录类别，不写人名、账号或资料正文。这只是本人说明，不代表系统已经核实。"
    : "只记录类别，不写人名、账号或资料正文。这里是自述，不证明已经排除外部 AI 或他人影响。"}</span>
        <div class="option-list">${assistanceOptions()}</div>
      </fieldset>
    </section>

    <section class="card" aria-labelledby="response-title">
      <h2 id="response-title">请填写专业判断</h2>
      <p>“无法判断”是有效答案。请明确是材料不足、题意不清、超出流派，还是来源／版本不清。</p>
      <label class="option-row">
        <input id="synthetic-ack" type="checkbox">
        <span>${physical
    ? "我理解本页是固定练习题，不是任何真人资料；我不会填写姓名、联系方式、出生资料或真人案例。"
    : "我理解本页题面和材料全是合成的；自由文本仍按未评估私密内容处理，我不会填写任何真人或可识别个人资料。"}</span>
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

    <section class="card" aria-labelledby="readback-title">
      <p class="eyebrow">第 3 步 · 专家逐字读回</p>
      <h2 id="readback-title">核对全部文字，再完成本席</h2>
      <p>先生成核对稿。专家必须亲自通读，或由协调人逐项读回并由专家确认；任何修改都会立即使旧核对稿失效。</p>
      <div class="action-row"><button id="prepare-readback" class="button button-primary" type="button">生成逐字核对稿</button></div>
      <div id="error-summary" class="error-summary" role="alert" tabindex="-1" hidden></div>
      <section id="readback-panel" class="readback-panel" tabindex="-1" aria-live="polite" hidden>
        <h3>请专家逐字通读或听取以下核对稿</h3>
        <p>${physical
    ? "这里只显示本次编号、席位、题目和您的全部回答，不显示另一席状态或意见。"
    : "本核对稿已绑定本席完整 session；这里只显示轮次后缀、席位和题目，不显示另一席状态或意见。"}</p>
        <dl id="readback-grid" class="readback-grid"></dl>
      </section>
      <fieldset id="final-confirmations" class="final-confirmations" disabled>
        <legend>专家最终确认</legend>
        <div class="option-list">
          <label class="option-row"><input type="checkbox" data-final-key="fullTextReadBackAndAccurate"><span>我已逐字通读，或已逐项听完以上核对稿；这些文字准确表达我的意见。</span></label>
          <label class="option-row"><input type="checkbox" data-final-key="noCrossSeatOpinionAccess"><span>截至本次确认，我没有查看另一席的状态或意见。</span></label>
          <label class="option-row"><input type="checkbox" data-final-key="accuracyStudyExcluded"><span>${physical
    ? "我理解这不是人与电脑工具的准确度研究，也不会产生准确度结论。"
    : "我理解这不是专家与 AI 的准确度研究，也不会产生准确度结论。"}</span></label>
          <label class="option-row"><input type="checkbox" data-final-key="privateSyntheticHandling"><span>${physical
    ? "我理解题面是固定练习材料；结果不进入正式审定或公开发布。"
    : "我理解固定题面是合成的、自由文本仍未评估；结果只是私密内存演练候选，不进入正式审定或公开发布。"}</span></label>
        </div>
        <div class="action-row"><button id="finalize" class="button button-primary" type="button" disabled>${physical ? "确认并完成本席" : "确认并生成完整回件"}</button><button id="restart-readback" class="button button-secondary" type="button">修改内容并重新核对</button></div>
      </fieldset>
    </section>

    <section id="result" class="result-card" tabindex="-1" hidden>
      <p class="eyebrow">第 4 步 · 专家操作结束</p>
      <h2>${physical ? "本席复核练习已完成" : "本席合成演练回件已在内存生成"}</h2>
      ${resultDetails}
    </section>`;
}

function addTechnicalRow(list, label, value) {
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  const code = document.createElement("code");
  term.textContent = label;
  code.textContent = value;
  detail.append(code);
  list.append(term, detail);
}

function populateSessionTechnicalLedger() {
  const ledger = document.querySelector("#session-technical-ledger");
  if (!(ledger instanceof HTMLDListElement)) throw new Error("SESSION_LEDGER_INVALID");
  const rows = [
    ["binding mode", sessionBinding.bindingMode],
    ["review cycle", sessionBinding.reviewCycleId],
    ["pair run", sessionBinding.pairRunId],
    ["seat", sessionBinding.seatId],
    ["seat session nonce", sessionBinding.seatSessionNonce],
    ["pair precommit SHA-256", sessionBinding.pairPrecommitRawSha256],
    ["pair manifest SHA-256", sessionBinding.pairManifestRawSha256],
    ["seat package manifest SHA-256", sessionBinding.seatPackageManifestRawSha256],
    ["synthetic fixture manifest SHA-256", sessionBinding.syntheticRehearsalManifestDigest],
    ["candidate SHA-256", sessionBinding.candidateDigest],
    ["binding identity SHA-256", sessionBinding.bindingIdentityDigest]
  ];
  for (const [label, value] of rows) addTechnicalRow(ledger, label, value);
}

function getRequiredElement(selector, type) {
  const element = document.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`WORKFLOW_ELEMENT_INVALID:${selector}`);
  return element;
}

function wireWorkflow() {
  const physical = isPhysicalExpertMode();
  const innerDraft = draft.innerDraft;
  const syntheticAck = getRequiredElement("#synthetic-ack", HTMLInputElement);
  const cannotReasonPanel = getRequiredElement("#cannot-reason-panel", HTMLElement);
  const cannotReason = getRequiredElement("#cannot-reason", HTMLSelectElement);
  const transcriptionPanel = getRequiredElement("#transcription-panel", HTMLElement);
  const verbatimAck = getRequiredElement("#verbatim-ack", HTMLInputElement);
  const readbackPanel = getRequiredElement("#readback-panel", HTMLElement);
  const readbackGrid = getRequiredElement("#readback-grid", HTMLDListElement);
  const finalConfirmations = getRequiredElement("#final-confirmations", HTMLFieldSetElement);
  const errorSummary = getRequiredElement("#error-summary", HTMLElement);
  const result = getRequiredElement("#result", HTMLElement);
  const prepareButton = getRequiredElement("#prepare-readback", HTMLButtonElement);
  const finalizeButton = getRequiredElement("#finalize", HTMLButtonElement);
  const restartButton = getRequiredElement("#restart-readback", HTMLButtonElement);
  const downloadStatus = document.querySelector("#download-status");
  if (!physical && !(downloadStatus instanceof HTMLElement)) {
    throw new Error("WORKFLOW_ELEMENT_INVALID:#download-status");
  }

  function clearFinalConfirmations() {
    for (const control of document.querySelectorAll("[data-final-key]")) control.checked = false;
    for (const key of Object.keys(innerDraft.finalConfirmations)) innerDraft.finalConfirmations[key] = false;
    finalizeButton.disabled = true;
  }

  function invalidateReadback() {
    if (!readbackCandidate && !submissionCandidate && !handoffArtifacts) return;
    readbackCandidate = null;
    submissionCandidate = null;
    handoffArtifacts = null;
    clearFinalConfirmations();
    finalConfirmations.disabled = true;
    readbackPanel.hidden = true;
    result.hidden = true;
    prepareButton.disabled = false;
    prepareButton.textContent = "生成逐字核对稿";
    setBodyState("ready");
    announce("内容已改变；旧核对稿已失效，请重新生成。 ");
  }

  function showErrors(error) {
    const hasStructuredErrors = error instanceof SingleBindingRehearsalError
      && Array.isArray(error.errors) && error.errors.length > 0;
    const entries = hasStructuredErrors
      ? (physical
        ? error.errors.map((entry) => ({
          message: PHYSICAL_EXPERT_ERROR_MESSAGES.get(entry.code)
            ?? "这项内容未通过检查，请修改后再试。"
        }))
        : error.errors)
      : [{ message: physical
        ? "页面未能完成这一步，请把设备交回协调人。"
        : error instanceof Error ? error.message : "演练检查失败。" }];
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
    const checked = [...document.querySelectorAll('input[name="assistance"]:checked')]
      .map((control) => control.value);
    return ASSISTANCE_CATEGORY_OPTIONS.map((option) => option.value)
      .filter((value) => checked.includes(value));
  }

  function handleAssistanceChange(changed) {
    const exclusive = new Set(["none_declared", "unknown_or_not_disclosed"]);
    const controls = [...document.querySelectorAll('input[name="assistance"]')];
    if (changed.checked && exclusive.has(changed.value)) {
      for (const control of controls) if (control !== changed) control.checked = false;
    } else if (changed.checked) {
      for (const control of controls) if (exclusive.has(control.value)) control.checked = false;
    }
    innerDraft.captureContext.assistanceCategories = selectedAssistance();
  }

  function addReadbackRow(label, value) {
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    readbackGrid.append(term, detail);
  }

  function renderReadback(candidate) {
    const snapshot = candidate.sessionReadbackSnapshot.innerReviewSnapshot;
    const response = snapshot.reviewResponse;
    readbackGrid.replaceChildren();
    addReadbackRow(physical ? "本次编号" : "轮次后缀", cycleSuffix(sessionBinding.reviewCycleId));
    addReadbackRow(physical ? "复核席位" : "独立席位", snapshot.seatId);
    addReadbackRow(physical ? "本次题目" : "只审规则", SYNTHETIC_SINGLE_BINDING_FIXTURE.title);
    addReadbackRow("判断", labels.position.get(response.position) ?? response.position);
    addReadbackRow("无法判断原因", response.cannotDecideReason === null
      ? "不适用"
      : labels.cannotReason.get(response.cannotDecideReason) ?? response.cannotDecideReason);
    addReadbackRow("理由", response.rationale);
    addReadbackRow("成立条件", response.applicabilityConditions);
    addReadbackRow("反例或仍需证据", response.counterexamplesOrNeededEvidence);
    addReadbackRow("面向用户的处理", labels.risk.get(response.highRiskDisposition) ?? response.highRiskDisposition);
    addReadbackRow("修改建议", response.revisionSuggestion);
    addReadbackRow("填写方式", labels.entryMethod.get(snapshot.captureContext.entryMethod)
      ?? snapshot.captureContext.entryMethod);
    addReadbackRow(
      "协助披露（仅自述）",
      snapshot.captureContext.assistanceCategories
        .map((value) => (physical ? PHYSICAL_EXPERT_ASSISTANCE_LABELS : labels.assistance).get(value) ?? value)
        .join("；")
    );
    addReadbackRow(
      "准确度研究",
      physical
        ? "本流程未执行；不会产生人与电脑工具谁更准的结论"
        : "本流程未执行；不会产生专家与 AI 谁更准的结论"
    );
    readbackPanel.hidden = false;
    finalConfirmations.disabled = false;
    readbackPanel.focus();
  }

  function finalConfirmationsComplete() {
    return [...document.querySelectorAll("[data-final-key]")].every((control) => control.checked);
  }

  function setBusy(button, busy, busyLabel, readyLabel) {
    button.disabled = busy;
    button.textContent = busy ? busyLabel : readyLabel;
    main.setAttribute("aria-busy", String(busy));
  }

  function lockExpertControls() {
    for (const control of main.querySelectorAll("input, textarea, select, button")) {
      if ((!physical && control.matches("[data-download-role]")) || control === finalizeButton) continue;
      control.disabled = true;
    }
  }

  function downloadText(filename, text, mediaType, label) {
    if (physical || !(downloadStatus instanceof HTMLElement)) return;
    const blob = new Blob([text], { type: `${mediaType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    document.body.dataset.downloadState = "requested";
    downloadStatus.textContent = `已发起${label}的浏览器下载请求：${filename}。本页不证明文件已保存；请由协调人核对下载记录。`;
    announce(`已发起${label}下载请求；本页不证明文件已保存。`);
  }

  syntheticAck.addEventListener("change", () => {
    invalidateReadback();
    innerDraft.startAcknowledgement.syntheticOnly = syntheticAck.checked;
  });

  for (const control of document.querySelectorAll('input[name="position"]')) {
    control.setAttribute("aria-controls", "cannot-reason-panel");
    control.setAttribute("aria-expanded", "false");
    control.addEventListener("change", () => {
      invalidateReadback();
      innerDraft.reviewResponse.position = control.value;
      const cannot = control.value === "cannot_decide";
      cannotReasonPanel.hidden = !cannot;
      for (const peer of document.querySelectorAll('input[name="position"]')) {
        peer.setAttribute("aria-expanded", String(peer === control && cannot));
      }
      if (!cannot) {
        cannotReason.value = "";
        innerDraft.reviewResponse.cannotDecideReason = null;
      }
    });
  }

  cannotReason.addEventListener("change", () => {
    invalidateReadback();
    innerDraft.reviewResponse.cannotDecideReason = cannotReason.value || null;
  });

  const textBindings = new Map([
    ["#rationale", "rationale"],
    ["#conditions", "applicabilityConditions"],
    ["#counterexamples", "counterexamplesOrNeededEvidence"],
    ["#revision", "revisionSuggestion"]
  ]);
  for (const [selector, key] of textBindings) {
    getRequiredElement(selector, HTMLTextAreaElement).addEventListener("input", (event) => {
      invalidateReadback();
      innerDraft.reviewResponse[key] = event.target.value;
    });
  }

  getRequiredElement("#risk", HTMLSelectElement).addEventListener("change", (event) => {
    invalidateReadback();
    innerDraft.reviewResponse.highRiskDisposition = event.target.value;
  });

  for (const control of document.querySelectorAll('input[name="entry-method"]')) {
    control.setAttribute("aria-controls", "transcription-panel");
    control.setAttribute("aria-expanded", "false");
    control.addEventListener("change", () => {
      invalidateReadback();
      innerDraft.captureContext.entryMethod = control.value;
      const transcribed = control.value === "coordinator_verbatim_transcription";
      transcriptionPanel.hidden = !transcribed;
      for (const peer of document.querySelectorAll('input[name="entry-method"]')) {
        peer.setAttribute("aria-expanded", String(peer === control && transcribed));
      }
      verbatimAck.checked = false;
      innerDraft.captureContext.coordinatorVerbatimNoSummarySelfDeclared = false;
    });
  }

  verbatimAck.addEventListener("change", () => {
    invalidateReadback();
    innerDraft.captureContext.coordinatorVerbatimNoSummarySelfDeclared = verbatimAck.checked;
  });

  for (const control of document.querySelectorAll('input[name="assistance"]')) {
    control.addEventListener("change", () => {
      invalidateReadback();
      handleAssistanceChange(control);
    });
  }

  for (const control of document.querySelectorAll("[data-final-key]")) {
    control.addEventListener("change", () => {
      innerDraft.finalConfirmations[control.dataset.finalKey] = control.checked;
      finalizeButton.disabled = !finalConfirmationsComplete();
    });
  }

  prepareButton.addEventListener("click", async () => {
    setBusy(prepareButton, true, "正在生成核对稿……", "生成逐字核对稿");
    try {
      hideErrors();
      readbackCandidate = await prepareSingleBindingIntegratedReadback(draft);
      submissionCandidate = null;
      handoffArtifacts = null;
      clearFinalConfirmations();
      renderReadback(readbackCandidate);
      result.hidden = true;
      setBodyState("readback_ready");
      announce("逐字核对稿已生成；请专家本人通读或逐项听取后完成确认。 ");
    } catch (error) {
      readbackCandidate = null;
      showErrors(error);
    } finally {
      setBusy(prepareButton, false, "正在生成核对稿……", "生成逐字核对稿");
      if (readbackCandidate !== null) {
        prepareButton.disabled = true;
        prepareButton.textContent = "核对稿已生成";
      }
    }
  });

  restartButton.addEventListener("click", () => {
    readbackCandidate = null;
    submissionCandidate = null;
    handoffArtifacts = null;
    clearFinalConfirmations();
    finalConfirmations.disabled = true;
    readbackPanel.hidden = true;
    result.hidden = true;
    prepareButton.disabled = false;
    prepareButton.textContent = "生成逐字核对稿";
    setBodyState("ready");
    getRequiredElement("#response-title", HTMLElement).scrollIntoView({ block: "start" });
    announce("核对稿已撤下；修改后请重新生成并逐字核对。 ");
  });

  finalizeButton.addEventListener("click", async () => {
    setBusy(
      finalizeButton,
      true,
      physical ? "正在完成……" : "正在生成完整回件……",
      physical ? "确认并完成本席" : "确认并生成完整回件"
    );
    restartButton.disabled = true;
    try {
      hideErrors();
      if (submissionCandidate === null) {
        submissionCandidate = await finalizeSingleBindingIntegratedSubmission(draft, readbackCandidate);
        lockExpertControls();
      }
      const candidateArtifacts = await createSingleBindingIntegratedHandoffArtifacts(submissionCandidate);
      if (physical) await submitPhysicalCompleteReturn(candidateArtifacts);
      handoffArtifacts = candidateArtifacts;
      if (!physical) {
        getRequiredElement("#complete-return-filename", HTMLElement).textContent = handoffArtifacts.completeReturnFilename;
        getRequiredElement("#complete-return-sha", HTMLElement).textContent = handoffArtifacts.completeReturnRawSha256;
        getRequiredElement("#session-submission-sha", HTMLElement).textContent = handoffArtifacts.sessionSubmissionRawSha256;
        getRequiredElement("#seal-receipt-sha", HTMLElement).textContent = handoffArtifacts.sealReceiptRawSha256;
      }
      result.hidden = false;
      finalizeButton.disabled = true;
      finalizeButton.textContent = "本席已完成";
      setBodyState("finalized");
      result.focus();
      announce(physical
        ? "本席复核练习已完成；请把设备交回协调人。 "
        : "本席合成演练回件已在内存生成；请把设备交回协调人。 ");
    } catch (error) {
      if (!(error instanceof SingleBindingIntegratedError)
        && !(error instanceof SingleBindingIntegratedHandoffError)
        && !(error instanceof SingleBindingRehearsalError)) {
        showErrors(new Error("无法生成本席完整回件。"));
      } else {
        showErrors(error);
      }
      if (submissionCandidate === null) {
        readbackCandidate = null;
        clearFinalConfirmations();
        finalConfirmations.disabled = true;
        readbackPanel.hidden = true;
        prepareButton.disabled = false;
        prepareButton.textContent = "重新生成逐字核对稿";
      }
    } finally {
      main.setAttribute("aria-busy", "false");
      if (handoffArtifacts === null) {
        finalizeButton.textContent = submissionCandidate === null
          ? "重新生成核对稿后再完成"
          : physical ? "重试完成本席" : "重试生成完整回件";
        finalizeButton.disabled = submissionCandidate === null;
        restartButton.disabled = submissionCandidate !== null;
      }
    }
  });

  for (const button of document.querySelectorAll("[data-download-role]")) {
    button.addEventListener("click", () => {
      if (!handoffArtifacts || document.body.dataset.integratedState !== "finalized") return;
      if (button.dataset.downloadRole === "complete-return") {
        downloadText(
          handoffArtifacts.completeReturnFilename,
          handoffArtifacts.completeReturnText,
          "application/json",
          "完整回件"
        );
        return;
      }
      const sidecarFilename = `${handoffArtifacts.completeReturnFilename}.sha256.txt`;
      const sidecarText = `${handoffArtifacts.completeReturnRawSha256}  ${handoffArtifacts.completeReturnFilename}\n`;
      downloadText(sidecarFilename, sidecarText, "text/plain", "包外 SHA-256 校验值");
    });
  }
}

try {
  if (SINGLE_BINDING_INTEGRATED_BOUNDARY.verifiedExpertCount !== 0
    || SINGLE_BINDING_INTEGRATED_BOUNDARY.frozenBindingCount !== 0
    || SINGLE_BINDING_INTEGRATED_BOUNDARY.formalAdmissionAllowed !== false
    || SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY.formalAdmissionAllowed !== false
    || SYNTHETIC_REHEARSAL_FIXTURE_REF.formalReviewInputManifestAuthorityEstablished !== false) {
    throw new Error("SINGLE_BINDING_INTEGRATED_AUTHORITY_BOUNDARY_INVALID");
  }
  sessionBinding = readInjectedSessionBinding();
  draft = createSingleBindingIntegratedDraft(sessionBinding);
  renderWorkflow();
  if (!isPhysicalExpertMode()) populateSessionTechnicalLedger();
  wireWorkflow();
  main.setAttribute("aria-busy", "false");
  setBodyState("ready");
  announce("本席合成题面已准备；请从第一步开始阅读。 ");
} catch (error) {
  blockBoot(error);
}
