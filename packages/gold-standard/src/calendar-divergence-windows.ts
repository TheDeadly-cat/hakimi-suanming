import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { z } from "zod";

import rawFixture from "../fixtures/calendar-divergence-windows.v1.json";

export const CALENDAR_DIVERGENCE_WINDOWS_FORMAT = "hakimi-calendar-divergence-windows" as const;
export const CALENDAR_DIVERGENCE_WINDOWS_VERSION = "1.0.0" as const;
export const CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID = "hakimi-p0-03-calendar-divergence-windows-v1" as const;
export const CALENDAR_DIVERGENCE_WINDOWS_EXPECTED_DIGEST =
  "52ab3d6af80ff086cb1db8b32bf1c14a8ff23f35602faedea48623804f50f931" as const;
export const CALENDAR_DIVERGENCE_DIAGNOSTIC_CLASSIFICATION = "engineering_diagnostic_only" as const;
export const CALENDAR_DIVERGENCE_PARENT_REPORT_DIGEST =
  "fbb761568b71178138c460b5ecdfc2b634690efe58d4349defff3d7117ab3130" as const;
export const CALENDAR_DIVERGENCE_PARENT_PLAN_DIGEST =
  "f31e467691d45e2dd8795b41a8b67d2c4771fdf71482b06917ed4b2e90089f06" as const;
export const CALENDAR_DIVERGENCE_ASTRONOMY_EVENTS_DIGEST =
  "f8fd870a8da3a171b3d14060ae2f6c01a3ef4de220e9fbd3435b348353d37804" as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const GREGORIAN_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LUNAR_DATE_PATTERN = /^(?:2089|2097)-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|30)$/;
const CASE_ID_PATTERN = /^calendar-window-(?:2089|2097)-\d{2}-\d{2}$/;
const TRIGGER_CASE_ID_PATTERN = /^p003-\d{5}$/;

const gregorianDateSchema = z.string().regex(GREGORIAN_DATE_PATTERN).superRefine((value, context) => {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    context.addIssue({ code: "custom", message: "公历日期必须是真实存在的规范 YYYY-MM-DD" });
  }
});

const lunarDateSchema = z.string().regex(LUNAR_DATE_PATTERN);
const sha256Schema = z.string().regex(SHA256_PATTERN);
const httpsUrlSchema = z.string().url().superRefine((value, context) => {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return;
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
    context.addIssue({ code: "custom", message: "来源只接受无凭据 HTTPS URL" });
  }
});

const sourceArtifactSchema = z.strictObject({
  label: z.string().trim().min(1).max(120),
  sha256: sha256Schema,
  sourceRef: httpsUrlSchema
});

export const calendarDivergenceSourceSnapshotSchema = z.strictObject({
  sourceId: z.enum([
    "hko-calendar-2089-tc",
    "hko-calendar-2097-tc",
    "current-adapter-lunar-typescript-1-8-6",
    "icu-chinese-calendar-78-3",
    "dotnet-framework-4-8-chinese-lunisolar",
    "usno-moon-phases-2089",
    "usno-moon-phases-2097"
  ]),
  role: z.enum(["authoritative", "current_adapter", "crosscheck", "astronomical_reference"]),
  sourceType: z.enum(["official_calendar", "software_implementation", "government_astronomy_api"]),
  title: z.string().trim().min(1).max(300),
  version: z.string().trim().min(1).max(300),
  sourceRef: httpsUrlSchema,
  artifacts: z.array(sourceArtifactSchema).min(1).max(3),
  runtime: z.string().trim().min(1).max(1_000),
  method: z.string().trim().min(1).max(2_000),
  note: z.string().trim().min(1).max(2_000)
});

export const calendarDivergenceObservationSchema = z.strictObject({
  lunarDate: lunarDateSchema,
  lunarLeapMonth: z.boolean()
});

const fourWayObservationsSchema = z.strictObject({
  hko: calendarDivergenceObservationSchema,
  currentAdapter: calendarDivergenceObservationSchema,
  icu: calendarDivergenceObservationSchema,
  dotnet: calendarDivergenceObservationSchema
});

