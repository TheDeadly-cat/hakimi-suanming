import {
  CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
  verifyCrossSystemReadonlyComparisonDraft
} from "../index.ts";

const DEFAULT_PAYLOAD = {
  schemaVersion: CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
  envelopeVersion: 1,
  createdAt: "2026-08-11T00:00:00.000Z",
  factsFrozen: true,
  noScoring: true,
  noAutoPersonMerge: true,
  systems: [
    {
      systemId: "bazi",
      artifactKind: "bazi_revision_summary",
      label: "八字修订摘要",
      frozenFacts: [
        { field: "pillars.day.ganZhi", value: "甲子" },
        { field: "ruleProfileId", value: "ziping-working-default" }
      ],
      ruleIdentity: { profileId: "ziping-working-default", profileVersion: "0.1.0" },
      sourceRefs: ["bazi revision R1"],
      boundary: {
        productionEligible: false,
        expertTruthClaimed: false,
        successReceiptIssued: false
      }
    },
    {
      systemId: "ziwei-doushu",
      artifactKind: "ziwei_revision_summary",
      label: "紫微修订摘要",
      frozenFacts: [
        { field: "palaces.lifePalace.gongZhi", value: "卯" },
        { field: "ruleProfileId", value: "ziwei-workspace-draft" }
      ],
      ruleIdentity: { profileId: "ziwei-workspace-draft", profileVersion: "0.1.0-draft" },
      sourceRefs: ["ziwei revision draft"],
      boundary: {
        productionEligible: false,
        expertTruthClaimed: false,
        successReceiptIssued: false
      }
    }
  ],
  explicitSubjectLink: {
    label: "显式关联人物",
    confirmedByUser: true,
    removable: true
  },
  contentSha256: "c62140c222e985a756161a73efad9e651af4bb59c03aa49657174ca79d9f1502"
};

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`页面缺少 #${id}`);
  return element as T;
}

const textarea = requireElement<HTMLTextAreaElement>("payload-json");
const verifyButton = requireElement<HTMLButtonElement>("verify-button");
const formError = requireElement<HTMLParagraphElement>("form-error");
const status = requireElement<HTMLParagraphElement>("workspace-status");
const resultSection = requireElement<HTMLElement>("result-section");
const resultMeta = requireElement<HTMLElement>("result-meta");
const systemResults = requireElement<HTMLElement>("system-results");
const boundaryNote = requireElement<HTMLParagraphElement>("boundary-note");
const reasonsSection = requireElement<HTMLElement>("reasons-section");
const reasonsList = requireElement<HTMLUListElement>("reasons-list");

function setStatus(message: string, state: string): void {
  status.textContent = message;
  status.dataset.state = state;
}

function showError(message: string): void {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError(): void {
  formError.hidden = true;
  formError.textContent = "";
}

function renderMeta(value: Readonly<{
  contentSha256: string;
  explicitSubjectLink: Readonly<{ label: string }> | null;
}>): void {
  resultMeta.replaceChildren();
  const rows: Array<[string, string]> = [
    ["内容地址", value.contentSha256],
    ["人物关联", value.explicitSubjectLink?.label ?? "未关联人物（允许）"]
  ];
  for (const [label, text] of rows) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.textContent = text;
    row.append(term, detail);
    resultMeta.append(row);
  }
}

function renderSystem(summary: {
  label: string;
  systemId: string;
  frozenFacts: ReadonlyArray<{ field: string; value: string; sourceRef?: string }>;
  ruleIdentity: { profileId: string; profileVersion: string };
  sourceRefs: readonly string[];
}): void {
  const section = document.createElement("section");
  section.className = "system-result";
  const heading = document.createElement("h3");
  heading.textContent = `${summary.label}（${summary.systemId}）`;
  section.append(heading);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["事实字段", "冻结值", "来源"]) {
    const cell = document.createElement("th");
    cell.textContent = label;
    headerRow.append(cell);
  }
  thead.append(headerRow);
  table.append(thead);
  const tbody = document.createElement("tbody");
  for (const fact of summary.frozenFacts) {
    const row = document.createElement("tr");
    const field = document.createElement("td");
    field.textContent = fact.field;
    const value = document.createElement("td");
    value.textContent = fact.value;
    const source = document.createElement("td");
    source.textContent = fact.sourceRef ?? "—";
    row.append(field, value, source);
    tbody.append(row);
  }
  table.append(tbody);
  section.append(table);

  const meta = document.createElement("p");
  meta.textContent = `规则身份：${summary.ruleIdentity.profileId}@${summary.ruleIdentity.profileVersion}；来源：${summary.sourceRefs.join("、") || "无"}`;
  section.append(meta);
  systemResults.append(section);
}

verifyButton.addEventListener("click", () => {
  clearError();
  resultSection.hidden = true;
  reasonsSection.hidden = true;
  systemResults.replaceChildren();
  let candidate: unknown;
  try {
    candidate = JSON.parse(textarea.value);
  } catch (cause) {
    showError(cause instanceof Error ? cause.message : "并列 JSON 无法解析。");
    setStatus("失败关闭：并列 JSON 无法解析。", "error");
    return;
  }
  void verifyCrossSystemReadonlyComparisonDraft(candidate).then((result) => {
    if (result.ok) {
      setStatus("并列核对通过；未生成评分、未自动合并人物，未保存任何资料。", "ready");
      const value = result.value;
      renderMeta(value);
      for (const summary of value.systems) renderSystem(summary);
      boundaryNote.textContent =
        "边界：productionEligible=false · expertTruthClaimed=false · successReceiptIssued=false；内容地址为 canonical JSON SHA-256，只证明当前字节自洽，不认证作者、历史执行或专家真值。";
      resultSection.hidden = false;
      return;
    }
    setStatus("失败关闭：并列未通过验证，未显示任何事实表。", "error");
    reasonsList.replaceChildren();
    for (const reason of result.reasons) {
      const item = document.createElement("li");
      item.textContent = reason;
      reasonsList.append(item);
    }
    reasonsSection.hidden = false;
  }).catch((cause) => {
    showError(cause instanceof Error ? cause.message : String(cause));
    setStatus("失败关闭：验证器自身未完成。", "error");
  });
});

textarea.value = `${JSON.stringify(DEFAULT_PAYLOAD, null, 2)}\n`;
