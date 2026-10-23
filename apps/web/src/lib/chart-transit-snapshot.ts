import type { TransitSnapshot } from "@hakimi/contracts";
import {
  calculateTransitSnapshot,
  requireHistoricalTransitSnapshotExecutor,
  TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0,
  TransitCoreError,
  type TransitSnapshotInput
} from "@hakimi/transit-core";
import type { TransitSelection } from "./transit-route";

function containsExactNode(snapshot: TransitSnapshot, selection: TransitSelection): boolean {
  return snapshot.tracks[selection.nodeType].some((node) => node.ref.nodeId === selection.nodeId);
}

/** A saved node can select a retained whole snapshot; it never changes current calculations. */
export async function calculateChartRouteTransitSnapshot(
  input: TransitSnapshotInput,
  selection: TransitSelection | null
): Promise<TransitSnapshot> {
  // Own the request across both asynchronous attempts, including caller-owned
  // Revision data and selection. Both executors receive this exact same input.
  const capturedInput = structuredClone(input);
  const capturedSelection = selection ? { ...selection } : null;
  const current = await calculateTransitSnapshot(capturedInput);
  if (!capturedSelection || containsExactNode(current, capturedSelection)) return current;

  const historical = await requireHistoricalTransitSnapshotExecutor(
    TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR_V1_2_0
  ).calculateSnapshot(capturedInput);
  if (containsExactNode(historical, capturedSelection)) return historical;

  throw new TransitCoreError(
    "STALE_NODE_REF",
    "运限节点深链不属于当前 Revision 的精确切片或已保留的 v1.2 切片；不会定位到同名、相邻或未知版本节点。"
  );
}
