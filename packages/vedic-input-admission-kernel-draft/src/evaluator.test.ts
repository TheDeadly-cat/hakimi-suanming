import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MAX_VEDIC_GOVERNANCE_PACKET_BYTES,
  VedicFrozenPacketError,
  canonicalizeKernelJson,
  createCanonicalVedicGovernancePacket,
  domainSeparatedDigest,
  parseCanonicalVedicGovernancePacket
} from "./frozen-packet-schema.ts";
import {
  evaluateVedicInputAdmissionTransition,
  inspectVedicPreSnapshotEvidenceManifestCandidate,
  VedicAdmissionKernelError
} from "./evaluator.ts";
import {
  VEDIC_AUTHORITY_NONE,
  VEDIC_CONDITION_IDS,
  VEDIC_INVARIANT_IDS,
  VEDIC_PACKET_DIGEST_DOMAIN,
  VEDIC_PRE_SNAPSHOT_DECLARED_DIGEST_DOMAIN,
  VEDIC_PRE_SNAPSHOT_DEFINED_RECEIPT_CARDINALITIES,
  VEDIC_PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS,
  VEDIC_PRE_SNAPSHOT_MANIFEST_CANDIDATE_SCHEMA_VERSION,
  VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS,
  VEDIC_PRE_SNAPSHOT_MANIFEST_ID,
  VEDIC_READINESS_CANDIDATE_DIGEST,
  VEDIC_REQUIREMENT_IDS,
  VEDIC_REVIEW_CONTENT_DIGEST_FIELDS,
  VEDIC_TRANSITION_CONTRACT_DIGEST,
  type VedicKernelTransitionRequest,
  type VedicPreSnapshotEvidenceManifestCandidate,
  type VedicPreSnapshotReceiptReferenceCandidate,
  type VedicReviewContentDigests
} from "./protocol.ts";

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const SHA_D = "d".repeat(64);
const SHA_E = "e".repeat(64);

function reviewDigests(): VedicReviewContentDigests {
  return Object.fromEntries(VEDIC_REVIEW_CONTENT_DIGEST_FIELDS.map((field) => [
    field,
    createHash("sha256").update(`governance-review:${field}`).digest("hex")
  ])) as VedicReviewContentDigests;
}

async function packetBytes(): Promise<Uint8Array> {
  return createCanonicalVedicGovernancePacket(reviewDigests());
}

function request(overrides: Partial<VedicKernelTransitionRequest> = {}): VedicKernelTransitionRequest {
  return {
    currentState: {
      chainHeadDigest: SHA_B,
      consumedNonceSetHeadDigest: SHA_D,
      mutationEpoch: 0,
      revocationLedgerHeadDigest: SHA_C,
      stateDigest: SHA_A,
      stateId: "uninstantiated"
    },
    operation: {
      generationScopedOperationNonce: `vedic-operation-nonce/${"1".repeat(64)}`,
      idempotencyKey: `vedic-idempotency/${"2".repeat(64)}`,
      idempotencyKeyPreviouslyObserved: false,
      ledgerGenerationId: `vedic-ledger-generation/${"3".repeat(64)}`,
      operationId: `vedic-operation/${"4".repeat(64)}`,
      operationIdPreviouslyObserved: false,
      operationNoncePreviouslyConsumed: false
    },
    transitionId: "freeze_packet",
    ...overrides
  };
}

function receiptReference(
  packet: Awaited<ReturnType<typeof parseCanonicalVedicGovernancePacket>>,
  receiptKind: string,
  index: number
): VedicPreSnapshotReceiptReferenceCandidate {
  return {
    admissionCycleId: packet.admissionCycleId,
    packetDigest: packet.packetDigest,
    packetDigestDomain: VEDIC_PACKET_DIGEST_DOMAIN,
    packetId: packet.packetId,
    packetManifestDigest: packet.packetManifestDigest,
    receiptDigest: createHash("sha256")
      .update(`synthetic-no-person-receipt:${receiptKind}:${index}`)
      .digest("hex"),
    receiptId: `vedic-receipt/${index.toString(16).padStart(32, "0")}`,
    receiptKind
  };
}

