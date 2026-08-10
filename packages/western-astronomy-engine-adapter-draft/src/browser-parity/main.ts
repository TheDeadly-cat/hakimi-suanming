import "./styles.css";
import nodeReference from "./generated-node-reference.ts";
import {
  WESTERN_BROWSER_PARITY_PROTOCOL_VERSION,
  WESTERN_BROWSER_PARITY_REFERENCE_VERSION,
  type WesternBrowserNodeReference,
  type WesternBrowserParityResult,
  type WesternBrowserParityWorkerRequest,
  type WesternBrowserParityWorkerResponse
} from "./protocol.ts";
import { createWesternCrossRuntimeQuantizedProjection } from "./quantized-projection.ts";

const ENGINE_RUNTIME_ESM_SHA256 =
  "068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7";
const ENGINE_SOURCE_LOCK_SHA256 =
  "a0d929d78cff75aa543e78350aece6a35636c4c081f5620c5a7cc9aaaf400975";
const DELTA_T_LOCK_SHA256 =
  "de5cb6ea1dda00ebe230394be38968b93c42b77988ba1d8437a1487fd46265f7";

const runButton = requireElement<HTMLButtonElement>("run-parity");
const status = requireElement<HTMLElement>("parity-status");
const summary = requireElement<HTMLElement>("parity-summary");
const resultBody = requireElement<HTMLTableSectionElement>("parity-results");
const sourceDigest = requireElement<HTMLElement>("source-digest");
const projectionDigest = requireElement<HTMLElement>("projection-digest");

runButton.addEventListener("click", () => {
  void runParityGate();
});

void runParityGate();

async function runParityGate(): Promise<void> {
  setRunning();
  try {
    const reference = requireNodeReference(nodeReference);
    sourceDigest.textContent = shortDigest(reference.buildInputEsmSha256);
    projectionDigest.textContent = reference.projectionVersion;
    const instanceIds = new Set<string>();
    let matched = 0;
    let rawCanonicalExact = 0;
    const rows: HTMLTableRowElement[] = [];

    for (const seed of reference.seeds) {
      const started = performance.now();
      try {
        const requestDigest = await sha256CanonicalJson(seed.request);
        const nodeRawDigest = await sha256CanonicalJson(seed.nodeRawResult);
        const rebuiltNodeStable = createWesternCrossRuntimeQuantizedProjection(seed.nodeRawResult);
        const rebuiltNodeStableDigest = await sha256CanonicalJson(rebuiltNodeStable);
        if (requestDigest !== seed.requestSha256
          || nodeRawDigest !== seed.nodeRawResultSha256
          || rebuiltNodeStableDigest !== seed.stableProjectionSha256
          || canonicalJson(rebuiltNodeStable) !== canonicalJson(seed.stableProjection)) {
          throw new Error("fresh Node reference does not bind its raw result to the stable projection");
        }
        const response = await runSeedInFreshWorker(seed.request);
        if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
        if (instanceIds.has(response.workerInstanceId)) {
          throw new Error("fresh Browser Worker instance identity was reused");
        }
        instanceIds.add(response.workerInstanceId);
        const browserRawDigest = await sha256CanonicalJson(response.result);
        const rebuiltBrowserStable = createWesternCrossRuntimeQuantizedProjection(response.result);
        const browserStableDigest = await sha256CanonicalJson(response.stableProjection);
        const rebuiltBrowserStableDigest = await sha256CanonicalJson(rebuiltBrowserStable);
        if (browserRawDigest !== response.audit.rawResultSha256) {
          throw new Error("Browser Worker raw-result digest failed main-thread recomputation");
        }
        if (browserStableDigest !== response.audit.stableProjectionSha256) {
          throw new Error("Browser Worker stable-projection digest failed main-thread recomputation");
        }
        if (rebuiltBrowserStableDigest !== browserStableDigest
          || canonicalJson(rebuiltBrowserStable) !== canonicalJson(response.stableProjection)) {
          throw new Error("Browser raw result does not bind to its returned stable projection");
        }
        if (browserStableDigest !== seed.stableProjectionSha256) {
          const difference = firstDifference(seed.stableProjection, response.stableProjection);
          throw new Error(`Node/Browser stable projection differs at ${formatDifference(difference)}`);
        }
        if (canonicalJson(response.stableProjection) !== canonicalJson(seed.stableProjection)) {
          const difference = firstDifference(seed.stableProjection, response.stableProjection);
          throw new Error(`Node/Browser stable fields differ at ${formatDifference(difference)}`);
        }
        const rawMatches = browserRawDigest === seed.nodeRawResultSha256
          && canonicalJson(response.result) === canonicalJson(seed.nodeRawResult);
        if (rawMatches) rawCanonicalExact += 1;
        matched += 1;
        rows.push(createResultRow(
          seed.id,
          seed.request.utcInstant,
          seed.request.bodyIds.length,
          true,
          rawMatches,
          performance.now() - started,
          seed.stableProjectionSha256
        ));
      } catch (cause) {
        rows.push(createResultRow(
          seed.id,
          seed.request.utcInstant,
          seed.request.bodyIds.length,
          false,
          false,
          performance.now() - started,
          "",
          cause instanceof Error ? cause.message : String(cause)
        ));
      }
    }

    resultBody.replaceChildren(...rows);
    document.documentElement.dataset.parityMatched = String(matched);
    document.documentElement.dataset.parityTotal = String(reference.seeds.length);
    if (matched !== reference.seeds.length) {
      document.documentElement.dataset.parityStatus = "failed_closed";
      status.textContent = "差异已关闭";
      status.dataset.state = "failed";
      summary.textContent = `${matched}/${reference.seeds.length} 个量化稳定投影与本次 fresh Node 参考逐字段完全相同；失败项没有被接受。`;
      return;
    }
    document.documentElement.dataset.parityStatus = "passed";
    status.textContent = "一致性门通过";
    status.dataset.state = "passed";
    document.documentElement.dataset.rawCanonicalExact = String(rawCanonicalExact);
    summary.textContent = `${matched}/${reference.seeds.length} 个量化稳定投影逐字段完全相同；共创建 ${instanceIds.size} 个互不复用的 Browser Worker。原始 double 的 canonical JSON 为 ${rawCanonicalExact}/${reference.seeds.length} 精确一致，仅记录、不作为通过条件。`;
  } catch (cause) {
    document.documentElement.dataset.parityStatus = "failed_closed";
    document.documentElement.dataset.parityMatched = "0";
    status.textContent = "构建参考不可用";
    status.dataset.state = "failed";
    summary.textContent = cause instanceof Error ? cause.message : String(cause);
  } finally {
    runButton.disabled = false;
    runButton.textContent = "重新运行五个种子";
  }
}

