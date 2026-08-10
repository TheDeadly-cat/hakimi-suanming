import {
  replayRevisionNatalChart,
  verifyRevisionRecordIntegrity,
  verifyRevisionSnapshotIntegrity
} from "@hakimi/chart-integrity";
import {
  PILLAR_RELATION_TYPES,
  REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION as CONTRACT_REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION,
  timeZoneDatabaseSnapshotSchema,
  transitSnapshotSchema,
  type RevisionCalculationReceiptCaptureKind as ContractRevisionCalculationReceiptCaptureKind,
  type RevisionCalculationReceiptRecord,
  type RevisionRecord,
  type TransitSnapshot
} from "@hakimi/contracts";
import { Temporal } from "@js-temporal/polyfill";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  LUCK_CYCLE_EXECUTOR_DESCRIPTOR,
  lookupHistoricalLuckCycleExecutor,
  type LuckCycleExecutorDescriptor,
  type LuckCycleResult,
  type LuckCycleRule,
  type LuckDirection
} from "@hakimi/luck-core";
import {
  DEFAULT_RELATION_RULE_PROFILE,
  RELATIONS_EXECUTOR_DESCRIPTOR,
  lookupHistoricalRelationsExecutor,
  type RelationRuleProfile,
  type RelationsExecutorDescriptor,
  type RelationsResult
} from "@hakimi/relations-core";
import {
  CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
  lookupHistoricalTransitSnapshotExecutor,
  type TransitSnapshotExecutorDescriptor
} from "@hakimi/transit-core";

export const REVISION_DERIVED_REPLAY_SCHEMA_VERSION = "1.0.0" as const;

export type RevisionDerivedReplayProfile = Readonly<{
  schemaVersion: typeof REVISION_DERIVED_REPLAY_SCHEMA_VERSION;
  profileId: string;
  relations: Readonly<{
    descriptor: Readonly<RelationsExecutorDescriptor>;
    ruleProfile: Readonly<RelationRuleProfile>;
  }>;
  luckCycle: Readonly<{
    descriptor: Readonly<LuckCycleExecutorDescriptor>;
  }>;
  transit: Readonly<{
    descriptor: Readonly<TransitSnapshotExecutorDescriptor>;
  }>;
}>;

export type RevisionDerivedReplayRequest = Readonly<{
  profile: RevisionDerivedReplayProfile;
  atInstant?: string;
  manualDirection?: LuckDirection;
}>;

export type RevisionDerivedReplayUnavailableCode =
  | "executor_unavailable"
  | "frozen_rule_snapshot_missing"
  | "unique_birth_instant_missing"
  | "manual_direction_required"
  | "manual_direction_not_allowed"
  | "calculation_failed";

export type RevisionDerivedReplayComponent<T> =
  | Readonly<{
      status: "projected";
      executorId: string;
      resultDigest: string;
      result: T;
    }>
  | Readonly<{
      status: "unavailable";
      code: RevisionDerivedReplayUnavailableCode;
      reason: string;
      executorId?: string;
    }>;

type RevisionDerivedReplayUnavailableComponent = Extract<
  RevisionDerivedReplayComponent<unknown>,
  { status: "unavailable" }
>;

export type RevisionTransitReplayComponent =
  | RevisionDerivedReplayComponent<TransitSnapshot>
  | Readonly<{
      status: "not_requested";
      reason: string;
    }>;

export type RevisionDerivedReplayProjection = Readonly<{
  schemaVersion: typeof REVISION_DERIVED_REPLAY_SCHEMA_VERSION;
  kind: "revision_explicit_executor_derivation";
  claim: "explicit_version_projection_not_stored_historical_output_comparison";
  storedHistoricalOutputCompared: false;
  status: "complete" | "partial";
  sourceRevisionId: string;
  sourceRevisionSnapshotDigest: string;
  sourceNatalReplayDigest: string;
  sourceNatalResultHash: string;
  profile: RevisionDerivedReplayProfile;
  request: Readonly<{
    atInstant: string | null;
    manualDirection: LuckDirection | null;
  }>;
  relations: RevisionDerivedReplayComponent<RelationsResult>;
  luckCycle: RevisionDerivedReplayComponent<LuckCycleResult>;
  transit: RevisionTransitReplayComponent;
  projectionDigest: string;
}>;

export type RevisionDerivedReplayErrorCode =
  | "INVALID_REQUEST"
  | "SOURCE_NATAL_REPLAY_UNAVAILABLE"
  | "SOURCE_NATAL_REPLAY_MISMATCH"
  | "PROJECTION_INTEGRITY_MISMATCH";

export class RevisionDerivedReplayError extends Error {
  constructor(
    readonly code: RevisionDerivedReplayErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "RevisionDerivedReplayError";
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested, seen);
  return Object.freeze(value);
}

function cloneForReplay<T>(value: T, label: string): T {
  try {
    return deepFreeze(structuredClone(value));
  } catch (cause) {
    throw new RevisionDerivedReplayError(
      "INVALID_REQUEST",
      `${label}无法被结构化复制；显式版本派生已拒绝。`,
      { cause }
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactContainerKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  label: string
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RevisionDerivedReplayError("INVALID_REQUEST", `${label}必须是对象。`);
  }
  const allowed = new Set([...required, ...optional]);
  const keys = Reflect.ownKeys(value);
  if (
    keys.some((key) => typeof key !== "string" || !allowed.has(key)) ||
    required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  ) {
    throw new RevisionDerivedReplayError("INVALID_REQUEST", `${label}包含未知字段或缺少必需字段。`);
  }
}

function validateReplayProfile(rawProfile: unknown): asserts rawProfile is RevisionDerivedReplayProfile {
  assertExactContainerKeys(
    rawProfile,
    ["schemaVersion", "profileId", "relations", "luckCycle", "transit"],
    [],
    "执行器 Profile"
  );
  if (
    rawProfile.schemaVersion !== REVISION_DERIVED_REPLAY_SCHEMA_VERSION ||
    typeof rawProfile.profileId !== "string" ||
    !/^[a-z0-9][a-z0-9:._-]{0,199}$/.test(rawProfile.profileId)
  ) {
    throw new RevisionDerivedReplayError("INVALID_REQUEST", "执行器 Profile 的 schemaVersion 或 profileId 无效。");
  }
  assertExactContainerKeys(rawProfile.relations, ["descriptor", "ruleProfile"], [], "关系执行器选择");
  assertExactContainerKeys(rawProfile.luckCycle, ["descriptor"], [], "起运执行器选择");
  assertExactContainerKeys(rawProfile.transit, ["descriptor"], [], "Transit 执行器选择");
}

function parseReplayRequest(rawRequest: unknown): RevisionDerivedReplayRequest {
  const request = cloneForReplay(rawRequest, "派生请求") as unknown;
  assertExactContainerKeys(request, ["profile"], ["atInstant", "manualDirection"], "派生请求");
  validateReplayProfile(request.profile);
  if (request.atInstant !== undefined) {
    if (typeof request.atInstant !== "string") {
      throw new RevisionDerivedReplayError("INVALID_REQUEST", "Transit 目标瞬时点必须是字符串。" );
    }
    try {
      const canonical = Temporal.Instant.from(request.atInstant).toString({ smallestUnit: "millisecond" });
      if (canonical !== request.atInstant) {
        throw new Error("non-canonical instant");
      }
    } catch (cause) {
      throw new RevisionDerivedReplayError(
        "INVALID_REQUEST",
        "Transit 目标必须是带三位毫秒和 Z 的规范 ISO 瞬时点。",
        { cause }
      );
    }
  }
  if (
    request.manualDirection !== undefined &&
    request.manualDirection !== "forward" &&
    request.manualDirection !== "backward"
  ) {
    throw new RevisionDerivedReplayError("INVALID_REQUEST", "人工顺逆只能是 forward 或 backward。" );
  }
  return request as RevisionDerivedReplayRequest;
}

export const CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE: RevisionDerivedReplayProfile = deepFreeze({
  schemaVersion: REVISION_DERIVED_REPLAY_SCHEMA_VERSION,
  profileId: "hakimi-explicit-derived-replay:relations-0.1.0_luck-0.1.0_transit-1.2.0",
  relations: {
    descriptor: structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR),
    ruleProfile: structuredClone(DEFAULT_RELATION_RULE_PROFILE)
  },
  luckCycle: {
    descriptor: structuredClone(LUCK_CYCLE_EXECUTOR_DESCRIPTOR)
  },
  transit: {
    descriptor: structuredClone(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR)
  }
});

function unavailable<T>(
  code: RevisionDerivedReplayUnavailableCode,
  reason: string,
  executorId?: string
): RevisionDerivedReplayUnavailableComponent {
  return deepFreeze({ status: "unavailable", code, reason, ...(executorId ? { executorId } : {}) });
}

async function projected<T>(executorId: string, rawResult: T): Promise<RevisionDerivedReplayComponent<T>> {
  const result = cloneForReplay(rawResult, "派生结果");
  return deepFreeze({
    status: "projected" as const,
    executorId,
    resultDigest: await sha256Hex(result),
    result
  });
}

function luckInputFromRevision(revision: RevisionRecord, manualDirection: LuckDirection | undefined) {
  return {
    schemaVersion: "1.0.0" as const,
    birthInstant: revision.timeCalibration.utcInstant!,
    sex: revision.input.sex,
    ...(manualDirection ? { manualDirection } : {}),
    expectedYearGanZhi: revision.facts.pillars.year.ganZhi,
    expectedMonthGanZhi: revision.facts.pillars.month.ganZhi
  };
}

function preflightLuck(
  revision: RevisionRecord,
  manualDirection: LuckDirection | undefined,
  executorId?: string
): RevisionDerivedReplayUnavailableComponent | null {
  if (!revision.luckCycleRuleSnapshot) {
    return unavailable(
      "frozen_rule_snapshot_missing",
      "Revision 未保存完整起运规则快照；不会根据当前默认规则反推旧结果。",
      executorId
    );
  }
  if (!revision.timeCalibration.utcInstant) {
    return unavailable(
      "unique_birth_instant_missing",
      "Revision 没有唯一出生瞬时点，不能生成确定的起运投影。",
      executorId
    );
  }
  if (revision.input.sex === "unspecified" && !manualDirection) {
    return unavailable(
      "manual_direction_required",
      "性别未指定时必须显式选择顺行或逆行；系统不会猜测。",
      executorId
    );
  }
  if (revision.input.sex !== "unspecified" && manualDirection) {
    return unavailable(
      "manual_direction_not_allowed",
      "Revision 已由锁版规则确定顺逆，不能再用人工方向覆盖。",
      executorId
    );
  }
  return null;
}

