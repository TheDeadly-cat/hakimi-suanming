import { Temporal } from "@js-temporal/polyfill";
import { Lunar, Solar } from "lunar-typescript";
import {
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  birthInputSchema,
  calendarResolutionSchema,
  createBirthInputSchemaForTimeZoneName,
  createEventTimeContextSchemaForTimeZoneName,
  createNormalizedTimeCalibrationSchemaForTimeZoneName,
  dstDisambiguationPolicySchema,
  eventDatePrecisionSchema,
  eventMinuteLocalDateTimeSchema,
  eventTimeContextSchema,
  eventZonedMinuteBoundarySchema,
  normalizedTimeCalibrationSchema,
  storedBirthInputSchema,
  storedEventTimeContextSchema,
  timeZoneDatabaseSnapshotSchema,
  type BirthInput,
  type CalendarResolution,
  type DstDisambiguationPolicy,
  type EventDatePrecision,
  type EventTimeContext,
  type StoredEventTimeContext,
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
  isBundledTimeZoneName,
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

const MAX_EVENT_REPLAY_INPUT_DEPTH = 48;
const MAX_EVENT_REPLAY_INPUT_NODES = 4_096;
const MAX_EVENT_REPLAY_INPUT_TEXT_CHARACTERS = 128_000;

type EventReplayInputBudget = {
  nodes: number;
  textCharacters: number;
};

function claimEventReplayText(budget: EventReplayInputBudget, length: number): void {
  budget.textCharacters += length;
  if (budget.textCharacters > MAX_EVENT_REPLAY_INPUT_TEXT_CHARACTERS) {
    throw new TypeError("Event 时间复核输入文本总量超过安全上限。");
  }
}

/**
 * Takes one bounded declarative snapshot before an artifact loader can yield.
 * Shared DAGs are expanded and charged on every occurrence; only ancestor
 * cycles are rejected.
 */
function snapshotEventReplayInput(
  value: unknown,
  path = "EventTimeReplay",
  depth = 0,
  ancestors = new WeakSet<object>(),
  budget: EventReplayInputBudget = { nodes: 0, textCharacters: 0 }
): unknown {
  if (depth > MAX_EVENT_REPLAY_INPUT_DEPTH) {
    throw new TypeError(`Event 时间复核输入超过最大深度 ${MAX_EVENT_REPLAY_INPUT_DEPTH}。`);
  }
  budget.nodes += 1;
  if (budget.nodes > MAX_EVENT_REPLAY_INPUT_NODES) {
    throw new TypeError("Event 时间复核输入结构节点总量超过安全上限。");
  }
  if (typeof value === "string") {
    claimEventReplayText(budget, value.length);
    return value;
  }
  if (value === null || value === undefined || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} 包含非有限数字。`);
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} 包含非声明式值。`);
  }
  if (ancestors.has(value)) throw new TypeError(`${path} 包含循环引用。`);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} 不能包含 Symbol 属性。`);
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (
        !lengthDescriptor || !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
      ) {
        throw new TypeError(`${path}.length 不是声明式数组长度。`);
      }
      const length = lengthDescriptor.value as number;
      if (length > MAX_EVENT_REPLAY_INPUT_NODES - budget.nodes) {
        throw new TypeError("Event 时间复核数组槽位超过安全上限。");
      }
      const propertyNames = Object.getOwnPropertyNames(value);
      if (propertyNames.length !== length + 1) {
        throw new TypeError(`${path} 必须是稠密且没有自定义字段的数组。`);
      }
      const output = new Array<unknown>(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError(`${path}[${index}] 必须是声明式数据项。`);
        }
        output[index] = snapshotEventReplayInput(
          descriptor.value,
          `${path}[${index}]`,
          depth + 1,
          ancestors,
          budget
        );
      }
      return output;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} 必须是普通声明式对象。`);
    }
    const propertyNames = Object.getOwnPropertyNames(value);
    if (propertyNames.length > MAX_EVENT_REPLAY_INPUT_NODES - budget.nodes) {
      throw new TypeError("Event 时间复核对象字段超过安全上限。");
    }
    const output: Record<string, unknown> = {};
    for (const key of propertyNames) {
      claimEventReplayText(budget, key.length);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError(`${path} 必须仅包含可枚举声明式数据字段。`);
      }
      Object.defineProperty(output, key, {
        value: snapshotEventReplayInput(
          descriptor.value,
          `${path}.${key}`,
          depth + 1,
          ancestors,
          budget
        ),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    ancestors.delete(value);
  }
}

