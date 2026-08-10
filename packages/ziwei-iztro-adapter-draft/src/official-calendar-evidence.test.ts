// @vitest-environment node

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION } from "./contract-bridge.ts";
import { calculateIztro258EngineeringFixture, createIztro258RuleSnapshotDraft } from "./index.ts";
import {
  HkoCalendarEvidenceError,
  assertHkoBoundaryMatrixMatchesCalendars,
  assertHkoCalendarRangeContinuity,
  assertHkoCalendarBoundaryMatrixArtifact,
  decodeHkoAnnualResponse,
  deriveHkoBoundaryMatrixRows,
  parseStrictHkoGregorianDate,
  parseStrictHkoLunarDay,
  parseStrictHkoLunarMonth,
  verifyHkoAnnualResourceLock,
  type HkoBoundaryDateTuple,
  type HkoCalendarBoundaryMatrixArtifact,
  type ParsedHkoAnnualCalendar
} from "./official-calendar-evidence.ts";

const matrixUrl = new URL(
  "../fixtures/hko-data-gov-hk-calendar-boundaries-2023-2028.json",
  import.meta.url
);
const snapshotsUrl = new URL(
  "../fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json",
  import.meta.url
);

interface SnapshotArtifact {
  format: string;
  compression: string;
  contentTransferEncoding: string;
  productionEligible: boolean;
  snapshots: Array<{ year: number; gzipBytes: number; payload: string }>;
}

async function gunzip(compressed: Uint8Array): Promise<Uint8Array> {
  const copied = new Uint8Array(compressed.byteLength);
  copied.set(compressed);
  const decompressed = new Blob([copied]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
}

async function loadArtifact(): Promise<HkoCalendarBoundaryMatrixArtifact> {
  const candidate: unknown = JSON.parse(await readFile(matrixUrl, "utf8"));
  assertHkoCalendarBoundaryMatrixArtifact(candidate);
  return candidate;
}

async function replayLockedCalendars(
  artifact: HkoCalendarBoundaryMatrixArtifact
): Promise<ParsedHkoAnnualCalendar[]> {
  const snapshots = JSON.parse(await readFile(snapshotsUrl, "utf8")) as SnapshotArtifact;
  expect(snapshots).toMatchObject({
    format: "hakimi-hko-annual-csv-source-snapshots/0.1-draft",
    compression: "gzip",
    contentTransferEncoding: "base64",
    productionEligible: false
  });
  expect(snapshots.snapshots.map((snapshot) => snapshot.year)).toEqual([2023, 2024, 2025, 2026, 2027, 2028]);

  const calendars: ParsedHkoAnnualCalendar[] = [];
  for (const lock of artifact.annualResources) {
    const snapshot = snapshots.snapshots.find((candidate) => candidate.year === lock.year);
    expect(snapshot, `missing offline source snapshot for ${lock.year}`).toBeDefined();
    expect(snapshot!.payload).toMatch(/^[A-Za-z0-9+/]+={0,2}$/u);
    expect(snapshot!.payload.length % 4).toBe(0);
    const compressed = Buffer.from(snapshot!.payload, "base64");
    expect(compressed.toString("base64")).toBe(snapshot!.payload);
    expect(compressed.byteLength).toBe(snapshot!.gzipBytes);
    const originalResponseBody = await gunzip(compressed);
    calendars.push(verifyHkoAnnualResourceLock(lock, 200, originalResponseBody));
  }
  return calendars;
}

function expectEvidenceError(action: () => unknown, code: HkoCalendarEvidenceError["code"]): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(HkoCalendarEvidenceError);
    expect((error as HkoCalendarEvidenceError).code).toBe(code);
    return;
  }
  throw new Error(`Expected HkoCalendarEvidenceError ${code}.`);
}

function adapterInput(gregorianDate: string, boundaryId: string) {
  return {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date: gregorianDate },
    shichenIndex: 6,
    sexForCalculation: "male",
    solarTimeAdjustment: "none",
    civilContext: {
      usedForCalculation: false,
      localTime: "12:00",
      timeZone: "Asia/Hong_Kong",
      location: {
        precision: "coordinates",
        label: "Hong Kong civil-date fixture",
        latitude: 22.3193,
        longitude: 114.1694
      }
    },
    birthSourceRef: `${boundaryId}.${gregorianDate}`,
    sourceNote: "DATA.GOV.HK/HKO civil-date-only calendar regression; not time, pillar, Ziwei or expert truth."
  } as const;
}

