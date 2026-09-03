import "./styles.css";
import {
  runVedicInputPreflightInFreshWorker,
  VedicInputPreflightClientError
} from "../browser-client.ts";

type VedicInputPreflightResult = Awaited<
  ReturnType<typeof runVedicInputPreflightInFreshWorker>
>;

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing fixed UI element: ${id}`);
  return element as T;
}

const runButton = requireElement<HTMLButtonElement>("run-preflight");
const status = requireElement<HTMLParagraphElement>("run-status");
const workerState = requireElement<HTMLSpanElement>("worker-state");
const results = requireElement<HTMLOListElement>("probe-results");
const errorOutput = requireElement<HTMLParagraphElement>("run-error");
const probeCount = requireElement<HTMLElement>("probe-count");
const acceptedCount = requireElement<HTMLElement>("accepted-count");
const productReceiptCount = requireElement<HTMLElement>("product-receipt-count");
const admissionState = requireElement<HTMLElement>("admission-state");

function setState(next: "idle" | "running" | "complete" | "error", message: string): void {
  status.dataset.state = next;
  status.textContent = message;
  workerState.dataset.state = next;
  workerState.textContent = next === "running"
    ? "运行中"
    : next === "complete"
      ? "四项已拒绝"
      : next === "error"
        ? "失败关闭"
        : "未运行";
}

function resetRedSummary(): void {
  probeCount.textContent = "4";
  acceptedCount.textContent = "0";
  productReceiptCount.textContent = "0";
  admissionState.textContent = "false";
}

function clearResults(message: string): void {
  results.replaceChildren();
  const placeholder = document.createElement("li");
  placeholder.className = "probe-placeholder";
  placeholder.textContent = message;
  results.append(placeholder);
}

function renderResult(result: VedicInputPreflightResult): void {
  const rows = result.probeResults.map((probe) => {
    const item = document.createElement("li");
    item.className = "probe-result";
    item.dataset.probeId = probe.probeId;
    item.dataset.receiptId = probe.receiptId;

    const identity = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = probe.probeId;
    const pointer = document.createElement("code");
    pointer.textContent = probe.diagnostic.jsonPointer || "(admission root)";
    identity.append(title, document.createElement("br"), pointer);

    const diagnostic = document.createElement("div");
    const code = document.createElement("code");
    code.className = "probe-code";
    code.textContent = probe.diagnostic.code;
    const receipt = document.createElement("p");
    receipt.className = "receipt-id";
    receipt.textContent = probe.receiptId;
    diagnostic.append(code, receipt);
    item.append(identity, diagnostic);
    return item;
  });
  results.replaceChildren(...rows);
  probeCount.textContent = String(result.diagnosticProbeExecutions);
  acceptedCount.textContent = String(result.acceptedInputs);
  productReceiptCount.textContent = String(result.productInputRejectionReceipts);
  admissionState.textContent = String(result.authorityBoundary.formalAdmissionAuthorized);
}

async function runPreflight(): Promise<void> {
  runButton.disabled = true;
  errorOutput.hidden = true;
  errorOutput.textContent = "";
  resetRedSummary();
  clearResults("一次性 Worker 正在重放四个固定 probe…");
  setState("running", "正在创建 fresh Worker；当前仍保持 0 个获准输入。 ");
  try {
    const outcome = await runVedicInputPreflightInFreshWorker();
    renderResult(outcome);
    setState(
      "complete",
      "四个固定 probe 均返回确定性诊断拒绝；没有输入、产品回执或 authority 被签发。"
    );
    runButton.querySelector("span")!.textContent = "重新运行固定预检";
  } catch (cause) {
    resetRedSummary();
    results.replaceChildren();
    const code = cause instanceof VedicInputPreflightClientError
      ? cause.code
      : "UNCLASSIFIED_PREFLIGHT_FAILURE";
    errorOutput.textContent = `预检未形成可接受结果；全部红门保持关闭（${code}）。`;
    errorOutput.hidden = false;
    setState("error", "Worker 未通过完整协议与结果核验；本次执行失败关闭。 ");
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", () => {
  void runPreflight();
});

resetRedSummary();
