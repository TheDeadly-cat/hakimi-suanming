import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE,
  type LocalBaziCitationApplicabilityObservationPairLifecycleReopen,
  type LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification,
  type LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile
} from "../lib/bazi-citation-review-context";
import {
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
  BaziCitationObservationLifecycleStoreError,
  type BaziCitationObservationLifecycleAttachmentExactIdentity,
  type BaziCitationObservationLifecycleSafeSummary
} from "../lib/bazi-citation-observation-lifecycle-store";
/*
 * Runtime profile imports above deliberately exercise the leaf's fail-closed wrapper checks.
 * Sensitive `content` remains confined to the mocked facade return and leaf state.
 */
import type {
  BaziCitationApplicabilityObservationLifecycleFileWorkbenchProps
} from "./bazi-citation-applicability-observation-lifecycle-file-workbench";
import {
  BaziCitationApplicabilityObservationLifecycleFileWorkbench
} from "./bazi-citation-applicability-observation-lifecycle-file-workbench";
import {
  getBaziCitationObservationLifecycleStoreOperationSnapshot,
  resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests
} from "./bazi-citation-observation-lifecycle-store-operation-coordinator";

const ports = vi.hoisted(() => ({
  pickTextFile: vi.fn(),
  reopen: vi.fn(),
  withhold: vi.fn(),
  verifyRoundTrip: vi.fn(),
  readCatalog: vi.fn(),
  reopenStored: vi.fn(),
  saveStored: vi.fn(),
  readOriginalBytes: vi.fn(),
  deleteStored: vi.fn(),
  sha256BytesHex: vi.fn(),
  capturedArtifacts: [] as unknown[]
}));

vi.mock("@hakimi/integrity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hakimi/integrity")>();
  return { ...actual, sha256BytesHex: ports.sha256BytesHex };
});

vi.mock("@hakimi/platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hakimi/platform")>();
  return { ...actual, pickTextFile: ports.pickTextFile };
});

vi.mock("../lib/bazi-citation-review-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/bazi-citation-review-context")>();
  return {
    ...actual,
    reopenCurrentLocalBaziCitationApplicabilityObservationPairLifecycle: ports.reopen,
    prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor:
      ports.withhold,
    verifyLocalBaziCitationApplicabilityObservationPairLifecycleRoundTrip:
      ports.verifyRoundTrip
  };
});

vi.mock("../lib/bazi-citation-observation-lifecycle-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/bazi-citation-observation-lifecycle-store")>();
  return {
    ...actual,
    readBaziCitationObservationLifecycleAttachmentCatalog: ports.readCatalog,
    reopenBaziCitationObservationLifecycleStoredCopies: ports.reopenStored,
    saveBaziCitationObservationLifecycleCanonicalSession: ports.saveStored,
    readBaziCitationObservationLifecycleOriginalBytes: ports.readOriginalBytes,
    deleteBaziCitationObservationLifecycleExactCopy: ports.deleteStored
  };
});

vi.mock("./prepared-file-delivery-load-boundary", () => ({
  PreparedFileDeliveryLoadBoundary: ({ children }: { children: ReactNode }) => <>{children}</>
}));

vi.mock("./prepared-file-delivery-dialog", () => ({
  PreparedFileDeliveryDialog: ({ artifact, onClose }: {
    artifact: unknown;
    onClose(): void;
  }) => {
    ports.capturedArtifacts.push(artifact);
    return (
      <div role="dialog" aria-label="本机保存或下载确认">
        <button type="button" onClick={onClose}>关闭文件交付</button>
      </div>
    );
  }
}));

const locator = Object.freeze({
  caseId: "11111111-1111-4111-8111-111111111111",
  revisionId: "22222222-2222-4222-8222-222222222222",
  evidenceSubjectId: "bazi.pillar.day.ganzhi.v1",
  fieldPath: "pillars.day.ganZhi"
});

const binding = Object.freeze({
  locator,
  contextPayloadSha256: "a".repeat(64),
  displayContextBindingSha256: "b".repeat(64),
  worksetSnapshotSha256: "c".repeat(64),
  matchingSourceSetSha256: "d".repeat(64)
}) satisfies BaziCitationApplicabilityObservationLifecycleFileWorkbenchProps["binding"];

const citations = Object.freeze([
  Object.freeze({ citationId: "33333333-3333-4333-8333-333333333333", title: "引用一" }),
  Object.freeze({ citationId: "44444444-4444-4444-8444-444444444444", title: "引用二" })
]);

const props = Object.freeze({ binding, citations }) satisfies BaziCitationApplicabilityObservationLifecycleFileWorkbenchProps;
const recordA = "4".repeat(64);
const recordB = "5".repeat(64);
const rawHashA = "7".repeat(64);
const rawHashB = "8".repeat(64);
const sourceSidecarA = "9".repeat(64);
const sourceSidecarB = "a".repeat(64);

