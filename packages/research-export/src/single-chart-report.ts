import {
  caseRecordSchema,
  citationRecordSchema,
  fieldProvenanceSchema,
  knowledgeDocumentRecordSchema,
  researchNoteRecordSchema,
  revisionCalculationReceiptRecordSchema,
  storedEventRecordSchema,
  storedEventTimeMigrationReceiptSchema,
  storedRevisionRecordSchema,
  sourceRightsRecordSchema,
  type CitationRecord,
  type CitationTarget,
  type ResearchNoteRecord,
  type RulePackBinding,
  type SourceRightsRecord,
  type StoredEventRecord,
  type StoredEventTimeMigrationReceipt
} from "@hakimi/contracts";
import { verifyRevisionRecordIntegrity } from "@hakimi/chart-integrity";
import {
  BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE,
  BAZI_STRENGTH_CLAIM_REGISTRY,
  BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE,
  buildBaziInterpretationEvidenceEnvelope,
  buildStrengthSensitivityReview,
  interpretBaziChart,
  type BaziInterpretationEvidenceEnvelope,
  type BaziInterpretedClaim,
  type BaziStrengthClaimSource,
  type BaziStrengthClaimSourceBinding
} from "@hakimi/bazi-interpretation";
import { sha256Hex } from "@hakimi/integrity";
import {
  createKnowledgeDocumentCitationIntegrityVerifier,
  isRedistributableSourceRights,
  isReservedSingleChartReportEvidenceSubjectId,
  isSingleChartReportEvidenceSubjectId
} from "@hakimi/knowledge-core";
import {
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  RevisionDerivedReplayError,
  resolveRevisionCalculationSource,
  type RevisionCalculationSourceResolution,
  type RevisionDerivedReplayProjection
} from "@hakimi/revision-replay";
import { z } from "zod";
import {
  compareVerifiedEventsForResearchExport,
  eventTimeExportDetails,
  verifyEventForResearchExportWithBundledArtifact,
  type VerifiedEventForResearchExport
} from "./event-time";
import { REIDENTIFICATION_WARNING } from "./privacy";

export const SINGLE_CHART_REPORT_FORMAT_VERSION = "1.7.0" as const;

const ANONYMOUS_REDACTION = "（匿名模式已移除）" as const;
const REPORT_SCHEMA_VERSION = "1.0.0" as const;
const REPORT_KIND = "single_chart_research_report" as const;
const REPORT_TITLE = "八字单盘研究报告" as const;
const REPORT_PREVIEW_NOTICE = "工程研究预览：不构成确定性命理结论；争议规则、候选引用与人工核验状态必须原样保留。" as const;
const CANONICAL_PROVENANCE_PILLARS = Object.freeze(["year", "month", "day", "hour"] as const);
const CANONICAL_PROVENANCE_FACTS = Object.freeze([
  "ganZhi",
  "hiddenStems",
  "stemTenGod",
  "branchTenGods",
  "wuXing",
  "nayin",
  "twelveGrowth",
  "xun",
  "voidBranches"
] as const);
const CANONICAL_PROVENANCE_FIELDS = CANONICAL_PROVENANCE_PILLARS.flatMap((pillar) =>
  CANONICAL_PROVENANCE_FACTS.map((fact) => `pillars.${pillar}.${fact}`)
);
const CANONICAL_PROVENANCE_FIELD_SET = new Set<string>(CANONICAL_PROVENANCE_FIELDS);
const CANONICAL_ANONYMOUS_PROVENANCE_FIELD = /^pillars\.(year|month|day|hour)\.(ganZhi|hiddenStems|stemTenGod|branchTenGods|wuXing|nayin|twelveGrowth|xun|voidBranches)$/;
const REDACTED_ANONYMOUS_PROVENANCE_FIELD = /^字段 [1-9]\d*（非标准路径已移除）$/;
const RECEIPT_METADATA_FIELDS = Object.freeze([
  "receiptReference",
  "receiptDigest",
  "requestFingerprint",
  "capturedAt"
] as const);
const REPORT_CASE_ROW_LABELS = Object.freeze(["案例", "案例标识", "修订", "标签", "案例备注"] as const);
const REPORT_BIRTH_ROW_LABELS = Object.freeze([
  "输入历法",
  "原始日期",
  "出生时间",
  "时区",
  "性别",
  "地点",
  "坐标",
  "来源备注"
] as const);
const REPORT_CALIBRATION_ROW_LABELS = Object.freeze([
  "民用公历日期",
  "历法算法",
  "原始民用时间",
  "排盘墙上时间",
  "UTC 瞬时点",
  "UTC 偏移",
  "DST 状态",
  "时区解析",
  "真太阳时预览",
  "太阳时模型",
  "时间校准警告",
  "计算警告"
] as const);
const REPORT_RULE_ROW_BASE_LABELS = Object.freeze([
  "规则方案",
  "规则状态",
  "规则说明",
  "界年 / 换月",
  "换日 / 子时日干",
  "时柱时间基准",
  "DST 歧义",
  "太阳时",
  "起运",
  "启用层",
  "规则来源"
] as const);
const REPORT_RULE_PACK_BOUND_ROW_LABELS = Object.freeze([
  "规则包绑定",
  "规则包 packId",
  "规则包 packDigest",
  "规则配置 profileId",
  "规则配置 profileVersion",
  "规则配置 profileDigest",
  "规则包 useMode"
] as const);
const REPORT_RULE_UNBOUND_ROW_LABELS = Object.freeze([
  ...REPORT_RULE_ROW_BASE_LABELS,
  "规则包绑定"
] as const);
const REPORT_RULE_BOUND_ROW_LABELS = Object.freeze([
  ...REPORT_RULE_ROW_BASE_LABELS,
  ...REPORT_RULE_PACK_BOUND_ROW_LABELS
] as const);
const REPORT_INTEGRITY_ROW_LABELS = Object.freeze([
  "引擎",
  "上游",
  "时区库",
  "tzdb 数据摘要",
  "时区解析器",
  "规则摘要",
  "运限规则摘要",
  "结果哈希",
  "支持范围",
  "验证状态",
  "计算时间"
] as const);
const ANONYMOUS_REDACTIONS = Object.freeze([
  "案例别名、UUID、标签与案例备注",
  "地点、坐标、来源备注与太阳时位置推导细节",
  "规则方案名称/说明/自由文本来源与字段 provenance 自由文本（非个人的规则包绑定标识与摘要保留）",
  "研究笔记、事件日期/正文/节点引用",
  "事件时间迁移凭证、源/目标标识、冻结摘要与解释血缘",
  "结构化本地文献引用、机械准入动态计数与权利状态、结果哈希与创建时间"
] as const);
const REPORT_CITATION_STATUS_LABELS = Object.freeze({
  user_candidate: "用户候选",
  verified: "双人核验",
  rejected: "已拒绝 / 反证"
} as const);
const REPORT_CALCULATION_COMPONENTS = Object.freeze([
  Object.freeze({ key: "relations", label: "四柱关系" } as const),
  Object.freeze({ key: "luckCycle", label: "起运" } as const),
  Object.freeze({ key: "transit", label: "Transit" } as const)
] as const);
const REPORT_INTERPRETATION_EVIDENCE_SCOPE = "strength_engineering_candidate_only" as const;
const REPORT_INTERPRETATION_SOURCE_TYPES = Object.freeze([
  "engineering_contract",
  "public_domain_classic_transcription",
  "review_gate_locator"
] as const);
const REPORT_INTERPRETATION_SOURCE_REGISTRY_VERIFICATION_STATUSES = Object.freeze([
  "repository_policy_verified",
  "locator_verified_in_pinned_revision",
  "source_warning_unresolved",
  "locator_only_unfrozen"
] as const);
const REPORT_INTERPRETATION_WORK_RIGHTS_STATUSES = Object.freeze([
  "internal_project_source",
  "historical_work_public_domain_candidate",
  "historical_and_commentary_layers_require_separate_audit"
] as const);
const REPORT_INTERPRETATION_CARRIER_RIGHTS_STATUSES = Object.freeze([
  "local_repository_only",
  "community_transcription_reuse_requires_site_license_audit",
  "incomplete_transcription_source_warning",
  "link_and_locator_only_no_redistribution_clearance"
] as const);
const REPORT_INTERPRETATION_LOCATOR_VERIFICATION_SCOPES = Object.freeze([
  "repository_symbol_registration_only",
  "pinned_carrier_heading_only",
  "pending_manual_textual_verification"
] as const);
const REPORT_INTERPRETATION_SOURCE_REGISTRY = Object.freeze({
  profileVersion: BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE.projectionVersion,
  contentVersion: BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE.contentVersion,
  registrySha256: null
} as const);
const REPORT_INTERPRETATION_STATEMENT_KINDS = Object.freeze([
  "scope",
  "factor_ledger",
  "month_main_duplication",
  "subtotal",
  "classification",
  "sensitivity",
  "boundary"
] as const);

export const SINGLE_CHART_REPORT_PRESENTATION_LIMITS = Object.freeze({
  identifierCharacters: 512,
  labelCharacters: 1_024,
  bodyCharacters: 24_000,
  aggregateCodePoints: 1_000_000,
  markdownUtf8Bytes: 8_388_608,
  rowsPerGroup: 256,
  nestedEntries: 128,
  reviewerCount: 10_000,
  collections: Object.freeze({
    provenance: 512,
    researchNotes: 256,
    events: 256,
    researchEntries: 256,
    eventTimeDerivations: 256,
    citations: 512,
    redactions: 512,
    components: REPORT_CALCULATION_COMPONENTS.length,
    interpretationStatements: 512,
    interpretationSources: 512,
    interpretationSourceBindings: 512,
    interpretationAssertionFamilies: REPORT_INTERPRETATION_STATEMENT_KINDS.length
  }),
  builderInputCollections: Object.freeze({
    revisionCalculationReceipts: 512,
    researchNotes: 256,
    events: 256,
    researchEntries: 256,
    eventTimeMigrationReceipts: 256,
    citations: 512,
    knowledgeDocuments: 512,
    sourceRights: 512,
    provenance: 512
  })
} as const);

export const SINGLE_CHART_REPORT_PRESENTATION_CONTRACT = Object.freeze({
  limits: SINGLE_CHART_REPORT_PRESENTATION_LIMITS,
  identity: Object.freeze({
    schemaVersion: REPORT_SCHEMA_VERSION,
    formatVersion: SINGLE_CHART_REPORT_FORMAT_VERSION,
    kind: REPORT_KIND,
    title: REPORT_TITLE,
    previewNotice: REPORT_PREVIEW_NOTICE,
    privacyWarning: REIDENTIFICATION_WARNING
  }),
  rowLabels: Object.freeze({
    case: REPORT_CASE_ROW_LABELS,
    birth: REPORT_BIRTH_ROW_LABELS,
    calibration: REPORT_CALIBRATION_ROW_LABELS,
    ruleUnbound: REPORT_RULE_UNBOUND_ROW_LABELS,
    ruleBound: REPORT_RULE_BOUND_ROW_LABELS,
    integrity: REPORT_INTEGRITY_ROW_LABELS
  }),
  citationStatusLabels: REPORT_CITATION_STATUS_LABELS,
  calculationComponents: REPORT_CALCULATION_COMPONENTS,
  anonymous: Object.freeze({
    marker: ANONYMOUS_REDACTION,
    redactions: ANONYMOUS_REDACTIONS
  })
} as const);
const ANONYMOUS_WARNING_SUMMARY = /^(0|[1-9]\d*) 条（匿名模式不展开）$/;
const UNSAFE_REPORT_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;

function hasExactJsonStructure(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => hasExactJsonStructure(value, right[index]));
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index]
      && hasExactJsonStructure(leftRecord[key], rightRecord[key]));
}

function hasExactRowLabels(
  rows: readonly { label: string }[],
  labels: readonly string[]
): boolean {
  return rows.length === labels.length
    && rows.every((row, index) => row.label === labels[index]);
}

function boundedReportCodePointCount(value: string, maximumCharacters: number): number | null {
  if (value.length > maximumCharacters * 2) return null;
  let characterCount = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    const nextCodeUnit = value.charCodeAt(index + 1);
    if (
      codeUnit >= 0xd800
      && codeUnit <= 0xdbff
      && nextCodeUnit >= 0xdc00
      && nextCodeUnit <= 0xdfff
    ) {
      index += 1;
    }
    characterCount += 1;
    if (characterCount > maximumCharacters) return null;
  }
  return characterCount;
}

function hasAtMostReportCodePoints(value: string, maximumCharacters: number): boolean {
  return boundedReportCodePointCount(value, maximumCharacters) !== null;
}

function hasAtMostAggregateReportCodePoints(value: unknown, maximumCodePoints: number): boolean {
  let remainingCodePoints = maximumCodePoints;
  const pending: Array<{ value: unknown; exitObject: boolean }> = [{
    value,
    exitObject: false
  }];
  const activePath = new WeakSet<object>();

  while (pending.length > 0) {
    const current = pending.pop()!;
    const candidate = current.value;
    if (current.exitObject) {
      activePath.delete(candidate as object);
      continue;
    }
    if (typeof candidate === "string") {
      const count = boundedReportCodePointCount(candidate, remainingCodePoints);
      if (count === null) return false;
      remainingCodePoints -= count;
      continue;
    }
    if (candidate === null || typeof candidate !== "object") continue;
    if (activePath.has(candidate)) return false;
    activePath.add(candidate);
    pending.push({ value: candidate, exitObject: true });
    let descriptors: Record<string, PropertyDescriptor>;
    try {
      if (Object.getOwnPropertySymbols(candidate).length > 0) return false;
      descriptors = Object.getOwnPropertyDescriptors(candidate);
    } catch {
      return false;
    }
    const nestedValues: unknown[] = [];
    for (const descriptor of Object.values(descriptors)) {
      if (!descriptor.enumerable) continue;
      if (!("value" in descriptor)) return false;
      nestedValues.push(descriptor.value);
    }
    for (let index = nestedValues.length - 1; index >= 0; index -= 1) {
      pending.push({ value: nestedValues[index], exitObject: false });
    }
  }

  return true;
}

function hasAtMostUtf8Bytes(value: string, maximumBytes: number): boolean {
  if (value.length > maximumBytes) return false;
  let byteCount = 0;

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    const nextCodeUnit = value.charCodeAt(index + 1);
    if (codeUnit <= 0x7f) {
      byteCount += 1;
    } else if (codeUnit <= 0x7ff) {
      byteCount += 2;
    } else if (
      codeUnit >= 0xd800
      && codeUnit <= 0xdbff
      && nextCodeUnit >= 0xdc00
      && nextCodeUnit <= 0xdfff
    ) {
      byteCount += 4;
      index += 1;
    } else {
      byteCount += 3;
    }
    if (byteCount > maximumBytes) return false;
  }

  return true;
}

export function hasSingleChartReportAggregateTextCapacity(value: unknown): boolean {
  return hasAtMostAggregateReportCodePoints(
    value,
    SINGLE_CHART_REPORT_PRESENTATION_LIMITS.aggregateCodePoints
  );
}

function boundedReportString(maximumCharacters: number, label: string) {
  return z.string()
    .max(maximumCharacters * 2, `${label} 超过当前展示容量`)
    .refine(
      (value) => hasAtMostReportCodePoints(value, maximumCharacters),
      `${label} 超过当前展示容量`
    )
    .refine(
      (value) => !UNSAFE_REPORT_TEXT_PATTERN.test(value),
      `${label} 包含不可安全显示的控制字符`
    );
}

function nonemptyBoundedReportString(maximumCharacters: number, label: string) {
  return boundedReportString(maximumCharacters, label).refine(
    (value) => value.trim().length > 0,
    `${label} 不能为空`
  );
}

const reportIdentifierSchema = (label: string) => nonemptyBoundedReportString(
  SINGLE_CHART_REPORT_PRESENTATION_LIMITS.identifierCharacters,
  label
);
const reportLabelSchema = (label: string) => nonemptyBoundedReportString(
  SINGLE_CHART_REPORT_PRESENTATION_LIMITS.labelCharacters,
  label
);
const optionalReportLabelSchema = (label: string) => boundedReportString(
  SINGLE_CHART_REPORT_PRESENTATION_LIMITS.labelCharacters,
  label
);
const reportBodySchema = (label: string) => boundedReportString(
  SINGLE_CHART_REPORT_PRESENTATION_LIMITS.bodyCharacters,
  label
);
const nonemptyReportBodySchema = (label: string) => nonemptyBoundedReportString(
  SINGLE_CHART_REPORT_PRESENTATION_LIMITS.bodyCharacters,
  label
);
const canonicalReportDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const reportLocalCitationReferenceSchema = z.string().regex(/^C[1-9]\d*$/);
const reportLocalDocumentReferenceSchema = z.string().regex(/^D[1-9]\d*$/);

const exactRecord = <Output>(schema: z.ZodType<Output>, label: string) =>
  z.unknown().transform((input, context): Output => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({ code: "custom", path: issue.path, message: issue.message });
      }
      return z.NEVER;
    }
    if (!hasExactJsonStructure(input, parsed.data)) {
      context.addIssue({ code: "custom", message: `${label} 不是精确、规范的当前契约记录` });
      return z.NEVER;
    }
    return parsed.data;
  });

