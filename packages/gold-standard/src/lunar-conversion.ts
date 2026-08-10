import type { BirthInput } from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import {
  resolveBirthCalendarInput,
  resolveGregorianCalendarDate
} from "@hakimi/time-core";
import { z } from "zod";
import rawFixture from "../fixtures/calendar-conversion-candidates.v1.json";

// Keep gold-fixture parsing independent from the system under test: this checks
// canonical field bounds only. Month length, leap-month existence and mapping
// mismatches belong in verifyCalendarConversionCandidates so a broken adapter
// cannot prevent the authority fixture from loading and reporting its failures.
const lunarDateTextSchema = z.string().regex(
  /^(?:19\d{2}|20\d{2}|2100)-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|30)$/
);
const gregorianDateTextSchema = z.string()
  .regex(/^(?:19\d{2}|20\d{2}|2100)-\d{2}-\d{2}$/)
  .superRefine((value, context) => {
    const timestamp = Date.parse(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
      context.addIssue({ code: "custom", message: "公历日期必须是真实存在的规范 YYYY-MM-DD" });
    }
  });
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const httpsUrlSchema = z.string().max(2048).url().superRefine((value, context) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return;
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "") {
    context.addIssue({ code: "custom", message: "审核来源只接受无凭据的 HTTPS URL" });
  }
});
const canonicalReviewerIdSchema = z.string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/)
  .refine((value) => value === value.trim().normalize("NFKC").toLowerCase(), {
    message: "复核人 ID 必须使用规范的小写 ASCII 标识"
  });

const calendarConversionSourceTypeSchema = z.enum([
  "official_calendar",
  "published_almanac",
  "academic_publication",
  "software_implementation",
  "other"
]);

export const CALENDAR_REVIEW_ATTESTATION_STATEMENT =
  "我已独立核对本裁决绑定的数据集、候选 fixture、候选日期对、来源材料 SHA-256 与定位，并确认裁决及生效日期对。" as const;

export const CALENDAR_REVIEW_BUNDLE_FORMAT = "hakimi-calendar-conversion-review-bundle" as const;
export const CALENDAR_DECISION_FORMAT = "hakimi-calendar-conversion-decision" as const;
export const CALENDAR_AUDIT_FORMAT_VERSION = "1.0.0" as const;
export const CALENDAR_DECISION_RECORD_VERSION = "1.0.0" as const;

export const calendarConversionSourceSchema = z.strictObject({
  sourceId: z.string().max(100).regex(/^[a-z0-9-]+$/),
  lineageId: z.string().max(100).regex(/^[a-z0-9-]+$/),
  sourceType: calendarConversionSourceTypeSchema,
  title: z.string().min(1).max(300),
  publisher: z.string().min(1).max(200),
  editionOrVersion: z.string().min(1).max(300),
  sourceRef: httpsUrlSchema,
  accessedAt: z.string().datetime(),
  artifactSha256: sha256Schema.nullable(),
  licenseRef: httpsUrlSchema.nullable(),
  note: z.string().max(2000)
});

export const calendarConversionObservationSchema = z.strictObject({
  role: z.enum(["authoritative", "reference", "crosscheck"]),
  sourceId: z.string().max(100).regex(/^[a-z0-9-]+$/),
  locator: z.string().min(1).max(500),
  observedLunarDate: lunarDateTextSchema,
  observedLunarLeapMonth: z.boolean(),
  observedGregorianDate: gregorianDateTextSchema
});

export const calendarConversionAttestationSchema = z.strictObject({
  role: z.enum(["primary", "second"]),
  reviewerId: canonicalReviewerIdSchema,
  displayName: z.string().trim().min(1).max(80),
  reviewedAt: z.string().datetime(),
  statement: z.literal(CALENDAR_REVIEW_ATTESTATION_STATEMENT)
});

export const calendarConversionEvidenceSchema = z.strictObject({
  status: z.enum(["candidate", "cross_checked", "verified"]),
  observations: z.array(calendarConversionObservationSchema).min(1).max(16),
  attestations: z.array(calendarConversionAttestationSchema).max(2),
  decisionRecordRef: z.string().regex(/^sha256:[a-f0-9]{64}$/).nullable()
});

export const calendarConversionCaseSchema = z.strictObject({
  id: z.string().regex(/^calendar-[a-z0-9-]+$/),
  category: z.enum([
    "month_size",
    "leap_month",
    "lunar_year_boundary",
    "supported_range_upper_edge",
    "regression_anchor"
  ]),
  coverageTags: z.array(z.string().max(80).regex(/^[a-z0-9_]+$/)).min(1).max(24),
  lunarDate: lunarDateTextSchema,
  lunarLeapMonth: z.boolean(),
  expectedGregorianDate: gregorianDateTextSchema,
  evidence: calendarConversionEvidenceSchema
});

export const calendarConversionCrossCheckRunSchema = z.strictObject({
  runId: z.string().regex(/^[a-z0-9-]+$/),
  sourceId: z.string().regex(/^[a-z0-9-]+$/),
  executedAt: z.string().datetime(),
  environment: z.string().min(1).max(1000),
  method: z.string().min(1).max(2000),
  matchedCaseIds: z.array(z.string().regex(/^calendar-[a-z0-9-]+$/)).max(24),
  unsupportedCaseIds: z.array(z.string().regex(/^calendar-[a-z0-9-]+$/)).max(24),
  mismatches: z.array(z.strictObject({
    caseId: z.string().regex(/^calendar-[a-z0-9-]+$/),
    expected: z.string().min(1).max(500),
    actual: z.string().min(1).max(500)
  })).max(24)
});

export const calendarConversionExpectedPairSchema = z.strictObject({
  lunarDate: lunarDateTextSchema,
  lunarLeapMonth: z.boolean(),
  gregorianDate: gregorianDateTextSchema
});

export const calendarDecisionSourceEvidenceSchema = z.strictObject({
  sourceId: z.string().regex(/^[a-z0-9-]+$/),
  lineageId: z.string().regex(/^[a-z0-9-]+$/),
  role: z.enum(["authoritative", "crosscheck", "reference"]),
  sourceType: calendarConversionSourceTypeSchema,
  title: z.string().min(1).max(200),
  publisher: z.string().min(1).max(160),
  editionOrVersion: z.string().min(1).max(160),
  locator: z.string().min(1).max(500),
  sourceRef: z.string().min(1).max(2048).refine((value) => !/^\s*(?:javascript|data|file):/i.test(value), {
    message: "来源引用不能使用可执行或本地文件 scheme"
  }),
  accessedAt: z.string().datetime(),
  artifactSha256: sha256Schema,
  observedPair: calendarConversionExpectedPairSchema,
  runId: z.string().regex(/^[a-z0-9-]+$/).nullable(),
  runDigest: sha256Schema.nullable(),
  outcome: z.enum(["matched", "unsupported", "mismatch"]).nullable(),
  note: z.string().max(1000)
});

