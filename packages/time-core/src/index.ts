import { Temporal } from "@js-temporal/polyfill";
import { Lunar, Solar } from "lunar-typescript";
import {
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  birthInputSchema,
  calendarResolutionSchema,
  dstDisambiguationPolicySchema,
  eventDatePrecisionSchema,
  eventMinuteLocalDateTimeSchema,
  eventTimeContextSchema,
  eventZonedMinuteBoundarySchema,
  normalizedTimeCalibrationSchema,
  timeZoneDatabaseSnapshotSchema,
  type BirthInput,
  type CalendarResolution,
  type DstDisambiguationPolicy,
  type EventDatePrecision,
  type EventTimeContext,
  type EventZonedMinuteBoundary,
  type NormalizedTimeCalibration,
  type SolarTimeDetails,
  type SolarTimeVariant,
  type TimeZoneCandidate,
  type TimeZoneDatabaseSnapshot,
  type TimeZoneResolution
} from "@hakimi/contracts";
import {
  TzdbArtifactError,
  assertBundledTzdbArtifact,
  getBundledTzdbArtifactSnapshot,
  loadBundledTzdbResolver,
  projectEpochMilliseconds,
  resolveLocalEpochMilliseconds,
  type BundledTzdbResolver,
  type BundledZoneCandidate
} from "@hakimi/tzdb-core";

export const SOLAR_TIME_MODEL_ID = "noaa-gml-fractional-year-eot-approx-v1" as const;
export const LUNAR_TO_SOLAR_ALGORITHM_ID = "hakimi-time-core:lunar-typescript-1.8.6-to-solar:v1" as const;
export const SOLAR_TO_LUNAR_ALGORITHM_ID = "hakimi-time-core:lunar-typescript-1.8.6-to-lunar:v1" as const;
export const GREGORIAN_IDENTITY_ALGORITHM_ID = "hakimi-time-core:gregorian-identity:v1" as const;
export const RUNTIME_TIME_ZONE_DATABASE = timeZoneDatabaseSnapshotSchema.parse(assertBundledTzdbArtifact());
export const RUNTIME_TZDB_VERSION = RUNTIME_TIME_ZONE_DATABASE.snapshotId;
export const MIN_REVERSIBLE_GREGORIAN_DATE = "1900-01-31" as const;
export const MAX_REVERSIBLE_GREGORIAN_DATE = "2100-12-31" as const;

export type BundledTimeZoneCalculationContext = {
  timeZoneDatabase: TimeZoneDatabaseSnapshot;
  resolver: BundledTzdbResolver;
};

const LUNAR_ADAPTER_SOURCE =
  "https://github.com/6tail/lunar-typescript/blob/0f3e95d15e31f1a7c7b93d624542649347328a20/src/lib/Lunar.ts";
const SOLAR_ADAPTER_SOURCE =
  "https://github.com/6tail/lunar-typescript/blob/0f3e95d15e31f1a7c7b93d624542649347328a20/src/lib/Solar.ts";

export type TimeNormalizationErrorCode =
  | "UNSUPPORTED_CALENDAR"
  | "INVALID_GREGORIAN_DATE"
  | "INVALID_LUNAR_DATE"
  | "LUNAR_DATE_OUTSIDE_SUPPORTED_SOLAR_RANGE"
  | "MISSING_EXACT_TIME"
  | "INVALID_INSTANT"
  | "INVALID_TIME_ZONE"
  | "INVALID_CIVIL_MINUTE"
  | "MISSING_EVENT_TIME_ZONE"
  | "DST_OVERLAP_REQUIRES_CHOICE"
  | "DST_GAP_REJECTED"
  | "EVENT_TIME_RANGE_INVALID"
  | "EVENT_TIME_CONTEXT_MISMATCH"
  | "TZDB_LEGACY_UNIDENTIFIED"
  | "TZDB_ARTIFACT_UNAVAILABLE"
  | "TZDB_SNAPSHOT_MISMATCH";

export class TimeNormalizationError extends Error {
  constructor(
    readonly code: TimeNormalizationErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "TimeNormalizationError";
  }
}

/**
 * Loads one official bundled snapshot for deterministic calculation without
 * changing the active runtime resolver. An optional frozen descriptor lets a
 * caller fail closed before replaying a stored identified snapshot.
 */
