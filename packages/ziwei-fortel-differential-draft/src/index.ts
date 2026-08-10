import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Worker as NodeWorker } from "node:worker_threads";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  sha256ZiweiCanonicalJson,
  verifyZiweiNatalFixtureDraft
} from "./contract-bridge.ts";
import type { ZiweiNatalFixtureDraft } from "./contract-bridge.ts";
import { calculateIztro258EngineeringFixture } from "./iztro-adapter-bridge.ts";

export const ZIWEI_FORTEL_DIFFERENTIAL_VERSION = "0.1.0" as const;
export const ZIWEI_FORTEL_DIFFERENTIAL_ID = "hakimi.ziwei.fortel.named_field_differential" as const;
export const FORTEL_UPSTREAM_VERSION = "1.3.4" as const;
export const FORTEL_UPSTREAM_GIT_HEAD = "39584e11ad9ddb124bd4b337a3b148c2f0b25611" as const;
export const FORTEL_NPM_INTEGRITY = "sha512-ZcCkzotbgAPKmdU2XjW/l0HQcTjouWYTDezPyggmrUPs/rWReEYefWeE8q+mwI3imeM0s2ntdsNpPdX2xlyQ1A==" as const;
export const FORTEL_WORKER_PROTOCOL_VERSION = "hakimi-ziwei-fortel-differential-worker/0.1-draft" as const;
export const FORTEL_DIFFERENTIAL_REPORT_FORMAT = "hakimi-ziwei-named-field-differential/0.1-draft" as const;

const WORKER_ENTRY_URL = new URL("./fortel-worker-entry.mjs", import.meta.url);
const ADAPTER_SOURCE_URL = new URL("./index.ts", import.meta.url);
const LOCK_CLOSURE_URL = new URL("./fortel-ziweidoushu-1.3.4-lock-closure.json", import.meta.url);
const WORKSPACE_PACKAGE_LOCK_URL = new URL("../../../package-lock.json", import.meta.url);
const WORKSPACE_PACKAGE_MANIFEST_URL = new URL("../../../package.json", import.meta.url);
const DEFAULT_TIMEOUT_MS = 15_000;
const ZERO_SHA256 = "0".repeat(64);
const SHICHEN_LOCAL_TIMES = Object.freeze([
  "00:30", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00",
  "14:00", "16:00", "18:00", "20:00", "22:00", "23:30"
] as const);

const BRANCH_IDS = Object.freeze([
  "zi", "chou", "yin", "mao", "chen", "si",
  "wu", "wei", "shen", "you", "xu", "hai"
] as const);
const STEM_IDS = Object.freeze([
  "jia", "yi", "bing", "ding", "wu", "ji", "geng", "xin", "ren", "gui"
] as const);
const ROLE_IDS = Object.freeze([
  "life", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "wellbeing", "parents"
] as const);
const MAJOR_STAR_KEYS = Object.freeze([
  "ziweiMaj", "tianjiMaj", "taiyangMaj", "wuquMaj", "tiantongMaj", "lianzhenMaj", "tianfuMaj",
  "taiyinMaj", "tanlangMaj", "jumenMaj", "tianxiangMaj", "tianliangMaj", "qishaMaj", "pojunMaj"
] as const);
const MINOR_STAR_KEYS = Object.freeze([
  "lucunMin", "tiankuiMin", "tianyueMin", "wenchangMin", "wenquMin", "zuofuMin", "youbiMin",
  "dikongMin", "dijieMin", "huoxingMin", "lingxingMin", "qingyangMin", "tuoluoMin", "tianmaMin"
] as const);
const TRANSFORMATION_IDS = Object.freeze(["lu", "quan", "ke", "ji"] as const);
const UNSUPPORTED_CHECK_IDS = Object.freeze([
  "ganzhi.month",
  "ganzhi.hour",
  "unsupported.brightness_scale",
  "unsupported.auxiliary_star_inventory",
  "unsupported.borrowed_palace_ratios",
  "unsupported.runtime_transits",
  "unsupported.interpretation"
] as const);
const CHECK_DEFINITIONS = Object.freeze([
  { checkId: "calendar.gregorian", family: "calendar", fieldPath: "calendar.gregorianDate" },
  { checkId: "calendar.lunar", family: "calendar", fieldPath: "calendar.lunarDate" },
  { checkId: "calendar.shichen", family: "calendar", fieldPath: "calendar.shichenIndex" },
  { checkId: "ganzhi.year", family: "ganzhi", fieldPath: "calendar.yearGanzhi" },
  { checkId: "ganzhi.month", family: "ganzhi", fieldPath: "calendar.monthGanzhi" },
  { checkId: "ganzhi.day", family: "ganzhi", fieldPath: "calendar.dayGanzhi" },
  { checkId: "ganzhi.hour", family: "ganzhi", fieldPath: "calendar.hourGanzhi" },
  { checkId: "palace.life", family: "palace", fieldPath: "lifePalaceBranchId" },
  { checkId: "palace.body", family: "palace", fieldPath: "bodyPalaceBranchId" },
  { checkId: "bureau", family: "bureau", fieldPath: "fiveElementBureauId" },
  { checkId: "direction", family: "major_period", fieldPath: "direction" },
  ...ROLE_IDS.flatMap((roleId) => [
    { checkId: `palace.role.${roleId}`, family: "palace", fieldPath: `roleBranches.${roleId}` },
    { checkId: `palace.stem.${roleId}`, family: "palace", fieldPath: `palaceStems.${roleId}` }
  ]),
  ...MAJOR_STAR_KEYS.map((starKey) => ({
    checkId: `star.major.${starKey}`,
    family: "major_star",
    fieldPath: `majorStarBranches.${starKey}`
  })),
  ...MINOR_STAR_KEYS.map((starKey) => ({
    checkId: `star.minor.${starKey}`,
    family: "minor_star",
    fieldPath: `minorStarBranches.${starKey}`
  })),
  ...TRANSFORMATION_IDS.map((transformationId) => ({
    checkId: `transformation.${transformationId}`,
    family: "transformation",
    fieldPath: `transformations.${transformationId}`
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    checkId: `major_period.${index + 1}`,
    family: "major_period",
    fieldPath: `majorPeriods.${index}`
  })),
  ...[
    "brightness_scale", "auxiliary_star_inventory", "borrowed_palace_ratios", "runtime_transits", "interpretation"
  ].map((fieldPath) => ({ checkId: `unsupported.${fieldPath}`, family: "unsupported", fieldPath }))
]);
const EXPECTED_CHECK_IDS = Object.freeze(CHECK_DEFINITIONS.map(({ checkId }) => checkId));
const CHECK_DEFINITION_BY_ID = new Map(CHECK_DEFINITIONS.map((definition) => [definition.checkId, definition] as const));
const REPORT_WARNINGS = Object.freeze([
  "This report compares two freshly executed engineering implementations pinned by package-lock identity; a match is not expert validation and a difference is not an error verdict.",
  "Fortel identifies itself as Zhongzhou-school behavior while the fresh iztro reference uses iztro_default; no aggregate score or majority vote is produced.",
  "Month Ganzhi, brightness scales, auxiliary-star inventories, and interpretation are intentionally non-comparable in this slice."
] as const);

type JsonScalar = string | number | boolean | null;
type NamedValue = JsonScalar | Readonly<Record<string, JsonScalar>>;
type DifferentialStatus = "match" | "different" | "unsupported";

export type FortelDifferentialInput = Readonly<{
  gregorianDate: string;
  shichenIndex: number;
  sexForCalculation: "male" | "female";
}>;

