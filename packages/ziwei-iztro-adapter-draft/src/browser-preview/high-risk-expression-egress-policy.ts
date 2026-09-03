/*
 * First-party, isolated Ziwei candidate-output safety gate.
 *
 * This file deliberately does not import any domain candidate or production
 * surface.  It defines a conservative engineering policy for a future caller
 * to invoke at the last text egress boundary.  Package exports remain empty.
 */

const NATIVE_OBJECT = Object;
const NATIVE_ARRAY = Array;
const NATIVE_ERROR = Error;
const NATIVE_NUMBER = Number;
const NATIVE_STRING = String;
const NATIVE_WEAK_SET = WeakSet;
const NATIVE_UINT8_ARRAY = Uint8Array;
const NATIVE_TEXT_ENCODER = TextEncoder;
const NATIVE_JSON = JSON;
const NATIVE_REFLECT = Reflect;

const REFLECT_APPLY = NATIVE_REFLECT.apply;
const OBJECT_CREATE = NATIVE_OBJECT.create;
const OBJECT_DEFINE_PROPERTY = NATIVE_OBJECT.defineProperty;
const OBJECT_FREEZE = NATIVE_OBJECT.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = NATIVE_OBJECT.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = NATIVE_OBJECT.getPrototypeOf;
const OBJECT_IS_FROZEN = NATIVE_OBJECT.isFrozen;
const OBJECT_KEYS = NATIVE_OBJECT.keys;
const ARRAY_IS_ARRAY = NATIVE_ARRAY.isArray;
const ARRAY_SORT = NATIVE_ARRAY.prototype.sort;
const JSON_STRINGIFY = NATIVE_JSON.stringify;
const REFLECT_OWN_KEYS = NATIVE_REFLECT.ownKeys;
const STRING_CHAR_CODE_AT = NATIVE_STRING.prototype.charCodeAt;
const STRING_INCLUDES = NATIVE_STRING.prototype.includes;
const STRING_INDEX_OF = NATIVE_STRING.prototype.indexOf;
const STRING_NORMALIZE = NATIVE_STRING.prototype.normalize;
const STRING_TRIM = NATIVE_STRING.prototype.trim;
const NUMBER_IS_FINITE = NATIVE_NUMBER.isFinite;
const WEAK_SET_ADD = NATIVE_WEAK_SET.prototype.add;
const WEAK_SET_HAS = NATIVE_WEAK_SET.prototype.has;
const TEXT_ENCODER_ENCODE = NATIVE_TEXT_ENCODER.prototype.encode;

const INTERNAL_TEXT_ENCODER = new NATIVE_TEXT_ENCODER();
const INTERNAL_SUBTLE = globalThis.crypto?.subtle;
const SUBTLE_DIGEST = INTERNAL_SUBTLE?.digest;

const POLICY_ID = "hakimi.ziwei.high-risk-expression-egress-policy/0.1.0" as const;
const POLICY_VERSION = "0.1.0" as const;
const POLICY_DIGEST_ALGORITHM = "SHA-256" as const;
const POLICY_DIGEST = "f2be6ba54f97522ceadc776a4db1f599c33d48dcfe7ba77a2a740aec1123b715" as const;
const POLICY_STATUS = "isolated_first_party_conservative_engineering_policy" as const;
const SURFACE_REGISTRY_VERSION = "hakimi.ziwei.candidate-egress-surfaces/0.1.0" as const;
const REQUEST_VERSION = "hakimi.ziwei.high-risk-egress-request/0.1.0" as const;
const RECEIPT_VERSION = "hakimi.ziwei.high-risk-egress-receipt/0.1.0" as const;
const DECISION_VERSION = "hakimi.ziwei.high-risk-egress-decision/0.1.0" as const;
const MAX_DISPLAY_TEXT_CODE_UNITS = 12_000;
const NEUTRAL_FALLBACK =
  "该候选触及高风险或确定性个人结果边界，当前仅保留可核对的结构事实，不显示解释性结论。" as const;

type NullRecord = Record<string, unknown>;

function appendValue<T>(target: T[], value: T): void {
  OBJECT_DEFINE_PROPERTY(target, target.length, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function defineData(target: NullRecord, key: string, value: unknown): void {
  OBJECT_DEFINE_PROPERTY(target, key, {
    value,
    enumerable: true,
    configurable: false,
    writable: false
  });
}

function nullRecord(entries: readonly (readonly [string, unknown])[]): NullRecord {
  const result = OBJECT_CREATE(null) as NullRecord;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) throw new NATIVE_ERROR("Internal policy entry is missing");
    defineData(result, entry[0], entry[1]);
  }
  return result;
}

function frozenArray<T>(values: readonly T[]): readonly T[] {
  const result: T[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === undefined) throw new NATIVE_ERROR("Internal policy array is sparse");
    appendValue(result, value);
  }
  return OBJECT_FREEZE(result);
}