export async function loadBundledTimeZoneCalculationContext(
  snapshotId: string,
  expectedTimeZoneDatabase?: TimeZoneDatabaseSnapshot
): Promise<BundledTimeZoneCalculationContext> {
  const registered = getBundledTzdbArtifactSnapshot(snapshotId);
  if (!registered) {
    throw new TimeNormalizationError(
      "TZDB_ARTIFACT_UNAVAILABLE",
      `应用未保留时区工件 ${snapshotId}，不能用当前版本替代并列复算。`
    );
  }
  const registeredDescriptor = timeZoneDatabaseSnapshotSchema.safeParse(registered);
  if (!registeredDescriptor.success) {
    throw new TimeNormalizationError(
      "TZDB_SNAPSHOT_MISMATCH",
      `随包工件 ${snapshotId} 的注册描述符不符合冻结契约。`
    );
  }
  const timeZoneDatabase = registeredDescriptor.data;
  if (expectedTimeZoneDatabase !== undefined) {
    const expected = timeZoneDatabaseSnapshotSchema.safeParse(expectedTimeZoneDatabase);
    if (!expected.success || JSON.stringify(expected.data) !== JSON.stringify(timeZoneDatabase)) {
      throw new TimeNormalizationError(
        "TZDB_SNAPSHOT_MISMATCH",
        "请求的完整时区描述符与随包工件注册表不一致。"
      );
    }
  }
  try {
    const resolver = await loadBundledTzdbResolver(snapshotId);
    const resolverSnapshot = timeZoneDatabaseSnapshotSchema.safeParse(resolver.snapshot);
    if (
      !resolverSnapshot.success ||
      JSON.stringify(resolverSnapshot.data) !== JSON.stringify(timeZoneDatabase)
    ) {
      throw new TimeNormalizationError(
        "TZDB_SNAPSHOT_MISMATCH",
        "已加载 resolver 的时区描述符与随包工件注册表不一致。"
      );
    }
    return { timeZoneDatabase, resolver };
  } catch (cause) {
    if (cause instanceof TimeNormalizationError) throw cause;
    const code = cause instanceof TzdbArtifactError && cause.code === "TZDB_ARTIFACT_MISMATCH"
      ? "TZDB_SNAPSHOT_MISMATCH"
      : "TZDB_ARTIFACT_UNAVAILABLE";
    throw new TimeNormalizationError(
      code,
      code === "TZDB_SNAPSHOT_MISMATCH"
        ? `时区工件 ${snapshotId} 与其冻结描述符不一致。`
        : `无法加载时区工件 ${snapshotId}；不会改用其他版本。`,
      { cause }
    );
  }
}

export type ProjectedCivilTime = {
  instant: string;
  timeZone: string;
  wallDateTime: string;
  utcOffset: string;
  zonedDateTime: string;
};

export type ResolvedBirthCalendarInput = {
  originalInput: BirthInput;
  effectiveGregorianInput: BirthInput;
  calendarResolution: CalendarResolution;
};

export type ResolvedGregorianCalendarDate = {
  inputGregorianDate: string;
  resolvedLunarDate: string;
  resolvedLunarLeapMonth: boolean;
  algorithmId: typeof SOLAR_TO_LUNAR_ALGORITHM_ID;
  frame: "fixed_plus08_lunisolar_date";
  upstreamName: "lunar-typescript";
  upstreamVersion: "1.8.6";
  roundTripVerified: true;
  sourceRefs: string[];
  warnings: string[];
};

function ymdParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Resolves the user's calendar date without changing the original BirthInput.
 * Lunar dates use lunar-typescript's fixed East-Asian lunisolar date table;
 * the derived Gregorian date is then interpreted as a civil date in the
 * explicitly selected IANA time zone by normalizeBirthTime.
 */
export function resolveBirthCalendarInput(rawInput: BirthInput): ResolvedBirthCalendarInput {
  const originalInput = birthInputSchema.parse(rawInput);
  if (originalInput.calendarType === "gregorian") {
    return {
      originalInput,
      effectiveGregorianInput: originalInput,
      calendarResolution: calendarResolutionSchema.parse({
        inputCalendarType: "gregorian",
        inputDate: originalInput.date,
        inputLunarLeapMonth: false,
        resolvedGregorianDate: originalInput.date,
        algorithmId: GREGORIAN_IDENTITY_ALGORITHM_ID,
        frame: "identity_gregorian",
        upstreamName: null,
        upstreamVersion: null,
        roundTripVerified: true,
        sourceRefs: [],
        warnings: []
      })
    };
  }

  const { year, month, day } = ymdParts(originalInput.date);
  const signedMonth = originalInput.lunarLeapMonth ? -month : month;
  let resolvedGregorianDate: string;
  try {
    const lunar = Lunar.fromYmd(year, signedMonth, day);
    const solar = lunar.getSolar();
    const roundTrip = solar.getLunar();
    if (
      roundTrip.getYear() !== year ||
      roundTrip.getMonth() !== signedMonth ||
      roundTrip.getDay() !== day
    ) {
      throw new Error("lunar-to-solar round trip mismatch");
    }
    resolvedGregorianDate = `${solar.getYear()}-${pad2(solar.getMonth())}-${pad2(solar.getDay())}`;
  } catch (cause) {
    throw new TimeNormalizationError(
      "INVALID_LUNAR_DATE",
      `农历 ${originalInput.date}${originalInput.lunarLeapMonth ? "（闰月）" : ""} 不存在，或与该年的闰月不一致。`,
      { cause }
    );
  }

  const effectiveResult = birthInputSchema.safeParse({
    ...originalInput,
    calendarType: "gregorian",
    date: resolvedGregorianDate,
    lunarLeapMonth: false
  });
  if (!effectiveResult.success) {
    throw new TimeNormalizationError(
      "LUNAR_DATE_OUTSIDE_SUPPORTED_SOLAR_RANGE",
      `农历 ${originalInput.date} 转换得到公历 ${resolvedGregorianDate}，超出当前 1900—2100 的可计算公历范围。`
    );
  }

  const lunarLabel = `${originalInput.date}${originalInput.lunarLeapMonth ? "（闰月）" : ""}`;
  return {
    originalInput,
    effectiveGregorianInput: effectiveResult.data,
    calendarResolution: calendarResolutionSchema.parse({
      inputCalendarType: "lunar",
      inputDate: originalInput.date,
      inputLunarLeapMonth: originalInput.lunarLeapMonth,
      resolvedGregorianDate,
      algorithmId: LUNAR_TO_SOLAR_ALGORITHM_ID,
      frame: "fixed_plus08_lunisolar_date",
      upstreamName: "lunar-typescript",
      upstreamVersion: "1.8.6",
      roundTripVerified: true,
      sourceRefs: [LUNAR_ADAPTER_SOURCE],
      warnings: [
        `原始农历输入 ${lunarLabel} 已显式转换为公历 ${resolvedGregorianDate}；原值与闰月标记仍单独保存。`,
        "农历转换采用 lunar-typescript 1.8.6 的固定历法表，当前仍是待金标准复核的工程候选。"
      ]
    })
  };
}

