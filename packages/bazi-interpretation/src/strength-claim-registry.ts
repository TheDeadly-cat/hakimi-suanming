export const BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.strength_claim_registry/0.1.0",
  contentVersion: "0.18.0",
  scope: "strength_traditional_context_engineering_policy_and_review_boundaries" as const,
  reviewStatus: "candidate_pending_expert_review" as const,
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const
});

export type BaziStrengthClaimSourceType =
  | "engineering_contract"
  | "public_domain_classic_transcription"
  | "review_gate_locator";

export type BaziStrengthClaimSourceVerification =
  | "repository_policy_verified"
  | "locator_verified_in_pinned_revision"
  | "source_warning_unresolved"
  | "locator_only_unfrozen";

export interface BaziStrengthClaimSource {
  sourceId: string;
  order: number;
  sourceType: BaziStrengthClaimSourceType;
  title: string;
  editionOrCarrier: string;
  url: string;
  stableRevision: string | null;
  verificationStatus: BaziStrengthClaimSourceVerification;
  workRightsStatus: string;
  carrierRightsStatus: string;
  usageBoundary: string;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
}

export type BaziStrengthClaimEvidenceRole =
  | "defines_engineering_candidate"
  | "traditional_context_only"
  | "review_question_only";

export type BaziStrengthClaimLocatorVerification =
  | "verified"
  | "pending_manual_textual_verification";

export interface BaziStrengthClaimSourceBinding {
  bindingId: string;
  order: number;
  sourceId: string;
  sourceType: BaziStrengthClaimSourceType;
  evidenceRole: BaziStrengthClaimEvidenceRole;
  exactLocator: Readonly<{
    kind: "stable_symbol" | "chapter_heading" | "anchor_phrase";
    value: string;
    verificationStatus: BaziStrengthClaimLocatorVerification;
    contentSha256: null;
  }>;
  parameterSupport: "exact_engineering_definition" | "context_only" | "boundary_only";
  supports: string;
  doesNotSupport: readonly string[];
}

export type BaziStrengthClaimType =
  | "fact_anchor"
  | "traditional_rationale"
  | "factor_inclusion"
  | "factor_weighting"
  | "direction_mapping"
  | "classification_threshold"
  | "duplication_policy"
  | "scope_withholding"
  | "sensitivity_interpretation"
  | "invalidation_boundary";

export interface BaziStrengthClaim {
  claimId: string;
  order: number;
  claimType: BaziStrengthClaimType;
  candidateStatement: string;
  traditionScope: Readonly<{
    system: "bazi";
    tradition: "hakimi_engineering_candidate" | "ziping_context_only";
    schoolVariant: string | null;
  }>;
  factInputs: readonly string[];
  sourceBindingIds: readonly string[];
  applicabilityConditions: readonly string[];
  counterexamples: readonly string[];
  prohibitedOutcomeClaims: readonly string[];
  reviewStatus: "internal_only" | "candidate_pending_expert_review" | "blocked_source_verification";
  displayStatus: "enabled_engineering_candidate" | "enabled_traditional_context" | "withheld_pending_verified_locator_or_review";
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  result: null;
}

export interface BaziStrengthClaimRegistry {
  profile: typeof BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE;
  sources: readonly BaziStrengthClaimSource[];
  sourceBindings: readonly BaziStrengthClaimSourceBinding[];
  claims: readonly BaziStrengthClaim[];
  boundary: Readonly<{
    digitalTranscriptionEqualsVerifiedFacsimile: false;
    engineeringParametersClaimTraditionalAuthority: false;
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    formalActivationAllowed: false;
    result: null;
  }>;
}

const PROHIBITED_OUTCOMES = Object.freeze([
  "expert_truth",
  "scientific_validity",
  "formal_activation",
  "overall_good_bad",
  "useful_god",
  "structure_verdict",
  "event_prediction"
] as const);