export const calendarDivergenceWindowCaseSchema = z.strictObject({
  caseId: z.string().regex(CASE_ID_PATTERN),
  ordinal: z.number().int().min(0).max(31),
  gregorianDate: gregorianDateSchema,
  role: z.enum(["control", "divergence"]),
  observations: fourWayObservationsSchema,
  differenceClass: z.enum([
    "all_sources_match_control",
    "dotnet_adjacent_month_length_offset"
  ]),
  triggerCaseIds: z.array(z.string().regex(TRIGGER_CASE_ID_PATTERN)).max(7)
});

const rootCauseAssessmentSchema = z.strictObject({
  classification: z.literal("near_local_midnight_new_moon_table_boundary"),
  resolutionStatus: z.literal("unresolved"),
  usnoSourceId: z.enum(["usno-moon-phases-2089", "usno-moon-phases-2097"]),
  newMoonUtc: z.string().datetime(),
  fixedPlus08Local: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+08:00$/),
  distanceFromLocalMidnightMinutes: z.literal(1),
  favors: z.enum(["hko_current_icu", "dotnet"]),
  normalizedEventEnvelopeDigest: z.literal(CALENDAR_DIVERGENCE_ASTRONOMY_EVENTS_DIGEST),
  authorityCaveat: z.string().trim().min(1).max(1_000)
});

export const calendarDivergenceWindowSchema = z.strictObject({
  windowId: z.enum([
    "calendar-divergence-2089-month-08",
    "calendar-divergence-2097-month-07"
  ]),
  hkoSourceId: z.enum(["hko-calendar-2089-tc", "hko-calendar-2097-tc"]),
  startDate: gregorianDateSchema,
  endDate: gregorianDateSchema,
  expectedCaseCount: z.literal(32),
  expectedDivergenceCount: z.literal(30),
  expectedControlCount: z.literal(2),
  triggerCaseIds: z.array(z.string().regex(TRIGGER_CASE_ID_PATTERN)).min(3).max(4),
  rootCauseAssessment: rootCauseAssessmentSchema,
  cases: z.array(calendarDivergenceWindowCaseSchema).length(32)
});

export const calendarDivergenceTriggerSchema = z.strictObject({
  caseId: z.string().regex(TRIGGER_CASE_ID_PATTERN),
  inputDigest: sha256Schema,
  gregorianDate: gregorianDateSchema,
  windowId: z.enum([
    "calendar-divergence-2089-month-08",
    "calendar-divergence-2097-month-07"
  ])
});

export const CALENDAR_DIVERGENCE_TRIGGER_EXPECTATIONS = Object.freeze([
  {
    caseId: "p003-18374",
    inputDigest: "40e9b7d70b279c630df82c12cfa37ec856c00024dd0041976c062c4e82eb176d",
    gregorianDate: "2089-09-09",
    windowId: "calendar-divergence-2089-month-08"
  },
  {
    caseId: "p003-18189",
    inputDigest: "2abdc9c4640e67951272a642994a61eea5416b8bcd0aa9e1bce2b8c23ea2dde7",
    gregorianDate: "2089-09-12",
    windowId: "calendar-divergence-2089-month-08"
  },
  {
    caseId: "p003-18152",
    inputDigest: "f688837e2078a49a73f550431afc42a3479f385f8d972cefb04aca79b3b36699",
    gregorianDate: "2089-09-22",
    windowId: "calendar-divergence-2089-month-08"
  },
  {
    caseId: "p003-18614",
    inputDigest: "05e9543c6b51b9fa31a09e49f0aa8f86e6e4a5f7205ef0df399da5dba708c9d0",
    gregorianDate: "2097-08-24",
    windowId: "calendar-divergence-2097-month-07"
  },
  {
    caseId: "p003-18709",
    inputDigest: "c1a0e3144c1a3716e0e58c2af36efd9e1b46e79bf1c29e53dfe3424d77ac4817",
    gregorianDate: "2097-08-30",
    windowId: "calendar-divergence-2097-month-07"
  },
  {
    caseId: "p003-18569",
    inputDigest: "877beba4978dd07778879e54d05d2bd251509d01668bb0eb7735be796183a199",
    gregorianDate: "2097-09-04",
    windowId: "calendar-divergence-2097-month-07"
  },
  {
    caseId: "p003-18221",
    inputDigest: "c620acbcb6cce20b6d157eac20d5f745d742a095798577573e0dbe08470b2212",
    gregorianDate: "2097-09-05",
    windowId: "calendar-divergence-2097-month-07"
  }
] as const);

