import {
  HASH_SCHEMA_VERSION,
  buildCalculatedChartHashPayload,
  buildUnknownHourCandidateHashPayload,
  calculationManifestSchema,
  calculatedChartSchema,
  createCalculatedChartSchemaForTimeZoneName,
  createCandidateSetRecordSchemaForTimeZoneName,
  createRevisionRecordSchemaForTimeZoneName,
  createUnknownHourCandidateResultSchemaForTimeZoneName,
  storedCalculatedChartSchema,
  storedCandidateSetRecordSchema,
  storedRevisionRecordSchema,
  storedUnknownHourCandidateResultSchema,
  type CalculatedChart,
  type CalculationManifest,
  type CandidateSetRecord,
  type RevisionRecord,
  type TimeZoneNamePredicate,
  type UnknownHourCandidateResult
} from "@hakimi/contracts";
import {
  inspectRuleProfileCompatibility,
  lookupHistoricalNatalChartExecutor
} from "@hakimi/bazi-core";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  classifyStoredTimeZoneDatabaseForReplay,
  loadBundledTimeZoneCalculationContext,
  type BundledTimeZoneCalculationContext
} from "@hakimi/time-core";

const MAX_REVISION_INPUT_NODES = 100_000;
const MAX_REVISION_INPUT_TEXT_CHARACTERS = 4_000_000;
const MAX_REVISION_INPUT_DEPTH = 128;

type RevisionInputBudget = {
  nodes: number;
  textCharacters: number;
};

function claimRevisionInputText(budget: RevisionInputBudget, length: number): void {
  budget.textCharacters += length;
  if (budget.textCharacters > MAX_REVISION_INPUT_TEXT_CHARACTERS) {
    throw new TypeError("Revision 声明式输入文本总量超过安全上限。");
  }
}

function countOwnEnumerableProperties(
  value: object,
  maximum: number,
  overflowMessage: string,
  budget?: RevisionInputBudget
): number {
  let count = 0;
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    count += 1;
    if (count > maximum) throw new TypeError(overflowMessage);
    if (budget) claimRevisionInputText(budget, key.length);
  }
  return count;
}

/** Creates one bounded, accessor-free snapshot before any asynchronous resolver load. */
function snapshotRevisionInput(
  value: unknown,
  path = "Revision",
  depth = 0,
  ancestors = new WeakSet<object>(),
  budget: RevisionInputBudget = { nodes: 0, textCharacters: 0 }
): unknown {
  if (depth > MAX_REVISION_INPUT_DEPTH) {
    throw new TypeError(`Revision 声明式输入超过最大深度 ${MAX_REVISION_INPUT_DEPTH}。`);
  }
  budget.nodes += 1;
  if (budget.nodes > MAX_REVISION_INPUT_NODES) {
    throw new TypeError("Revision 声明式输入结构节点总量超过安全上限。");
  }
  if (typeof value === "string") {
    claimRevisionInputText(budget, value.length);
    return value;
  }
  if (value === null || typeof value === "boolean" || value === undefined) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} 包含非有限数字。`);
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${path} 包含非声明式 JSON 值：${typeof value}。`);
  }

  if (ancestors.has(value)) throw new TypeError(`${path} 包含循环引用。`);
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${path} 不能包含 Symbol 属性。`);
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (!lengthDescriptor || !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
        throw new TypeError(`${path}.length 不是声明式数组长度。`);
      }
      const length = lengthDescriptor.value as number;
      if (length > MAX_REVISION_INPUT_NODES - budget.nodes) {
        throw new TypeError("Revision 声明式输入数组槽位超过安全上限。");
      }
      const enumerablePropertyCount = countOwnEnumerableProperties(
        value,
        length,
        "Revision 声明式输入数组字段超过安全上限。"
      );
      if (enumerablePropertyCount !== length) {
        throw new TypeError(`${path} 必须是稠密且没有自定义字段的数组。`);
      }
      if (Object.getOwnPropertyNames(value).length !== length + 1) {
        throw new TypeError(`${path} 必须是稠密且没有自定义字段的数组。`);
      }
      const output = new Array<unknown>(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError(`${path}[${index}] 必须是可枚举的声明式数据项。`);
        }
        output[index] = snapshotRevisionInput(
          descriptor.value,
          `${path}[${index}]`,
          depth + 1,
          ancestors,
          budget
        );
      }
      return output;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} 必须是普通声明式对象。`);
    }
    const enumerablePropertyCount = countOwnEnumerableProperties(
      value,
      MAX_REVISION_INPUT_NODES - budget.nodes,
      "Revision 声明式输入对象字段超过安全上限。",
      budget
    );
    const propertyNames = Object.getOwnPropertyNames(value);
    if (propertyNames.length !== enumerablePropertyCount) {
      throw new TypeError(`${path} 必须仅包含可枚举的声明式数据字段。`);
    }
    const output: Record<string, unknown> = {};
    for (const key of propertyNames) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError(`${path}.${key} 必须是可枚举的声明式数据字段。`);
      }
      Object.defineProperty(output, key, {
        value: snapshotRevisionInput(
          descriptor.value,
          `${path}.${key}`,
          depth + 1,
          ancestors,
          budget
        ),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    ancestors.delete(value);
  }
}

