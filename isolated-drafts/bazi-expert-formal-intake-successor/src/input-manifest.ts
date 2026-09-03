import {
  assertArray,
  assertBoolean,
  assertExactKeys,
  assertObject,
  assertString,
  canonicalStringify,
  captureJson,
  domainDigest,
  fail,
  parseStrictJsonBytes,
  type JsonObject,
  type JsonValue
} from "./canonical.ts";
import {
  BINDING_IDS,
  RELEASE_GOVERNANCE,
  REVIEW_INPUT_MANIFEST_VERSION,
  REVIEW_QUESTIONS,
  SHARING_POLICY_CODES,
  SUCCESSOR_VERSION,
  type BindingCandidate,
  type ReviewInputManifestV3,
  type SharingPolicyCode
} from "./protocol.ts";
import { readStableWorkspaceFile } from "./stable-file.ts";

const MACHINE_IDENTITY_PATH =
  "content/system-admission/bazi-current-machine-identity-successor.v1.1.0.json";
const READINESS_PATH =
  "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json";
const EXPECTED_MACHINE_IDENTITY_RAW_SHA256 =
  "787c5cd5994923805ca37b096be5ae36a94cf5f809c6892ce854e9b193ddff7b";
const EXPECTED_READINESS_RAW_SHA256 =
  "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797";
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,255}$/u;
const MANIFEST_ID = /^bazi-review-input-manifest\/[a-f0-9]{64}$/u;
const MANIFEST_DIGEST_DOMAIN = "hakimi/bazi/current-review-input-manifest/v3" as const;
const BINDING_DIGEST_DOMAIN = "hakimi/bazi/current-review-input-manifest/v3/binding";
const BINDING_SET_DIGEST_DOMAIN = "hakimi/bazi/current-review-input-manifest/v3/binding-set";
const QUESTION_SET_DIGEST_DOMAIN = "hakimi/bazi/current-review-input-manifest/v3/question-set";
const MANIFEST_ID_DOMAIN = "hakimi/bazi/current-review-input-manifest/v3/id";

type ManifestWithoutIdentityAndIntegrity = Omit<ReviewInputManifestV3, "manifestId" | "integrity">;

function requireSha(value: JsonValue, path: string): string {
  assertString(value, path, 64);
  if (!SHA256.test(value)) fail("MANIFEST_INVALID", `${path} 不是 SHA-256。`);
  return value;
}

function requireId(value: JsonValue, path: string): string {
  assertString(value, path, 256);
  if (!SAFE_ID.test(value)) fail("MANIFEST_INVALID", `${path} 标识无效。`);
  return value;
}

function requireInteger(value: JsonValue, path: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail("MANIFEST_INVALID", `${path} 整数无效。`);
  }
  return value;
}

function requireNullableSha(value: JsonValue, path: string): string | null {
  return value === null ? null : requireSha(value, path);
}

function requireFixed(value: JsonValue, expected: unknown, path: string): void {
  if (canonicalStringify(value) !== canonicalStringify(expected)) {
    fail("MANIFEST_INVALID", `${path} 固定投影失配。`);
  }
}

function candidateUnsigned(candidate: Omit<BindingCandidate, "candidateDigest">): Omit<BindingCandidate, "candidateDigest"> {
  return candidate;
}

function candidateDigest(candidate: Omit<BindingCandidate, "candidateDigest">): string {
  return domainDigest(BINDING_DIGEST_DOMAIN, candidateUnsigned(candidate));
}

