import {
  SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES,
  canonicalStringifySingleBindingIntegrated as canonicalStringify,
  parseSingleBindingIntegratedStrictJsonBytes as parseStrictJsonBytes,
  parseSingleBindingIntegratedStrictJsonText as parseStrictJsonText,
  serializeSingleBindingIntegratedUtf8Json as serializeUtf8Json,
  sha256SingleBindingIntegratedBytes as sha256HexBytes,
  sha256SingleBindingIntegratedText as sha256HexText
} from "./single-binding-integrated-json.js";
import {
  SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE
} from "./single-binding-rehearsal-contract.js";
import {
  SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
  createSingleBindingIntegratedSessionBinding,
  isSingleBindingIntegratedSubmissionCandidate,
  preflightSingleBindingIntegratedSubmissionValue
} from "./single-binding-integrated-contract.js";

const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const REFLECT_APPLY = Reflect.apply;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(
  TYPED_ARRAY_PROTOTYPE,
  "byteLength"
).get;
const TYPED_ARRAY_SET = Uint8Array.prototype.set;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export const SINGLE_BINDING_INTEGRATED_HANDOFF_VERSION =
  "hakimi.bazi.expert-single-binding-nocode-synthetic-pilot-integrated-handoff/1.0.0";
export const SINGLE_BINDING_INTEGRATED_HANDOFF_PURPOSE =
  "synthetic_single_binding_nocode_integrated_handoff_pilot_only";
export const SINGLE_BINDING_INTEGRATED_HANDOFF_RECORD_TYPES = OBJECT_FREEZE([
  "bazi_expert_single_binding_nocode_synthetic_pilot_handoff_artifacts_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_file_seal_receipt_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_complete_return_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_complete_return_preflight_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_pair_comparison_candidate_v1"
]);

export const SINGLE_BINDING_INTEGRATED_PROFESSIONAL_FIELDS = OBJECT_FREEZE([
  "position",
  "cannotDecideReason",
  "rationale",
  "applicabilityConditions",
  "counterexamplesOrNeededEvidence",
  "highRiskDisposition",
  "revisionSuggestion"
]);

export const SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY = OBJECT_FREEZE({
  syntheticOnly: true,
  syntheticFixtureOnly: true,
  selectedBindingCount: 1,
  logicalArtifactsRemainSeparate: true,
  exactSessionSubmissionBytesEmbedded: true,
  independentSealReceiptEmbedded: true,
  checksumTextEmbedded: true,
  realExpertMaterialCollectionAuthorized: false,
  realPersonDataCollectionAuthorized: false,
  actualHumanParticipationEstablished: false,
  actualHumanIndependenceEstablished: false,
  reviewerIdentityEstablished: false,
  reviewerQualificationEstablished: false,
  reviewerConsentEstablished: false,
  opinionAuthenticityEstablished: false,
  trustedBootstrapEstablished: false,
  pinProvenanceVerified: false,
  signatureVerified: false,
  firstSeenEstablished: false,
  custodyEstablished: false,
  sameCycleReplayExcluded: false,
  samePairRunReplayExcluded: false,
  formalPurposeReused: false,
  formalRecordEmitted: false,
  pilotToFormalConversionAllowed: false,
  formalAdmissionAllowed: false,
  formalTwoOfTwoCountDelta: 0,
  expertGateCountDelta: 0,
  verifiedExpertCount: 0,
  requiredExpertCount: 2,
  frozenBindingCount: 0,
  requiredBindingCount: 12,
  bindingFreezeEffect: "none",
  winnerSelectionAllowed: false,
  majorityVoteAllowed: false,
  opinionAveragingAllowed: false,
  automaticMergeAllowed: false,
  generatedModelAdjudicationAllowed: false,
  expertVsAiAccuracyEvaluated: false,
  predictiveAccuracyEvaluated: false,
  accuracyStudyRecordEmitted: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  releaseReady: false,
  publicReleaseAuthorized: false,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false,
  safeToPublish: false,
  personDataPresenceAssessed: false,
  personDerivedDigestExcluded: false,
  repositoryStorageAllowed: false,
  networkUploadPerformed: false,
  handlingClassification: "private_in_memory_synthetic_pilot_with_unassessed_free_text"
});

export const SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY = OBJECT_FREEZE({
  persistencePerformed: false,
  productStorageMutationPerformed: false,
  schema13MutationEpochUsed: false,
  crossFileAtomicSnapshotEstablished: false,
  samePrivilegeIntervalMutationExcluded: false,
  intervalMutationExcluded: false,
  abaExcluded: false,
  replayExcluded: false
});

export const SINGLE_BINDING_INTEGRATED_HANDOFF_INTEGRITY_BOUNDARY = OBJECT_FREEZE({
  digestIsDigitalSignature: false,
  authenticityEstablished: false,
  trustedTimeEstablished: false,
  firstSeenEstablished: false,
  custodyEstablished: false,
  serializedCloneRetainsProcessBrand: false
});

export class SingleBindingIntegratedHandoffError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SingleBindingIntegratedHandoffError";
    this.code = code;
  }
}

const ARTIFACTS_BRAND = new WeakSet();
const PREFLIGHT_BRAND = new WeakSet();
const PAIR_BRAND = new WeakSet();

function call(fn, thisArg, args) {
  return REFLECT_APPLY(fn, thisArg, args);
}

function fail(code, message) {
  throw new SingleBindingIntegratedHandoffError(code, message);
}

