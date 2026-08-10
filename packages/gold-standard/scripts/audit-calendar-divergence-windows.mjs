import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Solar } from "lunar-typescript";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(packageRoot, "../..");
const fixturePath = path.join(packageRoot, "fixtures", "calendar-divergence-windows.v1.json");
const differentialPlanPath = path.join(packageRoot, "fixtures", "p0-03-differential-plan.v1.json");
const differentialReportPath = path.join(packageRoot, "reports", "p0-03-engineering-diagnostic.v1.json");
const dotnetScriptPath = path.join(packageRoot, "scripts", "run-p0-03-calendar-dotnet.ps1");
const EXPECTED_DATASET_DIGEST = "52ab3d6af80ff086cb1db8b32bf1c14a8ff23f35602faedea48623804f50f931";
const EXPECTED_PARENT_REPORT_DIGEST = "fbb761568b71178138c460b5ecdfc2b634690efe58d4349defff3d7117ab3130";
const EXPECTED_PARENT_PLAN_DIGEST = "f31e467691d45e2dd8795b41a8b67d2c4771fdf71482b06917ed4b2e90089f06";
const EXPECTED_ASTRONOMY_ENVELOPE_DIGEST = "f8fd870a8da3a171b3d14060ae2f6c01a3ef4de220e9fbd3435b348353d37804";
const MAX_NETWORK_ARTIFACT_BYTES = 2 * 1024 * 1024;
const NETWORK_SOURCE_REFS = Object.freeze({
  "hko-calendar-2089-tc": "https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2089c.txt",
  "hko-calendar-2097-tc": "https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2097c.txt",
  "usno-moon-phases-2089": "https://aa.usno.navy.mil/api/moon/phases/year?year=2089",
  "usno-moon-phases-2097": "https://aa.usno.navy.mil/api/moon/phases/year?year=2097"
});
const EXPECTED_WINDOWS = Object.freeze([
  {
    windowId: "calendar-divergence-2089-month-08",
    startDate: "2089-09-03",
    endDate: "2089-10-04",
    usnoSourceId: "usno-moon-phases-2089"
  },
  {
    windowId: "calendar-divergence-2097-month-07",
    startDate: "2097-08-06",
    endDate: "2097-09-06",
    usnoSourceId: "usno-moon-phases-2097"
  }
]);
const HKO_LUNAR_MONTHS = Object.freeze({
  正: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  十一: 11,
  十二: 12
});
const HKO_LUNAR_DAYS = Object.freeze([
  "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeCanonicalValue(input) {
  if (input === null || typeof input === "boolean" || typeof input === "string") return input;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("fixture contains a non-finite number");
    return input;
  }
  if (Array.isArray(input)) return input.map(normalizeCanonicalValue);
  if (typeof input === "object") {
    return Object.keys(input).sort().reduce((output, key) => {
      if (input[key] !== undefined) output[key] = normalizeCanonicalValue(input[key]);
      return output;
    }, {});
  }
  throw new Error(`fixture contains a non-JSON value: ${typeof input}`);
}

function canonicalStringify(value) {
  return JSON.stringify(normalizeCanonicalValue(value));
}

