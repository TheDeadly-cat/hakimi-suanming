import { calculateChart, digestRuleProfile } from "@hakimi/bazi-core";
import { birthInputSchema, type BirthInput } from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { z } from "zod";
import rawFixture from "../fixtures/jie-boundary-candidates.v1.json";

const pillarValueSchema = z.string().regex(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
const positionSchema = z.enum(["before", "at", "after"]);

export const goldEvidenceSchema = z.object({
  status: z.enum(["candidate", "cross_checked", "verified"]),
  sourceRefs: z.array(z.string().min(1)),
  independentImplementationRefs: z.array(z.string().min(1)),
  reviewer: z.string().min(1).nullable(),
  reviewedAt: z.string().datetime().nullable(),
  decisionRecordRef: z.string().min(1).nullable(),
  note: z.string().min(1)
}).superRefine((value, context) => {
  if (value.status === "cross_checked" && value.independentImplementationRefs.length < 2) {
    context.addIssue({
      code: "custom",
      path: ["independentImplementationRefs"],
      message: "cross_checked 至少需要两个独立实现引用"
    });
  }
  if (value.status === "verified") {
    if (value.sourceRefs.length === 0) {
      context.addIssue({ code: "custom", path: ["sourceRefs"], message: "verified 必须至少有一个权威来源" });
    }
    if (value.reviewer === null || value.reviewedAt === null || value.decisionRecordRef === null) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "verified 必须同时记录复核人、复核时间和裁决记录"
      });
    }
  }
});

export const expectedPillarsSchema = z.strictObject({
  year: pillarValueSchema,
  month: pillarValueSchema,
  day: pillarValueSchema,
  hour: pillarValueSchema
});

