import Dexie from "dexie";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import {
  SCHEMA_VERSION,
  type BirthInput,
  type CitationRecord
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  KnowledgeRepository,
  ResearchDatabase,
  type LocalKnowledgeCitationReviewWorksetSnapshot
} from "@hakimi/storage";
import {
  BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE,
  BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE,
  BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_FILENAME,
  BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE,
  BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
  BaziCitationApplicabilityObservationComparisonError,
  BaziCitationApplicabilityObservationError,
  BaziCitationApplicabilityObservationPairLifecycleError,
  BaziCitationReviewContextSnapshotError,
  buildBaziCitationReviewContextSnapshot,
  compareBaziCitationApplicabilityObservations,
  createBaziCitationApplicabilityObservationPairLifecycleSidecar,
  createBaziCitationApplicabilityObservationTemplate,
  evaluateBaziCitationApplicabilityObservationPairLifecycleSidecar,
  inspectBaziCitationApplicabilityObservation,
  inspectBaziCitationApplicabilityObservationPairLifecycleSidecar,
  preflightBaziCitationApplicabilityObservation,
  reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars,
  serializeBaziCitationApplicabilityObservationPairLifecycleSidecar,
  serializeBaziCitationApplicabilityObservationTemplate,
  validateBaziCitationReviewContextSnapshot,
  withholdBaziCitationApplicabilityObservationPairLifecycleRecord,
  type BaziCitationApplicabilityObservationEnvelope,
  type BaziCitationApplicabilityObservationStatus,
  type BaziCitationReviewContextSnapshot,
  type BuildBaziCitationReviewContextSnapshotInput
} from "./index";

const SUBJECT_ID = "bazi.pillar.day.ganzhi.v1";
const FIELD_PATH = "pillars.day.ganZhi";
const CREATED_AT = "2026-08-24T08:00:00.000Z";
const CASE_ALIAS_SECRET = "CASE_ALIAS_MUST_NOT_LEAK_7d20";
const CASE_TAG_SECRET = "CASE_TAG_MUST_NOT_LEAK_7d20";
const CASE_NOTES_SECRET = "CASE_NOTES_MUST_NOT_LEAK_7d20";
const BIRTH_SOURCE_SECRET = "BIRTH_SOURCE_MUST_NOT_LEAK_7d20";
const BIRTH_LOCATION_SECRET = "BIRTH_LOCATION_MUST_NOT_LEAK_7d20";

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

type DeepMutable<T> = T extends readonly (infer Item)[]
  ? DeepMutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
    : T;

type CitationFixtureStatus = "candidate" | "verified";
type MutableWorkset = DeepMutable<LocalKnowledgeCitationReviewWorksetSnapshot>;

const CONTEXT_ERROR_CODES = new Set([
  "INVALID_INPUT",
  "RELEASE_IDENTITY_MISMATCH",
  "WORKSET_MISMATCH",
  "REVIEW_GATE_BLOCKED",
  "CASE_REVISION_MISMATCH",
  "REVISION_REPLAY_BLOCKED",
  "FIELD_CONTEXT_MISMATCH",
  "RULE_CONTEXT_MISMATCH",
  "CONTEXT_BUILD_FAILED",
  "SNAPSHOT_MISMATCH"
]);

const databases: ResearchDatabase[] = [];

function mutableClone<T>(value: T): DeepMutable<T> {
  return structuredClone(value) as DeepMutable<T>;
}

function withoutKey(value: object, key: string): Record<string, unknown> {
  const clone = { ...(value as Record<string, unknown>) };
  delete clone[key];
  return clone;
}

async function resignCoordinatedWorkset(workset: MutableWorkset): Promise<void> {
  workset.packet.integrity.payloadSha256 = await sha256Hex(withoutKey(workset.packet, "integrity"));
  workset.inventory.binding.retrievalPayloadSha256 = workset.packet.integrity.payloadSha256;
  workset.storageSnapshot.bindings.packetPayloadSha256 = workset.packet.integrity.payloadSha256;
  workset.worksetSnapshot.packetBinding.payloadSha256 = workset.packet.integrity.payloadSha256;

  workset.inventory.integrity.payloadSha256 = await sha256Hex({
    domain: workset.inventory.profile.digestDomain,
    payload: withoutKey(workset.inventory, "integrity")
  });
  workset.worksetSnapshot.inventoryBinding.payloadSha256 = workset.inventory.integrity.payloadSha256;

  workset.storageSnapshot.snapshotSha256 = await sha256Hex({
    domain: workset.storageSnapshot.profile.digestDomain,
    payload: withoutKey(workset.storageSnapshot, "snapshotSha256")
  });
  workset.worksetSnapshot.storageBinding.snapshotSha256 = workset.storageSnapshot.snapshotSha256;

  workset.worksetSnapshot.snapshotSha256 = await sha256Hex({
    domain: workset.worksetSnapshot.profile.digestDomain,
    payload: withoutKey(workset.worksetSnapshot, "snapshotSha256")
  });
}

async function expectFiniteContextError(promise: Promise<unknown>): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (cause) {
    caught = cause;
  }
  expect(caught).toBeInstanceOf(BaziCitationReviewContextSnapshotError);
  expect(CONTEXT_ERROR_CODES.has((caught as BaziCitationReviewContextSnapshotError).code)).toBe(true);
}

function recursivelyCollectedKeys(value: unknown, result = new Set<string>()): Set<string> {
  if (value === null || typeof value !== "object") return result;
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    result.add(key);
    if ("value" in descriptor) recursivelyCollectedKeys(descriptor.value, result);
  }
  return result;
}

function expectDeepFrozen(value: unknown, visited = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || visited.has(value)) return;
  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) expectDeepFrozen(descriptor.value, visited);
  }
}

function createRepositories(suffix: string) {
  const database = new ResearchDatabase(
    `hakimi-bazi-review-context-${suffix}-${crypto.randomUUID()}`,
    { targetSchema: 13 }
  );
  databases.push(database);
  return {
    database,
    cases: new CaseRepository(database),
    knowledge: new KnowledgeRepository(database, () => CREATED_AT)
  };
}

async function createVerifiedCitation(
  database: ResearchDatabase,
  knowledge: KnowledgeRepository,
  documentId: string,
  lineNumber: number,
  suffix: string
): Promise<CitationRecord> {
  const candidate = await knowledge.createCitation({
    documentId,
    locator: { sectionId: "section-2", startLine: lineNumber, endLine: lineNumber },
    annotation: `citation-annotation-${suffix}`,
    targets: [{ kind: "evidence_subject", subjectId: SUBJECT_ID }]
  });
  const verified: CitationRecord = {
    ...candidate,
    status: "verified",
    reviewAttestations: [
      { reviewerId: `reviewer-a-${suffix}`, reviewedAt: CREATED_AT, note: "定位复核" },
      { reviewerId: `reviewer-b-${suffix}`, reviewedAt: CREATED_AT, note: "引用复核" }
    ],
    decisionNote: "仅确认本机工程引用定位闭合，不构成术数真值。",
    editVersion: candidate.editVersion + 1,
    updatedAt: CREATED_AT
  };
  await database.citations.put(verified);
  return verified;
}

async function createWorkset(
  statuses: readonly CitationFixtureStatus[],
  suffix: string
): Promise<LocalKnowledgeCitationReviewWorksetSnapshot> {
  const { database, knowledge } = createRepositories(`workset-${suffix}`);
  const sourceQuoteSecrets = statuses.map((_, index) => `SOURCE_QUOTE_MUST_NOT_LEAK_${suffix}_${index}`);
  const content = [
    `source-intro-${suffix}`,
    "# Sources",
    ...sourceQuoteSecrets
  ].join("\n");
  const document = await knowledge.createDocument({
    title: `source-title-${suffix}`,
    author: "local-fixture",
    edition: "test-only",
    sourceNote: `source-note-${suffix}`,
    fileName: `source-${suffix}.md`,
    format: "markdown",
    content,
    byteSize: new TextEncoder().encode(content).byteLength
  });
  for (let index = 0; index < statuses.length; index += 1) {
    const status = statuses[index]!;
    if (status === "verified") {
      await createVerifiedCitation(database, knowledge, document.id, index + 3, `${suffix}-${index}`);
    } else {
      await knowledge.createCitation({
        documentId: document.id,
        locator: { sectionId: "section-2", startLine: index + 3, endLine: index + 3 },
        annotation: `candidate-annotation-${suffix}-${index}`,
        targets: [{ kind: "evidence_subject", subjectId: SUBJECT_ID }]
      });
    }
  }
  return knowledge.readLocalKnowledgeCitationReviewWorksetSnapshot(SUBJECT_ID);
}

type Fixture = Readonly<{
  input: BuildBaziCitationReviewContextSnapshotInput;
  revisedInput: BuildBaziCitationReviewContextSnapshotInput;
  alternateWorkset: LocalKnowledgeCitationReviewWorksetSnapshot;
  oneVerifiedWorkset: LocalKnowledgeCitationReviewWorksetSnapshot;
  candidateWorkset: LocalKnowledgeCitationReviewWorksetSnapshot;
}>;