function setRunning(): void {
  runButton.disabled = true;
  runButton.textContent = "正在逐个创建 Worker…";
  status.textContent = "核对中";
  status.dataset.state = "running";
  summary.textContent = "先在构建时 fresh-run Node 参考，再在当前浏览器逐个重放相同请求。";
  resultBody.replaceChildren();
  document.documentElement.dataset.parityStatus = "running";
  document.documentElement.dataset.parityMatched = "0";
  document.documentElement.dataset.parityTotal = "5";
  document.documentElement.dataset.rawCanonicalExact = "0";
}

function requireNodeReference(candidate: unknown): WesternBrowserNodeReference {
  const record = requireRecord(candidate, "fresh Node reference is not an object");
  requireExactKeys(record, [
    "buildInputEsmSha256",
    "deltaTLockSha256",
    "engineVersion",
    "generatedAtBuild",
    "projectionVersion",
    "proofScope",
    "schemaVersion",
    "seeds",
    "sourceLockSha256"
  ], "fresh Node reference has stale or extra fields");
  if (record.schemaVersion !== WESTERN_BROWSER_PARITY_REFERENCE_VERSION
    || record.proofScope !== "fresh_node_worker_build_reference_for_exact_browser_projection_parity"
    || record.engineVersion !== "2.1.19"
    || record.projectionVersion !== "western-astronomy-engine-utc-position/0.1-draft"
    || record.buildInputEsmSha256 !== ENGINE_RUNTIME_ESM_SHA256
    || record.sourceLockSha256 !== ENGINE_SOURCE_LOCK_SHA256
    || record.deltaTLockSha256 !== DELTA_T_LOCK_SHA256
    || record.generatedAtBuild !== true
    || !Array.isArray(record.seeds)
    || record.seeds.length !== 5) {
    throw new Error("fresh Node reference identity or five-seed inventory drifted");
  }
  for (const seedCandidate of record.seeds) {
    const seed = requireRecord(seedCandidate, "fresh Node seed is not an object");
    requireExactKeys(seed, [
      "id",
      "nodeRawResult",
      "nodeRawResultSha256",
      "request",
      "requestSha256",
      "stableProjection",
      "stableProjectionSha256"
    ], "fresh Node seed shape drifted");
    if (typeof seed.id !== "string"
      || typeof seed.requestSha256 !== "string"
      || typeof seed.nodeRawResultSha256 !== "string"
      || typeof seed.stableProjectionSha256 !== "string"
      || !/^[a-f0-9]{64}$/u.test(seed.requestSha256)
      || !/^[a-f0-9]{64}$/u.test(seed.nodeRawResultSha256)
      || !/^[a-f0-9]{64}$/u.test(seed.stableProjectionSha256)) {
      throw new Error("fresh Node seed digest identity is invalid");
    }
  }
  return candidate as WesternBrowserNodeReference;
}

