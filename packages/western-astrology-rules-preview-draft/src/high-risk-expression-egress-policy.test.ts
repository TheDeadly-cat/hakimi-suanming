import { describe, expect, it } from "vitest";
import {
  createWesternContentReviewFeedbackTemplate,
  serializeWesternContentReviewFeedbackTemplate
} from "./browser-app/content-review-feedback.ts";
import { buildWesternContentProjection } from "./browser-app/content-layer.ts";
import {
  createWesternDynamicContentReviewFeedbackTemplate,
  serializeWesternDynamicContentReviewFeedbackTemplate
} from "./browser-app/dynamic-content-review-feedback.ts";
import {
  WESTERN_HIGH_RISK_CATEGORY_IDS,
  WESTERN_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK,
  WESTERN_HIGH_RISK_EGRESS_SURFACE_IDS,
  WesternHighRiskEgressError,
  assertWesternHighRiskTemplateEgress,
  createWesternHighRiskEgressRequest,
  evaluateWesternHighRiskEgressRequest,
  getWesternHighRiskExpressionPolicySnapshot,
  isWesternHighRiskEgressDecision,
  isWesternHighRiskEgressReceipt,
  isWesternHighRiskEgressRequest,
  screenWesternHighRiskEgressText,
  type WesternHighRiskCategoryId,
  type WesternHighRiskEgressSurfaceId
} from "./browser-app/high-risk-expression-egress-policy.ts";
import {
  WESTERN_RULE_LAYER_REQUEST_VERSION,
  WESTERN_TROPICAL_ZODIAC_IDENTITY,
  runWesternRuleLayer
} from "./rule-layer-bridge.ts";

const CANDIDATE_SURFACE =
  "western.preview.candidate-interpretation" as const;

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    expect(descriptor).toBeDefined();
    if (descriptor && "value" in descriptor) expectDeepFrozen(descriptor.value, seen);
  }
}

