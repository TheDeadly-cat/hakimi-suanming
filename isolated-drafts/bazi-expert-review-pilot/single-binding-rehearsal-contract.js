const OBJECT_KEYS = Object.keys;
const OBJECT_VALUES = Object.values;
const OBJECT_FREEZE = Object.freeze;
const REFLECT_APPLY = Reflect.apply;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_MAP_SET = WeakMap.prototype.set;
const WEAK_MAP_GET = WeakMap.prototype.get;

export const SINGLE_BINDING_REHEARSAL_VERSION =
  "hakimi.bazi.expert-single-binding-nocode-rehearsal/1.0.0";
export const SINGLE_BINDING_REHEARSAL_PURPOSE =
  "synthetic_single_binding_question_surface_rehearsal_only";
export const SINGLE_BINDING_REHEARSAL_RECORD_TYPES = OBJECT_FREEZE([
  "bazi_expert_single_binding_nocode_rehearsal_draft_v1",
  "bazi_expert_single_binding_nocode_rehearsal_readback_candidate_v1",
  "bazi_expert_single_binding_nocode_rehearsal_submission_candidate_v1"
]);

export const SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE = OBJECT_FREEZE({
  releaseIdentity: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  schema13MutationEpochUsed: false,
  reviewCycleEpochIsSchema13MutationEpoch: false,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

export const SINGLE_BINDING_REHEARSAL_BOUNDARY = OBJECT_FREEZE({
  syntheticOnly: true,
  syntheticOnlyScope: "fixed_fixture_and_authorized_rehearsal_use_only",
  syntheticFixtureOnly: true,
  freeTextSyntheticOnlyVerified: false,
  userFreeTextContentClass: "unassessed_private",
  selectedBindingCount: 1,
  realExpertMaterialCollectionAuthorized: false,
  realPersonDataCollectionAuthorized: false,
  personDataPresenceAssessed: false,
  personDerivedDigestExcluded: false,
  repositoryStorageAllowed: false,
  networkUploadPerformed: false,
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
  seatCrossOpinionVisibilityProvided: false,
  actualHumanIndependenceEstablished: false,
  authorshipBlindingEstablished: false,
  winnerSelectionAllowed: false,
  majorityVoteAllowed: false,
  opinionAveragingAllowed: false,
  generatedModelAdjudicationAllowed: false,
  coordinatorVerbatimEntryVerified: false,
  reviewerReadbackVerified: false,
  assistanceDisclosureIsSelfDeclarationOnly: true,
  externalAssistanceExcluded: false,
  opinionAuthenticityEstablished: false,
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

function freezeArray(values) {
  return OBJECT_FREEZE(values.map((value) => OBJECT_FREEZE(value)));
}

export const POSITION_OPTIONS = freezeArray([
  { value: "support", label: "可以作为继续验证的候选" },
  { value: "oppose", label: "不建议采用这组候选分界" },
  { value: "conditional", label: "补足条件或证据后才可考虑" },
  { value: "cannot_decide", label: "目前无法判断" }
]);

export const CANNOT_DECIDE_REASON_OPTIONS = freezeArray([
  { value: "materials_insufficient", label: "本页材料不足" },
  { value: "question_unclear", label: "题意或词语不清" },
  { value: "outside_tradition", label: "超出我的流派或复核范围" },
  { value: "source_or_version_unclear", label: "来源、版本或口径不清" },
  { value: "other", label: "其他原因" }
]);

export const ENTRY_METHOD_OPTIONS = freezeArray([
  { value: "expert_self_entered", label: "专家本人输入" },
  { value: "coordinator_verbatim_transcription", label: "专家口述，协调人逐字代录" }
]);

export const ASSISTANCE_CATEGORY_OPTIONS = freezeArray([
  { value: "none_declared", label: "未使用其他协助" },
  { value: "another_person", label: "曾向其他人询问或讨论" },
  { value: "books_or_source_materials", label: "查阅了书籍或其他资料" },
  { value: "ai_or_software_tool", label: "使用了 AI 或其他软件工具" },
  { value: "unknown_or_not_disclosed", label: "不确定或不便披露" }
]);

export const HIGH_RISK_OPTIONS = freezeArray([
  { value: "conservative_expression_only", label: "只能保守表述" },
  { value: "defer", label: "材料补齐前暂不作结论" },
  { value: "no_release", label: "不应向用户展示" },
  { value: "not_applicable", label: "本题不涉及面向用户的结论" }
]);

export const SYNTHETIC_SINGLE_BINDING_FIXTURE = OBJECT_FREEZE({
  fixtureId: "bazi-single-binding-nocode-rehearsal/thresholds-synthetic-v1",
  bindingId: "binding:policy:thresholds",
  questionId: "single-binding-rehearsal-thresholds-v1",
  title: "旺衰五档候选分界",
  question:
    "仅依据本页材料，您是否支持把 25%、43%、57%、75% 作为待进一步验证的候选分界？如果材料不足，请选择“目前无法判断”并注明原因；不要凭记忆补写真人案例。",
  reviewWhat: OBJECT_FREEZE([
    "这组分界作为待验证候选是否讲得通",
    "它在什么条件下才可能成立",
    "哪些反例、结构或证据会推翻它",
    "材料不足时应补什么，以及面向用户应怎样保守表达"
  ]),
  notReviewing: OBJECT_FREEZE([
    "不判断任何真人命盘、人生事件或吉凶",
    "不比较专家与 AI 谁更准确，也不产生准确度分数",
    "不裁定来源许可、法律结论、发布就绪或公开授权",
    "不审其余 11 条 Binding，也不外推到紫微、西洋或吠陀"
  ]),
  availableMaterials: freezeArray([
    {
      materialId: "synthetic-threshold-tuple",
      title: "固定候选分界",
      description: "25%、43%、57%、75%；只作为工程候选，不是专家或来源结论。",
      status: "available_synthetic_only"
    },
    {
      materialId: "synthetic-boundary-examples",
      title: "四个临界例子",
      description: "42%→偏弱，43%→相对中和，57%→相对中和，58%→偏强。",
      status: "available_synthetic_only"
    },
    {
      materialId: "direction-glossary",
      title: "页面用词说明",
      description: "“助身侧／泄耗克侧”只说明当前两侧计算，不表示吉凶、喜忌或准确度。",
      status: "available_synthetic_only"
    },
    {
      materialId: "scope-boundary",
      title: "审阅范围说明",
      description: "本轮只测试中文题面、回答结构和口述确认流程。",
      status: "available_synthetic_only"
    }
  ]),
  missingMaterials: freezeArray([
    {
      materialId: "reliable-outcome-labelled-case-set",
      title: "可靠且带结果标签的案例集",
      consequence: "缺失；不能据此证明预测准确度或阈值有效性。",
      status: "missing"
    },
    {
      materialId: "frozen-source-version-and-exact-quotes",
      title: "冻结的可靠底本、版本与 exact quote",
      consequence: "缺失；不能据此建立内容或来源真值。",
      status: "missing"
    },
    {
      materialId: "work-edition-carrier-rights",
      title: "作品层、版本层与载体层权利依据",
      consequence: "缺失；不能据此形成许可或法律结论。",
      status: "missing"
    },
    {
      materialId: "verified-independent-human-experts",
      title: "两位身份、资质与独立性经核验的现实专家",
      consequence: "当前 0/2；本演练不能增加专家计数。",
      status: "missing"
    },
    {
      materialId: "frozen-binding-set",
      title: "正式冻结的 12 条 Binding",
      consequence: "当前 0/12；本演练不能冻结任何 Binding。",
      status: "missing"
    }
  ]),
  boundaryExamples: freezeArray([
    { supportPercent: 42, candidateBand: "偏弱" },
    { supportPercent: 43, candidateBand: "相对中和" },
    { supportPercent: 57, candidateBand: "相对中和" },
    { supportPercent: 58, candidateBand: "偏强" }
  ])
});

export const SYNTHETIC_REHEARSAL_FIXTURE_REF = OBJECT_FREEZE({
  identityClass: "synthetic_rehearsal_manifest_identity_only",
  syntheticRehearsalManifestId:
    "bazi-single-binding-synthetic-rehearsal-manifest/d97377310d2877cb980ca5e9137ad281e4e102c984be269436a595e3485c1109",
  syntheticRehearsalManifestDigest: "d97377310d2877cb980ca5e9137ad281e4e102c984be269436a595e3485c1109",
  fixtureId: SYNTHETIC_SINGLE_BINDING_FIXTURE.fixtureId,
  fixtureContentDigest: "2c735950ac976a942de7f38f93fec517f077e1739cf87f7ad57b412998d36d21",
  questionSetId: "bazi-single-binding-synthetic-rehearsal-question-set/1.0.0",
  questionSetDigest: "fe9bcb2dfc2d32f20eae1411cbd47d4ac55e500c6e53049508c502a9252a5b31",
  bindingId: SYNTHETIC_SINGLE_BINDING_FIXTURE.bindingId,
  evidenceSubjectId: "bazi.strength.binding.policy.thresholds.v1",
  candidateId: "synthetic-rehearsal:hakimi-strength-thresholds-engineering-candidate-v1",
  candidateDigest: "b4f0d3564a6ad8b1d2174061ddf42b855b6929fb9d9f54f5512366e3d82ff373",
  candidateStatusCode: "pre_freeze_candidate",
  formalBindingDigest: null,
  formalReviewInputManifestAuthorityEstablished: false,
  currentWorkspaceCandidateIdentityVerified: false
});

const POSITION_VALUES = new Set(POSITION_OPTIONS.map((option) => option.value));
const CANNOT_REASON_VALUES = new Set(CANNOT_DECIDE_REASON_OPTIONS.map((option) => option.value));
const ENTRY_METHOD_VALUES = new Set(ENTRY_METHOD_OPTIONS.map((option) => option.value));
const ASSISTANCE_VALUES = new Set(ASSISTANCE_CATEGORY_OPTIONS.map((option) => option.value));
const ASSISTANCE_ORDER = new Map(
  ASSISTANCE_CATEGORY_OPTIONS.map((option, index) => [option.value, index])
);
const RISK_VALUES = new Set(HIGH_RISK_OPTIONS.map((option) => option.value));
const REQUIRED_TEXT_FIELDS = OBJECT_FREEZE([
  "rationale",
  "applicabilityConditions",
  "counterexamplesOrNeededEvidence",
  "revisionSuggestion"
]);
const FINAL_CONFIRMATION_KEYS = OBJECT_FREEZE([
  "fullTextReadBackAndAccurate",
  "noCrossSeatOpinionAccess",
  "accuracyStudyExcluded",
  "privateSyntheticHandling"
]);
const SENSITIVE_TEXT_RULES = OBJECT_FREEZE([
  OBJECT_FREEZE({
    code: "contact_detail",
    pattern: /(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?86[- ]?)?1[3-9](?:[- ]?\d){9}|(?:电话|手机|微信|QQ|邮箱|联系方式)\s*(?:[:：=]|为|是)?\s*[A-Za-z0-9._+@ -]{5,})/iu,
    message: "检测到联系方式；本演练不接收真人资料"
  }),
  OBJECT_FREEZE({
    code: "identity_detail",
    pattern: /(?:\b\d{17}[\dXx]\b|(?:姓名|名字|专家名|身份证|护照|证件号|执业证号|机构|单位)\s*(?:[:：=]|为|是|叫)?\s*\S{2,})/iu,
    message: "检测到姓名、身份、证件或机构信息；本演练不接收真人资料"
  }),
  OBJECT_FREEZE({
    code: "birth_detail",
    pattern: /(?:(?:19|20)\d{2}\s*(?:[-/.年])\s*(?:0?[1-9]|1[0-2])\s*(?:[-/.月])\s*(?:0?[1-9]|[12]\d|3[01])\s*日?|[一二][零〇一二三四五六七八九]{3}年[零〇一二两三四五六七八九十]{1,3}月[零〇一二两三四五六七八九十]{1,3}日|(?:出生地|出生时间|生于|住址|地址)\s*(?:[:：=]|为|是)?\s*\S{2,})/iu,
    message: "检测到出生或地址信息；本演练不接收真人资料"
  }),
  OBJECT_FREEZE({
    code: "real_case_detail",
    pattern: /(?:(?:真实|实际|我的|客户|来访者|当事人|命主).{0,16}(?:案例|个案|出生|经历|事件)|(?:我有|一位)\s*(?:客户|来访者|当事人|命主))/iu,
    message: "检测到现实案例叙述；请只讨论本页合成题面"
  }),
  OBJECT_FREEZE({
    code: "accuracy_study_detail",
    pattern: /(?:准确率|准确度|命中(?:率)?|胜率|预测表现|(?:AI|人工智能|模型|专家).{0,20}(?:更准|较准|准确率|准确度|命中|优于|好于|差于)|(?:更准|较准|优于|好于|差于).{0,20}(?:AI|人工智能|模型|专家))/iu,
    message: "检测到准确度、样本命中或专家/AI 比较叙述；本题面不接收准确度研究材料"
  })
]);

export class SingleBindingRehearsalError extends Error {
  constructor(code, message, errors = []) {
    super(message);
    this.name = "SingleBindingRehearsalError";
    this.code = code;
    this.errors = errors;
  }
}

const DRAFT_BRAND = new WeakSet();
const READBACK_BRAND = new WeakSet();
const SUBMISSION_BRAND = new WeakSet();
const PRIVATE_DRAFT_STATE = new WeakMap();
const PRIVATE_READBACK_STATE = new WeakMap();
const PRIVATE_SUBMISSION_STATE = new WeakMap();

function call(fn, thisArg, args) {
  return REFLECT_APPLY(fn, thisArg, args);
}

function fail(code, message, errors = []) {
  throw new SingleBindingRehearsalError(code, message, errors);
}

function captureJson(value, state = { nodes: 0, active: new WeakSet() }, depth = 0) {
  state.nodes += 1;
  if (state.nodes > 10_000 || depth > 32) fail("INPUT_LIMIT_EXCEEDED", "演练输入超过结构上限。 ");
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INPUT_VALUE_INVALID", "演练输入含非法数值。 ");
    return value;
  }
  if (typeof value !== "object" || state.active.has(value)) fail("INPUT_VALUE_INVALID", "演练输入必须是无循环 JSON 值。 ");
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype || value.length > 256) fail("INPUT_ARRAY_INVALID", "演练输入数组无效。 ");
    state.active.add(value);
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) fail("INPUT_ARRAY_INVALID", "演练输入不接受稀疏数组。 ");
      result.push(captureJson(value[index], state, depth + 1));
    }
    state.active.delete(value);
    return result;
  }
  if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "演练输入只接受普通 JSON 对象。 ");
  state.active.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = {};
  for (const key of OBJECT_KEYS(descriptors)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) fail("INPUT_KEY_INVALID", "演练输入含禁止键。 ");
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || descriptor.get || descriptor.set) fail("INPUT_ACCESSOR_FORBIDDEN", "演练输入不接受访问器字段。 ");
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

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(OBJECT_KEYS(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  return value;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalValue(value));
}

