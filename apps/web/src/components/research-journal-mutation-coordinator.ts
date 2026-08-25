export type JournalMutationKind =
  | "note-save"
  | "note-lifecycle"
  | "event-save"
  | "event-lifecycle"
  | "event-time-migration";

export type JournalMutation = Readonly<{
  token: number;
  kind: JournalMutationKind;
  requestedCaseId: string;
}>;

export type JournalMutationClues = {
  targetKind: "research_note" | "event";
  targetId: string | null;
  action: string;
  expectedState: string;
  draftIdentity: string;
};

export type JournalMutationIssuePhase = "call_unknown" | "returned_unreconciled";

export type JournalMutationIssue = Readonly<JournalMutationClues & {
  phase: JournalMutationIssuePhase;
  operationToken: number;
  requestedCaseId: string;
  detail: string;
}>;

export type ResearchJournalMutationSnapshot =
  | Readonly<{ status: "idle"; operation: null; issue: null }>
  | Readonly<{ status: "writing"; operation: JournalMutation; issue: null }>
  | Readonly<{ status: "call_unknown"; operation: null; issue: JournalMutationIssue }>;

const idleSnapshot: ResearchJournalMutationSnapshot = Object.freeze({
  status: "idle",
  operation: null,
  issue: null
});

let nextOperationToken = 0;
let currentSnapshot: ResearchJournalMutationSnapshot = idleSnapshot;
const listeners = new Set<() => void>();

function publish(nextSnapshot: ResearchJournalMutationSnapshot): void {
  currentSnapshot = nextSnapshot;
  for (const listener of [...listeners]) listener();
}

export function getResearchJournalMutationSnapshot(): ResearchJournalMutationSnapshot {
  return currentSnapshot;
}

export function subscribeResearchJournalMutation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function acquireResearchJournalMutation(
  kind: JournalMutationKind,
  requestedCaseId: string
): JournalMutation | null {
  if (currentSnapshot.status !== "idle") return null;
  const operation = Object.freeze({
    token: ++nextOperationToken,
    kind,
    requestedCaseId
  });
  publish(Object.freeze({ status: "writing", operation, issue: null }));
  return operation;
}

export function isCurrentResearchJournalMutation(operation: JournalMutation): boolean {
  return currentSnapshot.status === "writing" && currentSnapshot.operation === operation;
}

export function releaseResearchJournalMutation(operation: JournalMutation): boolean {
  if (!isCurrentResearchJournalMutation(operation)) return false;
  publish(idleSnapshot);
  return true;
}

export function lockResearchJournalMutationUnknown(
  operation: JournalMutation,
  clues: JournalMutationClues,
  detail: string,
  phase: JournalMutationIssuePhase = "call_unknown"
): JournalMutationIssue | null {
  if (!isCurrentResearchJournalMutation(operation)) return null;
  const issue = Object.freeze({
    ...clues,
    phase,
    operationToken: operation.token,
    requestedCaseId: operation.requestedCaseId,
    detail
  });
  publish(Object.freeze({ status: "call_unknown", operation: null, issue }));
  return issue;
}

/** Test isolation only; production recovery must never clear an unknown write in place. */
export function resetResearchJournalMutationCoordinatorForTests(): void {
  if (import.meta.env.MODE !== "test") {
    throw new Error("ResearchJournal mutation coordinator reset is test-only.");
  }
  nextOperationToken = 0;
  publish(idleSnapshot);
}
