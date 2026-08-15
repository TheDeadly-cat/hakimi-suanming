import "./styles.css";
import {
  IndexedDbZiweiBrowserWorkspaceDraft,
  ZiweiBrowserWorkspaceDraftError,
  type ZiweiBrowserWorkspaceJsonExportDraft,
  type ZiweiBrowserWorkspaceMutationStateDraft,
  type ZiweiBrowserWorkspaceRestoreInspectionDraft,
  type ZiweiBrowserWorkspaceRevisionDraft,
  type ZiweiBrowserWorkspaceRevisionSummaryDraft
} from "../browser-persistence.ts";
import {
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_FILENAME,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_MAX_BYTES,
  calculateZiweiInFreshBrowserWorker,
  createZiweiBrowserDisplayProjection,
  createZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  createZiweiNatalTransformationPalaceReviewFeedbackTemplate,
  preflightZiweiCoreMinorStarSanfangReviewFeedback,
  preflightZiweiNatalTransformationPalaceReviewFeedback,
  serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate,
  ziweiCoreMinorStarSanfangReviewFeedbackFilename,
  type BrowserProbeDisplayProjection,
  type BrowserProbeSuccessResult,
  type ZiweiCoreMinorStarSanfangReviewFeedbackPreflight,
  type ZiweiNatalTransformationPalaceReviewFeedbackPreflight
} from "../browser-calculation-bridge.ts";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  type ZiweiBirthInputDraft
} from "../contract-bridge.ts";

type BrowserArtifact = BrowserProbeSuccessResult["artifact"];
type DisplayPalace = BrowserProbeDisplayProjection["displayPalaces"][number];
type DisplayStar = DisplayPalace["stars"][number];
type CoreMinorBaseCandidate = NonNullable<DisplayStar["coreMinorCandidateContent"]>;
type CoreMinorPalaceCandidate = NonNullable<DisplayStar["coreMinorPalaceCandidateContent"]>;
type CoreMinorCandidatePair = Readonly<{
  base: CoreMinorBaseCandidate;
  palace: CoreMinorPalaceCandidate;
}>;
type CoreMinorBinding = Readonly<{
  star: DisplayStar;
  pair: CoreMinorCandidatePair;
}>;
type CoreMinorSanfangScope = NonNullable<typeof currentCoreMinorSanfangReviewScope>;
type CoreMinorSanfangSourceRef =
  | BrowserProbeDisplayProjection["coreMinorStarSanfangReviews"][number]["sourceRefs"][number]
  | BrowserProbeDisplayProjection["coreMinorStarSanfangReviews"][number]["occurrences"][number]["sourceRefs"][number];

const repository = new IndexedDbZiweiBrowserWorkspaceDraft(indexedDB);
const updateChannel = typeof BroadcastChannel === "function"
  ? new BroadcastChannel("hakimi-ziwei-browser-workspace-draft-updates")
  : null;

let mutationState: ZiweiBrowserWorkspaceMutationStateDraft = {
  epoch: 0,
  revisionCount: 0,
  totalRevisionBytes: 0
};
let currentArtifact: BrowserArtifact | null = null;
let currentRevision: ZiweiBrowserWorkspaceRevisionDraft | null = null;
let currentProjection: BrowserProbeDisplayProjection | null = null;
let resultMatchesInput = false;
let pendingRestore: Readonly<{
  bytes: Uint8Array;
  inspection: ZiweiBrowserWorkspaceRestoreInspectionDraft;
}> | null = null;
let reviewFeedbackReadToken = 0;
let viewEpoch = 0;
let coreMinorSanfangReviewScopeEpoch = 0;
let coreMinorSanfangReviewReadToken = 0;
let activeCalculationController: AbortController | null = null;
let activeViewOperationEpoch: number | null = null;
let currentCoreMinorSanfangReviewScope: Readonly<{
  viewEpoch: number;
  scopeEpoch: number;
  artifactSha256: string;
  projection: BrowserProbeDisplayProjection;
}> | null = null;
let preparedCoreMinorSanfangReviewPacket: Readonly<{
  viewEpoch: number;
  scopeEpoch: number;
  artifactSha256: string;
  projection: BrowserProbeDisplayProjection;
  serialized: string;
  fileName: string;
}> | null = null;

const form = requireElement<HTMLFormElement>("birth-form");
const dateInput = requireElement<HTMLInputElement>("birth-date");
const shichenSelect = requireElement<HTMLSelectElement>("shichen-index");
const calculateButton = requireElement<HTMLButtonElement>("calculate-button");
const formError = requireElement<HTMLParagraphElement>("form-error");
const saveForm = requireElement<HTMLFormElement>("save-form");
const revisionTitle = requireElement<HTMLInputElement>("revision-title");
const revisionNote = requireElement<HTMLTextAreaElement>("revision-note");
const saveButton = requireElement<HTMLButtonElement>("save-button");
const artifactTitle = requireElement<HTMLHeadingElement>("artifact-title");
const artifactBadge = requireElement<HTMLSpanElement>("artifact-badge");
const board = requireElement<HTMLDivElement>("palace-board");
const centerPrimary = requireElement<HTMLElement>("center-primary");
const centerSecondary = requireElement<HTMLParagraphElement>("center-secondary");
const centerSummary = requireElement<HTMLDListElement>("center-summary");
const sanfangPanel = requireElement<HTMLElement>("sanfang-panel");
const sanfangFocus = requireElement<HTMLSelectElement>("sanfang-focus");
const sanfangTargetSummary = requireElement<HTMLParagraphElement>("sanfang-target-summary");
const palaceReadingReview = requireElement<HTMLDivElement>("palace-reading-review");
const coreMinorSanfangReviewPanel = requireElement<HTMLElement>("core-minor-sanfang-review-panel");
const coreMinorSanfangReviewFocusTitle = requireElement<HTMLElement>(
  "core-minor-sanfang-review-focus-title"
);
const coreMinorSanfangReviewFocusSummary = requireElement<HTMLElement>(
  "core-minor-sanfang-review-focus-summary"
);
const coreMinorSanfangReviewFocusCount = requireElement<HTMLElement>(
  "core-minor-sanfang-review-focus-count"
);
const coreMinorSanfangReviewOccurrences = requireElement<HTMLDivElement>(
  "core-minor-sanfang-review-occurrences"
);
const coreMinorSanfangReviewPrepare = requireElement<HTMLButtonElement>(
  "core-minor-sanfang-review-prepare"
);
const coreMinorSanfangReviewDownload = requireElement<HTMLButtonElement>(
  "core-minor-sanfang-review-download"
);
const coreMinorSanfangReviewFile = requireElement<HTMLInputElement>(
  "core-minor-sanfang-review-file"
);
const coreMinorSanfangReviewReviewCount = requireElement<HTMLElement>(
  "core-minor-sanfang-review-review-count"
);
const coreMinorSanfangReviewOccurrenceCount = requireElement<HTMLElement>(
  "core-minor-sanfang-review-occurrence-count"
);
const coreMinorSanfangReviewResolved = requireElement<HTMLElement>(
  "core-minor-sanfang-review-resolved"
);
const coreMinorSanfangReviewReviewer = requireElement<HTMLElement>(
  "core-minor-sanfang-review-reviewer"
);
const coreMinorSanfangReviewMessage = requireElement<HTMLParagraphElement>(
  "core-minor-sanfang-review-message"
);
const coreMinorSanfangReviewItems = requireElement<HTMLOListElement>(
  "core-minor-sanfang-review-items"
);
const sanfangGrid = requireElement<HTMLDivElement>("sanfang-grid");
const sanfangRuleId = requireElement<HTMLElement>("sanfang-rule-id");
const sanfangSourceLink = requireElement<HTMLAnchorElement>("sanfang-source-link");
const artifactAudit = requireElement<HTMLDListElement>("artifact-audit");
const revisionCount = requireElement<HTMLElement>("revision-count");
const mutationEpoch = requireElement<HTMLElement>("mutation-epoch");
const totalBytes = requireElement<HTMLElement>("total-bytes");
const workspaceStatus = requireElement<HTMLParagraphElement>("workspace-status");
const archiveList = requireElement<HTMLOListElement>("archive-list");
const archiveEmpty = requireElement<HTMLParagraphElement>("archive-empty");
const refreshButton = requireElement<HTMLButtonElement>("refresh-button");
const backupButton = requireElement<HTMLButtonElement>("backup-button");
const restoreFile = requireElement<HTMLInputElement>("restore-file");
const restoreButton = requireElement<HTMLButtonElement>("restore-button");
const clearAccepted = requireElement<HTMLInputElement>("clear-accepted");
const clearButton = requireElement<HTMLButtonElement>("clear-button");
const safetyMessage = requireElement<HTMLParagraphElement>("safety-message");
const reviewFeedbackPanel = requireElement<HTMLElement>("review-feedback-panel");
const reviewFeedbackDownload = requireElement<HTMLButtonElement>("review-feedback-download");
const reviewFeedbackFile = requireElement<HTMLInputElement>("review-feedback-file");
const reviewFeedbackTotal = requireElement<HTMLElement>("review-feedback-total");
const reviewFeedbackResolved = requireElement<HTMLElement>("review-feedback-resolved");
const reviewFeedbackUnresolved = requireElement<HTMLElement>("review-feedback-unresolved");
const reviewFeedbackReviewer = requireElement<HTMLElement>("review-feedback-reviewer");
const reviewFeedbackMessage = requireElement<HTMLParagraphElement>("review-feedback-message");
const reviewFeedbackItems = requireElement<HTMLOListElement>("review-feedback-items");

artifactTitle.tabIndex = -1;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void calculateFromForm();
});
form.addEventListener("input", () => {
  const calculationWasActive = activeCalculationController !== null;
  const viewReplacementWasActive = activeViewOperationEpoch !== null;
  const displayedArtifact = currentArtifact;
  beginViewReplacement();
  invalidateCoreMinorSanfangReviewScope(
    "输入已改变；旧计算与当前整盘审稿包已失效，请重新计算。",
    displayedArtifact === null
  );
  if (calculationWasActive) setCalculating(false);
  if (!displayedArtifact) {
    if (viewReplacementWasActive) {
      setWorkspaceStatus(
        calculationWasActive
          ? "输入已改变；进行中的排盘已取消，请按新输入重新计算。"
          : "输入已改变；进行中的重开已取消，请按当前意图继续。",
        "error"
      );
    }
    return;
  }
  resultMatchesInput = false;
  saveButton.disabled = true;
  artifactBadge.textContent = "输入已改变 · 请重新计算";
  artifactBadge.dataset.state = "error";
  setWorkspaceStatus("当前盘仍保留供核对，但不能保存；请按新输入重新计算。", "error");
});

saveForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveCurrentArtifact();
});
refreshButton.addEventListener("click", () => void refreshWorkspace("本地档案已刷新。"));
backupButton.addEventListener("click", () => void exportFullBackup());
restoreFile.addEventListener("change", () => void inspectSelectedBackup());
restoreButton.addEventListener("click", () => void restoreInspectedBackup());
clearAccepted.addEventListener("change", () => {
  clearButton.disabled = !clearAccepted.checked || mutationState.revisionCount === 0;
});
clearButton.addEventListener("click", () => void clearWorkspace());
reviewFeedbackDownload.addEventListener("click", () => void downloadReviewFeedbackTemplate());
reviewFeedbackFile.addEventListener("change", () => void inspectSelectedReviewFeedback());
coreMinorSanfangReviewPrepare.addEventListener("click", () => {
  void prepareCoreMinorSanfangReviewPacket();
});
coreMinorSanfangReviewDownload.addEventListener("click", () => {
  downloadPreparedCoreMinorSanfangReviewPacket();
});
coreMinorSanfangReviewFile.addEventListener("change", () => {
  void inspectSelectedCoreMinorSanfangReviewFeedback();
});
sanfangFocus.addEventListener("change", () => {
  if (currentProjection) renderSanfangSelection(currentProjection, sanfangFocus.value);
});

updateChannel?.addEventListener("message", () => {
  void refreshWorkspace("另一个页面更新了本地档案，列表已重新核对。", false);
});
globalThis.addEventListener("pagehide", () => updateChannel?.close(), { once: true });

void refreshWorkspace("独立紫微档案已打开。", true);

async function calculateFromForm(): Promise<void> {
  setFormError(null);
  if (!form.reportValidity()) {
    setWorkspaceStatus("请检查日期、时辰和排盘用性别。", "error");
    return;
  }

  const input = createInput();
  const operationEpoch = beginViewReplacement();
  activeViewOperationEpoch = operationEpoch;
  const controller = new AbortController();
  activeCalculationController = controller;
  setCalculating(true);
  clearArtifact(false);
  try {
    const result = await calculateZiweiInFreshBrowserWorker(input, { signal: controller.signal });
    if (operationEpoch !== viewEpoch) return;
    currentArtifact = result.artifact;
    currentRevision = null;
    resultMatchesInput = true;
    const projection = createZiweiBrowserDisplayProjection(result.artifact);
    renderArtifact(result.artifact, projection, null);
    revisionTitle.value = `${projection.displaySummary.gregorianDate} · ${projection.displaySummary.shichen} · ${projection.displaySummary.sex}`;
    revisionNote.value = "";
    saveForm.hidden = false;
    saveButton.disabled = false;
    saveButton.textContent = "保存到独立本地档案";
    artifactBadge.textContent = "核对通过 · 尚未保存";
    artifactBadge.dataset.state = "verified";
    setWorkspaceStatus("排盘完成并通过工程核对；尚未写入本地档案。", "ready");
    artifactTitle.focus({ preventScroll: true });
  } catch (cause) {
    if (operationEpoch !== viewEpoch) return;
    clearArtifact(false);
    const message = userFacingError(cause, "本次排盘没有完成，请重试；没有保存任何资料。");
    setFormError(message);
    setWorkspaceStatus(message, "error");
  } finally {
    if (operationEpoch === viewEpoch) {
      activeViewOperationEpoch = null;
      activeCalculationController = null;
      setCalculating(false);
    }
  }
}

async function saveCurrentArtifact(): Promise<void> {
  setFormError(null);
  if (!currentArtifact || !resultMatchesInput) {
    setFormError("请先按当前输入完成一次排盘，再保存。 ");
    return;
  }
  if (!saveForm.reportValidity()) return;

  saveButton.disabled = true;
  calculateButton.disabled = true;
  setWorkspaceStatus("正在建立不可变 Revision…", "loading");
  try {
    const saved = await repository.saveRevision({
      studyId: crypto.randomUUID(),
      revisionId: crypto.randomUUID(),
      parentRevisionId: null,
      createdAt: new Date().toISOString(),
      title: revisionTitle.value,
      note: revisionNote.value,
      artifact: currentArtifact
    }, mutationState.epoch);
    currentRevision = saved.revision;
    mutationState = { ...mutationState, epoch: saved.epoch };
    resultMatchesInput = false;
    saveButton.textContent = saved.status === "created" ? "已保存" : "档案已存在";
    artifactBadge.textContent = "已保存 · 内容核对通过";
    artifactBadge.dataset.state = "saved";
    setAudit("revision", saved.revision.contentSha256);
    setWorkspaceStatus(
      saved.status === "created" ? "已保存到独立紫微档案。" : "相同 Revision 已存在，没有重复写入。",
      "ready"
    );
    publishUpdate(saved.epoch);
    await refreshWorkspace(undefined, false);
  } catch (cause) {
    const message = userFacingError(cause, "保存没有完成，请重试；事务没有部分写入。 ");
    setFormError(message);
    setWorkspaceStatus(message, "error");
    if (isEpochConflict(cause)) await refreshWorkspace(undefined, false);
  } finally {
    calculateButton.disabled = false;
    if (!currentRevision) saveButton.disabled = false;
  }
}

async function refreshWorkspace(
  successMessage?: string,
  announceFailure = true
): Promise<void> {
  refreshButton.disabled = true;
  archiveList.setAttribute("aria-busy", "true");
  try {
    const state = await repository.getMutationState();
    const revisions = await repository.listRecentRevisions(50);
    mutationState = state;
    renderWorkspaceState(state);
    renderArchive(revisions);
    if (successMessage) setWorkspaceStatus(successMessage, "ready");
  } catch (cause) {
    archiveList.replaceChildren();
    archiveList.hidden = true;
    archiveEmpty.hidden = false;
    const message = userFacingError(cause, "这台浏览器暂时无法打开独立紫微档案。 ");
    if (announceFailure) setWorkspaceStatus(message, "error");
  } finally {
    refreshButton.disabled = false;
    archiveList.setAttribute("aria-busy", "false");
  }
}

