import {
  CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
  calculateCrossSystemComparisonSha256Draft,
  createCrossSystemFactReceiptRegistryReferenceDraft,
  createRegisteredCrossSystemSummaryDraft,
  verifyCrossSystemReadonlyComparisonDraft
} from "../index.ts";
import type { CrossSystemComparisonPayload } from "../index.ts";

const DEFAULT_PAYLOAD_BASE = {
  schemaVersion: CROSS_SYSTEM_COMPARISON_DRAFT_VERSION,
  envelopeVersion: 3,
  createdAt: "2026-08-11T00:00:00.000Z",
  factsFrozen: true,
  factEvidenceState: "registry_bound_offline_engineering_replay_not_domain_truth",
  factReceiptRegistry: createCrossSystemFactReceiptRegistryReferenceDraft(),
  noScoring: true,
  noWeighting: true,
  noMajorityVote: true,
  noModelArbitration: true,
  noAutoPersonMerge: true,
  noConceptEquivalenceInference: true,
  systems: [
    createRegisteredCrossSystemSummaryDraft("ziwei-doushu", "紫微离线工程重放投影"),
    createRegisteredCrossSystemSummaryDraft("western-astrology", "西洋离线工程重放投影")
  ],
  explicitSubjectLink: null,
  observations: {
    convergences: [],
    divergences: [],
    inputSemanticConflicts: [],
    schoolConflicts: [],
    evidenceQualityDifferences: [],
    nonComparableConcepts: [
      {
        observationId: "noncomparable.wealth-concepts",
        title: "财帛宫与第二宫不得自动等价",
        systemIds: ["ziwei-doushu", "western-astrology"],
        basisRefs: [
          { systemId: "ziwei-doushu", basisType: "declared_concept", reference: "ziwei.wealth_palace" },
          { systemId: "western-astrology", basisType: "declared_concept", reference: "western.house_2" }
        ],
        note: "只登记不可自动比较边界，不建立两个概念的同义关系。",
        entryMode: "manual_explicit_entry_unverified",
        assessmentState: "unreviewed_observation",
        conceptEquivalenceClaimed: false,
        expertTruthClaimed: false,
        modelArbitrationUsed: false
      }
    ],
    unresolvedQuestions: [
      {
        observationId: "unresolved.input-boundary-alignment",
        title: "输入时间边界是否可比较仍未解决",
        systemIds: ["ziwei-doushu", "western-astrology"],
        basisRefs: [
          {
            systemId: "ziwei-doushu",
            basisType: "engineering_receipt",
            reference: "cross-system.engineering-replay/ziwei.synthetic-e1"
          },
          {
            systemId: "western-astrology",
            basisType: "engineering_receipt",
            reference: "cross-system.engineering-replay/western.synthetic-e1"
          }
        ],
        note: "需分别取得输入语义、来源和专家审定后再决定是否存在可比口径。",
        entryMode: "manual_explicit_entry_unverified",
        assessmentState: "unreviewed_observation",
        conceptEquivalenceClaimed: false,
        expertTruthClaimed: false,
        modelArbitrationUsed: false
      }
    ]
  }
} satisfies CrossSystemComparisonPayload;

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
const observationResults = requireElement<HTMLElement>("observation-results");
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
  noScoring: true;
  noWeighting: true;
  noMajorityVote: true;
  noModelArbitration: true;
  noConceptEquivalenceInference: true;
  factReceiptRegistry: Readonly<{ registryDigest: string }>;
}>): void {
  resultMeta.replaceChildren();
  const rows: Array<[string, string]> = [
    ["内容地址", value.contentSha256],
    ["工程回执注册表", value.factReceiptRegistry.registryDigest],
    ["人物关联", value.explicitSubjectLink?.label ?? "未关联人物（允许）"],
    ["综合处理", value.noScoring && value.noWeighting ? "不打分、不加权" : "失败关闭"],
    ["分歧处理", value.noMajorityVote && value.noModelArbitration ? "不投票、不由模型仲裁" : "失败关闭"],
    ["概念关系", value.noConceptEquivalenceInference ? "不自动推断等价" : "失败关闭"]
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
  frozenFacts: ReadonlyArray<{ field: string; value: string; sourceRef: string }>;
  ruleIdentity: { profileId: string; profileVersion: string; profileDigest: string };
  engineeringEvidenceRefs: readonly string[];
  engineeringFactReceipt: { receiptId: string; receiptDigest: string };
}): void {
  const section = document.createElement("section");
  section.className = "system-result";
  const heading = document.createElement("h3");
  heading.textContent = `${summary.label}（${summary.systemId}）`;
  section.append(heading);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["事实字段", "工程重放值", "工程回执引用"]) {
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
    source.textContent = fact.sourceRef;
    row.append(field, value, source);
    tbody.append(row);
  }
  table.append(tbody);
  section.append(table);

  const meta = document.createElement("p");
  meta.textContent = `规则身份：${summary.ruleIdentity.profileId}@${summary.ruleIdentity.profileVersion}；工程回执：${summary.engineeringFactReceipt.receiptId} / ${summary.engineeringFactReceipt.receiptDigest}；工程依据：${summary.engineeringEvidenceRefs.join("、")}`;
  section.append(meta);
  systemResults.append(section);
}

