import { beforeEach, describe, expect, it } from "vitest";
import {
  acknowledgePreparedFileDeliveryIssue,
  acquirePreparedFileDelivery,
  getPreparedFileDeliverySnapshot,
  isCurrentPreparedFileDelivery,
  releasePreparedFileDelivery,
  requirePreparedFileDeliveryManualCheck,
  resetPreparedFileDeliveryCoordinatorForTests,
  subscribePreparedFileDelivery,
  type PreparedFileDeliveryIntent
} from "./prepared-file-delivery-coordinator";

function acquireFixture(intent: PreparedFileDeliveryIntent = "download") {
  return acquirePreparedFileDelivery({
    intent,
    filename: `report-${intent}.md`,
    bytes: 128,
    sha256: "a".repeat(64),
    startedAt: "2026-08-24T00:00:00.000Z",
    artifactDescriptor: `test artifact for ${intent}`
  });
}

beforeEach(() => {
  resetPreparedFileDeliveryCoordinatorForTests();
});

describe("prepared file delivery coordinator", () => {
  it("starts idle and publishes state transitions to subscribers", () => {
    const listenerCalls: string[] = [];
    const unsubscribe = subscribePreparedFileDelivery(() => {
      listenerCalls.push(getPreparedFileDeliverySnapshot().status);
    });

    expect(getPreparedFileDeliverySnapshot()).toEqual({
      status: "idle",
      operation: null,
      issue: null
    });

    const operation = acquireFixture();
    expect(operation).not.toBeNull();
    expect(listenerCalls).toEqual(["in_flight"]);

    unsubscribe();
    expect(releasePreparedFileDelivery(operation!)).toBe(true);
    expect(listenerCalls).toEqual(["in_flight"]);
  });

  it("grants one exclusive operation while an operation is in flight", () => {
    const operation = acquireFixture("chosen_location");

    expect(operation).toMatchObject({
      token: 1,
      intent: "chosen_location",
      filename: "report-chosen_location.md"
    });
    expect(Object.isFrozen(operation)).toBe(true);
    expect(isCurrentPreparedFileDelivery(operation!)).toBe(true);
    expect(acquireFixture("share")).toBeNull();
    expect(getPreparedFileDeliverySnapshot()).toEqual({
      status: "in_flight",
      operation,
      issue: null
    });
  });

  it("does not let a stale operation release or move the current operation to manual review", () => {
    const staleOperation = acquireFixture("download")!;
    expect(releasePreparedFileDelivery(staleOperation)).toBe(true);

    const currentOperation = acquireFixture("share")!;
    expect(currentOperation.token).toBe(2);

    expect(releasePreparedFileDelivery(staleOperation)).toBe(false);
    expect(
      requirePreparedFileDeliveryManualCheck(
        staleOperation,
        "uncertain",
        "stale operation must not lock a newer delivery"
      )
    ).toBeNull();
    expect(isCurrentPreparedFileDelivery(currentOperation)).toBe(true);
    expect(getPreparedFileDeliverySnapshot()).toEqual({
      status: "in_flight",
      operation: currentOperation,
      issue: null
    });
  });

  it.each([
    ["requested", "The browser accepted the download request."],
    ["uncertain", "The delivery outcome could not be reconciled."]
  ] as const)("holds a %s manual gate until the exact issue is acknowledged", (kind, detail) => {
    const operation = acquireFixture(kind === "requested" ? "download" : "chosen_location")!;
    const issue = requirePreparedFileDeliveryManualCheck(operation, kind, detail)!;

    expect(Object.isFrozen(issue)).toBe(true);
    expect(issue).toEqual({ kind, operation, detail });
    expect(getPreparedFileDeliverySnapshot()).toEqual({
      status: "manual_check_required",
      operation: null,
      issue
    });
    expect(acquireFixture("share")).toBeNull();
    expect(releasePreparedFileDelivery(operation)).toBe(false);

    const copiedIssue = { ...issue };
    expect(acknowledgePreparedFileDeliveryIssue(copiedIssue)).toBe(false);
    expect(getPreparedFileDeliverySnapshot()).toMatchObject({
      status: "manual_check_required",
      issue
    });

    expect(acknowledgePreparedFileDeliveryIssue(issue)).toBe(true);
    expect(getPreparedFileDeliverySnapshot()).toEqual({
      status: "idle",
      operation: null,
      issue: null
    });
    expect(acknowledgePreparedFileDeliveryIssue(issue)).toBe(false);
  });

  it("keeps a best-effort hard-navigation guard through in-flight and manual-check states", () => {
    const idleEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(idleEvent)).toBe(true);
    expect(idleEvent.defaultPrevented).toBe(false);

    const operation = acquireFixture("download")!;
    const inFlightEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(inFlightEvent)).toBe(false);
    expect(inFlightEvent.defaultPrevented).toBe(true);

    const issue = requirePreparedFileDeliveryManualCheck(
      operation,
      "requested",
      "The browser accepted the download request."
    )!;
    const manualCheckEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(manualCheckEvent)).toBe(false);
    expect(manualCheckEvent.defaultPrevented).toBe(true);

    expect(acknowledgePreparedFileDeliveryIssue(issue)).toBe(true);
    const reconciledEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(reconciledEvent)).toBe(true);
    expect(reconciledEvent.defaultPrevented).toBe(false);
  });

  it("reset clears every gate and restarts operation tokens for test isolation", () => {
    const operation = acquireFixture()!;
    requirePreparedFileDeliveryManualCheck(operation, "uncertain", "test-only reset fixture");
    expect(getPreparedFileDeliverySnapshot().status).toBe("manual_check_required");

    resetPreparedFileDeliveryCoordinatorForTests();

    expect(getPreparedFileDeliverySnapshot()).toEqual({
      status: "idle",
      operation: null,
      issue: null
    });
    expect(acquireFixture()!.token).toBe(1);
  });
});
