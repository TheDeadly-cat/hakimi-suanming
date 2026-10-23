import { transitNodeRefSchema, type TransitNodeRef } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION, type LocalOutlookJudgment, type LocalOutlookJudgmentSegment } from "./local-outlook-judgment";

const AXIS_NAMES = { balance: "旺衰与承接", pattern: "格局主线", seasonal: "调候条件" };
const EFFECT_NAMES = { assists: "形成助力", obstructs: "增加阻力", mixed: "助力与阻力并存", neutral: "未见明显改变", unresolved: "按条件判断" };

export function outlookJudgmentFeedbackText(judgment: LocalOutlookJudgment | null | undefined): string {
  if (!judgment) return "";
  return [`综合判断：${judgment.label} · ${judgment.headline}`, judgment.summary,
    ...judgment.axes.map((axis) => `${AXIS_NAMES[axis.axis]}：${axis.summary}`), ...judgment.conflicts,
    `适用区间：${judgment.interval.startInstant} 至 ${judgment.interval.endExclusiveInstant}`,
    `综合岁运规则：${judgment.version}\n解释口径：${judgment.policyVersion}`].join("\n");
}

/** One immutable copy of each complete judgment per report. Repeated references
 * (a single-segment year and its aggregate, for example) point to that copy. */
export function createOutlookJudgmentRecordWriter(assessment: BaziPreliminaryAssessment) {
  const records: { id: string; judgment: LocalOutlookJudgment }[] = [];
  const identities = new Map<string, string>();
  const sourceIds = new Set<string>();

  function describe(judgment: LocalOutlookJudgment | null | undefined, expectedRef: TransitNodeRef | null, label: string,
    frame?: { startInstant: string | null; endExclusiveInstant: string | null }): string[] {
    if (!judgment) return [];
    const binding = judgment.sourceBinding;
    if (!expectedRef || binding.revisionId !== assessment.sourceBinding.revisionId
      || binding.chartResultHash !== assessment.sourceBinding.chartResultHash
      || binding.includeHour !== assessment.sourceBinding.includeHour) throw new Error("综合岁运判断与当前命盘不一致，已停止保存。");
    const reference = transitNodeRefSchema.parse(judgment.targetRef);
    const expected = transitNodeRefSchema.parse(expectedRef);
    if (reference.revisionId !== binding.revisionId || reference.chartResultHash !== binding.chartResultHash
      || JSON.stringify(reference) !== JSON.stringify(expected)) throw new Error("综合岁运判断的时间节点不一致，已停止保存。");
    if (judgment.version !== LOCAL_OUTLOOK_JUDGMENT_VERSION || judgment.policyVersion !== LOCAL_OUTLOOK_POLICY_VERSION) throw new Error("综合岁运判断规则版本不一致，已停止保存。");
    const intervalStart = Date.parse(judgment.interval.startInstant), intervalEnd = Date.parse(judgment.interval.endExclusiveInstant);
    if (!Number.isFinite(intervalStart) || !Number.isFinite(intervalEnd) || intervalStart < Date.parse(reference.startInstant) || intervalEnd <= intervalStart) throw new Error("综合判断适用区间无效，已停止保存。");
    if (frame && (intervalStart < Date.parse(frame.startInstant ?? "") || intervalEnd > Date.parse(frame.endExclusiveInstant ?? "")
      || !Number.isFinite(Date.parse(frame.startInstant ?? "")) || !Number.isFinite(Date.parse(frame.endExclusiveInstant ?? "")))) throw new Error("综合判断适用区间超出所保存的时期，已停止保存。");
    for (const background of judgment.backgroundRefs) {
      const parsed = transitNodeRefSchema.parse(background);
      if (parsed.revisionId !== binding.revisionId || parsed.chartResultHash !== binding.chartResultHash
        || parsed.ruleProfileDigest !== reference.ruleProfileDigest || parsed.luckCycleRuleDigest !== reference.luckCycleRuleDigest
        || parsed.timelineVersion !== reference.timelineVersion || !["dayun", "year"].includes(parsed.nodeType)) throw new Error("综合判断背景与当前命盘或规则不一致，已停止保存。");
    }
    const identity = JSON.stringify(judgment);
    let id = identities.get(identity);
    if (!id) {
      id = `J${records.length + 1}`;
      records.push({ id, judgment });
      identities.set(identity, id);
      for (const sourceId of judgment.sourceIds) sourceIds.add(sourceId);
    }
    return [`${label}：${judgment.label} · ${judgment.headline}\n${judgment.summary}\n完整判断及依据：${id}`];
  }

  function describeSegments(segments: LocalOutlookJudgmentSegment[] | undefined, expectedRef: TransitNodeRef | null,
    startInstant: string | null, endExclusiveInstant: string | null): string[] {
    if (!segments?.length) return [];
    const start = Date.parse(startInstant ?? ""), end = Date.parse(endExclusiveInstant ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("综合判断分段缺少有效区间。");
    const ids = new Set<string>();
    const previousEnds = new Map<string, number>();
    return segments.flatMap((segment) => {
      const segmentStart = Date.parse(segment.startInstant), segmentEnd = Date.parse(segment.endExclusiveInstant);
      if (!Number.isFinite(segmentStart) || !Number.isFinite(segmentEnd) || segmentStart < start || segmentEnd > end || segmentEnd <= segmentStart
        || !["locked", "forward", "backward"].includes(segment.branchId)) throw new Error("综合判断分段超出当前时间范围，已停止保存。");
      if (!segment.id || ids.has(segment.id) || segmentStart < (previousEnds.get(segment.branchId) ?? -Infinity)) throw new Error("综合判断分段重复、重叠或顺序不一致，已停止保存。");
      if (segment.judgment.interval.startInstant !== segment.startInstant || segment.judgment.interval.endExclusiveInstant !== segment.endExclusiveInstant) throw new Error("综合判断与所保存的分段时间不一致，已停止保存。");
      ids.add(segment.id); previousEnds.set(segment.branchId, segmentEnd);
      return [`分段 ${segment.branchLabel}（${segment.branchId}）：${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`,
        ...describe(segment.judgment, expectedRef, `分段判断 ${segment.id}`, segment)];
    });
  }

  function appendix(): string[] {
    if (!records.length) return [];
    return ["## 综合岁运判断完整依据", "正文中的 J 编号指向以下完整判断；同一判断只保存一份。",
      ...records.flatMap(({ id, judgment }) => [`### ${id} · ${judgment.headline}`, judgment.summary,
        `主判断：${judgment.label}；主要角度：${judgment.primaryAxis}`,
        `判断规则：${judgment.version}\n解释口径：${judgment.policyVersion}`,
        `命盘绑定：${JSON.stringify(judgment.sourceBinding)}\n时间节点：${JSON.stringify(judgment.targetRef)}`,
        `适用区间：${JSON.stringify(judgment.interval)}\n背景节点：${JSON.stringify(judgment.backgroundRefs)}`,
        ...judgment.axes.flatMap((axis) => [`#### ${AXIS_NAMES[axis.axis]} · ${EFFECT_NAMES[axis.effect]}`, axis.summary,
          `规则：${axis.ruleId}；路径：${axis.pathId ?? "未定"}；条目标识：${axis.id}`,
          ...(axis.stemActions ? [`透干与本气分项：${JSON.stringify(axis.stemActions)}`] : []),
          ...(axis.taskLinks ? [`本命任务与岁运联动：${JSON.stringify(axis.taskLinks)}`] : []),
          ...axis.evidence.map((item) => `- 事实依据：${item}`),
          ...axis.satisfiedConditions.map((item) => `- 已满足条件：${item}`),
          ...axis.blockers.map((item) => `- 阻碍：${item}`), ...axis.rescues.map((item) => `- 调节条件：${item}`),
          ...axis.unresolvedConditions.map((item) => `- 尚有条件：${item}`), `本项来源：${axis.sourceIds.join("、")}`]),
        ...judgment.conflicts.map((item) => `- 角度差异：${item}`), ...judgment.conditions.map((item) => `- 适用条件：${item}`),
        ...judgment.coverageGaps.map((item) => `- 当前覆盖范围：${item}`), `判断来源：${judgment.sourceIds.join("、")}`])];
  }
  return { describe, describeSegments, appendix, sourceIds };
}
