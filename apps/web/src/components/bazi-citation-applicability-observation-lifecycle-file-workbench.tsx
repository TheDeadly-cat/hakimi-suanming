import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { sha256BytesHex } from "@hakimi/integrity";
import { pickTextFile, webReportExportPort } from "@hakimi/platform";
import {
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS,
  type LocalBaziCitationApplicabilityObservationPairLifecycleReopen,
  type LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification,
  type LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile
} from "../lib/bazi-citation-review-context";
import {
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
  BaziCitationObservationLifecycleStoreError,
  MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_SELECTED_COPIES,
  deleteBaziCitationObservationLifecycleExactCopy,
  readBaziCitationObservationLifecycleAttachmentCatalog,
  readBaziCitationObservationLifecycleOriginalBytes,
  reopenBaziCitationObservationLifecycleStoredCopies,
  saveBaziCitationObservationLifecycleCanonicalSession,
  type BaziCitationObservationLifecycleAttachmentCatalog,
  type BaziCitationObservationLifecycleAttachmentExactIdentity,
  type BaziCitationObservationLifecycleStoredCopiesReopen
} from "../lib/bazi-citation-observation-lifecycle-store";
import type {
  BaziCitationApplicabilityObservationComparisonBinding,
  BaziCitationApplicabilityObservationComparisonCitation
} from "./bazi-citation-applicability-observation-comparison";
import type { PreparedFileArtifact } from "./prepared-file-delivery-dialog";
import { PreparedFileDeliveryLoadBoundary } from "./prepared-file-delivery-load-boundary";
import {
  acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion,
  acquireBaziCitationObservationLifecycleStoreOperation,
  cancelBaziCitationObservationLifecycleStoreOperationBeforeMutation,
  completeBaziCitationObservationLifecycleStoreOperation,
  getBaziCitationObservationLifecycleStoreOperationSnapshot,
  reconcileBaziCitationObservationLifecycleStoreOperationCatalog,
  requireBaziCitationObservationLifecycleStoreOperationReconciliation,
  subscribeBaziCitationObservationLifecycleStoreOperation,
  type BaziCitationObservationLifecycleStoreOperation,
  type BaziCitationObservationLifecycleStorePreMutationFailurePhase
} from "./bazi-citation-observation-lifecycle-store-operation-coordinator";
import "./bazi-citation-applicability-observation-lifecycle-file-workbench.css";

const PreparedFileDeliveryDialog = lazy(async () => {
  const module = await import("./prepared-file-delivery-dialog");
  return { default: module.PreparedFileDeliveryDialog };
});

const MAX_FILES = MAX_BAZI_CITATION_OBSERVATION_LIFECYCLE_SELECTED_COPIES;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const LIFECYCLE_FILENAME = "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json";

type WithholdingReason =
  (typeof LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS)[number];
type Operation =
  | "pick"
  | "reopen"
  | "withhold"
  | "verify"
  | "catalog"
  | "stored_reopen"
  | "store_save"
  | "stored_export"
  | "store_delete";
type SelectedFile = Readonly<{ text: string }>;
type SafeLifecycleProjection =
  | LocalBaziCitationApplicabilityObservationPairLifecycleReopen
  | LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile;
type LifecycleSession =
  | Readonly<{
    kind: "reopened";
    content: string;
    projection: LocalBaziCitationApplicabilityObservationPairLifecycleReopen;
    reconciledInputCount: number;
    outputDigestFoundAmongInputs: boolean;
    sourceAttachments: readonly BaziCitationObservationLifecycleAttachmentExactIdentity[];
  }>
  | Readonly<{
    kind: "withholding_successor";
    content: string;
    projection: LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile;
    reconciledInputCount: number;
    outputDigestFoundAmongInputs: boolean;
    sourceAttachments: readonly BaziCitationObservationLifecycleAttachmentExactIdentity[];
  }>;

type SaveConfirmations = Readonly<{
  explicitSaveIntent: boolean;
  sensitiveReviewerAndDerivedChartContentAcknowledged: boolean;
  plaintextFullBackupInclusionAcknowledged: boolean;
  unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged: boolean;
  priorAndExternalCopiesCannotBeRecalledAcknowledged: boolean;
}>;

type DeleteConfirmations = Readonly<{
  explicitDeleteIntent: boolean;
  currentStoreSingleCopyOnlyAcknowledged: boolean;
  physicalErasureNotAttestedAcknowledged: boolean;
  priorAndExternalCopiesCannotBeRecalledAcknowledged: boolean;
}>;

type VerifiedStoredCopy = Readonly<{
  attachment: BaziCitationObservationLifecycleAttachmentExactIdentity;
  sidecarSha256: string;
}>;

const EMPTY_SAVE_CONFIRMATIONS: SaveConfirmations = Object.freeze({
  explicitSaveIntent: false,
  sensitiveReviewerAndDerivedChartContentAcknowledged: false,
  plaintextFullBackupInclusionAcknowledged: false,
  unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged: false,
  priorAndExternalCopiesCannotBeRecalledAcknowledged: false
});

const EMPTY_DELETE_CONFIRMATIONS: DeleteConfirmations = Object.freeze({
  explicitDeleteIntent: false,
  currentStoreSingleCopyOnlyAcknowledged: false,
  physicalErasureNotAttestedAcknowledged: false,
  priorAndExternalCopiesCannotBeRecalledAcknowledged: false
});

const DELETE_CONFIRMATION_PHRASE = "删除此本机副本";
const PRE_MUTATION_PHASES = new Set<BaziCitationObservationLifecycleStorePreMutationFailurePhase>([
  "input",
  "release_gate",
  "catalog_read",
  "content_read",
  "prewrite"
]);

const reasonLabels: Readonly<Record<WithholdingReason, string>> = Object.freeze({
  local_user_request: "本机用户请求",
  suspected_record_error: "怀疑记录有误",
  context_superseded: "上下文已被后续版本取代",
  privacy_request: "本机隐私请求",
  other_unspecified: "其他未细分原因"
});

