import {
  BAZI_SHENSHA_RULE_REGISTRY,
  BAZI_SHENSHA_SOURCE_REFS,
  type ShenshaRuleDefinition
} from "./shensha-research";
import {
  SHENSHA_EDITORIAL_POSITIONS,
  SHENSHA_EDITORIAL_RULE_IDS,
  SHENSHA_POSITION_EDITORIAL,
  type ShenshaPositionEditorialEntry
} from "./shensha-position-content";
import { BAZI_INTERPRETATION_SOURCE_REFS } from "./source-refs";
import {
  BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS,
  BAZI_STRENGTH_METHOD_REVIEW_ITEMS,
  BAZI_STRENGTH_WEIGHT_SUMMARY
} from "./strength-policy";
import {
  TEN_GOD_NAMES,
  TEN_GOD_PILLAR_POSITIONS,
  TEN_GOD_POSITION_EDITORIAL,
  type TenGodPositionEditorialEntry
} from "./ten-god-position-content";

export const BAZI_CONTENT_REVIEW_QUEUE_PROFILE = Object.freeze({
  projectionVersion: "hakimi.bazi.content_review_queue/0.1.0",
  catalogVersion: "0.17.0",
  expectedItemCount: 69,
  workflowMode: "read_only_export_only" as const,
  orderingPolicy: "fixed_method_then_ten_god_then_shensha" as const,
  decisionPolicy: "all_items_unresolved_until_attributed_review" as const,
  allowedDecisions: Object.freeze(["unresolved", "approve", "revise", "reject"] as const),
  mutationPolicy: "no_chart_or_storage_write" as const,
  formalActivationAllowed: false as const,
  expertTruthClaimed: false as const
});

export const BAZI_CONTENT_REVIEW_EXPORT_FILENAME = "hakimi-bazi-content-review-queue-v017.json" as const;

export const BAZI_CONTENT_REVIEW_CATEGORY_ORDER = Object.freeze([
  "strength_method",
  "ten_god_position",
  "shensha_rule",
  "shensha_position"
] as const);

export type BaziContentReviewCategory = (typeof BAZI_CONTENT_REVIEW_CATEGORY_ORDER)[number];
export type BaziContentReviewDecision = (typeof BAZI_CONTENT_REVIEW_QUEUE_PROFILE.allowedDecisions)[number];

export interface BaziContentReviewSourceRef {
  id: string;
  title: string;
  url: string;
  evidenceClass: "public_domain_classic" | "original_editorial";
  usage: string;
  locators: readonly string[];
}

export interface BaziContentReviewItem {
  reviewItemId: string;
  order: number;
  category: BaziContentReviewCategory;
  title: string;
  subjectId: string;
  question: string;
  candidateSummary: string;
  candidateDetails: readonly string[];
  sourceRefIds: readonly string[];
  existingReviewStatus: string;
  decision: "unresolved";
  decisionReason: null;
  revisionRequest: null;
  reviewer: null;
  reviewedAt: null;
  expertTruthClaimed: false;
  formalActivationAllowed: false;
  result: null;
}

export interface BaziContentReviewGroup {
  category: BaziContentReviewCategory;
  label: string;
  description: string;
  itemCount: number;
  unresolvedCount: number;
}

export interface BaziContentReviewQueue {
  profile: typeof BAZI_CONTENT_REVIEW_QUEUE_PROFILE;
  sources: readonly BaziContentReviewSourceRef[];
  groups: readonly BaziContentReviewGroup[];
  items: readonly BaziContentReviewItem[];
  counts: Readonly<{
    total: number;
    unresolved: number;
    approve: number;
    revise: number;
    reject: number;
  }>;
  knownBoundaries: readonly string[];
}

export interface BuildBaziContentReviewQueueInput {
  strengthQuestions?: readonly string[];
  tenGodPositionEditorial?: readonly TenGodPositionEditorialEntry[];
  shenshaRules?: readonly ShenshaRuleDefinition[];
  shenshaPositionEditorial?: readonly ShenshaPositionEditorialEntry[];
  sources?: readonly BaziContentReviewSourceRef[];
}

const PILLAR_LABELS = Object.freeze({
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱"
} as const);