function runSeedInFreshWorker(
  request: WesternBrowserNodeReference["seeds"][number]["request"]
): Promise<WesternBrowserParityWorkerResponse> {
  const requestId = crypto.randomUUID();
  const workerRequest: WesternBrowserParityWorkerRequest = {
    protocolVersion: WESTERN_BROWSER_PARITY_PROTOCOL_VERSION,
    requestId,
    action: "calculate",
    request
  };
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./browser-worker.ts", import.meta.url), {
      type: "module",
      name: `hakimi-western-parity-${requestId}`
    });
    let settled = false;
    let messageCount = 0;
    const timeout = window.setTimeout(() => finish(new Error("fresh Browser Worker exceeded 15 seconds")), 15_000);

    const finish = (failure: Error | null, response?: WesternBrowserParityWorkerResponse): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      worker.terminate();
      if (failure) reject(failure);
      else if (response) resolve(response);
      else reject(new Error("fresh Browser Worker returned no structured response"));
    };

    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      messageCount += 1;
      if (messageCount !== 1) {
        finish(new Error("fresh Browser Worker emitted more than one message"));
        return;
      }
      try {
        finish(null, requireWorkerResponse(event.data, requestId));
      } catch (cause) {
        finish(cause instanceof Error ? cause : new Error(String(cause)));
      }
    });
    worker.addEventListener("messageerror", () => finish(new Error("fresh Browser Worker emitted an unreadable message")), { once: true });
    worker.addEventListener("error", (event) => {
      event.preventDefault();
      finish(new Error(event.message || "fresh Browser Worker runtime failed"));
    }, { once: true });
    worker.postMessage(workerRequest);
  });
}