function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function assertFixtureEnvelope(fixture) {
  if (!fixture || typeof fixture !== "object" || !fixture.payload || typeof fixture.digest !== "string") {
    throw new Error("calendar window fixture is not an envelope");
  }
  const payloadDigest = sha256(Buffer.from(canonicalStringify(fixture.payload), "utf8"));
  if (fixture.digest !== payloadDigest || fixture.digest !== EXPECTED_DATASET_DIGEST) {
    throw new Error(`calendar window fixture digest mismatch: declared=${fixture.digest}; calculated=${payloadDigest}`);
  }
  const payload = fixture.payload;
  if (
    payload.format !== "hakimi-calendar-divergence-windows"
    || payload.formatVersion !== "1.0.0"
    || payload.datasetId !== "hakimi-p0-03-calendar-divergence-windows-v1"
    || payload.classification !== "engineering_diagnostic_only"
    || payload.parentDiagnostic?.reportDigest !== EXPECTED_PARENT_REPORT_DIGEST
    || payload.parentDiagnostic?.planDigest !== EXPECTED_PARENT_PLAN_DIGEST
    || payload.normalizedAstronomyEventEnvelopeDigest !== EXPECTED_ASTRONOMY_ENVELOPE_DIGEST
    || payload.releaseBoundary?.countsAsVerifiedGold !== false
    || payload.releaseBoundary?.verifiedGoldDelta !== 0
    || payload.releaseBoundary?.fullP003GatePassed !== false
  ) {
    throw new Error("calendar window fixture release boundary or identity changed");
  }
  if (
    payload.declaredCounts?.windows !== 2
    || payload.declaredCounts?.cases !== 64
    || payload.declaredCounts?.divergence !== 60
    || payload.declaredCounts?.controls !== 4
    || payload.declaredCounts?.triggerCases !== 7
    || payload.triggers?.length !== 7
    || payload.sources?.length !== 7
    || payload.windows?.length !== 2
  ) {
    throw new Error("calendar window fixture declared coverage changed");
  }

  const sourceById = new Map(payload.sources.map((source) => [source.sourceId, source]));
  if (sourceById.size !== 7) throw new Error("calendar window fixture source IDs are not unique");
  for (const [sourceId, expectedUrl] of Object.entries(NETWORK_SOURCE_REFS)) {
    const source = sourceById.get(sourceId);
    if (
      !source
      || source.sourceRef !== expectedUrl
      || source.artifacts?.length !== 1
      || source.artifacts[0]?.sourceRef !== expectedUrl
      || !/^[a-f0-9]{64}$/.test(source.artifacts[0]?.sha256 ?? "")
    ) {
      throw new Error(`${sourceId} is not bound to the fixed HTTPS artifact`);
    }
  }

  const cases = [];
  for (let windowIndex = 0; windowIndex < EXPECTED_WINDOWS.length; windowIndex += 1) {
    const expected = EXPECTED_WINDOWS[windowIndex];
    const window = payload.windows[windowIndex];
    if (
      window?.windowId !== expected.windowId
      || window.startDate !== expected.startDate
      || window.endDate !== expected.endDate
      || window.expectedCaseCount !== 32
      || window.expectedDivergenceCount !== 30
      || window.expectedControlCount !== 2
      || window.rootCauseAssessment?.resolutionStatus !== "unresolved"
      || window.rootCauseAssessment?.usnoSourceId !== expected.usnoSourceId
      || window.cases?.length !== 32
    ) {
      throw new Error(`calendar window ${expected.windowId} coverage changed`);
    }
    for (let ordinal = 0; ordinal < 32; ordinal += 1) {
      const candidate = window.cases[ordinal];
      const expectedDate = addDays(expected.startDate, ordinal);
      const expectedRole = ordinal === 0 || ordinal === 31 ? "control" : "divergence";
      if (
        candidate?.ordinal !== ordinal
        || candidate.gregorianDate !== expectedDate
        || candidate.caseId !== `calendar-window-${expectedDate}`
        || candidate.role !== expectedRole
        || !candidate.observations?.hko
        || !candidate.observations?.currentAdapter
        || !candidate.observations?.icu
        || !candidate.observations?.dotnet
      ) {
        throw new Error(`calendar window ${expected.windowId} case ${ordinal} changed or is missing`);
      }
      cases.push(candidate);
    }
  }
  if (
    cases.length !== 64
    || new Set(cases.map((candidate) => candidate.caseId)).size !== 64
    || new Set(cases.map((candidate) => candidate.gregorianDate)).size !== 64
    || cases.filter((candidate) => candidate.role === "divergence").length !== 60
    || cases.filter((candidate) => candidate.role === "control").length !== 4
    || cases.flatMap((candidate) => candidate.triggerCaseIds).length !== 7
  ) {
    throw new Error("calendar window fixture does not contain the exact 64-day audit coverage");
  }
  return { payload, cases, sourceById, payloadDigest };
}

