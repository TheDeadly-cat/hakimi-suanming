import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { LocalPersonalReading, LocalPersonalReadingEntry } from "../lib/local-personal-reading";
import { hasLegacyPersonalAdoption, personalAdoptionLabel } from "../lib/local-personal-reading-legacy";
import { FEEDBACK_RATINGS, FEEDBACK_REVIEW_STATES } from "../lib/local-reading-feedback";
import { formatDateTime } from "../lib/format";
import { safeVisibleErrorMessage } from "../lib/visible-text";
import "./personal-reading-note.css";

export type AdoptPersonalReading = (rootNoteId: string, expectedLatestId: string | null) => Promise<void>;
interface PersonalReadingContextValue { reading: LocalPersonalReading | null; onAdopt?: AdoptPersonalReading }
const PersonalReadingContext = createContext<PersonalReadingContextValue | null>(null);

export function usePersonalReading(): LocalPersonalReading | null {
  return useContext(PersonalReadingContext)?.reading ?? null;
}

export function PersonalReadingProvider({ reading, onAdopt, children }: PersonalReadingContextValue & { children: ReactNode }) {
  return <PersonalReadingContext.Provider value={{ reading, onAdopt }}>{children}</PersonalReadingContext.Provider>;
}

export function PersonalReadingScope({ subjectId, children, expectedSource }: { subjectId: string; children: ReactNode; expectedSource?: LocalPersonalReading["sourceBinding"] }) {
  const context = useContext(PersonalReadingContext);
  const source = context?.reading?.sourceBinding;
  const matches = !expectedSource || (source && source.caseId === expectedSource.caseId && source.revisionId === expectedSource.revisionId
    && source.chartResultHash === expectedSource.chartResultHash && source.includeHour === expectedSource.includeHour);
  const entry = matches ? context?.reading?.entries.find((item) => item.subjectId === subjectId) : undefined;
  return <PersonalReadingNote entry={entry} onAdopt={context?.onAdopt}>{children}</PersonalReadingNote>;
}