function frozenRecord(entries: readonly (readonly [string, unknown])[]): Readonly<NullRecord> {
  return OBJECT_FREEZE(nullRecord(entries));
}

const SURFACE_DEFINITIONS = frozenArray([
  frozenRecord([
    ["surfaceId", "ziwei.candidate.core-minor-star.base"],
    ["sourcePath", "src/browser-preview/core-minor-star-content.ts"],
    ["sourceBytes", 39928],
    ["sourceSha256", "d80f82925688c59419ebfd135172495b0f3c4d5da4ccc82a614cba45fee9f343"],
    ["outputKind", "candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.core-minor-star.palace"],
    ["sourcePath", "src/browser-preview/core-minor-star-content.ts"],
    ["sourceBytes", 39928],
    ["sourceSha256", "d80f82925688c59419ebfd135172495b0f3c4d5da4ccc82a614cba45fee9f343"],
    ["outputKind", "candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.core-minor-star.sanfang-review"],
    ["sourcePath", "src/browser-preview/core-minor-star-sanfang-review.ts"],
    ["sourceBytes", 22659],
    ["sourceSha256", "ace96b60ceb25fb50ac3ec138c43a91b174de83250419101ad80407124a621ff"],
    ["outputKind", "review_candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.core-minor-star.sanfang-feedback-preflight"],
    ["sourcePath", "src/browser-preview/core-minor-star-sanfang-review-feedback.ts"],
    ["sourceBytes", 50650],
    ["sourceSha256", "df3bcf4018ccf56239dfc9ec90b09ee4c54e74783649653ac49c811eb4b87a5c"],
    ["outputKind", "review_feedback_projection"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.major-star.base"],
    ["sourcePath", "src/browser-preview/major-star-content.ts"],
    ["sourceBytes", 11354],
    ["sourceSha256", "7cfaca5402e6ad8b48faa80e9ce8bd529e03923faea9735a9caf12f01a4aa3c1"],
    ["outputKind", "candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.major-star.combination-review"],
    ["sourcePath", "src/browser-preview/major-star-combination-review.ts"],
    ["sourceBytes", 15231],
    ["sourceSha256", "b899d3c7a0ba711e7a486eef9fb3890a6b2e3fcdbdf7ef7ff903e48d38a88187"],
    ["outputKind", "review_candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.major-star.palace"],
    ["sourcePath", "src/browser-preview/major-star-palace-content.ts"],
    ["sourceBytes", 24737],
    ["sourceSha256", "96503fb39487b9f9b939a70f922cf810814dcd7b176b278379ed7a4f811143e2"],
    ["outputKind", "candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.palace-role.base"],
    ["sourcePath", "src/browser-preview/major-star-palace-content.ts"],
    ["sourceBytes", 24737],
    ["sourceSha256", "96503fb39487b9f9b939a70f922cf810814dcd7b176b278379ed7a4f811143e2"],
    ["outputKind", "candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.major-star.same-star-synthesis"],
    ["sourcePath", "src/browser-preview/major-star-synthesis-review.ts"],
    ["sourceBytes", 7711],
    ["sourceSha256", "de990e67bafa47aca40f21b66fc569254c1c044312132d6f3c711a9e1b1df21e"],
    ["outputKind", "review_candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.natal-transformation.base"],
    ["sourcePath", "src/browser-preview/natal-transformation-content.ts"],
    ["sourceBytes", 9338],
    ["sourceSha256", "68adf4c783241a6b834096ed8286c5bdeee08fd867c04669ff75796c620f7378"],
    ["outputKind", "candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.natal-transformation.palace"],
    ["sourcePath", "src/browser-preview/natal-transformation-palace-content.ts"],
    ["sourceBytes", 20120],
    ["sourceSha256", "19a09c55967b53bb013395b89b58aff2658b7f5da4710cded816d8eca08708b1"],
    ["outputKind", "candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.natal-transformation.palace-feedback-preflight"],
    ["sourcePath", "src/browser-preview/natal-transformation-palace-review-feedback.ts"],
    ["sourceBytes", 37796],
    ["sourceSha256", "a5c1f52cfd44d862c6a3cd6a2317587e966666538f2a9494d8b9967747c9c982"],
    ["outputKind", "review_feedback_projection"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.natal-transformation.review"],
    ["sourcePath", "src/browser-preview/natal-transformation-review.ts"],
    ["sourceBytes", 19677],
    ["sourceSha256", "008863d1e00e8d2d44648ea5b337995b91dbc79d0df8ead8acbb08118367cdea"],
    ["outputKind", "review_candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.palace.first-synthesis"],
    ["sourcePath", "src/browser-preview/palace-first-synthesis-review.ts"],
    ["sourceBytes", 16840],
    ["sourceSha256", "a70981876b88bb63a4de097decacedc999907a2408f6f89ee64f88446dbaccbd"],
    ["outputKind", "review_candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.candidate.palace.four-part-synthesis"],
    ["sourcePath", "src/browser-preview/palace-four-part-synthesis-content.ts"],
    ["sourceBytes", 27933],
    ["sourceSha256", "1ba435c3f6b7df0250875c7a3e455d8cc77a35ba3243b18f11b31ea3b933f171"],
    ["outputKind", "candidate_text"]
  ]),
  frozenRecord([
    ["surfaceId", "ziwei.projection.browser-display"],
    ["sourcePath", "src/browser-preview/display-projection.ts"],
    ["sourceBytes", 10507],
    ["sourceSha256", "6211f602c3465f986224d8e2aa6c4c5b6a0eb654367f4c2458136b16428786ed"],
    ["outputKind", "candidate_projection"]
  ])
]);

const RISK_CATEGORY_DEFINITIONS = frozenArray([
  frozenRecord([
    ["categoryId", "deterministic_personal_outcome"],
    ["label", "确定性个人结果"],
    ["tokens", frozenArray([
      "一定", "必然", "注定", "保证", "终身", "命中注定", "绝对会", "肯定会",
      "无法避免", "大吉", "大凶"
    ])]
  ]),
  frozenRecord([
    ["categoryId", "health_medical_reproductive"],
    ["label", "健康医疗与生育"],
    ["tokens", frozenArray([
      "疾病", "癌症", "手术", "残疾", "夭折", "寿命", "怀孕", "妊娠", "流产",
      "生育", "医疗建议", "就医决定", "罹患肿瘤", "身患重病"
    ])]
  ]),
  frozenRecord([
    ["categoryId", "legal_criminal"],
    ["label", "法律与刑事结果"],
    ["tokens", frozenArray([
      "牢狱", "官灾", "犯罪", "违法", "诉讼结果", "法律建议", "必胜诉", "必败诉",
      "身陷囹圄", "锒铛入狱"
    ])]
  ]),
  frozenRecord([
    ["categoryId", "financial_investment"],
    ["label", "财务与投资结果"],
    ["tokens", frozenArray([
      "发财", "破财", "贫困", "贫贱", "富贵", "资产规模", "财运", "投资建议",
      "买入", "卖出", "收益保证", "财富多寡", "继承", "钱财暴增", "血本无归"
    ])]
  ]),
  frozenRecord([
    ["categoryId", "death_disaster_violence_self_harm"],
    ["label", "生死灾祸暴力与自伤"],
    ["tokens", frozenArray([
      "死亡", "灾祸", "血光", "事故", "暴力", "自杀", "自残", "伤害自己", "杀人"
    ])]
  ]),
  frozenRecord([
    ["categoryId", "relationships_family"],
    ["label", "婚恋与家庭结果"],
    ["tokens", frozenArray([
      "离婚", "婚期", "婚姻结果", "克夫", "克妻", "背叛", "必定分手", "必定结婚"
    ])]
  ]),
  frozenRecord([
    ["categoryId", "employment_social_identity"],
    ["label", "职业与社会身份结果"],
    ["tokens", frozenArray([
      "失业", "升职", "职业指定", "适合从事", "身份贵贱", "性别刻板"
    ])]
  ]),
  frozenRecord([
    ["categoryId", "mental_health_personality_diagnosis"],
    ["label", "心理健康与人格诊断"],
    ["tokens", frozenArray([
      "精神病", "心理诊断", "心理问题", "人格定型", "人格障碍", "抑郁症", "焦虑症"
    ])]
  ])
]);

const AUTHORITY_BOUNDARY = frozenRecord([
  ["contentTruthEstablished", false],
  ["domainAuthorityAuthorized", false],
  ["expertTruthEstablished", false],
  ["expertIdentityVerified", false],
  ["independentExpertReviewsVerified", 0],
  ["expertClaimsAuthorized", false],
  ["workRightsEstablished", false],
  ["editionRightsEstablished", false],
  ["carrierRightsEstablished", false],
  ["rightsLegalConclusionEstablished", false],
  ["redistributionAuthorized", false],
  ["formalAdmissionAuthorized", false],
  ["releaseEvidenceComplete", false],
  ["releaseReady", false],
  ["publicBuildInclusionAuthorized", false],
  ["publicDeploymentAuthorized", false],
  ["publicReleaseAuthorized", false],
  ["productionEligible", false]
]);

const POLICY_BASE = frozenRecord([
  ["policyId", POLICY_ID],
  ["policyVersion", POLICY_VERSION],
  ["policyStatus", POLICY_STATUS],
  ["systemId", "ziwei-doushu"],
  ["surfaceRegistryVersion", SURFACE_REGISTRY_VERSION],
  ["surfaceRegistry", SURFACE_DEFINITIONS],
  ["riskCategories", RISK_CATEGORY_DEFINITIONS],
  ["neutralFallback", NEUTRAL_FALLBACK],
  ["outputBoundary", frozenRecord([
    ["resultMustRemainNull", true],
    ["eventOutcomeMustRemainNull", true],
    ["goodBadOrientationMustRemainNull", true],
    ["scoringAllowed", false],
    ["directOutcomeAllowed", false],
    ["deterministicPersonalOutcomeAllowed", false],
    ["expertTruthClaimed", false],
    ["formalActivationAllowed", false],
    ["productionEligible", false],
    ["unregisteredSurfacePolicy", "reject"],
    ["riskMatchPolicy", "neutralize"],
    ["safeTextPolicy", "exact_pass_through"],
    ["semanticCoverageComplete", false],
    ["unstructuredFreeTextSafetyEstablished", false],
    ["surfaceCallerAuthenticityEstablished", false],
    ["registeredSurfaceCallGraphClosureEstablished", false]
  ])],
  ["receiptBoundary", frozenRecord([
    ["birthDataIncluded", false],
    ["candidateTextIncluded", false],
    ["candidateTextDigestIncluded", false],
    ["personalDerivedDigestIncluded", false],
    ["sourceBodyIncluded", false],
    ["mutationPerformed", false],
    ["receiptDigestIsDigitalSignature", false]
  ])],
  ["authorityBoundary", AUTHORITY_BOUNDARY],
  ["integrationBoundary", frozenRecord([
    ["packagePrivate", true],
    ["packageExportsEmpty", true],
    ["productionImport", "forbidden"],
    ["mainAppReachable", false],
    ["candidateCallSitesWiredToGate", false],
    ["activeReleaseLineInherited", false],
    ["targetSchema", null],
    ["migrationId", null],
    ["mutationEpochAvailable", false],
    ["mutationEpochReceipt", null]
  ])],
  ["integrityBoundary", frozenRecord([
    ["digestAlgorithm", POLICY_DIGEST_ALGORITHM],
    ["digestIsDigitalSignature", false],
    ["signerIdentity", null],
    ["digitalSignature", null],
    ["postImportIntrinsicHardeningOnly", true],
    ["preImportIntrinsicIntegrityEstablished", false]
  ])]
]);

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [value]) as string;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!REFLECT_APPLY(NUMBER_IS_FINITE, NATIVE_NUMBER, [value])) throw new NATIVE_ERROR("Non-finite policy number");
    return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [value]) as string;
  }
  if (ARRAY_IS_ARRAY(value)) {
    let result = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) result += ",";
      result += canonicalize(value[index]);
    }
    return `${result}]`;
  }
  if (typeof value !== "object") throw new NATIVE_ERROR("Unsupported policy value");
  const prototype = OBJECT_GET_PROTOTYPE_OF(value);
  if (prototype !== null && prototype !== NATIVE_OBJECT.prototype) {
    throw new NATIVE_ERROR("Policy record must be an ordinary record");
  }
  const ownKeys = REFLECT_OWN_KEYS(value);
  for (let ownKeyIndex = 0; ownKeyIndex < ownKeys.length; ownKeyIndex += 1) {
    if (typeof ownKeys[ownKeyIndex] === "symbol") {
      throw new NATIVE_ERROR("Policy record must not contain symbol keys");
    }
  }
  const keys = OBJECT_KEYS(value);
  REFLECT_APPLY(ARRAY_SORT, keys, []);
  let result = "{";
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === undefined) throw new NATIVE_ERROR("Policy record key is missing");
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, key);
    if (!descriptor || !("value" in descriptor)) throw new NATIVE_ERROR("Policy record accessor rejected");
    if (index > 0) result += ",";
    result += `${REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [key]) as string}:${canonicalize(descriptor.value)}`;
  }
  return `${result}}`;
}

