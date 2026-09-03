import {
  BAZI_STRENGTH_CLAIM_REGISTRY,
  BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE,
  validateBaziStrengthClaimRegistry
} from "@hakimi/bazi-interpretation";
import {
  citationRecordSchema,
  knowledgeDocumentRecordSchema,
  sourceCarrierRecordSchema,
  sourceRightsRecordSchema,
  type CitationRecord,
  type KnowledgeDocumentRecord,
  type SourceCarrierRecord,
  type SourceRightsRecord
} from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  createKnowledgeDocumentCitationIntegrityVerifier,
  inferKnowledgeFormat,
  isRedistributableSourceMaterial,
  validateBundledKnowledgeManifestRelease
} from "@hakimi/knowledge-core";

export const BAZI_STAGE_C_MATERIAL_ADMISSION_CANDIDATE_VERSION = "0.2.0" as const;

export const BAZI_STAGE_C_DIGEST_DOMAINS = Object.freeze({
  citationRecord: "hakimi.bazi.stage-c.citation-record.canonical/0.2.0",
  knowledgeDocumentRecord: "hakimi.bazi.stage-c.knowledge-document-record.canonical/0.2.0",
  sourceRightsRecord: "hakimi.bazi.stage-c.source-rights-record.canonical/0.2.0",
  sourceCarrierRecord: "hakimi.knowledge.source-carrier-record.canonical.v1",
  citationTargetKeys: "hakimi.bazi.stage-c.citation-target-keys/0.2.0",
  materialBindingTuple: "hakimi.bazi.stage-c.material-binding-tuple/0.2.0",
  admissionCandidate: "hakimi.bazi.stage-c.material-admission-candidate/0.2.0"
} as const);

const INPUT_LIMITS = Object.freeze({
  maxDepth: 64,
  maxTextCharacters: 2_300_000,
  maxValueNodes: 100_000,
  maxArrayItems: 10_000
});

type DeclarativeSnapshot =
  | null
  | boolean
  | number
  | string
  | DeclarativeSnapshot[]
  | { [key: string]: DeclarativeSnapshot };

type SnapshotBudget = {
  textCharacters: number;
  valueNodes: number;
};

export type BaziStageCMaterialAdmissionErrorCode =
  | "INVALID_INPUT_SHAPE"
  | "UNTRUSTED_MUTATION_EPOCH_CAPABILITY"
  | "REGISTRY_TUPLE_MISMATCH"
  | "REGISTRY_SOURCE_NOT_FROZEN"
  | "KNOWLEDGE_DOCUMENT_NOT_BUNDLED"
  | "KNOWLEDGE_DOCUMENT_BYTE_SIZE_MISMATCH"
  | "KNOWLEDGE_DOCUMENT_FORMAT_MISMATCH"
  | "CITATION_NOT_VERIFIED"
  | "CITATION_TARGET_MISMATCH"
  | "DOCUMENT_IDENTITY_CHAIN_MISMATCH"
  | "REGISTRY_SOURCE_IDENTITY_MISMATCH"
  | "SOURCE_MATERIAL_NOT_REDISTRIBUTABLE"
  | "BUNDLED_RELEASE_VALIDATION_FAILED"
  | "TUPLE_DIGEST_MISMATCH";

export class BaziStageCMaterialAdmissionError extends Error {
  readonly code: BaziStageCMaterialAdmissionErrorCode;

  constructor(code: BaziStageCMaterialAdmissionErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "BaziStageCMaterialAdmissionError";
  }
}

export type BaziStageCBindingReference = Readonly<{
  registryProjectionVersion: typeof BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE.projectionVersion;
  registryContentVersion: typeof BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE.contentVersion;
  bindingId: string;
  evidenceSubjectId: string;
  sourceId: string;
}>;

