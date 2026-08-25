import { Clock3, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { RevisionRecord } from "@hakimi/contracts";
import type {
  BaziBirthTimePerturbationBlockCode,
  BaziBirthTimePerturbationChangedFactPath,
  BaziBirthTimePerturbationOffset,
  BaziBirthTimePerturbationPillar,
  BaziBirthTimePerturbationStabilityReport
} from "@hakimi/bazi-interpretation";
import { StatusPill, type StatusPillTone } from "./status-pill";
import "./birth-time-perturbation-panel.css";

type BuildBirthTimePerturbationReport = (
  revision: RevisionRecord
) => Promise<unknown>;

type CalculatedScenarioDisplay = Readonly<{
  scenarioId: string;
  order: number;
  offsetMinutes: BaziBirthTimePerturbationOffset;
  status: "calculated";
  timeZoneResolutionKind: "unique" | "overlap";
  timeZoneResolutionStatus: string;
  sameProjectionAsBaseline: boolean;
  changedPillarIdentities: readonly BaziBirthTimePerturbationPillar[];
  changedFactPaths: readonly BaziBirthTimePerturbationChangedFactPath[];
}>;

type BlockedScenarioDisplay = Readonly<{
  scenarioId: string;
  order: number;
  offsetMinutes: BaziBirthTimePerturbationOffset;
  status: "blocked";
  timeZoneResolutionKind: "unique" | "overlap" | "gap" | null;
  timeZoneResolutionStatus: string | null;
  sameProjectionAsBaseline: null;
  changedPillarIdentities: readonly [];
  changedFactPaths: readonly [];
  blockCode: BaziBirthTimePerturbationBlockCode;
}>;

type BirthTimePerturbationDisplayReport = Readonly<{
  binding: Readonly<{
    revisionNumber: number;
    ruleProfile: Readonly<{ id: string; version: string }>;
    rulePackBinding: Readonly<{
      packId: string;
      packDigest: string;
      profileId: string;
      profileVersion: string;
    }> | null;
    executorId: string;
    artifactRole: "current" | "retained";
    engine: Readonly<{ name: string; version: string }>;
    timeZoneDatabase: Readonly<{
      snapshotId: string;
      ianaVersion: string;
      dataSha256: string;
    }>;
  }>;
  scenarios: readonly (CalculatedScenarioDisplay | BlockedScenarioDisplay)[];
  counts: Readonly<{ total: 7; calculated: number; blocked: number; changedFromBaseline: number }>;
  stability: Readonly<{
    status: BaziBirthTimePerturbationStabilityReport["stability"]["status"];
    note: string;
  }>;
  integrity: Readonly<{ payloadSha256: string }>;
}>;

type ReportState =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "processing" }>
  | Readonly<{ status: "ready"; report: BirthTimePerturbationDisplayReport }>
  | Readonly<{ status: "failed"; message: string }>;

const pillarLabels: Readonly<Record<BaziBirthTimePerturbationPillar, string>> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱"
};

const blockLabels: Readonly<Record<BaziBirthTimePerturbationBlockCode, string>> = {
  outside_supported_civil_input_range: "超出支持的民用时间范围",
  dst_overlap_requires_scenario_choice: "进入 DST 重叠且缺少该样本的明确选择",
  dst_gap_requires_scenario_resolution: "进入 DST 空档且不允许静默平移",
  calculation_rejected: "冻结执行器拒绝该偏移样本"
};

const reportStatusLabels: Readonly<Record<
  BaziBirthTimePerturbationStabilityReport["stability"]["status"],
  Readonly<{ label: string; tone: StatusPillTone }>
>> = {
  pillar_projection_unchanged_for_all_requested_offsets: {
    label: "七个列出样本的四柱投影未变化",
    tone: "info"
  },
  pillar_projection_changed_within_requested_offsets: {
    label: "列出样本内出现四柱投影变化",
    tone: "warning"
  },
  inconclusive_due_to_blocked_offsets: {
    label: "存在阻断样本，七点集合不完整",
    tone: "cinnabar"
  }
};

const requestedOffsets = Object.freeze([
  0,
  -1,
  1,
  -5,
  5,
  -15,
  15
] as const satisfies readonly BaziBirthTimePerturbationOffset[]);

const unsafeVisiblePattern =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]+/gu;

