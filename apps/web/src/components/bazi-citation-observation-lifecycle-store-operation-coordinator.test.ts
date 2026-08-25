import { beforeEach, describe, expect, it } from "vitest";
import {
  acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion,
  acquireBaziCitationObservationLifecycleStoreOperation,
  cancelBaziCitationObservationLifecycleStoreOperationBeforeMutation,
  completeBaziCitationObservationLifecycleStoreOperation,
  getBaziCitationObservationLifecycleStoreOperationSnapshot,
  isCurrentBaziCitationObservationLifecycleStoreOperation,
  reconcileBaziCitationObservationLifecycleStoreOperationCatalog,
  requireBaziCitationObservationLifecycleStoreOperationReconciliation,
  resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests,
  subscribeBaziCitationObservationLifecycleStoreOperation,
  type BaziCitationObservationLifecycleStoreOperation,
  type BaziCitationObservationLifecycleStoreOperationInput,
  type BaziCitationObservationLifecycleStoreReconciliationIssue
} from "./bazi-citation-observation-lifecycle-store-operation-coordinator";

const SAVE_ATTACHMENT_ID = "11111111-1111-4111-8111-111111111111";
const LOWER_SAVE_ATTACHMENT_ID = "00000000-0000-4000-8000-000000000001";
const DELETE_ATTACHMENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ATTACHMENT_ID = "33333333-3333-4333-8333-333333333333";

function operationInput(
  kind: "save" | "delete" = "save"
): BaziCitationObservationLifecycleStoreOperationInput {
  return {
    kind,
    scopeIdentitySha256: "a".repeat(64),
    expectedContentHash: "b".repeat(64),
    expectedSidecarSha256: "c".repeat(64),
    attachmentId: kind === "save" ? null : DELETE_ATTACHMENT_ID,
    startedAt: "2026-08-25T00:00:00.000Z"
  };
}

function acquire(kind: "save" | "delete" = "save") {
  return acquireBaziCitationObservationLifecycleStoreOperation(operationInput(kind));
}

function catalogOutcome(
  entries: readonly Readonly<{ attachmentId: string; contentHash: string }>[],
  overrides: Readonly<Record<string, unknown>> = {}
) {
  return {
    scopeIdentitySha256: "a".repeat(64),
    coverage: "complete",
    atomicStorageSnapshotVerified: true,
    entries,
    ...overrides
  };
}

function requireIssue(
  operation: BaziCitationObservationLifecycleStoreOperation
): BaziCitationObservationLifecycleStoreReconciliationIssue {
  return requireBaziCitationObservationLifecycleStoreOperationReconciliation(
    operation,
    "call_outcome_unknown"
  )!;
}

beforeEach(() => {
  resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests();
});

