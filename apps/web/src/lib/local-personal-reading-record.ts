import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { FEEDBACK_RATINGS, FEEDBACK_REVIEW_STATES, READING_FEEDBACK_FORMAT } from "./local-reading-feedback";
import { LOCAL_PERSONAL_READING_VERSION, type LocalPersonalReading, type PersonalReadingRecordReference } from "./local-personal-reading";
import type { LegacyAnnualReadingInput } from "./legacy-annual-reading-profile";
import { assertPersonalReadingLegacyBindings, personalAdoptionLabel } from "./local-personal-reading-legacy";

const referenceText = (reference: PersonalReadingRecordReference) =>
  `${reference.noteId} · 编辑版本 ${reference.editVersion} · ${reference.createdAt} · SHA-256 ${reference.bodySha256}`;

/** Preserve the personal view at save time alongside, never over, its calculated original. */
export function describePersonalReading(reading: LocalPersonalReading, assessment: BaziPreliminaryAssessment, legacySource?: LegacyAnnualReadingInput): string[] {
  assertPersonalReadingLegacyBindings(reading, legacySource);
  if (reading.version !== LOCAL_PERSONAL_READING_VERSION
    || reading.sourceBinding.revisionId !== assessment.sourceBinding.revisionId
    || reading.sourceBinding.chartResultHash !== assessment.sourceBinding.chartResultHash
    || reading.sourceBinding.includeHour !== assessment.sourceBinding.includeHour
    || !reading.sourceVersions.includes(reading.version)
    || !reading.sourceVersions.includes(READING_FEEDBACK_FORMAT)
    || !reading.sourceVersions.includes(assessment.version)) {
    throw new Error("个人阅读与当前命盘或解读版本不一致，请重新打开后保存。");
  }
  const subjects = new Set<string>();
  for (const entry of reading.entries) {
    if (subjects.has(entry.subjectId)) throw new Error("个人阅读主题重复，请重新打开后保存。");
    subjects.add(entry.subjectId);
    const adopted = entry.state === "adopted";
    if (entry.effectiveConclusion !== (adopted ? entry.personalText : entry.originalConclusion)
      || (adopted ? !entry.personalText?.trim() || entry.issues.length > 0 || !entry.selectedReviewRefs.length : entry.personalText !== null)
      || entry.readingVersions.some((version) => !reading.sourceVersions.includes(version))) {
      throw new Error("个人阅读的采用状态、正文或版本不一致，请重新打开后保存。");
    }
    for (const feedback of entry.feedback) {
      if (feedback.source.revisionId !== reading.sourceBinding.revisionId
        || feedback.source.chartResultHash !== reading.sourceBinding.chartResultHash
        || feedback.source.includeHour !== reading.sourceBinding.includeHour
        || feedback.source.assessmentVersion !== assessment.version
        || (!feedback.legacyReplay && JSON.stringify([...new Set(feedback.source.readingVersions)].sort()) !== JSON.stringify([...new Set(entry.readingVersions)].sort()))) {
        throw new Error("个人阅读的反馈来源不一致，请重新打开后保存。");
      }
    }
    for (const selected of entry.selectedReviewRefs) {
      const feedback = entry.feedback.find((item) => item.latestReviewRef
        && referenceText(item.latestReviewRef) === referenceText(selected));
      if (!feedback || feedback.chainIssues.length || !feedback.canReview
        || (adopted ? feedback.reviewState !== "revised" || feedback.revisedConclusion !== entry.personalText : feedback.reviewState !== entry.state)) {
        throw new Error("个人阅读的采用记录不一致，请重新打开后保存。");
      }
    }
  }
  return ["## 结合个人反馈的解读",
    "下列个人修订由用户明确采用，仅用于对应主题。实际补充是用户自述；原计算、通用规则及以前的快照均保留。",
    ...(!reading.entries.length ? ["本次保存没有已关联的个人反馈，正文沿用原计算解读。"] : []),
    ...reading.entries.flatMap((entry) => [`### ${entry.subjectLabel}`,
      `主题标识：${entry.subjectId}`,
      `当前阅读状态：${entry.state === "adopted" ? personalAdoptionLabel(entry) : entry.state === "retained" ? "已恢复原计算解读" : entry.state === "needs_more" ? "待补充，沿用原计算" : entry.state === "conflict" ? "记录有冲突，沿用原计算" : "反馈尚未采用，沿用原计算"}`,
      "#### 本次阅读正文", entry.effectiveConclusion,
      "#### 原计算解读（保留对照）", entry.originalConclusion,
      ...entry.feedback.flatMap((feedback) => ["#### 个人反馈记录", `原反馈：${referenceText(feedback.rootRef)}`,
        ...(feedback.legacyReplay ? ["该条反馈针对旧版本原结论：", feedback.legacyReplay.originalConclusion,
          `旧版重放核验：${feedback.legacyReplay.profileVersion}`, `核验范围：${JSON.stringify(feedback.legacyReplay.scope)}`] : []),
        `反馈评价：${FEEDBACK_RATINGS[feedback.rating]}`, `具体方面：${feedback.aspect || "未填写"}`, `对应时间：${feedback.occurredAt || "未填写"}`,
        "实际情况（用户自述）：", feedback.actualSituation || "未补充实际经历。",
        "原修订建议（不等于已经采用）：", feedback.requestedRevision || "未填写。",
        ...(feedback.latestReviewRef ? [`最新复核：${referenceText(feedback.latestReviewRef)}`,
          `复核状态：${feedback.reviewState ? FEEDBACK_REVIEW_STATES[feedback.reviewState] : "未确认"}`,
          "复核说明：", feedback.reviewNotes ?? "", ...(feedback.revisedConclusion ? ["该次个人修订原文：", feedback.revisedConclusion] : [])] : ["尚无明确复核动作。"]),
        ...feedback.chainIssues.map((issue) => `关联说明：${issue}`), `反馈来源：${JSON.stringify(feedback.source)}`]),
      ...entry.selectedReviewRefs.map((reference) => `本次采用状态对应记录：${referenceText(reference)}`),
      ...entry.issues.map((issue) => `未采用说明：${issue}`), `原解读版本：${entry.readingVersions.join("、")}`]),
    ...reading.issues.map((issue) => `未用于当前阅读的记录：${issue}`),
    `个人阅读来源：${JSON.stringify(reading.sourceBinding)}`, `个人阅读版本：${reading.sourceVersions.join("、")}`];
}