export const singleChartReportInputSchema = z.strictObject({
  caseRecord: exactRecord(caseRecordSchema, "Case"),
  revision: exactRecord(storedRevisionRecordSchema, "Revision"),
  revisionCalculationReceiptLedgerStatus: z.enum(["available", "schema_unavailable"]).default("schema_unavailable"),
  revisionCalculationReceipts: z.array(
    exactRecord(revisionCalculationReceiptRecordSchema, "RevisionCalculationReceipt")
  ).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.revisionCalculationReceipts).default([]),
  researchNotes: z.array(exactRecord(researchNoteRecordSchema, "ResearchNote"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.researchNotes),
  events: z.array(exactRecord(storedEventRecordSchema, "Event"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.events),
  eventTimeMigrationReceipts: z.array(
    exactRecord(storedEventTimeMigrationReceiptSchema, "EventTimeMigrationReceipt")
  ).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.eventTimeMigrationReceipts),
  citations: z.array(exactRecord(citationRecordSchema, "Citation"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations),
  knowledgeDocuments: z.array(exactRecord(knowledgeDocumentRecordSchema, "KnowledgeDocument"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.knowledgeDocuments),
  sourceRights: z.array(exactRecord(sourceRightsRecordSchema, "SourceRights"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.sourceRights)
}).superRefine((input, context) => {
  if (
    input.researchNotes.length + input.events.length
    > SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.researchEntries
  ) {
    context.addIssue({
      code: "custom",
      path: ["researchNotes"],
      message: "研究笔记与事件合计超过当前单盘报告展示容量"
    });
  }
});

export const singleChartReportOptionsSchema = z.strictObject({
  anonymized: z.boolean().default(true)
});

const reportRowSchema = z.strictObject({
  label: reportLabelSchema("报告行标签"),
  value: reportBodySchema("报告行正文")
});
const reportPillarSchema = z.strictObject({
  key: z.enum(["year", "month", "day", "hour"]),
  label: z.enum(["年柱", "月柱", "日柱", "时柱"]),
  ganZhi: z.string().length(2),
  stemTenGod: reportLabelSchema("干十神"),
  hiddenStems: reportLabelSchema("藏干"),
  branchTenGods: reportLabelSchema("支十神"),
  wuXing: reportLabelSchema("五行"),
  nayin: reportLabelSchema("纳音"),
  twelveGrowth: reportLabelSchema("长生"),
  xun: reportLabelSchema("旬"),
  voidBranches: reportLabelSchema("空亡")
});
const reportProvenanceSchema = z.strictObject({
  field: reportLabelSchema("provenance 字段"),
  kind: fieldProvenanceSchema.shape.kind,
  algorithmId: reportIdentifierSchema("provenance 算法标识"),
  verificationStatus: fieldProvenanceSchema.shape.verificationStatus,
  sourceRefs: z.array(reportLabelSchema("provenance 来源引用"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  note: reportBodySchema("provenance 备注")
});
const reportResearchEntrySchema = z.strictObject({
  reference: reportIdentifierSchema("研究条目引用"),
  title: reportLabelSchema("研究条目标题"),
  meta: z.array(reportRowSchema).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  body: reportBodySchema("研究条目正文"),
  sourceRefs: z.array(reportLabelSchema("研究条目来源引用"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries)
});
const reportEventTimeDerivationSchema = z.strictObject({
  reference: z.string().uuid(),
  createdAt: z.string().datetime(),
  authorization: z.literal("explicit_local_user_confirmation"),
  sourceReference: z.string().uuid(),
  targetReference: z.string().uuid(),
  sourceSnapshotDigest: canonicalReportDigestSchema,
  targetSnapshotDigest: canonicalReportDigestSchema,
  lineage: z.array(reportRowSchema).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  interpretation: z.array(reportRowSchema).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries)
});
const reportCalculationComponentSchema = z.strictObject({
  key: z.enum(["relations", "luckCycle", "transit"]),
  label: z.enum(["四柱关系", "起运", "Transit"]),
  status: z.enum(["projected", "unavailable", "not_requested", "not_evaluable"]),
  executorId: reportIdentifierSchema("下游组件执行器").nullable(),
  resultDigest: canonicalReportDigestSchema.nullable()
});
const reportCalculationSourceSchema = z.strictObject({
  natalSource: z.literal("verified_stored_revision"),
  downstreamSource: z.enum(["stored_receipt", "explicit_projection", "not_evaluable"]),
  receiptLedgerStatus: z.enum(["available", "schema_unavailable"]),
  storedHistoricalOutputCompared: z.boolean(),
  comparisonStatus: z.enum(["matched", "mismatch", "exact_executor_unavailable", "not_applicable"]),
  profileId: reportIdentifierSchema("执行器 Profile"),
  projectionDigest: canonicalReportDigestSchema.nullable(),
  receiptReference: z.string().uuid().nullable(),
  receiptDigest: canonicalReportDigestSchema.nullable(),
  requestFingerprint: canonicalReportDigestSchema.nullable(),
  capturedAt: z.string().datetime().nullable(),
  expertEvidenceStatus: z.literal("not_verified"),
  components: z.tuple([
    reportCalculationComponentSchema,
    reportCalculationComponentSchema,
    reportCalculationComponentSchema
  ]),
  notice: nonemptyReportBodySchema("下游计算来源说明")
}).superRefine((source, context) => {
  const issue = (path: string, message: string) => context.addIssue({
    code: "custom",
    path: [path],
    message
  });
  const isComparedResult = source.comparisonStatus === "matched" || source.comparisonStatus === "mismatch";

  source.components.forEach((component, index) => {
    const expected = REPORT_CALCULATION_COMPONENTS[index]!;
    const componentIssue = (field: "key" | "label" | "status" | "executorId" | "resultDigest", message: string) => {
      context.addIssue({
        code: "custom",
        path: ["components", index, field],
        message
      });
    };
    if (component.key !== expected.key) {
      componentIssue("key", "下游组件必须使用固定 key 顺序");
    }
    if (component.label !== expected.label) {
      componentIssue("label", "下游组件标签必须与固定 key 一一对应");
    }
    if (component.status === "projected") {
      if (component.executorId === null) {
        componentIssue("executorId", "已生成工程输出的组件必须保留精确执行器标识");
      }
    } else if (component.resultDigest !== null) {
      componentIssue("resultDigest", "未生成工程输出的组件不能携带结果摘要");
    }
    if (component.status === "not_requested" && component.key !== "transit") {
      componentIssue("status", "只有 Transit 组件可以声明本次未请求");
    }
    if (
      (component.status === "not_requested" || component.status === "not_evaluable")
      && component.executorId !== null
    ) {
      componentIssue("executorId", "未请求或不可计算的组件不能声明执行器");
    }
  });

  if (source.downstreamSource === "not_evaluable") {
    if (source.components.some((component) => component.status !== "not_evaluable")) {
      issue("components", "全局不可计算来源要求所有下游组件均为不可计算");
    }
  } else if (source.components.some((component) => component.status === "not_evaluable")) {
    issue("components", "可计算来源不能夹带不可计算组件状态");
  }

  if (source.receiptLedgerStatus === "schema_unavailable") {
    if (source.downstreamSource === "stored_receipt") {
      issue("downstreamSource", "收据账本不可用时不能声明已保存计算收据来源");
    }
    if (isComparedResult) {
      issue("comparisonStatus", "收据账本不可用时不能声明历史输出比较结果");
    }
    if (source.storedHistoricalOutputCompared) {
      issue("storedHistoricalOutputCompared", "收据账本不可用时不能声明已比较历史输出");
    }
  }

  if (source.downstreamSource === "stored_receipt" && source.receiptLedgerStatus !== "available") {
    issue("receiptLedgerStatus", "已保存计算收据来源要求可用的收据账本");
  }

  if (isComparedResult) {
    if (source.receiptLedgerStatus !== "available") {
      issue("receiptLedgerStatus", "历史输出比较结果要求可用的收据账本");
    }
    if (source.downstreamSource !== "stored_receipt") {
      issue("downstreamSource", "历史输出比较结果要求已保存计算收据来源");
    }
    if (!source.storedHistoricalOutputCompared) {
      issue("storedHistoricalOutputCompared", "历史输出比较结果要求明确记录已完成比较");
    }
  }

  if (source.storedHistoricalOutputCompared && !isComparedResult) {
    issue("storedHistoricalOutputCompared", "已比较历史输出只允许 matched 或 mismatch 结果");
  }

  if (source.comparisonStatus === "exact_executor_unavailable") {
    if (source.receiptLedgerStatus !== "available") {
      issue("receiptLedgerStatus", "精确执行器不可用状态要求可用的收据账本");
    }
    if (source.downstreamSource !== "stored_receipt") {
      issue("downstreamSource", "精确执行器不可用状态要求已保存计算收据来源");
    }
    if (source.storedHistoricalOutputCompared) {
      issue("storedHistoricalOutputCompared", "精确执行器不可用时不能声明已完成历史输出比较");
    }
  }

  if (source.comparisonStatus === "not_applicable") {
    if (source.downstreamSource === "stored_receipt") {
      issue("comparisonStatus", "已保存计算收据来源必须给出可判定的比较状态");
    }
    if (source.storedHistoricalOutputCompared) {
      issue("storedHistoricalOutputCompared", "not_applicable 状态不能声明已比较历史输出");
    }
  }

  if (
    source.downstreamSource !== "stored_receipt"
    && source.comparisonStatus !== "not_applicable"
  ) {
    issue("comparisonStatus", "非收据来源只能使用 not_applicable 比较状态");
  }
});
const reportCitationSchema = z.strictObject({
  reference: reportIdentifierSchema("引用标识"),
  status: z.enum(["user_candidate", "verified", "rejected"]),
  statusLabel: reportLabelSchema("引用状态标签"),
  targets: z.array(reportLabelSchema("引用目标"))
    .min(1)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  evidenceSubjectIds: z.array(reportIdentifierSchema("引用证据主题"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  quote: reportBodySchema("引用正文"),
  annotation: reportBodySchema("引用批注"),
  decisionNote: reportBodySchema("引用决定说明"),
  reviewerCount: z.number().int().nonnegative().max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.reviewerCount),
  locator: reportLabelSchema("引用定位"),
  source: z.strictObject({
    documentReference: reportLocalDocumentReferenceSchema,
    title: reportLabelSchema("引用资料标题"),
    author: optionalReportLabelSchema("引用资料作者"),
    edition: optionalReportLabelSchema("引用资料版本"),
    contentHash: canonicalReportDigestSchema,
    sourceUrl: optionalReportLabelSchema("引用来源网址"),
    publisher: optionalReportLabelSchema("引用出版方"),
    publicationYear: optionalReportLabelSchema("引用出版年份"),
    origin: z.enum(["user_import", "bundled"]),
    rightsStatus: z.enum([
      "user_unverified",
      "public_domain_verified",
      "licensed_verified",
      "project_original_verified",
      "blocked"
    ]),
    workStatus: z.enum([
      "unknown",
      "public_domain_verified",
      "copyrighted",
      "project_original_verified"
    ]),
    editionStatus: z.enum([
      "unknown",
      "public_domain_verified",
      "licensed_verified",
      "project_original_verified",
      "copyrighted"
    ]),
    distributionPolicy: z.enum(["local_private_only", "redistributable"]),
    reviewStatus: z.enum(["unreviewed", "single_reviewed", "double_reviewed"]),
    redistributableSourceRights: z.boolean()
  })
}).superRefine((citation, context) => {
  const expectedStatusLabel = REPORT_CITATION_STATUS_LABELS[citation.status];
  if (citation.statusLabel !== expectedStatusLabel) {
    context.addIssue({
      code: "custom",
      path: ["statusLabel"],
      message: "引用状态标签必须由引用状态确定"
    });
  }
  if (uniqueStringCount(citation.targets) !== citation.targets.length) {
    context.addIssue({
      code: "custom",
      path: ["targets"],
      message: "报告内引用目标标签必须唯一"
    });
  }
  if (citation.status === "verified" && citation.reviewerCount < 2) {
    context.addIssue({
      code: "custom",
      path: ["reviewerCount"],
      message: "已核验引用必须保留至少两个不同复核身份的计数"
    });
  }
  if (
    (citation.status === "verified" || citation.status === "rejected")
    && citation.decisionNote.trim().length === 0
  ) {
    context.addIssue({
      code: "custom",
      path: ["decisionNote"],
      message: "已核验或已拒绝引用必须保留裁定说明"
    });
  }
  if (uniqueStringCount(citation.evidenceSubjectIds) !== citation.evidenceSubjectIds.length
    || citation.evidenceSubjectIds.some((subjectId) => !isSingleChartReportEvidenceSubjectId(subjectId))) {
    context.addIssue({
      code: "custom",
      path: ["evidenceSubjectIds"],
      message: "引用证据主题必须是当前单盘报告 exact scope 内的唯一主题"
    });
  }
  const targetEvidenceSubjectIds = [...new Set(citation.targets.flatMap((target) => (
    target.startsWith("证据主题 ") ? [target.slice("证据主题 ".length)] : []
  )))].sort(compareText);
  if (!hasExactJsonStructure(citation.evidenceSubjectIds, targetEvidenceSubjectIds)) {
    context.addIssue({
      code: "custom",
      path: ["evidenceSubjectIds"],
      message: "引用证据主题必须与报告内可见 target 标签精确闭合"
    });
  }
  const expectedRedistributableSourceRights = citation.source.origin === "bundled"
    && (citation.source.rightsStatus === "public_domain_verified"
      || citation.source.rightsStatus === "licensed_verified"
      || citation.source.rightsStatus === "project_original_verified")
    && citation.source.distributionPolicy === "redistributable"
    && citation.source.reviewStatus === "double_reviewed"
    && (citation.source.workStatus === "public_domain_verified"
      || citation.source.workStatus === "project_original_verified")
    && (citation.source.editionStatus === "public_domain_verified"
      || citation.source.editionStatus === "licensed_verified"
      || citation.source.editionStatus === "project_original_verified");
  const safeUserImportProjection = citation.source.rightsStatus === "user_unverified"
    && citation.source.workStatus === "unknown"
    && citation.source.editionStatus === "unknown"
    && citation.source.distributionPolicy === "local_private_only"
    && citation.source.reviewStatus === "unreviewed";
  if ((citation.source.origin === "user_import" && !safeUserImportProjection)
    || (citation.source.origin === "bundled" && !expectedRedistributableSourceRights)) {
    context.addIssue({
      code: "custom",
      path: ["source", "origin"],
      message: "引用 SourceRights 投影必须保留用户导入仅本机或随包资料已核清的失败关闭状态"
    });
  }
  if (citation.source.redistributableSourceRights !== expectedRedistributableSourceRights) {
    context.addIssue({
      code: "custom",
      path: ["source", "redistributableSourceRights"],
      message: "引用的可再分发权利状态必须由公开的 SourceRights 投影机械决定"
    });
  }
});

const reportInterpretationStatementKindSchema = z.enum(REPORT_INTERPRETATION_STATEMENT_KINDS);
const reportInterpretationStatementSchema = z.strictObject({
  statementId: reportIdentifierSchema("解读证据句标识"),
  order: z.number().int().positive().max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationStatements),
  kind: reportInterpretationStatementKindSchema,
  text: nonemptyReportBodySchema("解读证据规范正文").nullable(),
  classification: z.enum(["supported", "inferred", "unsupported", "contradicted", "advisory", "blocked"]),
  displayStatus: z.enum(["visible_with_evidence", "visible_with_caveat", "withheld"]),
  factIds: z.array(reportIdentifierSchema("解读证据事实引用"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  ruleIds: z.array(reportIdentifierSchema("解读证据规则引用"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  sourceBindingIds: z.array(reportIdentifierSchema("解读证据来源定位引用"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  registryLocatorVerifiedBindingIds: z.array(reportIdentifierSchema("解读证据注册表 locator 已核引用"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  stabilityAssessmentIds: z.array(reportIdentifierSchema("解读证据稳定性引用"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  missingEvidence: z.array(nonemptyReportBodySchema("解读证据缺失项"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  conflictIds: z.array(reportIdentifierSchema("解读证据冲突引用"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  rationale: nonemptyReportBodySchema("解读证据分级理由"),
  sourceLocatorCoverage: z.enum(["verified", "incomplete", "not_applicable"]),
  exactCanonicalRendererMatch: z.literal(true)
});
const reportInterpretationAssertionFamilySchema = z.strictObject({
  kind: reportInterpretationStatementKindSchema,
  total: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationStatements),
  displayable: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationStatements),
  withheld: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationStatements)
});
const reportInterpretationSourceTypeSchema = z.enum(REPORT_INTERPRETATION_SOURCE_TYPES);
const reportInterpretationSourceRegistryVerificationStatusSchema = z.enum(
  REPORT_INTERPRETATION_SOURCE_REGISTRY_VERIFICATION_STATUSES
);
const reportInterpretationWorkRightsStatusSchema = z.enum(
  REPORT_INTERPRETATION_WORK_RIGHTS_STATUSES
);
const reportInterpretationCarrierRightsStatusSchema = z.enum(
  REPORT_INTERPRETATION_CARRIER_RIGHTS_STATUSES
);
const reportInterpretationLocatorVerificationScopeSchema = z.enum(
  REPORT_INTERPRETATION_LOCATOR_VERIFICATION_SCOPES
);
const reportInterpretationSourceRegistrySchema = z.strictObject({
  profileVersion: z.literal(REPORT_INTERPRETATION_SOURCE_REGISTRY.profileVersion),
  contentVersion: z.literal(REPORT_INTERPRETATION_SOURCE_REGISTRY.contentVersion),
  registrySha256: z.null()
});
const reportInterpretationSourceSchema = z.strictObject({
  sourceId: reportIdentifierSchema("解读证据来源标识"),
  order: z.number().int().positive()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSources),
  sourceType: reportInterpretationSourceTypeSchema,
  title: nonemptyReportBodySchema("解读证据来源标题"),
  editionOrCarrier: nonemptyReportBodySchema("解读证据来源版本或载体"),
  url: nonemptyReportBodySchema("解读证据来源 URL"),
  stableRevision: reportIdentifierSchema("解读证据来源固定版本").nullable(),
  registryVerificationStatus: reportInterpretationSourceRegistryVerificationStatusSchema,
  workRightsStatus: reportInterpretationWorkRightsStatusSchema,
  carrierRightsStatus: reportInterpretationCarrierRightsStatusSchema,
  usageBoundary: nonemptyReportBodySchema("解读证据来源使用边界"),
  sourceRightsRecordStatus: z.literal("binding_scoped"),
  expertTruthClaimed: z.literal(false),
  scientificValidityClaimed: z.literal(false)
});
const reportInterpretationMechanicalAdmissionSchema = z.strictObject({
  sourceIdentityStatus: z.literal("not_assessed"),
  citationReviewState: z.enum([
    "no_citation",
    "rejected_only",
    "candidate_only",
    "verified_present"
  ]),
  redistributionState: z.enum([
    "not_applicable_no_verified",
    "no_verified_source_redistributable",
    "some_verified_sources_redistributable",
    "all_verified_sources_redistributable"
  ]),
  candidateCitationReferences: z.array(reportLocalCitationReferenceSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations),
  verifiedCitationReferences: z.array(reportLocalCitationReferenceSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations),
  rejectedCitationReferences: z.array(reportLocalCitationReferenceSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations),
  redistributableVerifiedCitationReferences: z.array(reportLocalCitationReferenceSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations)
}).superRefine((admission, context) => {
  const allReferences = [
    ...admission.candidateCitationReferences,
    ...admission.verifiedCitationReferences,
    ...admission.rejectedCitationReferences
  ];
  if (new Set(allReferences).size !== allReferences.length) {
    context.addIssue({ code: "custom", path: ["candidateCitationReferences"], message: "同一 binding 的 Citation 引用分区不得重复" });
  }
  const verifiedReferences = new Set(admission.verifiedCitationReferences);
  if (admission.redistributableVerifiedCitationReferences.some((reference) => !verifiedReferences.has(reference))) {
    context.addIssue({ code: "custom", path: ["redistributableVerifiedCitationReferences"], message: "可再分发 Citation 必须是 verified 子集" });
  }
  const expectedCitationState = admission.verifiedCitationReferences.length > 0
    ? "verified_present"
    : admission.candidateCitationReferences.length > 0
      ? "candidate_only"
      : admission.rejectedCitationReferences.length > 0
        ? "rejected_only"
        : "no_citation";
  if (admission.citationReviewState !== expectedCitationState) {
    context.addIssue({ code: "custom", path: ["citationReviewState"], message: "Citation 复核状态必须由分区引用机械决定" });
  }
  const expectedRedistributionState = admission.verifiedCitationReferences.length === 0
    ? "not_applicable_no_verified"
    : admission.redistributableVerifiedCitationReferences.length === 0
      ? "no_verified_source_redistributable"
      : admission.redistributableVerifiedCitationReferences.length === admission.verifiedCitationReferences.length
        ? "all_verified_sources_redistributable"
        : "some_verified_sources_redistributable";
  if (admission.redistributionState !== expectedRedistributionState) {
    context.addIssue({ code: "custom", path: ["redistributionState"], message: "再分发状态必须由 verified Citation 与权利记录机械决定" });
  }
});
const reportInterpretationSourceBindingSchema = z.strictObject({
  bindingId: reportIdentifierSchema("解读证据来源定位标识"),
  evidenceSubjectId: reportIdentifierSchema("解读证据主题标识"),
  order: z.number().int().positive()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSourceBindings),
  sourceId: reportIdentifierSchema("解读证据来源标识"),
  sourceType: reportInterpretationSourceTypeSchema,
  evidenceRole: z.enum([
    "defines_engineering_candidate",
    "traditional_context_only",
    "review_question_only"
  ]),
  locator: z.strictObject({
    kind: z.enum(["stable_symbol", "chapter_heading", "anchor_phrase"]),
    value: nonemptyReportBodySchema("解读证据精确定位"),
    registryVerificationStatus: z.enum(["verified", "pending_manual_textual_verification"]),
    verificationScope: reportInterpretationLocatorVerificationScopeSchema,
    contentSha256: z.null()
  }),
  parameterSupport: z.enum(["exact_engineering_definition", "context_only", "boundary_only"]),
  supports: nonemptyReportBodySchema("解读证据来源定位支持范围"),
  doesNotSupport: z.array(nonemptyReportBodySchema("解读证据来源定位反向边界"))
    .min(1)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.nestedEntries),
  mechanicalAdmission: reportInterpretationMechanicalAdmissionSchema
});
const reportInterpretationCoverageSchema = z.strictObject({
  statementsTotal: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationStatements),
  displayable: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationStatements),
  withheld: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationStatements),
  assertionFamilies: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationAssertionFamilies),
  referencedSourceBindings: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSourceBindings),
  registryLocatorVerifiedBindings: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSourceBindings),
  referencedSources: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSources),
  pinnedRevisionSources: z.number().int().nonnegative()
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSources),
  sourceTextsIncluded: z.literal(0)
});
const reportInterpretationAdmissionSummarySchema = z.discriminatedUnion("visibility", [
  z.strictObject({
    visibility: z.literal("redacted"),
    sourceTextCopiedIntoAdmissionLedger: z.literal(false)
  }),
  z.strictObject({
    visibility: z.literal("full"),
    evaluationStatus: z.enum(["evaluated", "not_evaluated_interpretation_withheld"]),
    bindingsTotal: z.number().int().nonnegative()
      .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSourceBindings),
    bindingsWithNonRejectedCitation: z.number().int().nonnegative()
      .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSourceBindings),
    bindingsWithVerifiedCitation: z.number().int().nonnegative()
      .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSourceBindings),
    bindingsWithRedistributableVerifiedCitation: z.number().int().nonnegative()
      .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSourceBindings),
    citationRecords: z.strictObject({
      matching: z.number().int().nonnegative()
        .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations),
      structured: z.number().int().nonnegative()
        .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations),
      candidate: z.number().int().nonnegative()
        .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations),
      verified: z.number().int().nonnegative()
        .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations),
      rejected: z.number().int().nonnegative()
        .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.citations)
    }),
    knowledgeDocumentsBound: z.number().int().nonnegative()
      .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.knowledgeDocuments),
    sourceRightsRecordsBound: z.number().int().nonnegative()
      .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections.sourceRights),
    sourceTextCopiedIntoAdmissionLedger: z.literal(false),
    structuredCitationCoverage: z.enum(["none", "partial", "complete"]),
    distributionRightsState: z.enum([
      "no_matching_source_text",
      "contains_nonredistributable_source_text",
      "all_matching_source_text_redistributable"
    ])
  }).superRefine((summary, context) => {
    if (summary.evaluationStatus !== "not_evaluated_interpretation_withheld") return;
    const hasEvaluatedValue = summary.bindingsTotal !== 0
      || summary.bindingsWithNonRejectedCitation !== 0
      || summary.bindingsWithVerifiedCitation !== 0
      || summary.bindingsWithRedistributableVerifiedCitation !== 0
      || Object.values(summary.citationRecords).some((count) => count !== 0)
      || summary.knowledgeDocumentsBound !== 0
      || summary.sourceRightsRecordsBound !== 0
      || summary.structuredCitationCoverage !== "none"
      || summary.distributionRightsState !== "no_matching_source_text";
    if (hasEvaluatedValue) {
      context.addIssue({
        code: "custom",
        path: ["evaluationStatus"],
        message: "未评估的解释分支不能携带已评估机械准入计数"
      });
    }
  })
]);
const reportInterpretationBoundarySchema = z.strictObject({
  referenceResolutionEstablishesSemanticTruth: z.literal(false),
  citationTargetEstablishesSourceIdentity: z.literal(false),
  expertTruthClaimed: z.literal(false),
  scientificValidityClaimed: z.literal(false),
  formalActivationAllowed: z.literal(false),
  publicReleaseAuthorized: z.literal(false),
  authenticityClaimed: z.literal(false),
  sourceTextIncluded: z.literal(false),
  locatorReviewEstablishesExactQuote: z.literal(false),
  locatorVerificationEstablishesContentIdentity: z.literal(false),
  sourceRegistrationEstablishesDistributionRights: z.literal(false),
  admissionLedgerCopiesSourceText: z.literal(false),
  citationReviewEstablishesSemanticTruth: z.literal(false),
  rightsReviewEstablishesSemanticTruth: z.literal(false),
  reviewerIdentityVerified: z.literal(false),
  reviewerIndependenceVerified: z.literal(false),
  overallGoodBad: z.null(),
  result: z.null()
});