/**
 * Resolves one canonical Gregorian civil date to its lunisolar date.
 * This is the explicit reverse direction used by authority-reference tests;
 * it remains an implementation result until independent release evidence is accepted.
 */
export function resolveGregorianCalendarDate(rawDate: string): ResolvedGregorianCalendarDate {
  let plainDate: Temporal.PlainDate;
  try {
    plainDate = Temporal.PlainDate.from(rawDate);
    if (
      plainDate.toString() !== rawDate ||
      Temporal.PlainDate.compare(plainDate, MIN_REVERSIBLE_GREGORIAN_DATE) < 0 ||
      Temporal.PlainDate.compare(plainDate, MAX_REVERSIBLE_GREGORIAN_DATE) > 0
    ) {
      throw new Error("Gregorian date is outside the canonical supported range");
    }
  } catch (cause) {
    throw new TimeNormalizationError(
      "INVALID_GREGORIAN_DATE",
      `公历日期 ${rawDate} 不是 ${MIN_REVERSIBLE_GREGORIAN_DATE}—${MAX_REVERSIBLE_GREGORIAN_DATE} 范围内可与当前农历输入契约双向往返的有效 YYYY-MM-DD 日期。`,
      { cause }
    );
  }

  try {
    const solar = Solar.fromYmd(plainDate.year, plainDate.month, plainDate.day);
    const lunar = solar.getLunar();
    const roundTrip = lunar.getSolar();
    if (
      roundTrip.getYear() !== plainDate.year ||
      roundTrip.getMonth() !== plainDate.month ||
      roundTrip.getDay() !== plainDate.day
    ) {
      throw new Error("solar-to-lunar round trip mismatch");
    }
    const lunarMonth = lunar.getMonth();
    return {
      inputGregorianDate: rawDate,
      resolvedLunarDate: `${lunar.getYear()}-${pad2(Math.abs(lunarMonth))}-${pad2(lunar.getDay())}`,
      resolvedLunarLeapMonth: lunarMonth < 0,
      algorithmId: SOLAR_TO_LUNAR_ALGORITHM_ID,
      frame: "fixed_plus08_lunisolar_date",
      upstreamName: "lunar-typescript",
      upstreamVersion: "1.8.6",
      roundTripVerified: true,
      sourceRefs: [SOLAR_ADAPTER_SOURCE, LUNAR_ADAPTER_SOURCE],
      warnings: [
        "公历转农历采用 lunar-typescript 1.8.6 的固定历法表，当前仍是待金标准复核的工程候选。"
      ]
    };
  } catch (cause) {
    throw new TimeNormalizationError(
      "INVALID_GREGORIAN_DATE",
      `公历日期 ${rawDate} 无法转换为当前适配器支持的农历日期。`,
      { cause }
    );
  }
}

/** Projects one absolute instant into an explicit IANA civil-time frame. */
export function projectInstantToCivilTime(instant: string, timeZone: string): ProjectedCivilTime {
  let parsed: Temporal.Instant;
  try {
    parsed = Temporal.Instant.from(instant);
  } catch (cause) {
    throw new TimeNormalizationError("INVALID_INSTANT", `无法解析瞬时点：${instant}`, { cause });
  }
  try {
    const epochMilliseconds = Number(parsed.epochMilliseconds);
    if (!Number.isSafeInteger(epochMilliseconds)) throw new RangeError("epoch milliseconds out of range");
    const projection = projectEpochMilliseconds(epochMilliseconds, timeZone);
    const localNanoseconds = parsed.epochNanoseconds + BigInt(projection.offsetSeconds) * 1_000_000_000n;
    const wallDateTime = Temporal.Instant.fromEpochNanoseconds(localNanoseconds).toString().replace(/Z$/, "");
    const utcOffset = formatUtcOffset(projection.offsetSeconds);
    return {
      instant: parsed.toString(),
      timeZone,
      wallDateTime,
      utcOffset,
      zonedDateTime: `${wallDateTime}${utcOffset}[${timeZone}]`
    };
  } catch (cause) {
    throw new TimeNormalizationError(
      "INVALID_TIME_ZONE",
      `无法把瞬时点投影到 IANA 时区 ${timeZone}：${instant}`,
      { cause }
    );
  }
}

