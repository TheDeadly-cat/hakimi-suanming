import type {
  StoredEventRecord,
  StoredEventTimeContext
} from "@hakimi/contracts";
import {
  classifyStoredTimeZoneDatabaseForReplay,
  verifyEventTimeContext,
  verifyStoredEventTimeContextWithBundledArtifact,
  type EventTimeContextVerificationStatus
} from "@hakimi/time-core";

type ZonedMinuteContext = Extract<StoredEventTimeContext, { kind: "zoned_minute" }>;
type ZonedMinuteBoundary = ZonedMinuteContext["start"];

export type EventTimeBoundaryExport = Readonly<{
  localDateTime: string;
  dstResolution: string;
  utcOffset: string;
  canonicalUtc: string;
}>;

export type EventTimeExportDetails = Readonly<{
  kind: StoredEventTimeContext["kind"];
  timeZone: string | null;
  tzdbVersion: string | null;
  start: EventTimeBoundaryExport | null;
  end: EventTimeBoundaryExport | null;
  notice: string;
}>;

export type VerifiedEventForResearchExport = Readonly<{
  status: EventTimeContextVerificationStatus;
  eventId: string;
  createdAt: string;
  chronologyDomain: 0 | 1 | 2;
  chronologyValue: string;
  details: EventTimeExportDetails;
}>;

const verifiedEventProofs = new WeakSet<object>();

function boundaryDetails(boundary: ZonedMinuteBoundary): EventTimeBoundaryExport {
  const resolution = boundary.resolution;
  return Object.freeze({
    localDateTime: boundary.localDateTime,
    dstResolution: [
      resolution.kind,
      resolution.status,
      `policy=${resolution.policy}`,
      `selected=${resolution.selectedCandidate.choice}`
    ].join(" / "),
    utcOffset: resolution.selectedCandidate.utcOffset,
    canonicalUtc: boundary.canonicalUtc
  });
}

function projectEventTimeDetails(timeContext: StoredEventTimeContext): EventTimeExportDetails {
  if (timeContext.kind === "legacy_floating") {
    return Object.freeze({
      kind: "legacy_floating",
      timeZone: null,
      tzdbVersion: null,
      start: null,
      end: null,
      notice: "历史浮动时间：未记录 IANA 时区，无法换算规范 UTC。"
    });
  }
  if (timeContext.kind === "calendar_date") {
    return Object.freeze({
      kind: "calendar_date",
      timeZone: null,
      tzdbVersion: null,
      start: null,
      end: null,
      notice: "日历精度：时区、DST 与规范 UTC 不适用。"
    });
  }
  return Object.freeze({
    kind: "zoned_minute",
    timeZone: timeContext.timeZone,
    tzdbVersion: timeContext.tzdbVersion,
    start: boundaryDetails(timeContext.start),
    end: timeContext.end ? boundaryDetails(timeContext.end) : null,
    notice: ""
  });
}

function chronologyKey(
  event: StoredEventRecord,
  timeContext: StoredEventTimeContext
): readonly [0 | 1 | 2, string] {
  if (timeContext.kind === "zoned_minute") return [0, timeContext.start.canonicalUtc];
  if (timeContext.kind === "calendar_date") return [1, event.startDate ?? "9999-99-99T99:99"];
  return [2, event.startDate ?? "9999-99-99T99:99"];
}

function createVerifiedEventProof(
  event: StoredEventRecord,
  status: EventTimeContextVerificationStatus,
  timeContext: StoredEventTimeContext
): VerifiedEventForResearchExport {
  const [chronologyDomain, chronologyValue] = chronologyKey(event, timeContext);
  const proof = Object.freeze({
    status,
    eventId: event.id,
    createdAt: event.createdAt,
    chronologyDomain,
    chronologyValue,
    details: projectEventTimeDetails(timeContext)
  });
  verifiedEventProofs.add(proof);
  return proof;
}

function eventTimeVerificationInput(event: StoredEventRecord) {
  return {
    datePrecision: event.datePrecision,
    startDate: event.startDate,
    endDate: event.endDate,
    timeContext: event.timeContext
  };
}

function rejectInexactZonedEvent(status: EventTimeContextVerificationStatus): never {
  throw new Error(`研究导出拒绝未完成 exact replay 的 zoned Event（${status}）。`);
}

/**
 * Synchronous compatibility gate. Zoned Events must match the active bundled
 * resolver exactly; retained artifacts require the explicit async entrypoint.
 */
export function verifyEventForResearchExport(
  event: StoredEventRecord
): VerifiedEventForResearchExport {
  const timeContext = verifyEventTimeContext(eventTimeVerificationInput(event));
  if (timeContext.kind === "zoned_minute") {
    const replayStatus = classifyStoredTimeZoneDatabaseForReplay(timeContext);
    if (replayStatus !== "current_exact") {
      rejectInexactZonedEvent(
        replayStatus === "retained_exact"
          ? "exact_retained"
          : replayStatus === "legacy_unidentified"
            ? "structural_legacy_unidentified"
            : "structural_artifact_unavailable"
      );
    }
    return createVerifiedEventProof(event, "exact_current", timeContext);
  }
  return createVerifiedEventProof(
    event,
    timeContext.kind === "calendar_date"
      ? "structural_calendar_date"
      : "structural_legacy_floating",
    timeContext
  );
}

/** Exact async gate for current and officially retained bundled artifacts. */
export async function verifyEventForResearchExportWithBundledArtifact(
  event: StoredEventRecord
): Promise<VerifiedEventForResearchExport> {
  const verification = await verifyStoredEventTimeContextWithBundledArtifact(
    eventTimeVerificationInput(event)
  );
  if (
    verification.timeContext.kind === "zoned_minute" &&
    verification.status !== "exact_current" &&
    verification.status !== "exact_retained"
  ) {
    rejectInexactZonedEvent(verification.status);
  }
  return createVerifiedEventProof(event, verification.status, verification.timeContext);
}

function assertVerifiedEventProof(
  proof: VerifiedEventForResearchExport
): VerifiedEventForResearchExport {
  if (!proof || typeof proof !== "object" || !verifiedEventProofs.has(proof)) {
    throw new TypeError("研究导出 Event 验证凭据无效。");
  }
  return proof;
}

/** UTC/offset details are exposed only from a module-issued verification proof. */
export function eventTimeExportDetails(
  proof: VerifiedEventForResearchExport
): EventTimeExportDetails {
  return assertVerifiedEventProof(proof).details;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Internal verified comparator; the WeakSet-backed proofs cannot be forged. */
export function compareVerifiedEventsForResearchExport(
  left: VerifiedEventForResearchExport,
  right: VerifiedEventForResearchExport
): number {
  const verifiedLeft = assertVerifiedEventProof(left);
  const verifiedRight = assertVerifiedEventProof(right);
  return verifiedLeft.chronologyDomain - verifiedRight.chronologyDomain ||
    compareText(verifiedLeft.chronologyValue, verifiedRight.chronologyValue) ||
    compareText(verifiedLeft.createdAt, verifiedRight.createdAt) ||
    compareText(verifiedLeft.eventId, verifiedRight.eventId);
}

/**
 * Direct synchronous comparison remains compatible for active exact Events,
 * while retained/unavailable/unidentified zoned values fail before UTC access.
 */
export function compareEventsForResearchExport(
  left: StoredEventRecord,
  right: StoredEventRecord
): number {
  return compareVerifiedEventsForResearchExport(
    verifyEventForResearchExport(left),
    verifyEventForResearchExport(right)
  );
}