const sha256Pattern = /^[a-f0-9]{64}$/u;
const changedFactPathPattern = /^pillars\.(year|month|day|hour)\.(name|label|ganZhi|stem|branch|hiddenStems|stemTenGod|branchTenGods|wuXing|nayin|twelveGrowth|xun|voidBranches)$/u;
const pillarOrder = Object.freeze([
  "year",
  "month",
  "day",
  "hour"
] as const satisfies readonly BaziBirthTimePerturbationPillar[]);
const calculatedResolutionStatuses = Object.freeze([
  "resolved_unique",
  "resolved_overlap_earlier",
  "resolved_overlap_later"
] as const);
const allResolutionStatuses = Object.freeze([
  ...calculatedResolutionStatuses,
  "rejected_overlap",
  "shifted_gap_earlier",
  "shifted_gap_later",
  "rejected_gap"
] as const);

type PlainRecord = Record<string, unknown>;

interface ProjectionBudget {
  nodes: number;
  textCharacters: number;
}

function invalidReport(): never {
  throw new Error("birth_time_perturbation_display_projection_rejected");
}

function snapshotDeclarativeReport(
  value: unknown,
  budget: ProjectionBudget = { nodes: 0, textCharacters: 0 },
  depth = 0,
  ancestors = new WeakSet<object>()
): unknown {
  budget.nodes += 1;
  if (budget.nodes > 4_000 || depth > 32) invalidReport();
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalidReport();
    return value;
  }
  if (typeof value === "string") {
    const length = Array.from(value).length;
    budget.textCharacters += length;
    if (length > 16_000 || budget.textCharacters > 250_000) invalidReport();
    return value;
  }
  if (typeof value !== "object") invalidReport();
  if (ancestors.has(value)) invalidReport();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) {
    invalidReport();
  }
  if (Object.getOwnPropertySymbols(value).length > 0) invalidReport();
  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value)) {
      if (value.length > 256) invalidReport();
      const keys = Object.keys(descriptors);
      if (keys.some((key) => key !== "length" && !/^(0|[1-9]\d*)$/u.test(key))) {
        invalidReport();
      }
      const snapshot: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) invalidReport();
        snapshot.push(snapshotDeclarativeReport(
          descriptor.value,
          budget,
          depth + 1,
          ancestors
        ));
      }
      if (keys.length !== value.length + 1) invalidReport();
      return snapshot;
    }
    const keys = Object.keys(descriptors);
    if (keys.length > 128) invalidReport();
    const snapshot: PlainRecord = {};
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) invalidReport();
      snapshot[key] = snapshotDeclarativeReport(
        descriptor.value,
        budget,
        depth + 1,
        ancestors
      );
    }
    return snapshot;
  } finally {
    ancestors.delete(value);
  }
}

function asRecord(value: unknown): PlainRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalidReport();
  return value as PlainRecord;
}

function expectExactKeys(record: PlainRecord, expectedKeys: readonly string[]): void {
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalidReport();
  }
}

function requireString(value: unknown, maximumCharacters = 600): string {
  if (typeof value !== "string" || value.length === 0 || Array.from(value).length > maximumCharacters) {
    invalidReport();
  }
  return value;
}

function requireSha256(value: unknown): string {
  const digest = requireString(value, 64);
  if (!sha256Pattern.test(digest)) invalidReport();
  return digest;
}

function requireInteger(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    invalidReport();
  }
  return value as number;
}

function requireOneOf<const T extends readonly (string | number | null)[]>(
  value: unknown,
  allowed: T
): T[number] {
  if (!allowed.some((candidate) => Object.is(candidate, value))) invalidReport();
  return value as T[number];
}

function sameDeclarativeValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameDeclarativeValue(value, right[index]));
  }
  if (
    left === null
    || right === null
    || typeof left !== "object"
    || typeof right !== "object"
  ) return false;
  const leftRecord = left as PlainRecord;
  const rightRecord = right as PlainRecord;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => (
      key === rightKeys[index]
      && sameDeclarativeValue(leftRecord[key], rightRecord[key])
    ));
}

function freezeDisplay<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as PlainRecord)) freezeDisplay(child);
  return value;
}

function projectPillars(value: unknown): readonly BaziBirthTimePerturbationPillar[] {
  if (!Array.isArray(value) || value.length > pillarOrder.length) invalidReport();
  const pillars = value.map((pillar) => requireOneOf(pillar, pillarOrder));
  const expectedOrder = pillarOrder.filter((pillar) => pillars.includes(pillar));
  if (new Set(pillars).size !== pillars.length || !sameDeclarativeValue(pillars, expectedOrder)) {
    invalidReport();
  }
  return Object.freeze(pillars);
}