export const calendarDecisionPayloadSchema = z.strictObject({
  recordVersion: z.literal(CALENDAR_DECISION_RECORD_VERSION),
  datasetId: z.literal("hko-calendar-conversion-candidates-v1"),
  datasetFixtureVersion: z.literal("1.0.0"),
  fixtureDigest: sha256Schema,
  datasetDigest: sha256Schema,
  reviewBundleDigest: sha256Schema,
  frame: z.literal("fixed_plus08_lunisolar_date"),
  caseId: z.string().regex(/^calendar-[a-z0-9-]+$/),
  candidateDigest: sha256Schema,
  decision: z.enum(["accept_expected", "replace_expected", "reject_candidate"]),
  expected: calendarConversionExpectedPairSchema.nullable(),
  sourceEvidence: z.array(calendarDecisionSourceEvidenceSchema).min(1).max(16),
  attestations: z.array(calendarConversionAttestationSchema).length(2),
  decidedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  rationale: z.string().trim().min(1).max(2000),
  supersedesDecisionDigest: sha256Schema.nullable()
}).superRefine((value, context) => {
  if (value.decision === "reject_candidate" && value.expected !== null) {
    context.addIssue({ code: "custom", path: ["expected"], message: "拒绝候选时 expected 必须为 null" });
  }
  if (value.decision !== "reject_candidate" && value.expected === null) {
    context.addIssue({ code: "custom", path: ["expected"], message: "接受或替换候选时必须给出期望日期对" });
  }

  const attestationRoles = new Set(value.attestations.map((item) => item.role));
  const reviewerIds = new Set(value.attestations.map((item) => item.reviewerId));
  if (attestationRoles.size !== 2 || !attestationRoles.has("primary") || !attestationRoles.has("second")) {
    context.addIssue({ code: "custom", path: ["attestations"], message: "裁决必须包含 primary 与 second 两种复核角色" });
  }
  if (reviewerIds.size !== value.attestations.length) {
    context.addIssue({ code: "custom", path: ["attestations"], message: "主复核人与第二复核人必须是不同身份" });
  }

  const primary = value.attestations.find((item) => item.role === "primary");
  const second = value.attestations.find((item) => item.role === "second");
  if (primary && second && Date.parse(primary.reviewedAt) >= Date.parse(second.reviewedAt)) {
    context.addIssue({ code: "custom", path: ["attestations"], message: "主复核必须早于第二复核完成" });
  }

  const sourceIds = new Set<string>();
  const qualifyingLineages = new Set<string>();
  const refLineages = new Map<string, string>();
  const artifactLineages = new Map<string, string>();
  let hasAuthority = false;
  value.sourceEvidence.forEach((source, sourceIndex) => {
    if (sourceIds.has(source.sourceId)) {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "sourceId"], message: "裁决来源 ID 必须唯一" });
    }
    sourceIds.add(source.sourceId);

    const isAuthorityType = ["official_calendar", "published_almanac", "academic_publication"]
      .includes(source.sourceType);
    if (source.role === "authoritative" && !isAuthorityType) {
      context.addIssue({
        code: "custom",
        path: ["sourceEvidence", sourceIndex, "role"],
        message: "软件实现或其他来源不能自称 authoritative"
      });
    }
    if (source.sourceType === "software_implementation") {
      if (
        source.role !== "crosscheck" ||
        source.runId === null ||
        source.runDigest === null ||
        source.outcome === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["sourceEvidence", sourceIndex],
          message: "软件来源必须绑定 crosscheck 角色、冻结运行摘要和逐案结果"
        });
      }
    } else if (source.runId !== null || source.runDigest !== null || source.outcome !== null) {
      context.addIssue({
        code: "custom",
        path: ["sourceEvidence", sourceIndex],
        message: "非软件来源不得伪造差分运行字段"
      });
    }
    if (source.role !== "reference" && source.sourceType !== "other") {
      qualifyingLineages.add(source.lineageId);
    }
    hasAuthority ||= source.role === "authoritative" && isAuthorityType;

    const refLineage = refLineages.get(source.sourceRef);
    if (refLineage !== undefined && refLineage !== source.lineageId) {
      context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "lineageId"], message: "同一来源引用不能伪装成不同谱系" });
    }
    refLineages.set(source.sourceRef, source.lineageId);
    if (source.artifactSha256 !== null) {
      const artifactLineage = artifactLineages.get(source.artifactSha256);
      if (artifactLineage !== undefined && artifactLineage !== source.lineageId) {
        context.addIssue({ code: "custom", path: ["sourceEvidence", sourceIndex, "lineageId"], message: "同一材料摘要不能伪装成不同谱系" });
      }
      artifactLineages.set(source.artifactSha256, source.lineageId);
    }
  });

  if (value.decision !== "reject_candidate") {
    if (!hasAuthority) {
      context.addIssue({ code: "custom", path: ["sourceEvidence"], message: "接受或替换至少需要一项权威历表、出版历书或学术资料" });
    }
    if (qualifyingLineages.size < 2) {
      context.addIssue({ code: "custom", path: ["sourceEvidence"], message: "接受或替换至少需要两个不同来源谱系" });
    }
  }

  const decidedAt = Date.parse(value.decidedAt);
  if (value.attestations.some((item) => Date.parse(item.reviewedAt) > decidedAt)) {
    context.addIssue({ code: "custom", path: ["decidedAt"], message: "裁决时间不能早于任一复核时间" });
  }
  if (value.sourceEvidence.some((item) => Date.parse(item.accessedAt) > decidedAt)) {
    context.addIssue({ code: "custom", path: ["decidedAt"], message: "裁决时间不能早于来源访问时间" });
  }
  if (decidedAt > Date.parse(value.createdAt)) {
    context.addIssue({ code: "custom", path: ["createdAt"], message: "记录创建时间不能早于裁决时间" });
  }
});

export const calendarDecisionEnvelopeSchema = z.strictObject({
  format: z.literal(CALENDAR_DECISION_FORMAT),
  formatVersion: z.literal(CALENDAR_AUDIT_FORMAT_VERSION),
  payload: calendarDecisionPayloadSchema,
  digest: sha256Schema
});

const calendarReviewCandidateSchema = calendarConversionCaseSchema.extend({
  candidateDigest: sha256Schema
});

const calendarReviewBundlePayloadSchema = z.strictObject({
  generatedAt: z.string().datetime(),
  dataset: z.strictObject({
    datasetId: z.literal("hko-calendar-conversion-candidates-v1"),
    fixtureVersion: z.literal("1.0.0"),
    fixtureDigest: sha256Schema,
    datasetDigest: sha256Schema,
    title: z.string().min(1),
    notice: z.string().min(1),
    frame: z.literal("fixed_plus08_lunisolar_date"),
    requiredCalendarGoldCaseCount: z.literal(24),
    requiredProjectGoldCaseCount: z.literal(360),
    sourceLandingPage: httpsUrlSchema,
    openDataDataset: httpsUrlSchema,
    reuseTerms: httpsUrlSchema,
    knownCaveats: z.array(z.string().min(1).max(2000)).min(1).max(16),
    reviewPolicy: z.strictObject({
      lifecycleVersion: z.string().min(1),
      verifiedCountingEnabled: z.literal(false),
      notice: z.string().min(1)
    })
  }),
  reviewPolicy: z.strictObject({
    candidateCount: z.literal(24),
    requiredAttestationCount: z.literal(2),
    currentVerifiedCount: z.literal(0),
    attestationStatement: z.literal(CALENDAR_REVIEW_ATTESTATION_STATEMENT),
    integrityNotice: z.string().min(1),
    releaseNotice: z.string().min(1)
  }),
  sources: z.array(calendarConversionSourceSchema).min(1).max(64),
  independentCrossCheckRuns: z.array(calendarConversionCrossCheckRunSchema).min(1).max(16),
  candidates: z.array(calendarReviewCandidateSchema).length(24)
});

