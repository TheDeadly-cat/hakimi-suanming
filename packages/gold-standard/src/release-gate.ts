import { z } from "zod";

import { expandJieBoundaryCandidates, JIE_BOUNDARY_FIXTURE } from "./index";
import { CALENDAR_CONVERSION_FIXTURE } from "./lunar-conversion";

export const PROJECT_GOLD_RELEASE_GATE_SCHEMA_VERSION = "1.0.0" as const;
export const PROJECT_GOLD_REQUIRED_CASE_COUNT = 360 as const;

export const PROJECT_GOLD_CATEGORY_DEFINITIONS = Object.freeze([
  { id: "stable_date", label: "普通稳定日期", quota: 30 },
  { id: "calendar_conversion", label: "公农历转换", quota: 24 },
  { id: "solar_term_astronomy", label: "节气天文时刻", quota: 36 },
  { id: "timezone_dst_dateline", label: "时区、DST 与日期线", quota: 30 },
  { id: "year_boundary", label: "界年规则", quota: 18 },
  { id: "month_boundary", label: "界月规则", quota: 36 },
  { id: "day_hour_boundary", label: "换日与时辰", quota: 48 },
  { id: "solar_time", label: "真太阳时", quota: 30 },
  { id: "luck_direction", label: "顺逆排运", quota: 18 },
  { id: "luck_start_transition", label: "起运与大运切换", quota: 36 },
  { id: "uncertain_invalid_input", label: "未知、模糊与非法输入", quota: 18 },
  { id: "derived_relations_shensha", label: "派生关系与神煞", quota: 36 }
] as const);

export type ProjectGoldCategory = typeof PROJECT_GOLD_CATEGORY_DEFINITIONS[number]["id"];
export type ProjectGoldEvidenceStatus = "candidate" | "cross_checked" | "verified";
export type ProjectGoldDatasetCountingPolicy = "gold_candidate" | "diagnostic_only";

export type ProjectGoldDatasetDefinition = {
  readonly datasetId: string;
  readonly category: ProjectGoldCategory;
  readonly countingPolicy: ProjectGoldDatasetCountingPolicy;
};

export const P003_CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID =
  "hakimi-p0-03-calendar-divergence-windows-v1" as const;

export const PROJECT_GOLD_DATASET_CATALOG = Object.freeze([
  {
    datasetId: "jie-boundary-2024-candidates",
    category: "month_boundary",
    countingPolicy: "gold_candidate"
  },
  {
    datasetId: "hko-calendar-conversion-candidates-v1",
    category: "calendar_conversion",
    countingPolicy: "gold_candidate"
  },
  {
    datasetId: P003_CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID,
    category: "calendar_conversion",
    countingPolicy: "diagnostic_only"
  }
] as const satisfies readonly ProjectGoldDatasetDefinition[]);

const PROJECT_GOLD_CATEGORY_IDS = PROJECT_GOLD_CATEGORY_DEFINITIONS.map((item) => item.id) as [
  ProjectGoldCategory,
  ...ProjectGoldCategory[]
];

const projectGoldCategorySchema = z.enum(PROJECT_GOLD_CATEGORY_IDS);
const stableIdSchema = z.string().min(1).max(240).regex(/^[a-z0-9][a-z0-9._:@-]*$/);
const sha256RefSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

function uniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const projectGoldEvidenceSchema = z.strictObject({
  status: z.enum(["candidate", "cross_checked", "verified"]),
  authoritySourceIds: z.array(stableIdSchema).max(16),
  independentImplementationIds: z.array(stableIdSchema).max(16),
  reviewerIds: z.array(stableIdSchema).max(2),
  decisionRecordRef: sha256RefSchema.nullable(),
  fixtureIntegrated: z.boolean()
}).superRefine((value, context) => {
  if (!uniqueStrings(value.authoritySourceIds)) {
    context.addIssue({ code: "custom", path: ["authoritySourceIds"], message: "权威来源 ID 必须唯一" });
  }
  if (!uniqueStrings(value.independentImplementationIds)) {
    context.addIssue({ code: "custom", path: ["independentImplementationIds"], message: "独立实现 ID 必须唯一" });
  }
  if (!uniqueStrings(value.reviewerIds)) {
    context.addIssue({ code: "custom", path: ["reviewerIds"], message: "复核身份必须唯一" });
  }
  if (value.authoritySourceIds.some((sourceId) => value.independentImplementationIds.includes(sourceId))) {
    context.addIssue({ code: "custom", path: ["independentImplementationIds"], message: "同一来源不能同时冒充权威材料和独立实现" });
  }

  if (value.status === "candidate") {
    if (value.fixtureIntegrated || value.reviewerIds.length > 0 || value.decisionRecordRef !== null) {
      context.addIssue({ code: "custom", path: ["status"], message: "candidate 不得携带已集成裁决或复核身份" });
    }
    return;
  }

  const evidenceLineageCount = value.authoritySourceIds.length + value.independentImplementationIds.length;
  if (value.independentImplementationIds.length === 0 || evidenceLineageCount < 2) {
    context.addIssue({
      code: "custom",
      path: ["independentImplementationIds"],
      message: `${value.status} 至少需要一个独立实现，并且总计至少两个不同证据来源`
    });
  }

  if (value.status === "cross_checked") {
    if (value.fixtureIntegrated || value.reviewerIds.length > 0 || value.decisionRecordRef !== null) {
      context.addIssue({ code: "custom", path: ["status"], message: "cross_checked 不得伪装成已纳入 fixture 的人工金标" });
    }
    return;
  }

  if (
    value.authoritySourceIds.length === 0 ||
    value.reviewerIds.length !== 2 ||
    value.decisionRecordRef === null ||
    !value.fixtureIntegrated
  ) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "verified 必须有权威来源、独立实现、两个不同复核身份、裁决摘要并已纳入版本化 fixture"
    });
  }
});

export const projectGoldCaseRegistrationSchema = z.strictObject({
  registrationId: stableIdSchema,
  datasetId: stableIdSchema,
  caseId: stableIdSchema,
  caseFingerprint: z.string().min(1).max(1000),
  category: projectGoldCategorySchema,
  evidence: projectGoldEvidenceSchema
});

const projectGoldCountSchema = z.strictObject({
  total: z.number().int().min(0).max(PROJECT_GOLD_REQUIRED_CASE_COUNT),
  candidate: z.number().int().min(0).max(PROJECT_GOLD_REQUIRED_CASE_COUNT),
  cross_checked: z.number().int().min(0).max(PROJECT_GOLD_REQUIRED_CASE_COUNT),
  verified: z.number().int().min(0).max(PROJECT_GOLD_REQUIRED_CASE_COUNT),
  authority: z.number().int().min(0).max(PROJECT_GOLD_REQUIRED_CASE_COUNT),
  independent: z.number().int().min(0).max(PROJECT_GOLD_REQUIRED_CASE_COUNT)
});

const projectGoldCategoryCountSchema = projectGoldCountSchema.extend({
  category: projectGoldCategorySchema,
  quota: z.number().int().positive()
});

const projectGoldCategoryQuotaSchema = z.strictObject({
  category: projectGoldCategorySchema,
  quota: z.number().int().positive()
});

export const projectGoldReleaseRegistrySchema = z.strictObject({
  schemaVersion: z.literal(PROJECT_GOLD_RELEASE_GATE_SCHEMA_VERSION),
  requiredGoldCaseCount: z.literal(PROJECT_GOLD_REQUIRED_CASE_COUNT),
  categoryQuotas: z.array(projectGoldCategoryQuotaSchema).length(PROJECT_GOLD_CATEGORY_DEFINITIONS.length),
  registrations: z.array(projectGoldCaseRegistrationSchema).max(PROJECT_GOLD_REQUIRED_CASE_COUNT),
  declaredCounts: projectGoldCountSchema,
  declaredCategoryCounts: z.array(projectGoldCategoryCountSchema).length(PROJECT_GOLD_CATEGORY_DEFINITIONS.length)
});

