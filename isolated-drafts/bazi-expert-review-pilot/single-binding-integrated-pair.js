import {
  ASSISTANCE_CATEGORY_OPTIONS,
  CANNOT_DECIDE_REASON_OPTIONS,
  HIGH_RISK_OPTIONS,
  POSITION_OPTIONS
} from "./single-binding-rehearsal-contract.js";
import {
  createSingleBindingIntegratedSessionBinding
} from "./single-binding-integrated-contract.js";
import {
  SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES,
  parseSingleBindingIntegratedStrictJsonText
} from "./single-binding-integrated-json.js";
import {
  SingleBindingIntegratedHandoffError,
  compareSingleBindingIntegratedCompleteReturns,
  singleBindingIntegratedFilenamesForSession
} from "./single-binding-integrated-handoff.js";

const main = document.querySelector("#main");
const announcer = document.querySelector("#announcer");

if (!(main instanceof HTMLElement) || !(announcer instanceof HTMLElement)) {
  throw new Error("SINGLE_BINDING_INTEGRATED_PAIR_BOOT_INVALID");
}

const FIELD_LABELS = new Map([
  ["position", "专业判断"],
  ["cannotDecideReason", "无法判断原因"],
  ["rationale", "理由"],
  ["applicabilityConditions", "成立条件"],
  ["counterexamplesOrNeededEvidence", "反例或仍需证据"],
  ["highRiskDisposition", "面向用户的处理"],
  ["revisionSuggestion", "改写或补充建议"]
]);
const VALUE_LABELS = new Map([
  ...POSITION_OPTIONS.map((item) => [item.value, item.label]),
  ...CANNOT_DECIDE_REASON_OPTIONS.map((item) => [item.value, item.label]),
  ...HIGH_RISK_OPTIONS.map((item) => [item.value, item.label]),
  ...ASSISTANCE_CATEGORY_OPTIONS.map((item) => [item.value, item.label])
]);

function announce(message) {
  announcer.textContent = "";
  requestAnimationFrame(() => { announcer.textContent = message; });
}

function bootFailure(error) {
  document.body.dataset.pairState = "blocked";
  main.replaceChildren();
  const section = document.createElement("section");
  section.className = "error-summary";
  section.setAttribute("role", "alert");
  const heading = document.createElement("h2");
  heading.textContent = "本轮会话边界无效，页面已停止";
  const paragraph = document.createElement("p");
  paragraph.textContent = error instanceof Error ? error.message : "无法核对注入的会话边界。";
  section.append(heading, paragraph);
  main.append(section);
}

function sessionFromMeta(name, expectedSeatId) {
  const meta = document.querySelector(`meta[name="${name}"]`);
  const content = meta?.getAttribute("content");
  if (typeof content !== "string" || content.length === 0 || content.includes("__HAKIMI_")) {
    throw new Error(`${expectedSeatId} 席会话边界未由本机启动器注入。`);
  }
  const parsed = parseSingleBindingIntegratedStrictJsonText(content, {
    label: `${expectedSeatId} 席会话边界`,
    maxBytes: 64 * 1024
  });
  const session = createSingleBindingIntegratedSessionBinding(parsed);
  if (session.seatId !== expectedSeatId) throw new Error(`${expectedSeatId} 席会话边界席位不匹配。`);
  return session;
}

let seatASession;
let seatBSession;
try {
  seatASession = sessionFromMeta("hakimi-single-binding-seat-a-session", "A");
  seatBSession = sessionFromMeta("hakimi-single-binding-seat-b-session", "B");
  for (const key of [
    "workflowVersion", "bindingMode", "reviewCycleId", "pairRunId",
    "pairPrecommitRawSha256", "pairManifestRawSha256",
    "syntheticRehearsalManifestDigest", "fixtureContentDigest", "questionSetDigest",
    "candidateDigest", "bindingId", "bindingIdentityDigest", "selectedBindingCount"
  ]) {
    if (seatASession[key] !== seatBSession[key]) throw new Error(`A/B 会话的 ${key} 不匹配。`);
  }
  if (seatASession.seatSessionNonce === seatBSession.seatSessionNonce
    || seatASession.seatPackageManifestRawSha256 === seatBSession.seatPackageManifestRawSha256) {
    throw new Error("A/B 会话的席位 nonce 或包 pin 没有保持独立。 ");
  }
} catch (error) {
  bootFailure(error);
  throw error;
}

const cycleSuffix = seatASession.reviewCycleId.slice(-8);
const pairSuffix = seatASession.pairRunId.slice(-8);

