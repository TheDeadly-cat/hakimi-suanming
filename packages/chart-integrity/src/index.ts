import {
  HASH_SCHEMA_VERSION,
  buildCalculatedChartHashPayload,
  buildUnknownHourCandidateHashPayload,
  calculatedChartSchema,
  candidateSetRecordSchema,
  revisionRecordSchema,
  type CalculatedChart,
  type CandidateSetRecord,
  type RevisionRecord
} from "@hakimi/contracts";
import {
  inspectRuleProfileCompatibility,
  lookupHistoricalNatalChartExecutor
} from "@hakimi/bazi-core";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { classifyStoredTimeZoneDatabaseForReplay } from "@hakimi/time-core";

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

export async function verifyCalculatedChartIntegrity(
  raw: unknown,
  chartId = "unsaved-chart"
): Promise<CalculatedChart> {
  const chart = calculatedChartSchema.parse(raw);
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

export async function verifyRevisionRecordIntegrity(raw: unknown): Promise<RevisionRecord> {
  const revision = revisionRecordSchema.parse(raw);
  await verifyCalculatedChartIntegrity({
    input: revision.input,
    timeCalibration: revision.timeCalibration,
    ruleProfile: revision.ruleProfile,
    ...(revision.rulePackBinding ? { rulePackBinding: revision.rulePackBinding } : {}),
    luckCycleRuleSnapshot: revision.luckCycleRuleSnapshot,
    facts: revision.facts,
    manifest: revision.manifest
  }, revision.id);
  return revision;
}

export async function verifyRevisionSnapshotIntegrity(raw: unknown): Promise<{
  revision: RevisionRecord;
  revisionSnapshotDigest: string;
}> {
  const revision = await verifyRevisionRecordIntegrity(raw);
  return { revision, revisionSnapshotDigest: await sha256Hex(revision) };
}

export type RevisionNatalReplayUnavailableStatus =
  | "legacy_tzdb_integrity_only"
  | "unsupported_engine"
  | "artifact_unavailable"
  | "descriptor_mismatch"
  | "unsupported_rule_semantics"
  | "unsupported_input_precision"
  | "unresolved_dst_selection";

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
    readonly code: RevisionNatalReplayUnavailableStatus,
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
export async function classifyRevisionNatalReplay(
  raw: unknown
): Promise<RevisionNatalReplayCapability> {
  const { revision, revisionSnapshotDigest } = await verifyRevisionSnapshotIntegrity(raw);
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

function sameReplayValue(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

/**
 * Recalculates natal facts without writing a Case or Revision. Only an exact
 * executor + exact bundled tzdb capability can reach this function's compute
 * step; every unsupported historical boundary fails closed first.
 */
export async function replayRevisionNatalChart(
  raw: unknown
): Promise<RevisionNatalReplayProjection> {
  const { revision, revisionSnapshotDigest } = await verifyRevisionSnapshotIntegrity(raw);
  const capability = await classifyRevisionNatalReplay(revision);
  if (capability.status !== "replayable_exact") {
    throw new RevisionNatalReplayError(capability.status, capability.reason);
  }
  const executor = lookupHistoricalNatalChartExecutor(revision.manifest.engine);
  if (!executor || !revision.manifest.timeZoneDatabase) {
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
  const replayedChart = await executor.calculateChart(
    revision.input,
    revision.ruleProfile,
    revision.manifest.timeZoneDatabase.snapshotId,
    {
      expectedTimeZoneDatabase: revision.manifest.timeZoneDatabase,
      ...(revision.rulePackBinding ? { rulePackBinding: revision.rulePackBinding } : {}),
      ...(dstResolutionOverride ? { dstResolutionOverride } : {})
    }
  );

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

/** Strict shape plus all independently recomputable candidate-set digests. */
export async function verifyCandidateSetRecordIntegrity(raw: unknown): Promise<CandidateSetRecord> {
  const record = candidateSetRecordSchema.parse(raw);
  const charts = record.candidateSet.candidates.flatMap((candidate) => [
    ...(candidate.chart ? [candidate.chart] : []),
    ...candidate.variants.map((variant) => variant.chart)
  ]);
  const [snapshotDigest, ruleProfileDigest, resultHash] = await Promise.all([
    sha256Hex(record.candidateSet),
    sha256Hex(record.candidateSet.ruleProfile),
    sha256Hex(buildUnknownHourCandidateHashPayload(record.candidateSet))
  ]);
  if (snapshotDigest !== record.snapshotDigest) {
    throw new CandidateSetIntegrityError(record.id, "snapshot");
  }
  if (ruleProfileDigest !== record.candidateSet.ruleProfileDigest) {
    throw new CandidateSetIntegrityError(record.id, "rule_profile");
  }
  if (resultHash !== record.candidateSet.resultHash) {
    throw new CandidateSetIntegrityError(record.id, "result");
  }
  try {
    await Promise.all(charts.map((chart, index) => verifyCalculatedChartIntegrity(
      chart,
      `${record.id}:probe-chart-${index}`
    )));
  } catch (cause) {
    if (!(cause instanceof CalculatedChartIntegrityError)) throw cause;
    throw new CandidateSetIntegrityError(record.id, "result");
  }
  return record;
}
