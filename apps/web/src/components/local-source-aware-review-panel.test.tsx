import Dexie from "dexie";
import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
  BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE
} from "@hakimi/bazi-review-context";
import { requireEvidenceSubject } from "@hakimi/knowledge-core";
import {
  KnowledgeRepository,
  ResearchDatabase,
  type LocalKnowledgeSourceAwareRetrievalSnapshot
} from "@hakimi/storage";
import type { CitationRecord } from "@hakimi/contracts";
import {
  LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
  LOCAL_BAZI_CITATION_REVIEW_CONTEXT_READ_PROFILE,
  type LocalBaziCitationApplicabilityObservationPreflightProjection,
  type LocalBaziCitationApplicabilityObservationTemplate,
  type LocalBaziCitationReviewContextRead
} from "../lib/bazi-citation-review-context";
import type { KnowledgeReviewContextLocator } from "../lib/knowledge-route";
import { LocalSourceAwareReviewPanel } from "./local-source-aware-review-panel";

const FIRST_SUBJECT_ID = "bazi.pillar.day.ganzhi.v1";
const SECOND_SUBJECT_ID = "bazi.pillar.month.ganzhi.v1";
const MALICIOUS_QUOTE = "<img src=x onerror=globalThis.__sourceAwareExecuted=true><script>bad()</script> 仅作纯文本";
const FIRST_CAPTURE_SENTINEL = "首次捕获绝不能进入页面";
const FIXTURE_NOW = "2026-08-24T00:00:00.000Z";
const REVIEW_CASE_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_REVISION_ID = "22222222-2222-4222-8222-222222222222";
const REVIEW_FIELD_PATH = "pillars.day.ganZhi";
const REVIEW_CONTEXT_DIGEST = "b".repeat(64);
const REVIEW_CONTEXT_LOCATOR: KnowledgeReviewContextLocator = Object.freeze({
  caseId: REVIEW_CASE_ID,
  revisionId: REVIEW_REVISION_ID,
  evidenceSubjectId: FIRST_SUBJECT_ID,
  fieldPath: REVIEW_FIELD_PATH
});

let fixtureDatabase: ResearchDatabase;
let fixtureDatabaseName: string;
let stableSnapshot: LocalKnowledgeSourceAwareRetrievalSnapshot;
let reviewEligibleSnapshot: LocalKnowledgeSourceAwareRetrievalSnapshot;
let candidateSnapshot: LocalKnowledgeSourceAwareRetrievalSnapshot;
let zeroVerifiedSnapshot: LocalKnowledgeSourceAwareRetrievalSnapshot;
let secondSubjectSnapshot: LocalKnowledgeSourceAwareRetrievalSnapshot;

let fetchMock: ReturnType<typeof vi.fn>;
let webSocketMock: ReturnType<typeof vi.fn>;
let sendBeaconMock: ReturnType<typeof vi.fn>;
let originalSendBeaconDescriptor: PropertyDescriptor | undefined;
let xhrSendSpy: ReturnType<typeof vi.spyOn>;
let storageSetItemSpy: ReturnType<typeof vi.spyOn>;
let storageRemoveItemSpy: ReturnType<typeof vi.spyOn>;
let storageClearSpy: ReturnType<typeof vi.spyOn>;
let idbAddSpy: ReturnType<typeof vi.spyOn>;
let idbPutSpy: ReturnType<typeof vi.spyOn>;
let idbDeleteSpy: ReturnType<typeof vi.spyOn>;
let idbClearSpy: ReturnType<typeof vi.spyOn>;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function markCitationVerified(
  database: ResearchDatabase,
  citation: CitationRecord
): Promise<void> {
  await database.citations.put({
    ...citation,
    status: "verified",
    reviewAttestations: [
      { reviewerId: "local-reviewer-a", reviewedAt: FIXTURE_NOW, note: "定位复核" },
      { reviewerId: "local-reviewer-b", reviewedAt: FIXTURE_NOW, note: "摘录复核" }
    ],
    decisionNote: "只确认当前工程引用与原文定位闭合。",
    editVersion: citation.editVersion + 1,
    updatedAt: FIXTURE_NOW
  });
}

function cloneSnapshot(
  snapshot: LocalKnowledgeSourceAwareRetrievalSnapshot
): LocalKnowledgeSourceAwareRetrievalSnapshot {
  return structuredClone(snapshot);
}

function firstCaptureWithSentinel(): LocalKnowledgeSourceAwareRetrievalSnapshot {
  const first = cloneSnapshot(stableSnapshot) as unknown as {
    packet: {
      items: Array<{
        quote: string;
        document: { title: string };
      }>;
    };
  };
  first.packet.items[0].quote = FIRST_CAPTURE_SENTINEL;
  first.packet.items[0].document.title = FIRST_CAPTURE_SENTINEL;
  return first as unknown as LocalKnowledgeSourceAwareRetrievalSnapshot;
}

function uppercaseFirstHexLetter(value: string): string {
  const index = value.search(/[a-f]/u);
  if (index < 0) throw new Error("fixture UUID has no hexadecimal letter to uppercase");
  return `${value.slice(0, index)}${value[index].toUpperCase()}${value.slice(index + 1)}`;
}

function snapshotWithMixedCaseRecordIds() {
  const snapshot = cloneSnapshot(stableSnapshot) as unknown as {
    packet: {
      items: Array<{
        citationId: string;
        document: { documentId: string };
      }>;
      verifiedCitationIds: string[];
    };
    storageSnapshot: {
      bindings: {
        matchingCitationIds: string[];
        verifiedCitationIds: string[];
        documentIds: string[];
        sourceRightsDocumentIds: string[];
      };
    };
  };
  const originalCitationId = snapshot.packet.items[0].citationId;
  const originalDocumentId = snapshot.packet.items[0].document.documentId;
  const citationId = uppercaseFirstHexLetter(originalCitationId);
  const documentId = uppercaseFirstHexLetter(originalDocumentId);

  snapshot.packet.items[0].citationId = citationId;
  snapshot.packet.items[0].document.documentId = documentId;
  snapshot.packet.verifiedCitationIds = snapshot.packet.verifiedCitationIds.map((id) => (
    id === originalCitationId ? citationId : id
  ));
  snapshot.storageSnapshot.bindings.matchingCitationIds =
    snapshot.storageSnapshot.bindings.matchingCitationIds.map((id) => (
      id === originalCitationId ? citationId : id
    ));
  snapshot.storageSnapshot.bindings.verifiedCitationIds =
    snapshot.storageSnapshot.bindings.verifiedCitationIds.map((id) => (
      id === originalCitationId ? citationId : id
    ));
  snapshot.storageSnapshot.bindings.documentIds =
    snapshot.storageSnapshot.bindings.documentIds.map((id) => (
      id === originalDocumentId ? documentId : id
    ));
  snapshot.storageSnapshot.bindings.sourceRightsDocumentIds =
    snapshot.storageSnapshot.bindings.sourceRightsDocumentIds.map((id) => (
      id === originalDocumentId ? documentId : id
    ));

  return { snapshot, citationId, documentId };
}

function readTwice(snapshot: LocalKnowledgeSourceAwareRetrievalSnapshot) {
  return vi.fn().mockResolvedValue(snapshot);
}

