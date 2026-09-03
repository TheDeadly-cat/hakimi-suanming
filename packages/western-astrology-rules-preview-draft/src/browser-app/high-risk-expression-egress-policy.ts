/*
 * First-party Western candidate-text egress guard.
 *
 * This module is deliberately isolated from every production package. It is a
 * conservative lexical engineering barrier for the Western browser preview;
 * it is not a semantic classifier, expert approval, domain truth, or a formal
 * admission policy.
 */

const NATIVE_OBJECT = Object;
const NATIVE_ARRAY = Array;
const NATIVE_ERROR = Error;
const NATIVE_STRING = String;
const NATIVE_REGEXP = RegExp;
const NATIVE_WEAK_SET = WeakSet;
const NATIVE_REFLECT = Reflect;

const OBJECT_FREEZE = NATIVE_OBJECT.freeze;
const ARRAY_IS_ARRAY = NATIVE_ARRAY.isArray;
const ARRAY_PUSH = NATIVE_ARRAY.prototype.push;
const ARRAY_JOIN = NATIVE_ARRAY.prototype.join;
const REFLECT_APPLY = NATIVE_REFLECT.apply;
const STRING_NORMALIZE = NATIVE_STRING.prototype.normalize;
const STRING_TO_LOWER_CASE = NATIVE_STRING.prototype.toLowerCase;
const STRING_CHAR_CODE_AT = NATIVE_STRING.prototype.charCodeAt;
const STRING_CODE_POINT_AT = NATIVE_STRING.prototype.codePointAt;
const STRING_FROM_CODE_POINT = NATIVE_STRING.fromCodePoint;
const STRING_INCLUDES = NATIVE_STRING.prototype.includes;
const STRING_SLICE = NATIVE_STRING.prototype.slice;
const REGEXP_TEST = NATIVE_REGEXP.prototype.test;
const WEAK_SET_ADD = NATIVE_WEAK_SET.prototype.add;
const WEAK_SET_HAS = NATIVE_WEAK_SET.prototype.has;

const OBFUSCATING_UNICODE_CHARACTER = new NATIVE_REGEXP(
  "[\\p{Default_Ignorable_Code_Point}\\p{M}\\p{P}\\p{S}\\p{Z}\\p{C}]",
  "u"
);
const NORMALIZATION_CHUNK_CODE_UNITS = 4_096;
const MAX_DOM_TEXT_CODE_UNITS = 12_000;
const MAX_TEMPLATE_TEXT_CODE_UNITS = 2 * 1_024 * 1_024;
const MAX_NORMALIZED_TEMPLATE_RISK_CODE_UNITS = 512 * 1_024;

export const WESTERN_HIGH_RISK_EXPRESSION_POLICY_ID =
  "hakimi.western.high-risk-expression-egress-policy/0.1.0" as const;
export const WESTERN_HIGH_RISK_EXPRESSION_POLICY_VERSION = "0.1.0" as const;
export const WESTERN_HIGH_RISK_EGRESS_REQUEST_VERSION =
  "hakimi.western.high-risk-egress-request/0.1.0" as const;
export const WESTERN_HIGH_RISK_EGRESS_RECEIPT_VERSION =
  "hakimi.western.high-risk-egress-receipt/0.1.0" as const;
export const WESTERN_HIGH_RISK_EGRESS_DECISION_VERSION =
  "hakimi.western.high-risk-egress-decision/0.1.0" as const;
export const WESTERN_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK =
  "该候选触及高风险或确定性个人结果边界；当前只保留可核对的结构事实，不显示这段解释性文字。" as const;

export const WESTERN_HIGH_RISK_EGRESS_SURFACE_IDS = OBJECT_FREEZE([
  "western.preview.candidate-interpretation",
  "western.preview.expert-review-question",
  "western.preview.imported-review-feedback",
  "western.preview.primitive-review-template-download",
  "western.preview.dynamic-review-template-download"
] as const);

export const WESTERN_HIGH_RISK_CATEGORY_IDS = OBJECT_FREEZE([
  "deterministic_personal_outcome",
  "health_medical_reproductive",
  "legal_criminal",
  "financial_investment_gambling",
  "death_disaster_violence_self_harm",
  "relationships_family",
  "employment_education_social_identity",
  "mental_health_personality_diagnosis"
] as const);