export type ProjectGoldEvidence = z.infer<typeof projectGoldEvidenceSchema>;
export type ProjectGoldCaseRegistration = z.infer<typeof projectGoldCaseRegistrationSchema>;
export type ProjectGoldCounts = z.infer<typeof projectGoldCountSchema>;
export type ProjectGoldCategoryCounts = z.infer<typeof projectGoldCategoryCountSchema>;
export type ProjectGoldReleaseRegistry = z.infer<typeof projectGoldReleaseRegistrySchema>;

export type ProjectGoldReleaseGateReport = {
  schemaVersion: typeof PROJECT_GOLD_RELEASE_GATE_SCHEMA_VERSION;
  requiredGoldCaseCount: typeof PROJECT_GOLD_REQUIRED_CASE_COUNT;
  counts: ProjectGoldCounts;
  remainingCaseSlots: number;
  categories: Array<ProjectGoldCategoryCounts & {
    label: string;
    remainingSlots: number;
    quotaFilled: boolean;
    verifiedQuotaPassed: boolean;
  }>;
  releaseGatePassed: boolean;
  failClosedReasons: string[];
};

export type ProjectGoldReleaseGateErrorCode =
  | "INVALID_FORMAT"
  | "QUOTA_MISMATCH"
  | "DUPLICATE_MAPPING"
  | "UNKNOWN_DATASET"
  | "NON_COUNTING_DATASET"
  | "DATASET_CATEGORY_MISMATCH"
  | "DATASET_EVIDENCE_MISMATCH"
  | "CATEGORY_OVERFLOW"
  | "COUNT_MISMATCH";

export class ProjectGoldReleaseGateError extends Error {
  constructor(
    readonly code: ProjectGoldReleaseGateErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ProjectGoldReleaseGateError";
  }
}

function canonicalQuotaRows() {
  return PROJECT_GOLD_CATEGORY_DEFINITIONS.map(({ id, quota }) => ({ category: id, quota }));
}

function evidenceCounts(registrations: readonly ProjectGoldCaseRegistration[]): ProjectGoldCounts {
  return {
    total: registrations.length,
    candidate: registrations.filter((item) => item.evidence.status === "candidate").length,
    cross_checked: registrations.filter((item) => item.evidence.status === "cross_checked").length,
    verified: registrations.filter((item) => item.evidence.status === "verified").length,
    authority: registrations.filter((item) => item.evidence.authoritySourceIds.length > 0).length,
    independent: registrations.filter((item) => item.evidence.independentImplementationIds.length > 0).length
  };
}

function categoryCounts(registrations: readonly ProjectGoldCaseRegistration[]): ProjectGoldCategoryCounts[] {
  return PROJECT_GOLD_CATEGORY_DEFINITIONS.map(({ id, quota }) => ({
    category: id,
    quota,
    ...evidenceCounts(registrations.filter((item) => item.category === id))
  }));
}

function calendarAuthoritySourceIds(caseId: string): string[] {
  const candidate = CALENDAR_CONVERSION_FIXTURE.cases.find((item) => item.id === caseId);
  if (!candidate) return [];
  const sourceById = new Map(CALENDAR_CONVERSION_FIXTURE.sources.map((source) => [source.sourceId, source]));
  return [...new Set(candidate.evidence.observations
    .filter((observation) => observation.role === "authoritative")
    .map((observation) => sourceById.get(observation.sourceId)?.lineageId)
    .filter((lineageId): lineageId is string => lineageId !== undefined))].sort();
}

function calendarIndependentImplementationIds(caseId: string): string[] {
  return [...new Set(CALENDAR_CONVERSION_FIXTURE.independentCrossCheckRuns
    .filter((run) => run.matchedCaseIds.includes(caseId))
    .map((run) => run.sourceId))].sort();
}