const POLICY_CANONICAL_JSON = canonicalize(POLICY_BASE);

function bytesToHex(bytes: Uint8Array): string {
  const alphabet = "0123456789abcdef";
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const value = bytes[index];
    if (value === undefined) throw new NATIVE_ERROR("Digest byte is missing");
    result += alphabet[(value >>> 4) & 0x0f] ?? "";
    result += alphabet[value & 0x0f] ?? "";
  }
  return result;
}

async function sha256Utf8(value: string): Promise<string> {
  if (!INTERNAL_SUBTLE || !SUBTLE_DIGEST) throw new NATIVE_ERROR("WebCrypto unavailable");
  const bytes = REFLECT_APPLY(TEXT_ENCODER_ENCODE, INTERNAL_TEXT_ENCODER, [value]) as Uint8Array;
  const digest = await REFLECT_APPLY(SUBTLE_DIGEST, INTERNAL_SUBTLE, [POLICY_DIGEST_ALGORITHM, bytes]);
  return bytesToHex(new NATIVE_UINT8_ARRAY(digest));
}

async function assertInternalPolicyIntegrity(): Promise<void> {
  const actual = await sha256Utf8(POLICY_CANONICAL_JSON);
  if (actual !== POLICY_DIGEST) {
    throw new ZiweiHighRiskEgressError(
      "POLICY_INTEGRITY_FAILURE",
      "The isolated high-risk policy failed closed."
    );
  }
}

