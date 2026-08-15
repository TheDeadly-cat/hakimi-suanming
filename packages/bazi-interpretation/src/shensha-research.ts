import type { ChartFacts } from "@hakimi/contracts";
import {
  requireShenshaPositionEditorial,
  SHENSHA_POSITION_CONTENT_VERSION,
  SHENSHA_POSITION_EDITORIAL,
  type ShenshaPositionEditorialEntry
} from "./shensha-position-content";

export const BAZI_SHENSHA_RESEARCH_PROFILE = Object.freeze({
  rulePackId: "hakimi-shensha-facts-smt-year-basis-candidate",
  ruleVersion: "0.1.0",
  school: "《三命通会》年柱基准转录候选",
  enabledByDefault: false,
  calculationScope: "read_only_research_preview" as const,
  reviewStatus: "source_transcribed_pending_expert_review" as const,
  interpretationStatus: "withheld_pending_expert_review" as const,
  positionEditorialVersion: SHENSHA_POSITION_CONTENT_VERSION,
  positionEditorialCoverage: "5x4_explicit_candidate" as const,
  positionEditorialStatus: "candidate_pending_expert_review" as const
});

export const BAZI_SHENSHA_SOURCE_REFS = Object.freeze([
  Object.freeze({
    id: "smt-shensha-volume-2",
    title: "《三命通会》卷二",
    url: "https://zh.wikisource.org/wiki/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%BA%8C",
    evidenceClass: "public_domain_classic" as const,
    locators: ["论将星华盖", "论咸池"],
    usage: "将星、华盖与咸池的三合组取法线索"
  }),
  Object.freeze({
    id: "smt-shensha-volume-3",
    title: "《三命通会》卷三",
    url: "https://zh.wikisource.org/wiki/%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83/%E5%8D%B7%E4%B8%89",
    evidenceClass: "public_domain_classic" as const,
    locators: ["论驿马", "论天乙贵人"],
    usage: "驿马三合组取法、天乙贵人天干映射及不可见煞即断吉的边界"
  }),
  Object.freeze({
    id: "hakimi-shensha-ledger-v0.4",
    title: "哈基米神煞事实注册表 v0.4",
    url: "/docs/八字内容-v0.4-十神审稿表与神煞事实注册表-2026-08-12.md",
    evidenceClass: "original_editorial" as const,
    locators: ["首批事实注册表", "冲突与关闭边界"],
    usage: "规则转录、字段契约、冲突槽位与发布边界"
  }),
  Object.freeze({
    id: "hakimi-shensha-position-editorial-v0.5",
    title: "哈基米神煞 5×4 位置议题候选 v0.5",
    url: "/docs/八字内容-v0.5-神煞五乘四位置议题候选与证据-2026-08-12.md",
    evidenceClass: "original_editorial" as const,
    locators: ["五项神煞位置候选", "高风险禁用边界"],
    usage: "把原典主题与年/月/日/时柱问题域重组为 20 条原创待审内容；不生成个案吉凶"
  })
]);

export type ShenshaPrimaryBasis = "year_branch" | "year_stem";
export type ShenshaPendingBasis = "day_branch" | "day_stem";
export type ShenshaPillarPosition = keyof ChartFacts["pillars"];

export interface ShenshaConflictVariant {
  variantId: string;
  basis: ShenshaPendingBasis;
  status: "disabled_missing_approved_source_and_expert_review";
  note: string;
}

export interface ShenshaRuleDefinition {
  id: "jiangxing" | "huagai" | "xianchi" | "yima" | "tianyi-guiren";
  name: "将星" | "华盖" | "咸池（桃花）" | "驿马" | "天乙贵人";
  basis: ShenshaPrimaryBasis;
  basisLabel: "年支" | "年干";
  targetField: "pillar.branch";
  targetByBasis: Readonly<Record<string, readonly string[]>>;
  formulaSummary: string;
  sourceRefIds: readonly string[];
  sourceLocator: string;
  reviewStatus: "source_transcribed_candidate";
  interpretationStatus: "withheld";
  conflicts: readonly ShenshaConflictVariant[];
}

export interface ShenshaFactHit {
  ruleId: ShenshaRuleDefinition["id"];
  name: ShenshaRuleDefinition["name"];
  basis: ShenshaPrimaryBasis;
  basisLabel: ShenshaRuleDefinition["basisLabel"];
  basisValue: string;
  targetBranches: readonly string[];
  matchedBranches: string[];
  positions: ShenshaPillarPosition[];
  positionLabels: string[];
  factSummary: string;
  sourceRefIds: readonly string[];
  sourceLocator: string;
  reviewStatus: "source_transcribed_candidate";
  interpretation: null;
  positionEditorialCandidates: readonly ShenshaPositionEditorialEntry[];
}