function reviewContextReadFor(
  snapshot: LocalKnowledgeSourceAwareRetrievalSnapshot,
  suppliedStorageSidecarSnapshotSha256 = snapshot.storageSnapshot.snapshotSha256,
  expectedPriorContextPayloadSha256: string | null = null
): LocalBaziCitationReviewContextRead {
  const worksetSnapshotSha256 = "a".repeat(64);
  return {
    profile: LOCAL_BAZI_CITATION_REVIEW_CONTEXT_READ_PROFILE,
    releaseModuleBinding: {
      dbGeneration: "legacy-v13",
      databaseName: "fixture-review-database",
      targetSchema: 13,
      migrationId: null,
      buildVersion: null,
      storageManifestDigest: null,
      releaseEvidenceId: null,
      releaseEvidenceBound: false,
      expectedLegacyTupleMatched: true,
      engineeringEvidenceOnly: true
    },
    repositoryReadBinding: {
      databaseName: "fixture-review-database",
      targetSchemaVersion: 13,
      caseBundleReadPasses: 2,
      knowledgeWorksetReadPasses: 2,
      secondWorksetReadUsedExpectedDigest: true,
      worksetSnapshotSha256,
      firstContextPayloadSha256: REVIEW_CONTEXT_DIGEST,
      secondContextPayloadSha256: REVIEW_CONTEXT_DIGEST,
      expectedPriorContextPayloadSha256,
      expectedPriorContextMatched: expectedPriorContextPayloadSha256 === null ? null : true
    },
    boundary: {
      locatorOnlyCallerInput: true,
      fullCaseOrRevisionAcceptedFromCaller: false,
      fullWorksetAcceptedFromCaller: false,
      caseBundleRepositoryReadPerformed: true,
      knowledgeWorksetRepositoryReadPerformed: true,
      twoPassDigestRevalidationPerformed: true,
      sameConfiguredDatabaseInstanceVerified: true,
      repositoryConfigurationMatchedReleaseNameAndTargetSchema: true,
      storageReadPerformed: true,
      firstPassDiscardedBeforeReturn: true,
      returnedContextBuiltFromSecondPass: true,
      caseBundleFreshRereadPerformed: true,
      worksetFreshRereadWithExpectedDigestPerformed: true,
      worksetDigestFreshnessRevalidatedBetweenPasses: true,
      continuousFreshnessAttested: false,
      currentAtReturnAttested: false,
      caseBundleAtomicSnapshotVerified: false,
      crossRepositoryAtomicSnapshotVerified: false,
      caseRevisionAndKnowledgeAtomicCaptureVerified: false,
      mutationEpochRevalidationPerformed: false,
      mutationEpochBypassed: false,
      rawBirthInputCopied: false,
      caseAliasTagsNotesCopied: false,
      sourceTextReturned: false,
      localSourceTextProcessedTransiently: true,
      containsDerivedSensitiveChartData: true,
      sourceAuthenticityClaimed: false,
      humanReviewPerformed: false,
      reviewerIdentityVerified: false,
      externalProviderUseAuthorized: false,
      networkTransmissionPerformed: false,
      networkTransmissionAuthorized: false,
      storageMutationPerformed: false,
      schemaOrReleaseIdentityMutationPerformed: false,
      caseOrRevisionMutationPerformed: false,
      publicExportAuthorized: false,
      publicReleaseAuthorized: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      authenticityClaimed: false,
      result: null
    },
    context: {
      profile: BAZI_CITATION_REVIEW_CONTEXT_SNAPSHOT_PROFILE,
      releaseBinding: {
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null,
        callerProvidedExpectedValuesMatched: true,
        runtimeReleaseIdentityAttested: false,
        storageAttestedDbGeneration: false,
        storageAttestedMigrationIdentity: false,
        engineeringEvidenceOnly: true
      },
      caseBinding: {
        caseId: REVIEW_CASE_ID,
        deletedInSuppliedCaseSnapshot: false,
        selectedRevisionWasLatestInSuppliedCaseSnapshot: true,
        repositoryFreshnessAttested: false
      },
      revisionBinding: {
        revisionId: REVIEW_REVISION_ID,
        revisionNumber: 7,
        revisionSnapshotDigest: "d".repeat(64),
        storedResultHash: "e".repeat(64),
        replayedResultHash: "e".repeat(64),
        replayProjectionDigest: "1".repeat(64),
        replayExecutorId: "fixture:revision-replay",
        engine: {
          name: "hakimi-bazi-core",
          version: "0.2.0",
          upstreamName: "lunar-typescript",
          upstreamVersion: "1.8.6",
          upstreamTagCommit: "fixture-upstream-commit",
          upstreamIntegrity: "fixture-upstream-integrity"
        },
        tzdbVersion: "fixture-tzdb"
      },
      subjectBinding: {
        evidenceSubjectId: FIRST_SUBJECT_ID,
        registryVersion: "fixture-registry/1",
        category: "calendar_fact",
        label: "日柱干支",
        fieldPath: REVIEW_FIELD_PATH,
        algorithmIds: ["fixture:day-ganzhi"],
        ruleProfilePaths: ["calendar.dayBoundary"]
      },
      factProjection: {
        items: [{
          fieldPath: REVIEW_FIELD_PATH,
          value: "甲子",
          provenance: {
            field: REVIEW_FIELD_PATH,
            kind: "calendar_fact",
            algorithmId: "fixture:day-ganzhi",
            verificationStatus: "gold_verified"
          }
        }],
        projectionSha256: "2".repeat(64)
      },
      ruleProjection: {
        profileId: "ziping-working-zi-start-23",
        profileVersion: "1.0.0",
        profileStatus: "working_default",
        ruleProfileDigest: "3".repeat(64),
        revisionRulePackBinding: null,
        liveActiveRulePackReadPerformed: false,
        items: [{ ruleProfilePath: "calendar.dayBoundary", value: "zi_start_23" }],
        projectionSha256: "4".repeat(64)
      },
      worksetBinding: {
        worksetSnapshotVersion: "fixture-workset/1",
        worksetSnapshotSha256,
        suppliedStorageSidecarSnapshotVersion: "fixture-storage-sidecar/1",
        suppliedStorageSidecarSnapshotSha256,
        packetProjectionVersion: "fixture-packet/1",
        packetPayloadSha256: snapshot.packet.integrity.payloadSha256,
        matchingSourceSetSha256: snapshot.packet.sourceSet.matchingSourceSetSha256,
        inventoryProjectionVersion: "fixture-inventory/1",
        inventoryPayloadSha256: "5".repeat(64),
        citationIdsWithStoredVerifiedStatus: [...snapshot.packet.verifiedCitationIds],
        pairCount: snapshot.packet.verifiedCitationIds.length * (snapshot.packet.verifiedCitationIds.length - 1) / 2,
        reviewGateStatus: "pending_human_review"
      },
      displayContextBinding: {
        projectionVersion: "0.1.0",
        payloadSha256: "c".repeat(64)
      },
      boundary: {
        exactRevisionReplayMatched: true,
        registeredFieldProjectionBound: true,
        revisionFrozenRuleProjectionBound: true,
        worksetFourLayerDigestsRecomputed: true,
        rawBirthInputCopied: false,
        caseAliasTagsNotesCopied: false,
        sourceTextCopiedIntoContextSnapshot: false,
        containsDerivedSensitiveChartData: true,
        crossRepositoryAtomicSnapshotVerified: false,
        caseRevisionAndKnowledgeAtomicCaptureVerified: false,
        suppliedWorksetStorageOriginAttested: false,
        suppliedCaseSnapshotFreshnessAttested: false,
        runtimeReleaseIdentityAttested: false,
        worksetFreshnessRevalidatedByBuilder: false,
        reviewMayBeginWithoutFreshnessRevalidation: false,
        mutationEpochRevalidationPerformed: false,
        liveActiveRulePackReadPerformed: false,
        interpretationEnvelopeUsed: false,
        chartApplicabilityAssessed: false,
        citationSemanticApplicabilityAssessed: false,
        citationSetConflictReviewPerformed: false,
        semanticConflictResolutionPerformed: false,
        humanReviewPerformed: false,
        reviewerIdentityVerified: false,
        humanReviewAuthenticityVerified: false,
        sourceAuthenticityClaimed: false,
        sourceTextInstructionAuthority: false,
        storageReadPerformed: false,
        externalProviderUseAuthorized: false,
        networkTransmissionPerformed: false,
        networkTransmissionAuthorized: false,
        storageMutationPerformed: false,
        chartMutationPerformed: false,
        caseOrRevisionMutationPerformed: false,
        publicExportAuthorized: false,
        expertTruthClaimed: false,
        scientificValidityClaimed: false,
        formalActivationAllowed: false,
        authenticityClaimed: false,
        result: null
      },
      integrity: {
        hashAlgorithm: "SHA-256",
        payloadSha256: REVIEW_CONTEXT_DIGEST,
        authenticityClaimed: false
      }
    },
    integrity: {
      hashAlgorithm: "SHA-256",
      payloadSha256: "6".repeat(64),
      authenticityClaimed: false
    }
  } satisfies LocalBaziCitationReviewContextRead;
}

