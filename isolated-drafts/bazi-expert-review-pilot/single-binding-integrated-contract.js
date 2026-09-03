import {
  SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE,
  SYNTHETIC_REHEARSAL_FIXTURE_REF,
  createSingleBindingRehearsalDraft,
  finalizeSingleBindingRehearsal,
  prepareSingleBindingRehearsalReadback,
  preflightSingleBindingRehearsalSubmissionValue
} from "./single-binding-rehearsal-contract.js";
import {
  canonicalStringifySingleBindingIntegrated as canonicalStringify,
  sha256SingleBindingIntegratedText as sha256HexText
} from "./single-binding-integrated-json.js";

const OBJECT_FREEZE = Object.freeze;
const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const REFLECT_APPLY = Reflect.apply;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_MAP_SET = WeakMap.prototype.set;
const WEAK_MAP_GET = WeakMap.prototype.get;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const REVIEW_CYCLE_PATTERN = /^single-binding-synthetic-review-cycle\.[a-f0-9]{64}$/u;
const PAIR_RUN_PATTERN = /^single-binding-synthetic-pair-run\.[a-f0-9]{64}$/u;
const SEAT_SESSION_PATTERN = /^single-binding-synthetic-seat-session\.[a-f0-9]{64}$/u;
const BINDING_MODES = new Set([
  "source_tree_synthetic_integration_test",
  "physical_synthetic_single_binding_pair"
]);

export const SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION =
  "hakimi.bazi.expert-single-binding-nocode-synthetic-pilot-integrated/1.0.0";
export const SINGLE_BINDING_INTEGRATED_PURPOSE =
  "synthetic_single_binding_nocode_complete_flow_rehearsal_only";
export const SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST =
  "7f9fc383d5da86c5d9c87f56c413a382b1de7dd5ee895974ad3f08ffedeba529";
const SESSION_BINDING_RECORD_TYPE =
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_binding_v1";
const SESSION_DRAFT_RECORD_TYPE =
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_draft_candidate_v1";
const SESSION_READBACK_RECORD_TYPE =
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_readback_candidate_v1";
const SESSION_SUBMISSION_RECORD_TYPE =
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_submission_candidate_v1";
export const SINGLE_BINDING_INTEGRATED_RECORD_TYPES = OBJECT_FREEZE([
  SESSION_BINDING_RECORD_TYPE,
  SESSION_DRAFT_RECORD_TYPE,
  SESSION_READBACK_RECORD_TYPE,
  SESSION_SUBMISSION_RECORD_TYPE
]);

export const SINGLE_BINDING_INTEGRATED_BOUNDARY = OBJECT_FREEZE({
  syntheticOnly: true,
  syntheticFixtureOnly: true,
  selectedBindingCount: 1,
  sessionBindingMechanicallyCoveredByReadbackDigest: true,
  sessionBindingMechanicallyCoveredBySubmissionDigest: true,
  sessionBindingPinProvenanceVerified: false,
  sessionBindingSignatureVerified: false,
  trustedBootstrapEstablished: false,
  reviewerActuallyConfirmedSessionBindingEstablished: false,
  actualHumanParticipationEstablished: false,
  actualHumanIndependenceEstablished: false,
  reviewerIdentityEstablished: false,
  reviewerQualificationEstablished: false,
  reviewerScopeEstablished: false,
  reviewerConsentEstablished: false,
  coordinatorVerbatimEntryVerified: false,
  reviewerReadbackVerified: false,
  opinionAuthenticityEstablished: false,
  firstSeenEstablished: false,
  custodyEstablished: false,
  sameCycleReplayExcluded: false,
  samePairRunReplayExcluded: false,
  samePrivilegeIntervalMutationExcluded: false,
  abaExcluded: false,
  realExpertMaterialCollectionAuthorized: false,
  realPersonDataCollectionAuthorized: false,
  personDataPresenceAssessed: false,
  personDerivedDigestExcluded: false,
  freeTextSyntheticOnlyVerified: false,
  userFreeTextContentClass: "unassessed_private",
  repositoryStorageAllowed: false,
  networkUploadPerformed: false,
  browserDownloadPerformed: false,
  formalPurposeReused: false,
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
  handlingClassification: "private_in_memory_synthetic_fixture_with_unassessed_free_text"
});

