import Dexie from "dexie";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { SCHEMA_VERSION, type BirthInput, type CitationRecord } from "@hakimi/contracts";
import { sha256BytesHex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  KnowledgeRepository,
  LocalAttachmentPurposeMetadataSnapshotLimitError,
  ResearchDatabase
} from "@hakimi/storage";
import {
  prepareLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting,
  prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor,
  prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting,
  readLocalBaziCitationReviewContextFromRepositoriesForTesting,
  reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting,
  type LocalBaziCitationReviewContextLocator,
  type LocalBaziCitationReviewContextReadDependencies
} from "./bazi-citation-review-context";
import {
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
  BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
  BaziCitationObservationLifecycleStoreError,
  deleteBaziCitationObservationLifecycleExactCopy,
  readBaziCitationObservationLifecycleAttachmentCatalog,
  readBaziCitationObservationLifecycleOriginalBytes,
  reopenBaziCitationObservationLifecycleStoredCopies,
  saveBaziCitationObservationLifecycleCanonicalSession,
  type BaziCitationObservationLifecycleAttachmentRepository,
  type BaziCitationObservationLifecycleStoreDependencies
} from "./bazi-citation-observation-lifecycle-store";

const CREATED_AT = "2026-08-25T00:00:00.000Z";
const SUBJECT_ID = "bazi.pillar.day.ganzhi.v1";
const FIELD_PATH = "pillars.day.ganZhi";

const birthInput: BirthInput = {
  schemaVersion: SCHEMA_VERSION,
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: {
    label: "lifecycle-store-test-location",
    latitude: 31.2304,
    longitude: 121.4737,
    precision: "coordinates"
  },
  sourceNote: "lifecycle-store-test-source"
};

type Fixture = Readonly<{
  database: ResearchDatabase;
  cases: CaseRepository;
  knowledge: KnowledgeRepository;
  locator: LocalBaziCitationReviewContextLocator;
}>;

let fixture: Fixture;

function reviewDependencies(): LocalBaziCitationReviewContextReadDependencies {
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

function repositoryPort(
  overrides: Partial<BaziCitationObservationLifecycleAttachmentRepository> = {}
): BaziCitationObservationLifecycleAttachmentRepository {
  const cases = fixture.cases;
  return {
    database: fixture.database,
    readAttachmentPurposeMetadataSnapshot: cases.readAttachmentPurposeMetadataSnapshot.bind(cases),
    createAttachmentOnce: cases.createAttachmentOnce.bind(cases),
    createAttachmentOnceWithExactUnlinkedSources:
      cases.createAttachmentOnceWithExactUnlinkedSources.bind(cases),
    readAttachmentBytes: cases.readAttachmentBytes.bind(cases),
    deleteExactUnlinkedAttachment: cases.deleteExactUnlinkedAttachment.bind(cases),
    ...overrides
  };
}

function storeDependencies(
  repository: BaziCitationObservationLifecycleAttachmentRepository = repositoryPort()
): BaziCitationObservationLifecycleStoreDependencies {
  return {
    releaseIdentity: {
      dbGeneration: "legacy-v13",
      databaseName: fixture.database.name,
      targetSchema: 13,
      migrationId: null
    },
    repository,
    reopenLifecycle: (locator, expectedDigest, texts) => (
      reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
        locator,
        expectedDigest,
        texts,
        reviewDependencies()
      )
    )
  };
}

async function createVerifiedCitation(
  documentId: string,
  lineNumber: number,
  suffix: string
): Promise<CitationRecord> {
  const candidate = await fixture.knowledge.createCitation({
    documentId,
    locator: { sectionId: "section-2", startLine: lineNumber, endLine: lineNumber },
    annotation: `lifecycle-store-citation-${suffix}`,
    targets: [{ kind: "evidence_subject", subjectId: SUBJECT_ID }]
  });
  const verified: CitationRecord = {
    ...candidate,
    status: "verified",
    reviewAttestations: [
      { reviewerId: `reviewer-a-${suffix}`, reviewedAt: CREATED_AT, note: "local test" },
      { reviewerId: `reviewer-b-${suffix}`, reviewedAt: CREATED_AT, note: "local test" }
    ],
    decisionNote: "Only an engineering fixture; no expert truth.",
    editVersion: candidate.editVersion + 1,
    updatedAt: CREATED_AT
  };
  await fixture.database.citations.put(verified);
  return verified;
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

async function prepareLifecycle(suffix: string) {
  const displayed = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
    fixture.locator,
    reviewDependencies()
  );
  const template = await prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
    fixture.locator,
    displayed.context.integrity.payloadSha256,
    reviewDependencies()
  );
  const rawA = completeObservation(
    template.content,
    `store-${suffix}-reviewer-a`,
    `store-${suffix}-identity-a`,
    "not_applicable_in_bound_context",
    `STORE_${suffix}_A_SECRET`
  );
  const rawB = completeObservation(
    template.content,
    `store-${suffix}-reviewer-b`,
    `store-${suffix}-identity-b`,
    "insufficient_bound_context",
    `STORE_${suffix}_B_SECRET`
  );
  const prepared = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
    fixture.locator,
    displayed.context.integrity.payloadSha256,
    rawA,
    rawB,
    reviewDependencies()
  );
  return { displayed, prepared };
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