function captureJson(value, state = { nodes: 0, active: new WeakSet() }, depth = 0) {
  state.nodes += 1;
  if (state.nodes > 30_000 || depth > 48) {
    fail("INPUT_LIMIT_EXCEEDED", "integrated handoff 输入超过结构上限。 ");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INPUT_VALUE_INVALID", "integrated handoff 输入含非有限数值。 ");
    return value;
  }
  if (typeof value !== "object" || state.active.has(value)) {
    fail("INPUT_VALUE_INVALID", "integrated handoff 输入必须是无循环 JSON 值。 ");
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 1_024) {
      fail("INPUT_ARRAY_INVALID", "integrated handoff 输入数组无效。 ");
    }
    state.active.add(value);
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        fail("INPUT_ARRAY_INVALID", "integrated handoff 输入不接受稀疏数组。 ");
      }
      result.push(captureJson(value[index], state, depth + 1));
    }
    state.active.delete(value);
    return result;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    fail("INPUT_PROTOTYPE_INVALID", "integrated handoff 输入只接受普通 JSON 对象。 ");
  }
  state.active.add(value);
  const result = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (["__proto__", "prototype", "constructor"].includes(key)
      || !descriptor.enumerable || descriptor.get || descriptor.set) {
      fail("INPUT_FIELD_INVALID", "integrated handoff 输入含禁止键或访问器。 ");
    }
    result[key] = captureJson(descriptor.value, state, depth + 1);
  }
  state.active.delete(value);
  return result;
}

function cloneJson(value) {
  return captureJson(value);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of OBJECT_VALUES(value)) deepFreeze(child, seen);
  return OBJECT_FREEZE(value);
}

function assertExactKeys(value, expected, label, code = "INPUT_SHAPE_INVALID") {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(code, `${label} 必须是普通对象。 `);
  }
  const actual = OBJECT_KEYS(value).sort();
  const wanted = [...expected].sort();
  if (canonicalStringify(actual) !== canonicalStringify(wanted)) {
    fail(code, `${label} 字段闭集无效。 `);
  }
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!descriptor.enumerable || descriptor.get || descriptor.set) {
      fail(code, `${label} 不接受访问器或隐藏字段。 `);
    }
  }
}

function assertFixed(value, expected, label, code = "FIXED_BOUNDARY_MISMATCH") {
  if (canonicalStringify(value) !== canonicalStringify(expected)) {
    fail(code, `${label} 固定边界失配。 `);
  }
}

function assertSha256(value, label, code = "SHA256_INVALID") {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value) || /^0{64}$/u.test(value)) {
    fail(code, `${label} 必须是非零小写 SHA-256。 `);
  }
}

function utf8ByteLength(text) {
  return new TextEncoder().encode(text).byteLength;
}

async function domainDigest(domain, value) {
  return sha256HexText(`${domain}\0${canonicalStringify(value)}`);
}

function makeIntegrity(digestDomain, recordDigest) {
  return {
    hashAlgorithm: "SHA-256",
    digestDomain,
    recordDigest,
    digestIsDigitalSignature: false,
    authenticityEstablished: false
  };
}

async function assertIntegrity(record, digestDomain, label) {
  assertExactKeys(record.integrity, [
    "hashAlgorithm", "digestDomain", "recordDigest", "digestIsDigitalSignature",
    "authenticityEstablished"
  ], `${label}.integrity`, "RECORD_INTEGRITY_INVALID");
  assertSha256(record.integrity.recordDigest, `${label}.integrity.recordDigest`, "RECORD_INTEGRITY_INVALID");
  const { integrity: _integrity, ...unsigned } = record;
  const expected = await domainDigest(digestDomain, unsigned);
  if (record.integrity.hashAlgorithm !== "SHA-256"
    || record.integrity.digestDomain !== digestDomain
    || record.integrity.recordDigest !== expected
    || record.integrity.digestIsDigitalSignature !== false
    || record.integrity.authenticityEstablished !== false) {
    fail("RECORD_INTEGRITY_INVALID", `${label} integrity 失配或越权。 `);
  }
}

function artifactSummary(entry) {
  return {
    role: entry.role,
    filename: entry.filename,
    mediaType: entry.mediaType,
    encoding: entry.encoding,
    rawSha256: entry.rawSha256,
    byteLength: entry.byteLength
  };
}

function makeArtifact(role, filename, mediaType, exactUtf8Text, rawSha256) {
  return {
    role,
    filename,
    mediaType,
    encoding: "utf-8",
    rawSha256,
    byteLength: utf8ByteLength(exactUtf8Text),
    exactUtf8Text
  };
}

export function singleBindingIntegratedFilenamesForSession(sessionBindingInput) {
  const sessionBinding = createSingleBindingIntegratedSessionBinding(sessionBindingInput);
  const seat = sessionBinding.seatId.toLowerCase();
  const cycleSuffix = sessionBinding.reviewCycleId.slice(-8);
  const pairSuffix = sessionBinding.pairRunId.slice(-8);
  const nonceSuffix = sessionBinding.seatSessionNonce.slice(-12);
  const stem = `hakimi-bazi-single-binding-synthetic-pilot-seat-${seat}-cycle-${cycleSuffix}-pair-${pairSuffix}-session-${nonceSuffix}`;
  const sessionSubmissionFilename = `${stem}-session-submission.json`;
  return deepFreeze({
    sessionSubmissionFilename,
    sealReceiptFilename: `${stem}-seal-receipt.json`,
    checksumFilename: `${sessionSubmissionFilename}.sha256.txt`,
    completeReturnFilename: `${stem}-complete-return.json`
  });
}

