import {
  assertArray,
  assertExactKeys,
  assertObject,
  assertString,
  canonicalStringify,
  captureJson,
  domainDigest,
  fail,
  parseStrictJsonBytes,
  type JsonObject,
  type JsonValue
} from "./canonical.ts";
import {
  AUTHORITY_NONE,
  BINDING_IDS,
  EVIDENCE_CATEGORY_CODES,
  HISTORICAL_RECORD_TYPES,
  PILOT_RECORD_TYPES,
  PREDECESSOR_V2_RECORD_TYPES,
  PRIVACY_BOUNDARY,
  PURPOSE_RECORD_TYPES,
  PURPOSE_REPOSITORY_RECORD_TYPES,
  REQUIRED_EVIDENCE_BY_PURPOSE,
  RUNTIME_TRUST_BOUNDARY,
  REVIEW_PURPOSES,
  SELECTED_BINDING_SET_DIGEST_DOMAIN,
  SHARING_POLICY_CODES,
  type BindingCandidate,
  type BindingId,
  type EvidenceCategoryCode,
  type ReviewInputManifestRef,
  type ReviewInputManifestV3,
  type ReviewPurpose,
  type ReviewScope,
  type SelectedMaterialDeliveryBoundary,
  type SharingPolicyCode
} from "./protocol.ts";
import { reviewInputManifestRef, validateReviewInputManifestV3 } from "./input-manifest.ts";
import { readStablePrivateFile } from "./stable-file.ts";

const SHA256 = /^[a-f0-9]{64}$/u;
const MANIFEST_ID = /^bazi-review-input-manifest\/[a-f0-9]{64}$/u;
const FORMAL_CYCLE = /^bazi-formal-review-cycle\/[a-f0-9]{64}$/u;
const USABILITY_CYCLE = /^bazi-usability-cycle\/[a-f0-9]{64}$/u;
const USABILITY_SEAT = /^usability-seat\/[a-f0-9]{64}$/u;
const OPAQUE_REF = /^opaque-private-ref\/([a-z_]+)\/[a-f0-9]{64}$/u;
const PRIVATE_ENVELOPE_MAX_BYTES = 1024 * 1024;
const PROJECTION_DIGEST_DOMAIN = "hakimi/bazi/expert-formal-intake-successor/opaque-projection/v3";
const OBJECT_FREEZE = Object.freeze;
const VERIFIED_REPOSITORY_PROJECTIONS = new WeakSet<object>();
const WEAK_SET_ADD = Function.call.bind(WeakSet.prototype.add) as (
  set: WeakSet<object>, value: object
) => WeakSet<object>;
const WEAK_SET_HAS = Function.call.bind(WeakSet.prototype.has) as (
  set: WeakSet<object>, value: object
) => boolean;
const PRIVATE_PAYLOAD_ELIGIBILITY_BOUNDARY = OBJECT_FREEZE({
  encryptedPayloadBytesDecrypted: false,
  decryptedPayloadSchemaValidated: false,
  decryptedPayloadRecordTypeValidated: false,
  payloadSourceAuthenticated: false,
  opinionAuthenticityEstablished: false,
  firstSeenEstablished: false,
  custodyEstablished: false,
  envelopeRecordTypeDenyListInspectsEncryptedPayload: false,
  anyEvidenceEligibilityAllowed: false
} as const);

export type RepositoryProjection = Readonly<{
  schemaVersion: "3.0.0";
  recordType: string;
  projectionId: string;
  reviewCycleId: string;
  seatId: string;
  purpose: ReviewPurpose;
  inputManifestRef: ReviewInputManifestRef;
  reviewScope: ReviewScope;
  selectedBindingIds: readonly BindingId[];
  selectedBindingSetDigest: string;
  selectedMaterialDeliveryBoundaries: readonly SelectedMaterialDeliveryBoundary[];
  unselectedBindingConclusionCount: 0;
  outcomeCodes: readonly string[];
  receiptRefs: readonly Readonly<{
    evidenceCategoryCode: EvidenceCategoryCode;
    opaqueArtifactRef: string;
  }>[];
  privatePayloadEligibilityBoundary: typeof PRIVATE_PAYLOAD_ELIGIBILITY_BOUNDARY;
  authorityBoundary: typeof AUTHORITY_NONE;
  privacyBoundary: typeof PRIVACY_BOUNDARY;
}>;

export type CollectionPreflightReport = Readonly<{
  successorReportType: "bazi_expert_formal_intake_successor_preflight_report_v3";
  purpose: ReviewPurpose;
  seatId: string;
  reviewCycleId: string;
  inputManifestRef: ReviewInputManifestRef;
  reviewScope: ReviewScope;
  selectedBindingIds: readonly BindingId[];
  selectedBindingSetDigest: string;
  selectedMaterialDeliveryBoundaries: readonly SelectedMaterialDeliveryBoundary[];
  unselectedBindingConclusionCount: 0;
  mechanicalBindingVerified: true;
  mechanicalBindingScope: "private_envelopes_to_supplied_input_manifest_only";
  suppliedInputManifestCurrentWorkspaceVerifiedByThisCall: false;
  purposeInputPrerequisitesSatisfied: boolean;
  eligibleAsUsabilityCandidate: boolean;
  eligibleAsStageCBindingEvidenceCandidate: boolean;
  eligibleForFormal2of2EvaluationCandidate: boolean;
  formalTwoOfTwoCountDelta: 0;
  expertGateCountDelta: 0;
  humanAttestationRecorded: false;
  privateArtifactPayloadsInterpreted: false;
  privatePayloadEligibilityBoundary: typeof PRIVATE_PAYLOAD_ELIGIBILITY_BOUNDARY;
  blockers: readonly string[];
  repositoryProjection: RepositoryProjection;
  authorityBoundary: typeof AUTHORITY_NONE;
  privacyBoundary: typeof PRIVACY_BOUNDARY;
  runtimeTrustBoundary: typeof RUNTIME_TRUST_BOUNDARY;
  mutationBoundary: Readonly<{
    persistencePerformed: false;
    schema13MutationEpochAvailable: false;
    schema13MutationEpochReceipt: null;
    reviewCycleEpochIsSchema13MutationEpoch: false;
    crossFileAtomicSnapshot: false;
    intervalMutationExcluded: false;
    abaExcluded: false;
    replayExcluded: false;
  }>;
}>;