function deepFreezeEventReplayValue<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    if (Array.isArray(value) && key === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) deepFreezeEventReplayValue(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function declarativeEventReplaySnapshot<T>(value: T): T {
  return deepFreezeEventReplayValue(snapshotEventReplayInput(value)) as T;
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
  const request = declarativeEventReplaySnapshot({ snapshotId, expectedTimeZoneDatabase });
  if (typeof request.snapshotId !== "string" || request.snapshotId.length > 300) {
    throw new TimeNormalizationError("TZDB_ARTIFACT_UNAVAILABLE", "请求的时区工件标识无效。");
  }
  const requestedSnapshotId = request.snapshotId;
  const expectedDescriptor = request.expectedTimeZoneDatabase === undefined
    ? undefined
    : timeZoneDatabaseSnapshotSchema.safeParse(request.expectedTimeZoneDatabase);
  if (expectedDescriptor && !expectedDescriptor.success) {
    throw new TimeNormalizationError(
      "TZDB_SNAPSHOT_MISMATCH",
      "请求的完整时区描述符不符合冻结契约。"
    );
  }
  const registered = getBundledTzdbArtifactSnapshot(requestedSnapshotId);
  if (!registered) {
    throw new TimeNormalizationError(
      "TZDB_ARTIFACT_UNAVAILABLE",
      `应用未保留时区工件 ${requestedSnapshotId}，不能用当前版本替代并列复算。`
    );
  }
  const registeredDescriptor = timeZoneDatabaseSnapshotSchema.safeParse(registered);
  if (!registeredDescriptor.success) {
    throw new TimeNormalizationError(
      "TZDB_SNAPSHOT_MISMATCH",
      `随包工件 ${requestedSnapshotId} 的注册描述符不符合冻结契约。`
    );
  }
  const timeZoneDatabase = registeredDescriptor.data;
  if (expectedDescriptor !== undefined) {
    if (JSON.stringify(expectedDescriptor.data) !== JSON.stringify(timeZoneDatabase)) {
      throw new TimeNormalizationError(
        "TZDB_SNAPSHOT_MISMATCH",
        "请求的完整时区描述符与随包工件注册表不一致。"
      );
    }
  }
  try {
    const resolver = await loadBundledTzdbResolver(requestedSnapshotId);
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
        ? `时区工件 ${requestedSnapshotId} 与其冻结描述符不一致。`
        : `无法加载时区工件 ${requestedSnapshotId}；不会改用其他版本。`,
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
type BirthInputSchemaLike = Pick<typeof birthInputSchema, "parse" | "safeParse">;

function resolveBirthCalendarInputWithSchema(
  rawInput: BirthInput,
  inputSchema: BirthInputSchemaLike
): ResolvedBirthCalendarInput {
  const originalInput = inputSchema.parse(rawInput);
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

  const effectiveResult = inputSchema.safeParse({
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

export function resolveBirthCalendarInput(rawInput: BirthInput): ResolvedBirthCalendarInput {
  return resolveBirthCalendarInputWithSchema(rawInput, birthInputSchema);
}

export function resolveBirthCalendarInputWithResolver(
  rawInput: BirthInput,
  resolver: Pick<BundledTzdbResolver, "isTimeZoneName">
): ResolvedBirthCalendarInput {
  return resolveBirthCalendarInputWithSchema(
    rawInput,
    createBirthInputSchemaForTimeZoneName(resolver.isTimeZoneName)
  );
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

export type VerifyStoredEventTimeContextInput = Pick<
  ResolveEventTimeContextInput,
  "datePrecision" | "startDate" | "endDate"
> & {
  timeContext: StoredEventTimeContext;
};

function requireEventDateValue(value: unknown, field: "startDate" | "endDate"): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 16) {
    throw new TimeNormalizationError("INVALID_CIVIL_MINUTE", `${field} 不是有界事件日期文本。`);
  }
  return value;
}

function requireExactEventReplayKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: readonly string[]
): void {
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.has(key)) || required.some((key) => !keys.includes(key))) {
    throw new TypeError("Event 时间复核输入字段不符合严格契约。");
  }
}

const RESOLVE_EVENT_REPLAY_KEYS = new Set([
  "datePrecision",
  "startDate",
  "endDate",
  "timeZone",
  "startDisambiguation",
  "endDisambiguation"
]);

function snapshotResolveEventTimeContextInput(rawInput: unknown): ResolveEventTimeContextInput {
  const snapshot = declarativeEventReplaySnapshot(rawInput);
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("Event 时间解析输入必须是声明式对象。");
  }
  const record = snapshot as Record<string, unknown>;
  requireExactEventReplayKeys(
    record,
    RESOLVE_EVENT_REPLAY_KEYS,
    ["datePrecision", "startDate", "endDate"]
  );
  const datePrecision = eventDatePrecisionSchema.parse(record.datePrecision);
  const startDate = requireEventDateValue(record.startDate, "startDate");
  const endDate = requireEventDateValue(record.endDate, "endDate");
  const timeZone = record.timeZone === undefined
    ? undefined
    : typeof record.timeZone === "string" && record.timeZone.length > 0 && record.timeZone.length <= 255
      ? record.timeZone
      : (() => { throw new TimeNormalizationError("INVALID_TIME_ZONE", "事件 IANA 时区名称无效。"); })();
  const startDisambiguation = record.startDisambiguation === undefined
    ? undefined
    : dstDisambiguationPolicySchema.parse(record.startDisambiguation);
  const endDisambiguation = record.endDisambiguation === undefined
    ? undefined
    : dstDisambiguationPolicySchema.parse(record.endDisambiguation);
  return deepFreezeEventReplayValue({
    datePrecision,
    startDate,
    endDate,
    ...(timeZone === undefined ? {} : { timeZone }),
    ...(startDisambiguation === undefined ? {} : { startDisambiguation }),
    ...(endDisambiguation === undefined ? {} : { endDisambiguation })
  });
}

function snapshotVerifyEventTimeContextInput(rawInput: unknown): VerifyStoredEventTimeContextInput {
  const snapshot = declarativeEventReplaySnapshot(rawInput);
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("Event 时间复核输入必须是声明式对象。");
  }
  const record = snapshot as Record<string, unknown>;
  requireExactEventReplayKeys(
    record,
    new Set(["datePrecision", "startDate", "endDate", "timeContext"]),
    ["datePrecision", "startDate", "endDate", "timeContext"]
  );
  return deepFreezeEventReplayValue({
    datePrecision: eventDatePrecisionSchema.parse(record.datePrecision),
    startDate: requireEventDateValue(record.startDate, "startDate"),
    endDate: requireEventDateValue(record.endDate, "endDate"),
    timeContext: storedEventTimeContextSchema.parse(record.timeContext)
  });
}

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
    { isTimeZoneName: isBundledTimeZoneName, resolveLocalEpochMilliseconds }
  );
}