const applicabilityTemplateBoundary = Object.freeze({
  contextFreshRereadPerformed: true,
  priorDisplayedContextDigestMatched: true,
  sourceTextIncluded: false,
  fieldValueIncluded: false,
  rawBirthInputIncluded: false,
  containsDerivedSensitiveChartBinding: true,
  storageMutationPerformed: false,
  mutationEpochBypassed: false,
  publicExportAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false
} as const);

const applicabilityPreflightBoundary = Object.freeze({
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
} as const);

const applicabilityFileBoundary = Object.freeze({
  contextDigestBindingRequired: true,
  displayContextDigestBindingRequired: true,
  allVerifiedCitationIdsAddressed: true,
  reviewerIdentityBasis: "self_declared_not_verified",
  reviewerIdentityVerified: false,
  humanReviewAuthenticityVerified: false,
  digitalSignaturePresent: false,
  digitalSignatureVerified: false,
  digestIsDigitalSignature: false,
  sourceTextCopied: false,
  rawBirthInputCopied: false,
  caseAliasTagsNotesCopied: false,
  fieldValueCopied: false,
  containsDerivedSensitiveChartBinding: true,
  freeformReviewerTextAcceptedAsUntrustedPlainText: true,
  sourceTextInstructionAuthority: false,
  promptInjectionScreeningPerformed: false,
  chartApplicabilityAssessed: false,
  citationSemanticApplicabilityAssessed: false,
  semanticConflictResolutionPerformed: false,
  winnerSelectionPerformed: false,
  consensusClaimed: false,
  networkTransmissionPerformed: false,
  networkTransmissionAuthorized: false,
  storageMutationPerformed: false,
  chartMutationPerformed: false,
  caseOrRevisionMutationPerformed: false,
  mutationEpochRevalidationPerformed: false,
  mutationEpochBypassed: false,
  publicExportAuthorized: false,
  publicReleaseAuthorized: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  automaticPromotionAllowed: false,
  authenticityClaimed: false,
  result: null
} as const);

function applicabilityBindingFor(snapshot: LocalKnowledgeSourceAwareRetrievalSnapshot) {
  return Object.freeze({
    caseId: REVIEW_CASE_ID,
    revisionId: REVIEW_REVISION_ID,
    evidenceSubjectId: FIRST_SUBJECT_ID,
    fieldPath: REVIEW_FIELD_PATH,
    contextPayloadSha256: REVIEW_CONTEXT_DIGEST,
    displayContextBindingSha256: "c".repeat(64),
    worksetSnapshotSha256: "a".repeat(64),
    matchingSourceSetSha256: snapshot.packet.sourceSet.matchingSourceSetSha256,
    citationCount: snapshot.packet.verifiedCitationIds.length
  });
}

function applicabilityTemplateFor(
  snapshot: LocalKnowledgeSourceAwareRetrievalSnapshot
): LocalBaziCitationApplicabilityObservationTemplate {
  const binding = applicabilityBindingFor(snapshot);
  const content = JSON.stringify({
    profile: BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
    contextBinding: {
      releaseIdentity: { dbGeneration: "legacy-v13", targetSchema: 13, migrationId: null },
      caseId: binding.caseId,
      revisionId: binding.revisionId,
      evidenceSubjectId: binding.evidenceSubjectId,
      fieldPath: binding.fieldPath,
      contextPayloadSha256: binding.contextPayloadSha256,
      displayContextBindingSha256: binding.displayContextBindingSha256,
      revisionSnapshotSha256: "d".repeat(64),
      factProjectionSha256: "2".repeat(64),
      ruleProjectionSha256: "4".repeat(64),
      worksetSnapshotSha256: binding.worksetSnapshotSha256,
      packetPayloadSha256: snapshot.packet.integrity.payloadSha256,
      matchingSourceSetSha256: binding.matchingSourceSetSha256,
      ruleProfile: {
        profileId: "ziping-working-zi-start-23",
        profileVersion: "1.0.0",
        profileStatus: "working_default",
        ruleProfileDigest: "3".repeat(64),
        revisionRulePackBinding: null
      },
      citationIds: [...snapshot.packet.verifiedCitationIds]
    },
    reviewer: {
      reviewerId: "",
      displayName: "",
      affiliation: "",
      expertiseStatement: "",
      identityEvidenceReference: "",
      identityVerified: false
    },
    session: { observedAt: "", methodology: "", traditionScope: "", generalNotes: "" },
    observations: snapshot.packet.verifiedCitationIds.map((citationId, index) => ({
      order: index + 1,
      citationId,
      observation: "unobserved",
      reason: "",
      applicabilityConditions: "",
      counterexamples: "",
      relatedCitationIds: [],
      additionalSourceUrls: []
    })),
    declaredCounts: {
      total: snapshot.packet.verifiedCitationIds.length,
      unobserved: snapshot.packet.verifiedCitationIds.length,
      applicableInBoundContext: 0,
      partiallyApplicableInBoundContext: 0,
      notApplicableInBoundContext: 0,
      insufficientBoundContext: 0
    },
    boundary: applicabilityFileBoundary
  });
  return {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
    fileName: "hakimi-bazi-citation-applicability-observation-v01.json",
    content,
    binding,
    boundary: applicabilityTemplateBoundary
  };
}

function applicabilityPreflightFor(
  snapshot: LocalKnowledgeSourceAwareRetrievalSnapshot
): LocalBaziCitationApplicabilityObservationPreflightProjection {
  const total = snapshot.packet.verifiedCitationIds.length;
  return {
    profile: LOCAL_BAZI_CITATION_APPLICABILITY_OBSERVATION_PROFILE,
    binding: applicabilityBindingFor(snapshot),
    reviewer: {
      reviewerId: "self-declared-local-reviewer",
      displayName: "本机观察者甲",
      affiliation: "自述研究组",
      identityVerified: false
    },
    counts: {
      total,
      unobserved: 0,
      applicableInBoundContext: 1,
      partiallyApplicableInBoundContext: total - 1,
      notApplicableInBoundContext: 0,
      insufficientBoundContext: 0
    },
    observedCount: total,
    allCitationsObserved: true,
    reviewerAttributionComplete: true,
    recordSha256: "7".repeat(64),
    boundary: applicabilityPreflightBoundary
  };
}