export const calendarReviewBundleEnvelopeSchema = z.strictObject({
  format: z.literal(CALENDAR_REVIEW_BUNDLE_FORMAT),
  formatVersion: z.literal(CALENDAR_AUDIT_FORMAT_VERSION),
  payload: calendarReviewBundlePayloadSchema,
  digest: sha256Schema
});

export const calendarConversionFixtureSchema = z.strictObject({
  fixtureVersion: z.literal("1.0.0"),
  datasetId: z.literal("hko-calendar-conversion-candidates-v1"),
  title: z.string().min(1),
  notice: z.string().min(1),
  frame: z.literal("fixed_plus08_lunisolar_date"),
  requiredCalendarGoldCaseCount: z.literal(24),
  requiredProjectGoldCaseCount: z.literal(360),
  reviewPolicy: z.strictObject({
    lifecycleVersion: z.literal("candidate-only-v1"),
    verifiedCountingEnabled: z.literal(false),
    notice: z.string().min(1)
  }),
  sourceLandingPage: httpsUrlSchema,
  openDataDataset: httpsUrlSchema,
  reuseTerms: httpsUrlSchema,
  knownCaveats: z.array(z.string().min(1).max(2000)).min(1).max(16),
  sources: z.array(calendarConversionSourceSchema).min(1).max(64),
  independentCrossCheckRuns: z.array(calendarConversionCrossCheckRunSchema).min(1).max(16),
  cases: z.array(calendarConversionCaseSchema).length(24)
}).superRefine((fixture, context) => {
  const sourceById = new Map(fixture.sources.map((source) => [source.sourceId, source]));
  if (sourceById.size !== fixture.sources.length) {
    context.addIssue({ code: "custom", path: ["sources"], message: "来源 sourceId 必须唯一" });
  }
  const sourceRefLineage = new Map<string, string>();
  const artifactLineage = new Map<string, string>();
  fixture.sources.forEach((source, sourceIndex) => {
    const refLineage = sourceRefLineage.get(source.sourceRef);
    if (refLineage !== undefined && refLineage !== source.lineageId) {
      context.addIssue({
        code: "custom",
        path: ["sources", sourceIndex, "lineageId"],
        message: "同一 sourceRef 不能通过更换 sourceId 被伪装成不同来源谱系"
      });
    }
    sourceRefLineage.set(source.sourceRef, source.lineageId);

    if (source.artifactSha256 !== null) {
      const hashLineage = artifactLineage.get(source.artifactSha256);
      if (hashLineage !== undefined && hashLineage !== source.lineageId) {
        context.addIssue({
          code: "custom",
          path: ["sources", sourceIndex, "lineageId"],
          message: "同一来源材料摘要不能被登记到不同来源谱系"
        });
      }
      artifactLineage.set(source.artifactSha256, source.lineageId);
    }
  });

  type CrossCheckOutcome = "matched" | "unsupported" | "mismatch";
  const crossCheckOutcomes = new Map<string, Set<CrossCheckOutcome>>();
  const recordOutcome = (sourceId: string, caseId: string, outcome: CrossCheckOutcome) => {
    const key = `${sourceId}|${caseId}`;
    const outcomes = crossCheckOutcomes.get(key) ?? new Set<CrossCheckOutcome>();
    outcomes.add(outcome);
    crossCheckOutcomes.set(key, outcomes);
  };
  fixture.independentCrossCheckRuns.forEach((run) => {
    run.matchedCaseIds.forEach((caseId) => recordOutcome(run.sourceId, caseId, "matched"));
    run.unsupportedCaseIds.forEach((caseId) => recordOutcome(run.sourceId, caseId, "unsupported"));
    run.mismatches.forEach(({ caseId }) => recordOutcome(run.sourceId, caseId, "mismatch"));
  });

  const caseIds = new Set<string>();
  const pairs = new Set<string>();
  const gregorianDates = new Set<string>();
  fixture.cases.forEach((candidate, caseIndex) => {
    if (caseIds.has(candidate.id)) {
      context.addIssue({ code: "custom", path: ["cases", caseIndex, "id"], message: "案例 ID 必须唯一" });
    }
    caseIds.add(candidate.id);

    const pairKey = `${candidate.lunarDate}|${candidate.lunarLeapMonth ? "leap" : "regular"}`;
    if (pairs.has(pairKey)) {
      context.addIssue({ code: "custom", path: ["cases", caseIndex], message: "24 条必须是唯一公农历对，不能拆方向重复计数" });
    }
    pairs.add(pairKey);
    if (gregorianDates.has(candidate.expectedGregorianDate)) {
      context.addIssue({ code: "custom", path: ["cases", caseIndex, "expectedGregorianDate"], message: "公历期望日期必须唯一" });
    }
    gregorianDates.add(candidate.expectedGregorianDate);

    const evidenceLineages = new Set<string>();
    let hasAuthority = false;
    candidate.evidence.observations.forEach((observation, observationIndex) => {
      const source = sourceById.get(observation.sourceId);
      if (!source) {
        context.addIssue({
          code: "custom",
          path: ["cases", caseIndex, "evidence", "observations", observationIndex, "sourceId"],
          message: "案例引用了未登记来源"
        });
        return;
      }
      const authoritySource = ["official_calendar", "published_almanac", "academic_publication"]
        .includes(source.sourceType);
      if (observation.role === "authoritative" && !authoritySource) {
        context.addIssue({
          code: "custom",
          path: ["cases", caseIndex, "evidence", "observations", observationIndex, "role"],
          message: "authoritative 观察只能绑定官方历表、出版历书或学术资料，软件实现不能自称权威来源"
        });
      }
      if (observation.role !== "reference" && source.sourceType !== "other") {
        evidenceLineages.add(source.lineageId);
      }
      hasAuthority ||= observation.role === "authoritative" && authoritySource;

      if (observation.role === "crosscheck" && source.sourceType === "software_implementation") {
        const outcomes = crossCheckOutcomes.get(`${source.sourceId}|${candidate.id}`);
        if (outcomes?.size !== 1 || !outcomes.has("matched")) {
          context.addIssue({
            code: "custom",
            path: ["cases", caseIndex, "evidence", "observations", observationIndex],
            message: "软件交叉观察必须绑定该来源冻结运行中的 matched 结果；unsupported 或 mismatch 不能升级案例状态"
          });
        }
      }
      if (
        observation.observedLunarDate !== candidate.lunarDate ||
        observation.observedLunarLeapMonth !== candidate.lunarLeapMonth ||
        observation.observedGregorianDate !== candidate.expectedGregorianDate
      ) {
        context.addIssue({
          code: "custom",
          path: ["cases", caseIndex, "evidence", "observations", observationIndex],
          message: "来源观察值必须与该案例的冻结公农历对完全一致"
        });
      }
    });

    if (candidate.evidence.status === "cross_checked" && evidenceLineages.size < 2) {
      context.addIssue({
        code: "custom",
        path: ["cases", caseIndex, "evidence", "status"],
        message: "cross_checked 至少需要两个不同来源谱系；同机构的文本和 CSV 仍只算一个谱系"
      });
    }

    if (candidate.evidence.status === "verified") {
      if (!fixture.reviewPolicy.verifiedCountingEnabled) {
        context.addIssue({
          code: "custom",
          path: ["cases", caseIndex, "evidence", "status"],
          message: "candidate-only-v1 尚未纳入真实双人裁决及新版本 fixture，禁止把案例标为 verified"
        });
      }
      const roles = new Set(candidate.evidence.attestations.map((item) => item.role));
      const reviewers = new Set(candidate.evidence.attestations.map((item) => item.reviewerId));
      if (!hasAuthority || evidenceLineages.size < 2) {
        context.addIssue({
          code: "custom",
          path: ["cases", caseIndex, "evidence", "observations"],
          message: "verified 必须包含权威来源及至少两个独立来源谱系"
        });
      }
      if (
        candidate.evidence.attestations.length !== 2 ||
        roles.size !== 2 ||
        reviewers.size !== 2 ||
        candidate.evidence.decisionRecordRef === null
      ) {
        context.addIssue({
          code: "custom",
          path: ["cases", caseIndex, "evidence"],
          message: "verified 必须绑定两个不同复核身份、主复核与第二复核角色及裁决记录"
        });
      }
    }
  });

  const runIds = new Set<string>();
  const runSourceIds = new Set<string>();
  fixture.independentCrossCheckRuns.forEach((run, runIndex) => {
    if (runIds.has(run.runId)) {
      context.addIssue({ code: "custom", path: ["independentCrossCheckRuns", runIndex, "runId"], message: "差分运行 ID 必须唯一" });
    }
    runIds.add(run.runId);
    if (runSourceIds.has(run.sourceId)) {
      context.addIssue({
        code: "custom",
        path: ["independentCrossCheckRuns", runIndex, "sourceId"],
        message: "candidate-only-v1 每个固定软件来源只允许一份冻结运行；重跑替代必须升级 fixture 与来源身份"
      });
    }
    runSourceIds.add(run.sourceId);
    const source = sourceById.get(run.sourceId);
    if (!source || source.sourceType !== "software_implementation") {
      context.addIssue({
        code: "custom",
        path: ["independentCrossCheckRuns", runIndex, "sourceId"],
        message: "独立差分运行必须绑定已登记的软件实现来源"
      });
    }
    if (source?.lineageId === "hong-kong-observatory-calendar") {
      context.addIssue({
        code: "custom",
        path: ["independentCrossCheckRuns", runIndex, "sourceId"],
        message: "权威历表与独立差分实现不能属于同一来源谱系"
      });
    }

    const outcomeIds = [
      ...run.matchedCaseIds,
      ...run.unsupportedCaseIds,
      ...run.mismatches.map((mismatch) => mismatch.caseId)
    ];
    if (new Set(outcomeIds).size !== outcomeIds.length) {
      context.addIssue({
        code: "custom",
        path: ["independentCrossCheckRuns", runIndex],
        message: "同一案例不能在一次差分运行中同时属于多个结果集合"
      });
    }
    if (outcomeIds.length !== fixture.cases.length || outcomeIds.some((caseId) => !caseIds.has(caseId))) {
      context.addIssue({
        code: "custom",
        path: ["independentCrossCheckRuns", runIndex],
        message: "每次冻结差分运行必须对 24 条案例逐条记录匹配、不支持或分歧"
      });
    }
  });

  for (const [key, outcomes] of crossCheckOutcomes) {
    if (outcomes.size > 1) {
      context.addIssue({
        code: "custom",
        path: ["independentCrossCheckRuns"],
        message: `同一软件来源与案例存在互相矛盾的冻结运行结果：${key}`
      });
    }
  }
});