describe("Bazi citation observation lifecycle store operation coordinator", () => {
  it("starts idle, grants one frozen safe operation, and rejects unsafe acquisition data", () => {
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toEqual({
      status: "idle",
      operation: null,
      receipt: null,
      issue: null
    });

    let getterCalls = 0;
    const accessor = { ...operationInput() } as Record<string, unknown>;
    Object.defineProperty(accessor, "scopeIdentitySha256", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "a".repeat(64);
      }
    });
    expect(() => acquireBaziCitationObservationLifecycleStoreOperation(accessor)).toThrow(TypeError);
    expect(getterCalls).toBe(0);
    expect(() => acquireBaziCitationObservationLifecycleStoreOperation({
      ...operationInput(),
      raw: "RAW_SENTINEL"
    })).toThrow(TypeError);

    const operation = acquire()!;
    expect(operation).toEqual({ ...operationInput(), token: 1 });
    expect(Object.isFrozen(operation)).toBe(true);
    expect(isCurrentBaziCitationObservationLifecycleStoreOperation(operation)).toBe(true);
    expect(acquire("delete")).toBeNull();
    expect(JSON.stringify(getBaziCitationObservationLifecycleStoreOperationSnapshot()))
      .not.toContain("RAW_SENTINEL");
  });

  it("publishes transitions while preserving singleton state after a view unsubscribes", () => {
    const firstViewCalls: string[] = [];
    const unsubscribeFirstView = subscribeBaziCitationObservationLifecycleStoreOperation(() => {
      firstViewCalls.push(getBaziCitationObservationLifecycleStoreOperationSnapshot().status);
    });
    const operation = acquire()!;
    expect(firstViewCalls).toEqual(["writing"]);
    unsubscribeFirstView();

    const receipt = completeBaziCitationObservationLifecycleStoreOperation(operation, {
      code: "saved_created",
      attachmentId: SAVE_ATTACHMENT_ID
    })!;
    expect(firstViewCalls).toEqual(["writing"]);
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "completed_unacknowledged",
      receipt
    });

    const secondViewCalls: string[] = [];
    const unsubscribeSecondView = subscribeBaziCitationObservationLifecycleStoreOperation(() => {
      secondViewCalls.push(getBaziCitationObservationLifecycleStoreOperationSnapshot().status);
    });
    expect(acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(receipt)).toBe(true);
    expect(secondViewCalls).toEqual(["idle"]);
    unsubscribeSecondView();
  });

  it("keeps a completed receipt until that exact frozen receipt is acknowledged", () => {
    const operation = acquire()!;
    const receipt = completeBaziCitationObservationLifecycleStoreOperation(operation, {
      code: "saved_existing",
      attachmentId: SAVE_ATTACHMENT_ID
    })!;

    expect(Object.isFrozen(receipt)).toBe(true);
    expect(receipt).toEqual({
      operationToken: 1,
      kind: "save",
      code: "saved_existing",
      scopeIdentitySha256: "a".repeat(64),
      expectedContentHash: "b".repeat(64),
      expectedSidecarSha256: "c".repeat(64),
      attachmentId: SAVE_ATTACHMENT_ID,
      startedAt: "2026-08-25T00:00:00.000Z"
    });
    expect(acquire("delete")).toBeNull();
    expect(acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion({ ...receipt }))
      .toBe(false);
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status)
      .toBe("completed_unacknowledged");
    expect(acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(receipt)).toBe(true);
    expect(acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(receipt)).toBe(false);
  });

  it("validates kind-specific completion receipts without unlocking the active write", () => {
    const save = acquire()!;
    expect(completeBaziCitationObservationLifecycleStoreOperation(save, {
      code: "deleted",
      attachmentId: SAVE_ATTACHMENT_ID
    })).toBeNull();
    expect(isCurrentBaziCitationObservationLifecycleStoreOperation(save)).toBe(true);
    const issue = requireIssue(save);
    expect(issue.errorCode).toBe("call_outcome_unknown");

    resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests();
    const deletion = acquire("delete")!;
    expect(completeBaziCitationObservationLifecycleStoreOperation(deletion, {
      code: "deleted",
      attachmentId: OTHER_ATTACHMENT_ID
    })).toBeNull();
    expect(isCurrentBaziCitationObservationLifecycleStoreOperation(deletion)).toBe(true);
    expect(completeBaziCitationObservationLifecycleStoreOperation(deletion, {
      code: "deleted",
      attachmentId: DELETE_ATTACHMENT_ID
    })?.code).toBe("deleted");
  });

  it("unlocks only an exact current operation for a finite proven pre-mutation phase", () => {
    const stale = acquire()!;
    expect(cancelBaziCitationObservationLifecycleStoreOperationBeforeMutation(
      { ...stale },
      "prewrite"
    )).toBe(false);
    expect(cancelBaziCitationObservationLifecycleStoreOperationBeforeMutation(
      stale,
      "write_call_or_postwrite_reinspection" as never
    )).toBe(false);
    expect(isCurrentBaziCitationObservationLifecycleStoreOperation(stale)).toBe(true);
    expect(cancelBaziCitationObservationLifecycleStoreOperationBeforeMutation(
      stale,
      "prewrite"
    )).toBe(true);
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status).toBe("idle");
    expect(cancelBaziCitationObservationLifecycleStoreOperationBeforeMutation(
      stale,
      "prewrite"
    )).toBe(false);
  });

  it("does not let a stale or copied operation complete or lock a newer write", () => {
    const stale = acquire()!;
    const staleReceipt = completeBaziCitationObservationLifecycleStoreOperation(stale, {
      code: "saved_created",
      attachmentId: SAVE_ATTACHMENT_ID
    })!;
    acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(staleReceipt);
    const current = acquire("delete")!;

    expect(completeBaziCitationObservationLifecycleStoreOperation(stale, {
      code: "saved_existing",
      attachmentId: SAVE_ATTACHMENT_ID
    })).toBeNull();
    expect(requireBaziCitationObservationLifecycleStoreOperationReconciliation(
      stale,
      "operation_interrupted"
    )).toBeNull();
    expect(completeBaziCitationObservationLifecycleStoreOperation({ ...current }, {
      code: "deleted",
      attachmentId: DELETE_ATTACHMENT_ID
    })).toBeNull();
    expect(acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(staleReceipt))
      .toBe(false);
    expect(isCurrentBaziCitationObservationLifecycleStoreOperation(current)).toBe(true);
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "writing",
      operation: current
    });
  });

  it("allows only finite reconciliation codes and requires the exact issue identity", () => {
    const operation = acquire()!;
    expect(requireBaziCitationObservationLifecycleStoreOperationReconciliation(
      operation,
      "freeform RAW_SENTINEL" as never
    )).toBeNull();
    expect(isCurrentBaziCitationObservationLifecycleStoreOperation(operation)).toBe(true);
    const issue = requireIssue(operation);
    expect(Object.isFrozen(issue)).toBe(true);
    expect(acquire("delete")).toBeNull();

    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      { ...issue },
      catalogOutcome([])
    )).toBe("rejected");
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "reconciliation_required",
      issue
    });
  });

  it("resolves an unknown save as completed when an exact content hash is present", () => {
    const issue = requireIssue(acquire()!);
    const resolution = reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([
        { attachmentId: SAVE_ATTACHMENT_ID, contentHash: "b".repeat(64) }
      ])
    );

    expect(resolution).toBe("completed");
    const snapshot = getBaziCitationObservationLifecycleStoreOperationSnapshot();
    expect(snapshot.status).toBe("completed_unacknowledged");
    if (snapshot.status !== "completed_unacknowledged") throw new Error("expected receipt");
    expect(snapshot.receipt.code).toBe("saved_present_after_reconciliation");
    expect(snapshot.receipt.attachmentId).toBe(SAVE_ATTACHMENT_ID);
  });

  it("keeps an unknown save locked when the expected content hash appears more than once", () => {
    const issue = requireIssue(acquire()!);
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([
        { attachmentId: SAVE_ATTACHMENT_ID, contentHash: "b".repeat(64) },
        { attachmentId: LOWER_SAVE_ATTACHMENT_ID, contentHash: "b".repeat(64) }
      ])
    )).toBe("locked");
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "reconciliation_required",
      issue
    });
  });

  it("resolves an unknown save as idle only after a complete atomic catalog proves absence", () => {
    const issue = requireIssue(acquire()!);
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([{ attachmentId: OTHER_ATTACHMENT_ID, contentHash: "d".repeat(64) }])
    )).toBe("idle");
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status).toBe("idle");
  });

  it("resolves an unknown delete as completed when absent and idle when the exact record remains", () => {
    let issue = requireIssue(acquire("delete")!);
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([])
    )).toBe("completed");
    let snapshot = getBaziCitationObservationLifecycleStoreOperationSnapshot();
    expect(snapshot.status).toBe("completed_unacknowledged");
    if (snapshot.status !== "completed_unacknowledged") throw new Error("expected receipt");
    expect(snapshot.receipt.code).toBe("deleted_absent_after_reconciliation");
    acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(snapshot.receipt);

    issue = requireIssue(acquire("delete")!);
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([{ attachmentId: DELETE_ATTACHMENT_ID, contentHash: "b".repeat(64) }])
    )).toBe("idle");
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status).toBe("idle");
  });

  it("keeps reconciliation locked for changed, incomplete, or non-atomic catalogs", () => {
    const issue = requireIssue(acquire("delete")!);
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([{ attachmentId: DELETE_ATTACHMENT_ID, contentHash: "d".repeat(64) }])
    )).toBe("locked");
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([], { coverage: "incomplete" })
    )).toBe("locked");
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([], { atomicStorageSnapshotVerified: false })
    )).toBe("locked");
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "reconciliation_required",
      issue
    });

    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([])
    )).toBe("completed");
  });

  it("rejects wrong-scope, duplicate, extra-field, and accessor catalog outcomes without executing getters", () => {
    const issue = requireIssue(acquire()!);
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([], { scopeIdentitySha256: "f".repeat(64) })
    )).toBe("rejected");
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([
        { attachmentId: SAVE_ATTACHMENT_ID, contentHash: "b".repeat(64) },
        { attachmentId: SAVE_ATTACHMENT_ID, contentHash: "b".repeat(64) }
      ])
    )).toBe("rejected");
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      { ...catalogOutcome([]), raw: "RAW_SENTINEL" }
    )).toBe("rejected");

    let getterCalls = 0;
    const accessorEntry = { attachmentId: SAVE_ATTACHMENT_ID } as Record<string, unknown>;
    Object.defineProperty(accessorEntry, "contentHash", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "b".repeat(64);
      }
    });
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([accessorEntry as never])
    )).toBe("rejected");
    expect(getterCalls).toBe(0);
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status)
      .toBe("reconciliation_required");
  });

  it("guards hard navigation only while writing or reconciliation remains unresolved", () => {
    const idleEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(idleEvent)).toBe(true);
    expect(idleEvent.defaultPrevented).toBe(false);

    const operation = acquire()!;
    const writingEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(writingEvent)).toBe(false);
    expect(writingEvent.defaultPrevented).toBe(true);

    const receipt = completeBaziCitationObservationLifecycleStoreOperation(operation, {
      code: "saved_created",
      attachmentId: SAVE_ATTACHMENT_ID
    })!;
    const completedEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(completedEvent)).toBe(true);
    expect(completedEvent.defaultPrevented).toBe(false);
    acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(receipt);

    const issue = requireIssue(acquire("delete")!);
    const issueEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(issueEvent)).toBe(false);
    expect(issueEvent.defaultPrevented).toBe(true);
    expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
      issue,
      catalogOutcome([{ attachmentId: DELETE_ATTACHMENT_ID, contentHash: "b".repeat(64) }])
    )).toBe("idle");
    const reconciledEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(reconciledEvent)).toBe(true);
    expect(reconciledEvent.defaultPrevented).toBe(false);
  });

  it("test-only reset clears locks, removes the guard, and restarts tokens", () => {
    requireIssue(acquire()!);
    const guarded = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(guarded)).toBe(false);

    resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests();
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status).toBe("idle");
    expect(acquire()!.token).toBe(1);
  });
});
