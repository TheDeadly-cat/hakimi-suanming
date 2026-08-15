import {
  BAZI_CONTENT_REVIEW_QUEUE,
  BAZI_CONTENT_REVIEW_QUEUE_PROFILE,
  serializeBaziContentReviewQueue,
  type BaziContentReviewCategory,
  type BaziContentReviewQueue
} from "./content-review-queue";

export const BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE = Object.freeze({
  formatVersion: "hakimi.bazi.content_review_feedback/0.1.0",
  templateVersion: "0.17.0",
  expectedItemCount: 69,
  workflowMode: "human_attributed_read_only_preflight" as const,
  identityPolicy: "self_declared_not_verified" as const,
  signaturePolicy: "none" as const,
  integrationPolicy: "manual_code_review_only" as const,
  mutationPolicy: "no_chart_or_storage_write" as const,
  allowedDecisions: Object.freeze(["unresolved", "approve", "revise", "reject"] as const),
  expertTruthClaimed: false as const,
  formalActivationAllowed: false as const,
  autoIntegrationAllowed: false as const
});

export const BAZI_CONTENT_REVIEW_FEEDBACK_FILENAME =
  "hakimi-bazi-content-review-feedback-v017.json" as const;

export type BaziContentReviewFeedbackDecision =
  (typeof BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedDecisions)[number];

export interface BaziContentReviewFeedbackQueueBinding {
  queueProjectionVersion: string;
  queueCatalogVersion: string;
  queueSha256: string;
  orderedItemIdsSha256: string;
  itemCount: 69;
}

export interface BaziContentReviewFeedbackReviewer {
  reviewerId: string;
  displayName: string;
  affiliation: string;
  expertiseStatement: string;
  identityEvidenceReference: string;
  identityVerified: false;
}

export interface BaziContentReviewFeedbackSession {
  reviewedAt: string;
  methodology: string;
  generalNotes: string;
}

export interface BaziContentReviewFeedbackItem {
  reviewItemId: string;
  order: number;
  category: BaziContentReviewCategory;
  title: string;
  question: string;
  candidateSummary: string;
  sourceRefIds: readonly string[];
  decision: BaziContentReviewFeedbackDecision;
  decisionReason: string;
  revisionRequest: string;
  additionalSourceUrls: readonly string[];
  expertTruthClaimed: false;
  formalActivationAllowed: false;
  result: null;
}

export interface BaziContentReviewFeedbackCounts {
  total: 69;
  unresolved: number;
  approve: number;
  revise: number;
  reject: number;
}

export interface BaziContentReviewFeedbackBoundary {
  identityVerified: false;
  digitalSignatureVerified: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  chartOrStorageMutationPerformed: false;
  result: null;
}

export interface BaziContentReviewFeedbackEnvelope {
  profile: typeof BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE;
  queueBinding: BaziContentReviewFeedbackQueueBinding;
  reviewer: BaziContentReviewFeedbackReviewer;
  reviewSession: BaziContentReviewFeedbackSession;
  items: readonly BaziContentReviewFeedbackItem[];
  declaredCounts: BaziContentReviewFeedbackCounts;
  boundary: BaziContentReviewFeedbackBoundary;
}

export interface BaziContentReviewFeedbackPreflight {
  envelope: BaziContentReviewFeedbackEnvelope;
  counts: BaziContentReviewFeedbackCounts;
  resolvedCount: number;
  unresolvedCount: number;
  allItemsResolved: boolean;
  reviewerAttributionComplete: boolean;
  identityVerified: false;
  digitalSignatureVerified: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  chartOrStorageMutationPerformed: false;
  result: null;
}

const FEEDBACK_ROOT_KEYS = Object.freeze([
  "profile",
  "queueBinding",
  "reviewer",
  "reviewSession",
  "items",
  "declaredCounts",
  "boundary"
]);

const FEEDBACK_PROFILE_KEYS = Object.freeze([
  "formatVersion",
  "templateVersion",
  "expectedItemCount",
  "workflowMode",
  "identityPolicy",
  "signaturePolicy",
  "integrationPolicy",
  "mutationPolicy",
  "allowedDecisions",
  "expertTruthClaimed",
  "formalActivationAllowed",
  "autoIntegrationAllowed"
]);

const QUEUE_BINDING_KEYS = Object.freeze([
  "queueProjectionVersion",
  "queueCatalogVersion",
  "queueSha256",
  "orderedItemIdsSha256",
  "itemCount"
]);

