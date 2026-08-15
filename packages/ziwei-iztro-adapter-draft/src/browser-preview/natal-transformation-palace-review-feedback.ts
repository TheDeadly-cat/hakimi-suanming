import type {
  BrowserProbeMajorStarSourceRef,
  BrowserProbeNatalTransformationLabel,
  BrowserProbeNatalTransformationPalaceCandidateContent,
  BrowserProbePalaceRoleId
} from "./browser-protocol.ts";
import { ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES }
  from "./major-star-palace-content.ts";
import { ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES }
  from "./natal-transformation-content.ts";
import {
  ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_CONTENT_VERSION
} from "./natal-transformation-palace-content.ts";

export const ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE = Object.freeze({
  formatVersion: "hakimi.ziwei.natal_transformation_palace_review_feedback/0.1.0",
  templateVersion: "0.10.0",
  expectedItemCount: 48,
  expectedSourceCount: 5,
  workflowMode: "human_attributed_read_only_preflight" as const,
  identityPolicy: "self_declared_not_verified" as const,
  signaturePolicy: "none" as const,
  integrationPolicy: "manual_code_review_only" as const,
  mutationPolicy: "no_artifact_revision_or_storage_write" as const,
  allowedDecisions: Object.freeze(["unresolved", "approve", "revise", "reject"] as const),
  allowedOrientationProposals: Object.freeze([
    "unresolved",
    "potentially_supportive",
    "potentially_challenging",
    "mixed_conditional",
    "not_assessable"
  ] as const),
  expertTruthClaimed: false as const,
  formalActivationAllowed: false as const,
  autoIntegrationAllowed: false as const
});

export const ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_FILENAME =
  "hakimi-ziwei-four-transformations-twelve-palaces-review-v010.json" as const;
export const ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_MAX_BYTES =
  2 * 1024 * 1024;

export type ZiweiNatalTransformationPalaceReviewDecision =
  (typeof ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE.allowedDecisions)[number];
export type ZiweiNatalTransformationPalaceOrientationProposal =
  (typeof ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE.allowedOrientationProposals)[number];

export interface ZiweiNatalTransformationPalaceReviewSource {
  sourceId: string;
  sourceKind: string;
  title: string;
  sourceUrl: string;
  accessedAt: string;
  usageBoundary: string;
  expertTruthClaimed: false;
}

export interface ZiweiNatalTransformationPalaceReviewMatrixBinding {
  contentVersion: typeof ZIWEI_NATAL_TRANSFORMATION_PALACE_CONTENT_VERSION;
  matrixSha256: string;
  orderedContentIdsSha256: string;
  sourceRegistrySha256: string;
  itemCount: 48;
  sourceCount: 5;
}

export interface ZiweiNatalTransformationPalaceReviewReviewer {
  reviewerId: string;
  displayName: string;
  affiliation: string;
  expertiseStatement: string;
  identityEvidenceReference: string;
  identityVerified: false;
}

export interface ZiweiNatalTransformationPalaceReviewSession {
  reviewedAt: string;
  methodology: string;
  schoolScope: string;
  generalNotes: string;
}