function deepFreezeInternal<T>(value: T): T {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
  const keys = REFLECT_OWN_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === undefined) throw new NATIVE_ERROR("Internal object key is missing");
    const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(value, key);
    if (!descriptor || !("value" in descriptor)) throw new NATIVE_ERROR("Internal accessor rejected");
    deepFreezeInternal(descriptor.value);
  }
  return OBJECT_FREEZE(value);
}

function getOwnDataValue(record: object, key: string): unknown {
  const descriptor = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(record, key);
  if (!descriptor || !("value" in descriptor)) throw new NATIVE_ERROR("Internal branded record is malformed");
  return descriptor.value;
}

function hasRegisteredSurface(surfaceId: string): boolean {
  for (let index = 0; index < SURFACE_DEFINITIONS.length; index += 1) {
    const definition = SURFACE_DEFINITIONS[index];
    if (definition && getOwnDataValue(definition, "surfaceId") === surfaceId) return true;
  }
  return false;
}

const SEPARATOR_CHARACTERS =
  "·•，,。.!！?？、;；:：\"'“”‘’（）()【】[]《》<>_-";

function isSkippedRiskMatchingCodeUnit(codeUnit: number, character: string): boolean {
  if (codeUnit <= 0x20 || codeUnit === 0x00a0 || codeUnit === 0x1680
    || (codeUnit >= 0x2000 && codeUnit <= 0x200a)
    || codeUnit === 0x2028 || codeUnit === 0x2029 || codeUnit === 0x202f
    || codeUnit === 0x205f || codeUnit === 0x3000) return true;
  // Unicode default-ignorable and bidi-format controls must not split a token.
  // Supplementary tags/variation selectors are handled as surrogate pairs in
  // normalizeForRiskMatching below.
  if (codeUnit === 0x00ad || codeUnit === 0x034f || codeUnit === 0x061c
    || (codeUnit >= 0x115f && codeUnit <= 0x1160)
    || (codeUnit >= 0x17b4 && codeUnit <= 0x17b5)
    || (codeUnit >= 0x180b && codeUnit <= 0x180f)
    || (codeUnit >= 0x200b && codeUnit <= 0x200f)
    || (codeUnit >= 0x202a && codeUnit <= 0x202e)
    || (codeUnit >= 0x2060 && codeUnit <= 0x206f)
    || codeUnit === 0x3164
    || (codeUnit >= 0xfe00 && codeUnit <= 0xfe0f)
    || codeUnit === 0xfeff || codeUnit === 0xffa0
    || (codeUnit >= 0xfff0 && codeUnit <= 0xfff8)) {
    return true;
  }
  return REFLECT_APPLY(STRING_INCLUDES, SEPARATOR_CHARACTERS, [character]) as boolean;
}