function enumValue<T extends string>(value: JsonValue, values: readonly T[], path: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) fail("COLLECTION_INPUT_INVALID", `${path} 无效。`);
  return value as T;
}

function assertLexicallyNonDegenerateOpaqueSuffix(value: string, path: string): void {
  const suffix = value.slice(-64);
  if (new Set(suffix).size < 8 || /^(?:([a-f0-9]{1,8}))\1+$/u.test(suffix)) {
    fail("OPAQUE_REF_INVALID", `${path} 的 64hex 后缀明显退化；本检查仍不证明生成熵。`);
  }
}

function validateCycleAndSeat(purpose: ReviewPurpose, reviewCycleId: string, seatId: string): void {
  if (purpose === "usability_only") {
    if (!USABILITY_CYCLE.test(reviewCycleId) || !USABILITY_SEAT.test(seatId)) {
      fail("PURPOSE_NAMESPACE_MISMATCH", "usability purpose 必须使用独立 usability cycle/seat namespace。");
    }
    assertLexicallyNonDegenerateOpaqueSuffix(reviewCycleId, "reviewCycleId");
    assertLexicallyNonDegenerateOpaqueSuffix(seatId, "seatId");
    return;
  }
  if (!FORMAL_CYCLE.test(reviewCycleId) || !["domain-expert-a", "domain-expert-b"].includes(seatId)) {
    fail("PURPOSE_NAMESPACE_MISMATCH", "formal purpose 必须使用 formal cycle 与 domain A/B seat。");
  }
  assertLexicallyNonDegenerateOpaqueSuffix(reviewCycleId, "reviewCycleId");
}

function validateManifestRef(value: JsonValue, expected: ReviewInputManifestRef, path: string): ReviewInputManifestRef {
  assertExactKeys(value, ["manifestId", "manifestDigest"], path);
  assertString(value.manifestId!, `${path}.manifestId`, 128);
  assertString(value.manifestDigest!, `${path}.manifestDigest`, 64);
  if (!MANIFEST_ID.test(value.manifestId as string)
    || !SHA256.test(value.manifestDigest as string)
    || canonicalStringify(value) !== canonicalStringify(expected)) {
    fail("INPUT_MANIFEST_REF_MISMATCH", `${path} 与当前 review input manifest 不一致。`);
  }
  return OBJECT_FREEZE({
    manifestId: value.manifestId as string,
    manifestDigest: value.manifestDigest as string
  });
}

type ReviewSelection = Readonly<{
  reviewScope: ReviewScope;
  selectedBindingIds: readonly BindingId[];
  selectedBindingRows: readonly BindingCandidate[];
  selectedBindingSetDigest: string;
  selectedMaterialDeliveryBoundaries: readonly SelectedMaterialDeliveryBoundary[];
}>;

function deliveryModeForPolicy(
  sharingPolicyCode: SharingPolicyCode
): SelectedMaterialDeliveryBoundary["deliveryModeCode"] {
  return sharingPolicyCode === "link_only"
    ? "locator_or_link_reference_delivery_candidate_only"
    : sharingPolicyCode === "private_review_only"
      ? "private_review_material_delivery_candidate_only"
      : sharingPolicyCode === "redistributable"
        ? "redistributable_material_delivery_candidate_only"
        : "not_authorized";
}

function materialDeliveryBoundary(candidate: BindingCandidate): SelectedMaterialDeliveryBoundary {
  return OBJECT_FREEZE({
    bindingId: candidate.bindingId as BindingId,
    sharingPolicyCode: candidate.sharingPolicyCode,
    deliveryModeCode: deliveryModeForPolicy(candidate.sharingPolicyCode),
    expertActuallyViewedMaterialVerified: false,
    sourceBodyCopyingExcluded: false
  });
}