function attachment(
  id: string,
  contentHash: string,
  byteLength = 17
): BaziCitationObservationLifecycleAttachmentExactIdentity {
  return Object.freeze({
    id,
    fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
    mediaType: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
    byteLength,
    contentHash,
    description: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
    link: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z"
  });
}

const attachmentA = attachment("55555555-5555-4555-8555-555555555555", rawHashA);
const attachmentB = attachment("66666666-6666-4666-8666-666666666666", rawHashB, 19);

function lifecycleSummary(sidecarSha256: string): BaziCitationObservationLifecycleSafeSummary {
  return Object.freeze({
    ledgerId: "1".repeat(64),
    recordSetSha256: "2".repeat(64),
    sidecarSha256,
    records: Object.freeze([
      Object.freeze({ recordSha256: recordA, state: "recorded_current_context_unchecked" as const }),
      Object.freeze({ recordSha256: recordB, state: "recorded_current_context_unchecked" as const })
    ] as const),
    counts: Object.freeze({ recordedNotWithheld: 2 as const, withheld: 0 as const })
  });
}

function catalogFixture(items = [attachmentA, attachmentB]) {
  return {
    profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
    items,
    summary: {
      storedCopies: items.length,
      matchedDeclaredBytes: items.reduce((total, item) => total + item.byteLength, 0),
      scannedRows: items.length,
      scannedEncodedCharacters: 500
    },
    boundary: {
      exactPurposeFilterUsed: true,
      completeCoverageVerified: true,
      atomicMetadataSnapshotVerified: true,
      contentIntegrityVerified: false,
      itemOrderingUsesContentHashThenId: true,
      timestampOrderingUsed: false,
      storageReadPerformed: true,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false,
      reviewerWithdrawalAuthorityVerified: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    }
  } as const;
}

function storedReopenFixture(
  sources: readonly Readonly<{
    attachment: BaziCitationObservationLifecycleAttachmentExactIdentity;
    lifecycle: BaziCitationObservationLifecycleSafeSummary;
  }>[],
  projection = reopenProjection(sources.length)
) {
  return {
    profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
    sources,
    privateLeafPayload: projection,
    boundary: {
      selectedCopyCount: sources.length,
      selectedCopiesReadSerially: true,
      eachReadUsedExpectedRawContentHash: true,
      eachRawContentHashRecomputed: true,
      eachLifecycleCanonicalDigestReinspected: true,
      freshContextReopenPerformed: true,
      catalogWideAtomicContentSnapshotClaimed: false,
      currentAtReturnAttested: false,
      storageReadPerformed: true,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false,
      reviewerWithdrawalAuthorityVerified: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    }
  } as const;
}

const failClosedAuthorityBoundary = Object.freeze({
  requiredSharePolicy: "blocked_sensitive",
  formalStoreUsed: false,
  localFilePersistencePerformed: false,
  preparedFileDeliveryPerformed: false,
  networkTransmissionPerformed: false,
  networkTransmissionAuthorized: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  rulePackMutationPerformed: false,
  schemaOrReleaseIdentityMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  reviewerIdentityVerified: false,
  reviewerIndependenceVerified: false,
  reviewerWithdrawalAuthorityVerified: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false,
  priorExportsRecalled: false,
  physicalDeletionAttested: false,
  currentAtReturnAttested: false
} as const);

function reopenBoundary(comparisonReady: boolean) {
  return Object.freeze({
    ...failClosedAuthorityBoundary,
    explicitUserReopenActionRequired: true,
    crossFileReconciliationPerformedBeforeRepositoryRead: true,
    oneFreshContextRereadAfterReconciliation: true,
    freshContextTwoPassDigestRevalidationPerformed: true,
    priorDisplayedContextDigestMatched: true,
    releaseIdentityDigestTupleMatched: true,
    contextPayloadDigestMatched: true,
    displayContextBindingDigestMatched: true,
    recordSetDigestRecomputedAgainstFreshContext: true,
    withheldRecordsExcludedFromComparisonReadiness: true,
    mechanicalComparisonProjectionReturned: comparisonReady
  });
}

const withholdingBoundary = Object.freeze({
  ...failClosedAuthorityBoundary,
  explicitUserPreparationActionRequired: true,
  sourceLifecycleFileInspected: true,
  deterministicSuccessorCreatedAndReinspected: true,
  finiteReasonCodeRequired: true,
  terminalLocalWithholdingOnly: true,
  localUserWithholdingIsReviewerWithdrawal: false,
  currentContextReadPerformed: false,
  currentContextDigestMatched: false,
  priorSidecarMutationPerformed: false
});