function shortDigest(value: string): string {
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

function isValidCounts(value: { recordedNotWithheld: number; withheld: number }): boolean {
  return Number.isInteger(value.recordedNotWithheld)
    && Number.isInteger(value.withheld)
    && value.recordedNotWithheld >= 0
    && value.withheld >= 0
    && value.recordedNotWithheld + value.withheld === 2;
}

function isValidRecords(
  value: readonly Readonly<{ recordSha256: string; state: string }>[]
): value is readonly [
  Readonly<{ recordSha256: string; state: "recorded_current_context_unchecked" | "withheld_by_local_user" }>,
  Readonly<{ recordSha256: string; state: "recorded_current_context_unchecked" | "withheld_by_local_user" }>
] {
  return value.length === 2
    && value.every((record) => SHA256.test(record.recordSha256)
      && (record.state === "recorded_current_context_unchecked"
        || record.state === "withheld_by_local_user"))
    && value[0]!.recordSha256 < value[1]!.recordSha256;
}

function hasSafeCommonProjection(
  projection: SafeLifecycleProjection,
  content: string
): boolean {
  if (
    projection.fileName !== LIFECYCLE_FILENAME
    || typeof content !== "string"
    || content.length === 0
    || !Number.isSafeInteger(projection.contentBytes)
    || projection.contentBytes <= 0
    || projection.contentBytes > MAX_FILE_BYTES
    || new TextEncoder().encode(content).byteLength !== projection.contentBytes
    || !SHA256.test(projection.ledgerId)
    || !SHA256.test(projection.recordSetSha256)
    || !SHA256.test(projection.sidecarSha256)
    || !isValidRecords(projection.records)
    || !isValidCounts(projection.counts)
  ) return false;
  const recorded = projection.records.filter(
    (record) => record.state === "recorded_current_context_unchecked"
  ).length;
  return recorded === projection.counts.recordedNotWithheld
    && 2 - recorded === projection.counts.withheld;
}

function hasFailClosedAuthorityBoundary(boundary: unknown): boolean {
  if (!boundary || typeof boundary !== "object") return false;
  const record = boundary as Readonly<Record<string, unknown>>;
  return record.requiredSharePolicy === "blocked_sensitive"
    && record.formalStoreUsed === false
    && record.localFilePersistencePerformed === false
    && record.preparedFileDeliveryPerformed === false
    && record.networkTransmissionPerformed === false
    && record.networkTransmissionAuthorized === false
    && record.storageMutationPerformed === false
    && record.chartMutationPerformed === false
    && record.caseOrRevisionMutationPerformed === false
    && record.rulePackMutationPerformed === false
    && record.schemaOrReleaseIdentityMutationPerformed === false
    && record.mutationEpochRevalidationPerformed === false
    && record.mutationEpochBypassed === false
    && record.reviewerIdentityVerified === false
    && record.reviewerIndependenceVerified === false
    && record.reviewerWithdrawalAuthorityVerified === false
    && record.publicExportAuthorized === false
    && record.publicReleaseAuthorized === false
    && record.expertTruthClaimed === false
    && record.scientificValidityClaimed === false
    && record.formalActivationAllowed === false
    && record.automaticPromotionAllowed === false
    && record.priorExportsRecalled === false
    && record.physicalDeletionAttested === false
    && record.currentAtReturnAttested === false;
}

function checkedReopen(
  value: LocalBaziCitationApplicabilityObservationPairLifecycleReopen,
  inputCount: number
): LocalBaziCitationApplicabilityObservationPairLifecycleReopen {
  if (
    value.profile !== LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE
    || !hasSafeCommonProjection(value, value.content)
    || value.inputCount !== inputCount
    || value.inputCount < 1
    || value.inputCount > MAX_FILES
    || typeof value.outputDigestFoundAmongInputs !== "boolean"
    || (value.status !== "current_context_matched_comparison_ready"
      && value.status !== "current_context_matched_withheld")
    || (value.status === "current_context_matched_comparison_ready"
      ? value.counts.withheld !== 0 || value.comparison === null
      : value.counts.withheld < 1 || value.comparison !== null)
    || !hasFailClosedAuthorityBoundary(value.boundary)
    || value.boundary.explicitUserReopenActionRequired !== true
    || value.boundary.crossFileReconciliationPerformedBeforeRepositoryRead !== true
    || value.boundary.oneFreshContextRereadAfterReconciliation !== true
    || value.boundary.freshContextTwoPassDigestRevalidationPerformed !== true
    || value.boundary.priorDisplayedContextDigestMatched !== true
    || value.boundary.releaseIdentityDigestTupleMatched !== true
    || value.boundary.contextPayloadDigestMatched !== true
    || value.boundary.displayContextBindingDigestMatched !== true
    || value.boundary.recordSetDigestRecomputedAgainstFreshContext !== true
    || value.boundary.withheldRecordsExcludedFromComparisonReadiness !== true
    || value.boundary.mechanicalComparisonProjectionReturned
      !== (value.status === "current_context_matched_comparison_ready")
  ) throw new Error("unsafe reopen projection");
  return value;
}

function checkedSuccessor(
  value: LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile,
  targetRecordSha256: string,
  reasonCode: WithholdingReason
): LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile {
  if (
    value.profile
      !== LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE
    || !hasSafeCommonProjection(value, value.content)
    || value.targetRecordSha256 !== targetRecordSha256
    || value.reasonCode !== reasonCode
    || value.counts.withheld < 1
    || value.records.find((record) => record.recordSha256 === targetRecordSha256)?.state
      !== "withheld_by_local_user"
    || !hasFailClosedAuthorityBoundary(value.boundary)
    || value.boundary.explicitUserPreparationActionRequired !== true
    || value.boundary.sourceLifecycleFileInspected !== true
    || value.boundary.deterministicSuccessorCreatedAndReinspected !== true
    || value.boundary.finiteReasonCodeRequired !== true
    || value.boundary.terminalLocalWithholdingOnly !== true
    || value.boundary.localUserWithholdingIsReviewerWithdrawal !== false
    || value.boundary.currentContextReadPerformed !== false
    || value.boundary.currentContextDigestMatched !== false
    || value.boundary.priorSidecarMutationPerformed !== false
  ) throw new Error("unsafe withholding projection");
  return value;
}

function checkedRoundTrip(
  value: LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification,
  expectedSidecarSha256: string
): LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification {
  if (
    value.profile !== LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE
    || value.matched !== true
    || value.fileName !== LIFECYCLE_FILENAME
    || !Number.isSafeInteger(value.contentBytes)
    || value.contentBytes <= 0
    || value.contentBytes > MAX_FILE_BYTES
    || value.sidecarSha256 !== expectedSidecarSha256
    || !SHA256.test(value.ledgerId)
    || !SHA256.test(value.recordSetSha256)
    || !isValidRecords(value.records)
    || !isValidCounts(value.counts)
    || !hasFailClosedAuthorityBoundary({
      ...value.boundary,
      localFilePersistencePerformed: value.boundary.localFilePersistenceAttested,
      preparedFileDeliveryPerformed: false
    })
    || value.boundary.explicitUserReinspectionActionRequired !== true
    || value.boundary.lifecycleFileStructurallyReinspected !== true
    || value.boundary.expectedSidecarDigestMatched !== true
    || value.boundary.byteForByteDeliveryAttested !== false
    || value.boundary.localFilePersistenceAttested !== false
    || value.boundary.currentContextReadPerformed !== false
  ) throw new Error("unsafe round-trip projection");
  return value;
}

function sameAttachmentIdentity(
  left: BaziCitationObservationLifecycleAttachmentExactIdentity,
  right: BaziCitationObservationLifecycleAttachmentExactIdentity
): boolean {
  return left.id === right.id
    && left.fileName === right.fileName
    && left.mediaType === right.mediaType
    && left.byteLength === right.byteLength
    && left.contentHash === right.contentHash
    && left.description === right.description
    && left.link === null
    && right.link === null
    && left.createdAt === right.createdAt
    && left.updatedAt === right.updatedAt;
}

function checkedStoredReopen(
  value: BaziCitationObservationLifecycleStoredCopiesReopen,
  selected: readonly BaziCitationObservationLifecycleAttachmentExactIdentity[]
): BaziCitationObservationLifecycleStoredCopiesReopen {
  const returned = value.sources.map((source) => source.attachment);
  if (
    value.profile !== BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE
    || value.boundary.selectedCopyCount !== selected.length
    || value.boundary.selectedCopiesReadSerially !== true
    || value.boundary.eachReadUsedExpectedRawContentHash !== true
    || value.boundary.eachRawContentHashRecomputed !== true
    || value.boundary.eachLifecycleCanonicalDigestReinspected !== true
    || value.boundary.freshContextReopenPerformed !== true
    || value.boundary.catalogWideAtomicContentSnapshotClaimed !== false
    || value.boundary.currentAtReturnAttested !== false
    || value.boundary.storageReadPerformed !== true
    || value.boundary.storageMutationPerformed !== false
    || value.boundary.mutationEpochRevalidationPerformed !== false
    || value.boundary.mutationEpochBypassed !== false
    || value.boundary.networkTransmissionPerformed !== false
    || returned.length !== selected.length
    || returned.some((identity, index) => !sameAttachmentIdentity(identity, selected[index]!))
  ) throw new Error("unsafe stored reopen receipt");
  checkedReopen(value.privateLeafPayload, selected.length);
  return value;
}

function allSaveConfirmationsChecked(value: SaveConfirmations): boolean {
  return Object.values(value).every((checked) => checked === true);
}

function allDeleteConfirmationsChecked(value: DeleteConfirmations): boolean {
  return Object.values(value).every((checked) => checked === true);
}

function freezeIdentity(
  value: BaziCitationObservationLifecycleAttachmentExactIdentity
): BaziCitationObservationLifecycleAttachmentExactIdentity {
  return Object.freeze({ ...value });
}

function freezeVerifiedStoredCopy(
  attachment: BaziCitationObservationLifecycleAttachmentExactIdentity,
  sidecarSha256: string
): VerifiedStoredCopy {
  if (!SHA256.test(sidecarSha256)) throw new Error("invalid verified source digest");
  return Object.freeze({
    attachment: freezeIdentity(attachment),
    sidecarSha256
  });
}

function typedPreMutationPhase(
  cause: unknown
): BaziCitationObservationLifecycleStorePreMutationFailurePhase | null {
  if (
    !(cause instanceof BaziCitationObservationLifecycleStoreError)
    || cause.commitReconciliationRequired
    || !PRE_MUTATION_PHASES.has(cause.phase as BaziCitationObservationLifecycleStorePreMutationFailurePhase)
  ) return null;
  return cause.phase as BaziCitationObservationLifecycleStorePreMutationFailurePhase;
}

function settleFailedStoreOperation(
  operation: BaziCitationObservationLifecycleStoreOperation,
  cause: unknown
): "cancelled_before_mutation" | "reconciliation_required" {
  const phase = typedPreMutationPhase(cause);
  if (
    phase
    && cancelBaziCitationObservationLifecycleStoreOperationBeforeMutation(operation, phase)
  ) return "cancelled_before_mutation";
  requireBaziCitationObservationLifecycleStoreOperationReconciliation(
    operation,
    "call_outcome_unknown"
  );
  return "reconciliation_required";
}

async function pickLifecycleFile(): Promise<Readonly<{ name: string; text: string }> | null> {
  return pickTextFile({ accept: ".json,application/json", maxBytes: MAX_FILE_BYTES });
}

async function reopenLifecycle(
  binding: BaziCitationApplicabilityObservationComparisonBinding,
  texts: readonly string[]
): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleReopen> {
  const module = await import("../lib/bazi-citation-review-context");
  return module.reopenCurrentLocalBaziCitationApplicabilityObservationPairLifecycle(
    binding.locator,
    binding.contextPayloadSha256,
    texts
  );
}

async function prepareWithholdingSuccessor(
  content: string,
  targetRecordSha256: string,
  reasonCode: WithholdingReason
): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleWithholdingPreparedFile> {
  const module = await import("../lib/bazi-citation-review-context");
  return module.prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
    content,
    targetRecordSha256,
    reasonCode
  );
}

