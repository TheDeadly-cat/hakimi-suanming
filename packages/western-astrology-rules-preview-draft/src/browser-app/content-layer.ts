import type { WesternRuleLayerArtifact } from "../rule-layer-bridge.ts";

export const WESTERN_CONTENT_LAYER_VERSION =
  "western-astrology-neutral-content/0.5-draft" as const;

const BODY_IDS = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
] as const;

const SIGN_IDS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
] as const;

const ASPECT_IDS = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition"
] as const;

const ANGLE_IDS = [
  "ascendant",
  "midheaven",
  "descendant",
  "imum_coeli"
] as const;

const CORE_BODY_IDS = ["sun", "moon", "mercury", "venus", "mars"] as const;
const SLOW_BODY_HOUSE_FIRST_IDS = ["saturn", "uranus", "neptune", "pluto"] as const;

type BodyId = typeof BODY_IDS[number];
type SignId = typeof SIGN_IDS[number];
type AspectId = typeof ASPECT_IDS[number];
type AngleId = typeof ANGLE_IDS[number];
type ElementLabel = "火" | "土" | "风" | "水";
type ModalityLabel = "开创" | "固定" | "变动";
type ReviewStatus = "awaiting_expert_review";

interface ExpertReview {
  readonly status: ReviewStatus;
  readonly questions: readonly string[];
  readonly result: null;
}

export interface WesternContentSource {
  readonly sourceId: string;
  readonly title: string;
  readonly url: string;
  readonly publisher: string;
  readonly role: "practitioner_reference" | "interpretation_boundary" | "scientific_boundary";
  readonly accessedAt: "2026-08-12";
}

export const WESTERN_PRIMITIVE_CONTENT_REVIEW_VERSION =
  "western-astrology-primitive-content/0.1.0" as const;

export type WesternPrimitiveContentCategory =
  | "planet"
  | "sign"
  | "house"
  | "aspect"
  | "angle";

export interface WesternPrimitiveContentReviewCandidate {
  readonly contentId: string;
  readonly order: number;
  readonly category: WesternPrimitiveContentCategory;
  readonly key: string;
  readonly label: string;
  readonly candidateSummary: string;
  readonly resourceStatement: string;
  readonly tensionStatement: string;
  readonly scopeNote: string;
  readonly reviewPrompt: string;
  readonly sourceIds: readonly string[];
  readonly expertTruthClaimed: false;
  readonly scientificValidityClaimed: false;
  readonly formalActivationAllowed: false;
  readonly goodBadOrientation: null;
  readonly eventOutcome: null;
  readonly result: null;
}

interface PlanetContent {
  readonly bodyId: BodyId;
  readonly label: string;
  readonly glyph: string;
  readonly focus: string;
  readonly resource: string;
  readonly tension: string;
  readonly scopeNote: string;
  readonly sourceId: string;
}

interface SignContent {
  readonly signId: SignId;
  readonly label: string;
  readonly element: ElementLabel;
  readonly modality: ModalityLabel;
  readonly style: string;
  readonly tension: string;
}

interface HouseContent {
  readonly houseNumber: number;
  readonly label: string;
  readonly area: string;
  readonly boundary: string | null;
}

interface AspectContent {
  readonly aspectId: AspectId;
  readonly label: string;
  readonly exactAngleDeg: number;
  readonly dynamic: string;
  readonly resource: string;
  readonly tension: string;
}

interface AngleContent {
  readonly angleId: AngleId;
  readonly label: string;
  readonly abbreviation: "ASC" | "MC" | "DSC" | "IC";
  readonly focus: string;
  readonly resource: string;
  readonly tension: string;
  readonly scopeNote: string;
  readonly sourceId: string;
}

export interface WesternPlacementContentCandidate {
  readonly candidateId: string;
  readonly bodyId: BodyId;
  readonly bodyLabel: string;
  readonly bodyGlyph: string;
  readonly signId: SignId;
  readonly signLabel: string;
  readonly houseNumber: number | null;
  readonly houseLabel: string | null;
  readonly longitudeDeg: number;
  readonly degreeWithinSign: number;
  readonly retrograde: boolean;
  readonly factSummary: string;
  readonly directStatement: string;
  readonly resourceStatement: string;
  readonly tensionStatement: string;
  readonly scopeNote: string;
  readonly sourceIds: readonly string[];
  readonly review: Readonly<ExpertReview>;
}

export interface WesternAspectContentCandidate {
  readonly candidateId: string;
  readonly bodyA: BodyId;
  readonly bodyB: BodyId;
  readonly aspectId: AspectId;
  readonly aspectLabel: string;
  readonly exactAngleDeg: number;
  readonly orbDeg: number;
  readonly motion: "exact" | "applying" | "separating" | "indeterminate";
  readonly factSummary: string;
  readonly directStatement: string;
  readonly resourceStatement: string;
  readonly tensionStatement: string;
  readonly sourceIds: readonly string[];
  readonly review: Readonly<ExpertReview>;
}

export interface WesternAngleContentCandidate {
  readonly candidateId: string;
  readonly angleId: AngleId;
  readonly angleLabel: string;
  readonly abbreviation: AngleContent["abbreviation"];
  readonly signId: SignId;
  readonly signLabel: string;
  readonly eclipticLongitudeDeg: number;
  readonly zodiacLongitudeDeg: number;
  readonly degreeWithinSign: number;
  readonly factSummary: string;
  readonly directStatement: string;
  readonly resourceStatement: string;
  readonly tensionStatement: string;
  readonly scopeNote: string;
  readonly sourceIds: readonly string[];
  readonly review: Readonly<ExpertReview>;
}

export interface WesternDistributionBucket {
  readonly id: "fire" | "earth" | "air" | "water" | "cardinal" | "fixed" | "mutable";
  readonly label: ElementLabel | ModalityLabel;
  readonly count: number;
  readonly bodyIds: readonly BodyId[];
}

export interface WesternDistributionScope {
  readonly scopeId: "all_bodies" | "core_five";
  readonly label: string;
  readonly bodyIds: readonly BodyId[];
  readonly elements: readonly WesternDistributionBucket[];
  readonly modalities: readonly WesternDistributionBucket[];
}

export interface WesternDistributionSummary {
  readonly candidateId: "western.distribution.elements-modalities";
  readonly factSummary: string;
  readonly directStatement: string;
  readonly useStatement: string;
  readonly limitStatement: string;
  readonly scopeNote: string;
  readonly scopes: readonly [WesternDistributionScope, WesternDistributionScope];
  readonly sourceIds: readonly string[];
  readonly review: Readonly<ExpertReview>;
}

export interface WesternRulerPath {
  readonly profile: "traditional" | "modern";
  readonly rulerBodyId: BodyId;
  readonly rulerBodyLabel: string;
  readonly placementAvailable: boolean;
  readonly rulerSignId: SignId | null;
  readonly rulerSignLabel: string | null;
  readonly rulerHouseNumber: number | null;
  readonly rulerHouseLabel: string | null;
  readonly retrograde: boolean | null;
  readonly statement: string;
}

export interface WesternHouseRulerCandidate {
  readonly candidateId: string;
  readonly houseNumber: number;
  readonly houseLabel: string;
  readonly cuspSignId: SignId;
  readonly cuspSignLabel: string;
  readonly eclipticLongitudeDeg: number;
  readonly zodiacLongitudeDeg: number;
  readonly degreeWithinSign: number;
  readonly factSummary: string;
  readonly directStatement: string;
  readonly traditional: WesternRulerPath;
  readonly modern: WesternRulerPath;
  readonly scopeNote: string;
  readonly sourceIds: readonly string[];
  readonly review: Readonly<ExpertReview>;
}

export interface WesternChartRulerCandidate {
  readonly candidateId: "western.chart-ruler.ascendant";
  readonly ascendantSignId: SignId;
  readonly ascendantSignLabel: string;
  readonly factSummary: string;
  readonly directStatement: string;
  readonly traditional: WesternRulerPath;
  readonly modern: WesternRulerPath;
  readonly scopeNote: string;
  readonly sourceIds: readonly string[];
  readonly review: Readonly<ExpertReview>;
}

export interface WesternDispositorChainNode {
  readonly bodyId: BodyId;
  readonly bodyLabel: string;
  readonly signId: SignId;
  readonly signLabel: string;
  readonly houseNumber: number | null;
  readonly houseLabel: string | null;
  readonly retrograde: boolean;
  readonly nextRulerBodyId: BodyId;
  readonly nextRulerBodyLabel: string;
}

export interface WesternDispositorChain {
  readonly profile: WesternRulerPath["profile"];
  readonly nodes: readonly WesternDispositorChainNode[];
  readonly termination: "domicile" | "cycle" | "missing_ruler_body";
  readonly terminalBodyId: BodyId | null;
  readonly missingBodyId: BodyId | null;
  readonly cycleBodyIds: readonly BodyId[];
  readonly twoBodySignExchange: boolean;
  readonly statement: string;
}

export interface WesternDispositorCandidate {
  readonly candidateId: string;
  readonly startBodyId: BodyId;
  readonly startBodyLabel: string;
  readonly factSummary: string;
  readonly directStatement: string;
  readonly traditional: WesternDispositorChain;
  readonly modern: WesternDispositorChain;
  readonly profilesEqual: boolean;
  readonly scopeNote: string;
  readonly sourceIds: readonly string[];
  readonly review: Readonly<ExpertReview>;
}

export interface WesternAngleProximityEntry {
  readonly rank: number;
  readonly bodyId: BodyId;
  readonly bodyLabel: string;
  readonly angleId: AngleId;
  readonly angleLabel: string;
  readonly angleAbbreviation: AngleContent["abbreviation"];
  readonly separationDeg: number;
  readonly bodyLongitudeDeg: number;
  readonly angleLongitudeDeg: number;
  readonly houseNumber: number | null;
  readonly houseLabel: string | null;
  readonly withinOneDegreeReviewBand: boolean;
}

export interface WesternAngleProximitySummary {
  readonly candidateId: "western.angle-proximity.nearest-axis-ledger";
  readonly factSummary: string;
  readonly directStatement: string;
  readonly useStatement: string;
  readonly limitStatement: string;
  readonly scopeNote: string;
  readonly entries: readonly WesternAngleProximityEntry[];
  readonly sourceIds: readonly string[];
  readonly review: Readonly<ExpertReview>;
}

export interface WesternBodyAspectLink {
  readonly counterpartBodyId: BodyId;
  readonly counterpartBodyLabel: string;
  readonly candidate: WesternAspectContentCandidate;
}