function parseReviewScope(
  value: JsonValue,
  purpose: ReviewPurpose,
  manifest: ReviewInputManifestV3,
  path: string
): ReviewSelection {
  assertObject(value, path);
  let reviewScope: ReviewScope;
  let selectedBindingIds: readonly BindingId[];
  if (purpose === "usability_only") {
    assertExactKeys(value, ["mode"], path);
    if (value.mode !== "usability_only") {
      fail("REVIEW_SCOPE_INVALID", "usability 必须使用空 binding scope。");
    }
    reviewScope = OBJECT_FREEZE({ mode: "usability_only" });
    selectedBindingIds = OBJECT_FREEZE([] as BindingId[]);
  } else if (purpose === "binding_freeze_evidence") {
    assertExactKeys(value, ["mode", "bindingId"], path);
    if (value.mode !== "single_binding" || typeof value.bindingId !== "string"
      || !BINDING_IDS.includes(value.bindingId as BindingId)) {
      fail("REVIEW_SCOPE_INVALID", "binding freeze evidence 必须精确选择一个当前 binding。");
    }
    reviewScope = OBJECT_FREEZE({ mode: "single_binding", bindingId: value.bindingId as BindingId });
    selectedBindingIds = OBJECT_FREEZE([value.bindingId as BindingId]);
  } else {
    assertExactKeys(value, ["mode"], path);
    if (value.mode !== "full_frozen_set") {
      fail("REVIEW_SCOPE_INVALID", "post-freeze reaffirmation 必须使用完整 frozen set scope。");
    }
    reviewScope = OBJECT_FREEZE({ mode: "full_frozen_set" });
    selectedBindingIds = OBJECT_FREEZE([...BINDING_IDS]);
  }
  const selectedBindingRows = OBJECT_FREEZE(selectedBindingIds.map((bindingId) => {
    const candidate = manifest.bindingCandidates.find((entry) => entry.bindingId === bindingId);
    if (candidate === undefined) fail("REVIEW_SCOPE_INVALID", "所选 binding 不在当前 manifest。 ");
    return candidate;
  }));
  const inputManifestRef = reviewInputManifestRef(manifest);
  const selectedBindingSetDigest = domainDigest(SELECTED_BINDING_SET_DIGEST_DOMAIN, {
    inputManifestRef,
    selectedBindingRows
  });
  return OBJECT_FREEZE({
    reviewScope,
    selectedBindingIds,
    selectedBindingRows,
    selectedBindingSetDigest,
    selectedMaterialDeliveryBoundaries: OBJECT_FREEZE(selectedBindingRows.map(materialDeliveryBoundary))
  });
}

function validateSelectionFields(
  value: JsonObject,
  expected: ReviewSelection,
  path: string
): void {
  assertArray(value.selectedBindingIds!, `${path}.selectedBindingIds`);
  if (canonicalStringify(value.reviewScope) !== canonicalStringify(expected.reviewScope)
    || canonicalStringify(value.selectedBindingIds) !== canonicalStringify(expected.selectedBindingIds)
    || value.selectedBindingSetDigest !== expected.selectedBindingSetDigest) {
    fail("BINDING_SELECTION_MISMATCH", `${path} 的 review scope 或 selected binding identity 失配。`);
  }
}

function validateOpaqueRef(value: JsonValue, category: EvidenceCategoryCode, path: string): string {
  assertString(value, path, 160);
  const match = OPAQUE_REF.exec(value);
  if (!match || match[1] !== category) fail("OPAQUE_REF_INVALID", `${path} 必须是分类匹配的高熵 opaque ref。`);
  assertLexicallyNonDegenerateOpaqueSuffix(value, path);
  return value;
}

function validateExternalEnvelope(
  value: JsonValue,
  expected: Readonly<{
    purpose: ReviewPurpose;
    reviewCycleId: string;
    seatId: string;
    inputManifestRef: ReviewInputManifestRef;
    selection: ReviewSelection;
    category: EvidenceCategoryCode;
  }>
): Readonly<{ evidenceCategoryCode: EvidenceCategoryCode; opaqueArtifactRef: string }> {
  assertObject(value, "private envelope");
  if (typeof value.recordType === "string"
    && (HISTORICAL_RECORD_TYPES.includes(value.recordType as never)
      || PILOT_RECORD_TYPES.includes(value.recordType as never)
      || PREDECESSOR_V2_RECORD_TYPES.includes(value.recordType as never))) {
    fail("PREDECESSOR_RECORD_TYPE_FORBIDDEN", "historical/pilot/v2 predecessor record type 不得进入 v3 successor formal intake。");
  }
  assertExactKeys(value, [
    "schemaVersion", "recordType", "purpose", "reviewCycleId", "seatId", "inputManifestRef",
    "reviewScope", "selectedBindingIds", "selectedBindingSetDigest",
    "evidenceCategoryCode", "opaqueArtifactRef", "payloadEncoding", "encryptedPayloadBase64", "boundary"
  ], "private envelope");
  if (value.schemaVersion !== "3.0.0" || value.recordType !== PURPOSE_RECORD_TYPES[expected.purpose]
    || value.purpose !== expected.purpose || value.reviewCycleId !== expected.reviewCycleId
    || value.seatId !== expected.seatId || value.evidenceCategoryCode !== expected.category) {
    fail("PRIVATE_ENVELOPE_BINDING_MISMATCH", "private envelope 的 purpose/type/cycle/seat/category 失配。");
  }
  validateManifestRef(value.inputManifestRef!, expected.inputManifestRef, "private envelope.inputManifestRef");
  validateSelectionFields(value, expected.selection, "private envelope");
  const opaqueArtifactRef = validateOpaqueRef(
    value.opaqueArtifactRef!,
    expected.category,
    "private envelope.opaqueArtifactRef"
  );
  if (value.payloadEncoding !== "externally_encrypted_bytes_base64") {
    fail("PRIVATE_ENVELOPE_INVALID", "private envelope payload encoding 无效。");
  }
  assertString(value.encryptedPayloadBase64!, "private envelope.encryptedPayloadBase64", 700_000);
  const decoded = Buffer.from(value.encryptedPayloadBase64, "base64");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value.encryptedPayloadBase64)
    || decoded.byteLength < 32 || decoded.toString("base64") !== value.encryptedPayloadBase64) {
    fail("PRIVATE_ENVELOPE_INVALID", "private envelope ciphertext 必须是有界规范 base64。");
  }
  const expectedBoundary = {
    repositoryStorageAllowed: false,
    payloadEncryptedExternallyDeclared: true,
    encryptionVerifiedByThisEngine: false,
    humanTruthInterpretedByThisEngine: false,
    digestMaySubstituteForIdentityConsentOrIndependence: false
  } as const;
  if (canonicalStringify(value.boundary) !== canonicalStringify(expectedBoundary)) {
    fail("PRIVATE_ENVELOPE_INVALID", "private envelope boundary 失配。");
  }
  return OBJECT_FREEZE({ evidenceCategoryCode: expected.category, opaqueArtifactRef });
}

