import type { TransitNode, TransitNodeRef } from "@hakimi/contracts";
import type { TenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import type { FiveElement } from "../../../../packages/bazi-interpretation/src/strength-assessment-core";
import type { LocalOutlookJudgment } from "./local-outlook-judgment";

export const OUTLOOK_RESCUE_TRACE_VERSION = "hakimi.outlook-rescue-trace/0.1.0" as const;
export type OutlookRescueKind = "wealth_moderates_resource" | "wealth_resource_protection" | "counter_obstacle"
  | "combine_output_protect_official" | "wealth_protects_food" | "output_bridges_peer_wealth"
  | "wealth_controls_owl" | "seasonal_stem_protection";
export type OutlookRescueOperation = "control" | "combine" | "flow";
export interface OutlookRescueRef {
  axisId: string;
  field: "rescues" | "unresolvedConditions" | "blockers" | "evidence" | "satisfiedConditions";
  index: number;
}
export interface OutlookRescueObject {
  id: string;
  origin: { kind: "natal"; position: "year" | "month" | "day" | "hour" }
    | { kind: "target" | "background"; nodeRef: TransitNodeRef };
  stem: string; tenGod: string; group: TenGodGroup; element: FiveElement; label: string;
  visibility: "visible" | "main_hidden" | "other_hidden" | "month_command";
  branch: string | null; hiddenIndex: number | null;
}
export interface OutlookRescueEdge {
  operation: "control" | "combine";
  from: OutlookRescueObject; to: OutlookRescueObject; refs: OutlookRescueRef[];
}
export interface OutlookRescueTrace {
  id: string; axisId: string; pathId: string; kind: OutlookRescueKind;
  /** The helper-to-obstacle action; never the obstacle-to-protected edge. */
  operation: OutlookRescueOperation;
  helpers: OutlookRescueObject[]; obstacles: OutlookRescueObject[]; protectedObjects: OutlookRescueObject[];
  helperRoots: { helperId: string; roots: OutlookRescueObject[] }[];
  candidateStatus: "available_candidate" | "constrained_candidate" | "conditional_candidate";
  constraintCheck: "checked" | "not_evaluated";
  /** Only whether this existing calculation branch adds its support boolean. */
  countsAsSupport: boolean;
  constraints: OutlookRescueEdge[];
  obstacleRelations: OutlookRescueEdge[];
  counterEffects: { operation: "generate"; status: "present" | "conditional";
    from: OutlookRescueObject; targets: OutlookRescueObject[]; refs: OutlookRescueRef[] }[];
  rescueRefs: OutlookRescueRef[]; conditionRefs: OutlookRescueRef[];
  blockerRefs: OutlookRescueRef[]; evidenceRefs: OutlookRescueRef[];
}
export type OutlookRescueNodeDescriptor = Pick<TransitNode, "nodeType" | "ganZhi" | "ref">;
export interface VerifyOutlookRescuesInput {
  judgment: LocalOutlookJudgment;
  /** Caller supplies descriptors from the already identity-checked exact segment. */
  target: OutlookRescueNodeDescriptor;
  backgrounds: readonly OutlookRescueNodeDescriptor[];
}
export interface OutlookRescueTraceBundle {
  version: typeof OUTLOOK_RESCUE_TRACE_VERSION;
  sourceBinding: LocalOutlookJudgment["sourceBinding"];
  targetRef: TransitNodeRef; backgroundRefs: TransitNodeRef[];
  interval: LocalOutlookJudgment["interval"];
  /** All original scoped constraints remain available even when no rescue exists. */
  scopeConditionRefs: OutlookRescueRef[];
  items: OutlookRescueTrace[];
}
