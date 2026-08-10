import { afterEach, describe, expect, it } from "vitest";
import Dexie from "dexie";
import {
  calculateChart,
  calculateUnknownHourCandidates,
  calculateUnknownHourCandidatesForBundledSnapshot
} from "@hakimi/bazi-core";
import {
  LEGACY_HASH_SCHEMA_VERSION,
  LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  SCHEMA_VERSION,
  TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
  buildCalculatedChartHashPayload,
  buildTimeZoneDatabaseSnapshotId,
  buildUnknownHourCandidateHashPayload,
  eventRecordSchema,
  migrateLegacySavedViewRecordV1,
  type BirthInput,
  type CalculatedChart,
  type EventRecord,
  type ResearchCaseQuery,
  type RevisionRecord,
  type TzdbMigrationReceipt,
  type TransitNodeRef,
  type UnknownHourCandidateResult
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary } from "@hakimi/rule-profiles";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import {
  RETAINED_TIME_ZONE_DATABASE_2025B,
  RETAINED_TZDB_2025B_SNAPSHOT_ID
} from "@hakimi/tzdb-core";
import {
  ADVANCED_CASE_QUERY,
  ADVANCED_CASE_QUERY_DIGEST
} from "../../research-query/test-fixtures/advanced-case-query";
import {
  CaseRepository,
  CoreDataReplaceBlockedError,
  ResearchDatabase,
  ResearchRepository,
  ResearchRepositoryError,
  buildCandidateSetTzdbComparison,
  buildLegacyCandidateSetTzdbComparison,
  buildEventTimeMigrationSnapshot,
  computeEventRecordDigest
} from "./index";

const openDatabases: Dexie[] = [];

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

let calculatedChartPromise: Promise<CalculatedChart> | undefined;
let candidateSetPromise: Promise<UnknownHourCandidateResult> | undefined;

function getCalculatedChart(): Promise<CalculatedChart> {
  calculatedChartPromise ??= calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  return calculatedChartPromise;
}

function getCandidateSet(): Promise<UnknownHourCandidateResult> {
  candidateSetPromise ??= calculateUnknownHourCandidates({
    ...input,
    time: null,
    timePrecision: "unknown_hour"
  }, WORKING_DEFAULT_RULE_PROFILE);
  return candidateSetPromise;
}

async function asLegacyUnidentifiedCandidateSet(
  current: UnknownHourCandidateResult
): Promise<UnknownHourCandidateResult> {
  const legacy = structuredClone(current);
  legacy.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
  legacy.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
  delete legacy.timeZoneDatabase;
  for (const candidate of legacy.candidates) {
    for (const variant of candidate.variants) {
      variant.chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
      variant.chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
      delete variant.chart.manifest.timeZoneDatabase;
      variant.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(variant.chart));
      variant.chartResultHash = variant.chart.manifest.resultHash;
    }
    if (candidate.chart) {
      candidate.chart.manifest.hashSchemaVersion = LEGACY_HASH_SCHEMA_VERSION;
      candidate.chart.manifest.tzdbVersion = LEGACY_UNIDENTIFIED_TZDB_VERSION;
      delete candidate.chart.manifest.timeZoneDatabase;
      candidate.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(candidate.chart));
    }
  }
  legacy.resultHash = await sha256Hex(buildUnknownHourCandidateHashPayload(legacy));
  return legacy;
}

function createRepositories() {
  const database = new ResearchDatabase(`hakimi-research-test-${crypto.randomUUID()}`);
  openDatabases.push(database);
  return {
    database,
    cases: new CaseRepository(database),
    research: new ResearchRepository(database)
  };
}

function createV8Database(name: string): Dexie {
  const database = new Dexie(name);
  database.version(8).stores({
    cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
    revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
    candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
    researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
    events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
    savedViews: "id, name, updatedAt, createdAt",
    knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
    citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
    sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
    birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
  });
  return database;
}

function createV9Database(name: string): Dexie {
  const database = new Dexie(name);
  database.version(9).stores({
    cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
    revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
    candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
    researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
    events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
    savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
    knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
    citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
    sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
    birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
  });
  return database;
}

function createV11Database(name: string): Dexie {
  const database = new Dexie(name);
  database.version(11).stores({
    cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
    revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
    candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
    researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
    events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
    savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
    knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
    citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
    sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
    attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
    researcherProfiles: "id, updatedAt",
    appSettings: "id, updatedAt",
    ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
    birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
  });
  return database;
}

function createV12Database(name: string): Dexie {
  const database = new Dexie(name);
  database.version(12).stores({
    cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
    revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
    candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
    researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
    events: "id, caseId, revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags",
    savedViews: "id, state, recordVersion, name, updatedAt, createdAt",
    knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
    citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
    sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
    attachments: "id, updatedAt, createdAt, mediaType, link.kind, link.subjectId, link.caseId, link.revisionId, link.noteId, link.eventId, link.documentId",
    researcherProfiles: "id, updatedAt",
    appSettings: "id, updatedAt",
    ruleRegistry: "id, recordType, packId, &[packId+profileVersion], profileDigest, importedAt",
    tzdbMigrationReceipts: "id, operation, source.recordId, target.recordId, createdAt",
    birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
  });
  return database;
}

async function seedCase(cases: CaseRepository, alias: string, tags: string[] = []) {
  return cases.createCase({ alias, tags, calculated: await getCalculatedChart() });
}

function eventInput(caseId: string, revisionId: string | null = null) {
  return {
    caseId,
    revisionId,
    transitNodeRef: null,
    datePrecision: "day" as const,
    startDate: "2025-03-12",
    endDate: null,
    title: "工作变化",
    tags: ["事业"],
    sourceRefs: ["访谈-2025-03"],
    feedback: "unreviewed" as const,
    body: "当日收到岗位调整通知。"
  };
}

async function transitRef(revision: RevisionRecord): Promise<TransitNodeRef> {
  const snapshot = await calculateTransitSnapshot({
    revision,
    atInstant: "2025-03-12T04:00:00Z"
  });
  if (snapshot.slots.year.status !== "resolved") {
    throw new Error("fixture year transit slot must be resolved");
  }
  return snapshot.slots.year.node.ref;
}

function alteredHex(value: string): string {
  return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
}

function withMismatchedBundledCandidateSetDescriptor(
  candidateSet: UnknownHourCandidateResult
): UnknownHourCandidateResult {
  const target = structuredClone(candidateSet);
  if (!target.timeZoneDatabase) throw new Error("expected an identified CandidateSet fixture");
  const descriptor = {
    ...target.timeZoneDatabase,
    artifactName: `${target.timeZoneDatabase.artifactName}.unregistered`
  };
  target.timeZoneDatabase = descriptor;
  for (const candidate of target.candidates) {
    if (candidate.chart) candidate.chart.manifest.timeZoneDatabase = structuredClone(descriptor);
    for (const variant of candidate.variants) {
      variant.chart.manifest.timeZoneDatabase = structuredClone(descriptor);
    }
  }
  return target;
}

function withDifferentTimeZoneDatabaseSnapshot(record: EventRecord): EventRecord {
  const historical = structuredClone(record);
  if (historical.timeContext.kind !== "zoned_minute" || !historical.timeContext.timeZoneDatabase) {
    throw new Error("expected an identified zoned Event fixture");
  }
  historical.timeContext.timeZoneDatabase.dataSha256 = alteredHex(
    historical.timeContext.timeZoneDatabase.dataSha256
  );
  historical.timeContext.timeZoneDatabase.snapshotId = buildTimeZoneDatabaseSnapshotId(
    historical.timeContext.timeZoneDatabase
  );
  historical.timeContext.tzdbVersion = historical.timeContext.timeZoneDatabase.snapshotId;
  return eventRecordSchema.parse(historical);
}