function purposePrerequisites(manifest: ReviewInputManifestV3, purpose: ReviewPurpose, selection: ReviewSelection) {
  const shareable = selection.selectedBindingRows.every(
    (candidate) => candidate.sharingPolicyCode !== "not_authorized"
  );
  const candidateSetComplete = selection.selectedBindingRows.every(
    (candidate) => candidate.candidateStatusCode !== "blocked"
  );
  if (purpose === "usability_only") {
    return OBJECT_FREEZE({
      satisfied: true,
      usability: true,
      stageC: false,
      formal: false,
      blockers: OBJECT_FREEZE([] as string[])
    });
  }
  if (purpose === "binding_freeze_evidence") {
    const blockers: string[] = [];
    if (!candidateSetComplete) blockers.push("review_input_contains_blocked_binding_candidate");
    if (!shareable) blockers.push("review_material_sharing_not_authorized");
    return OBJECT_FREEZE({
      satisfied: shareable && candidateSetComplete,
      usability: false,
      stageC: shareable && candidateSetComplete,
      formal: false,
      blockers: OBJECT_FREEZE(blockers)
    });
  }
  const closed = manifest.closure.bindingFrozenVerified === 12
    && manifest.closure.finalFrozenInputExactMatch
    && manifest.closure.finalFrozenBindingSetDigest === manifest.closure.candidateBindingSetDigest
    && canonicalStringify(selection.selectedBindingIds) === canonicalStringify(BINDING_IDS);
  const blockers: string[] = [];
  if (!closed) blockers.push("final_binding_input_not_exactly_frozen_12_of_12");
  if (!shareable) blockers.push("review_material_sharing_not_authorized");
  return OBJECT_FREEZE({
    satisfied: closed && shareable,
    usability: false,
    stageC: false,
    formal: closed && shareable,
    blockers: OBJECT_FREEZE(blockers)
  });
}