type InternalCandidate = {
  value: TimeZoneCandidate;
  resolvedDateTime: Temporal.PlainDateTime;
};

function requestedWallTime(input: BirthInput): string {
  const time = input.time ?? "";
  return `${input.date}T${time.split(":").length === 2 ? `${time}:00` : time}`;
}

function createCandidate(
  choice: TimeZoneCandidate["choice"],
  candidate: BundledZoneCandidate,
  timeZone: string,
  requested: Temporal.PlainDateTime
): InternalCandidate {
  const resolved = plainDateTimeFromLocalEpochMilliseconds(candidate.localEpochMilliseconds);
  const utcOffset = formatUtcOffset(candidate.offsetSeconds);
  const resolvedWallTime = resolved.toString({ smallestUnit: "second" });
  return {
    resolvedDateTime: resolved,
    value: {
      choice,
      instant: Temporal.Instant.fromEpochMilliseconds(candidate.epochMilliseconds).toString({ smallestUnit: "second" }),
      utcOffset,
      utcOffsetMinutes: candidate.offsetSeconds / 60,
      resolvedWallTime,
      zonedDateTime: `${resolvedWallTime}${utcOffset}[${timeZone}]`,
      matchesInputWallTime: resolved.equals(requested)
    }
  };
}

function formatUtcOffset(offsetSeconds: number): string {
  const sign = offsetSeconds < 0 ? "-" : "+";
  const absolute = Math.abs(offsetSeconds);
  const hours = Math.floor(absolute / 3_600);
  const minutes = Math.floor((absolute % 3_600) / 60);
  const seconds = absolute % 60;
  return `${sign}${pad2(hours)}:${pad2(minutes)}${seconds === 0 ? "" : `:${pad2(seconds)}`}`;
}

function plainDateTimeToLocalEpochMilliseconds(value: Temporal.PlainDateTime): number {
  return Date.UTC(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second,
    value.millisecond
  );
}

function plainDateTimeFromLocalEpochMilliseconds(value: number): Temporal.PlainDateTime {
  const date = new Date(value);
  return Temporal.PlainDateTime.from({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds()
  });
}

function resolveCandidates(
  plainDateTime: Temporal.PlainDateTime,
  timeZone: string,
  resolver: Pick<BundledTzdbResolver, "resolveLocalEpochMilliseconds"> = {
    resolveLocalEpochMilliseconds
  }
): { kind: TimeZoneResolution["kind"]; candidates: InternalCandidate[] } {
  try {
    const resolution = resolver.resolveLocalEpochMilliseconds(
      plainDateTimeToLocalEpochMilliseconds(plainDateTime),
      timeZone
    );
    if (resolution.kind === "unique") {
      return {
        kind: "unique",
        candidates: [createCandidate("unique", resolution.candidates[0]!, timeZone, plainDateTime)]
      };
    }
    return {
      kind: resolution.kind,
      candidates: resolution.candidates.map((candidate, index) =>
        createCandidate(index === 0 ? "earlier" : "later", candidate, timeZone, plainDateTime)
      )
    };
  } catch (cause) {
    if (cause instanceof TzdbArtifactError && cause.code === "TZDB_ARTIFACT_MISMATCH") {
      throw new TimeNormalizationError(
        "TZDB_SNAPSHOT_MISMATCH",
        "固定 tzdb resolver 与冻结工件描述符不一致。",
        { cause }
      );
    }
    throw new TimeNormalizationError("INVALID_TIME_ZONE", `无法使用 IANA 时区 ${timeZone} 解析民用时间。`, { cause });
  }
}

export type CivilMinutePreflight = {
  localDateTime: string;
  requestedWallTime: string;
  timeZone: string;
  kind: TimeZoneResolution["kind"];
  candidates: TimeZoneCandidate[];
};

export type ResolveEventTimeContextInput = {
  datePrecision: EventDatePrecision;
  startDate: string | null;
  endDate: string | null;
  timeZone?: string;
  startDisambiguation?: DstDisambiguationPolicy;
  endDisambiguation?: DstDisambiguationPolicy;
};

export type VerifyEventTimeContextInput = Pick<
  ResolveEventTimeContextInput,
  "datePrecision" | "startDate" | "endDate"
> & {
  timeContext: EventTimeContext;
};

/**
 * Resolves an exact civil minute into all IANA candidates without choosing one.
 * This is safe for UI preflight: overlaps remain two candidates and gaps remain
 * explicitly unresolvable rather than being shifted.
 */
export function preflightCivilMinute(input: {
  localDateTime: string;
  timeZone: string;
}): CivilMinutePreflight {
  return preflightCivilMinuteWithResolver(input, { resolveLocalEpochMilliseconds });
}