async function preSnapshotManifestCandidate(
  overrides: Partial<VedicPreSnapshotEvidenceManifestCandidate> = {}
): Promise<VedicPreSnapshotEvidenceManifestCandidate> {
  const packet = await parseCanonicalVedicGovernancePacket(await packetBytes());
  const receiptReferences: VedicPreSnapshotReceiptReferenceCandidate[] = [];
  let index = 1;
  for (const [receiptKind, count] of Object.entries(
    VEDIC_PRE_SNAPSHOT_DEFINED_RECEIPT_CARDINALITIES
  )) {
    for (let occurrence = 0; occurrence < count; occurrence += 1) {
      receiptReferences.push(receiptReference(packet, receiptKind, index));
      index += 1;
    }
  }
  receiptReferences.push(
    receiptReference(packet, "legal_authority_disposition_receipt", index)
  );
  return {
    admissionCycleId: packet.admissionCycleId,
    declaredManifestDigestDomain: VEDIC_PRE_SNAPSHOT_DECLARED_DIGEST_DOMAIN,
    manifestId: VEDIC_PRE_SNAPSHOT_MANIFEST_ID,
    packetDigest: packet.packetDigest,
    packetDigestDomain: VEDIC_PACKET_DIGEST_DOMAIN,
    packetId: packet.packetId,
    packetManifestDigest: packet.packetManifestDigest,
    receiptReferences,
    revocationObservation: {
      activeCorrectionReceiptIds: [],
      activeRevocationReceiptIds: [],
      activeWithdrawalReceiptIds: [],
      revocationLedgerHeadDigest: SHA_C
    },
    schemaVersion: VEDIC_PRE_SNAPSHOT_MANIFEST_CANDIDATE_SCHEMA_VERSION,
    ...overrides
  };
}

function sealRequest(
  overrides: Partial<VedicKernelTransitionRequest> = {}
): VedicKernelTransitionRequest {
  const base = request();
  return {
    ...base,
    currentState: {
      ...base.currentState,
      stateId: "packet_frozen_receipts_incomplete"
    },
    transitionId: "seal_pre_snapshot_evidence_manifest",
    ...overrides
  };
}

function parseMutable(bytes: Uint8Array): Record<string, any> {
  return JSON.parse(DECODER.decode(bytes)) as Record<string, any>;
}

function canonicalBytes(value: unknown): Uint8Array {
  return ENCODER.encode(canonicalizeKernelJson(value));
}

async function resignOuterPacket(packet: Record<string, any>): Promise<Uint8Array> {
  const { packetDigest: _old, ...projection } = packet;
  packet.packetDigest = await domainSeparatedDigest(VEDIC_PACKET_DIGEST_DOMAIN, projection);
  return canonicalBytes(packet);
}

function expectNoMutation(result: Awaited<ReturnType<typeof evaluateVedicInputAdmissionTransition>>): void {
  expect(result.outcome).toBe("transition_rejection_receipt");
  if (result.outcome !== "transition_rejection_receipt") throw new Error("expected rejection");
  expect(result.afterEpoch).toBe(result.beforeEpoch);
  expect(result.stateAfter).toBe(result.stateBefore);
  expect(result.nextStateDigest).toBe(result.previousStateDigest);
  expect(result.nextChainHeadDigest).toBe(result.previousChainHeadDigest);
  expect(result.nextRevocationLedgerHeadDigest).toBe(result.previousRevocationLedgerHeadDigest);
  expect(result.nextConsumedNonceSetHeadDigest).toBe(result.previousConsumedNonceSetHeadDigest);
  expect(result.nonceConsumed).toBe(false);
  expect(result.commitObserved).toBe(false);
  expect(result.mutationEpochRuntimeEstablished).toBe(false);
  expect(result.acceptedReceipt).toBe(false);
  expect(Object.hasOwn(result, "targetReceiptId")).toBe(false);
  expect(result.authorityBoundary).toEqual(VEDIC_AUTHORITY_NONE);
  expect(result).toMatchObject({
    idempotencyKey: request().operation.idempotencyKey,
    ledgerGenerationId: request().operation.ledgerGenerationId,
    operationId: request().operation.operationId
  });
}