const roundTripBoundary = Object.freeze({
  requiredSharePolicy: "blocked_sensitive",
  formalStoreUsed: false,
  networkTransmissionPerformed: false,
  networkTransmissionAuthorized: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  rulePackMutationPerformed: false,
  schemaOrReleaseIdentityMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  reviewerIdentityVerified: false,
  reviewerIndependenceVerified: false,
  reviewerWithdrawalAuthorityVerified: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false,
  priorExportsRecalled: false,
  physicalDeletionAttested: false,
  currentAtReturnAttested: false,
  explicitUserReinspectionActionRequired: true,
  lifecycleFileStructurallyReinspected: true,
  expectedSidecarDigestMatched: true,
  byteForByteDeliveryAttested: false,
  localFilePersistenceAttested: false,
  currentContextReadPerformed: false
});

function bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function reopenProjection(
  inputCount: number,
  options: Readonly<{ withheld?: boolean; content?: string }> = {}
): LocalBaziCitationApplicabilityObservationPairLifecycleReopen {
  const content = options.content ?? "{\"secret\":\"RECONCILED_RAW_SENTINEL\"}\n";
  const withheld = options.withheld === true;
  return {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE,
    status: withheld
      ? "current_context_matched_withheld"
      : "current_context_matched_comparison_ready",
    fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
    content,
    contentBytes: bytes(content),
    ledgerId: "1".repeat(64),
    recordSetSha256: "2".repeat(64),
    sidecarSha256: "3".repeat(64),
    records: [
      { recordSha256: recordA, state: withheld ? "withheld_by_local_user" : "recorded_current_context_unchecked" },
      { recordSha256: recordB, state: "recorded_current_context_unchecked" }
    ],
    counts: { recordedNotWithheld: withheld ? 1 : 2, withheld: withheld ? 1 : 0 },
    inputCount,
    outputDigestFoundAmongInputs: true,
    comparison: withheld ? null : ({} as never),
    boundary: reopenBoundary(!withheld) as never
  };
}

function successorProjection(
  reasonCode: "privacy_request" = "privacy_request"
): LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile {
  const content = "{\"secret\":\"WITHHELD_SUCCESSOR_RAW_SENTINEL\"}\n";
  return {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE,
    fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
    content,
    contentBytes: bytes(content),
    ledgerId: "1".repeat(64),
    recordSetSha256: "2".repeat(64),
    sidecarSha256: "6".repeat(64),
    records: [
      { recordSha256: recordA, state: "withheld_by_local_user" },
      { recordSha256: recordB, state: "recorded_current_context_unchecked" }
    ],
    counts: { recordedNotWithheld: 1, withheld: 1 },
    targetRecordSha256: recordA,
    reasonCode,
    boundary: withholdingBoundary as never
  };
}

function roundTripProjection(
  sidecarSha256 = "3".repeat(64)
): LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification {
  return {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE,
    matched: true,
    fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
    contentBytes: 120,
    ledgerId: "1".repeat(64),
    recordSetSha256: "2".repeat(64),
    sidecarSha256,
    records: [
      { recordSha256: recordA, state: "recorded_current_context_unchecked" },
      { recordSha256: recordB, state: "recorded_current_context_unchecked" }
    ],
    counts: { recordedNotWithheld: 2, withheld: 0 },
    boundary: roundTripBoundary as never
  };
}

function saveReceiptFixture(
  created: boolean,
  storedAttachment: BaziCitationObservationLifecycleAttachmentExactIdentity,
  sidecarSha256 = "3".repeat(64),
  sourceIdentityCount = 0
) {
  return {
    profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
    attachment: storedAttachment,
    lifecycle: lifecycleSummary(sidecarSha256),
    created,
    sourceIdentityCount,
    boundary: {
      explicitSaveIntentConfirmed: true,
      sensitiveContentAcknowledged: true,
      plaintextFullBackupInclusionAcknowledged: true,
      unlinkedNonCascadeAcknowledged: true,
      oldAndExternalCopiesCannotBeRecalledAcknowledged: true,
      packageInspectionPerformed: true,
      canonicalTextExactMatchVerified: true,
      exactRawBytesReadBack: true,
      rawContentHashMatched: true,
      lifecycleRoundTripDigestMatched: true,
      exactPurposeCatalogCapacityAtomicallyAdmitted: true,
      sourceIdentitiesAtomicallyRevalidatedDuringCreate: sourceIdentityCount > 0,
      containsDerivedSensitiveChartBinding: true,
      containsUntrustedReviewerFreeformText: true,
      includedInPlaintextFullBackup: true,
      attachmentLinkedToCaseOrRevision: false,
      caseDeletionCascadeEnabled: false,
      requiredSharePolicy: "blocked_sensitive",
      storageReadPerformed: true,
      storageWriteCallPerformed: true,
      newAttachmentRecordCreated: created,
      storageMutationPerformed: created,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      physicalDeletionAttested: false,
      priorExportsRecalled: false,
      priorPlaintextBackupsRecalled: false,
      otherBrowserProfilesRecalled: false,
      otherDevicesRecalled: false,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false,
      reviewerWithdrawalAuthorityVerified: false,
      publicExportAuthorized: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false
    }
  } as const;
}