function preflightCivilMinuteWithResolver(
  input: { localDateTime: string; timeZone: string },
  resolver: Pick<BundledTzdbResolver, "resolveLocalEpochMilliseconds">
): CivilMinutePreflight {
  let localDateTime: string;
  let requested: Temporal.PlainDateTime;
  try {
    localDateTime = eventMinuteLocalDateTimeSchema.parse(input.localDateTime);
    requested = Temporal.PlainDateTime.from(localDateTime);
    if (requested.toString({ smallestUnit: "minute" }) !== localDateTime) throw new Error("non-canonical minute");
  } catch (cause) {
    throw new TimeNormalizationError(
      "INVALID_CIVIL_MINUTE",
      `无法解析民用分钟：${String(input.localDateTime)}`,
      { cause }
    );
  }

  const resolution = resolveCandidates(requested, input.timeZone, resolver);
  return {
    localDateTime,
    requestedWallTime: requested.toString({ smallestUnit: "second" }),
    timeZone: input.timeZone,
    kind: resolution.kind,
    candidates: resolution.candidates.map((candidate) => candidate.value)
  };
}

function resolveEventMinuteBoundary(input: {
  localDateTime: string;
  timeZone: string;
  disambiguation: DstDisambiguationPolicy;
  boundary: "start" | "end";
}, resolver: Pick<BundledTzdbResolver, "resolveLocalEpochMilliseconds">): EventZonedMinuteBoundary {
  const policy = dstDisambiguationPolicySchema.parse(input.disambiguation);
  const preflight = preflightCivilMinuteWithResolver(input, resolver);
  if (preflight.kind === "gap") {
    throw new TimeNormalizationError(
      "DST_GAP_REJECTED",
      `${input.boundary === "start" ? "起始" : "结束"}民用时间位于 DST 空档；事件时间不会被自动平移。`
    );
  }
  if (preflight.kind === "overlap" && policy === "reject") {
    throw new TimeNormalizationError(
      "DST_OVERLAP_REQUIRES_CHOICE",
      `${input.boundary === "start" ? "起始" : "结束"}民用时间位于 DST 重叠区间；必须显式选择 earlier 或 later。`
    );
  }

  const selectedChoice = preflight.kind === "unique" ? "unique" : policy;
  const selectedCandidate = preflight.candidates.find((candidate) => candidate.choice === selectedChoice);
  if (!selectedCandidate) throw new Error(`Missing ${selectedChoice} event-time candidate.`);
  const storedPolicy: DstDisambiguationPolicy = preflight.kind === "unique" ? "reject" : policy;
  const status = preflight.kind === "unique"
    ? "resolved_unique"
    : storedPolicy === "earlier"
      ? "resolved_overlap_earlier"
      : "resolved_overlap_later";

  return eventZonedMinuteBoundarySchema.parse({
    localDateTime: preflight.localDateTime,
    resolution: {
      kind: preflight.kind,
      policy: storedPolicy,
      status,
      requestedWallTime: preflight.requestedWallTime,
      candidates: preflight.candidates,
      selectedCandidate
    },
    canonicalUtc: selectedCandidate.instant
  });
}

/** Creates the only writable Event time contexts. legacy_floating is migration-only. */
export function resolveEventTimeContext(input: ResolveEventTimeContextInput): EventTimeContext {
  return resolveEventTimeContextWithResolver(
    input,
    RUNTIME_TIME_ZONE_DATABASE,
    { resolveLocalEpochMilliseconds }
  );
}

function resolveEventTimeContextWithResolver(
  input: ResolveEventTimeContextInput,
  timeZoneDatabase: TimeZoneDatabaseSnapshot,
  resolver: Pick<BundledTzdbResolver, "resolveLocalEpochMilliseconds">
): EventTimeContext {
  const datePrecision = eventDatePrecisionSchema.parse(input.datePrecision);
  if (datePrecision !== "minute") return eventTimeContextSchema.parse({ kind: "calendar_date" });
  if (!input.timeZone) {
    throw new TimeNormalizationError("MISSING_EVENT_TIME_ZONE", "分钟级事件必须显式选择 IANA 时区。");
  }
  if (input.startDate === null) {
    throw new TimeNormalizationError("INVALID_CIVIL_MINUTE", "分钟级事件必须保存起始民用分钟。");
  }

  const start = resolveEventMinuteBoundary({
    localDateTime: input.startDate,
    timeZone: input.timeZone,
    disambiguation: input.startDisambiguation ?? "reject",
    boundary: "start"
  }, resolver);
  const end = input.endDate === null
    ? null
    : resolveEventMinuteBoundary({
        localDateTime: input.endDate,
        timeZone: input.timeZone,
        disambiguation: input.endDisambiguation ?? "reject",
        boundary: "end"
      }, resolver);
  if (end && end.canonicalUtc < start.canonicalUtc) {
    throw new TimeNormalizationError("EVENT_TIME_RANGE_INVALID", "事件结束 UTC 不能早于起始 UTC。");
  }
  return eventTimeContextSchema.parse({
    kind: "zoned_minute",
    timeZone: input.timeZone,
    tzdbVersion: timeZoneDatabase.snapshotId,
    timeZoneDatabase,
    start,
    end
  });
}

/**
 * Read-only research resolver for an official retained artifact. It never
 * changes the active runtime snapshot and does not write or re-sign records.
 */