export interface ZiweiNatalTransformationPalaceReviewItem {
  contentId: string;
  order: number;
  transformationLabel: BrowserProbeNatalTransformationLabel;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  genericCandidateContentId: string;
  palaceRoleContentId: string;
  positionSummary: string;
  counterweight: string;
  reviewPrompt: string;
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  decision: ZiweiNatalTransformationPalaceReviewDecision;
  orientationProposal: ZiweiNatalTransformationPalaceOrientationProposal;
  selectedSchool: string;
  decisionReason: string;
  applicabilityConditions: string;
  counterexamples: string;
  revisionRequest: string;
  additionalSourceUrls: readonly string[];
  expertTruthClaimed: false;
  formalActivationAllowed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface ZiweiNatalTransformationPalaceReviewCounts {
  total: 48;
  unresolved: number;
  approve: number;
  revise: number;
  reject: number;
}

export interface ZiweiNatalTransformationPalaceOrientationProposalCounts {
  total: 48;
  unresolved: number;
  potentiallySupportive: number;
  potentiallyChallenging: number;
  mixedConditional: number;
  notAssessable: number;
}

export interface ZiweiNatalTransformationPalaceReviewBoundary {
  identityVerified: false;
  digitalSignatureVerified: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  artifactRevisionOrStorageMutationPerformed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

export interface ZiweiNatalTransformationPalaceReviewFeedbackEnvelope {
  profile: typeof ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE;
  matrixBinding: ZiweiNatalTransformationPalaceReviewMatrixBinding;
  sourceRegistry: readonly ZiweiNatalTransformationPalaceReviewSource[];
  reviewer: ZiweiNatalTransformationPalaceReviewReviewer;
  reviewSession: ZiweiNatalTransformationPalaceReviewSession;
  items: readonly ZiweiNatalTransformationPalaceReviewItem[];
  declaredCounts: ZiweiNatalTransformationPalaceReviewCounts;
  declaredOrientationProposalCounts: ZiweiNatalTransformationPalaceOrientationProposalCounts;
  boundary: ZiweiNatalTransformationPalaceReviewBoundary;
}

export interface ZiweiNatalTransformationPalaceReviewFeedbackPreflight {
  envelope: ZiweiNatalTransformationPalaceReviewFeedbackEnvelope;
  counts: ZiweiNatalTransformationPalaceReviewCounts;
  orientationProposalCounts: ZiweiNatalTransformationPalaceOrientationProposalCounts;
  resolvedCount: number;
  unresolvedCount: number;
  allItemsResolved: boolean;
  reviewerAttributionComplete: boolean;
  identityVerified: false;
  digitalSignatureVerified: false;
  eligibleForFormalActivation: false;
  autoIntegrationAllowed: false;
  artifactRevisionOrStorageMutationPerformed: false;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
}

const ROOT_KEYS = Object.freeze([
  "profile",
  "matrixBinding",
  "sourceRegistry",
  "reviewer",
  "reviewSession",
  "items",
  "declaredCounts",
  "declaredOrientationProposalCounts",
  "boundary"
]);
const PROFILE_KEYS = Object.freeze([
  "formatVersion",
  "templateVersion",
  "expectedItemCount",
  "expectedSourceCount",
  "workflowMode",
  "identityPolicy",
  "signaturePolicy",
  "integrationPolicy",
  "mutationPolicy",
  "allowedDecisions",
  "allowedOrientationProposals",
  "expertTruthClaimed",
  "formalActivationAllowed",
  "autoIntegrationAllowed"
]);
const BINDING_KEYS = Object.freeze([
  "contentVersion",
  "matrixSha256",
  "orderedContentIdsSha256",
  "sourceRegistrySha256",
  "itemCount",
  "sourceCount"
]);
const SOURCE_KEYS = Object.freeze([
  "sourceId",
  "sourceKind",
  "title",
  "sourceUrl",
  "accessedAt",
  "usageBoundary",
  "expertTruthClaimed"
]);
const REVIEWER_KEYS = Object.freeze([
  "reviewerId",
  "displayName",
  "affiliation",
  "expertiseStatement",
  "identityEvidenceReference",
  "identityVerified"
]);
const SESSION_KEYS = Object.freeze([
  "reviewedAt",
  "methodology",
  "schoolScope",
  "generalNotes"
]);
const ITEM_KEYS = Object.freeze([
  "contentId",
  "order",
  "transformationLabel",
  "palaceRoleId",
  "palaceRoleLabel",
  "genericCandidateContentId",
  "palaceRoleContentId",
  "positionSummary",
  "counterweight",
  "reviewPrompt",
  "sourceRefs",
  "decision",
  "orientationProposal",
  "selectedSchool",
  "decisionReason",
  "applicabilityConditions",
  "counterexamples",
  "revisionRequest",
  "additionalSourceUrls",
  "expertTruthClaimed",
  "formalActivationAllowed",
  "goodBadOrientation",
  "eventOutcome",
  "result"
]);
const SOURCE_REF_KEYS = Object.freeze(["sourceId", "locator"]);
const COUNT_KEYS = Object.freeze(["total", "unresolved", "approve", "revise", "reject"]);
const ORIENTATION_COUNT_KEYS = Object.freeze([
  "total",
  "unresolved",
  "potentiallySupportive",
  "potentiallyChallenging",
  "mixedConditional",
  "notAssessable"
]);
const BOUNDARY_KEYS = Object.freeze([
  "identityVerified",
  "digitalSignatureVerified",
  "eligibleForFormalActivation",
  "autoIntegrationAllowed",
  "artifactRevisionOrStorageMutationPerformed",
  "goodBadOrientation",
  "eventOutcome",
  "result"
]);

const DECISION_SET = new Set<string>(
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE.allowedDecisions
);
const ORIENTATION_PROPOSAL_SET = new Set<string>(
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE.allowedOrientationProposals
);
const TRANSFORMATION_LABEL_SET = new Set<string>(["禄", "权", "科", "忌"]);
const PALACE_ROLE_SET = new Set<string>([
  "life",
  "siblings",
  "spouse",
  "children",
  "wealth",
  "health",
  "travel",
  "friends",
  "career",
  "property",
  "wellbeing",
  "parents"
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
  if (actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])) {
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
  const result = value.map((entry, index) => stringValue(entry, `${subject}[${index}]`, 2_000));
  if (new Set(result).size !== result.length) throw new Error(`${subject} 不得包含重复项`);
  return Object.freeze(result);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameSourceRefs(
  left: readonly BrowserProbeMajorStarSourceRef[],
  right: readonly BrowserProbeMajorStarSourceRef[]
): boolean {
  return left.length === right.length && left.every((sourceRef, index) => (
    sourceRef.sourceId === right[index]?.sourceId && sourceRef.locator === right[index]?.locator
  ));
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
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createSourceRegistry(): readonly ZiweiNatalTransformationPalaceReviewSource[] {
  const sources = [
    ...ZIWEI_NATAL_TRANSFORMATION_CONTENT_SOURCES,
    ...ZIWEI_MAJOR_STAR_PALACE_CONTENT_SOURCES
  ].map((source) => Object.freeze<ZiweiNatalTransformationPalaceReviewSource>({
    sourceId: source.sourceId,
    sourceKind: source.sourceKind,
    title: source.title,
    sourceUrl: source.sourceUrl,
    accessedAt: source.accessedAt,
    usageBoundary: source.usageBoundary,
    expertTruthClaimed: false
  }));
  if (sources.length !== 5 || new Set(sources.map((source) => source.sourceId)).size !== 5) {
    throw new Error("紫微四化十二宫审稿模板必须绑定恰好五个既有来源");
  }
  return Object.freeze(sources);
}

function matrixSnapshot(
  candidates: readonly BrowserProbeNatalTransformationPalaceCandidateContent[]
): readonly object[] {
  return Object.freeze(candidates.map((candidate, index) => Object.freeze({
    contentId: candidate.contentId,
    order: index + 1,
    transformationLabel: candidate.transformationLabel,
    palaceRoleId: candidate.palaceRoleId,
    palaceRoleLabel: candidate.palaceRoleLabel,
    genericCandidateContentId: candidate.genericCandidateContentId,
    palaceRoleContentId: candidate.palaceRoleContentId,
    positionSummary: candidate.positionSummary,
    counterweight: candidate.counterweight,
    reviewPrompt: candidate.reviewPrompt,
    sourceRefs: candidate.sourceRefs.map((sourceRef) => ({ ...sourceRef }))
  })));
}

async function createMatrixBinding(
  candidates: readonly BrowserProbeNatalTransformationPalaceCandidateContent[],
  sourceRegistry: readonly ZiweiNatalTransformationPalaceReviewSource[]
): Promise<ZiweiNatalTransformationPalaceReviewMatrixBinding> {
  const snapshot = matrixSnapshot(candidates);
  return Object.freeze({
    contentVersion: ZIWEI_NATAL_TRANSFORMATION_PALACE_CONTENT_VERSION,
    matrixSha256: await sha256Text(`${JSON.stringify(snapshot)}\n`),
    orderedContentIdsSha256: await sha256Text(
      `${candidates.map((candidate) => candidate.contentId).join("\n")}\n`
    ),
    sourceRegistrySha256: await sha256Text(`${JSON.stringify(sourceRegistry)}\n`),
    itemCount: 48 as const,
    sourceCount: 5 as const
  });
}

function makeCounts(
  items: readonly ZiweiNatalTransformationPalaceReviewItem[]
): ZiweiNatalTransformationPalaceReviewCounts {
  const counts = {
    total: 48,
    unresolved: 0,
    approve: 0,
    revise: 0,
    reject: 0
  } satisfies ZiweiNatalTransformationPalaceReviewCounts;
  const mutable = { ...counts };
  for (const item of items) mutable[item.decision] += 1;
  return Object.freeze(mutable);
}

function makeOrientationProposalCounts(
  items: readonly ZiweiNatalTransformationPalaceReviewItem[]
): ZiweiNatalTransformationPalaceOrientationProposalCounts {
  const mutable = {
    total: 48,
    unresolved: 0,
    potentiallySupportive: 0,
    potentiallyChallenging: 0,
    mixedConditional: 0,
    notAssessable: 0
  };
  for (const item of items) {
    switch (item.orientationProposal) {
      case "unresolved":
        mutable.unresolved += 1;
        break;
      case "potentially_supportive":
        mutable.potentiallySupportive += 1;
        break;
      case "potentially_challenging":
        mutable.potentiallyChallenging += 1;
        break;
      case "mixed_conditional":
        mutable.mixedConditional += 1;
        break;
      case "not_assessable":
        mutable.notAssessable += 1;
        break;
    }
  }
  return Object.freeze(mutable) as ZiweiNatalTransformationPalaceOrientationProposalCounts;
}

function freezeEnvelope(
  envelope: ZiweiNatalTransformationPalaceReviewFeedbackEnvelope
): ZiweiNatalTransformationPalaceReviewFeedbackEnvelope {
  return Object.freeze({
    profile: ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE,
    matrixBinding: Object.freeze({ ...envelope.matrixBinding }),
    sourceRegistry: Object.freeze(envelope.sourceRegistry.map((source) => Object.freeze({ ...source }))),
    reviewer: Object.freeze({ ...envelope.reviewer }),
    reviewSession: Object.freeze({ ...envelope.reviewSession }),
    items: Object.freeze(envelope.items.map((item) => Object.freeze({
      ...item,
      sourceRefs: Object.freeze(item.sourceRefs.map((sourceRef) => Object.freeze({ ...sourceRef }))),
      additionalSourceUrls: Object.freeze([...item.additionalSourceUrls])
    }))),
    declaredCounts: Object.freeze({ ...envelope.declaredCounts }),
    declaredOrientationProposalCounts:
      Object.freeze({ ...envelope.declaredOrientationProposalCounts }),
    boundary: Object.freeze({ ...envelope.boundary })
  });
}

export async function createZiweiNatalTransformationPalaceReviewFeedbackTemplate(): Promise<
  ZiweiNatalTransformationPalaceReviewFeedbackEnvelope
> {
  const candidates = ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT;
  if (candidates.length !== 48) {
    throw new Error("紫微四化十二宫审稿模板只能绑定当前 48 条位置化候选");
  }
  const sourceRegistry = createSourceRegistry();
  const items = Object.freeze(candidates.map((candidate, index) => Object.freeze({
    contentId: candidate.contentId,
    order: index + 1,
    transformationLabel: candidate.transformationLabel,
    palaceRoleId: candidate.palaceRoleId,
    palaceRoleLabel: candidate.palaceRoleLabel,
    genericCandidateContentId: candidate.genericCandidateContentId,
    palaceRoleContentId: candidate.palaceRoleContentId,
    positionSummary: candidate.positionSummary,
    counterweight: candidate.counterweight,
    reviewPrompt: candidate.reviewPrompt,
    sourceRefs: Object.freeze(candidate.sourceRefs.map(
      (sourceRef) => Object.freeze({ ...sourceRef })
    )),
    decision: "unresolved" as const,
    orientationProposal: "unresolved" as const,
    selectedSchool: "",
    decisionReason: "",
    applicabilityConditions: "",
    counterexamples: "",
    revisionRequest: "",
    additionalSourceUrls: Object.freeze([] as string[]),
    expertTruthClaimed: false as const,
    formalActivationAllowed: false as const,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  })));
  return freezeEnvelope({
    profile: ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE,
    matrixBinding: await createMatrixBinding(candidates, sourceRegistry),
    sourceRegistry,
    reviewer: Object.freeze({
      reviewerId: "",
      displayName: "",
      affiliation: "",
      expertiseStatement: "",
      identityEvidenceReference: "",
      identityVerified: false
    }),
    reviewSession: Object.freeze({
      reviewedAt: "",
      methodology: "",
      schoolScope: "",
      generalNotes: ""
    }),
    items,
    declaredCounts: makeCounts(items),
    declaredOrientationProposalCounts: makeOrientationProposalCounts(items),
    boundary: Object.freeze({
      identityVerified: false,
      digitalSignatureVerified: false,
      eligibleForFormalActivation: false,
      autoIntegrationAllowed: false,
      artifactRevisionOrStorageMutationPerformed: false,
      goodBadOrientation: null,
      eventOutcome: null,
      result: null
    })
  });
}

export function serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate(
  template: ZiweiNatalTransformationPalaceReviewFeedbackEnvelope
): string {
  return `${JSON.stringify(template, null, 2)}\n`;
}

function parseProfile(
  value: unknown
): typeof ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE {
  assertRecord(value, "反馈 profile");
  assertExactKeys(value, PROFILE_KEYS, "反馈 profile");
  const expected = ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_PROFILE;
  for (const key of PROFILE_KEYS) {
    const current = value[key];
    const expectedValue = expected[key as keyof typeof expected];
    if (JSON.stringify(current) !== JSON.stringify(expectedValue)) {
      throw new Error(`反馈 profile.${key} 不匹配`);
    }
  }
  return expected;
}

function parseBinding(value: unknown): ZiweiNatalTransformationPalaceReviewMatrixBinding {
  assertRecord(value, "反馈 matrixBinding");
  assertExactKeys(value, BINDING_KEYS, "反馈 matrixBinding");
  return Object.freeze({
    contentVersion: stringValue(
      value.contentVersion,
      "matrixBinding.contentVersion",
      200
    ) as typeof ZIWEI_NATAL_TRANSFORMATION_PALACE_CONTENT_VERSION,
    matrixSha256: stringValue(value.matrixSha256, "matrixBinding.matrixSha256", 64),
    orderedContentIdsSha256: stringValue(
      value.orderedContentIdsSha256,
      "matrixBinding.orderedContentIdsSha256",
      64
    ),
    sourceRegistrySha256: stringValue(
      value.sourceRegistrySha256,
      "matrixBinding.sourceRegistrySha256",
      64
    ),
    itemCount: finiteInteger(value.itemCount, "matrixBinding.itemCount") as 48,
    sourceCount: finiteInteger(value.sourceCount, "matrixBinding.sourceCount") as 5
  });
}

function parseSource(value: unknown, index: number): ZiweiNatalTransformationPalaceReviewSource {
  const subject = `反馈 sourceRegistry[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, SOURCE_KEYS, subject);
  return Object.freeze({
    sourceId: stringValue(value.sourceId, `${subject}.sourceId`, 500),
    sourceKind: stringValue(value.sourceKind, `${subject}.sourceKind`, 200),
    title: stringValue(value.title, `${subject}.title`, 1_000),
    sourceUrl: stringValue(value.sourceUrl, `${subject}.sourceUrl`, 2_000),
    accessedAt: stringValue(value.accessedAt, `${subject}.accessedAt`, 100),
    usageBoundary: stringValue(value.usageBoundary, `${subject}.usageBoundary`, 4_000),
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`)
  });
}

function parseReviewer(value: unknown): ZiweiNatalTransformationPalaceReviewReviewer {
  assertRecord(value, "反馈 reviewer");
  assertExactKeys(value, REVIEWER_KEYS, "反馈 reviewer");
  return Object.freeze({
    reviewerId: stringValue(value.reviewerId, "reviewer.reviewerId", 200),
    displayName: stringValue(value.displayName, "reviewer.displayName", 200),
    affiliation: stringValue(value.affiliation, "reviewer.affiliation", 500),
    expertiseStatement: stringValue(value.expertiseStatement, "reviewer.expertiseStatement", 2_000),
    identityEvidenceReference: stringValue(
      value.identityEvidenceReference,
      "reviewer.identityEvidenceReference",
      2_000
    ),
    identityVerified: falseValue(value.identityVerified, "reviewer.identityVerified")
  });
}

function parseSession(value: unknown): ZiweiNatalTransformationPalaceReviewSession {
  assertRecord(value, "反馈 reviewSession");
  assertExactKeys(value, SESSION_KEYS, "反馈 reviewSession");
  return Object.freeze({
    reviewedAt: stringValue(value.reviewedAt, "reviewSession.reviewedAt", 100),
    methodology: stringValue(value.methodology, "reviewSession.methodology", 4_000),
    schoolScope: stringValue(value.schoolScope, "reviewSession.schoolScope", 2_000),
    generalNotes: stringValue(value.generalNotes, "reviewSession.generalNotes", 8_000)
  });
}

function parseSourceRef(value: unknown, itemIndex: number, refIndex: number): BrowserProbeMajorStarSourceRef {
  const subject = `反馈 items[${itemIndex}].sourceRefs[${refIndex}]`;
  assertRecord(value, subject);
  assertExactKeys(value, SOURCE_REF_KEYS, subject);
  return Object.freeze({
    sourceId: stringValue(value.sourceId, `${subject}.sourceId`, 500),
    locator: stringValue(value.locator, `${subject}.locator`, 2_000)
  });
}

function parseItem(value: unknown, index: number): ZiweiNatalTransformationPalaceReviewItem {
  const subject = `反馈 items[${index}]`;
  assertRecord(value, subject);
  assertExactKeys(value, ITEM_KEYS, subject);
  const transformationLabel = stringValue(
    value.transformationLabel,
    `${subject}.transformationLabel`,
    10
  );
  if (!TRANSFORMATION_LABEL_SET.has(transformationLabel)) {
    throw new Error(`${subject}.transformationLabel 无效`);
  }
  const palaceRoleId = stringValue(value.palaceRoleId, `${subject}.palaceRoleId`, 100);
  if (!PALACE_ROLE_SET.has(palaceRoleId)) throw new Error(`${subject}.palaceRoleId 无效`);
  const decision = stringValue(value.decision, `${subject}.decision`, 30);
  if (!DECISION_SET.has(decision)) throw new Error(`${subject}.decision 无效`);
  const orientationProposal = stringValue(
    value.orientationProposal,
    `${subject}.orientationProposal`,
    50
  );
  if (!ORIENTATION_PROPOSAL_SET.has(orientationProposal)) {
    throw new Error(`${subject}.orientationProposal 无效`);
  }
  if (!Array.isArray(value.sourceRefs)) throw new Error(`${subject}.sourceRefs 必须是数组`);
  const sourceRefs = Object.freeze(value.sourceRefs.map((sourceRef, refIndex) => (
    parseSourceRef(sourceRef, index, refIndex)
  )));
  const additionalSourceUrls = stringArray(
    value.additionalSourceUrls,
    `${subject}.additionalSourceUrls`
  );
  for (const url of additionalSourceUrls) {
    if (!url.startsWith("https://")) throw new Error(`${subject} 新增来源必须使用 HTTPS`);
  }
  return Object.freeze({
    contentId: stringValue(value.contentId, `${subject}.contentId`, 500),
    order: finiteInteger(value.order, `${subject}.order`),
    transformationLabel: transformationLabel as BrowserProbeNatalTransformationLabel,
    palaceRoleId: palaceRoleId as BrowserProbePalaceRoleId,
    palaceRoleLabel: stringValue(value.palaceRoleLabel, `${subject}.palaceRoleLabel`, 200),
    genericCandidateContentId: stringValue(
      value.genericCandidateContentId,
      `${subject}.genericCandidateContentId`,
      500
    ),
    palaceRoleContentId: stringValue(
      value.palaceRoleContentId,
      `${subject}.palaceRoleContentId`,
      500
    ),
    positionSummary: stringValue(value.positionSummary, `${subject}.positionSummary`, 4_000),
    counterweight: stringValue(value.counterweight, `${subject}.counterweight`, 4_000),
    reviewPrompt: stringValue(value.reviewPrompt, `${subject}.reviewPrompt`, 4_000),
    sourceRefs,
    decision: decision as ZiweiNatalTransformationPalaceReviewDecision,
    orientationProposal:
      orientationProposal as ZiweiNatalTransformationPalaceOrientationProposal,
    selectedSchool: stringValue(value.selectedSchool, `${subject}.selectedSchool`, 1_000),
    decisionReason: stringValue(value.decisionReason, `${subject}.decisionReason`, 4_000),
    applicabilityConditions: stringValue(
      value.applicabilityConditions,
      `${subject}.applicabilityConditions`,
      4_000
    ),
    counterexamples: stringValue(value.counterexamples, `${subject}.counterexamples`, 4_000),
    revisionRequest: stringValue(value.revisionRequest, `${subject}.revisionRequest`, 4_000),
    additionalSourceUrls,
    expertTruthClaimed: falseValue(value.expertTruthClaimed, `${subject}.expertTruthClaimed`),
    formalActivationAllowed: falseValue(
      value.formalActivationAllowed,
      `${subject}.formalActivationAllowed`
    ),
    goodBadOrientation: nullValue(value.goodBadOrientation, `${subject}.goodBadOrientation`),
    eventOutcome: nullValue(value.eventOutcome, `${subject}.eventOutcome`),
    result: nullValue(value.result, `${subject}.result`)
  });
}

function parseCounts(value: unknown): ZiweiNatalTransformationPalaceReviewCounts {
  assertRecord(value, "反馈 declaredCounts");
  assertExactKeys(value, COUNT_KEYS, "反馈 declaredCounts");
  return Object.freeze({
    total: finiteInteger(value.total, "declaredCounts.total") as 48,
    unresolved: finiteInteger(value.unresolved, "declaredCounts.unresolved"),
    approve: finiteInteger(value.approve, "declaredCounts.approve"),
    revise: finiteInteger(value.revise, "declaredCounts.revise"),
    reject: finiteInteger(value.reject, "declaredCounts.reject")
  });
}

function parseOrientationProposalCounts(
  value: unknown
): ZiweiNatalTransformationPalaceOrientationProposalCounts {
  assertRecord(value, "反馈 declaredOrientationProposalCounts");
  assertExactKeys(value, ORIENTATION_COUNT_KEYS, "反馈 declaredOrientationProposalCounts");
  return Object.freeze({
    total: finiteInteger(value.total, "declaredOrientationProposalCounts.total") as 48,
    unresolved: finiteInteger(value.unresolved, "declaredOrientationProposalCounts.unresolved"),
    potentiallySupportive: finiteInteger(
      value.potentiallySupportive,
      "declaredOrientationProposalCounts.potentiallySupportive"
    ),
    potentiallyChallenging: finiteInteger(
      value.potentiallyChallenging,
      "declaredOrientationProposalCounts.potentiallyChallenging"
    ),
    mixedConditional: finiteInteger(
      value.mixedConditional,
      "declaredOrientationProposalCounts.mixedConditional"
    ),
    notAssessable: finiteInteger(
      value.notAssessable,
      "declaredOrientationProposalCounts.notAssessable"
    )
  });
}

function parseBoundary(value: unknown): ZiweiNatalTransformationPalaceReviewBoundary {
  assertRecord(value, "反馈 boundary");
  assertExactKeys(value, BOUNDARY_KEYS, "反馈 boundary");
  return Object.freeze({
    identityVerified: falseValue(value.identityVerified, "boundary.identityVerified"),
    digitalSignatureVerified: falseValue(
      value.digitalSignatureVerified,
      "boundary.digitalSignatureVerified"
    ),
    eligibleForFormalActivation: falseValue(
      value.eligibleForFormalActivation,
      "boundary.eligibleForFormalActivation"
    ),
    autoIntegrationAllowed: falseValue(
      value.autoIntegrationAllowed,
      "boundary.autoIntegrationAllowed"
    ),
    artifactRevisionOrStorageMutationPerformed: falseValue(
      value.artifactRevisionOrStorageMutationPerformed,
      "boundary.artifactRevisionOrStorageMutationPerformed"
    ),
    goodBadOrientation: nullValue(value.goodBadOrientation, "boundary.goodBadOrientation"),
    eventOutcome: nullValue(value.eventOutcome, "boundary.eventOutcome"),
    result: nullValue(value.result, "boundary.result")
  });
}

function parseEnvelope(raw: string): ZiweiNatalTransformationPalaceReviewFeedbackEnvelope {
  let input: unknown;
  try {
    input = JSON.parse(raw.replace(/^\uFEFF/u, "")) as unknown;
  } catch (reason) {
    throw new Error("紫微四化十二宫审稿反馈不是有效 JSON", { cause: reason });
  }
  assertRecord(input, "紫微四化十二宫审稿反馈");
  assertExactKeys(input, ROOT_KEYS, "紫微四化十二宫审稿反馈");
  if (!Array.isArray(input.sourceRegistry)) throw new Error("反馈 sourceRegistry 必须是数组");
  if (!Array.isArray(input.items)) throw new Error("反馈 items 必须是数组");
  return freezeEnvelope({
    profile: parseProfile(input.profile),
    matrixBinding: parseBinding(input.matrixBinding),
    sourceRegistry: Object.freeze(input.sourceRegistry.map(parseSource)),
    reviewer: parseReviewer(input.reviewer),
    reviewSession: parseSession(input.reviewSession),
    items: Object.freeze(input.items.map(parseItem)),
    declaredCounts: parseCounts(input.declaredCounts),
    declaredOrientationProposalCounts:
      parseOrientationProposalCounts(input.declaredOrientationProposalCounts),
    boundary: parseBoundary(input.boundary)
  });
}

function sameSourceRegistry(
  left: readonly ZiweiNatalTransformationPalaceReviewSource[],
  right: readonly ZiweiNatalTransformationPalaceReviewSource[]
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function validateEnvelopeAgainstCurrentMatrix(
  envelope: ZiweiNatalTransformationPalaceReviewFeedbackEnvelope
): Promise<{
  counts: ZiweiNatalTransformationPalaceReviewCounts;
  orientationProposalCounts: ZiweiNatalTransformationPalaceOrientationProposalCounts;
  reviewerAttributionComplete: boolean;
}> {
  const candidates = ZIWEI_NATAL_TRANSFORMATION_PALACE_CANDIDATE_CONTENT;
  const sourceRegistry = createSourceRegistry();
  const expectedBinding = await createMatrixBinding(candidates, sourceRegistry);
  const binding = envelope.matrixBinding;
  if (binding.contentVersion !== expectedBinding.contentVersion
    || binding.matrixSha256 !== expectedBinding.matrixSha256
    || binding.orderedContentIdsSha256 !== expectedBinding.orderedContentIdsSha256
    || binding.sourceRegistrySha256 !== expectedBinding.sourceRegistrySha256
    || binding.itemCount !== expectedBinding.itemCount
    || binding.sourceCount !== expectedBinding.sourceCount) {
    throw new Error("审稿反馈没有绑定当前 48 条四化十二宫候选或摘要已失配");
  }
  if (!sameSourceRegistry(envelope.sourceRegistry, sourceRegistry)) {
    throw new Error("审稿反馈的五来源登记与当前快照不一致");
  }
  if (envelope.items.length !== candidates.length) {
    throw new Error(`审稿反馈必须恰好覆盖 ${candidates.length} 条候选`);
  }

  let hasHumanInput = false;
  for (const [index, feedback] of envelope.items.entries()) {
    const expected = candidates[index]!;
    if (feedback.contentId !== expected.contentId
      || feedback.order !== index + 1
      || feedback.transformationLabel !== expected.transformationLabel
      || feedback.palaceRoleId !== expected.palaceRoleId
      || feedback.palaceRoleLabel !== expected.palaceRoleLabel
      || feedback.genericCandidateContentId !== expected.genericCandidateContentId
      || feedback.palaceRoleContentId !== expected.palaceRoleContentId
      || feedback.positionSummary !== expected.positionSummary
      || feedback.counterweight !== expected.counterweight
      || feedback.reviewPrompt !== expected.reviewPrompt
      || !sameSourceRefs(feedback.sourceRefs, expected.sourceRefs)) {
      throw new Error(`审稿反馈第 ${index + 1} 条与当前候选快照不一致`);
    }
    if (feedback.decision === "unresolved") {
      if (feedback.orientationProposal !== "unresolved"
        || feedback.selectedSchool.trim()
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
      if (!feedback.selectedSchool.trim()
        || !feedback.decisionReason.trim()
        || !feedback.applicabilityConditions.trim()
        || !feedback.counterexamples.trim()) {
        throw new Error(
          `已裁决项必须填写流派、决定理由、成立条件与反例：${feedback.contentId}`
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
    envelope.reviewSession.schoolScope,
    envelope.reviewSession.generalNotes
  ];
  if (reviewerValues.some((value) => value.trim())) hasHumanInput = true;
  const reviewerAttributionComplete = Boolean(
    envelope.reviewer.reviewerId.trim()
    && envelope.reviewer.displayName.trim()
    && envelope.reviewer.expertiseStatement.trim()
    && envelope.reviewSession.methodology.trim()
    && envelope.reviewSession.schoolScope.trim()
    && validReviewedAt(envelope.reviewSession.reviewedAt)
  );
  if (hasHumanInput && !reviewerAttributionComplete) {
    throw new Error(
      "填写任何审稿内容后，必须提供 reviewerId、显示名、专业说明、ISO 审稿时间、方法与流派范围"
    );
  }

  const counts = makeCounts(envelope.items);
  if (COUNT_KEYS.some((key) => (
    envelope.declaredCounts[key as keyof ZiweiNatalTransformationPalaceReviewCounts]
    !== counts[key as keyof ZiweiNatalTransformationPalaceReviewCounts]
  ))) {
    throw new Error("审稿反馈 declaredCounts 与逐条决定不一致");
  }
  const orientationProposalCounts = makeOrientationProposalCounts(envelope.items);
  if (ORIENTATION_COUNT_KEYS.some((key) => (
    envelope.declaredOrientationProposalCounts[
      key as keyof ZiweiNatalTransformationPalaceOrientationProposalCounts
    ] !== orientationProposalCounts[
      key as keyof ZiweiNatalTransformationPalaceOrientationProposalCounts
    ]
  ))) {
    throw new Error("审稿反馈 declaredOrientationProposalCounts 与逐条方向提案不一致");
  }
  return { counts, orientationProposalCounts, reviewerAttributionComplete };
}

export async function preflightZiweiNatalTransformationPalaceReviewFeedback(
  raw: string
): Promise<ZiweiNatalTransformationPalaceReviewFeedbackPreflight> {
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes === 0 || bytes > ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_MAX_BYTES) {
    throw new Error("紫微四化十二宫审稿反馈必须是 1 字节至 2 MiB 的 UTF-8 JSON");
  }
  const envelope = parseEnvelope(raw);
  const {
    counts,
    orientationProposalCounts,
    reviewerAttributionComplete
  } = await validateEnvelopeAgainstCurrentMatrix(envelope);
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
    eligibleForFormalActivation: false,
    autoIntegrationAllowed: false,
    artifactRevisionOrStorageMutationPerformed: false,
    goodBadOrientation: null,
    eventOutcome: null,
    result: null
  });
}
