import {
  CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION,
  CANDIDATE_SET_TZDB_CHANGED_FIELDS,
  LEGACY_CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION,
  LEGACY_CANDIDATE_SET_TZDB_CHANGED_FIELDS,
  candidateSetTzdbComparisonV2Schema,
  legacyCandidateSetTzdbComparisonSchema,
  unknownHourCandidateResultSchema,
  type CandidateSetTzdbComparisonV2,
  type CandidateSetTzdbResolutionFingerprint,
  type LegacyCandidateSetTzdbComparison,
  type UnknownHourCandidateResult
} from "@hakimi/contracts";

/**
 * Pure storage-domain primitives shared by repositories and backup Workers.
 * Keep this entry free of Dexie, IndexedDB access and repository singletons.
 */

export type DependentDataCounts = {
  researchNotes: number;
  events: number;
  savedViews: number;
  citations: number;
  attachments: number;
};

export class CoreDataReplaceBlockedError extends Error {
  readonly code = "DEPENDENT_RESEARCH_DATA_EXISTS" as const;

  constructor(readonly counts: DependentDataCounts) {
    super(
      "Core Case/Revision replacement was blocked because dependent research or citation data exists."
    );
    this.name = "CoreDataReplaceBlockedError";
  }
}

export class CoreDataIdentityConflictError extends Error {
  readonly code = "CROSS_PARTITION_ID_CONFLICT" as const;

  constructor(readonly conflictingIds: string[]) {
    super(`Incoming core data conflicts with retained data partition IDs: ${conflictingIds.join(", ")}`);
    this.name = "CoreDataIdentityConflictError";
  }
}

export class FullDataReplaceConflictError extends Error {
  readonly code = "CURRENT_DATA_CHANGED" as const;

  constructor() {
    super("Current data changed after the restore safety snapshot was created.");
    this.name = "FullDataReplaceConflictError";
  }
}

export class FullDataIdentityConflictError extends Error {
  readonly code = "CROSS_PARTITION_ID_CONFLICT" as const;

  constructor(readonly conflictingIds: string[]) {
    super(`Incoming full data contains IDs shared by multiple partitions: ${conflictingIds.join(", ")}`);
    this.name = "FullDataIdentityConflictError";
  }
}

type CandidateProbe = UnknownHourCandidateResult["candidates"][number];

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function orderedProbeVariants(candidate: CandidateProbe) {
  return [...candidate.variants].sort((left, right) =>
    left.choice < right.choice ? -1 : left.choice > right.choice ? 1 : 0
  );
}

const resolutionChoiceOrder = { unique: 0, earlier: 1, later: 2 } as const;

function probeResolutionFingerprint(candidate: CandidateProbe): CandidateSetTzdbResolutionFingerprint {
  const resolution = candidate.timeCalibration.timeZoneResolution;
  return {
    kind: resolution.kind,
    policy: resolution.policy,
    status: resolution.status,
    requestedWallTime: resolution.requestedWallTime,
    candidates: [...resolution.candidates]
      .sort((left, right) => resolutionChoiceOrder[left.choice] - resolutionChoiceOrder[right.choice])
      .map((entry) => ({ ...entry })),
    selectedCandidate: resolution.selectedCandidate === null ? null : { ...resolution.selectedCandidate }
  };
}

function probeFourPillars(candidate: CandidateProbe) {
  return orderedProbeVariants(candidate).map((variant) => ({
    choice: variant.choice,
    pillars: (["year", "month", "day", "hour"] as const).map((key) => ({
      key,
      stem: variant.chart.facts.pillars[key].stem,
      branch: variant.chart.facts.pillars[key].branch,
      ganZhi: variant.chart.facts.pillars[key].ganZhi
    }))
  }));
}

/** Frozen v1 comparator used only to verify already-persisted receipt v1 records. */
export function buildLegacyCandidateSetTzdbComparison(
  sourceCandidateSet: UnknownHourCandidateResult,
  targetCandidateSet: UnknownHourCandidateResult
): LegacyCandidateSetTzdbComparison {
  const source = unknownHourCandidateResultSchema.parse(structuredClone(sourceCandidateSet));
  const target = unknownHourCandidateResultSchema.parse(structuredClone(targetCandidateSet));
  const probeDiffs = source.candidates.map((sourceProbe, index) => {
    const targetProbe = target.candidates[index];
    if (!targetProbe || targetProbe.candidateId !== sourceProbe.candidateId) {
      throw new TypeError(`CandidateSet probe order mismatch at index ${index}.`);
    }
    const sourceVariants = orderedProbeVariants(sourceProbe);
    const targetVariants = orderedProbeVariants(targetProbe);
    const changed = new Set<(typeof LEGACY_CANDIDATE_SET_TZDB_CHANGED_FIELDS)[number]>();
    if (sourceProbe.status !== targetProbe.status) changed.add("status");
    if (sourceProbe.timeCalibration.timeZoneResolution.kind !== targetProbe.timeCalibration.timeZoneResolution.kind) {
      changed.add("time_resolution_kind");
    }
    if ((sourceProbe.unresolvedReason?.code ?? null) !== (targetProbe.unresolvedReason?.code ?? null)) {
      changed.add("unresolved_reason");
    }
    if (!sameJsonValue(sourceVariants.map((variant) => variant.choice), targetVariants.map((variant) => variant.choice))) {
      changed.add("variant_choices");
    }
    if (!sameJsonValue(sourceVariants.map((variant) => variant.instant), targetVariants.map((variant) => variant.instant))) {
      changed.add("variant_instants");
    }
    if (!sameJsonValue(sourceVariants.map((variant) => variant.utcOffset), targetVariants.map((variant) => variant.utcOffset))) {
      changed.add("variant_offsets");
    }
    if (!sameJsonValue(probeFourPillars(sourceProbe), probeFourPillars(targetProbe))) {
      changed.add("four_pillars");
    }
    const changedFields = LEGACY_CANDIDATE_SET_TZDB_CHANGED_FIELDS.filter((field) => changed.has(field));
    const behaviorChanged = changedFields.length > 0;
    const hashChanged = behaviorChanged || !sameJsonValue(
      sourceVariants.map((variant) => variant.chartResultHash),
      targetVariants.map((variant) => variant.chartResultHash)
    );
    return {
      candidateId: sourceProbe.candidateId,
      sourceStatus: sourceProbe.status,
      targetStatus: targetProbe.status,
      behaviorChanged,
      hashChanged,
      changedFields
    };
  });
  return legacyCandidateSetTzdbComparisonSchema.parse({
    formatVersion: LEGACY_CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION,
    source: { tzdbVersion: source.tzdbVersion, resultHash: source.resultHash },
    target: { tzdbVersion: target.tzdbVersion, resultHash: target.resultHash },
    probeDiffs,
    behaviorChangedCount: probeDiffs.filter((probe) => probe.behaviorChanged).length,
    hashOnlyChangedCount: probeDiffs.filter((probe) => !probe.behaviorChanged && probe.hashChanged).length,
    unchangedCount: probeDiffs.filter((probe) => !probe.behaviorChanged && !probe.hashChanged).length
  });
}