function componentDigestSource(component: RevisionDerivedReplayComponent<unknown> | RevisionTransitReplayComponent) {
  if (component.status === "projected") {
    return { status: component.status, executorId: component.executorId, resultDigest: component.resultDigest };
  }
  if (component.status === "not_requested") return component;
  return {
    status: component.status,
    code: component.code,
    reason: component.reason,
    ...(component.executorId ? { executorId: component.executorId } : {})
  };
}

export function buildRevisionDerivedReplayProjectionDigestPayload(
  projection: Omit<RevisionDerivedReplayProjection, "projectionDigest">
) {
  return {
    schemaVersion: projection.schemaVersion,
    kind: projection.kind,
    claim: projection.claim,
    storedHistoricalOutputCompared: projection.storedHistoricalOutputCompared,
    status: projection.status,
    sourceRevisionId: projection.sourceRevisionId,
    sourceRevisionSnapshotDigest: projection.sourceRevisionSnapshotDigest,
    sourceNatalReplayDigest: projection.sourceNatalReplayDigest,
    sourceNatalResultHash: projection.sourceNatalResultHash,
    profile: projection.profile,
    request: projection.request,
    relations: componentDigestSource(projection.relations),
    luckCycle: componentDigestSource(projection.luckCycle),
    transit: componentDigestSource(projection.transit)
  };
}

/**
 * Builds a deterministic, zero-write projection with explicitly selected
 * retained executors. It first proves that the frozen natal Revision exactly
 * replays. Because old Revisions did not persist downstream outputs or their
 * bindings, this API never claims to compare an original relations/luck/transit
 * result; it only proves which exact executable profile produced this projection.
 */
export async function replayRevisionDerivedProjection(
  rawRevision: unknown,
  rawRequest: unknown
): Promise<RevisionDerivedReplayProjection> {
  const request = parseReplayRequest(rawRequest);
  let revision: RevisionRecord;
  let natalReplay;
  try {
    revision = cloneForReplay(
      await verifyRevisionRecordIntegrity(rawRevision),
      "源 Revision"
    );
    natalReplay = await replayRevisionNatalChart(revision);
  } catch (cause) {
    throw new RevisionDerivedReplayError(
      "SOURCE_NATAL_REPLAY_UNAVAILABLE",
      "源 Revision 无法完成精确本命盘复演；下游派生已失败关闭。",
      { cause }
    );
  }
  if (natalReplay.status !== "matched") {
    throw new RevisionDerivedReplayError(
      "SOURCE_NATAL_REPLAY_MISMATCH",
      "源 Revision 与精确本命盘执行器不一致；下游派生已拒绝。"
    );
  }
  const relationsExecutor = lookupHistoricalRelationsExecutor(request.profile.relations.descriptor);
  let relations: RevisionDerivedReplayComponent<RelationsResult>;
  if (!relationsExecutor) {
    relations = unavailable(
      "executor_unavailable",
      "没有与完整关系引擎描述符精确匹配的保留执行器；不会回退当前版本。"
    );
  } else {
    try {
      relations = await projected(
        relationsExecutor.executorId,
        relationsExecutor.calculatePillarRelations(
          revision.facts,
          request.profile.relations.ruleProfile as RelationRuleProfile
        )
      );
    } catch (cause) {
      relations = unavailable(
        "calculation_failed",
        cause instanceof Error ? cause.message : "关系派生失败。",
        relationsExecutor.executorId
      );
    }
  }

  const luckExecutor = lookupHistoricalLuckCycleExecutor(request.profile.luckCycle.descriptor);
  let luckCycle: RevisionDerivedReplayComponent<LuckCycleResult>;
  if (!luckExecutor) {
    luckCycle = unavailable(
      "executor_unavailable",
      "没有与完整起运执行器描述符精确匹配的保留执行器；不会回退当前版本。"
    );
  } else {
    const preflight = preflightLuck(revision, request.manualDirection, luckExecutor.executorId);
    if (preflight) {
      luckCycle = preflight;
    } else {
      try {
        luckCycle = await projected(
          luckExecutor.executorId,
          luckExecutor.replay(
            luckInputFromRevision(revision, request.manualDirection),
            revision.luckCycleRuleSnapshot as LuckCycleRule
          )
        );
      } catch (cause) {
        luckCycle = unavailable(
          "calculation_failed",
          cause instanceof Error ? cause.message : "起运派生失败。",
          luckExecutor.executorId
        );
      }
    }
  }

  let transit: RevisionTransitReplayComponent;
  if (!request.atInstant) {
    transit = deepFreeze({ status: "not_requested", reason: "未提供目标瞬时点，本次不生成运限时间切片。" });
  } else {
    const transitExecutor = lookupHistoricalTransitSnapshotExecutor(request.profile.transit.descriptor);
    if (!transitExecutor) {
      transit = unavailable(
        "executor_unavailable",
        "没有与完整时间线、算法和引擎描述符精确匹配的保留 Transit 执行器；不会回退当前版本。"
      );
    } else {
      const preflight = preflightLuck(revision, request.manualDirection, transitExecutor.executorId);
      if (preflight) {
        transit = preflight;
      } else {
        try {
          transit = await projected(
            transitExecutor.executorId,
            await transitExecutor.calculateSnapshot({
              revision,
              atInstant: request.atInstant,
              ...(request.manualDirection ? { manualDirection: request.manualDirection } : {})
            })
          );
        } catch (cause) {
          transit = unavailable(
            "calculation_failed",
            cause instanceof Error ? cause.message : "运限时间切片派生失败。",
            transitExecutor.executorId
          );
        }
      }
    }
  }

  const status = relations.status === "projected" &&
    luckCycle.status === "projected" &&
    (transit.status === "projected" || transit.status === "not_requested")
    ? "complete" as const
    : "partial" as const;
  const projectionWithoutDigest = {
    schemaVersion: REVISION_DERIVED_REPLAY_SCHEMA_VERSION,
    kind: "revision_explicit_executor_derivation" as const,
    claim: "explicit_version_projection_not_stored_historical_output_comparison" as const,
    storedHistoricalOutputCompared: false as const,
    status,
    sourceRevisionId: revision.id,
    sourceRevisionSnapshotDigest: natalReplay.sourceRevisionSnapshotDigest,
    sourceNatalReplayDigest: natalReplay.projectionDigest,
    sourceNatalResultHash: natalReplay.replayedResultHash,
    profile: request.profile,
    request: {
      atInstant: request.atInstant ?? null,
      manualDirection: request.manualDirection ?? null
    },
    relations,
    luckCycle,
    transit
  };
  const digestSource = buildRevisionDerivedReplayProjectionDigestPayload(projectionWithoutDigest);
  return deepFreeze({
    ...projectionWithoutDigest,
    projectionDigest: await sha256Hex(digestSource)
  });
}

function assertProjectionComponentShape(raw: unknown, allowNotRequested: boolean): void {
  if (!isRecord(raw) || typeof raw.status !== "string") {
    throw new RevisionDerivedReplayError("PROJECTION_INTEGRITY_MISMATCH", "派生组件结构无效。" );
  }
  if (raw.status === "projected") {
    assertExactContainerKeys(raw, ["status", "executorId", "resultDigest", "result"], [], "已生成派生组件");
    if (
      typeof raw.executorId !== "string" ||
      raw.executorId.length < 1 ||
      raw.executorId.length > 240 ||
      typeof raw.resultDigest !== "string" ||
      !/^[a-f0-9]{64}$/.test(raw.resultDigest)
    ) {
      throw new RevisionDerivedReplayError("PROJECTION_INTEGRITY_MISMATCH", "派生组件执行器或摘要无效。" );
    }
    return;
  }
  if (raw.status === "unavailable") {
    assertExactContainerKeys(raw, ["status", "code", "reason"], ["executorId"], "不可用派生组件");
    const unavailableCodes: readonly RevisionDerivedReplayUnavailableCode[] = [
      "executor_unavailable",
      "frozen_rule_snapshot_missing",
      "unique_birth_instant_missing",
      "manual_direction_required",
      "manual_direction_not_allowed",
      "calculation_failed"
    ];
    if (
      typeof raw.code !== "string" ||
      !unavailableCodes.includes(raw.code as RevisionDerivedReplayUnavailableCode) ||
      typeof raw.reason !== "string" ||
      raw.reason.length < 1 ||
      (raw.executorId !== undefined &&
        (typeof raw.executorId !== "string" || raw.executorId.length < 1 || raw.executorId.length > 240))
    ) {
      throw new RevisionDerivedReplayError("PROJECTION_INTEGRITY_MISMATCH", "不可用组件原因无效。" );
    }
    return;
  }
  if (allowNotRequested && raw.status === "not_requested") {
    assertExactContainerKeys(raw, ["status", "reason"], [], "未请求 Transit 组件");
    if (typeof raw.reason !== "string" || raw.reason.length < 1) {
      throw new RevisionDerivedReplayError("PROJECTION_INTEGRITY_MISMATCH", "未请求组件原因无效。" );
    }
    return;
  }
  throw new RevisionDerivedReplayError("PROJECTION_INTEGRITY_MISMATCH", "派生组件状态无效。" );
}

const RELATIONS_DESCRIPTOR_KEYS = [
  "outputSchemaVersion",
  "ruleProfile",
  "embeddedRelationTableVersion",
  "factAlgorithmVersion",
  "engine"
] as const;
const COMPLETE_ENGINE_DESCRIPTOR_KEYS = [
  "name",
  "version",
  "upstreamName",
  "upstreamVersion",
  "upstreamTagCommit",
  "upstreamIntegrity"
] as const;
const LUCK_DESCRIPTOR_KEYS = [
  "outputSchemaVersion",
  "ruleSnapshotSchemaVersion",
  "algorithmId",
  "engine",
  "upstream"
] as const;
const TRANSIT_DESCRIPTOR_KEYS = ["timelineVersion", "algorithmId", "engine", "timeZoneDatabase"] as const;
const RELATION_POSITIONS = ["year", "month", "day", "hour"] as const;
const RELATION_COMPLETENESS = ["binary", "complete_set", "incomplete_set"] as const;
const RELATION_VERIFICATION_STATUSES = [
  "upstream_public_constant_audited",
  "embedded_table_pending_consultant_review"
] as const;

