import type { LocalReadingTimeline, ReadingTimelineBranchId, ReadingTimelineNarrativeStatement, ReadingTimelineStage, ReadingTimelineYearLink } from "./local-reading-timeline";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const localDate = (instant: string) => new Date(Date.parse(instant) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const labels: Record<ReadingTimelineNarrativeStatement["kind"], string> = {
  overview: "年份节奏", support_window: "重点时段", pressure_window: "需留意的时段",
  mixed_window: "利弊并见的时段", turning_point: "交运与变化", coverage: "范围说明"
};
export interface StageAnswerProjection {
  statementId: string;
  text: string;
  /** Exact original text displaced by this presentation only. */
  originalExplanation: string | null;
}

/** Project only the statements that survived personal adoption. A repeated
 * cause may be shortened only when the same complete year link is already
 * explained by a visible window in this branch. The canonical narrative stays
 * unchanged for feedback, saving and comparison. */
export function projectStageAnswers(timeline: LocalReadingTimeline, branchId: ReadingTimelineBranchId,
  visible: readonly ReadingTimelineNarrativeStatement[]): StageAnswerProjection[] {
  const branch = timeline.branches.find((item) => item.id === branchId);
  if (!branch) throw new Error("阶段答案缺少本次方向分支。");
  const ids = new Set<string>();
  for (const statement of visible) {
    const original = branch.narrative.statements.find((item) => item.id === statement.id);
    if (!original || stable(original) !== stable(statement) || ids.has(statement.id)) throw new Error("阶段答案与原分支语句不一致。");
    ids.add(statement.id);
  }
  const selected = branch.narrative.statements.filter((item) => ids.has(item.id));
  const stagesFor = (statement: ReadingTimelineNarrativeStatement) => statement.stageIds.map((id) => {
    const stage = timeline.stages.find((item) => item.id === id && item.branchId === branchId);
    if (!stage) throw new Error("阶段答案的原阶段不属于当前分支。");
    return stage;
  });
  const windows = selected.filter((item) => ["support_window", "pressure_window", "mixed_window"].includes(item.kind));
  const explained = windows.flatMap((item) => stagesFor(item).flatMap((stage) => stage.yearLinks.length ? [stage.yearLinks[0]!] : []));
  const covered = (link: ReadingTimelineYearLink | undefined) => !!link && explained.some((item) => stable(item) === stable(link));
  return selected.map((statement) => {
    const stages = stagesFor(statement);
    let text = statement.text;
    if (statement.kind === "overview" && stages.length && covered(stages[0]!.yearLinks[0])) {
      const ranges: { first: ReadingTimelineStage; last: ReadingTimelineStage }[] = [];
      for (const stage of stages) {
        const previous = ranges.at(-1);
        if (previous && previous.last.endExclusiveInstant === stage.startInstant && previous.last.caption === stage.caption) previous.last = stage;
        else ranges.push({ first: stage, last: stage });
      }
      text = `${ranges.map((range) => `${localDate(range.first.startInstant)}至${localDate(range.last.endExclusiveInstant)}前，${range.first.caption}`).join("；随后，")}。`;
    }
    if (statement.kind === "turning_point" && statement.turningPointIds.length === 1) {
      const turn = timeline.turningPoints.find((item) => item.id === statement.turningPointIds[0] && item.branchId === branchId);
      if (!turn) throw new Error("阶段答案的变化点不属于当前分支。");
      if (covered(turn.after)) {
        const same = turn.before.caption === turn.after.caption;
        text = `${turn.headline}。${turn.kind === "handover" && same ? `换运前后仍为“${turn.after.caption}”，不是自动转好。`
          : same ? `总体表述仍为“${turn.after.caption}”，变化在具体作用条件。`
            : `前段“${turn.before.caption}”，后段“${turn.after.caption}”。`}`;
      }
    }
    return { statementId: statement.id, text: `${labels[statement.kind]}：${text}`, originalExplanation: text === statement.text ? null : statement.text };
  });
}