function validateBindingCandidate(value: JsonValue, index: number): BindingCandidate {
  const path = `manifest.bindingCandidates.${index}`;
  assertExactKeys(value, [
    "order", "bindingId", "evidenceSubjectId", "sourceClassCode", "candidateStatusCode",
    "candidateDigest", "formalBindingDigest", "sharingPolicyCode"
  ], path);
  const order = requireInteger(value.order!, `${path}.order`, 1, 12);
  if (order !== index + 1 || value.bindingId !== BINDING_IDS[index]) {
    fail("MANIFEST_INVALID", `${path} 顺序或 bindingId 失配。`);
  }
  const evidenceSubjectId = requireId(value.evidenceSubjectId!, `${path}.evidenceSubjectId`);
  const sourceClassCodes = ["engineering_candidate", "historical_source_candidate", "review_gate_candidate"];
  if (typeof value.sourceClassCode !== "string" || !sourceClassCodes.includes(value.sourceClassCode)) {
    fail("MANIFEST_INVALID", `${path}.sourceClassCode 无效。`);
  }
  const candidateStatusCodes = ["pre_freeze_candidate", "frozen", "blocked"];
  if (typeof value.candidateStatusCode !== "string" || !candidateStatusCodes.includes(value.candidateStatusCode)) {
    fail("MANIFEST_INVALID", `${path}.candidateStatusCode 无效。`);
  }
  if (typeof value.sharingPolicyCode !== "string"
    || !SHARING_POLICY_CODES.includes(value.sharingPolicyCode as SharingPolicyCode)) {
    fail("MANIFEST_INVALID", `${path}.sharingPolicyCode 无效。`);
  }
  const outputWithoutDigest = {
    order,
    bindingId: value.bindingId as string,
    evidenceSubjectId,
    sourceClassCode: value.sourceClassCode as BindingCandidate["sourceClassCode"],
    candidateStatusCode: value.candidateStatusCode as BindingCandidate["candidateStatusCode"],
    formalBindingDigest: requireNullableSha(value.formalBindingDigest!, `${path}.formalBindingDigest`),
    sharingPolicyCode: value.sharingPolicyCode as SharingPolicyCode
  };
  const observedDigest = requireSha(value.candidateDigest!, `${path}.candidateDigest`);
  if (observedDigest !== candidateDigest(outputWithoutDigest)) {
    fail("MANIFEST_INVALID", `${path}.candidateDigest 失配。`);
  }
  if (outputWithoutDigest.candidateStatusCode === "frozen" && outputWithoutDigest.formalBindingDigest === null) {
    fail("MANIFEST_INVALID", `${path} frozen 候选缺少 formal binding digest。`);
  }
  if (outputWithoutDigest.candidateStatusCode !== "frozen" && outputWithoutDigest.formalBindingDigest !== null) {
    fail("MANIFEST_INVALID", `${path} 未冻结候选不得有 formal binding digest。`);
  }
  return Object.freeze({
    order: outputWithoutDigest.order,
    bindingId: outputWithoutDigest.bindingId,
    evidenceSubjectId: outputWithoutDigest.evidenceSubjectId,
    sourceClassCode: outputWithoutDigest.sourceClassCode,
    candidateStatusCode: outputWithoutDigest.candidateStatusCode,
    candidateDigest: observedDigest,
    formalBindingDigest: outputWithoutDigest.formalBindingDigest,
    sharingPolicyCode: outputWithoutDigest.sharingPolicyCode
  });
}

