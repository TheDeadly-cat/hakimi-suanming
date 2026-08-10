import { afterEach, describe, expect, it, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  calculateChart,
  calculateUnknownHourCandidates,
  calculateUnknownHourCandidatesForBundledSnapshot
} from "@hakimi/bazi-core";
import type {
  BirthInput,
  ActiveRulePackRecord,
  CitationRecord,
  CitationTargetV03,
  CitationV03Record,
  EventRecord,
  EventTimeFullBackupEnvelope,
  EventTimeFullBackupManifest,
  EventTimeFullBackupPayload,
  FullBackupEnvelope,
  InstalledRulePackRecord,
  KnowledgeDocumentRecord,
  KnowledgeDocumentV03Record,
  LocalUserDataFullBackupEnvelope,
  LocalUserDataFullBackupManifest,
  LocalUserDataFullBackupPayload,
  LegacyFullBackupDigests,
  LegacyFullBackupEnvelope,
  LegacyFullBackupManifest,
  LegacyFullBackupPayload,
  LegacyEventRecordV1,
  LegacySavedViewRecordV1,
  LifecycleFullBackupEnvelope,
  LifecycleFullBackupManifest,
  LifecycleFullBackupPayload,
  PreviousFullBackupDigests,
  PreviousFullBackupEnvelope,
  PreviousFullBackupManifest,
  PreviousFullBackupPayload,
  RevisionRecord,
  ResearchCaseQuery,
  RuleRegistryFullBackupEnvelope,
  RuleRegistryFullBackupManifest,
  RuleRegistryFullBackupPayload,
  SavedViewFullBackupEnvelope,
  SavedViewFullBackupManifest,
  SavedViewFullBackupPayload,
  SourceRightsRecord,
  KnowledgeFullBackupDigests,
  KnowledgeFullBackupEnvelope,
  KnowledgeFullBackupManifest,
  KnowledgeFullBackupPayload,
  SourceRightsFullBackupEnvelope,
  SourceRightsFullBackupManifest,
  SourceRightsFullBackupPayload,
  TransitNode,
  TransitNodeRef,
  TzdbMigrationFullBackupEnvelope,
  TzdbMigrationFullBackupManifest,
  TzdbMigrationFullBackupPayload,
  UnknownHourCandidateResult
} from "@hakimi/contracts";
import {
  LEGACY_HASH_SCHEMA_VERSION,
  LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
  LEGACY_UNIDENTIFIED_TZDB_VERSION,
  buildCalculatedChartHashPayload,
  buildTimeZoneDatabaseSnapshotId,
  buildUnknownHourCandidateHashPayload,
  citationTargetKeys,
  eventRecordSchema
} from "@hakimi/contracts";
import { canonicalStringify, encodeCanonicalBase64, sha256Hex } from "@hakimi/integrity";
import { buildKnowledgeContentSnapshot } from "@hakimi/knowledge-core";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary } from "@hakimi/rule-profiles";
import {
  createWorkingDefaultRulePackEnvelope,
  verifyRulePackIntegrity
} from "@hakimi/rule-packs";
import {
  CaseRepository,
  ResearchDatabase,
  ResearchRepository,
  buildCandidateSetTzdbComparison,
  buildLegacyCandidateSetTzdbComparison,
  buildEventTimeMigrationSnapshot,
  computeEventRecordDigest
} from "@hakimi/storage";
import { RETAINED_TIME_ZONE_DATABASE_2025B } from "@hakimi/tzdb-core";
import {
  resolveEventTimeContextForBundledSnapshot,
  verifyEventTimeContextWithBundledArtifact
} from "@hakimi/time-core";
import {
  COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1,
  calculateTransitSnapshot
} from "@hakimi/transit-core";
import {
  ADVANCED_CASE_QUERY,
  ADVANCED_CASE_QUERY_DIGEST
} from "../../research-query/test-fixtures/advanced-case-query";
import {
  FULL_BACKUP_P1_11_REMAINING_GAPS,
  applyPreparedFullBackup,
  createFullBackup,
  createFullBackupArchive,
  importFullBackup,
  preflightFullBackup,
  prepareFullBackupImport,
  preflightFullBackupFile,
  recomputeFullBackupDigests,
  recomputeEventTimeFullBackupDigests,
  recomputeLifecycleFullBackupDigests,
  recomputeLocalUserDataFullBackupDigests,
  recomputeRuleRegistryFullBackupDigests,
  recomputeTzdbMigrationFullBackupDigests,
  recomputeSavedViewFullBackupDigests,
  recomputeSourceRightsFullBackupDigests,
  serializeFullBackup
} from "./index";
import frozenV07 from "../fixtures/full-backup-v0.7-frozen.json";

const databases: ResearchDatabase[] = [];
const exportedAt = "2026-08-01T00:00:00.000Z";
const options = { appVersion: "0.1.0-s0", exportedAt } as const;

async function ruleRegistryFixture(): Promise<{
  installed: InstalledRulePackRecord;
  active: ActiveRulePackRecord;
}> {
  const verified = await verifyRulePackIntegrity(await createWorkingDefaultRulePackEnvelope());
  const installed: InstalledRulePackRecord = {
    schemaVersion: "1.0.0",
    recordVersion: 1,
    recordType: "installed_rule_pack",
    id: verified.digest,
    packDigest: verified.digest,
    profileDigest: verified.profileDigest,
    packId: verified.envelope.metadata.packId,
    profileId: verified.envelope.profile.profileId,
    profileVersion: verified.envelope.profile.profileVersion,
    canonicalJson: verified.canonicalJson,
    localTrust: "unverified_local_import",
    importedAt: exportedAt
  };
  const active: ActiveRulePackRecord = {
    schemaVersion: "1.0.0",
    recordVersion: 1,
    recordType: "active_rule_pack",
    id: "active-rule-pack",
    activeDigest: installed.packDigest,
    activeProfileDigest: installed.profileDigest,
    activatedAt: exportedAt,
    approval: {
      status: "locally_approved_for_activation",
      acknowledgedAt: exportedAt,
      acknowledgementVersion: "rule-pack-local-approval@1",
      appVersion: options.appVersion,
      engineName: "hakimi-bazi-core",
      engineVersion: "0.1.0"
    }
  };
  return { installed, active };
}

