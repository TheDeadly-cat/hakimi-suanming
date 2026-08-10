import { calculateChart, digestRuleProfile, ENGINE } from "@hakimi/bazi-core";
import {
  SCHEMA_VERSION,
  birthInputSchema,
  buildCalculatedChartHashPayload,
  caseRecordSchema,
  researchQuerySchema,
  revisionRecordSchema,
  ruleProfileSchema,
  type BirthInput,
  type CaseRecord,
  type ResearchCaseQuery,
  type RevisionRecord,
  type TransitNodeType,
  type TransitSlot,
} from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  calculateTransitSnapshot,
  CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
  lookupHistoricalTransitSnapshotExecutor,
  TRANSIT_ALGORITHM_ID,
  TRANSIT_CORE_ENGINE,
  TRANSIT_TIMELINE_VERSION,
} from "@hakimi/transit-core";
import { z } from "zod";
import {
  createDefaultResearchQuery,
  executeResearchQuery,
  RESEARCH_QUERY_ENGINE,
  type ResearchQuerySnapshot,
} from "./index";

export const TRANSIT_QUERY_REVIEW_BUNDLE_FORMAT = "hakimi-transit-query-review-bundle" as const;
export const TRANSIT_QUERY_INDEPENDENT_REVIEW_FORMAT = "hakimi-transit-query-independent-review" as const;
export const TRANSIT_QUERY_ADJUDICATION_FORMAT = "hakimi-transit-query-adjudication" as const;
export const TRANSIT_QUERY_REVIEW_FORMAT_VERSION = "1.0.0" as const;
export const TRANSIT_QUERY_AUDIT_RECORD_VERSION = "1.0.0" as const;
export const TRANSIT_QUERY_REVIEW_DATASET_ID = "transit-query-six-track-candidates" as const;
export const TRANSIT_QUERY_REVIEW_FIXTURE_VERSION = "1.0.0" as const;
export const TRANSIT_QUERY_REVIEW_LIFECYCLE = "candidate-only-v1" as const;
export const TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT = 18 as const;
export const TRANSIT_QUERY_REVIEW_ATTESTATION_STATEMENT =
  "我已独立核对本审核绑定的候选包、完整出生快照、查询条件、规则与运限摘要、来源材料摘要及定位，并如实记录个人结论。" as const;
export const TRANSIT_QUERY_ADJUDICATION_ATTESTATION_STATEMENT =
  "我已核对两份独立审核、审核人离线身份记录摘要、来源谱系与候选绑定，并如实记录最终裁决；我知晓预检不会自动产生专家金标准。" as const;

const FIXED_CALCULATED_AT = "2026-08-02T00:00:00.000Z";
const CASE_ID = "b1000000-0000-4000-8000-000000000001";
const REVISION_IDS = {
  male: "b2000000-0000-4000-8000-000000000001",
  female: "b2000000-0000-4000-8000-000000000002",
  unspecified: "b2000000-0000-4000-8000-000000000003",
} as const;
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const sha256RefSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const canonicalInstantSchema = z.string().datetime({ offset: true });
const canonicalUtcInstantSchema = z.string().datetime().refine(
  (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
  { message: "审核时间必须是规范 UTC ISO 瞬时点" },
);
const canonicalAuditIdSchema = z.string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/)
  .refine((value) => value === value.trim().normalize("NFKC").toLowerCase(), {
    message: "审核身份与来源 ID 必须使用规范的小写 ASCII 标识",
  });
const safeSourceRefSchema = z.string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), { message: "来源引用不能包含控制字符" })
  .refine((value) => !/^(?:javascript|data|file|vbscript):/i.test(value), {
    message: "来源引用不能使用可执行、数据或本地文件 scheme",
  });

const transitEngineBindingSchema = z.strictObject({
  name: z.literal(TRANSIT_CORE_ENGINE.name),
  version: z.literal(TRANSIT_CORE_ENGINE.version),
  upstreamName: z.literal(TRANSIT_CORE_ENGINE.upstreamName),
  upstreamVersion: z.literal(TRANSIT_CORE_ENGINE.upstreamVersion),
  upstreamTagCommit: z.literal(TRANSIT_CORE_ENGINE.upstreamTagCommit),
  upstreamIntegrity: z.literal(TRANSIT_CORE_ENGINE.upstreamIntegrity),
});

const transitTimeZoneDatabaseBindingSchema = z.strictObject({
  schemaVersion: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.schemaVersion),
  kind: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.kind),
  ianaVersion: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.ianaVersion),
  artifactName: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.artifactName),
  dataSha256: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.dataSha256),
  resolver: z.strictObject({
    name: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.resolver.name),
    version: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.resolver.version),
  }),
  adapter: z.strictObject({
    name: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.adapter.name),
    version: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.adapter.version),
  }),
  supportedRange: z.strictObject({
    from: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.supportedRange.from),
    to: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.supportedRange.to),
  }),
  snapshotId: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timeZoneDatabase.snapshotId),
});

const transitSnapshotExecutorBindingSchema = z.strictObject({
  timelineVersion: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.timelineVersion),
  algorithmId: z.literal(CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR.algorithmId),
  engine: transitEngineBindingSchema,
  timeZoneDatabase: transitTimeZoneDatabaseBindingSchema,
});

const baseBirthInput: BirthInput = birthInputSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26:00",
  timePrecision: "exact_second",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: "",
});

type Scenario = {
  id: string;
  title: string;
  coverageCell: string;
  nodeType: TransitNodeType;
  atInstant: string;
  sex: BirthInput["sex"];
  manualDirection: "forward" | "backward" | null;
};

const scenarios: readonly Scenario[] = Object.freeze([
  { id: "tqg-001", title: "立春前一秒的流年", coverageCell: "year.lichun.before", nodeType: "year", atInstant: "2024-02-04T08:27:06.000Z", sex: "male", manualDirection: null },
  { id: "tqg-002", title: "立春当秒的流年", coverageCell: "year.lichun.at", nodeType: "year", atInstant: "2024-02-04T08:27:07.000Z", sex: "male", manualDirection: null },
  { id: "tqg-003", title: "立春前一秒的流月", coverageCell: "month.lichun.before", nodeType: "month", atInstant: "2024-02-04T08:27:06.000Z", sex: "male", manualDirection: null },
  { id: "tqg-004", title: "立春当秒的流月", coverageCell: "month.lichun.at", nodeType: "month", atInstant: "2024-02-04T08:27:07.000Z", sex: "male", manualDirection: null },
  { id: "tqg-005", title: "惊蛰前一秒的流月", coverageCell: "month.jie.before", nodeType: "month", atInstant: "2024-03-05T02:22:44.000Z", sex: "male", manualDirection: null },
  { id: "tqg-006", title: "惊蛰当秒的流月", coverageCell: "month.jie.at", nodeType: "month", atInstant: "2024-03-05T02:22:45.000Z", sex: "male", manualDirection: null },
  { id: "tqg-007", title: "23 点换日前一秒的流日", coverageCell: "day.zi-start.before", nodeType: "day", atInstant: "2024-02-04T14:59:59.000Z", sex: "male", manualDirection: null },
  { id: "tqg-008", title: "23 点换日当秒的流日", coverageCell: "day.zi-start.at", nodeType: "day", atInstant: "2024-02-04T15:00:00.000Z", sex: "male", manualDirection: null },
  { id: "tqg-009", title: "23 点换时前一秒的流时", coverageCell: "hour.zi-start.before", nodeType: "hour", atInstant: "2024-02-04T14:59:59.000Z", sex: "male", manualDirection: null },
  { id: "tqg-010", title: "23 点换时当秒的流时", coverageCell: "hour.zi-start.at", nodeType: "hour", atInstant: "2024-02-04T15:00:00.000Z", sex: "male", manualDirection: null },
  { id: "tqg-011", title: "01 点换时前一秒的流时", coverageCell: "hour.chou-start.before", nodeType: "hour", atInstant: "2024-02-04T16:59:59.000Z", sex: "male", manualDirection: null },
  { id: "tqg-012", title: "01 点换时当秒的流时", coverageCell: "hour.chou-start.at", nodeType: "hour", atInstant: "2024-02-04T17:00:00.000Z", sex: "male", manualDirection: null },
  { id: "tqg-013", title: "男性出生瞬时点的小运", coverageCell: "xiaoyun.birth.male", nodeType: "xiaoyun", atInstant: "1995-08-18T00:26:00.000Z", sex: "male", manualDirection: null },
  { id: "tqg-014", title: "女性出生瞬时点的小运", coverageCell: "xiaoyun.birth.female", nodeType: "xiaoyun", atInstant: "1995-08-18T00:26:00.000Z", sex: "female", manualDirection: null },
  { id: "tqg-015", title: "出生前一毫秒的小运不适用", coverageCell: "xiaoyun.pre-birth", nodeType: "xiaoyun", atInstant: "1995-08-18T00:25:59.999Z", sex: "male", manualDirection: null },
  { id: "tqg-016", title: "交运前的大运不适用", coverageCell: "dayun.before-start", nodeType: "dayun", atInstant: "1995-08-18T00:26:00.000Z", sex: "male", manualDirection: null },
  { id: "tqg-017", title: "未知性别且未指定方向的大运不支持", coverageCell: "dayun.unspecified.no-direction", nodeType: "dayun", atInstant: "2024-02-04T08:27:07.000Z", sex: "unspecified", manualDirection: null },
  { id: "tqg-018", title: "未知性别人工顺行的大运", coverageCell: "dayun.unspecified.forward", nodeType: "dayun", atInstant: "2024-02-04T08:27:07.000Z", sex: "unspecified", manualDirection: "forward" },
]);

const expectedProjectionSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("resolved"),
    nodeType: z.enum(["dayun", "xiaoyun", "year", "month", "day", "hour"]),
    ganZhi: z.string().regex(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/),
    stemTenGod: z.string().min(1).max(20),
    startInstant: canonicalInstantSchema,
    endExclusiveInstant: canonicalInstantSchema,
    boundaryLabel: z.string().min(1).max(40).nullable(),
    frame: z.enum(["fixed_plus08", "revision_iana_civil"]),
    sourcePrecision: z.enum(["second", "millisecond"]),
    queryOutcome: z.literal("matched"),
  }),
  z.strictObject({
    status: z.literal("not_applicable"),
    nodeType: z.enum(["dayun", "xiaoyun", "year", "month", "day", "hour"]),
    reasonCode: z.string().min(1).max(60),
    queryOutcome: z.literal("not_matched"),
  }),
  z.strictObject({
    status: z.literal("unsupported"),
    nodeType: z.enum(["dayun", "xiaoyun", "year", "month", "day", "hour"]),
    reasonCode: z.string().min(1).max(60),
    queryOutcome: z.literal("not_matched"),
  }),
]);

const pillarsSchema = z.strictObject({
  year: z.string(),
  month: z.string(),
  day: z.string(),
  hour: z.string(),
});

const transitReviewCandidateSchema = z.strictObject({
  id: z.string().regex(/^tqg-\d{3}$/),
  title: z.string().min(1).max(100),
  coverageCell: z.string().min(1).max(100),
  evidenceStatus: z.literal("engineering_candidate_only"),
  nodeType: z.enum(["dayun", "xiaoyun", "year", "month", "day", "hour"]),
  input: birthInputSchema,
  caseId: z.string().uuid(),
  revisionId: z.string().uuid(),
  subjectSnapshot: z.strictObject({
    caseRecord: caseRecordSchema,
    revision: revisionRecordSchema,
  }),
  chartContext: z.strictObject({
    pillars: pillarsSchema,
    birthUtcInstant: canonicalInstantSchema,
    revisionResultHash: sha256Schema,
    ruleProfileDigest: sha256Schema,
    luckCycleRuleDigest: sha256Schema,
    timeCalibrationDigest: sha256Schema,
  }),
  query: researchQuerySchema,
  snapshotDigest: sha256Schema,
  queryDigest: sha256Schema,
  dataEpoch: sha256Schema,
  proposedExpected: expectedProjectionSchema,
  executionEvidence: z.strictObject({
    resultDigest: sha256Schema,
    matchingCaseIds: z.array(z.string().uuid()).max(1),
    diagnosticCodes: z.array(z.string().min(1)).max(20),
  }),
  candidateDigest: sha256Schema,
});

const reviewBundlePayloadSchema = z.strictObject({
  generatedAt: canonicalUtcInstantSchema,
  dataset: z.strictObject({
    datasetId: z.literal(TRANSIT_QUERY_REVIEW_DATASET_ID),
    fixtureVersion: z.literal(TRANSIT_QUERY_REVIEW_FIXTURE_VERSION),
    lifecycleVersion: z.literal(TRANSIT_QUERY_REVIEW_LIFECYCLE),
    title: z.string().min(1),
    notice: z.string().min(1),
    candidateCount: z.literal(TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT),
    verifiedCandidateCount: z.literal(0),
    requiredVerifiedCandidateCount: z.literal(TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT),
    fixtureDigest: sha256Schema,
    datasetDigest: sha256Schema,
  }),
  bindings: z.strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    researchQueryEngine: z.strictObject({
      name: z.literal(RESEARCH_QUERY_ENGINE.name),
      version: z.literal(RESEARCH_QUERY_ENGINE.version),
      queryVersion: z.literal(RESEARCH_QUERY_ENGINE.queryVersion),
      textMode: z.literal(RESEARCH_QUERY_ENGINE.textMode),
      relationEngine: z.literal(RESEARCH_QUERY_ENGINE.relationEngine),
      transitTimeline: z.literal(RESEARCH_QUERY_ENGINE.transitTimeline),
      derivedReplayProfile: z.literal(RESEARCH_QUERY_ENGINE.derivedReplayProfile),
    }),
    baziEngine: z.strictObject({
      name: z.literal(ENGINE.name),
      version: z.literal(ENGINE.version),
      upstreamName: z.literal(ENGINE.upstreamName),
      upstreamVersion: z.literal(ENGINE.upstreamVersion),
      upstreamTagCommit: z.literal(ENGINE.upstreamTagCommit),
      upstreamIntegrity: z.literal(ENGINE.upstreamIntegrity),
    }),
    transitEngine: transitEngineBindingSchema,
    transitSnapshotExecutor: transitSnapshotExecutorBindingSchema,
    transitTimelineVersion: z.literal(TRANSIT_TIMELINE_VERSION),
    transitAlgorithmId: z.literal(TRANSIT_ALGORITHM_ID),
    ruleProfile: ruleProfileSchema,
    ruleProfileDigest: sha256Schema,
  }),
  reviewPolicy: z.strictObject({
    requiredIndependentReviewCount: z.literal(2),
    requiredIndependentSourceLineageCount: z.literal(2),
    verifiedCountingEnabled: z.literal(false),
    integrityNotice: z.string().min(1),
    releaseNotice: z.string().min(1),
  }),
  candidates: z.array(transitReviewCandidateSchema).length(TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT),
});

export const transitQueryReviewBundleEnvelopeSchema = z.strictObject({
  format: z.literal(TRANSIT_QUERY_REVIEW_BUNDLE_FORMAT),
  formatVersion: z.literal(TRANSIT_QUERY_REVIEW_FORMAT_VERSION),
  payload: reviewBundlePayloadSchema,
  digest: sha256Schema,
});

const transitQueryReviewSourceTypeSchema = z.enum([
  "classical_text",
  "published_almanac",
  "academic_publication",
  "expert_method_record",
  "software_crosscheck",
  "other",
]);

export const transitQueryReviewSourceEvidenceSchema = z.strictObject({
  sourceId: canonicalAuditIdSchema,
  lineageId: canonicalAuditIdSchema,
  role: z.enum(["authority", "crosscheck", "reference"]),
  sourceType: transitQueryReviewSourceTypeSchema,
  title: z.string().trim().min(1).max(300),
  publisherOrCustodian: z.string().trim().min(1).max(200),
  editionOrVersion: z.string().trim().min(1).max(300),
  locator: z.string().trim().min(1).max(500),
  sourceRef: safeSourceRefSchema,
  accessedAt: canonicalUtcInstantSchema,
  artifactSha256: sha256Schema,
  lineageDigest: sha256Schema,
  observedExpected: expectedProjectionSchema.nullable(),
  note: z.string().trim().max(2000),
});

const independentReviewerSchema = z.strictObject({
  reviewerId: canonicalAuditIdSchema,
  displayName: z.string().trim().min(1).max(80),
  specialty: z.string().trim().min(1).max(300),
  identityRecordRef: sha256RefSchema,
  identityVerificationMode: z.literal("offline_maintainer_required"),
  statement: z.literal(TRANSIT_QUERY_REVIEW_ATTESTATION_STATEMENT),
});