function assertNonEmptyString(value: unknown, label: string, maximum = 1_000): asserts value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > maximum) {
    throw new Error(`${label} must be a non-empty bounded string`);
  }
}

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be a string array`);
  }
}

function assertCompleteEngineDescriptor(raw: unknown, label: string): asserts raw is Record<string, string> {
  assertExactContainerKeys(raw, COMPLETE_ENGINE_DESCRIPTOR_KEYS, [], label);
  for (const key of COMPLETE_ENGINE_DESCRIPTOR_KEYS) assertNonEmptyString(raw[key], `${label}.${key}`);
}

function assertRelationsRuleProfileStructure(raw: unknown): asserts raw is RelationRuleProfile {
  assertExactContainerKeys(
    raw,
    [
      "schemaVersion",
      "profileId",
      "profileVersion",
      "enabled",
      "stemClashRule",
      "incompleteSetPolicy",
      "punishmentSetRule"
    ],
    [],
    "关系规则 Profile"
  );
  assertNonEmptyString(raw.schemaVersion, "关系规则 schemaVersion");
  assertNonEmptyString(raw.profileId, "关系规则 profileId");
  assertNonEmptyString(raw.profileVersion, "关系规则 profileVersion");
  assertExactContainerKeys(raw.enabled, PILLAR_RELATION_TYPES, [], "关系规则 enabled");
  for (const key of PILLAR_RELATION_TYPES) {
    if (typeof raw.enabled[key] !== "boolean") throw new Error(`关系规则 enabled.${key} must be boolean`);
  }
  if (raw.stemClashRule !== "lunar-util-chong-gan-4-v1" && raw.stemClashRule !== "disabled") {
    throw new Error("关系规则 stemClashRule 无效");
  }
  if (raw.incompleteSetPolicy !== "emit_two_of_three" && raw.incompleteSetPolicy !== "complete_only") {
    throw new Error("关系规则 incompleteSetPolicy 无效");
  }
  if (raw.punishmentSetRule !== "two_triads_plus_zi_mao_and_four_self_branches-v1") {
    throw new Error("关系规则 punishmentSetRule 无效");
  }
}

function assertRelationsDescriptorStructure(raw: unknown): asserts raw is RelationsExecutorDescriptor {
  assertExactContainerKeys(raw, RELATIONS_DESCRIPTOR_KEYS, [], "关系执行器描述符");
  assertNonEmptyString(raw.outputSchemaVersion, "关系输出 schemaVersion");
  assertNonEmptyString(raw.embeddedRelationTableVersion, "关系表版本");
  assertNonEmptyString(raw.factAlgorithmVersion, "关系事实算法版本");
  assertExactContainerKeys(
    raw.ruleProfile,
    ["schemaVersion", "profileId", "profileVersion"],
    [],
    "关系执行器规则身份"
  );
  for (const key of ["schemaVersion", "profileId", "profileVersion"] as const) {
    assertNonEmptyString(raw.ruleProfile[key], `关系执行器规则身份.${key}`);
  }
  assertCompleteEngineDescriptor(raw.engine, "关系执行器引擎");
}

function assertLuckDescriptorStructure(raw: unknown): asserts raw is LuckCycleExecutorDescriptor {
  assertExactContainerKeys(raw, LUCK_DESCRIPTOR_KEYS, [], "起运执行器描述符");
  assertNonEmptyString(raw.outputSchemaVersion, "起运输出 schemaVersion");
  assertNonEmptyString(raw.ruleSnapshotSchemaVersion, "起运规则快照 schemaVersion");
  assertNonEmptyString(raw.algorithmId, "起运 algorithmId");
  assertExactContainerKeys(raw.engine, ["name", "version"], [], "起运执行器引擎");
  assertNonEmptyString(raw.engine.name, "起运执行器引擎 name");
  assertNonEmptyString(raw.engine.version, "起运执行器引擎 version");
  assertExactContainerKeys(raw.upstream, ["name", "version", "tagCommit", "integrity"], [], "起运上游身份");
  for (const key of ["name", "version", "tagCommit", "integrity"] as const) {
    assertNonEmptyString(raw.upstream[key], `起运上游身份.${key}`);
  }
}

function assertTransitDescriptorStructure(raw: unknown): asserts raw is TransitSnapshotExecutorDescriptor {
  assertExactContainerKeys(raw, TRANSIT_DESCRIPTOR_KEYS, [], "Transit 执行器描述符");
  assertNonEmptyString(raw.timelineVersion, "Transit timelineVersion");
  assertNonEmptyString(raw.algorithmId, "Transit algorithmId");
  assertCompleteEngineDescriptor(raw.engine, "Transit 执行器引擎");
  const parsedTimeZoneDatabase = timeZoneDatabaseSnapshotSchema.safeParse(raw.timeZoneDatabase);
  if (
    !parsedTimeZoneDatabase.success ||
    canonicalStringify(parsedTimeZoneDatabase.data) !== canonicalStringify(raw.timeZoneDatabase)
  ) {
    throw new Error("Transit 时区数据库描述符结构无效");
  }
}

function assertStoredProfileStructure(profile: RevisionDerivedReplayProfile): void {
  assertRelationsDescriptorStructure(profile.relations.descriptor);
  assertRelationsRuleProfileStructure(profile.relations.ruleProfile);
  assertLuckDescriptorStructure(profile.luckCycle.descriptor);
  assertTransitDescriptorStructure(profile.transit.descriptor);
}

function assertFourPillars(raw: unknown): asserts raw is Record<(typeof RELATION_POSITIONS)[number], string> {
  assertExactContainerKeys(raw, RELATION_POSITIONS, [], "关系四柱");
  for (const position of RELATION_POSITIONS) assertNonEmptyString(raw[position], `关系四柱.${position}`, 20);
}

function assertRelationsResultStructure(
  raw: unknown,
  descriptor: RelationsExecutorDescriptor,
  expectedRuleProfile: RelationRuleProfile
): asserts raw is RelationsResult {
  assertExactContainerKeys(raw, ["schemaVersion", "kind", "pillars", "ruleProfile", "facts", "manifest"], [], "关系输出");
  if (raw.schemaVersion !== descriptor.outputSchemaVersion || raw.kind !== "pillar_relation_facts") {
    throw new Error("关系输出身份与描述符不一致");
  }
  assertFourPillars(raw.pillars);
  assertRelationsRuleProfileStructure(raw.ruleProfile);
  if (canonicalStringify(raw.ruleProfile) !== canonicalStringify(expectedRuleProfile)) {
    throw new Error("关系输出规则与请求 Profile 不一致");
  }
  if (
    raw.ruleProfile.schemaVersion !== descriptor.ruleProfile.schemaVersion ||
    raw.ruleProfile.profileId !== descriptor.ruleProfile.profileId ||
    raw.ruleProfile.profileVersion !== descriptor.ruleProfile.profileVersion
  ) {
    throw new Error("关系输出规则身份与执行器描述符不一致");
  }
  assertExactContainerKeys(raw.manifest, ["engine", "deterministic", "interpretationIncluded"], [], "关系输出 manifest");
  assertCompleteEngineDescriptor(raw.manifest.engine, "关系输出引擎");
  if (
    canonicalStringify(raw.manifest.engine) !== canonicalStringify(descriptor.engine) ||
    raw.manifest.deterministic !== true ||
    raw.manifest.interpretationIncluded !== false
  ) {
    throw new Error("关系输出 manifest 与描述符不一致");
  }
  if (!Array.isArray(raw.facts)) throw new Error("关系输出 facts 必须是数组");
  for (const [index, fact] of raw.facts.entries()) {
    assertExactContainerKeys(
      fact,
      [
        "id", "relationType", "ruleId", "completeness", "participants",
        "requiredMembers", "presentMembers", "missingMembers", "algorithmId",
        "tableVersion", "verificationStatus", "sourceRefs", "knownGaps"
      ],
      [],
      `关系事实 ${index}`
    );
    assertNonEmptyString(fact.id, `关系事实 ${index}.id`, 500);
    if (!(PILLAR_RELATION_TYPES as readonly string[]).includes(fact.relationType as string)) {
      throw new Error(`关系事实 ${index}.relationType 无效`);
    }
    assertNonEmptyString(fact.ruleId, `关系事实 ${index}.ruleId`, 300);
    if (!(RELATION_COMPLETENESS as readonly string[]).includes(fact.completeness as string)) {
      throw new Error(`关系事实 ${index}.completeness 无效`);
    }
    if (!Array.isArray(fact.participants)) throw new Error(`关系事实 ${index}.participants 必须是数组`);
    for (const [participantIndex, participant] of fact.participants.entries()) {
      assertExactContainerKeys(
        participant,
        ["position", "ganZhi", "component", "value"],
        [],
        `关系事实 ${index}.participants.${participantIndex}`
      );
      if (!(RELATION_POSITIONS as readonly string[]).includes(participant.position as string)) {
        throw new Error(`关系事实 ${index}.participants.${participantIndex}.position 无效`);
      }
      assertNonEmptyString(participant.ganZhi, `关系事实 ${index}.participants.${participantIndex}.ganZhi`, 20);
      if (participant.component !== "stem" && participant.component !== "branch") {
        throw new Error(`关系事实 ${index}.participants.${participantIndex}.component 无效`);
      }
      assertNonEmptyString(participant.value, `关系事实 ${index}.participants.${participantIndex}.value`, 10);
    }
    for (const key of ["requiredMembers", "presentMembers", "missingMembers", "sourceRefs", "knownGaps"] as const) {
      assertStringArray(fact[key], `关系事实 ${index}.${key}`);
    }
    assertNonEmptyString(fact.algorithmId, `关系事实 ${index}.algorithmId`, 300);
    assertNonEmptyString(fact.tableVersion, `关系事实 ${index}.tableVersion`, 500);
    if (!(RELATION_VERIFICATION_STATUSES as readonly string[]).includes(fact.verificationStatus as string)) {
      throw new Error(`关系事实 ${index}.verificationStatus 无效`);
    }
    const expectedFactId = `${fact.relationType}|${fact.completeness}|${fact.ruleId}|${fact.participants
      .map((participant) => `${participant.position}:${participant.value}`)
      .join("|")}`;
    const expectedAlgorithmId = `${descriptor.engine.name}:${fact.relationType}:` +
      `${fact.completeness === "binary" ? "position-pair-scan" : "required-set-presence"}:` +
      descriptor.factAlgorithmVersion;
    if (fact.id !== expectedFactId || fact.algorithmId !== expectedAlgorithmId) {
      throw new Error(`关系事实 ${index} 的确定性身份与描述符不一致`);
    }
  }
}

function assertLuckFactMetadata(raw: unknown, algorithmId: string, label: string): void {
  if (!isRecord(raw) || raw.algorithmId !== algorithmId || raw.verificationStatus !== "engineering_preview") {
    throw new Error(`${label} 事实元数据与执行器描述符不一致`);
  }
}

function assertExactRational(raw: unknown, label: string): void {
  assertExactContainerKeys(raw, ["numerator", "denominator", "decimal", "decimalIsDisplayOnly"], [], label);
  if (
    typeof raw.numerator !== "string" ||
    !/^-?\d+$/.test(raw.numerator) ||
    typeof raw.denominator !== "string" ||
    !/^[1-9]\d*$/.test(raw.denominator) ||
    typeof raw.decimal !== "number" ||
    !Number.isFinite(raw.decimal) ||
    raw.decimalIsDisplayOnly !== true
  ) {
    throw new Error(`${label} 有理数结构无效`);
  }
}

function assertTraditionalAgeComponents(raw: unknown, label: string): void {
  assertExactContainerKeys(
    raw,
    ["years", "months", "days", "hours", "minutes", "seconds", "milliseconds"],
    [],
    label
  );
  for (const key of ["years", "months", "days", "hours", "minutes", "seconds", "milliseconds"] as const) {
    assertFiniteNumber(raw[key], `${label}.${key}`);
  }
}

function assertExactLuckAge(raw: unknown, label: string): void {
  assertExactContainerKeys(raw, ["elapsedYears", "components", "semantics"], [], label);
  assertExactRational(raw.elapsedYears, `${label}.elapsedYears`);
  assertTraditionalAgeComponents(raw.components, `${label}.components`);
  if (raw.semantics !== "elapsed_age_from_birth_not_nominal_age") {
    throw new Error(`${label}.semantics 无效`);
  }
}

function assertLuckInputStructure(raw: unknown, label: string): asserts raw is LuckCycleResult["input"] {
  assertExactContainerKeys(
    raw,
    ["schemaVersion", "birthInstant", "sex"],
    ["manualDirection", "expectedYearGanZhi", "expectedMonthGanZhi"],
    label
  );
  assertNonEmptyString(raw.schemaVersion, `${label}.schemaVersion`);
  assertNonEmptyString(raw.birthInstant, `${label}.birthInstant`);
  if (raw.sex !== "male" && raw.sex !== "female" && raw.sex !== "unspecified") {
    throw new Error(`${label}.sex 无效`);
  }
  if (Object.prototype.hasOwnProperty.call(raw, "manualDirection") &&
    raw.manualDirection !== "forward" && raw.manualDirection !== "backward") {
    throw new Error(`${label}.manualDirection 无效`);
  }
  for (const key of ["expectedYearGanZhi", "expectedMonthGanZhi"] as const) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) assertNonEmptyString(raw[key], `${label}.${key}`, 20);
  }
}

function assertXiaoyunRuleStructure(raw: unknown, label: string): void {
  assertExactContainerKeys(
    raw,
    [
      "method", "directionRule", "directionReuse", "firstAge", "firstStepOffset",
      "ageBasis", "boundaryAlignment", "boundaryFrame", "scope", "cycleLength",
      "intervalPolicy", "unknownSexPolicy", "unknownHourPolicy"
    ],
    [],
    label
  );
  if (
    raw.method !== "birth_hour_adjacent" ||
    raw.directionRule !== "exact_chart_year_stem_and_gender" ||
    raw.directionReuse !== "luck_cycle_or_manual_direction" ||
    raw.firstAge !== 1 ||
    raw.firstStepOffset !== 1 ||
    raw.ageBasis !== "nominal_age" ||
    raw.boundaryAlignment !== "flow_year_start_exact" ||
    raw.boundaryFrame !== "fixed_plus08" ||
    raw.scope !== "whole_life" ||
    raw.cycleLength !== 60 ||
    raw.intervalPolicy !== "half_open" ||
    raw.unknownSexPolicy !== "require_manual_direction" ||
    raw.unknownHourPolicy !== "unsupported"
  ) {
    throw new Error(`${label} 结构无效`);
  }
}

function assertLuckRuleStructure(raw: unknown, label: string): asserts raw is LuckCycleRule {
  assertExactContainerKeys(
    raw,
    [
      "schemaVersion", "ruleId", "ruleVersion", "directionRule", "unknownSexPolicy",
      "anchor", "exactBoundaryPolicy", "startAgeMethod", "componentRatios",
      "handoverCalendar", "decadeYears", "decadeCount"
    ],
    ["xiaoyun"],
    label
  );
  for (const key of ["schemaVersion", "ruleId", "ruleVersion"] as const) {
    assertNonEmptyString(raw[key], `${label}.${key}`);
  }
  if (
    raw.directionRule !== "year_stem_yinyang_and_gender" ||
    (raw.unknownSexPolicy !== "require_manual_direction" && raw.unknownSexPolicy !== "reject") ||
    raw.anchor !== "directional_jie" ||
    raw.exactBoundaryPolicy !== "zero_duration" ||
    raw.startAgeMethod !== "three_days_one_year_exact_duration"
  ) {
    throw new Error(`${label} 规则身份无效`);
  }
  assertExactContainerKeys(
    raw.componentRatios,
    [
      "sourceDaysPerTraditionalYear", "traditionalMonthsPerYear",
      "traditionalDaysPerMonth", "traditionalHoursPerDay"
    ],
    [],
    `${label}.componentRatios`
  );
  if (
    raw.componentRatios.sourceDaysPerTraditionalYear !== 3 ||
    raw.componentRatios.traditionalMonthsPerYear !== 12 ||
    raw.componentRatios.traditionalDaysPerMonth !== 30 ||
    raw.componentRatios.traditionalHoursPerDay !== 24
  ) {
    throw new Error(`${label}.componentRatios 无效`);
  }
  assertExactContainerKeys(raw.handoverCalendar, ["frame", "additionOrder", "overflow"], [], `${label}.handoverCalendar`);
  if (
    raw.handoverCalendar.frame !== "fixed_plus08" ||
    raw.handoverCalendar.additionOrder !== "years_months_days_time" ||
    raw.handoverCalendar.overflow !== "constrain"
  ) {
    throw new Error(`${label}.handoverCalendar 无效`);
  }
  if (typeof raw.decadeYears !== "number" || !Number.isSafeInteger(raw.decadeYears) || raw.decadeYears < 1 ||
    typeof raw.decadeCount !== "number" || !Number.isSafeInteger(raw.decadeCount) || raw.decadeCount < 1) {
    throw new Error(`${label} decade 配置无效`);
  }
  if (Object.prototype.hasOwnProperty.call(raw, "xiaoyun")) assertXiaoyunRuleStructure(raw.xiaoyun, `${label}.xiaoyun`);
}

function assertLuckSolarTerm(raw: unknown, descriptor: LuckCycleExecutorDescriptor, label: string): void {
  assertExactContainerKeys(
    raw,
    [
      "algorithmId", "verificationStatus", "name", "kind", "relation",
      "fixedPlusEightWallDateTime", "instant", "sourcePrecision"
    ],
    [],
    label
  );
  assertLuckFactMetadata(raw, descriptor.algorithmId, label);
  assertNonEmptyString(raw.name, `${label}.name`, 40);
  if (raw.kind !== "jie" ||
    (raw.relation !== "strict_previous" && raw.relation !== "exact_boundary" && raw.relation !== "strict_next") ||
    raw.sourcePrecision !== "second") {
    throw new Error(`${label} 节气身份无效`);
  }
  assertNonEmptyString(raw.fixedPlusEightWallDateTime, `${label}.fixedPlusEightWallDateTime`, 50);
  assertNonEmptyString(raw.instant, `${label}.instant`, 50);
}

function assertLuckResultStructure(
  raw: unknown,
  descriptor: LuckCycleExecutorDescriptor,
  expectedManualDirection: LuckDirection | null
): asserts raw is LuckCycleResult {
  assertExactContainerKeys(
    raw,
    [
      "schemaVersion", "kind", "manifest", "input", "rule", "birth", "direction",
      "adjacentJie", "anchorInterval", "startAge", "handover", "decades",
      "warnings", "knownGaps"
    ],
    [],
    "起运输出"
  );
  if (raw.schemaVersion !== descriptor.outputSchemaVersion || raw.kind !== "luck_cycle_facts") {
    throw new Error("起运输出身份与执行器描述符不一致");
  }
  assertExactContainerKeys(
    raw.manifest,
    [
      "algorithmId", "engine", "ruleId", "ruleVersion", "upstream", "sourceRefs",
      "verificationStatus", "goldCaseCount", "releaseGatePassed"
    ],
    [],
    "起运输出 manifest"
  );
  assertExactContainerKeys(raw.manifest.engine, ["name", "version"], [], "起运输出引擎");
  assertExactContainerKeys(raw.manifest.upstream, ["name", "version", "tagCommit", "integrity"], [], "起运输出上游");
  if (
    raw.manifest.algorithmId !== descriptor.algorithmId ||
    canonicalStringify(raw.manifest.engine) !== canonicalStringify(descriptor.engine) ||
    canonicalStringify(raw.manifest.upstream) !== canonicalStringify(descriptor.upstream) ||
    raw.manifest.verificationStatus !== "engineering_preview" ||
    raw.manifest.goldCaseCount !== 0 ||
    raw.manifest.releaseGatePassed !== false
  ) {
    throw new Error("起运输出 manifest 与执行器描述符不一致");
  }
  assertStringArray(raw.manifest.sourceRefs, "起运输出 manifest.sourceRefs");
  assertLuckInputStructure(raw.input, "起运输出 input");
  assertLuckRuleStructure(raw.rule, "起运输出 rule");
  if (
    raw.rule.schemaVersion !== descriptor.ruleSnapshotSchemaVersion ||
    raw.manifest.ruleId !== raw.rule.ruleId ||
    raw.manifest.ruleVersion !== raw.rule.ruleVersion ||
    (raw.input.manualDirection ?? null) !== expectedManualDirection
  ) {
    throw new Error("起运输出输入、规则或人工顺逆与收据请求不一致");
  }
  assertExactContainerKeys(
    raw.birth,
    [
      "algorithmId", "verificationStatus", "instant", "fixedPlusEightWallDateTime",
      "yearGanZhi", "monthGanZhi"
    ],
    [],
    "起运输出 birth"
  );
  assertLuckFactMetadata(raw.birth, descriptor.algorithmId, "起运输出 birth");
  for (const key of ["instant", "fixedPlusEightWallDateTime", "yearGanZhi", "monthGanZhi"] as const) {
    assertNonEmptyString(raw.birth[key], `起运输出 birth.${key}`, 80);
  }
  assertExactContainerKeys(
    raw.direction,
    ["algorithmId", "verificationStatus", "value", "basis", "yearStem", "yearStemPolarity", "sex"],
    [],
    "起运输出 direction"
  );
  assertLuckFactMetadata(raw.direction, descriptor.algorithmId, "起运输出 direction");
  if (
    (raw.direction.value !== "forward" && raw.direction.value !== "backward") ||
    (raw.direction.basis !== "year_stem_yinyang_and_gender" &&
      raw.direction.basis !== "manual_for_unspecified_sex") ||
    (raw.direction.yearStemPolarity !== "yang" && raw.direction.yearStemPolarity !== "yin") ||
    (raw.direction.sex !== "male" && raw.direction.sex !== "female" && raw.direction.sex !== "unspecified")
  ) {
    throw new Error("起运输出 direction 无效");
  }
  assertNonEmptyString(raw.direction.yearStem, "起运输出 direction.yearStem", 10);
  assertExactContainerKeys(raw.adjacentJie, ["previous", "exactBoundary", "next", "selectedAnchor"], [], "起运输出 adjacentJie");
  assertLuckSolarTerm(raw.adjacentJie.previous, descriptor, "起运输出 previous Jie");
  if (raw.adjacentJie.exactBoundary !== null) {
    assertLuckSolarTerm(raw.adjacentJie.exactBoundary, descriptor, "起运输出 exact Jie");
  }
  assertLuckSolarTerm(raw.adjacentJie.next, descriptor, "起运输出 next Jie");
  assertLuckSolarTerm(raw.adjacentJie.selectedAnchor, descriptor, "起运输出 selected Jie");
  assertExactContainerKeys(
    raw.anchorInterval,
    [
      "algorithmId", "verificationStatus", "fromInstant", "toInstant",
      "durationMilliseconds", "durationSeconds", "durationDays"
    ],
    [],
    "起运输出 anchorInterval"
  );
  assertLuckFactMetadata(raw.anchorInterval, descriptor.algorithmId, "起运输出 anchorInterval");
  assertNonEmptyString(raw.anchorInterval.fromInstant, "起运输出 anchorInterval.fromInstant", 50);
  assertNonEmptyString(raw.anchorInterval.toInstant, "起运输出 anchorInterval.toInstant", 50);
  assertFiniteNumber(raw.anchorInterval.durationMilliseconds, "起运输出 anchorInterval.durationMilliseconds");
  assertExactRational(raw.anchorInterval.durationSeconds, "起运输出 anchorInterval.durationSeconds");
  assertExactRational(raw.anchorInterval.durationDays, "起运输出 anchorInterval.durationDays");
  assertExactContainerKeys(
    raw.startAge,
    [
      "algorithmId", "verificationStatus", "elapsedYears", "components", "semantics",
      "sourceDurationMilliseconds", "sourceToTraditionalYearRatio", "unrounded"
    ],
    [],
    "起运输出 startAge"
  );
  assertLuckFactMetadata(raw.startAge, descriptor.algorithmId, "起运输出 startAge");
  assertExactLuckAge({
    elapsedYears: raw.startAge.elapsedYears,
    components: raw.startAge.components,
    semantics: raw.startAge.semantics
  }, "起运输出 startAge age");
  assertFiniteNumber(raw.startAge.sourceDurationMilliseconds, "起运输出 startAge.sourceDurationMilliseconds");
  assertExactRational(raw.startAge.sourceToTraditionalYearRatio, "起运输出 startAge.sourceToTraditionalYearRatio");
  if (raw.startAge.unrounded !== true) throw new Error("起运输出 startAge.unrounded 无效");
  assertExactContainerKeys(
    raw.handover,
    ["algorithmId", "verificationStatus", "instant", "fixedPlusEightWallDateTime", "calendarFrame", "calendarOverflow"],
    [],
    "起运输出 handover"
  );
  assertLuckFactMetadata(raw.handover, descriptor.algorithmId, "起运输出 handover");
  assertNonEmptyString(raw.handover.instant, "起运输出 handover.instant", 50);
  assertNonEmptyString(raw.handover.fixedPlusEightWallDateTime, "起运输出 handover.fixedPlusEightWallDateTime", 50);
  if (raw.handover.calendarFrame !== "fixed_plus08" || raw.handover.calendarOverflow !== "constrain") {
    throw new Error("起运输出 handover 日历语义无效");
  }
  if (!Array.isArray(raw.decades)) throw new Error("起运输出 decades 必须是数组");
  for (const [index, decade] of raw.decades.entries()) {
    assertExactContainerKeys(
      decade,
      [
        "algorithmId", "verificationStatus", "index", "ganZhi", "direction", "startAge",
        "endAgeExclusive", "startInstant", "endExclusiveInstant",
        "startFixedPlusEightWallDateTime", "endExclusiveFixedPlusEightWallDateTime"
      ],
      [],
      `起运输出 decade ${index}`
    );
    assertLuckFactMetadata(decade, descriptor.algorithmId, `起运输出 decade ${index}`);
    if (typeof decade.index !== "number" || !Number.isSafeInteger(decade.index) || decade.index < 1 ||
      (decade.direction !== "forward" && decade.direction !== "backward")) {
      throw new Error(`起运输出 decade ${index} 身份无效`);
    }
    assertNonEmptyString(decade.ganZhi, `起运输出 decade ${index}.ganZhi`, 20);
    assertExactLuckAge(decade.startAge, `起运输出 decade ${index}.startAge`);
    assertExactLuckAge(decade.endAgeExclusive, `起运输出 decade ${index}.endAgeExclusive`);
    for (const key of [
      "startInstant", "endExclusiveInstant", "startFixedPlusEightWallDateTime",
      "endExclusiveFixedPlusEightWallDateTime"
    ] as const) {
      assertNonEmptyString(decade[key], `起运输出 decade ${index}.${key}`, 50);
    }
  }
  assertStringArray(raw.warnings, "起运输出 warnings");
  assertStringArray(raw.knownGaps, "起运输出 knownGaps");
}

function expectedStoredTransitSourceRefs(descriptor: TransitSnapshotExecutorDescriptor): string[] {
  return [
    `https://github.com/6tail/lunar-typescript/blob/${descriptor.engine.upstreamTagCommit}/src/lib/Lunar.ts`,
    `https://github.com/6tail/lunar-typescript/blob/${descriptor.engine.upstreamTagCommit}/src/lib/XiaoYun.ts`,
    `npm:${descriptor.engine.upstreamName}@${descriptor.engine.upstreamVersion}#integrity=${descriptor.engine.upstreamIntegrity}`,
    `https://data.iana.org/time-zones/releases/tzdata${descriptor.timeZoneDatabase.ianaVersion}.tar.gz`
  ];
}

