import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import {
  applyPreparedFullBackup,
  createFullBackupFromSnapshot,
  preflightFullBackupFile,
  prepareFullBackupFileImport,
  serializeFullBackup
} from "@hakimi/backup";
import { calculateChart } from "@hakimi/bazi-core";
import { SCHEMA_VERSION, type BirthInput, type CitationRecord } from "@hakimi/contracts";
import { sha256BytesHex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, KnowledgeRepository, ResearchDatabase } from "@hakimi/storage";
import {
  prepareLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting,
  prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting,
  readLocalBaziCitationReviewContextFromRepositoriesForTesting,
  reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting,
  type LocalBaziCitationReviewContextLocator,
  type LocalBaziCitationReviewContextReadDependencies
} from "./bazi-citation-review-context";
import {
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
  deleteBaziCitationObservationLifecycleExactCopy,
  readBaziCitationObservationLifecycleAttachmentCatalog,
  readBaziCitationObservationLifecycleOriginalBytes,
  reopenBaziCitationObservationLifecycleStoredCopies,
  saveBaziCitationObservationLifecycleCanonicalSession,
  type BaziCitationObservationLifecycleAttachmentRepository,
  type BaziCitationObservationLifecycleStoreDependencies
} from "./bazi-citation-observation-lifecycle-store";

const CREATED_AT = "2026-08-25T00:00:00.000Z";
const EXPORTED_AT = "2026-08-25T02:00:00.000Z";
const SUBJECT_ID = "bazi.pillar.day.ganzhi.v1";
const FIELD_PATH = "pillars.day.ganZhi";
const BACKUP_OPTIONS = Object.freeze({
  appVersion: "0.1.0-legacy-v13-lifecycle-backup-test",
  exportedAt: EXPORTED_AT
});

const BIRTH_INPUT: BirthInput = {
  schemaVersion: SCHEMA_VERSION,
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: {
    label: "lifecycle-full-backup-test-location",
    latitude: 31.2304,
    longitude: 121.4737,
    precision: "coordinates"
  },
  sourceNote: "lifecycle-full-backup-test-source"
};

type Fixture = Readonly<{
  database: ResearchDatabase;
  cases: CaseRepository;
  knowledge: KnowledgeRepository;
  locator: LocalBaziCitationReviewContextLocator;
}>;

function reviewDependencies(fixture: Fixture): LocalBaziCitationReviewContextReadDependencies {
  return {
    releaseIdentity: {
      dbGeneration: "legacy-v13",
      databaseName: fixture.database.name,
      targetSchema: 13,
      migrationId: null,
      buildVersion: null,
      manifestDigest: null,
      evidenceId: null,
      evidenceBound: false,
      engineeringEvidenceOnly: true
    },
    caseRepository: fixture.cases,
    knowledgeRepository: fixture.knowledge
  };
}

function attachmentRepository(
  fixture: Fixture
): BaziCitationObservationLifecycleAttachmentRepository {
  return {
    database: fixture.database,
    readAttachmentPurposeMetadataSnapshot:
      fixture.cases.readAttachmentPurposeMetadataSnapshot.bind(fixture.cases),
    createAttachmentOnce: fixture.cases.createAttachmentOnce.bind(fixture.cases),
    createAttachmentOnceWithExactUnlinkedSources:
      fixture.cases.createAttachmentOnceWithExactUnlinkedSources.bind(fixture.cases),
    readAttachmentBytes: fixture.cases.readAttachmentBytes.bind(fixture.cases),
    deleteExactUnlinkedAttachment:
      fixture.cases.deleteExactUnlinkedAttachment.bind(fixture.cases)
  };
}

function storeDependencies(fixture: Fixture): BaziCitationObservationLifecycleStoreDependencies {
  return {
    releaseIdentity: {
      dbGeneration: "legacy-v13",
      databaseName: fixture.database.name,
      targetSchema: 13,
      migrationId: null
    },
    repository: attachmentRepository(fixture),
    reopenLifecycle: (locator, expectedDigest, texts) => (
      reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
        locator,
        expectedDigest,
        texts,
        reviewDependencies(fixture)
      )
    )
  };
}