const sources: readonly BaziStrengthClaimSource[] = Object.freeze([
  Object.freeze({
    sourceId: "hakimi-strength-core-0.1.0",
    order: 1,
    sourceType: "engineering_contract" as const,
    title: "哈基米旺衰因素共享派生核",
    editionOrCarrier: "本仓源码；当前工程定义",
    url: "/packages/bazi-interpretation/src/strength-assessment-core.ts",
    stableRevision: "hakimi-bazi-strength-ten-god-candidate/0.1.0",
    verificationStatus: "repository_policy_verified" as const,
    workRightsStatus: "internal_project_source",
    carrierRightsStatus: "local_repository_only",
    usageBoundary: "只证明当前工程如何从命盘事实派生因素、五行关系与汇总，不证明命理或科学正确。",
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  }),
  Object.freeze({
    sourceId: "hakimi-strength-policy-0.1.0",
    order: 2,
    sourceType: "engineering_contract" as const,
    title: "哈基米旺衰候选政策",
    editionOrCarrier: "本仓源码；单一政策事实源",
    url: "/packages/bazi-interpretation/src/strength-policy.ts",
    stableRevision: "hakimi.bazi.strength_policy/0.1.0",
    verificationStatus: "repository_policy_verified" as const,
    workRightsStatus: "internal_project_source",
    carrierRightsStatus: "local_repository_only",
    usageBoundary: "只认证 4/2/2/1、阈值、方向分组和关闭范围是本项目当前工程候选。",
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  }),
  Object.freeze({
    sourceId: "hakimi-strength-sensitivity-0.1.0",
    order: 3,
    sourceType: "engineering_contract" as const,
    title: "哈基米旺衰工程敏感性投影",
    editionOrCarrier: "本仓源码；六个工程扰动场景",
    url: "/packages/bazi-interpretation/src/strength-sensitivity-review.ts",
    stableRevision: "hakimi.bazi.strength_sensitivity_review/0.1.0",
    verificationStatus: "repository_policy_verified" as const,
    workRightsStatus: "internal_project_source",
    carrierRightsStatus: "local_repository_only",
    usageBoundary: "六场景只检查模型假设敏感度，不代表六个流派、专家共识或预测验证。",
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  }),
  Object.freeze({
    sourceId: "dtt-chanwei-wikisource-r2600158",
    order: 4,
    sourceType: "public_domain_classic_transcription" as const,
    title: "《滴天髓阐微》",
    editionOrCarrier: "Wikisource 社区转录，任铁樵阐微本",
    url: "https://zh.wikisource.org/w/index.php?title=%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE&oldid=2600158",
    stableRevision: "2600158",
    verificationStatus: "locator_verified_in_pinned_revision" as const,
    workRightsStatus: "historical_work_public_domain_candidate",
    carrierRightsStatus: "community_transcription_reuse_requires_site_license_audit",
    usageBoundary: "用于月令与全局合看、不可执一的传统语境；未与指定影印本逐字校勘。",
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  }),
  Object.freeze({
    sourceId: "smt-v5-wikisource-r2706483",
    order: 5,
    sourceType: "public_domain_classic_transcription" as const,
    title: "《三命通会》卷五",
    editionOrCarrier: "Wikisource 社区转录",
    url: "https://zh.wikisource.org/w/index.php?title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%BA%94&oldid=2706483",
    stableRevision: "2706483",
    verificationStatus: "locator_verified_in_pinned_revision" as const,
    workRightsStatus: "historical_work_public_domain_candidate",
    carrierRightsStatus: "community_transcription_reuse_requires_site_license_audit",
    usageBoundary: "用于十神相对生克关系的传统语境；不认证现代支持／需求分组或吉凶。",
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  }),
  Object.freeze({
    sourceId: "smt-siku-v10-wikisource-r761703",
    order: 6,
    sourceType: "public_domain_classic_transcription" as const,
    title: "《三命通会》（四库全书本）卷十",
    editionOrCarrier: "Wikisource 社区转录的四库文本",
    url: "https://zh.wikisource.org/w/index.php?title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B710&oldid=761703",
    stableRevision: "761703",
    verificationStatus: "locator_verified_in_pinned_revision" as const,
    workRightsStatus: "historical_work_public_domain_candidate",
    carrierRightsStatus: "community_transcription_reuse_requires_site_license_audit",
    usageBoundary: "用于月令、透藏、其余柱和配置须合看的传统语境；未与四库影印逐字校勘。",
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  }),
  Object.freeze({
    sourceId: "yhzp-wikisource-r2593607",
    order: 7,
    sourceType: "public_domain_classic_transcription" as const,
    title: "《渊海子平》",
    editionOrCarrier: "Wikisource 不完整、来源未核定的社区转录",
    url: "https://zh.wikisource.org/w/index.php?title=%E6%B7%B5%E6%B5%B7%E5%AD%90%E5%B9%B3&oldid=2593607",
    stableRevision: "2593607",
    verificationStatus: "source_warning_unresolved" as const,
    workRightsStatus: "historical_work_public_domain_candidate",
    carrierRightsStatus: "incomplete_transcription_source_warning",
    usageBoundary: "只登记藏干成员与次序候选；不得宣称首位必为主气或已完成影印校勘。",
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  }),
  Object.freeze({
    sourceId: "zpzz-ctext-ch974137-unfrozen",
    order: 8,
    sourceType: "review_gate_locator" as const,
    title: "《子平真诠评注》",
    editionOrCarrier: "Chinese Text Project 页面；原文与评注身份尚未冻结",
    url: "https://ctext.org/wiki.pl?chapter=974137&if=gb&remap=gb",
    stableRevision: null,
    verificationStatus: "locator_only_unfrozen" as const,
    workRightsStatus: "historical_and_commentary_layers_require_separate_audit",
    carrierRightsStatus: "link_and_locator_only_no_redistribution_clearance",
    usageBoundary: "仅挂起格局成败救应与气候专家复核问题；不支撑当前算法或个案结论。",
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  })
]);