export type FortelNamedProjection = Readonly<{
  projectionVersion: "hakimi-ziwei-named-facts/0.1-draft";
  chartType: "heaven";
  input: FortelDifferentialInput;
  calendar: Readonly<{
    gregorianDate: string;
    lunarDate: Readonly<{ year: number; month: number; day: number; isLeapMonth: boolean }>;
    shichenIndex: number;
    yearGanzhi: string;
    monthGanzhi: string;
    dayGanzhi: string;
    hourGanzhi: null;
  }>;
  lifePalaceBranchId: string;
  bodyPalaceBranchId: string;
  fiveElementBureauId: string;
  direction: "forward" | "backward";
  roleBranches: Readonly<Record<string, string>>;
  palaceStems: Readonly<Record<string, string>>;
  majorStarBranches: Readonly<Record<string, string>>;
  minorStarBranches: Readonly<Record<string, string>>;
  transformations: Readonly<Record<string, string>>;
  majorPeriods: readonly Readonly<{
    sequence: number;
    roleId: string;
    heavenlyStemId: string;
    earthlyBranchId: string;
    direction: "forward" | "backward";
    startAge: number;
    endAge: number;
  }>[];
  engineSpecific: Readonly<{
    monthGanzhiSemantics: "fortel_bundled_calendar_solar_term_month";
    lateZiDayPolicy: "same_civil_day";
    chartType: "SKY";
    librarySchoolClaim: "zhongzhou";
  }>;
  unsupportedFieldFamilies: readonly string[];
}>;

export type FortelProjectionReceipt = Readonly<{
  engine: Readonly<{
    differentialId: typeof ZIWEI_FORTEL_DIFFERENTIAL_ID;
    differentialVersion: typeof ZIWEI_FORTEL_DIFFERENTIAL_VERSION;
    upstreamName: "fortel-ziweidoushu";
    upstreamVersion: typeof FORTEL_UPSTREAM_VERSION;
    upstreamGitHead: typeof FORTEL_UPSTREAM_GIT_HEAD;
    upstreamNpmIntegrity: typeof FORTEL_NPM_INTEGRITY;
    dependencyGraphSha256: string;
    adapterSourceSha256: string;
    workerEntrySha256: string;
    workerProtocolVersion: typeof FORTEL_WORKER_PROTOCOL_VERSION;
    isolation: "fresh_worker_per_calculation";
    proofScope: "package_lock_closure_identity_not_installed_bytes";
    runtime: "node";
    runtimeVersion: string;
    requestId: string;
    workerInstanceId: string;
    startedAt: string;
    completedAt: string;
    exitCode: 0;
  }>;
  projection: FortelNamedProjection;
  projectionSha256: string;
}>;

export type ZiweiNamedFieldCheck = Readonly<{
  checkId: string;
  family: string;
  fieldPath: string;
  status: DifferentialStatus;
  iztroValue: NamedValue;
  fortelValue: NamedValue;
  classification: "same_named_fact" | "implementation_difference_no_truth_verdict" | "semantics_not_aligned";
}>;

export type ZiweiFortelDifferentialReport = Readonly<{
  format: typeof FORTEL_DIFFERENTIAL_REPORT_FORMAT;
  systemId: "ziwei-doushu";
  reportId: string;
  createdAt: string;
  mode: "differential_diagnostic";
  productionEligible: false;
  expertTruthClaimed: false;
  input: FortelDifferentialInput;
  iztroReference: Readonly<{
    adapterId: "hakimi.ziwei.iztro.node_adapter";
    upstreamVersion: "2.5.8";
    profileId: "iztro.2_5_8.default_heaven";
    artifactSha256: string;
    inputSha256: string;
    factsSha256: string;
  }>;
  fortelReference: FortelProjectionReceipt["engine"] & Readonly<{ projectionSha256: string }>;
  checks: readonly ZiweiNamedFieldCheck[];
  summary: Readonly<{
    matchCount: number;
    differenceCount: number;
    unsupportedCount: number;
    totalChecks: number;
    aggregateScore: null;
    verdict: "no_truth_verdict";
  }>;
  warnings: readonly string[];
  reportSha256: string;
}>;

export type FortelDifferentialOptions = Readonly<{
  signal?: AbortSignal;
  timeoutMs?: number;
}>;

export type FortelDifferentialFreshReproduction = Readonly<{
  assurance: "current_fresh_engine_reproduction";
  historicalExecutionMetadataAuthenticated: false;
  candidateReportSha256: string;
  freshReport: ZiweiFortelDifferentialReport;
}>;

type LockEdge = Readonly<{
  name: string;
  requested: string;
  resolvedPackagePath: string;
  resolvedVersion: string;
}>;
type LockNode = Readonly<{
  packagePath: string;
  name: string;
  version: string;
  resolved: string;
  integrity: string;
  dependencies: readonly LockEdge[];
}>;
type LockClosure = Readonly<{
  schemaVersion: 1;
  proofScope: "package_lock_closure_identity_not_installed_bytes";
  lockfileVersion: 3;
  entryPackage: Readonly<{
    packagePath: string;
    name: string;
    version: string;
    dependencies: readonly LockEdge[];
  }>;
  rootOverrides: Readonly<Record<string, string>>;
  nodes: readonly LockNode[];
}>;

type WorkerSuccess = Readonly<{
  ok: true;
  protocolVersion: string;
  requestId: string;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  runtimeVersion: string;
  upstreamVersion: string;
  result: unknown;
}>;
type WorkerFailure = Readonly<{
  ok: false;
  protocolVersion: string;
  requestId: string | null;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  runtimeVersion: string;
  upstreamVersion: string;
  error: Readonly<{ code: string; message: string }>;
}>;

export class ZiweiFortelDifferentialError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ZiweiFortelDifferentialError";
    this.code = code;
  }
}

const FROZEN_LOCK_CLOSURE = requireLockClosure(
  JSON.parse(readFileSync(LOCK_CLOSURE_URL, "utf8")) as unknown
);

export async function calculateFortelNamedProjectionDraft(
  inputCandidate: unknown,
  options: FortelDifferentialOptions = {}
): Promise<FortelProjectionReceipt> {
  const input = requireDifferentialInput(inputCandidate);
  const locks = await verifyAndCalculateLocks();
  const requestId = randomUUID();
  const response = await runFreshWorker({
    action: "project",
    protocolVersion: FORTEL_WORKER_PROTOCOL_VERSION,
    requestId,
    input
  }, options);
  const projection = requireProjection(response.result, input);
  const projectionSha256 = await sha256ZiweiCanonicalJson(projection);
  return {
    engine: {
      differentialId: ZIWEI_FORTEL_DIFFERENTIAL_ID,
      differentialVersion: ZIWEI_FORTEL_DIFFERENTIAL_VERSION,
      upstreamName: "fortel-ziweidoushu",
      upstreamVersion: FORTEL_UPSTREAM_VERSION,
      upstreamGitHead: FORTEL_UPSTREAM_GIT_HEAD,
      upstreamNpmIntegrity: FORTEL_NPM_INTEGRITY,
      dependencyGraphSha256: locks.dependencyGraphSha256,
      adapterSourceSha256: locks.adapterSourceSha256,
      workerEntrySha256: locks.workerEntrySha256,
      workerProtocolVersion: FORTEL_WORKER_PROTOCOL_VERSION,
      isolation: "fresh_worker_per_calculation",
      proofScope: "package_lock_closure_identity_not_installed_bytes",
      runtime: "node",
      runtimeVersion: response.runtimeVersion,
      requestId,
      workerInstanceId: response.workerInstanceId,
      startedAt: response.startedAt,
      completedAt: response.completedAt,
      exitCode: 0
    },
    projection,
    projectionSha256
  };
}