function readRevisionManifest(snapshot: unknown): CalculationManifest {
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return calculationManifestSchema.parse(undefined);
  }
  const descriptor = Object.getOwnPropertyDescriptor(snapshot, "manifest");
  return calculationManifestSchema.parse(
    descriptor && "value" in descriptor ? descriptor.value : undefined
  );
}

export class CandidateSetIntegrityError extends Error {
  readonly code = "CANDIDATE_SET_INTEGRITY_MISMATCH" as const;

  constructor(
    readonly candidateSetId: string,
    readonly mismatch: "snapshot" | "rule_profile" | "result" = "snapshot"
  ) {
    const label = mismatch === "snapshot" ? "快照" : mismatch === "rule_profile" ? "规则配置" : "候选结果";
    super(`未知时辰候选组 ${candidateSetId} 的${label}摘要与内容不一致。`);
    this.name = "CandidateSetIntegrityError";
  }
}

export class CalculatedChartIntegrityError extends Error {
  readonly code = "CALCULATED_CHART_INTEGRITY_MISMATCH" as const;

  constructor(
    readonly chartId: string,
    readonly mismatch: "structure" | "rule_profile" | "luck_cycle_rule" | "result"
  ) {
    super(`命盘 ${chartId} 的 ${mismatch} 摘要或结构与内容不一致。`);
    this.name = "CalculatedChartIntegrityError";
  }
}

function assertChartStructure(chart: CalculatedChart, chartId: string): void {
  if (chart.input.timeZone !== chart.timeCalibration.timeZone) {
    throw new CalculatedChartIntegrityError(chartId, "structure");
  }
  const expected = {
    year: "年柱",
    month: "月柱",
    day: "日柱",
    hour: "时柱"
  } as const;
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    const pillar = chart.facts.pillars[key];
    if (pillar.name !== key || pillar.label !== expected[key] || pillar.ganZhi !== `${pillar.stem}${pillar.branch}`) {
      throw new CalculatedChartIntegrityError(chartId, "structure");
    }
  }
}

type CalculatedChartSchemaLike = {
  parse(raw: unknown): CalculatedChart;
};