function renderWorkspaceState(state: ZiweiBrowserWorkspaceMutationStateDraft): void {
  revisionCount.textContent = String(state.revisionCount);
  mutationEpoch.textContent = String(state.epoch);
  totalBytes.textContent = formatBytes(state.totalRevisionBytes);
  backupButton.disabled = state.revisionCount === 0;
  clearButton.disabled = !clearAccepted.checked || state.revisionCount === 0;
}

function renderArchive(revisions: readonly ZiweiBrowserWorkspaceRevisionSummaryDraft[]): void {
  archiveList.replaceChildren();
  archiveEmpty.hidden = revisions.length > 0;
  archiveList.hidden = revisions.length === 0;
  for (const revision of revisions) {
    const item = document.createElement("li");
    item.className = "archive-item";

    const open = document.createElement("button");
    open.className = "archive-open";
    open.type = "button";
    const title = document.createElement("strong");
    title.textContent = revision.title;
    const meta = document.createElement("span");
    meta.textContent = `${revision.gregorianDate} · ${revision.palaceCount} 宫 · ${revision.starCount} 星曜`;
    const time = document.createElement("span");
    time.textContent = formatDateTime(revision.createdAt);
    open.append(title, meta, time);
    open.addEventListener("click", () => void reopenRevision(revision.revisionId));

    const actions = document.createElement("div");
    actions.className = "archive-actions";
    const digest = document.createElement("span");
    digest.textContent = `# ${revision.contentSha256.slice(0, 10)}`;
    digest.title = revision.contentSha256;
    const exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.textContent = "导出此 Revision";
    exportButton.addEventListener("click", () => void exportRevision(revision.revisionId));
    actions.append(digest, exportButton);

    item.append(open, actions);
    archiveList.append(item);
  }
}

async function reopenRevision(revisionId: string): Promise<void> {
  const operationEpoch = beginViewReplacement();
  activeViewOperationEpoch = operationEpoch;
  clearArtifact(false);
  setWorkspaceStatus("正在重开并核对保存内容…", "loading");
  try {
    const revision = await repository.reopenRevision(revisionId);
    if (operationEpoch !== viewEpoch) return;
    const projection = createZiweiBrowserDisplayProjection(revision.artifact);
    currentArtifact = revision.artifact;
    currentRevision = revision;
    resultMatchesInput = false;
    renderArtifact(revision.artifact, projection, revision);
    saveForm.hidden = true;
    artifactBadge.textContent = "已重开 · 内容核对通过";
    artifactBadge.dataset.state = "saved";
    setWorkspaceStatus("保存内容核对通过；本次重开没有重新排盘。", "ready");
    artifactTitle.focus({ preventScroll: false });
  } catch (cause) {
    if (operationEpoch !== viewEpoch) return;
    clearArtifact(false);
    setWorkspaceStatus(
      userFacingError(cause, "档案内容无法核对，未显示不可信结果。"),
      "error"
    );
  } finally {
    if (operationEpoch === viewEpoch) activeViewOperationEpoch = null;
  }
}

async function exportRevision(revisionId: string): Promise<void> {
  try {
    const exported = await repository.exportRevision(revisionId);
    startDownload(exported);
    setWorkspaceStatus("已生成单个 Revision 文件，浏览器开始下载。", "ready");
  } catch (cause) {
    setWorkspaceStatus(userFacingError(cause, "无法导出这个 Revision。"), "error");
  }
}

async function exportFullBackup(): Promise<void> {
  backupButton.disabled = true;
  setSafetyMessage("正在逐份核对本地档案并生成完整备份…", "loading");
  try {
    const exported = await repository.exportFullBackup();
    startDownload(exported);
    setSafetyMessage(
      `已生成包含 ${mutationState.revisionCount} 个 Revision 的完整备份，浏览器开始下载；请确认文件已保存。`,
      "success"
    );
  } catch (cause) {
    setSafetyMessage(userFacingError(cause, "完整备份没有生成。"), "error");
  } finally {
    backupButton.disabled = mutationState.revisionCount === 0;
  }
}

async function downloadReviewFeedbackTemplate(): Promise<void> {
  reviewFeedbackDownload.disabled = true;
  setReviewFeedbackMessage("正在生成与当前 48 条候选严格绑定的审稿模板…", "loading");
  try {
    const template = await createZiweiNatalTransformationPalaceReviewFeedbackTemplate();
    const serialized = serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate(template);
    startTextDownload(
      serialized,
      ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_FILENAME
    );
    setReviewFeedbackMessage(
      `已生成 ${ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_FILENAME}；请在外部编辑后重新导入。`,
      "success"
    );
  } catch (cause) {
    setReviewFeedbackMessage(
      cause instanceof Error && cause.message ? cause.message : "审稿模板没有生成。",
      "error"
    );
  } finally {
    reviewFeedbackDownload.disabled = false;
  }
}

async function inspectSelectedReviewFeedback(): Promise<void> {
  const token = ++reviewFeedbackReadToken;
  clearReviewFeedbackPreview("正在只读检查审稿反馈；不会写入任何本地资料…", "loading");
  const file = reviewFeedbackFile.files?.[0];
  if (!file) {
    clearReviewFeedbackPreview("请选择一个已填写的 JSON 审稿反馈文件。", "error");
    return;
  }
  try {
    if (!file.name.toLowerCase().endsWith(".json")) {
      throw new Error("审稿反馈文件必须使用 .json 扩展名");
    }
    if (file.size < 1
      || file.size > ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_MAX_BYTES) {
      throw new Error("审稿反馈文件必须是 1 字节至 2 MiB 的 UTF-8 JSON");
    }
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    if (token !== reviewFeedbackReadToken) return;
    const preflight = await preflightZiweiNatalTransformationPalaceReviewFeedback(raw);
    if (token !== reviewFeedbackReadToken) return;
    renderReviewFeedbackPreflight(preflight, file.name);
  } catch (cause) {
    if (token !== reviewFeedbackReadToken) return;
    clearReviewFeedbackPreview(
      cause instanceof Error && cause.message
        ? `预检失败：${cause.message}`
        : "预检失败：这不是可读取的 UTF-8 审稿反馈。",
      "error"
    );
  } finally {
    if (token === reviewFeedbackReadToken) reviewFeedbackFile.value = "";
  }
}

function renderReviewFeedbackPreflight(
  preflight: ZiweiNatalTransformationPalaceReviewFeedbackPreflight,
  fileName: string
): void {
  reviewFeedbackTotal.textContent = String(preflight.counts.total);
  reviewFeedbackResolved.textContent = String(preflight.resolvedCount);
  reviewFeedbackUnresolved.textContent = String(preflight.unresolvedCount);
  reviewFeedbackReviewer.textContent = preflight.reviewerAttributionComplete
    ? `${preflight.envelope.reviewer.displayName}（自述，未核验）`
    : "尚未提供";
  setReviewFeedbackBoundary(preflight);

  reviewFeedbackItems.replaceChildren();
  const resolvedItems = preflight.envelope.items.filter((item) => item.decision !== "unresolved");
  for (const item of resolvedItems) {
    const card = document.createElement("li");
    card.className = "review-feedback-item";
    card.dataset.contentId = item.contentId;
    card.dataset.decision = item.decision;
    card.dataset.orientationProposal = item.orientationProposal;
    card.dataset.expertTruthClaimed = "false";
    card.dataset.formalActivationAllowed = "false";
    card.dataset.goodBadOrientation = "null";
    card.dataset.eventOutcome = "null";
    card.dataset.result = "null";

    const heading = document.createElement("div");
    heading.className = "review-feedback-item-heading";
    const title = document.createElement("strong");
    title.textContent = `生年化${item.transformationLabel} · ${item.palaceRoleLabel}`;
    const status = document.createElement("span");
    status.textContent = reviewDecisionLabel(item.decision);
    heading.append(title, status);

    const details = document.createElement("dl");
    details.className = "review-feedback-item-details";
    details.append(
      summaryPair("方向提案", reviewOrientationLabel(item.orientationProposal)),
      summaryPair("流派口径", item.selectedSchool),
      summaryPair("审稿理由", item.decisionReason),
      summaryPair("成立条件", item.applicabilityConditions),
      summaryPair("反例提醒", item.counterexamples)
    );
    if (item.revisionRequest) {
      details.append(summaryPair("退修要求", item.revisionRequest));
    }
    if (item.additionalSourceUrls.length > 0) {
      const sourceRow = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = "补充来源";
      const description = document.createElement("dd");
      item.additionalSourceUrls.forEach((sourceUrl, index) => {
        const link = document.createElement("a");
        link.href = sourceUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = `来源 ${index + 1}`;
        if (index > 0) description.append("、");
        description.append(link);
      });
      sourceRow.append(term, description);
      details.append(sourceRow);
    }
    card.append(heading, details);
    reviewFeedbackItems.append(card);
  }
  reviewFeedbackItems.hidden = resolvedItems.length === 0;
  setReviewFeedbackMessage(
    `预检通过：${fileName} 覆盖 48 项，已裁决 ${preflight.resolvedCount} 项、未裁决 ${preflight.unresolvedCount} 项。身份仅自述且文件无签名；本次没有写入工件、Revision、IndexedDB 或资料代次。`,
    "success"
  );
}

function clearReviewFeedbackPreview(
  message: string,
  state: "idle" | "loading" | "success" | "error"
): void {
  reviewFeedbackTotal.textContent = "48";
  reviewFeedbackResolved.textContent = "0";
  reviewFeedbackUnresolved.textContent = "48";
  reviewFeedbackReviewer.textContent = "尚未提供";
  reviewFeedbackItems.replaceChildren();
  reviewFeedbackItems.hidden = true;
  setReviewFeedbackBoundary(null);
  setReviewFeedbackMessage(message, state);
}

function setReviewFeedbackBoundary(
  preflight: ZiweiNatalTransformationPalaceReviewFeedbackPreflight | null
): void {
  reviewFeedbackPanel.dataset.identityVerified = String(preflight?.identityVerified ?? false);
  reviewFeedbackPanel.dataset.digitalSignatureVerified = String(
    preflight?.digitalSignatureVerified ?? false
  );
  reviewFeedbackPanel.dataset.eligibleForFormalActivation = String(
    preflight?.eligibleForFormalActivation ?? false
  );
  reviewFeedbackPanel.dataset.autoIntegrationAllowed = String(
    preflight?.autoIntegrationAllowed ?? false
  );
  reviewFeedbackPanel.dataset.artifactRevisionOrStorageMutationPerformed = String(
    preflight?.artifactRevisionOrStorageMutationPerformed ?? false
  );
  reviewFeedbackPanel.dataset.goodBadOrientation = "null";
  reviewFeedbackPanel.dataset.eventOutcome = "null";
  reviewFeedbackPanel.dataset.result = "null";
}

function setReviewFeedbackMessage(
  message: string,
  state: "idle" | "loading" | "success" | "error"
): void {
  reviewFeedbackMessage.textContent = message;
  reviewFeedbackMessage.dataset.state = state;
}

function reviewDecisionLabel(
  decision: ZiweiNatalTransformationPalaceReviewFeedbackPreflight["envelope"]["items"][number]["decision"]
): string {
  return ({
    unresolved: "尚未裁决",
    approve: "建议保留",
    revise: "建议退修",
    reject: "建议驳回"
  } as const)[decision];
}

function reviewOrientationLabel(
  orientation: ZiweiNatalTransformationPalaceReviewFeedbackPreflight["envelope"]["items"][number]["orientationProposal"]
): string {
  return ({
    unresolved: "尚未提出",
    potentially_supportive: "条件满足时可能偏支持",
    potentially_challenging: "条件满足时可能偏挑战",
    mixed_conditional: "正反并见，取决于条件",
    not_assessable: "现有证据不足以提出方向"
  } as const)[orientation];
}

function beginViewReplacement(): number {
  viewEpoch += 1;
  activeCalculationController?.abort();
  activeCalculationController = null;
  activeViewOperationEpoch = null;
  return viewEpoch;
}

function isCurrentCoreMinorSanfangReviewScope(
  scope: CoreMinorSanfangScope
): boolean {
  return currentCoreMinorSanfangReviewScope === scope
    && scope.viewEpoch === viewEpoch
    && scope.scopeEpoch === coreMinorSanfangReviewScopeEpoch
    && scope.projection === currentProjection
    && scope.artifactSha256 === currentArtifact?.digests.artifactSha256;
}

function isCurrentCoreMinorSanfangReviewOperation(
  scope: CoreMinorSanfangScope,
  token: number
): boolean {
  return token === coreMinorSanfangReviewReadToken
    && isCurrentCoreMinorSanfangReviewScope(scope);
}

function invalidateCoreMinorSanfangReviewScope(
  message: string,
  hidePanel: boolean
): void {
  coreMinorSanfangReviewScopeEpoch += 1;
  coreMinorSanfangReviewReadToken += 1;
  currentCoreMinorSanfangReviewScope = null;
  preparedCoreMinorSanfangReviewPacket = null;
  coreMinorSanfangReviewPanel.setAttribute("aria-busy", "false");
  coreMinorSanfangReviewPanel.dataset.currentProjectionBound = "false";
  coreMinorSanfangReviewPanel.dataset.packetState = "unavailable";
  coreMinorSanfangReviewPanel.dataset.preflightState = "idle";
  delete coreMinorSanfangReviewPanel.dataset.viewEpoch;
  delete coreMinorSanfangReviewPanel.dataset.scopeEpoch;
  delete coreMinorSanfangReviewPanel.dataset.artifactSha256;
  delete coreMinorSanfangReviewPanel.dataset.artifactFactsSha256;
  delete coreMinorSanfangReviewPanel.dataset.ruleSnapshotSha256;
  delete coreMinorSanfangReviewPanel.dataset.reviewVersion;
  delete coreMinorSanfangReviewPanel.dataset.reviewCount;
  delete coreMinorSanfangReviewPanel.dataset.occurrenceCount;
  delete coreMinorSanfangReviewPanel.dataset.displayTargetEarthlyBranchId;
  delete coreMinorSanfangReviewPanel.dataset.displayTargetPalaceRoleId;
  delete coreMinorSanfangReviewPanel.dataset.displayReviewId;
  coreMinorSanfangReviewFocusTitle.textContent = "当前整盘绑定已失效";
  coreMinorSanfangReviewFocusSummary.textContent = "请重新计算或重开一张通过核对的盘。";
  coreMinorSanfangReviewFocusCount.textContent = "0 项 occurrence";
  coreMinorSanfangReviewOccurrences.replaceChildren();
  coreMinorSanfangReviewReviewCount.textContent = "—";
  coreMinorSanfangReviewOccurrenceCount.textContent = "—";
  coreMinorSanfangReviewPrepare.disabled = true;
  coreMinorSanfangReviewDownload.disabled = true;
  setCoreMinorSanfangReviewFileDisabled(true);
  coreMinorSanfangReviewFile.value = "";
  clearCoreMinorSanfangReviewPreflight(message, "idle");
  coreMinorSanfangReviewPanel.hidden = hidePanel;
}

function resetCoreMinorSanfangReviewPacketAndPreflight(message: string): void {
  const scope = currentCoreMinorSanfangReviewScope;
  const scopeIsCurrent = scope !== null && isCurrentCoreMinorSanfangReviewScope(scope);
  preparedCoreMinorSanfangReviewPacket = null;
  coreMinorSanfangReviewPanel.setAttribute("aria-busy", "false");
  coreMinorSanfangReviewPanel.dataset.packetState = scopeIsCurrent ? "unprepared" : "unavailable";
  coreMinorSanfangReviewPrepare.disabled = !scopeIsCurrent;
  coreMinorSanfangReviewDownload.disabled = true;
  setCoreMinorSanfangReviewFileDisabled(!scopeIsCurrent);
  coreMinorSanfangReviewFile.value = "";
  clearCoreMinorSanfangReviewPreflight(message, "idle");
}

function setCoreMinorSanfangReviewFileDisabled(disabled: boolean): void {
  coreMinorSanfangReviewFile.disabled = disabled;
  const label = coreMinorSanfangReviewFile.closest("label");
  if (label) label.setAttribute("aria-disabled", String(disabled));
}

function currentCoreMinorSanfangReviewCounts(): Readonly<{
  reviewCount: number;
  occurrenceCount: number;
}> | null {
  const scope = currentCoreMinorSanfangReviewScope;
  if (!scope || !isCurrentCoreMinorSanfangReviewScope(scope)) return null;
  return Object.freeze({
    reviewCount: scope.projection.coreMinorStarSanfangReviews.length,
    occurrenceCount: scope.projection.coreMinorStarSanfangReviews.reduce(
      (sum, review) => sum + review.occurrences.length,
      0
    )
  });
}

