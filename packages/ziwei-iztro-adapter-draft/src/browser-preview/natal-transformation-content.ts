import type {
  BrowserProbeNatalTransformationCandidateContent,
  BrowserProbeNatalTransformationContentSource,
  BrowserProbeNatalTransformationLabel
} from "./browser-protocol.ts";

export const ZIWEI_NATAL_TRANSFORMATION_CONTENT_VERSION =
  "ziwei.natal_transformation.neutral_candidate/0.1" as const;

const MODERN_SOURCE_ID = "ziwei.modern.iztro.mutagen.semantic_candidate.2026_08_12";
const CLASSICAL_SOURCE_ID = "ziwei.classic.zwdsql.volume1.mutagen.wikisource.2026_08_12";
const METHOD_DIFFERENCE_SOURCE_ID = "ziwei.secondary.wikipedia.school_difference.2026_08_12";

export const ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES = Object.freeze<
  readonly BrowserProbeNatalTransformationContentSource[]
>([
  Object.freeze({
    sourceId: MODERN_SOURCE_ID,
    sourceKind: "modern_original_mutagen_learning_material",
    title: "紫微斗数四化｜紫微研习社 iztro.com",
    sourceUrl: "https://docs.iztro.com/zh_TW/learn/mutagen",
    accessedAt: "2026-08-12",
    usageBoundary:
      "用于交叉核对禄、权、科、忌的调节方向以及四化不等于固定好坏；本轮只重写中性候选，不复制原网页文案。",
    expertTruthClaimed: false
  }),
  Object.freeze({
    sourceId: CLASSICAL_SOURCE_ID,
    sourceKind: "public_domain_classical_mutagen_transcription",
    title: "《紫微斗数全书》卷一·化禄权科忌星所主若何（维基文库转录）",
    sourceUrl: "https://zh.wikisource.org/wiki/紫微斗數全書/卷一",
    accessedAt: "2026-08-12",
    usageBoundary:
      "仅作传统四化篇目与术语定位；不采用古籍中的身份、财富、灾祸、疾病、寿命或确定结果断语。",
    expertTruthClaimed: false
  }),
  Object.freeze({
    sourceId: METHOD_DIFFERENCE_SOURCE_ID,
    sourceKind: "secondary_method_difference_overview",
    title: "紫微斗数·流派与四化表差异概览（中文维基百科）",
    sourceUrl: "https://zh.wikipedia.org/wiki/紫微斗數",
    accessedAt: "2026-08-12",
    usageBoundary:
      "只用于登记流派与四化表存在差异这一方法边界；不把百科条目视为四化语义真值或排盘权威。",
    expertTruthClaimed: false
  })
]);

type NatalTransformationSeed = Readonly<{
  transformationLabel: BrowserProbeNatalTransformationLabel;
  slug: "lu" | "quan" | "ke" | "ji";
  motionLabel: string;
  plainLanguage: string;
  counterweight: string;
  reviewPrompt: string;
  modernLocator: string;
  classicalLocator: string;
}>;

const SEEDS = Object.freeze<readonly NatalTransformationSeed[]>([
  Object.freeze({
    transformationLabel: "禄",
    slug: "lu",
    motionLabel: "扩增与投入",
    plainLanguage: "把所依附星曜在该宫问题域中的资源、活动、注意与投入进一步放大。",
    counterweight: "扩增也可能同时放大成本、忙碌或消耗，不能自动等同于金钱、顺利或成功。",
    reviewPrompt: "选定流派是否认可这一扩增方向？哪些星曜、宫位或现实条件会把投入表现为成本而非收益？",
    modernLocator: "四化星／禄／放大与增加，同时可能放大消耗",
    classicalLocator: "卷一／问化禄星所主若何"
  }),
  Object.freeze({
    transformationLabel: "权",
    slug: "quan",
    motionLabel: "掌控与承担",
    plainLanguage: "使所依附星曜在该宫问题域中的执行、掌控、承担与推动感更明显。",
    counterweight: "承担增加也可能伴随压力、控制冲突或责任负荷，不能自动等同于职位、权位或优势。",
    reviewPrompt: "选定流派如何区分执行力、责任负荷与控制冲突？哪些现实记录可帮助判断具体表达？",
    modernLocator: "四化星／权／掌控、执行、责任与压力",
    classicalLocator: "卷一／问化权星所主若何"
  }),
  Object.freeze({
    transformationLabel: "科",
    slug: "ke",
    motionLabel: "呈现与调和",
    plainLanguage: "使所依附星曜在该宫问题域中更强调呈现、命名、解释、被识别与调和。",
    counterweight: "被看见不等于评价有利、资格成立或行动充足，也可能只体现为说明与缓冲。",
    reviewPrompt: "选定流派如何区分可见度、名声、资格与缓冲作用？哪些情形只有呈现而没有实际推进？",
    modernLocator: "四化星／科／名声、可见度、舒缓与行动动力边界",
    classicalLocator: "卷一／问化科星所主若何"
  }),
  Object.freeze({
    transformationLabel: "忌",
    slug: "ji",
    motionLabel: "牵挂与补缺",
    plainLanguage: "使所依附星曜在该宫问题域中更容易形成牵挂、反复关注、主观欠缺感与持续补位。",
    counterweight: "感受到不足不等于现实结果恶化，也可能推动核对、修补或重新分配注意。",
    reviewPrompt: "选定流派如何区分主观欠缺感、现实阻碍与补救动力？哪些反例要求保持多种解释？",
    modernLocator: "四化星／忌／在意、执着、欠缺感与补救动力",
    classicalLocator: "卷一／问化忌星所主若何"
  })
]);

