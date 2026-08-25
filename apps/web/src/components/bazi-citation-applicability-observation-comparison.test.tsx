import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as baziReviewContext from "@hakimi/bazi-review-context";
import { sha256Hex } from "@hakimi/integrity";
import {
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PREPARATION_PROFILE,
  type LocalBaziCitationApplicabilityObservationComparisonProjection
} from "../lib/bazi-citation-review-context";
import type { KnowledgeReviewContextLocator } from "../lib/knowledge-route";
import {
  BaziCitationApplicabilityObservationComparison,
  type BaziCitationApplicabilityObservationComparisonBinding,
  type BaziCitationApplicabilityObservationComparisonCitation
} from "./bazi-citation-applicability-observation-comparison";
import {
  acquireBaziCitationObservationLifecycleStoreOperation,
  completeBaziCitationObservationLifecycleStoreOperation,
  getBaziCitationObservationLifecycleStoreOperationSnapshot,
  reconcileBaziCitationObservationLifecycleStoreOperationCatalog,
  requireBaziCitationObservationLifecycleStoreOperationReconciliation,
  resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests
} from "./bazi-citation-observation-lifecycle-store-operation-coordinator";

const leafPorts = vi.hoisted(() => ({
  pickTextFile: vi.fn(),
  preflightComparison: vi.fn(),
  preparePairLifecycle: vi.fn()
}));

const lifecycleWorkbenchPorts = vi.hoisted(() => ({
  render: vi.fn()
}));

vi.mock("@hakimi/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hakimi/platform")>();
  return { ...actual, pickTextFile: leafPorts.pickTextFile };
});

vi.mock("../lib/bazi-citation-review-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/bazi-citation-review-context")>();
  return {
    ...actual,
    preflightCurrentLocalBaziCitationApplicabilityObservationComparison:
      leafPorts.preflightComparison,
    prepareCurrentLocalBaziCitationApplicabilityObservationPairLifecycle:
      leafPorts.preparePairLifecycle
  };
});

vi.mock("./bazi-citation-applicability-observation-lifecycle-file-workbench", () => ({
  BaziCitationApplicabilityObservationLifecycleFileWorkbench: (props: unknown) => {
    lifecycleWorkbenchPorts.render(props);
    return <div data-testid="lifecycle-file-workbench-probe">lifecycle workbench probe</div>;
  }
}));

const locator = Object.freeze({
  caseId: "11111111-1111-4111-8111-111111111111",
  revisionId: "22222222-2222-4222-8222-222222222222",
  evidenceSubjectId: "bazi.pillar.day.ganzhi.v1",
  fieldPath: "pillars.day.ganZhi"
}) satisfies KnowledgeReviewContextLocator;

const binding = Object.freeze({
  locator,
  contextPayloadSha256: "a".repeat(64),
  displayContextBindingSha256: "b".repeat(64),
  worksetSnapshotSha256: "c".repeat(64),
  matchingSourceSetSha256: "d".repeat(64)
}) satisfies BaziCitationApplicabilityObservationComparisonBinding;

const boundary = Object.freeze({
  contextFreshRereadPerformed: true,
  priorDisplayedContextDigestMatched: true,
  sameFreshContextSnapshotUsedForBoth: true,
  inputOrderAffectsProjection: false,
  suppliedCurrentContextDigestMatched: true,
  mechanicalStatusEqualityCompared: true,
  freeformObservationTextReturnedToUi: false,
  identityEvidenceReferenceReturnedToUi: false,
  identityVerified: false,
  reviewerIndependenceVerified: false,
  humanReviewAuthenticityVerified: false,
  citationSemanticApplicabilityAssessed: false,
  semanticConflictResolutionPerformed: false,
  winnerSelectionPerformed: false,
  rankingPerformed: false,
  consensusClaimed: false,
  currentAtReturnAttested: false,
  eligibleForFormalActivation: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  networkTransmissionPerformed: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false
} as const);