export class SingleBindingIntegratedError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SingleBindingIntegratedError";
    this.code = code;
  }
}

const DRAFT_BRAND = new WeakSet();
const READBACK_BRAND = new WeakSet();
const SUBMISSION_BRAND = new WeakSet();
const PRIVATE_DRAFT_STATE = new WeakMap();
const PRIVATE_READBACK_STATE = new WeakMap();

function call(fn, thisArg, args) {
  return REFLECT_APPLY(fn, thisArg, args);
}

function fail(code, message) {
  throw new SingleBindingIntegratedError(code, message);
}

function captureJson(value, state = { nodes: 0, active: new WeakSet() }, depth = 0) {
  state.nodes += 1;
  if (state.nodes > 20_000 || depth > 40) fail("INPUT_LIMIT_EXCEEDED", "integrated 输入超过结构上限。 ");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INPUT_VALUE_INVALID", "integrated 输入含非有限数值。 ");
    return value;
  }
  if (typeof value !== "object" || state.active.has(value)) {
    fail("INPUT_VALUE_INVALID", "integrated 输入必须是无循环 JSON 值。 ");
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || value.length > 512) {
      fail("INPUT_ARRAY_INVALID", "integrated 输入数组无效。 ");
    }
    state.active.add(value);
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) fail("INPUT_ARRAY_INVALID", "integrated 输入不接受稀疏数组。 ");
      result.push(captureJson(value[index], state, depth + 1));
    }
    state.active.delete(value);
    return result;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    fail("INPUT_PROTOTYPE_INVALID", "integrated 输入只接受普通 JSON 对象。 ");
  }
  state.active.add(value);
  const result = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (["__proto__", "prototype", "constructor"].includes(key)
      || !descriptor.enumerable || descriptor.get || descriptor.set) {
      fail("INPUT_FIELD_INVALID", "integrated 输入含禁止键或访问器。 ");
    }
    result[key] = captureJson(descriptor.value, state, depth + 1);
  }
  state.active.delete(value);
  return result;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of OBJECT_VALUES(value)) deepFreeze(child, seen);
  return OBJECT_FREEZE(value);
}

function cloneJson(value) {
  return captureJson(value);
}

function assertExactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype) {
    fail("INPUT_SHAPE_INVALID", `${label} 必须是普通对象。 `);
  }
  const actual = OBJECT_KEYS(value).sort();
  const wanted = [...expected].sort();
  if (canonicalStringify(actual) !== canonicalStringify(wanted)) {
    fail("INPUT_SHAPE_INVALID", `${label} 字段闭集无效。 `);
  }
}

function assertFixed(value, expected, label) {
  if (canonicalStringify(value) !== canonicalStringify(expected)) {
    fail("FIXED_BOUNDARY_MISMATCH", `${label} 固定边界失配。 `);
  }
}

async function domainDigest(domain, value) {
  return sha256HexText(`${domain}\0${canonicalStringify(value)}`);
}