export async function resolveEventTimeContextForBundledSnapshot(
  input: ResolveEventTimeContextInput,
  snapshotId: string
): Promise<EventTimeContext> {
  const snapshot = getBundledTzdbArtifactSnapshot(snapshotId);
  if (!snapshot) {
    throw new TimeNormalizationError(
      "TZDB_ARTIFACT_UNAVAILABLE",
      `应用未保留时区工件 ${snapshotId}，不能用当前版本替代历史复算。`
    );
  }
  try {
    const resolver = await loadBundledTzdbResolver(snapshotId);
    return resolveEventTimeContextWithResolver(input, timeZoneDatabaseSnapshotSchema.parse(snapshot), resolver);
  } catch (cause) {
    if (cause instanceof TimeNormalizationError) throw cause;
    throw new TimeNormalizationError(
      "TZDB_ARTIFACT_UNAVAILABLE",
      `无法加载时区工件 ${snapshotId}；历史记录保持只读且不会改用其他版本。`,
      { cause }
    );
  }
}

/**
 * Replays contexts only when their semantics can be reproduced by this runtime.
 * Frozen historical tzdb snapshots remain structurally verifiable without being
 * silently reinterpreted through a different bundled database.
 */
export function verifyEventTimeContext(input: VerifyEventTimeContextInput): EventTimeContext {
  const actual = eventTimeContextSchema.parse(input.timeContext);
  if (actual.kind === "legacy_floating") return actual;
  if (
    actual.kind === "zoned_minute" &&
    classifyStoredTimeZoneDatabase(actual) !== "current_exact"
  ) {
    // Historical events remain structurally readable/exportable. Their bound
    // candidate set must never be replayed or re-signed with today's resolver.
    return actual;
  }
  const expected = actual.kind === "calendar_date"
    ? resolveEventTimeContext({
        datePrecision: input.datePrecision,
        startDate: input.startDate,
        endDate: input.endDate
      })
    : resolveEventTimeContext({
        datePrecision: input.datePrecision,
        startDate: input.startDate,
        endDate: input.endDate,
        timeZone: actual.timeZone,
        startDisambiguation: actual.start.resolution.policy,
        endDisambiguation: actual.end?.resolution.policy
      });
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TimeNormalizationError(
      "EVENT_TIME_CONTEXT_MISMATCH",
      "事件时间上下文无法从民用时间、IANA 时区与 DST 决策完整复算。"
    );
  }
  return actual;
}

/**
 * Replays a current or retained identified Event through its exact official
 * artifact. Unknown and metadata-conflicting snapshots fail closed.
 */
export async function verifyEventTimeContextWithBundledArtifact(
  input: VerifyEventTimeContextInput
): Promise<EventTimeContext> {
  const actual = eventTimeContextSchema.parse(input.timeContext);
  if (actual.kind === "legacy_floating" || actual.kind === "calendar_date") {
    return verifyEventTimeContext(input);
  }
  const registered = getBundledTzdbArtifactSnapshot(actual.tzdbVersion);
  if (!registered) {
    throw new TimeNormalizationError(
      "TZDB_ARTIFACT_UNAVAILABLE",
      `事件绑定的时区工件 ${actual.tzdbVersion} 未随应用保留，不能执行历史复算。`
    );
  }
  if (JSON.stringify(actual.timeZoneDatabase) !== JSON.stringify(registered)) {
    throw new TimeNormalizationError(
      "TZDB_SNAPSHOT_MISMATCH",
      "事件保存的完整时区描述符与内容寻址工件注册表不一致。"
    );
  }
  const expected = await resolveEventTimeContextForBundledSnapshot({
    datePrecision: input.datePrecision,
    startDate: input.startDate,
    endDate: input.endDate,
    timeZone: actual.timeZone,
    startDisambiguation: actual.start.resolution.policy,
    endDisambiguation: actual.end?.resolution.policy
  }, actual.tzdbVersion);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TimeNormalizationError(
      "EVENT_TIME_CONTEXT_MISMATCH",
      "事件时间上下文无法由其冻结 IANA 工件、民用时间与 DST 决策完整复算。"
    );
  }
  return actual;
}

export type StoredTimeZoneDatabaseStatus =
  | "current_exact"
  | "legacy_unidentified"
  | "different_snapshot";

export function classifyStoredTimeZoneDatabase(input: {
  tzdbVersion: string;
  timeZoneDatabase?: TimeZoneDatabaseSnapshot;
}): StoredTimeZoneDatabaseStatus {
  if (input.tzdbVersion === LEGACY_UNIDENTIFIED_TZDB_VERSION) return "legacy_unidentified";
  return input.tzdbVersion === RUNTIME_TZDB_VERSION &&
    JSON.stringify(input.timeZoneDatabase) === JSON.stringify(RUNTIME_TIME_ZONE_DATABASE)
    ? "current_exact"
    : "different_snapshot";
}

export type StoredTimeZoneDatabaseReplayStatus =
  | "current_exact"
  | "retained_exact"
  | "legacy_unidentified"
  | "artifact_unavailable"
  | "descriptor_mismatch";

