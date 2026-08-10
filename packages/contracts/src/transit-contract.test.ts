import { describe, expect, it } from "vitest";
import { BUNDLED_TIME_ZONE_DATABASE, BUNDLED_TZDB_SNAPSHOT_ID } from "@hakimi/tzdb-core";
import {
  EVENT_RECORD_VERSION,
  SCHEMA_VERSION,
  anyTransitNodeRefSchema,
  eventRecordSchema,
  futureTransitNodeRefSchema,
  transitNodeRefSchema,
  transitSnapshotSchema,
  type TransitNodeRef,
  type TransitNodeType
} from "./index";

const CASE_ID = "10000000-0000-4000-8000-000000000001";
const REVISION_ID = "10000000-0000-4000-8000-000000000002";
const OTHER_REVISION_ID = "10000000-0000-4000-8000-000000000003";
const CHART_HASH = "a".repeat(64);
const PROFILE_HASH = "b".repeat(64);
const LUCK_RULE_HASH = "c".repeat(64);
const NODE_HASH = "d".repeat(64);
const RESULT_HASH = "e".repeat(64);
const START_INSTANT = "2024-02-04T08:27:07.000Z";
const END_INSTANT = "2025-02-03T14:10:00.000Z";
const START_EPOCH = Date.parse(START_INSTANT);
const EARLIER_INSTANT = "2023-02-04T02:42:21.000Z";
const OVERLAP_INSTANT = "2024-06-01T00:00:00.000Z";

function nodeRef(nodeType: TransitNodeType, overrides: Partial<TransitNodeRef> = {}): TransitNodeRef {
  return {
    schemaVersion: SCHEMA_VERSION,
    namespace: "hakimi-transit-node",
    revisionId: REVISION_ID,
    chartResultHash: CHART_HASH,
    ruleProfileDigest: PROFILE_HASH,
    luckCycleRuleDigest: LUCK_RULE_HASH,
    manualDirection: null,
    timelineVersion: "hakimi-transit:1.0.0",
    algorithmId: "hakimi-transit-core:vertical-slice:v1",
    nodeType,
    startInstant: START_INSTANT,
    nodeId: `${START_EPOCH}.${NODE_HASH}`,
    ...overrides
  };
}

function node(nodeType: TransitNodeType, overrides: Record<string, unknown> = {}) {
  return {
    ref: nodeRef(nodeType),
    nodeType,
    label: `${nodeType} 节点`,
    ganZhi: "甲辰",
    stemTenGod: "比肩",
    index: nodeType === "dayun" ? 1 : null,
    boundaryLabel: "边界",
    startInstant: START_INSTANT,
    endExclusiveInstant: END_INSTANT,
    startWallDateTime: "2024-02-04T16:27:07.000",
    endExclusiveWallDateTime: "2025-02-03T22:10:00.000",
    frame: "fixed_plus08",
    sourcePrecision: "second",
    isActiveAtTarget: true,
    verificationStatus: "engineering_preview",
    ...overrides
  };
}

function intervalNode(
  nodeType: TransitNodeType,
  startInstant: string,
  endExclusiveInstant: string,
  isActiveAtTarget = false
) {
  return node(nodeType, {
    ref: nodeRef(nodeType, {
      startInstant,
      nodeId: `${Date.parse(startInstant)}.${NODE_HASH}`
    }),
    startInstant,
    endExclusiveInstant,
    startWallDateTime: startInstant.slice(0, 23),
    endExclusiveWallDateTime: endExclusiveInstant.slice(0, 23),
    isActiveAtTarget
  });
}

