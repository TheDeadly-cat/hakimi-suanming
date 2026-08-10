import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { z } from "zod";

import {
  CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID,
  CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE,
  CALENDAR_DIVERGENCE_WINDOWS_VERSION,
  calendarDivergenceObservationSchema,
  calendarDivergenceSourceSnapshotSchema,
  calendarDivergenceWindowCaseSchema,
  calendarDivergenceWindowSchema,
  calendarDivergenceWindowsPayloadSchema,
  preflightCalendarDivergenceWindows,
  type CalendarDivergenceWindowsEnvelope,
  type CalendarDivergenceWindowsPayload
} from "./calendar-divergence-windows";

export const CALENDAR_DIVERGENCE_REVIEW_BUNDLE_FORMAT =
  "hakimi-calendar-divergence-review-bundle" as const;
export const CALENDAR_DIVERGENCE_INDEPENDENT_REVIEW_FORMAT =
  "hakimi-calendar-divergence-independent-review" as const;
export const CALENDAR_DIVERGENCE_ADJUDICATION_FORMAT =
  "hakimi-calendar-divergence-adjudication" as const;
export const CALENDAR_DIVERGENCE_REVIEW_FORMAT_VERSION = "1.0.0" as const;
export const CALENDAR_DIVERGENCE_REVIEW_RECORD_VERSION = "1.0.0" as const;

export const CALENDAR_DIVERGENCE_REVIEW_STATEMENT =
  "我已逐日独立审核全部 64 个连续日期，并核对控制日、分歧日、来源角色、冻结材料与候选摘要。" as const;
export const CALENDAR_DIVERGENCE_ADJUDICATION_STATEMENT =
  "我已核对两份独立逐日审核及其身份记录摘要，并逐日完成第三方裁决。" as const;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const sha256RefSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const canonicalUtcInstantSchema = z.string().datetime();
const canonicalAuditIdSchema = z.string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9._-]*$/)
  .refine((value) => value === value.trim().normalize("NFKC").toLowerCase(), {
    message: "审核身份 ID 必须是规范小写 ASCII 标识"
  });

const sourceIdSchema = calendarDivergenceSourceSnapshotSchema.shape.sourceId;
const windowIdSchema = calendarDivergenceWindowSchema.shape.windowId;
const caseIdSchema = calendarDivergenceWindowCaseSchema.shape.caseId;
const caseRoleSchema = calendarDivergenceWindowCaseSchema.shape.role;
const gregorianDateSchema = calendarDivergenceWindowCaseSchema.shape.gregorianDate;

export const calendarDivergenceReviewVerdictSchema = z.enum([
  "confirm_control",
  "support_hko_current_icu",
  "support_dotnet",
  "unresolved"
]);

export const calendarDivergenceReviewCaseBindingSchema = z.strictObject({
  windowId: windowIdSchema,
  caseId: caseIdSchema,
  caseDigest: sha256Schema,
  gregorianDate: gregorianDateSchema,
  role: caseRoleSchema
});

const canonicalSourceIdsSchema = z.array(sourceIdSchema).max(7).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "来源 ID 不得重复" });
  }
  if (canonicalStringify(values) !== canonicalStringify([...values].sort())) {
    context.addIssue({ code: "custom", message: "来源 ID 必须按字典序排列" });
  }
});

export const calendarDivergenceDailyReviewSchema = z.strictObject({
  windowId: windowIdSchema,
  caseId: caseIdSchema,
  caseDigest: sha256Schema,
  gregorianDate: gregorianDateSchema,
  role: caseRoleSchema,
  verdict: calendarDivergenceReviewVerdictSchema,
  effectiveObservation: calendarDivergenceObservationSchema.nullable(),
  authoritySourceIds: canonicalSourceIdsSchema,
  supportingCrosscheckSourceIds: canonicalSourceIdsSchema,
  contradictorySourceIds: canonicalSourceIdsSchema,
  astronomyReferenceSourceIds: canonicalSourceIdsSchema,
  rationale: z.string().trim().min(1).max(2_000)
}).superRefine((review, context) => {
  const allSourceIds = [
    ...review.authoritySourceIds,
    ...review.supportingCrosscheckSourceIds,
    ...review.contradictorySourceIds,
    ...review.astronomyReferenceSourceIds
  ];
  if (new Set(allSourceIds).size !== allSourceIds.length) {
    context.addIssue({ code: "custom", path: ["authoritySourceIds"], message: "同一来源不能同时扮演多个证据角色" });
  }
  if (review.verdict === "unresolved" && review.effectiveObservation !== null) {
    context.addIssue({ code: "custom", path: ["effectiveObservation"], message: "未解决逐日审核不得给出生效日期" });
  }
  if (review.verdict !== "unresolved" && review.effectiveObservation === null) {
    context.addIssue({ code: "custom", path: ["effectiveObservation"], message: "已解决逐日审核必须给出生效日期" });
  }
});

