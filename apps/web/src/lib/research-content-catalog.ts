import { BAZI_CONTENT_REVIEW_QUEUE } from "@hakimi/bazi-interpretation";
import {
  RESEARCH_SYSTEM_IDS,
  type ResearchSystemId
} from "./research-system-roadmap";

export const RESEARCH_CONTENT_CATALOG_PROFILE = Object.freeze({
  projectionVersion: "hakimi.research.content_catalog/0.1.0",
  catalogVersion: "0.18.0",
  snapshotDate: "2026-08-12",
  expectedSystemCount: 3,
  sourceMode: "active_bazi_live_isolated_drafts_static_audit" as const,
  runtimeImportPolicy: "isolated_draft_imports_forbidden" as const,
  navigationPolicy: "no_draft_runtime_entry" as const,
  countComparisonPolicy: "inventory_units_are_not_cross_system_scores" as const,
  expertTruthClaimed: false as const,
  formalActivationAllowed: false as const,
  scoringAllowed: false as const
});

export type ResearchContentCatalogState = "live_active" | "static_isolated_snapshot";
export type ResearchContentReviewState = "unresolved_review_queue" | "neutral_candidate_snapshot";
export type ResearchContentSourceRole =
  | "classical_source"
  | "modern_learning"
  | "interpretation_boundary"
  | "scientific_boundary";

export interface ResearchContentCatalogSection {
  sectionId: string;
  label: string;
  itemCount: number;
  unitLabel: string;
  reviewState: ResearchContentReviewState;
}

export interface ResearchContentCatalogSource {
  sourceId: string;
  title: string;
  url: string;
  role: ResearchContentSourceRole;
}

export interface ResearchContentCatalogSystem {
  systemId: ResearchSystemId;
  label: string;
  internationalLabel: string;
  catalogState: ResearchContentCatalogState;
  stateLabel: string;
  auditedAt: "2026-08-12";
  inventoryMetricLabel: string;
  inventoryUnit: string;
  fixedInventoryCount: number;
  sourceRegistryCount: number;
  expertApprovedCount: 0;
  formalPublishedCount: 0;
  runtimeReachable: boolean;
  entryHref: string | null;
  entryLabel: string | null;
  sections: readonly ResearchContentCatalogSection[];
  derivedCoverage: readonly string[];
  representativeSources: readonly ResearchContentCatalogSource[];
  evidenceDocuments: readonly string[];
  currentGaps: readonly string[];
  boundary: string;
  expertTruthClaimed: false;
  formalActivationAllowed: false;
  goodBadScore: null;
  result: null;
}

export interface ResearchContentCatalog {
  profile: typeof RESEARCH_CONTENT_CATALOG_PROFILE;
  counts: Readonly<{
    systems: 3;
    liveActive: 1;
    staticIsolatedSnapshots: 2;
    expertApproved: 0;
    formalPublished: 0;
  }>;
  systems: readonly ResearchContentCatalogSystem[];
  knownBoundaries: readonly string[];
}

export interface BuildResearchContentCatalogInput {
  systems?: readonly ResearchContentCatalogSystem[];
}

const EXPECTED_COUNTS: Readonly<
  Record<ResearchSystemId, Readonly<{ fixedInventory: number; sourceRegistry: number }>>
> = Object.freeze({
  bazi: Object.freeze({
    fixedInventory: BAZI_CONTENT_REVIEW_QUEUE.profile.expectedItemCount,
    sourceRegistry: BAZI_CONTENT_REVIEW_QUEUE.sources.length
  }),
  "ziwei-doushu": Object.freeze({ fixedInventory: 246, sourceRegistry: 11 }),
  "western-astrology": Object.freeze({ fixedInventory: 43, sourceRegistry: 31 })
});

function selectBaziSource(
  sourceId: string,
  role: ResearchContentSourceRole
): ResearchContentCatalogSource {
  const source = BAZI_CONTENT_REVIEW_QUEUE.sources.find((candidate) => candidate.id === sourceId);
  if (source === undefined) throw new Error(`八字内容目录缺少来源：${sourceId}`);
  return Object.freeze({ sourceId: source.id, title: source.title, url: source.url, role });
}