function projectChangedFactPaths(
  value: unknown
): readonly BaziBirthTimePerturbationChangedFactPath[] {
  if (!Array.isArray(value) || value.length > 52) invalidReport();
  const paths = value.map((path) => {
    const text = requireString(path, 100);
    if (!changedFactPathPattern.test(text)) invalidReport();
    return text as BaziBirthTimePerturbationChangedFactPath;
  });
  if (new Set(paths).size !== paths.length) invalidReport();
  return Object.freeze(paths);
}

function projectReportForDisplay(
  rawReport: unknown,
  revision: RevisionRecord
): BirthTimePerturbationDisplayReport {
  const root = asRecord(snapshotDeclarativeReport(rawReport));
  expectExactKeys(root, [
    "profile",
    "binding",
    "scenarios",
    "counts",
    "stability",
    "integrity",
    "boundary"
  ]);

  const profile = asRecord(root.profile);
  expectExactKeys(profile, [
    "projectionVersion",
    "contentVersion",
    "system",
    "scope",
    "projectionPolicy",
    "mutationPolicy",
    "reviewStatus",
    "expertTruthClaimed",
    "scientificValidityClaimed",
    "formalActivationAllowed"
  ]);
  const expectedProfile = {
    projectionVersion: "hakimi.bazi.birth_time_perturbation_stability/0.1.0",
    contentVersion: "0.22.0",
    system: "bazi",
    scope: "fixed_civil_minute_offsets_full_pillar_projection_against_registered_replay",
    projectionPolicy: "full_pillar_facts_only",
    mutationPolicy: "read_only_projection",
    reviewStatus: "candidate_pending_expert_review",
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false
  } as const;
  if (!sameDeclarativeValue(profile, expectedProfile)) invalidReport();

  const binding = asRecord(root.binding);
  expectExactKeys(binding, [
    "revisionId",
    "revisionNumber",
    "revisionSnapshotDigest",
    "sourceResultHash",
    "ruleProfile",
    "rulePackBinding",
    "executorId",
    "artifactRole",
    "engine",
    "timeZoneDatabase",
    "inputTimePrecision",
    "baselineFactsProjectionDigest"
  ]);
  if (
    binding.revisionId !== revision.id
    || binding.revisionNumber !== revision.revisionNumber
    || binding.sourceResultHash !== revision.manifest.resultHash
    || binding.inputTimePrecision !== revision.input.timePrecision
  ) invalidReport();
  requireSha256(binding.revisionSnapshotDigest);
  requireSha256(binding.baselineFactsProjectionDigest);

  const ruleProfile = asRecord(binding.ruleProfile);
  expectExactKeys(ruleProfile, ["id", "version", "status", "digest"]);
  if (
    ruleProfile.id !== revision.ruleProfile.profileId
    || ruleProfile.version !== revision.ruleProfile.profileVersion
    || ruleProfile.status !== revision.ruleProfile.status
    || ruleProfile.digest !== revision.manifest.ruleProfileDigest
  ) invalidReport();

  const expectedRulePack = revision.rulePackBinding ?? null;
  if (!sameDeclarativeValue(binding.rulePackBinding, expectedRulePack)) invalidReport();
  if (!sameDeclarativeValue(binding.engine, revision.manifest.engine)) invalidReport();
  if (!sameDeclarativeValue(binding.timeZoneDatabase, revision.manifest.timeZoneDatabase)) {
    invalidReport();
  }
  const executorId = requireString(binding.executorId, 200);
  const artifactRole = requireOneOf(binding.artifactRole, ["current", "retained"] as const);
  const engine = asRecord(binding.engine);
  const timeZoneDatabase = asRecord(binding.timeZoneDatabase);
  const engineName = requireString(engine.name, 120);
  const engineVersion = requireString(engine.version, 120);
  const snapshotId = requireString(timeZoneDatabase.snapshotId, 300);
  const ianaVersion = requireString(timeZoneDatabase.ianaVersion, 20);
  const dataSha256 = requireSha256(timeZoneDatabase.dataSha256);

  if (!Array.isArray(root.scenarios) || root.scenarios.length !== requestedOffsets.length) {
    invalidReport();
  }
  const scenarios: Array<CalculatedScenarioDisplay | BlockedScenarioDisplay> = [];
  const calculatedOffsets: BaziBirthTimePerturbationOffset[] = [];
  const blockedOffsets: Array<Readonly<{
    offsetMinutes: BaziBirthTimePerturbationOffset;
    blockCode: BaziBirthTimePerturbationBlockCode;
    timeZoneResolutionKind: "unique" | "overlap" | "gap" | null;
    timeZoneResolutionStatus: (typeof allResolutionStatuses)[number] | null;
  }>> = [];

  root.scenarios.forEach((scenarioValue, index) => {
    const scenario = asRecord(scenarioValue);
    const offsetMinutes = requestedOffsets[index]!;
    const commonKeys = [
      "scenarioId",
      "order",
      "offsetMinutes",
      "status",
      "timeZoneResolutionKind",
      "timeZoneResolutionStatus",
      "selectedTimeZoneCandidateChoice",
      "solarTimeApplied",
      "factsProjectionDigest",
      "sameProjectionAsBaseline",
      "changedPillarIdentities",
      "changedPillarFacts",
      "changedFactPaths",
      "note"
    ] as const;
    if (
      scenario.scenarioId !== `civil-minute-offset:${offsetMinutes}`
      || scenario.order !== index + 1
      || scenario.offsetMinutes !== offsetMinutes
      || scenario.solarTimeApplied !== false
    ) invalidReport();

    if (scenario.status === "calculated") {
      expectExactKeys(scenario, commonKeys);
      const resolutionKind = requireOneOf(
        scenario.timeZoneResolutionKind,
        ["unique", "overlap"] as const
      );
      const resolutionStatus = requireOneOf(
        scenario.timeZoneResolutionStatus,
        calculatedResolutionStatuses
      );
      const selectedChoice = requireOneOf(
        scenario.selectedTimeZoneCandidateChoice,
        ["unique", "earlier", "later"] as const
      );
      if (
        (resolutionKind === "unique"
          && (resolutionStatus !== "resolved_unique" || selectedChoice !== "unique"))
        || (resolutionKind === "overlap"
          && !(
            (resolutionStatus === "resolved_overlap_earlier" && selectedChoice === "earlier")
            || (resolutionStatus === "resolved_overlap_later" && selectedChoice === "later")
          ))
      ) invalidReport();
      requireSha256(scenario.factsProjectionDigest);
      if (typeof scenario.sameProjectionAsBaseline !== "boolean") invalidReport();
      const changedPillarIdentities = projectPillars(scenario.changedPillarIdentities);
      const changedPillarFacts = projectPillars(scenario.changedPillarFacts);
      const changedFactPaths = projectChangedFactPaths(scenario.changedFactPaths);
      requireString(scenario.note, 600);
      if (
        (scenario.sameProjectionAsBaseline
          && (changedPillarIdentities.length > 0
            || changedPillarFacts.length > 0
            || changedFactPaths.length > 0))
        || (!scenario.sameProjectionAsBaseline
          && changedPillarFacts.length === 0
          && changedFactPaths.length === 0)
      ) invalidReport();
      scenarios.push(freezeDisplay({
        scenarioId: scenario.scenarioId,
        order: index + 1,
        offsetMinutes,
        status: "calculated" as const,
        timeZoneResolutionKind: resolutionKind,
        timeZoneResolutionStatus: resolutionStatus,
        sameProjectionAsBaseline: scenario.sameProjectionAsBaseline,
        changedPillarIdentities,
        changedFactPaths
      }));
      calculatedOffsets.push(offsetMinutes);
      return;
    }

    if (scenario.status !== "blocked") invalidReport();
    expectExactKeys(scenario, [...commonKeys, "blockCode"]);
    const resolutionKind = requireOneOf(
      scenario.timeZoneResolutionKind,
      ["unique", "overlap", "gap", null] as const
    );
    const resolutionStatus = requireOneOf(
      scenario.timeZoneResolutionStatus,
      [...allResolutionStatuses, null] as const
    );
    const blockCode = requireOneOf(
      scenario.blockCode,
      Object.keys(blockLabels) as BaziBirthTimePerturbationBlockCode[]
    );
    if (
      scenario.selectedTimeZoneCandidateChoice !== null
      || scenario.factsProjectionDigest !== null
      || scenario.sameProjectionAsBaseline !== null
      || !Array.isArray(scenario.changedPillarIdentities)
      || scenario.changedPillarIdentities.length > 0
      || !Array.isArray(scenario.changedPillarFacts)
      || scenario.changedPillarFacts.length > 0
      || !Array.isArray(scenario.changedFactPaths)
      || scenario.changedFactPaths.length > 0
    ) invalidReport();
    requireString(scenario.note, 600);
    if (
      (blockCode === "outside_supported_civil_input_range"
        && (resolutionKind !== null || resolutionStatus !== null))
      || (blockCode === "dst_overlap_requires_scenario_choice"
        && (resolutionKind !== "overlap" || resolutionStatus !== "rejected_overlap"))
      || (blockCode === "dst_gap_requires_scenario_resolution"
        && (resolutionKind !== "gap" || resolutionStatus !== "rejected_gap"))
      || (blockCode === "calculation_rejected"
        && (resolutionKind === null || resolutionKind === "gap" || resolutionStatus === null))
    ) invalidReport();
    const projectedBlockCode = blockCode as BaziBirthTimePerturbationBlockCode;
    scenarios.push(freezeDisplay({
      scenarioId: scenario.scenarioId as string,
      order: index + 1,
      offsetMinutes,
      status: "blocked" as const,
      timeZoneResolutionKind: resolutionKind,
      timeZoneResolutionStatus: resolutionStatus,
      sameProjectionAsBaseline: null,
      changedPillarIdentities: [] as const,
      changedFactPaths: [] as const,
      blockCode: projectedBlockCode
    }));
    blockedOffsets.push(freezeDisplay({
      offsetMinutes,
      blockCode: projectedBlockCode,
      timeZoneResolutionKind: resolutionKind,
      timeZoneResolutionStatus: resolutionStatus
    }));
  });

  const calculated = calculatedOffsets.length;
  const blocked = blockedOffsets.length;
  const changedFromBaseline = scenarios.filter((scenario) => (
    scenario.status === "calculated" && !scenario.sameProjectionAsBaseline
  )).length;
  const counts = asRecord(root.counts);
  expectExactKeys(counts, ["total", "calculated", "blocked", "changedFromBaseline"]);
  if (
    counts.total !== 7
    || counts.calculated !== calculated
    || counts.blocked !== blocked
    || counts.changedFromBaseline !== changedFromBaseline
  ) invalidReport();

  const expectedStatus = blocked > 0
    ? "inconclusive_due_to_blocked_offsets" as const
    : changedFromBaseline > 0
      ? "pillar_projection_changed_within_requested_offsets" as const
      : "pillar_projection_unchanged_for_all_requested_offsets" as const;
  const stability = asRecord(root.stability);
  expectExactKeys(stability, [
    "status",
    "requestedOffsetsMinutes",
    "calculatedOffsetsMinutes",
    "blockedOffsets",
    "solarTimePerturbationStatus",
    "interpretationStabilityClaimed",
    "note"
  ]);
  if (
    stability.status !== expectedStatus
    || !sameDeclarativeValue(stability.requestedOffsetsMinutes, requestedOffsets)
    || !sameDeclarativeValue(stability.calculatedOffsetsMinutes, calculatedOffsets)
    || !sameDeclarativeValue(stability.blockedOffsets, blockedOffsets)
    || stability.solarTimePerturbationStatus
      !== "not_applied_to_any_calculated_or_time_zone_probed_scenario"
    || stability.interpretationStabilityClaimed !== false
  ) invalidReport();
  requireString(stability.note, 600);

  const expectedBoundary = {
    exactRegisteredReplayRequired: true,
    replayEvidenceScope: "registered_executor_recalculation_not_original_binary_attestation",
    historicalProgramBinaryAttestationClaimed: false,
    civilWallTimePerturbationOnly: true,
    unlistedOffsetsAssessed: false,
    rawBirthDateCopied: false,
    rawBirthTimeCopied: false,
    sourceLocationCopied: false,
    sourceTimeZoneCopied: false,
    solarTimeAppliedInAnyScenario: false,
    containsDerivedSensitiveChartData: true,
    interpretationStabilityClaimed: false,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    publicReleaseAuthorized: false,
    networkTransmissionPerformed: false,
    networkTransmissionAuthorized: false,
    chartOrStorageMutationPerformed: false,
    overallGoodBad: null,
    usefulGod: null,
    eventOutcome: null,
    result: null
  } as const;
  const boundary = asRecord(root.boundary);
  expectExactKeys(boundary, Object.keys(expectedBoundary));
  if (!sameDeclarativeValue(boundary, expectedBoundary)) invalidReport();

  const integrity = asRecord(root.integrity);
  expectExactKeys(integrity, ["hashAlgorithm", "payloadSha256", "authenticityClaimed"]);
  if (integrity.hashAlgorithm !== "SHA-256" || integrity.authenticityClaimed !== false) {
    invalidReport();
  }
  const payloadSha256 = requireSha256(integrity.payloadSha256);
  const rawRulePack = expectedRulePack;
  const rulePackBinding = rawRulePack
    ? freezeDisplay({
        packId: rawRulePack.packId,
        packDigest: rawRulePack.packDigest,
        profileId: rawRulePack.profileId,
        profileVersion: rawRulePack.profileVersion
      })
    : null;

  return freezeDisplay({
    binding: freezeDisplay({
      revisionNumber: revision.revisionNumber,
      ruleProfile: freezeDisplay({
        id: revision.ruleProfile.profileId,
        version: revision.ruleProfile.profileVersion
      }),
      rulePackBinding,
      executorId,
      artifactRole,
      engine: freezeDisplay({ name: engineName, version: engineVersion }),
      timeZoneDatabase: freezeDisplay({ snapshotId, ianaVersion, dataSha256 })
    }),
    scenarios: Object.freeze(scenarios),
    counts: freezeDisplay({
      total: 7 as const,
      calculated,
      blocked,
      changedFromBaseline
    }),
    stability: freezeDisplay({
      status: expectedStatus,
      note: blocked > 0
        ? "至少一个固定偏移样本失败关闭；不得把已计算子集外推为完整窗口四柱投影未变。"
        : "结论只覆盖列出的七个民用时间偏移及冻结计算策略，不证明真实出生时间或解释稳定性。"
    }),
    integrity: freezeDisplay({ payloadSha256 })
  });
}