export async function compareFortelAgainstFreshIztroDraft(
  inputCandidate: unknown,
  options: FortelDifferentialOptions = {}
): Promise<ZiweiFortelDifferentialReport> {
  const input = requireComparableDifferentialInput(inputCandidate);
  const [fixtureCandidate, fortel] = await Promise.all([
    calculateIztro258EngineeringFixture(createFreshIztroInput(input), options),
    calculateFortelNamedProjectionDraft(input, options)
  ]);
  const fixture = await requireFreshIztroReference(fixtureCandidate, input);
  return createDifferentialReport(fixture, fortel);
}

/**
 * Compatibility path for an already-held fixture. The supplied artifact is
 * never trusted on its self-digest alone: the adapter re-runs iztro in a fresh
 * Worker and accepts the comparison only when the fresh facts digest matches.
 */
export async function compareFortelAgainstVerifiedIztroFixtureDraft(
  fixtureCandidate: unknown,
  options: FortelDifferentialOptions = {}
): Promise<ZiweiFortelDifferentialReport> {
  const verified = await verifyZiweiNatalFixtureDraft(fixtureCandidate);
  if (!verified.success) {
    throw new ZiweiFortelDifferentialError(
      "IZTRO_FIXTURE_NOT_VERIFIED",
      `The iztro reference fixture failed the Ziwei contract digest gate: ${verified.reason}`
    );
  }
  const fixture = requireFixedIztroReference(verified.data);
  const input: FortelDifferentialInput = {
    gregorianDate: fixture.input.calendarInput.date,
    shichenIndex: fixture.input.shichenIndex,
    sexForCalculation: fixture.input.sexForCalculation
  };
  requireComparableDifferentialInput(input);
  const [freshCandidate, fortel] = await Promise.all([
    calculateIztro258EngineeringFixture(createFreshIztroInput(input), options),
    calculateFortelNamedProjectionDraft(input, options)
  ]);
  const fresh = await requireFreshIztroReference(freshCandidate, input);
  if (fresh.receipt.factsSha256 !== fixture.receipt.factsSha256) {
    throw new ZiweiFortelDifferentialError(
      "UNAUTHENTICATED_IZTRO_REFERENCE",
      "The supplied iztro facts do not match a fresh calculation from the pinned adapter"
    );
  }
  return createDifferentialReport(fresh, fortel);
}

function createDifferentialReport(
  fixture: ReturnType<typeof requireFixedIztroReference>,
  fortel: FortelProjectionReceipt
): Promise<ZiweiFortelDifferentialReport> {
  const input: FortelDifferentialInput = {
    gregorianDate: fixture.input.calendarInput.date,
    shichenIndex: fixture.input.shichenIndex,
    sexForCalculation: fixture.input.sexForCalculation
  };
  const iztro = projectIztroNamedFacts(fixture);
  const checks = compareNamedFacts(iztro, fortel.projection);
  const summary = summarizeChecks(checks);
  const report: ZiweiFortelDifferentialReport = {
    format: FORTEL_DIFFERENTIAL_REPORT_FORMAT,
    systemId: "ziwei-doushu",
    reportId: randomUUID(),
    createdAt: fortel.engine.completedAt,
    mode: "differential_diagnostic",
    productionEligible: false,
    expertTruthClaimed: false,
    input,
    iztroReference: {
      adapterId: "hakimi.ziwei.iztro.node_adapter",
      upstreamVersion: "2.5.8",
      profileId: "iztro.2_5_8.default_heaven",
      artifactSha256: fixture.receipt.artifactSha256,
      inputSha256: fixture.receipt.inputSha256,
      factsSha256: fixture.receipt.factsSha256
    },
    fortelReference: { ...fortel.engine, projectionSha256: fortel.projectionSha256 },
    checks,
    summary,
    warnings: REPORT_WARNINGS,
    reportSha256: ZERO_SHA256
  };
  return finalizeDifferentialReport(report);
}

async function finalizeDifferentialReport(
  report: ZiweiFortelDifferentialReport
): Promise<ZiweiFortelDifferentialReport> {
  (report as { reportSha256: string }).reportSha256 = await calculateFortelDifferentialReportUnkeyedContentDigestDraft(report);
  const reportVerification = await verifyFortelDifferentialReportStructureAndDigestDraft(report);
  if (reportVerification.success) return reportVerification.data;
  throw new ZiweiFortelDifferentialError(
    "DIFFERENTIAL_REPORT_DIGEST_MISMATCH",
    "The generated Fortel differential report did not pass its canonical digest gate"
  );
}

/** Content-integrity helper only; any caller can recompute this unkeyed digest. */
export async function calculateFortelDifferentialReportUnkeyedContentDigestDraft(
  report: ZiweiFortelDifferentialReport
): Promise<string> {
  const { reportSha256: _discarded, ...projection } = report;
  return sha256ZiweiCanonicalJson(projection);
}

/**
 * Checks the exact draft shape and its unkeyed content digest. This is an
 * integrity gate only: it does not authenticate that historical Workers ran.
 */