const reviewCountsSchema = z.strictObject({
  total: z.literal(64),
  controls: z.literal(4),
  divergences: z.literal(60),
  resolved: z.number().int().min(0).max(64),
  unresolved: z.number().int().min(0).max(60)
});

const fixedReleaseBoundarySchema = z.strictObject({
  countsAsVerifiedGold: z.literal(false),
  verifiedGoldDelta: z.literal(0)
});

const reviewBundlePayloadSchema = z.strictObject({
  generatedAt: canonicalUtcInstantSchema,
  datasetId: z.literal(CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID),
  datasetFixtureVersion: z.literal(CALENDAR_DIVERGENCE_WINDOWS_VERSION),
  fixtureDigest: sha256Schema,
  fixture: calendarDivergenceWindowsPayloadSchema,
  cases: z.array(calendarDivergenceReviewCaseBindingSchema).length(64),
  reviewPolicy: z.strictObject({
    requiredCaseCount: z.literal(64),
    requiredControlCount: z.literal(4),
    requiredDivergenceCount: z.literal(60),
    requiredIndependentReviewCount: z.literal(2),
    requiredAdjudicatorCount: z.literal(1),
    acceptAllShortcutAllowed: z.literal(false),
    identityVerificationMode: z.literal("offline_maintainer_required")
  }),
  releaseBoundary: fixedReleaseBoundarySchema
});

export const calendarDivergenceReviewBundleEnvelopeSchema = z.strictObject({
  format: z.literal(CALENDAR_DIVERGENCE_REVIEW_BUNDLE_FORMAT),
  formatVersion: z.literal(CALENDAR_DIVERGENCE_REVIEW_FORMAT_VERSION),
  payload: reviewBundlePayloadSchema,
  digest: sha256Schema
});

const independentReviewerSchema = z.strictObject({
  reviewerId: canonicalAuditIdSchema,
  displayName: z.string().trim().min(1).max(80),
  specialty: z.string().trim().min(1).max(300),
  identityRecordRef: sha256RefSchema,
  identityVerificationMode: z.literal("offline_maintainer_required"),
  statement: z.literal(CALENDAR_DIVERGENCE_REVIEW_STATEMENT)
});

export const calendarDivergenceIndependentReviewPayloadSchema = z.strictObject({
  recordVersion: z.literal(CALENDAR_DIVERGENCE_REVIEW_RECORD_VERSION),
  datasetId: z.literal(CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID),
  datasetFixtureVersion: z.literal(CALENDAR_DIVERGENCE_WINDOWS_VERSION),
  fixtureDigest: sha256Schema,
  reviewBundleDigest: sha256Schema,
  reviewer: independentReviewerSchema,
  caseReviews: z.array(calendarDivergenceDailyReviewSchema).length(64),
  declaredCounts: reviewCountsSchema,
  reviewedAt: canonicalUtcInstantSchema,
  createdAt: canonicalUtcInstantSchema,
  rationale: z.string().trim().min(1).max(4_000),
  releaseBoundary: fixedReleaseBoundarySchema
}).superRefine((payload, context) => {
  const actual = {
    total: payload.caseReviews.length,
    controls: payload.caseReviews.filter((item) => item.role === "control").length,
    divergences: payload.caseReviews.filter((item) => item.role === "divergence").length,
    resolved: payload.caseReviews.filter((item) => item.verdict !== "unresolved").length,
    unresolved: payload.caseReviews.filter((item) => item.verdict === "unresolved").length
  };
  if (canonicalStringify(actual) !== canonicalStringify(payload.declaredCounts)) {
    context.addIssue({ code: "custom", path: ["declaredCounts"], message: "逐日审核计数不守恒" });
  }
  if (new Set(payload.caseReviews.map((item) => item.caseId)).size !== 64) {
    context.addIssue({ code: "custom", path: ["caseReviews"], message: "逐日审核必须覆盖 64 个不同案例" });
  }
  if (Date.parse(payload.reviewedAt) > Date.parse(payload.createdAt)) {
    context.addIssue({ code: "custom", path: ["createdAt"], message: "审核文件创建时间不能早于审核完成时间" });
  }
});

export const calendarDivergenceIndependentReviewEnvelopeSchema = z.strictObject({
  format: z.literal(CALENDAR_DIVERGENCE_INDEPENDENT_REVIEW_FORMAT),
  formatVersion: z.literal(CALENDAR_DIVERGENCE_REVIEW_FORMAT_VERSION),
  payload: calendarDivergenceIndependentReviewPayloadSchema,
  digest: sha256Schema
});

const adjudicatorSchema = z.strictObject({
  adjudicatorId: canonicalAuditIdSchema,
  displayName: z.string().trim().min(1).max(80),
  role: z.string().trim().min(1).max(300),
  identityRecordRef: sha256RefSchema,
  identityVerificationMode: z.literal("offline_maintainer_required"),
  statement: z.literal(CALENDAR_DIVERGENCE_ADJUDICATION_STATEMENT)
});