describe("canonical Vedic governance packet", () => {
  it("binds the exact 13/26/8 sets, ten review digests, Vedic identity, and fixed upstream digests", async () => {
    const parsed = await parseCanonicalVedicGovernancePacket(await packetBytes());
    expect(parsed.requirementIds).toEqual(VEDIC_REQUIREMENT_IDS);
    expect(parsed.invariantIds).toEqual(VEDIC_INVARIANT_IDS);
    expect(parsed.conditionIds).toEqual(VEDIC_CONDITION_IDS);
    expect(parsed.requirementIds).toHaveLength(13);
    expect(parsed.invariantIds).toHaveLength(26);
    expect(parsed.conditionIds).toHaveLength(8);
    expect(VEDIC_REVIEW_CONTENT_DIGEST_FIELDS).toHaveLength(10);
    for (const field of VEDIC_REVIEW_CONTENT_DIGEST_FIELDS) {
      expect(parsed[field]).toBe(reviewDigests()[field]);
    }
    expect(parsed.upstreamReadinessCandidateDigest).toBe(VEDIC_READINESS_CANDIDATE_DIGEST);
    expect(parsed.transitionContractDigest).toBe(VEDIC_TRANSITION_CONTRACT_DIGEST);
    expect(parsed.systemIdentity).toEqual({
      baziIdentityInherited: false,
      contractSystemId: "vedic",
      independentProductId: null,
      legacyV13IdentityInherited: false,
      migrationId: null,
      migrationIdentityInherited: false,
      productSystemId: "vedic-astrology",
      releaseIdentity: null,
      releaseIdentityInherited: false,
      storageNamespaceClass: "vedic-input-admission-kernel-draft",
      targetSchema: null,
      targetSchemaInherited: false
    });
    expect(parsed.authorityBoundary).toMatchObject({
      candidateInstanceCount: 0,
      digestSemanticOriginVerified: false,
      freeTextFieldCount: 0,
      personalDataFieldCount: 0,
      personDerivedDigestFieldCount: 0,
      privacySourceProvenanceEstablished: false
    });
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.requirementIds)).toBe(true);
  });

  it("rejects missing/extra review digests and hostile review objects", async () => {
    const missing = { ...reviewDigests() } as Record<string, unknown>;
    delete missing.selectedValueSetDigest;
    await expect(createCanonicalVedicGovernancePacket(missing)).rejects.toMatchObject({
      code: "REVIEW_DIGESTS_INVALID"
    });
    await expect(createCanonicalVedicGovernancePacket({ ...reviewDigests(), extraDigest: SHA_E }))
      .rejects.toMatchObject({ code: "REVIEW_DIGESTS_INVALID" });

    const hostile = new Proxy(reviewDigests(), {
      getOwnPropertyDescriptor() {
        throw new Error("hostile");
      }
    });
    await expect(createCanonicalVedicGovernancePacket(hostile)).rejects.toBeInstanceOf(VedicFrozenPacketError);
  });

  it("rejects BOM, fatal UTF-8, noncanonical bytes, duplicate and alias-after-unescape keys", async () => {
    const valid = await packetBytes();
    await expect(parseCanonicalVedicGovernancePacket(new Uint8Array([0xef, 0xbb, 0xbf, ...valid])))
      .rejects.toMatchObject({ code: "PACKET_BOM_FORBIDDEN" });
    await expect(parseCanonicalVedicGovernancePacket(new Uint8Array([0xc3, 0x28])))
      .rejects.toMatchObject({ code: "PACKET_UTF8_INVALID" });
    const noncanonical = DECODER.decode(valid).replace(
      '"packetScope":"system_governance_policy_only_no_person_input_instances"',
      '"packetScope":"\\u0073ystem_governance_policy_only_no_person_input_instances"'
    );
    await expect(parseCanonicalVedicGovernancePacket(ENCODER.encode(noncanonical)))
      .rejects.toMatchObject({ code: "PACKET_NON_CANONICAL" });

    const text = DECODER.decode(valid);
    const duplicate = text.replace(
      /"packetId":"([^"]+)"/u,
      '"packetId":"$1","packetId":"$1"'
    );
    await expect(parseCanonicalVedicGovernancePacket(ENCODER.encode(duplicate)))
      .rejects.toMatchObject({ code: "PACKET_DUPLICATE_KEY" });
    const aliasDuplicate = text.replace(
      /"packetId":"([^"]+)"/u,
      '"\\u0070acketId":"$1","packetId":"$1"'
    );
    await expect(parseCanonicalVedicGovernancePacket(ENCODER.encode(aliasDuplicate)))
      .rejects.toMatchObject({ code: "PACKET_DUPLICATE_KEY" });
  });

  it("rejects oversize before copy, own species hooks, shared buffers, and hostile byte objects", async () => {
    let constructorGetterHits = 0;
    const validWithOwnConstructor = await packetBytes();
    Object.defineProperty(validWithOwnConstructor, "constructor", {
      configurable: true,
      get() {
        constructorGetterHits += 1;
        return class HostileUint8ArraySpecies extends Uint8Array {};
      }
    });
    await expect(parseCanonicalVedicGovernancePacket(validWithOwnConstructor))
      .rejects.toMatchObject({ code: "PACKET_BYTES_OWN_PROPERTY_FORBIDDEN" });
    expect(constructorGetterHits).toBe(0);

    const oversized = new Uint8Array(MAX_VEDIC_GOVERNANCE_PACKET_BYTES + 1);
    Object.defineProperty(oversized, "constructor", {
      configurable: true,
      get() {
        constructorGetterHits += 1;
        throw new Error("oversize input must not reach species lookup");
      }
    });
    await expect(parseCanonicalVedicGovernancePacket(
      oversized
    )).rejects.toMatchObject({ code: "PACKET_TOO_LARGE" });
    expect(constructorGetterHits).toBe(0);

    if (typeof SharedArrayBuffer === "function") {
      const sharedBytes = new Uint8Array(new SharedArrayBuffer(16));
      await expect(parseCanonicalVedicGovernancePacket(sharedBytes))
        .rejects.toMatchObject({ code: "PACKET_SHARED_OR_FOREIGN_BUFFER_FORBIDDEN" });
    }
    await expect(parseCanonicalVedicGovernancePacket(new Uint16Array([1, 2])))
      .rejects.toMatchObject({ code: "PACKET_BYTES_REQUIRED" });
    const hostile = new Proxy({}, {
      getPrototypeOf() {
        throw new Error("hostile");
      }
    });
    await expect(parseCanonicalVedicGovernancePacket(hostile))
      .rejects.toMatchObject({ code: "PACKET_BYTES_REQUIRED" });
  });

  it("rejects partial, extra, nested unknown, PII, person-derived digest, and free-text fields", async () => {
    const valid = await packetBytes();
    const cases: Record<string, any>[] = [];
    const partial = parseMutable(valid);
    delete partial.conditionIds;
    cases.push(partial);
    const extra = parseMutable(valid);
    extra.zzUnknown = false;
    cases.push(extra);
    const nestedUnknown = parseMutable(valid);
    nestedUnknown.authorityBoundary.zzUnknown = false;
    cases.push(nestedUnknown);
    for (const forbiddenKey of ["birthDate", "candidateInputDigest", "freeText"]) {
      const forbidden = parseMutable(valid);
      forbidden[forbiddenKey] = forbiddenKey === "birthDate" ? "2000-01-01" : SHA_A;
      cases.push(forbidden);
    }
    for (const candidate of cases) {
      await expect(parseCanonicalVedicGovernancePacket(canonicalBytes(candidate))).rejects.toBeInstanceOf(
        VedicFrozenPacketError
      );
    }
  });

  it("rejects same-count set substitution, cross-system/v13 inheritance, digest drift, and self-resigning", async () => {
    const valid = await packetBytes();
    const wrongSet = parseMutable(valid);
    wrongSet.requirementIds[0] = "bazi_requirement_with_same_count";
    await expect(parseCanonicalVedicGovernancePacket(await resignOuterPacket(wrongSet)))
      .rejects.toMatchObject({ code: "PACKET_SEMANTIC_MISMATCH" });

    const crossSystem = parseMutable(valid);
    crossSystem.systemIdentity.contractSystemId = "bazi";
    crossSystem.systemIdentity.legacyV13IdentityInherited = true;
    await expect(parseCanonicalVedicGovernancePacket(await resignOuterPacket(crossSystem)))
      .rejects.toMatchObject({ code: "PACKET_SEMANTIC_MISMATCH" });

    const reviewDrift = parseMutable(valid);
    reviewDrift.selectedValueSetDigest = SHA_A;
    await expect(parseCanonicalVedicGovernancePacket(canonicalBytes(reviewDrift)))
      .rejects.toMatchObject({ code: "PACKET_SEMANTIC_MISMATCH" });

    const selfResigned = parseMutable(valid);
    selfResigned.transitionContractDigest = SHA_A;
    await expect(parseCanonicalVedicGovernancePacket(await resignOuterPacket(selfResigned)))
      .rejects.toMatchObject({ code: "PACKET_SEMANTIC_MISMATCH" });
  });
});

