import {
  VedicBrowserInputBoundaryError,
  captureVedicBrowserStrictData,
  deepFreezeVedicBrowserData,
  requireVedicBrowserExactKeys,
  requireVedicBrowserRecord,
  sha256VedicBrowserCanonical,
  type VedicBrowserStrictData
} from "./protocol.ts";

export const VEDIC_BROWSER_INPUT_PROJECTION_VERSION =
  "hakimi.vedic-civil-time-resolution-input-projection/0.1-draft" as const;
export const VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION =
  "hakimi.vedic.proleptic-gregorian/0.1-draft" as const;
export const VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION =
  "hakimi.vedic.exact-wall-time/0.1-draft" as const;
export const VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID =
  "hakimi.vedic.birth-time-uncertainty.exact" as const;
export const VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION = "0.1-draft" as const;
export const VEDIC_BROWSER_DST_POLICY_VERSION =
  "hakimi.vedic.dst-overlap-policy/0.1-draft" as const;
export const VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID =
  "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3" as const;

const VEDIC_BROWSER_REQUEST_SHA256_DOMAIN =
  "hakimi/vedic-civil-time-fact-browser-draft/prepared-request/v1";

const numberIsInteger = Number.isInteger;
const numberIsSafeInteger = Number.isSafeInteger;
const reflectApply = Reflect.apply;
const regexpExec = RegExp.prototype.exec;

export type VedicBrowserDstPolicyId =
  | "vedic_adapter_draft_reject"
  | "vedic_adapter_draft_earlier"
  | "vedic_adapter_draft_later";

export type PreparedVedicCivilTimeBrowserRequest = Readonly<{
  projectionVersion: typeof VEDIC_BROWSER_INPUT_PROJECTION_VERSION;
  civil_calendar_and_date: Readonly<{
    calendar_id: "proleptic_gregorian";
    calendar_version: typeof VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION;
    year: number;
    month: number;
    day: number;
  }>;
  local_wall_time_and_precision: Readonly<{
    wall_time_text: string;
    precision_id: "exact_minute" | "exact_second";
    precision_version: typeof VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION;
  }>;
  birth_time_uncertainty_interval_or_candidates: Readonly<{
    representation: "exact";
    model_id: typeof VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID;
    model_version: typeof VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION;
  }>;
  iana_time_zone_and_tzdb_identity: Readonly<{
    iana_time_zone_id: string;
    tzdb_version: "2026c";
    tzdb_snapshot_id: typeof VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID;
  }>;
  dst_ambiguity_policy: Readonly<{
    policy_id: VedicBrowserDstPolicyId;
    policy_version: typeof VEDIC_BROWSER_DST_POLICY_VERSION;
  }>;
}>;

function fail(code: string): never {
  throw new VedicBrowserInputBoundaryError(code);
}

function requireString(
  value: VedicBrowserStrictData | undefined,
  code: string,
  maximumLength: number
): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximumLength) {
    return fail(code);
  }
  return value;
}

function requireInteger(value: VedicBrowserStrictData | undefined, code: string): number {
  if (
    typeof value !== "number" ||
    !reflectApply(numberIsInteger, Number, [value]) ||
    !reflectApply(numberIsSafeInteger, Number, [value])
  ) {
    return fail(code);
  }
  return value;
}

function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function requireGregorianDate(
  calendar: { [key: string]: VedicBrowserStrictData }
): { year: number; month: number; day: number } {
  const year = requireInteger(calendar.year, "VEDIC_BROWSER_GREGORIAN_DATE_INVALID");
  const month = requireInteger(calendar.month, "VEDIC_BROWSER_GREGORIAN_DATE_INVALID");
  const day = requireInteger(calendar.day, "VEDIC_BROWSER_GREGORIAN_DATE_INVALID");
  if (
    year < 0 ||
    year > 9_999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInGregorianMonth(year, month)
  ) {
    return fail("VEDIC_BROWSER_GREGORIAN_DATE_INVALID");
  }
  return { year, month, day };
}

function requireWallTime(
  text: VedicBrowserStrictData | undefined,
  precision: VedicBrowserStrictData | undefined
): { wall_time_text: string; precision_id: "exact_minute" | "exact_second" } {
  const wallTimeText = requireString(text, "VEDIC_BROWSER_WALL_TIME_INVALID", 8);
  if (precision !== "exact_minute" && precision !== "exact_second") {
    return fail("VEDIC_BROWSER_WALL_TIME_INVALID");
  }
  const pattern = precision === "exact_minute"
    ? /^(\d{2}):(\d{2})$/
    : /^(\d{2}):(\d{2}):(\d{2})$/;
  const match = reflectApply(regexpExec, pattern, [wallTimeText]) as RegExpExecArray | null;
  if (match === null) return fail("VEDIC_BROWSER_WALL_TIME_INVALID");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = precision === "exact_second" ? Number(match[3]) : 0;
  if (hour > 23 || minute > 59 || second > 59) {
    return fail("VEDIC_BROWSER_WALL_TIME_INVALID");
  }
  return { wall_time_text: wallTimeText, precision_id: precision };
}