async function createSourceFixture(database: ResearchDatabase): Promise<Fixture> {
  const cases = new CaseRepository(database, () => CREATED_AT);
  const knowledge = new KnowledgeRepository(database, () => CREATED_AT);
  const chart = await calculateChart(BIRTH_INPUT, WORKING_DEFAULT_RULE_PROFILE);
  const created = await cases.createCase({
    alias: "Lifecycle Full Backup Fixture",
    calculated: chart
  });
  const documentContent = ["intro", "# Sources", "source line one", "source line two"].join("\n");
  const document = await knowledge.createDocument({
    title: "Lifecycle full backup fixture source",
    author: "local test",
    edition: "test",
    sourceNote: "local only",
    fileName: "lifecycle-full-backup-source.md",
    format: "markdown",
    content: documentContent,
    byteSize: new TextEncoder().encode(documentContent).byteLength
  });
  for (const [index, lineNumber] of [3, 4].entries()) {
    const candidate = await knowledge.createCitation({
      documentId: document.id,
      locator: { sectionId: "section-2", startLine: lineNumber, endLine: lineNumber },
      annotation: `lifecycle-full-backup-citation-${index}`,
      targets: [{ kind: "evidence_subject", subjectId: SUBJECT_ID }]
    });
    const verified: CitationRecord = {
      ...candidate,
      status: "verified",
      reviewAttestations: [
        { reviewerId: `reviewer-a-${index}`, reviewedAt: CREATED_AT, note: "local test" },
        { reviewerId: `reviewer-b-${index}`, reviewedAt: CREATED_AT, note: "local test" }
      ],
      decisionNote: "Engineering fixture only; no expert or content truth claim.",
      editVersion: candidate.editVersion + 1,
      updatedAt: CREATED_AT
    };
    await database.citations.put(verified);
  }
  return {
    database,
    cases,
    knowledge,
    locator: {
      caseId: created.caseRecord.id,
      revisionId: created.revisions[0]!.id,
      evidenceSubjectId: SUBJECT_ID,
      fieldPath: FIELD_PATH
    }
  };
}

function restoredFixture(
  database: ResearchDatabase,
  locator: LocalBaziCitationReviewContextLocator
): Fixture {
  return {
    database,
    cases: new CaseRepository(database, () => CREATED_AT),
    knowledge: new KnowledgeRepository(database, () => CREATED_AT),
    locator
  };
}

function completeObservation(
  templateContent: string,
  reviewerId: string,
  identityReference: string,
  secondStatus: "not_applicable_in_bound_context" | "insufficient_bound_context",
  sentinel: string
): string {
  const value = JSON.parse(templateContent) as {
    reviewer: Record<string, unknown>;
    session: Record<string, unknown>;
    observations: Array<Record<string, unknown>>;
    declaredCounts: Record<string, number>;
  };
  Object.assign(value.reviewer, {
    reviewerId,
    displayName: `DISPLAY_${sentinel}`,
    affiliation: `AFFILIATION_${sentinel}`,
    expertiseStatement: `EXPERTISE_${sentinel}`,
    identityEvidenceReference: identityReference
  });
  Object.assign(value.session, {
    observedAt: "2026-08-25T01:00:00.000Z",
    methodology: `METHODOLOGY_${sentinel}`,
    traditionScope: `TRADITION_${sentinel}`,
    generalNotes: `NOTES_${sentinel}`
  });
  Object.assign(value.observations[0]!, {
    observation: "applicable_in_bound_context",
    reason: `REASON_0_${sentinel}`,
    applicabilityConditions: `CONDITION_0_${sentinel}`,
    counterexamples: `COUNTEREXAMPLE_0_${sentinel}`
  });
  Object.assign(value.observations[1]!, {
    observation: secondStatus,
    reason: `REASON_1_${sentinel}`,
    applicabilityConditions: `CONDITION_1_${sentinel}`,
    counterexamples: `COUNTEREXAMPLE_1_${sentinel}`
  });
  Object.assign(value.declaredCounts, {
    total: 2,
    unobserved: 0,
    applicableInBoundContext: 1,
    partiallyApplicableInBoundContext: 0,
    notApplicableInBoundContext: secondStatus === "not_applicable_in_bound_context" ? 1 : 0,
    insufficientBoundContext: secondStatus === "insufficient_bound_context" ? 1 : 0
  });
  return JSON.stringify(value);
}