const DEFAULT_SYSTEMS: readonly ResearchContentCatalogSystem[] = Object.freeze([
  Object.freeze({
    systemId: "bazi",
    label: "八字",
    internationalLabel: "Bazi",
    catalogState: "live_active",
    stateLabel: "主应用实时目录",
    auditedAt: "2026-08-12",
    inventoryMetricLabel: "固定审稿项",
    inventoryUnit: "未裁决审稿项",
    fixedInventoryCount: BAZI_CONTENT_REVIEW_QUEUE.counts.total,
    sourceRegistryCount: BAZI_CONTENT_REVIEW_QUEUE.sources.length,
    expertApprovedCount: 0,
    formalPublishedCount: 0,
    runtimeReachable: true,
    entryHref: "/",
    entryLabel: "进入八字研究工作台",
    sections: Object.freeze(BAZI_CONTENT_REVIEW_QUEUE.groups.map((group) => Object.freeze({
      sectionId: group.category,
      label: group.label,
      itemCount: group.itemCount,
      unitLabel: "项",
      reviewState: "unresolved_review_queue" as const
    }))),
    derivedCoverage: Object.freeze([
      "排盘后可见身强身弱五档与敏感性说明，但基础算法尚未覆盖全部特殊格局。",
      "十神按年、月、日、时四柱逐项呈现，神煞按取法与命中柱位分开说明。",
      "所有候选仍进入只读审稿清单，不自动生成正式喜忌或个案吉凶。"
    ]),
    representativeSources: Object.freeze([
      selectBaziSource("dtt-strength", "classical_source"),
      selectBaziSource("smt-ten-gods", "classical_source"),
      selectBaziSource("smt-shensha-volume-2", "classical_source")
    ]),
    evidenceDocuments: Object.freeze([
      "docs/八字内容-v0.14-内容审稿清单与只读导出-2026-08-12.md"
    ]),
    currentGaps: Object.freeze([
      "旺衰权重、阈值与特殊格局仍需命理专家逐项裁决。",
      "69 项候选尚无具名审稿人、审稿日期或批准结论。",
      "工程可复算不等于传统流派真值，也不授权正式吉凶输出。"
    ]),
    boundary: "这是当前主应用中的可见候选目录；内容可以阅读和导出审稿，但批准数与正式发布数仍为 0。",
    expertTruthClaimed: false,
    formalActivationAllowed: false,
    goodBadScore: null,
    result: null
  }),
  Object.freeze({
    systemId: "ziwei-doushu",
    label: "紫微斗数",
    internationalLabel: "Ziwei Doushu",
    catalogState: "static_isolated_snapshot",
    stateLabel: "隔离静态快照",
    auditedAt: "2026-08-12",
    inventoryMetricLabel: "固定候选内容",
    inventoryUnit: "中性候选条目",
    fixedInventoryCount: 246,
    sourceRegistryCount: 11,
    expertApprovedCount: 0,
    formalPublishedCount: 0,
    runtimeReachable: false,
    entryHref: null,
    entryLabel: null,
    sections: Object.freeze([
      Object.freeze({
        sectionId: "major_star_semantics",
        label: "十四主星基础语义",
        itemCount: 14,
        unitLabel: "颗主星",
        reviewState: "neutral_candidate_snapshot"
      }),
      Object.freeze({
        sectionId: "palace_roles",
        label: "十二宫问题域",
        itemCount: 12,
        unitLabel: "个宫位",
        reviewState: "neutral_candidate_snapshot"
      }),
      Object.freeze({
        sectionId: "major_star_all_palaces",
        label: "主星 × 十二宫位置候选",
        itemCount: 168,
        unitLabel: "条位置候选",
        reviewState: "neutral_candidate_snapshot"
      }),
      Object.freeze({
        sectionId: "natal_transformation_semantics",
        label: "本命生年四化中性修正",
        itemCount: 4,
        unitLabel: "种四化",
        reviewState: "neutral_candidate_snapshot"
      }),
      Object.freeze({
        sectionId: "natal_transformation_all_palaces",
        label: "本命生年四化 × 十二宫落宫修正",
        itemCount: 48,
        unitLabel: "条落宫候选",
        reviewState: "neutral_candidate_snapshot"
      })
    ]),
    derivedCoverage: Object.freeze([
      "隔离预览可按真实盘面派生同宫、三方四正、亮度与生年四化的组合事实复核。",
      "可生成逐星合参、固定 12 宫首读队列与本命生年四化修正事实；四化命中时会绑定 48 条固定落宫候选之一，动态引用次数不重复计入 246 条固定目录。",
      "组合层的结果、吉凶和事件结论均保持为空。"
    ]),
    representativeSources: Object.freeze([
      Object.freeze({
        sourceId: "ziwei.classic.zwdsql.volume1.wikisource.2026_08_12",
        title: "《紫微斗数全书》卷一（维基文库转录）",
        url: "https://zh.wikisource.org/zh-hans/紫微斗數全書/卷一",
        role: "classical_source"
      }),
      Object.freeze({
        sourceId: "ziwei.modern.iztro.major_star.2026_08_12",
        title: "紫微研习社 · 十四主星",
        url: "https://docs.iztro.com/learn/major-star",
        role: "modern_learning"
      }),
      Object.freeze({
        sourceId: "ziwei.modern.iztro.palace_system.all_palaces.2026_08_12",
        title: "紫微研习社 · 宫位系统",
        url: "https://docs.iztro.com/zh_TW/learn/palace",
        role: "modern_learning"
      }),
      Object.freeze({
        sourceId: "ziwei.technical.iztro.same_palace_sanfang_terms.2026_08_12",
        title: "紫微研习社 · 同宫与三方术语",
        url: "https://docs.iztro.com/learn/basis",
        role: "modern_learning"
      }),
      Object.freeze({
        sourceId: "ziwei.modern.iztro.mutagen.semantic_candidate.2026_08_12",
        title: "紫微研习社 · 四化",
        url: "https://docs.iztro.com/zh_TW/learn/mutagen",
        role: "modern_learning"
      })
    ]),
    evidenceDocuments: Object.freeze([
      "docs/紫微内容-v0.5-十二宫位置候选与全宫组合事实包证据-2026-08-12.md",
      "docs/紫微内容-v0.6-逐星合参复核包与证据-2026-08-12.md",
      "docs/紫微内容-v0.7-逐宫直读复核包与证据-2026-08-12.md",
      "docs/紫微内容-v0.8-本命生年四化修正候选与证据-2026-08-12.md",
      "docs/紫微内容-v0.9-四化十二宫位置化审稿矩阵与证据-2026-08-12.md"
    ]),
    currentGaps: Object.freeze([
      "内容仅存在于 4218 隔离工程预览，主应用没有紫微入口。",
      "星曜组合、三方四正与四化候选尚无专家真值裁决。",
      "静态目录不能证明任一真实命盘的计算、保存或发布已获准。"
    ]),
    boundary: "此处只是对隔离源码的 2026-08-12 静态审计快照；主应用没有加载紫微草案包，也不能导航到 4218。",
    expertTruthClaimed: false,
    formalActivationAllowed: false,
    goodBadScore: null,
    result: null
  }),
  Object.freeze({
    systemId: "western-astrology",
    label: "西洋星盘",
    internationalLabel: "Western Astrology",
    catalogState: "static_isolated_snapshot",
    stateLabel: "隔离静态快照",
    auditedAt: "2026-08-12",
    inventoryMetricLabel: "固定语义基元",
    inventoryUnit: "来源绑定语义基元",
    fixedInventoryCount: 43,
    sourceRegistryCount: 31,
    expertApprovedCount: 0,
    formalPublishedCount: 0,
    runtimeReachable: false,
    entryHref: null,
    entryLabel: null,
    sections: Object.freeze([
      Object.freeze({
        sectionId: "planets",
        label: "天体语义",
        itemCount: 10,
        unitLabel: "颗天体",
        reviewState: "neutral_candidate_snapshot"
      }),
      Object.freeze({
        sectionId: "signs",
        label: "星座语义",
        itemCount: 12,
        unitLabel: "个星座",
        reviewState: "neutral_candidate_snapshot"
      }),
      Object.freeze({
        sectionId: "houses",
        label: "宫位语义",
        itemCount: 12,
        unitLabel: "个宫位",
        reviewState: "neutral_candidate_snapshot"
      }),
      Object.freeze({
        sectionId: "aspects",
        label: "主要相位语义",
        itemCount: 5,
        unitLabel: "种相位",
        reviewState: "neutral_candidate_snapshot"
      }),
      Object.freeze({
        sectionId: "angles",
        label: "四轴语义",
        itemCount: 4,
        unitLabel: "个轴点",
        reviewState: "neutral_candidate_snapshot"
      })
    ]),
    derivedCoverage: Object.freeze([
      "隔离预览可按盘面派生落座、落宫、相位、宫主星、命主星、定位星链与四轴距离。",
      "可生成逐星综合包与太阳、月亮、上升、命主星四步首读；派生数量不计入 43 个固定基元。",
      "首读只是阅读顺序，不是力量排名；结果、吉凶、事件预测与科学有效性主张均保持为空。"
    ]),
    representativeSources: Object.freeze([
      Object.freeze({
        sourceId: "astrodienst.signs",
        title: "Astrodienst · The Signs",
        url: "https://www.astro.com/astrology/in_signs_e.htm",
        role: "modern_learning"
      }),
      Object.freeze({
        sourceId: "astrodienst.houses",
        title: "Astrodienst Astrowiki · House",
        url: "https://www.astro.com/astrowiki/en/House",
        role: "modern_learning"
      }),
      Object.freeze({
        sourceId: "astrodienst.aspects",
        title: "Astrodienst · Aspects",
        url: "https://www.astro.com/astrology/in_aspect_e.htm",
        role: "modern_learning"
      }),
      Object.freeze({
        sourceId: "astrodienst.interpretation_limits",
        title: "Astrodienst Astrowiki · Limits of Interpretation",
        url: "https://www.astro.com/astrowiki/en/Limits_of_Interpretation",
        role: "interpretation_boundary"
      }),
      Object.freeze({
        sourceId: "nature.carlson_1985",
        title: "Nature · A double-blind test of astrology",
        url: "https://www.nature.com/articles/318419a0",
        role: "scientific_boundary"
      })
    ]),
    evidenceDocuments: Object.freeze([
      "docs/西洋内容-v0.5-日月上升命主星整盘首读与证据-2026-08-12.md"
    ]),
    currentGaps: Object.freeze([
      "内容仅存在于 4219 无存储隔离预览，主应用没有西洋星盘入口。",
      "尚无 JPL 官方参考字节、严格成功回执或获准的专家真值集。",
      "占星解释不能表示科学因果、具体事件预测或医疗财务建议。"
    ]),
    boundary: "此处只是对隔离源码的 2026-08-12 静态审计快照；主应用没有加载西洋草案包，也不能导航到 4219。",
    expertTruthClaimed: false,
    formalActivationAllowed: false,
    goodBadScore: null,
    result: null
  })
]);

