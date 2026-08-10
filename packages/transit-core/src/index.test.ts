import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart, calculateChartForBundledSnapshot } from "@hakimi/bazi-core";
import { sha256Hex } from "@hakimi/integrity";
import { LunarUtil } from "lunar-typescript";
import type {
  BirthInput,
  RevisionRecord,
  RuleProfile,
  TransitNode,
  TransitNodeRef,
  TransitSlot
} from "@hakimi/contracts";
import {
  LEGACY_HASH_SCHEMA_VERSION,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  buildCalculatedChartHashPayload
} from "@hakimi/contracts";
import {
  COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1,
  CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
  HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_REGISTRY,
  TRANSIT_CORE_ENGINE,
  TRANSIT_SNAPSHOT_TIME_ZONE_DATABASE_V1_2_0,
  calculateTransitSnapshot,
  lookupHistoricalTransitSnapshotExecutor,
  requireHistoricalTransitSnapshotExecutor,
  resolveTransitNodeRef,
  verifyCompatibleTransitNodeRef
} from "./index";

const RULE_PROFILE: RuleProfile = {
  schemaVersion: "1.0.0",
  profileId: "ziping-working-default",
  profileVersion: "0.1.0",
  status: "working_default",
  label: "传统子平工作默认",
  notice: "测试使用的显式工作规则快照，不代表唯一正确流派或已通过金标准。",
  sourceRefs: [],
  supportedRange: {
    stronglyVerifiedFrom: "1900-01-01",
    stronglyVerifiedTo: "2100-12-31",
    outsideRangePolicy: "experimental_with_warning"
  },
  calendar: {
    yearBoundary: "lichun_exact",
    monthBoundary: "jie_exact",
    dayBoundary: "zi_start_23",
    ziHourDayStemBasis: "after_day_change",
    hourBasis: "civil_time",
    timezoneSource: "iana",
    dstAmbiguity: "require_user",
    locationPrecision: "city"
  },
  solarTime: {
    enabled: false,
    showComparison: true,
    longitudeSource: "location",
    equationOfTimeModel: null
  },
  luckCycle: {
    directionRule: "year_stem_yinyang_and_gender",
    unknownValuePolicy: "require_manual_direction",
    anchor: "directional_jie",
    startAgeMethod: "three_days_one_year_exact_duration",
    rounding: "retain_duration"
  },
  layers: {
    hiddenStems: true,
    tenGods: true,
    nayin: true,
    voidBranches: true,
    twelveGrowth: true,
    stemBranchRelations: true,
    shensha: false
  },
  interpretation: {
    strengthRulePack: null,
    structureRulePack: null,
    climateRulePack: null,
    usefulGodRulePack: null
  }
};

async function resignRevisionResult(revision: RevisionRecord): Promise<void> {
  revision.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload({
    input: revision.input,
    timeCalibration: revision.timeCalibration,
    ruleProfile: revision.ruleProfile,
    luckCycleRuleSnapshot: revision.luckCycleRuleSnapshot,
    facts: revision.facts,
    manifest: revision.manifest
  }));
}

const BASE_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26:00",
  timePrecision: "exact_second",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: {
    label: "",
    latitude: null,
    longitude: null,
    precision: "unknown"
  },
  sourceNote: ""
};

const RETAINED_TZDB_2025B_SNAPSHOT_ID =
  "iana-tzdb@2025b/sha256:b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425" +
  "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";