let fixture: Fixture;

beforeAll(async () => {
  const { cases } = createRepositories("case");
  const firstChart = await calculateChart(birthInput, WORKING_DEFAULT_RULE_PROFILE);
  const created = await cases.createCase({
    alias: CASE_ALIAS_SECRET,
    tags: [CASE_TAG_SECRET],
    notes: CASE_NOTES_SECRET,
    calculated: firstChart
  });
  const firstCaseRecord = structuredClone(created.caseRecord);
  const firstRevision = structuredClone(created.revisions[0]!);
  const baseWorkset = await createWorkset(["verified", "verified"], "base");

  const secondChart = await calculateChart(
    { ...birthInput, time: "09:26" },
    WORKING_DEFAULT_RULE_PROFILE
  );
  const revised = await cases.addRevision(created.caseRecord.id, secondChart);
  const secondRevision = revised.revisions[1]!;
  const selection = {
    caseId: firstCaseRecord.id,
    revisionId: firstRevision.id,
    evidenceSubjectId: SUBJECT_ID,
    fieldPath: FIELD_PATH
  };
  const input: BuildBaziCitationReviewContextSnapshotInput = {
    releaseIdentity: { dbGeneration: "legacy-v13", targetSchema: 13, migrationId: null },
    selection,
    caseRecord: firstCaseRecord,
    revision: firstRevision,
    workset: baseWorkset
  };
  const revisedInput: BuildBaziCitationReviewContextSnapshotInput = {
    ...input,
    selection: { ...selection, revisionId: secondRevision.id },
    caseRecord: revised.caseRecord,
    revision: secondRevision
  };
  fixture = {
    input,
    revisedInput,
    alternateWorkset: await createWorkset(["verified", "verified"], "alternate"),
    oneVerifiedWorkset: await createWorkset(["verified"], "one-verified"),
    candidateWorkset: await createWorkset(["verified", "verified", "candidate"], "candidate")
  };
});