export const ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT = Object.freeze(
  SEEDS.map((seed) => Object.freeze<BrowserProbeNatalTransformationCandidateContent>({
    contentId: `ziwei.content.natal_transformation.${seed.slug}.neutral.v0_1`,
    contentVersion: ZIWEI_NATAL_TRANSFORMATION_CONTENT_VERSION,
    contentKind: "neutral_natal_transformation_modifier_candidate",
    transformationLabel: seed.transformationLabel,
    motionLabel: seed.motionLabel,
    plainLanguage: seed.plainLanguage,
    counterweight: seed.counterweight,
    reviewPrompt: seed.reviewPrompt,
    derivationMethod: "editorial_synthesis_of_source_bound_natal_transformation_themes",
    sourceRefs: Object.freeze([
      Object.freeze({ sourceId: MODERN_SOURCE_ID, locator: seed.modernLocator }),
      Object.freeze({ sourceId: CLASSICAL_SOURCE_ID, locator: seed.classicalLocator }),
      Object.freeze({
        sourceId: METHOD_DIFFERENCE_SOURCE_ID,
        locator: "流派／四化派别与十天干四化表差异"
      })
    ]),
    reviewStatus: "awaiting_expert_review",
    publicationStatus: "isolated_candidate_only",
    expertTruthClaimed: false,
    directOutcomeAllowed: false,
    scoringAllowed: false
  }))
);

const CANDIDATE_BY_LABEL = validateAndIndexCandidates();

export function requireNatalTransformationCandidateContent(
  transformationLabel: string
): BrowserProbeNatalTransformationCandidateContent {
  const candidate = CANDIDATE_BY_LABEL.get(transformationLabel as BrowserProbeNatalTransformationLabel);
  if (!candidate) throw new Error(`本命生年四化候选注册表不接受标签：${transformationLabel}`);
  return candidate;
}

function validateAndIndexCandidates(): ReadonlyMap<
  BrowserProbeNatalTransformationLabel,
  BrowserProbeNatalTransformationCandidateContent
> {
  if (ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES.length !== 3) {
    throw new Error("本命生年四化候选必须登记恰好三个来源边界");
  }
  const sourceIds = new Set<string>();
  for (const source of ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES) {
    if (sourceIds.has(source.sourceId) || !source.sourceUrl.startsWith("https://")
      || source.expertTruthClaimed) {
      throw new Error(`本命生年四化候选来源无效或重复：${source.sourceId}`);
    }
    sourceIds.add(source.sourceId);
  }
  if (ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT.length !== 4) {
    throw new Error("本命生年四化候选注册表必须恰有禄、权、科、忌四条");
  }
  const expectedLabels: readonly BrowserProbeNatalTransformationLabel[] = ["禄", "权", "科", "忌"];
  const contentIds = new Set<string>();
  const byLabel = new Map<
    BrowserProbeNatalTransformationLabel,
    BrowserProbeNatalTransformationCandidateContent
  >();
  const riskyAbsoluteLanguage = /你|一定|必然|注定|保证|终身|大吉|大凶|发财|富贵|升职|灾祸|疾病|寿命/u;
  for (const [index, candidate] of ZIWEI_NATAL_TRANSFORMATION_CANDIDATE_CONTENT.entries()) {
    if (candidate.transformationLabel !== expectedLabels[index]
      || byLabel.has(candidate.transformationLabel)
      || contentIds.has(candidate.contentId)) {
      throw new Error(`本命生年四化候选顺序、标签或内容 ID 无效：${candidate.contentId}`);
    }
    if (candidate.sourceRefs.length !== 3
      || new Set(candidate.sourceRefs.map((sourceRef) => sourceRef.sourceId)).size !== 3
      || candidate.sourceRefs.some((sourceRef) => !sourceIds.has(sourceRef.sourceId) || !sourceRef.locator)) {
      throw new Error(`本命生年四化候选 ${candidate.transformationLabel} 的来源引用不完整`);
    }
    if (riskyAbsoluteLanguage.test(
      `${candidate.motionLabel}${candidate.plainLanguage}${candidate.counterweight}${candidate.reviewPrompt}`
    )) {
      throw new Error(`本命生年四化候选 ${candidate.transformationLabel} 含有禁止的绝对化或结果措辞`);
    }
    if (candidate.expertTruthClaimed || candidate.directOutcomeAllowed || candidate.scoringAllowed) {
      throw new Error(`本命生年四化候选 ${candidate.transformationLabel} 越过待审边界`);
    }
    byLabel.set(candidate.transformationLabel, candidate);
    contentIds.add(candidate.contentId);
  }
  return byLabel;
}
