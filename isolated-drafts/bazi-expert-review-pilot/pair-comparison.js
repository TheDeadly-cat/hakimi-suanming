import {
  PILOT_AUTHORITY_BOUNDARY,
  PILOT_COMPLETE_SUBMISSION_MAX_BYTES,
  PILOT_PRIVACY_BOUNDARY,
  PILOT_REVIEW_CYCLE_ID_PATTERN,
  RELEASE_GOVERNANCE,
  canonicalStringify,
  parseStrictJsonBytes,
  parseStrictJsonText,
  preflightPilotCompleteSubmissionBytes
} from "./contract.js";
import { OVERALL_QUESTIONS } from "./data/questions.js";
import { SCENARIOS } from "./data/scenarios.js";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const NativeWeakSet = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const REFLECT_APPLY = Reflect.apply;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_VALUES = Object.values;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const TEXT_ENCODER_ENCODE = TextEncoder.prototype.encode;
const SUBTLE = globalThis.crypto?.subtle;
const SUBTLE_DIGEST = SUBTLE?.digest;
const VERIFIED_PAIR_COMPARISON_CANDIDATES = new NativeWeakSet();

const CASE_FIELD_DEFINITIONS = Object.freeze([
  Object.freeze(["factAssessment", "命盘事实是否正确"]),
  Object.freeze(["rulePosition", "对当前规则的意见"]),
  Object.freeze(["reason", "判断理由"]),
  Object.freeze(["applicabilityConditions", "成立条件"]),
  Object.freeze(["counterexamples", "反例"]),
  Object.freeze(["invalidationStructures", "可能失效结构"]),
  Object.freeze(["highRiskDisposition", "对用户表达的处理"]),
  Object.freeze(["revisionSuggestion", "修改建议"])
]);

const OVERALL_FIELD_DEFINITIONS = Object.freeze([
  Object.freeze(["position", "总体意见"]),
  Object.freeze(["expertOriginalText", "原始意见"]),
  Object.freeze(["rationale", "理由"]),
  Object.freeze(["uncertainties", "不确定点"])
]);

export const PILOT_PAIR_COMPARISON_BOUNDARY = Object.freeze({
  comparisonPurpose: "pilot_private_side_by_side_difference_only",
  twoValidatedPilotSubmissionsRequired: true,
  originalOpinionValuesTransformed: false,
  originalOpinionValuesOverwritten: false,
  usabilityFeedbackUsedForDomainComparison: false,
  authorshipBlindingEstablished: false,
  actualHumanParticipationEstablished: false,
  actualHumanIndependenceEstablished: false,
  expertIdentityEstablished: false,
  opinionAuthenticityEstablished: false,
  syntheticFixtureOnly: true,
  realReturnLoadingAuthorized: false,
  browserProfileIsolationEstablished: false,
  preexistingServiceWorkerExcluded: false,
  browserExtensionInterceptionExcluded: false,
  externalAiUseExcluded: false,
  expertVsAiAccuracyEvaluated: false,
  predictiveAccuracyEvaluated: false,
  generatedModelAdjudicationAllowed: false,
  winnerSelectionAllowed: false,
  majorityVoteAllowed: false,
  averagingAllowed: false,
  automaticMergeAllowed: false,
  formalDisagreementInventoryEmitted: false,
  formalReconciliationEligible: false,
  formalReconciliationRecordEmitted: false,
  pilotToFormalConversionAllowed: false,
  formalTwoOfTwoCountDelta: 0,
  expertGateCountDelta: 0,
  formalAdmissionAllowed: false,
  safeToPublish: false,
  handlingClassification: "private_off_repository_in_memory_only"
});

export class PilotPairComparisonError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PilotPairComparisonError";
    this.code = code;
  }
}

function call(fn, thisArg, args) {
  return REFLECT_APPLY(fn, thisArg, args);
}

function fail(code, message) {
  throw new PilotPairComparisonError(code, message);
}

function deepFreeze(value, seen = new NativeWeakSet()) {
  if (value === null || typeof value !== "object" || call(WEAK_SET_HAS, seen, [value])) return value;
  call(WEAK_SET_ADD, seen, [value]);
  for (const child of call(OBJECT_VALUES, Object, [value])) deepFreeze(child, seen);
  return call(OBJECT_FREEZE, Object, [value]);
}