const preparedBoundary = Object.freeze({
  explicitUserPreparationActionRequired: true,
  contextFreshRereadPerformed: true,
  priorDisplayedContextDigestMatched: true,
  sameFreshContextSnapshotUsedForBoth: true,
  lifecycleSidecarCreatedAndReinspected: true,
  currentContextDigestMatchedDuringPreparation: true,
  currentAtReturnAttested: false,
  containsDerivedSensitiveChartBinding: true,
  containsUntrustedReviewerFreeformText: true,
  requiredSharePolicy: "blocked_sensitive",
  storageReadPerformed: true,
  formalStoreUsed: false,
  localFilePersistencePerformed: false,
  preparedFileDeliveryPerformed: false,
  networkTransmissionPerformed: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  rulePackMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  reviewerIdentityVerified: false,
  reviewerIndependenceVerified: false,
  reviewerWithdrawalAuthorityVerified: false,
  semanticConflictResolutionPerformed: false,
  winnerSelectionPerformed: false,
  consensusClaimed: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false
} as const);

function makeCitations(count: number): readonly BaziCitationApplicabilityObservationComparisonCitation[] {
  return Array.from({ length: count }, (_, index) => Object.freeze({
    citationId: `${String(index + 1).padStart(8, "0")}-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
    title: `核验引用 ${index + 1}`
  }));
}

async function makeProjection(
  citations: readonly BaziCitationApplicabilityObservationComparisonCitation[]
): Promise<LocalBaziCitationApplicabilityObservationComparisonProjection> {
  const items = citations.map((citation, index) => ({
    order: index + 1,
    citationId: citation.citationId,
    slotAObservation: "applicable_in_bound_context" as const,
    slotBObservation: index % 2 === 0
      ? "applicable_in_bound_context" as const
      : "not_applicable_in_bound_context" as const,
    relation: index % 2 === 0
      ? "same_declared_status" as const
      : "different_declared_status" as const
  }));
  const sameDeclaredStatus = items.filter((item) => item.relation === "same_declared_status").length;
  const recordCounts = {
    total: citations.length,
    unobserved: 0,
    applicableInBoundContext: citations.length,
    partiallyApplicableInBoundContext: 0,
    notApplicableInBoundContext: 0,
    insufficientBoundContext: 0
  };
  return {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE,
    binding: {
      caseId: locator.caseId,
      revisionId: locator.revisionId,
      evidenceSubjectId: locator.evidenceSubjectId,
      fieldPath: locator.fieldPath,
      contextPayloadSha256: binding.contextPayloadSha256,
      displayContextBindingSha256: binding.displayContextBindingSha256,
      worksetSnapshotSha256: binding.worksetSnapshotSha256,
      matchingSourceSetSha256: binding.matchingSourceSetSha256,
      citationCount: citations.length
    },
    records: [
      {
        slot: "slot_a",
        selfDeclaredReviewerIdSha256: "3".repeat(64),
        counts: recordCounts,
        observedCount: citations.length,
        allCitationsObserved: true,
        reviewerAttributionComplete: true,
        identityEvidenceReferencePresent: true,
        recordSha256: "1".repeat(64)
      },
      {
        slot: "slot_b",
        selfDeclaredReviewerIdSha256: "4".repeat(64),
        counts: {
          ...recordCounts,
          applicableInBoundContext: sameDeclaredStatus,
          notApplicableInBoundContext: citations.length - sameDeclaredStatus
        },
        observedCount: citations.length,
        allCitationsObserved: true,
        reviewerAttributionComplete: true,
        identityEvidenceReferencePresent: true,
        recordSha256: "2".repeat(64)
      }
    ],
    items,
    counts: {
      total: citations.length,
      sameDeclaredStatus,
      differentDeclaredStatus: citations.length - sameDeclaredStatus
    },
    distinctness: {
      recordDigestsDistinct: true,
      selfDeclaredReviewerIdsDistinct: true,
      selfDeclaredIdentityEvidenceReferencesDistinct: true,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false
    },
    recordSetSha256: await sha256Hex({
      domain: "hakimi.bazi.citation_applicability_observation_comparison.record_set/1",
      contextPayloadSha256: binding.contextPayloadSha256,
      recordSha256Set: ["1".repeat(64), "2".repeat(64)]
    }),
    boundary
  };
}

async function makePreparedProjection(
  citations: readonly BaziCitationApplicabilityObservationComparisonCitation[],
  content = JSON.stringify({ slotA: "PAIR_A_RAW_SENTINEL", slotB: "PAIR_B_RAW_SENTINEL" })
) {
  const comparison = await makeProjection(citations);
  return {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PREPARATION_PROFILE,
    fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
    content,
    contentBytes: new TextEncoder().encode(content).byteLength,
    ledgerId: "5".repeat(64),
    recordSetSha256: comparison.recordSetSha256,
    sidecarSha256: "6".repeat(64),
    comparison,
    boundary: preparedBoundary
  } as const;
}

function mockPreparedLifecycleInspection(recordSetSha256: string) {
  return vi.spyOn(
    baziReviewContext,
    "inspectBaziCitationApplicabilityObservationPairLifecycleSidecar"
  ).mockResolvedValue({
    sidecar: {
      ledgerId: "5".repeat(64),
      contextBinding: {
        releaseIdentity: {
          dbGeneration: "legacy-v13",
          targetSchema: 13,
          migrationId: null
        },
        contextPayloadSha256: binding.contextPayloadSha256,
        displayContextBindingSha256: binding.displayContextBindingSha256,
        recordSetSha256
      },
      records: [
        { recordSha256: "1".repeat(64) },
        { recordSha256: "2".repeat(64) }
      ],
      integrity: { sidecarSha256: "6".repeat(64) }
    },
    recordedNotWithheldCount: 2,
    withheldRecordCount: 0,
    structurallyCompletePair: true,
    pairComparisonAllowed: false
  } as never);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

let fetchMock: ReturnType<typeof vi.fn>;
let webSocketMock: ReturnType<typeof vi.fn>;
let sendBeaconMock: ReturnType<typeof vi.fn>;
let xhrSendSpy: ReturnType<typeof vi.spyOn>;
let storageSetItemSpy: ReturnType<typeof vi.spyOn>;
let storageRemoveItemSpy: ReturnType<typeof vi.spyOn>;
let storageClearSpy: ReturnType<typeof vi.spyOn>;
let originalSendBeaconDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests();
  leafPorts.pickTextFile.mockReset();
  leafPorts.preflightComparison.mockReset();
  leafPorts.preparePairLifecycle.mockReset();
  lifecycleWorkbenchPorts.render.mockReset();
  fetchMock = vi.fn();
  webSocketMock = vi.fn();
  sendBeaconMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("WebSocket", webSocketMock);
  originalSendBeaconDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "sendBeacon");
  Object.defineProperty(window.navigator, "sendBeacon", {
    configurable: true,
    writable: true,
    value: sendBeaconMock
  });
  xhrSendSpy = vi.spyOn(XMLHttpRequest.prototype, "send");
  storageSetItemSpy = vi.spyOn(Storage.prototype, "setItem");
  storageRemoveItemSpy = vi.spyOn(Storage.prototype, "removeItem");
  storageClearSpy = vi.spyOn(Storage.prototype, "clear");
});

afterEach(() => {
  expect(fetchMock).not.toHaveBeenCalled();
  expect(webSocketMock).not.toHaveBeenCalled();
  expect(sendBeaconMock).not.toHaveBeenCalled();
  expect(xhrSendSpy).not.toHaveBeenCalled();
  expect(storageSetItemSpy).not.toHaveBeenCalled();
  expect(storageRemoveItemSpy).not.toHaveBeenCalled();
  expect(storageClearSpy).not.toHaveBeenCalled();
  if (originalSendBeaconDescriptor) {
    Object.defineProperty(window.navigator, "sendBeacon", originalSendBeaconDescriptor);
  } else {
    Reflect.deleteProperty(window.navigator, "sendBeacon");
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests();
});

describe("Bazi citation applicability observation comparison leaf", () => {
  it("lazy-mounts and unmounts the private lifecycle workbench only after an explicit user action", async () => {
    const citations = makeCitations(2);
    render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );

    expect(screen.queryByTestId("lifecycle-file-workbench-probe")).toBeNull();
    expect(lifecycleWorkbenchPorts.render).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {
      name: "重开、合并或本机撤下 lifecycle 文件"
    }));

    expect(await screen.findByTestId("lifecycle-file-workbench-probe")).toBeTruthy();
    expect(lifecycleWorkbenchPorts.render).toHaveBeenCalledWith({ binding, citations });
    fireEvent.click(screen.getByRole("button", {
      name: "关闭并清除 lifecycle 重开会话"
    }));
    await waitFor(() => expect(screen.queryByTestId("lifecycle-file-workbench-probe")).toBeNull());
  });

  it("keeps an opened lifecycle workbench mounted while a store write or reconciliation is unresolved", async () => {
    const citations = makeCitations(2);
    render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", {
      name: "重开、合并或本机撤下 lifecycle 文件"
    }));
    expect(await screen.findByTestId("lifecycle-file-workbench-probe")).toBeTruthy();

    let operation!: NonNullable<ReturnType<
      typeof acquireBaziCitationObservationLifecycleStoreOperation
    >>;
    act(() => {
      operation = acquireBaziCitationObservationLifecycleStoreOperation({
        kind: "save",
        scopeIdentitySha256: "7".repeat(64),
        expectedContentHash: "8".repeat(64),
        expectedSidecarSha256: "9".repeat(64),
        attachmentId: null,
        startedAt: "2026-08-25T00:00:00.000Z"
      })!;
    });
    const blockedWritingToggle = screen.getByRole("button", {
      name: "本机审阅库写入/核对未完成，暂不能关闭"
    });
    expect(blockedWritingToggle.hasAttribute("disabled")).toBe(true);
    fireEvent.click(blockedWritingToggle);
    expect(screen.getByTestId("lifecycle-file-workbench-probe")).toBeTruthy();

    let issue!: NonNullable<ReturnType<
      typeof requireBaziCitationObservationLifecycleStoreOperationReconciliation
    >>;
    act(() => {
      issue = requireBaziCitationObservationLifecycleStoreOperationReconciliation(
        operation,
        "call_outcome_unknown"
      )!;
    });
    const blockedReconciliationToggle = screen.getByRole("button", {
      name: "本机审阅库写入/核对未完成，暂不能关闭"
    });
    expect(blockedReconciliationToggle.hasAttribute("disabled")).toBe(true);
    fireEvent.click(blockedReconciliationToggle);
    expect(screen.getByTestId("lifecycle-file-workbench-probe")).toBeTruthy();

    act(() => {
      expect(reconcileBaziCitationObservationLifecycleStoreOperationCatalog(issue, {
        scopeIdentitySha256: "7".repeat(64),
        coverage: "complete",
        atomicStorageSnapshotVerified: true,
        entries: []
      })).toBe("idle");
    });
    const closeToggle = screen.getByRole("button", {
      name: "关闭并清除 lifecycle 重开会话"
    });
    expect(closeToggle.hasAttribute("disabled")).toBe(false);
    fireEvent.click(closeToggle);
    await waitFor(() => expect(screen.queryByTestId("lifecycle-file-workbench-probe")).toBeNull());
  });

  it("allows a closed workbench to open while a global write is pending, then blocks closing", async () => {
    const citations = makeCitations(2);
    render(
      <BaziCitationApplicabilityObservationComparison binding={binding} citations={citations} />
    );
    act(() => {
      acquireBaziCitationObservationLifecycleStoreOperation({
        kind: "save",
        scopeIdentitySha256: "7".repeat(64),
        expectedContentHash: "8".repeat(64),
        expectedSidecarSha256: "9".repeat(64),
        attachmentId: null,
        startedAt: "2026-08-25T00:00:00.000Z"
      });
    });
    const openForObservation = screen.getByRole("button", {
      name: "打开本机审阅库查看或完成核对"
    });
    expect(openForObservation.hasAttribute("disabled")).toBe(false);
    fireEvent.click(openForObservation);
    expect(await screen.findByTestId("lifecycle-file-workbench-probe")).toBeTruthy();
    expect(screen.getByRole("button", {
      name: "本机审阅库写入/核对未完成，暂不能关闭"
    }).hasAttribute("disabled")).toBe(true);
  });

  it("does not clear a global store reconciliation issue when a new binding remounts the comparison leaf", async () => {
    const citations = makeCitations(2);
    const view = render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", {
      name: "重开、合并或本机撤下 lifecycle 文件"
    }));
    await screen.findByTestId("lifecycle-file-workbench-probe");

    let issue!: NonNullable<ReturnType<
      typeof requireBaziCitationObservationLifecycleStoreOperationReconciliation
    >>;
    act(() => {
      const operation = acquireBaziCitationObservationLifecycleStoreOperation({
        kind: "delete",
        scopeIdentitySha256: "7".repeat(64),
        expectedContentHash: "8".repeat(64),
        expectedSidecarSha256: "9".repeat(64),
        attachmentId: "55555555-5555-4555-8555-555555555555",
        startedAt: "2026-08-25T00:00:00.000Z"
      })!;
      issue = requireBaziCitationObservationLifecycleStoreOperationReconciliation(
        operation,
        "operation_interrupted"
      )!;
    });

    view.rerender(
      <BaziCitationApplicabilityObservationComparison
        binding={{ ...binding, contextPayloadSha256: "e".repeat(64) }}
        citations={citations}
      />
    );
    expect(screen.queryByTestId("lifecycle-file-workbench-probe")).toBeNull();
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toEqual({
      status: "reconciliation_required",
      operation: null,
      receipt: null,
      issue
    });
    const reopenForReconciliation = screen.getByRole("button", {
      name: "打开本机审阅库查看或完成核对"
    });
    expect(reopenForReconciliation.hasAttribute("disabled")).toBe(false);
    fireEvent.click(reopenForReconciliation);
    expect(await screen.findByTestId("lifecycle-file-workbench-probe")).toBeTruthy();
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toEqual({
      status: "reconciliation_required",
      operation: null,
      receipt: null,
      issue
    });
    expect(screen.getByRole("button", {
      name: "本机审阅库写入/核对未完成，暂不能关闭"
    }).hasAttribute("disabled")).toBe(true);
  });

  it("does not change or close the current lifecycle session for an unacknowledged completion", async () => {
    const citations = makeCitations(2);
    render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", {
      name: "重开、合并或本机撤下 lifecycle 文件"
    }));
    await screen.findByTestId("lifecycle-file-workbench-probe");

    act(() => {
      const operation = acquireBaziCitationObservationLifecycleStoreOperation({
        kind: "save",
        scopeIdentitySha256: "7".repeat(64),
        expectedContentHash: "8".repeat(64),
        expectedSidecarSha256: "9".repeat(64),
        attachmentId: null,
        startedAt: "2026-08-25T00:00:00.000Z"
      })!;
      completeBaziCitationObservationLifecycleStoreOperation(operation, {
        code: "saved_created",
        attachmentId: "66666666-6666-4666-8666-666666666666"
      });
    });

    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status)
      .toBe("completed_unacknowledged");
    expect(screen.getByTestId("lifecycle-file-workbench-probe")).toBeTruthy();
    expect(screen.getByRole("button", {
      name: "关闭并清除 lifecycle 重开会话"
    }).hasAttribute("disabled")).toBe(false);
  });

  it("keeps both raw files inside the leaf, projects only enum comparisons and clears raw text after success", async () => {
    const citations = makeCitations(2);
    const pickObservationFile = leafPorts.pickTextFile
      .mockResolvedValueOnce({
        name: "<img src=x onerror=PAIR_FILE_NAME_EXECUTED>.json",
        text: "PAIR_A_RAW_SENTINEL"
      })
      .mockResolvedValueOnce({ name: "观察-B.json", text: "PAIR_B_RAW_SENTINEL" });
    const preflightObservationComparison = leafPorts.preflightComparison
      .mockResolvedValue(await makeProjection(citations));
    render(
      <StrictMode>
        <BaziCitationApplicabilityObservationComparison
          binding={binding}
          citations={citations}
        />
      </StrictMode>
    );

    expect(pickObservationFile).not.toHaveBeenCalled();
    expect(preflightObservationComparison).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    expect(await screen.findByText("<img src=x onerror=PAIR_FILE_NAME_EXECUTED>.json")).toBeTruthy();
    expect(document.querySelector("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    expect(await screen.findByText("观察-B.json")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "并列预检两份观察" }));

    expect(await screen.findByText("状态精确相同 1 · 不同 1")).toBeTruthy();
    expect(preflightObservationComparison).toHaveBeenCalledTimes(1);
    expect(preflightObservationComparison).toHaveBeenCalledWith(
      locator,
      binding.contextPayloadSha256,
      "PAIR_A_RAW_SENTINEL",
      "PAIR_B_RAW_SENTINEL"
    );
    expect(screen.queryByText("PAIR_A_RAW_SENTINEL")).toBeNull();
    expect(screen.queryByText("PAIR_B_RAW_SENTINEL")).toBeNull();
    expect(screen.queryByText("PAIR_FILE_NAME_EXECUTED", { exact: false })).toBeNull();
    expect(screen.getByText("声明状态不同，保持并列且不自动裁定")).toBeTruthy();
    expect(screen.getAllByText(/身份与独立性未核验/u).length).toBeGreaterThanOrEqual(2);
  });

  it("prepares the sensitive lifecycle file only after an explicit leaf action and never renders its full text", async () => {
    const citations = makeCitations(2);
    const prepared = await makePreparedProjection(citations);
    const inspect = mockPreparedLifecycleInspection(prepared.recordSetSha256);
    const pickObservationFile = leafPorts.pickTextFile
      .mockResolvedValueOnce({ name: "A.json", text: "PAIR_A_RAW_SENTINEL" })
      .mockResolvedValueOnce({ name: "B.json", text: "PAIR_B_RAW_SENTINEL" });
    const preflightObservationComparison = leafPorts.preflightComparison;
    const prepareObservationPairLifecycle = leafPorts.preparePairLifecycle.mockResolvedValue(prepared);
    const { container, rerender } = render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B.json");
    expect(prepareObservationPairLifecycle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "并列并准备敏感生命周期文件" }));

    expect(await screen.findByRole("dialog", { name: "待交付文件已在本机生成" })).toBeTruthy();
    expect(screen.getByText("双观察生命周期敏感本机文件")).toBeTruthy();
    expect(prepareObservationPairLifecycle).toHaveBeenCalledTimes(1);
    expect(prepareObservationPairLifecycle).toHaveBeenCalledWith(
      locator,
      binding.contextPayloadSha256,
      "PAIR_A_RAW_SENTINEL",
      "PAIR_B_RAW_SENTINEL"
    );
    expect(preflightObservationComparison).not.toHaveBeenCalled();
    expect(inspect).toHaveBeenCalledTimes(1);
    expect(inspect).toHaveBeenCalledWith(prepared.content);
    expect(screen.getByText(/页面会话内已准备/u)).toBeTruthy();
    expect(screen.getByText(/包含敏感资料，系统分享已关闭/u)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /系统分享/u })).toBeNull();
    expect(screen.getByText("状态精确相同 1 · 不同 1")).toBeTruthy();
    expect(document.body.textContent).not.toContain("PAIR_A_RAW_SENTINEL");
    expect(document.body.textContent).not.toContain("PAIR_B_RAW_SENTINEL");
    expect(container.querySelector("[data-sensitive-lifecycle-prepared-in-page-session='true']")).toBeTruthy();
    expect(container.querySelector("[data-storage-mutation-performed='false']")).toBeTruthy();
    expect(container.querySelector("[data-mutation-epoch-revalidation-performed='false']")).toBeTruthy();
    expect(container.querySelector("[data-mutation-epoch-bypassed='false']")).toBeTruthy();
    expect(container.querySelector("[data-public-release-authorized='false']")).toBeTruthy();
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /^关闭文件交付$/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("region", { name: "双份观察机械比较结果" })).toBe(document.activeElement);
    fireEvent.click(screen.getByRole("button", { name: "清除此页面结果并重新选择" }));
    pickObservationFile
      .mockResolvedValueOnce({ name: "A2.json", text: "PAIR_A_SECOND_SENTINEL" })
      .mockResolvedValueOnce({ name: "B2.json", text: "PAIR_B_SECOND_SENTINEL" });
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A2.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B2.json");
    fireEvent.click(screen.getByRole("button", { name: "并列并准备敏感生命周期文件" }));
    expect(await screen.findByRole("dialog", { name: "待交付文件已在本机生成" })).toBeTruthy();
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    rerender(
      <BaziCitationApplicabilityObservationComparison
        binding={{ ...binding, contextPayloadSha256: "e".repeat(64) }}
        citations={citations}
      />
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(container.querySelector("[data-sensitive-lifecycle-prepared-in-page-session='true']")).toBeNull();
    expect(screen.queryByText("状态精确相同", { exact: false })).toBeNull();
    expect(screen.getByText("等待两份完整文件")).toBeTruthy();
  });

  it("drops a late prepared lifecycle result when the same public component receives a new context", async () => {
    const citations = makeCitations(2);
    const prepared = await makePreparedProjection(citations);
    const pending = deferred<unknown>();
    const inspect = mockPreparedLifecycleInspection(prepared.recordSetSha256);
    leafPorts.pickTextFile
      .mockResolvedValueOnce({ name: "A.json", text: "A_PENDING" })
      .mockResolvedValueOnce({ name: "B.json", text: "B_PENDING" });
    leafPorts.preparePairLifecycle.mockImplementation(() => pending.promise);
    const { rerender } = render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B.json");
    fireEvent.click(screen.getByRole("button", { name: "并列并准备敏感生命周期文件" }));
    await waitFor(() => expect(leafPorts.preparePairLifecycle).toHaveBeenCalledTimes(1));

    rerender(
      <BaziCitationApplicabilityObservationComparison
        binding={{ ...binding, contextPayloadSha256: "e".repeat(64) }}
        citations={citations}
      />
    );
    await act(async () => { pending.resolve(prepared); });
    expect(inspect).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("状态精确相同", { exact: false })).toBeNull();
    expect(screen.getByText("等待两份完整文件")).toBeTruthy();
  });

  it("remounts the private leaf for every public binding and ordered citation identity dimension", async () => {
    const citations = makeCitations(2);
    const variants = [
      { label: "caseId", binding: { ...binding, locator: { ...locator, caseId: "99999999-9999-4999-8999-999999999999" } }, citations },
      { label: "revisionId", binding: { ...binding, locator: { ...locator, revisionId: "88888888-8888-4888-8888-888888888888" } }, citations },
      { label: "evidenceSubjectId", binding: { ...binding, locator: { ...locator, evidenceSubjectId: "bazi.pillar.hour.ganzhi.v1" } }, citations },
      { label: "fieldPath", binding: { ...binding, locator: { ...locator, fieldPath: "pillars.hour.ganZhi" } }, citations },
      { label: "contextPayloadSha256", binding: { ...binding, contextPayloadSha256: "e".repeat(64) }, citations },
      { label: "displayContextBindingSha256", binding: { ...binding, displayContextBindingSha256: "f".repeat(64) }, citations },
      { label: "worksetSnapshotSha256", binding: { ...binding, worksetSnapshotSha256: "0".repeat(64) }, citations },
      { label: "matchingSourceSetSha256", binding: { ...binding, matchingSourceSetSha256: "9".repeat(64) }, citations },
      {
        label: "citationId",
        binding,
        citations: Object.freeze([
          Object.freeze({ ...citations[0], citationId: "77777777-7777-4777-8777-777777777777" }),
          citations[1]
        ])
      },
      {
        label: "citationTitle",
        binding,
        citations: Object.freeze([
          Object.freeze({ ...citations[0], title: "变更后的核验引用" }),
          citations[1]
        ])
      },
      { label: "citationOrder", binding, citations: Object.freeze([...citations].reverse()) }
    ] as const;

    for (const variant of variants) {
      const fileName = `identity-${variant.label}.json`;
      leafPorts.pickTextFile.mockResolvedValueOnce({ name: fileName, text: `RAW-${variant.label}` });
      const view = render(
        <BaziCitationApplicabilityObservationComparison binding={binding} citations={citations} />
      );

      fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
      expect(await screen.findByText(fileName)).toBeTruthy();
      view.rerender(
        <BaziCitationApplicabilityObservationComparison
          binding={variant.binding}
          citations={variant.citations}
        />
      );
      await waitFor(() => expect(screen.queryByText(fileName)).toBeNull());
      expect(screen.getByText("等待两份完整文件")).toBeTruthy();
      view.unmount();
    }
  });

  it("rejects a forged sensitive lifecycle authority boundary atomically", async () => {
    const citations = makeCitations(2);
    const prepared = await makePreparedProjection(citations);
    const forged = {
      ...prepared,
      boundary: {
        ...prepared.boundary,
        publicReleaseAuthorized: true as false
      }
    };
    const inspect = mockPreparedLifecycleInspection(prepared.recordSetSha256);
    leafPorts.pickTextFile
      .mockResolvedValueOnce({ name: "A.json", text: "A_SENTINEL" })
      .mockResolvedValueOnce({ name: "B.json", text: "B_SENTINEL" });
    leafPorts.preparePairLifecycle.mockResolvedValue(forged);
    render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B.json");
    fireEvent.click(screen.getByRole("button", { name: "并列并准备敏感生命周期文件" }));

    expect((await screen.findByRole("alert")).textContent).toContain("没有形成文件或并列结果");
    expect(inspect).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("状态精确相同", { exact: false })).toBeNull();
  });

  it("rejects a forged authority projection atomically and renders no partial record", async () => {
    const citations = makeCitations(2);
    const valid = await makeProjection(citations);
    const forged = {
      ...valid,
      boundary: { ...valid.boundary, formalActivationAllowed: true as false }
    };
    leafPorts.pickTextFile
      .mockResolvedValueOnce({ name: "A.json", text: "A_SENTINEL" })
      .mockResolvedValueOnce({ name: "B.json", text: "B_SENTINEL" });
    leafPorts.preflightComparison.mockResolvedValue(forged);
    render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B.json");
    fireEvent.click(screen.getByRole("button", { name: "并列预检两份观察" }));

    expect((await screen.findByRole("alert")).textContent).toContain("没有形成并列结果");
    expect(screen.queryByText("状态精确相同", { exact: false })).toBeNull();
    expect(screen.queryByText("自述 reviewerId 摘要")).toBeNull();
  });

  it("does not execute projection getters and rejects a forged record-set digest", async () => {
    const citations = makeCitations(2);
    const valid = await makeProjection(citations);
    let getterCalls = 0;
    const accessorProjection = { ...valid } as Record<string, unknown>;
    Object.defineProperty(accessorProjection, "profile", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return valid.profile;
      }
    });
    leafPorts.pickTextFile
      .mockResolvedValueOnce({ name: "A.json", text: "A" })
      .mockResolvedValueOnce({ name: "B.json", text: "B" });
    leafPorts.preflightComparison.mockResolvedValue(accessorProjection);
    const { unmount } = render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B.json");
    fireEvent.click(screen.getByRole("button", { name: "并列预检两份观察" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(getterCalls).toBe(0);
    unmount();

    const forgedDigestProjection = { ...valid, recordSetSha256: "f".repeat(64) };
    leafPorts.pickTextFile.mockReset()
      .mockResolvedValueOnce({ name: "A2.json", text: "A2" })
      .mockResolvedValueOnce({ name: "B2.json", text: "B2" });
    leafPorts.preflightComparison.mockReset().mockResolvedValue(forgedDigestProjection);
    render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A2.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B2.json");
    fireEvent.click(screen.getByRole("button", { name: "并列预检两份观察" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("规范记录 1（按摘要排序）")).toBeNull();
  });

  it("drops a late pair result after the leaf is replaced by a new context identity", async () => {
    const citations = makeCitations(2);
    const pending = deferred<LocalBaziCitationApplicabilityObservationComparisonProjection>();
    leafPorts.pickTextFile
      .mockResolvedValueOnce({ name: "A.json", text: "A" })
      .mockResolvedValueOnce({ name: "B.json", text: "B" });
    const preflightObservationComparison = leafPorts.preflightComparison
      .mockImplementation(() => pending.promise);
    const { rerender } = render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B.json");
    fireEvent.click(screen.getByRole("button", { name: "并列预检两份观察" }));
    await waitFor(() => expect(preflightObservationComparison).toHaveBeenCalledTimes(1));

    rerender(
      <BaziCitationApplicabilityObservationComparison
        binding={{ ...binding, contextPayloadSha256: "e".repeat(64) }}
        citations={citations}
      />
    );
    await act(async () => { pending.resolve(await makeProjection(citations)); });
    expect(screen.queryByText("状态精确相同", { exact: false })).toBeNull();
    expect(screen.getByText("等待两份完整文件")).toBeTruthy();
  });

  it("renders a 64-citation comparison progressively in eight-item windows", async () => {
    const citations = makeCitations(64);
    leafPorts.pickTextFile
      .mockResolvedValueOnce({ name: "A.json", text: "A" })
      .mockResolvedValueOnce({ name: "B.json", text: "B" });
    leafPorts.preflightComparison.mockResolvedValue(await makeProjection(citations));
    render(
      <BaziCitationApplicabilityObservationComparison
        binding={binding}
        citations={citations}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "选择观察 A" }));
    await screen.findByText("A.json");
    fireEvent.click(screen.getByRole("button", { name: "选择观察 B" }));
    await screen.findByText("B.json");
    fireEvent.click(screen.getByRole("button", { name: "并列预检两份观察" }));
    await screen.findByText("状态精确相同 32 · 不同 32");

    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "再显示 8 条" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(16);
  });
});