function copySection(section: ResearchContentCatalogSection): ResearchContentCatalogSection {
  return Object.freeze({ ...section });
}

function copySource(source: ResearchContentCatalogSource): ResearchContentCatalogSource {
  return Object.freeze({ ...source });
}

function copySystem(system: ResearchContentCatalogSystem): ResearchContentCatalogSystem {
  return Object.freeze({
    ...system,
    sections: Object.freeze(system.sections.map(copySection)),
    derivedCoverage: Object.freeze([...system.derivedCoverage]),
    representativeSources: Object.freeze(system.representativeSources.map(copySource)),
    evidenceDocuments: Object.freeze([...system.evidenceDocuments]),
    currentGaps: Object.freeze([...system.currentGaps])
  });
}

function validateSystem(system: ResearchContentCatalogSystem, expectedId: ResearchSystemId): void {
  if (system.systemId !== expectedId) {
    throw new Error(`跨术数内容目录顺序错误：预期 ${expectedId}，实际 ${system.systemId}`);
  }
  const expected = EXPECTED_COUNTS[system.systemId];
  if (system.fixedInventoryCount !== expected.fixedInventory) {
    throw new Error(`${system.label}固定目录数量必须为 ${expected.fixedInventory}`);
  }
  if (system.sourceRegistryCount !== expected.sourceRegistry) {
    throw new Error(`${system.label}来源登记数量必须为 ${expected.sourceRegistry}`);
  }
  if (system.sections.reduce((sum, section) => sum + section.itemCount, 0) !== system.fixedInventoryCount) {
    throw new Error(`${system.label}分项数量与固定目录不一致`);
  }
  const sectionIds = new Set(system.sections.map((section) => section.sectionId));
  if (sectionIds.size !== system.sections.length
    || system.sections.some((section) => !section.label || !section.unitLabel || section.itemCount <= 0)) {
    throw new Error(`${system.label}分项目录无效`);
  }
  if (system.representativeSources.length === 0
    || system.representativeSources.length > system.sourceRegistryCount) {
    throw new Error(`${system.label}代表来源数量无效`);
  }
  const sourceIds = new Set<string>();
  for (const source of system.representativeSources) {
    if (!source.sourceId || !source.title || !source.url.startsWith("https://") || sourceIds.has(source.sourceId)) {
      throw new Error(`${system.label}代表来源无效或重复：${source.sourceId}`);
    }
    sourceIds.add(source.sourceId);
  }
  if (system.evidenceDocuments.length === 0
    || system.evidenceDocuments.some((documentPath) => !documentPath.startsWith("docs/"))) {
    throw new Error(`${system.label}证据文档路径无效`);
  }
  if (system.expertApprovedCount !== 0 || system.formalPublishedCount !== 0
    || system.expertTruthClaimed || system.formalActivationAllowed
    || system.goodBadScore !== null || system.result !== null) {
    throw new Error(`${system.label}越过专家真值或正式发布边界`);
  }
  if (system.systemId === "bazi") {
    if (system.catalogState !== "live_active" || !system.runtimeReachable
      || system.entryHref !== "/" || system.entryLabel === null) {
      throw new Error("八字内容目录必须保持主应用实时入口");
    }
  } else if (system.catalogState !== "static_isolated_snapshot" || system.runtimeReachable
    || system.entryHref !== null || system.entryLabel !== null) {
    throw new Error(`${system.label}隔离快照不得拥有主应用运行时入口`);
  }
}