export type CalendarConversionSource = z.infer<typeof calendarConversionSourceSchema>;
export type CalendarConversionCandidate = z.infer<typeof calendarConversionCaseSchema>;
export type CalendarConversionCrossCheckRun = z.infer<typeof calendarConversionCrossCheckRunSchema>;
export type CalendarConversionFixture = z.infer<typeof calendarConversionFixtureSchema>;
export type CalendarConversionExpectedPair = z.infer<typeof calendarConversionExpectedPairSchema>;
export type CalendarDecisionPayload = z.infer<typeof calendarDecisionPayloadSchema>;
export type CalendarDecisionEnvelope = z.infer<typeof calendarDecisionEnvelopeSchema>;
export type CalendarReviewBundleEnvelope = z.infer<typeof calendarReviewBundleEnvelopeSchema>;

export type CalendarDecisionPreflight = {
  envelope: CalendarDecisionEnvelope;
  candidate: CalendarConversionCandidate;
  effectiveExpected: CalendarConversionExpectedPair | null;
  identityVerified: false;
  sourceAuthenticityVerified: false;
  eligibleForFixtureIntegration: false;
  countsAsVerifiedGold: false;
  notice: string;
};

export type CalendarReviewBundlePreflightOptions = {
  fixture?: CalendarConversionFixture;
  now?: string | Date;
  allowedClockSkewMs?: number;
};

export type CalendarDecisionPreflightOptions = CalendarReviewBundlePreflightOptions & {
  reviewBundle: string | unknown;
};

export type CalendarGoldAuditErrorCode =
  | "INVALID_JSON"
  | "INPUT_TOO_LARGE"
  | "NON_JSON_VALUE"
  | "PROTOTYPE_POLLUTION_KEY"
  | "INVALID_FORMAT"
  | "DIGEST_MISMATCH"
  | "FIXTURE_MISMATCH"
  | "DATASET_MISMATCH"
  | "REVIEW_BUNDLE_MISMATCH"
  | "UNKNOWN_CANDIDATE"
  | "CANDIDATE_MISMATCH"
  | "SOURCE_MISMATCH"
  | "SOURCE_LINEAGE_CONFLICT"
  | "TIME_ORDER_INVALID"
  | "DECISION_CONFLICT"
  | "UNSUPPORTED_CROSSCHECK";

export class CalendarGoldAuditError extends Error {
  constructor(public readonly code: CalendarGoldAuditErrorCode, message: string) {
    super(message);
    this.name = "CalendarGoldAuditError";
  }
}

const MAX_CALENDAR_REVIEW_BUNDLE_BYTES = 1024 * 1024;
const MAX_CALENDAR_DECISION_BYTES = 256 * 1024;
const MAX_CALENDAR_AUDIT_JSON_DEPTH = 100;
const PROTOTYPE_POLLUTION_FIELDS = new Set(["__proto__", "prototype", "constructor"]);

function nonJsonValue(message: string): never {
  throw new CalendarGoldAuditError("NON_JSON_VALUE", message);
}