function savedCaseQuery(text: string): ResearchCaseQuery {
  return {
    version: 1,
    scope: "cases",
    text,
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

afterEach(async () => {
  const names = [...new Set(openDatabases.map((database) => database.name))];
  for (const database of openDatabases.splice(0)) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("ResearchDatabase migrations through v14", () => {
  it("升级时保留 v1 的 cases/revisions 并创建研究与候选组分区", async () => {
    const chart = await getCalculatedChart();
    const databaseName = `hakimi-v1-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(databaseName);
    openDatabases.push(legacy);
    legacy.version(1).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash"
    });
    const caseId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    const timestamp = "2026-08-01T00:00:00.000Z";
    await legacy.open();
    await legacy.transaction("rw", legacy.table("cases"), legacy.table("revisions"), async () => {
      await legacy.table("cases").add({
        schemaVersion: SCHEMA_VERSION,
        id: caseId,
        alias: "v1 原有案例",
        tags: ["迁移"],
        notes: "旧数据",
        createdAt: timestamp,
        updatedAt: timestamp,
        latestRevisionId: revisionId,
        revisionCount: 1
      });
      await legacy.table("revisions").add({
        schemaVersion: SCHEMA_VERSION,
        id: revisionId,
        caseId,
        revisionNumber: 1,
        createdAt: timestamp,
        input: chart.input,
        timeCalibration: chart.timeCalibration,
        ruleProfile: chart.ruleProfile,
        facts: chart.facts,
        manifest: chart.manifest
      });
    });
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    expect((await upgraded.cases.get(caseId))?.alias).toBe("v1 原有案例");
    expect(await upgraded.cases.get(caseId)).toMatchObject({ recordVersion: 2, favorite: false, deletedAt: null });
    expect((await upgraded.revisions.get(revisionId))?.caseId).toBe(caseId);
    expect(await upgraded.researchNotes.count()).toBe(0);
    expect(await upgraded.events.count()).toBe(0);
    expect(await upgraded.savedViews.count()).toBe(0);
    expect(await upgraded.candidateSets.count()).toBe(0);
    expect(await upgraded.birthFingerprints.count()).toBe(1);
    expect(await upgraded.knowledgeDocuments.count()).toBe(0);
    expect(await upgraded.citations.count()).toBe(0);
  });

  it("从 v2 升级时保留研究分区并只新增空候选组表", async () => {
    const databaseName = `hakimi-v2-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(databaseName);
    openDatabases.push(legacy);
    legacy.version(2).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt"
    });
    const viewId = crypto.randomUUID();
    const timestamp = "2026-08-01T00:00:00.000Z";
    await legacy.open();
    await legacy.table("savedViews").add({
      schemaVersion: SCHEMA_VERSION,
      id: viewId,
      name: "v2 原有视图",
      query: "旧研究",
      filters: {},
      sort: { field: "updatedAt", direction: "desc" },
      createdAt: timestamp,
      updatedAt: timestamp
    });
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    expect(await upgraded.savedViews.get(viewId)).toMatchObject({
      state: "migration_required",
      name: "v2 原有视图",
      legacyRecord: { id: viewId, query: "旧研究", filters: {} }
    });
    expect(await upgraded.candidateSets.count()).toBe(0);
    expect(await upgraded.birthFingerprints.count()).toBe(0);
    expect(await upgraded.knowledgeDocuments.count()).toBe(0);
    expect(await upgraded.citations.count()).toBe(0);
  });

  it("从 v3 升级时为正式修订和未知时辰候选组回填派生出生指纹", async () => {
    const chart = await getCalculatedChart();
    const candidateSet = await calculateUnknownHourCandidates({
      ...input,
      time: null,
      timePrecision: "unknown_hour"
    }, WORKING_DEFAULT_RULE_PROFILE);
    const databaseName = `hakimi-v3-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(databaseName);
    openDatabases.push(legacy);
    legacy.version(3).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt"
    });
    const caseId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    // v3 core restore once allowed a Revision and CandidateSet to share an ID.
    // v4 must preserve both derived owners instead of silently overwriting one.
    const candidateId = revisionId;
    const timestamp = "2026-08-01T00:00:00.000Z";
    const candidateSnapshotDigest = await sha256Hex(candidateSet);
    await legacy.open();
    await legacy.transaction("rw", legacy.table("cases"), legacy.table("revisions"), legacy.table("candidateSets"), async () => {
      await legacy.table("cases").add({
        schemaVersion: SCHEMA_VERSION,
        id: caseId,
        alias: "v3 正式案例",
        tags: [],
        notes: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        latestRevisionId: revisionId,
        revisionCount: 1
      });
      await legacy.table("revisions").add({
        schemaVersion: SCHEMA_VERSION,
        id: revisionId,
        caseId,
        revisionNumber: 1,
        createdAt: timestamp,
        input: chart.input,
        timeCalibration: chart.timeCalibration,
        ruleProfile: chart.ruleProfile,
        luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
        facts: chart.facts,
        manifest: chart.manifest
      });
      await legacy.table("candidateSets").add({
        schemaVersion: SCHEMA_VERSION,
        recordType: "unknown_hour_candidate_set",
        id: candidateId,
        alias: "v3 候选组",
        tags: [],
        notes: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        candidateSet,
        snapshotDigest: candidateSnapshotDigest
      });
    });
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    expect(await upgraded.birthFingerprints.count()).toBe(2);
    const fingerprints = await upgraded.birthFingerprints.toArray();
    expect(fingerprints.map((record) => record.recordType).sort())
      .toEqual(["candidate_set", "revision"]);
    expect(fingerprints.map((record) => record.sourceId)).toEqual([revisionId, revisionId]);
    expect(new Set(fingerprints.map((record) => record.key)).size).toBe(2);
  });

  it("从 v4 升级时原样保留已有分区并只创建空资料与引用表", async () => {
    const databaseName = `hakimi-v4-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(databaseName);
    openDatabases.push(legacy);
    legacy.version(4).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    const viewId = crypto.randomUUID();
    const timestamp = "2026-08-01T00:00:00.000Z";
    await legacy.open();
    await legacy.table("savedViews").add({
      schemaVersion: SCHEMA_VERSION,
      id: viewId,
      name: "v4 原有视图",
      query: "保留",
      filters: {},
      sort: { field: "updatedAt", direction: "desc" },
      createdAt: timestamp,
      updatedAt: timestamp
    });
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    expect(await upgraded.savedViews.get(viewId)).toMatchObject({
      state: "migration_required",
      name: "v4 原有视图",
      legacyRecord: { id: viewId, query: "保留", filters: {} }
    });
    expect(await upgraded.knowledgeDocuments.count()).toBe(0);
    expect(await upgraded.citations.count()).toBe(0);
  });

  it("migrates v6 case and candidate-set shells to lifecycle record version 2", async () => {
    const chart = await getCalculatedChart();
    const candidateSet = await calculateUnknownHourCandidates({
      ...input,
      time: null,
      timePrecision: "unknown_hour"
    }, WORKING_DEFAULT_RULE_PROFILE);
    const databaseName = `hakimi-v6-lifecycle-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(databaseName);
    openDatabases.push(legacy);
    legacy.version(6).stores({
      cases: "id, updatedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    const timestamp = "2026-08-01T00:00:00.000Z";
    const caseId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    const candidateSetId = crypto.randomUUID();
    const candidateSetDigest = await sha256Hex(candidateSet);
    await legacy.open();
    await legacy.transaction("rw", legacy.table("cases"), legacy.table("revisions"), legacy.table("candidateSets"), async () => {
      await legacy.table("cases").add({
        schemaVersion: SCHEMA_VERSION,
        id: caseId,
        alias: "v6 case",
        tags: [],
        notes: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        latestRevisionId: revisionId,
        revisionCount: 1
      });
      await legacy.table("revisions").add({
        schemaVersion: SCHEMA_VERSION,
        id: revisionId,
        caseId,
        revisionNumber: 1,
        createdAt: timestamp,
        input: chart.input,
        timeCalibration: chart.timeCalibration,
        ruleProfile: chart.ruleProfile,
        luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
        facts: chart.facts,
        manifest: chart.manifest
      });
      await legacy.table("candidateSets").add({
        schemaVersion: SCHEMA_VERSION,
        recordType: "unknown_hour_candidate_set",
        id: candidateSetId,
        alias: "v6 candidate set",
        tags: [],
        notes: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        candidateSet,
        snapshotDigest: candidateSetDigest
      });
    });
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    expect(await upgraded.cases.get(caseId)).toMatchObject({ recordVersion: 2, favorite: false, deletedAt: null });
    expect(await upgraded.candidateSets.get(candidateSetId)).toMatchObject({ recordVersion: 2, favorite: false, deletedAt: null });
    const subjects = await new CaseRepository(upgraded).listResearchSubjects();
    expect(new Set(subjects.map((subject) => subject.id))).toEqual(new Set([caseId, candidateSetId]));
  });

  it("将 v7 分钟事件显式迁移为 legacy_floating，绝不推断时区或 UTC", async () => {
    const databaseName = `hakimi-v7-event-time-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(databaseName);
    openDatabases.push(legacy);
    legacy.version(7).stores({
      cases: "id, updatedAt, deletedAt, *tags, latestRevisionId",
      revisions: "id, caseId, [caseId+revisionNumber], createdAt, manifest.resultHash",
      candidateSets: "id, updatedAt, deletedAt, *tags, candidateSet.resultHash",
      researchNotes: "id, caseId, [caseId+lifecycle], anchor.kind, anchor.revisionId, updatedAt, *tags",
      events: "id, caseId, revisionId, datePrecision, startDate, deletedAt, updatedAt, *tags",
      savedViews: "id, name, updatedAt, createdAt",
      knowledgeDocuments: "id, contentHash, updatedAt, createdAt, format, fileName",
      citations: "id, documentId, documentContentHash, updatedAt, createdAt, status, *targetKeys",
      sourceRights: "documentId, documentContentHash, origin, rights.status, rights.distributionPolicy, review.status, updatedAt",
      birthFingerprints: "key, fingerprint, sourceId, subjectId, recordType"
    });
    const eventId = crypto.randomUUID();
    const timestamp = "2026-08-01T00:00:00.000Z";
    await legacy.open();
    await legacy.table("events").add({
      schemaVersion: SCHEMA_VERSION,
      id: eventId,
      caseId: crypto.randomUUID(),
      revisionId: null,
      transitNodeRef: null,
      datePrecision: "minute",
      startDate: "2025-11-02T01:30",
      endDate: null,
      title: "纽约 DST 重叠旧记录",
      tags: ["迁移"],
      sourceRefs: [],
      feedback: "unreviewed",
      bodyFormat: "markdown",
      body: "旧版本没有保存 IANA 时区。",
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    const event = await upgraded.events.get(eventId);
    expect(event).toMatchObject({
      recordVersion: 2,
      startDate: "2025-11-02T01:30",
      timeContext: { kind: "legacy_floating" }
    });
    expect(event?.timeContext).not.toHaveProperty("timeZone");
    expect(event?.timeContext).not.toHaveProperty("start.canonicalUtc");
  });

  it("将每条合法 v8 SavedView 完整包入不可执行的 migration_required 记录", async () => {
    const databaseName = `hakimi-v8-saved-view-migration-${crypto.randomUUID()}`;
    const legacy = createV8Database(databaseName);
    openDatabases.push(legacy);
    const legacyRecord = {
      schemaVersion: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      name: "任意旧过滤器",
      query: "事业 流年",
      filters: { nested: { tags: ["事业"], includeArchived: true }, threshold: 3 },
      sort: { field: "updatedAt", direction: "desc" },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    };
    await legacy.open();
    await legacy.table("savedViews").add(legacyRecord);
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();
    expect(upgraded.verno).toBe(14);
    expect(await upgraded.savedViews.get(legacyRecord.id)).toEqual({
      schemaVersion: SCHEMA_VERSION,
      recordVersion: 2,
      state: "migration_required",
      id: legacyRecord.id,
      name: legacyRecord.name,
      legacyRecord,
      migrationReason: "legacy_untyped_filters_require_manual_review",
      editVersion: 1,
      createdAt: legacyRecord.createdAt,
      updatedAt: legacyRecord.updatedAt
    });
  });

  it("从 v9 升级到当前 v14 时原样保留九个用户分区并只创建六个空分区", async () => {
    const databaseName = `hakimi-v9-v14-partition-migration-${crypto.randomUUID()}`;
    const legacy = createV9Database(databaseName);
    openDatabases.push(legacy);
    const existingPartitionNames = [
      "cases",
      "revisions",
      "candidateSets",
      "researchNotes",
      "events",
      "savedViews",
      "knowledgeDocuments",
      "citations",
      "sourceRights"
    ] as const;
    const existingRows: Record<(typeof existingPartitionNames)[number], Record<string, unknown>> = {
      cases: { id: crypto.randomUUID(), sentinel: "cases", nested: { ordinal: 1 }, values: [1, null, "甲"] },
      revisions: { id: crypto.randomUUID(), sentinel: "revisions", nested: { ordinal: 2 }, values: [2, null, "乙"] },
      candidateSets: { id: crypto.randomUUID(), sentinel: "candidateSets", nested: { ordinal: 3 }, values: [3, null, "丙"] },
      researchNotes: { id: crypto.randomUUID(), sentinel: "researchNotes", nested: { ordinal: 4 }, values: [4, null, "丁"] },
      events: { id: crypto.randomUUID(), sentinel: "events", nested: { ordinal: 5 }, values: [5, null, "戊"] },
      savedViews: { id: crypto.randomUUID(), sentinel: "savedViews", nested: { ordinal: 6 }, values: [6, null, "己"] },
      knowledgeDocuments: { id: crypto.randomUUID(), sentinel: "knowledgeDocuments", nested: { ordinal: 7 }, values: [7, null, "庚"] },
      citations: { id: crypto.randomUUID(), sentinel: "citations", nested: { ordinal: 8 }, values: [8, null, "辛"] },
      sourceRights: {
        documentId: crypto.randomUUID(),
        sentinel: "sourceRights",
        nested: { ordinal: 9 },
        values: [9, null, "壬"]
      }
    };
    const existingBirthFingerprint = {
      key: `revision:${crypto.randomUUID()}`,
      sentinel: "birthFingerprints",
      nested: { ordinal: 10 },
      values: [10, null, "derived"]
    };

    await legacy.open();
    for (const tableName of existingPartitionNames) {
      await legacy.table(tableName).add(existingRows[tableName]);
    }
    await legacy.table("birthFingerprints").add(existingBirthFingerprint);
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    for (const tableName of existingPartitionNames) {
      expect(await upgraded.table(tableName).toArray()).toEqual([existingRows[tableName]]);
    }
    expect(await upgraded.birthFingerprints.toArray()).toEqual([existingBirthFingerprint]);
    expect(await upgraded.attachments.count()).toBe(0);
    expect(await upgraded.researcherProfiles.count()).toBe(0);
    expect(await upgraded.appSettings.count()).toBe(0);
    expect(await upgraded.ruleRegistry.count()).toBe(0);
    expect(await upgraded.tzdbMigrationReceipts.count()).toBe(0);
    expect(await upgraded.eventTimeMigrationReceipts.count()).toBe(0);
  });

  it("upgrades v11 to v14 while preserving rows and adding the two empty receipt stores", async () => {
    const databaseName = `hakimi-v11-v14-partition-migration-${crypto.randomUUID()}`;
    const legacy = createV11Database(databaseName);
    openDatabases.push(legacy);
    const ordinaryTables = [
      "cases",
      "revisions",
      "candidateSets",
      "researchNotes",
      "events",
      "savedViews",
      "knowledgeDocuments",
      "citations",
      "attachments",
      "researcherProfiles",
      "appSettings",
      "ruleRegistry"
    ] as const;
    const ordinaryRows = Object.fromEntries(ordinaryTables.map((tableName, index) => [
      tableName,
      { id: crypto.randomUUID(), sentinel: tableName, nested: { ordinal: index + 1 }, values: [index, null, tableName] }
    ])) as unknown as Record<(typeof ordinaryTables)[number], Record<string, unknown>>;
    const sourceRightsRow = {
      documentId: crypto.randomUUID(),
      sentinel: "sourceRights",
      nested: { ordinal: 13 },
      values: [13, null, "sourceRights"]
    };
    const birthFingerprintRow = {
      key: `candidate_set:${crypto.randomUUID()}`,
      sentinel: "birthFingerprints",
      nested: { ordinal: 14 },
      values: [14, null, "birthFingerprints"]
    };

    await legacy.open();
    for (const tableName of ordinaryTables) await legacy.table(tableName).add(ordinaryRows[tableName]);
    await legacy.table("sourceRights").add(sourceRightsRow);
    await legacy.table("birthFingerprints").add(birthFingerprintRow);
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    for (const tableName of ordinaryTables) {
      expect(await upgraded.table(tableName).toArray()).toEqual([ordinaryRows[tableName]]);
    }
    expect(await upgraded.sourceRights.toArray()).toEqual([sourceRightsRow]);
    expect(await upgraded.birthFingerprints.toArray()).toEqual([birthFingerprintRow]);
    expect(await upgraded.tzdbMigrationReceipts.count()).toBe(0);
    expect(await upgraded.eventTimeMigrationReceipts.count()).toBe(0);
  });

  it("upgrades v12 to v14 without rewriting Events or existing tzdb receipts", async () => {
    const databaseName = `hakimi-v12-v14-partition-migration-${crypto.randomUUID()}`;
    const legacy = createV12Database(databaseName);
    openDatabases.push(legacy);
    const eventRow = {
      id: crypto.randomUUID(),
      caseId: crypto.randomUUID(),
      revisionId: null,
      sentinel: "v12-event-byte-preservation",
      nested: { wallTime: "2025-11-02T01:30", values: [null, 12, "event"] }
    };
    const tzdbReceiptRow = {
      id: crypto.randomUUID(),
      operation: "candidate_set_tzdb_recalculation",
      source: { recordId: crypto.randomUUID() },
      target: { recordId: crypto.randomUUID() },
      createdAt: "2026-08-02T00:00:00.000Z",
      sentinel: "v12-receipt-byte-preservation"
    };

    await legacy.open();
    await legacy.transaction("rw", legacy.table("events"), legacy.table("tzdbMigrationReceipts"), async () => {
      await legacy.table("events").add(eventRow);
      await legacy.table("tzdbMigrationReceipts").add(tzdbReceiptRow);
    });
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await upgraded.open();

    expect(upgraded.verno).toBe(14);
    expect(await upgraded.table("events").toArray()).toEqual([eventRow]);
    expect(await upgraded.table("tzdbMigrationReceipts").toArray()).toEqual([tzdbReceiptRow]);
    expect(await upgraded.eventTimeMigrationReceipts.count()).toBe(0);
  });

  it("旧 SavedView 不满足冻结 v1 schema 时中止整个 v9 升级并保留 v8 数据", async () => {
    const databaseName = `hakimi-v8-invalid-saved-view-${crypto.randomUUID()}`;
    const legacy = createV8Database(databaseName);
    openDatabases.push(legacy);
    const invalidRecord = {
      schemaVersion: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      name: "缺少排序的损坏记录",
      query: "事业",
      filters: {},
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    };
    await legacy.open();
    await legacy.table("savedViews").add(invalidRecord);
    legacy.close();

    const upgraded = new ResearchDatabase(databaseName);
    openDatabases.push(upgraded);
    await expect(upgraded.open()).rejects.toThrow();
    upgraded.close();

    const inspection = createV8Database(databaseName);
    openDatabases.push(inspection);
    await inspection.open();
    expect(inspection.verno).toBe(8);
    expect(await inspection.table("savedViews").get(invalidRecord.id)).toEqual(invalidRecord);
  });
});

describe("CandidateSet tzdb snapshot derivation", () => {
  async function seedLegacySource(cases: CaseRepository) {
    const current = structuredClone(await getCandidateSet());
    const source = await cases.createCandidateSet({
      alias: "legacy tzdb candidate set",
      tags: ["tzdb", "legacy"],
      notes: "immutable source snapshot",
      candidateSet: await asLegacyUnidentifiedCandidateSet(current)
    });
    return { current, source };
  }

  it("atomically creates a new snapshot, fingerprint and reproducible receipt without touching the source", async () => {
    const { database, cases } = createRepositories();
    const { current, source } = await seedLegacySource(cases);
    const sourceBefore = structuredClone(await database.candidateSets.get(source.id));

    const derived = await cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: source.id,
      expectedSourceSnapshotDigest: source.snapshotDigest,
      expectedTargetSnapshotId: current.tzdbVersion,
      candidateSet: current
    });

    expect(derived.source).toEqual(sourceBefore);
    expect(await database.candidateSets.get(source.id)).toEqual(sourceBefore);
    expect(derived.target).toMatchObject({
      alias: source.alias,
      tags: source.tags,
      notes: source.notes,
      favorite: source.favorite,
      deletedAt: null,
      candidateSet: current
    });
    expect(derived.target.id).not.toBe(source.id);
    expect(derived.receipt).toMatchObject({
      recordVersion: TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
      operation: "candidate_set_tzdb_recalculation",
      source: {
        recordId: source.id,
        snapshotDigest: source.snapshotDigest,
        resultHash: source.candidateSet.resultHash,
        tzdbVersion: LEGACY_UNIDENTIFIED_TZDB_VERSION
      },
      target: {
        recordId: derived.target.id,
        snapshotDigest: derived.target.snapshotDigest,
        resultHash: current.resultHash,
        tzdbVersion: current.tzdbVersion
      },
      comparison: {
        formatVersion: "2.0.0",
        behaviorChangedCount: 0,
        hashOnlyChangedCount: 13,
        unchangedCount: 0
      }
    });
    expect(derived.receipt.comparisonDigest).toBe(await sha256Hex(derived.receipt.comparison));
    expect(await database.candidateSets.count()).toBe(2);
    expect(await database.birthFingerprints.count()).toBe(2);
    expect(await database.tzdbMigrationReceipts.count()).toBe(1);
    expect(await cases.listTzdbMigrationReceiptsForCandidateSet(source.id)).toEqual([derived.receipt]);
    expect(await cases.listTzdbMigrationReceiptsForCandidateSet(derived.target.id)).toEqual([derived.receipt]);
    expect((await cases.readFullDataSnapshot()).tzdbMigrationReceipts).toEqual([derived.receipt]);
    await expect(cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: source.id,
      expectedSourceSnapshotDigest: source.snapshotDigest,
      expectedTargetSnapshotId: current.tzdbVersion,
      candidateSet: current
    })).rejects.toMatchObject({ code: "TARGET_TZDB_ALREADY_DERIVED" });
    expect(await database.candidateSets.count()).toBe(2);
    expect(await database.tzdbMigrationReceipts.count()).toBe(1);
  });

  it("binds the reviewed target id and rejects unregistered descriptor content before persistence", async () => {
    const expectedMismatch = createRepositories();
    const expectedMismatchSeed = await seedLegacySource(expectedMismatch.cases);
    await expect(expectedMismatch.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: expectedMismatchSeed.source.id,
      expectedSourceSnapshotDigest: expectedMismatchSeed.source.snapshotDigest,
      expectedTargetSnapshotId: RETAINED_TZDB_2025B_SNAPSHOT_ID,
      candidateSet: expectedMismatchSeed.current
    })).rejects.toMatchObject({ code: "TARGET_TZDB_EXPECTATION_MISMATCH" });
    expect(await expectedMismatch.database.candidateSets.count()).toBe(1);
    expect(await expectedMismatch.database.tzdbMigrationReceipts.count()).toBe(0);

    const descriptorMismatch = createRepositories();
    const descriptorMismatchSeed = await seedLegacySource(descriptorMismatch.cases);
    await expect(descriptorMismatch.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: descriptorMismatchSeed.source.id,
      expectedSourceSnapshotDigest: descriptorMismatchSeed.source.snapshotDigest,
      expectedTargetSnapshotId: descriptorMismatchSeed.current.tzdbVersion,
      candidateSet: withMismatchedBundledCandidateSetDescriptor(descriptorMismatchSeed.current)
    })).rejects.toMatchObject({ code: "TARGET_TZDB_DESCRIPTOR_MISMATCH" });
    expect(await descriptorMismatch.database.candidateSets.count()).toBe(1);
    expect(await descriptorMismatch.database.tzdbMigrationReceipts.count()).toBe(0);
  });

  it("prevents a semantic A-to-B-to-A cycle across one connected derivation lineage", async () => {
    const { database, cases } = createRepositories();
    const current = structuredClone(await getCandidateSet());
    const retained = await calculateUnknownHourCandidatesForBundledSnapshot(
      { ...input, time: null, timePrecision: "unknown_hour" },
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TZDB_2025B_SNAPSHOT_ID,
      { expectedTimeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B }
    );
    const source = await cases.createCandidateSet({ alias: "retained lineage root", candidateSet: retained });
    const first = await cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: source.id,
      expectedSourceSnapshotDigest: source.snapshotDigest,
      expectedTargetSnapshotId: current.tzdbVersion,
      candidateSet: current
    });

    await expect(cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: first.target.id,
      expectedSourceSnapshotDigest: first.target.snapshotDigest,
      expectedTargetSnapshotId: retained.tzdbVersion,
      candidateSet: retained
    })).rejects.toMatchObject({ code: "TARGET_TZDB_ALREADY_DERIVED" });
    expect(await database.candidateSets.count()).toBe(2);
    expect(await database.tzdbMigrationReceipts.count()).toBe(1);
  });

  it("continues to verify a frozen receipt v1 with its legacy comparison contract", async () => {
    const { database, cases } = createRepositories();
    const { current, source } = await seedLegacySource(cases);
    const derived = await cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: source.id,
      expectedSourceSnapshotDigest: source.snapshotDigest,
      expectedTargetSnapshotId: current.tzdbVersion,
      candidateSet: current
    });
    const legacyComparison = buildLegacyCandidateSetTzdbComparison(
      derived.source.candidateSet,
      derived.target.candidateSet
    );
    const legacyReceipt: TzdbMigrationReceipt = {
      ...derived.receipt,
      recordVersion: LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
      comparison: legacyComparison,
      comparisonDigest: await sha256Hex(legacyComparison)
    };
    await database.tzdbMigrationReceipts.put(legacyReceipt);

    expect(await cases.listTzdbMigrationReceiptsForCandidateSet(source.id)).toEqual([legacyReceipt]);
  });

  it("rejects stale CAS, tampered source, changed rules, same-tzdb targets, and invalid target integrity", async () => {
    const stale = createRepositories();
    const staleSeed = await seedLegacySource(stale.cases);
    await expect(stale.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: staleSeed.source.id,
      expectedSourceSnapshotDigest: alteredHex(staleSeed.source.snapshotDigest),
      candidateSet: staleSeed.current
    })).rejects.toMatchObject({ code: "SOURCE_SNAPSHOT_CHANGED" });
    expect(await stale.database.candidateSets.count()).toBe(1);
    expect(await stale.database.tzdbMigrationReceipts.count()).toBe(0);

    const tampered = createRepositories();
    const tamperedSeed = await seedLegacySource(tampered.cases);
    const tamperedSource = structuredClone(await tampered.database.candidateSets.get(tamperedSeed.source.id))!;
    tamperedSource.candidateSet.resultHash = alteredHex(tamperedSource.candidateSet.resultHash);
    await tampered.database.candidateSets.put(tamperedSource);
    await expect(tampered.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: tamperedSeed.source.id,
      expectedSourceSnapshotDigest: tamperedSeed.source.snapshotDigest,
      candidateSet: tamperedSeed.current
    })).rejects.toThrow();
    expect(await tampered.database.candidateSets.count()).toBe(1);
    expect(await tampered.database.tzdbMigrationReceipts.count()).toBe(0);

    const changedRules = createRepositories();
    const changedRulesSeed = await seedLegacySource(changedRules.cases);
    const changedRuleCandidateSet = await calculateUnknownHourCandidates({
      ...input,
      time: null,
      timePrecision: "unknown_hour"
    }, withDayBoundary("midnight"));
    await expect(changedRules.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: changedRulesSeed.source.id,
      expectedSourceSnapshotDigest: changedRulesSeed.source.snapshotDigest,
      candidateSet: changedRuleCandidateSet
    })).rejects.toMatchObject({ code: "RULE_CHANGED" });

    const sameTzdb = createRepositories();
    const sameTzdbSeed = await seedLegacySource(sameTzdb.cases);
    await expect(sameTzdb.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: sameTzdbSeed.source.id,
      expectedSourceSnapshotDigest: sameTzdbSeed.source.snapshotDigest,
      candidateSet: sameTzdbSeed.source.candidateSet
    })).rejects.toMatchObject({ code: "SAME_TZDB" });

    const invalidTarget = createRepositories();
    const invalidTargetSeed = await seedLegacySource(invalidTarget.cases);
    const badTarget = structuredClone(invalidTargetSeed.current);
    badTarget.resultHash = alteredHex(badTarget.resultHash);
    await expect(invalidTarget.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: invalidTargetSeed.source.id,
      expectedSourceSnapshotDigest: invalidTargetSeed.source.snapshotDigest,
      candidateSet: badTarget
    })).rejects.toThrow();
    expect(await invalidTarget.database.candidateSets.count()).toBe(1);
    expect(await invalidTarget.database.tzdbMigrationReceipts.count()).toBe(0);
  });

  it("rejects restore receipts that cross immutable derivation inputs or reuse a target", async () => {
    const incompatible = createRepositories();
    const incompatibleSeed = await seedLegacySource(incompatible.cases);
    const otherInputCandidateSet = await calculateUnknownHourCandidates({
      ...input,
      time: null,
      timePrecision: "unknown_hour",
      sex: "female"
    }, WORKING_DEFAULT_RULE_PROFILE);
    const incompatibleTarget = await incompatible.cases.createCandidateSet({
      alias: "different input target",
      candidateSet: otherInputCandidateSet
    });
    const incompatibleComparison = buildCandidateSetTzdbComparison(
      incompatibleSeed.source.candidateSet,
      incompatibleTarget.candidateSet
    );
    const incompatibleReceipt: TzdbMigrationReceipt = {
      schemaVersion: SCHEMA_VERSION,
      recordVersion: TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
      id: crypto.randomUUID(),
      operation: "candidate_set_tzdb_recalculation",
      source: {
        kind: "candidate_set",
        recordId: incompatibleSeed.source.id,
        snapshotDigest: incompatibleSeed.source.snapshotDigest,
        resultHash: incompatibleSeed.source.candidateSet.resultHash,
        tzdbVersion: incompatibleSeed.source.candidateSet.tzdbVersion
      },
      target: {
        kind: "candidate_set",
        recordId: incompatibleTarget.id,
        snapshotDigest: incompatibleTarget.snapshotDigest,
        resultHash: incompatibleTarget.candidateSet.resultHash,
        tzdbVersion: incompatibleTarget.candidateSet.tzdbVersion
      },
      comparison: incompatibleComparison,
      comparisonDigest: await sha256Hex(incompatibleComparison),
      createdAt: "2026-08-02T12:00:00.000Z"
    };
    const incompatibleSnapshot = await incompatible.cases.readFullDataSnapshot();
    await expect(incompatible.cases.replaceFullDataSnapshot({
      ...incompatibleSnapshot,
      tzdbMigrationReceipts: [incompatibleReceipt]
    })).rejects.toMatchObject({ code: "RECEIPT_RELATION_MISMATCH" });

    const duplicate = createRepositories();
    const duplicateSeed = await seedLegacySource(duplicate.cases);
    const derived = await duplicate.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: duplicateSeed.source.id,
      expectedSourceSnapshotDigest: duplicateSeed.source.snapshotDigest,
      candidateSet: duplicateSeed.current
    });
    const secondSource = await duplicate.cases.createCandidateSet({
      alias: "second legacy source",
      candidateSet: await asLegacyUnidentifiedCandidateSet(duplicateSeed.current)
    });
    const duplicateReceipt: TzdbMigrationReceipt = {
      ...structuredClone(derived.receipt),
      id: crypto.randomUUID(),
      source: {
        kind: "candidate_set",
        recordId: secondSource.id,
        snapshotDigest: secondSource.snapshotDigest,
        resultHash: secondSource.candidateSet.resultHash,
        tzdbVersion: secondSource.candidateSet.tzdbVersion
      }
    };
    const duplicateSnapshot = await duplicate.cases.readFullDataSnapshot();
    await expect(duplicate.cases.replaceFullDataSnapshot({
      ...duplicateSnapshot,
      tzdbMigrationReceipts: [...duplicateSnapshot.tzdbMigrationReceipts, duplicateReceipt]
    })).rejects.toMatchObject({ code: "RECEIPT_RELATION_MISMATCH" });
  });

  it("rolls back the target and fingerprint when receipt persistence fails", async () => {
    const { database, cases } = createRepositories();
    const { current, source } = await seedLegacySource(cases);
    database.tzdbMigrationReceipts.hook("creating", () => {
      throw new Error("receipt write failed");
    });

    await expect(cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: source.id,
      expectedSourceSnapshotDigest: source.snapshotDigest,
      candidateSet: current
    })).rejects.toThrow("receipt write failed");
    expect(await database.candidateSets.count()).toBe(1);
    expect(await database.birthFingerprints.count()).toBe(1);
    expect(await database.tzdbMigrationReceipts.count()).toBe(0);
    expect(await database.candidateSets.get(source.id)).toEqual(source);
  });

  it("cascades only linked receipts when either endpoint is permanently deleted", async () => {
    const first = createRepositories();
    const firstSeed = await seedLegacySource(first.cases);
    const firstDerived = await first.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: firstSeed.source.id,
      expectedSourceSnapshotDigest: firstSeed.source.snapshotDigest,
      candidateSet: firstSeed.current
    });
    await first.cases.trashCandidateSet(firstSeed.source.id);
    await first.cases.deleteCandidateSet(firstSeed.source.id);
    expect(await first.cases.getCandidateSet(firstSeed.source.id)).toBeNull();
    expect(await first.cases.getCandidateSet(firstDerived.target.id)).toEqual(firstDerived.target);
    expect(await first.database.tzdbMigrationReceipts.count()).toBe(0);

    const second = createRepositories();
    const secondSeed = await seedLegacySource(second.cases);
    const secondDerived = await second.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: secondSeed.source.id,
      expectedSourceSnapshotDigest: secondSeed.source.snapshotDigest,
      candidateSet: secondSeed.current
    });
    await second.cases.trashCandidateSet(secondDerived.target.id);
    await second.cases.deleteCandidateSet(secondDerived.target.id);
    expect(await second.cases.getCandidateSet(secondDerived.target.id)).toBeNull();
    expect(await second.cases.getCandidateSet(secondSeed.source.id)).toEqual(secondSeed.source);
    expect(await second.database.tzdbMigrationReceipts.count()).toBe(0);
  });
});