export const transitQueryIndependentReviewPayloadSchema = z.strictObject({
  recordVersion: z.literal(TRANSIT_QUERY_AUDIT_RECORD_VERSION),
  datasetId: z.literal(TRANSIT_QUERY_REVIEW_DATASET_ID),
  datasetFixtureVersion: z.literal(TRANSIT_QUERY_REVIEW_FIXTURE_VERSION),
  fixtureDigest: sha256Schema,
  datasetDigest: sha256Schema,
  reviewBundleDigest: sha256Schema,
  candidateId: z.string().regex(/^tqg-\d{3}$/),
  candidateDigest: sha256Schema,
  revisionId: z.string().uuid(),
  revisionResultHash: sha256Schema,
  snapshotDigest: sha256Schema,
  queryDigest: sha256Schema,
  dataEpoch: sha256Schema,
  resultDigest: sha256Schema,
  ruleProfileDigest: sha256Schema,
  luckCycleRuleDigest: sha256Schema,
  transitTimelineVersion: z.literal(TRANSIT_TIMELINE_VERSION),
  transitAlgorithmId: z.literal(TRANSIT_ALGORITHM_ID),
  reviewer: independentReviewerSchema,
  verdict: z.enum(["accept", "replace", "reject"]),
  proposedExpected: expectedProjectionSchema.nullable(),
  sourceEvidence: z.array(transitQueryReviewSourceEvidenceSchema).min(2).max(16),
  reviewedAt: canonicalUtcInstantSchema,
  createdAt: canonicalUtcInstantSchema,
  rationale: z.string().trim().min(1).max(4000),
}).superRefine((value, context) => {
  if (value.verdict === "reject" && value.proposedExpected !== null) {
    context.addIssue({ code: "custom", path: ["proposedExpected"], message: "拒绝候选时不得给出生效期望" });
  }
  if (value.verdict !== "reject" && value.proposedExpected === null) {
    context.addIssue({ code: "custom", path: ["proposedExpected"], message: "接受或替换候选时必须给出期望" });
  }
  if (Date.parse(value.reviewedAt) > Date.parse(value.createdAt)) {
    context.addIssue({ code: "custom", path: ["createdAt"], message: "审核文件创建时间不能早于审核完成时间" });
  }

  const sourceIds = new Set<string>();
  const lineageDigests = new Set<string>();
  const refLineages = new Map<string, string>();
  const artifactLineages = new Map<string, string>();
  let hasAuthority = false;
  let hasCalendarOrAstronomyLineage = false;
  let hasRuleOrMethodLineage = false;
  value.sourceEvidence.forEach((source, sourceIndex) => {
    if (sourceIds.has(source.sourceId)) {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "sourceId"], message: "同一审核中的来源 ID 必须唯一" });
    }
    sourceIds.add(source.sourceId);

    const authorityType = [
      "classical_text",
      "published_almanac",
      "academic_publication",
      "expert_method_record",
    ].includes(source.sourceType);
    if (source.role === "authority" && !authorityType) {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "role"], message: "软件或其他来源不能自称权威来源" });
    }
    if (source.sourceType === "software_crosscheck" && source.role !== "crosscheck") {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "role"], message: "软件来源只能作为差分交叉检查" });
    }
    hasAuthority ||= source.role === "authority" && authorityType;
    if (source.role !== "reference") {
      lineageDigests.add(source.lineageDigest);
      hasCalendarOrAstronomyLineage ||= ["published_almanac", "academic_publication"].includes(source.sourceType);
      hasRuleOrMethodLineage ||= ["classical_text", "expert_method_record"].includes(source.sourceType);
    }

    const refLineage = refLineages.get(source.sourceRef);
    if (refLineage !== undefined && refLineage !== source.lineageId) {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "lineageId"], message: "同一来源引用不能伪装成不同谱系" });
    }
    refLineages.set(source.sourceRef, source.lineageId);
    const artifactLineage = artifactLineages.get(source.artifactSha256);
    if (artifactLineage !== undefined && artifactLineage !== source.lineageId) {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "lineageId"], message: "同一材料摘要不能伪装成不同谱系" });
    }
    artifactLineages.set(source.artifactSha256, source.lineageId);

    if (Date.parse(source.accessedAt) > Date.parse(value.reviewedAt)) {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "accessedAt"], message: "来源访问时间不能晚于审核完成时间" });
    }
    if (
      value.verdict !== "reject" &&
      source.role !== "reference" &&
      canonicalStringify(source.observedExpected) !== canonicalStringify(value.proposedExpected)
    ) {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "observedExpected"], message: "正向来源观察必须与审核人提出的期望一致" });
    }
  });
  const sourceOrder = value.sourceEvidence.map((source) => source.sourceId);
  if (canonicalStringify(sourceOrder) !== canonicalStringify([...sourceOrder].sort())) {
    context.addIssue({ code: "custom", path: ["sourceEvidence"], message: "来源必须按 sourceId 规范排序" });
  }
  if (value.verdict !== "reject" && !hasAuthority) {
    context.addIssue({ code: "custom", path: ["sourceEvidence"], message: "接受或替换至少需要一项非软件权威来源" });
  }
  if (!hasCalendarOrAstronomyLineage || !hasRuleOrMethodLineage || lineageDigests.size < 2) {
    context.addIssue({
      code: "custom",
      path: ["sourceEvidence"],
      message: "每份独立审核至少需要一条历书/时间资料谱系和一条规则/方法谱系，且材料谱系摘要必须不同",
    });
  }
});

export const transitQueryIndependentReviewEnvelopeSchema = z.strictObject({
  format: z.literal(TRANSIT_QUERY_INDEPENDENT_REVIEW_FORMAT),
  formatVersion: z.literal(TRANSIT_QUERY_REVIEW_FORMAT_VERSION),
  payload: transitQueryIndependentReviewPayloadSchema,
  digest: sha256Schema,
});

const adjudicationSourceRefSchema = z.strictObject({
  reviewDigest: sha256Schema,
  sourceId: canonicalAuditIdSchema,
  lineageId: canonicalAuditIdSchema,
  lineageDigest: sha256Schema,
  sourceEvidenceDigest: sha256Schema,
});

const adjudicatorSchema = z.strictObject({
  adjudicatorId: canonicalAuditIdSchema,
  displayName: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(300),
  identityRecordRef: sha256RefSchema,
  identityVerificationMode: z.literal("offline_maintainer_required"),
  statement: z.literal(TRANSIT_QUERY_ADJUDICATION_ATTESTATION_STATEMENT),
});

export const transitQueryAdjudicationPayloadSchema = z.strictObject({
  recordVersion: z.literal(TRANSIT_QUERY_AUDIT_RECORD_VERSION),
  datasetId: z.literal(TRANSIT_QUERY_REVIEW_DATASET_ID),
  datasetFixtureVersion: z.literal(TRANSIT_QUERY_REVIEW_FIXTURE_VERSION),
  fixtureDigest: sha256Schema,
  datasetDigest: sha256Schema,
  reviewBundleDigest: sha256Schema,
  candidateId: z.string().regex(/^tqg-\d{3}$/),
  candidateDigest: sha256Schema,
  revisionId: z.string().uuid(),
  revisionResultHash: sha256Schema,
  snapshotDigest: sha256Schema,
  queryDigest: sha256Schema,
  dataEpoch: sha256Schema,
  resultDigest: sha256Schema,
  ruleProfileDigest: sha256Schema,
  luckCycleRuleDigest: sha256Schema,
  transitTimelineVersion: z.literal(TRANSIT_TIMELINE_VERSION),
  transitAlgorithmId: z.literal(TRANSIT_ALGORITHM_ID),
  independentReviewDigests: z.tuple([sha256Schema, sha256Schema]),
  decision: z.enum(["accept_expected", "replace_expected", "reject_candidate"]),
  effectiveExpected: expectedProjectionSchema.nullable(),
  authoritySourceRefs: z.array(adjudicationSourceRefSchema).min(2).max(32),
  adjudicator: adjudicatorSchema,
  decidedAt: canonicalUtcInstantSchema,
  createdAt: canonicalUtcInstantSchema,
  rationale: z.string().trim().min(1).max(4000),
  supersedesDecisionDigest: sha256Schema.nullable(),
}).superRefine((value, context) => {
  if (new Set(value.independentReviewDigests).size !== 2) {
    context.addIssue({ code: "custom", path: ["independentReviewDigests"], message: "最终裁决必须绑定两份不同的独立审核" });
  }
  if (canonicalStringify(value.independentReviewDigests) !== canonicalStringify([...value.independentReviewDigests].sort())) {
    context.addIssue({ code: "custom", path: ["independentReviewDigests"], message: "独立审核摘要必须按字典序规范排序" });
  }
  if (value.decision === "reject_candidate" && value.effectiveExpected !== null) {
    context.addIssue({ code: "custom", path: ["effectiveExpected"], message: "拒绝候选时生效期望必须为 null" });
  }
  if (value.decision !== "reject_candidate" && value.effectiveExpected === null) {
    context.addIssue({ code: "custom", path: ["effectiveExpected"], message: "接受或替换候选时必须给出生效期望" });
  }
  if (Date.parse(value.decidedAt) > Date.parse(value.createdAt)) {
    context.addIssue({ code: "custom", path: ["createdAt"], message: "裁决文件创建时间不能早于裁决时间" });
  }
  const refKeys = new Set<string>();
  value.authoritySourceRefs.forEach((source, sourceIndex) => {
    if (!value.independentReviewDigests.includes(source.reviewDigest)) {
      context.addIssue({ code: "custom", path: ["authoritySourceRefs", sourceIndex, "reviewDigest"], message: "裁决来源必须属于所绑定的两份审核" });
    }
    const key = `${source.reviewDigest}:${source.sourceId}`;
    if (refKeys.has(key)) {
      context.addIssue({ code: "custom", path: ["authoritySourceRefs", sourceIndex], message: "裁决来源引用不能重复" });
    }
    refKeys.add(key);
  });
  const sourceRefOrder = value.authoritySourceRefs.map((source) => `${source.reviewDigest}:${source.sourceId}`);
  if (canonicalStringify(sourceRefOrder) !== canonicalStringify([...sourceRefOrder].sort())) {
    context.addIssue({ code: "custom", path: ["authoritySourceRefs"], message: "裁决来源引用必须按审核摘要与来源 ID 规范排序" });
  }
});

export const transitQueryAdjudicationEnvelopeSchema = z.strictObject({
  format: z.literal(TRANSIT_QUERY_ADJUDICATION_FORMAT),
  formatVersion: z.literal(TRANSIT_QUERY_REVIEW_FORMAT_VERSION),
  payload: transitQueryAdjudicationPayloadSchema,
  digest: sha256Schema,
});

export type TransitQueryReviewExpected = z.infer<typeof expectedProjectionSchema>;
export type TransitQueryReviewCandidate = z.infer<typeof transitReviewCandidateSchema>;
export type TransitQueryReviewBundleEnvelope = z.infer<typeof transitQueryReviewBundleEnvelopeSchema>;
export type TransitQueryReviewSourceEvidence = z.infer<typeof transitQueryReviewSourceEvidenceSchema>;
export type TransitQueryIndependentReviewPayload = z.infer<typeof transitQueryIndependentReviewPayloadSchema>;
export type TransitQueryIndependentReviewEnvelope = z.infer<typeof transitQueryIndependentReviewEnvelopeSchema>;
export type TransitQueryAdjudicationPayload = z.infer<typeof transitQueryAdjudicationPayloadSchema>;
export type TransitQueryAdjudicationEnvelope = z.infer<typeof transitQueryAdjudicationEnvelopeSchema>;