function parseHkoCalendar(bytes, expectedGregorianYear) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  const observations = new Map();
  let lunarYear = null;
  let lunarMonth = null;
  let lunarLeapMonth = false;
  for (const line of text.split(/\r?\n/)) {
    const match = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\S+)/.exec(line);
    if (!match) continue;
    const gregorianYear = Number(match[1]);
    if (gregorianYear !== expectedGregorianYear) {
      throw new Error(`HKO ${expectedGregorianYear} table contains an unexpected year ${gregorianYear}`);
    }
    const token = match[4];
    const monthMatch = /^(閏)?(十二|十一|十|九|八|七|六|五|四|三|二|正)月$/.exec(token);
    let lunarDay;
    if (monthMatch) {
      lunarMonth = HKO_LUNAR_MONTHS[monthMatch[2]];
      lunarLeapMonth = Boolean(monthMatch[1]);
      if (lunarMonth === 1 && !lunarLeapMonth) lunarYear = gregorianYear;
      lunarDay = 1;
    } else {
      const dayIndex = HKO_LUNAR_DAYS.indexOf(token);
      if (dayIndex < 0 || lunarYear === null || lunarMonth === null) continue;
      lunarDay = dayIndex + 1;
    }
    if (lunarYear === null || lunarMonth === null) continue;
    const gregorianDate = `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
    observations.set(gregorianDate, {
      lunarDate: `${lunarYear}-${String(lunarMonth).padStart(2, "0")}-${String(lunarDay).padStart(2, "0")}`,
      lunarLeapMonth
    });
  }
  return observations;
}

function assertParentDiagnostics(payload, plan, report) {
  const planDigest = sha256(Buffer.from(canonicalStringify(plan), "utf8"));
  const reportDigest = sha256(Buffer.from(canonicalStringify(report.payload), "utf8"));
  if (planDigest !== EXPECTED_PARENT_PLAN_DIGEST || payload.parentDiagnostic.planDigest !== planDigest) {
    throw new Error(`P0-03 parent plan digest mismatch: ${planDigest}`);
  }
  if (
    report?.digest !== reportDigest
    || reportDigest !== EXPECTED_PARENT_REPORT_DIGEST
    || payload.parentDiagnostic.reportDigest !== reportDigest
    || report.payload?.plan?.planDigest !== planDigest
  ) {
    throw new Error(`P0-03 parent report digest mismatch: declared=${report?.digest}; calculated=${reportDigest}`);
  }
  const reportTriggers = report.payload.calendarIndependentDifferential.exceptions
    .filter((item) => item.status === "mismatch")
    .map((item) => ({
      caseId: item.input.caseId,
      inputDigest: item.input.inputDigest,
      gregorianDate: item.input.date
    }))
    .sort((left, right) => left.caseId.localeCompare(right.caseId));
  const fixtureTriggers = payload.triggers
    .map((item) => ({ caseId: item.caseId, inputDigest: item.inputDigest, gregorianDate: item.gregorianDate }))
    .sort((left, right) => left.caseId.localeCompare(right.caseId));
  if (
    report.payload.calendarIndependentDifferential.counts?.mismatch !== 7
    || canonicalStringify(reportTriggers) !== canonicalStringify(fixtureTriggers)
  ) {
    throw new Error("P0-03 parent report no longer binds the exact seven window triggers");
  }
}

function sameObservation(left, right) {
  return left.lunarDate === right.lunarDate && left.lunarLeapMonth === right.lunarLeapMonth;
}

function dateParts(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function adapterObservation(gregorianDate) {
  const { year, month, day } = dateParts(gregorianDate);
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  const lunarMonth = lunar.getMonth();
  return {
    lunarDate: `${lunar.getYear()}-${String(Math.abs(lunarMonth)).padStart(2, "0")}-${String(lunar.getDay()).padStart(2, "0")}`,
    lunarLeapMonth: lunarMonth < 0
  };
}

const icuFormatter = new Intl.DateTimeFormat("en-u-ca-chinese", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "numeric",
  day: "numeric"
});

function icuObservation(gregorianDate) {
  const parts = new Map(icuFormatter
    .formatToParts(new Date(`${gregorianDate}T04:00:00.000Z`))
    .filter((item) => item.type !== "literal")
    .map((item) => [item.type, item.value]));
  const relatedYear = parts.get("relatedYear");
  const monthText = parts.get("month");
  const dayText = parts.get("day");
  if (!relatedYear || !monthText || !dayText) {
    throw new Error(`ICU did not return complete Chinese calendar fields for ${gregorianDate}`);
  }
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error(`ICU returned non-numeric Chinese calendar fields for ${gregorianDate}`);
  }
  return {
    lunarDate: `${relatedYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    lunarLeapMonth: !/^\d+$/.test(monthText)
  };
}