const fixtureSchema = z.object({
  fixtureVersion: z.literal("1.0.0"),
  datasetId: z.literal("jie-boundary-2024-candidates"),
  title: z.string().min(1),
  notice: z.string().min(1),
  ruleProfileId: z.literal("ziping-working-default"),
  timeZone: z.literal("Asia/Shanghai"),
  boundaryFrame: z.literal("fixed_plus08"),
  requiredReleaseGoldCaseCount: z.literal(360),
  boundarySourceRefs: z.array(z.string().url()).min(1),
  defaultEvidence: goldEvidenceSchema,
  evidenceOverrides: z.record(z.string(), goldEvidenceSchema),
  terms: z.array(z.object({
    slug: z.string().regex(/^[a-z]+$/),
    name: z.enum(["小寒", "立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪"]),
    boundaryWallDateTime: z.string().regex(/^2024-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
    expected: z.object({
      before: expectedPillarsSchema,
      at: expectedPillarsSchema,
      after: expectedPillarsSchema
    })
  })).length(12)
});

export type GoldEvidence = z.infer<typeof goldEvidenceSchema>;
export type JieBoundaryPosition = z.infer<typeof positionSchema>;
export type ExpectedPillars = z.infer<typeof expectedPillarsSchema>;

export type JieBoundaryCandidate = {
  id: string;
  category: "jie_exact_boundary";
  termName: string;
  position: JieBoundaryPosition;
  boundaryWallDateTime: string;
  deltaSeconds: -1 | 0 | 1;
  input: BirthInput;
  expected: ExpectedPillars;
  evidence: GoldEvidence;
};

export type CandidateMismatch = {
  caseId: string;
  field: keyof ExpectedPillars | "calculation";
  expected: string;
  actual: string;
};

export type CandidateVerificationReport = {
  datasetId: string;
  total: number;
  passed: number;
  mismatches: CandidateMismatch[];
  verifiedGoldCaseCount: number;
  releaseGatePassed: false;
};

export const GOLD_REVIEW_BUNDLE_FORMAT = "hakimi-gold-review-bundle" as const;
export const GOLD_DECISION_FORMAT = "hakimi-gold-decision" as const;
export const GOLD_AUDIT_FORMAT_VERSION = "1.0.0" as const;
export const GOLD_DECISION_RECORD_VERSION = "1.0.0" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const goldAuthoritySourceSchema = z.strictObject({
  sourceRef: z.string().min(1),
  sourceType: z.enum([
    "published_almanac",
    "astronomical_ephemeris",
    "classical_text",
    "consultant_memo",
    "other"
  ]),
  title: z.string().min(1),
  edition: z.string().min(1).nullable(),
  locator: z.string().min(1),
  timeScale: z.enum(["UTC", "TT", "fixed_plus08", "local_civil", "not_applicable"]),
  accessedAt: z.string().datetime().nullable(),
  note: z.string()
});

export const GOLD_REVIEW_ATTESTATION_STATEMENT = "我已独立核对候选输入、规则口径、来源定位和四柱期望值。" as const;

export const goldReviewerAttestationSchema = z.strictObject({
  role: z.enum(["primary", "second"]),
  reviewerId: z.string().min(1),
  displayName: z.string().min(1),
  reviewedAt: z.string().datetime(),
  statement: z.literal(GOLD_REVIEW_ATTESTATION_STATEMENT)
});

export const goldDecisionPayloadSchema = z.strictObject({
  recordVersion: z.literal(GOLD_DECISION_RECORD_VERSION),
  datasetId: z.literal("jie-boundary-2024-candidates"),
  datasetFixtureVersion: z.literal("1.0.0"),
  caseId: z.string().regex(/^jie-2024-[a-z]+-(before|at|after)$/),
  candidateDigest: sha256Schema,
  ruleProfileId: z.literal("ziping-working-default"),
  ruleProfileDigest: sha256Schema,
  decision: z.enum(["accept_expected", "replace_expected", "reject_candidate"]),
  expected: expectedPillarsSchema.nullable(),
  authoritySources: z.array(goldAuthoritySourceSchema).min(1),
  attestations: z.array(goldReviewerAttestationSchema).length(2),
  decidedAt: z.string().datetime(),
  rationale: z.string().min(1),
  supersedesDecisionDigest: sha256Schema.nullable()
}).superRefine((value, context) => {
  if (value.decision === "reject_candidate" && value.expected !== null) {
    context.addIssue({ code: "custom", path: ["expected"], message: "拒绝候选时 expected 必须为 null" });
  }
  if (value.decision !== "reject_candidate" && value.expected === null) {
    context.addIssue({ code: "custom", path: ["expected"], message: "接受或替换时必须给出四柱期望值" });
  }

  const roles = value.attestations.map((item) => item.role);
  if (new Set(roles).size !== 2 || !roles.includes("primary") || !roles.includes("second")) {
    context.addIssue({ code: "custom", path: ["attestations"], message: "裁决必须包含 primary 与 second 两种复核角色" });
  }
  const reviewerIds = value.attestations.map((item) => item.reviewerId);
  if (new Set(reviewerIds).size !== reviewerIds.length) {
    context.addIssue({ code: "custom", path: ["attestations"], message: "主复核人与第二复核人必须是不同身份" });
  }
  const sourceRefs = value.authoritySources.map((item) => item.sourceRef);
  if (new Set(sourceRefs).size !== sourceRefs.length) {
    context.addIssue({ code: "custom", path: ["authoritySources"], message: "同一裁决不得重复登记来源引用" });
  }
  if (!value.authoritySources.some((item) =>
    item.sourceType === "published_almanac" || item.sourceType === "astronomical_ephemeris"
  )) {
    context.addIssue({
      code: "custom",
      path: ["authoritySources"],
      message: "节气边界裁决至少需要一个历书或天文历表来源"
    });
  }
  const decidedAt = Date.parse(value.decidedAt);
  if (value.attestations.some((item) => Date.parse(item.reviewedAt) > decidedAt)) {
    context.addIssue({ code: "custom", path: ["decidedAt"], message: "裁决时间不能早于任一复核时间" });
  }
});

export const goldDecisionEnvelopeSchema = z.strictObject({
  format: z.literal(GOLD_DECISION_FORMAT),
  formatVersion: z.literal(GOLD_AUDIT_FORMAT_VERSION),
  payload: goldDecisionPayloadSchema,
  digest: sha256Schema
});

const goldReviewCandidateSchema = z.strictObject({
  id: z.string(),
  category: z.literal("jie_exact_boundary"),
  termName: z.string(),
  position: positionSchema,
  boundaryWallDateTime: z.string(),
  deltaSeconds: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  input: birthInputSchema,
  expected: expectedPillarsSchema,
  evidence: goldEvidenceSchema,
  candidateDigest: sha256Schema
});

const goldReviewBundlePayloadSchema = z.strictObject({
  generatedAt: z.string().datetime(),
  dataset: z.strictObject({
    datasetId: z.literal("jie-boundary-2024-candidates"),
    fixtureVersion: z.literal("1.0.0"),
    title: z.string().min(1),
    notice: z.string().min(1),
    ruleProfileId: z.literal("ziping-working-default"),
    ruleProfileDigest: sha256Schema,
    timeZone: z.literal("Asia/Shanghai"),
    boundaryFrame: z.literal("fixed_plus08"),
    requiredReleaseGoldCaseCount: z.literal(360),
    boundarySourceRefs: z.array(z.string().url()).min(1)
  }),
  reviewPolicy: z.strictObject({
    candidateCount: z.literal(36),
    requiredAttestationCount: z.literal(2),
    integrityNotice: z.string().min(1),
    releaseNotice: z.string().min(1)
  }),
  candidates: z.array(goldReviewCandidateSchema).length(36)
});

export const goldReviewBundleEnvelopeSchema = z.strictObject({
  format: z.literal(GOLD_REVIEW_BUNDLE_FORMAT),
  formatVersion: z.literal(GOLD_AUDIT_FORMAT_VERSION),
  payload: goldReviewBundlePayloadSchema,
  digest: sha256Schema
});

export type GoldAuthoritySource = z.infer<typeof goldAuthoritySourceSchema>;
export type GoldReviewerAttestation = z.infer<typeof goldReviewerAttestationSchema>;
export type GoldDecisionPayload = z.infer<typeof goldDecisionPayloadSchema>;
export type GoldDecisionEnvelope = z.infer<typeof goldDecisionEnvelopeSchema>;
export type GoldReviewBundleEnvelope = z.infer<typeof goldReviewBundleEnvelopeSchema>;

export type GoldDecisionPreflight = {
  envelope: GoldDecisionEnvelope;
  candidate: JieBoundaryCandidate;
  effectiveExpected: ExpectedPillars | null;
  countsAsVerifiedGold: false;
  notice: string;
};

export const JIE_BOUNDARY_FIXTURE = fixtureSchema.parse(rawFixture);

function shiftFixedPlusEightWallTime(wallDateTime: string, deltaSeconds: number): { date: string; time: string } {
  const epochMilliseconds = Date.parse(`${wallDateTime}+08:00`) + deltaSeconds * 1_000;
  const fixedEight = new Date(epochMilliseconds + 8 * 60 * 60 * 1_000);
  const iso = fixedEight.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}

function candidateEvidence(caseId: string): GoldEvidence {
  return JIE_BOUNDARY_FIXTURE.evidenceOverrides[caseId] ?? JIE_BOUNDARY_FIXTURE.defaultEvidence;
}

export function expandJieBoundaryCandidates(): JieBoundaryCandidate[] {
  const positions: Array<{ position: JieBoundaryPosition; deltaSeconds: -1 | 0 | 1 }> = [
    { position: "before", deltaSeconds: -1 },
    { position: "at", deltaSeconds: 0 },
    { position: "after", deltaSeconds: 1 }
  ];

  return JIE_BOUNDARY_FIXTURE.terms.flatMap((term) => positions.map(({ position, deltaSeconds }) => {
    const id = `jie-2024-${term.slug}-${position}`;
    const wall = shiftFixedPlusEightWallTime(term.boundaryWallDateTime, deltaSeconds);
    return {
      id,
      category: "jie_exact_boundary" as const,
      termName: term.name,
      position,
      boundaryWallDateTime: term.boundaryWallDateTime,
      deltaSeconds,
      input: {
        schemaVersion: "1.0.0",
        calendarType: "gregorian",
        date: wall.date,
        time: wall.time,
        timePrecision: "exact_second",
        timeZone: JIE_BOUNDARY_FIXTURE.timeZone,
        sex: "unspecified",
        lunarLeapMonth: false,
        location: { label: "固定 +08 节气边界候选", latitude: null, longitude: null, precision: "city" },
        sourceNote: `${term.name} ${position} · 候选回归行，未通过人工金标复核`
      },
      expected: term.expected[position],
      evidence: candidateEvidence(id)
    };
  }));
}

function candidateDigestPayload(candidate: JieBoundaryCandidate) {
  return {
    datasetId: JIE_BOUNDARY_FIXTURE.datasetId,
    fixtureVersion: JIE_BOUNDARY_FIXTURE.fixtureVersion,
    ruleProfileId: JIE_BOUNDARY_FIXTURE.ruleProfileId,
    id: candidate.id,
    category: candidate.category,
    termName: candidate.termName,
    position: candidate.position,
    boundaryWallDateTime: candidate.boundaryWallDateTime,
    deltaSeconds: candidate.deltaSeconds,
    input: candidate.input,
    expected: candidate.expected
  };
}

export async function digestJieBoundaryCandidate(candidate: JieBoundaryCandidate): Promise<string> {
  return sha256Hex(candidateDigestPayload(candidate));
}

export class GoldAuditError extends Error {
  constructor(
    public readonly code:
      | "INVALID_JSON"
      | "INVALID_FORMAT"
      | "DIGEST_MISMATCH"
      | "UNKNOWN_CANDIDATE"
      | "CANDIDATE_MISMATCH"
      | "RULE_PROFILE_MISMATCH"
      | "DECISION_CONFLICT",
    message: string
  ) {
    super(message);
    this.name = "GoldAuditError";
  }
}

function parseJsonInput(raw: string | unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new GoldAuditError("INVALID_JSON", "金标准审核文件不是有效 JSON。");
  }
}

