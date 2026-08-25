import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { verifyRevisionRecordIntegrity } from "@hakimi/chart-integrity";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import type { BaziInterpretationResult } from "./index";
import {
  buildBaziStrengthEvidenceNarrative,
  validateBaziStrengthEvidenceNarrative,
  type BaziStrengthEvidenceItem,
  type BaziStrengthEvidenceNarrativeResult,
  type BaziStrengthNarrativeStatement
} from "./strength-evidence-narrative";
import type {
  BaziStrengthClaim,
  BaziStrengthClaimSource,
  BaziStrengthClaimSourceBinding
} from "./strength-claim-registry";
import { BAZI_STRENGTH_CLAIM_REGISTRY } from "./strength-claim-registry";
import type { StrengthSensitivityReview } from "./strength-sensitivity-review";

export const BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.interpretation_evidence_envelope/0.2.0",
  contentVersion: "0.19.0",
  system: "bazi" as const,
  scope: "current_revision_strength_interpretation_evidence" as const,
  classificationPolicy: "deterministic_reference_resolution_not_semantic_truth" as const,
  mutationPolicy: "read_only_projection" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export type InterpretationEvidenceClassification =
  | "supported"
  | "inferred"
  | "unsupported"
  | "contradicted"
  | "advisory"
  | "blocked";

export type InterpretationEvidenceDisplayStatus =
  | "visible_with_evidence"
  | "visible_with_caveat"
  | "withheld";

export type InterpretationInputAssumptionStatus =
  | "confirmed"
  | "candidate"
  | "missing"
  | "not_applicable";

export type InterpretationStabilityStatus =
  | "stable"
  | "boundary_sensitive"
  | "candidate_dependent"
  | "source_dependent"
  | "unknown";

export interface BaziInterpretationArtifactBinding {
  system: "bazi";
  revisionId: string;
  revisionNumber: number;
  artifactDigest: string;
  factsProjectionVersion: string;
  factsProjectionDigest: string;
  ruleProfileId: string;
  ruleProfileVersion: string;
  ruleProfileDigest: string;
  ruleProfileStatus: RevisionRecord["ruleProfile"]["status"];
  engine: Readonly<{
    id: string;
    version: string;
    upstreamId: string;
    upstreamVersion: string;
  }>;
  tzdbVersion: string;
}

export interface InterpretationInputAssumption {
  assumptionId: string;
  order: number;
  fieldPath: string;
  label: string;
  status: InterpretationInputAssumptionStatus;
  value: string | null;
  note: string;
}

export interface BaziInterpretationEvidenceFact {
  factId: string;
  order: number;
  fieldPath: string;
  label: string;
  status: "confirmed" | "withheld";
  value: string | null;
  note: string;
  ruleIds: readonly string[];
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  result: null;
}

export interface BaziInterpretationEvidenceRule {
  ruleId: string;
  order: number;
  statement: string;
  status: "engineering_candidate" | "traditional_context_only" | "blocked";
  sourceBindingIds: readonly string[];
  applicabilityConditions: readonly string[];
  counterexamples: readonly string[];
  prohibitedOutcomeClaims: readonly string[];
  reviewStatus: BaziStrengthClaim["reviewStatus"];
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  result: null;
}

export interface BaziInterpretedClaim {
  claimId: string;
  order: number;
  kind: BaziStrengthNarrativeStatement["kind"];
  text: string;
  classification: InterpretationEvidenceClassification;
  supportScope: "engineering_projection_only" | "withholding_and_review_boundary";
  factIds: readonly string[];
  ruleIds: readonly string[];
  sourceBindingIds: readonly string[];
  stabilityAssessmentIds: readonly string[];
  conflictIds: readonly string[];
  missingEvidence: readonly string[];
  rationale: string;
  displayStatus: InterpretationEvidenceDisplayStatus;
  reviewStatus: "candidate_pending_expert_review";
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  result: null;
}

export interface InterpretationStabilityAssessment {
  assessmentId: string;
  order: number;
  status: "stable" | "candidate_dependent";
  affectedFactIds: readonly string[];
  note: string;
}

export interface BaziInterpretationStability {
  coverage: "declared_strength_rule_scenarios_only";
  overallStatus: InterpretationStabilityStatus;
  ruleScenarioStatus: "stable" | "candidate_dependent";
  timePerturbationStatus: "not_assessed";
  assessments: readonly InterpretationStabilityAssessment[];
  note: string;
}

export interface BaziInterpretationEvidenceCounts {
  inputAssumptions: number;
  sources: number;
  sourceBindings: number;
  rules: number;
  facts: number;
  claims: number;
  conflicts: number;
  supported: number;
  inferred: number;
  unsupported: number;
  contradicted: number;
  advisory: number;
  blocked: number;
}