/** Security boundary for untrusted audit JSON. It never invokes accessors. */
function assertCalendarAuditJson(
  value: unknown,
  path = "envelope",
  depth = 0,
  ancestors = new WeakSet<object>()
): void {
  if (depth > MAX_CALENDAR_AUDIT_JSON_DEPTH) {
    nonJsonValue(`农历审核文件超过最大 JSON 深度 ${MAX_CALENDAR_AUDIT_JSON_DEPTH}`);
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) nonJsonValue(`${path} 包含非有限数字`);
    return;
  }
  if (typeof value !== "object") nonJsonValue(`${path} 包含非 JSON 值：${typeof value}`);

  const objectValue = value as object;
  if (ancestors.has(objectValue)) nonJsonValue(`${path} 包含循环引用`);
  ancestors.add(objectValue);

  if (Array.isArray(objectValue)) {
    for (let index = 0; index < objectValue.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(objectValue, index)) {
        ancestors.delete(objectValue);
        nonJsonValue(`${path} 包含稀疏数组空位`);
      }
    }
  } else {
    const prototype = Object.getPrototypeOf(objectValue);
    if (prototype !== Object.prototype && prototype !== null) {
      ancestors.delete(objectValue);
      throw new CalendarGoldAuditError("PROTOTYPE_POLLUTION_KEY", `${path} 不是普通 JSON 对象`);
    }
  }

  for (const key of Object.getOwnPropertyNames(objectValue)) {
    if (Array.isArray(objectValue) && key === "length") continue;
    const childPath = Array.isArray(objectValue) ? `${path}[${key}]` : `${path}.${key}`;
    if (PROTOTYPE_POLLUTION_FIELDS.has(key.toLowerCase())) {
      ancestors.delete(objectValue);
      throw new CalendarGoldAuditError(
        "PROTOTYPE_POLLUTION_KEY",
        `农历审核文件禁止原型污染键：${childPath}`
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
    if (!descriptor || !("value" in descriptor)) {
      ancestors.delete(objectValue);
      nonJsonValue(`${childPath} 是访问器而不是声明式数据`);
    }
    if (!descriptor.enumerable) {
      ancestors.delete(objectValue);
      nonJsonValue(`${childPath} 是 JSON 不可见的非枚举字段`);
    }
    if (Array.isArray(objectValue) && !/^(?:0|[1-9]\d*)$/.test(key)) {
      ancestors.delete(objectValue);
      nonJsonValue(`${childPath} 是数组上的自定义字段`);
    }
    assertCalendarAuditJson(descriptor.value, childPath, depth + 1, ancestors);
  }
  if (Object.getOwnPropertySymbols(objectValue).length > 0) {
    ancestors.delete(objectValue);
    nonJsonValue(`${path} 包含 Symbol 键`);
  }
  ancestors.delete(objectValue);
}

function parseCalendarAuditEnvelope<T>(
  schema: z.ZodType<T>,
  raw: string | unknown,
  maxBytes: number
): T {
  let input = raw;
  if (typeof raw === "string") {
    if (new TextEncoder().encode(raw).byteLength > maxBytes) {
      throw new CalendarGoldAuditError("INPUT_TOO_LARGE", "农历审核文件超过核心大小上限。");
    }
    if (/^\s*(?:https?|data|javascript|file):/i.test(raw)) {
      throw new CalendarGoldAuditError("INVALID_JSON", "农历审核导入只接受 JSON 内容，不读取 URL。");
    }
    try {
      input = JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
    } catch {
      throw new CalendarGoldAuditError("INVALID_JSON", "农历审核文件不是有效 JSON。");
    }
  }
  assertCalendarAuditJson(input);
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new CalendarGoldAuditError(
      "INVALID_FORMAT",
      `农历审核文件不符合严格格式：${parsed.error.issues[0]?.message ?? "未知格式错误"}`
    );
  }
  return parsed.data;
}

export type CalendarConversionMismatch = {
  caseId: string;
  direction: "lunar_to_gregorian" | "gregorian_to_lunar";
  expected: string;
  actual: string;
};

export type CalendarConversionVerificationReport = {
  datasetId: string;
  uniquePairs: number;
  directionAssertions: number;
  matchedCases: number;
  matchedDirectionAssertions: number;
  mismatches: CalendarConversionMismatch[];
  authorityReferencedCaseCount: number;
  crossCheckedCaseCount: number;
  independentImplementationMatchedCaseCount: number;
  independentImplementationUnsupportedCaseCount: number;
  verifiedGoldCaseCount: number;
  calendarQuotaPassed: false;
  projectReleaseGatePassed: false;
};

export const CALENDAR_CONVERSION_FIXTURE = calendarConversionFixtureSchema.parse(rawFixture);

function expectedPair(candidate: CalendarConversionCandidate): CalendarConversionExpectedPair {
  return {
    lunarDate: candidate.lunarDate,
    lunarLeapMonth: candidate.lunarLeapMonth,
    gregorianDate: candidate.expectedGregorianDate
  };
}

function calendarAssertion(candidate: CalendarConversionCandidate) {
  return {
    id: candidate.id,
    category: candidate.category,
    coverageTags: candidate.coverageTags,
    lunarDate: candidate.lunarDate,
    lunarLeapMonth: candidate.lunarLeapMonth,
    expectedGregorianDate: candidate.expectedGregorianDate
  };
}

function candidateBirthInput(candidate: CalendarConversionCandidate): BirthInput {
  return {
    schemaVersion: "1.0.0",
    calendarType: "lunar",
    date: candidate.lunarDate,
    time: "12:00",
    timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai",
    sex: "unspecified",
    lunarLeapMonth: candidate.lunarLeapMonth,
    location: { label: "", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: `authority-reference:${candidate.id}`
  };
}

export async function digestCalendarConversionCandidate(
  candidate: CalendarConversionCandidate,
  fixture: CalendarConversionFixture = CALENDAR_CONVERSION_FIXTURE
): Promise<string> {
  const sourceIds = [...new Set(candidate.evidence.observations.map((observation) => observation.sourceId))]
    .sort();
  const sourceSnapshots = sourceIds.map((sourceId) => {
    const source = fixture.sources.find((item) => item.sourceId === sourceId);
    if (!source) throw new Error(`候选 ${candidate.id} 引用了未登记来源 ${sourceId}`);
    return source;
  });
  return sha256Hex({
    datasetId: fixture.datasetId,
    fixtureVersion: fixture.fixtureVersion,
    frame: fixture.frame,
    assertion: calendarAssertion(candidate),
    observations: candidate.evidence.observations,
    sourceSnapshots
  });
}

export async function digestCalendarConversionFixture(
  fixture: CalendarConversionFixture = CALENDAR_CONVERSION_FIXTURE
): Promise<string> {
  return sha256Hex(fixture);
}

export async function digestCalendarSourceSnapshot(source: CalendarConversionSource): Promise<string> {
  return sha256Hex(source);
}

export async function digestCalendarCrossCheckRun(run: CalendarConversionCrossCheckRun): Promise<string> {
  return sha256Hex(run);
}

export async function digestCalendarConversionDataset(
  fixture: CalendarConversionFixture = CALENDAR_CONVERSION_FIXTURE
): Promise<string> {
  return sha256Hex({
    datasetId: fixture.datasetId,
    fixtureVersion: fixture.fixtureVersion,
    title: fixture.title,
    notice: fixture.notice,
    frame: fixture.frame,
    requiredCalendarGoldCaseCount: fixture.requiredCalendarGoldCaseCount,
    requiredProjectGoldCaseCount: fixture.requiredProjectGoldCaseCount,
    sourceLandingPage: fixture.sourceLandingPage,
    openDataDataset: fixture.openDataDataset,
    reuseTerms: fixture.reuseTerms,
    knownCaveats: fixture.knownCaveats,
    sources: fixture.sources,
    independentCrossCheckRuns: fixture.independentCrossCheckRuns,
    candidates: fixture.cases.map((candidate) => ({
      assertion: calendarAssertion(candidate),
      observations: candidate.evidence.observations
    }))
  });
}

function parseCalendarFixtureFromBundle(
  envelope: CalendarReviewBundleEnvelope
): CalendarConversionFixture {
  const {
    fixtureDigest: _fixtureDigest,
    datasetDigest: _datasetDigest,
    ...dataset
  } = envelope.payload.dataset;
  const cases = envelope.payload.candidates.map((candidate) => {
    const { candidateDigest: _candidateDigest, ...candidateData } = candidate;
    return candidateData;
  });
  const parsed = calendarConversionFixtureSchema.safeParse({
    ...dataset,
    sources: envelope.payload.sources,
    independentCrossCheckRuns: envelope.payload.independentCrossCheckRuns,
    cases
  });
  if (!parsed.success) {
    throw new CalendarGoldAuditError(
      "INVALID_FORMAT",
      `审核包不能还原为严格候选 fixture：${parsed.error.issues[0]?.message ?? "未知格式错误"}`
    );
  }
  return parsed.data;
}

function effectiveNow(options: CalendarReviewBundlePreflightOptions): number {
  const value = options.now ?? new Date();
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new CalendarGoldAuditError("TIME_ORDER_INVALID", "预检 now 必须是有效时间。");
  }
  return timestamp;
}