function uniqueStringCount(values: readonly string[]): number {
  return new Set(values).size;
}

const reportInterpretationEvidenceSchema = z.strictObject({
  status: z.enum(["available", "withheld"]),
  reason: z.enum(["dst_unresolved"]).nullable(),
  scope: z.literal(REPORT_INTERPRETATION_EVIDENCE_SCOPE),
  includeHour: z.boolean(),
  envelopeProfileVersion: z.literal(BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE.projectionVersion),
  envelopeContentVersion: z.literal(BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE.contentVersion),
  sourceRegistry: reportInterpretationSourceRegistrySchema,
  payloadSha256: canonicalReportDigestSchema.nullable(),
  statements: z.array(reportInterpretationStatementSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationStatements),
  assertionFamilies: z.array(reportInterpretationAssertionFamilySchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationAssertionFamilies),
  coverage: reportInterpretationCoverageSchema,
  admissionSummary: reportInterpretationAdmissionSummarySchema,
  sources: z.array(reportInterpretationSourceSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSources),
  sourceBindings: z.array(reportInterpretationSourceBindingSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.interpretationSourceBindings),
  boundary: reportInterpretationBoundarySchema
}).superRefine((evidence, context) => {
  const issue = (path: Array<string | number>, message: string) => context.addIssue({
    code: "custom",
    path,
    message
  });
  const zeroCoverage = {
    statementsTotal: 0,
    displayable: 0,
    withheld: 0,
    assertionFamilies: 0,
    referencedSourceBindings: 0,
    registryLocatorVerifiedBindings: 0,
    referencedSources: 0,
    pinnedRevisionSources: 0,
    sourceTextsIncluded: 0
  } as const;
  const zeroFullAdmissionSummary = {
    visibility: "full",
    evaluationStatus: "not_evaluated_interpretation_withheld",
    bindingsTotal: 0,
    bindingsWithNonRejectedCitation: 0,
    bindingsWithVerifiedCitation: 0,
    bindingsWithRedistributableVerifiedCitation: 0,
    citationRecords: {
      matching: 0,
      structured: 0,
      candidate: 0,
      verified: 0,
      rejected: 0
    },
    knowledgeDocumentsBound: 0,
    sourceRightsRecordsBound: 0,
    sourceTextCopiedIntoAdmissionLedger: false,
    structuredCitationCoverage: "none",
    distributionRightsState: "no_matching_source_text"
  } as const;

  if (evidence.status === "withheld") {
    if (evidence.reason !== "dst_unresolved") {
      issue(["reason"], "withheld 解读证据只允许明确的 DST 未解决原因");
    }
    if (evidence.payloadSha256 !== null) {
      issue(["payloadSha256"], "withheld 解读证据不能携带 Envelope 摘要");
    }
    for (const field of ["statements", "assertionFamilies", "sources", "sourceBindings"] as const) {
      if (evidence[field].length !== 0) issue([field], "DST 未解决时解读证据集合必须为空");
    }
    if (!hasExactJsonStructure(evidence.coverage, zeroCoverage)) {
      issue(["coverage"], "DST 未解决时解读证据覆盖计数必须全部为零");
    }
    if (evidence.admissionSummary.visibility === "full"
      && !hasExactJsonStructure(evidence.admissionSummary, zeroFullAdmissionSummary)) {
      issue(["admissionSummary"], "DST 未解决时完整机械准入摘要必须保持未评估零值");
    }
    return;
  }

  if (evidence.reason !== null) issue(["reason"], "available 解读证据不能携带 withheld 原因");
  if (evidence.statements.length === 0) issue(["statements"], "available 解读证据必须携带规范叙事句");
  const statementIds = evidence.statements.map((statement) => statement.statementId);
  if (uniqueStringCount(statementIds) !== statementIds.length) {
    issue(["statements"], "解读证据句标识必须唯一");
  }
  const sourceById = new Map(evidence.sources.map((source) => [source.sourceId, source] as const));
  if (sourceById.size !== evidence.sources.length) {
    issue(["sources"], "解读证据来源标识必须唯一");
  }
  evidence.sources.forEach((source, index) => {
    if (source.order !== index + 1) {
      issue(["sources", index, "order"], "解读证据来源必须按连续 order 输出");
    }
    const registrySource = BAZI_STRENGTH_CLAIM_REGISTRY.sources.find(
      (candidate) => candidate.sourceId === source.sourceId
    );
    if (!registrySource || !hasExactJsonStructure(source, reportInterpretationSource(registrySource))) {
      issue(["sources", index], "解读证据来源快照与冻结来源注册表不一致");
    }
    if (source.sourceType === "engineering_contract") {
      if (source.registryVerificationStatus !== "repository_policy_verified"
        || !source.url.startsWith("/packages/")
        || source.stableRevision === null) {
        issue(["sources", index], "工程来源必须绑定仓内路径、固定版本与 repository_policy_verified 状态");
      }
    } else if (source.sourceType === "public_domain_classic_transcription") {
      if (!source.url.startsWith("https://") || source.stableRevision === null
        || !source.url.includes(`oldid=${source.stableRevision}`)
        || (source.registryVerificationStatus !== "locator_verified_in_pinned_revision"
          && source.registryVerificationStatus !== "source_warning_unresolved")) {
        issue(["sources", index], "传统转录来源必须固定 HTTPS oldid 并保留精确注册状态");
      }
    } else if (source.stableRevision !== null
      || source.registryVerificationStatus !== "locator_only_unfrozen"
      || !source.url.startsWith("https://")) {
      issue(["sources", index], "review gate 来源必须保持未冻结 locator 状态");
    }
  });

  const sourceBindingById = new Map(evidence.sourceBindings.map((binding) => [binding.bindingId, binding] as const));
  if (sourceBindingById.size !== evidence.sourceBindings.length) {
    issue(["sourceBindings"], "解读证据来源定位标识必须唯一");
  }
  evidence.sourceBindings.forEach((binding, index) => {
    if (binding.order !== index + 1) {
      issue(["sourceBindings", index, "order"], "解读证据来源定位必须按连续 order 输出");
    }
    const registryBinding = BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings.find(
      (candidate) => candidate.bindingId === binding.bindingId
    );
    const { mechanicalAdmission: _mechanicalAdmission, ...bindingRegistrySnapshot } = binding;
    if (!registryBinding
      || !hasExactJsonStructure(bindingRegistrySnapshot, reportInterpretationSourceBindingStatic(registryBinding))) {
      issue(["sourceBindings", index], "解读证据来源定位快照与冻结来源注册表不一致");
    }
    const source = sourceById.get(binding.sourceId);
    if (!source || source.sourceType !== binding.sourceType) {
      issue(["sourceBindings", index, "sourceId"], "解读证据来源定位无法 join 到同类型来源");
    }
    const expectedScope = registryBinding
      ? reportInterpretationLocatorVerificationScope(registryBinding)
      : null;
    if (expectedScope !== null && binding.locator.verificationScope !== expectedScope) {
      issue(["sourceBindings", index, "locator", "verificationScope"], "locator 核验范围与来源类型或注册状态不一致");
    }
    if (!binding.supports.trim() || binding.doesNotSupport.length === 0
      || uniqueStringCount(binding.doesNotSupport) !== binding.doesNotSupport.length) {
      issue(["sourceBindings", index], "来源定位必须保留非空支持范围与唯一反向边界");
    }
  });
  if ((evidence.sources.length === 0) !== (evidence.sourceBindings.length === 0)) {
    issue(["sources"], "来源与来源定位账必须同时公开或同时匿名移除");
  }
  if (evidence.sourceBindings.length === 0 && evidence.admissionSummary.visibility !== "redacted") {
    issue(["admissionSummary"], "移除来源定位账时机械准入摘要必须同步脱敏");
  }
  if (evidence.sourceBindings.length > 0 && evidence.admissionSummary.visibility !== "full") {
    issue(["admissionSummary"], "完整来源定位账必须携带完整机械准入摘要");
  }

  evidence.statements.forEach((statement, index) => {
    if (statement.order !== index + 1) {
      issue(["statements", index, "order"], "解读证据句必须按连续 order 输出");
    }
    for (const field of [
      "factIds",
      "ruleIds",
      "sourceBindingIds",
      "registryLocatorVerifiedBindingIds",
      "stabilityAssessmentIds",
      "missingEvidence",
      "conflictIds"
    ] as const) {
      if (uniqueStringCount(statement[field]) !== statement[field].length) {
        issue(["statements", index, field], "解读证据句内部引用必须唯一");
      }
    }
    if (statement.displayStatus === "withheld") {
      if (statement.text !== null) {
        issue(["statements", index, "text"], "withheld 解读证据句不得携带规范正文");
      }
    } else if (statement.text === null) {
      issue(["statements", index, "text"], "可显示解读证据句必须携带规范正文");
    }
    if (statement.classification === "supported" && (
      statement.displayStatus !== "visible_with_evidence"
      || statement.missingEvidence.length !== 0
      || statement.conflictIds.length !== 0
      || statement.factIds.length === 0
      || statement.ruleIds.length === 0
      || statement.sourceBindingIds.length === 0
    )) {
      issue(["statements", index, "classification"], "supported 解读证据句必须保持完整工程引用链");
    }
    if ((statement.classification === "blocked" || statement.classification === "unsupported") && (
      statement.displayStatus !== "withheld" || statement.missingEvidence.length === 0
    )) {
      issue(["statements", index, "classification"], "blocked/unsupported 解读证据句必须 withheld 并列出缺失证据");
    }
    if (statement.classification === "contradicted" && (
      statement.displayStatus !== "withheld" || statement.conflictIds.length === 0
    )) {
      issue(["statements", index, "classification"], "contradicted 解读证据句必须 withheld 并绑定冲突");
    }
    if ((statement.classification === "inferred" || statement.classification === "advisory")
      && statement.displayStatus !== "visible_with_caveat") {
      issue(["statements", index, "displayStatus"], "inferred/advisory 解读证据句必须显式降级显示");
    }

    if (statement.registryLocatorVerifiedBindingIds.some((id) => !statement.sourceBindingIds.includes(id))) {
      issue(
        ["statements", index, "registryLocatorVerifiedBindingIds"],
        "注册表 locator 已核引用必须是当前句来源定位引用的子集"
      );
    }
    const registryBindings = statement.sourceBindingIds.map((id) => (
      BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings.find((binding) => binding.bindingId === id)
    ));
    if (registryBindings.some((binding) => binding === undefined)) {
      issue(["statements", index, "sourceBindingIds"], "解读证据句引用了冻结注册表之外的来源定位");
    }
    if (statement.sourceBindingIds.length === 0) {
      if (statement.registryLocatorVerifiedBindingIds.length !== 0
        || statement.sourceLocatorCoverage !== "not_applicable") {
        issue(["statements", index, "sourceLocatorCoverage"], "无来源定位引用时覆盖状态必须为 not_applicable");
      }
    } else {
      const expectedVerifiedIds = statement.sourceBindingIds.filter((id) => (
        BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings.find((binding) => binding.bindingId === id)
          ?.exactLocator.verificationStatus === "verified"
      ));
      if (!hasExactJsonStructure(statement.registryLocatorVerifiedBindingIds, expectedVerifiedIds)) {
        issue(
          ["statements", index, "registryLocatorVerifiedBindingIds"],
          "句内注册表 locator 已核引用与冻结来源注册表不一致"
        );
      }
      const expectedCoverage = expectedVerifiedIds.length === statement.sourceBindingIds.length
        ? "verified"
        : "incomplete";
      if (statement.sourceLocatorCoverage !== expectedCoverage) {
        issue(["statements", index, "sourceLocatorCoverage"], "来源定位覆盖状态与冻结注册表 locator 状态不一致");
      }
    }
  });

  if (evidence.assertionFamilies.length !== REPORT_INTERPRETATION_STATEMENT_KINDS.length) {
    issue(["assertionFamilies"], "available 解读证据必须保留固定七类断言家族统计");
  }
  REPORT_INTERPRETATION_STATEMENT_KINDS.forEach((kind, index) => {
    const family = evidence.assertionFamilies[index];
    if (!family || family.kind !== kind) {
      issue(["assertionFamilies", index, "kind"], "解读证据断言家族必须使用固定顺序");
      return;
    }
    const familyStatements = evidence.statements.filter((statement) => statement.kind === kind);
    const expected = {
      total: familyStatements.length,
      displayable: familyStatements.filter((statement) => statement.displayStatus !== "withheld").length,
      withheld: familyStatements.filter((statement) => statement.displayStatus === "withheld").length
    };
    if (family.total !== expected.total
      || family.displayable !== expected.displayable
      || family.withheld !== expected.withheld) {
      issue(["assertionFamilies", index], "解读证据断言家族计数与规范叙事句不一致");
    }
  });

  const referencedBindingIds = [...new Set(evidence.statements.flatMap((statement) => statement.sourceBindingIds))];
  const registryVerifiedBindingIds = [...new Set(evidence.statements.flatMap(
    (statement) => statement.registryLocatorVerifiedBindingIds
  ))];
  if (evidence.sourceBindings.length > 0) {
    const ledgerIds = evidence.sourceBindings.map((binding) => binding.bindingId);
    if (ledgerIds.length !== referencedBindingIds.length
      || ledgerIds.some((id) => !referencedBindingIds.includes(id))) {
      issue(["sourceBindings"], "完整解读证据最小来源账必须与句内引用一一对应");
    }
    const ledgerSourceIds = [...new Set(evidence.sourceBindings.map((binding) => binding.sourceId))];
    const sourceIds = evidence.sources.map((source) => source.sourceId);
    if (sourceIds.length !== ledgerSourceIds.length
      || sourceIds.some((id) => !ledgerSourceIds.includes(id))) {
      issue(["sources"], "完整解读证据来源账必须与最小来源定位账一一闭合");
    }
  }
  const referencedRegistrySources = [...new Set(referencedBindingIds.flatMap((bindingId) => {
    const binding = BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings.find(
      (candidate) => candidate.bindingId === bindingId
    );
    return binding ? [binding.sourceId] : [];
  }))];
  const pinnedRevisionSources = referencedRegistrySources.filter((sourceId) => (
    BAZI_STRENGTH_CLAIM_REGISTRY.sources.find((source) => source.sourceId === sourceId)
      ?.stableRevision !== null
  ));
  const expectedCoverage = {
    statementsTotal: evidence.statements.length,
    displayable: evidence.statements.filter((statement) => statement.displayStatus !== "withheld").length,
    withheld: evidence.statements.filter((statement) => statement.displayStatus === "withheld").length,
    assertionFamilies: evidence.assertionFamilies.filter((family) => family.total > 0).length,
    referencedSourceBindings: referencedBindingIds.length,
    registryLocatorVerifiedBindings: registryVerifiedBindingIds.length,
    referencedSources: referencedRegistrySources.length,
    pinnedRevisionSources: pinnedRevisionSources.length,
    sourceTextsIncluded: 0
  } as const;
  if (!hasExactJsonStructure(evidence.coverage, expectedCoverage)) {
    issue(["coverage"], "解读证据覆盖计数与规范叙事句或来源定位不一致");
  }
});