export interface BaziInterpretationEvidenceEnvelope {
  profile: typeof BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE;
  artifact: BaziInterpretationArtifactBinding;
  inputAssumptions: readonly InterpretationInputAssumption[];
  sources: readonly BaziStrengthClaimSource[];
  sourceBindings: readonly BaziStrengthClaimSourceBinding[];
  rules: readonly BaziInterpretationEvidenceRule[];
  facts: readonly BaziInterpretationEvidenceFact[];
  claims: readonly BaziInterpretedClaim[];
  conflicts: readonly never[];
  stability: BaziInterpretationStability;
  counts: BaziInterpretationEvidenceCounts;
  integrity: Readonly<{
    hashAlgorithm: "SHA-256";
    payloadSha256: string;
    authenticityClaimed: false;
  }>;
  boundary: Readonly<{
    referenceResolutionEstablishesSemanticTruth: false;
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

export interface BuildBaziInterpretationEvidenceEnvelopeInput {
  revision: RevisionRecord;
  includeHour: boolean;
  interpretation: BaziInterpretationResult;
  strengthSensitivity: StrengthSensitivityReview;
}

type BaziInterpretationEvidenceEnvelopePayload = Omit<BaziInterpretationEvidenceEnvelope, "integrity">;

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
}

function canonicalClone<T>(value: T): T {
  return JSON.parse(canonicalStringify(value)) as T;
}

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalStringify(left) === canonicalStringify(right);
}

function snapshotBuildInput(input: BuildBaziInterpretationEvidenceEnvelopeInput): BuildBaziInterpretationEvidenceEnvelopeInput {
  if (!input || typeof input !== "object" || typeof input.includeHour !== "boolean") {
    throw new Error("解读证据 Envelope 构建输入无效");
  }
  return deepFreeze(canonicalClone({
    revision: input.revision,
    includeHour: input.includeHour,
    interpretation: input.interpretation,
    strengthSensitivity: input.strengthSensitivity
  }));
}