/** Deterministic, behavior-first comparison used by repositories and backup verification. */
export function buildCandidateSetTzdbComparison(
  sourceCandidateSet: UnknownHourCandidateResult,
  targetCandidateSet: UnknownHourCandidateResult
): CandidateSetTzdbComparisonV2 {
  const source = unknownHourCandidateResultSchema.parse(structuredClone(sourceCandidateSet));
  const target = unknownHourCandidateResultSchema.parse(structuredClone(targetCandidateSet));
  const probeDiffs = source.candidates.map((sourceProbe, index) => {
    const targetProbe = target.candidates[index];
    if (!targetProbe || targetProbe.candidateId !== sourceProbe.candidateId) {
      throw new TypeError(`CandidateSet probe order mismatch at index ${index}.`);
    }
    const sourceVariants = orderedProbeVariants(sourceProbe);
    const targetVariants = orderedProbeVariants(targetProbe);
    const sourceResolutionFingerprint = probeResolutionFingerprint(sourceProbe);
    const targetResolutionFingerprint = probeResolutionFingerprint(targetProbe);
    const changed = new Set<(typeof CANDIDATE_SET_TZDB_CHANGED_FIELDS)[number]>();
    if (sourceProbe.status !== targetProbe.status) changed.add("status");
    if (sourceResolutionFingerprint.kind !== targetResolutionFingerprint.kind) {
      changed.add("time_resolution_kind");
    }
    if (!sameJsonValue(sourceResolutionFingerprint.candidates, targetResolutionFingerprint.candidates)) {
      changed.add("time_resolution_candidates");
    }
    if (!sameJsonValue(sourceResolutionFingerprint, targetResolutionFingerprint)) {
      changed.add("time_resolution_fingerprint");
    }
    if ((sourceProbe.unresolvedReason?.code ?? null) !== (targetProbe.unresolvedReason?.code ?? null)) {
      changed.add("unresolved_reason");
    }
    if (!sameJsonValue(sourceVariants.map((variant) => variant.choice), targetVariants.map((variant) => variant.choice))) {
      changed.add("variant_choices");
    }
    if (!sameJsonValue(sourceVariants.map((variant) => variant.instant), targetVariants.map((variant) => variant.instant))) {
      changed.add("variant_instants");
    }
    if (!sameJsonValue(sourceVariants.map((variant) => variant.utcOffset), targetVariants.map((variant) => variant.utcOffset))) {
      changed.add("variant_offsets");
    }
    if (!sameJsonValue(probeFourPillars(sourceProbe), probeFourPillars(targetProbe))) {
      changed.add("four_pillars");
    }
    const changedFields = CANDIDATE_SET_TZDB_CHANGED_FIELDS.filter((field) => changed.has(field));
    const behaviorChanged = changedFields.length > 0;
    const hashChanged = behaviorChanged || !sameJsonValue(
      sourceVariants.map((variant) => variant.chartResultHash),
      targetVariants.map((variant) => variant.chartResultHash)
    );
    return {
      candidateId: sourceProbe.candidateId,
      sourceStatus: sourceProbe.status,
      targetStatus: targetProbe.status,
      sourceResolutionFingerprint,
      targetResolutionFingerprint,
      behaviorChanged,
      hashChanged,
      changedFields
    };
  });
  return candidateSetTzdbComparisonV2Schema.parse({
    formatVersion: CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION,
    source: { tzdbVersion: source.tzdbVersion, resultHash: source.resultHash },
    target: { tzdbVersion: target.tzdbVersion, resultHash: target.resultHash },
    probeDiffs,
    behaviorChangedCount: probeDiffs.filter((probe) => probe.behaviorChanged).length,
    hashOnlyChangedCount: probeDiffs.filter((probe) => !probe.behaviorChanged && probe.hashChanged).length,
    unchangedCount: probeDiffs.filter((probe) => !probe.behaviorChanged && !probe.hashChanged).length
  });
}
