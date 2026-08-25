import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  validateBaziInterpretationEvidenceEnvelope,
  type BaziInterpretationEvidenceEnvelope,
  type BuildBaziInterpretationEvidenceEnvelopeInput
} from "./interpretation-evidence-envelope";

export const BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION =
  "hakimi.bazi.interpretation_ai_assertion_draft/0.1.0" as const;

export const BAZI_INTERPRETATION_AI_FAITHFULNESS_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.interpretation_ai_faithfulness/0.1.0",
  contentVersion: "0.20.0",
  system: "bazi" as const,
  scope: "structured_assertions_against_verified_interpretation_evidence_envelope" as const,
  classificationPolicy: "closed_grammar_exact_reference_checks_not_semantic_paraphrase_judgment" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export type BaziAiAssertionFamily =
  | "fact_quote"
  | "canonical_claim_quote"
  | "rule_quote"
  | "freeform_interpretation"
  | "overall_good_bad"
  | "useful_god"
  | "event_outcome"
  | "expert_truth"
  | "scientific_validity";

export type BaziAiFaithfulnessVerdict =
  | "supported"
  | "advisory"
  | "invented"
  | "contradicted"
  | "unsupported"
  | "unknown"
  | "blocked";

export interface BaziInterpretationAiAssertionDraftItem {
  assertionId: string;
  order: number;
  family: BaziAiAssertionFamily;
  subjectId: string | null;
  content: string;
}

export interface BaziInterpretationAiAssertionDraft {
  profileVersion: typeof BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION;
  envelopePayloadSha256: string;
  assertions: readonly BaziInterpretationAiAssertionDraftItem[];
}

export interface BaziAiFaithfulnessAssertionResult {
  assertionRef: string;
  order: number;
  family: BaziAiAssertionFamily;
  subjectId: string | null;
  inputContentSha256: string;
  verdict: BaziAiFaithfulnessVerdict;
  machineCheckable: boolean;
  displayStatus: "visible_with_evidence" | "visible_with_caveat" | "withheld";
  canonicalContent: string | null;
  factIds: readonly string[];
  ruleIds: readonly string[];
  sourceBindingIds: readonly string[];
  stabilityAssessmentIds: readonly string[];
  missingEvidence: readonly string[];
  rationale: string;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  result: null;
}

export interface BaziInterpretationAiFaithfulnessResult {
  profile: typeof BAZI_INTERPRETATION_AI_FAITHFULNESS_PROFILE;
  binding: Readonly<{
    revisionId: string;
    artifactDigest: string;
    envelopePayloadSha256: string;
    draftSha256: string;
  }>;
  assertions: readonly BaziAiFaithfulnessAssertionResult[];
  counts: Readonly<{
    assertionsTotal: number;
    machineCheckable: number;
    displayable: number;
    supported: number;
    advisory: number;
    invented: number;
    contradicted: number;
    unsupported: number;
    unknown: number;
    blocked: number;
  }>;
  coverage: Readonly<{
    coveredFamilies: readonly BaziAiAssertionFamily[];
    uncoveredFamilies: readonly ["freeform_interpretation"];
    coverageRatio: number | null;
    faithfulnessRatio: number | null;
    overallStatus:
      | "reference_faithful_within_covered_families"
      | "manual_review_required"
      | "withheld"
      | "no_verifiable_claims";
    note: string;
  }>;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
  boundary: Readonly<{
    onlyStructuredDraftAssessed: true;
    externalRawResponseCoverageClaimed: false;
    rawProviderResponseDisplayAuthorized: false;
    exactQuoteMatchEstablishesSemanticTruth: false;
    paraphraseSemanticsAssessed: false;
    freeformContentDisplayAuthorized: false;
    modelMayRecalculateFacts: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    publicReleaseAuthorized: false;
    rawBirthInputCopied: false;
    containsDerivedSensitiveChartData: true;
    networkTransmissionPerformed: false;
    networkTransmissionAuthorized: false;
    chartOrStorageMutationPerformed: false;
    overallGoodBad: null;
    usefulGod: null;
    eventOutcome: null;
    result: null;
  }>;
}