export function createSingleBindingIntegratedSessionBinding(input) {
  const value = captureJson(input);
  assertExactKeys(value, [
    "schemaVersion", "recordType", "workflowVersion", "bindingMode", "reviewCycleId",
    "pairRunId", "seatId", "seatSessionNonce", "pairPrecommitRawSha256",
    "pairManifestRawSha256", "seatPackageManifestRawSha256", "syntheticRehearsalManifestDigest",
    "fixtureContentDigest", "questionSetDigest", "candidateDigest", "bindingId", "bindingIdentityDigest",
    "selectedBindingCount"
  ], "sessionBinding");
  if (value.schemaVersion !== "1.0.0"
    || value.recordType !== SESSION_BINDING_RECORD_TYPE
    || value.workflowVersion !== SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION
    || !BINDING_MODES.has(value.bindingMode)
    || !REVIEW_CYCLE_PATTERN.test(value.reviewCycleId) || /^single-binding-synthetic-review-cycle\.0{64}$/u.test(value.reviewCycleId)
    || !PAIR_RUN_PATTERN.test(value.pairRunId) || /^single-binding-synthetic-pair-run\.0{64}$/u.test(value.pairRunId)
    || !new Set(["A", "B"]).has(value.seatId)
    || !SEAT_SESSION_PATTERN.test(value.seatSessionNonce)
    || /^single-binding-synthetic-seat-session\.0{64}$/u.test(value.seatSessionNonce)
    || value.selectedBindingCount !== 1) {
    fail("SESSION_BINDING_IDENTITY_INVALID", "sessionBinding 的版本、模式、轮次、pair、席位或 nonce 无效。 ");
  }
  for (const key of [
    "pairPrecommitRawSha256",
    "pairManifestRawSha256",
    "seatPackageManifestRawSha256"
  ]) {
    if (!SHA256_PATTERN.test(value[key]) || /^0{64}$/u.test(value[key])) {
      fail("SESSION_BINDING_PIN_INVALID", `sessionBinding.${key} 必须是非零小写 SHA-256。 `);
    }
  }
  const fixed = {
    syntheticRehearsalManifestDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
    fixtureContentDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest,
    questionSetDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest,
    candidateDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateDigest,
    bindingId: SYNTHETIC_REHEARSAL_FIXTURE_REF.bindingId,
    bindingIdentityDigest: SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST
  };
  for (const [key, expected] of Object.entries(fixed)) {
    if (value[key] !== expected) fail("SESSION_BINDING_INPUT_IDENTITY_MISMATCH", `sessionBinding.${key} 与固定题面身份不匹配。 `);
  }
  return deepFreeze(value);
}

function assertDraftCapability(value) {
  if (!value || !call(WEAK_SET_HAS, DRAFT_BRAND, [value])) {
    fail("INTEGRATED_DRAFT_CAPABILITY_REQUIRED", "需要当前进程创建的 integrated draft capability。 ");
  }
  assertExactKeys(value, [
    "schemaVersion", "recordType", "recordVersion", "workflowVersion", "reviewPurpose",
    "sessionBinding", "innerDraft", "releaseGovernance", "boundary"
  ], "integrated draft capability");
  if (value.schemaVersion !== "1.0.0"
    || value.recordType !== SESSION_DRAFT_RECORD_TYPE
    || value.recordVersion !== "1.0.0"
    || value.workflowVersion !== SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION
    || value.reviewPurpose !== SINGLE_BINDING_INTEGRATED_PURPOSE) {
    fail("INTEGRATED_DRAFT_IDENTITY_INVALID", "integrated draft 的身份或 purpose 已变化。 ");
  }
  const state = call(WEAK_MAP_GET, PRIVATE_DRAFT_STATE, [value]);
  if (state.innerDraft !== value.innerDraft
    || canonicalStringify(state.sessionBinding) !== canonicalStringify(value.sessionBinding)) {
    fail("INTEGRATED_DRAFT_CAPABILITY_MISMATCH", "integrated draft 的 inner draft 或 session binding 已被替换。 ");
  }
  assertFixed(value.releaseGovernance, SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE, "integrated release governance");
  assertFixed(value.boundary, SINGLE_BINDING_INTEGRATED_BOUNDARY, "integrated boundary");
  return state;
}