function assertNotFuture(
  timestamp: string,
  options: CalendarReviewBundlePreflightOptions,
  label: string
): void {
  const skew = options.allowedClockSkewMs ?? 5 * 60 * 1000;
  if (!Number.isFinite(skew) || skew < 0 || skew > 60 * 60 * 1000) {
    throw new CalendarGoldAuditError("TIME_ORDER_INVALID", "允许的时钟偏差必须在 0 到 1 小时之间。");
  }
  if (Date.parse(timestamp) > effectiveNow(options) + skew) {
    throw new CalendarGoldAuditError("TIME_ORDER_INVALID", `${label}不能晚于当前时间。`);
  }
}

export async function createCalendarConversionReviewBundle(options: {
  fixture?: CalendarConversionFixture;
  generatedAt?: string;
} = {}): Promise<CalendarReviewBundleEnvelope> {
  const fixture = calendarConversionFixtureSchema.parse(options.fixture ?? CALENDAR_CONVERSION_FIXTURE);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const [fixtureDigest, datasetDigest, candidates] = await Promise.all([
    digestCalendarConversionFixture(fixture),
    digestCalendarConversionDataset(fixture),
    Promise.all(fixture.cases.map(async (candidate) => ({
      ...candidate,
      candidateDigest: await digestCalendarConversionCandidate(candidate, fixture)
    })))
  ]);
  const payload = calendarReviewBundlePayloadSchema.parse({
    generatedAt,
    dataset: {
      datasetId: fixture.datasetId,
      fixtureVersion: fixture.fixtureVersion,
      fixtureDigest,
      datasetDigest,
      title: fixture.title,
      notice: fixture.notice,
      frame: fixture.frame,
      requiredCalendarGoldCaseCount: fixture.requiredCalendarGoldCaseCount,
      requiredProjectGoldCaseCount: fixture.requiredProjectGoldCaseCount,
      sourceLandingPage: fixture.sourceLandingPage,
      openDataDataset: fixture.openDataDataset,
      reuseTerms: fixture.reuseTerms,
      knownCaveats: fixture.knownCaveats,
      reviewPolicy: fixture.reviewPolicy
    },
    reviewPolicy: {
      candidateCount: 24,
      requiredAttestationCount: 2,
      currentVerifiedCount: 0,
      attestationStatement: CALENDAR_REVIEW_ATTESTATION_STATEMENT,
      integrityNotice: "SHA-256 只证明审核内容未变化，不是数字签名，也不能证明复核人现实身份。",
      releaseNotice: "预检不会写入 fixture 或增加 verified；只有维护者核验并纳入新版本 fixture 后才可计数。"
    },
    sources: fixture.sources,
    independentCrossCheckRuns: fixture.independentCrossCheckRuns,
    candidates
  });
  return calendarReviewBundleEnvelopeSchema.parse({
    format: CALENDAR_REVIEW_BUNDLE_FORMAT,
    formatVersion: CALENDAR_AUDIT_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload)
  });
}

export function serializeCalendarConversionReviewBundle(
  envelope: CalendarReviewBundleEnvelope
): string {
  return `${JSON.stringify(calendarReviewBundleEnvelopeSchema.parse(envelope), null, 2)}\n`;
}

export async function preflightCalendarConversionReviewBundle(
  raw: string | unknown,
  options: CalendarReviewBundlePreflightOptions = {}
): Promise<CalendarReviewBundleEnvelope> {
  const envelope = parseCalendarAuditEnvelope(
    calendarReviewBundleEnvelopeSchema,
    raw,
    MAX_CALENDAR_REVIEW_BUNDLE_BYTES
  );
  if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
    throw new CalendarGoldAuditError("DIGEST_MISMATCH", "农历审核包摘要不匹配，文件内容可能已被修改。");
  }
  assertNotFuture(envelope.payload.generatedAt, options, "审核包生成时间");

  const bundledFixture = parseCalendarFixtureFromBundle(envelope);
  if (
    bundledFixture.sources.some((source) => Date.parse(source.accessedAt) > Date.parse(envelope.payload.generatedAt)) ||
    bundledFixture.independentCrossCheckRuns.some((run) => Date.parse(run.executedAt) > Date.parse(envelope.payload.generatedAt))
  ) {
    throw new CalendarGoldAuditError("TIME_ORDER_INVALID", "审核包生成时间不能早于来源访问或差分运行时间。");
  }

  const [bundledFixtureDigest, bundledDatasetDigest, bundledCandidateDigests] = await Promise.all([
    digestCalendarConversionFixture(bundledFixture),
    digestCalendarConversionDataset(bundledFixture),
    Promise.all(bundledFixture.cases.map((candidate) =>
      digestCalendarConversionCandidate(candidate, bundledFixture)
    ))
  ]);
  if (bundledFixtureDigest !== envelope.payload.dataset.fixtureDigest) {
    throw new CalendarGoldAuditError("FIXTURE_MISMATCH", "审核包声明的 fixture 摘要与包内完整 fixture 不一致。");
  }
  if (bundledDatasetDigest !== envelope.payload.dataset.datasetDigest) {
    throw new CalendarGoldAuditError("DATASET_MISMATCH", "审核包声明的数据集摘要与包内不可变数据不一致。");
  }
  envelope.payload.candidates.forEach((candidate, index) => {
    if (candidate.candidateDigest !== bundledCandidateDigests[index]) {
      throw new CalendarGoldAuditError(
        "CANDIDATE_MISMATCH",
        `审核包候选 ${candidate.id} 的自身摘要与包内内容不一致。`
      );
    }
  });

  const currentFixture = calendarConversionFixtureSchema.parse(options.fixture ?? CALENDAR_CONVERSION_FIXTURE);
  const [currentFixtureDigest, currentDatasetDigest, currentCandidateDigests] = await Promise.all([
    digestCalendarConversionFixture(currentFixture),
    digestCalendarConversionDataset(currentFixture),
    Promise.all(currentFixture.cases.map((candidate) =>
      digestCalendarConversionCandidate(candidate, currentFixture)
    ))
  ]);
  if (envelope.payload.dataset.fixtureDigest !== currentFixtureDigest) {
    throw new CalendarGoldAuditError("FIXTURE_MISMATCH", "审核包绑定的 fixture 已不是当前候选 fixture。");
  }
  if (envelope.payload.dataset.datasetDigest !== currentDatasetDigest) {
    throw new CalendarGoldAuditError("DATASET_MISMATCH", "审核包绑定的数据集已不是当前数据集。");
  }
  if (envelope.payload.candidates.length !== currentFixture.cases.length) {
    throw new CalendarGoldAuditError("CANDIDATE_MISMATCH", "审核包候选数量与当前 fixture 不一致。");
  }
  const currentById = new Map(currentFixture.cases.map((candidate, index) => [candidate.id, {
    candidate,
    digest: currentCandidateDigests[index]
  }]));
  for (const bundled of envelope.payload.candidates) {
    const current = currentById.get(bundled.id);
    const { candidateDigest: _candidateDigest, ...bundledCandidate } = bundled;
    if (
      !current ||
      bundled.candidateDigest !== current.digest ||
      canonicalStringify(bundledCandidate) !== canonicalStringify(current.candidate)
    ) {
      throw new CalendarGoldAuditError("CANDIDATE_MISMATCH", `审核包候选 ${bundled.id} 与当前版本不一致。`);
    }
  }
  return envelope;
}