describe("seal_pre_snapshot_evidence_manifest fail-closed preflight", () => {
  it("can inspect a complete known-cardinality projection but keeps all four guards red", async () => {
    const manifest = await preSnapshotManifestCandidate();
    const base = request();
    const currentState = {
      ...base.currentState,
      stateId: "packet_frozen_receipts_incomplete" as const
    };
    const report = await inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      currentState,
      manifest
    );
    expect(report.observationClass).toBe("draft_candidate_projection_preflight");
    expect(report.receiptReferenceCount).toBe(49);
    expect(report.knownReceiptKindCounts).toHaveLength(
      VEDIC_PRE_SNAPSHOT_INCLUDED_RECEIPT_KINDS.length
    );
    expect(report.exactKnownCardinalityProjectionMatches).toBe(true);
    expect(report.sameCycleAndPacketProjectionMatches).toBe(true);
    expect(report.receiptReferenceIdsUnique).toBe(true);
    expect(report.includedReceiptKindProjectionOnly).toBe(true);
    expect(report.outputReceiptKindProjectionAbsent).toBe(true);
    expect(report.activeLifecycleReferenceProjectionEmpty).toBe(true);
    expect(report.revocationHeadProjectionMatchesState).toBe(true);
    expect(report.legalAuthorityDispositionReferenceCount).toBe(1);
    expect(report.failedGuardIds).toEqual(VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS);
    expect(report).toMatchObject({
      acceptedReceipt: false,
      authorityEffect: "none",
      candidateManifestClosed: false,
      candidateOnly: true,
      canAdvanceState: false,
      executableReceiptSchemasAvailable: false,
      formalManifestInstanceCreated: false,
      legalAuthorityDispositionCardinalityDefined: false,
      runtimeRevocationRecheckEstablished: false,
      underlyingAcceptedReceiptInstancesVerified: false,
      underlyingReceiptPacketBindingsVerified: false
    });
    expect(report.authorityBoundary).toEqual(VEDIC_AUTHORITY_NONE);
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("keeps legal-authority reference counts 0, 1, or N blocked because cardinality is undefined", async () => {
    const manifest = await preSnapshotManifestCandidate();
    const packet = await parseCanonicalVedicGovernancePacket(await packetBytes());
    const withoutLegal = manifest.receiptReferences.filter(
      (reference) => reference.receiptKind !== "legal_authority_disposition_receipt"
    );
    for (const legalCount of [0, 1, 3]) {
      const legalReferences = Array.from({ length: legalCount }, (_, index) =>
        receiptReference(packet, "legal_authority_disposition_receipt", 400 + index));
      const report = await inspectVedicPreSnapshotEvidenceManifestCandidate(
        await packetBytes(),
        {
          ...request().currentState,
          stateId: "packet_frozen_receipts_incomplete"
        },
        { ...manifest, receiptReferences: [...withoutLegal, ...legalReferences] }
      );
      expect(report.legalAuthorityDispositionReferenceCount).toBe(legalCount);
      expect(report.legalAuthorityDispositionCardinalityDefined).toBe(false);
      expect(report.candidateManifestClosed).toBe(false);
      expect(report.canAdvanceState).toBe(false);
      expect(report.failedGuardIds).toEqual(VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS);
    }
  });

  it("treats entry order as local candidate-digest material, never as a formal manifest identity", async () => {
    const manifest = await preSnapshotManifestCandidate();
    const currentState = {
      ...request().currentState,
      stateId: "packet_frozen_receipts_incomplete" as const
    };
    const forward = await inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      currentState,
      manifest
    );
    const reversed = await inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      currentState,
      { ...manifest, receiptReferences: [...manifest.receiptReferences].reverse() }
    );
    expect(reversed.candidateManifestDigest).not.toBe(forward.candidateManifestDigest);
    for (const report of [forward, reversed]) {
      expect(report.candidateManifestClosed).toBe(false);
      expect(report.formalManifestInstanceCreated).toBe(false);
      expect(report.canAdvanceState).toBe(false);
    }
  });

  it("enforces the local 512-item lifecycle diagnostic limit in parser and schema semantics", async () => {
    const manifest = await preSnapshotManifestCandidate();
    const currentState = {
      ...request().currentState,
      stateId: "packet_frozen_receipts_incomplete" as const
    };
    const lifecycleIds = Array.from({ length: 513 }, (_, index) =>
      `vedic-receipt/${(1000 + index).toString(16).padStart(32, "0")}`);
    const atLimit = await inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      currentState,
      {
        ...manifest,
        revocationObservation: {
          ...manifest.revocationObservation,
          activeCorrectionReceiptIds: lifecycleIds.slice(0, 512)
        }
      }
    );
    expect(atLimit.activeLifecycleReferenceProjectionEmpty).toBe(false);
    expect(atLimit.runtimeRevocationRecheckEstablished).toBe(false);
    await expect(inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      currentState,
      {
        ...manifest,
        revocationObservation: {
          ...manifest.revocationObservation,
          activeCorrectionReceiptIds: lifecycleIds
        }
      }
    )).rejects.toMatchObject({ code: "REQUEST_SCHEMA_INVALID" });
  });

  it("reports projection drift without converting it into receipt or runtime truth", async () => {
    const manifest = await preSnapshotManifestCandidate();
    const baselineReport = await inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      {
        ...request().currentState,
        stateId: "packet_frozen_receipts_incomplete"
      },
      manifest
    );
    const references = manifest.receiptReferences.map((reference) => ({ ...reference }));
    references[0]!.packetId = `vedic-governance-packet/${"f".repeat(64)}`;
    references[1]!.receiptId = references[0]!.receiptId;
    references.splice(2, 1);
    references.push({
      ...references[2]!,
      receiptId: `vedic-receipt/${"f".repeat(32)}`,
      receiptKind: "admission_epoch_snapshot_receipt"
    });
    const report = await inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      {
        ...request().currentState,
        stateId: "packet_frozen_receipts_incomplete"
      },
      {
        ...manifest,
        receiptReferences: references,
        revocationObservation: {
          activeCorrectionReceiptIds: [`vedic-receipt/${"e".repeat(32)}`],
          activeRevocationReceiptIds: [],
          activeWithdrawalReceiptIds: [],
          revocationLedgerHeadDigest: SHA_E
        }
      }
    );
    expect(report.sameCycleAndPacketProjectionMatches).toBe(false);
    expect(report.receiptReferenceIdsUnique).toBe(false);
    expect(report.includedReceiptKindProjectionOnly).toBe(false);
    expect(report.outputReceiptKindProjectionAbsent).toBe(false);
    expect(report.exactKnownCardinalityProjectionMatches).toBe(false);
    expect(report.activeLifecycleReferenceProjectionEmpty).toBe(false);
    expect(report.revocationHeadProjectionMatchesState).toBe(false);
    expect(report.candidateManifestDigest).not.toBe(baselineReport.candidateManifestDigest);
    expect(report.candidateManifestClosed).toBe(false);
    expect(report.canAdvanceState).toBe(false);
  });

  it("deterministically rejects seal with the exact four upstream guards and zero mutation", async () => {
    const context = sealRequest();
    const first = await evaluateVedicInputAdmissionTransition(await packetBytes(), context);
    const second = await evaluateVedicInputAdmissionTransition(
      await packetBytes(),
      structuredClone(context)
    );
    expect(second).toEqual(first);
    expectNoMutation(first);
    expect(first).toMatchObject({
      attemptedTransitionId: "seal_pre_snapshot_evidence_manifest",
      failedGuardIds: VEDIC_PRE_SNAPSHOT_MANIFEST_GUARD_IDS,
      rejectionCode: "PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED"
    });
  });

  it("keeps from-state, replay, and overflow rejection semantics distinct and mutation-free", async () => {
    const base = request();
    const wrongState = await evaluateVedicInputAdmissionTransition(
      await packetBytes(),
      sealRequest({
        currentState: {
          ...base.currentState,
          stateId: "uninstantiated"
        }
      })
    );
    expectNoMutation(wrongState);
    expect(wrongState).toMatchObject({
      failedGuardIds: ["from_state_packet_frozen_receipts_incomplete"],
      rejectionCode: "FROM_STATE_MISMATCH"
    });

    const replay = await evaluateVedicInputAdmissionTransition(
      await packetBytes(),
      sealRequest({
        operation: {
          ...base.operation,
          idempotencyKeyPreviouslyObserved: true,
          operationIdPreviouslyObserved: true,
          operationNoncePreviouslyConsumed: true
        }
      })
    );
    expectNoMutation(replay);
    expect(replay).toMatchObject({
      failedGuardIds: [
        "operation_id_not_previously_observed",
        "idempotency_key_not_previously_observed",
        "operation_nonce_not_previously_consumed"
      ],
      rejectionCode: "REPLAY_OR_IDEMPOTENCY_CONFLICT"
    });

    const overflow = await evaluateVedicInputAdmissionTransition(
      await packetBytes(),
      sealRequest({
        currentState: {
          ...base.currentState,
          mutationEpoch: Number.MAX_SAFE_INTEGER,
          stateId: "packet_frozen_receipts_incomplete"
        }
      })
    );
    expectNoMutation(overflow);
    expect(overflow).toMatchObject({
      failedGuardIds: ["after_epoch_must_equal_before_plus_one"],
      rejectionCode: "EPOCH_OVERFLOW"
    });
  });

  it("keeps diagnostic manifest parsing separate from the transition request", async () => {
    const manifest = await preSnapshotManifestCandidate();
    const currentState = {
      ...request().currentState,
      stateId: "packet_frozen_receipts_incomplete" as const
    };
    const missing = structuredClone(manifest) as any;
    delete missing.declaredManifestDigestDomain;
    await expect(inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      currentState,
      missing
    )).rejects.toMatchObject({ code: "REQUEST_SCHEMA_INVALID" });

    const extra = structuredClone(manifest) as any;
    extra.freeText = "must not enter the candidate projection";
    await expect(inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      currentState,
      extra
    )).rejects.toMatchObject({ code: "REQUEST_SCHEMA_INVALID" });

    const invalidReceiptId = structuredClone(manifest) as any;
    invalidReceiptId.receiptReferences[0].receiptId = "expert-name";
    await expect(inspectVedicPreSnapshotEvidenceManifestCandidate(
      await packetBytes(),
      currentState,
      invalidReceiptId
    )).rejects.toMatchObject({ code: "REQUEST_SCHEMA_INVALID" });

    await expect(evaluateVedicInputAdmissionTransition(
      await packetBytes(),
      { ...sealRequest(), preSnapshotEvidenceManifest: manifest }
    )).rejects.toMatchObject({ code: "REQUEST_SCHEMA_INVALID" });
  });
});