export type WesternHighRiskEgressSurfaceId =
  typeof WESTERN_HIGH_RISK_EGRESS_SURFACE_IDS[number];
export type WesternHighRiskCategoryId =
  typeof WESTERN_HIGH_RISK_CATEGORY_IDS[number];
export type WesternHighRiskEgressAction =
  "pass_through" | "neutralized" | "failed_closed";

interface RiskCategoryDefinition {
  readonly categoryId: WesternHighRiskCategoryId;
  readonly label: string;
  readonly patterns: readonly string[];
}

const RISK_CATEGORY_DEFINITIONS: readonly RiskCategoryDefinition[] = OBJECT_FREEZE([
  OBJECT_FREEZE({
    categoryId: "deterministic_personal_outcome",
    label: "确定性个人结果",
    patterns: OBJECT_FREEZE([
      "一定会", "必然会", "注定会", "保证会", "绝对会", "肯定会",
      "命中注定", "无法避免", "大吉", "大凶"
    ])
  }),
  OBJECT_FREEZE({
    categoryId: "health_medical_reproductive",
    label: "健康医疗与生育",
    patterns: OBJECT_FREEZE([
      "会得病", "会患", "罹患", "身患重病", "寿命为", "活到几岁",
      "必须停药", "应该停药", "不用就医", "一定怀孕", "必然怀孕",
      "会流产", "生育结果"
    ])
  }),
  OBJECT_FREEZE({
    categoryId: "legal_criminal",
    label: "法律与刑事结果",
    patterns: OBJECT_FREEZE([
      "必胜诉", "必败诉", "一定胜诉", "一定败诉", "会坐牢", "牢狱之灾",
      "身陷囹圄", "逃避调查", "规避执法"
    ])
  }),
  OBJECT_FREEZE({
    categoryId: "financial_investment_gambling",
    label: "财务投资与赌博结果",
    patterns: OBJECT_FREEZE([
      "一定发财", "必然发财", "一定破财", "必然破财", "收益保证",
      "保证收益", "应该买入", "应该卖出", "彩票号", "下注结果",
      "财富多寡", "血本无归"
    ])
  }),
  OBJECT_FREEZE({
    categoryId: "death_disaster_violence_self_harm",
    label: "生死灾祸暴力与自伤",
    patterns: OBJECT_FREEZE([
      "会死亡", "死亡时间", "血光之灾", "会有车祸", "必有灾祸",
      "自杀", "自残", "伤害自己", "杀人"
    ])
  }),
  OBJECT_FREEZE({
    categoryId: "relationships_family",
    label: "婚恋与家庭结果",
    patterns: OBJECT_FREEZE([
      "注定离婚", "一定离婚", "必定分手", "一定出轨", "必定出轨",
      "克夫", "克妻", "婚期是", "一定结婚"
    ])
  }),
  OBJECT_FREEZE({
    categoryId: "employment_education_social_identity",
    label: "职业教育与社会身份结果",
    patterns: OBJECT_FREEZE([
      "一定升职", "必然升职", "会失业", "一定失业", "适合从事",
      "只能从事", "保证录取", "一定录取", "身份贵贱", "性别刻板"
    ])
  }),
  OBJECT_FREEZE({
    categoryId: "mental_health_personality_diagnosis",
    label: "心理健康与人格诊断",
    patterns: OBJECT_FREEZE([
      "是精神病", "患精神病", "诊断为人格障碍", "断定人格障碍",
      "是人格障碍", "诊断为抑郁症", "就是抑郁症", "诊断为焦虑症",
      "就是焦虑症", "人格定型", "心理诊断结果"
    ])
  })
]);

export interface WesternHighRiskEgressRequest {
  readonly requestVersion: typeof WESTERN_HIGH_RISK_EGRESS_REQUEST_VERSION;
  readonly policyId: typeof WESTERN_HIGH_RISK_EXPRESSION_POLICY_ID;
  readonly surfaceId: WesternHighRiskEgressSurfaceId;
  readonly candidateText: string;
  readonly result: null;
  readonly eventOutcome: null;
  readonly goodBadOrientation: null;
  readonly scoringAllowed: false;
  readonly deterministicPersonalOutcomeAllowed: false;
  readonly expertTruthClaimed: false;
  readonly formalActivationAllowed: false;
  readonly productionEligible: false;
}

