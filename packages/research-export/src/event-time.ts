import type { EventRecord } from "@hakimi/contracts";
import { verifyEventTimeContext } from "@hakimi/time-core";

type ZonedMinuteContext = Extract<EventRecord["timeContext"], { kind: "zoned_minute" }>;
type ZonedMinuteBoundary = ZonedMinuteContext["start"];

export type EventTimeBoundaryExport = {
  localDateTime: string;
  dstResolution: string;
  utcOffset: string;
  canonicalUtc: string;
};

export type EventTimeExportDetails = {
  kind: EventRecord["timeContext"]["kind"];
  timeZone: string | null;
  tzdbVersion: string | null;
  start: EventTimeBoundaryExport | null;
  end: EventTimeBoundaryExport | null;
  notice: string;
};

function boundaryDetails(boundary: ZonedMinuteBoundary): EventTimeBoundaryExport {
  const resolution = boundary.resolution;
  return {
    localDateTime: boundary.localDateTime,
    dstResolution: [
      resolution.kind,
      resolution.status,
      `policy=${resolution.policy}`,
      `selected=${resolution.selectedCandidate.choice}`
    ].join(" / "),
    utcOffset: resolution.selectedCandidate.utcOffset,
    canonicalUtc: boundary.canonicalUtc
  };
}

export function eventTimeExportDetails(event: EventRecord): EventTimeExportDetails {
  if (event.timeContext.kind === "legacy_floating") {
    return {
      kind: "legacy_floating",
      timeZone: null,
      tzdbVersion: null,
      start: null,
      end: null,
      notice: "历史浮动时间：未记录 IANA 时区，无法换算规范 UTC。"
    };
  }
  if (event.timeContext.kind === "calendar_date") {
    return {
      kind: "calendar_date",
      timeZone: null,
      tzdbVersion: null,
      start: null,
      end: null,
      notice: "日历精度：时区、DST 与规范 UTC 不适用。"
    };
  }
  return {
    kind: "zoned_minute",
    timeZone: event.timeContext.timeZone,
    tzdbVersion: event.timeContext.tzdbVersion,
    start: boundaryDetails(event.timeContext.start),
    end: event.timeContext.end ? boundaryDetails(event.timeContext.end) : null,
    notice: ""
  };
}

/** Fail closed before either full or anonymized output is projected. */
export function verifyEventForResearchExport(event: EventRecord): void {
  verifyEventTimeContext({
    datePrecision: event.datePrecision,
    startDate: event.startDate,
    endDate: event.endDate,
    timeContext: event.timeContext
  });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function eventChronologyKey(event: EventRecord): readonly [number, string] {
  if (event.timeContext.kind === "zoned_minute") {
    return [0, event.timeContext.start.canonicalUtc];
  }
  if (event.timeContext.kind === "calendar_date") {
    return [1, event.startDate ?? "9999-99-99T99:99"];
  }
  return [2, event.startDate ?? "9999-99-99T99:99"];
}

/**
 * Zoned minutes are ordered by canonical UTC. Calendar-only and legacy values
 * are separate, explicitly incomparable domains and retain wall/calendar order;
 * legacy values are never projected through a guessed time zone.
 */
export function compareEventsForResearchExport(left: EventRecord, right: EventRecord): number {
  const [leftDomain, leftValue] = eventChronologyKey(left);
  const [rightDomain, rightValue] = eventChronologyKey(right);
  return leftDomain - rightDomain ||
    compareText(leftValue, rightValue) ||
    compareText(left.createdAt, right.createdAt) ||
    compareText(left.id, right.id);
}