export interface ShenshaResearchResult {
  profile: typeof BAZI_SHENSHA_RESEARCH_PROFILE;
  sourceRefs: typeof BAZI_SHENSHA_SOURCE_REFS;
  rules: typeof BAZI_SHENSHA_RULE_REGISTRY;
  positionEditorial: typeof SHENSHA_POSITION_EDITORIAL;
  hits: ShenshaFactHit[];
  excludedPositions: ShenshaPillarPosition[];
  knownGaps: string[];
}

export interface ShenshaResearchOptions {
  includeHour?: boolean;
}

const positionOrder: ShenshaPillarPosition[] = ["year", "month", "day", "hour"];
const positionLabels: Record<ShenshaPillarPosition, string> = {
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱"
};

const trineTargets = {
  jiangxing: {
    寅: ["午"], 午: ["午"], 戌: ["午"],
    巳: ["酉"], 酉: ["酉"], 丑: ["酉"],
    申: ["子"], 子: ["子"], 辰: ["子"],
    亥: ["卯"], 卯: ["卯"], 未: ["卯"]
  },
  huagai: {
    寅: ["戌"], 午: ["戌"], 戌: ["戌"],
    巳: ["丑"], 酉: ["丑"], 丑: ["丑"],
    申: ["辰"], 子: ["辰"], 辰: ["辰"],
    亥: ["未"], 卯: ["未"], 未: ["未"]
  },
  xianchi: {
    寅: ["卯"], 午: ["卯"], 戌: ["卯"],
    巳: ["午"], 酉: ["午"], 丑: ["午"],
    申: ["酉"], 子: ["酉"], 辰: ["酉"],
    亥: ["子"], 卯: ["子"], 未: ["子"]
  },
  yima: {
    寅: ["申"], 午: ["申"], 戌: ["申"],
    巳: ["亥"], 酉: ["亥"], 丑: ["亥"],
    申: ["寅"], 子: ["寅"], 辰: ["寅"],
    亥: ["巳"], 卯: ["巳"], 未: ["巳"]
  }
} as const satisfies Record<string, Record<string, readonly string[]>>;

const tianyiTargets = {
  甲: ["丑", "未"],
  戊: ["丑", "未"],
  庚: ["丑", "未"],
  乙: ["子", "申"],
  己: ["子", "申"],
  丙: ["亥", "酉"],
  丁: ["亥", "酉"],
  壬: ["卯", "巳"],
  癸: ["卯", "巳"],
  辛: ["午", "寅"]
} as const satisfies Record<string, readonly string[]>;

function pendingVariant(ruleId: string, basis: ShenshaPendingBasis): ShenshaConflictVariant {
  return Object.freeze({
    variantId: `${ruleId}-${basis}-pending`,
    basis,
    status: "disabled_missing_approved_source_and_expert_review" as const,
    note: "项目仅保留冲突槽位；没有通过来源准入和专家裁决，当前规则包不执行此基准。"
  });
}

export const BAZI_SHENSHA_RULE_REGISTRY = Object.freeze([
  Object.freeze({
    id: "jiangxing",
    name: "将星",
    basis: "year_branch",
    basisLabel: "年支",
    targetField: "pillar.branch",
    targetByBasis: trineTargets.jiangxing,
    formulaSummary: "按年支所属三合局，取该局中位：寅午戌取午、巳酉丑取酉、申子辰取子、亥卯未取卯。",
    sourceRefIds: ["smt-shensha-volume-2"],
    sourceLocator: "论将星华盖：以三合中位谓之将星",
    reviewStatus: "source_transcribed_candidate",
    interpretationStatus: "withheld",
    conflicts: [pendingVariant("jiangxing", "day_branch")]
  }),
  Object.freeze({
    id: "huagai",
    name: "华盖",
    basis: "year_branch",
    basisLabel: "年支",
    targetField: "pillar.branch",
    targetByBasis: trineTargets.huagai,
    formulaSummary: "按年支所属三合局，取该局墓库：寅午戌取戌、巳酉丑取丑、申子辰取辰、亥卯未取未。",
    sourceRefIds: ["smt-shensha-volume-2"],
    sourceLocator: "论将星华盖：以三合底处得库谓之华盖",
    reviewStatus: "source_transcribed_candidate",
    interpretationStatus: "withheld",
    conflicts: [pendingVariant("huagai", "day_branch")]
  }),
  Object.freeze({
    id: "xianchi",
    name: "咸池（桃花）",
    basis: "year_branch",
    basisLabel: "年支",
    targetField: "pillar.branch",
    targetByBasis: trineTargets.xianchi,
    formulaSummary: "按年支所属三合局，取沐浴位：寅午戌取卯、巳酉丑取午、申子辰取酉、亥卯未取子。",
    sourceRefIds: ["smt-shensha-volume-2"],
    sourceLocator: "论咸池：寅午戌卯、巳酉丑午、申子辰酉、亥卯未子",
    reviewStatus: "source_transcribed_candidate",
    interpretationStatus: "withheld",
    conflicts: [pendingVariant("xianchi", "day_branch")]
  }),
  Object.freeze({
    id: "yima",
    name: "驿马",
    basis: "year_branch",
    basisLabel: "年支",
    targetField: "pillar.branch",
    targetByBasis: trineTargets.yima,
    formulaSummary: "按年支所属三合局取冲位：寅午戌取申、巳酉丑取亥、申子辰取寅、亥卯未取巳。",
    sourceRefIds: ["smt-shensha-volume-3"],
    sourceLocator: "论驿马：四组三合生人之马位",
    reviewStatus: "source_transcribed_candidate",
    interpretationStatus: "withheld",
    conflicts: [pendingVariant("yima", "day_branch")]
  }),
  Object.freeze({
    id: "tianyi-guiren",
    name: "天乙贵人",
    basis: "year_stem",
    basisLabel: "年干",
    targetField: "pillar.branch",
    targetByBasis: tianyiTargets,
    formulaSummary: "按年干取贵人支：甲戊庚取丑未，乙己取子申，丙丁取亥酉，壬癸取卯巳，辛取午寅。",
    sourceRefIds: ["smt-shensha-volume-3"],
    sourceLocator: "论天乙贵人：十干分别寄贵于丑未、子申、酉亥、卯巳、寅午",
    reviewStatus: "source_transcribed_candidate",
    interpretationStatus: "withheld",
    conflicts: [pendingVariant("tianyi-guiren", "day_stem")]
  })
] as const satisfies readonly ShenshaRuleDefinition[]);