export type BaziStageCMaterialTuple = Readonly<{
  registryBinding: Readonly<{
    reference: BaziStageCBindingReference;
    exactLocator: Readonly<{
      kind: string;
      value: string;
      verificationStatus: string;
      contentSha256: string | null;
    }>;
  }>;
  registrySource: Readonly<{
    sourceId: string;
    sourceType: string;
    url: string;
    stableRevision: string | null;
    verificationStatus: string;
  }>;
  citation: Readonly<{
    id: string;
    editVersion: number;
    canonicalRecordDigest: string;
    documentId: string;
    documentContentHash: string;
    locator: Readonly<{ sectionId: string; startLine: number; endLine: number }>;
    quoteSha256: string;
    targetKeysDigest: string;
  }>;
  knowledgeDocument: Readonly<{
    id: string;
    contentHash: string;
    editVersion: number;
    canonicalRecordDigest: string;
  }>;
  sourceRights: Readonly<{
    documentId: string;
    documentContentHash: string;
    editVersion: number;
    canonicalRecordDigest: string;
  }>;
  sourceCarrier: Readonly<{
    carrierId: string;
    documentId: string;
    documentContentHash: string;
    contentDigest: string | null;
    editVersion: number;
    canonicalRecordDigest: string;
  }>;
  bundlePath: string;
}>;

export type BaziStageCMaterialTupleCandidate = Readonly<{
  schemaVersion: typeof BAZI_STAGE_C_MATERIAL_ADMISSION_CANDIDATE_VERSION;
  recordType: "bazi_stage_c_material_tuple_candidate";
  candidateOnly: true;
  authorityEffect: "none";
  tuple: BaziStageCMaterialTuple;
  tupleDigest: string;
  checks: Readonly<{
    registryBindingSubjectSourceReferenceExact: true;
    registryBindingAndSourceIdentityCaptured: true;
    bindingCitationLocatorLinked: false;
    knowledgeDocumentContentAndSectionsExact: true;
    citationDocumentLocatorAndQuoteExact: true;
    citationVerifiedForExactSubject: true;
    documentRightsCarrierIdentityChainExact: true;
    structuralThreeLayerRedistributionGatePassed: true;
    bundledKnowledgeManifestEntryMetadataContractValidated: true;
    productionBodyInventoryAndBytesAudited: false;
  }>;
  boundary: BaziStageCAuthorityBoundary;
}>;

export type BaziStageCAuthorityBoundary = Readonly<{
  sourceIdentityAdjudicated: false;
  realReviewerIdentityAndIndependenceVerified: false;
  rightsLegalConclusionEstablished: false;
  contentTruthEstablished: false;
  expertTruthEstablished: false;
  bindingFrozen: false;
  releaseReady: false;
  publicReleaseAuthorized: false;
}>;

export type BaziStageCMaterialAdmissionCandidate = Readonly<{
  schemaVersion: typeof BAZI_STAGE_C_MATERIAL_ADMISSION_CANDIDATE_VERSION;
  recordType: "bazi_stage_c_material_admission_candidate";
  candidateOnly: true;
  authorityEffect: "none";
  releaseGovernance: Readonly<{
    activeLine: "legacy-v13";
    targetSchema: 13;
    migrationId: null;
    publicDeploymentAuthorized: false;
    expertClaimsAuthorized: false;
  }>;
  tuple: BaziStageCMaterialTuple;
  tupleDigest: string;
  expectedTupleDigest: string;
  callerProvidedTupleDigestMatched: true;
  externalTuplePinVerified: false;
  checks: BaziStageCMaterialTupleCandidate["checks"];
  mutationBoundary: Readonly<{
    snapshotCapabilityIssuerProvided: false;
    mutationEpochCapabilityAvailable: false;
    crossFileAtomicSnapshot: false;
    intervalMutationExcluded: false;
    abaExcluded: false;
  }>;
  boundary: BaziStageCAuthorityBoundary;
  materialLayerStructuralGatesPassed: true;
  structuralGatePassed: false;
  admissionAuthorized: false;
  rejectionCode: "BINDING_CITATION_LOCATOR_LINK_UNAVAILABLE";
  blockingReasons: readonly [
    "BINDING_CITATION_LOCATOR_LINK_UNAVAILABLE",
    "EXTERNAL_TUPLE_PIN_UNVERIFIED",
    "MUTATION_EPOCH_CAPABILITY_UNAVAILABLE"
  ];
  candidateDigest: string;
}>;

const AUTHORITY_BOUNDARY: BaziStageCAuthorityBoundary = Object.freeze({
  sourceIdentityAdjudicated: false,
  realReviewerIdentityAndIndependenceVerified: false,
  rightsLegalConclusionEstablished: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  bindingFrozen: false,
  releaseReady: false,
  publicReleaseAuthorized: false
});

