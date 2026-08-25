import Dexie from "dexie";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { inspectBaziCitationApplicabilityObservationPairLifecycleSidecar } from "@hakimi/bazi-review-context";
import {
  SCHEMA_VERSION,
  type BirthInput,
  type CaseBundle,
  type CitationRecord
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  KnowledgeRepository,
  ResearchDatabase,
  type LocalKnowledgeCitationReviewWorksetSnapshot
} from "@hakimi/storage";
import {
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PREPARATION_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS,
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
  LocalBaziCitationReviewContextReadError,
  prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting,
  prepareLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting,
  prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor,
  preflightLocalBaziCitationApplicabilityObservationComparisonFromRepositoriesForTesting,
  preflightLocalBaziCitationApplicabilityObservationFromRepositoriesForTesting,
  readLocalBaziCitationReviewContextFromRepositoriesForTesting,
  reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting,
  verifyLocalBaziCitationApplicabilityObservationPairLifecycleRoundTrip,
  type LocalBaziCitationReviewContextReadDependencies,
  type LocalBaziCitationReviewContextLocator
} from "./bazi-citation-review-context";

const SUBJECT_ID = "bazi.pillar.day.ganzhi.v1";
const FIELD_PATH = "pillars.day.ganZhi";
const CREATED_AT = "2026-08-24T10:00:00.000Z";
const CASE_ALIAS_SECRET = "FACADE_CASE_ALIAS_MUST_NOT_LEAK_410f";
const CASE_TAG_SECRET = "SECRET_TAG_410f_DO_NOT_LEAK";
const CASE_NOTES_SECRET = "FACADE_CASE_NOTES_MUST_NOT_LEAK_410f";
const BIRTH_SOURCE_SECRET = "FACADE_BIRTH_SOURCE_MUST_NOT_LEAK_410f";
const BIRTH_LOCATION_SECRET = "FACADE_BIRTH_LOCATION_MUST_NOT_LEAK_410f";
const SOURCE_QUOTE_SECRETS = [
  "FACADE_SOURCE_QUOTE_MUST_NOT_LEAK_410f_0",
  "FACADE_SOURCE_QUOTE_MUST_NOT_LEAK_410f_1"
] as const;

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
    label: BIRTH_LOCATION_SECRET,
    latitude: 31.2304,
    longitude: 121.4737,
    precision: "coordinates"
  },
  sourceNote: BIRTH_SOURCE_SECRET
};

type Fixture = Readonly<{
  database: ResearchDatabase;
  cases: CaseRepository;
  knowledge: KnowledgeRepository;
  locator: LocalBaziCitationReviewContextLocator;
  firstBundle: CaseBundle;
  currentBundle: CaseBundle;
  workset: LocalKnowledgeCitationReviewWorksetSnapshot;
}>;

let fixture: Fixture;

function releaseIdentity(database: ResearchDatabase) {
  return {
    dbGeneration: "legacy-v13" as const,
    databaseName: database.name,
    targetSchema: 13,
    migrationId: null,
    buildVersion: null,
    manifestDigest: null,
    evidenceId: null,
    evidenceBound: false,
    engineeringEvidenceOnly: true as const
  };
}

function dependencies(
  caseRepository: LocalBaziCitationReviewContextReadDependencies["caseRepository"] = fixture.cases,
  knowledgeRepository: LocalBaziCitationReviewContextReadDependencies["knowledgeRepository"] = fixture.knowledge
): LocalBaziCitationReviewContextReadDependencies {
  return {
    releaseIdentity: releaseIdentity(fixture.database),
    caseRepository,
    knowledgeRepository
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
    annotation: `facade-citation-${suffix}`,
    targets: [{ kind: "evidence_subject", subjectId: SUBJECT_ID }]
  });
  const verified: CitationRecord = {
    ...candidate,
    status: "verified",
    reviewAttestations: [
      { reviewerId: `facade-reviewer-a-${suffix}`, reviewedAt: CREATED_AT, note: "定位复核" },
      { reviewerId: `facade-reviewer-b-${suffix}`, reviewedAt: CREATED_AT, note: "引用复核" }
    ],
    decisionNote: "仅确认本机工程引用定位闭合，不构成术数真值。",
    editVersion: candidate.editVersion + 1,
    updatedAt: CREATED_AT
  };
  await fixture.database.citations.put(verified);
  return verified;
}

function completeObservationFileFromTemplate(
  templateContent: string,
  reviewerId: string,
  identityEvidenceReference: string,
  secondObservation: "not_applicable_in_bound_context" | "insufficient_bound_context",
  sentinel: string
): string {
  const file = JSON.parse(templateContent) as {
    reviewer: Record<string, unknown>;
    session: Record<string, unknown>;
    observations: Array<Record<string, unknown>>;
    declaredCounts: Record<string, number>;
  };
  Object.assign(file.reviewer, {
    reviewerId,
    displayName: `DISPLAY_${sentinel}`,
    affiliation: `AFFILIATION_${sentinel}`,
    expertiseStatement: `EXPERTISE_${sentinel}`,
    identityEvidenceReference
  });
  Object.assign(file.session, {
    observedAt: "2026-08-24T13:00:00.000Z",
    methodology: `METHODOLOGY_${sentinel}`,
    traditionScope: `TRADITION_${sentinel}`,
    generalNotes: `NOTES_${sentinel}`
  });
  Object.assign(file.observations[0]!, {
    observation: "applicable_in_bound_context",
    reason: `REASON_0_${sentinel}`,
    applicabilityConditions: `CONDITION_0_${sentinel}`,
    counterexamples: `COUNTEREXAMPLE_0_${sentinel}`,
    additionalSourceUrls: [`https://example.com/${sentinel}/0`]
  });
  Object.assign(file.observations[1]!, {
    observation: secondObservation,
    reason: `REASON_1_${sentinel}`,
    applicabilityConditions: `CONDITION_1_${sentinel}`,
    counterexamples: `COUNTEREXAMPLE_1_${sentinel}`,
    additionalSourceUrls: [`https://example.com/${sentinel}/1`]
  });
  Object.assign(file.declaredCounts, {
    total: 2,
    unobserved: 0,
    applicableInBoundContext: 1,
    partiallyApplicableInBoundContext: 0,
    notApplicableInBoundContext: secondObservation === "not_applicable_in_bound_context" ? 1 : 0,
    insufficientBoundContext: secondObservation === "insufficient_bound_context" ? 1 : 0
  });
  return JSON.stringify(file);
}