export const calendarDivergenceDailyDecisionSchema = z.strictObject({
  windowId: windowIdSchema,
  caseId: caseIdSchema,
  caseDigest: sha256Schema,
  gregorianDate: gregorianDateSchema,
  role: caseRoleSchema,
  decision: calendarDivergenceReviewVerdictSchema,
  effectiveObservation: calendarDivergenceObservationSchema.nullable(),
  rationale: z.string().trim().min(1).max(2_000)
}).superRefine((decision, context) => {
  if (decision.decision === "unresolved" && decision.effectiveObservation !== null) {
    context.addIssue({ code: "custom", path: ["effectiveObservation"], message: "未解决裁决不得给出生效日期" });
  }
  if (decision.decision !== "unresolved" && decision.effectiveObservation === null) {
    context.addIssue({ code: "custom", path: ["effectiveObservation"], message: "已解决裁决必须给出生效日期" });
  }
});

export const calendarDivergenceAdjudicationPayloadSchema = z.strictObject({
  recordVersion: z.literal(CALENDAR_DIVERGENCE_REVIEW_RECORD_VERSION),
  datasetId: z.literal(CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID),
  datasetFixtureVersion: z.literal(CALENDAR_DIVERGENCE_WINDOWS_VERSION),
  fixtureDigest: sha256Schema,
  reviewBundleDigest: sha256Schema,
  independentReviewDigests: z.tuple([sha256Schema, sha256Schema]),
  adjudicator: adjudicatorSchema,
  caseDecisions: z.array(calendarDivergenceDailyDecisionSchema).length(64),
  declaredCounts: reviewCountsSchema,
  decidedAt: canonicalUtcInstantSchema,
  createdAt: canonicalUtcInstantSchema,
  rationale: z.string().trim().min(1).max(4_000),
  releaseBoundary: fixedReleaseBoundarySchema
}).superRefine((payload, context) => {
  if (
    payload.independentReviewDigests[0] === payload.independentReviewDigests[1]
    || canonicalStringify(payload.independentReviewDigests)
      !== canonicalStringify([...payload.independentReviewDigests].sort())
  ) {
    context.addIssue({ code: "custom", path: ["independentReviewDigests"], message: "必须绑定两份不同且规范排序的独立审核" });
  }
  const actual = {
    total: payload.caseDecisions.length,
    controls: payload.caseDecisions.filter((item) => item.role === "control").length,
    divergences: payload.caseDecisions.filter((item) => item.role === "divergence").length,
    resolved: payload.caseDecisions.filter((item) => item.decision !== "unresolved").length,
    unresolved: payload.caseDecisions.filter((item) => item.decision === "unresolved").length
  };
  if (canonicalStringify(actual) !== canonicalStringify(payload.declaredCounts)) {
    context.addIssue({ code: "custom", path: ["declaredCounts"], message: "逐日裁决计数不守恒" });
  }
  if (new Set(payload.caseDecisions.map((item) => item.caseId)).size !== 64) {
    context.addIssue({ code: "custom", path: ["caseDecisions"], message: "逐日裁决必须覆盖 64 个不同案例" });
  }
  if (Date.parse(payload.decidedAt) > Date.parse(payload.createdAt)) {
    context.addIssue({ code: "custom", path: ["createdAt"], message: "裁决文件创建时间不能早于裁决时间" });
  }
});

export const calendarDivergenceAdjudicationEnvelopeSchema = z.strictObject({
  format: z.literal(CALENDAR_DIVERGENCE_ADJUDICATION_FORMAT),
  formatVersion: z.literal(CALENDAR_DIVERGENCE_REVIEW_FORMAT_VERSION),
  payload: calendarDivergenceAdjudicationPayloadSchema,
  digest: sha256Schema
});

export type CalendarDivergenceReviewBundleEnvelope = z.infer<typeof calendarDivergenceReviewBundleEnvelopeSchema>;
export type CalendarDivergenceIndependentReviewPayload = z.infer<typeof calendarDivergenceIndependentReviewPayloadSchema>;
export type CalendarDivergenceIndependentReviewEnvelope = z.infer<typeof calendarDivergenceIndependentReviewEnvelopeSchema>;
export type CalendarDivergenceAdjudicationPayload = z.infer<typeof calendarDivergenceAdjudicationPayloadSchema>;
export type CalendarDivergenceAdjudicationEnvelope = z.infer<typeof calendarDivergenceAdjudicationEnvelopeSchema>;

export type CalendarDivergenceReviewErrorCode =
  | "INVALID_JSON"
  | "INPUT_TOO_LARGE"
  | "NON_JSON_VALUE"
  | "PROTOTYPE_POLLUTION_KEY"
  | "INVALID_FORMAT"
  | "DIGEST_MISMATCH"
  | "FIXTURE_MISMATCH"
  | "REVIEW_BUNDLE_MISMATCH"
  | "CASE_COVERAGE_MISMATCH"
  | "SOURCE_ROLE_INVALID"
  | "CONTROL_DIVERGENCE_CONFUSION"
  | "REVIEWER_NOT_INDEPENDENT"
  | "REVIEW_MISMATCH"
  | "DECISION_CONFLICT"
  | "TIME_ORDER_INVALID";