main.innerHTML = `
  <section class="warning-banner" aria-labelledby="pair-warning-title">
    <h2 id="pair-warning-title">这里只并列两份合成演练回件</h2>
    <p>本页不连接网络、不判断哪位更准，也不把相同意见当真理。差异保持未解决，交由现实专家分别补充理由；不得多数表决、平均或由生成模型自动选赢家。</p>
  </section>

  <section class="card" aria-labelledby="session-title">
    <h2 id="session-title">先核对本轮标签</h2>
    <div class="session-strip">
      <div class="session-item"><strong>合成轮次</strong><span id="cycle-label"></span></div>
      <div class="session-item"><strong>独立席位</strong><span>A 与 B（各自单独回件）</span></div>
      <div class="session-item"><strong>配对批次</strong><span id="pair-label"></span></div>
      <div class="session-item"><strong>本次范围</strong><span>仅 1 条规则候选</span></div>
    </div>
    <details class="technical-details"><summary>协调人查看完整技术绑定</summary><p>A session：<code id="session-a-code"></code></p><p>B session：<code id="session-b-code"></code></p><p>这些 hash 不是签名、本人认证、可信时间或保管链。</p></details>
  </section>

  <section class="card" aria-labelledby="upload-title">
    <h2 id="upload-title">选择两席交回的 4 个文件</h2>
    <p>每席选择一份完整回件 JSON，以及专家端同时发起下载的包外 SHA-256 校验值文件。不得交换 A/B 标签。</p>
    <div class="upload-grid">
      <section class="upload-seat" aria-labelledby="seat-a-title">
        <h3 id="seat-a-title">席位 A</h3>
        <label class="field-stack" for="seat-a-return"><span class="field-label">A 完整回件</span><span class="field-help">保持原名；浏览器自动附加 (1) 时也可选择，仍会核对内容和会话。</span><input id="seat-a-return" type="file" accept=".json,application/json"></label>
        <label class="field-stack" for="seat-a-pin"><span class="field-label">A 包外校验值</span><span class="field-help">与完整回件分开的 .sha256.txt；允许浏览器自动附加的编号。</span><input id="seat-a-pin" type="file" accept=".txt,text/plain"></label>
      </section>
      <section class="upload-seat" aria-labelledby="seat-b-title">
        <h3 id="seat-b-title">席位 B</h3>
        <label class="field-stack" for="seat-b-return"><span class="field-label">B 完整回件</span><span class="field-help">保持原名；浏览器自动附加 (1) 时也可选择，仍会核对内容和会话。</span><input id="seat-b-return" type="file" accept=".json,application/json"></label>
        <label class="field-stack" for="seat-b-pin"><span class="field-label">B 包外校验值</span><span class="field-help">与完整回件分开的 .sha256.txt；允许浏览器自动附加的编号。</span><input id="seat-b-pin" type="file" accept=".txt,text/plain"></label>
      </section>
    </div>
    <div class="action-row"><button id="compare" class="button button-primary" type="button">校验并并列 A/B</button><button id="clear" class="button button-secondary" type="button">清空选择</button></div>
    <div id="error-summary" class="error-summary" role="alert" tabindex="-1" hidden></div>
  </section>

  <section id="result" class="result-card" tabindex="-1" hidden aria-labelledby="result-title">
    <p class="eyebrow">机械校验候选</p>
    <h2 id="result-title">A/B 已按固定 7 个专业字段并列</h2>
    <p id="comparison-summary"></p>
    <div class="ledger-zero">
      <div><strong>0 / 2</strong><span>现实专家</span></div>
      <div><strong>0 / 12</strong><span>冻结 Binding</span></div>
      <div><strong>false</strong><span>专家真值</span></div>
      <div><strong>false</strong><span>发布授权</span></div>
    </div>
    <div class="comparison-wrap" tabindex="0" role="region" aria-label="A/B 专业字段并列表，可横向滚动">
      <table>
        <thead><tr><th>字段</th><th>席位 A</th><th>席位 B</th><th>机械状态</th></tr></thead>
        <tbody id="comparison-rows"></tbody>
      </table>
    </div>
    <p><strong>所有差异都保持未解决。</strong> 后续只能分别回问理由和适用条件，不能投票、平均、自动合并或让模型选赢家。</p>
    <details class="technical-details"><summary>协调人查看本次机械校验摘要</summary><p>comparison digest：<code id="comparison-digest"></code></p><p>A raw SHA-256：<code id="seat-a-raw"></code></p><p>B raw SHA-256：<code id="seat-b-raw"></code></p></details>
  </section>`;