export const singleChartResearchReportSchema = z.strictObject({
  schemaVersion: z.literal(REPORT_SCHEMA_VERSION),
  formatVersion: z.literal(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.identity.formatVersion),
  kind: z.literal(REPORT_KIND),
  anonymized: z.boolean(),
  title: z.literal(REPORT_TITLE),
  subtitle: nonemptyReportBodySchema("报告副标题"),
  caseLabel: reportLabelSchema("案例标签"),
  caseReference: reportIdentifierSchema("案例引用"),
  revisionLabel: reportLabelSchema("修订标签"),
  revisionReference: reportIdentifierSchema("修订引用"),
  privacyWarning: z.literal(SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.identity.privacyWarning),
  previewNotice: z.literal(REPORT_PREVIEW_NOTICE),
  suggestedFileBase: reportIdentifierSchema("建议文件基名").refine(
    (value) => /^[a-z0-9-]+$/.test(value),
    "建议文件基名必须只包含小写 ASCII 字母、数字与连字符"
  ),
  caseRows: z.array(reportRowSchema).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.rowsPerGroup),
  birthRows: z.array(reportRowSchema).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.rowsPerGroup),
  calibrationRows: z.array(reportRowSchema).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.rowsPerGroup),
  ruleRows: z.array(reportRowSchema).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.rowsPerGroup),
  integrityRows: z.array(reportRowSchema).max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.rowsPerGroup),
  calculationSource: reportCalculationSourceSchema,
  interpretationEvidence: reportInterpretationEvidenceSchema,
  pillars: z.array(reportPillarSchema).length(4),
  provenance: z.array(reportProvenanceSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.provenance),
  researchNotes: z.array(reportResearchEntrySchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.researchNotes),
  events: z.array(reportResearchEntrySchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.events),
  eventTimeDerivations: z.array(reportEventTimeDerivationSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.eventTimeDerivations),
  citations: z.array(reportCitationSchema)
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.citations),
  redactions: z.array(nonemptyReportBodySchema("匿名移除项"))
    .max(SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.redactions)
}).superRefine((report, context) => {
  const issue = (path: Array<string | number>, message: string) => context.addIssue({
    code: "custom",
    path,
    message
  });
  if (!hasSingleChartReportAggregateTextCapacity(report)) {
    issue(
      [],
      `单盘报告 aggregate 文本超过 ${SINGLE_CHART_REPORT_PRESENTATION_LIMITS.aggregateCodePoints} Unicode code points 展示容量`
    );
    return;
  }
  const requireExactLabels = (
    field: "caseRows" | "birthRows" | "calibrationRows" | "integrityRows",
    labels: readonly string[]
  ) => {
    if (!hasExactRowLabels(report[field], labels)) {
      issue([field], "单盘报告行组必须使用当前构建器的固定标签序列");
    }
  };

  requireExactLabels("caseRows", REPORT_CASE_ROW_LABELS);
  requireExactLabels("birthRows", REPORT_BIRTH_ROW_LABELS);
  requireExactLabels("calibrationRows", REPORT_CALIBRATION_ROW_LABELS);
  requireExactLabels("integrityRows", REPORT_INTEGRITY_ROW_LABELS);
  if (
    !hasExactRowLabels(report.ruleRows, REPORT_RULE_UNBOUND_ROW_LABELS)
    && !hasExactRowLabels(report.ruleRows, REPORT_RULE_BOUND_ROW_LABELS)
  ) {
    issue(["ruleRows"], "单盘报告规则行必须使用当前构建器支持的固定标签序列");
  }
  if (
    report.researchNotes.length + report.events.length
    > SINGLE_CHART_REPORT_PRESENTATION_LIMITS.collections.researchEntries
  ) {
    issue(["researchNotes"], "研究笔记与事件合计超过当前单盘报告展示容量");
  }

  const provenanceFields = new Set(report.provenance.map((item) => item.field));
  if (CANONICAL_PROVENANCE_FIELDS.some((field) => !provenanceFields.has(field))) {
    issue(["provenance"], "单盘报告缺少四柱规范 provenance 字段覆盖");
  }

  report.calculationSource.components.forEach((component, index) => {
    if (!report.anonymized && component.status === "projected" && component.resultDigest === null) {
      issue(
        ["calculationSource", "components", index, "resultDigest"],
        "完整报告中已生成工程输出的组件必须保留规范结果摘要"
      );
    }
  });

  if (report.calculationSource.downstreamSource !== "stored_receipt") {
    for (const field of RECEIPT_METADATA_FIELDS) {
      if (report.calculationSource[field] !== null) {
        issue(
          ["calculationSource", field],
          "非收据计算来源不能携带收据元数据"
        );
      }
    }
  } else if (!report.anonymized) {
    for (const field of RECEIPT_METADATA_FIELDS) {
      if (report.calculationSource[field] === null) {
        issue(
          ["calculationSource", field],
          "完整的已保存计算收据来源必须保留规范收据元数据"
        );
      }
    }
  }

  if (report.anonymized) {
    if (report.calculationSource.projectionDigest !== null) {
      issue(
        ["calculationSource", "projectionDigest"],
        "匿名报告不能携带下游投影摘要"
      );
    }
  } else if (report.calculationSource.downstreamSource === "not_evaluable") {
    if (report.calculationSource.projectionDigest !== null) {
      issue(
        ["calculationSource", "projectionDigest"],
        "不可计算分支不能携带下游投影摘要"
      );
    }
  } else if (report.calculationSource.projectionDigest === null) {
    issue(
      ["calculationSource", "projectionDigest"],
      "完整的可计算分支必须保留下游投影摘要"
    );
  }

  const citationByReference = new Map(report.citations.map((citation) => [citation.reference, citation] as const));
  if (citationByReference.size !== report.citations.length) {
    issue(["citations"], "完整报告内 Citation 引用号必须唯一");
  }
  report.citations.forEach((citation, index) => {
    if (citation.reference !== `C${index + 1}`) {
      issue(["citations", index, "reference"], "完整报告内 Citation 引用号必须连续且与规范顺序一致");
    }
  });
  const sourceByDocumentReference = new Map<string, unknown>();
  for (const [citationIndex, citation] of report.citations.entries()) {
    const existingSource = sourceByDocumentReference.get(citation.source.documentReference);
    if (existingSource === undefined) {
      const expectedReference = `D${sourceByDocumentReference.size + 1}`;
      if (citation.source.documentReference !== expectedReference) {
        issue(
          ["citations", citationIndex, "source", "documentReference"],
          "报告内 KnowledgeDocument 引用号必须按 Citation 首次出现顺序连续分配"
        );
      }
      sourceByDocumentReference.set(citation.source.documentReference, citation.source);
    } else if (!hasExactJsonStructure(existingSource, citation.source)) {
      issue(
        ["citations", citationIndex, "source"],
        "同一报告内 KnowledgeDocument 引用号必须指向完全相同的资料与权利投影"
      );
    }
  }

  if (report.anonymized) {
    if (report.interpretationEvidence.payloadSha256 !== null) {
      issue(
        ["interpretationEvidence", "payloadSha256"],
        "匿名报告不能携带解读证据 Envelope 摘要"
      );
    }
    if (report.interpretationEvidence.sourceBindings.length !== 0) {
      issue(
        ["interpretationEvidence", "sourceBindings"],
        "匿名报告必须移除解读证据最小来源账"
      );
    }
    if (report.interpretationEvidence.sources.length !== 0) {
      issue(
        ["interpretationEvidence", "sources"],
        "匿名报告必须移除解读证据来源注册表明细"
      );
    }
    if (report.interpretationEvidence.admissionSummary.visibility !== "redacted") {
      issue(
        ["interpretationEvidence", "admissionSummary"],
        "匿名报告必须移除机械准入动态数量与状态明细"
      );
    }
  } else if (report.interpretationEvidence.status === "available") {
    if (report.interpretationEvidence.payloadSha256 === null) {
      issue(
        ["interpretationEvidence", "payloadSha256"],
        "完整报告中的 available 解读证据必须保留 Envelope 摘要"
      );
    }
    if (
      report.interpretationEvidence.sourceBindings.length
      !== report.interpretationEvidence.coverage.referencedSourceBindings
    ) {
      issue(
        ["interpretationEvidence", "sourceBindings"],
        "完整报告中的 available 解读证据必须保留完整最小来源账"
      );
    }
    if (
      report.interpretationEvidence.sources.length
      !== report.interpretationEvidence.coverage.referencedSources
    ) {
      issue(
        ["interpretationEvidence", "sources"],
        "完整报告中的 available 解读证据必须保留完整来源注册表快照"
      );
    }
    if (report.interpretationEvidence.admissionSummary.visibility !== "full") {
      issue(
        ["interpretationEvidence", "admissionSummary"],
        "完整报告中的 available 解读证据必须保留机械准入摘要"
      );
    }
  } else if (report.interpretationEvidence.admissionSummary.visibility !== "full") {
    issue(
      ["interpretationEvidence", "admissionSummary"],
      "完整报告中的 withheld 解读证据必须明确保留未评估零值摘要"
    );
  }

  if (!report.anonymized
    && report.interpretationEvidence.status === "available"
    && report.interpretationEvidence.admissionSummary.visibility === "full") {
    const sourceBindings = report.interpretationEvidence.sourceBindings;
    for (const [bindingIndex, binding] of sourceBindings.entries()) {
      const matching = report.citations.filter((citation) => (
        citation.evidenceSubjectIds.includes(binding.evidenceSubjectId)
      ));
      const referencesForStatus = (status: typeof matching[number]["status"]) => matching
        .filter((citation) => citation.status === status)
        .map((citation) => citation.reference);
      const candidateCitationReferences = referencesForStatus("user_candidate");
      const verifiedCitationReferences = referencesForStatus("verified");
      const rejectedCitationReferences = referencesForStatus("rejected");
      const redistributableVerifiedCitationReferences = matching
        .filter((citation) => citation.status === "verified" && citation.source.redistributableSourceRights)
        .map((citation) => citation.reference);
      const expectedMechanicalAdmission = {
        sourceIdentityStatus: "not_assessed",
        citationReviewState: verifiedCitationReferences.length > 0
          ? "verified_present"
          : candidateCitationReferences.length > 0
            ? "candidate_only"
            : rejectedCitationReferences.length > 0
              ? "rejected_only"
              : "no_citation",
        redistributionState: verifiedCitationReferences.length === 0
          ? "not_applicable_no_verified"
          : redistributableVerifiedCitationReferences.length === 0
            ? "no_verified_source_redistributable"
            : redistributableVerifiedCitationReferences.length === verifiedCitationReferences.length
              ? "all_verified_sources_redistributable"
              : "some_verified_sources_redistributable",
        candidateCitationReferences,
        verifiedCitationReferences,
        rejectedCitationReferences,
        redistributableVerifiedCitationReferences
      } as const;
      if (!hasExactJsonStructure(binding.mechanicalAdmission, expectedMechanicalAdmission)) {
        issue(
          ["interpretationEvidence", "sourceBindings", bindingIndex, "mechanicalAdmission"],
          "binding 机械准入必须与完整报告内 C# Citation、复核状态及权利投影闭合"
        );
      }
    }

    const summary = report.interpretationEvidence.admissionSummary;
    const subjectIds = new Set(sourceBindings.map((binding) => binding.evidenceSubjectId));
    const matchingCitations = report.citations.filter((citation) => (
      citation.evidenceSubjectIds.some((subjectId) => subjectIds.has(subjectId))
    ));
    const bindingsWithNonRejectedCitation = sourceBindings.filter((binding) => (
      binding.mechanicalAdmission.candidateCitationReferences.length > 0
        || binding.mechanicalAdmission.verifiedCitationReferences.length > 0
    )).length;
    const expectedSummary = {
      visibility: "full",
      evaluationStatus: "evaluated",
      bindingsTotal: sourceBindings.length,
      bindingsWithNonRejectedCitation,
      bindingsWithVerifiedCitation: sourceBindings.filter((binding) => (
        binding.mechanicalAdmission.verifiedCitationReferences.length > 0
      )).length,
      bindingsWithRedistributableVerifiedCitation: sourceBindings.filter((binding) => (
        binding.mechanicalAdmission.redistributableVerifiedCitationReferences.length > 0
      )).length,
      citationRecords: {
        matching: matchingCitations.length,
        structured: matchingCitations.filter((citation) => citation.status !== "rejected").length,
        candidate: matchingCitations.filter((citation) => citation.status === "user_candidate").length,
        verified: matchingCitations.filter((citation) => citation.status === "verified").length,
        rejected: matchingCitations.filter((citation) => citation.status === "rejected").length
      },
      knowledgeDocumentsBound: new Set(matchingCitations.map((citation) => (
        citation.source.documentReference
      ))).size,
      sourceRightsRecordsBound: new Set(matchingCitations.map((citation) => (
        citation.source.documentReference
      ))).size,
      sourceTextCopiedIntoAdmissionLedger: false,
      structuredCitationCoverage: bindingsWithNonRejectedCitation === 0
        ? "none"
        : bindingsWithNonRejectedCitation === sourceBindings.length
          ? "complete"
          : "partial",
      distributionRightsState: matchingCitations.length === 0
        ? "no_matching_source_text"
        : matchingCitations.every((citation) => citation.source.redistributableSourceRights)
          ? "all_matching_source_text_redistributable"
          : "contains_nonredistributable_source_text"
    } as const;
    if (!hasExactJsonStructure(summary, expectedSummary)) {
      issue(
        ["interpretationEvidence", "admissionSummary"],
        "机械准入摘要必须与 binding ledger 及完整报告 Citation 投影一致"
      );
    }
  }

  if (!report.anonymized) return;
  for (const field of RECEIPT_METADATA_FIELDS) {
    if (report.calculationSource[field] !== null) {
      issue(
        ["calculationSource", field],
        "匿名报告不能携带收据元数据"
      );
    }
  }
  report.calculationSource.components.forEach((component, index) => {
    if (component.resultDigest !== null) {
      issue(
        ["calculationSource", "components", index, "resultDigest"],
        "匿名报告不能携带下游组件摘要"
      );
    }
  });
  for (const field of ["researchNotes", "events", "eventTimeDerivations", "citations"] as const) {
    if (report[field].length !== 0) {
      issue([field], "匿名报告中的私有研究集合必须为空");
    }
  }
  if (report.caseLabel !== "匿名案例") {
    issue(["caseLabel"], "匿名报告必须使用固定案例标签");
  }
  if (report.caseReference !== "CASE") {
    issue(["caseReference"], "匿名报告必须使用固定案例引用");
  }
  const revisionLabelMatch = /^第 ([1-9]\d*) 版 · (最新|历史修订)$/.exec(report.revisionLabel);
  if (!revisionLabelMatch) {
    issue(["revisionLabel"], "匿名报告的修订标签必须使用规范编号格式");
  } else {
    const revisionNumber = revisionLabelMatch[1];
    if (report.revisionReference !== `R${revisionNumber}`) {
      issue(["revisionReference"], "匿名报告的修订引用必须与修订标签编号一致");
    }
    if (report.suggestedFileBase !== `hakimi-chart-r${revisionNumber}-anonymous`) {
      issue(["suggestedFileBase"], "匿名报告的文件基名必须与修订标签编号一致");
    }
  }

  const requireFixedRowValue = (
    field: "caseRows" | "birthRows" | "calibrationRows" | "ruleRows" | "integrityRows",
    label: string,
    expected: string
  ) => {
    const matches = report[field].filter((row) => row.label === label);
    if (matches.length !== 1 || matches[0]!.value !== expected) {
      issue([field], `匿名报告的 ${label} 行必须唯一存在并使用固定安全值`);
    }
  };

  requireFixedRowValue("caseRows", "案例", "匿名案例");
  requireFixedRowValue("caseRows", "案例标识", "CASE");
  if (revisionLabelMatch) {
    const revisionNumber = revisionLabelMatch[1];
    requireFixedRowValue("caseRows", "修订", `第 ${revisionNumber} 版 / R${revisionNumber}`);
  }
  requireFixedRowValue("caseRows", "标签", ANONYMOUS_REDACTION);
  requireFixedRowValue("caseRows", "案例备注", ANONYMOUS_REDACTION);
  for (const label of ["地点", "坐标", "来源备注"] as const) {
    requireFixedRowValue("birthRows", label, ANONYMOUS_REDACTION);
  }
  requireFixedRowValue("calibrationRows", "真太阳时预览", ANONYMOUS_REDACTION);
  for (const label of ["时间校准警告", "计算警告"] as const) {
    const matches = report.calibrationRows.filter((row) => row.label === label);
    if (matches.length !== 1 || !ANONYMOUS_WARNING_SUMMARY.test(matches[0]!.value)) {
      issue(["calibrationRows"], `匿名报告的 ${label} 行必须是非负整数计数摘要`);
    }
  }
  requireFixedRowValue("ruleRows", "规则说明", ANONYMOUS_REDACTION);
  requireFixedRowValue("ruleRows", "规则来源", ANONYMOUS_REDACTION);
  requireFixedRowValue("integrityRows", "结果哈希", ANONYMOUS_REDACTION);
  requireFixedRowValue("integrityRows", "计算时间", ANONYMOUS_REDACTION);
  if (!hasExactJsonStructure(report.redactions, ANONYMOUS_REDACTIONS)) {
    issue(["redactions"], "匿名报告必须保留当前固定删减清单");
  }

  report.provenance.forEach((item, index) => {
    if (
      !CANONICAL_PROVENANCE_FIELD_SET.has(item.field)
      && !REDACTED_ANONYMOUS_PROVENANCE_FIELD.test(item.field)
    ) {
      issue(
        ["provenance", index, "field"],
        "匿名报告中的非规范 provenance 字段必须使用固定移除占位"
      );
    }
    if (item.algorithmId !== ANONYMOUS_REDACTION) {
      issue(
        ["provenance", index, "algorithmId"],
        "匿名报告中的 provenance 算法标识必须使用固定移除占位"
      );
    }
    if (item.sourceRefs.length !== 0) {
      issue(
        ["provenance", index, "sourceRefs"],
        "匿名报告中的 provenance 来源引用必须为空"
      );
    }
    if (item.note !== ANONYMOUS_REDACTION) {
      issue(
        ["provenance", index, "note"],
        "匿名报告中的 provenance 备注必须使用固定移除占位"
      );
    }
  });
});

export const singleChartMarkdownDocumentSchema = z.strictObject({
  formatVersion: z.literal(SINGLE_CHART_REPORT_FORMAT_VERSION),
  format: z.literal("markdown"),
  anonymized: z.boolean(),
  encoding: z.literal("utf-8"),
  mimeType: z.literal("text/markdown;charset=utf-8"),
  fileExtension: z.literal(".md"),
  suggestedFileName: z.string().endsWith(".md"),
  warnings: z.tuple([z.literal(REIDENTIFICATION_WARNING)]),
  content: z.string().min(1).refine(
    (value) => hasAtMostUtf8Bytes(
      value,
      SINGLE_CHART_REPORT_PRESENTATION_LIMITS.markdownUtf8Bytes
    ),
    `单盘 Markdown UTF-8 正文超过 ${SINGLE_CHART_REPORT_PRESENTATION_LIMITS.markdownUtf8Bytes} bytes 导出容量`
  )
});

type ParsedSingleChartReportInput = z.infer<typeof singleChartReportInputSchema>;
export type SingleChartReportInput = Omit<
  ParsedSingleChartReportInput,
  "revisionCalculationReceiptLedgerStatus" | "revisionCalculationReceipts"
> & Partial<Pick<
  ParsedSingleChartReportInput,
  "revisionCalculationReceiptLedgerStatus" | "revisionCalculationReceipts"
>>;
export type SingleChartReportOptions = z.input<typeof singleChartReportOptionsSchema>;
export type SingleChartResearchReport = z.infer<typeof singleChartResearchReportSchema>;
export type SingleChartMarkdownDocument = z.infer<typeof singleChartMarkdownDocumentSchema>;