async function verifyRoundTrip(
  text: string,
  expectedSidecarSha256: string
): Promise<LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification> {
  const module = await import("../lib/bazi-citation-review-context");
  return module.verifyLocalBaziCitationApplicabilityObservationPairLifecycleRoundTrip(
    text,
    expectedSidecarSha256
  );
}

export type BaziCitationApplicabilityObservationLifecycleFileWorkbenchProps = Readonly<{
  binding: BaziCitationApplicabilityObservationComparisonBinding;
  citations: readonly BaziCitationApplicabilityObservationComparisonCitation[];
}>;

export function BaziCitationApplicabilityObservationLifecycleFileWorkbench({
  binding,
  citations
}: BaziCitationApplicabilityObservationLifecycleFileWorkbenchProps) {
  const leafIdentity = JSON.stringify([
    binding.locator.caseId,
    binding.locator.revisionId,
    binding.locator.evidenceSubjectId,
    binding.locator.fieldPath,
    binding.contextPayloadSha256,
    binding.displayContextBindingSha256,
    binding.worksetSnapshotSha256,
    binding.matchingSourceSetSha256,
    citations.map((citation) => [citation.citationId, citation.title])
  ]);
  return (
    <BaziCitationApplicabilityObservationLifecycleFileWorkbenchLeaf
      key={leafIdentity}
      binding={binding}
      citationCount={citations.length}
    />
  );
}

