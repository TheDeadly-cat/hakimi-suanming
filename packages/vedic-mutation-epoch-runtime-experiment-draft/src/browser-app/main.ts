import "./styles.css";
import {
  createVedicForwardRestoreCandidate,
  createVedicEphemeralExperimentDatabaseName,
  createVedicMutationCandidate,
  deleteVedicEphemeralMutationEpochRuntimeExperiment,
  openVedicEphemeralMutationEpochRuntimeExperiment,
  VedicEphemeralRuntimeError,
  type VedicEphemeralRuntimeSnapshot,
  type VedicMutationCandidate
} from "../runtime.ts";

interface ProbeResult {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing fixed UI element: ${id}`);
  return element as T;
}

function candidate(
  base: VedicEphemeralRuntimeSnapshot,
  _suffix: string,
  nextStateId: VedicMutationCandidate["nextStateId"] = "synthetic_governance_state_beta"
): VedicMutationCandidate {
  return createVedicMutationCandidate(base, nextStateId, "no_revocation_event");
}

function errorCode(cause: unknown): string {
  return cause instanceof VedicEphemeralRuntimeError ? cause.code : "UNCLASSIFIED_FAILURE";
}

function expectCode(cause: unknown, allowed: readonly string[]): string {
  const code = errorCode(cause);
  if (!allowed.includes(code)) throw cause;
  return code;
}

function renderResults(results: readonly ProbeResult[]): void {
  const rows = results.map((result) => {
    const item = document.createElement("li");
    item.dataset.probeId = result.id;
    item.dataset.outcome = "passed";
    const marker = document.createElement("span");
    marker.className = "marker";
    marker.textContent = "PASS";
    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = result.title;
    const detail = document.createElement("p");
    detail.textContent = result.detail;
    content.append(title, detail);
    item.append(marker, content);
    return item;
  });
  probeResults.replaceChildren(...rows);
}

const runButton = requireElement<HTMLButtonElement>("run-experiment");
const runStatus = requireElement<HTMLParagraphElement>("run-status");
const probeResults = requireElement<HTMLOListElement>("probe-results");
const runError = requireElement<HTMLParagraphElement>("run-error");
const passedCount = requireElement<HTMLElement>("passed-count");
const personFieldCount = requireElement<HTMLElement>("person-field-count");
const productReceiptCount = requireElement<HTMLElement>("product-receipt-count");

async function runFixedExperiment(): Promise<void> {
  runButton.disabled = true;
  runStatus.dataset.state = "running";
  runStatus.textContent = "正在临时数据库中执行固定探针；authority 仍全部为 false。";
  runError.hidden = true;
  runError.textContent = "";
  passedCount.textContent = "0";
  personFieldCount.textContent = "0";
  productReceiptCount.textContent = "0";
  probeResults.innerHTML = '<li class="placeholder">临时事务执行中…</li>';

  const databaseName = createVedicEphemeralExperimentDatabaseName();
  let runtime: Awaited<ReturnType<typeof openVedicEphemeralMutationEpochRuntimeExperiment>> | null = null;
  const results: ProbeResult[] = [];
  try {
    runtime = await openVedicEphemeralMutationEpochRuntimeExperiment(indexedDB, databaseName);
    const alpha = await runtime.readSnapshot();
    const alphaRestoreProbe = await runtime.captureEphemeralRestoreProbeSnapshot();

    const casOutcomes = await Promise.allSettled([
      runtime.commitCandidate(candidate(alpha, "browser_cas_left")),
      runtime.commitCandidate(candidate(alpha, "browser_cas_right"))
    ]);
    const casAccepted = casOutcomes.filter((outcome) => outcome.status === "fulfilled");
    const casRejected = casOutcomes.filter((outcome) => outcome.status === "rejected");
    if (casAccepted.length !== 1 || casRejected.length !== 1) throw new Error("CAS_CARDINALITY_MISMATCH");
    const casCode = expectCode(casRejected[0]!.reason, ["BASE_SNAPSHOT_MISMATCH", "STALE_MUTATION_EPOCH"]);
    const beta = await runtime.readSnapshot();
    if (beta.mutationEpoch !== 1 || beta.stateId !== "synthetic_governance_state_beta") {
      throw new Error("CAS_STATE_MISMATCH");
    }
    results.push({
      id: "cas",
      title: "并发 CAS 只提交一个候选",
      detail: `epoch 0→1；竞争候选以 ${casCode} 失败关闭。`
    });

    await runtime.restoreSnapshotAsForwardMutation(
      alphaRestoreProbe,
      createVedicForwardRestoreCandidate(beta, "synthetic_prior_state_revoked")
    );
    const alphaAgain = await runtime.readSnapshot();
    if (alphaAgain.mutationEpoch !== 2
      || alphaAgain.stateDigest !== alpha.stateDigest
      || alphaAgain.chainHeadDigest === alpha.chainHeadDigest) {
      throw new Error("ABA_BOUNDARY_MISMATCH");
    }
    results.push({
      id: "aba",
      title: "A→B→A 不复用旧 epoch",
      detail: "状态摘要回到 A，但 epoch 前进到 2，chain head 保持新的历史身份。"
    });

    try {
      await runtime.runSyntheticAbortAfterPutProbe(candidate(alphaAgain, "browser_abort"));
      throw new Error("ABORT_PROBE_UNEXPECTED_COMMIT");
    } catch (cause) {
      expectCode(cause, ["SYNTHETIC_ABORT_PROBE"]);
    }
    const afterAbort = await runtime.readSnapshot();
    if (afterAbort.envelopeDigest !== alphaAgain.envelopeDigest) throw new Error("ABORT_CHANGED_STATE");
    results.push({
      id: "abort",
      title: "put 后合成中止保持原子回滚",
      detail: "state、epoch、三条 head 与工程观察均未写入。"
    });

    try {
      await runtime.runSyntheticQuotaLikeAbortAfterPutProbe(candidate(alphaAgain, "browser_quota"));
      throw new Error("QUOTA_PROBE_UNEXPECTED_COMMIT");
    } catch (cause) {
      expectCode(cause, ["SYNTHETIC_QUOTA_LIKE_ABORT_PROBE"]);
    }
    const afterQuota = await runtime.readSnapshot();
    if (afterQuota.envelopeDigest !== alphaAgain.envelopeDigest) throw new Error("QUOTA_CHANGED_STATE");
    results.push({
      id: "quota",
      title: "put 后 quota-like 合成中止保持原子回滚",
      detail: "这是普通 post-put abort 故障注入，不是实际 QuotaExceededError 或容量测量。"
    });

    try {
      await runtime.restoreSnapshotAsForwardMutation(
        alphaRestoreProbe,
        createVedicForwardRestoreCandidate(afterQuota, "no_revocation_event")
      );
      throw new Error("RESTORE_REPLAY_UNEXPECTED_COMMIT");
    } catch (cause) {
      expectCode(cause, ["RESTORE_SNAPSHOT_REPLAY"]);
    }
    results.push({
      id: "restore-replay",
      title: "同一恢复探针不可重放",
      detail: "已消费 snapshot digest 被拒绝，epoch 仍为 2。"
    });

    runtime.close();
    runtime = null;
    await deleteVedicEphemeralMutationEpochRuntimeExperiment(indexedDB, databaseName);
    runtime = await openVedicEphemeralMutationEpochRuntimeExperiment(indexedDB, databaseName);
    const freshGeneration = await runtime.readSnapshot();
    if (freshGeneration.generationId === alpha.generationId || freshGeneration.mutationEpoch !== 0) {
      throw new Error("GENERATION_RECREATE_MISMATCH");
    }
    try {
      await runtime.restoreSnapshotAsForwardMutation(
        alphaRestoreProbe,
        createVedicForwardRestoreCandidate(freshGeneration, "no_revocation_event")
      );
      throw new Error("STALE_GENERATION_UNEXPECTED_COMMIT");
    } catch (cause) {
      expectCode(cause, ["RESTORE_SNAPSHOT_GENERATION_MISMATCH"]);
    }
    results.push({
      id: "generation",
      title: "清除重建产生新 generation",
      detail: "旧 generation 的恢复探针被拒绝；新 generation 从 epoch 0 开始。"
    });

    renderResults(results);
    passedCount.textContent = String(results.length);
    runStatus.dataset.state = "complete";
    runStatus.textContent = "六项机械探针通过；正在确认临时数据库清理，产品与发布 authority 仍全部为 false。";
  } catch (cause) {
    probeResults.replaceChildren();
    runStatus.dataset.state = "error";
    runStatus.textContent = "探针未形成完整机械观察；结果失败关闭。";
    runError.hidden = false;
    runError.textContent = `失败代码：${errorCode(cause)}`;
  } finally {
    runtime?.close();
    try {
      await deleteVedicEphemeralMutationEpochRuntimeExperiment(indexedDB, databaseName);
      if (runStatus.dataset.state === "complete") {
        runStatus.textContent = "六项机械探针通过；临时数据库清理已确认，产品与发布 authority 仍全部为 false。";
      }
    } catch {
      runStatus.dataset.cleanup = "failed";
      runStatus.textContent += " 临时数据库清理未确认。";
    }
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", () => {
  void runFixedExperiment();
});
