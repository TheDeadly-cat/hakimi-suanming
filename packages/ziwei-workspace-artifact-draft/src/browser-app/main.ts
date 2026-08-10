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
  calculateZiweiInFreshBrowserWorker,
  createZiweiBrowserDisplayProjection,
  type BrowserProbeDisplayProjection,
  type BrowserProbeSuccessResult
} from "../browser-calculation-bridge.ts";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  type ZiweiBirthInputDraft
} from "../contract-bridge.ts";

type BrowserArtifact = BrowserProbeSuccessResult["artifact"];

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
let resultMatchesInput = false;
let pendingRestore: Readonly<{
  bytes: Uint8Array;
  inspection: ZiweiBrowserWorkspaceRestoreInspectionDraft;
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

artifactTitle.tabIndex = -1;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void calculateFromForm();
});
form.addEventListener("input", () => {
  if (!currentArtifact || !resultMatchesInput) return;
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
  setCalculating(true);
  clearArtifact();
  try {
    const result = await calculateZiweiInFreshBrowserWorker(input);
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
    clearArtifact();
    const message = userFacingError(cause, "本次排盘没有完成，请重试；没有保存任何资料。");
    setFormError(message);
    setWorkspaceStatus(message, "error");
  } finally {
    setCalculating(false);
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
  setWorkspaceStatus("正在重开并核对保存内容…", "loading");
  try {
    const revision = await repository.reopenRevision(revisionId);
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
    clearArtifact();
    setWorkspaceStatus(
      userFacingError(cause, "档案内容无法核对，未显示不可信结果。"),
      "error"
    );
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

function clearArtifact(): void {
  currentArtifact = null;
  currentRevision = null;
  resultMatchesInput = false;
  board.querySelectorAll(".palace-cell").forEach((element) => element.remove());
  delete board.dataset.hasResult;
  centerPrimary.textContent = "等待一次计算";
  centerSecondary.textContent = "计算完成后可预览，再由你明确决定是否保存。";
  centerSummary.replaceChildren();
  centerSummary.hidden = true;
  artifactAudit.hidden = true;
  saveForm.hidden = true;
  artifactBadge.textContent = "尚未生成";
  artifactBadge.dataset.state = "empty";
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