function BaziCitationApplicabilityObservationLifecycleFileWorkbenchLeaf({
  binding,
  citationCount
}: Readonly<{
  binding: BaziCitationApplicabilityObservationComparisonBinding;
  citationCount: number;
}>) {
  const [files, setFiles] = useState<readonly SelectedFile[]>([]);
  const [session, setSession] = useState<LifecycleSession | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [targetRecordSha256, setTargetRecordSha256] = useState("");
  const [reasonCode, setReasonCode] = useState<WithholdingReason>(
    LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS[0]
  );
  const [roundTrip, setRoundTrip] =
    useState<LocalBaziCitationApplicabilityObservationPairLifecycleRoundTripVerification | null>(null);
  const [preparedArtifact, setPreparedArtifact] = useState<PreparedFileArtifact | null>(null);
  const [catalog, setCatalog] = useState<BaziCitationObservationLifecycleAttachmentCatalog | null>(null);
  const [catalogStale, setCatalogStale] = useState(false);
  const [selectedStoredIds, setSelectedStoredIds] = useState<readonly string[]>([]);
  const [verifiedStoredCopies, setVerifiedStoredCopies] =
    useState<readonly VerifiedStoredCopy[]>([]);
  const [saveConfirmations, setSaveConfirmations] = useState<SaveConfirmations>(EMPTY_SAVE_CONFIRMATIONS);
  const [deleteTarget, setDeleteTarget] = useState<VerifiedStoredCopy | null>(null);
  const [deleteConfirmations, setDeleteConfirmations] =
    useState<DeleteConfirmations>(EMPTY_DELETE_CONFIRMATIONS);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [storageMutationPerformed, setStorageMutationPerformed] = useState(false);
  const storeSnapshot = useSyncExternalStore(
    subscribeBaziCitationObservationLifecycleStoreOperation,
    getBaziCitationObservationLifecycleStoreOperationSnapshot,
    getBaziCitationObservationLifecycleStoreOperationSnapshot
  );
  const mountedRef = useRef(true);
  const operationTokenRef = useRef(0);
  const firstActionRef = useRef<HTMLButtonElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationTokenRef.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    if (session && !preparedArtifact) resultRef.current?.focus();
  }, [preparedArtifact, session]);

  const storeLocked = storeSnapshot.status === "writing"
    || storeSnapshot.status === "reconciliation_required";
  const reset = () => {
    if (storeLocked) return;
    operationTokenRef.current += 1;
    setFiles([]);
    setSession(null);
    setOperation(null);
    setError(null);
    setNotice(null);
    setTargetRecordSha256("");
    setReasonCode(
      LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS[0]
    );
    setRoundTrip(null);
    setPreparedArtifact(null);
    setCatalog(null);
    setCatalogStale(false);
    setSelectedStoredIds([]);
    setVerifiedStoredCopies([]);
    setSaveConfirmations(EMPTY_SAVE_CONFIRMATIONS);
    setDeleteTarget(null);
    setDeleteConfirmations(EMPTY_DELETE_CONFIRMATIONS);
    setDeletePhrase("");
    requestAnimationFrame(() => firstActionRef.current?.focus());
  };

  const chooseFile = async () => {
    if (operation || storeLocked || session || files.length >= MAX_FILES) return;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("pick");
    setError(null);
    setNotice(null);
    try {
      const selected = await pickLifecycleFile();
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      if (!selected) {
        setNotice("本次没有选择文件；已有页面会话选择未改变。");
        return;
      }
      if (
        typeof selected.text !== "string"
        || selected.text.length === 0
        || new TextEncoder().encode(selected.text).byteLength > MAX_FILE_BYTES
      ) throw new Error("invalid lifecycle file");
      setFiles((current) => Object.freeze([...current, Object.freeze({ text: selected.text })]));
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError("生命周期 JSON 没有进入本次页面会话选择；未读取、合并或保存任何记录。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const reconcile = async () => {
    if (operation || storeLocked || session || files.length < 1 || files.length > MAX_FILES) return;
    const selectedTexts = files.map((file) => file.text);
    const inputCount = selectedTexts.length;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("reopen");
    setError(null);
    setNotice(null);
    try {
      const projection = checkedReopen(await reopenLifecycle(binding, selectedTexts), inputCount);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setFiles([]);
      setSession(Object.freeze({
        kind: "reopened",
        content: projection.content,
        projection,
        reconciledInputCount: projection.inputCount,
        outputDigestFoundAmongInputs: projection.outputDigestFoundAmongInputs,
        sourceAttachments: Object.freeze([])
      }));
      setVerifiedStoredCopies([]);
      setSaveConfirmations(EMPTY_SAVE_CONFIRMATIONS);
      setDeleteTarget(null);
      setDeleteConfirmations(EMPTY_DELETE_CONFIRMATIONS);
      setDeletePhrase("");
      setTargetRecordSha256(
        projection.records.find((record) => record.state === "recorded_current_context_unchecked")
          ?.recordSha256 ?? ""
      );
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setFiles([]);
      setSession(null);
      setTargetRecordSha256("");
      setError("这些文件未通过同一 ledger、事件链、确定性 reconciliation 与本次 fresh context 复核；原始页面会话引用已清除，未形成结果。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const withhold = async () => {
    if (!session || operation || storeLocked || !targetRecordSha256) return;
    const target = session.projection.records.find(
      (record) => record.recordSha256 === targetRecordSha256
    );
    if (!target || target.state !== "recorded_current_context_unchecked") return;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("withhold");
    setError(null);
    setNotice(null);
    setPreparedArtifact(null);
    try {
      const projection = checkedSuccessor(
        await prepareWithholdingSuccessor(session.content, targetRecordSha256, reasonCode),
        targetRecordSha256,
        reasonCode
      );
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setSession(Object.freeze({
        kind: "withholding_successor",
        content: projection.content,
        projection,
        reconciledInputCount: session.reconciledInputCount,
        outputDigestFoundAmongInputs: session.outputDigestFoundAmongInputs,
        sourceAttachments: session.sourceAttachments
      }));
      setSaveConfirmations(EMPTY_SAVE_CONFIRMATIONS);
      setDeleteTarget(null);
      setDeleteConfirmations(EMPTY_DELETE_CONFIRMATIONS);
      setDeletePhrase("");
      setTargetRecordSha256(
        projection.records.find((record) => record.state === "recorded_current_context_unchecked")
          ?.recordSha256 ?? ""
      );
      setRoundTrip(null);
      setNotice("已在页面会话中生成确定性本机撤下后继；这不是 reviewer 撤回、物理删除或旧副本召回。");
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError("本机撤下后继未通过有限理由、目标记录或确定性事件链检查；当前 canonical 文件保持不变。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const openDelivery = () => {
    if (!session || operation || storeLocked) return;
    const blob = new Blob([session.content], { type: "application/json;charset=utf-8" });
    if (blob.size !== session.projection.contentBytes) {
      setError("页面会话 canonical 文本与声明字节数不一致；交付已失败关闭。");
      return;
    }
    setError(null);
    setPreparedArtifact(Object.freeze({
      blob,
      filename: LIFECYCLE_FILENAME,
      title: session.kind === "withholding_successor"
        ? "双观察生命周期本机撤下后继"
        : "双观察生命周期 reconciliation 文件",
      description: "包含完整观察自由文本与派生上下文绑定，未加密且只允许本机保存或下载。发出下载请求不等于已持久化；本机撤下不证明 reviewer 权威、物理删除或旧副本召回，也不构成内容真值、正式激活或公开发布授权。",
      sharePolicy: "blocked_sensitive"
    }));
  };

  const verify = async () => {
    if (!session || operation || storeLocked) return;
    const expected = session.projection.sidecarSha256;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("verify");
    setError(null);
    setNotice(null);
    setRoundTrip(null);
    try {
      const selected = await pickLifecycleFile();
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      if (!selected) {
        setNotice("未重新选择文件；下载请求或文件对话框出现不代表已持久化，摘要仍未回读验证。");
        return;
      }
      if (
        typeof selected.text !== "string"
        || selected.text.length === 0
        || new TextEncoder().encode(selected.text).byteLength > MAX_FILE_BYTES
      ) throw new Error("invalid round-trip file");
      const verification = checkedRoundTrip(await verifyRoundTrip(selected.text, expected), expected);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setRoundTrip(verification);
      setNotice("重新选择的文件已按 canonical sidecar 摘要核对一致；这只验证所选字节，不证明此前下载已持久化到任何特定位置。");
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setRoundTrip(null);
      setError("重新选择的文件未匹配当前期望 sidecar 摘要；不建立 round-trip 或持久化证明。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const refreshCatalog = async () => {
    if (operation || storeSnapshot.status === "writing") return;
    const reconciliationIssue = storeSnapshot.status === "reconciliation_required"
      ? storeSnapshot.issue
      : null;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("catalog");
    setError(null);
    setNotice(null);
    try {
      const nextCatalog = await readBaziCitationObservationLifecycleAttachmentCatalog();
      if (
        nextCatalog.profile !== BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE
        || nextCatalog.boundary.completeCoverageVerified !== true
        || nextCatalog.boundary.atomicMetadataSnapshotVerified !== true
        || nextCatalog.boundary.contentIntegrityVerified !== false
        || nextCatalog.boundary.storageReadPerformed !== true
        || nextCatalog.boundary.storageMutationPerformed !== false
        || nextCatalog.boundary.timestampOrderingUsed !== false
      ) throw new Error("unsafe catalog receipt");
      const resolution = reconciliationIssue
        ? reconcileBaziCitationObservationLifecycleStoreOperationCatalog(
          reconciliationIssue,
          {
            scopeIdentitySha256: reconciliationIssue.operation.scopeIdentitySha256,
            coverage: "complete",
            atomicStorageSnapshotVerified: true,
            entries: nextCatalog.items.map((item) => ({
              attachmentId: item.id,
              contentHash: item.contentHash
            }))
          }
        )
        : null;
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setCatalog(nextCatalog);
      setCatalogStale(false);
      setSelectedStoredIds([]);
      if (resolution === "locked" || resolution === "rejected") {
        setNotice("完整原子目录已读取，但不能唯一判定此前写入结果；全局核对锁继续保留。");
      } else if (resolution === "completed") {
        setNotice("完整原子目录已完成核对并形成待精确认领回执；目录内容本身仍未验真。");
      } else if (resolution === "idle") {
        setNotice("完整原子目录已完成核对；此前操作未形成可认领完成回执，锁已回到 idle。目录内容仍未验真。");
      } else {
        setNotice("已读取本机审阅库完整原子目录；这里只核对元数据，附件内容仍未验真。");
      }
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError(reconciliationIssue
        ? "完整原子目录读取失败；此前写入/删除结果仍未知，全局核对锁保持不变。"
        : "本机审阅库目录读取失败；未建立附件内容、完整性或 current-context 结论。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const toggleStoredCopy = (id: string) => {
    if (operation || storeLocked || session || !catalog) return;
    setSelectedStoredIds((current) => {
      if (current.includes(id)) return Object.freeze(current.filter((value) => value !== id));
      if (current.length >= MAX_FILES || !catalog.items.some((item) => item.id === id)) return current;
      return Object.freeze([...current, id]);
    });
  };

  const reopenStoredCopies = async () => {
    if (operation || storeLocked || session || !catalog) return;
    const selected = catalog.items.filter((item) => selectedStoredIds.includes(item.id));
    if (selected.length < 1 || selected.length > MAX_FILES) return;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("stored_reopen");
    setError(null);
    setNotice(null);
    try {
      const receipt = checkedStoredReopen(
        await reopenBaziCitationObservationLifecycleStoredCopies({
          locator: binding.locator,
          expectedPriorContextPayloadSha256: binding.contextPayloadSha256,
          copies: selected
        }),
        selected
      );
      const projection = checkedReopen(receipt.privateLeafPayload, selected.length);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      const verifiedSources = Object.freeze(receipt.sources.map((source) => (
        freezeVerifiedStoredCopy(source.attachment, source.lifecycle.sidecarSha256)
      )));
      const sources = Object.freeze(verifiedSources.map((source) => source.attachment));
      setFiles([]);
      setSelectedStoredIds([]);
      setSession(Object.freeze({
        kind: "reopened",
        content: projection.content,
        projection,
        reconciledInputCount: projection.inputCount,
        outputDigestFoundAmongInputs: projection.outputDigestFoundAmongInputs,
        sourceAttachments: sources
      }));
      setVerifiedStoredCopies(verifiedSources);
      setSaveConfirmations(EMPTY_SAVE_CONFIRMATIONS);
      setDeleteTarget(null);
      setDeleteConfirmations(EMPTY_DELETE_CONFIRMATIONS);
      setDeletePhrase("");
      setTargetRecordSha256(
        projection.records.find((record) => record.state === "recorded_current_context_unchecked")
          ?.recordSha256 ?? ""
      );
      setNotice(`已逐份验真并 fresh-context 重开 ${sources.length} 个本机副本；只有这些 exact identities 可执行原字节导出或 CAS 删除。`);
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setSelectedStoredIds([]);
      setSession(null);
      setVerifiedStoredCopies([]);
      setError("所选本机副本未通过 exact raw hash、canonical digest、确定性 reconciliation 或 fresh-context 复核；未形成页面会话结果。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const saveCanonicalToStore = async () => {
    if (
      !session
      || operation
      || storeSnapshot.status !== "idle"
      || !allSaveConfirmationsChecked(saveConfirmations)
    ) return;
    const capturedSession = session;
    const rawBytes = new TextEncoder().encode(capturedSession.content);
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("store_save");
    setError(null);
    setNotice(null);
    let storeOperation: BaziCitationObservationLifecycleStoreOperation | null = null;
    try {
      const expectedContentHash = await sha256BytesHex(rawBytes);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      storeOperation = acquireBaziCitationObservationLifecycleStoreOperation({
        kind: "save",
        scopeIdentitySha256: binding.displayContextBindingSha256,
        expectedContentHash,
        expectedSidecarSha256: capturedSession.projection.sidecarSha256,
        attachmentId: null,
        startedAt: new Date().toISOString()
      });
      if (!storeOperation) {
        setError("全局本机审阅库已有未认领或未核对操作；当前 canonical 未发出写调用。");
        return;
      }
      const receipt = await saveBaziCitationObservationLifecycleCanonicalSession({
        content: capturedSession.content,
        expectedSidecarSha256: capturedSession.projection.sidecarSha256,
        sourceIdentities: capturedSession.sourceAttachments,
        confirmation: {
          explicitSaveIntent: true,
          sensitiveReviewerAndDerivedChartContentAcknowledged: true,
          plaintextFullBackupInclusionAcknowledged: true,
          unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged: true,
          priorAndExternalCopiesCannotBeRecalledAcknowledged: true
        }
      });
      if (
        receipt.profile !== BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE
        || receipt.attachment.contentHash !== expectedContentHash
        || receipt.attachment.byteLength !== rawBytes.byteLength
        || receipt.lifecycle.sidecarSha256 !== capturedSession.projection.sidecarSha256
        || receipt.sourceIdentityCount !== capturedSession.sourceAttachments.length
        || receipt.boundary.requiredSharePolicy !== "blocked_sensitive"
        || receipt.boundary.exactRawBytesReadBack !== true
        || receipt.boundary.rawContentHashMatched !== true
        || receipt.boundary.lifecycleRoundTripDigestMatched !== true
        || receipt.boundary.exactPurposeCatalogCapacityAtomicallyAdmitted !== true
        || receipt.boundary.sourceIdentitiesAtomicallyRevalidatedDuringCreate
          !== (capturedSession.sourceAttachments.length > 0)
        || receipt.boundary.storageWriteCallPerformed !== true
        || receipt.boundary.newAttachmentRecordCreated !== receipt.created
        || receipt.boundary.storageMutationPerformed !== receipt.created
      ) {
        requireBaziCitationObservationLifecycleStoreOperationReconciliation(
          storeOperation,
          "returned_receipt_invalid"
        );
        if (mountedRef.current) setError("写入返回的安全回执不完整；提交结果按未知处理，必须读取完整原子目录核对。");
        return;
      }
      const completion = completeBaziCitationObservationLifecycleStoreOperation(storeOperation, {
        code: receipt.created ? "saved_created" : "saved_existing",
        attachmentId: receipt.attachment.id
      });
      if (!completion) {
        if (mountedRef.current) setError("全局写入操作身份已变化；当前页面不会覆盖新状态。");
        return;
      }
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setSession(Object.freeze({
        ...capturedSession,
        sourceAttachments: Object.freeze([freezeIdentity(receipt.attachment)])
      }));
      setVerifiedStoredCopies([]);
      setCatalog(null);
      setCatalogStale(true);
      setSelectedStoredIds([]);
      setSaveConfirmations(EMPTY_SAVE_CONFIRMATIONS);
      setDeleteTarget(null);
      setDeleteConfirmations(EMPTY_DELETE_CONFIRMATIONS);
      setDeletePhrase("");
      if (receipt.boundary.storageMutationPerformed) setStorageMutationPerformed(true);
      setNotice(receipt.created
        ? "已形成新本机附件记录；安全回执仍需精确认领，目录已标记 stale。"
        : "相同原字节附件已存在，未创建重复记录；安全回执仍需精确认领，目录已标记 stale。");
    } catch (cause) {
      if (!storeOperation) {
        if (mountedRef.current && operationTokenRef.current === token) {
          setError("计算 canonical 原字节摘要失败；未取得全局写入锁，也未发出存储调用。");
        }
        return;
      }
      const outcome = settleFailedStoreOperation(storeOperation, cause);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError(outcome === "cancelled_before_mutation"
        ? "adapter 在存储 mutation call 前失败；全局锁已安全取消，没有声称写入发生。"
        : "写调用结果无法证明；全局状态已锁为 reconciliation_required，必须显式读取完整原子目录核对。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const exportExactStoredBytes = async (
    requested: BaziCitationObservationLifecycleAttachmentExactIdentity
  ) => {
    if (!session || operation || storeLocked) return;
    const verified = verifiedStoredCopies.find(
      (item) => item.attachment.id === requested.id
        && sameAttachmentIdentity(item.attachment, requested)
    );
    if (!verified) return;
    const expectedSidecarSha256 = verified.sidecarSha256;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("stored_export");
    setError(null);
    setNotice(null);
    try {
      const result = await readBaziCitationObservationLifecycleOriginalBytes({
        attachment: verified.attachment,
        expectedSidecarSha256
      });
      const actualHash = await sha256BytesHex(result.bytes);
      if (
        result.profile !== BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE
        || !sameAttachmentIdentity(result.attachment, verified.attachment)
        || result.lifecycle.sidecarSha256 !== expectedSidecarSha256
        || result.bytes.byteLength !== verified.attachment.byteLength
        || actualHash !== verified.attachment.contentHash
        || result.boundary.exactStoredBytesReturned !== true
        || result.boundary.jsonReserializationPerformed !== false
        || result.boundary.requiredSharePolicy !== "blocked_sensitive"
      ) throw new Error("unsafe exact bytes receipt");
      const blob = new Blob([Uint8Array.from(result.bytes)], {
        type: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE
      });
      if (blob.size !== verified.attachment.byteLength) throw new Error("blob length mismatch");
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setPreparedArtifact(Object.freeze({
        blob,
        filename: verified.attachment.fileName,
        title: "本机审阅库 exact 原字节副本",
        description: "这是当前页面已验真的单个本机附件原字节，不做 JSON 重序列化。发出下载请求不等于已经持久化；该导出不会召回旧下载、备份或其他 profile/device 的副本。",
        sharePolicy: "blocked_sensitive"
      }));
    } catch {
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError("本机附件原字节未通过 exact identity、raw hash 或 sidecar digest 回读检查；交付失败关闭。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const prepareDelete = (requested: BaziCitationObservationLifecycleAttachmentExactIdentity) => {
    if (!session || operation || storeSnapshot.status !== "idle") return;
    const verified = verifiedStoredCopies.find(
      (item) => item.attachment.id === requested.id
        && sameAttachmentIdentity(item.attachment, requested)
    );
    if (!verified) return;
    setDeleteTarget(freezeVerifiedStoredCopy(verified.attachment, verified.sidecarSha256));
    setDeleteConfirmations(EMPTY_DELETE_CONFIRMATIONS);
    setDeletePhrase("");
    setError(null);
  };

  const deleteExactStoredCopy = async () => {
    if (
      !session
      || !deleteTarget
      || operation
      || storeSnapshot.status !== "idle"
      || !allDeleteConfirmationsChecked(deleteConfirmations)
      || deletePhrase !== DELETE_CONFIRMATION_PHRASE
    ) return;
    const capturedSession = session;
    const target = capturedSession.sourceAttachments.find(
      (item) => sameAttachmentIdentity(item, deleteTarget.attachment)
    );
    if (!target) return;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation("store_delete");
    setError(null);
    setNotice(null);
    const storeOperation = acquireBaziCitationObservationLifecycleStoreOperation({
      kind: "delete",
      scopeIdentitySha256: binding.displayContextBindingSha256,
      expectedContentHash: target.contentHash,
      expectedSidecarSha256: deleteTarget.sidecarSha256,
      attachmentId: target.id,
      startedAt: new Date().toISOString()
    });
    if (!storeOperation) {
      setOperation(null);
      setError("全局本机审阅库已有未认领或未核对操作；没有发出删除调用。");
      return;
    }
    try {
      const receipt = await deleteBaziCitationObservationLifecycleExactCopy({
        attachment: target,
        expectedSidecarSha256: deleteTarget.sidecarSha256,
        confirmation: {
          explicitDeleteIntent: true,
          currentStoreSingleCopyOnlyAcknowledged: true,
          physicalErasureNotAttestedAcknowledged: true,
          priorAndExternalCopiesCannotBeRecalledAcknowledged: true
        }
      });
      if (
        receipt.profile !== BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE
        || !sameAttachmentIdentity(receipt.attachment, target)
        || receipt.lifecycle.sidecarSha256 !== deleteTarget.sidecarSha256
        || receipt.boundary.fullIdentityCasDeleteRequested !== true
        || receipt.boundary.exactPurposeSnapshotConfirmedIdAbsent !== true
        || receipt.boundary.currentStoreAttachmentCopyAbsentVerified !== true
        || receipt.boundary.physicalDeletionAttested !== false
        || receipt.boundary.priorExportsRecalled !== false
        || receipt.boundary.priorPlaintextBackupsRecalled !== false
        || receipt.boundary.otherBrowserProfilesRecalled !== false
        || receipt.boundary.otherDevicesRecalled !== false
        || receipt.boundary.storageMutationPerformed !== true
      ) {
        requireBaziCitationObservationLifecycleStoreOperationReconciliation(
          storeOperation,
          "returned_receipt_invalid"
        );
        if (mountedRef.current) setError("删除返回的安全回执不完整；结果按未知处理，必须读取完整原子目录核对。");
        return;
      }
      const completion = completeBaziCitationObservationLifecycleStoreOperation(storeOperation, {
        code: "deleted",
        attachmentId: target.id
      });
      if (!completion) {
        if (mountedRef.current) setError("全局删除操作身份已变化；当前页面不会覆盖新状态。");
        return;
      }
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setSession(Object.freeze({
        ...capturedSession,
        sourceAttachments: Object.freeze(
          capturedSession.sourceAttachments.filter((item) => item.id !== target.id)
        )
      }));
      setVerifiedStoredCopies((current) => Object.freeze(
        current.filter((item) => item.attachment.id !== target.id)
      ));
      setSaveConfirmations(EMPTY_SAVE_CONFIRMATIONS);
      setDeleteTarget(null);
      setDeleteConfirmations(EMPTY_DELETE_CONFIRMATIONS);
      setDeletePhrase("");
      setCatalog(null);
      setCatalogStale(true);
      setSelectedStoredIds([]);
      setStorageMutationPerformed(true);
      setNotice("当前 origin 的 exact attachment record/数据库字节已验证为 absent；这不是物理擦除证明，也不能召回旧下载、明文备份、其他 profile/device 或 OS 残留。");
    } catch (cause) {
      const outcome = settleFailedStoreOperation(storeOperation, cause);
      if (!mountedRef.current || operationTokenRef.current !== token) return;
      setError(outcome === "cancelled_before_mutation"
        ? "adapter 在 delete mutation call 前失败；全局锁已安全取消，没有声称删除发生。"
        : "删除调用结果无法证明；全局状态已锁为 reconciliation_required，必须显式读取完整原子目录核对。");
    } finally {
      if (mountedRef.current && operationTokenRef.current === token) setOperation(null);
    }
  };

  const recordedRecords = session?.projection.records.filter(
    (record) => record.state === "recorded_current_context_unchecked"
  ) ?? [];
  const comparisonReady = session?.kind === "reopened"
    && session.projection.status === "current_context_matched_comparison_ready"
    && session.projection.counts.withheld === 0;

  return (
    <section
      className="bazi-lifecycle-file-workbench"
      aria-label="双观察生命周期本机文件与审阅库复核"
      data-comparison-ready={comparisonReady ? "true" : "false"}
      data-storage-mutation-performed={storageMutationPerformed ? "true" : "false"}
      data-store-operation-state={storeSnapshot.status}
      data-external-file-path="read_only"
      data-local-attachment-store-write-policy="explicit_confirmed_only"
      data-network-transmission-performed="false"
      data-mutation-epoch-revalidation-performed="false"
      data-mutation-epoch-bypassed="false"
      data-share-policy="blocked_sensitive"
      data-public-release-authorized="false"
    >
      {preparedArtifact ? (
        <PreparedFileDeliveryLoadBoundary onClose={() => setPreparedArtifact(null)}>
          <Suspense fallback={<div role="status">正在载入本机文件交付确认…</div>}>
            <PreparedFileDeliveryDialog
              artifact={preparedArtifact}
              exportPort={webReportExportPort}
              onClose={() => setPreparedArtifact(null)}
            />
          </Suspense>
        </PreparedFileDeliveryLoadBoundary>
      ) : null}

      <header className="bazi-lifecycle-file-workbench__header">
        <div>
          <p className="eyebrow">1–16 local copies · deterministic reconciliation</p>
          <h5>重开、合并、本机审阅库与回读核对</h5>
          <p>外部 JSON 路径只读；本机审阅库仅在显式读取、保存或 exact-copy 删除动作后访问。合并只按摘要与事件链支配关系，不使用时间、输入顺序、多数或“最新文件”。当前绑定含 {citationCount} 条 citation。</p>
        </div>
        <strong>{session ? "页面会话内已有 canonical 文件" : `已选择 ${files.length} / ${MAX_FILES}`}</strong>
      </header>

      <aside className="bazi-lifecycle-file-workbench__coordinator" aria-label="本机审阅库全局操作状态">
        {storeSnapshot.status === "idle" ? (
          <p><strong>全局状态：idle</strong>。当前没有写入或删除锁。</p>
        ) : storeSnapshot.status === "writing" ? (
          <p role="status"><strong>全局状态：writing</strong> · {storeSnapshot.operation.kind} · token {storeSnapshot.operation.token}。即使本叶卸载，adapter 返回后仍会写入安全回执或转入核对锁；当前禁止 reset 和新操作。</p>
        ) : storeSnapshot.status === "completed_unacknowledged" ? (
          <div>
            <p role="status"><strong>全局状态：completed_unacknowledged</strong> · {storeSnapshot.receipt.code} · token {storeSnapshot.receipt.operationToken} · attachment <code>{storeSnapshot.receipt.attachmentId}</code> · raw <code>{shortDigest(storeSnapshot.receipt.expectedContentHash)}</code>。该回执不会自动改写当前页面会话。</p>
            <button
              type="button"
              className="secondary-action"
              disabled={Boolean(operation)}
              onClick={() => {
                if (acknowledgeBaziCitationObservationLifecycleStoreOperationCompletion(storeSnapshot.receipt)) {
                  setNotice("已按精确对象身份认领完成回执；全局状态回到 idle。");
                }
              }}
            >
              精确认领此完成回执
            </button>
          </div>
        ) : (
          <div>
            <p role="alert"><strong>全局状态：reconciliation_required</strong> · {storeSnapshot.issue.errorCode} · token {storeSnapshot.issue.operation.token} · scope <code>{shortDigest(storeSnapshot.issue.operation.scopeIdentitySha256)}</code>。结果未知；普通清除不能解锁。</p>
            <button
              type="button"
              className="primary-action"
              disabled={Boolean(operation)}
              aria-busy={operation === "catalog"}
              onClick={() => void refreshCatalog()}
            >
              {operation === "catalog" ? "正在读取完整原子目录并核对" : "读取完整原子目录并核对"}
            </button>
          </div>
        )}
      </aside>

      <section className="bazi-lifecycle-file-workbench__catalog" aria-label="本机审阅库目录">
        <div className="bazi-lifecycle-file-workbench__catalog-heading">
          <div>
            <h6>本机审阅库目录</h6>
            <p>不会在 mount 自动读取。目录只含安全元数据；所有列出的附件内容都标记为未验真，必须选中后 fresh-context 重开。</p>
          </div>
          <button
            type="button"
            className="secondary-action"
            disabled={Boolean(operation) || storeSnapshot.status === "writing"}
            aria-busy={operation === "catalog"}
            onClick={() => void refreshCatalog()}
          >
            {operation === "catalog" ? "正在读取本机审阅库" : "读取/刷新本机审阅库"}
          </button>
        </div>
        {catalogStale && !catalog ? (
          <p className="bazi-lifecycle-file-workbench__catalog-warning">目录已 stale；保存/删除回执不能代替一次新的完整原子目录读取。</p>
        ) : null}
        {catalog ? (
          <>
            <p>共 {catalog.summary.storedCopies} 个 purpose-matched 副本 · 声明字节 {catalog.summary.matchedDeclaredBytes} · 内容完整性：未验真。createdAt / updatedAt 只是记录字段，不表示“最新”、优先级或赢家。</p>
            <ol className="bazi-lifecycle-file-workbench__catalog-items">
              {catalog.items.map((item) => {
                const checked = selectedStoredIds.includes(item.id);
                return (
                  <li key={item.id}>
                    <label>
                      <input
                        type="checkbox"
                        aria-label={`选择本机审阅库副本 ${item.id}`}
                        checked={checked}
                        disabled={Boolean(operation) || storeLocked || Boolean(session)}
                        onChange={() => toggleStoredCopy(item.id)}
                      />
                      <span>附件 ID <code>{item.id}</code></span>
                    </label>
                    <span>raw hash <code>{shortDigest(item.contentHash)}</code> · {item.byteLength} bytes · 内容未验真</span>
                    <span>createdAt {item.createdAt} · updatedAt {item.updatedAt}（非 latest 排序）</span>
                  </li>
                );
              })}
            </ol>
            {!session ? (
              <button
                type="button"
                className="primary-action"
                disabled={Boolean(operation) || storeLocked || selectedStoredIds.length < 1}
                aria-busy={operation === "stored_reopen"}
                onClick={() => void reopenStoredCopies()}
              >
                {operation === "stored_reopen"
                  ? "正在逐份验真并 fresh-context 重开"
                  : `验真并重开 ${selectedStoredIds.length} 个本机副本`}
              </button>
            ) : null}
          </>
        ) : (
          <p>尚未读取目录；不据此声称本机审阅库为空。</p>
        )}
      </section>

      {!session ? (
        <div className="bazi-lifecycle-file-workbench__selection">
          <button
            ref={firstActionRef}
            type="button"
            className="secondary-action"
            disabled={Boolean(operation) || storeLocked || files.length >= MAX_FILES}
            aria-busy={operation === "pick"}
            onClick={() => void chooseFile()}
          >
            {operation === "pick" ? "正在选择本机 JSON" : "添加一份 lifecycle JSON"}
          </button>
          <button
            type="button"
            className="primary-action"
            disabled={Boolean(operation) || storeLocked || files.length < 1}
            aria-busy={operation === "reopen"}
            onClick={() => void reconcile()}
          >
            {operation === "reopen" ? "正在合并并 fresh reread" : `合并并复核 ${files.length} 份文件`}
          </button>
          {files.length > 0 ? (
            <button type="button" className="secondary-action" disabled={storeLocked} onClick={reset}>清除页面会话选择</button>
          ) : null}
        </div>
      ) : (
        <div
          ref={resultRef}
          className="bazi-lifecycle-file-workbench__result"
          role="region"
          aria-label="生命周期安全摘要"
          tabIndex={-1}
        >
          <div className="bazi-lifecycle-file-workbench__digest-grid">
            <div><span>Ledger</span><code>{shortDigest(session.projection.ledgerId)}</code></div>
            <div><span>记录集合</span><code>{shortDigest(session.projection.recordSetSha256)}</code></div>
            <div><span>Sidecar</span><code>{shortDigest(session.projection.sidecarSha256)}</code></div>
            <div><span>Canonical 字节</span><strong>{session.projection.contentBytes} bytes</strong></div>
            <div><span>状态计数</span><strong>保留 {session.projection.counts.recordedNotWithheld} · 本机撤下 {session.projection.counts.withheld}</strong></div>
          </div>
          <p className="bazi-lifecycle-file-workbench__reconciliation">
            Reconciliation 输入 {session.reconciledInputCount} 份 · canonical 输出摘要
            {session.outputDigestFoundAmongInputs
              ? "与至少一份输入严格相同"
              : "由兼容事件链合并生成，未在输入中出现"}。该信息不表达时间、最新版本或赢家。
          </p>
          <ol className="bazi-lifecycle-file-workbench__records" aria-label="记录生命周期摘要">
            {session.projection.records.map((record, index) => (
              <li key={record.recordSha256}>
                <span>规范记录 {index + 1}</span>
                <code>{shortDigest(record.recordSha256)}</code>
                <strong>{record.state === "withheld_by_local_user" ? "本机撤下终态" : "记录在链"}</strong>
              </li>
            ))}
          </ol>
          <p className="bazi-lifecycle-file-workbench__eligibility" role="status">
            {comparisonReady
              ? "本次 fresh repository reread 与冻结摘要匹配；仅允许机械并列候选，return 时 current 未证明。"
              : session.kind === "withholding_successor"
                ? "本机撤下后继永不 comparison-ready；它没有重新证明 current context。"
                : "本次 fresh reread 仅匹配 release/context/display/record-set 摘要；由于存在本机撤下记录，未执行观察内容 current-context 预检，永不 comparison-ready。"}
          </p>

          <fieldset className="bazi-lifecycle-file-workbench__store-save">
            <legend>显式保存当前 canonical 到本机审阅库</legend>
            <p>待保存安全摘要：ledger <code>{shortDigest(session.projection.ledgerId)}</code> · record-set <code>{shortDigest(session.projection.recordSetSha256)}</code> · sidecar <code>{shortDigest(session.projection.sidecarSha256)}</code> · 保留 {session.projection.counts.recordedNotWithheld} / 撤下 {session.projection.counts.withheld} · {session.projection.contentBytes} bytes。</p>
            <label>
              <input
                type="checkbox"
                checked={saveConfirmations.explicitSaveIntent}
                disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                onChange={(event) => setSaveConfirmations((current) => Object.freeze({
                  ...current,
                  explicitSaveIntent: event.target.checked
                }))}
              />
              我明确要求把当前 canonical 保存到本机审阅库。
            </label>
            <label>
              <input
                type="checkbox"
                checked={saveConfirmations.sensitiveReviewerAndDerivedChartContentAcknowledged}
                disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                onChange={(event) => setSaveConfirmations((current) => Object.freeze({
                  ...current,
                  sensitiveReviewerAndDerivedChartContentAcknowledged: event.target.checked
                }))}
              />
              我知道内容含未受信 reviewer 自由文本与派生命盘绑定，属于敏感数据。
            </label>
            <label>
              <input
                type="checkbox"
                checked={saveConfirmations.plaintextFullBackupInclusionAcknowledged}
                disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                onChange={(event) => setSaveConfirmations((current) => Object.freeze({
                  ...current,
                  plaintextFullBackupInclusionAcknowledged: event.target.checked
                }))}
              />
              我知道该未加密附件会进入本应用的明文完整备份范围，应自行治理备份隐私。
            </label>
            <label>
              <input
                type="checkbox"
                checked={saveConfirmations.unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged}
                disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                onChange={(event) => setSaveConfirmations((current) => Object.freeze({
                  ...current,
                  unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged: event.target.checked
                }))}
              />
              我知道它是 unlinked 附件，删除案例/修订不会级联删除它。
            </label>
            <label>
              <input
                type="checkbox"
                checked={saveConfirmations.priorAndExternalCopiesCannotBeRecalledAcknowledged}
                disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                onChange={(event) => setSaveConfirmations((current) => Object.freeze({
                  ...current,
                  priorAndExternalCopiesCannotBeRecalledAcknowledged: event.target.checked
                }))}
              />
              我知道本次保存或以后删除都不能召回旧下载、外部副本、其他 profile/device 或 OS 残留。
            </label>
            <button
              type="button"
              className="primary-action"
              disabled={Boolean(operation)
                || storeSnapshot.status !== "idle"
                || !allSaveConfirmationsChecked(saveConfirmations)}
              aria-busy={operation === "store_save"}
              onClick={() => void saveCanonicalToStore()}
            >
              {operation === "store_save" ? "正在保存并原字节回读" : "确认保存当前 canonical"}
            </button>
          </fieldset>

          <section className="bazi-lifecycle-file-workbench__verified-copies" aria-label="当前页面会话的本机来源副本">
            <h6>当前 canonical 的本机来源身份</h6>
            {session.sourceAttachments.length > 0 ? (
              <ol>
                {session.sourceAttachments.map((attachment) => {
                  const exactActionVerified = verifiedStoredCopies.some(
                    (item) => sameAttachmentIdentity(item.attachment, attachment)
                  );
                  return (
                    <li key={attachment.id}>
                      <span>附件 <code>{attachment.id}</code> · raw <code>{shortDigest(attachment.contentHash)}</code> · {attachment.byteLength} bytes</span>
                      {exactActionVerified ? (
                        <div className="bazi-lifecycle-file-workbench__actions">
                          <button
                            type="button"
                            className="secondary-action"
                            disabled={Boolean(operation) || storeLocked}
                            aria-busy={operation === "stored_export"}
                            onClick={() => void exportExactStoredBytes(attachment)}
                          >
                            导出此已验真副本的原字节
                          </button>
                          <button
                            type="button"
                            className="danger-action"
                            disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                            onClick={() => prepareDelete(attachment)}
                          >
                            准备删除此已验真本机副本
                          </button>
                        </div>
                      ) : (
                        <span>当前身份来自保存回执而非本次 stored reopen；必须刷新目录并重新验真，才能导出原字节或删除。</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p>当前 canonical 来自外部文件；没有本机审阅库 exact identity。</p>
            )}
          </section>

          {deleteTarget ? (
            <fieldset className="bazi-lifecycle-file-workbench__store-delete">
              <legend>CAS 删除一个已验真本机副本</legend>
              <p>冻结目标：<code>{deleteTarget.attachment.id}</code> · raw <code>{shortDigest(deleteTarget.attachment.contentHash)}</code> · source sidecar <code>{shortDigest(deleteTarget.sidecarSha256)}</code>。只请求删除当前 origin 中这一条 exact attachment record/数据库字节。</p>
              <label>
                <input
                  type="checkbox"
                  checked={deleteConfirmations.explicitDeleteIntent}
                  disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                  onChange={(event) => setDeleteConfirmations((current) => Object.freeze({
                    ...current,
                    explicitDeleteIntent: event.target.checked
                  }))}
                />
                我明确要求 CAS 删除这个精确本机附件副本。
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={deleteConfirmations.currentStoreSingleCopyOnlyAcknowledged}
                  disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                  onChange={(event) => setDeleteConfirmations((current) => Object.freeze({
                    ...current,
                    currentStoreSingleCopyOnlyAcknowledged: event.target.checked
                  }))}
                />
                我知道仅删除当前 store 的这一份，不删除同 ledger 的其他副本。
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={deleteConfirmations.physicalErasureNotAttestedAcknowledged}
                  disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                  onChange={(event) => setDeleteConfirmations((current) => Object.freeze({
                    ...current,
                    physicalErasureNotAttestedAcknowledged: event.target.checked
                  }))}
                />
                我知道 record/数据库字节 absent 不是底层介质物理擦除证明。
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={deleteConfirmations.priorAndExternalCopiesCannotBeRecalledAcknowledged}
                  disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                  onChange={(event) => setDeleteConfirmations((current) => Object.freeze({
                    ...current,
                    priorAndExternalCopiesCannotBeRecalledAcknowledged: event.target.checked
                  }))}
                />
                我知道不能召回旧下载、明文备份、其他 profile/device 或 OS 残留。
              </label>
              <label>
                <span>输入精确短语 <code>{DELETE_CONFIRMATION_PHRASE}</code></span>
                <input
                  type="text"
                  aria-label="删除确认短语"
                  value={deletePhrase}
                  disabled={Boolean(operation) || storeSnapshot.status !== "idle"}
                  onChange={(event) => setDeletePhrase(event.target.value)}
                />
              </label>
              <div className="bazi-lifecycle-file-workbench__actions">
                <button
                  type="button"
                  className="danger-action"
                  disabled={Boolean(operation)
                    || storeSnapshot.status !== "idle"
                    || !allDeleteConfirmationsChecked(deleteConfirmations)
                    || deletePhrase !== DELETE_CONFIRMATION_PHRASE}
                  aria-busy={operation === "store_delete"}
                  onClick={() => void deleteExactStoredCopy()}
                >
                  {operation === "store_delete" ? "正在 CAS 删除并重核目录" : "确认 CAS 删除此本机副本"}
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={Boolean(operation) || storeLocked}
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteConfirmations(EMPTY_DELETE_CONFIRMATIONS);
                    setDeletePhrase("");
                  }}
                >
                  取消删除准备
                </button>
              </div>
            </fieldset>
          ) : null}

          {recordedRecords.length > 0 ? (
            <fieldset className="bazi-lifecycle-file-workbench__withholding">
              <legend>可选：生成本机撤下后继</legend>
              <label>
                <span>目标记录</span>
                <select
                  value={targetRecordSha256}
                  disabled={Boolean(operation) || storeLocked}
                  onChange={(event) => setTargetRecordSha256(event.target.value)}
                >
                  {recordedRecords.map((record, index) => (
                    <option key={record.recordSha256} value={record.recordSha256}>
                      {`规范记录 ${session.projection.records.indexOf(record) + 1} · ${shortDigest(record.recordSha256)}`}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>有限理由码</span>
                <select
                  aria-label="本机撤下有限理由码"
                  value={reasonCode}
                  disabled={Boolean(operation) || storeLocked}
                  onChange={(event) => setReasonCode(event.target.value as WithholdingReason)}
                >
                  {LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS
                    .map((reason) => <option key={reason} value={reason}>{reasonLabels[reason]}</option>)}
                </select>
              </label>
              <button
                type="button"
                className="secondary-action"
                disabled={Boolean(operation) || storeLocked || !targetRecordSha256}
                aria-busy={operation === "withhold"}
                onClick={() => void withhold()}
              >
                {operation === "withhold" ? "正在生成确定性后继" : "生成本机撤下后继"}
              </button>
              <p>没有自由文本理由。本机用户未经核验；该动作不是 reviewer 撤回权威，也不删除旧文件或召回任何副本。</p>
            </fieldset>
          ) : null}

          <div className="bazi-lifecycle-file-workbench__actions">
            <button type="button" className="primary-action" disabled={Boolean(operation) || storeLocked} onClick={openDelivery}>
              打开本机保存或下载确认
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={Boolean(operation) || storeLocked}
              aria-busy={operation === "verify"}
              onClick={() => void verify()}
            >
              {operation === "verify" ? "正在重新选择并核对" : "重新选择文件核对 sidecar 摘要"}
            </button>
            <button type="button" className="secondary-action" disabled={storeLocked} onClick={reset}>清除整个页面会话</button>
          </div>
          {roundTrip ? (
            <p className="bazi-lifecycle-file-workbench__verified">
              回读摘要匹配：<code>{shortDigest(roundTrip.sidecarSha256)}</code>
            </p>
          ) : null}
        </div>
      )}

      {notice ? <p className="bazi-lifecycle-file-workbench__notice" role="status">{notice}</p> : null}
      {error ? <p className="bazi-lifecycle-file-workbench__error" role="alert">{error}</p> : null}

      <div className="bazi-lifecycle-file-workbench__boundary" role="note">
        <p>原始文本、canonical、exact bytes 与 Blob 只在该私有叶内可达，不回调给父组件；DOM 只显示有限状态、计数和安全摘要。外部文件选择/reconciliation 路径只读；专用本机审阅库仅在显式目录读取、五项确认保存或四项确认加精确短语的 CAS 删除时访问持久层，不使用 Web Storage，也不传输网络。打开交付确认或收到 download requested 不等于文件已持久化；本机撤下或本机副本删除不等于 reviewer 权威、物理擦除或旧下载/备份/其他 profile/device/OS 残留召回。全局 writing/核对状态跨叶卸载保留；mutation epoch 未复核且未绕过，工程结果不构成术数内容真值、专家审定、正式激活或公开发布授权。</p>
      </div>
    </section>
  );
}