export interface EvaluateBaziInterpretationAiFaithfulnessInput {
  envelope: unknown;
  envelopeInput: BuildBaziInterpretationEvidenceEnvelopeInput;
  draft: unknown;
}

type FaithfulnessPayload = Omit<BaziInterpretationAiFaithfulnessResult, "integrity">;
type AssertionEvaluation = Omit<BaziAiFaithfulnessAssertionResult, "inputContentSha256">;

const MAX_ASSERTIONS = 64;
const MAX_ASSERTION_ID_CHARACTERS = 200;
const MAX_ASSERTION_CONTENT_CHARACTERS = 2_000;
const MAX_TOTAL_CONTENT_CHARACTERS = 32_000;
const ASSERTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const UNSAFE_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const QUOTE_FAMILIES = new Set<BaziAiAssertionFamily>([
  "fact_quote",
  "canonical_claim_quote",
  "rule_quote"
]);
const PROHIBITED_FAMILIES = new Set<BaziAiAssertionFamily>([
  "overall_good_bad",
  "useful_god",
  "event_outcome",
  "expert_truth",
  "scientific_validity"
]);
const ALL_FAMILIES = new Set<BaziAiAssertionFamily>([
  ...QUOTE_FAMILIES,
  "freeform_interpretation",
  ...PROHIBITED_FAMILIES
]);

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function canonicalClone<T>(value: T): T {
  return JSON.parse(canonicalStringify(value)) as T;
}