export class CalendarDivergenceReviewError extends Error {
  constructor(readonly code: CalendarDivergenceReviewErrorCode, message: string) {
    super(message);
    this.name = "CalendarDivergenceReviewError";
  }
}

export type CalendarDivergenceReviewPreflightOptions = {
  fixture?: string | unknown;
  now?: string | Date;
  allowedClockSkewMs?: number;
};

const MAX_CALENDAR_DIVERGENCE_REVIEW_JSON_DEPTH = 100;
const PROTOTYPE_POLLUTION_FIELDS = new Set(["__proto__", "prototype", "constructor"]);

function nonJsonValue(message: string): never {
  throw new CalendarDivergenceReviewError("NON_JSON_VALUE", message);
}

/** Security boundary for audit values supplied by callers; accessors are never invoked. */
function assertCalendarDivergenceReviewJson(
  value: unknown,
  path = "envelope",
  depth = 0,
  ancestors = new WeakSet<object>()
): void {
  if (depth > MAX_CALENDAR_DIVERGENCE_REVIEW_JSON_DEPTH) {
    nonJsonValue(`连续历法审核文件超过最大 JSON 深度 ${MAX_CALENDAR_DIVERGENCE_REVIEW_JSON_DEPTH}`);
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
      throw new CalendarDivergenceReviewError("PROTOTYPE_POLLUTION_KEY", `${path} 不是普通 JSON 对象`);
    }
  }

  for (const key of Object.getOwnPropertyNames(objectValue)) {
    if (Array.isArray(objectValue) && key === "length") continue;
    const childPath = Array.isArray(objectValue) ? `${path}[${key}]` : `${path}.${key}`;
    if (PROTOTYPE_POLLUTION_FIELDS.has(key.toLowerCase())) {
      ancestors.delete(objectValue);
      throw new CalendarDivergenceReviewError(
        "PROTOTYPE_POLLUTION_KEY",
        `连续历法审核文件禁止原型污染键：${childPath}`
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
    assertCalendarDivergenceReviewJson(descriptor.value, childPath, depth + 1, ancestors);
  }
  if (Object.getOwnPropertySymbols(objectValue).length > 0) {
    ancestors.delete(objectValue);
    nonJsonValue(`${path} 包含 Symbol 键`);
  }
  ancestors.delete(objectValue);
}

function parseEnvelope<T>(schema: z.ZodType<T>, raw: string | unknown, label: string, maxBytes: number): T {
  let input = raw;
  if (typeof raw === "string") {
    if (new TextEncoder().encode(raw).byteLength > maxBytes) {
      throw new CalendarDivergenceReviewError("INPUT_TOO_LARGE", `${label}超过大小上限`);
    }
    if (/^\s*(?:https?|data|javascript|file):/i.test(raw)) {
      throw new CalendarDivergenceReviewError("INVALID_JSON", `${label}只接受 JSON 内容，不读取 URL`);
    }
    try {
      input = JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;
    } catch {
      throw new CalendarDivergenceReviewError("INVALID_JSON", `${label}不是合法 JSON`);
    }
  }
  assertCalendarDivergenceReviewJson(input);
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new CalendarDivergenceReviewError(
      "INVALID_FORMAT",
      `${label}不符合严格格式：${parsed.error.issues[0]?.message ?? "未知格式错误"}`
    );
  }
  return parsed.data;
}

function nowMs(options: CalendarDivergenceReviewPreflightOptions): number {
  const raw = options.now ?? new Date();
  const value = raw instanceof Date ? raw.getTime() : Date.parse(raw);
  if (!Number.isFinite(value)) throw new CalendarDivergenceReviewError("TIME_ORDER_INVALID", "now 不是有效时间");
  return value;
}

function assertNotFuture(timestamp: string, options: CalendarDivergenceReviewPreflightOptions, label: string): void {
  const skew = options.allowedClockSkewMs ?? 5 * 60 * 1_000;
  if (!Number.isFinite(skew) || skew < 0 || skew > 60 * 60 * 1_000) {
    throw new CalendarDivergenceReviewError("TIME_ORDER_INVALID", "允许时钟偏差必须在 0—1 小时内");
  }
  if (Date.parse(timestamp) > nowMs(options) + skew) {
    throw new CalendarDivergenceReviewError("TIME_ORDER_INVALID", `${label}不能晚于当前时间`);
  }
}

function flattenFixtureCases(fixture: CalendarDivergenceWindowsPayload) {
  return fixture.windows.flatMap((auditWindow) =>
    auditWindow.cases.map((candidate) => ({ auditWindow, candidate }))
  );
}