document.querySelector("#cycle-label").textContent = `…${cycleSuffix}`;
document.querySelector("#pair-label").textContent = `…${pairSuffix}`;
document.querySelector("#session-a-code").textContent = JSON.stringify(seatASession);
document.querySelector("#session-b-code").textContent = JSON.stringify(seatBSession);

const compareButton = document.querySelector("#compare");
const clearButton = document.querySelector("#clear");
const errorSummary = document.querySelector("#error-summary");
const result = document.querySelector("#result");
const comparisonRows = document.querySelector("#comparison-rows");
const fileControls = {
  seatAReturn: document.querySelector("#seat-a-return"),
  seatAPin: document.querySelector("#seat-a-pin"),
  seatBReturn: document.querySelector("#seat-b-return"),
  seatBPin: document.querySelector("#seat-b-pin")
};
if (Object.values(fileControls).some((control) => !(control instanceof HTMLInputElement))) {
  throw new Error("SINGLE_BINDING_INTEGRATED_PAIR_FILE_CONTROLS_INVALID");
}
let selectionEpoch = 0;

function showError(error) {
  errorSummary.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = "未通过机械校验";
  const paragraph = document.createElement("p");
  const code = error instanceof SingleBindingIntegratedHandoffError ? `${error.code}：` : "";
  paragraph.textContent = `${code}${error instanceof Error ? error.message : "无法校验回件。"}`;
  errorSummary.append(heading, paragraph);
  errorSummary.hidden = false;
  errorSummary.focus();
  result.hidden = true;
  document.body.dataset.pairState = "error";
  announce("A/B 回件没有通过机械校验。 ");
}

function hideError() {
  errorSummary.hidden = true;
  errorSummary.replaceChildren();
}

function setFileControlsDisabled(disabled) {
  for (const control of Object.values(fileControls)) control.disabled = disabled;
}

function invalidateComparison(message = "文件选择已改变；旧机械校验结果已失效。 ") {
  selectionEpoch += 1;
  hideError();
  result.hidden = true;
  comparisonRows.replaceChildren();
  document.body.dataset.pairState = "initial";
  announce(message);
}

function selectedFile(control, label) {
  const files = control.files;
  if (!files || files.length !== 1) throw new Error(`请选择一份${label}。`);
  return files[0];
}

async function exactFileBytes(file, label, maxBytes) {
  if (!(file instanceof File) || file.size <= 0 || file.size > maxBytes) {
    throw new Error(`${label}必须非空且不超过 ${maxBytes} 字节。`);
  }
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength !== file.size) throw new Error(`${label}读取期间发生变化。`);
  return new Uint8Array(buffer);
}

function expectedNames(sessionBinding) {
  const complete = singleBindingIntegratedFilenamesForSession(sessionBinding).completeReturnFilename;
  return { complete, checksum: `${complete}.sha256.txt` };
}

function matchesBrowserDownloadFilename(actual, expected) {
  if (actual === expected) return true;
  const extensionIndex = expected.lastIndexOf(".");
  if (extensionIndex <= 0) return false;
  const expectedStem = expected.slice(0, extensionIndex);
  const extension = expected.slice(extensionIndex);
  if (!actual.startsWith(`${expectedStem} (`) || !actual.endsWith(`)${extension}`)) return false;
  const ordinal = actual.slice(expectedStem.length + 2, -(extension.length + 1));
  return /^[1-9][0-9]*$/u.test(ordinal);
}