const input: BirthInput = {
  schemaVersion: "1.0.0",
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

const unknownHourInput: BirthInput = {
  ...input,
  time: null,
  timePrecision: "unknown_hour",
  sourceNote: "时辰待考"
};

const casablancaUnknownHourInput: BirthInput = {
  ...unknownHourInput,
  date: "2026-10-01",
  timeZone: "Africa/Casablanca",
  sourceNote: "Casablanca 2025b/2026c full-backup fixture"
};

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

let candidateFixture: Awaited<ReturnType<typeof calculateUnknownHourCandidates>> | null = null;

function repositories() {
  const database = new ResearchDatabase(`hakimi-full-backup-test-${crypto.randomUUID()}`);
  databases.push(database);
  return {
    database,
    cases: new CaseRepository(database),
    research: new ResearchRepository(database)
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

async function compatibleV11Ref(node: TransitNode): Promise<TransitNodeRef> {
  const timelineVersion = COMPATIBLE_TRANSIT_TIMELINE_VERSION_V1_1;
  const factHash = await sha256Hex({
    timelineVersion,
    algorithmId: node.ref.algorithmId,
    revisionId: node.ref.revisionId,
    chartResultHash: node.ref.chartResultHash,
    ruleProfileDigest: node.ref.ruleProfileDigest,
    luckCycleRuleDigest: node.ref.luckCycleRuleDigest,
    manualDirection: node.ref.manualDirection,
    nodeType: node.nodeType,
    startInstant: node.startInstant,
    endExclusiveInstant: node.endExclusiveInstant,
    frame: node.frame,
    ganZhi: node.ganZhi,
    index: node.index,
    boundaryLabel: node.boundaryLabel
  });
  return {
    ...node.ref,
    timelineVersion,
    nodeId: `${Date.parse(node.startInstant)}.${factHash}`
  };
}

async function seedModeledData(
  cases: CaseRepository,
  research: ResearchRepository,
  alias: string,
  revisionCount = 2
) {
  const firstChart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
  let bundle = await cases.createCase({ alias, tags: ["backup"], notes: `${alias}-case-notes`, calculated: firstChart });
  if (revisionCount > 1) {
    const secondChart = await calculateChart(input, withDayBoundary("midnight"));
    bundle = await cases.addRevision(bundle.caseRecord.id, secondChart);
  }
  const revision = bundle.revisions.at(-1)!;
  const revisionId = revision.id;
  const note = await research.createResearchNote({
    caseId: bundle.caseRecord.id,
    anchor: { kind: "chart_field", revisionId, pillar: "day", field: "stem" },
    body: `${alias}-archived-note`,
    tags: ["archived"],
    sourceRefs: ["book:12"],
    lifecycle: "archived"
  });
  const event = await research.createEvent({
    caseId: bundle.caseRecord.id,
    revisionId,
    transitNodeRef: await transitRef(revision),
    datePrecision: "day",
    startDate: "2025-03-12",
    endDate: null,
    title: `${alias}-deleted-event`,
    tags: ["review"],
    sourceRefs: ["interview:2025-03"],
    feedback: "supports",
    body: "soft-deleted event remains backup data"
  });
  const deletedEvent = await research.softDeleteEvent(event.id);
  const savedView = await research.createSavedView({
    name: `${alias}-view`,
    query: savedCaseQuery(alias)
  });
  return { bundle, note, event: deletedEvent, savedView };
}

async function seedCandidateData(cases: CaseRepository, alias: string) {
  candidateFixture ??= await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
  return cases.createCandidateSet({
    alias: `${alias}-candidate-set`,
    tags: ["unknown-hour"],
    notes: "保留全部 13 个候选，不指定主盘。",
    candidateSet: structuredClone(candidateFixture)
  });
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

async function seedTzdbMigrationData(cases: CaseRepository, alias: string) {
  candidateFixture ??= await calculateUnknownHourCandidates(unknownHourInput, WORKING_DEFAULT_RULE_PROFILE);
  const source = await cases.createCandidateSet({
    alias: `${alias}-legacy-candidate-set`,
    tags: ["unknown-hour", "legacy-tzdb"],
    notes: "legacy unidentified tzdb snapshot",
    candidateSet: await asLegacyUnidentifiedCandidateSet(candidateFixture)
  });
  return cases.deriveCandidateSetTzdbSnapshot({
    sourceCandidateSetId: source.id,
    expectedSourceSnapshotDigest: source.snapshotDigest,
    candidateSet: structuredClone(candidateFixture)
  });
}

async function seedEventTimeMigrationData(
  database: ResearchDatabase,
  research: ResearchRepository,
  base: EventRecord,
  alias: string
) {
  const timestamp = "2026-08-02T00:00:00.000Z";
  const source = eventRecordSchema.parse({
    ...base,
    id: crypto.randomUUID(),
    revisionId: null,
    transitNodeRef: null,
    datePrecision: "minute",
    startDate: "2024-11-03T01:30",
    endDate: null,
    title: `${alias}-legacy-event`,
    timeContext: { kind: "legacy_floating" },
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  });
  await database.events.add(source);
  return research.deriveLegacyEventTime({
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
}

async function seedRetainedTzdbEvent(
  database: ResearchDatabase,
  base: EventRecord,
  alias: string
): Promise<EventRecord> {
  const timeContext = await resolveEventTimeContextForBundledSnapshot({
    datePrecision: "minute",
    startDate: "2026-10-01T12:00",
    endDate: null,
    timeZone: "Africa/Casablanca"
  }, RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId);
  const event = eventRecordSchema.parse({
    ...base,
    id: crypto.randomUUID(),
    transitNodeRef: null,
    datePrecision: "minute",
    startDate: "2026-10-01T12:00",
    endDate: null,
    title: `${alias}-retained-2025b-event`,
    tags: ["tzdb", "2025b"],
    timeContext,
    deletedAt: null,
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z"
  });
  await database.events.add(event);
  return event;
}

async function seedKnowledgeData(
  database: ResearchDatabase,
  target: { noteId: string; eventId: string; caseId: string; revisionId: string },
  suffix: string
): Promise<{ document: KnowledgeDocumentRecord; citation: CitationRecord; sourceRights: SourceRightsRecord }> {
  const content = `# Source ${suffix}\nDay stem evidence ${suffix}\nEvent evidence ${suffix}`;
  const snapshot = await buildKnowledgeContentSnapshot(content, "markdown");
  const timestamp = exportedAt;
  const document: KnowledgeDocumentRecord = {
    schemaVersion: "1.0.0",
    id: crypto.randomUUID(),
    recordType: "user_knowledge_document",
    title: `Source ${suffix}`,
    author: "Test author",
    edition: "Test edition",
    sourceNote: "Local backup fixture",
    fileName: `${suffix}.md`,
    format: "markdown",
    byteSize: new TextEncoder().encode(content).length,
    ...snapshot,
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const citation: CitationRecord = {
    schemaVersion: "1.0.0",
    id: crypto.randomUUID(),
    documentId: document.id,
    documentContentHash: document.contentHash,
    locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
    quote: `Day stem evidence ${suffix}`,
    annotation: "Backup relationship fixture",
    targets: [
      { kind: "research_note", noteId: target.noteId },
      { kind: "event", eventId: target.eventId },
      {
        kind: "chart_field",
        caseId: target.caseId,
        revisionId: target.revisionId,
        field: "pillars.day.stem"
      }
    ],
    targetKeys: [],
    status: "user_candidate",
    reviewAttestations: [],
    decisionNote: "",
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  citation.targetKeys = citationTargetKeys(citation.targets);
  const sourceRights: SourceRightsRecord = {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId: document.id,
    documentContentHash: document.contentHash,
    origin: "user_import",
    source: {
      sourceUrl: null,
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
      copyrightNotice: "",
      evidenceRefs: [],
      distributionPolicy: "local_private_only"
    },
    review: { status: "unreviewed", attestations: [], note: "" },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await database.transaction("rw", database.knowledgeDocuments, database.citations, database.sourceRights, async () => {
    await database.knowledgeDocuments.add(document);
    await database.citations.add(citation);
    await database.sourceRights.add(sourceRights);
  });
  return { document, citation, sourceRights };
}

async function resign(envelope: FullBackupEnvelope): Promise<void> {
  for (const citation of envelope.payload.citations) {
    citation.targetKeys = citationTargetKeys(citation.targets);
  }
  envelope.digests = await recomputeFullBackupDigests({ manifest: envelope.manifest, payload: envelope.payload });
}

function toLegacyCaseRecord(record: FullBackupEnvelope["payload"]["cases"][number]) {
  const {
    recordVersion: _recordVersion,
    favorite: _favorite,
    deletedAt: _deletedAt,
    ...legacy
  } = structuredClone(record);
  return legacy;
}

function toLegacyCandidateSetRecord(record: FullBackupEnvelope["payload"]["candidateSets"][number]) {
  const {
    recordVersion: _recordVersion,
    favorite: _favorite,
    deletedAt: _deletedAt,
    ...legacy
  } = structuredClone(record);
  return legacy;
}

function toLegacyEventRecord(record: FullBackupEnvelope["payload"]["events"][number]): LegacyEventRecordV1 {
  const {
    recordVersion: _recordVersion,
    timeContext: _timeContext,
    ...legacy
  } = structuredClone(record);
  return legacy;
}

function toLegacySavedViewRecord(
  record: FullBackupEnvelope["payload"]["savedViews"][number]
): LegacySavedViewRecordV1 {
  if (record.state === "migration_required") return structuredClone(record.legacyRecord);
  return {
    schemaVersion: record.schemaVersion,
    id: record.id,
    name: record.name,
    query: record.query.text,
    filters: { legacyFixture: true },
    sort: {
      field: record.query.sort.field === "title" ? "relevance" : record.query.sort.field,
      direction: record.query.sort.direction
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function canonicalLegacyPayload(payload: LegacyFullBackupPayload): LegacyFullBackupPayload {
  const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
  return {
    cases: [...payload.cases].sort((left, right) => compare(left.id, right.id)),
    revisions: [...payload.revisions].sort((left, right) =>
      compare(left.caseId, right.caseId) || left.revisionNumber - right.revisionNumber || compare(left.id, right.id)
    ),
    researchNotes: [...payload.researchNotes].sort((left, right) =>
      compare(left.caseId, right.caseId) || compare(left.id, right.id)
    ),
    events: [...payload.events].sort((left, right) =>
      compare(left.caseId, right.caseId) || compare(left.id, right.id)
    ),
    savedViews: [...payload.savedViews].sort((left, right) => compare(left.id, right.id))
  };
}

async function legacyDigests(
  manifest: LegacyFullBackupManifest,
  rawPayload: LegacyFullBackupPayload
): Promise<LegacyFullBackupDigests> {
  const payload = canonicalLegacyPayload(rawPayload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: { cases, revisions, researchNotes, events, savedViews, payload: payloadDigest },
    payload
  });
  return { cases, revisions, researchNotes, events, savedViews, payload: payloadDigest, envelope };
}

async function asSignedLegacyEnvelope(current: FullBackupEnvelope): Promise<LegacyFullBackupEnvelope> {
  const payload = canonicalLegacyPayload({
    cases: current.payload.cases.map(toLegacyCaseRecord),
    revisions: structuredClone(current.payload.revisions),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: current.payload.events.map(toLegacyEventRecord),
    savedViews: current.payload.savedViews.map(toLegacySavedViewRecord)
  });
  const manifest: LegacyFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.1.0",
    counts: {
      cases: payload.cases.length,
      revisions: payload.revisions.length,
      researchNotes: payload.researchNotes.length,
      events: payload.events.length,
      savedViews: payload.savedViews.length
    }
  };
  return { manifest, digests: await legacyDigests(manifest, payload), payload };
}

async function resignLegacy(envelope: LegacyFullBackupEnvelope): Promise<void> {
  envelope.digests = await legacyDigests(envelope.manifest, envelope.payload);
}

function canonicalPreviousPayload(payload: PreviousFullBackupPayload): PreviousFullBackupPayload {
  const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
  return {
    cases: [...payload.cases].sort((left, right) => compare(left.id, right.id)),
    revisions: [...payload.revisions].sort((left, right) =>
      compare(left.caseId, right.caseId) || left.revisionNumber - right.revisionNumber || compare(left.id, right.id)
    ),
    candidateSets: [...payload.candidateSets].sort((left, right) => compare(left.id, right.id)),
    researchNotes: [...payload.researchNotes].sort((left, right) =>
      compare(left.caseId, right.caseId) || compare(left.id, right.id)
    ),
    events: [...payload.events].sort((left, right) =>
      compare(left.caseId, right.caseId) || compare(left.id, right.id)
    ),
    savedViews: [...payload.savedViews].sort((left, right) => compare(left.id, right.id))
  };
}

async function previousDigests(
  manifest: PreviousFullBackupManifest,
  rawPayload: PreviousFullBackupPayload
): Promise<PreviousFullBackupDigests> {
  const payload = canonicalPreviousPayload(rawPayload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: { cases, revisions, candidateSets, researchNotes, events, savedViews, payload: payloadDigest },
    payload
  });
  return { cases, revisions, candidateSets, researchNotes, events, savedViews, payload: payloadDigest, envelope };
}

async function asSignedPreviousEnvelope(current: FullBackupEnvelope): Promise<PreviousFullBackupEnvelope> {
  const payload = canonicalPreviousPayload({
    cases: current.payload.cases.map(toLegacyCaseRecord),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: current.payload.candidateSets.map(toLegacyCandidateSetRecord),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: current.payload.events.map(toLegacyEventRecord),
    savedViews: current.payload.savedViews.map(toLegacySavedViewRecord)
  });
  const manifest: PreviousFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.2.0",
    counts: {
      cases: payload.cases.length,
      revisions: payload.revisions.length,
      candidateSets: payload.candidateSets.length,
      researchNotes: payload.researchNotes.length,
      events: payload.events.length,
      savedViews: payload.savedViews.length
    }
  };
  return { manifest, digests: await previousDigests(manifest, payload), payload };
}

async function resignPrevious(envelope: PreviousFullBackupEnvelope): Promise<void> {
  envelope.digests = await previousDigests(envelope.manifest, envelope.payload);
}

function canonicalKnowledgePayload(payload: KnowledgeFullBackupPayload): KnowledgeFullBackupPayload {
  const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
  return {
    cases: [...payload.cases].sort((left, right) => compare(left.id, right.id)),
    revisions: [...payload.revisions].sort((left, right) =>
      compare(left.caseId, right.caseId) || left.revisionNumber - right.revisionNumber || compare(left.id, right.id)
    ),
    candidateSets: [...payload.candidateSets].sort((left, right) => compare(left.id, right.id)),
    researchNotes: [...payload.researchNotes].sort((left, right) =>
      compare(left.caseId, right.caseId) || compare(left.id, right.id)
    ),
    events: [...payload.events].sort((left, right) =>
      compare(left.caseId, right.caseId) || compare(left.id, right.id)
    ),
    savedViews: [...payload.savedViews].sort((left, right) => compare(left.id, right.id)),
    knowledgeDocuments: [...payload.knowledgeDocuments].sort((left, right) => compare(left.id, right.id)),
    citations: [...payload.citations].sort((left, right) =>
      compare(left.documentId, right.documentId) ||
      left.locator.startLine - right.locator.startLine ||
      left.locator.endLine - right.locator.endLine ||
      compare(left.id, right.id)
    )
  };
}

async function knowledgeDigests(
  manifest: KnowledgeFullBackupManifest,
  rawPayload: KnowledgeFullBackupPayload
): Promise<KnowledgeFullBackupDigests> {
  const payload = canonicalKnowledgePayload(rawPayload);
  const cases = await sha256Hex(payload.cases);
  const revisions = await sha256Hex(payload.revisions);
  const candidateSets = await sha256Hex(payload.candidateSets);
  const researchNotes = await sha256Hex(payload.researchNotes);
  const events = await sha256Hex(payload.events);
  const savedViews = await sha256Hex(payload.savedViews);
  const knowledgeDocuments = await sha256Hex(payload.knowledgeDocuments);
  const citations = await sha256Hex(payload.citations);
  const payloadDigest = await sha256Hex(payload);
  const envelope = await sha256Hex({
    manifest,
    digests: {
      cases,
      revisions,
      candidateSets,
      researchNotes,
      events,
      savedViews,
      knowledgeDocuments,
      citations,
      payload: payloadDigest
    },
    payload
  });
  return {
    cases,
    revisions,
    candidateSets,
    researchNotes,
    events,
    savedViews,
    knowledgeDocuments,
    citations,
    payload: payloadDigest,
    envelope
  };
}

async function asSignedKnowledgeEnvelope(current: FullBackupEnvelope): Promise<KnowledgeFullBackupEnvelope> {
  const knowledgeDocuments = current.payload.knowledgeDocuments.map((document) => {
    if (document.recordType !== "user_knowledge_document") {
      throw new Error("v0.3 fixture only supports user knowledge documents");
    }
    const legacyDocument: KnowledgeDocumentV03Record = {
      ...structuredClone(document),
      recordType: "user_knowledge_document",
      rightsStatus: "user_provided_unverified"
    };
    return legacyDocument;
  });
  const citations = current.payload.citations.map((citation) => {
    if (citation.status !== "user_candidate") {
      throw new Error("v0.3 fixture only supports candidate citations");
    }
    const targets: CitationTargetV03[] = citation.targets.map((target) => {
      if (target.kind === "evidence_subject") {
        throw new Error("v0.3 fixture does not support evidence-subject targets");
      }
      return structuredClone(target);
    });
    const {
      targetKeys: _targetKeys,
      reviewAttestations: _reviewAttestations,
      decisionNote: _decisionNote,
      ...legacyCitation
    } = structuredClone(citation);
    const record: CitationV03Record = {
      ...legacyCitation,
      targets,
      status: "user_candidate"
    };
    return record;
  });
  const payload = canonicalKnowledgePayload({
    cases: current.payload.cases.map(toLegacyCaseRecord),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: current.payload.candidateSets.map(toLegacyCandidateSetRecord),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: current.payload.events.map(toLegacyEventRecord),
    savedViews: current.payload.savedViews.map(toLegacySavedViewRecord),
    knowledgeDocuments,
    citations
  });
  const manifest: KnowledgeFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.3.0",
    counts: {
      cases: payload.cases.length,
      revisions: payload.revisions.length,
      candidateSets: payload.candidateSets.length,
      researchNotes: payload.researchNotes.length,
      events: payload.events.length,
      savedViews: payload.savedViews.length,
      knowledgeDocuments: payload.knowledgeDocuments.length,
      citations: payload.citations.length
    }
  };
  return { manifest, digests: await knowledgeDigests(manifest, payload), payload };
}

async function resignKnowledge(envelope: KnowledgeFullBackupEnvelope): Promise<void> {
  envelope.digests = await knowledgeDigests(envelope.manifest, envelope.payload);
}

function currentNinePartitionCounts(current: FullBackupEnvelope) {
  return {
    cases: current.payload.cases.length,
    revisions: current.payload.revisions.length,
    candidateSets: current.payload.candidateSets.length,
    researchNotes: current.payload.researchNotes.length,
    events: current.payload.events.length,
    savedViews: current.payload.savedViews.length,
    knowledgeDocuments: current.payload.knowledgeDocuments.length,
    citations: current.payload.citations.length,
    sourceRights: current.payload.sourceRights.length
  };
}

async function asSignedSourceRightsEnvelope(
  current: FullBackupEnvelope
): Promise<SourceRightsFullBackupEnvelope> {
  const payload: SourceRightsFullBackupPayload = {
    cases: current.payload.cases.map(toLegacyCaseRecord),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: current.payload.candidateSets.map(toLegacyCandidateSetRecord),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: current.payload.events.map(toLegacyEventRecord),
    savedViews: current.payload.savedViews.map(toLegacySavedViewRecord),
    knowledgeDocuments: structuredClone(current.payload.knowledgeDocuments),
    citations: structuredClone(current.payload.citations),
    sourceRights: structuredClone(current.payload.sourceRights)
  };
  const manifest: SourceRightsFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.4.0",
    counts: currentNinePartitionCounts(current)
  };
  return {
    manifest,
    payload,
    digests: await recomputeSourceRightsFullBackupDigests({ manifest, payload })
  };
}

async function resignSourceRights(envelope: SourceRightsFullBackupEnvelope): Promise<void> {
  envelope.digests = await recomputeSourceRightsFullBackupDigests({
    manifest: envelope.manifest,
    payload: envelope.payload
  });
}

async function asSignedLifecycleEnvelope(current: FullBackupEnvelope): Promise<LifecycleFullBackupEnvelope> {
  const payload: LifecycleFullBackupPayload = {
    cases: structuredClone(current.payload.cases),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: structuredClone(current.payload.candidateSets),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: current.payload.events.map(toLegacyEventRecord),
    savedViews: current.payload.savedViews.map(toLegacySavedViewRecord),
    knowledgeDocuments: structuredClone(current.payload.knowledgeDocuments),
    citations: structuredClone(current.payload.citations),
    sourceRights: structuredClone(current.payload.sourceRights)
  };
  const manifest: LifecycleFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.5.0",
    counts: currentNinePartitionCounts(current)
  };
  return {
    manifest,
    payload,
    digests: await recomputeLifecycleFullBackupDigests({ manifest, payload })
  };
}

async function resignLifecycle(envelope: LifecycleFullBackupEnvelope): Promise<void> {
  envelope.digests = await recomputeLifecycleFullBackupDigests({
    manifest: envelope.manifest,
    payload: envelope.payload
  });
}

async function asSignedEventTimeEnvelope(current: FullBackupEnvelope): Promise<EventTimeFullBackupEnvelope> {
  const payload: EventTimeFullBackupPayload = {
    cases: structuredClone(current.payload.cases),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: structuredClone(current.payload.candidateSets),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: structuredClone(current.payload.events),
    savedViews: current.payload.savedViews.map(toLegacySavedViewRecord),
    knowledgeDocuments: structuredClone(current.payload.knowledgeDocuments),
    citations: structuredClone(current.payload.citations),
    sourceRights: structuredClone(current.payload.sourceRights)
  };
  const manifest: EventTimeFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.6.0",
    counts: currentNinePartitionCounts(current)
  };
  return {
    manifest,
    payload,
    digests: await recomputeEventTimeFullBackupDigests({ manifest, payload })
  };
}

async function resignEventTime(envelope: EventTimeFullBackupEnvelope): Promise<void> {
  envelope.digests = await recomputeEventTimeFullBackupDigests({
    manifest: envelope.manifest,
    payload: envelope.payload
  });
}

async function asSignedSavedViewEnvelope(current: FullBackupEnvelope): Promise<SavedViewFullBackupEnvelope> {
  const payload: SavedViewFullBackupPayload = {
    cases: structuredClone(current.payload.cases),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: structuredClone(current.payload.candidateSets),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: structuredClone(current.payload.events),
    savedViews: structuredClone(current.payload.savedViews),
    knowledgeDocuments: structuredClone(current.payload.knowledgeDocuments),
    citations: structuredClone(current.payload.citations),
    sourceRights: structuredClone(current.payload.sourceRights)
  };
  const manifest: SavedViewFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.7.0",
    counts: currentNinePartitionCounts(current)
  };
  return {
    manifest,
    payload,
    digests: await recomputeSavedViewFullBackupDigests({ manifest, payload })
  };
}

async function asSignedLocalUserDataEnvelope(
  current: FullBackupEnvelope
): Promise<LocalUserDataFullBackupEnvelope> {
  const payload: LocalUserDataFullBackupPayload = {
    cases: structuredClone(current.payload.cases),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: structuredClone(current.payload.candidateSets),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: structuredClone(current.payload.events),
    savedViews: structuredClone(current.payload.savedViews),
    knowledgeDocuments: structuredClone(current.payload.knowledgeDocuments),
    citations: structuredClone(current.payload.citations),
    sourceRights: structuredClone(current.payload.sourceRights),
    attachments: structuredClone(current.payload.attachments),
    researcherProfiles: structuredClone(current.payload.researcherProfiles),
    appSettings: structuredClone(current.payload.appSettings)
  };
  const manifest: LocalUserDataFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.8.0",
    counts: {
      cases: payload.cases.length,
      revisions: payload.revisions.length,
      candidateSets: payload.candidateSets.length,
      researchNotes: payload.researchNotes.length,
      events: payload.events.length,
      savedViews: payload.savedViews.length,
      knowledgeDocuments: payload.knowledgeDocuments.length,
      citations: payload.citations.length,
      sourceRights: payload.sourceRights.length,
      attachments: payload.attachments.length,
      researcherProfiles: payload.researcherProfiles.length,
      appSettings: payload.appSettings.length
    }
  };
  return {
    manifest,
    payload,
    digests: await recomputeLocalUserDataFullBackupDigests({ manifest, payload })
  };
}

async function asSignedRuleRegistryEnvelope(
  current: FullBackupEnvelope
): Promise<RuleRegistryFullBackupEnvelope> {
  const payload: RuleRegistryFullBackupPayload = {
    cases: structuredClone(current.payload.cases),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: structuredClone(current.payload.candidateSets),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: structuredClone(current.payload.events),
    savedViews: structuredClone(current.payload.savedViews),
    knowledgeDocuments: structuredClone(current.payload.knowledgeDocuments),
    citations: structuredClone(current.payload.citations),
    sourceRights: structuredClone(current.payload.sourceRights),
    attachments: structuredClone(current.payload.attachments),
    researcherProfiles: structuredClone(current.payload.researcherProfiles),
    appSettings: structuredClone(current.payload.appSettings),
    ruleRegistry: structuredClone(current.payload.ruleRegistry)
  };
  const manifest: RuleRegistryFullBackupManifest = {
    ...current.manifest,
    formatVersion: "0.9.0",
    counts: {
      cases: payload.cases.length,
      revisions: payload.revisions.length,
      candidateSets: payload.candidateSets.length,
      researchNotes: payload.researchNotes.length,
      events: payload.events.length,
      savedViews: payload.savedViews.length,
      knowledgeDocuments: payload.knowledgeDocuments.length,
      citations: payload.citations.length,
      sourceRights: payload.sourceRights.length,
      attachments: payload.attachments.length,
      researcherProfiles: payload.researcherProfiles.length,
      appSettings: payload.appSettings.length,
      ruleRegistry: payload.ruleRegistry.length
    }
  };
  return {
    manifest,
    payload,
    digests: await recomputeRuleRegistryFullBackupDigests({ manifest, payload })
  };
}

async function asSignedTzdbMigrationEnvelope(
  current: FullBackupEnvelope
): Promise<TzdbMigrationFullBackupEnvelope> {
  const payload: TzdbMigrationFullBackupPayload = {
    cases: structuredClone(current.payload.cases),
    revisions: structuredClone(current.payload.revisions),
    candidateSets: structuredClone(current.payload.candidateSets),
    researchNotes: structuredClone(current.payload.researchNotes),
    events: structuredClone(current.payload.events),
    savedViews: structuredClone(current.payload.savedViews),
    knowledgeDocuments: structuredClone(current.payload.knowledgeDocuments),
    citations: structuredClone(current.payload.citations),
    sourceRights: structuredClone(current.payload.sourceRights),
    attachments: structuredClone(current.payload.attachments),
    researcherProfiles: structuredClone(current.payload.researcherProfiles),
    appSettings: structuredClone(current.payload.appSettings),
    ruleRegistry: structuredClone(current.payload.ruleRegistry),
    tzdbMigrationReceipts: structuredClone(current.payload.tzdbMigrationReceipts)
  };
  const manifest: TzdbMigrationFullBackupManifest = {
    ...current.manifest,
    formatVersion: "1.0.0",
    counts: {
      cases: payload.cases.length,
      revisions: payload.revisions.length,
      candidateSets: payload.candidateSets.length,
      researchNotes: payload.researchNotes.length,
      events: payload.events.length,
      savedViews: payload.savedViews.length,
      knowledgeDocuments: payload.knowledgeDocuments.length,
      citations: payload.citations.length,
      sourceRights: payload.sourceRights.length,
      attachments: payload.attachments.length,
      researcherProfiles: payload.researcherProfiles.length,
      appSettings: payload.appSettings.length,
      ruleRegistry: payload.ruleRegistry.length,
      tzdbMigrationReceipts: payload.tzdbMigrationReceipts.length
    }
  };
  return {
    manifest,
    payload,
    digests: await recomputeTzdbMigrationFullBackupDigests({ manifest, payload })
  };
}

function alteredHex(value: string): string {
  return `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
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

function stableEventRef(envelope: FullBackupEnvelope): TransitNodeRef {
  const ref = envelope.payload.events[0]?.transitNodeRef;
  if (!ref || ref.namespace !== "hakimi-transit-node") {
    throw new Error("fixture event is missing its stable transit-node reference");
  }
  return ref;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(databases.splice(0).map(async (database) => {
    database.close();
    await database.delete();
  }));
});

describe("current-modelled-data full backup", () => {
  it("keeps the committed v0.7 envelope byte contract readable and migrates only after verification", async () => {
    if (process.env.UPDATE_FULL_BACKUP_V07_FIXTURE === "1") {
      const source = repositories();
      const seeded = await seedModeledData(source.cases, source.research, "v07-committed");
      await seedCandidateData(source.cases, "v07-committed");
      await seedKnowledgeData(source.database, {
        noteId: seeded.note.id,
        eventId: seeded.event.id,
        caseId: seeded.bundle.caseRecord.id,
        revisionId: seeded.bundle.caseRecord.latestRevisionId
      }, "v07-committed");
      const generated = await asSignedSavedViewEnvelope(await createFullBackup(source.cases, options));
      const sorted = JSON.parse(canonicalStringify(generated));
      await writeFile(
        resolve(process.cwd(), "packages/backup/fixtures/full-backup-v0.7-frozen.json"),
        `${JSON.stringify(sorted, null, 2)}\n`,
        "utf8"
      );
    }

    expect(frozenV07.manifest.counts).toEqual({
      cases: 1,
      revisions: 2,
      candidateSets: 1,
      researchNotes: 1,
      events: 1,
      savedViews: 1,
      knowledgeDocuments: 1,
      citations: 1,
      sourceRights: 1
    });
    for (const partition of [
      "cases",
      "revisions",
      "candidateSets",
      "researchNotes",
      "events",
      "savedViews",
      "knowledgeDocuments",
      "citations",
      "sourceRights"
    ] as const) {
      expect(frozenV07.payload[partition].length, `${partition} fixture must stay non-empty`).toBeGreaterThan(0);
    }

    const migrated = await preflightFullBackup(structuredClone(frozenV07));
    expect(migrated).toMatchObject({
      migratedFromFormatVersion: "0.7.0",
      manifest: { formatVersion: "1.2.0" },
      payload: {
        attachments: [],
        researcherProfiles: [],
        appSettings: [],
        ruleRegistry: [],
        tzdbMigrationReceipts: []
      }
    });

    const tampered = structuredClone(frozenV07);
    tampered.manifest.appVersion = "0.2.1-p0";
    await expect(preflightFullBackup(tampered)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it("v1.1 完整高级 ResearchQuery SavedView 经 export、preflight 与 restore 逐字段无损往返", async () => {
    const source = repositories();
    const savedView = await source.research.createSavedView({
      name: "高级查询备份锁版",
      query: structuredClone(ADVANCED_CASE_QUERY)
    });
    const exported = await createFullBackup(source.cases, options);

    expect(exported.manifest).toMatchObject({
      format: "hakimi-bazi-full-backup",
      formatVersion: "1.2.0",
      counts: { savedViews: 1 }
    });
    expect(exported.payload.savedViews).toEqual([
      expect.objectContaining({
        id: savedView.id,
        state: "ready",
        query: ADVANCED_CASE_QUERY,
        queryDigest: ADVANCED_CASE_QUERY_DIGEST
      })
    ]);
    expect(exported.digests.savedViews).toBe(await sha256Hex(exported.payload.savedViews));

    const serialized = serializeFullBackup(exported);
    const preflight = await preflightFullBackup(serialized);
    expect(preflight.migratedFromFormatVersion).toBeNull();
    expect(preflight.payload.savedViews).toEqual(exported.payload.savedViews);
    expect(preflight.digests).toEqual(exported.digests);
    const verifiedSavedView = preflight.payload.savedViews[0];
    if (!verifiedSavedView || verifiedSavedView.state !== "ready") {
      throw new Error("expected ready advanced-query SavedView after v1.1 preflight");
    }
    expect(verifiedSavedView.query).toEqual(ADVANCED_CASE_QUERY);
    expect(verifiedSavedView.queryDigest).toBe(ADVANCED_CASE_QUERY_DIGEST);

    const destination = repositories();
    await importFullBackup(destination.cases, serialized, options);
    await expect(destination.research.restoreSavedViewState(savedView.id)).resolves.toEqual({
      query: ADVANCED_CASE_QUERY
    });

    const restored = await createFullBackup(destination.cases, options);
    expect(restored.payload.savedViews).toEqual(exported.payload.savedViews);
    expect(restored.digests).toEqual(exported.digests);
    await expect(preflightFullBackup(serializeFullBackup(restored))).resolves.toMatchObject({
      migratedFromFormatVersion: null,
      payload: { savedViews: exported.payload.savedViews },
      digests: exported.digests
    });
  });

  it("round trips all fifteen partitions, including both migration receipt ledgers and the rule registry", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "source");
    const { target: candidate, receipt } = await seedTzdbMigrationData(source.cases, "source");
    const eventMigration = await seedEventTimeMigrationData(
      source.database,
      source.research,
      seeded.event,
      "source"
    );
    const retainedEvent = await seedRetainedTzdbEvent(source.database, seeded.event, "source");
    const candidateNote = await source.research.createResearchNote({
      caseId: candidate.id,
      anchor: { kind: "case" },
      body: "候选组整体研究笔记",
      tags: ["unknown-hour"],
      sourceRefs: [],
      lifecycle: "active"
    });
    const candidateEvent = await source.research.createEvent({
      caseId: candidate.id,
      revisionId: null,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "候选组访谈线索",
      tags: ["unknown-hour"],
      sourceRefs: [],
      feedback: "unreviewed",
      body: "尚未绑定精确命盘。"
    });
    const knowledge = await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "round-trip");
    const profile = await source.cases.saveResearcherProfile({
      displayName: "本地研究者甲",
      organization: "民间命理资料室",
      researchFocus: "子平法与事件回溯"
    });
    const appSettings = await source.cases.saveAppSettings({
      defaultTimeZone: "Asia/Shanghai",
      defaultCalendarType: "lunar",
      preferredDensity: "compact"
    });
    const attachmentBytes = new Uint8Array([0x00, 0xff, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const attachment = await source.cases.createAttachment({
      fileName: "事件原始材料.bin",
      mediaType: "application/octet-stream",
      bytes: attachmentBytes,
      description: "含 NUL 与非 UTF-8 字节的完整性哨兵。",
      link: { kind: "research_note", noteId: seeded.note.id }
    });
    const reviewInboxBytes = new TextEncoder().encode(
      '\uFEFF{\r\n  "format": "hakimi-transit-query-independent-review"\r\n}\r\n'
    );
    const reviewInboxAttachment = await source.cases.createAttachment({
      fileName: "expert-return.json",
      mediaType: "application/json",
      bytes: reviewInboxBytes,
      description: "哈基米运限审核收件箱 · 本地未核验 · v1",
      link: null
    });
    const first = await createFullBackup(source.cases, options);

    expect(first.manifest).toMatchObject({
      format: "hakimi-bazi-full-backup",
      formatVersion: "1.2.0",
      scope: "current-modeled-data",
      counts: {
        cases: 1,
        revisions: 2,
        candidateSets: 2,
        researchNotes: 2,
        events: 5,
        savedViews: 1,
        knowledgeDocuments: 1,
        citations: 1,
        sourceRights: 1,
        attachments: 2,
        researcherProfiles: 1,
        appSettings: 1,
        ruleRegistry: 0,
        tzdbMigrationReceipts: 1,
        eventTimeMigrationReceipts: 1
      }
    });
    expect(first.payload.cases[0]).toMatchObject({ recordVersion: 2, favorite: false, deletedAt: null });
    expect(first.payload.candidateSets.find((record) => record.id === candidate.id)).toMatchObject({
      id: candidate.id,
      snapshotDigest: candidate.snapshotDigest,
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    });
    expect(first.payload.candidateSets.every((record) => record.candidateSet.candidates.length === 13)).toBe(true);
    expect(first.payload.tzdbMigrationReceipts).toEqual([receipt]);
    expect(first.digests.tzdbMigrationReceipts).toBe(await sha256Hex([receipt]));
    expect(first.payload.eventTimeMigrationReceipts).toEqual([eventMigration.receipt]);
    expect(first.digests.eventTimeMigrationReceipts).toBe(await sha256Hex([eventMigration.receipt]));
    expect(first.payload.researchNotes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: seeded.note.id, lifecycle: "archived" }),
      expect.objectContaining({ id: candidateNote.id, caseId: candidate.id })
    ]));
    expect(first.payload.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: seeded.event.id, recordVersion: 2, timeContext: { kind: "calendar_date" } }),
      expect.objectContaining({
        id: retainedEvent.id,
        recordVersion: 2,
        timeContext: expect.objectContaining({
          kind: "zoned_minute",
          timeZoneDatabase: expect.objectContaining({
            snapshotId: RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
            ianaVersion: "2025b"
          }),
          start: expect.objectContaining({
            canonicalUtc: "2026-10-01T11:00:00Z",
            resolution: expect.objectContaining({
              selectedCandidate: expect.objectContaining({ utcOffsetMinutes: 60 })
            })
          })
        })
      }),
      expect.objectContaining({
        id: candidateEvent.id,
        caseId: candidate.id,
        revisionId: null,
        recordVersion: 2,
        timeContext: { kind: "calendar_date" }
      })
    ]));
    expect(first.payload.events.find((event) => event.id === seeded.event.id)?.deletedAt).not.toBeNull();
    expect(first.payload.knowledgeDocuments).toEqual([expect.objectContaining({ id: knowledge.document.id })]);
    expect(first.payload.sourceRights).toEqual([expect.objectContaining({
      documentId: knowledge.document.id,
      documentContentHash: knowledge.document.contentHash,
      origin: "user_import",
      rights: expect.objectContaining({
        status: "user_unverified",
        distributionPolicy: "local_private_only"
      })
    })]);
    expect(first.payload.citations).toEqual([expect.objectContaining({
      id: knowledge.citation.id,
      targets: expect.arrayContaining([
        { kind: "research_note", noteId: seeded.note.id },
        { kind: "event", eventId: seeded.event.id },
        expect.objectContaining({ kind: "chart_field", revisionId: seeded.bundle.caseRecord.latestRevisionId })
      ])
    })]);
    expect(first.payload.researcherProfiles).toEqual([profile]);
    expect(first.payload.appSettings).toEqual([appSettings]);
    expect(first.payload.attachments).toHaveLength(2);
    expect(first.payload.attachments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: attachment.id,
        byteLength: attachmentBytes.byteLength,
        contentHash: attachment.contentHash,
        link: { kind: "research_note", noteId: seeded.note.id }
      }),
      expect.objectContaining({
        id: reviewInboxAttachment.id,
        byteLength: reviewInboxBytes.byteLength,
        contentHash: reviewInboxAttachment.contentHash,
        description: "哈基米运限审核收件箱 · 本地未核验 · v1",
        mediaType: "application/json",
        link: null
      })
    ]));

    const verified = await preflightFullBackup(serializeFullBackup(first));
    expect(verified.digests).toEqual(first.digests);
    expect(verified.migratedFromFormatVersion).toBeNull();
    expect(verified.remainingP111Gaps).toEqual(FULL_BACKUP_P1_11_REMAINING_GAPS);

    const destination = repositories();
    await seedModeledData(destination.cases, destination.research, "old-destination", 1);
    const result = await importFullBackup(destination.cases, serializeFullBackup(first), options);
    const second = await createFullBackup(destination.cases, options);

    expect(second.payload).toEqual(first.payload);
    expect(second.digests).toEqual(first.digests);
    expect(serializeFullBackup(second)).toBe(serializeFullBackup(first));
    expect(result.currentSafetyBackup.payload.cases[0].alias).toBe("old-destination");
    expect(await destination.database.birthFingerprints.count()).toBe(4);
    expect(await destination.cases.listBirthFingerprints()).toHaveLength(2);
    expect(await destination.cases.readResearcherProfile()).toEqual(profile);
    expect(await destination.cases.readAppSettings()).toEqual(appSettings);
    expect(await destination.cases.readAttachmentBytes(attachment.id)).toEqual(attachmentBytes);
    const restoredReviewInboxBytes = await destination.cases.readAttachmentBytes(reviewInboxAttachment.id);
    expect(restoredReviewInboxBytes?.byteLength).toBe(reviewInboxBytes.byteLength);
    expect(restoredReviewInboxBytes?.every((value, index) => value === reviewInboxBytes[index])).toBe(true);
    const restoredRetainedEvent = await destination.research.getEvent(retainedEvent.id);
    expect(restoredRetainedEvent).not.toBeNull();
    await expect(verifyEventTimeContextWithBundledArtifact({
      datePrecision: restoredRetainedEvent!.datePrecision,
      startDate: restoredRetainedEvent!.startDate,
      endDate: restoredRetainedEvent!.endDate,
      timeContext: restoredRetainedEvent!.timeContext
    })).resolves.toEqual(restoredRetainedEvent!.timeContext);
  }, 20_000);

  it("strictly verifies frozen v0.7 bytes before introducing later partitions", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "v07-frozen");
    await seedCandidateData(source.cases, "v07-frozen");
    const current = await createFullBackup(source.cases, options);
    const frozen = await asSignedSavedViewEnvelope(current);

    const migrated = await preflightFullBackup(structuredClone(frozen));
    expect(migrated.migratedFromFormatVersion).toBe("0.7.0");
    expect(migrated.manifest.formatVersion).toBe("1.2.0");
    expect(migrated.payload).toMatchObject({
      attachments: [],
      researcherProfiles: [],
      appSettings: [],
      ruleRegistry: [],
      tzdbMigrationReceipts: []
    });
    expect(migrated.payload.savedViews).toEqual(frozen.payload.savedViews);

    const tampered = structuredClone(frozen);
    tampered.payload.cases[0]!.alias = "重签前篡改";
    await expect(preflightFullBackup(tampered)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it("strictly verifies a signed v0.8 twelve-partition envelope before adding later empty partitions", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "v08-migration");
    await source.cases.saveAppSettings({
      defaultTimeZone: "Asia/Shanghai",
      defaultCalendarType: "gregorian",
      preferredDensity: "comfortable"
    });
    const current = await createFullBackup(source.cases, options);
    const v08 = await asSignedLocalUserDataEnvelope(current);

    const migrated = await preflightFullBackup(structuredClone(v08));
    expect(migrated).toMatchObject({
      migratedFromFormatVersion: "0.8.0",
      manifest: {
        formatVersion: "1.2.0",
        counts: { ruleRegistry: 0, tzdbMigrationReceipts: 0 }
      },
      payload: { ruleRegistry: [], tzdbMigrationReceipts: [] }
    });
    expect(migrated.payload.appSettings).toEqual(v08.payload.appSettings);

    const tampered = structuredClone(v08);
    tampered.manifest.appVersion = "0.2.0-p0";
    await expect(preflightFullBackup(tampered)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it("strictly verifies a signed v0.9 thirteen-partition envelope before adding an empty receipt ledger", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "v09-migration");
    const { installed, active } = await ruleRegistryFixture();
    await source.database.ruleRegistry.bulkAdd([installed, active]);
    const v09 = await asSignedRuleRegistryEnvelope(await createFullBackup(source.cases, options));

    expect(v09.manifest).toMatchObject({
      formatVersion: "0.9.0",
      counts: { ruleRegistry: 2 }
    });
    expect(v09.payload).not.toHaveProperty("tzdbMigrationReceipts");
    expect(v09.digests).not.toHaveProperty("tzdbMigrationReceipts");

    const migrated = await preflightFullBackup(structuredClone(v09));
    expect(migrated).toMatchObject({
      migratedFromFormatVersion: "0.9.0",
      manifest: {
        formatVersion: "1.2.0",
        counts: { ruleRegistry: 2, tzdbMigrationReceipts: 0 }
      },
      payload: { ruleRegistry: [active, installed], tzdbMigrationReceipts: [] }
    });
    expect(migrated.digests.tzdbMigrationReceipts).toBe(await sha256Hex([]));

    const tampered = structuredClone(v09);
    tampered.manifest.appVersion = "0.2.0-forged";
    await expect(preflightFullBackup(tampered)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it("strictly verifies frozen v1.0 before adding an empty Event receipt ledger in v1.1", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "v100-source");
    const candidateMigration = await seedTzdbMigrationData(source.cases, "v100-source");
    const v100 = await asSignedTzdbMigrationEnvelope(await createFullBackup(source.cases, options));

    const migrated = await preflightFullBackup(structuredClone(v100));
    expect(migrated).toMatchObject({
      migratedFromFormatVersion: "1.0.0",
      manifest: {
        formatVersion: "1.2.0",
        counts: {
          tzdbMigrationReceipts: 1,
          eventTimeMigrationReceipts: 0
        }
      },
      payload: {
        tzdbMigrationReceipts: [candidateMigration.receipt],
        eventTimeMigrationReceipts: []
      }
    });

    const retroactivelyExtended = structuredClone(v100) as unknown as {
      payload: Record<string, unknown>;
    };
    retroactivelyExtended.payload.eventTimeMigrationReceipts = [];
    await expect(preflightFullBackup(retroactivelyExtended)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const countTampered = structuredClone(v100);
    countTampered.manifest.counts.events += 1;
    await expect(preflightFullBackup(countTampered)).rejects.toMatchObject({ code: "COUNT_MISMATCH" });

    const payloadTampered = structuredClone(v100);
    payloadTampered.payload.events[0]!.title = "unsigned v1.0 mutation";
    await expect(preflightFullBackup(payloadTampered)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    const reSignedOrphan = structuredClone(v100);
    reSignedOrphan.payload.tzdbMigrationReceipts[0]!.source.recordId = crypto.randomUUID();
    reSignedOrphan.digests = await recomputeTzdbMigrationFullBackupDigests({
      manifest: reSignedOrphan.manifest,
      payload: reSignedOrphan.payload
    });
    await expect(preflightFullBackup(reSignedOrphan)).rejects.toMatchObject({ code: "ORPHAN_TZDB_MIGRATION" });

    const destination = repositories();
    await importFullBackup(destination.cases, v100, options);
    const restored = await createFullBackup(destination.cases, options);
    expect(restored.manifest.formatVersion).toBe("1.2.0");
    expect(restored.payload.tzdbMigrationReceipts).toEqual([candidateMigration.receipt]);
    expect(restored.payload.eventTimeMigrationReceipts).toEqual([]);
  }, 20_000);

  it("round trips installed and active rule-registry records in v1.1 with partition digests", async () => {
    const source = repositories();
    const { installed, active } = await ruleRegistryFixture();
    await source.database.ruleRegistry.bulkAdd([installed, active]);
    const first = await createFullBackup(source.cases, options);

    expect(first.manifest).toMatchObject({
      formatVersion: "1.2.0",
      counts: { ruleRegistry: 2 }
    });
    expect(first.payload.ruleRegistry).toEqual([active, installed]);
    expect(first.digests.ruleRegistry).toBe(await sha256Hex(first.payload.ruleRegistry));

    const serialized = serializeFullBackup(first);
    const verified = await preflightFullBackup(serialized);
    expect(verified.migratedFromFormatVersion).toBeNull();
    expect(verified.payload.ruleRegistry).toEqual(first.payload.ruleRegistry);
    expect(verified.digests).toEqual(first.digests);

    const destination = repositories();
    await importFullBackup(destination.cases, serialized, options);
    const second = await createFullBackup(destination.cases, options);
    expect(second.payload.ruleRegistry).toEqual(first.payload.ruleRegistry);
    expect(second.digests).toEqual(first.digests);
  });

  it("round trips a non-empty tzdb migration receipt partition with its count and digest", async () => {
    const source = repositories();
    const derived = await seedTzdbMigrationData(source.cases, "tzdb-receipt-round-trip");
    const first = await createFullBackup(source.cases, options);

    expect(first.manifest).toMatchObject({
      formatVersion: "1.2.0",
      counts: { candidateSets: 2, tzdbMigrationReceipts: 1 }
    });
    expect(first.payload.tzdbMigrationReceipts).toEqual([derived.receipt]);
    expect(first.digests.tzdbMigrationReceipts).toBe(
      await sha256Hex(first.payload.tzdbMigrationReceipts)
    );

    const serialized = serializeFullBackup(first);
    const verified = await preflightFullBackup(serialized);
    expect(verified.migratedFromFormatVersion).toBeNull();
    expect(verified.payload.tzdbMigrationReceipts).toEqual(first.payload.tzdbMigrationReceipts);
    expect(verified.digests).toEqual(first.digests);

    const destination = repositories();
    await importFullBackup(destination.cases, serialized, options);
    await expect(destination.cases.listTzdbMigrationReceiptsForCandidateSet(derived.target.id))
      .resolves.toEqual([derived.receipt]);
    const second = await createFullBackup(destination.cases, options);
    expect(second.payload).toEqual(first.payload);
    expect(second.digests).toEqual(first.digests);
  });

  it("round trips the real Casablanca 2026c to 2025b CandidateSet lineage without rewriting either snapshot", async () => {
    const source = repositories();
    const currentCandidateSet = await calculateUnknownHourCandidates(
      casablancaUnknownHourInput,
      WORKING_DEFAULT_RULE_PROFILE
    );
    const retainedCandidateSet = await calculateUnknownHourCandidatesForBundledSnapshot(
      casablancaUnknownHourInput,
      WORKING_DEFAULT_RULE_PROFILE,
      RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      { expectedTimeZoneDatabase: RETAINED_TIME_ZONE_DATABASE_2025B }
    );
    const base = await source.cases.createCandidateSet({
      alias: "Casablanca 2026c/2025b",
      tags: ["tzdb", "2025b", "2026c"],
      notes: "Real bundled-tzdb parallel replay fixture",
      candidateSet: currentCandidateSet
    });
    const baseBefore = structuredClone(base);
    const derived = await source.cases.deriveCandidateSetTzdbSnapshot({
      sourceCandidateSetId: base.id,
      expectedSourceSnapshotDigest: base.snapshotDigest,
      expectedTargetSnapshotId: RETAINED_TIME_ZONE_DATABASE_2025B.snapshotId,
      candidateSet: retainedCandidateSet
    });

    expect(derived.source).toEqual(baseBefore);
    expect(derived.target.candidateSet.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
    expect(derived.receipt).toMatchObject({
      recordVersion: 2,
      comparison: {
        formatVersion: "2.0.0",
        behaviorChangedCount: 13,
        hashOnlyChangedCount: 0,
        unchangedCount: 0
      }
    });
    for (const probe of derived.target.candidateSet.candidates) {
      for (const variant of probe.variants) {
        expect(variant.chart.manifest.timeZoneDatabase).toEqual(RETAINED_TIME_ZONE_DATABASE_2025B);
      }
    }

    const first = await createFullBackup(source.cases, options);
    const verified = await preflightFullBackup(serializeFullBackup(first));
    expect(verified.payload.candidateSets).toHaveLength(2);
    expect(verified.payload.tzdbMigrationReceipts).toEqual([derived.receipt]);

    const destination = repositories();
    await importFullBackup(destination.cases, serializeFullBackup(first), options);
    const restoredBase = await destination.cases.getCandidateSet(base.id);
    const restoredTarget = await destination.cases.getCandidateSet(derived.target.id);
    expect(restoredBase).toEqual(baseBefore);
    expect(restoredTarget).toEqual(derived.target);

    const second = await createFullBackup(destination.cases, options);
    expect(second.payload).toEqual(first.payload);
    expect(second.digests).toEqual(first.digests);
  }, 30_000);

  it("preflights and restores a frozen comparison-v1 receipt inside unchanged full v1.1", async () => {
    const source = repositories();
    const derived = await seedTzdbMigrationData(source.cases, "legacy-tzdb-receipt");
    const envelope = await createFullBackup(source.cases, options);
    const comparison = buildLegacyCandidateSetTzdbComparison(
      derived.source.candidateSet,
      derived.target.candidateSet
    );
    envelope.payload.tzdbMigrationReceipts = [{
      ...derived.receipt,
      recordVersion: LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
      comparison,
      comparisonDigest: await sha256Hex(comparison)
    }];
    await resign(envelope);

    const verified = await preflightFullBackup(envelope);
    expect(verified.payload.tzdbMigrationReceipts[0]).toMatchObject({
      recordVersion: LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
      comparison: { formatVersion: "1.0.0" }
    });
    const destination = repositories();
    await importFullBackup(destination.cases, envelope, options);
    await expect(destination.cases.listTzdbMigrationReceiptsForCandidateSet(derived.source.id))
      .resolves.toEqual(verified.payload.tzdbMigrationReceipts);
  });

  it("preflights and restores an allowlisted formal v1.1/v2 TransitNodeRef without rewriting it", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "historical-transit-source");
    const revision = seeded.bundle.revisions.at(-1)!;
    const snapshot = await calculateTransitSnapshot({
      revision,
      atInstant: "2025-03-12T04:00:00Z"
    });
    if (snapshot.slots.year.status !== "resolved") throw new Error("expected resolved historical year node");
    const historical = await compatibleV11Ref(snapshot.slots.year.node);
    const envelope = await createFullBackup(source.cases, options);
    envelope.payload.events[0]!.transitNodeRef = structuredClone(historical);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).resolves.toMatchObject({
      payload: {
        events: [expect.objectContaining({ transitNodeRef: historical })]
      }
    });
    const destination = repositories();
    await expect(importFullBackup(destination.cases, envelope, options)).resolves.toBeDefined();
    expect((await destination.database.events.get(seeded.event.id))?.transitNodeRef).toEqual(historical);
  });

  it.each([
    {
      variant: "orphan source",
      code: "ORPHAN_TZDB_MIGRATION",
      mutate: async (envelope: FullBackupEnvelope) => {
        envelope.payload.tzdbMigrationReceipts[0].source.recordId = crypto.randomUUID();
      }
    },
    {
      variant: "orphan target",
      code: "ORPHAN_TZDB_MIGRATION",
      mutate: async (envelope: FullBackupEnvelope) => {
        envelope.payload.tzdbMigrationReceipts[0].target.recordId = crypto.randomUUID();
      }
    },
    {
      variant: "endpoint digest",
      code: "TZDB_MIGRATION_INTEGRITY_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.tzdbMigrationReceipts[0];
        receipt.source.snapshotDigest = alteredHex(receipt.source.snapshotDigest);
      }
    },
    {
      variant: "comparison",
      code: "TZDB_MIGRATION_INTEGRITY_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.tzdbMigrationReceipts[0];
        const probe = receipt.comparison.probeDiffs[0];
        probe.behaviorChanged = true;
        probe.hashChanged = true;
        probe.changedFields = ["unresolved_reason"];
        receipt.comparison.behaviorChangedCount = receipt.comparison.probeDiffs.filter(
          (candidate) => candidate.behaviorChanged
        ).length;
        receipt.comparison.hashOnlyChangedCount = receipt.comparison.probeDiffs.filter(
          (candidate) => !candidate.behaviorChanged && candidate.hashChanged
        ).length;
        receipt.comparison.unchangedCount = receipt.comparison.probeDiffs.filter(
          (candidate) => !candidate.behaviorChanged && !candidate.hashChanged
        ).length;
        receipt.comparisonDigest = await sha256Hex(receipt.comparison);
      }
    },
    {
      variant: "comparison digest",
      code: "TZDB_MIGRATION_INTEGRITY_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.tzdbMigrationReceipts[0];
        receipt.comparisonDigest = alteredHex(receipt.comparisonDigest);
      }
    },
    {
      variant: "unregistered target descriptor",
      code: "TZDB_MIGRATION_CONTEXT_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.tzdbMigrationReceipts[0];
        const source = envelope.payload.candidateSets.find((record) => record.id === receipt.source.recordId)!;
        const target = envelope.payload.candidateSets.find((record) => record.id === receipt.target.recordId)!;
        if (!target.candidateSet.timeZoneDatabase) throw new Error("expected an identified target fixture");
        const descriptor = {
          ...target.candidateSet.timeZoneDatabase,
          artifactName: `${target.candidateSet.timeZoneDatabase.artifactName}.unregistered`
        };
        target.candidateSet.timeZoneDatabase = descriptor;
        for (const candidate of target.candidateSet.candidates) {
          if (candidate.chart) {
            candidate.chart.manifest.timeZoneDatabase = structuredClone(descriptor);
            candidate.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(candidate.chart));
          }
          for (const variant of candidate.variants) {
            variant.chart.manifest.timeZoneDatabase = structuredClone(descriptor);
            variant.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(variant.chart));
            variant.chartResultHash = variant.chart.manifest.resultHash;
          }
        }
        target.candidateSet.resultHash = await sha256Hex(buildUnknownHourCandidateHashPayload(target.candidateSet));
        target.snapshotDigest = await sha256Hex(target.candidateSet);
        receipt.target.resultHash = target.candidateSet.resultHash;
        receipt.target.snapshotDigest = target.snapshotDigest;
        receipt.comparison = buildCandidateSetTzdbComparison(source.candidateSet, target.candidateSet);
        receipt.comparisonDigest = await sha256Hex(receipt.comparison);
      }
    },
    {
      variant: "non-tzdb calculation context",
      code: "TZDB_MIGRATION_CONTEXT_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.tzdbMigrationReceipts[0];
        const target = envelope.payload.candidateSets.find((record) => record.id === receipt.target.recordId)!;
        target.candidateSet.input.sourceNote = "forged non-tzdb context";
        for (const candidate of target.candidateSet.candidates) {
          if (candidate.chart) candidate.chart.input.sourceNote = target.candidateSet.input.sourceNote;
          for (const variant of candidate.variants) {
            variant.chart.input.sourceNote = target.candidateSet.input.sourceNote;
          }
        }
        target.snapshotDigest = await sha256Hex(target.candidateSet);
        receipt.target.snapshotDigest = target.snapshotDigest;
      }
    },
    {
      variant: "re-signed rule profile digest drift",
      code: "DIGEST_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.tzdbMigrationReceipts[0];
        const source = envelope.payload.candidateSets.find((record) => record.id === receipt.source.recordId)!;
        const target = envelope.payload.candidateSets.find((record) => record.id === receipt.target.recordId)!;
        const changedRuleProfileDigest = alteredHex(target.candidateSet.ruleProfileDigest);
        target.candidateSet.ruleProfileDigest = changedRuleProfileDigest;
        for (const candidate of target.candidateSet.candidates) {
          if (candidate.chart) {
            candidate.chart.manifest.ruleProfileDigest = changedRuleProfileDigest;
            candidate.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(candidate.chart));
          }
          for (const variant of candidate.variants) {
            variant.chart.manifest.ruleProfileDigest = changedRuleProfileDigest;
            variant.chart.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload(variant.chart));
            variant.chartResultHash = variant.chart.manifest.resultHash;
          }
        }
        target.candidateSet.resultHash = await sha256Hex(buildUnknownHourCandidateHashPayload(target.candidateSet));
        target.snapshotDigest = await sha256Hex(target.candidateSet);
        receipt.target.resultHash = target.candidateSet.resultHash;
        receipt.target.snapshotDigest = target.snapshotDigest;
        receipt.comparison = buildCandidateSetTzdbComparison(source.candidateSet, target.candidateSet);
        receipt.comparisonDigest = await sha256Hex(receipt.comparison);
      }
    },
    {
      variant: "duplicate target",
      code: "TZDB_MIGRATION_CONTEXT_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const duplicate = structuredClone(envelope.payload.tzdbMigrationReceipts[0]);
        duplicate.id = crypto.randomUUID();
        envelope.payload.tzdbMigrationReceipts.push(duplicate);
        envelope.manifest.counts.tzdbMigrationReceipts = 2;
      }
    }
  ])("rejects a re-signed tzdb receipt forgery: $variant", async ({ code, mutate }) => {
    const source = repositories();
    await seedTzdbMigrationData(source.cases, `tzdb-forgery-${crypto.randomUUID()}`);
    const envelope = await createFullBackup(source.cases, options);
    await mutate(envelope);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code });
  });

  it("round trips a non-empty Event time migration receipt partition with exact endpoint snapshots", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "event-receipt-round-trip");
    const derived = await seedEventTimeMigrationData(
      source.database,
      source.research,
      seeded.event,
      "event-receipt-round-trip"
    );
    const first = await createFullBackup(source.cases, options);

    expect(first.manifest).toMatchObject({
      formatVersion: "1.2.0",
      counts: { events: 3, eventTimeMigrationReceipts: 1 }
    });
    expect(first.payload.eventTimeMigrationReceipts).toEqual([derived.receipt]);
    expect(first.digests.eventTimeMigrationReceipts).toBe(
      await sha256Hex(first.payload.eventTimeMigrationReceipts)
    );

    const verified = await preflightFullBackup(serializeFullBackup(first));
    expect(verified.migratedFromFormatVersion).toBeNull();
    expect(verified.payload.eventTimeMigrationReceipts).toEqual([derived.receipt]);

    const destination = repositories();
    await importFullBackup(destination.cases, serializeFullBackup(first), options);
    await expect(destination.research.listEventTimeMigrationReceiptsForEvent(derived.target.id))
      .resolves.toEqual([derived.receipt]);
    const second = await createFullBackup(destination.cases, options);
    expect(second.payload).toEqual(first.payload);
    expect(second.digests).toEqual(first.digests);
  });

  it("preflights and restores an Event receipt after its identified target tzdb snapshot becomes historical", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "historical-event-receipt");
    const derived = await seedEventTimeMigrationData(
      source.database,
      source.research,
      seeded.event,
      "historical-event-receipt"
    );
    const envelope = await createFullBackup(source.cases, options);
    const receipt = envelope.payload.eventTimeMigrationReceipts[0]!;
    const targetIndex = envelope.payload.events.findIndex((record) => record.id === derived.target.id);
    if (targetIndex < 0) throw new Error("missing derived Event target fixture");
    const historicalTarget = withDifferentTimeZoneDatabaseSnapshot(envelope.payload.events[targetIndex]!);
    envelope.payload.events[targetIndex] = historicalTarget;
    receipt.target.snapshot = buildEventTimeMigrationSnapshot(historicalTarget);
    receipt.target.snapshotDigest = await sha256Hex(receipt.target.snapshot);
    await resign(envelope);

    const verified = await preflightFullBackup(serializeFullBackup(envelope));
    expect(verified.payload.events.find((record) => record.id === historicalTarget.id)?.timeContext)
      .toEqual(historicalTarget.timeContext);

    const destination = repositories();
    await importFullBackup(destination.cases, serializeFullBackup(envelope), options);
    await expect(destination.research.listEventTimeMigrationReceiptsForEvent(historicalTarget.id))
      .resolves.toEqual([receipt]);
    const restored = await createFullBackup(destination.cases, options);
    expect(restored.payload).toEqual(envelope.payload);
  });

  it.each([
    {
      variant: "orphan source",
      code: "ORPHAN_EVENT_TIME_MIGRATION",
      mutate: async (envelope: FullBackupEnvelope) => {
        envelope.payload.eventTimeMigrationReceipts[0]!.source.recordId = crypto.randomUUID();
      }
    },
    {
      variant: "orphan target",
      code: "ORPHAN_EVENT_TIME_MIGRATION",
      mutate: async (envelope: FullBackupEnvelope) => {
        envelope.payload.eventTimeMigrationReceipts[0]!.target.recordId = crypto.randomUUID();
      }
    },
    {
      variant: "endpoint digest",
      code: "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.eventTimeMigrationReceipts[0]!;
        receipt.source.snapshotDigest = alteredHex(receipt.source.snapshotDigest);
      }
    },
    {
      variant: "source snapshot drift",
      code: "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.eventTimeMigrationReceipts[0]!;
        const sourceEvent = envelope.payload.events.find((record) => record.id === receipt.source.recordId)!;
        sourceEvent.startDate = "2024-11-03T01:31";
      }
    },
    {
      variant: "target creation boundary",
      code: "EVENT_TIME_MIGRATION_INTEGRITY_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const receipt = envelope.payload.eventTimeMigrationReceipts[0]!;
        receipt.createdAt = new Date(Date.parse(receipt.createdAt) + 1_000).toISOString();
      }
    },
    {
      variant: "duplicate target",
      code: "EVENT_TIME_MIGRATION_CONTEXT_MISMATCH",
      mutate: async (envelope: FullBackupEnvelope) => {
        const duplicate = structuredClone(envelope.payload.eventTimeMigrationReceipts[0]!);
        duplicate.id = crypto.randomUUID();
        envelope.payload.eventTimeMigrationReceipts.push(duplicate);
        envelope.manifest.counts.eventTimeMigrationReceipts = 2;
      }
    },
    {
      variant: "global ID collision",
      code: "DUPLICATE_ID",
      mutate: async (envelope: FullBackupEnvelope) => {
        envelope.payload.eventTimeMigrationReceipts[0]!.id = envelope.payload.events[0]!.id;
      }
    }
  ])("rejects a re-signed Event time receipt forgery: $variant", async ({ code, mutate }) => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, `event-forgery-${crypto.randomUUID()}`);
    await seedEventTimeMigrationData(source.database, source.research, seeded.event, "event-forgery");
    const envelope = await createFullBackup(source.cases, options);
    await mutate(envelope);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code });
  });

  it.each(["duplicate-active", "dangling-active", "profile-mismatch"] as const)(
    "rejects invalid v1.1 rule-registry relationships: %s",
    async (variant) => {
      const source = repositories();
      const envelope = await createFullBackup(source.cases, options);
      const { installed, active } = await ruleRegistryFixture();
      if (variant === "duplicate-active") {
        envelope.payload.ruleRegistry = [installed, active, structuredClone(active)];
      } else if (variant === "dangling-active") {
        envelope.payload.ruleRegistry = [active];
      } else {
        envelope.payload.ruleRegistry = [
          installed,
          { ...active, activeProfileDigest: "c".repeat(64) }
        ];
      }
      envelope.manifest.counts.ruleRegistry = envelope.payload.ruleRegistry.length;
      await resign(envelope);

      await expect(preflightFullBackup(envelope)).rejects.toMatchObject({
        code: "RULE_REGISTRY_RELATIONSHIP_MISMATCH"
      });
    }
  );

  it.each([
    "canonical-json",
    "pack-id",
    "pack-digest",
    "profile-digest",
    "profile-id",
    "profile-version"
  ] as const)(
    "rejects v1.1 installed rule-pack canonical content or identity-index tampering: %s",
    async (variant) => {
      const source = repositories();
      const envelope = await createFullBackup(source.cases, options);
      const { installed } = await ruleRegistryFixture();
      const tampered: InstalledRulePackRecord = structuredClone(installed);
      if (variant === "canonical-json") tampered.canonicalJson = ` ${tampered.canonicalJson}`;
      if (variant === "pack-id") tampered.packId = "forged-pack-id";
      if (variant === "pack-digest") {
        tampered.id = "d".repeat(64);
        tampered.packDigest = tampered.id;
      }
      if (variant === "profile-digest") tampered.profileDigest = "e".repeat(64);
      if (variant === "profile-id") tampered.profileId = "forged-profile-id";
      if (variant === "profile-version") tampered.profileVersion = "9.9.9";
      envelope.payload.ruleRegistry = [tampered];
      envelope.manifest.counts.ruleRegistry = 1;
      await resign(envelope);

      await expect(preflightFullBackup(envelope)).rejects.toMatchObject({
        code: "RULE_PACK_INTEGRITY_MISMATCH"
      });
    }
  );

  it("rejects a dangling active rule pack before restore and leaves all destination data intact", async () => {
    const source = repositories();
    const incoming = await createFullBackup(source.cases, options);
    incoming.payload.ruleRegistry = [(await ruleRegistryFixture()).active];
    incoming.manifest.counts.ruleRegistry = 1;
    await resign(incoming);

    const destination = repositories();
    await seedModeledData(destination.cases, destination.research, "dangling-active-current");
    const { installed } = await ruleRegistryFixture();
    await destination.database.ruleRegistry.add(installed);
    const before = await destination.cases.readFullDataSnapshot();

    await expect(importFullBackup(destination.cases, incoming, options)).rejects.toMatchObject({
      code: "RULE_REGISTRY_RELATIONSHIP_MISMATCH"
    });
    expect(await destination.cases.readFullDataSnapshot()).toEqual(before);
  });

  it("uses one portable ZIP file by default while preserving direct JSON import compatibility", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "zip-portability", 1);
    await source.cases.saveResearcherProfile({ displayName: "ZIP 研究者" });
    await source.cases.createAttachment({
      fileName: "证据.bin",
      mediaType: "application/octet-stream",
      bytes: new Uint8Array([0x00, 0x80, 0xff])
    });
    const envelope = await createFullBackup(source.cases, options);
    const zip = createFullBackupArchive(envelope);
    const secondZip = createFullBackupArchive(envelope);

    expect([...secondZip]).toEqual([...zip]);
    await expect(preflightFullBackupFile(zip)).resolves.toMatchObject({
      manifest: envelope.manifest,
      payload: envelope.payload,
      digests: envelope.digests
    });
    await expect(preflightFullBackupFile(new TextEncoder().encode(serializeFullBackup(envelope))))
      .resolves.toMatchObject({ payload: envelope.payload, digests: envelope.digests });
  });

  it("rejects compatibility JSON bytes that are not strict UTF-8", async () => {
    const malformed = new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0x80, 0x22, 0x7d]);
    await expect(preflightFullBackupFile(malformed)).rejects.toHaveProperty(
      "code",
      "ARCHIVE_CONTENT_INVALID"
    );
  });

  it("rejects attachment byte tampering even after an attacker recomputes every outer digest", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "attachment-tamper", 1);
    const attachment = await source.cases.createAttachment({
      fileName: "tamper.bin",
      mediaType: "application/octet-stream",
      bytes: new Uint8Array([0x00, 0x01, 0xfe, 0xff]),
      link: { kind: "event", eventId: seeded.event.id }
    });
    const envelope = await createFullBackup(source.cases, options);
    const target = envelope.payload.attachments.find((record) => record.id === attachment.id)!;
    target.contentBase64 = encodeCanonicalBase64(new Uint8Array([0x00, 0x01, 0xfe, 0x00]));
    envelope.digests = await recomputeFullBackupDigests({
      manifest: envelope.manifest,
      payload: envelope.payload
    });

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({
      code: "ATTACHMENT_INTEGRITY_MISMATCH"
    });
  });

  it("rejects a re-signed attachment whose target no longer exists", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "attachment-orphan", 1);
    await source.cases.createAttachment({
      fileName: "linked.txt",
      mediaType: "text/plain",
      bytes: new TextEncoder().encode("attachment target sentinel"),
      link: { kind: "research_note", noteId: seeded.note.id }
    });
    const envelope = await createFullBackup(source.cases, options);
    envelope.payload.researchNotes = [];
    envelope.manifest.counts.researchNotes = 0;
    envelope.digests = await recomputeFullBackupDigests({
      manifest: envelope.manifest,
      payload: envelope.payload
    });

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({
      code: "ORPHAN_ATTACHMENT_TARGET"
    });
  });

  it("uses one fixed canonical order for stable bytes regardless of array iteration order", async () => {
    const source = repositories();
    const zeta = await seedModeledData(source.cases, source.research, "zeta");
    await seedCandidateData(source.cases, "zeta");
    await seedKnowledgeData(source.database, {
      noteId: zeta.note.id,
      eventId: zeta.event.id,
      caseId: zeta.bundle.caseRecord.id,
      revisionId: zeta.bundle.caseRecord.latestRevisionId
    }, "zeta");
    const alpha = await seedModeledData(source.cases, source.research, "alpha");
    await seedCandidateData(source.cases, "alpha");
    await seedKnowledgeData(source.database, {
      noteId: alpha.note.id,
      eventId: alpha.event.id,
      caseId: alpha.bundle.caseRecord.id,
      revisionId: alpha.bundle.caseRecord.latestRevisionId
    }, "alpha");
    const envelope = await createFullBackup(source.cases, options);
    const shuffled = structuredClone(envelope);
    shuffled.payload.cases.reverse();
    shuffled.payload.revisions.reverse();
    shuffled.payload.candidateSets.reverse();
    shuffled.payload.researchNotes.reverse();
    shuffled.payload.events.reverse();
    shuffled.payload.savedViews.reverse();
    shuffled.payload.knowledgeDocuments.reverse();
    shuffled.payload.citations.reverse();
    shuffled.payload.sourceRights.reverse();

    expect(serializeFullBackup(shuffled)).toBe(serializeFullBackup(envelope));
    expect((await preflightFullBackup(shuffled)).digests).toEqual(envelope.digests);
  });

  it.each([
    ["IANA zone", (event: FullBackupEnvelope["payload"]["events"][number]) => {
      if (event.timeContext.kind !== "zoned_minute") throw new Error("expected zoned minute fixture");
      const timeContext = event.timeContext;
      timeContext.timeZone = "America/Los_Angeles";
      for (const candidate of timeContext.start.resolution.candidates) {
        candidate.zonedDateTime = candidate.zonedDateTime.replace(/\[[^\]]+\]$/, "[America/Los_Angeles]");
      }
      const selectedChoice = timeContext.start.resolution.selectedCandidate.choice;
      const selected = timeContext.start.resolution.candidates.find(
        (candidate) => candidate.choice === selectedChoice
      );
      if (!selected) throw new Error("missing selected candidate");
      timeContext.start.resolution.selectedCandidate = structuredClone(selected);
    }],
    ["DST resolution", (event: FullBackupEnvelope["payload"]["events"][number]) => {
      if (event.timeContext.kind !== "zoned_minute") throw new Error("expected zoned minute fixture");
      const selected = { ...event.timeContext.start.resolution.selectedCandidate, choice: "unique" as const };
      event.timeContext.start.resolution = {
        kind: "unique",
        policy: "reject",
        status: "resolved_unique",
        requestedWallTime: event.timeContext.start.resolution.requestedWallTime,
        candidates: [selected],
        selectedCandidate: structuredClone(selected)
      };
    }],
    ["UTC offset", (event: FullBackupEnvelope["payload"]["events"][number]) => {
      if (event.timeContext.kind !== "zoned_minute") throw new Error("expected zoned minute fixture");
      const resolution = event.timeContext.start.resolution;
      const selectedIndex = resolution.candidates.findIndex(
        (candidate) => candidate.choice === resolution.selectedCandidate.choice
      );
      const selected = resolution.candidates[selectedIndex];
      if (!selected) throw new Error("missing selected candidate");
      selected.utcOffset = "-03:00";
      selected.utcOffsetMinutes = -180;
      selected.zonedDateTime = selected.zonedDateTime.replace("-04:00", "-03:00");
      resolution.selectedCandidate = structuredClone(selected);
    }],
    ["canonical UTC", (event: FullBackupEnvelope["payload"]["events"][number]) => {
      if (event.timeContext.kind !== "zoned_minute") throw new Error("expected zoned minute fixture");
      const resolution = event.timeContext.start.resolution;
      const selectedIndex = resolution.candidates.findIndex(
        (candidate) => candidate.choice === resolution.selectedCandidate.choice
      );
      const selected = resolution.candidates[selectedIndex];
      if (!selected) throw new Error("missing selected candidate");
      selected.instant = "2024-11-03T05:31:00Z";
      resolution.selectedCandidate = structuredClone(selected);
      event.timeContext.start.canonicalUtc = selected.instant;
    }]
  ] as const)("rejects a re-signed event with forged %s time context", async (_label, mutate) => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "event-time-forgery");
    await source.research.createEvent({
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId,
      transitNodeRef: null,
      datePrecision: "minute",
      startDate: "2024-11-03T01:30",
      endDate: null,
      timeZone: "America/New_York",
      startDisambiguation: "earlier",
      title: "DST overlap event",
      tags: ["dst"],
      sourceRefs: [],
      feedback: "unreviewed",
      body: "time-context integrity fixture"
    });
    const original = await createFullBackup(source.cases, options);
    const forged = structuredClone(original);
    const event = forged.payload.events.find((record) => record.timeContext.kind === "zoned_minute");
    if (!event) throw new Error("missing zoned event fixture");
    mutate(event);
    await resign(forged);
    expect(forged.digests.events).not.toBe(original.digests.events);

    await expect(preflightFullBackup(forged)).rejects.toMatchObject({
      code: "EVENT_TIME_CONTEXT_MISMATCH"
    });
  });

  it.each([
    ["cases", (envelope: FullBackupEnvelope) => { envelope.payload.cases[0].alias = "tampered"; }],
    ["revisions", (envelope: FullBackupEnvelope) => { envelope.payload.revisions[0].revisionNumber = 9; }],
    ["candidateSets", (envelope: FullBackupEnvelope) => { envelope.payload.candidateSets[0].alias = "tampered"; }],
    ["researchNotes", (envelope: FullBackupEnvelope) => { envelope.payload.researchNotes[0].body = "tampered"; }],
    ["events", (envelope: FullBackupEnvelope) => { envelope.payload.events[0].title = "tampered"; }],
    ["savedViews", (envelope: FullBackupEnvelope) => {
      const savedView = envelope.payload.savedViews[0];
      if (savedView.state !== "ready") throw new Error("expected ready SavedView fixture");
      savedView.query.text = "tampered";
    }],
    ["knowledgeDocuments", (envelope: FullBackupEnvelope) => { envelope.payload.knowledgeDocuments[0].title = "tampered"; }],
    ["citations", (envelope: FullBackupEnvelope) => { envelope.payload.citations[0].annotation = "tampered"; }],
    ["sourceRights", (envelope: FullBackupEnvelope) => { envelope.payload.sourceRights[0].source.publisher = "tampered"; }]
  ] as const)("rejects an unsigned mutation in %s before writing", async (_partition, mutate) => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "digest-source");
    await seedCandidateData(source.cases, "digest-source");
    await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "digest-source");
    const envelope = await createFullBackup(source.cases, options);
    mutate(envelope);

    const destination = repositories();
    const clearSpy = vi.spyOn(destination.database.cases, "clear");
    await expect(importFullBackup(destination.cases, envelope, options)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("rejects a re-signed current backup when a ready SavedView queryDigest is stale", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "saved-view-query-digest");
    const envelope = await createFullBackup(source.cases, options);
    const savedView = envelope.payload.savedViews[0];
    if (savedView.state !== "ready") throw new Error("expected ready SavedView fixture");
    savedView.query.text = "re-signed query tamper";
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({
      code: "SAVED_VIEW_QUERY_DIGEST_MISMATCH"
    });
  });

  it("rejects a candidateSet whose inner snapshot digest no longer matches, even when the outer envelope is re-signed", async () => {
    const source = repositories();
    await seedCandidateData(source.cases, "snapshot-source");
    const envelope = await createFullBackup(source.cases, options);
    envelope.payload.candidateSets[0].candidateSet.warnings.push("re-signed outer tamper");
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it("rejects a re-signed candidateSet whose semantic resultHash is stale", async () => {
    const source = repositories();
    await seedCandidateData(source.cases, "semantic-tamper");
    const envelope = structuredClone(await createFullBackup(source.cases, options));
    const record = envelope.payload.candidateSets[0];
    record.candidateSet.engine.version = "9.9.9";
    for (const candidate of record.candidateSet.candidates) {
      if (candidate.chart) candidate.chart.manifest.engine.version = "9.9.9";
      for (const variant of candidate.variants) variant.chart.manifest.engine.version = "9.9.9";
    }
    record.snapshotDigest = await sha256Hex(record.candidateSet);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it("rejects a re-signed formal Revision whose semantic chart hash is stale", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "revision-semantic-tamper");
    const envelope = structuredClone(await createFullBackup(source.cases, options));
    envelope.payload.revisions[0].facts.pillars.day.nayin = "伪造纳音";
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
  });

  it.each([
    ["document content", "KNOWLEDGE_DOCUMENT_INTEGRITY_MISMATCH", (envelope: FullBackupEnvelope) => {
      envelope.payload.knowledgeDocuments[0].content = envelope.payload.knowledgeDocuments[0].content.replace(
        "Day stem evidence",
        "Tampered evidence"
      );
    }],
    ["citation quote", "CITATION_INTEGRITY_MISMATCH", (envelope: FullBackupEnvelope) => {
      envelope.payload.citations[0].quote = "tampered quote";
    }]
  ] as const)("rejects re-signed knowledge integrity tampering in %s", async (_variant, code, mutate) => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "knowledge-integrity");
    await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "knowledge-integrity");
    const envelope = await createFullBackup(source.cases, options);
    mutate(envelope);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code });
  });

  it.each([
    ["document", "ORPHAN_CITATION_DOCUMENT", (envelope: FullBackupEnvelope) => {
      envelope.payload.citations[0].documentId = crypto.randomUUID();
    }],
    ["research-note target", "ORPHAN_CITATION_TARGET", (envelope: FullBackupEnvelope) => {
      const target = envelope.payload.citations[0].targets.find((candidate) => candidate.kind === "research_note");
      if (!target || target.kind !== "research_note") throw new Error("missing research-note fixture target");
      target.noteId = crypto.randomUUID();
    }],
    ["event target", "ORPHAN_CITATION_TARGET", (envelope: FullBackupEnvelope) => {
      const target = envelope.payload.citations[0].targets.find((candidate) => candidate.kind === "event");
      if (!target || target.kind !== "event") throw new Error("missing event fixture target");
      target.eventId = crypto.randomUUID();
    }],
    ["evidence-subject target", "ORPHAN_CITATION_TARGET", (envelope: FullBackupEnvelope) => {
      envelope.payload.citations[0].targets.push({
        kind: "evidence_subject",
        subjectId: "unknown.subject.v1"
      });
    }],
    ["chart-field target", "ORPHAN_CITATION_TARGET", (envelope: FullBackupEnvelope) => {
      const target = envelope.payload.citations[0].targets.find((candidate) => candidate.kind === "chart_field");
      if (!target || target.kind !== "chart_field") throw new Error("missing chart-field fixture target");
      target.revisionId = crypto.randomUUID();
    }],
    ["chart-field path", "ORPHAN_CITATION_TARGET", (envelope: FullBackupEnvelope) => {
      const target = envelope.payload.citations[0].targets.find((candidate) => candidate.kind === "chart_field");
      if (!target || target.kind !== "chart_field") throw new Error("missing chart-field fixture target");
      target.field = "pillars.day.nonexistent";
    }],
    ["chart-field prototype path", "ORPHAN_CITATION_TARGET", (envelope: FullBackupEnvelope) => {
      const target = envelope.payload.citations[0].targets.find((candidate) => candidate.kind === "chart_field");
      if (!target || target.kind !== "chart_field") throw new Error("missing chart-field fixture target");
      target.field = "pillars.day.constructor";
    }]
  ] as const)("rejects a re-signed orphan knowledge relationship: %s", async (_variant, code, mutate) => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "knowledge-orphan");
    await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "knowledge-orphan");
    const envelope = await createFullBackup(source.cases, options);
    mutate(envelope);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code });
  });

  it.each([
    ["missing ledger row", "SOURCE_RIGHTS_NOT_FOUND", (envelope: FullBackupEnvelope) => {
      envelope.payload.sourceRights = [];
      envelope.manifest.counts.sourceRights = 0;
    }],
    ["duplicate ledger row", "DUPLICATE_SOURCE_RIGHTS", (envelope: FullBackupEnvelope) => {
      envelope.payload.sourceRights.push(structuredClone(envelope.payload.sourceRights[0]));
      envelope.manifest.counts.sourceRights = 2;
    }],
    ["orphan ledger row", "ORPHAN_SOURCE_RIGHTS", (envelope: FullBackupEnvelope) => {
      envelope.payload.sourceRights[0].documentId = crypto.randomUUID();
    }],
    ["content-hash mismatch", "SOURCE_RIGHTS_CONTENT_HASH_MISMATCH", (envelope: FullBackupEnvelope) => {
      envelope.payload.sourceRights[0].documentContentHash = alteredHex(
        envelope.payload.sourceRights[0].documentContentHash
      );
    }],
    ["origin/document-type mismatch", "SOURCE_RIGHTS_ORIGIN_MISMATCH", (envelope: FullBackupEnvelope) => {
      envelope.payload.knowledgeDocuments[0].recordType = "bundled_knowledge_document";
    }]
  ] as const)("rejects a re-signed SourceRights one-to-one violation: %s", async (_variant, code, mutate) => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "rights-relation");
    await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "rights-relation");
    const envelope = await createFullBackup(source.cases, options);
    mutate(envelope);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code });
  });

  it("rejects malformed JSON, count errors, and unknown fields", async () => {
    await expect(preflightFullBackup("{broken")).rejects.toMatchObject({ code: "INVALID_JSON" });

    const source = repositories();
    await seedModeledData(source.cases, source.research, "strict-source");
    const countMismatch = await createFullBackup(source.cases, options);
    countMismatch.manifest.counts.events += 1;
    await expect(preflightFullBackup(countMismatch)).rejects.toMatchObject({ code: "COUNT_MISMATCH" });

    const unknownEnvelope = await createFullBackup(source.cases, options) as FullBackupEnvelope & { extra?: boolean };
    unknownEnvelope.extra = true;
    await expect(preflightFullBackup(unknownEnvelope)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const unknownRecord = await createFullBackup(source.cases, options);
    (unknownRecord.payload.events[0] as unknown as Record<string, unknown>).extra = true;
    await expect(preflightFullBackup(unknownRecord)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });
  });

  it.each([
    ["format", "hakimi-bazi-core-backup", "UNSUPPORTED_FORMAT"],
    ["formatVersion", "0.0.9", "UNSUPPORTED_FORMAT_VERSION"],
    ["formatVersion", "9.0.0", "UNSUPPORTED_FORMAT_VERSION"],
    ["schemaVersion", "0.9.0", "UNSUPPORTED_SCHEMA_VERSION"],
    ["schemaVersion", "9.0.0", "UNSUPPORTED_SCHEMA_VERSION"]
  ] as const)("rejects unsupported %s=%s", async (field, value, code) => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "version-source");
    const envelope = await createFullBackup(source.cases, options);
    (envelope.manifest as unknown as Record<string, unknown>)[field] = value;
    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code });
  });

  it("strictly verifies a signed v0.1 five-partition envelope before migrating it to v1.1", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "legacy-source");
    // v0.1 had no candidateSets partition, even if the current database does.
    await seedCandidateData(source.cases, "not-present-in-legacy");
    const legacy = await asSignedLegacyEnvelope(await createFullBackup(source.cases, options));
    legacy.payload.revisions.reverse();

    const legacyWithV02Partition = structuredClone(legacy) as unknown as {
      payload: Record<string, unknown>;
    };
    legacyWithV02Partition.payload.candidateSets = [];
    await expect(preflightFullBackup(legacyWithV02Partition)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const migrated = await preflightFullBackup(legacy);
    expect(migrated.migratedFromFormatVersion).toBe("0.1.0");
    expect(migrated.manifest).toMatchObject({
      formatVersion: "1.2.0",
      counts: {
        cases: 1,
        revisions: 2,
        candidateSets: 0,
        researchNotes: 1,
        events: 1,
        savedViews: 1,
        knowledgeDocuments: 0,
        citations: 0,
        sourceRights: 0,
        tzdbMigrationReceipts: 0
      }
    });
    expect(migrated.payload.candidateSets).toEqual([]);
    expect(migrated.payload.knowledgeDocuments).toEqual([]);
    expect(migrated.payload.citations).toEqual([]);
    expect(migrated.payload.sourceRights).toEqual([]);
    expect(migrated.payload.events[0].timeContext).toEqual({ kind: "legacy_floating" });
    expect(migrated.payload.cases[0]).toMatchObject({
      ...legacy.payload.cases[0],
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    });

    const destination = repositories();
    const imported = await importFullBackup(destination.cases, legacy, options);
    expect(imported.imported.migratedFromFormatVersion).toBe("0.1.0");
    expect((await destination.cases.readFullDataSnapshot()).candidateSets).toEqual([]);
    expect(await destination.database.birthFingerprints.count()).toBe(2);
  });

  it("strictly verifies a signed v0.2 six-partition envelope before migrating it to v1.1", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "previous-source");
    const candidate = await seedCandidateData(source.cases, "previous-source");
    await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "not-present-in-v02");
    const previous = await asSignedPreviousEnvelope(await createFullBackup(source.cases, options));
    previous.payload.revisions.reverse();

    const previousWithV03Partition = structuredClone(previous) as unknown as {
      payload: Record<string, unknown>;
    };
    previousWithV03Partition.payload.knowledgeDocuments = [];
    await expect(preflightFullBackup(previousWithV03Partition)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const migrated = await preflightFullBackup(previous);
    expect(migrated.migratedFromFormatVersion).toBe("0.2.0");
    expect(migrated.manifest).toMatchObject({
      formatVersion: "1.2.0",
      counts: {
        cases: 1,
        revisions: 2,
        candidateSets: 1,
        researchNotes: 1,
        events: 1,
        savedViews: 1,
        knowledgeDocuments: 0,
        citations: 0,
        sourceRights: 0,
        tzdbMigrationReceipts: 0
      }
    });
    expect(migrated.payload.candidateSets).toEqual([expect.objectContaining({
      id: candidate.id,
      recordVersion: 2,
      favorite: false,
      deletedAt: null
    })]);
    expect(migrated.payload.knowledgeDocuments).toEqual([]);
    expect(migrated.payload.citations).toEqual([]);
    expect(migrated.payload.sourceRights).toEqual([]);
    expect(migrated.payload.events[0].timeContext).toEqual({ kind: "legacy_floating" });

    previous.payload.researchNotes[0].body = "unsigned v0.2 mutation";
    await expect(preflightFullBackup(previous)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    previous.payload.researchNotes[0].caseId = crypto.randomUUID();
    await resignPrevious(previous);
    await expect(preflightFullBackup(previous)).rejects.toMatchObject({ code: "ORPHAN_RESEARCH_NOTE" });
  });

  it("strictly verifies signed v0.3 knowledge data before a deterministic conservative v1.1 migration", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "knowledge-v03-source");
    await seedCandidateData(source.cases, "knowledge-v03-source");
    const knowledge = await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "knowledge-v03-source");
    const legacy = await asSignedKnowledgeEnvelope(await createFullBackup(source.cases, options));
    legacy.payload.revisions.reverse();

    const v03WithV04Partition = structuredClone(legacy) as unknown as {
      payload: Record<string, unknown>;
    };
    v03WithV04Partition.payload.sourceRights = [];
    await expect(preflightFullBackup(v03WithV04Partition)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const first = await preflightFullBackup(legacy);
    const second = await preflightFullBackup(structuredClone(legacy));
    expect(first.migratedFromFormatVersion).toBe("0.3.0");
    expect(first.manifest).toMatchObject({
      formatVersion: "1.2.0",
      counts: {
        cases: 1,
        revisions: 2,
        candidateSets: 1,
        researchNotes: 1,
        events: 1,
        savedViews: 1,
        knowledgeDocuments: 1,
        citations: 1,
        sourceRights: 1,
        tzdbMigrationReceipts: 0
      }
    });
    expect(first.payload).toEqual(second.payload);
    expect(first.digests).toEqual(second.digests);
    expect(first.payload.events[0].timeContext).toEqual({ kind: "legacy_floating" });
    expect(first.payload.knowledgeDocuments[0]).not.toHaveProperty("rightsStatus");
    expect(first.payload.knowledgeDocuments[0]).toMatchObject({
      id: knowledge.document.id,
      recordType: "user_knowledge_document"
    });
    expect(first.payload.citations[0]).toMatchObject({
      id: knowledge.citation.id,
      status: "user_candidate",
      targetKeys: citationTargetKeys(knowledge.citation.targets),
      reviewAttestations: [],
      decisionNote: ""
    });
    expect(first.payload.sourceRights).toEqual([{
      schemaVersion: "1.0.0",
      recordType: "knowledge_source_rights",
      documentId: knowledge.document.id,
      documentContentHash: knowledge.document.contentHash,
      origin: "user_import",
      source: {
        sourceUrl: null,
        publisher: "",
        publicationYear: null,
        acquiredAt: knowledge.document.createdAt
      },
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
      createdAt: knowledge.document.createdAt,
      updatedAt: knowledge.document.createdAt
    }]);

    const destination = repositories();
    const imported = await importFullBackup(destination.cases, legacy, options);
    expect(imported.imported.migratedFromFormatVersion).toBe("0.3.0");
    expect((await destination.cases.readFullDataSnapshot()).sourceRights).toEqual(first.payload.sourceRights);
  });

  it("strictly verifies signed v0.5 Event v1 data before adding legacy_floating in v1.1", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "lifecycle-v05");
    const lifecycle = await asSignedLifecycleEnvelope(await createFullBackup(source.cases, options));
    lifecycle.payload.events[0].datePrecision = "minute";
    lifecycle.payload.events[0].startDate = "2024-11-03T01:30";
    lifecycle.payload.events[0].endDate = null;
    await resignLifecycle(lifecycle);

    const retroactivelyExtended = structuredClone(lifecycle) as unknown as {
      payload: { events: Array<Record<string, unknown>> };
    };
    retroactivelyExtended.payload.events[0].recordVersion = 2;
    retroactivelyExtended.payload.events[0].timeContext = { kind: "legacy_floating" };
    await expect(preflightFullBackup(retroactivelyExtended)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const unsigned = structuredClone(lifecycle);
    unsigned.payload.events[0].title = "unsigned v0.5 event mutation";
    await expect(preflightFullBackup(unsigned)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    const first = await preflightFullBackup(lifecycle);
    const second = await preflightFullBackup(structuredClone(lifecycle));
    expect(first.migratedFromFormatVersion).toBe("0.5.0");
    expect(first.manifest.formatVersion).toBe("1.2.0");
    expect(first.payload.events[0]).toMatchObject({
      recordVersion: 2,
      datePrecision: "minute",
      startDate: "2024-11-03T01:30",
      endDate: null,
      timeContext: { kind: "legacy_floating" }
    });
    expect(first.payload).toEqual(second.payload);
    expect(first.digests).toEqual(second.digests);
    expect(JSON.stringify(first.payload.events[0].timeContext)).not.toContain("timeZone");
  });

  it("freezes signed v0.6 SavedView v1 data before a lossless migration_required v1.1 conversion", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "event-time-v06");
    const eventTime = await asSignedEventTimeEnvelope(await createFullBackup(source.cases, options));
    const legacySavedView = structuredClone(eventTime.payload.savedViews[0]);

    const retroactivelyExtended = structuredClone(eventTime) as unknown as {
      payload: { savedViews: Array<Record<string, unknown>> };
    };
    retroactivelyExtended.payload.savedViews[0].recordVersion = 2;
    retroactivelyExtended.payload.savedViews[0].state = "ready";
    await expect(preflightFullBackup(retroactivelyExtended)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const migrated = await preflightFullBackup(eventTime);
    expect(migrated.migratedFromFormatVersion).toBe("0.6.0");
    expect(migrated.manifest.formatVersion).toBe("1.2.0");
    expect(migrated.payload.savedViews[0]).toMatchObject({
      recordVersion: 2,
      state: "migration_required",
      migrationReason: "legacy_untyped_filters_require_manual_review",
      legacyRecord: legacySavedView
    });
    expect("query" in migrated.payload.savedViews[0]).toBe(false);

    const destination = repositories();
    await importFullBackup(destination.cases, eventTime, options);
    const roundTrip = await createFullBackup(destination.cases, options);
    expect(roundTrip.manifest.formatVersion).toBe("1.2.0");
    expect(roundTrip.payload.savedViews).toEqual(migrated.payload.savedViews);
    expect((await preflightFullBackup(roundTrip)).migratedFromFormatVersion).toBeNull();

    eventTime.payload.savedViews[0].filters = { unsigned: true };
    await expect(preflightFullBackup(eventTime)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    await resignEventTime(eventTime);
    const reviewedAgain = await preflightFullBackup(eventTime);
    expect(reviewedAgain.payload.savedViews[0]).toMatchObject({
      state: "migration_required",
      legacyRecord: { filters: { unsigned: true } }
    });
  });

  it("strictly verifies signed v0.4 data before adding lifecycle defaults in v1.1", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "source-rights-v04");
    await seedCandidateData(source.cases, "source-rights-v04");
    await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "source-rights-v04");
    const legacy = await asSignedSourceRightsEnvelope(await createFullBackup(source.cases, options));
    legacy.payload.revisions.reverse();

    const retroactivelyExtended = structuredClone(legacy) as unknown as {
      payload: { cases: Array<Record<string, unknown>> };
    };
    retroactivelyExtended.payload.cases[0].recordVersion = 2;
    retroactivelyExtended.payload.cases[0].favorite = false;
    retroactivelyExtended.payload.cases[0].deletedAt = null;
    await expect(preflightFullBackup(retroactivelyExtended)).rejects.toMatchObject({ code: "SCHEMA_INVALID" });

    const migrated = await preflightFullBackup(legacy);
    expect(migrated.migratedFromFormatVersion).toBe("0.4.0");
    expect(migrated.manifest.formatVersion).toBe("1.2.0");
    expect(migrated.payload.cases[0]).toMatchObject({ recordVersion: 2, favorite: false, deletedAt: null });
    expect(migrated.payload.candidateSets[0]).toMatchObject({ recordVersion: 2, favorite: false, deletedAt: null });
    expect(migrated.payload.knowledgeDocuments).toHaveLength(1);
    expect(migrated.payload.sourceRights).toHaveLength(1);
    expect(migrated.payload.events[0].timeContext).toEqual({ kind: "legacy_floating" });

    legacy.payload.cases[0].alias = "unsigned v0.4 mutation";
    await expect(preflightFullBackup(legacy)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });
    legacy.payload.cases[0].latestRevisionId = crypto.randomUUID();
    await resignSourceRights(legacy);
    await expect(preflightFullBackup(legacy)).rejects.toMatchObject({ code: "CASE_REVISION_SUMMARY_MISMATCH" });
  });

  it("rejects a modified v0.3 payload before migration and checks old relationships only after a valid v0.3 signature", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "knowledge-v03-verification");
    await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "knowledge-v03-verification");
    const legacy = await asSignedKnowledgeEnvelope(await createFullBackup(source.cases, options));

    legacy.payload.citations[0].annotation = "unsigned v0.3 mutation";
    await expect(preflightFullBackup(legacy)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    legacy.payload.citations[0].documentId = crypto.randomUUID();
    await resignKnowledge(legacy);
    await expect(preflightFullBackup(legacy)).rejects.toMatchObject({ code: "ORPHAN_CITATION_DOCUMENT" });
  });

  it("rejects a modified v0.1 payload before migration and checks relationships only after a valid legacy signature", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "legacy-verification-source");
    const legacy = await asSignedLegacyEnvelope(await createFullBackup(source.cases, options));

    legacy.payload.researchNotes[0].body = "unsigned legacy mutation";
    await expect(preflightFullBackup(legacy)).rejects.toMatchObject({ code: "DIGEST_MISMATCH" });

    legacy.payload.researchNotes[0].caseId = crypto.randomUUID();
    await resignLegacy(legacy);
    await expect(preflightFullBackup(legacy)).rejects.toMatchObject({ code: "ORPHAN_RESEARCH_NOTE" });
  });

  it.each(["researchNote", "candidateSet", "knowledgeDocument", "citation", "tzdbMigrationReceipt"] as const)(
    "rejects a duplicate %s ID even when the attacker recomputes every outer digest",
    async (partition) => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "duplicate-source");
    await seedTzdbMigrationData(source.cases, "duplicate-source");
    await seedKnowledgeData(source.database, {
      noteId: seeded.note.id,
      eventId: seeded.event.id,
      caseId: seeded.bundle.caseRecord.id,
      revisionId: seeded.bundle.caseRecord.latestRevisionId
    }, "duplicate-source");
    const envelope = await createFullBackup(source.cases, options);
    if (partition === "researchNote") envelope.payload.researchNotes[0].id = envelope.payload.cases[0].id;
    if (partition === "candidateSet") envelope.payload.candidateSets[0].id = envelope.payload.cases[0].id;
    if (partition === "knowledgeDocument") envelope.payload.knowledgeDocuments[0].id = envelope.payload.cases[0].id;
    if (partition === "citation") envelope.payload.citations[0].id = envelope.payload.cases[0].id;
    if (partition === "tzdbMigrationReceipt") {
      envelope.payload.tzdbMigrationReceipts[0].id = envelope.payload.cases[0].id;
    }
    await resign(envelope);
    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code: "DUPLICATE_ID" });
    }
  );

  it.each([
    ["revision", "ORPHAN_REVISION", (envelope: FullBackupEnvelope) => {
      envelope.payload.revisions[0].caseId = crypto.randomUUID();
    }],
    ["note-case", "ORPHAN_RESEARCH_NOTE", (envelope: FullBackupEnvelope) => {
      envelope.payload.researchNotes[0].caseId = crypto.randomUUID();
    }],
    ["note-anchor", "ORPHAN_RESEARCH_NOTE", (envelope: FullBackupEnvelope) => {
      const note = envelope.payload.researchNotes[0];
      note.anchor = { kind: "revision", revisionId: crypto.randomUUID() };
    }],
    ["event-case", "ORPHAN_EVENT", (envelope: FullBackupEnvelope) => {
      envelope.payload.events[0].caseId = crypto.randomUUID();
    }],
    ["event-revision", "ORPHAN_EVENT", (envelope: FullBackupEnvelope) => {
      const missingRevisionId = crypto.randomUUID();
      envelope.payload.events[0].revisionId = missingRevisionId;
      stableEventRef(envelope).revisionId = missingRevisionId;
    }]
  ] as const)("rejects orphan relationship %s after digest verification", async (_variant, code, mutate) => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "orphan-source");
    const envelope = await createFullBackup(source.cases, options);
    mutate(envelope);
    await resign(envelope);
    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code });
  });

  it("accepts case-level candidate research but rejects binding a candidate event to a chart revision", async () => {
    const source = repositories();
    const seeded = await seedModeledData(source.cases, source.research, "candidate-relation-source");
    const candidate = await seedCandidateData(source.cases, "candidate-relation-source");
    await source.research.createResearchNote({
      caseId: candidate.id,
      anchor: { kind: "case" },
      body: "候选组级笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const candidateEvent = await source.research.createEvent({
      caseId: candidate.id,
      revisionId: null,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "候选组级事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    const envelope = await createFullBackup(source.cases, options);
    await expect(preflightFullBackup(envelope)).resolves.toMatchObject({ migratedFromFormatVersion: null });

    envelope.payload.events.find((event) => event.id === candidateEvent.id)!.revisionId = seeded.bundle.caseRecord.latestRevisionId;
    await resign(envelope);
    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({ code: "ORPHAN_EVENT" });
  });

  it.each([
    ["revisionId", (envelope: FullBackupEnvelope) => {
      const previousRevisionId = envelope.payload.revisions[0]!.id;
      envelope.payload.events[0]!.revisionId = previousRevisionId;
      stableEventRef(envelope).revisionId = previousRevisionId;
    }],
    ["resultHash", (envelope: FullBackupEnvelope) => {
      const ref = stableEventRef(envelope);
      ref.chartResultHash = alteredHex(ref.chartResultHash);
    }],
    ["ruleProfileDigest", (envelope: FullBackupEnvelope) => {
      const ref = stableEventRef(envelope);
      ref.ruleProfileDigest = alteredHex(ref.ruleProfileDigest);
    }],
    ["luckCycleRuleDigest", (envelope: FullBackupEnvelope) => {
      const ref = stableEventRef(envelope);
      ref.luckCycleRuleDigest = alteredHex(ref.luckCycleRuleDigest);
    }],
    ["timelineVersion", (envelope: FullBackupEnvelope) => {
      stableEventRef(envelope).timelineVersion = "hakimi-transit:9.9.9";
    }],
    ["algorithmId", (envelope: FullBackupEnvelope) => {
      stableEventRef(envelope).algorithmId = "forged:full-backup-node:v1";
    }],
    ["manualDirection", (envelope: FullBackupEnvelope) => {
      stableEventRef(envelope).manualDirection = "forward";
    }],
    ["nodeType", (envelope: FullBackupEnvelope) => {
      stableEventRef(envelope).nodeType = "month";
    }],
    ["startInstant", (envelope: FullBackupEnvelope) => {
      const ref = stableEventRef(envelope);
      const shiftedStart = new Date(Date.parse(ref.startInstant) + 1_000).toISOString();
      const factHash = ref.nodeId.slice(ref.nodeId.indexOf(".") + 1);
      ref.startInstant = shiftedStart;
      ref.nodeId = `${Date.parse(shiftedStart)}.${factHash}`;
    }],
    ["nodeIdFactHash", (envelope: FullBackupEnvelope) => {
      const ref = stableEventRef(envelope);
      ref.nodeId = alteredHex(ref.nodeId);
    }]
  ] as const)("rejects a re-signed event with a mismatched transit %s", async (_field, mutate) => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "transit-context-source");
    const envelope = await createFullBackup(source.cases, options);
    mutate(envelope);
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({
      code: "TRANSIT_CONTEXT_MISMATCH"
    });
  });

  it("keeps the legacy future-transit-node compatibility boundary without treating it as a formal node", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "legacy-transit-placeholder");
    const envelope = await createFullBackup(source.cases, options);
    envelope.payload.events[0].transitNodeRef = {
      namespace: "future-transit-node",
      nodeType: "year",
      nodeId: "legacy-year-2025",
      timelineVersion: null
    };
    await resign(envelope);

    await expect(preflightFullBackup(envelope)).resolves.toMatchObject({
      payload: {
        events: [expect.objectContaining({
          transitNodeRef: expect.objectContaining({ namespace: "future-transit-node" })
        })]
      }
    });
  });

  it.each(["sequence", "count", "latest"] as const)("rejects invalid revision summary: %s", async (variant) => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "summary-source");
    const envelope = await createFullBackup(source.cases, options);
    if (variant === "sequence") envelope.payload.revisions[1].revisionNumber = 3;
    if (variant === "count") envelope.payload.cases[0].revisionCount = 1;
    if (variant === "latest") envelope.payload.cases[0].latestRevisionId = envelope.payload.revisions[0].id;
    await resign(envelope);
    await expect(preflightFullBackup(envelope)).rejects.toMatchObject({
      code: variant === "sequence" ? "REVISION_SEQUENCE_INVALID" : "CASE_REVISION_SUMMARY_MISMATCH"
    });
  });

  it("prepares a downloadable safety backup before any write, then applies without the core-only dependency block", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "incoming");
    const incoming = await createFullBackup(source.cases, options);

    const destination = repositories();
    await seedModeledData(destination.cases, destination.research, "current");
    const before = await destination.cases.readFullDataSnapshot();
    const beforeBackup = await createFullBackup(destination.cases, options);
    const preparation = await prepareFullBackupImport(destination.cases, incoming, options);

    expect(await destination.cases.readFullDataSnapshot()).toEqual(before);
    expect(preparation.currentSafetyBackup.payload).toEqual(beforeBackup.payload);
    await applyPreparedFullBackup(destination.cases, preparation);
    expect((await destination.cases.readFullDataSnapshot()).cases[0].alias).toBe("incoming");
  });

  it("refuses a stale preparation when current data changed after the safety backup", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "incoming-stale");
    const incoming = await createFullBackup(source.cases, options);

    const destination = repositories();
    const current = await seedModeledData(destination.cases, destination.research, "current-stale");
    const preparation = await prepareFullBackupImport(destination.cases, incoming, options);
    await destination.research.createResearchNote({
      caseId: current.bundle.caseRecord.id,
      anchor: { kind: "case" },
      body: "created after preparation",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });

    await expect(applyPreparedFullBackup(destination.cases, preparation)).rejects.toMatchObject({
      code: "CURRENT_DATA_CHANGED"
    });
    expect((await destination.cases.readFullDataSnapshot()).cases[0].alias).toBe("current-stale");
    expect((await destination.cases.readFullDataSnapshot()).researchNotes).toHaveLength(2);
  });

  it("includes SourceRights edits in the compare-and-swap restore guard", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "incoming-rights-cas");
    const incoming = await createFullBackup(source.cases, options);

    const destination = repositories();
    const current = await seedModeledData(destination.cases, destination.research, "current-rights-cas");
    const knowledge = await seedKnowledgeData(destination.database, {
      noteId: current.note.id,
      eventId: current.event.id,
      caseId: current.bundle.caseRecord.id,
      revisionId: current.bundle.caseRecord.latestRevisionId
    }, "current-rights-cas");
    const preparation = await prepareFullBackupImport(destination.cases, incoming, options);
    await destination.database.sourceRights.put({
      ...knowledge.sourceRights,
      source: { ...knowledge.sourceRights.source, publisher: "edited after preparation" },
      editVersion: knowledge.sourceRights.editVersion + 1,
      updatedAt: "2026-08-01T00:00:01.000Z"
    });

    await expect(applyPreparedFullBackup(destination.cases, preparation)).rejects.toMatchObject({
      code: "CURRENT_DATA_CHANGED"
    });
    expect((await destination.database.sourceRights.get(knowledge.document.id))?.source.publisher)
      .toBe("edited after preparation");
  });

  it("includes rule-registry writes in the compare-and-swap restore guard", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "incoming-rule-registry-cas");
    const incoming = await createFullBackup(source.cases, options);

    const destination = repositories();
    await seedModeledData(destination.cases, destination.research, "current-rule-registry-cas");
    const preparation = await prepareFullBackupImport(destination.cases, incoming, options);
    const { installed } = await ruleRegistryFixture();
    await destination.database.ruleRegistry.add(installed);

    await expect(applyPreparedFullBackup(destination.cases, preparation)).rejects.toMatchObject({
      code: "CURRENT_DATA_CHANGED"
    });
    expect(await destination.database.ruleRegistry.get(installed.id)).toEqual(installed);
    expect((await destination.cases.readFullDataSnapshot()).cases[0].alias).toBe("current-rule-registry-cas");
  });

  it("includes receipt-only writes in the current-payload compare-and-swap guard", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "incoming-receipt-cas");
    const incoming = await createFullBackup(source.cases, options);

    const destination = repositories();
    const derived = await seedTzdbMigrationData(destination.cases, "current-receipt-cas");
    const preparation = await prepareFullBackupImport(destination.cases, incoming, options);
    expect(preparation.currentSafetyBackup.payload.tzdbMigrationReceipts).toEqual([derived.receipt]);

    const changedReceipt = {
      ...derived.receipt,
      createdAt: new Date(Date.parse(derived.receipt.createdAt) + 1_000).toISOString()
    };
    await destination.database.tzdbMigrationReceipts.put(changedReceipt);

    await expect(applyPreparedFullBackup(destination.cases, preparation)).rejects.toMatchObject({
      code: "CURRENT_DATA_CHANGED"
    });
    expect(await destination.database.tzdbMigrationReceipts.get(derived.receipt.id)).toEqual(changedReceipt);
    expect(await destination.database.candidateSets.count()).toBe(2);
  });

  it("includes Event receipt-only writes in the current-payload compare-and-swap guard", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "incoming-event-receipt-cas");
    const incoming = await createFullBackup(source.cases, options);

    const destination = repositories();
    const current = await seedModeledData(destination.cases, destination.research, "current-event-receipt-cas");
    const derived = await seedEventTimeMigrationData(
      destination.database,
      destination.research,
      current.event,
      "current-event-receipt-cas"
    );
    const preparation = await prepareFullBackupImport(destination.cases, incoming, options);
    expect(preparation.currentSafetyBackup.payload.eventTimeMigrationReceipts).toEqual([derived.receipt]);

    const changedReceipt = {
      ...derived.receipt,
      createdAt: new Date(Date.parse(derived.receipt.createdAt) + 1_000).toISOString()
    };
    await destination.database.eventTimeMigrationReceipts.put(changedReceipt);

    await expect(applyPreparedFullBackup(destination.cases, preparation)).rejects.toMatchObject({
      code: "CURRENT_DATA_CHANGED"
    });
    expect(await destination.database.eventTimeMigrationReceipts.get(derived.receipt.id)).toEqual(changedReceipt);
    expect(await destination.database.events.count()).toBe(3);
  });

  it("serializes a racing writer with restore so the concurrent case is never silently deleted", async () => {
    const source = repositories();
    await seedModeledData(source.cases, source.research, "incoming-race");
    const incoming = await createFullBackup(source.cases, options);

    const destination = repositories();
    await seedModeledData(destination.cases, destination.research, "current-race");
    const preparation = await prepareFullBackupImport(destination.cases, incoming, options);
    const racingDatabase = new ResearchDatabase(destination.database.name);
    databases.push(racingDatabase);
    const racingCases = new CaseRepository(racingDatabase);
    const racingChart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);

    const [restoreResult, writeResult] = await Promise.allSettled([
      applyPreparedFullBackup(destination.cases, preparation),
      racingCases.createCase({ alias: "concurrent-race", calculated: racingChart })
    ]);

    expect(writeResult.status).toBe("fulfilled");
    const aliases = (await destination.cases.listCases()).map((record) => record.alias);
    expect(aliases).toContain("concurrent-race");
    if (restoreResult.status === "fulfilled") {
      expect(aliases).toContain("incoming-race");
      expect(aliases).not.toContain("current-race");
    } else {
      expect(restoreResult.reason).toMatchObject({ code: "CURRENT_DATA_CHANGED" });
      expect(aliases).toContain("current-race");
    }
  });

  it("rolls all fifteen partitions and the derived fingerprint index back on QuotaExceededError", async () => {
    const source = repositories();
    const incomingSeed = await seedModeledData(source.cases, source.research, "rollback-incoming");
    await seedTzdbMigrationData(source.cases, "rollback-incoming");
    await seedEventTimeMigrationData(source.database, source.research, incomingSeed.event, "rollback-incoming");
    await seedKnowledgeData(source.database, {
      noteId: incomingSeed.note.id,
      eventId: incomingSeed.event.id,
      caseId: incomingSeed.bundle.caseRecord.id,
      revisionId: incomingSeed.bundle.caseRecord.latestRevisionId
    }, "rollback-incoming");
    const incoming = await createFullBackup(source.cases, options);

    const destination = repositories();
    const currentSeed = await seedModeledData(destination.cases, destination.research, "rollback-current");
    await seedTzdbMigrationData(destination.cases, "rollback-current");
    await seedEventTimeMigrationData(destination.database, destination.research, currentSeed.event, "rollback-current");
    await seedKnowledgeData(destination.database, {
      noteId: currentSeed.note.id,
      eventId: currentSeed.event.id,
      caseId: currentSeed.bundle.caseRecord.id,
      revisionId: currentSeed.bundle.caseRecord.latestRevisionId
    }, "rollback-current");
    const before = await destination.cases.readFullDataSnapshot();
    const fingerprintsBefore = await destination.database.birthFingerprints.toArray();
    vi.spyOn(destination.database.eventTimeMigrationReceipts, "bulkAdd")
      .mockRejectedValueOnce(new DOMException("simulated quota exhaustion", "QuotaExceededError"));

    await expect(importFullBackup(destination.cases, incoming, options))
      .rejects.toMatchObject({ name: "QuotaExceededError" });
    expect(await destination.cases.readFullDataSnapshot()).toEqual(before);
    expect(await destination.database.birthFingerprints.toArray()).toEqual(fingerprintsBefore);
  });
});
