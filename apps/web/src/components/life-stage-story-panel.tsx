import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { plainLifeStagePresentation } from "../lib/plain-life-stage-presentation";
import type { ReactNode } from "react";
import type { LocalLifeOutlook } from "../lib/local-detailed-outlook";
import type { LocalLifeStageStory } from "../lib/local-life-stage-story";
import type { LocalPersonalReading, LocalPersonalReadingEntry } from "../lib/local-personal-reading";
import { lifeStageStorySubjectId, lifeStageStoryTransitionSubjectId, lifeStageStoryPersonalSources } from "../lib/local-life-stage-story-record";
import { PersonalReadingScope } from "./personal-reading-note";
import { safeVisibleText } from "../lib/visible-text";
import "./life-stage-story-panel.css";

const clean = (value: string) => safeVisibleText(value, "", 12_000);
const instant = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(value));

function PersonalSources({ entries, children }: { entries: LocalPersonalReadingEntry[]; children: ReactNode }) {
  if (!entries.length) return <>{children}</>;
  return <div className="life-stage-personal-sources">
    <p>这段说明的来源已有你采用的个人修订</p>
    {entries.map((entry) => <div key={entry.subjectId}><p>{clean(entry.subjectLabel)}</p><blockquote>{entry.personalText ?? ""}</blockquote></div>)}
    <details><summary>对照原自动阶段说明</summary>{children}</details>
  </div>;
}

export function LifeStageStoryPanel({ story, life, stageId, personal, onFeedback, onSelectDecade, children, task }: {
  task?: NatalWealthResourceTask | null;
  story: LocalLifeStageStory; life: LocalLifeOutlook; stageId: string;
  personal?: LocalPersonalReading | null; onFeedback?: (subjectId: string) => void;
  onSelectDecade?: (decadeId: string) => void;
  children?: ReactNode;
}) {
  const branch = story.branches.find((item) => item.stages.some((stage) => stage.decadeId === stageId));
  const stage = branch?.stages.find((item) => item.decadeId === stageId);
  if (!branch || !stage) return null;
  const transition = branch.transitions.find((item) => item.fromDecadeId === stage.decadeId);
  const next = transition ? branch.stages.find((item) => item.decadeId === transition.toDecadeId) : null;
  const relationship = life.decades.find(item => item.id === stage.decadeId && item.branchId === stage.branchId)?.relationship;
  let plain: ReturnType<typeof plainLifeStagePresentation> | null = null;
  let nextPlain: ReturnType<typeof plainLifeStagePresentation> | null = null;
  try { plain = plainLifeStagePresentation(story, stage, life, task); if (next) nextPlain = plainLifeStagePresentation(story, next, life, task); }
  catch { /* Retain the bound original stage when a display source is stale. */ }
  const subject = lifeStageStorySubjectId(story, stage);
  const sources = lifeStageStoryPersonalSources(story, stage, personal, life).filter((entry) => entry.subjectId !== subject);
  return <section className="life-stage-story" aria-label={`${stage.ganZhi}大运的生活主线`} data-stage-story={stage.decadeId}>
    <PersonalReadingScope subjectId={subject} expectedSource={story.sourceBinding}>
      <PersonalSources entries={sources}>
        <header>
          <p className="life-stage-kicker">{story.branches.length > 1 ? `${branch.label} · ` : ""}{stage.ganZhi}大运 · {stage.age.label}</p>
          <h3>{clean(plain?.caption ?? stage.headline)}</h3>
          <p className="life-stage-period"><time dateTime={stage.startInstant}>{instant(stage.startInstant)}</time> 起至 <time dateTime={stage.endExclusiveInstant}>{instant(stage.endExclusiveInstant)}</time>前</p>
        </header>
        {plain?.domains.length ? <div className="life-stage-narrative">{plain.domains.map(domain => <section key={domain.domain}><h4>{domain.headline}</h4><p>{domain.summary}</p></section>)}</div> : null}
        {relationship ? <section><h4>{relationship.title}</h4><p>{relationship.text}</p></section> : null}
        <details className="life-stage-conditions" open={!plain?.domains.length}><summary>完整阶段原文、可用配合与牵制</summary>
        <p>{clean(stage.headline)}</p>
        <div className="life-stage-narrative">{stage.paragraphs.map((paragraph, index) => <p key={index}>{clean(paragraph)}</p>)}</div>
        {stage.advantages.length || stage.pressures.length ? <div className="life-stage-points">
          {stage.advantages.length ? <section><h4>可借助的部分</h4><ul>{stage.advantages.map((text, index) => <li key={index}>{clean(text)}</li>)}</ul></section> : null}
          {stage.pressures.length ? <section><h4>容易卡住的地方</h4><ul>{stage.pressures.map((text, index) => <li key={index}>{clean(text)}</li>)}</ul></section> : null}
        </div> : null}
        </details>
        <details className="life-stage-conditions"><summary>本步大运的判断与适用条件</summary><p>{clean(stage.caption)}</p><ul>{stage.conditions.map((text, index) => <li key={index}>{clean(text)}</li>)}</ul></details>
      </PersonalSources>
    </PersonalReadingScope>
    {onFeedback ? <a className="life-stage-feedback" href="#reading-feedback" onClick={() => onFeedback(subject)}>反馈这步大运的说明</a> : null}
    {children}
    {transition && next ? <section className="life-stage-transition" aria-label="相邻大运的变化" data-stage-transition={transition.id}>
      <PersonalReadingScope subjectId={lifeStageStoryTransitionSubjectId(story, transition)} expectedSource={story.sourceBinding}>
        <PersonalSources entries={lifeStageStoryPersonalSources(story, transition, personal, life).filter((entry) => entry.subjectId !== lifeStageStoryTransitionSubjectId(story, transition))}>
          <p className="life-stage-kicker">接下来 · <time dateTime={transition.atInstant}>{instant(transition.atInstant)}</time> 交运</p>
          <h4>{nextPlain?.domains.length ? `转入${next.ganZhi}大运：${nextPlain.caption}` : clean(transition.headline)}</h4>
          {nextPlain?.domains.map(domain => <p key={domain.domain}>{domain.summary}</p>)}
          <details open={!nextPlain?.domains.length}><summary>交运前后的完整原解释</summary><p>{clean(transition.headline)}</p>
            {transition.paragraphs.map((paragraph, index) => <p key={index}>{clean(paragraph)}</p>)}
          </details>
        </PersonalSources>
      </PersonalReadingScope>
      <div className="life-stage-transition-actions">
        {onSelectDecade ? <a href="#reading-life-stage" onClick={() => onSelectDecade(next.decadeId)}>读下一步：{next.ganZhi}大运 →</a> : null}
        {onFeedback ? <a href="#reading-feedback" onClick={() => onFeedback(lifeStageStoryTransitionSubjectId(story, transition))}>反馈这次阶段变化</a> : null}
      </div>
    </section> : null}
  </section>;
}