function clickRead() {
  fireEvent.click(screen.getByRole("button", { name: "读取并复核本机来源" }));
}

function expectNoWritesOrNetwork() {
  expect(fetchMock).not.toHaveBeenCalled();
  expect(webSocketMock).not.toHaveBeenCalled();
  expect(sendBeaconMock).not.toHaveBeenCalled();
  expect(xhrSendSpy).not.toHaveBeenCalled();
  expect(storageSetItemSpy).not.toHaveBeenCalled();
  expect(storageRemoveItemSpy).not.toHaveBeenCalled();
  expect(storageClearSpy).not.toHaveBeenCalled();
  expect(idbAddSpy).not.toHaveBeenCalled();
  expect(idbPutSpy).not.toHaveBeenCalled();
  expect(idbDeleteSpy).not.toHaveBeenCalled();
  expect(idbClearSpy).not.toHaveBeenCalled();
}

beforeAll(async () => {
  fixtureDatabaseName = `hakimi-local-source-aware-panel-${crypto.randomUUID()}`;
  fixtureDatabase = new ResearchDatabase(fixtureDatabaseName, { targetSchema: 13 });
  const knowledge = new KnowledgeRepository(fixtureDatabase, () => FIXTURE_NOW);
  const firstContent = `# 本机来源\n${MALICIOUS_QUOTE}\n尚未复核的候选摘录`;
  const firstDocument = await knowledge.createDocument({
    title: "第二次复核后的本机资料",
    author: "本地研究者",
    edition: "测试版",
    sourceNote: "隔离测试夹具",
    fileName: "local-source-aware.md",
    format: "markdown",
    content: firstContent,
    byteSize: new TextEncoder().encode(firstContent).byteLength
  });
  const verifiedBase = await knowledge.createCitation({
    documentId: firstDocument.id,
    locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
    annotation: "待转换为核验引用",
    targets: [{ kind: "evidence_subject", subjectId: FIRST_SUBJECT_ID }]
  });

  zeroVerifiedSnapshot = cloneSnapshot(
    await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(FIRST_SUBJECT_ID)
  );
  await markCitationVerified(fixtureDatabase, verifiedBase);
  stableSnapshot = cloneSnapshot(
    await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(FIRST_SUBJECT_ID)
  );

  const candidate = await knowledge.createCitation({
    documentId: firstDocument.id,
    locator: { sectionId: "section-1", startLine: 3, endLine: 3 },
    annotation: "保留为用户候选",
    targets: [{ kind: "evidence_subject", subjectId: FIRST_SUBJECT_ID }]
  });
  candidateSnapshot = cloneSnapshot(
    await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(FIRST_SUBJECT_ID)
  );
  await markCitationVerified(fixtureDatabase, candidate);
  reviewEligibleSnapshot = cloneSnapshot(
    await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(FIRST_SUBJECT_ID)
  );

  const secondContent = "# 月柱来源\n第二主题的核验摘录";
  const secondDocument = await knowledge.createDocument({
    title: "第二主题资料",
    author: "另一位本地研究者",
    edition: "第一版",
    sourceNote: "隔离测试夹具",
    fileName: "second-subject.md",
    format: "markdown",
    content: secondContent,
    byteSize: new TextEncoder().encode(secondContent).byteLength
  });
  const secondCitation = await knowledge.createCitation({
    documentId: secondDocument.id,
    locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
    annotation: "第二主题核验引用",
    targets: [{ kind: "evidence_subject", subjectId: SECOND_SUBJECT_ID }]
  });
  await markCitationVerified(fixtureDatabase, secondCitation);
  secondSubjectSnapshot = cloneSnapshot(
    await knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(SECOND_SUBJECT_ID)
  );
}, 60_000);

afterAll(async () => {
  fixtureDatabase.close();
  await Dexie.delete(fixtureDatabaseName);
});

beforeEach(() => {
  fetchMock = vi.fn();
  webSocketMock = vi.fn();
  sendBeaconMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("WebSocket", webSocketMock);
  originalSendBeaconDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "sendBeacon");
  Object.defineProperty(window.navigator, "sendBeacon", {
    configurable: true,
    writable: true,
    value: sendBeaconMock
  });
  xhrSendSpy = vi.spyOn(XMLHttpRequest.prototype, "send");
  storageSetItemSpy = vi.spyOn(Storage.prototype, "setItem");
  storageRemoveItemSpy = vi.spyOn(Storage.prototype, "removeItem");
  storageClearSpy = vi.spyOn(Storage.prototype, "clear");
  idbAddSpy = vi.spyOn(IDBObjectStore.prototype, "add");
  idbPutSpy = vi.spyOn(IDBObjectStore.prototype, "put");
  idbDeleteSpy = vi.spyOn(IDBObjectStore.prototype, "delete");
  idbClearSpy = vi.spyOn(IDBObjectStore.prototype, "clear");
});

afterEach(() => {
  expectNoWritesOrNetwork();
  if (originalSendBeaconDescriptor) {
    Object.defineProperty(window.navigator, "sendBeacon", originalSendBeaconDescriptor);
  } else {
    Reflect.deleteProperty(window.navigator, "sendBeacon");
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "__sourceAwareExecuted");
});

