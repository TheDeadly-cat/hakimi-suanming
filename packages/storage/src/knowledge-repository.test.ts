import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  SCHEMA_VERSION,
  citationRecordSchema,
  type BirthInput,
  type CalculatedChart,
  type CitationRecord,
  type ResearchCaseQuery,
  type SourceRightsRecord,
  type UnknownHourCandidateResult
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { buildKnowledgeContentSnapshot, KnowledgeIntegrityError } from "@hakimi/knowledge-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  CoreDataIdentityConflictError,
  DuplicateKnowledgeDocumentError,
  FullDataIdentityConflictError,
  FullDataReplaceConflictError,
  KnowledgeRepository,
  KnowledgeRepositoryError,
  ResearchDatabase,
  ResearchRepository
} from "./index";

const databases: ResearchDatabase[] = [];
const input: BirthInput = {
  schemaVersion: SCHEMA_VERSION,
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

let chartPromise: Promise<CalculatedChart> | undefined;
let candidatePromise: Promise<UnknownHourCandidateResult> | undefined;

function emptySavedCaseQuery(): ResearchCaseQuery {
  return {
    version: 1,
    scope: "cases",
    text: "",
    lifecycle: "active",
    favorites: "any",
    revisionScope: "latest",
    caseTags: [],
    dayMasters: [],
    monthBranches: [],
    relationTypes: [],
    ruleProfileDigests: [],
    transit: null,
    events: null,
    sort: { field: "updatedAt", direction: "desc" }
  };
}

function chart(): Promise<CalculatedChart> {
  chartPromise ??= calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  return chartPromise;
}

function candidates(): Promise<UnknownHourCandidateResult> {
  candidatePromise ??= calculateUnknownHourCandidates(
    { ...input, time: null, timePrecision: "unknown_hour" },
    WORKING_DEFAULT_RULE_PROFILE
  );
  return candidatePromise;
}

function repositories(targetSchema?: number) {
  const database = new ResearchDatabase(
    `hakimi-knowledge-test-${crypto.randomUUID()}`,
    targetSchema === undefined ? {} : { targetSchema }
  );
  databases.push(database);
  return {
    database,
    cases: new CaseRepository(database),
    research: new ResearchRepository(database),
    knowledge: new KnowledgeRepository(database, () => "2026-08-01T00:00:00.000Z")
  };
}

async function createDocument(knowledge: KnowledgeRepository, suffix = "甲") {
  const content = `序言${suffix}\r\n# 第一章\r\n藏干正文${suffix}\r\n十神正文${suffix}`;
  return knowledge.createDocument({
    title: `研究资料${suffix}`,
    author: "用户",
    edition: "第一版",
    sourceNote: "本地导入",
    fileName: `研究资料${suffix}.md`,
    format: "markdown",
    content,
    byteSize: new TextEncoder().encode(content).byteLength
  });
}

afterEach(async () => {
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("KnowledgeRepository documents", () => {
  it("normalizes, hashes, searches and rejects duplicate or corrupted immutable content", async () => {
    const { database, knowledge } = repositories();
    const document = await createDocument(knowledge);

    expect(document.content).toBe("序言甲\n# 第一章\n藏干正文甲\n十神正文甲");
    expect(document.sections).toEqual([
      { id: "section-1", title: "开篇", level: 0, startLine: 1, endLine: 1 },
      { id: "section-2", title: "第一章", level: 1, startLine: 2, endLine: 4 }
    ]);
    expect(await knowledge.getDocument(document.id)).toEqual(document);
    expect((await knowledge.listDocuments()).map((record) => record.id)).toEqual([document.id]);
    expect(await knowledge.searchDocuments("藏干 用户", { limit: 5 })).toMatchObject([
      { document: { id: document.id }, sectionId: "section-2", lineNumber: 3 }
    ]);
    await expect(createDocument(knowledge)).rejects.toBeInstanceOf(DuplicateKnowledgeDocumentError);

    await database.knowledgeDocuments.put({ ...document, content: document.content.replace("藏干正文甲", "藏干篡改甲") });
    await expect(knowledge.getDocument(document.id)).rejects.toBeInstanceOf(KnowledgeIntegrityError);
  });

  it("atomically creates a private unverified rights ledger and only permits safe user metadata edits", async () => {
    const { database, knowledge } = repositories();
    const content = "# Source\nImported locally";
    const document = await knowledge.createDocument({
      title: "Rights source",
      author: "User",
      edition: "Local scan",
      sourceNote: "",
      fileName: "rights.md",
      format: "markdown",
      content,
      byteSize: new TextEncoder().encode(content).byteLength,
      sourceUrl: "https://example.com/source",
      publisher: "Example Press",
      publicationYear: 2024,
      acquiredAt: "2026-07-31T16:00:00.000Z"
    });
    const rights = await knowledge.getSourceRights(document.id);
    expect(rights).toMatchObject({
      documentId: document.id,
      documentContentHash: document.contentHash,
      origin: "user_import",
      source: {
        sourceUrl: "https://example.com/source",
        publisher: "Example Press",
        publicationYear: 2024,
        acquiredAt: "2026-07-31T16:00:00.000Z"
      },
      rights: {
        status: "user_unverified",
        workStatus: "unknown",
        editionStatus: "unknown",
        distributionPolicy: "local_private_only"
      },
      review: { status: "unreviewed", attestations: [] },
      editVersion: 1
    });
    expect(await knowledge.listSourceRights()).toEqual([rights]);

    const updated = await knowledge.updateUserSourceRights(document.id, {
      expectedEditVersion: 1,
      publisher: "Corrected Press",
      copyrightNotice: "User supplied; legal status not verified.",
      evidenceRefs: ["https://example.com/rights"],
      reviewNote: "Candidate metadata only",
      // A JavaScript caller cannot smuggle a public-distribution decision through this narrow API.
      rights: { status: "public_domain_verified", distributionPolicy: "redistributable" }
    } as Parameters<typeof knowledge.updateUserSourceRights>[1] & { rights: unknown });
    expect(updated).toMatchObject({
      origin: "user_import",
      source: { publisher: "Corrected Press" },
      rights: {
        status: "user_unverified",
        workStatus: "unknown",
        editionStatus: "unknown",
        distributionPolicy: "local_private_only",
        copyrightNotice: "User supplied; legal status not verified.",
        evidenceRefs: ["https://example.com/rights"]
      },
      review: { status: "unreviewed", attestations: [], note: "Candidate metadata only" },
      editVersion: 2
    });
    await expect(knowledge.updateUserSourceRights(document.id, {
      expectedEditVersion: 1,
      publisher: "Stale edit"
    })).rejects.toMatchObject({ code: "EDIT_VERSION_CONFLICT" });

    await knowledge.deleteDocument(document.id);
    expect(await database.sourceRights.get(document.id)).toBeUndefined();
  });

  it("fails closed when a rights record is orphaned instead of hiding it from the ledger", async () => {
    const { database, knowledge } = repositories();
    const document = await createDocument(knowledge, "孤儿审计");
    const rights = await knowledge.getSourceRights(document.id);
    if (!rights) throw new Error("fixture rights missing");
    await database.sourceRights.add({
      ...rights,
      documentId: "99999999-9999-4999-8999-999999999999"
    });
    await expect(knowledge.listSourceRights()).rejects.toMatchObject({ code: "SOURCE_RIGHTS_CONFLICT" });
  });

  it("rolls back the document when its rights ledger write fails", async () => {
    const { database, knowledge } = repositories();
    vi.spyOn(database.sourceRights, "add").mockRejectedValueOnce(new Error("rights write failed"));
    await expect(createDocument(knowledge, "rights-rollback")).rejects.toThrow("rights write failed");
    expect(await database.knowledgeDocuments.count()).toBe(0);
    expect(await database.sourceRights.count()).toBe(0);
  });
});

describe("KnowledgeRepository local knowledge integrity snapshot", () => {
  it("verifies all three knowledge stores in one readonly snapshot with one sequential content digest per document", async () => {
    const { database, knowledge } = repositories(13);
    const firstDocument = await createDocument(knowledge, "boot-integrity-a");
    const standaloneDocument = await createDocument(knowledge, "boot-integrity-b");
    await knowledge.createCitation({
      documentId: firstDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "first citation",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    await knowledge.createCitation({
      documentId: firstDocument.id,
      locator: { sectionId: "section-2", startLine: 4, endLine: 4 },
      annotation: "second citation",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.month.ganzhi.v1" }]
    });
    const countsBefore = {
      documents: await database.knowledgeDocuments.count(),
      rights: await database.sourceRights.count(),
      citations: await database.citations.count()
    };
    const observedReadTransactions = new Set<NonNullable<typeof Dexie.currentTransaction>>();
    const readsWithoutTransaction: string[] = [];
    const readCounts = { documents: 0, rights: 0, citations: 0 };
    const observeRead = <T,>(partition: keyof typeof readCounts) => (record: T): T => {
      readCounts[partition] += 1;
      const transaction = Dexie.currentTransaction;
      if (transaction) observedReadTransactions.add(transaction);
      else readsWithoutTransaction.push(partition);
      return record;
    };
    const observeDocumentRead = observeRead<typeof firstDocument>("documents");
    const observeRightsRead = observeRead<SourceRightsRecord>("rights");
    const observeCitationRead = observeRead<CitationRecord>("citations");
    database.knowledgeDocuments.hook("reading", observeDocumentRead);
    database.sourceRights.hook("reading", observeRightsRead);
    database.citations.hook("reading", observeCitationRead);
    const transactionSpy = vi.spyOn(database, "transaction");
    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    const digestedTexts: string[] = [];
    let activeDigests = 0;
    let maximumActiveDigests = 0;
    const digestSpy = vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation(async (algorithm, data) => {
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      digestedTexts.push(new TextDecoder().decode(bytes));
      activeDigests += 1;
      maximumActiveDigests = Math.max(maximumActiveDigests, activeDigests);
      try {
        await Promise.resolve();
        return await originalDigest(algorithm, data);
      } finally {
        activeDigests -= 1;
      }
    });

    try {
      const snapshot = await knowledge.verifyLocalKnowledgeIntegritySnapshot();

      expect(snapshot.counts).toEqual({ knowledgeDocuments: 2, sourceRights: 2, citations: 2 });
      expect(snapshot.profile).toMatchObject({
        transactionMode: "readonly",
        storeNames: ["knowledgeDocuments", "sourceRights", "citations"],
        documentContentDigestPolicy: "one_recomputation_per_unique_document_sequential"
      });
      expect(snapshot.boundary).toEqual({
        atomicStorageSnapshotVerified: true,
        completeCoverageVerified: true,
        maximumDocumentContentDigestConcurrency: 1,
        uniqueDocumentContentHashesVerified: true,
        sourceRightsOneToOneVerified: true,
        citationDocumentBindingVerified: true,
        citationQuoteVerified: true,
        citationTargetKeysVerified: true,
        storageMutationPerformed: false,
        authenticityClaimed: false,
        expertTruthClaimed: false,
        publicReleaseAuthorized: false
      });
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.profile)).toBe(true);
      expect(Object.isFrozen(snapshot.profile.storeNames)).toBe(true);
      expect(Object.isFrozen(snapshot.counts)).toBe(true);
      expect(Object.isFrozen(snapshot.boundary)).toBe(true);
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      const transaction = transactionSpy.mock.calls[0] as unknown[];
      expect(transaction[0]).toBe("r");
      expect((transaction[1] as Array<{ name: string }>).map((table) => table.name)).toEqual([
        "knowledgeDocuments",
        "sourceRights",
        "citations"
      ]);
      expect(readsWithoutTransaction).toEqual([]);
      expect(observedReadTransactions.size).toBe(1);
      expect(readCounts).toEqual({ documents: 2, rights: 2, citations: 2 });
      expect([...digestedTexts].sort()).toEqual([firstDocument.content, standaloneDocument.content].sort());
      expect(maximumActiveDigests).toBe(1);
      expect({
        documents: await database.knowledgeDocuments.count(),
        rights: await database.sourceRights.count(),
        citations: await database.citations.count()
      }).toEqual(countsBefore);
    } finally {
      database.knowledgeDocuments.hook("reading").unsubscribe(observeDocumentRead);
      database.sourceRights.hook("reading").unsubscribe(observeRightsRead);
      database.citations.hook("reading").unsubscribe(observeCitationRead);
      digestSpy.mockRestore();
      transactionSpy.mockRestore();
    }
  });

  it("keeps a cross-connection replacement behind the active readonly knowledge snapshot", async () => {
    const { database, knowledge } = repositories(13);
    const originalDocument = await createDocument(knowledge, "cross-window-original");
    const replacementSeed = await createDocument(knowledge, "cross-window-replacement");
    const replacementRightsSeed = await knowledge.getSourceRights(replacementSeed.id);
    if (!replacementRightsSeed) throw new Error("fixture rights missing");
    await knowledge.deleteDocument(replacementSeed.id);

    const replacementDocument = {
      ...replacementSeed,
      id: originalDocument.id
    };
    const replacementRights = {
      ...replacementRightsSeed,
      documentId: originalDocument.id
    };
    const writerDatabase = new ResearchDatabase(database.name, { targetSchema: 13 });
    databases.push(writerDatabase);
    await writerDatabase.open();

    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    const digestedTexts: string[] = [];
    let resolveDigestEntered: (() => void) | undefined;
    let resolveDigestRelease: (() => void) | undefined;
    const digestEntered = new Promise<void>((resolve) => { resolveDigestEntered = resolve; });
    const digestRelease = new Promise<void>((resolve) => { resolveDigestRelease = resolve; });
    let blockNextDigest = true;
    const digestSpy = vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation(async (algorithm, data) => {
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      digestedTexts.push(new TextDecoder().decode(bytes));
      if (blockNextDigest) {
        blockNextDigest = false;
        resolveDigestEntered?.();
        await digestRelease;
      }
      return originalDigest(algorithm, data);
    });

    try {
      const snapshotPromise = knowledge.verifyLocalKnowledgeIntegritySnapshot();
      await digestEntered;

      let resolveWriterAttempted: (() => void) | undefined;
      const writerAttempted = new Promise<void>((resolve) => { resolveWriterAttempted = resolve; });
      const writerPromise = writerDatabase.transaction(
        "rw",
        [writerDatabase.knowledgeDocuments, writerDatabase.sourceRights],
        async () => {
          resolveWriterAttempted?.();
          await writerDatabase.knowledgeDocuments.put(replacementDocument);
          await writerDatabase.sourceRights.put(replacementRights);
        }
      );
      await writerAttempted;
      resolveDigestRelease?.();

      const [snapshot] = await Promise.all([snapshotPromise, writerPromise]);
      expect(snapshot.counts).toEqual({ knowledgeDocuments: 1, sourceRights: 1, citations: 0 });
      expect(digestedTexts).toEqual([originalDocument.content]);

      const freshSnapshot = await Dexie.ignoreTransaction(
        // The writer-attempt barrier resolves inside the second connection's
        // Dexie zone. Escape that test-only zone before starting a fresh probe.
        () => knowledge.verifyLocalKnowledgeIntegritySnapshot()
      );
      expect(freshSnapshot).toMatchObject({
        counts: { knowledgeDocuments: 1, sourceRights: 1, citations: 0 },
        boundary: { atomicStorageSnapshotVerified: true }
      });
      expect(digestedTexts).toEqual([originalDocument.content, replacementDocument.content]);
    } finally {
      resolveDigestRelease?.();
      digestSpy.mockRestore();
    }
  });

  it("requires an explicitly opened database and accepts a standalone document without citations", async () => {
    const unopened = repositories(13);
    await expect(unopened.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      code: "KNOWLEDGE_INTEGRITY_DATABASE_NOT_OPEN"
    });
    expect(unopened.database.isOpen()).toBe(false);

    const standalone = repositories(13);
    await createDocument(standalone.knowledge, "standalone-valid");
    await expect(standalone.knowledge.verifyLocalKnowledgeIntegritySnapshot()).resolves.toMatchObject({
      counts: { knowledgeDocuments: 1, sourceRights: 1, citations: 0 },
      boundary: { completeCoverageVerified: true }
    });
  });

  it("fails closed for missing, orphaned, hash-mismatched and origin-mismatched rights", async () => {
    const missing = repositories(13);
    const missingDocument = await createDocument(missing.knowledge, "missing-rights");
    await missing.database.sourceRights.delete(missingDocument.id);
    await expect(missing.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      code: "SOURCE_RIGHTS_CONFLICT"
    });

    const orphaned = repositories(13);
    const orphanedDocument = await createDocument(orphaned.knowledge, "orphaned-rights");
    const orphanedRights = await orphaned.knowledge.getSourceRights(orphanedDocument.id);
    if (!orphanedRights) throw new Error("fixture rights missing");
    await orphaned.database.sourceRights.delete(orphanedDocument.id);
    await orphaned.database.sourceRights.add({
      ...orphanedRights,
      documentId: "91000000-0000-4000-8000-000000000001"
    });
    expect(await orphaned.database.sourceRights.count()).toBe(
      await orphaned.database.knowledgeDocuments.count()
    );
    await expect(orphaned.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      code: "SOURCE_RIGHTS_CONFLICT"
    });

    const hashMismatch = repositories(13);
    const hashDocument = await createDocument(hashMismatch.knowledge, "rights-hash-mismatch");
    const hashRights = await hashMismatch.knowledge.getSourceRights(hashDocument.id);
    if (!hashRights) throw new Error("fixture rights missing");
    await hashMismatch.database.sourceRights.put({ ...hashRights, documentContentHash: "0".repeat(64) });
    await expect(hashMismatch.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      code: "SOURCE_RIGHTS_CONFLICT"
    });

    const originMismatch = repositories(13);
    const originDocument = await createDocument(originMismatch.knowledge, "rights-origin-mismatch");
    const originRights = await originMismatch.knowledge.getSourceRights(originDocument.id);
    if (!originRights) throw new Error("fixture rights missing");
    await originMismatch.database.sourceRights.put({
      ...originRights,
      origin: "bundled",
      rights: {
        ...originRights.rights,
        status: "project_original_verified",
        workStatus: "project_original_verified",
        editionStatus: "project_original_verified",
        basis: "project_authored",
        copyrightNotice: "Project-authored fixture",
        evidenceRefs: ["https://example.com/project-authored-fixture"],
        distributionPolicy: "redistributable"
      },
      review: {
        status: "double_reviewed",
        attestations: [
          { reviewerId: "rights-reviewer-a", reviewedAt: originRights.updatedAt, note: "work" },
          { reviewerId: "rights-reviewer-b", reviewedAt: originRights.updatedAt, note: "edition" }
        ],
        note: "fixture only"
      }
    });
    await expect(originMismatch.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      code: "SOURCE_RIGHTS_CONFLICT"
    });
  });

  it("fails closed for citation binding, quote, target-key and full-table coverage corruption", async () => {
    const binding = repositories(13);
    const bindingDocument = await createDocument(binding.knowledge, "citation-binding");
    const bindingCitation = await binding.knowledge.createCitation({
      documentId: bindingDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "binding",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    await binding.database.citations.put({ ...bindingCitation, documentContentHash: "0".repeat(64) });
    expect(await binding.database.citations.where("documentId").equals(bindingDocument.id).count()).toBe(1);
    await expect(binding.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      name: "KnowledgeIntegrityError",
      mismatch: "documentContentHash"
    });

    const quote = repositories(13);
    const quoteDocument = await createDocument(quote.knowledge, "citation-quote");
    const quoteCitation = await quote.knowledge.createCitation({
      documentId: quoteDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "quote",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    await quote.database.citations.put({ ...quoteCitation, quote: "篡改摘录" });
    await expect(quote.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      name: "KnowledgeIntegrityError",
      mismatch: "quote"
    });

    const targetKeys = repositories(13);
    const targetDocument = await createDocument(targetKeys.knowledge, "citation-target-keys");
    const targetCitation = await targetKeys.knowledge.createCitation({
      documentId: targetDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "target keys",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    await targetKeys.database.citations.put({
      ...targetCitation,
      targetKeys: ["evidence_subject:bazi.pillar.month.ganzhi.v1"]
    });
    await expect(targetKeys.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      name: "ZodError"
    });

    const orphaned = repositories(13);
    const orphanedDocument = await createDocument(orphaned.knowledge, "citation-orphaned");
    const orphanedCitation = await orphaned.knowledge.createCitation({
      documentId: orphanedDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "orphaned",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    await orphaned.database.citations.put({
      ...orphanedCitation,
      documentId: "92000000-0000-4000-8000-000000000001"
    });
    await expect(orphaned.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      code: "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT"
    });

    const unindexed = repositories(13);
    const unindexedDocument = await createDocument(unindexed.knowledge, "citation-unindexed");
    const unindexedCitation = await unindexed.knowledge.createCitation({
      documentId: unindexedDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "unindexed",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    const malformedCitation = { ...unindexedCitation } as Record<string, unknown>;
    delete malformedCitation.documentId;
    await unindexed.database.citations.put(malformedCitation as unknown as CitationRecord);
    await expect(unindexed.knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      code: "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT"
    });
  });

  it("retains the first citation integrity error while completing the indexed cursor traversal", async () => {
    const { database, knowledge } = repositories(13);
    const document = await createDocument(knowledge, "citation-cursor-failure");
    await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "first cursor citation",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 4, endLine: 4 },
      annotation: "second cursor citation",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.month.ganzhi.v1" }]
    });
    const citationIds = await database.citations
      .where("documentId")
      .equals(document.id)
      .primaryKeys();
    const firstCitation = await database.citations.get(String(citationIds[0]));
    if (!firstCitation) throw new Error("fixture citation missing");
    await database.citations.put({ ...firstCitation, quote: "篡改摘录" });

    let citationReads = 0;
    const observeCitationRead = (record: CitationRecord): CitationRecord => {
      citationReads += 1;
      return record;
    };
    database.citations.hook("reading", observeCitationRead);
    try {
      await expect(knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
        name: "KnowledgeIntegrityError",
        mismatch: "quote"
      });
      expect(citationReads).toBe(2);
    } finally {
      database.citations.hook("reading").unsubscribe(observeCitationRead);
    }
  });

  it("rejects duplicate verified document content hashes", async () => {
    const { database, knowledge } = repositories(13);
    const document = await createDocument(knowledge, "duplicate-content-hash");
    const rights = await knowledge.getSourceRights(document.id);
    if (!rights) throw new Error("fixture rights missing");
    const duplicateId = "93000000-0000-4000-8000-000000000001";
    await database.knowledgeDocuments.put({
      ...document,
      id: duplicateId,
      title: "Duplicate content hash fixture",
      fileName: "duplicate-content-hash.md"
    });
    await database.sourceRights.put({ ...rights, documentId: duplicateId });

    await expect(knowledge.verifyLocalKnowledgeIntegritySnapshot()).rejects.toMatchObject({
      code: "KNOWLEDGE_INTEGRITY_COVERAGE_CONFLICT"
    });
  });
});