function clearCoreMinorSanfangReviewPreflight(
  message: string,
  state: "idle" | "loading" | "success" | "error"
): void {
  const counts = currentCoreMinorSanfangReviewCounts();
  coreMinorSanfangReviewReviewCount.textContent = counts ? String(counts.reviewCount) : "—";
  coreMinorSanfangReviewOccurrenceCount.textContent = counts
    ? String(counts.occurrenceCount)
    : "—";
  coreMinorSanfangReviewResolved.textContent = "0";
  coreMinorSanfangReviewReviewer.textContent = "尚未提供";
  coreMinorSanfangReviewItems.replaceChildren();
  coreMinorSanfangReviewItems.hidden = true;
  setCoreMinorSanfangReviewBoundary(null);
  setCoreMinorSanfangReviewMessage(message, state);
}

function setCoreMinorSanfangReviewBoundary(
  preflight: ZiweiCoreMinorStarSanfangReviewFeedbackPreflight | null
): void {
  const scope = currentCoreMinorSanfangReviewScope;
  coreMinorSanfangReviewPanel.dataset.currentProjectionBound = String(
    scope !== null && isCurrentCoreMinorSanfangReviewScope(scope)
  );
  coreMinorSanfangReviewPanel.dataset.identityVerified = String(
    preflight?.identityVerified ?? false
  );
  coreMinorSanfangReviewPanel.dataset.digitalSignatureVerified = String(
    preflight?.digitalSignatureVerified ?? false
  );
  coreMinorSanfangReviewPanel.dataset.expertTruthClaimed = "false";
  coreMinorSanfangReviewPanel.dataset.eligibleForFormalActivation = String(
    preflight?.eligibleForFormalActivation ?? false
  );
  coreMinorSanfangReviewPanel.dataset.autoIntegrationAllowed = String(
    preflight?.autoIntegrationAllowed ?? false
  );
  coreMinorSanfangReviewPanel.dataset.catalogDecisionInheritanceAllowed = "false";
  coreMinorSanfangReviewPanel.dataset.artifactRevisionOrStorageMutationPerformed = String(
    preflight?.ruleArtifactOrStorageMutationPerformed ?? false
  );
  coreMinorSanfangReviewPanel.dataset.networkUploadPerformed = String(
    preflight?.networkTransmissionPerformed ?? false
  );
  coreMinorSanfangReviewPanel.dataset.scoringAllowed = String(
    preflight?.scoringAllowed ?? false
  );
  coreMinorSanfangReviewPanel.dataset.goodBadOrientation = "null";
  coreMinorSanfangReviewPanel.dataset.eventOutcome = "null";
  coreMinorSanfangReviewPanel.dataset.result = "null";
}

function setCoreMinorSanfangReviewMessage(
  message: string,
  state: "idle" | "loading" | "success" | "error",
  updatePreflightState = true
): void {
  coreMinorSanfangReviewMessage.textContent = message;
  coreMinorSanfangReviewMessage.dataset.state = state;
  if (updatePreflightState) {
    coreMinorSanfangReviewPanel.dataset.preflightState = ({
      idle: "idle",
      loading: "loading",
      success: "valid",
      error: "invalid"
    } as const)[state];
  }
}

async function prepareCoreMinorSanfangReviewPacket(): Promise<void> {
  const scope = currentCoreMinorSanfangReviewScope;
  if (!scope || !isCurrentCoreMinorSanfangReviewScope(scope)) {
    invalidateCoreMinorSanfangReviewScope(
      "当前整盘绑定已失效；请重新计算或重开后再准备审稿包。",
      false
    );
    return;
  }
  const token = ++coreMinorSanfangReviewReadToken;
  if (coreMinorSanfangReviewPanel.dataset.preflightState === "loading") {
    clearCoreMinorSanfangReviewPreflight(
      "上一项文件预检已由本次准备操作取消。",
      "idle"
    );
  }
  preparedCoreMinorSanfangReviewPacket = null;
  coreMinorSanfangReviewPanel.dataset.packetState = "preparing";
  coreMinorSanfangReviewPanel.setAttribute("aria-busy", "true");
  coreMinorSanfangReviewPrepare.disabled = true;
  coreMinorSanfangReviewDownload.disabled = true;
  setCoreMinorSanfangReviewFileDisabled(true);
  setCoreMinorSanfangReviewMessage(
    "正在从当前整盘投影准备独立 JSON；不会自动下载、上传或写入本地档案…",
    "loading",
    false
  );
  try {
    const template = await createZiweiCoreMinorStarSanfangReviewFeedbackTemplate(
      scope.projection
    );
    if (!isCurrentCoreMinorSanfangReviewOperation(scope, token)) return;
    const serialized = serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate(template);
    const byteLength = new TextEncoder().encode(serialized).byteLength;
    if (byteLength < 1 || byteLength > ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES) {
      throw new Error("当前整盘审稿模板必须是 1 字节至 2 MiB 的 UTF-8 JSON");
    }
    const fileName = ziweiCoreMinorStarSanfangReviewFeedbackFilename();
    preparedCoreMinorSanfangReviewPacket = Object.freeze({
      viewEpoch: scope.viewEpoch,
      scopeEpoch: scope.scopeEpoch,
      artifactSha256: scope.artifactSha256,
      projection: scope.projection,
      serialized,
      fileName
    });
    coreMinorSanfangReviewPanel.dataset.packetState = "ready";
    coreMinorSanfangReviewDownload.disabled = false;
    setCoreMinorSanfangReviewMessage(
      `已准备 ${fileName}，包含 ${template.projectionBinding.reviewCount} 个目标宫复核与 ${template.projectionBinding.itemCount} 项 occurrence；请显式下载并自行保管。`,
      "success",
      false
    );
  } catch (cause) {
    if (!isCurrentCoreMinorSanfangReviewOperation(scope, token)) return;
    preparedCoreMinorSanfangReviewPacket = null;
    coreMinorSanfangReviewPanel.dataset.packetState = "error";
    coreMinorSanfangReviewDownload.disabled = true;
    setCoreMinorSanfangReviewMessage(
      cause instanceof Error && cause.message
        ? `准备失败：${cause.message}`
        : "准备失败：当前整盘审稿包没有生成。",
      "error",
      false
    );
  } finally {
    if (isCurrentCoreMinorSanfangReviewOperation(scope, token)) {
      coreMinorSanfangReviewPanel.setAttribute("aria-busy", "false");
      coreMinorSanfangReviewPrepare.disabled = false;
      setCoreMinorSanfangReviewFileDisabled(false);
    }
  }
}

function downloadPreparedCoreMinorSanfangReviewPacket(): void {
  const scope = currentCoreMinorSanfangReviewScope;
  const packet = preparedCoreMinorSanfangReviewPacket;
  if (!scope
    || !packet
    || !isCurrentCoreMinorSanfangReviewScope(scope)
    || packet.viewEpoch !== scope.viewEpoch
    || packet.scopeEpoch !== scope.scopeEpoch
    || packet.artifactSha256 !== scope.artifactSha256
    || packet.projection !== scope.projection) {
    preparedCoreMinorSanfangReviewPacket = null;
    coreMinorSanfangReviewDownload.disabled = true;
    coreMinorSanfangReviewPanel.dataset.packetState = "unavailable";
    setCoreMinorSanfangReviewMessage(
      "已准备 JSON 不再属于当前整盘；请重新准备后再下载。",
      "error",
      false
    );
    return;
  }
  startTextDownload(packet.serialized, packet.fileName);
  setCoreMinorSanfangReviewMessage(
    `浏览器已开始下载 ${packet.fileName}；SHA-256 摘要不是加密或数字签名。`,
    "success",
    false
  );
}

async function inspectSelectedCoreMinorSanfangReviewFeedback(): Promise<void> {
  const file = coreMinorSanfangReviewFile.files?.[0];
  // A cancelled chooser must not erase a valid preview for the same live scope.
  if (!file) return;
  const scope = currentCoreMinorSanfangReviewScope;
  if (!scope || !isCurrentCoreMinorSanfangReviewScope(scope)) {
    coreMinorSanfangReviewFile.value = "";
    invalidateCoreMinorSanfangReviewScope(
      "当前整盘绑定已失效；未读取所选文件，请重新计算或重开后再预检。",
      false
    );
    return;
  }
  const token = ++coreMinorSanfangReviewReadToken;
  if (coreMinorSanfangReviewPanel.dataset.packetState === "preparing") {
    preparedCoreMinorSanfangReviewPacket = null;
    coreMinorSanfangReviewDownload.disabled = true;
    coreMinorSanfangReviewPanel.dataset.packetState = "unprepared";
  }
  coreMinorSanfangReviewPanel.setAttribute("aria-busy", "true");
  coreMinorSanfangReviewPrepare.disabled = true;
  setCoreMinorSanfangReviewFileDisabled(true);
  clearCoreMinorSanfangReviewPreflight(
    "正在只读检查文件是否严格绑定当前整盘；不会写入规则、工件或任何浏览器存储…",
    "loading"
  );
  try {
    if (!file.name.toLowerCase().endsWith(".json")) {
      throw new Error("动态审稿反馈文件必须使用 .json 扩展名");
    }
    if (file.size < 1 || file.size > ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES) {
      throw new Error("动态审稿反馈文件必须是 1 字节至 2 MiB 的 UTF-8 JSON");
    }
    const bytes = await file.arrayBuffer();
    if (!isCurrentCoreMinorSanfangReviewOperation(scope, token)) return;
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const preflight = await preflightZiweiCoreMinorStarSanfangReviewFeedback(
      raw,
      scope.projection
    );
    if (!isCurrentCoreMinorSanfangReviewOperation(scope, token)) return;
    renderCoreMinorSanfangReviewPreflight(preflight, file.name);
  } catch (cause) {
    if (!isCurrentCoreMinorSanfangReviewOperation(scope, token)) return;
    clearCoreMinorSanfangReviewPreflight(
      cause instanceof Error && cause.message
        ? `预检失败：${cause.message}`
        : "预检失败：这不是可读取且严格绑定当前整盘的 UTF-8 JSON。",
      "error"
    );
  } finally {
    if (isCurrentCoreMinorSanfangReviewOperation(scope, token)) {
      coreMinorSanfangReviewFile.value = "";
      coreMinorSanfangReviewPanel.setAttribute("aria-busy", "false");
      coreMinorSanfangReviewPrepare.disabled = false;
      setCoreMinorSanfangReviewFileDisabled(false);
    }
  }
}

function renderCoreMinorSanfangReviewPreflight(
  preflight: ZiweiCoreMinorStarSanfangReviewFeedbackPreflight,
  fileName: string
): void {
  coreMinorSanfangReviewReviewCount.textContent = String(
    preflight.envelope.projectionBinding.reviewCount
  );
  coreMinorSanfangReviewOccurrenceCount.textContent = String(preflight.counts.total);
  coreMinorSanfangReviewResolved.textContent = String(preflight.resolvedCount);
  coreMinorSanfangReviewReviewer.textContent = preflight.reviewerAttributionComplete
    ? `${preflight.envelope.reviewer.displayName}（自述，未核验）`
    : "尚未提供";
  setCoreMinorSanfangReviewBoundary(preflight);
  coreMinorSanfangReviewPanel.dataset.preflightState = "valid";
  coreMinorSanfangReviewItems.replaceChildren();
  const resolvedItems = preflight.envelope.items.filter(
    (item) => item.decision !== "unresolved"
  );
  for (const item of resolvedItems) {
    const card = document.createElement("li");
    card.className = "core-minor-sanfang-review-item";
    card.dataset.occurrenceId = item.occurrenceId;
    card.dataset.reviewId = item.reviewId;
    card.dataset.decision = item.decision;
    card.dataset.orientationProposal = item.orientationProposal;
    card.dataset.expertTruthClaimed = "false";
    card.dataset.formalActivationAllowed = "false";
    card.dataset.scoringAllowed = "false";
    card.dataset.goodBadOrientation = "null";
    card.dataset.eventOutcome = "null";
    card.dataset.result = "null";

    const heading = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = `${item.targetPalaceRoleLabel} · ${item.relationLabel}${item.palaceRoleLabel}${item.starLabel}`;
    const decision = document.createElement("span");
    decision.textContent = coreMinorSanfangReviewDecisionLabel(item.decision);
    heading.append(title, decision);

    const details = document.createElement("dl");
    details.append(
      summaryPair("方向提案", coreMinorSanfangReviewOrientationLabel(item.orientationProposal)),
      summaryPair("流派口径", item.selectedTradition || "尚未提供"),
      summaryPair("审稿理由", item.decisionReason || "尚未提供"),
      summaryPair("成立条件", item.applicabilityConditions || "尚未提供"),
      summaryPair("反例提醒", item.counterexamples || "尚未提供"),
      summaryPair("候选反向约束", item.counterweight)
    );
    if (item.revisionRequest) details.append(summaryPair("退修要求", item.revisionRequest));
    details.append(renderCoreMinorSanfangFeedbackSourceRow(item, preflight));
    if (item.additionalSourceUrls.length > 0) {
      const sourceRow = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = "补充来源";
      const description = document.createElement("dd");
      item.additionalSourceUrls.forEach((sourceUrl, index) => {
        const link = document.createElement("a");
        link.href = sourceUrl;
        link.target = "_blank";
        link.rel = "noreferrer noopener";
        link.textContent = `来源 ${index + 1}`;
        if (index > 0) description.append("、");
        description.append(link);
      });
      sourceRow.append(term, description);
      details.append(sourceRow);
    }
    card.append(heading, details);
    coreMinorSanfangReviewItems.append(card);
  }
  coreMinorSanfangReviewItems.hidden = resolvedItems.length === 0;
  setCoreMinorSanfangReviewMessage(
    `预检通过：${fileName} 严格绑定当前整盘 ${preflight.envelope.projectionBinding.reviewCount} 个目标宫复核与 ${preflight.counts.total} 项 occurrence；已裁决 ${preflight.resolvedCount} 项、未裁决 ${preflight.unresolvedCount} 项。身份仅自述且无签名；本次零网络、零规则写入、零浏览器存储写入。`,
    "success"
  );
}

function renderCoreMinorSanfangFeedbackSourceRow(
  item: ZiweiCoreMinorStarSanfangReviewFeedbackPreflight["envelope"]["items"][number],
  preflight: ZiweiCoreMinorStarSanfangReviewFeedbackPreflight
): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = "绑定来源";
  const description = document.createElement("dd");
  for (const [index, sourceRef] of item.sourceRefs.entries()) {
    const source = preflight.envelope.sourceRegistry.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId
    );
    if (!source) throw new Error(`动态审稿反馈来源 ${sourceRef.sourceId} 未注册`);
    const wrapper = document.createElement("span");
    wrapper.className = "core-minor-sanfang-review-feedback-source";
    const title = document.createElement("strong");
    title.textContent = source.title;
    const binding = document.createElement("code");
    binding.textContent = `${sourceRef.locator} · bindingTarget=${sourceRef.bindingTarget} · semanticCandidateSupport=${String(sourceRef.semanticCandidateSupport)}`;
    wrapper.append(title, "：", binding);
    if (index > 0) description.append(document.createElement("br"));
    description.append(wrapper);
  }
  row.append(term, description);
  return row;
}

function coreMinorSanfangReviewDecisionLabel(
  decision: ZiweiCoreMinorStarSanfangReviewFeedbackPreflight["envelope"]["items"][number]["decision"]
): string {
  return ({
    unresolved: "尚未裁决",
    approve: "建议保留",
    revise: "建议退修",
    reject: "建议驳回"
  } as const)[decision];
}

function coreMinorSanfangReviewOrientationLabel(
  orientation: ZiweiCoreMinorStarSanfangReviewFeedbackPreflight["envelope"]["items"][number]["orientationProposal"]
): string {
  return ({
    unresolved: "尚未提出",
    potentially_supportive: "条件满足时可能偏支持",
    potentially_challenging: "条件满足时可能偏挑战",
    mixed_conditional: "正反并见，取决于条件",
    not_assessable: "现有证据不足以提出方向"
  } as const)[orientation];
}