export function createSingleBindingIntegratedDraft(sessionBindingInput) {
  const sessionBinding = createSingleBindingIntegratedSessionBinding(sessionBindingInput);
  const innerDraft = createSingleBindingRehearsalDraft(sessionBinding.seatId);
  const draft = {
    schemaVersion: "1.0.0",
    recordType: SESSION_DRAFT_RECORD_TYPE,
    recordVersion: "1.0.0",
    workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    reviewPurpose: SINGLE_BINDING_INTEGRATED_PURPOSE,
    sessionBinding,
    innerDraft,
    releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
    boundary: cloneJson(SINGLE_BINDING_INTEGRATED_BOUNDARY)
  };
  call(WEAK_MAP_SET, PRIVATE_DRAFT_STATE, [draft, {
    innerDraft,
    sessionBinding,
    phase: "open",
    operationToken: 0,
    activeReadback: null
  }]);
  call(WEAK_SET_ADD, DRAFT_BRAND, [draft]);
  return draft;
}

function sessionReadbackSeed(sessionBinding, innerReadback) {
  return {
    sessionBinding: cloneJson(sessionBinding),
    innerReadbackDigest: innerReadback.readbackDigest,
    innerReviewSnapshot: cloneJson(innerReadback.reviewSnapshot)
  };
}

export async function prepareSingleBindingIntegratedReadback(draft) {
  const state = assertDraftCapability(draft);
  if (state.phase === "finalized") fail("INTEGRATED_DRAFT_FINALIZED", "integrated draft 已完成。 ");
  if (state.phase === "preparing" || state.phase === "finalizing") {
    fail("INTEGRATED_OPERATION_IN_PROGRESS", "integrated draft 正在生成核对稿或完成。 ");
  }
  const token = state.operationToken + 1;
  state.operationToken = token;
  state.phase = "preparing";
  state.activeReadback = null;
  try {
    const innerReadback = await prepareSingleBindingRehearsalReadback(state.innerDraft);
    const innerDraftCanonical = canonicalStringify(captureJson(state.innerDraft));
    const snapshot = sessionReadbackSeed(state.sessionBinding, innerReadback);
    const sessionReadbackDigest = await domainDigest(
      "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/session-readback/v1",
      snapshot
    );
    if (state.phase !== "preparing" || state.operationToken !== token
      || state.innerDraft !== draft.innerDraft
      || canonicalStringify(captureJson(state.innerDraft)) !== innerDraftCanonical
      || canonicalStringify(state.sessionBinding) !== canonicalStringify(draft.sessionBinding)) {
      fail("INTEGRATED_DRAFT_CHANGED_DURING_READBACK", "生成 session-bound 核对稿期间输入发生变化。 ");
    }
    const candidate = deepFreeze({
      schemaVersion: "1.0.0",
      recordType: SESSION_READBACK_RECORD_TYPE,
      recordVersion: "1.0.0",
      workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
      reviewPurpose: SINGLE_BINDING_INTEGRATED_PURPOSE,
      sessionReadbackId: `single-binding-synthetic-session-readback/${sessionReadbackDigest}`,
      sessionReadbackDigest,
      sessionReadbackSnapshot: snapshot,
      releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
      boundary: cloneJson(SINGLE_BINDING_INTEGRATED_BOUNDARY),
      digestIsDigitalSignature: false,
      reviewerReadbackVerified: false,
      formalAdmissionAllowed: false
    });
    state.phase = "readback_ready";
    state.activeReadback = candidate;
    call(WEAK_MAP_SET, PRIVATE_READBACK_STATE, [candidate, {
      draft,
      innerReadback,
      consumed: false
    }]);
    call(WEAK_SET_ADD, READBACK_BRAND, [candidate]);
    return candidate;
  } catch (error) {
    if (state.phase === "preparing" && state.operationToken === token) {
      state.phase = "open";
      state.activeReadback = null;
    }
    throw error;
  }
}

