import {
  comparisonCellAvailabilitySchema,
  formalComparisonCategorySchema,
  pairStructureResearchProjectionSchema,
  pairStructureResearchPolicySchema,
  transitNodeTypeSchema,
  type PairStructureObservation,
  type PairStructureResearchProjection,
  type SynchronizedTransitResult,
  type TransitNodeType
} from "@hakimi/contracts";
import { verifyPairStructureResearchProjectionIntegrity } from "@hakimi/comparison-core";
import { z } from "zod";
import {
  FULL_AUDIT_PRIVACY_WARNING,
  PAIR_REIDENTIFICATION_WARNING,
  REIDENTIFICATION_WARNING
} from "./privacy";

export const PAIR_STRUCTURE_REPORT_FORMAT_VERSION = "1.0.0" as const;
export const PAIR_STRUCTURE_SOURCE_OBSERVATION_COUNT = 96 as const;

export const PAIR_STRUCTURE_FACTS_ONLY_NOTICE =
  "本报告只分别记录对象甲与对象乙各自的事实；不生成跨盘干支推导、吉凶、因果、缘分、婚配结论、建议或评分。" as const;

export const PAIR_STRUCTURE_ANONYMOUS_REDACTIONS = [
  "案例、修订、节点与内部项目的 opaque ID",
  "案例别名、标签、案例备注与任何用户研究文本",
  "地点、坐标、输入来源说明、太阳时推导细节与完整输入快照",
  "规则包名称、标识、说明、来源、摘要与完整规则快照",
  "修订摘要、结果摘要、计算时间与内部证据摘要",
  "完整运限轨道、节点引用、运限摘要与规则摘要"
] as const;

const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;
const PILLAR_FIELDS = [
  "ganZhi",
  "stem",
  "branch",
  "hiddenStems",
  "stemTenGod",
  "branchTenGods",
  "wuXing",
  "nayin",
  "twelveGrowth",
  "xun",
  "voidBranches"
] as const;

/**
 * v1 匿名报告只允许系统拥有、无自由文本来源的事实字段。这里是正向白名单；
 * 新增比较字段不会自动进入匿名导出，必须经过单独隐私审查。
 */
export const PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS: readonly string[] = [
  "input.calendar",
  "input.civil_time",
  "input.time_zone",
  "input.sex",
  "calibration.gregorian_date",
  "calibration.active_wall",
  "calibration.utc_instant",
  "calibration.utc_offset",
  "calibration.dst",
  "calibration.algorithm",
  "rule.status",
  "rule.year_boundary",
  "rule.month_boundary",
  "rule.day_boundary",
  "rule.zi_basis",
  "rule.hour_basis",
  "rule.dst",
  "rule.solar_time",
  "calendar.solar_text",
  "calendar.lunar_text",
  "calendar.leap_month",
  "calendar.previous_jie",
  "calendar.next_jie",
  ...PILLAR_KEYS.flatMap((pillar) => PILLAR_FIELDS.map((field) => `pillar.${pillar}.${field}`)),
  "pillar.relations",
  "evidence.engine",
  "evidence.relations_engine",
  "evidence.interpretation",
  "evidence.upstream",
  "evidence.tzdb",
  "evidence.verification",
  "evidence.range",
  "evidence.warnings"
];

const ANONYMOUS_OBSERVATION_ID_SET = new Set(PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS);
if (ANONYMOUS_OBSERVATION_ID_SET.size !== PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS.length) {
  throw new Error("双案例匿名事实白名单包含重复字段。");
}

const anonymousObservationSchema = z.strictObject({
  id: z.string().refine((id) => ANONYMOUS_OBSERVATION_ID_SET.has(id), "字段不在双案例匿名事实白名单"),
  category: formalComparisonCategorySchema,
  label: z.string().min(1).max(160),
  value: z.string().max(1_000_000),
  availability: comparisonCellAvailabilitySchema
});

const anonymousResolvedTransitSlotSchema = z.strictObject({
  nodeType: transitNodeTypeSchema,
  status: z.literal("resolved"),
  label: z.string().min(1).max(80),
  ganZhi: z.string().length(2),
  stemTenGod: z.string().max(20),
  index: z.number().int().nonnegative().nullable(),
  boundaryLabel: z.string().max(40).nullable(),
  startInstant: z.string().datetime({ offset: true }),
  endExclusiveInstant: z.string().datetime({ offset: true }),
  frame: z.enum(["fixed_plus08", "revision_iana_civil"]),
  verificationStatus: z.literal("engineering_preview")
});