function snapshot() {
  const types = ["dayun", "xiaoyun", "year", "month", "day", "hour"] as const;
  return {
    schemaVersion: SCHEMA_VERSION,
    kind: "transit_snapshot",
    timelineVersion: "hakimi-transit:1.0.0",
    caseId: CASE_ID,
    revisionId: REVISION_ID,
    revisionResultHash: CHART_HASH,
    tzdbVersion: BUNDLED_TZDB_SNAPSHOT_ID,
    timeZoneDatabase: BUNDLED_TIME_ZONE_DATABASE,
    ruleProfileDigest: PROFILE_HASH,
    luckCycleRuleSnapshot: {
      schemaVersion: SCHEMA_VERSION,
      ruleId: "working-default:luck-cycle-xiaoyun",
      ruleVersion: "1.0.0",
      directionRule: "year_stem_yinyang_and_gender",
      unknownSexPolicy: "require_manual_direction",
      anchor: "directional_jie",
      exactBoundaryPolicy: "zero_duration",
      startAgeMethod: "three_days_one_year_exact_duration",
      componentRatios: {
        sourceDaysPerTraditionalYear: 3,
        traditionalMonthsPerYear: 12,
        traditionalDaysPerMonth: 30,
        traditionalHoursPerDay: 24
      },
      handoverCalendar: {
        frame: "fixed_plus08",
        additionOrder: "years_months_days_time",
        overflow: "constrain"
      },
      decadeYears: 10,
      decadeCount: 10,
      xiaoyun: {
        method: "birth_hour_adjacent",
        directionRule: "exact_chart_year_stem_and_gender",
        directionReuse: "luck_cycle_or_manual_direction",
        firstAge: 1,
        firstStepOffset: 1,
        ageBasis: "nominal_age",
        boundaryAlignment: "flow_year_start_exact",
        boundaryFrame: "fixed_plus08",
        scope: "whole_life",
        cycleLength: 60,
        intervalPolicy: "half_open",
        unknownSexPolicy: "require_manual_direction",
        unknownHourPolicy: "unsupported"
      }
    },
    luckCycleRuleDigest: LUCK_RULE_HASH,
    luckCycleRuleSource: "revision_snapshot",
    manualDirection: null,
    target: {
      instant: START_INSTANT,
      revisionWallDateTime: "2024-02-04T16:27:07.000",
      fixedPlusEightWallDateTime: "2024-02-04T16:27:07.000",
      displayTimeZone: "Asia/Shanghai"
    },
    slots: Object.fromEntries(types.map((type) => [type, { status: "resolved", node: node(type) }])),
    tracks: Object.fromEntries(types.map((type) => [type, [node(type)]])),
    manifest: {
      algorithmId: "hakimi-transit-core:vertical-slice:v1",
      engineName: "hakimi-transit-core",
      engineVersion: "0.1.0",
      upstreamName: "lunar-typescript",
      upstreamVersion: "1.8.6",
      yearMonthFrame: "fixed_plus08",
      dayHourFrame: "revision_iana_civil",
      interpretationIncluded: false,
      goldCaseCount: 0,
      releaseGatePassed: false,
      sourceRefs: ["https://github.com/6tail/lunar-typescript"]
    },
    resultHash: RESULT_HASH,
    warnings: ["工程预览"],
    knownGaps: ["尚无金标准"]
  };
}

function eventFixture(transitNodeRef: unknown, revisionId: string | null = REVISION_ID) {
  return {
    schemaVersion: SCHEMA_VERSION,
    recordVersion: EVENT_RECORD_VERSION,
    id: "10000000-0000-4000-8000-000000000004",
    caseId: CASE_ID,
    revisionId,
    transitNodeRef,
    datePrecision: "day",
    startDate: "2024-02-04",
    endDate: null,
    title: "边界事件",
    tags: [],
    sourceRefs: [],
    feedback: "unreviewed",
    bodyFormat: "markdown",
    body: "",
    deletedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    timeContext: { kind: "calendar_date" }
  };
}

describe("TransitNodeRef contracts", () => {
  it("keeps the legacy nullable-version namespace readable while new writes require a locked version", () => {
    const legacy = {
      namespace: "future-transit-node",
      nodeType: "year",
      nodeId: "legacy-year-2024",
      timelineVersion: null
    };
    expect(futureTransitNodeRefSchema.safeParse(legacy).success).toBe(true);
    expect(anyTransitNodeRefSchema.safeParse(legacy).success).toBe(true);
    expect(transitNodeRefSchema.safeParse(legacy).success).toBe(false);

    const current = nodeRef("year");
    expect(transitNodeRefSchema.parse(current)).toEqual(current);
    expect(transitNodeRefSchema.safeParse({ ...current, timelineVersion: null }).success).toBe(false);
    expect(transitNodeRefSchema.safeParse({ ...current, nodeId: "year-2024" }).success).toBe(false);
  });

  it("requires a matching revision whenever an event binds a current node", () => {
    const ref = nodeRef("year");
    expect(eventRecordSchema.safeParse(eventFixture(ref)).success).toBe(true);
    expect(eventRecordSchema.safeParse(eventFixture(ref, null)).success).toBe(false);
    expect(eventRecordSchema.safeParse(eventFixture(ref, OTHER_REVISION_ID)).success).toBe(false);
  });

  it("supports pre-1970 nodes with a signed epoch prefix", () => {
    const startInstant = "1960-02-05T00:00:00.000Z";
    const ref = nodeRef("year", {
      startInstant,
      nodeId: `${Date.parse(startInstant)}.${NODE_HASH}`
    });
    expect(transitNodeRefSchema.safeParse(ref).success).toBe(true);
  });
});