const registeredSingleChartResearchReportInstances = new WeakSet<SingleChartResearchReport>();

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertUniqueIds(records: Array<{ id: string }>, label: string): void {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) throw new Error(`${label} ID 重复：${record.id}`);
    seen.add(record.id);
  }
}

function value(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function row(label: string, rowValue: string | number | null | undefined) {
  return { label, value: value(rowValue) };
}

function rulePackProvenanceRows(binding: RulePackBinding | undefined) {
  if (!binding) {
    return [
      row("规则包绑定", "未绑定；本修订仅保留规则方案快照，不应推断来自已安装规则包")
    ];
  }
  return [
    row("规则包绑定", `${binding.kind}；仅表示计算来源，不代表发布者身份或规则正确性已经核验`),
    row("规则包 packId", binding.packId),
    row("规则包 packDigest", binding.packDigest),
    row("规则配置 profileId", binding.profileId),
    row("规则配置 profileVersion", binding.profileVersion),
    row("规则配置 profileDigest", binding.profileDigest),
    row("规则包 useMode", binding.useMode)
  ];
}

function sexLabel(sex: string): string {
  if (sex === "male") return "男";
  if (sex === "female") return "女";
  return "未指定";
}

function calendarLabel(calendar: string): string {
  return calendar === "lunar" ? "农历" : "公历";
}

function statusLabel(status: CitationRecord["status"]): string {
  return REPORT_CITATION_STATUS_LABELS[status];
}

function noteRelevant(note: ResearchNoteRecord, revisionId: string): boolean {
  return note.anchor.kind === "case" || note.anchor.revisionId === revisionId;
}

function eventRelevant(event: StoredEventRecord, revisionId: string): boolean {
  return event.revisionId === null || event.revisionId === revisionId;
}

function migrationSnapshotForEvent(event: StoredEventRecord) {
  return {
    formatVersion: "1.0.0" as const,
    eventRecordVersion: event.recordVersion,
    caseId: event.caseId,
    revisionId: event.revisionId,
    transitNodeRef: event.transitNodeRef,
    datePrecision: event.datePrecision,
    startDate: event.startDate,
    endDate: event.endDate,
    timeContext: event.timeContext
  };
}

async function validateAndSortEventTimeMigrations(
  receipts: StoredEventTimeMigrationReceipt[],
  events: StoredEventRecord[]
): Promise<StoredEventTimeMigrationReceipt[]> {
  assertUniqueIds(receipts, "EventTimeMigrationReceipt");
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const targetIds = new Set<string>();
  const interpretationKeys = new Set<string>();

  for (const receipt of receipts) {
    const source = eventsById.get(receipt.source.recordId);
    const target = eventsById.get(receipt.target.recordId);
    if (!source || !target) {
      throw new Error(`事件时间迁移凭证 ${receipt.id} 的源与目标必须同时属于当前单盘`);
    }
    if (
      !hasExactJsonStructure(receipt.source.snapshot, migrationSnapshotForEvent(source))
      || !hasExactJsonStructure(receipt.target.snapshot, migrationSnapshotForEvent(target))
    ) {
      throw new Error(`事件时间迁移凭证 ${receipt.id} 的冻结快照与当前 Event 时间血缘不一致`);
    }
    const [sourceSnapshotDigest, targetSnapshotDigest] = await Promise.all([
      sha256Hex(receipt.source.snapshot),
      sha256Hex(receipt.target.snapshot)
    ]);
    if (
      receipt.source.snapshotDigest !== sourceSnapshotDigest
      || receipt.target.snapshotDigest !== targetSnapshotDigest
    ) {
      throw new Error(`事件时间迁移凭证 ${receipt.id} 的冻结快照摘要与快照正文不一致`);
    }
    if (target.createdAt !== receipt.createdAt) {
      throw new Error(`事件时间迁移凭证 ${receipt.id} 的目标创建时间与凭证不一致`);
    }
    if (targetIds.has(receipt.target.recordId)) {
      throw new Error(`事件时间迁移目标 ${receipt.target.recordId} 被多个凭证声明`);
    }
    targetIds.add(receipt.target.recordId);
    const interpretationKey = `${receipt.source.recordId}\u0000${receipt.target.snapshotDigest}`;
    if (interpretationKeys.has(interpretationKey)) {
      throw new Error(`事件时间迁移源 ${receipt.source.recordId} 存在重复解释`);
    }
    interpretationKeys.add(interpretationKey);
  }

  return [...receipts].sort((left, right) =>
    compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id)
  );
}

function hasOwnReportDataPath(root: unknown, path: string): boolean {
  const segments = path.split(".");
  if (segments.length === 0 || segments.some((segment) => (
    !segment || segment === "__proto__" || segment === "prototype" || segment === "constructor"
  ))) return false;
  let current = root;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return false;
    const descriptor = Object.getOwnPropertyDescriptor(current, segment);
    if (!descriptor || !("value" in descriptor)) return false;
    current = descriptor.value;
  }
  return true;
}

function targetRelevant(
  target: CitationTarget,
  caseId: string,
  revisionId: string,
  revisionFacts: unknown,
  noteIds: ReadonlySet<string>,
  eventIds: ReadonlySet<string>
): boolean {
  if (target.kind === "research_note") return noteIds.has(target.noteId);
  if (target.kind === "event") return eventIds.has(target.eventId);
  if (target.kind === "chart_field") {
    if (target.caseId !== caseId || target.revisionId !== revisionId) return false;
    if (!hasOwnReportDataPath(revisionFacts, target.field)) {
      throw new Error(`Citation 引用了当前 Revision 中不存在的命盘字段：${target.field}`);
    }
    return true;
  }
  if (isReservedSingleChartReportEvidenceSubjectId(target.subjectId)
    && !isSingleChartReportEvidenceSubjectId(target.subjectId)) {
    throw new Error(`Citation 引用了未知的保留证据主题：${target.subjectId}`);
  }
  return isSingleChartReportEvidenceSubjectId(target.subjectId);
}

function targetLabel(target: CitationTarget): string {
  if (target.kind === "research_note") return `研究笔记 ${target.noteId}`;
  if (target.kind === "event") return `真实事件 ${target.eventId}`;
  if (target.kind === "chart_field") return `命盘字段 ${target.field}`;
  return `证据主题 ${target.subjectId}`;
}

function isReportInputRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRawInputCollectionCapacity(rawInput: unknown): void {
  if (!isReportInputRecord(rawInput)) return;
  const limits = SINGLE_CHART_REPORT_PRESENTATION_LIMITS.builderInputCollections;
  const collections = [
    ["revisionCalculationReceipts", limits.revisionCalculationReceipts, "Revision 计算收据"],
    ["researchNotes", limits.researchNotes, "研究笔记"],
    ["events", limits.events, "事件"],
    ["eventTimeMigrationReceipts", limits.eventTimeMigrationReceipts, "事件时间迁移凭证"],
    ["citations", limits.citations, "引用"],
    ["knowledgeDocuments", limits.knowledgeDocuments, "资料"],
    ["sourceRights", limits.sourceRights, "来源权利记录"]
  ] as const;
  for (const [field, maximum, label] of collections) {
    const candidate = rawInput[field];
    if (Array.isArray(candidate) && candidate.length > maximum) {
      throw new Error(`${label}集合超过当前单盘报告展示容量`);
    }
  }

  const rawNotes = rawInput.researchNotes;
  const rawEvents = rawInput.events;
  if (
    Array.isArray(rawNotes)
    && Array.isArray(rawEvents)
    && rawNotes.length + rawEvents.length > limits.researchEntries
  ) {
    throw new Error("研究笔记与事件合计超过当前单盘报告展示容量");
  }

  const rawRevision = rawInput.revision;
  const rawFacts = isReportInputRecord(rawRevision) ? rawRevision.facts : undefined;
  const rawProvenance = isReportInputRecord(rawFacts) ? rawFacts.fieldProvenance : undefined;
  if (Array.isArray(rawProvenance) && rawProvenance.length > limits.provenance) {
    throw new Error("字段 provenance 集合超过当前单盘报告展示容量");
  }
}

function assertReportTextCapacity(
  label: string,
  candidate: string | null | undefined,
  maximumCharacters: number
): void {
  if (candidate !== null && candidate !== undefined && !hasAtMostReportCodePoints(candidate, maximumCharacters)) {
    throw new Error(`${label}超过当前单盘报告展示容量`);
  }
}

function assertReportStringCollectionCapacity(
  label: string,
  values: readonly string[],
  maximumEntries: number,
  maximumCharacters: number
): void {
  if (values.length > maximumEntries) {
    throw new Error(`${label}集合超过当前单盘报告展示容量`);
  }
  for (const candidate of values) {
    assertReportTextCapacity(label, candidate, maximumCharacters);
  }
}

function assertJoinedReportTextCapacity(
  label: string,
  values: readonly string[],
  separator: string,
  maximumCharacters: number
): void {
  let characterCount = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (index > 0) {
      for (const _character of separator) {
        characterCount += 1;
        if (characterCount > maximumCharacters) {
          throw new Error(`${label}超过当前单盘报告展示容量`);
        }
      }
    }
    for (const _character of values[index]!) {
      characterCount += 1;
      if (characterCount > maximumCharacters) {
        throw new Error(`${label}超过当前单盘报告展示容量`);
      }
    }
  }
}

function assertParsedBuilderPresentationCapacity(input: ParsedSingleChartReportInput): void {
  const limits = SINGLE_CHART_REPORT_PRESENTATION_LIMITS;
  const revision = input.revision;
  const birth = revision.input;
  const calibration = revision.timeCalibration;
  const profile = revision.ruleProfile;

  assertReportTextCapacity("案例别名", input.caseRecord.alias, limits.labelCharacters);
  assertReportTextCapacity("案例备注", input.caseRecord.notes, limits.bodyCharacters);
  assertJoinedReportTextCapacity("案例标签", input.caseRecord.tags, "、", limits.bodyCharacters);
  assertReportTextCapacity("出生地点", birth.location.label, limits.bodyCharacters);
  assertReportTextCapacity("出生来源备注", birth.sourceNote, limits.bodyCharacters);
  assertJoinedReportTextCapacity(
    "报告副标题",
    [revision.facts.calendar.solarText, revision.facts.calendar.lunarText],
    " · ",
    limits.bodyCharacters
  );
  assertReportTextCapacity("规则说明", profile.notice, limits.bodyCharacters);
  assertJoinedReportTextCapacity("规则来源", profile.sourceRefs, "；", limits.bodyCharacters);
  assertReportTextCapacity("真太阳时预览", calibration.solarTimePreview, limits.bodyCharacters);
  assertJoinedReportTextCapacity("时间校准警告", calibration.warnings, "；", limits.bodyCharacters);
  assertJoinedReportTextCapacity("计算警告", revision.manifest.warnings, "；", limits.bodyCharacters);

  const solarTime = calibration.solarTime;
  if (solarTime) {
    assertJoinedReportTextCapacity(
      "太阳时模型",
      [
        solarTime.modelId,
        ...solarTime.variants.map((variant) =>
          `${variant.candidateChoice}:${variant.totalCorrectionMinutes.toFixed(2)} 分`
        )
      ],
      "；",
      limits.bodyCharacters
    );
  }

  for (const pillar of Object.values(revision.facts.pillars)) {
    assertReportTextCapacity("四柱显示字段", pillar.stemTenGod, limits.labelCharacters);
    assertJoinedReportTextCapacity("藏干", pillar.hiddenStems, "、", limits.labelCharacters);
    assertJoinedReportTextCapacity("支十神", pillar.branchTenGods, "、", limits.labelCharacters);
    for (const candidate of [
      pillar.wuXing,
      pillar.nayin,
      pillar.twelveGrowth,
      pillar.xun,
      pillar.voidBranches
    ]) {
      assertReportTextCapacity("四柱显示字段", candidate, limits.labelCharacters);
    }
  }

  for (const item of revision.facts.fieldProvenance) {
    assertReportTextCapacity("provenance 字段", item.field, limits.labelCharacters);
    assertReportTextCapacity("provenance 算法标识", item.algorithmId, limits.identifierCharacters);
    assertReportStringCollectionCapacity(
      "provenance 来源引用",
      item.sourceRefs,
      limits.nestedEntries,
      limits.labelCharacters
    );
    assertReportTextCapacity("provenance 备注", item.note, limits.bodyCharacters);
  }

  for (const note of input.researchNotes) {
    assertReportTextCapacity("研究笔记正文", note.body, limits.bodyCharacters);
    assertJoinedReportTextCapacity("研究笔记标签", note.tags, "、", limits.bodyCharacters);
    assertReportStringCollectionCapacity(
      "研究笔记来源引用",
      note.sourceRefs,
      limits.nestedEntries,
      limits.labelCharacters
    );
  }
  for (const event of input.events) {
    assertReportTextCapacity("事件标题", event.title, limits.labelCharacters);
    assertReportTextCapacity("事件正文", event.body, limits.bodyCharacters);
    assertJoinedReportTextCapacity("事件标签", event.tags, "、", limits.bodyCharacters);
    assertReportStringCollectionCapacity(
      "事件来源引用",
      event.sourceRefs,
      limits.nestedEntries,
      limits.labelCharacters
    );
    if (event.transitNodeRef) {
      assertReportTextCapacity(
        "事件运限节点",
        JSON.stringify(event.transitNodeRef),
        limits.bodyCharacters
      );
    }
  }

  for (const citation of input.citations) {
    assertReportTextCapacity("引用正文", citation.quote, limits.bodyCharacters);
    assertReportTextCapacity("引用批注", citation.annotation, limits.bodyCharacters);
    assertReportTextCapacity("引用决定说明", citation.decisionNote, limits.bodyCharacters);
  }
  for (const document of input.knowledgeDocuments) {
    assertReportTextCapacity("引用资料标题", document.title, limits.labelCharacters);
    assertReportTextCapacity("引用资料作者", document.author, limits.labelCharacters);
    assertReportTextCapacity("引用资料版本", document.edition, limits.labelCharacters);
  }
  for (const sourceRights of input.sourceRights) {
    assertReportTextCapacity("引用来源网址", sourceRights.source.sourceUrl, limits.labelCharacters);
    assertReportTextCapacity("引用出版方", sourceRights.source.publisher, limits.labelCharacters);
  }
}

function assertParsedBuilderAggregateCapacity(input: ParsedSingleChartReportInput): void {
  const displayedDocumentMetadata = input.knowledgeDocuments.map((document) => [
    document.id,
    document.title,
    document.author,
    document.edition,
    document.contentHash
  ]);
  const presentationSources = [
    input.caseRecord,
    input.revision,
    input.revisionCalculationReceipts,
    input.researchNotes,
    input.events,
    input.eventTimeMigrationReceipts,
    input.citations,
    displayedDocumentMetadata,
    input.sourceRights
  ];
  if (!hasSingleChartReportAggregateTextCapacity(presentationSources)) {
    throw new Error(
      `单盘报告 aggregate 输入文本超过 ${SINGLE_CHART_REPORT_PRESENTATION_LIMITS.aggregateCodePoints} Unicode code points 展示容量`
    );
  }
}

async function validateAndSort(rawInput: SingleChartReportInput) {
  assertRawInputCollectionCapacity(rawInput);
  const parsedInput = singleChartReportInputSchema.parse(rawInput);
  assertParsedBuilderAggregateCapacity(parsedInput);
  assertParsedBuilderPresentationCapacity(parsedInput);
  const input = {
    ...parsedInput,
    revision: await verifyRevisionRecordIntegrity(parsedInput.revision)
  };
  if (input.revision.caseId !== input.caseRecord.id) throw new Error("指定修订不属于当前案例");
  if (input.revision.revisionNumber > input.caseRecord.revisionCount) throw new Error("修订序号超过案例修订计数");
  if (
    input.revisionCalculationReceiptLedgerStatus === "schema_unavailable"
    && input.revisionCalculationReceipts.length > 0
  ) {
    throw new Error("计算收据账本架构不可用时不得夹带 Revision 计算收据");
  }

  assertUniqueIds(input.researchNotes, "ResearchNote");
  assertUniqueIds(input.events, "Event");
  assertUniqueIds(input.citations, "Citation");
  assertUniqueIds(input.knowledgeDocuments, "KnowledgeDocument");

  const notes = input.researchNotes.filter((note) => {
    if (note.caseId !== input.caseRecord.id) throw new Error(`ResearchNote ${note.id} 不属于当前案例`);
    if (!noteRelevant(note, input.revision.id)) throw new Error(`ResearchNote ${note.id} 不属于当前单盘快照`);
    return true;
  }).sort((left, right) => compareText(left.createdAt, right.createdAt) || compareText(left.id, right.id));
  const relevantEvents = input.events.filter((event) => {
    if (event.caseId !== input.caseRecord.id) throw new Error(`Event ${event.id} 不属于当前案例`);
    if (!eventRelevant(event, input.revision.id)) throw new Error(`Event ${event.id} 不属于当前单盘快照`);
    return true;
  });
  const verifiedEvents = await Promise.all(relevantEvents.map(async (event) => ({
    event,
    verification: await verifyEventForResearchExportWithBundledArtifact(event)
  })));
  verifiedEvents.sort((left, right) =>
    compareVerifiedEventsForResearchExport(left.verification, right.verification)
  );
  const events = verifiedEvents.map(({ event }) => event);
  const eventVerifications = new Map(verifiedEvents.map(({ event, verification }) => [
    event.id,
    verification
  ]));
  const eventTimeMigrationReceipts = await validateAndSortEventTimeMigrations(
    input.eventTimeMigrationReceipts,
    events
  );

  const noteIds = new Set(notes.map((note) => note.id));
  const eventIds = new Set(events.map((event) => event.id));
  const documentVerifierEntries = await Promise.all(input.knowledgeDocuments.map(async (knowledgeDocument) => {
    const verifier = await createKnowledgeDocumentCitationIntegrityVerifier(knowledgeDocument);
    return [knowledgeDocument.id, verifier] as const;
  }));
  const documentVerifiers = new Map(documentVerifierEntries);
  const documents = new Map(documentVerifierEntries.map(([documentId, verifier]) => [
    documentId,
    verifier.document
  ] as const));
  const rights = new Map<string, SourceRightsRecord>();
  for (const record of input.sourceRights) {
    if (rights.has(record.documentId)) throw new Error(`SourceRights 重复：${record.documentId}`);
    rights.set(record.documentId, record);
  }

  const verifiedCitations = input.citations.map((citation) => {
    const verifier = documentVerifiers.get(citation.documentId);
    if (!verifier) throw new Error(`Citation 缺少资料：${citation.id}`);
    return verifier.verifyCitation(citation);
  });
  const requiredDocumentIds = new Set<string>();
  for (const citation of verifiedCitations) {
    const relevance = citation.targets.map((target) => targetRelevant(
      target,
      input.caseRecord.id,
      input.revision.id,
      input.revision.facts,
      noteIds,
      eventIds
    ));
    if (!relevance.some(Boolean)) throw new Error(`Citation ${citation.id} 与当前单盘无关`);
    requiredDocumentIds.add(citation.documentId);
  }
  if (documents.size !== requiredDocumentIds.size || rights.size !== requiredDocumentIds.size) {
    throw new Error("引用、资料与来源权利集合必须一一对应且不夹带无关记录");
  }
  for (const documentId of requiredDocumentIds) {
    const knowledgeDocument = documents.get(documentId);
    const sourceRights = rights.get(documentId);
    if (!knowledgeDocument || !sourceRights) throw new Error(`引用资料或来源权利缺失：${documentId}`);
    if (sourceRights.documentContentHash !== knowledgeDocument.contentHash) throw new Error(`来源权利正文哈希失配：${documentId}`);
    if ((sourceRights.origin === "user_import") !== (knowledgeDocument.recordType === "user_knowledge_document")) {
      throw new Error(`来源权利 origin 与资料类型不一致：${documentId}`);
    }
  }
  const citations = [...verifiedCitations].sort((left, right) => {
    const rank = { verified: 0, user_candidate: 1, rejected: 2 } as const;
    return rank[left.status] - rank[right.status]
      || compareText(left.targetKeys.join("|"), right.targetKeys.join("|"))
      || left.locator.startLine - right.locator.startLine
      || compareText(left.id, right.id);
  });
  return {
    input,
    notes,
    events,
    eventVerifications,
    eventTimeMigrationReceipts,
    citations,
    documents,
    rights,
    noteIds,
    eventIds
  };
}