export type TransitQueryAuditArtifactInspection =
  | {
      kind: "review_bundle";
      artifactDigest: string;
      reviewBundleDigest: string;
      candidateId: null;
      candidateDigest: null;
      requiredArtifactDigests: readonly [];
      envelope: TransitQueryReviewBundleEnvelope;
    }
  | {
      kind: "independent_review";
      artifactDigest: string;
      reviewBundleDigest: string;
      candidateId: string;
      candidateDigest: string;
      requiredArtifactDigests: readonly [string];
      envelope: TransitQueryIndependentReviewEnvelope;
    }
  | {
      kind: "adjudication";
      artifactDigest: string;
      reviewBundleDigest: string;
      candidateId: string;
      candidateDigest: string;
      requiredArtifactDigests: readonly [string, string, string];
      envelope: TransitQueryAdjudicationEnvelope;
    };

export type TransitQueryReviewAuditErrorCode =
  | "INVALID_JSON"
  | "INPUT_TOO_LARGE"
  | "NON_JSON_VALUE"
  | "PROTOTYPE_POLLUTION_KEY"
  | "INVALID_FORMAT"
  | "ARTIFACT_FORMAT_UNSUPPORTED"
  | "DIGEST_MISMATCH"
  | "FIXTURE_MISMATCH"
  | "DATASET_MISMATCH"
  | "CANDIDATE_MISMATCH"
  | "TIME_INVALID"
  | "REVIEW_BUNDLE_MISMATCH"
  | "UNKNOWN_CANDIDATE"
  | "REVIEW_MISMATCH"
  | "REVIEWER_NOT_INDEPENDENT"
  | "SOURCE_INDEPENDENCE_INVALID"
  | "DECISION_CONFLICT"
  | "ADJUDICATION_MISMATCH"
  | "SUPERSESSION_UNVERIFIED"
  | "PREFLIGHT_CONTEXT_INVALID";

export class TransitQueryReviewAuditError extends Error {
  constructor(public readonly code: TransitQueryReviewAuditErrorCode, message: string) {
    super(message);
    this.name = "TransitQueryReviewAuditError";
  }
}

const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const MAX_REVIEW_BYTES = 512 * 1024;
const MAX_ADJUDICATION_BYTES = 512 * 1024;
const MAX_JSON_DEPTH = 100;
const MAX_JSON_NODES = 60_000;
const MAX_JSON_TEXT_BYTES = 2 * 1024 * 1024;
const pollutionKeys = new Set(["__proto__", "prototype", "constructor"]);

function nonJson(message: string): never {
  throw new TransitQueryReviewAuditError("NON_JSON_VALUE", message);
}

type JsonInspectionState = { nodes: number; textBytes: number };

