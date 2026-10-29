import { buildLifeStageStory, type LifeStageStoryInput, type LocalLifeStageStory, type LifeStageStoryStage, type LifeStageStoryTransition } from "./local-life-stage-story";
import { LOCAL_DETAILED_OUTLOOK_VERSION, type LocalLifeOutlook } from "./local-detailed-outlook";
import type { LocalPersonalReading, LocalPersonalReadingEntry } from "./local-personal-reading";
import { outlookJudgmentFeedbackText, type createOutlookJudgmentRecordWriter } from "./local-outlook-judgment-record";

type Branch = LocalLifeStageStory["branches"][number];
type StoryItem = LifeStageStoryStage | LifeStageStoryTransition;
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const lines = (label: string, values: readonly string[]) => values.map((value) => `- ${label}：${value}`);
const subject = (value: string) => { if (value.length > 500) throw new Error("人生阶段反馈标识超过可保存范围。"); return value; };
export const lifeStageStorySubjectId = (_story: LocalLifeStageStory, stage: LifeStageStoryStage) => subject(`life-stage-story-${stage.decadeId}`);
export const lifeStageStoryTransitionSubjectId = (_story: LocalLifeStageStory, transition: LifeStageStoryTransition) => subject(`life-stage-transition-${transition.id}`);
export function lifeStageStoryFeedbackVersions(story: LocalLifeStageStory): string[] {
  if (!story.sourceVersions.includes(LOCAL_DETAILED_OUTLOOK_VERSION)) throw new Error("人生阶段主线缺少原大运版本。");
  return [story.version, LOCAL_DETAILED_OUTLOOK_VERSION];
}
export const lifeStageStoryTransitionFeedbackVersions = lifeStageStoryFeedbackVersions;
export function lifeStageStoryEntries(story: LocalLifeStageStory) {
  return story.branches.flatMap((branch) => [
    ...branch.stages.map((stage) => ({ kind: "stage" as const, branch, stage })),
    ...branch.transitions.map((transition) => ({ kind: "transition" as const, branch, transition }))
  ]);
}
function stageBranch(story: LocalLifeStageStory, stage: LifeStageStoryStage): Branch {
  const matches = story.branches.filter((branch) => branch.id === stage.branchId && branch.stages.some((candidate) => stable(candidate) === stable(stage)));
  if (matches.length !== 1) throw new Error("人生阶段正文与原分支不一致。");
  return matches[0]!;
}
function transitionBranch(story: LocalLifeStageStory, transition: LifeStageStoryTransition): Branch {
  const matches = story.branches.filter((branch) => branch.transitions.some((candidate) => stable(candidate) === stable(transition)));
  if (matches.length !== 1) throw new Error("交运正文与原分支不一致。");
  return matches[0]!;
}
function manifest(story: LocalLifeStageStory, includeReferenceInstant = true): string[] {
  return [`阶段主线规则：${story.version}`, `完整来源版本：${JSON.stringify(story.sourceVersions)}`,
    `命盘来源：${JSON.stringify(story.sourceBinding)}`, ...(includeReferenceInstant ? [`定位瞬时：${story.referenceInstant}`] : [])];
}
export function lifeStageStoryFeedbackText(story: LocalLifeStageStory, branch: Branch, stage: LifeStageStoryStage): string {
  if (stageBranch(story, stage).id !== branch.id || stable(story.branches.find((item) => item.id === branch.id)) !== stable(branch)) throw new Error("人生阶段反馈分支不一致。");
  return [`${branch.label} · ${stage.ganZhi}大运 · ${stage.headline}`, `原大运：${stage.decadeId}`,
    `${stage.startInstant} 至 ${stage.endExclusiveInstant}（不含终点）`, stage.ageLabel, `年龄语境：${JSON.stringify(stage.age)}`,
    `原综合判断：${stage.caption}`, ...stage.paragraphs, ...lines("可发挥之处", stage.advantages), ...lines("可能的牵制", stage.pressures),
    ...lines("阶段条件", stage.conditions), ...lines("分支条件", branch.conditions),
    `原节点：${JSON.stringify(stage.nodeRef)}`, `原判断依据引用：${JSON.stringify(stage.basisRefs)}`,
    `原主题：${stage.sourceSubjects.join("、")}`, ...manifest(story, false)].join("\n");
}
export const lifeStageStoryStageText = (story: LocalLifeStageStory, stage: LifeStageStoryStage) => lifeStageStoryFeedbackText(story, stageBranch(story, stage), stage);
export function lifeStageStoryTransitionText(story: LocalLifeStageStory, transition: LifeStageStoryTransition): string {
  const branch = transitionBranch(story, transition);
  return [`${branch.label} · ${transition.headline}`, `交运标识：${transition.id}；时刻：${transition.atInstant}`,
    `此前大运：${transition.fromDecadeId}`, `此后大运：${transition.toDecadeId}`, ...transition.paragraphs,
    `原节点：${JSON.stringify([transition.fromNodeRef, transition.toNodeRef])}`, `原判断差别：${JSON.stringify(transition.changes)}`,
    `原判断依据引用：${JSON.stringify(transition.basisRefs)}`, `原主题：${transition.sourceSubjects.join("、")}`,
    ...lines("分支条件", branch.conditions), ...manifest(story, false)].join("\n");
}
export const lifeStageStoryTransitionFeedbackText = lifeStageStoryTransitionText;
function isBound(story: LocalLifeStageStory, personal?: LocalPersonalReading | null): personal is LocalPersonalReading {
  return !!personal && ["caseId", "revisionId", "chartResultHash", "includeHour"].every((key) =>
    personal.sourceBinding[key as keyof LocalPersonalReading["sourceBinding"]] === story.sourceBinding[key as keyof LocalLifeStageStory["sourceBinding"]]);
}
function adopted(entry: LocalPersonalReadingEntry, original: string, versions: string[]): boolean {
  return entry.state === "adopted" && !!entry.personalText && entry.effectiveConclusion === entry.personalText && !entry.issues.length
    && entry.originalConclusion === original && stable([...new Set(entry.readingVersions)].sort()) === stable([...new Set(versions)].sort())
    && !!entry.selectedReviewRefs.length && entry.selectedReviewRefs.every((ref) => entry.feedback.some((feedback) =>
      feedback.latestReviewRef && stable(feedback.latestReviewRef) === stable(ref) && feedback.reviewState === "revised"
      && feedback.revisedConclusion === entry.personalText && feedback.canReview && !feedback.chainIssues.length));
}
/** Recheck exact current original text. A prior stage adoption constrains only
 * that stage and its adjacent transition; it never rewrites another period. */