async function verifyCalculatedChartIntegrityWithSchema(
  raw: unknown,
  chartId: string,
  schema: CalculatedChartSchemaLike
): Promise<CalculatedChart> {
  const chart = schema.parse(raw);
  assertChartStructure(chart, chartId);
  const [ruleProfileDigest, luckCycleRuleDigest, resultHash] = await Promise.all([
    sha256Hex(chart.ruleProfile),
    chart.luckCycleRuleSnapshot ? sha256Hex(chart.luckCycleRuleSnapshot) : Promise.resolve(undefined),
    sha256Hex(buildCalculatedChartHashPayload(chart))
  ]);
  if (ruleProfileDigest !== chart.manifest.ruleProfileDigest) {
    throw new CalculatedChartIntegrityError(chartId, "rule_profile");
  }
  if (
    (chart.luckCycleRuleSnapshot === undefined) !== (chart.manifest.luckCycleRuleDigest === undefined) ||
    luckCycleRuleDigest !== chart.manifest.luckCycleRuleDigest
  ) {
    throw new CalculatedChartIntegrityError(chartId, "luck_cycle_rule");
  }
  if (resultHash !== chart.manifest.resultHash) {
    throw new CalculatedChartIntegrityError(chartId, "result");
  }
  return chart;
}

export async function verifyCalculatedChartIntegrity(
  raw: unknown,
  chartId = "unsaved-chart"
): Promise<CalculatedChart> {
  return verifyCalculatedChartIntegrityWithSchema(raw, chartId, calculatedChartSchema);
}

type VerifiedRevisionRecordContext = {
  revision: RevisionRecord;
  timeZoneContext: BundledTimeZoneCalculationContext | null;
};

async function verifyRevisionRecordIntegrityWithContext(
  raw: unknown
): Promise<VerifiedRevisionRecordContext> {
  const snapshot = snapshotRevisionInput(raw);
  const manifest = readRevisionManifest(snapshot);
  const tzdbStatus = classifyStoredTimeZoneDatabaseForReplay(manifest);
  let timeZoneContext: BundledTimeZoneCalculationContext | null = null;
  let revision: RevisionRecord;
  let chartSchema: CalculatedChartSchemaLike = storedCalculatedChartSchema;

  if (tzdbStatus === "current_exact" || tzdbStatus === "retained_exact") {
    if (!manifest.timeZoneDatabase) {
      throw new TypeError("可识别 Revision 缺少完整时区工件描述符。");
    }
    timeZoneContext = await loadBundledTimeZoneCalculationContext(
      manifest.timeZoneDatabase.snapshotId,
      manifest.timeZoneDatabase
    );
    revision = createRevisionRecordSchemaForTimeZoneName(
      timeZoneContext.resolver.isTimeZoneName
    ).parse(snapshot);
    chartSchema = createCalculatedChartSchemaForTimeZoneName(
      timeZoneContext.resolver.isTimeZoneName
    );
  } else {
    revision = storedRevisionRecordSchema.parse(snapshot);
  }

  await verifyCalculatedChartIntegrityWithSchema({
    input: revision.input,
    timeCalibration: revision.timeCalibration,
    ruleProfile: revision.ruleProfile,
    ...(revision.rulePackBinding ? { rulePackBinding: revision.rulePackBinding } : {}),
    luckCycleRuleSnapshot: revision.luckCycleRuleSnapshot,
    facts: revision.facts,
    manifest: revision.manifest
  }, revision.id, chartSchema);
  return { revision, timeZoneContext };
}

export async function verifyRevisionRecordIntegrity(raw: unknown): Promise<RevisionRecord> {
  return (await verifyRevisionRecordIntegrityWithContext(raw)).revision;
}

async function verifyRevisionSnapshotIntegrityWithContext(raw: unknown): Promise<{
  revision: RevisionRecord;
  revisionSnapshotDigest: string;
  timeZoneContext: BundledTimeZoneCalculationContext | null;
}> {
  const { revision, timeZoneContext } = await verifyRevisionRecordIntegrityWithContext(raw);
  return {
    revision,
    revisionSnapshotDigest: await sha256Hex(revision),
    timeZoneContext
  };
}

