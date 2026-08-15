import {
  WESTERN_CONTENT_LAYER_VERSION,
  WESTERN_CONTENT_SOURCES,
  WESTERN_PRIMITIVE_CONTENT_REVIEW_CANDIDATES,
  WESTERN_PRIMITIVE_CONTENT_REVIEW_VERSION,
  type WesternContentSource,
  type WesternPrimitiveContentCategory,
  type WesternPrimitiveContentReviewCandidate
} from "./content-layer.ts";

export const WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE = Object.freeze({
  formatVersion: "hakimi.western.content_review_feedback/0.1.0",
  templateVersion: "0.6.0",
  expectedItemCount: 43,
  expectedSourceCount: 31,
  catalogScope: "fixed_43_primitive_content_only" as const,
  dynamicCompositionCoverage: "not_included_requires_separate_review" as const,
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

export const WESTERN_CONTENT_REVIEW_FEEDBACK_FILENAME =
  "hakimi-western-content-primitives-review-v006.json" as const;
export const WESTERN_CONTENT_REVIEW_FEEDBACK_MAX_BYTES = 2 * 1024 * 1024;

export type WesternContentReviewDecision =
  (typeof WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedDecisions)[number];
export type WesternContentReviewOrientationProposal =
  (typeof WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedOrientationProposals)[number];

export interface WesternContentReviewSource {
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

export interface WesternContentReviewCatalogBinding {
  contentLayerVersion: typeof WESTERN_CONTENT_LAYER_VERSION;
  primitiveCatalogVersion: typeof WESTERN_PRIMITIVE_CONTENT_REVIEW_VERSION;
  catalogSha256: string;
  orderedContentIdsSha256: string;
  sourceRegistrySha256: string;
  itemCount: 43;
  sourceCount: 31;
}

export interface WesternContentReviewReviewer {
  reviewerId: string;
  displayName: string;
  affiliation: string;
  expertiseStatement: string;
  identityEvidenceReference: string;
  identityVerified: false;
}

export interface WesternContentReviewSession {
  reviewedAt: string;
  methodology: string;
  traditionScope: string;
  generalNotes: string;
}

export interface WesternContentReviewFeedbackItem {
  contentId: string;
  order: number;
  category: WesternPrimitiveContentCategory;
  key: string;
  label: string;
  candidateSummary: string;
  resourceStatement: string;
  tensionStatement: string;
  scopeNote: string;
  reviewPrompt: string;
  sourceIds: readonly string[];
  decision: WesternContentReviewDecision;
  orientationProposal: WesternContentReviewOrientationProposal;
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

export interface WesternContentReviewCounts {
  total: 43;
  unresolved: number;
  approve: number;
  revise: number;
  reject: number;
}

export interface WesternContentReviewOrientationCounts {
  total: 43;
  unresolved: number;
  potentiallySupportive: number;
  potentiallyChallenging: number;
  mixedConditional: number;
  notAssessable: number;
}

export interface WesternContentReviewBoundary {
  identityVerified: false;
  digitalSignatureVerified: false;
  scientificValidityEstablished: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  ruleArtifactOrStorageMutationPerformed: false;
  dynamicCompositionReviewed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface WesternContentReviewFeedbackEnvelope {
  profile: typeof WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE;
  catalogBinding: WesternContentReviewCatalogBinding;
  sourceRegistry: readonly WesternContentReviewSource[];
  reviewer: WesternContentReviewReviewer;
  reviewSession: WesternContentReviewSession;
  items: readonly WesternContentReviewFeedbackItem[];
  declaredCounts: WesternContentReviewCounts;
  declaredOrientationProposalCounts: WesternContentReviewOrientationCounts;
  boundary: WesternContentReviewBoundary;
}

export interface WesternContentReviewFeedbackPreflight {
  envelope: WesternContentReviewFeedbackEnvelope;
  counts: WesternContentReviewCounts;
  orientationProposalCounts: WesternContentReviewOrientationCounts;
  resolvedCount: number;
  unresolvedCount: number;
  allItemsResolved: boolean;
  reviewerAttributionComplete: boolean;
  identityVerified: false;
  digitalSignatureVerified: false;
  scientificValidityEstablished: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  ruleArtifactOrStorageMutationPerformed: false;
  dynamicCompositionReviewed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

const ROOT_KEYS = Object.freeze([
  "profile", "catalogBinding", "sourceRegistry", "reviewer", "reviewSession", "items",
  "declaredCounts", "declaredOrientationProposalCounts", "boundary"
]);
const PROFILE_KEYS = Object.freeze([
  "formatVersion", "templateVersion", "expectedItemCount", "expectedSourceCount",
  "catalogScope", "dynamicCompositionCoverage", "workflowMode", "identityPolicy",
  "signaturePolicy", "integrationPolicy", "mutationPolicy", "allowedDecisions",
  "allowedOrientationProposals", "expertTruthClaimed", "scientificValidityClaimed",
  "formalActivationAllowed", "autoIntegrationAllowed"
]);
const BINDING_KEYS = Object.freeze([
  "contentLayerVersion", "primitiveCatalogVersion", "catalogSha256",
  "orderedContentIdsSha256", "sourceRegistrySha256", "itemCount", "sourceCount"
]);
const SOURCE_KEYS = Object.freeze([
  "sourceId", "title", "sourceUrl", "publisher", "role", "accessedAt", "usageBoundary",
  "expertTruthClaimed", "scientificValidityClaimed"
]);
const REVIEWER_KEYS = Object.freeze([
  "reviewerId", "displayName", "affiliation", "expertiseStatement",
  "identityEvidenceReference", "identityVerified"
]);
const SESSION_KEYS = Object.freeze(["reviewedAt", "methodology", "traditionScope", "generalNotes"]);
const ITEM_KEYS = Object.freeze([
  "contentId", "order", "category", "key", "label", "candidateSummary",
  "resourceStatement", "tensionStatement", "scopeNote", "reviewPrompt", "sourceIds",
  "decision", "orientationProposal", "selectedTradition", "decisionReason",
  "applicabilityConditions", "counterexamples", "revisionRequest", "additionalSourceUrls",
  "expertTruthClaimed", "scientificValidityClaimed", "formalActivationAllowed",
  "goodBadOrientation", "eventOutcome", "result"
]);
const COUNT_KEYS = Object.freeze(["total", "unresolved", "approve", "revise", "reject"]);
const ORIENTATION_COUNT_KEYS = Object.freeze([
  "total", "unresolved", "potentiallySupportive", "potentiallyChallenging",
  "mixedConditional", "notAssessable"
]);
const BOUNDARY_KEYS = Object.freeze([
  "identityVerified", "digitalSignatureVerified", "scientificValidityEstablished",
  "eligibleForFormalActivation", "autoIntegrationAllowed",
  "ruleArtifactOrStorageMutationPerformed", "dynamicCompositionReviewed",
  "goodBadOrientation", "eventOutcome", "result"
]);

const CATEGORY_SET = new Set<string>(["planet", "sign", "house", "aspect", "angle"]);
const SOURCE_ROLE_SET = new Set<string>([
  "practitioner_reference", "interpretation_boundary", "scientific_boundary"
]);
const DECISION_SET = new Set<string>(WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedDecisions);
const ORIENTATION_SET = new Set<string>(
  WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE.allowedOrientationProposals
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, subject: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${subject} 必须是 JSON 对象`);
}

function assertExactKeys(
  value: Record<string, unknown>, expectedKeys: readonly string[], subject: string
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
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${subject} 必须是非负整数`);
  }
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
  const entries = value.map((entry, index) => stringValue(entry, `${subject}[${index}]`, 2_000));
  if (new Set(entries).size !== entries.length) throw new Error(`${subject} 不得包含重复项`);
  return Object.freeze(entries);
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

function createSourceRegistry(): readonly WesternContentReviewSource[] {
  const sources = WESTERN_CONTENT_SOURCES.map((source) => Object.freeze({
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
  if (sources.length !== 31 || new Set(sources.map((source) => source.sourceId)).size !== 31) {
    throw new Error("西洋基础内容审稿模板必须绑定当前 31 条来源账");
  }
  return Object.freeze(sources);
}

function catalogSnapshot(
  candidates: readonly WesternPrimitiveContentReviewCandidate[]
): readonly object[] {
  return Object.freeze(candidates.map((candidate) => Object.freeze({
    contentId: candidate.contentId,
    order: candidate.order,
    category: candidate.category,
    key: candidate.key,
    label: candidate.label,
    candidateSummary: candidate.candidateSummary,
    resourceStatement: candidate.resourceStatement,
    tensionStatement: candidate.tensionStatement,
    scopeNote: candidate.scopeNote,
    reviewPrompt: candidate.reviewPrompt,
    sourceIds: [...candidate.sourceIds],
    expertTruthClaimed: candidate.expertTruthClaimed,
    scientificValidityClaimed: candidate.scientificValidityClaimed,
    formalActivationAllowed: candidate.formalActivationAllowed,
    goodBadOrientation: candidate.goodBadOrientation,
    eventOutcome: candidate.eventOutcome,
    result: candidate.result
  })));
}

async function createCatalogBinding(
  candidates: readonly WesternPrimitiveContentReviewCandidate[],
  sourceRegistry: readonly WesternContentReviewSource[]
): Promise<WesternContentReviewCatalogBinding> {
  const snapshot = catalogSnapshot(candidates);
  return Object.freeze({
    contentLayerVersion: WESTERN_CONTENT_LAYER_VERSION,
    primitiveCatalogVersion: WESTERN_PRIMITIVE_CONTENT_REVIEW_VERSION,
    catalogSha256: await sha256Text(`${JSON.stringify(snapshot)}\n`),
    orderedContentIdsSha256: await sha256Text(
      `${candidates.map((candidate) => candidate.contentId).join("\n")}\n`
    ),
    sourceRegistrySha256: await sha256Text(`${JSON.stringify(sourceRegistry)}\n`),
    itemCount: 43,
    sourceCount: 31
  });
}

function makeCounts(items: readonly WesternContentReviewFeedbackItem[]): WesternContentReviewCounts {
  const mutable = { total: 43, unresolved: 0, approve: 0, revise: 0, reject: 0 };
  for (const item of items) mutable[item.decision] += 1;
  return Object.freeze(mutable) as WesternContentReviewCounts;
}

function makeOrientationCounts(
  items: readonly WesternContentReviewFeedbackItem[]
): WesternContentReviewOrientationCounts {
  const mutable = {
    total: 43, unresolved: 0, potentiallySupportive: 0, potentiallyChallenging: 0,
    mixedConditional: 0, notAssessable: 0
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
  return Object.freeze(mutable) as WesternContentReviewOrientationCounts;
}

function freezeEnvelope(
  envelope: WesternContentReviewFeedbackEnvelope
): WesternContentReviewFeedbackEnvelope {
  return Object.freeze({
    profile: WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE,
    catalogBinding: Object.freeze({ ...envelope.catalogBinding }),
    sourceRegistry: Object.freeze(envelope.sourceRegistry.map((source) => Object.freeze({ ...source }))),
    reviewer: Object.freeze({ ...envelope.reviewer }),
    reviewSession: Object.freeze({ ...envelope.reviewSession }),
    items: Object.freeze(envelope.items.map((item) => Object.freeze({
      ...item,
      sourceIds: Object.freeze([...item.sourceIds]),
      additionalSourceUrls: Object.freeze([...item.additionalSourceUrls])
    }))),
    declaredCounts: Object.freeze({ ...envelope.declaredCounts }),
    declaredOrientationProposalCounts:
      Object.freeze({ ...envelope.declaredOrientationProposalCounts }),
    boundary: Object.freeze({ ...envelope.boundary })
  });
}

export async function createWesternContentReviewFeedbackTemplate(): Promise<
  WesternContentReviewFeedbackEnvelope
> {
  const candidates = WESTERN_PRIMITIVE_CONTENT_REVIEW_CANDIDATES;
  if (candidates.length !== 43) {
    throw new Error("西洋基础内容审稿模板只能绑定当前 43 项固定词条");
  }
  const sourceRegistry = createSourceRegistry();
  const items = Object.freeze(candidates.map((candidate) => Object.freeze({
    ...candidate,
    sourceIds: Object.freeze([...candidate.sourceIds]),
    decision: "unresolved" as const,
    orientationProposal: "unresolved" as const,
    selectedTradition: "",
    decisionReason: "",
    applicabilityConditions: "",
    counterexamples: "",
    revisionRequest: "",
    additionalSourceUrls: Object.freeze([] as string[])
  })));
  return freezeEnvelope({
    profile: WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE,
    catalogBinding: await createCatalogBinding(candidates, sourceRegistry),
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
      identityVerified: false,
      digitalSignatureVerified: false,
      scientificValidityEstablished: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      ruleArtifactOrStorageMutationPerformed: false,
      dynamicCompositionReviewed: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    })
  });
}

export function serializeWesternContentReviewFeedbackTemplate(
  template: WesternContentReviewFeedbackEnvelope
): string {
  return `${JSON.stringify(template, null, 2)}\n`;
}

function parseProfile(value: unknown): typeof WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE {
  assertRecord(value, "反馈 profile");
  assertExactKeys(value, PROFILE_KEYS, "反馈 profile");
  const expected = WESTERN_CONTENT_REVIEW_FEEDBACK_PROFILE;
  for (const key of PROFILE_KEYS) {
    if (JSON.stringify(value[key]) !== JSON.stringify(expected[key as keyof typeof expected])) {
      throw new Error(`反馈 profile.${key} 不匹配`);
    }
  }
  return expected;
}

function parseBinding(value: unknown): WesternContentReviewCatalogBinding {
  assertRecord(value, "反馈 catalogBinding");
  assertExactKeys(value, BINDING_KEYS, "反馈 catalogBinding");
  return Object.freeze({
    contentLayerVersion: stringValue(
      value.contentLayerVersion, "catalogBinding.contentLayerVersion", 200
    ) as typeof WESTERN_CONTENT_LAYER_VERSION,
    primitiveCatalogVersion: stringValue(
      value.primitiveCatalogVersion, "catalogBinding.primitiveCatalogVersion", 200
    ) as typeof WESTERN_PRIMITIVE_CONTENT_REVIEW_VERSION,
    catalogSha256: stringValue(value.catalogSha256, "catalogBinding.catalogSha256", 64),
    orderedContentIdsSha256: stringValue(
      value.orderedContentIdsSha256, "catalogBinding.orderedContentIdsSha256", 64
    ),
    sourceRegistrySha256: stringValue(
      value.sourceRegistrySha256, "catalogBinding.sourceRegistrySha256", 64
    ),
    itemCount: finiteInteger(value.itemCount, "catalogBinding.itemCount") as 43,
    sourceCount: finiteInteger(value.sourceCount, "catalogBinding.sourceCount") as 31
  });
}

function parseSource(value: unknown, index: number): WesternContentReviewSource {
  const subject = `反馈 sourceRegistry[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, SOURCE_KEYS, subject);
  const role = stringValue(value.role, `${subject}.role`, 100);
  if (!SOURCE_ROLE_SET.has(role)) throw new Error(`${subject}.role 无效`);
  const sourceUrl = stringValue(value.sourceUrl, `${subject}.sourceUrl`, 2_000);
  if (!sourceUrl.startsWith("https://")) throw new Error(`${subject}.sourceUrl 必须使用 HTTPS`);
  return Object.freeze({
    sourceId: stringValue(value.sourceId, `${subject}.sourceId`, 500),
    title: stringValue(value.title, `${subject}.title`, 1_000),
    sourceUrl,
    publisher: stringValue(value.publisher, `${subject}.publisher`, 500),
    role: role as WesternContentSource["role"],
    accessedAt: stringValue(value.accessedAt, `${subject}.accessedAt`, 100),
    usageBoundary: stringValue(value.usageBoundary, `${subject}.usageBoundary`, 2_000),
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`),
    scientificValidityClaimed: falseValue(
      value.scientificValidityClaimed, `${subject}.scientificValidityClaimed`
    )
  });
}

function parseReviewer(value: unknown): WesternContentReviewReviewer {
  assertRecord(value, "反馈 reviewer");
  assertExactKeys(value, REVIEWER_KEYS, "反馈 reviewer");
  return Object.freeze({
    reviewerId: stringValue(value.reviewerId, "reviewer.reviewerId", 200),
    displayName: stringValue(value.displayName, "reviewer.displayName", 200),
    affiliation: stringValue(value.affiliation, "reviewer.affiliation", 500),
    expertiseStatement: stringValue(value.expertiseStatement, "reviewer.expertiseStatement", 2_000),
    identityEvidenceReference: stringValue(
      value.identityEvidenceReference, "reviewer.identityEvidenceReference", 2_000
    ),
    identityVerified: falseValue(value.identityVerified, "reviewer.identityVerified")
  });
}

function parseSession(value: unknown): WesternContentReviewSession {
  assertRecord(value, "反馈 reviewSession");
  assertExactKeys(value, SESSION_KEYS, "反馈 reviewSession");
  return Object.freeze({
    reviewedAt: stringValue(value.reviewedAt, "reviewSession.reviewedAt", 100),
    methodology: stringValue(value.methodology, "reviewSession.methodology", 4_000),
    traditionScope: stringValue(value.traditionScope, "reviewSession.traditionScope", 2_000),
    generalNotes: stringValue(value.generalNotes, "reviewSession.generalNotes", 8_000)
  });
}

function parseItem(value: unknown, index: number): WesternContentReviewFeedbackItem {
  const subject = `反馈 items[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, ITEM_KEYS, subject);
  const category = stringValue(value.category, `${subject}.category`, 100);
  if (!CATEGORY_SET.has(category)) throw new Error(`${subject}.category 无效`);
  const decision = stringValue(value.decision, `${subject}.decision`, 30);
  if (!DECISION_SET.has(decision)) throw new Error(`${subject}.decision 无效`);
  const orientationProposal = stringValue(
    value.orientationProposal, `${subject}.orientationProposal`, 50
  );
  if (!ORIENTATION_SET.has(orientationProposal)) {
    throw new Error(`${subject}.orientationProposal 无效`);
  }
  const additionalSourceUrls = stringArray(
    value.additionalSourceUrls, `${subject}.additionalSourceUrls`
  );
  for (const url of additionalSourceUrls) {
    if (!url.startsWith("https://")) throw new Error(`${subject} 新增来源必须使用 HTTPS`);
  }
  return Object.freeze({
    contentId: stringValue(value.contentId, `${subject}.contentId`, 500),
    order: finiteInteger(value.order, `${subject}.order`),
    category: category as WesternPrimitiveContentCategory,
    key: stringValue(value.key, `${subject}.key`, 200),
    label: stringValue(value.label, `${subject}.label`, 500),
    candidateSummary: stringValue(value.candidateSummary, `${subject}.candidateSummary`, 4_000),
    resourceStatement: stringValue(value.resourceStatement, `${subject}.resourceStatement`, 4_000),
    tensionStatement: stringValue(value.tensionStatement, `${subject}.tensionStatement`, 4_000),
    scopeNote: stringValue(value.scopeNote, `${subject}.scopeNote`, 4_000),
    reviewPrompt: stringValue(value.reviewPrompt, `${subject}.reviewPrompt`, 4_000),
    sourceIds: stringArray(value.sourceIds, `${subject}.sourceIds`),
    decision: decision as WesternContentReviewDecision,
    orientationProposal: orientationProposal as WesternContentReviewOrientationProposal,
    selectedTradition: stringValue(value.selectedTradition, `${subject}.selectedTradition`, 2_000),
    decisionReason: stringValue(value.decisionReason, `${subject}.decisionReason`, 4_000),
    applicabilityConditions: stringValue(
      value.applicabilityConditions, `${subject}.applicabilityConditions`, 4_000
    ),
    counterexamples: stringValue(value.counterexamples, `${subject}.counterexamples`, 4_000),
    revisionRequest: stringValue(value.revisionRequest, `${subject}.revisionRequest`, 4_000),
    additionalSourceUrls,
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

function parseCounts(value: unknown): WesternContentReviewCounts {
  assertRecord(value, "反馈 declaredCounts");
  assertExactKeys(value, COUNT_KEYS, "反馈 declaredCounts");
  return Object.freeze({
    total: finiteInteger(value.total, "declaredCounts.total") as 43,
    unresolved: finiteInteger(value.unresolved, "declaredCounts.unresolved"),
    approve: finiteInteger(value.approve, "declaredCounts.approve"),
    revise: finiteInteger(value.revise, "declaredCounts.revise"),
    reject: finiteInteger(value.reject, "declaredCounts.reject")
  });
}

function parseOrientationCounts(value: unknown): WesternContentReviewOrientationCounts {
  assertRecord(value, "反馈 declaredOrientationProposalCounts");
  assertExactKeys(value, ORIENTATION_COUNT_KEYS, "反馈 declaredOrientationProposalCounts");
  return Object.freeze({
    total: finiteInteger(value.total, "declaredOrientationProposalCounts.total") as 43,
    unresolved: finiteInteger(value.unresolved, "declaredOrientationProposalCounts.unresolved"),
    potentiallySupportive: finiteInteger(
      value.potentiallySupportive, "declaredOrientationProposalCounts.potentiallySupportive"
    ),
    potentiallyChallenging: finiteInteger(
      value.potentiallyChallenging, "declaredOrientationProposalCounts.potentiallyChallenging"
    ),
    mixedConditional: finiteInteger(
      value.mixedConditional, "declaredOrientationProposalCounts.mixedConditional"
    ),
    notAssessable: finiteInteger(
      value.notAssessable, "declaredOrientationProposalCounts.notAssessable"
    )
  });
}

function parseBoundary(value: unknown): WesternContentReviewBoundary {
  assertRecord(value, "反馈 boundary");
  assertExactKeys(value, BOUNDARY_KEYS, "反馈 boundary");
  return Object.freeze({
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
    ruleArtifactOrStorageMutationPerformed: falseValue(
      value.ruleArtifactOrStorageMutationPerformed,
      "boundary.ruleArtifactOrStorageMutationPerformed"
    ),
    dynamicCompositionReviewed: falseValue(
      value.dynamicCompositionReviewed, "boundary.dynamicCompositionReviewed"
    ),
    goodBadOrientation: nullValue(value.goodBadOrientation, "boundary.goodBadOrientation"),
    eventOutcome: nullValue(value.eventOutcome, "boundary.eventOutcome"),
    result: nullValue(value.result, "boundary.result")
  });
}

function parseEnvelope(raw: string): WesternContentReviewFeedbackEnvelope {
  let input: unknown;
  try {
    input = JSON.parse(raw.replace(/^\uFEFF/u, "")) as unknown;
  } catch (reason) {
    throw new Error("西洋基础内容审稿反馈不是有效 JSON", { cause: reason });
  }
  assertRecord(input, "西洋基础内容审稿反馈");
  assertExactKeys(input, ROOT_KEYS, "西洋基础内容审稿反馈");
  if (!Array.isArray(input.sourceRegistry)) throw new Error("反馈 sourceRegistry 必须是数组");
  if (!Array.isArray(input.items)) throw new Error("反馈 items 必须是数组");
  return freezeEnvelope({
    profile: parseProfile(input.profile),
    catalogBinding: parseBinding(input.catalogBinding),
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

async function validateEnvelopeAgainstCurrentCatalog(
  envelope: WesternContentReviewFeedbackEnvelope
): Promise<{
  counts: WesternContentReviewCounts;
  orientationProposalCounts: WesternContentReviewOrientationCounts;
  reviewerAttributionComplete: boolean;
}> {
  const candidates = WESTERN_PRIMITIVE_CONTENT_REVIEW_CANDIDATES;
  const sourceRegistry = createSourceRegistry();
  const expectedBinding = await createCatalogBinding(candidates, sourceRegistry);
  const binding = envelope.catalogBinding;
  if (binding.contentLayerVersion !== expectedBinding.contentLayerVersion
    || binding.primitiveCatalogVersion !== expectedBinding.primitiveCatalogVersion
    || binding.catalogSha256 !== expectedBinding.catalogSha256
    || binding.orderedContentIdsSha256 !== expectedBinding.orderedContentIdsSha256
    || binding.sourceRegistrySha256 !== expectedBinding.sourceRegistrySha256
    || binding.itemCount !== expectedBinding.itemCount
    || binding.sourceCount !== expectedBinding.sourceCount) {
    throw new Error("审稿反馈没有绑定当前 43 项西洋基础内容或摘要已失配");
  }
  if (JSON.stringify(envelope.sourceRegistry) !== JSON.stringify(sourceRegistry)) {
    throw new Error("审稿反馈的 31 条来源登记与当前快照不一致");
  }
  if (envelope.items.length !== candidates.length) {
    throw new Error(`审稿反馈必须恰好覆盖 ${candidates.length} 项基础内容`);
  }

  let hasHumanInput = false;
  for (const [index, feedback] of envelope.items.entries()) {
    const expected = candidates[index]!;
    if (feedback.contentId !== expected.contentId
      || feedback.order !== expected.order
      || feedback.category !== expected.category
      || feedback.key !== expected.key
      || feedback.label !== expected.label
      || feedback.candidateSummary !== expected.candidateSummary
      || feedback.resourceStatement !== expected.resourceStatement
      || feedback.tensionStatement !== expected.tensionStatement
      || feedback.scopeNote !== expected.scopeNote
      || feedback.reviewPrompt !== expected.reviewPrompt
      || !sameStrings(feedback.sourceIds, expected.sourceIds)) {
      throw new Error(`审稿反馈第 ${index + 1} 项与当前基础内容快照不一致`);
    }
    if (feedback.decision === "unresolved") {
      if (feedback.orientationProposal !== "unresolved"
        || feedback.selectedTradition.trim()
        || feedback.decisionReason.trim()
        || feedback.applicabilityConditions.trim()
        || feedback.counterexamples.trim()
        || feedback.revisionRequest.trim()) {
        throw new Error(`未裁决项不得填写方向提案或裁决字段：${feedback.contentId}`);
      }
    } else {
      hasHumanInput = true;
      if (feedback.orientationProposal === "unresolved") {
        throw new Error(`已裁决项必须填写条件化方向提案：${feedback.contentId}`);
      }
      if (!feedback.selectedTradition.trim()
        || !feedback.decisionReason.trim()
        || !feedback.applicabilityConditions.trim()
        || !feedback.counterexamples.trim()) {
        throw new Error(
          `已裁决项必须填写传统、决定理由、成立条件与反例：${feedback.contentId}`
        );
      }
      if (feedback.decision === "revise" && !feedback.revisionRequest.trim()) {
        throw new Error(`退修项必须填写修改要求：${feedback.contentId}`);
      }
      if (feedback.decision !== "revise" && feedback.revisionRequest.trim()) {
        throw new Error(`只有退修项可以填写修改要求：${feedback.contentId}`);
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
      "填写任何审稿内容后，必须提供 reviewerId、显示名、专业说明、ISO 审稿时间、方法与传统范围"
    );
  }

  const counts = makeCounts(envelope.items);
  if (COUNT_KEYS.some((key) => (
    envelope.declaredCounts[key as keyof WesternContentReviewCounts]
    !== counts[key as keyof WesternContentReviewCounts]
  ))) {
    throw new Error("审稿反馈 declaredCounts 与逐项决定不一致");
  }
  const orientationProposalCounts = makeOrientationCounts(envelope.items);
  if (ORIENTATION_COUNT_KEYS.some((key) => (
    envelope.declaredOrientationProposalCounts[
      key as keyof WesternContentReviewOrientationCounts
    ] !== orientationProposalCounts[key as keyof WesternContentReviewOrientationCounts]
  ))) {
    throw new Error("审稿反馈 declaredOrientationProposalCounts 与逐项方向提案不一致");
  }
  return { counts, orientationProposalCounts, reviewerAttributionComplete };
}

export async function preflightWesternContentReviewFeedback(
  raw: string
): Promise<WesternContentReviewFeedbackPreflight> {
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes === 0 || bytes > WESTERN_CONTENT_REVIEW_FEEDBACK_MAX_BYTES) {
    throw new Error("西洋基础内容审稿反馈必须是 1 字节至 2 MiB 的 UTF-8 JSON");
  }
  const envelope = parseEnvelope(raw);
  const { counts, orientationProposalCounts, reviewerAttributionComplete } =
    await validateEnvelopeAgainstCurrentCatalog(envelope);
  const resolvedCount = counts.approve + counts.revise + counts.reject;
  return Object.freeze({
    envelope,
    counts,
    orientationProposalCounts,
    resolvedCount,
    unresolvedCount: counts.unresolved,
    allItemsResolved: counts.unresolved === 0,
    reviewerAttributionComplete,
    identityVerified: false,
    digitalSignatureVerified: false,
    scientificValidityEstablished: false,
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    ruleArtifactOrStorageMutationPerformed: false,
    dynamicCompositionReviewed: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
}
