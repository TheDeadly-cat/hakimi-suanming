import { describe, expect, it, vi } from "vitest";
import {
  KnowledgeCoreError,
  KnowledgeIntegrityError,
  BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECTS,
  EVIDENCE_SUBJECTS,
  SINGLE_CHART_REPORT_EVIDENCE_SUBJECTS,
  buildEvidenceCoverageReport,
  buildKnowledgeContentSnapshot,
  buildKnowledgeSections,
  createKnowledgeDocumentCitationIntegrityVerifier,
  extractKnowledgeQuote,
  inferKnowledgeFormat,
  isReservedSingleChartReportEvidenceSubjectId,
  isSingleChartReportEvidenceSubjectId,
  normalizeKnowledgeContent,
  requireEvidenceSubject,
  searchKnowledgeDocuments,
  validateBundledKnowledgeRelease,
  verifyCitationIntegrity,
  verifyKnowledgeDocumentIntegrity
} from "./index";
import {
  citationRecordSchema,
  citationTargetKeys,
  type CitationRecord,
  type KnowledgeDocumentRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";

const timestamp = "2026-08-01T00:00:00.000Z";

async function documentFixture(): Promise<KnowledgeDocumentRecord> {
  const snapshot = await buildKnowledgeContentSnapshot("序言\n# 第一章\n藏干正文\n```md\n# 不是标题\n```\n## 小节\n十神正文", "markdown");
  return {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    recordType: "user_knowledge_document",
    title: "研究摘录",
    author: "某作者",
    edition: "第一版",
    sourceNote: "用户本地资料",
    fileName: "研究摘录.md",
    format: "markdown",
    byteSize: 90,
    ...snapshot,
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function citationFixture(
  document: KnowledgeDocumentRecord,
  overrides: Partial<CitationRecord> = {}
): CitationRecord {
  const targets = [{
    kind: "research_note" as const,
    noteId: "33333333-3333-4333-8333-333333333333"
  }];
  return {
    schemaVersion: "1.0.0",
    id: "22222222-2222-4222-8222-222222222222",
    documentId: document.id,
    documentContentHash: document.contentHash,
    locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
    quote: "藏干正文",
    annotation: "待与其他版本对读",
    targets,
    targetKeys: citationTargetKeys(targets),
    status: "user_candidate",
    reviewAttestations: [],
    decisionNote: "",
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides
  };
}

describe("knowledge-core", () => {
  it("normalizes BOM and line endings while rejecting empty and NUL documents", () => {
    expect(normalizeKnowledgeContent("\uFEFF甲\r\n乙\r丙")).toBe("甲\n乙\n丙");
    expect(() => normalizeKnowledgeContent(" \n ")).toThrowError(KnowledgeCoreError);
    expect(() => normalizeKnowledgeContent("甲\0乙")).toThrowError(KnowledgeCoreError);
  });

  it("infers Markdown only from a Markdown extension or media type", () => {
    expect(inferKnowledgeFormat("典籍.MD")).toBe("markdown");
    expect(inferKnowledgeFormat("典籍.bin", "text/markdown; charset=utf-8")).toBe("markdown");
    expect(inferKnowledgeFormat("典籍.txt", "text/plain")).toBe("text");
  });

  it("builds stable line sections and ignores headings inside fenced code", () => {
    expect(buildKnowledgeSections("序言\n# 第一章\n正文\n```\n# 假标题\n```\n## 小节\n内容", "markdown")).toEqual([
      { id: "section-1", title: "开篇", level: 0, startLine: 1, endLine: 1 },
      { id: "section-2", title: "第一章", level: 1, startLine: 2, endLine: 6 },
      { id: "section-7", title: "小节", level: 2, startLine: 7, endLine: 8 }
    ]);
    expect(buildKnowledgeSections("甲\n乙", "text")).toEqual([
      { id: "section-1", title: "全文", level: 0, startLine: 1, endLine: 2 }
    ]);
  });

  it("extracts exact line ranges and rejects empty or oversized ranges", () => {
    expect(extractKnowledgeQuote("甲\n乙\n丙", 2, 3)).toBe("乙\n丙");
    expect(() => extractKnowledgeQuote("甲\n乙", 0, 1)).toThrowError(KnowledgeCoreError);
    expect(() => extractKnowledgeQuote("甲\n \n乙", 2, 2)).toThrowError(KnowledgeCoreError);
  });

  it("searches Chinese metadata and content with section and line context", async () => {
    const document = await documentFixture();
    expect(searchKnowledgeDocuments([document], "藏干")).toMatchObject([
      { document: { id: document.id }, sectionId: "section-2", lineNumber: 3 }
    ]);
    expect(searchKnowledgeDocuments([document], "某作者 第一版")).toMatchObject([
      { document: { id: document.id }, sectionId: "section-1", lineNumber: 1 }
    ]);
    expect(searchKnowledgeDocuments([document], "不存在")).toEqual([]);
  });

  it("recomputes document and citation snapshots before accepting them", async () => {
    const document = await documentFixture();
    await expect(verifyKnowledgeDocumentIntegrity(document)).resolves.toEqual(document);
    await expect(verifyKnowledgeDocumentIntegrity({ ...document, contentHash: "0".repeat(64) })).rejects.toBeInstanceOf(KnowledgeIntegrityError);

    const citation: CitationRecord = {
      schemaVersion: "1.0.0",
      id: "22222222-2222-4222-8222-222222222222",
      documentId: document.id,
      documentContentHash: document.contentHash,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      quote: "藏干正文",
      annotation: "待与其他版本对读",
      targets: [{ kind: "research_note", noteId: "33333333-3333-4333-8333-333333333333" }],
      targetKeys: citationTargetKeys([{ kind: "research_note", noteId: "33333333-3333-4333-8333-333333333333" }]),
      status: "user_candidate",
      reviewAttestations: [],
      decisionNote: "",
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await expect(verifyCitationIntegrity(citation, document)).resolves.toEqual(citation);
    await expect(verifyCitationIntegrity({ ...citation, quote: "篡改" }, document)).rejects.toMatchObject({ mismatch: "quote" });
  });

  it("accepts the aggregate explicit Citation text maxima within the bounded input snapshot", async () => {
    const content = "甲".repeat(20_000);
    const snapshot = await buildKnowledgeContentSnapshot(content, "text");
    const document: KnowledgeDocumentRecord = {
      schemaVersion: "1.0.0",
      id: "11111111-1111-4111-8111-111111111111",
      recordType: "user_knowledge_document",
      title: "聚合上限资料",
      author: "",
      edition: "",
      sourceNote: "",
      fileName: "聚合上限.txt",
      format: "text",
      byteSize: new TextEncoder().encode(content).byteLength,
      ...snapshot,
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const targets = Array.from({ length: 100 }, (_, index) => ({
      kind: "evidence_subject" as const,
      subjectId: `a${String(index).padStart(3, "0")}${"x".repeat(156)}`
    }));
    const reviewAttestations = Array.from({ length: 20 }, (_, index) => {
      const prefix = `reviewer-${String(index).padStart(2, "0")}`;
      return {
        reviewerId: `${prefix}${"x".repeat(120 - prefix.length)}`,
        reviewedAt: timestamp,
        note: "乙".repeat(2_000)
      };
    });
    const citation = citationRecordSchema.parse({
      schemaVersion: "1.0.0",
      id: "22222222-2222-4222-8222-222222222222",
      documentId: document.id,
      documentContentHash: document.contentHash,
      locator: { sectionId: "section-1", startLine: 1, endLine: 1 },
      quote: content,
      annotation: "丙".repeat(20_000),
      targets,
      targetKeys: citationTargetKeys(targets),
      status: "user_candidate",
      reviewAttestations,
      decisionNote: "丁".repeat(4_000),
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    const boundedFieldTextCharacters = citation.quote.length
      + citation.annotation.length
      + citation.decisionNote.length
      + citation.reviewAttestations.reduce(
        (sum, attestation) => sum + attestation.reviewerId.length + attestation.note.length,
        0
      )
      + citation.targets.reduce(
        (sum, target) => sum + target.kind.length + (target.kind === "evidence_subject" ? target.subjectId.length : 0),
        0
      )
      + citation.targetKeys.reduce((sum, targetKey) => sum + targetKey.length, 0);
    expect(boundedFieldTextCharacters).toBeGreaterThan(100_000);

    const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(document);
    expect(verifier.verifyCitation(citation)).toEqual(citation);
  });

  it("verifies many citations against one frozen document with exactly one content digest and no partial batch", async () => {
    const document = await documentFixture();
    const first = citationFixture(document);
    const second = citationFixture(document, {
      id: "22222222-2222-4222-8222-222222222223",
      locator: { sectionId: "section-7", startLine: 8, endLine: 8 },
      quote: "十神正文"
    });
    const expectedContentBytes = new TextEncoder().encode(document.content);
    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    let contentDigestCalls = 0;
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation((algorithm, data) => {
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      if (
        bytes.byteLength === expectedContentBytes.byteLength
        && bytes.every((byte, index) => byte === expectedContentBytes[index])
      ) {
        contentDigestCalls += 1;
      }
      return originalDigest(algorithm, data);
    });

    try {
      const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(document);
      const verified = verifier.verifyCitations([first, second]);

      expect(verified).toEqual([first, second]);
      expect(contentDigestCalls).toBe(1);
      expect(Object.isFrozen(verifier)).toBe(true);
      expect(Object.isFrozen(verifier.document)).toBe(true);
      expect(Object.isFrozen(verifier.document.sections)).toBe(true);
      expect(Object.isFrozen(verified)).toBe(true);
      expect(Object.isFrozen(verified[0])).toBe(true);
      expect(Object.isFrozen(verified[0]!.locator)).toBe(true);

      expect(() => verifier.verifyCitations([first, { ...second, quote: "末项篡改" }]))
        .toThrowError(KnowledgeIntegrityError);
      expect(contentDigestCalls).toBe(1);

      let parseFailure: unknown;
      try {
        verifier.verifyCitations([
          { ...first, quote: "首项语义失配" },
          { ...second, excerpt: "末项未知字段" }
        ]);
      } catch (cause) {
        parseFailure = cause;
      }
      expect(parseFailure).toMatchObject({ name: "ZodError" });
      expect(parseFailure).not.toBeInstanceOf(KnowledgeIntegrityError);
    } finally {
      digest.mockRestore();
    }
  });

  it("rejects an oversized batch before inspecting a hostile tail accessor", async () => {
    const document = await documentFixture();
    const citation = citationFixture(document);
    const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(document);
    const tailGetter = vi.fn(() => citation);
    const oversizedBatch = new Array<unknown>(1_025).fill(citation);
    Object.defineProperty(oversizedBatch, "1024", {
      enumerable: true,
      configurable: true,
      get: tailGetter
    });

    expect(() => verifier.verifyCitations(oversizedBatch)).toThrowError(
      /Citation integrity batch input cannot exceed 1024 items/u
    );
    expect(tailGetter).not.toHaveBeenCalled();
  });

  it("applies the same bounded per-item text budget to single and batch verification", async () => {
    const document = await documentFixture();
    const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(document);
    const oversizedTimestamp = `2026-08-01T00:00:00.${"0".repeat(260_000)}Z`;
    const oversizedCitation = {
      ...citationFixture(document),
      createdAt: oversizedTimestamp,
      updatedAt: oversizedTimestamp
    };
    expect(citationRecordSchema.safeParse(oversizedCitation).success).toBe(true);

    expect(() => verifier.verifyCitation(oversizedCitation)).toThrowError(
      /Citation integrity input exceeds the declarative text budget/u
    );
    expect(() => verifier.verifyCitations([oversizedCitation])).toThrowError(
      /Citation integrity input exceeds the declarative text budget/u
    );
  });

  it("rejects document and citation accessors without invoking them", async () => {
    const document = await documentFixture();
    const documentGetter = vi.fn(() => document.content);
    const hostileDocument = { ...document } as Record<string, unknown>;
    Object.defineProperty(hostileDocument, "content", {
      enumerable: true,
      get: documentGetter
    });

    await expect(createKnowledgeDocumentCitationIntegrityVerifier(hostileDocument))
      .rejects.toBeInstanceOf(TypeError);
    expect(documentGetter).not.toHaveBeenCalled();

    const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(document);
    const citation = citationFixture(document);
    const citationGetter = vi.fn(() => citation.quote);
    const hostileCitation = { ...citation } as Record<string, unknown>;
    Object.defineProperty(hostileCitation, "quote", {
      enumerable: true,
      get: citationGetter
    });
    expect(() => verifier.verifyCitation(hostileCitation)).toThrowError(TypeError);
    expect(citationGetter).not.toHaveBeenCalled();

    const itemGetter = vi.fn(() => citation);
    const hostileBatch = [citation] as unknown[];
    Object.defineProperty(hostileBatch, "0", {
      enumerable: true,
      get: itemGetter
    });
    expect(() => verifier.verifyCitations(hostileBatch)).toThrowError(TypeError);
    expect(itemGetter).not.toHaveBeenCalled();
  });

  it("rejects Symbol properties, custom prototypes, sparse arrays and cycles before schema parsing", async () => {
    const document = await documentFixture();

    const symbolDocument = { ...document } as Record<PropertyKey, unknown>;
    symbolDocument[Symbol("hostile")] = true;
    await expect(createKnowledgeDocumentCitationIntegrityVerifier(symbolDocument))
      .rejects.toBeInstanceOf(TypeError);

    const prototypeDocument = Object.assign(Object.create({ hostile: true }), document);
    await expect(createKnowledgeDocumentCitationIntegrityVerifier(prototypeDocument))
      .rejects.toBeInstanceOf(TypeError);

    const sparseDocument = { ...document, sections: new Array(1) };
    await expect(createKnowledgeDocumentCitationIntegrityVerifier(sparseDocument))
      .rejects.toBeInstanceOf(TypeError);

    const cyclicDocument = { ...document } as Record<string, unknown>;
    cyclicDocument.self = cyclicDocument;
    await expect(createKnowledgeDocumentCitationIntegrityVerifier(cyclicDocument))
      .rejects.toBeInstanceOf(TypeError);
  });

  it("captures inputs before awaiting and keeps returned document and citation snapshots immutable", async () => {
    const document = await documentFixture();
    const mutableDocument = structuredClone(document);
    const pending = createKnowledgeDocumentCitationIntegrityVerifier(mutableDocument);
    mutableDocument.content = "调用返回后的异步篡改";
    mutableDocument.contentHash = "f".repeat(64);
    mutableDocument.sections[0]!.title = "篡改章节";

    const verifier = await pending;
    expect(verifier.document).toEqual(document);
    expect(() => {
      (verifier.document as KnowledgeDocumentRecord).content = "返回后篡改";
    }).toThrowError(TypeError);
    expect(() => {
      (verifier.document.sections as KnowledgeDocumentRecord["sections"])[0]!.title = "返回后篡改章节";
    }).toThrowError(TypeError);

    const mutableCitation = structuredClone(citationFixture(document));
    const verifiedCitation = verifier.verifyCitation(mutableCitation);
    mutableCitation.quote = "返回后篡改引用";
    mutableCitation.targetKeys[0] = "research_note:44444444-4444-4444-8444-444444444444";
    expect(verifiedCitation.quote).toBe("藏干正文");
    expect(verifiedCitation.targetKeys).toEqual(citationFixture(document).targetKeys);
    expect(() => {
      (verifiedCitation as CitationRecord).quote = "篡改冻结引用";
    }).toThrowError(TypeError);
  });

  it("fails closed for every document binding, locator, quote and target-key mismatch", async () => {
    const document = await documentFixture();
    await expect(createKnowledgeDocumentCitationIntegrityVerifier({
      ...document,
      content: document.content.replace("藏干正文", "篡改正文")
    })).rejects.toMatchObject({ mismatch: "contentHash" });

    const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(document);
    const citation = citationFixture(document);
    expect(() => verifier.verifyCitation({
      ...citation,
      documentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    })).toThrowError(KnowledgeIntegrityError);
    expect(() => verifier.verifyCitation({
      ...citation,
      documentContentHash: "0".repeat(64)
    })).toThrowError(KnowledgeIntegrityError);
    expect(() => verifier.verifyCitation({
      ...citation,
      locator: { sectionId: "section-7", startLine: 3, endLine: 3 }
    })).toThrowError(KnowledgeIntegrityError);
    expect(() => verifier.verifyCitation({ ...citation, quote: "篡改引用" }))
      .toThrowError(KnowledgeIntegrityError);
    expect(() => verifier.verifyCitation({
      ...citation,
      targetKeys: ["research_note:44444444-4444-4444-8444-444444444444"]
    })).toThrow();
    expect(() => verifier.verifyCitation({ ...citation, excerpt: "伪造搜索摘要" }))
      .toThrow();
  });

  it("registers all 36 pillar evidence subjects exactly once", () => {
    expect(EVIDENCE_SUBJECTS).toHaveLength(36);
    expect(new Set(EVIDENCE_SUBJECTS.map((subject) => subject.subjectId)).size).toBe(36);
    expect(new Set(EVIDENCE_SUBJECTS.flatMap((subject) => subject.fieldPaths)).size).toBe(36);
    expect(EVIDENCE_SUBJECTS.some((subject) => subject.fieldPaths.includes("pillars.hour.xun"))).toBe(true);
    const subject = requireEvidenceSubject("bazi.pillar.day.ganzhi.v1");
    expect(Object.isFrozen(subject)).toBe(true);
    expect(Object.isFrozen(subject.algorithmIds)).toBe(true);
    expect(Object.isFrozen(subject.fieldPaths)).toBe(true);
    expect(Object.isFrozen(subject.ruleProfilePaths)).toBe(true);
    expect(() => (subject.fieldPaths as string[]).push("pillars.day.tampered"))
      .toThrow(TypeError);
    expect(requireEvidenceSubject(subject.subjectId)).toBe(subject);
  });

  it("registers twelve strength binding subjects without inflating the frozen pillar denominator", () => {
    expect(EVIDENCE_SUBJECTS).toHaveLength(36);
    expect(BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECTS).toHaveLength(12);
    expect(SINGLE_CHART_REPORT_EVIDENCE_SUBJECTS).toHaveLength(48);
    expect(new Set(SINGLE_CHART_REPORT_EVIDENCE_SUBJECTS.map((subject) => subject.subjectId)).size)
      .toBe(48);
    expect(BAZI_STRENGTH_BINDING_EVIDENCE_SUBJECTS.every((subject) => (
      subject.category === "interpretive_claim"
      && subject.requiredForV1 === false
      && subject.algorithmIds.length === 0
      && subject.fieldPaths.length === 0
      && subject.ruleProfilePaths.length === 0
      && Object.isFrozen(subject)
    ))).toBe(true);

    const subjectId = "bazi.strength.binding.policy.weights.v1";
    expect(isSingleChartReportEvidenceSubjectId(subjectId)).toBe(true);
    expect(isReservedSingleChartReportEvidenceSubjectId(subjectId)).toBe(true);
    expect(requireEvidenceSubject(subjectId).category).toBe("interpretive_claim");
    expect(isSingleChartReportEvidenceSubjectId("bazi.strength.binding.policy.unknown.v1")).toBe(false);
    expect(isReservedSingleChartReportEvidenceSubjectId("bazi.strength.binding.policy.unknown.v1")).toBe(true);
  });

  it("derives deterministic, non-inflating coverage while keeping rights separate from verification", async () => {
    const document = await documentFixture();
    const subject = EVIDENCE_SUBJECTS.find((item) => item.fieldPaths[0] === "pillars.day.hiddenStems")!;
    const target = { kind: "evidence_subject" as const, subjectId: subject.subjectId };
    const candidate: CitationRecord = {
      schemaVersion: "1.0.0",
      id: "22222222-2222-4222-8222-222222222222",
      documentId: document.id,
      documentContentHash: document.contentHash,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      quote: "藏干正文",
      annotation: "",
      targets: [target],
      targetKeys: citationTargetKeys([target]),
      status: "user_candidate",
      reviewAttestations: [],
      decisionNote: "",
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const privateRights: SourceRightsRecord = {
      schemaVersion: "1.0.0",
      recordType: "knowledge_source_rights",
      documentId: document.id,
      documentContentHash: document.contentHash,
      origin: "user_import",
      source: { sourceUrl: null, publisher: "", publicationYear: null, acquiredAt: timestamp },
      rights: {
        status: "user_unverified",
        workStatus: "unknown",
        editionStatus: "unknown",
        basis: "user_declaration",
        jurisdiction: null,
        licenseId: null,
        copyrightNotice: "",
        evidenceRefs: [],
        distributionPolicy: "local_private_only"
      },
      review: { status: "unreviewed", attestations: [], note: "" },
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const provenance = [{
      field: "pillars.day.hiddenStems",
      kind: "rule_derived" as const,
      algorithmId: subject.algorithmIds[0]!,
      sourceRefs: ["旧字符串"],
      verificationStatus: "experimental" as const,
      note: ""
    }];
    const first = await buildEvidenceCoverageReport({ provenance, citations: [candidate, { ...candidate, id: "44444444-4444-4444-8444-444444444444" }], sourceRights: [privateRights] });
    const second = await buildEvidenceCoverageReport({ provenance, citations: [{ ...candidate, id: "44444444-4444-4444-8444-444444444444" }, candidate], sourceRights: [privateRights] });
    expect(first.metrics.structuredLink.numerator).toBe(1);
    expect(first.metrics.doubleReviewed.numerator).toBe(0);
    expect(first.metrics.redistributableSource.numerator).toBe(0);
    expect(first.rows.find((row) => row.subject.subjectId === subject.subjectId)?.candidateCitationIds).toHaveLength(2);
    expect(first.digest).toBe(second.digest);
  });

  it("rejects a bundled text when only the ancient work layer is clear", () => {
    const rights: SourceRightsRecord = {
      schemaVersion: "1.0.0",
      recordType: "knowledge_source_rights",
      documentId: "11111111-1111-4111-8111-111111111111",
      documentContentHash: "a".repeat(64),
      origin: "bundled",
      source: { sourceUrl: "https://example.com", publisher: "", publicationYear: null, acquiredAt: timestamp },
      rights: {
        status: "public_domain_verified",
        workStatus: "public_domain_verified",
        editionStatus: "unknown",
        basis: "public_domain",
        jurisdiction: "CN",
        licenseId: null,
        copyrightNotice: "",
        evidenceRefs: ["https://example.com/evidence"],
        distributionPolicy: "redistributable"
      },
      review: {
        status: "double_reviewed",
        attestations: [
          { reviewerId: "reviewer-a", reviewedAt: timestamp, note: "作品层" },
          { reviewerId: "reviewer-b", reviewedAt: timestamp, note: "版本层" }
        ],
        note: ""
      },
      editVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    expect(() => validateBundledKnowledgeRelease([{
      path: "documents/source.md",
      documentId: rights.documentId,
      contentHash: rights.documentContentHash,
      sourceRights: rights
    }])).toThrow(/现代版本层|随包资料/);
  });
});
