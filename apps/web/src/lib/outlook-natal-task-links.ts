import type { NatalStructureDetailKind } from "../../../../packages/bazi-interpretation/src/natal-structure-detail";
import type { OutlookRescueObject, OutlookRescueRef } from "./outlook-rescue-trace";

export const OUTLOOK_NATAL_TASK_LINKS_VERSION = "hakimi.outlook-natal-task-links/0.1.0" as const;
export interface OutlookNatalTaskFunction {
  operation: "generate" | "control";
  from: OutlookRescueObject;
  to: OutlookRescueObject;
}
export interface OutlookNatalTaskLink {
  id: string;
  taskId: NatalStructureDetailKind;
  /** More than one protected task may share one physical pivot. */
  pivots: OutlookRescueObject[];
  functions: OutlookNatalTaskFunction[];
  roots: {
    object: OutlookRescueObject;
    natal: OutlookRescueObject[];
    background: OutlookRescueObject[];
    target: OutlookRescueObject[];
  }[];
  relations: {
    operation: "control" | "combine";
    from: OutlookRescueObject;
    to: OutlookRescueObject;
    /** The original pattern boolean, not a score or independent prediction. */
    contributesPressure: boolean;
    refs: OutlookRescueRef[];
  }[];
  /** Indexes into this axis's unchanged target-only stemActions.items. */
  targetActionIndexes: number[];
  conditionRefs: OutlookRescueRef[];
  evidenceRefs: OutlookRescueRef[];
}
export interface OutlookNatalTaskLinks {
  version: typeof OUTLOOK_NATAL_TASK_LINKS_VERSION;
  natalTaskVersion: string;
  items: OutlookNatalTaskLink[];
}