export async function verifyFortelDifferentialReportStructureAndDigestDraft(
  candidate: unknown
): Promise<Readonly<{ success: true; data: ZiweiFortelDifferentialReport }> | Readonly<{ success: false; reason: string }>> {
  try {
    const report = requireReport(candidate);
    const expected = await calculateFortelDifferentialReportUnkeyedContentDigestDraft(report);
    if (expected !== report.reportSha256) return { success: false, reason: "report_digest_mismatch" };
    return { success: true, data: report };
  } catch (error) {
    return { success: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Re-runs both pinned adapters in fresh Workers and compares only the stable,
 * reproducible evidence projection. Historical request IDs, Worker IDs,
 * timestamps and the iztro whole-artifact digest are intentionally not
 * authenticated; success returns the newly generated report instead.
 */
export async function reproduceFortelDifferentialReportWithFreshEnginesDraft(
  candidate: unknown,
  options: FortelDifferentialOptions = {}
): Promise<
  Readonly<{ success: true; data: FortelDifferentialFreshReproduction }>
  | Readonly<{ success: false; reason: string }>
> {
  const verified = await verifyFortelDifferentialReportStructureAndDigestDraft(candidate);
  if (!verified.success) return { success: false, reason: `structure_or_digest:${verified.reason}` };
  try {
    const freshReport = await compareFortelAgainstFreshIztroDraft(verified.data.input, options);
    if (canonicalJson(projectReproducibleDifferentialEvidence(verified.data))
      !== canonicalJson(projectReproducibleDifferentialEvidence(freshReport))) {
      return { success: false, reason: "fresh_engine_reproduction_mismatch" };
    }
    return {
      success: true,
      data: {
        assurance: "current_fresh_engine_reproduction",
        historicalExecutionMetadataAuthenticated: false,
        candidateReportSha256: verified.data.reportSha256,
        freshReport
      }
    };
  } catch (error) {
    const reason = error instanceof ZiweiFortelDifferentialError
      ? `${error.code}:${error.message}`
      : error instanceof Error ? error.message : String(error);
    return { success: false, reason: `fresh_engine_reproduction_failed:${reason}` };
  }
}

function projectReproducibleDifferentialEvidence(report: ZiweiFortelDifferentialReport): unknown {
  const {
    requestId: _requestId,
    workerInstanceId: _workerInstanceId,
    startedAt: _startedAt,
    completedAt: _completedAt,
    ...stableFortelReference
  } = report.fortelReference;
  const {
    artifactSha256: _artifactSha256,
    ...stableIztroReference
  } = report.iztroReference;
  return {
    format: report.format,
    systemId: report.systemId,
    mode: report.mode,
    productionEligible: report.productionEligible,
    expertTruthClaimed: report.expertTruthClaimed,
    input: report.input,
    iztroReference: stableIztroReference,
    fortelReference: stableFortelReference,
    checks: report.checks,
    summary: report.summary,
    warnings: report.warnings
  };
}

function requireFixedIztroReference(fixture: ZiweiNatalFixtureDraft): ZiweiNatalFixtureDraft & {
  input: ZiweiNatalFixtureDraft["input"] & { calendarInput: { calendar: "gregorian"; date: string } };
} {
  const engine = fixture.ruleSnapshot.engine;
  if (fixture.artifactKind !== "ziwei_natal_engineering_fixture"
    || fixture.evidence.truthStatus !== "upstream_regression"
    || fixture.evidence.productionEligible !== false
    || fixture.evidence.expertTruthClaimed !== false
    || fixture.input.calendarInput.calendar !== "gregorian"
    || fixture.input.solarTimeAdjustment !== "none"
    || fixture.ruleSnapshot.profileId !== "iztro.2_5_8.default_heaven"
    || fixture.ruleSnapshot.rules.chartType !== "heaven"
    || engine.adapterId !== "hakimi.ziwei.iztro.node_adapter"
    || engine.adapterVersion !== "0.1.0"
    || engine.upstreamName !== "iztro"
    || engine.upstreamVersion !== "2.5.8"
    || engine.upstreamCommit !== "9d39f1743bf31c2b3c635c9b9556215d9c90ee2c"
    || fixture.receipt.engine.runtime !== "node"
    || fixture.receipt.engine.exitCode !== 0
    || fixture.facts.calendarFacts.gregorianDate !== fixture.input.calendarInput.date) {
    throw new ZiweiFortelDifferentialError(
      "UNSUPPORTED_IZTRO_REFERENCE",
      "Only a digest-verified fixed iztro 2.5.8 default-heaven Gregorian Node fixture can enter this differential"
    );
  }
  return fixture as ZiweiNatalFixtureDraft & {
    input: ZiweiNatalFixtureDraft["input"] & { calendarInput: { calendar: "gregorian"; date: string } };
  };
}

async function requireFreshIztroReference(
  fixtureCandidate: unknown,
  input: FortelDifferentialInput
): Promise<ReturnType<typeof requireFixedIztroReference>> {
  const verified = await verifyZiweiNatalFixtureDraft(fixtureCandidate);
  if (!verified.success) {
    throw new ZiweiFortelDifferentialError(
      "FRESH_IZTRO_FIXTURE_NOT_VERIFIED",
      `The freshly calculated iztro fixture failed its digest gate: ${verified.reason}`
    );
  }
  const fixture = requireFixedIztroReference(verified.data);
  if (fixture.input.calendarInput.date !== input.gregorianDate
    || fixture.input.shichenIndex !== input.shichenIndex
    || fixture.input.sexForCalculation !== input.sexForCalculation
    || fixture.facts.calendarFacts.gregorianDate !== input.gregorianDate) {
    throw new ZiweiFortelDifferentialError(
      "FRESH_IZTRO_INPUT_ECHO_MISMATCH",
      "The freshly calculated iztro fixture did not preserve the requested comparison input"
    );
  }
  return fixture;
}

function requireComparableDifferentialInput(value: unknown): FortelDifferentialInput {
  const input = requireDifferentialInput(value);
  if (input.shichenIndex === 12) {
    throw new ZiweiFortelDifferentialError(
      "UNSUPPORTED_LATE_ZI_POLICY",
      "Late-Zi comparison is disabled until iztro next-day and Fortel same-day semantics are aligned"
    );
  }
  return input;
}

function createFreshIztroInput(input: FortelDifferentialInput): Readonly<Record<string, unknown>> {
  return {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date: input.gregorianDate },
    shichenIndex: input.shichenIndex,
    sexForCalculation: input.sexForCalculation,
    solarTimeAdjustment: "none",
    civilContext: {
      usedForCalculation: false,
      localTime: SHICHEN_LOCAL_TIMES[input.shichenIndex],
      timeZone: "Asia/Shanghai",
      location: {
        precision: "coordinates",
        label: "Shanghai",
        latitude: 31.2304,
        longitude: 121.4737
      }
    },
    birthSourceRef: `differential.fortel.${input.gregorianDate.replaceAll("-", "_")}.${input.shichenIndex}.${input.sexForCalculation}`,
    sourceNote: "Fresh isolated iztro/Fortel engineering differential input; not expert truth."
  };
}

type NamedProjection = Omit<FortelNamedProjection, "engineSpecific" | "unsupportedFieldFamilies">;

function projectIztroNamedFacts(fixture: ZiweiNatalFixtureDraft): NamedProjection {
  const starKeyById = new Map(fixture.ruleSnapshot.rules.starRegistry.entries.map((entry) => [entry.starId, entry.upstreamKey]));
  const roleBranches: Record<string, string> = {};
  const palaceStems: Record<string, string> = {};
  const majorStarBranches: Record<string, string> = {};
  const minorStarBranches: Record<string, string> = {};
  const transformations: Record<string, string> = {};
  for (const palace of fixture.facts.palaces) {
    insertExact(roleBranches, palace.roleId, palace.earthlyBranchId, ROLE_IDS, "iztro palace role");
    insertExact(palaceStems, palace.roleId, palace.heavenlyStemId, ROLE_IDS, "iztro palace stem");
    for (const star of palace.stars) {
      const upstreamKey = starKeyById.get(star.starId);
      if (!upstreamKey) throw new ZiweiFortelDifferentialError("UNMAPPED_IZTRO_STAR", `No frozen iztro key exists for ${star.starId}`);
      if (star.category === "major" && (MAJOR_STAR_KEYS as readonly string[]).includes(upstreamKey)) {
        insertExact(majorStarBranches, upstreamKey, palace.earthlyBranchId, MAJOR_STAR_KEYS, "iztro major star");
      }
      if (star.category === "minor" && (MINOR_STAR_KEYS as readonly string[]).includes(upstreamKey)) {
        insertExact(minorStarBranches, upstreamKey, palace.earthlyBranchId, MINOR_STAR_KEYS, "iztro minor star");
      }
      for (const transformationId of star.transformationIds) {
        insertExact(transformations, transformationId, upstreamKey, TRANSFORMATION_IDS, "iztro transformation");
      }
    }
  }
  requireMapKeys(roleBranches, ROLE_IDS, "iztro roles");
  requireMapKeys(palaceStems, ROLE_IDS, "iztro palace stems");
  requireMapKeys(majorStarBranches, MAJOR_STAR_KEYS, "iztro major stars");
  requireMapKeys(minorStarBranches, MINOR_STAR_KEYS, "iztro minor stars");
  requireMapKeys(transformations, TRANSFORMATION_IDS, "iztro transformations");
  const calendar = fixture.facts.calendarFacts;
  return {
    projectionVersion: "hakimi-ziwei-named-facts/0.1-draft",
    chartType: "heaven",
    input: {
      gregorianDate: calendar.gregorianDate,
      shichenIndex: fixture.input.shichenIndex,
      sexForCalculation: fixture.input.sexForCalculation
    },
    calendar: {
      gregorianDate: calendar.gregorianDate,
      lunarDate: calendar.lunarDate,
      shichenIndex: calendar.shichen.index,
      yearGanzhi: calendar.ganzhi.year,
      monthGanzhi: calendar.ganzhi.month,
      dayGanzhi: calendar.ganzhi.day,
      hourGanzhi: calendar.ganzhi.hour as never
    },
    lifePalaceBranchId: fixture.facts.lifePalaceBranchId,
    bodyPalaceBranchId: fixture.facts.bodyPalaceBranchId,
    fiveElementBureauId: fixture.facts.fiveElementBureauId,
    direction: fixture.facts.directionBasis.resolvedDirection,
    roleBranches,
    palaceStems,
    majorStarBranches,
    minorStarBranches,
    transformations,
    majorPeriods: fixture.facts.majorPeriods.map((period) => ({
      sequence: period.sequence,
      roleId: period.palaceRoleId,
      heavenlyStemId: period.heavenlyStemId,
      earthlyBranchId: period.earthlyBranchId,
      direction: period.direction,
      startAge: period.startAge,
      endAge: period.endAge
    }))
  };
}

function compareNamedFacts(iztro: NamedProjection, fortel: FortelNamedProjection): ZiweiNamedFieldCheck[] {
  const checks: ZiweiNamedFieldCheck[] = [];
  const compare = (checkId: string, family: string, fieldPath: string, left: NamedValue, right: NamedValue) => {
    const same = canonicalJson(left) === canonicalJson(right);
    checks.push({
      checkId,
      family,
      fieldPath,
      status: same ? "match" : "different",
      iztroValue: left,
      fortelValue: right,
      classification: same ? "same_named_fact" : "implementation_difference_no_truth_verdict"
    });
  };
  const unsupported = (checkId: string, family: string, fieldPath: string, left: NamedValue, right: NamedValue) => {
    checks.push({
      checkId,
      family,
      fieldPath,
      status: "unsupported",
      iztroValue: left,
      fortelValue: right,
      classification: "semantics_not_aligned"
    });
  };

  compare("calendar.gregorian", "calendar", "calendar.gregorianDate", iztro.calendar.gregorianDate, fortel.calendar.gregorianDate);
  compare("calendar.lunar", "calendar", "calendar.lunarDate", iztro.calendar.lunarDate, fortel.calendar.lunarDate);
  compare("calendar.shichen", "calendar", "calendar.shichenIndex", iztro.calendar.shichenIndex, fortel.calendar.shichenIndex);
  compare("ganzhi.year", "ganzhi", "calendar.yearGanzhi", iztro.calendar.yearGanzhi, fortel.calendar.yearGanzhi);
  unsupported("ganzhi.month", "ganzhi", "calendar.monthGanzhi", iztro.calendar.monthGanzhi, fortel.calendar.monthGanzhi);
  compare("ganzhi.day", "ganzhi", "calendar.dayGanzhi", iztro.calendar.dayGanzhi, fortel.calendar.dayGanzhi);
  unsupported("ganzhi.hour", "ganzhi", "calendar.hourGanzhi", iztro.calendar.hourGanzhi as unknown as string, null);
  compare("palace.life", "palace", "lifePalaceBranchId", iztro.lifePalaceBranchId, fortel.lifePalaceBranchId);
  compare("palace.body", "palace", "bodyPalaceBranchId", iztro.bodyPalaceBranchId, fortel.bodyPalaceBranchId);
  compare("bureau", "bureau", "fiveElementBureauId", iztro.fiveElementBureauId, fortel.fiveElementBureauId);
  compare("direction", "major_period", "direction", iztro.direction, fortel.direction);

  for (const roleId of ROLE_IDS) {
    compare(`palace.role.${roleId}`, "palace", `roleBranches.${roleId}`, iztro.roleBranches[roleId], fortel.roleBranches[roleId]);
    compare(`palace.stem.${roleId}`, "palace", `palaceStems.${roleId}`, iztro.palaceStems[roleId], fortel.palaceStems[roleId]);
  }
  for (const starKey of MAJOR_STAR_KEYS) {
    compare(`star.major.${starKey}`, "major_star", `majorStarBranches.${starKey}`, iztro.majorStarBranches[starKey], fortel.majorStarBranches[starKey]);
  }
  for (const starKey of MINOR_STAR_KEYS) {
    compare(`star.minor.${starKey}`, "minor_star", `minorStarBranches.${starKey}`, iztro.minorStarBranches[starKey], fortel.minorStarBranches[starKey]);
  }
  for (const transformationId of TRANSFORMATION_IDS) {
    compare(`transformation.${transformationId}`, "transformation", `transformations.${transformationId}`, iztro.transformations[transformationId], fortel.transformations[transformationId]);
  }
  for (let index = 0; index < 12; index += 1) {
    compare(
      `major_period.${index + 1}`,
      "major_period",
      `majorPeriods.${index}`,
      iztro.majorPeriods[index] as unknown as Readonly<Record<string, JsonScalar>>,
      fortel.majorPeriods[index] as unknown as Readonly<Record<string, JsonScalar>>
    );
  }
  for (const family of ["brightness_scale", "auxiliary_star_inventory", "borrowed_palace_ratios", "runtime_transits", "interpretation"] as const) {
    unsupported(`unsupported.${family}`, "unsupported", family, "present_in_iztro_or_engine_specific", null);
  }
  return checks;
}

function summarizeChecks(checks: readonly ZiweiNamedFieldCheck[]): ZiweiFortelDifferentialReport["summary"] {
  return {
    matchCount: checks.filter((check) => check.status === "match").length,
    differenceCount: checks.filter((check) => check.status === "different").length,
    unsupportedCount: checks.filter((check) => check.status === "unsupported").length,
    totalChecks: checks.length,
    aggregateScore: null,
    verdict: "no_truth_verdict"
  };
}

async function verifyAndCalculateLocks(): Promise<Readonly<{
  dependencyGraphSha256: string;
  adapterSourceSha256: string;
  workerEntrySha256: string;
}>> {
  const packageLockText = readFileSync(WORKSPACE_PACKAGE_LOCK_URL, "utf8");
  const rootManifestText = readFileSync(WORKSPACE_PACKAGE_MANIFEST_URL, "utf8");
  const adapterBytes = readFileSync(ADAPTER_SOURCE_URL);
  const workerBytes = readFileSync(WORKER_ENTRY_URL);
  const packageLock = JSON.parse(packageLockText) as unknown;
  const rootManifest = JSON.parse(rootManifestText) as unknown;
  verifyWorkspaceLock(packageLock, rootManifest, FROZEN_LOCK_CLOSURE);
  return {
    dependencyGraphSha256: await sha256ZiweiCanonicalJson(FROZEN_LOCK_CLOSURE),
    adapterSourceSha256: createHash("sha256").update(adapterBytes).digest("hex"),
    workerEntrySha256: createHash("sha256").update(workerBytes).digest("hex")
  };
}

function verifyWorkspaceLock(lockCandidate: unknown, manifestCandidate: unknown, closure: LockClosure): void {
  const lock = requireRecord(lockCandidate, "package-lock.json");
  const packages = requireRecord(lock.packages, "package-lock packages");
  const manifest = requireRecord(manifestCandidate, "root package manifest");
  const overrides = requireRecord(manifest.overrides, "root overrides");
  if (lock.lockfileVersion !== closure.lockfileVersion) lockMismatch("lockfile version");
  for (const [name, version] of Object.entries(closure.rootOverrides)) {
    if (overrides[name] !== version) lockMismatch(`root override ${name}`);
  }
  const entryLock = requireRecord(packages[closure.entryPackage.packagePath], "Fortel workspace lock entry");
  if (entryLock.name !== closure.entryPackage.name || entryLock.version !== closure.entryPackage.version) lockMismatch("workspace entry identity");
  const nodeByPath = new Map(closure.nodes.map((node) => [node.packagePath, node]));
  for (const node of closure.nodes) {
    const locked = requireRecord(packages[node.packagePath], `lock node ${node.packagePath}`);
    if (locked.version !== node.version || locked.resolved !== node.resolved || locked.integrity !== node.integrity) {
      lockMismatch(`version/resolved/integrity for ${node.packagePath}`);
    }
    const requested = requireOptionalRecord(locked.dependencies);
    if (canonicalJson(requested) !== canonicalJson(Object.fromEntries(node.dependencies.map((edge) => [edge.name, edge.requested])))) {
      lockMismatch(`requested edges for ${node.packagePath}`);
    }
    for (const edge of node.dependencies) verifyLockEdge(packages, nodeByPath, node.packagePath, requested, edge);
  }
  const entryRequested = requireOptionalRecord(entryLock.dependencies);
  for (const edge of closure.entryPackage.dependencies) verifyLockEdge(packages, nodeByPath, closure.entryPackage.packagePath, entryRequested, edge);
  const fortelNode = nodeByPath.get("node_modules/fortel-ziweidoushu");
  if (!fortelNode || fortelNode.version !== FORTEL_UPSTREAM_VERSION || fortelNode.integrity !== FORTEL_NPM_INTEGRITY) {
    lockMismatch("Fortel registry anchor");
  }
}

function verifyLockEdge(
  packages: Record<string, unknown>,
  nodeByPath: ReadonlyMap<string, LockNode>,
  fromPath: string,
  requested: Record<string, unknown>,
  edge: LockEdge
): void {
  const target = nodeByPath.get(edge.resolvedPackagePath);
  if (requested[edge.name] !== edge.requested
    || !target
    || target.name !== edge.name
    || target.version !== edge.resolvedVersion
    || resolveLockDependencyPath(packages, fromPath, edge.name) !== edge.resolvedPackagePath) {
    lockMismatch(`${fromPath} -> ${edge.name}`);
  }
}

function resolveLockDependencyPath(packages: Record<string, unknown>, fromPath: string, dependencyName: string): string | null {
  let cursor = fromPath;
  while (true) {
    const candidate = cursor ? `${cursor}/node_modules/${dependencyName}` : `node_modules/${dependencyName}`;
    if (Object.hasOwn(packages, candidate)) return candidate;
    if (!cursor) return null;
    const separator = cursor.lastIndexOf("/");
    cursor = separator < 0 ? "" : cursor.slice(0, separator);
  }
}

function lockMismatch(field: string): never {
  throw new ZiweiFortelDifferentialError("DEPENDENCY_LOCK_MISMATCH", `Fortel package-lock closure mismatch: ${field}`);
}

async function runFreshWorker(request: unknown, options: FortelDifferentialOptions): Promise<WorkerSuccess> {
  if (options.signal?.aborted) throw abortError();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new ZiweiFortelDifferentialError("INVALID_TIMEOUT", "Fortel Worker timeout must be an integer from 1 to 60000 milliseconds");
  }
  return new Promise((resolve, reject) => {
    const worker = new NodeWorker(WORKER_ENTRY_URL, {
      workerData: request,
      execArgv: [],
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 }
    });
    const messages: unknown[] = [];
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      callback();
    };
    const fail = (error: unknown) => finish(() => reject(error));
    const timer = setTimeout(() => {
      void worker.terminate();
      fail(new ZiweiFortelDifferentialError("WORKER_TIMEOUT", "Fortel fresh Worker exceeded its deadline"));
    }, timeoutMs);
    const onAbort = () => {
      void worker.terminate();
      fail(abortError());
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    // Close the read/register race for AbortSignal implementations that can
    // switch state between the initial guard and listener registration.
    if (options.signal?.aborted) {
      onAbort();
      return;
    }
    worker.on("message", (message) => {
      messages.push(message);
      if (messages.length > 1) {
        void worker.terminate();
        fail(new ZiweiFortelDifferentialError("MULTIPLE_WORKER_MESSAGES", "Fortel Worker emitted more than one terminal message"));
      }
    });
    worker.once("error", (error) => fail(new ZiweiFortelDifferentialError(
      "WORKER_ERROR",
      error instanceof Error ? error.message : String(error),
      { cause: error }
    )));
    worker.once("exit", (code) => {
      if (settled) return;
      try {
        if (code !== 0) throw new ZiweiFortelDifferentialError("WORKER_EXIT_NONZERO", `Fortel Worker exited with code ${code}`);
        if (messages.length !== 1) throw new ZiweiFortelDifferentialError("WORKER_MESSAGE_MISSING", "Fortel Worker did not emit exactly one terminal message");
        const response = requireWorkerResponse(messages[0], request);
        if (!response.ok) throw new ZiweiFortelDifferentialError(response.error.code, response.error.message);
        finish(() => resolve(response));
      } catch (error) {
        fail(error);
      }
    });
  });
}