export interface WesternHighRiskEgressReceipt {
  readonly receiptVersion: typeof WESTERN_HIGH_RISK_EGRESS_RECEIPT_VERSION;
  readonly policyId: typeof WESTERN_HIGH_RISK_EXPRESSION_POLICY_ID;
  readonly policyVersion: typeof WESTERN_HIGH_RISK_EXPRESSION_POLICY_VERSION;
  readonly surfaceId: WesternHighRiskEgressSurfaceId;
  readonly action: WesternHighRiskEgressAction;
  readonly triggeredRiskCategoryIds: readonly WesternHighRiskCategoryId[];
  readonly candidateTextIncluded: false;
  readonly candidateTextDigestIncluded: false;
  readonly birthDataIncluded: false;
  readonly personalDerivedDigestIncluded: false;
  readonly sourceBodyIncluded: false;
  readonly networkTransmissionPerformed: false;
  readonly storageMutationPerformed: false;
  readonly mutationEpochAvailable: false;
  readonly mutationEpochReceipt: null;
  readonly lexicalCoverageComplete: false;
  readonly semanticSafetyEstablished: false;
  readonly surfaceCallerAuthenticityEstablished: false;
  readonly registeredSurfaceCallGraphClosureEstablished: false;
  readonly contentTruthEstablished: false;
  readonly expertTruthEstablished: false;
  readonly expertIdentityCredentialsIndependenceEstablished: false;
  readonly independentExpertReviewsVerified: 0;
  readonly expertClaimsAuthorized: false;
  readonly rightsLegalConclusionEstablished: false;
  readonly formalAdmissionAuthorized: false;
  readonly releaseEvidenceComplete: false;
  readonly releaseReady: false;
  readonly publicDeploymentAuthorized: false;
  readonly publicReleaseAuthorized: false;
  readonly productionEligible: false;
  readonly receiptDigestIsDigitalSignature: false;
}

export interface WesternHighRiskEgressDecision {
  readonly decisionVersion: typeof WESTERN_HIGH_RISK_EGRESS_DECISION_VERSION;
  readonly surfaceId: WesternHighRiskEgressSurfaceId;
  readonly action: WesternHighRiskEgressAction;
  readonly displayText: string;
  readonly receipt: WesternHighRiskEgressReceipt;
}

export class WesternHighRiskEgressError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WesternHighRiskEgressError";
    this.code = code;
  }
}

const REQUEST_BRAND = new NATIVE_WEAK_SET<object>();
const RECEIPT_BRAND = new NATIVE_WEAK_SET<object>();
const DECISION_BRAND = new NATIVE_WEAK_SET<object>();

function hasSurfaceId(value: string): value is WesternHighRiskEgressSurfaceId {
  for (let index = 0; index < WESTERN_HIGH_RISK_EGRESS_SURFACE_IDS.length; index += 1) {
    if (WESTERN_HIGH_RISK_EGRESS_SURFACE_IDS[index] === value) return true;
  }
  return false;
}

function surfaceRejectsWholePayload(surfaceId: WesternHighRiskEgressSurfaceId): boolean {
  return surfaceId === "western.preview.primitive-review-template-download"
    || surfaceId === "western.preview.dynamic-review-template-download";
}

function assertWellFormedUtf16(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [index]) as number;
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [index + 1]) as number;
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new WesternHighRiskEgressError("ILL_FORMED_TEXT", "候选文本不是完整 UTF-16。 ");
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new WesternHighRiskEgressError("ILL_FORMED_TEXT", "候选文本不是完整 UTF-16。 ");
    }
  }
}

function skippedCodePoint(codePoint: number): boolean {
  return codePoint <= 0x20
    || (codePoint >= 0x21 && codePoint <= 0x2f)
    || (codePoint >= 0x3a && codePoint <= 0x40)
    || (codePoint >= 0x5b && codePoint <= 0x60)
    || (codePoint >= 0x7b && codePoint <= 0x7e)
    || codePoint === 0x00a0
    || codePoint === 0x00ad
    || codePoint === 0x034f
    || codePoint === 0x061c
    || codePoint === 0x1680
    || (codePoint >= 0x180b && codePoint <= 0x180f)
    || (codePoint >= 0x2000 && codePoint <= 0x200f)
    || (codePoint >= 0x2028 && codePoint <= 0x202f)
    || (codePoint >= 0x205f && codePoint <= 0x206f)
    || (codePoint >= 0x3000 && codePoint <= 0x303f)
    || codePoint === 0x3164
    || (codePoint >= 0xfe00 && codePoint <= 0xfe0f)
    || codePoint === 0xfeff
    || codePoint === 0xffa0
    || (codePoint >= 0xe0100 && codePoint <= 0xe01ef);
}