function normalizeForRiskMatching(text: string): string {
  const normalized = REFLECT_APPLY(STRING_NORMALIZE, text, ["NFKC"]) as string;
  let result = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const codeUnit = REFLECT_APPLY(STRING_CHAR_CODE_AT, normalized, [index]) as number;
    const nextCodeUnit = index + 1 < normalized.length
      ? REFLECT_APPLY(STRING_CHAR_CODE_AT, normalized, [index + 1]) as number
      : -1;
    if (codeUnit === 0xdb40 && nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
      index += 1;
      continue;
    }
    const character = normalized[index] ?? "";
    if (!isSkippedRiskMatchingCodeUnit(codeUnit, character)) result += character;
  }
  return result;
}

function scanRiskCategories(displayText: string): readonly string[] {
  const normalized = normalizeForRiskMatching(displayText);
  const result: string[] = [];
  for (let categoryIndex = 0; categoryIndex < RISK_CATEGORY_DEFINITIONS.length; categoryIndex += 1) {
    const category = RISK_CATEGORY_DEFINITIONS[categoryIndex];
    if (!category) throw new NATIVE_ERROR("Risk category is missing");
    const tokens = getOwnDataValue(category, "tokens");
    if (!ARRAY_IS_ARRAY(tokens)) throw new NATIVE_ERROR("Risk token registry is malformed");
    let matched = false;
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const token = tokens[tokenIndex];
      if (typeof token !== "string") throw new NATIVE_ERROR("Risk token is malformed");
      if (REFLECT_APPLY(STRING_INCLUDES, normalized, [token]) as boolean) {
        matched = true;
        break;
      }
    }
    if (matched) {
      const categoryId = getOwnDataValue(category, "categoryId");
      if (typeof categoryId !== "string") throw new NATIVE_ERROR("Risk category identity is malformed");
      appendValue(result, categoryId);
    }
  }
  return OBJECT_FREEZE(result);
}