async function fetchAndHash(source) {
  const expectedUrl = NETWORK_SOURCE_REFS[source.sourceId];
  if (!expectedUrl || source.sourceRef !== expectedUrl || source.artifacts[0]?.sourceRef !== expectedUrl) {
    throw new Error(`${source.sourceId} is not in the fixed network allowlist`);
  }
  const response = await fetch(expectedUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`${source.sourceId} returned HTTP ${response.status}`);
  if (new URL(response.url).href !== new URL(expectedUrl).href) {
    throw new Error(`${source.sourceId} resolved to an unexpected URL: ${response.url}`);
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_NETWORK_ARTIFACT_BYTES) {
    throw new Error(`${source.sourceId} exceeds the ${MAX_NETWORK_ARTIFACT_BYTES}-byte network limit`);
  }
  if (!response.body) throw new Error(`${source.sourceId} returned no response body`);
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    totalBytes += chunk.byteLength;
    if (totalBytes > MAX_NETWORK_ARTIFACT_BYTES) {
      throw new Error(`${source.sourceId} exceeded the ${MAX_NETWORK_ARTIFACT_BYTES}-byte network limit while streaming`);
    }
    chunks.push(Buffer.from(chunk));
  }
  const bytes = Buffer.concat(chunks, totalBytes);
  const expected = source.artifacts[0]?.sha256;
  const actual = sha256(bytes);
  if (actual !== expected) {
    throw new Error(`${source.sourceId} raw SHA-256 changed: expected ${expected}, got ${actual}`);
  }
  return bytes;
}