function basisValueFor(facts: ChartFacts, basis: ShenshaPrimaryBasis): string {
  return basis === "year_branch" ? facts.pillars.year.branch : facts.pillars.year.stem;
}

export function deriveShenshaResearchFacts(
  facts: ChartFacts,
  options: ShenshaResearchOptions = {}
): ShenshaResearchResult {
  const includeHour = options.includeHour ?? true;
  const activePositions = positionOrder.filter((position) => position !== "hour" || includeHour);
  const excludedPositions: ShenshaPillarPosition[] = includeHour ? [] : ["hour"];
  const hits: ShenshaFactHit[] = [];

  for (const rule of BAZI_SHENSHA_RULE_REGISTRY) {
    const basisValue = basisValueFor(facts, rule.basis);
    const targetByBasis: Readonly<Record<string, readonly string[]>> = rule.targetByBasis;
    const targetBranches = targetByBasis[basisValue] ?? [];
    const positions = activePositions.filter((position) => targetBranches.includes(facts.pillars[position].branch));
    if (!positions.length) continue;
    const labels = positions.map((position) => positionLabels[position]);
    const matchedBranches = [...new Set(positions.map((position) => facts.pillars[position].branch))];
    hits.push({
      ruleId: rule.id,
      name: rule.name,
      basis: rule.basis,
      basisLabel: rule.basisLabel,
      basisValue,
      targetBranches,
      matchedBranches,
      positions,
      positionLabels: labels,
      factSummary: `以${rule.basisLabel}${basisValue}取${targetBranches.join("、")}；本盘在${labels.join("、")}见${matchedBranches.join("、")}。`,
      sourceRefIds: rule.sourceRefIds,
      sourceLocator: rule.sourceLocator,
      reviewStatus: rule.reviewStatus,
      interpretation: null,
      positionEditorialCandidates: positions.map((position) => (
        requireShenshaPositionEditorial(rule.id, position)
      ))
    });
  }

  const knownGaps = [
    "当前只转录《三命通会》年干/年支基准；日干/日支异法保留冲突槽位但不执行。",
    "命中仅证明本规则包中的字段映射成立；5×4 位置内容是原创编辑候选，个案结果与吉凶仍为 null。",
    "位置候选不自动生成性格定型、婚恋、疾病、灾祸、财富或职业结论。",
    "尚未把生旺、冲破、空亡、纳音、其他神煞组合与运限引动纳入裁决。",
    "五项取法仍待命理专家逐条校勘；工程测试只证明转录代码稳定。"
  ];
  if (!includeHour) knownGaps.push("时辰不可靠，时柱已从神煞候选命中位置中排除。" );

  return {
    profile: BAZI_SHENSHA_RESEARCH_PROFILE,
    sourceRefs: BAZI_SHENSHA_SOURCE_REFS,
    rules: BAZI_SHENSHA_RULE_REGISTRY,
    positionEditorial: SHENSHA_POSITION_EDITORIAL,
    hits,
    excludedPositions,
    knownGaps
  };
}
