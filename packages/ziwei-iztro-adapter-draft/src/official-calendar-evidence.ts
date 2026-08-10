import { createHash } from "node:crypto";

export const HKO_CALENDAR_MATRIX_FORMAT =
  "hakimi-ziwei-official-calendar-boundary-matrix/0.1-draft" as const;

export const HKO_CALENDAR_MATRIX_COLUMNS = [
  "boundaryId",
  "kind",
  "before:[gregorianDate,lunarYear,lunarMonth,lunarDay,isLeapMonth]",
  "after:[gregorianDate,lunarYear,lunarMonth,lunarDay,isLeapMonth]"
] as const;

const HKO_HEADER = [
  "Gregorian Date",
  "Chinese year (Gan-Zhi)",
  "Chinese year (Zodiac)",
  "Lunar month",
  "Lunar Date"
] as const;

const MONTH_ABBREVIATIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
] as const;

const LUNAR_MONTHS = new Map<string, number>([
  ["正月", 1], ["二月", 2], ["三月", 3], ["四月", 4],
  ["五月", 5], ["六月", 6], ["七月", 7], ["八月", 8],
  ["九月", 9], ["十月", 10], ["十一月", 11], ["十二月", 12]
]);

const LUNAR_DAYS = new Map<string, number>([
  ["初一", 1], ["初二", 2], ["初三", 3], ["初四", 4], ["初五", 5],
  ["初六", 6], ["初七", 7], ["初八", 8], ["初九", 9], ["初十", 10],
  ["十一", 11], ["十二", 12], ["十三", 13], ["十四", 14], ["十五", 15],
  ["十六", 16], ["十七", 17], ["十八", 18], ["十九", 19], ["二十", 20],
  ["廿一", 21], ["廿二", 22], ["廿三", 23], ["廿四", 24], ["廿五", 25],
  ["廿六", 26], ["廿七", 27], ["廿八", 28], ["廿九", 29], ["三十", 30]
]);

const ZODIACS = new Set(["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"]);

export type HkoLineEnding = "LF" | "CRLF";
export type HkoBoundaryKind =
  | "lunar_new_year"
  | "ordinary_month_transition"
  | "leap_month_start"
  | "leap_month_end";

export type HkoCalendarEvidenceErrorCode =
  | "HTTP_STATUS"
  | "RESOURCE_NOT_AVAILABLE"
  | "EMPTY_RESOURCE"
  | "INVALID_UTF8"
  | "INVALID_LINE_ENDING"
  | "INVALID_HEADER"
  | "INVALID_ROW"
  | "INVALID_GREGORIAN_DATE"
  | "INVALID_LUNAR_MONTH"
  | "INVALID_LUNAR_DAY"
  | "INVALID_CHINESE_YEAR"
  | "INVALID_ZODIAC"
  | "INCOMPLETE_YEAR"
  | "NON_CONTIGUOUS_DATE"
  | "INVALID_LUNAR_NEW_YEAR"
  | "INVALID_LUNAR_SEQUENCE"
  | "RESOURCE_IDENTITY_MISMATCH"
  | "INVALID_MATRIX_ARTIFACT"
  | "BOUNDARY_MATRIX_MISMATCH";

export class HkoCalendarEvidenceError extends Error {
  readonly code: HkoCalendarEvidenceErrorCode;

  constructor(code: HkoCalendarEvidenceErrorCode, message: string) {
    super(message);
    this.name = "HkoCalendarEvidenceError";
    this.code = code;
  }
}

export interface HkoNormalizedLunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

export interface HkoCalendarRow {
  sourceLine: number;
  rawGregorianDate: string;
  gregorianDate: string;
  rawChineseYearGanzhi: string;
  rawChineseYearZodiac: string;
  rawLunarMonth: string;
  rawLunarDay: string;
  lunarDate: HkoNormalizedLunarDate;
}