export async function digestCalendarDivergenceReviewCase(
  fixture: CalendarDivergenceWindowsPayload,
  windowId: z.infer<typeof windowIdSchema>,
  candidate: z.infer<typeof calendarDivergenceWindowCaseSchema>
): Promise<string> {
  return sha256Hex({
    datasetId: fixture.datasetId,
    formatVersion: fixture.formatVersion,
    classification: fixture.classification,
    frame: fixture.frame,
    sources: fixture.sources,
    windowId,
    candidate
  });
}

async function expectedCaseBindings(fixture: CalendarDivergenceWindowsPayload) {
  return Promise.all(flattenFixtureCases(fixture).map(async ({ auditWindow, candidate }) => ({
    windowId: auditWindow.windowId,
    caseId: candidate.caseId,
    caseDigest: await digestCalendarDivergenceReviewCase(fixture, auditWindow.windowId, candidate),
    gregorianDate: candidate.gregorianDate,
    role: candidate.role
  })));
}

export async function createCalendarDivergenceReviewBundle(options: {
  fixture?: string | unknown;
  generatedAt?: string;
} = {}): Promise<CalendarDivergenceReviewBundleEnvelope> {
  const fixtureEnvelope = await preflightCalendarDivergenceWindows(
    options.fixture ?? CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE
  );
  const payload = reviewBundlePayloadSchema.parse({
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    datasetId: fixtureEnvelope.payload.datasetId,
    datasetFixtureVersion: fixtureEnvelope.payload.formatVersion,
    fixtureDigest: fixtureEnvelope.digest,
    fixture: fixtureEnvelope.payload,
    cases: await expectedCaseBindings(fixtureEnvelope.payload),
    reviewPolicy: {
      requiredCaseCount: 64,
      requiredControlCount: 4,
      requiredDivergenceCount: 60,
      requiredIndependentReviewCount: 2,
      requiredAdjudicatorCount: 1,
      acceptAllShortcutAllowed: false,
      identityVerificationMode: "offline_maintainer_required"
    },
    releaseBoundary: { countsAsVerifiedGold: false, verifiedGoldDelta: 0 }
  });
  return calendarDivergenceReviewBundleEnvelopeSchema.parse({
    format: CALENDAR_DIVERGENCE_REVIEW_BUNDLE_FORMAT,
    formatVersion: CALENDAR_DIVERGENCE_REVIEW_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload)
  });
}

export async function preflightCalendarDivergenceReviewBundle(
  raw: string | unknown,
  options: CalendarDivergenceReviewPreflightOptions = {}
): Promise<CalendarDivergenceReviewBundleEnvelope> {
  const envelope = parseEnvelope(
    calendarDivergenceReviewBundleEnvelopeSchema,
    raw,
    "连续历法差异审核包",
    4 * 1024 * 1024
  );
  if (await sha256Hex(envelope.payload) !== envelope.digest) {
    throw new CalendarDivergenceReviewError("DIGEST_MISMATCH", "审核包摘要不匹配");
  }
  assertNotFuture(envelope.payload.generatedAt, options, "审核包生成时间");

  await preflightCalendarDivergenceWindows({
    payload: envelope.payload.fixture,
    digest: envelope.payload.fixtureDigest
  });
  const current = await preflightCalendarDivergenceWindows(
    options.fixture ?? CALENDAR_DIVERGENCE_WINDOWS_ENVELOPE
  );
  if (
    envelope.payload.fixtureDigest !== current.digest
    || canonicalStringify(envelope.payload.fixture) !== canonicalStringify(current.payload)
  ) {
    throw new CalendarDivergenceReviewError("FIXTURE_MISMATCH", "审核包绑定的连续窗口已不是当前 fixture");
  }
  const expected = await expectedCaseBindings(current.payload);
  if (canonicalStringify(envelope.payload.cases) !== canonicalStringify(expected)) {
    throw new CalendarDivergenceReviewError("CASE_COVERAGE_MISMATCH", "审核包没有精确绑定当前 64 个逐日案例");
  }
  return envelope;
}

function expectedEvidence(auditWindow: CalendarDivergenceWindowsPayload["windows"][number], role: "control" | "divergence") {
  if (role === "control") {
    return {
      authority: [auditWindow.hkoSourceId],
      supporting: ["dotnet-framework-4-8-chinese-lunisolar", "icu-chinese-calendar-78-3"].sort(),
      contradictory: [],
      astronomy: []
    };
  }
  return {
    authority: [auditWindow.hkoSourceId],
    supporting: ["icu-chinese-calendar-78-3"],
    contradictory: ["dotnet-framework-4-8-chinese-lunisolar"],
    astronomy: [auditWindow.rootCauseAssessment.usnoSourceId]
  };
}