function validateManifestObject(value: JsonValue): ReviewInputManifestV3 {
  assertExactKeys(value, [
    "schemaVersion", "recordType", "manifestId", "successorVersion", "releaseGovernance",
    "machineIdentityRef", "readinessRef", "questionSet", "bindingCandidates", "closure",
    "boundaries", "integrity"
  ], "manifest");
  if (value.schemaVersion !== "3.0.0"
    || value.recordType !== "bazi_current_review_input_manifest_v3"
    || value.successorVersion !== SUCCESSOR_VERSION) {
    fail("MANIFEST_INVALID", "manifest 类型或版本无效。");
  }
  assertString(value.manifestId!, "manifest.manifestId", 128);
  if (!MANIFEST_ID.test(value.manifestId)) fail("MANIFEST_INVALID", "manifestId 无效。");
  requireFixed(value.releaseGovernance!, RELEASE_GOVERNANCE, "manifest.releaseGovernance");

  assertExactKeys(value.machineIdentityRef!, [
    "successorId", "receiptDigest", "currentMachineIdentityDigest", "rawSha256"
  ], "manifest.machineIdentityRef");
  const machineIdentityRef = {
    successorId: requireId(value.machineIdentityRef.successorId!, "manifest.machineIdentityRef.successorId"),
    receiptDigest: requireSha(value.machineIdentityRef.receiptDigest!, "manifest.machineIdentityRef.receiptDigest"),
    currentMachineIdentityDigest: requireSha(
      value.machineIdentityRef.currentMachineIdentityDigest!,
      "manifest.machineIdentityRef.currentMachineIdentityDigest"
    ),
    rawSha256: requireSha(value.machineIdentityRef.rawSha256!, "manifest.machineIdentityRef.rawSha256")
  };

  assertExactKeys(value.readinessRef!, ["ledgerId", "ledgerDigest", "rawSha256"], "manifest.readinessRef");
  const readinessRef = {
    ledgerId: requireId(value.readinessRef.ledgerId!, "manifest.readinessRef.ledgerId"),
    ledgerDigest: requireSha(value.readinessRef.ledgerDigest!, "manifest.readinessRef.ledgerDigest"),
    rawSha256: requireSha(value.readinessRef.rawSha256!, "manifest.readinessRef.rawSha256")
  };

  assertExactKeys(value.questionSet!, ["questionSetVersion", "questionSetDigest", "questions"], "manifest.questionSet");
  if (value.questionSet.questionSetVersion !== "bazi-formal-review-question-set/2.0.0") {
    fail("MANIFEST_INVALID", "question set version 无效。");
  }
  requireFixed(value.questionSet.questions!, REVIEW_QUESTIONS, "manifest.questionSet.questions");
  const questionSetDigest = requireSha(value.questionSet.questionSetDigest!, "manifest.questionSet.questionSetDigest");
  if (questionSetDigest !== domainDigest(QUESTION_SET_DIGEST_DOMAIN, REVIEW_QUESTIONS)) {
    fail("MANIFEST_INVALID", "question set digest 失配。");
  }

  assertArray(value.bindingCandidates!, "manifest.bindingCandidates");
  if (value.bindingCandidates.length !== BINDING_IDS.length) {
    fail("MANIFEST_INVALID", "manifest 必须精确绑定 12 个 binding candidates。");
  }
  const bindingCandidates = value.bindingCandidates.map((entry, index) => validateBindingCandidate(entry, index));

  assertExactKeys(value.closure!, [
    "bindingRequired", "bindingFrozenVerified", "candidateBindingSetDigest",
    "finalFrozenBindingSetDigest", "finalFrozenInputExactMatch",
    "allReviewMaterialsMarkedShareableBySuppliedPolicy"
  ], "manifest.closure");
  if (value.closure.bindingRequired !== 12) fail("MANIFEST_INVALID", "bindingRequired 必须是 12。");
  const bindingFrozenVerified = requireInteger(
    value.closure.bindingFrozenVerified!,
    "manifest.closure.bindingFrozenVerified",
    0,
    12
  );
  const candidateBindingSetDigest = requireSha(
    value.closure.candidateBindingSetDigest!,
    "manifest.closure.candidateBindingSetDigest"
  );
  if (candidateBindingSetDigest !== domainDigest(BINDING_SET_DIGEST_DOMAIN, bindingCandidates)) {
    fail("MANIFEST_INVALID", "candidate binding set digest 失配。");
  }
  const finalFrozenBindingSetDigest = requireNullableSha(
    value.closure.finalFrozenBindingSetDigest!,
    "manifest.closure.finalFrozenBindingSetDigest"
  );
  assertBoolean(value.closure.finalFrozenInputExactMatch!, "manifest.closure.finalFrozenInputExactMatch");
  assertBoolean(
    value.closure.allReviewMaterialsMarkedShareableBySuppliedPolicy!,
    "manifest.closure.allReviewMaterialsMarkedShareableBySuppliedPolicy"
  );
  const frozenCount = bindingCandidates.filter((entry) => entry.candidateStatusCode === "frozen").length;
  if (frozenCount !== bindingFrozenVerified) fail("MANIFEST_INVALID", "frozen candidate count 失配。");
  const allShareable = bindingCandidates.every((entry) => entry.sharingPolicyCode !== "not_authorized");
  if (value.closure.allReviewMaterialsMarkedShareableBySuppliedPolicy !== allShareable) {
    fail("MANIFEST_INVALID", "sharing policy 汇总失配。");
  }
  if (bindingFrozenVerified === 12) {
    if (value.closure.finalFrozenInputExactMatch !== true
      || finalFrozenBindingSetDigest !== candidateBindingSetDigest) {
      fail("MANIFEST_INVALID", "12/12 必须绑定完全相同的 final frozen input。");
    }
  } else if (value.closure.finalFrozenInputExactMatch !== false || finalFrozenBindingSetDigest !== null) {
    fail("MANIFEST_INVALID", "未达 12/12 不得声称 final frozen exact match。");
  }

  const expectedBoundaries = {
    historicalPacketIsAuthority: false,
    pilotConversionAllowed: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    currentEndpointAuthorityEstablished: false,
    sourceArtifactSelfDigestsRecomputed: false,
    sourceLoaderPrivateBrandsVerified: false,
    candidateDigestsAreDigitalSignatures: false,
    crossFileAtomicSnapshot: false,
    intervalMutationExcluded: false,
    abaExcluded: false
  } as const;
  requireFixed(value.boundaries!, expectedBoundaries, "manifest.boundaries");
  assertExactKeys(value.integrity!, ["digestDomain", "manifestDigest", "digestIsDigitalSignature"], "manifest.integrity");
  if (value.integrity.digestDomain !== MANIFEST_DIGEST_DOMAIN || value.integrity.digestIsDigitalSignature !== false) {
    fail("MANIFEST_INVALID", "manifest integrity boundary 无效。");
  }
  const observedManifestDigest = requireSha(value.integrity.manifestDigest!, "manifest.integrity.manifestDigest");
  const { integrity: _integrity, ...unsigned } = value;
  if (observedManifestDigest !== domainDigest(MANIFEST_DIGEST_DOMAIN, unsigned)) {
    fail("MANIFEST_INVALID", "manifest digest 失配。");
  }
  const { manifestId: _manifestId, ...identitySeed } = unsigned;
  if (value.manifestId !== `bazi-review-input-manifest/${domainDigest(MANIFEST_ID_DOMAIN, identitySeed)}`) {
    fail("MANIFEST_INVALID", "manifestId 与内容身份失配。");
  }

  return Object.freeze(captureJson(value) as unknown as ReviewInputManifestV3);
}