export async function preflightPrivateCollectionCandidate(input: unknown): Promise<CollectionPreflightReport> {
  const request = captureJson(input, "collection request");
  assertExactKeys(request, [
    "workspaceRoot", "privateRoot", "purpose", "reviewCycleId", "seatId", "materialClassCode",
    "inputManifest", "reviewScope", "selectedBindingIds", "selectedBindingSetDigest", "evidenceFiles"
  ], "collection request");
  assertString(request.workspaceRoot!, "collection request.workspaceRoot", 1000);
  assertString(request.privateRoot!, "collection request.privateRoot", 1000);
  const purpose = enumValue(request.purpose!, REVIEW_PURPOSES, "collection request.purpose");
  assertString(request.reviewCycleId!, "collection request.reviewCycleId", 128);
  assertString(request.seatId!, "collection request.seatId", 128);
  const reviewCycleId = request.reviewCycleId as string;
  const seatId = request.seatId as string;
  validateCycleAndSeat(purpose, reviewCycleId, seatId);
  const expectedMaterialClass = purpose === "usability_only"
    ? "synthetic_question_usability_only"
    : "formal_domain_review_material";
  if (request.materialClassCode !== expectedMaterialClass) {
    fail("PURPOSE_NAMESPACE_MISMATCH", "material class 与 purpose 不匹配。");
  }
  const manifest = validateReviewInputManifestV3(request.inputManifest);
  const manifestRef = reviewInputManifestRef(manifest);
  const selection = parseReviewScope(request.reviewScope!, purpose, manifest, "collection request.reviewScope");
  validateSelectionFields(request, selection, "collection request");
  assertArray(request.evidenceFiles!, "collection request.evidenceFiles");
  const required = REQUIRED_EVIDENCE_BY_PURPOSE[purpose];
  if (request.evidenceFiles.length !== required.length) {
    fail("EVIDENCE_SET_INVALID", "evidence file 数量与 purpose 不匹配。");
  }
  const receiptRefs: { evidenceCategoryCode: EvidenceCategoryCode; opaqueArtifactRef: string }[] = [];
  const opaqueRefs = new Set<string>();
  for (let index = 0; index < required.length; index += 1) {
    const descriptor = request.evidenceFiles[index]!;
    assertExactKeys(descriptor, ["evidenceCategoryCode", "relativeFileName"], `collection request.evidenceFiles.${index}`);
    if (descriptor.evidenceCategoryCode !== required[index]) {
      fail("EVIDENCE_SET_INVALID", "evidence categories 必须按 purpose 固定集合和顺序出现。");
    }
    assertString(descriptor.relativeFileName!, `collection request.evidenceFiles.${index}.relativeFileName`, 200);
    const read = await readStablePrivateFile({
      workspaceRoot: request.workspaceRoot as string,
      privateRoot: request.privateRoot as string,
      relativeFileName: descriptor.relativeFileName as string,
      maxBytes: PRIVATE_ENVELOPE_MAX_BYTES,
      label: `private evidence ${required[index]}`
    });
    const envelope = parseStrictJsonBytes(read.bytes, `private evidence ${required[index]}`, PRIVATE_ENVELOPE_MAX_BYTES);
    const receiptRef = validateExternalEnvelope(envelope, {
      purpose,
      reviewCycleId,
      seatId,
      inputManifestRef: manifestRef,
      selection,
      category: required[index]!
    });
    if (opaqueRefs.has(receiptRef.opaqueArtifactRef)) {
      fail("OPAQUE_REF_REUSED", "同一 collection candidate 不得复用 opaque artifact ref。");
    }
    opaqueRefs.add(receiptRef.opaqueArtifactRef);
    receiptRefs.push(receiptRef);
  }
  const structuralPrerequisites = purposePrerequisites(manifest, purpose, selection);
  const outcomeCodes = [
    "mechanical_cross_binding_verified",
    structuralPrerequisites.satisfied
      ? "purpose_structural_prerequisites_observed_no_evidence_eligibility"
      : "purpose_prerequisites_blocked",
    "private_payload_uninterpreted_no_evidence_eligibility",
    "human_attestation_absent",
    "no_gate_count_delta"
  ];
  const projectionSeed = {
    reviewCycleId,
    seatId,
    purpose,
    inputManifestRef: manifestRef,
    reviewScope: selection.reviewScope,
    selectedBindingIds: selection.selectedBindingIds,
    selectedBindingSetDigest: selection.selectedBindingSetDigest,
    selectedMaterialDeliveryBoundaries: selection.selectedMaterialDeliveryBoundaries,
    unselectedBindingConclusionCount: 0 as const,
    outcomeCodes,
    receiptRefs,
    privatePayloadEligibilityBoundary: PRIVATE_PAYLOAD_ELIGIBILITY_BOUNDARY
  };
  const repositoryProjection: RepositoryProjection = OBJECT_FREEZE({
    schemaVersion: "3.0.0",
    recordType: PURPOSE_REPOSITORY_RECORD_TYPES[purpose],
    projectionId: `opaque-intake-projection/${domainDigest(PROJECTION_DIGEST_DOMAIN, projectionSeed)}`,
    ...projectionSeed,
    outcomeCodes: OBJECT_FREEZE(outcomeCodes),
    receiptRefs: OBJECT_FREEZE(receiptRefs),
    authorityBoundary: AUTHORITY_NONE,
    privacyBoundary: PRIVACY_BOUNDARY
  });
  WEAK_SET_ADD(VERIFIED_REPOSITORY_PROJECTIONS, repositoryProjection);
  const blockers = OBJECT_FREEZE([
    ...structuralPrerequisites.blockers,
    "trusted_decryption_and_payload_schema_gate_absent",
    "private_payload_source_authenticity_first_seen_custody_absent",
    "owner_authorization_not_human_verified",
    "human_attestation_not_recorded",
    "identity_consent_independence_not_established_by_opaque_refs",
    "authenticity_first_seen_custody_not_established"
  ]);
  return OBJECT_FREEZE({
    successorReportType: "bazi_expert_formal_intake_successor_preflight_report_v3",
    purpose,
    seatId,
    reviewCycleId,
    inputManifestRef: manifestRef,
    reviewScope: selection.reviewScope,
    selectedBindingIds: selection.selectedBindingIds,
    selectedBindingSetDigest: selection.selectedBindingSetDigest,
    selectedMaterialDeliveryBoundaries: selection.selectedMaterialDeliveryBoundaries,
    unselectedBindingConclusionCount: 0,
    mechanicalBindingVerified: true,
    mechanicalBindingScope: "private_envelopes_to_supplied_input_manifest_only",
    suppliedInputManifestCurrentWorkspaceVerifiedByThisCall: false,
    purposeInputPrerequisitesSatisfied: structuralPrerequisites.satisfied,
    eligibleAsUsabilityCandidate: false,
    eligibleAsStageCBindingEvidenceCandidate: false,
    eligibleForFormal2of2EvaluationCandidate: false,
    formalTwoOfTwoCountDelta: 0,
    expertGateCountDelta: 0,
    humanAttestationRecorded: false,
    privateArtifactPayloadsInterpreted: false,
    privatePayloadEligibilityBoundary: PRIVATE_PAYLOAD_ELIGIBILITY_BOUNDARY,
    blockers,
    repositoryProjection,
    authorityBoundary: AUTHORITY_NONE,
    privacyBoundary: PRIVACY_BOUNDARY,
    runtimeTrustBoundary: RUNTIME_TRUST_BOUNDARY,
    mutationBoundary: OBJECT_FREEZE({
      persistencePerformed: false,
      schema13MutationEpochAvailable: false,
      schema13MutationEpochReceipt: null,
      reviewCycleEpochIsSchema13MutationEpoch: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      replayExcluded: false
    })
  });
}

