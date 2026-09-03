import {
  PilotPairComparisonError,
  comparePilotCompleteSubmissions
} from "./pair-comparison.js";

const cycleInput = document.querySelector("#review-cycle");
const pinAInput = document.querySelector("#pin-a");
const pinBInput = document.querySelector("#pin-b");
const fileAInput = document.querySelector("#file-a");
const fileBInput = document.querySelector("#file-b");
const compareButton = document.querySelector("#compare");
const clearButton = document.querySelector("#clear");
const status = document.querySelector("#status");
const errorPanel = document.querySelector("#error");
const resultHost = document.querySelector("#result");
const MAX_COMPLETE_SUBMISSION_BYTES = 5 * 1024 * 1024;
let operationGeneration = 0;
const bindingInputs = [cycleInput, pinAInput, pinBInput, fileAInput, fileBInput];

if (!(cycleInput instanceof HTMLInputElement)
  || !(pinAInput instanceof HTMLInputElement)
  || !(pinBInput instanceof HTMLInputElement)
  || !(fileAInput instanceof HTMLInputElement)
  || !(fileBInput instanceof HTMLInputElement)
  || !(compareButton instanceof HTMLButtonElement)
  || !(clearButton instanceof HTMLButtonElement)
  || !(status instanceof HTMLElement)
  || !(errorPanel instanceof HTMLElement)
  || !(resultHost instanceof HTMLElement)) {
  throw new Error("pair comparison page identity invalid");
}

