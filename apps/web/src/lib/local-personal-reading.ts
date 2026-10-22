import { revisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { feedbackNoteReference, parseReadingFeedback, readFeedbackThread, READING_FEEDBACK_FORMAT,
  type FeedbackRating, type FeedbackReviewState, type ReadingFeedbackChoice, type ReadingFeedbackSource } from "./local-reading-feedback";
import { buildAnnualReadingChoicePairs, prepareLegacyAnnualReading, type LegacyAnnualReadingInput, type LegacyAnnualReadingScope } from "./legacy-annual-reading-profile";

export const LOCAL_PERSONAL_READING_VERSION = "hakimi.local-personal-reading/0.2.0" as const;
export interface PersonalReadingLegacyReplay {
  profileVersion: string;
  originalConclusion: string;
  scope: LegacyAnnualReadingScope;
}
export interface PersonalReadingRecordReference {
  noteId: string; editVersion: number; bodySha256: string; createdAt: string;
}
export interface LocalPersonalFeedback {
  rootRef: PersonalReadingRecordReference;
  latestReviewRef: PersonalReadingRecordReference | null;
  rating: FeedbackRating; aspect: string; occurredAt: string;
  actualSituation: string; requestedRevision: string;
  reviewState: FeedbackReviewState | null; reviewNotes: string | null;
  revisedConclusion: string | null; source: ReadingFeedbackSource;
  canReview: boolean; chainIssues: string[];
  /** The feedback retains its old source versions. This is a verified bridge
   * to the current entry, not a claim that the old review used today's text. */
  legacyReplay?: PersonalReadingLegacyReplay;
}
export type PersonalReadingState = "original" | "feedback_only" | "adopted" | "retained" | "needs_more" | "conflict";
export interface LocalPersonalReadingEntry {
  subjectId: string; subjectLabel: string; originalConclusion: string; readingVersions: string[];
  state: PersonalReadingState; personalText: string | null; effectiveConclusion: string;
  feedback: LocalPersonalFeedback[]; selectedReviewRefs: PersonalReadingRecordReference[]; issues: string[];
}
export interface LocalPersonalReading {
  version: typeof LOCAL_PERSONAL_READING_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; entries: LocalPersonalReadingEntry[]; issues: string[];
}
export interface LocalPersonalReadingInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment;
  choices: readonly ReadingFeedbackChoice[]; records: readonly ResearchNoteRecord[];
  legacySource?: LegacyAnnualReadingInput;
}

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const versionsEqual = (left: readonly string[], right: readonly string[]) => {
  const a = unique(left).sort(), b = unique(right).sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
};
const sameChoice = (left: ReadingFeedbackChoice, right: ReadingFeedbackChoice) => left.originalConclusion === right.originalConclusion
  && versionsEqual(left.sourceVersions ?? [], right.sourceVersions ?? []);
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
async function reference(record: ResearchNoteRecord): Promise<PersonalReadingRecordReference> {
  return { ...await feedbackNoteReference(record), createdAt: record.createdAt };
}

/** A view of explicitly confirmed personal text. It never changes the supplied
 * records, original conclusions, chart facts or general interpretation rules. */
