import { describe, expect, it } from "vitest";
import { sha256Hex } from "@hakimi/integrity";
import {
  BaziStageCMaterialAdmissionError,
  deriveBaziStageCMaterialTupleCandidate,
  evaluateBaziStageCMaterialAdmissionCandidate
} from "./index";

const NOW = "2026-08-31T00:00:00.000Z";
const BINDING: Readonly<{
  registryProjectionVersion: string;
  registryContentVersion: string;
  bindingId: string;
  evidenceSubjectId: string;
  sourceId: string;
}> = Object.freeze({
  registryProjectionVersion: "hakimi.bazi.strength_claim_registry/0.2.0",
  registryContentVersion: "0.18.0",
  bindingId: "binding:smt-v5:relative-relations",
  evidenceSubjectId: "bazi.strength.binding.smt-v5.relative-relations.v1",
  sourceId: "smt-v5-wikisource-r2706483"
});
const SOURCE_URL = "https://zh.wikisource.org/w/index.php?title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%BA%94&oldid=2706483";

async function makeFixture() {
  const content = "# 卷五\n五行生克为十神相对关系。\n本段只作传统语境。";
  const contentHash = await sha256Hex(content);
  const document = {
    schemaVersion: "1.0.0",
    id: "41000000-0000-4000-8000-000000000001",
    recordType: "bundled_knowledge_document",
    title: "三命通会卷五固定版本摘录",
    author: "万民英",
    edition: "Wikisource revision 2706483",
    sourceNote: "测试用最小确定性材料，不代表真实权利结论。",
    fileName: "smt-v5-r2706483.md",
    format: "markdown",
    byteSize: new TextEncoder().encode(content).byteLength,
    content,
    contentHash,
    lineCount: 3,
    sections: [{ id: "section-1", title: "卷五", level: 1, startLine: 1, endLine: 3 }],
    editVersion: 1,
    createdAt: NOW,
    updatedAt: NOW
  };
  const citation = {
    schemaVersion: "1.0.0",
    id: "41000000-0000-4000-8000-000000000002",
    documentId: document.id,
    documentContentHash: contentHash,
    locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
    quote: "五行生克为十神相对关系。",
    annotation: "只用于测试 exact quote 机械链。",
    targets: [{ kind: "evidence_subject", subjectId: BINDING.evidenceSubjectId }],
    targetKeys: [`evidence_subject:${BINDING.evidenceSubjectId}`],
    status: "verified",
    reviewAttestations: [
      { reviewerId: "citation-review-a", reviewedAt: NOW, note: "locator" },
      { reviewerId: "citation-review-b", reviewedAt: NOW, note: "quote" }
    ],
    decisionNote: "测试夹具机械核验。",
    editVersion: 1,
    createdAt: NOW,
    updatedAt: NOW
  };
  const sourceRights = {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId: document.id,
    documentContentHash: contentHash,
    origin: "bundled",
    source: {
      sourceUrl: SOURCE_URL,
      publisher: "Wikisource",
      publicationYear: 2026,
      acquiredAt: NOW
    },
    rights: {
      status: "public_domain_verified",
      workStatus: "public_domain_verified",
      editionStatus: "public_domain_verified",
      basis: "public_domain",
      jurisdiction: "CN",
      licenseId: null,
      copyrightNotice: "测试夹具，不构成法律判断。",
      evidenceRefs: ["https://example.com/rights-evidence"],
      distributionPolicy: "redistributable"
    },
    review: {
      status: "double_reviewed",
      attestations: [
        { reviewerId: "rights-review-a", reviewedAt: NOW, note: "work" },
        { reviewerId: "rights-review-b", reviewedAt: NOW, note: "edition" }
      ],
      note: "仅测试结构门。"
    },
    editVersion: 1,
    createdAt: NOW,
    updatedAt: NOW
  };
  const sourceCarrier = {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_carrier",
    carrierId: "41000000-0000-4000-8000-000000000003",
    documentId: document.id,
    documentContentHash: contentHash,
    carrierType: "public_scan",
    provider: "测试载体",
    sourceUrl: "https://example.com/carrier",
    acquiredAt: NOW,
    accessMethod: "公开链接测试夹具",
    contentDigest: contentHash as string | null,
    imageDigest: null,
    ocrDigest: null,
    rights: {
      status: "public_domain",
      jurisdiction: "CN",
      licenseId: null,
      copyrightNotice: "测试夹具，不构成法律判断。",
      reproductionAllowed: true,
      quotationAllowed: true,
      redistributionAllowed: true,
      evidenceRefs: ["https://example.com/carrier-evidence"]
    },
    storagePolicy: "public_repo",
    review: {
      status: "double_reviewed",
      attestations: [
        { reviewerId: "carrier-review-a", reviewedAt: NOW, note: "bytes" },
        { reviewerId: "carrier-review-b", reviewedAt: NOW, note: "permissions" }
      ],
      note: "仅测试结构门。"
    },
    editVersion: 1,
    createdAt: NOW,
    updatedAt: NOW
  };
  return {
    binding: { ...BINDING },
    citation,
    knowledgeDocument: document,
    sourceRights,
    sourceCarrier,
    bundlePath: "documents/bazi/smt-v5-r2706483.md"
  };
}