function resolveEventTimeContextWithResolver(
  input: ResolveEventTimeContextInput,
  timeZoneDatabase: TimeZoneDatabaseSnapshot,
  resolver: Pick<BundledTzdbResolver, "isTimeZoneName" | "resolveLocalEpochMilliseconds">
): EventTimeContext {
  const outputSchema = createEventTimeContextSchemaForTimeZoneName(resolver.isTimeZoneName);
  const datePrecision = eventDatePrecisionSchema.parse(input.datePrecision);
  if (datePrecision !== "minute") return outputSchema.parse({ kind: "calendar_date" });
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
  return outputSchema.parse({
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
  snapshotId: string,
  expectedTimeZoneDatabase?: TimeZoneDatabaseSnapshot
): Promise<EventTimeContext> {
  const frozenInput = snapshotResolveEventTimeContextInput(input);
  const frozenSnapshotId = declarativeEventReplaySnapshot(snapshotId);
  if (typeof frozenSnapshotId !== "string" || frozenSnapshotId.length > 300) {
    throw new TimeNormalizationError("TZDB_ARTIFACT_UNAVAILABLE", "请求的时区工件标识无效。");
  }
  const frozenDescriptor = expectedTimeZoneDatabase === undefined
    ? undefined
    : timeZoneDatabaseSnapshotSchema.parse(
        declarativeEventReplaySnapshot(expectedTimeZoneDatabase)
      );
  try {
    const context = await loadBundledTimeZoneCalculationContext(frozenSnapshotId, frozenDescriptor);
    return resolveEventTimeContextWithResolver(
      frozenInput,
      context.timeZoneDatabase,
      context.resolver
    );
  } catch (cause) {
    if (cause instanceof TimeNormalizationError) throw cause;
    throw new TimeNormalizationError(
      "TZDB_ARTIFACT_UNAVAILABLE",
      `无法加载时区工件 ${frozenSnapshotId}；历史记录保持只读且不会改用其他版本。`,
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
  const frozenInput = snapshotVerifyEventTimeContextInput(input);
  const actual = frozenInput.timeContext;
  if (actual.kind === "legacy_floating") return actual;
  if (actual.kind === "zoned_minute") {
    const replayStatus = classifyStoredTimeZoneDatabaseForReplay(actual);
    if (replayStatus === "descriptor_mismatch") {
      throw new TimeNormalizationError(
        "TZDB_SNAPSHOT_MISMATCH",
        "事件保存的完整时区描述符与内容寻址工件注册表不一致。"
      );
    }
    if (replayStatus !== "current_exact") {
      // A synchronous caller can preserve this structural record, but must not
      // treat its stored instant as exact replay evidence.
      return actual;
    }
  }
  const expected = actual.kind === "calendar_date"
    ? resolveEventTimeContext({
        datePrecision: frozenInput.datePrecision,
        startDate: frozenInput.startDate,
        endDate: frozenInput.endDate
      })
    : resolveEventTimeContext({
        datePrecision: frozenInput.datePrecision,
        startDate: frozenInput.startDate,
        endDate: frozenInput.endDate,
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

export type EventTimeContextVerificationStatus =
  | "exact_current"
  | "exact_retained"
  | "structural_legacy_floating"
  | "structural_calendar_date"
  | "structural_legacy_unidentified"
  | "structural_artifact_unavailable";

export type EventTimeContextVerification = Readonly<{
  status: EventTimeContextVerificationStatus;
  timeContext: StoredEventTimeContext;
}>;

function eventTimeContextVerification(
  status: EventTimeContextVerificationStatus,
  timeContext: StoredEventTimeContext
): EventTimeContextVerification {
  return deepFreezeEventReplayValue({ status, timeContext });
}

/**
 * Structurally reads every stored Event context, then performs exact replay
 * whenever its content-addressed artifact is bundled. Missing historical bytes
 * remain explicit structural evidence; descriptor conflicts never degrade.
 */
export async function verifyStoredEventTimeContextWithBundledArtifact(
  input: VerifyStoredEventTimeContextInput
): Promise<EventTimeContextVerification> {
  const frozenInput = snapshotVerifyEventTimeContextInput(input);
  const actual = frozenInput.timeContext;
  if (actual.kind === "legacy_floating") {
    return eventTimeContextVerification("structural_legacy_floating", actual);
  }
  if (actual.kind === "calendar_date") {
    const expected = resolveEventTimeContext({
      datePrecision: frozenInput.datePrecision,
      startDate: frozenInput.startDate,
      endDate: frozenInput.endDate
    });
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new TimeNormalizationError(
        "EVENT_TIME_CONTEXT_MISMATCH",
        "日历事件时间上下文与其日期精度不一致。"
      );
    }
    return eventTimeContextVerification("structural_calendar_date", actual);
  }

  const replayStatus = classifyStoredTimeZoneDatabaseForReplay(actual);
  if (replayStatus === "legacy_unidentified") {
    return eventTimeContextVerification("structural_legacy_unidentified", actual);
  }
  if (replayStatus === "artifact_unavailable") {
    return eventTimeContextVerification("structural_artifact_unavailable", actual);
  }
  if (replayStatus === "descriptor_mismatch" || actual.timeZoneDatabase === undefined) {
    throw new TimeNormalizationError(
      "TZDB_SNAPSHOT_MISMATCH",
      "事件保存的完整时区描述符与内容寻址工件注册表不一致。"
    );
  }

  const calculationContext = await loadBundledTimeZoneCalculationContext(
    actual.tzdbVersion,
    actual.timeZoneDatabase
  );
  try {
    createEventTimeContextSchemaForTimeZoneName(calculationContext.resolver.isTimeZoneName)
      .parse(actual);
  } catch (cause) {
    throw new TimeNormalizationError(
      "INVALID_TIME_ZONE",
      "事件保存的时区名称不属于其冻结 resolver。",
      { cause }
    );
  }
  const expected = resolveEventTimeContextWithResolver({
    datePrecision: frozenInput.datePrecision,
    startDate: frozenInput.startDate,
    endDate: frozenInput.endDate,
    timeZone: actual.timeZone,
    startDisambiguation: actual.start.resolution.policy,
    ...(actual.end === null ? {} : { endDisambiguation: actual.end.resolution.policy })
  }, calculationContext.timeZoneDatabase, calculationContext.resolver);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TimeNormalizationError(
      "EVENT_TIME_CONTEXT_MISMATCH",
      "事件时间上下文无法由其冻结 IANA 工件、民用时间与 DST 决策完整复算。"
    );
  }
  return eventTimeContextVerification(
    replayStatus === "current_exact" ? "exact_current" : "exact_retained",
    actual
  );
}

/**
 * Compatibility exact-verification API. It keeps legacy/calendar behavior, but
 * rejects zoned contexts whose exact artifact is unavailable or unidentified.
 */
export async function verifyEventTimeContextWithBundledArtifact(
  input: VerifyEventTimeContextInput
): Promise<EventTimeContext> {
  const result = await verifyStoredEventTimeContextWithBundledArtifact(input);
  if (result.status === "structural_legacy_unidentified") {
    throw new TimeNormalizationError(
      "TZDB_LEGACY_UNIDENTIFIED",
      "事件使用未识别的历史浏览器时区库，不能执行 exact replay。"
    );
  }
  if (result.status === "structural_artifact_unavailable") {
    const context = result.timeContext;
    throw new TimeNormalizationError(
      "TZDB_ARTIFACT_UNAVAILABLE",
      context.kind === "zoned_minute"
        ? `事件绑定的时区工件 ${context.tzdbVersion} 未随应用保留，不能执行历史复算。`
        : "事件绑定的时区工件未随应用保留，不能执行历史复算。"
    );
  }
  return result.timeContext;
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
type NormalizedTimeCalibrationSchemaLike = {
  parse(raw: unknown): NormalizedTimeCalibration;
};

function normalizeBirthTimeWithSchemas(
  rawInput: BirthInput,
  rawPolicy: DstDisambiguationPolicy,
  resolver: Pick<BundledTzdbResolver, "resolveLocalEpochMilliseconds">,
  inputSchema: BirthInputSchemaLike,
  outputSchema: NormalizedTimeCalibrationSchemaLike
): NormalizedTimeCalibration {
  const resolvedCalendar = resolveBirthCalendarInputWithSchema(rawInput, inputSchema);
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

  return outputSchema.parse({
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

export function normalizeBirthTimeWithResolver(
  rawInput: BirthInput,
  rawPolicy: DstDisambiguationPolicy,
  resolver: Pick<BundledTzdbResolver, "isTimeZoneName" | "resolveLocalEpochMilliseconds">
): NormalizedTimeCalibration {
  return normalizeBirthTimeWithSchemas(
    rawInput,
    rawPolicy,
    resolver,
    createBirthInputSchemaForTimeZoneName(resolver.isTimeZoneName),
    createNormalizedTimeCalibrationSchemaForTimeZoneName(resolver.isTimeZoneName)
  );
}

export function normalizeBirthTime(
  rawInput: BirthInput,
  rawPolicy: DstDisambiguationPolicy
): NormalizedTimeCalibration {
  return normalizeBirthTimeWithSchemas(
    rawInput,
    rawPolicy,
    { resolveLocalEpochMilliseconds },
    birthInputSchema,
    normalizedTimeCalibrationSchema
  );
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
  const input = storedBirthInputSchema.parse(rawInput);
  const policy = dstDisambiguationPolicySchema.parse(rawPolicy);
  const expectedDescriptor = expectedTimeZoneDatabase === undefined
    ? undefined
    : timeZoneDatabaseSnapshotSchema.parse(expectedTimeZoneDatabase);
  const context = await loadBundledTimeZoneCalculationContext(snapshotId, expectedDescriptor);
  return {
    timeZoneDatabase: context.timeZoneDatabase,
    timeCalibration: normalizeBirthTimeWithResolver(input, policy, context.resolver)
  };
}