function originalBytesReceipt(
  storedAttachment: BaziCitationObservationLifecycleAttachmentExactIdentity,
  sidecarSha256: string,
  originalBytes: Uint8Array
) {
  return {
    profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
    attachment: storedAttachment,
    lifecycle: lifecycleSummary(sidecarSha256),
    bytes: originalBytes,
    boundary: {
      exactStoredBytesReturned: true,
      jsonReserializationPerformed: false,
      expectedRawContentHashUsed: true,
      rawContentHashRecomputed: true,
      lifecycleDigestReinspected: true,
      callerByteMutationAffectsStoredCopy: false,
      requiredSharePolicy: "blocked_sensitive",
      storageReadPerformed: true,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      publicExportAuthorized: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    }
  } as const;
}

function deleteReceiptFixture(
  storedAttachment: BaziCitationObservationLifecycleAttachmentExactIdentity,
  sidecarSha256: string
) {
  return {
    profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
    attachment: storedAttachment,
    lifecycle: lifecycleSummary(sidecarSha256),
    boundary: {
      explicitDeleteIntentConfirmed: true,
      exactIdentityPreReadAndInspected: true,
      fullIdentityCasDeleteRequested: true,
      exactPurposeSnapshotConfirmedIdAbsent: true,
      currentStoreAttachmentCopyAbsentVerified: true,
      physicalDeletionAttested: false,
      priorExportsRecalled: false,
      priorPlaintextBackupsRecalled: false,
      otherBrowserProfilesRecalled: false,
      otherDevicesRecalled: false,
      sameLedgerOtherCopiesDeleted: false,
      reviewerWithdrawalAuthorityVerified: false,
      storageReadPerformed: true,
      storageMutationPerformed: true,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      networkTransmissionPerformed: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    }
  } as const;
}

async function reopenStoredFromCatalog(
  selected: readonly BaziCitationObservationLifecycleAttachmentExactIdentity[] = [attachmentA]
) {
  ports.readCatalog.mockResolvedValue(catalogFixture());
  ports.reopenStored.mockResolvedValue(storedReopenFixture(selected.map((item, index) => ({
    attachment: item,
    lifecycle: lifecycleSummary(index === 0 ? sourceSidecarA : sourceSidecarB)
  }))));
  fireEvent.click(screen.getByRole("button", { name: "读取/刷新本机审阅库" }));
  await screen.findByText(/内容完整性：未验真/u);
  for (const item of selected) {
    fireEvent.click(screen.getByRole("checkbox", { name: `选择本机审阅库副本 ${item.id}` }));
  }
  fireEvent.click(screen.getByRole("button", { name: `验真并重开 ${selected.length} 个本机副本` }));
  await screen.findByRole("region", { name: "生命周期安全摘要" });
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
  ports.pickTextFile.mockReset();
  ports.reopen.mockReset();
  ports.withhold.mockReset();
  ports.verifyRoundTrip.mockReset();
  ports.readCatalog.mockReset();
  ports.reopenStored.mockReset();
  ports.saveStored.mockReset();
  ports.readOriginalBytes.mockReset();
  ports.deleteStored.mockReset();
  ports.sha256BytesHex.mockReset();
  ports.sha256BytesHex.mockResolvedValue(rawHashA);
  ports.capturedArtifacts.length = 0;
  resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests();
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
  resetBaziCitationObservationLifecycleStoreOperationCoordinatorForTests();
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
});

