import { Temporal } from "@js-temporal/polyfill";
import { LunarUtil, Solar, type JieQi } from "lunar-typescript";
import {
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  luckCycleRuleSnapshotSchema,
  revisionRecordSchema,
  timeZoneDatabaseSnapshotSchema,
  transitNodeRefSchema,
  transitSnapshotSchema,
  type LuckCycleRuleSnapshot,
  type RevisionRecord,
  type TransitNode,
  type TransitNodeRef,
  type TransitNodeType,
  type TransitSlot,
  type TransitSnapshot,
  type TimeZoneDatabaseSnapshot
} from "@hakimi/contracts";
import { verifyRevisionRecordIntegrity } from "@hakimi/chart-integrity";
import { digestRuleProfile } from "@hakimi/bazi-core";
import { sha256Hex } from "@hakimi/integrity";
import {
  bindLuckCycleRuleProfile,
  calculateLuckCycle,
  calculateXiaoyunGanZhi,
  type LuckCycleResult,
  type LuckDirection,
  type LuckCycleRule,
  type XiaoyunRule
} from "@hakimi/luck-core";
import {
  loadBundledTimeZoneCalculationContext,
  type BundledTimeZoneCalculationContext
} from "@hakimi/time-core";

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
}

export type TransitCalculationEngineDescriptor = Readonly<{
  name: string;
  version: string;
  upstreamName: string;
  upstreamVersion: string;
  upstreamTagCommit: string;
  upstreamIntegrity: string;
}>;

export const TRANSIT_CORE_ENGINE = Object.freeze({
  name: "hakimi-transit-core" as const,
  version: "0.1.0" as const,
  upstreamName: "lunar-typescript" as const,
  upstreamVersion: "1.8.6" as const,
  upstreamTagCommit: "0f3e95d15e31f1a7c7b93d624542649347328a20" as const,
  upstreamIntegrity: "sha512-5Eo4T/cnuXfrgO4k5LCpOGHIUOuz5hCF/IfNv0T29WY2shR36Hiz+ecN9WjnUuxUKhql9gbOkPaQoqLFKtPRNA==" as const
}) satisfies TransitCalculationEngineDescriptor;

export const TRANSIT_TIMELINE_VERSION = "hakimi-transit:1.2.0" as const;
export const TRANSIT_ALGORITHM_ID = "hakimi-transit-core:parallel-active-intervals:v2" as const;
export const COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1 = "hakimi-transit:1.1.0" as const;

export type TransitSnapshotExecutorDescriptor = Readonly<{
  timelineVersion: string;
  algorithmId: string;
  engine: Readonly<TransitCalculationEngineDescriptor>;
  timeZoneDatabase: Readonly<TimeZoneDatabaseSnapshot>;
}>;

export type HistoricalTransitSnapshotExecutor = Readonly<{
  executorId: string;
  descriptor: Readonly<TransitSnapshotExecutorDescriptor>;
  calculateSnapshot: (rawInput: TransitSnapshotInput) => Promise<TransitSnapshot>;
}>;

export const TRANSIT_SNAPSHOT_TIME_ZONE_DATABASE_V1_2_0 = deepFreeze(
  timeZoneDatabaseSnapshotSchema.parse({
    schemaVersion: "1.0.0",
    kind: "bundled_iana_tzdb",
    ianaVersion: "2026c",
    artifactName: "moment-timezone/data/packed/latest.json",
    dataSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81",
    resolver: { name: "hakimi-tzdb-core", version: "1.0.0" },
    adapter: { name: "moment-timezone", version: "0.6.3" },
    supportedRange: { from: "1900-01-01", to: "2100-12-31" },
    snapshotId:
      "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" +
      "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3"
  })
);

export const CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR = deepFreeze({
  timelineVersion: TRANSIT_TIMELINE_VERSION,
  algorithmId: TRANSIT_ALGORITHM_ID,
  engine: TRANSIT_CORE_ENGINE,
  timeZoneDatabase: TRANSIT_SNAPSHOT_TIME_ZONE_DATABASE_V1_2_0
}) satisfies TransitSnapshotExecutorDescriptor;

const FIXED_EIGHT_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;
const SECOND_MILLISECONDS = 1_000;
const WINDOW_RADIUS = 2;

export type TransitSnapshotInput = {
  revision: RevisionRecord;
  atInstant: string;
  manualDirection?: LuckDirection;
};

export type TransitCoreErrorCode =
  | "INVALID_INSTANT"
  | "UNSUPPORTED_RANGE"
  | "RULE_SNAPSHOT_MISMATCH"
  | "MANUAL_DIRECTION_REQUIRED"
  | "MANUAL_DIRECTION_NOT_ALLOWED"
  | "LOCAL_BOUNDARY_UNRESOLVED"
  | "TZDB_LEGACY_UNIDENTIFIED"
  | "TZDB_ARTIFACT_UNAVAILABLE"
  | "TZDB_SNAPSHOT_MISMATCH"
  | "INVALID_TRANSIT_INPUT"
  | "TRANSIT_EXECUTOR_UNAVAILABLE"
  | "TRANSIT_CONTEXT_MISMATCH"
  | "TRANSIT_OUTPUT_MISMATCH"
  | "STALE_NODE_REF"
  | "UPSTREAM_DATA_ERROR";

export class TransitCoreError extends Error {
  constructor(readonly code: TransitCoreErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TransitCoreError";
  }
}

type Boundary = {
  epochMilliseconds: number;
  name: string;
};

type IntervalSeed = {
  nodeType: TransitNodeType;
  label: string;
  startEpochMilliseconds: number;
  endExclusiveEpochMilliseconds: number;
  frame: TransitNode["frame"];
  index: number | null;
  boundaryLabel: string | null;
  sourcePrecision: TransitNode["sourcePrecision"];
  ganZhi?: string;
};

type NodeContext = {
  revision: RevisionRecord;
  executorDescriptor: TransitSnapshotExecutorDescriptor;
  timeZoneContext: BundledTimeZoneCalculationContext;
  ruleProfileDigest: string;
  luckCycleRuleDigest: string;
  manualDirection: LuckDirection | null;
  natalDayStem: string;
  targetEpochMilliseconds: number;
};

function normalizeInstant(value: string): { instant: string; epochMilliseconds: number } {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new TransitCoreError("INVALID_INSTANT", "运限目标必须是含秒、可选毫秒并带 Z 或数字偏移的 ISO 8601 瞬时点。");
  }
  try {
    const instant = Temporal.Instant.from(value);
    const epochMilliseconds = Number(instant.epochMilliseconds);
    if (!Number.isSafeInteger(epochMilliseconds)) throw new RangeError("epoch milliseconds out of range");
    return { instant: new Date(epochMilliseconds).toISOString(), epochMilliseconds };
  } catch (cause) {
    throw new TransitCoreError("INVALID_INSTANT", `无法解析运限目标瞬时点：${value}`, { cause });
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}