function assertSourceRoles(
  review: z.infer<typeof calendarDivergenceDailyReviewSchema>,
  fixture: CalendarDivergenceWindowsPayload
): void {
  const sourceById = new Map(fixture.sources.map((source) => [source.sourceId, source]));
  const checks: Array<{ ids: readonly string[]; role: string; predicate: (source: CalendarDivergenceWindowsPayload["sources"][number]) => boolean }> = [
    { ids: review.authoritySourceIds, role: "权威", predicate: (source) => source.role === "authoritative" && source.sourceType === "official_calendar" },
    { ids: review.supportingCrosscheckSourceIds, role: "支持交叉实现", predicate: (source) => source.role === "crosscheck" && source.sourceType === "software_implementation" },
    { ids: review.contradictorySourceIds, role: "矛盾交叉实现", predicate: (source) => source.role === "crosscheck" && source.sourceType === "software_implementation" },
    { ids: review.astronomyReferenceSourceIds, role: "天文参考", predicate: (source) => source.role === "astronomical_reference" && source.sourceType === "government_astronomy_api" }
  ];
  for (const check of checks) {
    for (const sourceId of check.ids) {
      const source = sourceById.get(sourceId as z.infer<typeof sourceIdSchema>);
      if (!source || !check.predicate(source)) {
        throw new CalendarDivergenceReviewError("SOURCE_ROLE_INVALID", `${sourceId} 不能作为${check.role}来源`);
      }
    }
  }
}

function assertDailyReview(
  review: z.infer<typeof calendarDivergenceDailyReviewSchema>,
  binding: z.infer<typeof calendarDivergenceReviewCaseBindingSchema>,
  fixture: CalendarDivergenceWindowsPayload
): void {
  if (canonicalStringify({
    windowId: review.windowId,
    caseId: review.caseId,
    caseDigest: review.caseDigest,
    gregorianDate: review.gregorianDate,
    role: review.role
  }) !== canonicalStringify(binding)) {
    throw new CalendarDivergenceReviewError("CASE_COVERAGE_MISMATCH", `逐日审核 ${review.caseId} 没有绑定当前案例`);
  }
  const auditWindow = fixture.windows.find((item) => item.windowId === review.windowId)!;
  const candidate = auditWindow.cases.find((item) => item.caseId === review.caseId)!;
  const evidence = expectedEvidence(auditWindow, candidate.role);
  assertSourceRoles(review, fixture);
  if (
    canonicalStringify(review.authoritySourceIds) !== canonicalStringify(evidence.authority)
    || canonicalStringify(review.supportingCrosscheckSourceIds) !== canonicalStringify(evidence.supporting)
    || canonicalStringify(review.contradictorySourceIds) !== canonicalStringify(evidence.contradictory)
    || canonicalStringify(review.astronomyReferenceSourceIds) !== canonicalStringify(evidence.astronomy)
  ) {
    throw new CalendarDivergenceReviewError("SOURCE_ROLE_INVALID", `逐日审核 ${review.caseId} 的证据角色不完整或被混淆`);
  }

  if (candidate.role === "control") {
    if (review.verdict !== "confirm_control") {
      throw new CalendarDivergenceReviewError("CONTROL_DIVERGENCE_CONFUSION", `控制日 ${review.caseId} 只能确认为控制日`);
    }
    if (canonicalStringify(review.effectiveObservation) !== canonicalStringify(candidate.observations.hko)) {
      throw new CalendarDivergenceReviewError("DECISION_CONFLICT", `控制日 ${review.caseId} 的生效日期被改写`);
    }
    return;
  }

  if (review.verdict === "confirm_control") {
    throw new CalendarDivergenceReviewError("CONTROL_DIVERGENCE_CONFUSION", `分歧日 ${review.caseId} 不能使用控制日快捷结论`);
  }
  if (review.verdict === "unresolved") return;
  if (review.verdict === "support_hko_current_icu") {
    if (canonicalStringify(review.effectiveObservation) !== canonicalStringify(candidate.observations.hko)) {
      throw new CalendarDivergenceReviewError("DECISION_CONFLICT", `逐日审核 ${review.caseId} 没有采用 HKO/当前适配器/ICU 共同观测`);
    }
    return;
  }
  throw new CalendarDivergenceReviewError(
    "SOURCE_ROLE_INVALID",
    `逐日审核 ${review.caseId} 的 .NET 结果没有匹配的正向权威历表，不能形成已解决结论`
  );
}

export async function createCalendarDivergenceIndependentReviewEnvelope(
  rawPayload: CalendarDivergenceIndependentReviewPayload
): Promise<CalendarDivergenceIndependentReviewEnvelope> {
  const payload = calendarDivergenceIndependentReviewPayloadSchema.parse(rawPayload);
  return calendarDivergenceIndependentReviewEnvelopeSchema.parse({
    format: CALENDAR_DIVERGENCE_INDEPENDENT_REVIEW_FORMAT,
    formatVersion: CALENDAR_DIVERGENCE_REVIEW_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload)
  });
}

export type CalendarDivergenceIndependentReviewPreflightOptions = CalendarDivergenceReviewPreflightOptions & {
  reviewBundle: string | unknown;
};