export type ZiweiHighRiskEgressErrorCode =
  | "INVALID_REQUEST_FIELD"
  | "UNREGISTERED_EGRESS_SURFACE"
  | "BOUNDARY_ESCALATION_REJECTED"
  | "UNBRANDED_REQUEST"
  | "POLICY_INTEGRITY_FAILURE";

export class ZiweiHighRiskEgressError extends NATIVE_ERROR {
  readonly code!: ZiweiHighRiskEgressErrorCode;

  constructor(code: ZiweiHighRiskEgressErrorCode, message: string) {
    super(message);
    OBJECT_DEFINE_PROPERTY(this, "name", {
      value: "ZiweiHighRiskEgressError",
      enumerable: false,
      configurable: true,
      writable: true
    });
    OBJECT_DEFINE_PROPERTY(this, "code", {
      value: code,
      enumerable: true,
      configurable: false,
      writable: false
    });
  }
}

export type ZiweiHighRiskEgressRequest = Readonly<{
  requestVersion: typeof REQUEST_VERSION;
  surfaceId: string;
  displayText: string;
  result: null;
  eventOutcome: null;
  goodBadOrientation: null;
  scoringAllowed: false;
  directOutcomeAllowed: false;
  deterministicPersonalOutcomeAllowed: false;
  expertTruthClaimed: false;
  formalActivationAllowed: false;
  productionEligible: false;
}>;

export type ZiweiHighRiskEgressReceipt = Readonly<{
  receiptVersion: typeof RECEIPT_VERSION;
  policyId: typeof POLICY_ID;
  policyVersion: typeof POLICY_VERSION;
  policyDigest: string;
  policyDigestAlgorithm: typeof POLICY_DIGEST_ALGORITHM;
  surfaceRegistryVersion: typeof SURFACE_REGISTRY_VERSION;
  surfaceId: string;
  action: "pass_through" | "neutralized";
  triggeredRiskCategoryIds: readonly string[];
  birthDataIncluded: false;
  candidateTextIncluded: false;
  candidateTextDigestIncluded: false;
  personalDerivedDigestIncluded: false;
  sourceBodyIncluded: false;
  mutationPerformed: false;
  result: null;
  eventOutcome: null;
  goodBadOrientation: null;
  scoringAllowed: false;
  directOutcomeAllowed: false;
  deterministicPersonalOutcomeAllowed: false;
  expertTruthClaimed: false;
  formalActivationAllowed: false;
  semanticSafetyEstablished: false;
  surfaceCallerAuthenticityEstablished: false;
  registeredSurfaceCallGraphClosureEstablished: false;
  preImportIntrinsicIntegrityEstablished: false;
  contentTruthEstablished: false;
  domainAuthorityAuthorized: false;
  expertTruthEstablished: false;
  expertIdentityVerified: false;
  independentExpertReviewsVerified: 0;
  expertClaimsAuthorized: false;
  workRightsEstablished: false;
  editionRightsEstablished: false;
  carrierRightsEstablished: false;
  rightsLegalConclusionEstablished: false;
  redistributionAuthorized: false;
  formalAdmissionAuthorized: false;
  releaseEvidenceComplete: false;
  releaseReady: false;
  publicBuildInclusionAuthorized: false;
  publicDeploymentAuthorized: false;
  publicReleaseAuthorized: false;
  productionEligible: false;
  receiptDigestIsDigitalSignature: false;
  mutationEpochAvailable: false;
  mutationEpochReceipt: null;
}>;

export type ZiweiHighRiskEgressDecision = Readonly<{
  decisionVersion: typeof DECISION_VERSION;
  surfaceId: string;
  action: "pass_through" | "neutralized";
  displayText: string;
  receipt: ZiweiHighRiskEgressReceipt;
}>;

const REQUEST_BRAND = new NATIVE_WEAK_SET<object>();
const RECEIPT_BRAND = new NATIVE_WEAK_SET<object>();
const DECISION_BRAND = new NATIVE_WEAK_SET<object>();

function addBrand(set: WeakSet<object>, value: object): void {
  REFLECT_APPLY(WEAK_SET_ADD, set, [value]);
}

function hasBrand(set: WeakSet<object>, value: unknown): value is object {
  return (typeof value === "object" && value !== null)
    ? REFLECT_APPLY(WEAK_SET_HAS, set, [value]) as boolean
    : false;
}

function requirePrimitiveString(value: unknown): string {
  if (typeof value !== "string") {
    throw new ZiweiHighRiskEgressError("INVALID_REQUEST_FIELD", "A primitive string field was rejected.");
  }
  return value;
}