function cloneJson(value) {
  return call(JSON_PARSE, JSON, [call(JSON_STRINGIFY, JSON, [value])]);
}

function validateExpected(expected) {
  if (expected === null || typeof expected !== "object" || Array.isArray(expected)) {
    fail("EXPECTED_PAIR_INVALID", "必须提供本轮交接号与 A/B 两席的外部 manifest pin。");
  }
  const keys = Object.keys(expected).sort().join(",");
  if (keys !== "reviewCycleId,seatAManifestRawSha256,seatBManifestRawSha256") {
    fail("EXPECTED_PAIR_INVALID", "A/B 预期绑定字段不完整或含额外字段。");
  }
  if (typeof expected.reviewCycleId !== "string"
    || !PILOT_REVIEW_CYCLE_ID_PATTERN.test(expected.reviewCycleId)) {
    fail("EXPECTED_CYCLE_INVALID", "本轮交接号格式无效。");
  }
  for (const [seat, value] of [["A", expected.seatAManifestRawSha256], ["B", expected.seatBManifestRawSha256]]) {
    if (typeof value !== "string" || !SHA256_PATTERN.test(value) || /^0{64}$/u.test(value)) {
      fail("EXPECTED_PIN_INVALID", `${seat} 席 manifest pin 必须是非零 64 位小写 SHA-256。`);
    }
  }
  if (expected.seatAManifestRawSha256 === expected.seatBManifestRawSha256) {
    fail("EXPECTED_PINS_NOT_DISTINCT", "A/B 两席必须使用各自不同的外部 manifest pin。");
  }
  return expected;
}

function validateSubmissionBytes(bytes, label) {
  if (!(bytes instanceof Uint8Array)
    || bytes.byteLength <= 0
    || bytes.byteLength > PILOT_COMPLETE_SUBMISSION_MAX_BYTES) {
    fail("SUBMISSION_BYTES_INVALID", `${label} 必须是非空且不超过上限的完整回件字节。`);
  }
  return bytes;
}

function opinionFromValidatedCompleteSubmission(bytes, label) {
  const complete = parseStrictJsonBytes(bytes, {
    label: `${label} 完整回件`,
    maxBytes: PILOT_COMPLETE_SUBMISSION_MAX_BYTES
  });
  if (!Array.isArray(complete.embeddedFiles)) {
    fail("OPINION_ARTIFACT_MISSING", `${label} 未包含可并列的原始意见工件。`);
  }
  let opinionEntry = null;
  for (const entry of complete.embeddedFiles) {
    if (entry?.role === "domain_opinion_original") {
      if (opinionEntry !== null) fail("OPINION_ARTIFACT_AMBIGUOUS", `${label} 含多个原始意见工件。`);
      opinionEntry = entry;
    }
  }
  if (opinionEntry === null || typeof opinionEntry.exactUtf8Text !== "string") {
    fail("OPINION_ARTIFACT_MISSING", `${label} 未包含可并列的原始意见工件。`);
  }
  return {
    complete,
    opinion: parseStrictJsonText(opinionEntry.exactUtf8Text, { label: `${label} 原始意见` }),
    opinionArtifactRawSha256: opinionEntry.rawSha256
  };
}

function row({ sectionKind, sectionId, sectionTitle, fieldId, fieldLabel, seatAValue, seatBValue }) {
  const a = cloneJson(seatAValue);
  const b = cloneJson(seatBValue);
  const classification = canonicalStringify(a) === canonicalStringify(b) ? "exact_match" : "difference";
  return {
    sectionKind,
    sectionId,
    sectionTitle,
    fieldId,
    fieldLabel,
    classification,
    seatAValue: a,
    seatBValue: b,
    resolutionStatus: classification === "difference" ? "unresolved" : "no_difference_observed",
    machineRecommendedWinner: null
  };
}

