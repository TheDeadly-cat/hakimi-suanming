import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ZIWEI_HIGH_RISK_CATEGORY_IDS,
  ZIWEI_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK,
  ZIWEI_HIGH_RISK_EGRESS_SURFACE_IDS,
  ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST,
  ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST_ALGORITHM,
  ZIWEI_HIGH_RISK_EXPRESSION_POLICY_ID,
  ZIWEI_HIGH_RISK_EXPRESSION_POLICY_VERSION,
  ZiweiHighRiskEgressError,
  createZiweiHighRiskEgressRequest,
  evaluateZiweiHighRiskEgressRequest,
  getZiweiHighRiskExpressionPolicyCanonicalJson,
  getZiweiHighRiskExpressionPolicySnapshot,
  isZiweiHighRiskEgressDecision,
  isZiweiHighRiskEgressReceipt,
  isZiweiHighRiskEgressRequest,
  verifyZiweiHighRiskExpressionPolicyCanonicalJson
} from "./browser-preview/high-risk-expression-egress-policy.ts";

const SAFE_SURFACE_ID = "ziwei.candidate.major-star.base";

function requestFor(text: string, surfaceId = SAFE_SURFACE_ID) {
  return createZiweiHighRiskEgressRequest(
    surfaceId,
    text,
    null,
    null,
    null,
    false,
    false,
    false,
    false,
    false,
    false
  );
}

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return;
  if (seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    expect(descriptor).toBeDefined();
    expect(descriptor && "value" in descriptor).toBe(true);
    if (descriptor && "value" in descriptor) expectDeepFrozen(descriptor.value, seen);
  }
}