export function validateReviewInputManifestV3(input: unknown): ReviewInputManifestV3 {
  return validateManifestObject(captureJson(input, "manifest"));
}

export function sealReviewInputManifestV3Candidate(input: unknown): ReviewInputManifestV3 {
  const captured = captureJson(input, "manifest candidate");
  assertExactKeys(captured, [
    "schemaVersion", "recordType", "successorVersion", "releaseGovernance", "machineIdentityRef",
    "readinessRef", "questionSet", "bindingCandidates", "closure", "boundaries"
  ], "manifest candidate");
  const manifestId = `bazi-review-input-manifest/${domainDigest(MANIFEST_ID_DOMAIN, captured)}`;
  const unsigned = { ...captured, manifestId };
  const sealed = {
    ...unsigned,
    integrity: {
      digestDomain: MANIFEST_DIGEST_DOMAIN,
      manifestDigest: domainDigest(MANIFEST_DIGEST_DOMAIN, unsigned),
      digestIsDigitalSignature: false
    }
  };
  return validateReviewInputManifestV3(sealed);
}

function sourceClassCode(binding: JsonObject): BindingCandidate["sourceClassCode"] {
  if (binding.sourceType === "engineering_contract") return "engineering_candidate";
  if (binding.sourceType === "public_domain_classic_transcription") return "historical_source_candidate";
  if (binding.sourceType === "review_gate_locator") return "review_gate_candidate";
  return fail("CURRENT_READINESS_INVALID", "binding sourceType 未识别。");
}