const EXPECTED_WINDOWS = Object.freeze({
  "calendar-divergence-2089-month-08": {
    startDate: "2089-09-03",
    endDate: "2089-10-04",
    hkoSourceId: "hko-calendar-2089-tc",
    triggerCaseIds: ["p003-18374", "p003-18189", "p003-18152"],
    rootCauseAssessment: {
      classification: "near_local_midnight_new_moon_table_boundary",
      resolutionStatus: "unresolved",
      usnoSourceId: "usno-moon-phases-2089",
      newMoonUtc: "2089-09-04T15:59:00.000Z",
      fixedPlus08Local: "2089-09-04T23:59:00+08:00",
      distanceFromLocalMidnightMinutes: 1,
      favors: "hko_current_icu",
      normalizedEventEnvelopeDigest: CALENDAR_DIVERGENCE_ASTRONOMY_EVENTS_DIGEST
    }
  },
  "calendar-divergence-2097-month-07": {
    startDate: "2097-08-06",
    endDate: "2097-09-06",
    hkoSourceId: "hko-calendar-2097-tc",
    triggerCaseIds: ["p003-18614", "p003-18709", "p003-18569", "p003-18221"],
    rootCauseAssessment: {
      classification: "near_local_midnight_new_moon_table_boundary",
      resolutionStatus: "unresolved",
      usnoSourceId: "usno-moon-phases-2097",
      newMoonUtc: "2097-08-07T16:01:00.000Z",
      fixedPlus08Local: "2097-08-08T00:01:00+08:00",
      distanceFromLocalMidnightMinutes: 1,
      favors: "dotnet",
      normalizedEventEnvelopeDigest: CALENDAR_DIVERGENCE_ASTRONOMY_EVENTS_DIGEST
    }
  }
} as const);

const EXPECTED_SOURCE_SNAPSHOTS = Object.freeze({
  "hko-calendar-2089-tc": {
    role: "authoritative",
    sourceType: "official_calendar",
    sourceRef: "https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2089c.txt",
    artifactSourceRefs: ["https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2089c.txt"],
    artifactDigests: ["66fc0e954fe9f0e16ee26e43eca3cef7c5e6e4cf224b912277638ec28680c9fe"]
  },
  "hko-calendar-2097-tc": {
    role: "authoritative",
    sourceType: "official_calendar",
    sourceRef: "https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2097c.txt",
    artifactSourceRefs: ["https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2097c.txt"],
    artifactDigests: ["7705d23609e37937dff638fb8f78e09edc19a9d17ffd26ea2399853eb2c2ac2e"]
  },
  "current-adapter-lunar-typescript-1-8-6": {
    role: "current_adapter",
    sourceType: "software_implementation",
    sourceRef: "https://github.com/6tail/lunar-typescript/tree/0f3e95d15e31f1a7c7b93d624542649347328a20",
    artifactSourceRefs: ["https://www.npmjs.com/package/lunar-typescript/v/1.8.6"],
    artifactDigests: ["505dc8eca166977c4e40ec883b22e871cab631811a79ad793ab8e561a2e9ad0f"]
  },
  "icu-chinese-calendar-78-3": {
    role: "crosscheck",
    sourceType: "software_implementation",
    sourceRef: "https://github.com/unicode-org/icu/commit/21d1eb0f306e1141c10931e914dfc038c06121da",
    artifactSourceRefs: [
      "https://nodejs.org/dist/v24.16.0/",
      "https://github.com/unicode-org/icu/blob/21d1eb0f306e1141c10931e914dfc038c06121da/icu4c/source/i18n/chnsecal.cpp"
    ],
    artifactDigests: [
      "b3094d0b49f9ad602262a9921551737bb97637c05dd357a06ae98188d7290aa3",
      "625e63321f41d106b77134c177fe5907baf1507a646427066751c29509b25140"
    ]
  },
  "dotnet-framework-4-8-chinese-lunisolar": {
    role: "crosscheck",
    sourceType: "software_implementation",
    sourceRef: "https://learn.microsoft.com/en-us/dotnet/api/system.globalization.chineselunisolarcalendar",
    artifactSourceRefs: ["https://learn.microsoft.com/en-us/dotnet/api/system.globalization.chineselunisolarcalendar"],
    artifactDigests: ["a8cae3d326f7d973ca79cba849939d4837ad18d507ef6d5f6ebab802b7fb157a"]
  },
  "usno-moon-phases-2089": {
    role: "astronomical_reference",
    sourceType: "government_astronomy_api",
    sourceRef: "https://aa.usno.navy.mil/api/moon/phases/year?year=2089",
    artifactSourceRefs: ["https://aa.usno.navy.mil/api/moon/phases/year?year=2089"],
    artifactDigests: ["bf6ddbdd98ea9370856e109c68b81707d1ae7fd36802688c726d9596d8dd63b1"]
  },
  "usno-moon-phases-2097": {
    role: "astronomical_reference",
    sourceType: "government_astronomy_api",
    sourceRef: "https://aa.usno.navy.mil/api/moon/phases/year?year=2097",
    artifactSourceRefs: ["https://aa.usno.navy.mil/api/moon/phases/year?year=2097"],
    artifactDigests: ["9107f88a5dd9e629464614c3f1d3f6b96cb2b497d413b5ce059844e0f995eb9e"]
  }
} as const);

