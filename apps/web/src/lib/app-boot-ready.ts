import { useSyncExternalStore } from "react";
import { CURRENT_RELEASE_ENGINEERING_IDENTITY } from "./current-release";

const APP_BOOT_READY_EVENT = "hakimi:app-boot-ready";
const APP_BOOT_READY_ATTRIBUTES = [
  "data-app-boot-ready",
  "data-db-generation",
  "data-db-schema",
  "data-release-contract",
  "data-target-schema",
  "data-migration-id",
  "data-engineering-evidence-only",
  "data-public-release-authorized",
  "data-expert-truth-claimed",
  "data-mutation-epoch-bypassed"
] as const;

function ensureDevelopmentReleaseIdentity(root: HTMLElement): void {
  if (import.meta.env.PROD) return;
  root.dataset.releaseContract ??= CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration;
  root.dataset.targetSchema ??= String(CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema);
  root.dataset.migrationId ??= CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null";
}

function hasCurrentBootGovernance(root: HTMLElement): boolean {
  const dataset = root.dataset;
  return dataset.dbGeneration === CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration
    && dataset.dbSchema === String(CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema)
    && dataset.releaseContract === CURRENT_RELEASE_ENGINEERING_IDENTITY.dbGeneration
    && dataset.targetSchema === String(CURRENT_RELEASE_ENGINEERING_IDENTITY.targetSchema)
    && dataset.migrationId === (CURRENT_RELEASE_ENGINEERING_IDENTITY.migrationId ?? "null")
    && dataset.engineeringEvidenceOnly === "true"
    && dataset.publicReleaseAuthorized === "false"
    && dataset.expertTruthClaimed === "false"
    && dataset.mutationEpochBypassed === "false";
}

export function isAppBootReady(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const root = document.documentElement;
    return root.dataset.appBootReady === "true" && hasCurrentBootGovernance(root);
  } catch {
    return false;
  }
}

export function setAppBootReadyState(ready: boolean): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const root = document.documentElement;
  ensureDevelopmentReleaseIdentity(root);
  const requestedReady = ready === true;
  const nextReady = requestedReady && hasCurrentBootGovernance(root);
  if (requestedReady && !nextReady) {
    root.dataset.appBootReadyRejection = "RELEASE_GOVERNANCE_MISMATCH";
  } else {
    delete root.dataset.appBootReadyRejection;
  }
  const changed = root.dataset.appBootReady !== String(nextReady);
  root.dataset.appBootReady = String(nextReady);
  root.setAttribute("aria-busy", String(!nextReady));
  if (!changed) return;
  try {
    window.dispatchEvent(new Event(APP_BOOT_READY_EVENT));
  } catch {
    // The dataset is the authoritative snapshot; observer notification cannot
    // roll back or promote the boot state.
  }
}

function subscribeToAppBootReady(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  let observer: MutationObserver | null = null;
  const handlePageShow = () => onStoreChange();
  window.addEventListener(APP_BOOT_READY_EVENT, onStoreChange);
  window.addEventListener("pageshow", handlePageShow);
  if (typeof document !== "undefined" && typeof MutationObserver === "function") {
    try {
      observer = new MutationObserver(onStoreChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [...APP_BOOT_READY_ATTRIBUTES]
      });
    } catch {
      observer?.disconnect();
      observer = null;
    }
  }
  return () => {
    window.removeEventListener(APP_BOOT_READY_EVENT, onStoreChange);
    window.removeEventListener("pageshow", handlePageShow);
    observer?.disconnect();
  };
}

export function useAppBootReady(): boolean {
  return useSyncExternalStore(subscribeToAppBootReady, isAppBootReady, () => false);
}