async function savePrepared(
  prepared: Awaited<ReturnType<typeof prepareLifecycle>>["prepared"],
  sourceIdentities: readonly unknown[] = [],
  repository: BaziCitationObservationLifecycleAttachmentRepository = repositoryPort()
) {
  return saveBaziCitationObservationLifecycleCanonicalSession({
    content: prepared.content,
    expectedSidecarSha256: prepared.sidecarSha256,
    sourceIdentities,
    confirmation: SAVE_CONFIRMATION
  }, storeDependencies(repository));
}

function expectDeeplyFrozen(value: unknown, seen = new Set<object>()): void {
  if (
    value === null
    || typeof value !== "object"
    || ArrayBuffer.isView(value)
    || seen.has(value)
  ) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) expectDeeplyFrozen(descriptor.value, seen);
  }
}

beforeAll(async () => {
  const database = new ResearchDatabase(
    `hakimi-web-bazi-lifecycle-store-${crypto.randomUUID()}`,
    { targetSchema: 13 }
  );
  const cases = new CaseRepository(database, () => CREATED_AT);
  const knowledge = new KnowledgeRepository(database, () => CREATED_AT);
  fixture = { database, cases, knowledge, locator: null as never };

  const chart = await calculateChart(birthInput, WORKING_DEFAULT_RULE_PROFILE);
  const created = await cases.createCase({ alias: "Lifecycle Store Fixture", calculated: chart });
  const documentContent = ["intro", "# Sources", "source line one", "source line two"].join("\n");
  const document = await knowledge.createDocument({
    title: "Lifecycle store fixture source",
    author: "local test",
    edition: "test",
    sourceNote: "local only",
    fileName: "lifecycle-store-source.md",
    format: "markdown",
    content: documentContent,
    byteSize: new TextEncoder().encode(documentContent).byteLength
  });
  await createVerifiedCitation(document.id, 3, "0");
  await createVerifiedCitation(document.id, 4, "1");
  fixture = {
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
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fixture.database.attachments.clear();
});

afterAll(async () => {
  const name = fixture.database.name;
  fixture.database.close();
  await Dexie.delete(name);
});

describe("Bazi citation observation lifecycle LocalAttachment adapter", () => {
  it("explicitly saves canonical sensitive bytes idempotently, reads an unchecked exact-purpose catalog, and exports byte-for-byte", async () => {
    const { prepared } = await prepareLifecycle("SAVE");
    const ordinaryCreate = vi.fn(repositoryPort().createAttachmentOnce);
    const exactCreate = vi.fn(repositoryPort().createAttachmentOnceWithExactUnlinkedSources);
    const repository = repositoryPort({
      createAttachmentOnce: ordinaryCreate,
      createAttachmentOnceWithExactUnlinkedSources: exactCreate
    });
    const first = await savePrepared(prepared, [], repository);
    const duplicate = await savePrepared(prepared, [], repository);

    expect(first).toMatchObject({
      profile: BAZI_CITATION_OBSERVATION_LIFECYCLE_STORE_PROFILE,
      created: true,
      sourceIdentityCount: 0,
      attachment: {
        mediaType: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
        description: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
        link: null
      },
      lifecycle: {
        sidecarSha256: prepared.sidecarSha256,
        ledgerId: prepared.ledgerId,
        recordSetSha256: prepared.recordSetSha256,
        counts: { recordedNotWithheld: 2, withheld: 0 }
      },
      boundary: {
        explicitSaveIntentConfirmed: true,
        plaintextFullBackupInclusionAcknowledged: true,
        unlinkedNonCascadeAcknowledged: true,
        oldAndExternalCopiesCannotBeRecalledAcknowledged: true,
        exactRawBytesReadBack: true,
        lifecycleRoundTripDigestMatched: true,
        exactPurposeCatalogCapacityAtomicallyAdmitted: true,
        includedInPlaintextFullBackup: true,
        storageWriteCallPerformed: true,
        newAttachmentRecordCreated: true,
        storageMutationPerformed: true,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        reviewerWithdrawalAuthorityVerified: false,
        publicReleaseAuthorized: false
      }
    });
    expect(duplicate.created).toBe(false);
    expect(duplicate.boundary).toMatchObject({
      storageWriteCallPerformed: true,
      newAttachmentRecordCreated: false,
      storageMutationPerformed: false
    });
    expect(duplicate.attachment).toEqual(first.attachment);
    expect(exactCreate).toHaveBeenCalledTimes(2);
    expect(exactCreate.mock.calls.map((call) => call[1])).toEqual([[], []]);
    expect(ordinaryCreate).not.toHaveBeenCalled();
    expect(await fixture.database.attachments.count()).toBe(1);

    const unrelated = await fixture.cases.createAttachment({
      fileName: "unrelated.json",
      mediaType: "application/json",
      bytes: new TextEncoder().encode("{}"),
      description: "unrelated",
      link: null
    });
    const catalog = await readBaziCitationObservationLifecycleAttachmentCatalog(storeDependencies());
    expect(catalog.items).toEqual([first.attachment]);
    expect(catalog.items.some((item) => item.id === unrelated.id)).toBe(false);
    expect(catalog).toMatchObject({
      summary: { storedCopies: 1, matchedDeclaredBytes: first.attachment.byteLength },
      boundary: {
        exactPurposeFilterUsed: true,
        completeCoverageVerified: true,
        atomicMetadataSnapshotVerified: true,
        contentIntegrityVerified: false,
        timestampOrderingUsed: false,
        storageMutationPerformed: false
      }
    });

    const exported = await readBaziCitationObservationLifecycleOriginalBytes({
      attachment: first.attachment,
      expectedSidecarSha256: first.lifecycle.sidecarSha256
    }, storeDependencies());
    const expectedBytes = new TextEncoder().encode(prepared.content);
    expect(first.attachment.contentHash).toBe(await sha256BytesHex(expectedBytes));
    expect([...exported.bytes]).toEqual([...expectedBytes]);
    expect(new TextDecoder().decode(exported.bytes)).toBe(prepared.content);
    expect(exported.boundary).toMatchObject({
      exactStoredBytesReturned: true,
      jsonReserializationPerformed: false,
      callerByteMutationAffectsStoredCopy: false,
      requiredSharePolicy: "blocked_sensitive",
      publicExportAuthorized: false
    });
    exported.bytes[0] = exported.bytes[0] === 0 ? 1 : 0;
    expect(new TextDecoder().decode(await fixture.cases.readAttachmentBytes(
      first.attachment.id,
      { expectedContentHash: first.attachment.contentHash }
    ) as Uint8Array)).toBe(prepared.content);
    expectDeeplyFrozen(first);
    expectDeeplyFrozen(catalog);
  }, 30_000);

  it("serially reopens one to sixteen selected stored copies with fresh context while keeping raw text in the private payload", async () => {
    const { displayed, prepared } = await prepareLifecycle("REOPEN");
    const base = await savePrepared(prepared);
    const successorPrepared = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
      prepared.content,
      prepared.comparison.records[0].recordSha256,
      "privacy_request"
    );
    const successor = await saveBaziCitationObservationLifecycleCanonicalSession({
      content: successorPrepared.content,
      expectedSidecarSha256: successorPrepared.sidecarSha256,
      sourceIdentities: [base.attachment],
      confirmation: SAVE_CONFIRMATION
    }, storeDependencies());
    const readOrder: string[] = [];
    const repository = repositoryPort({
      readAttachmentBytes: vi.fn(async (id, options) => {
        readOrder.push(id);
        return fixture.cases.readAttachmentBytes(id, options);
      })
    });

    const reopened = await reopenBaziCitationObservationLifecycleStoredCopies({
      locator: fixture.locator,
      expectedPriorContextPayloadSha256: displayed.context.integrity.payloadSha256,
      copies: [successor.attachment, base.attachment]
    }, storeDependencies(repository));

    const expectedOrder = [successor.attachment, base.attachment]
      .sort((left, right) => left.contentHash < right.contentHash ? -1 : left.contentHash > right.contentHash ? 1 : left.id < right.id ? -1 : 1)
      .map((identity) => identity.id);
    expect(readOrder).toEqual(expectedOrder);
    expect(reopened.privateLeafPayload).toMatchObject({
      status: "current_context_matched_withheld",
      sidecarSha256: successor.lifecycle.sidecarSha256,
      counts: { recordedNotWithheld: 1, withheld: 1 },
      comparison: null
    });
    expect(reopened.privateLeafPayload.content).toContain("STORE_REOPEN_A_SECRET");
    expect(JSON.stringify(reopened.sources)).not.toContain("STORE_REOPEN_A_SECRET");
    expect(reopened.boundary).toMatchObject({
      selectedCopyCount: 2,
      selectedCopiesReadSerially: true,
      eachReadUsedExpectedRawContentHash: true,
      freshContextReopenPerformed: true,
      catalogWideAtomicContentSnapshotClaimed: false,
      mutationEpochBypassed: false
    });
    expect(successor.boundary.sourceIdentitiesAtomicallyRevalidatedDuringCreate).toBe(true);
  }, 30_000);

  it("marks every failure after a create call is attempted as commit reconciliation required", async () => {
    const { prepared } = await prepareLifecycle("UNKNOWN");
    const realCreate = fixture.cases.createAttachmentOnceWithExactUnlinkedSources.bind(fixture.cases);
    const repository = repositoryPort({
      createAttachmentOnceWithExactUnlinkedSources: vi.fn(async (input, sources) => {
        await realCreate(input, sources);
        throw new Error("simulated lost return receipt");
      })
    });

    await expect(saveBaziCitationObservationLifecycleCanonicalSession({
      content: prepared.content,
      expectedSidecarSha256: prepared.sidecarSha256,
      sourceIdentities: [],
      confirmation: SAVE_CONFIRMATION
    }, storeDependencies(repository))).rejects.toMatchObject({
      code: "COMMIT_RECONCILIATION_REQUIRED",
      phase: "write_call_or_postwrite_reinspection",
      commitReconciliationRequired: true
    });
    expect(await fixture.database.attachments.count()).toBe(1);
    expect((await readBaziCitationObservationLifecycleAttachmentCatalog(storeDependencies())).items)
      .toHaveLength(1);
  }, 30_000);

  it("maps only typed atomic catalog-capacity rejection to a safe prewrite cancellation", async () => {
    const { prepared } = await prepareLifecycle("CAPACITY");
    const ordinaryCreate = vi.fn(repositoryPort().createAttachmentOnce);
    const typedCapacityCreate = vi.fn(async (
      _input: Parameters<BaziCitationObservationLifecycleAttachmentRepository["createAttachmentOnceWithExactUnlinkedSources"]>[0],
      _sources: Parameters<BaziCitationObservationLifecycleAttachmentRepository["createAttachmentOnceWithExactUnlinkedSources"]>[1]
    ) => {
      throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
        "MATCH_LIMIT_EXCEEDED",
        "simulated exact-purpose capacity rejection before add"
      );
    });
    const typedRepository = repositoryPort({
      createAttachmentOnce: ordinaryCreate,
      createAttachmentOnceWithExactUnlinkedSources: typedCapacityCreate
    });

    await expect(saveBaziCitationObservationLifecycleCanonicalSession({
      content: prepared.content,
      expectedSidecarSha256: prepared.sidecarSha256,
      sourceIdentities: [],
      confirmation: SAVE_CONFIRMATION
    }, storeDependencies(typedRepository))).rejects.toMatchObject({
      code: "CATALOG_LIMIT_EXCEEDED",
      phase: "prewrite",
      commitReconciliationRequired: false
    });
    expect(typedCapacityCreate).toHaveBeenCalledTimes(1);
    expect(typedCapacityCreate.mock.calls[0]?.[1]).toEqual([]);
    expect(ordinaryCreate).not.toHaveBeenCalled();
    expect(await fixture.database.attachments.count()).toBe(0);

    const forgedCapacityCreate = vi.fn(async (
      _input: Parameters<BaziCitationObservationLifecycleAttachmentRepository["createAttachmentOnceWithExactUnlinkedSources"]>[0],
      _sources: Parameters<BaziCitationObservationLifecycleAttachmentRepository["createAttachmentOnceWithExactUnlinkedSources"]>[1]
    ) => {
      const forged = new Error("forged same-code create failure");
      Object.defineProperty(forged, "code", { value: "MATCH_LIMIT_EXCEEDED" });
      throw forged;
    });
    const forgedRepository = repositoryPort({
      createAttachmentOnceWithExactUnlinkedSources: forgedCapacityCreate
    });
    await expect(saveBaziCitationObservationLifecycleCanonicalSession({
      content: prepared.content,
      expectedSidecarSha256: prepared.sidecarSha256,
      sourceIdentities: [],
      confirmation: SAVE_CONFIRMATION
    }, storeDependencies(forgedRepository))).rejects.toMatchObject({
      code: "COMMIT_RECONCILIATION_REQUIRED",
      phase: "write_call_or_postwrite_reinspection",
      commitReconciliationRequired: true
    });
    expect(await fixture.database.attachments.count()).toBe(0);
  }, 30_000);

  it("rejects noncanonical content and incomplete privacy acknowledgement before any write call", async () => {
    const { prepared } = await prepareLifecycle("PREWRITE");
    const create = vi.fn(repositoryPort().createAttachmentOnceWithExactUnlinkedSources);
    const repository = repositoryPort({ createAttachmentOnceWithExactUnlinkedSources: create });

    await expect(saveBaziCitationObservationLifecycleCanonicalSession({
      content: `${prepared.content} `,
      expectedSidecarSha256: prepared.sidecarSha256,
      sourceIdentities: [],
      confirmation: SAVE_CONFIRMATION
    }, storeDependencies(repository))).rejects.toMatchObject({
      code: "SIDECAR_INVALID",
      phase: "prewrite",
      commitReconciliationRequired: false
    });
    await expect(saveBaziCitationObservationLifecycleCanonicalSession({
      content: prepared.content,
      expectedSidecarSha256: prepared.sidecarSha256,
      sourceIdentities: [],
      confirmation: { ...SAVE_CONFIRMATION, plaintextFullBackupInclusionAcknowledged: false }
    }, storeDependencies(repository))).rejects.toMatchObject({
      code: "INVALID_INPUT",
      phase: "input",
      commitReconciliationRequired: false
    });
    expect(create).not.toHaveBeenCalled();
    expect(await fixture.database.attachments.count()).toBe(0);
  }, 30_000);

  it("fails closed on malicious catalog receipts and coverage limits before any content read", async () => {
    const readBytes = vi.fn(repositoryPort().readAttachmentBytes);
    const accessorSnapshot = Object.defineProperty({}, "filter", {
      enumerable: true,
      get: () => ({})
    });
    const maliciousRepository = repositoryPort({
      readAttachmentPurposeMetadataSnapshot: vi.fn(async () => accessorSnapshot),
      readAttachmentBytes: readBytes
    });
    await expect(readBaziCitationObservationLifecycleAttachmentCatalog(
      storeDependencies(maliciousRepository)
    )).rejects.toMatchObject({ code: "CATALOG_INVALID", phase: "catalog_read" });
    expect(readBytes).not.toHaveBeenCalled();

    const limitedRepository = repositoryPort({
      readAttachmentPurposeMetadataSnapshot: vi.fn(async () => {
        throw new LocalAttachmentPurposeMetadataSnapshotLimitError(
          "SCAN_ROW_LIMIT_EXCEEDED",
          "scan limit"
        );
      }),
      readAttachmentBytes: readBytes
    });
    await expect(readBaziCitationObservationLifecycleAttachmentCatalog(
      storeDependencies(limitedRepository)
    )).rejects.toMatchObject({ code: "CATALOG_LIMIT_EXCEEDED", phase: "catalog_read" });
    expect(readBytes).not.toHaveBeenCalled();

    const forgedLimitRepository = repositoryPort({
      readAttachmentPurposeMetadataSnapshot: vi.fn(async () => {
        const forged = new Error("forged scan limit");
        Object.defineProperty(forged, "code", { value: "SCAN_ROW_LIMIT_EXCEEDED" });
        throw forged;
      }),
      readAttachmentBytes: readBytes
    });
    await expect(readBaziCitationObservationLifecycleAttachmentCatalog(
      storeDependencies(forgedLimitRepository)
    )).rejects.toMatchObject({ code: "READ_FAILED", phase: "catalog_read" });
    expect(readBytes).not.toHaveBeenCalled();

    const failedRepository = repositoryPort({
      readAttachmentPurposeMetadataSnapshot: vi.fn(async () => {
        throw new Error("ordinary IndexedDB read failure");
      }),
      readAttachmentBytes: readBytes
    });
    await expect(readBaziCitationObservationLifecycleAttachmentCatalog(
      storeDependencies(failedRepository)
    )).rejects.toMatchObject({ code: "READ_FAILED", phase: "catalog_read" });
    expect(readBytes).not.toHaveBeenCalled();
  });

  it("rejects corrupted stored content and invalid UTF-8 without returning bytes or lifecycle state", async () => {
    const { prepared } = await prepareLifecycle("CORRUPT");
    const stored = await savePrepared(prepared);
    const raw = await fixture.database.attachments.get(stored.attachment.id);
    expect(raw).toBeTruthy();
    await fixture.database.attachments.put({
      ...raw!,
      contentBase64: `${raw!.contentBase64.slice(0, -4)}AAAA`
    });
    await expect(readBaziCitationObservationLifecycleOriginalBytes({
      attachment: stored.attachment,
      expectedSidecarSha256: stored.lifecycle.sidecarSha256
    }, storeDependencies())).rejects.toMatchObject({ code: "READ_FAILED", phase: "content_read" });

    await fixture.database.attachments.clear();
    const invalidUtf8 = await fixture.cases.createAttachment({
      fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
      mediaType: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_MEDIA_TYPE,
      bytes: Uint8Array.from([0xc3, 0x28]),
      description: BAZI_CITATION_OBSERVATION_LIFECYCLE_ATTACHMENT_DESCRIPTION,
      link: null
    });
    const catalog = await readBaziCitationObservationLifecycleAttachmentCatalog(storeDependencies());
    expect(catalog.items).toHaveLength(1);
    await expect(readBaziCitationObservationLifecycleOriginalBytes({
      attachment: catalog.items[0]!,
      expectedSidecarSha256: "0".repeat(64)
    }, storeDependencies())).rejects.toMatchObject({ code: "INVALID_UTF8", phase: "content_read" });
    expect(invalidUtf8.id).toBe(catalog.items[0]!.id);
  }, 30_000);

  it("full-identity deletes one current-store copy, confirms absence, and retains explicit non-recall boundaries", async () => {
    const { prepared } = await prepareLifecycle("DELETE");
    const stored = await savePrepared(prepared);
    const deleted = await deleteBaziCitationObservationLifecycleExactCopy({
      attachment: stored.attachment,
      expectedSidecarSha256: stored.lifecycle.sidecarSha256,
      confirmation: DELETE_CONFIRMATION
    }, storeDependencies());

    expect(deleted).toMatchObject({
      attachment: stored.attachment,
      lifecycle: { sidecarSha256: stored.lifecycle.sidecarSha256 },
      boundary: {
        fullIdentityCasDeleteRequested: true,
        exactPurposeSnapshotConfirmedIdAbsent: true,
        currentStoreAttachmentCopyAbsentVerified: true,
        physicalDeletionAttested: false,
        priorExportsRecalled: false,
        priorPlaintextBackupsRecalled: false,
        otherBrowserProfilesRecalled: false,
        otherDevicesRecalled: false,
        sameLedgerOtherCopiesDeleted: false,
        reviewerWithdrawalAuthorityVerified: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false
      }
    });
    expect((await readBaziCitationObservationLifecycleAttachmentCatalog(storeDependencies())).items)
      .toHaveLength(0);
  }, 30_000);

  it("marks a delete whose call committed but lost its return receipt as reconciliation required", async () => {
    const { prepared } = await prepareLifecycle("DELETE_UNKNOWN");
    const stored = await savePrepared(prepared);
    const realDelete = fixture.cases.deleteExactUnlinkedAttachment.bind(fixture.cases);
    const repository = repositoryPort({
      deleteExactUnlinkedAttachment: vi.fn(async (identity) => {
        await realDelete(identity);
        throw new Error("simulated delete return loss");
      })
    });
    await expect(deleteBaziCitationObservationLifecycleExactCopy({
      attachment: stored.attachment,
      expectedSidecarSha256: stored.lifecycle.sidecarSha256,
      confirmation: DELETE_CONFIRMATION
    }, storeDependencies(repository))).rejects.toMatchObject({
      code: "COMMIT_RECONCILIATION_REQUIRED",
      phase: "delete_call_or_postdelete_reinspection",
      commitReconciliationRequired: true
    });
    expect(await fixture.database.attachments.count()).toBe(0);
  }, 30_000);
});