describe("TransitSnapshot contract", () => {
  it("accepts one explicit six-level vertical slice and round-trips without stripping fields", () => {
    const fixture = snapshot();
    expect(transitSnapshotSchema.parse(fixture)).toEqual(fixture);
  });

  it("round-trips the locked xiaoyun rule while keeping a pre-xiaoyun snapshot readable", () => {
    const current = snapshot();
    const serialized = JSON.parse(JSON.stringify(current)) as ReturnType<typeof snapshot>;
    expect(transitSnapshotSchema.parse(serialized).luckCycleRuleSnapshot.xiaoyun)
      .toEqual(current.luckCycleRuleSnapshot.xiaoyun);

    const legacy = structuredClone(current);
    delete (legacy.luckCycleRuleSnapshot as { xiaoyun?: unknown }).xiaoyun;
    legacy.luckCycleRuleSnapshot.ruleId = "working-default:luck-cycle";
    const parsedLegacy = transitSnapshotSchema.parse(legacy).luckCycleRuleSnapshot;
    expect(parsedLegacy.xiaoyun).toBeUndefined();
    expect(`${parsedLegacy.ruleId}@${parsedLegacy.ruleVersion}`)
      .not.toBe(`${current.luckCycleRuleSnapshot.ruleId}@${current.luckCycleRuleSnapshot.ruleVersion}`);
  });

  it("rejects a xiaoyun manual-direction policy that conflicts with its reused dayun direction", () => {
    const incompatible = snapshot();
    incompatible.luckCycleRuleSnapshot.unknownSexPolicy = "reject";
    expect(transitSnapshotSchema.safeParse(incompatible).success).toBe(false);
  });

  it("rejects a node id whose reversible epoch does not equal the interval start", () => {
    const fixture = snapshot();
    const year = fixture.slots.year as { status: "resolved"; node: ReturnType<typeof node> };
    year.node.ref.nodeId = `${START_EPOCH + 1}.${NODE_HASH}`;
    expect(transitSnapshotSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects a resolved slot containing the wrong track type", () => {
    const fixture = snapshot();
    fixture.slots.year = { status: "resolved", node: node("month") };
    expect(transitSnapshotSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects embedded references from another revision or timeline", () => {
    const otherRevision = snapshot();
    const year = otherRevision.slots.year as { status: "resolved"; node: ReturnType<typeof node> };
    year.node.ref.revisionId = OTHER_REVISION_ID;
    expect(transitSnapshotSchema.safeParse(otherRevision).success).toBe(false);

    const otherTimeline = snapshot();
    const month = otherTimeline.tracks.month[0] as ReturnType<typeof node>;
    month.ref.timelineVersion = "hakimi-transit:2.0.0";
    expect(transitSnapshotSchema.safeParse(otherTimeline).success).toBe(false);
  });

  it("requires a resolved slot to be active at the selected instant", () => {
    const inactive = snapshot();
    const day = inactive.slots.day as { status: "resolved"; node: ReturnType<typeof node> };
    day.node.isActiveAtTarget = false;
    expect(transitSnapshotSchema.safeParse(inactive).success).toBe(false);

    const outside = snapshot();
    outside.target.instant = "2026-01-01T00:00:00.000Z";
    expect(transitSnapshotSchema.safeParse(outside).success).toBe(false);
  });

  it("rejects unsorted or overlapping intervals on one track", () => {
    const unsorted = snapshot();
    unsorted.tracks.year = [
      node("year"),
      intervalNode("year", EARLIER_INSTANT, START_INSTANT)
    ];
    expect(transitSnapshotSchema.safeParse(unsorted).success).toBe(false);

    const overlapping = snapshot();
    overlapping.tracks.year = [
      node("year"),
      intervalNode("year", OVERLAP_INSTANT, "2025-06-01T00:00:00.000Z")
    ];
    expect(transitSnapshotSchema.safeParse(overlapping).success).toBe(false);
  });

  it("rejects hiding a containing xiaoyun node as inactive behind an unsupported slot", () => {
    const tampered = snapshot();
    tampered.tracks.xiaoyun[0] = node("xiaoyun", { isActiveAtTarget: false });
    (tampered.slots as unknown as { xiaoyun: unknown }).xiaoyun = {
      status: "unsupported",
      reasonCode: "TAMPERED",
      message: "伪造不支持状态"
    };
    expect(transitSnapshotSchema.safeParse(tampered).success).toBe(false);
  });

  it("requires a resolved slot to reuse the complete containing track node", () => {
    const tampered = snapshot();
    const slot = tampered.slots.year as { status: "resolved"; node: ReturnType<typeof node> };
    slot.node.label = "被篡改的流年标签";
    expect(transitSnapshotSchema.safeParse(tampered).success).toBe(false);
  });
});