export interface WesternBodySynthesisCandidate {
  readonly candidateId: string;
  readonly bodyId: BodyId;
  readonly bodyLabel: string;
  readonly bodyGlyph: string;
  readonly factSummary: string;
  readonly directStatement: string;
  readonly readingOrderStatement: string;
  readonly placement: WesternPlacementContentCandidate;
  readonly aspectLinks: readonly WesternBodyAspectLink[];
  readonly dispositor: WesternDispositorCandidate;
  readonly nearestAngle: WesternAngleProximityEntry | null;
  readonly chartRulerProfiles: readonly WesternRulerPath["profile"][];
  readonly slowBodyHouseFirst: boolean;
  readonly scopeNote: string;
  readonly sourceIds: readonly string[];
  readonly evidenceClass: "derived_same_body_projection";
  readonly overallResult: null;
  readonly goodBadOrientation: null;
  readonly review: Readonly<ExpertReview>;
}

export interface WesternFirstReadEntry {
  readonly key: "sun" | "moon" | "ascendant" | "chart_ruler";
  readonly sequence: 1 | 2 | 3 | 4;
  readonly label: string;
  readonly availability: "available" | "not_requested" | "not_available";
  readonly referencedCandidateIds: readonly string[];
  readonly factSummary: string;
  readonly directStatement: string;
  readonly correctionStatement: string;
  readonly sourceIds: readonly string[];
}

export interface WesternFirstReadCandidate {
  readonly candidateId: "western.first-read.sun-moon-ascendant-chart-ruler";
  readonly factSummary: string;
  readonly directStatement: string;
  readonly readingOrderStatement: string;
  readonly entries: readonly WesternFirstReadEntry[];
  readonly availableCount: number;
  readonly missingKeys: readonly WesternFirstReadEntry["key"][];
  readonly scopeNote: string;
  readonly sourceIds: readonly string[];
  readonly evidenceClass: "derived_reading_order_projection";
  readonly selectedPrimaryFactor: null;
  readonly overallResult: null;
  readonly goodBadOrientation: null;
  readonly review: Readonly<ExpertReview>;
}

export interface WesternContentProjection {
  readonly projectionVersion: typeof WESTERN_CONTENT_LAYER_VERSION;
  readonly outcome: "candidate_content_built";
  readonly factsSha256: string;
  readonly framework: "modern_western_astrology_source_bound_candidate";
  readonly boundary: Readonly<{
    expertTruthClaimed: false;
    scientificValidityClaimed: false;
    deterministicOutcomeClaimed: false;
    goodBadScoreGenerated: false;
    medicalOrFinancialAdviceGenerated: false;
    note: string;
  }>;
  readonly firstRead: WesternFirstReadCandidate;
  readonly chartRuler: WesternChartRulerCandidate | null;
  readonly bodySyntheses: readonly WesternBodySynthesisCandidate[];
  readonly dispositorChains: readonly WesternDispositorCandidate[];
  readonly angleProximity: WesternAngleProximitySummary | null;
  readonly angles: readonly WesternAngleContentCandidate[];
  readonly distribution: WesternDistributionSummary;
  readonly houseRulers: readonly WesternHouseRulerCandidate[];
  readonly placements: readonly WesternPlacementContentCandidate[];
  readonly aspects: readonly WesternAspectContentCandidate[];
  readonly sources: readonly WesternContentSource[];
}

export const WESTERN_CONTENT_SOURCES: readonly WesternContentSource[] = Object.freeze([
  ...BODY_IDS.map((bodyId) => Object.freeze({
    sourceId: `astrodienst.planet.${bodyId}`,
    title: `Astrodienst Astrowiki · ${bodyId[0]!.toUpperCase()}${bodyId.slice(1)}`,
    url: `https://www.astro.com/astrowiki/en/${bodyId[0]!.toUpperCase()}${bodyId.slice(1)}`,
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  })),
  Object.freeze({
    sourceId: "astrodienst.signs",
    title: "Astrodienst · A Brief Introduction to Astrology: The Signs",
    url: "https://www.astro.com/astrology/in_signs_e.htm",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.houses",
    title: "Astrodienst Astrowiki · House",
    url: "https://www.astro.com/astrowiki/en/House",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.aspects",
    title: "Astrodienst · A Brief Introduction to Astrology: Aspects",
    url: "https://www.astro.com/astrology/in_aspect_e.htm",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.angle.ascendant",
    title: "Astrodienst Astrowiki · Ascendant",
    url: "https://www.astro.com/astrowiki/en/Ascendant",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.angle.midheaven",
    title: "Astrodienst Astrowiki · Medium Coeli",
    url: "https://www.astro.com/astrowiki/en/MC",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.angle.descendant",
    title: "Astrodienst Astrowiki · Descendant",
    url: "https://www.astro.com/astrowiki/en/Desc",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.angle.imum_coeli",
    title: "Astrodienst Astrowiki · Imum Coeli",
    url: "https://www.astro.com/astrowiki/en/IC",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.elements",
    title: "Astrodienst Astrowiki · Element",
    url: "https://www.astro.com/astrowiki/en/Element",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.qualities",
    title: "Astrodienst Astrowiki · Quality",
    url: "https://www.astro.com/astrowiki/en/Quality",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.house_ruler",
    title: "Astrodienst Astrowiki · House Ruler",
    url: "https://www.astro.com/astrowiki/en/House_Ruler",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.ruler",
    title: "Astrodienst Astrowiki · Ruler",
    url: "https://www.astro.com/astrowiki/en/Ruler",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.chart_ruler",
    title: "Astrodienst Astrowiki · Chart Ruler",
    url: "https://www.astro.com/astrowiki/en/Chart_Ruler",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.dispositor",
    title: "Astrodienst Astrowiki · Dispositor",
    url: "https://www.astro.com/astrowiki/en/Dispositor",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.chain_of_dispositors",
    title: "Astrodienst Astrowiki · Chain of Dispositors",
    url: "https://www.astro.com/astrowiki/en/Chain_of_Dispositors",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.angular_planet",
    title: "Astrodienst Astrowiki · Angular Planet",
    url: "https://www.astro.com/astrowiki/en/Angular_Planet",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.art_of_combination",
    title: "Astrodienst Astrowiki · Art of Combination",
    url: "https://www.astro.com/astrowiki/en/Art_of_Combination",
    publisher: "Astrodienst AG",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "skyscript.dispositor",
    title: "Skyscript Glossary · Dispositor",
    url: "https://www.skyscript.co.uk/glossary/dispositor/",
    publisher: "Skyscript / Deborah Houlding",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "skyscript.angular",
    title: "Skyscript Glossary · Angles / Angular",
    url: "https://www.skyscript.co.uk/glossary/angular/",
    publisher: "Skyscript / Deborah Houlding",
    role: "practitioner_reference" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.interpretation",
    title: "Astrodienst Astrowiki · Interpretation",
    url: "https://www.astro.com/astrowiki/en/Interpretation",
    publisher: "Astrodienst AG",
    role: "interpretation_boundary" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "astrodienst.interpretation_limits",
    title: "Astrodienst Astrowiki · Limits of Interpretation",
    url: "https://www.astro.com/astrowiki/en/Limits_of_Interpretation",
    publisher: "Astrodienst AG",
    role: "interpretation_boundary" as const,
    accessedAt: "2026-08-12" as const
  }),
  Object.freeze({
    sourceId: "nature.carlson_1985",
    title: "Nature · A double-blind test of astrology",
    url: "https://www.nature.com/articles/318419a0",
    publisher: "Nature",
    role: "scientific_boundary" as const,
    accessedAt: "2026-08-12" as const
  })
]);

const PLANETS: Readonly<Record<BodyId, PlanetContent>> = Object.freeze({
  sun: Object.freeze({
    bodyId: "sun", label: "太阳", glyph: "☉",
    focus: "自我认同、意志与创造性表达",
    resource: "更清楚地确认自己要成为什么，并主动投入创造",
    tension: "把自我价值绑在外界肯定上，或让个人意志压过其他因素",
    scopeNote: "太阳只是全盘核心之一，仍需与月亮、上升及相位共同阅读。",
    sourceId: "astrodienst.planet.sun"
  }),
  moon: Object.freeze({
    bodyId: "moon", label: "月亮", glyph: "☽",
    focus: "情绪需要、习惯反应与安全感",
    resource: "辨认真实需要，并建立可持续的情绪照料方式",
    tension: "被熟悉反应牵着走，或把短时情绪当成全部事实",
    scopeNote: "月亮描述的是象征性的需要与反应，不构成心理或健康诊断。",
    sourceId: "astrodienst.planet.moon"
  }),
  mercury: Object.freeze({
    bodyId: "mercury", label: "水星", glyph: "☿",
    focus: "信息处理、学习、思考与表达",
    resource: "形成适合自己的学习、提问与沟通路径",
    tension: "信息过载、表达失焦，或只用单一逻辑解释复杂经验",
    scopeNote: "水星主题不能单独推出智力水平或教育成就。",
    sourceId: "astrodienst.planet.mercury"
  }),
  venus: Object.freeze({
    bodyId: "venus", label: "金星", glyph: "♀",
    focus: "吸引、关系方式、审美与价值取舍",
    resource: "辨认自己珍视什么，并用互惠方式建立连接",
    tension: "为维持表面和谐而回避差异，或把喜欢误当成长期适配",
    scopeNote: "金星不单独决定婚姻、性别角色、伴侣类型或关系结局。",
    sourceId: "astrodienst.planet.venus"
  }),
  mars: Object.freeze({
    bodyId: "mars", label: "火星", glyph: "♂",
    focus: "行动、主张、欲望与冲突方式",
    resource: "把意愿转成行动，并在必要时清楚设限",
    tension: "冲动、争夺或压抑行动力后以更激烈方式反弹",
    scopeNote: "火星不用于推断暴力、性别气质或具体事故。",
    sourceId: "astrodienst.planet.mars"
  }),
  jupiter: Object.freeze({
    bodyId: "jupiter", label: "木星", glyph: "♃",
    focus: "扩展、意义、信念与视野",
    resource: "通过学习、探索与建立更大框架拓展可能性",
    tension: "过度乐观、承诺过量，或把个人信念当成普遍答案",
    scopeNote: "木星不是自动的好运或财富指标，必须结合全盘条件。",
    sourceId: "astrodienst.planet.jupiter"
  }),
  saturn: Object.freeze({
    bodyId: "saturn", label: "土星", glyph: "♄",
    focus: "边界、责任、限制与长期锻炼",
    resource: "通过结构、耐心与反复练习形成可靠能力",
    tension: "因害怕失败而僵化、自我否定，或把规则本身当成目的",
    scopeNote: "土星不等同于灾难；这里也不自动套用年龄或事件预测。",
    sourceId: "astrodienst.planet.saturn"
  }),
  uranus: Object.freeze({
    bodyId: "uranus", label: "天王星", glyph: "♅",
    focus: "独立、创新、突变与打破惯例",
    resource: "看见旧结构之外的选择，并为自主性腾出空间",
    tension: "为了不同而不同，或在尚未承接后果时突然切断",
    scopeNote: "天王星移动缓慢；个体阅读通常更看重落宫及与个人行星的相位。",
    sourceId: "astrodienst.planet.uranus"
  }),
  neptune: Object.freeze({
    bodyId: "neptune", label: "海王星", glyph: "♆",
    focus: "想象、理想、共情与边界模糊",
    resource: "借助想象、艺术或同理心连接更广阔的经验",
    tension: "理想化、投射或在边界不清时难以核对现实",
    scopeNote: "海王星移动缓慢；本候选不据此判断成瘾、疾病或欺骗事件。",
    sourceId: "astrodienst.planet.neptune"
  }),
  pluto: Object.freeze({
    bodyId: "pluto", label: "冥王星", glyph: "♇",
    focus: "权力、执着、揭露与深层转化",
    resource: "深入问题核心，清理已经失去作用的控制模式",
    tension: "陷入控制与反控制、全有全无，或把强度误当成真实",
    scopeNote: "冥王星移动缓慢；不据此推断死亡、创伤或具体危机。",
    sourceId: "astrodienst.planet.pluto"
  })
});