function requireWorkerResponse(value: unknown, requestCandidate: unknown): WorkerSuccess | WorkerFailure {
  const request = requireRecord(requestCandidate, "worker request");
  const response = requireRecord(value, "worker response");
  const commonValid = response.protocolVersion === FORTEL_WORKER_PROTOCOL_VERSION
    && response.requestId === request.requestId
    && isUuid(response.workerInstanceId)
    && isIsoInstant(response.startedAt)
    && isIsoInstant(response.completedAt)
    && String(response.completedAt) >= String(response.startedAt)
    && typeof response.runtimeVersion === "string"
    && response.upstreamVersion === FORTEL_UPSTREAM_VERSION;
  if (!commonValid) throw new ZiweiFortelDifferentialError("INVALID_WORKER_RESPONSE", "Fortel Worker response identity is invalid");
  if (response.ok === true && hasExactKeys(response, [
    "completedAt", "ok", "protocolVersion", "requestId", "result", "runtimeVersion", "startedAt", "upstreamVersion", "workerInstanceId"
  ])) return response as unknown as WorkerSuccess;
  if (response.ok === false && hasExactKeys(response, [
    "completedAt", "error", "ok", "protocolVersion", "requestId", "runtimeVersion", "startedAt", "upstreamVersion", "workerInstanceId"
  ])) {
    const error = requireRecord(response.error, "worker failure");
    if (typeof error.code === "string" && typeof error.message === "string" && hasExactKeys(error, ["code", "message"])) {
      return response as unknown as WorkerFailure;
    }
  }
  throw new ZiweiFortelDifferentialError("INVALID_WORKER_RESPONSE", "Fortel Worker terminal envelope is malformed");
}