const anonymousUnavailableTransitSlotSchema = z.strictObject({
  nodeType: transitNodeTypeSchema,
  status: z.enum(["not_applicable", "unsupported"]),
  reasonCode: z.string().min(1).max(60),
  message: z.string().min(1).max(240)
});

const anonymousTransitSlotSchema = z.union([
  anonymousResolvedTransitSlotSchema,
  anonymousUnavailableTransitSlotSchema
]);

const anonymousResolvedTransitSchema = z.strictObject({
  status: z.literal("resolved"),
  target: z.strictObject({
    revisionWallDateTime: z.string(),
    displayTimeZone: z.string()
  }),
  slots: z.array(anonymousTransitSlotSchema).length(6)
}).superRefine((value, context) => {
  for (const [index, expectedType] of transitNodeTypeSchema.options.entries()) {
    if (value.slots[index]?.nodeType !== expectedType) {
      context.addIssue({
        code: "custom",
        path: ["slots", index, "nodeType"],
        message: "匿名六层运限必须按大运、小运、年、月、日、时固定排列"
      });
    }
  }
});

const anonymousErrorTransitSchema = z.strictObject({
  status: z.literal("error"),
  code: z.string().min(1).max(120),
  message: z.string().min(1).max(1_000)
});

const anonymousTransitSchema = z.discriminatedUnion("status", [
  anonymousResolvedTransitSchema,
  anonymousErrorTransitSchema
]);

const anonymousParticipantBaseSchema = z.strictObject({
  revisionLabel: z.string().regex(/^R[1-9]\d*$/),
  observationCount: z.literal(PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS.length),
  observations: z.array(anonymousObservationSchema).length(PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS.length),
  transit: anonymousTransitSchema
});

const anonymousParticipantASchema = anonymousParticipantBaseSchema.extend({ role: z.literal("A") });
const anonymousParticipantBSchema = anonymousParticipantBaseSchema.extend({ role: z.literal("B") });

export const pairStructureAnonymousResearchReportSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0"),
  formatVersion: z.literal(PAIR_STRUCTURE_REPORT_FORMAT_VERSION),
  kind: z.literal("pair_structure_anonymous_research_report"),
  anonymized: z.literal(true),
  title: z.literal("双案例结构研究匿名报告"),
  targetInstant: z.string().datetime({ offset: true }),
  policy: pairStructureResearchPolicySchema,
  privacyWarning: z.literal(REIDENTIFICATION_WARNING),
  pairPrivacyWarning: z.literal(PAIR_REIDENTIFICATION_WARNING),
  scopeNotice: z.literal(PAIR_STRUCTURE_FACTS_ONLY_NOTICE),
  sourceIntegrityVerified: z.literal(true),
  auditLinkIncluded: z.literal(false),
  evidenceStatus: z.literal("engineering_projection"),
  participants: z.tuple([anonymousParticipantASchema, anonymousParticipantBSchema]),
  redactions: z.tuple(PAIR_STRUCTURE_ANONYMOUS_REDACTIONS.map((item) => z.literal(item)) as [
    z.ZodLiteral<(typeof PAIR_STRUCTURE_ANONYMOUS_REDACTIONS)[0]>,
    z.ZodLiteral<(typeof PAIR_STRUCTURE_ANONYMOUS_REDACTIONS)[1]>,
    z.ZodLiteral<(typeof PAIR_STRUCTURE_ANONYMOUS_REDACTIONS)[2]>,
    z.ZodLiteral<(typeof PAIR_STRUCTURE_ANONYMOUS_REDACTIONS)[3]>,
    z.ZodLiteral<(typeof PAIR_STRUCTURE_ANONYMOUS_REDACTIONS)[4]>,
    z.ZodLiteral<(typeof PAIR_STRUCTURE_ANONYMOUS_REDACTIONS)[5]>
  ])
});

export const pairStructureAnonymousMarkdownDocumentSchema = z.strictObject({
  formatVersion: z.literal(PAIR_STRUCTURE_REPORT_FORMAT_VERSION),
  kind: z.literal("pair_structure_anonymous_markdown"),
  format: z.literal("markdown"),
  anonymized: z.literal(true),
  sourceIntegrityVerified: z.literal(true),
  encoding: z.literal("utf-8"),
  mimeType: z.literal("text/markdown;charset=utf-8"),
  fileExtension: z.literal(".md"),
  suggestedFileName: z.string().regex(/^hakimi-pair-a-r[1-9]\d*-b-r[1-9]\d*-at-\d{8}t\d{6}z-anonymous\.md$/),
  warnings: z.tuple([
    z.literal(REIDENTIFICATION_WARNING),
    z.literal(PAIR_REIDENTIFICATION_WARNING),
    z.literal(PAIR_STRUCTURE_FACTS_ONLY_NOTICE)
  ]),
  content: z.string().min(1)
});