const CATEGORY_META: Readonly<Record<BaziContentReviewCategory, Pick<BaziContentReviewGroup, "label" | "description">>> = Object.freeze({
  strength_method: Object.freeze({
    label: "旺衰方法",
    description: `复核重复计权、“${BAZI_STRENGTH_WEIGHT_SUMMARY.short}”候选权重、分档阈值与基础算法失效条件。`
  }),
  ten_god_position: Object.freeze({
    label: "十神落柱",
    description: "逐条复核 10 个十神在年、月、日、时四柱的 40 条原创现代中文候选。"
  }),
  shensha_rule: Object.freeze({
    label: "神煞取法",
    description: "复核 5 项神煞的基准、映射、原文定位与尚未启用的异法冲突槽位。"
  }),
  shensha_position: Object.freeze({
    label: "神煞落柱",
    description: "逐条复核 5 项神煞在四柱的 20 条位置议题候选，不产生个案吉凶。"
  })
});

function normalizeSourceRefs(): readonly BaziContentReviewSourceRef[] {
  const bazi = BAZI_INTERPRETATION_SOURCE_REFS.map((source) => Object.freeze({
    ...source,
    locators: Object.freeze([] as string[])
  }));
  const shensha = BAZI_SHENSHA_SOURCE_REFS.map((source) => Object.freeze({
    ...source,
    locators: Object.freeze([...source.locators])
  }));
  return Object.freeze([...bazi, ...shensha]);
}

export const BAZI_CONTENT_REVIEW_SOURCE_REFS = normalizeSourceRefs();

function copySource(source: BaziContentReviewSourceRef): BaziContentReviewSourceRef {
  return Object.freeze({
    id: source.id,
    title: source.title,
    url: source.url,
    evidenceClass: source.evidenceClass,
    usage: source.usage,
    locators: Object.freeze([...source.locators])
  });
}

function makeReviewItem(
  input: Omit<
    BaziContentReviewItem,
    | "order"
    | "decision"
    | "decisionReason"
    | "revisionRequest"
    | "reviewer"
    | "reviewedAt"
    | "expertTruthClaimed"
    | "formalActivationAllowed"
    | "result"
  >,
  order: number
): BaziContentReviewItem {
  return Object.freeze({
    ...input,
    order,
    candidateDetails: Object.freeze([...input.candidateDetails]),
    sourceRefIds: Object.freeze([...input.sourceRefIds]),
    decision: "unresolved" as const,
    decisionReason: null,
    revisionRequest: null,
    reviewer: null,
    reviewedAt: null,
    expertTruthClaimed: false as const,
    formalActivationAllowed: false as const,
    result: null
  });
}

