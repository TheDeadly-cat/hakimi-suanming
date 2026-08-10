import "./styles.css";
import type { BrowserProbeDisplayProjection } from "./browser-protocol.ts";
import { calculateZiweiInFreshBrowserWorker } from "./browser-client.ts";
import { createZiweiBrowserDisplayProjection } from "./display-projection.ts";
import type { ZiweiBrowserEngineeringArtifactDraft } from "./browser-artifact.ts";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  type ZiweiBirthInputDraft
} from "../contract-bridge.ts";

const BOARD_POSITIONS = Object.freeze<Record<string, Readonly<{ row: number; column: number }>>>({
  zi: { row: 4, column: 3 },
  chou: { row: 4, column: 2 },
  yin: { row: 4, column: 1 },
  mao: { row: 3, column: 1 },
  chen: { row: 2, column: 1 },
  si: { row: 1, column: 1 },
  wu: { row: 1, column: 2 },
  wei: { row: 1, column: 3 },
  shen: { row: 1, column: 4 },
  you: { row: 2, column: 4 },
  xu: { row: 3, column: 4 },
  hai: { row: 4, column: 4 }
});

const form = requireElement<HTMLFormElement>("birth-form");
const dateInput = requireElement<HTMLInputElement>("birth-date");
const shichenSelect = requireElement<HTMLSelectElement>("shichen-index");
const calculateButton = requireElement<HTMLButtonElement>("calculate-button");
const formError = requireElement<HTMLParagraphElement>("form-error");
const runStatus = requireElement<HTMLParagraphElement>("run-status");
const board = requireElement<HTMLDivElement>("palace-board");
const centerPrimary = requireElement<HTMLElement>("center-primary");
const centerSecondary = requireElement<HTMLParagraphElement>("center-secondary");
const centerSummary = requireElement<HTMLDListElement>("center-summary");
const auditStrip = requireElement<HTMLElement>("audit-strip");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void calculateFromForm();
});

async function calculateFromForm(): Promise<void> {
  setFailure(null);
  clearResult();
  if (!form.reportValidity()) {
    runStatus.textContent = "等待有效输入";
    runStatus.dataset.state = "idle";
    return;
  }

  const input = createInput();
  setLoading(true);
  try {
    const result = await calculateZiweiInFreshBrowserWorker(input);
    renderResult(result.artifact, createZiweiBrowserDisplayProjection(result.artifact));
    runStatus.textContent = "已完成 · Worker 已关闭";
    runStatus.dataset.state = "done";
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    setFailure(message);
    runStatus.textContent = "已关闭 · 未返回结果";
    runStatus.dataset.state = "error";
  } finally {
    setLoading(false);
  }
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
        label: "browser-probe-not-collected",
        latitude: null,
        longitude: null
      }
    },
    birthSourceRef: "local.browser.probe",
    sourceNote: "Ephemeral browser probe input; not persisted and not expert truth."
  };
}

function renderResult(
  artifact: ZiweiBrowserEngineeringArtifactDraft,
  projection: BrowserProbeDisplayProjection
): void {
  const { displayPalaces, displaySummary } = projection;
  board.querySelectorAll(".palace-cell").forEach((element) => element.remove());
  for (const palace of displayPalaces) {
    const position = BOARD_POSITIONS[palace.earthlyBranchId];
    if (!position) throw new Error(`未知地支宫位：${palace.earthlyBranchId}`);

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
    const visibleStars = palace.stars.slice(0, 4);
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
      overflow.textContent = `另 ${palace.stars.length - visibleStars.length} 星`;
      cell.append(overflow);
    }
    board.append(cell);
  }

  centerPrimary.textContent = `${displaySummary.lifePalace}命宫 · ${displaySummary.fiveElementBureau}`;
  centerPrimary.dataset.resultDate = displaySummary.gregorianDate;
  centerPrimary.dataset.resultSex = artifact.facts.directionBasis.sexForCalculation;
  centerSecondary.textContent = `${displaySummary.gregorianDate} · ${displaySummary.shichen} · ${displaySummary.sex}`;
  centerSummary.replaceChildren(
    summaryPair("农历", displaySummary.lunarDate),
    summaryPair("命身", `${displaySummary.lifePalace} / ${displaySummary.bodyPalace}`),
    summaryPair("大限", displaySummary.direction),
    summaryPair("四柱", displaySummary.ganzhi)
  );
  centerSummary.hidden = false;

  setAudit("input-digest", artifact.digests.inputSha256);
  setAudit("facts-digest", artifact.digests.factsSha256);
  setAudit("rule-digest", artifact.digests.ruleSnapshotSha256);
  setAudit("worker-id", artifact.execution.workerInstanceId);
  auditStrip.hidden = false;
  board.dataset.workerInstanceId = artifact.execution.workerInstanceId;
  board.dataset.inputDigest = artifact.digests.inputSha256;
  board.dataset.factsDigest = artifact.digests.factsSha256;
  board.dataset.artifactDigest = artifact.digests.artifactSha256;
  board.dataset.artifactKind = artifact.artifactKind;
  board.dataset.browserSourceGraphDigest = artifact.execution.browserSourceIdentity.browserSourceGraphSha256;
  board.dataset.browserWorkerSourceDigest = artifact.execution.browserSourceIdentity.browserWorkerSourceSha256;
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

function setAudit(name: string, value: string): void {
  const target = document.querySelector<HTMLElement>(`[data-audit="${name}"]`);
  if (!target) throw new Error(`缺少审计字段 ${name}`);
  target.textContent = value;
  target.title = value;
}

function setLoading(loading: boolean): void {
  calculateButton.disabled = loading;
  calculateButton.dataset.loading = String(loading);
  board.setAttribute("aria-busy", String(loading));
  if (loading) {
    runStatus.textContent = "正在新建一次性 Worker";
    runStatus.dataset.state = "running";
  }
}

function clearResult(): void {
  board.querySelectorAll(".palace-cell").forEach((element) => element.remove());
  delete board.dataset.workerInstanceId;
  delete board.dataset.inputDigest;
  delete board.dataset.factsDigest;
  delete board.dataset.artifactDigest;
  delete board.dataset.artifactKind;
  delete board.dataset.browserSourceGraphDigest;
  delete board.dataset.browserWorkerSourceDigest;
  centerPrimary.textContent = "尚未排盘";
  delete centerPrimary.dataset.resultDate;
  delete centerPrimary.dataset.resultSex;
  centerSecondary.textContent = "输入日期、时辰与排盘用性别后生成结构事实。";
  centerSummary.replaceChildren();
  centerSummary.hidden = true;
  auditStrip.hidden = true;
  auditStrip.querySelectorAll<HTMLElement>("[data-audit]").forEach((element) => {
    element.textContent = "";
    element.removeAttribute("title");
  });
}

function setFailure(message: string | null): void {
  formError.hidden = message === null;
  formError.textContent = message ?? "";
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`页面缺少 #${id}`);
  return element as T;
}