describe("LocalSourceAwareReviewPanel", () => {
  it("stays idle in StrictMode without reading, writing, or using the network", () => {
    const readSnapshot = vi.fn();
    const { container } = render(
      <StrictMode>
        <LocalSourceAwareReviewPanel
          subjectId={FIRST_SUBJECT_ID}
          readSnapshot={readSnapshot}
        />
      </StrictMode>
    );

    expect(readSnapshot).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "读取并复核本机来源" })).toBeTruthy();
    expect(screen.queryByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    })).toBeNull();
    expect(container.querySelector("[data-state='idle']")).toBeTruthy();
    expect(container.querySelector("[data-release-identity='legacy-v13']")).toBeTruthy();
    expect(container.querySelector("[data-target-schema='13']")).toBeTruthy();
    expect(container.querySelector("[data-migration-id='null']")).toBeTruthy();
    expect(container.querySelector("[data-mutation-epoch-bypassed='false']")).toBeTruthy();
  });

  it("keeps a locator-bound context idle until the user explicitly starts both read paths", () => {
    const readSnapshot = vi.fn();
    const readReviewContext = vi.fn();
    const { container } = render(
      <StrictMode>
        <LocalSourceAwareReviewPanel
          subjectId={FIRST_SUBJECT_ID}
          reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
          readSnapshot={readSnapshot}
          readReviewContext={readReviewContext}
        />
      </StrictMode>
    );

    expect(readSnapshot).not.toHaveBeenCalled();
    expect(readReviewContext).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" })).toBeTruthy();
    expect(container.querySelector("[data-review-context-requested='true']")).toBeTruthy();
    expect(container.querySelector("[data-record-write-performed='false']")).toBeTruthy();
  });

  it("binds only the minimal second-pass context after all three source digests match", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn((_locator, options) => Promise.resolve(reviewContextReadFor(
      reviewEligibleSnapshot,
      reviewEligibleSnapshot.storageSnapshot.snapshotSha256,
      options?.expectedPriorContextPayloadSha256 ?? null
    )));
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    expect(readReviewContext).toHaveBeenCalledTimes(1);
    expect(readSnapshot).toHaveBeenCalledTimes(1);

    const context = await screen.findByRole("region", { name: "Revision 字段最小只读上下文" });
    expect(within(context).getByText("甲子")).toBeTruthy();
    expect(within(context).getAllByText("fixture:day-ganzhi")).toHaveLength(2);
    expect(within(context).getByText(/Revision 保存状态：gold_verified/)).toBeTruthy();
    expect(within(context).getByText(/不证明返回时最新/)).toBeTruthy();
    expect(within(context).getByText(/mutation epoch 未复核且未绕过/)).toBeTruthy();
    expect(readReviewContext).toHaveBeenNthCalledWith(1, REVIEW_CONTEXT_LOCATOR, undefined);
    expect(container.querySelector("[data-review-context-bound='true']")).toBeTruthy();

    const [recordLink] = screen.getAllByRole("link", { name: "打开本机引用记录" });
    const recordUrl = new URL(recordLink.getAttribute("href")!, "https://hakimi.test");
    expect(recordUrl.searchParams.get("review")).toBe(
      `revision_field:${REVIEW_CASE_ID}:${REVIEW_REVISION_ID}:${REVIEW_FIELD_PATH}`
    );

    fireEvent.click(screen.getByRole("button", { name: "重新读取并复核" }));
    await waitFor(() => expect(readReviewContext).toHaveBeenCalledTimes(2));
    expect(readReviewContext).toHaveBeenNthCalledWith(2, REVIEW_CONTEXT_LOCATOR, {
      expectedPriorContextPayloadSha256: REVIEW_CONTEXT_DIGEST
    });
    expect(await screen.findByRole("region", { name: "Revision 字段最小只读上下文" })).toBeTruthy();
  });

  it("loads the dual-observation leaf only after an explicit open action and clears it explicitly", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(reviewEligibleSnapshot));
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    const observation = await screen.findByRole("region", { name: "字段来源适用性人工观察" });
    expect(screen.queryByRole("region", { name: "双份引用适用性观察机械并列" })).toBeNull();
    const openButton = within(observation).getByRole("button", { name: "打开双份并列复核" });
    expect(openButton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(openButton);
    expect(await screen.findByRole("region", { name: "双份引用适用性观察机械并列" })).toBeTruthy();
    expect(within(observation).getByRole("button", { name: "打开本机观察编辑器" }))
      .toHaveProperty("disabled", true);
    const closeButton = within(observation).getByRole("button", { name: "关闭并清除双份选择" });
    expect(closeButton.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(closeButton);
    await waitFor(() => expect(
      screen.queryByRole("region", { name: "双份引用适用性观察机械并列" })
    ).toBeNull());
    expect(within(observation).getByRole("button", { name: "打开双份并列复核" })
      .getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the in-memory observation editor only after a bound ReviewContext", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(reviewEligibleSnapshot));
    const prepareApplicabilityObservation = vi.fn().mockResolvedValue(
      applicabilityTemplateFor(reviewEligibleSnapshot)
    );
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
        prepareApplicabilityObservation={prepareApplicabilityObservation}
      />
    );

    expect(screen.queryByRole("button", { name: "打开本机观察编辑器" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    expect(await screen.findByRole("region", { name: "字段来源适用性人工观察" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "打开本机观察编辑器" }));
    expect(await screen.findByRole("region", { name: "本机字段来源适用性观察编辑器" })).toBeTruthy();
    expect(prepareApplicabilityObservation).toHaveBeenCalledWith(
      REVIEW_CONTEXT_LOCATOR,
      REVIEW_CONTEXT_DIGEST
    );
    expect(screen.getByText("空白内存草稿")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(container.querySelector("[data-storage-mutation-performed='false']")).toBeTruthy();
    expect(container.querySelector("[data-applicability-observation-storage-mutation='false']"))
      .toBeTruthy();
    expect(container.querySelector("[data-applicability-observation-auto-promotion='false']"))
      .toBeTruthy();
  });

  it("refuses a forged blank template that smuggles prose or relaxes its file boundary", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(reviewEligibleSnapshot));
    const forged = structuredClone(applicabilityTemplateFor(reviewEligibleSnapshot)) as unknown as {
      content: string;
    };
    const forgedContent = JSON.parse(forged.content) as {
      session: { generalNotes: string };
      boundary: { sourceTextCopied: boolean };
    };
    forgedContent.session.generalNotes = "PRIVATE_TEMPLATE_PROSE_MUST_NOT_ENTER_BLOB";
    forgedContent.boundary.sourceTextCopied = true;
    forged.content = JSON.stringify(forgedContent);
    const prepareApplicabilityObservation = vi.fn().mockResolvedValue(forged);
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
        prepareApplicabilityObservation={prepareApplicabilityObservation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    const observation = await screen.findByRole("region", { name: "字段来源适用性人工观察" });
    fireEvent.click(within(observation).getByRole("button", { name: "打开本机观察编辑器" }));

    expect(await within(observation).findByText("没有采用观察文件")).toBeTruthy();
    expect(within(observation).getByText(/模板契约或最小导出投影未闭合/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("PRIVATE_TEMPLATE_PROSE_MUST_NOT_ENTER_BLOB")).toBeNull();
  });

  it("preserves and freezes a dirty editor draft when the locator changes instead of key-remounting it away", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(reviewEligibleSnapshot));
    const prepareApplicabilityObservation = vi.fn().mockResolvedValue(
      applicabilityTemplateFor(reviewEligibleSnapshot)
    );
    const { rerender } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
        prepareApplicabilityObservation={prepareApplicabilityObservation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    const observation = await screen.findByRole("region", { name: "字段来源适用性人工观察" });
    fireEvent.click(within(observation).getByRole("button", { name: "打开本机观察编辑器" }));
    const displayName = await screen.findByLabelText("显示名");
    fireEvent.change(displayName, { target: { value: "不得静默丢失的草稿" } });

    const nextLocator = {
      ...REVIEW_CONTEXT_LOCATOR,
      revisionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    } as const;
    rerender(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={nextLocator}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
        prepareApplicabilityObservation={prepareApplicabilityObservation}
      />
    );

    expect(await screen.findByText(/locator 已变化/)).toBeTruthy();
    expect(screen.getByLabelText("显示名")).toHaveProperty("value", "不得静默丢失的草稿");
    expect(screen.getAllByText("旧草稿已冻结").length).toBeGreaterThan(0);
    expect((screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });

  it("preflights a picked observation against the displayed digest and exposes no freeform prose", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(reviewEligibleSnapshot));
    const privateFileText = JSON.stringify({
      secretReason: "PRIVATE_OBSERVATION_REASON_MUST_NOT_RENDER",
      counterexample: "PRIVATE_COUNTEREXAMPLE_MUST_NOT_RENDER"
    });
    const pickApplicabilityObservationFile = vi.fn().mockResolvedValue({
      name: "local-observation.json",
      text: privateFileText
    });
    const preflightApplicabilityObservation = vi.fn().mockResolvedValue(
      applicabilityPreflightFor(reviewEligibleSnapshot)
    );
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
        pickApplicabilityObservationFile={pickApplicabilityObservationFile}
        preflightApplicabilityObservation={preflightApplicabilityObservation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    const observation = await screen.findByRole("region", { name: "字段来源适用性人工观察" });
    fireEvent.click(within(observation).getByRole("button", { name: "选择观察文件预检" }));

    expect(await within(observation).findByText("全部 citation 已填写自述观察")).toBeTruthy();
    expect(within(observation).getByText(/本机观察者甲（自述记录，现实身份未核验）/))
      .toBeTruthy();
    expect(within(observation).getByText("2 / 2")).toBeTruthy();
    expect(preflightApplicabilityObservation).toHaveBeenCalledWith(
      REVIEW_CONTEXT_LOCATOR,
      REVIEW_CONTEXT_DIGEST,
      privateFileText
    );
    expect(screen.queryByText("PRIVATE_OBSERVATION_REASON_MUST_NOT_RENDER")).toBeNull();
    expect(screen.queryByText("PRIVATE_COUNTEREXAMPLE_MUST_NOT_RENDER")).toBeNull();
  });

  it("rejects a preflight projection whose context digest drifted", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(reviewEligibleSnapshot));
    const stale = structuredClone(applicabilityPreflightFor(reviewEligibleSnapshot)) as unknown as {
      binding: { contextPayloadSha256: string };
    };
    stale.binding.contextPayloadSha256 = "f".repeat(64);
    const preflightApplicabilityObservation = vi.fn().mockResolvedValue(stale);
    const pickApplicabilityObservationFile = vi.fn().mockResolvedValue({
      name: "stale-observation.json",
      text: "{}"
    });
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
        pickApplicabilityObservationFile={pickApplicabilityObservationFile}
        preflightApplicabilityObservation={preflightApplicabilityObservation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    const observation = await screen.findByRole("region", { name: "字段来源适用性人工观察" });
    fireEvent.click(within(observation).getByRole("button", { name: "选择观察文件预检" }));

    expect(await within(observation).findByText("没有采用观察文件")).toBeTruthy();
    expect(within(observation).getByText(/未通过当前上下文/)).toBeTruthy();
    expect(within(observation).queryByText("全部 citation 已填写自述观察")).toBeNull();
  });

  it("rejects a preflight projection that claims automatic activation authority", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(reviewEligibleSnapshot));
    const unauthorized = structuredClone(
      applicabilityPreflightFor(reviewEligibleSnapshot)
    ) as unknown as {
      boundary: { automaticPromotionAllowed: boolean };
    };
    unauthorized.boundary.automaticPromotionAllowed = true;
    const preflightApplicabilityObservation = vi.fn().mockResolvedValue(unauthorized);
    const pickApplicabilityObservationFile = vi.fn().mockResolvedValue({
      name: "unauthorized-observation.json",
      text: "{}"
    });
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
        pickApplicabilityObservationFile={pickApplicabilityObservationFile}
        preflightApplicabilityObservation={preflightApplicabilityObservation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    const observation = await screen.findByRole("region", { name: "字段来源适用性人工观察" });
    fireEvent.click(within(observation).getByRole("button", { name: "选择观察文件预检" }));

    expect(await within(observation).findByText("没有采用观察文件")).toBeTruthy();
    expect(within(observation).getByText(/永久只读边界预检/)).toBeTruthy();
    expect(within(observation).queryByText("本机观察者甲")).toBeNull();
  });

  it("withdraws the observation projection when the page lifecycle invalidates its ReviewContext", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(reviewEligibleSnapshot));
    const pickApplicabilityObservationFile = vi.fn().mockResolvedValue({
      name: "current-observation.json",
      text: "{}"
    });
    const preflightApplicabilityObservation = vi.fn().mockResolvedValue(
      applicabilityPreflightFor(reviewEligibleSnapshot)
    );
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
        pickApplicabilityObservationFile={pickApplicabilityObservationFile}
        preflightApplicabilityObservation={preflightApplicabilityObservation}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    const observation = await screen.findByRole("region", { name: "字段来源适用性人工观察" });
    fireEvent.click(within(observation).getByRole("button", { name: "选择观察文件预检" }));
    expect(await within(observation).findByText("全部 citation 已填写自述观察")).toBeTruthy();

    act(() => {
      window.dispatchEvent(new Event("pageshow"));
    });

    expect(screen.queryByRole("region", { name: "字段来源适用性人工观察" })).toBeNull();
    expect(screen.queryByText("全部 citation 已填写自述观察")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("必须重新主动读取");
  });

  it("withdraws a prior context on stale refresh and does not reuse its digest again", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn()
      .mockResolvedValueOnce(reviewContextReadFor(reviewEligibleSnapshot))
      .mockRejectedValueOnce(new Error("prior context stale"))
      .mockResolvedValueOnce(reviewContextReadFor(reviewEligibleSnapshot));
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    expect(await screen.findByRole("region", { name: "Revision 字段最小只读上下文" }))
      .toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "重新读取并复核" }));
    expect(await screen.findByText(/ReviewContext 未形成，未绑定该 Case\/Revision/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Revision 字段最小只读上下文" })).toBeNull();
    expect(readReviewContext).toHaveBeenNthCalledWith(2, REVIEW_CONTEXT_LOCATOR, {
      expectedPriorContextPayloadSha256: REVIEW_CONTEXT_DIGEST
    });

    fireEvent.click(screen.getByRole("button", { name: "重新读取并复核" }));
    await waitFor(() => expect(readReviewContext).toHaveBeenCalledTimes(3));
    expect(readReviewContext).toHaveBeenNthCalledWith(3, REVIEW_CONTEXT_LOCATOR, undefined);
    expect(await screen.findByRole("region", { name: "Revision 字段最小只读上下文" }))
      .toBeTruthy();
  });

  it("keeps theme-level sources visible but refuses Case/Revision binding when a cross-digest differs", async () => {
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(
      reviewContextReadFor(reviewEligibleSnapshot, "f".repeat(64))
    );
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));

    expect(await screen.findByText(/三组摘要或最小显示契约不一致/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Revision 字段最小只读上下文" })).toBeNull();
    expect(screen.getByText(MALICIOUS_QUOTE)).toBeTruthy();
  });

  it("rejects a future facade profile field instead of accepting a partial display contract", async () => {
    const forged = structuredClone(reviewContextReadFor(reviewEligibleSnapshot)) as unknown as {
      profile: Record<string, unknown>;
    };
    forged.profile.futureDisplayAuthority = true;
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(
      forged as unknown as LocalBaziCitationReviewContextRead
    );
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));

    expect(await screen.findByText(/三组摘要或最小显示契约不一致/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Revision 字段最小只读上下文" })).toBeNull();
  });

  it("independently rejects a fulfilled context adapter when candidate records remain", async () => {
    const readSnapshot = readTwice(candidateSnapshot);
    const readReviewContext = vi.fn().mockResolvedValue(reviewContextReadFor(candidateSnapshot));
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));

    expect(await screen.findByText(/三组摘要或最小显示契约不一致/)).toBeTruthy();
    expect(screen.getByText(/仍有 1 条候选引用未复核/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Revision 字段最小只读上下文" })).toBeNull();
  });

  it("shows candidate-aware theme sources without binding when the facade closes the context gate", async () => {
    const readSnapshot = readTwice(candidateSnapshot);
    const readReviewContext = vi.fn().mockRejectedValue(new Error("blocked"));
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));

    expect(await screen.findByText(/ReviewContext 未形成，未绑定该 Case\/Revision/)).toBeTruthy();
    expect(screen.getByText(/仍有 1 条候选引用未复核/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Revision 字段最小只读上下文" })).toBeNull();
  });

  it("reads exactly twice, binds the second call to the first digest, and displays only the second projection", async () => {
    const first = firstCaptureWithSentinel();
    const readSnapshot = vi.fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(stableSnapshot);
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    const subject = requireEvidenceSubject(FIRST_SUBJECT_ID);
    const result = await screen.findByRole("region", { name: subject.label });
    expect(readSnapshot.mock.calls).toEqual([
      [FIRST_SUBJECT_ID],
      [FIRST_SUBJECT_ID, {
        expectedSnapshotSha256: stableSnapshot.storageSnapshot.snapshotSha256
      }]
    ]);
    // Finding the committed region does not guarantee its focus effect ran yet.
    await waitFor(() => expect(document.activeElement).toBe(result));
    expect(container.textContent).not.toContain(FIRST_CAPTURE_SENTINEL);
    expect(within(result).getByText(MALICIOUS_QUOTE)).toBeTruthy();
    expect(within(result).getByText("第二次复核后的本机资料")).toBeTruthy();
    expect(container.querySelector("[data-storage-atomic-snapshot='verified-at-second-capture']"))
      .toBeTruthy();
  });

  it("withdraws a visible result when the invalidation token changes and only reads again after a new click", async () => {
    const readSnapshot = readTwice(stableSnapshot);
    const subject = requireEvidenceSubject(FIRST_SUBJECT_ID);
    const { rerender } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
        invalidationToken={0}
      />
    );

    clickRead();
    expect(await screen.findByRole("region", { name: subject.label })).toBeTruthy();
    expect(readSnapshot).toHaveBeenCalledTimes(2);

    rerender(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
        invalidationToken={1}
      />
    );

    expect(screen.queryByRole("region", { name: subject.label })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("必须重新主动读取");
    expect(screen.getByText("旧结果已撤下")).toBeTruthy();
    expect(readSnapshot).toHaveBeenCalledTimes(2);

    clickRead();
    expect(await screen.findByRole("region", { name: subject.label })).toBeTruthy();
    expect(readSnapshot).toHaveBeenCalledTimes(4);
  });

  it("withdraws visible results after pageshow and after returning to a visible document", async () => {
    const readSnapshot = readTwice(stableSnapshot);
    const subject = requireEvidenceSubject(FIRST_SUBJECT_ID);
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();
    expect(await screen.findByRole("region", { name: subject.label })).toBeTruthy();

    act(() => {
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(screen.queryByRole("region", { name: subject.label })).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("必须重新主动读取");
    expect(readSnapshot).toHaveBeenCalledTimes(2);

    clickRead();
    expect(await screen.findByRole("region", { name: subject.label })).toBeTruthy();
    expect(readSnapshot).toHaveBeenCalledTimes(4);

    const visibilityStateDescriptor = Object.getOwnPropertyDescriptor(
      document,
      "visibilityState"
    );
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible"
    });
    try {
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await waitFor(() => {
        expect(screen.queryByRole("region", { name: subject.label })).toBeNull();
      });
      expect(screen.getByRole("status").textContent).toContain("必须重新主动读取");
      expect(readSnapshot).toHaveBeenCalledTimes(4);
    } finally {
      if (visibilityStateDescriptor) {
        Object.defineProperty(document, "visibilityState", visibilityStateDescriptor);
      } else {
        Reflect.deleteProperty(document, "visibilityState");
      }
    }
  });

  it("does not let a slow ReviewContext reappear after pageshow invalidation", async () => {
    const pendingContext = deferred<LocalBaziCitationReviewContextRead>();
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockReturnValue(pendingContext.promise);
    render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    await waitFor(() => expect(readSnapshot).toHaveBeenCalledTimes(2));
    expect(readReviewContext).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("pageshow"));
    });
    expect(screen.getByText("旧结果已撤下")).toBeTruthy();

    await act(async () => {
      pendingContext.resolve(reviewContextReadFor(reviewEligibleSnapshot));
      await pendingContext.promise;
    });
    expect(screen.queryByRole("region", { name: "Revision 字段最小只读上下文" })).toBeNull();
    expect(screen.queryByText("甲子")).toBeNull();
  });

  it("discards a slow context when only the locator changes for the same subject", async () => {
    const pendingContext = deferred<LocalBaziCitationReviewContextRead>();
    const readSnapshot = readTwice(reviewEligibleSnapshot);
    const readReviewContext = vi.fn().mockReturnValue(pendingContext.promise);
    const { rerender } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={REVIEW_CONTEXT_LOCATOR}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));
    await waitFor(() => expect(readSnapshot).toHaveBeenCalledTimes(2));

    const nextLocator = {
      ...REVIEW_CONTEXT_LOCATOR,
      revisionId: "33333333-3333-4333-8333-333333333333"
    };
    rerender(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        reviewContextLocator={nextLocator}
        readSnapshot={readSnapshot}
        readReviewContext={readReviewContext}
      />
    );
    expect(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" })).toBeTruthy();

    await act(async () => {
      pendingContext.resolve(reviewContextReadFor(reviewEligibleSnapshot));
      await pendingContext.promise;
    });
    expect(screen.queryByRole("region", { name: "Revision 字段最小只读上下文" })).toBeNull();
    expect(screen.queryByText("甲子")).toBeNull();
    expect(readReviewContext).toHaveBeenCalledTimes(1);
    expect(readSnapshot).toHaveBeenCalledTimes(2);
  });

  it("renders hostile HTML-shaped source text literally without creating executable elements", async () => {
    const readSnapshot = readTwice(stableSnapshot);
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    const result = await screen.findByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    });
    const quote = within(result).getByText(MALICIOUS_QUOTE);
    expect(quote.tagName).toBe("BLOCKQUOTE");
    expect(quote.textContent).toBe(MALICIOUS_QUOTE);
    expect(container.querySelector("img, script")).toBeNull();
    expect(Reflect.has(globalThis, "__sourceAwareExecuted")).toBe(false);
  });

  it("does not deep-link mixed-case record IDs or lowercase the exact source keys", async () => {
    const mixed = snapshotWithMixedCaseRecordIds();
    const readSnapshot = readTwice(
      mixed.snapshot as unknown as LocalKnowledgeSourceAwareRetrievalSnapshot
    );
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    const result = await screen.findByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    });
    expect(within(result).queryByRole("link", { name: "打开本机引用记录" })).toBeNull();
    expect(within(result).getByText(/记录 ID 含大小写精确键/)).toBeTruthy();
    expect(mixed.snapshot.packet.items[0].citationId).toBe(mixed.citationId);
    expect(mixed.snapshot.packet.items[0].document.documentId).toBe(mixed.documentId);
    expect(mixed.snapshot.packet.items[0].citationId).not.toBe(mixed.citationId.toLowerCase());
    expect(mixed.snapshot.packet.items[0].document.documentId)
      .not.toBe(mixed.documentId.toLowerCase());
    expect(container.querySelector("a[href*='/knowledge']")).toBeNull();
  });

  it("keeps a redistributable declaration local-only when the complete rights gate is not closed", async () => {
    // The persistence schema rejects this mixed rights state. Deriving it from a real
    // repository snapshot exercises the reader's fail-closed handling of hostile input.
    const incompleteRights = cloneSnapshot(stableSnapshot) as unknown as {
      packet: {
        items: Array<{
          sourceRights: { distributionPolicy: "local_private_only" | "redistributable" };
        }>;
      };
    };
    incompleteRights.packet.items[0].sourceRights.distributionPolicy = "redistributable";
    const readSnapshot = readTwice(
      incompleteRights as unknown as LocalKnowledgeSourceAwareRetrievalSnapshot
    );
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    const result = await screen.findByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    });
    const article = container.querySelector("article[data-source-classification]");
    expect(article?.getAttribute("data-distribution-policy")).toBe("redistributable");
    expect(article?.getAttribute("data-redistribution-engineering-gate")).toBe("blocked");
    expect(within(result).getByText("仅本机审阅")).toBeTruthy();
    expect(within(result).getByText(
      "记录虽声明 redistributable，但完整工程门未闭合；仍只限本机审阅"
    )).toBeTruthy();
    expect(within(result).queryByText("工程再分发门闭合")).toBeNull();
  });

  it("shows verified excerpts while preserving the unreviewed candidate count", async () => {
    const readSnapshot = readTwice(candidateSnapshot);
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    const result = await screen.findByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    });
    expect(screen.getAllByText("仍有候选来源未复核")).toHaveLength(2);
    expect(within(result).getByText(/仍有 1 条候选引用未复核/)).toBeTruthy();
    expect(within(result).getByText(MALICIOUS_QUOTE)).toBeTruthy();
    expect(within(result).queryByText("尚未复核的候选摘录")).toBeNull();
    expect(container.querySelectorAll("article[data-source-classification]")).toHaveLength(1);
  });

  it("keeps a target with zero verified citations blocked and shows no source text", async () => {
    const readSnapshot = readTwice(zeroVerifiedSnapshot);
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    const result = await screen.findByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    });
    expect(screen.getAllByText("没有核验引用，保持关闭")).toHaveLength(2);
    expect(within(result).getByText("当前没有可显示的核验摘录")).toBeTruthy();
    expect(within(result).getByText(/用户候选/).parentElement?.textContent).toContain("1");
    expect(within(result).queryByText(MALICIOUS_QUOTE)).toBeNull();
    expect(container.querySelector("blockquote")).toBeNull();
  });

  it("rejects an enumerable own __proto__ data field on the first projection without touching nested getters", async () => {
    const poisonedSnapshot = cloneSnapshot(stableSnapshot) as unknown as {
      packet: Record<string, unknown>;
    };
    const poisonGetter = vi.fn(() => FIRST_CAPTURE_SENTINEL);
    const poisonValue = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(poisonValue, "captured", {
      configurable: true,
      enumerable: true,
      get: poisonGetter
    });
    Object.defineProperty(poisonedSnapshot.packet, "__proto__", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: poisonValue
    });
    const readSnapshot = vi.fn().mockResolvedValue(poisonedSnapshot);
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    expect(Object.prototype.hasOwnProperty.call(poisonedSnapshot.packet, "__proto__"))
      .toBe(true);
    clickRead();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("严格声明式投影检查；没有启动第二次读取");
    expect(readSnapshot).toHaveBeenCalledTimes(1);
    expect(poisonGetter).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain(FIRST_CAPTURE_SENTINEL);
    expect(container.textContent).not.toContain(MALICIOUS_QUOTE);
    expect(screen.queryByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    })).toBeNull();
  });

  it("rejects an accessor snapshot without invoking the getter or starting the second read", async () => {
    const getterSnapshot = cloneSnapshot(stableSnapshot) as unknown as {
      packet: Record<string, unknown>;
    };
    const status = getterSnapshot.packet.status;
    const getter = vi.fn(() => status);
    Object.defineProperty(getterSnapshot.packet, "status", {
      configurable: true,
      enumerable: true,
      get: getter
    });
    const readSnapshot = vi.fn().mockResolvedValue(getterSnapshot);
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(getter).not.toHaveBeenCalled();
    expect(readSnapshot).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain(MALICIOUS_QUOTE);
    expect(screen.queryByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    })).toBeNull();
  });

  it("rejects an extra snapshot field before the second read and does not expose captured content", async () => {
    const expanded = cloneSnapshot(stableSnapshot) as unknown as LocalKnowledgeSourceAwareRetrievalSnapshot & {
      unexpected?: string;
    };
    expanded.unexpected = FIRST_CAPTURE_SENTINEL;
    const readSnapshot = vi.fn().mockResolvedValue(expanded);
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("严格声明式投影检查；没有启动第二次读取");
    expect(readSnapshot).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain(FIRST_CAPTURE_SENTINEL);
    expect(container.textContent).not.toContain(MALICIOUS_QUOTE);
    expect(screen.queryByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    })).toBeNull();
  });

  it("fails closed when the second snapshot digest is stale and never reveals the first capture", async () => {
    const first = firstCaptureWithSentinel();
    const staleSecond = cloneSnapshot(stableSnapshot) as unknown as {
      storageSnapshot: { snapshotSha256: string };
    };
    staleSecond.storageSnapshot.snapshotSha256 = "f".repeat(64);
    const readSnapshot = vi.fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(staleSecond);
    const { container } = render(
      <LocalSourceAwareReviewPanel
        subjectId={FIRST_SUBJECT_ID}
        readSnapshot={readSnapshot}
      />
    );

    clickRead();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("摘要不一致；两份结果都没有进入页面");
    expect(readSnapshot).toHaveBeenCalledTimes(2);
    expect(readSnapshot.mock.calls[1]?.[1]).toEqual({
      expectedSnapshotSha256: stableSnapshot.storageSnapshot.snapshotSha256
    });
    expect(container.textContent).not.toContain(FIRST_CAPTURE_SENTINEL);
    expect(container.textContent).not.toContain(MALICIOUS_QUOTE);
    expect(screen.queryByRole("region", {
      name: requireEvidenceSubject(FIRST_SUBJECT_ID).label
    })).toBeNull();
  });

  it("does not start an old subject's second read or let it contaminate the new subject after a keyed reset", async () => {
    const oldFirstRead = deferred<LocalKnowledgeSourceAwareRetrievalSnapshot>();
    const readSnapshot = vi.fn((subjectId: string) => (
      subjectId === FIRST_SUBJECT_ID
        ? oldFirstRead.promise
        : Promise.resolve(secondSubjectSnapshot)
    ));
    const { rerender } = render(
      <StrictMode>
        <LocalSourceAwareReviewPanel
          subjectId={FIRST_SUBJECT_ID}
          readSnapshot={readSnapshot}
        />
      </StrictMode>
    );

    clickRead();
    expect(readSnapshot).toHaveBeenCalledTimes(1);
    rerender(
      <StrictMode>
        <LocalSourceAwareReviewPanel
          subjectId={SECOND_SUBJECT_ID}
          readSnapshot={readSnapshot}
        />
      </StrictMode>
    );
    await act(async () => {
      oldFirstRead.resolve(stableSnapshot);
      await oldFirstRead.promise;
    });

    expect(readSnapshot.mock.calls.filter(([subjectId]) => subjectId === FIRST_SUBJECT_ID))
      .toHaveLength(1);
    expect(screen.queryByRole("region", {
      name: requireEvidenceSubject(SECOND_SUBJECT_ID).label
    })).toBeNull();
    expect(screen.queryByText(MALICIOUS_QUOTE)).toBeNull();

    clickRead();
    const secondSubject = requireEvidenceSubject(SECOND_SUBJECT_ID);
    const result = await screen.findByRole("region", { name: secondSubject.label });
    expect(within(result).getByText("第二主题的核验摘录")).toBeTruthy();
    expect(within(result).queryByText(MALICIOUS_QUOTE)).toBeNull();
    expect(readSnapshot.mock.calls.filter(([subjectId]) => subjectId === SECOND_SUBJECT_ID))
      .toHaveLength(2);
  });
});