function submissionRef(submission) {
  return {
    submissionId: submission.submissionId,
    submissionDigest: submission.submissionDigest,
    sessionReadbackDigest: submission.sessionReadbackDigest
  };
}

function assertArtifactEntry(entry, expected, index) {
  assertExactKeys(entry, [
    "role", "filename", "mediaType", "encoding", "rawSha256", "byteLength",
    "exactUtf8Text"
  ], `embeddedArtifacts.${index}`, "EMBEDDED_ARTIFACT_INVALID");
  if (entry.role !== expected.role
    || entry.filename !== expected.filename
    || entry.mediaType !== expected.mediaType
    || entry.encoding !== "utf-8"
    || !Number.isSafeInteger(entry.byteLength)
    || entry.byteLength < 0
    || /[\\/:]/u.test(entry.filename)
    || entry.filename === "."
    || entry.filename === "..") {
    fail("EMBEDDED_ARTIFACT_INVALID", `embeddedArtifacts.${index} 身份、文件名或字节长度无效。 `);
  }
  if (typeof entry.exactUtf8Text !== "string") {
    fail("EMBEDDED_ARTIFACT_INVALID", `embeddedArtifacts.${index}.exactUtf8Text 必须是字符串。 `);
  }
  assertSha256(entry.rawSha256, `embeddedArtifacts.${index}.rawSha256`, "EMBEDDED_ARTIFACT_INVALID");
}