function parsePreparedRequest(
  snapshot: VedicBrowserStrictData
): PreparedVedicCivilTimeBrowserRequest {
  const root = requireVedicBrowserRecord(snapshot, "VEDIC_BROWSER_INPUT_ROOT_INVALID");
  requireVedicBrowserExactKeys(root, [
    "birth_time_uncertainty_interval_or_candidates",
    "civil_calendar_and_date",
    "dst_ambiguity_policy",
    "iana_time_zone_and_tzdb_identity",
    "local_wall_time_and_precision",
    "projectionVersion"
  ], "VEDIC_BROWSER_INPUT_ROOT_KEYS_INVALID");
  if (root.projectionVersion !== VEDIC_BROWSER_INPUT_PROJECTION_VERSION) {
    return fail("VEDIC_BROWSER_INPUT_PROJECTION_VERSION_INVALID");
  }

  const calendar = requireVedicBrowserRecord(
    root.civil_calendar_and_date,
    "VEDIC_BROWSER_CALENDAR_INVALID"
  );
  requireVedicBrowserExactKeys(calendar, [
    "calendar_id",
    "calendar_version",
    "day",
    "month",
    "year"
  ], "VEDIC_BROWSER_CALENDAR_KEYS_INVALID");
  if (
    calendar.calendar_id !== "proleptic_gregorian" ||
    calendar.calendar_version !== VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION
  ) {
    return fail("VEDIC_BROWSER_CALENDAR_VERSION_INVALID");
  }
  const date = requireGregorianDate(calendar);

  const wallTime = requireVedicBrowserRecord(
    root.local_wall_time_and_precision,
    "VEDIC_BROWSER_WALL_TIME_INVALID"
  );
  requireVedicBrowserExactKeys(wallTime, [
    "precision_id",
    "precision_version",
    "wall_time_text"
  ], "VEDIC_BROWSER_WALL_TIME_KEYS_INVALID");
  if (wallTime.precision_version !== VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION) {
    return fail("VEDIC_BROWSER_WALL_TIME_VERSION_INVALID");
  }
  const normalizedWallTime = requireWallTime(wallTime.wall_time_text, wallTime.precision_id);

  const uncertainty = requireVedicBrowserRecord(
    root.birth_time_uncertainty_interval_or_candidates,
    "VEDIC_BROWSER_UNCERTAINTY_INVALID"
  );
  requireVedicBrowserExactKeys(uncertainty, [
    "model_id",
    "model_version",
    "representation"
  ], "VEDIC_BROWSER_UNCERTAINTY_KEYS_INVALID");
  if (
    uncertainty.representation !== "exact" ||
    uncertainty.model_id !== VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID ||
    uncertainty.model_version !== VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION
  ) {
    return fail("VEDIC_BROWSER_EXACT_UNCERTAINTY_INVALID");
  }

  const zone = requireVedicBrowserRecord(
    root.iana_time_zone_and_tzdb_identity,
    "VEDIC_BROWSER_TZDB_INVALID"
  );
  requireVedicBrowserExactKeys(zone, [
    "iana_time_zone_id",
    "tzdb_snapshot_id",
    "tzdb_version"
  ], "VEDIC_BROWSER_TZDB_KEYS_INVALID");
  const ianaTimeZoneId = requireString(
    zone.iana_time_zone_id,
    "VEDIC_BROWSER_IANA_TIME_ZONE_ID_INVALID",
    200
  );
  if (
    zone.tzdb_version !== "2026c" ||
    zone.tzdb_snapshot_id !== VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID
  ) {
    return fail("VEDIC_BROWSER_TZDB_IDENTITY_INVALID");
  }

  const policy = requireVedicBrowserRecord(
    root.dst_ambiguity_policy,
    "VEDIC_BROWSER_DST_POLICY_INVALID"
  );
  requireVedicBrowserExactKeys(policy, [
    "policy_id",
    "policy_version"
  ], "VEDIC_BROWSER_DST_POLICY_KEYS_INVALID");
  if (
    policy.policy_version !== VEDIC_BROWSER_DST_POLICY_VERSION ||
    (
      policy.policy_id !== "vedic_adapter_draft_reject" &&
      policy.policy_id !== "vedic_adapter_draft_earlier" &&
      policy.policy_id !== "vedic_adapter_draft_later"
    )
  ) {
    return fail("VEDIC_BROWSER_DST_POLICY_INVALID");
  }

  return deepFreezeVedicBrowserData({
    projectionVersion: VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
    civil_calendar_and_date: {
      calendar_id: "proleptic_gregorian" as const,
      calendar_version: VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
      year: date.year,
      month: date.month,
      day: date.day
    },
    local_wall_time_and_precision: {
      wall_time_text: normalizedWallTime.wall_time_text,
      precision_id: normalizedWallTime.precision_id,
      precision_version: VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION
    },
    birth_time_uncertainty_interval_or_candidates: {
      representation: "exact" as const,
      model_id: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
      model_version: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION
    },
    iana_time_zone_and_tzdb_identity: {
      iana_time_zone_id: ianaTimeZoneId,
      tzdb_version: "2026c" as const,
      tzdb_snapshot_id: VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID
    },
    dst_ambiguity_policy: {
      policy_id: policy.policy_id,
      policy_version: VEDIC_BROWSER_DST_POLICY_VERSION
    }
  });
}

export async function prepareVedicCivilTimeBrowserRequest(
  raw: unknown
): Promise<{
  request: PreparedVedicCivilTimeBrowserRequest;
  requestSha256: string;
}> {
  const snapshot = captureVedicBrowserStrictData(raw);
  const request = parsePreparedRequest(snapshot);
  const requestSha256 = await sha256VedicBrowserCanonical(
    VEDIC_BROWSER_REQUEST_SHA256_DOMAIN,
    request
  );
  return deepFreezeVedicBrowserData({ request, requestSha256 });
}