async function makeEvaluationInput() {
  const base = await makeFixture();
  const prepared = await deriveBaziStageCMaterialTupleCandidate(base);
  return { ...base, expectedTupleDigest: prepared.tupleDigest };
}

async function expectRejectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("bazi Stage C material admission candidate", () => {
  it("passes material-layer checks but exposes unresolved cross-layer blockers at schema 13", async () => {
    const result = await evaluateBaziStageCMaterialAdmissionCandidate(await makeEvaluationInput());
    expect(result).toMatchObject({
      schemaVersion: "0.2.0",
      candidateOnly: true,
      authorityEffect: "none",
      releaseGovernance: {
        activeLine: "legacy-v13",
        targetSchema: 13,
        migrationId: null,
        publicDeploymentAuthorized: false,
        expertClaimsAuthorized: false
      },
      callerProvidedTupleDigestMatched: true,
      externalTuplePinVerified: false,
      materialLayerStructuralGatesPassed: true,
      structuralGatePassed: false,
      admissionAuthorized: false,
      rejectionCode: "BINDING_CITATION_LOCATOR_LINK_UNAVAILABLE",
      blockingReasons: [
        "BINDING_CITATION_LOCATOR_LINK_UNAVAILABLE",
        "EXTERNAL_TUPLE_PIN_UNVERIFIED",
        "MUTATION_EPOCH_CAPABILITY_UNAVAILABLE"
      ],
      checks: {
        registryBindingSubjectSourceReferenceExact: true,
        registryBindingAndSourceIdentityCaptured: true,
        bindingCitationLocatorLinked: false,
        bundledKnowledgeManifestEntryMetadataContractValidated: true,
        productionBodyInventoryAndBytesAudited: false
      },
      mutationBoundary: {
        snapshotCapabilityIssuerProvided: false,
        mutationEpochCapabilityAvailable: false,
        crossFileAtomicSnapshot: false,
        intervalMutationExcluded: false,
        abaExcluded: false
      },
      boundary: {
        realReviewerIdentityAndIndependenceVerified: false,
        rightsLegalConclusionEstablished: false,
        contentTruthEstablished: false,
        expertTruthEstablished: false,
        releaseReady: false,
        publicReleaseAuthorized: false
      }
    });
    expect(result.tupleDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.candidateDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.tuple.registryBinding.exactLocator).toEqual({
      kind: "chapter_heading",
      value: "卷五 > 论古人立印食官财名义",
      verificationStatus: "verified",
      contentSha256: null
    });
    expect(result.tuple.registrySource).toMatchObject({
      sourceId: BINDING.sourceId,
      url: SOURCE_URL,
      stableRevision: "2706483",
      verificationStatus: "locator_verified_in_pinned_revision"
    });
    expect(result.tuple.bundlePath).toBe("documents/bazi/smt-v5-r2706483.md");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.tuple)).toBe(true);
  });

  it("binds one exact registry binding, subject and source", async () => {
    const subjectSwap = await makeEvaluationInput();
    subjectSwap.binding.evidenceSubjectId = "bazi.strength.binding.smt-v10.whole-chart.v1";
    await expectRejectCode(evaluateBaziStageCMaterialAdmissionCandidate(subjectSwap), "REGISTRY_TUPLE_MISMATCH");

    const sourceSwap = await makeEvaluationInput();
    sourceSwap.binding.sourceId = "smt-siku-v10-wikisource-r761703";
    await expectRejectCode(evaluateBaziStageCMaterialAdmissionCandidate(sourceSwap), "REGISTRY_TUPLE_MISMATCH");
  });

  it("rejects tuple substitution against the caller-provided expected digest", async () => {
    const editVersionSwap = await makeEvaluationInput();
    editVersionSwap.citation.editVersion = 2;
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(editVersionSwap),
      "TUPLE_DIGEST_MISMATCH"
    );

    const citationIdentitySwap = await makeEvaluationInput();
    citationIdentitySwap.citation.id = "41000000-0000-4000-8000-000000000099";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(citationIdentitySwap),
      "TUPLE_DIGEST_MISMATCH"
    );

    const reviewSwap = await makeEvaluationInput();
    reviewSwap.citation.reviewAttestations[0]!.note = "changed review, same subject and quote";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(reviewSwap),
      "TUPLE_DIGEST_MISMATCH"
    );

    const rightsVersionSwap = await makeEvaluationInput();
    rightsVersionSwap.sourceRights.editVersion = 2;
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(rightsVersionSwap),
      "TUPLE_DIGEST_MISMATCH"
    );

    const carrierIdentitySwap = await makeEvaluationInput();
    carrierIdentitySwap.sourceCarrier.carrierId = "41000000-0000-4000-8000-000000000098";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(carrierIdentitySwap),
      "TUPLE_DIGEST_MISMATCH"
    );

    const carrierReviewSwap = await makeEvaluationInput();
    carrierReviewSwap.sourceCarrier.review.note = "changed carrier review";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(carrierReviewSwap),
      "TUPLE_DIGEST_MISMATCH"
    );

    const bundlePathSwap = await makeEvaluationInput();
    bundlePathSwap.bundlePath = "documents/bazi/substituted.md";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(bundlePathSwap),
      "TUPLE_DIGEST_MISMATCH"
    );
  });

  it("does not treat a digest re-derived by the same caller as an external pin", async () => {
    const input = await makeEvaluationInput();
    const result = await evaluateBaziStageCMaterialAdmissionCandidate(input);
    expect(result.callerProvidedTupleDigestMatched).toBe(true);
    expect(result.externalTuplePinVerified).toBe(false);
    expect(result.structuralGatePassed).toBe(false);
    expect(result.admissionAuthorized).toBe(false);
  });

  it("rejects quote and locator substitution", async () => {
    const quoteSwap = await makeEvaluationInput();
    quoteSwap.citation.quote = "本段只作传统语境。";
    await expect(evaluateBaziStageCMaterialAdmissionCandidate(quoteSwap)).rejects.toThrow();

    const locatorSwap = await makeEvaluationInput();
    locatorSwap.citation.locator = { sectionId: "section-1", startLine: 3, endLine: 3 };
    await expect(evaluateBaziStageCMaterialAdmissionCandidate(locatorSwap)).rejects.toThrow();
  });

  it("requires a verified Citation with the exact subject target", async () => {
    const candidate = await makeEvaluationInput();
    candidate.citation.status = "user_candidate";
    candidate.citation.reviewAttestations = [];
    candidate.citation.decisionNote = "";
    await expectRejectCode(evaluateBaziStageCMaterialAdmissionCandidate(candidate), "CITATION_NOT_VERIFIED");

    const wrongTarget = await makeEvaluationInput();
    wrongTarget.citation.targets = [{
      kind: "evidence_subject",
      subjectId: "bazi.strength.binding.smt-v10.whole-chart.v1"
    }];
    wrongTarget.citation.targetKeys = ["evidence_subject:bazi.strength.binding.smt-v10.whole-chart.v1"];
    await expectRejectCode(evaluateBaziStageCMaterialAdmissionCandidate(wrongTarget), "CITATION_TARGET_MISMATCH");

    const additionalTarget = await makeEvaluationInput();
    additionalTarget.citation.targets.push({
      kind: "evidence_subject",
      subjectId: "bazi.strength.binding.smt-v10.whole-chart.v1"
    });
    additionalTarget.citation.targetKeys = [
      `evidence_subject:${BINDING.evidenceSubjectId}`,
      "evidence_subject:bazi.strength.binding.smt-v10.whole-chart.v1"
    ].sort();
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(additionalTarget),
      "CITATION_TARGET_MISMATCH"
    );
  });

  it("rejects rights and carrier identity-chain mismatch", async () => {
    const rightsMismatch = await makeEvaluationInput();
    rightsMismatch.sourceRights.documentContentHash = "b".repeat(64);
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(rightsMismatch),
      "DOCUMENT_IDENTITY_CHAIN_MISMATCH"
    );

    const carrierMismatch = await makeEvaluationInput();
    carrierMismatch.sourceCarrier.documentId = "41000000-0000-4000-8000-000000000099";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(carrierMismatch),
      "DOCUMENT_IDENTITY_CHAIN_MISMATCH"
    );
  });

  it("rejects link-only and false-permission carriers", async () => {
    const linkOnly = await makeEvaluationInput();
    linkOnly.sourceCarrier = {
      ...linkOnly.sourceCarrier,
      carrierType: "link_only",
      contentDigest: null,
      rights: {
        ...linkOnly.sourceCarrier.rights,
        status: "restricted",
        reproductionAllowed: false,
        quotationAllowed: true,
        redistributionAllowed: false
      },
      storagePolicy: "link_only"
    };
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(linkOnly),
      "SOURCE_MATERIAL_NOT_REDISTRIBUTABLE"
    );

    const permissionFalse = await makeEvaluationInput();
    permissionFalse.sourceCarrier = {
      ...permissionFalse.sourceCarrier,
      rights: { ...permissionFalse.sourceCarrier.rights, quotationAllowed: false },
      storagePolicy: "private_vault"
    };
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(permissionFalse),
      "SOURCE_MATERIAL_NOT_REDISTRIBUTABLE"
    );
  });

  it("requires a safe bundled release path", async () => {
    const unsafePath = await makeEvaluationInput();
    unsafePath.bundlePath = "../outside.md";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(unsafePath),
      "BUNDLED_RELEASE_VALIDATION_FAILED"
    );

    const nonProductionPrefix = await makeEvaluationInput();
    nonProductionPrefix.bundlePath = "knowledge/bazi/smt-v5-r2706483.md";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(nonProductionPrefix),
      "BUNDLED_RELEASE_VALIDATION_FAILED"
    );

    const unsupportedBodyFormat = await makeEvaluationInput();
    unsupportedBodyFormat.bundlePath = "documents/bazi/smt-v5-r2706483.pdf";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(unsupportedBodyFormat),
      "BUNDLED_RELEASE_VALIDATION_FAILED"
    );

    const emptyPathSegment = await makeEvaluationInput();
    emptyPathSegment.bundlePath = "documents/bazi//smt-v5-r2706483.md";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(emptyPathSegment),
      "BUNDLED_RELEASE_VALIDATION_FAILED"
    );

    const dotPathSegment = await makeEvaluationInput();
    dotPathSegment.bundlePath = "documents/bazi/./smt-v5-r2706483.md";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(dotPathSegment),
      "BUNDLED_RELEASE_VALIDATION_FAILED"
    );
  });

  it("binds the KnowledgeDocument format to the production bundle extension", async () => {
    const markdownAsTextPath = await makeEvaluationInput();
    markdownAsTextPath.bundlePath = "documents/bazi/smt-v5-r2706483.txt";
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(markdownAsTextPath),
      "KNOWLEDGE_DOCUMENT_FORMAT_MISMATCH"
    );

    const textAsMarkdownPath = await makeEvaluationInput();
    textAsMarkdownPath.knowledgeDocument.format = "text";
    textAsMarkdownPath.knowledgeDocument.sections = [{
      id: "section-1",
      title: "全文",
      level: 0,
      startLine: 1,
      endLine: 3
    }];
    await expectRejectCode(
      evaluateBaziStageCMaterialAdmissionCandidate(textAsMarkdownPath),
      "KNOWLEDGE_DOCUMENT_FORMAT_MISMATCH"
    );
  });

  it("enforces review-array and bounded-string contracts", async () => {
    const tooManyReviews = await makeEvaluationInput();
    tooManyReviews.citation.reviewAttestations = Array.from({ length: 21 }, (_, index) => ({
      reviewerId: `reviewer-${index}`,
      reviewedAt: NOW,
      note: "review"
    }));
    await expect(evaluateBaziStageCMaterialAdmissionCandidate(tooManyReviews)).rejects.toThrow();

    const oversizedDecision = await makeEvaluationInput();
    oversizedDecision.citation.decisionNote = "x".repeat(4_001);
    await expect(evaluateBaziStageCMaterialAdmissionCandidate(oversizedDecision)).rejects.toThrow();
  });

  it("synchronously rejects getters, Symbols, cycles, sparse arrays and custom prototypes", async () => {
    const getterInput = await makeEvaluationInput();
    Object.defineProperty(getterInput.knowledgeDocument, "content", {
      get: () => "unexpected",
      enumerable: true,
      configurable: true
    });
    expect(() => evaluateBaziStageCMaterialAdmissionCandidate(getterInput)).toThrow(TypeError);

    const symbolInput = await makeEvaluationInput();
    Object.defineProperty(symbolInput.citation, Symbol("hidden"), { value: true, enumerable: true });
    expect(() => evaluateBaziStageCMaterialAdmissionCandidate(symbolInput)).toThrow(TypeError);

    const cycleInput = await makeEvaluationInput() as Record<string, unknown>;
    cycleInput.loop = cycleInput;
    expect(() => evaluateBaziStageCMaterialAdmissionCandidate(cycleInput)).toThrow(TypeError);

    const sparseInput = await makeEvaluationInput();
    sparseInput.citation.targets = new Array(1) as typeof sparseInput.citation.targets;
    expect(() => evaluateBaziStageCMaterialAdmissionCandidate(sparseInput)).toThrow(TypeError);

    const prototypeInput = await makeEvaluationInput();
    Object.setPrototypeOf(prototypeInput.sourceRights, { injected: true });
    expect(() => evaluateBaziStageCMaterialAdmissionCandidate(prototypeInput)).toThrow(TypeError);

    const nullPrototypeInput = await makeEvaluationInput();
    nullPrototypeInput.sourceCarrier.rights = Object.assign(
      Object.create(null),
      nullPrototypeInput.sourceCarrier.rights
    );
    expect(() => evaluateBaziStageCMaterialAdmissionCandidate(nullPrototypeInput)).toThrow(TypeError);

    const undefinedInput = await makeEvaluationInput();
    (undefinedInput.citation as { annotation: unknown }).annotation = undefined;
    expect(() => evaluateBaziStageCMaterialAdmissionCandidate(undefinedInput)).toThrow(TypeError);
  });

  it("synchronously rejects every caller-authored capability object", async () => {
    const input = { ...(await makeEvaluationInput()), snapshotCapability: { epoch: 1, abaExcluded: true } };
    expect(() => evaluateBaziStageCMaterialAdmissionCandidate(input)).toThrow(BaziStageCMaterialAdmissionError);
    try {
      evaluateBaziStageCMaterialAdmissionCandidate(input);
      throw new Error("expected synchronous rejection");
    } catch (error) {
      expect(error).toMatchObject({ code: "UNTRUSTED_MUTATION_EPOCH_CAPABILITY" });
    }
  });

  it("captures all declarative input before async hashing", async () => {
    const input = await makeEvaluationInput();
    const originalDigest = input.expectedTupleDigest;
    const pending = evaluateBaziStageCMaterialAdmissionCandidate(input);
    input.knowledgeDocument.content = "# changed after capture";
    input.citation.quote = "changed after capture";
    input.sourceRights.review.note = "changed after capture";
    const result = await pending;
    expect(result.tupleDigest).toBe(originalDigest);
    expect(result.admissionAuthorized).toBe(false);
  });
});
