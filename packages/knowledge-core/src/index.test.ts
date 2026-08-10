import { describe, expect, it } from "vitest";
import {
  KnowledgeCoreError,
  KnowledgeIntegrityError,
  EVIDENCE_SUBJECTS,
  buildEvidenceCoverageReport,
  buildKnowledgeContentSnapshot,
  buildKnowledgeSections,
  extractKnowledgeQuote,
  inferKnowledgeFormat,
  normalizeKnowledgeContent,
  searchKnowledgeDocuments,
  validateBundledKnowledgeRelease,
  verifyCitationIntegrity,
  verifyKnowledgeDocumentIntegrity
} from "./index";
import { citationTargetKeys, type CitationRecord, type KnowledgeDocumentRecord, type SourceRightsRecord } from "@hakimi/contracts";

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

  it("registers all 36 pillar evidence subjects exactly once", () => {
    expect(EVIDENCE_SUBJECTS).toHaveLength(36);
    expect(new Set(EVIDENCE_SUBJECTS.map((subject) => subject.subjectId)).size).toBe(36);
    expect(new Set(EVIDENCE_SUBJECTS.flatMap((subject) => subject.fieldPaths)).size).toBe(36);
    expect(EVIDENCE_SUBJECTS.some((subject) => subject.fieldPaths.includes("pillars.hour.xun"))).toBe(true);
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