const SIGNS: Readonly<Record<SignId, SignContent>> = Object.freeze({
  aries: Object.freeze({ signId: "aries", label: "白羊", element: "火", modality: "开创", style: "主动、直接、先行动", tension: "急于启动而忽略节奏与协商" }),
  taurus: Object.freeze({ signId: "taurus", label: "金牛", element: "土", modality: "固定", style: "稳定、感官、重视可持续", tension: "因求稳而抗拒必要变化" }),
  gemini: Object.freeze({ signId: "gemini", label: "双子", element: "风", modality: "变动", style: "好奇、连接、快速交换信息", tension: "分散、浅尝或不停切换焦点" }),
  cancer: Object.freeze({ signId: "cancer", label: "巨蟹", element: "水", modality: "开创", style: "保护、感受、建立归属", tension: "防御或过度受情绪牵动" }),
  leo: Object.freeze({ signId: "leo", label: "狮子", element: "火", modality: "固定", style: "自信、表现、持续投入创造", tension: "把认可需求放在内容本身之前" }),
  virgo: Object.freeze({ signId: "virgo", label: "处女", element: "土", modality: "变动", style: "分析、改进、关注细节与用途", tension: "因追求正确而过度挑剔或迟迟不交付" }),
  libra: Object.freeze({ signId: "libra", label: "天秤", element: "风", modality: "开创", style: "比较、协调、从关系中形成判断", tension: "为维持平衡而延迟必要立场" }),
  scorpio: Object.freeze({ signId: "scorpio", label: "天蝎", element: "水", modality: "固定", style: "深入、专注、重视信任与隐私", tension: "猜疑、控制或难以松开已投入的关系与议题" }),
  sagittarius: Object.freeze({ signId: "sagittarius", label: "射手", element: "火", modality: "变动", style: "探索、概括、追求意义与远景", tension: "跳过细节，或把热情扩展成过度承诺" }),
  capricorn: Object.freeze({ signId: "capricorn", label: "摩羯", element: "土", modality: "开创", style: "结构、责任、以长期结果为导向", tension: "过度功利、压抑过程需要或只认可可量化成果" }),
  aquarius: Object.freeze({ signId: "aquarius", label: "水瓶", element: "风", modality: "固定", style: "独立、系统化、面向群体与未来", tension: "以抽象原则取代具体情感与个体差异" }),
  pisces: Object.freeze({ signId: "pisces", label: "双鱼", element: "水", modality: "变动", style: "接纳、想象、感知边界之间的联系", tension: "界限松散、回避核验或被环境带走" })
});

const HOUSES: readonly HouseContent[] = Object.freeze([
  Object.freeze({ houseNumber: 1, label: "一宫", area: "自我呈现、身体经验、开始与主动性", boundary: null }),
  Object.freeze({ houseNumber: 2, label: "二宫", area: "个人资源、金钱使用、所有物与价值感", boundary: "不用于财富保证或投资判断" }),
  Object.freeze({ houseNumber: 3, label: "三宫", area: "日常沟通、学习、手足与近距离环境", boundary: null }),
  Object.freeze({ houseNumber: 4, label: "四宫", area: "家庭、根基、居所与私密生活", boundary: null }),
  Object.freeze({ houseNumber: 5, label: "五宫", area: "创造、娱乐、恋爱表达与子女议题", boundary: "不用于生育或关系结果预测" }),
  Object.freeze({ houseNumber: 6, label: "六宫", area: "日常制度、工作技能、服务与健康习惯", boundary: "不用于疾病诊断" }),
  Object.freeze({ houseNumber: 7, label: "七宫", area: "一对一关系、协商、契约与公开对手", boundary: "不用于婚期或离婚预测" }),
  Object.freeze({ houseNumber: 8, label: "八宫", area: "共享资源、亲密、债务与深层变化", boundary: "不用于死亡或灾祸预测" }),
  Object.freeze({ houseNumber: 9, label: "九宫", area: "高等学习、世界观、法律与远行", boundary: null }),
  Object.freeze({ houseNumber: 10, label: "十宫", area: "职业方向、公共角色、目标与社会责任", boundary: "不用于职业成败保证" }),
  Object.freeze({ houseNumber: 11, label: "十一宫", area: "朋友、群体、网络与共同愿景", boundary: null }),
  Object.freeze({ houseNumber: 12, label: "十二宫", area: "隐退、私密、收束与内在世界", boundary: "不用于精神或健康诊断" })
]);

const ASPECTS: Readonly<Record<AspectId, AspectContent>> = Object.freeze({
  conjunction: Object.freeze({
    aspectId: "conjunction", label: "合相", exactAngleDeg: 0,
    dynamic: "两种功能直接汇合并互相放大，较难分开运作",
    resource: "把两种能力集中到同一议题上",
    tension: "其中一方遮住另一方，或强度过高而缺少缓冲"
  }),
  sextile: Object.freeze({
    aspectId: "sextile", label: "六合", exactAngleDeg: 60,
    dynamic: "两种功能之间存在可协作的通道，但通常需要主动使用",
    resource: "通过练习把不同能力连接成可用机会",
    tension: "因互动较轻松而忽略开发，潜力停留在可能性上"
  }),
  square: Object.freeze({
    aspectId: "square", label: "刑相", exactAngleDeg: 90,
    dynamic: "两种功能形成持续摩擦，迫使人调整做法或优先级",
    resource: "摩擦提供行动动力，并促使能力变得具体",
    tension: "反复卡在互相排斥的需要里，以冲突代替整合"
  }),
  trine: Object.freeze({
    aspectId: "trine", label: "拱相", exactAngleDeg: 120,
    dynamic: "两种功能较自然地流动和互相支持",
    resource: "低阻力地调动两种能力，形成稳定协同",
    tension: "因为来得自然而缺少觉察，优势可能被惯性消耗"
  }),
  opposition: Object.freeze({
    aspectId: "opposition", label: "冲相", exactAngleDeg: 180,
    dynamic: "两种功能位于一条轴线两端，需要在关系或情境中寻找平衡",
    resource: "看见对立面的价值，并发展切换与协商能力",
    tension: "把一端投射给别人，或长期在两个极端之间摆动"
  })
});

const ANGLES: Readonly<Record<AngleId, AngleContent>> = Object.freeze({
  ascendant: Object.freeze({
    angleId: "ascendant",
    label: "上升",
    abbreviation: "ASC",
    focus: "进入情境、自我呈现与主动起点",
    resource: "有意识地选择自己如何开始、回应环境并让他人看见自己",
    tension: "把第一反应或外在形象误当成全部自我",
    scopeNote: "上升高度依赖出生时间与地点；本页只使用当前演示几何，不据此校正出生时间。",
    sourceId: "astrodienst.angle.ascendant"
  }),
  midheaven: Object.freeze({
    angleId: "midheaven",
    label: "天顶",
    abbreviation: "MC",
    focus: "公共角色、职业方向与社会可见度",
    resource: "辨认希望向外界承担什么角色，以及想留下怎样的工作痕迹",
    tension: "把社会评价或职业标签当成唯一价值",
    scopeNote: "天顶候选不等于职业成败、职位或收入预测；不同宫制也可能让 MC 与十宫宫头不重合。",
    sourceId: "astrodienst.angle.midheaven"
  }),
  descendant: Object.freeze({
    angleId: "descendant",
    label: "下降",
    abbreviation: "DSC",
    focus: "一对一关系、协商与他人视角",
    resource: "从具体关系中看见自己未充分使用的方式，并发展互惠协商",
    tension: "把某些特质全部投射给对方，或只靠关系确认自我",
    scopeNote: "下降候选不决定伴侣类型、婚期或关系结局。",
    sourceId: "astrodienst.angle.descendant"
  }),
  imum_coeli: Object.freeze({
    angleId: "imum_coeli",
    label: "天底",
    abbreviation: "IC",
    focus: "家庭根基、私密归属与内在支点",
    resource: "辨认恢复安全感与安顿私生活所需的环境和节奏",
    tension: "被旧有归属模式限制，或把私密需要完全藏起来",
    scopeNote: "天底候选不用于判断原生家庭事件、创伤或心理诊断。",
    sourceId: "astrodienst.angle.imum_coeli"
  })
});

const TRADITIONAL_RULERS: Readonly<Record<SignId, BodyId>> = Object.freeze({
  aries: "mars",
  taurus: "venus",
  gemini: "mercury",
  cancer: "moon",
  leo: "sun",
  virgo: "mercury",
  libra: "venus",
  scorpio: "mars",
  sagittarius: "jupiter",
  capricorn: "saturn",
  aquarius: "saturn",
  pisces: "jupiter"
});

const MODERN_RULERS: Readonly<Record<SignId, BodyId>> = Object.freeze({
  ...TRADITIONAL_RULERS,
  scorpio: "pluto",
  aquarius: "uranus",
  pisces: "neptune"
});

const ELEMENT_BUCKETS = Object.freeze([
  Object.freeze({ id: "fire" as const, label: "火" as const }),
  Object.freeze({ id: "earth" as const, label: "土" as const }),
  Object.freeze({ id: "air" as const, label: "风" as const }),
  Object.freeze({ id: "water" as const, label: "水" as const })
]);

const MODALITY_BUCKETS = Object.freeze([
  Object.freeze({ id: "cardinal" as const, label: "开创" as const }),
  Object.freeze({ id: "fixed" as const, label: "固定" as const }),
  Object.freeze({ id: "mutable" as const, label: "变动" as const })
]);

const SOURCE_BY_ID = new Map(WESTERN_CONTENT_SOURCES.map((source) => [source.sourceId, source]));
const HOUSE_BY_NUMBER = new Map(HOUSES.map((house) => [house.houseNumber, house]));

const definitiveOutcomePattern = /注定|必然|一定会|寿命|死亡时间|患有|诊断为|发财|破财|离婚时间|婚期|中奖/u;