function copyBytes(bytes, label) {
  if (bytes === null || typeof bytes !== "object"
    || call(OBJECT_GET_PROTOTYPE_OF, Object, [bytes]) !== Uint8Array.prototype) {
    fail("COMPLETE_RETURN_BYTES_INVALID", `${label} 必须是精确原生 Uint8Array，不能是子类或其他 TypedArray。 `);
  }
  let byteLength;
  try {
    byteLength = call(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch {
    fail("COMPLETE_RETURN_BYTES_INVALID", `${label} 必须是原生 Uint8Array 视图。 `);
  }
  if (byteLength <= 0 || byteLength > SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES) {
    fail("COMPLETE_RETURN_BYTES_INVALID", `${label} 必须是非空且不超过上限的 Uint8Array。 `);
  }
  try {
    const snapshot = new Uint8Array(byteLength);
    call(TYPED_ARRAY_SET, snapshot, [bytes]);
    return snapshot;
  } catch {
    fail("COMPLETE_RETURN_BYTES_INVALID", `${label} 无法复制为稳定的本次预检快照。 `);
  }
}

function bytesEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export async function createSingleBindingIntegratedHandoffArtifacts(submission) {
  if (!isSingleBindingIntegratedSubmissionCandidate(submission)) {
    fail(
      "LIVE_INTEGRATED_SUBMISSION_CAPABILITY_REQUIRED",
      "只能封装当前进程完成的 live branded integrated submission；序列化副本无此能力。 "
    );
  }
  const sessionBinding = createSingleBindingIntegratedSessionBinding(
    submission.sessionReadbackSnapshot?.sessionBinding
  );
  const validatedSubmission = await preflightSingleBindingIntegratedSubmissionValue(
    submission,
    { expectedSessionBinding: sessionBinding }
  );
  if (!isSingleBindingIntegratedSubmissionCandidate(submission)) {
    fail("LIVE_INTEGRATED_SUBMISSION_CAPABILITY_REQUIRED", "integrated submission process brand 已失效。 ");
  }

  const names = singleBindingIntegratedFilenamesForSession(sessionBinding);
  const sessionSubmissionText = serializeUtf8Json(submission);
  const sessionSubmissionRawSha256 = await sha256HexText(sessionSubmissionText);
  const sessionSubmissionArtifact = makeArtifact(
    "session_submission_original",
    names.sessionSubmissionFilename,
    "application/json",
    sessionSubmissionText,
    sessionSubmissionRawSha256
  );

  const sealDomain =
    "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/file-seal-receipt/v1";
  const sealUnsigned = {
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_INTEGRATED_HANDOFF_RECORD_TYPES[1],
    recordVersion: "1.0.0",
    workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    handoffVersion: SINGLE_BINDING_INTEGRATED_HANDOFF_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_HANDOFF_PURPOSE,
    seatId: sessionBinding.seatId,
    sessionBinding: cloneJson(sessionBinding),
    sessionSubmissionRef: submissionRef(validatedSubmission),
    rawSessionSubmissionArtifact: {
      filename: sessionSubmissionArtifact.filename,
      mediaType: sessionSubmissionArtifact.mediaType,
      encoding: sessionSubmissionArtifact.encoding,
      rawSha256: sessionSubmissionArtifact.rawSha256,
      byteLength: sessionSubmissionArtifact.byteLength
    },
    releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
    boundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY),
    mutationBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY),
    integrityBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_INTEGRITY_BOUNDARY)
  };
  const sealRecordDigest = await domainDigest(sealDomain, sealUnsigned);
  const sealReceipt = {
    ...sealUnsigned,
    integrity: makeIntegrity(sealDomain, sealRecordDigest)
  };
  const sealReceiptText = serializeUtf8Json(sealReceipt);
  const sealReceiptRawSha256 = await sha256HexText(sealReceiptText);
  const sealArtifact = makeArtifact(
    "independent_file_seal_receipt",
    names.sealReceiptFilename,
    "application/json",
    sealReceiptText,
    sealReceiptRawSha256
  );

  const checksumText = `${sessionSubmissionRawSha256}  ${names.sessionSubmissionFilename}\n`;
  const checksumRawSha256 = await sha256HexText(checksumText);
  const checksumArtifact = makeArtifact(
    "session_submission_checksum_text",
    names.checksumFilename,
    "text/plain",
    checksumText,
    checksumRawSha256
  );
  const embeddedArtifacts = [sessionSubmissionArtifact, sealArtifact, checksumArtifact];
  const crosslinks = {
    sessionSubmission: {
      ...artifactSummary(sessionSubmissionArtifact),
      ...submissionRef(validatedSubmission)
    },
    sealReceipt: {
      ...artifactSummary(sealArtifact),
      sealRecordDigest,
      boundSessionSubmissionFilename: sessionSubmissionArtifact.filename,
      boundSessionSubmissionRawSha256: sessionSubmissionArtifact.rawSha256,
      boundSessionSubmissionByteLength: sessionSubmissionArtifact.byteLength
    },
    checksumText: {
      ...artifactSummary(checksumArtifact),
      subjectFilename: sessionSubmissionArtifact.filename,
      subjectRawSha256: sessionSubmissionArtifact.rawSha256,
      subjectByteLength: sessionSubmissionArtifact.byteLength
    }
  };

  const completeDomain =
    "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/complete-return/v1";
  const completeUnsigned = {
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_INTEGRATED_HANDOFF_RECORD_TYPES[2],
    recordVersion: "1.0.0",
    workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    handoffVersion: SINGLE_BINDING_INTEGRATED_HANDOFF_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_HANDOFF_PURPOSE,
    seatId: sessionBinding.seatId,
    sessionBinding: cloneJson(sessionBinding),
    sessionSubmissionRef: submissionRef(validatedSubmission),
    logicalArtifactsRemainSeparate: true,
    embeddedArtifacts,
    artifactCrosslinks: crosslinks,
    releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
    boundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY),
    mutationBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY),
    integrityBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_INTEGRITY_BOUNDARY)
  };
  const completeRecordDigest = await domainDigest(completeDomain, completeUnsigned);
  const completeReturnRecord = {
    ...completeUnsigned,
    integrity: makeIntegrity(completeDomain, completeRecordDigest)
  };
  const completeReturnText = serializeUtf8Json(completeReturnRecord);
  const completeReturnRawSha256 = await sha256HexText(completeReturnText);

  const result = deepFreeze({
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_INTEGRATED_HANDOFF_RECORD_TYPES[0],
    recordVersion: "1.0.0",
    handoffVersion: SINGLE_BINDING_INTEGRATED_HANDOFF_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_HANDOFF_PURPOSE,
    seatId: sessionBinding.seatId,
    sessionBinding: cloneJson(sessionBinding),
    sessionSubmissionFilename: names.sessionSubmissionFilename,
    sessionSubmissionText,
    sessionSubmissionRawSha256,
    sessionSubmissionByteLength: sessionSubmissionArtifact.byteLength,
    sealReceipt,
    sealReceiptFilename: names.sealReceiptFilename,
    sealReceiptText,
    sealReceiptRawSha256,
    sealReceiptByteLength: sealArtifact.byteLength,
    checksumFilename: names.checksumFilename,
    checksumText,
    checksumRawSha256,
    checksumByteLength: checksumArtifact.byteLength,
    completeReturnRecord,
    completeReturnFilename: names.completeReturnFilename,
    completeReturnText,
    completeReturnRawSha256,
    completeReturnByteLength: utf8ByteLength(completeReturnText),
    embeddedArtifacts: embeddedArtifacts.map(artifactSummary),
    releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
    boundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY),
    mutationBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY),
    integrityBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_INTEGRITY_BOUNDARY)
  });
  call(WEAK_SET_ADD, ARTIFACTS_BRAND, [result]);
  return result;
}

function validateCompleteReturnIdentity(complete, expectedSessionBinding) {
  assertExactKeys(complete, [
    "schemaVersion", "recordType", "recordVersion", "workflowVersion", "handoffVersion",
    "reviewPurpose", "seatId", "sessionBinding", "sessionSubmissionRef",
    "logicalArtifactsRemainSeparate", "embeddedArtifacts", "artifactCrosslinks",
    "releaseGovernance", "boundary", "mutationBoundary", "integrityBoundary", "integrity"
  ], "complete return", "COMPLETE_RETURN_SHAPE_INVALID");
  if (complete.schemaVersion !== "1.0.0"
    || complete.recordType !== SINGLE_BINDING_INTEGRATED_HANDOFF_RECORD_TYPES[2]
    || complete.recordVersion !== "1.0.0"
    || complete.workflowVersion !== SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION
    || complete.handoffVersion !== SINGLE_BINDING_INTEGRATED_HANDOFF_VERSION
    || complete.reviewPurpose !== SINGLE_BINDING_INTEGRATED_HANDOFF_PURPOSE
    || complete.seatId !== expectedSessionBinding.seatId
    || complete.logicalArtifactsRemainSeparate !== true) {
    fail("COMPLETE_RETURN_IDENTITY_INVALID", "complete return 身份、席位或固定用途无效。 ");
  }
  const observedSessionBinding = createSingleBindingIntegratedSessionBinding(complete.sessionBinding);
  if (canonicalStringify(observedSessionBinding) !== canonicalStringify(expectedSessionBinding)) {
    fail("EXPECTED_SESSION_BINDING_MISMATCH", "complete return 未精确匹配包外 expectedSessionBinding。 ");
  }
  assertFixed(
    complete.releaseGovernance,
    SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE,
    "complete return release governance"
  );
  assertFixed(complete.boundary, SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY, "complete return boundary");
  assertFixed(
    complete.mutationBoundary,
    SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY,
    "complete return mutation boundary"
  );
  assertFixed(
    complete.integrityBoundary,
    SINGLE_BINDING_INTEGRATED_HANDOFF_INTEGRITY_BOUNDARY,
    "complete return integrity boundary"
  );
}