function parseAuditEnvelope<T>(schema: z.ZodType<T>, raw: string | unknown): T {
  const parsed = schema.safeParse(parseJsonInput(raw));
  if (!parsed.success) {
    throw new GoldAuditError(
      "INVALID_FORMAT",
      `金标准审核文件不符合严格格式：${parsed.error.issues[0]?.message ?? "未知格式错误"}`
    );
  }
  return parsed.data;
}

export async function createJieBoundaryReviewBundle(options: {
  generatedAt?: string;
} = {}): Promise<GoldReviewBundleEnvelope> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const candidates = await Promise.all(expandJieBoundaryCandidates().map(async (candidate) => ({
    ...candidate,
    candidateDigest: await digestJieBoundaryCandidate(candidate)
  })));
  const payload = goldReviewBundlePayloadSchema.parse({
    generatedAt,
    dataset: {
      datasetId: JIE_BOUNDARY_FIXTURE.datasetId,
      fixtureVersion: JIE_BOUNDARY_FIXTURE.fixtureVersion,
      title: JIE_BOUNDARY_FIXTURE.title,
      notice: JIE_BOUNDARY_FIXTURE.notice,
      ruleProfileId: JIE_BOUNDARY_FIXTURE.ruleProfileId,
      ruleProfileDigest: await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE),
      timeZone: JIE_BOUNDARY_FIXTURE.timeZone,
      boundaryFrame: JIE_BOUNDARY_FIXTURE.boundaryFrame,
      requiredReleaseGoldCaseCount: JIE_BOUNDARY_FIXTURE.requiredReleaseGoldCaseCount,
      boundarySourceRefs: JIE_BOUNDARY_FIXTURE.boundarySourceRefs
    },
    reviewPolicy: {
      candidateCount: 36,
      requiredAttestationCount: 2,
      integrityNotice: "SHA-256 只证明审核包内容未变化，不证明复核人身份；复核身份与来源真实性必须线下核验。",
      releaseNotice: "审核包和单个裁决记录都不会自动打开发布门；只有经维护者审计并纳入版本化 fixture 的 verified 条目才可计数。"
    },
    candidates
  });
  return goldReviewBundleEnvelopeSchema.parse({
    format: GOLD_REVIEW_BUNDLE_FORMAT,
    formatVersion: GOLD_AUDIT_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload)
  });
}