function buildComparisonRows(opinionA, opinionB) {
  const reviewerContextRows = [
    row({
      sectionKind: "reviewer_context",
      sectionId: "reviewer-context",
      sectionTitle: "自述流派与范围",
      fieldId: "selfDescribedTradition",
      fieldLabel: "自述流派 / 传统",
      seatAValue: opinionA.reviewerSelfDescription.selfDescribedTradition,
      seatBValue: opinionB.reviewerSelfDescription.selfDescribedTradition
    }),
    row({
      sectionKind: "reviewer_context",
      sectionId: "reviewer-context",
      sectionTitle: "自述流派与范围",
      fieldId: "selfDescribedScope",
      fieldLabel: "本次可复核范围",
      seatAValue: opinionA.reviewerSelfDescription.selfDescribedScope,
      seatBValue: opinionB.reviewerSelfDescription.selfDescribedScope
    })
  ];

  const caseBySeatA = new Map(opinionA.caseResponses.map((response) => [response.scenarioId, response]));
  const caseBySeatB = new Map(opinionB.caseResponses.map((response) => [response.scenarioId, response]));
  const scenarioRows = [];
  for (const scenario of SCENARIOS) {
    const responseA = caseBySeatA.get(scenario.id);
    const responseB = caseBySeatB.get(scenario.id);
    if (!responseA || !responseB) fail("SCENARIO_SET_MISMATCH", `A/B 未精确覆盖场景 ${scenario.id}。`);
    for (const [fieldId, fieldLabel] of CASE_FIELD_DEFINITIONS) {
      scenarioRows.push(row({
        sectionKind: "scenario",
        sectionId: scenario.id,
        sectionTitle: `${scenario.id} · ${scenario.title}`,
        fieldId,
        fieldLabel,
        seatAValue: responseA[fieldId],
        seatBValue: responseB[fieldId]
      }));
    }
  }

  const overallBySeatA = new Map(opinionA.overallQuestionResponses.map((response) => [response.questionId, response]));
  const overallBySeatB = new Map(opinionB.overallQuestionResponses.map((response) => [response.questionId, response]));
  const overallRows = [];
  for (const question of OVERALL_QUESTIONS) {
    const responseA = overallBySeatA.get(question.id);
    const responseB = overallBySeatB.get(question.id);
    if (!responseA || !responseB) fail("QUESTION_SET_MISMATCH", `A/B 未精确覆盖总体问题 ${question.id}。`);
    for (const [fieldId, fieldLabel] of OVERALL_FIELD_DEFINITIONS) {
      overallRows.push(row({
        sectionKind: "overall_question",
        sectionId: question.id,
        sectionTitle: question.title,
        fieldId,
        fieldLabel,
        seatAValue: responseA[fieldId],
        seatBValue: responseB[fieldId]
      }));
    }
  }
  return { reviewerContextRows, scenarioRows, overallRows };
}