function assertRegistry(): void {
  const uniqueSources = new Set(WESTERN_CONTENT_SOURCES.map((source) => source.sourceId));
  if (uniqueSources.size !== WESTERN_CONTENT_SOURCES.length) {
    throw new Error("western content sources must be unique");
  }
  for (const source of WESTERN_CONTENT_SOURCES) {
    if (!source.url.startsWith("https://") || source.title.trim().length === 0) {
      throw new Error(`invalid western content source ${source.sourceId}`);
    }
  }
  if (Object.keys(PLANETS).length !== BODY_IDS.length
    || Object.keys(SIGNS).length !== SIGN_IDS.length
    || HOUSES.length !== 12
    || Object.keys(ASPECTS).length !== ASPECT_IDS.length
    || Object.keys(ANGLES).length !== ANGLE_IDS.length
    || Object.keys(TRADITIONAL_RULERS).length !== SIGN_IDS.length
    || Object.keys(MODERN_RULERS).length !== SIGN_IDS.length) {
    throw new Error("western content registries are incomplete");
  }
  for (const bodyId of BODY_IDS) {
    const planet = PLANETS[bodyId];
    if (planet.bodyId !== bodyId || !SOURCE_BY_ID.has(planet.sourceId)) {
      throw new Error(`invalid planet content ${bodyId}`);
    }
    for (const text of [planet.focus, planet.resource, planet.tension]) {
      if (definitiveOutcomePattern.test(text)) {
        throw new Error(`planet content contains a definitive outcome: ${bodyId}`);
      }
    }
  }
  for (const signId of SIGN_IDS) {
    const sign = SIGNS[signId];
    if (sign.signId !== signId || definitiveOutcomePattern.test(`${sign.style}${sign.tension}`)) {
      throw new Error(`invalid sign content ${signId}`);
    }
  }
  for (let houseNumber = 1; houseNumber <= 12; houseNumber += 1) {
    if (HOUSE_BY_NUMBER.get(houseNumber)?.houseNumber !== houseNumber) {
      throw new Error(`missing house content ${houseNumber}`);
    }
  }
  for (const aspectId of ASPECT_IDS) {
    const aspect = ASPECTS[aspectId];
    if (aspect.aspectId !== aspectId || definitiveOutcomePattern.test(
      `${aspect.dynamic}${aspect.resource}${aspect.tension}`
    )) {
      throw new Error(`invalid aspect content ${aspectId}`);
    }
  }
  for (const angleId of ANGLE_IDS) {
    const angle = ANGLES[angleId];
    if (angle.angleId !== angleId || !SOURCE_BY_ID.has(angle.sourceId)
      || definitiveOutcomePattern.test(`${angle.focus}${angle.resource}${angle.tension}`)) {
      throw new Error(`invalid angle content ${angleId}`);
    }
  }
  for (const signId of SIGN_IDS) {
    if (!isBodyId(TRADITIONAL_RULERS[signId]) || !isBodyId(MODERN_RULERS[signId])) {
      throw new Error(`invalid ruler profile ${signId}`);
    }
  }
}

assertRegistry();

function isBodyId(value: string): value is BodyId {
  return (BODY_IDS as readonly string[]).includes(value);
}

function isSignId(value: string): value is SignId {
  return (SIGN_IDS as readonly string[]).includes(value);
}

function isAspectId(value: string): value is AspectId {
  return (ASPECT_IDS as readonly string[]).includes(value);
}

function formatDegree(value: number): string {
  return `${value.toFixed(2)}°`;
}

function motionLabel(motion: WesternAspectContentCandidate["motion"]): string {
  switch (motion) {
    case "exact": return "精准";
    case "applying": return "入相";
    case "separating": return "出相";
    case "indeterminate": return "动向未定";
  }
}

