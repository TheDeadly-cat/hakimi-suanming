import { createHash } from "node:crypto";
import { link, mkdir, mkdtemp, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  AUTHORITY_NONE,
  BINDING_IDS,
  HISTORICAL_RECORD_TYPES,
  LIFECYCLE_EVENT_TYPES,
  PILOT_RECORD_TYPES,
  PREDECESSOR_V2_RECORD_TYPES,
  PRIVACY_BOUNDARY,
  PURPOSE_RECORD_TYPES,
  RELEASE_GOVERNANCE,
  REQUIRED_EVIDENCE_BY_PURPOSE,
  SELECTED_BINDING_SET_DIGEST_DOMAIN,
  buildCurrentReviewInputManifestV3,
  domainDigest,
  parseStrictJsonBytes,
  preflightFormalSeatPair,
  preflightLifecycleEventCandidate,
  preflightPrivateCollectionCandidate,
  isForbiddenPredecessorRecordType,
  reviewInputManifestRef,
  sealReviewInputManifestV3Candidate,
  validateReviewInputManifestV3,
  type BindingId,
  type EvidenceCategoryCode,
  type ReviewInputManifestV3,
  type ReviewPurpose
} from "./index.ts";

const EXACT_REHEARSAL_RECORD_TYPES = [
  "bazi_expert_single_binding_nocode_rehearsal_draft_v1",
  "bazi_expert_single_binding_nocode_rehearsal_readback_candidate_v1",
  "bazi_expert_single_binding_nocode_rehearsal_submission_candidate_v1"
] as const;

const EXACT_INTEGRATED_SINGLE_BINDING_PILOT_RECORD_TYPES = [
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_binding_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_draft_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_readback_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_submission_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_handoff_artifacts_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_file_seal_receipt_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_complete_return_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_complete_return_preflight_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_pair_comparison_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_physical_pair_precommit_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_physical_seat_package_manifest_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_physical_pair_manifest_v1",
  "bazi_expert_single_binding_physical_clean_profile_preflight_candidate_v1",
  "bazi_expert_single_binding_physical_clean_profile_run_candidate_v1",
  "bazi_expert_single_binding_physical_clean_profile_stop_observation_candidate_v1"
] as const;

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(sourceDirectory, "../../..");
const temporaryRoots: string[] = [];
const BINDING_DIGEST_DOMAIN = "hakimi/bazi/current-review-input-manifest/v3/binding";
const BINDING_SET_DIGEST_DOMAIN = "hakimi/bazi/current-review-input-manifest/v3/binding-set";

let currentManifest: ReviewInputManifestV3;

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectCode(code: string) {
  return expect.objectContaining({ name: "FormalIntakeSuccessorError", code });
}

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "hakimi-bazi-formal-successor-"));
  temporaryRoots.push(root);
  return root;
}

function candidateDigest(candidate: Record<string, unknown>): string {
  const { candidateDigest: _ignored, ...unsigned } = candidate;
  return domainDigest(BINDING_DIGEST_DOMAIN, unsigned);
}

function resealManifest(
  source: ReviewInputManifestV3,
  mode: "shareable_pre_freeze" | "fully_frozen"
): ReviewInputManifestV3 {
  const candidate = clone(source) as unknown as Record<string, any>;
  delete candidate.manifestId;
  delete candidate.integrity;
  for (const binding of candidate.bindingCandidates as Record<string, any>[]) {
    binding.sharingPolicyCode = "private_review_only";
    if (mode === "shareable_pre_freeze") {
      binding.candidateStatusCode = "pre_freeze_candidate";
      binding.formalBindingDigest = null;
    } else {
      binding.candidateStatusCode = "frozen";
      binding.formalBindingDigest = sha(`formal:${binding.bindingId}`);
    }
    binding.candidateDigest = candidateDigest(binding);
  }
  const setDigest = domainDigest(BINDING_SET_DIGEST_DOMAIN, candidate.bindingCandidates);
  candidate.closure = {
    bindingRequired: 12,
    bindingFrozenVerified: mode === "fully_frozen" ? 12 : 0,
    candidateBindingSetDigest: setDigest,
    finalFrozenBindingSetDigest: mode === "fully_frozen" ? setDigest : null,
    finalFrozenInputExactMatch: mode === "fully_frozen",
    allReviewMaterialsMarkedShareableBySuppliedPolicy: true
  };
  return sealReviewInputManifestV3Candidate(candidate);
}

function cycleFor(purpose: ReviewPurpose, salt = ""): string {
  return purpose === "usability_only"
    ? `bazi-usability-cycle/${sha(`usability-cycle:${salt}`)}`
    : `bazi-formal-review-cycle/${sha(`formal-cycle:${salt}`)}`;
}

function seatFor(purpose: ReviewPurpose, seat: "a" | "b" = "a"): string {
  return purpose === "usability_only"
    ? `usability-seat/${sha(`usability-seat-${seat}`)}`
    : `domain-expert-${seat}`;
}

function selectionFor(
  purpose: ReviewPurpose,
  manifest: ReviewInputManifestV3,
  bindingId: BindingId = BINDING_IDS[0]
) {
  const reviewScope = purpose === "usability_only"
    ? { mode: "usability_only" as const }
    : purpose === "binding_freeze_evidence"
      ? { mode: "single_binding" as const, bindingId }
      : { mode: "full_frozen_set" as const };
  const selectedBindingIds: readonly BindingId[] = purpose === "usability_only"
    ? []
    : purpose === "binding_freeze_evidence"
      ? [bindingId]
      : BINDING_IDS;
  const selectedBindingRows = selectedBindingIds.map((id) =>
    manifest.bindingCandidates.find((entry) => entry.bindingId === id)!
  );
  return {
    reviewScope,
    selectedBindingIds,
    selectedBindingSetDigest: domainDigest(SELECTED_BINDING_SET_DIGEST_DOMAIN, {
      inputManifestRef: reviewInputManifestRef(manifest),
      selectedBindingRows
    })
  };
}