function fixedEightWall(epochMilliseconds: number): string {
  const date = new Date(epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}.${pad3(date.getUTCMilliseconds())}`;
}

function isoInstant(epochMilliseconds: number): string {
  return new Date(epochMilliseconds).toISOString();
}

function solarFromFixedEightEpoch(epochMilliseconds: number): Solar {
  const date = new Date(epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS);
  return Solar.fromYmdHms(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}

function epochFromJieQi(jieQi: JieQi): number {
  const solar = jieQi.getSolar();
  return Date.UTC(
    solar.getYear(),
    solar.getMonth() - 1,
    solar.getDay(),
    solar.getHour(),
    solar.getMinute(),
    solar.getSecond()
  ) - FIXED_EIGHT_OFFSET_MILLISECONDS;
}

function boundaryFromJieQi(jieQi: JieQi): Boundary {
  return { epochMilliseconds: epochFromJieQi(jieQi), name: jieQi.getName() };
}

function previousJie(epochMilliseconds: number): Boundary {
  try {
    return boundaryFromJieQi(solarFromFixedEightEpoch(epochMilliseconds).getLunar().getPrevJie(false));
  } catch (cause) {
    throw new TransitCoreError("UPSTREAM_DATA_ERROR", "无法取得目标时刻之前的节令。", { cause });
  }
}

function nextJie(epochMilliseconds: number): Boundary {
  try {
    return boundaryFromJieQi(solarFromFixedEightEpoch(epochMilliseconds).getLunar().getNextJie(false));
  } catch (cause) {
    throw new TransitCoreError("UPSTREAM_DATA_ERROR", "无法取得目标时刻之后的节令。", { cause });
  }
}

function previousNamedJie(epochMilliseconds: number, name: string): Boundary {
  let cursor = epochMilliseconds;
  for (let index = 0; index < 16; index += 1) {
    const boundary = previousJie(cursor);
    if (boundary.name === name) return boundary;
    cursor = boundary.epochMilliseconds - SECOND_MILLISECONDS;
  }
  throw new TransitCoreError("UPSTREAM_DATA_ERROR", `未能在 16 个节令内找到上一个${name}。`);
}

function nextNamedJie(epochMilliseconds: number, name: string): Boundary {
  let cursor = epochMilliseconds;
  for (let index = 0; index < 16; index += 1) {
    const boundary = nextJie(cursor);
    if (boundary.name === name) return boundary;
    cursor = boundary.epochMilliseconds + SECOND_MILLISECONDS;
  }
  throw new TransitCoreError("UPSTREAM_DATA_ERROR", `未能在 16 个节令内找到下一个${name}。`);
}

function strictNextNamedJie(epochMilliseconds: number, name: string): Boundary {
  let cursor = epochMilliseconds;
  for (let index = 0; index < 2; index += 1) {
    const boundary = nextNamedJie(cursor, name);
    if (boundary.epochMilliseconds > epochMilliseconds) return boundary;
    cursor = boundary.epochMilliseconds + SECOND_MILLISECONDS;
  }
  throw new TransitCoreError("UPSTREAM_DATA_ERROR", `未能找到严格晚于目标时刻的下一个${name}。`);
}

function fixedEightYear(epochMilliseconds: number): number {
  return new Date(epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS).getUTCFullYear();
}

function lichunForFixedEightYear(year: number): Boundary {
  // July is safely after that fixed +08 calendar year's 立春 and before the next.
  const julyProbe = Date.UTC(year, 6, 1) - FIXED_EIGHT_OFFSET_MILLISECONDS;
  const boundary = previousNamedJie(julyProbe, "立春");
  if (fixedEightYear(boundary.epochMilliseconds) !== year) {
    throw new TransitCoreError("UPSTREAM_DATA_ERROR", `未能取得固定 +08 历法 ${year} 年的精确立春。`);
  }
  return boundary;
}

function fixedBoundaryWindow(
  activeStart: Boundary,
  activeEnd: Boundary,
  previous: (epochMilliseconds: number) => Boundary,
  next: (epochMilliseconds: number) => Boundary
): Boundary[] {
  const boundaries: Boundary[] = [activeStart, activeEnd];
  let cursor = activeStart;
  for (let index = 0; index < WINDOW_RADIUS; index += 1) {
    cursor = previous(cursor.epochMilliseconds - SECOND_MILLISECONDS);
    boundaries.unshift(cursor);
  }
  cursor = activeEnd;
  for (let index = 0; index < WINDOW_RADIUS; index += 1) {
    cursor = next(cursor.epochMilliseconds + SECOND_MILLISECONDS);
    boundaries.push(cursor);
  }
  return boundaries;
}

function localWallDateTimeAtEpoch(
  epochMilliseconds: number,
  timeZone: string,
  timeZoneContext: BundledTimeZoneCalculationContext
): string {
  const projection = timeZoneContext.resolver.projectEpochMilliseconds(epochMilliseconds, timeZone);
  const wall = new Date(projection.localEpochMilliseconds).toISOString().replace(/Z$/, "");
  return wall.endsWith(".000") ? wall.slice(0, -4) : wall;
}

function plainDateTimeAsLocalEpochMilliseconds(plain: Temporal.PlainDateTime): number {
  const localEpochMilliseconds = Date.UTC(
    plain.year,
    plain.month - 1,
    plain.day,
    plain.hour,
    plain.minute,
    plain.second,
    plain.millisecond
  );
  if (!Number.isSafeInteger(localEpochMilliseconds)) {
    throw new TransitCoreError("LOCAL_BOUNDARY_UNRESOLVED", "本地民用时间边界超出安全毫秒范围。");
  }
  return localEpochMilliseconds;
}

function resolveLocalBoundary(
  plain: Temporal.PlainDateTime,
  timeZone: string,
  timeZoneContext: BundledTimeZoneCalculationContext
): number {
  try {
    const resolution = timeZoneContext.resolver.resolveLocalEpochMilliseconds(
      plainDateTimeAsLocalEpochMilliseconds(plain),
      timeZone
    );
    if (resolution.kind !== "unique" || resolution.candidates.length !== 1) {
      throw new TransitCoreError(
        "LOCAL_BOUNDARY_UNRESOLVED",
        `${timeZone} 的本地边界 ${plain.toString()} 在冻结 ${timeZoneContext.timeZoneDatabase.ianaVersion} 工件中为 ${resolution.kind}；不会静默选择。`
      );
    }
    return resolution.candidates[0]!.epochMilliseconds;
  } catch (cause) {
    if (cause instanceof TransitCoreError) throw cause;
    throw new TransitCoreError(
      "LOCAL_BOUNDARY_UNRESOLVED",
      `${timeZone} 的本地边界 ${plain.toString()} 无法由冻结 ${timeZoneContext.timeZoneDatabase.ianaVersion} 工件唯一反解。`,
      { cause }
    );
  }
}

function localDayStart(target: Temporal.PlainDateTime, dayBoundary: RevisionRecord["ruleProfile"]["calendar"]["dayBoundary"]): Temporal.PlainDateTime {
  let date = target.toPlainDate();
  if (dayBoundary === "zi_start_23") {
    if (target.hour < 23) date = date.subtract({ days: 1 });
    return date.toPlainDateTime({ hour: 23 });
  }
  if (dayBoundary === "midnight") return date.toPlainDateTime({ hour: 0 });
  throw new TransitCoreError("LOCAL_BOUNDARY_UNRESOLVED", "早晚子时分流尚未进入运限时间轴。");
}

function localHourStart(target: Temporal.PlainDateTime): Temporal.PlainDateTime {
  let date = target.toPlainDate();
  let hour: number;
  if (target.hour === 0) {
    date = date.subtract({ days: 1 });
    hour = 23;
  } else if (target.hour === 23) {
    hour = 23;
  } else {
    hour = target.hour % 2 === 0 ? target.hour - 1 : target.hour;
  }
  return date.toPlainDateTime({ hour });
}

function relativeStemTenGod(natalDayStem: string, ganZhi: string): string {
  const stem = Array.from(ganZhi)[0] ?? "";
  return (LunarUtil.SHI_SHEN as Record<string, string>)[`${natalDayStem}${stem}`] ?? "未解析";
}

function solarFromWallDateTime(wallDateTime: string): Solar {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(wallDateTime);
  if (!match) {
    throw new TransitCoreError("UPSTREAM_DATA_ERROR", `无法读取冻结民用墙时：${wallDateTime}`);
  }
  return Solar.fromYmdHms(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  );
}

function normalizedIndex(value: number, modulus: number, field: string): number {
  if (!Number.isInteger(value)) {
    throw new TransitCoreError("UPSTREAM_DATA_ERROR", `${field}索引不是整数。`);
  }
  return ((value % modulus) + modulus) % modulus;
}

function pillarIdentity(stemIndex: number, branchIndex: number, field: string): { ganZhi: string; branch: string } {
  const stem = LunarUtil.GAN[normalizedIndex(stemIndex, 10, `${field}天干`) + 1];
  const branch = LunarUtil.ZHI[normalizedIndex(branchIndex, 12, `${field}地支`) + 1];
  if (!stem || !branch) {
    throw new TransitCoreError("UPSTREAM_DATA_ERROR", `无法从冻结上游表派生${field}干支。`);
  }
  const ganZhi = `${stem}${branch}`;
  if (LunarUtil.getJiaZiIndex(ganZhi) < 0) {
    throw new TransitCoreError("UPSTREAM_DATA_ERROR", `${field}=${ganZhi} 不是有效六十甲子。`);
  }
  return { ganZhi, branch };
}

function transitPillarIdentitiesAtEpoch(
  epochMilliseconds: number,
  revision: RevisionRecord,
  timeZoneContext: BundledTimeZoneCalculationContext
): {
  localCivilWallDateTime: string;
  pillars: Record<"year" | "month" | "day" | "hour", { ganZhi: string; branch: string }>;
} {
  const localCivilWallDateTime = localWallDateTimeAtEpoch(
    epochMilliseconds,
    revision.input.timeZone,
    timeZoneContext
  );
  const fixedEightLunar = solarFromWallDateTime(fixedEightWall(epochMilliseconds)).getLunar();
  const localCivilSolar = solarFromWallDateTime(localCivilWallDateTime);
  const localCivilLunar = localCivilSolar.getLunar();
  const useZiStart = revision.ruleProfile.calendar.dayBoundary === "zi_start_23";
  const dayStemIndex = useZiStart
    ? localCivilLunar.getDayGanIndexExact()
    : localCivilLunar.getDayGanIndexExact2();
  const dayBranchIndex = useZiStart
    ? localCivilLunar.getDayZhiIndexExact()
    : localCivilLunar.getDayZhiIndexExact2();
  const timeBranchIndex = LunarUtil.getTimeZhiIndex(
    `${pad2(localCivilSolar.getHour())}:${pad2(localCivilSolar.getMinute())}`
  );
  const timeStemIndex = (normalizedIndex(dayStemIndex, 10, "最终日干") % 5 * 2 + timeBranchIndex) % 10;
  return {
    localCivilWallDateTime,
    pillars: {
      year: pillarIdentity(fixedEightLunar.getYearGanIndexExact(), fixedEightLunar.getYearZhiIndexExact(), "流年"),
      month: pillarIdentity(fixedEightLunar.getMonthGanIndexExact(), fixedEightLunar.getMonthZhiIndexExact(), "流月"),
      day: pillarIdentity(dayStemIndex, dayBranchIndex, "流日"),
      hour: pillarIdentity(timeStemIndex, timeBranchIndex, "流时")
    }
  };
}

function frameWall(epochMilliseconds: number, frame: TransitNode["frame"], context: NodeContext): string {
  return frame === "fixed_plus08"
    ? fixedEightWall(epochMilliseconds)
    : localWallDateTimeAtEpoch(
        epochMilliseconds,
        context.revision.input.timeZone,
        context.timeZoneContext
      );
}

function ganZhiFor(nodeType: TransitNodeType, epochMilliseconds: number, context: NodeContext): string {
  const projection = transitPillarIdentitiesAtEpoch(
    epochMilliseconds,
    context.revision,
    context.timeZoneContext
  );
  if (nodeType === "year") return projection.pillars.year.ganZhi;
  if (nodeType === "month") return projection.pillars.month.ganZhi;
  if (nodeType === "day") return projection.pillars.day.ganZhi;
  if (nodeType === "hour") return projection.pillars.hour.ganZhi;
  throw new TransitCoreError("UPSTREAM_DATA_ERROR", `${nodeType} 节点必须显式提供干支。`);
}

type TransitNodeFactIdentity = {
  timelineVersion: string;
  algorithmId: string;
  revisionId: string;
  chartResultHash: string;
  ruleProfileDigest: string;
  luckCycleRuleDigest: string;
  manualDirection: LuckDirection | null;
  nodeType: TransitNodeType;
  startInstant: string;
  endExclusiveInstant: string;
  frame: TransitNode["frame"];
  ganZhi: string;
  index: number | null;
  boundaryLabel: string | null;
};

function transitNodeFactHash(identity: TransitNodeFactIdentity): Promise<string> {
  return sha256Hex(identity);
}

async function buildNode(seed: IntervalSeed, context: NodeContext): Promise<TransitNode> {
  const ganZhi = seed.ganZhi ?? ganZhiFor(seed.nodeType, seed.startEpochMilliseconds, context);
  const startInstant = isoInstant(seed.startEpochMilliseconds);
  const endExclusiveInstant = isoInstant(seed.endExclusiveEpochMilliseconds);
  const refManualDirection = context.revision.input.sex === "unspecified"
    ? context.manualDirection
    : null;
  const factHash = await transitNodeFactHash({
    timelineVersion: context.executorDescriptor.timelineVersion,
    algorithmId: context.executorDescriptor.algorithmId,
    revisionId: context.revision.id,
    chartResultHash: context.revision.manifest.resultHash,
    ruleProfileDigest: context.ruleProfileDigest,
    luckCycleRuleDigest: context.luckCycleRuleDigest,
    manualDirection: refManualDirection,
    nodeType: seed.nodeType,
    startInstant,
    endExclusiveInstant,
    frame: seed.frame,
    ganZhi,
    index: seed.index,
    boundaryLabel: seed.boundaryLabel
  });
  const ref: TransitNodeRef = transitNodeRefSchema.parse({
    schemaVersion: "1.0.0",
    namespace: "hakimi-transit-node",
    revisionId: context.revision.id,
    chartResultHash: context.revision.manifest.resultHash,
    ruleProfileDigest: context.ruleProfileDigest,
    luckCycleRuleDigest: context.luckCycleRuleDigest,
    manualDirection: refManualDirection,
    timelineVersion: context.executorDescriptor.timelineVersion,
    algorithmId: context.executorDescriptor.algorithmId,
    nodeType: seed.nodeType,
    startInstant,
    nodeId: `${seed.startEpochMilliseconds}.${factHash}`
  });

  return {
    ref,
    nodeType: seed.nodeType,
    label: seed.label,
    ganZhi,
    stemTenGod: relativeStemTenGod(context.natalDayStem, ganZhi),
    index: seed.index,
    boundaryLabel: seed.boundaryLabel,
    startInstant,
    endExclusiveInstant,
    startWallDateTime: frameWall(seed.startEpochMilliseconds, seed.frame, context),
    endExclusiveWallDateTime: frameWall(seed.endExclusiveEpochMilliseconds, seed.frame, context),
    frame: seed.frame,
    sourcePrecision: seed.sourcePrecision,
    isActiveAtTarget:
      seed.startEpochMilliseconds <= context.targetEpochMilliseconds &&
      context.targetEpochMilliseconds < seed.endExclusiveEpochMilliseconds,
    verificationStatus: "engineering_preview"
  };
}

async function buildFixedTrack(
  nodeType: "year" | "month",
  boundaries: Boundary[],
  context: NodeContext
): Promise<TransitNode[]> {
  return Promise.all(boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const wallYear = new Date(start.epochMilliseconds + FIXED_EIGHT_OFFSET_MILLISECONDS).getUTCFullYear();
    return buildNode({
      nodeType,
      label: nodeType === "year" ? `${wallYear} 流年` : `${start.name}月`,
      startEpochMilliseconds: start.epochMilliseconds,
      endExclusiveEpochMilliseconds: end.epochMilliseconds,
      frame: "fixed_plus08",
      index: null,
      boundaryLabel: start.name,
      sourcePrecision: "second"
    }, context);
  }));
}

async function buildLocalTrack(
  nodeType: "day" | "hour",
  activeStart: Temporal.PlainDateTime,
  context: NodeContext
): Promise<{ nodes: TransitNode[]; activeError: TransitCoreError | null }> {
  const nodes: TransitNode[] = [];
  let activeError: TransitCoreError | null = null;
  for (let offset = -WINDOW_RADIUS; offset <= WINDOW_RADIUS; offset += 1) {
    const startPlain = nodeType === "day"
      ? activeStart.add({ days: offset })
      : activeStart.add({ hours: offset * 2 });
    const endPlain = nodeType === "day" ? startPlain.add({ days: 1 }) : startPlain.add({ hours: 2 });
    try {
      const startEpochMilliseconds = resolveLocalBoundary(
        startPlain,
        context.revision.input.timeZone,
        context.timeZoneContext
      );
      const endExclusiveEpochMilliseconds = resolveLocalBoundary(
        endPlain,
        context.revision.input.timeZone,
        context.timeZoneContext
      );
      const projectedWallDateTime = localWallDateTimeAtEpoch(
        startEpochMilliseconds,
        context.revision.input.timeZone,
        context.timeZoneContext
      );
      const branch = nodeType === "hour"
        ? transitPillarIdentitiesAtEpoch(
            startEpochMilliseconds,
            context.revision,
            context.timeZoneContext
          ).pillars.hour.branch
        : null;
      nodes.push(await buildNode({
        nodeType,
        label: nodeType === "day" ? projectedWallDateTime.slice(5, 10) : `${branch}时`,
        startEpochMilliseconds,
        endExclusiveEpochMilliseconds,
        frame: "revision_iana_civil",
        index: null,
        boundaryLabel: nodeType === "day"
          ? `${context.revision.ruleProfile.calendar.dayBoundary}换日`
          : `${branch}时`,
        sourcePrecision: "second"
      }, context));
    } catch (reason) {
      const error = reason instanceof TransitCoreError
        ? reason
        : new TransitCoreError("LOCAL_BOUNDARY_UNRESOLVED", "无法生成本地民用时间节点。", { cause: reason });
      if (offset === 0) activeError = error;
    }
  }
  return { nodes, activeError };
}

async function buildDayunTrack(luck: LuckCycleResult, context: NodeContext): Promise<TransitNode[]> {
  return Promise.all(luck.decades.map((decade) => buildNode({
    nodeType: "dayun",
    label: `第 ${decade.index} 柱`,
    ganZhi: decade.ganZhi,
    startEpochMilliseconds: Date.parse(decade.startInstant),
    endExclusiveEpochMilliseconds: Date.parse(decade.endExclusiveInstant),
    frame: "fixed_plus08",
    index: decade.index,
    boundaryLabel: `第 ${decade.index} 柱大运`,
    sourcePrecision: decade.startInstant.endsWith(".000Z") ? "second" : "millisecond"
  }, context)));
}

function hasLockedBirthHour(revision: RevisionRecord): boolean {
  return (revision.input.timePrecision === "exact_second" || revision.input.timePrecision === "exact_minute") &&
    revision.input.time !== null &&
    revision.timeCalibration.utcInstant !== null;
}

function xiaoyunInterval(
  nominalAge: number,
  birthEpochMilliseconds: number,
  firstLichun: Boundary
): { start: Boundary; end: Boundary } {
  if (nominalAge === 1) {
    return {
      start: { epochMilliseconds: birthEpochMilliseconds, name: "出生时刻" },
      end: firstLichun
    };
  }
  const startYear = fixedEightYear(firstLichun.epochMilliseconds) + nominalAge - 2;
  return {
    start: lichunForFixedEightYear(startYear),
    end: lichunForFixedEightYear(startYear + 1)
  };
}

async function buildXiaoyunTrack(
  rule: XiaoyunRule,
  direction: LuckDirection,
  context: NodeContext
): Promise<TransitNode[]> {
  const birthInstant = context.revision.timeCalibration.utcInstant;
  if (!birthInstant) return [];
  const birthEpochMilliseconds = Date.parse(birthInstant);
  if (context.targetEpochMilliseconds < birthEpochMilliseconds) return [];

  const firstLichun = strictNextNamedJie(birthEpochMilliseconds, "立春");
  let activeAge = rule.firstAge;
  if (context.targetEpochMilliseconds >= firstLichun.epochMilliseconds) {
    const targetYear = fixedEightYear(context.targetEpochMilliseconds);
    const thisYearLichun = lichunForFixedEightYear(targetYear);
    const activeLichunYear = context.targetEpochMilliseconds >= thisYearLichun.epochMilliseconds
      ? targetYear
      : targetYear - 1;
    activeAge = rule.firstAge + 1 + activeLichunYear - fixedEightYear(firstLichun.epochMilliseconds);
  }

  const firstVisibleAge = Math.max(rule.firstAge, activeAge - WINDOW_RADIUS);
  const lastVisibleAge = activeAge + WINDOW_RADIUS;
  return Promise.all(Array.from(
    { length: lastVisibleAge - firstVisibleAge + 1 },
    (_, index) => firstVisibleAge + index
  ).map((nominalAge) => {
    const interval = xiaoyunInterval(nominalAge, birthEpochMilliseconds, firstLichun);
    return buildNode({
      nodeType: "xiaoyun",
      label: `虚岁 ${nominalAge}`,
      ganZhi: calculateXiaoyunGanZhi(
        context.revision.facts.pillars.hour.ganZhi,
        direction,
        nominalAge,
        rule
      ),
      startEpochMilliseconds: interval.start.epochMilliseconds,
      endExclusiveEpochMilliseconds: interval.end.epochMilliseconds,
      frame: "fixed_plus08",
      index: nominalAge,
      boundaryLabel: nominalAge === rule.firstAge ? "出生起算" : "精确立春增龄",
      sourcePrecision: interval.start.epochMilliseconds % SECOND_MILLISECONDS === 0 ? "second" : "millisecond"
    }, context);
  }));
}

function activeSlot(
  nodes: TransitNode[],
  targetEpochMilliseconds: number,
  fallback: TransitSlot
): TransitSlot {
  const node = nodes.find((item) =>
    Date.parse(item.startInstant) <= targetEpochMilliseconds &&
    targetEpochMilliseconds < Date.parse(item.endExclusiveInstant)
  );
  return node ? { status: "resolved", node } : fallback;
}

function unsupported(reasonCode: string, message: string): TransitSlot {
  return { status: "unsupported", reasonCode, message };
}

function notApplicable(reasonCode: string, message: string): TransitSlot {
  return { status: "not_applicable", reasonCode, message };
}

function luckRuleFromRevision(revision: RevisionRecord): {
  rule: LuckCycleRuleSnapshot;
  source: TransitSnapshot["luckCycleRuleSource"];
} {
  if (revision.luckCycleRuleSnapshot) {
    const rule = luckCycleRuleSnapshotSchema.parse(revision.luckCycleRuleSnapshot);
    const hasModernIdentity = rule.ruleId.endsWith(":luck-cycle-xiaoyun") ||
      rule.ruleId === "ziping-directional-jie-xiaoyun-working-default";
    if (hasModernIdentity !== (rule.xiaoyun !== undefined)) {
      throw new TransitCoreError(
        "RULE_SNAPSHOT_MISMATCH",
        "起运规则身份与小运锁版块不一致；现代小运规则和旧版大运规则不能共用同一身份。"
      );
    }
    return { rule, source: "revision_snapshot" };
  }
  const inferredCurrent = bindLuckCycleRuleProfile(revision.ruleProfile);
  // A revision with no stored full rule predates the xiaoyun adjudication.
  // Preserve the old dayun inference but never backfill the new xiaoyun choice.
  const {
    xiaoyun: _currentXiaoyun,
    ...legacyDayunRule
  } = inferredCurrent;
  return {
    rule: luckCycleRuleSnapshotSchema.parse({
      ...legacyDayunRule,
      ruleId: `${revision.ruleProfile.profileId}:luck-cycle`,
      ruleVersion: revision.ruleProfile.profileVersion
    }),
    source: "legacy_inferred"
  };
}

function assertSupportedTarget(epochMilliseconds: number): void {
  const date = fixedEightWall(epochMilliseconds).slice(0, 10);
  if (date < "1900-01-01" || date > "2100-12-31") {
    throw new TransitCoreError("UNSUPPORTED_RANGE", `目标固定 +08 日期 ${date} 不在 1900—2100 声明范围内。`);
  }
}

async function calculateTransitSnapshotWithDescriptor(
  rawInput: TransitSnapshotInput,
  executorDescriptor: TransitSnapshotExecutorDescriptor
): Promise<TransitSnapshot> {
  let parsedRevision: RevisionRecord;
  try {
    parsedRevision = revisionRecordSchema.parse(rawInput.revision);
  } catch (cause) {
    throw new TransitCoreError(
      "TRANSIT_CONTEXT_MISMATCH",
      "修订结构无法通过契约校验，已拒绝生成运限节点。",
      { cause }
    );
  }
  const hasStoredLuckRuleSnapshot = parsedRevision.luckCycleRuleSnapshot !== undefined;
  const hasStoredLuckRuleDigest = parsedRevision.manifest.luckCycleRuleDigest !== undefined;
  if (hasStoredLuckRuleSnapshot !== hasStoredLuckRuleDigest) {
    throw new TransitCoreError(
      "RULE_SNAPSHOT_MISMATCH",
      "完整起运规则快照与其摘要必须成对存在；二者都缺失才允许按旧版大运规则读取。"
    );
  }
  let revision: RevisionRecord;
  try {
    revision = await verifyRevisionRecordIntegrity(parsedRevision);
  } catch (cause) {
    throw new TransitCoreError(
      "TRANSIT_CONTEXT_MISMATCH",
      "修订命盘摘要无法通过完整性复算，已拒绝生成运限节点。",
      { cause }
    );
  }
  if (revision.manifest.tzdbVersion === LEGACY_UNIDENTIFIED_TZDB_VERSION) {
    throw new TransitCoreError(
      "TZDB_LEGACY_UNIDENTIFIED",
      "该历史修订未识别其时区数据工件；Transit 1.2 完整复演已拒绝。"
    );
  }
  if (
    revision.manifest.tzdbVersion !== executorDescriptor.timeZoneDatabase.snapshotId ||
    JSON.stringify(revision.manifest.timeZoneDatabase) !== JSON.stringify(executorDescriptor.timeZoneDatabase)
  ) {
    throw new TransitCoreError(
      "TZDB_SNAPSHOT_MISMATCH",
      `Transit ${executorDescriptor.timelineVersion} 执行器只支持其冻结的 ${executorDescriptor.timeZoneDatabase.ianaVersion} 完整工件描述符；不会使用当前或其他 retained 工件替代。`
    );
  }
  let timeZoneContext: BundledTimeZoneCalculationContext;
  try {
    const loaded = await loadBundledTimeZoneCalculationContext(
      executorDescriptor.timeZoneDatabase.snapshotId,
      executorDescriptor.timeZoneDatabase
    );
    timeZoneContext = Object.freeze({
      timeZoneDatabase: deepFreeze(structuredClone(loaded.timeZoneDatabase)),
      resolver: loaded.resolver
    });
  } catch (cause) {
    const externalCode = cause instanceof Error && "code" in cause ? cause.code : null;
    const code = externalCode === "TZDB_ARTIFACT_UNAVAILABLE"
      ? "TZDB_ARTIFACT_UNAVAILABLE"
      : "TZDB_SNAPSHOT_MISMATCH";
    throw new TransitCoreError(
      code,
      cause instanceof Error ? cause.message : "无法加载 Transit 1.2 冻结时区工件。",
      { cause }
    );
  }
  const target = normalizeInstant(rawInput.atInstant);
  assertSupportedTarget(target.epochMilliseconds);
  if (revision.input.sex !== "unspecified" && rawInput.manualDirection !== undefined) {
    throw new TransitCoreError("MANUAL_DIRECTION_NOT_ALLOWED", "性别已指定的修订不能用人工方向覆盖锁版规则。");
  }

  const ruleProfileDigest = await digestRuleProfile(revision.ruleProfile);
  if (ruleProfileDigest !== revision.manifest.ruleProfileDigest) {
    throw new TransitCoreError("RULE_SNAPSHOT_MISMATCH", "修订规则快照摘要与清单不一致，已拒绝生成运限节点。");
  }
  const luckBinding = luckRuleFromRevision(revision);
  const luckCycleRuleDigest = await sha256Hex(luckBinding.rule);
  if (revision.manifest.luckCycleRuleDigest !== undefined &&
    revision.manifest.luckCycleRuleDigest !== luckCycleRuleDigest) {
    throw new TransitCoreError("RULE_SNAPSHOT_MISMATCH", "完整起运规则摘要与修订清单不一致。");
  }

  const manualDirection = rawInput.manualDirection ?? null;
  const context: NodeContext = {
    revision,
    executorDescriptor,
    timeZoneContext,
    ruleProfileDigest,
    luckCycleRuleDigest,
    manualDirection,
    natalDayStem: revision.facts.pillars.day.stem,
    targetEpochMilliseconds: target.epochMilliseconds
  };

  let luck: LuckCycleResult | null = null;
  let luckError: TransitCoreError | null = null;
  if (revision.input.sex === "unspecified" && manualDirection === null) {
    luckError = new TransitCoreError("MANUAL_DIRECTION_REQUIRED", "性别未指定；必须明确顺行或逆行后才能生成大运。" );
  } else {
    try {
      luck = calculateLuckCycle({
        schemaVersion: "1.0.0",
        birthInstant: revision.timeCalibration.utcInstant ?? "",
        sex: revision.input.sex,
        ...(manualDirection ? { manualDirection } : {}),
        expectedYearGanZhi: revision.facts.pillars.year.ganZhi,
        expectedMonthGanZhi: revision.facts.pillars.month.ganZhi
      }, luckBinding.rule as LuckCycleRule);
    } catch (cause) {
      luckError = new TransitCoreError("UPSTREAM_DATA_ERROR", cause instanceof Error ? cause.message : "起运计算失败。", { cause });
    }
  }

  const xiaoyunRule = luckBinding.rule.xiaoyun;
  const birthEpochMilliseconds = revision.timeCalibration.utcInstant === null
    ? null
    : Date.parse(revision.timeCalibration.utcInstant);
  const xiaoyunTrackPromise = xiaoyunRule !== undefined &&
    hasLockedBirthHour(revision) &&
    birthEpochMilliseconds !== null &&
    target.epochMilliseconds >= birthEpochMilliseconds &&
    luck !== null
    ? buildXiaoyunTrack(xiaoyunRule, luck.direction.value, context)
        .then((nodes) => ({ nodes, error: null as TransitCoreError | null }))
        .catch((cause) => ({
          nodes: [] as TransitNode[],
          error: new TransitCoreError(
            "UPSTREAM_DATA_ERROR",
            cause instanceof Error ? cause.message : "小运节点生成失败。",
            { cause }
          )
        }))
    : Promise.resolve({ nodes: [] as TransitNode[], error: null as TransitCoreError | null });

  const activeYearStart = previousNamedJie(target.epochMilliseconds, "立春");
  const activeYearEnd = nextNamedJie(target.epochMilliseconds, "立春");
  const yearBoundaries = fixedBoundaryWindow(
    activeYearStart,
    activeYearEnd,
    (epoch) => previousNamedJie(epoch, "立春"),
    (epoch) => nextNamedJie(epoch, "立春")
  );
  const activeMonthStart = previousJie(target.epochMilliseconds);
  const activeMonthEnd = nextJie(target.epochMilliseconds);
  const monthBoundaries = fixedBoundaryWindow(activeMonthStart, activeMonthEnd, previousJie, nextJie);

  const targetLocalPlain = Temporal.PlainDateTime.from(localWallDateTimeAtEpoch(
    target.epochMilliseconds,
    revision.input.timeZone,
    timeZoneContext
  ));
  const [yearTrack, monthTrack, dayTrackResult, hourTrackResult, dayunTrack, xiaoyunTrackResult] = await Promise.all([
    buildFixedTrack("year", yearBoundaries, context),
    buildFixedTrack("month", monthBoundaries, context),
    buildLocalTrack("day", localDayStart(targetLocalPlain, revision.ruleProfile.calendar.dayBoundary), context),
    buildLocalTrack("hour", localHourStart(targetLocalPlain), context),
    luck ? buildDayunTrack(luck, context) : Promise.resolve([]),
    xiaoyunTrackPromise
  ]);
  const xiaoyunTrack = xiaoyunTrackResult.nodes;

  const dayunFallback = luckError
    ? unsupported(luckError.code, luckError.message)
    : luck && target.epochMilliseconds < Date.parse(luck.handover.instant)
      ? notApplicable("PRE_HANDOVER", "目标时刻早于第一步交运时刻。")
      : unsupported("DAYUN_WINDOW_EXHAUSTED", "目标时刻不在当前锁版的十柱大运范围内。");
  const xiaoyunFallback = xiaoyunRule === undefined
    ? unsupported(
        "XIAOYUN_RULE_SNAPSHOT_MISSING",
        "该修订未锁版小运规则；为保持历史可复算性，当前不会套用后来新增的默认值。"
      )
    : !hasLockedBirthHour(revision)
      ? unsupported(
          "XIAOYUN_UNKNOWN_HOUR_UNSUPPORTED",
          "出生时辰未精确锁定；birth_hour_adjacent 小运法不能生成确定节点。"
        )
      : birthEpochMilliseconds !== null && target.epochMilliseconds < birthEpochMilliseconds
        ? notApplicable("PRE_BIRTH", "目标时刻早于出生瞬时点，不存在小运节点。")
        : luckError
          ? unsupported(luckError.code, `小运复用大运顺逆失败：${luckError.message}`)
          : xiaoyunTrackResult.error
            ? unsupported("XIAOYUN_BUILD_FAILED", `小运节点生成失败：${xiaoyunTrackResult.error.message}`)
            : unsupported("XIAOYUN_UNRESOLVED", "未解析到活动小运。" );

  const slots = {
    dayun: activeSlot(dayunTrack, target.epochMilliseconds, dayunFallback),
    xiaoyun: activeSlot(xiaoyunTrack, target.epochMilliseconds, xiaoyunFallback),
    year: activeSlot(yearTrack, target.epochMilliseconds, unsupported("YEAR_UNRESOLVED", "未解析到活动流年。")),
    month: activeSlot(monthTrack, target.epochMilliseconds, unsupported("MONTH_UNRESOLVED", "未解析到活动流月。")),
    day: dayTrackResult.activeError
      ? unsupported(dayTrackResult.activeError.code, dayTrackResult.activeError.message)
      : activeSlot(dayTrackResult.nodes, target.epochMilliseconds, unsupported("DAY_UNRESOLVED", "未解析到活动流日。")),
    hour: hourTrackResult.activeError
      ? unsupported(hourTrackResult.activeError.code, hourTrackResult.activeError.message)
      : activeSlot(hourTrackResult.nodes, target.epochMilliseconds, unsupported("HOUR_UNRESOLVED", "未解析到活动流时。"))
  } satisfies TransitSnapshot["slots"];

  const targetProjection = transitPillarIdentitiesAtEpoch(
    target.epochMilliseconds,
    revision,
    timeZoneContext
  );
  const snapshotWithoutHash = {
    schemaVersion: "1.0.0" as const,
    kind: "transit_snapshot" as const,
    timelineVersion: executorDescriptor.timelineVersion,
    caseId: revision.caseId,
    revisionId: revision.id,
    revisionResultHash: revision.manifest.resultHash,
    tzdbVersion: timeZoneContext.timeZoneDatabase.snapshotId,
    timeZoneDatabase: timeZoneContext.timeZoneDatabase,
    ruleProfileDigest,
    luckCycleRuleSnapshot: luckBinding.rule,
    luckCycleRuleDigest,
    luckCycleRuleSource: luckBinding.source,
    manualDirection,
    target: {
      instant: target.instant,
      revisionWallDateTime: targetProjection.localCivilWallDateTime,
      fixedPlusEightWallDateTime: fixedEightWall(target.epochMilliseconds),
      displayTimeZone: revision.input.timeZone
    },
    slots,
    tracks: {
      dayun: dayunTrack,
      xiaoyun: xiaoyunTrack,
      year: yearTrack,
      month: monthTrack,
      day: dayTrackResult.nodes,
      hour: hourTrackResult.nodes
    },
    manifest: {
      algorithmId: executorDescriptor.algorithmId,
      engineName: executorDescriptor.engine.name,
      engineVersion: executorDescriptor.engine.version,
      upstreamName: executorDescriptor.engine.upstreamName,
      upstreamVersion: executorDescriptor.engine.upstreamVersion,
      yearMonthFrame: "fixed_plus08" as const,
      dayHourFrame: "revision_iana_civil" as const,
      interpretationIncluded: false as const,
      goldCaseCount: 0 as const,
      releaseGatePassed: false as const,
      sourceRefs: expectedTransitSourceRefs(executorDescriptor)
    },
    warnings: [
      "运限时间轴是工程预览：只输出时间区间、干支和相对原局日主的天干十神，不输出吉凶预测。",
      "流年/流月按固定 UTC+08:00 精确立春与十二节；流日/流时按修订 IANA 时区和锁版换日规则并行计算。",
      `IANA 命名时区投影使用随应用发布、内容寻址的 ${timeZoneContext.timeZoneDatabase.ianaVersion} 数据工件，不读取设备时区库。`,
      ...(xiaoyunRule
        ? ["小运采用出生时柱相邻起法并复用大运顺逆：虚岁 1 自出生瞬时点起，随后按固定 UTC+08:00 精确立春增龄；这是当前产品锁版建模选择。"]
        : []),
      "各层是同一目标瞬时点的并行覆盖区间，不被错误建模成永久父子树。",
      ...(luckBinding.source === "legacy_inferred"
        ? ["该旧修订没有完整起运规则快照；本次只按其 profileId/profileVersion 和 v0.1 固定常量推断大运，小运保持 unsupported。"]
        : xiaoyunRule === undefined
          ? ["该修订的起运快照早于小运规则锁版；小运保持 unsupported，不会静默套用当前默认。"]
        : [])
    ],
    knownGaps: [
      "小运原典与后世实务存在多种起法、顺逆和年龄边界；当前出生时柱相邻起法及精确立春边界是产品建模选择，尚非唯一流派结论。",
      "运限金标案例仍为 0，所有节点 releaseGatePassed=false。",
      "本地换日或时辰边界若落入 DST 重叠/空档，当前层会标记 unsupported，不会静默选择 earlier/later。",
      "节令上游精度为秒；1900/2100 边缘窗口仍需独立历表与缓冲区策略验证。"
    ]
  };
  const resultHash = await sha256Hex(snapshotWithoutHash);
  return transitSnapshotSchema.parse({ ...snapshotWithoutHash, resultHash });
}

function parseHistoricalTransitSnapshotInput(rawInput: unknown): TransitSnapshotInput {
  try {
    if (typeof rawInput !== "object" || rawInput === null || Array.isArray(rawInput)) {
      throw new TransitCoreError("INVALID_TRANSIT_INPUT", "TransitSnapshotInput 必须是严格对象。");
    }
    const keys = Reflect.ownKeys(rawInput);
    const allowed = new Set<PropertyKey>(["revision", "atInstant", "manualDirection"]);
    if (
      !Object.prototype.hasOwnProperty.call(rawInput, "revision") ||
      !Object.prototype.hasOwnProperty.call(rawInput, "atInstant") ||
      keys.some((key) => !allowed.has(key))
    ) {
      throw new TransitCoreError(
        "INVALID_TRANSIT_INPUT",
        "TransitSnapshotInput 只允许 revision、atInstant 与可选 manualDirection 精确键。"
      );
    }
    const value = rawInput as Record<string, unknown>;
    if (typeof value.atInstant !== "string") {
      throw new TransitCoreError("INVALID_TRANSIT_INPUT", "TransitSnapshotInput.atInstant 必须是字符串。");
    }
    const hasManualDirection = Object.prototype.hasOwnProperty.call(value, "manualDirection");
    if (hasManualDirection && value.manualDirection !== "forward" && value.manualDirection !== "backward") {
      throw new TransitCoreError(
        "INVALID_TRANSIT_INPUT",
        "TransitSnapshotInput.manualDirection 只能显式为 forward 或 backward。"
      );
    }
    const parsedRevision = revisionRecordSchema.safeParse(value.revision);
    if (!parsedRevision.success) {
      throw new TransitCoreError(
        "INVALID_TRANSIT_INPUT",
        "TransitSnapshotInput.revision 无法通过严格 Revision 契约。",
        { cause: parsedRevision.error }
      );
    }
    return deepFreeze({
      revision: parsedRevision.data,
      atInstant: value.atInstant,
      ...(hasManualDirection ? { manualDirection: value.manualDirection as LuckDirection } : {})
    });
  } catch (cause) {
    if (cause instanceof TransitCoreError) throw cause;
    throw new TransitCoreError(
      "INVALID_TRANSIT_INPUT",
      "TransitSnapshotInput 含有无法安全读取的键或值。",
      { cause }
    );
  }
}

function expectedTransitSourceRefs(descriptor: TransitSnapshotExecutorDescriptor): string[] {
  return [
    `https://github.com/6tail/lunar-typescript/blob/${descriptor.engine.upstreamTagCommit}/src/lib/Lunar.ts`,
    `https://github.com/6tail/lunar-typescript/blob/${descriptor.engine.upstreamTagCommit}/src/lib/XiaoYun.ts`,
    `npm:${descriptor.engine.upstreamName}@${descriptor.engine.upstreamVersion}#integrity=${descriptor.engine.upstreamIntegrity}`,
    `https://data.iana.org/time-zones/releases/tzdata${descriptor.timeZoneDatabase.ianaVersion}.tar.gz`
  ];
}