function normalizeLongitude(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function angularSeparation(leftDeg: number, rightDeg: number): number {
  const direct = Math.abs(normalizeLongitude(leftDeg) - normalizeLongitude(rightDeg));
  return Math.min(direct, 360 - direct);
}

function deriveZodiacPoint(
  eclipticLongitudeDeg: number,
  ayanamshaDeg: number
): Readonly<{
  zodiacLongitudeDeg: number;
  signId: SignId;
  degreeWithinSign: number;
}> {
  const zodiacLongitudeDeg = normalizeLongitude(eclipticLongitudeDeg - ayanamshaDeg);
  const signId = SIGN_IDS[Math.floor(zodiacLongitudeDeg / 30)];
  if (signId === undefined) throw new Error("western content could not derive zodiac sign");
  return Object.freeze({
    zodiacLongitudeDeg,
    signId,
    degreeWithinSign: zodiacLongitudeDeg % 30
  });
}

function buildDistributionScope(
  scopeId: WesternDistributionScope["scopeId"],
  label: string,
  placements: readonly WesternPlacementContentCandidate[],
  includedBodyIds: readonly BodyId[]
): WesternDistributionScope {
  const included = new Set(includedBodyIds);
  const scopedPlacements = placements.filter((candidate) => included.has(candidate.bodyId));
  const elements = ELEMENT_BUCKETS.map((bucket): WesternDistributionBucket => {
    const bodyIds = scopedPlacements
      .filter((candidate) => SIGNS[candidate.signId].element === bucket.label)
      .map((candidate) => candidate.bodyId);
    return Object.freeze({ ...bucket, count: bodyIds.length, bodyIds: Object.freeze(bodyIds) });
  });
  const modalities = MODALITY_BUCKETS.map((bucket): WesternDistributionBucket => {
    const bodyIds = scopedPlacements
      .filter((candidate) => SIGNS[candidate.signId].modality === bucket.label)
      .map((candidate) => candidate.bodyId);
    return Object.freeze({ ...bucket, count: bodyIds.length, bodyIds: Object.freeze(bodyIds) });
  });
  return Object.freeze({
    scopeId,
    label,
    bodyIds: Object.freeze(scopedPlacements.map((candidate) => candidate.bodyId)),
    elements: Object.freeze(elements),
    modalities: Object.freeze(modalities)
  });
}

function uniqueSourceIds(sourceIds: readonly string[]): readonly string[] {
  const unique = [...new Set(sourceIds)];
  for (const sourceId of unique) {
    if (!SOURCE_BY_ID.has(sourceId)) throw new Error(`unknown western content source ${sourceId}`);
  }
  return Object.freeze(unique);
}

function primitiveSourceIds(sourceIds: readonly string[]): readonly string[] {
  return uniqueSourceIds([
    ...sourceIds,
    "astrodienst.interpretation",
    "astrodienst.interpretation_limits",
    "nature.carlson_1985"
  ]);
}

function primitiveReviewCandidate(
  candidate: Omit<
    WesternPrimitiveContentReviewCandidate,
    | "order"
    | "expertTruthClaimed"
    | "scientificValidityClaimed"
    | "formalActivationAllowed"
    | "goodBadOrientation"
    | "eventOutcome"
    | "result"
  >,
  order: number
): WesternPrimitiveContentReviewCandidate {
  return Object.freeze({
    ...candidate,
    order,
    sourceIds: Object.freeze([...candidate.sourceIds]),
    expertTruthClaimed: false,
    scientificValidityClaimed: false,
    formalActivationAllowed: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
}

function buildPrimitiveContentReviewCandidates(): readonly WesternPrimitiveContentReviewCandidate[] {
  const candidates: Array<Omit<
    WesternPrimitiveContentReviewCandidate,
    | "order"
    | "expertTruthClaimed"
    | "scientificValidityClaimed"
    | "formalActivationAllowed"
    | "goodBadOrientation"
    | "eventOutcome"
    | "result"
  >> = [];

  for (const bodyId of BODY_IDS) {
    const planet = PLANETS[bodyId];
    candidates.push({
      contentId: `western.primitive.planet.${bodyId}.v0_1`,
      category: "planet",
      key: bodyId,
      label: planet.label,
      candidateSummary: `${planet.label}：${planet.focus}`,
      resourceStatement: planet.resource,
      tensionStatement: planet.tension,
      scopeNote: planet.scopeNote,
      reviewPrompt:
        `请按你采用的西洋占星传统，核对${planet.label}的关注主题、可用端、紧张端与限制；说明哪些尊贵、落宫、相位或反例会改写这段基础表达。`,
      sourceIds: primitiveSourceIds([planet.sourceId])
    });
  }

  for (const signId of SIGN_IDS) {
    const sign = SIGNS[signId];
    candidates.push({
      contentId: `western.primitive.sign.${signId}.v0_1`,
      category: "sign",
      key: signId,
      label: sign.label,
      candidateSummary:
        `${sign.label}：${sign.element}元素 · ${sign.modality}模式 · ${sign.style}`,
      resourceStatement: `可用表达候选：${sign.style}`,
      tensionStatement: sign.tension,
      scopeNote:
        "星座只提供表达方式候选；不能脱离天体功能、宫位、相位、尊贵状态与现实语境单独下结论。",
      reviewPrompt:
        `请核对${sign.label}的元素、模式、表达方式与紧张端；说明在你的流派中哪些条件会令该表达不适用或需要反向修正。`,
      sourceIds: primitiveSourceIds([
        "astrodienst.signs",
        "astrodienst.elements",
        "astrodienst.qualities"
      ])
    });
  }

  for (const house of HOUSES) {
    candidates.push({
      contentId: `western.primitive.house.${house.houseNumber}.v0_1`,
      category: "house",
      key: String(house.houseNumber),
      label: house.label,
      candidateSummary: `${house.label}：${house.area}`,
      resourceStatement: `可用于定位盘面议题：${house.area}`,
      tensionStatement: "不得把宫位领域本身直接转换为事件、人格定性或吉凶结论。",
      scopeNote: house.boundary ?? "宫位只标记经验领域，仍须结合宫头、宫主星、落入天体与相位。",
      reviewPrompt:
        `请核对${house.label}的领域边界；说明不同宫制、衍生宫或传统／现代用法下，哪些议题应加入、移除或保持关闭。`,
      sourceIds: primitiveSourceIds(["astrodienst.houses"])
    });
  }

  for (const aspectId of ASPECT_IDS) {
    const aspect = ASPECTS[aspectId];
    candidates.push({
      contentId: `western.primitive.aspect.${aspectId}.v0_1`,
      category: "aspect",
      key: aspectId,
      label: aspect.label,
      candidateSummary: `${aspect.label}（${aspect.exactAngleDeg}°）：${aspect.dynamic}`,
      resourceStatement: aspect.resource,
      tensionStatement: aspect.tension,
      scopeNote:
        "相位只描述两种功能的关系候选；容许度、入出相、尊贵、宫位与全盘重复主题均可能改变显著性。",
      reviewPrompt:
        `请核对${aspect.label}的互动、可用端与紧张端；说明你的容许度、入出相与优先级规则，以及哪些反例不应套用该基础表达。`,
      sourceIds: primitiveSourceIds(["astrodienst.aspects"])
    });
  }

  for (const angleId of ANGLE_IDS) {
    const angle = ANGLES[angleId];
    candidates.push({
      contentId: `western.primitive.angle.${angleId}.v0_1`,
      category: "angle",
      key: angleId,
      label: `${angle.label}（${angle.abbreviation}）`,
      candidateSummary: `${angle.label}（${angle.abbreviation}）：${angle.focus}`,
      resourceStatement: angle.resource,
      tensionStatement: angle.tension,
      scopeNote: angle.scopeNote,
      reviewPrompt:
        `请核对${angle.label}的主题、可用端、紧张端与出生时间边界；说明哪些宫制、纬度、校时或近轴天体条件会改写该表达。`,
      sourceIds: primitiveSourceIds([angle.sourceId])
    });
  }

  return Object.freeze(candidates.map((candidate, index) => (
    primitiveReviewCandidate(candidate, index + 1)
  )));
}

export const WESTERN_PRIMITIVE_CONTENT_REVIEW_CANDIDATES =
  buildPrimitiveContentReviewCandidates();

function assertPrimitiveContentReviewCandidates(): void {
  const candidates = WESTERN_PRIMITIVE_CONTENT_REVIEW_CANDIDATES;
  const categoryCounts = new Map<WesternPrimitiveContentCategory, number>();
  for (const candidate of candidates) {
    categoryCounts.set(candidate.category, (categoryCounts.get(candidate.category) ?? 0) + 1);
    if (candidate.order < 1
      || candidate.sourceIds.length === 0
      || candidate.expertTruthClaimed
      || candidate.scientificValidityClaimed
      || candidate.formalActivationAllowed
      || candidate.goodBadOrientation !== null
      || candidate.eventOutcome !== null
      || candidate.result !== null) {
      throw new Error(`western primitive review candidate is not fail-closed: ${candidate.contentId}`);
    }
    for (const sourceId of candidate.sourceIds) {
      if (!SOURCE_BY_ID.has(sourceId)) {
        throw new Error(`western primitive review candidate has unknown source: ${sourceId}`);
      }
    }
  }
  if (candidates.length !== 43
    || new Set(candidates.map((candidate) => candidate.contentId)).size !== 43
    || candidates.some((candidate, index) => candidate.order !== index + 1)
    || categoryCounts.get("planet") !== 10
    || categoryCounts.get("sign") !== 12
    || categoryCounts.get("house") !== 12
    || categoryCounts.get("aspect") !== 5
    || categoryCounts.get("angle") !== 4) {
    throw new Error("western primitive review catalog must keep the fixed 10/12/12/5/4 inventory");
  }
}

assertPrimitiveContentReviewCandidates();

export function buildWesternContentProjection(
  artifact: WesternRuleLayerArtifact
): WesternContentProjection {
  if (artifact.outcome !== "computed"
    || artifact.evidence.productionEligible !== false
    || artifact.evidence.expertTruthClaimed !== false
    || artifact.strictContractRelation.chartFixtureAccepted !== false
    || artifact.strictContractRelation.successReceiptIssued !== false
    || artifact.digests.resultSha256 === null
    || !/^[a-f0-9]{64}$/u.test(artifact.digests.resultSha256)) {
    throw new Error("western content projection requires a diagnostic-only computed artifact");
  }

  const ayanamshaDeg = artifact.request.zodiac.kind === "sidereal"
    ? artifact.request.zodiac.ayanamshaDeg
    : 0;

  const placements = artifact.result.bodies.map((body): WesternPlacementContentCandidate => {
    if (!isBodyId(body.bodyId) || !isSignId(body.zodiac.signId)) {
      throw new Error("western content projection received an unsupported body or sign");
    }
    const planet = PLANETS[body.bodyId];
    const sign = SIGNS[body.zodiac.signId];
    const house = body.houseNumber === null ? null : HOUSE_BY_NUMBER.get(body.houseNumber) ?? null;
    if (body.houseNumber !== null && house === null) {
      throw new Error(`western content projection received unsupported house ${body.houseNumber}`);
    }
    const houseClause = house === null
      ? "本次没有请求宫位，因此只呈现天体与星座两层"
      : `落在${house.label}，这组主题更常被用于观察“${house.area}”`;
    const houseBoundary = house?.boundary ? `；${house.boundary}` : "";
    const retrogradeClause = body.retrograde
      ? "当前为逆行视运动；本版只记录事实，不自动套用“内化”或“延迟”等解释。"
      : "当前为顺行视运动；顺逆行本身不生成吉凶判断。";
    return Object.freeze({
      candidateId: `western.placement.${body.bodyId}.${body.zodiac.signId}.house-${body.houseNumber ?? "none"}`,
      bodyId: body.bodyId,
      bodyLabel: planet.label,
      bodyGlyph: planet.glyph,
      signId: body.zodiac.signId,
      signLabel: sign.label,
      houseNumber: body.houseNumber,
      houseLabel: house?.label ?? null,
      longitudeDeg: body.zodiac.longitudeDeg,
      degreeWithinSign: body.zodiac.degreeWithinSign,
      retrograde: body.retrograde,
      factSummary: `${planet.label}在${sign.label} ${formatDegree(body.zodiac.degreeWithinSign)}${house ? ` · ${house.label}` : ""}${body.retrograde ? " · 逆行" : ""}`,
      directStatement: `${planet.label}关注“${planet.focus}”；${houseClause}。${sign.label}（${sign.element}元素 · ${sign.modality}）以“${sign.style}”作为表达语气${houseBoundary}。`,
      resourceStatement: `可用的一端：${planet.resource}；${sign.label}可提供“${sign.style}”的路径。`,
      tensionStatement: `需要留意的一端：${planet.tension}；星座表达紧张时也可能出现“${sign.tension}”。`,
      scopeNote: `${planet.scopeNote} ${retrogradeClause}`,
      sourceIds: uniqueSourceIds([
        planet.sourceId,
        "astrodienst.signs",
        ...(house ? ["astrodienst.houses"] : []),
        "astrodienst.interpretation"
      ]),
      review: Object.freeze({
        status: "awaiting_expert_review" as const,
        questions: Object.freeze([
          `${planet.label}的主题词是否符合你采用的现代／传统流派？`,
          `${house?.label ?? "无宫位"}表述是否需要加入宫主星、尊贵状态、角宫强度或其他优先条件？`,
          `哪些相位或全盘条件会明显强化、缓和或改写这条候选内容？`
        ]),
        result: null
      })
    });
  });

  const allBodiesScope = buildDistributionScope(
    "all_bodies",
    `全部已计算天体（${placements.length}）`,
    placements,
    placements.map((candidate) => candidate.bodyId)
  );
  const coreFiveScope = buildDistributionScope(
    "core_five",
    "核心五体（太阳、月亮、水星、金星、火星）",
    placements,
    CORE_BODY_IDS
  );
  const distribution: WesternDistributionSummary = Object.freeze({
    candidateId: "western.distribution.elements-modalities" as const,
    factSummary: `元素与模式原始计数 · 全部 ${allBodiesScope.bodyIds.length} 体 / 核心 ${coreFiveScope.bodyIds.length} 体`,
    directStatement: "元素计数呈现天体落座集中在哪类表达语气；模式计数呈现开创、维持与调整三类节奏。这里只展示两个透明口径，不判定哪一种性格占主导。",
    useStatement: "可用方式：先观察两个口径是否指向同一组聚集或缺位，再回到具体天体、宫位与相位核对。",
    limitStatement: "限制：每体一票只是审阅视图，不是公认权重；外行星移动较慢，未获专家确认前不把计数差异转换为人格强弱、吉凶或分数。",
    scopeNote: "“核心五体”是本项目为了把近身功能与十体总览并列而设的透明子集，不宣称它是唯一流派标准。",
    scopes: Object.freeze([allBodiesScope, coreFiveScope]) as readonly [
      WesternDistributionScope,
      WesternDistributionScope
    ],
    sourceIds: uniqueSourceIds([
      "astrodienst.signs",
      "astrodienst.elements",
      "astrodienst.qualities",
      "astrodienst.interpretation"
    ]),
    review: Object.freeze({
      status: "awaiting_expert_review" as const,
      questions: Object.freeze([
        "你采用的流派会把哪些天体、轴点或交点纳入元素与模式统计？",
        "太阳、月亮、上升、命主星或个人行星是否需要不同权重；若需要，依据是什么？",
        "当两个或多个类别并列时，应如何表述才能避免制造虚假的单一主导结论？"
      ]),
      result: null
    })
  });

  const rawAngles: readonly Readonly<{
    angleId: AngleId;
    eclipticLongitudeDeg: number;
  }>[] = artifact.result.houses === null ? [] : [
    { angleId: "ascendant", eclipticLongitudeDeg: artifact.result.houses.angles.ascendantDeg },
    { angleId: "midheaven", eclipticLongitudeDeg: artifact.result.houses.angles.midheavenDeg },
    { angleId: "descendant", eclipticLongitudeDeg: artifact.result.houses.angles.descendantDeg },
    { angleId: "imum_coeli", eclipticLongitudeDeg: artifact.result.houses.angles.imumCoeliDeg }
  ];
  const angles = rawAngles.map((fact): WesternAngleContentCandidate => {
    const angle = ANGLES[fact.angleId];
    const zodiac = deriveZodiacPoint(fact.eclipticLongitudeDeg, ayanamshaDeg);
    const sign = SIGNS[zodiac.signId];
    return Object.freeze({
      candidateId: `western.angle.${angle.angleId}.${zodiac.signId}`,
      angleId: angle.angleId,
      angleLabel: angle.label,
      abbreviation: angle.abbreviation,
      signId: zodiac.signId,
      signLabel: sign.label,
      eclipticLongitudeDeg: fact.eclipticLongitudeDeg,
      zodiacLongitudeDeg: zodiac.zodiacLongitudeDeg,
      degreeWithinSign: zodiac.degreeWithinSign,
      factSummary: `${angle.label}（${angle.abbreviation}）在${sign.label} ${formatDegree(zodiac.degreeWithinSign)}`,
      directStatement: `${angle.label}用于观察“${angle.focus}”；${sign.label}（${sign.element}元素 · ${sign.modality}）让这组主题倾向以“${sign.style}”的方式被表达。`,
      resourceStatement: `可用的一端：${angle.resource}；${sign.label}提供“${sign.style}”的切入方式。`,
      tensionStatement: `需要留意的一端：${angle.tension}；紧张时也可能出现“${sign.tension}”。`,
      scopeNote: angle.scopeNote,
      sourceIds: uniqueSourceIds([
        angle.sourceId,
        "astrodienst.signs",
        "astrodienst.interpretation"
      ]),
      review: Object.freeze({
        status: "awaiting_expert_review" as const,
        questions: Object.freeze([
          `${angle.label}的主题边界是否符合你采用的流派？`,
          `${sign.label}对${angle.label}的表达是否需要结合守护星、合轴天体或相位才能成立？`,
          `当前出生时间精度达到什么程度时，才允许向用户呈现这条候选？`
        ]),
        result: null
      })
    });
  });

  const bodyById = new Map(artifact.result.bodies.map((body) => [body.bodyId, body]));
  const buildRulerPath = (
    profile: WesternRulerPath["profile"],
    rulerBodyId: BodyId
  ): WesternRulerPath => {
    const planet = PLANETS[rulerBodyId];
    const body = bodyById.get(rulerBodyId);
    if (body === undefined) {
      return Object.freeze({
        profile,
        rulerBodyId,
        rulerBodyLabel: planet.label,
        placementAvailable: false,
        rulerSignId: null,
        rulerSignLabel: null,
        rulerHouseNumber: null,
        rulerHouseLabel: null,
        retrograde: null,
        statement: `${planet.label} · 当前输入未包含该天体，追踪链在此停止。`
      });
    }
    if (!isSignId(body.zodiac.signId)) {
      throw new Error(`western content projection received unsupported ruler sign ${body.zodiac.signId}`);
    }
    const rulerSign = SIGNS[body.zodiac.signId];
    const rulerHouse = body.houseNumber === null ? null : HOUSE_BY_NUMBER.get(body.houseNumber) ?? null;
    return Object.freeze({
      profile,
      rulerBodyId,
      rulerBodyLabel: planet.label,
      placementAvailable: true,
      rulerSignId: body.zodiac.signId,
      rulerSignLabel: rulerSign.label,
      rulerHouseNumber: body.houseNumber,
      rulerHouseLabel: rulerHouse?.label ?? null,
      retrograde: body.retrograde,
      statement: `${planet.label} → ${rulerSign.label} ${formatDegree(body.zodiac.degreeWithinSign)} · ${rulerHouse?.label ?? "未请求宫位"}${body.retrograde ? " · 逆行" : ""}`
    });
  };

  const houseRulers = (artifact.result.houses?.cusps ?? []).map((cusp): WesternHouseRulerCandidate => {
    const house = HOUSE_BY_NUMBER.get(cusp.houseNumber);
    if (house === undefined) {
      throw new Error(`western content projection received unsupported cusp ${cusp.houseNumber}`);
    }
    const cuspZodiac = deriveZodiacPoint(cusp.longitudeDeg, ayanamshaDeg);
    const cuspSign = SIGNS[cuspZodiac.signId];
    const traditionalBodyId = TRADITIONAL_RULERS[cuspZodiac.signId];
    const modernBodyId = MODERN_RULERS[cuspZodiac.signId];

    const traditional = buildRulerPath("traditional", traditionalBodyId);
    const modern = buildRulerPath("modern", modernBodyId);
    const sameRuler = traditionalBodyId === modernBodyId;
    return Object.freeze({
      candidateId: `western.house-ruler.house-${house.houseNumber}.${cuspZodiac.signId}`,
      houseNumber: house.houseNumber,
      houseLabel: house.label,
      cuspSignId: cuspZodiac.signId,
      cuspSignLabel: cuspSign.label,
      eclipticLongitudeDeg: cusp.longitudeDeg,
      zodiacLongitudeDeg: cuspZodiac.zodiacLongitudeDeg,
      degreeWithinSign: cuspZodiac.degreeWithinSign,
      factSummary: `${house.label}宫头在${cuspSign.label} ${formatDegree(cuspZodiac.degreeWithinSign)}`,
      directStatement: `${house.label}的“${house.area}”从${cuspSign.label}的“${cuspSign.style}”出发；宫主星追踪用于查看这组主题被带到哪类表达与生活领域，不直接推出结果${house.boundary ? `；${house.boundary}` : ""}。`,
      traditional,
      modern,
      scopeNote: sameRuler
        ? `传统与现代守护星表在${cuspSign.label}使用同一宫主星；这里仍并列保留两条可审计路径。`
        : `${cuspSign.label}在传统与现代守护星表中使用不同宫主星；本版并列呈现，不替用户选择流派，也不合成单一结论。`,
      sourceIds: uniqueSourceIds([
        "astrodienst.houses",
        "astrodienst.house_ruler",
        "astrodienst.ruler",
        "astrodienst.signs",
        PLANETS[traditionalBodyId].sourceId,
        PLANETS[modernBodyId].sourceId,
        "astrodienst.interpretation"
      ]),
      review: Object.freeze({
        status: "awaiting_expert_review" as const,
        questions: Object.freeze([
          `${house.label}是否应以宫头星座守护星作为当前流派的首要追踪入口？`,
          `${cuspSign.label}应采用传统、现代还是共主星规则；两套结果如何排序？`,
          `宫主星的落座、落宫、逆行、尊贵状态与相位应按什么优先级继续合参？`
        ]),
        result: null
      })
    });
  });

  const ascendant = angles.find((candidate) => candidate.angleId === "ascendant") ?? null;
  const chartRuler: WesternChartRulerCandidate | null = ascendant === null ? null : (() => {
    const traditionalBodyId = TRADITIONAL_RULERS[ascendant.signId];
    const modernBodyId = MODERN_RULERS[ascendant.signId];
    const traditional = buildRulerPath("traditional", traditionalBodyId);
    const modern = buildRulerPath("modern", modernBodyId);
    const sameRuler = traditionalBodyId === modernBodyId;
    return Object.freeze({
      candidateId: "western.chart-ruler.ascendant" as const,
      ascendantSignId: ascendant.signId,
      ascendantSignLabel: ascendant.signLabel,
      factSummary: `命主星追踪 · 上升${ascendant.signLabel}`,
      directStatement: `命主星取上升星座的守护星，再回到该天体的实际落座与落宫。它可为“${ANGLES.ascendant.focus}”补充一条盘内去向，但不是整盘唯一主宰。`,
      traditional,
      modern,
      scopeNote: sameRuler
        ? `${ascendant.signLabel}在传统与现代守护星表中使用同一命主星；仍保留双路径，等待专家确认后续权重。`
        : `${ascendant.signLabel}在传统与现代守护星表中使用不同命主星；本版并列显示，不擅自选流派。`,
      sourceIds: uniqueSourceIds([
        "astrodienst.chart_ruler",
        "astrodienst.ruler",
        "astrodienst.angle.ascendant",
        "astrodienst.signs",
        PLANETS[traditionalBodyId].sourceId,
        PLANETS[modernBodyId].sourceId,
        "astrodienst.art_of_combination",
        "astrodienst.interpretation"
      ]),
      review: Object.freeze({
        status: "awaiting_expert_review" as const,
        questions: Object.freeze([
          "你采用的流派是否把上升守护星称为命主星；它与日月、主宰星或 Almuten 如何区分？",
          `${ascendant.signLabel}应采用传统、现代还是共主星规则；两条路径如何排序？`,
          "命主星的落座、落宫、逆行、尊贵状态与相位应按什么顺序合参？"
        ]),
        result: null
      })
    });
  })();

  const buildDispositorChain = (
    profile: WesternRulerPath["profile"],
    startBodyId: BodyId
  ): WesternDispositorChain => {
    const rulers = profile === "traditional" ? TRADITIONAL_RULERS : MODERN_RULERS;
    const nodes: WesternDispositorChainNode[] = [];
    const seen = new Map<BodyId, number>();
    let currentBodyId = startBodyId;

    for (let step = 0; step <= BODY_IDS.length; step += 1) {
      const body = bodyById.get(currentBodyId);
      if (body === undefined || !isSignId(body.zodiac.signId)) {
        throw new Error(`western content could not continue dispositor chain from ${currentBodyId}`);
      }
      const sign = SIGNS[body.zodiac.signId];
      const house = body.houseNumber === null ? null : HOUSE_BY_NUMBER.get(body.houseNumber) ?? null;
      const nextRulerBodyId = rulers[body.zodiac.signId];
      seen.set(currentBodyId, nodes.length);
      nodes.push(Object.freeze({
        bodyId: currentBodyId,
        bodyLabel: PLANETS[currentBodyId].label,
        signId: body.zodiac.signId,
        signLabel: sign.label,
        houseNumber: body.houseNumber,
        houseLabel: house?.label ?? null,
        retrograde: body.retrograde,
        nextRulerBodyId,
        nextRulerBodyLabel: PLANETS[nextRulerBodyId].label
      }));

      const nodeStatement = (): string => nodes
        .map((node) => `${node.bodyLabel}（${node.signLabel}${node.houseLabel ? ` · ${node.houseLabel}` : ""}）`)
        .join(" → ");

      if (nextRulerBodyId === currentBodyId) {
        return Object.freeze({
          profile,
          nodes: Object.freeze(nodes),
          termination: "domicile" as const,
          terminalBodyId: currentBodyId,
          missingBodyId: null,
          cycleBodyIds: Object.freeze([]),
          twoBodySignExchange: false,
          statement: `${nodeStatement()} → 自守；定位星链在本星座守护星处终止。`
        });
      }

      const cycleStart = seen.get(nextRulerBodyId);
      if (cycleStart !== undefined) {
        const cycleBodyIds = nodes.slice(cycleStart).map((node) => node.bodyId);
        const twoBodySignExchange = cycleBodyIds.length === 2;
        return Object.freeze({
          profile,
          nodes: Object.freeze(nodes),
          termination: "cycle" as const,
          terminalBodyId: null,
          missingBodyId: null,
          cycleBodyIds: Object.freeze(cycleBodyIds),
          twoBodySignExchange,
          statement: `${nodeStatement()} → 回到${PLANETS[nextRulerBodyId].label}；形成${twoBodySignExchange ? "两体守护星互换候选" : `${cycleBodyIds.length} 体循环`}。`
        });
      }

      if (!bodyById.has(nextRulerBodyId)) {
        return Object.freeze({
          profile,
          nodes: Object.freeze(nodes),
          termination: "missing_ruler_body" as const,
          terminalBodyId: null,
          missingBodyId: nextRulerBodyId,
          cycleBodyIds: Object.freeze([]),
          twoBodySignExchange: false,
          statement: `${nodeStatement()} → ${PLANETS[nextRulerBodyId].label}（本次输入未含该天体，链停止）。`
        });
      }
      currentBodyId = nextRulerBodyId;
    }

    throw new Error(`western content dispositor chain exceeded canonical body count for ${startBodyId}`);
  };

  const chainSignature = (chain: WesternDispositorChain): string => JSON.stringify({
    nodes: chain.nodes.map((node) => [node.bodyId, node.nextRulerBodyId]),
    termination: chain.termination,
    terminalBodyId: chain.terminalBodyId,
    missingBodyId: chain.missingBodyId,
    cycleBodyIds: chain.cycleBodyIds
  });

  const dispositorChains = artifact.result.bodies.map((body): WesternDispositorCandidate => {
    if (!isBodyId(body.bodyId) || !isSignId(body.zodiac.signId)) {
      throw new Error("western content projection received unsupported dispositor input");
    }
    const planet = PLANETS[body.bodyId];
    const traditional = buildDispositorChain("traditional", body.bodyId);
    const modern = buildDispositorChain("modern", body.bodyId);
    const profilesEqual = chainSignature(traditional) === chainSignature(modern);
    const chainPlanetSourceIds = [...traditional.nodes, ...modern.nodes]
      .map((node) => PLANETS[node.bodyId].sourceId);
    const missingRulerSourceIds = [traditional.missingBodyId, modern.missingBodyId]
      .filter((bodyId): bodyId is BodyId => bodyId !== null)
      .map((bodyId) => PLANETS[bodyId].sourceId);
    return Object.freeze({
      candidateId: `western.dispositor.${body.bodyId}`,
      startBodyId: body.bodyId,
      startBodyLabel: planet.label,
      factSummary: `${planet.label}定位星链 · 传统／现代并列`,
      directStatement: `${planet.label}关注“${planet.focus}”。按每一步落座星座的守护星继续追踪，可看到这组主题在盘内连接到哪些天体与宫位；这是一张关系图，不是因果或强弱评分。`,
      traditional,
      modern,
      profilesEqual,
      scopeNote: profilesEqual
        ? "两套守护星表在这条链上得到相同路径；仍需结合尊贵状态、相位、日夜盘与全盘重复主题。"
        : "传统与现代守护星表在这条链上发生分叉；本版并列呈现，不合并为单一定位星结论。",
      sourceIds: uniqueSourceIds([
        "astrodienst.dispositor",
        "astrodienst.chain_of_dispositors",
        "skyscript.dispositor",
        "astrodienst.ruler",
        "astrodienst.signs",
        "astrodienst.art_of_combination",
        "astrodienst.interpretation",
        planet.sourceId,
        ...chainPlanetSourceIds,
        ...missingRulerSourceIds
      ]),
      review: Object.freeze({
        status: "awaiting_expert_review" as const,
        questions: Object.freeze([
          `${planet.label}是否应只按星座守护星建立定位链，还是同时纳入擢升、三分、界与面？`,
          "两体守护星互换是否可直接称为互容，还是必须再检查实际相位、日夜盘或其他尊贵条件？",
          "自守终点、两体互换与多体循环在你的流派中应如何排序和表述？"
        ]),
        result: null
      })
    });
  });

  const angleProximity: WesternAngleProximitySummary | null = angles.length === 0 ? null : (() => {
    const ranked = placements.map((placement) => {
      const nearest = angles
        .map((angle) => ({
          angle,
          separationDeg: angularSeparation(placement.longitudeDeg, angle.zodiacLongitudeDeg)
        }))
        .sort((left, right) => left.separationDeg - right.separationDeg
          || ANGLE_IDS.indexOf(left.angle.angleId) - ANGLE_IDS.indexOf(right.angle.angleId))[0]!;
      return {
        placement,
        angle: nearest.angle,
        separationDeg: nearest.separationDeg
      };
    }).sort((left, right) => left.separationDeg - right.separationDeg
      || BODY_IDS.indexOf(left.placement.bodyId) - BODY_IDS.indexOf(right.placement.bodyId));
    const entries = ranked.map(({ placement, angle, separationDeg }, index): WesternAngleProximityEntry => Object.freeze({
      rank: index + 1,
      bodyId: placement.bodyId,
      bodyLabel: placement.bodyLabel,
      angleId: angle.angleId,
      angleLabel: angle.angleLabel,
      angleAbbreviation: angle.abbreviation,
      separationDeg,
      bodyLongitudeDeg: placement.longitudeDeg,
      angleLongitudeDeg: angle.zodiacLongitudeDeg,
      houseNumber: placement.houseNumber,
      houseLabel: placement.houseLabel,
      withinOneDegreeReviewBand: separationDeg <= 1 + 1e-9
    }));
    return Object.freeze({
      candidateId: "western.angle-proximity.nearest-axis-ledger" as const,
      factSummary: `天体到四轴最近距离账 · ${entries.length} 体`,
      directStatement: "每个天体只列出距离最近的 ASC / MC / DSC / IC，并按精确黄经距离升序排列；这是几何阅读队列，不自动把任何一项判成合轴或更强。",
      useStatement: "可用方式：先核对距离最小的天体是否需要与对应轴点主题合参，再返回其落座、落宫、相位与定位星链。",
      limitStatement: "限制：不同流派对“角星”采用合轴容许度或角宫位置等不同定义。本版不设统一 orb；≤1°只标为同度复核带，不等于专家已确认合轴。",
      scopeNote: "轴点高度依赖出生时间、地点和宫位几何；时间精度不足时，距离排序也可能改变。",
      entries: Object.freeze(entries),
      sourceIds: uniqueSourceIds([
        "astrodienst.angular_planet",
        "skyscript.angular",
        "astrodienst.art_of_combination",
        ...angles.map((angle) => ANGLES[angle.angleId].sourceId),
        "astrodienst.interpretation"
      ]),
      review: Object.freeze({
        status: "awaiting_expert_review" as const,
        questions: Object.freeze([
          "你的流派如何区分合轴天体与仅落在角宫的天体；是否采用不同术语？",
          "ASC、MC、DSC、IC 及日月／其他天体应使用怎样的容许度，是否区分轴前轴后？",
          "出生时间精度不足或宫制改变时，距离账应隐藏、降级还是保留为纯几何事实？"
        ]),
        result: null
      })
    });
  })();

  const aspects = artifact.result.aspects.map((fact): WesternAspectContentCandidate => {
    if (!isBodyId(fact.bodyA) || !isBodyId(fact.bodyB) || !isAspectId(fact.aspectId)) {
      throw new Error("western content projection received an unsupported aspect");
    }
    const planetA = PLANETS[fact.bodyA];
    const planetB = PLANETS[fact.bodyB];
    const aspect = ASPECTS[fact.aspectId];
    if (Math.abs(fact.exactAngleDeg - aspect.exactAngleDeg) > 1e-9) {
      throw new Error(`western content aspect angle mismatch for ${fact.aspectId}`);
    }
    return Object.freeze({
      candidateId: `western.aspect.${fact.bodyA}.${fact.bodyB}.${fact.aspectId}`,
      bodyA: fact.bodyA,
      bodyB: fact.bodyB,
      aspectId: fact.aspectId,
      aspectLabel: aspect.label,
      exactAngleDeg: fact.exactAngleDeg,
      orbDeg: fact.orbDeg,
      motion: fact.motion,
      factSummary: `${planetA.label}—${planetB.label} ${aspect.label} · 容许度 ${formatDegree(fact.orbDeg)} · ${motionLabel(fact.motion)}`,
      directStatement: `${planetA.label}的“${planetA.focus}”与${planetB.label}的“${planetB.focus}”以${aspect.label}相连：${aspect.dynamic}。`,
      resourceStatement: `可用的一端：${aspect.resource}。`,
      tensionStatement: `需要留意的一端：${aspect.tension}。`,
      sourceIds: uniqueSourceIds([
        planetA.sourceId,
        planetB.sourceId,
        "astrodienst.aspects",
        "astrodienst.interpretation"
      ]),
      review: Object.freeze({
        status: "awaiting_expert_review" as const,
        questions: Object.freeze([
          `${planetA.label}与${planetB.label}的组合是否需要按行星主次或日夜盘区分？`,
          `${aspect.label}在当前 ${formatDegree(fact.orbDeg)} 容许度与${motionLabel(fact.motion)}状态下，应如何调整权重？`,
          `哪些落座、落宫或第三方相位会改变这条候选关系？`
        ]),
        result: null
      })
    });
  });

  const bodySyntheses = placements.map((placement): WesternBodySynthesisCandidate => {
    const planet = PLANETS[placement.bodyId];
    const dispositor = dispositorChains.find(
      (candidate) => candidate.startBodyId === placement.bodyId
    );
    if (dispositor === undefined) {
      throw new Error(`western body synthesis is missing dispositor for ${placement.bodyId}`);
    }
    const aspectLinks = aspects
      .filter((candidate) => (
        candidate.bodyA === placement.bodyId || candidate.bodyB === placement.bodyId
      ))
      .map((candidate): WesternBodyAspectLink => {
        const counterpartBodyId = candidate.bodyA === placement.bodyId
          ? candidate.bodyB
          : candidate.bodyA;
        return Object.freeze({
          counterpartBodyId,
          counterpartBodyLabel: PLANETS[counterpartBodyId].label,
          candidate
        });
      });
    const nearestAngle = angleProximity?.entries.find(
      (entry) => entry.bodyId === placement.bodyId
    ) ?? null;
    const chartRulerProfiles = chartRuler === null
      ? []
      : [...new Set([
        ...(chartRuler.traditional.rulerBodyId === placement.bodyId
          ? [chartRuler.traditional.profile]
          : []),
        ...(chartRuler.modern.rulerBodyId === placement.bodyId
          ? [chartRuler.modern.profile]
          : [])
      ])];
    const slowBodyHouseFirst = (
      SLOW_BODY_HOUSE_FIRST_IDS as readonly BodyId[]
    ).includes(placement.bodyId);
    const scopeNote = slowBodyHouseFirst
      ? `${planet.label}落座可能具有较强世代共性；本包先把落宫和相位作为个体化复核入口，但不自动提高任何因素的权重。`
      : `本包只组织${planet.label}的当前落位、主要相位、定位链与最近轴点；不把这些象征定型为人格、能力或事件结果。`;
    return Object.freeze({
      candidateId: `western.body-synthesis.${placement.bodyId}`,
      bodyId: placement.bodyId,
      bodyLabel: placement.bodyLabel,
      bodyGlyph: placement.bodyGlyph,
      factSummary:
        `${placement.bodyLabel}综合阅读包 · ${placement.signLabel}${placement.houseLabel ? ` · ${placement.houseLabel}` : ""} · ${aspectLinks.length} 条主要相位`,
      directStatement:
        `本包把“${planet.focus}”的落座语气、落宫领域、${aspectLinks.length} 条主要相位、传统／现代定位链与最近轴点放在同一阅读队列；不按条目数量或相位类型自动判定主导、强弱或吉凶。`,
      readingOrderStatement:
        "阅读顺序：先核对落位主线，再看每条相位如何补充或牵制，最后查看定位链、命主星角色与最近轴点；出现矛盾时保留矛盾，不自动平均成一个结论。",
      placement,
      aspectLinks: Object.freeze(aspectLinks),
      dispositor,
      nearestAngle,
      chartRulerProfiles: Object.freeze(chartRulerProfiles),
      slowBodyHouseFirst,
      scopeNote,
      sourceIds: uniqueSourceIds([
        ...placement.sourceIds,
        ...aspectLinks.flatMap((link) => link.candidate.sourceIds),
        ...dispositor.sourceIds,
        ...(nearestAngle === null ? [] : angleProximity?.sourceIds ?? []),
        ...(chartRulerProfiles.length === 0 ? [] : chartRuler?.sourceIds ?? []),
        "astrodienst.art_of_combination",
        "astrodienst.interpretation",
        "astrodienst.interpretation_limits"
      ]),
      evidenceClass: "derived_same_body_projection" as const,
      overallResult: null,
      goodBadOrientation: null,
      review: Object.freeze({
        status: "awaiting_expert_review" as const,
        questions: Object.freeze([
          `${planet.label}的落座语气与${placement.houseLabel ?? "未请求宫位"}领域应如何组合，哪些现实反例会推翻标准文案？`,
          `当前 ${aspectLinks.length} 条主要相位中，哪些只是在重复同一主题，哪些会补充、牵制或改变落位表达？`,
          "传统／现代定位链、命主星角色与最近轴点应如何排序；哪些只应保留为结构事实？",
          "在没有现实记录、专家权重与完整尊贵／相位模式之前，哪些结论必须继续保持为空？"
        ]),
        result: null
      })
    });
  });
  if (new Set(bodySyntheses.map((candidate) => candidate.candidateId)).size
    !== bodySyntheses.length) {
    throw new Error("western body synthesis candidate ids must be unique");
  }
  if (bodySyntheses.flatMap((candidate) => candidate.aspectLinks).length
    !== aspects.length * 2) {
    throw new Error("western body synthesis must project each aspect to both bodies");
  }

  const bodyFirstReadEntry = (
    bodyId: "sun" | "moon",
    sequence: 1 | 2,
    label: string
  ): WesternFirstReadEntry => {
    const synthesis = bodySyntheses.find((candidate) => candidate.bodyId === bodyId) ?? null;
    if (synthesis === null) {
      const planet = PLANETS[bodyId];
      return Object.freeze({
        key: bodyId,
        sequence,
        label,
        availability: "not_requested" as const,
        referencedCandidateIds: Object.freeze([]),
        factSummary: `${planet.label}未进入本次天体请求`,
        directStatement: `当前诊断工件没有${planet.label}事实，本入口保持关闭，不从其他天体或星座补猜。`,
        correctionStatement: "补充包含该天体的可复算工件后，才可生成对应落座、落宫、相位与定位链阅读。",
        sourceIds: uniqueSourceIds([
          planet.sourceId,
          "astrodienst.interpretation",
          "astrodienst.interpretation_limits"
        ])
      });
    }
    return Object.freeze({
      key: bodyId,
      sequence,
      label,
      availability: "available" as const,
      referencedCandidateIds: Object.freeze([
        synthesis.candidateId,
        synthesis.placement.candidateId
      ]),
      factSummary: synthesis.factSummary,
      directStatement: synthesis.placement.directStatement,
      correctionStatement:
        `当前另有 ${synthesis.aspectLinks.length} 条主要相位、传统／现代定位链与最近四轴待合参；可用端与紧张端并列保留，不在首读卡内平均成单一结论。`,
      sourceIds: synthesis.sourceIds
    });
  };

  const firstReadAscendant = angles.find((candidate) => candidate.angleId === "ascendant") ?? null;
  const ascendantEntry: WesternFirstReadEntry = firstReadAscendant === null
    ? Object.freeze({
      key: "ascendant" as const,
      sequence: 3 as const,
      label: "上升 · 外在进入方式",
      availability: "not_available" as const,
      referencedCandidateIds: Object.freeze([]),
      factSummary: "当前工件没有可用上升点",
      directStatement: "缺少可复算上升点时，上升入口与命主星入口均不得生成替代结论。",
      correctionStatement: "需要可靠出生时间、地点、宫制与角点几何后再复核。",
      sourceIds: uniqueSourceIds([
        "astrodienst.angle.ascendant",
        "astrodienst.interpretation_limits"
      ])
    })
    : Object.freeze({
      key: "ascendant" as const,
      sequence: 3 as const,
      label: "上升 · 外在进入方式",
      availability: "available" as const,
      referencedCandidateIds: Object.freeze([firstReadAscendant.candidateId]),
      factSummary: firstReadAscendant.factSummary,
      directStatement: firstReadAscendant.directStatement,
      correctionStatement: `${firstReadAscendant.resourceStatement} ${firstReadAscendant.tensionStatement} ${firstReadAscendant.scopeNote}`,
      sourceIds: firstReadAscendant.sourceIds
    });

  const chartRulerPlacementAvailable = chartRuler !== null
    && (chartRuler.traditional.placementAvailable || chartRuler.modern.placementAvailable);
  const chartRulerEntry: WesternFirstReadEntry = !chartRulerPlacementAvailable
    ? Object.freeze({
      key: "chart_ruler" as const,
      sequence: 4 as const,
      label: "命主星 · 上升主题去向",
      availability: "not_available" as const,
      referencedCandidateIds: Object.freeze([]),
      factSummary: chartRuler === null
        ? "当前工件没有可用命主星路径"
        : `${chartRuler.factSummary} · 守护星天体未进入本次请求`,
      directStatement: chartRuler === null
        ? "没有可复算上升点与守护星映射时，不生成命主星替代项。"
        : "上升星座的守护星映射可登记，但传统与现代路径都没有可复算天体落位，因此命主星去向保持关闭。",
      correctionStatement: "补充对应守护星的落座、落宫与相位事实后，才可继续追踪；传统与现代守护星表仍须并列。",
      sourceIds: chartRuler?.sourceIds ?? uniqueSourceIds([
        "astrodienst.chart_ruler",
        "astrodienst.interpretation_limits"
      ])
    })
    : Object.freeze({
      key: "chart_ruler" as const,
      sequence: 4 as const,
      label: "命主星 · 上升主题去向",
      availability: "available" as const,
      referencedCandidateIds: Object.freeze([chartRuler.candidateId]),
      factSummary: chartRuler.factSummary,
      directStatement: chartRuler.directStatement,
      correctionStatement:
        `传统路径：${chartRuler.traditional.statement} 现代路径：${chartRuler.modern.statement} ${chartRuler.scopeNote}`,
      sourceIds: chartRuler.sourceIds
    });

  const firstReadEntries: readonly WesternFirstReadEntry[] = Object.freeze([
    bodyFirstReadEntry("sun", 1, "太阳 · 自我表达入口"),
    bodyFirstReadEntry("moon", 2, "月亮 · 需要与反应入口"),
    ascendantEntry,
    chartRulerEntry
  ]);
  if (firstReadEntries.map((entry) => entry.sequence).join(",") !== "1,2,3,4"
    || new Set(firstReadEntries.map((entry) => entry.key)).size !== 4) {
    throw new Error("western first-read entries must keep the fixed four-step order");
  }
  for (const entry of firstReadEntries) {
    if (entry.availability === "available" && entry.referencedCandidateIds.length === 0) {
      throw new Error(`western first-read available entry is missing references for ${entry.key}`);
    }
    if (entry.availability !== "available" && entry.referencedCandidateIds.length !== 0) {
      throw new Error(`western first-read unavailable entry must not fabricate references for ${entry.key}`);
    }
  }
  const missingKeys = firstReadEntries
    .filter((entry) => entry.availability !== "available")
    .map((entry) => entry.key);
  const firstRead: WesternFirstReadCandidate = Object.freeze({
    candidateId: "western.first-read.sun-moon-ascendant-chart-ruler" as const,
    factSummary: `整盘首读队列 · 日月上升与命主星 · ${4 - missingKeys.length}/4 可用`,
    directStatement:
      "先按太阳、月亮、上升、命主星四个入口建立阅读坐标，再回到每颗天体的落座、落宫、相位与定位链；这是固定导航顺序，不是主导力量排名。",
    readingOrderStatement:
      "太阳回答当前候选的自我表达主线，月亮回答需要与反应，上升回答进入环境的方式，命主星追踪上升主题落到哪颗天体与宫位；任何一步都要接受相位、守护链、四轴距离与现实反例修正。",
    entries: firstReadEntries,
    availableCount: 4 - missingKeys.length,
    missingKeys: Object.freeze(missingKeys),
    scopeNote:
      "日月上升与命主星是阅读入口，不等于四项权重相同，也不证明其他天体较弱；缺失项保持关闭，不从太阳星座或相邻天体补猜。",
    sourceIds: uniqueSourceIds([
      ...firstReadEntries.flatMap((entry) => entry.sourceIds),
      "astrodienst.art_of_combination",
      "astrodienst.interpretation",
      "astrodienst.interpretation_limits"
    ]),
    evidenceClass: "derived_reading_order_projection" as const,
    selectedPrimaryFactor: null,
    overallResult: null,
    goodBadOrientation: null,
    review: Object.freeze({
      status: "awaiting_expert_review" as const,
      questions: Object.freeze([
        "太阳、月亮、上升的固定导航顺序在你的流派中是否需要调整；哪些盘面反例会改变顺序？",
        "命主星应只采用上升星座守护星，还是需要与命度主、界主、擢升主或其他主星法并列？",
        "哪些紧密相位、角轴关系、尊贵状态或定位链会明显修正日月上升的标准落位表达？",
        "出生时间、地点或天体事实缺失到什么程度时，首读包应部分关闭或整体关闭？"
      ]),
      result: null
    })
  });

  const sourceIds = uniqueSourceIds([
    ...firstRead.sourceIds,
    ...(chartRuler?.sourceIds ?? []),
    ...bodySyntheses.flatMap((candidate) => candidate.sourceIds),
    ...dispositorChains.flatMap((candidate) => candidate.sourceIds),
    ...(angleProximity?.sourceIds ?? []),
    ...angles.flatMap((candidate) => candidate.sourceIds),
    ...distribution.sourceIds,
    ...houseRulers.flatMap((candidate) => candidate.sourceIds),
    ...placements.flatMap((candidate) => candidate.sourceIds),
    ...aspects.flatMap((candidate) => candidate.sourceIds),
    "astrodienst.interpretation_limits",
    "nature.carlson_1985"
  ]);

  return Object.freeze({
    projectionVersion: WESTERN_CONTENT_LAYER_VERSION,
    outcome: "candidate_content_built" as const,
    factsSha256: artifact.digests.resultSha256,
    framework: "modern_western_astrology_source_bound_candidate" as const,
    boundary: Object.freeze({
      expertTruthClaimed: false as const,
      scientificValidityClaimed: false as const,
      deterministicOutcomeClaimed: false as const,
      goodBadScoreGenerated: false as const,
      medicalOrFinancialAdviceGenerated: false as const,
      note: "这些文字、日月上升命主星首读、逐星综合包、定位星链与四轴距离账是来源绑定的西方占星候选内容；首读是导航而非主导排名，传统与现代守护星分歧并列保留，逐星综合不生成主导排序，四轴距离不预设统一 orb 或强弱评分。它们用于阅读与专家校订，不是经科学验证的因果结论，也不预测具体事件。"
    }),
    firstRead,
    chartRuler,
    bodySyntheses: Object.freeze(bodySyntheses),
    dispositorChains: Object.freeze(dispositorChains),
    angleProximity,
    angles: Object.freeze(angles),
    distribution,
    houseRulers: Object.freeze(houseRulers),
    placements: Object.freeze(placements),
    aspects: Object.freeze(aspects),
    sources: Object.freeze(sourceIds.map((sourceId) => SOURCE_BY_ID.get(sourceId)!))
  });
}