export const pairStructureFullAuditJsonDocumentSchema = z.strictObject({
  formatVersion: z.literal(PAIR_STRUCTURE_REPORT_FORMAT_VERSION),
  kind: z.literal("pair_structure_full_audit_json"),
  format: z.literal("json"),
  anonymized: z.literal(false),
  sensitiveDataIncluded: z.literal(true),
  sourceIntegrityVerified: z.literal(true),
  encoding: z.literal("utf-8"),
  mimeType: z.literal("application/json;charset=utf-8"),
  fileExtension: z.literal(".json"),
  suggestedFileName: z.string().regex(/^hakimi-pair-a-r[1-9]\d*-b-r[1-9]\d*-[a-f0-9]{12}-full-audit\.json$/),
  warnings: z.tuple([z.literal(FULL_AUDIT_PRIVACY_WARNING), z.literal(PAIR_STRUCTURE_FACTS_ONLY_NOTICE)]),
  content: z.string().min(1)
});

export const pairStructureFullAuditEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0"),
  formatVersion: z.literal(PAIR_STRUCTURE_REPORT_FORMAT_VERSION),
  kind: z.literal("pair_structure_full_audit_envelope"),
  privacy: z.literal("full_sensitive"),
  sensitiveDataIncluded: z.literal(true),
  privacyWarning: z.literal(FULL_AUDIT_PRIVACY_WARNING),
  scopeNotice: z.literal(PAIR_STRUCTURE_FACTS_ONLY_NOTICE),
  sourceIntegrityVerified: z.literal(true),
  digestAlgorithm: z.literal("projection_manifest_result_hash"),
  projectionResultHash: z.string().regex(/^[a-f0-9]{64}$/),
  projection: pairStructureResearchProjectionSchema
}).superRefine((value, context) => {
  if (value.projectionResultHash !== value.projection.manifest.resultHash) {
    context.addIssue({
      code: "custom",
      path: ["projectionResultHash"],
      message: "完整审计信封摘要必须绑定内层双案例事实工件"
    });
  }
});

export type PairStructureAnonymousResearchReport = z.infer<typeof pairStructureAnonymousResearchReportSchema>;
export type PairStructureAnonymousMarkdownDocument = z.infer<typeof pairStructureAnonymousMarkdownDocumentSchema>;
export type PairStructureFullAuditJsonDocument = z.infer<typeof pairStructureFullAuditJsonDocumentSchema>;
export type PairStructureFullAuditEnvelope = z.infer<typeof pairStructureFullAuditEnvelopeSchema>;

export const pairStructureFullAuditOptionsSchema = z.strictObject({
  acknowledgedSensitiveData: z.literal(true)
});
export type PairStructureFullAuditOptions = z.infer<typeof pairStructureFullAuditOptionsSchema>;

function selectAnonymousObservations(
  observations: PairStructureObservation[],
  sourceWarningCount: number
): PairStructureObservation[] {
  if (observations.length !== PAIR_STRUCTURE_SOURCE_OBSERVATION_COUNT) {
    throw new Error(
      `双案例匿名导出契约漂移：预期 ${PAIR_STRUCTURE_SOURCE_OBSERVATION_COUNT} 项源事实，实际 ${observations.length} 项。`
    );
  }
  const byId = new Map(observations.map((observation) => [observation.id, observation]));
  const missing = PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS.filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`双案例匿名事实白名单缺少字段：${missing.join("、")}`);
  return observations
    .filter((observation) => ANONYMOUS_OBSERVATION_ID_SET.has(observation.id))
    .map((observation) => observation.id === "evidence.warnings"
      ? {
          ...observation,
          value: `${sourceWarningCount} 条（匿名报告不展开文本）`,
          availability: "value"
        }
      : observation);
}

function anonymousTransit(result: SynchronizedTransitResult) {
  if (result.status === "error") {
    return {
      status: result.status,
      code: "transit_unavailable",
      message: "本对象的六层运限未生成；请在完整审计 JSON 中查看失败原因。"
    } as const;
  }
  const slots = transitNodeTypeSchema.options.map((nodeType: TransitNodeType) => {
    const slot = result.snapshot.slots[nodeType];
    if (slot.status !== "resolved") {
      return {
        nodeType,
        status: slot.status,
        reasonCode: slot.status,
        message: "当前匿名报告未取得此层活动节点；完整原因仅保留在审计 JSON。"
      };
    }
    const node = slot.node;
    return {
      nodeType,
      status: slot.status,
      label: node.label,
      ganZhi: node.ganZhi,
      stemTenGod: node.stemTenGod,
      index: node.index,
      boundaryLabel: node.boundaryLabel,
      startInstant: node.startInstant,
      endExclusiveInstant: node.endExclusiveInstant,
      frame: node.frame,
      verificationStatus: node.verificationStatus
    };
  });
  return {
    status: result.status,
    target: {
      revisionWallDateTime: result.snapshot.target.revisionWallDateTime,
      displayTimeZone: result.snapshot.target.displayTimeZone
    },
    slots
  } as const;
}