export function classifyStoredTimeZoneDatabaseForReplay(input: {
  tzdbVersion: string;
  timeZoneDatabase?: TimeZoneDatabaseSnapshot;
}): StoredTimeZoneDatabaseReplayStatus {
  if (input.tzdbVersion === LEGACY_UNIDENTIFIED_TZDB_VERSION) return "legacy_unidentified";
  const registered = getBundledTzdbArtifactSnapshot(input.tzdbVersion);
  if (!registered) return "artifact_unavailable";
  if (JSON.stringify(input.timeZoneDatabase) !== JSON.stringify(registered)) return "descriptor_mismatch";
  return input.tzdbVersion === RUNTIME_TZDB_VERSION ? "current_exact" : "retained_exact";
}

export function requireCurrentTimeZoneDatabase(input: {
  tzdbVersion: string;
  timeZoneDatabase?: TimeZoneDatabaseSnapshot;
}): TimeZoneDatabaseSnapshot {
  const status = classifyStoredTimeZoneDatabase(input);
  if (status === "legacy_unidentified") {
    throw new TimeNormalizationError(
      "TZDB_LEGACY_UNIDENTIFIED",
      "该历史修订使用未识别的浏览器时区库；请由原修订派生新 Revision 后再执行时间相关推导。"
    );
  }
  if (status !== "current_exact") {
    throw new TimeNormalizationError(
      "TZDB_SNAPSHOT_MISMATCH",
      "该记录绑定的固定时区数据快照与当前应用不同；不会跨版本静默复算。"
    );
  }
  return RUNTIME_TIME_ZONE_DATABASE;
}

function selectCandidate(
  kind: TimeZoneResolution["kind"],
  candidates: InternalCandidate[],
  policy: DstDisambiguationPolicy
): { selected: InternalCandidate | null; status: TimeZoneResolution["status"]; warnings: string[] } {
  if (kind === "unique") {
    return { selected: candidates[0], status: "resolved_unique", warnings: [] };
  }

  if (policy === "reject") {
    return kind === "overlap"
      ? {
          selected: null,
          status: "rejected_overlap",
          warnings: ["民用时间位于 DST 重叠区间，存在两个有效瞬时点；reject 策略未选择任何候选值。"]
        }
      : {
          selected: null,
          status: "rejected_gap",
          warnings: ["民用时间位于 DST 空档，不存在与原输入相符的瞬时点；reject 策略未移动或替换原输入。"]
        };
  }

  const selected = candidates.find((candidate) => candidate.value.choice === policy) ?? null;
  if (!selected) throw new Error(`缺少 ${policy} 时间候选值`);

  if (kind === "overlap") {
    return {
      selected,
      status: policy === "earlier" ? "resolved_overlap_earlier" : "resolved_overlap_later",
      warnings: [`民用时间位于 DST 重叠区间；已按显式 ${policy} 策略选择${policy === "earlier" ? "较早" : "较晚"}瞬时点。`]
    };
  }

  return {
    selected,
    status: policy === "earlier" ? "shifted_gap_earlier" : "shifted_gap_later",
    warnings: [
      `民用时间位于 DST 空档；已按显式 ${policy} 策略将活动墙上时间调整为 ${selected.value.resolvedWallTime}，原输入仍单独保留。`
    ]
  };
}

function roundMinutes(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * NOAA Global Monitoring Laboratory fractional-year approximation.
 * It is suitable for a transparent solar-clock preview, not ephemeris work.
 */
export function calculateNoaaEquationOfTimeMinutes(dateTime: Temporal.PlainDateTime): number {
  const fractionalHour =
    dateTime.hour +
    dateTime.minute / 60 +
    dateTime.second / 3_600 +
    dateTime.millisecond / 3_600_000;
  const gamma = (2 * Math.PI / 365) * (dateTime.dayOfYear - 1 + (fractionalHour - 12) / 24);
  return 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );
}

function addCorrectionMinutes(dateTime: Temporal.PlainDateTime, correctionMinutes: number): Temporal.PlainDateTime {
  return dateTime.add({ seconds: Math.round(correctionMinutes * 60) });
}

function buildSolarTimeDetails(
  input: BirthInput,
  candidates: InternalCandidate[],
  selected: InternalCandidate | null
): SolarTimeDetails | null {
  const { latitude, longitude } = input.location;
  if (latitude === null || longitude === null) return null;

  let crossedCivilDate = false;
  const variants: SolarTimeVariant[] = candidates.map((candidate) => {
    const source = candidate.resolvedDateTime;
    const longitudeCorrection = 4 * longitude - candidate.value.utcOffsetMinutes;
    const equationOfTime = calculateNoaaEquationOfTimeMinutes(source);
    const totalCorrection = longitudeCorrection + equationOfTime;
    const meanSolar = addCorrectionMinutes(source, longitudeCorrection);
    const apparentSolar = addCorrectionMinutes(source, totalCorrection);
    const sourceDate = source.toPlainDate().toString();
    if (meanSolar.toPlainDate().toString() !== sourceDate || apparentSolar.toPlainDate().toString() !== sourceDate) {
      crossedCivilDate = true;
    }

    return {
      candidateChoice: candidate.value.choice,
      sourceInstant: candidate.value.instant,
      sourceUtcOffset: candidate.value.utcOffset,
      sourceWallTime: candidate.value.resolvedWallTime,
      meanSolarDateTime: meanSolar.toString({ smallestUnit: "second" }),
      apparentSolarDateTime: apparentSolar.toString({ smallestUnit: "second" }),
      longitudeCorrectionMinutes: roundMinutes(longitudeCorrection),
      equationOfTimeMinutes: roundMinutes(equationOfTime),
      totalCorrectionMinutes: roundMinutes(totalCorrection)
    };
  });

  const warnings = [
    "地方平太阳时按经度与候选 UTC 偏移换算；视太阳时额外使用 NOAA GML 分数年均时差近似公式。",
    "太阳时仅作并列预览，未应用到活动命盘；该近似模型不能替代天文历表或项目金标准。"
  ];
  if (crossedCivilDate) warnings.push("至少一个太阳时预览跨越了民用日期边界，请按完整日期而非只看钟点比较。");

  return {
    modelId: SOLAR_TIME_MODEL_ID,
    latitude,
    longitude,
    applied: false,
    selectedVariantChoice: selected?.value.choice ?? null,
    variants,
    warnings
  };
}