describe("isolated Ziwei versioned high-risk expression egress policy", () => {
  it("fixes the first-party policy identity, digest, categories, and complete candidate surface registry", async () => {
    expect(ZIWEI_HIGH_RISK_EXPRESSION_POLICY_ID).toBe(
      "hakimi.ziwei.high-risk-expression-egress-policy/0.1.0"
    );
    expect(ZIWEI_HIGH_RISK_EXPRESSION_POLICY_VERSION).toBe("0.1.0");
    expect(ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST_ALGORITHM).toBe("SHA-256");
    expect(ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST).toMatch(/^[a-f0-9]{64}$/u);
    expect(createHash("sha256")
      .update(getZiweiHighRiskExpressionPolicyCanonicalJson(), "utf8")
      .digest("hex")).toBe(ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST);
    await expect(verifyZiweiHighRiskExpressionPolicyCanonicalJson(
      getZiweiHighRiskExpressionPolicyCanonicalJson(),
      ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST
    )).resolves.toBe(true);

    expect(ZIWEI_HIGH_RISK_CATEGORY_IDS).toEqual([
      "deterministic_personal_outcome",
      "health_medical_reproductive",
      "legal_criminal",
      "financial_investment",
      "death_disaster_violence_self_harm",
      "relationships_family",
      "employment_social_identity",
      "mental_health_personality_diagnosis"
    ]);
    expect(ZIWEI_HIGH_RISK_EGRESS_SURFACE_IDS).toEqual([
      "ziwei.candidate.core-minor-star.base",
      "ziwei.candidate.core-minor-star.palace",
      "ziwei.candidate.core-minor-star.sanfang-review",
      "ziwei.candidate.core-minor-star.sanfang-feedback-preflight",
      "ziwei.candidate.major-star.base",
      "ziwei.candidate.major-star.combination-review",
      "ziwei.candidate.major-star.palace",
      "ziwei.candidate.palace-role.base",
      "ziwei.candidate.major-star.same-star-synthesis",
      "ziwei.candidate.natal-transformation.base",
      "ziwei.candidate.natal-transformation.palace",
      "ziwei.candidate.natal-transformation.palace-feedback-preflight",
      "ziwei.candidate.natal-transformation.review",
      "ziwei.candidate.palace.first-synthesis",
      "ziwei.candidate.palace.four-part-synthesis",
      "ziwei.projection.browser-display"
    ]);
    expectDeepFrozen(getZiweiHighRiskExpressionPolicySnapshot());
    expectDeepFrozen(ZIWEI_HIGH_RISK_CATEGORY_IDS);
    expectDeepFrozen(ZIWEI_HIGH_RISK_EGRESS_SURFACE_IDS);
    expect(getZiweiHighRiskExpressionPolicySnapshot()).toMatchObject({
      outputBoundary: {
        semanticCoverageComplete: false,
        unstructuredFreeTextSafetyEstablished: false,
        surfaceCallerAuthenticityEstablished: false,
        registeredSurfaceCallGraphClosureEstablished: false
      },
      integrationBoundary: {
        candidateCallSitesWiredToGate: false,
        mainAppReachable: false
      },
      integrityBoundary: {
        postImportIntrinsicHardeningOnly: true,
        preImportIntrinsicIntegrityEstablished: false
      }
    });
  });

  it("fails closed on registry, category, canonical-byte, or claimed-digest drift", async () => {
    const canonical = getZiweiHighRiskExpressionPolicyCanonicalJson();
    const surfaceDrift = canonical.replace(
      "ziwei.candidate.major-star.base",
      "ziwei.candidate.major-star.base-drift"
    );
    const categoryDrift = canonical.replace(
      "financial_investment",
      "financial_investment_drift"
    );
    await expect(verifyZiweiHighRiskExpressionPolicyCanonicalJson(
      surfaceDrift,
      ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST
    )).resolves.toBe(false);
    await expect(verifyZiweiHighRiskExpressionPolicyCanonicalJson(
      categoryDrift,
      ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST
    )).resolves.toBe(false);
    await expect(verifyZiweiHighRiskExpressionPolicyCanonicalJson(
      `${canonical}\n`,
      ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST
    )).resolves.toBe(false);
    await expect(verifyZiweiHighRiskExpressionPolicyCanonicalJson(
      canonical,
      "0".repeat(64)
    )).resolves.toBe(false);
    await expect(verifyZiweiHighRiskExpressionPolicyCanonicalJson(
      new String(canonical),
      ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST
    )).resolves.toBe(false);
  });

  it("binds every registered egress surface to the current candidate source bytes", () => {
    const snapshot = getZiweiHighRiskExpressionPolicySnapshot() as {
      surfaceRegistry: readonly Readonly<{
        surfaceId: string;
        sourcePath: string;
        sourceBytes: number;
        sourceSha256: string;
      }>[];
    };
    expect(snapshot.surfaceRegistry).toHaveLength(ZIWEI_HIGH_RISK_EGRESS_SURFACE_IDS.length);
    for (const surface of snapshot.surfaceRegistry) {
      const bytes = readFileSync(resolve(
        process.cwd(),
        "packages/ziwei-iztro-adapter-draft",
        surface.sourcePath
      ));
      expect(bytes.byteLength, surface.surfaceId).toBe(surface.sourceBytes);
      expect(createHash("sha256").update(bytes).digest("hex"), surface.surfaceId)
        .toBe(surface.sourceSha256);
    }
  });

  it("keeps the candidate-output source inventory closed over registered source files", () => {
    const browserPreviewRoot = resolve(
      process.cwd(),
      "packages/ziwei-iztro-adapter-draft/src/browser-preview"
    );
    const candidateOutputSourcePaths = readdirSync(browserPreviewRoot)
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .filter((name) => {
        const source = readFileSync(resolve(browserPreviewRoot, name), "utf8");
        return /_CANDIDATE_CONTENT\b/u.test(source)
          || /^export (?:async )?function (?:create[A-Za-z0-9]*(?:Review|Reviews|Content|Contents)|preflight[A-Za-z0-9]*ReviewFeedback)\b/mu
            .test(source);
      })
      .sort()
      .map((name) => `src/browser-preview/${name}`);
    const snapshot = getZiweiHighRiskExpressionPolicySnapshot() as {
      surfaceRegistry: readonly Readonly<{ sourcePath: string }>[];
    };
    const registeredSourcePaths = [...new Set(
      snapshot.surfaceRegistry.map((surface) => surface.sourcePath)
    )].sort();
    expect(registeredSourcePaths).toEqual(candidateOutputSourcePaths);

    const exportedCandidateSymbols = candidateOutputSourcePaths.flatMap((sourcePath) => {
      const source = readFileSync(resolve(
        process.cwd(),
        "packages/ziwei-iztro-adapter-draft",
        sourcePath
      ), "utf8");
      return [...source.matchAll(
        /^export const (ZIWEI_[A-Z0-9_]+_CANDIDATE_CONTENT)\b/gmu
      )].map((match) => match[1]);
    }).sort();
    expect(exportedCandidateSymbols).toEqual([
      "ZIWEI_CORE_MINOR_STAR_CANDIDATE_CONTENT",
      "ZIWEI_CORE_MINOR_STAR_PALACE_CANDIDATE_CONTENT",
      "ZIWEI_MAJOR_STAR_CANDIDATE_CONTENT",
      "ZIWEI_MAJOR_STAR_PALACE_CANDIDATE_CONTENT",
      "ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT",
      "ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT",
      "ZIWEI_PALACE_ROLE_CANDIDATE_CONTENT"
    ]);
  });

  it("rejects every unregistered egress surface before producing a request or receipt", () => {
    const sensitive = "1995-08-18 23:30 secret-person";
    expect(() => requestFor(sensitive, "ziwei.candidate.unknown.secret-person"))
      .toThrowError(ZiweiHighRiskEgressError);
    try {
      requestFor(sensitive, "ziwei.candidate.unknown.secret-person");
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ZiweiHighRiskEgressError);
      expect((error as ZiweiHighRiskEgressError).code).toBe("UNREGISTERED_EGRESS_SURFACE");
      expect(String((error as Error).message)).not.toContain(sensitive);
      expect(String((error as Error).message)).not.toContain("secret-person");
    }
  });

  it.each([
    ["deterministic_personal_outcome", "这个人注\u200B定会得到确定结果。"],
    ["health_medical_reproductive", "该盘说明未来会患癌症。"],
    ["legal_criminal", "该组合直接代表牢狱。"],
    ["financial_investment", "该位置直接决定财运。"],
    ["death_disaster_violence_self_harm", "该组合直接预示血光。"],
    ["relationships_family", "该位置直接决定婚姻结果。"],
    ["employment_social_identity", "该星曜给出职业指定。"],
    ["mental_health_personality_diagnosis", "该组合可以诊断人格障碍。"]
  ])("neutralizes the fixed %s risk category without returning the source text", async (
    categoryId,
    riskyText
  ) => {
    const decision = await evaluateZiweiHighRiskEgressRequest(requestFor(riskyText));
    expect(decision.action).toBe("neutralized");
    expect(decision.displayText).toBe(ZIWEI_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK);
    expect(decision.displayText).not.toContain(riskyText);
    expect(decision.receipt.triggeredRiskCategoryIds).toContain(categoryId);
    expect(JSON.stringify(decision)).not.toContain(riskyText);
    expect(isZiweiHighRiskEgressRequest(requestFor("仅供结构核对。"))).toBe(true);
    expect(isZiweiHighRiskEgressDecision(decision)).toBe(true);
    expect(isZiweiHighRiskEgressReceipt(decision.receipt)).toBe(true);
    expectDeepFrozen(decision);
  });

  it.each([
    ["word-joiner", "该位置直接决定财\u2061运。", "financial_investment"],
    ["right-to-left override", "该位置直接决定财\u202E运。", "financial_investment"],
    ["variation selector", "该位置直接决定财\uFE0F运。", "financial_investment"],
    ["supplementary variation selector", "该位置直接决定财\u{E0100}运。", "financial_investment"],
    ["soft hyphen", "该位置直接决定财\u00AD运。", "financial_investment"],
    ["health paraphrase", "此配置表示将罹患肿瘤。", "health_medical_reproductive"],
    ["legal paraphrase", "此配置表示会身陷囹圄。", "legal_criminal"],
    ["financial paraphrase", "此配置表示钱财暴增。", "financial_investment"]
  ])("neutralizes %s lexical evasion", async (_caseName, text, categoryId) => {
    const decision = await evaluateZiweiHighRiskEgressRequest(requestFor(text));
    expect(decision.action).toBe("neutralized");
    expect(decision.displayText).toBe(ZIWEI_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK);
    expect(decision.receipt.triggeredRiskCategoryIds).toContain(categoryId);
    expect(JSON.stringify(decision)).not.toContain(text);
  });

  it("passes safe text through exactly and deep-freezes the branded decision", async () => {
    const text = "该候选仅描述信息整理倾向，仍需核对盘面事实与适用条件。";
    const request = requestFor(text, "ziwei.candidate.palace.four-part-synthesis");
    const decision = await evaluateZiweiHighRiskEgressRequest(request);
    expect(decision).toMatchObject({
      action: "pass_through",
      displayText: text,
      surfaceId: "ziwei.candidate.palace.four-part-synthesis"
    });
    expect(decision.receipt.triggeredRiskCategoryIds).toEqual([]);
    expect(isZiweiHighRiskEgressRequest(request)).toBe(true);
    expect(isZiweiHighRiskEgressReceipt(decision.receipt)).toBe(true);
    expect(isZiweiHighRiskEgressDecision(decision)).toBe(true);
    expectDeepFrozen(request);
    expectDeepFrozen(decision);
  });

  it.each([
    ["result", ["winner", null, null, false, false, false, false, false, false]],
    ["eventOutcome", [null, "event", null, false, false, false, false, false, false]],
    ["goodBadOrientation", [null, null, "good", false, false, false, false, false, false]],
    ["scoringAllowed", [null, null, null, true, false, false, false, false, false]],
    ["directOutcomeAllowed", [null, null, null, false, true, false, false, false, false]],
    ["deterministicPersonalOutcomeAllowed", [null, null, null, false, false, true, false, false, false]],
    ["expertTruthClaimed", [null, null, null, false, false, false, true, false, false]],
    ["formalActivationAllowed", [null, null, null, false, false, false, false, true, false]],
    ["productionEligible", [null, null, null, false, false, false, false, false, true]]
  ])("rejects %s escalation before a request can be branded", (_field, values) => {
    expect(() => createZiweiHighRiskEgressRequest(
      SAFE_SURFACE_ID,
      "仅供结构核对。",
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5],
      values[6],
      values[7],
      values[8]
    )).toThrowError(expect.objectContaining({ code: "BOUNDARY_ESCALATION_REJECTED" }));
  });

  it("rejects fake, cloned, proxied, and getter-bearing requests and receipts without invoking getters", async () => {
    let getterCalls = 0;
    const getterRequest = Object.freeze(Object.defineProperty({}, "surfaceId", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("getter must not execute");
      }
    }));
    await expect(evaluateZiweiHighRiskEgressRequest(getterRequest)).rejects.toMatchObject({
      code: "UNBRANDED_REQUEST"
    });
    expect(getterCalls).toBe(0);

    const realRequest = requestFor("仅供结构核对。无个人结论。");
    await expect(evaluateZiweiHighRiskEgressRequest(new Proxy(realRequest, {}))).rejects.toMatchObject({
      code: "UNBRANDED_REQUEST"
    });
    await expect(evaluateZiweiHighRiskEgressRequest({ ...realRequest })).rejects.toMatchObject({
      code: "UNBRANDED_REQUEST"
    });

    const decision = await evaluateZiweiHighRiskEgressRequest(realRequest);
    const fakeReceipt = Object.freeze(JSON.parse(JSON.stringify(decision.receipt)));
    expect(isZiweiHighRiskEgressReceipt(fakeReceipt)).toBe(false);
    expect(isZiweiHighRiskEgressReceipt(new Proxy(decision.receipt, {}))).toBe(false);
    expect(isZiweiHighRiskEgressDecision(JSON.parse(JSON.stringify(decision)))).toBe(false);
  });

  it("keeps receipts free of birth data, source text, candidate text, and personal-derived digests", async () => {
    const sensitive = "person-x 1995-08-18 23:30 身份秘密；该位置直接决定财运。";
    const decision = await evaluateZiweiHighRiskEgressRequest(requestFor(sensitive));
    const serializedReceipt = JSON.stringify(decision.receipt);
    expect(serializedReceipt).not.toContain("person-x");
    expect(serializedReceipt).not.toContain("1995-08-18");
    expect(serializedReceipt).not.toContain("23:30");
    expect(serializedReceipt).not.toContain("身份秘密");
    expect(serializedReceipt).not.toContain("财运");
    expect(decision.receipt).toMatchObject({
      birthDataIncluded: false,
      candidateTextIncluded: false,
      candidateTextDigestIncluded: false,
      personalDerivedDigestIncluded: false,
      sourceBodyIncluded: false,
      mutationPerformed: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      receiptDigestIsDigitalSignature: false
    });
  });

  it("keeps every content, expert, rights, admission, release, and public authority bit false", async () => {
    const receipt = (await evaluateZiweiHighRiskEgressRequest(requestFor("仅供结构核对。"))).receipt;
    expect(receipt).toMatchObject({
      result: null,
      eventOutcome: null,
      goodBadOrientation: null,
      scoringAllowed: false,
      directOutcomeAllowed: false,
      deterministicPersonalOutcomeAllowed: false,
      expertTruthClaimed: false,
      formalActivationAllowed: false,
      semanticSafetyEstablished: false,
      surfaceCallerAuthenticityEstablished: false,
      registeredSurfaceCallGraphClosureEstablished: false,
      preImportIntrinsicIntegrityEstablished: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      expertTruthEstablished: false,
      expertIdentityVerified: false,
      independentExpertReviewsVerified: 0,
      expertClaimsAuthorized: false,
      workRightsEstablished: false,
      editionRightsEstablished: false,
      carrierRightsEstablished: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      formalAdmissionAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicBuildInclusionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      productionEligible: false
    });
  });

  it("survives post-import live-global and prototype poisoning without allowing brand forgery", async () => {
    const nativeObject = globalThis.Object;
    const nativeReflect = globalThis.Reflect;
    const nativeString = globalThis.String;
    const nativeWeakSet = globalThis.WeakSet;
    const defineProperty = nativeReflect.defineProperty;
    const descriptors = {
      objectGlobal: nativeObject.getOwnPropertyDescriptor(globalThis, "Object"),
      reflectGlobal: nativeObject.getOwnPropertyDescriptor(globalThis, "Reflect"),
      stringGlobal: nativeObject.getOwnPropertyDescriptor(globalThis, "String"),
      weakSetGlobal: nativeObject.getOwnPropertyDescriptor(globalThis, "WeakSet"),
      getOwnPropertyDescriptor: nativeObject.getOwnPropertyDescriptor(nativeObject, "getOwnPropertyDescriptor"),
      freeze: nativeObject.getOwnPropertyDescriptor(nativeObject, "freeze"),
      ownKeys: nativeObject.getOwnPropertyDescriptor(nativeReflect, "ownKeys"),
      includes: nativeObject.getOwnPropertyDescriptor(nativeString.prototype, "includes"),
      indexOf: nativeObject.getOwnPropertyDescriptor(nativeString.prototype, "indexOf"),
      normalize: nativeObject.getOwnPropertyDescriptor(nativeString.prototype, "normalize"),
      trim: nativeObject.getOwnPropertyDescriptor(nativeString.prototype, "trim"),
      weakAdd: nativeObject.getOwnPropertyDescriptor(nativeWeakSet.prototype, "add"),
      weakHas: nativeObject.getOwnPropertyDescriptor(nativeWeakSet.prototype, "has")
    };
    for (const descriptor of nativeObject.values(descriptors)) expect(descriptor).toBeDefined();
    const throwing = () => { throw new Error("poisoned live global"); };
    const replacement = (descriptor: PropertyDescriptor | undefined, value: unknown) => ({
      ...descriptor,
      value
    });
    let action: string | undefined;
    let receiptAccepted = false;
    let fakeAccepted = true;
    try {
      defineProperty(nativeObject, "getOwnPropertyDescriptor", replacement(
        descriptors.getOwnPropertyDescriptor,
        throwing
      ));
      defineProperty(nativeObject, "freeze", replacement(descriptors.freeze, throwing));
      defineProperty(nativeReflect, "ownKeys", replacement(descriptors.ownKeys, throwing));
      defineProperty(nativeString.prototype, "includes", replacement(descriptors.includes, throwing));
      defineProperty(nativeString.prototype, "indexOf", replacement(descriptors.indexOf, throwing));
      defineProperty(nativeString.prototype, "normalize", replacement(descriptors.normalize, throwing));
      defineProperty(nativeString.prototype, "trim", replacement(descriptors.trim, throwing));
      defineProperty(nativeWeakSet.prototype, "add", replacement(descriptors.weakAdd, throwing));
      defineProperty(nativeWeakSet.prototype, "has", replacement(descriptors.weakHas, throwing));
      defineProperty(globalThis, "Object", replacement(
        descriptors.objectGlobal,
        new Proxy(function ObjectPoison() {}, { get: throwing, apply: throwing })
      ));
      defineProperty(globalThis, "Reflect", replacement(
        descriptors.reflectGlobal,
        new Proxy({}, { get: throwing })
      ));
      defineProperty(globalThis, "String", replacement(
        descriptors.stringGlobal,
        new Proxy(function StringPoison() {}, { get: throwing, apply: throwing })
      ));
      defineProperty(globalThis, "WeakSet", replacement(
        descriptors.weakSetGlobal,
        new Proxy(function WeakSetPoison() {}, { get: throwing, construct: throwing })
      ));

      const decision = await evaluateZiweiHighRiskEgressRequest(requestFor(
        "该位置直接决定财运。"
      ));
      action = decision.action;
      receiptAccepted = isZiweiHighRiskEgressReceipt(decision.receipt);
      fakeAccepted = isZiweiHighRiskEgressReceipt({});
    } finally {
      defineProperty(globalThis, "Object", descriptors.objectGlobal as PropertyDescriptor);
      defineProperty(globalThis, "Reflect", descriptors.reflectGlobal as PropertyDescriptor);
      defineProperty(globalThis, "String", descriptors.stringGlobal as PropertyDescriptor);
      defineProperty(globalThis, "WeakSet", descriptors.weakSetGlobal as PropertyDescriptor);
      defineProperty(nativeObject, "getOwnPropertyDescriptor", descriptors.getOwnPropertyDescriptor as PropertyDescriptor);
      defineProperty(nativeObject, "freeze", descriptors.freeze as PropertyDescriptor);
      defineProperty(nativeReflect, "ownKeys", descriptors.ownKeys as PropertyDescriptor);
      defineProperty(nativeString.prototype, "includes", descriptors.includes as PropertyDescriptor);
      defineProperty(nativeString.prototype, "indexOf", descriptors.indexOf as PropertyDescriptor);
      defineProperty(nativeString.prototype, "normalize", descriptors.normalize as PropertyDescriptor);
      defineProperty(nativeString.prototype, "trim", descriptors.trim as PropertyDescriptor);
      defineProperty(nativeWeakSet.prototype, "add", descriptors.weakAdd as PropertyDescriptor);
      defineProperty(nativeWeakSet.prototype, "has", descriptors.weakHas as PropertyDescriptor);
    }
    expect(action).toBe("neutralized");
    expect(receiptAccepted).toBe(true);
    expect(fakeAccepted).toBe(false);
  });

  it("remains unreachable through the private package production export surface", () => {
    const packageJson = JSON.parse(readFileSync(
      resolve(process.cwd(), "packages/ziwei-iztro-adapter-draft/package.json"),
      "utf8"
    )) as {
      private: boolean;
      exports: Record<string, unknown>;
      "x-hakimi-isolated-draft": { productionImport: string; kind: string; systemId: string };
    };
    expect(packageJson.private).toBe(true);
    expect(packageJson.exports).toEqual({});
    expect(packageJson["x-hakimi-isolated-draft"]).toEqual(expect.objectContaining({
      productionImport: "forbidden",
      kind: "adapter",
      systemId: "ziwei-doushu"
    }));
    expect(Object.keys(packageJson.exports)).toEqual([]);
  });
});