function textValue(value) {
  if (Array.isArray(value)) return value.length === 0 ? "（空）" : value.join("、");
  if (value === null) return "（无）";
  return String(value);
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function valueCard(seat, value) {
  const host = element("div", "seat-value");
  host.append(element("strong", "", `${seat} 席字段显示值`));
  host.append(element("pre", "", textValue(value)));
  return host;
}

function comparisonRow(entry) {
  const host = element("article", "comparison-row");
  host.dataset.classification = entry.classification;
  const heading = element("div", "row-heading");
  heading.append(element("h3", "", entry.fieldLabel));
  heading.append(element(
    "span",
    entry.classification === "difference" ? "badge badge-difference" : "badge badge-match",
    entry.classification === "difference" ? "存在差异" : "规范字段值一致"
  ));
  host.append(heading);
  const values = element("div", "comparison-values");
  values.append(valueCard("A", entry.seatAValue), valueCard("B", entry.seatBValue));
  host.append(values);
  if (entry.classification === "difference") {
    host.append(element("p", "unresolved", "未解决：本工具不会替人选择、合并或评分。"));
  }
  return host;
}

function comparisonGroup(title, description, rows) {
  const host = element("section", "comparison-group");
  const heading = element("header", "group-heading");
  heading.append(element("h2", "", title), element("p", "", description));
  host.append(heading);
  for (const entry of rows) host.append(comparisonRow(entry));
  return host;
}

function summaryItem(label, value) {
  const host = element("div");
  host.append(element("dt", "", label), element("dd", "", String(value)));
  return host;
}

function renderResult(candidate) {
  resultHost.replaceChildren();
  const summary = element("section", "summary-card");
  const heading = element("header", "summary-heading");
  const titleBlock = element("div");
  titleBlock.append(element("h2", "", "机械并列完成"), element("p", "", "以下只报告相同与不同，不产生裁决。"));
  heading.append(titleBlock, element("code", "", candidate.comparisonId));
  summary.append(heading);
  const metrics = element("dl", "summary-grid");
  metrics.append(
    summaryItem("比较字段", candidate.totalComparedFieldCount),
    summaryItem("相同", candidate.exactMatchCount),
    summaryItem("未解决差异", candidate.unresolvedDifferenceCount),
    summaryItem("正式专家计数变化", candidate.comparisonBoundary.formalTwoOfTwoCountDelta)
  );
  summary.append(metrics);
  summary.append(element(
    "p",
    "summary-note",
    "两席都曾自述未查看对方意见，但这仍不证明现实独立；结果含可能由个人材料派生的内容，只能私密、仓外、当前内存查看。"
  ));
  resultHost.append(summary);

  resultHost.append(comparisonGroup(
    "自述流派与复核范围",
    "范围不同不是输赢，需要协调人确认两席是否在同一问题上具有可比较的专业范围。",
    candidate.reviewerContextRows
  ));

  const scenarioGroups = new Map();
  for (const entry of candidate.scenarioRows) {
    if (!scenarioGroups.has(entry.sectionId)) scenarioGroups.set(entry.sectionId, []);
    scenarioGroups.get(entry.sectionId).push(entry);
  }
  for (const rows of scenarioGroups.values()) {
    resultHost.append(comparisonGroup(rows[0].sectionTitle, "逐项保留 A、B 原始选择和文字。", rows));
  }

  const overallGroups = new Map();
  for (const entry of candidate.overallQuestionRows) {
    if (!overallGroups.has(entry.sectionId)) overallGroups.set(entry.sectionId, []);
    overallGroups.get(entry.sectionId).push(entry);
  }
  for (const rows of overallGroups.values()) {
    resultHost.append(comparisonGroup(
      `总体问题 · ${rows[0].sectionTitle}`,
      "差异保持 unresolved；只能安排人工复核，当前页不生成正式分歧清单或 reconciliation。",
      rows
    ));
  }
  resultHost.hidden = false;
  resultHost.focus({ preventScroll: true });
  resultHost.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showError(error) {
  const code = error instanceof PilotPairComparisonError ? `${error.code}：` : "";
  errorPanel.textContent = `${code}${error instanceof Error ? error.message : "无法完成并列。"}`;
  errorPanel.hidden = false;
  errorPanel.focus();
}

function resetOutput() {
  errorPanel.hidden = true;
  errorPanel.textContent = "";
  resultHost.hidden = true;
  resultHost.replaceChildren();
  status.textContent = "";
}

function setBusy(busy) {
  compareButton.disabled = busy;
  clearButton.disabled = busy;
  for (const input of bindingInputs) input.disabled = busy;
}

async function readSelectedFile(file, label) {
  if (!file) throw new PilotPairComparisonError("FILE_REQUIRED", `请选择${label}完整回件。`);
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_COMPLETE_SUBMISSION_BYTES) {
    throw new PilotPairComparisonError("FILE_SIZE_INVALID", `${label}完整回件必须非空且不超过 5 MiB。`);
  }
  return new Uint8Array(await file.arrayBuffer());
}

compareButton.addEventListener("click", async () => {
  const thisGeneration = ++operationGeneration;
  const snapshot = Object.freeze({
    reviewCycleId: cycleInput.value.trim(),
    seatAManifestRawSha256: pinAInput.value.trim(),
    seatBManifestRawSha256: pinBInput.value.trim(),
    seatAFile: fileAInput.files?.[0] ?? null,
    seatBFile: fileBInput.files?.[0] ?? null
  });
  resetOutput();
  setBusy(true);
  status.textContent = "正在本机内存中校验两份回件……";
  try {
    const [seatABytes, seatBBytes] = await Promise.all([
      readSelectedFile(snapshot.seatAFile, " A 席"),
      readSelectedFile(snapshot.seatBFile, " B 席")
    ]);
    const candidate = await comparePilotCompleteSubmissions({
      seatABytes,
      seatBBytes,
      expected: {
        reviewCycleId: snapshot.reviewCycleId,
        seatAManifestRawSha256: snapshot.seatAManifestRawSha256,
        seatBManifestRawSha256: snapshot.seatBManifestRawSha256
      }
    });
    if (thisGeneration !== operationGeneration) return;
    renderResult(candidate);
    status.textContent = "并列结果已生成；刷新或关闭页面会丢失。";
  } catch (error) {
    if (thisGeneration !== operationGeneration) return;
    status.textContent = "校验失败；未生成并列结果。";
    showError(error);
  } finally {
    if (thisGeneration === operationGeneration) {
      setBusy(false);
    }
  }
});

clearButton.addEventListener("click", () => {
  operationGeneration += 1;
  setBusy(false);
  cycleInput.value = "";
  pinAInput.value = "";
  pinBInput.value = "";
  fileAInput.value = "";
  fileBInput.value = "";
  resetOutput();
  cycleInput.focus();
});

for (const input of bindingInputs) {
  input.addEventListener(input.type === "file" ? "change" : "input", () => {
    operationGeneration += 1;
    resetOutput();
  });
}
