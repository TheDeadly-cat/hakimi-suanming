export type PreparedFileDeliveryIntent = "chosen_location" | "download" | "share";

export type PreparedFileDeliveryOperation = Readonly<{
  token: number;
  intent: PreparedFileDeliveryIntent;
  filename: string;
  bytes: number;
  sha256: string | null;
  startedAt: string;
  artifactDescriptor: string;
}>;

export type PreparedFileDeliveryIssue = Readonly<{
  kind: "requested" | "uncertain";
  operation: PreparedFileDeliveryOperation;
  detail: string;
}>;

export type PreparedFileDeliverySnapshot =
  | Readonly<{ status: "idle"; operation: null; issue: null }>
  | Readonly<{ status: "in_flight"; operation: PreparedFileDeliveryOperation; issue: null }>
  | Readonly<{ status: "manual_check_required"; operation: null; issue: PreparedFileDeliveryIssue }>;

const idleSnapshot: PreparedFileDeliverySnapshot = Object.freeze({
  status: "idle",
  operation: null,
  issue: null
});

let nextOperationToken = 0;
let currentSnapshot: PreparedFileDeliverySnapshot = idleSnapshot;
const listeners = new Set<() => void>();
let beforeUnloadGuardAttached = false;

function guardUnreconciledDeliveryExit(event: BeforeUnloadEvent): void {
  event.preventDefault();
  event.returnValue = "";
}

function synchronizeBeforeUnloadGuard(nextSnapshot: PreparedFileDeliverySnapshot): void {
  if (typeof window === "undefined") return;
  const shouldGuard = nextSnapshot.status !== "idle";
  if (shouldGuard === beforeUnloadGuardAttached) return;
  if (shouldGuard) {
    window.addEventListener("beforeunload", guardUnreconciledDeliveryExit);
  } else {
    window.removeEventListener("beforeunload", guardUnreconciledDeliveryExit);
  }
  beforeUnloadGuardAttached = shouldGuard;
}

function publish(nextSnapshot: PreparedFileDeliverySnapshot): void {
  currentSnapshot = nextSnapshot;
  synchronizeBeforeUnloadGuard(nextSnapshot);
  for (const listener of [...listeners]) listener();
}

export function getPreparedFileDeliverySnapshot(): PreparedFileDeliverySnapshot {
  return currentSnapshot;
}

export function subscribePreparedFileDelivery(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function acquirePreparedFileDelivery(
  input: Omit<PreparedFileDeliveryOperation, "token">
): PreparedFileDeliveryOperation | null {
  if (currentSnapshot.status !== "idle") return null;
  const operation = Object.freeze({ ...input, token: ++nextOperationToken });
  publish(Object.freeze({ status: "in_flight", operation, issue: null }));
  return operation;
}

export function isCurrentPreparedFileDelivery(
  operation: PreparedFileDeliveryOperation
): boolean {
  return currentSnapshot.status === "in_flight" && currentSnapshot.operation === operation;
}

export function releasePreparedFileDelivery(
  operation: PreparedFileDeliveryOperation
): boolean {
  if (!isCurrentPreparedFileDelivery(operation)) return false;
  publish(idleSnapshot);
  return true;
}

export function requirePreparedFileDeliveryManualCheck(
  operation: PreparedFileDeliveryOperation,
  kind: PreparedFileDeliveryIssue["kind"],
  detail: string
): PreparedFileDeliveryIssue | null {
  if (!isCurrentPreparedFileDelivery(operation)) return null;
  const issue = Object.freeze({ kind, operation, detail });
  publish(Object.freeze({ status: "manual_check_required", operation: null, issue }));
  return issue;
}

export function acknowledgePreparedFileDeliveryIssue(
  issue: PreparedFileDeliveryIssue
): boolean {
  if (currentSnapshot.status !== "manual_check_required" || currentSnapshot.issue !== issue) {
    return false;
  }
  publish(idleSnapshot);
  return true;
}

/** Test isolation only; production acknowledgement must name the current exact issue. */
export function resetPreparedFileDeliveryCoordinatorForTests(): void {
  if (import.meta.env.MODE !== "test") {
    throw new Error("Prepared file delivery coordinator reset is test-only.");
  }
  nextOperationToken = 0;
  publish(idleSnapshot);
}