function researchNoteEntry(note: ResearchNoteRecord) {
  const anchor = note.anchor.kind === "case"
    ? "整个案例"
    : note.anchor.kind === "revision"
      ? `修订 ${note.anchor.revisionId}`
      : `修订 ${note.anchor.revisionId} / ${note.anchor.pillar}.${note.anchor.field}`;
  return {
    reference: note.id,
    title: anchor,
    meta: [row("状态", note.lifecycle), row("标签", note.tags.join("、")), row("编辑版本", note.editVersion)],
    body: note.body || "—",
    sourceRefs: note.sourceRefs
  };
}

function eventEntry(
  event: StoredEventRecord,
  verification: VerifiedEventForResearchExport
) {
  const date = event.datePrecision === "unknown"
    ? "未知"
    : event.endDate && event.endDate !== event.startDate
      ? `${value(event.startDate)} 至 ${event.endDate}`
      : value(event.startDate);
  const time = eventTimeExportDetails(verification);
  const timeRows = time.kind === "zoned_minute"
    ? [
        row("时间上下文", time.kind),
        row("IANA 时区", value(time.timeZone)),
        row("TZDB", value(time.tzdbVersion)),
        row("起始 DST 解析", value(time.start?.dstResolution)),
        row("起始 UTC 偏移", value(time.start?.utcOffset)),
        row("起始规范 UTC", value(time.start?.canonicalUtc)),
        ...(time.end ? [
          row("结束 DST 解析", time.end.dstResolution),
          row("结束 UTC 偏移", time.end.utcOffset),
          row("结束规范 UTC", time.end.canonicalUtc)
        ] : [])
      ]
    : [row("时间上下文", time.kind), row("时间说明", time.notice)];
  return {
    reference: event.id,
    title: event.title,
    meta: [
      row("日期", `${date}（${event.datePrecision}）`),
      ...timeRows,
      row("反馈", event.feedback),
      row("状态", event.deletedAt ? "已删除" : "有效"),
      row("运限节点", event.transitNodeRef ? `${event.transitNodeRef.nodeType}:${event.transitNodeRef.nodeId}` : "—"),
      row("标签", event.tags.join("、"))
    ],
    body: event.body || "—",
    sourceRefs: event.sourceRefs
  };
}

function eventTimeDerivationEntry(
  receipt: StoredEventTimeMigrationReceipt,
  eventsById: ReadonlyMap<string, StoredEventRecord>,
  eventVerifications: ReadonlyMap<string, VerifiedEventForResearchExport>
) {
  const target = eventsById.get(receipt.target.recordId);
  if (!target) throw new Error(`事件时间迁移目标不存在：${receipt.target.recordId}`);
  const verification = eventVerifications.get(target.id);
  if (!verification) throw new Error(`事件时间迁移目标缺少 exact replay 凭据：${target.id}`);
  const targetTime = eventTimeExportDetails(verification);
  const interpretation = receipt.interpretation.kind === "calendar_date"
    ? [
        row("解释类型", "calendar_date"),
        row("时间说明", targetTime.notice)
      ]
    : [
        row("解释类型", "zoned_minute"),
        row("IANA 时区", receipt.interpretation.timeZone),
        row("TZDB", targetTime.tzdbVersion),
        row("起始 DST 选择", receipt.interpretation.startDisambiguation),
        row("起始 DST 解析", targetTime.start?.dstResolution),
        row("起始 UTC 偏移", targetTime.start?.utcOffset),
        row("起始规范 UTC", targetTime.start?.canonicalUtc),
        row("结束 DST 选择", receipt.interpretation.endDisambiguation),
        row("结束 DST 解析", targetTime.end?.dstResolution),
        row("结束 UTC 偏移", targetTime.end?.utcOffset),
        row("结束规范 UTC", targetTime.end?.canonicalUtc)
      ];
  return {
    reference: receipt.id,
    createdAt: receipt.createdAt,
    authorization: receipt.authorization.kind,
    sourceReference: receipt.source.recordId,
    targetReference: receipt.target.recordId,
    sourceSnapshotDigest: receipt.source.snapshotDigest,
    targetSnapshotDigest: receipt.target.snapshotDigest,
    lineage: [
      row("案例", receipt.source.snapshot.caseId),
      row("修订", receipt.source.snapshot.revisionId),
      row("运限节点", receipt.source.snapshot.transitNodeRef ? JSON.stringify(receipt.source.snapshot.transitNodeRef) : null),
      row("日期精度", receipt.source.snapshot.datePrecision),
      row("起始墙上时间", receipt.source.snapshot.startDate),
      row("结束墙上时间", receipt.source.snapshot.endDate)
    ],
    interpretation
  };
}

type ReportCalculationSource = z.infer<typeof reportCalculationSourceSchema>;
type ReportInterpretationEvidence = z.infer<typeof reportInterpretationEvidenceSchema>;
type ReportInterpretationStatement = ReportInterpretationEvidence["statements"][number];
type ReportInterpretationMechanicalAdmission = ReportInterpretationEvidence["sourceBindings"][number]["mechanicalAdmission"];
type ReportInterpretationAdmissionSummary = ReportInterpretationEvidence["admissionSummary"];
type DownstreamComponentKey = typeof REPORT_CALCULATION_COMPONENTS[number]["key"];

const REPORT_INTERPRETATION_BOUNDARY: ReportInterpretationEvidence["boundary"] = Object.freeze({
  referenceResolutionEstablishesSemanticTruth: false,
  citationTargetEstablishesSourceIdentity: false,
  expertTruthClaimed: false,
  scientificValidityClaimed: false,
  formalActivationAllowed: false,
  publicReleaseAuthorized: false,
  authenticityClaimed: false,
  sourceTextIncluded: false,
  locatorReviewEstablishesExactQuote: false,
  locatorVerificationEstablishesContentIdentity: false,
  sourceRegistrationEstablishesDistributionRights: false,
  admissionLedgerCopiesSourceText: false,
  citationReviewEstablishesSemanticTruth: false,
  rightsReviewEstablishesSemanticTruth: false,
  reviewerIdentityVerified: false,
  reviewerIndependenceVerified: false,
  overallGoodBad: null,
  result: null
});

function reportInterpretationSourceLocatorCoverage(
  claim: BaziInterpretedClaim,
  bindingById: ReadonlyMap<string, BaziStrengthClaimSourceBinding>
): ReportInterpretationStatement["sourceLocatorCoverage"] {
  if (claim.sourceBindingIds.length === 0) return "not_applicable";
  return reportInterpretationRegistryLocatorVerifiedBindingIds(claim, bindingById).length === claim.sourceBindingIds.length
    ? "verified"
    : "incomplete";
}

function reportInterpretationRegistryLocatorVerifiedBindingIds(
  claim: BaziInterpretedClaim,
  bindingById: ReadonlyMap<string, BaziStrengthClaimSourceBinding>
): string[] {
  const bindings = claim.sourceBindingIds.map((id) => bindingById.get(id));
  if (bindings.some((binding) => binding === undefined)) {
    throw new Error(`解读证据 Envelope 主张引用未知来源定位：${claim.claimId}`);
  }
  return claim.sourceBindingIds.filter(
    (id) => bindingById.get(id)?.exactLocator.verificationStatus === "verified"
  );
}

function reportInterpretationStatement(
  claim: BaziInterpretedClaim,
  bindingById: ReadonlyMap<string, BaziStrengthClaimSourceBinding>
): ReportInterpretationStatement {
  return {
    statementId: claim.claimId,
    order: claim.order,
    kind: claim.kind,
    text: claim.displayStatus === "withheld" ? null : claim.text,
    classification: claim.classification,
    displayStatus: claim.displayStatus,
    factIds: [...claim.factIds],
    ruleIds: [...claim.ruleIds],
    sourceBindingIds: [...claim.sourceBindingIds],
    registryLocatorVerifiedBindingIds: reportInterpretationRegistryLocatorVerifiedBindingIds(claim, bindingById),
    stabilityAssessmentIds: [...claim.stabilityAssessmentIds],
    missingEvidence: [...claim.missingEvidence],
    conflictIds: [...claim.conflictIds],
    rationale: claim.rationale,
    sourceLocatorCoverage: reportInterpretationSourceLocatorCoverage(claim, bindingById),
    exactCanonicalRendererMatch: true
  };
}

function reportInterpretationSource(
  source: BaziStrengthClaimSource
): ReportInterpretationEvidence["sources"][number] {
  return {
    sourceId: source.sourceId,
    order: source.order,
    sourceType: source.sourceType,
    title: source.title,
    editionOrCarrier: source.editionOrCarrier,
    url: source.url,
    stableRevision: source.stableRevision,
    registryVerificationStatus: source.verificationStatus,
    workRightsStatus: source.workRightsStatus,
    carrierRightsStatus: source.carrierRightsStatus,
    usageBoundary: source.usageBoundary,
    sourceRightsRecordStatus: "binding_scoped",
    expertTruthClaimed: false,
    scientificValidityClaimed: false
  };
}

function reportInterpretationLocatorVerificationScope(
  binding: Pick<BaziStrengthClaimSourceBinding, "sourceType" | "exactLocator">
): ReportInterpretationEvidence["sourceBindings"][number]["locator"]["verificationScope"] {
  if (binding.exactLocator.verificationStatus === "pending_manual_textual_verification") {
    return "pending_manual_textual_verification";
  }
  return binding.sourceType === "engineering_contract"
    ? "repository_symbol_registration_only"
    : "pinned_carrier_heading_only";
}

function reportInterpretationAssertionFamilies(
  statements: readonly ReportInterpretationStatement[]
): ReportInterpretationEvidence["assertionFamilies"] {
  return REPORT_INTERPRETATION_STATEMENT_KINDS.map((kind) => {
    const family = statements.filter((statement) => statement.kind === kind);
    return {
      kind,
      total: family.length,
      displayable: family.filter((statement) => statement.displayStatus !== "withheld").length,
      withheld: family.filter((statement) => statement.displayStatus === "withheld").length
    };
  });
}

function reportInterpretationSourceBindingStatic(
  binding: BaziStrengthClaimSourceBinding
): Omit<ReportInterpretationEvidence["sourceBindings"][number], "mechanicalAdmission"> {
  return {
    bindingId: binding.bindingId,
    evidenceSubjectId: binding.evidenceSubjectId,
    order: binding.order,
    sourceId: binding.sourceId,
    sourceType: binding.sourceType,
    evidenceRole: binding.evidenceRole,
    locator: {
      kind: binding.exactLocator.kind,
      value: binding.exactLocator.value,
      registryVerificationStatus: binding.exactLocator.verificationStatus,
      verificationScope: reportInterpretationLocatorVerificationScope(binding),
      contentSha256: null
    },
    parameterSupport: binding.parameterSupport,
    supports: binding.supports,
    doesNotSupport: [...binding.doesNotSupport]
  };
}

function citationTargetsEvidenceSubject(
  citation: Pick<CitationRecord, "targets">,
  evidenceSubjectId: string
): boolean {
  return citation.targets.some((target) => (
    target.kind === "evidence_subject" && target.subjectId === evidenceSubjectId
  ));
}

function reportInterpretationMechanicalAdmission(
  binding: BaziStrengthClaimSourceBinding,
  citations: readonly Readonly<CitationRecord>[],
  rights: ReadonlyMap<string, SourceRightsRecord>,
  citationReferenceById: ReadonlyMap<string, string>
): ReportInterpretationMechanicalAdmission {
  const matching = citations.filter((citation) => (
    citationTargetsEvidenceSubject(citation, binding.evidenceSubjectId)
  ));
  const referencesForStatus = (status: CitationRecord["status"]): string[] => matching
    .filter((citation) => citation.status === status)
    .map((citation) => {
      const reference = citationReferenceById.get(citation.id);
      if (!reference) throw new Error(`Citation 缺少报告内引用号：${citation.id}`);
      return reference;
    });
  const candidateCitationReferences = referencesForStatus("user_candidate");
  const verifiedCitationReferences = referencesForStatus("verified");
  const rejectedCitationReferences = referencesForStatus("rejected");
  const redistributableVerifiedCitationReferences = matching
    .filter((citation) => {
      if (citation.status !== "verified") return false;
      const sourceRights = rights.get(citation.documentId);
      return Boolean(sourceRights
        && sourceRights.documentContentHash === citation.documentContentHash
        && isRedistributableSourceRights(sourceRights));
    })
    .map((citation) => {
      const reference = citationReferenceById.get(citation.id);
      if (!reference) throw new Error(`Citation 缺少报告内引用号：${citation.id}`);
      return reference;
    });
  return {
    sourceIdentityStatus: "not_assessed",
    citationReviewState: verifiedCitationReferences.length > 0
      ? "verified_present"
      : candidateCitationReferences.length > 0
        ? "candidate_only"
        : rejectedCitationReferences.length > 0
          ? "rejected_only"
          : "no_citation",
    redistributionState: verifiedCitationReferences.length === 0
      ? "not_applicable_no_verified"
      : redistributableVerifiedCitationReferences.length === 0
        ? "no_verified_source_redistributable"
        : redistributableVerifiedCitationReferences.length === verifiedCitationReferences.length
          ? "all_verified_sources_redistributable"
          : "some_verified_sources_redistributable",
    candidateCitationReferences,
    verifiedCitationReferences,
    rejectedCitationReferences,
    redistributableVerifiedCitationReferences
  };
}

function reportInterpretationSourceBinding(
  binding: BaziStrengthClaimSourceBinding,
  mechanicalAdmission: ReportInterpretationMechanicalAdmission
): ReportInterpretationEvidence["sourceBindings"][number] {
  return {
    ...reportInterpretationSourceBindingStatic(binding),
    mechanicalAdmission
  };
}

function reportInterpretationAdmissionSummary(
  sourceBindings: readonly ReportInterpretationEvidence["sourceBindings"][number][],
  citations: readonly Readonly<CitationRecord>[],
  rights: ReadonlyMap<string, SourceRightsRecord>,
  anonymized: boolean
): ReportInterpretationAdmissionSummary {
  if (anonymized) {
    return {
      visibility: "redacted",
      sourceTextCopiedIntoAdmissionLedger: false
    };
  }
  const subjectIds = new Set(sourceBindings.map((binding) => binding.evidenceSubjectId));
  const matchingCitations = citations.filter((citation) => citation.targets.some((target) => (
    target.kind === "evidence_subject" && subjectIds.has(target.subjectId)
  )));
  const structuredCitations = matchingCitations.filter((citation) => citation.status !== "rejected");
  const matchingDocumentIds = new Set(matchingCitations.map((citation) => citation.documentId));
  const matchingRightsDocumentIds = new Set(matchingCitations.flatMap((citation) => (
    rights.has(citation.documentId) ? [citation.documentId] : []
  )));
  const bindingsWithNonRejectedCitation = sourceBindings.filter((binding) => (
    binding.mechanicalAdmission.candidateCitationReferences.length > 0
      || binding.mechanicalAdmission.verifiedCitationReferences.length > 0
  )).length;
  const allMatchingSourcesRedistributable = matchingCitations.length > 0
    && matchingCitations.every((citation) => {
      const sourceRights = rights.get(citation.documentId);
      return Boolean(sourceRights
        && sourceRights.documentContentHash === citation.documentContentHash
        && isRedistributableSourceRights(sourceRights));
    });
  return {
    visibility: "full",
    evaluationStatus: "evaluated",
    bindingsTotal: sourceBindings.length,
    bindingsWithNonRejectedCitation,
    bindingsWithVerifiedCitation: sourceBindings.filter((binding) => (
      binding.mechanicalAdmission.verifiedCitationReferences.length > 0
    )).length,
    bindingsWithRedistributableVerifiedCitation: sourceBindings.filter((binding) => (
      binding.mechanicalAdmission.redistributableVerifiedCitationReferences.length > 0
    )).length,
    citationRecords: {
      matching: matchingCitations.length,
      structured: structuredCitations.length,
      candidate: matchingCitations.filter((citation) => citation.status === "user_candidate").length,
      verified: matchingCitations.filter((citation) => citation.status === "verified").length,
      rejected: matchingCitations.filter((citation) => citation.status === "rejected").length
    },
    knowledgeDocumentsBound: matchingDocumentIds.size,
    sourceRightsRecordsBound: matchingRightsDocumentIds.size,
    sourceTextCopiedIntoAdmissionLedger: false,
    structuredCitationCoverage: bindingsWithNonRejectedCitation === 0
      ? "none"
      : bindingsWithNonRejectedCitation === sourceBindings.length
        ? "complete"
        : "partial",
    distributionRightsState: matchingCitations.length === 0
      ? "no_matching_source_text"
      : allMatchingSourcesRedistributable
        ? "all_matching_source_text_redistributable"
        : "contains_nonredistributable_source_text"
  };
}

function reportInterpretationCoverage(
  statements: readonly ReportInterpretationStatement[],
  assertionFamilies: readonly ReportInterpretationEvidence["assertionFamilies"][number][],
  sourceBindings: readonly ReportInterpretationEvidence["sourceBindings"][number][],
  sources: readonly ReportInterpretationEvidence["sources"][number][]
): ReportInterpretationEvidence["coverage"] {
  const referencedBindingIds = new Set(statements.flatMap((statement) => statement.sourceBindingIds));
  const registryVerifiedBindingIds = new Set(statements.flatMap(
    (statement) => statement.registryLocatorVerifiedBindingIds
  ));
  const referencedSourceIds = new Set(sourceBindings.map((binding) => binding.sourceId));
  return {
    statementsTotal: statements.length,
    displayable: statements.filter((statement) => statement.displayStatus !== "withheld").length,
    withheld: statements.filter((statement) => statement.displayStatus === "withheld").length,
    assertionFamilies: assertionFamilies.filter((family) => family.total > 0).length,
    referencedSourceBindings: referencedBindingIds.size,
    registryLocatorVerifiedBindings: registryVerifiedBindingIds.size,
    referencedSources: referencedSourceIds.size,
    pinnedRevisionSources: sources.filter(
      (source) => referencedSourceIds.has(source.sourceId) && source.stableRevision !== null
    ).length,
    sourceTextsIncluded: 0
  };
}