function recursivelyCollectedKeys(value: unknown, result = new Set<string>()): Set<string> {
  if (value === null || typeof value !== "object") return result;
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    result.add(key);
    if ("value" in descriptor) recursivelyCollectedKeys(descriptor.value, result);
  }
  return result;
}

function expectDeeplyFrozen(value: unknown, seen = new Set<object>()): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) expectDeeplyFrozen(descriptor.value, seen);
  }
}

async function prepareLifecycleSidecar(suffix: string) {
  const displayed = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
    fixture.locator,
    dependencies()
  );
  const template = await prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
    fixture.locator,
    displayed.context.integrity.payloadSha256,
    dependencies()
  );
  const rawA = completeObservationFileFromTemplate(
    template.content,
    `facade-lifecycle-${suffix}-reviewer-a`,
    `facade-lifecycle-${suffix}-identity-a`,
    "not_applicable_in_bound_context",
    `LIFECYCLE_${suffix}_A_SENTINEL`
  );
  const rawB = completeObservationFileFromTemplate(
    template.content,
    `facade-lifecycle-${suffix}-reviewer-b`,
    `facade-lifecycle-${suffix}-identity-b`,
    "insufficient_bound_context",
    `LIFECYCLE_${suffix}_B_SENTINEL`
  );
  const prepared = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
    fixture.locator,
    displayed.context.integrity.payloadSha256,
    rawA,
    rawB,
    dependencies()
  );
  return { displayed, prepared };
}

beforeAll(async () => {
  const database = new ResearchDatabase(
    `hakimi-web-bazi-citation-review-context-${crypto.randomUUID()}`,
    { targetSchema: 13 }
  );
  const cases = new CaseRepository(database, () => CREATED_AT);
  const knowledge = new KnowledgeRepository(database, () => CREATED_AT);
  fixture = {
    database,
    cases,
    knowledge,
    locator: null as never,
    firstBundle: null as never,
    currentBundle: null as never,
    workset: null as never
  };

  const chart = await calculateChart(birthInput, WORKING_DEFAULT_RULE_PROFILE);
  const created = await cases.createCase({
    alias: CASE_ALIAS_SECRET,
    tags: [CASE_TAG_SECRET],
    notes: CASE_NOTES_SECRET,
    calculated: chart
  });
  const firstBundle = structuredClone(await cases.getCase(created.caseRecord.id))!;

  const laterChart = await calculateChart(
    { ...birthInput, time: "09:26" },
    WORKING_DEFAULT_RULE_PROFILE
  );
  await cases.addRevision(created.caseRecord.id, laterChart);
  const currentBundle = structuredClone(await cases.getCase(created.caseRecord.id))!;

  const content = ["facade-source-intro", "# Sources", ...SOURCE_QUOTE_SECRETS].join("\n");
  const document = await knowledge.createDocument({
    title: "facade-source-title",
    author: "local-fixture",
    edition: "test-only",
    sourceNote: "facade-source-note",
    fileName: "facade-source.md",
    format: "markdown",
    content,
    byteSize: new TextEncoder().encode(content).byteLength
  });
  await createVerifiedCitation(document.id, 3, "0");
  await createVerifiedCitation(document.id, 4, "1");
  const workset = await knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(SUBJECT_ID);

  fixture = {
    database,
    cases,
    knowledge,
    locator: {
      caseId: created.caseRecord.id,
      revisionId: created.revisions[0]!.id,
      evidenceSubjectId: SUBJECT_ID,
      fieldPath: FIELD_PATH
    },
    firstBundle,
    currentBundle,
    workset
  };
});