describe("KnowledgeRepository citations", () => {
  it("captures exact declarative creation input synchronously and rejects hostile shapes without invoking getters", async () => {
    const { database, knowledge } = repositories();
    const document = await createDocument(knowledge, "citation-input-capture");
    const originalInput = {
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "captured annotation",
      targets: [{ kind: "evidence_subject" as const, subjectId: "bazi.pillar.day.ganzhi.v1" }]
    };

    const pending = knowledge.createCitation(originalInput);
    originalInput.documentId = crypto.randomUUID();
    originalInput.locator.startLine = 4;
    originalInput.locator.endLine = 4;
    originalInput.annotation = "mutated after invocation";
    originalInput.targets[0]!.subjectId = "bazi.pillar.month.ganzhi.v1";

    await expect(pending).resolves.toMatchObject({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      quote: "藏干正文citation-input-capture",
      annotation: "captured annotation",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    await expect(knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 4, endLine: 4 },
      annotation: "界".repeat(20_000),
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.month.ganzhi.v1" }]
    })).resolves.toMatchObject({ annotation: "界".repeat(20_000) });

    const transactionSpy = vi.spyOn(database, "transaction");
    const getter = vi.fn(() => "must not run");
    const accessorInput = {
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    } as Record<string, unknown>;
    Object.defineProperty(accessorInput, "annotation", { enumerable: true, get: getter });

    const validInput = () => ({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "shape validation",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    const withSymbol = validInput() as Record<PropertyKey, unknown>;
    Object.defineProperty(withSymbol, Symbol("unexpected"), { enumerable: true, value: true });
    const customPrototype = Object.assign(Object.create({ inherited: true }), validInput());
    const sparseTargets = validInput();
    sparseTargets.targets = new Array(1) as typeof sparseTargets.targets;
    const cyclic = validInput() as Record<string, unknown>;
    (cyclic.locator as Record<string, unknown>).self = cyclic.locator;
    const extraRoot = { ...validInput(), unexpected: true };
    const oversizedText = { ...validInput(), unexpected: "界".repeat(256_001) };
    const oversizedNodes = { ...validInput(), unexpected: Array.from({ length: 1_001 }, () => null) };
    const excessiveDepth = { ...validInput(), unexpected: {} as Record<string, unknown> };
    let depthCursor = excessiveDepth.unexpected;
    for (let depth = 0; depth < 17; depth += 1) {
      depthCursor.next = {};
      depthCursor = depthCursor.next as Record<string, unknown>;
    }

    for (const malformed of [
      accessorInput,
      withSymbol,
      customPrototype,
      sparseTargets,
      cyclic,
      extraRoot,
      oversizedText,
      oversizedNodes,
      excessiveDepth
    ]) {
      await expect(knowledge.createCitation(malformed as never)).rejects.toBeInstanceOf(TypeError);
    }
    expect(getter).not.toHaveBeenCalled();
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("creates a mutable Citation with one document digest inside the exact target-aware write transaction", async () => {
    const { database, knowledge } = repositories();
    const document = await createDocument(knowledge, "citation-single-digest");
    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    const digestedDocumentContents: string[] = [];
    let activeDocumentDigests = 0;
    let maximumActiveDocumentDigests = 0;
    const digestSpy = vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation(async (algorithm, data) => {
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      const text = new TextDecoder().decode(bytes);
      const isDocumentContent = text === document.content;
      if (isDocumentContent) {
        digestedDocumentContents.push(text);
        activeDocumentDigests += 1;
        maximumActiveDocumentDigests = Math.max(maximumActiveDocumentDigests, activeDocumentDigests);
      }
      try {
        await Promise.resolve();
        return await originalDigest(algorithm, data);
      } finally {
        if (isDocumentContent) activeDocumentDigests -= 1;
      }
    });
    const transactionSpy = vi.spyOn(database, "transaction");

    try {
      const citation = await knowledge.createCitation({
        documentId: document.id,
        locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
        annotation: "single digest",
        targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
      });

      expect(digestedDocumentContents).toEqual([document.content]);
      expect(maximumActiveDocumentDigests).toBe(1);
      expect(Object.isFrozen(citation)).toBe(false);
      expect(Object.isFrozen(citation.targets)).toBe(false);
      citation.annotation = "caller-owned mutable result";
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      const transaction = transactionSpy.mock.calls[0] as unknown[];
      expect(transaction[0]).toBe("rw");
      expect((transaction[1] as Array<{ name: string }>).map((table) => table.name)).toEqual([
        "knowledgeDocuments",
        "citations",
        "cases",
        "revisions",
        "researchNotes",
        "events"
      ]);
    } finally {
      digestSpy.mockRestore();
      transactionSpy.mockRestore();
    }
  });

  it("lists Citations in one readonly snapshot with one sequential digest per unique document", async () => {
    const { database, knowledge } = repositories();
    const firstDocument = await createDocument(knowledge, "citation-list-a");
    const secondDocument = await createDocument(knowledge, "citation-list-b");
    const standaloneDocument = await createDocument(knowledge, "citation-list-standalone");
    for (const [document, subjectId] of [
      [firstDocument, "bazi.pillar.day.ganzhi.v1"],
      [firstDocument, "bazi.pillar.month.ganzhi.v1"],
      [secondDocument, "bazi.pillar.year.ganzhi.v1"]
    ] as const) {
      await knowledge.createCitation({
        documentId: document.id,
        locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
        annotation: subjectId,
        targets: [{ kind: "evidence_subject", subjectId }]
      });
    }

    const listedDocumentContents = new Set([firstDocument.content, secondDocument.content]);
    const knownDocumentContents = new Set([...listedDocumentContents, standaloneDocument.content]);
    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    const digestedDocumentContents: string[] = [];
    let activeDocumentDigests = 0;
    let maximumActiveDocumentDigests = 0;
    const digestSpy = vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation(async (algorithm, data) => {
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      const text = new TextDecoder().decode(bytes);
      const isDocumentContent = knownDocumentContents.has(text);
      if (isDocumentContent) {
        digestedDocumentContents.push(text);
        activeDocumentDigests += 1;
        maximumActiveDocumentDigests = Math.max(maximumActiveDocumentDigests, activeDocumentDigests);
      }
      try {
        await Promise.resolve();
        return await originalDigest(algorithm, data);
      } finally {
        if (isDocumentContent) activeDocumentDigests -= 1;
      }
    });
    const transactionSpy = vi.spyOn(database, "transaction");

    try {
      const listed = await knowledge.listCitations();
      expect(listed).toHaveLength(3);
      expect([...digestedDocumentContents].sort()).toEqual([...listedDocumentContents].sort());
      expect(maximumActiveDocumentDigests).toBe(1);
      expect(listed.every((citation) => !Object.isFrozen(citation))).toBe(true);
      expect(transactionSpy).toHaveBeenCalledTimes(1);
      expect(transactionSpy.mock.calls[0]?.[0]).toBe("r");
      expect(((transactionSpy.mock.calls[0]?.[1]) as unknown as Array<{ name: string }>).map((table) => table.name))
        .toEqual(["citations", "knowledgeDocuments"]);

      digestedDocumentContents.length = 0;
      maximumActiveDocumentDigests = 0;
      const byDocument = await knowledge.listCitationsByDocument(firstDocument.id);
      expect(byDocument).toHaveLength(2);
      expect(digestedDocumentContents).toEqual([firstDocument.content]);
      expect(maximumActiveDocumentDigests).toBe(1);

      digestedDocumentContents.length = 0;
      maximumActiveDocumentDigests = 0;
      const byTargetKey = await knowledge.listCitationsByTargetKey(
        "evidence_subject:bazi.pillar.day.ganzhi.v1"
      );
      expect(byTargetKey).toHaveLength(1);
      expect(digestedDocumentContents).toEqual([firstDocument.content]);
      expect(maximumActiveDocumentDigests).toBe(1);

      digestedDocumentContents.length = 0;
      maximumActiveDocumentDigests = 0;
      await expect(knowledge.listCitationsByDocument(standaloneDocument.id)).resolves.toEqual([]);
      expect(digestedDocumentContents).toEqual([standaloneDocument.content]);
      expect(maximumActiveDocumentDigests).toBe(1);
      await expect(knowledge.listCitationsByDocument(crypto.randomUUID()))
        .rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
      expect(transactionSpy.mock.calls.every((call) => call[0] === "r")).toBe(true);
      expect(transactionSpy.mock.calls.every((call) =>
        ((call[1]) as unknown as Array<{ name: string }>).map((table) => table.name).join(",")
          === "citations,knowledgeDocuments"
      )).toBe(true);
    } finally {
      digestSpy.mockRestore();
      transactionSpy.mockRestore();
    }
  });

  it("does not impose the factory batch limit when listing more than 1,024 Citations", async () => {
    const { database, knowledge } = repositories();
    const document = await createDocument(knowledge, "citation-list-1025");
    const base = await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "batch compatibility",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    await database.citations.clear();
    await database.citations.bulkAdd(Array.from({ length: 1_025 }, (_, index) => ({
      ...base,
      id: `40000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
    })));

    const listed = await knowledge.listCitations();
    expect(listed).toHaveLength(1_025);
    expect(listed.every((citation) => !Object.isFrozen(citation))).toBe(true);
  });

  it("rejects malformed expected snapshot digests before opening a database transaction", async () => {
    const { database, knowledge } = repositories(13);
    const transactionSpy = vi.spyOn(database, "transaction");

    for (const expectedSnapshotSha256 of [
      "A".repeat(64),
      "0".repeat(63),
      ` ${"0".repeat(64)}`
    ]) {
      await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(
        "bazi.pillar.day.ganzhi.v1",
        { expectedSnapshotSha256 }
      )).rejects.toBeInstanceOf(TypeError);
    }
    expect(transactionSpy).not.toHaveBeenCalled();
    expect(database.isOpen()).toBe(false);
  });

  it("does not implicitly open or create a database for a valid snapshot request", async () => {
    const { database, knowledge } = repositories(13);
    const transactionSpy = vi.spyOn(database, "transaction");

    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(
      "bazi.pillar.day.ganzhi.v1"
    )).rejects.toMatchObject({ code: "SOURCE_AWARE_RETRIEVAL_DATABASE_NOT_OPEN" });
    expect(database.isOpen()).toBe(false);
    expect(transactionSpy).not.toHaveBeenCalled();
  });

  it("rejects accessor options without executing them", async () => {
    const { database, knowledge } = repositories(13);
    const getter = vi.fn(() => "0".repeat(64));
    const options = Object.defineProperty({}, "expectedSnapshotSha256", { get: getter });

    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(
      "bazi.pillar.day.ganzhi.v1",
      options
    )).rejects.toBeInstanceOf(TypeError);
    expect(getter).not.toHaveBeenCalled();
    expect(database.isOpen()).toBe(false);
  });

  it("returns a deterministic fail-closed snapshot for a registered subject with no citations", async () => {
    const { database, knowledge } = repositories(13);
    const subjectId = "bazi.pillar.day.ganzhi.v1";
    await database.open();

    const first = await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId);
    const second = await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, {
      expectedSnapshotSha256: first.storageSnapshot.snapshotSha256
    });

    expect(second).toEqual(first);
    expect(first.packet).toMatchObject({
      status: "blocked_no_verified_citations",
      sourceMultiplicity: "none",
      candidateCitationIds: [],
      verifiedCitationIds: [],
      rejectedCitationIds: [],
      items: [],
      boundary: {
        externalPurposeRightsReviewed: false,
        privacyReviewPerformed: false,
        externalProviderUseAuthorized: false,
        downstreamExternalUseGate: "blocked",
        networkTransmissionPerformed: false,
        networkTransmissionAuthorized: false,
        publicExportAuthorized: false
      }
    });
    expect(first.storageSnapshot.bindings).toMatchObject({
      matchingCitationIds: [],
      candidateCitationIds: [],
      verifiedCitationIds: [],
      rejectedCitationIds: [],
      documentIds: [],
      sourceRightsDocumentIds: []
    });
  });

  it("validates stable evidence-subject targets, persists sorted target keys and queries the multi-entry index", async () => {
    const { knowledge } = repositories();
    const document = await createDocument(knowledge, "evidence-subject");
    const subjectId = "bazi.pillar.day.ganzhi.v1";
    const citation = await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "Global evidence subject",
      targets: [{ kind: "evidence_subject", subjectId }]
    });

    expect(citation.targetKeys).toEqual([`evidence_subject:${subjectId}`]);
    expect(citation.reviewAttestations).toEqual([]);
    expect(citation.decisionNote).toBe("");
    expect(await knowledge.listCitationsByTargetKey(`evidence_subject:${subjectId}`)).toEqual([citation]);
    expect(await knowledge.listCitationsByTarget({ kind: "evidence_subject", subjectId })).toEqual([citation]);
    expect(await knowledge.listCitationsByTargetKey("evidence_subject:bazi.pillar.day.missing.v1")).toEqual([]);

    await expect(knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "Invalid subject identifier",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.missing.v1" }]
    })).rejects.toMatchObject({ code: "TARGET_NOT_FOUND" });
  });

  it("builds one local-review target snapshot atomically and rejects a stale digest on reread", async () => {
    const { database, knowledge } = repositories(13);
    const document = await createDocument(knowledge, "source-aware-snapshot");
    const subjectId = "bazi.pillar.day.ganzhi.v1";
    const target = { kind: "evidence_subject" as const, subjectId };
    const createTargetCitation = (annotation: string) => knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation,
      targets: [target]
    });
    const [candidate, verifiedBase, rejectedBase] = await Promise.all([
      createTargetCitation("candidate"),
      createTargetCitation("verified"),
      createTargetCitation("rejected")
    ]);
    const reviewedAt = "2026-08-01T00:00:00.000Z";
    const verified: CitationRecord = {
      ...verifiedBase,
      status: "verified",
      reviewAttestations: [
        { reviewerId: "citation-reviewer-a", reviewedAt, note: "定位复核" },
        { reviewerId: "citation-reviewer-b", reviewedAt, note: "引用复核" }
      ],
      decisionNote: "仅确认当前工程引用定位闭合。",
      editVersion: verifiedBase.editVersion + 1
    };
    const rejected: CitationRecord = {
      ...rejectedBase,
      status: "rejected",
      decisionNote: "当前引用不进入可见检索正文。",
      editVersion: rejectedBase.editVersion + 1
    };
    await database.citations.bulkPut([verified, rejected]);
    const unrelated = await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 4, endLine: 4 },
      annotation: "different target",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.month.ganzhi.v1" }]
    });
    const countsBefore = {
      documents: await database.knowledgeDocuments.count(),
      citations: await database.citations.count(),
      rights: await database.sourceRights.count()
    };
    const recordsBefore = {
      documents: await database.knowledgeDocuments.orderBy("id").toArray(),
      citations: await database.citations.orderBy("id").toArray(),
      rights: await database.sourceRights.orderBy("documentId").toArray()
    };
    const transactionSpy = vi.spyOn(database, "transaction");
    database.lockReleaseWrites();

    const first = await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    const firstTransaction = transactionSpy.mock.calls[0] as unknown[];
    expect(firstTransaction[0]).toBe("r");
    expect((firstTransaction[1] as Array<{ name: string }>).map((table) => table.name)).toEqual([
      "citations",
      "knowledgeDocuments",
      "sourceRights"
    ]);
    transactionSpy.mockClear();
    const matchingIds = [candidate.id, verified.id, rejected.id]
      .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
    expect(first.packet.request.useMode).toBe("local_review");
    expect(first.packet.status).toBe("ready_for_local_review_with_unreviewed_sources");
    expect(first.packet.candidateCitationIds).toEqual([candidate.id]);
    expect(first.packet.verifiedCitationIds).toEqual([verified.id]);
    expect(first.packet.rejectedCitationIds).toEqual([rejected.id]);
    expect(first.packet.items.map((item) => item.citationId)).toEqual([verified.id]);
    expect(first.packet.counts).toMatchObject({ matching: 3, candidate: 1, verified: 1, rejected: 1, emitted: 1 });
    expect(first.packet.boundary).toMatchObject({
      atomicStorageSnapshotVerified: false,
      mutationEpochRevalidationPerformed: false,
      externalProviderUseAuthorized: false,
      downstreamExternalUseGate: "blocked",
      networkTransmissionPerformed: false
    });
    expect(first.storageSnapshot).toMatchObject({
      profile: {
        useMode: "local_review",
        citationDiscovery: "bounded_full_table_schema_audit_then_canonical_target_filter",
        maxAuditedCitationRecords: 10_000,
        citationAuditBatchSize: 64,
        maxAuditedCitationJsonCharacters: 24_000_000,
        maxMatchingCitationRecords: 256,
        maxVerifiedCitationRecords: 64,
        maxCapturedPacketInputJsonCharacters: 24_000_000,
        maxCapturedPacketInputValueNodes: 100_000,
        digestDomain: "hakimi.storage.local_knowledge_source_aware_retrieval_snapshot.sha256/1",
        transactionMode: "readonly",
        storeNames: ["citations", "knowledgeDocuments", "sourceRights"]
      },
      target: {
        evidenceSubjectId: subjectId,
        targetKey: `evidence_subject:${subjectId}`,
        registryVersion: first.packet.request.evidenceSubject.registryVersion
      },
      database: { targetSchemaVersion: 13 },
      bindings: {
        matchingCitationIds: matchingIds,
        candidateCitationIds: [candidate.id],
        verifiedCitationIds: [verified.id],
        rejectedCitationIds: [rejected.id],
        documentIds: [document.id],
        sourceRightsDocumentIds: [document.id],
        packetProjectionVersion: first.packet.profile.projectionVersion,
        packetPayloadSha256: first.packet.integrity.payloadSha256,
        matchingSourceSetSha256: first.packet.sourceSet.matchingSourceSetSha256
      },
      boundary: {
        atomicStorageSnapshotVerified: true,
        nestedPacketAtomicStorageSnapshotVerified: false,
        mutationEpochRevalidationPerformed: false,
        nestedPacketMutationEpochRevalidationPerformed: false,
        externalProviderUseAuthorized: false,
        externalPurposeRightsReviewed: false,
        privacyReviewPerformed: false,
        sourceTextInstructionAuthority: false,
        promptInjectionScreeningPerformed: false,
        citationSetConflictReviewPerformed: false,
        citationSetConflictStatus: "unassessed",
        networkTransmissionPerformed: false,
        networkTransmissionAuthorized: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        authenticityClaimed: false,
        snapshotCallStorageMutationPerformed: false,
        snapshotCallSchemaOrReleaseIdentityMutationPerformed: false
      }
    });
    expect(first.storageSnapshot.bindings.matchingCitationIds).not.toContain(unrelated.id);
    const { snapshotSha256, ...snapshotPayload } = first.storageSnapshot;
    expect(await sha256Hex({
      domain: first.storageSnapshot.profile.digestDomain,
      payload: snapshotPayload
    })).toBe(snapshotSha256);
    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, {
      expectedSnapshotSha256: snapshotSha256
    })).resolves.toEqual(first);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    database.unlockReleaseWrites();
    transactionSpy.mockRestore();
    expect({
      documents: await database.knowledgeDocuments.count(),
      citations: await database.citations.count(),
      rights: await database.sourceRights.count()
    }).toEqual(countsBefore);
    expect({
      documents: await database.knowledgeDocuments.orderBy("id").toArray(),
      citations: await database.citations.orderBy("id").toArray(),
      rights: await database.sourceRights.orderBy("documentId").toArray()
    }).toEqual(recordsBefore);

    await knowledge.updateUserSourceRights(document.id, {
      expectedEditVersion: 1,
      publisher: "Snapshot changed after capture"
    });
    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, {
      expectedSnapshotSha256: snapshotSha256
    })).rejects.toMatchObject({ code: "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_STALE" });
    const fresh = await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId);
    expect(fresh.storageSnapshot.snapshotSha256).not.toBe(snapshotSha256);
    expect(fresh.packet.sourceSet.matchingSourceSetSha256)
      .not.toBe(first.packet.sourceSet.matchingSourceSetSha256);
    expect(fresh.packet.boundary.atomicStorageSnapshotVerified).toBe(false);
    expect(fresh.packet.boundary.mutationEpochRevalidationPerformed).toBe(false);

    const mutableOptions: { expectedSnapshotSha256?: string } = {
      expectedSnapshotSha256: snapshotSha256
    };
    const staleRead = knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, mutableOptions);
    mutableOptions.expectedSnapshotSha256 = undefined;
    await expect(staleRead).rejects.toMatchObject({ code: "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_STALE" });

    await knowledge.deleteCitation(candidate.id);
    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, {
      expectedSnapshotSha256: fresh.storageSnapshot.snapshotSha256
    })).rejects.toMatchObject({ code: "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_STALE" });
    const afterCandidateDeletion = await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId);
    expect(afterCandidateDeletion.storageSnapshot.snapshotSha256)
      .not.toBe(fresh.storageSnapshot.snapshotSha256);
    expect(afterCandidateDeletion.storageSnapshot.bindings.matchingCitationIds)
      .not.toContain(candidate.id);
  });

  it("fails closed when a citation target index no longer matches its canonical targets", async () => {
    const { database, knowledge } = repositories(13);
    const document = await createDocument(knowledge, "source-aware-index-mismatch");
    const subjectId = "bazi.pillar.day.ganzhi.v1";
    const citation = await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "index mismatch",
      targets: [{ kind: "evidence_subject", subjectId }]
    });
    await database.citations.put({
      ...citation,
      targetKeys: ["evidence_subject:bazi.pillar.month.ganzhi.v1"]
    });
    const corrupted = await database.citations.get(citation.id);
    expect(corrupted?.targets).toEqual([{ kind: "evidence_subject", subjectId }]);
    expect(corrupted?.targetKeys).toEqual([
      "evidence_subject:bazi.pillar.month.ganzhi.v1"
    ]);
    expect(() => citationRecordSchema.parse(corrupted)).toThrow();

    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId))
      .rejects.toMatchObject({ name: "ZodError" });
  });

  it("rejects an oversized matching citation set before loading any document body", async () => {
    const { database, knowledge } = repositories(13);
    const document = await createDocument(knowledge, "source-aware-matching-limit");
    const subjectId = "bazi.pillar.day.ganzhi.v1";
    const base = await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "matching limit",
      targets: [{ kind: "evidence_subject", subjectId }]
    });
    await database.citations.delete(base.id);
    await database.citations.bulkPut(Array.from({ length: 257 }, (_, index) => ({
      ...base,
      id: `30000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
    })));
    const documentReadSpy = vi.spyOn(database.knowledgeDocuments, "get");

    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId))
      .rejects.toMatchObject({ code: "SOURCE_AWARE_RETRIEVAL_RESOURCE_LIMIT_EXCEEDED" });
    expect(documentReadSpy).not.toHaveBeenCalled();
  });

  it("normalizes a missing source record during digest revalidation without returning the old packet", async () => {
    const { database, knowledge } = repositories(13);
    const document = await createDocument(knowledge, "source-aware-revalidation-missing-rights");
    const subjectId = "bazi.pillar.day.ganzhi.v1";
    await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "missing rights after capture",
      targets: [{ kind: "evidence_subject", subjectId }]
    });
    const captured = await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId);
    await database.sourceRights.delete(document.id);

    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, {
      expectedSnapshotSha256: captured.storageSnapshot.snapshotSha256
    })).rejects.toMatchObject({
      code: "SOURCE_AWARE_RETRIEVAL_SNAPSHOT_REVALIDATION_FAILED"
    });
    await expect(knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId))
      .rejects.toMatchObject({ code: "SOURCE_RIGHTS_NOT_FOUND" });
  });

  describe("local citation review workset snapshot", () => {
    const subjectId = "bazi.pillar.day.ganzhi.v1";
    const reviewedAt = "2026-08-01T00:00:00.000Z";

    async function createReviewCitation(
      database: ResearchDatabase,
      knowledge: KnowledgeRepository,
      document: Awaited<ReturnType<typeof createDocument>>,
      status: "candidate" | "verified" | "rejected",
      suffix: string,
      lineNumber = 3
    ): Promise<CitationRecord> {
      const created = await knowledge.createCitation({
        documentId: document.id,
        locator: { sectionId: "section-2", startLine: lineNumber, endLine: lineNumber },
        annotation: `workset-${status}-${suffix}`,
        targets: [{ kind: "evidence_subject", subjectId }]
      });
      if (status === "candidate") return created;

      const reviewed: CitationRecord = {
        ...created,
        status,
        reviewAttestations: status === "verified"
          ? [
              { reviewerId: `workset-reviewer-a-${suffix}`, reviewedAt, note: "定位复核" },
              { reviewerId: `workset-reviewer-b-${suffix}`, reviewedAt, note: "引用复核" }
            ]
          : [],
        decisionNote: status === "verified"
          ? "仅确认当前工程引用定位闭合。"
          : "当前引用不进入可见检索正文。",
        editVersion: created.editVersion + 1
      };
      await database.citations.put(reviewed);
      return reviewed;
    }

    it("derives packet and inventory from one private capture and binds all four public layers", async () => {
      const { database, knowledge } = repositories(13);
      const document = await createDocument(knowledge, "citation-review-workset-binding");
      const firstCitation = await createReviewCitation(
        database,
        knowledge,
        document,
        "verified",
        "binding-a",
        3
      );
      const secondCitation = await createReviewCitation(
        database,
        knowledge,
        document,
        "verified",
        "binding-b",
        4
      );
      const countsBefore = {
        documents: await database.knowledgeDocuments.count(),
        citations: await database.citations.count(),
        rights: await database.sourceRights.count()
      };
      const transactionSpy = vi.spyOn(database, "transaction");
      database.lockReleaseWrites();

      const snapshot = await knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(subjectId);

      expect(transactionSpy).toHaveBeenCalledTimes(1);
      const transactionCall = transactionSpy.mock.calls[0] as unknown[];
      expect(transactionCall[0]).toBe("r");
      expect((transactionCall[1] as Array<{ name: string }>).map((table) => table.name)).toEqual([
        "citations",
        "knowledgeDocuments",
        "sourceRights"
      ]);
      database.unlockReleaseWrites();
      transactionSpy.mockRestore();
      expect({
        documents: await database.knowledgeDocuments.count(),
        citations: await database.citations.count(),
        rights: await database.sourceRights.count()
      }).toEqual(countsBefore);

      expect(Object.keys(snapshot).sort()).toEqual([
        "inventory",
        "packet",
        "storageSnapshot",
        "worksetSnapshot"
      ]);
      for (const forbiddenKey of ["packetInput", "documents", "citations", "sourceRights"]) {
        expect(Object.hasOwn(snapshot, forbiddenKey)).toBe(false);
      }
      expect(snapshot.packet.items.map((item) => item.citationId).sort()).toEqual([
        firstCitation.id,
        secondCitation.id
      ].sort());
      expect(snapshot.inventory.counts).toMatchObject({ verifiedCitations: 2, pairs: 1 });
      expect(snapshot.inventory.reviewGate.status).toBe("pending_human_review");

      expect(snapshot.storageSnapshot.bindings).toMatchObject({
        packetProjectionVersion: snapshot.packet.profile.projectionVersion,
        packetPayloadSha256: snapshot.packet.integrity.payloadSha256,
        matchingSourceSetSha256: snapshot.packet.sourceSet.matchingSourceSetSha256
      });
      expect(snapshot.inventory.binding).toMatchObject({
        evidenceSubjectId: subjectId,
        targetKey: snapshot.storageSnapshot.target.targetKey,
        registryVersion: snapshot.storageSnapshot.target.registryVersion,
        retrievalProjectionVersion: snapshot.packet.profile.projectionVersion,
        retrievalPayloadSha256: snapshot.packet.integrity.payloadSha256,
        matchingSourceSetSha256: snapshot.packet.sourceSet.matchingSourceSetSha256
      });
      expect(snapshot.worksetSnapshot.storageBinding).toEqual({
        snapshotVersion: snapshot.storageSnapshot.profile.snapshotVersion,
        snapshotSha256: snapshot.storageSnapshot.snapshotSha256
      });
      expect(snapshot.worksetSnapshot.packetBinding).toEqual({
        projectionVersion: snapshot.packet.profile.projectionVersion,
        payloadSha256: snapshot.packet.integrity.payloadSha256,
        matchingSourceSetSha256: snapshot.packet.sourceSet.matchingSourceSetSha256
      });
      expect(snapshot.worksetSnapshot.inventoryBinding).toEqual({
        projectionVersion: snapshot.inventory.profile.projectionVersion,
        payloadSha256: snapshot.inventory.integrity.payloadSha256,
        pairCount: snapshot.inventory.counts.pairs
      });
      expect(snapshot.worksetSnapshot.citationLedger).toEqual({
        matchingCitationIds: snapshot.storageSnapshot.bindings.matchingCitationIds,
        candidateCitationIds: snapshot.inventory.binding.candidateCitationIds,
        verifiedCitationIds: snapshot.inventory.binding.verifiedCitationIds,
        rejectedCitationIds: snapshot.inventory.binding.rejectedCitationIds
      });
      const { snapshotSha256, ...worksetPayload } = snapshot.worksetSnapshot;
      expect(await sha256Hex({
        domain: snapshot.worksetSnapshot.profile.digestDomain,
        payload: worksetPayload
      })).toBe(snapshotSha256);

      expect(snapshot.worksetSnapshot.reviewGate).toEqual({
        status: "pending_human_review",
        pairwiseComparisonRequired: true,
        humanReviewRequired: true,
        candidateResolutionRequired: false,
        rejectedCitationAcknowledgementRequired: false,
        downstreamExternalUseGate: "blocked"
      });
      expect(snapshot.worksetSnapshot.boundary).toEqual({
        sourceInputsCapturedInOneReadonlyTransaction: true,
        packetDerivedOnlyFromCapturedSourceInputs: true,
        inventoryDerivedOnlyFromCapturedSourceInputs: true,
        nestedPacketAtomicStorageSnapshotVerified: false,
        nestedInventoryAtomicStorageSnapshotVerified: false,
        mutationEpochRevalidationPerformed: false,
        nestedPacketMutationEpochRevalidationPerformed: false,
        nestedInventoryMutationEpochRevalidationPerformed: false,
        worksetSnapshotRawSourceRecordsCopied: false,
        bindingSidecarContainsSourceText: false,
        returnedPacketMayContainLocalSourceText: true,
        sourceTextInstructionAuthority: false,
        promptInjectionScreeningPerformed: false,
        mechanicalPairInventoryBuilt: true,
        citationSetConflictReviewPerformed: false,
        citationSetConflictStatus: "unassessed",
        chartApplicabilityAssessed: false,
        externalProviderUseAuthorized: false,
        externalPurposeRightsReviewed: false,
        privacyReviewPerformed: false,
        networkTransmissionPerformed: false,
        networkTransmissionAuthorized: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        authenticityClaimed: false,
        snapshotCallStorageMutationPerformed: false,
        snapshotCallSchemaOrReleaseIdentityMutationPerformed: false
      });
      expect(snapshot.packet.boundary).toMatchObject({
        atomicStorageSnapshotVerified: false,
        mutationEpochRevalidationPerformed: false,
        externalProviderUseAuthorized: false,
        downstreamExternalUseGate: "blocked",
        networkTransmissionPerformed: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        formalActivationAllowed: false
      });
      expect(snapshot.inventory.boundary).toMatchObject({
        atomicStorageSnapshotVerified: false,
        mutationEpochRevalidationPerformed: false,
        externalProviderUseAuthorized: false,
        networkTransmissionPerformed: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        formalActivationAllowed: false,
        result: null
      });
      expect(snapshot.storageSnapshot.boundary).toMatchObject({
        atomicStorageSnapshotVerified: true,
        nestedPacketAtomicStorageSnapshotVerified: false,
        mutationEpochRevalidationPerformed: false,
        externalProviderUseAuthorized: false,
        networkTransmissionPerformed: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        formalActivationAllowed: false
      });

      for (const value of [
        snapshot,
        snapshot.packet,
        snapshot.inventory,
        snapshot.storageSnapshot,
        snapshot.worksetSnapshot,
        snapshot.worksetSnapshot.storageBinding,
        snapshot.worksetSnapshot.citationLedger,
        snapshot.worksetSnapshot.citationLedger.verifiedCitationIds,
        snapshot.worksetSnapshot.reviewGate,
        snapshot.worksetSnapshot.boundary
      ]) {
        expect(Object.isFrozen(value)).toBe(true);
      }
    });

    it("reproduces an expected workset digest and rejects source drift as stale", async () => {
      const { database, knowledge } = repositories(13);
      const document = await createDocument(knowledge, "citation-review-workset-stale");
      await createReviewCitation(database, knowledge, document, "verified", "stale", 3);

      const first = await knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(subjectId);
      await expect(knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(subjectId, {
        expectedWorksetSnapshotSha256: first.worksetSnapshot.snapshotSha256
      })).resolves.toEqual(first);

      await knowledge.updateUserSourceRights(document.id, {
        expectedEditVersion: 1,
        publisher: "Workset source changed after capture"
      });
      await expect(knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(subjectId, {
        expectedWorksetSnapshotSha256: first.worksetSnapshot.snapshotSha256
      })).rejects.toMatchObject({ code: "CITATION_REVIEW_WORKSET_SNAPSHOT_STALE" });

      const fresh = await knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(subjectId);
      expect(fresh.worksetSnapshot.snapshotSha256).not.toBe(first.worksetSnapshot.snapshotSha256);
      expect(fresh.storageSnapshot.snapshotSha256).not.toBe(first.storageSnapshot.snapshotSha256);
      expect(fresh.packet.integrity.payloadSha256).not.toBe(first.packet.integrity.payloadSha256);
      expect(fresh.inventory.integrity.payloadSha256).not.toBe(first.inventory.integrity.payloadSha256);
    });

    it("projects the complete fail-closed review gate for zero, one, two, candidate and rejected citations", async () => {
      const scenarios = [
        {
          name: "zero",
          verified: 0,
          candidate: 0,
          rejected: 0,
          status: "blocked_no_verified_citations",
          pairs: 0,
          pairwise: false,
          human: false,
          candidateRequired: false,
          rejectedRequired: false
        },
        {
          name: "one",
          verified: 1,
          candidate: 0,
          rejected: 0,
          status: "no_pairwise_review_required",
          pairs: 0,
          pairwise: false,
          human: false,
          candidateRequired: false,
          rejectedRequired: false
        },
        {
          name: "two",
          verified: 2,
          candidate: 0,
          rejected: 0,
          status: "pending_human_review",
          pairs: 1,
          pairwise: true,
          human: true,
          candidateRequired: false,
          rejectedRequired: false
        },
        {
          name: "candidate-rejected",
          verified: 1,
          candidate: 1,
          rejected: 1,
          status: "blocked_unreviewed_target_sources",
          pairs: 0,
          pairwise: false,
          human: true,
          candidateRequired: true,
          rejectedRequired: true
        }
      ] as const;

      for (const scenario of scenarios) {
        const { database, knowledge } = repositories(13);
        await database.open();
        if (scenario.verified + scenario.candidate + scenario.rejected > 0) {
          const document = await createDocument(knowledge, `citation-review-workset-${scenario.name}`);
          for (let index = 0; index < scenario.verified; index += 1) {
            await createReviewCitation(
              database,
              knowledge,
              document,
              "verified",
              `${scenario.name}-verified-${index}`,
              index % 2 === 0 ? 3 : 4
            );
          }
          for (let index = 0; index < scenario.candidate; index += 1) {
            await createReviewCitation(
              database,
              knowledge,
              document,
              "candidate",
              `${scenario.name}-candidate-${index}`,
              3
            );
          }
          for (let index = 0; index < scenario.rejected; index += 1) {
            await createReviewCitation(
              database,
              knowledge,
              document,
              "rejected",
              `${scenario.name}-rejected-${index}`,
              4
            );
          }
        }

        const snapshot = await knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(subjectId);
        expect(snapshot.inventory.counts).toMatchObject({
          candidateCitations: scenario.candidate,
          verifiedCitations: scenario.verified,
          rejectedCitations: scenario.rejected,
          pairs: scenario.pairs
        });
        expect(snapshot.worksetSnapshot.citationLedger.candidateCitationIds)
          .toHaveLength(scenario.candidate);
        expect(snapshot.worksetSnapshot.citationLedger.verifiedCitationIds)
          .toHaveLength(scenario.verified);
        expect(snapshot.worksetSnapshot.citationLedger.rejectedCitationIds)
          .toHaveLength(scenario.rejected);
        expect(snapshot.worksetSnapshot.reviewGate).toEqual({
          status: scenario.status,
          pairwiseComparisonRequired: scenario.pairwise,
          humanReviewRequired: scenario.human,
          candidateResolutionRequired: scenario.candidateRequired,
          rejectedCitationAcknowledgementRequired: scenario.rejectedRequired,
          downstreamExternalUseGate: "blocked"
        });
      }
    });

    it("rejects non-v13 worksets before any database access", async () => {
      const { database, knowledge } = repositories(14);
      const transactionSpy = vi.spyOn(database, "transaction");

      await expect(knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(subjectId))
        .rejects.toMatchObject({ code: "CITATION_REVIEW_WORKSET_TARGET_SCHEMA_MISMATCH" });
      expect(transactionSpy).not.toHaveBeenCalled();
      expect(database.isOpen()).toBe(false);
    });

    it("rejects accessor and extra options without invoking getters or reading the database", async () => {
      const { database, knowledge } = repositories(13);
      const transactionSpy = vi.spyOn(database, "transaction");
      const getter = vi.fn(() => "0".repeat(64));
      const accessorOptions = Object.defineProperty({}, "expectedWorksetSnapshotSha256", { get: getter });

      await expect(knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(
        subjectId,
        accessorOptions as never
      )).rejects.toBeInstanceOf(TypeError);
      await expect(knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(
        subjectId,
        { expectedWorksetSnapshotSha256: "0".repeat(64), extra: true } as never
      )).rejects.toBeInstanceOf(TypeError);
      expect(getter).not.toHaveBeenCalled();
      expect(transactionSpy).not.toHaveBeenCalled();
      expect(database.isOpen()).toBe(false);
    });
  });

  it("creates all target kinds and rejects missing, cross-context, nonexistent and unsafe chart fields", async () => {
    const { cases, research, knowledge } = repositories();
    const bundle = await cases.createCase({ alias: "引用案例", calculated: await chart() });
    const revision = bundle.revisions[0];
    const note = await research.createResearchNote({
      caseId: bundle.caseRecord.id,
      anchor: { kind: "case" },
      body: "研究笔记",
      tags: [],
      sourceRefs: ["旧字符串来源"],
      lifecycle: "active"
    });
    const event = await research.createEvent({
      caseId: bundle.caseRecord.id,
      revisionId: revision.id,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "验证事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    const document = await createDocument(knowledge);
    const citation = await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 4 },
      annotation: "三类目标",
      targets: [
        { kind: "research_note", noteId: note.id },
        { kind: "event", eventId: event.id },
        {
          kind: "chart_field",
          caseId: bundle.caseRecord.id,
          revisionId: revision.id,
          field: "pillars.day.ganZhi"
        }
      ]
    });

    expect(citation.quote).toBe("藏干正文甲\n十神正文甲");
    expect(await knowledge.listCitations()).toEqual([citation]);
    expect(await knowledge.listCitationsByDocument(document.id)).toEqual([citation]);

    await expect(knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "不存在字段",
      targets: [{
        kind: "chart_field",
        caseId: bundle.caseRecord.id,
        revisionId: revision.id,
        field: "pillars.day.notAField"
      }]
    })).rejects.toMatchObject({ code: "TARGET_CONTEXT_MISMATCH" });
    await expect(knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "原型路径",
      targets: [{
        kind: "chart_field",
        caseId: bundle.caseRecord.id,
        revisionId: revision.id,
        field: "pillars.day.constructor"
      }]
    })).rejects.toMatchObject({ code: "TARGET_CONTEXT_MISMATCH" });
    await expect(knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "不存在笔记",
      targets: [{ kind: "research_note", noteId: crypto.randomUUID() }]
    })).rejects.toBeInstanceOf(KnowledgeRepositoryError);

    await knowledge.deleteCitation(citation.id);
    expect(await knowledge.listCitations()).toEqual([]);
  });

  it("cascades a document, prunes hard-deleted targets, and retains soft-deleted event targets", async () => {
    const { database, cases, research, knowledge } = repositories();
    const bundle = await cases.createCase({ alias: "级联案例", calculated: await chart() });
    const revision = bundle.revisions[0];
    const note = await research.createResearchNote({
      caseId: bundle.caseRecord.id,
      anchor: { kind: "case" },
      body: "待删笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const event = await research.createEvent({
      caseId: bundle.caseRecord.id,
      revisionId: revision.id,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "待软删事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    const document = await createDocument(knowledge);
    const citation = await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "级联",
      targets: [
        { kind: "research_note", noteId: note.id },
        { kind: "event", eventId: event.id },
        { kind: "chart_field", caseId: bundle.caseRecord.id, revisionId: revision.id, field: "pillars.year.ganZhi" }
      ]
    });
    const attachmentBytes = new TextEncoder().encode("attachment-cascade-sentinel");
    const unrelatedAttachment = await cases.createAttachment({
      fileName: "unrelated.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      link: null
    });
    const noteAttachment = await cases.createAttachment({
      fileName: "note.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      link: { kind: "research_note", noteId: note.id }
    });
    const eventAttachment = await cases.createAttachment({
      fileName: "event.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      link: { kind: "event", eventId: event.id }
    });
    const subjectAttachment = await cases.createAttachment({
      fileName: "case.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      link: { kind: "research_subject", subjectId: bundle.caseRecord.id }
    });
    const revisionAttachment = await cases.createAttachment({
      fileName: "revision.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      link: { kind: "revision", caseId: bundle.caseRecord.id, revisionId: revision.id }
    });
    const documentAttachment = await cases.createAttachment({
      fileName: "document.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      link: { kind: "knowledge_document", documentId: document.id }
    });
    const attachmentTableToArray = vi.spyOn(database.attachments, "toArray");

    await research.softDeleteEvent(event.id);
    expect((await knowledge.listCitations())[0].targets).toHaveLength(3);
    await research.deleteResearchNote(note.id);
    expect(await database.attachments.get(noteAttachment.id)).toBeUndefined();
    expect(await database.attachments.get(unrelatedAttachment.id)).toBeDefined();
    expect((await knowledge.listCitations())[0].targets).toEqual([
      { kind: "event", eventId: event.id },
      { kind: "chart_field", caseId: bundle.caseRecord.id, revisionId: revision.id, field: "pillars.year.ganZhi" }
    ]);
    await cases.trashCase(bundle.caseRecord.id);
    await cases.deleteCase(bundle.caseRecord.id);
    expect(await database.citations.count()).toBe(0);
    expect(await database.attachments.get(eventAttachment.id)).toBeUndefined();
    expect(await database.attachments.get(subjectAttachment.id)).toBeUndefined();
    expect(await database.attachments.get(revisionAttachment.id)).toBeUndefined();
    expect(await database.attachments.get(documentAttachment.id)).toBeDefined();
    expect(await database.attachments.get(unrelatedAttachment.id)).toBeDefined();

    const retainedDocument = await createDocument(knowledge, "乙");
    const retainedCase = await cases.createCase({ alias: "文献级联", calculated: await chart(), duplicateGuard: "allow" });
    const retainedNote = await research.createResearchNote({
      caseId: retainedCase.caseRecord.id,
      anchor: { kind: "case" }, body: "引用", tags: [], sourceRefs: [], lifecycle: "active"
    });
    await knowledge.createCitation({
      documentId: retainedDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "随文献删除",
      targets: [{ kind: "research_note", noteId: retainedNote.id }]
    });
    await knowledge.deleteDocument(retainedDocument.id);
    expect(await database.knowledgeDocuments.get(retainedDocument.id)).toBeUndefined();
    expect(await database.citations.where("documentId").equals(retainedDocument.id).count()).toBe(0);
    await knowledge.deleteDocument(document.id);
    expect(await database.attachments.get(documentAttachment.id)).toBeUndefined();
    expect(await database.attachments.get(unrelatedAttachment.id)).toBeDefined();

    const candidate = await cases.createCandidateSet({ alias: "待删候选组", candidateSet: await candidates() });
    const candidateNote = await research.createResearchNote({
      caseId: candidate.id,
      anchor: { kind: "case" }, body: "候选笔记", tags: [], sourceRefs: [], lifecycle: "active"
    });
    const candidateDocument = await createDocument(knowledge, "丙");
    await knowledge.createCitation({
      documentId: candidateDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "候选组级联",
      targets: [{ kind: "research_note", noteId: candidateNote.id }]
    });
    const candidateSubjectAttachment = await cases.createAttachment({
      fileName: "candidate.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      link: { kind: "research_subject", subjectId: candidate.id }
    });
    const candidateNoteAttachment = await cases.createAttachment({
      fileName: "candidate-note.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      link: { kind: "research_note", noteId: candidateNote.id }
    });
    await cases.trashCandidateSet(candidate.id);
    await cases.deleteCandidateSet(candidate.id);
    expect(await database.citations.where("documentId").equals(candidateDocument.id).count()).toBe(0);
    expect(await database.attachments.get(candidateSubjectAttachment.id)).toBeUndefined();
    expect(await database.attachments.get(candidateNoteAttachment.id)).toBeUndefined();
    expect(await database.attachments.get(unrelatedAttachment.id)).toBeDefined();
    expect(attachmentTableToArray).not.toHaveBeenCalled();
    attachmentTableToArray.mockRestore();
    expect(citation.editVersion).toBe(1);
  });
});