export async function verifyRevisionSnapshotIntegrity(raw: unknown): Promise<{
  revision: RevisionRecord;
  revisionSnapshotDigest: string;
}> {
  const { revision, revisionSnapshotDigest } = await verifyRevisionSnapshotIntegrityWithContext(raw);
  return { revision, revisionSnapshotDigest };
}

export type RevisionNatalReplayUnavailableStatus =
  | "legacy_tzdb_integrity_only"
  | "unsupported_engine"
  | "artifact_unavailable"
  | "descriptor_mismatch"
  | "unsupported_rule_semantics"
  | "unsupported_input_precision"
  | "unresolved_dst_selection";

export type RevisionNatalReplayErrorCode =
  | RevisionNatalReplayUnavailableStatus
  | "executor_output_invalid";

type RevisionNatalReplayCapabilityBase = {
  revisionId: string;
  revisionSnapshotDigest: string;
  engine: RevisionRecord["manifest"]["engine"];
  tzdbVersion: string;
};

export type RevisionNatalReplayCapability =
  | (RevisionNatalReplayCapabilityBase & {
      status: "replayable_exact";
      executorId: string;
      artifactRole: "current" | "retained";
    })
  | (RevisionNatalReplayCapabilityBase & {
      status: RevisionNatalReplayUnavailableStatus;
      reason: string;
    });

export type RevisionNatalReplayChangedField =
  | "time_calibration"
  | "luck_cycle_rule_snapshot"
  | "facts"
  | "result_hash";

export type RevisionNatalReplayProjection = {
  projectionVersion: "1.0.0";
  kind: "revision_natal_readonly_replay";
  sourceRevisionId: string;
  sourceRevisionSnapshotDigest: string;
  executorId: string;
  engine: RevisionRecord["manifest"]["engine"];
  timeZoneDatabase: NonNullable<RevisionRecord["manifest"]["timeZoneDatabase"]>;
  storedResultHash: string;
  replayedResultHash: string;
  status: "matched" | "mismatch";
  changedFields: RevisionNatalReplayChangedField[];
  projectionDigest: string;
  replayedChart: CalculatedChart;
};

export class RevisionNatalReplayError extends Error {
  constructor(
    readonly code: RevisionNatalReplayErrorCode,
    message: string
  ) {
    super(message);
    this.name = "RevisionNatalReplayError";
  }
}

function replayCapabilityBase(
  revision: RevisionRecord,
  revisionSnapshotDigest: string
): RevisionNatalReplayCapabilityBase {
  return {
    revisionId: revision.id,
    revisionSnapshotDigest,
    engine: revision.manifest.engine,
    tzdbVersion: revision.manifest.tzdbVersion
  };
}

function unavailableReplayCapability(
  base: RevisionNatalReplayCapabilityBase,
  status: RevisionNatalReplayUnavailableStatus,
  reason: string
): RevisionNatalReplayCapability {
  return { ...base, status, reason };
}

/**
 * Classifies whether one frozen Revision can be recalculated by its exact
 * retained natal executor and exact bundled tzdb. Integrity is verified first;
 * an unsupported record never falls back to the current executor or tzdb.
 */
