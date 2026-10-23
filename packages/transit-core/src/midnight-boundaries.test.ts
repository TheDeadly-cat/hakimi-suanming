import { describe, expect, it } from "vitest";
import { calculateChart, calculateTransitPillarsAtInstant } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type BirthInput, type RevisionRecord, type TransitNode } from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { normalizeBirthTime } from "@hakimi/time-core";
import frozen from "./golden/transit-v1.2-frozen.json";
import {
  CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
  TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0,
  TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_3_0,
  calculateTransitSnapshot,
  lookupHistoricalTransitSnapshotExecutor,
  requireHistoricalTransitSnapshotExecutor,
  resolveTransitNodeRef,
  verifyCompatibleTransitNodeRef
} from "./index";

const baseInput: BirthInput = {
  schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
  timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
  location: { label: "Synthetic midnight boundary fixture", latitude: null, longitude: null, precision: "city" },
  sourceNote: "Synthetic test data"
};

async function revisionFor(dayBoundary: "midnight" | "zi_start_23", timeZone: string): Promise<RevisionRecord> {
  const chart = await calculateChart({ ...baseInput, timeZone }, withDayBoundary(dayBoundary));
  return storedRevisionRecordSchema.parse({
    ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1, createdAt: "2026-10-13T00:00:00.000Z"
  });
}

function nodeFacts(node: TransitNode) {
  const { isActiveAtTarget: _, ...facts } = node;
  return facts;
}

describe("v1.3 rule-aware midnight hour intervals", () => {
  it.each(["Asia/Shanghai", "America/New_York", "Asia/Kathmandu", "Pacific/Kiritimati"])(
    "%s: both rules agree with the point engine, remain contiguous and keep shared node IDs stable",
    async (timeZone) => {
      for (const dayBoundary of ["zi_start_23", "midnight"] as const) {
        const revision = await revisionFor(dayBoundary, timeZone);
        const seen = new Map<string, ReturnType<typeof nodeFacts>>();
        const observations: Array<{ wall: string; node: TransitNode }> = [];
        for (const [date, time] of [
          ["2024-02-04", "22:59:59"], ["2024-02-04", "23:00:00"], ["2024-02-04", "23:59:59"],
          ["2024-02-05", "00:00:00"], ["2024-02-05", "00:30:00"], ["2024-02-05", "00:59:59"],
          ["2024-02-05", "01:00:00"], ["2024-02-05", "01:00:01"]
        ]) {
          const atInstant = normalizeBirthTime({ ...baseInput, date, time, timeZone, timePrecision: "exact_second" }, "reject").utcInstant;
          if (!atInstant) throw new Error("expected unambiguous synthetic target");
          const snapshot = await calculateTransitSnapshot({ revision, atInstant });
          const hour = snapshot.slots.hour;
          expect(hour.status).toBe("resolved");
          if (hour.status !== "resolved") throw new Error("expected a current hour");
          const point = calculateTransitPillarsAtInstant(atInstant, timeZone, revision.ruleProfile);
          expect(hour.node.ganZhi).toBe(point.pillars.hour.ganZhi);
          observations.push({ wall: `${date}T${time}`, node: hour.node });
          expect(snapshot.tracks.hour).toHaveLength(5);
          for (const [index, node] of snapshot.tracks.hour.entries()) {
            if (index > 0) expect(snapshot.tracks.hour[index - 1]!.endExclusiveInstant).toBe(node.startInstant);
            const start = Date.parse(node.startInstant);
            const end = Date.parse(node.endExclusiveInstant);
            expect(end).toBeGreaterThan(start);
            for (const instant of [node.startInstant, new Date(end - 1).toISOString()]) {
              expect(calculateTransitPillarsAtInstant(instant, timeZone, revision.ruleProfile).pillars.hour.ganZhi).toBe(node.ganZhi);
            }
            const key = node.startInstant;
            if (seen.has(key)) expect(nodeFacts(node)).toEqual(seen.get(key));
            seen.set(key, nodeFacts(node));
          }
          const restored = await resolveTransitNodeRef(revision, hour.node.ref);
          expect(nodeFacts(restored)).toEqual(nodeFacts(hour.node));
        }
        const beforeMidnight = observations.find((item) => item.wall === "2024-02-04T23:59:59")!.node;
        const atMidnight = observations.find((item) => item.wall === "2024-02-05T00:00:00")!.node;
        if (dayBoundary === "midnight") {
          expect(beforeMidnight.endExclusiveWallDateTime).toBe("2024-02-05T00:00:00");
          expect(atMidnight.startWallDateTime).toBe("2024-02-05T00:00:00");
          expect(atMidnight.endExclusiveWallDateTime).toBe("2024-02-05T01:00:00");
          expect(beforeMidnight.ref.nodeId).not.toBe(atMidnight.ref.nodeId);
          expect(beforeMidnight.ganZhi).toBe("壬子");
          expect(atMidnight.ganZhi).toBe("甲子");
        } else {
          expect(beforeMidnight.ref).toEqual(atMidnight.ref);
          expect(atMidnight.startWallDateTime).toBe("2024-02-04T23:00:00");
          expect(atMidnight.endExclusiveWallDateTime).toBe("2024-02-05T01:00:00");
        }
      }
    }
  );

  it("keeps DST overlap/gap boundaries unsupported rather than choosing an offset", async () => {
    for (const dayBoundary of ["zi_start_23", "midnight"] as const) {
      const revision = await revisionFor(dayBoundary, "America/New_York");
      for (const atInstant of ["2024-11-03T05:30:00Z", "2024-11-03T06:30:00Z"]) {
        const result = await calculateTransitSnapshot({ revision, atInstant });
        expect(result.slots.hour).toMatchObject({ status: "unsupported", reasonCode: "LOCAL_BOUNDARY_UNRESOLVED" });
      }
    }
    const revision = await revisionFor("midnight", "America/Havana");
    const gap = await calculateTransitSnapshot({ revision, atInstant: "2024-03-10T05:30:00Z" });
    expect(gap.slots.day).toMatchObject({ status: "unsupported", reasonCode: "LOCAL_BOUNDARY_UNRESOLVED" });
    const overlap = await calculateTransitSnapshot({ revision, atInstant: "2024-11-03T04:30:00Z" });
    expect(overlap.slots.hour).toMatchObject({ status: "unsupported", reasonCode: "LOCAL_BOUNDARY_UNRESOLVED" });
    expect(overlap.slots.day).toMatchObject({ status: "unsupported", reasonCode: "LOCAL_BOUNDARY_UNRESOLVED" });
  });
});