afterAll(async () => {
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("Bazi citation review context snapshot", () => {
  it("builds and validates an exact replay with digest-bound, minimized and deeply frozen projections", async () => {
    const first = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const second = await buildBaziCitationReviewContextSnapshot(fixture.input);

    expect(second).toEqual(first);
    await expect(validateBaziCitationReviewContextSnapshot(first, fixture.input)).resolves.toEqual(first);
    expect(Object.keys(first).sort()).toEqual([
      "boundary",
      "caseBinding",
      "displayContextBinding",
      "factProjection",
      "integrity",
      "profile",
      "releaseBinding",
      "revisionBinding",
      "ruleProjection",
      "subjectBinding",
      "worksetBinding"
    ]);
    expect(first.releaseBinding).toEqual({
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      callerProvidedExpectedValuesMatched: true,
      runtimeReleaseIdentityAttested: false,
      storageAttestedDbGeneration: false,
      storageAttestedMigrationIdentity: false,
      engineeringEvidenceOnly: true
    });
    expect(first.caseBinding).toEqual({
      caseId: fixture.input.caseRecord.id,
      deletedInSuppliedCaseSnapshot: false,
      selectedRevisionWasLatestInSuppliedCaseSnapshot: true,
      repositoryFreshnessAttested: false
    });
    expect(first.revisionBinding).toMatchObject({
      revisionId: fixture.input.revision.id,
      storedResultHash: fixture.input.revision.manifest.resultHash,
      replayedResultHash: fixture.input.revision.manifest.resultHash
    });
    const selectedProvenance = fixture.input.revision.facts.fieldProvenance.find(
      (item) => item.field === FIELD_PATH
    )!;
    expect(first.factProjection.items).toEqual([{
      fieldPath: FIELD_PATH,
      value: fixture.input.revision.facts.pillars.day.ganZhi,
      provenance: {
        field: selectedProvenance.field,
        kind: selectedProvenance.kind,
        algorithmId: selectedProvenance.algorithmId,
        verificationStatus: selectedProvenance.verificationStatus
      }
    }]);
    expect(Object.keys(first.factProjection.items[0]!.provenance).sort()).toEqual([
      "algorithmId",
      "field",
      "kind",
      "verificationStatus"
    ]);
    expect(first.ruleProjection).toMatchObject({
      profileId: fixture.input.revision.ruleProfile.profileId,
      profileVersion: fixture.input.revision.ruleProfile.profileVersion,
      profileStatus: fixture.input.revision.ruleProfile.status,
      ruleProfileDigest: fixture.input.revision.manifest.ruleProfileDigest,
      liveActiveRulePackReadPerformed: false,
      items: [{
        ruleProfilePath: "calendar.dayBoundary",
        value: fixture.input.revision.ruleProfile.calendar.dayBoundary
      }]
    });
    expect(first.worksetBinding).toEqual({
      worksetSnapshotVersion: fixture.input.workset.worksetSnapshot.profile.snapshotVersion,
      worksetSnapshotSha256: fixture.input.workset.worksetSnapshot.snapshotSha256,
      suppliedStorageSidecarSnapshotVersion: fixture.input.workset.storageSnapshot.profile.snapshotVersion,
      suppliedStorageSidecarSnapshotSha256: fixture.input.workset.storageSnapshot.snapshotSha256,
      packetProjectionVersion: fixture.input.workset.packet.profile.projectionVersion,
      packetPayloadSha256: fixture.input.workset.packet.integrity.payloadSha256,
      matchingSourceSetSha256: fixture.input.workset.packet.sourceSet.matchingSourceSetSha256,
      inventoryProjectionVersion: fixture.input.workset.inventory.profile.projectionVersion,
      inventoryPayloadSha256: fixture.input.workset.inventory.integrity.payloadSha256,
      citationIdsWithStoredVerifiedStatus: fixture.input.workset.inventory.binding.verifiedCitationIds,
      pairCount: 1,
      reviewGateStatus: "pending_human_review"
    });

    expect(await sha256Hex({
      domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.factProjectionDigestDomain,
      payload: first.factProjection.items
    })).toBe(first.factProjection.projectionSha256);
    expect(await sha256Hex({
      domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.ruleProjectionDigestDomain,
      payload: {
        profileId: first.ruleProjection.profileId,
        profileVersion: first.ruleProjection.profileVersion,
        profileStatus: first.ruleProjection.profileStatus,
        ruleProfileDigest: first.ruleProjection.ruleProfileDigest,
        revisionRulePackBinding: first.ruleProjection.revisionRulePackBinding,
        liveActiveRulePackReadPerformed: false,
        items: first.ruleProjection.items
      }
    })).toBe(first.ruleProjection.projectionSha256);
    expect(await sha256Hex({
      domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.displayContextBindingDigestDomain,
      payload: {
        releaseBinding: first.releaseBinding,
        caseBinding: first.caseBinding,
        revisionBinding: first.revisionBinding,
        subjectBinding: first.subjectBinding,
        factProjection: first.factProjection,
        ruleProjection: first.ruleProjection,
        worksetBinding: first.worksetBinding
      }
    })).toBe(first.displayContextBinding.payloadSha256);
    expect(await sha256Hex({
      domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.digestDomain,
      payload: withoutKey(first, "integrity")
    })).toBe(first.integrity.payloadSha256);

    const serialized = JSON.stringify(first);
    for (const forbiddenValue of [
      CASE_ALIAS_SECRET,
      CASE_TAG_SECRET,
      CASE_NOTES_SECRET,
      BIRTH_SOURCE_SECRET,
      BIRTH_LOCATION_SECRET,
      birthInput.date,
      birthInput.time,
      birthInput.timeZone,
      ...fixture.input.workset.packet.items.map((item) => item.quote)
    ]) {
      expect(serialized).not.toContain(forbiddenValue);
    }
    const keys = recursivelyCollectedKeys(first);
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
      "lunarLeapMonth",
      "sourceRefs",
      "note",
      "quote"
    ]) {
      expect(keys.has(forbiddenKey), forbiddenKey).toBe(false);
    }
    expect(first.boundary).toMatchObject({
      rawBirthInputCopied: false,
      caseAliasTagsNotesCopied: false,
      sourceTextCopiedIntoContextSnapshot: false,
      containsDerivedSensitiveChartData: true,
      crossRepositoryAtomicSnapshotVerified: false,
      worksetFreshnessRevalidatedByBuilder: false,
      mutationEpochRevalidationPerformed: false,
      expertTruthClaimed: false,
      formalActivationAllowed: false,
      result: null
    });
    expectDeepFrozen(first);
  });

  it("rejects each locally re-signed packet, inventory, storage and workset layer tamper", async () => {
    const packetTamper = mutableClone(fixture.input);
    packetTamper.workset.packet.items[0]!.quote += "-tampered";
    packetTamper.workset.packet.integrity.payloadSha256 = await sha256Hex(
      withoutKey(packetTamper.workset.packet, "integrity")
    );
    await expect(buildBaziCitationReviewContextSnapshot(packetTamper))
      .rejects.toMatchObject({ code: "WORKSET_MISMATCH" });

    const inventoryTamper = mutableClone(fixture.input);
    inventoryTamper.workset.inventory.pairs[0]!.sameDocumentId = false;
    inventoryTamper.workset.inventory.integrity.payloadSha256 = await sha256Hex({
      domain: inventoryTamper.workset.inventory.profile.digestDomain,
      payload: withoutKey(inventoryTamper.workset.inventory, "integrity")
    });
    await expect(buildBaziCitationReviewContextSnapshot(inventoryTamper))
      .rejects.toMatchObject({ code: "WORKSET_MISMATCH" });

    const storageTamper = mutableClone(fixture.input);
    storageTamper.workset.storageSnapshot.target.registryVersion += "-tampered";
    storageTamper.workset.storageSnapshot.snapshotSha256 = await sha256Hex({
      domain: storageTamper.workset.storageSnapshot.profile.digestDomain,
      payload: withoutKey(storageTamper.workset.storageSnapshot, "snapshotSha256")
    });
    await expect(buildBaziCitationReviewContextSnapshot(storageTamper))
      .rejects.toMatchObject({ code: "WORKSET_MISMATCH" });

    const worksetTamper = mutableClone(fixture.input);
    worksetTamper.workset.worksetSnapshot.target.registryVersion += "-tampered";
    worksetTamper.workset.worksetSnapshot.snapshotSha256 = await sha256Hex({
      domain: worksetTamper.workset.worksetSnapshot.profile.digestDomain,
      payload: withoutKey(worksetTamper.workset.worksetSnapshot, "snapshotSha256")
    });
    await expect(buildBaziCitationReviewContextSnapshot(worksetTamper))
      .rejects.toMatchObject({ code: "WORKSET_MISMATCH" });
  });

  it("rejects a nested item tamper after all four public layers are coordinately re-signed", async () => {
    const tampered = mutableClone(fixture.input);
    tampered.workset.packet.items[0]!.quote += "-coordinated-tamper";
    await resignCoordinatedWorkset(tampered.workset);

    await expect(buildBaziCitationReviewContextSnapshot(tampered))
      .rejects.toMatchObject({ code: "WORKSET_MISMATCH" });
  });

  it("recomputes the source-set digest instead of trusting coordinated bindings", async () => {
    const tampered = mutableClone(fixture.input);
    const forgedSourceSetDigest = tampered.workset.packet.sourceSet.matchingSourceSetSha256 === "a".repeat(64)
      ? "b".repeat(64)
      : "a".repeat(64);
    tampered.workset.packet.sourceSet.matchingSourceSetSha256 = forgedSourceSetDigest;
    tampered.workset.inventory.binding.matchingSourceSetSha256 = forgedSourceSetDigest;
    tampered.workset.storageSnapshot.bindings.matchingSourceSetSha256 = forgedSourceSetDigest;
    tampered.workset.worksetSnapshot.packetBinding.matchingSourceSetSha256 = forgedSourceSetDigest;
    await resignCoordinatedWorkset(tampered.workset);

    await expect(buildBaziCitationReviewContextSnapshot(tampered))
      .rejects.toMatchObject({ code: "WORKSET_MISMATCH" });
  });

  it("recomputes storage document ledgers instead of trusting a re-signed sidecar", async () => {
    const tampered = mutableClone(fixture.input);
    tampered.workset.storageSnapshot.bindings.documentIds = ["forged-document-id"];
    tampered.workset.storageSnapshot.bindings.sourceRightsDocumentIds = ["forged-document-id"];
    await resignCoordinatedWorkset(tampered.workset);

    await expect(buildBaziCitationReviewContextSnapshot(tampered))
      .rejects.toMatchObject({ code: "WORKSET_MISMATCH" });
  });

  it("normalizes malformed nested declarative worksets to the finite public error algebra", async () => {
    const malformed = mutableClone(fixture.input);
    malformed.workset.packet.counts = null as never;
    await resignCoordinatedWorkset(malformed.workset);

    await expectFiniteContextError(buildBaziCitationReviewContextSnapshot(malformed));
  });

  it("blocks candidate and single-verified worksets at the explicit review gate", async () => {
    await expect(buildBaziCitationReviewContextSnapshot({
      ...fixture.input,
      workset: fixture.candidateWorkset
    })).rejects.toMatchObject({ code: "REVIEW_GATE_BLOCKED" });
    await expect(buildBaziCitationReviewContextSnapshot({
      ...fixture.input,
      workset: fixture.oneVerifiedWorkset
    })).rejects.toMatchObject({ code: "REVIEW_GATE_BLOCKED" });
  });

  it("rejects release, deleted Case, cross-Case and field-subject mismatches", async () => {
    const releaseMismatch = mutableClone(fixture.input);
    releaseMismatch.releaseIdentity.targetSchema = 14 as 13;
    await expect(buildBaziCitationReviewContextSnapshot(releaseMismatch))
      .rejects.toMatchObject({ code: "RELEASE_IDENTITY_MISMATCH" });

    const deletedCase = mutableClone(fixture.input);
    deletedCase.caseRecord.deletedAt = CREATED_AT;
    await expect(buildBaziCitationReviewContextSnapshot(deletedCase))
      .rejects.toMatchObject({ code: "CASE_REVISION_MISMATCH" });

    const crossCase = mutableClone(fixture.input);
    crossCase.revision.caseId = "77777777-7777-4777-8777-777777777777";
    await expect(buildBaziCitationReviewContextSnapshot(crossCase))
      .rejects.toMatchObject({ code: "CASE_REVISION_MISMATCH" });

    const fieldMismatch = mutableClone(fixture.input);
    fieldMismatch.selection.fieldPath = "pillars.day.hiddenStems";
    await expect(buildBaziCitationReviewContextSnapshot(fieldMismatch))
      .rejects.toMatchObject({ code: "FIELD_CONTEXT_MISMATCH" });

    const interpretiveSubjectMismatch = mutableClone(fixture.input);
    interpretiveSubjectMismatch.selection.evidenceSubjectId = "bazi.strength.binding.core.derive-assessment.v1";
    await expect(buildBaziCitationReviewContextSnapshot(interpretiveSubjectMismatch))
      .rejects.toMatchObject({ code: "FIELD_CONTEXT_MISMATCH" });
  });

  it("rejects getters, extra keys and symbols synchronously before hashing", async () => {
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest");
    const getter = vi.fn(() => FIELD_PATH);
    const accessorInput = mutableClone(fixture.input);
    Object.defineProperty(accessorInput.selection, "fieldPath", {
      enumerable: true,
      configurable: true,
      get: getter
    });
    const accessorResult = buildBaziCitationReviewContextSnapshot(accessorInput);
    expect(getter).not.toHaveBeenCalled();
    expect(digest).not.toHaveBeenCalled();
    await expect(accessorResult).rejects.toMatchObject({ code: "INVALID_INPUT" });

    const extraInput = Object.assign(mutableClone(fixture.input), { extra: "forbidden" });
    const extraResult = buildBaziCitationReviewContextSnapshot(extraInput);
    expect(digest).not.toHaveBeenCalled();
    await expect(extraResult).rejects.toMatchObject({ code: "INVALID_INPUT" });

    const symbolInput = mutableClone(fixture.input) as DeepMutable<BuildBaziCitationReviewContextSnapshotInput>
      & { [key: symbol]: string };
    symbolInput[Symbol("forbidden")] = "forbidden";
    const symbolResult = buildBaziCitationReviewContextSnapshot(symbolInput);
    expect(digest).not.toHaveBeenCalled();
    await expect(symbolResult).rejects.toMatchObject({ code: "INVALID_INPUT" });
    digest.mockRestore();
  });

  it("blocks unknown-hour and non-replayable revisions", async () => {
    const unknownHour = mutableClone(fixture.input);
    unknownHour.revision.input.time = null;
    unknownHour.revision.input.timePrecision = "unknown_hour";
    await expect(buildBaziCitationReviewContextSnapshot(unknownHour))
      .rejects.toMatchObject({ code: "REVISION_REPLAY_BLOCKED" });

    const unsupportedExecutor = mutableClone(fixture.input);
    unsupportedExecutor.revision.manifest.engine.version = "999.0.0-unsupported";
    await expect(buildBaziCitationReviewContextSnapshot(unsupportedExecutor))
      .rejects.toMatchObject({ code: "REVISION_REPLAY_BLOCKED" });
  });

  it("rejects nested future Revision fields instead of hashing a parser-stripped snapshot", async () => {
    const futureNested = mutableClone(fixture.input) as DeepMutable<BuildBaziCitationReviewContextSnapshotInput>
      & { revision: { ruleProfile: { calendar: Record<string, unknown> } } };
    futureNested.revision.ruleProfile.calendar.futureUnboundRule = "must-fail-closed";

    await expect(buildBaziCitationReviewContextSnapshot(futureNested))
      .rejects.toMatchObject({ code: "REVISION_REPLAY_BLOCKED" });
  });

  it("rejects validator replay against a newer valid revision or workset", async () => {
    const snapshot = await buildBaziCitationReviewContextSnapshot(fixture.input);
    await expect(validateBaziCitationReviewContextSnapshot(snapshot, fixture.revisedInput))
      .rejects.toMatchObject({ code: "SNAPSHOT_MISMATCH" });
    await expect(validateBaziCitationReviewContextSnapshot(snapshot, {
      ...fixture.input,
      workset: fixture.alternateWorkset
    })).rejects.toMatchObject({ code: "SNAPSHOT_MISMATCH" });
  });
});