afterAll(async () => {
  const databaseName = fixture.database.name;
  fixture.database.close();
  await Dexie.delete(databaseName);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("local Bazi citation review context repository facade", () => {
  it("performs two real v13 reads with second-pass workset CAS and returns a minimized locator-bound receipt", async () => {
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );

    const result = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies()
    );

    expect(caseRead).toHaveBeenCalledTimes(2);
    expect(caseRead).toHaveBeenNthCalledWith(1, fixture.locator.caseId);
    expect(caseRead).toHaveBeenNthCalledWith(2, fixture.locator.caseId);
    expect(worksetRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenNthCalledWith(1, SUBJECT_ID, {});
    expect(worksetRead).toHaveBeenNthCalledWith(2, SUBJECT_ID, {
      expectedWorksetSnapshotSha256: fixture.workset.worksetSnapshot.snapshotSha256
    });
    expect(result.repositoryReadBinding).toMatchObject({
      databaseName: fixture.database.name,
      targetSchemaVersion: 13,
      caseBundleReadPasses: 2,
      knowledgeWorksetReadPasses: 2,
      secondWorksetReadUsedExpectedDigest: true,
      worksetSnapshotSha256: fixture.workset.worksetSnapshot.snapshotSha256,
      expectedPriorContextPayloadSha256: null,
      expectedPriorContextMatched: null
    });
    expect(result.repositoryReadBinding.secondContextPayloadSha256)
      .toBe(result.repositoryReadBinding.firstContextPayloadSha256);
    expect(result.releaseModuleBinding).toMatchObject({
      dbGeneration: "legacy-v13",
      databaseName: fixture.database.name,
      targetSchema: 13,
      migrationId: null,
      expectedLegacyTupleMatched: true,
      engineeringEvidenceOnly: true
    });
    expect(result.boundary).toMatchObject({
      locatorOnlyCallerInput: true,
      fullCaseOrRevisionAcceptedFromCaller: false,
      fullWorksetAcceptedFromCaller: false,
      storageReadPerformed: true,
      firstPassDiscardedBeforeReturn: true,
      returnedContextBuiltFromSecondPass: true,
      worksetDigestFreshnessRevalidatedBetweenPasses: true,
      currentAtReturnAttested: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      rawBirthInputCopied: false,
      caseAliasTagsNotesCopied: false,
      sourceTextReturned: false,
      localSourceTextProcessedTransiently: true,
      storageMutationPerformed: false,
      expertTruthClaimed: false,
      formalActivationAllowed: false,
      result: null
    });

    const serialized = JSON.stringify(result);
    for (const secret of [
      CASE_ALIAS_SECRET,
      CASE_TAG_SECRET,
      CASE_NOTES_SECRET,
      BIRTH_SOURCE_SECRET,
      BIRTH_LOCATION_SECRET,
      birthInput.date,
      birthInput.time,
      birthInput.timeZone,
      ...SOURCE_QUOTE_SECRETS
    ]) {
      expect(serialized).not.toContain(secret);
    }
    const keys = recursivelyCollectedKeys(result);
    for (const forbiddenKey of [
      "alias",
      "tags",
      "notes",
      "input",
      "calendarType",
      "date",
      "time",
      "timeZone",
      "sex",
      "location",
      "sourceNote",
      "quote"
    ]) {
      expect(keys.has(forbiddenKey), forbiddenKey).toBe(false);
    }

    caseRead.mockRestore();
    worksetRead.mockRestore();
  });

  it("rejects release and repository identity mismatches before either repository is read", async () => {
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );
    const invalidRelease = dependencies();
    invalidRelease.releaseIdentity = {
      ...invalidRelease.releaseIdentity,
      targetSchema: 14
    };
    await expect(readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      invalidRelease
    )).rejects.toMatchObject({ code: "RELEASE_IDENTITY_MISMATCH" });

    const distinctDatabaseDescriptor = {
      name: fixture.database.name,
      targetSchemaVersion: 13,
      verno: 13,
      isOpen: () => true
    };
    await expect(readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies(fixture.cases, {
        database: distinctDatabaseDescriptor,
        readLocalKnowledgeCitationReviewWorksetSnapshot: worksetRead
      })
    )).rejects.toMatchObject({ code: "REPOSITORY_IDENTITY_MISMATCH" });

    expect(caseRead).not.toHaveBeenCalled();
    expect(worksetRead).not.toHaveBeenCalled();
    caseRead.mockRestore();
    worksetRead.mockRestore();
  });

  it("rejects locator or option accessors and future option fields before repository reads without invoking getters", async () => {
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );
    const locatorGetter = vi.fn(() => FIELD_PATH);
    const accessorLocator = { ...fixture.locator };
    Object.defineProperty(accessorLocator, "fieldPath", {
      enumerable: true,
      configurable: true,
      get: locatorGetter
    });
    await expect(readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      accessorLocator,
      dependencies()
    )).rejects.toMatchObject({ code: "INVALID_LOCATOR" });

    const optionGetter = vi.fn(() => fixture.workset.worksetSnapshot.snapshotSha256);
    const accessorOptions = {};
    Object.defineProperty(accessorOptions, "expectedPriorContextPayloadSha256", {
      enumerable: true,
      configurable: true,
      get: optionGetter
    });
    await expect(readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies(),
      accessorOptions
    )).rejects.toMatchObject({ code: "INVALID_OPTIONS" });

    await expect(readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies(),
      { futureOption: "forbidden" } as never
    )).rejects.toMatchObject({ code: "INVALID_OPTIONS" });

    expect(locatorGetter).not.toHaveBeenCalled();
    expect(optionGetter).not.toHaveBeenCalled();
    expect(caseRead).not.toHaveBeenCalled();
    expect(worksetRead).not.toHaveBeenCalled();
    caseRead.mockRestore();
    worksetRead.mockRestore();
  });

  it("fails closed when the caller's prior context digest is stale after two successful reads", async () => {
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );

    await expect(readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies(),
      { expectedPriorContextPayloadSha256: "0".repeat(64) }
    )).rejects.toMatchObject({ code: "PRIOR_CONTEXT_STALE" });

    expect(caseRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenNthCalledWith(2, SUBJECT_ID, {
      expectedWorksetSnapshotSha256: fixture.workset.worksetSnapshot.snapshotSha256
    });
    caseRead.mockRestore();
    worksetRead.mockRestore();
  });

  it("fails closed when two individually valid case reads produce different context payloads", async () => {
    const caseRead = vi.fn()
      .mockResolvedValueOnce(structuredClone(fixture.firstBundle))
      .mockResolvedValueOnce(structuredClone(fixture.currentBundle));
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );

    let caught: unknown;
    try {
      await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
        fixture.locator,
        dependencies({
          database: fixture.database,
          getCase: caseRead
        })
      );
    } catch (cause) {
      caught = cause;
    }

    expect(caught).toBeInstanceOf(LocalBaziCitationReviewContextReadError);
    expect(caught).toMatchObject({ code: "CONTEXT_CHANGED_DURING_READ" });
    expect(caseRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenNthCalledWith(2, SUBJECT_ID, {
      expectedWorksetSnapshotSha256: fixture.workset.worksetSnapshot.snapshotSha256
    });
    worksetRead.mockRestore();
  });

  it("rereads the displayed context before producing a minimized local observation template", async () => {
    const displayed = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies()
    );
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );

    const prepared = await prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      dependencies()
    );

    expect(caseRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenCalledTimes(2);
    expect(prepared.profile).toBe(LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE);
    expect(prepared.fileName).toBe("hakimi-bazi-citation-applicability-observation-v01.json");
    expect(prepared.binding).toEqual({
      caseId: fixture.locator.caseId,
      revisionId: fixture.locator.revisionId,
      evidenceSubjectId: SUBJECT_ID,
      fieldPath: FIELD_PATH,
      contextPayloadSha256: displayed.context.integrity.payloadSha256,
      displayContextBindingSha256: displayed.context.displayContextBinding.payloadSha256,
      worksetSnapshotSha256: displayed.context.worksetBinding.worksetSnapshotSha256,
      matchingSourceSetSha256: displayed.context.worksetBinding.matchingSourceSetSha256,
      citationCount: 2
    });
    expect(prepared.boundary).toMatchObject({
      contextFreshRereadPerformed: true,
      priorDisplayedContextDigestMatched: true,
      sourceTextIncluded: false,
      fieldValueIncluded: false,
      rawBirthInputIncluded: false,
      storageMutationPerformed: false,
      mutationEpochBypassed: false,
      publicExportAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      automaticPromotionAllowed: false
    });
    const serialized = JSON.stringify(prepared);
    for (const secret of [
      CASE_ALIAS_SECRET,
      CASE_TAG_SECRET,
      CASE_NOTES_SECRET,
      BIRTH_SOURCE_SECRET,
      BIRTH_LOCATION_SECRET,
      birthInput.date,
      birthInput.time,
      ...SOURCE_QUOTE_SECRETS
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(Object.isFrozen(prepared)).toBe(true);
    caseRead.mockRestore();
    worksetRead.mockRestore();
  });

  it("preflights a filled observation against a fresh reread and returns no freeform observation prose", async () => {
    const displayed = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies()
    );
    const prepared = await prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      dependencies()
    );
    const file = JSON.parse(prepared.content) as {
      reviewer: Record<string, unknown>;
      session: Record<string, unknown>;
      observations: Array<Record<string, unknown>>;
      declaredCounts: Record<string, number>;
    };
    Object.assign(file.reviewer, {
      reviewerId: "facade-local-reviewer",
      displayName: "本机观察者",
      affiliation: "独立观察",
      expertiseStatement: "自述专业范围；现实身份未核验。",
      identityEvidenceReference: "local-identity-record:facade-reviewer"
    });
    Object.assign(file.session, {
      observedAt: "2026-08-24T13:00:00.000Z",
      methodology: "逐条查看当前有界摘录。",
      traditionScope: "当前候选范围。",
      generalNotes: "GENERAL_NOTES_MUST_NOT_RETURN_TO_UI"
    });
    Object.assign(file.observations[0]!, {
      observation: "applicable_in_bound_context",
      reason: "OBSERVATION_REASON_MUST_NOT_RETURN_TO_UI",
      applicabilityConditions: "OBSERVATION_CONDITION_MUST_NOT_RETURN_TO_UI",
      counterexamples: "OBSERVATION_COUNTEREXAMPLE_MUST_NOT_RETURN_TO_UI"
    });
    Object.assign(file.observations[1]!, {
      observation: "insufficient_bound_context",
      reason: "SECOND_REASON_MUST_NOT_RETURN_TO_UI"
    });
    Object.assign(file.declaredCounts, {
      total: 2,
      unobserved: 0,
      applicableInBoundContext: 1,
      partiallyApplicableInBoundContext: 0,
      notApplicableInBoundContext: 0,
      insufficientBoundContext: 1
    });

    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );
    const projection = await preflightLocalBaziCitationApplicabilityObservationFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      JSON.stringify(file),
      dependencies()
    );

    expect(caseRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenCalledTimes(2);
    expect(Object.keys(projection).sort()).toEqual([
      "profile",
      "binding",
      "reviewer",
      "counts",
      "observedCount",
      "allCitationsObserved",
      "reviewerAttributionComplete",
      "recordSha256",
      "boundary"
    ].sort());
    expect(Object.keys(projection.reviewer).sort()).toEqual([
      "reviewerId",
      "displayName",
      "affiliation",
      "identityVerified"
    ].sort());
    expect(Object.keys(projection.counts).sort()).toEqual([
      "total",
      "unobserved",
      "applicableInBoundContext",
      "partiallyApplicableInBoundContext",
      "notApplicableInBoundContext",
      "insufficientBoundContext"
    ].sort());
    expect(Object.keys(projection.boundary).sort()).toEqual([
      "contextFreshRereadPerformed",
      "priorDisplayedContextDigestMatched",
      "suppliedCurrentContextDigestMatched",
      "freeformObservationTextReturnedToUi",
      "identityVerified",
      "humanReviewAuthenticityVerified",
      "chartApplicabilityAssessed",
      "citationSemanticApplicabilityAssessed",
      "eligibleForFormalActivation",
      "automaticPromotionAllowed",
      "storageMutationPerformed",
      "mutationEpochBypassed",
      "publicExportAuthorized",
      "expertTruthClaimed",
      "scientificValidityClaimed"
    ].sort());
    expect(projection).toMatchObject({
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
      reviewer: {
        reviewerId: "facade-local-reviewer",
        displayName: "本机观察者",
        affiliation: "独立观察",
        identityVerified: false
      },
      counts: {
        total: 2,
        unobserved: 0,
        applicableInBoundContext: 1,
        partiallyApplicableInBoundContext: 0,
        notApplicableInBoundContext: 0,
        insufficientBoundContext: 1
      },
      observedCount: 2,
      allCitationsObserved: true,
      reviewerAttributionComplete: true,
      boundary: {
        contextFreshRereadPerformed: true,
        priorDisplayedContextDigestMatched: true,
        suppliedCurrentContextDigestMatched: true,
        freeformObservationTextReturnedToUi: false,
        identityVerified: false,
        humanReviewAuthenticityVerified: false,
        chartApplicabilityAssessed: false,
        citationSemanticApplicabilityAssessed: false,
        eligibleForFormalActivation: false,
        automaticPromotionAllowed: false,
        storageMutationPerformed: false,
        mutationEpochBypassed: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false
      }
    });
    expect(projection.recordSha256).toMatch(/^[a-f0-9]{64}$/u);
    const serializedProjection = JSON.stringify(projection);
    for (const hidden of [
      "GENERAL_NOTES_MUST_NOT_RETURN_TO_UI",
      "OBSERVATION_REASON_MUST_NOT_RETURN_TO_UI",
      "OBSERVATION_CONDITION_MUST_NOT_RETURN_TO_UI",
      "OBSERVATION_COUNTEREXAMPLE_MUST_NOT_RETURN_TO_UI",
      "SECOND_REASON_MUST_NOT_RETURN_TO_UI"
    ]) {
      expect(serializedProjection).not.toContain(hidden);
    }
    expect(Object.isFrozen(projection)).toBe(true);
    caseRead.mockRestore();
    worksetRead.mockRestore();
  });

  it("fails closed instead of preparing or preflighting against a stale displayed digest", async () => {
    await expect(prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
      fixture.locator,
      "0".repeat(64),
      dependencies()
    )).rejects.toMatchObject({ code: "OBSERVATION_TEMPLATE_FAILED" });

    await expect(preflightLocalBaziCitationApplicabilityObservationFromRepositoriesForTesting(
      fixture.locator,
      "0".repeat(64),
      "{}",
      dependencies()
    )).rejects.toMatchObject({ code: "OBSERVATION_PREFLIGHT_FAILED" });
  });

  it("preflights two complete files over one fresh reread and returns an order-stable minimal comparison", async () => {
    const displayed = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies()
    );
    const prepared = await prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      dependencies()
    );
    const makeFile = (
      reviewerId: string,
      identityEvidenceReference: string,
      secondObservation: "not_applicable_in_bound_context" | "insufficient_bound_context",
      sentinel: string
    ) => {
      const file = JSON.parse(prepared.content) as {
        reviewer: Record<string, unknown>;
        session: Record<string, unknown>;
        observations: Array<Record<string, unknown>>;
        declaredCounts: Record<string, number>;
      };
      Object.assign(file.reviewer, {
        reviewerId,
        displayName: `DISPLAY_${sentinel}`,
        affiliation: `AFFILIATION_${sentinel}`,
        expertiseStatement: `EXPERTISE_${sentinel}`,
        identityEvidenceReference
      });
      Object.assign(file.session, {
        observedAt: "2026-08-24T13:00:00.000Z",
        methodology: `METHODOLOGY_${sentinel}`,
        traditionScope: `TRADITION_${sentinel}`,
        generalNotes: `NOTES_${sentinel}`
      });
      Object.assign(file.observations[0]!, {
        observation: "applicable_in_bound_context",
        reason: `REASON_0_${sentinel}`,
        applicabilityConditions: `CONDITION_0_${sentinel}`,
        counterexamples: `COUNTEREXAMPLE_0_${sentinel}`,
        additionalSourceUrls: [`https://example.com/${sentinel}/0`]
      });
      Object.assign(file.observations[1]!, {
        observation: secondObservation,
        reason: `REASON_1_${sentinel}`,
        applicabilityConditions: `CONDITION_1_${sentinel}`,
        counterexamples: `COUNTEREXAMPLE_1_${sentinel}`,
        additionalSourceUrls: [`https://example.com/${sentinel}/1`]
      });
      Object.assign(file.declaredCounts, {
        total: 2,
        unobserved: 0,
        applicableInBoundContext: 1,
        partiallyApplicableInBoundContext: 0,
        notApplicableInBoundContext: secondObservation === "not_applicable_in_bound_context" ? 1 : 0,
        insufficientBoundContext: secondObservation === "insufficient_bound_context" ? 1 : 0
      });
      return JSON.stringify(file);
    };
    const rawA = makeFile(
      "facade-reviewer-a",
      "identity-reference-a",
      "not_applicable_in_bound_context",
      "PAIR_A_SENTINEL"
    );
    const rawB = makeFile(
      "facade-reviewer-b",
      "identity-reference-b",
      "insufficient_bound_context",
      "PAIR_B_SENTINEL"
    );
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );

    const projection = await preflightLocalBaziCitationApplicabilityObservationComparisonFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      rawA,
      rawB,
      dependencies()
    );
    expect(caseRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenCalledTimes(2);
    caseRead.mockClear();
    worksetRead.mockClear();
    const swapped = await preflightLocalBaziCitationApplicabilityObservationComparisonFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      rawB,
      rawA,
      dependencies()
    );
    expect(caseRead).toHaveBeenCalledTimes(2);
    expect(worksetRead).toHaveBeenCalledTimes(2);
    expect(projection).toEqual(swapped);
    expect(projection.profile).toBe(
      LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE
    );
    expect(Object.keys(projection).sort()).toEqual([
      "profile",
      "binding",
      "records",
      "items",
      "counts",
      "distinctness",
      "recordSetSha256",
      "boundary"
    ].sort());
    expect(projection.binding).toMatchObject({
      caseId: fixture.locator.caseId,
      revisionId: fixture.locator.revisionId,
      evidenceSubjectId: SUBJECT_ID,
      fieldPath: FIELD_PATH,
      contextPayloadSha256: displayed.context.integrity.payloadSha256,
      citationCount: 2
    });
    expect(projection.counts).toEqual({
      total: 2,
      sameDeclaredStatus: 1,
      differentDeclaredStatus: 1
    });
    expect(projection.records[0]!.recordSha256.localeCompare(
      projection.records[1]!.recordSha256,
      "en-US"
    )).toBeLessThan(0);
    expect(projection.records.every((record) => (
      /^[a-f0-9]{64}$/u.test(record.selfDeclaredReviewerIdSha256)
      && record.allCitationsObserved
      && record.identityEvidenceReferencePresent
    ))).toBe(true);
    expect(projection.boundary).toMatchObject({
      contextFreshRereadPerformed: true,
      sameFreshContextSnapshotUsedForBoth: true,
      inputOrderAffectsProjection: false,
      freeformObservationTextReturnedToUi: false,
      identityEvidenceReferenceReturnedToUi: false,
      reviewerIndependenceVerified: false,
      semanticConflictResolutionPerformed: false,
      winnerSelectionPerformed: false,
      rankingPerformed: false,
      consensusClaimed: false,
      currentAtReturnAttested: false,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      formalActivationAllowed: false,
      automaticPromotionAllowed: false
    });
    expect(projection.recordSetSha256).toMatch(/^[a-f0-9]{64}$/u);
    const serialized = JSON.stringify(projection);
    for (const hidden of [
      "PAIR_A_SENTINEL",
      "PAIR_B_SENTINEL",
      "identity-reference-a",
      "identity-reference-b",
      "facade-reviewer-a",
      "facade-reviewer-b"
    ]) expect(serialized).not.toContain(hidden);
    expect(Object.isFrozen(projection)).toBe(true);
    caseRead.mockRestore();
    worksetRead.mockRestore();
  });

  it("prepares one deterministic sensitive pair lifecycle sidecar from the same fresh read without widening the safe comparison", async () => {
    const displayed = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies()
    );
    const template = await prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      dependencies()
    );
    const rawA = completeObservationFileFromTemplate(
      template.content,
      "facade-lifecycle-reviewer-a",
      "facade-lifecycle-identity-reference-a",
      "not_applicable_in_bound_context",
      "PAIR_LIFECYCLE_A_SENTINEL"
    );
    const rawB = completeObservationFileFromTemplate(
      template.content,
      "facade-lifecycle-reviewer-b",
      "facade-lifecycle-identity-reference-b",
      "insufficient_bound_context",
      "PAIR_LIFECYCLE_B_SENTINEL"
    );
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );

    try {
      const prepared = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
        fixture.locator,
        displayed.context.integrity.payloadSha256,
        rawA,
        rawB,
        dependencies()
      );

      expect(caseRead).toHaveBeenCalledTimes(2);
      expect(worksetRead).toHaveBeenCalledTimes(2);
      expect(prepared.profile).toBe(
        LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PREPARATION_PROFILE
      );
      expect(prepared.fileName).toBe(
        "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json"
      );
      expect(prepared.contentBytes).toBe(new TextEncoder().encode(prepared.content).byteLength);
      expect(prepared.contentBytes).toBeLessThanOrEqual(2 * 1024 * 1024);
      expect(prepared.content).toContain("PAIR_LIFECYCLE_A_SENTINEL");
      expect(prepared.content).toContain("PAIR_LIFECYCLE_B_SENTINEL");

      const safeComparisonJson = JSON.stringify(prepared.comparison);
      for (const hidden of [
        "PAIR_LIFECYCLE_A_SENTINEL",
        "PAIR_LIFECYCLE_B_SENTINEL",
        "facade-lifecycle-reviewer-a",
        "facade-lifecycle-reviewer-b",
        "facade-lifecycle-identity-reference-a",
        "facade-lifecycle-identity-reference-b"
      ]) {
        expect(safeComparisonJson).not.toContain(hidden);
      }

      const inspection = await inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
        prepared.content
      );
      expect(inspection).toMatchObject({
        recordedNotWithheldCount: 2,
        withheldRecordCount: 0,
        structurallyCompletePair: true,
        pairComparisonAllowed: false,
        currentContextChecked: false
      });
      expect(prepared.ledgerId).toBe(inspection.sidecar.ledgerId);
      expect(prepared.sidecarSha256).toBe(inspection.sidecar.integrity.sidecarSha256);
      expect(prepared.recordSetSha256).toBe(
        inspection.sidecar.contextBinding.recordSetSha256
      );
      expect(prepared.recordSetSha256).toBe(prepared.comparison.recordSetSha256);
      expect(inspection.sidecar.contextBinding.contextPayloadSha256).toBe(
        prepared.comparison.binding.contextPayloadSha256
      );
      expect(inspection.sidecar.records.map((record) => record.recordSha256)).toEqual(
        prepared.comparison.records.map((record) => record.recordSha256)
      );
      expect(prepared.boundary).toEqual({
        explicitUserPreparationActionRequired: true,
        contextFreshRereadPerformed: true,
        priorDisplayedContextDigestMatched: true,
        sameFreshContextSnapshotUsedForBoth: true,
        lifecycleSidecarCreatedAndReinspected: true,
        currentContextDigestMatchedDuringPreparation: true,
        currentAtReturnAttested: false,
        containsDerivedSensitiveChartBinding: true,
        containsUntrustedReviewerFreeformText: true,
        requiredSharePolicy: "blocked_sensitive",
        storageReadPerformed: true,
        formalStoreUsed: false,
        localFilePersistencePerformed: false,
        preparedFileDeliveryPerformed: false,
        networkTransmissionPerformed: false,
        storageMutationPerformed: false,
        chartMutationPerformed: false,
        caseOrRevisionMutationPerformed: false,
        rulePackMutationPerformed: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        reviewerWithdrawalAuthorityVerified: false,
        semanticConflictResolutionPerformed: false,
        winnerSelectionPerformed: false,
        consensusClaimed: false,
        publicExportAuthorized: false,
        publicReleaseAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        automaticPromotionAllowed: false
      });
      const expectDeeplyFrozen = (value: unknown, seen = new Set<object>()): void => {
        if (typeof value !== "object" || value === null || seen.has(value)) return;
        seen.add(value);
        expect(Object.isFrozen(value)).toBe(true);
        for (const child of Object.values(value)) expectDeeplyFrozen(child, seen);
      };
      expectDeeplyFrozen(prepared);
    } finally {
      caseRead.mockRestore();
      worksetRead.mockRestore();
    }
  });

  it("rejects an incomplete two-file input without returning a one-sided projection", async () => {
    const displayed = await readLocalBaziCitationReviewContextFromRepositoriesForTesting(
      fixture.locator,
      dependencies()
    );
    const prepared = await prepareLocalBaziCitationApplicabilityObservationTemplateFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      dependencies()
    );
    await expect(preflightLocalBaziCitationApplicabilityObservationComparisonFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      prepared.content,
      prepared.content,
      dependencies()
    )).rejects.toMatchObject({ code: "OBSERVATION_COMPARISON_PREFLIGHT_FAILED" });
  });

  it("rejects an oversized pair input before starting the fresh repository reread", async () => {
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );
    await expect(preflightLocalBaziCitationApplicabilityObservationComparisonFromRepositoriesForTesting(
      fixture.locator,
      "a".repeat(64),
      "x".repeat(512 * 1024 + 1),
      "{}",
      dependencies()
    )).rejects.toMatchObject({ code: "OBSERVATION_COMPARISON_PREFLIGHT_FAILED" });
    expect(caseRead).not.toHaveBeenCalled();
    expect(worksetRead).not.toHaveBeenCalled();
    caseRead.mockRestore();
    worksetRead.mockRestore();
  });

  it("reopens one canonical lifecycle file over one fresh reread and returns only the existing safe comparison outside private content", async () => {
    const { displayed, prepared } = await prepareLifecycleSidecar("REOPEN_SAFE");
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );
    try {
      const reopened = await reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
        fixture.locator,
        displayed.context.integrity.payloadSha256,
        [prepared.content],
        dependencies()
      );
      expect(caseRead).toHaveBeenCalledTimes(2);
      expect(worksetRead).toHaveBeenCalledTimes(2);
      expect(reopened).toMatchObject({
        profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_REOPEN_PROFILE,
        status: "current_context_matched_comparison_ready",
        fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
        ledgerId: prepared.ledgerId,
        recordSetSha256: prepared.recordSetSha256,
        sidecarSha256: prepared.sidecarSha256,
        counts: { recordedNotWithheld: 2, withheld: 0 },
        inputCount: 1,
        outputDigestFoundAmongInputs: true,
        boundary: {
          inputLifecycleFilesInspectedBeforeRepositoryRead: true,
          crossFileReconciliationPerformedBeforeRepositoryRead: true,
          oneFreshContextRereadAfterReconciliation: true,
          releaseIdentityDigestTupleMatched: true,
          contextPayloadDigestMatched: true,
          displayContextBindingDigestMatched: true,
          recordSetDigestRecomputedAgainstFreshContext: true,
          mechanicalComparisonProjectionReturned: true,
          storageMutationPerformed: false,
          networkTransmissionPerformed: false,
          mutationEpochRevalidationPerformed: false,
          mutationEpochBypassed: false,
          reviewerWithdrawalAuthorityVerified: false,
          publicReleaseAuthorized: false,
          expertTruthClaimed: false
        }
      });
      expect(reopened.comparison).not.toBeNull();
      expect(reopened.comparison?.recordSetSha256).toBe(prepared.recordSetSha256);
      expect(reopened.records.map((record) => record.recordSha256)).toEqual(
        reopened.comparison?.records.map((record) => record.recordSha256)
      );
      expect(reopened.contentBytes).toBe(new TextEncoder().encode(reopened.content).byteLength);
      expect(reopened.content).toContain("LIFECYCLE_REOPEN_SAFE_A_SENTINEL");
      const { content: privateContent, ...safeProjection } = reopened;
      expect(privateContent).toContain("LIFECYCLE_REOPEN_SAFE_B_SENTINEL");
      const safeJson = JSON.stringify(safeProjection);
      for (const hidden of [
        "LIFECYCLE_REOPEN_SAFE_A_SENTINEL",
        "LIFECYCLE_REOPEN_SAFE_B_SENTINEL",
        "facade-lifecycle-REOPEN_SAFE-reviewer-a",
        "facade-lifecycle-REOPEN_SAFE-reviewer-b",
        "facade-lifecycle-REOPEN_SAFE-identity-a",
        "facade-lifecycle-REOPEN_SAFE-identity-b"
      ]) expect(safeJson).not.toContain(hidden);
      expectDeeplyFrozen(reopened);
    } finally {
      caseRead.mockRestore();
      worksetRead.mockRestore();
    }
  });

  it("reconciles a base-prefix successor independently of input order and never returns a comparison for a withheld record", async () => {
    const { displayed, prepared } = await prepareLifecycleSidecar("PREFIX");
    const targetRecordSha256 = prepared.comparison.records[0].recordSha256;
    const successor = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
      prepared.content,
      targetRecordSha256,
      "local_user_request"
    );

    const forward = await reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      [prepared.content, successor.content],
      dependencies()
    );
    const reversed = await reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      [successor.content, prepared.content],
      dependencies()
    );
    expect(forward).toEqual(reversed);
    expect(forward).toMatchObject({
      status: "current_context_matched_withheld",
      sidecarSha256: successor.sidecarSha256,
      counts: { recordedNotWithheld: 1, withheld: 1 },
      inputCount: 2,
      outputDigestFoundAmongInputs: true,
      comparison: null,
      boundary: {
        withheldRecordsExcludedFromComparisonReadiness: true,
        mechanicalComparisonProjectionReturned: false,
        contextPayloadDigestMatched: true,
        displayContextBindingDigestMatched: true,
        recordSetDigestRecomputedAgainstFreshContext: true,
        winnerSelectionPerformed: false,
        consensusClaimed: false,
        reviewerWithdrawalAuthorityVerified: false
      }
    });
    expect(forward.records).toContainEqual({
      recordSha256: targetRecordSha256,
      state: "withheld_by_local_user"
    });
    expectDeeplyFrozen(forward);
  });

  it("merges independent record branches deterministically, creates a new digest, and remains withheld without comparison", async () => {
    const { displayed, prepared } = await prepareLifecycleSidecar("BRANCH");
    const firstSuccessor = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
      prepared.content,
      prepared.comparison.records[0].recordSha256,
      "suspected_record_error"
    );
    const secondSuccessor = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
      prepared.content,
      prepared.comparison.records[1].recordSha256,
      "privacy_request"
    );
    const forward = await reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      [firstSuccessor.content, secondSuccessor.content],
      dependencies()
    );
    const reversed = await reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
      fixture.locator,
      displayed.context.integrity.payloadSha256,
      [secondSuccessor.content, firstSuccessor.content],
      dependencies()
    );
    expect(forward).toEqual(reversed);
    expect(forward.status).toBe("current_context_matched_withheld");
    expect(forward.counts).toEqual({ recordedNotWithheld: 0, withheld: 2 });
    expect(forward.records.every((record) => record.state === "withheld_by_local_user")).toBe(true);
    expect(forward.outputDigestFoundAmongInputs).toBe(false);
    expect(forward.sidecarSha256).not.toBe(firstSuccessor.sidecarSha256);
    expect(forward.sidecarSha256).not.toBe(secondSuccessor.sidecarSha256);
    expect(forward.comparison).toBeNull();
  });

  it("fails stale-context reopen after exactly one fresh two-pass read", async () => {
    const { prepared } = await prepareLifecycleSidecar("STALE");
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );
    try {
      await expect(reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
        fixture.locator,
        "0".repeat(64),
        [prepared.content],
        dependencies()
      )).rejects.toMatchObject({ code: "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED" });
      expect(caseRead).toHaveBeenCalledTimes(2);
      expect(worksetRead).toHaveBeenCalledTimes(2);
    } finally {
      caseRead.mockRestore();
      worksetRead.mockRestore();
    }
  });

  it("rejects ledger mismatch, event forks, seventeen files, and size excess before any repository read", async () => {
    const first = await prepareLifecycleSidecar("FAIL_A");
    const second = await prepareLifecycleSidecar("FAIL_B");
    const forkTarget = first.prepared.comparison.records[0].recordSha256;
    const forkA = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
      first.prepared.content,
      forkTarget,
      "local_user_request"
    );
    const forkB = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
      first.prepared.content,
      forkTarget,
      "privacy_request"
    );
    const caseRead = vi.spyOn(fixture.cases, "getCase");
    const worksetRead = vi.spyOn(
      fixture.knowledge,
      "readLocalKnowledgeCitationReviewWorksetSnapshot"
    );
    const expectRejectedBeforeReads = async (texts: unknown) => {
      caseRead.mockClear();
      worksetRead.mockClear();
      await expect(reopenLocalBaziCitationApplicabilityObservationPairLifecycleFromRepositoriesForTesting(
        fixture.locator,
        first.displayed.context.integrity.payloadSha256,
        texts,
        dependencies()
      )).rejects.toMatchObject({ code: "OBSERVATION_PAIR_LIFECYCLE_REOPEN_FAILED" });
      expect(caseRead).not.toHaveBeenCalled();
      expect(worksetRead).not.toHaveBeenCalled();
    };
    try {
      await expectRejectedBeforeReads([first.prepared.content, second.prepared.content]);
      await expectRejectedBeforeReads([forkA.content, forkB.content]);
      await expectRejectedBeforeReads(Array.from({ length: 17 }, () => first.prepared.content));
      const encode = vi.spyOn(TextEncoder.prototype, "encode");
      try {
        await expectRejectedBeforeReads(["x".repeat(2 * 1024 * 1024 + 1)]);
        expect(encode).not.toHaveBeenCalled();
      } finally {
        encode.mockRestore();
      }
    } finally {
      caseRead.mockRestore();
      worksetRead.mockRestore();
    }
  });

  it("prepares only a finite-reason deterministic withholding successor and strictly verifies a matching round-trip digest", async () => {
    const { prepared } = await prepareLifecycleSidecar("WITHHOLD_ROUNDTRIP");
    expect(LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_REASONS)
      .toEqual([
        "local_user_request",
        "suspected_record_error",
        "context_superseded",
        "privacy_request",
        "other_unspecified"
      ]);
    const targetRecordSha256 = prepared.comparison.records[1].recordSha256;
    const successor = await prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
      prepared.content,
      targetRecordSha256,
      "context_superseded"
    );
    expect(successor).toMatchObject({
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_PREPARATION_PROFILE,
      fileName: "hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json",
      ledgerId: prepared.ledgerId,
      recordSetSha256: prepared.recordSetSha256,
      counts: { recordedNotWithheld: 1, withheld: 1 },
      targetRecordSha256,
      reasonCode: "context_superseded",
      boundary: {
        finiteReasonCodeRequired: true,
        terminalLocalWithholdingOnly: true,
        currentContextReadPerformed: false,
        storageReadPerformed: false,
        storageMutationPerformed: false,
        mutationEpochBypassed: false,
        reviewerWithdrawalAuthorityVerified: false,
        publicReleaseAuthorized: false
      }
    });
    expect(successor.sidecarSha256).not.toBe(prepared.sidecarSha256);
    expect(successor.contentBytes).toBe(new TextEncoder().encode(successor.content).byteLength);
    const { content: privateSuccessorContent, ...safeSuccessorProjection } = successor;
    expect(privateSuccessorContent).toContain("LIFECYCLE_WITHHOLD_ROUNDTRIP_A_SENTINEL");
    const safeSuccessorJson = JSON.stringify(safeSuccessorProjection);
    for (const hidden of [
      "LIFECYCLE_WITHHOLD_ROUNDTRIP_A_SENTINEL",
      "LIFECYCLE_WITHHOLD_ROUNDTRIP_B_SENTINEL",
      "facade-lifecycle-WITHHOLD_ROUNDTRIP-reviewer-a",
      "facade-lifecycle-WITHHOLD_ROUNDTRIP-reviewer-b",
      "facade-lifecycle-WITHHOLD_ROUNDTRIP-identity-a",
      "facade-lifecycle-WITHHOLD_ROUNDTRIP-identity-b"
    ]) expect(safeSuccessorJson).not.toContain(hidden);
    expectDeeplyFrozen(successor);

    await expect(prepareLocalBaziCitationApplicabilityObservationPairLifecycleWithholdingSuccessor(
      prepared.content,
      targetRecordSha256,
      "FREE_TEXT_REASON_MUST_BE_REJECTED"
    )).rejects.toMatchObject({ code: "OBSERVATION_PAIR_LIFECYCLE_WITHHOLDING_FAILED" });

    const verification = await verifyLocalBaziCitationApplicabilityObservationPairLifecycleRoundTrip(
      successor.content,
      successor.sidecarSha256
    );
    expect(verification).toMatchObject({
      profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_PROFILE,
      matched: true,
      sidecarSha256: successor.sidecarSha256,
      ledgerId: successor.ledgerId,
      recordSetSha256: successor.recordSetSha256,
      counts: successor.counts,
      boundary: {
        lifecycleFileStructurallyReinspected: true,
        expectedSidecarDigestMatched: true,
        digestIsDigitalSignature: false,
        byteForByteDeliveryAttested: false,
        localFilePersistenceAttested: false,
        currentContextReadPerformed: false,
        storageMutationPerformed: false,
        publicReleaseAuthorized: false
      }
    });
    expectDeeplyFrozen(verification);
    await expect(verifyLocalBaziCitationApplicabilityObservationPairLifecycleRoundTrip(
      successor.content,
      "0".repeat(64)
    )).rejects.toMatchObject({ code: "OBSERVATION_PAIR_LIFECYCLE_ROUND_TRIP_FAILED" });
  });
});