async function sha256HexText(text) {
  if (!SUBTLE || typeof SUBTLE_DIGEST !== "function") {
    fail("WEB_CRYPTO_UNAVAILABLE", "当前运行环境缺少 Web Crypto SHA-256。");
  }
  const bytes = call(TEXT_ENCODER_ENCODE, new TextEncoder(), [text]);
  const digest = await call(SUBTLE_DIGEST, SUBTLE, ["SHA-256", bytes]);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function comparePilotCompleteSubmissions({ seatABytes, seatBBytes, expected } = {}) {
  const normalizedExpected = validateExpected(expected);
  const aBytes = validateSubmissionBytes(seatABytes, "A 席");
  const bBytes = validateSubmissionBytes(seatBBytes, "B 席");
  const [preflightA, preflightB] = await Promise.all([
    preflightPilotCompleteSubmissionBytes(aBytes, {
      seatId: "A",
      reviewCycleId: normalizedExpected.reviewCycleId,
      packageManifestRawSha256: normalizedExpected.seatAManifestRawSha256
    }),
    preflightPilotCompleteSubmissionBytes(bBytes, {
      seatId: "B",
      reviewCycleId: normalizedExpected.reviewCycleId,
      packageManifestRawSha256: normalizedExpected.seatBManifestRawSha256
    })
  ]);
  if (preflightA.completePackageRawSha256 === preflightB.completePackageRawSha256) {
    fail("SUBMISSIONS_NOT_DISTINCT", "A/B 完整回件字节必须彼此不同。只能并列两个独立席位。 ");
  }

  const parsedA = opinionFromValidatedCompleteSubmission(aBytes, "A 席");
  const parsedB = opinionFromValidatedCompleteSubmission(bBytes, "B 席");
  const bindingA = parsedA.opinion.sessionBinding;
  const bindingB = parsedB.opinion.sessionBinding;
  for (const key of ["scenarioSetDigest", "questionSetDigest"]) {
    if (bindingA[key] !== bindingB[key]) fail("REVIEW_SET_MISMATCH", `A/B ${key} 不一致。`);
  }
  if (bindingA.entryOrderDigest === bindingB.entryOrderDigest) {
    fail("ENTRY_ORDER_NOT_SEAT_DISTINCT", "A/B 入口顺序摘要必须不同。 ");
  }

  const groups = buildComparisonRows(parsedA.opinion, parsedB.opinion);
  const allRows = [...groups.reviewerContextRows, ...groups.scenarioRows, ...groups.overallRows];
  const exactMatchCount = allRows.filter((entry) => entry.classification === "exact_match").length;
  const unresolvedDifferenceCount = allRows.length - exactMatchCount;
  const candidateSeed = {
    reviewCycleId: normalizedExpected.reviewCycleId,
    seatRefs: {
      A: {
        completePackageRawSha256: preflightA.completePackageRawSha256,
        packageManifestRawSha256: preflightA.packageManifestRawSha256,
        opinionArtifactRawSha256: parsedA.opinionArtifactRawSha256,
        opinionRecordDigest: parsedA.opinion.integrity.recordDigest,
        noCrossOpinionAccessSelfDeclared: parsedA.opinion.noCrossOpinionAccessSelfDeclared
      },
      B: {
        completePackageRawSha256: preflightB.completePackageRawSha256,
        packageManifestRawSha256: preflightB.packageManifestRawSha256,
        opinionArtifactRawSha256: parsedB.opinionArtifactRawSha256,
        opinionRecordDigest: parsedB.opinion.integrity.recordDigest,
        noCrossOpinionAccessSelfDeclared: parsedB.opinion.noCrossOpinionAccessSelfDeclared
      }
    },
    reviewerContextRows: groups.reviewerContextRows,
    scenarioRows: groups.scenarioRows,
    overallQuestionRows: groups.overallRows,
    exactMatchCount,
    unresolvedDifferenceCount
  };
  const comparisonDigest = await sha256HexText(
    `hakimi/bazi/expert-review-pilot/private-pair-comparison/v1\0${canonicalStringify(candidateSeed)}`
  );
  const candidate = deepFreeze({
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_review_pilot_private_pair_comparison_candidate_v1",
    comparisonId: `pilot-private-pair-comparison/${comparisonDigest}`,
    comparisonDigest,
    ...candidateSeed,
    totalComparedFieldCount: allRows.length,
    unresolvedDifferenceIds: allRows
      .filter((entry) => entry.classification === "difference")
      .map((entry) => `${entry.sectionKind}/${entry.sectionId}/${entry.fieldId}`),
    manualPilotFollowupRequired: true,
    manualPilotFollowupDisposition: null,
    comparisonBoundary: PILOT_PAIR_COMPARISON_BOUNDARY,
    releaseGovernance: RELEASE_GOVERNANCE,
    authorityBoundary: PILOT_AUTHORITY_BOUNDARY,
    privacyBoundary: PILOT_PRIVACY_BOUNDARY,
    mutationBoundary: {
      persistencePerformed: false,
      productStorageMutationPerformed: false,
      schema13MutationEpochUsed: false,
      crossFileAtomicSnapshotEstablished: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      replayExcluded: false
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: "hakimi/bazi/expert-review-pilot/private-pair-comparison/v1",
      digestIsDigitalSignature: false,
      serializedCloneRetainsProcessBrand: false,
      trustedTimeEstablished: false,
      firstSeenEstablished: false,
      custodyEstablished: false
    }
  });
  call(WEAK_SET_ADD, VERIFIED_PAIR_COMPARISON_CANDIDATES, [candidate]);
  return candidate;
}

export function isPilotPairComparisonCandidate(value) {
  return value !== null
    && typeof value === "object"
    && call(WEAK_SET_HAS, VERIFIED_PAIR_COMPARISON_CANDIDATES, [value]);
}