export async function finalizeSingleBindingIntegratedSubmission(draft, readback) {
  const state = assertDraftCapability(draft);
  if (!readback || !call(WEAK_SET_HAS, READBACK_BRAND, [readback])) {
    fail("INTEGRATED_READBACK_CAPABILITY_REQUIRED", "需要当前进程签发的 integrated readback capability。 ");
  }
  const readbackState = call(WEAK_MAP_GET, PRIVATE_READBACK_STATE, [readback]);
  if (readbackState?.draft !== draft) fail("INTEGRATED_READBACK_DRAFT_MISMATCH", "integrated readback 不属于当前 draft。 ");
  if (readbackState.consumed || state.phase === "finalized") {
    fail("INTEGRATED_READBACK_ALREADY_CONSUMED", "integrated readback 已用于一次完成尝试。 ");
  }
  if (state.phase !== "readback_ready" || state.activeReadback !== readback) {
    fail("INTEGRATED_READBACK_SUPERSEDED", "integrated readback 已被替换。 ");
  }
  if (canonicalStringify(state.sessionBinding)
    !== canonicalStringify(readback.sessionReadbackSnapshot.sessionBinding)) {
    fail("INTEGRATED_SESSION_BINDING_STALE", "integrated readback 的 session binding 已失配。 ");
  }
  const token = state.operationToken + 1;
  state.operationToken = token;
  state.phase = "finalizing";
  state.activeReadback = null;
  readbackState.consumed = true;
  try {
    const innerSubmission = await finalizeSingleBindingRehearsal(state.innerDraft, readbackState.innerReadback);
    if (innerSubmission.readbackDigest !== readback.sessionReadbackSnapshot.innerReadbackDigest
      || canonicalStringify(innerSubmission.reviewSnapshot)
        !== canonicalStringify(readback.sessionReadbackSnapshot.innerReviewSnapshot)) {
      fail("INTEGRATED_INNER_SUBMISSION_MISMATCH", "inner submission 未精确绑定 session readback。 ");
    }
    const submissionSeed = {
      sessionReadbackSnapshot: cloneJson(readback.sessionReadbackSnapshot),
      sessionReadbackDigest: readback.sessionReadbackDigest,
      innerSubmission: cloneJson(innerSubmission)
    };
    const submissionDigest = await domainDigest(
      "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/session-submission/v1",
      submissionSeed
    );
    if (state.phase !== "finalizing" || state.operationToken !== token
      || state.innerDraft !== draft.innerDraft
      || canonicalStringify(state.sessionBinding) !== canonicalStringify(draft.sessionBinding)) {
      fail("INTEGRATED_DRAFT_CHANGED_DURING_FINALIZE", "完成 integrated submission 期间 session 或 draft capability 发生变化。 ");
    }
    const candidate = deepFreeze({
      schemaVersion: "1.0.0",
      recordType: SESSION_SUBMISSION_RECORD_TYPE,
      recordVersion: "1.0.0",
      workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
      reviewPurpose: SINGLE_BINDING_INTEGRATED_PURPOSE,
      submissionId: `single-binding-synthetic-session-submission/${submissionDigest}`,
      submissionDigest,
      ...submissionSeed,
      releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
      boundary: cloneJson(SINGLE_BINDING_INTEGRATED_BOUNDARY),
      mutationBoundary: {
        persistencePerformed: false,
        productStorageMutationPerformed: false,
        schema13MutationEpochUsed: false,
        intervalMutationExcluded: false,
        abaExcluded: false
      },
      integrityBoundary: {
        digestIsDigitalSignature: false,
        trustedTimeEstablished: false,
        firstSeenEstablished: false,
        custodyEstablished: false,
        serializedCloneRetainsProcessBrand: false
      }
    });
    state.phase = "finalized";
    call(WEAK_SET_ADD, SUBMISSION_BRAND, [candidate]);
    return candidate;
  } catch (error) {
    if (state.phase === "finalizing" && state.operationToken === token) state.phase = "open";
    throw error;
  }
}