const REVIEWER_KEYS = Object.freeze([
  "reviewerId",
  "displayName",
  "affiliation",
  "expertiseStatement",
  "identityEvidenceReference",
  "identityVerified"
]);

const SESSION_KEYS = Object.freeze(["reviewedAt", "methodology", "generalNotes"]);

const ITEM_KEYS = Object.freeze([
  "reviewItemId",
  "order",
  "category",
  "title",
  "question",
  "candidateSummary",
  "sourceRefIds",
  "decision",
  "decisionReason",
  "revisionRequest",
  "additionalSourceUrls",
  "expertTruthClaimed",
  "formalActivationAllowed",
  "result"
]);

const COUNT_KEYS = Object.freeze(["total", "unresolved", "approve", "revise", "reject"]);
const BOUNDARY_KEYS = Object.freeze([
  "identityVerified",
  "digitalSignatureVerified",
  "eligibleForFormalActivation",
  "autoIntegrationAllowed",
  "chartOrStorageMutationPerformed",
  "result"
]);

const DECISION_SET = new Set<string>(BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedDecisions);
const CATEGORY_SET = new Set<string>([
  "strength_method",
  "ten_god_position",
  "shensha_rule",
  "shensha_position"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, subject: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${subject} 必须是 JSON 对象`);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  subject: string
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${subject} 字段集合不匹配`);
  }
}

function stringValue(value: unknown, subject: string, maxLength = 4_000): string {
  if (typeof value !== "string") throw new Error(`${subject} 必须是字符串`);
  if (value.length > maxLength) throw new Error(`${subject} 超过 ${maxLength} 字符上限`);
  return value;
}

function finiteInteger(value: unknown, subject: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`${subject} 必须是非负整数`);
  return value as number;
}

function falseValue(value: unknown, subject: string): false {
  if (value !== false) throw new Error(`${subject} 必须保持 false`);
  return false;
}

function nullValue(value: unknown, subject: string): null {
  if (value !== null) throw new Error(`${subject} 必须保持 null`);
  return null;
}