function buildCurrentRegistrations(): ProjectGoldCaseRegistration[] {
  const jie = expandJieBoundaryCandidates().map((candidate): ProjectGoldCaseRegistration => ({
    registrationId: `${JIE_BOUNDARY_FIXTURE.datasetId}:${candidate.id}`,
    datasetId: JIE_BOUNDARY_FIXTURE.datasetId,
    caseId: candidate.id,
    caseFingerprint: [
      "gregorian-exact-instant",
      candidate.input.date,
      candidate.input.time,
      candidate.input.timeZone,
      JIE_BOUNDARY_FIXTURE.ruleProfileId
    ].join("|"),
    category: "month_boundary",
    evidence: {
      status: candidate.evidence.status,
      authoritySourceIds: [],
      independentImplementationIds: [],
      reviewerIds: [],
      decisionRecordRef: null,
      fixtureIntegrated: false
    }
  }));

  const calendar = CALENDAR_CONVERSION_FIXTURE.cases.map((candidate): ProjectGoldCaseRegistration => ({
    registrationId: `${CALENDAR_CONVERSION_FIXTURE.datasetId}:${candidate.id}`,
    datasetId: CALENDAR_CONVERSION_FIXTURE.datasetId,
    caseId: candidate.id,
    caseFingerprint: [
      "fixed-plus08-calendar-pair",
      candidate.lunarDate,
      candidate.lunarLeapMonth ? "leap" : "regular",
      candidate.expectedGregorianDate
    ].join("|"),
    category: "calendar_conversion",
    evidence: {
      status: candidate.evidence.status,
      authoritySourceIds: calendarAuthoritySourceIds(candidate.id),
      independentImplementationIds: calendarIndependentImplementationIds(candidate.id),
      reviewerIds: [],
      decisionRecordRef: null,
      fixtureIntegrated: false
    }
  }));

  return [...jie, ...calendar];
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameCounts(left: ProjectGoldCounts | undefined, right: ProjectGoldCounts): boolean {
  return left !== undefined &&
    left.total === right.total &&
    left.candidate === right.candidate &&
    left.cross_checked === right.cross_checked &&
    left.verified === right.verified &&
    left.authority === right.authority &&
    left.independent === right.independent;
}

function assertCanonicalQuotas(registry: ProjectGoldReleaseRegistry): void {
  const expected = new Map(PROJECT_GOLD_CATEGORY_DEFINITIONS.map(({ id, quota }) => [id, quota]));
  const actual = new Map<ProjectGoldCategory, number>();
  for (const row of registry.categoryQuotas) {
    if (actual.has(row.category)) {
      throw new ProjectGoldReleaseGateError("QUOTA_MISMATCH", `类别 ${row.category} 重复登记配额。`);
    }
    actual.set(row.category, row.quota);
  }
  for (const [category, quota] of expected) {
    if (actual.get(category) !== quota) {
      throw new ProjectGoldReleaseGateError("QUOTA_MISMATCH", `类别 ${category} 的配额必须固定为 ${quota}。`);
    }
  }
  const total = [...actual.values()].reduce((sum, quota) => sum + quota, 0);
  if (actual.size !== expected.size || total !== PROJECT_GOLD_REQUIRED_CASE_COUNT) {
    throw new ProjectGoldReleaseGateError("QUOTA_MISMATCH", "十二类配额必须完整且合计 360。" );
  }
}

function assertUniqueMappings(registrations: readonly ProjectGoldCaseRegistration[]): void {
  const dimensions: Array<{ label: string; values: string[] }> = [
    { label: "registrationId", values: registrations.map((item) => item.registrationId) },
    { label: "datasetId/caseId", values: registrations.map((item) => `${item.datasetId}|${item.caseId}`) },
    { label: "caseId", values: registrations.map((item) => item.caseId) },
    { label: "caseFingerprint", values: registrations.map((item) => item.caseFingerprint) }
  ];
  for (const dimension of dimensions) {
    if (new Set(dimension.values).size !== dimension.values.length) {
      throw new ProjectGoldReleaseGateError("DUPLICATE_MAPPING", `${dimension.label} 必须在项目登记表中全局唯一。`);
    }
  }
}

function assertDatasetCatalog(registrations: readonly ProjectGoldCaseRegistration[]): void {
  const definitionByDatasetId = new Map<string, ProjectGoldDatasetDefinition>(
    PROJECT_GOLD_DATASET_CATALOG.map((definition) => [definition.datasetId, definition])
  );

  for (const registration of registrations) {
    const definition = definitionByDatasetId.get(registration.datasetId);
    if (!definition) {
      throw new ProjectGoldReleaseGateError(
        "UNKNOWN_DATASET",
        `数据集 ${registration.datasetId} 未登记在固定项目金标准目录中。`
      );
    }
    if (definition.countingPolicy === "diagnostic_only") {
      throw new ProjectGoldReleaseGateError(
        "NON_COUNTING_DATASET",
        `诊断数据集 ${registration.datasetId} 不能登记为项目金标准案例。`
      );
    }
    if (registration.category !== definition.category) {
      throw new ProjectGoldReleaseGateError(
        "DATASET_CATEGORY_MISMATCH",
        `数据集 ${registration.datasetId} 只能计入 ${definition.category} 类别。`
      );
    }
  }
}

function assertCurrentDatasetBindings(registrations: readonly ProjectGoldCaseRegistration[]): void {
  const expected = buildCurrentRegistrations();
  const expectedByRegistrationId = new Map(expected.map((item) => [item.registrationId, item]));
  const currentDatasetIds = new Set<string>([JIE_BOUNDARY_FIXTURE.datasetId, CALENDAR_CONVERSION_FIXTURE.datasetId]);
  const actualCurrent = registrations.filter((item) => currentDatasetIds.has(item.datasetId));

  if (actualCurrent.length !== expected.length) {
    throw new ProjectGoldReleaseGateError(
      "DATASET_EVIDENCE_MISMATCH",
      "当前 36 条界月候选与 24 条公农历候选必须完整登记，不能遗漏或增加伪造案例。"
    );
  }

  for (const registration of actualCurrent) {
    const expectedRegistration = expectedByRegistrationId.get(registration.registrationId);
    if (!expectedRegistration) {
      throw new ProjectGoldReleaseGateError(
        "DATASET_EVIDENCE_MISMATCH",
        `当前候选数据集出现未登记案例 ${registration.registrationId}。`
      );
    }
    if (registration.datasetId === JIE_BOUNDARY_FIXTURE.datasetId && registration.category !== "month_boundary") {
      throw new ProjectGoldReleaseGateError("DATASET_CATEGORY_MISMATCH", "现有 36 条节气候选只能计入界月规则类别。" );
    }
    if (registration.datasetId === CALENDAR_CONVERSION_FIXTURE.datasetId && registration.category !== "calendar_conversion") {
      throw new ProjectGoldReleaseGateError("DATASET_CATEGORY_MISMATCH", "现有 24 条历表候选只能计入公农历转换类别。" );
    }
    if (!sameJson(registration, expectedRegistration)) {
      throw new ProjectGoldReleaseGateError(
        "DATASET_EVIDENCE_MISMATCH",
        `当前候选 ${registration.registrationId} 的映射或证据状态与版本化 fixture 不一致。`
      );
    }
  }
}

function assertNoCategoryOverflow(registrations: readonly ProjectGoldCaseRegistration[]): void {
  for (const { id, quota } of PROJECT_GOLD_CATEGORY_DEFINITIONS) {
    const count = registrations.filter((item) => item.category === id).length;
    if (count > quota) {
      throw new ProjectGoldReleaseGateError("CATEGORY_OVERFLOW", `类别 ${id} 登记 ${count} 条，超过配额 ${quota}。`);
    }
  }
}

function assertCountConservation(registry: ProjectGoldReleaseRegistry): void {
  const actualCounts = evidenceCounts(registry.registrations);
  if (
    actualCounts.candidate + actualCounts.cross_checked + actualCounts.verified !== actualCounts.total ||
    !sameCounts(registry.declaredCounts, actualCounts)
  ) {
    throw new ProjectGoldReleaseGateError("COUNT_MISMATCH", "项目声明计数与逐案例证据状态不守恒。" );
  }

  const actualCategories = categoryCounts(registry.registrations);
  const declaredByCategory = new Map<ProjectGoldCategory, ProjectGoldCategoryCounts>();
  for (const row of registry.declaredCategoryCounts) {
    if (declaredByCategory.has(row.category)) {
      throw new ProjectGoldReleaseGateError("COUNT_MISMATCH", `类别 ${row.category} 重复声明计数。`);
    }
    declaredByCategory.set(row.category, row);
  }
  for (const actual of actualCategories) {
    const declared = declaredByCategory.get(actual.category);
    if (!declared || declared.quota !== actual.quota || !sameCounts(declared, actual)) {
      throw new ProjectGoldReleaseGateError("COUNT_MISMATCH", `类别 ${actual.category} 的声明计数与案例登记不一致。`);
    }
  }
}

function parseRegistry(raw: unknown): ProjectGoldReleaseRegistry {
  const parsed = projectGoldReleaseRegistrySchema.safeParse(raw);
  if (!parsed.success) {
    throw new ProjectGoldReleaseGateError(
      "INVALID_FORMAT",
      `项目金标准登记表不符合严格格式：${parsed.error.issues[0]?.message ?? "未知格式错误"}`
    );
  }
  return parsed.data;
}

export function createCurrentProjectGoldReleaseRegistry(): ProjectGoldReleaseRegistry {
  const registrations = buildCurrentRegistrations();
  return projectGoldReleaseRegistrySchema.parse({
    schemaVersion: PROJECT_GOLD_RELEASE_GATE_SCHEMA_VERSION,
    requiredGoldCaseCount: PROJECT_GOLD_REQUIRED_CASE_COUNT,
    categoryQuotas: canonicalQuotaRows(),
    registrations,
    declaredCounts: evidenceCounts(registrations),
    declaredCategoryCounts: categoryCounts(registrations)
  });
}

export function summarizeProjectGoldReleaseGate(
  rawRegistry: unknown = createCurrentProjectGoldReleaseRegistry()
): ProjectGoldReleaseGateReport {
  const registry = parseRegistry(rawRegistry);
  assertCanonicalQuotas(registry);
  assertUniqueMappings(registry.registrations);
  assertDatasetCatalog(registry.registrations);
  assertNoCategoryOverflow(registry.registrations);
  assertCurrentDatasetBindings(registry.registrations);
  assertCountConservation(registry);

  const counts = evidenceCounts(registry.registrations);
  const categories = categoryCounts(registry.registrations).map((category) => {
    const definition = PROJECT_GOLD_CATEGORY_DEFINITIONS.find((item) => item.id === category.category);
    if (!definition) {
      throw new ProjectGoldReleaseGateError("INVALID_FORMAT", `缺少类别 ${category.category} 的固定定义。`);
    }
    return {
      ...category,
      label: definition.label,
      remainingSlots: category.quota - category.total,
      quotaFilled: category.total === category.quota,
      verifiedQuotaPassed: category.verified === category.quota && category.total === category.quota
    };
  });
  const releaseGatePassed =
    counts.total === PROJECT_GOLD_REQUIRED_CASE_COUNT &&
    counts.verified === PROJECT_GOLD_REQUIRED_CASE_COUNT &&
    counts.candidate === 0 &&
    counts.cross_checked === 0 &&
    counts.authority === PROJECT_GOLD_REQUIRED_CASE_COUNT &&
    counts.independent === PROJECT_GOLD_REQUIRED_CASE_COUNT &&
    categories.every((category) => category.verifiedQuotaPassed);

  const failClosedReasons: string[] = [];
  for (const category of categories) {
    if (!category.quotaFilled) {
      failClosedReasons.push(`${category.category}:missing=${category.remainingSlots}`);
    } else if (!category.verifiedQuotaPassed) {
      failClosedReasons.push(`${category.category}:verified=${category.verified}/${category.quota}`);
    }
  }
  if (counts.verified !== PROJECT_GOLD_REQUIRED_CASE_COUNT) {
    failClosedReasons.push(`project:verified=${counts.verified}/${PROJECT_GOLD_REQUIRED_CASE_COUNT}`);
  }

  return {
    schemaVersion: PROJECT_GOLD_RELEASE_GATE_SCHEMA_VERSION,
    requiredGoldCaseCount: PROJECT_GOLD_REQUIRED_CASE_COUNT,
    counts,
    remainingCaseSlots: PROJECT_GOLD_REQUIRED_CASE_COUNT - counts.total,
    categories,
    releaseGatePassed,
    failClosedReasons
  };
}
