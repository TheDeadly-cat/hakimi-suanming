import "./styles.css";
import {
  runWesternCivilFactWorker,
  WesternCivilFactWorkerError
} from "./civil-client.ts";
import type { WesternCivilBrowserFactProjection } from "./browser-fact-projection.ts";
import { formatUtcOffsetSeconds } from "./ui-format.ts";

const CURRENT_TZDB_SNAPSHOT_ID =
  "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" +
  "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";

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
  "declared-civil-time",
  "utc-instant",
  "utc-offset",
  "dst-decision",
  "tzdb-identity",
  "round-trip",
  "supported-range",
  "adapter-version",
  "data-handling",
  "chain-digest"
]);

let viewGeneration = 0;

precision.addEventListener("change", () => normalizeTimePrecision());
form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", () => invalidateRenderedProjection());
form.addEventListener("change", () => invalidateRenderedProjection());
overlapButton.addEventListener("click", () => {
  viewGeneration += 1;
  requireElement<HTMLInputElement>("date").value = "2021-11-07";
  time.value = "01:30";
  precision.value = "exact_minute";
  requireElement<HTMLInputElement>("time-zone").value = "America/New_York";
  requireElement<HTMLSelectElement>("dst-policy").value = "reject";
  requireElement<HTMLInputElement>("latitude").value = "40.7128";
  requireElement<HTMLInputElement>("longitude").value = "-74.006";
  normalizeTimePrecision();
  clearRenderedFacts("已载入重叠样例；默认策略会失败关闭");
});

runButton.addEventListener("click", () => {
  const generation = ++viewGeneration;
  clearRenderedFacts("解析中…", "running");
  setInputControlsDisabled(true);
  void runWesternCivilFactWorker(buildRequest()).then(
    (outcome) => {
      if (generation !== viewGeneration) return;
      renderProjection(outcome.projection);
    },
    (cause) => {
      if (generation !== viewGeneration) return;
      const code = cause instanceof WesternCivilFactWorkerError
        ? cause.code
        : "UNEXPECTED_FAIL_CLOSED";
      renderFailure(code);
    }
  ).finally(() => {
    if (generation === viewGeneration) setInputControlsDisabled(false);
  });
});

function invalidateRenderedProjection(): void {
  if (inputFieldset.disabled) return;
  viewGeneration += 1;
  clearRenderedFacts("输入已改变；请重新生成");
}

function setInputControlsDisabled(disabled: boolean): void {
  inputFieldset.disabled = disabled;
  overlapButton.disabled = disabled;
}

function buildRequest(): unknown {
  const date = requireElement<HTMLInputElement>("date").value;
  const timeValue = time.value;
  const timePrecision = precision.value;
  const timeZone = requireElement<HTMLInputElement>("time-zone").value;
  const dstDisambiguation = requireElement<HTMLSelectElement>("dst-policy").value;
  const latitude = requireElement<HTMLInputElement>("latitude").valueAsNumber;
  const longitude = requireElement<HTMLInputElement>("longitude").valueAsNumber;
  return {
    input: {
      contractVersion: "0.1.0-draft.1",
      systemId: "western-astrology",
      calendar: "proleptic_gregorian",
      date,
      time: timeValue,
      timePrecision,
      timeZone,
      dstDisambiguation,
      location: {
        label: "browser-local-input",
        latitude,
        longitude,
        elevationMeters: null,
        precision: "coordinates"
      },
      birthSourceRef: "browser.local-input",
      sourceNote: "Local in-memory engineering input; no persistence."
    },
    tzdbSnapshotId: CURRENT_TZDB_SNAPSHOT_ID
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

function clearRenderedFacts(message: string, state: "idle" | "running" = "idle"): void {
  results.hidden = true;
  clearFactValues();
  errorBox.hidden = true;
  errorBox.replaceChildren();
  status.textContent = message;
  status.dataset.state = state;
}

function renderFailure(code: string): void {
  results.hidden = true;
  clearFactValues();
  errorBox.hidden = false;
  errorBox.textContent = `失败关闭：${code}`;
  status.textContent = "未生成任何事实";
  status.dataset.state = "failed";
}

function clearFactValues(): void {
  for (const id of FACT_VALUE_IDS) setText(id, "");
}

function renderProjection(projection: WesternCivilBrowserFactProjection): void {
  errorBox.hidden = true;
  errorBox.replaceChildren();
  setText(
    "declared-civil-time",
    `${projection.declaredCivilTime.date} ${projection.declaredCivilTime.time} · ${projection.declaredCivilTime.timeZoneToken}`
  );
  setText("utc-instant", projection.resolution.utcInstant);
  setText("utc-offset", formatUtcOffsetSeconds(projection.resolution.utcOffsetSeconds));
  setText("dst-decision", `${projection.resolution.kind} / ${projection.resolution.decision}`);
  setText("tzdb-identity", `${projection.tzdbBinding.ianaVersion} · ${shortDigest(projection.tzdbBinding.dataSha256)}`);
  setText("round-trip", projection.resolution.requestedLocalTimeRoundTripVerified ? "通过" : "失败");
  setText("supported-range", `${projection.tzdbBinding.supportedRange.from} — ${projection.tzdbBinding.supportedRange.to}`);
  setText("adapter-version", projection.sourceReceipt.resolverVersion);
  setText("data-handling", "个人派生 · 应用代码不主动记录／持久化／外传");
  setText("chain-digest", projection.digests.browserProjectionSha256);
  results.hidden = false;
  status.textContent = "工程事实已生成 · 未正式准入";
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