async function prepareLifecycle(fixture: Fixture) {
  const dependencies = reviewDependencies(fixture);
  const displayed = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
    fixture.locator,
    dependencies
  );
  const template = await prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
    fixture.locator,
    displayed.context.integrity.payloadSha256,
    dependencies
  );
  const rawA = completeObservation(
    template.content,
    "backup-reviewer-a",
    "backup-identity-a",
    "not_applicable_in_bound_context",
    "FULL_BACKUP_A_SECRET"
  );
  const rawB = completeObservation(
    template.content,
    "backup-reviewer-b",
    "backup-identity-b",
    "insufficient_bound_context",
    "FULL_BACKUP_B_SECRET"
  );
  const prepared = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
    fixture.locator,
    displayed.context.integrity.payloadSha256,
    rawA,
    rawB,
    dependencies
  );
  return { displayed, prepared };
}

function decodeBase64WithoutKey(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function expectExactBytes(actual: Uint8Array, expected: Uint8Array): void {
  expect(actual.byteLength).toBe(expected.byteLength);
  expect(actual.every((value, index) => value === expected[index])).toBe(true);
}

const SAVE_CONFIRMATION = Object.freeze({
  explicitSaveIntent: true,
  sensitiveReviewerAndDerivedChartContentAcknowledged: true,
  plaintextFullBackupInclusionAcknowledged: true,
  unlinkedAttachmentWillNotCascadeWithCaseDeletionAcknowledged: true,
  priorAndExternalCopiesCannotBeRecalledAcknowledged: true
});

const DELETE_CONFIRMATION = Object.freeze({
  explicitDeleteIntent: true,
  currentStoreSingleCopyOnlyAcknowledged: true,
  physicalErasureNotAttestedAcknowledged: true,
  priorAndExternalCopiesCannotBeRecalledAcknowledged: true
});

describe("Bazi citation lifecycle LocalAttachment full-backup integration", () => {
  it("backs up and restores exact sensitive bytes, while deletion cannot recall the captured plaintext backup", async () => {
    const sourceDatabase = new ResearchDatabase(
      `hakimi-bazi-lifecycle-backup-source-${crypto.randomUUID()}`,
      { targetSchema: 13 }
    );
    const destinationDatabase = new ResearchDatabase(
      `hakimi-bazi-lifecycle-backup-destination-${crypto.randomUUID()}`,
      { targetSchema: 13 }
    );
    try {
      const source = await createSourceFixture(sourceDatabase);
      const lifecycle = await prepareLifecycle(source);
      const saved = await saveBaziCitationObservationLifecycleCanonicalSession({
        content: lifecycle.prepared.content,
        expectedSidecarSha256: lifecycle.prepared.sidecarSha256,
        sourceIdentities: [],
        confirmation: SAVE_CONFIRMATION
      }, storeDependencies(source));
      expect(saved.boundary).toMatchObject({
        includedInPlaintextFullBackup: true,
        storageMutationPerformed: true,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false
      });

      const expectedBytes = new TextEncoder().encode(lifecycle.prepared.content);
      const sourceSnapshot = await source.cases.readFullDataSnapshot();
      expect(sourceSnapshot.attachments).toHaveLength(1);
      const snapshotAttachment = sourceSnapshot.attachments[0]!;
      expect(snapshotAttachment).toEqual({
        schemaVersion: "1.0.0",
        recordVersion: 1,
        recordType: "local_attachment",
        ...saved.attachment,
        contentBase64: expect.any(String)
      });
      expectExactBytes(decodeBase64WithoutKey(snapshotAttachment.contentBase64), expectedBytes);
      expect(snapshotAttachment.contentHash).toBe(await sha256BytesHex(expectedBytes));

      const backup = await createFullBackupFromSnapshot(sourceSnapshot, BACKUP_OPTIONS);
      const serializedBackup = serializeFullBackup(backup);
      const backupBytes = new TextEncoder().encode(serializedBackup);
      const capturedSnapshot = structuredClone(sourceSnapshot);
      const capturedBackup = structuredClone(backup);
      const capturedBackupBytes = Uint8Array.from(backupBytes);
      expect(backup.manifest).toMatchObject({
        schemaVersion: "1.0.0",
        counts: { attachments: 1 }
      });
      expect(backup.payload.attachments).toEqual(sourceSnapshot.attachments);
      expect(serializedBackup).toContain(JSON.stringify(snapshotAttachment.contentBase64));

      const preflight = await preflightFullBackupFile(backupBytes);
      expect(preflight.payload.attachments).toEqual(sourceSnapshot.attachments);
      expectExactBytes(
        decodeBase64WithoutKey(preflight.payload.attachments[0]!.contentBase64),
        expectedBytes
      );

      const destination = restoredFixture(destinationDatabase, source.locator);
      const preparation = await prepareFullBackupFileImport(
        destination.cases,
        backupBytes,
        { ...BACKUP_OPTIONS, exportedAt: "2026-08-25T02:01:00.000Z" }
      );
      expect(preparation.currentSafetyBackup.payload.attachments).toEqual([]);
      const applied = await applyPreparedFullBackup(destination.cases, preparation);
      expect(applied.payload.attachments).toEqual(sourceSnapshot.attachments);

      const restoredSnapshot = await destination.cases.readFullDataSnapshot();
      expect(restoredSnapshot.attachments).toEqual(sourceSnapshot.attachments);
      const catalog = await readBaziCitationObservationLifecycleAttachmentCatalog(
        storeDependencies(destination)
      );
      expect(catalog.items).toEqual([saved.attachment]);
      expect(catalog.boundary).toMatchObject({
        completeCoverageVerified: true,
        atomicMetadataSnapshotVerified: true,
        contentIntegrityVerified: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false
      });

      const exported = await readBaziCitationObservationLifecycleOriginalBytes({
        attachment: catalog.items[0],
        expectedSidecarSha256: lifecycle.prepared.sidecarSha256
      }, storeDependencies(destination));
      expectExactBytes(exported.bytes, expectedBytes);
      expect(exported.lifecycle).toMatchObject({
        ledgerId: lifecycle.prepared.ledgerId,
        recordSetSha256: lifecycle.prepared.recordSetSha256,
        sidecarSha256: lifecycle.prepared.sidecarSha256
      });

      const reopened = await reopenBaziCitationObservationLifecycleStoredCopies({
        locator: destination.locator,
        expectedPriorContextPayloadSha256: lifecycle.displayed.context.integrity.payloadSha256,
        copies: catalog.items
      }, storeDependencies(destination));
      expect(reopened.privateLeafPayload).toMatchObject({
        status: "current_context_matched_comparison_ready",
        sidecarSha256: lifecycle.prepared.sidecarSha256,
        content: lifecycle.prepared.content
      });
      expect(reopened.privateLeafPayload.comparison).not.toBeNull();
      expect(reopened.boundary).toMatchObject({
        freshContextReopenPerformed: true,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false
      });

      const deleted = await deleteBaziCitationObservationLifecycleExactCopy({
        attachment: catalog.items[0],
        expectedSidecarSha256: lifecycle.prepared.sidecarSha256,
        confirmation: DELETE_CONFIRMATION
      }, storeDependencies(destination));
      expect(deleted.boundary).toMatchObject({
        currentStoreAttachmentCopyAbsentVerified: true,
        priorPlaintextBackupsRecalled: false,
        physicalDeletionAttested: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false
      });
      expect((await readBaziCitationObservationLifecycleAttachmentCatalog(
        storeDependencies(destination)
      )).items).toEqual([]);

      expect(sourceSnapshot).toEqual(capturedSnapshot);
      expect(backup).toEqual(capturedBackup);
      expectExactBytes(backupBytes, capturedBackupBytes);
      expect(serializeFullBackup(backup)).toBe(serializedBackup);
      const stillReadableBackup = await preflightFullBackupFile(backupBytes);
      expect(stillReadableBackup.payload.attachments[0]).toEqual(snapshotAttachment);
      expectExactBytes(
        decodeBase64WithoutKey(stillReadableBackup.payload.attachments[0]!.contentBase64),
        expectedBytes
      );
    } finally {
      const sourceName = sourceDatabase.name;
      const destinationName = destinationDatabase.name;
      sourceDatabase.close();
      destinationDatabase.close();
      await Dexie.delete(sourceName);
      await Dexie.delete(destinationName);
    }
  }, 60_000);
});