function snapshotDeclarativeOwnData(
  input: unknown,
  subject: string,
  path = subject,
  depth = 0,
  ancestors = new WeakSet<object>(),
  budget: SnapshotBudget = { textCharacters: 0, valueNodes: 0 }
): DeclarativeSnapshot {
  if (depth > INPUT_LIMITS.maxDepth) {
    throw new TypeError(`${subject} exceeds the declarative depth limit.`);
  }
  budget.valueNodes += 1;
  if (budget.valueNodes > INPUT_LIMITS.maxValueNodes) {
    throw new TypeError(`${subject} exceeds the declarative value-node limit.`);
  }
  if (typeof input === "string") {
    budget.textCharacters += input.length;
    if (budget.textCharacters > INPUT_LIMITS.maxTextCharacters) {
      throw new TypeError(`${subject} exceeds the declarative text limit.`);
    }
    return input;
  }
  if (input === null || typeof input === "boolean") return input;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new TypeError(`${path} contains a non-finite number.`);
    return input;
  }
  if (typeof input !== "object") {
    throw new TypeError(`${path} must contain only declarative JSON data.`);
  }
  if (Object.getOwnPropertySymbols(input).length !== 0) {
    throw new TypeError(`${path} cannot contain Symbol properties.`);
  }
  if (ancestors.has(input)) throw new TypeError(`${path} cannot contain a cycle.`);

  ancestors.add(input);
  try {
    if (Array.isArray(input)) {
      if (Object.getPrototypeOf(input) !== Array.prototype) {
        throw new TypeError(`${path} must use the ordinary Array prototype.`);
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
      if (!lengthDescriptor || !("value" in lengthDescriptor)
        || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
        throw new TypeError(`${path}.length must be an own safe-integer data property.`);
      }
      const length = lengthDescriptor.value as number;
      if (length > INPUT_LIMITS.maxArrayItems) {
        throw new TypeError(`${path} exceeds the declarative array-item limit.`);
      }
      if (Object.getOwnPropertyNames(input).length !== length + 1) {
        throw new TypeError(`${path} must be dense and cannot contain custom properties.`);
      }
      const output = new Array<DeclarativeSnapshot>(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new TypeError(`${path}[${index}] must be an enumerable own data property.`);
        }
        output[index] = snapshotDeclarativeOwnData(
          descriptor.value,
          subject,
          `${path}[${index}]`,
          depth + 1,
          ancestors,
          budget
        );
      }
      return output;
    }

    if (Object.getPrototypeOf(input) !== Object.prototype) {
      throw new TypeError(`${path} must use the ordinary Object prototype.`);
    }
    const output = Object.create(null) as Record<string, DeclarativeSnapshot>;
    for (const key of Object.getOwnPropertyNames(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
      }
      budget.textCharacters += key.length;
      if (budget.textCharacters > INPUT_LIMITS.maxTextCharacters) {
        throw new TypeError(`${subject} exceeds the declarative text limit.`);
      }
      Object.defineProperty(output, key, {
        value: snapshotDeclarativeOwnData(
          descriptor.value,
          subject,
          `${path}.${key}`,
          depth + 1,
          ancestors,
          budget
        ),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    ancestors.delete(input);
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function requireRecord(value: DeclarativeSnapshot, subject: string): Record<string, DeclarativeSnapshot> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BaziStageCMaterialAdmissionError("INVALID_INPUT_SHAPE", `${subject} must be an object.`);
  }
  return value;
}

function assertExactKeys(record: Record<string, DeclarativeSnapshot>, expected: readonly string[], subject: string): void {
  const actual = Object.keys(record).sort((left, right) => left.localeCompare(right, "en"));
  const sortedExpected = [...expected].sort((left, right) => left.localeCompare(right, "en"));
  if (actual.length !== sortedExpected.length || actual.some((key, index) => key !== sortedExpected[index])) {
    throw new BaziStageCMaterialAdmissionError("INVALID_INPUT_SHAPE", `${subject} has an invalid field set.`);
  }
}

function requireString(value: DeclarativeSnapshot, subject: string): string {
  if (typeof value !== "string") {
    throw new BaziStageCMaterialAdmissionError("INVALID_INPUT_SHAPE", `${subject} must be a string.`);
  }
  return value;
}

function parseBindingReference(value: DeclarativeSnapshot): BaziStageCBindingReference {
  const binding = requireRecord(value, "binding");
  assertExactKeys(binding, [
    "registryProjectionVersion",
    "registryContentVersion",
    "bindingId",
    "evidenceSubjectId",
    "sourceId"
  ], "binding");
  return Object.freeze({
    registryProjectionVersion: requireString(binding.registryProjectionVersion!, "binding.registryProjectionVersion") as BaziStageCBindingReference["registryProjectionVersion"],
    registryContentVersion: requireString(binding.registryContentVersion!, "binding.registryContentVersion") as BaziStageCBindingReference["registryContentVersion"],
    bindingId: requireString(binding.bindingId!, "binding.bindingId"),
    evidenceSubjectId: requireString(binding.evidenceSubjectId!, "binding.evidenceSubjectId"),
    sourceId: requireString(binding.sourceId!, "binding.sourceId")
  });
}

type CapturedBaseInput = Readonly<{
  binding: BaziStageCBindingReference;
  citation: DeclarativeSnapshot;
  knowledgeDocument: DeclarativeSnapshot;
  sourceRights: DeclarativeSnapshot;
  sourceCarrier: DeclarativeSnapshot;
  bundlePath: string;
}>;

function captureBaseInput(input: unknown, mode: "derive" | "evaluate"): CapturedBaseInput & { expectedTupleDigest?: string } {
  const snapshot = snapshotDeclarativeOwnData(input, "Stage C material admission input");
  const record = requireRecord(snapshot, "Stage C material admission input");
  const expectedKeys = mode === "derive"
    ? ["binding", "citation", "knowledgeDocument", "sourceRights", "sourceCarrier", "bundlePath"]
    : ["binding", "citation", "knowledgeDocument", "sourceRights", "sourceCarrier", "bundlePath", "expectedTupleDigest"];
  const actualKeys = Object.keys(record);
  if (mode === "evaluate" && actualKeys.includes("snapshotCapability")) {
    const withoutCapability = actualKeys.filter((key) => key !== "snapshotCapability");
    if (withoutCapability.length === expectedKeys.length
      && [...withoutCapability].sort().every((key, index) => key === [...expectedKeys].sort()[index])) {
      throw new BaziStageCMaterialAdmissionError(
        "UNTRUSTED_MUTATION_EPOCH_CAPABILITY",
        "This candidate package provides no mutation-epoch capability issuer and rejects caller-authored capability objects."
      );
    }
  }
  assertExactKeys(record, expectedKeys, "Stage C material admission input");
  const captured: CapturedBaseInput & { expectedTupleDigest?: string } = {
    binding: parseBindingReference(record.binding!),
    citation: record.citation!,
    knowledgeDocument: record.knowledgeDocument!,
    sourceRights: record.sourceRights!,
    sourceCarrier: record.sourceCarrier!,
    bundlePath: requireString(record.bundlePath!, "bundlePath")
  };
  if (mode === "evaluate") {
    const expectedTupleDigest = requireString(record.expectedTupleDigest!, "expectedTupleDigest");
    if (!/^[a-f0-9]{64}$/u.test(expectedTupleDigest)) {
      throw new BaziStageCMaterialAdmissionError(
        "INVALID_INPUT_SHAPE",
        "expectedTupleDigest must be one lowercase SHA-256 digest."
      );
    }
    captured.expectedTupleDigest = expectedTupleDigest;
  }
  return deepFreeze(captured);
}

async function domainSeparatedDigest(domain: string, value: unknown): Promise<string> {
  return sha256Hex(`${domain}\0${canonicalStringify(value)}`);
}

function verifyRegistryBinding(reference: BaziStageCBindingReference) {
  validateBaziStrengthClaimRegistry(BAZI_STRENGTH_CLAIM_REGISTRY);
  const binding = BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings.find((entry) => entry.bindingId === reference.bindingId);
  const source = BAZI_STRENGTH_CLAIM_REGISTRY.sources.find((entry) => entry.sourceId === reference.sourceId);
  if (!binding || !source
    || reference.registryProjectionVersion !== BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE.projectionVersion
    || reference.registryContentVersion !== BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE.contentVersion
    || binding.evidenceSubjectId !== reference.evidenceSubjectId
    || binding.sourceId !== reference.sourceId
    || binding.sourceType !== source.sourceType) {
    throw new BaziStageCMaterialAdmissionError(
      "REGISTRY_TUPLE_MISMATCH",
      "The bindingId, evidenceSubjectId and sourceId do not resolve to one exact current registry tuple."
    );
  }
  if (binding.exactLocator.verificationStatus !== "verified"
    || (source.verificationStatus !== "repository_policy_verified"
      && source.verificationStatus !== "locator_verified_in_pinned_revision")) {
    throw new BaziStageCMaterialAdmissionError(
      "REGISTRY_SOURCE_NOT_FROZEN",
      "The selected registry binding or source is not frozen at the current mechanical-verification level."
    );
  }
  return { binding, source };
}

function parseMaterialRecords(input: CapturedBaseInput): {
  citation: CitationRecord;
  document: KnowledgeDocumentRecord;
  rights: SourceRightsRecord;
  carrier: SourceCarrierRecord;
} {
  return {
    citation: citationRecordSchema.parse(input.citation),
    document: knowledgeDocumentRecordSchema.parse(input.knowledgeDocument),
    rights: sourceRightsRecordSchema.parse(input.sourceRights),
    carrier: sourceCarrierRecordSchema.parse(input.sourceCarrier)
  };
}

async function buildTupleCandidate(input: CapturedBaseInput): Promise<BaziStageCMaterialTupleCandidate> {
  const { binding, source } = verifyRegistryBinding(input.binding);
  const { citation, document, rights, carrier } = parseMaterialRecords(input);

  if (document.recordType !== "bundled_knowledge_document") {
    throw new BaziStageCMaterialAdmissionError(
      "KNOWLEDGE_DOCUMENT_NOT_BUNDLED",
      "Stage C material admission only evaluates an explicit bundled KnowledgeDocument candidate."
    );
  }
  if (new TextEncoder().encode(document.content).byteLength !== document.byteSize) {
    throw new BaziStageCMaterialAdmissionError(
      "KNOWLEDGE_DOCUMENT_BYTE_SIZE_MISMATCH",
      "KnowledgeDocument byteSize does not match its exact UTF-8 content snapshot."
    );
  }

  const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(document);
  const verifiedDocument = verifier.document;
  const verifiedCitation = verifier.verifyCitation(citation);
  if (verifiedCitation.status !== "verified") {
    throw new BaziStageCMaterialAdmissionError(
      "CITATION_NOT_VERIFIED",
      "The Citation must be structurally double-reviewed and explicitly verified."
    );
  }
  const exactSubjectTarget = verifiedCitation.targets.length === 1
    && verifiedCitation.targets[0]?.kind === "evidence_subject"
    && verifiedCitation.targets[0].subjectId === input.binding.evidenceSubjectId;
  if (!exactSubjectTarget) {
    throw new BaziStageCMaterialAdmissionError(
      "CITATION_TARGET_MISMATCH",
      "The Citation does not target the exact evidenceSubjectId resolved by the registry binding."
    );
  }

  if (rights.documentId !== verifiedDocument.id
    || rights.documentContentHash !== verifiedDocument.contentHash
    || carrier.documentId !== verifiedDocument.id
    || carrier.documentContentHash !== verifiedDocument.contentHash) {
    throw new BaziStageCMaterialAdmissionError(
      "DOCUMENT_IDENTITY_CHAIN_MISMATCH",
      "KnowledgeDocument, SourceRights and SourceCarrier do not share the exact document id and content hash."
    );
  }
  if (source.url.startsWith("https://") && rights.source.sourceUrl !== source.url) {
    throw new BaziStageCMaterialAdmissionError(
      "REGISTRY_SOURCE_IDENTITY_MISMATCH",
      "SourceRights does not bind the exact pinned external source URL selected by the registry tuple."
    );
  }
  if (source.url.startsWith("/packages/") && rights.source.sourceUrl !== null) {
    throw new BaziStageCMaterialAdmissionError(
      "REGISTRY_SOURCE_IDENTITY_MISMATCH",
      "Repository source bindings must keep SourceRights.sourceUrl null rather than inventing a remote identity."
    );
  }

  if (!isRedistributableSourceMaterial(rights, carrier)) {
    throw new BaziStageCMaterialAdmissionError(
      "SOURCE_MATERIAL_NOT_REDISTRIBUTABLE",
      "The work, edition and carrier layers do not pass the structural redistribution gate."
    );
  }
  try {
    const validated = validateBundledKnowledgeManifestRelease([{
      path: input.bundlePath,
      documentId: verifiedDocument.id,
      contentHash: verifiedDocument.contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    if (validated.length !== 1
      || validated[0]?.documentId !== verifiedDocument.id
      || validated[0]?.contentHash !== verifiedDocument.contentHash) {
      throw new Error("Bundled release validator returned an unexpected projection.");
    }
  } catch (cause) {
    throw new BaziStageCMaterialAdmissionError(
      "BUNDLED_RELEASE_VALIDATION_FAILED",
      "The exact material tuple failed bundled KnowledgeDocument release validation.",
      { cause }
    );
  }
  if (document.format !== inferKnowledgeFormat(input.bundlePath)) {
    throw new BaziStageCMaterialAdmissionError(
      "KNOWLEDGE_DOCUMENT_FORMAT_MISMATCH",
      "KnowledgeDocument format does not match the production bundled body path extension."
    );
  }

  const [
    citationRecordDigest,
    knowledgeDocumentRecordDigest,
    sourceRightsRecordDigest,
    sourceCarrierRecordDigest,
    quoteSha256,
    targetKeysDigest
  ] = await Promise.all([
    domainSeparatedDigest(BAZI_STAGE_C_DIGEST_DOMAINS.citationRecord, verifiedCitation),
    domainSeparatedDigest(BAZI_STAGE_C_DIGEST_DOMAINS.knowledgeDocumentRecord, verifiedDocument),
    domainSeparatedDigest(BAZI_STAGE_C_DIGEST_DOMAINS.sourceRightsRecord, rights),
    domainSeparatedDigest(BAZI_STAGE_C_DIGEST_DOMAINS.sourceCarrierRecord, carrier),
    sha256Hex(verifiedCitation.quote),
    domainSeparatedDigest(BAZI_STAGE_C_DIGEST_DOMAINS.citationTargetKeys, verifiedCitation.targetKeys)
  ]);

  const tuple: BaziStageCMaterialTuple = deepFreeze({
    registryBinding: {
      reference: input.binding,
      exactLocator: {
        kind: binding.exactLocator.kind,
        value: binding.exactLocator.value,
        verificationStatus: binding.exactLocator.verificationStatus,
        contentSha256: binding.exactLocator.contentSha256
      }
    },
    registrySource: {
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      url: source.url,
      stableRevision: source.stableRevision,
      verificationStatus: source.verificationStatus
    },
    citation: {
      id: verifiedCitation.id,
      editVersion: verifiedCitation.editVersion,
      canonicalRecordDigest: citationRecordDigest,
      documentId: verifiedCitation.documentId,
      documentContentHash: verifiedCitation.documentContentHash,
      locator: {
        sectionId: verifiedCitation.locator.sectionId,
        startLine: verifiedCitation.locator.startLine,
        endLine: verifiedCitation.locator.endLine
      },
      quoteSha256,
      targetKeysDigest
    },
    knowledgeDocument: {
      id: verifiedDocument.id,
      contentHash: verifiedDocument.contentHash,
      editVersion: verifiedDocument.editVersion,
      canonicalRecordDigest: knowledgeDocumentRecordDigest
    },
    sourceRights: {
      documentId: rights.documentId,
      documentContentHash: rights.documentContentHash,
      editVersion: rights.editVersion,
      canonicalRecordDigest: sourceRightsRecordDigest
    },
    sourceCarrier: {
      carrierId: carrier.carrierId,
      documentId: carrier.documentId,
      documentContentHash: carrier.documentContentHash,
      contentDigest: carrier.contentDigest,
      editVersion: carrier.editVersion,
      canonicalRecordDigest: sourceCarrierRecordDigest
    },
    bundlePath: input.bundlePath
  });
  const tupleDigest = await domainSeparatedDigest(BAZI_STAGE_C_DIGEST_DOMAINS.materialBindingTuple, tuple);
  return deepFreeze({
    schemaVersion: BAZI_STAGE_C_MATERIAL_ADMISSION_CANDIDATE_VERSION,
    recordType: "bazi_stage_c_material_tuple_candidate",
    candidateOnly: true,
    authorityEffect: "none",
    tuple,
    tupleDigest,
    checks: {
      registryBindingSubjectSourceReferenceExact: true,
      registryBindingAndSourceIdentityCaptured: true,
      bindingCitationLocatorLinked: false,
      knowledgeDocumentContentAndSectionsExact: true,
      citationDocumentLocatorAndQuoteExact: true,
      citationVerifiedForExactSubject: true,
      documentRightsCarrierIdentityChainExact: true,
      structuralThreeLayerRedistributionGatePassed: true,
      bundledKnowledgeManifestEntryMetadataContractValidated: true,
      productionBodyInventoryAndBytesAudited: false
    },
    boundary: AUTHORITY_BOUNDARY
  });
}

/**
 * Builds a deterministic, structurally verified tuple candidate. This helper
 * does not freeze a binding, issue a mutation capability, or authorize use.
 * All untrusted input is captured synchronously before the returned Promise is
 * created, so caller mutation during Web Crypto hashing cannot alter the tuple.
 */
export function deriveBaziStageCMaterialTupleCandidate(input: unknown): Promise<BaziStageCMaterialTupleCandidate> {
  const captured = captureBaseInput(input, "derive");
  return buildTupleCandidate(captured);
}

/**
 * Checks consistency with a caller-provided tuple digest and emits a
 * fail-closed schema-13 candidate. This function does not verify that the
 * digest came from an independent issuer, receipt, or frozen trust anchor.
 * This package intentionally has no capability issuer, so even a completely
 * valid structural tuple remains unauthorized with the required epoch/ABA
 * rejection. Caller-authored capability objects are rejected synchronously.
 */
export function evaluateBaziStageCMaterialAdmissionCandidate(
  input: unknown
): Promise<BaziStageCMaterialAdmissionCandidate> {
  const captured = captureBaseInput(input, "evaluate");
  return evaluateCapturedInput(captured as CapturedBaseInput & { expectedTupleDigest: string });
}

async function evaluateCapturedInput(
  input: CapturedBaseInput & { expectedTupleDigest: string }
): Promise<BaziStageCMaterialAdmissionCandidate> {
  const tupleCandidate = await buildTupleCandidate(input);
  if (tupleCandidate.tupleDigest !== input.expectedTupleDigest) {
    throw new BaziStageCMaterialAdmissionError(
      "TUPLE_DIGEST_MISMATCH",
      "The material tuple does not match the caller-provided expected tuple digest."
    );
  }
  const candidateWithoutDigest = {
    schemaVersion: BAZI_STAGE_C_MATERIAL_ADMISSION_CANDIDATE_VERSION,
    recordType: "bazi_stage_c_material_admission_candidate" as const,
    candidateOnly: true as const,
    authorityEffect: "none" as const,
    releaseGovernance: {
      activeLine: "legacy-v13" as const,
      targetSchema: 13 as const,
      migrationId: null,
      publicDeploymentAuthorized: false as const,
      expertClaimsAuthorized: false as const
    },
    tuple: tupleCandidate.tuple,
    tupleDigest: tupleCandidate.tupleDigest,
    expectedTupleDigest: input.expectedTupleDigest,
    callerProvidedTupleDigestMatched: true as const,
    externalTuplePinVerified: false as const,
    checks: tupleCandidate.checks,
    mutationBoundary: {
      snapshotCapabilityIssuerProvided: false as const,
      mutationEpochCapabilityAvailable: false as const,
      crossFileAtomicSnapshot: false as const,
      intervalMutationExcluded: false as const,
      abaExcluded: false as const
    },
    boundary: AUTHORITY_BOUNDARY,
    materialLayerStructuralGatesPassed: true as const,
    structuralGatePassed: false as const,
    admissionAuthorized: false as const,
    rejectionCode: "BINDING_CITATION_LOCATOR_LINK_UNAVAILABLE" as const,
    blockingReasons: [
      "BINDING_CITATION_LOCATOR_LINK_UNAVAILABLE",
      "EXTERNAL_TUPLE_PIN_UNVERIFIED",
      "MUTATION_EPOCH_CAPABILITY_UNAVAILABLE"
    ] as const
  };
  const candidateDigest = await domainSeparatedDigest(
    BAZI_STAGE_C_DIGEST_DOMAINS.admissionCandidate,
    candidateWithoutDigest
  );
  return deepFreeze({ ...candidateWithoutDigest, candidateDigest });
}