function envelope(
  purpose: ReviewPurpose,
  seatId: string,
  reviewCycleId: string,
  manifest: ReviewInputManifestV3,
  selection: ReturnType<typeof selectionFor>,
  category: EvidenceCategoryCode,
  salt = ""
) {
  const sharedAcrossFormalSeats = purpose !== "usability_only"
    && (category === "owner_authorization" || category === "pairwise_independence");
  const refSeat = sharedAcrossFormalSeats ? "formal-pair" : seatId;
  return {
    schemaVersion: "3.0.0",
    recordType: PURPOSE_RECORD_TYPES[purpose],
    purpose,
    reviewCycleId,
    seatId,
    inputManifestRef: clone(reviewInputManifestRef(manifest)),
    reviewScope: clone(selection.reviewScope),
    selectedBindingIds: clone(selection.selectedBindingIds),
    selectedBindingSetDigest: selection.selectedBindingSetDigest,
    evidenceCategoryCode: category,
    opaqueArtifactRef: `opaque-private-ref/${category}/${sha(`${purpose}:${refSeat}:${category}:${salt}`)}`,
    payloadEncoding: "externally_encrypted_bytes_base64",
    encryptedPayloadBase64: Buffer.alloc(48, category.length).toString("base64"),
    boundary: {
      repositoryStorageAllowed: false,
      payloadEncryptedExternallyDeclared: true,
      encryptionVerifiedByThisEngine: false,
      humanTruthInterpretedByThisEngine: false,
      digestMaySubstituteForIdentityConsentOrIndependence: false
    }
  };
}