export function serializeGoldReviewBundle(envelope: GoldReviewBundleEnvelope): string {
  return `${JSON.stringify(goldReviewBundleEnvelopeSchema.parse(envelope), null, 2)}\n`;
}

export async function preflightGoldReviewBundle(raw: string | unknown): Promise<GoldReviewBundleEnvelope> {
  const envelope = parseAuditEnvelope(goldReviewBundleEnvelopeSchema, raw);
  if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
    throw new GoldAuditError("DIGEST_MISMATCH", "审核包摘要不匹配，文件内容可能已被修改。");
  }

  const currentRuleDigest = await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE);
  if (envelope.payload.dataset.ruleProfileDigest !== currentRuleDigest) {
    throw new GoldAuditError("RULE_PROFILE_MISMATCH", "审核包绑定的规则配置与当前工作默认不一致。");
  }

  const currentCandidates = expandJieBoundaryCandidates();
  const currentById = new Map(currentCandidates.map((candidate) => [candidate.id, candidate]));
  if (new Set(envelope.payload.candidates.map((candidate) => candidate.id)).size !== currentCandidates.length) {
    throw new GoldAuditError("CANDIDATE_MISMATCH", "审核包候选 ID 重复或缺失。");
  }
  for (const bundled of envelope.payload.candidates) {
    const current = currentById.get(bundled.id);
    const { candidateDigest, ...bundledCandidate } = bundled;
    if (candidateDigest !== await digestJieBoundaryCandidate(bundledCandidate)) {
      throw new GoldAuditError("CANDIDATE_MISMATCH", `审核包候选 ${bundled.id} 的自身摘要与包内内容不一致。`);
    }
    if (!current || candidateDigest !== await digestJieBoundaryCandidate(current)) {
      throw new GoldAuditError("CANDIDATE_MISMATCH", `审核包候选 ${bundled.id} 与当前版本不一致。`);
    }
  }
  return envelope;
}