function validateProjectedSelection(
  value: JsonObject,
  purpose: "binding_freeze_evidence" | "post_freeze_reaffirmation",
  label: string
): Readonly<{
  reviewScope: ReviewScope;
  selectedBindingIds: readonly BindingId[];
  selectedBindingSetDigest: string;
  selectedMaterialDeliveryBoundaries: readonly SelectedMaterialDeliveryBoundary[];
}> {
  assertObject(value.reviewScope!, `${label}.reviewScope`);
  let reviewScope: ReviewScope;
  let expectedSelectedBindingIds: readonly BindingId[];
  if (purpose === "binding_freeze_evidence") {
    assertExactKeys(value.reviewScope, ["mode", "bindingId"], `${label}.reviewScope`);
    if (value.reviewScope.mode !== "single_binding"
      || typeof value.reviewScope.bindingId !== "string"
      || !BINDING_IDS.includes(value.reviewScope.bindingId as BindingId)) {
      fail("PAIR_PROJECTION_INVALID", "Stage C projection 必须是 single-binding scope。");
    }
    reviewScope = OBJECT_FREEZE({
      mode: "single_binding",
      bindingId: value.reviewScope.bindingId as BindingId
    });
    expectedSelectedBindingIds = OBJECT_FREEZE([value.reviewScope.bindingId as BindingId]);
  } else {
    assertExactKeys(value.reviewScope, ["mode"], `${label}.reviewScope`);
    if (value.reviewScope.mode !== "full_frozen_set") {
      fail("PAIR_PROJECTION_INVALID", "post-freeze projection 必须是完整 frozen set scope。");
    }
    reviewScope = OBJECT_FREEZE({ mode: "full_frozen_set" });
    expectedSelectedBindingIds = OBJECT_FREEZE([...BINDING_IDS]);
  }
  assertArray(value.selectedBindingIds!, `${label}.selectedBindingIds`);
  if (canonicalStringify(value.selectedBindingIds) !== canonicalStringify(expectedSelectedBindingIds)) {
    fail("PAIR_PROJECTION_INVALID", "projection selected binding scope 失配。");
  }
  assertString(value.selectedBindingSetDigest!, `${label}.selectedBindingSetDigest`, 64);
  if (!SHA256.test(value.selectedBindingSetDigest as string)) {
    fail("PAIR_PROJECTION_INVALID", "projection selected binding set digest 无效。");
  }
  assertArray(value.selectedMaterialDeliveryBoundaries!, `${label}.selectedMaterialDeliveryBoundaries`);
  if (value.selectedMaterialDeliveryBoundaries.length !== expectedSelectedBindingIds.length) {
    fail("PAIR_PROJECTION_INVALID", "projection material delivery boundary 数量无效。");
  }
  const selectedMaterialDeliveryBoundaries: SelectedMaterialDeliveryBoundary[] = [];
  for (let index = 0; index < expectedSelectedBindingIds.length; index += 1) {
    const boundary = value.selectedMaterialDeliveryBoundaries[index]!;
    assertExactKeys(boundary, [
      "bindingId", "sharingPolicyCode", "deliveryModeCode",
      "expertActuallyViewedMaterialVerified", "sourceBodyCopyingExcluded"
    ], `${label}.selectedMaterialDeliveryBoundaries.${index}`);
    if (boundary.bindingId !== expectedSelectedBindingIds[index]
      || typeof boundary.sharingPolicyCode !== "string"
      || !SHARING_POLICY_CODES.includes(boundary.sharingPolicyCode as SharingPolicyCode)
      || boundary.deliveryModeCode !== deliveryModeForPolicy(boundary.sharingPolicyCode as SharingPolicyCode)
      || boundary.expertActuallyViewedMaterialVerified !== false
      || boundary.sourceBodyCopyingExcluded !== false) {
      fail("PAIR_PROJECTION_INVALID", "projection material delivery boundary 失配。");
    }
    selectedMaterialDeliveryBoundaries.push(OBJECT_FREEZE({
      bindingId: boundary.bindingId as BindingId,
      sharingPolicyCode: boundary.sharingPolicyCode as SharingPolicyCode,
      deliveryModeCode: boundary.deliveryModeCode as SelectedMaterialDeliveryBoundary["deliveryModeCode"],
      expertActuallyViewedMaterialVerified: false,
      sourceBodyCopyingExcluded: false
    }));
  }
  if (value.unselectedBindingConclusionCount !== 0) {
    fail("PAIR_PROJECTION_INVALID", "未选 binding 不得产生结论或 admission effect。");
  }
  return OBJECT_FREEZE({
    reviewScope,
    selectedBindingIds: expectedSelectedBindingIds,
    selectedBindingSetDigest: value.selectedBindingSetDigest as string,
    selectedMaterialDeliveryBoundaries: OBJECT_FREEZE(selectedMaterialDeliveryBoundaries)
  });
}