describe("Bazi lifecycle file workbench", () => {
  it("does not read the review library on mount and marks catalog content unchecked", async () => {
    ports.readCatalog.mockResolvedValue(catalogFixture());
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);

    expect(ports.readCatalog).not.toHaveBeenCalled();
    expect(screen.getByText(/尚未读取目录/u)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "读取/刷新本机审阅库" }));

    expect(await screen.findByText(/内容完整性：未验真/u)).toBeTruthy();
    expect(ports.readCatalog).toHaveBeenCalledTimes(1);
    expect(screen.getByText(new RegExp(attachmentA.id, "u"))).toBeTruthy();
    expect(screen.getAllByText(/内容未验真/u).length).toBe(2);
    expect(screen.getByText(/不表示“最新”/u)).toBeTruthy();
    expect(ports.reopenStored).not.toHaveBeenCalled();
  });

  it("reopens two stored prefixes with per-source digests and saves canonical with exact sources", async () => {
    const canonical = reopenProjection(2);
    const savedAttachment = attachment(
      "77777777-7777-4777-8777-777777777777",
      rawHashA,
      canonical.contentBytes
    );
    ports.saveStored.mockResolvedValue(saveReceiptFixture(true, savedAttachment, canonical.sidecarSha256, 2));
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    await reopenStoredFromCatalog([attachmentA, attachmentB]);

    expect(ports.reopenStored).toHaveBeenCalledWith({
      locator,
      expectedPriorContextPayloadSha256: binding.contextPayloadSha256,
      copies: [attachmentA, attachmentB]
    });
    const saveGroup = screen.getByRole("group", { name: "显式保存当前 canonical 到本机审阅库" });
    for (const checkbox of within(saveGroup).getAllByRole("checkbox")) fireEvent.click(checkbox);
    fireEvent.click(within(saveGroup).getByRole("button", { name: "确认保存当前 canonical" }));

    await waitFor(() => expect(ports.saveStored).toHaveBeenCalledTimes(1));
    expect(ports.saveStored.mock.calls[0]?.[0]).toMatchObject({
      content: canonical.content,
      expectedSidecarSha256: canonical.sidecarSha256,
      sourceIdentities: [attachmentA, attachmentB],
      confirmation: {
        explicitSaveIntent: true,
        sensitiveReviewerAndDerivedChartContentAcknowledged: true,
        plaintextFullBackupInclusionAcknowledged: true,
        unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged: true,
        priorAndExternalCopiesCannotBeRecalledAcknowledged: true
      }
    });
    expect(await screen.findByText(/已形成新本机附件记录/u)).toBeTruthy();
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "completed_unacknowledged",
      receipt: { code: "saved_created", attachmentId: savedAttachment.id }
    });
    expect(screen.getByText(/必须刷新目录并重新验真/u)).toBeTruthy();
    expect(document.body.textContent).not.toContain("RECONCILED_RAW_SENTINEL");
  });

  it("reports an existing-byte save as saved_existing and requires exact receipt acknowledgement", async () => {
    const canonical = reopenProjection(1);
    const savedAttachment = attachment(
      "77777777-7777-4777-8777-777777777777",
      rawHashA,
      canonical.contentBytes
    );
    ports.pickTextFile.mockResolvedValue({ name: "one.json", text: "ONE" });
    ports.reopen.mockResolvedValue(canonical);
    ports.saveStored.mockResolvedValue(saveReceiptFixture(false, savedAttachment));
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    await screen.findByRole("region", { name: "生命周期安全摘要" });
    const saveGroup = screen.getByRole("group", { name: "显式保存当前 canonical 到本机审阅库" });
    for (const checkbox of within(saveGroup).getAllByRole("checkbox")) fireEvent.click(checkbox);
    fireEvent.click(within(saveGroup).getByRole("button", { name: "确认保存当前 canonical" }));

    expect(await screen.findByText(/相同原字节附件已存在/u)).toBeTruthy();
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "completed_unacknowledged",
      receipt: { code: "saved_existing" }
    });
    fireEvent.click(screen.getByRole("button", { name: "精确认领此完成回执" }));
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status).toBe("idle");
  });

  it("cancels typed prewrite failures but locks unknown save outcomes until atomic catalog reconciliation", async () => {
    const canonical = reopenProjection(1);
    ports.pickTextFile.mockResolvedValue({ name: "one.json", text: "ONE" });
    ports.reopen.mockResolvedValue(canonical);
    ports.saveStored
      .mockRejectedValueOnce(new BaziCitationObservationLifecycleStoreError(
        "SIDECAR_INVALID",
        "prewrite",
        false,
        "PRIVATE_PREWRITE_DETAIL"
      ))
      .mockRejectedValueOnce(new Error("PRIVATE_UNKNOWN_DETAIL"));
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    await screen.findByRole("region", { name: "生命周期安全摘要" });
    const saveGroup = screen.getByRole("group", { name: "显式保存当前 canonical 到本机审阅库" });
    for (const checkbox of within(saveGroup).getAllByRole("checkbox")) fireEvent.click(checkbox);

    fireEvent.click(within(saveGroup).getByRole("button", { name: "确认保存当前 canonical" }));
    expect(await screen.findByText(/mutation call 前失败/u)).toBeTruthy();
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status).toBe("idle");
    expect(document.body.textContent).not.toContain("PRIVATE_PREWRITE_DETAIL");

    fireEvent.click(within(saveGroup).getByRole("button", { name: "确认保存当前 canonical" }));
    expect(await screen.findByText(/全局状态：reconciliation_required/u)).toBeTruthy();
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status).toBe("reconciliation_required");
    expect(document.body.textContent).not.toContain("PRIVATE_UNKNOWN_DETAIL");
    ports.readCatalog.mockResolvedValue(catalogFixture());
    fireEvent.click(screen.getByRole("button", { name: "读取完整原子目录并核对" }));
    await waitFor(() => expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status)
      .toBe("completed_unacknowledged"));
  });

  it("exports and deletes an older verified prefix using that source's sidecar digest", async () => {
    const originalBytes = new Uint8Array(attachmentA.byteLength).fill(42);
    ports.readOriginalBytes.mockResolvedValue(
      originalBytesReceipt(attachmentA, sourceSidecarA, originalBytes)
    );
    ports.deleteStored.mockResolvedValue(deleteReceiptFixture(attachmentA, sourceSidecarA));
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    await reopenStoredFromCatalog([attachmentA, attachmentB]);

    const sourceRegion = screen.getByRole("region", { name: "当前页面会话的本机来源副本" });
    const exportButtons = within(sourceRegion).getAllByRole("button", {
      name: "导出此已验真副本的原字节"
    });
    fireEvent.click(exportButtons[0]!);
    expect(await screen.findByRole("dialog", { name: "本机保存或下载确认" })).toBeTruthy();
    expect(ports.readOriginalBytes).toHaveBeenCalledWith({
      attachment: attachmentA,
      expectedSidecarSha256: sourceSidecarA
    });
    expect(ports.readOriginalBytes.mock.calls[0]?.[0].expectedSidecarSha256)
      .not.toBe(reopenProjection(2).sidecarSha256);
    const artifact = ports.capturedArtifacts.at(-1) as { blob: Blob; sharePolicy: string };
    expect(artifact.sharePolicy).toBe("blocked_sensitive");
    expect(new Uint8Array(await artifact.blob.arrayBuffer())).toEqual(originalBytes);
    fireEvent.click(screen.getByRole("button", { name: "关闭文件交付" }));

    const deleteButtons = within(sourceRegion).getAllByRole("button", {
      name: "准备删除此已验真本机副本"
    });
    fireEvent.click(deleteButtons[0]!);
    const deleteGroup = screen.getByRole("group", { name: "CAS 删除一个已验真本机副本" });
    const confirmDelete = within(deleteGroup).getByRole("button", {
      name: "确认 CAS 删除此本机副本"
    });
    expect((confirmDelete as HTMLButtonElement).disabled).toBe(true);
    for (const checkbox of within(deleteGroup).getAllByRole("checkbox")) fireEvent.click(checkbox);
    fireEvent.change(within(deleteGroup).getByRole("textbox", { name: "删除确认短语" }), {
      target: { value: "删除这个副本" }
    });
    expect((confirmDelete as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(deleteGroup).getByRole("textbox", { name: "删除确认短语" }), {
      target: { value: "删除此本机副本" }
    });
    expect((confirmDelete as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirmDelete);

    await waitFor(() => expect(ports.deleteStored).toHaveBeenCalledWith(expect.objectContaining({
      attachment: attachmentA,
      expectedSidecarSha256: sourceSidecarA
    })));
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "completed_unacknowledged",
      receipt: { code: "deleted", expectedSidecarSha256: sourceSidecarA }
    });
    expect(await screen.findByText(/不是物理擦除证明/u)).toBeTruthy();
  });

  it("settles an acquired save after the leaf unmounts", async () => {
    const canonical = reopenProjection(1);
    const savedAttachment = attachment(
      "77777777-7777-4777-8777-777777777777",
      rawHashA,
      canonical.contentBytes
    );
    const pending = deferred<ReturnType<typeof saveReceiptFixture>>();
    ports.pickTextFile.mockResolvedValue({ name: "one.json", text: "ONE" });
    ports.reopen.mockResolvedValue(canonical);
    ports.saveStored.mockImplementation(() => pending.promise);
    const view = render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    await screen.findByRole("region", { name: "生命周期安全摘要" });
    const saveGroup = screen.getByRole("group", { name: "显式保存当前 canonical 到本机审阅库" });
    for (const checkbox of within(saveGroup).getAllByRole("checkbox")) fireEvent.click(checkbox);
    fireEvent.click(within(saveGroup).getByRole("button", { name: "确认保存当前 canonical" }));
    await waitFor(() => expect(getBaziCitationObservationLifecycleStoreOperationSnapshot().status)
      .toBe("writing"));
    view.unmount();
    await act(async () => pending.resolve(saveReceiptFixture(true, savedAttachment)));
    expect(getBaziCitationObservationLifecycleStoreOperationSnapshot()).toMatchObject({
      status: "completed_unacknowledged",
      receipt: { code: "saved_created", attachmentId: savedAttachment.id }
    });
  });

  it("requires explicit sequential selection and reconciliation, then renders only safe summaries", async () => {
    ports.pickTextFile
      .mockResolvedValueOnce({ name: "RAW_NAME_SENTINEL.json", text: "FIRST_RAW_SENTINEL" })
      .mockResolvedValueOnce({ name: "SECOND.json", text: "SECOND_RAW_SENTINEL" });
    ports.reopen.mockResolvedValue(reopenProjection(2));
    const { container } = render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);

    expect(ports.pickTextFile).not.toHaveBeenCalled();
    expect(ports.reopen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    expect(await screen.findByText("已选择 1 / 16")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    expect(await screen.findByText("已选择 2 / 16")).toBeTruthy();
    expect(document.body.textContent).not.toContain("FIRST_RAW_SENTINEL");
    expect(document.body.textContent).not.toContain("SECOND_RAW_SENTINEL");
    expect(document.body.textContent).not.toContain("RAW_NAME_SENTINEL");

    fireEvent.click(screen.getByRole("button", { name: "合并并复核 2 份文件" }));
    expect(await screen.findByRole("region", { name: "生命周期安全摘要" })).toBeTruthy();
    expect(ports.reopen).toHaveBeenCalledWith(
      locator,
      binding.contextPayloadSha256,
      ["FIRST_RAW_SENTINEL", "SECOND_RAW_SENTINEL"]
    );
    expect(screen.getByText("保留 2 · 本机撤下 0")).toBeTruthy();
    expect(screen.getByText(/Reconciliation 输入 2 份/u).textContent).toContain("与至少一份输入严格相同");
    expect(screen.getByText(/本次 fresh repository reread/u)).toBeTruthy();
    expect(document.body.textContent).not.toContain("RECONCILED_RAW_SENTINEL");
    expect(container.querySelector("[data-comparison-ready='true']")).toBeTruthy();
    expect(container.querySelector("[data-storage-mutation-performed='false']")).toBeTruthy();
    expect(container.querySelector("[data-network-transmission-performed='false']")).toBeTruthy();
    expect(screen.getByRole("region", { name: "生命周期安全摘要" })).toBe(document.activeElement);
  });

  it("offers only the finite reason codes, creates a deterministic successor, and fixes delivery to blocked_sensitive", async () => {
    ports.pickTextFile.mockResolvedValue({ name: "one.json", text: "ONE_RAW_SENTINEL" });
    ports.reopen.mockResolvedValue(reopenProjection(1));
    ports.withhold.mockResolvedValue(successorProjection());
    const { container } = render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    await screen.findByRole("region", { name: "生命周期安全摘要" });

    const reasons = screen.getByRole("combobox", { name: "本机撤下有限理由码" });
    expect(within(reasons).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([
      "local_user_request",
      "suspected_record_error",
      "context_superseded",
      "privacy_request",
      "other_unspecified"
    ]);
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.change(reasons, { target: { value: "privacy_request" } });
    fireEvent.click(screen.getByRole("button", { name: "生成本机撤下后继" }));

    expect(await screen.findByText(/已在页面会话中生成确定性本机撤下后继/u)).toBeTruthy();
    expect(ports.withhold).toHaveBeenCalledWith(
      reopenProjection(1).content,
      recordA,
      "privacy_request"
    );
    expect(screen.getByText(/本机撤下后继永不 comparison-ready/u)).toBeTruthy();
    expect(container.querySelector("[data-comparison-ready='false']")).toBeTruthy();
    expect(document.body.textContent).not.toContain("WITHHELD_SUCCESSOR_RAW_SENTINEL");

    fireEvent.click(screen.getByRole("button", { name: "打开本机保存或下载确认" }));
    expect(await screen.findByRole("dialog", { name: "本机保存或下载确认" })).toBeTruthy();
    const artifact = ports.capturedArtifacts.at(-1) as {
      blob: Blob;
      sharePolicy: string;
      description: string;
    };
    expect(artifact.sharePolicy).toBe("blocked_sensitive");
    expect(artifact.description).toContain("下载请求不等于已持久化");
    expect(await artifact.blob.text()).toContain("WITHHELD_SUCCESSOR_RAW_SENTINEL");
    expect(screen.queryByRole("button", { name: /分享/u })).toBeNull();
    expect(document.body.textContent).not.toContain("WITHHELD_SUCCESSOR_RAW_SENTINEL");
  });

  it("binds five save confirmations to the current canonical and clears them after withholding", async () => {
    ports.pickTextFile.mockResolvedValue({ name: "one.json", text: "ONE" });
    ports.reopen.mockResolvedValue(reopenProjection(1));
    ports.withhold.mockResolvedValue(successorProjection());
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    await screen.findByRole("region", { name: "生命周期安全摘要" });
    const saveGroup = screen.getByRole("group", { name: "显式保存当前 canonical 到本机审阅库" });
    for (const checkbox of within(saveGroup).getAllByRole("checkbox")) fireEvent.click(checkbox);
    expect((within(saveGroup).getByRole("button", {
      name: "确认保存当前 canonical"
    }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(screen.getByRole("combobox", { name: "本机撤下有限理由码" }), {
      target: { value: "privacy_request" }
    });
    fireEvent.click(screen.getByRole("button", { name: "生成本机撤下后继" }));
    await screen.findByText(/已在页面会话中生成确定性本机撤下后继/u);

    const successorSaveGroup = screen.getByRole("group", {
      name: "显式保存当前 canonical 到本机审阅库"
    });
    expect(within(successorSaveGroup).getAllByRole<HTMLInputElement>("checkbox")
      .every((checkbox) => checkbox.checked === false)).toBe(true);
    expect((within(successorSaveGroup).getByRole("button", {
      name: "确认保存当前 canonical"
    }) as HTMLButtonElement).disabled).toBe(true);
    expect(ports.saveStored).not.toHaveBeenCalled();
  });

  it("requires an explicit re-pick for digest verification and treats picker cancellation as unverified", async () => {
    ports.pickTextFile
      .mockResolvedValueOnce({ name: "one.json", text: "ONE" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ name: "saved.json", text: "ROUND_TRIP_RAW_SENTINEL" });
    ports.reopen.mockResolvedValue(reopenProjection(1));
    ports.verifyRoundTrip.mockResolvedValue(roundTripProjection());
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    await screen.findByRole("region", { name: "生命周期安全摘要" });

    fireEvent.click(screen.getByRole("button", { name: "重新选择文件核对 sidecar 摘要" }));
    expect(await screen.findByText(/摘要仍未回读验证/u)).toBeTruthy();
    expect(ports.verifyRoundTrip).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "重新选择文件核对 sidecar 摘要" }));
    expect(await screen.findByText(/重新选择的文件已按 canonical sidecar 摘要核对一致/u)).toBeTruthy();
    expect(ports.verifyRoundTrip).toHaveBeenCalledWith(
      "ROUND_TRIP_RAW_SENTINEL",
      "3".repeat(64)
    );
    expect(screen.getByText(/回读摘要匹配/u)).toBeTruthy();
    expect(document.body.textContent).not.toContain("ROUND_TRIP_RAW_SENTINEL");
  });

  it("drops late picker and facade results across reset, binding replacement, and unmount", async () => {
    const latePick = deferred<{ name: string; text: string } | null>();
    ports.pickTextFile.mockImplementationOnce(() => latePick.promise);
    const view = render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    view.rerender(
      <BaziCitationApplicabilityObservationLifecycleFileWorkbench
        binding={{ ...binding, contextPayloadSha256: "e".repeat(64) }}
        citations={citations}
      />
    );
    await act(async () => { latePick.resolve({ name: "late.json", text: "LATE_PICK_RAW_SENTINEL" }); });
    expect(screen.getByText("已选择 0 / 16")).toBeTruthy();
    expect(document.body.textContent).not.toContain("LATE_PICK_RAW_SENTINEL");

    const lateReopen = deferred<LocalBaziCitationApplicabilityObservationPairLifecycleReopen>();
    ports.pickTextFile.mockResolvedValueOnce({ name: "pending.json", text: "PENDING_RAW_SENTINEL" });
    ports.reopen.mockImplementationOnce(() => lateReopen.promise);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    await waitFor(() => expect(ports.reopen).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "清除页面会话选择" }));
    await act(async () => { lateReopen.resolve(reopenProjection(1)); });
    expect(screen.getByText("已选择 0 / 16")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "生命周期安全摘要" })).toBeNull();
    expect(document.body.textContent).not.toContain("RECONCILED_RAW_SENTINEL");

    const unmountPick = deferred<{ name: string; text: string } | null>();
    ports.pickTextFile.mockImplementationOnce(() => unmountPick.promise);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    view.unmount();
    await act(async () => { unmountPick.resolve({ name: "gone.json", text: "UNMOUNT_RAW_SENTINEL" }); });
    expect(document.body.textContent).not.toContain("UNMOUNT_RAW_SENTINEL");
  });

  it("fails reconciliation atomically and clears every selected raw reference", async () => {
    ports.pickTextFile
      .mockResolvedValueOnce({ name: "a.json", text: "FAIL_RAW_A" })
      .mockResolvedValueOnce({ name: "b.json", text: "FAIL_RAW_B" });
    ports.reopen.mockRejectedValue(new Error("fork"));
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 2 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 2 份文件" }));
    expect((await screen.findByRole("alert")).textContent).toContain("原始页面会话引用已清除");
    expect(screen.getByText("已选择 0 / 16")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "生命周期安全摘要" })).toBeNull();
    expect(document.body.textContent).not.toContain("FAIL_RAW_A");
    expect(document.body.textContent).not.toContain("FAIL_RAW_B");
  });

  it("rejects forged authority and content-byte projections without rendering a partial result", async () => {
    const forgedAuthority = {
      ...reopenProjection(1),
      boundary: {
        ...reopenBoundary(true),
        publicReleaseAuthorized: true as false
      }
    };
    ports.pickTextFile.mockResolvedValueOnce({ name: "forged.json", text: "FORGED_RAW" });
    ports.reopen.mockResolvedValueOnce(forgedAuthority);
    const first = render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "生命周期安全摘要" })).toBeNull();
    first.unmount();

    const valid = reopenProjection(1);
    ports.pickTextFile.mockResolvedValueOnce({ name: "bytes.json", text: "BYTES_RAW" });
    ports.reopen.mockResolvedValueOnce({ ...valid, contentBytes: valid.contentBytes + 1 });
    render(<BaziCitationApplicabilityObservationLifecycleFileWorkbench {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "添加一份 lifecycle JSON" }));
    await screen.findByText("已选择 1 / 16");
    fireEvent.click(screen.getByRole("button", { name: "合并并复核 1 份文件" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "生命周期安全摘要" })).toBeNull();
    expect(document.body.textContent).not.toContain("RECONCILED_RAW_SENTINEL");
  });
});