function validateSubmissionRef(value, submission, label) {
  assertExactKeys(value, [
    "submissionId", "submissionDigest", "sessionReadbackDigest"
  ], label, "SUBMISSION_REFERENCE_INVALID");
  if (value.submissionId !== submission.submissionId
    || value.submissionDigest !== submission.submissionDigest
    || value.sessionReadbackDigest !== submission.sessionReadbackDigest) {
    fail("SUBMISSION_REFERENCE_INVALID", `${label} 与原始 integrated submission 不匹配。 `);
  }
}

async function validateSealReceipt(
  seal,
  expectedSessionBinding,
  submission,
  sessionSubmissionArtifact
) {
  assertExactKeys(seal, [
    "schemaVersion", "recordType", "recordVersion", "workflowVersion", "handoffVersion",
    "reviewPurpose", "seatId", "sessionBinding", "sessionSubmissionRef",
    "rawSessionSubmissionArtifact", "releaseGovernance", "boundary", "mutationBoundary",
    "integrityBoundary", "integrity"
  ], "seal receipt", "SEAL_RECEIPT_INVALID");
  if (seal.schemaVersion !== "1.0.0"
    || seal.recordType !== SINGLE_BINDING_INTEGRATED_HANDOFF_RECORD_TYPES[1]
    || seal.recordVersion !== "1.0.0"
    || seal.workflowVersion !== SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION
    || seal.handoffVersion !== SINGLE_BINDING_INTEGRATED_HANDOFF_VERSION
    || seal.reviewPurpose !== SINGLE_BINDING_INTEGRATED_HANDOFF_PURPOSE
    || seal.seatId !== expectedSessionBinding.seatId) {
    fail("SEAL_RECEIPT_INVALID", "seal receipt 身份或席位无效。 ");
  }
  if (canonicalStringify(createSingleBindingIntegratedSessionBinding(seal.sessionBinding))
    !== canonicalStringify(expectedSessionBinding)) {
    fail("SEAL_RECEIPT_INVALID", "seal receipt session binding 与包外预期不匹配。 ");
  }
  validateSubmissionRef(seal.sessionSubmissionRef, submission, "seal.sessionSubmissionRef");
  assertExactKeys(seal.rawSessionSubmissionArtifact, [
    "filename", "mediaType", "encoding", "rawSha256", "byteLength"
  ], "seal.rawSessionSubmissionArtifact", "SEAL_RECEIPT_INVALID");
  const expectedRaw = artifactSummary(sessionSubmissionArtifact);
  const observedRaw = {
    role: sessionSubmissionArtifact.role,
    ...seal.rawSessionSubmissionArtifact
  };
  if (canonicalStringify(observedRaw) !== canonicalStringify(expectedRaw)) {
    fail("SEAL_RECEIPT_INVALID", "seal receipt 未精确绑定 session submission 原始字节。 ");
  }
  assertFixed(seal.releaseGovernance, SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE, "seal release governance");
  assertFixed(seal.boundary, SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY, "seal boundary");
  assertFixed(seal.mutationBoundary, SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY, "seal mutation boundary");
  assertFixed(seal.integrityBoundary, SINGLE_BINDING_INTEGRATED_HANDOFF_INTEGRITY_BOUNDARY, "seal integrity boundary");
  await assertIntegrity(
    seal,
    "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/file-seal-receipt/v1",
    "seal receipt"
  );
}

function validateCrosslinks(complete, submission, artifacts, seal) {
  assertExactKeys(complete.artifactCrosslinks, [
    "sessionSubmission", "sealReceipt", "checksumText"
  ], "artifactCrosslinks", "ARTIFACT_CROSSLINK_INVALID");
  const [sessionArtifact, sealArtifact, checksumArtifact] = artifacts;
  const expectedSession = {
    ...artifactSummary(sessionArtifact),
    ...submissionRef(submission)
  };
  assertFixed(
    complete.artifactCrosslinks.sessionSubmission,
    expectedSession,
    "session submission crosslink",
    "ARTIFACT_CROSSLINK_INVALID"
  );
  const expectedSeal = {
    ...artifactSummary(sealArtifact),
    sealRecordDigest: seal.integrity.recordDigest,
    boundSessionSubmissionFilename: sessionArtifact.filename,
    boundSessionSubmissionRawSha256: sessionArtifact.rawSha256,
    boundSessionSubmissionByteLength: sessionArtifact.byteLength
  };
  assertFixed(
    complete.artifactCrosslinks.sealReceipt,
    expectedSeal,
    "seal receipt crosslink",
    "ARTIFACT_CROSSLINK_INVALID"
  );
  const expectedChecksum = {
    ...artifactSummary(checksumArtifact),
    subjectFilename: sessionArtifact.filename,
    subjectRawSha256: sessionArtifact.rawSha256,
    subjectByteLength: sessionArtifact.byteLength
  };
  assertFixed(
    complete.artifactCrosslinks.checksumText,
    expectedChecksum,
    "checksum crosslink",
    "ARTIFACT_CROSSLINK_INVALID"
  );
}