export function PersonalReadingOverview() {
  const context = useContext(PersonalReadingContext), reading = context?.reading;
  if (!reading || (!reading.entries.length && !reading.issues.length)) return null;
  const adopted = reading.entries.filter((entry) => entry.state === "adopted" && entry.personalText).length;
  return <aside className="personal-reading-overview" aria-label="个人阅读补充总览">
    <p>{adopted ? `已按反馈采用 ${adopted} 项个人修订` : reading.entries.length ? "已保留你的个人反馈与补充" : "历史记录待核对"}</p>
    <details><summary>{reading.entries.length ? `查看全部个人反馈主题（${reading.entries.length}）` : `查看未用于当前阅读的记录（${reading.issues.length}）`}</summary>
      {reading.entries.map((entry) => <section className="personal-reading-overview-item" key={entry.subjectId}>
        <h3>{entry.subjectLabel}</h3>
        <PersonalReadingNote entry={entry} onAdopt={context?.onAdopt}><p className="personal-reading-original-text">{entry.originalConclusion}</p></PersonalReadingNote>
      </section>)}
      {reading.issues.length ? <div className="personal-reading-issues"><h4>未用于当前阅读的记录</h4><ul>{reading.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul></div> : null}
    </details>
  </aside>;
}

export function PersonalReadingNote({ entry, children, onAdopt }: {
  entry?: LocalPersonalReadingEntry | null; children: ReactNode; onAdopt?: AdoptPersonalReading;
}) {
  if (!entry || (entry.state === "original" && !entry.feedback.length)) return <>{children}</>;
  // Remount the action state when its bound records change; late saves must not
  // publish a success or error into a different subject or record version.
  const identity = JSON.stringify([entry.subjectId, entry.state, entry.originalConclusion, entry.feedback.map((item) => [item.rootRef, item.latestReviewRef])]);
  return <BoundPersonalReadingNote key={identity} entry={entry} onAdopt={onAdopt}>{children}</BoundPersonalReadingNote>;
}

function BoundPersonalReadingNote({ entry, children, onAdopt }: {
  entry: LocalPersonalReadingEntry; children: ReactNode; onAdopt?: AdoptPersonalReading;
}) {
  const [pendingRoot, setPendingRoot] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const busy = useRef(false), active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const adopted = entry.state === "adopted" && Boolean(entry.personalText) && !entry.issues.length;
  const legacyAdopted = hasLegacyPersonalAdoption(entry);
  async function adopt(rootNoteId: string, expectedLatestId: string | null) {
    if (!onAdopt || busy.current || entry.state === "conflict" || entry.issues.length) return;
    busy.current = true; setPendingRoot(rootNoteId); setMessage(""); setFailed(false);
    try {
      await onAdopt(rootNoteId, expectedLatestId);
      if (active.current) setMessage("个人修订已追加保存，原解读仍保留。您可以在反馈记录中恢复原解读。");
    } catch (error) {
      if (active.current) { setFailed(true); setMessage(safeVisibleErrorMessage(error, "采用结果尚未确认，请先到反馈记录核对。")); }
    } finally { busy.current = false; if (active.current) setPendingRoot(null); }
  }
  return <section className={`personal-reading-note${adopted ? " personal-reading-note--adopted" : ""}`} aria-label={`${entry.subjectLabel} · 个人阅读`}>
    {adopted ? <>
      <div className="personal-reading-adopted"><span className="personal-reading-label">{personalAdoptionLabel(entry)}</span><p>{entry.personalText}</p>
        <small>{legacyAdopted ? "这段文字由你针对旧版解读采用，已核对为同一命盘和时段；新版自动解读在下方单独对照。" : "由你根据实际情况采用；原计算保留在下方对照。"}</small>
        {entry.selectedReviewRefs.length ? <p className="personal-reading-source">当前采用你最新的明确复核：{entry.selectedReviewRefs.map((ref) => `${formatDateTime(ref.createdAt)}（记录 ${ref.noteId.slice(0, 8)}）`).join("；")}。</p> : null}</div>
      <details className="personal-reading-computed"><summary>{legacyAdopted ? "对照新版自动解读" : "对照原计算解读"}</summary><div>{children}</div></details>
    </> : <>{children}{entry.state === "retained" ? <p className="personal-reading-state">当前保留原解读，个人反馈与修订历史仍在。</p> : entry.state === "needs_more" ? <p className="personal-reading-state">当前仍显示原解读，待补充更多事实。</p> : null}</>}
    <div className="personal-reading-supplements">
      <h4>你的实际补充</h4>
      {entry.feedback.map((feedback) => <article key={feedback.rootRef.noteId}>
        <p className="personal-reading-source">个人反馈 · {FEEDBACK_RATINGS[feedback.rating]} · {formatDateTime(feedback.rootRef.createdAt)}</p>
        {feedback.legacyReplay ? <details><summary>这条反馈对应的旧版原结论</summary><p className="personal-reading-original-text">{feedback.legacyReplay.originalConclusion}</p></details> : null}
        {feedback.aspect ? <p><strong>具体方面：</strong>{feedback.aspect}</p> : null}
        {feedback.occurredAt ? <p><strong>对应时间：</strong>{feedback.occurredAt}</p> : null}
        {feedback.actualSituation ? <p>{feedback.actualSituation}</p> : <p>尚未补充实际经历。</p>}
        {feedback.reviewState ? <div className="personal-reading-review-note"><p><strong>{FEEDBACK_REVIEW_STATES[feedback.reviewState]}</strong>{feedback.latestReviewRef ? ` · ${formatDateTime(feedback.latestReviewRef.createdAt)}` : ""}</p>{feedback.reviewNotes ? <p>{feedback.reviewNotes}</p> : null}</div> : feedback.requestedRevision ? <div className="personal-reading-proposal">
          <p><strong>尚未采用的个人修订建议</strong></p><p>{feedback.requestedRevision}</p>
          {onAdopt && feedback.canReview && !feedback.latestReviewRef && !feedback.chainIssues.length && entry.state !== "conflict" && !entry.issues.length ? <button className="text-button" type="button" disabled={pendingRoot !== null} onClick={() => { void adopt(feedback.rootRef.noteId, null); }}>{pendingRoot === feedback.rootRef.noteId ? "正在保存" : "采用这段个人修订"}</button> : null}
        </div> : null}
        {feedback.chainIssues.length ? <details><summary>此条反馈的关联说明</summary><ul>{feedback.chainIssues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul></details> : null}
      </article>)}
    </div>
    {entry.issues.length ? <details className="personal-reading-issues"><summary>个人修订暂未用于当前阅读</summary><ul>{entry.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul></details> : null}
    {message ? <p className="personal-reading-message" role={failed ? "alert" : "status"}>{message}</p> : null}
  </section>;
}