async function sha256Domain(domain, value) {
  if (!globalThis.crypto?.subtle) fail("WEB_CRYPTO_UNAVAILABLE", "当前环境缺少 Web Crypto SHA-256。 ");
  const bytes = new TextEncoder().encode(`${domain}\0${canonicalStringify(value)}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function computeSyntheticRehearsalIdentityDigests(
  fixtureInput = SYNTHETIC_SINGLE_BINDING_FIXTURE
) {
  const fixture = captureJson(fixtureInput);
  const questionSetSeed = {
    questionSetId: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetId,
    questionSetVersion: "1.0.0",
    questions: [{
      questionId: fixture.questionId,
      bindingId: fixture.bindingId,
      question: fixture.question,
      reviewWhat: fixture.reviewWhat,
      notReviewing: fixture.notReviewing
    }]
  };
  const questionSetDigest = await sha256Domain(
    "hakimi/bazi/expert-single-binding-nocode-rehearsal/question-set/v1",
    questionSetSeed
  );
  const candidateSeed = {
    identityClass: "synthetic_rehearsal_candidate_only",
    bindingId: fixture.bindingId,
    evidenceSubjectId: SYNTHETIC_REHEARSAL_FIXTURE_REF.evidenceSubjectId,
    candidateId: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateId,
    candidateStatusCode: "pre_freeze_candidate",
    formalBindingDigest: null,
    displayedThresholdPercentages: [25, 43, 57, 75],
    authorityBoundary: "synthetic_rehearsal_no_formal_or_expert_authority"
  };
  const candidateDigest = await sha256Domain(
    "hakimi/bazi/expert-single-binding-nocode-rehearsal/candidate/v1",
    candidateSeed
  );
  const fixtureContentDigest = await sha256Domain(
    "hakimi/bazi/expert-single-binding-nocode-rehearsal/fixture-content/v1",
    fixture
  );
  const manifestSeed = {
    identityClass: "synthetic_rehearsal_manifest_identity_only",
    manifestVersion: "1.0.0",
    fixtureId: fixture.fixtureId,
    fixtureContentDigest,
    questionSetId: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetId,
    questionSetDigest,
    bindingId: fixture.bindingId,
    evidenceSubjectId: SYNTHETIC_REHEARSAL_FIXTURE_REF.evidenceSubjectId,
    candidateId: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateId,
    candidateDigest,
    candidateStatusCode: "pre_freeze_candidate",
    formalBindingDigest: null,
    formalReviewInputManifestAuthorityEstablished: false,
    currentWorkspaceCandidateIdentityVerified: false
  };
  const syntheticRehearsalManifestDigest = await sha256Domain(
    "hakimi/bazi/expert-single-binding-nocode-rehearsal/synthetic-manifest/v1",
    manifestSeed
  );
  return deepFreeze({
    questionSetDigest,
    candidateDigest,
    fixtureContentDigest,
    syntheticRehearsalManifestDigest,
    syntheticRehearsalManifestId:
      `bazi-single-binding-synthetic-rehearsal-manifest/${syntheticRehearsalManifestDigest}`
  });
}

async function assertSyntheticRehearsalFixtureIdentityCurrent() {
  const computed = await computeSyntheticRehearsalIdentityDigests();
  for (const key of [
    "questionSetDigest",
    "candidateDigest",
    "fixtureContentDigest",
    "syntheticRehearsalManifestDigest",
    "syntheticRehearsalManifestId"
  ]) {
    if (computed[key] !== SYNTHETIC_REHEARSAL_FIXTURE_REF[key]) {
      fail("SYNTHETIC_FIXTURE_IDENTITY_DRIFT", "固定合成题面身份已漂移；必须更新版本和外部预期摘要。 ");
    }
  }
}

function assertExactKeys(value, expected, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("INPUT_SHAPE_INVALID", `${label} 必须是对象。`);
  const actual = OBJECT_KEYS(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail("INPUT_SHAPE_INVALID", `${label} 字段集合无效。`);
}

function assertFixed(value, expected, label) {
  if (canonicalStringify(value) !== canonicalStringify(expected)) fail("FIXED_BOUNDARY_MISMATCH", `${label} 固定边界失配。`);
}

function assertRequiredText(value, path, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push({ path, code: "required", message: "请填写；没有补充时可填写“无”。" });
  } else if (value.length > 4_000) {
    errors.push({ path, code: "too_long", message: "文字超过 4000 字符上限。" });
  }
}

function responseTextEntries(response) {
  return REQUIRED_TEXT_FIELDS.map((key) => [`reviewResponse.${key}`, response[key]]);
}

export function collectSyntheticRehearsalSensitiveTextErrors(draft) {
  const errors = [];
  if (!draft || typeof draft !== "object" || !draft.reviewResponse) return errors;
  for (const [path, text] of responseTextEntries(draft.reviewResponse)) {
    if (typeof text !== "string") continue;
    for (const rule of SENSITIVE_TEXT_RULES) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(text)) errors.push({ path, code: rule.code, message: rule.message });
    }
  }
  return errors;
}

export function createSingleBindingRehearsalDraft(seatId) {
  if (!new Set(["A", "B"]).has(seatId)) fail("SEAT_INVALID", "演练席位必须精确为 A 或 B。 ");
  const draft = {
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_REHEARSAL_RECORD_TYPES[0],
    recordVersion: "1.0.0",
    rehearsalVersion: SINGLE_BINDING_REHEARSAL_VERSION,
    reviewPurpose: SINGLE_BINDING_REHEARSAL_PURPOSE,
    seatId,
    fixtureRef: cloneJson(SYNTHETIC_REHEARSAL_FIXTURE_REF),
    releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
    boundary: cloneJson(SINGLE_BINDING_REHEARSAL_BOUNDARY),
    startAcknowledgement: {
      syntheticOnly: false
    },
    reviewResponse: {
      position: "",
      cannotDecideReason: null,
      rationale: "",
      applicabilityConditions: "",
      counterexamplesOrNeededEvidence: "",
      highRiskDisposition: "",
      revisionSuggestion: ""
    },
    captureContext: {
      entryMethod: "",
      coordinatorVerbatimNoSummarySelfDeclared: false,
      assistanceCategories: []
    },
    finalConfirmations: {
      fullTextReadBackAndAccurate: false,
      noCrossSeatOpinionAccess: false,
      accuracyStudyExcluded: false,
      privateSyntheticHandling: false
    }
  };
  const privateState = {
    activeReadback: null,
    phase: "open",
    issuanceToken: 0
  };
  call(WEAK_MAP_SET, PRIVATE_DRAFT_STATE, [draft, privateState]);
  call(WEAK_SET_ADD, DRAFT_BRAND, [draft]);
  return draft;
}

function normalizeDraft(input) {
  const draft = captureJson(input);
  assertExactKeys(draft, [
    "schemaVersion", "recordType", "recordVersion", "rehearsalVersion", "reviewPurpose", "seatId",
    "fixtureRef", "releaseGovernance", "boundary", "startAcknowledgement", "reviewResponse",
    "captureContext", "finalConfirmations"
  ], "演练草稿");
  if (draft.schemaVersion !== "1.0.0" || draft.recordType !== SINGLE_BINDING_REHEARSAL_RECORD_TYPES[0]
    || draft.recordVersion !== "1.0.0" || draft.rehearsalVersion !== SINGLE_BINDING_REHEARSAL_VERSION
    || draft.reviewPurpose !== SINGLE_BINDING_REHEARSAL_PURPOSE || !new Set(["A", "B"]).has(draft.seatId)) {
    fail("DRAFT_IDENTITY_INVALID", "演练草稿身份、版本或席位无效。 ");
  }
  assertExactKeys(draft.fixtureRef, [
    "identityClass", "syntheticRehearsalManifestId", "syntheticRehearsalManifestDigest",
    "fixtureId", "fixtureContentDigest", "questionSetId", "questionSetDigest", "bindingId",
    "evidenceSubjectId", "candidateId", "candidateDigest", "candidateStatusCode",
    "formalBindingDigest", "formalReviewInputManifestAuthorityEstablished",
    "currentWorkspaceCandidateIdentityVerified"
  ], "fixtureRef");
  assertFixed(draft.fixtureRef, SYNTHETIC_REHEARSAL_FIXTURE_REF, "fixtureRef");
  assertFixed(draft.releaseGovernance, SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE, "release governance");
  assertFixed(draft.boundary, SINGLE_BINDING_REHEARSAL_BOUNDARY, "rehearsal boundary");
  assertExactKeys(draft.startAcknowledgement, ["syntheticOnly"], "start acknowledgement");
  assertExactKeys(draft.reviewResponse, [
    "position", "cannotDecideReason", "rationale", "applicabilityConditions",
    "counterexamplesOrNeededEvidence", "highRiskDisposition", "revisionSuggestion"
  ], "review response");
  assertExactKeys(draft.captureContext, [
    "entryMethod", "coordinatorVerbatimNoSummarySelfDeclared", "assistanceCategories"
  ], "capture context");
  assertExactKeys(draft.finalConfirmations, FINAL_CONFIRMATION_KEYS, "final confirmations");
  if (typeof draft.startAcknowledgement.syntheticOnly !== "boolean"
    || typeof draft.captureContext.coordinatorVerbatimNoSummarySelfDeclared !== "boolean"
    || FINAL_CONFIRMATION_KEYS.some((key) => typeof draft.finalConfirmations[key] !== "boolean")) {
    fail("BOOLEAN_FIELD_INVALID", "演练确认字段必须是布尔值。 ");
  }
  return draft;
}

function collectReadbackErrors(draft) {
  const errors = [];
  if (draft.startAcknowledgement.syntheticOnly !== true) {
    errors.push({ path: "startAcknowledgement.syntheticOnly", code: "synthetic_ack_required", message: "请先确认本页只有合成题面。" });
  }
  if (!POSITION_VALUES.has(draft.reviewResponse.position)) {
    errors.push({ path: "reviewResponse.position", code: "position_required", message: "请选择对候选分界的意见。" });
  }
  if (draft.reviewResponse.position === "cannot_decide") {
    if (!CANNOT_REASON_VALUES.has(draft.reviewResponse.cannotDecideReason)) {
      errors.push({ path: "reviewResponse.cannotDecideReason", code: "cannot_reason_required", message: "请选择目前无法判断的原因。" });
    }
  } else if (draft.reviewResponse.cannotDecideReason !== null) {
    errors.push({ path: "reviewResponse.cannotDecideReason", code: "cannot_reason_not_applicable", message: "只有选择目前无法判断时才能填写原因。" });
  }
  for (const key of REQUIRED_TEXT_FIELDS) assertRequiredText(draft.reviewResponse[key], `reviewResponse.${key}`, errors);
  if (!RISK_VALUES.has(draft.reviewResponse.highRiskDisposition)) {
    errors.push({ path: "reviewResponse.highRiskDisposition", code: "risk_required", message: "请选择面向用户的风险处置。" });
  }
  if (!ENTRY_METHOD_VALUES.has(draft.captureContext.entryMethod)) {
    errors.push({ path: "captureContext.entryMethod", code: "entry_method_required", message: "请选择本人输入或协调人逐字代录。" });
  } else if (draft.captureContext.entryMethod === "coordinator_verbatim_transcription"
    && draft.captureContext.coordinatorVerbatimNoSummarySelfDeclared !== true) {
    errors.push({ path: "captureContext.coordinatorVerbatimNoSummarySelfDeclared", code: "verbatim_ack_required", message: "代录时必须确认没有概括、润色或替换术语。" });
  } else if (draft.captureContext.entryMethod === "expert_self_entered"
    && draft.captureContext.coordinatorVerbatimNoSummarySelfDeclared !== false) {
    errors.push({ path: "captureContext.coordinatorVerbatimNoSummarySelfDeclared", code: "verbatim_ack_not_applicable", message: "本人输入时不得生成协调人代录声明。" });
  }
  const categories = draft.captureContext.assistanceCategories;
  if (!Array.isArray(categories) || categories.length === 0 || categories.some((value) => !ASSISTANCE_VALUES.has(value))) {
    errors.push({ path: "captureContext.assistanceCategories", code: "assistance_required", message: "请至少选择一项协助披露。" });
  } else {
    if (new Set(categories).size !== categories.length) {
      errors.push({ path: "captureContext.assistanceCategories", code: "assistance_duplicate", message: "协助披露不得重复。" });
    }
    const sorted = [...categories].sort((left, right) => ASSISTANCE_ORDER.get(left) - ASSISTANCE_ORDER.get(right));
    if (JSON.stringify(sorted) !== JSON.stringify(categories)) {
      errors.push({ path: "captureContext.assistanceCategories", code: "assistance_order", message: "协助披露顺序无效。" });
    }
    if ((categories.includes("none_declared") || categories.includes("unknown_or_not_disclosed")) && categories.length !== 1) {
      errors.push({ path: "captureContext.assistanceCategories", code: "assistance_exclusive", message: "“未使用”或“不确定/不披露”不能与其他选项并选。" });
    }
  }
  errors.push(...collectSyntheticRehearsalSensitiveTextErrors(draft));
  return errors;
}

function readbackSeed(draft) {
  return {
    rehearsalVersion: draft.rehearsalVersion,
    reviewPurpose: draft.reviewPurpose,
    seatId: draft.seatId,
    fixtureRef: cloneJson(draft.fixtureRef),
    syntheticFixtureSnapshot: cloneJson(SYNTHETIC_SINGLE_BINDING_FIXTURE),
    startAcknowledgement: cloneJson(draft.startAcknowledgement),
    reviewResponse: cloneJson(draft.reviewResponse),
    captureContext: cloneJson(draft.captureContext)
  };
}

export async function prepareSingleBindingRehearsalReadback(input) {
  if (!input || !call(WEAK_SET_HAS, DRAFT_BRAND, [input])) {
    fail("DRAFT_CAPABILITY_REQUIRED", "只能为本页当前进程创建的原始演练草稿生成核对稿。 ");
  }
  const draftState = call(WEAK_MAP_GET, PRIVATE_DRAFT_STATE, [input]);
  if (draftState.phase === "finalized") fail("DRAFT_ALREADY_FINALIZED", "本演练草稿已经完成，不能再次生成核对稿。 ");
  if (draftState.phase === "preparing" || draftState.phase === "finalizing") {
    fail("DRAFT_OPERATION_IN_PROGRESS", "本演练草稿正在生成核对稿或完成，不能交叉操作。 ");
  }
  const draft = normalizeDraft(input);
  const errors = collectReadbackErrors(draft);
  for (const key of FINAL_CONFIRMATION_KEYS) {
    if (draft.finalConfirmations[key] !== false) {
      errors.push({
        path: `finalConfirmations.${key}`,
        code: "confirmation_before_readback_forbidden",
        message: "最终确认只能在逐字核对稿生成后填写。"
      });
    }
  }
  if (errors.length > 0) fail("READBACK_PREFLIGHT_FAILED", "生成逐字核对稿前仍有项目未完成。", errors);
  const draftCanonicalAtStart = canonicalStringify(draft);
  const token = draftState.issuanceToken + 1;
  draftState.issuanceToken = token;
  draftState.phase = "preparing";
  draftState.activeReadback = null;
  try {
    await assertSyntheticRehearsalFixtureIdentityCurrent();
    const reviewSnapshot = readbackSeed(draft);
    const readbackDigest = await sha256Domain(
      "hakimi/bazi/expert-single-binding-nocode-rehearsal/readback/v1",
      reviewSnapshot
    );
    const currentDraft = normalizeDraft(input);
    if (draftState.phase !== "preparing" || draftState.issuanceToken !== token
      || canonicalStringify(currentDraft) !== draftCanonicalAtStart
      || FINAL_CONFIRMATION_KEYS.some((key) => currentDraft.finalConfirmations[key] !== false)) {
      fail("DRAFT_CHANGED_DURING_READBACK_PREPARATION", "生成核对稿期间草稿或确认状态发生变化；请重新生成。 ");
    }
    const candidate = deepFreeze({
      schemaVersion: "1.0.0",
      recordType: SINGLE_BINDING_REHEARSAL_RECORD_TYPES[1],
      recordVersion: "1.0.0",
      rehearsalVersion: SINGLE_BINDING_REHEARSAL_VERSION,
      readbackId: `bazi-single-binding-rehearsal-readback/${readbackDigest}`,
      readbackDigest,
      reviewSnapshot,
      releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
      boundary: cloneJson(SINGLE_BINDING_REHEARSAL_BOUNDARY),
      digestIsDigitalSignature: false,
      reviewerReadbackVerified: false,
      formalAdmissionAllowed: false
    });
    draftState.activeReadback = candidate;
    draftState.phase = "readback_ready";
    call(WEAK_MAP_SET, PRIVATE_READBACK_STATE, [candidate, {
      draft: input,
      consumed: false
    }]);
    call(WEAK_SET_ADD, READBACK_BRAND, [candidate]);
    return candidate;
  } catch (error) {
    if (draftState.phase === "preparing" && draftState.issuanceToken === token) {
      draftState.phase = "open";
      draftState.activeReadback = null;
    }
    throw error;
  }
}

export async function finalizeSingleBindingRehearsal(input, readbackCandidate) {
  if (!readbackCandidate || !call(WEAK_SET_HAS, READBACK_BRAND, [readbackCandidate])) {
    fail("READBACK_BRAND_REQUIRED", "只能使用本页当前进程生成的逐字核对稿。 ");
  }
  if (!input || !call(WEAK_SET_HAS, DRAFT_BRAND, [input])) {
    fail("DRAFT_CAPABILITY_REQUIRED", "只能完成本页当前进程创建的原始演练草稿。 ");
  }
  const draftState = call(WEAK_MAP_GET, PRIVATE_DRAFT_STATE, [input]);
  const readbackState = call(WEAK_MAP_GET, PRIVATE_READBACK_STATE, [readbackCandidate]);
  if (readbackState?.draft !== input) {
    fail("READBACK_DRAFT_MISMATCH", "核对稿不属于当前这份演练草稿。 ");
  }
  if (readbackState.consumed || draftState.phase === "finalized") {
    fail("READBACK_ALREADY_CONSUMED", "核对稿已经用于一次完成尝试；请重新生成并逐字核对。 ");
  }
  if (draftState.phase !== "readback_ready" || draftState.activeReadback !== readbackCandidate) {
    fail("READBACK_DRAFT_MISMATCH", "核对稿已被当前草稿更新生成的核对稿取代。 ");
  }
  const draft = normalizeDraft(input);
  const errors = collectReadbackErrors(draft);
  for (const key of FINAL_CONFIRMATION_KEYS) {
    if (draft.finalConfirmations[key] !== true) {
      errors.push({ path: `finalConfirmations.${key}`, code: "final_confirmation_required", message: "请完成全部最终确认。" });
    }
  }
  if (errors.length > 0) fail("FINAL_PREFLIGHT_FAILED", "完成演练前仍有项目未确认。", errors);
  const currentSnapshot = readbackSeed(draft);
  if (canonicalStringify(currentSnapshot) !== canonicalStringify(readbackCandidate.reviewSnapshot)) {
    readbackState.consumed = true;
    draftState.activeReadback = null;
    draftState.phase = "open";
    fail("READBACK_STALE", "核对稿生成后内容已经改变；请重新生成并逐字核对。 ");
  }
  const draftCanonicalAtStart = canonicalStringify(draft);
  const token = draftState.issuanceToken + 1;
  draftState.issuanceToken = token;
  readbackState.consumed = true;
  draftState.activeReadback = null;
  draftState.phase = "finalizing";
  try {
    const currentDigest = await sha256Domain(
      "hakimi/bazi/expert-single-binding-nocode-rehearsal/readback/v1",
      currentSnapshot
    );
    if (currentDigest !== readbackCandidate.readbackDigest) {
      fail("READBACK_STALE", "核对稿摘要与当前内容不匹配；请重新生成并逐字核对。 ");
    }
    const submissionSeed = {
      reviewSnapshot: currentSnapshot,
      readbackDigest: currentDigest,
      finalConfirmations: cloneJson(draft.finalConfirmations)
    };
    const submissionDigest = await sha256Domain(
      "hakimi/bazi/expert-single-binding-nocode-rehearsal/submission/v1",
      submissionSeed
    );
    const currentDraft = normalizeDraft(input);
    if (draftState.phase !== "finalizing" || draftState.issuanceToken !== token
      || canonicalStringify(currentDraft) !== draftCanonicalAtStart) {
      fail("DRAFT_CHANGED_DURING_FINALIZE", "完成演练期间草稿或确认状态发生变化；请重新生成核对稿。 ");
    }
    const candidate = deepFreeze({
      schemaVersion: "1.0.0",
      recordType: SINGLE_BINDING_REHEARSAL_RECORD_TYPES[2],
      recordVersion: "1.0.0",
      rehearsalVersion: SINGLE_BINDING_REHEARSAL_VERSION,
      submissionId: `bazi-single-binding-rehearsal-submission/${submissionDigest}`,
      submissionDigest,
      ...submissionSeed,
      releaseGovernance: cloneJson(SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE),
      boundary: cloneJson(SINGLE_BINDING_REHEARSAL_BOUNDARY),
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
    draftState.phase = "finalized";
    call(WEAK_MAP_SET, PRIVATE_SUBMISSION_STATE, [candidate, { draft: input }]);
    call(WEAK_SET_ADD, SUBMISSION_BRAND, [candidate]);
    return candidate;
  } catch (error) {
    if (draftState.phase === "finalizing" && draftState.issuanceToken === token) {
      draftState.phase = "open";
      draftState.activeReadback = null;
    }
    throw error;
  }
}

export async function preflightSingleBindingRehearsalSubmissionValue(input, { expectedSeatId } = {}) {
  if (!new Set(["A", "B"]).has(expectedSeatId)) {
    fail("EXPECTED_SEAT_INVALID", "导入演练候选时必须提供精确 A 或 B 席位。 ");
  }
  const candidate = captureJson(input);
  assertExactKeys(candidate, [
    "schemaVersion", "recordType", "recordVersion", "rehearsalVersion", "submissionId",
    "submissionDigest", "reviewSnapshot", "readbackDigest", "finalConfirmations",
    "releaseGovernance", "boundary", "mutationBoundary", "integrityBoundary"
  ], "演练 submission candidate");
  if (candidate.schemaVersion !== "1.0.0"
    || candidate.recordType !== SINGLE_BINDING_REHEARSAL_RECORD_TYPES[2]
    || candidate.recordVersion !== "1.0.0"
    || candidate.rehearsalVersion !== SINGLE_BINDING_REHEARSAL_VERSION) {
    fail("SUBMISSION_IDENTITY_INVALID", "演练 submission 的身份或版本无效。 ");
  }
  assertExactKeys(candidate.reviewSnapshot, [
    "rehearsalVersion", "reviewPurpose", "seatId", "fixtureRef", "syntheticFixtureSnapshot",
    "startAcknowledgement", "reviewResponse", "captureContext"
  ], "演练 submission reviewSnapshot");
  if (candidate.reviewSnapshot.seatId !== expectedSeatId
    || candidate.reviewSnapshot.rehearsalVersion !== SINGLE_BINDING_REHEARSAL_VERSION
    || candidate.reviewSnapshot.reviewPurpose !== SINGLE_BINDING_REHEARSAL_PURPOSE) {
    fail("SUBMISSION_SEAT_OR_PURPOSE_INVALID", "演练 submission 的席位或 purpose 无效。 ");
  }
  assertFixed(candidate.reviewSnapshot.syntheticFixtureSnapshot, SYNTHETIC_SINGLE_BINDING_FIXTURE, "synthetic fixture snapshot");
  assertFixed(candidate.reviewSnapshot.fixtureRef, SYNTHETIC_REHEARSAL_FIXTURE_REF, "fixtureRef");
  assertFixed(candidate.releaseGovernance, SINGLE_BINDING_REHEARSAL_RELEASE_GOVERNANCE, "release governance");
  assertFixed(candidate.boundary, SINGLE_BINDING_REHEARSAL_BOUNDARY, "rehearsal boundary");
  assertFixed(candidate.mutationBoundary, {
    persistencePerformed: false,
    productStorageMutationPerformed: false,
    schema13MutationEpochUsed: false,
    intervalMutationExcluded: false,
    abaExcluded: false
  }, "mutation boundary");
  assertFixed(candidate.integrityBoundary, {
    digestIsDigitalSignature: false,
    trustedTimeEstablished: false,
    firstSeenEstablished: false,
    custodyEstablished: false,
    serializedCloneRetainsProcessBrand: false
  }, "integrity boundary");
  const draft = normalizeDraft({
    schemaVersion: "1.0.0",
    recordType: SINGLE_BINDING_REHEARSAL_RECORD_TYPES[0],
    recordVersion: "1.0.0",
    rehearsalVersion: SINGLE_BINDING_REHEARSAL_VERSION,
    reviewPurpose: SINGLE_BINDING_REHEARSAL_PURPOSE,
    seatId: candidate.reviewSnapshot.seatId,
    fixtureRef: candidate.reviewSnapshot.fixtureRef,
    releaseGovernance: candidate.releaseGovernance,
    boundary: candidate.boundary,
    startAcknowledgement: candidate.reviewSnapshot.startAcknowledgement,
    reviewResponse: candidate.reviewSnapshot.reviewResponse,
    captureContext: candidate.reviewSnapshot.captureContext,
    finalConfirmations: candidate.finalConfirmations
  });
  const errors = collectReadbackErrors(draft);
  for (const key of FINAL_CONFIRMATION_KEYS) {
    if (draft.finalConfirmations[key] !== true) {
      errors.push({ path: `finalConfirmations.${key}`, code: "final_confirmation_required", message: "导入候选缺少最终确认。" });
    }
  }
  if (errors.length > 0) fail("SUBMISSION_PREFLIGHT_FAILED", "演练 submission 内容未通过重新校验。", errors);
  await assertSyntheticRehearsalFixtureIdentityCurrent();
  const reviewSnapshot = readbackSeed(draft);
  if (canonicalStringify(reviewSnapshot) !== canonicalStringify(candidate.reviewSnapshot)) {
    fail("SUBMISSION_SNAPSHOT_INVALID", "演练 submission 的 review snapshot 无法重建。 ");
  }
  const readbackDigest = await sha256Domain(
    "hakimi/bazi/expert-single-binding-nocode-rehearsal/readback/v1",
    reviewSnapshot
  );
  const submissionSeed = {
    reviewSnapshot,
    readbackDigest,
    finalConfirmations: cloneJson(draft.finalConfirmations)
  };
  const submissionDigest = await sha256Domain(
    "hakimi/bazi/expert-single-binding-nocode-rehearsal/submission/v1",
    submissionSeed
  );
  if (candidate.readbackDigest !== readbackDigest
    || candidate.submissionDigest !== submissionDigest
    || candidate.submissionId !== `bazi-single-binding-rehearsal-submission/${submissionDigest}`) {
    fail("SUBMISSION_DIGEST_INVALID", "演练 submission 的 readback 或 submission digest 无效。 ");
  }
  return deepFreeze(candidate);
}

export function isSingleBindingRehearsalReadbackCandidate(value) {
  return value !== null && typeof value === "object" && call(WEAK_SET_HAS, READBACK_BRAND, [value]);
}

export function isSingleBindingRehearsalSubmissionCandidate(value) {
  return value !== null && typeof value === "object" && call(WEAK_SET_HAS, SUBMISSION_BRAND, [value]);
}