function requireDifferentialInput(value: unknown): FortelDifferentialInput {
  const input = requireRecord(value, "Fortel differential input");
  if (!hasExactKeys(input, ["gregorianDate", "sexForCalculation", "shichenIndex"])
    || typeof input.gregorianDate !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/u.test(input.gregorianDate)
    || !Number.isInteger(input.shichenIndex)
    || (input.shichenIndex as number) < 0
    || (input.shichenIndex as number) > 12
    || (input.sexForCalculation !== "male" && input.sexForCalculation !== "female")) {
    throw new ZiweiFortelDifferentialError("INVALID_INPUT", "Fortel differential input is invalid");
  }
  const [year, month, day] = input.gregorianDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day
    || input.gregorianDate < "1900-01-31" || input.gregorianDate > "2100-12-31") {
    throw new ZiweiFortelDifferentialError("INPUT_OUTSIDE_VERIFIED_RANGE", "Fortel differential date is invalid or outside 1900-01-31 through 2100-12-31");
  }
  return input as unknown as FortelDifferentialInput;
}

function requireProjection(value: unknown, input: FortelDifferentialInput): FortelNamedProjection {
  const projection = requireRecord(value, "Fortel projection");
  if (!hasExactKeys(projection, [
    "bodyPalaceBranchId", "calendar", "chartType", "direction", "engineSpecific", "fiveElementBureauId", "input",
    "lifePalaceBranchId", "majorPeriods", "majorStarBranches", "minorStarBranches", "palaceStems", "projectionVersion",
    "roleBranches", "transformations", "unsupportedFieldFamilies"
  ]) || projection.projectionVersion !== "hakimi-ziwei-named-facts/0.1-draft" || projection.chartType !== "heaven"
    || canonicalJson(projection.input) !== canonicalJson(input)) {
    throw new ZiweiFortelDifferentialError("INVALID_FORTEL_PROJECTION", "Fortel projection envelope is invalid");
  }
  requireStringMap(projection.roleBranches, ROLE_IDS, BRANCH_IDS, "role branches");
  requireStringMap(projection.palaceStems, ROLE_IDS, STEM_IDS, "palace stems");
  requireStringMap(projection.majorStarBranches, MAJOR_STAR_KEYS, BRANCH_IDS, "major stars");
  requireStringMap(projection.minorStarBranches, MINOR_STAR_KEYS, BRANCH_IDS, "minor stars");
  requireStringMap(projection.transformations, TRANSFORMATION_IDS, [...MAJOR_STAR_KEYS, ...MINOR_STAR_KEYS], "transformations");
  const calendar = requireRecord(projection.calendar, "Fortel calendar projection");
  const engineSpecific = requireRecord(projection.engineSpecific, "Fortel engine-specific projection");
  const lunarDate = requireRecord(calendar.lunarDate, "Fortel lunar date");
  const roleBranches = requireRecord(projection.roleBranches, "Fortel role branches");
  const palaceStems = requireRecord(projection.palaceStems, "Fortel palace stems");
  if (!hasExactKeys(calendar, [
    "dayGanzhi", "gregorianDate", "hourGanzhi", "lunarDate", "monthGanzhi", "shichenIndex", "yearGanzhi"
  ]) || !hasExactKeys(lunarDate, ["day", "isLeapMonth", "month", "year"])
    || calendar.gregorianDate !== input.gregorianDate || calendar.shichenIndex !== input.shichenIndex
    || !Number.isInteger(lunarDate.year) || !Number.isInteger(lunarDate.month) || !Number.isInteger(lunarDate.day)
    || (lunarDate.month as number) < 1 || (lunarDate.month as number) > 12
    || (lunarDate.day as number) < 1 || (lunarDate.day as number) > 30
    || typeof lunarDate.isLeapMonth !== "boolean"
    || !isGanzhiId(calendar.yearGanzhi) || !isGanzhiId(calendar.monthGanzhi) || !isGanzhiId(calendar.dayGanzhi)
    || calendar.hourGanzhi !== null
    || !hasExactKeys(engineSpecific, ["chartType", "lateZiDayPolicy", "librarySchoolClaim", "monthGanzhiSemantics"])
    || engineSpecific.chartType !== "SKY" || engineSpecific.librarySchoolClaim !== "zhongzhou"
    || engineSpecific.lateZiDayPolicy !== "same_civil_day"
    || engineSpecific.monthGanzhiSemantics !== "fortel_bundled_calendar_solar_term_month"
    || !BRANCH_IDS.includes(projection.lifePalaceBranchId as typeof BRANCH_IDS[number])
    || !BRANCH_IDS.includes(projection.bodyPalaceBranchId as typeof BRANCH_IDS[number])
    || roleBranches.life !== projection.lifePalaceBranchId
    || !["water_2", "wood_3", "metal_4", "earth_5", "fire_6"].includes(String(projection.fiveElementBureauId))
    || (projection.direction !== "forward" && projection.direction !== "backward")
    || !Array.isArray(projection.unsupportedFieldFamilies)
    || canonicalJson(projection.unsupportedFieldFamilies) !== canonicalJson([
      "hour_ganzhi", "brightness_scale", "auxiliary_star_inventory", "borrowed_palace_ratios", "runtime_transits", "interpretation"
    ])) {
    throw new ZiweiFortelDifferentialError("INVALID_FORTEL_PROJECTION", "Fortel projection identity or input echo is invalid");
  }
  if (!Array.isArray(projection.majorPeriods) || projection.majorPeriods.length !== 12) {
    throw new ZiweiFortelDifferentialError("INVALID_FORTEL_PROJECTION", "Fortel projection must contain twelve major periods");
  }
  const seenRoles = new Set<string>();
  const firstAgeByBureau: Record<string, number> = { water_2: 2, wood_3: 3, metal_4: 4, earth_5: 5, fire_6: 6 };
  for (let index = 0; index < projection.majorPeriods.length; index += 1) {
    const period = requireRecord(projection.majorPeriods[index], `Fortel major period ${index + 1}`);
    if (!hasExactKeys(period, ["direction", "earthlyBranchId", "endAge", "heavenlyStemId", "roleId", "sequence", "startAge"])
      || period.sequence !== index + 1
      || typeof period.roleId !== "string" || !ROLE_IDS.includes(period.roleId as typeof ROLE_IDS[number])
      || seenRoles.has(period.roleId)
      || period.direction !== projection.direction
      || period.earthlyBranchId !== roleBranches[period.roleId]
      || period.heavenlyStemId !== palaceStems[period.roleId]
      || !Number.isInteger(period.startAge) || !Number.isInteger(period.endAge)
      || period.endAge !== (period.startAge as number) + 9
      || (index === 0 && (period.roleId !== "life" || period.startAge !== firstAgeByBureau[String(projection.fiveElementBureauId)]))
      || (index > 0 && period.startAge !== (projection.majorPeriods[index - 1] as { endAge: number }).endAge + 1)) {
      throw new ZiweiFortelDifferentialError("INVALID_FORTEL_PROJECTION", `Fortel major period ${index + 1} is invalid`);
    }
    seenRoles.add(period.roleId);
  }
  return projection as unknown as FortelNamedProjection;
}

