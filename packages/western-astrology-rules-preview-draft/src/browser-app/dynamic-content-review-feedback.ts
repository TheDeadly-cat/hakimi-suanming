import {
  WESTERN_CONTENT_LAYER_VERSION,
  type WesternAspectContentCandidate,
  type WesternBodySynthesisCandidate,
  type WesternContentProjection,
  type WesternContentSource,
  type WesternDispositorCandidate,
  type WesternDistributionSummary,
  type WesternFirstReadCandidate,
  type WesternHouseRulerCandidate
} from "./content-layer.ts";

export const WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE = Object.freeze({
  formatVersion: "hakimi.western.dynamic_content_review_feedback/0.1.0",
  templateVersion: "0.7.0",
  reviewScope: "current_projection_dynamic_candidates_only" as const,
  privacyScope: "direct_identifiers_removed_derived_chart_facts" as const,
  directIdentifiersIncluded: false as const,
  inputFieldsIncluded: false as const,
  derivedChartFactsIncluded: true as const,
  externalSharingRequiresUserDecision: true as const,
  primitiveCatalogReviewApplied: false as const,
  workflowMode: "human_attributed_read_only_preflight" as const,
  identityPolicy: "self_declared_not_verified" as const,
  signaturePolicy: "none" as const,
  integrationPolicy: "manual_code_review_only" as const,
  mutationPolicy: "no_rule_artifact_or_storage_write" as const,
  allowedDecisions: Object.freeze(["unresolved", "approve", "revise", "reject"] as const),
  allowedOrientationProposals: Object.freeze([
    "unresolved",
    "potentially_supportive",
    "potentially_challenging",
    "mixed_conditional",
    "not_assessable"
  ] as const),
  expertTruthClaimed: false as const,
  scientificValidityClaimed: false as const,
  formalActivationAllowed: false as const,
  autoIntegrationAllowed: false as const
});

export const WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_MAX_BYTES = 2 * 1024 * 1024;

export type WesternDynamicContentReviewDecision =
  (typeof WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedDecisions)[number];
export type WesternDynamicContentReviewOrientationProposal =
  (typeof WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedOrientationProposals)[number];
export type WesternDynamicContentReviewCategory =
  | "first_read"
  | "body_synthesis"
  | "chart_ruler"
  | "dispositor_chain"
  | "angle_proximity"
  | "angle"
  | "distribution"
  | "house_ruler"
  | "placement"
  | "aspect";

export interface WesternDynamicContentReviewSource {
  sourceId: string;
  title: string;
  sourceUrl: string;
  publisher: string;
  role: WesternContentSource["role"];
  accessedAt: string;
  usageBoundary: string;
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
}

export interface WesternDynamicContentReviewProjectionBinding {
  contentLayerVersion: typeof WESTERN_CONTENT_LAYER_VERSION;
  projectionOutcome: WesternContentProjection["outcome"];
  framework: WesternContentProjection["framework"];
  factsSha256: string;
  projectionSha256: string;
  orderedCandidateIdsSha256: string;
  sourceRegistrySha256: string;
  itemCount: number;
  sourceCount: number;
}

export interface WesternDynamicContentReviewReviewer {
  reviewerId: string;
  displayName: string;
  affiliation: string;
  expertiseStatement: string;
  identityEvidenceReference: string;
  identityVerified: false;
}

export interface WesternDynamicContentReviewSession {
  reviewedAt: string;
  methodology: string;
  traditionScope: string;
  generalNotes: string;
}