async function inspectSelectedBackup(): Promise<void> {
  pendingRestore = null;
  restoreButton.disabled = true;
  const file = restoreFile.files?.[0];
  if (!file) {
    setSafetyMessage("请选择一个紫微完整备份文件。", "error");
    return;
  }
  setSafetyMessage("正在检查备份；检查期间不会写入资料库…", "loading");
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inspection = await repository.inspectFullBackupRestore(bytes);
    pendingRestore = { bytes, inspection };
    if (inspection.conflictCount > 0) {
      setSafetyMessage(
        `检查停止：发现 ${inspection.conflictCount} 个不可变身份冲突，不会覆盖任何资料。`,
        "error"
      );
      return;
    }
    if (inspection.capacityExceeded) {
      setSafetyMessage("检查停止：恢复后会超过当前独立档案容量。", "error");
      return;
    }
    if (inspection.newRevisionCount === 0) {
      setSafetyMessage(
        `检查通过：${inspection.alreadyPresentCount} 个 Revision 已全部存在，无需恢复；没有写入。`,
        "success"
      );
      return;
    }
    restoreButton.disabled = false;
    setSafetyMessage(
      `检查通过，尚未恢复：将新增 ${inspection.newRevisionCount} 个，已存在 ${inspection.alreadyPresentCount} 个 Revision。`,
      "success"
    );
  } catch (cause) {
    pendingRestore = null;
    setSafetyMessage(userFacingError(cause, "这不是可安全恢复的紫微完整备份。"), "error");
  }
}

async function restoreInspectedBackup(): Promise<void> {
  if (!pendingRestore) return;
  const prepared = pendingRestore;
  restoreButton.disabled = true;
  setSafetyMessage("正在以一笔事务恢复新档案…", "loading");
  try {
    const restored = await repository.restoreFullBackup(
      prepared.bytes,
      prepared.inspection.targetEpoch
    );
    setSafetyMessage(
      restored.addedRevisionCount > 0
        ? `已恢复 ${restored.addedRevisionCount} 个新 Revision；${restored.alreadyPresentCount} 个相同内容已跳过。`
        : "这些 Revision 已全部存在，没有重复写入。",
      "success"
    );
    pendingRestore = null;
    restoreFile.value = "";
    publishUpdate(restored.epoch);
    await refreshWorkspace(undefined, false);
  } catch (cause) {
    const message = userFacingError(cause, "恢复没有完成；没有部分写入。 ");
    setSafetyMessage(message, "error");
    if (isEpochConflict(cause)) {
      pendingRestore = null;
      restoreFile.value = "";
      await refreshWorkspace(undefined, false);
    } else {
      restoreButton.disabled = false;
    }
  }
}

async function clearWorkspace(): Promise<void> {
  if (!clearAccepted.checked || mutationState.revisionCount === 0) return;
  const accepted = globalThis.confirm(
    `确认从本设备清空 ${mutationState.revisionCount} 个紫微 Revision？\n\n不会影响八字资料库和已下载的备份文件。`
  );
  if (!accepted) return;

  clearButton.disabled = true;
  setSafetyMessage("正在清空独立紫微档案…", "loading");
  try {
    const cleared = await repository.clearAll(mutationState.epoch);
    clearAccepted.checked = false;
    pendingRestore = null;
    restoreButton.disabled = true;
    setSafetyMessage(
      cleared.status === "cleared"
        ? `已清空 ${cleared.removedRevisionCount} 个紫微 Revision；八字资料未受影响。`
        : "独立紫微档案已经是空的。",
      "success"
    );
    if (currentRevision) {
      currentRevision = null;
      artifactBadge.textContent = "当前页仍显示 · 已不在档案中";
      artifactBadge.dataset.state = "verified";
      setAudit("revision", "已从本地档案清空");
    }
    publishUpdate(cleared.epoch);
    await refreshWorkspace(undefined, false);
  } catch (cause) {
    setSafetyMessage(userFacingError(cause, "清空没有完成，原资料仍保留。"), "error");
    if (isEpochConflict(cause)) await refreshWorkspace(undefined, false);
  }
}

function renderArtifact(
  artifact: BrowserArtifact,
  projection: BrowserProbeDisplayProjection,
  revision: ZiweiBrowserWorkspaceRevisionDraft | null
): void {
  const { displayPalaces, displaySummary } = projection;
  currentProjection = projection;
  bindCoreMinorSanfangReviewProjection(artifact, projection);
  board.querySelectorAll(".palace-cell").forEach((element) => element.remove());
  board.dataset.hasResult = "true";
  for (const palace of displayPalaces) {
    const cell = document.createElement("article");
    cell.className = "palace-cell";
    cell.dataset.life = String(palace.roleId === "life");
    cell.dataset.body = String(palace.isBodyPalace);
    cell.dataset.branch = palace.earthlyBranchId;
    cell.setAttribute(
      "aria-label",
      `${palace.roleLabel}，${palace.heavenlyStemLabel}${palace.earthlyBranchLabel}，星曜：${palace.stars.map((star) => star.label).join("、")}`
    );

    const heading = document.createElement("div");
    heading.className = "palace-heading";
    const role = document.createElement("strong");
    role.className = "palace-role";
    role.textContent = palace.roleLabel;
    const branch = document.createElement("span");
    branch.className = "palace-branch";
    branch.textContent = `${palace.heavenlyStemLabel}${palace.earthlyBranchLabel}`;
    heading.append(role, branch);

    const list = document.createElement("ul");
    list.className = "star-list";
    const visibleStars = palace.stars.slice(0, 6);
    for (const star of visibleStars) {
      const item = document.createElement("li");
      item.dataset.major = String(star.category === "major");
      item.dataset.starId = star.starId;
      item.dataset.starLabel = star.label;
      item.dataset.factCategory = star.category;
      item.dataset.coreMinorBaseContentId = star.coreMinorCandidateContent?.contentId ?? "null";
      item.dataset.coreMinorPalaceContentId = star.coreMinorPalaceCandidateContent?.contentId ?? "null";
      const suffix = [star.brightnessLabel, ...star.transformations].filter(Boolean).join("·");
      item.textContent = suffix ? `${star.label}〔${suffix}〕` : star.label;
      list.append(item);
    }
    cell.append(heading, list);
    if (palace.stars.length > visibleStars.length) {
      const overflow = document.createElement("span");
      overflow.className = "star-overflow";
      overflow.textContent = `另有 ${palace.stars.length - visibleStars.length} 星；读屏标签保留完整列表`;
      cell.append(overflow);
    }
    board.append(cell);
  }

  renderSanfangPanel(projection);

  centerPrimary.textContent = `${displaySummary.lifePalace}命宫 · ${displaySummary.fiveElementBureau}`;
  centerSecondary.textContent = `${displaySummary.gregorianDate} · ${displaySummary.shichen} · ${displaySummary.sex}`;
  centerSummary.replaceChildren(
    summaryPair("农历", displaySummary.lunarDate),
    summaryPair("命身", `${displaySummary.lifePalace} / ${displaySummary.bodyPalace}`),
    summaryPair("大限", displaySummary.direction),
    summaryPair("四柱", displaySummary.ganzhi)
  );
  centerSummary.hidden = false;
  artifactAudit.hidden = false;
  setAudit("artifact", artifact.digests.artifactSha256);
  setAudit("facts", artifact.digests.factsSha256);
  setAudit("source", artifact.execution.browserSourceIdentity.browserSourceGraphSha256);
  setAudit("revision", revision?.contentSha256 ?? "尚未保存");
}

function clearArtifact(invalidateView = true): void {
  if (invalidateView) beginViewReplacement();
  currentArtifact = null;
  currentRevision = null;
  currentProjection = null;
  resultMatchesInput = false;
  board.querySelectorAll(".palace-cell").forEach((element) => element.remove());
  delete board.dataset.hasResult;
  centerPrimary.textContent = "等待一次计算";
  centerSecondary.textContent = "计算完成后可预览，再由你明确决定是否保存。";
  centerSummary.replaceChildren();
  centerSummary.hidden = true;
  sanfangFocus.replaceChildren();
  sanfangTargetSummary.textContent = "";
  palaceReadingReview.replaceChildren();
  palaceReadingReview.hidden = true;
  invalidateCoreMinorSanfangReviewScope(
    "请先生成或重开一张通过核对的盘，再准备当前整盘审稿包。",
    true
  );
  sanfangGrid.replaceChildren();
  delete sanfangPanel.dataset.targetEarthlyBranchId;
  delete sanfangPanel.dataset.targetPalaceRoleId;
  delete sanfangPanel.dataset.coreMinorCatalogCount;
  delete sanfangPanel.dataset.coreMinorPalaceCatalogCount;
  delete sanfangPanel.dataset.coreMinorSourceCount;
  sanfangPanel.hidden = true;
  artifactAudit.hidden = true;
  saveForm.hidden = true;
  artifactBadge.textContent = "尚未生成";
  artifactBadge.dataset.state = "empty";
}

function renderSanfangPanel(projection: BrowserProbeDisplayProjection): void {
  if (projection.coreMinorStarCandidateContent.length !== 12
    || projection.coreMinorStarPalaceCandidateContent.length !== 144
    || projection.coreMinorStarContentSources.length !== 2) {
    throw new Error("核心十二星显示目录必须恰有 12 条基础候选、144 条落宫候选与 2 个来源");
  }
  sanfangPanel.dataset.coreMinorCatalogCount = String(
    projection.coreMinorStarCandidateContent.length
  );
  sanfangPanel.dataset.coreMinorPalaceCatalogCount = String(
    projection.coreMinorStarPalaceCandidateContent.length
  );
  sanfangPanel.dataset.coreMinorSourceCount = String(
    projection.coreMinorStarContentSources.length
  );
  const previousTarget = sanfangFocus.value;
  sanfangFocus.replaceChildren();
  for (const group of projection.displaySanfangGroups) {
    const target = group.members.find((member) => member.relation === "self")?.palace;
    if (!target) throw new Error(`三方四正事实摘要缺少本宫 ${group.targetEarthlyBranchId}`);
    const option = document.createElement("option");
    option.value = group.targetEarthlyBranchId;
    option.textContent = `${target.roleLabel} · ${target.heavenlyStemLabel}${target.earthlyBranchLabel}`;
    const palaceReview = projection.palaceFirstSynthesisReviews.find(
      (candidate) => candidate.targetEarthlyBranchId === group.targetEarthlyBranchId
    );
    if (!palaceReview) throw new Error(`逐宫直读复核包缺少目标宫位 ${group.targetEarthlyBranchId}`);
    const transformationReview = projection.palaceNatalTransformationReviews.find(
      (candidate) => candidate.targetEarthlyBranchId === group.targetEarthlyBranchId
    );
    if (!transformationReview) {
      throw new Error(`本命生年四化修正复核包缺少目标宫位 ${group.targetEarthlyBranchId}`);
    }
    option.dataset.targetMainStarState = palaceReview.targetMainStarState;
    option.dataset.natalTransformationCount = String(transformationReview.occurrences.length);
    option.dataset.targetCoreMinorCount = String(coreMinorBindingsInPalace(target).length);
    option.dataset.targetNonCoreMinorCount = String(target.stars.filter(
      (star) => star.category === "minor" && requireCoreMinorCandidatePair(star, target) === null
    ).length);
    option.dataset.targetAuxiliaryCount = String(target.stars.filter(
      (star) => star.category === "auxiliary"
    ).length);
    sanfangFocus.append(option);
  }
  const defaultGroup = projection.displaySanfangGroups.find((group) => group.targetRoleId === "life")
    ?? projection.displaySanfangGroups[0];
  if (!defaultGroup) throw new Error("三方四正事实摘要没有可选择的宫位");
  sanfangFocus.value = projection.displaySanfangGroups.some(
    (group) => group.targetEarthlyBranchId === previousTarget
  ) ? previousTarget : defaultGroup.targetEarthlyBranchId;
  sanfangRuleId.textContent = projection.sanfangProjectionRule.ruleId;
  sanfangSourceLink.href = projection.sanfangProjectionRule.sourceUrl;
  sanfangSourceLink.title = `${projection.sanfangProjectionRule.sourceTitle}（访问于 ${projection.sanfangProjectionRule.accessedAt}）`;
  sanfangPanel.hidden = false;
  renderSanfangSelection(projection, sanfangFocus.value);
}

function renderSanfangSelection(
  projection: BrowserProbeDisplayProjection,
  targetEarthlyBranchId: string
): void {
  const group = projection.displaySanfangGroups.find(
    (candidate) => candidate.targetEarthlyBranchId === targetEarthlyBranchId
  );
  if (!group) throw new Error(`找不到地支 ${targetEarthlyBranchId} 的三方四正事实摘要`);
  const target = group.members.find((member) => member.relation === "self")?.palace;
  if (!target) throw new Error(`三方四正事实摘要缺少本宫 ${targetEarthlyBranchId}`);

  sanfangTargetSummary.textContent = `${target.roleLabel}为本宫；先读唯一逐宫总览，再按需展开下列四宫的逐星复核包。`;
  sanfangPanel.dataset.targetEarthlyBranchId = targetEarthlyBranchId;
  sanfangPanel.dataset.targetPalaceRoleId = target.roleId;
  const palaceCells = [...board.querySelectorAll<HTMLElement>(".palace-cell")];
  for (const cell of palaceCells) delete cell.dataset.sanfangRelation;
  for (const member of group.members) {
    const cell = palaceCells.find(
      (candidate) => candidate.dataset.branch === member.palace.earthlyBranchId
    );
    if (!cell) throw new Error(`十二宫盘面缺少地支 ${member.palace.earthlyBranchId}`);
    cell.dataset.sanfangRelation = member.relation;
  }
  renderPalaceFirstSynthesisReview(projection, targetEarthlyBranchId);
  sanfangGrid.replaceChildren();
  for (const member of group.members) {
    const card = document.createElement("article");
    card.className = "sanfang-card";
    card.dataset.relation = member.relation;
    card.dataset.palaceEarthlyBranchId = member.palace.earthlyBranchId;
    card.dataset.palaceRoleId = member.palace.roleId;

    const heading = document.createElement("header");
    const relation = document.createElement("span");
    relation.className = "sanfang-relation";
    relation.textContent = member.relationLabel;
    const palace = document.createElement("strong");
    palace.textContent = `${member.palace.roleLabel} · ${member.palace.heavenlyStemLabel}${member.palace.earthlyBranchLabel}`;
    heading.append(relation, palace);

    const majorStars = member.palace.stars.filter((star) => star.category === "major");
    const supportingStars = member.palace.stars.filter((star) => star.category !== "major");
    const coreMinorBindings = coreMinorBindingsInPalace(member.palace);
    const uninterpretedMinorStars = supportingStars.filter(
      (star) => star.category === "minor"
        && requireCoreMinorCandidatePair(star, member.palace) === null
    );
    const auxiliaryStars = supportingStars.filter((star) => star.category === "auxiliary");
    card.dataset.coreMinorCandidateCount = String(coreMinorBindings.length);
    card.dataset.uninterpretedMinorCount = String(uninterpretedMinorStars.length);
    card.dataset.auxiliaryCount = String(auxiliaryStars.length);
    const transformations = member.palace.stars.flatMap((star) =>
      star.transformations.map((transformation) => `${star.label}化${transformation}`)
    );
    const facts = document.createElement("dl");
    facts.append(
      sanfangFactRow(
        "主星",
        majorStars.map(formatDisplayStar),
        "无主星（仅事实状态）"
      ),
      sanfangStarFactRow("辅／杂曜", supportingStars, member.palace),
      sanfangFactRow("生年四化", transformations, "本宫无四化标记")
    );
    card.append(heading, facts);
    if (coreMinorBindings.length > 0) {
      const contentList = document.createElement("div");
      contentList.className = "core-minor-content-list";
      contentList.setAttribute("aria-label", `${member.palace.roleLabel}核心十二星候选`);
      for (const binding of coreMinorBindings) {
        contentList.append(renderCoreMinorStarCandidate(
          binding.star,
          member.palace,
          projection,
          binding.pair
        ));
      }
      card.append(contentList);
    }
    if (majorStars.length > 0) {
      const contentList = document.createElement("div");
      contentList.className = "major-content-list";
      for (const star of majorStars) {
        contentList.append(renderMajorStarCandidate(star, member.palace, projection));
      }
      card.append(contentList);
    }
    sanfangGrid.append(card);
  }
  renderCoreMinorSanfangReviewSelection(projection, targetEarthlyBranchId);
}

