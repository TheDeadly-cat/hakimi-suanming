// @vitest-environment node

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BaziReviewCycleKernelError } from "./canonical.ts";
import {
  evaluateBaziExpertReviewCycleTransition,
  inspectBaziExpertReviewBundleManifestCandidate
} from "./evaluator.ts";
import {
  BAZI_COLLECTION_START_BLOCKER_IDS,
  BAZI_EXPERT_REVIEW_BUNDLE_MANIFEST_CANDIDATE_VERSION,
  BAZI_REVIEW_AUTHORITY_NONE,
  BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS,
  BAZI_REVIEW_BUNDLE_MANIFEST_REQUIRED_CARDINALITIES,
  BAZI_REVIEW_CYCLE_DRAFT_REQUIREMENTS,
  BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION,
  type BaziReviewBundleManifestComponentId,
  type BaziReviewCycleStateId
} from "./protocol.ts";

const WORKSPACE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const HEX = {
  chain: "1".repeat(64),
  consumed: "2".repeat(64),
  revocation: "3".repeat(64),
  state: "4".repeat(64),
  generation: "5".repeat(64),
  operation: "6".repeat(64),
  idempotency: "7".repeat(64),
  nonce: "8".repeat(64),
  cycle: "9".repeat(64),
  manifest: "a".repeat(64)
} as const;

function request(
  transitionId = "request_collection_start",
  stateId: BaziReviewCycleStateId = "prerequisites_blocked"
) {
  return {
    currentState: {
      chainHeadDigest: HEX.chain,
      consumedNonceSetHeadDigest: HEX.consumed,
      credentialRevocationHeadDigest: HEX.revocation,
      reviewCycleEpoch: 0,
      stateDigest: HEX.state,
      stateId
    },
    operation: {
      generationScopedOperationNonce: `bazi-review-operation-nonce/${HEX.nonce}`,
      idempotencyKey: `bazi-review-idempotency/${HEX.idempotency}`,
      idempotencyKeyPreviouslyObserved: false,
      ledgerGenerationId: `bazi-review-ledger-generation/${HEX.generation}`,
      operationId: `bazi-review-operation/${HEX.operation}`,
      operationIdPreviouslyObserved: false,
      operationNoncePreviouslyConsumed: false
    },
    transitionId
  };
}

function manifestCandidate() {
  const componentReceiptRefs = Object.fromEntries(
    BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS.map((componentId) => [componentId, []])
  ) as Record<BaziReviewBundleManifestComponentId, never[]>;
  return {
    componentReceiptRefs,
    credentialRevocationHeadDigest: HEX.revocation,
    historicalPacketId: "hakimi.bazi.strength.expert-review-packet/1.5.0",
    manifestId: `bazi-review-bundle-manifest/${HEX.manifest}`,
    reviewCycleId: `bazi-review-cycle/${HEX.cycle}`,
    schemaVersion: BAZI_EXPERT_REVIEW_BUNDLE_MANIFEST_CANDIDATE_VERSION
  };
}

function withTemporaryOwnValue<T>(
  target: object,
  key: PropertyKey,
  replacement: unknown,
  action: () => T
): T {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (!descriptor) throw new Error(`missing test descriptor: ${String(key)}`);
  Object.defineProperty(target, key, { ...descriptor, value: replacement });
  try {
    return action();
  } finally {
    Object.defineProperty(target, key, descriptor);
  }
}

function withTemporaryOwnDescriptor<T>(
  target: object,
  key: PropertyKey,
  replacement: PropertyDescriptor,
  action: () => T
): T {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, replacement);
  try {
    return action();
  } finally {
    if (original) Object.defineProperty(target, key, original);
    else Reflect.deleteProperty(target, key);
  }
}