describe("immutable v1.2 and v1.1 node evidence", () => {
  it("retains the exact pre-edit canonical fixture digest and complete descriptor", async () => {
    expect(await sha256Hex(frozen)).toBe("c5ff0cd07bff4dbe7d5cdbc91b81e7e0bbd49b31c6702aa9c559c7447582a5a4");
    expect(TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0).toEqual(frozen.descriptor);
    expect(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR).toBe(TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_3_0);
    expect(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR).toMatchObject({
      timelineVersion: "hakimi-transit:1.3.0", algorithmId: "hakimi-transit-core:parallel-active-intervals:v3",
      engine: { version: "0.2.0" }
    });
  });

  it.each(frozen.fixtures)("$id replays the complete old output byte-for-byte across current calculations", async (fixture) => {
    const input = { revision: storedRevisionRecordSchema.parse(fixture.input.revision), atInstant: fixture.input.atInstant };
    const executor = requireHistoricalTransitSnapshotExecutor(TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0);
    const before = await executor.calculateSnapshot(input);
    await calculateTransitSnapshot(input);
    const after = await executor.calculateSnapshot(input);
    expect(canonicalStringify(before)).toBe(canonicalStringify(fixture.output));
    expect(canonicalStringify(after)).toBe(canonicalStringify(fixture.output));
    expect(Object.isFrozen(after)).toBe(true);
    for (const node of Object.values(before.tracks).flat()) {
      const resolved = await resolveTransitNodeRef(input.revision, node.ref);
      expect(nodeFacts(resolved)).toEqual(nodeFacts(node));
      expect(await verifyCompatibleTransitNodeRef(input.revision, node.ref)).toEqual(node.ref);
    }
  });

  it("preserves the historical midnight error under its old identity and never re-signs its v1.1 reference", async () => {
    const fixture = frozen.fixtures[0]!;
    const input = { revision: storedRevisionRecordSchema.parse(fixture.input.revision), atInstant: fixture.input.atInstant };
    const previous = await requireHistoricalTransitSnapshotExecutor(TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0).calculateSnapshot(input);
    const current = await calculateTransitSnapshot(input);
    expect(previous.slots.hour).toMatchObject({ status: "resolved", node: { ganZhi: "壬子", endExclusiveWallDateTime: "2024-02-05T01:00:00" } });
    expect(current.slots.hour).toMatchObject({ status: "resolved", node: { ganZhi: "甲子", startWallDateTime: "2024-02-05T00:00:00" } });
    const { transitNodeRefSchema } = await import("@hakimi/contracts");
    const ref = transitNodeRefSchema.parse(frozen.legacyRef);
    expect(await verifyCompatibleTransitNodeRef(input.revision, ref)).toEqual(ref);
    await expect(resolveTransitNodeRef(input.revision, ref)).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });
    await expect(verifyCompatibleTransitNodeRef(input.revision, { ...ref, algorithmId: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.algorithmId }))
      .rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });
    expect(lookupHistoricalTransitSnapshotExecutor({ ...frozen.descriptor, timelineVersion: "hakimi-transit:1.1.0" })).toBeNull();
    expect(lookupHistoricalTransitSnapshotExecutor({ ...frozen.descriptor, algorithmId: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.algorithmId })).toBeNull();
    expect(lookupHistoricalTransitSnapshotExecutor({ ...CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR, engine: frozen.descriptor.engine })).toBeNull();
  });
});