function canonicalRiskCharacter(character: string): string {
  switch (character) {
    case "會": return "会";
    case "發": return "发";
    case "財": return "财";
    case "絕": return "绝";
    case "對": return "对";
    case "證": return "证";
    case "須": return "须";
    case "歲": return "岁";
    case "無": return "无";
    case "應": return "应";
    case "該": return "该";
    case "懷": return "怀";
    case "產": return "产";
    case "壽": return "寿";
    case "藥": return "药";
    case "醫": return "医";
    case "勝": return "胜";
    case "敗": return "败";
    case "訴": return "诉";
    case "調": return "调";
    case "規": return "规";
    case "執": return "执";
    case "獄": return "狱";
    case "災": return "灾";
    case "禍": return "祸";
    case "買": return "买";
    case "賣": return "卖";
    case "號": return "号";
    case "結": return "结";
    case "歸": return "归";
    case "傷": return "伤";
    case "殘": return "残";
    case "殺": return "杀";
    case "車": return "车";
    case "離": return "离";
    case "軌": return "轨";
    case "職": return "职";
    case "業": return "业";
    case "適": return "适";
    case "從": return "从";
    case "錄": return "录";
    case "貴": return "贵";
    case "賤": return "贱";
    case "別": return "别";
    case "幾": return "几";
    case "間": return "间";
    case "時": return "时";
    case "診": return "诊";
    case "斷": return "断";
    case "礙": return "碍";
    case "為": return "为";
    case "鬱": return "郁";
    case "慮": return "虑";
    default: return character;
  }
}

function normalizedRiskText(value: string, maxNormalizedCodeUnits: number): string {
  const outputChunks: string[] = [];
  let outputLength = 0;
  let sourceOffset = 0;
  while (sourceOffset < value.length) {
    let chunkEnd = sourceOffset + NORMALIZATION_CHUNK_CODE_UNITS;
    if (chunkEnd > value.length) chunkEnd = value.length;
    if (chunkEnd < value.length) {
      const finalCodeUnit = REFLECT_APPLY(STRING_CHAR_CODE_AT, value, [chunkEnd - 1]) as number;
      if (finalCodeUnit >= 0xd800 && finalCodeUnit <= 0xdbff) chunkEnd -= 1;
    }
    const sourceChunk = REFLECT_APPLY(STRING_SLICE, value, [sourceOffset, chunkEnd]) as string;
    const normalized = REFLECT_APPLY(STRING_NORMALIZE, sourceChunk, ["NFKC"]) as string;
    let outputChunk = "";
    for (let index = 0; index < normalized.length; index += 1) {
      const codePoint = REFLECT_APPLY(STRING_CODE_POINT_AT, normalized, [index]) as number | undefined;
      if (codePoint === undefined) throw new NATIVE_ERROR("normalized code point missing");
      if (codePoint > 0xffff) index += 1;
      if (skippedCodePoint(codePoint)) continue;
      const character = REFLECT_APPLY(STRING_FROM_CODE_POINT, NATIVE_STRING, [codePoint]) as string;
      if (REFLECT_APPLY(REGEXP_TEST, OBFUSCATING_UNICODE_CHARACTER, [character]) as boolean) continue;
      const lowerCaseCharacter = REFLECT_APPLY(STRING_TO_LOWER_CASE, character, []) as string;
      const canonicalCharacter = canonicalRiskCharacter(lowerCaseCharacter);
      outputChunk += canonicalCharacter;
      if (outputLength + outputChunk.length > maxNormalizedCodeUnits) {
        throw new WesternHighRiskEgressError(
          "NORMALIZED_TEXT_TOO_LARGE",
          "候选文本归一化后超过隔离出口上限。 "
        );
      }
    }
    REFLECT_APPLY(ARRAY_PUSH, outputChunks, [outputChunk]);
    outputLength += outputChunk.length;
    sourceOffset = chunkEnd;
  }
  return REFLECT_APPLY(ARRAY_JOIN, outputChunks, [""]) as string;
}