export function createZiweiHighRiskEgressRequest(
  surfaceIdValue: unknown,
  displayTextValue: unknown,
  resultValue: unknown,
  eventOutcomeValue: unknown,
  goodBadOrientationValue: unknown,
  scoringAllowedValue: unknown,
  directOutcomeAllowedValue: unknown,
  deterministicPersonalOutcomeAllowedValue: unknown,
  expertTruthClaimedValue: unknown,
  formalActivationAllowedValue: unknown,
  productionEligibleValue: unknown
): ZiweiHighRiskEgressRequest {
  const surfaceId = requirePrimitiveString(surfaceIdValue);
  const displayText = requirePrimitiveString(displayTextValue);
  if (!hasRegisteredSurface(surfaceId)) {
    throw new ZiweiHighRiskEgressError(
      "UNREGISTERED_EGRESS_SURFACE",
      "An unregistered Ziwei candidate egress surface was rejected."
    );
  }
  const trimmed = REFLECT_APPLY(STRING_TRIM, displayText, []) as string;
  if (trimmed.length === 0 || displayText.length > MAX_DISPLAY_TEXT_CODE_UNITS
    || (REFLECT_APPLY(STRING_INDEX_OF, displayText, ["\u0000"]) as number) >= 0) {
    throw new ZiweiHighRiskEgressError("INVALID_REQUEST_FIELD", "Candidate display text was rejected.");
  }
  if (resultValue !== null || eventOutcomeValue !== null || goodBadOrientationValue !== null
    || scoringAllowedValue !== false || directOutcomeAllowedValue !== false
    || deterministicPersonalOutcomeAllowedValue !== false || expertTruthClaimedValue !== false
    || formalActivationAllowedValue !== false || productionEligibleValue !== false) {
    throw new ZiweiHighRiskEgressError(
      "BOUNDARY_ESCALATION_REJECTED",
      "A Ziwei candidate authority or outcome escalation was rejected."
    );
  }

  const request = deepFreezeInternal(nullRecord([
    ["requestVersion", REQUEST_VERSION],
    ["surfaceId", surfaceId],
    ["displayText", displayText],
    ["result", null],
    ["eventOutcome", null],
    ["goodBadOrientation", null],
    ["scoringAllowed", false],
    ["directOutcomeAllowed", false],
    ["deterministicPersonalOutcomeAllowed", false],
    ["expertTruthClaimed", false],
    ["formalActivationAllowed", false],
    ["productionEligible", false]
  ])) as ZiweiHighRiskEgressRequest;
  addBrand(REQUEST_BRAND, request);
  return request;
}

function buildReceipt(
  surfaceId: string,
  action: "pass_through" | "neutralized",
  triggeredRiskCategoryIds: readonly string[]
): ZiweiHighRiskEgressReceipt {
  const receipt = deepFreezeInternal(nullRecord([
    ["receiptVersion", RECEIPT_VERSION],
    ["policyId", POLICY_ID],
    ["policyVersion", POLICY_VERSION],
    ["policyDigest", POLICY_DIGEST],
    ["policyDigestAlgorithm", POLICY_DIGEST_ALGORITHM],
    ["surfaceRegistryVersion", SURFACE_REGISTRY_VERSION],
    ["surfaceId", surfaceId],
    ["action", action],
    ["triggeredRiskCategoryIds", triggeredRiskCategoryIds],
    ["birthDataIncluded", false],
    ["candidateTextIncluded", false],
    ["candidateTextDigestIncluded", false],
    ["personalDerivedDigestIncluded", false],
    ["sourceBodyIncluded", false],
    ["mutationPerformed", false],
    ["result", null],
    ["eventOutcome", null],
    ["goodBadOrientation", null],
    ["scoringAllowed", false],
    ["directOutcomeAllowed", false],
    ["deterministicPersonalOutcomeAllowed", false],
    ["expertTruthClaimed", false],
    ["formalActivationAllowed", false],
    ["semanticSafetyEstablished", false],
    ["surfaceCallerAuthenticityEstablished", false],
    ["registeredSurfaceCallGraphClosureEstablished", false],
    ["preImportIntrinsicIntegrityEstablished", false],
    ["contentTruthEstablished", false],
    ["domainAuthorityAuthorized", false],
    ["expertTruthEstablished", false],
    ["expertIdentityVerified", false],
    ["independentExpertReviewsVerified", 0],
    ["expertClaimsAuthorized", false],
    ["workRightsEstablished", false],
    ["editionRightsEstablished", false],
    ["carrierRightsEstablished", false],
    ["rightsLegalConclusionEstablished", false],
    ["redistributionAuthorized", false],
    ["formalAdmissionAuthorized", false],
    ["releaseEvidenceComplete", false],
    ["releaseReady", false],
    ["publicBuildInclusionAuthorized", false],
    ["publicDeploymentAuthorized", false],
    ["publicReleaseAuthorized", false],
    ["productionEligible", false],
    ["receiptDigestIsDigitalSignature", false],
    ["mutationEpochAvailable", false],
    ["mutationEpochReceipt", null]
  ])) as ZiweiHighRiskEgressReceipt;
  addBrand(RECEIPT_BRAND, receipt);
  return receipt;
}