function assertExactRecord(value: unknown, expectedKeys: readonly string[], subject: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${subject} 必须是对象`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new Error(`${subject} 不得携带符号键`);
  }
  const actual = (ownKeys as string[]).sort();
  const expected = [...expectedKeys].sort();
  if (!sameCanonical(actual, expected)) {
    throw new Error(`${subject} 字段不符合严格白名单`);
  }
}

function assertArray(value: unknown, subject: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`${subject} 必须是数组`);
}

function envelopePayload(envelope: BaziInterpretationEvidenceEnvelope): BaziInterpretationEvidenceEnvelopePayload {
  const { integrity: _integrity, ...payload } = envelope;
  return payload;
}

function parseEnvelopeRuntimeShape(raw: unknown): BaziInterpretationEvidenceEnvelope {
  assertExactRecord(raw, [
    "profile",
    "artifact",
    "inputAssumptions",
    "sources",
    "sourceBindings",
    "rules",
    "facts",
    "claims",
    "conflicts",
    "stability",
    "counts",
    "integrity",
    "boundary"
  ], "八字解读证据 Envelope");
  assertExactRecord(raw.profile, [
    "projectionVersion",
    "contentVersion",
    "system",
    "scope",
    "classificationPolicy",
    "mutationPolicy",
    "reviewStatus",
    "expertTruthClaimed",
    "scientificValidityClaimed",
    "formalActivationAllowed"
  ], "八字解读证据 Envelope profile");
  assertExactRecord(raw.artifact, [
    "system",
    "revisionId",
    "revisionNumber",
    "artifactDigest",
    "factsProjectionVersion",
    "factsProjectionDigest",
    "ruleProfileId",
    "ruleProfileVersion",
    "ruleProfileDigest",
    "ruleProfileStatus",
    "engine",
    "tzdbVersion"
  ], "八字解读证据 Envelope 工件绑定");
  assertExactRecord(raw.artifact.engine, ["id", "version", "upstreamId", "upstreamVersion"], "引擎绑定");
  assertArray(raw.inputAssumptions, "输入假设");
  raw.inputAssumptions.forEach((item, index) => assertExactRecord(
    item,
    ["assumptionId", "order", "fieldPath", "label", "status", "value", "note"],
    `输入假设 ${index + 1}`
  ));
  assertArray(raw.sources, "来源");
  raw.sources.forEach((item, index) => assertExactRecord(item, [
    "sourceId",
    "order",
    "sourceType",
    "title",
    "editionOrCarrier",
    "url",
    "stableRevision",
    "verificationStatus",
    "workRightsStatus",
    "carrierRightsStatus",
    "usageBoundary",
    "expertTruthClaimed",
    "scientificValidityClaimed"
  ], `来源 ${index + 1}`));
  assertArray(raw.sourceBindings, "来源定位");
  raw.sourceBindings.forEach((item, index) => {
    assertExactRecord(item, [
      "bindingId",
      "evidenceSubjectId",
      "order",
      "sourceId",
      "sourceType",
      "evidenceRole",
      "exactLocator",
      "parameterSupport",
      "supports",
      "doesNotSupport"
    ], `来源定位 ${index + 1}`);
    assertExactRecord(item.exactLocator, ["kind", "value", "verificationStatus", "contentSha256"], `来源定位 ${index + 1} 的精确位置`);
  });
  assertArray(raw.rules, "规则");
  raw.rules.forEach((item, index) => assertExactRecord(item, [
    "ruleId",
    "order",
    "statement",
    "status",
    "sourceBindingIds",
    "applicabilityConditions",
    "counterexamples",
    "prohibitedOutcomeClaims",
    "reviewStatus",
    "expertTruthClaimed",
    "scientificValidityClaimed",
    "formalActivationAllowed",
    "result"
  ], `规则 ${index + 1}`));
  assertArray(raw.facts, "事实");
  raw.facts.forEach((item, index) => assertExactRecord(item, [
    "factId",
    "order",
    "fieldPath",
    "label",
    "status",
    "value",
    "note",
    "ruleIds",
    "expertTruthClaimed",
    "scientificValidityClaimed",
    "result"
  ], `事实 ${index + 1}`));
  assertArray(raw.claims, "解读主张");
  raw.claims.forEach((item, index) => assertExactRecord(item, [
    "claimId",
    "order",
    "kind",
    "text",
    "classification",
    "supportScope",
    "factIds",
    "ruleIds",
    "sourceBindingIds",
    "stabilityAssessmentIds",
    "conflictIds",
    "missingEvidence",
    "rationale",
    "displayStatus",
    "reviewStatus",
    "expertTruthClaimed",
    "scientificValidityClaimed",
    "formalActivationAllowed",
    "result"
  ], `解读主张 ${index + 1}`));
  assertArray(raw.conflicts, "冲突");
  assertExactRecord(raw.stability, [
    "coverage",
    "overallStatus",
    "ruleScenarioStatus",
    "timePerturbationStatus",
    "assessments",
    "note"
  ], "稳定性");
  assertArray(raw.stability.assessments, "稳定性评估");
  raw.stability.assessments.forEach((item, index) => assertExactRecord(
    item,
    ["assessmentId", "order", "status", "affectedFactIds", "note"],
    `稳定性评估 ${index + 1}`
  ));
  assertExactRecord(raw.counts, [
    "inputAssumptions",
    "sources",
    "sourceBindings",
    "rules",
    "facts",
    "claims",
    "conflicts",
    "supported",
    "inferred",
    "unsupported",
    "contradicted",
    "advisory",
    "blocked"
  ], "计数");
  assertExactRecord(raw.integrity, ["hashAlgorithm", "payloadSha256", "authenticityClaimed"], "完整性");
  assertExactRecord(raw.boundary, [
    "referenceResolutionEstablishesSemanticTruth",
    "modelMayRecalculateFacts",
    "expertTruthClaimed",
    "scientificValidityClaimed",
    "formalActivationAllowed",
    "publicReleaseAuthorized",
    "rawBirthInputCopied",
    "containsDerivedSensitiveChartData",
    "networkTransmissionPerformed",
    "networkTransmissionAuthorized",
    "chartOrStorageMutationPerformed",
    "overallGoodBad",
    "usefulGod",
    "eventOutcome",
    "result"
  ], "安全边界");
  return raw as unknown as BaziInterpretationEvidenceEnvelope;
}

function assumption(
  items: InterpretationInputAssumption[],
  input: Omit<InterpretationInputAssumption, "order">
): void {
  items.push(Object.freeze({ ...input, order: items.length + 1 }));
}

function buildInputAssumptions(
  revision: RevisionRecord,
  includeHour: boolean
): readonly InterpretationInputAssumption[] {
  const items: InterpretationInputAssumption[] = [];
  const timePrecisionStatus: InterpretationInputAssumptionStatus =
    revision.input.timePrecision === "exact_second" || revision.input.timePrecision === "exact_minute"
      ? "confirmed"
      : revision.input.timePrecision === "hour_range"
        ? "candidate"
        : "missing";
  const locationStatus: InterpretationInputAssumptionStatus = revision.input.location.precision === "coordinates"
    ? "confirmed"
    : revision.input.location.precision === "city"
      ? "candidate"
      : "missing";
  const dstStatus: InterpretationInputAssumptionStatus = revision.timeCalibration.dstStatus === "resolved"
    ? "confirmed"
    : revision.timeCalibration.dstStatus === "not_applicable"
      ? "not_applicable"
      : "missing";
  const solarEnabled = revision.ruleProfile.solarTime.enabled;
  const solarStatus: InterpretationInputAssumptionStatus = !solarEnabled
    ? "not_applicable"
    : revision.timeCalibration.solarTimeApplied
      ? "confirmed"
      : revision.input.location.precision === "coordinates" && revision.timeCalibration.solarTimePreview
        ? "candidate"
        : "missing";

  assumption(items, {
    assumptionId: "input:calendar",
    fieldPath: "revision.input.calendarType",
    label: "输入历法",
    status: "confirmed",
    value: revision.input.calendarType,
    note: revision.input.calendarType === "lunar" ? "闰月标记已保存在 Revision。" : "公历输入不使用闰月标记。"
  });
  assumption(items, {
    assumptionId: "input:birth-time-precision",
    fieldPath: "revision.input.timePrecision",
    label: "出生时间精度",
    status: timePrecisionStatus,
    value: revision.input.timePrecision,
    note: timePrecisionStatus === "confirmed"
      ? "精度字段已明确；本 Envelope 不复制出生时刻原文。"
      : "时间精度不足以把所有时柱相关内容当成确定事实。"
  });
  assumption(items, {
    assumptionId: "input:location-precision",
    fieldPath: "revision.input.location.precision",
    label: "出生地点精度",
    status: locationStatus,
    value: revision.input.location.precision,
    note: "只记录精度等级，不复制地点名称或坐标。"
  });
  assumption(items, {
    assumptionId: "input:time-zone",
    fieldPath: "revision.input.timeZone",
    label: "IANA 时区",
    status: "confirmed",
    value: revision.input.timeZone,
    note: `绑定 ${revision.manifest.tzdbVersion}；时区存在不等于 DST 歧义已经解决。`
  });
  assumption(items, {
    assumptionId: "input:dst-resolution",
    fieldPath: "revision.timeCalibration.dstStatus",
    label: "DST 歧义",
    status: dstStatus,
    value: revision.timeCalibration.dstStatus,
    note: dstStatus === "missing" ? "DST 解析未完成，相关确定性解读必须阻断。" : "沿用 Revision 的时区解析状态。"
  });
  assumption(items, {
    assumptionId: "input:solar-time-policy",
    fieldPath: "revision.ruleProfile.solarTime",
    label: "真太阳时策略",
    status: solarStatus,
    value: `enabled=${solarEnabled};applied=${revision.timeCalibration.solarTimeApplied};hourBasis=${revision.ruleProfile.calendar.hourBasis}`,
    note: solarStatus === "candidate"
      ? "只有比较预览，未把预览冒充已应用结果。"
      : solarStatus === "missing"
        ? "策略需要地点或校准证据，但当前 Revision 未提供充分条件。"
        : "沿用当前规则和校准收据。"
  });
  assumption(items, {
    assumptionId: "input:calendar-boundaries",
    fieldPath: "revision.ruleProfile.calendar",
    label: "历法边界策略",
    status: "confirmed",
    value: [
      revision.ruleProfile.calendar.yearBoundary,
      revision.ruleProfile.calendar.monthBoundary,
      revision.ruleProfile.calendar.dayBoundary,
      revision.ruleProfile.calendar.ziHourDayStemBasis
    ].join("/"),
    note: "年、月、日与子时日干边界均来自版本化规则配置。"
  });
  assumption(items, {
    assumptionId: "input:lunar-leap-month",
    fieldPath: "revision.input.lunarLeapMonth",
    label: "农历闰月",
    status: revision.input.calendarType === "lunar" ? "confirmed" : "not_applicable",
    value: revision.input.calendarType === "lunar" ? String(revision.input.lunarLeapMonth) : null,
    note: revision.input.calendarType === "lunar" ? "显式保留闰月选择。" : "公历输入不适用。"
  });
  assumption(items, {
    assumptionId: "input:hour-inclusion",
    fieldPath: "evidence.executionScope.includeHour",
    label: "时柱纳入",
    status: includeHour ? timePrecisionStatus : "missing",
    value: String(includeHour),
    note: includeHour
      ? "时柱只在当前时间精度允许的范围内进入证据投影。"
      : "时柱事实和值全部 withheld，不以合成时刻补猜。"
  });
  assumption(items, {
    assumptionId: "input:rule-profile-review",
    fieldPath: "revision.ruleProfile.status",
    label: "规则配置审定状态",
    status: revision.ruleProfile.status === "verified" ? "confirmed" : "candidate",
    value: revision.ruleProfile.status,
    note: revision.ruleProfile.status === "verified"
      ? "工程规则配置标记为 verified；仍不自动建立术数专家真值。"
      : "当前规则仍是工程候选，不得被模型改写为正式流派裁决。"
  });

  return Object.freeze(items);
}

function ruleStatus(claim: BaziStrengthClaim): BaziInterpretationEvidenceRule["status"] {
  if (claim.displayStatus === "withheld_pending_verified_locator_or_review") return "blocked";
  if (claim.displayStatus === "enabled_traditional_context") return "traditional_context_only";
  return "engineering_candidate";
}

function buildRules(claims: readonly BaziStrengthClaim[]): readonly BaziInterpretationEvidenceRule[] {
  return Object.freeze(claims.map((claim) => Object.freeze({
    ruleId: claim.claimId,
    order: claim.order,
    statement: claim.candidateStatement,
    status: ruleStatus(claim),
    sourceBindingIds: Object.freeze([...claim.sourceBindingIds]),
    applicabilityConditions: Object.freeze([...claim.applicabilityConditions]),
    counterexamples: Object.freeze([...claim.counterexamples]),
    prohibitedOutcomeClaims: Object.freeze([...claim.prohibitedOutcomeClaims]),
    reviewStatus: claim.reviewStatus,
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const,
    formalActivationAllowed: false as const,
    result: null
  })));
}

function factFieldPath(item: BaziStrengthEvidenceItem): string {
  if (item.status === "withheld_unreliable_hour") return "revision.facts.pillars.hour.withheld";
  const suffix = item.hiddenStemIndex === null ? item.category : `${item.category}[${item.hiddenStemIndex}]`;
  return `revision.facts.pillars.${item.position}.${suffix}`;
}

function buildFacts(items: readonly BaziStrengthEvidenceItem[]): readonly BaziInterpretationEvidenceFact[] {
  return Object.freeze(items.map((item) => Object.freeze({
    factId: item.evidenceItemId,
    order: item.order,
    fieldPath: factFieldPath(item),
    label: `${item.positionLabel} · ${item.category}`,
    status: item.status === "withheld_unreliable_hour" ? "withheld" as const : "confirmed" as const,
    value: item.status === "withheld_unreliable_hour" ? null : item.directStatement,
    note: item.status === "withheld_unreliable_hour" ? item.directStatement : item.doesNotEstablish,
    ruleIds: Object.freeze([...item.claimIds]),
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const,
    result: null
  })));
}

function factIdsForStatement(
  statement: BaziStrengthNarrativeStatement,
  narrative: BaziStrengthEvidenceNarrativeResult
): readonly string[] {
  if (statement.evidenceItemIds.length) return Object.freeze([...statement.evidenceItemIds]);
  if (statement.kind === "scope") {
    return Object.freeze(narrative.evidenceItems.map((item) => item.evidenceItemId));
  }
  if (statement.kind === "sensitivity" && statement.sensitivityScenarioIds.includes("baseline_current_candidate")) {
    return Object.freeze(narrative.evidenceItems
      .filter((item) => item.status === "included")
      .map((item) => item.evidenceItemId));
  }
  return Object.freeze([]);
}

function classifyStatement(
  statement: BaziStrengthNarrativeStatement,
  ruleById: ReadonlyMap<string, BaziInterpretationEvidenceRule>,
  bindingById: ReadonlyMap<string, BaziStrengthClaimSourceBinding>
): Pick<BaziInterpretedClaim, "classification" | "displayStatus" | "missingEvidence" | "rationale" | "supportScope"> {
  if (statement.kind === "boundary") {
    return {
      classification: "advisory",
      displayStatus: "visible_with_caveat",
      missingEvidence: Object.freeze([]),
      rationale: "这是显式的留白与复核边界，不是命盘事实或确定结论。",
      supportScope: "withholding_and_review_boundary"
    };
  }
  const blockedRuleIds = statement.claimIds.filter((ruleId) => ruleById.get(ruleId)?.status === "blocked");
  const unverifiedBindingIds = statement.sourceBindingIds.filter(
    (bindingId) => bindingById.get(bindingId)?.exactLocator.verificationStatus !== "verified"
  );
  const missingEvidence = Object.freeze([
    ...blockedRuleIds.map((ruleId) => `blocked_rule:${ruleId}`),
    ...unverifiedBindingIds.map((bindingId) => `unverified_source_binding:${bindingId}`)
  ]);
  if (missingEvidence.length) {
    return {
      classification: "blocked",
      displayStatus: "withheld",
      missingEvidence,
      rationale: "规则或精确来源定位尚未通过当前工程门，禁止把这条叙事交给模型当作可用结论。",
      supportScope: "engineering_projection_only"
    };
  }
  return {
    classification: "supported",
    displayStatus: "visible_with_evidence",
    missingEvidence,
    rationale: "事实、工程规则与精确来源定位均可解析；supported 仅表示当前工程投影引用闭合，不证明术数或科学真值。",
    supportScope: "engineering_projection_only"
  };
}

function buildClaims(
  narrative: BaziStrengthEvidenceNarrativeResult,
  rules: readonly BaziInterpretationEvidenceRule[]
): readonly BaziInterpretedClaim[] {
  const ruleById = new Map(rules.map((rule) => [rule.ruleId, rule] as const));
  const bindingById = new Map(narrative.sourceBindings.map((binding) => [binding.bindingId, binding] as const));
  return Object.freeze(narrative.narrativeStatements.map((statement) => {
    const classification = classifyStatement(statement, ruleById, bindingById);
    return Object.freeze({
      claimId: statement.statementId,
      order: statement.order,
      kind: statement.kind,
      text: statement.text,
      ...classification,
      factIds: factIdsForStatement(statement, narrative),
      ruleIds: Object.freeze([...statement.claimIds]),
      sourceBindingIds: Object.freeze([...statement.sourceBindingIds]),
      stabilityAssessmentIds: Object.freeze(statement.sensitivityScenarioIds.map((id) => `stability:${id}`)),
      conflictIds: Object.freeze([]),
      reviewStatus: "candidate_pending_expert_review" as const,
      expertTruthClaimed: false as const,
      scientificValidityClaimed: false as const,
      formalActivationAllowed: false as const,
      result: null
    });
  }));
}

function buildStability(narrative: BaziStrengthEvidenceNarrativeResult): BaziInterpretationStability {
  const assessments = Object.freeze(narrative.scenarioComparisons.map((scenario) => Object.freeze({
    assessmentId: `stability:${scenario.scenarioId}`,
    order: scenario.order,
    status: scenario.crossesBand || scenario.crossesDirection ? "candidate_dependent" as const : "stable" as const,
    affectedFactIds: Object.freeze([...scenario.evidenceItemIds]),
    note: scenario.directStatement
  })));
  const candidateDependent = assessments.some((assessment) => assessment.status === "candidate_dependent");
  return Object.freeze({
    coverage: "declared_strength_rule_scenarios_only" as const,
    overallStatus: candidateDependent ? "candidate_dependent" as const : "unknown" as const,
    ruleScenarioStatus: candidateDependent ? "candidate_dependent" as const : "stable" as const,
    timePerturbationStatus: "not_assessed" as const,
    assessments,
    note: "本层只覆盖已声明的旺衰工程规则扰动；尚未执行 ±1/±5/±15 分钟、时辰边界、DST 或节气边界扰动，因此不得给整盘稳定性分数。"
  });
}

function buildCounts(
  inputAssumptions: readonly InterpretationInputAssumption[],
  sources: readonly BaziStrengthClaimSource[],
  sourceBindings: readonly BaziStrengthClaimSourceBinding[],
  rules: readonly BaziInterpretationEvidenceRule[],
  facts: readonly BaziInterpretationEvidenceFact[],
  claims: readonly BaziInterpretedClaim[]
): BaziInterpretationEvidenceCounts {
  const classificationCount = (classification: InterpretationEvidenceClassification) =>
    claims.filter((claim) => claim.classification === classification).length;
  return Object.freeze({
    inputAssumptions: inputAssumptions.length,
    sources: sources.length,
    sourceBindings: sourceBindings.length,
    rules: rules.length,
    facts: facts.length,
    claims: claims.length,
    conflicts: 0,
    supported: classificationCount("supported"),
    inferred: classificationCount("inferred"),
    unsupported: classificationCount("unsupported"),
    contradicted: classificationCount("contradicted"),
    advisory: classificationCount("advisory"),
    blocked: classificationCount("blocked")
  });
}

function assertUniqueOrdered(
  values: readonly { order: number }[],
  ids: readonly string[],
  subject: string
): void {
  if (values.length !== ids.length || new Set(ids).size !== ids.length) {
    throw new Error(`${subject} ID 必须完整且唯一`);
  }
  if (values.some((value, index) => value.order !== index + 1)) {
    throw new Error(`${subject} 顺序必须从 1 连续递增`);
  }
}

async function assertBuiltBaziInterpretationEvidenceEnvelope(
  raw: unknown
): Promise<BaziInterpretationEvidenceEnvelope> {
  const envelope = parseEnvelopeRuntimeShape(raw);
  if (!sameCanonical(envelope.profile, BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE)) {
    throw new Error("八字解读证据 Envelope profile 不匹配");
  }
  if (envelope.artifact.system !== "bazi"
    || !/^[a-f0-9]{64}$/u.test(envelope.artifact.artifactDigest)
    || !/^[a-f0-9]{64}$/u.test(envelope.artifact.factsProjectionDigest)
    || !/^[a-f0-9]{64}$/u.test(envelope.artifact.ruleProfileDigest)) {
    throw new Error("八字解读证据 Envelope 工件绑定无效");
  }
  assertUniqueOrdered(envelope.inputAssumptions, envelope.inputAssumptions.map((item) => item.assumptionId), "输入假设");
  assertUniqueOrdered(envelope.sources, envelope.sources.map((item) => item.sourceId), "来源");
  assertUniqueOrdered(envelope.sourceBindings, envelope.sourceBindings.map((item) => item.bindingId), "来源定位");
  assertUniqueOrdered(envelope.rules, envelope.rules.map((item) => item.ruleId), "规则");
  assertUniqueOrdered(envelope.facts, envelope.facts.map((item) => item.factId), "事实");
  assertUniqueOrdered(envelope.claims, envelope.claims.map((item) => item.claimId), "解读主张");
  assertUniqueOrdered(envelope.stability.assessments, envelope.stability.assessments.map((item) => item.assessmentId), "稳定性评估");

  const expectedAssumptionIds = [
    "input:calendar",
    "input:birth-time-precision",
    "input:location-precision",
    "input:time-zone",
    "input:dst-resolution",
    "input:solar-time-policy",
    "input:calendar-boundaries",
    "input:lunar-leap-month",
    "input:hour-inclusion",
    "input:rule-profile-review"
  ];
  if (!sameCanonical(envelope.inputAssumptions.map((item) => item.assumptionId), expectedAssumptionIds)) {
    throw new Error("输入假设集合与当前 Envelope 契约不一致");
  }
  if (!sameCanonical(envelope.sources, BAZI_STRENGTH_CLAIM_REGISTRY.sources)
    || !sameCanonical(envelope.sourceBindings, BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings)
    || !sameCanonical(envelope.rules, buildRules(BAZI_STRENGTH_CLAIM_REGISTRY.claims))) {
    throw new Error("来源、定位或规则快照与当前注册表不一致");
  }

  const sourceIds = new Set(envelope.sources.map((source) => source.sourceId));
  const bindingById = new Map(envelope.sourceBindings.map((binding) => [binding.bindingId, binding] as const));
  const ruleById = new Map(envelope.rules.map((rule) => [rule.ruleId, rule] as const));
  const factById = new Map(envelope.facts.map((fact) => [fact.factId, fact] as const));
  const stabilityIds = new Set(envelope.stability.assessments.map((item) => item.assessmentId));
  for (const binding of envelope.sourceBindings) {
    if (!sourceIds.has(binding.sourceId)) throw new Error(`来源定位引用未知来源：${binding.bindingId}`);
  }
  for (const rule of envelope.rules) {
    if (!rule.sourceBindingIds.length || rule.sourceBindingIds.some((id) => !bindingById.has(id))) {
      throw new Error(`规则来源定位无法解析：${rule.ruleId}`);
    }
    if (rule.expertTruthClaimed !== false || rule.scientificValidityClaimed !== false
      || rule.formalActivationAllowed !== false || rule.result !== null) {
      throw new Error(`规则正式结论边界未关闭：${rule.ruleId}`);
    }
  }
  for (const fact of envelope.facts) {
    if (!fact.ruleIds.length || fact.ruleIds.some((id) => !ruleById.has(id))) {
      throw new Error(`事实规则引用无法解析：${fact.factId}`);
    }
    if (fact.status === "withheld" && fact.value !== null) {
      throw new Error(`withheld 事实不得携带事实值：${fact.factId}`);
    }
    if (fact.status === "confirmed" && !fact.value) {
      throw new Error(`confirmed 事实必须携带可见值：${fact.factId}`);
    }
    if (fact.expertTruthClaimed !== false || fact.scientificValidityClaimed !== false || fact.result !== null) {
      throw new Error(`事实结论边界未关闭：${fact.factId}`);
    }
  }
  for (const claim of envelope.claims) {
    if (claim.ruleIds.some((id) => !ruleById.has(id))
      || claim.factIds.some((id) => !factById.has(id))
      || claim.sourceBindingIds.some((id) => !bindingById.has(id))
      || claim.stabilityAssessmentIds.some((id) => !stabilityIds.has(id))) {
      throw new Error(`解读主张引用无法解析：${claim.claimId}`);
    }
    if (claim.classification === "supported") {
      if (!claim.factIds.length || !claim.ruleIds.length || !claim.sourceBindingIds.length
        || claim.missingEvidence.length || claim.conflictIds.length
        || claim.displayStatus !== "visible_with_evidence"
        || claim.ruleIds.some((id) => ruleById.get(id)?.status === "blocked")
        || claim.sourceBindingIds.some((id) => bindingById.get(id)?.exactLocator.verificationStatus !== "verified")) {
        throw new Error(`supported 主张没有形成完整可解析的工程证据链：${claim.claimId}`);
      }
    } else if (claim.classification === "inferred") {
      if (!claim.factIds.length || claim.displayStatus !== "visible_with_caveat") {
        throw new Error(`inferred 主张必须绑定事实并显式降级：${claim.claimId}`);
      }
    } else if (claim.classification === "unsupported" || claim.classification === "blocked") {
      if (!claim.missingEvidence.length || claim.displayStatus !== "withheld") {
        throw new Error(`${claim.classification} 主张必须列出缺失证据并 withheld：${claim.claimId}`);
      }
    } else if (claim.classification === "contradicted") {
      if (!claim.conflictIds.length || claim.displayStatus !== "withheld") {
        throw new Error(`contradicted 主张必须绑定冲突并 withheld：${claim.claimId}`);
      }
    } else if (claim.classification === "advisory" && claim.displayStatus !== "visible_with_caveat") {
      throw new Error(`advisory 主张必须显式降级：${claim.claimId}`);
    }
    if (claim.expertTruthClaimed !== false || claim.scientificValidityClaimed !== false
      || claim.formalActivationAllowed !== false || claim.result !== null) {
      throw new Error(`解读主张正式结论边界未关闭：${claim.claimId}`);
    }
  }

  const expectedCounts = buildCounts(
    envelope.inputAssumptions,
    envelope.sources,
    envelope.sourceBindings,
    envelope.rules,
    envelope.facts,
    envelope.claims
  );
  if (!sameCanonical(envelope.counts, expectedCounts) || envelope.conflicts.length !== 0) {
    throw new Error("八字解读证据 Envelope 计数或冲突边界不一致");
  }
  if (envelope.stability.coverage !== "declared_strength_rule_scenarios_only"
    || envelope.stability.timePerturbationStatus !== "not_assessed") {
    throw new Error("稳定性覆盖不得冒充出生时间扰动评估");
  }
  if (envelope.boundary.referenceResolutionEstablishesSemanticTruth !== false
    || envelope.boundary.modelMayRecalculateFacts !== false
    || envelope.boundary.expertTruthClaimed !== false
    || envelope.boundary.scientificValidityClaimed !== false
    || envelope.boundary.formalActivationAllowed !== false
    || envelope.boundary.publicReleaseAuthorized !== false
    || envelope.boundary.rawBirthInputCopied !== false
    || envelope.boundary.containsDerivedSensitiveChartData !== true
    || envelope.boundary.networkTransmissionPerformed !== false
    || envelope.boundary.networkTransmissionAuthorized !== false
    || envelope.boundary.chartOrStorageMutationPerformed !== false
    || envelope.boundary.overallGoodBad !== null
    || envelope.boundary.usefulGod !== null
    || envelope.boundary.eventOutcome !== null
    || envelope.boundary.result !== null) {
    throw new Error("八字解读证据 Envelope 安全边界未关闭");
  }
  if (envelope.integrity.hashAlgorithm !== "SHA-256"
    || envelope.integrity.authenticityClaimed !== false
    || !/^[a-f0-9]{64}$/u.test(envelope.integrity.payloadSha256)
    || await sha256Hex(envelopePayload(envelope)) !== envelope.integrity.payloadSha256) {
    throw new Error("八字解读证据 Envelope payload 摘要不匹配");
  }
  return envelope;
}

export async function buildBaziInterpretationEvidenceEnvelope(
  input: BuildBaziInterpretationEvidenceEnvelopeInput
): Promise<BaziInterpretationEvidenceEnvelope> {
  const inputSnapshot = snapshotBuildInput(input);
  const includeHour = inputSnapshot.includeHour;
  const shapedRevision = storedRevisionRecordSchema.safeParse(inputSnapshot.revision);
  if (!shapedRevision.success) {
    throw new Error("当前 Revision 没有通过完整运行时契约，解读证据 Envelope 保持关闭", {
      cause: shapedRevision.error
    });
  }
  const exactTime = shapedRevision.data.input.timePrecision === "exact_second"
    || shapedRevision.data.input.timePrecision === "exact_minute";
  if (includeHour && !exactTime) {
    throw new Error("只有精确到分或秒的 Revision 才能把时柱纳入解读证据 Envelope");
  }
  let revision: RevisionRecord;
  try {
    revision = await verifyRevisionRecordIntegrity(shapedRevision.data);
  } catch (cause) {
    throw new Error("当前 Revision 没有通过完整运行时契约，解读证据 Envelope 保持关闭", {
      cause
    });
  }
  if (revision.timeCalibration.dstStatus === "unresolved") {
    throw new Error("DST 歧义尚未解决，解读证据 Envelope 保持关闭");
  }
  const narrative = await buildBaziStrengthEvidenceNarrative({
    facts: revision.facts,
    includeHour,
    interpretation: inputSnapshot.interpretation,
    strengthSensitivity: inputSnapshot.strengthSensitivity
  });
  validateBaziStrengthEvidenceNarrative(narrative);

  const inputAssumptions = buildInputAssumptions(revision, includeHour);
  const sources = canonicalClone(narrative.sources);
  const sourceBindings = canonicalClone(narrative.sourceBindings);
  const rules = buildRules(narrative.claims);
  const facts = buildFacts(narrative.evidenceItems);
  const claims = buildClaims(narrative, rules);
  const stability = buildStability(narrative);
  const payload: BaziInterpretationEvidenceEnvelopePayload = {
    profile: BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE,
    artifact: {
      system: "bazi",
      revisionId: revision.id,
      revisionNumber: revision.revisionNumber,
      artifactDigest: revision.manifest.resultHash,
      factsProjectionVersion: narrative.bindings.factsProjectionVersion,
      factsProjectionDigest: narrative.bindings.factsProjectionSha256,
      ruleProfileId: revision.ruleProfile.profileId,
      ruleProfileVersion: revision.ruleProfile.profileVersion,
      ruleProfileDigest: revision.manifest.ruleProfileDigest,
      ruleProfileStatus: revision.ruleProfile.status,
      engine: {
        id: revision.manifest.engine.name,
        version: revision.manifest.engine.version,
        upstreamId: revision.manifest.engine.upstreamName,
        upstreamVersion: revision.manifest.engine.upstreamVersion
      },
      tzdbVersion: revision.manifest.tzdbVersion
    },
    inputAssumptions,
    sources,
    sourceBindings,
    rules,
    facts,
    claims,
    conflicts: Object.freeze([]),
    stability,
    counts: buildCounts(inputAssumptions, sources, sourceBindings, rules, facts, claims),
    boundary: {
      referenceResolutionEstablishesSemanticTruth: false,
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
  const envelope: BaziInterpretationEvidenceEnvelope = {
    ...payload,
    integrity: {
      hashAlgorithm: "SHA-256",
      payloadSha256: await sha256Hex(payload),
      authenticityClaimed: false
    }
  };
  const frozen = deepFreeze(canonicalClone(envelope));
  return await assertBuiltBaziInterpretationEvidenceEnvelope(frozen);
}

export async function validateBaziInterpretationEvidenceEnvelope(
  raw: unknown,
  expectedInput: BuildBaziInterpretationEvidenceEnvelopeInput
): Promise<BaziInterpretationEvidenceEnvelope> {
  const expectedInputSnapshot = snapshotBuildInput(expectedInput);
  const candidateSnapshot = deepFreeze(canonicalClone(parseEnvelopeRuntimeShape(raw)));
  const candidate = await assertBuiltBaziInterpretationEvidenceEnvelope(candidateSnapshot);
  const expected = await buildBaziInterpretationEvidenceEnvelope(expectedInputSnapshot);
  if (!sameCanonical(candidate, expected)) {
    throw new Error("八字解读证据 Envelope 与当前 Revision 和派生输入的规范重建结果不一致");
  }
  return deepFreeze(canonicalClone(candidate));
}
