import type {
  FormalComparisonProjection,
  PairStructureResearchProjection,
  TransitNodeType,
  TransitSlot
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";

export const FORMAL_COMPARISON_GOLDEN_FIXTURE_ID = "formal-comparison-engineering-regression-v1" as const;
export const FORMAL_COMPARISON_GOLDEN_FIXTURE_VERSION = "1.1.0" as const;
export const FORMAL_COMPARISON_GOLDEN_EVIDENCE_STATUS = "engineering_regression_only" as const;
export const PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_ID = "pair-structure-research-engineering-regression-v1" as const;
export const PAIR_STRUCTURE_RESEARCH_GOLDEN_FIXTURE_VERSION = "1.1.0" as const;
export const PAIR_STRUCTURE_RESEARCH_GOLDEN_EVIDENCE_STATUS = "engineering_regression_only" as const;
const TRANSIT_NODE_TYPES: readonly TransitNodeType[] = ["dayun", "xiaoyun", "year", "month", "day", "hour"];

function summarizeTransitSlot(slot: TransitSlot) {
  if (slot.status !== "resolved") {
    return {
      status: slot.status,
      reasonCode: slot.reasonCode,
      message: slot.message
    };
  }
  return {
    status: slot.status,
    nodeType: slot.node.nodeType,
    ganZhi: slot.node.ganZhi,
    label: slot.node.label,
    startInstant: slot.node.startInstant,
    endExclusiveInstant: slot.node.endExclusiveInstant,
    nodeId: slot.node.ref.nodeId
  };
}

/**
 * Human-reviewable golden projection. Full revision/track payloads are represented by independently
 * recomputable digests while every aligned row and cell remains explicit.
 */
export async function summarizeFormalComparisonProjection(projection: FormalComparisonProjection) {
  return {
    schemaVersion: projection.schemaVersion,
    kind: projection.kind,
    baselineSlotId: projection.baselineSlotId,
    targetInstant: projection.targetInstant,
    items: projection.matrix.items.map((item) => ({
      key: item.key,
      slotId: item.slotId,
      caseId: item.caseId,
      caseAlias: item.caseAlias,
      revisionId: item.revision.id,
      revisionNumber: item.revision.revisionNumber,
      revisionSnapshotDigest: item.revisionSnapshotDigest,
      resultHash: item.revision.manifest.resultHash,
      ruleProfileDigest: item.revision.manifest.ruleProfileDigest,
      rulePackBinding: item.revision.rulePackBinding ?? null,
      luckCycleRuleDigest: item.revision.manifest.luckCycleRuleDigest ?? null,
      manualDirection: item.manualDirection
    })),
    sections: projection.matrix.sections.map((section) => ({
      category: section.category,
      label: section.label,
      differenceCount: section.differenceCount,
      rows: section.rows.map((row) => ({
        id: row.id,
        category: row.category,
        label: row.label,
        values: row.values,
        cells: row.cells,
        status: row.status,
        different: row.different
      }))
    })),
    rowCount: projection.matrix.rowCount,
    differenceCount: projection.matrix.differenceCount,
    changedCategories: projection.matrix.changedCategories,
    sameBirthInput: projection.matrix.sameBirthInput,
    transits: projection.transits.map((result) => {
      if (result.status === "error") return result;
      return {
        itemKey: result.itemKey,
        status: result.status,
        resultHash: result.snapshot.resultHash,
        target: result.snapshot.target,
        manualDirection: result.snapshot.manualDirection,
        luckCycleRuleSource: result.snapshot.luckCycleRuleSource,
        slots: Object.fromEntries(TRANSIT_NODE_TYPES.map((nodeType) => [
          nodeType,
          summarizeTransitSlot(result.snapshot.slots[nodeType])
        ])),
        trackLengths: Object.fromEntries(TRANSIT_NODE_TYPES.map((nodeType) => [
          nodeType,
          result.snapshot.tracks[nodeType].length
        ])),
        warnings: result.snapshot.warnings,
        knownGaps: result.snapshot.knownGaps
      };
    }),
    manifest: projection.manifest,
    projectionObjectDigest: await sha256Hex(projection)
  };
}

type PairTransitResult = PairStructureResearchProjection["participants"][number]["transit"];

function summarizePairTransit(result: PairTransitResult) {
  if (result.status === "error") return result;
  return {
    itemKey: result.itemKey,
    status: result.status,
    resultHash: result.snapshot.resultHash,
    target: result.snapshot.target,
    manualDirection: result.snapshot.manualDirection,
    luckCycleRuleSource: result.snapshot.luckCycleRuleSource,
    slots: Object.fromEntries(TRANSIT_NODE_TYPES.map((nodeType) => [
      nodeType,
      summarizeTransitSlot(result.snapshot.slots[nodeType])
    ])),
    trackLengths: Object.fromEntries(TRANSIT_NODE_TYPES.map((nodeType) => [
      nodeType,
      result.snapshot.tracks[nodeType].length
    ])),
    warnings: result.snapshot.warnings,
    knownGaps: result.snapshot.knownGaps
  };
}

/**
 * Facts-only pair regression summary. Both participants remain independently auditable; this
 * representation deliberately has no comparison cells, difference counts or pair conclusions.
 */
export async function summarizePairStructureResearchProjection(
  projection: PairStructureResearchProjection
) {
  return {
    schemaVersion: projection.schemaVersion,
    kind: projection.kind,
    policy: projection.policy,
    targetInstant: projection.targetInstant,
    participantCount: projection.participants.length,
    distinctCaseCount: new Set(projection.participants.map((participant) => participant.item.caseId)).size,
    participants: await Promise.all(projection.participants.map(async (participant) => ({
      role: participant.role,
      item: {
        key: participant.item.key,
        slotId: participant.item.slotId,
        caseId: participant.item.caseId,
        caseAlias: participant.item.caseAlias,
        revisionId: participant.item.revision.id,
        revisionNumber: participant.item.revision.revisionNumber,
        revisionSnapshotDigest: participant.item.revisionSnapshotDigest,
        resultHash: participant.item.revision.manifest.resultHash,
        ruleProfileDigest: participant.item.revision.manifest.ruleProfileDigest,
        rulePackBinding: participant.item.revision.rulePackBinding ?? null,
        luckCycleRuleDigest: participant.item.revision.manifest.luckCycleRuleDigest ?? null,
        manualDirection: participant.item.manualDirection
      },
      observationCount: participant.observations.length,
      observationDigest: await sha256Hex(participant.observations),
      observations: participant.observations,
      transit: summarizePairTransit(participant.transit),
      transitObjectDigest: await sha256Hex(participant.transit)
    }))),
    manifest: projection.manifest,
    projectionObjectDigest: await sha256Hex(projection)
  };
}