async function readIdentity(relativePath: string) {
  const bytes = await readFile(`${WORKSPACE_ROOT}${relativePath}`);
  return {
    bytes,
    json: JSON.parse(bytes.toString("utf8")) as Record<string, unknown>,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

async function collectIsolationScanFiles(root: string): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".vite"
      || entry.name === "coverage") continue;
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      output.push(...await collectIsolationScanFiles(fullPath));
    } else if (/\.(?:[cm]?[jt]sx?|json|ya?ml|ps1|sh|html?|css|scss|md|txt)$/u.test(entry.name)) {
      output.push(fullPath);
    }
  }
  return output;
}

describe("Bazi expert review cycle draft requirements", () => {
  it("pins legacy-v13 without pretending reviewCycleEpoch is Schema 13 mutation epoch", () => {
    expect(BAZI_REVIEW_CYCLE_DRAFT_REQUIREMENTS.releaseGovernance).toEqual({
      activeLine: "legacy-v13",
      migrationId: null,
      mutationEpochAvailableForSchema13: false,
      mutationEpochBoundaryRequired: true,
      reviewCycleEpochIsSchema13MutationEpoch: false,
      targetSchema: 13
    });
    expect(BAZI_REVIEW_CYCLE_DRAFT_REQUIREMENTS.authorityBoundary)
      .toEqual(BAZI_REVIEW_AUTHORITY_NONE);
  });

  it("keeps exact present counts at 0/12 and 0/2", () => {
    expect(BAZI_REVIEW_CYCLE_DRAFT_REQUIREMENTS.currentCounts).toEqual({
      bindingFrozenRequired: 12,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      originalOpinions: 0,
      reviewerSlotsOccupied: 0,
      sealedOriginalOpinions: 0
    });
  });

  it("keeps lifecycle ideas as unaccepted Bazi draft requirements", () => {
    expect(BAZI_REVIEW_CYCLE_DRAFT_REQUIREMENTS.draftLifecycleRequirementBoundary)
      .toMatchObject({
        baziOwnerAcceptanceRecorded: false,
        candidateRequirementsOnly: true,
        countsAsCurrentBaziPolicy: false,
        inheritedFromVedicAuthority: false,
        requirements: {
          artifactDriftClosesAffectedSeatAndGate: true,
          correctionAppendsAndSupersedesWithoutOverwrite: true,
          correctionReopensAffectedSeatAndGate: true,
          credentialRevocationImmediatelyClosesAffectedSeatAndGate: true,
          deletionOfPriorOpinionOrLifecycleRecordAllowed: false,
          generatedModelWinnerSelectionAllowed: false,
          majorityVoteAllowed: false,
          opinionAveragingAllowed: false,
          withdrawalImmediatelyClosesAffectedSeatAndGate: true
        }
    });
  });

  it("observes the exact current upstream bytes but labels them observation-only", async () => {
    const packet = await readIdentity("content/bazi-strength-expert-review-packet.v1.json");
    const intake = await readIdentity(
      "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json"
    );
    const readiness = await readIdentity(
      "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json"
    );
    const manifest = await readIdentity(
      "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0.json"
    );
    expect(packet.sha256).toBe(BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION.historicalPacketRawSha256);
    expect(packet.json.packetId).toBe(BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION.historicalPacketId);
    expect(intake.sha256).toBe(BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION.expertIntakeCandidateRawSha256);
    expect(intake.json.ledgerId).toBe(BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION.expertIntakeCandidateId);
    expect(readiness.sha256).toBe(BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION.currentReadinessRawSha256);
    expect(readiness.json.ledgerId).toBe(BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION.currentReadinessLedgerId);
    expect(manifest.sha256).toBe(
      BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION.currentManifestObservationRawSha256
    );
    expect(manifest.json.candidateId).toBe(
      BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION.currentManifestObservationCandidateId
    );
    expect(BAZI_REVIEW_CYCLE_UPSTREAM_OBSERVATION).toMatchObject({
      observationOnly: true,
      upstreamBytesVerifiedByKernelRuntime: false
    });
  });

  it("confirms current upstream gates remain red without importing them into the kernel", async () => {
    const intake = await readIdentity(
      "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json"
    );
    const readiness = await readIdentity(
      "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json"
    );
    const manifest = await readIdentity(
      "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0.json"
    );
    const intakeGate = intake.json.gateSummary as Record<string, unknown>;
    const readinessGate = readiness.json.gateSummary as Record<string, unknown>;
    const manifestGate = manifest.json.gateSummary as Record<string, unknown>;
    expect(intakeGate).toMatchObject({
      bindingFrozenVerified: 0,
      candidateFeedbackCollectionReady: false,
      independentExpertReviewsVerified: 0,
      reviewerSlotsOccupied: 0,
      sealedOriginalOpinions: 0
    });
    expect(readinessGate).toMatchObject({
      bindingFrozenVerified: 0,
      expertReviewBundleComplete: false,
      rightsBundleComplete: false,
      sourceBundleComplete: false
    });
    expect(manifestGate).toMatchObject({
      bindingFrozenVerified: 0,
      independentExpertReviewsVerified: 0,
      releaseReady: false,
      rightsBundleComplete: false,
      sourceBundleComplete: false
    });
  });
});