export type CalendarDivergenceIndependentReviewPreflight = {
  envelope: CalendarDivergenceIndependentReviewEnvelope;
  reviewBundle: CalendarDivergenceReviewBundleEnvelope;
  unresolvedCaseCount: number;
  integrityAndCoveragePassed: true;
  identityVerified: false;
  countsAsVerifiedGold: false;
  verifiedGoldDelta: 0;
};

export async function preflightCalendarDivergenceIndependentReview(
  raw: string | unknown,
  options: CalendarDivergenceIndependentReviewPreflightOptions
): Promise<CalendarDivergenceIndependentReviewPreflight> {
  const envelope = parseEnvelope(
    calendarDivergenceIndependentReviewEnvelopeSchema,
    raw,
    "连续历法差异独立审核",
    2 * 1024 * 1024
  );
  if (await sha256Hex(envelope.payload) !== envelope.digest) {
    throw new CalendarDivergenceReviewError("DIGEST_MISMATCH", "独立审核摘要不匹配");
  }
  const bundle = await preflightCalendarDivergenceReviewBundle(options.reviewBundle, options);
  if (
    envelope.payload.reviewBundleDigest !== bundle.digest
    || envelope.payload.fixtureDigest !== bundle.payload.fixtureDigest
    || envelope.payload.datasetId !== bundle.payload.datasetId
  ) {
    throw new CalendarDivergenceReviewError("REVIEW_BUNDLE_MISMATCH", "独立审核没有绑定当前审核包");
  }
  if (Date.parse(envelope.payload.reviewedAt) < Date.parse(bundle.payload.generatedAt)) {
    throw new CalendarDivergenceReviewError("TIME_ORDER_INVALID", "独立审核不能早于审核包生成时间");
  }
  assertNotFuture(envelope.payload.createdAt, options, "独立审核创建时间");
  envelope.payload.caseReviews.forEach((review, index) => {
    assertDailyReview(review, bundle.payload.cases[index]!, bundle.payload.fixture);
  });
  return {
    envelope,
    reviewBundle: bundle,
    unresolvedCaseCount: envelope.payload.declaredCounts.unresolved,
    integrityAndCoveragePassed: true,
    identityVerified: false,
    countsAsVerifiedGold: false,
    verifiedGoldDelta: 0
  };
}

export async function createCalendarDivergenceAdjudicationEnvelope(
  rawPayload: CalendarDivergenceAdjudicationPayload
): Promise<CalendarDivergenceAdjudicationEnvelope> {
  const sortedDigests = [...rawPayload.independentReviewDigests].sort() as [string, string];
  const payload = calendarDivergenceAdjudicationPayloadSchema.parse({
    ...rawPayload,
    independentReviewDigests: sortedDigests
  });
  return calendarDivergenceAdjudicationEnvelopeSchema.parse({
    format: CALENDAR_DIVERGENCE_ADJUDICATION_FORMAT,
    formatVersion: CALENDAR_DIVERGENCE_REVIEW_FORMAT_VERSION,
    payload,
    digest: await sha256Hex(payload)
  });
}

export type CalendarDivergenceAdjudicationPreflightOptions = CalendarDivergenceReviewPreflightOptions & {
  reviewBundle: string | unknown;
  independentReviews: readonly [string | unknown, string | unknown];
};

export type CalendarDivergenceAdjudicationPreflight = {
  envelope: CalendarDivergenceAdjudicationEnvelope;
  reviewBundle: CalendarDivergenceReviewBundleEnvelope;
  independentReviews: readonly [CalendarDivergenceIndependentReviewEnvelope, CalendarDivergenceIndependentReviewEnvelope];
  unresolvedCaseCount: number;
  structurallyReadyForMaintainerAudit: true;
  allCaseDecisionsResolved: boolean;
  eligibleForCuratedIntegration: boolean;
  identityVerified: false;
  countsAsVerifiedGold: false;
  verifiedGoldDelta: 0;
};