export type HkoBoundaryDateTuple = [string, number, number, number, boolean];
export type HkoBoundaryMatrixRow = [
  boundaryId: string,
  kind: HkoBoundaryKind,
  before: HkoBoundaryDateTuple,
  after: HkoBoundaryDateTuple
];

export interface HkoAnnualResourceLock {
  year: number;
  resourceUrl: string;
  expectedHttpStatus: 200;
  resourceBytes: number;
  resourceSha256: string;
  encoding: "utf-8";
  hasUtf8Bom: boolean;
  lineEnding: HkoLineEnding;
  rowCount: number;
  boundaryCount: number;
}

export interface HkoCalendarBoundaryMatrixArtifact {
  format: typeof HKO_CALENDAR_MATRIX_FORMAT;
  claimScope: "calendar_resolution";
  civilDateOnly: true;
  productionEligible: false;
  expertTruthClaimed: false;
  source: {
    provider: "Hong Kong Observatory";
    publisher: "DATA.GOV.HK";
    datasetPage: string;
    termsUrl: string;
    retrievedAt: string;
    attribution: string;
  };
  engineeringContext: {
    sourceCivilZone: "Asia/Hong_Kong";
    utcOffsetReference: "+08:00";
    selectionRule: "all_adjacent_rows_with_after_lunar_day_1_within_each_annual_resource";
    notProven: string[];
  };
  matrixColumns: typeof HKO_CALENDAR_MATRIX_COLUMNS;
  annualResources: HkoAnnualResourceLock[];
  boundaryMatrix: HkoBoundaryMatrixRow[];
}

export interface DecodedHkoResponse {
  text: string;
  resourceBytes: number;
  resourceSha256: string;
  hasUtf8Bom: boolean;
  lineEnding: HkoLineEnding;
}

export interface ParsedHkoAnnualCalendar {
  year: number;
  rows: HkoCalendarRow[];
  resourceBytes: number;
  resourceSha256: string;
  hasUtf8Bom: boolean;
  lineEnding: HkoLineEnding;
}

export interface HkoCalendarRangeSeam {
  fromYear: number;
  toYear: number;
  before: HkoBoundaryDateTuple;
  after: HkoBoundaryDateTuple;
}