async function expectedRawShaFromSidecar(file, seatId) {
  const session = seatId === "A" ? seatASession : seatBSession;
  const names = expectedNames(session);
  if (!matchesBrowserDownloadFilename(file.name, names.checksum)) {
    throw new Error(`${seatId} 席包外校验值文件名无效。`);
  }
  const bytes = await exactFileBytes(file, `${seatId} 席包外校验值`, 1024);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error(`${seatId} 席包外校验值不得包含 BOM。`);
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${seatId} 席包外校验值不是严格 UTF-8。`);
  }
  const match = /^([a-f0-9]{64})  ([A-Za-z0-9._-]+)\n$/u.exec(text);
  if (!match || match[2] !== names.complete || /^0{64}$/u.test(match[1])) {
    throw new Error(`${seatId} 席包外校验值内容或目标文件名无效。`);
  }
  return match[1];
}

function displayValue(value) {
  if (value === null) return "不适用";
  if (typeof value === "string") return VALUE_LABELS.get(value) ?? value;
  return JSON.stringify(value);
}

function renderComparison(candidate) {
  comparisonRows.replaceChildren();
  for (const row of candidate.professionalFieldRows) {
    const tr = document.createElement("tr");
    tr.className = row.classification === "difference" ? "difference" : "match";
    const field = document.createElement("th");
    field.scope = "row";
    field.textContent = FIELD_LABELS.get(row.fieldId) ?? row.fieldId;
    const a = document.createElement("td");
    a.textContent = displayValue(row.seatAValue);
    const b = document.createElement("td");
    b.textContent = displayValue(row.seatBValue);
    const status = document.createElement("td");
    status.className = "classification";
    status.textContent = row.classification === "difference" ? "不同 · 未解决" : "字节值一致";
    tr.append(field, a, b, status);
    comparisonRows.append(tr);
  }
  document.querySelector("#comparison-summary").textContent =
    `共 ${candidate.totalComparedFieldCount} 个字段；${candidate.exactMatchCount} 个字节值一致，${candidate.unresolvedDifferenceCount} 个差异保持未解决。`;
  document.querySelector("#comparison-digest").textContent = candidate.comparisonDigest;
  document.querySelector("#seat-a-raw").textContent = candidate.independentRecordContexts.A.completeReturnRawSha256;
  document.querySelector("#seat-b-raw").textContent = candidate.independentRecordContexts.B.completeReturnRawSha256;
  result.hidden = false;
  document.body.dataset.pairState = "compared";
  result.focus();
  announce("A/B 完整回件已通过本轮机械校验，差异已并列且保持未解决。 ");
}

compareButton.addEventListener("click", async () => {
  const operationEpoch = selectionEpoch + 1;
  selectionEpoch = operationEpoch;
  hideError();
  result.hidden = true;
  comparisonRows.replaceChildren();
  document.body.dataset.pairState = "checking";
  compareButton.disabled = true;
  clearButton.disabled = true;
  setFileControlsDisabled(true);
  let selectedFiles = null;
  try {
    const aReturnFile = selectedFile(fileControls.seatAReturn, "A 席完整回件");
    const aPinFile = selectedFile(fileControls.seatAPin, "A 席包外校验值");
    const bReturnFile = selectedFile(fileControls.seatBReturn, "B 席完整回件");
    const bPinFile = selectedFile(fileControls.seatBPin, "B 席包外校验值");
    selectedFiles = [aReturnFile, aPinFile, bReturnFile, bPinFile];
    const aNames = expectedNames(seatASession);
    const bNames = expectedNames(seatBSession);
    if (!matchesBrowserDownloadFilename(aReturnFile.name, aNames.complete)) {
      throw new Error("A 席完整回件文件名无效。 ");
    }
    if (!matchesBrowserDownloadFilename(bReturnFile.name, bNames.complete)) {
      throw new Error("B 席完整回件文件名无效。 ");
    }
    const [seatABytes, seatBBytes, seatARawSha256, seatBRawSha256] = await Promise.all([
      exactFileBytes(aReturnFile, "A 席完整回件", SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES),
      exactFileBytes(bReturnFile, "B 席完整回件", SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES),
      expectedRawShaFromSidecar(aPinFile, "A"),
      expectedRawShaFromSidecar(bPinFile, "B")
    ]);
    const candidate = await compareSingleBindingIntegratedCompleteReturns({
      seatABytes,
      seatBBytes,
      expected: {
        seatASessionBinding: seatASession,
        seatBSessionBinding: seatBSession,
        seatACompleteReturnRawSha256: seatARawSha256,
        seatBCompleteReturnRawSha256: seatBRawSha256
      }
    });
    const controls = Object.values(fileControls);
    if (selectionEpoch !== operationEpoch
      || selectedFiles.some((file, index) => controls[index].files?.length !== 1
        || controls[index].files[0] !== file)) {
      return;
    }
    renderComparison(candidate);
  } catch (error) {
    if (selectionEpoch === operationEpoch) showError(error);
  } finally {
    setFileControlsDisabled(false);
    compareButton.disabled = false;
    clearButton.disabled = false;
  }
});

for (const control of Object.values(fileControls)) {
  control.addEventListener("change", () => invalidateComparison());
}

clearButton.addEventListener("click", () => {
  invalidateComparison("文件选择和并列结果已从当前页面清空。 ");
  for (const control of Object.values(fileControls)) control.value = "";
  fileControls.seatAReturn.focus();
});
