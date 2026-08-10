import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  SCHEMA_VERSION,
  type BirthInput,
  type CalculatedChart,
  type ResearchCaseQuery,
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

function repositories() {
  const database = new ResearchDatabase(`hakimi-knowledge-test-${crypto.randomUUID()}`);
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

describe("KnowledgeRepository citations", () => {
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

    await research.softDeleteEvent(event.id);
    expect((await knowledge.listCitations())[0].targets).toHaveLength(3);
    await research.deleteResearchNote(note.id);
    expect((await knowledge.listCitations())[0].targets).toEqual([
      { kind: "event", eventId: event.id },
      { kind: "chart_field", caseId: bundle.caseRecord.id, revisionId: revision.id, field: "pillars.year.ganZhi" }
    ]);
    await cases.trashCase(bundle.caseRecord.id);
    await cases.deleteCase(bundle.caseRecord.id);
    expect(await database.citations.count()).toBe(0);

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
    await cases.trashCandidateSet(candidate.id);
    await cases.deleteCandidateSet(candidate.id);
    expect(await database.citations.where("documentId").equals(candidateDocument.id).count()).toBe(0);
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

  it("rolls back all nine modeled partitions on a late write failure and includes knowledge in CAS", async () => {
    const { database, cases, research, knowledge } = repositories();
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

    vi.spyOn(database.knowledgeDocuments, "bulkAdd").mockRejectedValueOnce(new Error("模拟第七分区写入失败"));
    await expect(cases.replaceFullDataSnapshot(structuredClone(snapshot))).rejects.toThrow("模拟第七分区写入失败");
    expect(await cases.readFullDataSnapshot()).toEqual(snapshot);

    const expectedDigest = await sha256Hex(snapshot);
    await createDocument(knowledge, "并发");
    await expect(cases.replaceFullDataSnapshot(structuredClone(snapshot), {
      expectedCurrentPayloadDigest: expectedDigest
    })).rejects.toBeInstanceOf(FullDataReplaceConflictError);
    expect(await database.knowledgeDocuments.count()).toBe(2);
  });
});
