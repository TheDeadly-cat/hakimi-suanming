import {
  assertArray,
  assertExactKeys,
  assertObject,
  assertString,
  canonicalStringify,
  captureJson,
  domainDigest,
  fail,
  type JsonValue
} from "./canonical.ts";
import { reviewInputManifestRef, validateReviewInputManifestV3 } from "./input-manifest.ts";
import { requireVerifiedRepositoryProjectionCapability } from "./preflight.ts";
import {
  AUTHORITY_NONE,
  BINDING_IDS,
  LIFECYCLE_EVENT_TYPES,
  PREDECESSOR_V2_RECORD_TYPES,
  RELEASE_GOVERNANCE,
  SELECTED_BINDING_SET_DIGEST_DOMAIN,
  type BindingId,
  type LifecycleEventKind,
  type ReviewInputManifestRef,
  type ReviewInputManifestV3,
  type ReviewScope
} from "./protocol.ts";

const EVENT_ID = /^bazi-formal-lifecycle-event\/[a-f0-9]{64}$/u;
const FORMAL_CYCLE = /^bazi-formal-review-cycle\/[a-f0-9]{64}$/u;
const PRIVATE_REF = /^opaque-private-ref\/[a-z_]+\/[a-f0-9]{64}$/u;
const EVENT_REF = /^opaque-lifecycle-ref\/(correction|withdrawal|credential_revocation)\/[a-f0-9]{64}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

function lexicallyNonDegenerate(value: string): boolean {
  const suffix = value.slice(-64);
  return new Set(suffix).size >= 8 && !/^(?:([a-f0-9]{1,8}))\1+$/u.test(suffix);
}

function validateLifecycleSelection(
  event: JsonValue,
  purpose: "binding_freeze_evidence" | "post_freeze_reaffirmation",
  manifest: ReviewInputManifestV3,
  expectedManifestRef: ReviewInputManifestRef
): Readonly<{
  reviewScope: ReviewScope;
  selectedBindingIds: readonly BindingId[];
  selectedBindingSetDigest: string;
}> {
  assertObject(event, "lifecycle event");
  assertObject(event.reviewScope!, "lifecycle event.reviewScope");
  let reviewScope: ReviewScope;
  let selectedBindingIds: readonly BindingId[];
  if (purpose === "binding_freeze_evidence") {
    assertExactKeys(event.reviewScope, ["mode", "bindingId"], "lifecycle event.reviewScope");
    if (event.reviewScope.mode !== "single_binding"
      || typeof event.reviewScope.bindingId !== "string"
      || !BINDING_IDS.includes(event.reviewScope.bindingId as BindingId)) {
      fail("LIFECYCLE_SELECTION_INVALID", "Stage C lifecycle 必须绑定一个当前 binding。");
    }
    reviewScope = Object.freeze({
      mode: "single_binding",
      bindingId: event.reviewScope.bindingId as BindingId
    });
    selectedBindingIds = Object.freeze([event.reviewScope.bindingId as BindingId]);
  } else {
    assertExactKeys(event.reviewScope, ["mode"], "lifecycle event.reviewScope");
    if (event.reviewScope.mode !== "full_frozen_set") {
      fail("LIFECYCLE_SELECTION_INVALID", "post-freeze lifecycle 必须绑定完整 frozen set。");
    }
    reviewScope = Object.freeze({ mode: "full_frozen_set" });
    selectedBindingIds = Object.freeze([...BINDING_IDS]);
  }
  assertArray(event.selectedBindingIds!, "lifecycle event.selectedBindingIds");
  assertString(event.selectedBindingSetDigest!, "lifecycle event.selectedBindingSetDigest", 64);
  const selectedBindingRows = selectedBindingIds.map((bindingId) => {
    const candidate = manifest.bindingCandidates.find((entry) => entry.bindingId === bindingId);
    if (candidate === undefined) fail("LIFECYCLE_SELECTION_INVALID", "lifecycle selected binding 不在 manifest。");
    return candidate;
  });
  const expectedDigest = domainDigest(SELECTED_BINDING_SET_DIGEST_DOMAIN, {
    inputManifestRef: expectedManifestRef,
    selectedBindingRows
  });
  if (canonicalStringify(event.selectedBindingIds) !== canonicalStringify(selectedBindingIds)
    || !SHA256.test(event.selectedBindingSetDigest as string)
    || event.selectedBindingSetDigest !== expectedDigest) {
    fail("LIFECYCLE_SELECTION_INVALID", "lifecycle selected binding identity 失配。");
  }
  return Object.freeze({ reviewScope, selectedBindingIds, selectedBindingSetDigest: expectedDigest });
}