function assertTransitOutput(condition: boolean, message: string): asserts condition {
  if (!condition) throw new TransitCoreError("TRANSIT_OUTPUT_MISMATCH", message);
}

async function verifyAndFreezeTransitSnapshotOutput(
  rawSnapshot: TransitSnapshot,
  input: TransitSnapshotInput,
  descriptor: TransitSnapshotExecutorDescriptor
): Promise<TransitSnapshot> {
  let snapshot: TransitSnapshot;
  try {
    snapshot = transitSnapshotSchema.parse(structuredClone(rawSnapshot));
  } catch (cause) {
    throw new TransitCoreError(
      "TRANSIT_OUTPUT_MISMATCH",
      "Transit 历史执行器输出未通过完整快照契约后置校验。",
      { cause }
    );
  }
  const normalizedTarget = normalizeInstant(input.atInstant).instant;
  const expectedManualDirection = input.manualDirection ?? null;
  assertTransitOutput(snapshot.timelineVersion === descriptor.timelineVersion, "输出时间线身份与执行器不一致。");
  assertTransitOutput(snapshot.manifest.algorithmId === descriptor.algorithmId, "输出算法身份与执行器不一致。");
  assertTransitOutput(
    snapshot.manifest.engineName === descriptor.engine.name &&
      snapshot.manifest.engineVersion === descriptor.engine.version &&
      snapshot.manifest.upstreamName === descriptor.engine.upstreamName &&
      snapshot.manifest.upstreamVersion === descriptor.engine.upstreamVersion &&
      JSON.stringify(snapshot.manifest.sourceRefs) === JSON.stringify(expectedTransitSourceRefs(descriptor)),
    "输出引擎描述符或冻结来源与执行器不一致。"
  );
  assertTransitOutput(
    snapshot.tzdbVersion === descriptor.timeZoneDatabase.snapshotId &&
      JSON.stringify(snapshot.timeZoneDatabase) === JSON.stringify(descriptor.timeZoneDatabase),
    "输出时区工件身份与执行器不一致。"
  );
  assertTransitOutput(
    snapshot.caseId === input.revision.caseId &&
      snapshot.revisionId === input.revision.id &&
      snapshot.revisionResultHash === input.revision.manifest.resultHash &&
      snapshot.target.instant === normalizedTarget &&
      snapshot.manualDirection === expectedManualDirection,
    "输出未完整绑定输入 Revision、查询瞬时点或人工方向。"
  );

  for (const node of Object.values(snapshot.tracks).flat()) {
    const expectedFactHash = await transitNodeFactHash({
      timelineVersion: descriptor.timelineVersion,
      algorithmId: descriptor.algorithmId,
      revisionId: snapshot.revisionId,
      chartResultHash: snapshot.revisionResultHash,
      ruleProfileDigest: snapshot.ruleProfileDigest,
      luckCycleRuleDigest: snapshot.luckCycleRuleDigest,
      manualDirection: snapshot.manualDirection,
      nodeType: node.nodeType,
      startInstant: node.startInstant,
      endExclusiveInstant: node.endExclusiveInstant,
      frame: node.frame,
      ganZhi: node.ganZhi,
      index: node.index,
      boundaryLabel: node.boundaryLabel
    });
    assertTransitOutput(
      node.ref.nodeId === `${Date.parse(node.startInstant)}.${expectedFactHash}`,
      `输出 ${node.nodeType} 节点身份后置复算不一致。`
    );
  }

  const { resultHash, ...snapshotWithoutHash } = snapshot;
  assertTransitOutput(
    resultHash === await sha256Hex(snapshotWithoutHash),
    "输出 TransitSnapshot resultHash 后置复算不一致。"
  );
  return deepFreeze(snapshot);
}