export async function buildLocalPersonalReading({ revision, assessment, choices, records, legacySource }: LocalPersonalReadingInput): Promise<LocalPersonalReading> {
  const r = revisionRecordSchema.parse(revision);
  const sourceBinding = { caseId: r.caseId, revisionId: r.id, chartResultHash: r.manifest.resultHash,
    includeHour: r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only" };
  if (assessment.sourceBinding.revisionId !== r.id || assessment.sourceBinding.chartResultHash !== r.manifest.resultHash
    || assessment.sourceBinding.includeHour !== sourceBinding.includeHour) throw new Error("个人阅读与当前初判的命盘绑定不一致。");

  const issues: string[] = [], bySubject = new Map<string, ReadingFeedbackChoice>(), ambiguousChoices = new Set<string>();
  for (const choice of choices) {
    const previous = bySubject.get(choice.id);
    if (previous && !sameChoice(previous, choice)) {
      ambiguousChoices.add(choice.id);
      issues.push(`当前内容 ${choice.id} 有不同原文或版本，个人文本暂停采用。`);
    } else if (!previous) bySubject.set(choice.id, choice);
  }
  const sourceVersions = unique([LOCAL_PERSONAL_READING_VERSION, READING_FEEDBACK_FORMAT, assessment.version,
    ...choices.flatMap((choice) => choice.sourceVersions ?? [])]);
  const previousSubjects = unique(records.flatMap((record) => {
    const parsed = parseReadingFeedback(record.body);
    if (parsed.kind !== "feedback") return [];
    if (record.caseId !== r.caseId || record.anchor.kind !== "revision" || record.anchor.revisionId !== r.id
      || parsed.value.source.revisionId !== r.id || parsed.value.source.chartResultHash !== r.manifest.resultHash
      || parsed.value.source.includeHour !== sourceBinding.includeHour || parsed.value.source.assessmentVersion !== assessment.version
      || !parsed.value.source.readingVersions.some((version) => [
        "hakimi.local-annual-event-reading/0.5.0", "hakimi.local-annual-event-reading/0.6.0",
        "hakimi.local-outlook-judgment/0.9.0", "hakimi.local-annual-outlook/0.8.0", "hakimi.local-detailed-outlook/0.5.0", "hakimi.annual-event-scenarios/0.4.0"
      ].includes(version))) return [];
    const choice = bySubject.get(parsed.value.subjectId);
    return choice && (!versionsEqual(parsed.value.source.readingVersions, choice.sourceVersions ?? [])
      || parsed.value.originalConclusion !== choice.originalConclusion) ? [choice.id] : [];
  }));
  if (legacySource && (stable(legacySource.revision) !== stable(revision) || stable(legacySource.assessment) !== stable(assessment))) {
    throw new Error("历史个人修订的重放来源与当前命盘不一致。");
  }
  if (legacySource && previousSubjects.length) await prepareLegacyAnnualReading(legacySource);
  const replay = legacySource && previousSubjects.length
    ? buildAnnualReadingChoicePairs(legacySource, { subjectIds: previousSubjects }) : null;
  if (replay && stable(replay.sourceBinding) !== stable(sourceBinding)) throw new Error("历史个人修订的重放身份与当前命盘不一致。");
  const previousPairs = replay?.pairs.filter((pair) => {
    const current = bySubject.get(pair.currentChoice.id);
    return current && pair.legacyChoice.id === pair.currentChoice.id && sameChoice(current, pair.currentChoice)
      && !ambiguousChoices.has(current.id);
  }) ?? [];

  // Identical repeated rows are harmless; two different current rows for one
  // note identity are not a basis for choosing either chain.
  const byNote = new Map<string, ResearchNoteRecord>(), ambiguousNotes = new Set<string>();
  for (const record of records) {
    const previous = byNote.get(record.id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) {
      ambiguousNotes.add(record.id); issues.push(`记录 ${record.id} 出现内容不一致的重复身份，未自动选择其中一份。`);
    } else if (!previous) byNote.set(record.id, record);
  }
  const ambiguousRootIds = new Set<string>();
  for (const record of records) if (ambiguousNotes.has(record.id)) {
    const parsed = parseReadingFeedback(record.body);
    if (parsed.kind === "feedback") ambiguousRootIds.add(record.id);
    if (parsed.kind === "review") ambiguousRootIds.add(parsed.value.root.noteId);
  }
  const candidates = [...byNote.values()], groups = new Map<string, LocalPersonalFeedback[]>();
  const linkedRoots = new Set<string>();
  for (const root of candidates) {
    const parsed = parseReadingFeedback(root.body);
    const sameScope = root.caseId === r.caseId && root.anchor.kind === "revision" && root.anchor.revisionId === r.id;
    if (parsed.kind === "invalid") {
      if (sameScope) issues.push(`记录 ${root.id}：${parsed.message}`);
      continue;
    }
    if (parsed.kind !== "feedback") {
      if (parsed.kind === "legacy" && sameScope && root.tags.includes("解读反馈")) issues.push(`历史反馈 ${root.id} 缺少当前内容与版本的完整绑定，仅保留原记录供对照。`);
      continue;
    }
    linkedRoots.add(root.id);
    const doc = parsed.value, choice = bySubject.get(doc.subjectId);
    const previousMatches = previousPairs.filter((pair) => pair.legacyChoice.id === doc.subjectId
      && versionsEqual(doc.source.readingVersions, pair.legacyChoice.sourceVersions ?? [])
      && doc.originalConclusion === pair.legacyChoice.originalConclusion);
    const previous = previousMatches.length === 1 ? previousMatches[0] : undefined;
    let reason: string | null = null;
    if (!sameScope || doc.source.revisionId !== r.id || doc.source.chartResultHash !== r.manifest.resultHash || doc.source.includeHour !== sourceBinding.includeHour) reason = "所属案例、修订、命盘结果或时辰范围与当前阅读不一致";
    else if (root.lifecycle !== "active") reason = "原反馈已归档";
    else if (!choice) reason = "对应内容当前未提供，未自动寻找相似段落";
    else if (previousMatches.length > 1) reason = "旧结论对应多个范围，未自动选择其中一个";
    else if (doc.source.assessmentVersion !== assessment.version || (!previous && !versionsEqual(doc.source.readingVersions, choice.sourceVersions ?? []))) reason = "解读版本与当前内容不同";
    else if (!previous && doc.originalConclusion !== choice.originalConclusion) reason = "原结论与当前原文字节不同";
    if (reason) { issues.push(`反馈 ${root.id}（${doc.subjectId}）：${reason}，未套用个人文本。`); continue; }

    const thread = await readFeedbackThread(root, candidates);
    const chainIssues = [...thread.issues];
    if (ambiguousChoices.has(doc.subjectId)) chainIssues.push("当前同一内容身份有不同原文或版本。");
    if (ambiguousRootIds.has(root.id) || thread.reviews.some(({ record }) => ambiguousNotes.has(record.id))) chainIssues.push("此反馈链存在内容不一致的重复记录身份。");
    // Chain order remains authoritative. createdAt is used only for ordering
    // explicit actions across roots; user-supplied occurredAt is descriptive.
    let priorTime = Date.parse(root.createdAt);
    if (!Number.isFinite(priorTime)) chainIssues.push("原反馈的记录时间不可识别。");
    for (const { record } of thread.reviews) {
      const time = Date.parse(record.createdAt);
      if (!Number.isFinite(time) || time < priorTime) chainIssues.push(`复核 ${record.id} 的记录时间与前序关系不一致。`);
      priorTime = time;
    }
    if (thread.latest?.record.lifecycle === "archived") chainIssues.push("最新复核已归档，未回退采用此前的个人修订。");
    const latest = thread.latest;
    const item: LocalPersonalFeedback = {
      rootRef: await reference(root), latestReviewRef: latest ? await reference(latest.record) : null,
      rating: doc.rating, aspect: doc.aspect, occurredAt: doc.occurredAt, actualSituation: doc.actualSituation,
      requestedRevision: doc.requestedRevision, reviewState: latest?.value.state ?? null, reviewNotes: latest?.value.notes ?? null,
      revisedConclusion: latest?.value.revisedConclusion ?? null, source: structuredClone(doc.source),
      canReview: thread.canAppend && chainIssues.length === 0, chainIssues: unique(chainIssues),
      ...(previous ? { legacyReplay: { profileVersion: replay!.profileVersion,
        originalConclusion: previous.legacyChoice.originalConclusion, scope: structuredClone(previous.scope) } } : {})
    };
    if (previous) sourceVersions.push(replay!.profileVersion, ...doc.source.readingVersions);
    const group = groups.get(doc.subjectId) ?? [];
    group.push(item); groups.set(doc.subjectId, group);
  }
  for (const record of candidates) {
    const parsed = parseReadingFeedback(record.body);
    if (parsed.kind === "review" && record.caseId === r.caseId && record.anchor.kind === "revision" && record.anchor.revisionId === r.id
      && !linkedRoots.has(parsed.value.root.noteId)) issues.push(`复核 ${record.id} 的原反馈 ${parsed.value.root.noteId} 当前缺失或不可识别，未单独采用修订。`);
  }

  const entries: LocalPersonalReadingEntry[] = [];
  for (const [subjectId, feedback] of groups) {
    const choice = bySubject.get(subjectId)!;
    feedback.sort((a, b) => a.rootRef.createdAt.localeCompare(b.rootRef.createdAt) || a.rootRef.noteId.localeCompare(b.rootRef.noteId));
    const entryIssues = unique(feedback.flatMap((item) => item.chainIssues));
    let state: PersonalReadingState = entryIssues.length ? "conflict" : "feedback_only";
    let personalText: string | null = null, selectedReviewRefs: PersonalReadingRecordReference[] = [];
    const actions = feedback.filter((item) => item.latestReviewRef !== null && item.reviewState !== null);
    if (!entryIssues.length && actions.length) {
      const latestTime = Math.max(...actions.map((item) => Date.parse(item.latestReviewRef!.createdAt)));
      const newest = actions.filter((item) => Date.parse(item.latestReviewRef!.createdAt) === latestTime);
      const decisions = unique(newest.map((item) => JSON.stringify([item.reviewState, item.reviewState === "revised" ? item.revisedConclusion : null])));
      if (decisions.length > 1) {
        state = "conflict";
        entryIssues.push(`内容 ${subjectId} 在同一记录时刻有不同的个人采用或恢复动作，保留各份记录但未自动选择。`);
      } else {
        const selected = newest[0]!;
        state = selected.reviewState === "revised" ? "adopted" : selected.reviewState!;
        personalText = state === "adopted" ? selected.revisedConclusion : null;
        selectedReviewRefs = newest.map((item) => ({ ...item.latestReviewRef! }));
      }
    }
    entries.push({ subjectId, subjectLabel: choice.label, originalConclusion: choice.originalConclusion,
      readingVersions: unique(choice.sourceVersions ?? []), state, personalText,
      effectiveConclusion: personalText ?? choice.originalConclusion, feedback, selectedReviewRefs, issues: entryIssues });
  }
  // Stable current-choice order, independent of DB/list ordering.
  const order = new Map([...bySubject.keys()].map((id, index) => [id, index]));
  entries.sort((a, b) => order.get(a.subjectId)! - order.get(b.subjectId)!);
  return { version: LOCAL_PERSONAL_READING_VERSION, sourceBinding, sourceVersions: unique(sourceVersions), entries, issues: unique(issues) };
}