function addDays(date: string, days: number): string {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`) + days * 86_400_000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function observation(year: number, month: number, day: number) {
  return {
    lunarDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    lunarLeapMonth: false
  };
}

function expectedObservations(
  windowId: keyof typeof EXPECTED_WINDOWS,
  ordinal: number
): z.infer<typeof fourWayObservationsSchema> {
  let authority: ReturnType<typeof observation>;
  let dotnet: ReturnType<typeof observation>;
  if (windowId === "calendar-divergence-2089-month-08") {
    if (ordinal === 0) authority = dotnet = observation(2089, 7, 29);
    else if (ordinal === 31) authority = dotnet = observation(2089, 9, 1);
    else {
      authority = observation(2089, 8, ordinal);
      dotnet = ordinal === 1 ? observation(2089, 7, 30) : observation(2089, 8, ordinal - 1);
    }
  } else if (ordinal === 0) authority = dotnet = observation(2097, 6, 29);
  else if (ordinal === 31) authority = dotnet = observation(2097, 8, 1);
  else {
    authority = observation(2097, 7, ordinal);
    dotnet = ordinal === 1 ? observation(2097, 6, 30) : observation(2097, 7, ordinal - 1);
  }
  return { hko: authority, currentAdapter: authority, icu: authority, dotnet };
}

function addIssue(context: z.RefinementCtx, path: PropertyKey[], message: string): void {
  context.addIssue({ code: "custom", path, message });
}

export const calendarDivergenceWindowsPayloadSchema = z.strictObject({
  format: z.literal(CALENDAR_DIVERGENCE_WINDOWS_FORMAT),
  formatVersion: z.literal(CALENDAR_DIVERGENCE_WINDOWS_VERSION),
  datasetId: z.literal(CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID),
  title: z.string().trim().min(1).max(300),
  classification: z.literal(CALENDAR_DIVERGENCE_DIAGNOSTIC_CLASSIFICATION),
  frame: z.literal("fixed_plus08_lunisolar_date"),
  parentDiagnostic: z.strictObject({
    reportDigest: z.literal(CALENDAR_DIVERGENCE_PARENT_REPORT_DIGEST),
    planDigest: z.literal(CALENDAR_DIVERGENCE_PARENT_PLAN_DIGEST),
    triggerCaseCount: z.literal(7)
  }),
  normalizedAstronomyEventEnvelopeDigest: z.literal(CALENDAR_DIVERGENCE_ASTRONOMY_EVENTS_DIGEST),
  declaredCounts: z.strictObject({
    windows: z.literal(2),
    cases: z.literal(64),
    divergence: z.literal(60),
    controls: z.literal(4),
    triggerCases: z.literal(7)
  }),
  releaseBoundary: z.strictObject({
    countsAsVerifiedGold: z.literal(false),
    verifiedGoldDelta: z.literal(0),
    fullP003GatePassed: z.literal(false),
    notice: z.string().trim().min(1).max(1_000)
  }),
  sources: z.array(calendarDivergenceSourceSnapshotSchema).length(7),
  triggers: z.array(calendarDivergenceTriggerSchema).length(7),
  windows: z.array(calendarDivergenceWindowSchema).length(2)
}).superRefine((payload, context) => {
  if (canonicalStringify(payload.triggers) !== canonicalStringify(CALENDAR_DIVERGENCE_TRIGGER_EXPECTATIONS)) {
    addIssue(context, ["triggers"], "七个触发案例必须逐案绑定冻结报告中的日期与输入摘要");
  }

  const expectedSourceIds = Object.keys(EXPECTED_SOURCE_SNAPSHOTS);
  if (canonicalStringify(payload.sources.map((item) => item.sourceId)) !== canonicalStringify(expectedSourceIds)) {
    addIssue(context, ["sources"], "来源快照必须按固定顺序完整覆盖 HKO、当前适配器、ICU、.NET 与 USNO");
  }
  payload.sources.forEach((source, sourceIndex) => {
    const expected = EXPECTED_SOURCE_SNAPSHOTS[source.sourceId];
    if (
      source.role !== expected.role
      || source.sourceType !== expected.sourceType
      || source.sourceRef !== expected.sourceRef
      || canonicalStringify(source.artifacts.map((item) => item.sourceRef)) !== canonicalStringify(expected.artifactSourceRefs)
      || canonicalStringify(source.artifacts.map((item) => item.sha256)) !== canonicalStringify(expected.artifactDigests)
    ) {
      addIssue(context, ["sources", sourceIndex], `来源 ${source.sourceId} 的角色、类型、固定 URL 或冻结材料摘要不匹配`);
    }
  });

  const seenCaseIds = new Set<string>();
  const seenDates = new Set<string>();
  let divergenceCount = 0;
  let controlCount = 0;
  const boundTriggerIds: string[] = [];

  payload.windows.forEach((auditWindow, windowIndex) => {
    const expected = EXPECTED_WINDOWS[auditWindow.windowId];
    if (
      auditWindow.startDate !== expected.startDate
      || auditWindow.endDate !== expected.endDate
      || auditWindow.hkoSourceId !== expected.hkoSourceId
      || canonicalStringify(auditWindow.triggerCaseIds) !== canonicalStringify(expected.triggerCaseIds)
    ) {
      addIssue(context, ["windows", windowIndex], `窗口 ${auditWindow.windowId} 的边界、HKO 来源或触发案例被改写`);
    }
    const rootCauseCore = {
      classification: auditWindow.rootCauseAssessment.classification,
      resolutionStatus: auditWindow.rootCauseAssessment.resolutionStatus,
      usnoSourceId: auditWindow.rootCauseAssessment.usnoSourceId,
      newMoonUtc: auditWindow.rootCauseAssessment.newMoonUtc,
      fixedPlus08Local: auditWindow.rootCauseAssessment.fixedPlus08Local,
      distanceFromLocalMidnightMinutes: auditWindow.rootCauseAssessment.distanceFromLocalMidnightMinutes,
      favors: auditWindow.rootCauseAssessment.favors,
      normalizedEventEnvelopeDigest: auditWindow.rootCauseAssessment.normalizedEventEnvelopeDigest
    };
    if (canonicalStringify(rootCauseCore) !== canonicalStringify(expected.rootCauseAssessment)) {
      addIssue(context, ["windows", windowIndex, "rootCauseAssessment"], "近午夜朔事件的冻结判断被改写");
    }

    auditWindow.cases.forEach((candidate, caseIndex) => {
      const expectedDate = addDays(expected.startDate, caseIndex);
      const expectedRole = caseIndex === 0 || caseIndex === 31 ? "control" : "divergence";
      const expectedClass = expectedRole === "control"
        ? "all_sources_match_control"
        : "dotnet_adjacent_month_length_offset";
      const expectedTriggerIds = CALENDAR_DIVERGENCE_TRIGGER_EXPECTATIONS
        .filter((item) => item.gregorianDate === expectedDate)
        .map((item) => item.caseId);
      if (
        candidate.ordinal !== caseIndex
        || candidate.gregorianDate !== expectedDate
        || candidate.caseId !== `calendar-window-${expectedDate}`
        || candidate.role !== expectedRole
        || candidate.differenceClass !== expectedClass
        || canonicalStringify(candidate.observations) !== canonicalStringify(expectedObservations(auditWindow.windowId, caseIndex))
        || canonicalStringify(candidate.triggerCaseIds) !== canonicalStringify(expectedTriggerIds)
      ) {
        addIssue(context, ["windows", windowIndex, "cases", caseIndex], "窗口案例不是固定日期序列、四路观测或触发绑定");
      }
      if (seenCaseIds.has(candidate.caseId)) {
        addIssue(context, ["windows", windowIndex, "cases", caseIndex, "caseId"], "窗口案例 ID 不得重复");
      }
      if (seenDates.has(candidate.gregorianDate)) {
        addIssue(context, ["windows", windowIndex, "cases", caseIndex, "gregorianDate"], "同一公历日期不得跨窗口重复计数");
      }
      seenCaseIds.add(candidate.caseId);
      seenDates.add(candidate.gregorianDate);
      boundTriggerIds.push(...candidate.triggerCaseIds);
      if (candidate.role === "divergence") divergenceCount += 1;
      else controlCount += 1;
    });

    if (addDays(auditWindow.startDate, auditWindow.cases.length - 1) !== auditWindow.endDate) {
      addIssue(context, ["windows", windowIndex, "cases"], "窗口必须逐日连续且完整包含首尾日期");
    }
  });

  if (
    seenCaseIds.size !== 64
    || seenDates.size !== 64
    || divergenceCount !== 60
    || controlCount !== 4
    || canonicalStringify(boundTriggerIds) !== canonicalStringify(payload.triggers.map((item) => item.caseId))
  ) {
    addIssue(context, ["declaredCounts"], "窗口必须精确守恒为 64 案例、60 差异、4 控制并绑定七个触发案例");
  }
});

export const calendarDivergenceWindowsEnvelopeSchema = z.strictObject({
  payload: calendarDivergenceWindowsPayloadSchema,
  digest: sha256Schema
});

export type CalendarDivergenceWindowsPayload = z.infer<typeof calendarDivergenceWindowsPayloadSchema>;
export type CalendarDivergenceWindowsEnvelope = z.infer<typeof calendarDivergenceWindowsEnvelopeSchema>;

export class CalendarDivergenceWindowsError extends Error {
  constructor(readonly code: "INVALID_JSON" | "DIGEST_MISMATCH" | "FIXTURE_VERSION_MISMATCH", message: string) {
    super(message);
    this.name = "CalendarDivergenceWindowsError";
  }
}

export const CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE = calendarDivergenceWindowsEnvelopeSchema.parse(rawFixture);

export async function digestCalendarDivergenceWindowsPayload(
  payload: CalendarDivergenceWindowsPayload = CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE.payload
): Promise<string> {
  return sha256Hex(calendarDivergenceWindowsPayloadSchema.parse(payload));
}

export async function preflightCalendarDivergenceWindows(
  raw: string | unknown = CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE
): Promise<CalendarDivergenceWindowsEnvelope> {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new CalendarDivergenceWindowsError("INVALID_JSON", "连续历法差异窗口不是合法 JSON");
    }
  }
  const envelope = calendarDivergenceWindowsEnvelopeSchema.parse(parsed);
  if (await digestCalendarDivergenceWindowsPayload(envelope.payload) !== envelope.digest) {
    throw new CalendarDivergenceWindowsError("DIGEST_MISMATCH", "连续历法差异窗口内容摘要不匹配");
  }
  if (envelope.digest !== CALENDAR_DIVERGENCE_WINDOWS_EXPECTED_DIGEST) {
    throw new CalendarDivergenceWindowsError(
      "FIXTURE_VERSION_MISMATCH",
      "连续历法差异窗口不是当前 v1 固定摘要；修改数据必须显式发布新版本"
    );
  }
  return envelope;
}

export function serializeCalendarDivergenceWindows(envelope: CalendarDivergenceWindowsEnvelope): string {
  return `${canonicalStringify(calendarDivergenceWindowsEnvelopeSchema.parse(envelope))}\n`;
}