describe("freeze_packet transition candidate", () => {
  it("creates only an uncommitted, unaccepted, authority-none candidate with deterministic proposed heads", async () => {
    const result = await evaluateVedicInputAdmissionTransition(await packetBytes(), request());
    expect(result.outcome).toBe("draft_transition_candidate");
    if (result.outcome !== "draft_transition_candidate") throw new Error("expected candidate");
    expect(result).toMatchObject({
      acceptedReceipt: false,
      afterEpoch: 1,
      authorityEffect: "none",
      beforeEpoch: 0,
      commitObserved: false,
      fromState: "uninstantiated",
      mutationEpochRuntimeEstablished: false,
      toState: "packet_frozen_receipts_incomplete",
      transitionId: "freeze_packet"
    });
    expect(result.authorityBoundary).toEqual(VEDIC_AUTHORITY_NONE);
    expect(result.candidateReceipt).toMatchObject({
      acceptedReceipt: false,
      candidateOnly: true,
      commitObserved: false,
      mutationEpochRuntimeEstablished: false,
      receiptKind: "frozen_packet_receipt",
      receiptStatus: "draft_candidate_not_issued_not_accepted"
    });
    expect(result.nextStateDigest).not.toBe(result.previousStateDigest);
    expect(result.nextChainHeadDigest).not.toBe(result.previousChainHeadDigest);
    expect(result.nextConsumedNonceSetHeadDigest).not.toBe(result.previousConsumedNonceSetHeadDigest);
    expect(result.nextRevocationLedgerHeadDigest).toBe(result.previousRevocationLedgerHeadDigest);
    expect(Object.hasOwn(result, "targetReceiptId")).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.packet)).toBe(true);
  });

  it("is deterministic and repeated uncommitted evaluation is idempotent", async () => {
    const bytes = await packetBytes();
    const context = request();
    const first = await evaluateVedicInputAdmissionTransition(bytes, context);
    const second = await evaluateVedicInputAdmissionTransition(bytes, structuredClone(context));
    expect(second).toEqual(first);
  });

  it.each([
    "operationIdPreviouslyObserved",
    "idempotencyKeyPreviouslyObserved",
    "operationNoncePreviouslyConsumed"
  ] as const)("rejects replay/idempotency marker %s without mutation", async (field) => {
    const base = request();
    const replay = request({ operation: { ...base.operation, [field]: true } });
    const result = await evaluateVedicInputAdmissionTransition(await packetBytes(), replay);
    expectNoMutation(result);
    expect(result).toMatchObject({ rejectionCode: "REPLAY_OR_IDEMPOTENCY_CONFLICT" });
  });

  it("rejects epoch overflow without mutation", async () => {
    const base = request();
    const result = await evaluateVedicInputAdmissionTransition(await packetBytes(), request({
      currentState: { ...base.currentState, mutationEpoch: Number.MAX_SAFE_INTEGER }
    }));
    expectNoMutation(result);
    expect(result).toMatchObject({ rejectionCode: "EPOCH_OVERFLOW" });
  });

  it("rejects each still-unimplemented transition and unknown transition without mutation", async () => {
    for (const transitionId of [
      "verify_conditions_1_to_7",
      "verify_supersession_projection",
      "invalidate",
      "future_unknown_transition"
    ]) {
      const result = await evaluateVedicInputAdmissionTransition(await packetBytes(), request({ transitionId }));
      expectNoMutation(result);
      expect(result).toMatchObject({
        rejectionCode: transitionId === "future_unknown_transition"
          ? "UNKNOWN_TRANSITION"
          : "TRANSITION_NOT_IMPLEMENTED"
      });
    }
  });

  it("binds rejection identity to packet, ledger generation, operation, and idempotency identities", async () => {
    const bytes = await packetBytes();
    const first = await evaluateVedicInputAdmissionTransition(bytes, request({ transitionId: "invalidate" }));
    const base = request();
    expect(first.outcome).toBe("transition_rejection_receipt");
    if (first.outcome !== "transition_rejection_receipt") throw new Error("expected rejection");
    expect(first).toMatchObject({
      packetDigest: (await parseCanonicalVedicGovernancePacket(bytes)).packetDigest,
      packetDigestDomain: VEDIC_PACKET_DIGEST_DOMAIN,
      packetSchemaVersion: "hakimi.vedic-input-governance-packet/0.1-draft"
    });
    for (const changedIdentity of [
      { ledgerGenerationId: `vedic-ledger-generation/${"5".repeat(64)}` },
      { operationId: `vedic-operation/${"6".repeat(64)}` },
      { idempotencyKey: `vedic-idempotency/${"7".repeat(64)}` }
    ]) {
      const changed = await evaluateVedicInputAdmissionTransition(bytes, request({
        operation: { ...base.operation, ...changedIdentity },
        transitionId: "invalidate"
      }));
      expect(changed.outcome).toBe("transition_rejection_receipt");
      if (changed.outcome !== "transition_rejection_receipt") throw new Error("expected rejection");
      expect(changed.receiptDigest).not.toBe(first.receiptDigest);
      expect(changed).toMatchObject(changedIdentity);
    }
    const alternatePacketBytes = await createCanonicalVedicGovernancePacket({
      ...reviewDigests(),
      selectedValueSetDigest: SHA_E
    });
    const alternatePacket = await evaluateVedicInputAdmissionTransition(
      alternatePacketBytes,
      request({ transitionId: "invalidate" })
    );
    expect(alternatePacket.outcome).toBe("transition_rejection_receipt");
    if (alternatePacket.outcome !== "transition_rejection_receipt") {
      throw new Error("expected rejection");
    }
    expect(alternatePacket.packetDigest).not.toBe(first.packetDigest);
    expect(alternatePacket.receiptDigest).not.toBe(first.receiptDigest);
  });

  it("rejects freeze_packet from any non-uninstantiated state without mutation", async () => {
    const base = request();
    const result = await evaluateVedicInputAdmissionTransition(await packetBytes(), request({
      currentState: {
        ...base.currentState,
        stateId: "packet_frozen_receipts_incomplete"
      }
    }));
    expectNoMutation(result);
    expect(result).toMatchObject({ rejectionCode: "FROM_STATE_MISMATCH" });
  });

  it("rejects partial/extra/unknown, cross-system operation identities, hostile objects, and typed-array requests", async () => {
    const validBytes = await packetBytes();
    const partial = structuredClone(request()) as any;
    delete partial.currentState.stateDigest;
    await expect(evaluateVedicInputAdmissionTransition(validBytes, partial))
      .rejects.toBeInstanceOf(VedicAdmissionKernelError);

    const extra = { ...request(), unknown: false };
    await expect(evaluateVedicInputAdmissionTransition(validBytes, extra))
      .rejects.toMatchObject({ code: "REQUEST_SCHEMA_INVALID" });

    const crossSystem = structuredClone(request()) as any;
    crossSystem.operation.ledgerGenerationId = `bazi-ledger-generation/${SHA_A}`;
    await expect(evaluateVedicInputAdmissionTransition(validBytes, crossSystem))
      .rejects.toMatchObject({ code: "REQUEST_SCHEMA_INVALID" });

    const hostile = new Proxy(request(), {
      ownKeys() {
        throw new Error("hostile");
      }
    });
    await expect(evaluateVedicInputAdmissionTransition(validBytes, hostile))
      .rejects.toMatchObject({ code: "REQUEST_VALUE_INVALID" });
    await expect(evaluateVedicInputAdmissionTransition(validBytes, new Uint8Array([1, 2, 3])))
      .rejects.toMatchObject({ code: "REQUEST_VALUE_INVALID" });
  });
});
