import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalReadingSnapshotExtras } from "./local-reading-record";
import type { LocalPersonalReading, LocalPersonalReadingEntry } from "./local-personal-reading";
import { buildAnnualReadingChoicePairs, buildAnnualYearChoicePairs, type LegacyAnnualReadingInput } from "./legacy-annual-reading-profile";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const versions = (items: readonly string[]) => stable([...new Set(items)].sort());

export function legacyAnnualInputFromExtras(assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook | null,
  extras: LocalReadingSnapshotExtras): LegacyAnnualReadingInput | undefined {
  if (!extras.sourceRevision) return undefined;
  return { revision: extras.sourceRevision, assessment, annual, annualDomains: extras.annualDomains ?? null,
    contextual: extras.contextual, monthly: extras.monthly, monthlyDomains: extras.monthlyDomains,
    life: extras.life, lifeStageStory: extras.lifeStageStory, selectedDecadeId: extras.lifeStageYears?.stage.decadeId };
}

/** Serialized bridge metadata is evidence to check, never permission to reuse
 * an old review. Rebuild both producers before saving or composing a report. */
function legacyEntries(reading: LocalPersonalReading, subjects?: readonly string[]) {
  const selected = subjects ? new Set(subjects) : null;
  return reading.entries.filter((entry) => (!selected || selected.has(entry.subjectId)) && entry.feedback.some((feedback) => feedback.legacyReplay));
}
export function assertPersonalReadingLegacyBindings(reading: LocalPersonalReading, source?: LegacyAnnualReadingInput, subjects?: readonly string[]): void {
  const entries = legacyEntries(reading, subjects);
  if (!entries.length) return;
  if (!source) throw new Error("历史个人修订缺少同源重放资料，未保存未经核对的采用。");
  const replay = buildAnnualReadingChoicePairs(source, { subjectIds: entries.map((entry) => entry.subjectId) });
  validateReplay(reading, entries, replay, source.assessment.version);
}
export function assertPersonalReadingLegacyYearBindings(reading: LocalPersonalReading,
  source: Parameters<typeof buildAnnualYearChoicePairs>[0], subjects: readonly string[]): void {
  const entries = legacyEntries(reading, subjects);
  if (!entries.length) return;
  const replay = buildAnnualYearChoicePairs(source, { subjectIds: entries.map((entry) => entry.subjectId) });
  validateReplay(reading, entries, replay, source.assessment.version);
}
function validateReplay(reading: LocalPersonalReading, entries: LocalPersonalReadingEntry[],
  replay: ReturnType<typeof buildAnnualReadingChoicePairs>, assessmentVersion: string): void {
  if (stable(replay.sourceBinding) !== stable(reading.sourceBinding) || !reading.sourceVersions.includes(replay.profileVersion)) {
    throw new Error("历史个人修订的重放身份或版本不一致。");
  }
  for (const entry of entries) for (const feedback of entry.feedback) {
    const old = feedback.legacyReplay;
    if (!old) continue;
    const matches = replay.pairs.filter((pair) => pair.currentChoice.id === entry.subjectId && pair.legacyChoice.id === entry.subjectId
      && pair.currentChoice.originalConclusion === entry.originalConclusion
      && versions(pair.currentChoice.sourceVersions ?? []) === versions(entry.readingVersions)
      && pair.legacyChoice.originalConclusion === old.originalConclusion
      && versions(pair.legacyChoice.sourceVersions ?? []) === versions(feedback.source.readingVersions)
      && stable(pair.scope) === stable(old.scope));
    if (old.profileVersion !== replay.profileVersion || matches.length !== 1
      || feedback.source.revisionId !== reading.sourceBinding.revisionId
      || feedback.source.chartResultHash !== reading.sourceBinding.chartResultHash
      || feedback.source.includeHour !== reading.sourceBinding.includeHour
      || feedback.source.assessmentVersion !== assessmentVersion
      || feedback.source.readingVersions.some((version) => !reading.sourceVersions.includes(version))) {
      throw new Error("历史个人修订与旧原文、版本或当前精确范围不一致。");
    }
  }
}

export function hasLegacyPersonalAdoption(entry: LocalPersonalReadingEntry): boolean {
  return entry.state === "adopted" && entry.selectedReviewRefs.some((ref) => entry.feedback.some((feedback) =>
    !!feedback.legacyReplay && stable(feedback.latestReviewRef) === stable(ref)));
}

export function personalAdoptionLabel(entry: LocalPersonalReadingEntry): string {
  return hasLegacyPersonalAdoption(entry) ? "此前已采用的个人修订（旧版本）" : "已采用的个人修订";
}