function assertExactStrings(actual: readonly string[], expected: readonly string[], subject: string): void {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${subject} 与固定审稿目录不一致`);
  }
}

function validateSources(sources: readonly BaziContentReviewSourceRef[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const source of sources) {
    if (!source.id || !source.title || !source.url || !source.usage) {
      throw new Error("内容审稿来源缺少 ID、标题、链接或用途");
    }
    if (ids.has(source.id)) throw new Error(`内容审稿来源 ID 重复：${source.id}`);
    ids.add(source.id);
  }
  return ids;
}

function validateQueue(queue: BaziContentReviewQueue): void {
  if (queue.profile !== BAZI_CONTENT_REVIEW_QUEUE_PROFILE) {
    throw new Error("内容审稿清单规则档案不匹配");
  }
  if (queue.items.length !== queue.profile.expectedItemCount || queue.counts.total !== queue.items.length) {
    throw new Error(`内容审稿清单必须恰有 ${queue.profile.expectedItemCount} 项`);
  }
  const sourceIds = validateSources(queue.sources);
  const itemIds = new Set<string>();
  for (const [index, item] of queue.items.entries()) {
    if (item.order !== index + 1) throw new Error(`内容审稿项顺序不连续：${item.reviewItemId}`);
    if (itemIds.has(item.reviewItemId)) throw new Error(`内容审稿项 ID 重复：${item.reviewItemId}`);
    if (!item.title || !item.subjectId || !item.question || !item.candidateSummary) {
      throw new Error(`内容审稿项缺少可读内容：${item.reviewItemId}`);
    }
    if (!item.sourceRefIds.length || item.sourceRefIds.some((sourceId) => !sourceIds.has(sourceId))) {
      throw new Error(`内容审稿项来源无法解析：${item.reviewItemId}`);
    }
    if (item.decision !== "unresolved" || item.decisionReason !== null
      || item.revisionRequest !== null || item.reviewer !== null || item.reviewedAt !== null
      || item.expertTruthClaimed || item.formalActivationAllowed || item.result !== null) {
      throw new Error(`内容审稿项越过未裁决边界：${item.reviewItemId}`);
    }
    itemIds.add(item.reviewItemId);
  }
  const expectedCounts: Record<BaziContentReviewCategory, number> = {
    strength_method: 4,
    ten_god_position: 40,
    shensha_rule: 5,
    shensha_position: 20
  };
  for (const category of BAZI_CONTENT_REVIEW_CATEGORY_ORDER) {
    const count = queue.items.filter((item) => item.category === category).length;
    if (count !== expectedCounts[category]) throw new Error(`内容审稿分类 ${category} 必须恰有 ${expectedCounts[category]} 项`);
  }
  if (queue.counts.unresolved !== queue.items.length || queue.counts.approve !== 0
    || queue.counts.revise !== 0 || queue.counts.reject !== 0) {
    throw new Error("内容审稿清单当前只能包含未裁决项");
  }
}

export function buildBaziContentReviewQueue(
  input: BuildBaziContentReviewQueueInput = {}
): BaziContentReviewQueue {
  const strengthQuestions = input.strengthQuestions ?? BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS;
  const tenGodPositionEditorial = input.tenGodPositionEditorial ?? TEN_GOD_POSITION_EDITORIAL;
  const shenshaRules = input.shenshaRules ?? BAZI_SHENSHA_RULE_REGISTRY;
  const shenshaPositionEditorial = input.shenshaPositionEditorial ?? SHENSHA_POSITION_EDITORIAL;
  const sources = Object.freeze((input.sources ?? BAZI_CONTENT_REVIEW_SOURCE_REFS).map(copySource));

  assertExactStrings(strengthQuestions, BAZI_STRENGTH_EXPERT_REVIEW_QUESTIONS, "旺衰专家问题");
  if (tenGodPositionEditorial.length !== TEN_GOD_NAMES.length * TEN_GOD_PILLAR_POSITIONS.length) {
    throw new Error("十神落柱审稿目录必须恰有 40 项");
  }
  if (shenshaRules.length !== SHENSHA_EDITORIAL_RULE_IDS.length) {
    throw new Error("神煞取法审稿目录必须恰有 5 项");
  }
  if (shenshaPositionEditorial.length !== SHENSHA_EDITORIAL_RULE_IDS.length * SHENSHA_EDITORIAL_POSITIONS.length) {
    throw new Error("神煞落柱审稿目录必须恰有 20 项");
  }

  const items: BaziContentReviewItem[] = [];
  for (const [index, blueprint] of BAZI_STRENGTH_METHOD_REVIEW_ITEMS.entries()) {
    items.push(makeReviewItem({
      reviewItemId: `strength_method:${blueprint.id}`,
      category: "strength_method",
      title: blueprint.title,
      subjectId: blueprint.id,
      question: strengthQuestions[index],
      candidateSummary: blueprint.candidateSummary,
      candidateDetails: blueprint.candidateDetails,
      sourceRefIds: blueprint.sourceRefIds,
      existingReviewStatus: "candidate_pending_expert_review"
    }, items.length + 1));
  }

  for (const [index, candidate] of tenGodPositionEditorial.entries()) {
    const tenGod = TEN_GOD_NAMES[Math.floor(index / TEN_GOD_PILLAR_POSITIONS.length)];
    const position = TEN_GOD_PILLAR_POSITIONS[index % TEN_GOD_PILLAR_POSITIONS.length];
    if (candidate.tenGod !== tenGod || candidate.position !== position) {
      throw new Error(`十神落柱审稿目录顺序不一致：第 ${index + 1} 项`);
    }
    assertExactStrings(
      candidate.sourceRefIds,
      ["smt-ten-gods", "smt-position", "hakimi-editorial"],
      `十神落柱 ${candidate.tenGod}:${candidate.position} 来源`
    );
    if (candidate.reviewStatus !== "candidate_pending_expert_review" || candidate.evidenceClass !== "original_editorial") {
      throw new Error(`十神落柱审稿项越过候选边界：${candidate.tenGod}:${candidate.position}`);
    }
    items.push(makeReviewItem({
      reviewItemId: `ten_god_position:${candidate.tenGod}:${candidate.position}`,
      category: "ten_god_position",
      title: `${candidate.tenGod}落${PILLAR_LABELS[candidate.position]}`,
      subjectId: `${candidate.tenGod}:${candidate.position}`,
      question: `请复核“${candidate.tenGod}落${PILLAR_LABELS[candidate.position]}”的关注点、顺畅表达与受阻表达是否准确、清楚且没有越成事件断语。`,
      candidateSummary: candidate.focus,
      candidateDetails: [
        `顺畅候选：${candidate.flowing}`,
        `受阻候选：${candidate.strained}`,
        `边界：${candidate.doesNotEstablish}`
      ],
      sourceRefIds: candidate.sourceRefIds,
      existingReviewStatus: candidate.reviewStatus
    }, items.length + 1));
  }

  for (const [index, rule] of shenshaRules.entries()) {
    const expectedRuleId = SHENSHA_EDITORIAL_RULE_IDS[index];
    if (rule.id !== expectedRuleId) throw new Error(`神煞取法审稿目录顺序不一致：第 ${index + 1} 项`);
    if (rule.reviewStatus !== "source_transcribed_candidate" || rule.interpretationStatus !== "withheld"
      || !rule.conflicts.length || rule.conflicts.some((conflict) => (
        conflict.status !== "disabled_missing_approved_source_and_expert_review"
      ))) {
      throw new Error(`神煞取法审稿项越过候选边界：${rule.id}`);
    }
    items.push(makeReviewItem({
      reviewItemId: `shensha_rule:${rule.id}`,
      category: "shensha_rule",
      title: `${rule.name}取法`,
      subjectId: rule.id,
      question: `请复核${rule.name}当前以${rule.basisLabel}为基准的映射、原文定位，以及被关闭的异法冲突槽位是否处理得当。`,
      candidateSummary: rule.formulaSummary,
      candidateDetails: [
        `基准：${rule.basisLabel} → ${rule.targetField}`,
        `来源定位：${rule.sourceLocator}`,
        ...rule.conflicts.map((conflict) => `未启用异法：${conflict.basis} · ${conflict.note}`)
      ],
      sourceRefIds: rule.sourceRefIds,
      existingReviewStatus: rule.reviewStatus
    }, items.length + 1));
  }

  for (const [index, candidate] of shenshaPositionEditorial.entries()) {
    const ruleId = SHENSHA_EDITORIAL_RULE_IDS[Math.floor(index / SHENSHA_EDITORIAL_POSITIONS.length)];
    const position = SHENSHA_EDITORIAL_POSITIONS[index % SHENSHA_EDITORIAL_POSITIONS.length];
    if (candidate.ruleId !== ruleId || candidate.position !== position) {
      throw new Error(`神煞落柱审稿目录顺序不一致：第 ${index + 1} 项`);
    }
    if (candidate.reviewStatus !== "candidate_pending_expert_review" || candidate.result !== null
      || candidate.expertTruthClaimed || candidate.directOutcomeAllowed || candidate.scoringAllowed) {
      throw new Error(`神煞落柱审稿项越过候选边界：${candidate.contentId}`);
    }
    items.push(makeReviewItem({
      reviewItemId: `shensha_position:${candidate.contentId}`,
      category: "shensha_position",
      title: `${candidate.name}落${candidate.positionLabel}`,
      subjectId: candidate.contentId,
      question: candidate.reviewPrompt,
      candidateSummary: candidate.directSummary,
      candidateDetails: [
        `建设性表达：${candidate.constructiveExpression}`,
        `需要复核：${candidate.tensionToReview}`,
        `边界：${candidate.doesNotEstablish}`
      ],
      sourceRefIds: candidate.sourceRefIds,
      existingReviewStatus: candidate.reviewStatus
    }, items.length + 1));
  }

  const groups = Object.freeze(BAZI_CONTENT_REVIEW_CATEGORY_ORDER.map((category) => {
    const itemCount = items.filter((item) => item.category === category).length;
    return Object.freeze({
      category,
      ...CATEGORY_META[category],
      itemCount,
      unresolvedCount: itemCount
    });
  }));
  const queue: BaziContentReviewQueue = Object.freeze({
    profile: BAZI_CONTENT_REVIEW_QUEUE_PROFILE,
    sources,
    groups,
    items: Object.freeze(items),
    counts: Object.freeze({
      total: items.length,
      unresolved: items.length,
      approve: 0,
      revise: 0,
      reject: 0
    }),
    knownBoundaries: Object.freeze([
      "这是一份只读审稿目录；导出 JSON 不会写回命盘、修订、数据库或 mutation epoch。",
      "批准、退修、驳回只是未来可记录的状态；当前 69 项全部未裁决，且没有 reviewer 或 reviewedAt。",
      "工程完整性测试只能证明目录、来源和空值门稳定，不能替代命理专家逐条裁决。",
      "任何未来裁决都需要可归属的审稿人、时间、理由与版本；本清单不自动激活正式规则。"
    ])
  });
  validateQueue(queue);
  return queue;
}

export const BAZI_CONTENT_REVIEW_QUEUE = buildBaziContentReviewQueue();

export function serializeBaziContentReviewQueue(
  queue: BaziContentReviewQueue = BAZI_CONTENT_REVIEW_QUEUE
): string {
  validateQueue(queue);
  return `${JSON.stringify(queue, null, 2)}\n`;
}