async function assertTransitResultSelfConsistency(
  raw: unknown,
  descriptor: TransitSnapshotExecutorDescriptor,
  projection: RevisionDerivedReplayProjection
): Promise<void> {
  const result = transitSnapshotSchema.parse(raw);
  if (
    result.timelineVersion !== descriptor.timelineVersion ||
    result.manifest.algorithmId !== descriptor.algorithmId ||
    result.manifest.engineName !== descriptor.engine.name ||
    result.manifest.engineVersion !== descriptor.engine.version ||
    result.manifest.upstreamName !== descriptor.engine.upstreamName ||
    result.manifest.upstreamVersion !== descriptor.engine.upstreamVersion ||
    canonicalStringify(result.manifest.sourceRefs) !==
      canonicalStringify(expectedStoredTransitSourceRefs(descriptor)) ||
    result.tzdbVersion !== descriptor.timeZoneDatabase.snapshotId ||
    canonicalStringify(result.timeZoneDatabase) !== canonicalStringify(descriptor.timeZoneDatabase) ||
    result.revisionId !== projection.sourceRevisionId ||
    result.revisionResultHash !== projection.sourceNatalResultHash ||
    result.target.instant !== projection.request.atInstant ||
    result.manualDirection !== projection.request.manualDirection
  ) {
    throw new Error("Transit 输出与其存储描述符、请求或源 Revision 不一致");
  }
  const { resultHash, ...withoutResultHash } = result;
  if (await sha256Hex(withoutResultHash) !== resultHash) {
    throw new Error("Transit resultHash 后置复算不一致");
  }
}