export async function createCalendarConversionDecisionEnvelope(
  rawPayload: CalendarDecisionPayload
): Promise<CalendarDecisionEnvelope> {
  const payload = calendarDecisionPayloadSchema.parse(rawPayload);
  return calendarDecisionEnvelopeSchema.parse({
    format: CALENDAR_DECISION_FORMAT,
    formatVersion: CALENDAR_AUDIT_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload)
  });
}

export function serializeCalendarConversionDecisionEnvelope(
  envelope: CalendarDecisionEnvelope
): string {
  return `${JSON.stringify(calendarDecisionEnvelopeSchema.parse(envelope), null, 2)}\n`;
}

function registeredSourceSnapshot(source: CalendarConversionSource) {
  return {
    sourceId: source.sourceId,
    lineageId: source.lineageId,
    sourceType: source.sourceType,
    title: source.title,
    publisher: source.publisher,
    editionOrVersion: source.editionOrVersion,
    sourceRef: source.sourceRef,
    artifactSha256: source.artifactSha256
  };
}

function decisionSourceSnapshot(source: z.infer<typeof calendarDecisionSourceEvidenceSchema>) {
  return {
    sourceId: source.sourceId,
    lineageId: source.lineageId,
    sourceType: source.sourceType,
    title: source.title,
    publisher: source.publisher,
    editionOrVersion: source.editionOrVersion,
    sourceRef: source.sourceRef,
    artifactSha256: source.artifactSha256
  };
}

function runOutcome(run: CalendarConversionCrossCheckRun, caseId: string): "matched" | "unsupported" | "mismatch" | null {
  if (run.matchedCaseIds.includes(caseId)) return "matched";
  if (run.unsupportedCaseIds.includes(caseId)) return "unsupported";
  if (run.mismatches.some((item) => item.caseId === caseId)) return "mismatch";
  return null;
}

export async function preflightCalendarConversionDecision(
  raw: string | unknown,
  options: CalendarDecisionPreflightOptions
): Promise<CalendarDecisionPreflight> {
  const envelope = parseCalendarAuditEnvelope(
    calendarDecisionEnvelopeSchema,
    raw,
    MAX_CALENDAR_DECISION_BYTES
  );
  if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
    throw new CalendarGoldAuditError("DIGEST_MISMATCH", "农历裁决记录摘要不匹配，文件内容可能已被修改。");
  }

  const fixture = calendarConversionFixtureSchema.parse(options.fixture ?? CALENDAR_CONVERSION_FIXTURE);
  const reviewBundle = await preflightCalendarConversionReviewBundle(options.reviewBundle, options);
  if (envelope.payload.reviewBundleDigest !== reviewBundle.digest) {
    throw new CalendarGoldAuditError("REVIEW_BUNDLE_MISMATCH", "裁决记录没有绑定当前预检通过的审核包。");
  }
  if (
    envelope.payload.fixtureDigest !== reviewBundle.payload.dataset.fixtureDigest ||
    envelope.payload.datasetDigest !== reviewBundle.payload.dataset.datasetDigest
  ) {
    throw new CalendarGoldAuditError("DATASET_MISMATCH", "裁决记录绑定的 fixture 或数据集摘要与审核包不一致。");
  }

  const candidate = fixture.cases.find((item) => item.id === envelope.payload.caseId);
  if (!candidate) {
    throw new CalendarGoldAuditError("UNKNOWN_CANDIDATE", `当前数据集不存在候选 ${envelope.payload.caseId}。`);
  }
  if (envelope.payload.candidateDigest !== await digestCalendarConversionCandidate(candidate, fixture)) {
    throw new CalendarGoldAuditError("CANDIDATE_MISMATCH", "裁决记录绑定的候选摘要与当前候选不一致。");
  }

  const bundleGeneratedAt = Date.parse(reviewBundle.payload.generatedAt);
  if (envelope.payload.attestations.some((item) => Date.parse(item.reviewedAt) < bundleGeneratedAt)) {
    throw new CalendarGoldAuditError("TIME_ORDER_INVALID", "复核时间不能早于所绑定审核包的生成时间。");
  }
  assertNotFuture(envelope.payload.createdAt, options, "裁决记录创建时间");

  const currentPair = expectedPair(candidate);
  const currentPairText = canonicalStringify(currentPair);
  const effectivePairText = envelope.payload.expected === null
    ? null
    : canonicalStringify(envelope.payload.expected);
  if (envelope.payload.decision === "accept_expected" && effectivePairText !== currentPairText) {
    throw new CalendarGoldAuditError("DECISION_CONFLICT", "接受原期望值的裁决不得同时改写日期对。");
  }
  if (envelope.payload.decision === "replace_expected" && effectivePairText === currentPairText) {
    throw new CalendarGoldAuditError("DECISION_CONFLICT", "替换期望值的裁决必须给出实际不同的日期对。");
  }

  const sourceById = new Map(fixture.sources.map((source) => [source.sourceId, source]));
  const authorityObservationIds = new Set(candidate.evidence.observations
    .filter((observation) => observation.role === "authoritative")
    .map((observation) => observation.sourceId));
  let includesCandidateAuthority = false;
  for (const evidence of envelope.payload.sourceEvidence) {
    const source = sourceById.get(evidence.sourceId);
    if (!source || source.artifactSha256 === null) {
      throw new CalendarGoldAuditError("SOURCE_MISMATCH", `裁决来源 ${evidence.sourceId} 未绑定当前 fixture 的冻结材料摘要。`);
    }
    if (canonicalStringify(registeredSourceSnapshot(source)) !== canonicalStringify(decisionSourceSnapshot(evidence))) {
      throw new CalendarGoldAuditError("SOURCE_MISMATCH", `裁决来源 ${evidence.sourceId} 的冻结快照与当前 fixture 不一致。`);
    }
    if (Date.parse(evidence.accessedAt) !== Date.parse(source.accessedAt)) {
      throw new CalendarGoldAuditError("SOURCE_MISMATCH", `裁决来源 ${evidence.sourceId} 的访问时间与冻结快照不一致。`);
    }

    if (source.sourceType === "software_implementation") {
      const run = fixture.independentCrossCheckRuns.find((item) =>
        item.sourceId === source.sourceId && item.runId === evidence.runId
      );
      if (!run || evidence.runDigest !== await digestCalendarCrossCheckRun(run)) {
        throw new CalendarGoldAuditError("SOURCE_MISMATCH", `裁决来源 ${evidence.sourceId} 没有绑定当前冻结差分运行。`);
      }
      const actualOutcome = runOutcome(run, candidate.id);
      if (actualOutcome !== "matched" || evidence.outcome !== actualOutcome) {
        throw new CalendarGoldAuditError(
          "UNSUPPORTED_CROSSCHECK",
          `软件来源 ${evidence.sourceId} 对候选 ${candidate.id} 不是 matched，不能作为正向证据。`
        );
      }
    } else {
      const matchingObservation = candidate.evidence.observations.find((observation) =>
        observation.sourceId === evidence.sourceId &&
        observation.locator === evidence.locator &&
        canonicalStringify({
          lunarDate: observation.observedLunarDate,
          lunarLeapMonth: observation.observedLunarLeapMonth,
          gregorianDate: observation.observedGregorianDate
        }) === canonicalStringify(evidence.observedPair)
      );
      if (!matchingObservation) {
        throw new CalendarGoldAuditError(
          "SOURCE_MISMATCH",
          `裁决来源 ${evidence.sourceId} 的定位或观察值不属于当前候选的冻结证据。`
        );
      }
      if (evidence.role !== "reference" && evidence.role !== matchingObservation.role) {
        throw new CalendarGoldAuditError("SOURCE_MISMATCH", `裁决来源 ${evidence.sourceId} 的证据角色与冻结观察不一致。`);
      }
    }
    includesCandidateAuthority ||= authorityObservationIds.has(evidence.sourceId);
  }
  if (!includesCandidateAuthority) {
    throw new CalendarGoldAuditError("SOURCE_MISMATCH", "裁决必须绑定当前候选至少一项原始权威观察。");
  }

  if (envelope.payload.expected !== null) {
    const conflicting = envelope.payload.sourceEvidence.some((evidence) =>
      evidence.role !== "reference" && canonicalStringify(evidence.observedPair) !== effectivePairText
    );
    if (conflicting) {
      throw new CalendarGoldAuditError("DECISION_CONFLICT", "正向来源观察值必须与裁决的生效日期对完全一致。");
    }
  }

  const acceptedStructure = envelope.payload.decision !== "reject_candidate";
  return {
    envelope,
    candidate,
    effectiveExpected: envelope.payload.expected,
    identityVerified: false,
    sourceAuthenticityVerified: false,
    eligibleForFixtureIntegration: false,
    countsAsVerifiedGold: false,
    notice: acceptedStructure
      ? "结构预检通过只表示内容摘要、当前 fixture、来源运行与双人字段一致；SHA-256 不是人员签名，现实身份与来源真实性仍未核验，因此不能进入 fixture 集成，也不会增加 verified 金标。"
      : "拒绝记录可保留审计证据，但不会写入当前 fixture，也不能增加 verified 金标。"
  };
}