export async function preflightSingleBindingIntegratedCompleteReturnBytes(
  bytes,
  options
) {
  const expected = captureJson(options);
  assertExactKeys(expected, [
    "expectedSessionBinding", "expectedCompleteReturnRawSha256"
  ], "complete return external expected", "EXPECTED_COMPLETE_RETURN_INVALID");
  const expectedSessionBinding = createSingleBindingIntegratedSessionBinding(
    expected.expectedSessionBinding
  );
  assertSha256(
    expected.expectedCompleteReturnRawSha256,
    "expectedCompleteReturnRawSha256",
    "EXPECTED_COMPLETE_RETURN_RAW_SHA256_INVALID"
  );
  const snapshot = copyBytes(bytes, "complete return");
  const completeReturnRawSha256 = await sha256HexBytes(snapshot);
  if (completeReturnRawSha256 !== expected.expectedCompleteReturnRawSha256) {
    fail(
      "COMPLETE_RETURN_RAW_SHA256_MISMATCH",
      "complete return 原始字节未精确匹配包外 expectedCompleteReturnRawSha256。 "
    );
  }
  if (snapshot.byteLength >= 3
    && snapshot[0] === 0xef
    && snapshot[1] === 0xbb
    && snapshot[2] === 0xbf) {
    fail("COMPLETE_RETURN_BOM_FORBIDDEN", "single-binding integrated complete return 不得包含 UTF-8 BOM。 ");
  }
  const complete = parseStrictJsonBytes(snapshot, {
    label: "single-binding integrated complete return",
    maxBytes: SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES
  });
  validateCompleteReturnIdentity(complete, expectedSessionBinding);
  await assertIntegrity(
    complete,
    "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/complete-return/v1",
    "complete return"
  );

  if (!Array.isArray(complete.embeddedArtifacts) || complete.embeddedArtifacts.length !== 3) {
    fail("EMBEDDED_ARTIFACT_INVALID", "complete return 必须精确内嵌三个逻辑独立工件。 ");
  }
  const names = singleBindingIntegratedFilenamesForSession(expectedSessionBinding);
  const expectedArtifacts = [
    {
      role: "session_submission_original",
      filename: names.sessionSubmissionFilename,
      mediaType: "application/json"
    },
    {
      role: "independent_file_seal_receipt",
      filename: names.sealReceiptFilename,
      mediaType: "application/json"
    },
    {
      role: "session_submission_checksum_text",
      filename: names.checksumFilename,
      mediaType: "text/plain"
    }
  ];
  for (let index = 0; index < expectedArtifacts.length; index += 1) {
    const artifact = complete.embeddedArtifacts[index];
    assertArtifactEntry(artifact, expectedArtifacts[index], index);
    const observedBytes = utf8ByteLength(artifact.exactUtf8Text);
    const observedRawSha256 = await sha256HexText(artifact.exactUtf8Text);
    if (artifact.byteLength !== observedBytes || artifact.rawSha256 !== observedRawSha256) {
      fail("EMBEDDED_ARTIFACT_RAW_BYTES_MISMATCH", `embeddedArtifacts.${index} 原始 hash/bytes 失配。 `);
    }
  }

  const [sessionArtifact, sealArtifact, checksumArtifact] = complete.embeddedArtifacts;
  const sessionSubmissionValue = parseStrictJsonText(sessionArtifact.exactUtf8Text, {
    label: "exact integrated session submission",
    maxBytes: SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES
  });
  const sessionSubmission = await preflightSingleBindingIntegratedSubmissionValue(
    sessionSubmissionValue,
    { expectedSessionBinding }
  );
  validateSubmissionRef(complete.sessionSubmissionRef, sessionSubmission, "complete.sessionSubmissionRef");

  const sealReceipt = parseStrictJsonText(sealArtifact.exactUtf8Text, {
    label: "independent synthetic pilot seal receipt",
    maxBytes: SINGLE_BINDING_INTEGRATED_MAX_JSON_BYTES
  });
  await validateSealReceipt(
    sealReceipt,
    expectedSessionBinding,
    sessionSubmission,
    sessionArtifact
  );
  const expectedChecksumText = `${sessionArtifact.rawSha256}  ${sessionArtifact.filename}\n`;
  if (checksumArtifact.exactUtf8Text !== expectedChecksumText) {
    fail("CHECKSUM_TEXT_INVALID", ".sha256.txt 未精确绑定 session submission 原始文件。 ");
  }
  validateCrosslinks(
    complete,
    sessionSubmission,
    complete.embeddedArtifacts,
    sealReceipt
  );

  const result = deepFreeze({
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_INTEGRATED_HANDOFF_RECORD_TYPES[3],
    recordVersion: "1.0.0",
    handoffVersion: SINGLE_BINDING_INTEGRATED_HANDOFF_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_HANDOFF_PURPOSE,
    seatId: expectedSessionBinding.seatId,
    sessionBinding: cloneJson(expectedSessionBinding),
    completeReturn: complete,
    completeReturnRawSha256,
    completeReturnByteLength: snapshot.byteLength,
    sessionSubmission,
    sealReceipt,
    embeddedArtifacts: complete.embeddedArtifacts.map(artifactSummary),
    mechanicalChecks: {
      strictUtf8AndJson: true,
      bomRejected: true,
      duplicateJsonKeysRejected: true,
      expectedSessionBindingMatched: true,
      expectedCompleteReturnRawSha256Matched: true,
      allEmbeddedRawHashesAndByteLengthsVerified: true,
      sessionSubmissionSealAndChecksumCrosslinked: true,
      integratedSubmissionValueRevalidated: true
    },
    releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
    boundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY),
    mutationBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY),
    integrityBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_INTEGRITY_BOUNDARY)
  });
  call(WEAK_SET_ADD, PREFLIGHT_BRAND, [result]);
  return result;
}