export function buildResearchContentCatalog(
  input: BuildResearchContentCatalogInput = {}
): ResearchContentCatalog {
  const systems = Object.freeze((input.systems ?? DEFAULT_SYSTEMS).map(copySystem));
  if (systems.length !== RESEARCH_CONTENT_CATALOG_PROFILE.expectedSystemCount) {
    throw new Error(`跨术数内容目录必须恰有 ${RESEARCH_CONTENT_CATALOG_PROFILE.expectedSystemCount} 个体系`);
  }
  const systemIds = new Set(systems.map((system) => system.systemId));
  if (systemIds.size !== systems.length) throw new Error("跨术数内容目录体系 ID 重复");
  for (const [index, expectedId] of RESEARCH_SYSTEM_IDS.entries()) {
    validateSystem(systems[index]!, expectedId);
  }

  const counts = Object.freeze({
    systems: 3 as const,
    liveActive: 1 as const,
    staticIsolatedSnapshots: 2 as const,
    expertApproved: 0 as const,
    formalPublished: 0 as const
  });
  const knownBoundaries = Object.freeze([
    "69 个八字审稿项、246 条紫微候选和 43 个西洋语义基元使用不同计量单位，不能相加或比较完成度、准确率。",
    "紫微与西洋数据只来自 2026-08-12 隔离源码静态审计；主应用不导入草案包，也不提供 4218/4219 入口。",
    "来源绑定、工程测试与可复算都不等于专家真值；当前专家批准和正式发布均为 0。"
  ]);
  return Object.freeze({
    profile: RESEARCH_CONTENT_CATALOG_PROFILE,
    counts,
    systems,
    knownBoundaries
  });
}

export const RESEARCH_CONTENT_CATALOG = buildResearchContentCatalog();