/**
 * Verifies a stored projection as self-contained content. This layer checks
 * exact JSON structure, every embedded digest, and descriptor/output
 * consistency, but deliberately does not require any historical executor to
 * remain installed.
 */
export async function verifyStoredRevisionDerivedReplayProjectionIntegrity(
  rawProjection: unknown
): Promise<RevisionDerivedReplayProjection> {
  const projection = cloneForReplay(rawProjection, "派生投影") as unknown;
  try {
    assertExactContainerKeys(
      projection,
      [
        "schemaVersion", "kind", "claim", "storedHistoricalOutputCompared", "status",
        "sourceRevisionId", "sourceRevisionSnapshotDigest", "sourceNatalReplayDigest",
        "sourceNatalResultHash", "profile", "request", "relations", "luckCycle",
        "transit", "projectionDigest"
      ],
      [],
      "派生投影"
    );
    if (
      projection.schemaVersion !== REVISION_DERIVED_REPLAY_SCHEMA_VERSION ||
      projection.kind !== "revision_explicit_executor_derivation" ||
      projection.claim !== "explicit_version_projection_not_stored_historical_output_comparison" ||
      projection.storedHistoricalOutputCompared !== false ||
      (projection.status !== "complete" && projection.status !== "partial")
    ) {
      throw new Error("identity mismatch");
    }
    validateReplayProfile(projection.profile);
    assertStoredProfileStructure(projection.profile);
    assertExactContainerKeys(projection.request, ["atInstant", "manualDirection"], [], "派生投影请求");
    if (
      (projection.request.atInstant !== null && typeof projection.request.atInstant !== "string") ||
      (projection.request.manualDirection !== null &&
        projection.request.manualDirection !== "forward" &&
        projection.request.manualDirection !== "backward")
    ) {
      throw new Error("projection request mismatch");
    }
    parseReplayRequest({
      profile: projection.profile,
      ...(projection.request.atInstant ? { atInstant: projection.request.atInstant } : {}),
      ...(projection.request.manualDirection ? { manualDirection: projection.request.manualDirection } : {})
    });
    const sha256Pattern = /^[a-f0-9]{64}$/;
    if (
      typeof projection.sourceRevisionId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projection.sourceRevisionId) ||
      typeof projection.sourceRevisionSnapshotDigest !== "string" ||
      !sha256Pattern.test(projection.sourceRevisionSnapshotDigest) ||
      typeof projection.sourceNatalReplayDigest !== "string" ||
      !sha256Pattern.test(projection.sourceNatalReplayDigest) ||
      typeof projection.sourceNatalResultHash !== "string" ||
      !sha256Pattern.test(projection.sourceNatalResultHash) ||
      typeof projection.projectionDigest !== "string" ||
      !sha256Pattern.test(projection.projectionDigest)
    ) {
      throw new Error("projection source identity mismatch");
    }
    assertProjectionComponentShape(projection.relations, false);
    assertProjectionComponentShape(projection.luckCycle, false);
    assertProjectionComponentShape(projection.transit, true);
    for (const component of [projection.relations, projection.luckCycle, projection.transit]) {
      if (isRecord(component) && component.status === "projected") {
        const actualDigest = await sha256Hex(component.result);
        if (actualDigest !== component.resultDigest) throw new Error("component digest mismatch");
      }
    }
    const typed = projection as unknown as RevisionDerivedReplayProjection;
    if (typed.relations.status === "projected") {
      assertRelationsResultStructure(
        typed.relations.result,
        typed.profile.relations.descriptor,
        typed.profile.relations.ruleProfile
      );
    }
    if (typed.luckCycle.status === "projected") {
      assertLuckResultStructure(
        typed.luckCycle.result,
        typed.profile.luckCycle.descriptor,
        typed.request.manualDirection
      );
    }
    if (typed.transit.status === "projected") {
      await assertTransitResultSelfConsistency(typed.transit.result, typed.profile.transit.descriptor, typed);
    } else if (typed.transit.status === "not_requested" && typed.request.atInstant !== null) {
      throw new Error("Transit not_requested status conflicts with an explicit target instant");
    }
    const { projectionDigest, ...withoutDigest } = typed;
    const actualProjectionDigest = await sha256Hex(
      buildRevisionDerivedReplayProjectionDigestPayload(withoutDigest)
    );
    if (actualProjectionDigest !== projectionDigest) throw new Error("projection digest mismatch");
    const expectedStatus = typed.relations.status === "projected" &&
      typed.luckCycle.status === "projected" &&
      (typed.transit.status === "projected" || typed.transit.status === "not_requested")
      ? "complete"
      : "partial";
    if (typed.status !== expectedStatus) throw new Error("projection status mismatch");
    return typed;
  } catch (cause) {
    if (cause instanceof RevisionDerivedReplayError && cause.code === "PROJECTION_INTEGRITY_MISMATCH") {
      throw cause;
    }
    throw new RevisionDerivedReplayError(
      "PROJECTION_INTEGRITY_MISMATCH",
      "派生投影的组件摘要、聚合摘要或结构不一致。",
      { cause }
    );
  }
}