export function summarizeCalendarConversionEvidence(
  fixture: CalendarConversionFixture = CALENDAR_CONVERSION_FIXTURE
): {
  candidate: number;
  crossChecked: number;
  independentImplementationMatched: number;
  independentImplementationUnsupported: number;
  verified: number;
  authorityReferenced: number;
  total: number;
  calendarQuotaPassed: false;
  projectReleaseGatePassed: false;
} {
  const candidates = fixture.cases;
  const verified = candidates.filter((candidate) => candidate.evidence.status === "verified").length;
  const independentlyMatched = new Set(fixture.independentCrossCheckRuns
    .flatMap((run) => run.matchedCaseIds));
  const independentlyUnsupported = new Set(fixture.independentCrossCheckRuns
    .flatMap((run) => run.unsupportedCaseIds));
  return {
    candidate: candidates.filter((candidate) => candidate.evidence.status === "candidate").length,
    crossChecked: candidates.filter((candidate) => candidate.evidence.status === "cross_checked").length,
    independentImplementationMatched: independentlyMatched.size,
    independentImplementationUnsupported: independentlyUnsupported.size,
    verified,
    authorityReferenced: candidates.filter((candidate) =>
      candidate.evidence.observations.some((observation) => observation.role === "authoritative")
    ).length,
    total: candidates.length,
    calendarQuotaPassed: false,
    projectReleaseGatePassed: false
  };
}

export function verifyCalendarConversionCandidates(
  fixture: CalendarConversionFixture = CALENDAR_CONVERSION_FIXTURE
): CalendarConversionVerificationReport {
  const mismatches: CalendarConversionMismatch[] = [];

  for (const candidate of fixture.cases) {
    try {
      const resolved = resolveBirthCalendarInput(candidateBirthInput(candidate));
      if (resolved.calendarResolution.resolvedGregorianDate !== candidate.expectedGregorianDate) {
        mismatches.push({
          caseId: candidate.id,
          direction: "lunar_to_gregorian",
          expected: candidate.expectedGregorianDate,
          actual: resolved.calendarResolution.resolvedGregorianDate
        });
      }
    } catch (error) {
      mismatches.push({
        caseId: candidate.id,
        direction: "lunar_to_gregorian",
        expected: candidate.expectedGregorianDate,
        actual: error instanceof Error ? error.message : String(error)
      });
    }

    try {
      const resolved = resolveGregorianCalendarDate(candidate.expectedGregorianDate);
      const expected = `${candidate.lunarDate}|${candidate.lunarLeapMonth ? "leap" : "regular"}`;
      const actual = `${resolved.resolvedLunarDate}|${resolved.resolvedLunarLeapMonth ? "leap" : "regular"}`;
      if (actual !== expected) {
        mismatches.push({
          caseId: candidate.id,
          direction: "gregorian_to_lunar",
          expected,
          actual
        });
      }
    } catch (error) {
      mismatches.push({
        caseId: candidate.id,
        direction: "gregorian_to_lunar",
        expected: `${candidate.lunarDate}|${candidate.lunarLeapMonth ? "leap" : "regular"}`,
        actual: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const failedCases = new Set(mismatches.map((mismatch) => mismatch.caseId));
  const summary = summarizeCalendarConversionEvidence(fixture);
  return {
    datasetId: fixture.datasetId,
    uniquePairs: fixture.cases.length,
    directionAssertions: fixture.cases.length * 2,
    matchedCases: fixture.cases.length - failedCases.size,
    matchedDirectionAssertions: fixture.cases.length * 2 - mismatches.length,
    mismatches,
    authorityReferencedCaseCount: summary.authorityReferenced,
    crossCheckedCaseCount: summary.crossChecked,
    independentImplementationMatchedCaseCount: summary.independentImplementationMatched,
    independentImplementationUnsupportedCaseCount: summary.independentImplementationUnsupported,
    verifiedGoldCaseCount: summary.verified,
    calendarQuotaPassed: summary.calendarQuotaPassed,
    projectReleaseGatePassed: false
  };
}
