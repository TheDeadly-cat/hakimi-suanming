import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import {
  SCHEMA_VERSION,
  type BirthInput,
  type CalculatedChart,
  type UnknownHourCandidateResult
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  KnowledgeRepository,
  RESEARCH_JOURNAL_SNAPSHOT_PROFILE,
  ResearchDatabase,
  ResearchJournalSnapshotError,
  ResearchRepository,
  computeEventRecordDigest
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

function repositories(name = `hakimi-research-journal-snapshot-${crypto.randomUUID()}`) {
  const database = new ResearchDatabase(name, { targetSchema: 13 });
  databases.push(database);
  return {
    database,
    cases: new CaseRepository(database),
    research: new ResearchRepository(database, () => "2026-08-24T00:00:00.000Z"),
    knowledge: new KnowledgeRepository(database, () => "2026-08-24T00:00:00.000Z")
  };
}

async function seedCase(alias: string, fixture = repositories()) {
  const bundle = await fixture.cases.createCase({ alias, calculated: await chart() });
  return { ...fixture, bundle };
}

async function seedNote(fixture: Awaited<ReturnType<typeof seedCase>>, body = "原子快照笔记") {
  return fixture.research.createResearchNote({
    caseId: fixture.bundle.caseRecord.id,
    anchor: { kind: "case" },
    body,
    tags: [],
    sourceRefs: [],
    lifecycle: "active"
  });
}

async function seedDocument(knowledge: KnowledgeRepository, suffix: string) {
  const content = `序言${suffix}\n# 第一章\n引用正文${suffix}`;
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

async function seedLinkedCitation(
  fixture: Awaited<ReturnType<typeof seedCase>>,
  noteId: string,
  suffix: string
) {
  const document = await seedDocument(fixture.knowledge, suffix);
  const citation = await fixture.knowledge.createCitation({
    documentId: document.id,
    locator: { sectionId: "section-2", startLine: 3, endLine: 3 },
    annotation: `引用${suffix}`,
    targets: [{ kind: "research_note", noteId }]
  });
  return { document, citation };
}

afterEach(async () => {
  vi.restoreAllMocks();
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("ResearchRepository.readResearchJournalSnapshot", () => {
  it("requires an explicitly opened database and does not implicitly create Schema 13", async () => {
    const { database, research } = repositories();
    expect(database.isOpen()).toBe(false);
    await expect(research.readResearchJournalSnapshot(crypto.randomUUID())).rejects.toBeInstanceOf(
      ResearchJournalSnapshotError
    );
    expect(database.isOpen()).toBe(false);
  });

  it("uses one exact readonly transaction, reads only linked knowledge and returns a deep-frozen v13 boundary", async () => {
    const fixture = await seedCase("当前 Case");
    const currentNote = await seedNote(fixture, "当前笔记");
    const current = await seedLinkedCitation(fixture, currentNote.id, "当前");
    const other = await seedCase("无关 Case", {
      database: fixture.database,
      cases: fixture.cases,
      research: fixture.research,
      knowledge: fixture.knowledge
    });
    const otherNote = await seedNote(other, "无关笔记");
    const unrelated = await seedLinkedCitation(other, otherNote.id, "无关");

    const transactionSpy = vi.spyOn(fixture.database, "transaction");
    const documentGetSpy = vi.spyOn(fixture.database.knowledgeDocuments, "get");
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest");
    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    const transactionCall = transactionSpy.mock.calls[0] as unknown[];
    expect(transactionCall[0]).toBe("r");
    expect((transactionCall[1] as Array<{ name: string }>).map((table) => table.name)).toEqual(
      RESEARCH_JOURNAL_SNAPSHOT_PROFILE.storeNames
    );
    expect(documentGetSpy).toHaveBeenCalledTimes(1);
    expect(documentGetSpy).toHaveBeenCalledWith(current.document.id);
    expect(documentGetSpy).not.toHaveBeenCalledWith(unrelated.document.id);
    expect(digest).toHaveBeenCalledTimes(1);
    expect(snapshot.caseId).toBe(fixture.bundle.caseRecord.id);
    expect(snapshot.notes.map((note) => note.id)).toEqual([currentNote.id]);
    expect(snapshot.citationIndex).toMatchObject({ status: "loaded" });
    expect(snapshot.boundary).toEqual({
      atomicStorageSnapshotVerified: true,
      caseIdBound: true,
      transactionMode: "readonly",
      mutationEpochRead: false,
      mutationEpochRevalidationPerformed: false,
      storageMutationPerformed: false,
      schemaOrReleaseIdentityMutationPerformed: false,
      expertTruthClaimed: false,
      publicReleaseAuthorized: false,
      formalActivationAllowed: false
    });
    expect(fixture.database.targetSchemaVersion).toBe(13);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.notes)).toBe(true);
    expect(Object.isFrozen(snapshot.notes[0])).toBe(true);
    expect(RESEARCH_JOURNAL_SNAPSHOT_PROFILE.detectsOutOfBandPostStartupMissingCitationIndexWrites).toBe(false);
    expect(RESEARCH_JOURNAL_SNAPSHOT_PROFILE.detectsOutOfBandPostStartupMissingReceiptIndexWrites).toBe(false);
  });

  it("rejects 10,001 core records before reading any Citation or knowledge body", async () => {
    const fixture = await seedCase("超限 Case");
    const template = await seedNote(fixture);
    await fixture.database.researchNotes.bulkPut(Array.from({ length: 10_001 }, (_, index) => ({
      ...template,
      id: `70000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
    })));
    const citationWhere = vi.spyOn(fixture.database.citations, "where");
    const documentGet = vi.spyOn(fixture.database.knowledgeDocuments, "get");

    await expect(fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id))
      .rejects.toMatchObject({ code: "RESEARCH_JOURNAL_CORE_RESOURCE_LIMIT_EXCEEDED" });
    expect(citationWhere).not.toHaveBeenCalled();
    expect(documentGet).not.toHaveBeenCalled();
  });

  it("fails the Citation partition at 10,001 unique keys before reading Citation or knowledge bodies", async () => {
    const fixture = await seedCase("引用上限 Case");
    const note = await seedNote(fixture);
    expect(note.caseId).toBe(fixture.bundle.caseRecord.id);
    vi.spyOn(fixture.database.citations, "where").mockImplementation((() => ({
      anyOf: () => ({
        limit: () => ({
          primaryKeys: async () => Array.from({ length: 10_001 }, (_, index) => (
            `73000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
          ))
        })
      })
    })) as unknown as typeof fixture.database.citations.where);
    const citationGet = vi.spyOn(fixture.database.citations, "get");
    const documentGet = vi.spyOn(fixture.database.knowledgeDocuments, "get");

    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
    expect(snapshot.notes).toHaveLength(1);
    expect(snapshot.citationIndex).toMatchObject({
      status: "error",
      code: "CITATION_RESOURCE_LIMIT_EXCEEDED"
    });
    expect(citationGet).not.toHaveBeenCalled();
    expect(documentGet).not.toHaveBeenCalled();
  });

  it("fails only the Citation partition for corrupted linked evidence and never returns partial records", async () => {
    const fixture = await seedCase("引用损坏 Case");
    const note = await seedNote(fixture);
    const { citation } = await seedLinkedCitation(fixture, note.id, "损坏");
    await fixture.database.citations.update(citation.id, { quote: "被篡改的摘录" });

    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
    expect(snapshot.notes).toHaveLength(1);
    expect(snapshot.citationIndex).toEqual({
      status: "error",
      code: "CITATION_DATA_INVALID",
      message: "当前 Case 的知识引用或资料正文完整性验证失败。"
    });
    expect(snapshot.receiptIndex).toEqual({ status: "loaded", records: [] });
  });

  it("rejects a schema-invalid Citation primary key before Set insertion without exposing it", async () => {
    const fixture = await seedCase("非法引用主键 Case");
    await seedNote(fixture);
    const rawPrimaryKey = "70000000-0000-f000-c000-sensitive-primary-key";
    vi.spyOn(fixture.database.citations, "where").mockImplementation((() => ({
      anyOf: () => ({
        limit: () => ({ primaryKeys: async () => [rawPrimaryKey] })
      })
    })) as unknown as typeof fixture.database.citations.where);
    const citationGet = vi.spyOn(fixture.database.citations, "get");

    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
    expect(snapshot.citationIndex).toEqual({
      status: "error",
      code: "CITATION_DATA_INVALID",
      message: "知识引用索引返回了不符合契约的主键。"
    });
    expect(snapshot.citationIndex).not.toHaveProperty("records");
    expect(JSON.stringify(snapshot.citationIndex)).not.toContain(rawPrimaryKey);
    expect(citationGet).not.toHaveBeenCalled();
  });

  it("keeps scanning later target-key batches when an earlier Citation ID repeats before a new ID", async () => {
    const fixture = await seedCase("跨批引用 Case");
    const template = await seedNote(fixture);
    const notes = Array.from({ length: 129 }, (_, index) => ({
      ...template,
      id: `71000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
    }));
    await fixture.database.researchNotes.bulkPut(notes);
    const first = await seedLinkedCitation(fixture, notes[0].id, "跨批重复");
    const later = await seedLinkedCitation(fixture, notes[128].id, "跨批新增");
    let targetKeyBatch = 0;
    vi.spyOn(fixture.database.citations, "where").mockImplementation((() => ({
      anyOf: () => ({
        limit: () => ({
          primaryKeys: async () => (
            targetKeyBatch++ === 0
              ? [first.citation.id]
              : [first.citation.id, later.citation.id]
          )
        })
      })
    })) as unknown as typeof fixture.database.citations.where);

    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
    expect(snapshot.citationIndex).toMatchObject({ status: "loaded" });
    if (snapshot.citationIndex.status !== "loaded") throw new Error("citation snapshot failed");
    expect(snapshot.citationIndex.records.map((citation) => citation.id).sort()).toEqual(
      [first.citation.id, later.citation.id].sort()
    );
    expect(targetKeyBatch).toBe(2);
  });

  it("deduplicates one receipt reached through both endpoints and verifies it once", async () => {
    const fixture = await seedCase("凭证去重 Case");
    const current = await fixture.research.createEvent({
      caseId: fixture.bundle.caseRecord.id,
      revisionId: fixture.bundle.revisions[0].id,
      transitNodeRef: null,
      datePrecision: "day",
      startDate: "2025-03-12",
      endDate: null,
      title: "旧时间事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    await fixture.database.events.update(current.id, { timeContext: { kind: "legacy_floating" } });
    const source = await fixture.research.getEvent(current.id);
    if (!source) throw new Error("fixture source missing");
    const derived = await fixture.research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(source),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });

    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
    expect(snapshot.receiptIndex).toMatchObject({ status: "loaded" });
    if (snapshot.receiptIndex.status !== "loaded") throw new Error("receipt snapshot failed");
    expect(snapshot.receiptIndex.records.map((receipt) => receipt.id)).toEqual([derived.receipt.id]);
  });

  it("keeps scanning later Event batches when an earlier receipt ID repeats before a new ID", async () => {
    const fixture = await seedCase("跨批凭证 Case");
    const deriveReceipt = async (title: string, startDate: string) => {
      const created = await fixture.research.createEvent({
        caseId: fixture.bundle.caseRecord.id,
        revisionId: fixture.bundle.revisions[0].id,
        transitNodeRef: null,
        datePrecision: "day" as const,
        startDate,
        endDate: null,
        title,
        tags: [],
        sourceRefs: [],
        feedback: "unreviewed" as const,
        body: ""
      });
      await fixture.database.events.update(created.id, { timeContext: { kind: "legacy_floating" } });
      const source = await fixture.research.getEvent(created.id);
      if (!source) throw new Error("fixture source missing");
      return fixture.research.deriveLegacyEventTime({
        sourceEventId: source.id,
        expectedSourceRecordDigest: await computeEventRecordDigest(source),
        confirmed: true,
        interpretation: { kind: "calendar_date" }
      });
    };
    const first = await deriveReceipt("跨批凭证一", "2025-03-12");
    const later = await deriveReceipt("跨批凭证二", "2025-03-13");
    const template = await fixture.research.getEvent(first.target.id);
    if (!template) throw new Error("fixture target missing");
    await fixture.database.events.bulkPut(Array.from({ length: 125 }, (_, index) => ({
      ...template,
      id: `74000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
      title: `批次填充事件 ${index}`
    })));
    let receiptIndexCall = 0;
    vi.spyOn(fixture.database.eventTimeMigrationReceipts, "where").mockImplementation((() => ({
      anyOf: () => ({
        limit: () => ({
          primaryKeys: async () => {
            receiptIndexCall += 1;
            if (receiptIndexCall === 1) return [first.receipt.id];
            if (receiptIndexCall === 2) return [first.receipt.id, later.receipt.id];
            return [];
          }
        })
      })
    })) as unknown as typeof fixture.database.eventTimeMigrationReceipts.where);

    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
    expect(snapshot.receiptIndex).toMatchObject({ status: "loaded" });
    if (snapshot.receiptIndex.status !== "loaded") throw new Error("receipt snapshot failed");
    expect(snapshot.receiptIndex.records.map((receipt) => receipt.id).sort()).toEqual(
      [first.receipt.id, later.receipt.id].sort()
    );
    expect(receiptIndexCall).toBe(4);
  });

  it("fails only the receipt partition when a current Event receipt crosses into another Case", async () => {
    const fixture = await seedCase("跨 Case 凭证来源");
    const other = await seedCase("跨 Case 凭证目标", {
      database: fixture.database,
      cases: fixture.cases,
      research: fixture.research,
      knowledge: fixture.knowledge
    });
    const source = await fixture.research.createEvent({
      caseId: fixture.bundle.caseRecord.id,
      revisionId: fixture.bundle.revisions[0].id,
      transitNodeRef: null,
      datePrecision: "day",
      startDate: "2025-03-12",
      endDate: null,
      title: "跨 Case 旧时间事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    await fixture.database.events.update(source.id, { timeContext: { kind: "legacy_floating" } });
    const legacySource = await fixture.research.getEvent(source.id);
    if (!legacySource) throw new Error("fixture source missing");
    const derived = await fixture.research.deriveLegacyEventTime({
      sourceEventId: legacySource.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(legacySource),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });
    await fixture.database.events.update(derived.target.id, {
      caseId: other.bundle.caseRecord.id,
      revisionId: other.bundle.revisions[0].id
    });

    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
    expect(snapshot.events.map((event) => event.id)).toEqual([source.id]);
    expect(snapshot.receiptIndex).toEqual({
      status: "error",
      code: "RECEIPT_DATA_INVALID",
      message: "事件时间迁移凭证跨越了不同 Case。"
    });
    expect(snapshot.citationIndex).toEqual({ status: "loaded", records: [] });
  });

  it("fails only the receipt partition at 513 unique records before loading receipt bodies", async () => {
    const fixture = await seedCase("凭证上限 Case");
    const current = await fixture.research.createEvent({
      caseId: fixture.bundle.caseRecord.id,
      revisionId: fixture.bundle.revisions[0].id,
      transitNodeRef: null,
      datePrecision: "day",
      startDate: "2025-03-12",
      endDate: null,
      title: "旧时间事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    await fixture.database.events.update(current.id, { timeContext: { kind: "legacy_floating" } });
    const source = await fixture.research.getEvent(current.id);
    if (!source) throw new Error("fixture source missing");
    const derived = await fixture.research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(source),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });
    expect(derived.receipt.source.recordId).toBe(source.id);
    let receiptIndexCall = 0;
    vi.spyOn(fixture.database.eventTimeMigrationReceipts, "where").mockImplementation((() => ({
      anyOf: () => ({
        limit: () => ({
          primaryKeys: async () => receiptIndexCall++ === 0
            ? Array.from({ length: 513 }, (_, index) => (
                `72000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`
              ))
            : []
        })
      })
    })) as unknown as typeof fixture.database.eventTimeMigrationReceipts.where);
    const receiptGet = vi.spyOn(fixture.database.eventTimeMigrationReceipts, "get");

    const snapshot = await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.receiptIndex).toMatchObject({
      status: "error",
      code: "RECEIPT_RESOURCE_LIMIT_EXCEEDED"
    });
    expect(receiptGet).not.toHaveBeenCalled();
  });

  it("returns one pre-write snapshot while a second connection waits for the readonly transaction", async () => {
    const fixture = repositories();
    const candidate = await fixture.cases.createCandidateSet({
      alias: "双连接候选组",
      candidateSet: await candidates()
    });
    const existing = await fixture.research.createResearchNote({
      caseId: candidate.id,
      anchor: { kind: "case" },
      body: "事务前笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const writerDatabase = new ResearchDatabase(fixture.database.name, { targetSchema: 13 });
    databases.push(writerDatabase);
    await writerDatabase.open();
    const writerResearch = new ResearchRepository(writerDatabase, () => "2026-08-24T01:00:00.000Z");
    const originalDigest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    let releaseDigest!: () => void;
    let announceDigest!: () => void;
    const digestGate = new Promise<void>((resolve) => { releaseDigest = resolve; });
    const digestAnnounced = new Promise<void>((resolve) => { announceDigest = resolve; });
    let blockNextDigest = true;
    vi.spyOn(globalThis.crypto.subtle, "digest").mockImplementation(async (algorithm, data) => {
      if (blockNextDigest) {
        blockNextDigest = false;
        announceDigest();
        await digestGate;
      }
      return originalDigest(algorithm, data);
    });

    const snapshotPromise = fixture.research.readResearchJournalSnapshot(candidate.id);
    await digestAnnounced;
    const writerPromise = writerResearch.createResearchNote({
      caseId: candidate.id,
      anchor: { kind: "case" },
      body: "事务后笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });

    releaseDigest();
    const [snapshot, written] = await Promise.all([snapshotPromise, writerPromise]);
    expect(snapshot.notes.map((note) => note.id)).toEqual([existing.id]);
    const fresh = await Dexie.ignoreTransaction(() => fixture.research.readResearchJournalSnapshot(candidate.id));
    expect(fresh.notes.map((note) => note.id)).toContain(written.id);
  });

  it("aborts both an active transaction and the post-transaction result-delivery boundary", async () => {
    const fixture = await seedCase("Abort Case");
    const controller = new AbortController();
    const originalTransaction = fixture.database.transaction.bind(fixture.database);
    vi.spyOn(fixture.database, "transaction").mockImplementation((function (...args: unknown[]) {
      const promise = originalTransaction(...args as Parameters<typeof originalTransaction>);
      return promise.then((value) => {
        controller.abort(new DOMException("cancelled", "AbortError"));
        return value;
      });
    }) as typeof fixture.database.transaction);

    await expect(fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id, {
      signal: controller.signal
    })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("does not downgrade a real IndexedDB query failure into an auxiliary partition error", async () => {
    const fixture = await seedCase("IndexedDB 错误 Case");
    await seedNote(fixture);
    const failure = new DOMException("fixture IndexedDB failure", "UnknownError");
    vi.spyOn(fixture.database.citations, "where").mockImplementation(() => {
      throw failure;
    });

    try {
      await fixture.research.readResearchJournalSnapshot(fixture.bundle.caseRecord.id);
      throw new Error("expected IndexedDB query failure");
    } catch (reason) {
      expect(reason).toMatchObject({ name: "UnknownError" });
      expect(reason).not.toHaveProperty("code", "CITATION_DATA_INVALID");
      expect(reason).not.toHaveProperty("code", "CITATION_RESOURCE_LIMIT_EXCEEDED");
    }
  });
});