/**
 * Strong projection verification. In addition to stored-content integrity it
 * requires exact registry identities and recomputes every executor output that
 * can be reproduced without the source Revision. No current-version fallback
 * is permitted.
 */
export async function verifyRevisionDerivedReplayProjectionIntegrity(
  rawProjection: unknown
): Promise<RevisionDerivedReplayProjection> {
  const projection = await verifyStoredRevisionDerivedReplayProjectionIntegrity(rawProjection);
  try {
    if (projection.relations.status === "projected") {
      const executor = lookupHistoricalRelationsExecutor(projection.profile.relations.descriptor);
      if (!executor || executor.executorId !== projection.relations.executorId) {
        throw new Error("relations executor binding mismatch");
      }
      const replayedDigest = await sha256Hex(executor.calculatePillarRelations(
        projection.relations.result.pillars,
        projection.relations.result.ruleProfile
      ));
      if (replayedDigest !== projection.relations.resultDigest) {
        throw new Error("relations executor result mismatch");
      }
    }
    if (projection.luckCycle.status === "projected") {
      const executor = lookupHistoricalLuckCycleExecutor(projection.profile.luckCycle.descriptor);
      if (!executor || executor.executorId !== projection.luckCycle.executorId) {
        throw new Error("luck executor binding mismatch");
      }
      const replayedDigest = await sha256Hex(executor.replay(
        projection.luckCycle.result.input,
        projection.luckCycle.result.rule
      ));
      if (replayedDigest !== projection.luckCycle.resultDigest) {
        throw new Error("luck executor result mismatch");
      }
    }
    if (projection.transit.status === "projected") {
      const executor = lookupHistoricalTransitSnapshotExecutor(projection.profile.transit.descriptor);
      if (!executor || executor.executorId !== projection.transit.executorId) {
        throw new Error("transit executor binding mismatch");
      }
    }
    return projection;
  } catch (cause) {
    throw new RevisionDerivedReplayError(
      "PROJECTION_INTEGRITY_MISMATCH",
      "派生投影无法由其精确历史执行器验证。",
      { cause }
    );
  }
}

/**
 * Strong provenance verification: replays the exact source Revision and exact
 * selected executors, then compares the deterministic aggregate projection.
 */
export async function verifyRevisionDerivedReplayProjectionAgainstRevision(
  rawProjection: unknown,
  rawRevision: unknown
): Promise<RevisionDerivedReplayProjection> {
  const projection = await verifyRevisionDerivedReplayProjectionIntegrity(rawProjection);
  const replayed = await replayRevisionDerivedProjection(rawRevision, {
    profile: projection.profile,
    ...(projection.request.atInstant ? { atInstant: projection.request.atInstant } : {}),
    ...(projection.request.manualDirection ? { manualDirection: projection.request.manualDirection } : {})
  });
  if (replayed.projectionDigest !== projection.projectionDigest) {
    throw new RevisionDerivedReplayError(
      "PROJECTION_INTEGRITY_MISMATCH",
      "派生投影不能由其源 Revision 与精确执行器重新生成。"
    );
  }
  return projection;
}

export const REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION =
  CONTRACT_REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION;

export type RevisionCalculationReceiptCaptureKind =
  ContractRevisionCalculationReceiptCaptureKind;

export type RevisionCalculationReceipt = Readonly<Omit<
  RevisionCalculationReceiptRecord,
  "projection"
> & {
  projection: RevisionDerivedReplayProjection;
}>;

export type RevisionCalculationReceiptIdentity = Readonly<{
  id: string;
  createdAt: string;
  captureKind: RevisionCalculationReceiptCaptureKind;
}>;

export type RevisionCalculationReceiptChangedComponent =
  | "relations"
  | "luckCycle"
  | "transit";

export type RevisionCalculationReceiptComponentComparisonStatus =
  | "matched"
  | "mismatch"
  | "exact_executor_unavailable";

export type RevisionCalculationReceiptComponentComparison<
  Name extends RevisionCalculationReceiptChangedComponent = RevisionCalculationReceiptChangedComponent
> = Readonly<{
  storedStatus: RevisionDerivedReplayProjection[Name]["status"];
  replayedStatus: RevisionDerivedReplayProjection[Name]["status"];
  comparisonStatus: RevisionCalculationReceiptComponentComparisonStatus;
}>;

export type RevisionCalculationReceiptComponentComparisons = Readonly<{
  [Name in RevisionCalculationReceiptChangedComponent]:
    RevisionCalculationReceiptComponentComparison<Name>;
}>;

export type RevisionCalculationReceiptComparison = Readonly<{
  status: "matched" | "mismatch" | "exact_executor_unavailable";
  storedHistoricalOutputCompared: true;
  receipt: RevisionCalculationReceipt;
  replayedProjection: RevisionDerivedReplayProjection;
  changedComponents: readonly RevisionCalculationReceiptChangedComponent[];
  componentStatuses: RevisionCalculationReceiptComponentComparisons;
}>;

export type RevisionCalculationReceiptErrorCode =
  | "INVALID_RECEIPT_IDENTITY"
  | "RECEIPT_INTEGRITY_MISMATCH"
  | "RECEIPT_SOURCE_MISMATCH";