describe("Dexie v5 to v6 knowledge migration", () => {
  it("preserves immutable document and citation data while deterministically adding rights and review indexes", async () => {
    const databaseName = `hakimi-v5-rights-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(databaseName);
    legacy.version(5).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    await legacy.open();

    const timestamp = "2026-07-30T08:00:00.000Z";
    const documentId = crypto.randomUUID();
    const citationId = crypto.randomUUID();
    const noteId = crypto.randomUUID();
    const content = "# Legacy source\nOriginal body";
    const contentSnapshot = await buildKnowledgeContentSnapshot(content, "markdown");
    const legacyDocument = {
      schemaVersion: SCHEMA_VERSION,
      id: documentId,
      recordType: "user_knowledge_document",
      title: "Legacy source",
      author: "Original author",
      edition: "Original edition",
      sourceNote: "Preserve this note",
      fileName: "legacy.md",
      format: "markdown",
      rightsStatus: "user_provided_unverified",
      byteSize: new TextEncoder().encode(content).byteLength,
      ...contentSnapshot,
      editVersion: 3,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const legacyCitation = {
      schemaVersion: SCHEMA_VERSION,
      id: citationId,
      documentId,
      documentContentHash: contentSnapshot.contentHash,
      locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
      quote: "Original body",
      annotation: "Preserve this annotation",
      targets: [{ kind: "research_note", noteId }],
      status: "user_candidate",
      editVersion: 4,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await legacy.table("knowledgeDocuments").add(legacyDocument);
    await legacy.table("citations").add(legacyCitation);
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    databases.push(upgraded);
    await upgraded.open();
    const knowledge = new KnowledgeRepository(upgraded);
    const migratedDocument = await knowledge.getDocument(documentId);
    const migratedRights = await knowledge.getSourceRights(documentId);
    const migratedCitation = (await knowledge.listCitationsByDocument(documentId))[0];

    expect(upgraded.verno).toBe(14);
    expect(migratedDocument).toMatchObject({
      id: documentId,
      content,
      contentHash: contentSnapshot.contentHash,
      sourceNote: "Preserve this note",
      editVersion: 3
    });
    expect(migratedDocument).not.toHaveProperty("rightsStatus");
    expect(migratedRights).toMatchObject({
      documentId,
      documentContentHash: contentSnapshot.contentHash,
      origin: "user_import",
      source: { sourceUrl: null, publisher: "", publicationYear: null, acquiredAt: null },
      rights: {
        status: "user_unverified",
        workStatus: "unknown",
        editionStatus: "unknown",
        distributionPolicy: "local_private_only"
      },
      review: { status: "unreviewed", attestations: [], note: "" },
      createdAt: timestamp,
      updatedAt: timestamp
    });
    expect(migratedCitation).toMatchObject({
      id: citationId,
      documentId,
      documentContentHash: contentSnapshot.contentHash,
      quote: "Original body",
      annotation: "Preserve this annotation",
      targets: [{ kind: "research_note", noteId }],
      targetKeys: [`research_note:${noteId}`],
      status: "user_candidate",
      reviewAttestations: [],
      decisionNote: "",
      editVersion: 4
    });
  });
});

describe("knowledge data in restore transactions", () => {
  it("restores more than 1,024 Citations with one sequential digest per document from the invocation snapshot", async () => {
    const source = repositories();
    const firstDocument = await createDocument(source.knowledge, "restore-digest-a");
    const secondDocument = await createDocument(source.knowledge, "restore-digest-b");
    const firstBase = await source.knowledge.createCitation({
      documentId: firstDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "restore first",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.day.ganzhi.v1" }]
    });
    const secondBase = await source.knowledge.createCitation({
      documentId: secondDocument.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "restore second",
      targets: [{ kind: "evidence_subject", subjectId: "bazi.pillar.month.ganzhi.v1" }]
    });
    const snapshot = await source.cases.readFullDataSnapshot();
    snapshot.citations = [
      ...Array.from({ length: 1_024 }, (_, index) => ({
        ...firstBase,
        id: `50000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
      })),
      { ...secondBase, id: "50000000-0000-4000-9000-000000000000" }
    ];
    const capturedSnapshot = structuredClone(snapshot);
    const destination = repositories();
    const expectedContents = new Set([firstDocument.content, secondDocument.content]);
    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    const digestedDocumentContents: string[] = [];
    let activeDocumentDigests = 0;
    let maximumActiveDocumentDigests = 0;
    const digestSpy = vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation(async (algorithm, data) => {
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      const text = new TextDecoder().decode(bytes);
      const isDocumentContent = expectedContents.has(text);
      if (isDocumentContent) {
        digestedDocumentContents.push(text);
        activeDocumentDigests += 1;
        maximumActiveDocumentDigests = Math.max(maximumActiveDocumentDigests, activeDocumentDigests);
      }
      try {
        await Promise.resolve();
        return await originalDigest(algorithm, data);
      } finally {
        if (isDocumentContent) activeDocumentDigests -= 1;
      }
    });

    try {
      const replacement = destination.cases.replaceFullDataSnapshot(snapshot);
      snapshot.knowledgeDocuments[0]!.content = "caller mutation after invocation";
      snapshot.citations[0]!.annotation = "caller mutation after invocation";
      await replacement;

      expect([...digestedDocumentContents].sort()).toEqual([...expectedContents].sort());
      expect(maximumActiveDocumentDigests).toBe(1);
      expect(await destination.database.citations.count()).toBe(1_025);
      await expect(destination.database.knowledgeDocuments.get(capturedSnapshot.knowledgeDocuments[0]!.id))
        .resolves.toEqual(capturedSnapshot.knowledgeDocuments[0]);
      await expect(destination.database.citations.get(capturedSnapshot.citations[0]!.id))
        .resolves.toEqual(capturedSnapshot.citations[0]);
    } finally {
      digestSpy.mockRestore();
    }
  });

  it("rejects missing, hash-mismatched and cross-partition rights data before replacement", async () => {
    const { cases, knowledge } = repositories();
    await cases.createCase({ alias: "Rights restore", calculated: await chart() });
    await createDocument(knowledge, "rights-restore");
    const snapshot = await cases.readFullDataSnapshot();

    await expect(cases.replaceFullDataSnapshot({
      ...structuredClone(snapshot),
      sourceRights: []
    })).rejects.toMatchObject({ code: "SOURCE_RIGHTS_NOT_FOUND" });

    const mismatched = structuredClone(snapshot);
    mismatched.sourceRights[0].documentContentHash = "0".repeat(64);
    await expect(cases.replaceFullDataSnapshot(mismatched)).rejects.toMatchObject({ code: "SOURCE_RIGHTS_CONFLICT" });

    const collision = structuredClone(snapshot);
    collision.cases[0].id = collision.knowledgeDocuments[0].id;
    await expect(cases.replaceFullDataSnapshot(collision)).rejects.toBeInstanceOf(FullDataIdentityConflictError);
  });

  it("retains standalone documents across core-only restore and rejects retained document ID collisions", async () => {
    const { cases, knowledge } = repositories();
    const bundle = await cases.createCase({ alias: "核心恢复前", calculated: await chart() });
    const document = await createDocument(knowledge);
    const core = await cases.readCoreDataSnapshot();
    await cases.replaceCoreDataSnapshot({
      cases: core.cases.map((record) => ({ ...record, alias: "核心恢复后" })),
      revisions: core.revisions
    });
    expect((await cases.getCase(bundle.caseRecord.id))?.caseRecord.alias).toBe("核心恢复后");
    expect(await knowledge.getDocument(document.id)).toEqual(document);

    const collision = structuredClone(await cases.readCoreDataSnapshot());
    collision.cases[0].id = document.id;
    collision.revisions[0].caseId = document.id;
    await expect(cases.replaceCoreDataSnapshot(collision)).rejects.toBeInstanceOf(CoreDataIdentityConflictError);
  });

  it("rolls back the exact schema-13 full snapshot after a staged write and includes knowledge in CAS", async () => {
    const { database, cases, research, knowledge } = repositories(13);
    const bundle = await cases.createCase({ alias: "九分区", calculated: await chart() });
    await cases.createCandidateSet({ alias: "九分区候选", candidateSet: await candidates() });
    const note = await research.createResearchNote({
      caseId: bundle.caseRecord.id,
      anchor: { kind: "case" }, body: "九分区笔记", tags: [], sourceRefs: [], lifecycle: "active"
    });
    await research.createEvent({
      caseId: bundle.caseRecord.id,
      revisionId: bundle.revisions[0].id,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "九分区事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    await research.createSavedView({ name: "九分区视图", query: emptySavedCaseQuery() });
    const document = await createDocument(knowledge);
    await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
      annotation: "九分区引用",
      targets: [{ kind: "research_note", noteId: note.id }]
    });
    const snapshot = await cases.readFullDataSnapshot();
    expect(database.targetSchemaVersion).toBe(13);
    expect(database.tables.map((table) => table.name)).not.toContain("mutationState");
    expect(database.tables.map((table) => table.name)).not.toContain("revisionCalculationReceipts");

    const replacement = structuredClone(snapshot);
    replacement.cases[0]!.alias = "Schema 13 staged replacement";
    let stagedAlias: string | null = null;
    vi.spyOn(database.knowledgeDocuments, "bulkAdd").mockImplementationOnce(() =>
      database.cases.get(bundle.caseRecord.id).then((stagedCase) => {
        stagedAlias = stagedCase?.alias ?? null;
        throw new Error("模拟第七分区写入失败");
      })
    );
    await expect(cases.replaceFullDataSnapshot(replacement)).rejects.toThrow("模拟第七分区写入失败");
    expect(stagedAlias).toBe("Schema 13 staged replacement");
    expect(await cases.readFullDataSnapshot()).toEqual(snapshot);

    const expectedDigest = await sha256Hex(snapshot);
    await createDocument(knowledge, "并发");
    await expect(cases.replaceFullDataSnapshot(structuredClone(snapshot), {
      expectedCurrentPayloadDigest: expectedDigest
    })).rejects.toBeInstanceOf(FullDataReplaceConflictError);
    expect(await database.knowledgeDocuments.count()).toBe(2);
  });
});