export async function buildPairStructureAnonymousResearchReport(
  rawProjection: unknown
): Promise<PairStructureAnonymousResearchReport> {
  const projection = await verifyPairStructureResearchProjectionIntegrity(rawProjection);
  return pairStructureAnonymousResearchReportSchema.parse({
    schemaVersion: "1.0.0",
    formatVersion: PAIR_STRUCTURE_REPORT_FORMAT_VERSION,
    kind: "pair_structure_anonymous_research_report",
    anonymized: true,
    title: "双案例结构研究匿名报告",
    targetInstant: projection.targetInstant,
    policy: projection.policy,
    privacyWarning: REIDENTIFICATION_WARNING,
    pairPrivacyWarning: PAIR_REIDENTIFICATION_WARNING,
    scopeNotice: PAIR_STRUCTURE_FACTS_ONLY_NOTICE,
    sourceIntegrityVerified: true,
    auditLinkIncluded: false,
    evidenceStatus: projection.manifest.evidenceStatus,
    participants: projection.participants.map((participant) => ({
      role: participant.role,
      revisionLabel: `R${participant.item.revision.revisionNumber}`,
      observationCount: PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS.length,
      observations: selectAnonymousObservations(
        participant.observations,
        participant.item.revision.manifest.warnings.length
      ),
      transit: anonymousTransit(participant.transit)
    })),
    redactions: PAIR_STRUCTURE_ANONYMOUS_REDACTIONS
  });
}