function triggeredCategories(
  candidateText: string,
  maxNormalizedCodeUnits: number
): readonly WesternHighRiskCategoryId[] {
  const normalized = normalizedRiskText(candidateText, maxNormalizedCodeUnits);
  const triggered: WesternHighRiskCategoryId[] = [];
  for (let categoryIndex = 0; categoryIndex < RISK_CATEGORY_DEFINITIONS.length; categoryIndex += 1) {
    const category = RISK_CATEGORY_DEFINITIONS[categoryIndex];
    if (!category) throw new NATIVE_ERROR("risk category missing");
    let matched = false;
    for (let patternIndex = 0; patternIndex < category.patterns.length; patternIndex += 1) {
      const pattern = category.patterns[patternIndex];
      if (pattern === undefined) throw new NATIVE_ERROR("risk pattern missing");
      if (REFLECT_APPLY(STRING_INCLUDES, normalized, [
        normalizedRiskText(pattern, MAX_DOM_TEXT_CODE_UNITS)
      ]) as boolean) {
        matched = true;
        break;
      }
    }
    if (matched) triggered.push(category.categoryId);
  }
  return OBJECT_FREEZE(triggered);
}

function addBrand(brand: WeakSet<object>, value: object): void {
  REFLECT_APPLY(WEAK_SET_ADD, brand, [value]);
}

function hasBrand(brand: WeakSet<object>, value: unknown): value is object {
  return (typeof value === "object" && value !== null)
    ? REFLECT_APPLY(WEAK_SET_HAS, brand, [value]) as boolean
    : false;
}

export function createWesternHighRiskEgressRequest(
  surfaceId: WesternHighRiskEgressSurfaceId,
  candidateText: string
): WesternHighRiskEgressRequest {
  if (typeof surfaceId !== "string" || !hasSurfaceId(surfaceId)) {
    throw new WesternHighRiskEgressError(
      "UNREGISTERED_EGRESS_SURFACE",
      "西洋候选文本出口没有登记，已拒绝显示。"
    );
  }
  if (typeof candidateText !== "string") {
    throw new WesternHighRiskEgressError("TEXT_TYPE_REJECTED", "候选文本必须是原始字符串。 ");
  }
  const maxCodeUnits = surfaceRejectsWholePayload(surfaceId)
    ? MAX_TEMPLATE_TEXT_CODE_UNITS
    : MAX_DOM_TEXT_CODE_UNITS;
  if (candidateText.length > maxCodeUnits) {
    throw new WesternHighRiskEgressError("TEXT_TOO_LARGE", "候选文本超过隔离出口上限。 ");
  }
  assertWellFormedUtf16(candidateText);
  const request = OBJECT_FREEZE({
    requestVersion: WESTERN_HIGH_RISK_EGRESS_REQUEST_VERSION,
    policyId: WESTERN_HIGH_RISK_EXPRESSION_POLICY_ID,
    surfaceId,
    candidateText,
    result: null,
    eventOutcome: null,
    goodBadOrientation: null,
    scoringAllowed: false,
    deterministicPersonalOutcomeAllowed: false,
    expertTruthClaimed: false,
    formalActivationAllowed: false,
    productionEligible: false
  });
  addBrand(REQUEST_BRAND, request);
  return request;
}

export function isWesternHighRiskEgressRequest(
  value: unknown
): value is WesternHighRiskEgressRequest {
  return hasBrand(REQUEST_BRAND, value);
}

export function isWesternHighRiskEgressReceipt(
  value: unknown
): value is WesternHighRiskEgressReceipt {
  return hasBrand(RECEIPT_BRAND, value);
}

export function isWesternHighRiskEgressDecision(
  value: unknown
): value is WesternHighRiskEgressDecision {
  return hasBrand(DECISION_BRAND, value);
}