async function runSelfTest() {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const { payload } = assertFixtureEnvelope(fixture);
  const plan = JSON.parse(await readFile(differentialPlanPath, "utf8"));
  const report = JSON.parse(await readFile(differentialReportPath, "utf8"));
  assertParentDiagnostics(payload, plan, report);

  const mutations = [
    (candidate) => candidate.payload.windows[0].cases.pop(),
    (candidate) => { candidate.payload.sources[0].note += " resigned"; },
    (candidate) => { candidate.payload.sources[0].sourceRef = "https://example.com/T2089c.txt"; }
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(fixture);
    mutate(candidate);
    candidate.digest = sha256(Buffer.from(canonicalStringify(candidate.payload), "utf8"));
    let rejected = false;
    try {
      assertFixtureEnvelope(candidate);
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error("audit runner self-test accepted a mutated and re-signed fixture");
  }

  const hkoSample = new TextEncoder().encode([
    "2089年2月10日         正月        星期四",
    "2089年8月6日          七月        星期六",
    "2089年9月3日          廿九        星期六",
    "2089年9月4日          八月        星期日",
    "2089年9月5日          初二        星期一"
  ].join("\n"));
  const parsedHko = parseHkoCalendar(hkoSample, 2089);
  if (
    parsedHko.get("2089-09-03")?.lunarDate !== "2089-07-29"
    || parsedHko.get("2089-09-04")?.lunarDate !== "2089-08-01"
    || parsedHko.get("2089-09-05")?.lunarDate !== "2089-08-02"
  ) {
    throw new Error("audit runner self-test did not reconstruct the HKO month boundary");
  }
  process.stdout.write(`${JSON.stringify({ selfTestPassed: true, negativeCases: mutations.length, hkoParserCases: 3 })}\n`);
}

if (process.argv.includes("--self-test")) {
  await runSelfTest();
} else {
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-calendar-window-audit-"));
const dotnetInputPath = path.join(temporaryRoot, "dotnet-input.json");
const dotnetOutputPath = path.join(temporaryRoot, "dotnet-output.json");
try {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const { payload, cases, sourceById, payloadDigest } = assertFixtureEnvelope(fixture);
  const differentialPlan = JSON.parse(await readFile(differentialPlanPath, "utf8"));
  const differentialReport = JSON.parse(await readFile(differentialReportPath, "utf8"));
  assertParentDiagnostics(payload, differentialPlan, differentialReport);

  const adapterMismatches = [];
  const icuMismatches = [];
  for (const candidate of cases) {
    const adapter = adapterObservation(candidate.gregorianDate);
    const icu = icuObservation(candidate.gregorianDate);
    if (!sameObservation(adapter, candidate.observations.currentAdapter)) {
      adapterMismatches.push(candidate.caseId);
    }
    if (!sameObservation(icu, candidate.observations.icu)) {
      icuMismatches.push(candidate.caseId);
    }
  }
  if (adapterMismatches.length > 0 || icuMismatches.length > 0) {
    throw new Error(`local replay mismatch: adapter=${adapterMismatches.join(",") || "none"}; ICU=${icuMismatches.join(",") || "none"}`);
  }

  const adapterSource = sourceById.get("current-adapter-lunar-typescript-1-8-6");
  const icuSource = sourceById.get("icu-chinese-calendar-78-3");
  if (!adapterSource || !icuSource) throw new Error("fixture is missing adapter or ICU source snapshots");
  const adapterDistributionPath = path.join(workspaceRoot, "node_modules", "lunar-typescript", "dist", "index.mjs");
  const adapterDistributionHash = sha256(await readFile(adapterDistributionPath));
  if (adapterDistributionHash !== adapterSource.artifacts[0]?.sha256) {
    throw new Error(`lunar-typescript distribution SHA-256 changed: ${adapterDistributionHash}`);
  }
  const nodeExecutableHash = sha256(await readFile(process.execPath));
  if (nodeExecutableHash !== icuSource.artifacts[0]?.sha256) {
    throw new Error(`Node/ICU runtime executable SHA-256 changed: ${nodeExecutableHash}`);
  }
  if (process.versions.icu !== "78.3" || process.versions.cldr !== "48.0" || process.versions.tz !== "2026b") {
    throw new Error(`ICU runtime changed: ICU=${process.versions.icu}, CLDR=${process.versions.cldr}, tz=${process.versions.tz}`);
  }

  const dotnetInput = {
    payload: {
      format: "hakimi-p0-03-calendar-differential-input",
      cases: cases.map((candidate) => ({ caseId: candidate.caseId, localDate: candidate.gregorianDate }))
    }
  };
  await writeFile(dotnetInputPath, JSON.stringify(dotnetInput), "utf8");
  const dotnet = spawnSync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", dotnetScriptPath,
    "-InputPath", dotnetInputPath,
    "-OutputPath", dotnetOutputPath
  ], { cwd: workspaceRoot, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 30_000, windowsHide: true });
  if (dotnet.error) throw dotnet.error;
  if (dotnet.status !== 0) throw new Error(`.NET replay failed: ${dotnet.stderr || dotnet.stdout}`);
  const dotnetResult = JSON.parse(await readFile(dotnetOutputPath, "utf8"));
  const dotnetById = new Map(dotnetResult.results.map((result) => [result.caseId, result]));
  const dotnetMismatches = cases.filter((candidate) => {
    const result = dotnetById.get(candidate.caseId);
    return result?.status !== "observation" || !sameObservation(result.observedCalendar, candidate.observations.dotnet);
  });
  if (dotnetMismatches.length > 0) {
    throw new Error(`.NET replay mismatch: ${dotnetMismatches.map((item) => item.caseId).join(",")}`);
  }
  const expectedDotnetArtifact = sourceById.get("dotnet-framework-4-8-chinese-lunisolar")?.artifacts[0]?.sha256;
  if (dotnetResult.tool.sourceRef !== `runtime-assembly-sha256:${expectedDotnetArtifact}`) {
    throw new Error(`.NET runtime artifact changed: ${dotnetResult.tool.sourceRef}`);
  }

  const networkSourceIds = [
    "hko-calendar-2089-tc",
    "hko-calendar-2097-tc",
    "usno-moon-phases-2089",
    "usno-moon-phases-2097"
  ];
  const networkBytes = new Map();
  for (const sourceId of networkSourceIds) {
    const source = sourceById.get(sourceId);
    if (!source) throw new Error(`fixture is missing ${sourceId}`);
    networkBytes.set(sourceId, await fetchAndHash(source));
  }

  let hkoObservationsMatched = 0;
  for (const auditWindow of payload.windows) {
    const hkoBytes = networkBytes.get(auditWindow.hkoSourceId);
    if (!hkoBytes) throw new Error(`downloaded HKO bytes are missing for ${auditWindow.windowId}`);
    const hkoObservations = parseHkoCalendar(hkoBytes, Number(auditWindow.startDate.slice(0, 4)));
    for (const candidate of auditWindow.cases) {
      const parsed = hkoObservations.get(candidate.gregorianDate);
      if (!parsed || !sameObservation(parsed, candidate.observations.hko)) {
        throw new Error(`HKO table observation mismatch for ${candidate.caseId}`);
      }
      hkoObservationsMatched += 1;
    }
  }

  const normalizedAstronomyEvents = [];
  for (const auditWindow of payload.windows) {
    const usnoBytes = networkBytes.get(auditWindow.rootCauseAssessment.usnoSourceId);
    const usno = JSON.parse(usnoBytes.toString("utf8"));
    if (usno.apiversion !== "4.0.1") throw new Error(`USNO API version changed: ${usno.apiversion}`);
    const expectedUtc = new Date(auditWindow.rootCauseAssessment.newMoonUtc);
    const event = usno.phasedata.find((item) =>
      item.phase === "New Moon"
      && item.year === expectedUtc.getUTCFullYear()
      && item.month === expectedUtc.getUTCMonth() + 1
    );
    const expectedTime = auditWindow.rootCauseAssessment.newMoonUtc.slice(11, 16);
    if (!event || event.day !== expectedUtc.getUTCDate() || event.time !== expectedTime) {
      throw new Error(`USNO new-moon event changed for ${auditWindow.windowId}`);
    }
    const universalTime = `${event.year}-${String(event.month).padStart(2, "0")}-${String(event.day).padStart(2, "0")}T${event.time}`;
    const chinaStandardTime = auditWindow.rootCauseAssessment.fixedPlus08Local.replace(":00+08:00", "+08:00");
    normalizedAstronomyEvents.push({
      phase: event.phase,
      universalTime,
      chinaStandardTime,
      impliedCivilDate: chinaStandardTime.slice(0, 10)
    });
  }
  const normalizedAstronomyEnvelope = {
    source: "U.S. Naval Observatory Dates of Primary Phases of the Moon API",
    apiVersion: "4.0.1",
    timeScaleLabel: "Universal Time",
    localConversion: "add +08:00; no DST",
    events: normalizedAstronomyEvents
  };
  const normalizedAstronomyDigest = sha256(Buffer.from(JSON.stringify(normalizedAstronomyEnvelope), "utf8"));
  if (
    normalizedAstronomyDigest !== EXPECTED_ASTRONOMY_ENVELOPE_DIGEST
    || payload.normalizedAstronomyEventEnvelopeDigest !== normalizedAstronomyDigest
  ) {
    throw new Error(`normalized USNO astronomy envelope digest mismatch: ${normalizedAstronomyDigest}`);
  }

  process.stdout.write(`${JSON.stringify({
    datasetDigest: payloadDigest,
    cases: cases.length,
    currentAdapterMatched: cases.length,
    icuMatched: cases.length,
    dotnetMatched: cases.length,
    networkArtifactsMatched: networkSourceIds.length,
    hkoArtifactHashesMatched: 2,
    hkoObservationsMatched,
    usnoArtifactHashesMatched: 2,
    normalizedAstronomyEnvelopeMatched: true,
    parentArtifactsMatched: 2,
    resolutionStatus: "unresolved",
    countsAsVerifiedGold: false,
    verifiedGoldDelta: 0
  })}\n`);
} finally {
  const resolvedTemporaryRoot = path.resolve(temporaryRoot);
  const resolvedOsTemp = path.resolve(os.tmpdir());
  if (
    resolvedTemporaryRoot.startsWith(`${resolvedOsTemp}${path.sep}`)
    && path.basename(resolvedTemporaryRoot).startsWith("hakimi-calendar-window-audit-")
  ) {
    await rm(resolvedTemporaryRoot, { recursive: true, force: true });
  }
}
}