function validatePairExpected(expectedInput) {
  const expected = captureJson(expectedInput);
  assertExactKeys(expected, [
    "seatASessionBinding", "seatBSessionBinding", "seatACompleteReturnRawSha256",
    "seatBCompleteReturnRawSha256"
  ], "pair external expected", "EXPECTED_PAIR_INVALID");
  const seatASessionBinding = createSingleBindingIntegratedSessionBinding(
    expected.seatASessionBinding
  );
  const seatBSessionBinding = createSingleBindingIntegratedSessionBinding(
    expected.seatBSessionBinding
  );
  if (seatASessionBinding.seatId !== "A" || seatBSessionBinding.seatId !== "B") {
    fail("PAIR_SEATS_NOT_COMPLEMENTARY", "pair 必须精确由 A 与 B 两席组成。 ");
  }
  assertSha256(
    expected.seatACompleteReturnRawSha256,
    "seatACompleteReturnRawSha256",
    "EXPECTED_PAIR_RAW_SHA256_INVALID"
  );
  assertSha256(
    expected.seatBCompleteReturnRawSha256,
    "seatBCompleteReturnRawSha256",
    "EXPECTED_PAIR_RAW_SHA256_INVALID"
  );
  if (expected.seatACompleteReturnRawSha256 === expected.seatBCompleteReturnRawSha256) {
    fail("PAIR_COMPLETE_RETURN_HASHES_NOT_DISTINCT", "A/B complete return raw SHA 必须不同。 ");
  }
  for (const key of [
    "bindingMode", "reviewCycleId", "pairRunId", "pairPrecommitRawSha256",
    "pairManifestRawSha256", "syntheticRehearsalManifestDigest", "fixtureContentDigest",
    "questionSetDigest", "candidateDigest", "bindingId", "bindingIdentityDigest",
    "selectedBindingCount"
  ]) {
    if (seatASessionBinding[key] !== seatBSessionBinding[key]) {
      fail("PAIR_COMMON_BINDING_MISMATCH", `A/B session binding 的 ${key} 必须精确一致。 `);
    }
  }
  if (seatASessionBinding.seatSessionNonce === seatBSessionBinding.seatSessionNonce) {
    fail("PAIR_NONCES_NOT_DISTINCT", "A/B seat session nonce 必须不同。 ");
  }
  if (seatASessionBinding.seatPackageManifestRawSha256
    === seatBSessionBinding.seatPackageManifestRawSha256) {
    fail("PAIR_PACKAGE_PINS_NOT_DISTINCT", "A/B package manifest pin 必须不同。 ");
  }
  return {
    ...expected,
    seatASessionBinding,
    seatBSessionBinding
  };
}

function comparisonRow(fieldId, seatAValue, seatBValue) {
  const a = cloneJson(seatAValue);
  const b = cloneJson(seatBValue);
  const classification = canonicalStringify(a) === canonicalStringify(b)
    ? "exact_match"
    : "difference";
  return {
    fieldId,
    seatAValue: a,
    seatBValue: b,
    classification,
    resolutionStatus: classification === "difference"
      ? "unresolved"
      : "no_difference_observed"
  };
}

function independentRecordContext(preflight) {
  const sessionArtifact = preflight.embeddedArtifacts[0];
  const sealArtifact = preflight.embeddedArtifacts[1];
  const checksumArtifact = preflight.embeddedArtifacts[2];
  return {
    seatId: preflight.seatId,
    sessionBinding: cloneJson(preflight.sessionBinding),
    completeReturnRawSha256: preflight.completeReturnRawSha256,
    completeReturnByteLength: preflight.completeReturnByteLength,
    sessionSubmissionRef: submissionRef(preflight.sessionSubmission),
    sessionSubmissionArtifact: cloneJson(sessionArtifact),
    sealReceiptArtifact: cloneJson(sealArtifact),
    checksumArtifact: cloneJson(checksumArtifact),
    captureContext: cloneJson(
      preflight.sessionSubmission.innerSubmission.reviewSnapshot.captureContext
    ),
    finalConfirmations: cloneJson(
      preflight.sessionSubmission.innerSubmission.finalConfirmations
    )
  };
}