export function lifeStageStoryPersonalSources(story: LocalLifeStageStory, item: StoryItem, personal?: LocalPersonalReading | null, life?: LocalLifeOutlook): LocalPersonalReadingEntry[] {
  if (!isBound(story, personal)) return [];
  const branch = "decadeId" in item ? stageBranch(story, item) : transitionBranch(story, item);
  const ids = "decadeId" in item ? [item.decadeId] : [item.fromDecadeId, item.toDecadeId];
  const expected = new Map<string, { text: string; versions: string[] }>();
  if (life) {
    if (life.revisionId !== story.sourceBinding.revisionId || life.chartResultHash !== story.sourceBinding.chartResultHash || life.referenceInstant !== story.referenceInstant) throw new Error("人生阶段采用核对缺少同源大运。");
    expected.set("life-overview", { text: `${life.referenceLabel}\n${life.summary}\n岁运解读规则：${life.version}`, versions: [life.version] });
    for (const id of ids) {
      const decade = life.decades.find((value) => value.id === id && value.branchId === branch.id);
      if (!decade) throw new Error("人生阶段采用核对缺少原大运。");
      expected.set(`decade-${id}`, { text: `${decade.headline}\n${decade.branchLabel} · ${decade.startInstant} 至 ${decade.endExclusiveInstant}\n${decade.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(decade.judgment)}\n岁运解读规则：${life.version}`, versions: [life.version] });
    }
  } else if (personal.entries.some((entry) => entry.state === "adopted" && ["life-overview", ...ids.map((id) => `decade-${id}`)].includes(entry.subjectId))) {
    throw new Error("核对既有个人大运修订需要原大运正文。");
  }
  for (const stage of branch.stages.filter((stage) => ids.includes(stage.decadeId))) expected.set(lifeStageStorySubjectId(story, stage), { text: lifeStageStoryStageText(story, stage), versions: lifeStageStoryFeedbackVersions(story) });
  if (!("decadeId" in item)) expected.set(lifeStageStoryTransitionSubjectId(story, item), { text: lifeStageStoryTransitionText(story, item), versions: lifeStageStoryFeedbackVersions(story) });
  return personal.entries.filter((entry) => { const original = expected.get(entry.subjectId); return !!original && adopted(entry, original.text, original.versions); });
}
export function describeLifeStageStory(story: LocalLifeStageStory, source: LifeStageStoryInput, personal?: LocalPersonalReading | null,
  referenceLines = lines, judgmentRecords?: ReturnType<typeof createOutlookJudgmentRecordWriter>): string[] {
  if (stable(story) !== stable(buildLifeStageStory(source))) throw new Error("人生阶段主线与本次命盘、大运分支或原判断不一致，已停止保存。");
  const personalLines = (item: StoryItem) => lifeStageStoryPersonalSources(story, item, personal, source.life).flatMap((entry) => [
    `本段关联已采用的个人修订：${entry.subjectId}`, entry.personalText!, `个人采用引用：${JSON.stringify(entry.selectedReviewRefs)}`, "以下自动主线保留为原计算对照，不替代个人修订。"]);
  return ["## 人生阶段主线与交运变化", ...manifest(story), ...story.branches.flatMap((branch) => [
    `### ${branch.label}`, `分支：${branch.id}；当前大运：${branch.currentDecadeId ?? "无"}`, ...referenceLines("分支条件", branch.conditions),
    ...branch.stages.flatMap((stage) => { const original = source.life.decades.find((decade) => decade.id === stage.decadeId)!;
      return [`#### ${stage.ganZhi}大运 · ${stage.headline}`, `原大运：${stage.decadeId}`,
        `${stage.startInstant} 至 ${stage.endExclusiveInstant}（不含终点）`, stage.ageLabel, `原综合判断：${stage.caption}`,
        ...personalLines(stage), ...stage.paragraphs, ...lines("可发挥之处", stage.advantages), ...lines("可能的牵制", stage.pressures),
        ...referenceLines("阶段条件", stage.conditions), `原判断依据引用：${JSON.stringify(stage.basisRefs)}`,
        ...(judgmentRecords ? judgmentRecords.describe(original.judgment, stage.nodeRef, "阶段主线原判断", stage) : [`原节点：${JSON.stringify(stage.nodeRef)}`]),
        `阶段反馈主题：${lifeStageStorySubjectId(story, stage)}`]; }),
    ...branch.transitions.flatMap((transition) => [`#### ${transition.headline}`, `交运标识：${transition.id}；时刻：${transition.atInstant}`,
      `此前大运：${transition.fromDecadeId}；此后大运：${transition.toDecadeId}`, ...personalLines(transition), ...transition.paragraphs,
      `原判断差别：${JSON.stringify(transition.changes)}`, `原判断依据引用：${JSON.stringify(transition.basisRefs)}`,
      `交运反馈主题：${lifeStageStoryTransitionSubjectId(story, transition)}`])]), ...referenceLines("阶段阅读范围", story.limitations)];
}