function fail(code: HkoCalendarEvidenceErrorCode, message: string): never {
  throw new HkoCalendarEvidenceError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function decodeHkoAnnualResponse(status: number, body: Uint8Array): DecodedHkoResponse {
  if (status !== 200) {
    fail("HTTP_STATUS", `HKO annual resource returned HTTP ${status}; expected 200.`);
  }
  if (body.byteLength === 0) {
    fail("EMPTY_RESOURCE", "HKO annual resource body is empty.");
  }

  const hasUtf8Bom = body.byteLength >= 3
    && body[0] === 0xef
    && body[1] === 0xbb
    && body[2] === 0xbf;
  const payload = hasUtf8Bom ? body.subarray(3) : body;
  let rawText: string;
  try {
    rawText = new TextDecoder("utf-8", { fatal: true }).decode(payload);
  } catch {
    fail("INVALID_UTF8", "HKO annual resource is not valid UTF-8.");
  }

  if (/^\s*Not Available\s*$/iu.test(rawText)) {
    fail("RESOURCE_NOT_AVAILABLE", "HKO returned HTTP 200 with a Not Available body.");
  }
  if (rawText.length === 0) {
    fail("EMPTY_RESOURCE", "HKO annual resource has no decoded text.");
  }
  if (rawText.includes("\r") && !rawText.includes("\r\n")) {
    fail("INVALID_LINE_ENDING", "Bare CR line endings are not accepted.");
  }

  const hasCrLf = rawText.includes("\r\n");
  const withoutCrLf = rawText.replaceAll("\r\n", "");
  if (hasCrLf && withoutCrLf.includes("\n")) {
    fail("INVALID_LINE_ENDING", "Mixed LF and CRLF line endings are not accepted.");
  }
  if (withoutCrLf.includes("\r")) {
    fail("INVALID_LINE_ENDING", "Bare CR characters are not accepted.");
  }
  if (!hasCrLf && !rawText.includes("\n")) {
    fail("INVALID_LINE_ENDING", "HKO annual resource must contain LF or CRLF records.");
  }

  return {
    text: hasCrLf ? rawText.replaceAll("\r\n", "\n") : rawText,
    resourceBytes: body.byteLength,
    resourceSha256: sha256(body),
    hasUtf8Bom,
    lineEnding: hasCrLf ? "CRLF" : "LF"
  };
}

export function parseStrictHkoGregorianDate(raw: string, expectedYear: number): string {
  if (!Number.isInteger(expectedYear) || expectedYear < 2000 || expectedYear > 2099) {
    fail("INVALID_GREGORIAN_DATE", `Expected year ${expectedYear} is outside the strict 2000..2099 evidence range.`);
  }
  const match = /^(?:([1-9])|([12]\d)|(3[01]))-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/u.exec(raw);
  if (!match) {
    fail("INVALID_GREGORIAN_DATE", `Gregorian date ${JSON.stringify(raw)} is not strict d-MMM-yy.`);
  }
  const day = Number(match[1] ?? match[2] ?? match[3]);
  const month = MONTH_ABBREVIATIONS.indexOf(match[4] as (typeof MONTH_ABBREVIATIONS)[number]) + 1;
  const twoDigitYear = Number(match[5]);
  if (twoDigitYear !== expectedYear % 100) {
    fail("INVALID_GREGORIAN_DATE", `Gregorian date ${raw} does not belong to ${expectedYear}.`);
  }
  const date = new Date(Date.UTC(expectedYear, month - 1, day));
  if (date.getUTCFullYear() !== expectedYear || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    fail("INVALID_GREGORIAN_DATE", `Gregorian date ${raw} is not a real civil date.`);
  }
  return `${expectedYear.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function parseStrictHkoLunarMonth(raw: string): { month: number; isLeapMonth: boolean } {
  const isLeapMonth = raw.startsWith("閏");
  const base = isLeapMonth ? raw.slice(1) : raw;
  const month = LUNAR_MONTHS.get(base);
  if (month === undefined || (isLeapMonth && raw.length !== base.length + 1)) {
    fail("INVALID_LUNAR_MONTH", `Unknown HKO lunar month token ${JSON.stringify(raw)}.`);
  }
  return { month, isLeapMonth };
}

export function parseStrictHkoLunarDay(raw: string): number {
  const day = LUNAR_DAYS.get(raw);
  if (day === undefined) {
    fail("INVALID_LUNAR_DAY", `Unknown HKO lunar day token ${JSON.stringify(raw)}.`);
  }
  return day;
}

function expectedDaysInYear(year: number): number {
  return new Date(Date.UTC(year + 1, 0, 1)).getTime() - new Date(Date.UTC(year, 0, 1)).getTime() === 366 * 86_400_000
    ? 366
    : 365;
}

function isoDateAtDayOffset(year: number, offset: number): string {
  return new Date(Date.UTC(year, 0, 1 + offset)).toISOString().slice(0, 10);
}

function assertLunarSequence(previous: HkoCalendarRow, current: HkoCalendarRow): void {
  const before = previous.lunarDate;
  const after = current.lunarDate;
  const sameMonth = before.year === after.year
    && before.month === after.month
    && before.isLeapMonth === after.isLeapMonth;
  if (sameMonth) {
    if (after.day !== before.day + 1) {
      fail("INVALID_LUNAR_SEQUENCE", `Lunar day did not increment at ${current.gregorianDate}.`);
    }
    return;
  }

  if ((before.day !== 29 && before.day !== 30) || after.day !== 1) {
    fail("INVALID_LUNAR_SEQUENCE", `Invalid lunar month boundary at ${current.gregorianDate}.`);
  }

  const isNewYear = before.year + 1 === after.year
    && before.month === 12
    && !before.isLeapMonth
    && after.month === 1
    && !after.isLeapMonth;
  const startsLeapMonth = before.year === after.year
    && before.month === after.month
    && !before.isLeapMonth
    && after.isLeapMonth;
  const endsLeapMonth = before.year === after.year
    && before.isLeapMonth
    && !after.isLeapMonth
    && after.month === before.month + 1;
  const advancesOrdinaryMonth = before.year === after.year
    && !before.isLeapMonth
    && !after.isLeapMonth
    && after.month === before.month + 1;
  if (!isNewYear && !startsLeapMonth && !endsLeapMonth && !advancesOrdinaryMonth) {
    fail("INVALID_LUNAR_SEQUENCE", `Invalid lunar month transition at ${current.gregorianDate}.`);
  }
}

export function parseHkoAnnualCalendarCsv(
  expectedYear: number,
  status: number,
  body: Uint8Array
): ParsedHkoAnnualCalendar {
  const decoded = decodeHkoAnnualResponse(status, body);
  const lines = decoded.text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.some((line) => line.length === 0)) {
    fail("INVALID_ROW", "Blank records are not accepted inside an HKO annual resource.");
  }
  const [headerLine, ...dataLines] = lines;
  if (headerLine !== HKO_HEADER.join(",")) {
    fail("INVALID_HEADER", "HKO annual resource header does not match the locked five-column schema.");
  }

  const expectedRowCount = expectedDaysInYear(expectedYear);
  if (dataLines.length !== expectedRowCount) {
    fail("INCOMPLETE_YEAR", `HKO ${expectedYear} resource has ${dataLines.length} rows; expected ${expectedRowCount}.`);
  }

  const temporaryRows = dataLines.map((line, index) => {
    if (line.includes("\"") || line.split(",").length !== HKO_HEADER.length) {
      fail("INVALID_ROW", `HKO source line ${index + 2} is not an unquoted five-column record.`);
    }
    const [rawGregorianDate, rawChineseYearGanzhi, rawChineseYearZodiac, rawLunarMonth, rawLunarDay] = line.split(",") as [string, string, string, string, string];
    const gregorianDate = parseStrictHkoGregorianDate(rawGregorianDate, expectedYear);
    const expectedGregorianDate = isoDateAtDayOffset(expectedYear, index);
    if (gregorianDate !== expectedGregorianDate) {
      fail("NON_CONTIGUOUS_DATE", `HKO source line ${index + 2} is ${gregorianDate}; expected ${expectedGregorianDate}.`);
    }
    if (!/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]年$/u.test(rawChineseYearGanzhi)) {
      fail("INVALID_CHINESE_YEAR", `Invalid Gan-Zhi year token at source line ${index + 2}.`);
    }
    if (!ZODIACS.has(rawChineseYearZodiac)) {
      fail("INVALID_ZODIAC", `Invalid zodiac token at source line ${index + 2}.`);
    }
    return {
      sourceLine: index + 2,
      rawGregorianDate,
      gregorianDate,
      rawChineseYearGanzhi,
      rawChineseYearZodiac,
      rawLunarMonth,
      rawLunarDay,
      parsedMonth: parseStrictHkoLunarMonth(rawLunarMonth),
      parsedDay: parseStrictHkoLunarDay(rawLunarDay)
    };
  });

  const lunarNewYearIndexes = temporaryRows.flatMap((row, index) =>
    row.parsedMonth.month === 1 && !row.parsedMonth.isLeapMonth && row.parsedDay === 1 ? [index] : []
  );
  if (lunarNewYearIndexes.length !== 1) {
    fail("INVALID_LUNAR_NEW_YEAR", `HKO ${expectedYear} resource must contain exactly one non-leap 正月初一.`);
  }
  const lunarNewYearIndex = lunarNewYearIndexes[0]!;
  const beforeIdentity = temporaryRows[0]!.rawChineseYearGanzhi + "|" + temporaryRows[0]!.rawChineseYearZodiac;
  const afterIdentity = temporaryRows[lunarNewYearIndex]!.rawChineseYearGanzhi + "|" + temporaryRows[lunarNewYearIndex]!.rawChineseYearZodiac;
  if (beforeIdentity === afterIdentity) {
    fail("INVALID_LUNAR_NEW_YEAR", "Chinese year identity did not change at 正月初一.");
  }

  const rows: HkoCalendarRow[] = temporaryRows.map((row, index) => {
    const expectedIdentity = index < lunarNewYearIndex ? beforeIdentity : afterIdentity;
    const actualIdentity = row.rawChineseYearGanzhi + "|" + row.rawChineseYearZodiac;
    if (actualIdentity !== expectedIdentity) {
      fail("INVALID_CHINESE_YEAR", `Chinese year identity changed outside 正月初一 at ${row.gregorianDate}.`);
    }
    return {
      sourceLine: row.sourceLine,
      rawGregorianDate: row.rawGregorianDate,
      gregorianDate: row.gregorianDate,
      rawChineseYearGanzhi: row.rawChineseYearGanzhi,
      rawChineseYearZodiac: row.rawChineseYearZodiac,
      rawLunarMonth: row.rawLunarMonth,
      rawLunarDay: row.rawLunarDay,
      lunarDate: {
        year: index < lunarNewYearIndex ? expectedYear - 1 : expectedYear,
        month: row.parsedMonth.month,
        day: row.parsedDay,
        isLeapMonth: row.parsedMonth.isLeapMonth
      }
    };
  });

  for (let index = 1; index < rows.length; index += 1) {
    assertLunarSequence(rows[index - 1]!, rows[index]!);
  }
  return { year: expectedYear, rows, ...decoded };
}

function rowTuple(row: HkoCalendarRow): HkoBoundaryDateTuple {
  return [
    row.gregorianDate,
    row.lunarDate.year,
    row.lunarDate.month,
    row.lunarDate.day,
    row.lunarDate.isLeapMonth
  ];
}

export function deriveHkoBoundaryMatrixRows(calendar: ParsedHkoAnnualCalendar): HkoBoundaryMatrixRow[] {
  const result: HkoBoundaryMatrixRow[] = [];
  for (let index = 1; index < calendar.rows.length; index += 1) {
    const after = calendar.rows[index]!;
    if (after.lunarDate.day !== 1) continue;
    const before = calendar.rows[index - 1]!;
    let kind: HkoBoundaryKind;
    let suffix: string;
    if (after.lunarDate.year !== before.lunarDate.year) {
      kind = "lunar_new_year";
      suffix = "lunar_new_year";
    } else if (after.lunarDate.isLeapMonth) {
      kind = "leap_month_start";
      suffix = `leap_${after.lunarDate.month}_start`;
    } else if (before.lunarDate.isLeapMonth) {
      kind = "leap_month_end";
      suffix = `leap_${before.lunarDate.month}_end`;
    } else {
      kind = "ordinary_month_transition";
      suffix = `month_${before.lunarDate.month}_to_${after.lunarDate.month}`;
    }
    let boundaryId = `hko.${calendar.year}.${suffix}`;
    const duplicate = result.find((row) => row[0] === boundaryId);
    if (duplicate) {
      duplicate[0] = `hko.${calendar.year}.lunar_${duplicate[2][1]}_${suffix}`;
      boundaryId = `hko.${calendar.year}.lunar_${before.lunarDate.year}_${suffix}`;
    }
    result.push([boundaryId, kind, rowTuple(before), rowTuple(after)]);
  }
  return result;
}

export function assertHkoCalendarRangeContinuity(
  calendars: ParsedHkoAnnualCalendar[]
): HkoCalendarRangeSeam[] {
  if (calendars.length < 2) {
    fail("INVALID_LUNAR_SEQUENCE", "A multi-year HKO range must contain at least two annual calendars.");
  }
  const seams: HkoCalendarRangeSeam[] = [];
  for (let index = 1; index < calendars.length; index += 1) {
    const previousCalendar = calendars[index - 1]!;
    const currentCalendar = calendars[index]!;
    if (currentCalendar.year !== previousCalendar.year + 1) {
      fail("NON_CONTIGUOUS_DATE", `HKO annual resources skip from ${previousCalendar.year} to ${currentCalendar.year}.`);
    }
    const before = previousCalendar.rows.at(-1)!;
    const after = currentCalendar.rows[0]!;
    if (before.gregorianDate !== `${previousCalendar.year}-12-31`
      || after.gregorianDate !== `${currentCalendar.year}-01-01`) {
      fail("NON_CONTIGUOUS_DATE", `HKO cross-file seam ${previousCalendar.year}/${currentCalendar.year} is not Dec 31 to Jan 1.`);
    }
    const expectedAfter = new Date(Date.parse(`${before.gregorianDate}T00:00:00.000Z`) + 86_400_000)
      .toISOString()
      .slice(0, 10);
    if (after.gregorianDate !== expectedAfter) {
      fail("NON_CONTIGUOUS_DATE", `HKO cross-file Gregorian seam is not contiguous after ${before.gregorianDate}.`);
    }
    assertLunarSequence(before, after);
    const beforeIdentity = `${before.rawChineseYearGanzhi}|${before.rawChineseYearZodiac}`;
    const afterIdentity = `${after.rawChineseYearGanzhi}|${after.rawChineseYearZodiac}`;
    if ((before.lunarDate.year === after.lunarDate.year) !== (beforeIdentity === afterIdentity)) {
      fail("INVALID_CHINESE_YEAR", `Chinese year identity disagrees with the lunar year across ${before.gregorianDate}/${after.gregorianDate}.`);
    }
    seams.push({
      fromYear: previousCalendar.year,
      toYear: currentCalendar.year,
      before: rowTuple(before),
      after: rowTuple(after)
    });
  }
  return seams;
}

export function verifyHkoAnnualResourceLock(
  lock: HkoAnnualResourceLock,
  status: number,
  body: Uint8Array
): ParsedHkoAnnualCalendar {
  const parsed = parseHkoAnnualCalendarCsv(lock.year, status, body);
  const mismatches: string[] = [];
  if (status !== lock.expectedHttpStatus) mismatches.push(`status ${status}`);
  if (parsed.resourceBytes !== lock.resourceBytes) mismatches.push(`bytes ${parsed.resourceBytes}`);
  if (parsed.resourceSha256 !== lock.resourceSha256) mismatches.push(`sha256 ${parsed.resourceSha256}`);
  if (parsed.hasUtf8Bom !== lock.hasUtf8Bom) mismatches.push(`BOM ${parsed.hasUtf8Bom}`);
  if (parsed.lineEnding !== lock.lineEnding) mismatches.push(`lineEnding ${parsed.lineEnding}`);
  if (parsed.rows.length !== lock.rowCount) mismatches.push(`rows ${parsed.rows.length}`);
  const boundaries = deriveHkoBoundaryMatrixRows(parsed);
  if (boundaries.length !== lock.boundaryCount) mismatches.push(`boundaries ${boundaries.length}`);
  if (mismatches.length > 0) {
    fail("RESOURCE_IDENTITY_MISMATCH", `HKO ${lock.year} resource identity mismatch: ${mismatches.join(", ")}.`);
  }
  return parsed;
}

function assertBoundaryDateTuple(value: unknown, label: string): asserts value is HkoBoundaryDateTuple {
  if (!Array.isArray(value)
    || value.length !== 5
    || typeof value[0] !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/u.test(value[0])
    || !Number.isInteger(value[1])
    || !Number.isInteger(value[2])
    || value[2] < 1
    || value[2] > 12
    || !Number.isInteger(value[3])
    || value[3] < 1
    || value[3] > 30
    || typeof value[4] !== "boolean") {
    fail("INVALID_MATRIX_ARTIFACT", `${label} is not a valid boundary date tuple.`);
  }
}

export function assertHkoCalendarBoundaryMatrixArtifact(
  value: unknown
): asserts value is HkoCalendarBoundaryMatrixArtifact {
  if (!isRecord(value)
    || value.format !== HKO_CALENDAR_MATRIX_FORMAT
    || value.claimScope !== "calendar_resolution"
    || value.civilDateOnly !== true
    || value.productionEligible !== false
    || value.expertTruthClaimed !== false) {
    fail("INVALID_MATRIX_ARTIFACT", "Calendar matrix claim boundary is missing or widened.");
  }
  if (!isRecord(value.source)
    || value.source.provider !== "Hong Kong Observatory"
    || value.source.publisher !== "DATA.GOV.HK"
    || typeof value.source.datasetPage !== "string"
    || !value.source.datasetPage.startsWith("https://data.gov.hk/")
    || typeof value.source.termsUrl !== "string"
    || !value.source.termsUrl.startsWith("https://data.gov.hk/")
    || typeof value.source.retrievedAt !== "string"
    || typeof value.source.attribution !== "string"
    || value.source.attribution.length < 30) {
    fail("INVALID_MATRIX_ARTIFACT", "Calendar matrix source attribution is incomplete.");
  }
  if (!isRecord(value.engineeringContext)
    || value.engineeringContext.sourceCivilZone !== "Asia/Hong_Kong"
    || value.engineeringContext.utcOffsetReference !== "+08:00"
    || value.engineeringContext.selectionRule !== "all_adjacent_rows_with_after_lunar_day_1_within_each_annual_resource"
    || !Array.isArray(value.engineeringContext.notProven)) {
    fail("INVALID_MATRIX_ARTIFACT", "Calendar matrix engineering scope is invalid.");
  }
  const notProven = value.engineeringContext.notProven;
  if (!notProven.every((item): item is string => typeof item === "string")) {
    fail("INVALID_MATRIX_ARTIFACT", "Calendar matrix notProven entries must be strings.");
  }
  const requiredNotProven = ["late_zi_day_boundary", "shichen", "day_pillar", "hour_pillar", "ziwei_chart_rules"];
  if (!requiredNotProven.every((item) => notProven.includes(item))) {
    fail("INVALID_MATRIX_ARTIFACT", "Calendar matrix must deny time, pillar and Ziwei truth claims.");
  }
  if (JSON.stringify(value.matrixColumns) !== JSON.stringify(HKO_CALENDAR_MATRIX_COLUMNS)) {
    fail("INVALID_MATRIX_ARTIFACT", "Calendar matrix columns do not match the locked tuple schema.");
  }
  if (!Array.isArray(value.annualResources) || !Array.isArray(value.boundaryMatrix)) {
    fail("INVALID_MATRIX_ARTIFACT", "Calendar matrix resources or rows are missing.");
  }

  const expectedYears = [2023, 2024, 2025, 2026, 2027, 2028];
  if (value.annualResources.length !== expectedYears.length) {
    fail("INVALID_MATRIX_ARTIFACT", "Calendar matrix must lock exactly 2023 through 2028.");
  }
  const resourceByYear = new Map<number, HkoAnnualResourceLock>();
  for (const [index, resource] of value.annualResources.entries()) {
    if (!isRecord(resource)
      || resource.year !== expectedYears[index]
      || resource.resourceUrl !== `https://data.weather.gov.hk/weatherAPI/hko_data/calendar/nongli_calendar_${resource.year}.csv`
      || resource.expectedHttpStatus !== 200
      || typeof resource.resourceBytes !== "number"
      || !Number.isInteger(resource.resourceBytes)
      || resource.resourceBytes <= 0
      || typeof resource.resourceSha256 !== "string"
      || !/^[0-9a-f]{64}$/u.test(resource.resourceSha256)
      || resource.encoding !== "utf-8"
      || typeof resource.hasUtf8Bom !== "boolean"
      || (resource.lineEnding !== "LF" && resource.lineEnding !== "CRLF")
      || typeof resource.rowCount !== "number"
      || !Number.isInteger(resource.rowCount)
      || typeof resource.boundaryCount !== "number"
      || !Number.isInteger(resource.boundaryCount)) {
      fail("INVALID_MATRIX_ARTIFACT", `Annual resource lock ${index} is invalid.`);
    }
    resourceByYear.set(resource.year as number, resource as unknown as HkoAnnualResourceLock);
  }

  const ids = new Set<string>();
  const dates = new Set<string>();
  const counts = new Map<number, number>();
  const lunarNewYearCounts = new Map<number, number>();
  for (const [index, row] of value.boundaryMatrix.entries()) {
    if (!Array.isArray(row)
      || row.length !== 4
      || typeof row[0] !== "string"
      || !["lunar_new_year", "ordinary_month_transition", "leap_month_start", "leap_month_end"].includes(row[1] as string)) {
      fail("INVALID_MATRIX_ARTIFACT", `Boundary matrix row ${index} has an invalid identity or kind.`);
    }
    assertBoundaryDateTuple(row[2], `Boundary matrix row ${index} before`);
    assertBoundaryDateTuple(row[3], `Boundary matrix row ${index} after`);
    const year = Number(row[2][0].slice(0, 4));
    if (!resourceByYear.has(year) || Number(row[3][0].slice(0, 4)) !== year) {
      fail("INVALID_MATRIX_ARTIFACT", `Boundary matrix row ${index} is outside its annual resource.`);
    }
    if (ids.has(row[0])) fail("INVALID_MATRIX_ARTIFACT", `Duplicate boundary id ${row[0]}.`);
    ids.add(row[0]);
    for (const date of [row[2][0], row[3][0]]) {
      if (dates.has(date)) fail("INVALID_MATRIX_ARTIFACT", `Boundary date ${date} appears more than once.`);
      dates.add(date);
    }
    counts.set(year, (counts.get(year) ?? 0) + 1);
    if (row[1] === "lunar_new_year") lunarNewYearCounts.set(year, (lunarNewYearCounts.get(year) ?? 0) + 1);
  }
  for (const resource of resourceByYear.values()) {
    if (counts.get(resource.year) !== resource.boundaryCount || lunarNewYearCounts.get(resource.year) !== 1) {
      fail("INVALID_MATRIX_ARTIFACT", `Boundary coverage for ${resource.year} does not match its resource lock.`);
    }
  }
  for (const requiredId of [
    "hko.2023.leap_2_start", "hko.2023.leap_2_end",
    "hko.2025.leap_6_start", "hko.2025.leap_6_end"
  ]) {
    if (!ids.has(requiredId)) fail("INVALID_MATRIX_ARTIFACT", `Required leap boundary ${requiredId} is missing.`);
  }
}

export function assertHkoBoundaryMatrixMatchesCalendars(
  artifact: HkoCalendarBoundaryMatrixArtifact,
  calendars: ParsedHkoAnnualCalendar[]
): void {
  const actual = calendars.flatMap(deriveHkoBoundaryMatrixRows);
  if (JSON.stringify(actual) === JSON.stringify(artifact.boundaryMatrix)) return;
  const maximum = Math.max(actual.length, artifact.boundaryMatrix.length);
  for (let index = 0; index < maximum; index += 1) {
    if (JSON.stringify(actual[index]) !== JSON.stringify(artifact.boundaryMatrix[index])) {
      fail("BOUNDARY_MATRIX_MISMATCH", `Boundary matrix first differs at row ${index}.`);
    }
  }
  fail("BOUNDARY_MATRIX_MISMATCH", "Boundary matrix differs from the annual resources.");
}