function stringArray(value: unknown, subject: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${subject} 必须是字符串数组`);
  const result = value.map((entry, index) => stringValue(entry, `${subject}[${index}]`, 2_000));
  if (new Set(result).size !== result.length) throw new Error(`${subject} 不得包含重复项`);
  return Object.freeze(result);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function validReviewedAt(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

async function sha256Text(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("当前运行环境不支持 SHA-256 内容绑定");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createQueueBinding(
  queue: BaziContentReviewQueue
): Promise<BaziContentReviewFeedbackQueueBinding> {
  return Object.freeze({
    queueProjectionVersion: queue.profile.projectionVersion,
    queueCatalogVersion: queue.profile.catalogVersion,
    queueSha256: await sha256Text(serializeBaziContentReviewQueue(queue)),
    orderedItemIdsSha256: await sha256Text(`${queue.items.map((item) => item.reviewItemId).join("\n")}\n`),
    itemCount: 69 as const
  });
}

function makeCounts(items: readonly BaziContentReviewFeedbackItem[]): BaziContentReviewFeedbackCounts {
  const counts = { total: 69, unresolved: 0, approve: 0, revise: 0, reject: 0 } as const satisfies
    BaziContentReviewFeedbackCounts;
  const mutable = { ...counts };
  for (const item of items) mutable[item.decision] += 1;
  return Object.freeze(mutable);
}

function freezeEnvelope(envelope: BaziContentReviewFeedbackEnvelope): BaziContentReviewFeedbackEnvelope {
  return Object.freeze({
    profile: BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE,
    queueBinding: Object.freeze({ ...envelope.queueBinding }),
    reviewer: Object.freeze({ ...envelope.reviewer }),
    reviewSession: Object.freeze({ ...envelope.reviewSession }),
    items: Object.freeze(envelope.items.map((item) => Object.freeze({
      ...item,
      sourceRefIds: Object.freeze([...item.sourceRefIds]),
      additionalSourceUrls: Object.freeze([...item.additionalSourceUrls])
    }))),
    declaredCounts: Object.freeze({ ...envelope.declaredCounts }),
    boundary: Object.freeze({ ...envelope.boundary })
  });
}

export async function createBaziContentReviewFeedbackTemplate(
  queue: BaziContentReviewQueue = BAZI_CONTENT_REVIEW_QUEUE
): Promise<BaziContentReviewFeedbackEnvelope> {
  if (queue.profile !== BAZI_CONTENT_REVIEW_QUEUE_PROFILE
    || queue.items.length !== BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE.expectedItemCount) {
    throw new Error("反馈模板只能绑定当前 69 项八字内容审稿清单");
  }
  const items = Object.freeze(queue.items.map((item) => Object.freeze({
    reviewItemId: item.reviewItemId,
    order: item.order,
    category: item.category,
    title: item.title,
    question: item.question,
    candidateSummary: item.candidateSummary,
    sourceRefIds: Object.freeze([...item.sourceRefIds]),
    decision: "unresolved" as const,
    decisionReason: "",
    revisionRequest: "",
    additionalSourceUrls: Object.freeze([] as string[]),
    expertTruthClaimed: false as const,
    formalActivationAllowed: false as const,
    result: null
  })));
  return freezeEnvelope({
    profile: BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE,
    queueBinding: await createQueueBinding(queue),
    reviewer: Object.freeze({
      reviewerId: "",
      displayName: "",
      affiliation: "",
      expertiseStatement: "",
      identityEvidenceReference: "",
      identityVerified: false
    }),
    reviewSession: Object.freeze({ reviewedAt: "", methodology: "", generalNotes: "" }),
    items,
    declaredCounts: makeCounts(items),
    boundary: Object.freeze({
      identityVerified: false,
      digitalSignatureVerified: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      chartOrStorageMutationPerformed: false,
      result: null
    })
  });
}

export function serializeBaziContentReviewFeedbackTemplate(
  template: BaziContentReviewFeedbackEnvelope
): string {
  return `${JSON.stringify(template, null, 2)}\n`;
}

function parseProfile(value: unknown): typeof BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE {
  assertRecord(value, "反馈 profile");
  assertExactKeys(value, FEEDBACK_PROFILE_KEYS, "反馈 profile");
  const expected = BAZI_CONTENT_REVIEW_FEEDBACK_PROFILE;
  for (const key of FEEDBACK_PROFILE_KEYS) {
    if (key === "allowedDecisions") {
      if (!sameStrings(stringArray(value[key], "反馈 allowedDecisions"), expected.allowedDecisions)) {
        throw new Error("反馈允许决定集合不匹配");
      }
    } else if (JSON.stringify(value[key]) !== JSON.stringify(expected[key as keyof typeof expected])) {
      throw new Error(`反馈 profile.${key} 不匹配`);
    }
  }
  return expected;
}

function parseQueueBinding(value: unknown): BaziContentReviewFeedbackQueueBinding {
  assertRecord(value, "反馈 queueBinding");
  assertExactKeys(value, QUEUE_BINDING_KEYS, "反馈 queueBinding");
  return Object.freeze({
    queueProjectionVersion: stringValue(value.queueProjectionVersion, "queueProjectionVersion", 200),
    queueCatalogVersion: stringValue(value.queueCatalogVersion, "queueCatalogVersion", 100),
    queueSha256: stringValue(value.queueSha256, "queueSha256", 64),
    orderedItemIdsSha256: stringValue(value.orderedItemIdsSha256, "orderedItemIdsSha256", 64),
    itemCount: finiteInteger(value.itemCount, "queueBinding.itemCount") as 69
  });
}

function parseReviewer(value: unknown): BaziContentReviewFeedbackReviewer {
  assertRecord(value, "反馈 reviewer");
  assertExactKeys(value, REVIEWER_KEYS, "反馈 reviewer");
  return Object.freeze({
    reviewerId: stringValue(value.reviewerId, "reviewerId", 200),
    displayName: stringValue(value.displayName, "displayName", 200),
    affiliation: stringValue(value.affiliation, "affiliation", 500),
    expertiseStatement: stringValue(value.expertiseStatement, "expertiseStatement", 1_000),
    identityEvidenceReference: stringValue(value.identityEvidenceReference, "identityEvidenceReference", 1_000),
    identityVerified: falseValue(value.identityVerified, "reviewer.identityVerified")
  });
}

function parseSession(value: unknown): BaziContentReviewFeedbackSession {
  assertRecord(value, "反馈 reviewSession");
  assertExactKeys(value, SESSION_KEYS, "反馈 reviewSession");
  return Object.freeze({
    reviewedAt: stringValue(value.reviewedAt, "reviewedAt", 100),
    methodology: stringValue(value.methodology, "methodology", 2_000),
    generalNotes: stringValue(value.generalNotes, "generalNotes", 4_000)
  });
}

function parseItem(value: unknown, index: number): BaziContentReviewFeedbackItem {
  const subject = `反馈 items[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, ITEM_KEYS, subject);
  const category = stringValue(value.category, `${subject}.category`, 100);
  if (!CATEGORY_SET.has(category)) throw new Error(`${subject}.category 无效`);
  const decision = stringValue(value.decision, `${subject}.decision`, 30);
  if (!DECISION_SET.has(decision)) throw new Error(`${subject}.decision 无效`);
  const sourceRefIds = stringArray(value.sourceRefIds, `${subject}.sourceRefIds`);
  const additionalSourceUrls = stringArray(value.additionalSourceUrls, `${subject}.additionalSourceUrls`);
  for (const url of additionalSourceUrls) {
    if (!url.startsWith("https://")) throw new Error(`${subject} 新增来源必须使用 HTTPS`);
  }
  return Object.freeze({
    reviewItemId: stringValue(value.reviewItemId, `${subject}.reviewItemId`, 500),
    order: finiteInteger(value.order, `${subject}.order`),
    category: category as BaziContentReviewCategory,
    title: stringValue(value.title, `${subject}.title`, 500),
    question: stringValue(value.question, `${subject}.question`, 2_000),
    candidateSummary: stringValue(value.candidateSummary, `${subject}.candidateSummary`, 4_000),
    sourceRefIds,
    decision: decision as BaziContentReviewFeedbackDecision,
    decisionReason: stringValue(value.decisionReason, `${subject}.decisionReason`, 4_000),
    revisionRequest: stringValue(value.revisionRequest, `${subject}.revisionRequest`, 4_000),
    additionalSourceUrls,
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`),
    formalActivationAllowed: falseValue(value.formalActivationAllowed, `${subject}.formalActivationAllowed`),
    result: nullValue(value.result, `${subject}.result`)
  });
}

function parseCounts(value: unknown): BaziContentReviewFeedbackCounts {
  assertRecord(value, "反馈 declaredCounts");
  assertExactKeys(value, COUNT_KEYS, "反馈 declaredCounts");
  return Object.freeze({
    total: finiteInteger(value.total, "declaredCounts.total") as 69,
    unresolved: finiteInteger(value.unresolved, "declaredCounts.unresolved"),
    approve: finiteInteger(value.approve, "declaredCounts.approve"),
    revise: finiteInteger(value.revise, "declaredCounts.revise"),
    reject: finiteInteger(value.reject, "declaredCounts.reject")
  });
}

function parseBoundary(value: unknown): BaziContentReviewFeedbackBoundary {
  assertRecord(value, "反馈 boundary");
  assertExactKeys(value, BOUNDARY_KEYS, "反馈 boundary");
  return Object.freeze({
    identityVerified: falseValue(value.identityVerified, "boundary.identityVerified"),
    digitalSignatureVerified: falseValue(value.digitalSignatureVerified, "boundary.digitalSignatureVerified"),
    eligibleForFormalActivation: falseValue(
      value.eligibleForFormalActivation,
      "boundary.eligibleForFormalActivation"
    ),
    autoIntegrationAllowed: falseValue(value.autoIntegrationAllowed, "boundary.autoIntegrationAllowed"),
    chartOrStorageMutationPerformed: falseValue(
      value.chartOrStorageMutationPerformed,
      "boundary.chartOrStorageMutationPerformed"
    ),
    result: nullValue(value.result, "boundary.result")
  });
}

function parseEnvelope(raw: string): BaziContentReviewFeedbackEnvelope {
  let input: unknown;
  try {
    input = JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
  } catch (reason) {
    throw new Error("八字内容审稿反馈不是有效 JSON", { cause: reason });
  }
  assertRecord(input, "八字内容审稿反馈");
  assertExactKeys(input, FEEDBACK_ROOT_KEYS, "八字内容审稿反馈");
  if (!Array.isArray(input.items)) throw new Error("反馈 items 必须是数组");
  return freezeEnvelope({
    profile: parseProfile(input.profile),
    queueBinding: parseQueueBinding(input.queueBinding),
    reviewer: parseReviewer(input.reviewer),
    reviewSession: parseSession(input.reviewSession),
    items: Object.freeze(input.items.map(parseItem)),
    declaredCounts: parseCounts(input.declaredCounts),
    boundary: parseBoundary(input.boundary)
  });
}

async function validateEnvelopeAgainstQueue(
  envelope: BaziContentReviewFeedbackEnvelope,
  queue: BaziContentReviewQueue
): Promise<{
  counts: BaziContentReviewFeedbackCounts;
  reviewerAttributionComplete: boolean;
}> {
  const expectedBinding = await createQueueBinding(queue);
  const binding = envelope.queueBinding;
  if (binding.queueProjectionVersion !== expectedBinding.queueProjectionVersion
    || binding.queueCatalogVersion !== expectedBinding.queueCatalogVersion
    || binding.queueSha256 !== expectedBinding.queueSha256
    || binding.orderedItemIdsSha256 !== expectedBinding.orderedItemIdsSha256
    || binding.itemCount !== expectedBinding.itemCount) {
    throw new Error("审稿反馈没有绑定当前 69 项内容清单或摘要已失配");
  }
  if (envelope.items.length !== queue.items.length) {
    throw new Error(`审稿反馈必须恰好覆盖 ${queue.items.length} 项`);
  }

  let hasHumanInput = false;
  for (const [index, feedback] of envelope.items.entries()) {
    const expected = queue.items[index]!;
    if (feedback.reviewItemId !== expected.reviewItemId
      || feedback.order !== expected.order
      || feedback.category !== expected.category
      || feedback.title !== expected.title
      || feedback.question !== expected.question
      || feedback.candidateSummary !== expected.candidateSummary
      || !sameStrings(feedback.sourceRefIds, expected.sourceRefIds)) {
      throw new Error(`审稿反馈第 ${index + 1} 项与当前候选快照不一致`);
    }
    if (feedback.decision === "unresolved") {
      if (feedback.decisionReason.trim() || feedback.revisionRequest.trim()) {
        throw new Error(`未裁决项不得填写决定理由或退修要求：${feedback.reviewItemId}`);
      }
    } else {
      hasHumanInput = true;
      if (!feedback.decisionReason.trim()) {
        throw new Error(`已裁决项必须填写决定理由：${feedback.reviewItemId}`);
      }
      if (feedback.decision === "revise" && !feedback.revisionRequest.trim()) {
        throw new Error(`退修项必须填写修改要求：${feedback.reviewItemId}`);
      }
      if (feedback.decision !== "revise" && feedback.revisionRequest.trim()) {
        throw new Error(`只有退修项可以填写修改要求：${feedback.reviewItemId}`);
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
    envelope.reviewSession.generalNotes
  ];
  if (reviewerValues.some((value) => value.trim())) hasHumanInput = true;
  const reviewerAttributionComplete = Boolean(
    envelope.reviewer.reviewerId.trim()
    && envelope.reviewer.displayName.trim()
    && envelope.reviewer.expertiseStatement.trim()
    && envelope.reviewSession.methodology.trim()
    && validReviewedAt(envelope.reviewSession.reviewedAt)
  );
  if (hasHumanInput && !reviewerAttributionComplete) {
    throw new Error("填写任何审稿内容后，必须提供 reviewerId、显示名、专业说明、ISO 审稿时间与方法说明");
  }

  const counts = makeCounts(envelope.items);
  if (COUNT_KEYS.some((key) => envelope.declaredCounts[key as keyof BaziContentReviewFeedbackCounts]
    !== counts[key as keyof BaziContentReviewFeedbackCounts])) {
    throw new Error("审稿反馈 declaredCounts 与逐项决定不一致");
  }
  return { counts, reviewerAttributionComplete };
}

export async function preflightBaziContentReviewFeedback(
  raw: string,
  queue: BaziContentReviewQueue = BAZI_CONTENT_REVIEW_QUEUE
): Promise<BaziContentReviewFeedbackPreflight> {
  const envelope = parseEnvelope(raw);
  const { counts, reviewerAttributionComplete } = await validateEnvelopeAgainstQueue(envelope, queue);
  const resolvedCount = counts.approve + counts.revise + counts.reject;
  return Object.freeze({
    envelope,
    counts,
    resolvedCount,
    unresolvedCount: counts.unresolved,
    allItemsResolved: counts.unresolved === 0,
    reviewerAttributionComplete,
    identityVerified: false,
    digitalSignatureVerified: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    chartOrStorageMutationPerformed: false,
    result: null
  });
}