export async function compareSingleBindingIntegratedCompleteReturns(input = {}) {
  assertExactKeys(input, ["seatABytes", "seatBBytes", "expected"], "pair input", "PAIR_INPUT_INVALID");
  const normalizedExpected = validatePairExpected(input.expected);
  const seatABytes = copyBytes(input.seatABytes, "A seat complete return");
  const seatBBytes = copyBytes(input.seatBBytes, "B seat complete return");
  if (bytesEqual(seatABytes, seatBBytes)) {
    fail("PAIR_COMPLETE_RETURN_BYTES_NOT_DISTINCT", "A/B complete return 必须是两份不同原始字节。 ");
  }
  const [seatA, seatB] = await Promise.all([
    preflightSingleBindingIntegratedCompleteReturnBytes(seatABytes, {
      expectedSessionBinding: normalizedExpected.seatASessionBinding,
      expectedCompleteReturnRawSha256: normalizedExpected.seatACompleteReturnRawSha256
    }),
    preflightSingleBindingIntegratedCompleteReturnBytes(seatBBytes, {
      expectedSessionBinding: normalizedExpected.seatBSessionBinding,
      expectedCompleteReturnRawSha256: normalizedExpected.seatBCompleteReturnRawSha256
    })
  ]);
  if (seatA.completeReturnRawSha256 === seatB.completeReturnRawSha256) {
    fail("PAIR_COMPLETE_RETURN_HASHES_NOT_DISTINCT", "A/B complete return raw SHA 必须不同。 ");
  }

  const responseA = seatA.sessionSubmission.innerSubmission.reviewSnapshot.reviewResponse;
  const responseB = seatB.sessionSubmission.innerSubmission.reviewSnapshot.reviewResponse;
  assertExactKeys(
    responseA,
    SINGLE_BINDING_INTEGRATED_PROFESSIONAL_FIELDS,
    "A professional response",
    "PROFESSIONAL_FIELDS_INVALID"
  );
  assertExactKeys(
    responseB,
    SINGLE_BINDING_INTEGRATED_PROFESSIONAL_FIELDS,
    "B professional response",
    "PROFESSIONAL_FIELDS_INVALID"
  );
  const professionalFieldRows = SINGLE_BINDING_INTEGRATED_PROFESSIONAL_FIELDS.map(
    (fieldId) => comparisonRow(fieldId, responseA[fieldId], responseB[fieldId])
  );
  const exactMatchCount = professionalFieldRows.filter(
    (row) => row.classification === "exact_match"
  ).length;
  const unresolvedDifferenceCount = professionalFieldRows.length - exactMatchCount;
  const independentRecordContexts = {
    A: independentRecordContext(seatA),
    B: independentRecordContext(seatB)
  };
  const seed = {
    reviewCycleId: normalizedExpected.seatASessionBinding.reviewCycleId,
    pairRunId: normalizedExpected.seatASessionBinding.pairRunId,
    pairPrecommitRawSha256: normalizedExpected.seatASessionBinding.pairPrecommitRawSha256,
    pairManifestRawSha256: normalizedExpected.seatASessionBinding.pairManifestRawSha256,
    fixedInputIdentity: {
      syntheticRehearsalManifestDigest:
        normalizedExpected.seatASessionBinding.syntheticRehearsalManifestDigest,
      fixtureContentDigest: normalizedExpected.seatASessionBinding.fixtureContentDigest,
      questionSetDigest: normalizedExpected.seatASessionBinding.questionSetDigest,
      candidateDigest: normalizedExpected.seatASessionBinding.candidateDigest,
      bindingId: normalizedExpected.seatASessionBinding.bindingId,
      bindingIdentityDigest: normalizedExpected.seatASessionBinding.bindingIdentityDigest,
      selectedBindingCount: normalizedExpected.seatASessionBinding.selectedBindingCount
    },
    independentRecordContexts,
    professionalFieldRows,
    exactMatchCount,
    unresolvedDifferenceCount
  };
  const comparisonDomain =
    "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/pair-comparison/v1";
  const comparisonDigest = await domainDigest(comparisonDomain, seed);
  const candidate = deepFreeze({
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_INTEGRATED_HANDOFF_RECORD_TYPES[4],
    recordVersion: "1.0.0",
    handoffVersion: SINGLE_BINDING_INTEGRATED_HANDOFF_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_HANDOFF_PURPOSE,
    comparisonId: `single-binding-synthetic-pilot-pair-comparison/${comparisonDigest}`,
    comparisonDigest,
    ...seed,
    totalComparedFieldCount: professionalFieldRows.length,
    unresolvedDifferenceIds: professionalFieldRows
      .filter((row) => row.classification === "difference")
      .map((row) => row.fieldId),
    manualFollowupRequired: unresolvedDifferenceCount > 0,
    releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
    boundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_BOUNDARY),
    mutationBoundary: cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_MUTATION_BOUNDARY),
    integrityBoundary: {
      ...cloneJson(SINGLE_BINDING_INTEGRATED_HANDOFF_INTEGRITY_BOUNDARY),
      digestAlgorithm: "SHA-256",
      digestDomain: comparisonDomain
    }
  });
  call(WEAK_SET_ADD, PAIR_BRAND, [candidate]);
  return candidate;
}

export function isSingleBindingIntegratedHandoffArtifactsCandidate(value) {
  return value !== null
    && typeof value === "object"
    && call(WEAK_SET_HAS, ARTIFACTS_BRAND, [value]);
}

export function isSingleBindingIntegratedCompleteReturnPreflightCandidate(value) {
  return value !== null
    && typeof value === "object"
    && call(WEAK_SET_HAS, PREFLIGHT_BRAND, [value]);
}

export function isSingleBindingIntegratedPairComparisonCandidate(value) {
  return value !== null
    && typeof value === "object"
    && call(WEAK_SET_HAS, PAIR_BRAND, [value]);
}