describe("Event legacy time semantic derivation", () => {
  async function forceLegacyFloating(
    database: ResearchDatabase,
    research: ResearchRepository,
    event: EventRecord
  ): Promise<EventRecord> {
    await database.events.update(event.id, { timeContext: { kind: "legacy_floating" } });
    const legacy = await research.getEvent(event.id);
    if (!legacy) throw new Error("legacy Event fixture was not persisted");
    return legacy;
  }

  async function seedLegacyDayEvent(options: { withTransit?: boolean } = {}) {
    const repositories = createRepositories();
    const bundle = await seedCase(repositories.cases, "legacy Event case");
    const revision = bundle.revisions[0];
    const ref = options.withTransit === false ? null : await transitRef(revision);
    const current = await repositories.research.createEvent({
      ...eventInput(bundle.caseRecord.id, revision.id),
      transitNodeRef: ref
    });
    const source = await forceLegacyFloating(repositories.database, repositories.research, current);
    return { ...repositories, bundle, source };
  }

  async function seedLegacyOverlapEvent() {
    const repositories = createRepositories();
    const bundle = await seedCase(repositories.cases, "DST overlap Event case");
    const current = await repositories.research.createEvent({
      ...eventInput(bundle.caseRecord.id, bundle.revisions[0].id),
      datePrecision: "minute",
      startDate: "2024-11-03T01:30",
      endDate: null,
      timeZone: "America/New_York",
      startDisambiguation: "earlier"
    });
    const source = await forceLegacyFloating(repositories.database, repositories.research, current);
    return { ...repositories, bundle, source };
  }

  it("creates an append-only calendar derivation and freezes only actual lineage/time changes", async () => {
    const { database, cases, research, source } = await seedLegacyDayEvent();
    const sourceBefore = structuredClone(source);
    const expectedSourceRecordDigest = await computeEventRecordDigest(source);

    const derived = await research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest,
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });

    expect(derived.source).toEqual(sourceBefore);
    expect(await database.events.get(source.id)).toEqual(sourceBefore);
    expect(derived.target).toMatchObject({
      caseId: source.caseId,
      revisionId: source.revisionId,
      transitNodeRef: source.transitNodeRef,
      datePrecision: source.datePrecision,
      startDate: source.startDate,
      endDate: source.endDate,
      title: source.title,
      tags: source.tags,
      sourceRefs: source.sourceRefs,
      feedback: source.feedback,
      body: source.body,
      timeContext: { kind: "calendar_date" },
      deletedAt: null
    });
    expect(derived.target.id).not.toBe(source.id);
    expect(derived.receipt).toMatchObject({
      operation: "event_time_semantic_derivation",
      authorization: { kind: "explicit_local_user_confirmation" },
      source: {
        kind: "event",
        recordId: source.id,
        snapshot: buildEventTimeMigrationSnapshot(source)
      },
      target: {
        kind: "event",
        recordId: derived.target.id,
        snapshot: buildEventTimeMigrationSnapshot(derived.target)
      },
      interpretation: { kind: "calendar_date" },
      createdAt: derived.target.createdAt
    });
    expect(derived.receipt.source.snapshotDigest).toBe(await sha256Hex(derived.receipt.source.snapshot));
    expect(derived.receipt.target.snapshotDigest).toBe(await sha256Hex(derived.receipt.target.snapshot));
    expect(await research.listEventTimeMigrationReceiptsForEvent(source.id)).toEqual([derived.receipt]);
    expect(await research.listEventTimeMigrationReceiptsForEvent(derived.target.id)).toEqual([derived.receipt]);
    if (!source.revisionId) throw new Error("single-chart Event fixture requires a Revision");
    expect((await cases.readSingleChartExportSnapshot(source.caseId, source.revisionId)).eventTimeMigrationReceipts)
      .toEqual([derived.receipt]);

    const sourceContentEdit = await research.updateEvent(source.id, {
      datePrecision: source.datePrecision,
      startDate: source.startDate,
      endDate: source.endDate,
      title: "reviewed legacy source"
    });
    expect(sourceContentEdit.timeContext).toEqual({ kind: "legacy_floating" });
    const sameTimeEdit = await research.updateEvent(derived.target.id, {
      revisionId: derived.target.revisionId,
      startDate: derived.target.startDate,
      title: "reviewed derived target"
    });
    expect(sameTimeEdit.startDate).toBe(derived.target.startDate);
    await research.softDeleteEvent(derived.target.id);
    await research.restoreEvent(derived.target.id);
    expect(await research.listEventTimeMigrationReceiptsForEvent(derived.target.id)).toEqual([derived.receipt]);

    await expect(research.updateEvent(derived.target.id, {
      startDate: "2025-03-13"
    })).rejects.toMatchObject({ code: "EVENT_DERIVATION_LINEAGE_IMMUTABLE" });
    await expect(research.updateEvent(source.id, {
      revisionId: null,
      transitNodeRef: null
    })).rejects.toMatchObject({ code: "EVENT_DERIVATION_LINEAGE_IMMUTABLE" });

    const snapshot = await cases.readFullDataSnapshot();
    expect(snapshot.eventTimeMigrationReceipts).toEqual([derived.receipt]);
    const restored = createRepositories();
    await restored.cases.replaceFullDataSnapshot(snapshot);
    expect(await restored.research.listEventTimeMigrationReceiptsForEvent(source.id)).toEqual([derived.receipt]);
  });

  it("allows both explicit New York overlap interpretations but rejects an exact duplicate", async () => {
    const { database, research, source } = await seedLegacyOverlapEvent();
    const sourceBefore = structuredClone(source);
    const expectedSourceRecordDigest = await computeEventRecordDigest(source);

    const later = await research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest,
      confirmed: true,
      interpretation: {
        kind: "zoned_minute",
        timeZone: "America/New_York",
        startDisambiguation: "later",
        endDisambiguation: null
      }
    });
    const earlier = await research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest,
      confirmed: true,
      interpretation: {
        kind: "zoned_minute",
        timeZone: "America/New_York",
        startDisambiguation: "earlier",
        endDisambiguation: null
      }
    });

    expect(later.target.timeContext).toMatchObject({
      kind: "zoned_minute",
      start: {
        canonicalUtc: "2024-11-03T06:30:00Z",
        resolution: { policy: "later", status: "resolved_overlap_later" }
      }
    });
    expect(earlier.target.timeContext).toMatchObject({
      kind: "zoned_minute",
      start: {
        canonicalUtc: "2024-11-03T05:30:00Z",
        resolution: { policy: "earlier", status: "resolved_overlap_earlier" }
      }
    });
    expect(later.receipt.target.snapshotDigest).not.toBe(earlier.receipt.target.snapshotDigest);
    expect(await database.events.get(source.id)).toEqual(sourceBefore);
    expect(await research.listEventTimeMigrationReceiptsForEvent(source.id)).toHaveLength(2);

    await expect(research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest,
      confirmed: true,
      interpretation: {
        kind: "zoned_minute",
        timeZone: "America/New_York",
        startDisambiguation: "later",
        endDisambiguation: null
      }
    })).rejects.toMatchObject({ code: "TARGET_INTERPRETATION_ALREADY_DERIVED" });
    expect(await database.events.count()).toBe(3);
    expect(await database.eventTimeMigrationReceipts.count()).toBe(2);
  });

  it("fails closed for missing confirmation, stale source CAS, wrong target kind, deleted source, and non-legacy source", async () => {
    const { research, source } = await seedLegacyDayEvent({ withTransit: false });
    const expectedSourceRecordDigest = await computeEventRecordDigest(source);

    await expect(research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest,
      confirmed: false as true,
      interpretation: { kind: "calendar_date" }
    })).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });
    await expect(research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: alteredHex(expectedSourceRecordDigest),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    })).rejects.toMatchObject({ code: "SOURCE_RECORD_CHANGED" });
    await expect(research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest,
      confirmed: true,
      interpretation: {
        kind: "zoned_minute",
        timeZone: "Asia/Shanghai",
        startDisambiguation: "reject",
        endDisambiguation: null
      }
    })).rejects.toMatchObject({ code: "TARGET_KIND_MISMATCH" });

    const deleted = await research.softDeleteEvent(source.id);
    await expect(research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(deleted),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    })).rejects.toMatchObject({ code: "SOURCE_DELETED" });
    await research.restoreEvent(source.id);

    const derived = await research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(await research.getEvent(source.id)),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });
    await expect(research.deriveLegacyEventTime({
      sourceEventId: derived.target.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(derived.target),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    })).rejects.toMatchObject({ code: "SOURCE_NOT_LEGACY_FLOATING" });
  });

  it("rolls back the derived Event when receipt persistence fails", async () => {
    const { database, research, source } = await seedLegacyDayEvent({ withTransit: false });
    const sourceBefore = structuredClone(source);
    database.eventTimeMigrationReceipts.hook("creating", () => {
      throw new Error("event receipt write failed");
    });

    await expect(research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(source),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    })).rejects.toThrow("event receipt write failed");
    expect(await database.events.count()).toBe(1);
    expect(await database.events.get(source.id)).toEqual(sourceBefore);
    expect(await database.eventTimeMigrationReceipts.count()).toBe(0);
  });

  it("rejects receipt tampering on both focused reads and full snapshot reads", async () => {
    const { database, cases, research, source } = await seedLegacyDayEvent({ withTransit: false });
    const derived = await research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(source),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });
    await database.eventTimeMigrationReceipts.put({
      ...structuredClone(derived.receipt),
      source: {
        ...structuredClone(derived.receipt.source),
        snapshotDigest: alteredHex(derived.receipt.source.snapshotDigest)
      }
    });

    await expect(research.listEventTimeMigrationReceiptsForEvent(source.id))
      .rejects.toMatchObject({ code: "RECEIPT_RELATION_MISMATCH" });
    await expect(cases.readFullDataSnapshot())
      .rejects.toMatchObject({ code: "RECEIPT_RELATION_MISMATCH" });
  });

  it("reads and restores a receipt whose identified target tzdb snapshot is no longer runtime-current", async () => {
    const { database, cases, research, source } = await seedLegacyOverlapEvent();
    const derived = await research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(source),
      confirmed: true,
      interpretation: {
        kind: "zoned_minute",
        timeZone: "America/New_York",
        startDisambiguation: "earlier",
        endDisambiguation: null
      }
    });
    const historicalTarget = withDifferentTimeZoneDatabaseSnapshot(derived.target);
    const historicalReceipt = structuredClone(derived.receipt);
    historicalReceipt.target.snapshot = buildEventTimeMigrationSnapshot(historicalTarget);
    historicalReceipt.target.snapshotDigest = await sha256Hex(historicalReceipt.target.snapshot);
    await database.transaction("rw", database.events, database.eventTimeMigrationReceipts, async () => {
      await database.events.put(historicalTarget);
      await database.eventTimeMigrationReceipts.put(historicalReceipt);
    });

    await expect(research.listEventTimeMigrationReceiptsForEvent(historicalTarget.id))
      .resolves.toEqual([historicalReceipt]);
    const snapshot = await cases.readFullDataSnapshot();
    const restored = createRepositories();
    await restored.cases.replaceFullDataSnapshot(snapshot);
    await expect(restored.research.listEventTimeMigrationReceiptsForEvent(historicalTarget.id))
      .resolves.toEqual([historicalReceipt]);
  });

  it("includes the Event receipt ledger in full-replace CAS even when only the current receipt table changed", async () => {
    const { database, cases, research, source } = await seedLegacyDayEvent({ withTransit: false });
    const derived = await research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(source),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });
    const snapshot = await cases.readFullDataSnapshot();
    const expectedCurrentPayloadDigest = await sha256Hex(snapshot);
    await cases.replaceFullDataSnapshot(snapshot, { expectedCurrentPayloadDigest });
    await database.eventTimeMigrationReceipts.add({
      ...structuredClone(derived.receipt),
      id: crypto.randomUUID()
    });

    await expect(cases.replaceFullDataSnapshot(snapshot, { expectedCurrentPayloadDigest }))
      .rejects.toMatchObject({ code: "CURRENT_DATA_CHANGED" });
    expect(await database.eventTimeMigrationReceipts.count()).toBe(2);
  });

  it("keeps historical zoned-minute snapshots content-editable but rejects same-ID time edits", async () => {
    const { database, cases, research } = createRepositories();
    const bundle = await seedCase(cases, "historical zoned Event case");
    const current = await research.createEvent({
      ...eventInput(bundle.caseRecord.id, bundle.revisions[0].id),
      datePrecision: "minute",
      startDate: "2025-03-12T12:00",
      endDate: null,
      timeZone: "Asia/Shanghai"
    });
    const historical = withDifferentTimeZoneDatabaseSnapshot(current);
    await database.events.put(historical);

    if (historical.timeContext.kind !== "zoned_minute") throw new Error("expected zoned Event fixture");
    const contentEdited = await research.updateEvent(historical.id, {
      datePrecision: historical.datePrecision,
      startDate: historical.startDate,
      endDate: historical.endDate,
      timeZone: historical.timeContext.timeZone,
      startDisambiguation: historical.timeContext.start.resolution.policy,
      endDisambiguation: "reject",
      body: "historical content review"
    });
    expect(contentEdited.body).toBe("historical content review");
    expect(contentEdited.timeContext).toEqual(historical.timeContext);
    await expect(research.updateEvent(historical.id, { startDate: "2025-03-12T12:01" }))
      .rejects.toMatchObject({ code: "HISTORICAL_EVENT_TIME_DERIVATION_REQUIRED" });
    expect((await research.getEvent(historical.id))?.startDate).toBe("2025-03-12T12:00");
  });

  it("cascades Event receipts when a parent Case or CandidateSet is permanently deleted", async () => {
    const caseFixture = await seedLegacyDayEvent({ withTransit: false });
    await caseFixture.research.deriveLegacyEventTime({
      sourceEventId: caseFixture.source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(caseFixture.source),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });
    await caseFixture.cases.trashCase(caseFixture.bundle.caseRecord.id);
    await caseFixture.cases.deleteCase(caseFixture.bundle.caseRecord.id);
    expect(await caseFixture.database.events.count()).toBe(0);
    expect(await caseFixture.database.eventTimeMigrationReceipts.count()).toBe(0);

    const candidateFixture = createRepositories();
    const candidate = await candidateFixture.cases.createCandidateSet({
      alias: "candidate parent with legacy Event",
      candidateSet: await getCandidateSet()
    });
    const current = await candidateFixture.research.createEvent({
      ...eventInput(candidate.id, null),
      revisionId: null,
      transitNodeRef: null
    });
    const source = await forceLegacyFloating(candidateFixture.database, candidateFixture.research, current);
    await candidateFixture.research.deriveLegacyEventTime({
      sourceEventId: source.id,
      expectedSourceRecordDigest: await computeEventRecordDigest(source),
      confirmed: true,
      interpretation: { kind: "calendar_date" }
    });
    await candidateFixture.cases.trashCandidateSet(candidate.id);
    await candidateFixture.cases.deleteCandidateSet(candidate.id);
    expect(await candidateFixture.database.events.count()).toBe(0);
    expect(await candidateFixture.database.eventTimeMigrationReceipts.count()).toBe(0);
  });
});