function bindCoreMinorSanfangReviewProjection(
  artifact: BrowserArtifact,
  projection: BrowserProbeDisplayProjection
): void {
  const reviews = projection.coreMinorStarSanfangReviews;
  const occurrenceCount = reviews.reduce((sum, review) => sum + review.occurrences.length, 0);
  if (reviews.length !== 12
    || occurrenceCount !== 48
    || reviews.some((review, index) => review.order !== index + 1)
    || new Set(reviews.map((review) => review.reviewId)).size !== reviews.length
    || new Set(reviews.map((review) => review.ruleSnapshotSha256)).size !== 1
    || new Set(reviews.map((review) => review.artifactFactsSha256)).size !== 1
    || reviews.some((review) => (
      review.ruleSnapshotSha256 !== artifact.digests.ruleSnapshotSha256
      || review.artifactFactsSha256 !== artifact.digests.factsSha256
      || review.goodBadOrientation !== null
      || review.eventOutcome !== null
      || review.result !== null
      || review.expertTruthClaimed
      || review.directOutcomeAllowed
      || review.scoringAllowed
    ))) {
    throw new Error("核心十二辅煞动态审稿投影没有严格绑定当前盘的十二组与 48 项 occurrence");
  }

  coreMinorSanfangReviewScopeEpoch += 1;
  coreMinorSanfangReviewReadToken += 1;
  currentCoreMinorSanfangReviewScope = Object.freeze({
    viewEpoch,
    scopeEpoch: coreMinorSanfangReviewScopeEpoch,
    artifactSha256: artifact.digests.artifactSha256,
    projection
  });
  resetCoreMinorSanfangReviewPacketAndPreflight(
    "当前整盘已绑定。请显式准备模板，或选择同一当前盘的已填写 JSON 做只读预检。"
  );
  coreMinorSanfangReviewPanel.hidden = false;
  coreMinorSanfangReviewPanel.dataset.currentProjectionBound = "true";
  coreMinorSanfangReviewPanel.dataset.viewEpoch = String(viewEpoch);
  coreMinorSanfangReviewPanel.dataset.scopeEpoch = String(coreMinorSanfangReviewScopeEpoch);
  coreMinorSanfangReviewPanel.dataset.artifactSha256 = artifact.digests.artifactSha256;
  coreMinorSanfangReviewPanel.dataset.artifactFactsSha256 = artifact.digests.factsSha256;
  coreMinorSanfangReviewPanel.dataset.ruleSnapshotSha256 = artifact.digests.ruleSnapshotSha256;
  coreMinorSanfangReviewPanel.dataset.reviewVersion = reviews[0]!.reviewVersion;
  coreMinorSanfangReviewPanel.dataset.reviewCount = String(reviews.length);
  coreMinorSanfangReviewPanel.dataset.occurrenceCount = String(occurrenceCount);
  coreMinorSanfangReviewReviewCount.textContent = String(reviews.length);
  coreMinorSanfangReviewOccurrenceCount.textContent = String(occurrenceCount);
  coreMinorSanfangReviewPrepare.disabled = false;
  coreMinorSanfangReviewFile.disabled = false;
  setCoreMinorSanfangReviewFileDisabled(false);
}

function renderCoreMinorSanfangReviewSelection(
  projection: BrowserProbeDisplayProjection,
  targetEarthlyBranchId: string
): void {
  if (currentCoreMinorSanfangReviewScope?.projection !== projection) return;
  const review = projection.coreMinorStarSanfangReviews.find(
    (candidate) => candidate.targetEarthlyBranchId === targetEarthlyBranchId
  );
  if (!review) {
    throw new Error(`核心十二辅煞动态审稿投影缺少目标宫位 ${targetEarthlyBranchId}`);
  }
  if (new Set(review.occurrences.map((occurrence) => occurrence.occurrenceId)).size
    !== review.occurrences.length) {
    throw new Error(`核心十二辅煞动态审稿投影出现重复 occurrence：${review.reviewId}`);
  }
  coreMinorSanfangReviewPanel.dataset.displayTargetEarthlyBranchId = review.targetEarthlyBranchId;
  coreMinorSanfangReviewPanel.dataset.displayTargetPalaceRoleId = review.targetPalaceRoleId;
  coreMinorSanfangReviewPanel.dataset.displayReviewId = review.reviewId;
  coreMinorSanfangReviewFocusTitle.textContent =
    `${review.targetPalaceRoleLabel} · 当前证据浏览`;
  coreMinorSanfangReviewFocusSummary.textContent =
    `${review.directStatement} ${review.readingOrderStatement}`;
  coreMinorSanfangReviewFocusCount.textContent = `${review.occurrences.length} 项 occurrence`;
  coreMinorSanfangReviewOccurrences.replaceChildren();

  if (review.occurrences.length === 0) {
    const empty = document.createElement("p");
    empty.className = "core-minor-sanfang-review-empty";
    empty.textContent = review.absenceBoundary
      ?? "当前三方四正组没有核心十二辅煞 occurrence；保持空集合，不借入范围外星曜。";
    coreMinorSanfangReviewOccurrences.append(empty);
  } else {
    for (const occurrence of review.occurrences) {
      const item = document.createElement("article");
      item.className = "core-minor-sanfang-review-occurrence";
      item.dataset.occurrenceId = occurrence.occurrenceId;
      item.dataset.order = String(occurrence.order);
      item.dataset.relation = occurrence.relation;
      item.dataset.palaceEarthlyBranchId = occurrence.palaceEarthlyBranchId;
      item.dataset.palaceRoleId = occurrence.palaceRoleId;
      item.dataset.starId = occurrence.starId;
      item.dataset.baseCandidateContentId = occurrence.baseCandidateContentId;
      item.dataset.palaceCandidateContentId = occurrence.palaceCandidateContentId;
      item.dataset.nomenclatureConflictState = occurrence.nomenclatureConflictState;
      item.dataset.goodBadOrientation = "null";
      item.dataset.eventOutcome = "null";
      item.dataset.result = "null";
      item.dataset.expertTruthClaimed = "false";

      const heading = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = `${occurrence.starLabel} · ${occurrence.palaceRoleLabel}`;
      const relation = document.createElement("span");
      relation.textContent = `${occurrence.order}. ${occurrence.relationLabel}`;
      heading.append(title, relation);

      const facts = document.createElement("p");
      facts.className = "core-minor-sanfang-review-occurrence-facts";
      facts.textContent = `事实字段：亮度 ${occurrence.brightnessLabel ?? "无标记"}；本命生年四化 ${occurrence.transformations.join("、") || "无标记"}。`;
      if (occurrence.nomenclatureConflictState === "classical_tiankong_not_dikong") {
        facts.append(" 名词冲突：古籍‘天空’不得自动等同当前地空星键。");
      }
      const statement = document.createElement("p");
      statement.className = "core-minor-sanfang-review-occurrence-statement";
      statement.textContent = occurrence.directStatement;

      const sourceDetail = document.createElement("details");
      const sourceSummary = document.createElement("summary");
      sourceSummary.textContent = "展开来源与精确定位";
      sourceDetail.append(
        sourceSummary,
        renderCoreMinorSanfangReviewSources(projection, occurrence.sourceRefs)
      );
      item.append(heading, facts, statement, sourceDetail);
      coreMinorSanfangReviewOccurrences.append(item);
    }
  }

  const reviewDetail = document.createElement("details");
  reviewDetail.className = "core-minor-sanfang-review-scope-detail";
  const reviewSummary = document.createElement("summary");
  reviewSummary.textContent = "展开整组审稿问题与来源定位";
  const questions = document.createElement("ol");
  questions.className = "core-minor-sanfang-review-question-list";
  for (const question of review.reviewQuestions) {
    const item = document.createElement("li");
    item.textContent = question;
    questions.append(item);
  }
  reviewDetail.append(
    reviewSummary,
    questions,
    renderCoreMinorSanfangReviewSources(projection, review.sourceRefs)
  );
  coreMinorSanfangReviewOccurrences.append(reviewDetail);
}

function renderCoreMinorSanfangReviewSources(
  projection: BrowserProbeDisplayProjection,
  sourceRefs: readonly CoreMinorSanfangSourceRef[]
): HTMLUListElement {
  if (new Set(sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== sourceRefs.length) {
    throw new Error("核心十二辅煞动态审稿来源登记包含重复 source ID");
  }
  const list = document.createElement("ul");
  list.className = "core-minor-sanfang-review-source-list";
  for (const sourceRef of sourceRefs) {
    const coreSource = projection.coreMinorStarContentSources.find(
      (source) => source.sourceId === sourceRef.sourceId
    );
    const palaceSource = projection.majorStarPalaceContentSources.find(
      (source) => source.sourceId === sourceRef.sourceId
    );
    const geometrySource = projection.sanfangProjectionRule.ruleId === sourceRef.sourceId
      ? projection.sanfangProjectionRule
      : null;
    if ((coreSource ? 1 : 0) + (palaceSource ? 1 : 0) + (geometrySource ? 1 : 0) !== 1) {
      throw new Error(`核心十二辅煞动态审稿来源 ${sourceRef.sourceId} 未唯一登记`);
    }
    const sourceUrl = coreSource?.sourceUrl ?? palaceSource?.sourceUrl ?? geometrySource!.sourceUrl;
    const title = coreSource?.title ?? palaceSource?.title ?? geometrySource!.sourceTitle;
    const item = document.createElement("li");
    item.dataset.sourceId = sourceRef.sourceId;
    item.dataset.locator = sourceRef.locator;
    if ("bindingTarget" in sourceRef) {
      item.dataset.bindingTarget = sourceRef.bindingTarget;
      item.dataset.semanticCandidateSupport = String(sourceRef.semanticCandidateSupport);
    }
    const link = document.createElement("a");
    link.href = sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = title;
    const locator = document.createElement("code");
    locator.textContent = sourceRef.locator;
    item.append(link, locator);
    if ("bindingTarget" in sourceRef) {
      const binding = document.createElement("code");
      binding.textContent = `bindingTarget=${sourceRef.bindingTarget} · semanticCandidateSupport=${String(sourceRef.semanticCandidateSupport)}`;
      item.append(binding);
    }
    list.append(item);
  }
  return list;
}

function renderPalaceFirstSynthesisReview(
  projection: BrowserProbeDisplayProjection,
  targetEarthlyBranchId: string
): void {
  const review = projection.palaceFirstSynthesisReviews.find(
    (candidate) => candidate.targetEarthlyBranchId === targetEarthlyBranchId
  );
  if (!review) throw new Error(`找不到地支 ${targetEarthlyBranchId} 的逐宫直读复核包`);
  const transformationReview = projection.palaceNatalTransformationReviews.find(
    (candidate) => candidate.targetEarthlyBranchId === targetEarthlyBranchId
  );
  if (!transformationReview) {
    throw new Error(`找不到地支 ${targetEarthlyBranchId} 的本命生年四化修正复核包`);
  }
  const fourPartContent = projection.palaceFourPartSynthesisContents.find(
    (candidate) => candidate.targetEarthlyBranchId === targetEarthlyBranchId
  );
  if (!fourPartContent) {
    throw new Error(`找不到地支 ${targetEarthlyBranchId} 的四段式直读候选`);
  }
  const sanfangGroup = projection.displaySanfangGroups.find(
    (candidate) => candidate.targetEarthlyBranchId === targetEarthlyBranchId
  );
  if (!sanfangGroup) {
    throw new Error(`找不到地支 ${targetEarthlyBranchId} 的核心十二星三方四正事实`);
  }
  const groupCoreMinorCount = sanfangGroup.members.reduce(
    (count, member) => count + coreMinorBindingsInPalace(member.palace).length,
    0
  );

  const section = document.createElement("section");
  section.className = "palace-first-synthesis";
  section.dataset.reviewId = review.reviewId;
  section.dataset.reviewStatus = review.reviewStatus;
  section.dataset.evidenceClass = review.evidenceClass;
  section.dataset.result = "null";
  section.dataset.goodBadOrientation = "null";
  section.dataset.eventOutcome = "null";
  section.dataset.targetMainStarState = review.targetMainStarState;
  section.dataset.targetSynthesisCount = String(review.targetStarSynthesisIds.length);
  section.dataset.groupSynthesisCount = String(review.groupMajorStarSynthesisIds.length);
  section.dataset.natalTransformationCount = String(transformationReview.occurrences.length);
  section.dataset.coreMinorCandidateCount = String(groupCoreMinorCount);
  section.dataset.ruleSnapshotSha256 = review.ruleSnapshotSha256;
  section.dataset.artifactFactsSha256 = review.artifactFactsSha256;
  section.setAttribute("aria-label", `${review.targetPalaceRoleLabel}逐宫直读复核包`);

  const heading = document.createElement("div");
  heading.className = "palace-first-heading";
  const title = document.createElement("strong");
  title.textContent = `${review.targetPalaceRoleLabel} · 逐宫直读复核包`;
  const status = document.createElement("span");
  status.className = "palace-first-status";
  status.textContent = "结论待审";
  heading.append(title, status);

  const domain = document.createElement("p");
  domain.className = "palace-first-domain";
  const domainLabel = document.createElement("strong");
  domainLabel.textContent = "问题域候选：";
  domain.append(domainLabel, review.palaceRoleContent.domainSummary);

  const direct = document.createElement("p");
  direct.className = "palace-first-direct";
  direct.textContent = review.directStatement;

  const memberGrid = document.createElement("div");
  memberGrid.className = "palace-first-member-grid";
  memberGrid.setAttribute("aria-label", `${review.targetPalaceRoleLabel}三方四正事实`);
  for (const member of review.members) {
    const displayMember = sanfangGroup.members.find(
      (candidate) => candidate.relation === member.relation
        && candidate.palace.earthlyBranchId === member.palaceEarthlyBranchId
    );
    if (!displayMember) {
      throw new Error(`逐宫直读 ${member.relation} 缺少核心十二星事实宫位`);
    }
    const memberCoreMinorBindings = coreMinorBindingsInPalace(displayMember.palace);
    const card = document.createElement("article");
    card.className = "palace-first-member";
    card.dataset.relation = member.relation;
    card.dataset.coreMinorCandidateCount = String(memberCoreMinorBindings.length);
    const memberHeading = document.createElement("div");
    const relation = document.createElement("span");
    relation.textContent = member.relationLabel;
    const palace = document.createElement("strong");
    palace.textContent = `${member.palaceRoleLabel} · ${member.palaceEarthlyBranchLabel}`;
    memberHeading.append(relation, palace);
    const majorStars = document.createElement("p");
    majorStars.textContent = member.majorStars.length > 0
      ? member.majorStars.map(formatCombinationStarFact).join("、")
      : "无主星（仅事实状态）";
    const supporting = document.createElement("small");
    const transformations = member.transformationStars.flatMap((star) => (
      star.transformations.map((transformation) => `${star.label}化${transformation}`)
    ));
    supporting.textContent = `辅／杂曜 ${member.otherStarCount} · 生年四化 ${transformations.join("、") || "无标记"}`;
    const coreMinorSummary = document.createElement("p");
    coreMinorSummary.className = "palace-first-core-minor-summary";
    const coreMinorLabel = document.createElement("strong");
    coreMinorLabel.textContent = "核心十二星候选：";
    coreMinorSummary.append(coreMinorLabel);
    if (memberCoreMinorBindings.length === 0) {
      coreMinorSummary.append("无精确命中");
    } else {
      memberCoreMinorBindings.forEach((binding, index) => {
        if (index > 0) coreMinorSummary.append("、");
        const item = document.createElement("span");
        item.className = "palace-first-core-minor-item";
        item.dataset.starId = binding.star.starId;
        item.dataset.starLabel = binding.star.label;
        item.dataset.factCategory = binding.pair.base.factCategory;
        item.dataset.baseContentId = binding.pair.base.contentId;
        item.dataset.palaceContentId = binding.pair.palace.contentId;
        item.dataset.traditionalCluster = binding.pair.base.traditionalCluster;
        item.dataset.traditionalClusterIsOutcome = "false";
        item.textContent = `${binding.star.label}〔${traditionalClusterLabel(
          binding.pair.base.traditionalCluster
        )}，仅分组〕`;
        coreMinorSummary.append(item);
      });
    }
    card.append(memberHeading, majorStars, supporting, coreMinorSummary);
    memberGrid.append(card);
  }

  const readingOrder = document.createElement("p");
  readingOrder.className = "palace-first-order";
  readingOrder.textContent = review.readingOrderStatement;

  const nullState = document.createElement("p");
  nullState.className = "palace-first-null";
  const nullLabel = document.createElement("strong");
  nullLabel.textContent = "当前边界：";
  nullState.append(
    nullLabel,
    "综合结论、好坏方向与事件结果均未生成（result / goodBadOrientation / eventOutcome 均为 null）。"
  );

  const scope = document.createElement("p");
  scope.className = "palace-first-scope";
  scope.textContent = review.scopeNote;

  const detail = document.createElement("details");
  detail.className = "palace-first-detail";
  const detailSummary = document.createElement("summary");
  detailSummary.textContent = "展开宫位边界、来源与专家问题";
  const palacePrompt = document.createElement("p");
  palacePrompt.className = "palace-first-prompt";
  const promptLabel = document.createElement("strong");
  promptLabel.textContent = "宫位复核边界：";
  palacePrompt.append(promptLabel, review.palaceRoleContent.reviewPrompt);
  if (review.emptyMainStarBoundary) {
    const emptyBoundary = document.createElement("p");
    emptyBoundary.className = "palace-first-empty-boundary";
    emptyBoundary.textContent = review.emptyMainStarBoundary;
    detail.append(detailSummary, emptyBoundary, palacePrompt);
  } else {
    detail.append(detailSummary, palacePrompt);
  }
  const questions = document.createElement("ol");
  questions.className = "palace-first-review-questions";
  for (const question of review.reviewQuestions) {
    const item = document.createElement("li");
    item.textContent = question;
    questions.append(item);
  }
  const sources = document.createElement("p");
  sources.className = "palace-first-sources";
  sources.append("逐宫依据：");
  review.sourceRefs.forEach((sourceRef, index) => {
    const palaceSource = projection.majorStarPalaceContentSources.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId
    );
    const combinationSource = projection.majorStarCombinationReviewSources.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId
    );
    const isGeometryRule = sourceRef.sourceId === projection.sanfangProjectionRule.ruleId;
    if (!palaceSource && !combinationSource && !isGeometryRule) {
      throw new Error(`逐宫直读来源 ${sourceRef.sourceId} 未注册`);
    }
    const link = document.createElement("a");
    link.href = palaceSource?.sourceUrl
      ?? combinationSource?.sourceUrl
      ?? projection.sanfangProjectionRule.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = palaceSource
      ? (palaceSource.sourceKind === "public_domain_classical_palace_transcription"
        ? "古典宫位篇目"
        : "现代宫位资料")
      : combinationSource
        ? combinationSourceLabel(combinationSource.sourceKind)
        : "三方几何规则";
    const sourceTitle = palaceSource?.title
      ?? combinationSource?.title
      ?? projection.sanfangProjectionRule.sourceTitle;
    const accessedAt = palaceSource?.accessedAt
      ?? combinationSource?.accessedAt
      ?? projection.sanfangProjectionRule.accessedAt;
    const boundary = palaceSource?.usageBoundary ?? combinationSource?.usageBoundary ?? "只定义位置关系，不含解释。";
    link.title = `${sourceTitle} · ${sourceRef.locator} · 访问于 ${accessedAt}。${boundary}`;
    if (index > 0) sources.append("、");
    sources.append(link);
  });
  detail.append(questions, sources);

  section.append(
    heading,
    renderPalaceFourPartSynthesisContent(projection, fourPartContent),
    domain,
    direct,
    memberGrid,
    renderPalaceNatalTransformationReview(projection, transformationReview),
    readingOrder,
    nullState,
    scope,
    detail
  );
  palaceReadingReview.replaceChildren(section);
  palaceReadingReview.hidden = false;
}