function candidateStatusCode(binding: JsonObject): BindingCandidate["candidateStatusCode"] {
  if (binding.freezeState === "candidate_only_unbound") return "pre_freeze_candidate";
  if (binding.freezeState === "blocked_unbound") return "blocked";
  if (binding.freezeState === "frozen") return "frozen";
  return fail("CURRENT_READINESS_INVALID", "binding freezeState 未识别。");
}

function sharingPolicyCode(binding: JsonObject): SharingPolicyCode {
  if (binding.formalDistributionPolicy === "private_review_only") return "private_review_only";
  if (binding.formalDistributionPolicy === "link_only") return "link_only";
  if (binding.formalDistributionPolicy === "redistributable") return "redistributable";
  if (binding.formalDistributionPolicy === null
    && binding.currentDistributionBoundary === "link_only_no_redistribution_clearance") return "link_only";
  return "not_authorized";
}

function readRequiredObject(parent: JsonObject, key: string, path: string): JsonObject {
  const value = parent[key];
  assertObject(value!, `${path}.${key}`);
  return value;
}

export async function buildCurrentReviewInputManifestV3(workspaceRoot: string): Promise<ReviewInputManifestV3> {
  const [machineRead, readinessRead] = await Promise.all([
    readStableWorkspaceFile(workspaceRoot, MACHINE_IDENTITY_PATH, 2 * 1024 * 1024, "current machine identity"),
    readStableWorkspaceFile(workspaceRoot, READINESS_PATH, 2 * 1024 * 1024, "binding readiness")
  ]);
  const machine = parseStrictJsonBytes(machineRead.bytes, "current machine identity", 2 * 1024 * 1024);
  const readiness = parseStrictJsonBytes(readinessRead.bytes, "binding readiness", 2 * 1024 * 1024);
  if (machineRead.rawSha256 !== EXPECTED_MACHINE_IDENTITY_RAW_SHA256
    || readinessRead.rawSha256 !== EXPECTED_READINESS_RAW_SHA256) {
    fail("CURRENT_INPUT_SOURCE_DRIFT", "current machine identity 或 readiness raw identity 已漂移。");
  }
  assertObject(machine, "current machine identity");
  assertObject(readiness, "binding readiness");
  if (machine.schemaVersion !== "1.1.0"
    || machine.recordType !== "bazi_current_machine_identity_successor_v1_1"
    || machine.successorId !== "hakimi.bazi.current-machine-identity-successor/1.1.0") {
    fail("CURRENT_MACHINE_IDENTITY_INVALID", "current machine identity 语义身份无效。");
  }
  requireFixed(machine.releaseGovernance!, {
    expertClaimsAuthorized: false,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    releaseIdentity: "legacy-v13",
    targetSchema: 13
  }, "current machine identity release governance");
  const currentMachineIdentity = readRequiredObject(machine, "currentMachineIdentity", "machine");
  const machineIdentityRef = {
    successorId: requireId(machine.successorId!, "machine.successorId"),
    receiptDigest: requireSha(machine.receiptDigest!, "machine.receiptDigest"),
    currentMachineIdentityDigest: requireSha(
      currentMachineIdentity.currentMachineIdentityDigest!,
      "machine.currentMachineIdentity.currentMachineIdentityDigest"
    ),
    rawSha256: machineRead.rawSha256
  };

  if (readiness.schemaVersion !== "1.9.0"
    || readiness.recordType !== "bazi_binding_freeze_knowledge_core_identity_rebound_candidate_readiness_v1_9"
    || readiness.ledgerId !== "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0") {
    fail("CURRENT_READINESS_INVALID", "binding readiness 语义身份无效。");
  }
  requireFixed(readiness.releaseGovernance!, {
    activeLine: "legacy-v13",
    expertClaimsAuthorized: false,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    targetSchema: 13
  }, "binding readiness release governance");
  const readinessRef = {
    ledgerId: requireId(readiness.ledgerId!, "readiness.ledgerId"),
    ledgerDigest: requireSha(readiness.ledgerDigest!, "readiness.ledgerDigest"),
    rawSha256: readinessRead.rawSha256
  };
  assertArray(readiness.bindings!, "readiness.bindings");
  if (readiness.bindings.length !== BINDING_IDS.length) {
    fail("CURRENT_READINESS_INVALID", "binding readiness 不是 12 条。");
  }
  const bindingCandidates: BindingCandidate[] = readiness.bindings.map((entry, index) => {
    assertObject(entry, `readiness.bindings.${index}`);
    if (entry.bindingId !== BINDING_IDS[index]) fail("CURRENT_READINESS_INVALID", "binding order 失配。");
    const withoutDigest = {
      order: index + 1,
      bindingId: entry.bindingId,
      evidenceSubjectId: requireId(entry.evidenceSubjectId!, `readiness.bindings.${index}.evidenceSubjectId`),
      sourceClassCode: sourceClassCode(entry),
      candidateStatusCode: candidateStatusCode(entry),
      formalBindingDigest: entry.bindingDigest === null
        ? null
        : requireSha(entry.bindingDigest!, `readiness.bindings.${index}.bindingDigest`),
      sharingPolicyCode: sharingPolicyCode(entry)
    } as Omit<BindingCandidate, "candidateDigest">;
    return Object.freeze({ ...withoutDigest, candidateDigest: candidateDigest(withoutDigest) });
  });
  const gateSummary = readRequiredObject(readiness, "gateSummary", "readiness");
  const bindingFrozenVerified = requireInteger(
    gateSummary.bindingFrozenVerified!,
    "readiness.gateSummary.bindingFrozenVerified",
    0,
    12
  );
  const bindingSetDigest = domainDigest(BINDING_SET_DIGEST_DOMAIN, bindingCandidates);
  const allFrozen = bindingFrozenVerified === 12
    && bindingCandidates.every((entry) => entry.candidateStatusCode === "frozen");
  const candidate: ManifestWithoutIdentityAndIntegrity = {
    schemaVersion: "3.0.0",
    recordType: "bazi_current_review_input_manifest_v3",
    successorVersion: SUCCESSOR_VERSION,
    releaseGovernance: RELEASE_GOVERNANCE,
    machineIdentityRef,
    readinessRef,
    questionSet: {
      questionSetVersion: "bazi-formal-review-question-set/2.0.0",
      questionSetDigest: domainDigest(QUESTION_SET_DIGEST_DOMAIN, REVIEW_QUESTIONS),
      questions: REVIEW_QUESTIONS
    },
    bindingCandidates,
    closure: {
      bindingRequired: 12,
      bindingFrozenVerified,
      candidateBindingSetDigest: bindingSetDigest,
      finalFrozenBindingSetDigest: allFrozen ? bindingSetDigest : null,
      finalFrozenInputExactMatch: allFrozen,
      allReviewMaterialsMarkedShareableBySuppliedPolicy: bindingCandidates.every(
        (entry) => entry.sharingPolicyCode !== "not_authorized"
      )
    },
    boundaries: {
      historicalPacketIsAuthority: false,
      pilotConversionAllowed: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      currentEndpointAuthorityEstablished: false,
      sourceArtifactSelfDigestsRecomputed: false,
      sourceLoaderPrivateBrandsVerified: false,
      candidateDigestsAreDigitalSignatures: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    }
  };
  return sealReviewInputManifestV3Candidate(candidate);
}

export function reviewInputManifestRef(manifest: ReviewInputManifestV3) {
  return Object.freeze({
    manifestId: manifest.manifestId,
    manifestDigest: manifest.integrity.manifestDigest
  });
}

export const REVIEW_INPUT_MANIFEST_SOURCE_BOUNDARY = Object.freeze({
  machineIdentityPathUsedInternally: MACHINE_IDENTITY_PATH,
  readinessPathUsedInternally: READINESS_PATH,
  outputContainsFilesystemPaths: false,
  historicalPacketIdUsedAsAuthority: false,
  reviewInputManifestVersion: REVIEW_INPUT_MANIFEST_VERSION,
  expectedMachineIdentityRawSha256: EXPECTED_MACHINE_IDENTITY_RAW_SHA256,
  expectedReadinessRawSha256: EXPECTED_READINESS_RAW_SHA256
});