/**
 * Normalize one exact Gregorian or lunar-origin wall time without changing the
 * birth input. Lunar input is first resolved to an explicit Gregorian date and
 * both sides of that conversion are retained in calendarResolution.
 * `reject` always returns a null selected instant for overlaps and gaps.
 */
export function normalizeBirthTimeWithResolver(
  rawInput: BirthInput,
  rawPolicy: DstDisambiguationPolicy,
  resolver: Pick<BundledTzdbResolver, "resolveLocalEpochMilliseconds">
): NormalizedTimeCalibration {
  const resolvedCalendar = resolveBirthCalendarInput(rawInput);
  const input = resolvedCalendar.effectiveGregorianInput;
  const policy = dstDisambiguationPolicySchema.parse(rawPolicy);

  if ((input.timePrecision !== "exact_minute" && input.timePrecision !== "exact_second") || input.time === null) {
    throw new TimeNormalizationError("MISSING_EXACT_TIME", "时间归一化需要一个明确到分钟或秒的民用时间；未知时辰必须走候选盘流程。 ");
  }

  const requested = Temporal.PlainDateTime.from(requestedWallTime(input));
  const resolution = resolveCandidates(requested, input.timeZone, resolver);
  const selection = selectCandidate(resolution.kind, resolution.candidates, policy);
  const solarTime = buildSolarTimeDetails(input, resolution.candidates, selection.selected);
  const selectedSolar = selection.selected && solarTime
    ? solarTime.variants.find((variant) => variant.candidateChoice === selection.selected?.value.choice) ?? null
    : null;
  const warnings = [
    ...resolvedCalendar.calendarResolution.warnings,
    ...selection.warnings,
    ...(solarTime?.warnings ?? [])
  ];
  if ((input.location.latitude === null) !== (input.location.longitude === null)) {
    warnings.push("经纬度不完整，未生成太阳时预览；需要同时提供纬度和经度。 ");
  }

  return normalizedTimeCalibrationSchema.parse({
    schemaVersion: input.schemaVersion,
    originalCivilDateTime: requested.toString({ smallestUnit: "second" }),
    activeWallTime: selection.selected?.value.resolvedWallTime ?? requested.toString({ smallestUnit: "second" }),
    timeZone: input.timeZone,
    utcInstant: selection.selected?.value.instant ?? null,
    utcOffset: selection.selected?.value.utcOffset ?? null,
    dstStatus: selection.selected ? "resolved" : "unresolved",
    solarTimePreview: selectedSolar?.apparentSolarDateTime ?? null,
    solarTimeApplied: false,
    normalizationStatus: selection.selected ? "instant_resolved" : "wall_time_only",
    warnings,
    calendarResolution: resolvedCalendar.calendarResolution,
    timeZoneResolution: {
      kind: resolution.kind,
      policy,
      status: selection.status,
      requestedWallTime: requested.toString({ smallestUnit: "second" }),
      candidates: resolution.candidates.map((candidate) => candidate.value),
      selectedCandidate: selection.selected?.value ?? null
    },
    solarTime
  });
}

export function normalizeBirthTime(
  rawInput: BirthInput,
  rawPolicy: DstDisambiguationPolicy
): NormalizedTimeCalibration {
  return normalizeBirthTimeWithResolver(rawInput, rawPolicy, { resolveLocalEpochMilliseconds });
}

export type BundledSnapshotBirthTimeNormalization = {
  timeZoneDatabase: TimeZoneDatabaseSnapshot;
  timeCalibration: NormalizedTimeCalibration;
};

/**
 * Deterministic bundled-snapshot calculation for parallel research replay.
 * It does not imply that the result was originally calculated in the past.
 */
export async function normalizeBirthTimeForBundledSnapshot(
  rawInput: BirthInput,
  rawPolicy: DstDisambiguationPolicy,
  snapshotId: string,
  expectedTimeZoneDatabase?: TimeZoneDatabaseSnapshot
): Promise<BundledSnapshotBirthTimeNormalization> {
  const context = await loadBundledTimeZoneCalculationContext(snapshotId, expectedTimeZoneDatabase);
  return {
    timeZoneDatabase: context.timeZoneDatabase,
    timeCalibration: normalizeBirthTimeWithResolver(rawInput, rawPolicy, context.resolver)
  };
}