function requireReport(value: unknown): ZiweiFortelDifferentialReport {
  const report = requireRecord(value, "Fortel differential report");
  if (!hasExactKeys(report, [
    "checks", "createdAt", "expertTruthClaimed", "format", "fortelReference", "input", "iztroReference", "mode",
    "productionEligible", "reportId", "reportSha256", "summary", "systemId", "warnings"
  ]) || report.format !== FORTEL_DIFFERENTIAL_REPORT_FORMAT || report.systemId !== "ziwei-doushu"
    || report.mode !== "differential_diagnostic" || report.productionEligible !== false || report.expertTruthClaimed !== false
    || !isUuid(report.reportId) || !isIsoInstant(report.createdAt)
    || typeof report.reportSha256 !== "string" || !/^[0-9a-f]{64}$/u.test(report.reportSha256)
    || !Array.isArray(report.checks) || !Array.isArray(report.warnings)
    || canonicalJson(report.warnings) !== canonicalJson(REPORT_WARNINGS)) {
    throw new ZiweiFortelDifferentialError("INVALID_DIFFERENTIAL_REPORT", "Fortel differential report envelope is invalid");
  }
  const input = requireDifferentialInput(report.input);
  const iztroReference = requireRecord(report.iztroReference, "iztro report reference");
  const fortelReference = requireRecord(report.fortelReference, "Fortel report reference");
  if (!hasExactKeys(iztroReference, ["adapterId", "artifactSha256", "factsSha256", "inputSha256", "profileId", "upstreamVersion"])
    || iztroReference.adapterId !== "hakimi.ziwei.iztro.node_adapter"
    || iztroReference.upstreamVersion !== "2.5.8"
    || iztroReference.profileId !== "iztro.2_5_8.default_heaven"
    || ![iztroReference.artifactSha256, iztroReference.factsSha256, iztroReference.inputSha256].every(isSha256)
    || !hasExactKeys(fortelReference, [
      "adapterSourceSha256", "completedAt", "dependencyGraphSha256", "differentialId", "differentialVersion", "exitCode",
      "isolation", "projectionSha256", "proofScope", "requestId", "runtime", "runtimeVersion", "startedAt", "upstreamGitHead",
      "upstreamName", "upstreamNpmIntegrity", "upstreamVersion", "workerEntrySha256", "workerInstanceId", "workerProtocolVersion"
    ])
    || fortelReference.differentialId !== ZIWEI_FORTEL_DIFFERENTIAL_ID
    || fortelReference.differentialVersion !== ZIWEI_FORTEL_DIFFERENTIAL_VERSION
    || fortelReference.upstreamName !== "fortel-ziweidoushu"
    || fortelReference.upstreamVersion !== FORTEL_UPSTREAM_VERSION
    || fortelReference.upstreamGitHead !== FORTEL_UPSTREAM_GIT_HEAD
    || fortelReference.upstreamNpmIntegrity !== FORTEL_NPM_INTEGRITY
    || fortelReference.workerProtocolVersion !== FORTEL_WORKER_PROTOCOL_VERSION
    || fortelReference.isolation !== "fresh_worker_per_calculation"
    || fortelReference.proofScope !== "package_lock_closure_identity_not_installed_bytes"
    || fortelReference.runtime !== "node" || fortelReference.exitCode !== 0
    || !isUuid(fortelReference.requestId) || !isUuid(fortelReference.workerInstanceId)
    || !isIsoInstant(fortelReference.startedAt) || !isIsoInstant(fortelReference.completedAt)
    || report.createdAt !== fortelReference.completedAt
    || ![fortelReference.adapterSourceSha256, fortelReference.dependencyGraphSha256,
      fortelReference.projectionSha256, fortelReference.workerEntrySha256].every(isSha256)) {
    throw new ZiweiFortelDifferentialError("INVALID_DIFFERENTIAL_REPORT", "Fortel differential report reference identity is invalid");
  }
  if (canonicalJson(input) !== canonicalJson(report.input)
    || canonicalJson(report.checks.map((check) => isPlainRecord(check) ? check.checkId : null)) !== canonicalJson(EXPECTED_CHECK_IDS)) {
    throw new ZiweiFortelDifferentialError("INVALID_DIFFERENTIAL_REPORT", "Fortel differential report check set or input is invalid");
  }
  for (let index = 0; index < report.checks.length; index += 1) {
    const check = requireRecord(report.checks[index], `Fortel report check ${index + 1}`);
    const expectedId = EXPECTED_CHECK_IDS[index];
    const expectedDefinition = CHECK_DEFINITION_BY_ID.get(expectedId);
    if (!expectedDefinition) {
      throw new ZiweiFortelDifferentialError("INVALID_DIFFERENTIAL_REPORT", `Missing internal check definition ${expectedId}`);
    }
    const unsupported = (UNSUPPORTED_CHECK_IDS as readonly string[]).includes(expectedId);
    const same = isNamedValue(check.iztroValue) && isNamedValue(check.fortelValue)
      ? canonicalJson(check.iztroValue) === canonicalJson(check.fortelValue)
      : null;
    if (!hasExactKeys(check, ["checkId", "classification", "family", "fieldPath", "fortelValue", "iztroValue", "status"])
      || check.checkId !== expectedId
      || check.family !== expectedDefinition.family
      || check.fieldPath !== expectedDefinition.fieldPath
      || !isNamedValue(check.iztroValue) || !isNamedValue(check.fortelValue)
      || (unsupported && (check.status !== "unsupported" || check.classification !== "semantics_not_aligned"))
      || (!unsupported && same === true && (check.status !== "match" || check.classification !== "same_named_fact"))
      || (!unsupported && same === false && (check.status !== "different" || check.classification !== "implementation_difference_no_truth_verdict"))) {
      throw new ZiweiFortelDifferentialError("INVALID_DIFFERENTIAL_REPORT", `Fortel report check ${expectedId} is invalid`);
    }
  }
  const summary = requireRecord(report.summary, "Fortel report summary");
  const computed = summarizeChecks(report.checks as ZiweiNamedFieldCheck[]);
  if (canonicalJson(summary) !== canonicalJson(computed)) {
    throw new ZiweiFortelDifferentialError("INVALID_DIFFERENTIAL_REPORT", "Fortel report summary does not match its field checks");
  }
  return report as unknown as ZiweiFortelDifferentialReport;
}