export function preflightFormalSeatPair(
  leftInput: unknown,
  rightInput: unknown
): Readonly<{
  pairMechanicallyCrossLinked: true;
  seatSpecificReceiptRefsDisjointMechanicallyVerified: true;
  endToEndSeatIsolationEstablished: false;
  purpose: "binding_freeze_evidence" | "post_freeze_reaffirmation";
  reviewCycleId: string;
  inputManifestRef: ReviewInputManifestRef;
  reviewScope: ReviewScope;
  selectedBindingIds: readonly BindingId[];
  selectedBindingSetDigest: string;
  unselectedBindingConclusionCount: 0;
  sharedReceiptCategories: readonly EvidenceCategoryCode[];
  humanIndependenceEstablished: false;
  privatePayloadEvidenceEligibilityEstablished: false;
  countsTowardFormal2of2: false;
  authorityBoundary: typeof AUTHORITY_NONE;
}> {
  if ((leftInput === null || typeof leftInput !== "object")
    || (rightInput === null || typeof rightInput !== "object")
    || !WEAK_SET_HAS(VERIFIED_REPOSITORY_PROJECTIONS, leftInput)
    || !WEAK_SET_HAS(VERIFIED_REPOSITORY_PROJECTIONS, rightInput)) {
    fail("PAIR_PROJECTION_BRAND_REQUIRED", "formal pair 只接受本模块 private preflight 产生的 capability。");
  }
  const left = captureJson(leftInput, "left projection");
  const right = captureJson(rightInput, "right projection");
  const parseProjection = (value: JsonValue, label: string): RepositoryProjection => {
    assertExactKeys(value, [
      "schemaVersion", "recordType", "projectionId", "reviewCycleId", "seatId", "purpose",
      "inputManifestRef", "reviewScope", "selectedBindingIds", "selectedBindingSetDigest",
      "selectedMaterialDeliveryBoundaries", "unselectedBindingConclusionCount", "outcomeCodes",
      "receiptRefs", "privatePayloadEligibilityBoundary", "authorityBoundary", "privacyBoundary"
    ], label);
    const purpose = enumValue(value.purpose!, REVIEW_PURPOSES, `${label}.purpose`);
    if (value.schemaVersion !== "3.0.0" || purpose === "usability_only"
      || value.recordType !== PURPOSE_REPOSITORY_RECORD_TYPES[purpose]) {
      fail("PAIR_PURPOSE_INVALID", "formal pair 不接受 usability 或 record type 转换。");
    }
    assertString(value.reviewCycleId!, `${label}.reviewCycleId`, 128);
    assertString(value.seatId!, `${label}.seatId`, 128);
    validateCycleAndSeat(purpose, value.reviewCycleId, value.seatId);
    if (canonicalStringify(value.authorityBoundary) !== canonicalStringify(AUTHORITY_NONE)
      || canonicalStringify(value.privacyBoundary) !== canonicalStringify(PRIVACY_BOUNDARY)
      || canonicalStringify(value.privatePayloadEligibilityBoundary)
        !== canonicalStringify(PRIVATE_PAYLOAD_ELIGIBILITY_BOUNDARY)) {
      fail("PAIR_PROJECTION_INVALID", "projection boundary 失配。");
    }
    assertArray(value.receiptRefs!, `${label}.receiptRefs`);
    assertArray(value.outcomeCodes!, `${label}.outcomeCodes`);
    assertString(value.projectionId!, `${label}.projectionId`, 128);
    const expectedCategories = REQUIRED_EVIDENCE_BY_PURPOSE[purpose];
    if (value.receiptRefs.length !== expectedCategories.length) {
      fail("PAIR_PROJECTION_INVALID", "projection receipt refs 数量无效。");
    }
    const normalizedRefs: { evidenceCategoryCode: EvidenceCategoryCode; opaqueArtifactRef: string }[] = [];
    for (let index = 0; index < expectedCategories.length; index += 1) {
      const ref = value.receiptRefs[index]!;
      assertExactKeys(ref, ["evidenceCategoryCode", "opaqueArtifactRef"], `${label}.receiptRefs.${index}`);
      if (ref.evidenceCategoryCode !== expectedCategories[index]) {
        fail("PAIR_PROJECTION_INVALID", "projection receipt refs 顺序或分类无效。");
      }
      normalizedRefs.push({
        evidenceCategoryCode: expectedCategories[index]!,
        opaqueArtifactRef: validateOpaqueRef(
          ref.opaqueArtifactRef!, expectedCategories[index]!, `${label}.receiptRefs.${index}.opaqueArtifactRef`
        )
      });
    }
    const expectedOutcomes = new Set([
      "mechanical_cross_binding_verified",
      "purpose_structural_prerequisites_observed_no_evidence_eligibility",
      "purpose_prerequisites_blocked",
      "private_payload_uninterpreted_no_evidence_eligibility",
      "human_attestation_absent",
      "no_gate_count_delta"
    ]);
    const normalizedOutcomes: string[] = [];
    for (const outcome of value.outcomeCodes) {
      if (typeof outcome !== "string" || !expectedOutcomes.has(outcome)) {
        fail("PAIR_PROJECTION_INVALID", "projection outcome code 无效。");
      }
      normalizedOutcomes.push(outcome);
    }
    if (normalizedOutcomes.length !== 5
      || normalizedOutcomes[0] !== "mechanical_cross_binding_verified"
      || !["purpose_structural_prerequisites_observed_no_evidence_eligibility", "purpose_prerequisites_blocked"]
        .includes(normalizedOutcomes[1]!)
      || normalizedOutcomes[2] !== "private_payload_uninterpreted_no_evidence_eligibility"
      || normalizedOutcomes[3] !== "human_attestation_absent"
      || normalizedOutcomes[4] !== "no_gate_count_delta") {
      fail("PAIR_PROJECTION_INVALID", "projection outcome code 组合无效。");
    }
    assertExactKeys(value.inputManifestRef!, ["manifestId", "manifestDigest"], `${label}.inputManifestRef`);
    assertString(value.inputManifestRef.manifestId!, `${label}.inputManifestRef.manifestId`, 128);
    assertString(value.inputManifestRef.manifestDigest!, `${label}.inputManifestRef.manifestDigest`, 64);
    if (!MANIFEST_ID.test(value.inputManifestRef.manifestId as string)
      || !SHA256.test(value.inputManifestRef.manifestDigest as string)) {
      fail("PAIR_PROJECTION_INVALID", "projection manifest digest 无效。");
    }
    const selection = validateProjectedSelection(
      value,
      purpose as "binding_freeze_evidence" | "post_freeze_reaffirmation",
      label
    );
    const projection = value as unknown as RepositoryProjection;
    const projectionSeed = {
      reviewCycleId: projection.reviewCycleId,
      seatId: projection.seatId,
      purpose: projection.purpose,
      inputManifestRef: projection.inputManifestRef,
      reviewScope: selection.reviewScope,
      selectedBindingIds: selection.selectedBindingIds,
      selectedBindingSetDigest: selection.selectedBindingSetDigest,
      selectedMaterialDeliveryBoundaries: selection.selectedMaterialDeliveryBoundaries,
      unselectedBindingConclusionCount: 0,
      outcomeCodes: normalizedOutcomes,
      receiptRefs: normalizedRefs,
      privatePayloadEligibilityBoundary: PRIVATE_PAYLOAD_ELIGIBILITY_BOUNDARY
    };
    if (projection.projectionId !== `opaque-intake-projection/${domainDigest(PROJECTION_DIGEST_DOMAIN, projectionSeed)}`) {
      fail("PAIR_PROJECTION_INVALID", "projectionId 与最小投影内容失配。");
    }
    return projection;
  };
  const leftProjection = parseProjection(left, "left projection");
  const rightProjection = parseProjection(right, "right projection");
  if (leftProjection.purpose !== rightProjection.purpose
    || leftProjection.reviewCycleId !== rightProjection.reviewCycleId
    || canonicalStringify(leftProjection.inputManifestRef) !== canonicalStringify(rightProjection.inputManifestRef)
    || canonicalStringify(leftProjection.reviewScope) !== canonicalStringify(rightProjection.reviewScope)
    || canonicalStringify(leftProjection.selectedBindingIds) !== canonicalStringify(rightProjection.selectedBindingIds)
    || leftProjection.selectedBindingSetDigest !== rightProjection.selectedBindingSetDigest
    || canonicalStringify([leftProjection.seatId, rightProjection.seatId].sort())
      !== canonicalStringify(["domain-expert-a", "domain-expert-b"])) {
    fail("PAIR_BINDING_MISMATCH", "formal pair 必须是同 purpose/cycle/manifest 的 A/B 两席。");
  }
  const allowedShared = new Set<EvidenceCategoryCode>([
    "owner_authorization", "verifier_authority", "pairwise_independence"
  ]);
  const leftRefs = new Map(leftProjection.receiptRefs.map((entry) => [entry.evidenceCategoryCode, entry.opaqueArtifactRef]));
  const shared: EvidenceCategoryCode[] = [];
  for (const entry of rightProjection.receiptRefs) {
    const leftRef = leftRefs.get(entry.evidenceCategoryCode);
    if (leftRef === entry.opaqueArtifactRef) {
      if (!allowedShared.has(entry.evidenceCategoryCode)) {
        fail("PAIR_PRIVATE_REF_REUSE", "两席不得复用 seat-specific private receipt ref。");
      }
      shared.push(entry.evidenceCategoryCode);
    }
  }
  for (const requiredSharedCategory of ["owner_authorization", "pairwise_independence"] as const) {
    const leftRef = leftRefs.get(requiredSharedCategory);
    const rightRef = rightProjection.receiptRefs.find(
      (entry) => entry.evidenceCategoryCode === requiredSharedCategory
    )?.opaqueArtifactRef;
    if (leftRef === undefined || rightRef === undefined || leftRef !== rightRef) {
      fail("PAIR_SHARED_REF_MISMATCH", "A/B 必须绑定同一 owner authorization 与 pairwise independence ref。");
    }
  }
  return OBJECT_FREEZE({
    pairMechanicallyCrossLinked: true,
    seatSpecificReceiptRefsDisjointMechanicallyVerified: true,
    endToEndSeatIsolationEstablished: false,
    purpose: leftProjection.purpose as "binding_freeze_evidence" | "post_freeze_reaffirmation",
    reviewCycleId: leftProjection.reviewCycleId,
    inputManifestRef: leftProjection.inputManifestRef,
    reviewScope: leftProjection.reviewScope,
    selectedBindingIds: leftProjection.selectedBindingIds,
    selectedBindingSetDigest: leftProjection.selectedBindingSetDigest,
    unselectedBindingConclusionCount: 0,
    sharedReceiptCategories: OBJECT_FREEZE(shared),
    humanIndependenceEstablished: false,
    privatePayloadEvidenceEligibilityEstablished: false,
    countsTowardFormal2of2: false,
    authorityBoundary: AUTHORITY_NONE
  });
}

export function isForbiddenPredecessorRecordType(recordType: string): boolean {
  return HISTORICAL_RECORD_TYPES.includes(recordType as never)
    || PILOT_RECORD_TYPES.includes(recordType as never)
    || PREDECESSOR_V2_RECORD_TYPES.includes(recordType as never);
}

export function requireVerifiedRepositoryProjectionCapability(input: unknown): RepositoryProjection {
  if (input === null || typeof input !== "object"
    || !WEAK_SET_HAS(VERIFIED_REPOSITORY_PROJECTIONS, input)) {
    fail(
      "LIFECYCLE_PRIOR_PROJECTION_BRAND_REQUIRED",
      "lifecycle 只接受本模块 private preflight 产生的 prior projection capability。"
    );
  }
  return input as RepositoryProjection;
}

export const PRIVATE_ENVELOPE_EVIDENCE_CATEGORIES = EVIDENCE_CATEGORY_CODES;