function renderPalaceFourPartSynthesisContent(
  projection: BrowserProbeDisplayProjection,
  content: BrowserProbeDisplayProjection["palaceFourPartSynthesisContents"][number]
): HTMLElement {
  const section = document.createElement("section");
  section.className = "palace-four-part-synthesis";
  section.dataset.contentId = content.contentId;
  section.dataset.contentVersion = content.contentVersion;
  section.dataset.reviewStatus = content.reviewStatus;
  section.dataset.publicationStatus = content.publicationStatus;
  section.dataset.targetMainStarState = content.targetMainStarState;
  section.dataset.selectedDominantTheme = "null";
  section.dataset.resourcePressureOrientation = "null";
  section.dataset.goodBadOrientation = "null";
  section.dataset.eventOutcome = "null";
  section.dataset.result = "null";
  section.dataset.ruleSnapshotSha256 = content.ruleSnapshotSha256;
  section.dataset.artifactFactsSha256 = content.artifactFactsSha256;
  section.setAttribute("aria-label", `${content.targetPalaceRoleLabel}四段式直读候选`);

  const heading = document.createElement("div");
  heading.className = "palace-four-part-heading";
  const title = document.createElement("strong");
  title.textContent = `${content.targetPalaceRoleLabel} · 四段式直读候选`;
  const status = document.createElement("span");
  status.className = "palace-four-part-status";
  status.textContent = "内容待审";
  heading.append(title, status);

  const intro = document.createElement("p");
  intro.className = "palace-four-part-intro";
  intro.textContent =
    "按本宫主题、外部牵引、资源／压力观察和矛盾合成依次阅读；每段只重组当前盘已有候选，不替你选择主导主题。";

  const grid = document.createElement("div");
  grid.className = "palace-four-part-grid";
  for (const part of content.parts) {
    const card = document.createElement("article");
    card.className = "palace-four-part-card";
    card.dataset.sectionId = part.sectionId;
    card.dataset.order = String(part.order);
    card.dataset.relationCount = String(part.relationBindings.length);
    card.dataset.majorStarCount = String(part.majorStarBindings.length);
    card.dataset.transformationCount = String(part.transformationOccurrenceIds.length);
    card.dataset.ruleSnapshotSha256 = part.ruleSnapshotSha256;
    card.dataset.artifactFactsSha256 = part.artifactFactsSha256;

    const cardHeading = document.createElement("header");
    const order = document.createElement("span");
    order.textContent = String(part.order).padStart(2, "0");
    const partTitle = document.createElement("strong");
    partTitle.textContent = part.title;
    cardHeading.append(order, partTitle);

    const direct = document.createElement("p");
    direct.className = "palace-four-part-direct";
    direct.textContent = part.directStatement;

    const evidence = document.createElement("details");
    evidence.className = "palace-four-part-evidence";
    const evidenceSummary = document.createElement("summary");
    evidenceSummary.textContent =
      `查看证据 · ${part.relationBindings.length} 宫位关系 / `
      + `${part.majorStarBindings.length} 主星 / ${part.transformationOccurrenceIds.length} 四化`;
    evidence.append(evidenceSummary);

    const relationLine = document.createElement("p");
    relationLine.className = "palace-four-part-relations";
    relationLine.textContent = part.relationBindings.map((binding) => (
      `${binding.relationLabel}${binding.palaceRoleLabel}（${binding.palaceEarthlyBranchLabel}）`
    )).join("；");
    evidence.append(relationLine);

    const starList = document.createElement("ul");
    starList.className = "palace-four-part-stars";
    if (part.majorStarBindings.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "本段没有可绑定的十四主星位置候选；保持空集合，不补造或借用。";
      starList.append(empty);
    } else {
      for (const binding of part.majorStarBindings) {
        const item = document.createElement("li");
        item.dataset.synthesisId = binding.synthesisId;
        item.dataset.positionCandidateContentId = binding.positionCandidateContentId;
        const markers = [binding.brightnessLabel, ...binding.transformations].filter(Boolean);
        const label = document.createElement("strong");
        label.textContent = `${binding.relationLabel}${binding.palaceRoleLabel} · ${binding.starLabel}`
          + `${markers.length > 0 ? `〔${markers.join("·")}〕` : ""}`;
        const statement = document.createElement("span");
        statement.textContent = binding.positionSummary;
        item.append(label, statement);
        starList.append(item);
      }
    }
    evidence.append(starList);

    if (part.transformationOccurrenceIds.length > 0) {
      const transformations = document.createElement("p");
      transformations.className = "palace-four-part-transformations";
      transformations.textContent = `本命生年四化事实：${part.transformationOccurrenceIds.join("；")}`;
      evidence.append(transformations);
    }
    evidence.append(renderPalaceFourPartSources(projection, part.sourceRefs));
    card.append(cardHeading, direct, evidence);
    grid.append(card);
  }

  const boundary = document.createElement("p");
  boundary.className = "palace-four-part-boundary";
  boundary.textContent =
    "主导主题、资源／压力方向、好坏方向、事件结果与综合结果均未生成；下列核心十二星仅是独立来源绑定候选，传统分组不是吉凶结果，其他 minor 与全部 auxiliary 仍只显示盘面事实。";
  section.append(
    heading,
    intro,
    grid,
    renderPalaceFourPartCoreMinorSupplement(projection, content),
    boundary
  );
  return section;
}

function renderPalaceFourPartCoreMinorSupplement(
  projection: BrowserProbeDisplayProjection,
  content: BrowserProbeDisplayProjection["palaceFourPartSynthesisContents"][number]
): HTMLElement {
  const group = projection.displaySanfangGroups.find(
    (candidate) => candidate.targetEarthlyBranchId === content.targetEarthlyBranchId
  );
  if (!group) {
    throw new Error(`四段式核心十二星补充缺少目标宫位 ${content.targetEarthlyBranchId}`);
  }
  const occurrences = group.members.flatMap((member) => (
    coreMinorBindingsInPalace(member.palace).map((binding) => ({ member, ...binding }))
  ));
  const occurrenceKeys = occurrences.map(
    ({ member, star }) => `${member.relation}:${member.palace.earthlyBranchId}:${star.starId}`
  );
  if (new Set(occurrenceKeys).size !== occurrenceKeys.length) {
    throw new Error(`四段式核心十二星补充出现重复星曜位置 ${content.targetEarthlyBranchId}`);
  }

  const section = document.createElement("section");
  section.className = "palace-four-part-core-minor-supplement";
  section.dataset.contentVersion = "ziwei.core_minor_star_all_palaces.neutral_candidate/0.1";
  section.dataset.targetEarthlyBranchId = content.targetEarthlyBranchId;
  section.dataset.targetPalaceRoleId = content.targetPalaceRoleId;
  section.dataset.occurrenceCount = String(occurrences.length);
  section.dataset.traditionalClusterIsOutcome = "false";
  section.dataset.reviewStatus = "awaiting_expert_review";
  section.dataset.publicationStatus = "isolated_candidate_only";
  section.dataset.goodBadOrientation = "null";
  section.dataset.eventOutcome = "null";
  section.dataset.result = "null";
  section.dataset.expertTruthClaimed = "false";
  section.dataset.directOutcomeAllowed = "false";
  section.dataset.scoringAllowed = "false";
  section.setAttribute("aria-label", `${content.targetPalaceRoleLabel}四段式核心十二星独立补充`);

  const heading = document.createElement("div");
  heading.className = "palace-four-part-core-minor-heading";
  const title = document.createElement("strong");
  title.textContent = "核心十二星 · 四宫位置补充";
  const status = document.createElement("span");
  status.textContent = "独立候选 · 待专家复核";
  heading.append(title, status);

  const intro = document.createElement("p");
  intro.className = "palace-four-part-core-minor-intro";
  intro.textContent =
    "按本宫、对宫与两组三合位列出精确命中的核心十二星；本区不写入或改造上方 v0.11 四段合同。";

  const grid = document.createElement("div");
  grid.className = "palace-four-part-core-minor-grid";
  if (occurrences.length === 0) {
    const empty = document.createElement("p");
    empty.className = "palace-four-part-core-minor-empty";
    empty.textContent = "当前四宫没有精确命中的核心十二星；保持空集合，不借用范围外星曜。";
    grid.append(empty);
  } else {
    for (const { member, star, pair } of occurrences) {
      const item = document.createElement("article");
      item.className = "palace-four-part-core-minor-item";
      item.dataset.relation = member.relation;
      item.dataset.starId = star.starId;
      item.dataset.starLabel = star.label;
      item.dataset.factCategory = pair.base.factCategory;
      item.dataset.baseContentId = pair.base.contentId;
      item.dataset.palaceContentId = pair.palace.contentId;
      item.dataset.palaceRoleId = pair.palace.palaceRoleId;
      item.dataset.traditionalCluster = pair.base.traditionalCluster;
      item.dataset.traditionalClusterIsOutcome = "false";
      item.dataset.goodBadOrientation = "null";
      item.dataset.eventOutcome = "null";
      item.dataset.result = "null";

      const itemHeading = document.createElement("header");
      const relation = document.createElement("span");
      relation.textContent = `${member.relationLabel}${member.palace.roleLabel}`;
      const label = document.createElement("strong");
      label.textContent = `${star.label} · ${traditionalClusterLabel(pair.base.traditionalCluster)}`;
      itemHeading.append(relation, label);

      const position = document.createElement("p");
      position.className = "palace-four-part-core-minor-position";
      position.textContent = pair.palace.positionSummary;
      const counterweight = document.createElement("p");
      counterweight.className = "palace-four-part-core-minor-counterweight";
      counterweight.textContent = pair.palace.counterweight;
      item.append(
        itemHeading,
        position,
        counterweight,
        renderCoreMinorSources(
          projection,
          pair.palace.sourceRefs,
          "位置依据：",
          "palace-four-part-core-minor-sources"
        )
      );
      grid.append(item);
    }
  }

  const boundary = document.createElement("p");
  boundary.className = "palace-four-part-core-minor-boundary";
  boundary.textContent =
    "传统六吉／六煞只作资料分组；好坏方向、事件结果与综合结果均为 null。";
  section.append(heading, intro, grid, boundary);
  return section;
}

function renderPalaceFourPartSources(
  projection: BrowserProbeDisplayProjection,
  sourceRefs: BrowserProbeDisplayProjection["palaceFourPartSynthesisContents"][number]["sourceRefs"]
): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.className = "palace-four-part-sources";
  paragraph.append("本段来源：");
  sourceRefs.forEach((sourceRef, index) => {
    const palaceSource = projection.majorStarPalaceContentSources.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId
    );
    const combinationSource = projection.majorStarCombinationReviewSources.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId
    );
    const transformationSource = projection.natalTransformationContentSources.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId
    );
    const isGeometryRule = sourceRef.sourceId === projection.sanfangProjectionRule.ruleId;
    if (!palaceSource && !combinationSource && !transformationSource && !isGeometryRule) {
      throw new Error(`四段式直读来源 ${sourceRef.sourceId} 未注册`);
    }
    const link = document.createElement("a");
    link.href = palaceSource?.sourceUrl
      ?? combinationSource?.sourceUrl
      ?? transformationSource?.sourceUrl
      ?? projection.sanfangProjectionRule.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = palaceSource
      ? natalTransformationSourceLabel(palaceSource.sourceKind)
      : combinationSource
        ? combinationSourceLabel(combinationSource.sourceKind)
        : transformationSource
          ? natalTransformationSourceLabel(transformationSource.sourceKind)
          : "三方几何规则";
    const title = palaceSource?.title
      ?? combinationSource?.title
      ?? transformationSource?.title
      ?? projection.sanfangProjectionRule.sourceTitle;
    const accessedAt = palaceSource?.accessedAt
      ?? combinationSource?.accessedAt
      ?? transformationSource?.accessedAt
      ?? projection.sanfangProjectionRule.accessedAt;
    const usageBoundary = palaceSource?.usageBoundary
      ?? combinationSource?.usageBoundary
      ?? transformationSource?.usageBoundary
      ?? "只定义本宫、对宫与两组三合位的几何关系，不提供解释结论。";
    link.title = `${title} · ${sourceRef.locator} · 访问于 ${accessedAt}。${usageBoundary}`;
    if (index > 0) paragraph.append("、");
    paragraph.append(link);
  });
  return paragraph;
}