async function buildReportInterpretationEvidence(
  revision: ParsedSingleChartReportInput["revision"],
  citations: readonly Readonly<CitationRecord>[],
  rights: ReadonlyMap<string, SourceRightsRecord>,
  citationReferenceById: ReadonlyMap<string, string>,
  anonymized: boolean
): Promise<ReportInterpretationEvidence> {
  const includeHour = revision.input.timePrecision === "exact_minute"
    || revision.input.timePrecision === "exact_second";
  if (revision.timeCalibration.dstStatus === "unresolved") {
    return {
      status: "withheld",
      reason: "dst_unresolved",
      scope: REPORT_INTERPRETATION_EVIDENCE_SCOPE,
      includeHour,
      envelopeProfileVersion: BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE.projectionVersion,
      envelopeContentVersion: BAZI_INTERPRETATION_EVIDENCE_ENVELOPE_PROFILE.contentVersion,
      sourceRegistry: REPORT_INTERPRETATION_SOURCE_REGISTRY,
      payloadSha256: null,
      statements: [],
      assertionFamilies: [],
      coverage: {
        statementsTotal: 0,
        displayable: 0,
        withheld: 0,
        assertionFamilies: 0,
        referencedSourceBindings: 0,
        registryLocatorVerifiedBindings: 0,
        referencedSources: 0,
        pinnedRevisionSources: 0,
        sourceTextsIncluded: 0
      },
      admissionSummary: anonymized
        ? {
            visibility: "redacted",
            sourceTextCopiedIntoAdmissionLedger: false
          }
        : {
            visibility: "full",
            evaluationStatus: "not_evaluated_interpretation_withheld",
            bindingsTotal: 0,
            bindingsWithNonRejectedCitation: 0,
            bindingsWithVerifiedCitation: 0,
            bindingsWithRedistributableVerifiedCitation: 0,
            citationRecords: {
              matching: 0,
              structured: 0,
              candidate: 0,
              verified: 0,
              rejected: 0
            },
            knowledgeDocumentsBound: 0,
            sourceRightsRecordsBound: 0,
            sourceTextCopiedIntoAdmissionLedger: false,
            structuredCitationCoverage: "none",
            distributionRightsState: "no_matching_source_text"
          },
      sources: [],
      sourceBindings: [],
      boundary: REPORT_INTERPRETATION_BOUNDARY
    };
  }

  const interpretation = interpretBaziChart(revision.facts, { includeHour });
  const envelope: BaziInterpretationEvidenceEnvelope = await buildBaziInterpretationEvidenceEnvelope({
    revision,
    includeHour,
    interpretation,
    strengthSensitivity: buildStrengthSensitivityReview(interpretation)
  });
  const bindingById = new Map(envelope.sourceBindings.map((binding) => [binding.bindingId, binding] as const));
  const statements = envelope.claims.map((claim) => reportInterpretationStatement(claim, bindingById));
  const referencedBindingIds = new Set(statements.flatMap((statement) => statement.sourceBindingIds));
  if (referencedBindingIds.size !== envelope.sourceBindings.length
    || envelope.sourceBindings.some((binding) => !referencedBindingIds.has(binding.bindingId))) {
    throw new Error("解读证据 Envelope 的 closed-world 主张必须覆盖完整来源定位账");
  }
  const referencedSourceIds = new Set([...referencedBindingIds].map((bindingId) => {
    const binding = bindingById.get(bindingId);
    if (!binding) throw new Error("解读证据 Envelope 主张引用了 closed-world 之外的来源定位");
    return binding.sourceId;
  }));
  if (referencedSourceIds.size !== envelope.sources.length
    || envelope.sources.some((source) => !referencedSourceIds.has(source.sourceId))) {
    throw new Error("解读证据 Envelope 的 closed-world 来源定位必须覆盖完整来源注册表");
  }
  const sources = envelope.sources.map(reportInterpretationSource);
  const sourceBindings = envelope.sourceBindings.map((binding) => reportInterpretationSourceBinding(
    binding,
    reportInterpretationMechanicalAdmission(binding, citations, rights, citationReferenceById)
  ));
  const assertionFamilies = reportInterpretationAssertionFamilies(statements);
  const coverage = reportInterpretationCoverage(statements, assertionFamilies, sourceBindings, sources);
  const admissionSummary = reportInterpretationAdmissionSummary(sourceBindings, citations, rights, anonymized);
  return {
    status: "available",
    reason: null,
    scope: REPORT_INTERPRETATION_EVIDENCE_SCOPE,
    includeHour,
    envelopeProfileVersion: envelope.profile.projectionVersion,
    envelopeContentVersion: envelope.profile.contentVersion,
    sourceRegistry: REPORT_INTERPRETATION_SOURCE_REGISTRY,
    payloadSha256: anonymized ? null : envelope.integrity.payloadSha256,
    statements,
    assertionFamilies,
    coverage,
    admissionSummary,
    sources: anonymized ? [] : sources,
    sourceBindings: anonymized ? [] : sourceBindings,
    boundary: REPORT_INTERPRETATION_BOUNDARY
  };
}

function calculationComponentEntry(
  projection: RevisionDerivedReplayProjection,
  key: DownstreamComponentKey,
  label: "四柱关系" | "起运" | "Transit",
  anonymized: boolean
): ReportCalculationSource["components"][number] {
  const component = projection[key];
  return {
    key,
    label,
    status: component.status,
    executorId: "executorId" in component ? component.executorId ?? null : null,
    resultDigest: !anonymized && component.status === "projected"
      ? component.resultDigest
      : null
  };
}

function calculationSourceNotice(
  resolution: RevisionCalculationSourceResolution,
  ledgerStatus: "available" | "schema_unavailable"
): string {
  if (resolution.source === "explicit_projection") {
    return ledgerStatus === "available"
      ? "下游组件由列明的当前精确执行器按冻结 Revision 重新投影；未找到与本请求完全一致的历史收据，也未写入新收据。"
      : "当前发布代没有计算收据账本；下游组件仅由列明的当前精确执行器按冻结 Revision 重新投影，不代表历史输出。";
  }
  if (resolution.comparisonStatus === "matched") {
    return "下游组件取自已保存计算收据，内容与源 Revision 绑定已校验，并与收据列明的精确执行器复演一致；这仍不等于专家金标。";
  }
  if (resolution.comparisonStatus === "exact_executor_unavailable") {
    return "下游组件取自内容与源 Revision 绑定均已校验的计算收据，但安装包未保留至少一个所需精确执行器；不会回退当前版本，也不声明复演一致。";
  }
  return "下游组件取自已保存计算收据，但精确复演发现差异；报告保留差异状态，不会静默改用当前计算。";
}

async function buildReportCalculationSource(
  revision: unknown,
  receipts: readonly unknown[],
  ledgerStatus: "available" | "schema_unavailable",
  anonymized: boolean
): Promise<ReportCalculationSource> {
  let resolution: RevisionCalculationSourceResolution;
  try {
    resolution = await resolveRevisionCalculationSource(
      revision,
      receipts,
      { profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE }
    );
  } catch (cause) {
    if (!(cause instanceof RevisionDerivedReplayError)) throw cause;
    return {
      natalSource: "verified_stored_revision",
      downstreamSource: "not_evaluable",
      receiptLedgerStatus: ledgerStatus,
      storedHistoricalOutputCompared: false,
      comparisonStatus: "not_applicable",
      profileId: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE.profileId,
      projectionDigest: null,
      receiptReference: null,
      receiptDigest: null,
      requestFingerprint: null,
      capturedAt: null,
      expertEvidenceStatus: "not_verified",
      components: REPORT_CALCULATION_COMPONENTS.map((component) => ({
        key: component.key,
        label: component.label,
        status: "not_evaluable" as const,
        executorId: null,
        resultDigest: null
      })) as ReportCalculationSource["components"],
      notice: `冻结 Revision 的完整性已校验，但下游精确版本投影不可执行：${cause.message}`
    };
  }

  const receipt = resolution.receipt;
  return {
    natalSource: "verified_stored_revision",
    downstreamSource: resolution.source,
    receiptLedgerStatus: ledgerStatus,
    storedHistoricalOutputCompared: resolution.comparisonStatus === "exact_executor_unavailable"
      ? false
      : resolution.storedHistoricalOutputCompared,
    comparisonStatus: resolution.comparisonStatus,
    profileId: resolution.profileId,
    projectionDigest: anonymized ? null : resolution.projection.projectionDigest,
    receiptReference: !anonymized && receipt ? receipt.id : null,
    receiptDigest: !anonymized && receipt ? receipt.receiptDigest : null,
    requestFingerprint: !anonymized && receipt ? receipt.requestFingerprint : null,
    capturedAt: !anonymized && receipt ? receipt.createdAt : null,
    expertEvidenceStatus: "not_verified",
    components: REPORT_CALCULATION_COMPONENTS.map((component) =>
      calculationComponentEntry(resolution.projection, component.key, component.label, anonymized)
    ) as ReportCalculationSource["components"],
    notice: calculationSourceNotice(resolution, ledgerStatus)
  };
}

export async function buildSingleChartResearchReport(
  rawInput: SingleChartReportInput,
  rawOptions: SingleChartReportOptions = {}
): Promise<SingleChartResearchReport> {
  const { anonymized } = singleChartReportOptionsSchema.parse(rawOptions);
  const {
    input,
    notes,
    events,
    eventVerifications,
    eventTimeMigrationReceipts,
    citations,
    documents,
    rights,
    noteIds,
    eventIds
  } = await validateAndSort(rawInput);
  const revision = input.revision;
  const birth = revision.input;
  const calibration = revision.timeCalibration;
  const calendar = revision.facts.calendar;
  const profile = revision.ruleProfile;
  const calculationSource = await buildReportCalculationSource(
    revision,
    input.revisionCalculationReceipts,
    input.revisionCalculationReceiptLedgerStatus,
    anonymized
  );
  const citationReferenceById = new Map(citations.map((citation, index) => [
    citation.id,
    `C${index + 1}`
  ] as const));
  const documentReferenceById = new Map<string, string>();
  for (const citation of citations) {
    if (!documentReferenceById.has(citation.documentId)) {
      documentReferenceById.set(citation.documentId, `D${documentReferenceById.size + 1}`);
    }
  }
  const interpretationEvidence = await buildReportInterpretationEvidence(
    revision,
    citations,
    rights,
    citationReferenceById,
    anonymized
  );
  const revisionReference = anonymized ? `R${revision.revisionNumber}` : revision.id;
  const caseReference = anonymized ? "CASE" : input.caseRecord.id;
  const redacted = ANONYMOUS_REDACTION;
  const warningRows = anonymized
    ? [row("时间校准警告", `${calibration.warnings.length} 条（匿名模式不展开）`), row("计算警告", `${revision.manifest.warnings.length} 条（匿名模式不展开）`)]
    : [row("时间校准警告", calibration.warnings.join("；")), row("计算警告", revision.manifest.warnings.join("；"))];
  const layerLabels = Object.entries(profile.layers).filter(([, enabled]) => enabled).map(([key]) => key).join("、");
  const solarSummary = anonymized
    ? (calibration.solarTime ? "已计算（匿名模式移除位置推导细节）" : "未计算")
    : calibration.solarTime
      ? `${calibration.solarTime.modelId}；${calibration.solarTime.variants.map((variant) => `${variant.candidateChoice}:${variant.totalCorrectionMinutes.toFixed(2)} 分`).join("；")}`
      : "未计算";

  const eventsById = new Map(events.map((event) => [event.id, event]));
  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    formatVersion: SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.identity.formatVersion,
    kind: REPORT_KIND,
    anonymized,
    title: REPORT_TITLE,
    subtitle: `${calendar.solarText} · ${calendar.lunarText}`,
    caseLabel: anonymized ? "匿名案例" : input.caseRecord.alias,
    caseReference,
    revisionLabel: `第 ${revision.revisionNumber} 版${input.caseRecord.latestRevisionId === revision.id ? " · 最新" : " · 历史修订"}`,
    revisionReference,
    privacyWarning: REIDENTIFICATION_WARNING,
    previewNotice: REPORT_PREVIEW_NOTICE,
    suggestedFileBase: `hakimi-chart-r${revision.revisionNumber}-${anonymized ? "anonymous" : "full"}`,
    caseRows: [
      row("案例", anonymized ? "匿名案例" : input.caseRecord.alias),
      row("案例标识", caseReference),
      row("修订", `第 ${revision.revisionNumber} 版 / ${revisionReference}`),
      row("标签", anonymized ? redacted : input.caseRecord.tags.join("、")),
      row("案例备注", anonymized ? redacted : input.caseRecord.notes)
    ],
    birthRows: [
      row("输入历法", calendarLabel(birth.calendarType)),
      row("原始日期", `${birth.date}${birth.lunarLeapMonth ? "（闰月）" : ""}`),
      row("出生时间", `${value(birth.time)}（${birth.timePrecision}）`),
      row("时区", birth.timeZone),
      row("性别", sexLabel(birth.sex)),
      row("地点", anonymized ? redacted : birth.location.label),
      row("坐标", anonymized || birth.location.latitude === null || birth.location.longitude === null
        ? redacted
        : `${birth.location.latitude}, ${birth.location.longitude}`),
      row("来源备注", anonymized ? redacted : birth.sourceNote)
    ],
    calibrationRows: [
      row("民用公历日期", calibration.calendarResolution?.resolvedGregorianDate ?? "旧修订未保存"),
      row("历法算法", calibration.calendarResolution?.algorithmId ?? "旧修订未保存"),
      row("原始民用时间", calibration.originalCivilDateTime),
      row("排盘墙上时间", calibration.activeWallTime),
      row("UTC 瞬时点", calibration.utcInstant),
      row("UTC 偏移", calibration.utcOffset),
      row("DST 状态", calibration.dstStatus),
      row("时区解析", calibration.timeZoneResolution
        ? `${calibration.timeZoneResolution.status} / ${calibration.timeZoneResolution.policy}`
        : "旧修订未保存"),
      row("真太阳时预览", anonymized ? redacted : calibration.solarTimePreview),
      row("太阳时模型", solarSummary),
      ...warningRows
    ],
    ruleRows: [
      row("规则方案", anonymized ? `规则配置 ${profile.profileVersion}` : `${profile.label} ${profile.profileVersion}`),
      row("规则状态", profile.status),
      row("规则说明", anonymized ? redacted : profile.notice),
      row("界年 / 换月", `${profile.calendar.yearBoundary} / ${profile.calendar.monthBoundary}`),
      row("换日 / 子时日干", `${profile.calendar.dayBoundary} / ${profile.calendar.ziHourDayStemBasis}`),
      row("时柱时间基准", profile.calendar.hourBasis),
      row("DST 歧义", profile.calendar.dstAmbiguity),
      row("太阳时", `${profile.solarTime.enabled ? "启用" : "关闭"}；应用=${calibration.solarTimeApplied}`),
      row("起运", `${profile.luckCycle.directionRule} / ${profile.luckCycle.anchor} / ${profile.luckCycle.startAgeMethod}`),
      row("启用层", layerLabels),
      row("规则来源", anonymized ? redacted : profile.sourceRefs.join("；")),
      ...rulePackProvenanceRows(revision.rulePackBinding)
    ],
    integrityRows: [
      row("引擎", `${revision.manifest.engine.name} ${revision.manifest.engine.version}`),
      row("上游", `${revision.manifest.engine.upstreamName} ${revision.manifest.engine.upstreamVersion}`),
      row("时区库", revision.manifest.timeZoneDatabase ? `IANA ${revision.manifest.timeZoneDatabase.ianaVersion} · 固定工件` : "旧版浏览器 Intl · 具体版本未识别"),
      row("tzdb 数据摘要", revision.manifest.timeZoneDatabase?.dataSha256),
      row("时区解析器", revision.manifest.timeZoneDatabase ? `${revision.manifest.timeZoneDatabase.resolver.name} ${revision.manifest.timeZoneDatabase.resolver.version}` : undefined),
      row("规则摘要", revision.manifest.ruleProfileDigest),
      row("运限规则摘要", revision.manifest.luckCycleRuleDigest),
      row("结果哈希", anonymized ? redacted : revision.manifest.resultHash),
      row("支持范围", revision.manifest.supportedRangeStatus),
      row("验证状态", revision.manifest.verificationStatus),
      row("计算时间", anonymized ? redacted : revision.manifest.calculatedAt)
    ],
    calculationSource,
    interpretationEvidence,
    pillars: (["year", "month", "day", "hour"] as const).map((key) => {
      const pillar = revision.facts.pillars[key];
      return {
        key,
        label: pillar.label,
        ganZhi: pillar.ganZhi,
        stemTenGod: pillar.stemTenGod,
        hiddenStems: pillar.hiddenStems.join("、"),
        branchTenGods: pillar.branchTenGods.join("、"),
        wuXing: pillar.wuXing,
        nayin: pillar.nayin,
        twelveGrowth: pillar.twelveGrowth,
        xun: pillar.xun,
        voidBranches: pillar.voidBranches
      };
    }),
    provenance: [...revision.facts.fieldProvenance].sort((left, right) => compareText(left.field, right.field)).map((item, index) => ({
      field: anonymized && !CANONICAL_ANONYMOUS_PROVENANCE_FIELD.test(item.field)
        ? `字段 ${index + 1}（非标准路径已移除）`
        : item.field,
      kind: item.kind,
      algorithmId: anonymized ? redacted : item.algorithmId,
      verificationStatus: item.verificationStatus,
      sourceRefs: anonymized ? [] : item.sourceRefs,
      note: anonymized ? redacted : item.note
    })),
    researchNotes: anonymized ? [] : notes.map(researchNoteEntry),
    events: anonymized ? [] : events.map((event) => {
      const verification = eventVerifications.get(event.id);
      if (!verification) throw new Error(`Event 缺少 exact replay 凭据：${event.id}`);
      return eventEntry(event, verification);
    }),
    eventTimeDerivations: anonymized
      ? []
      : eventTimeMigrationReceipts.map((receipt) => eventTimeDerivationEntry(
          receipt,
          eventsById,
          eventVerifications
        )),
    citations: anonymized ? [] : citations.map((citation, index) => {
      const knowledgeDocument = documents.get(citation.documentId)!;
      const sourceRights: SourceRightsRecord = rights.get(citation.documentId)!;
      return {
        reference: `C${index + 1}`,
        status: citation.status,
        statusLabel: statusLabel(citation.status),
        targets: citation.targets
          .filter((target) => targetRelevant(
            target,
            input.caseRecord.id,
            revision.id,
            revision.facts,
            noteIds,
            eventIds
          ))
          .map(targetLabel),
        evidenceSubjectIds: [...new Set(citation.targets.flatMap((target) => (
          target.kind === "evidence_subject" && isSingleChartReportEvidenceSubjectId(target.subjectId)
            ? [target.subjectId]
            : []
        )))].sort(compareText),
        quote: citation.quote,
        annotation: citation.annotation,
        decisionNote: citation.decisionNote,
        reviewerCount: new Set(citation.reviewAttestations.map((item) => item.reviewerId)).size,
        locator: `${citation.locator.sectionId} · 第 ${citation.locator.startLine}-${citation.locator.endLine} 行`,
        source: {
          documentReference: documentReferenceById.get(citation.documentId)!,
          title: knowledgeDocument.title,
          author: knowledgeDocument.author,
          edition: knowledgeDocument.edition,
          contentHash: knowledgeDocument.contentHash,
          sourceUrl: sourceRights.source.sourceUrl ?? "",
          publisher: sourceRights.source.publisher,
          publicationYear: sourceRights.source.publicationYear?.toString() ?? "",
          origin: sourceRights.origin,
          rightsStatus: sourceRights.rights.status,
          workStatus: sourceRights.rights.workStatus,
          editionStatus: sourceRights.rights.editionStatus,
          distributionPolicy: sourceRights.rights.distributionPolicy,
          reviewStatus: sourceRights.review.status,
          redistributableSourceRights: isRedistributableSourceRights(sourceRights)
        }
      };
    }),
    redactions: anonymized ? [...ANONYMOUS_REDACTIONS] : []
  };
  const parsed = deepFreezeReportValue(singleChartResearchReportSchema.parse(report));
  registeredSingleChartResearchReportInstances.add(parsed);
  return parsed;
}

export async function validateSingleChartResearchReport(
  rawReport: unknown,
  rawInput: SingleChartReportInput,
  rawOptions: SingleChartReportOptions = {}
): Promise<SingleChartResearchReport> {
  const candidate = singleChartResearchReportSchema.parse(rawReport);
  const expected = await buildSingleChartResearchReport(rawInput, rawOptions);
  if (!hasExactJsonStructure(candidate, expected)) {
    throw new Error("单盘研究报告与当前已校验输入的规范重建结果不一致");
  }
  return expected;
}