export interface WesternDynamicContentReviewFeedbackItem {
  candidateId: string;
  order: number;
  category: WesternDynamicContentReviewCategory;
  title: string;
  factSummary: string;
  directStatement: string;
  resourceStatement: string;
  tensionStatement: string;
  scopeNote: string;
  contextLines: readonly string[];
  reviewQuestions: readonly string[];
  sourceIds: readonly string[];
  candidateSnapshotSha256: string;
  decision: WesternDynamicContentReviewDecision;
  orientationProposal: WesternDynamicContentReviewOrientationProposal;
  selectedTradition: string;
  decisionReason: string;
  applicabilityConditions: string;
  counterexamples: string;
  revisionRequest: string;
  additionalSourceUrls: readonly string[];
  expertTruthClaimed: false;
  scientificValidityClaimed: false;
  formalActivationAllowed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface WesternDynamicContentReviewCounts {
  total: number;
  unresolved: number;
  approve: number;
  revise: number;
  reject: number;
}

export interface WesternDynamicContentReviewOrientationCounts {
  total: number;
  unresolved: number;
  potentiallySupportive: number;
  potentiallyChallenging: number;
  mixedConditional: number;
  notAssessable: number;
}

export interface WesternDynamicContentReviewBoundary {
  directIdentifiersIncluded: false;
  inputFieldsIncluded: false;
  derivedChartFactsIncluded: true;
  externalSharingRequiresUserDecision: true;
  identityVerified: false;
  digitalSignatureVerified: false;
  scientificValidityEstablished: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  networkTransmissionPerformed: false;
  ruleArtifactOrStorageMutationPerformed: false;
  primitiveCatalogReviewApplied: false;
  deterministicOutcomeEstablished: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface WesternDynamicContentReviewFeedbackEnvelope {
  profile: typeof WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE;
  projectionBinding: WesternDynamicContentReviewProjectionBinding;
  sourceRegistry: readonly WesternDynamicContentReviewSource[];
  reviewer: WesternDynamicContentReviewReviewer;
  reviewSession: WesternDynamicContentReviewSession;
  items: readonly WesternDynamicContentReviewFeedbackItem[];
  declaredCounts: WesternDynamicContentReviewCounts;
  declaredOrientationProposalCounts: WesternDynamicContentReviewOrientationCounts;
  boundary: WesternDynamicContentReviewBoundary;
}

export interface WesternDynamicContentReviewFeedbackPreflight {
  envelope: WesternDynamicContentReviewFeedbackEnvelope;
  counts: WesternDynamicContentReviewCounts;
  orientationProposalCounts: WesternDynamicContentReviewOrientationCounts;
  resolvedCount: number;
  unresolvedCount: number;
  allItemsResolved: boolean;
  reviewerAttributionComplete: boolean;
  currentProjectionBound: true;
  identityVerified: false;
  digitalSignatureVerified: false;
  scientificValidityEstablished: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  networkTransmissionPerformed: false;
  ruleArtifactOrStorageMutationPerformed: false;
  primitiveCatalogReviewApplied: false;
  deterministicOutcomeEstablished: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

interface DynamicCandidateSeed {
  readonly candidateId: string;
  readonly category: WesternDynamicContentReviewCategory;
  readonly title: string;
  readonly factSummary: string;
  readonly directStatement: string;
  readonly resourceStatement: string;
  readonly tensionStatement: string;
  readonly scopeNote: string;
  readonly contextLines: readonly string[];
  readonly reviewQuestions: readonly string[];
  readonly sourceIds: readonly string[];
  readonly snapshot: unknown;
}

const ROOT_KEYS = Object.freeze([
  "profile", "projectionBinding", "sourceRegistry", "reviewer", "reviewSession", "items",
  "declaredCounts", "declaredOrientationProposalCounts", "boundary"
] as const);
const PROFILE_KEYS = Object.freeze(Object.keys(
  WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE
));
const BINDING_KEYS = Object.freeze([
  "contentLayerVersion", "projectionOutcome", "framework", "factsSha256", "projectionSha256",
  "orderedCandidateIdsSha256", "sourceRegistrySha256", "itemCount", "sourceCount"
] as const);
const SOURCE_KEYS = Object.freeze([
  "sourceId", "title", "sourceUrl", "publisher", "role", "accessedAt", "usageBoundary",
  "expertTruthClaimed", "scientificValidityClaimed"
] as const);
const REVIEWER_KEYS = Object.freeze([
  "reviewerId", "displayName", "affiliation", "expertiseStatement",
  "identityEvidenceReference", "identityVerified"
] as const);
const SESSION_KEYS = Object.freeze([
  "reviewedAt", "methodology", "traditionScope", "generalNotes"
] as const);
const ITEM_KEYS = Object.freeze([
  "candidateId", "order", "category", "title", "factSummary", "directStatement",
  "resourceStatement", "tensionStatement", "scopeNote", "contextLines", "reviewQuestions",
  "sourceIds", "candidateSnapshotSha256", "decision", "orientationProposal",
  "selectedTradition", "decisionReason", "applicabilityConditions", "counterexamples",
  "revisionRequest", "additionalSourceUrls", "expertTruthClaimed", "scientificValidityClaimed",
  "formalActivationAllowed", "goodBadOrientation", "eventOutcome", "result"
] as const);
const COUNT_KEYS = Object.freeze(["total", "unresolved", "approve", "revise", "reject"] as const);
const ORIENTATION_COUNT_KEYS = Object.freeze([
  "total", "unresolved", "potentiallySupportive", "potentiallyChallenging",
  "mixedConditional", "notAssessable"
] as const);
const BOUNDARY_KEYS = Object.freeze([
  "directIdentifiersIncluded", "inputFieldsIncluded", "derivedChartFactsIncluded",
  "externalSharingRequiresUserDecision", "identityVerified", "digitalSignatureVerified",
  "scientificValidityEstablished", "eligibleForFormalActivation", "autoIntegrationAllowed",
  "networkTransmissionPerformed", "ruleArtifactOrStorageMutationPerformed",
  "primitiveCatalogReviewApplied", "deterministicOutcomeEstablished", "goodBadOrientation",
  "eventOutcome", "result"
] as const);

const DECISIONS = new Set<string>(
  WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedDecisions
);
const ORIENTATIONS = new Set<string>(
  WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedOrientationProposals
);
const CATEGORIES = new Set<string>([
  "first_read", "body_synthesis", "chart_ruler", "dispositor_chain", "angle_proximity",
  "angle", "distribution", "house_ruler", "placement", "aspect"
]);
const SOURCE_ROLES = new Set<string>([
  "practitioner_reference", "interpretation_boundary", "scientific_boundary"
]);

function assertRecord(value: unknown, subject: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${subject} 必须是对象`);
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  subject: string
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${subject} 字段集合不符合当前契约`);
  }
}

function stringValue(value: unknown, subject: string, maxLength = 20_000): string {
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error(`${subject} 必须是长度不超过 ${maxLength} 的字符串`);
  }
  return value;
}