function markdownInline(value: string): string {
  return value.replace(/[\\`*_\[\]|]/g, "\\$&").replace(/\r?\n/g, " ");
}

function compactUtcInstant(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.\d{3}Z$/.exec(value);
  if (!match) throw new Error("双案例匿名文件名需要规范 UTC 瞬时点。");
  return `${match[1]}${match[2]}${match[3]}t${match[4]}${match[5]}${match[6]}z`;
}

const CATEGORY_LABELS = {
  input: "原始出生输入",
  calibration: "历法与校时",
  rule: "规则选择",
  calendar_fact: "历法事实",
  pillar_fact: "四柱与盘内关系事实",
  evidence: "计算证据"
} as const;

const TRANSIT_LABELS: Record<TransitNodeType, string> = {
  dayun: "大运",
  xiaoyun: "小运",
  year: "流年",
  month: "流月",
  day: "流日",
  hour: "流时"
};

export function renderPairStructureAnonymousMarkdown(
  rawReport: PairStructureAnonymousResearchReport
): PairStructureAnonymousMarkdownDocument {
  const report = pairStructureAnonymousResearchReportSchema.parse(structuredClone(rawReport));
  const lines = [
    "# 双案例结构研究匿名报告",
    "",
    `> ${report.privacyWarning}`,
    "",
    `> ${report.pairPrivacyWarning}`,
    "",
    `> ${report.scopeNotice}`,
    "",
    `- 同步目标 UTC：${report.targetInstant}`,
    `- 来源完整性：已重新验签`,
    `- 语义边界：participant_facts_only`,
    `- 证据状态：${report.evidenceStatus}`,
    `- 审计链接：不包含；匿名报告不能替代完整审计 JSON`,
    `- 每方匿名事实：${PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS.length} 项`,
    ""
  ];

  for (const participant of report.participants) {
    lines.push(`## 对象${participant.role === "A" ? "甲" : "乙"} · ${participant.revisionLabel}`, "");
    for (const category of formalComparisonCategorySchema.options) {
      const observations = participant.observations.filter((observation) => observation.category === category);
      if (!observations.length) continue;
      lines.push(`### ${CATEGORY_LABELS[category]}`, "");
      for (const observation of observations) {
        lines.push(`- ${markdownInline(observation.label)}（${observation.id}）：${markdownInline(observation.value)} · ${observation.availability}`);
      }
      lines.push("");
    }

    lines.push("### 同一瞬时点的本对象六层运限", "");
    if (participant.transit.status === "error") {
      lines.push(`- 未生成：${markdownInline(participant.transit.code)} · ${markdownInline(participant.transit.message)}`, "");
    } else {
      lines.push(
        `- 对应民用时：${markdownInline(participant.transit.target.revisionWallDateTime)}`,
        `- 显示时区：${markdownInline(participant.transit.target.displayTimeZone)}`,
        ""
      );
      for (const slot of participant.transit.slots) {
        if (slot.status === "resolved") {
          lines.push(`- ${TRANSIT_LABELS[slot.nodeType]}：${slot.ganZhi} · ${markdownInline(slot.label)} · ${slot.startInstant} 至 ${slot.endExclusiveInstant}`);
        } else {
          lines.push(`- ${TRANSIT_LABELS[slot.nodeType]}：${slot.status} · ${markdownInline(slot.reasonCode)} · ${markdownInline(slot.message)}`);
        }
      }
      lines.push("");
    }
  }

  lines.push("## 匿名移除项", "", ...report.redactions.map((item) => `- ${item}`), "");
  const [participantA, participantB] = report.participants;
  return pairStructureAnonymousMarkdownDocumentSchema.parse({
    formatVersion: PAIR_STRUCTURE_REPORT_FORMAT_VERSION,
    kind: "pair_structure_anonymous_markdown",
    format: "markdown",
    anonymized: true,
    sourceIntegrityVerified: true,
    encoding: "utf-8",
    mimeType: "text/markdown;charset=utf-8",
    fileExtension: ".md",
    suggestedFileName: `hakimi-pair-a-${participantA.revisionLabel.toLowerCase()}-b-${participantB.revisionLabel.toLowerCase()}-at-${compactUtcInstant(report.targetInstant)}-anonymous.md`,
    warnings: [REIDENTIFICATION_WARNING, PAIR_REIDENTIFICATION_WARNING, PAIR_STRUCTURE_FACTS_ONLY_NOTICE],
    content: `${lines.join("\n").trimEnd()}\n`
  });
}

export async function exportPairStructureAnonymousMarkdown(
  rawProjection: unknown
): Promise<PairStructureAnonymousMarkdownDocument> {
  return renderPairStructureAnonymousMarkdown(
    await buildPairStructureAnonymousResearchReport(rawProjection)
  );
}

export async function exportPairStructureFullAuditJson(
  rawProjection: unknown,
  rawOptions: PairStructureFullAuditOptions
): Promise<PairStructureFullAuditJsonDocument> {
  pairStructureFullAuditOptionsSchema.parse(rawOptions);
  const projection: PairStructureResearchProjection =
    await verifyPairStructureResearchProjectionIntegrity(rawProjection);
  const [participantA, participantB] = projection.participants;
  const envelope = pairStructureFullAuditEnvelopeSchema.parse({
    schemaVersion: "1.0.0",
    formatVersion: PAIR_STRUCTURE_REPORT_FORMAT_VERSION,
    kind: "pair_structure_full_audit_envelope",
    privacy: "full_sensitive",
    sensitiveDataIncluded: true,
    privacyWarning: FULL_AUDIT_PRIVACY_WARNING,
    scopeNotice: PAIR_STRUCTURE_FACTS_ONLY_NOTICE,
    sourceIntegrityVerified: true,
    digestAlgorithm: "projection_manifest_result_hash",
    projectionResultHash: projection.manifest.resultHash,
    projection
  });
  return pairStructureFullAuditJsonDocumentSchema.parse({
    formatVersion: PAIR_STRUCTURE_REPORT_FORMAT_VERSION,
    kind: "pair_structure_full_audit_json",
    format: "json",
    anonymized: false,
    sensitiveDataIncluded: true,
    sourceIntegrityVerified: true,
    encoding: "utf-8",
    mimeType: "application/json;charset=utf-8",
    fileExtension: ".json",
    suggestedFileName: `hakimi-pair-a-r${participantA.item.revision.revisionNumber}-b-r${participantB.item.revision.revisionNumber}-${projection.manifest.resultHash.slice(0, 12)}-full-audit.json`,
    warnings: [FULL_AUDIT_PRIVACY_WARNING, PAIR_STRUCTURE_FACTS_ONLY_NOTICE],
    content: `${JSON.stringify(envelope, null, 2)}\n`
  });
}

export async function verifyPairStructureFullAuditEnvelope(
  rawEnvelope: unknown
): Promise<PairStructureFullAuditEnvelope> {
  const envelope = pairStructureFullAuditEnvelopeSchema.parse(structuredClone(rawEnvelope));
  await verifyPairStructureResearchProjectionIntegrity(envelope.projection);
  return envelope;
}