const sourceBindings: readonly BaziStrengthClaimSourceBinding[] = Object.freeze([
  Object.freeze({
    bindingId: "binding:core:derive-assessment",
    order: 1,
    sourceId: "hakimi-strength-core-0.1.0",
    sourceType: "engineering_contract" as const,
    evidenceRole: "defines_engineering_candidate" as const,
    exactLocator: Object.freeze({ kind: "stable_symbol" as const, value: "deriveBaziStrengthAssessment + collectBaziStrengthFactors", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "exact_engineering_definition" as const,
    supports: "当前工程从日主、透干、藏干与时柱可靠性派生完整因素账。",
    doesNotSupport: Object.freeze(["命理真值", "科学有效性", "用户吉凶"])
  }),
  Object.freeze({
    bindingId: "binding:policy:factor-inclusion",
    order: 2,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract" as const,
    evidenceRole: "defines_engineering_candidate" as const,
    exactLocator: Object.freeze({ kind: "stable_symbol" as const, value: "BAZI_STRENGTH_POLICY.factorInclusion", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "exact_engineering_definition" as const,
    supports: "日主透干排除、月令与首藏分别保留、时辰不可靠时关闭时柱。",
    doesNotSupport: Object.freeze(["传统唯一规则", "所有流派一致"])
  }),
  Object.freeze({
    bindingId: "binding:policy:direction-map",
    order: 3,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract" as const,
    evidenceRole: "defines_engineering_candidate" as const,
    exactLocator: Object.freeze({ kind: "stable_symbol" as const, value: "BAZI_STRENGTH_TEN_GOD_GROUPS + strengthFactorDirectionForTenGod", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "exact_engineering_definition" as const,
    supports: "比劫与印归支持侧，食伤、财与官杀归需求侧。",
    doesNotSupport: Object.freeze(["支持即吉", "需求即凶", "用神喜忌"])
  }),
  Object.freeze({
    bindingId: "binding:policy:weights",
    order: 4,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract" as const,
    evidenceRole: "defines_engineering_candidate" as const,
    exactLocator: Object.freeze({ kind: "stable_symbol" as const, value: "BAZI_STRENGTH_FACTOR_WEIGHTS", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "exact_engineering_definition" as const,
    supports: "月令 4、透干 2、首位藏干 2、其余藏干 1 的当前工程候选。",
    doesNotSupport: Object.freeze(["古籍规定该权重", "专家批准", "统计校准"])
  }),
  Object.freeze({
    bindingId: "binding:policy:month-duplication",
    order: 5,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract" as const,
    evidenceRole: "defines_engineering_candidate" as const,
    exactLocator: Object.freeze({ kind: "stable_symbol" as const, value: "BAZI_STRENGTH_POLICY.monthMainDuplication", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "exact_engineering_definition" as const,
    supports: "月令主气与月支首位藏干在当前基线分别计入。",
    doesNotSupport: Object.freeze(["古籍规定合计权重 6", "去重场景必然正确"])
  }),
  Object.freeze({
    bindingId: "binding:policy:thresholds",
    order: 6,
    sourceId: "hakimi-strength-policy-0.1.0",
    sourceType: "engineering_contract" as const,
    evidenceRole: "defines_engineering_candidate" as const,
    exactLocator: Object.freeze({ kind: "stable_symbol" as const, value: "BAZI_STRENGTH_BAND_THRESHOLDS + classifyStrengthBand", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "exact_engineering_definition" as const,
    supports: "支持比例按 0.25、0.43、0.57、0.75 映射五档。",
    doesNotSupport: Object.freeze(["传统分界", "人口统计阈值", "预测准确率"])
  }),
  Object.freeze({
    bindingId: "binding:sensitivity:six-scenarios",
    order: 7,
    sourceId: "hakimi-strength-sensitivity-0.1.0",
    sourceType: "engineering_contract" as const,
    evidenceRole: "defines_engineering_candidate" as const,
    exactLocator: Object.freeze({ kind: "stable_symbol" as const, value: "BAZI_STRENGTH_SENSITIVITY_SCENARIOS + buildStrengthSensitivityReview", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "exact_engineering_definition" as const,
    supports: "六个工程扰动场景的权重、排除项、分档与稳定性比较。",
    doesNotSupport: Object.freeze(["六大流派", "专家共识", "预测稳健性"])
  }),
  Object.freeze({
    bindingId: "binding:dtt:month-command",
    order: 8,
    sourceId: "dtt-chanwei-wikisource-r2600158",
    sourceType: "public_domain_classic_transcription" as const,
    evidenceRole: "traditional_context_only" as const,
    exactLocator: Object.freeze({ kind: "chapter_heading" as const, value: "通神论 > 十五、月令；十七、衰旺", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "context_only" as const,
    supports: "月令重要而仍须结合其余柱与全局、不可只凭得令失令执一。",
    doesNotSupport: Object.freeze(["4/2/2/1", "当前阈值", "科学有效性"])
  }),
  Object.freeze({
    bindingId: "binding:smt-v5:relative-relations",
    order: 9,
    sourceId: "smt-v5-wikisource-r2706483",
    sourceType: "public_domain_classic_transcription" as const,
    evidenceRole: "traditional_context_only" as const,
    exactLocator: Object.freeze({ kind: "chapter_heading" as const, value: "卷五 > 论古人立印食官财名义", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "context_only" as const,
    supports: "十神名称建立在日主与其他五行的生克关系上。",
    doesNotSupport: Object.freeze(["十神固定吉凶", "当前支持／需求权重", "个人事件"])
  }),
  Object.freeze({
    bindingId: "binding:smt-v10:whole-chart",
    order: 10,
    sourceId: "smt-siku-v10-wikisource-r761703",
    sourceType: "public_domain_classic_transcription" as const,
    evidenceRole: "traditional_context_only" as const,
    exactLocator: Object.freeze({ kind: "chapter_heading" as const, value: "卷十 > 看命口诀；玉井奥诀 > 物须提豁方明轻重", verificationStatus: "verified" as const, contentSha256: null }),
    parameterSupport: "context_only" as const,
    supports: "察月支同时仍须察其余柱、时令深浅、显露暗藏与配置。",
    doesNotSupport: Object.freeze(["固定藏干顺序等于主气", "当前数字权重"])
  }),
  Object.freeze({
    bindingId: "binding:yhzp:hidden-listing",
    order: 11,
    sourceId: "yhzp-wikisource-r2593607",
    sourceType: "public_domain_classic_transcription" as const,
    evidenceRole: "traditional_context_only" as const,
    exactLocator: Object.freeze({ kind: "chapter_heading" as const, value: "论天干地支暗藏总诀；又地支藏遁歌", verificationStatus: "pending_manual_textual_verification" as const, contentSha256: null }),
    parameterSupport: "context_only" as const,
    supports: "某一未核定转录版本列出了地支藏干成员与次序。",
    doesNotSupport: Object.freeze(["首位必为主气", "权重 2", "所有流派一致"])
  }),
  Object.freeze({
    bindingId: "binding:zpzz:review-gates",
    order: 12,
    sourceId: "zpzz-ctext-ch974137-unfrozen",
    sourceType: "review_gate_locator" as const,
    evidenceRole: "review_question_only" as const,
    exactLocator: Object.freeze({ kind: "chapter_heading" as const, value: "九、十三、十四、十八、十九：成败救应、气候、破格与成格", verificationStatus: "pending_manual_textual_verification" as const, contentSha256: null }),
    parameterSupport: "boundary_only" as const,
    supports: "挂起格局成败救应与气候是否推翻基线的专家复核问题。",
    doesNotSupport: Object.freeze(["当前算法", "喜忌", "用户结论"])
  })
]);

function claim(input: Omit<BaziStrengthClaim, "expertTruthClaimed" | "scientificValidityClaimed" | "formalActivationAllowed" | "result" | "prohibitedOutcomeClaims">): BaziStrengthClaim {
  return Object.freeze({
    ...input,
    prohibitedOutcomeClaims: PROHIBITED_OUTCOMES,
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    result: null
  });
}

const claims: readonly BaziStrengthClaim[] = Object.freeze([
  claim({
    claimId: "bazi.engineering.strength.day_master_fact_anchor.v1",
    order: 1,
    claimType: "fact_anchor",
    candidateStatement: "当前证据账以日柱天干作为日主事实锚点，并独立核对每个因素天干的五行关系。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "hakimi_engineering_candidate", schoolVariant: null }),
    factInputs: Object.freeze(["facts.pillars.day.stem", "facts.pillars.*.stem", "facts.pillars.*.hiddenStems"]),
    sourceBindingIds: Object.freeze(["binding:core:derive-assessment"]),
    applicabilityConditions: Object.freeze(["四柱事实通过 ChartFacts 及逐柱一致性校验。"]),
    counterexamples: Object.freeze(["天干无法识别、藏干与支十神不等长或事实身份错位时整层失败关闭。"]),
    reviewStatus: "internal_only",
    displayStatus: "enabled_engineering_candidate"
  }),
  claim({
    claimId: "bazi.tradition.strength.month_command_whole_chart.v1",
    order: 2,
    claimType: "traditional_rationale",
    candidateStatement: "所登记的子平文本把月令视为重要依据，同时要求结合其余柱、根气与全局配置。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "ziping_context_only", schoolVariant: "registered_texts_not_all_schools" }),
    factInputs: Object.freeze([]),
    sourceBindingIds: Object.freeze(["binding:dtt:month-command", "binding:smt-v10:whole-chart"]),
    applicabilityConditions: Object.freeze(["只用作传统问题域与审稿语境，不作为数值参数来源。"]),
    counterexamples: Object.freeze(["合化、从格、专旺、调候、刑冲、时令深浅及版本流派差异都可能改变解释。"]),
    reviewStatus: "candidate_pending_expert_review",
    displayStatus: "enabled_traditional_context"
  }),
  claim({
    claimId: "bazi.tradition.ten_god.relative_relations.v1",
    order: 3,
    claimType: "traditional_rationale",
    candidateStatement: "十神名称建立在日主与其他五行的生克关系之上。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "ziping_context_only", schoolVariant: "smt_v5_registered_text" }),
    factInputs: Object.freeze(["facts.pillars.day.stem", "factor.stem"]),
    sourceBindingIds: Object.freeze(["binding:smt-v5:relative-relations"]),
    applicabilityConditions: Object.freeze(["仅说明传统相对关系语境；具体十神仍由当前已验真盘面提供。"]),
    counterexamples: Object.freeze(["阴阳同异、合化、特殊格局与流派细分仍须另行处理。"]),
    reviewStatus: "candidate_pending_expert_review",
    displayStatus: "enabled_traditional_context"
  }),
  claim({
    claimId: "bazi.engineering.strength.factor_inclusion.v1",
    order: 4,
    claimType: "factor_inclusion",
    candidateStatement: "当前工程候选纳入独立月令项、非日主透干与各支藏干，日主自身透干不重复计为因素。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "hakimi_engineering_candidate", schoolVariant: null }),
    factInputs: Object.freeze(["BAZI_STRENGTH_POLICY.factorInclusion", "facts.pillars"]),
    sourceBindingIds: Object.freeze(["binding:policy:factor-inclusion", "binding:core:derive-assessment"]),
    applicabilityConditions: Object.freeze(["政策版本为 hakimi.bazi.strength_policy/0.1.0。"]),
    counterexamples: Object.freeze(["当前因素纳入策略尚未获得专家裁决或成体系案例支持。"]),
    reviewStatus: "internal_only",
    displayStatus: "enabled_engineering_candidate"
  }),
  claim({
    claimId: "bazi.engineering.ten_god.support_demand_grouping.v1",
    order: 5,
    claimType: "direction_mapping",
    candidateStatement: "当前模型把比劫、印归入支持侧，把食伤、财、官杀归入需求侧。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "hakimi_engineering_candidate", schoolVariant: null }),
    factInputs: Object.freeze(["factor.tenGod", "BAZI_STRENGTH_TEN_GOD_GROUPS"]),
    sourceBindingIds: Object.freeze(["binding:policy:direction-map", "binding:smt-v5:relative-relations"]),
    applicabilityConditions: Object.freeze(["只描述本模型的支持／需求分组，不输出喜神、忌神或吉凶。"]),
    counterexamples: Object.freeze(["从格、专旺、化气、调候、合化、刑冲与格局救应尚未进入方向裁决。"]),
    reviewStatus: "internal_only",
    displayStatus: "enabled_engineering_candidate"
  }),
  claim({
    claimId: "bazi.engineering.strength.factor_weights_4_2_2_1.v1",
    order: 6,
    claimType: "factor_weighting",
    candidateStatement: "当前候选模型分别给月令主气、透干、首位藏干和其他藏干赋予 4/2/2/1 的工程权重。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "hakimi_engineering_candidate", schoolVariant: null }),
    factInputs: Object.freeze(["BAZI_STRENGTH_FACTOR_WEIGHTS", "evidenceItem.category", "evidenceItem.hiddenStemIndex"]),
    sourceBindingIds: Object.freeze(["binding:policy:weights"]),
    applicabilityConditions: Object.freeze(["只在当前政策版本和完整事实快照上复演。"]),
    counterexamples: Object.freeze(["月主气双计、藏干顺序争议、特殊格局、合化、调候与运限可能推翻该候选。"]),
    reviewStatus: "internal_only",
    displayStatus: "enabled_engineering_candidate"
  }),
  claim({
    claimId: "bazi.engineering.strength.month_main_counted_separately.v1",
    order: 7,
    claimType: "duplication_policy",
    candidateStatement: "当前基线把月令主气因素与月支首位藏干因素分别计入；这是待复核的模型选择。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "hakimi_engineering_candidate", schoolVariant: null }),
    factInputs: Object.freeze(["BAZI_STRENGTH_POLICY.monthMainDuplication", "facts.pillars.month.hiddenStems[0]"]),
    sourceBindingIds: Object.freeze(["binding:policy:month-duplication"]),
    applicabilityConditions: Object.freeze(["月令项与月支首藏能以同一月支和天干形成唯一配对。"]),
    counterexamples: Object.freeze(["去重敏感性场景用于观察该选择是否改变分档；它本身也不是正式替代规则。"]),
    reviewStatus: "internal_only",
    displayStatus: "enabled_engineering_candidate"
  }),
  claim({
    claimId: "bazi.engineering.strength.threshold_bands.v1",
    order: 8,
    claimType: "classification_threshold",
    candidateStatement: "当前候选模型按支持比例阈值 0.25/0.43/0.57/0.75 映射五档。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "hakimi_engineering_candidate", schoolVariant: null }),
    factInputs: Object.freeze(["BAZI_STRENGTH_BAND_THRESHOLDS", "strength.supportRatio"]),
    sourceBindingIds: Object.freeze(["binding:policy:thresholds"]),
    applicabilityConditions: Object.freeze(["支持与需求总权重大于零；否则分档为未定。"]),
    counterexamples: Object.freeze(["阈值尚无获准案例集、专家裁决或统计校准。"]),
    reviewStatus: "internal_only",
    displayStatus: "enabled_engineering_candidate"
  }),
  claim({
    claimId: "bazi.engineering.strength.unreliable_hour_withheld.v1",
    order: 9,
    claimType: "scope_withholding",
    candidateStatement: "时辰不可靠时，时柱透干与藏干因素全部关闭，只保留不含时柱值的 withheld 状态。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "hakimi_engineering_candidate", schoolVariant: null }),
    factInputs: Object.freeze(["includeHour", "BAZI_STRENGTH_POLICY.factorInclusion.excludeUnreliableHour"]),
    sourceBindingIds: Object.freeze(["binding:policy:factor-inclusion"]),
    applicabilityConditions: Object.freeze(["timePrecision 为 unknown_hour 或 date_only。"]),
    counterexamples: Object.freeze(["补充可靠时辰只能在新修订中重新计算，不能回填当前历史结果。"]),
    reviewStatus: "internal_only",
    displayStatus: "enabled_engineering_candidate"
  }),
  claim({
    claimId: "bazi.engineering.strength.scenario_sensitivity.v1",
    order: 10,
    claimType: "sensitivity_interpretation",
    candidateStatement: "六个工程扰动场景只显示分档和支持／需求方向对模型假设的敏感程度。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "hakimi_engineering_candidate", schoolVariant: null }),
    factInputs: Object.freeze(["strengthSensitivity.scenarios", "strengthSensitivity.baselineBand"]),
    sourceBindingIds: Object.freeze(["binding:sensitivity:six-scenarios"]),
    applicabilityConditions: Object.freeze(["六场景逐项完整复演并与当前因素账绑定。"]),
    counterexamples: Object.freeze(["六场景没有穷尽流派、结构、气候、刑冲合化与运限。"]),
    reviewStatus: "internal_only",
    displayStatus: "enabled_engineering_candidate"
  }),
  claim({
    claimId: "bazi.tradition.hidden_stem.listing_candidate.v1",
    order: 11,
    claimType: "traditional_rationale",
    candidateStatement: "某一未核定转录版本列出地支藏干成员与次序；该主张暂不面向结果层启用。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "ziping_context_only", schoolVariant: "unverified_yhzp_transcription" }),
    factInputs: Object.freeze(["facts.pillars.*.hiddenStems"]),
    sourceBindingIds: Object.freeze(["binding:yhzp:hidden-listing"]),
    applicabilityConditions: Object.freeze(["须先完成来源身份和影印逐项校核。"]),
    counterexamples: Object.freeze(["转录不完整、异文、固定藏干与按季节司令差异。"]),
    reviewStatus: "blocked_source_verification",
    displayStatus: "withheld_pending_verified_locator_or_review"
  }),
  claim({
    claimId: "bazi.review_gate.structure_rescue_climate.v1",
    order: 12,
    claimType: "invalidation_boundary",
    candidateStatement: "专家复核需检查格局成败救应及气候条件是否会推翻当前基线。",
    traditionScope: Object.freeze({ system: "bazi", tradition: "ziping_context_only", schoolVariant: "unfrozen_zpzz_commentary_layer" }),
    factInputs: Object.freeze(["strength.knownGaps", "BAZI_STRENGTH_UNRESOLVED_STRUCTURES"]),
    sourceBindingIds: Object.freeze(["binding:zpzz:review-gates"]),
    applicabilityConditions: Object.freeze(["仅挂起复核门；页面版本、原文与评注层尚待冻结。"]),
    counterexamples: Object.freeze(["在来源、专家与案例门关闭前不得据此改写当前分档。"]),
    reviewStatus: "blocked_source_verification",
    displayStatus: "withheld_pending_verified_locator_or_review"
  })
]);

export const BAZI_STRENGTH_CLAIM_REGISTRY: BaziStrengthClaimRegistry = Object.freeze({
  profile: BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE,
  sources,
  sourceBindings,
  claims,
  boundary: Object.freeze({
    digitalTranscriptionEqualsVerifiedFacsimile: false as const,
    engineeringParametersClaimTraditionalAuthority: false as const,
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const,
    formalActivationAllowed: false as const,
    result: null
  })
});

function assertUniqueOrdered(values: readonly { order: number }[], ids: readonly string[], subject: string): void {
  if (values.length !== ids.length || new Set(ids).size !== ids.length) throw new Error(`${subject} ID 必须完整且唯一`);
  if (values.some((value, index) => value.order !== index + 1)) throw new Error(`${subject} 顺序必须从 1 连续递增`);
}

function isVerifiedSource(source: BaziStrengthClaimSource): boolean {
  return source.verificationStatus === "repository_policy_verified"
    || source.verificationStatus === "locator_verified_in_pinned_revision";
}

export function validateBaziStrengthClaimRegistry(registry: BaziStrengthClaimRegistry): void {
  if (registry.profile.projectionVersion !== BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE.projectionVersion
    || registry.profile.contentVersion !== "0.18.0") {
    throw new Error("旺衰来源—主张注册表 profile 不匹配");
  }
  assertUniqueOrdered(registry.sources, registry.sources.map((source) => source.sourceId), "旺衰来源");
  assertUniqueOrdered(registry.sourceBindings, registry.sourceBindings.map((binding) => binding.bindingId), "旺衰来源定位");
  assertUniqueOrdered(registry.claims, registry.claims.map((entry) => entry.claimId), "旺衰主张");

  const sourceById = new Map(registry.sources.map((source) => [source.sourceId, source] as const));
  const bindingById = new Map(registry.sourceBindings.map((binding) => [binding.bindingId, binding] as const));
  for (const source of registry.sources) {
    if (!source.title.trim() || !source.editionOrCarrier.trim() || !source.usageBoundary.trim()) {
      throw new Error(`旺衰来源字段不得为空：${source.sourceId}`);
    }
    if (!source.url.startsWith("https://") && !source.url.startsWith("/packages/")) {
      throw new Error(`旺衰来源 URL 范围无效：${source.sourceId}`);
    }
    if (source.stableRevision && source.url.startsWith("https://")
      && !source.url.includes(`oldid=${source.stableRevision}`)) {
      throw new Error(`旺衰来源固定版本与 URL 不一致：${source.sourceId}`);
    }
    if (source.expertTruthClaimed !== false || source.scientificValidityClaimed !== false) {
      throw new Error(`旺衰来源不得声称专家或科学真值：${source.sourceId}`);
    }
  }

  for (const binding of registry.sourceBindings) {
    const source = sourceById.get(binding.sourceId);
    if (!source || source.sourceType !== binding.sourceType) {
      throw new Error(`旺衰来源定位无法解析：${binding.bindingId}`);
    }
    if (!binding.exactLocator.value.trim() || binding.doesNotSupport.length === 0) {
      throw new Error(`旺衰来源定位必须含精确 locator 与反向边界：${binding.bindingId}`);
    }
    const expectedVerified = isVerifiedSource(source) && binding.exactLocator.verificationStatus === "verified";
    if (binding.exactLocator.verificationStatus === "verified" && !expectedVerified) {
      throw new Error(`未冻结或警告来源不得标成已核 locator：${binding.bindingId}`);
    }
    if (binding.parameterSupport === "exact_engineering_definition"
      && (source.sourceType !== "engineering_contract" || binding.evidenceRole !== "defines_engineering_candidate")) {
      throw new Error(`工程参数必须由内部工程合同定义：${binding.bindingId}`);
    }
  }

  const numericClaimTypes = new Set<BaziStrengthClaimType>([
    "factor_weighting",
    "classification_threshold",
    "duplication_policy"
  ]);
  for (const entry of registry.claims) {
    if (!entry.candidateStatement.trim() || entry.factInputs.length === 0 && entry.claimType !== "traditional_rationale") {
      throw new Error(`旺衰主张内容或事实输入为空：${entry.claimId}`);
    }
    if (!entry.sourceBindingIds.length || new Set(entry.sourceBindingIds).size !== entry.sourceBindingIds.length) {
      throw new Error(`旺衰主张必须绑定唯一来源定位：${entry.claimId}`);
    }
    const resolved = entry.sourceBindingIds.map((bindingId) => bindingById.get(bindingId));
    if (resolved.some((binding) => !binding)) throw new Error(`旺衰主张引用未知来源定位：${entry.claimId}`);
    const bindings = resolved as BaziStrengthClaimSourceBinding[];
    if (entry.displayStatus !== "withheld_pending_verified_locator_or_review"
      && bindings.some((binding) => binding.exactLocator.verificationStatus !== "verified")) {
      throw new Error(`启用主张不得依赖待核 locator：${entry.claimId}`);
    }
    if (numericClaimTypes.has(entry.claimType)
      && !bindings.some((binding) => binding.parameterSupport === "exact_engineering_definition")) {
      throw new Error(`数值主张必须由内部工程定义支撑：${entry.claimId}`);
    }
    if (entry.expertTruthClaimed !== false || entry.scientificValidityClaimed !== false
      || entry.formalActivationAllowed !== false || entry.result !== null) {
      throw new Error(`旺衰主张正式结论边界未关闭：${entry.claimId}`);
    }
    if (entry.applicabilityConditions.length === 0 || entry.counterexamples.length === 0
      || entry.prohibitedOutcomeClaims.length !== PROHIBITED_OUTCOMES.length) {
      throw new Error(`旺衰主张必须公开条件、反例与禁止结论：${entry.claimId}`);
    }
  }

  if (registry.boundary.digitalTranscriptionEqualsVerifiedFacsimile !== false
    || registry.boundary.engineeringParametersClaimTraditionalAuthority !== false
    || registry.boundary.expertTruthClaimed !== false
    || registry.boundary.scientificValidityClaimed !== false
    || registry.boundary.formalActivationAllowed !== false
    || registry.boundary.result !== null) {
    throw new Error("旺衰来源—主张注册表边界未关闭");
  }
}

validateBaziStrengthClaimRegistry(BAZI_STRENGTH_CLAIM_REGISTRY);