async function calculateTransitSnapshotV1_2_0(rawInput: TransitSnapshotInput): Promise<TransitSnapshot> {
  const input = parseHistoricalTransitSnapshotInput(rawInput);
  const snapshot = await calculateTransitSnapshotWithDescriptor(
    input,
    CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR
  );
  return verifyAndFreezeTransitSnapshotOutput(
    snapshot,
    input,
    CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR
  );
}

/** Current public calculation delegates to the frozen v1.2 slice. */
export async function calculateTransitSnapshot(rawInput: TransitSnapshotInput): Promise<TransitSnapshot> {
  return calculateTransitSnapshotV1_2_0(rawInput);
}

const HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_V1_2 = Object.freeze({
  executorId: "hakimi-transit-core:transit-snapshot-executor:1.2.0",
  descriptor: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
  calculateSnapshot: Object.freeze(calculateTransitSnapshotV1_2_0)
}) satisfies HistoricalTransitSnapshotExecutor;

/**
 * Append-only full TransitSnapshot replay registry.
 *
 * v1.1 is deliberately absent. Its retained allowlist proves only that an
 * individual node fact can be re-hashed from today's immutable v2 facts. No
 * frozen full-snapshot implementation and complete engine descriptor survive,
 * so registering v1.1 here would overstate the available replay evidence.
 */