export async function preflightSingleBindingIntegratedSubmissionValue(
  input,
  { expectedSessionBinding: expectedSessionBindingInput } = {}
) {
  const expectedSessionBinding = createSingleBindingIntegratedSessionBinding(expectedSessionBindingInput);
  const candidate = captureJson(input);
  assertExactKeys(candidate, [
    "schemaVersion", "recordType", "recordVersion", "workflowVersion", "reviewPurpose",
    "submissionId", "submissionDigest", "sessionReadbackSnapshot", "sessionReadbackDigest",
    "innerSubmission", "releaseGovernance", "boundary", "mutationBoundary", "integrityBoundary"
  ], "integrated submission");
  if (candidate.schemaVersion !== "1.0.0"
    || candidate.recordType !== SESSION_SUBMISSION_RECORD_TYPE
    || candidate.recordVersion !== "1.0.0"
    || candidate.workflowVersion !== SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION
    || candidate.reviewPurpose !== SINGLE_BINDING_INTEGRATED_PURPOSE) {
    fail("INTEGRATED_SUBMISSION_IDENTITY_INVALID", "integrated submission 身份无效。 ");
  }
  assertExactKeys(candidate.sessionReadbackSnapshot, [
    "sessionBinding", "innerReadbackDigest", "innerReviewSnapshot"
  ], "integrated session readback snapshot");
  const observedSessionBinding = createSingleBindingIntegratedSessionBinding(
    candidate.sessionReadbackSnapshot.sessionBinding
  );
  if (canonicalStringify(observedSessionBinding) !== canonicalStringify(expectedSessionBinding)) {
    fail("INTEGRATED_EXPECTED_SESSION_MISMATCH", "integrated submission 未匹配包外 expected session binding。 ");
  }
  const innerSubmission = await preflightSingleBindingRehearsalSubmissionValue(
    candidate.innerSubmission,
    { expectedSeatId: expectedSessionBinding.seatId }
  );
  if (candidate.sessionReadbackSnapshot.innerReadbackDigest !== innerSubmission.readbackDigest
    || canonicalStringify(candidate.sessionReadbackSnapshot.innerReviewSnapshot)
      !== canonicalStringify(innerSubmission.reviewSnapshot)) {
    fail("INTEGRATED_INNER_CROSSLINK_INVALID", "integrated submission 的 inner readback 交叉引用无效。 ");
  }
  const sessionReadbackDigest = await domainDigest(
    "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/session-readback/v1",
    candidate.sessionReadbackSnapshot
  );
  const submissionSeed = {
    sessionReadbackSnapshot: candidate.sessionReadbackSnapshot,
    sessionReadbackDigest,
    innerSubmission
  };
  const submissionDigest = await domainDigest(
    "hakimi/bazi/expert-single-binding-nocode-synthetic-pilot/session-submission/v1",
    submissionSeed
  );
  if (candidate.sessionReadbackDigest !== sessionReadbackDigest
    || candidate.submissionDigest !== submissionDigest
    || candidate.submissionId !== `single-binding-synthetic-session-submission/${submissionDigest}`) {
    fail("INTEGRATED_SUBMISSION_DIGEST_INVALID", "integrated submission 的 readback 或 submission digest 无效。 ");
  }
  assertFixed(candidate.releaseGovernance, SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE, "integrated release governance");
  assertFixed(candidate.boundary, SINGLE_BINDING_INTEGRATED_BOUNDARY, "integrated boundary");
  assertFixed(candidate.mutationBoundary, {
    persistencePerformed: false,
    productStorageMutationPerformed: false,
    schema13MutationEpochUsed: false,
    intervalMutationExcluded: false,
    abaExcluded: false
  }, "integrated mutation boundary");
  assertFixed(candidate.integrityBoundary, {
    digestIsDigitalSignature: false,
    trustedTimeEstablished: false,
    firstSeenEstablished: false,
    custodyEstablished: false,
    serializedCloneRetainsProcessBrand: false
  }, "integrated integrity boundary");
  return deepFreeze(candidate);
}

export function isSingleBindingIntegratedReadbackCandidate(value) {
  return value !== null && typeof value === "object" && call(WEAK_SET_HAS, READBACK_BRAND, [value]);
}

export function isSingleBindingIntegratedSubmissionCandidate(value) {
  return value !== null && typeof value === "object" && call(WEAK_SET_HAS, SUBMISSION_BRAND, [value]);
}