function requireLockClosure(value: unknown): LockClosure {
  const closure = requireRecord(value, "Fortel lock closure");
  if (closure.schemaVersion !== 1 || closure.proofScope !== "package_lock_closure_identity_not_installed_bytes"
    || closure.lockfileVersion !== 3 || !Array.isArray(closure.nodes)) {
    throw new ZiweiFortelDifferentialError("INVALID_LOCK_CLOSURE", "Fortel lock closure envelope is invalid");
  }
  return closure as unknown as LockClosure;
}

function requireStringMap(value: unknown, keys: readonly string[], values: readonly string[], label: string): void {
  const map = requireRecord(value, label);
  requireMapKeys(map as Record<string, string>, keys, label);
  if (Object.values(map).some((entry) => typeof entry !== "string" || !values.includes(entry))) {
    throw new ZiweiFortelDifferentialError("INVALID_FORTEL_PROJECTION", `Fortel ${label} contain an unknown value`);
  }
}

function insertExact(
  target: Record<string, string>,
  key: string,
  value: string,
  allowedKeys: readonly string[],
  label: string
): void {
  if (!allowedKeys.includes(key) || Object.hasOwn(target, key)) {
    throw new ZiweiFortelDifferentialError("INVALID_IZTRO_PROJECTION", `Unknown or duplicate ${label}: ${key}`);
  }
  target[key] = value;
}

function requireMapKeys(value: Record<string, string>, expected: readonly string[], label: string): void {
  if (canonicalJson(Object.keys(value).sort()) !== canonicalJson([...expected].sort())) {
    throw new ZiweiFortelDifferentialError("NAMED_FIELD_SET_MISMATCH", `${label} do not match the fixed named-field registry`);
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ZiweiFortelDifferentialError("INVALID_STRUCTURE", `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireOptionalRecord(value: unknown): Record<string, unknown> {
  return value === undefined ? {} : requireRecord(value, "dependency map");
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function isSha256(value: unknown): boolean {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function isUuid(value: unknown): boolean {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isIsoInstant(value: unknown): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
    && !Number.isNaN(Date.parse(value));
}

function isGanzhiId(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const [stemId, branchId, extra] = value.split("_");
  return extra === undefined
    && STEM_IDS.includes(stemId as typeof STEM_IDS[number])
    && BRANCH_IDS.includes(branchId as typeof BRANCH_IDS[number]);
}

function isNamedValue(value: unknown): value is NamedValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return isPlainRecord(value) && Object.values(value).every((entry) =>
    entry === null || typeof entry === "string" || typeof entry === "boolean"
      || (typeof entry === "number" && Number.isFinite(entry))
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function abortError(): ZiweiFortelDifferentialError {
  return new ZiweiFortelDifferentialError("ABORTED", "Fortel differential was aborted");
}