export const HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_REGISTRY:
readonly HistoricalTransitSnapshotExecutor[] = Object.freeze([
  HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_V1_2
]);

const TRANSIT_EXECUTOR_DESCRIPTOR_KEYS = Object.freeze([
  "timelineVersion",
  "algorithmId",
  "engine",
  "timeZoneDatabase"
] as const);
const TRANSIT_ENGINE_DESCRIPTOR_KEYS = Object.freeze([
  "name",
  "version",
  "upstreamName",
  "upstreamVersion",
  "upstreamTagCommit",
  "upstreamIntegrity"
] as const);

function hasExactOwnKeys(
  rawValue: unknown,
  expectedKeys: readonly string[]
): rawValue is Record<string, unknown> {
  if (typeof rawValue !== "object" || rawValue === null || Array.isArray(rawValue)) return false;
  try {
    const actualKeys = Reflect.ownKeys(rawValue);
    return actualKeys.length === expectedKeys.length &&
      expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(rawValue, key));
  } catch {
    return false;
  }
}

function sameTransitEngineDescriptor(
  rawEngine: unknown,
  expected: TransitCalculationEngineDescriptor
): boolean {
  if (!hasExactOwnKeys(rawEngine, TRANSIT_ENGINE_DESCRIPTOR_KEYS)) return false;
  try {
    return rawEngine.name === expected.name &&
      rawEngine.version === expected.version &&
      rawEngine.upstreamName === expected.upstreamName &&
      rawEngine.upstreamVersion === expected.upstreamVersion &&
      rawEngine.upstreamTagCommit === expected.upstreamTagCommit &&
      rawEngine.upstreamIntegrity === expected.upstreamIntegrity;
  } catch {
    return false;
  }
}