function classifyVerifiedRevisionNatalReplay(
  revision: RevisionRecord,
  revisionSnapshotDigest: string
): RevisionNatalReplayCapability {
  const base = replayCapabilityBase(revision, revisionSnapshotDigest);
  const executor = lookupHistoricalNatalChartExecutor(revision.manifest.engine);
  if (!executor) {
    return unavailableReplayCapability(
      base,
      "unsupported_engine",
      "应用未保留与该 Revision 完整引擎描述符一致的本命盘执行器。"
    );
  }

  const tzdbStatus = classifyStoredTimeZoneDatabaseForReplay(revision.manifest);
  if (tzdbStatus === "legacy_unidentified") {
    return unavailableReplayCapability(
      base,
      "legacy_tzdb_integrity_only",
      "该历史 Revision 未记录可识别时区数据库，只能验证冻结内容完整性。"
    );
  }
  if (tzdbStatus === "artifact_unavailable") {
    return unavailableReplayCapability(
      base,
      "artifact_unavailable",
      "应用未随包保留该 Revision 绑定的时区工件。"
    );
  }
  if (tzdbStatus === "descriptor_mismatch") {
    return unavailableReplayCapability(
      base,
      "descriptor_mismatch",
      "Revision 的时区描述符与随包注册表不一致。"
    );
  }

  const compatibility = inspectRuleProfileCompatibility(revision.ruleProfile);
  if (!compatibility.compatible) {
    return unavailableReplayCapability(
      base,
      "unsupported_rule_semantics",
      compatibility.reasons.map((reason) => reason.message).join("；")
    );
  }
  if (
    revision.input.time === null ||
    (revision.input.timePrecision !== "exact_minute" && revision.input.timePrecision !== "exact_second")
  ) {
    return unavailableReplayCapability(
      base,
      "unsupported_input_precision",
      "本命盘只读复演只接受精确到分钟或秒的冻结输入。"
    );
  }

  const resolution = revision.timeCalibration.timeZoneResolution;
  if (
    revision.ruleProfile.calendar.dstAmbiguity === "require_user" &&
    resolution?.kind !== "unique" &&
    resolution?.selectedCandidate?.choice !== "earlier" &&
    resolution?.selectedCandidate?.choice !== "later"
  ) {
    return unavailableReplayCapability(
      base,
      "unresolved_dst_selection",
      "该 Revision 没有冻结可复用的 DST 重叠或空档选择。"
    );
  }

  if (revision.manifest.hashSchemaVersion !== HASH_SCHEMA_VERSION || !revision.manifest.timeZoneDatabase) {
    return unavailableReplayCapability(
      base,
      "legacy_tzdb_integrity_only",
      "该历史 Revision 的哈希格式未绑定完整时区工件，只能验证冻结内容完整性。"
    );
  }

  return {
    ...base,
    status: "replayable_exact",
    executorId: executor.executorId,
    artifactRole: tzdbStatus === "current_exact" ? "current" : "retained"
  };
}

export async function classifyRevisionNatalReplay(
  raw: unknown
): Promise<RevisionNatalReplayCapability> {
  const { revision, revisionSnapshotDigest } = await verifyRevisionSnapshotIntegrity(raw);
  return classifyVerifiedRevisionNatalReplay(revision, revisionSnapshotDigest);
}

function sameReplayValue(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return left === right;
  return canonicalStringify(left) === canonicalStringify(right);
}

function assertExactReplayIdentity(
  revision: RevisionRecord,
  replayedChart: CalculatedChart
): void {
  if (
    !sameReplayValue(replayedChart.input, revision.input) ||
    !sameReplayValue(replayedChart.ruleProfile, revision.ruleProfile) ||
    !sameReplayValue(replayedChart.rulePackBinding, revision.rulePackBinding) ||
    !sameReplayValue(replayedChart.manifest.engine, revision.manifest.engine) ||
    replayedChart.manifest.hashSchemaVersion !== revision.manifest.hashSchemaVersion ||
    replayedChart.manifest.tzdbVersion !== revision.manifest.tzdbVersion ||
    !sameReplayValue(
      replayedChart.manifest.timeZoneDatabase,
      revision.manifest.timeZoneDatabase
    )
  ) {
    throw new RevisionNatalReplayError(
      "executor_output_invalid",
      "精确复演执行器返回盘没有保持源 Revision 的输入、规则或时区身份。"
    );
  }
}

/**
 * Recalculates natal facts without writing a Case or Revision. Only an exact
 * executor + exact bundled tzdb capability can reach this function's compute
 * step; every unsupported historical boundary fails closed first.
 */