function renderPalaceNatalTransformationReview(
  projection: BrowserProbeDisplayProjection,
  review: BrowserProbeDisplayProjection["palaceNatalTransformationReviews"][number]
): HTMLElement {
  const section = document.createElement("section");
  section.className = "natal-transformation-review";
  section.dataset.reviewId = review.reviewId;
  section.dataset.reviewStatus = review.reviewStatus;
  section.dataset.evidenceClass = review.evidenceClass;
  section.dataset.transformationScope = review.transformationScope;
  section.dataset.occurrenceCount = String(review.occurrences.length);
  section.dataset.result = "null";
  section.dataset.goodBadOrientation = "null";
  section.dataset.eventOutcome = "null";
  section.dataset.ruleSnapshotSha256 = review.ruleSnapshotSha256;
  section.dataset.artifactFactsSha256 = review.artifactFactsSha256;
  section.setAttribute("aria-label", `${review.targetPalaceRoleLabel}本命生年四化修正候选`);

  const heading = document.createElement("div");
  heading.className = "natal-transformation-heading";
  const title = document.createElement("strong");
  title.textContent = "本命生年四化 · 三方四正落宫修正候选";
  const status = document.createElement("span");
  status.className = "natal-transformation-status";
  status.textContent = "候选待审";
  heading.append(title, status);

  const summary = document.createElement("p");
  summary.className = "natal-transformation-summary";
  summary.textContent = review.directStatement;

  const occurrenceGrid = document.createElement("div");
  occurrenceGrid.className = "natal-transformation-occurrence-grid";
  occurrenceGrid.setAttribute("aria-label", `${review.targetPalaceRoleLabel}三方四正本命生年四化事实`);
  for (const occurrence of review.occurrences) {
    const card = document.createElement("article");
    card.className = "natal-transformation-occurrence";
    card.dataset.occurrenceId = occurrence.occurrenceId;
    card.dataset.relation = occurrence.relation;
    card.dataset.transformation = occurrence.transformationLabel;
    card.dataset.palaceContentId = occurrence.palaceCandidateContent.contentId;
    card.dataset.basePositionState = occurrence.basePositionState;
    card.dataset.result = "null";
    card.dataset.goodBadOrientation = "null";
    card.dataset.eventOutcome = "null";
    card.setAttribute(
      "aria-label",
      `${occurrence.relationLabel}${occurrence.palaceRoleLabel}${occurrence.starLabel}化${occurrence.transformationLabel}`
    );

    const occurrenceHeading = document.createElement("div");
    occurrenceHeading.className = "natal-transformation-occurrence-heading";
    const relation = document.createElement("span");
    relation.textContent = `${occurrence.relationLabel} · ${occurrence.palaceRoleLabel}${occurrence.palaceEarthlyBranchLabel}`;
    const star = document.createElement("strong");
    star.textContent = `${occurrence.starLabel}化${occurrence.transformationLabel}`;
    occurrenceHeading.append(relation, star);

    const domain = document.createElement("p");
    domain.className = "natal-transformation-domain";
    const domainLabel = document.createElement("strong");
    domainLabel.textContent = "问题域：";
    domain.append(domainLabel, occurrence.palaceRoleContent.domainSummary);

    const position = document.createElement("p");
    position.className = "natal-transformation-position";
    const positionLabel = document.createElement("strong");
    positionLabel.textContent = "原位置主线：";
    position.append(
      positionLabel,
      occurrence.basePositionCandidate?.positionSummary
        ?? "本星不是十四主星，当前不补写主星落宫位置主线。"
    );

    const modifier = document.createElement("p");
    modifier.className = "natal-transformation-modifier";
    const modifierLabel = document.createElement("strong");
    modifierLabel.textContent = `通用方向 · ${occurrence.candidateContent.motionLabel}：`;
    modifier.append(modifierLabel, occurrence.candidateContent.plainLanguage);

    const palaceModifier = document.createElement("p");
    palaceModifier.className = "natal-transformation-palace-modifier";
    const palaceModifierLabel = document.createElement("strong");
    palaceModifierLabel.textContent = "落宫修正：";
    palaceModifier.append(
      palaceModifierLabel,
      occurrence.palaceCandidateContent.positionSummary
    );

    const counterweight = document.createElement("p");
    counterweight.className = "natal-transformation-counterweight";
    counterweight.textContent = occurrence.palaceCandidateContent.counterweight;
    card.append(occurrenceHeading, domain, position, modifier, palaceModifier, counterweight);
    occurrenceGrid.append(card);
  }

  if (review.absenceBoundary) {
    const absence = document.createElement("p");
    absence.className = "natal-transformation-empty-boundary";
    absence.textContent = review.absenceBoundary;
    occurrenceGrid.append(absence);
  }

  const order = document.createElement("p");
  order.className = "natal-transformation-order";
  order.textContent = review.readingOrderStatement;
  const nullState = document.createElement("p");
  nullState.className = "natal-transformation-null";
  nullState.textContent = "综合结果、好坏方向与事件结果均保持为空（result / goodBadOrientation / eventOutcome 均为 null）。";

  const detail = document.createElement("details");
  detail.className = "natal-transformation-detail";
  const detailSummary = document.createElement("summary");
  detailSummary.textContent = "展开四化来源与专家问题";
  const questions = document.createElement("ol");
  questions.className = "natal-transformation-review-questions";
  for (const question of review.reviewQuestions) {
    const item = document.createElement("li");
    item.textContent = question;
    questions.append(item);
  }
  const sources = document.createElement("p");
  sources.className = "natal-transformation-sources";
  sources.append("四化依据：");
  review.sourceRefs.forEach((sourceRef, index) => {
    const source = projection.natalTransformationContentSources.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId
    ) ?? projection.majorStarPalaceContentSources.find(
      (candidate) => candidate.sourceId === sourceRef.sourceId
    );
    if (!source) throw new Error(`本命生年四化修正来源 ${sourceRef.sourceId} 未注册`);
    const link = document.createElement("a");
    link.href = source.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = natalTransformationSourceLabel(source.sourceKind);
    link.title = `${source.title} · ${sourceRef.locator} · 访问于 ${source.accessedAt}。${source.usageBoundary}`;
    if (index > 0) sources.append("、");
    sources.append(link);
  });
  detail.append(detailSummary, questions, sources);

  section.append(heading, summary, occurrenceGrid, order, nullState, detail);
  return section;
}

function natalTransformationSourceLabel(
  sourceKind:
    | BrowserProbeDisplayProjection["natalTransformationContentSources"][number]["sourceKind"]
    | BrowserProbeDisplayProjection["majorStarPalaceContentSources"][number]["sourceKind"]
): string {
  switch (sourceKind) {
    case "modern_original_mutagen_learning_material":
      return "现代四化资料";
    case "public_domain_classical_mutagen_transcription":
      return "古典四化篇目";
    case "secondary_method_difference_overview":
      return "流派差异边界";
    case "public_domain_classical_palace_transcription":
      return "古典宫位篇目";
    case "modern_original_palace_learning_material":
      return "现代宫位资料";
  }
}

function renderCoreMinorStarCandidate(
  star: DisplayStar,
  palace: DisplayPalace,
  projection: BrowserProbeDisplayProjection,
  pair: CoreMinorCandidatePair
): HTMLElement {
  const verifiedPair = requireCoreMinorCandidatePair(star, palace);
  if (!verifiedPair
    || verifiedPair.base.contentId !== pair.base.contentId
    || verifiedPair.palace.contentId !== pair.palace.contentId) {
    throw new Error(`核心十二星 ${star.starId} 的显示绑定在 ${palace.roleId} 不一致`);
  }
  const { base, palace: palaceCandidate } = pair;

  const article = document.createElement("article");
  article.className = "core-minor-content";
  article.dataset.starId = star.starId;
  article.dataset.starLabel = star.label;
  article.dataset.factCategory = base.factCategory;
  article.dataset.baseContentId = base.contentId;
  article.dataset.palaceContentId = palaceCandidate.contentId;
  article.dataset.palaceRoleId = palaceCandidate.palaceRoleId;
  article.dataset.traditionalCluster = base.traditionalCluster;
  article.dataset.traditionalClusterIsOutcome = "false";
  article.dataset.reviewStatus = base.reviewStatus;
  article.dataset.publicationStatus = base.publicationStatus;
  article.dataset.requiresCombinationReview = "true";
  article.dataset.goodBadOrientation = "null";
  article.dataset.eventOutcome = "null";
  article.dataset.result = "null";
  article.dataset.expertTruthClaimed = "false";
  article.dataset.directOutcomeAllowed = "false";
  article.dataset.scoringAllowed = "false";
  article.dataset.brightnessCanAppear = String(base.factProjectionBoundary.brightnessCanAppear);
  article.dataset.natalTransformationRuleCount = String(
    base.factProjectionBoundary.natalBirthYearTransformationRules.length
  );
  article.setAttribute(
    "aria-label",
    `${base.label}落${palaceCandidate.palaceRoleLabel}核心十二星位置候选`
  );

  const header = document.createElement("header");
  const title = document.createElement("strong");
  title.textContent = `${base.label}落${palaceCandidate.palaceRoleLabel} · 核心十二星位置候选`;
  const status = document.createElement("span");
  status.className = "core-minor-content-status";
  status.textContent = "待专家复核";
  header.append(title, status);

  const cluster = document.createElement("p");
  cluster.className = "core-minor-cluster";
  const clusterLabel = document.createElement("strong");
  clusterLabel.textContent = traditionalClusterLabel(base.traditionalCluster);
  cluster.append(clusterLabel, " · 只作传统分组，不是吉凶结果");

  const themes = document.createElement("ul");
  themes.className = "core-minor-theme-list";
  themes.setAttribute("aria-label", `${base.label}候选主题`);
  for (const theme of base.coreThemes) {
    const item = document.createElement("li");
    item.textContent = theme;
    themes.append(item);
  }

  const plainLanguage = document.createElement("p");
  plainLanguage.className = "core-minor-summary";
  plainLanguage.textContent = base.plainLanguage;
  const position = document.createElement("p");
  position.className = "core-minor-position";
  position.textContent = palaceCandidate.positionSummary;

  const factState = document.createElement("p");
  factState.className = "core-minor-fact-state";
  const factLabel = document.createElement("strong");
  factLabel.textContent = "当前事实值：";
  factState.append(
    factLabel,
    `亮度 ${star.brightnessLabel ?? "无标记"} · 本命生年四化 ${star.transformations.join("、") || "无标记"}。`
      + " 这些字段只显示已验真事实，不自动参与吉凶解释。"
  );

  const counterweight = document.createElement("p");
  counterweight.className = "core-minor-counterweight";
  const counterweightLabel = document.createElement("strong");
  counterweightLabel.textContent = "反面制衡：";
  counterweight.append(counterweightLabel, palaceCandidate.counterweight);

  const detail = document.createElement("details");
  detail.className = "core-minor-detail";
  const detailSummary = document.createElement("summary");
  detailSummary.textContent = "展开来源与专家复核问题";
  const reviewPrompt = document.createElement("p");
  reviewPrompt.className = "core-minor-review-prompt";
  reviewPrompt.textContent = `${base.reviewPrompt} ${palaceCandidate.reviewPrompt}`;
  detail.append(
    detailSummary,
    reviewPrompt,
    renderCoreMinorSources(
      projection,
      palaceCandidate.sourceRefs,
      "候选依据：",
      "core-minor-sources"
    )
  );
  article.append(
    header,
    cluster,
    themes,
    plainLanguage,
    position,
    factState,
    counterweight,
    detail
  );
  return article;
}