function assertExactRecord(value: unknown, expectedKeys: readonly string[], subject: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${subject} 必须是对象`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) throw new Error(`${subject} 不得携带符号键`);
  const actual = (ownKeys as string[]).sort();
  const expected = [...expectedKeys].sort();
  if (canonicalStringify(actual) !== canonicalStringify(expected)) {
    throw new Error(`${subject} 字段不符合严格白名单`);
  }
}

function parseDraft(raw: unknown): BaziInterpretationAiAssertionDraft {
  assertExactRecord(raw, ["profileVersion", "envelopePayloadSha256", "assertions"], "AI 断言草稿");
  if (raw.profileVersion !== BAZI_INTERPRETATION_AI_ASSERTION_DRAFT_VERSION) {
    throw new Error("AI 断言草稿 profileVersion 不匹配");
  }
  if (typeof raw.envelopePayloadSha256 !== "string" || !SHA256_PATTERN.test(raw.envelopePayloadSha256)) {
    throw new Error("AI 断言草稿缺少有效的 Envelope payload 摘要");
  }
  if (!Array.isArray(raw.assertions) || raw.assertions.length > MAX_ASSERTIONS) {
    throw new Error(`AI 断言草稿最多允许 ${MAX_ASSERTIONS} 条断言`);
  }
  let totalContentCharacters = 0;
  const assertionIds = new Set<string>();
  const semanticKeys = new Set<string>();
  raw.assertions.forEach((candidate, index) => {
    assertExactRecord(candidate, ["assertionId", "order", "family", "subjectId", "content"], `AI 断言 ${index + 1}`);
    if (typeof candidate.assertionId !== "string"
      || candidate.assertionId.length === 0
      || candidate.assertionId.length > MAX_ASSERTION_ID_CHARACTERS
      || !ASSERTION_ID_PATTERN.test(candidate.assertionId)
      || assertionIds.has(candidate.assertionId)) {
      throw new Error(`AI 断言 ${index + 1} 的 assertionId 无效或重复`);
    }
    assertionIds.add(candidate.assertionId);
    if (candidate.order !== index + 1) throw new Error("AI 断言顺序必须从 1 连续递增");
    if (typeof candidate.family !== "string" || !ALL_FAMILIES.has(candidate.family as BaziAiAssertionFamily)) {
      throw new Error(`AI 断言 ${candidate.assertionId} 使用未知 family`);
    }
    const family = candidate.family as BaziAiAssertionFamily;
    if (QUOTE_FAMILIES.has(family)) {
      if (typeof candidate.subjectId !== "string"
        || candidate.subjectId.length === 0
        || candidate.subjectId.length > MAX_ASSERTION_ID_CHARACTERS
        || !ASSERTION_ID_PATTERN.test(candidate.subjectId)
        || UNSAFE_CONTROL_PATTERN.test(candidate.subjectId)) {
        throw new Error(`AI 断言 ${candidate.assertionId} 的 subjectId 无效`);
      }
    } else if (candidate.subjectId !== null) {
      throw new Error(`AI 断言 ${candidate.assertionId} 的 family 不得携带 subjectId`);
    }
    if (typeof candidate.content !== "string"
      || candidate.content.trim().length === 0
      || candidate.content.length > MAX_ASSERTION_CONTENT_CHARACTERS
      || UNSAFE_CONTROL_PATTERN.test(candidate.content)) {
      throw new Error(`AI 断言 ${candidate.assertionId} 的 content 无效`);
    }
    totalContentCharacters += candidate.content.length;
    const semanticKey = canonicalStringify([family, candidate.subjectId, candidate.content]);
    if (semanticKeys.has(semanticKey)) throw new Error(`AI 断言 ${candidate.assertionId} 重复了同一语义键`);
    semanticKeys.add(semanticKey);
  });
  if (totalContentCharacters > MAX_TOTAL_CONTENT_CHARACTERS) {
    throw new Error(`AI 断言草稿正文合计不得超过 ${MAX_TOTAL_CONTENT_CHARACTERS} 字符`);
  }
  return deepFreeze(canonicalClone(raw as unknown as BaziInterpretationAiAssertionDraft));
}

function uniqueOrdered(values: readonly string[], order: ReadonlyMap<string, number>): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => (
    (order.get(left) ?? Number.MAX_SAFE_INTEGER) - (order.get(right) ?? Number.MAX_SAFE_INTEGER)
  )));
}

function baseEvaluation(
  assertion: BaziInterpretationAiAssertionDraftItem,
  input: Omit<AssertionEvaluation, "assertionRef" | "order" | "family" | "expertTruthClaimed" | "scientificValidityClaimed" | "formalActivationAllowed" | "result">
): AssertionEvaluation {
  return {
    assertionRef: `assertion:${assertion.order}`,
    order: assertion.order,
    family: assertion.family,
    ...input,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    result: null
  };
}

function emptyRefs() {
  return {
    factIds: Object.freeze([]) as readonly string[],
    ruleIds: Object.freeze([]) as readonly string[],
    sourceBindingIds: Object.freeze([]) as readonly string[],
    stabilityAssessmentIds: Object.freeze([]) as readonly string[]
  };
}

function evaluateAssertion(
  assertion: BaziInterpretationAiAssertionDraftItem,
  envelope: BaziInterpretationEvidenceEnvelope
): AssertionEvaluation {
  const factById = new Map(envelope.facts.map((fact) => [fact.factId, fact] as const));
  const ruleById = new Map(envelope.rules.map((rule) => [rule.ruleId, rule] as const));
  const claimById = new Map(envelope.claims.map((claim) => [claim.claimId, claim] as const));
  const bindingById = new Map(envelope.sourceBindings.map((binding) => [binding.bindingId, binding] as const));
  const ruleOrder = new Map(envelope.rules.map((rule) => [rule.ruleId, rule.order] as const));
  const bindingOrder = new Map(envelope.sourceBindings.map((binding) => [binding.bindingId, binding.order] as const));

  if (PROHIBITED_FAMILIES.has(assertion.family)) {
    return baseEvaluation(assertion, {
      subjectId: null,
      verdict: "blocked",
      machineCheckable: true,
      displayStatus: "withheld",
      canonicalContent: null,
      ...emptyRefs(),
      missingEvidence: Object.freeze([`prohibited_family:${assertion.family}`]),
      rationale: "该断言 family 请求了当前 Envelope 明确关闭的结论类型，禁止展示。"
    });
  }

  if (assertion.family === "freeform_interpretation") {
    return baseEvaluation(assertion, {
      subjectId: null,
      verdict: "unknown",
      machineCheckable: false,
      displayStatus: "withheld",
      canonicalContent: null,
      ...emptyRefs(),
      missingEvidence: Object.freeze(["freeform_semantics_not_machine_assessed"]),
      rationale: "当前确定性校验器不判断自由改写、否定、引用或同义转述的语义忠实性；未知改写保持 manual review / withheld。"
    });
  }

  if (assertion.family === "fact_quote") {
    const fact = factById.get(assertion.subjectId ?? "");
    if (!fact) {
      return baseEvaluation(assertion, {
        subjectId: null,
        verdict: "invented",
        machineCheckable: true,
        displayStatus: "withheld",
        canonicalContent: null,
        ...emptyRefs(),
        missingEvidence: Object.freeze(["unknown_fact"]),
        rationale: "断言引用了 Envelope 中不存在的 factId。"
      });
    }
    const sourceBindingIds = uniqueOrdered(
      fact.ruleIds.flatMap((ruleId) => ruleById.get(ruleId)?.sourceBindingIds ?? []),
      bindingOrder
    );
    if (fact.status === "withheld" || fact.value === null) {
      return baseEvaluation(assertion, {
        subjectId: fact.factId,
        verdict: "blocked",
        machineCheckable: true,
        displayStatus: "withheld",
        canonicalContent: null,
        factIds: Object.freeze([fact.factId]),
        ruleIds: Object.freeze([...fact.ruleIds]),
        sourceBindingIds,
        stabilityAssessmentIds: Object.freeze([]),
        missingEvidence: Object.freeze([`withheld_fact:${fact.factId}`]),
        rationale: "该事实已被 Envelope 留白，AI 不得补猜其值。"
      });
    }
    const blockedRuleIds = fact.ruleIds.filter((ruleId) => ruleById.get(ruleId)?.status === "blocked");
    const unverifiedBindingIds = sourceBindingIds.filter(
      (bindingId) => bindingById.get(bindingId)?.exactLocator.verificationStatus !== "verified"
    );
    if (blockedRuleIds.length || unverifiedBindingIds.length) {
      return baseEvaluation(assertion, {
        subjectId: fact.factId,
        verdict: "blocked",
        machineCheckable: true,
        displayStatus: "withheld",
        canonicalContent: null,
        factIds: Object.freeze([fact.factId]),
        ruleIds: Object.freeze([...fact.ruleIds]),
        sourceBindingIds,
        stabilityAssessmentIds: Object.freeze([]),
        missingEvidence: Object.freeze([
          ...blockedRuleIds.map((ruleId) => `blocked_rule:${ruleId}`),
          ...unverifiedBindingIds.map((bindingId) => `unverified_source_binding:${bindingId}`)
        ]),
        rationale: "该事实依赖 blocked 规则或未核实来源定位，不能通过 fact_quote 绕过上游门。"
      });
    }
    const exact = assertion.content === fact.value;
    return baseEvaluation(assertion, {
      subjectId: fact.factId,
      verdict: exact ? "supported" : "contradicted",
      machineCheckable: true,
      displayStatus: exact ? "visible_with_evidence" : "withheld",
      canonicalContent: exact ? fact.value : null,
      factIds: Object.freeze([fact.factId]),
      ruleIds: Object.freeze([...fact.ruleIds]),
      sourceBindingIds,
      stabilityAssessmentIds: Object.freeze([]),
      missingEvidence: exact ? Object.freeze([]) : Object.freeze([`fact_quote_mismatch:${fact.factId}`]),
      rationale: exact
        ? "断言逐字匹配当前 verified Envelope 的可见事实投影；这不证明语义、术数或科学真值。"
        : "fact_quote 没有逐字匹配其 factId 的规范内容，禁止展示。"
    });
  }

  if (assertion.family === "rule_quote") {
    const rule = ruleById.get(assertion.subjectId ?? "");
    if (!rule) {
      return baseEvaluation(assertion, {
        subjectId: null,
        verdict: "invented",
        machineCheckable: true,
        displayStatus: "withheld",
        canonicalContent: null,
        ...emptyRefs(),
        missingEvidence: Object.freeze(["unknown_rule"]),
        rationale: "断言引用了 Envelope 中不存在的 ruleId。"
      });
    }
    if (rule.status === "blocked") {
      return baseEvaluation(assertion, {
        subjectId: rule.ruleId,
        verdict: "blocked",
        machineCheckable: true,
        displayStatus: "withheld",
        canonicalContent: null,
        factIds: Object.freeze([]),
        ruleIds: Object.freeze([rule.ruleId]),
        sourceBindingIds: Object.freeze([...rule.sourceBindingIds]),
        stabilityAssessmentIds: Object.freeze([]),
        missingEvidence: Object.freeze([`blocked_rule:${rule.ruleId}`]),
        rationale: "该规则仍被当前来源或复核门阻断，AI 不得启用。"
      });
    }
    const exact = assertion.content === rule.statement;
    return baseEvaluation(assertion, {
      subjectId: rule.ruleId,
      verdict: exact ? "advisory" : "unsupported",
      machineCheckable: true,
      displayStatus: exact ? "visible_with_caveat" : "withheld",
      canonicalContent: exact ? rule.statement : null,
      factIds: Object.freeze([]),
      ruleIds: Object.freeze([rule.ruleId]),
      sourceBindingIds: Object.freeze([...rule.sourceBindingIds]),
      stabilityAssessmentIds: Object.freeze([]),
      missingEvidence: exact ? Object.freeze([]) : Object.freeze([`rule_quote_mismatch:${rule.ruleId}`]),
      rationale: exact
        ? "断言逐字匹配当前工程候选或传统语境规则；只允许带 caveat 展示。"
        : "rule_quote 不是规范规则原文；当前校验器不推断其改写语义。"
    });
  }

  const claim = claimById.get(assertion.subjectId ?? "");
  if (!claim) {
    return baseEvaluation(assertion, {
      subjectId: null,
      verdict: "invented",
      machineCheckable: true,
      displayStatus: "withheld",
      canonicalContent: null,
      ...emptyRefs(),
      missingEvidence: Object.freeze(["unknown_claim"]),
      rationale: "断言引用了 Envelope 中不存在的 claimId。"
    });
  }
  if (claim.classification === "blocked" || claim.displayStatus === "withheld") {
    return baseEvaluation(assertion, {
      subjectId: claim.claimId,
      verdict: "blocked",
      machineCheckable: true,
      displayStatus: "withheld",
      canonicalContent: null,
      factIds: Object.freeze([...claim.factIds]),
      ruleIds: uniqueOrdered(claim.ruleIds, ruleOrder),
      sourceBindingIds: uniqueOrdered(claim.sourceBindingIds, bindingOrder),
      stabilityAssessmentIds: Object.freeze([...claim.stabilityAssessmentIds]),
      missingEvidence: Object.freeze([...claim.missingEvidence]),
      rationale: "该规范主张本身处于 blocked/withheld 状态，AI 不得恢复或改写。"
    });
  }
  const exact = assertion.content === claim.text;
  const advisory = claim.classification === "advisory" || claim.displayStatus === "visible_with_caveat";
  return baseEvaluation(assertion, {
    subjectId: claim.claimId,
    verdict: exact ? advisory ? "advisory" : "supported" : "unsupported",
    machineCheckable: true,
    displayStatus: exact ? advisory ? "visible_with_caveat" : "visible_with_evidence" : "withheld",
    canonicalContent: exact ? claim.text : null,
    factIds: Object.freeze([...claim.factIds]),
    ruleIds: uniqueOrdered(claim.ruleIds, ruleOrder),
    sourceBindingIds: uniqueOrdered(claim.sourceBindingIds, bindingOrder),
    stabilityAssessmentIds: Object.freeze([...claim.stabilityAssessmentIds]),
    missingEvidence: exact ? Object.freeze([]) : Object.freeze([`claim_quote_mismatch:${claim.claimId}`]),
    rationale: exact
      ? advisory
        ? "断言逐字匹配规范 caveat；只允许降级展示。"
        : "断言逐字匹配当前 verified Envelope 的可见主张；这不证明语义、术数或科学真值。"
      : "canonical_claim_quote 不是规范主张原文；当前校验器不推断其改写语义。"
  });
}

function countVerdict(
  assertions: readonly BaziAiFaithfulnessAssertionResult[],
  verdict: BaziAiFaithfulnessVerdict
): number {
  return assertions.filter((assertion) => assertion.verdict === verdict).length;
}

export async function evaluateBaziInterpretationAiFaithfulness(
  input: EvaluateBaziInterpretationAiFaithfulnessInput
): Promise<BaziInterpretationAiFaithfulnessResult> {
  if (!input || typeof input !== "object") throw new Error("AI 忠实性评估输入无效");
  const draft = parseDraft(input.draft);
  const envelope = await validateBaziInterpretationEvidenceEnvelope(input.envelope, input.envelopeInput);
  if (draft.envelopePayloadSha256 !== envelope.integrity.payloadSha256) {
    throw new Error("AI 断言草稿没有绑定当前 verified Envelope payload");
  }

  const assertions = deepFreeze(await Promise.all(draft.assertions.map(async (assertion) => ({
    ...evaluateAssertion(assertion, envelope),
    inputContentSha256: await sha256Hex(assertion.content)
  }))));
  const machineCheckable = assertions.filter((assertion) => assertion.machineCheckable).length;
  const displayable = assertions.filter((assertion) => assertion.displayStatus !== "withheld").length;
  const counts = Object.freeze({
    assertionsTotal: assertions.length,
    machineCheckable,
    displayable,
    supported: countVerdict(assertions, "supported"),
    advisory: countVerdict(assertions, "advisory"),
    invented: countVerdict(assertions, "invented"),
    contradicted: countVerdict(assertions, "contradicted"),
    unsupported: countVerdict(assertions, "unsupported"),
    unknown: countVerdict(assertions, "unknown"),
    blocked: countVerdict(assertions, "blocked")
  });
  const allDisplayable = assertions.length > 0 && displayable === assertions.length;
  const hasHardFailure = counts.invented + counts.contradicted + counts.unsupported + counts.blocked > 0;
  const coverageRatio = assertions.length === 0 ? null : machineCheckable / assertions.length;
  const faithfulnessRatio = machineCheckable === 0 ? null : displayable / machineCheckable;
  const payload: FaithfulnessPayload = {
    profile: BAZI_INTERPRETATION_AI_FAITHFULNESS_PROFILE,
    binding: {
      revisionId: envelope.artifact.revisionId,
      artifactDigest: envelope.artifact.artifactDigest,
      envelopePayloadSha256: envelope.integrity.payloadSha256,
      draftSha256: await sha256Hex(draft)
    },
    assertions,
    counts,
    coverage: {
      coveredFamilies: [
        "fact_quote",
        "canonical_claim_quote",
        "rule_quote",
        "overall_good_bad",
        "useful_god",
        "event_outcome",
        "expert_truth",
        "scientific_validity"
      ],
      uncoveredFamilies: ["freeform_interpretation"],
      coverageRatio,
      faithfulnessRatio,
      overallStatus: assertions.length === 0
        ? "no_verifiable_claims"
        : allDisplayable
          ? "reference_faithful_within_covered_families"
          : hasHardFailure
            ? "withheld"
            : "manual_review_required",
      note: "coverage 只表示封闭 grammar 中可做确定性引用检查的比例；自由改写、解释质量、专家内容真值和科学有效性均未评估。"
    },
    boundary: {
      onlyStructuredDraftAssessed: true,
      externalRawResponseCoverageClaimed: false,
      rawProviderResponseDisplayAuthorized: false,
      exactQuoteMatchEstablishesSemanticTruth: false,
      paraphraseSemanticsAssessed: false,
      freeformContentDisplayAuthorized: false,
      modelMayRecalculateFacts: false,
      expertTruthClaimed: false,
      scientificValidityClaimed: false,
      formalActivationAllowed: false,
      publicReleaseAuthorized: false,
      rawBirthInputCopied: false,
      containsDerivedSensitiveChartData: true,
      networkTransmissionPerformed: false,
      networkTransmissionAuthorized: false,
      chartOrStorageMutationPerformed: false,
      overallGoodBad: null,
      usefulGod: null,
      eventOutcome: null,
      result: null
    }
  };
  return deepFreeze(canonicalClone({
    ...payload,
    integrity: {
      hashAlgorithm: "SHA-256",
      payloadSha256: await sha256Hex(payload),
      authenticityClaimed: false
    }
  }));
}
