import { describe, expect, it } from "vitest";
import {
  citationTargetKeys,
  type CitationRecord,
  type KnowledgeDocumentRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import {
  EVIDENCE_SUBJECTS,
  KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_PROFILE,
  buildKnowledgeContentSnapshot,
  buildKnowledgeSourceAwareRetrievalPacket,
  validateKnowledgeSourceAwareRetrievalPacket,
  type BuildKnowledgeSourceAwareRetrievalPacketInput,
  type KnowledgeSourceAwareRetrievalPacket
} from "./index";

const timestamp = "2026-08-24T00:00:00.000Z";
const subject = EVIDENCE_SUBJECTS.find((value) => value.fieldPaths.includes("pillars.day.hiddenStems"))!;
const target = { kind: "evidence_subject" as const, subjectId: subject.subjectId };

async function documentFixture(options: {
  id: string;
  recordType: KnowledgeDocumentRecord["recordType"];
  title: string;
  quote: string;
  hiddenTail?: string;
}): Promise<KnowledgeDocumentRecord> {
  const content = `# 来源\n${options.quote}\n${options.hiddenTail ?? "未引用的全文内容不得进入检索包"}`;
  const snapshot = await buildKnowledgeContentSnapshot(content, "markdown");
  return {
    schemaVersion: "1.0.0",
    id: options.id,
    recordType: options.recordType,
    title: options.title,
    author: "某作者",
    edition: "第一版",
    sourceNote: "私密来源备注不得进入检索包",
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
  quote: string;
  status: CitationRecord["status"];
}): CitationRecord {
  const reviewed = options.status === "verified";
  return {
    schemaVersion: "1.0.0",
    id: options.id,
    documentId: options.document.id,
    documentContentHash: options.document.contentHash,
    locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
    quote: options.quote,
    annotation: "不进入检索包的批注",
    targets: [target],
    targetKeys: citationTargetKeys([target]),
    status: options.status,
    reviewAttestations: reviewed
      ? [
          { reviewerId: "reviewer-a", reviewedAt: timestamp, note: "定位复核" },
          { reviewerId: "reviewer-b", reviewedAt: timestamp, note: "引用复核" }
        ]
      : [],
    decisionNote: options.status === "user_candidate" ? "" : "保留裁定，不进入检索包正文",
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
      copyrightNotice: "不得进入检索包",
      evidenceRefs: [],
      distributionPolicy: "local_private_only"
    },
    review: { status: "unreviewed", attestations: [], note: "" },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function bundledRights(document: KnowledgeDocumentRecord): SourceRightsRecord {
  return {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId: document.id,
    documentContentHash: document.contentHash,
    origin: "bundled",
    source: {
      sourceUrl: "https://example.com/public-source",
      publisher: "Hakimi",
      publicationYear: 2026,
      acquiredAt: timestamp
    },
    rights: {
      status: "project_original_verified",
      workStatus: "project_original_verified",
      editionStatus: "project_original_verified",
      basis: "project_authored",
      jurisdiction: null,
      licenseId: null,
      copyrightNotice: "Hakimi project original",
      evidenceRefs: ["https://example.com/rights-evidence"],
      distributionPolicy: "redistributable"
    },
    review: {
      status: "double_reviewed",
      attestations: [
        { reviewerId: "rights-a", reviewedAt: timestamp, note: "作品层" },
        { reviewerId: "rights-b", reviewedAt: timestamp, note: "版本层" }
      ],
      note: "双人复核"
    },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function inputFor(
  useMode: BuildKnowledgeSourceAwareRetrievalPacketInput["useMode"],
  entries: Array<{
    document: KnowledgeDocumentRecord;
    citation: CitationRecord;
    rights: SourceRightsRecord;
  }>
): BuildKnowledgeSourceAwareRetrievalPacketInput {
  return {
    evidenceSubjectId: subject.subjectId,
    useMode,
    documents: entries.map((entry) => entry.document),
    citations: entries.map((entry) => entry.citation),
    sourceRights: entries.map((entry) => entry.rights)
  };
}

describe("source-aware retrieval packet v0.1", () => {
  it("emits only an exact verified quote for local review and keeps private source text offline", async () => {
    const document = await documentFixture({
      id: "11111111-1111-4111-8111-111111111111",
      recordType: "user_knowledge_document",
      title: "私有研读资料",
      quote: "藏干原文甲"
    });
    const citation = citationFixture({
      id: "21111111-1111-4111-8111-111111111111",
      document,
      quote: "藏干原文甲",
      status: "verified"
    });
    const input = inputFor("local_review", [{ document, citation, rights: privateRights(document) }]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const serialized = JSON.stringify(packet);

    expect(packet.profile).toEqual(KNOWLEDGE_SOURCE_AWARE_RETRIEVAL_PROFILE);
    expect(packet.status).toBe("ready_for_local_review");
    expect(packet.items).toHaveLength(1);
    expect(packet.items[0]).toMatchObject({
      citationId: citation.id,
      quote: "藏干原文甲",
      evidenceClassification: "verified_exact_quote_local_private"
    });
    expect(packet.boundary).toMatchObject({
      redistributionRightsGate: "local_only_not_applicable",
      rawKnowledgeDocumentsCopied: false,
      exactCitationQuotesCopied: true,
      localPrivateSourceTextIncluded: true,
      sourceTextInstructionAuthority: false,
      promptInjectionScreeningPerformed: false,
      citationSetConflictReviewPerformed: false,
      citationSetConflictStatus: "unassessed",
      externalPurposeRightsReviewed: false,
      externalProviderUseAuthorized: false,
      atomicStorageSnapshotVerified: false,
      mutationEpochRevalidationPerformed: false,
      downstreamExternalUseGate: "blocked",
      networkTransmissionPerformed: false,
      networkTransmissionAuthorized: false,
      publicExportAuthorized: false,
      expertTruthClaimed: false
    });
    expect(serialized).not.toContain("未引用的全文内容不得进入检索包");
    expect(serialized).not.toContain("私密来源备注不得进入检索包");
    expect(serialized).not.toContain("token=must-not-leak");
    expect(serialized).not.toContain("不进入检索包的批注");
    expect(Object.isFrozen(packet)).toBe(true);
    await expect(validateKnowledgeSourceAwareRetrievalPacket(packet, input)).resolves.toEqual(packet);
  });

  it("keeps even redistributable source text out of external context until separate authorization exists", async () => {
    const document = await documentFixture({
      id: "12222222-2222-4222-8222-222222222222",
      recordType: "bundled_knowledge_document",
      title: "项目原创来源",
      quote: "十神原文乙"
    });
    const citation = citationFixture({
      id: "22222222-2222-4222-8222-222222222222",
      document,
      quote: "十神原文乙",
      status: "verified"
    });
    const input = inputFor("external_context_candidate", [{
      document,
      citation,
      rights: bundledRights(document)
    }]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);

    expect(packet.status).toBe("blocked_external_authorization_unavailable");
    expect(packet.items).toEqual([]);
    expect(packet.blockedVerifiedCitations).toEqual([{
      citationId: citation.id,
      reason: "external_authorization_unavailable"
    }]);
    expect(JSON.stringify(packet)).not.toContain("十神原文乙");
    expect(packet.sourceSet).toMatchObject({
      allMatchingCitationStatusesBound: true,
      rawSourceRecordsCopied: false
    });
    expect(packet.boundary).toMatchObject({
      redistributionRightsGate: "passed_for_redistributable_content_only",
      privacyReviewPerformed: false,
      citationSetConflictReviewPerformed: false,
      externalPurposeRightsReviewed: false,
      externalProviderUseAuthorized: false,
      downstreamExternalUseGate: "blocked",
      networkTransmissionAuthorized: false
    });
  });

  it("blocks the entire external candidate when any verified target source is local-private", async () => {
    const bundled = await documentFixture({
      id: "13333333-3333-4333-8333-333333333333",
      recordType: "bundled_knowledge_document",
      title: "可再分发来源",
      quote: "来源甲"
    });
    const privateDocument = await documentFixture({
      id: "14444444-4444-4444-8444-444444444444",
      recordType: "user_knowledge_document",
      title: "仅本机来源",
      quote: "来源乙"
    });
    const bundledCitation = citationFixture({
      id: "23333333-3333-4333-8333-333333333333",
      document: bundled,
      quote: "来源甲",
      status: "verified"
    });
    const privateCitation = citationFixture({
      id: "24444444-4444-4444-8444-444444444444",
      document: privateDocument,
      quote: "来源乙",
      status: "verified"
    });
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(inputFor("external_context_candidate", [
      { document: bundled, citation: bundledCitation, rights: bundledRights(bundled) },
      { document: privateDocument, citation: privateCitation, rights: privateRights(privateDocument) }
    ]));

    expect(packet.status).toBe("blocked_external_rights_incomplete");
    expect(packet.items).toEqual([]);
    expect(packet.verifiedCitationIds).toEqual([bundledCitation.id, privateCitation.id].sort());
    expect(packet.blockedVerifiedCitations).toEqual([
      { citationId: bundledCitation.id, reason: "external_authorization_unavailable" },
      { citationId: privateCitation.id, reason: "source_not_redistributable" }
    ]);
    expect(packet.boundary.redistributionRightsGate).toBe("failed");
  });

  it("does not cherry-pick around an unreviewed target-bound source", async () => {
    const verifiedDocument = await documentFixture({
      id: "15555555-5555-4555-8555-555555555555",
      recordType: "bundled_knowledge_document",
      title: "已核验来源",
      quote: "已核验原文"
    });
    const candidateDocument = await documentFixture({
      id: "16666666-6666-4666-8666-666666666666",
      recordType: "bundled_knowledge_document",
      title: "候选来源",
      quote: "候选原文"
    });
    const verifiedCitation = citationFixture({
      id: "25555555-5555-4555-8555-555555555555",
      document: verifiedDocument,
      quote: "已核验原文",
      status: "verified"
    });
    const candidateCitation = citationFixture({
      id: "26666666-6666-4666-8666-666666666666",
      document: candidateDocument,
      quote: "候选原文",
      status: "user_candidate"
    });
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(inputFor("external_context_candidate", [
      { document: verifiedDocument, citation: verifiedCitation, rights: bundledRights(verifiedDocument) },
      { document: candidateDocument, citation: candidateCitation, rights: bundledRights(candidateDocument) }
    ]));

    expect(packet.status).toBe("blocked_unreviewed_target_sources");
    expect(packet.items).toEqual([]);
    expect(packet.candidateCitationIds).toEqual([candidateCitation.id]);
    expect(packet.verifiedCitationIds).toEqual([verifiedCitation.id]);
  });

  it("preserves every verified source deterministically without resolving semantic conflicts", async () => {
    const documentA = await documentFixture({
      id: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAA1",
      recordType: "bundled_knowledge_document",
      title: "来源 A",
      quote: "相反来源甲"
    });
    const documentB = await documentFixture({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      recordType: "bundled_knowledge_document",
      title: "来源 B",
      quote: "相反来源乙"
    });
    const citationA = citationFixture({
      id: "BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBB1",
      document: documentA,
      quote: "相反来源甲",
      status: "verified"
    });
    const citationB = citationFixture({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
      document: documentB,
      quote: "相反来源乙",
      status: "verified"
    });
    const entries = [
      { document: documentA, citation: citationA, rights: bundledRights(documentA) },
      { document: documentB, citation: citationB, rights: bundledRights(documentB) }
    ];
    const first = await buildKnowledgeSourceAwareRetrievalPacket(inputFor("local_review", entries));
    const second = await buildKnowledgeSourceAwareRetrievalPacket(inputFor("local_review", [...entries].reverse()));

    expect(first.integrity.payloadSha256).toBe(second.integrity.payloadSha256);
    expect(first.sourceMultiplicity).toBe("multiple_preserved_without_resolution");
    expect(first.items.map((item) => item.citationId)).toEqual([citationA.id, citationB.id]);
    expect(first.boundary.semanticConflictResolutionPerformed).toBe(false);
  });

  it("returns no source text when the target has no verified citation", async () => {
    const document = await documentFixture({
      id: "19999999-9999-4999-8999-999999999999",
      recordType: "user_knowledge_document",
      title: "候选资料",
      quote: "候选原文"
    });
    const citation = citationFixture({
      id: "29999999-9999-4999-8999-999999999999",
      document,
      quote: "候选原文",
      status: "user_candidate"
    });
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(inputFor("local_review", [{
      document,
      citation,
      rights: privateRights(document)
    }]));

    expect(packet.status).toBe("blocked_no_verified_citations");
    expect(packet.items).toEqual([]);
    expect(packet.candidateCitationIds).toEqual([citation.id]);
    expect(packet.boundary.containsSourceText).toBe(false);
  });

  it("fails closed for stale document, quote or rights bindings and duplicate identities", async () => {
    const document = await documentFixture({
      id: "1aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      recordType: "user_knowledge_document",
      title: "完整性资料",
      quote: "完整性原文"
    });
    const citation = citationFixture({
      id: "2aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      document,
      quote: "完整性原文",
      status: "verified"
    });
    const rights = privateRights(document);
    const base = inputFor("local_review", [{ document, citation, rights }]);

    const staleDocument = structuredClone(base);
    staleDocument.documents[0]!.content = staleDocument.documents[0]!.content.replace("完整性原文", "篡改原文");
    await expect(buildKnowledgeSourceAwareRetrievalPacket(staleDocument)).rejects.toThrow(/摘要/u);

    const staleQuote = structuredClone(base);
    staleQuote.citations[0]!.quote = "篡改引用";
    await expect(buildKnowledgeSourceAwareRetrievalPacket(staleQuote)).rejects.toThrow(/原文摘录不匹配/u);

    const staleRights = structuredClone(base);
    staleRights.sourceRights[0]!.documentContentHash = "0".repeat(64);
    await expect(buildKnowledgeSourceAwareRetrievalPacket(staleRights)).rejects.toThrow(/正文摘要/u);

    const duplicate = {
      ...structuredClone(base),
      citations: [
        ...structuredClone(base.citations),
        structuredClone(base.citations[0]!)
      ]
    };
    await expect(buildKnowledgeSourceAwareRetrievalPacket(duplicate)).rejects.toMatchObject({
      code: "DUPLICATE_CITATION"
    });
  });

  it("rejects altered or privacy-expanded packets by complete canonical rebuild", async () => {
    const document = await documentFixture({
      id: "1bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      recordType: "bundled_knowledge_document",
      title: "验证资料",
      quote: "验证原文"
    });
    const citation = citationFixture({
      id: "2bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      document,
      quote: "验证原文",
      status: "verified"
    });
    const input = inputFor("local_review", [{ document, citation, rights: bundledRights(document) }]);
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const rewritten = structuredClone(packet) as KnowledgeSourceAwareRetrievalPacket;
    (rewritten.items[0] as { quote: string }).quote = "伪造原文";
    await expect(validateKnowledgeSourceAwareRetrievalPacket(rewritten, input))
      .rejects.toThrow(/规范重建不一致/u);

    const expanded = structuredClone(packet) as KnowledgeSourceAwareRetrievalPacket & {
      rawDocument?: unknown;
    };
    expanded.rawDocument = document;
    await expect(validateKnowledgeSourceAwareRetrievalPacket(expanded, input))
      .rejects.toThrow(/规范重建不一致/u);
  });

  it("binds non-emitted candidate, rejected and external-blocked source snapshots", async () => {
    for (const scenario of [
      { status: "user_candidate" as const, suffix: "d" },
      { status: "rejected" as const, suffix: "e" }
    ]) {
      const documentId = `1${scenario.suffix.repeat(7)}-${scenario.suffix.repeat(4)}-4${scenario.suffix.repeat(3)}-8${scenario.suffix.repeat(3)}-${scenario.suffix.repeat(12)}`;
      const citationId = `2${scenario.suffix.repeat(7)}-${scenario.suffix.repeat(4)}-4${scenario.suffix.repeat(3)}-8${scenario.suffix.repeat(3)}-${scenario.suffix.repeat(12)}`;
      const beforeDocument = await documentFixture({
        id: documentId,
        recordType: "user_knowledge_document",
        title: "未输出来源",
        quote: "变更前原文"
      });
      const beforeCitation = citationFixture({
        id: citationId,
        document: beforeDocument,
        quote: "变更前原文",
        status: scenario.status
      });
      const beforeInput = inputFor("local_review", [{
        document: beforeDocument,
        citation: beforeCitation,
        rights: privateRights(beforeDocument)
      }]);
      const packet = await buildKnowledgeSourceAwareRetrievalPacket(beforeInput);

      const afterDocument = await documentFixture({
        id: documentId,
        recordType: "user_knowledge_document",
        title: "未输出来源",
        quote: "变更后原文"
      });
      const afterCitation = citationFixture({
        id: citationId,
        document: afterDocument,
        quote: "变更后原文",
        status: scenario.status
      });
      const afterInput = inputFor("local_review", [{
        document: afterDocument,
        citation: afterCitation,
        rights: privateRights(afterDocument)
      }]);

      await expect(validateKnowledgeSourceAwareRetrievalPacket(packet, afterInput))
        .rejects.toThrow(/规范重建不一致/u);
    }

    const beforeDocument = await documentFixture({
      id: "1fffffff-ffff-4fff-8fff-ffffffffffff",
      recordType: "bundled_knowledge_document",
      title: "外部阻断来源",
      quote: "外部变更前"
    });
    const beforeCitation = citationFixture({
      id: "2fffffff-ffff-4fff-8fff-ffffffffffff",
      document: beforeDocument,
      quote: "外部变更前",
      status: "verified"
    });
    const packet = await buildKnowledgeSourceAwareRetrievalPacket(inputFor("external_context_candidate", [{
      document: beforeDocument,
      citation: beforeCitation,
      rights: bundledRights(beforeDocument)
    }]));
    const afterDocument = await documentFixture({
      id: beforeDocument.id,
      recordType: "bundled_knowledge_document",
      title: "外部阻断来源",
      quote: "外部变更后"
    });
    const afterCitation = citationFixture({
      id: beforeCitation.id,
      document: afterDocument,
      quote: "外部变更后",
      status: "verified"
    });
    await expect(validateKnowledgeSourceAwareRetrievalPacket(packet, inputFor("external_context_candidate", [{
      document: afterDocument,
      citation: afterCitation,
      rights: bundledRights(afterDocument)
    }]))).rejects.toThrow(/规范重建不一致/u);
  });

  it("snapshots all mutable collections before the first asynchronous integrity verification", async () => {
    const document = await documentFixture({
      id: "1ccccccc-cccc-4ccc-8ccc-cccccccccccc",
      recordType: "user_knowledge_document",
      title: "竞态资料",
      quote: "竞态原文"
    });
    const citation = citationFixture({
      id: "2ccccccc-cccc-4ccc-8ccc-cccccccccccc",
      document,
      quote: "竞态原文",
      status: "verified"
    });
    const input = inputFor("local_review", [{ document, citation, rights: privateRights(document) }]);
    const expected = await buildKnowledgeSourceAwareRetrievalPacket(input);
    const mutable = structuredClone(input);
    const inFlight = buildKnowledgeSourceAwareRetrievalPacket(mutable);
    mutable.documents[0]!.content = "异步篡改";
    mutable.citations[0]!.quote = "异步篡改";
    mutable.sourceRights[0]!.documentContentHash = "f".repeat(64);

    await expect(inFlight).resolves.toEqual(expected);
  });

  it("rejects oversized collections and text before attempting a canonical clone", async () => {
    const tooManyDocuments = {
      evidenceSubjectId: subject.subjectId,
      useMode: "local_review",
      documents: new Array(2_001).fill(null),
      citations: [],
      sourceRights: []
    } as unknown as BuildKnowledgeSourceAwareRetrievalPacketInput;
    await expect(buildKnowledgeSourceAwareRetrievalPacket(tooManyDocuments)).rejects.toMatchObject({
      code: "INPUT_LIMIT_EXCEEDED"
    });

    const repeatedChunk = "x".repeat(2_000_000);
    const repeatedDocument = { content: repeatedChunk };
    const tooMuchText = {
      evidenceSubjectId: subject.subjectId,
      useMode: "local_review",
      documents: new Array(13).fill(repeatedDocument),
      citations: [],
      sourceRights: []
    } as unknown as BuildKnowledgeSourceAwareRetrievalPacketInput;
    await expect(buildKnowledgeSourceAwareRetrievalPacket(tooMuchText)).rejects.toMatchObject({
      code: "INPUT_LIMIT_EXCEEDED"
    });
  });

  it("rejects accessors without invoking them during preflight", async () => {
    let invoked = false;
    const topLevel = {
      evidenceSubjectId: subject.subjectId,
      useMode: "local_review",
      citations: [],
      sourceRights: []
    } as Record<string, unknown>;
    Object.defineProperty(topLevel, "documents", {
      enumerable: true,
      get() {
        invoked = true;
        return [];
      }
    });
    await expect(buildKnowledgeSourceAwareRetrievalPacket(
      topLevel as unknown as BuildKnowledgeSourceAwareRetrievalPacketInput
    )).rejects.toThrow(/声明式数据字段/u);
    expect(invoked).toBe(false);

    const nested = { content: "合法表象" } as Record<string, unknown>;
    Object.defineProperty(nested, "hidden", {
      enumerable: true,
      get() {
        invoked = true;
        return "不得执行";
      }
    });
    const nestedInput = {
      evidenceSubjectId: subject.subjectId,
      useMode: "local_review",
      documents: [nested],
      citations: [],
      sourceRights: []
    } as unknown as BuildKnowledgeSourceAwareRetrievalPacketInput;
    await expect(buildKnowledgeSourceAwareRetrievalPacket(nestedInput)).rejects.toThrow(/声明式数据字段/u);
    expect(invoked).toBe(false);
  });
});