export async function preflightCalendarDivergenceAdjudication(
  raw: string | unknown,
  options: CalendarDivergenceAdjudicationPreflightOptions
): Promise<CalendarDivergenceAdjudicationPreflight> {
  const envelope = parseEnvelope(
    calendarDivergenceAdjudicationEnvelopeSchema,
    raw,
    "连续历法差异第三方裁决",
    2 * 1024 * 1024
  );
  if (await sha256Hex(envelope.payload) !== envelope.digest) {
    throw new CalendarDivergenceReviewError("DIGEST_MISMATCH", "第三方裁决摘要不匹配");
  }
  const bundle = await preflightCalendarDivergenceReviewBundle(options.reviewBundle, options);
  if (
    envelope.payload.reviewBundleDigest !== bundle.digest
    || envelope.payload.fixtureDigest !== bundle.payload.fixtureDigest
  ) {
    throw new CalendarDivergenceReviewError("REVIEW_BUNDLE_MISMATCH", "第三方裁决没有绑定当前审核包");
  }

  const reviewResults = await Promise.all(options.independentReviews.map((review) =>
    preflightCalendarDivergenceIndependentReview(review, { ...options, reviewBundle: bundle })
  ));
  const reviews = reviewResults.map((result) => result.envelope) as [
    CalendarDivergenceIndependentReviewEnvelope,
    CalendarDivergenceIndependentReviewEnvelope
  ];
  const suppliedDigests = reviews.map((review) => review.digest).sort();
  if (canonicalStringify(suppliedDigests) !== canonicalStringify(envelope.payload.independentReviewDigests)) {
    throw new CalendarDivergenceReviewError("REVIEW_MISMATCH", "裁决绑定的两份审核摘要与实际文件不一致");
  }
  const reviewerIds = new Set(reviews.map((review) => review.payload.reviewer.reviewerId));
  const identityRefs = new Set(reviews.map((review) => review.payload.reviewer.identityRecordRef));
  if (reviewerIds.size !== 2 || identityRefs.size !== 2) {
    throw new CalendarDivergenceReviewError("REVIEWER_NOT_INDEPENDENT", "两份审核必须具有不同 reviewerId 和 identityRecordRef");
  }
  if (
    reviewerIds.has(envelope.payload.adjudicator.adjudicatorId)
    || identityRefs.has(envelope.payload.adjudicator.identityRecordRef)
  ) {
    throw new CalendarDivergenceReviewError("REVIEWER_NOT_INDEPENDENT", "裁决人必须独立于两位审核人");
  }
  if (reviews.some((review) => Date.parse(review.payload.createdAt) > Date.parse(envelope.payload.decidedAt))) {
    throw new CalendarDivergenceReviewError("TIME_ORDER_INVALID", "裁决时间不能早于任一独立审核文件");
  }
  assertNotFuture(envelope.payload.createdAt, options, "裁决创建时间");

  envelope.payload.caseDecisions.forEach((decision, index) => {
    const binding = bundle.payload.cases[index]!;
    const decisionBinding = {
      windowId: decision.windowId,
      caseId: decision.caseId,
      caseDigest: decision.caseDigest,
      gregorianDate: decision.gregorianDate,
      role: decision.role
    };
    if (canonicalStringify(decisionBinding) !== canonicalStringify(binding)) {
      throw new CalendarDivergenceReviewError("CASE_COVERAGE_MISMATCH", `逐日裁决 ${decision.caseId} 没有绑定当前案例`);
    }
    if (decision.role === "control" && decision.decision !== "confirm_control") {
      throw new CalendarDivergenceReviewError("CONTROL_DIVERGENCE_CONFUSION", `控制日 ${decision.caseId} 不能被当作分歧日裁决`);
    }
    if (decision.role === "divergence" && decision.decision === "confirm_control") {
      throw new CalendarDivergenceReviewError("CONTROL_DIVERGENCE_CONFUSION", `分歧日 ${decision.caseId} 不能使用 accept-all 控制日快捷结论`);
    }
    const reviewRows = reviews.map((review) => review.payload.caseReviews[index]!);
    if (decision.decision !== "unresolved") {
      const decisionProjection = canonicalStringify({
        verdict: decision.decision,
        effectiveObservation: decision.effectiveObservation
      });
      if (!reviewRows.some((review) => canonicalStringify({
        verdict: review.verdict,
        effectiveObservation: review.effectiveObservation
      }) === decisionProjection)) {
        throw new CalendarDivergenceReviewError(
          "DECISION_CONFLICT",
          `已解决裁决 ${decision.caseId} 必须选择至少一份有效独立审核明确支持的结论`
        );
      }
    }
  });

  const unresolvedCaseCount = envelope.payload.declaredCounts.unresolved;
  return {
    envelope,
    reviewBundle: bundle,
    independentReviews: reviews,
    unresolvedCaseCount,
    structurallyReadyForMaintainerAudit: true,
    allCaseDecisionsResolved: unresolvedCaseCount === 0,
    // Identity records still require offline verification and a maintainer-controlled
    // integration step. Structural resolution alone must never open this gate.
    eligibleForCuratedIntegration: false,
    identityVerified: false,
    countsAsVerifiedGold: false,
    verifiedGoldDelta: 0
  };
}

export function serializeCalendarDivergenceReviewBundle(envelope: CalendarDivergenceReviewBundleEnvelope): string {
  return `${canonicalStringify(calendarDivergenceReviewBundleEnvelopeSchema.parse(envelope))}\n`;
}

export function serializeCalendarDivergenceIndependentReview(
  envelope: CalendarDivergenceIndependentReviewEnvelope
): string {
  return `${canonicalStringify(calendarDivergenceIndependentReviewEnvelopeSchema.parse(envelope))}\n`;
}

export function serializeCalendarDivergenceAdjudication(envelope: CalendarDivergenceAdjudicationEnvelope): string {
  return `${canonicalStringify(calendarDivergenceAdjudicationEnvelopeSchema.parse(envelope))}\n`;
}