function sameTransitSnapshotExecutorDescriptor(
  rawDescriptor: unknown,
  expected: TransitSnapshotExecutorDescriptor
): boolean {
  if (!hasExactOwnKeys(rawDescriptor, TRANSIT_EXECUTOR_DESCRIPTOR_KEYS)) return false;
  try {
    return rawDescriptor.timelineVersion === expected.timelineVersion &&
      rawDescriptor.algorithmId === expected.algorithmId &&
      sameTransitEngineDescriptor(rawDescriptor.engine, expected.engine) &&
      (() => {
        const parsedTimeZoneDatabase = timeZoneDatabaseSnapshotSchema.safeParse(rawDescriptor.timeZoneDatabase);
        return parsedTimeZoneDatabase.success &&
          JSON.stringify(parsedTimeZoneDatabase.data) === JSON.stringify(expected.timeZoneDatabase);
      })();
  } catch {
    return false;
  }
}

/** Exact complete-descriptor lookup. Partial/version-only matching is forbidden. */
export function lookupHistoricalTransitSnapshotExecutor(
  rawDescriptor: unknown
): HistoricalTransitSnapshotExecutor | null {
  return HISTORICAL_TRANSIT_SNAPSHOT_EXECUTOR_REGISTRY.find((entry) =>
    sameTransitSnapshotExecutorDescriptor(rawDescriptor, entry.descriptor)
  ) ?? null;
}

