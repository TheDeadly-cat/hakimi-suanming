import "./styles.css";
import {
  runVedicCivilFactWorker,
  VedicCivilFactWorkerError
} from "./civil-client.ts";
import type { VedicCivilBrowserFactProjection } from "./browser-fact-projection.ts";
import {
  VEDIC_BROWSER_DST_POLICY_VERSION,
  VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
  VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION,
  VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION,
  VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID,
  VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
  VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION
} from "./input-contract.ts";
import {
  formatUtcOffsetSeconds,
  formatVedicCivilBrowserFailureForUi
} from "./ui-format.ts";

const form = requireElement<HTMLFormElement>("fact-form");
const runButton = requireElement<HTMLButtonElement>("run-chain");
const inputFieldset = requireElement<HTMLFieldSetElement>("input-fieldset");
const overlapButton = requireElement<HTMLButtonElement>("load-overlap-example");
const status = requireElement<HTMLOutputElement>("chain-status");
const errorBox = requireElement<HTMLDivElement>("error-box");
const results = requireElement<HTMLDivElement>("fact-results");
const precision = requireElement<HTMLSelectElement>("time-precision");
const time = requireElement<HTMLInputElement>("time");
const FACT_VALUE_IDS = Object.freeze([
  "declared-civil-time", "utc-instant", "utc-offset", "dst-decision", "tzdb-identity", "round-trip",
  "supported-range", "resolver-version", "data-handling", "chain-digest"
]);

let viewGeneration = 0;

precision.addEventListener("change", normalizeTimePrecision);
form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", invalidateRenderedProjection);
form.addEventListener("change", invalidateRenderedProjection);
overlapButton.addEventListener("click", () => {
  viewGeneration += 1;
  requireElement<HTMLInputElement>("date").value = "2025-11-02";
  time.value = "01:30";
  precision.value = "exact_minute";
  requireElement<HTMLInputElement>("time-zone").value = "America/New_York";
  requireElement<HTMLSelectElement>("dst-policy").value = "vedic_adapter_draft_reject";
  normalizeTimePrecision();
  clearRenderedFacts("已载入重叠样例；默认策略会失败关闭");
});

runButton.addEventListener("click", () => {
  const generation = ++viewGeneration;
  clearRenderedFacts("解析中…", "running");
  setControlsDisabled(true);
  void runVedicCivilFactWorker(buildRequest()).then(
    (outcome) => {
      if (generation !== viewGeneration) return;
      try {
        renderProjection(outcome.projection);
      } catch {
        renderFailure("UI_RENDER_FAILED_CLOSED");
      }
    },
    (cause) => {
      if (generation !== viewGeneration) return;
      const code = cause instanceof VedicCivilFactWorkerError ? cause.code : "UNEXPECTED_FAIL_CLOSED";
      renderFailure(code);
    }
  ).finally(() => {
    if (generation === viewGeneration) setControlsDisabled(false);
  });
});

function buildRequest(): unknown {
  const dateParts = requireElement<HTMLInputElement>("date").value.split("-").map(Number);
  return {
    projectionVersion: VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
    civil_calendar_and_date: {
      calendar_id: "proleptic_gregorian",
      calendar_version: VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
      year: dateParts[0],
      month: dateParts[1],
      day: dateParts[2]
    },
    local_wall_time_and_precision: {
      wall_time_text: time.value,
      precision_id: precision.value,
      precision_version: VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION
    },
    birth_time_uncertainty_interval_or_candidates: {
      representation: "exact",
      model_id: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
      model_version: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION
    },
    iana_time_zone_and_tzdb_identity: {
      iana_time_zone_id: requireElement<HTMLInputElement>("time-zone").value,
      tzdb_version: "2026c",
      tzdb_snapshot_id: VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID
    },
    dst_ambiguity_policy: {
      policy_id: requireElement<HTMLSelectElement>("dst-policy").value,
      policy_version: VEDIC_BROWSER_DST_POLICY_VERSION
    }
  };
}

function normalizeTimePrecision(): void {
  if (precision.value === "exact_second") {
    time.step = "1";
    if (/^\d{2}:\d{2}$/u.test(time.value)) time.value = `${time.value}:00`;
  } else {
    time.step = "60";
    if (/^\d{2}:\d{2}:\d{2}$/u.test(time.value)) time.value = time.value.slice(0, 5);
  }
}

function invalidateRenderedProjection(): void {
  if (inputFieldset.disabled) return;
  viewGeneration += 1;
  clearRenderedFacts("输入已改变；请重新生成");
}

function setControlsDisabled(disabled: boolean): void {
  inputFieldset.disabled = disabled;
  overlapButton.disabled = disabled;
}

function clearRenderedFacts(message: string, state: "idle" | "running" = "idle"): void {
  results.hidden = true;
  for (const id of FACT_VALUE_IDS) setText(id, "");
  errorBox.hidden = true;
  errorBox.replaceChildren();
  status.textContent = message;
  status.dataset.state = state;
}

function renderFailure(code: string): void {
  results.hidden = true;
  for (const id of FACT_VALUE_IDS) setText(id, "");
  errorBox.hidden = false;
  errorBox.textContent = `失败关闭：${formatVedicCivilBrowserFailureForUi(code)}`;
  status.textContent = "未生成任何事实";
  status.dataset.state = "failed";
}

function renderProjection(projection: VedicCivilBrowserFactProjection): void {
  const renderedUtcOffset = formatUtcOffsetSeconds(projection.resolution.utcOffsetSeconds);
  const renderedWallTimeDecision =
    `${projection.resolution.kind} / ${projection.resolution.decision} · 未判定是否 DST`;
  errorBox.hidden = true;
  errorBox.replaceChildren();
  setText("declared-civil-time", `${projection.declaredCivilTime.date} ${projection.declaredCivilTime.time} · ${projection.declaredCivilTime.timeZoneToken}`);
  setText("utc-instant", projection.resolution.utcInstant);
  setText("utc-offset", renderedUtcOffset);
  setText("dst-decision", renderedWallTimeDecision);
  setText("tzdb-identity", `${projection.tzdbBinding.ianaVersion} · ${shortDigest(projection.tzdbBinding.dataSha256)}`);
  setText("round-trip", projection.resolution.requestedLocalTimeRoundTripVerified ? "通过" : "失败");
  setText(
    "supported-range",
    `${projection.tzdbBinding.supportedRange.from} — ${projection.tzdbBinding.supportedRange.to} · UTC 瞬时点另受保守门限制`
  );
  setText("resolver-version", projection.sourceReceipt.resolverVersion);
  setText("data-handling", "个人派生 · 不主动记录／持久化／外传");
  setText("chain-digest", projection.digests.browserProjectionSha256);
  results.hidden = false;
  status.textContent = "工程事实已生成 · research-only";
  status.dataset.state = "passed";
}

function shortDigest(value: string): string {
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function setText(id: string, value: string): void {
  requireElement<HTMLElement>(id).textContent = value;
}

function requireElement<ElementType extends HTMLElement>(id: string): ElementType {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing required element ${id}`);
  return element as ElementType;
}

normalizeTimePrecision();