function deepFreezeReportValue<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreezeReportValue(nested);
  }
  return Object.freeze(value);
}

function isDeepFrozenReportValue(value: unknown, visited = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== "object") return true;
  if (visited.has(value)) return true;
  if (!Object.isFrozen(value)) return false;
  visited.add(value);
  let descriptors: Record<PropertyKey, PropertyDescriptor>;
  try {
    descriptors = Object.getOwnPropertyDescriptors(value) as Record<PropertyKey, PropertyDescriptor>;
  } catch {
    return false;
  }
  return Reflect.ownKeys(descriptors).every((key) => {
    const descriptor = descriptors[key];
    return Boolean(descriptor && "value" in descriptor && isDeepFrozenReportValue(descriptor.value, visited));
  });
}

function assertRegisteredSingleChartResearchReport(reportInput: unknown): asserts reportInput is SingleChartResearchReport {
  if (reportInput === null
    || typeof reportInput !== "object"
    || !registeredSingleChartResearchReportInstances.has(reportInput as SingleChartResearchReport)
    || !isDeepFrozenReportValue(reportInput)) {
    throw new Error("单盘研究报告必须由当前模块构建或结合原始输入重新校验");
  }
}

function markdownEscape(value: string): string {
  return value.replace(/[\\`*_\[\]]/g, "\\$&");
}

function rowsToMarkdown(rows: Array<{ label: string; value: string }>): string[] {
  return rows.map((item) => `- ${markdownEscape(item.label)}：${markdownEscape(item.value)}`);
}

function calculationSourceMarkdownRows(source: SingleChartResearchReport["calculationSource"]): string[] {
  const downstreamLabel = source.downstreamSource === "stored_receipt"
    ? "已保存计算收据"
    : source.downstreamSource === "explicit_projection"
      ? "当前显式版本投影"
      : "当前不可计算";
  const rows = [
    row("本命来源", `已校验冻结 Revision（${source.natalSource}）`),
    row("下游来源", `${downstreamLabel}（${source.downstreamSource}）`),
    row("收据账本", source.receiptLedgerStatus),
    row("历史输出已比较", source.storedHistoricalOutputCompared ? "是" : "否"),
    row("精确复演", source.comparisonStatus),
    row("执行器 Profile", source.profileId),
    row("专家证据", source.expertEvidenceStatus),
    ...(source.projectionDigest ? [row("投影摘要", source.projectionDigest)] : []),
    ...(source.receiptReference ? [row("收据引用", source.receiptReference)] : []),
    ...(source.requestFingerprint ? [row("请求指纹", source.requestFingerprint)] : []),
    ...(source.receiptDigest ? [row("收据摘要", source.receiptDigest)] : []),
    ...(source.capturedAt ? [row("保存时间", source.capturedAt)] : []),
    row("边界说明", source.notice)
  ];
  return [
    ...rowsToMarkdown(rows),
    "",
    ...source.components.flatMap((component) => [
      `### ${markdownEscape(component.label)}`,
      "",
      ...rowsToMarkdown([
        row("组件", component.key),
        row("状态", component.status),
        row("执行器", component.executorId),
        ...(component.resultDigest ? [row("结果摘要", component.resultDigest)] : [])
      ]),
      ""
    ])
  ];
}

function interpretationEvidenceMarkdownRows(
  evidence: SingleChartResearchReport["interpretationEvidence"]
): string[] {
  const admissionRows = evidence.admissionSummary.visibility === "redacted"
    ? [row("机械准入摘要", "匿名模式已移除动态本地资料状态")]
    : [
        row("机械准入评估状态", evidence.admissionSummary.evaluationStatus),
        row("机械准入 binding 总数", evidence.admissionSummary.bindingsTotal),
        row("有非拒绝 Citation 的 binding", evidence.admissionSummary.bindingsWithNonRejectedCitation),
        row("有 verified Citation 的 binding", evidence.admissionSummary.bindingsWithVerifiedCitation),
        row("有可再分发 verified Citation 的 binding", evidence.admissionSummary.bindingsWithRedistributableVerifiedCitation),
        row("匹配 CitationRecord", evidence.admissionSummary.citationRecords.matching),
        row("结构化非拒绝 CitationRecord", evidence.admissionSummary.citationRecords.structured),
        row("candidate / verified / rejected", `${evidence.admissionSummary.citationRecords.candidate} / ${evidence.admissionSummary.citationRecords.verified} / ${evidence.admissionSummary.citationRecords.rejected}`),
        row("绑定 KnowledgeDocument", evidence.admissionSummary.knowledgeDocumentsBound),
        row("绑定 SourceRightsRecord", evidence.admissionSummary.sourceRightsRecordsBound),
        row("结构化引用覆盖", evidence.admissionSummary.structuredCitationCoverage),
        row("匹配来源正文分发权利", evidence.admissionSummary.distributionRightsState)
      ];
  const rows = [
    row("状态", evidence.status),
    ...(evidence.reason ? [row("留白原因", evidence.reason)] : []),
    row("范围", evidence.scope),
    row("纳入时柱", evidence.includeHour ? "是" : "否"),
    row("Envelope Profile", evidence.envelopeProfileVersion),
    row("内容版本", evidence.envelopeContentVersion),
    row("来源注册表 Profile", evidence.sourceRegistry.profileVersion),
    row("来源注册表内容版本", evidence.sourceRegistry.contentVersion),
    row("来源注册表摘要", evidence.sourceRegistry.registrySha256),
    ...(evidence.payloadSha256 ? [row("Envelope payload 摘要", evidence.payloadSha256)] : []),
    row("叙事句", evidence.coverage.statementsTotal),
    row("可显示", evidence.coverage.displayable),
    row("已留白", evidence.coverage.withheld),
    row("断言家族", evidence.coverage.assertionFamilies),
    row("引用来源定位", evidence.coverage.referencedSourceBindings),
    row("注册表 locator 已核", evidence.coverage.registryLocatorVerifiedBindings),
    row("引用来源", evidence.coverage.referencedSources),
    row("固定版本来源", evidence.coverage.pinnedRevisionSources),
    row("包含来源正文", evidence.coverage.sourceTextsIncluded),
    ...admissionRows,
    row("机械准入含义", "只核对 Citation、文档完整性与权利记录；不建立来源身份、术数语义或专家真值"),
    row("专家真值", evidence.boundary.expertTruthClaimed ? "已声明" : "未声明"),
    row("科学有效性", evidence.boundary.scientificValidityClaimed ? "已声明" : "未声明"),
    row("正式启用", evidence.boundary.formalActivationAllowed ? "允许" : "不允许"),
    row("公开发布", evidence.boundary.publicReleaseAuthorized ? "已授权" : "未授权"),
    row("解读证据来源账直接含正文", evidence.boundary.sourceTextIncluded ? "是" : "否"),
    row("locator 复核建立 exact quote", evidence.boundary.locatorReviewEstablishesExactQuote ? "是" : "否"),
    row("Citation target 认证注册来源身份", evidence.boundary.citationTargetEstablishesSourceIdentity ? "是" : "否"),
    row("locator 核验建立内容身份", evidence.boundary.locatorVerificationEstablishesContentIdentity ? "是" : "否"),
    row("来源登记建立分发权利", evidence.boundary.sourceRegistrationEstablishesDistributionRights ? "是" : "否"),
    row("准入账复制来源正文", evidence.boundary.admissionLedgerCopiesSourceText ? "是" : "否"),
    row("引用复核建立语义真值", evidence.boundary.citationReviewEstablishesSemanticTruth ? "是" : "否"),
    row("权利复核建立语义真值", evidence.boundary.rightsReviewEstablishesSemanticTruth ? "是" : "否"),
    row("复核者身份已验证", evidence.boundary.reviewerIdentityVerified ? "是" : "否"),
    row("复核者独立性已验证", evidence.boundary.reviewerIndependenceVerified ? "是" : "否")
  ];
  const lines = [...rowsToMarkdown(rows), ""];
  for (const statement of evidence.statements) {
    lines.push(
      `### ${markdownEscape(statement.statementId)} · ${markdownEscape(statement.kind)}`,
      "",
      `- 分级：${markdownEscape(statement.classification)}`,
      `- 显示状态：${markdownEscape(statement.displayStatus)}`,
      `- 来源定位覆盖：${markdownEscape(statement.sourceLocatorCoverage)}`
    );
    if (statement.displayStatus === "withheld") {
      lines.push(
        `- 缺失证据：${statement.missingEvidence.length ? statement.missingEvidence.map(markdownEscape).join("；") : "未列明"}`,
        ""
      );
      continue;
    }
    if (statement.text === null) throw new Error(`可显示解读证据句缺少规范正文：${statement.statementId}`);
    lines.push("", statement.text, "");
  }
  if (evidence.sources.length > 0) {
    lines.push("### 来源注册表快照", "");
    for (const source of evidence.sources) {
      lines.push(
        `#### ${markdownEscape(source.sourceId)}`,
        "",
        `- 顺序：${source.order}`,
        `- 类型：${markdownEscape(source.sourceType)}`,
        `- 标题：${markdownEscape(source.title)}`,
        `- 版本／载体：${markdownEscape(source.editionOrCarrier)}`,
        `- URL：${markdownEscape(source.url)}`,
        `- 固定版本：${source.stableRevision ? markdownEscape(source.stableRevision) : "未冻结"}`,
        `- 注册表核验：${markdownEscape(source.registryVerificationStatus)}`,
        `- 作品层权利声明：${markdownEscape(source.workRightsStatus)}`,
        `- 载体层权利声明：${markdownEscape(source.carrierRightsStatus)}`,
        `- SourceRightsRecord：${markdownEscape(source.sourceRightsRecordStatus)}`,
        `- 使用边界：${markdownEscape(source.usageBoundary)}`,
        `- 专家真值：${source.expertTruthClaimed ? "已声明" : "未声明"}`,
        `- 科学有效性：${source.scientificValidityClaimed ? "已声明" : "未声明"}`,
        ""
      );
    }
  }
  if (evidence.sourceBindings.length > 0) {
    lines.push("### 最小来源定位账", "");
    for (const binding of evidence.sourceBindings) {
      lines.push(
        `#### ${markdownEscape(binding.bindingId)}`,
        "",
        `- 顺序：${binding.order}`,
        `- 证据主题：${markdownEscape(binding.evidenceSubjectId)}`,
        `- 来源：${markdownEscape(binding.sourceId)} / ${markdownEscape(binding.sourceType)}`,
        `- 证据角色：${markdownEscape(binding.evidenceRole)}`,
        `- locator：${markdownEscape(binding.locator.kind)}=${markdownEscape(binding.locator.value)}`,
        `- 注册表 locator 状态：${markdownEscape(binding.locator.registryVerificationStatus)}`,
        `- locator 核验范围：${markdownEscape(binding.locator.verificationScope)}`,
        `- locator 内容摘要：${binding.locator.contentSha256 ?? "未绑定"}`,
        `- 参数支持：${markdownEscape(binding.parameterSupport)}`,
        `- 支持：${markdownEscape(binding.supports)}`,
        `- 不支持：${binding.doesNotSupport.map(markdownEscape).join("；")}`,
        `- Citation 复核状态：${markdownEscape(binding.mechanicalAdmission.citationReviewState)}`,
        `- Citation 所指资料是否就是注册来源：${markdownEscape(binding.mechanicalAdmission.sourceIdentityStatus)}`,
        `- verified 来源再分发状态：${markdownEscape(binding.mechanicalAdmission.redistributionState)}`,
        `- candidate：${binding.mechanicalAdmission.candidateCitationReferences.length ? binding.mechanicalAdmission.candidateCitationReferences.join("、") : "无"}`,
        `- verified：${binding.mechanicalAdmission.verifiedCitationReferences.length ? binding.mechanicalAdmission.verifiedCitationReferences.join("、") : "无"}`,
        `- rejected：${binding.mechanicalAdmission.rejectedCitationReferences.length ? binding.mechanicalAdmission.rejectedCitationReferences.join("、") : "无"}`,
        `- 可再分发 verified：${binding.mechanicalAdmission.redistributableVerifiedCitationReferences.length ? binding.mechanicalAdmission.redistributableVerifiedCitationReferences.join("、") : "无"}`,
        ""
      );
    }
  }
  return lines;
}

export function exportSingleChartResearchMarkdown(reportInput: SingleChartResearchReport): SingleChartMarkdownDocument {
  assertRegisteredSingleChartResearchReport(reportInput);
  const report = singleChartResearchReportSchema.parse(reportInput);
  const lines = [
    "---",
    `schemaVersion: "${report.schemaVersion}"`,
    `formatVersion: "${report.formatVersion}"`,
    `kind: "${report.kind}"`,
    "format: \"markdown\"",
    `anonymized: ${report.anonymized ? "true" : "false"}`,
    "---",
    "",
    `# ${report.title}`,
    "",
    `> ${report.previewNotice}`,
    `> ${report.privacyWarning}`,
    "",
    `- 导出模式：${report.anonymized ? "匿名" : "完整"}`,
    `- ${report.caseLabel} · ${report.revisionLabel}`,
    `- ${report.subtitle}`,
    "",
    "## 案例与出生输入",
    "",
    ...rowsToMarkdown([...report.caseRows, ...report.birthRows]),
    "",
    "## 四柱事实",
    "",
    "| 柱 | 干支 | 十神 | 藏干 | 支十神 | 五行 | 纳音 | 长生 | 旬 | 空亡 |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...report.pillars.map((pillar) => `| ${pillar.label} | ${pillar.ganZhi} | ${pillar.stemTenGod} | ${pillar.hiddenStems} | ${pillar.branchTenGods} | ${pillar.wuXing} | ${pillar.nayin} | ${pillar.twelveGrowth} | ${pillar.xun} | ${pillar.voidBranches} |`),
    "",
    "## 时间校准",
    "",
    ...rowsToMarkdown(report.calibrationRows),
    "",
    "## 规则与完整性",
    "",
    ...rowsToMarkdown([...report.ruleRows, ...report.integrityRows]),
    "",
    "## 下游计算来源",
    "",
    ...calculationSourceMarkdownRows(report.calculationSource),
    "## 旺衰工程候选解读证据",
    "",
    ...interpretationEvidenceMarkdownRows(report.interpretationEvidence),
    "## 字段来源与验证状态",
    ""
  ];
  for (const item of report.provenance) {
    lines.push(
      `### ${markdownEscape(item.field)}`,
      "",
      `- 类型：${markdownEscape(item.kind)}`,
      `- 算法：${markdownEscape(item.algorithmId)}`,
      `- 状态：${markdownEscape(item.verificationStatus)}`,
      `- 来源：${item.sourceRefs.length ? item.sourceRefs.map(markdownEscape).join("；") : "待补证据"}`,
      `- 说明：${markdownEscape(item.note || "—")}`,
      ""
    );
  }
  lines.push("## 研究笔记", "");
  if (!report.researchNotes.length) lines.push(report.anonymized ? "（匿名模式已移除）" : "—", "");
  for (const note of report.researchNotes) {
    lines.push(
      `### ${markdownEscape(note.title)}`,
      "",
      `- 记录标识：${markdownEscape(note.reference)}`,
      `- 旧来源字符串：${note.sourceRefs.length ? note.sourceRefs.map(markdownEscape).join("；") : "—"}`,
      ...rowsToMarkdown(note.meta),
      "",
      note.body,
      ""
    );
  }
  lines.push("## 真实事件", "");
  if (!report.events.length) lines.push(report.anonymized ? "（匿名模式已移除）" : "—", "");
  for (const event of report.events) {
    lines.push(
      `### ${markdownEscape(event.title)}`,
      "",
      `- Event ID：${markdownEscape(event.reference)}`,
      `- 旧来源字符串：${event.sourceRefs.length ? event.sourceRefs.map(markdownEscape).join("；") : "—"}`,
      ...rowsToMarkdown(event.meta),
      "",
      event.body,
      ""
    );
  }
  lines.push("## 事件时间迁移血缘", "");
  if (!report.eventTimeDerivations.length) {
    lines.push(report.anonymized ? "（匿名模式已移除）" : "—", "");
  }
  for (const migration of report.eventTimeDerivations) {
    lines.push(
      `### 迁移凭证 ${markdownEscape(migration.reference)}`,
      "",
      `- 显式授权：${markdownEscape(migration.authorization)}`,
      `- 创建时间：${markdownEscape(migration.createdAt)}`,
      `- 源 Event：${markdownEscape(migration.sourceReference)}`,
      `- 目标 Event：${markdownEscape(migration.targetReference)}`,
      `- 源快照摘要：${markdownEscape(migration.sourceSnapshotDigest)}`,
      `- 目标快照摘要：${markdownEscape(migration.targetSnapshotDigest)}`,
      "",
      "#### 冻结研究血缘",
      "",
      ...rowsToMarkdown(migration.lineage),
      "",
      "#### 显式时间解释",
      "",
      ...rowsToMarkdown(migration.interpretation),
      ""
    );
  }
  lines.push("## 结构化引用与反证", "");
  if (!report.citations.length) lines.push(report.anonymized ? "（匿名模式已移除）" : "待补结构化引用", "");
  for (const citation of report.citations) {
    lines.push(
      `### ${citation.reference} · ${citation.statusLabel}`,
      "",
      `- 引用状态：${markdownEscape(citation.status)} / ${markdownEscape(citation.statusLabel)}`,
      `- 资料引用：${markdownEscape(citation.source.documentReference)}`,
      `- 文献：${markdownEscape(citation.source.title)}`,
      `- 作者：${markdownEscape(citation.source.author || "—")}`,
      `- 版本：${markdownEscape(citation.source.edition || "—")}`,
      `- 出版信息：${markdownEscape(citation.source.publisher || "—")} / ${markdownEscape(citation.source.publicationYear || "—")}`,
      `- 来源网址：${markdownEscape(citation.source.sourceUrl || "—")}`,
      `- 正文哈希：${markdownEscape(citation.source.contentHash)}`,
      `- 定位：${markdownEscape(citation.locator)}`,
      `- 目标：${citation.targets.map(markdownEscape).join("；")}`,
      `- 证据主题：${citation.evidenceSubjectIds.length ? citation.evidenceSubjectIds.map(markdownEscape).join("；") : "无"}`,
      `- 来源类型：${markdownEscape(citation.source.origin)}`,
      `- 权利状态：${markdownEscape(citation.source.rightsStatus)}`,
      `- 作品状态：${markdownEscape(citation.source.workStatus)}`,
      `- 版本状态：${markdownEscape(citation.source.editionStatus)}`,
      `- 分发策略：${markdownEscape(citation.source.distributionPolicy)}`,
      `- 复核状态：${markdownEscape(citation.source.reviewStatus)}`,
      `- 机械可再分发：${citation.source.redistributableSourceRights ? "是" : "否"}`,
      `- 复核人数：${citation.reviewerCount}`,
      `- 批注：${markdownEscape(citation.annotation || "—")}`,
      `- 决定说明：${markdownEscape(citation.decisionNote || "—")}`,
      "",
      ...citation.quote.split("\n").map((line) => `> ${line}`),
      ""
    );
  }
  if (report.redactions.length) {
    lines.push("## 匿名移除项", "", ...report.redactions.map((item) => `- ${item}`), "");
  }
  return singleChartMarkdownDocumentSchema.parse({
    formatVersion: SINGLE_CHART_REPORT_FORMAT_VERSION,
    format: "markdown",
    anonymized: report.anonymized,
    encoding: "utf-8",
    mimeType: "text/markdown;charset=utf-8",
    fileExtension: ".md",
    suggestedFileName: `${report.suggestedFileBase}.md`,
    warnings: [REIDENTIFICATION_WARNING],
    content: `${lines.filter((line, index) => line !== "" || lines[index - 1] !== "").join("\n").trimEnd()}\n`
  });
}