export async function createGoldDecisionEnvelope(
  rawPayload: GoldDecisionPayload
): Promise<GoldDecisionEnvelope> {
  const payload = goldDecisionPayloadSchema.parse(rawPayload);
  return goldDecisionEnvelopeSchema.parse({
    format: GOLD_DECISION_FORMAT,
    formatVersion: GOLD_AUDIT_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload)
  });
}

export function serializeGoldDecisionEnvelope(envelope: GoldDecisionEnvelope): string {
  return `${JSON.stringify(goldDecisionEnvelopeSchema.parse(envelope), null, 2)}\n`;
}

export async function preflightJieBoundaryDecision(
  raw: string | unknown
): Promise<GoldDecisionPreflight> {
  const envelope = parseAuditEnvelope(goldDecisionEnvelopeSchema, raw);
  if ((await sha256Hex(envelope.payload)) !== envelope.digest) {
    throw new GoldAuditError("DIGEST_MISMATCH", "裁决记录摘要不匹配，文件内容可能已被修改。");
  }

  const candidate = expandJieBoundaryCandidates().find((item) => item.id === envelope.payload.caseId);
  if (!candidate) {
    throw new GoldAuditError("UNKNOWN_CANDIDATE", `当前数据集不存在候选 ${envelope.payload.caseId}。`);
  }
  const expectedCandidateDigest = await digestJieBoundaryCandidate(candidate);
  if (envelope.payload.candidateDigest !== expectedCandidateDigest) {
    throw new GoldAuditError("CANDIDATE_MISMATCH", "裁决记录绑定的候选摘要与当前候选不一致。");
  }
  const expectedRuleDigest = await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE);
  if (envelope.payload.ruleProfileDigest !== expectedRuleDigest) {
    throw new GoldAuditError("RULE_PROFILE_MISMATCH", "裁决记录绑定的规则配置与当前工作默认不一致。");
  }

  const candidateExpected = canonicalStringify(candidate.expected);
  const decisionExpected = envelope.payload.expected === null
    ? null
    : canonicalStringify(envelope.payload.expected);
  if (envelope.payload.decision === "accept_expected" && decisionExpected !== candidateExpected) {
    throw new GoldAuditError("DECISION_CONFLICT", "接受原期望值的裁决不得同时改写四柱。");
  }
  if (envelope.payload.decision === "replace_expected" && decisionExpected === candidateExpected) {
    throw new GoldAuditError("DECISION_CONFLICT", "替换期望值的裁决必须明确给出不同的四柱结果。");
  }

  return {
    envelope,
    candidate,
    effectiveExpected: envelope.payload.expected,
    countsAsVerifiedGold: false,
    notice: "预检通过只表示格式、摘要、候选绑定和双人复核字段完整；维护者仍须核验真实身份与权威来源，并将记录纳入版本化 fixture 后才可计入发布金标。"
  };
}