export async function evaluateZiweiHighRiskEgressRequest(
  requestValue: unknown
): Promise<ZiweiHighRiskEgressDecision> {
  if (!hasBrand(REQUEST_BRAND, requestValue)) {
    throw new ZiweiHighRiskEgressError("UNBRANDED_REQUEST", "An unbranded Ziwei egress request was rejected.");
  }
  if (!OBJECT_IS_FROZEN(requestValue)) {
    throw new ZiweiHighRiskEgressError("UNBRANDED_REQUEST", "A mutable Ziwei egress request was rejected.");
  }
  await assertInternalPolicyIntegrity();
  const surfaceId = getOwnDataValue(requestValue, "surfaceId");
  const displayText = getOwnDataValue(requestValue, "displayText");
  if (typeof surfaceId !== "string" || typeof displayText !== "string" || !hasRegisteredSurface(surfaceId)) {
    throw new ZiweiHighRiskEgressError("UNBRANDED_REQUEST", "A malformed Ziwei egress request was rejected.");
  }
  const categories = scanRiskCategories(displayText);
  const action = categories.length === 0 ? "pass_through" : "neutralized";
  const receipt = buildReceipt(surfaceId, action, categories);
  const decision = deepFreezeInternal(nullRecord([
    ["decisionVersion", DECISION_VERSION],
    ["surfaceId", surfaceId],
    ["action", action],
    ["displayText", action === "pass_through" ? displayText : NEUTRAL_FALLBACK],
    ["receipt", receipt]
  ])) as ZiweiHighRiskEgressDecision;
  addBrand(DECISION_BRAND, decision);
  return decision;
}

export function isZiweiHighRiskEgressRequest(value: unknown): value is ZiweiHighRiskEgressRequest {
  return hasBrand(REQUEST_BRAND, value) && OBJECT_IS_FROZEN(value);
}

export function isZiweiHighRiskEgressReceipt(value: unknown): value is ZiweiHighRiskEgressReceipt {
  return hasBrand(RECEIPT_BRAND, value) && OBJECT_IS_FROZEN(value);
}

export function isZiweiHighRiskEgressDecision(value: unknown): value is ZiweiHighRiskEgressDecision {
  return hasBrand(DECISION_BRAND, value) && OBJECT_IS_FROZEN(value);
}

export function getZiweiHighRiskExpressionPolicyCanonicalJson(): string {
  return POLICY_CANONICAL_JSON;
}

export function getZiweiHighRiskExpressionPolicySnapshot(): Readonly<NullRecord> {
  return POLICY_BASE;
}

export async function verifyZiweiHighRiskExpressionPolicyCanonicalJson(
  canonicalJsonValue: unknown,
  claimedDigestValue: unknown
): Promise<boolean> {
  if (typeof canonicalJsonValue !== "string" || typeof claimedDigestValue !== "string") return false;
  if (canonicalJsonValue !== POLICY_CANONICAL_JSON || claimedDigestValue !== POLICY_DIGEST) return false;
  try {
    return await sha256Utf8(canonicalJsonValue) === POLICY_DIGEST;
  } catch {
    return false;
  }
}

export const ZIWEI_HIGH_RISK_EXPRESSION_POLICY_ID = POLICY_ID;
export const ZIWEI_HIGH_RISK_EXPRESSION_POLICY_VERSION = POLICY_VERSION;
export const ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST = POLICY_DIGEST;
export const ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DIGEST_ALGORITHM = POLICY_DIGEST_ALGORITHM;
export const ZIWEI_HIGH_RISK_EGRESS_SURFACE_REGISTRY_VERSION = SURFACE_REGISTRY_VERSION;
export const ZIWEI_HIGH_RISK_EGRESS_NEUTRAL_FALLBACK = NEUTRAL_FALLBACK;

function projectIdentityList(definitions: readonly Readonly<NullRecord>[], key: string): readonly string[] {
  const identities: string[] = [];
  for (let index = 0; index < definitions.length; index += 1) {
    const definition = definitions[index];
    if (!definition) throw new NATIVE_ERROR("Policy definition is missing");
    const identity = getOwnDataValue(definition, key);
    if (typeof identity !== "string") throw new NATIVE_ERROR("Policy identity is malformed");
    appendValue(identities, identity);
  }
  return frozenArray(identities);
}

export const ZIWEI_HIGH_RISK_EGRESS_SURFACE_IDS = projectIdentityList(
  SURFACE_DEFINITIONS,
  "surfaceId"
);
export const ZIWEI_HIGH_RISK_CATEGORY_IDS = projectIdentityList(
  RISK_CATEGORY_DEFINITIONS,
  "categoryId"
);