const OBSERVATION_PARTITION_LABELS = Object.freeze({
  convergences: "表面共识观察",
  divergences: "分歧观察",
  inputSemanticConflicts: "输入语义冲突",
  schoolConflicts: "流派冲突",
  evidenceQualityDifferences: "证据质量差异",
  nonComparableConcepts: "不可比较概念",
  unresolvedQuestions: "未决问题"
});

function renderObservationInventory(observations: Readonly<Record<string, ReadonlyArray<{
  observationId: string;
  title: string;
  systemIds: readonly string[];
  basisRefs: ReadonlyArray<{ systemId: string; basisType: string; reference: string }>;
  note: string;
}>>>): void {
  observationResults.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = "显式观察分区（均未审定）";
  observationResults.append(heading);

  for (const [partition, label] of Object.entries(OBSERVATION_PARTITION_LABELS)) {
    const section = document.createElement("section");
    section.className = "observation-partition";
    section.dataset.partition = partition;
    const title = document.createElement("h4");
    const entries = observations[partition] ?? [];
    title.textContent = `${label}（${entries.length}）`;
    section.append(title);
    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "当前无显式条目；空数组不表示体系一致。";
      section.append(empty);
    } else {
      const list = document.createElement("ol");
      for (const observation of entries) {
        const item = document.createElement("li");
        const itemTitle = document.createElement("strong");
        itemTitle.textContent = observation.title;
        const systems = document.createElement("span");
        systems.textContent = `体系：${observation.systemIds.join("、")}`;
        const note = document.createElement("p");
        note.textContent = observation.note;
        const basis = document.createElement("small");
        basis.textContent = `依据：${observation.basisRefs
          .map((entry) => `${entry.systemId}/${entry.basisType}/${entry.reference}`)
          .join("；")}`;
        item.append(itemTitle, systems, note, basis);
        list.append(item);
      }
      section.append(list);
    }
    observationResults.append(section);
  }
}

verifyButton.addEventListener("click", () => {
  clearError();
  resultSection.hidden = true;
  reasonsSection.hidden = true;
  systemResults.replaceChildren();
  observationResults.replaceChildren();
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
      setStatus("工程回执绑定的候选并列核对通过；未生成评分、未自动合并人物，未保存任何资料。", "candidate");
      const value = result.value;
      renderMeta(value);
      for (const summary of value.systems) renderSystem(summary);
      renderObservationInventory(value.observations);
      boundaryNote.textContent =
        "边界：本页只接受 bundled registry 中紫微与西洋的离线工程重放投影；productionEligible=false · expertTruthClaimed=false · successReceiptIssued=false。它不建立内容真值、来源正文、权利、专家真值或正式准入；所有观察仍未审定，不打分、不加权、不投票、不由模型选赢家，也不自动推断概念等价。";
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

verifyButton.disabled = true;
textarea.value = "正在生成当前样例的内容地址……";
void calculateCrossSystemComparisonSha256Draft(DEFAULT_PAYLOAD_BASE).then((contentSha256) => {
  textarea.value = `${JSON.stringify({ ...DEFAULT_PAYLOAD_BASE, contentSha256 }, null, 2)}\n`;
  verifyButton.disabled = false;
}).catch((cause) => {
  showError(cause instanceof Error ? cause.message : String(cause));
  setStatus("失败关闭：默认样例的内容地址未生成。", "error");
});
