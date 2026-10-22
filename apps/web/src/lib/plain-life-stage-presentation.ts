import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { LocalLifeOutlook } from "./local-detailed-outlook";
import type { LifeStageStoryStage, LocalLifeStageStory } from "./local-life-stage-story";
import { buildPlainOutlookDomainReading, plainOutlookCaption } from "./plain-outlook-reading";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";

const stable = (input: unknown) => JSON.stringify(input, (_key, value) => value && typeof value === "object" && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
export function plainLifeStagePresentation(story: LocalLifeStageStory, stage: LifeStageStoryStage, life: LocalLifeOutlook, task?: NatalWealthResourceTask | null) {
  const originals = life.decades.filter(decade => decade.id === stage.decadeId && decade.branchId === stage.branchId);
  const original = originals[0];
  if (story.sourceBinding.revisionId !== life.revisionId || story.sourceBinding.chartResultHash !== life.chartResultHash
    || originals.length !== 1 || !original || original.startInstant !== stage.startInstant || original.endExclusiveInstant !== stage.endExclusiveInstant
    || stable(original.nodeRef) !== stable(stage.nodeRef)
    || original.judgment.sourceBinding.revisionId !== life.revisionId || original.judgment.sourceBinding.chartResultHash !== life.chartResultHash || original.judgment.sourceBinding.includeHour !== story.sourceBinding.includeHour
    || stable(original.judgment.targetRef) !== stable(stage.nodeRef)
    || original.judgment.interval.startInstant !== stage.startInstant || original.judgment.interval.endExclusiveInstant !== stage.endExclusiveInstant
    || story.branches.flatMap(branch => branch.stages).filter(item => item.decadeId === stage.decadeId && stable(item) === stable(stage)).length !== 1) {
    throw new Error("大运简明正文与原大运、分支或起止来源不一致。");
  }
  const domains = (["career", "wealth"] as const).map(domain => {
    const theme = original[domain];
    return buildPlainOutlookDomainReading({ judgment: original.judgment, domain, horizon: "decade", age: story.sourceBinding.includeHour ? stage.age : buildLocalReadingAgeContext(null, stage.startInstant, stage.endExclusiveInstant), task,
      original: { headline: theme.title, summary: theme.text, paragraphs: [...stage.paragraphs], examples: [],
        conditions: [...stage.conditions], evidence: [...original.evidence] } });
  }).filter(value => value !== null);
  return { caption: plainOutlookCaption(original.judgment, stage.caption), domains };
}