/** Fail-closed lookup; an unavailable historical identity never uses current code. */
export function requireHistoricalTransitSnapshotExecutor(
  rawDescriptor: unknown
): HistoricalTransitSnapshotExecutor {
  const executor = lookupHistoricalTransitSnapshotExecutor(rawDescriptor);
  if (executor) return executor;
  throw new TransitCoreError(
    "TRANSIT_EXECUTOR_UNAVAILABLE",
    "未找到与完整运限时间线、算法、引擎和时区工件描述符精确匹配的历史执行器；完整快照复演已拒绝，且不会回退到当前版本。"
  );
}

async function replayTransitNodeRef(
  rawRevision: RevisionRecord,
  rawRef: TransitNodeRef,
  allowCompatibleV11: boolean
): Promise<{ node: TransitNode; ref: TransitNodeRef }> {
  let revision: RevisionRecord;
  try {
    revision = await verifyRevisionRecordIntegrity(rawRevision);
  } catch (cause) {
    throw new TransitCoreError(
      "TRANSIT_CONTEXT_MISMATCH",
      "节点引用对应的修订无法通过完整性复算。",
      { cause }
    );
  }
  let ref: TransitNodeRef;
  try {
    ref = transitNodeRefSchema.parse(rawRef);
  } catch (cause) {
    throw new TransitCoreError(
      "STALE_NODE_REF",
      "节点引用结构或内在身份校验失败；不会尝试跳转到近似节点。",
      { cause }
    );
  }
  const timelineAccepted = ref.timelineVersion === TRANSIT_TIMELINE_VERSION || (
    allowCompatibleV11 &&
    ref.timelineVersion === COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1 &&
    ref.algorithmId === TRANSIT_ALGORITHM_ID
  );
  if (
    ref.revisionId !== revision.id ||
    ref.chartResultHash !== revision.manifest.resultHash ||
    ref.ruleProfileDigest !== revision.manifest.ruleProfileDigest ||
    !timelineAccepted ||
    ref.algorithmId !== TRANSIT_ALGORITHM_ID
  ) {
    throw new TransitCoreError("TRANSIT_CONTEXT_MISMATCH", "节点引用不属于当前修订或当前时间线算法版本。" );
  }
  const snapshot = await calculateTransitSnapshot({
    revision,
    atInstant: ref.startInstant.replace(/\.\d{3}Z$/, "Z"),
    ...(ref.manualDirection ? { manualDirection: ref.manualDirection } : {})
  });
  if (snapshot.luckCycleRuleDigest !== ref.luckCycleRuleDigest) {
    throw new TransitCoreError("TRANSIT_CONTEXT_MISMATCH", "节点引用的起运规则摘要与当前修订不一致。" );
  }
  const node = Object.values(snapshot.tracks)
    .flat()
    .find((item) =>
      item.nodeType === ref.nodeType &&
      item.startInstant === ref.startInstant &&
      item.ref.manualDirection === ref.manualDirection
    );
  if (!node) {
    throw new TransitCoreError("STALE_NODE_REF", "节点按原起点重算后事实哈希不一致；不会跳转到近似节点。" );
  }
  const expectedFactHash = await transitNodeFactHash({
    timelineVersion: ref.timelineVersion,
    algorithmId: ref.algorithmId,
    revisionId: revision.id,
    chartResultHash: revision.manifest.resultHash,
    ruleProfileDigest: snapshot.ruleProfileDigest,
    luckCycleRuleDigest: snapshot.luckCycleRuleDigest,
    manualDirection: ref.manualDirection,
    nodeType: node.nodeType,
    startInstant: node.startInstant,
    endExclusiveInstant: node.endExclusiveInstant,
    frame: node.frame,
    ganZhi: node.ganZhi,
    index: node.index,
    boundaryLabel: node.boundaryLabel
  });
  if (ref.nodeId !== `${Date.parse(node.startInstant)}.${expectedFactHash}`) {
    throw new TransitCoreError(
      "STALE_NODE_REF",
      "Historical transit reference facts do not match the locked immutable v2 replay."
    );
  }
  return { node, ref };
}

export async function resolveTransitNodeRef(
  rawRevision: RevisionRecord,
  rawRef: TransitNodeRef
): Promise<TransitNode> {
  return (await replayTransitNodeRef(rawRevision, rawRef, false)).node;
}

/**
 * Read/restore-only compatibility verification. Historical field values are
 * preserved; callers must not relabel an accepted v1.1 reference as v1.2.
 */
export async function verifyCompatibleTransitNodeRef(
  rawRevision: RevisionRecord,
  rawRef: TransitNodeRef
): Promise<TransitNodeRef> {
  return (await replayTransitNodeRef(rawRevision, rawRef, true)).ref;
}
