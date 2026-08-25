import { describe, expect, it } from "vitest";
import {
  citationTargetKeys,
  type CitationRecord,
  type KnowledgeDocumentRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import {
  EVIDENCE_SUBJECTS,
  KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_STATEMENT,
  buildKnowledgeCitationSetConflictInventory,
  buildKnowledgeCitationSetPairReviewAssertion,
  buildKnowledgeContentSnapshot,
  buildKnowledgeSourceAwareRetrievalPacket,
  validateKnowledgeCitationSetPairReviewAssertion,
  type BuildKnowledgeCitationSetPairReviewAssertionInput,
  type BuildKnowledgeSourceAwareRetrievalPacketInput,
  type KnowledgeCitationSetConflictInventory,
  type KnowledgeCitationSetPairObservation,
  type KnowledgeCitationSetPairReviewAssertion
} from "./index";

type MutablePairAssertion = {
  -readonly [Key in keyof BuildKnowledgeCitationSetPairReviewAssertionInput["pairAssertions"][number]]:
    BuildKnowledgeCitationSetPairReviewAssertionInput["pairAssertions"][number][Key];
};

type MutableAssertionInput = Omit<
  BuildKnowledgeCitationSetPairReviewAssertionInput,
  "pairAssertions"
> & {
  pairAssertions: MutablePairAssertion[];
};

const timestamp = "2026-08-24T00:00:00.000Z";
const assertedReviewedAt = "2026-08-24T00:10:00.000Z";
const subject = EVIDENCE_SUBJECTS.find((value) => value.fieldPaths.includes("pillars.day.hiddenStems"))!;
const target = { kind: "evidence_subject" as const, subjectId: subject.subjectId };

async function documentFixture(): Promise<KnowledgeDocumentRecord> {
  const content = ["# 私密来源", "引用范围内原文", "不得复制的来源全文秘密"].join("\n");
  const snapshot = await buildKnowledgeContentSnapshot(content, "markdown");
  return {
    schemaVersion: "1.0.0",
    id: "30000000-0000-4000-8000-000000000001",
    recordType: "user_knowledge_document",
    title: "私密资料标题不得进入断言",
    author: "私密作者不得进入断言",
    edition: "私密版次不得进入断言",
    sourceNote: "私密来源备注不得进入断言",
    fileName: "private-source.md",
    format: "markdown",
    byteSize: new TextEncoder().encode(content).byteLength,
    ...snapshot,
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function citationFixture(
  index: number,
  document: KnowledgeDocumentRecord,
  status: CitationRecord["status"]
): CitationRecord {
  return {
    schemaVersion: "1.0.0",
    id: `50000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
    documentId: document.id,
    documentContentHash: document.contentHash,
    locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
    quote: "引用范围内原文",
    annotation: "私密批注不得进入断言",
    targets: [target],
    targetKeys: citationTargetKeys([target]),
    status,
    reviewAttestations: status === "verified"
      ? [
          { reviewerId: "source-reviewer-a", reviewedAt: timestamp, note: "来源复核备注不得进入断言" },
          { reviewerId: "source-reviewer-b", reviewedAt: timestamp, note: "第二来源复核备注不得进入断言" }
        ]
      : [],
    decisionNote: status === "user_candidate" ? "" : "来源裁定说明不得进入断言",
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function rightsFixture(document: KnowledgeDocumentRecord): SourceRightsRecord {
  return {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId: document.id,
    documentContentHash: document.contentHash,
    origin: "user_import",
    source: {
      sourceUrl: "https://example.com/private?token=must-not-leak",
      publisher: "私密出版社不得进入断言",
      publicationYear: null,
      acquiredAt: timestamp
    },
    rights: {
      status: "user_unverified",
      workStatus: "unknown",
      editionStatus: "unknown",
      basis: "user_declaration",
      jurisdiction: null,
      licenseId: null,
      copyrightNotice: "版权备注不得进入断言",
      evidenceRefs: [],
      distributionPolicy: "local_private_only"
    },
    review: { status: "unreviewed", attestations: [], note: "权利复核备注不得进入断言" },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

async function contextForStatuses(statuses: readonly CitationRecord["status"][]) {
  const document = await documentFixture();
  const citations = statuses.map((status, index) => citationFixture(index, document, status));
  const input: BuildKnowledgeSourceAwareRetrievalPacketInput = {
    evidenceSubjectId: subject.subjectId,
    useMode: "local_review",
    documents: [document],
    citations: [...citations].reverse(),
    sourceRights: [rightsFixture(document)]
  };
  const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
  const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);
  return { document, citations, input, packet, inventory };
}

function assertionInputFor(
  inventory: KnowledgeCitationSetConflictInventory,
  observationAt: (index: number) => KnowledgeCitationSetPairObservation = () =>
    "no_direct_tension_observed_in_bound_quotes"
): BuildKnowledgeCitationSetPairReviewAssertionInput {
  return {
    reviewer: {
      identityRecordRef: `sha256:${"a".repeat(64)}`,
      statement: KNOWLEDGE_CITATION_SET_PAIR_REVIEW_ASSERTION_STATEMENT,
      assertedReviewedAt
    },
    pairAssertions: inventory.pairs.map((pair, index) => ({
      order: pair.order,
      citationIds: [pair.citationIds[0], pair.citationIds[1]],
      itemDigests: [pair.itemDigests[0], pair.itemDigests[1]],
      observation: observationAt(index)
    }))
  };
}

describe("citation-set single-reviewer pair review assertion v0.1", () => {
  it("builds deterministically, validates by rebuild, deep-freezes, and keeps all authority gates closed", async () => {
    const context = await contextForStatuses(["verified", "verified"]);
    const input = assertionInputFor(context.inventory);
    const first = await buildKnowledgeCitationSetPairReviewAssertion(
      input,
      context.inventory,
      context.packet,
      context.input
    );
    const second = await buildKnowledgeCitationSetPairReviewAssertion(
      structuredClone(input),
      context.inventory,
      context.packet,
      context.input
    );

    expect(second).toEqual(first);
    expect(first.integrity.recordSha256).toBe(second.integrity.recordSha256);
    expect(first.binding).toMatchObject({
      evidenceSubjectId: subject.subjectId,
      registryVersion: subject.registryVersion,
      targetKey: context.inventory.binding.targetKey,
      retrievalUseMode: "local_review",
      packetPayloadSha256: context.packet.integrity.payloadSha256,
      matchingSourceSetSha256: context.packet.sourceSet.matchingSourceSetSha256,
      inventoryPayloadSha256: context.inventory.integrity.payloadSha256,
      inventoryPairCount: 1
    });
    expect(first.boundary).toMatchObject({
      allInventoryPairsAddressedByAssertions: true,
      reviewerIdentityBasis: "self_declared_not_verified",
      reviewerIdentityVerified: false,
      assertedReviewedAtVerified: false,
      digitalSignaturePresent: false,
      digitalSignatureVerified: false,
      digestIsDigitalSignature: false,
      authenticityClaimed: false,
      humanReviewAuthenticityVerified: false,
      automatedConflictDetectionPerformed: false,
      citationSetConflictReviewPerformed: false,
      citationSetConflictStatus: "unassessed",
      semanticConflictResolutionPerformed: false,
      winnerSelectionPerformed: false,
      consensusClaimed: false,
      sourceTextFieldsCopied: false,
      freeformReviewerTextAccepted: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      chartApplicabilityAssessed: false,
      mutationEpochRevalidationPerformed: false,
      publicExportAuthorized: false,
      externalProviderUseAuthorized: false,
      downstreamExternalUseGate: "blocked",
      networkTransmissionPerformed: false,
      packetMutationPerformed: false,
      storageMutationPerformed: false,
      chartMutationPerformed: false,
      result: null
    });
    expect(first.integrity).toMatchObject({
      hashAlgorithm: "SHA-256",
      digestIsDigitalSignature: false,
      authenticityClaimed: false
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.binding)).toBe(true);
    expect(Object.isFrozen(first.pairAssertions)).toBe(true);
    expect(Object.isFrozen(first.pairAssertions[0]!.citationIds)).toBe(true);
    await expect(validateKnowledgeCitationSetPairReviewAssertion(
      first,
      context.inventory,
      context.packet,
      context.input
    )).resolves.toEqual(first);
  });

  it("counts all four neutral observations without changing the unassessed status", async () => {
    const context = await contextForStatuses(["verified", "verified", "verified", "verified"]);
    const observations: KnowledgeCitationSetPairObservation[] = [
      "no_direct_tension_observed_in_bound_quotes",
      "potential_tension_observed_in_bound_quotes",
      "not_directly_comparable_in_bound_scope",
      "insufficient_bound_context"
    ];
    const record = await buildKnowledgeCitationSetPairReviewAssertion(
      assertionInputFor(context.inventory, (index) => observations[index % observations.length]!),
      context.inventory,
      context.packet,
      context.input
    );

    expect(record.observationCounts).toEqual({
      totalPairAssertions: 6,
      noDirectTensionObservedInBoundQuotes: 2,
      potentialTensionObservedInBoundQuotes: 2,
      notDirectlyComparableInBoundScope: 1,
      insufficientBoundContext: 1
    });
    expect(record.boundary.citationSetConflictStatus).toBe("unassessed");
    expect(record.boundary.semanticConflictResolutionPerformed).toBe(false);
  });

  it("rejects candidate, rejected, and zero-pair inventories after full upstream validation", async () => {
    const candidate = await contextForStatuses(["verified", "verified", "user_candidate"]);
    await expect(buildKnowledgeCitationSetPairReviewAssertion(
      assertionInputFor(candidate.inventory),
      candidate.inventory,
      candidate.packet,
      candidate.input
    )).rejects.toMatchObject({ code: "CANDIDATE_CITATIONS_PRESENT" });

    const rejected = await contextForStatuses(["verified", "verified", "rejected"]);
    await expect(buildKnowledgeCitationSetPairReviewAssertion(
      assertionInputFor(rejected.inventory),
      rejected.inventory,
      rejected.packet,
      rejected.input
    )).rejects.toMatchObject({ code: "REJECTED_CITATIONS_PRESENT" });

    const single = await contextForStatuses(["verified"]);
    await expect(buildKnowledgeCitationSetPairReviewAssertion(
      assertionInputFor(single.inventory),
      single.inventory,
      single.packet,
      single.input
    )).rejects.toMatchObject({ code: "PAIR_ASSERTIONS_REQUIRED" });
  });

  it("rejects omission, duplication, addition, reordering, and pair binding changes", async () => {
    const context = await contextForStatuses(["verified", "verified", "verified"]);
    const base = structuredClone(assertionInputFor(context.inventory));
    const first = structuredClone(base.pairAssertions[0]!);
    const variants = [
      { ...base, pairAssertions: base.pairAssertions.slice(0, -1) },
      { ...base, pairAssertions: [first, first, structuredClone(base.pairAssertions[2]!)] },
      { ...base, pairAssertions: [...base.pairAssertions, first] },
      { ...base, pairAssertions: [...base.pairAssertions].reverse() },
      {
        ...base,
        pairAssertions: base.pairAssertions.map((pair, index) => index === 0
          ? { ...pair, itemDigests: ["0".repeat(64), pair.itemDigests[1]] as [string, string] }
          : pair)
      }
    ];

    for (const variant of variants) {
      await expect(buildKnowledgeCitationSetPairReviewAssertion(
        variant,
        context.inventory,
        context.packet,
        context.input
      )).rejects.toMatchObject({ code: "PAIR_COVERAGE_MISMATCH" });
    }
  });

  it("rejects record binding tampering and stale assertion replay against a newer inventory", async () => {
    const context = await contextForStatuses(["verified", "verified"]);
    const record = await buildKnowledgeCitationSetPairReviewAssertion(
      assertionInputFor(context.inventory),
      context.inventory,
      context.packet,
      context.input
    );
    const tampered = structuredClone(record) as KnowledgeCitationSetPairReviewAssertion;
    (tampered.binding as { packetPayloadSha256: string }).packetPayloadSha256 = "0".repeat(64);
    await expect(validateKnowledgeCitationSetPairReviewAssertion(
      tampered,
      context.inventory,
      context.packet,
      context.input
    )).rejects.toThrow(/规范重建不一致/u);

    const updatedRights = {
      ...context.input.sourceRights[0]!,
      editVersion: 2,
      updatedAt: "2026-08-24T00:01:00.000Z"
    };
    const updatedInput = { ...context.input, sourceRights: [updatedRights] };
    const updatedPacket = await buildKnowledgeSourceAwareRetrievalPacket(updatedInput);
    const updatedInventory = await buildKnowledgeCitationSetConflictInventory(updatedPacket, updatedInput);
    expect(updatedInventory.integrity.payloadSha256).not.toBe(context.inventory.integrity.payloadSha256);
    await expect(validateKnowledgeCitationSetPairReviewAssertion(
      record,
      updatedInventory,
      updatedPacket,
      updatedInput
    )).rejects.toMatchObject({ code: "PAIR_COVERAGE_MISMATCH" });
  });

  it("snapshots builder input and validator record before their first await", async () => {
    const context = await contextForStatuses(["verified", "verified"]);
    const mutableInput = structuredClone(
      assertionInputFor(context.inventory)
    ) as unknown as MutableAssertionInput;
    const originalObservation = mutableInput.pairAssertions[0]!.observation;
    const buildPromise = buildKnowledgeCitationSetPairReviewAssertion(
      mutableInput,
      context.inventory,
      context.packet,
      context.input
    );
    mutableInput.pairAssertions[0]!.observation = "potential_tension_observed_in_bound_quotes";
    const record = await buildPromise;
    expect(record.pairAssertions[0]!.observation).toBe(originalObservation);

    const mutableRecord = structuredClone(record) as KnowledgeCitationSetPairReviewAssertion;
    const validationPromise = validateKnowledgeCitationSetPairReviewAssertion(
      mutableRecord,
      context.inventory,
      context.packet,
      context.input
    );
    (mutableRecord.reviewer as { identityRecordRef: string }).identityRecordRef = `sha256:${"b".repeat(64)}`;
    const validated = await validationPromise;
    expect(validated.reviewer.identityRecordRef).toBe(`sha256:${"a".repeat(64)}`);
  });

  it("rejects accessors without invoking them and rejects oversized input before cloning", async () => {
    const context = await contextForStatuses(["verified", "verified"]);
    let invoked = false;
    const accessorInput = structuredClone(
      assertionInputFor(context.inventory)
    ) as unknown as Record<string, unknown>;
    Object.defineProperty(accessorInput, "note", {
      enumerable: true,
      get() {
        invoked = true;
        return "不得执行";
      }
    });
    await expect(buildKnowledgeCitationSetPairReviewAssertion(
      accessorInput,
      context.inventory,
      context.packet,
      context.input
    )).rejects.toMatchObject({ code: "INVALID_ASSERTION_INPUT" });
    expect(invoked).toBe(false);

    const record = await buildKnowledgeCitationSetPairReviewAssertion(
      assertionInputFor(context.inventory),
      context.inventory,
      context.packet,
      context.input
    );
    const accessorRecord = structuredClone(record) as unknown as Record<string, unknown>;
    Object.defineProperty(accessorRecord, "winnerCitationId", {
      enumerable: true,
      get() {
        invoked = true;
        return "不得执行";
      }
    });
    await expect(validateKnowledgeCitationSetPairReviewAssertion(
      accessorRecord,
      context.inventory,
      context.packet,
      context.input
    )).rejects.toMatchObject({ code: "INVALID_ASSERTION_INPUT" });
    expect(invoked).toBe(false);

    const oversized = {
      reviewer: structuredClone(assertionInputFor(context.inventory).reviewer),
      pairAssertions: new Array(2_017).fill(null)
    };
    await expect(buildKnowledgeCitationSetPairReviewAssertion(
      oversized,
      null,
      null,
      context.input
    )).rejects.toMatchObject({ code: "ASSERTION_INPUT_LIMIT_EXCEEDED" });

    await expect(validateKnowledgeCitationSetPairReviewAssertion(
      new Array(50_001).fill(null),
      context.inventory,
      context.packet,
      context.input
    )).rejects.toMatchObject({ code: "ASSERTION_INPUT_LIMIT_EXCEEDED" });
  });

  it("rejects unknown authority fields and all source or reviewer free-text extensions", async () => {
    const context = await contextForStatuses(["verified", "verified"]);
    const base = structuredClone(assertionInputFor(context.inventory)) as unknown as Record<string, unknown>;
    for (const key of ["winner", "preferred", "accepted", "ranking", "score", "confidence"]) {
      await expect(buildKnowledgeCitationSetPairReviewAssertion(
        { ...base, [key]: "forbidden" },
        context.inventory,
        context.packet,
        context.input
      )).rejects.toMatchObject({ code: "INVALID_ASSERTION_INPUT" });
    }

    for (const key of ["reviewerId", "note", "displayName", "specialty", "reviewNote"]) {
      const reviewer = { ...(base.reviewer as Record<string, unknown>), [key]: "forbidden" };
      await expect(buildKnowledgeCitationSetPairReviewAssertion(
        { ...base, reviewer },
        context.inventory,
        context.packet,
        context.input
      )).rejects.toMatchObject({ code: "INVALID_ASSERTION_INPUT" });
    }

    for (const key of ["sourceText", "annotation", "decisionNote", "sourceUrl", "reviewNote"]) {
      const pairAssertions = structuredClone(
        base.pairAssertions as readonly Record<string, unknown>[]
      ) as Record<string, unknown>[];
      pairAssertions[0] = { ...pairAssertions[0], [key]: "forbidden" };
      await expect(buildKnowledgeCitationSetPairReviewAssertion(
        { ...base, pairAssertions },
        context.inventory,
        context.packet,
        context.input
      )).rejects.toMatchObject({ code: "INVALID_ASSERTION_INPUT" });
    }
  });

  it("rejects unknown output fields and emits no source text, URL, annotations, or reviewer notes", async () => {
    const context = await contextForStatuses(["verified", "verified"]);
    const record = await buildKnowledgeCitationSetPairReviewAssertion(
      assertionInputFor(context.inventory),
      context.inventory,
      context.packet,
      context.input
    );
    const unknown = structuredClone(record) as unknown as Record<string, unknown>;
    unknown.preferredCitationId = context.citations[0]!.id;
    await expect(validateKnowledgeCitationSetPairReviewAssertion(
      unknown,
      context.inventory,
      context.packet,
      context.input
    )).rejects.toMatchObject({ code: "INVALID_ASSERTION_INPUT" });

    expect(Object.keys(record.reviewer)).toEqual([
      "identityRecordRef",
      "statement",
      "assertedReviewedAt"
    ]);
    const serialized = JSON.stringify(record);
    for (const forbidden of [
      "引用范围内原文",
      "不得复制的来源全文秘密",
      "私密资料标题不得进入断言",
      "私密作者不得进入断言",
      "私密来源备注不得进入断言",
      "私密批注不得进入断言",
      "来源复核备注不得进入断言",
      "来源裁定说明不得进入断言",
      "token=must-not-leak",
      "版权备注不得进入断言",
      '"note"',
      '"sourceUrl"',
      '"annotation"',
      '"decisionNote"'
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("covers the 64-citation ceiling with 2016 sequentially hashed pair assertions", async () => {
    const context = await contextForStatuses(Array.from({ length: 64 }, () => "verified" as const));
    const record = await buildKnowledgeCitationSetPairReviewAssertion(
      assertionInputFor(context.inventory, (index) => index % 2 === 0
        ? "no_direct_tension_observed_in_bound_quotes"
        : "insufficient_bound_context"),
      context.inventory,
      context.packet,
      context.input
    );

    expect(record.binding.inventoryPairCount).toBe(2_016);
    expect(record.pairAssertions).toHaveLength(2_016);
    expect(record.observationCounts).toMatchObject({
      totalPairAssertions: 2_016,
      noDirectTensionObservedInBoundQuotes: 1_008,
      insufficientBoundContext: 1_008
    });
    expect(Object.isFrozen(record.pairAssertions.at(-1))).toBe(true);
  });
});