describe("Western high-risk expression egress policy", () => {
  it("publishes an independent, zero-authority, incomplete lexical policy snapshot", () => {
    const snapshot = getWesternHighRiskExpressionPolicySnapshot();
    expect(snapshot).toMatchObject({
      policyId: "hakimi.western.high-risk-expression-egress-policy/0.1.0",
      policyVersion: "0.1.0",
      systemId: "western",
      policyStatus: "isolated_first_party_lexical_engineering_candidate",
      lexicalCoverageComplete: false,
      semanticSafetyEstablished: false,
      expertApproved: false,
      formalHighRiskPolicyBound: false,
      productionEligible: false
    });
    expect(snapshot.riskCategories).toHaveLength(8);
    expect(snapshot.surfaceIds).toEqual([
      "western.preview.candidate-interpretation",
      "western.preview.expert-review-question",
      "western.preview.imported-review-feedback",
      "western.preview.primitive-review-template-download",
      "western.preview.dynamic-review-template-download"
    ]);
    expect(WESTERN_HIGH_RISK_CATEGORY_IDS).toHaveLength(8);
    expect(WESTERN_HIGH_RISK_EGRESS_SURFACE_IDS).toHaveLength(5);
    expectDeepFrozen(snapshot);
  });

  it("passes neutral text and explicit non-claim language through exactly", () => {
    const text = "本候选只整理结构，不生成吉凶判断，也不提供医疗、法律或投资建议。";
    const request = createWesternHighRiskEgressRequest(CANDIDATE_SURFACE, text);
    const decision = evaluateWesternHighRiskEgressRequest(request);
    expect(decision.action).toBe("pass_through");
    expect(decision.displayText).toBe(text);
    expect(decision.receipt.triggeredRiskCategoryIds).toEqual([]);
    expect(isWesternHighRiskEgressRequest(request)).toBe(true);
    expect(isWesternHighRiskEgressReceipt(decision.receipt)).toBe(true);
    expect(isWesternHighRiskEgressDecision(decision)).toBe(true);
    expectDeepFrozen(request);
    expectDeepFrozen(decision);
  });

  it.each<readonly [WesternHighRiskCategoryId, string]>([
    ["deterministic_personal_outcome", "这个位置说明当事人注定会成功。"],
    ["health_medical_reproductive", "这个配置说明当事人会患癌症。"],
    ["legal_criminal", "这个组合说明官司必胜诉。"],
    ["financial_investment_gambling", "这个相位表示应该买入股票。"],
    ["death_disaster_violence_self_harm", "这个组合预示血光之灾。"],
    ["relationships_family", "这个落位说明当事人注定离婚。"],
    ["employment_education_social_identity", "这个配置说明只适合从事金融。"],
    ["mental_health_personality_diagnosis", "这个配置可以断定人格障碍。"]
  ])("neutralizes the fixed %s category", (categoryId, riskyText) => {
    const decision = screenWesternHighRiskEgressText(CANDIDATE_SURFACE, riskyText);
    expect(decision.action).toBe("neutralized");
    expect(decision.displayText).toBe(WESTERN_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK);
    expect(decision.receipt.triggeredRiskCategoryIds).toContain(categoryId);
    expect(JSON.stringify(decision)).not.toContain(riskyText);
  });

  it.each<readonly [string, string, WesternHighRiskCategoryId]>([
    ["zero width", "这个位置注\u200B定会成功。", "deterministic_personal_outcome"],
    ["bidi override", "这个位置应该买\u202E入股票。", "financial_investment_gambling"],
    ["variation selector", "这个组合预示血\uFE0F光之灾。", "death_disaster_violence_self_harm"],
    ["supplementary selector", "这个组合预示血\u{E0100}光之灾。", "death_disaster_violence_self_harm"],
    ["language tag", "当事人一\u{E0001}定会发财。", "deterministic_personal_outcome"],
    ["combining mark", "当事人一\u0301定会发财。", "deterministic_personal_outcome"],
    ["interlinear annotation", "当事人一\uFFF9定会发财。", "deterministic_personal_outcome"],
    ["emoji", "当事人一🤐定会发财。", "deterministic_personal_outcome"],
    ["hangul choseong filler", "当事人一\u115F定会发财。", "deterministic_personal_outcome"],
    ["hangul jungseong filler", "当事人一\u1160定会发财。", "deterministic_personal_outcome"],
    ["compatibility hangul filler", "当事人一\u3164定会发财。", "deterministic_personal_outcome"],
    ["halfwidth hangul filler", "当事人一\uFFA0定会发财。", "deterministic_personal_outcome"],
    ["traditional characters", "當事人一定會發財。", "deterministic_personal_outcome"],
    ["traditional guarantee", "保證會成功。", "deterministic_personal_outcome"],
    ["traditional medical", "必須停藥。", "health_medical_reproductive"],
    ["traditional legal", "逃避調查並規避執法。", "legal_criminal"],
    ["traditional gambling", "下注結果是 7。", "financial_investment_gambling"],
    ["traditional self-harm", "可能自殘。", "death_disaster_violence_self_harm"],
    ["traditional death time", "死亡時間是明天。", "death_disaster_violence_self_harm"],
    ["traditional relationship", "一定出軌。", "relationships_family"],
    ["traditional identity", "性別刻板。", "employment_education_social_identity"],
    ["traditional diagnosis", "可診斷為人格障礙。", "mental_health_personality_diagnosis"],
    ["full-width punctuation", "当事人注定，会成功。", "deterministic_personal_outcome"]
  ])("neutralizes %s lexical evasion", (_name, riskyText, categoryId) => {
    const decision = screenWesternHighRiskEgressText(CANDIDATE_SURFACE, riskyText);
    expect(decision.action).toBe("neutralized");
    expect(decision.receipt.triggeredRiskCategoryIds).toContain(categoryId);
  });

  it.each([
    "你不一定会得病。",
    "这个位置不会患病。",
    "这不是投资建议，不应该买入。",
    "这段文字不会死亡预测。",
    "并非注定离婚。",
    "现有材料不能断定人格障碍。"
  ])("conservatively neutralizes a registered phrase even under negation: %s", (safeText) => {
    const decision = screenWesternHighRiskEgressText(CANDIDATE_SURFACE, safeText);
    expect(decision.action).toBe("neutralized");
    expect(decision.displayText).toBe(WESTERN_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK);
    expect(decision.receipt.triggeredRiskCategoryIds.length).toBeGreaterThan(0);
  });

  it("still neutralizes a non-negated registered phrase after a negated one", () => {
    const decision = screenWesternHighRiskEgressText(
      CANDIDATE_SURFACE,
      "前句不会死亡，但后句宣称一定会死亡。"
    );
    expect(decision.action).toBe("neutralized");
    expect(decision.receipt.triggeredRiskCategoryIds).toContain("deterministic_personal_outcome");
    expect(decision.receipt.triggeredRiskCategoryIds).toContain("death_disaster_violence_self_harm");
  });

  it.each([
    "不是。一定会成功。",
    "不会\n会得病。",
    "不！应该买入股票。",
    "不会。会死亡。",
    "并非。注定离婚。",
    "未必；一定升职。",
    "不能。诊断为人格障碍。"
  ])("does not let negation cross an original text boundary: %s", (riskyText) => {
    const decision = screenWesternHighRiskEgressText(CANDIDATE_SURFACE, riskyText);
    expect(decision.action).toBe("neutralized");
    expect(decision.receipt.triggeredRiskCategoryIds.length).toBeGreaterThan(0);
  });

  it("keeps risky input and personal-derived digests out of the receipt", () => {
    const sensitive = "person-x 1995-08-18 23:30；这个配置说明应该买入股票。";
    const decision = screenWesternHighRiskEgressText(CANDIDATE_SURFACE, sensitive);
    expect(decision.action).toBe("neutralized");
    const serializedReceipt = JSON.stringify(decision.receipt);
    expect(serializedReceipt).not.toContain("person-x");
    expect(serializedReceipt).not.toContain("1995-08-18");
    expect(serializedReceipt).not.toContain("23:30");
    expect(serializedReceipt).not.toContain("买入");
    expect(decision.receipt).toMatchObject({
      candidateTextIncluded: false,
      candidateTextDigestIncluded: false,
      birthDataIncluded: false,
      personalDerivedDigestIncluded: false,
      sourceBodyIncluded: false,
      networkTransmissionPerformed: false,
      storageMutationPerformed: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      receiptDigestIsDigitalSignature: false
    });
  });

  it("fails both review-template downloads closed on a registered risk phrase", () => {
    for (const surfaceId of [
      "western.preview.primitive-review-template-download",
      "western.preview.dynamic-review-template-download"
    ] as const) {
      const decision = screenWesternHighRiskEgressText(
        surfaceId,
        "{\"review\":\"这个配置说明应该买入股票\"}"
      );
      expect(decision.action).toBe("failed_closed");
      expect(decision.displayText).toBe(WESTERN_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK);
      expect(() => assertWesternHighRiskTemplateEgress(
        surfaceId,
        "{\"review\":\"这个配置说明应该买入股票\"}"
      )).toThrowError(expect.objectContaining({ code: "RISKY_TEMPLATE_EGRESS_REJECTED" }));
      expect(() => assertWesternHighRiskTemplateEgress(
        surfaceId,
        "{\"review\":\"只核对结构与来源。\"}"
      )).not.toThrow();
    }
  });

  it("allows both current deterministic review templates through without a false positive", async () => {
    const primitiveTemplate = await createWesternContentReviewFeedbackTemplate();
    const primitiveSerialized = serializeWesternContentReviewFeedbackTemplate(primitiveTemplate);
    expect(() => assertWesternHighRiskTemplateEgress(
      "western.preview.primitive-review-template-download",
      primitiveSerialized
    )).not.toThrow();

    const artifact = runWesternRuleLayer({
      protocolVersion: WESTERN_RULE_LAYER_REQUEST_VERSION,
      inputLabel: "western high-risk template gate test",
      bodies: [
        { bodyId: "sun", eclipticLongitudeDeg: 0.5, longitudeSpeedDegPerDay: 0.99 },
        { bodyId: "mercury", eclipticLongitudeDeg: 60.5, longitudeSpeedDegPerDay: -0.5 }
      ],
      zodiac: WESTERN_TROPICAL_ZODIAC_IDENTITY,
      houses: {
        systemId: "whole_sign_v1",
        ramcDeg: 0,
        geographicLatitudeDeg: 0,
        obliquityTrueOfDateDeg: 23.436
      },
      aspects: {
        definitions: [
          { aspectId: "conjunction", exactAngleDeg: 0, maxOrbDeg: 8 },
          { aspectId: "sextile", exactAngleDeg: 60, maxOrbDeg: 8 },
          { aspectId: "square", exactAngleDeg: 90, maxOrbDeg: 8 },
          { aspectId: "trine", exactAngleDeg: 120, maxOrbDeg: 8 },
          { aspectId: "opposition", exactAngleDeg: 180, maxOrbDeg: 8 }
        ]
      }
    });
    if (artifact.outcome !== "computed") throw new Error("Western rule fixture did not compute");
    const projection = buildWesternContentProjection(artifact);
    const dynamicTemplate = await createWesternDynamicContentReviewFeedbackTemplate(projection);
    const dynamicSerialized = serializeWesternDynamicContentReviewFeedbackTemplate(dynamicTemplate);
    expect(() => assertWesternHighRiskTemplateEgress(
      "western.preview.dynamic-review-template-download",
      dynamicSerialized
    )).not.toThrow();
  });

  it("keeps semantic, expert, rights, admission and release authority red", () => {
    const receipt = screenWesternHighRiskEgressText(
      CANDIDATE_SURFACE,
      "只显示中性结构候选。"
    ).receipt;
    expect(receipt).toMatchObject({
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
      productionEligible: false
    });
  });

  it("rejects unknown surfaces, wrappers, oversized text and malformed UTF-16", () => {
    expect(() => createWesternHighRiskEgressRequest(
      "western.preview.unknown" as WesternHighRiskEgressSurfaceId,
      "secret-person"
    )).toThrowError(expect.objectContaining({ code: "UNREGISTERED_EGRESS_SURFACE" }));
    expect(() => createWesternHighRiskEgressRequest(
      CANDIDATE_SURFACE,
      new String("wrapped") as unknown as string
    )).toThrowError(expect.objectContaining({ code: "TEXT_TYPE_REJECTED" }));
    expect(() => createWesternHighRiskEgressRequest(
      CANDIDATE_SURFACE,
      "x".repeat(12_001)
    )).toThrowError(expect.objectContaining({ code: "TEXT_TOO_LARGE" }));
    expect(() => createWesternHighRiskEgressRequest(
      CANDIDATE_SURFACE,
      "bad\ud800"
    )).toThrowError(expect.objectContaining({ code: "ILL_FORMED_TEXT" }));
    expect(() => screenWesternHighRiskEgressText(
      "western.preview.dynamic-review-template-download",
      "\uFDFA".repeat(35_000)
    )).toThrowError(expect.objectContaining({ code: "NORMALIZED_TEXT_TOO_LARGE" }));
    expect(() => screenWesternHighRiskEgressText(
      CANDIDATE_SURFACE,
      "\uFDFA".repeat(801)
    )).toThrowError(expect.objectContaining({ code: "NORMALIZED_TEXT_TOO_LARGE" }));
  });

  it("rejects fake, cloned and proxied requests, receipts and decisions", () => {
    const request = createWesternHighRiskEgressRequest(CANDIDATE_SURFACE, "中性候选。 ");
    expect(() => evaluateWesternHighRiskEgressRequest({ ...request }))
      .toThrowError(expect.objectContaining({ code: "UNBRANDED_REQUEST" }));
    expect(() => evaluateWesternHighRiskEgressRequest(new Proxy(request, {})))
      .toThrowError(expect.objectContaining({ code: "UNBRANDED_REQUEST" }));
    const decision = evaluateWesternHighRiskEgressRequest(request);
    expect(isWesternHighRiskEgressReceipt(JSON.parse(JSON.stringify(decision.receipt)))).toBe(false);
    expect(isWesternHighRiskEgressDecision(JSON.parse(JSON.stringify(decision)))).toBe(false);
    expect(isWesternHighRiskEgressReceipt(new Proxy(decision.receipt, {}))).toBe(false);
  });

  it("keeps errors generic and does not reflect rejected text or surface identifiers", () => {
    const sensitiveSurface = "western.preview.secret-person";
    try {
      createWesternHighRiskEgressRequest(
        sensitiveSurface as WesternHighRiskEgressSurfaceId,
        "1995-08-18 secret-person"
      );
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(WesternHighRiskEgressError);
      expect(String((error as Error).message)).not.toContain("secret-person");
      expect(String((error as Error).message)).not.toContain("1995-08-18");
    }
  });
});