async function createRevision(sex: BirthInput["sex"] = "male"): Promise<RevisionRecord> {
  const chart = await calculateChart({ ...BASE_INPUT, sex }, RULE_PROFILE);
  const revisionId = sex === "unspecified"
    ? "11111111-1111-4111-8111-111111111112"
    : sex === "female"
      ? "11111111-1111-4111-8111-111111111113"
      : "11111111-1111-4111-8111-111111111111";
  return {
    schemaVersion: "1.0.0",
    id: revisionId,
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
}

async function createCasablancaRevision(
  snapshotId?: string
): Promise<RevisionRecord> {
  const input: BirthInput = { ...BASE_INPUT, timeZone: "Africa/Casablanca" };
  const chart = snapshotId === undefined
    ? await calculateChart(input, RULE_PROFILE)
    : await calculateChartForBundledSnapshot(input, RULE_PROFILE, snapshotId);
  return {
    schemaVersion: "1.0.0",
    id: "33333333-3333-4333-8333-333333333333",
    caseId: "44444444-4444-4444-8444-444444444444",
    revisionNumber: 1,
    createdAt: "2026-08-03T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
}

function resolved(slot: TransitSlot): TransitNode {
  expect(slot.status).toBe("resolved");
  if (slot.status !== "resolved") throw new Error(`expected resolved slot, got ${slot.status}`);
  return slot.node;
}

function alteredHex(value: string): string {
  return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
}

async function compatibleV11Ref(node: TransitNode): Promise<TransitNodeRef> {
  const timelineVersion = COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1;
  const factHash = await sha256Hex({
    timelineVersion,
    algorithmId: node.ref.algorithmId,
    revisionId: node.ref.revisionId,
    chartResultHash: node.ref.chartResultHash,
    ruleProfileDigest: node.ref.ruleProfileDigest,
    luckCycleRuleDigest: node.ref.luckCycleRuleDigest,
    manualDirection: node.ref.manualDirection,
    nodeType: node.nodeType,
    startInstant: node.startInstant,
    endExclusiveInstant: node.endExclusiveInstant,
    frame: node.frame,
    ganZhi: node.ganZhi,
    index: node.index,
    boundaryLabel: node.boundaryLabel
  });
  return {
    ...node.ref,
    timelineVersion,
    nodeId: `${Date.parse(node.startInstant)}.${factHash}`
  };
}

describe("calculateTransitSnapshot", () => {
  let revision: RevisionRecord;
  let femaleRevision: RevisionRecord;
  let unspecifiedRevision: RevisionRecord;

  beforeAll(async () => {
    [revision, femaleRevision, unspecifiedRevision] = await Promise.all([
      createRevision("male"),
      createRevision("female"),
      createRevision("unspecified")
    ]);
  });

  it("相同修订与等价瞬时点产生完全相同的快照和结果哈希", async () => {
    const first = await calculateTransitSnapshot({
      revision,
      atInstant: "2024-02-04T08:27:07Z"
    });
    const repeated = await calculateTransitSnapshot({
      revision,
      atInstant: "2024-02-04T08:27:07Z"
    });
    const equivalentOffset = await calculateTransitSnapshot({
      revision,
      atInstant: "2024-02-04T16:27:07+08:00"
    });

    expect(repeated).toEqual(first);
    expect(equivalentOffset).toEqual(first);
    expect(first.timelineVersion).toBe("hakimi-transit:1.2.0");
    expect(first.tzdbVersion).toBe(first.timeZoneDatabase.snapshotId);
    expect(first.timeZoneDatabase.ianaVersion).toBe("2026c");
    expect(first.manifest.algorithmId).toBe("hakimi-transit-core:parallel-active-intervals:v2");
    expect(first.resultHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tracks.hour.length).toBeLessThanOrEqual(5);
    expect(first.tracks.xiaoyun.length).toBeLessThanOrEqual(5);
  });

  it("旧版未识别 tzdb 修订保持可验，但拒绝生成新的运限快照", async () => {
    const legacy = structuredClone(revision);
    legacy.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
    legacy.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
    legacy.manifest.timeZoneDatabase = undefined;
    await resignRevisionResult(legacy);

    await expect(calculateTransitSnapshot({
      revision: legacy,
      atInstant: "2024-02-04T08:27:07Z"
    })).rejects.toMatchObject({ code: "TZDB_LEGACY_UNIDENTIFIED" });
  });

  it("立春前一秒、当秒、后一秒使用无重叠半开区间换流年与流月", async () => {
    const [before, at, after] = await Promise.all([
      calculateTransitSnapshot({ revision, atInstant: "2024-02-04T08:27:06Z" }),
      calculateTransitSnapshot({ revision, atInstant: "2024-02-04T08:27:07Z" }),
      calculateTransitSnapshot({ revision, atInstant: "2024-02-04T08:27:08Z" })
    ]);

    const beforeYear = resolved(before.slots.year);
    const atYear = resolved(at.slots.year);
    const afterYear = resolved(after.slots.year);
    const beforeMonth = resolved(before.slots.month);
    const atMonth = resolved(at.slots.month);
    const afterMonth = resolved(after.slots.month);

    expect(beforeYear.ganZhi).toBe("癸卯");
    expect(atYear.ganZhi).toBe("甲辰");
    expect(afterYear.ref.nodeId).toBe(atYear.ref.nodeId);
    expect(beforeYear.endExclusiveInstant).toBe(atYear.startInstant);

    expect(beforeMonth.ganZhi).toBe("乙丑");
    expect(atMonth.ganZhi).toBe("丙寅");
    expect(afterMonth.ref.nodeId).toBe(atMonth.ref.nodeId);
    expect(beforeMonth.endExclusiveInstant).toBe(atMonth.startInstant);
    expect(atMonth.boundaryLabel).toBe("立春");
  });

  it("普通交节只切换流月，不错误切换流年", async () => {
    const [before, at, after] = await Promise.all([
      calculateTransitSnapshot({ revision, atInstant: "2024-03-05T02:22:44Z" }),
      calculateTransitSnapshot({ revision, atInstant: "2024-03-05T02:22:45Z" }),
      calculateTransitSnapshot({ revision, atInstant: "2024-03-05T02:22:46Z" })
    ]);

    expect(resolved(before.slots.year).ganZhi).toBe("甲辰");
    expect(resolved(at.slots.year).ref.nodeId).toBe(resolved(before.slots.year).ref.nodeId);
    expect(resolved(after.slots.year).ref.nodeId).toBe(resolved(at.slots.year).ref.nodeId);

    const beforeMonth = resolved(before.slots.month);
    const atMonth = resolved(at.slots.month);
    expect(beforeMonth.ganZhi).toBe("丙寅");
    expect(atMonth.ganZhi).toBe("丁卯");
    expect(atMonth.boundaryLabel).toBe("惊蛰");
    expect(beforeMonth.endExclusiveInstant).toBe(atMonth.startInstant);
    expect(resolved(after.slots.month).ref.nodeId).toBe(atMonth.ref.nodeId);
  });

  it("23:00 子初同时切换流日与子时，前后节点在同一瞬时点衔接", async () => {
    const [before, at] = await Promise.all([
      calculateTransitSnapshot({ revision, atInstant: "2024-02-04T14:59:59Z" }),
      calculateTransitSnapshot({ revision, atInstant: "2024-02-04T15:00:00Z" })
    ]);

    const beforeDay = resolved(before.slots.day);
    const atDay = resolved(at.slots.day);
    const beforeHour = resolved(before.slots.hour);
    const atHour = resolved(at.slots.hour);

    expect(before.target.revisionWallDateTime).toBe("2024-02-04T22:59:59");
    expect(at.target.revisionWallDateTime).toBe("2024-02-04T23:00:00");
    expect(beforeDay.ganZhi).toBe("戊戌");
    expect(atDay.ganZhi).toBe("己亥");
    expect(beforeDay.endExclusiveInstant).toBe(atDay.startInstant);
    expect(beforeHour.ganZhi).toBe("癸亥");
    expect(atHour.ganZhi).toBe("甲子");
    expect(beforeHour.endExclusiveInstant).toBe(atHour.startInstant);
  });

  it("01:00 时辰边界由子时切换为丑时且区间连续", async () => {
    const [before, at] = await Promise.all([
      calculateTransitSnapshot({ revision, atInstant: "2024-02-04T16:59:59Z" }),
      calculateTransitSnapshot({ revision, atInstant: "2024-02-04T17:00:00Z" })
    ]);
    const beforeHour = resolved(before.slots.hour);
    const atHour = resolved(at.slots.hour);

    expect(beforeHour.label).toBe("子时");
    expect(beforeHour.ganZhi).toBe("甲子");
    expect(atHour.label).toBe("丑时");
    expect(atHour.ganZhi).toBe("乙丑");
    expect(beforeHour.endExclusiveInstant).toBe(atHour.startInstant);
  });

  it("交运前明确标记为不适用，而不是伪造第一柱大运", async () => {
    const snapshot = await calculateTransitSnapshot({
      revision,
      atInstant: revision.timeCalibration.utcInstant!.replace(".000Z", "Z")
    });

    expect(snapshot.slots.dayun).toEqual({
      status: "not_applicable",
      reasonCode: "PRE_HANDOVER",
      message: "目标时刻早于第一步交运时刻。"
    });
    expect(snapshot.tracks.dayun.length).toBeGreaterThan(0);
  });

  it("性别不明时只阻断依赖顺逆的大运，人工方向进入快照和大运引用", async () => {
    const unresolved = await calculateTransitSnapshot({
      revision: unspecifiedRevision,
      atInstant: "2024-02-04T08:27:07Z"
    });
    expect(unresolved.slots.dayun).toMatchObject({
      status: "unsupported",
      reasonCode: "MANUAL_DIRECTION_REQUIRED"
    });
    expect(unresolved.slots.xiaoyun).toMatchObject({
      status: "unsupported",
      reasonCode: "MANUAL_DIRECTION_REQUIRED"
    });
    expect(unresolved.slots.year.status).toBe("resolved");

    const directed = await calculateTransitSnapshot({
      revision: unspecifiedRevision,
      atInstant: "2024-02-04T08:27:07Z",
      manualDirection: "forward"
    });
    const dayun = resolved(directed.slots.dayun);
    const xiaoyun = resolved(directed.slots.xiaoyun);
    expect(directed.manualDirection).toBe("forward");
    expect(dayun.ref.manualDirection).toBe("forward");
    expect(xiaoyun.ref.manualDirection).toBe("forward");

    await expect(calculateTransitSnapshot({
      revision,
      atInstant: "2024-02-04T08:27:07Z",
      manualDirection: "forward"
    })).rejects.toMatchObject({
      code: "MANUAL_DIRECTION_NOT_ALLOWED"
    });
  });

  it("出生时柱相邻起法按大运方向顺逆推进，虚岁 1 从出生瞬时点起算", async () => {
    const birthInstant = revision.timeCalibration.utcInstant!;
    const [backward, forward] = await Promise.all([
      calculateTransitSnapshot({ revision, atInstant: birthInstant }),
      calculateTransitSnapshot({ revision: femaleRevision, atInstant: birthInstant })
    ]);
    const backwardNode = resolved(backward.slots.xiaoyun);
    const forwardNode = resolved(forward.slots.xiaoyun);
    const birthHourIndex = LunarUtil.JIA_ZI.indexOf(revision.facts.pillars.hour.ganZhi);

    expect(backwardNode.index).toBe(1);
    expect(Date.parse(backwardNode.startInstant)).toBe(Date.parse(birthInstant));
    expect(backwardNode.ganZhi).toBe(LunarUtil.JIA_ZI[(birthHourIndex - 1 + 60) % 60]);
    expect(forwardNode.index).toBe(1);
    expect(forwardNode.ganZhi).toBe(LunarUtil.JIA_ZI[(birthHourIndex + 1) % 60]);
  });

  it("小运六十步精确回环，虚岁 61 与虚岁 1 干支相同", async () => {
    const ageOne = await calculateTransitSnapshot({
      revision,
      atInstant: revision.timeCalibration.utcInstant!
    });
    const ageSixtyOne = await calculateTransitSnapshot({
      revision,
      atInstant: "2055-07-01T00:00:00Z"
    });
    const first = resolved(ageOne.slots.xiaoyun);
    const wrapped = resolved(ageSixtyOne.slots.xiaoyun);

    expect(first.index).toBe(1);
    expect(wrapped.index).toBe(61);
    expect(wrapped.ganZhi).toBe(first.ganZhi);
  });

  it("出生前没有小运节点", async () => {
    const birthEpoch = Date.parse(revision.timeCalibration.utcInstant!);
    const snapshot = await calculateTransitSnapshot({
      revision,
      atInstant: new Date(birthEpoch - 1_000).toISOString()
    });

    expect(snapshot.slots.xiaoyun).toEqual({
      status: "not_applicable",
      reasonCode: "PRE_BIRTH",
      message: "目标时刻早于出生瞬时点，不存在小运节点。"
    });
    expect(snapshot.tracks.xiaoyun).toEqual([]);
  });

  it("首个精确立春前 1ms 仍为虚岁 1，当刻以半开区间进入虚岁 2", async () => {
    const birth = await calculateTransitSnapshot({
      revision,
      atInstant: revision.timeCalibration.utcInstant!
    });
    const ageOne = resolved(birth.slots.xiaoyun);
    const boundaryEpoch = Date.parse(ageOne.endExclusiveInstant);
    const [before, at] = await Promise.all([
      calculateTransitSnapshot({ revision, atInstant: new Date(boundaryEpoch - 1).toISOString() }),
      calculateTransitSnapshot({ revision, atInstant: new Date(boundaryEpoch).toISOString() })
    ]);
    const beforeNode = resolved(before.slots.xiaoyun);
    const atNode = resolved(at.slots.xiaoyun);

    expect(beforeNode.index).toBe(1);
    expect(atNode.index).toBe(2);
    expect(beforeNode.endExclusiveInstant).toBe(atNode.startInstant);
    expect(atNode.boundaryLabel).toBe("精确立春增龄");
  });

  it("旧快照缺少小运字段时继续可读、摘要不同且明确 unsupported", async () => {
    const current = await calculateTransitSnapshot({
      revision,
      atInstant: "2024-02-04T08:27:07Z"
    });
    const legacyRevision = structuredClone(revision);
    const legacyRule = legacyRevision.luckCycleRuleSnapshot!;
    delete legacyRule.xiaoyun;
    legacyRule.ruleId = `${legacyRevision.ruleProfile.profileId}:luck-cycle`;
    legacyRule.ruleVersion = legacyRevision.ruleProfile.profileVersion;
    legacyRevision.manifest.luckCycleRuleDigest = await sha256Hex(legacyRule);
    await resignRevisionResult(legacyRevision);
    const legacy = await calculateTransitSnapshot({
      revision: legacyRevision,
      atInstant: "2024-02-04T08:27:07Z"
    });

    expect(legacy.luckCycleRuleSnapshot.xiaoyun).toBeUndefined();
    expect(legacy.luckCycleRuleDigest).not.toBe(current.luckCycleRuleDigest);
    expect(`${legacy.luckCycleRuleSnapshot.ruleId}@${legacy.luckCycleRuleSnapshot.ruleVersion}`)
      .not.toBe(`${current.luckCycleRuleSnapshot.ruleId}@${current.luckCycleRuleSnapshot.ruleVersion}`);
    expect(legacy.slots.xiaoyun).toMatchObject({
      status: "unsupported",
      reasonCode: "XIAOYUN_RULE_SNAPSHOT_MISSING"
    });
    expect(legacy.tracks.xiaoyun).toEqual([]);

    const olderRevision = structuredClone(revision);
    delete olderRevision.luckCycleRuleSnapshot;
    delete olderRevision.manifest.luckCycleRuleDigest;
    await resignRevisionResult(olderRevision);
    const older = await calculateTransitSnapshot({
      revision: olderRevision,
      atInstant: "2024-02-04T08:27:07Z"
    });
    expect(older.luckCycleRuleSource).toBe("legacy_inferred");
    expect(older.luckCycleRuleSnapshot.xiaoyun).toBeUndefined();
    expect(older.slots.xiaoyun).toMatchObject({ reasonCode: "XIAOYUN_RULE_SNAPSHOT_MISSING" });
  });

  it("快照与摘要必须成对存在，删除摘要不能绕过现代或篡改规则校验", async () => {
    const missingDigest = structuredClone(revision);
    delete missingDigest.manifest.luckCycleRuleDigest;
    await expect(calculateTransitSnapshot({
      revision: missingDigest,
      atInstant: "2024-02-04T08:27:07Z"
    })).rejects.toMatchObject({ code: "RULE_SNAPSHOT_MISMATCH" });

    const tampered = structuredClone(revision);
    tampered.luckCycleRuleSnapshot!.decadeCount = 9;
    delete tampered.manifest.luckCycleRuleDigest;
    await expect(calculateTransitSnapshot({
      revision: tampered,
      atInstant: "2024-02-04T08:27:07Z"
    })).rejects.toMatchObject({ code: "RULE_SNAPSHOT_MISMATCH" });

    const missingSnapshot = structuredClone(revision);
    delete missingSnapshot.luckCycleRuleSnapshot;
    await expect(calculateTransitSnapshot({
      revision: missingSnapshot,
      atInstant: "2024-02-04T08:27:07Z"
    })).rejects.toMatchObject({ code: "RULE_SNAPSHOT_MISMATCH" });

    const identityCollision = structuredClone(revision);
    delete identityCollision.luckCycleRuleSnapshot!.xiaoyun;
    identityCollision.manifest.luckCycleRuleDigest = await sha256Hex(identityCollision.luckCycleRuleSnapshot);
    await resignRevisionResult(identityCollision);
    await expect(calculateTransitSnapshot({
      revision: identityCollision,
      atInstant: "2024-02-04T08:27:07Z"
    })).rejects.toMatchObject({ code: "RULE_SNAPSHOT_MISMATCH" });
  });

  it("拒绝把篡改成未知时辰的正式修订当作小运降级输入", async () => {
    const unknownHourRevision = structuredClone(revision);
    unknownHourRevision.input.time = null;
    unknownHourRevision.input.timePrecision = "unknown_hour";
    await expect(calculateTransitSnapshot({
      revision: unknownHourRevision,
      atInstant: "2024-02-04T08:27:07Z"
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });
  });
});

describe("resolveTransitNodeRef", () => {
  let revision: RevisionRecord;
  let unspecifiedRevision: RevisionRecord;
  let activeDay: TransitNode;
  let activeXiaoyun: TransitNode;

  beforeAll(async () => {
    [revision, unspecifiedRevision] = await Promise.all([
      createRevision(),
      createRevision("unspecified")
    ]);
    const snapshot = await calculateTransitSnapshot({
      revision,
      atInstant: "2024-02-04T15:00:00Z"
    });
    activeDay = resolved(snapshot.slots.day);
    activeXiaoyun = resolved(snapshot.slots.xiaoyun);
  });

  it("用锁版上下文和节点起点可稳定复算活动节点", async () => {
    const restored = await resolveTransitNodeRef(revision, activeDay.ref);
    expect(restored.ref).toEqual(activeDay.ref);
    expect(restored.startInstant).toBe(activeDay.startInstant);
    expect(restored.endExclusiveInstant).toBe(activeDay.endExclusiveInstant);
    expect(restored.ganZhi).toBe(activeDay.ganZhi);
  });

  it("精确验证并原样保留 allowlist 内的 v1.1/v2 历史引用", async () => {
    const historical = await compatibleV11Ref(activeDay);
    await expect(verifyCompatibleTransitNodeRef(revision, historical)).resolves.toEqual(historical);
    await expect(resolveTransitNodeRef(revision, historical)).rejects.toMatchObject({
      code: "TRANSIT_CONTEXT_MISMATCH"
    });
  });

  it("历史兼容入口对未知版本、未知算法与事实篡改保持失败关闭", async () => {
    const historical = await compatibleV11Ref(activeDay);
    await expect(verifyCompatibleTransitNodeRef(revision, {
      ...historical,
      timelineVersion: "hakimi-transit:1.0.0"
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });
    await expect(verifyCompatibleTransitNodeRef(revision, {
      ...historical,
      algorithmId: "hakimi-transit-core:parallel-active-intervals:v1"
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });
    await expect(verifyCompatibleTransitNodeRef(revision, {
      ...historical,
      nodeId: alteredHex(historical.nodeId)
    })).rejects.toMatchObject({ code: "STALE_NODE_REF" });
  });

  it("小运节点可由锁版摘要、方向与半开区间起点稳定复算", async () => {
    const restored = await resolveTransitNodeRef(revision, activeXiaoyun.ref);
    expect(restored.ref).toEqual(activeXiaoyun.ref);
    expect(restored.index).toBe(activeXiaoyun.index);
    expect(restored.ganZhi).toBe(activeXiaoyun.ganZhi);
    expect(restored.endExclusiveInstant).toBe(activeXiaoyun.endExclusiveInstant);
  });

  it("性别不明的大运与小运引用持久携带人工方向，方向被改动后不能复算", async () => {
    const snapshot = await calculateTransitSnapshot({
      revision: unspecifiedRevision,
      atInstant: "2024-02-04T08:27:07Z",
      manualDirection: "forward"
    });
    const dayun = resolved(snapshot.slots.dayun);
    const xiaoyun = resolved(snapshot.slots.xiaoyun);

    const restored = await resolveTransitNodeRef(unspecifiedRevision, dayun.ref);
    expect(restored.ref.manualDirection).toBe("forward");
    expect(restored.ref.nodeId).toBe(dayun.ref.nodeId);
    const restoredXiaoyun = await resolveTransitNodeRef(unspecifiedRevision, xiaoyun.ref);
    expect(restoredXiaoyun.ref.manualDirection).toBe("forward");
    expect(restoredXiaoyun.ref.nodeId).toBe(xiaoyun.ref.nodeId);

    await expect(resolveTransitNodeRef(unspecifiedRevision, {
      ...dayun.ref,
      manualDirection: "backward"
    })).rejects.toMatchObject({ code: "STALE_NODE_REF" });
    await expect(resolveTransitNodeRef(unspecifiedRevision, {
      ...xiaoyun.ref,
      manualDirection: "backward"
    })).rejects.toMatchObject({ code: "STALE_NODE_REF" });
  });

  it("拒绝 nodeId、规则摘要或起点篡改，不跳转到近似节点", async () => {
    await expect(resolveTransitNodeRef(revision, {
      ...activeDay.ref,
      nodeId: alteredHex(activeDay.ref.nodeId)
    })).rejects.toMatchObject({ code: "STALE_NODE_REF" });

    await expect(resolveTransitNodeRef(revision, {
      ...activeDay.ref,
      ruleProfileDigest: "0".repeat(64)
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });

    await expect(resolveTransitNodeRef(revision, {
      ...activeDay.ref,
      startInstant: "2024-02-05T15:00:00.000Z"
    })).rejects.toMatchObject({ code: "STALE_NODE_REF" });
  });
});

describe("historical TransitSnapshot executor registry", () => {
  let revision: RevisionRecord;
  let casablancaRevision: RevisionRecord;
  let retainedCasablancaRevision: RevisionRecord;
  const inputInstant = "2024-02-04T15:00:00Z";

  beforeAll(async () => {
    [revision, casablancaRevision, retainedCasablancaRevision] = await Promise.all([
      createRevision(),
      createCasablancaRevision(),
      createCasablancaRevision(RETAINED_TZDB_2025B_SNAPSHOT_ID)
    ]);
  });

  it("按完整 v1.2 描述符精确选择并重建完整快照", async () => {
    const executor = lookupHistoricalTransitSnapshotExecutor(
      CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR
    );
    expect(executor?.executorId).toBe("hakimi-transit-core:transit-snapshot-executor:1.2.0");

    const [current, replayed] = await Promise.all([
      calculateTransitSnapshot({ revision, atInstant: inputInstant }),
      requireHistoricalTransitSnapshotExecutor(
        CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR
      ).calculateSnapshot({ revision, atInstant: inputInstant })
    ]);

    expect(replayed).toEqual(current);
    expect(replayed.timelineVersion).toBe(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timelineVersion);
    expect(replayed.timeZoneDatabase).toEqual(TRANSIT_SNAPSHOT_TIME_ZONE_DATABASE_V1_2_0);
    expect(replayed.manifest).toMatchObject({
      algorithmId: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.algorithmId,
      engineName: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.engine.name,
      engineVersion: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.engine.version,
      upstreamName: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.engine.upstreamName,
      upstreamVersion: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.engine.upstreamVersion
    });
    for (const node of Object.values(replayed.tracks).flat()) {
      expect(node.ref.timelineVersion).toBe(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timelineVersion);
      expect(node.ref.algorithmId).toBe(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.algorithmId);
    }
  });

  it("Casablanca 差异哨兵只用冻结 2026c 生成目标墙时与流日/流时边界", async () => {
    const replayed = await requireHistoricalTransitSnapshotExecutor(
      CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR
    ).calculateSnapshot({
      revision: casablancaRevision,
      atInstant: "2026-10-01T00:00:00Z"
    });
    const day = resolved(replayed.slots.day);
    const hour = resolved(replayed.slots.hour);

    expect(replayed.target.revisionWallDateTime).toBe("2026-10-01T00:00:00");
    expect(day).toMatchObject({
      startInstant: "2026-09-30T23:00:00.000Z",
      endExclusiveInstant: "2026-10-01T23:00:00.000Z",
      startWallDateTime: "2026-09-30T23:00:00",
      endExclusiveWallDateTime: "2026-10-01T23:00:00"
    });
    expect(hour).toMatchObject({
      startInstant: "2026-09-30T23:00:00.000Z",
      endExclusiveInstant: "2026-10-01T01:00:00.000Z",
      startWallDateTime: "2026-09-30T23:00:00",
      endExclusiveWallDateTime: "2026-10-01T01:00:00"
    });
    expect(replayed.resultHash).toBe("a760f218885e6e36e1a6d5f310fb7be6ccdd54ff8bed054841cc1f12fa0c1caa");
  });

  it("v1.2 对 retained 2025b Revision 明确失败关闭，不借当前 2026c 替代", async () => {
    await expect(requireHistoricalTransitSnapshotExecutor(
      CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR
    ).calculateSnapshot({
      revision: retainedCasablancaRevision,
      atInstant: "2026-10-01T00:00:00Z"
    })).rejects.toMatchObject({ code: "TZDB_SNAPSHOT_MISMATCH" });
  });

  it("对 retained v1.1、未知身份、部分描述符和任一引擎字段不符均失败关闭", () => {
    const base = structuredClone(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR);
    const mismatches: unknown[] = [
      { ...base, timelineVersion: COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1 },
      { ...base, timelineVersion: "hakimi-transit:9.9.9" },
      { ...base, algorithmId: "hakimi-transit-core:parallel-active-intervals:v1" },
      { ...base, engine: { ...base.engine, name: "other-transit-core" } },
      { ...base, engine: { ...base.engine, version: "9.9.9" } },
      { ...base, engine: { ...base.engine, upstreamName: "other-upstream" } },
      { ...base, engine: { ...base.engine, upstreamVersion: "9.9.9" } },
      { ...base, engine: { ...base.engine, upstreamTagCommit: "different-build" } },
      { ...base, engine: { ...base.engine, upstreamIntegrity: "sha512-different-build" } },
      {
        ...base,
        timeZoneDatabase: { ...base.timeZoneDatabase, artifactName: "tampered/packed.json" }
      },
      {
        ...base,
        timeZoneDatabase: { ...base.timeZoneDatabase, unexpected: true }
      },
      { timelineVersion: base.timelineVersion, algorithmId: base.algorithmId },
      { ...base, unexpected: true },
      { ...base, engine: { ...base.engine, unexpected: true } }
    ];

    for (const descriptor of mismatches) {
      expect(lookupHistoricalTransitSnapshotExecutor(descriptor)).toBeNull();
      expect(() => requireHistoricalTransitSnapshotExecutor(descriptor)).toThrowError(
        expect.objectContaining({ code: "TRANSIT_EXECUTOR_UNAVAILABLE" })
      );
    }
    const hostileProxy = new Proxy({}, {
      ownKeys: () => {
        throw new Error("hostile ownKeys trap");
      }
    });
    expect(() => lookupHistoricalTransitSnapshotExecutor(hostileProxy)).not.toThrow();
    expect(lookupHistoricalTransitSnapshotExecutor(hostileProxy)).toBeNull();
  });

  it("冻结 registry、entry 及嵌套描述符，篡改尝试不改变后续选择", () => {
    const entry = HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_REGISTRY[0];
    expect(entry).toBeDefined();
    if (!entry) throw new Error("expected the current transit executor entry");

    expect(Object.isFrozen(TRANSIT_CORE_ENGINE)).toBe(true);
    expect(Object.isFrozen(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR)).toBe(true);
    expect(Object.isFrozen(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.engine)).toBe(true);
    expect(Object.isFrozen(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase)).toBe(true);
    expect(Object.isFrozen(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.resolver)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_REGISTRY)).toBe(true);
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.descriptor)).toBe(true);
    expect(Object.isFrozen(entry.descriptor.engine)).toBe(true);
    expect(Object.isFrozen(entry.descriptor.timeZoneDatabase)).toBe(true);
    expect(Object.isFrozen(entry.calculateSnapshot)).toBe(true);
    expect(entry.calculateSnapshot).not.toBe(calculateTransitSnapshot);

    expect(() => {
      (entry.descriptor as unknown as { timelineVersion: string }).timelineVersion =
        COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1;
    }).toThrow(TypeError);
    expect(() => {
      (entry.descriptor.engine as unknown as { upstreamTagCommit: string }).upstreamTagCommit =
        "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_REGISTRY as unknown as Array<typeof entry>).push(entry);
    }).toThrow(TypeError);

    expect(lookupHistoricalTransitSnapshotExecutor(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR)).toBe(entry);
    expect(HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_REGISTRY).toHaveLength(1);
  });

  it("严格拒绝历史输入额外键，并深冻结每次独立输出", async () => {
    const executor = requireHistoricalTransitSnapshotExecutor(
      CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR
    );
    await expect(executor.calculateSnapshot({
      revision,
      atInstant: inputInstant,
      unexpected: true
    } as unknown as Parameters<typeof executor.calculateSnapshot>[0])).rejects.toMatchObject({
      code: "INVALID_TRANSIT_INPUT"
    });
    await expect(executor.calculateSnapshot({
      revision,
      atInstant: inputInstant,
      manualDirection: undefined
    } as unknown as Parameters<typeof executor.calculateSnapshot>[0])).rejects.toMatchObject({
      code: "INVALID_TRANSIT_INPUT"
    });

    const replayed = await executor.calculateSnapshot({ revision, atInstant: inputInstant });
    expect(Object.isFrozen(replayed)).toBe(true);
    expect(Object.isFrozen(replayed.manifest)).toBe(true);
    expect(Object.isFrozen(replayed.timeZoneDatabase)).toBe(true);
    expect(Object.isFrozen(replayed.tracks)).toBe(true);
    expect(Object.isFrozen(replayed.tracks.day)).toBe(true);
    expect(Object.isFrozen(replayed.tracks.day[0])).toBe(true);
    expect(() => {
      (replayed as unknown as { timelineVersion: string }).timelineVersion = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (replayed.tracks.day as unknown as Array<TransitNode>).push(replayed.tracks.day[0]!);
    }).toThrow(TypeError);

    const callerOwnedInput = {
      revision: structuredClone(revision),
      atInstant: inputInstant
    };
    const isolatedReplayPromise = executor.calculateSnapshot(callerOwnedInput);
    callerOwnedInput.atInstant = "2025-03-12T04:00:00Z";
    callerOwnedInput.revision.id = "55555555-5555-4555-8555-555555555555";
    const isolatedReplay = await isolatedReplayPromise;
    expect(Object.isFrozen(callerOwnedInput)).toBe(false);
    expect(isolatedReplay.target.instant).toBe("2024-02-04T15:00:00.000Z");
    expect(isolatedReplay.revisionId).toBe(revision.id);

    const repeated = await executor.calculateSnapshot({ revision, atInstant: inputInstant });
    expect(repeated).toEqual(replayed);
    expect(repeated).not.toBe(replayed);
  });

  it("并发 A/v1.1/A 不回退、不污染，两个 A 结果保持逐字段一致", async () => {
    const unavailableV11 = {
      ...structuredClone(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR),
      timelineVersion: COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1
    };
    const calculate = (descriptor: unknown) => Promise.resolve().then(() =>
      requireHistoricalTransitSnapshotExecutor(descriptor).calculateSnapshot({
        revision,
        atInstant: inputInstant
      })
    );

    const [firstA, unavailableB, secondA] = await Promise.allSettled([
      calculate(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR),
      calculate(unavailableV11),
      calculate(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR)
    ]);

    expect(firstA.status).toBe("fulfilled");
    expect(unavailableB.status).toBe("rejected");
    expect(secondA.status).toBe("fulfilled");
    if (firstA.status !== "fulfilled" || secondA.status !== "fulfilled") {
      throw new Error("expected both exact v1.2 replay requests to succeed");
    }
    expect(firstA.value).toEqual(secondA.value);
    if (unavailableB.status === "rejected") {
      expect(unavailableB.reason).toMatchObject({ code: "TRANSIT_EXECUTOR_UNAVAILABLE" });
    }
  });
});