export class RevisionCalculationReceiptError extends Error {
  constructor(
    readonly code: RevisionCalculationReceiptErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "RevisionCalculationReceiptError";
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function isCanonicalIsoInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function parseReceiptIdentity(rawIdentity: unknown): RevisionCalculationReceiptIdentity {
  try {
    const identity = cloneForReplay(rawIdentity, "计算收据身份") as unknown;
    assertExactContainerKeys(identity, ["id", "createdAt", "captureKind"], [], "计算收据身份");
    if (
      typeof identity.id !== "string" ||
      !UUID_PATTERN.test(identity.id) ||
      !isCanonicalIsoInstant(identity.createdAt) ||
      (identity.captureKind !== "revision_creation_baseline" &&
        identity.captureKind !== "explicit_calculation_snapshot")
    ) {
      throw new Error("invalid receipt identity");
    }
    return identity as RevisionCalculationReceiptIdentity;
  } catch (cause) {
    throw new RevisionCalculationReceiptError(
      "INVALID_RECEIPT_IDENTITY",
      "计算收据必须使用规范 UUID、ISO 瞬时点和已知捕获类型。",
      { cause }
    );
  }
}

function assertCaptureKindMatchesRequest(
  captureKind: RevisionCalculationReceiptCaptureKind,
  request: RevisionDerivedReplayProjection["request"]
): void {
  if (
    captureKind === "revision_creation_baseline" &&
    (request.atInstant !== null || request.manualDirection !== null)
  ) {
    throw new RevisionCalculationReceiptError(
      "RECEIPT_INTEGRITY_MISMATCH",
      "Revision 创建基线不得伪装成带目标瞬时点或人工顺逆的显式计算。"
    );
  }
  if (
    captureKind === "explicit_calculation_snapshot" &&
    request.atInstant === null &&
    request.manualDirection === null
  ) {
    throw new RevisionCalculationReceiptError(
      "RECEIPT_INTEGRITY_MISMATCH",
      "显式计算快照必须记录目标瞬时点或人工顺逆。"
    );
  }
}

export type RevisionCalculationRequestFingerprintInput = Readonly<{
  captureKind: RevisionCalculationReceiptCaptureKind;
  sourceRevision: RevisionCalculationReceipt["sourceRevision"];
  profile: RevisionDerivedReplayProfile;
  request: RevisionDerivedReplayProjection["request"];
}>;

type LegacyRevisionCalculationRequestFingerprintInput = Pick<
  RevisionCalculationReceipt,
  "captureKind" | "sourceRevision" | "projection"
>;

export function buildRevisionCalculationRequestFingerprintPayload(
  input: RevisionCalculationRequestFingerprintInput | LegacyRevisionCalculationRequestFingerprintInput
) {
  const profile = "projection" in input ? input.projection.profile : input.profile;
  const request = "projection" in input ? input.projection.request : input.request;
  return {
    schemaVersion: REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION,
    kind: "revision_calculation_request" as const,
    captureKind: input.captureKind,
    sourceRevision: input.sourceRevision,
    profile,
    request
  };
}

export async function calculateRevisionCalculationRequestFingerprint(
  input: RevisionCalculationRequestFingerprintInput | LegacyRevisionCalculationRequestFingerprintInput
): Promise<string> {
  return sha256Hex(buildRevisionCalculationRequestFingerprintPayload(input));
}

export function buildRevisionCalculationReceiptDigestPayload(
  receipt: Omit<RevisionCalculationReceipt, "receiptDigest">
) {
  return receipt;
}

/**
 * Captures one append-only downstream calculation result. The receipt does not
 * mutate or extend the frozen natal Revision. A creation baseline has no
 * Transit target; later explicit calculations may append independent receipts.
 */
export async function createRevisionCalculationReceipt(
  rawRevision: unknown,
  rawRequest: unknown,
  rawIdentity: unknown
): Promise<RevisionCalculationReceipt> {
  const identity = parseReceiptIdentity(rawIdentity);
  const revision = cloneForReplay(
    await verifyRevisionRecordIntegrity(rawRevision),
    "源 Revision"
  );
  const projection = await replayRevisionDerivedProjection(revision, rawRequest);
  assertCaptureKindMatchesRequest(identity.captureKind, projection.request);
  const sourceRevision = deepFreeze({
    caseId: revision.caseId,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    snapshotDigest: projection.sourceRevisionSnapshotDigest,
    natalResultHash: projection.sourceNatalResultHash
  });
  const withoutFingerprints = {
    schemaVersion: REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION,
    recordType: "revision_calculation_receipt" as const,
    id: identity.id,
    createdAt: identity.createdAt,
    captureKind: identity.captureKind,
    sourceRevision,
    projection
  };
  const requestFingerprint = await calculateRevisionCalculationRequestFingerprint({
    captureKind: identity.captureKind,
    sourceRevision,
    projection
  });
  const withoutDigest = deepFreeze({ ...withoutFingerprints, requestFingerprint });
  return deepFreeze({
    ...withoutDigest,
    receiptDigest: await sha256Hex(buildRevisionCalculationReceiptDigestPayload(withoutDigest))
  });
}

/**
 * Verifies the frozen record and all nested result digests without requiring a
 * source Revision lookup. This answers whether the stored receipt is internally
 * intact; replay comparison is a separate operation below.
 */
export async function verifyRevisionCalculationReceiptIntegrity(
  rawReceipt: unknown
): Promise<RevisionCalculationReceipt> {
  let receipt: Record<string, unknown>;
  try {
    receipt = cloneForReplay(rawReceipt, "计算收据") as unknown as Record<string, unknown>;
    assertExactContainerKeys(
      receipt,
      [
        "schemaVersion", "recordType", "id", "createdAt", "captureKind",
        "requestFingerprint", "sourceRevision", "projection", "receiptDigest"
      ],
      [],
      "计算收据"
    );
    if (
      receipt.schemaVersion !== REVISION_CALCULATION_RECEIPT_SCHEMA_VERSION ||
      receipt.recordType !== "revision_calculation_receipt" ||
      typeof receipt.id !== "string" ||
      !UUID_PATTERN.test(receipt.id) ||
      !isCanonicalIsoInstant(receipt.createdAt) ||
      (receipt.captureKind !== "revision_creation_baseline" &&
        receipt.captureKind !== "explicit_calculation_snapshot") ||
      typeof receipt.requestFingerprint !== "string" ||
      !SHA256_PATTERN.test(receipt.requestFingerprint) ||
      typeof receipt.receiptDigest !== "string" ||
      !SHA256_PATTERN.test(receipt.receiptDigest)
    ) {
      throw new Error("receipt identity mismatch");
    }
    assertExactContainerKeys(
      receipt.sourceRevision,
      ["caseId", "revisionId", "revisionNumber", "snapshotDigest", "natalResultHash"],
      [],
      "计算收据源 Revision"
    );
    const source = receipt.sourceRevision;
    if (
      typeof source.caseId !== "string" ||
      !UUID_PATTERN.test(source.caseId) ||
      typeof source.revisionId !== "string" ||
      !UUID_PATTERN.test(source.revisionId) ||
      typeof source.revisionNumber !== "number" ||
      !Number.isSafeInteger(source.revisionNumber) ||
      source.revisionNumber < 1 ||
      typeof source.snapshotDigest !== "string" ||
      !SHA256_PATTERN.test(source.snapshotDigest) ||
      typeof source.natalResultHash !== "string" ||
      !SHA256_PATTERN.test(source.natalResultHash)
    ) {
      throw new Error("receipt source mismatch");
    }
    const projection = await verifyStoredRevisionDerivedReplayProjectionIntegrity(receipt.projection);
    if (
      projection.sourceRevisionId !== source.revisionId ||
      projection.sourceRevisionSnapshotDigest !== source.snapshotDigest ||
      projection.sourceNatalResultHash !== source.natalResultHash
    ) {
      throw new Error("receipt projection source mismatch");
    }
    assertCaptureKindMatchesRequest(
      receipt.captureKind as RevisionCalculationReceiptCaptureKind,
      projection.request
    );
    const typed = deepFreeze({ ...receipt, projection }) as unknown as RevisionCalculationReceipt;
    const actualFingerprint = await sha256Hex(buildRevisionCalculationRequestFingerprintPayload(typed));
    if (actualFingerprint !== typed.requestFingerprint) throw new Error("request fingerprint mismatch");
    const { receiptDigest, ...withoutDigest } = typed;
    const actualReceiptDigest = await sha256Hex(buildRevisionCalculationReceiptDigestPayload(withoutDigest));
    if (actualReceiptDigest !== receiptDigest) throw new Error("receipt digest mismatch");
    return typed;
  } catch (cause) {
    if (cause instanceof RevisionCalculationReceiptError && cause.code === "RECEIPT_INTEGRITY_MISMATCH") {
      throw cause;
    }
    throw new RevisionCalculationReceiptError(
      "RECEIPT_INTEGRITY_MISMATCH",
      "计算收据的结构、来源绑定、请求指纹或摘要不一致。",
      { cause }
    );
  }
}

/**
 * Verifies stored receipt content and its immutable source-Revision binding
 * without requiring any historical downstream executor to remain available.
 */
export async function verifyRevisionCalculationReceiptSourceBinding(
  rawReceipt: unknown,
  rawRevision: unknown
): Promise<RevisionCalculationReceipt> {
  const [receipt, sourceSnapshot] = await Promise.all([
    verifyRevisionCalculationReceiptIntegrity(rawReceipt),
    verifyRevisionSnapshotIntegrity(rawRevision)
  ]);
  const { revision, revisionSnapshotDigest } = sourceSnapshot;
  if (
    receipt.sourceRevision.revisionId !== revision.id ||
    receipt.sourceRevision.caseId !== revision.caseId ||
    receipt.sourceRevision.revisionNumber !== revision.revisionNumber ||
    receipt.sourceRevision.natalResultHash !== revision.manifest.resultHash ||
    receipt.sourceRevision.snapshotDigest !== revisionSnapshotDigest ||
    (receipt.captureKind === "revision_creation_baseline" && receipt.createdAt !== revision.createdAt)
  ) {
    throw new RevisionCalculationReceiptError(
      "RECEIPT_SOURCE_MISMATCH",
      `计算收据 ${receipt.id} 与源 Revision ${revision.id} 的冻结身份不一致。`
    );
  }
  return receipt;
}

const REVISION_CALCULATION_COMPONENT_NAMES = ["relations", "luckCycle", "transit"] as const;

function componentHasUnavailableExactExecutor(
  component: RevisionDerivedReplayProjection[RevisionCalculationReceiptChangedComponent]
): boolean {
  return component.status === "unavailable" && component.code === "executor_unavailable";
}

async function compareReceiptComponents(
  stored: RevisionDerivedReplayProjection,
  replayed: RevisionDerivedReplayProjection
): Promise<RevisionCalculationReceiptComponentComparisons> {
  const entries = await Promise.all(REVISION_CALCULATION_COMPONENT_NAMES.map(async (name) => {
    const changed = await sha256Hex(componentDigestSource(stored[name])) !==
      await sha256Hex(componentDigestSource(replayed[name]));
    const comparisonStatus: RevisionCalculationReceiptComponentComparisonStatus = !changed
      ? "matched"
      : componentHasUnavailableExactExecutor(replayed[name])
        ? "exact_executor_unavailable"
        : "mismatch";
    return [name, deepFreeze({
      storedStatus: stored[name].status,
      replayedStatus: replayed[name].status,
      comparisonStatus
    })] as const;
  }));
  return deepFreeze(Object.fromEntries(entries)) as RevisionCalculationReceiptComponentComparisons;
}

function projectionComparisonMetadata(projection: RevisionDerivedReplayProjection) {
  return {
    schemaVersion: projection.schemaVersion,
    kind: projection.kind,
    claim: projection.claim,
    storedHistoricalOutputCompared: projection.storedHistoricalOutputCompared,
    sourceRevisionId: projection.sourceRevisionId,
    sourceRevisionSnapshotDigest: projection.sourceRevisionSnapshotDigest,
    sourceNatalReplayDigest: projection.sourceNatalReplayDigest,
    sourceNatalResultHash: projection.sourceNatalResultHash,
    profile: projection.profile,
    request: projection.request
  };
}

/**
 * Replays the exact stored profile/request against the exact source Revision
 * and compares it with the historical output captured by the receipt.
 */
export async function compareRevisionCalculationReceiptAgainstRevision(
  rawReceipt: unknown,
  rawRevision: unknown
): Promise<RevisionCalculationReceiptComparison> {
  const receipt = await verifyRevisionCalculationReceiptSourceBinding(rawReceipt, rawRevision);
  const revision = cloneForReplay(
    await verifyRevisionRecordIntegrity(rawRevision),
    "源 Revision"
  );
  const replayedProjection = await replayRevisionDerivedProjection(revision, {
    profile: receipt.projection.profile,
    ...(receipt.projection.request.atInstant
      ? { atInstant: receipt.projection.request.atInstant }
      : {}),
    ...(receipt.projection.request.manualDirection
      ? { manualDirection: receipt.projection.request.manualDirection }
      : {})
  });
  if (replayedProjection.sourceRevisionSnapshotDigest !== receipt.sourceRevision.snapshotDigest) {
    throw new RevisionCalculationReceiptError(
      "RECEIPT_SOURCE_MISMATCH",
      "给定 Revision 的冻结快照摘要与计算收据不一致。"
    );
  }
  const componentStatuses = await compareReceiptComponents(receipt.projection, replayedProjection);
  const changedComponents = REVISION_CALCULATION_COMPONENT_NAMES.filter(
    (name) => componentStatuses[name].comparisonStatus !== "matched"
  );
  const metadataMatches = await sha256Hex(projectionComparisonMetadata(receipt.projection)) ===
    await sha256Hex(projectionComparisonMetadata(replayedProjection));
  const hasReplayableMismatch = !metadataMatches || REVISION_CALCULATION_COMPONENT_NAMES.some(
    (name) => componentStatuses[name].comparisonStatus === "mismatch"
  );
  const hasUnavailableExactExecutor = REVISION_CALCULATION_COMPONENT_NAMES.some(
    (name) => componentStatuses[name].comparisonStatus === "exact_executor_unavailable"
  );
  const status = replayedProjection.projectionDigest === receipt.projection.projectionDigest
    ? "matched" as const
    : hasReplayableMismatch
      ? "mismatch" as const
      : hasUnavailableExactExecutor
        ? "exact_executor_unavailable" as const
        : "mismatch" as const;
  return deepFreeze({
    status,
    storedHistoricalOutputCompared: true as const,
    receipt,
    replayedProjection,
    changedComponents,
    componentStatuses
  });
}

export const REVISION_CALCULATION_SOURCE_RESOLUTION_SCHEMA_VERSION = "1.0.0" as const;

export type RevisionCalculationSourceComponentComparisonStatus =
  | RevisionCalculationReceiptComponentComparisonStatus
  | "not_applicable";

export type RevisionCalculationSourceComponentStatus<
  Name extends RevisionCalculationReceiptChangedComponent
> = Readonly<{
  projectionStatus: RevisionDerivedReplayProjection[Name]["status"];
  replayedStatus: RevisionDerivedReplayProjection[Name]["status"] | null;
  comparisonStatus: RevisionCalculationSourceComponentComparisonStatus;
}>;

export type RevisionCalculationSourceComponentStatuses = Readonly<{
  relations: RevisionCalculationSourceComponentStatus<"relations">;
  luckCycle: RevisionCalculationSourceComponentStatus<"luckCycle">;
  transit: RevisionCalculationSourceComponentStatus<"transit">;
}>;

type RevisionCalculationSourceResolutionBase = Readonly<{
  schemaVersion: typeof REVISION_CALCULATION_SOURCE_RESOLUTION_SCHEMA_VERSION;
  captureKind: RevisionCalculationReceiptCaptureKind;
  requestFingerprint: string;
  profileId: string;
  projection: RevisionDerivedReplayProjection;
  componentStatuses: RevisionCalculationSourceComponentStatuses;
}>;

export type ExplicitProjectionCalculationSourceResolution =
  RevisionCalculationSourceResolutionBase & Readonly<{
    source: "explicit_projection";
    storedHistoricalOutputCompared: false;
    comparisonStatus: "not_applicable";
    receipt: null;
    replayedProjection: null;
    changedComponents: readonly [];
  }>;

export type StoredReceiptCalculationSourceResolution =
  RevisionCalculationSourceResolutionBase & Readonly<{
    source: "stored_receipt";
    storedHistoricalOutputCompared: true;
    comparisonStatus: RevisionCalculationReceiptComparison["status"];
    receipt: RevisionCalculationReceipt;
    replayedProjection: RevisionDerivedReplayProjection;
    changedComponents: readonly RevisionCalculationReceiptChangedComponent[];
  }>;

export type RevisionCalculationSourceResolution =
  | ExplicitProjectionCalculationSourceResolution
  | StoredReceiptCalculationSourceResolution;

export type RevisionCalculationSourceResolutionErrorCode =
  | "INVALID_RECEIPT_COLLECTION"
  | "DUPLICATE_RECEIPT_ID"
  | "DUPLICATE_REQUEST_FINGERPRINT"
  | "MULTIPLE_EXACT_RECEIPTS"
  | "SOURCE_REVISION_MISMATCH";

export class RevisionCalculationSourceResolutionError extends Error {
  constructor(
    readonly code: RevisionCalculationSourceResolutionErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "RevisionCalculationSourceResolutionError";
  }
}

function inferRevisionCalculationReceiptCaptureKind(
  request: RevisionDerivedReplayProjection["request"]
): RevisionCalculationReceiptCaptureKind {
  return request.atInstant === null && request.manualDirection === null
    ? "revision_creation_baseline"
    : "explicit_calculation_snapshot";
}

function explicitProjectionComponentStatuses(
  projection: RevisionDerivedReplayProjection
): RevisionCalculationSourceComponentStatuses {
  return deepFreeze({
    relations: {
      projectionStatus: projection.relations.status,
      replayedStatus: null,
      comparisonStatus: "not_applicable" as const
    },
    luckCycle: {
      projectionStatus: projection.luckCycle.status,
      replayedStatus: null,
      comparisonStatus: "not_applicable" as const
    },
    transit: {
      projectionStatus: projection.transit.status,
      replayedStatus: null,
      comparisonStatus: "not_applicable" as const
    }
  });
}

function storedReceiptComponentStatuses(
  comparison: RevisionCalculationReceiptComparison
): RevisionCalculationSourceComponentStatuses {
  return deepFreeze({
    relations: {
      projectionStatus: comparison.componentStatuses.relations.storedStatus,
      replayedStatus: comparison.componentStatuses.relations.replayedStatus,
      comparisonStatus: comparison.componentStatuses.relations.comparisonStatus
    },
    luckCycle: {
      projectionStatus: comparison.componentStatuses.luckCycle.storedStatus,
      replayedStatus: comparison.componentStatuses.luckCycle.replayedStatus,
      comparisonStatus: comparison.componentStatuses.luckCycle.comparisonStatus
    },
    transit: {
      projectionStatus: comparison.componentStatuses.transit.storedStatus,
      replayedStatus: comparison.componentStatuses.transit.replayedStatus,
      comparisonStatus: comparison.componentStatuses.transit.comparisonStatus
    }
  });
}

function assertUniqueReceiptIds(receipts: readonly RevisionCalculationReceipt[]): void {
  const ids = new Set<string>();
  for (const receipt of receipts) {
    if (ids.has(receipt.id)) {
      throw new RevisionCalculationSourceResolutionError(
        "DUPLICATE_RECEIPT_ID",
        `候选计算收据集合包含重复 ID：${receipt.id}。`
      );
    }
    ids.add(receipt.id);
  }
}

function assertUniqueRequestFingerprints(receipts: readonly RevisionCalculationReceipt[]): void {
  const fingerprints = new Set<string>();
  for (const receipt of receipts) {
    if (fingerprints.has(receipt.requestFingerprint)) {
      throw new RevisionCalculationSourceResolutionError(
        "DUPLICATE_REQUEST_FINGERPRINT",
        `候选计算收据集合包含重复请求指纹：${receipt.requestFingerprint}。`
      );
    }
    fingerprints.add(receipt.requestFingerprint);
  }
}

/**
 * Resolves the exact downstream calculation source for one explicit replay
 * request. Every supplied ledger receipt is deeply verified and source-bound;
 * invalid or ambiguous collections fail closed. A stored receipt is selected
 * only by the complete source/profile/request fingerprint, never by position,
 * capture kind alone, or projection digest. Stored mismatches are returned as
 * stored evidence and are never silently replaced by the fresh projection.
 */
export async function resolveRevisionCalculationSource(
  rawRevision: unknown,
  rawReceipts: unknown,
  rawRequest: unknown
): Promise<RevisionCalculationSourceResolution> {
  const explicitProjection = await replayRevisionDerivedProjection(rawRevision, rawRequest);
  if (!Array.isArray(rawReceipts)) {
    throw new RevisionCalculationSourceResolutionError(
      "INVALID_RECEIPT_COLLECTION",
      "候选计算收据必须是来自同一原子读取快照的数组。"
    );
  }

  const { revision, revisionSnapshotDigest } = await verifyRevisionSnapshotIntegrity(rawRevision);
  if (
    explicitProjection.sourceRevisionId !== revision.id ||
    explicitProjection.sourceRevisionSnapshotDigest !== revisionSnapshotDigest ||
    explicitProjection.sourceNatalResultHash !== revision.manifest.resultHash
  ) {
    throw new RevisionCalculationSourceResolutionError(
      "SOURCE_REVISION_MISMATCH",
      "显式投影与给定 Revision 的冻结身份不一致。"
    );
  }

  const receipts = await Promise.all(rawReceipts.map(
    (receipt) => verifyRevisionCalculationReceiptSourceBinding(receipt, revision)
  ));
  assertUniqueReceiptIds(receipts);

  const captureKind = inferRevisionCalculationReceiptCaptureKind(explicitProjection.request);
  const sourceRevision: RevisionCalculationReceipt["sourceRevision"] = deepFreeze({
    caseId: revision.caseId,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    snapshotDigest: revisionSnapshotDigest,
    natalResultHash: revision.manifest.resultHash
  });
  const requestFingerprint = await calculateRevisionCalculationRequestFingerprint({
    captureKind,
    sourceRevision,
    profile: explicitProjection.profile,
    request: explicitProjection.request
  });
  const exactReceipts = receipts.filter(
    (receipt) => receipt.requestFingerprint === requestFingerprint
  );
  if (exactReceipts.length > 1) {
    throw new RevisionCalculationSourceResolutionError(
      "MULTIPLE_EXACT_RECEIPTS",
      `同一 Revision、Profile 与规范请求命中了 ${exactReceipts.length} 条计算收据；来源不唯一。`
    );
  }
  assertUniqueRequestFingerprints(receipts);

  const exactReceipt = exactReceipts[0];
  if (!exactReceipt) {
    return deepFreeze({
      schemaVersion: REVISION_CALCULATION_SOURCE_RESOLUTION_SCHEMA_VERSION,
      source: "explicit_projection" as const,
      captureKind,
      requestFingerprint,
      profileId: explicitProjection.profile.profileId,
      storedHistoricalOutputCompared: false as const,
      comparisonStatus: "not_applicable" as const,
      projection: explicitProjection,
      receipt: null,
      replayedProjection: null,
      changedComponents: [] as const,
      componentStatuses: explicitProjectionComponentStatuses(explicitProjection)
    });
  }

  const comparison = await compareRevisionCalculationReceiptAgainstRevision(exactReceipt, revision);
  return deepFreeze({
    schemaVersion: REVISION_CALCULATION_SOURCE_RESOLUTION_SCHEMA_VERSION,
    source: "stored_receipt" as const,
    captureKind,
    requestFingerprint,
    profileId: comparison.receipt.projection.profile.profileId,
    storedHistoricalOutputCompared: true as const,
    comparisonStatus: comparison.status,
    projection: comparison.receipt.projection,
    receipt: comparison.receipt,
    replayedProjection: comparison.replayedProjection,
    changedComponents: comparison.changedComponents,
    componentStatuses: storedReceiptComponentStatuses(comparison)
  });
}