function actualPillars(chart: Awaited<ReturnType<typeof calculateChart>>): ExpectedPillars {
  return {
    year: chart.facts.pillars.year.ganZhi,
    month: chart.facts.pillars.month.ganZhi,
    day: chart.facts.pillars.day.ganZhi,
    hour: chart.facts.pillars.hour.ganZhi
  };
}

export async function verifyJieBoundaryCandidates(): Promise<CandidateVerificationReport> {
  const candidates = expandJieBoundaryCandidates();
  const mismatches: CandidateMismatch[] = [];

  for (const candidate of candidates) {
    try {
      const actual = actualPillars(await calculateChart(candidate.input, WORKING_DEFAULT_RULE_PROFILE));
      for (const field of ["year", "month", "day", "hour"] as const) {
        if (actual[field] !== candidate.expected[field]) {
          mismatches.push({ caseId: candidate.id, field, expected: candidate.expected[field], actual: actual[field] });
        }
      }
    } catch (error) {
      mismatches.push({
        caseId: candidate.id,
        field: "calculation",
        expected: "successful deterministic calculation",
        actual: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const verifiedGoldCaseCount = candidates.filter((candidate) => candidate.evidence.status === "verified").length;
  return {
    datasetId: JIE_BOUNDARY_FIXTURE.datasetId,
    total: candidates.length,
    passed: candidates.length - new Set(mismatches.map((item) => item.caseId)).size,
    mismatches,
    verifiedGoldCaseCount,
    releaseGatePassed: false
  };
}

export function summarizeJieBoundaryEvidence() {
  const candidates = expandJieBoundaryCandidates();
  const counts = { candidate: 0, crossChecked: 0, verified: 0 };
  for (const candidate of candidates) {
    if (candidate.evidence.status === "candidate") counts.candidate += 1;
    if (candidate.evidence.status === "cross_checked") counts.crossChecked += 1;
    if (candidate.evidence.status === "verified") counts.verified += 1;
  }
  return {
    ...counts,
    total: candidates.length,
    requiredReleaseGoldCaseCount: JIE_BOUNDARY_FIXTURE.requiredReleaseGoldCaseCount,
    releaseGatePassed: counts.verified >= JIE_BOUNDARY_FIXTURE.requiredReleaseGoldCaseCount
  };
}
