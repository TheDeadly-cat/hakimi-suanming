import { createContext, useContext, type ReactNode } from "react";
import type { ContextualDomainReading } from "../lib/local-contextual-reading";
import { ContextualReadingPanel } from "./contextual-reading-panel";
import { PersonalReadingScope } from "./personal-reading-note";
import type { ReadingContextReference } from "../lib/local-reading-context";
import type { ReadingSynthesisSection } from "../lib/local-reading-synthesis";

interface ContextualReadingView {
  readings: readonly ContextualDomainReading[];
  contextRef?: ReadingContextReference | null;
  referenceYear?: number;
  onFeedback?: (subjectId: string) => void;
}
const ContextualReadingContext = createContext<ContextualReadingView | null>(null);
export function ContextualReadingProvider({ readings, contextRef, referenceYear, onFeedback, children }: ContextualReadingView & { children: ReactNode }) {
  return <ContextualReadingContext.Provider value={{ readings, contextRef, referenceYear, onFeedback }}>{children}</ContextualReadingContext.Provider>;
}
export function ContextualReadingScope({ baseSubjectId, children, projectedContext }: { baseSubjectId: string; children: ReactNode; projectedContext?: ReadingSynthesisSection["contextProjection"] }) {
  const context = useContext(ContextualReadingContext);
  const reading = context?.readings.find((entry) => entry.scope.kind === "natal"
    ? baseSubjectId === `chapter-${entry.scope.chapterId}`
    : baseSubjectId === `annual-domain-${entry.scope.year}-${entry.scope.segmentId}-${entry.scope.domainId}`);
  if (!reading) return <>{children}</>;
  const projectionMatches = baseSubjectId === "chapter-relationships" && reading.scope.kind === "natal" && projectedContext
    && projectedContext.subjectId === reading.subjectId && projectedContext.referenceYear === reading.scope.referenceYear
    && projectedContext.referenceYear === context?.referenceYear && context.contextRef
    && projectedContext.reference.noteId === context.contextRef.noteId && projectedContext.reference.editVersion === context.contextRef.editVersion
    && projectedContext.reference.bodySha256 === context.contextRef.bodySha256
    && JSON.stringify([...projectedContext.sourceVersions].sort()) === JSON.stringify([...reading.sourceVersions].sort());
  if (projectionMatches) return <div className="contextual-reading-scope">
    <PersonalReadingScope subjectId={reading.subjectId}>
      {children}
      <details className="deep-reading-evidence"><summary>查看背景原说明</summary><ContextualReadingPanel reading={reading} /></details>
      {context?.onFeedback ? <a className="text-button" href="#reading-feedback" onClick={() => context.onFeedback?.(reading.subjectId)}>反馈这段说明</a> : null}
    </PersonalReadingScope>
  </div>;
  return <div className="contextual-reading-scope">
    <PersonalReadingScope subjectId={reading.subjectId}>
      <ContextualReadingPanel reading={reading} />
      {context?.onFeedback ? <a className="text-button" href="#reading-feedback" onClick={() => context.onFeedback?.(reading.subjectId)}>反馈这段说明</a> : null}
    </PersonalReadingScope>
    <details className="deep-reading-evidence"><summary>对照通用解读与已有个人修订</summary>{children}</details>
  </div>;
}