function integerValue(value: unknown, subject: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${subject} 必须是大于等于 ${minimum} 的安全整数`);
  }
  return value as number;
}

function falseValue(value: unknown, subject: string): false {
  if (value !== false) throw new Error(`${subject} 必须保持 false`);
  return false;
}

function trueValue(value: unknown, subject: string): true {
  if (value !== true) throw new Error(`${subject} 必须保持 true`);
  return true;
}

function nullValue(value: unknown, subject: string): null {
  if (value !== null) throw new Error(`${subject} 必须保持 null`);
  return null;
}

function digestValue(value: unknown, subject: string): string {
  const digest = stringValue(value, subject, 64);
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new Error(`${subject} 必须是小写 SHA-256`);
  return digest;
}

function stringArray(
  value: unknown,
  subject: string,
  options: Readonly<{ maxItems?: number; httpsOnly?: boolean }> = {}
): readonly string[] {
  if (!Array.isArray(value) || value.length > (options.maxItems ?? 200)) {
    throw new Error(`${subject} 必须是受限字符串数组`);
  }
  const result = value.map((entry, index) => stringValue(entry, `${subject}[${index}]`, 4_000));
  if (options.httpsOnly && result.some((entry) => {
    try {
      return new URL(entry).protocol !== "https:";
    } catch {
      return true;
    }
  })) {
    throw new Error(`${subject} 只接受有效 HTTPS URL`);
  }
  return Object.freeze(result);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validReviewedAt(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

async function sha256Text(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("当前运行环境不支持 SHA-256 内容绑定");
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(value)
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function usageBoundary(role: WesternContentSource["role"]): string {
  switch (role) {
    case "practitioner_reference":
      return "从业资料仅提供术语与解释候选，不证明科学有效性、专家共识或个人事件结果。";
    case "interpretation_boundary":
      return "仅用于约束解释方法与限度，不验证任何具体候选为真。";
    case "scientific_boundary":
      return "仅用于提示科学证据边界，不支持任何占星解释候选。";
  }
}

function createSourceRegistry(
  projection: WesternContentProjection
): readonly WesternDynamicContentReviewSource[] {
  const sources = projection.sources.map((source) => Object.freeze({
    sourceId: source.sourceId,
    title: source.title,
    sourceUrl: source.url,
    publisher: source.publisher,
    role: source.role,
    accessedAt: source.accessedAt,
    usageBoundary: usageBoundary(source.role),
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const
  }));
  if (sources.length === 0
    || new Set(sources.map((source) => source.sourceId)).size !== sources.length) {
    throw new Error("当前西洋动态候选必须绑定非空且不重复的来源账");
  }
  return Object.freeze(sources);
}

function aspectContext(candidate: WesternAspectContentCandidate): readonly string[] {
  return Object.freeze([
    `天体：${candidate.bodyA} — ${candidate.bodyB}`,
    `相位：${candidate.aspectLabel}（${candidate.exactAngleDeg}°）`,
    `容许度事实：${candidate.orbDeg}°；运动状态：${candidate.motion}`
  ]);
}

function dispositorContext(candidate: WesternDispositorCandidate): readonly string[] {
  return Object.freeze([
    `起点：${candidate.startBodyLabel}`,
    `传统守护链：${candidate.traditional.statement}`,
    `现代守护链：${candidate.modern.statement}`,
    `两套链一致：${candidate.profilesEqual ? "是" : "否"}`
  ]);
}

function bodySynthesisContext(candidate: WesternBodySynthesisCandidate): readonly string[] {
  return Object.freeze([
    candidate.readingOrderStatement,
    `落位：${candidate.placement.factSummary}`,
    `相关相位：${candidate.aspectLinks.length === 0
      ? "当前规则未检出"
      : candidate.aspectLinks.map((link) => link.candidate.factSummary).join("；")}`,
    `传统定位星链：${candidate.dispositor.traditional.statement}`,
    `现代定位星链：${candidate.dispositor.modern.statement}`,
    `最近轴点：${candidate.nearestAngle === null
      ? "不可用"
      : `${candidate.nearestAngle.angleLabel}，距离 ${candidate.nearestAngle.separationDeg}°`}`,
    `命主星口径：${candidate.chartRulerProfiles.length === 0
      ? "无"
      : candidate.chartRulerProfiles.join("、")}`,
    `慢行星宫位优先：${candidate.slowBodyHouseFirst ? "是" : "否"}`
  ]);
}

function firstReadContext(candidate: WesternFirstReadCandidate): readonly string[] {
  return Object.freeze([
    candidate.readingOrderStatement,
    ...candidate.entries.map((entry) => (
      `${entry.sequence}. ${entry.label}（${entry.availability}）：${entry.factSummary}；${entry.directStatement}`
    )),
    `可用项：${candidate.availableCount}；缺失项：${candidate.missingKeys.join("、") || "无"}`
  ]);
}

function distributionContext(candidate: WesternDistributionSummary): readonly string[] {
  return Object.freeze(candidate.scopes.flatMap((scope) => [
    `${scope.label} · 元素：${scope.elements.map((bucket) => `${bucket.label}${bucket.count}`).join("、")}`,
    `${scope.label} · 模式：${scope.modalities.map((bucket) => `${bucket.label}${bucket.count}`).join("、")}`
  ]));
}

function houseRulerContext(candidate: WesternHouseRulerCandidate): readonly string[] {
  return Object.freeze([
    `宫头：${candidate.houseLabel} · ${candidate.cuspSignLabel} ${candidate.degreeWithinSign}°`,
    `传统守护：${candidate.traditional.statement}`,
    `现代守护：${candidate.modern.statement}`
  ]);
}

function buildCandidateSeeds(projection: WesternContentProjection): readonly DynamicCandidateSeed[] {
  const seeds: DynamicCandidateSeed[] = [];
  const push = (seed: DynamicCandidateSeed): void => { seeds.push(Object.freeze(seed)); };

  push({
    candidateId: projection.firstRead.candidateId,
    category: "first_read",
    title: "日月上升与命主星 · 四步首读",
    factSummary: projection.firstRead.factSummary,
    directStatement: projection.firstRead.directStatement,
    resourceStatement: projection.firstRead.readingOrderStatement,
    tensionStatement: "缺失项保持关闭；固定顺序不是主导力量排名。",
    scopeNote: projection.firstRead.scopeNote,
    contextLines: firstReadContext(projection.firstRead),
    reviewQuestions: projection.firstRead.review.questions,
    sourceIds: projection.firstRead.sourceIds,
    snapshot: projection.firstRead
  });

  for (const candidate of projection.bodySyntheses) push({
    candidateId: candidate.candidateId,
    category: "body_synthesis",
    title: `${candidate.bodyLabel} · 逐星综合阅读包`,
    factSummary: candidate.factSummary,
    directStatement: candidate.directStatement,
    resourceStatement: candidate.readingOrderStatement,
    tensionStatement: "出现矛盾时保留矛盾，不自动形成主导、强弱或吉凶排序。",
    scopeNote: candidate.scopeNote,
    contextLines: bodySynthesisContext(candidate),
    reviewQuestions: candidate.review.questions,
    sourceIds: candidate.sourceIds,
    snapshot: candidate
  });

  if (projection.chartRuler !== null) push({
    candidateId: projection.chartRuler.candidateId,
    category: "chart_ruler",
    title: `命主星 · 上升${projection.chartRuler.ascendantSignLabel}`,
    factSummary: projection.chartRuler.factSummary,
    directStatement: projection.chartRuler.directStatement,
    resourceStatement: projection.chartRuler.traditional.statement,
    tensionStatement: projection.chartRuler.modern.statement,
    scopeNote: projection.chartRuler.scopeNote,
    contextLines: Object.freeze([
      `传统守护：${projection.chartRuler.traditional.statement}`,
      `现代守护：${projection.chartRuler.modern.statement}`
    ]),
    reviewQuestions: projection.chartRuler.review.questions,
    sourceIds: projection.chartRuler.sourceIds,
    snapshot: projection.chartRuler
  });

  for (const candidate of projection.dispositorChains) push({
    candidateId: candidate.candidateId,
    category: "dispositor_chain",
    title: `${candidate.startBodyLabel} · 定位星链`,
    factSummary: candidate.factSummary,
    directStatement: candidate.directStatement,
    resourceStatement: candidate.traditional.statement,
    tensionStatement: candidate.modern.statement,
    scopeNote: candidate.scopeNote,
    contextLines: dispositorContext(candidate),
    reviewQuestions: candidate.review.questions,
    sourceIds: candidate.sourceIds,
    snapshot: candidate
  });

  if (projection.angleProximity !== null) push({
    candidateId: projection.angleProximity.candidateId,
    category: "angle_proximity",
    title: "四轴距离账 · 最近轴点",
    factSummary: projection.angleProximity.factSummary,
    directStatement: projection.angleProximity.directStatement,
    resourceStatement: projection.angleProximity.useStatement,
    tensionStatement: projection.angleProximity.limitStatement,
    scopeNote: projection.angleProximity.scopeNote,
    contextLines: Object.freeze(projection.angleProximity.entries.map((entry) => (
      `${entry.rank}. ${entry.bodyLabel} → ${entry.angleLabel}：${entry.separationDeg}°；${entry.houseLabel ?? "无宫位"}`
    ))),
    reviewQuestions: projection.angleProximity.review.questions,
    sourceIds: projection.angleProximity.sourceIds,
    snapshot: projection.angleProximity
  });

  for (const candidate of projection.angles) push({
    candidateId: candidate.candidateId,
    category: "angle",
    title: `${candidate.angleLabel}（${candidate.abbreviation}）`,
    factSummary: candidate.factSummary,
    directStatement: candidate.directStatement,
    resourceStatement: candidate.resourceStatement,
    tensionStatement: candidate.tensionStatement,
    scopeNote: candidate.scopeNote,
    contextLines: Object.freeze([
      `星座：${candidate.signLabel} ${candidate.degreeWithinSign}°`,
      `黄经：${candidate.eclipticLongitudeDeg}°；黄道位置：${candidate.zodiacLongitudeDeg}°`
    ]),
    reviewQuestions: candidate.review.questions,
    sourceIds: candidate.sourceIds,
    snapshot: candidate
  });

  push({
    candidateId: projection.distribution.candidateId,
    category: "distribution",
    title: "元素与模式 · 结构分布",
    factSummary: projection.distribution.factSummary,
    directStatement: projection.distribution.directStatement,
    resourceStatement: projection.distribution.useStatement,
    tensionStatement: projection.distribution.limitStatement,
    scopeNote: projection.distribution.scopeNote,
    contextLines: distributionContext(projection.distribution),
    reviewQuestions: projection.distribution.review.questions,
    sourceIds: projection.distribution.sourceIds,
    snapshot: projection.distribution
  });

  for (const candidate of projection.houseRulers) push({
    candidateId: candidate.candidateId,
    category: "house_ruler",
    title: `${candidate.houseLabel} · 宫主星路径`,
    factSummary: candidate.factSummary,
    directStatement: candidate.directStatement,
    resourceStatement: candidate.traditional.statement,
    tensionStatement: candidate.modern.statement,
    scopeNote: candidate.scopeNote,
    contextLines: houseRulerContext(candidate),
    reviewQuestions: candidate.review.questions,
    sourceIds: candidate.sourceIds,
    snapshot: candidate
  });

  for (const candidate of projection.placements) push({
    candidateId: candidate.candidateId,
    category: "placement",
    title: `${candidate.bodyLabel} · ${candidate.signLabel}${candidate.houseLabel ? ` · ${candidate.houseLabel}` : ""}`,
    factSummary: candidate.factSummary,
    directStatement: candidate.directStatement,
    resourceStatement: candidate.resourceStatement,
    tensionStatement: candidate.tensionStatement,
    scopeNote: candidate.scopeNote,
    contextLines: Object.freeze([
      `天体：${candidate.bodyLabel}；星座：${candidate.signLabel} ${candidate.degreeWithinSign}°`,
      `宫位：${candidate.houseLabel ?? "未请求"}；逆行事实：${candidate.retrograde ? "是" : "否"}`,
      `黄经：${candidate.longitudeDeg}°`
    ]),
    reviewQuestions: candidate.review.questions,
    sourceIds: candidate.sourceIds,
    snapshot: candidate
  });

  for (const candidate of projection.aspects) push({
    candidateId: candidate.candidateId,
    category: "aspect",
    title: `${candidate.bodyA} — ${candidate.bodyB} · ${candidate.aspectLabel}`,
    factSummary: candidate.factSummary,
    directStatement: candidate.directStatement,
    resourceStatement: candidate.resourceStatement,
    tensionStatement: candidate.tensionStatement,
    scopeNote: "相位候选必须与落位、宫位、守护链和现实语境合参。",
    contextLines: aspectContext(candidate),
    reviewQuestions: candidate.review.questions,
    sourceIds: candidate.sourceIds,
    snapshot: candidate
  });

  if (seeds.length === 0 || new Set(seeds.map((seed) => seed.candidateId)).size !== seeds.length) {
    throw new Error("当前西洋动态候选必须非空且 candidateId 不得重复");
  }
  const sourceIds = new Set(projection.sources.map((source) => source.sourceId));
  if (seeds.some((seed) => seed.sourceIds.some((sourceId) => !sourceIds.has(sourceId)))) {
    throw new Error("当前西洋动态候选引用了来源账之外的 sourceId");
  }
  return Object.freeze(seeds);
}

export function westernDynamicContentReviewCandidateCount(
  projection: WesternContentProjection
): number {
  return buildCandidateSeeds(projection).length;
}

async function createItems(
  projection: WesternContentProjection
): Promise<readonly WesternDynamicContentReviewFeedbackItem[]> {
  const seeds = buildCandidateSeeds(projection);
  return Object.freeze(await Promise.all(seeds.map(async (seed, index) => Object.freeze({
    candidateId: seed.candidateId,
    order: index + 1,
    category: seed.category,
    title: seed.title,
    factSummary: seed.factSummary,
    directStatement: seed.directStatement,
    resourceStatement: seed.resourceStatement,
    tensionStatement: seed.tensionStatement,
    scopeNote: seed.scopeNote,
    contextLines: Object.freeze([...seed.contextLines]),
    reviewQuestions: Object.freeze([...seed.reviewQuestions]),
    sourceIds: Object.freeze([...seed.sourceIds]),
    candidateSnapshotSha256: await sha256Text(`${JSON.stringify(seed.snapshot)}\n`),
    decision: "unresolved" as const,
    orientationProposal: "unresolved" as const,
    selectedTradition: "",
    decisionReason: "",
    applicabilityConditions: "",
    counterexamples: "",
    revisionRequest: "",
    additionalSourceUrls: Object.freeze([] as string[]),
    expertTruthClaimed: false as const,
    scientificValidityClaimed: false as const,
    formalActivationAllowed: false as const,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  }))));
}

async function createProjectionBinding(
  projection: WesternContentProjection,
  items: readonly WesternDynamicContentReviewFeedbackItem[],
  sourceRegistry: readonly WesternDynamicContentReviewSource[]
): Promise<WesternDynamicContentReviewProjectionBinding> {
  return Object.freeze({
    contentLayerVersion: WESTERN_CONTENT_LAYER_VERSION,
    projectionOutcome: projection.outcome,
    framework: projection.framework,
    factsSha256: projection.factsSha256,
    projectionSha256: await sha256Text(`${JSON.stringify(projection)}\n`),
    orderedCandidateIdsSha256: await sha256Text(
      `${items.map((item) => item.candidateId).join("\n")}\n`
    ),
    sourceRegistrySha256: await sha256Text(`${JSON.stringify(sourceRegistry)}\n`),
    itemCount: items.length,
    sourceCount: sourceRegistry.length
  });
}

function makeCounts(
  items: readonly WesternDynamicContentReviewFeedbackItem[]
): WesternDynamicContentReviewCounts {
  const mutable = { total: items.length, unresolved: 0, approve: 0, revise: 0, reject: 0 };
  for (const item of items) mutable[item.decision] += 1;
  return Object.freeze(mutable);
}

function makeOrientationCounts(
  items: readonly WesternDynamicContentReviewFeedbackItem[]
): WesternDynamicContentReviewOrientationCounts {
  const mutable = {
    total: items.length, unresolved: 0, potentiallySupportive: 0,
    potentiallyChallenging: 0, mixedConditional: 0, notAssessable: 0
  };
  for (const item of items) {
    switch (item.orientationProposal) {
      case "unresolved": mutable.unresolved += 1; break;
      case "potentially_supportive": mutable.potentiallySupportive += 1; break;
      case "potentially_challenging": mutable.potentiallyChallenging += 1; break;
      case "mixed_conditional": mutable.mixedConditional += 1; break;
      case "not_assessable": mutable.notAssessable += 1; break;
    }
  }
  return Object.freeze(mutable);
}

function freezeEnvelope(
  envelope: WesternDynamicContentReviewFeedbackEnvelope
): WesternDynamicContentReviewFeedbackEnvelope {
  return Object.freeze({
    profile: WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE,
    projectionBinding: Object.freeze({ ...envelope.projectionBinding }),
    sourceRegistry: Object.freeze(envelope.sourceRegistry.map((source) => Object.freeze({ ...source }))),
    reviewer: Object.freeze({ ...envelope.reviewer }),
    reviewSession: Object.freeze({ ...envelope.reviewSession }),
    items: Object.freeze(envelope.items.map((item) => Object.freeze({
      ...item,
      contextLines: Object.freeze([...item.contextLines]),
      reviewQuestions: Object.freeze([...item.reviewQuestions]),
      sourceIds: Object.freeze([...item.sourceIds]),
      additionalSourceUrls: Object.freeze([...item.additionalSourceUrls])
    }))),
    declaredCounts: Object.freeze({ ...envelope.declaredCounts }),
    declaredOrientationProposalCounts:
      Object.freeze({ ...envelope.declaredOrientationProposalCounts }),
    boundary: Object.freeze({ ...envelope.boundary })
  });
}

export async function createWesternDynamicContentReviewFeedbackTemplate(
  projection: WesternContentProjection
): Promise<WesternDynamicContentReviewFeedbackEnvelope> {
  if (projection.projectionVersion !== WESTERN_CONTENT_LAYER_VERSION
    || projection.outcome !== "candidate_content_built"
    || projection.boundary.expertTruthClaimed !== false
    || projection.boundary.scientificValidityClaimed !== false
    || !/^[a-f0-9]{64}$/u.test(projection.factsSha256)) {
    throw new Error("动态审稿模板只接受当前失败关闭边界内的西洋内容投影");
  }
  const items = await createItems(projection);
  const sourceRegistry = createSourceRegistry(projection);
  return freezeEnvelope({
    profile: WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE,
    projectionBinding: await createProjectionBinding(projection, items, sourceRegistry),
    sourceRegistry,
    reviewer: Object.freeze({
      reviewerId: "", displayName: "", affiliation: "", expertiseStatement: "",
      identityEvidenceReference: "", identityVerified: false
    }),
    reviewSession: Object.freeze({
      reviewedAt: "", methodology: "", traditionScope: "", generalNotes: ""
    }),
    items,
    declaredCounts: makeCounts(items),
    declaredOrientationProposalCounts: makeOrientationCounts(items),
    boundary: Object.freeze({
      directIdentifiersIncluded: false,
      inputFieldsIncluded: false,
      derivedChartFactsIncluded: true,
      externalSharingRequiresUserDecision: true,
      identityVerified: false,
      digitalSignatureVerified: false,
      scientificValidityEstablished: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      networkTransmissionPerformed: false,
      ruleArtifactOrStorageMutationPerformed: false,
      primitiveCatalogReviewApplied: false,
      deterministicOutcomeEstablished: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    })
  });
}

export function serializeWesternDynamicContentReviewFeedbackTemplate(
  template: WesternDynamicContentReviewFeedbackEnvelope
): string {
  return `${JSON.stringify(template, null, 2)}\n`;
}

export function westernDynamicContentReviewFeedbackFilename(): string {
  return "hakimi-western-current-chart-review-v007.json";
}

function parseProfile(value: unknown): typeof WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE {
  assertRecord(value, "profile");
  assertExactKeys(value, PROFILE_KEYS, "profile");
  for (const key of PROFILE_KEYS) {
    if (JSON.stringify(value[key])
      !== JSON.stringify(WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE[
        key as keyof typeof WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE
      ])) {
      throw new Error(`动态审稿 profile.${key} 与当前 v0.7 契约不一致`);
    }
  }
  return WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_PROFILE;
}

function parseBinding(value: unknown): WesternDynamicContentReviewProjectionBinding {
  assertRecord(value, "projectionBinding");
  assertExactKeys(value, BINDING_KEYS, "projectionBinding");
  const contentLayerVersion = stringValue(value.contentLayerVersion, "projectionBinding.contentLayerVersion", 200);
  const projectionOutcome = stringValue(value.projectionOutcome, "projectionBinding.projectionOutcome", 100);
  const framework = stringValue(value.framework, "projectionBinding.framework", 200);
  if (contentLayerVersion !== WESTERN_CONTENT_LAYER_VERSION
    || projectionOutcome !== "candidate_content_built"
    || framework !== "modern_western_astrology_source_bound_candidate") {
    throw new Error("projectionBinding 的版本、结果或框架不受支持");
  }
  return Object.freeze({
    contentLayerVersion,
    projectionOutcome,
    framework,
    factsSha256: digestValue(value.factsSha256, "projectionBinding.factsSha256"),
    projectionSha256: digestValue(value.projectionSha256, "projectionBinding.projectionSha256"),
    orderedCandidateIdsSha256: digestValue(
      value.orderedCandidateIdsSha256, "projectionBinding.orderedCandidateIdsSha256"
    ),
    sourceRegistrySha256: digestValue(
      value.sourceRegistrySha256, "projectionBinding.sourceRegistrySha256"
    ),
    itemCount: integerValue(value.itemCount, "projectionBinding.itemCount", 1),
    sourceCount: integerValue(value.sourceCount, "projectionBinding.sourceCount", 1)
  });
}

function parseSource(value: unknown, index: number): WesternDynamicContentReviewSource {
  const subject = `sourceRegistry[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, SOURCE_KEYS, subject);
  const role = stringValue(value.role, `${subject}.role`, 100);
  if (!SOURCE_ROLES.has(role)) throw new Error(`${subject}.role 不受支持`);
  return Object.freeze({
    sourceId: stringValue(value.sourceId, `${subject}.sourceId`, 300),
    title: stringValue(value.title, `${subject}.title`, 1_000),
    sourceUrl: stringValue(value.sourceUrl, `${subject}.sourceUrl`, 4_000),
    publisher: stringValue(value.publisher, `${subject}.publisher`, 1_000),
    role: role as WesternContentSource["role"],
    accessedAt: stringValue(value.accessedAt, `${subject}.accessedAt`, 100),
    usageBoundary: stringValue(value.usageBoundary, `${subject}.usageBoundary`, 2_000),
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`),
    scientificValidityClaimed: falseValue(
      value.scientificValidityClaimed, `${subject}.scientificValidityClaimed`
    )
  });
}

function parseReviewer(value: unknown): WesternDynamicContentReviewReviewer {
  assertRecord(value, "reviewer");
  assertExactKeys(value, REVIEWER_KEYS, "reviewer");
  return Object.freeze({
    reviewerId: stringValue(value.reviewerId, "reviewer.reviewerId", 300),
    displayName: stringValue(value.displayName, "reviewer.displayName", 500),
    affiliation: stringValue(value.affiliation, "reviewer.affiliation", 1_000),
    expertiseStatement: stringValue(value.expertiseStatement, "reviewer.expertiseStatement", 4_000),
    identityEvidenceReference: stringValue(
      value.identityEvidenceReference, "reviewer.identityEvidenceReference", 4_000
    ),
    identityVerified: falseValue(value.identityVerified, "reviewer.identityVerified")
  });
}

function parseSession(value: unknown): WesternDynamicContentReviewSession {
  assertRecord(value, "reviewSession");
  assertExactKeys(value, SESSION_KEYS, "reviewSession");
  return Object.freeze({
    reviewedAt: stringValue(value.reviewedAt, "reviewSession.reviewedAt", 100),
    methodology: stringValue(value.methodology, "reviewSession.methodology", 8_000),
    traditionScope: stringValue(value.traditionScope, "reviewSession.traditionScope", 4_000),
    generalNotes: stringValue(value.generalNotes, "reviewSession.generalNotes", 12_000)
  });
}

function parseItem(value: unknown, index: number): WesternDynamicContentReviewFeedbackItem {
  const subject = `items[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, ITEM_KEYS, subject);
  const category = stringValue(value.category, `${subject}.category`, 100);
  const decision = stringValue(value.decision, `${subject}.decision`, 100);
  const orientation = stringValue(value.orientationProposal, `${subject}.orientationProposal`, 100);
  if (!CATEGORIES.has(category)) throw new Error(`${subject}.category 不受支持`);
  if (!DECISIONS.has(decision)) throw new Error(`${subject}.decision 不受支持`);
  if (!ORIENTATIONS.has(orientation)) throw new Error(`${subject}.orientationProposal 不受支持`);
  return Object.freeze({
    candidateId: stringValue(value.candidateId, `${subject}.candidateId`, 600),
    order: integerValue(value.order, `${subject}.order`, 1),
    category: category as WesternDynamicContentReviewCategory,
    title: stringValue(value.title, `${subject}.title`, 2_000),
    factSummary: stringValue(value.factSummary, `${subject}.factSummary`, 8_000),
    directStatement: stringValue(value.directStatement, `${subject}.directStatement`, 12_000),
    resourceStatement: stringValue(value.resourceStatement, `${subject}.resourceStatement`, 12_000),
    tensionStatement: stringValue(value.tensionStatement, `${subject}.tensionStatement`, 12_000),
    scopeNote: stringValue(value.scopeNote, `${subject}.scopeNote`, 12_000),
    contextLines: stringArray(value.contextLines, `${subject}.contextLines`, { maxItems: 100 }),
    reviewQuestions: stringArray(value.reviewQuestions, `${subject}.reviewQuestions`, { maxItems: 50 }),
    sourceIds: stringArray(value.sourceIds, `${subject}.sourceIds`, { maxItems: 100 }),
    candidateSnapshotSha256: digestValue(
      value.candidateSnapshotSha256, `${subject}.candidateSnapshotSha256`
    ),
    decision: decision as WesternDynamicContentReviewDecision,
    orientationProposal: orientation as WesternDynamicContentReviewOrientationProposal,
    selectedTradition: stringValue(value.selectedTradition, `${subject}.selectedTradition`, 4_000),
    decisionReason: stringValue(value.decisionReason, `${subject}.decisionReason`, 12_000),
    applicabilityConditions: stringValue(
      value.applicabilityConditions, `${subject}.applicabilityConditions`, 12_000
    ),
    counterexamples: stringValue(value.counterexamples, `${subject}.counterexamples`, 12_000),
    revisionRequest: stringValue(value.revisionRequest, `${subject}.revisionRequest`, 12_000),
    additionalSourceUrls: stringArray(
      value.additionalSourceUrls, `${subject}.additionalSourceUrls`, { maxItems: 50, httpsOnly: true }
    ),
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`),
    scientificValidityClaimed: falseValue(
      value.scientificValidityClaimed, `${subject}.scientificValidityClaimed`
    ),
    formalActivationAllowed: falseValue(
      value.formalActivationAllowed, `${subject}.formalActivationAllowed`
    ),
    goodBadOrientation: nullValue(value.goodBadOrientation, `${subject}.goodBadOrientation`),
    eventOutcome: nullValue(value.eventOutcome, `${subject}.eventOutcome`),
    result: nullValue(value.result, `${subject}.result`)
  });
}

function parseCounts(value: unknown): WesternDynamicContentReviewCounts {
  assertRecord(value, "declaredCounts");
  assertExactKeys(value, COUNT_KEYS, "declaredCounts");
  return Object.freeze(Object.fromEntries(COUNT_KEYS.map((key) => [
    key, integerValue(value[key], `declaredCounts.${key}`)
  ]))) as unknown as WesternDynamicContentReviewCounts;
}

function parseOrientationCounts(value: unknown): WesternDynamicContentReviewOrientationCounts {
  assertRecord(value, "declaredOrientationProposalCounts");
  assertExactKeys(value, ORIENTATION_COUNT_KEYS, "declaredOrientationProposalCounts");
  return Object.freeze(Object.fromEntries(ORIENTATION_COUNT_KEYS.map((key) => [
    key, integerValue(value[key], `declaredOrientationProposalCounts.${key}`)
  ]))) as unknown as WesternDynamicContentReviewOrientationCounts;
}

function parseBoundary(value: unknown): WesternDynamicContentReviewBoundary {
  assertRecord(value, "boundary");
  assertExactKeys(value, BOUNDARY_KEYS, "boundary");
  return Object.freeze({
    directIdentifiersIncluded: falseValue(
      value.directIdentifiersIncluded, "boundary.directIdentifiersIncluded"
    ),
    inputFieldsIncluded: falseValue(value.inputFieldsIncluded, "boundary.inputFieldsIncluded"),
    derivedChartFactsIncluded: trueValue(
      value.derivedChartFactsIncluded, "boundary.derivedChartFactsIncluded"
    ),
    externalSharingRequiresUserDecision: trueValue(
      value.externalSharingRequiresUserDecision,
      "boundary.externalSharingRequiresUserDecision"
    ),
    identityVerified: falseValue(value.identityVerified, "boundary.identityVerified"),
    digitalSignatureVerified: falseValue(
      value.digitalSignatureVerified, "boundary.digitalSignatureVerified"
    ),
    scientificValidityEstablished: falseValue(
      value.scientificValidityEstablished, "boundary.scientificValidityEstablished"
    ),
    eligibleForFormalActivation: falseValue(
      value.eligibleForFormalActivation, "boundary.eligibleForFormalActivation"
    ),
    autoIntegrationAllowed: falseValue(
      value.autoIntegrationAllowed, "boundary.autoIntegrationAllowed"
    ),
    networkTransmissionPerformed: falseValue(
      value.networkTransmissionPerformed, "boundary.networkTransmissionPerformed"
    ),
    ruleArtifactOrStorageMutationPerformed: falseValue(
      value.ruleArtifactOrStorageMutationPerformed,
      "boundary.ruleArtifactOrStorageMutationPerformed"
    ),
    primitiveCatalogReviewApplied: falseValue(
      value.primitiveCatalogReviewApplied, "boundary.primitiveCatalogReviewApplied"
    ),
    deterministicOutcomeEstablished: falseValue(
      value.deterministicOutcomeEstablished, "boundary.deterministicOutcomeEstablished"
    ),
    goodBadOrientation: nullValue(value.goodBadOrientation, "boundary.goodBadOrientation"),
    eventOutcome: nullValue(value.eventOutcome, "boundary.eventOutcome"),
    result: nullValue(value.result, "boundary.result")
  });
}

function parseEnvelope(raw: string): WesternDynamicContentReviewFeedbackEnvelope {
  let input: unknown;
  try {
    input = JSON.parse(raw.replace(/^\uFEFF/u, "")) as unknown;
  } catch (reason) {
    throw new Error("西洋当前盘动态审稿反馈不是有效 JSON", { cause: reason });
  }
  assertRecord(input, "西洋当前盘动态审稿反馈");
  assertExactKeys(input, ROOT_KEYS, "西洋当前盘动态审稿反馈");
  if (!Array.isArray(input.sourceRegistry)) throw new Error("反馈 sourceRegistry 必须是数组");
  if (!Array.isArray(input.items)) throw new Error("反馈 items 必须是数组");
  return freezeEnvelope({
    profile: parseProfile(input.profile),
    projectionBinding: parseBinding(input.projectionBinding),
    sourceRegistry: Object.freeze(input.sourceRegistry.map(parseSource)),
    reviewer: parseReviewer(input.reviewer),
    reviewSession: parseSession(input.reviewSession),
    items: Object.freeze(input.items.map(parseItem)),
    declaredCounts: parseCounts(input.declaredCounts),
    declaredOrientationProposalCounts:
      parseOrientationCounts(input.declaredOrientationProposalCounts),
    boundary: parseBoundary(input.boundary)
  });
}

function immutableItemSnapshot(item: WesternDynamicContentReviewFeedbackItem): object {
  return {
    candidateId: item.candidateId,
    order: item.order,
    category: item.category,
    title: item.title,
    factSummary: item.factSummary,
    directStatement: item.directStatement,
    resourceStatement: item.resourceStatement,
    tensionStatement: item.tensionStatement,
    scopeNote: item.scopeNote,
    contextLines: item.contextLines,
    reviewQuestions: item.reviewQuestions,
    sourceIds: item.sourceIds,
    candidateSnapshotSha256: item.candidateSnapshotSha256,
    expertTruthClaimed: item.expertTruthClaimed,
    scientificValidityClaimed: item.scientificValidityClaimed,
    formalActivationAllowed: item.formalActivationAllowed,
    goodBadOrientation: item.goodBadOrientation,
    eventOutcome: item.eventOutcome,
    result: item.result
  };
}

async function validateAgainstCurrentProjection(
  envelope: WesternDynamicContentReviewFeedbackEnvelope,
  projection: WesternContentProjection
): Promise<{
  counts: WesternDynamicContentReviewCounts;
  orientationProposalCounts: WesternDynamicContentReviewOrientationCounts;
  reviewerAttributionComplete: boolean;
}> {
  const expectedItems = await createItems(projection);
  const expectedSources = createSourceRegistry(projection);
  const expectedBinding = await createProjectionBinding(projection, expectedItems, expectedSources);
  if (JSON.stringify(envelope.projectionBinding) !== JSON.stringify(expectedBinding)) {
    throw new Error("动态审稿反馈没有绑定当前已显示命盘，或投影摘要已失配");
  }
  if (JSON.stringify(envelope.sourceRegistry) !== JSON.stringify(expectedSources)) {
    throw new Error("动态审稿反馈的来源账与当前投影不一致");
  }
  if (envelope.items.length !== expectedItems.length) {
    throw new Error(`动态审稿反馈必须恰好覆盖当前 ${expectedItems.length} 张候选卡`);
  }

  let hasHumanInput = false;
  for (const [index, feedback] of envelope.items.entries()) {
    const expected = expectedItems[index]!;
    if (JSON.stringify(immutableItemSnapshot(feedback))
      !== JSON.stringify(immutableItemSnapshot(expected))) {
      throw new Error(`动态审稿反馈第 ${index + 1} 项与当前候选快照不一致`);
    }
    if (feedback.decision === "unresolved") {
      if (feedback.orientationProposal !== "unresolved"
        || feedback.selectedTradition.trim()
        || feedback.decisionReason.trim()
        || feedback.applicabilityConditions.trim()
        || feedback.counterexamples.trim()
        || feedback.revisionRequest.trim()
        || feedback.additionalSourceUrls.length > 0) {
        throw new Error(`未裁决项不得填写方向提案或裁决字段：${feedback.candidateId}`);
      }
    } else {
      hasHumanInput = true;
      if (feedback.orientationProposal === "unresolved") {
        throw new Error(`已裁决项必须填写条件化方向提案：${feedback.candidateId}`);
      }
      if (!feedback.selectedTradition.trim()
        || !feedback.decisionReason.trim()
        || !feedback.applicabilityConditions.trim()
        || !feedback.counterexamples.trim()) {
        throw new Error(
          `已裁决项必须填写传统、决定理由、成立条件与反例：${feedback.candidateId}`
        );
      }
      if (feedback.decision === "revise" && !feedback.revisionRequest.trim()) {
        throw new Error(`退修项必须填写修改要求：${feedback.candidateId}`);
      }
      if (feedback.decision !== "revise" && feedback.revisionRequest.trim()) {
        throw new Error(`只有退修项可以填写修改要求：${feedback.candidateId}`);
      }
    }
    if (feedback.additionalSourceUrls.length > 0) hasHumanInput = true;
  }

  const reviewerValues = [
    envelope.reviewer.reviewerId,
    envelope.reviewer.displayName,
    envelope.reviewer.affiliation,
    envelope.reviewer.expertiseStatement,
    envelope.reviewer.identityEvidenceReference,
    envelope.reviewSession.reviewedAt,
    envelope.reviewSession.methodology,
    envelope.reviewSession.traditionScope,
    envelope.reviewSession.generalNotes
  ];
  if (reviewerValues.some((value) => value.trim())) hasHumanInput = true;
  const reviewerAttributionComplete = Boolean(
    envelope.reviewer.reviewerId.trim()
    && envelope.reviewer.displayName.trim()
    && envelope.reviewer.expertiseStatement.trim()
    && envelope.reviewSession.methodology.trim()
    && envelope.reviewSession.traditionScope.trim()
    && validReviewedAt(envelope.reviewSession.reviewedAt)
  );
  if (hasHumanInput && !reviewerAttributionComplete) {
    throw new Error(
      "填写任何动态审稿内容后，必须提供 reviewerId、显示名、专业说明、ISO 审稿时间、方法与传统范围"
    );
  }

  const counts = makeCounts(envelope.items);
  if (COUNT_KEYS.some((key) => envelope.declaredCounts[key] !== counts[key])) {
    throw new Error("动态审稿反馈 declaredCounts 与逐项决定不一致");
  }
  const orientationProposalCounts = makeOrientationCounts(envelope.items);
  if (ORIENTATION_COUNT_KEYS.some((key) => (
    envelope.declaredOrientationProposalCounts[key] !== orientationProposalCounts[key]
  ))) {
    throw new Error("动态审稿反馈 declaredOrientationProposalCounts 与逐项方向提案不一致");
  }
  return { counts, orientationProposalCounts, reviewerAttributionComplete };
}

export async function preflightWesternDynamicContentReviewFeedback(
  raw: string,
  currentProjection: WesternContentProjection
): Promise<WesternDynamicContentReviewFeedbackPreflight> {
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes === 0 || bytes > WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_MAX_BYTES) {
    throw new Error("西洋当前盘动态审稿反馈必须是 1 字节至 2 MiB 的 UTF-8 JSON");
  }
  const envelope = parseEnvelope(raw);
  const { counts, orientationProposalCounts, reviewerAttributionComplete } =
    await validateAgainstCurrentProjection(envelope, currentProjection);
  const resolvedCount = counts.approve + counts.revise + counts.reject;
  return Object.freeze({
    envelope,
    counts,
    orientationProposalCounts,
    resolvedCount,
    unresolvedCount: counts.unresolved,
    allItemsResolved: counts.unresolved === 0,
    reviewerAttributionComplete,
    currentProjectionBound: true,
    identityVerified: false,
    digitalSignatureVerified: false,
    scientificValidityEstablished: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    networkTransmissionPerformed: false,
    ruleArtifactOrStorageMutationPerformed: false,
    primitiveCatalogReviewApplied: false,
    deterministicOutcomeEstablished: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
}
