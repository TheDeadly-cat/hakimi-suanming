import { describe, expect, it } from "vitest";
import {
  citationTargetKeys,
  type CitationRecord,
  type KnowledgeDocumentRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import {
  EVIDENCE_SUBJECTS,
  buildKnowledgeCitationSetConflictInventory,
  buildKnowledgeContentSnapshot,
  buildKnowledgeSourceAwareRetrievalPacket,
  validateKnowledgeCitationSetConflictInventory,
  type BuildKnowledgeSourceAwareRetrievalPacketInput,
  type KnowledgeCitationSetConflictInventory
} from "./index";

const timestamp = "2026-08-24T00:00:00.000Z";
const subject = EVIDENCE_SUBJECTS.find((value) => value.fieldPaths.includes("pillars.day.hiddenStems"))!;
const target = { kind: "evidence_subject" as const, subjectId: subject.subjectId };

async function documentFixture(options: {
  id: string;
  title: string;
  lines: readonly string[];
}): Promise<KnowledgeDocumentRecord> {
  const content = ["# 来源", ...options.lines, "未引用的私密全文不得进入清单"].join("\n");
  const snapshot = await buildKnowledgeContentSnapshot(content, "markdown");
  return {
    schemaVersion: "1.0.0",
    id: options.id,
    recordType: "user_knowledge_document",
    title: options.title,
    author: "某作者",
    edition: "第一版",
    sourceNote: "私密来源备注不得进入清单",
    fileName: "source.md",
    format: "markdown",
    byteSize: new TextEncoder().encode(content).byteLength,
    ...snapshot,
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function citationFixture(options: {
  id: string;
  document: KnowledgeDocumentRecord;
  startLine: number;
  endLine?: number;
  status: CitationRecord["status"];
}): CitationRecord {
  const endLine = options.endLine ?? options.startLine;
  const quote = options.document.content
    .split("\n")
    .slice(options.startLine - 1, endLine)
    .join("\n");
  return {
    schemaVersion: "1.0.0",
    id: options.id,
    documentId: options.document.id,
    documentContentHash: options.document.contentHash,
    locator: { sectionId: "section-1", startLine: options.startLine, endLine },
    quote,
    annotation: "批注秘密不得进入清单",
    targets: [target],
    targetKeys: citationTargetKeys([target]),
    status: options.status,
    reviewAttestations: options.status === "verified"
      ? [
          { reviewerId: "reviewer-a", reviewedAt: timestamp, note: "复核备注甲不得进入清单" },
          { reviewerId: "reviewer-b", reviewedAt: timestamp, note: "复核备注乙不得进入清单" }
        ]
      : [],
    decisionNote: options.status === "user_candidate" ? "" : "裁定说明不得进入清单",
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function privateRights(document: KnowledgeDocumentRecord): SourceRightsRecord {
  return {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId: document.id,
    documentContentHash: document.contentHash,
    origin: "user_import",
    source: {
      sourceUrl: "https://example.com/private?token=must-not-leak",
      publisher: "",
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
      copyrightNotice: "版权说明不得进入清单",
      evidenceRefs: [],
      distributionPolicy: "local_private_only"
    },
    review: { status: "unreviewed", attestations: [], note: "" },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function inputFor(
  useMode: BuildKnowledgeSourceAwareRetrievalPacketInput["useMode"],
  documents: readonly KnowledgeDocumentRecord[],
  citations: readonly CitationRecord[]
): BuildKnowledgeSourceAwareRetrievalPacketInput {
  return {
    evidenceSubjectId: subject.subjectId,
    useMode,
    documents,
    citations,
    sourceRights: documents.map(privateRights)
  };
}

describe("citation-set conflict inventory v0.1", () => {
  it("keeps zero verified citations blocked while binding the candidate ledger", async () => {
    const document = await documentFixture({
      id: "31111111-1111-4111-8111-111111111111",
      title: "候选资料",
      lines: ["候选原文"]
    });
    const candidate = citationFixture({
      id: "41111111-1111-4111-8111-111111111111",
      document,
      startLine: 2,
      status: "user_candidate"
    });
    const input = inputFor("local_review", [document], [candidate]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);

    expect(inventory.binding.candidateCitationIds).toEqual([candidate.id]);
    expect(inventory.binding.verifiedCitationIds).toEqual([]);
    expect(inventory.counts).toMatchObject({ verifiedCitations: 0, pairs: 0 });
    expect(inventory.reviewGate).toMatchObject({
      status: "blocked_no_verified_citations",
      candidateResolutionRequired: true,
      humanReviewRequired: true,
      citationSetConflictReviewPerformed: false,
      citationSetConflictStatus: "unassessed"
    });
  });

  it("calls one verified citation no-pair review, never no-conflict", async () => {
    const document = await documentFixture({
      id: "32222222-2222-4222-8222-222222222222",
      title: "单条资料",
      lines: ["单条私密原文"]
    });
    const citation = citationFixture({
      id: "42222222-2222-4222-8222-222222222222",
      document,
      startLine: 2,
      status: "verified"
    });
    const input = inputFor("local_review", [document], [citation]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);

    expect(inventory.reviewGate.status).toBe("no_pairwise_review_required");
    expect(inventory.reviewGate.pairwiseComparisonRequired).toBe(false);
    expect(inventory.reviewGate.humanReviewRequired).toBe(false);
    expect(inventory.pairs).toEqual([]);
    expect(inventory.boundary).toMatchObject({
      containsSourceText: false,
      promptInjectionScreeningPerformed: false,
      privacyReviewPerformed: false,
      externalPurposeRightsReviewed: false,
      atomicStorageSnapshotVerified: false,
      mutationEpochRevalidationPerformed: false,
      externalProviderUseAuthorized: false,
      networkTransmissionAuthorized: false,
      publicExportAuthorized: false,
      expertTruthClaimed: false,
      formalActivationAllowed: false
    });
    expect(packet.boundary).toMatchObject({
      citationSetConflictReviewPerformed: false,
      citationSetConflictStatus: "unassessed",
      semanticConflictResolutionPerformed: false
    });
    expect(Object.isFrozen(inventory)).toBe(true);
    expect(Object.isFrozen(inventory.binding.verifiedCitationIds)).toBe(true);
    expect(inventory.binding).toMatchObject({
      evidenceSubjectId: subject.subjectId,
      registryVersion: subject.registryVersion,
      retrievalUseMode: "local_review"
    });
    await expect(validateKnowledgeCitationSetConflictInventory(inventory, packet, input))
      .resolves.toEqual(inventory);
  });

  it("builds every i<j pair in stable code-unit order without inferring semantic conflict", async () => {
    const documentA = await documentFixture({
      id: "33333333-3333-4333-8333-333333333333",
      title: "来源 A",
      lines: ["相反来源甲"]
    });
    const documentB = await documentFixture({
      id: "34444444-4444-4444-8444-444444444444",
      title: "来源 B",
      lines: ["相反来源乙"]
    });
    const citationA = citationFixture({
      id: "4A333333-3333-4333-8333-333333333333",
      document: documentA,
      startLine: 2,
      status: "verified"
    });
    const citationB = citationFixture({
      id: "4a222222-2222-4222-8222-222222222222",
      document: documentB,
      startLine: 2,
      status: "verified"
    });
    const forwardInput = inputFor("local_review", [documentA, documentB], [citationA, citationB]);
    const reverseInput = inputFor("local_review", [documentB, documentA], [citationB, citationA]);
    const forwardPacket = await buildKnowledgeSourceAwareRetrievalPacket(forwardInput);
    const reversePacket = await buildKnowledgeSourceAwareRetrievalPacket(reverseInput);
    const forward = await buildKnowledgeCitationSetConflictInventory(forwardPacket, forwardInput);
    const reverse = await buildKnowledgeCitationSetConflictInventory(reversePacket, reverseInput);

    expect(forward.integrity.payloadSha256).toBe(reverse.integrity.payloadSha256);
    expect(forward.binding.verifiedCitationIds).toEqual([citationA.id, citationB.id]);
    expect(forward.counts).toMatchObject({ verifiedCitations: 2, distinctDocuments: 2, pairs: 1 });
    expect(forward.pairs).toEqual([expect.objectContaining({
      order: 1,
      citationIds: [citationA.id, citationB.id],
      sameDocumentId: false,
      locatorRelation: "different_documents",
      exactQuoteRelation: "code_unit_different",
      semanticRelationshipAssessed: false
    })]);
    expect(forward.reviewGate).toMatchObject({
      status: "pending_human_review",
      pairwiseComparisonRequired: true,
      humanReviewRequired: true,
      automatedConflictDetectionPerformed: false,
      semanticConflictResolutionPerformed: false,
      downstreamExternalUseGate: "blocked"
    });
  });

  it("covers the 64-item ceiling with all 2016 pairs inside the output budget", async () => {
    const document = await documentFixture({
      id: "3eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      title: "有界全集资料",
      lines: ["有界全集原文"]
    });
    const citations = Array.from({ length: 64 }, (_, index) => citationFixture({
      id: `50000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
      document,
      startLine: 2,
      status: "verified"
    }));
    const input = inputFor("local_review", [document], [...citations].reverse());
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);

    expect(inventory.counts).toMatchObject({ verifiedCitations: 64, pairs: 2_016 });
    expect(inventory.pairs).toHaveLength(2_016);
    expect(inventory.pairs[0]!.citationIds).toEqual([citations[0]!.id, citations[1]!.id]);
    expect(inventory.pairs.at(-1)!.citationIds).toEqual([citations[62]!.id, citations[63]!.id]);
    expect(inventory.reviewGate).toMatchObject({
      status: "pending_human_review",
      humanReviewRequired: true,
      citationSetConflictReviewPerformed: false
    });
  });

  it("keeps exact-equal same-range citations pending human review", async () => {
    const document = await documentFixture({
      id: "35555555-5555-4555-8555-555555555555",
      title: "同一资料",
      lines: ["逐字相同也不是自动语义裁定"]
    });
    const first = citationFixture({
      id: "45555555-5555-4555-8555-555555555555",
      document,
      startLine: 2,
      status: "verified"
    });
    const second = citationFixture({
      id: "46666666-6666-4666-8666-666666666666",
      document,
      startLine: 2,
      status: "verified"
    });
    const input = inputFor("local_review", [document], [second, first]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);

    expect(inventory.pairs[0]).toMatchObject({
      sameDocumentId: true,
      sameDocumentContentHash: true,
      sameSourceRightsSnapshot: true,
      locatorRelation: "same_range",
      exactQuoteRelation: "code_unit_exact_equal",
      semanticRelationshipAssessed: false
    });
    expect(inventory.reviewGate.status).toBe("pending_human_review");
  });

  it("records overlapping ranges mechanically without calling them conflicts", async () => {
    const document = await documentFixture({
      id: "36666666-6666-4666-8666-666666666666",
      title: "范围资料",
      lines: ["第一行", "共同中间行", "第三行"]
    });
    const first = citationFixture({
      id: "47777777-7777-4777-8777-777777777777",
      document,
      startLine: 2,
      endLine: 3,
      status: "verified"
    });
    const second = citationFixture({
      id: "48888888-8888-4888-8888-888888888888",
      document,
      startLine: 3,
      endLine: 4,
      status: "verified"
    });
    const input = inputFor("local_review", [document], [first, second]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);

    expect(inventory.pairs[0]).toMatchObject({
      locatorRelation: "overlapping_ranges",
      exactQuoteRelation: "code_unit_different",
      semanticRelationshipAssessed: false
    });
  });

  it("names quote equality as code-unit equality when distinct lone surrogates encode to the same UTF-8 bytes", async () => {
    const documentA = await documentFixture({
      id: "36aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "异常 Unicode 资料 A",
      lines: ["\ud800"]
    });
    const documentB = await documentFixture({
      id: "36bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "异常 Unicode 资料 B",
      lines: ["\ud801"]
    });
    const citationA = citationFixture({
      id: "48aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      document: documentA,
      startLine: 2,
      status: "verified"
    });
    const citationB = citationFixture({
      id: "48bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      document: documentB,
      startLine: 2,
      status: "verified"
    });
    expect(citationA.quote).not.toBe(citationB.quote);
    expect(new TextEncoder().encode(citationA.quote)).toEqual(new TextEncoder().encode(citationB.quote));

    const input = inputFor("local_review", [documentA, documentB], [citationA, citationB]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);

    expect(inventory.pairs[0]!.exactQuoteRelation).toBe("code_unit_different");
  });

  it("binds candidate and rejected ledgers without copying their source records", async () => {
    const verifiedDocument = await documentFixture({
      id: "37777777-7777-4777-8777-777777777777",
      title: "已核验资料",
      lines: ["已核验秘密原文"]
    });
    const candidateDocument = await documentFixture({
      id: "38888888-8888-4888-8888-888888888888",
      title: "候选资料",
      lines: ["候选秘密原文"]
    });
    const rejectedDocument = await documentFixture({
      id: "39999999-9999-4999-8999-999999999999",
      title: "拒绝资料",
      lines: ["拒绝秘密原文"]
    });
    const verified = citationFixture({
      id: "49999999-9999-4999-8999-999999999999",
      document: verifiedDocument,
      startLine: 2,
      status: "verified"
    });
    const verifiedSecond = citationFixture({
      id: "49aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      document: verifiedDocument,
      startLine: 2,
      status: "verified"
    });
    const candidate = citationFixture({
      id: "4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      document: candidateDocument,
      startLine: 2,
      status: "user_candidate"
    });
    const rejected = citationFixture({
      id: "4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      document: rejectedDocument,
      startLine: 2,
      status: "rejected"
    });
    const input = inputFor(
      "local_review",
      [rejectedDocument, verifiedDocument, candidateDocument],
      [rejected, candidate, verifiedSecond, verified]
    );
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);
    const serialized = JSON.stringify(inventory);

    expect(inventory.binding).toMatchObject({
      candidateCitationIds: [candidate.id],
      verifiedCitationIds: [verified.id, verifiedSecond.id],
      rejectedCitationIds: [rejected.id]
    });
    expect(inventory.reviewGate).toMatchObject({
      status: "blocked_unreviewed_target_sources",
      humanReviewRequired: true,
      candidateResolutionRequired: true,
      rejectedCitationAcknowledgementRequired: true,
      citationSetConflictReviewPerformed: false
    });
    for (const forbidden of [
      "已核验秘密原文",
      "候选秘密原文",
      "拒绝秘密原文",
      "未引用的私密全文不得进入清单",
      "私密来源备注不得进入清单",
      "批注秘密不得进入清单",
      "裁定说明不得进入清单",
      "token=must-not-leak",
      "复核备注甲不得进入清单",
      "版权说明不得进入清单"
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("rejects external packets even when their records validate", async () => {
    const document = await documentFixture({
      id: "3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "外部候选资料",
      lines: ["外部不得输出"]
    });
    const citation = citationFixture({
      id: "4ccccccc-cccc-4ccc-8ccc-cccccccccccc",
      document,
      startLine: 2,
      status: "verified"
    });
    const input = inputFor("external_context_candidate", [document], [citation]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);

    await expect(buildKnowledgeCitationSetConflictInventory(packet, input)).rejects.toMatchObject({
      code: "LOCAL_REVIEW_ONLY"
    });
  });

  it("fails canonical rebuild for altered inventory or stale packet bindings", async () => {
    const documentA = await documentFixture({
      id: "3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      title: "重建资料 A",
      lines: ["重建原文甲"]
    });
    const documentB = await documentFixture({
      id: "3ccccccc-cccc-4ccc-8ccc-cccccccccccc",
      title: "重建资料 B",
      lines: ["重建原文乙"]
    });
    const citationA = citationFixture({
      id: "4ddddddd-dddd-4ddd-8ddd-dddddddddddd",
      document: documentA,
      startLine: 2,
      status: "verified"
    });
    const citationB = citationFixture({
      id: "4eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      document: documentB,
      startLine: 2,
      status: "verified"
    });
    const input = inputFor("local_review", [documentA, documentB], [citationA, citationB]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);
    const altered = structuredClone(inventory) as KnowledgeCitationSetConflictInventory;
    (altered.pairs[0] as { exactQuoteRelation: string }).exactQuoteRelation = "code_unit_exact_equal";
    await expect(validateKnowledgeCitationSetConflictInventory(altered, packet, input))
      .rejects.toThrow(/规范重建不一致/u);

    const stalePacket = structuredClone(packet);
    stalePacket.verifiedCitationIds = [];
    await expect(buildKnowledgeCitationSetConflictInventory(stalePacket, input))
      .rejects.toThrow(/规范重建不一致/u);
  });

  it("rejects accessors without invoking them and rejects oversized inventories before cloning", async () => {
    const document = await documentFixture({
      id: "3ddddddd-dddd-4ddd-8ddd-dddddddddddd",
      title: "预检资料",
      lines: ["预检原文"]
    });
    const citation = citationFixture({
      id: "4fffffff-ffff-4fff-8fff-ffffffffffff",
      document,
      startLine: 2,
      status: "verified"
    });
    const input = inputFor("local_review", [document], [citation]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const inventory = await buildKnowledgeCitationSetConflictInventory(packet, input);
    let invoked = false;
    const accessor = structuredClone(inventory) as unknown as Record<string, unknown>;
    Object.defineProperty(accessor, "unknown", {
      enumerable: true,
      get() {
        invoked = true;
        return "不得执行";
      }
    });
    await expect(validateKnowledgeCitationSetConflictInventory(accessor, packet, input))
      .rejects.toThrow(/声明式数据字段/u);
    expect(invoked).toBe(false);

    const oversized = new Array(50_001).fill(null);
    await expect(validateKnowledgeCitationSetConflictInventory(oversized, packet, input))
      .rejects.toMatchObject({ code: "INVENTORY_LIMIT_EXCEEDED" });
  });
});
