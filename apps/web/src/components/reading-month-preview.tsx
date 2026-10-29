import type { ReadingConclusion, ReadingExplanationIndex } from "../lib/reading-explanation-index";
import { buildReadingMonthPreview } from "../lib/reading-month-preview";
import "./reading-month-preview.css";

export function ReadingMonthPreview({ index, conclusion }: { index: ReadingExplanationIndex; conclusion: ReadingConclusion }) {
  const preview = buildReadingMonthPreview(index, conclusion);
  return <div className="reading-month-preview" data-month-preview-state={preview.projectionState}>
    <p className="reading-month-preview-scope">{preview.scopeLabel}</p>
    <p className="reading-month-preview-domain"><strong>{preview.domainLabel}</strong><span>{preview.projectionState === "producer_preview"
      ? "本月原文提要" : preview.projectionState === "personal_original" ? "个人原文" : "原文阅读"}</span></p>
    <p className="reading-month-preview-meaning">{preview.meaning}</p>
    <p className="reading-month-preview-condition"><strong>条件与限制：</strong>{preview.condition}</p>
  </div>;
}