export async function replayRevisionNatalChart(
  raw: unknown
): Promise<RevisionNatalReplayProjection> {
  const {
    revision,
    revisionSnapshotDigest,
    timeZoneContext
  } = await verifyRevisionSnapshotIntegrityWithContext(raw);
  const capability = classifyVerifiedRevisionNatalReplay(revision, revisionSnapshotDigest);
  if (capability.status !== "replayable_exact") {
    throw new RevisionNatalReplayError(capability.status, capability.reason);
  }
  const executor = lookupHistoricalNatalChartExecutor(revision.manifest.engine);
  if (!executor || !revision.manifest.timeZoneDatabase || !timeZoneContext) {
    throw new RevisionNatalReplayError(
      "unsupported_engine",
      "复演能力在执行前发生变化；未找到精确执行器或时区描述符。"
    );
  }

  const resolution = revision.timeCalibration.timeZoneResolution;
  const selectedChoice = resolution?.selectedCandidate?.choice;
  const dstResolutionOverride =
    revision.ruleProfile.calendar.dstAmbiguity === "require_user" &&
    resolution?.kind !== "unique" &&
    (selectedChoice === "earlier" || selectedChoice === "later")
      ? selectedChoice
      : undefined;
  const calculatedReplay = await executor.calculateChart(
    revision.input,
    revision.ruleProfile,
    revision.manifest.timeZoneDatabase.snapshotId,
    {
      expectedTimeZoneDatabase: revision.manifest.timeZoneDatabase,
      ...(revision.rulePackBinding ? { rulePackBinding: revision.rulePackBinding } : {}),
      ...(dstResolutionOverride ? { dstResolutionOverride } : {})
    }
  );
  const replayedChart = await verifyCalculatedChartIntegrityWithSchema(
    calculatedReplay,
    `${revision.id}:readonly-replay`,
    createCalculatedChartSchemaForTimeZoneName(timeZoneContext.resolver.isTimeZoneName)
  );
  assertExactReplayIdentity(revision, replayedChart);

  const changedFields: RevisionNatalReplayChangedField[] = [];
  if (!sameReplayValue(revision.timeCalibration, replayedChart.timeCalibration)) {
    changedFields.push("time_calibration");
  }
  if (!sameReplayValue(revision.luckCycleRuleSnapshot, replayedChart.luckCycleRuleSnapshot)) {
    changedFields.push("luck_cycle_rule_snapshot");
  }
  if (!sameReplayValue(revision.facts, replayedChart.facts)) {
    changedFields.push("facts");
  }
  if (revision.manifest.resultHash !== replayedChart.manifest.resultHash) {
    changedFields.push("result_hash");
  }

  const digestSource = {
    projectionVersion: "1.0.0" as const,
    kind: "revision_natal_readonly_replay" as const,
    sourceRevisionId: revision.id,
    sourceRevisionSnapshotDigest: revisionSnapshotDigest,
    executorId: executor.executorId,
    engine: executor.engine,
    timeZoneDatabase: revision.manifest.timeZoneDatabase,
    storedResultHash: revision.manifest.resultHash,
    replayedResultHash: replayedChart.manifest.resultHash,
    status: changedFields.length === 0 ? "matched" as const : "mismatch" as const,
    changedFields
  };
  return {
    ...digestSource,
    projectionDigest: await sha256Hex(digestSource),
    replayedChart
  };
}

type CandidateSetValidationContext = {
  isTimeZoneName: TimeZoneNamePredicate | null;
  chartSchema: CalculatedChartSchemaLike;
};