function renderCoreMinorSources(
  projection: BrowserProbeDisplayProjection,
  sourceRefs: CoreMinorPalaceCandidate["sourceRefs"],
  prefix: string,
  className: string
): HTMLParagraphElement {
  if (new Set(sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== sourceRefs.length) {
    throw new Error("核心十二星候选包含重复来源 ID");
  }
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.append(prefix);
  sourceRefs.forEach((sourceRef, index) => {
    const coreSource = projection.coreMinorStarContentSources.find(
      (source) => source.sourceId === sourceRef.sourceId
    );
    const palaceSource = projection.majorStarPalaceContentSources.find(
      (source) => source.sourceId === sourceRef.sourceId
    );
    if ((coreSource ? 1 : 0) + (palaceSource ? 1 : 0) !== 1) {
      throw new Error(`核心十二星内容来源 ${sourceRef.sourceId} 未唯一注册`);
    }
    const link = document.createElement("a");
    link.href = coreSource?.sourceUrl ?? palaceSource!.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = sourceRef.bindingTarget === "nomenclature_conflict"
      ? "名词冲突追溯"
      : sourceRef.bindingTarget === "exact_palace_role"
        ? (palaceSource?.sourceKind === "public_domain_classical_palace_transcription"
          ? "古典宫位篇目"
          : "现代宫位资料")
        : coreSource?.sourceKind === "public_domain_classical_minor_star_transcription"
          ? "古典星曜篇目"
          : "现代星曜资料";
    const title = coreSource?.title ?? palaceSource!.title;
    const accessedAt = coreSource?.accessedAt ?? palaceSource!.accessedAt;
    const usageBoundary = coreSource?.usageBoundary ?? palaceSource!.usageBoundary;
    link.title = `${title} · ${sourceRef.locator} · 访问于 ${accessedAt}。${usageBoundary}`
      + ` 候选语义支持：${sourceRef.semanticCandidateSupport ? "是" : "否"}。`;
    if (index > 0) paragraph.append("、");
    paragraph.append(link);
  });
  return paragraph;
}

function coreMinorBindingsInPalace(palace: DisplayPalace): readonly CoreMinorBinding[] {
  const bindings = palace.stars.flatMap((star) => {
    const pair = requireCoreMinorCandidatePair(star, palace);
    return pair ? [{ star, pair }] : [];
  });
  if (new Set(bindings.map(({ star }) => star.starId)).size !== bindings.length) {
    throw new Error(`核心十二星显示宫位 ${palace.roleId} 出现重复星键`);
  }
  return bindings;
}

function requireCoreMinorCandidatePair(
  star: DisplayStar,
  palace: DisplayPalace
): CoreMinorCandidatePair | null {
  const base = star.coreMinorCandidateContent;
  const palaceCandidate = star.coreMinorPalaceCandidateContent;
  if (!base && !palaceCandidate) return null;
  if (!base || !palaceCandidate) {
    throw new Error(`星曜 ${star.starId} 的核心十二星基础／落宫候选出现半空绑定`);
  }
  if (star.category !== "minor"
    || base.factCategory !== "minor"
    || palaceCandidate.factCategory !== "minor"
    || base.starId !== star.starId
    || palaceCandidate.starId !== star.starId
    || base.label !== star.label
    || palaceCandidate.label !== star.label
    || palaceCandidate.palaceRoleId !== palace.roleId
    || palaceCandidate.baseCandidateContentId !== base.contentId
    || palaceCandidate.traditionalCluster !== base.traditionalCluster
    || base.traditionalClusterIsOutcome
    || palaceCandidate.traditionalClusterIsOutcome
    || base.goodBadOrientation !== null
    || base.eventOutcome !== null
    || base.result !== null
    || palaceCandidate.goodBadOrientation !== null
    || palaceCandidate.eventOutcome !== null
    || palaceCandidate.result !== null
    || base.expertTruthClaimed
    || base.directOutcomeAllowed
    || base.scoringAllowed
    || palaceCandidate.expertTruthClaimed
    || palaceCandidate.directOutcomeAllowed
    || palaceCandidate.scoringAllowed) {
    throw new Error(`星曜 ${star.starId} 在 ${palace.roleId} 的核心十二星显示边界不一致`);
  }
  return { base, palace: palaceCandidate };
}

function traditionalClusterLabel(
  cluster: CoreMinorBaseCandidate["traditionalCluster"]
): string {
  return cluster === "supporting_six" ? "传统六吉组" : "传统六煞组";
}

function renderMajorStarCandidate(
  star: BrowserProbeDisplayProjection["displayPalaces"][number]["stars"][number],
  palace: BrowserProbeDisplayProjection["displayPalaces"][number],
  projection: BrowserProbeDisplayProjection
): HTMLElement {
  const candidate = star.candidateContent;
  if (!candidate) throw new Error(`主星 ${star.starId} 缺少待审基础语义`);

  const article = document.createElement("article");
  article.className = "major-content";
  article.dataset.contentId = candidate.contentId;
  article.dataset.reviewStatus = candidate.reviewStatus;

  const header = document.createElement("header");
  const title = document.createElement("strong");
  title.textContent = `${candidate.label} · 基础语义`;
  const status = document.createElement("span");
  status.className = "content-status";
  status.textContent = "待专家复核";
  header.append(title, status);

  const themes = document.createElement("ul");
  themes.className = "theme-list";
  themes.setAttribute("aria-label", `${candidate.label}候选主题`);
  for (const theme of candidate.coreThemes) {
    const item = document.createElement("li");
    item.textContent = theme;
    themes.append(item);
  }

  const plainLanguage = document.createElement("p");
  plainLanguage.className = "candidate-summary";
  plainLanguage.textContent = candidate.plainLanguage;
  const balance = document.createElement("p");
  balance.className = "candidate-balance";
  const balanceLabel = document.createElement("strong");
  balanceLabel.textContent = "需合参：";
  balance.append(balanceLabel, candidate.balancePrompt);

  const sources = document.createElement("p");
  sources.className = "candidate-sources";
  sources.append("依据：");
  candidate.sourceRefs.forEach((sourceRef, index) => {
    const source = projection.majorStarContentSources.find(
      (candidateSource) => candidateSource.sourceId === sourceRef.sourceId
    );
    if (!source) throw new Error(`主星内容来源 ${sourceRef.sourceId} 未注册`);
    const link = document.createElement("a");
    link.href = source.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.sourceKind === "public_domain_classical_transcription"
      ? "古典篇目"
      : "现代研习资料";
    link.title = `${source.title} · ${sourceRef.locator} · 访问于 ${source.accessedAt}。${source.usageBoundary}`;
    if (index > 0) sources.append("、");
    sources.append(link);
  });
  article.append(header, themes, plainLanguage, balance, sources);

  const palaceCandidate = star.palaceCandidateContent;
  if (palaceCandidate) {
    const palaceSection = document.createElement("section");
    palaceSection.className = "palace-candidate";
    palaceSection.dataset.contentId = palaceCandidate.contentId;
    palaceSection.dataset.reviewStatus = palaceCandidate.reviewStatus;
    palaceSection.setAttribute(
      "aria-label",
      `${palaceCandidate.label}落${palaceCandidate.palaceRoleLabel}位置化候选`
    );

    const palaceHeading = document.createElement("div");
    palaceHeading.className = "palace-candidate-heading";
    const palaceTitle = document.createElement("strong");
    palaceTitle.textContent = `${palaceCandidate.label}落${palaceCandidate.palaceRoleLabel} · 位置化候选`;
    const palaceStatus = document.createElement("span");
    palaceStatus.className = "content-status";
    palaceStatus.textContent = "待专家复核";
    palaceHeading.append(palaceTitle, palaceStatus);

    const palaceSummary = document.createElement("p");
    palaceSummary.className = "palace-candidate-summary";
    palaceSummary.textContent = palaceCandidate.positionSummary;

    const palaceReview = document.createElement("p");
    palaceReview.className = "palace-candidate-review";
    const palaceReviewLabel = document.createElement("strong");
    palaceReviewLabel.textContent = "位置合参：";
    palaceReview.append(palaceReviewLabel, palaceCandidate.reviewPrompt);

    const palaceSources = document.createElement("p");
    palaceSources.className = "palace-candidate-sources";
    palaceSources.append("位置依据：");
    palaceCandidate.sourceRefs.forEach((sourceRef, index) => {
      const source = projection.majorStarPalaceContentSources.find(
        (candidateSource) => candidateSource.sourceId === sourceRef.sourceId
      );
      if (!source) throw new Error(`主星落宫内容来源 ${sourceRef.sourceId} 未注册`);
      const link = document.createElement("a");
      link.href = source.sourceUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = source.sourceKind === "public_domain_classical_palace_transcription"
        ? "古典落宫篇目"
        : "现代宫位资料";
      link.title = `${source.title} · ${sourceRef.locator} · 访问于 ${source.accessedAt}。${source.usageBoundary}`;
      if (index > 0) palaceSources.append("、");
      palaceSources.append(link);
    });

    palaceSection.append(palaceHeading, palaceSummary, palaceReview, palaceSources);
    article.append(palaceSection);
    article.append(renderMajorStarSameStarSynthesisReview(star, palace, projection));
  }
  return article;
}

function renderMajorStarSameStarSynthesisReview(
  star: BrowserProbeDisplayProjection["displayPalaces"][number]["stars"][number],
  palace: BrowserProbeDisplayProjection["displayPalaces"][number],
  projection: BrowserProbeDisplayProjection
): HTMLElement {
  const synthesis = projection.majorStarSameStarSynthesisReviews.find((candidate) => (
    candidate.starId === star.starId
      && candidate.palaceEarthlyBranchId === palace.earthlyBranchId
  ));
  if (!synthesis) {
    throw new Error(`主星 ${star.starId} 在 ${palace.roleId}/${palace.earthlyBranchId} 缺少逐星合参复核包`);
  }

  const section = document.createElement("section");
  section.className = "same-star-synthesis";
  section.dataset.synthesisId = synthesis.synthesisId;
  section.dataset.reviewStatus = synthesis.reviewStatus;
  section.dataset.evidenceClass = synthesis.evidenceClass;
  section.dataset.result = "null";
  section.dataset.goodBadOrientation = "null";
  section.dataset.eventOutcome = "null";
  section.dataset.ruleSnapshotSha256 = synthesis.combinationReview.ruleSnapshotSha256;
  section.dataset.artifactFactsSha256 = synthesis.combinationReview.artifactFactsSha256;
  section.setAttribute("aria-label", `${synthesis.label}落${synthesis.palaceRoleLabel}逐星合参复核包`);

  const heading = document.createElement("div");
  heading.className = "same-star-synthesis-heading";
  const title = document.createElement("strong");
  title.textContent = `${synthesis.label}落${synthesis.palaceRoleLabel} · 逐星合参复核包`;
  const status = document.createElement("span");
  status.className = "same-star-synthesis-status";
  status.textContent = "结论待审";
  heading.append(title, status);

  const direct = document.createElement("p");
  direct.className = "same-star-synthesis-direct";
  direct.textContent = synthesis.directStatement;

  const readingOrder = document.createElement("p");
  readingOrder.className = "same-star-synthesis-order";
  readingOrder.textContent = synthesis.readingOrderStatement;

  const nullState = document.createElement("p");
  nullState.className = "same-star-synthesis-null";
  const nullLabel = document.createElement("strong");
  nullLabel.textContent = "当前边界：";
  nullState.append(
    nullLabel,
    "综合结论、好坏方向与事件结果均未生成（result / goodBadOrientation / eventOutcome 均为 null）。"
  );

  const scope = document.createElement("p");
  scope.className = "same-star-synthesis-scope";
  scope.textContent = synthesis.scopeNote;

  const detail = document.createElement("details");
  detail.className = "same-star-synthesis-detail";
  const detailSummary = document.createElement("summary");
  detailSummary.textContent = "展开盘面事实、来源与专家问题";
  detail.append(
    detailSummary,
    renderMajorStarCombinationReview(star, palace, projection, synthesis.reviewQuestions)
  );

  section.append(heading, direct, readingOrder, nullState, scope, detail);
  return section;
}

function renderMajorStarCombinationReview(
  star: BrowserProbeDisplayProjection["displayPalaces"][number]["stars"][number],
  palace: BrowserProbeDisplayProjection["displayPalaces"][number],
  projection: BrowserProbeDisplayProjection,
  reviewQuestions?: readonly string[]
): HTMLElement {
  const review = projection.majorStarPalaceCombinationReviews.find((candidate) => (
    candidate.starId === star.starId
      && candidate.palaceEarthlyBranchId === palace.earthlyBranchId
  ));
  if (!review) {
    throw new Error(`主星 ${star.starId} 在 ${palace.roleId}/${palace.earthlyBranchId} 缺少组合复核包`);
  }

  const section = document.createElement("section");
  section.className = "combination-review";
  section.dataset.reviewId = review.reviewId;
  section.dataset.reviewStatus = review.reviewStatus;
  section.dataset.result = "null";
  section.dataset.ruleSnapshotSha256 = review.ruleSnapshotSha256;
  section.dataset.artifactFactsSha256 = review.artifactFactsSha256;
  section.setAttribute("aria-label", `${review.label}落${review.palaceRoleLabel}组合事实复核包`);

  const heading = document.createElement("div");
  heading.className = "combination-review-heading";
  const title = document.createElement("strong");
  title.textContent = "亮度／四化／同宫／会照 · 合参事实包";
  const status = document.createElement("span");
  status.className = "combination-status";
  status.textContent = "规则待审";
  heading.append(title, status);

  const summary = document.createElement("p");
  summary.className = "combination-fact-summary";
  summary.textContent = review.factSummary;

  const facts = document.createElement("dl");
  facts.className = "combination-facts";
  const selfMarkers = [review.selfState.brightnessLabel, ...review.selfState.transformations].filter(Boolean);
  facts.append(
    combinationReviewFactRow(
      "本星状态",
      selfMarkers.length > 0 ? `${review.label}〔${selfMarkers.join("·")}〕` : `${review.label}（无亮度／四化标记）`
    ),
    combinationReviewFactRow(
      "同宫主星",
      review.samePalace.otherMajorStars.length > 0
        ? review.samePalace.otherMajorStars.map(formatCombinationStarFact).join("、")
        : "无其他主星"
    ),
    combinationReviewFactRow(
      "同宫辅／杂",
      review.samePalace.otherStars.length > 0
        ? review.samePalace.otherStars.map(formatCombinationStarFact).join("、")
        : "无"
    ),
    combinationReviewFactRow(
      "三方主星",
      review.sanfang.map((member) => (
        `${member.relationLabel}${member.palaceRoleLabel}：${member.majorStars.length > 0
          ? member.majorStars.map(formatCombinationStarFact).join("、")
          : "无主星"}`
      )).join("；")
    ),
    combinationReviewFactRow("四化范围", "仅本命生年四化；未混入宫干或运限四化")
  );

  const questionsHeading = document.createElement("strong");
  questionsHeading.className = "combination-questions-heading";
  questionsHeading.textContent = "需要专家逐项回答";
  const questions = document.createElement("ol");
  questions.className = "combination-review-questions";
  for (const question of reviewQuestions ?? review.reviewQuestions) {
    const item = document.createElement("li");
    item.textContent = question;
    questions.append(item);
  }

  const result = document.createElement("p");
  result.className = "combination-result";
  const resultLabel = document.createElement("strong");
  resultLabel.textContent = "组合结论：";
  result.append(resultLabel, "未生成（result:null）；等待选定流派的专家规则。");

  const sources = document.createElement("p");
  sources.className = "combination-sources";
  sources.append("合参依据：");
  review.sourceRefs.forEach((sourceRef, index) => {
    const source = projection.majorStarCombinationReviewSources.find(
      (candidateSource) => candidateSource.sourceId === sourceRef.sourceId
    );
    if (!source) throw new Error(`主星组合复核来源 ${sourceRef.sourceId} 未注册`);
    const link = document.createElement("a");
    link.href = source.sourceUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = combinationSourceLabel(source.sourceKind);
    link.title = `${source.title} · ${sourceRef.locator} · 访问于 ${source.accessedAt}。${source.usageBoundary}`;
    if (index > 0) sources.append("、");
    sources.append(link);
  });

  section.append(heading, summary, facts, questionsHeading, questions, result, sources);
  return section;
}

function combinationReviewFactRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const detail = document.createElement("dd");
  detail.textContent = value;
  row.append(term, detail);
  return row;
}

function formatCombinationStarFact(
  star: BrowserProbeDisplayProjection["majorStarPalaceCombinationReviews"][number]["samePalace"]["otherStars"][number]
): string {
  const markers = [star.brightnessLabel, ...star.transformations].filter(Boolean);
  return markers.length > 0 ? `${star.label}〔${markers.join("·")}〕` : star.label;
}

function combinationSourceLabel(
  sourceKind: BrowserProbeDisplayProjection["majorStarCombinationReviewSources"][number]["sourceKind"]
): string {
  switch (sourceKind) {
    case "modern_original_brightness_learning_material": return "亮度资料";
    case "modern_original_mutagen_learning_material": return "四化资料";
    case "upstream_technical_relation_documentation": return "同宫／会照术语";
    case "public_domain_classical_combination_transcription": return "古典合参顺序";
  }
}

function sanfangFactRow(label: string, values: readonly string[], emptyText: string): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const detail = document.createElement("dd");
  detail.textContent = values.length > 0 ? values.join("、") : emptyText;
  row.append(term, detail);
  return row;
}

function sanfangStarFactRow(
  label: string,
  stars: readonly DisplayStar[],
  palace: DisplayPalace
): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const detail = document.createElement("dd");
  detail.className = "sanfang-star-facts";
  if (stars.length === 0) {
    detail.textContent = "无";
  } else {
    stars.forEach((star, index) => {
      const pair = requireCoreMinorCandidatePair(star, palace);
      const item = document.createElement("span");
      item.className = "sanfang-star-fact";
      item.dataset.starId = star.starId;
      item.dataset.starLabel = star.label;
      item.dataset.factCategory = star.category;
      item.dataset.coreMinorBaseContentId = pair?.base.contentId ?? "null";
      item.dataset.coreMinorPalaceContentId = pair?.palace.contentId ?? "null";
      item.textContent = formatDisplayStar(star);
      if (index > 0) detail.append("、");
      detail.append(item);
    });
  }
  row.append(term, detail);
  return row;
}

function formatDisplayStar(
  star: BrowserProbeDisplayProjection["displayPalaces"][number]["stars"][number]
): string {
  const markers = [star.brightnessLabel, ...star.transformations].filter(Boolean);
  return markers.length > 0 ? `${star.label}〔${markers.join("·")}〕` : star.label;
}

function createInput(): ZiweiBirthInputDraft {
  const selectedSex = form.elements.namedItem("sex");
  if (!(selectedSex instanceof RadioNodeList)) throw new Error("排盘用性别控件不可用");
  const sex = selectedSex.value;
  if (sex !== "male" && sex !== "female") throw new Error("请选择排盘用性别");
  return {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: ZIWEI_DOUSHU_SYSTEM_ID,
    calendarInput: { calendar: "gregorian", date: dateInput.value },
    shichenIndex: Number(shichenSelect.value),
    sexForCalculation: sex,
    solarTimeAdjustment: "none",
    civilContext: {
      usedForCalculation: false,
      localTime: null,
      timeZone: null,
      location: {
        precision: "unknown",
        label: "browser-workspace-not-collected",
        latitude: null,
        longitude: null
      }
    },
    birthSourceRef: "local.browser.workspace",
    sourceNote: "Browser workspace input; persisted only after explicit user save."
  };
}

function setCalculating(calculating: boolean): void {
  calculateButton.disabled = calculating;
  board.setAttribute("aria-busy", String(calculating));
  if (calculating) {
    calculateButton.querySelector("span")!.textContent = "正在生成并核对…";
    setWorkspaceStatus("正在新建一次性 Worker；当前结果不会自动保存。", "loading");
  } else {
    calculateButton.querySelector("span")!.textContent = "生成完整工程工件";
  }
}

function setFormError(message: string | null): void {
  formError.hidden = message === null;
  formError.textContent = message ?? "";
}

function setWorkspaceStatus(message: string, state: "loading" | "ready" | "error"): void {
  workspaceStatus.textContent = message;
  workspaceStatus.dataset.state = state;
}

function setSafetyMessage(message: string, state: "loading" | "success" | "error"): void {
  safetyMessage.textContent = message;
  safetyMessage.dataset.state = state;
}

function setAudit(name: string, value: string): void {
  const target = artifactAudit.querySelector<HTMLElement>(`[data-audit="${name}"]`);
  if (!target) throw new Error(`页面缺少核对字段 ${name}`);
  target.textContent = value;
  target.title = value;
}

function summaryPair(label: string, value: string): HTMLDivElement {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  wrapper.append(term, description);
  return wrapper;
}

function startDownload(exported: ZiweiBrowserWorkspaceJsonExportDraft): void {
  const buffer = exported.bytes.slice().buffer;
  const blob = new Blob([buffer], { type: exported.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exported.fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function startTextDownload(text: string, fileName: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function publishUpdate(epoch: number): void {
  updateChannel?.postMessage({ epoch });
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isEpochConflict(cause: unknown): boolean {
  return cause instanceof ZiweiBrowserWorkspaceDraftError && cause.code === "EPOCH_CONFLICT";
}

function userFacingError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ZiweiBrowserWorkspaceDraftError)) {
    return cause instanceof Error && cause.message ? cause.message : fallback;
  }
  const messages: Partial<Record<typeof cause.code, string>> = {
    INVALID_UTF8: "这不是可读取的 UTF-8 紫微备份文件。",
    INVALID_JSON: "这不是可读取的紫微备份文件。",
    NON_CANONICAL_BYTES: "备份文件格式已改变，无法安全恢复。",
    PAYLOAD_TOO_LARGE: "文件超过当前安全上限。",
    SCHEMA_INVALID: "文件不是受支持的紫微独立档案格式。",
    ARTIFACT_INVALID: "内层排盘工件未通过工程核对。",
    DIGEST_MISMATCH: "内容与摘要不一致，操作已停止。",
    DATABASE_OPEN_FAILED: "这台浏览器暂时无法打开独立紫微档案。",
    DATABASE_VERSION_UNSUPPORTED: "本地紫微档案版本不受当前草案支持。",
    DATABASE_STATE_CORRUPT: "本地档案状态无法核对，未显示或改写资料。",
    EPOCH_CONFLICT: "资料库已在另一个页面更新，请刷新后重试。",
    REVISION_CONFLICT: "发现相同 Revision 身份但内容不同，未覆盖原资料。",
    CONTENT_CONFLICT: "发现相同内容地址对应不同 Revision，未写入。",
    PARENT_NOT_FOUND: "历史版本链缺少父 Revision。",
    PARENT_STUDY_MISMATCH: "历史版本链跨越了不同研究档案。",
    LINEAGE_CYCLE: "历史版本链形成循环，操作已停止。",
    CAPACITY_EXCEEDED: "本机独立紫微档案容量不足，本次操作已回滚。",
    REVISION_NOT_FOUND: "找不到这个紫微 Revision。",
    CONTENT_NOT_FOUND: "找不到这个内容地址。",
    STORED_INDEX_MISMATCH: "本地索引与保存内容不一致，未显示不可信结果。",
    BACKUP_CONFLICT: "备份与本地不可变资料冲突，未恢复任何内容。",
    TRANSACTION_ABORTED: "本次事务中止，没有部分写入。"
  };
  return messages[cause.code] ?? fallback;
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`页面缺少 #${id}`);
  return element as T;
}