function requireWorkerResponse(candidate: unknown, requestId: string): WesternBrowserParityWorkerResponse {
  const response = requireRecord(candidate, "Browser Worker response is not an object");
  if (response.protocolVersion !== WESTERN_BROWSER_PARITY_PROTOCOL_VERSION
    || response.requestId !== requestId
    || typeof response.workerInstanceId !== "string"
    || response.workerInstanceId.length < 8
    || typeof response.ok !== "boolean") {
    throw new Error("Browser Worker protocol or request identity mismatch");
  }
  if (response.ok === false) {
    requireExactKeys(response, ["error", "ok", "protocolVersion", "requestId", "workerInstanceId"], "Browser Worker failure shape drifted");
    const error = requireRecord(response.error, "Browser Worker failure detail is missing");
    requireExactKeys(error, ["code", "message"], "Browser Worker failure detail shape drifted");
    if (typeof error.code !== "string" || typeof error.message !== "string") {
      throw new Error("Browser Worker failure detail is invalid");
    }
    return candidate as WesternBrowserParityWorkerResponse;
  }
  requireExactKeys(response, [
    "audit",
    "ok",
    "protocolVersion",
    "requestId",
    "result",
    "stableProjection",
    "workerInstanceId"
  ], "Browser Worker success shape drifted");
  const audit = requireRecord(response.audit, "Browser Worker audit is missing");
  requireExactKeys(audit, [
    "buildInputEsmSha256",
    "deltaTLockSha256",
    "deltaTModelId",
    "engineName",
    "engineVersion",
    "expertTruthClaimed",
    "externalNetworkAccess",
    "isolation",
    "persistence",
    "productionEligible",
    "rawResultSha256",
    "runtime",
    "sourceLockSha256",
    "stableProjectionSha256"
  ], "Browser Worker audit shape drifted");
  if (audit.engineName !== "astronomy-engine"
    || audit.engineVersion !== "2.1.19"
    || audit.buildInputEsmSha256 !== ENGINE_RUNTIME_ESM_SHA256
    || audit.sourceLockSha256 !== ENGINE_SOURCE_LOCK_SHA256
    || audit.deltaTLockSha256 !== DELTA_T_LOCK_SHA256
    || audit.deltaTModelId !== "astronomy-engine@2.1.19.DeltaT_EspenakMeeus"
    || audit.runtime !== "dedicated_browser_worker"
    || audit.isolation !== "fresh_browser_worker_per_seed"
    || audit.persistence !== "none"
    || audit.externalNetworkAccess !== "forbidden_by_preview_csp"
    || audit.productionEligible !== false
    || audit.expertTruthClaimed !== false
    || typeof audit.rawResultSha256 !== "string"
    || typeof audit.stableProjectionSha256 !== "string"
    || !/^[a-f0-9]{64}$/u.test(audit.rawResultSha256)
    || !/^[a-f0-9]{64}$/u.test(audit.stableProjectionSha256)) {
    throw new Error("Browser Worker source, isolation, or claim boundary mismatch");
  }
  requireRecord(response.result, "Browser Worker result is missing");
  requireRecord(response.stableProjection, "Browser Worker stable projection is missing");
  return candidate as WesternBrowserParityWorkerResponse;
}

function createResultRow(
  id: string,
  utcInstant: string,
  bodyCount: number,
  passed: boolean,
  rawCanonicalExact: boolean,
  durationMs: number,
  stableProjectionSha256: string,
  detail = "量化稳定投影逐字段完全相同"
): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.dataset.state = passed ? "passed" : "failed";
  if (stableProjectionSha256) row.dataset.stableProjectionSha256 = stableProjectionSha256;
  for (const value of [
    id,
    utcInstant,
    `${bodyCount} 体`,
    passed ? "稳定投影一致" : "失败关闭",
    rawCanonicalExact ? "是" : "否（仅记录）",
    `${durationMs.toFixed(0)} ms`,
    detail
  ]) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }
  return row;
}

type ValueDifference = Readonly<{ path: string; expected: unknown; actual: unknown }>;

function firstDifference(expected: unknown, actual: unknown, path = "result"): ValueDifference | null {
  if (Object.is(expected, actual)) return null;
  if (expected === null || actual === null || typeof expected !== "object" || typeof actual !== "object") {
    return { path, expected, actual };
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) {
      return { path, expected, actual };
    }
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(expected[index], actual[index], `${path}[${index}]`);
      if (difference) return difference;
    }
    return null;
  }
  const expectedRecord = expected as Record<string, unknown>;
  const actualRecord = actual as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])].sort();
  for (const key of keys) {
    if (!Object.hasOwn(expectedRecord, key) || !Object.hasOwn(actualRecord, key)) {
      return { path: `${path}.${key}`, expected: expectedRecord[key], actual: actualRecord[key] };
    }
    const difference = firstDifference(expectedRecord[key], actualRecord[key], `${path}.${key}`);
    if (difference) return difference;
  }
  return null;
}

function formatDifference(difference: ValueDifference | null): string {
  if (!difference) return "result (digest-only mismatch)";
  return `${difference.path} (Node=${JSON.stringify(difference.expected)}, Browser=${JSON.stringify(difference.actual)})`;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

async function sha256CanonicalJson(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requireRecord(candidate: unknown, message: string): Record<string, unknown> {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error(message);
  return candidate as Record<string, unknown>;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[], message: string): void {
  const actual = Object.keys(record).sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) throw new Error(message);
}

function shortDigest(value: string): string {
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function requireElement<ElementType extends HTMLElement>(id: string): ElementType {
  const element = document.getElementById(id);
  if (!element) throw new Error(`required preview element #${id} is missing`);
  return element as ElementType;
}