export function evaluateWesternHighRiskEgressRequest(
  request: WesternHighRiskEgressRequest
): WesternHighRiskEgressDecision {
  if (!isWesternHighRiskEgressRequest(request)) {
    throw new WesternHighRiskEgressError("UNBRANDED_REQUEST", "西洋候选文本出口请求未通过内部登记。 ");
  }
  const categories = triggeredCategories(
    request.candidateText,
    surfaceRejectsWholePayload(request.surfaceId)
      ? MAX_NORMALIZED_TEMPLATE_RISK_CODE_UNITS
      : MAX_DOM_TEXT_CODE_UNITS
  );
  const action: WesternHighRiskEgressAction = categories.length === 0
    ? "pass_through"
    : surfaceRejectsWholePayload(request.surfaceId)
      ? "failed_closed"
      : "neutralized";
  const receipt = OBJECT_FREEZE({
    receiptVersion: WESTERN_HIGH_RISK_EGRESS_RECEIPT_VERSION,
    policyId: WESTERN_HIGH_RISK_EXPRESSION_POLICY_ID,
    policyVersion: WESTERN_HIGH_RISK_EXPRESSION_POLICY_VERSION,
    surfaceId: request.surfaceId,
    action,
    triggeredRiskCategoryIds: categories,
    candidateTextIncluded: false,
    candidateTextDigestIncluded: false,
    birthDataIncluded: false,
    personalDerivedDigestIncluded: false,
    sourceBodyIncluded: false,
    networkTransmissionPerformed: false,
    storageMutationPerformed: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    lexicalCoverageComplete: false,
    semanticSafetyEstablished: false,
    surfaceCallerAuthenticityEstablished: false,
    registeredSurfaceCallGraphClosureEstablished: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    expertIdentityCredentialsIndependenceEstablished: false,
    independentExpertReviewsVerified: 0,
    expertClaimsAuthorized: false,
    rightsLegalConclusionEstablished: false,
    formalAdmissionAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    productionEligible: false,
    receiptDigestIsDigitalSignature: false
  });
  addBrand(RECEIPT_BRAND, receipt);
  const decision = OBJECT_FREEZE({
    decisionVersion: WESTERN_HIGH_RISK_EGRESS_DECISION_VERSION,
    surfaceId: request.surfaceId,
    action,
    displayText: action === "pass_through"
      ? request.candidateText
      : WESTERN_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK,
    receipt
  });
  addBrand(DECISION_BRAND, decision);
  return decision;
}

export function screenWesternHighRiskEgressText(
  surfaceId: WesternHighRiskEgressSurfaceId,
  candidateText: string
): WesternHighRiskEgressDecision {
  return evaluateWesternHighRiskEgressRequest(
    createWesternHighRiskEgressRequest(surfaceId, candidateText)
  );
}

export function assertWesternHighRiskTemplateEgress(
  surfaceId:
    | "western.preview.primitive-review-template-download"
    | "western.preview.dynamic-review-template-download",
  serializedTemplate: string
): WesternHighRiskEgressReceipt {
  const decision = screenWesternHighRiskEgressText(surfaceId, serializedTemplate);
  if (decision.action !== "pass_through") {
    throw new WesternHighRiskEgressError(
      "RISKY_TEMPLATE_EGRESS_REJECTED",
      "西洋审稿模板触及已登记高风险表达，下载已失败关闭。"
    );
  }
  return decision.receipt;
}

export function getWesternHighRiskExpressionPolicySnapshot(): Readonly<{
  policyId: typeof WESTERN_HIGH_RISK_EXPRESSION_POLICY_ID;
  policyVersion: typeof WESTERN_HIGH_RISK_EXPRESSION_POLICY_VERSION;
  systemId: "western";
  policyStatus: "isolated_first_party_lexical_engineering_candidate";
  surfaceIds: typeof WESTERN_HIGH_RISK_EGRESS_SURFACE_IDS;
  riskCategories: readonly Readonly<{
    categoryId: WesternHighRiskCategoryId;
    label: string;
    patterns: readonly string[];
  }>[];
  lexicalCoverageComplete: false;
  semanticSafetyEstablished: false;
  expertApproved: false;
  formalHighRiskPolicyBound: false;
  productionEligible: false;
}> {
  return OBJECT_FREEZE({
    policyId: WESTERN_HIGH_RISK_EXPRESSION_POLICY_ID,
    policyVersion: WESTERN_HIGH_RISK_EXPRESSION_POLICY_VERSION,
    systemId: "western",
    policyStatus: "isolated_first_party_lexical_engineering_candidate",
    surfaceIds: WESTERN_HIGH_RISK_EGRESS_SURFACE_IDS,
    riskCategories: RISK_CATEGORY_DEFINITIONS,
    lexicalCoverageComplete: false,
    semanticSafetyEstablished: false,
    expertApproved: false,
    formalHighRiskPolicyBound: false,
    productionEligible: false
  });
}