describe("collection-start fail-closed evaluator", () => {
  it("returns the exact blocker set and never mutates state or heads", () => {
    const input = request();
    const result = evaluateBaziExpertReviewCycleTransition(input);
    expect(result.rejectionCode).toBe("COLLECTION_START_BLOCKED");
    expect(result.failedGuardIds).toEqual(BAZI_COLLECTION_START_BLOCKER_IDS);
    expect(result).toMatchObject({
      acceptedReceipt: false,
      authorityBoundary: BAZI_REVIEW_AUTHORITY_NONE,
      authorityEffect: "none",
      beforeReviewCycleEpoch: 0,
      afterReviewCycleEpoch: 0,
      commitObserved: false,
      nonceConsumed: false,
      stateBefore: "prerequisites_blocked",
      stateAfter: "prerequisites_blocked",
      previousStateDigest: HEX.state,
      nextStateDigest: HEX.state,
      previousChainHeadDigest: HEX.chain,
      nextChainHeadDigest: HEX.chain,
      previousConsumedNonceSetHeadDigest: HEX.consumed,
      nextConsumedNonceSetHeadDigest: HEX.consumed,
      previousCredentialRevocationHeadDigest: HEX.revocation,
      nextCredentialRevocationHeadDigest: HEX.revocation,
      schema13MutationEpochAvailable: false,
      reviewCycleEpochIsSchema13MutationEpoch: false
    });
    expect(result.failureResponseDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(result).toMatchObject({
      personDataPresenceAssessed: false,
      personDerivedDigestExcluded: false,
      safeToPublish: false
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("is deterministic for the same closed request", () => {
    const first = evaluateBaziExpertReviewCycleTransition(request());
    const second = evaluateBaziExpertReviewCycleTransition(structuredClone(request()));
    expect(second).toEqual(first);
    expect(second.failureResponseDigest).toBe(first.failureResponseDigest);
  });

  it.each([
    ["operationIdPreviouslyObserved", "operation_id_not_previously_observed"],
    ["idempotencyKeyPreviouslyObserved", "idempotency_key_not_previously_observed"],
    ["operationNoncePreviouslyConsumed", "generation_scoped_nonce_not_previously_consumed"]
  ] as const)("rejects replay marker %s without consuming a nonce", (field, guard) => {
    const input = request();
    input.operation[field] = true;
    const result = evaluateBaziExpertReviewCycleTransition(input);
    expect(result.rejectionCode).toBe("REPLAY_OR_IDEMPOTENCY_CONFLICT");
    expect(result.failedGuardIds).toEqual([guard]);
    expect(result.nonceConsumed).toBe(false);
    expect(result.nextConsumedNonceSetHeadDigest).toBe(result.previousConsumedNonceSetHeadDigest);
  });

  it("rejects an unknown transition before any mutation", () => {
    const result = evaluateBaziExpertReviewCycleTransition(request("start_real_expert_collection_now"));
    expect(result.rejectionCode).toBe("UNKNOWN_TRANSITION");
    expect(result.failedGuardIds).toEqual(["recognized_transition_id"]);
    expect(result.attemptedTransitionId).toBe("unrecognized_transition");
    expect(result.commitObserved).toBe(false);
  });

  it("rejects the wrong from-state", () => {
    const result = evaluateBaziExpertReviewCycleTransition(
      request("request_collection_start", "owner_intake_authorization_pending")
    );
    expect(result.rejectionCode).toBe("FROM_STATE_MISMATCH");
    expect(result.failedGuardIds).toEqual(["from_state_prerequisites_blocked"]);
  });

  it("rejects an epoch that cannot be safely advanced even though this draft never advances it", () => {
    const input = request();
    input.currentState.reviewCycleEpoch = Number.MAX_SAFE_INTEGER;
    const result = evaluateBaziExpertReviewCycleTransition(input);
    expect(result.rejectionCode).toBe("EPOCH_INVALID");
    expect(result.beforeReviewCycleEpoch).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.afterReviewCycleEpoch).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([
    ["record_owner_intake_authorization", "owner_intake_authorization_pending"],
    ["record_authority_verification", "authority_verification_pending"],
    ["record_pairwise_independence", "independence_pending"],
    ["record_blind_opinion_a", "blind_opinions_pending"],
    ["record_blind_opinion_b", "blind_opinions_pending"],
    ["seal_original_opinions", "blind_opinions_pending"],
    ["record_disagreement_inventory", "disagreement_inventory_pending"],
    ["record_reconciliation", "reconciliation_pending"],
    ["seal_expert_review_bundle", "reconciliation_pending"]
  ] as const)("keeps known positive transition %s non-executable", (transitionId, stateId) => {
    const result = evaluateBaziExpertReviewCycleTransition(request(transitionId, stateId));
    expect(result.rejectionCode).toBe("TRANSITION_NOT_IMPLEMENTED");
    expect(result.failedGuardIds).toEqual([
      "positive_transition_not_implemented_in_zero_instance_authority_none_draft"
    ]);
    expect(result.stateAfter).toBe(stateId);
    expect(result.afterReviewCycleEpoch).toBe(result.beforeReviewCycleEpoch);
    expect(result.commitObserved).toBe(false);
  });

  it.each([
    "record_correction",
    "record_withdrawal",
    "record_credential_revocation",
    "invalidate_for_artifact_drift"
  ] as const)("does not assert a single from-state for cross-phase lifecycle event %s", (transitionId) => {
    for (const stateId of [
      "prerequisites_blocked",
      "authority_verification_pending",
      "blind_opinions_pending",
      "bundle_sealed"
    ] as const) {
      const result = evaluateBaziExpertReviewCycleTransition(request(transitionId, stateId));
      expect(result.rejectionCode).toBe("TRANSITION_NOT_IMPLEMENTED");
      expect(result.failedGuardIds).toEqual([
        "cross_phase_lifecycle_event_scope_not_owner_accepted_or_implemented"
      ]);
      expect(result.stateAfter).toBe(stateId);
    }
  });
});

describe("closed input boundary", () => {
  it("rejects an extra payload that could smuggle a real person or opinion", () => {
    const input = { ...request(), reviewerName: "should-not-be-accepted" };
    expect(() => evaluateBaziExpertReviewCycleTransition(input)).toThrow("键集合不匹配");
  });

  it("rejects accessors without invoking the getter", () => {
    const input = request();
    let invoked = false;
    Object.defineProperty(input, "smuggled", {
      enumerable: true,
      get() {
        invoked = true;
        return "secret";
      }
    });
    expect(() => evaluateBaziExpertReviewCycleTransition(input)).toThrow(BaziReviewCycleKernelError);
    expect(invoked).toBe(false);
  });

  it("rejects inherited input authority", () => {
    const input = Object.assign(Object.create({ approved: true }), request());
    expect(() => evaluateBaziExpertReviewCycleTransition(input)).toThrow("普通 JSON 对象");
  });

  it("rejects non-finite and negative-zero epochs", () => {
    const nonFinite = request();
    nonFinite.currentState.reviewCycleEpoch = Number.POSITIVE_INFINITY;
    expect(() => evaluateBaziExpertReviewCycleTransition(nonFinite)).toThrow("有限且非负零");
    const negativeZero = request();
    negativeZero.currentState.reviewCycleEpoch = -0;
    expect(() => evaluateBaziExpertReviewCycleTransition(negativeZero)).toThrow("有限且非负零");
  });

  it("rejects malformed operation identities", () => {
    const input = request();
    input.operation.operationId = "person@example.com";
    expect(() => evaluateBaziExpertReviewCycleTransition(input)).toThrow("格式无效");
  });

  it("rejects Proxy input before accepting its synthetic descriptors", () => {
    expect(() => evaluateBaziExpertReviewCycleTransition(new Proxy(request(), {})))
      .toThrow("不得是 Proxy");
  });

  it("rejects an unknown transition identifier that is not a bounded token", () => {
    expect(() => evaluateBaziExpertReviewCycleTransition(request("reviewer@example.com")))
      .toThrow("格式无效");
  });
});

describe("zero-instance immutable bundle manifest candidate", () => {
  it("reports exact zero instances and all positive authorities false", () => {
    const report = inspectBaziExpertReviewBundleManifestCandidate(manifestCandidate());
    expect(report).toMatchObject({
      acceptedReceipt: false,
      authorityBoundary: BAZI_REVIEW_AUTHORITY_NONE,
      authorityEffect: "none",
      canAdvanceState: false,
      candidateOnly: true,
      exactZeroInstanceShapeVerified: true,
      firstSeenAndCustodyVerified: false,
      formalManifestInstanceCreated: false,
      manifestComplete: false,
      originalOpinionBytesVerified: false,
      personDataPresenceAssessed: false,
      personDerivedDigestExcluded: false,
      positiveManifestInputsAccepted: false,
      reviewCycleEpochIsSchema13MutationEpoch: false,
      schema13MutationEpochAvailable: false,
      safeToPublish: false,
      signaturesVerified: false
    });
    expect(Object.values(report.componentCounts)).toEqual(
      BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS.map(() => 0)
    );
    expect(report.missingRequiredComponentIds).toEqual(
      Object.keys(BAZI_REVIEW_BUNDLE_MANIFEST_REQUIRED_CARDINALITIES)
    );
    expect(report.candidateDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("is deterministic", () => {
    const first = inspectBaziExpertReviewBundleManifestCandidate(manifestCandidate());
    const second = inspectBaziExpertReviewBundleManifestCandidate(
      structuredClone(manifestCandidate())
    );
    expect(second).toEqual(first);
  });

  it.each(BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS)(
    "rejects any non-empty %s array instead of accepting synthetic evidence",
    (componentId) => {
      const candidate = manifestCandidate();
      candidate.componentReceiptRefs[componentId].push({ synthetic: true } as never);
      expect(() => inspectBaziExpertReviewBundleManifestCandidate(candidate)).toThrow(
        "仅接受零实例空数组"
      );
    }
  );

  it("rejects an extra component family", () => {
    const candidate = manifestCandidate();
    Object.assign(candidate.componentReceiptRefs, { model_selected_winner_receipts: [] });
    expect(() => inspectBaziExpertReviewBundleManifestCandidate(candidate)).toThrow(
      "键集合不匹配"
    );
  });

  it("rejects PII-like cycle and manifest identifiers", () => {
    const candidate = manifestCandidate();
    candidate.reviewCycleId = "reviewer@example.com";
    expect(() => inspectBaziExpertReviewBundleManifestCandidate(candidate)).toThrow("格式无效");
  });

  it("rejects Array subclasses even when they are empty", () => {
    class ReviewerControlledArray extends Array<never> {}
    const candidate = manifestCandidate();
    candidate.componentReceiptRefs.correction_receipts = new ReviewerControlledArray();
    expect(() => inspectBaziExpertReviewBundleManifestCandidate(candidate))
      .toThrow("原生普通数组");
  });

  it("rejects an oversized sparse array before traversing attacker-sized input", () => {
    const candidate = manifestCandidate();
    candidate.componentReceiptRefs.correction_receipts = new Array(4_097) as never[];
    expect(() => inspectBaziExpertReviewBundleManifestCandidate(candidate))
      .toThrow("数组长度超过封闭输入上限");
  });
});

describe("post-import primordial tampering boundary", () => {
  it("does not let a poisoned Array.prototype.push erase a non-empty evidence array", () => {
    const candidate = manifestCandidate();
    candidate.componentReceiptRefs.correction_receipts[0] = { synthetic: true } as never;
    let thrown: unknown;
    withTemporaryOwnValue(Array.prototype, "push", function poisonedPush(this: unknown[]) {
      return this.length;
    }, () => {
      try {
        inspectBaziExpertReviewBundleManifestCandidate(candidate);
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain("仅接受零实例空数组");
  });

  it("keeps distinct failure digests when Array.prototype.map is poisoned", () => {
    let collectionStartDigest = "";
    let unknownTransitionDigest = "";
    withTemporaryOwnValue(Array.prototype, "map", () => [], () => {
      collectionStartDigest = evaluateBaziExpertReviewCycleTransition(request())
        .failureResponseDigest;
      unknownTransitionDigest = evaluateBaziExpertReviewCycleTransition(
        request("start_real_expert_collection_now")
      ).failureResponseDigest;
    });
    expect(collectionStartDigest).not.toBe(unknownTransitionDigest);
  });

  it("does not depend on Array.prototype iteration to validate, count, or freeze families", () => {
    const candidate = manifestCandidate();
    let report!: ReturnType<typeof inspectBaziExpertReviewBundleManifestCandidate>;
    withTemporaryOwnValue(Array.prototype, Symbol.iterator, function emptyIterator() {
      return { next: () => ({ done: true, value: undefined }) };
    }, () => {
      report = inspectBaziExpertReviewBundleManifestCandidate(candidate);
    });
    expect(Object.keys(report.componentCounts)).toHaveLength(
      BAZI_REVIEW_BUNDLE_MANIFEST_COMPONENT_IDS.length
    );
    expect(report.missingRequiredComponentIds).toEqual(
      Object.keys(BAZI_REVIEW_BUNDLE_MANIFEST_REQUIRED_CARDINALITIES)
    );
    expect(Object.isFrozen(report.componentCounts)).toBe(true);
    expect(Object.isFrozen(report.missingRequiredComponentIds)).toBe(true);
  });

  it("uses captured WeakSet methods for cycle tracking", () => {
    let result!: ReturnType<typeof evaluateBaziExpertReviewCycleTransition>;
    withTemporaryOwnValue(WeakSet.prototype, "has", () => false, () => {
      withTemporaryOwnValue(WeakSet.prototype, "add", function poisonedAdd(this: WeakSet<object>) {
        return this;
      }, () => {
        withTemporaryOwnValue(WeakSet.prototype, "delete", () => false, () => {
          result = evaluateBaziExpertReviewCycleTransition(request());
        });
      });
    });
    expect(result.rejectionCode).toBe("COLLECTION_START_BLOCKED");
    expect(result.failedGuardIds).toEqual(BAZI_COLLECTION_START_BLOCKER_IDS);
  });

  it("does not let an inherited numeric setter erase replay guards", () => {
    const input = request();
    input.operation.operationIdPreviouslyObserved = true;
    const original = Object.getOwnPropertyDescriptor(Array.prototype, "0");
    let result!: ReturnType<typeof evaluateBaziExpertReviewCycleTransition>;
    Object.defineProperty(Array.prototype, "0", {
      configurable: true,
      get: () => "poisoned-index",
      set: () => undefined
    });
    try {
      result = evaluateBaziExpertReviewCycleTransition(input);
    } finally {
      if (original) Object.defineProperty(Array.prototype, "0", original);
      else Reflect.deleteProperty(Array.prototype, "0");
    }
    expect(result.rejectionCode).toBe("REPLAY_OR_IDEMPOTENCY_CONFLICT");
    expect(result.failedGuardIds).toEqual(["operation_id_not_previously_observed"]);
  });

  it("does not treat an accessor descriptor as data through Object.prototype.value", () => {
    const input = request();
    let inheritedValueGetterCalls = 0;
    let thrown: unknown;
    Object.defineProperty(input, "transitionId", {
      configurable: true,
      enumerable: true,
      get: undefined,
      set: undefined
    });
    withTemporaryOwnDescriptor(Object.prototype, "value", {
      configurable: true,
      get() {
        inheritedValueGetterCalls += 1;
        return "request_collection_start";
      }
    }, () => {
      try {
        evaluateBaziExpertReviewCycleTransition(input);
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toBeInstanceOf(BaziReviewCycleKernelError);
    expect((thrown as Error).message).toContain("不得是 accessor");
    expect(inheritedValueGetterCalls).toBe(0);
  });
});

describe("non-workspace isolation observation", () => {
  it("has no package manifest and leaves the root lock identity unchanged", async () => {
    await expect(readFile(
      `${WORKSPACE_ROOT}isolated-drafts/bazi-expert-review-cycle-kernel/package.json`
    )).rejects.toMatchObject({ code: "ENOENT" });
    const lockBytes = await readFile(`${WORKSPACE_ROOT}package-lock.json`);
    expect(lockBytes.byteLength).toBe(174994);
    expect(createHash("sha256").update(lockBytes).digest("hex"))
      .toBe("5c0a532cc8061e970e4b0fb8e13a68546f558fc487d8249abc65983a95dccd25");
    expect(lockBytes.toString("utf8")).not.toContain("bazi-expert-review-cycle-kernel");
  });

  it("observes no literal production or toolchain reference to the isolated draft", async () => {
    const scanRoots = ["apps", "packages", "scripts"].map((entry) => join(WORKSPACE_ROOT, entry));
    const files = (await Promise.all(scanRoots.map(collectIsolationScanFiles))).flat();
    files.push(
      join(WORKSPACE_ROOT, "package.json"),
      join(WORKSPACE_ROOT, "package-lock.json"),
      join(WORKSPACE_ROOT, "tsconfig.base.json")
    );
    const restricted = "apps/web/src/lib/local-user-data-cleanup.ts";
    const needles = [
      "isolated-drafts/bazi-expert-review-cycle-kernel",
      "@hakimi/bazi-expert-review-cycle-kernel-draft"
    ];
    const hits: string[] = [];
    const skippedRestrictedSources: string[] = [];
    for (const file of files) {
      const relativePath = relative(WORKSPACE_ROOT, file).replaceAll("\\", "/");
      if (relativePath === restricted) {
        skippedRestrictedSources.push(relativePath);
        continue;
      }
      const source = await readFile(file, "utf8");
      if (needles.some((needle) => source.includes(needle))) hits.push(relativePath);
    }
    expect(hits).toEqual([]);
    expect(skippedRestrictedSources).toEqual([restricted]);
  });
});