async function collectionRequest(
  purpose: ReviewPurpose,
  manifest: ReviewInputManifestV3,
  seat: "a" | "b" = "a",
  mutateEnvelope?: (value: Record<string, any>, category: EvidenceCategoryCode) => void,
  selectedBindingId: BindingId = BINDING_IDS[0],
  cycleSalt = ""
) {
  const privateRoot = await temporaryRoot();
  const reviewCycleId = cycleFor(purpose, cycleSalt);
  const seatId = seatFor(purpose, seat);
  const selection = selectionFor(purpose, manifest, selectedBindingId);
  const evidenceFiles = [];
  for (const [index, category] of REQUIRED_EVIDENCE_BY_PURPOSE[purpose].entries()) {
    const value = envelope(purpose, seatId, reviewCycleId, manifest, selection, category, `${index}`);
    mutateEnvelope?.(value, category);
    const relativeFileName = `evidence-${index}.json`;
    await writeFile(path.join(privateRoot, relativeFileName), `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "wx" });
    evidenceFiles.push({ evidenceCategoryCode: category, relativeFileName });
  }
  return {
    workspaceRoot,
    privateRoot,
    purpose,
    reviewCycleId,
    seatId,
    materialClassCode: purpose === "usability_only"
      ? "synthetic_question_usability_only"
      : "formal_domain_review_material",
    inputManifest: manifest,
    reviewScope: clone(selection.reviewScope),
    selectedBindingIds: clone(selection.selectedBindingIds),
    selectedBindingSetDigest: selection.selectedBindingSetDigest,
    evidenceFiles
  };
}

beforeAll(async () => {
  currentManifest = await buildCurrentReviewInputManifestV3(workspaceRoot);
});

afterEach(async () => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop()!;
    if (!path.resolve(root).startsWith(path.resolve(tmpdir()))) throw new Error("unsafe temporary cleanup target");
    await rm(root, { recursive: true, force: true });
  }
});

describe("current review input manifest v2", () => {
  it("binds current machine identity, readiness, 12 candidates and four questions", () => {
    expect(currentManifest.recordType).toBe("bazi_current_review_input_manifest_v3");
    expect(currentManifest.machineIdentityRef.successorId).toBe(
      "hakimi.bazi.current-machine-identity-successor/1.1.0"
    );
    expect(currentManifest.readinessRef.ledgerId).toBe(
      "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0"
    );
    expect(currentManifest.bindingCandidates.map((entry) => entry.bindingId)).toEqual(BINDING_IDS);
    expect(currentManifest.questionSet.questions).toHaveLength(4);
    expect(currentManifest.closure.bindingFrozenVerified).toBe(0);
    expect(currentManifest.machineIdentityRef.rawSha256).toBe(
      "787c5cd5994923805ca37b096be5ae36a94cf5f809c6892ce854e9b193ddff7b"
    );
    expect(currentManifest.readinessRef.rawSha256).toBe(
      "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797"
    );
  });

  it("observes current sharing and blocked-candidate red gates without using packet 1.5 as authority", () => {
    expect(currentManifest.closure.allReviewMaterialsMarkedShareableBySuppliedPolicy).toBe(false);
    expect(currentManifest.bindingCandidates.some((entry) => entry.candidateStatusCode === "blocked")).toBe(true);
    expect(currentManifest.bindingCandidates.filter((entry) => entry.sharingPolicyCode === "not_authorized")).toHaveLength(7);
    expect(currentManifest.bindingCandidates.filter((entry) => entry.sharingPolicyCode === "link_only")).toHaveLength(5);
    expect(currentManifest.boundaries.historicalPacketIsAuthority).toBe(false);
    expect(JSON.stringify(currentManifest)).not.toContain("expert-review-packet/1.5.0");
  });

  it("emits no filesystem paths in the persisted manifest projection", () => {
    const serialized = JSON.stringify(currentManifest);
    expect(serialized).not.toContain("packages/");
    expect(serialized).not.toContain("content/");
    expect(serialized).not.toContain("C:\\");
  });

  it("round-trips only an exact manifest", () => {
    expect(validateReviewInputManifestV3(clone(currentManifest))).toEqual(currentManifest);
  });

  it("rejects the predecessor v2 manifest identity instead of silently changing its meaning", () => {
    const predecessor = clone(currentManifest) as any;
    predecessor.schemaVersion = "2.0.0";
    predecessor.recordType = "bazi_current_review_input_manifest_v2";
    expect(() => validateReviewInputManifestV3(predecessor)).toThrow(expectCode("MANIFEST_INVALID"));
  });

  it("rejects digest drift", () => {
    const tampered = clone(currentManifest) as any;
    tampered.bindingCandidates[0].candidateDigest = "0".repeat(64);
    expect(() => validateReviewInputManifestV3(tampered)).toThrow(expectCode("MANIFEST_INVALID"));
  });

  it("rejects question text drift even if outer integrity remains stale", () => {
    const tampered = clone(currentManifest) as any;
    tampered.questionSet.questions[0].title = "changed";
    expect(() => validateReviewInputManifestV3(tampered)).toThrow(expectCode("MANIFEST_INVALID"));
  });

  it("rejects binding reorder", () => {
    const tampered = clone(currentManifest) as any;
    [tampered.bindingCandidates[0], tampered.bindingCandidates[1]] = [
      tampered.bindingCandidates[1], tampered.bindingCandidates[0]
    ];
    expect(() => validateReviewInputManifestV3(tampered)).toThrow(expectCode("MANIFEST_INVALID"));
  });

  it("rejects a false final-freeze claim at 0/12", () => {
    const tampered = clone(currentManifest) as any;
    tampered.closure.finalFrozenInputExactMatch = true;
    tampered.closure.finalFrozenBindingSetDigest = tampered.closure.candidateBindingSetDigest;
    expect(() => validateReviewInputManifestV3(tampered)).toThrow(expectCode("MANIFEST_INVALID"));
  });

  it("accepts an explicitly synthetic 12/12 exact frozen mechanical fixture without granting authority", () => {
    const frozen = resealManifest(currentManifest, "fully_frozen");
    expect(frozen.closure.bindingFrozenVerified).toBe(12);
    expect(frozen.closure.finalFrozenInputExactMatch).toBe(true);
    expect(frozen.boundaries.expertTruthEstablished).toBe(false);
  });
});

describe("three non-convertible collection purposes", () => {
  it("observes usability structure before C closure but keeps payload eligibility closed", async () => {
    const result = await preflightPrivateCollectionCandidate(
      await collectionRequest("usability_only", currentManifest)
    );
    expect(result.mechanicalBindingVerified).toBe(true);
    expect(result.purposeInputPrerequisitesSatisfied).toBe(true);
    expect(result.eligibleAsUsabilityCandidate).toBe(false);
    expect(result.eligibleAsStageCBindingEvidenceCandidate).toBe(false);
    expect(result.eligibleForFormal2of2EvaluationCandidate).toBe(false);
    expect(result.reviewScope).toEqual({ mode: "usability_only" });
    expect(result.selectedBindingIds).toEqual([]);
    expect(result.unselectedBindingConclusionCount).toBe(0);
    expect(result.formalTwoOfTwoCountDelta).toBe(0);
    expect(result.humanAttestationRecorded).toBe(false);
    expect(result.privatePayloadEligibilityBoundary.anyEvidenceEligibilityAllowed).toBe(false);
  });

  it("checks only the selected Stage C row and blocks a selected not-authorized binding", async () => {
    const result = await preflightPrivateCollectionCandidate(
      await collectionRequest("binding_freeze_evidence", currentManifest)
    );
    expect(result.eligibleAsStageCBindingEvidenceCandidate).toBe(false);
    expect(result.blockers).toContain("review_material_sharing_not_authorized");
    expect(result.blockers).not.toContain("review_input_contains_blocked_binding_candidate");
    expect(result.selectedBindingIds).toEqual([BINDING_IDS[0]]);
    expect(result.blockers).not.toContain("final_binding_input_not_exactly_frozen_12_of_12");
  });

  it("observes one selected link-only locator structure without treating opaque bytes as Stage C evidence", async () => {
    const result = await preflightPrivateCollectionCandidate(
      await collectionRequest("binding_freeze_evidence", currentManifest, "a", undefined, BINDING_IDS[7])
    );
    expect(result.purposeInputPrerequisitesSatisfied).toBe(true);
    expect(result.eligibleAsStageCBindingEvidenceCandidate).toBe(false);
    expect(result.eligibleForFormal2of2EvaluationCandidate).toBe(false);
    expect(result.selectedMaterialDeliveryBoundaries).toEqual([expect.objectContaining({
      bindingId: BINDING_IDS[7],
      deliveryModeCode: "locator_or_link_reference_delivery_candidate_only",
      expertActuallyViewedMaterialVerified: false,
      sourceBodyCopyingExcluded: false
    })]);
    expect(result.unselectedBindingConclusionCount).toBe(0);
    expect(result.formalTwoOfTwoCountDelta).toBe(0);
    expect(result.blockers).toContain("trusted_decryption_and_payload_schema_gate_absent");
  });

  it("blocks a selected blocked binding but ignores blocked rows that were not selected", async () => {
    const blocked = await preflightPrivateCollectionCandidate(
      await collectionRequest("binding_freeze_evidence", currentManifest, "a", undefined, BINDING_IDS[11])
    );
    expect(blocked.eligibleAsStageCBindingEvidenceCandidate).toBe(false);
    expect(blocked.blockers).toContain("review_input_contains_blocked_binding_candidate");
    const unblocked = await preflightPrivateCollectionCandidate(
      await collectionRequest("binding_freeze_evidence", currentManifest, "a", undefined, BINDING_IDS[7])
    );
    expect(unblocked.purposeInputPrerequisitesSatisfied).toBe(true);
    expect(unblocked.eligibleAsStageCBindingEvidenceCandidate).toBe(false);
  });

  it("opens seven selected bindings as seven independent single-binding cycles, never one batch", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const reports = await Promise.all(BINDING_IDS.slice(0, 7).map(async (bindingId, index) =>
      preflightPrivateCollectionCandidate(
        await collectionRequest("binding_freeze_evidence", preFreeze, "a", undefined, bindingId, `single-${index}`)
      )
    ));
    expect(new Set(reports.map((report) => report.reviewCycleId)).size).toBe(7);
    expect(reports.every((report) => report.purposeInputPrerequisitesSatisfied)).toBe(true);
    expect(reports.every((report) => !report.eligibleAsStageCBindingEvidenceCandidate)).toBe(true);
    expect(reports.map((report) => report.selectedBindingIds)).toEqual(
      BINDING_IDS.slice(0, 7).map((bindingId) => [bindingId])
    );
    expect(reports.every((report) => report.unselectedBindingConclusionCount === 0)).toBe(true);
  });

  it.each([
    ["empty", []],
    ["multi", [BINDING_IDS[0], BINDING_IDS[1]]],
    ["reordered", [BINDING_IDS[1], BINDING_IDS[0]]],
    ["duplicate", [BINDING_IDS[0], BINDING_IDS[0]]]
  ])("rejects %s selectedBindingIds for a single-binding Stage C request", async (_label, selectedBindingIds) => {
    const request = await collectionRequest("binding_freeze_evidence", resealManifest(currentManifest, "shareable_pre_freeze"));
    request.selectedBindingIds = selectedBindingIds;
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(
      expectCode("BINDING_SELECTION_MISMATCH")
    );
  });

  it("blocks post-freeze reaffirmation at 0/12", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const result = await preflightPrivateCollectionCandidate(
      await collectionRequest("post_freeze_reaffirmation", preFreeze)
    );
    expect(result.eligibleForFormal2of2EvaluationCandidate).toBe(false);
    expect(result.blockers).toContain("final_binding_input_not_exactly_frozen_12_of_12");
  });

  it("rejects a post-freeze subset even when its manifest is fully frozen", async () => {
    const frozen = resealManifest(currentManifest, "fully_frozen");
    const request = await collectionRequest("post_freeze_reaffirmation", frozen);
    request.selectedBindingIds = [BINDING_IDS[0]];
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(
      expectCode("BINDING_SELECTION_MISMATCH")
    );
  });

  it("observes exact 12/12 structural prerequisites while opaque payload eligibility stays false", async () => {
    const frozen = resealManifest(currentManifest, "fully_frozen");
    const result = await preflightPrivateCollectionCandidate(
      await collectionRequest("post_freeze_reaffirmation", frozen)
    );
    expect(result.purposeInputPrerequisitesSatisfied).toBe(true);
    expect(result.eligibleForFormal2of2EvaluationCandidate).toBe(false);
    expect(result.reviewScope).toEqual({ mode: "full_frozen_set" });
    expect(result.selectedBindingIds).toEqual(BINDING_IDS);
    expect(result.humanAttestationRecorded).toBe(false);
    expect(result.authorityBoundary.identityEstablished).toBe(false);
    expect(result.authorityBoundary.participationConsentEstablished).toBe(false);
    expect(result.authorityBoundary.pairwiseIndependenceEstablished).toBe(false);
    expect(result.formalTwoOfTwoCountDelta).toBe(0);
    expect(result.privatePayloadEligibilityBoundary.decryptedPayloadSchemaValidated).toBe(false);
  });

  it("rejects usability purpose in a formal seat namespace", async () => {
    const request = await collectionRequest("usability_only", currentManifest);
    request.seatId = "domain-expert-a";
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("PURPOSE_NAMESPACE_MISMATCH"));
  });

  it("rejects a formal purpose in a usability cycle namespace", async () => {
    const request = await collectionRequest("binding_freeze_evidence", currentManifest);
    request.reviewCycleId = `bazi-usability-cycle/${sha("wrong")}`;
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("PURPOSE_NAMESPACE_MISMATCH"));
  });

  it("rejects purpose/record-type conversion", async () => {
    const request = await collectionRequest("binding_freeze_evidence", currentManifest, "a", (value, category) => {
      if (category === "owner_authorization") value.recordType = PURPOSE_RECORD_TYPES.usability_only;
    });
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("PRIVATE_ENVELOPE_BINDING_MISMATCH"));
  });

  it("rejects obviously degenerate 64hex opaque refs without claiming entropy verification", async () => {
    const request = await collectionRequest("usability_only", currentManifest, "a", (value, category) => {
      if (category === "owner_authorization") {
        value.opaqueArtifactRef = `opaque-private-ref/owner_authorization/${"0".repeat(64)}`;
      }
    });
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("OPAQUE_REF_INVALID"));
    expect(PRIVACY_BOUNDARY.opaqueIdentifierEntropyVerified).toBe(false);
  });

  it.each([...HISTORICAL_RECORD_TYPES, ...PILOT_RECORD_TYPES, ...PREDECESSOR_V2_RECORD_TYPES])(
    "rejects predecessor record type %s",
    async (recordType) => {
    const request = await collectionRequest("binding_freeze_evidence", currentManifest, "a", (value, category) => {
      if (category === "owner_authorization") value.recordType = recordType;
    });
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(
      expectCode("PREDECESSOR_RECORD_TYPE_FORBIDDEN")
    );
    }
  );

  it("keeps the three rehearsal literals independently pinned in the formal deny gate", () => {
    expect(EXACT_REHEARSAL_RECORD_TYPES).toEqual([
      "bazi_expert_single_binding_nocode_rehearsal_draft_v1",
      "bazi_expert_single_binding_nocode_rehearsal_readback_candidate_v1",
      "bazi_expert_single_binding_nocode_rehearsal_submission_candidate_v1"
    ]);
    for (const recordType of EXACT_REHEARSAL_RECORD_TYPES) {
      expect(PILOT_RECORD_TYPES).toContain(recordType);
      expect(isForbiddenPredecessorRecordType(recordType)).toBe(true);
    }
  });

  it("keeps every integrated single-binding pilot literal independently pinned in the formal deny gate", () => {
    expect(EXACT_INTEGRATED_SINGLE_BINDING_PILOT_RECORD_TYPES).toHaveLength(15);
    for (const recordType of EXACT_INTEGRATED_SINGLE_BINDING_PILOT_RECORD_TYPES) {
      expect(PILOT_RECORD_TYPES).toContain(recordType);
      expect(isForbiddenPredecessorRecordType(recordType)).toBe(true);
    }
  });

  it("keeps the synthetic CDP runtime observation independently pinned outside formal intake", () => {
    for (const recordType of [
      "bazi_review_ui_synthetic_pair_cdp_precleanup_probe_candidate_v1",
      "bazi_review_ui_synthetic_pair_cdp_runtime_observation_candidate_v1"
    ]) {
      expect(PILOT_RECORD_TYPES).toContain(recordType);
      expect(isForbiddenPredecessorRecordType(recordType)).toBe(true);
    }
  });

  it.each([
    "bazi_review_ui_synthetic_pair_cdp_precleanup_probe_candidate_v1",
    "bazi_review_ui_synthetic_pair_cdp_runtime_observation_candidate_v1"
  ])("keeps synthetic CDP type %s hidden in opaque base64 ineligible for evidence", async (recordType) => {
    const smuggledRuntimePayload = Buffer.from(JSON.stringify({
      schemaVersion: "1.0.0",
      recordType,
      purpose: "synthetic_pair_viewer_visual_qa_only",
      evidenceClass: "engineering_runtime_observation_only",
      admissionEffect: "none",
      boundary: {
        formalAdmissionAllowed: false,
        formalTwoOfTwoCountDelta: 0,
        expertGateCountDelta: 0
      }
    }), "utf8").toString("base64");
    const request = await collectionRequest(
      "binding_freeze_evidence",
      currentManifest,
      "a",
      (value, category) => {
        if (category === "original_opinion") value.encryptedPayloadBase64 = smuggledRuntimePayload;
      },
      BINDING_IDS[7]
    );
    const result = await preflightPrivateCollectionCandidate(request);
    expect(result.privateArtifactPayloadsInterpreted).toBe(false);
    expect(result.privatePayloadEligibilityBoundary.anyEvidenceEligibilityAllowed).toBe(false);
    expect(result.eligibleAsStageCBindingEvidenceCandidate).toBe(false);
    expect(result.eligibleForFormal2of2EvaluationCandidate).toBe(false);
    expect(result.formalTwoOfTwoCountDelta).toBe(0);
    expect(result.expertGateCountDelta).toBe(0);
    expect(JSON.stringify(result.repositoryProjection)).not.toContain(recordType);
  });

  it("keeps a rehearsal submission smuggled inside opaque base64 ineligible for Stage C evidence", async () => {
    const smuggledRehearsalPayload = Buffer.from(JSON.stringify({
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_single_binding_nocode_rehearsal_submission_candidate_v1",
      boundary: {
        syntheticOnly: true,
        formalAdmissionAllowed: false,
        verifiedExpertCount: 0,
        frozenBindingCount: 0
      }
    }), "utf8").toString("base64");
    const request = await collectionRequest(
      "binding_freeze_evidence",
      currentManifest,
      "a",
      (value, category) => {
        if (category === "original_opinion") value.encryptedPayloadBase64 = smuggledRehearsalPayload;
      },
      BINDING_IDS[7]
    );
    const result = await preflightPrivateCollectionCandidate(request);
    expect(result.purposeInputPrerequisitesSatisfied).toBe(true);
    expect(result.privateArtifactPayloadsInterpreted).toBe(false);
    expect(result.privatePayloadEligibilityBoundary).toEqual({
      encryptedPayloadBytesDecrypted: false,
      decryptedPayloadSchemaValidated: false,
      decryptedPayloadRecordTypeValidated: false,
      payloadSourceAuthenticated: false,
      opinionAuthenticityEstablished: false,
      firstSeenEstablished: false,
      custodyEstablished: false,
      envelopeRecordTypeDenyListInspectsEncryptedPayload: false,
      anyEvidenceEligibilityAllowed: false
    });
    expect(result.eligibleAsStageCBindingEvidenceCandidate).toBe(false);
    expect(result.eligibleForFormal2of2EvaluationCandidate).toBe(false);
    expect(result.formalTwoOfTwoCountDelta).toBe(0);
    expect(result.expertGateCountDelta).toBe(0);
    expect(result.blockers).toContain("trusted_decryption_and_payload_schema_gate_absent");
    expect(result.repositoryProjection.outcomeCodes).toContain(
      "private_payload_uninterpreted_no_evidence_eligibility"
    );
    expect(JSON.stringify(result.repositoryProjection)).not.toContain(
      "bazi_expert_single_binding_nocode_rehearsal_submission_candidate_v1"
    );
  });

  it("keeps an integrated complete return smuggled inside opaque base64 ineligible for Stage C evidence", async () => {
    const recordType = "bazi_expert_single_binding_nocode_synthetic_pilot_complete_return_v1";
    const smuggledIntegratedPayload = Buffer.from(JSON.stringify({
      schemaVersion: "1.0.0",
      recordType,
      reviewPurpose: "synthetic_single_binding_nocode_integrated_handoff_pilot_only",
      boundary: {
        syntheticOnly: true,
        formalAdmissionAllowed: false,
        formalTwoOfTwoCountDelta: 0,
        expertGateCountDelta: 0
      }
    }), "utf8").toString("base64");
    const request = await collectionRequest(
      "binding_freeze_evidence",
      currentManifest,
      "a",
      (value, category) => {
        if (category === "original_opinion") value.encryptedPayloadBase64 = smuggledIntegratedPayload;
      },
      BINDING_IDS[7]
    );
    const result = await preflightPrivateCollectionCandidate(request);
    expect(result.privateArtifactPayloadsInterpreted).toBe(false);
    expect(result.privatePayloadEligibilityBoundary.anyEvidenceEligibilityAllowed).toBe(false);
    expect(result.eligibleAsStageCBindingEvidenceCandidate).toBe(false);
    expect(result.eligibleForFormal2of2EvaluationCandidate).toBe(false);
    expect(result.formalTwoOfTwoCountDelta).toBe(0);
    expect(result.expertGateCountDelta).toBe(0);
    expect(JSON.stringify(result.repositoryProjection)).not.toContain(recordType);
  });

  it("rejects caller-supplied verified=true instead of interpreting it", async () => {
    const request = await collectionRequest("binding_freeze_evidence", currentManifest, "a", (value, category) => {
      if (category === "identity_assessment") value.verified = true;
    });
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("INPUT_KEYS_INVALID"));
  });

  it("rejects input manifest cross-link drift", async () => {
    const request = await collectionRequest("binding_freeze_evidence", currentManifest, "a", (value, category) => {
      if (category === "scope_assessment") value.inputManifestRef.manifestDigest = "0".repeat(64);
    });
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("INPUT_MANIFEST_REF_MISMATCH"));
  });

  it("rejects private-envelope binding selection drift", async () => {
    const request = await collectionRequest(
      "binding_freeze_evidence",
      resealManifest(currentManifest, "shareable_pre_freeze"),
      "a",
      (value, category) => {
        if (category === "original_opinion") value.selectedBindingIds = [BINDING_IDS[1]];
      }
    );
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(
      expectCode("BINDING_SELECTION_MISMATCH")
    );
  });

  it("rejects category order drift", async () => {
    const request = await collectionRequest("binding_freeze_evidence", currentManifest);
    [request.evidenceFiles[0], request.evidenceFiles[1]] = [request.evidenceFiles[1]!, request.evidenceFiles[0]!];
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("EVIDENCE_SET_INVALID"));
  });

  it("rejects reuse of one opaque ref for two evidence categories", async () => {
    let firstRef = "";
    const request = await collectionRequest("binding_freeze_evidence", currentManifest, "a", (value, category) => {
      if (category === "owner_authorization") firstRef = value.opaqueArtifactRef;
      if (category === "participation_consent") {
        value.opaqueArtifactRef = firstRef.replace("/owner_authorization/", "/participation_consent/");
      }
    });
    // Category-scoped namespaces mean the textual refs differ; force an exact duplicate after file creation.
    const secondPath = path.join(request.privateRoot, request.evidenceFiles[1]!.relativeFileName);
    const duplicate = envelope(
      "binding_freeze_evidence", request.seatId, request.reviewCycleId, currentManifest,
      selectionFor("binding_freeze_evidence", currentManifest),
      "participation_consent", "duplicate"
    ) as any;
    duplicate.opaqueArtifactRef = firstRef;
    await writeFile(secondPath, `${JSON.stringify(duplicate)}\n`, "utf8");
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("OPAQUE_REF_INVALID"));
  });

  it("returns a minimal repository projection with no names, paths, URLs, raw payload or private hash", async () => {
    const result = await preflightPrivateCollectionCandidate(
      await collectionRequest("usability_only", currentManifest)
    );
    const projection = JSON.stringify(result.repositoryProjection);
    expect(projection).not.toContain("encryptedPayloadBase64");
    expect(projection).not.toContain("relativeFileName");
    expect(projection).not.toContain("privateRoot");
    expect(projection).not.toContain("displayNameOrControlledPseudonym");
    expect(projection).not.toMatch(/https?:\/\//u);
    expect(result.repositoryProjection.privacyBoundary.personDerivedDigestExcluded).toBe(false);
    expect(result.repositoryProjection.privacyBoundary.safeToPublish).toBe(false);
  });
});

describe("private-root held-handle boundary", () => {
  it("rejects a private root inside the workspace", async () => {
    const request = await collectionRequest("usability_only", currentManifest);
    request.privateRoot = workspaceRoot;
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("PRIVATE_ROOT_OVERLAP"));
  });

  it("rejects traversal and nested private paths before read", async () => {
    const request = await collectionRequest("usability_only", currentManifest);
    request.evidenceFiles[0]!.relativeFileName = "../outside.json";
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("PRIVATE_FILENAME_INVALID"));
  });

  it("rejects BOM and duplicate-key private JSON", async () => {
    const request = await collectionRequest("usability_only", currentManifest);
    const target = path.join(request.privateRoot, request.evidenceFiles[0]!.relativeFileName);
    await writeFile(target, Buffer.from('\ufeff{"schemaVersion":"2.0.0","schemaVersion":"2.0.0"}', "utf8"));
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(
      expect.objectContaining({ name: "FormalIntakeSuccessorError" })
    );
  });

  it("rejects a hardlinked private artifact", async () => {
    const request = await collectionRequest("usability_only", currentManifest);
    const target = path.join(request.privateRoot, request.evidenceFiles[0]!.relativeFileName);
    await link(target, path.join(request.privateRoot, "second-link.json"));
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(expectCode("FILE_ENDPOINT_INVALID"));
  });

  it("rejects a private-root junction", async () => {
    const request = await collectionRequest("usability_only", currentManifest);
    const junction = path.join(await temporaryRoot(), "junction-root");
    await symlink(request.privateRoot, junction, process.platform === "win32" ? "junction" : "dir");
    request.privateRoot = junction;
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(
      expectCode("DIRECTORY_ENDPOINT_INVALID")
    );
  });

  it("rejects a regular private directory reached through a junction parent", async () => {
    const request = await collectionRequest("usability_only", currentManifest);
    const aliasContainer = await temporaryRoot();
    const alias = path.join(aliasContainer, "parent-alias");
    await symlink(path.dirname(request.privateRoot), alias, process.platform === "win32" ? "junction" : "dir");
    request.privateRoot = path.join(alias, path.basename(request.privateRoot));
    await expect(preflightPrivateCollectionCandidate(request)).rejects.toMatchObject(
      expectCode("ROOT_ALIAS_FORBIDDEN")
    );
    await unlink(alias);
  });
});

describe("formal A/B seat cross-link", () => {
  it("accepts only same-cycle same-purpose A/B mechanical projections and never establishes independence", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const [a, b] = await Promise.all([
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "a")),
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "b"))
    ]);
    const pair = preflightFormalSeatPair(a.repositoryProjection, b.repositoryProjection);
    expect(pair.pairMechanicallyCrossLinked).toBe(true);
    expect(pair.seatSpecificReceiptRefsDisjointMechanicallyVerified).toBe(true);
    expect(pair.reviewScope).toEqual({ mode: "single_binding", bindingId: BINDING_IDS[0] });
    expect(pair.selectedBindingIds).toEqual([BINDING_IDS[0]]);
    expect(pair.unselectedBindingConclusionCount).toBe(0);
    expect(pair.endToEndSeatIsolationEstablished).toBe(false);
    expect(pair.humanIndependenceEstablished).toBe(false);
    expect(pair.privatePayloadEvidenceEligibilityEstablished).toBe(false);
    expect(a.repositoryProjection.privatePayloadEligibilityBoundary.anyEvidenceEligibilityAllowed).toBe(false);
    expect(pair.countsTowardFormal2of2).toBe(false);
  });

  it("rejects an A/B pair bound to different single bindings", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const [a, b] = await Promise.all([
      preflightPrivateCollectionCandidate(
        await collectionRequest("binding_freeze_evidence", preFreeze, "a", undefined, BINDING_IDS[0])
      ),
      preflightPrivateCollectionCandidate(
        await collectionRequest("binding_freeze_evidence", preFreeze, "b", undefined, BINDING_IDS[1])
      )
    ]);
    expect(() => preflightFormalSeatPair(a.repositoryProjection, b.repositoryProjection)).toThrow(
      expectCode("PAIR_BINDING_MISMATCH")
    );
  });

  it("rejects A/A pairing", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const a = await preflightPrivateCollectionCandidate(
      await collectionRequest("binding_freeze_evidence", preFreeze, "a")
    );
    expect(() => preflightFormalSeatPair(a.repositoryProjection, a.repositoryProjection)).toThrow(
      expectCode("PAIR_BINDING_MISMATCH")
    );
  });

  it("rejects cross-purpose pairing", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const frozen = resealManifest(currentManifest, "fully_frozen");
    const [a, b] = await Promise.all([
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "a")),
      preflightPrivateCollectionCandidate(await collectionRequest("post_freeze_reaffirmation", frozen, "b"))
    ]);
    expect(() => preflightFormalSeatPair(a.repositoryProjection, b.repositoryProjection)).toThrow(
      expectCode("PAIR_BINDING_MISMATCH")
    );
  });

  it("rejects two seats that do not share the same pairwise-independence receipt", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const [aRequest, bRequest] = await Promise.all([
      collectionRequest("binding_freeze_evidence", preFreeze, "a"),
      collectionRequest("binding_freeze_evidence", preFreeze, "b", (value, category) => {
        if (category === "pairwise_independence") {
          value.opaqueArtifactRef = `opaque-private-ref/pairwise_independence/${sha("different-pair")}`;
        }
      })
    ]);
    const [a, b] = await Promise.all([
      preflightPrivateCollectionCandidate(aRequest),
      preflightPrivateCollectionCandidate(bRequest)
    ]);
    expect(() => preflightFormalSeatPair(a.repositoryProjection, b.repositoryProjection)).toThrow(
      expectCode("PAIR_SHARED_REF_MISMATCH")
    );
  });

  it("rejects tampered projectionId", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const [a, b] = await Promise.all([
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "a")),
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "b"))
    ]);
    const tampered = clone(b.repositoryProjection) as any;
    tampered.projectionId = `opaque-intake-projection/${"0".repeat(64)}`;
    expect(() => preflightFormalSeatPair(a.repositoryProjection, tampered)).toThrow(
      expectCode("PAIR_PROJECTION_BRAND_REQUIRED")
    );
  });

  it("rejects an exact structural clone because an unkeyed self-digest is not provenance", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const [a, b] = await Promise.all([
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "a")),
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "b"))
    ]);
    expect(() => preflightFormalSeatPair(clone(a.repositoryProjection), clone(b.repositoryProjection))).toThrow(
      expectCode("PAIR_PROJECTION_BRAND_REQUIRED")
    );
  });

  it("rejects the red-team forged URL manifest and cross-purpose outcome before echoing it", async () => {
    const preFreeze = resealManifest(currentManifest, "shareable_pre_freeze");
    const [a, b] = await Promise.all([
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "a")),
      preflightPrivateCollectionCandidate(await collectionRequest("binding_freeze_evidence", preFreeze, "b"))
    ]);
    const forgedA = clone(a.repositoryProjection) as any;
    const forgedB = clone(b.repositoryProjection) as any;
    for (const forged of [forgedA, forgedB]) {
      forged.inputManifestRef.manifestId = "https://attacker.invalid/private/reviewer-alice";
      forged.outcomeCodes[1] = "formal_two_of_two_evaluation_candidate_only";
      const seed = {
        reviewCycleId: forged.reviewCycleId,
        seatId: forged.seatId,
        purpose: forged.purpose,
        inputManifestRef: forged.inputManifestRef,
        reviewScope: forged.reviewScope,
        selectedBindingIds: forged.selectedBindingIds,
        selectedBindingSetDigest: forged.selectedBindingSetDigest,
        selectedMaterialDeliveryBoundaries: forged.selectedMaterialDeliveryBoundaries,
        unselectedBindingConclusionCount: 0,
        outcomeCodes: forged.outcomeCodes,
        receiptRefs: forged.receiptRefs
      };
      forged.projectionId = `opaque-intake-projection/${domainDigest(
        "hakimi/bazi/expert-formal-intake-successor/opaque-projection/v3",
        seed
      )}`;
    }
    let caught: unknown;
    try { preflightFormalSeatPair(forgedA, forgedB); }
    catch (error) { caught = error; }
    expect(caught).toMatchObject(expectCode("PAIR_PROJECTION_BRAND_REQUIRED"));
    expect((caught as Error).message).not.toContain("attacker.invalid");
  });
});

describe("append-only lifecycle candidates", () => {
  async function event(
    kind: keyof typeof LIFECYCLE_EVENT_TYPES,
    purpose: "binding_freeze_evidence" | "post_freeze_reaffirmation",
    selectedBindingId: BindingId = BINDING_IDS[0]
  ) {
    const manifest = purpose === "post_freeze_reaffirmation"
      ? resealManifest(currentManifest, "fully_frozen")
      : resealManifest(currentManifest, "shareable_pre_freeze");
    const selection = selectionFor(purpose, manifest, selectedBindingId);
    const prior = await preflightPrivateCollectionCandidate(
      await collectionRequest(purpose, manifest, "a", undefined, selectedBindingId)
    );
    const priorCategory = purpose === "binding_freeze_evidence"
      ? "original_opinion"
      : "post_freeze_reaffirmation";
    const priorPrivateReceiptRef = prior.repositoryProjection.receiptRefs.find(
      (entry) => entry.evidenceCategoryCode === priorCategory
    )!.opaqueArtifactRef;
    const request = {
      inputManifest: manifest,
      event: {
        schemaVersion: "3.0.0",
        recordType: LIFECYCLE_EVENT_TYPES[kind],
        eventKind: kind,
        eventId: `bazi-formal-lifecycle-event/${sha(`${kind}:event`)}`,
        reviewCycleId: cycleFor(purpose),
        seatId: "domain-expert-a",
        purpose,
        inputManifestRef: reviewInputManifestRef(manifest),
        reviewScope: clone(selection.reviewScope),
        selectedBindingIds: clone(selection.selectedBindingIds),
        selectedBindingSetDigest: selection.selectedBindingSetDigest,
        priorPrivateReceiptRef,
        eventPrivateReceiptRef: `opaque-lifecycle-ref/${kind}/${sha(`${kind}:receipt`)}`,
        reasonCode: kind === "correction" ? "reviewer_correction_requested"
          : kind === "withdrawal" ? "reviewer_withdrawal_recorded" : "credential_revoked",
        releaseGovernance: RELEASE_GOVERNANCE,
        authorityBoundary: AUTHORITY_NONE
      }
    };
    return { request, priorProjection: prior.repositoryProjection, manifest };
  }

  it.each(["correction", "withdrawal", "credential_revocation"] as const)(
    "%s remains append-only, re-closes the gate, and does not mutate",
    async (kind) => {
      const fixture = await event(kind, "binding_freeze_evidence");
      const result = preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection);
      expect(result.structurallyValidCandidate).toBe(true);
      expect(result.acceptedReceipt).toBe(false);
      expect(result.appendOnlyRequired).toBe(true);
      expect(result.priorRecordOverwriteAllowed).toBe(false);
      expect(result.affectedSeatAndGateMustReclose).toBe(true);
      expect(result.gateRecloseObserved).toBe(false);
      expect(result.stateMutationPerformed).toBe(false);
      expect(result.schema13MutationEpochAvailable).toBe(false);
      expect(result.reviewScope).toEqual({ mode: "single_binding", bindingId: BINDING_IDS[0] });
      expect(result.selectedBindingIds).toEqual([BINDING_IDS[0]]);
      expect(result.selectedBindingSetDigest).toBe(fixture.request.event.selectedBindingSetDigest);
    }
  );

  it("rejects lifecycle recordType conversion", async () => {
    const fixture = await event("withdrawal", "binding_freeze_evidence");
    (fixture.request.event as any).recordType = LIFECYCLE_EVENT_TYPES.correction;
    expect(() => preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection)).toThrow(
      expectCode("LIFECYCLE_EVENT_INVALID")
    );
  });

  it("rejects predecessor v2 lifecycle records", async () => {
    const fixture = await event("withdrawal", "binding_freeze_evidence");
    (fixture.request.event as any).schemaVersion = "2.0.0";
    (fixture.request.event as any).recordType = "bazi_expert_formal_withdrawal_candidate_v2";
    expect(() => preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection)).toThrow(
      expectCode("PREDECESSOR_RECORD_TYPE_FORBIDDEN")
    );
  });

  it("rejects usability lifecycle conversion", async () => {
    const fixture = await event("correction", "binding_freeze_evidence");
    (fixture.request.event as any).purpose = "usability_only";
    expect(() => preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection)).toThrow(
      expectCode("LIFECYCLE_EVENT_INVALID")
    );
  });

  it("rejects caller verified=true", async () => {
    const fixture = await event("credential_revocation", "binding_freeze_evidence");
    (fixture.request.event as any).verified = true;
    expect(() => preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection)).toThrow(
      expectCode("INPUT_KEYS_INVALID")
    );
  });

  it.each(["correction", "withdrawal", "credential_revocation"] as const)(
    "rejects %s drift to another binding even when the replacement selection is internally self-consistent",
    async (kind) => {
      const fixture = await event(kind, "binding_freeze_evidence", BINDING_IDS[0]);
      const replacement = selectionFor("binding_freeze_evidence", fixture.manifest, BINDING_IDS[1]);
      (fixture.request.event as any).reviewScope = clone(replacement.reviewScope);
      (fixture.request.event as any).selectedBindingIds = clone(replacement.selectedBindingIds);
      (fixture.request.event as any).selectedBindingSetDigest = replacement.selectedBindingSetDigest;
      expect(() => preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection)).toThrow(
        expectCode("LIFECYCLE_PRIOR_BINDING_MISMATCH")
      );
    }
  );

  it("rejects selected binding digest drift", async () => {
    const fixture = await event("correction", "binding_freeze_evidence");
    (fixture.request.event as any).selectedBindingSetDigest = "0".repeat(64);
    expect(() => preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection)).toThrow(
      expectCode("LIFECYCLE_SELECTION_INVALID")
    );
  });

  it("rejects a post-freeze lifecycle subset", async () => {
    const fixture = await event("withdrawal", "post_freeze_reaffirmation");
    (fixture.request.event as any).selectedBindingIds = [BINDING_IDS[0]];
    expect(() => preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection)).toThrow(
      expectCode("LIFECYCLE_SELECTION_INVALID")
    );
  });

  it("rejects an unbranded prior projection clone", async () => {
    const fixture = await event("credential_revocation", "binding_freeze_evidence");
    expect(() => preflightLifecycleEventCandidate(
      fixture.request,
      clone(fixture.priorProjection)
    )).toThrow(expectCode("LIFECYCLE_PRIOR_PROJECTION_BRAND_REQUIRED"));
  });

  it("rejects a prior receipt ref that is outside the bound projection", async () => {
    const fixture = await event("correction", "binding_freeze_evidence");
    (fixture.request.event as any).priorPrivateReceiptRef =
      `opaque-private-ref/original_opinion/${sha("not-in-prior-projection")}`;
    expect(() => preflightLifecycleEventCandidate(fixture.request, fixture.priorProjection)).toThrow(
      expectCode("LIFECYCLE_PRIOR_BINDING_MISMATCH")
    );
  });
});

describe("strict JSON byte boundary", () => {
  it("rejects duplicate keys", () => {
    const bytes = Buffer.from('{"a":1,"a":2}', "utf8");
    expect(() => parseStrictJsonBytes(bytes, "fixture", 100)).toThrow(expectCode("DUPLICATE_JSON_KEY"));
  });

  it("rejects invalid UTF-8", () => {
    expect(() => parseStrictJsonBytes(Uint8Array.from([0xc3, 0x28]), "fixture", 100)).toThrow(
      expectCode("JSON_UTF8_INVALID")
    );
  });

  it("rejects BOM", () => {
    expect(() => parseStrictJsonBytes(Buffer.from('\ufeff{}', "utf8"), "fixture", 100)).toThrow(
      expectCode("JSON_BOM_FORBIDDEN")
    );
  });

  it("rejects prototype and accessor object input", () => {
    const accessor = {} as Record<string, unknown>;
    Object.defineProperty(accessor, "schemaVersion", { enumerable: true, get: () => "2.0.0" });
    expect(() => validateReviewInputManifestV3(accessor)).toThrow(expectCode("INPUT_UNSAFE"));
    expect(() => validateReviewInputManifestV3(Object.create({ inherited: true }))).toThrow(expectCode("INPUT_UNSAFE"));
  });
});