function expectedLunarDate(tuple: HkoBoundaryDateTuple) {
  return { year: tuple[1], month: tuple[2], day: tuple[3], isLeapMonth: tuple[4] };
}

describe("DATA.GOV.HK/HKO 2023-2028 civil-date boundary evidence", () => {
  it("replays every locked source byte offline and rebuilds all 74 boundaries from 2,192 official daily rows", async () => {
    const artifact = await loadArtifact();
    const calendars = await replayLockedCalendars(artifact);

    expect(calendars.reduce((sum, calendar) => sum + calendar.rows.length, 0)).toBe(2_192);
    expect(calendars.map((calendar) => ({
      year: calendar.year,
      rows: calendar.rows.length,
      lineEnding: calendar.lineEnding,
      hasUtf8Bom: calendar.hasUtf8Bom
    }))).toEqual([
      { year: 2023, rows: 365, lineEnding: "LF", hasUtf8Bom: true },
      { year: 2024, rows: 366, lineEnding: "LF", hasUtf8Bom: false },
      { year: 2025, rows: 365, lineEnding: "CRLF", hasUtf8Bom: false },
      { year: 2026, rows: 365, lineEnding: "CRLF", hasUtf8Bom: false },
      { year: 2027, rows: 365, lineEnding: "LF", hasUtf8Bom: false },
      { year: 2028, rows: 366, lineEnding: "LF", hasUtf8Bom: false }
    ]);
    expect(calendars.flatMap(deriveHkoBoundaryMatrixRows)).toHaveLength(74);
    expect(assertHkoCalendarRangeContinuity(calendars)).toEqual([
      {
        fromYear: 2023,
        toYear: 2024,
        before: ["2023-12-31", 2023, 11, 19, false],
        after: ["2024-01-01", 2023, 11, 20, false]
      },
      {
        fromYear: 2024,
        toYear: 2025,
        before: ["2024-12-31", 2024, 12, 1, false],
        after: ["2025-01-01", 2024, 12, 2, false]
      },
      {
        fromYear: 2025,
        toYear: 2026,
        before: ["2025-12-31", 2025, 11, 12, false],
        after: ["2026-01-01", 2025, 11, 13, false]
      },
      {
        fromYear: 2026,
        toYear: 2027,
        before: ["2026-12-31", 2026, 11, 23, false],
        after: ["2027-01-01", 2026, 11, 24, false]
      },
      {
        fromYear: 2027,
        toYear: 2028,
        before: ["2027-12-31", 2027, 12, 4, false],
        after: ["2028-01-01", 2027, 12, 5, false]
      }
    ]);
    assertHkoBoundaryMatrixMatchesCalendars(artifact, calendars);

    expect(artifact.boundaryMatrix.filter((row) => row[1] === "lunar_new_year")).toHaveLength(6);
    expect(artifact.boundaryMatrix.filter((row) => row[1] === "leap_month_start").map((row) => row[0])).toEqual([
      "hko.2023.leap_2_start", "hko.2025.leap_6_start", "hko.2028.leap_5_start"
    ]);
    expect(artifact.boundaryMatrix.filter((row) => row[1] === "leap_month_end").map((row) => row[0])).toEqual([
      "hko.2023.leap_2_end", "hko.2025.leap_6_end", "hko.2028.leap_5_end"
    ]);
  });

  it("accepts the observed BOM/LF/CRLF variants while keeping d-MMM-yy and 閏 tokens strict", () => {
    const utf8BomLf = decodeHkoAnnualResponse(200, Buffer.from("\uFEFFheader\nrow\n", "utf8"));
    expect(utf8BomLf).toMatchObject({ hasUtf8Bom: true, lineEnding: "LF", text: "header\nrow\n" });
    const crlf = decodeHkoAnnualResponse(200, Buffer.from("header\r\nrow\r\n", "utf8"));
    expect(crlf).toMatchObject({ hasUtf8Bom: false, lineEnding: "CRLF", text: "header\nrow\n" });

    expect(parseStrictHkoGregorianDate("1-Jan-23", 2023)).toBe("2023-01-01");
    expect(parseStrictHkoGregorianDate("29-Feb-24", 2024)).toBe("2024-02-29");
    for (const invalid of ["01-Jan-23", "1-jan-23", "1-January-23", "29-Feb-23", "1-Jan-24"]) {
      expectEvidenceError(() => parseStrictHkoGregorianDate(invalid, 2023), "INVALID_GREGORIAN_DATE");
    }

    expect(parseStrictHkoLunarMonth("閏二月")).toEqual({ month: 2, isLeapMonth: true });
    expect(parseStrictHkoLunarMonth("十二月")).toEqual({ month: 12, isLeapMonth: false });
    expect(parseStrictHkoLunarDay("初一")).toBe(1);
    expect(parseStrictHkoLunarDay("廿九")).toBe(29);
    expectEvidenceError(() => parseStrictHkoLunarMonth("闰二月"), "INVALID_LUNAR_MONTH");
    expectEvidenceError(() => parseStrictHkoLunarMonth("閏十三月"), "INVALID_LUNAR_MONTH");
    expectEvidenceError(() => parseStrictHkoLunarDay("三十一"), "INVALID_LUNAR_DAY");
  });

  it("fails closed on HTTP 200 Not Available, status, newline, lock and claim-boundary drift", async () => {
    expectEvidenceError(
      () => decodeHkoAnnualResponse(200, Buffer.from("Not Available\n", "utf8")),
      "RESOURCE_NOT_AVAILABLE"
    );
    expectEvidenceError(
      () => decodeHkoAnnualResponse(503, Buffer.from("temporary failure\n", "utf8")),
      "HTTP_STATUS"
    );
    expectEvidenceError(
      () => decodeHkoAnnualResponse(200, Buffer.from("header\r\nrow\n", "utf8")),
      "INVALID_LINE_ENDING"
    );

    const artifact = await loadArtifact();
    const calendars = await replayLockedCalendars(artifact);
    const forgedLock = { ...artifact.annualResources[0]!, resourceSha256: "0".repeat(64) };
    const snapshots = JSON.parse(await readFile(snapshotsUrl, "utf8")) as SnapshotArtifact;
    const body = await gunzip(Buffer.from(snapshots.snapshots[0]!.payload, "base64"));
    expectEvidenceError(() => verifyHkoAnnualResourceLock(forgedLock, 200, body), "RESOURCE_IDENTITY_MISMATCH");

    const widenedClaim = structuredClone(artifact) as unknown as Record<string, unknown>;
    widenedClaim.expertTruthClaimed = true;
    expectEvidenceError(() => assertHkoCalendarBoundaryMatrixArtifact(widenedClaim), "INVALID_MATRIX_ARTIFACT");

    const changedMatrix = structuredClone(artifact);
    changedMatrix.boundaryMatrix[0]![3][3] = 2;
    expectEvidenceError(
      () => assertHkoBoundaryMatrixMatchesCalendars(changedMatrix, calendars),
      "BOUNDARY_MATRIX_MISMATCH"
    );

    const brokenSeam = structuredClone(calendars);
    brokenSeam[1]!.rows[0]!.lunarDate.day = 21;
    expectEvidenceError(() => assertHkoCalendarRangeContinuity(brokenSeam), "INVALID_LUNAR_SEQUENCE");
  });

  it("matches the isolated iztro adapter at every New Year and 2023/2025/2028 leap boundary", async () => {
    const artifact = await loadArtifact();
    const selectedIds = new Set([
      ...artifact.boundaryMatrix.filter((row) => row[1] === "lunar_new_year").map((row) => row[0]),
      "hko.2023.leap_2_start",
      "hko.2023.leap_2_end",
      "hko.2025.leap_6_start",
      "hko.2025.leap_6_end",
      "hko.2028.leap_5_start",
      "hko.2028.leap_5_end",
      "hko.2024.month_9_to_10"
    ]);
    const cases = artifact.boundaryMatrix
      .filter((row) => selectedIds.has(row[0]))
      .flatMap((row) => [
        { boundaryId: row[0], tuple: row[2] },
        { boundaryId: row[0], tuple: row[3] }
      ]);
    expect(cases).toHaveLength(26);
    const ruleSnapshot = await createIztro258RuleSnapshotDraft();

    for (let offset = 0; offset < cases.length; offset += 4) {
      const batch = cases.slice(offset, offset + 4);
      const fixtures = await Promise.all(batch.map((testCase) =>
        calculateIztro258EngineeringFixture(
          adapterInput(testCase.tuple[0], testCase.boundaryId),
          { ruleSnapshot }
        )
      ));
      fixtures.forEach((fixture, index) => {
        expect(fixture.facts.calendarFacts.gregorianDate).toBe(batch[index]!.tuple[0]);
        expect(fixture.facts.calendarFacts.lunarDate).toEqual(expectedLunarDate(batch[index]!.tuple));
        expect(fixture.evidence).toMatchObject({
          truthStatus: "upstream_regression",
          productionEligible: false,
          expertTruthClaimed: false
        });
      });
    }
  }, 30_000);
});