export function preflightLifecycleEventCandidate(input: unknown, priorProjectionInput: unknown): Readonly<{
  eventKind: LifecycleEventKind;
  eventId: string;
  reviewCycleId: string;
  seatId: "domain-expert-a" | "domain-expert-b";
  purpose: "binding_freeze_evidence" | "post_freeze_reaffirmation";
  inputManifestRef: ReviewInputManifestRef;
  reviewScope: ReviewScope;
  selectedBindingIds: readonly BindingId[];
  selectedBindingSetDigest: string;
  structurallyValidCandidate: true;
  acceptedReceipt: false;
  candidateOnly: true;
  appendOnlyRequired: true;
  priorRecordOverwriteAllowed: false;
  affectedSeatAndGateMustReclose: true;
  gateRecloseObserved: false;
  stateMutationPerformed: false;
  schema13MutationEpochAvailable: false;
  reviewCycleEpochIsSchema13MutationEpoch: false;
  humanAttestationRecorded: false;
  countsTowardFormal2of2: false;
  authorityBoundary: typeof AUTHORITY_NONE;
}> {
  const priorProjection = requireVerifiedRepositoryProjectionCapability(priorProjectionInput);
  const request = captureJson(input, "lifecycle request");
  assertExactKeys(request, ["inputManifest", "event"], "lifecycle request");
  const manifest = validateReviewInputManifestV3(request.inputManifest);
  const expectedManifestRef = reviewInputManifestRef(manifest);
  const event = request.event!;
  assertExactKeys(event, [
    "schemaVersion", "recordType", "eventKind", "eventId", "reviewCycleId", "seatId", "purpose",
    "inputManifestRef", "reviewScope", "selectedBindingIds", "selectedBindingSetDigest",
    "priorPrivateReceiptRef", "eventPrivateReceiptRef", "reasonCode",
    "releaseGovernance", "authorityBoundary"
  ], "lifecycle event");
  if (typeof event.recordType === "string" && PREDECESSOR_V2_RECORD_TYPES.includes(event.recordType as never)) {
    fail("PREDECESSOR_RECORD_TYPE_FORBIDDEN", "v2 lifecycle record 不得进入 v3 successor。");
  }
  if (event.schemaVersion !== "3.0.0") fail("LIFECYCLE_EVENT_INVALID", "lifecycle schemaVersion 无效。");
  const kinds = Object.keys(LIFECYCLE_EVENT_TYPES) as LifecycleEventKind[];
  if (typeof event.eventKind !== "string" || !kinds.includes(event.eventKind as LifecycleEventKind)) {
    fail("LIFECYCLE_EVENT_INVALID", "lifecycle eventKind 无效。");
  }
  const eventKind = event.eventKind as LifecycleEventKind;
  if (event.recordType !== LIFECYCLE_EVENT_TYPES[eventKind]) {
    fail("LIFECYCLE_EVENT_INVALID", "lifecycle recordType 不得跨 event kind 转换。");
  }
  assertString(event.eventId!, "lifecycle event.eventId", 128);
  assertString(event.reviewCycleId!, "lifecycle event.reviewCycleId", 128);
  assertString(event.seatId!, "lifecycle event.seatId", 64);
  if (!EVENT_ID.test(event.eventId as string) || !FORMAL_CYCLE.test(event.reviewCycleId as string)
    || !["domain-expert-a", "domain-expert-b"].includes(event.seatId as string)
    || !lexicallyNonDegenerate(event.eventId as string)
    || !lexicallyNonDegenerate(event.reviewCycleId as string)) {
    fail("LIFECYCLE_EVENT_INVALID", "lifecycle event ID/cycle/seat namespace 无效。");
  }
  if (!["binding_freeze_evidence", "post_freeze_reaffirmation"].includes(event.purpose as string)) {
    fail("LIFECYCLE_EVENT_INVALID", "usability 不得转换成 formal lifecycle event。");
  }
  const purpose = event.purpose as "binding_freeze_evidence" | "post_freeze_reaffirmation";
  if (canonicalStringify(event.inputManifestRef) !== canonicalStringify(expectedManifestRef)) {
    fail("LIFECYCLE_EVENT_INVALID", "lifecycle input manifest ref 失配。");
  }
  const selection = validateLifecycleSelection(event, purpose, manifest, expectedManifestRef);
  if (priorProjection.purpose !== purpose
    || priorProjection.reviewCycleId !== event.reviewCycleId
    || priorProjection.seatId !== event.seatId
    || canonicalStringify(priorProjection.inputManifestRef) !== canonicalStringify(expectedManifestRef)
    || canonicalStringify(priorProjection.reviewScope) !== canonicalStringify(selection.reviewScope)
    || canonicalStringify(priorProjection.selectedBindingIds) !== canonicalStringify(selection.selectedBindingIds)
    || priorProjection.selectedBindingSetDigest !== selection.selectedBindingSetDigest) {
    fail("LIFECYCLE_PRIOR_BINDING_MISMATCH", "lifecycle event 与 prior projection 的 purpose/cycle/seat/selection 失配。");
  }
  assertString(event.priorPrivateReceiptRef!, "lifecycle event.priorPrivateReceiptRef", 160);
  assertString(event.eventPrivateReceiptRef!, "lifecycle event.eventPrivateReceiptRef", 180);
  if (!PRIVATE_REF.test(event.priorPrivateReceiptRef as string)
    || !EVENT_REF.test(event.eventPrivateReceiptRef as string)
    || !(event.eventPrivateReceiptRef as string).startsWith(`opaque-lifecycle-ref/${eventKind}/`)
    || !lexicallyNonDegenerate(event.priorPrivateReceiptRef as string)
    || !lexicallyNonDegenerate(event.eventPrivateReceiptRef as string)) {
    fail("LIFECYCLE_EVENT_INVALID", "lifecycle private receipt refs 无效。");
  }
  if (!priorProjection.receiptRefs.some(
    (entry) => entry.opaqueArtifactRef === event.priorPrivateReceiptRef
  )) {
    fail("LIFECYCLE_PRIOR_BINDING_MISMATCH", "lifecycle prior receipt 不属于所绑定 prior projection。");
  }
  const allowedReasons: Readonly<Record<LifecycleEventKind, readonly string[]>> = {
    correction: ["reviewer_correction_requested", "artifact_drift_requires_restatement"],
    withdrawal: ["reviewer_withdrawal_recorded", "consent_withdrawal_recorded"],
    credential_revocation: ["credential_expired", "credential_revoked", "credential_status_unresolved"]
  };
  if (typeof event.reasonCode !== "string" || !allowedReasons[eventKind].includes(event.reasonCode)) {
    fail("LIFECYCLE_EVENT_INVALID", "lifecycle reasonCode 无效。");
  }
  if (canonicalStringify(event.releaseGovernance) !== canonicalStringify(RELEASE_GOVERNANCE)
    || canonicalStringify(event.authorityBoundary) !== canonicalStringify(AUTHORITY_NONE)) {
    fail("LIFECYCLE_EVENT_INVALID", "lifecycle 固定红门被改写。");
  }
  return Object.freeze({
    eventKind,
    eventId: event.eventId as string,
    reviewCycleId: event.reviewCycleId as string,
    seatId: event.seatId as "domain-expert-a" | "domain-expert-b",
    purpose,
    inputManifestRef: expectedManifestRef,
    reviewScope: selection.reviewScope,
    selectedBindingIds: selection.selectedBindingIds,
    selectedBindingSetDigest: selection.selectedBindingSetDigest,
    structurallyValidCandidate: true,
    acceptedReceipt: false,
    candidateOnly: true,
    appendOnlyRequired: true,
    priorRecordOverwriteAllowed: false,
    affectedSeatAndGateMustReclose: true,
    gateRecloseObserved: false,
    stateMutationPerformed: false,
    schema13MutationEpochAvailable: false,
    reviewCycleEpochIsSchema13MutationEpoch: false,
    humanAttestationRecorded: false,
    countsTowardFormal2of2: false,
    authorityBoundary: AUTHORITY_NONE
  });
}