async function resolveCandidateSetValidationContext(
  candidateSet: UnknownHourCandidateResult
): Promise<CandidateSetValidationContext> {
  const tzdbStatus = classifyStoredTimeZoneDatabaseForReplay(candidateSet);
  if (tzdbStatus !== "current_exact" && tzdbStatus !== "retained_exact") {
    return { isTimeZoneName: null, chartSchema: storedCalculatedChartSchema };
  }
  if (!candidateSet.timeZoneDatabase) {
    throw new TypeError("可识别 CandidateSet 缺少完整时区工件描述符。");
  }
  const timeZoneContext = await loadBundledTimeZoneCalculationContext(
    candidateSet.timeZoneDatabase.snapshotId,
    candidateSet.timeZoneDatabase
  );
  return {
    isTimeZoneName: timeZoneContext.resolver.isTimeZoneName,
    chartSchema: createCalculatedChartSchemaForTimeZoneName(
      timeZoneContext.resolver.isTimeZoneName
    )
  };
}

async function verifyUnknownHourCandidateResultWithSchema(
  candidateSet: UnknownHourCandidateResult,
  candidateSetId: string,
  chartSchema: CalculatedChartSchemaLike
): Promise<UnknownHourCandidateResult> {
  const charts = candidateSet.candidates.flatMap((candidate) => [
    ...(candidate.chart ? [candidate.chart] : []),
    ...candidate.variants.map((variant) => variant.chart)
  ]);
  const [ruleProfileDigest, resultHash] = await Promise.all([
    sha256Hex(candidateSet.ruleProfile),
    sha256Hex(buildUnknownHourCandidateHashPayload(candidateSet))
  ]);
  if (ruleProfileDigest !== candidateSet.ruleProfileDigest) {
    throw new CandidateSetIntegrityError(candidateSetId, "rule_profile");
  }
  if (resultHash !== candidateSet.resultHash) {
    throw new CandidateSetIntegrityError(candidateSetId, "result");
  }
  try {
    await Promise.all(charts.map((chart, index) => verifyCalculatedChartIntegrityWithSchema(
      chart,
      `${candidateSetId}:probe-chart-${index}`,
      chartSchema
    )));
  } catch (cause) {
    if (!(cause instanceof CalculatedChartIntegrityError)) throw cause;
    throw new CandidateSetIntegrityError(candidateSetId, "result");
  }
  return candidateSet;
}

/** Strict shape plus all independently recomputable candidate-result digests. */
export async function verifyUnknownHourCandidateResultIntegrity(
  raw: unknown,
  candidateSetId = "unsaved-candidate-set"
): Promise<UnknownHourCandidateResult> {
  const snapshot = snapshotRevisionInput(raw, "CandidateSet.result");
  const storedCandidateSet = storedUnknownHourCandidateResultSchema.parse(snapshot);
  const validationContext = await resolveCandidateSetValidationContext(storedCandidateSet);
  const candidateSet = validationContext.isTimeZoneName === null
    ? storedCandidateSet
    : createUnknownHourCandidateResultSchemaForTimeZoneName(
        validationContext.isTimeZoneName
      ).parse(snapshot);
  return verifyUnknownHourCandidateResultWithSchema(
    candidateSet,
    candidateSetId,
    validationContext.chartSchema
  );
}

/** Strict shape plus all independently recomputable candidate-set digests. */
export async function verifyCandidateSetRecordIntegrity(raw: unknown): Promise<CandidateSetRecord> {
  const snapshot = snapshotRevisionInput(raw, "CandidateSet");
  const storedRecord = storedCandidateSetRecordSchema.parse(snapshot);
  const validationContext = await resolveCandidateSetValidationContext(storedRecord.candidateSet);
  const record = validationContext.isTimeZoneName === null
    ? storedRecord
    : createCandidateSetRecordSchemaForTimeZoneName(
        validationContext.isTimeZoneName
      ).parse(snapshot);
  const [snapshotDigest] = await Promise.all([
    sha256Hex(record.candidateSet),
    verifyUnknownHourCandidateResultWithSchema(
      record.candidateSet,
      record.id,
      validationContext.chartSchema
    )
  ]);
  if (snapshotDigest !== record.snapshotDigest) {
    throw new CandidateSetIntegrityError(record.id, "snapshot");
  }
  return record;
}