describe("ResearchRepository CRUD", () => {
  it("支持锚定笔记、事件和保存视图的创建、读取、修改、复制与删除", async () => {
    const { cases, research } = createRepositories();
    const bundle = await seedCase(cases, "研究案例", ["重点"]);
    const revisionId = bundle.revisions[0].id;

    const note = await research.createResearchNote({
      caseId: bundle.caseRecord.id,
      anchor: { kind: "chart_field", revisionId, pillar: "day", field: "stem" },
      body: "**日主**偏旺。",
      tags: ["日主"],
      sourceRefs: ["书目:A-12"],
      lifecycle: "active"
    });
    const changedNote = await research.updateResearchNote(note.id, {
      expectedEditVersion: 1,
      patch: { body: "**日主**中和。", tags: ["日主", "复核"] }
    });
    expect(changedNote.editVersion).toBe(2);
    expect((await research.listResearchNotesByCase(bundle.caseRecord.id))[0].body).toContain("中和");

    const event = await research.createEvent(eventInput(bundle.caseRecord.id, revisionId));
    const changedEvent = await research.updateEvent(event.id, {
      feedback: "supports",
      body: "复盘后确认岗位调整。"
    });
    expect(changedEvent.feedback).toBe("supports");
    expect(await research.listEventsByCase(bundle.caseRecord.id)).toHaveLength(1);

    const view = await research.createSavedView({
      name: "事业研究",
      query: savedCaseQuery("岗位")
    });
    expect(view).toMatchObject({
      recordVersion: 2,
      state: "ready",
      editVersion: 1,
      queryDigest: await sha256Hex(savedCaseQuery("岗位"))
    });
    const updatedView = await research.updateSavedView(view.id, {
      expectedEditVersion: 1,
      patch: { query: savedCaseQuery("岗位 调整") }
    });
    expect(updatedView).toMatchObject({ editVersion: 2, queryDigest: await sha256Hex(savedCaseQuery("岗位 调整")) });
    const copy = await research.duplicateSavedView(updatedView.id, "事业研究副本");
    expect(copy.id).not.toBe(view.id);
    expect(copy).toMatchObject({ state: "ready", editVersion: 1, queryDigest: updatedView.queryDigest });
    expect(await research.restoreSavedViewState(copy.id)).toEqual({
      query: savedCaseQuery("岗位 调整")
    });
    expect(await research.listSavedViews()).toHaveLength(2);

    await research.deleteSavedView(copy.id);
    await research.deleteResearchNote(note.id);
    expect(await research.getSavedView(copy.id)).toBeNull();
    expect(await research.getResearchNote(note.id)).toBeNull();
  });

  it("完整高级 ResearchQuery 经保存、更新、复制与恢复后逐字段相等，并拒绝过期 editVersion", async () => {
    const { research } = createRepositories();
    const created = await research.createSavedView({
      name: "高级条件锁版",
      query: structuredClone(ADVANCED_CASE_QUERY)
    });
    expect(created).toMatchObject({
      state: "ready",
      editVersion: 1,
      query: ADVANCED_CASE_QUERY,
      queryDigest: ADVANCED_CASE_QUERY_DIGEST
    });
    await expect(research.restoreSavedViewState(created.id)).resolves.toEqual({
      query: ADVANCED_CASE_QUERY
    });

    const updatedQuery: ResearchCaseQuery = {
      ...structuredClone(ADVANCED_CASE_QUERY),
      sort: { field: "alias", direction: "asc" }
    };
    const updated = await research.updateSavedView(created.id, {
      expectedEditVersion: 1,
      patch: { name: "高级条件锁版（按别名）", query: updatedQuery }
    });
    expect(updated).toMatchObject({
      state: "ready",
      editVersion: 2,
      name: "高级条件锁版（按别名）",
      query: updatedQuery,
      queryDigest: await sha256Hex(updatedQuery)
    });

    await expect(research.updateSavedView(created.id, {
      expectedEditVersion: 1,
      patch: { name: "过期编辑不得覆盖" }
    })).rejects.toMatchObject({ code: "SAVED_VIEW_EDIT_VERSION_CONFLICT" });
    await expect(research.restoreSavedViewState(created.id)).resolves.toEqual({ query: updatedQuery });

    const copy = await research.duplicateSavedView(created.id, "高级条件锁版副本");
    expect(copy).toMatchObject({
      state: "ready",
      editVersion: 1,
      name: "高级条件锁版副本",
      query: updatedQuery,
      queryDigest: updated.queryDigest
    });
    await expect(research.restoreSavedViewState(copy.id)).resolves.toEqual({ query: updatedQuery });
    expect(copy.query).toEqual(updated.query);
  });

  it("首页最近保存视图读取固定只返回三条并保持更新时间倒序", async () => {
    const database = new ResearchDatabase(`hakimi-recent-views-${crypto.randomUUID()}`);
    openDatabases.push(database);
    const timestamps = [
      "2026-08-10T01:00:00.000Z",
      "2026-08-10T02:00:00.000Z",
      "2026-08-10T03:00:00.000Z",
      "2026-08-10T04:00:00.000Z"
    ];
    const research = new ResearchRepository(database, () => {
      const timestamp = timestamps.shift();
      if (!timestamp) throw new Error("missing SavedView timestamp fixture");
      return timestamp;
    });
    for (const name of ["第一条", "第二条", "第三条", "第四条"]) {
      await research.createSavedView({ name, query: savedCaseQuery(name) });
    }

    await expect(research.listRecentSavedViews()).resolves.toMatchObject([
      { name: "第四条" },
      { name: "第三条" },
      { name: "第二条" }
    ]);
  });

  it("每次读取 ready SavedView 都复核 canonical queryDigest 并拒绝篡改", async () => {
    const { database, research } = createRepositories();
    const view = await research.createSavedView({ name: "摘要保护", query: savedCaseQuery("事业") });
    const raw = await database.savedViews.get(view.id);
    if (!raw || raw.state !== "ready") throw new Error("expected ready SavedView fixture");
    const tampered = {
      ...raw,
      query: { ...raw.query, text: "财运" }
    };
    await database.savedViews.put(tampered as typeof raw);

    await expect(research.getSavedView(view.id)).rejects.toMatchObject({
      code: "SAVED_VIEW_QUERY_DIGEST_MISMATCH"
    });
    await expect(research.listSavedViews()).rejects.toMatchObject({
      code: "SAVED_VIEW_QUERY_DIGEST_MISMATCH"
    });
    await expect(research.listRecentSavedViews()).rejects.toMatchObject({
      code: "SAVED_VIEW_QUERY_DIGEST_MISMATCH"
    });
    await expect(new CaseRepository(database).readFullDataSnapshot()).rejects.toMatchObject({
      code: "SAVED_VIEW_QUERY_DIGEST_MISMATCH"
    });
  });

  it("旧任意 filters 只能经显式审核 API 转为 ready，不能恢复或复制执行", async () => {
    const { database, research } = createRepositories();
    const legacy = {
      schemaVersion: SCHEMA_VERSION,
      id: crypto.randomUUID(),
      name: "旧视图待审核",
      query: "事业",
      filters: { arbitrary: { includeArchived: true } },
      sort: { field: "updatedAt", direction: "desc" } as const,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    };
    await database.savedViews.put(migrateLegacySavedViewRecordV1(legacy));

    await expect(research.restoreSavedViewState(legacy.id)).rejects.toMatchObject({
      code: "SAVED_VIEW_MIGRATION_REQUIRED"
    });
    await expect(research.duplicateSavedView(legacy.id, "不能复制")).rejects.toMatchObject({
      code: "SAVED_VIEW_MIGRATION_REQUIRED"
    });
    await expect(research.updateSavedView(legacy.id, {
      expectedEditVersion: 1,
      patch: { name: "不能绕过" }
    })).rejects.toMatchObject({ code: "SAVED_VIEW_MIGRATION_REQUIRED" });

    const reviewedQuery = savedCaseQuery("事业");
    const ready = await research.resolveSavedViewMigration(legacy.id, {
      expectedEditVersion: 1,
      name: "已审核视图",
      query: reviewedQuery
    });
    expect(ready).toMatchObject({
      state: "ready",
      name: "已审核视图",
      editVersion: 2,
      query: reviewedQuery,
      queryDigest: await sha256Hex(reviewedQuery)
    });
    expect(ready).not.toHaveProperty("legacyRecord");
    await expect(research.resolveSavedViewMigration(legacy.id, {
      expectedEditVersion: 2,
      query: reviewedQuery
    })).rejects.toMatchObject({ code: "SAVED_VIEW_NOT_MIGRATION_REQUIRED" });
  });

  it("拒绝不存在或跨案例的 case/revision 关联", async () => {
    const { cases, research } = createRepositories();
    const first = await seedCase(cases, "案例甲");
    const second = await seedCase(cases, "案例乙");
    const missingId = crypto.randomUUID();
    const baseNote = {
      body: "关联检查",
      tags: [],
      sourceRefs: [],
      lifecycle: "active" as const
    };

    await expect(research.createResearchNote({
      ...baseNote,
      caseId: missingId,
      anchor: { kind: "case" }
    })).rejects.toMatchObject({ code: "CASE_NOT_FOUND" });
    await expect(research.createResearchNote({
      ...baseNote,
      caseId: first.caseRecord.id,
      anchor: { kind: "revision", revisionId: missingId }
    })).rejects.toMatchObject({ code: "REVISION_NOT_FOUND" });
    await expect(research.createResearchNote({
      ...baseNote,
      caseId: first.caseRecord.id,
      anchor: { kind: "revision", revisionId: second.revisions[0].id }
    })).rejects.toMatchObject({ code: "REVISION_CASE_MISMATCH" });
    await expect(research.createEvent(eventInput(first.caseRecord.id, second.revisions[0].id)))
      .rejects.toMatchObject({ code: "REVISION_CASE_MISMATCH" });

    expect(await research.database.researchNotes.count()).toBe(0);
    expect(await research.database.events.count()).toBe(0);
  });

  it("用 editVersion 原子拒绝陈旧笔记更新", async () => {
    const { cases, research } = createRepositories();
    const bundle = await seedCase(cases, "并发案例");
    const note = await research.createResearchNote({
      caseId: bundle.caseRecord.id,
      anchor: { kind: "case" },
      body: "初稿",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });

    await research.updateResearchNote(note.id, { expectedEditVersion: 1, patch: { body: "第一位编辑者" } });
    await expect(research.updateResearchNote(note.id, {
      expectedEditVersion: 1,
      patch: { body: "陈旧覆盖" }
    })).rejects.toBeInstanceOf(ResearchRepositoryError);
    await expect(research.updateResearchNote(note.id, {
      expectedEditVersion: 1,
      patch: { body: "陈旧覆盖" }
    })).rejects.toMatchObject({ code: "EDIT_VERSION_CONFLICT" });
    expect((await research.getResearchNote(note.id))?.body).toBe("第一位编辑者");
  });

  it("事件软删除默认隐藏，并可恢复", async () => {
    const { cases, research } = createRepositories();
    const bundle = await seedCase(cases, "事件案例");
    const event = await research.createEvent(eventInput(bundle.caseRecord.id));

    const deleted = await research.softDeleteEvent(event.id);
    expect(deleted.deletedAt).not.toBeNull();
    expect(await research.listEventsByCase(bundle.caseRecord.id)).toEqual([]);
    expect(await research.listEventsByCase(bundle.caseRecord.id, { includeDeleted: true })).toHaveLength(1);

    const restored = await research.restoreEvent(event.id);
    expect(restored.deletedAt).toBeNull();
    expect(await research.listEventsByCase(bundle.caseRecord.id)).toHaveLength(1);
  });

  it("分钟事件保存 IANA 时区、候选偏移与规范 UTC，并拒绝 DST 空档或未选择的重叠", async () => {
    const { cases, research } = createRepositories();
    const bundle = await seedCase(cases, "事件时区案例");
    const base = eventInput(bundle.caseRecord.id);
    const shanghai = await research.createEvent({
      ...base,
      datePrecision: "minute",
      startDate: "2025-03-12T09:15",
      timeZone: "Asia/Shanghai"
    });
    expect(shanghai.timeContext).toMatchObject({
      kind: "zoned_minute",
      timeZone: "Asia/Shanghai",
      start: {
        canonicalUtc: "2025-03-12T01:15:00Z",
        resolution: {
          kind: "unique",
          policy: "reject",
          selectedCandidate: { utcOffset: "+08:00" }
        }
      }
    });

    await expect(research.createEvent({
      ...base,
      datePrecision: "minute",
      startDate: "2025-11-02T01:30",
      timeZone: "America/New_York"
    })).rejects.toMatchObject({ code: "DST_OVERLAP_REQUIRES_CHOICE" });

    const earlier = await research.createEvent({
      ...base,
      title: "纽约重叠较早候选",
      datePrecision: "minute",
      startDate: "2025-11-02T01:30",
      timeZone: "America/New_York",
      startDisambiguation: "earlier"
    });
    const later = await research.createEvent({
      ...base,
      title: "纽约重叠较晚候选",
      datePrecision: "minute",
      startDate: "2025-11-02T01:30",
      timeZone: "America/New_York",
      startDisambiguation: "later"
    });
    expect(earlier.timeContext.kind === "zoned_minute" && earlier.timeContext.start.canonicalUtc)
      .toBe("2025-11-02T05:30:00Z");
    expect(later.timeContext.kind === "zoned_minute" && later.timeContext.start.canonicalUtc)
      .toBe("2025-11-02T06:30:00Z");

    await expect(research.createEvent({
      ...base,
      datePrecision: "minute",
      startDate: "2025-03-09T02:30",
      timeZone: "America/New_York",
      startDisambiguation: "later"
    })).rejects.toMatchObject({ code: "DST_GAP_REJECTED" });
  });

  it("普通编辑保留 legacy_floating，但所有时间覆盖都要求显式迁移流程", async () => {
    const { database, cases, research } = createRepositories();
    const bundle = await seedCase(cases, "旧事件转换案例");
    const event = await research.createEvent(eventInput(bundle.caseRecord.id));
    await database.events.update(event.id, {
      datePrecision: "minute",
      startDate: "2025-11-02T01:30",
      timeContext: { kind: "legacy_floating" }
    });

    const edited = await research.updateEvent(event.id, { body: "只修改旧事件正文。" });
    expect(edited.timeContext).toEqual({ kind: "legacy_floating" });
    expect(edited.startDate).toBe("2025-11-02T01:30");

    await expect(research.updateEvent(event.id, {
      timeZone: "America/New_York",
      startDisambiguation: "later"
    })).rejects.toMatchObject({ code: "LEGACY_EVENT_TIME_MIGRATION_REQUIRED" });
    await expect(research.updateEvent(event.id, {
      startDate: "2025-11-02T01:31"
    })).rejects.toMatchObject({ code: "LEGACY_EVENT_TIME_MIGRATION_REQUIRED" });
    expect(await research.getEvent(event.id)).toEqual(edited);
  });

  it("读取时拒绝结构合法但无法按 IANA 时区复算的事件时间上下文", async () => {
    const { database, cases, research } = createRepositories();
    const bundle = await seedCase(cases, "事件时间防篡改");
    const event = await research.createEvent({
      ...eventInput(bundle.caseRecord.id),
      datePrecision: "minute",
      startDate: "2025-03-12T09:15",
      timeZone: "Asia/Shanghai"
    });
    const forged = structuredClone(event);
    if (forged.timeContext.kind !== "zoned_minute") throw new Error("缺少分钟事件 fixture");
    forged.timeContext.timeZone = "Asia/Tokyo";
    for (const candidate of forged.timeContext.start.resolution.candidates) {
      candidate.zonedDateTime = candidate.zonedDateTime.replace("[Asia/Shanghai]", "[Asia/Tokyo]");
    }
    forged.timeContext.start.resolution.selectedCandidate = structuredClone(
      forged.timeContext.start.resolution.candidates[0]
    );
    await database.events.put(forged);

    await expect(research.getEvent(event.id)).rejects.toMatchObject({ code: "EVENT_TIME_CONTEXT_MISMATCH" });
    await expect(research.listEventsByCase(bundle.caseRecord.id)).rejects.toMatchObject({ code: "EVENT_TIME_CONTEXT_MISMATCH" });
  });

  it("写入正式运限节点并在普通编辑时保留绑定", async () => {
    const { cases, research } = createRepositories();
    const bundle = await seedCase(cases, "运限事件案例");
    const revision = bundle.revisions[0];
    const ref = await transitRef(revision);

    const event = await research.createEvent({
      ...eventInput(bundle.caseRecord.id, revision.id),
      transitNodeRef: ref
    });
    const edited = await research.updateEvent(event.id, { body: "只修改事件笔记。" });

    expect(edited.transitNodeRef).toEqual(ref);
    expect((await research.getEvent(event.id))?.transitNodeRef).toEqual(ref);

    const unbound = await research.updateEvent(event.id, { transitNodeRef: null });
    expect(unbound.transitNodeRef).toBeNull();

    const rebound = await research.updateEvent(event.id, { transitNodeRef: ref });
    expect(rebound.transitNodeRef).toEqual(ref);
  });

  it("拒绝缺少修订、跨修订或摘要被篡改的正式运限节点", async () => {
    const { cases, research } = createRepositories();
    const first = await seedCase(cases, "运限上下文甲");
    const second = await seedCase(cases, "运限上下文乙");
    const revision = first.revisions[0];
    const ref = await transitRef(revision);

    await expect(research.createEvent({
      ...eventInput(first.caseRecord.id),
      transitNodeRef: ref
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });

    await expect(research.createEvent({
      ...eventInput(first.caseRecord.id, revision.id),
      transitNodeRef: { ...ref, chartResultHash: "b".repeat(64) }
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });

    await expect(research.createEvent({
      ...eventInput(first.caseRecord.id, revision.id),
      transitNodeRef: { ...ref, algorithmId: "forged:storage-node:v1" }
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });

    await expect(research.createEvent({
      ...eventInput(first.caseRecord.id, second.revisions[0].id),
      transitNodeRef: ref
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });

    expect(await research.database.events.count()).toBe(0);
  });

  it("绑定后更新也会复算算法与节点事实哈希，失败时不覆盖原事件", async () => {
    const { cases, research } = createRepositories();
    const bundle = await seedCase(cases, "运限更新真实性");
    const revision = bundle.revisions[0];
    const ref = await transitRef(revision);
    const event = await research.createEvent({
      ...eventInput(bundle.caseRecord.id, revision.id),
      transitNodeRef: ref
    });

    await expect(research.updateEvent(event.id, {
      transitNodeRef: { ...ref, timelineVersion: "hakimi-transit:9.9.9" }
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });
    await expect(research.updateEvent(event.id, {
      transitNodeRef: { ...ref, nodeId: alteredHex(ref.nodeId) }
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });

    expect((await research.getEvent(event.id))?.transitNodeRef).toEqual(ref);
  });

  it("普通编辑继续保留只读的旧 future-transit-node 占位引用", async () => {
    const { database, cases, research } = createRepositories();
    const bundle = await seedCase(cases, "旧运限占位兼容");
    const event = await research.createEvent(eventInput(bundle.caseRecord.id, bundle.revisions[0].id));
    const legacyRef = {
      namespace: "future-transit-node" as const,
      nodeType: "year" as const,
      nodeId: "legacy-year-2025",
      timelineVersion: null
    };
    await database.events.update(event.id, { transitNodeRef: legacyRef });

    const edited = await research.updateEvent(event.id, { body: "只修改旧事件正文。" });
    expect(edited.transitNodeRef).toEqual(legacyRef);
  });

  it("没有大运规则快照的修订不能绑定正式运限节点", async () => {
    const { database, cases, research } = createRepositories();
    const bundle = await seedCase(cases, "无大运规则快照");
    const revision = structuredClone(bundle.revisions[0]);
    delete revision.luckCycleRuleSnapshot;
    delete revision.manifest.luckCycleRuleDigest;
    revision.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload({
      input: revision.input,
      timeCalibration: revision.timeCalibration,
      ruleProfile: revision.ruleProfile,
      facts: revision.facts,
      manifest: revision.manifest
    }));
    await database.revisions.put(revision);
    const ref = {
      ...await transitRef(bundle.revisions[0]),
      revisionId: revision.id,
      chartResultHash: revision.manifest.resultHash,
      ruleProfileDigest: revision.manifest.ruleProfileDigest,
      luckCycleRuleDigest: "a".repeat(64)
    };

    await expect(research.createEvent({
      ...eventInput(bundle.caseRecord.id, revision.id),
      transitNodeRef: ref
    })).rejects.toMatchObject({ code: "TRANSIT_CONTEXT_MISMATCH" });
    expect(await database.events.count()).toBe(0);
  });

  it("按简体中文搜索案例别名、标签和活跃笔记正文/标签", async () => {
    const { cases, research } = createRepositories();
    const first = await seedCase(cases, "林先生", ["重点案例"]);
    await seedCase(cases, "王女士", ["普通案例"]);
    const active = await research.createResearchNote({
      caseId: first.caseRecord.id,
      anchor: { kind: "case" },
      body: "观察事业转型窗口。",
      tags: ["用神讨论"],
      sourceRefs: [],
      lifecycle: "active"
    });
    await research.createResearchNote({
      caseId: first.caseRecord.id,
      anchor: { kind: "case" },
      body: "隐秘财运记录。",
      tags: [],
      sourceRefs: [],
      lifecycle: "archived"
    });

    expect((await research.searchCasesAndNotes("林先生"))[0]).toMatchObject({
      matchedCaseMetadata: true,
      matchingNoteIds: []
    });
    expect((await research.searchCasesAndNotes("重点案例"))[0].caseRecord.id).toBe(first.caseRecord.id);
    expect((await research.searchCasesAndNotes("事业转型"))[0].matchingNoteIds).toEqual([active.id]);
    expect((await research.searchCasesAndNotes("用神讨论"))[0].matchingNoteIds).toEqual([active.id]);
    expect(await research.searchCasesAndNotes("隐秘财运")).toEqual([]);
    expect((await research.searchCasesAndNotes("隐秘财运", { includeArchivedNotes: true }))[0].caseRecord.id)
      .toBe(first.caseRecord.id);
  });
});

describe("case deletion", () => {
  it("单事务级联删除案例、修订、笔记和事件，但保留全局保存视图", async () => {
    const { cases, research } = createRepositories();
    const target = await seedCase(cases, "待删除案例");
    const retained = await seedCase(cases, "保留案例");
    const note = await research.createResearchNote({
      caseId: target.caseRecord.id,
      anchor: { kind: "revision", revisionId: target.revisions[0].id },
      body: "随案例删除",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const event = await research.createEvent(eventInput(target.caseRecord.id, target.revisions[0].id));
    const view = await research.createSavedView({
      name: "全局视图",
      query: savedCaseQuery("")
    });

    await cases.trashCase(target.caseRecord.id);
    await cases.deleteCase(target.caseRecord.id);

    expect(await cases.getCase(target.caseRecord.id)).toBeNull();
    expect(await research.getResearchNote(note.id)).toBeNull();
    expect(await research.getEvent(event.id)).toBeNull();
    expect(await cases.database.birthFingerprints.where("sourceId").equals(target.revisions[0].id).first()).toBeUndefined();
    expect(await cases.getCase(retained.caseRecord.id)).not.toBeNull();
    expect(await research.getSavedView(view.id)).not.toBeNull();
  });
});

describe("core replacement dependency guard", () => {
  it("有任一研究分区数据时以稳定 code 拒绝替换，且不清空任何数据", async () => {
    const { cases, research } = createRepositories();
    const bundle = await seedCase(cases, "不可覆盖案例");
    const note = await research.createResearchNote({
      caseId: bundle.caseRecord.id,
      anchor: { kind: "case" },
      body: "保留笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const event = await research.createEvent(eventInput(bundle.caseRecord.id, bundle.revisions[0].id));
    const view = await research.createSavedView({
      name: "保留视图",
      query: savedCaseQuery("")
    });
    const snapshot = await cases.readCoreDataSnapshot();
    const replacement = {
      ...snapshot,
      cases: snapshot.cases.map((record) => ({ ...record, alias: "不应写入" }))
    };

    expect(await cases.readDependentDataCounts()).toEqual({
      researchNotes: 1,
      events: 1,
      savedViews: 1,
      citations: 0,
      attachments: 0
    });
    let thrown: unknown;
    try {
      await cases.replaceCoreDataSnapshot(replacement);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(CoreDataReplaceBlockedError);
    expect(thrown).toMatchObject({
      code: "DEPENDENT_RESEARCH_DATA_EXISTS",
      counts: { researchNotes: 1, events: 1, savedViews: 1, citations: 0, attachments: 0 }
    });
    expect((await cases.getCase(bundle.caseRecord.id))?.caseRecord.alias).toBe("不可覆盖案例");
    expect(await research.getResearchNote(note.id)).not.toBeNull();
    expect(await research.getEvent(event.id)).not.toBeNull();
    expect(await research.getSavedView(view.id)).not.toBeNull();
  });
});