function safeVisibleText(value: unknown, fallback: string, maximumCharacters: number): string {
  const source = (typeof value === "string" ? value : fallback)
    .replace(/\r\n?/gu, "\n")
    .replace(unsafeVisiblePattern, " ")
    .trim() || fallback;
  const characters = Array.from(source);
  return characters.length <= maximumCharacters
    ? source
    : `${characters.slice(0, Math.max(0, maximumCharacters - 8)).join("")}…[已截断]`;
}

function shortHash(value: string): string {
  return value.length <= 18 ? value : `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function offsetLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "0 分钟 · 冻结基线";
  return `${offsetMinutes > 0 ? "+" : ""}${offsetMinutes} 分钟`;
}

function unavailableReason(revision: RevisionRecord): string | null {
  if (
    revision.input.timePrecision !== "exact_minute"
    && revision.input.timePrecision !== "exact_second"
  ) {
    return "只有冻结到分钟或秒的 Revision 才能运行固定分钟扰动；未知时辰、日期级或时间范围输入必须继续保持并列候选。";
  }
  if (revision.input.time === null) {
    return "当前 Revision 没有可偏移的冻结民用时间。";
  }
  if (!revision.manifest.timeZoneDatabase) {
    return "当前历史 Revision 没有固定时区数据库工件，不能用浏览器当前时区规则替代当时快照。";
  }
  return null;
}

async function buildReportWithCurrentModule(
  revision: RevisionRecord
): Promise<BaziBirthTimePerturbationStabilityReport> {
  const { buildBaziBirthTimePerturbationStabilityReport } =
    await import("@hakimi/bazi-interpretation");
  return buildBaziBirthTimePerturbationStabilityReport(revision);
}

function BirthTimePerturbationPanelInner({
  revision,
  buildReport
}: {
  revision: RevisionRecord;
  buildReport: BuildBirthTimePerturbationReport;
}) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const resultTitleId = `${generatedId}-result-title`;
  const unavailable = unavailableReason(revision);
  const [state, setState] = useState<ReportState>({ status: "idle" });
  const mountedRef = useRef(true);
  const runTokenRef = useRef(0);
  const runningRef = useRef(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runTokenRef.current += 1;
      runningRef.current = false;
    };
  }, []);

  const report = state.status === "ready" ? state.report : null;
  const processing = state.status === "processing";
  const failed = state.status === "failed";
  const status = unavailable
    ? { label: "当前输入不可运行", tone: "neutral" as const }
    : processing
      ? { label: "正在本机复演七点", tone: "info" as const }
      : report
        ? reportStatusLabels[report.stability.status]
        : failed
          ? { label: "报告失败关闭", tone: "cinnabar" as const }
          : { label: "待主动运行", tone: "neutral" as const };

  useEffect(() => {
    if (report) resultRef.current?.focus();
  }, [report]);

  const run = async () => {
    if (unavailable || runningRef.current) return;
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;
    runningRef.current = true;
    setState({ status: "processing" });
    try {
      const rawReport = await buildReport(revision);
      const nextReport = projectReportForDisplay(rawReport, revision);
      if (!mountedRef.current || runTokenRef.current !== token) return;
      setState({ status: "ready", report: nextReport });
    } catch {
      if (!mountedRef.current || runTokenRef.current !== token) return;
      setState({
        status: "failed",
        message: "当前 Revision 未通过精确复演或七点扰动合同；没有显示局部或未绑定结果。"
      });
    } finally {
      if (mountedRef.current && runTokenRef.current === token) runningRef.current = false;
    }
  };

  return (
    <section
      className="flat-section birth-time-perturbation-panel"
      aria-labelledby={titleId}
      aria-busy={processing}
      data-state={unavailable ? "unavailable" : state.status}
      data-report-status={report?.stability.status ?? "not_produced"}
      data-release-identity="legacy-v13"
      data-release-family="legacy-v13"
      data-db-generation="legacy-v13"
      data-target-schema="13"
      data-migration-id="null"
      data-mutation-mode="read-only-no-mutation"
      data-mutation-epoch-bypassed="false"
      data-chart-or-storage-mutation-performed="false"
      data-record-write-performed="false"
      data-provider-outbound="blocked"
      data-user-data-network-transmission-performed="false"
      data-probability-produced="false"
      data-stability-score-produced="false"
      data-real-birth-time-inferred="false"
      data-interpretation-stability-claimed="false"
      data-expert-truth-claimed="false"
      data-scientific-validity-claimed="false"
      data-public-release-authorized="false"
    >
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Civil-time neighborhood · read-only</p>
          <h2 id={titleId}>出生时间扰动：七点四柱投影</h2>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      <div className="birth-time-perturbation-boundary" role="note">
        <Clock3 aria-hidden="true" />
        <div>
          <strong>只检查 0、±1、±5、±15 分钟这七个民用墙上时间样本。</strong>
          <p>它不是连续区间、概率模型、时辰校正或解释稳定性评估；不会猜真实出生时间，也不会输出吉凶、用神、事件结果或推荐。每个样本都沿用冻结引擎、规则与 tzdb，真太阳时不进入本报告。</p>
        </div>
      </div>

      {unavailable ? (
        <div className="birth-time-perturbation-unavailable" role="note">
          <TriangleAlert aria-hidden="true" />
          <p>{unavailable}</p>
        </div>
      ) : (
        <div className="birth-time-perturbation-action-row">
          <button
            type="button"
            className="primary-action"
            onClick={() => void run()}
            disabled={processing}
            aria-busy={processing}
          >
            {processing
              ? <LoaderCircle className="spin" aria-hidden="true" />
              : <ShieldCheck aria-hidden="true" />}
            {processing ? "正在复演七点" : report ? "重新运行七点扰动" : "运行七点民用时间扰动"}
          </button>
          <p>计算只在点击后于本机启动；不写 Revision、数据库或 Web Storage。按需代码加载可能请求同源静态资源，但命盘数据与报告不作为该请求载荷。</p>
        </div>
      )}

      {state.status === "failed" ? (
        <div className="inline-error" role="alert">
          <strong>七点扰动报告保持关闭</strong>
          <p>{state.message}</p>
        </div>
      ) : null}

      {report ? (
        <div
          ref={resultRef}
          className="birth-time-perturbation-result"
          role="region"
          aria-labelledby={resultTitleId}
          tabIndex={-1}
        >
          <header>
            <div>
              <small>Fixed sample projection</small>
              <h3 id={resultTitleId}>七点扰动报告</h3>
            </div>
            <StatusPill tone={reportStatusLabels[report.stability.status].tone}>
              {reportStatusLabels[report.stability.status].label}
            </StatusPill>
          </header>

          <div className="birth-time-perturbation-metrics" aria-label="七点扰动计数">
            <div><span>列出样本</span><strong>{report.counts.total}</strong></div>
            <div><span>已计算</span><strong>{report.counts.calculated}</strong></div>
            <div><span>失败关闭</span><strong>{report.counts.blocked}</strong></div>
            <div><span>相对基线有变化</span><strong>{report.counts.changedFromBaseline}</strong></div>
          </div>

          <ol className="birth-time-perturbation-scenarios" aria-label="七个民用时间扰动样本">
            {report.scenarios.map((scenario) => (
              <li
                key={scenario.scenarioId}
                data-offset-minutes={scenario.offsetMinutes}
                data-scenario-status={scenario.status}
                data-same-projection={scenario.sameProjectionAsBaseline === null
                  ? "not_calculated"
                  : String(scenario.sameProjectionAsBaseline)}
              >
                <header>
                  <div><small>样本 {scenario.order}/7</small><strong>{offsetLabel(scenario.offsetMinutes)}</strong></div>
                  <StatusPill tone={scenario.status === "blocked"
                    ? "cinnabar"
                    : scenario.sameProjectionAsBaseline ? "neutral" : "warning"}
                  >
                    {scenario.status === "blocked"
                      ? "失败关闭"
                      : scenario.sameProjectionAsBaseline ? "投影相同" : "投影有变化"}
                  </StatusPill>
                </header>
                {scenario.status === "blocked" ? (
                  <div className="birth-time-perturbation-scenario-detail is-blocked">
                    <p>{blockLabels[scenario.blockCode]}</p>
                    <code>{scenario.blockCode}</code>
                    <small>{scenario.timeZoneResolutionKind ?? "无时区解析"} · {scenario.timeZoneResolutionStatus ?? "无解析状态"}</small>
                  </div>
                ) : (
                  <div className="birth-time-perturbation-scenario-detail">
                    <p>{scenario.sameProjectionAsBaseline
                      ? "列出的完整四柱事实投影与 0 分钟基线相同。"
                      : `变化柱：${scenario.changedPillarIdentities.map((pillar) => pillarLabels[pillar]).join("、") || "仅字段变化"}`}
                    </p>
                    {scenario.changedFactPaths.length ? (
                      <details>
                        <summary>查看 {scenario.changedFactPaths.length} 个变化字段路径</summary>
                        <ul>{scenario.changedFactPaths.map((path) => <li key={path}><code>{path}</code></li>)}</ul>
                      </details>
                    ) : null}
                    <small>{scenario.timeZoneResolutionKind} · {scenario.timeZoneResolutionStatus} · solar time false</small>
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="birth-time-perturbation-binding" aria-label="七点扰动报告绑定">
            <div><span>Revision</span><strong>R{report.binding.revisionNumber}</strong></div>
            <div><span>RuleProfile</span><strong>{safeVisibleText(report.binding.ruleProfile.id, "不可显示", 120)}@{safeVisibleText(report.binding.ruleProfile.version, "不可显示", 80)}</strong></div>
            <div><span>冻结引擎</span><strong>{safeVisibleText(report.binding.engine.name, "不可显示", 120)}@{safeVisibleText(report.binding.engine.version, "不可显示", 80)}</strong></div>
            <div><span>执行器</span><strong>{safeVisibleText(report.binding.executorId, "不可显示", 160)}</strong></div>
            <div><span>Rule pack</span><strong>{report.binding.rulePackBinding
              ? `${safeVisibleText(report.binding.rulePackBinding.packId, "不可显示", 120)} · ${shortHash(report.binding.rulePackBinding.packDigest)}`
              : "未绑定安装包"}</strong></div>
            <div><span>tzdb</span><strong>{safeVisibleText(report.binding.timeZoneDatabase.ianaVersion, "不可显示", 80)} · {shortHash(report.binding.timeZoneDatabase.dataSha256)} · {report.binding.artifactRole}</strong></div>
            <div><span>报告摘要</span><strong><code title={report.integrity.payloadSha256}>{shortHash(report.integrity.payloadSha256)}</code></strong></div>
          </div>
          <p className="birth-time-perturbation-result-boundary">{safeVisibleText(report.stability.note, "报告边界说明不可用。", 600)} interpretation stability:false · probability:null · score:null · result:null</p>
        </div>
      ) : null}
    </section>
  );
}

export function BirthTimePerturbationPanel({
  revision,
  buildReport = buildReportWithCurrentModule
}: {
  revision: RevisionRecord;
  buildReport?: BuildBirthTimePerturbationReport;
}) {
  const bindingKey = `${revision.id}:${revision.revisionNumber}:${revision.manifest.resultHash}`;
  return (
    <BirthTimePerturbationPanelInner
      key={bindingKey}
      revision={revision}
      buildReport={buildReport}
    />
  );
}
