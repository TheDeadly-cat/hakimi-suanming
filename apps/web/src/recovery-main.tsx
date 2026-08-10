import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { ReleaseDatabaseDescriptor } from "../release-protocol";
import {
  captureOrphanedV13Backup,
  type OrphanedV13Disposition
} from "./lib/orphaned-v13-rescue";
import type { PrebootRecoveryState } from "./lib/preboot-database-inventory";
import {
  OrphanedV13RecoveryPage,
  type OrphanedV13RecoveryState
} from "./pages/orphaned-v13-recovery-page";
import "./styles.css";

type RecoveryDisposition = Exclude<PrebootRecoveryState, { kind: "normal" }>;

function pageState(disposition: RecoveryDisposition): OrphanedV13RecoveryState {
  if (disposition.kind === "orphaned_v13") {
    return {
      kind: disposition.kind,
      reasonCode: disposition.reasonCode,
      inventory: disposition.inventory,
      sourceDatabaseName: disposition.sourceDatabaseName,
      nativeVersion: disposition.sourceNativeVersion
    };
  }
  return {
    kind: disposition.kind,
    reasonCode: disposition.reasonCode,
    inventory: disposition.inventory
  };
}

export function mountPrebootRecovery(
  disposition: RecoveryDisposition,
  descriptor: ReleaseDatabaseDescriptor
): void {
  const root = document.getElementById("root");
  if (!root) throw new Error("缺少只读恢复页根节点。");

  const captureBackup = disposition.kind === "orphaned_v13"
    ? () => captureOrphanedV13Backup(
      disposition as OrphanedV13Disposition,
      descriptor
    )
    : async () => {
      throw new Error("当前本地数据库布局不满足只读备份条件。");
    };

  createRoot(root).render(
    <StrictMode>
      <OrphanedV13RecoveryPage
        state={pageState(disposition)}
        captureBackup={captureBackup}
      />
    </StrictMode>
  );
}