describe("Bazi citation applicability observation sidecar", () => {
  async function completeObservationFile(
    context: BaziCitationReviewContextSnapshot,
    reviewerId: string,
    identityEvidenceReference: string,
    statuses: readonly BaziCitationApplicabilityObservationStatus[],
    sentinel: string
  ): Promise<string> {
    const template = mutableClone(await createBaziCitationApplicabilityObservationTemplate(context));
    template.reviewer.reviewerId = reviewerId;
    template.reviewer.displayName = `显示名 ${sentinel}`;
    template.reviewer.affiliation = `归属 ${sentinel}`;
    template.reviewer.expertiseStatement = `专业说明 ${sentinel}`;
    template.reviewer.identityEvidenceReference = identityEvidenceReference;
    template.session.observedAt = "2026-08-24T12:30:00.000Z";
    template.session.methodology = `方法 ${sentinel}`;
    template.session.traditionScope = `传统范围 ${sentinel}`;
    template.session.generalNotes = `总备注 ${sentinel}`;
    template.observations.forEach((item, index) => {
      item.observation = statuses[index]!;
      if (item.observation !== "unobserved") {
        item.reason = `理由 ${sentinel} ${index}`;
        item.applicabilityConditions = `条件 ${sentinel} ${index}`;
        item.counterexamples = `反例 ${sentinel} ${index}`;
        item.additionalSourceUrls = [`https://example.com/${sentinel.toLocaleLowerCase("en-US")}/${index}`];
      }
    });
    template.declaredCounts = {
      total: statuses.length,
      unobserved: statuses.filter((status) => status === "unobserved").length,
      applicableInBoundContext: statuses.filter((status) => status === "applicable_in_bound_context").length,
      partiallyApplicableInBoundContext: statuses.filter((status) => status === "partially_applicable_in_bound_context").length,
      notApplicableInBoundContext: statuses.filter((status) => status === "not_applicable_in_bound_context").length,
      insufficientBoundContext: statuses.filter((status) => status === "insufficient_bound_context").length
    };
    return JSON.stringify(template);
  }

  async function completeObservationPair(
    context: BaziCitationReviewContextSnapshot,
    sentinel = "LIFECYCLE"
  ): Promise<Readonly<{ rawA: string; rawB: string }>> {
    const [rawA, rawB] = await Promise.all([
      completeObservationFile(
        context,
        "reviewer-a",
        "offline-identity-record-a",
        ["applicable_in_bound_context", "not_applicable_in_bound_context"],
        `${sentinel}_A`
      ),
      completeObservationFile(
        context,
        "reviewer-b",
        "offline-identity-record-b",
        ["applicable_in_bound_context", "insufficient_bound_context"],
        `${sentinel}_B`
      )
    ]);
    return Object.freeze({ rawA, rawB });
  }

  it("creates a minimized, context-bound and deeply frozen local observation template", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const template = await createBaziCitationApplicabilityObservationTemplate(context);
    const serialized = serializeBaziCitationApplicabilityObservationTemplate(template);

    expect(template.profile).toBe(BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE);
    expect(template.contextBinding).toMatchObject({
      releaseIdentity: { dbGeneration: "legacy-v13", targetSchema: 13, migrationId: null },
      caseId: fixture.input.caseRecord.id,
      revisionId: fixture.input.revision.id,
      evidenceSubjectId: SUBJECT_ID,
      fieldPath: FIELD_PATH,
      contextPayloadSha256: context.integrity.payloadSha256,
      displayContextBindingSha256: context.displayContextBinding.payloadSha256,
      revisionSnapshotSha256: context.revisionBinding.revisionSnapshotDigest,
      worksetSnapshotSha256: context.worksetBinding.worksetSnapshotSha256,
      matchingSourceSetSha256: context.worksetBinding.matchingSourceSetSha256
    });
    expect(template.contextBinding.citationIds).toEqual(
      context.worksetBinding.citationIdsWithStoredVerifiedStatus
    );
    expect(template.observations.map((item) => ({
      order: item.order,
      citationId: item.citationId,
      observation: item.observation
    }))).toEqual(context.worksetBinding.citationIdsWithStoredVerifiedStatus.map((citationId, index) => ({
      order: index + 1,
      citationId,
      observation: "unobserved"
    })));
    expect(template.declaredCounts).toEqual({
      total: context.worksetBinding.citationIdsWithStoredVerifiedStatus.length,
      unobserved: context.worksetBinding.citationIdsWithStoredVerifiedStatus.length,
      applicableInBoundContext: 0,
      partiallyApplicableInBoundContext: 0,
      notApplicableInBoundContext: 0,
      insufficientBoundContext: 0
    });
    expect(template.boundary).toMatchObject({
      reviewerIdentityVerified: false,
      humanReviewAuthenticityVerified: false,
      chartApplicabilityAssessed: false,
      citationSemanticApplicabilityAssessed: false,
      storageMutationPerformed: false,
      mutationEpochBypassed: false,
      formalActivationAllowed: false,
      automaticPromotionAllowed: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      result: null
    });
    expect(serialized).not.toContain(CASE_ALIAS_SECRET);
    expect(serialized).not.toContain(CASE_TAG_SECRET);
    expect(serialized).not.toContain(CASE_NOTES_SECRET);
    expect(serialized).not.toContain(BIRTH_SOURCE_SECRET);
    expect(serialized).not.toContain(BIRTH_LOCATION_SECRET);
    expect(serialized).not.toContain("SOURCE_QUOTE_MUST_NOT_LEAK");
    expect(serialized).not.toContain(fixture.input.revision.facts.pillars.day.ganZhi);
    expectDeepFrozen(template);

    const preflight = await preflightBaziCitationApplicabilityObservation(serialized, context);
    expect(preflight).toMatchObject({
      observedCount: 0,
      allCitationsObserved: false,
      reviewerAttributionComplete: false,
      suppliedCurrentContextDigestMatched: true,
      identityVerified: false,
      humanReviewAuthenticityVerified: false,
      chartApplicabilityAssessed: false,
      citationSemanticApplicabilityAssessed: false,
      eligibleForFormalActivation: false,
      automaticPromotionAllowed: false,
      storageMutationPerformed: false,
      mutationEpochBypassed: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    });
    expect(preflight.integrity).toMatchObject({
      hashAlgorithm: "SHA-256",
      digestIsDigitalSignature: false,
      authenticityClaimed: false
    });
    expect(preflight.integrity.recordSha256).toMatch(/^[a-f0-9]{64}$/u);
    expectDeepFrozen(preflight);
  });

  it("accepts complete self-declared observations without upgrading identity, truth or activation", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const template = mutableClone(await createBaziCitationApplicabilityObservationTemplate(context));
    template.reviewer.reviewerId = "local-reviewer-01";
    template.reviewer.displayName = "本机审阅者";
    template.reviewer.affiliation = "独立观察";
    template.reviewer.expertiseStatement = "自述熟悉当前传统范围，现实身份未核验。";
    template.reviewer.identityEvidenceReference = "local-identity-record:reviewer-01";
    template.session.observedAt = "2026-08-24T12:30:00.000Z";
    template.session.methodology = "逐条查看当前绑定摘录，并只记录对当前字段上下文的适用性观察。";
    template.session.traditionScope = "子平候选；不扩张为共同真值。";
    template.session.generalNotes = "仅本机只读预检。";
    template.observations[0]!.observation = "applicable_in_bound_context";
    template.observations[0]!.reason = "该摘录在当前冻结字段范围内提供直接术语语境。";
    template.observations[0]!.applicabilityConditions = "仅限当前字段、当前 Revision 与已绑定规则摘要。";
    template.observations[0]!.counterexamples = "换日规则、流派或 Revision 变化时需要重新观察。";
    template.observations[0]!.relatedCitationIds = [template.observations[1]!.citationId];
    template.observations[0]!.additionalSourceUrls = ["https://example.com/source-a"];
    template.observations[1]!.observation = "insufficient_bound_context";
    template.observations[1]!.reason = "当前有界摘录不足以判断适用性。";
    template.declaredCounts = {
      total: 2,
      unobserved: 0,
      applicableInBoundContext: 1,
      partiallyApplicableInBoundContext: 0,
      notApplicableInBoundContext: 0,
      insufficientBoundContext: 1
    };

    const preflight = await preflightBaziCitationApplicabilityObservation(
      JSON.stringify(template),
      context
    );
    expect(preflight.counts).toEqual(template.declaredCounts);
    expect(preflight).toMatchObject({
      observedCount: 2,
      allCitationsObserved: true,
      reviewerAttributionComplete: true,
      identityVerified: false,
      humanReviewAuthenticityVerified: false,
      chartApplicabilityAssessed: false,
      citationSemanticApplicabilityAssessed: false,
      eligibleForFormalActivation: false,
      automaticPromotionAllowed: false,
      storageMutationPerformed: false,
      mutationEpochBypassed: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    });
    expect(preflight.envelope.reviewer.displayName).toBe("本机审阅者");
    expectDeepFrozen(preflight);
  });

  it("fails closed on stale bindings, incomplete attribution, future authority and coverage drift", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const template = await createBaziCitationApplicabilityObservationTemplate(context);
    const alternateContext = await buildBaziCitationReviewContextSnapshot({
      ...fixture.input,
      workset: fixture.alternateWorkset
    });
    await expect(preflightBaziCitationApplicabilityObservation(
      serializeBaziCitationApplicabilityObservationTemplate(template),
      alternateContext
    )).rejects.toMatchObject({ code: "CONTEXT_BINDING_STALE" });

    const incomplete = mutableClone(template);
    incomplete.observations[0]!.observation = "applicable_in_bound_context";
    incomplete.observations[0]!.reason = "有观察但没有完整归属。";
    incomplete.observations[0]!.applicabilityConditions = "仅当前字段。";
    incomplete.observations[0]!.counterexamples = "换盘需重审。";
    incomplete.declaredCounts.unobserved -= 1;
    incomplete.declaredCounts.applicableInBoundContext += 1;
    await expect(preflightBaziCitationApplicabilityObservation(
      JSON.stringify(incomplete),
      context
    )).rejects.toMatchObject({ code: "REVIEWER_ATTRIBUTION_INCOMPLETE" });

    const promoted = mutableClone(template) as DeepMutable<BaziCitationApplicabilityObservationEnvelope>;
    promoted.boundary.formalActivationAllowed = true as false;
    await expect(preflightBaziCitationApplicabilityObservation(
      JSON.stringify(promoted),
      context
    )).rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });

    const missing = mutableClone(template);
    missing.observations.pop();
    missing.declaredCounts.total -= 1;
    missing.declaredCounts.unobserved -= 1;
    await expect(preflightBaziCitationApplicabilityObservation(
      JSON.stringify(missing),
      context
    )).rejects.toMatchObject({ code: "OBSERVATION_COVERAGE_MISMATCH" });

    const future = JSON.parse(JSON.stringify(template)) as Record<string, unknown>;
    future.futureActivationReceipt = { authorized: true };
    await expect(preflightBaziCitationApplicabilityObservation(
      JSON.stringify(future),
      context
    )).rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });
  });

  it("rejects a recomputed context digest when the mutation epoch boundary is promoted", async () => {
    const context = mutableClone(await buildBaziCitationReviewContextSnapshot(fixture.input));
    context.boundary.mutationEpochRevalidationPerformed = true as false;
    context.integrity.payloadSha256 = await sha256Hex({
      domain: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE.digestDomain,
      payload: withoutKey(context, "integrity")
    });

    await expect(createBaziCitationApplicabilityObservationTemplate(context))
      .rejects.toMatchObject({ code: "INVALID_CONTEXT" });
  });

  it("rejects unobserved prose, credentialed URLs and forged current-context digests", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const template = mutableClone(await createBaziCitationApplicabilityObservationTemplate(context));
    template.observations[0]!.reason = "未观察项不得夹带文本";
    await expect(preflightBaziCitationApplicabilityObservation(
      JSON.stringify(template),
      context
    )).rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });

    template.observations[0]!.reason = "";
    template.observations[0]!.observation = "insufficient_bound_context";
    template.observations[0]!.reason = "需要更多上下文";
    template.observations[0]!.additionalSourceUrls = ["https://user:password@example.com/private"];
    template.reviewer.reviewerId = "reviewer";
    template.reviewer.displayName = "reviewer";
    template.reviewer.expertiseStatement = "self-declared";
    template.session.observedAt = "2026-08-24T12:30:00Z";
    template.session.methodology = "bounded";
    template.session.traditionScope = "candidate";
    template.declaredCounts.unobserved -= 1;
    template.declaredCounts.insufficientBoundContext += 1;
    await expect(preflightBaziCitationApplicabilityObservation(
      JSON.stringify(template),
      context
    )).rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });

    const forgedContext = mutableClone(context);
    forgedContext.integrity.payloadSha256 = "f".repeat(64);
    await expect(createBaziCitationApplicabilityObservationTemplate(forgedContext))
      .rejects.toMatchObject({ code: "INVALID_CONTEXT" });
  });

  it("normalizes all parser failures to the finite observation error family", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    let caught: unknown;
    try {
      await preflightBaziCitationApplicabilityObservation("{", context);
    } catch (cause) {
      caught = cause;
    }
    expect(caught).toBeInstanceOf(BaziCitationApplicabilityObservationError);
    expect([
      "INVALID_CONTEXT",
      "INVALID_OBSERVATION_FILE",
      "CONTEXT_BINDING_STALE",
      "OBSERVATION_COVERAGE_MISMATCH",
      "REVIEWER_ATTRIBUTION_INCOMPLETE"
    ]).toContain((caught as BaziCitationApplicabilityObservationError).code);
  });

  it("inspects a valid observation file without a supplied current context", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const raw = await completeObservationFile(
      context,
      "reviewer-a",
      "offline-identity-record-a",
      ["applicable_in_bound_context", "insufficient_bound_context"],
      "INSPECT_VALID"
    );

    const inspected = await inspectBaziCitationApplicabilityObservation(raw);
    const preflight = await preflightBaziCitationApplicabilityObservation(raw, context);

    expect(inspected.envelope).toEqual(preflight.envelope);
    expect(inspected.counts).toEqual(preflight.counts);
    expect(inspected).toMatchObject({
      currentContextChecked: false,
      contextBindingStructureValidated: true,
      contextDigestReferentsRecomputed: false,
      citationVerificationStatusRevalidated: false,
      recordDigestRecomputed: true,
      identityVerified: false,
      humanReviewAuthenticityVerified: false,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false
    });
    expect(inspected.integrity.recordSha256).toBe(preflight.integrity.recordSha256);
    expect(inspected.integrity.recordSha256).toBe(await sha256Hex({
      domain: BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE.recordDigestDomain,
      payload: inspected.envelope
    }));
    expect(inspected.integrity.recordSha256).toMatch(/^[a-f0-9]{64}$/u);
    expectDeepFrozen(inspected);
  });

  it("keeps independent inspection available after the current context drifts", async () => {
    const originalContext = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const raw = await completeObservationFile(
      originalContext,
      "reviewer-a",
      "offline-identity-record-a",
      ["applicable_in_bound_context", "insufficient_bound_context"],
      "INSPECT_STALE"
    );
    const alternateContext = await buildBaziCitationReviewContextSnapshot({
      ...fixture.input,
      workset: fixture.alternateWorkset
    });

    const inspected = await inspectBaziCitationApplicabilityObservation(raw);
    expect(inspected.envelope.contextBinding.contextPayloadSha256)
      .toBe(originalContext.integrity.payloadSha256);
    expectDeepFrozen(inspected);
    await expect(preflightBaziCitationApplicabilityObservation(raw, alternateContext))
      .rejects.toMatchObject({ code: "CONTEXT_BINDING_STALE" });
  });

  it("prioritizes finite independent-inspection errors over a stale context binding", async () => {
    const originalContext = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const raw = await completeObservationFile(
      originalContext,
      "reviewer-a",
      "offline-identity-record-a",
      ["applicable_in_bound_context", "insufficient_bound_context"],
      "INSPECT_STALE_MALFORMED"
    );
    const alternateContext = await buildBaziCitationReviewContextSnapshot({
      ...fixture.input,
      workset: fixture.alternateWorkset
    });
    await expect(preflightBaziCitationApplicabilityObservation(raw, alternateContext))
      .rejects.toMatchObject({ code: "CONTEXT_BINDING_STALE" });

    const malformed = JSON.parse(raw) as Record<string, unknown>;
    malformed.futureAuthority = true;
    await expect(preflightBaziCitationApplicabilityObservation(
      JSON.stringify(malformed),
      alternateContext
    )).rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });
  });

  it("rejects extra root and context-binding fields during independent inspection", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const raw = await completeObservationFile(
      context,
      "reviewer-a",
      "offline-identity-record-a",
      ["applicable_in_bound_context", "insufficient_bound_context"],
      "INSPECT_EXTRA"
    );
    const withRootExtra = JSON.parse(raw) as Record<string, unknown>;
    withRootExtra.futureActivationReceipt = { authorized: true };
    await expect(inspectBaziCitationApplicabilityObservation(JSON.stringify(withRootExtra)))
      .rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });

    const withBindingExtra = JSON.parse(raw) as Record<string, unknown>;
    const binding = withBindingExtra.contextBinding as Record<string, unknown>;
    binding.futureMutationEpoch = 1;
    await expect(inspectBaziCitationApplicabilityObservation(JSON.stringify(withBindingExtra)))
      .rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });
  });

  it.each([
    ["profileId", "different-profile"],
    ["profileVersion", "9.9.9"],
    ["profileDigest", "f".repeat(64)]
  ] as const)("rejects a nested rule-pack %s that contradicts the outer rule profile", async (
    field,
    forgedValue
  ) => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const template = mutableClone(await createBaziCitationApplicabilityObservationTemplate(context));
    const outer = template.contextBinding.ruleProfile;
    const nested = {
      kind: "installed_rule_pack" as const,
      packDigest: "a".repeat(64),
      profileDigest: outer.ruleProfileDigest,
      packId: "local-test-pack",
      profileId: outer.profileId,
      profileVersion: outer.profileVersion,
      useMode: "exact" as const
    };
    nested[field] = forgedValue;
    template.contextBinding.ruleProfile.revisionRulePackBinding = nested;

    await expect(inspectBaziCitationApplicabilityObservation(JSON.stringify(template)))
      .rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });
  });

  it("rejects non-string inspection input without executing coercion getters", async () => {
    let getterCalls = 0;
    const nonString = Object.create(null) as Record<PropertyKey, unknown>;
    Object.defineProperty(nonString, Symbol.toPrimitive, {
      configurable: true,
      get() {
        getterCalls += 1;
        return () => "{}";
      }
    });
    Object.defineProperty(nonString, "toString", {
      configurable: true,
      get() {
        getterCalls += 1;
        return () => "{}";
      }
    });

    const result = inspectBaziCitationApplicabilityObservation(nonString);
    expect(getterCalls).toBe(0);
    await expect(result).rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });
    expect(getterCalls).toBe(0);
  });

  it("rejects observation text over 512 KiB code units before UTF-8 allocation", async () => {
    const encode = vi.fn(() => {
      throw new Error("utf8_allocation_must_not_run");
    });
    vi.stubGlobal("TextEncoder", class {
      encode(): Uint8Array {
        return encode();
      }
    });
    try {
      await expect(inspectBaziCitationApplicabilityObservation(
        "x".repeat(512 * 1024 + 1)
      )).rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });
      expect(encode).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects observation text within the code-unit limit after its UTF-8 bytes exceed 512 KiB", async () => {
    const NativeTextEncoder = TextEncoder;
    const encode = vi.fn((input: string) => new NativeTextEncoder().encode(input));
    vi.stubGlobal("TextEncoder", class {
      encode(input: string): Uint8Array {
        return encode(input);
      }
    });
    const raw = "界".repeat(Math.floor((512 * 1024) / 3) + 1);
    expect(raw.length).toBeLessThanOrEqual(512 * 1024);
    try {
      await expect(inspectBaziCitationApplicabilityObservation(raw))
        .rejects.toMatchObject({ code: "INVALID_OBSERVATION_FILE" });
      expect(encode).toHaveBeenCalledTimes(1);
      expect(encode.mock.results[0]!.value.byteLength).toBeGreaterThan(512 * 1024);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("mechanically compares two complete records in canonical digest order without returning freeform text", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const rawA = await completeObservationFile(
      context,
      "reviewer-a",
      "offline-identity-record-a",
      ["applicable_in_bound_context", "not_applicable_in_bound_context"],
      "PAIR_A_SENTINEL"
    );
    const rawB = await completeObservationFile(
      context,
      "reviewer-b",
      "offline-identity-record-b",
      ["applicable_in_bound_context", "insufficient_bound_context"],
      "PAIR_B_SENTINEL"
    );

    const comparison = await compareBaziCitationApplicabilityObservations(rawA, rawB, context);
    const swapped = await compareBaziCitationApplicabilityObservations(rawB, rawA, context);

    expect(comparison.profile).toBe(BAZI_CITATION_APPLICABILITY_OBSERVATION_COMPARISON_PROFILE);
    expect(comparison).toEqual(swapped);
    expect(comparison.records[0]!.recordSha256.localeCompare(
      comparison.records[1]!.recordSha256,
      "en-US"
    )).toBeLessThan(0);
    expect(comparison.counts).toEqual({
      total: 2,
      sameDeclaredStatus: 1,
      differentDeclaredStatus: 1
    });
    expect(comparison.items.map((item) => item.relation).sort()).toEqual([
      "different_declared_status",
      "same_declared_status"
    ]);
    expect(comparison.distinctness).toEqual({
      recordDigestsDistinct: true,
      selfDeclaredReviewerIdsDistinct: true,
      selfDeclaredIdentityEvidenceReferencesDistinct: true,
      reviewerIdentityVerified: false,
      reviewerIndependenceVerified: false
    });
    expect(comparison.boundary).toMatchObject({
      oneSuppliedCurrentContextSnapshotUsedForBoth: true,
      inputOrderAffectsProjection: false,
      freeformObservationTextReturned: false,
      identityEvidenceReferenceReturned: false,
      semanticConflictResolutionPerformed: false,
      winnerSelectionPerformed: false,
      rankingPerformed: false,
      consensusClaimed: false,
      storageMutationPerformed: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      formalActivationAllowed: false,
      automaticPromotionAllowed: false
    });
    expect(comparison.integrity.recordSetSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(comparison)).not.toContain("PAIR_A_SENTINEL");
    expect(JSON.stringify(comparison)).not.toContain("PAIR_B_SENTINEL");
    expect(JSON.stringify(comparison)).not.toContain("offline-identity-record");
    expectDeepFrozen(comparison);
  });

  it("fails closed on duplicate records, reviewer identifiers and identity references", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const rawA = await completeObservationFile(
      context,
      "Reviewer-A",
      "offline-identity-record-a",
      ["applicable_in_bound_context", "not_applicable_in_bound_context"],
      "DISTINCT_A"
    );
    await expect(compareBaziCitationApplicabilityObservations(
      rawA,
      JSON.stringify(JSON.parse(rawA), null, 2),
      context
    )).rejects.toMatchObject({ code: "DUPLICATE_OBSERVATION_RECORD" });

    const sameReviewer = await completeObservationFile(
      context,
      " reviewer-a ",
      "offline-identity-record-b",
      ["not_applicable_in_bound_context", "not_applicable_in_bound_context"],
      "DISTINCT_B"
    );
    await expect(compareBaziCitationApplicabilityObservations(rawA, sameReviewer, context))
      .rejects.toMatchObject({ code: "SELF_DECLARED_REVIEWER_COLLISION" });

    const sameIdentityReference = await completeObservationFile(
      context,
      "reviewer-b",
      " OFFLINE-IDENTITY-RECORD-A ",
      ["not_applicable_in_bound_context", "insufficient_bound_context"],
      "DISTINCT_C"
    );
    await expect(compareBaziCitationApplicabilityObservations(rawA, sameIdentityReference, context))
      .rejects.toMatchObject({ code: "SELF_DECLARED_IDENTITY_REFERENCE_COLLISION" });
  });

  it("does not form a pair from partial or stale observation inputs", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const partial = await completeObservationFile(
      context,
      "reviewer-a",
      "offline-identity-record-a",
      ["applicable_in_bound_context", "unobserved"],
      "PARTIAL_A"
    );
    const complete = await completeObservationFile(
      context,
      "reviewer-b",
      "offline-identity-record-b",
      ["applicable_in_bound_context", "insufficient_bound_context"],
      "COMPLETE_B"
    );
    await expect(compareBaziCitationApplicabilityObservations(partial, complete, context))
      .rejects.toMatchObject({ code: "OBSERVATION_RECORD_INCOMPLETE" });

    const alternateContext = await buildBaziCitationReviewContextSnapshot({
      ...fixture.input,
      workset: fixture.alternateWorkset
    });
    await expect(compareBaziCitationApplicabilityObservations(complete, complete, alternateContext))
      .rejects.toMatchObject({ code: "SLOT_A_OBSERVATION_INVALID" });
  });

  it("normalizes pair failures to the finite comparison error family", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    let caught: unknown;
    try {
      await compareBaziCitationApplicabilityObservations("{", "{}", context);
    } catch (cause) {
      caught = cause;
    }
    expect(caught).toBeInstanceOf(BaziCitationApplicabilityObservationComparisonError);
    expect([
      "INVALID_COMPARISON_INPUT",
      "SLOT_A_OBSERVATION_INVALID",
      "SLOT_B_OBSERVATION_INVALID",
      "OBSERVATION_RECORD_INCOMPLETE",
      "DUPLICATE_OBSERVATION_RECORD",
      "SELF_DECLARED_REVIEWER_COLLISION",
      "SELF_DECLARED_IDENTITY_REFERENCE_COLLISION"
    ]).toContain((caught as BaziCitationApplicabilityObservationComparisonError).code);
  });

  it("creates a deterministic immutable pair lifecycle without consulting Date.now or Math.random", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const { rawA, rawB } = await completeObservationPair(context, "DETERMINISTIC");
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("clock_read_forbidden");
    });
    const randomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("randomness_forbidden");
    });
    try {
      const first = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
        rawA,
        rawB,
        context
      );
      const swapped = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
        rawB,
        rawA,
        context
      );
      const repeated = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
        rawA,
        rawB,
        context
      );

      expect(first).toEqual(swapped);
      expect(first).toEqual(repeated);
      expect(first.profile).toBe(BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_PROFILE);
      expect(BAZI_CITATION_APPLICABILITY_OBSERVATION_PAIR_LIFECYCLE_FILENAME)
        .toBe("hakimi-bazi-citation-applicability-observation-pair-lifecycle-v01.json");
      expect(first.records[0].recordSha256 < first.records[1].recordSha256).toBe(true);
      expect(first.records.map((recordItem) => ({
        state: recordItem.state,
        sequence: recordItem.events[0].sequence,
        kind: recordItem.events[0].kind,
        reasonCode: recordItem.events[0].reasonCode
      }))).toEqual([
        { state: "recorded_current_context_unchecked", sequence: 0, kind: "recorded", reasonCode: null },
        { state: "recorded_current_context_unchecked", sequence: 0, kind: "recorded", reasonCode: null }
      ]);
      expect(first.contextBinding).toMatchObject({
        releaseIdentity: { dbGeneration: "legacy-v13", targetSchema: 13, migrationId: null },
        contextPayloadSha256: context.integrity.payloadSha256,
        displayContextBindingSha256: context.displayContextBinding.payloadSha256
      });
      expect(first.boundary).toMatchObject({
        inputOrderAffectsSidecar: false,
        clockReadPerformed: false,
        randomnessUsed: false,
        localUserWithholdingIsReviewerWithdrawal: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        reviewerWithdrawalAuthorityVerified: false,
        storageMutationPerformed: false,
        mutationEpochRevalidationPerformed: false,
        mutationEpochBypassed: false,
        priorExportsRecalled: false,
        physicalDeletionAttested: false,
        publicExportAuthorized: false,
        publicReleaseAuthorized: false,
        formalActivationAllowed: false,
        automaticPromotionAllowed: false
      });
      const serialized = serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(first);
      expect(serialized).toBe(
        serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(swapped)
      );
      expect(serialized.endsWith("\n")).toBe(true);
      const inspected = await inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
        serialized
      );
      expect(inspected).toMatchObject({
        recordedNotWithheldCount: 2,
        withheldRecordCount: 0,
        structurallyCompletePair: true,
        pairComparisonAllowed: false,
        currentContextChecked: false,
        reviewerIdentityVerified: false,
        reviewerIndependenceVerified: false,
        reviewerWithdrawalAuthorityVerified: false,
        storageMutationPerformed: false,
        mutationEpochBypassed: false,
        publicExportAuthorized: false,
        publicReleaseAuthorized: false
      });
      expect(inspected.sidecar).toEqual(first);
      const evaluated = await evaluateBaziCitationApplicabilityObservationPairLifecycleSidecar(
        serialized,
        context
      );
      expect(evaluated).toMatchObject({
        status: "supplied_context_snapshot_matched_read_only",
        mechanicalComparisonEligibleUnderSuppliedContextSnapshot: true,
        currentContextCheckAttempted: true,
        currentContextCheckCompleted: true,
        currentContextDigestMatched: true,
        boundary: {
          mechanicalComparisonOnly: true,
          suppliedContextRepositoryOriginAttested: false,
          suppliedContextStorageFreshnessAttested: false,
          currentAtReturnAttested: false,
          reviewerIdentityVerified: false,
          semanticConflictResolutionPerformed: false,
          storageMutationPerformed: false,
          mutationEpochBypassed: false,
          formalActivationAllowed: false
        }
      });
      expectDeepFrozen(first);
      expectDeepFrozen(inspected);
      expectDeepFrozen(evaluated);
    } finally {
      nowSpy.mockRestore();
      randomSpy.mockRestore();
    }
  });

  it("creates a deterministic successor when a local user terminally withholds one record", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const { rawA, rawB } = await completeObservationPair(context, "WITHHOLD");
    const original = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
      rawA,
      rawB,
      context
    );
    const originalText = serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(original);
    const targetRecordSha256 = original.records[0].recordSha256;
    const successor = await withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
      originalText,
      targetRecordSha256,
      "privacy_request"
    );
    const repeated = await withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
      originalText,
      targetRecordSha256,
      "privacy_request"
    );

    expect(successor).toEqual(repeated);
    expect(original.records[0].state).toBe("recorded_current_context_unchecked");
    expect(successor.records[0]).toMatchObject({
      recordSha256: targetRecordSha256,
      state: "withheld_by_local_user"
    });
    expect(successor.records[0].events).toHaveLength(2);
    expect(successor.records[0].events[1]).toMatchObject({
      sequence: 1,
      kind: "withheld_by_local_user",
      reasonCode: "privacy_request",
      actorBasis: "local_user_unverified",
      previousEventSha256: successor.records[0].events[0].eventSha256
    });
    expect(successor.integrity.sidecarSha256).not.toBe(original.integrity.sidecarSha256);
    expect(successor.boundary).toMatchObject({
      localUserWithholdingOnly: true,
      localUserWithholdingIsReviewerWithdrawal: false,
      localUserActionAttested: false,
      terminalWithinSuppliedChainOnly: true,
      globalWithholdingAttested: false,
      crossFileReconciliationRequiredForDominance: true,
      withheldRecordBytesRetainedInSuccessorSidecar: true,
      reviewerWithdrawalAuthorityVerified: false,
      priorExportsRecalled: false,
      physicalDeletionAttested: false,
      storageMutationPerformed: false
    });
    const successorText = serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(successor);
    const inspected = await inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      successorText
    );
    expect(inspected).toMatchObject({
      recordedNotWithheldCount: 1,
      withheldRecordCount: 1,
      pairComparisonAllowed: false
    });
    await expect(withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
      successorText,
      targetRecordSha256,
      "suspected_record_error"
    )).rejects.toMatchObject({ code: "RECORD_ALREADY_WITHHELD" });
    await expect(withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
      originalText,
      "f".repeat(64),
      "privacy_request"
    )).rejects.toMatchObject({ code: "WITHHOLDING_TARGET_MISSING" });
    expectDeepFrozen(successor);
  });

  it("withholds stale or unverifiable pairs and never treats a local marker as global reviewer withdrawal", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const { rawA, rawB } = await completeObservationPair(context, "EVALUATE");
    const sidecar = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
      rawA,
      rawB,
      context
    );
    const sidecarText = serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(sidecar);
    const alternateContext = await buildBaziCitationReviewContextSnapshot({
      ...fixture.input,
      workset: fixture.alternateWorkset
    });
    const stale = await evaluateBaziCitationApplicabilityObservationPairLifecycleSidecar(
      sidecarText,
      alternateContext
    );
    expect(stale).toMatchObject({
      status: "supplied_context_mismatch_or_unverifiable",
      mechanicalComparisonEligibleUnderSuppliedContextSnapshot: false,
      currentContextCheckAttempted: true,
      currentContextCheckCompleted: true,
      currentContextDigestMatched: false
    });

    const successor = await withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
      sidecarText,
      sidecar.records[0].recordSha256,
      "local_user_request"
    );
    let getterCalls = 0;
    const unusedCurrentContext = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(unusedCurrentContext, "context", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return context;
      }
    });
    const withheld = await evaluateBaziCitationApplicabilityObservationPairLifecycleSidecar(
      serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(successor),
      unusedCurrentContext
    );
    expect(withheld).toMatchObject({
      status: "withheld_by_local_user",
      mechanicalComparisonEligibleUnderSuppliedContextSnapshot: false,
      currentContextCheckAttempted: false,
      currentContextCheckCompleted: false,
      currentContextDigestMatched: false,
      withheldRecordSha256s: [sidecar.records[0].recordSha256],
      boundary: {
        reviewerWithdrawalAuthorityVerified: false,
        currentAtReturnAttested: false
      }
    });
    expect(getterCalls).toBe(0);
  });

  it("reconciles strict lifecycle prefixes and fails closed on event forks or ledger collisions", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const { rawA, rawB } = await completeObservationPair(context, "RECONCILE");
    const original = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
      rawA,
      rawB,
      context
    );
    const originalText = serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(original);
    const privacyBranch = await withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
      originalText,
      original.records[0].recordSha256,
      "privacy_request"
    );
    const errorBranch = await withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
      originalText,
      original.records[0].recordSha256,
      "suspected_record_error"
    );
    const secondRecordBranch = await withholdBaziCitationApplicabilityObservationPairLifecycleRecord(
      originalText,
      original.records[1].recordSha256,
      "local_user_request"
    );
    const privacyText = serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(privacyBranch);
    const errorText = serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(errorBranch);
    const secondRecordText = serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(
      secondRecordBranch
    );

    const reconciled = await reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars([
      originalText,
      privacyText
    ]);
    const swapped = await reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars([
      privacyText,
      originalText
    ]);
    expect(reconciled).toEqual(privacyBranch);
    expect(swapped).toEqual(privacyBranch);
    expectDeepFrozen(reconciled);
    expectDeepFrozen(swapped);

    const bothWithheld = await reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars([
      privacyText,
      secondRecordText,
      originalText
    ]);
    expect(bothWithheld.records.map((recordItem) => recordItem.state)).toEqual([
      "withheld_by_local_user",
      "withheld_by_local_user"
    ]);
    expectDeepFrozen(bothWithheld);
    const privacyWithholdingEvent = privacyBranch.records[0].events[1];
    const errorWithholdingEvent = errorBranch.records[0].events[1];
    expect(privacyWithholdingEvent?.eventId).toBe(errorWithholdingEvent?.eventId);
    expect(privacyWithholdingEvent?.eventSha256).not.toBe(errorWithholdingEvent?.eventSha256);
    await expect(reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars(
      Array.from({ length: 17 }, () => originalText)
    )).rejects.toMatchObject({ code: "INVALID_RECONCILIATION_INPUT" });
    await expect(reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars([
      privacyText,
      errorText
    ])).rejects.toMatchObject({ code: "EVENT_FORK_DETECTED" });

    const otherPair = await completeObservationPair(context, "OTHER_LEDGER");
    const otherSidecar = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
      otherPair.rawA,
      otherPair.rawB,
      context
    );
    await expect(reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars([
      originalText,
      serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(otherSidecar)
    ])).rejects.toMatchObject({ code: "LIFECYCLE_LEDGER_MISMATCH" });

    let getterCalls = 0;
    const accessorArray = [originalText];
    Object.defineProperty(accessorArray, "0", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return originalText;
      }
    });
    await expect(reconcileBaziCitationApplicabilityObservationPairLifecycleSidecars(accessorArray))
      .rejects.toMatchObject({ code: "INVALID_RECONCILIATION_INPUT" });
    expect(getterCalls).toBe(0);
  });

  it("serializes only opaque trusted sidecars without executing forged accessors", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const { rawA, rawB } = await completeObservationPair(context, "SERIALIZER");
    const sidecar = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
      rawA,
      rawB,
      context
    );
    let getterCalls = 0;
    const forged = { ...sidecar } as Record<string, unknown>;
    Object.defineProperty(forged, "profile", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return sidecar.profile;
      }
    });
    expect(() => serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(forged))
      .toThrowError(BaziCitationApplicabilityObservationPairLifecycleError);
    expect(getterCalls).toBe(0);
    expect(() => serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(
      JSON.parse(JSON.stringify(sidecar))
    )).toThrowError(BaziCitationApplicabilityObservationPairLifecycleError);
    expect(serializeBaziCitationApplicabilityObservationPairLifecycleSidecar(sidecar))
      .toContain(sidecar.integrity.sidecarSha256);
  });

  it("rejects lifecycle record, event, ordering, boundary and outer digest tampering", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const { rawA, rawB } = await completeObservationPair(context, "TAMPER");
    const sidecar = await createBaziCitationApplicabilityObservationPairLifecycleSidecar(
      rawA,
      rawB,
      context
    );

    const recordTamper = mutableClone(sidecar);
    recordTamper.records[0].envelope.reviewer.displayName = "forged-display-name";
    await expect(inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      JSON.stringify(recordTamper)
    )).rejects.toMatchObject({ code: "RECORD_INVALID" });

    const eventTamper = mutableClone(sidecar);
    eventTamper.records[0].events[0].eventSha256 = "0".repeat(64);
    await expect(inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      JSON.stringify(eventTamper)
    )).rejects.toMatchObject({ code: "EVENT_CHAIN_MISMATCH" });

    const reordered = mutableClone(sidecar);
    reordered.records = [reordered.records[1], reordered.records[0]];
    await expect(inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      JSON.stringify(reordered)
    )).rejects.toMatchObject({ code: "RECORD_ORDER_MISMATCH" });

    const boundaryTamper = mutableClone(sidecar);
    boundaryTamper.boundary.reviewerIdentityVerified = true as false;
    await expect(inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      JSON.stringify(boundaryTamper)
    )).rejects.toMatchObject({ code: "BOUNDARY_MISMATCH" });

    const digestTamper = mutableClone(sidecar);
    digestTamper.integrity.sidecarSha256 = "0".repeat(64);
    await expect(inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      JSON.stringify(digestTamper)
    )).rejects.toMatchObject({ code: "INTEGRITY_MISMATCH" });
  });

  it("does not create a lifecycle sidecar from a duplicate or partial pair", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const { rawA, rawB } = await completeObservationPair(context, "PAIR_GATE");
    await expect(createBaziCitationApplicabilityObservationPairLifecycleSidecar(
      rawA,
      rawA,
      context
    )).rejects.toMatchObject({ code: "OBSERVATION_PAIR_INVALID" });

    const partial = await completeObservationFile(
      context,
      "reviewer-c",
      "offline-identity-record-c",
      ["applicable_in_bound_context", "unobserved"],
      "PAIR_PARTIAL"
    );
    await expect(createBaziCitationApplicabilityObservationPairLifecycleSidecar(
      partial,
      rawB,
      context
    )).rejects.toMatchObject({ code: "OBSERVATION_PAIR_INVALID" });
  });

  it("normalizes lifecycle parser failures and rejects oversized text before UTF-8 allocation", async () => {
    let caught: unknown;
    try {
      await inspectBaziCitationApplicabilityObservationPairLifecycleSidecar("{");
    } catch (cause) {
      caught = cause;
    }
    expect(caught).toBeInstanceOf(BaziCitationApplicabilityObservationPairLifecycleError);
    expect((caught as BaziCitationApplicabilityObservationPairLifecycleError).code)
      .toBe("INVALID_SIDECAR_TEXT");

    const encode = vi.fn(() => {
      throw new Error("utf8_allocation_must_not_run");
    });
    vi.stubGlobal("TextEncoder", class {
      encode(): Uint8Array {
        return encode();
      }
    });
    try {
      await expect(inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
        "x".repeat(2 * 1024 * 1024 + 1)
      )).rejects.toMatchObject({ code: "INVALID_SIDECAR_TEXT" });
      expect(encode).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("enforces the lifecycle inspector depth budget at the 48/49 boundary", async () => {
    const nestedJson = (depth: number): string => {
      let value: unknown = null;
      for (let index = 0; index < depth; index += 1) value = [value];
      return JSON.stringify(value);
    };

    await expect(inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      nestedJson(48)
    )).rejects.toMatchObject({ code: "UNSAFE_DECLARATIVE_SHAPE" });
    await expect(inspectBaziCitationApplicabilityObservationPairLifecycleSidecar(
      nestedJson(49)
    )).rejects.toMatchObject({ code: "RESOURCE_LIMIT_EXCEEDED" });
  });

  it("rejects non-declarative pair contexts without executing getters or cleaning hidden fields", async () => {
    const context = await buildBaziCitationReviewContextSnapshot(fixture.input);
    const rawA = await completeObservationFile(
      context,
      "reviewer-a",
      "offline-identity-record-a",
      ["applicable_in_bound_context", "not_applicable_in_bound_context"],
      "SAFE_A"
    );
    const rawB = await completeObservationFile(
      context,
      "reviewer-b",
      "offline-identity-record-b",
      ["applicable_in_bound_context", "insufficient_bound_context"],
      "SAFE_B"
    );
    let getterCalls = 0;
    const accessorContext = { ...context } as Record<string, unknown>;
    Object.defineProperty(accessorContext, "profile", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return context.profile;
      }
    });
    await expect(compareBaziCitationApplicabilityObservations(rawA, rawB, accessorContext))
      .rejects.toMatchObject({ code: "INVALID_COMPARISON_INPUT" });
    expect(getterCalls).toBe(0);

    const hiddenFieldContext = { ...context } as Record<string, unknown>;
    Object.defineProperty(hiddenFieldContext, "futureAuthority", {
      configurable: true,
      enumerable: false,
      value: true
    });
    await expect(compareBaziCitationApplicabilityObservations(rawA, rawB, hiddenFieldContext))
      .rejects.toMatchObject({ code: "INVALID_COMPARISON_INPUT" });

    const symbolFieldContext = { ...context } as Record<PropertyKey, unknown>;
    symbolFieldContext[Symbol("future-authority")] = true;
    await expect(compareBaziCitationApplicabilityObservations(rawA, rawB, symbolFieldContext))
      .rejects.toMatchObject({ code: "INVALID_COMPARISON_INPUT" });
  });
});