/** Security boundary for untrusted review JSON. It never invokes accessors. */
function assertReviewJson(
  value: unknown,
  path = "envelope",
  depth = 0,
  ancestors = new WeakSet<object>(),
  state: JsonInspectionState = { nodes: 0, textBytes: 0 },
  seen = new WeakSet<object>(),
): void {
  state.nodes += 1;
  if (state.nodes > MAX_JSON_NODES) nonJson(`运限审核文件超过最大节点数 ${MAX_JSON_NODES}`);
  if (depth > MAX_JSON_DEPTH) nonJson(`运限审核文件超过最大 JSON 深度 ${MAX_JSON_DEPTH}`);
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    state.textBytes += new TextEncoder().encode(value).byteLength;
    if (state.textBytes > MAX_JSON_TEXT_BYTES) nonJson("运限审核文件文本总量超过核心上限");
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) nonJson(`${path} 包含非有限数字`);
    return;
  }
  if (typeof value !== "object") nonJson(`${path} 包含非 JSON 值：${typeof value}`);

  const objectValue = value as object;
  if (ancestors.has(objectValue)) nonJson(`${path} 包含循环引用`);
  if (seen.has(objectValue)) nonJson(`${path} 包含共享对象引用，不是声明式 JSON 树`);
  seen.add(objectValue);
  ancestors.add(objectValue);
  if (Array.isArray(objectValue)) {
    for (let index = 0; index < objectValue.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(objectValue, index)) nonJson(`${path} 包含稀疏数组空位`);
    }
  } else {
    const prototype = Object.getPrototypeOf(objectValue);
    if (prototype !== Object.prototype) {
      throw new TransitQueryReviewAuditError("PROTOTYPE_POLLUTION_KEY", `${path} 不是普通 JSON 对象`);
    }
  }

  for (const key of Object.getOwnPropertyNames(objectValue)) {
    if (Array.isArray(objectValue) && key === "length") continue;
    state.textBytes += new TextEncoder().encode(key).byteLength;
    if (state.textBytes > MAX_JSON_TEXT_BYTES) nonJson("运限审核文件键名与文本总量超过核心上限");
    const childPath = Array.isArray(objectValue) ? `${path}[${key}]` : `${path}.${key}`;
    if (pollutionKeys.has(key.toLowerCase())) {
      throw new TransitQueryReviewAuditError("PROTOTYPE_POLLUTION_KEY", `运限审核文件禁止原型污染键：${childPath}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
    if (!descriptor || !("value" in descriptor)) nonJson(`${childPath} 是访问器而不是声明式数据`);
    if (!descriptor.enumerable) nonJson(`${childPath} 是 JSON 不可见的非枚举字段`);
    if (Array.isArray(objectValue) && !/^(?:0|[1-9]\d*)$/.test(key)) nonJson(`${childPath} 是数组上的自定义字段`);
    assertReviewJson(descriptor.value, childPath, depth + 1, ancestors, state, seen);
  }
  if (Object.getOwnPropertySymbols(objectValue).length > 0) nonJson(`${path} 包含 Symbol 键`);
  ancestors.delete(objectValue);
}

function parseTransitAuditEnvelope<T>(
  schema: z.ZodType<T>,
  raw: string | unknown,
  maxBytes: number,
  label: string,
): T {
  let input = raw;
  if (typeof raw === "string") {
    if (new TextEncoder().encode(raw).byteLength > maxBytes) {
      throw new TransitQueryReviewAuditError("INPUT_TOO_LARGE", `${label}超过 ${Math.floor(maxBytes / 1024)} KiB 核心上限。`);
    }
    if (/^\s*(?:https?|data|javascript|file):/i.test(raw)) {
      throw new TransitQueryReviewAuditError("INVALID_JSON", `${label}导入只接受 JSON 内容，不读取 URL。`);
    }
    try {
      input = JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
    } catch {
      throw new TransitQueryReviewAuditError("INVALID_JSON", "运限审核文件不是有效 JSON。");
    }
  }
  assertReviewJson(input);
  if (typeof raw !== "string" && new TextEncoder().encode(JSON.stringify(input)).byteLength > maxBytes) {
    throw new TransitQueryReviewAuditError("INPUT_TOO_LARGE", `${label}超过 ${Math.floor(maxBytes / 1024)} KiB 核心上限。`);
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new TransitQueryReviewAuditError(
      "INVALID_FORMAT",
      `${label}不符合严格格式：${parsed.error.issues[0]?.message ?? "未知格式错误"}`,
    );
  }
  if (canonicalStringify(input) !== canonicalStringify(parsed.data)) {
    throw new TransitQueryReviewAuditError("INVALID_FORMAT", `${label}包含未声明、被转换或会被静默剥离的字段。`);
  }
  return parsed.data;
}

function parseReviewEnvelope(raw: string | unknown): TransitQueryReviewBundleEnvelope {
  return parseTransitAuditEnvelope(
    transitQueryReviewBundleEnvelopeSchema,
    raw,
    MAX_BUNDLE_BYTES,
    "运限候选审核包",
  );
}

function parseIndependentReviewEnvelope(raw: string | unknown): TransitQueryIndependentReviewEnvelope {
  return parseTransitAuditEnvelope(
    transitQueryIndependentReviewEnvelopeSchema,
    raw,
    MAX_REVIEW_BYTES,
    "运限独立审核文件",
  );
}

function parseAdjudicationEnvelope(raw: string | unknown): TransitQueryAdjudicationEnvelope {
  return parseTransitAuditEnvelope(
    transitQueryAdjudicationEnvelopeSchema,
    raw,
    MAX_ADJUDICATION_BYTES,
    "运限最终裁决文件",
  );
}

const transitQueryAuditArtifactFormatProbeSchema = z.object({
  format: z.string().min(1),
}).passthrough();

/**
 * Identifies one supported transit-query audit artifact from its declared JSON
 * content. File names, upload slots and MIME types never participate in the
 * decision. This is an integrity inspection only: dependency/current-fixture
 * preflight and every real-world identity/source trust boundary remain separate.
 */
export async function inspectTransitQueryAuditArtifact(
  raw: string | unknown,
): Promise<TransitQueryAuditArtifactInspection> {
  const probe = parseTransitAuditEnvelope(
    transitQueryAuditArtifactFormatProbeSchema,
    raw,
    MAX_BUNDLE_BYTES,
    "运限审核工件",
  );

  if (probe.format === TRANSIT_QUERY_REVIEW_BUNDLE_FORMAT) {
    const envelope = parseReviewEnvelope(raw);
    if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
      throw new TransitQueryReviewAuditError("DIGEST_MISMATCH", "运限审核包摘要不匹配，文件内容可能已被修改。");
    }
    return {
      kind: "review_bundle",
      artifactDigest: envelope.digest,
      reviewBundleDigest: envelope.digest,
      candidateId: null,
      candidateDigest: null,
      requiredArtifactDigests: [],
      envelope,
    };
  }

  if (probe.format === TRANSIT_QUERY_INDEPENDENT_REVIEW_FORMAT) {
    const envelope = parseIndependentReviewEnvelope(raw);
    if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
      throw new TransitQueryReviewAuditError("DIGEST_MISMATCH", "独立审核摘要不匹配，文件内容可能已被修改。");
    }
    return {
      kind: "independent_review",
      artifactDigest: envelope.digest,
      reviewBundleDigest: envelope.payload.reviewBundleDigest,
      candidateId: envelope.payload.candidateId,
      candidateDigest: envelope.payload.candidateDigest,
      requiredArtifactDigests: [envelope.payload.reviewBundleDigest],
      envelope,
    };
  }

  if (probe.format === TRANSIT_QUERY_ADJUDICATION_FORMAT) {
    const envelope = parseAdjudicationEnvelope(raw);
    if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
      throw new TransitQueryReviewAuditError("DIGEST_MISMATCH", "最终裁决摘要不匹配，文件内容可能已被修改。");
    }
    return {
      kind: "adjudication",
      artifactDigest: envelope.digest,
      reviewBundleDigest: envelope.payload.reviewBundleDigest,
      candidateId: envelope.payload.candidateId,
      candidateDigest: envelope.payload.candidateDigest,
      requiredArtifactDigests: [
        envelope.payload.reviewBundleDigest,
        envelope.payload.independentReviewDigests[0],
        envelope.payload.independentReviewDigests[1],
      ],
      envelope,
    };
  }

  throw new TransitQueryReviewAuditError(
    "ARTIFACT_FORMAT_UNSUPPORTED",
    `不支持的运限审核工件格式：${probe.format}。`,
  );
}

async function createRevision(sex: BirthInput["sex"]): Promise<RevisionRecord> {
  const chart = await calculateChart({ ...baseBirthInput, sex }, WORKING_DEFAULT_RULE_PROFILE);
  const manifest = { ...chart.manifest, calculatedAt: FIXED_CALCULATED_AT };
  manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload({
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest,
  }));
  return {
    schemaVersion: SCHEMA_VERSION,
    id: REVISION_IDS[sex],
    caseId: CASE_ID,
    revisionNumber: 1,
    createdAt: FIXED_CALCULATED_AT,
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest,
  };
}

function createCase(revisionId: string): CaseRecord {
  return {
    schemaVersion: SCHEMA_VERSION,
    recordVersion: 2,
    id: CASE_ID,
    alias: "纯合成运限审核样本",
    tags: ["工程候选"],
    notes: "不对应真实自然人",
    favorite: false,
    deletedAt: null,
    latestRevisionId: revisionId,
    revisionCount: 1,
    createdAt: FIXED_CALCULATED_AT,
    updatedAt: FIXED_CALCULATED_AT,
  };
}

function projectExpected(slot: TransitSlot, nodeType: TransitNodeType): TransitQueryReviewExpected {
  if (slot.status === "resolved") {
    return expectedProjectionSchema.parse({
      status: "resolved",
      nodeType,
      ganZhi: slot.node.ganZhi,
      stemTenGod: slot.node.stemTenGod,
      startInstant: slot.node.startInstant,
      endExclusiveInstant: slot.node.endExclusiveInstant,
      boundaryLabel: slot.node.boundaryLabel,
      frame: slot.node.frame,
      sourcePrecision: slot.node.sourcePrecision,
      queryOutcome: "matched",
    });
  }
  return expectedProjectionSchema.parse({
    status: slot.status,
    nodeType,
    reasonCode: slot.reasonCode,
    queryOutcome: "not_matched",
  });
}

async function buildCandidate(
  scenario: Scenario,
  revisions: ReadonlyMap<BirthInput["sex"], RevisionRecord>,
): Promise<TransitQueryReviewCandidate> {
  const revision = revisions.get(scenario.sex);
  if (!revision) throw new Error(`missing synthetic revision for ${scenario.sex}`);
  const caseRecord = createCase(revision.id);
  const snapshot: ResearchQuerySnapshot = {
    cases: [caseRecord],
    revisions: [revision],
    candidateSets: [],
    researchNotes: [],
    events: [],
    knowledgeDocuments: [],
  };
  const transit = await calculateTransitSnapshot({
    revision,
    atInstant: scenario.atInstant,
    ...(scenario.manualDirection === null ? {} : { manualDirection: scenario.manualDirection }),
  });
  const slot = transit.slots[scenario.nodeType];
  const proposedExpected = projectExpected(slot, scenario.nodeType);
  const matcher = slot.status === "resolved"
    ? { nodeType: scenario.nodeType, ganZhi: slot.node.ganZhi, stemTenGod: slot.node.stemTenGod }
    : { nodeType: scenario.nodeType, ganZhi: "甲子", stemTenGod: null };
  const query: ResearchCaseQuery = researchQuerySchema.parse({
    ...createDefaultResearchQuery("cases"),
    transit: {
      atInstant: scenario.atInstant,
      manualDirection: scenario.manualDirection,
      matches: [matcher],
    },
  }) as ResearchCaseQuery;
  const execution = await executeResearchQuery(query, snapshot, { now: () => FIXED_CALCULATED_AT });
  const matchingCaseIds = execution.results.flatMap((result) => result.scope === "cases" ? [result.caseId] : []);
  const expectedMatched = proposedExpected.queryOutcome === "matched";
  if (expectedMatched !== (matchingCaseIds.length === 1 && matchingCaseIds[0] === CASE_ID)) {
    throw new Error(`synthetic candidate ${scenario.id} query outcome diverged from its transit slot`);
  }
  const candidateWithoutDigest = {
    id: scenario.id,
    title: scenario.title,
    coverageCell: scenario.coverageCell,
    evidenceStatus: "engineering_candidate_only" as const,
    nodeType: scenario.nodeType,
    input: revision.input,
    caseId: CASE_ID,
    revisionId: revision.id,
    subjectSnapshot: { caseRecord, revision },
    chartContext: {
      pillars: {
        year: revision.facts.pillars.year.ganZhi,
        month: revision.facts.pillars.month.ganZhi,
        day: revision.facts.pillars.day.ganZhi,
        hour: revision.facts.pillars.hour.ganZhi,
      },
      birthUtcInstant: revision.timeCalibration.utcInstant!,
      revisionResultHash: revision.manifest.resultHash,
      ruleProfileDigest: revision.manifest.ruleProfileDigest,
      luckCycleRuleDigest: revision.manifest.luckCycleRuleDigest!,
      timeCalibrationDigest: await sha256Hex(revision.timeCalibration),
    },
    query,
    snapshotDigest: await sha256Hex(snapshot),
    queryDigest: execution.queryDigest,
    dataEpoch: execution.dataEpoch,
    proposedExpected,
    executionEvidence: {
      resultDigest: execution.resultDigest,
      matchingCaseIds,
      diagnosticCodes: execution.diagnostics.map((item) => item.code),
    },
  };
  return transitReviewCandidateSchema.parse({
    ...candidateWithoutDigest,
    candidateDigest: await sha256Hex(candidateWithoutDigest),
  });
}

async function buildCurrentCandidates(): Promise<TransitQueryReviewCandidate[]> {
  const revisionEntries = await Promise.all((["male", "female", "unspecified"] as const).map(async (sex) => [
    sex,
    await createRevision(sex),
  ] as const));
  const revisions = new Map<BirthInput["sex"], RevisionRecord>(revisionEntries);
  return Promise.all(scenarios.map((scenario) => buildCandidate(scenario, revisions)));
}

export async function createTransitQueryReviewBundle(options: {
  generatedAt?: string;
} = {}): Promise<TransitQueryReviewBundleEnvelope> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new TransitQueryReviewAuditError("TIME_INVALID", "审核包生成时间不是有效瞬时点。");
  }
  const candidates = await buildCurrentCandidates();
  const ruleProfileDigest = await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE);
  const fixtureDigest = await sha256Hex({
    datasetId: TRANSIT_QUERY_REVIEW_DATASET_ID,
    fixtureVersion: TRANSIT_QUERY_REVIEW_FIXTURE_VERSION,
    lifecycleVersion: TRANSIT_QUERY_REVIEW_LIFECYCLE,
    baseBirthInput,
    scenarios,
    ruleProfileDigest,
    transitSnapshotExecutor: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
  });
  const datasetDigest = await sha256Hex({ fixtureDigest, candidates });
  const payload = reviewBundlePayloadSchema.parse({
    generatedAt,
    dataset: {
      datasetId: TRANSIT_QUERY_REVIEW_DATASET_ID,
      fixtureVersion: TRANSIT_QUERY_REVIEW_FIXTURE_VERSION,
      lifecycleVersion: TRANSIT_QUERY_REVIEW_LIFECYCLE,
      title: "P1-04 六轨运限查询专家审核候选",
      notice: "全部输出由当前工程计算链生成，只供现实专家独立复核；不是命理金标，也不得提高 transit-core 或查询发布计数。",
      candidateCount: TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT,
      verifiedCandidateCount: 0,
      requiredVerifiedCandidateCount: TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT,
      fixtureDigest,
      datasetDigest,
    },
    bindings: {
      schemaVersion: SCHEMA_VERSION,
      researchQueryEngine: RESEARCH_QUERY_ENGINE,
      baziEngine: ENGINE,
      transitEngine: TRANSIT_CORE_ENGINE,
      transitSnapshotExecutor: CURRENT_TRANSIT_SNAPSHOT_EXECUTOR_DESCRIPTOR,
      transitTimelineVersion: TRANSIT_TIMELINE_VERSION,
      transitAlgorithmId: TRANSIT_ALGORITHM_ID,
      ruleProfile: WORKING_DEFAULT_RULE_PROFILE,
      ruleProfileDigest,
    },
    reviewPolicy: {
      requiredIndependentReviewCount: 2,
      requiredIndependentSourceLineageCount: 2,
      verifiedCountingEnabled: false,
      integrityNotice: "SHA-256 只证明审核包内容未变化，不证明复核人身份、来源真实性或命理正确性。",
      releaseNotice: "两份独立复核和最终裁决必须由维护者线下核验并纳入新版本 fixture；本审核包及其预检固定不增加金标。",
    },
    candidates,
  });
  return transitQueryReviewBundleEnvelopeSchema.parse({
    format: TRANSIT_QUERY_REVIEW_BUNDLE_FORMAT,
    formatVersion: TRANSIT_QUERY_REVIEW_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload),
  });
}

export function serializeTransitQueryReviewBundle(envelope: TransitQueryReviewBundleEnvelope): string {
  return `${JSON.stringify(transitQueryReviewBundleEnvelopeSchema.parse(envelope), null, 2)}\n`;
}

export type TransitQueryReviewPreflightOptions = {
  now?: string | Date;
  allowedClockSkewMs?: number;
};

function reviewEffectiveNow(options: TransitQueryReviewPreflightOptions): number {
  const value = options.now ?? new Date();
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TransitQueryReviewAuditError("TIME_INVALID", "预检 now 必须是有效瞬时点。");
  }
  return timestamp;
}

function reviewClockSkew(options: TransitQueryReviewPreflightOptions): number {
  const skew = options.allowedClockSkewMs ?? 5 * 60 * 1000;
  if (!Number.isFinite(skew) || skew < 0 || skew > 60 * 60 * 1000) {
    throw new TransitQueryReviewAuditError("TIME_INVALID", "允许的时钟偏差必须在 0 到 1 小时之间。");
  }
  return skew;
}

function assertReviewTimeNotFuture(
  timestamp: string,
  options: TransitQueryReviewPreflightOptions,
  label: string,
): void {
  if (Date.parse(timestamp) > reviewEffectiveNow(options) + reviewClockSkew(options)) {
    throw new TransitQueryReviewAuditError("TIME_INVALID", `${label}不能晚于当前时间。`);
  }
}

export async function preflightTransitQueryReviewBundle(
  raw: string | unknown,
  options: TransitQueryReviewPreflightOptions = {},
): Promise<TransitQueryReviewBundleEnvelope> {
  const envelope = parseReviewEnvelope(raw);
  if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
    throw new TransitQueryReviewAuditError("DIGEST_MISMATCH", "运限审核包摘要不匹配，文件内容可能已被修改。");
  }
  if (lookupHistoricalTransitSnapshotExecutor(envelope.payload.bindings.transitSnapshotExecutor) === null) {
    throw new TransitQueryReviewAuditError(
      "DATASET_MISMATCH",
      "运限审核包没有绑定可用的完整 TransitSnapshot 执行器描述符。",
    );
  }
  assertReviewTimeNotFuture(envelope.payload.generatedAt, options, "运限候选审核包生成时间");

  const current = await createTransitQueryReviewBundle({ generatedAt: envelope.payload.generatedAt });
  if (envelope.payload.dataset.fixtureDigest !== current.payload.dataset.fixtureDigest) {
    throw new TransitQueryReviewAuditError("FIXTURE_MISMATCH", "运限审核包绑定的 candidate-only fixture 已不是当前版本。");
  }
  if (envelope.payload.dataset.datasetDigest !== current.payload.dataset.datasetDigest) {
    throw new TransitQueryReviewAuditError("DATASET_MISMATCH", "运限审核包数据集摘要与当前候选数据不一致。");
  }
  const currentById = new Map(current.payload.candidates.map((candidate) => [candidate.id, candidate]));
  if (new Set(envelope.payload.candidates.map((candidate) => candidate.id)).size !== TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT) {
    throw new TransitQueryReviewAuditError("CANDIDATE_MISMATCH", "运限审核包候选 ID 重复或缺失。");
  }
  for (const candidate of envelope.payload.candidates) {
    const { candidateDigest, ...withoutDigest } = candidate;
    if (candidateDigest !== await sha256Hex(withoutDigest)) {
      throw new TransitQueryReviewAuditError("CANDIDATE_MISMATCH", `候选 ${candidate.id} 的自身摘要与包内内容不一致。`);
    }
    if (candidateDigest !== currentById.get(candidate.id)?.candidateDigest) {
      throw new TransitQueryReviewAuditError("CANDIDATE_MISMATCH", `候选 ${candidate.id} 与当前 candidate-only 版本不一致。`);
    }
  }
  if (canonicalStringify(envelope.payload) !== canonicalStringify(current.payload)) {
    throw new TransitQueryReviewAuditError("DATASET_MISMATCH", "运限审核包的引擎、规则、策略或候选顺序与当前版本不一致。");
  }
  return envelope;
}

const transitQueryReviewPreflightContextBrand: unique symbol = Symbol("hakimi.transit-query-review-preflight-context");

/**
 * Ephemeral proof that one exact review bundle was replayed against the current
 * candidate-only fixture. Its private symbol and WeakMap state deliberately do
 * not survive JSON serialization, structured cloning or application restart.
 */
export type TransitQueryReviewPreflightContext = Readonly<{
  reviewBundleDigest: string;
  candidateCount: typeof TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT;
  [transitQueryReviewPreflightContextBrand]: true;
}>;

type TransitQueryReviewPreflightContextState = {
  bundle: TransitQueryReviewBundleEnvelope;
  effectiveNowMs: number;
  allowedClockSkewMs: number;
};

const transitQueryReviewPreflightContextStates = new WeakMap<object, TransitQueryReviewPreflightContextState>();

function requireTransitQueryReviewPreflightContext(
  context: TransitQueryReviewPreflightContext,
): TransitQueryReviewPreflightContextState {
  if (context === null || typeof context !== "object") {
    throw new TransitQueryReviewAuditError("PREFLIGHT_CONTEXT_INVALID", "运限审核预检上下文不存在或已经失效。");
  }
  const state = transitQueryReviewPreflightContextStates.get(context);
  if (state === undefined || context[transitQueryReviewPreflightContextBrand] !== true) {
    throw new TransitQueryReviewAuditError(
      "PREFLIGHT_CONTEXT_INVALID",
      "运限审核预检上下文必须由本次运行的候选包预检创建，不能从 JSON 或跨线程数据恢复。",
    );
  }
  return state;
}

function optionsFromTransitQueryReviewPreflightContext(
  state: TransitQueryReviewPreflightContextState,
): TransitQueryReviewPreflightOptions {
  return {
    now: new Date(state.effectiveNowMs),
    allowedClockSkewMs: state.allowedClockSkewMs,
  };
}

export async function createTransitQueryReviewPreflightContext(
  reviewBundle: string | unknown,
  options: TransitQueryReviewPreflightOptions = {},
): Promise<TransitQueryReviewPreflightContext> {
  const effectiveNowMs = reviewEffectiveNow(options);
  const allowedClockSkewMs = reviewClockSkew(options);
  const normalizedOptions: TransitQueryReviewPreflightOptions = {
    now: new Date(effectiveNowMs),
    allowedClockSkewMs,
  };
  const bundle = await preflightTransitQueryReviewBundle(reviewBundle, normalizedOptions);
  const context = {
    reviewBundleDigest: bundle.digest,
    candidateCount: TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT,
  } as TransitQueryReviewPreflightContext;
  Object.defineProperty(context, transitQueryReviewPreflightContextBrand, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
  transitQueryReviewPreflightContextStates.set(context, {
    bundle,
    effectiveNowMs,
    allowedClockSkewMs,
  });
  return Object.freeze(context);
}

function assertTransitCandidateBindings(
  payload: Pick<
    TransitQueryIndependentReviewPayload | TransitQueryAdjudicationPayload,
    | "datasetId"
    | "datasetFixtureVersion"
    | "fixtureDigest"
    | "datasetDigest"
    | "reviewBundleDigest"
    | "candidateId"
    | "candidateDigest"
    | "revisionId"
    | "revisionResultHash"
    | "snapshotDigest"
    | "queryDigest"
    | "dataEpoch"
    | "resultDigest"
    | "ruleProfileDigest"
    | "luckCycleRuleDigest"
    | "transitTimelineVersion"
    | "transitAlgorithmId"
  >,
  bundle: TransitQueryReviewBundleEnvelope,
): TransitQueryReviewCandidate {
  if (payload.reviewBundleDigest !== bundle.digest) {
    throw new TransitQueryReviewAuditError("REVIEW_BUNDLE_MISMATCH", "审核工件没有绑定当前预检通过的候选审核包。");
  }
  if (
    payload.fixtureDigest !== bundle.payload.dataset.fixtureDigest ||
    payload.datasetDigest !== bundle.payload.dataset.datasetDigest ||
    payload.datasetId !== bundle.payload.dataset.datasetId ||
    payload.datasetFixtureVersion !== bundle.payload.dataset.fixtureVersion
  ) {
    throw new TransitQueryReviewAuditError("DATASET_MISMATCH", "审核工件绑定的数据集或 fixture 与候选审核包不一致。");
  }
  const candidate = bundle.payload.candidates.find((item) => item.id === payload.candidateId);
  if (!candidate) {
    throw new TransitQueryReviewAuditError("UNKNOWN_CANDIDATE", `候选审核包不存在 ${payload.candidateId}。`);
  }
  const expectedBindings = {
    candidateDigest: candidate.candidateDigest,
    revisionId: candidate.revisionId,
    revisionResultHash: candidate.chartContext.revisionResultHash,
    snapshotDigest: candidate.snapshotDigest,
    queryDigest: candidate.queryDigest,
    dataEpoch: candidate.dataEpoch,
    resultDigest: candidate.executionEvidence.resultDigest,
    ruleProfileDigest: candidate.chartContext.ruleProfileDigest,
    luckCycleRuleDigest: candidate.chartContext.luckCycleRuleDigest,
    transitTimelineVersion: bundle.payload.bindings.transitTimelineVersion,
    transitAlgorithmId: bundle.payload.bindings.transitAlgorithmId,
  };
  const actualBindings = {
    candidateDigest: payload.candidateDigest,
    revisionId: payload.revisionId,
    revisionResultHash: payload.revisionResultHash,
    snapshotDigest: payload.snapshotDigest,
    queryDigest: payload.queryDigest,
    dataEpoch: payload.dataEpoch,
    resultDigest: payload.resultDigest,
    ruleProfileDigest: payload.ruleProfileDigest,
    luckCycleRuleDigest: payload.luckCycleRuleDigest,
    transitTimelineVersion: payload.transitTimelineVersion,
    transitAlgorithmId: payload.transitAlgorithmId,
  };
  if (canonicalStringify(actualBindings) !== canonicalStringify(expectedBindings)) {
    throw new TransitQueryReviewAuditError("CANDIDATE_MISMATCH", "审核工件的快照、查询、结果、规则或时间轴绑定与当前候选不一致。");
  }
  return candidate;
}

export async function digestTransitQueryReviewSourceLineage(
  source: Pick<
    TransitQueryReviewSourceEvidence,
    "sourceType" | "title" | "publisherOrCustodian" | "editionOrVersion" | "artifactSha256"
  >,
): Promise<string> {
  return sha256Hex({
    sourceType: source.sourceType,
    title: source.title,
    publisherOrCustodian: source.publisherOrCustodian,
    editionOrVersion: source.editionOrVersion,
    artifactSha256: source.artifactSha256,
  });
}

export async function digestTransitQueryReviewSourceEvidence(
  source: TransitQueryReviewSourceEvidence,
): Promise<string> {
  return sha256Hex(source);
}

export async function createTransitQueryIndependentReviewEnvelope(
  rawPayload: TransitQueryIndependentReviewPayload,
): Promise<TransitQueryIndependentReviewEnvelope> {
  const payload = transitQueryIndependentReviewPayloadSchema.parse({
    ...rawPayload,
    sourceEvidence: [...rawPayload.sourceEvidence].sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  });
  return transitQueryIndependentReviewEnvelopeSchema.parse({
    format: TRANSIT_QUERY_INDEPENDENT_REVIEW_FORMAT,
    formatVersion: TRANSIT_QUERY_REVIEW_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload),
  });
}

export function serializeTransitQueryIndependentReviewEnvelope(
  envelope: TransitQueryIndependentReviewEnvelope,
): string {
  return `${JSON.stringify(transitQueryIndependentReviewEnvelopeSchema.parse(envelope), null, 2)}\n`;
}

export type TransitQueryIndependentReviewPreflightOptions = TransitQueryReviewPreflightOptions & {
  reviewBundle: string | unknown;
};

export type TransitQueryIndependentReviewPreflight = {
  envelope: TransitQueryIndependentReviewEnvelope;
  candidate: TransitQueryReviewCandidate;
  integrityAndBindingPassed: true;
  identityVerified: false;
  sourceAuthenticityVerified: false;
  eligibleForAdjudication: false;
  countsAsVerifiedGold: false;
  notice: string;
};

export async function preflightTransitQueryIndependentReviewInContext(
  raw: string | unknown,
  context: TransitQueryReviewPreflightContext,
): Promise<TransitQueryIndependentReviewPreflight> {
  const state = requireTransitQueryReviewPreflightContext(context);
  const envelope = parseIndependentReviewEnvelope(raw);
  if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
    throw new TransitQueryReviewAuditError("DIGEST_MISMATCH", "独立审核摘要不匹配，文件内容可能已被修改。");
  }
  return preflightTransitQueryIndependentReviewAgainstBundle(
    envelope,
    state.bundle,
    optionsFromTransitQueryReviewPreflightContext(state),
  );
}

export async function preflightTransitQueryIndependentReview(
  raw: string | unknown,
  options: TransitQueryIndependentReviewPreflightOptions,
): Promise<TransitQueryIndependentReviewPreflight> {
  const context = await createTransitQueryReviewPreflightContext(options.reviewBundle, options);
  return preflightTransitQueryIndependentReviewInContext(raw, context);
}

async function preflightTransitQueryIndependentReviewAgainstBundle(
  envelope: TransitQueryIndependentReviewEnvelope,
  bundle: TransitQueryReviewBundleEnvelope,
  options: TransitQueryReviewPreflightOptions,
): Promise<TransitQueryIndependentReviewPreflight> {
  const candidate = assertTransitCandidateBindings(envelope.payload, bundle);
  if (Date.parse(envelope.payload.reviewedAt) < Date.parse(bundle.payload.generatedAt)) {
    throw new TransitQueryReviewAuditError("TIME_INVALID", "独立审核完成时间不能早于候选审核包生成时间。");
  }
  assertReviewTimeNotFuture(envelope.payload.createdAt, options, "独立审核文件创建时间");

  for (const source of envelope.payload.sourceEvidence) {
    if (source.lineageDigest !== await digestTransitQueryReviewSourceLineage(source)) {
      throw new TransitQueryReviewAuditError("SOURCE_INDEPENDENCE_INVALID", `来源 ${source.sourceId} 的谱系摘要不能由冻结材料信息重算。`);
    }
  }
  const proposedText = canonicalStringify(envelope.payload.proposedExpected);
  const candidateText = canonicalStringify(candidate.proposedExpected);
  if (envelope.payload.verdict === "accept" && proposedText !== candidateText) {
    throw new TransitQueryReviewAuditError("DECISION_CONFLICT", "accept 审核不得改写候选原期望。");
  }
  if (envelope.payload.verdict === "replace" && proposedText === candidateText) {
    throw new TransitQueryReviewAuditError("DECISION_CONFLICT", "replace 审核必须提出与候选不同的完整期望。");
  }
  return {
    envelope,
    candidate,
    integrityAndBindingPassed: true,
    identityVerified: false,
    sourceAuthenticityVerified: false,
    eligibleForAdjudication: false,
    countsAsVerifiedGold: false,
    notice: "预检只确认 JSON、安全边界、内容摘要、当前候选绑定、来源谱系重算和时间顺序；未登记公钥且未核验现实身份与材料真伪，因此不能自动进入裁决或增加专家金标准。",
  };
}

export async function createTransitQueryAdjudicationEnvelope(
  rawPayload: TransitQueryAdjudicationPayload,
): Promise<TransitQueryAdjudicationEnvelope> {
  const independentReviewDigests = [...rawPayload.independentReviewDigests].sort() as [string, string];
  const authoritySourceRefs = [...rawPayload.authoritySourceRefs].sort((left, right) =>
    `${left.reviewDigest}:${left.sourceId}`.localeCompare(`${right.reviewDigest}:${right.sourceId}`));
  const payload = transitQueryAdjudicationPayloadSchema.parse({
    ...rawPayload,
    independentReviewDigests,
    authoritySourceRefs,
  });
  return transitQueryAdjudicationEnvelopeSchema.parse({
    format: TRANSIT_QUERY_ADJUDICATION_FORMAT,
    formatVersion: TRANSIT_QUERY_REVIEW_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload),
  });
}

export function serializeTransitQueryAdjudicationEnvelope(
  envelope: TransitQueryAdjudicationEnvelope,
): string {
  return `${JSON.stringify(transitQueryAdjudicationEnvelopeSchema.parse(envelope), null, 2)}\n`;
}

export type TransitQueryAdjudicationPreflightOptions = TransitQueryReviewPreflightOptions & {
  reviewBundle: string | unknown;
  independentReviews: readonly [string | unknown, string | unknown];
};

export type TransitQueryAdjudicationPreflight = {
  envelope: TransitQueryAdjudicationEnvelope;
  candidate: TransitQueryReviewCandidate;
  independentReviews: readonly [TransitQueryIndependentReviewEnvelope, TransitQueryIndependentReviewEnvelope];
  integrityAndBindingPassed: true;
  identityVerified: false;
  sourceAuthenticityVerified: false;
  structurallyReadyForMaintainerAudit: true;
  eligibleForFixtureIntegration: false;
  countsAsVerifiedGold: false;
  notice: string;
};

export async function preflightTransitQueryAdjudicationInContext(
  raw: string | unknown,
  context: TransitQueryReviewPreflightContext,
  independentReviews: readonly [string | unknown, string | unknown],
): Promise<TransitQueryAdjudicationPreflight> {
  const state = requireTransitQueryReviewPreflightContext(context);
  const bundle = state.bundle;
  const options = optionsFromTransitQueryReviewPreflightContext(state);
  const envelope = parseAdjudicationEnvelope(raw);
  if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
    throw new TransitQueryReviewAuditError("DIGEST_MISMATCH", "最终裁决摘要不匹配，文件内容可能已被修改。");
  }
  if (envelope.payload.supersedesDecisionDigest !== null) {
    throw new TransitQueryReviewAuditError(
      "SUPERSESSION_UNVERIFIED",
      "v1 无状态预检无法验证完整替代链；带 supersedesDecisionDigest 的裁决必须交由追加式可信账本处理。",
    );
  }
  const candidate = assertTransitCandidateBindings(envelope.payload, bundle);
  const parsedReviews = independentReviews.map((review) => parseIndependentReviewEnvelope(review)) as [
    TransitQueryIndependentReviewEnvelope,
    TransitQueryIndependentReviewEnvelope,
  ];
  for (const review of parsedReviews) {
    if ((await sha256Hex(review.payload)) !== review.digest) {
      throw new TransitQueryReviewAuditError("DIGEST_MISMATCH", "独立审核摘要不匹配，文件内容可能已被修改。");
    }
  }
  const reviewResults = await Promise.all(parsedReviews.map((review) =>
    preflightTransitQueryIndependentReviewAgainstBundle(review, bundle, options)));
  const reviews = reviewResults.map((result) => result.envelope) as [
    TransitQueryIndependentReviewEnvelope,
    TransitQueryIndependentReviewEnvelope,
  ];
  const suppliedReviewDigests = reviews.map((review) => review.digest).sort();
  if (canonicalStringify(suppliedReviewDigests) !== canonicalStringify(envelope.payload.independentReviewDigests)) {
    throw new TransitQueryReviewAuditError("REVIEW_MISMATCH", "最终裁决引用的两份审核摘要与实际导入文件不一致。");
  }
  if (reviews.some((review) => review.payload.candidateDigest !== candidate.candidateDigest)) {
    throw new TransitQueryReviewAuditError("REVIEW_MISMATCH", "两份独立审核没有绑定最终裁决的同一候选。");
  }

  const reviewerIds = new Set(reviews.map((review) => review.payload.reviewer.reviewerId));
  const reviewerIdentityRefs = new Set(reviews.map((review) => review.payload.reviewer.identityRecordRef));
  if (reviewerIds.size !== 2 || reviewerIdentityRefs.size !== 2) {
    throw new TransitQueryReviewAuditError("REVIEWER_NOT_INDEPENDENT", "两份审核必须来自两个不同 reviewer ID 和不同离线身份记录摘要。");
  }
  if (
    reviewerIds.has(envelope.payload.adjudicator.adjudicatorId) ||
    reviewerIdentityRefs.has(envelope.payload.adjudicator.identityRecordRef)
  ) {
    throw new TransitQueryReviewAuditError("REVIEWER_NOT_INDEPENDENT", "裁决人必须不同于两位独立审核人。");
  }

  const refLineages = new Map<string, string>();
  const artifactLineages = new Map<string, string>();
  const qualifyingLineages = new Set<string>();
  for (const review of reviews) {
    for (const source of review.payload.sourceEvidence) {
      const existingRefLineage = refLineages.get(source.sourceRef);
      if (existingRefLineage !== undefined && existingRefLineage !== source.lineageDigest) {
        throw new TransitQueryReviewAuditError("SOURCE_INDEPENDENCE_INVALID", "同一来源引用不能跨审核伪装成不同材料谱系。");
      }
      refLineages.set(source.sourceRef, source.lineageDigest);
      const existingArtifactLineage = artifactLineages.get(source.artifactSha256);
      if (existingArtifactLineage !== undefined && existingArtifactLineage !== source.lineageDigest) {
        throw new TransitQueryReviewAuditError("SOURCE_INDEPENDENCE_INVALID", "同一材料摘要不能跨审核伪装成不同材料谱系。");
      }
      artifactLineages.set(source.artifactSha256, source.lineageDigest);
      if (source.role !== "reference" && source.sourceType !== "software_crosscheck" && source.sourceType !== "other") {
        qualifyingLineages.add(source.lineageDigest);
      }
    }
  }
  if (qualifyingLineages.size < bundle.payload.reviewPolicy.requiredIndependentSourceLineageCount) {
    throw new TransitQueryReviewAuditError("SOURCE_INDEPENDENCE_INVALID", "两份审核合计不足两个可重算的独立权威材料谱系。");
  }

  const reviewByDigest = new Map(reviews.map((review) => [review.digest, review]));
  const representedReviews = new Set<string>();
  const referencedLineages = new Set<string>();
  for (const sourceRef of envelope.payload.authoritySourceRefs) {
    const review = reviewByDigest.get(sourceRef.reviewDigest);
    const source = review?.payload.sourceEvidence.find((item) => item.sourceId === sourceRef.sourceId);
    if (
      !source ||
      source.lineageId !== sourceRef.lineageId ||
      source.lineageDigest !== sourceRef.lineageDigest ||
      await digestTransitQueryReviewSourceEvidence(source) !== sourceRef.sourceEvidenceDigest
    ) {
      throw new TransitQueryReviewAuditError("SOURCE_INDEPENDENCE_INVALID", "最终裁决引用的来源不存在或与独立审核中的冻结来源不一致。");
    }
    representedReviews.add(sourceRef.reviewDigest);
    if (source.role !== "reference") referencedLineages.add(source.lineageDigest);
  }
  if (representedReviews.size !== 2 || referencedLineages.size < 2) {
    throw new TransitQueryReviewAuditError("SOURCE_INDEPENDENCE_INVALID", "最终裁决必须明确引用两份审核中的来源，并覆盖至少两个材料谱系。");
  }

  const effectiveText = canonicalStringify(envelope.payload.effectiveExpected);
  const candidateText = canonicalStringify(candidate.proposedExpected);
  const supportedByReview = reviews.some((review) => {
    if (envelope.payload.decision === "accept_expected") {
      return review.payload.verdict === "accept" && canonicalStringify(review.payload.proposedExpected) === effectiveText;
    }
    if (envelope.payload.decision === "replace_expected") {
      return review.payload.verdict === "replace" && canonicalStringify(review.payload.proposedExpected) === effectiveText;
    }
    return review.payload.verdict === "reject" && review.payload.proposedExpected === null;
  });
  if (!supportedByReview) {
    throw new TransitQueryReviewAuditError("DECISION_CONFLICT", "最终裁决提出了两份独立审核都没有完整审核过的第三种结果。");
  }
  if (envelope.payload.decision === "accept_expected" && effectiveText !== candidateText) {
    throw new TransitQueryReviewAuditError("DECISION_CONFLICT", "accept_expected 裁决不得改写候选原期望。");
  }
  if (envelope.payload.decision === "replace_expected" && effectiveText === candidateText) {
    throw new TransitQueryReviewAuditError("DECISION_CONFLICT", "replace_expected 裁决必须给出与候选不同的完整期望。");
  }
  if (reviews.some((review) => Date.parse(review.payload.createdAt) > Date.parse(envelope.payload.decidedAt))) {
    throw new TransitQueryReviewAuditError("TIME_INVALID", "最终裁决时间不能早于任一独立审核文件创建时间。");
  }
  assertReviewTimeNotFuture(envelope.payload.createdAt, options, "最终裁决文件创建时间");

  return {
    envelope,
    candidate,
    independentReviews: reviews,
    integrityAndBindingPassed: true,
    identityVerified: false,
    sourceAuthenticityVerified: false,
    structurallyReadyForMaintainerAudit: true,
    eligibleForFixtureIntegration: false,
    countsAsVerifiedGold: false,
    notice: "双审与裁决的结构、摘要、候选、来源谱系和时间顺序均已通过预检；但 SHA-256 不是人员签名，现实身份、材料真实性和首次提交状态仍须维护者在线下可信账本中核验。预检不会写入 fixture，专家金标准仍为 0。",
  };
}

export async function preflightTransitQueryAdjudication(
  raw: string | unknown,
  options: TransitQueryAdjudicationPreflightOptions,
): Promise<TransitQueryAdjudicationPreflight> {
  const context = await createTransitQueryReviewPreflightContext(options.reviewBundle, options);
  return preflightTransitQueryAdjudicationInContext(raw, context, options.independentReviews);
}

export function summarizeTransitQueryReviewEvidence() {
  return {
    total: TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT,
    engineeringCandidates: TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT,
    verifiedTransitFacts: 0,
    verifiedQueryAdjudications: 0,
    requiredVerifiedCandidateCount: TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT,
    releaseGatePassed: false as const,
    verifiedCountingEnabled: false as const,
  };
}

export type TransitQueryReviewVerificationReport = ReturnType<typeof summarizeTransitQueryReviewEvidence> & {
  passed: number;
  mismatches: Array<{ candidateId: string; message: string }>;
};

export async function verifyTransitQueryReviewCandidates(): Promise<TransitQueryReviewVerificationReport> {
  const bundle = await createTransitQueryReviewBundle({ generatedAt: FIXED_CALCULATED_AT });
  const mismatches: Array<{ candidateId: string; message: string }> = [];
  for (const candidate of bundle.payload.candidates) {
    const matched = candidate.executionEvidence.matchingCaseIds.length === 1;
    if ((candidate.proposedExpected.queryOutcome === "matched") !== matched) {
      mismatches.push({ candidateId: candidate.id, message: "语义期望与 ResearchQuery 工程命中结果不一致" });
    }
    if (candidate.proposedExpected.status === "resolved" && Date.parse(candidate.proposedExpected.endExclusiveInstant) <= Date.parse(candidate.proposedExpected.startInstant)) {
      mismatches.push({ candidateId: candidate.id, message: "运限节点不是正长度半开区间" });
    }
  }
  return {
    ...summarizeTransitQueryReviewEvidence(),
    passed: TRANSIT_QUERY_REVIEW_CANDIDATE_COUNT - new Set(mismatches.map((item) => item.candidateId)).size,
    mismatches,
  };
}
