import { useId, useMemo } from "react";
import type { LocalAnnualEventReading } from "../lib/local-annual-event-reading";
import { annualEventFeedbackSubjectId } from "../lib/local-annual-event-record";
import { composeAnnualEvents, type AnnualEventCompositionItem, type AnnualEventCompositionSegment } from "../lib/local-annual-event-composition";
import { annualEventCompositionSubjectId } from "../lib/local-annual-event-composition-record";
import { PersonalReadingScope, usePersonalReading } from "./personal-reading-note";
import { hasLegacyPersonalAdoption, personalAdoptionLabel } from "../lib/local-personal-reading-legacy";
import { ANNUAL_LIFE_STORY_VERSION, type AnnualLifeStory, type AnnualLifeStorySegment } from "../lib/annual-life-story";
import { annualLifeStorySubjectId } from "../lib/annual-life-story-record";
import { annualReaderParagraphLabel, buildAnnualReaderAnswer } from "../lib/annual-reader-answer";
import type { LocalAnnualYear } from "../lib/local-annual-outlook";
import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalPersonalReadingEntry } from "../lib/local-personal-reading";
import { safeVisibleText } from "../lib/visible-text";
import "./annual-event-reading-panel.css";

export interface AnnualEventReadingPanelProps {
  reading: LocalAnnualEventReading | null;
  onFeedback?: (subjectId: string) => void;
  annualLifeStory?: AnnualLifeStory | null;
  annualYear?: LocalAnnualYear | null;
  revision?: RevisionRecord;
  assessment?: BaziPreliminaryAssessment;
  annualLifeStoryPersonalSources?: Record<string, LocalPersonalReadingEntry[]>;
}
type Branch = LocalAnnualEventReading["branches"][number];
type Segment = Branch["segments"][number];
type Item = Segment["items"][number];
type ReaderAnswer = NonNullable<ReturnType<typeof buildAnnualReaderAnswer>>;
const instantFormatter = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const instantLabel = (instant: string) => instantFormatter.format(new Date(instant));
const clean = (text: string) => safeVisibleText(text, "", 12_000);
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
type SourceBinding = LocalAnnualEventReading["sourceBinding"];
const sameSource = (left: SourceBinding, right: SourceBinding) => (["caseId", "revisionId", "chartResultHash", "includeHour"] as const).every((key) => left[key] === right[key]);
const eventAnchor = (prefix: string, segmentId: string, itemId: string) => `${prefix}-${segmentId}-${itemId}`;
const readerNarrative = (answer: ReaderAnswer | undefined) => answer ? {
  headline: answer.headline, paragraphs: answer.paragraphs.map((paragraph) => ({ kind: paragraph.kind, text: paragraph.text, label: annualReaderParagraphLabel(paragraph) })),
} : null;
const storyParagraphLabels: Record<AnnualLifeStorySegment["paragraphs"][number]["kind"], string> = {
  mainline: "今年重点", support: "较有利的环节", pressure: "主要阻力",
  coordination: "事项之间的联系", relationship: "关系另看",
};

// Compare reading prose only. Time, age labels, background and evidence remain
// attached to their own segment; matching prose never merges their judgments.
function narrativeKey(segment: AnnualEventCompositionSegment, story: AnnualLifeStorySegment) {
  return JSON.stringify({
    caption: segment.judgmentCaption, judgmentVersion: story.judgmentVersion, policyVersion: story.policyVersion, sourceVersions: story.sourceVersions,
    ageStages: [segment.age.stage, segment.age.segments.map((part) => part.stage)],
    headline: story.headline, paragraphs: story.paragraphs.map(({ kind, text }) => ({ kind, text })),
    items: segment.items.map((item) => ({ kind: item.kind, title: item.kind === "settlement" ? item.title : null, summary: item.kind === "settlement" ? item.summary : null,
      members: item.members.map(({ title, summary, domain, priority, examples, applicability, notApplicableWhen }) =>
        ({ title, summary, domain, priority, examples, applicability, notApplicableWhen })) })),
  });
}

function segmentSubjects(story: AnnualLifeStory, segment: AnnualLifeStorySegment, events: AnnualEventCompositionSegment) {
  return new Set([`annual-${story.year}`, annualLifeStorySubjectId(story, segment), ...segment.sourceSubjects,
    ...segment.paragraphs.flatMap((paragraph) => paragraph.sourceSubjects),
    ...events.items.flatMap((item) => [annualEventCompositionSubjectId(story.year, events, item),
      ...item.members.map((member) => annualEventFeedbackSubjectId(story.year, events, member))])]);
}

function bindsLifeStory(story: AnnualLifeStory, original: LocalAnnualEventReading): boolean {
  return story.version === ANNUAL_LIFE_STORY_VERSION && story.year === original.year && story.yearGanZhi === original.yearGanZhi
    && story.startInstant === original.startInstant && story.endExclusiveInstant === original.endExclusiveInstant && story.status === original.status
    && same(story.yearNodeRef, original.yearNodeRef) && same(story.contextRef, original.contextRef)
    && (["caseId", "revisionId", "chartResultHash", "includeHour"] as const).every((key) => story.sourceBinding[key] === original.sourceBinding[key])
    && [original.version, ...original.sourceVersions].every((version) => story.sourceVersions.includes(version))
    && story.branches.length === original.branches.length && story.branches.every((branch, index) => {
      const source = original.branches[index]!;
      return branch.id === source.id && branch.label === source.label && branch.segments.length === source.segments.length
        && branch.segments.every((segment, position) => {
          const sourceSegment = source.segments[position]!;
          return segment.id === sourceSegment.id && segment.branchId === sourceSegment.branchId
            && segment.startInstant === sourceSegment.startInstant && segment.endExclusiveInstant === sourceSegment.endExclusiveInstant
            && segment.personalStartInstant === sourceSegment.personalStartInstant && segment.caption === sourceSegment.judgmentCaption
            && same(segment.age, sourceSegment.age) && same(segment.backgroundRefs, sourceSegment.backgroundRefs)
            && same(segment.backgroundLabels, sourceSegment.backgroundLabels);
        });
    });
}

function AnnualLifeSummary({ story, segment, sources, onFeedback, events, anchorPrefix, preserveFullText, answer }: {
  story: AnnualLifeStory; segment: AnnualLifeStorySegment; sources: LocalPersonalReadingEntry[];
  onFeedback?: (subjectId: string) => void;
  events: AnnualEventCompositionSegment; anchorPrefix: string; preserveFullText: boolean;
  answer?: ReaderAnswer;
}) {
  const subject = annualLifeStorySubjectId(story, segment);
  const dependencies = sources.filter((entry) => entry.subjectId !== subject);
  const originalAutomatic = <>
    <h6>{clean(segment.headline)}</h6>
    {segment.paragraphs.map((paragraph) => {
      // Only relocate an exact repeat bound to a concrete item in THIS segment.
      // The full source text and feedback payload remain unchanged.
      const repeated = !preserveFullText && paragraph.kind === "relationship"
        ? events.items.flatMap((item) => item.members).find((item) => paragraph.eventItemIds.includes(item.id) && item.summary === paragraph.text)
        : undefined;
      return repeated ? <p key={paragraph.id} className="annual-life-summary-related">
        <a href={`#${encodeURIComponent(eventAnchor(anchorPrefix, segment.id, repeated.id))}`}>关系重点 · {repeated.title} →</a>
      </p> : <div key={paragraph.id} className={`annual-life-summary-point annual-life-summary-point-${paragraph.kind}`}>
        <span className="annual-life-summary-label">{storyParagraphLabels[paragraph.kind]}</span>
        <p data-annual-story-kind={paragraph.kind}>{paragraph.text}</p>
      </div>;
    })}
    <Conditions title="这段总评的适用条件" items={segment.conditions} />
  </>;
  const automatic = answer ? <div data-annual-reader-version={answer.version}>
    <h6>{clean(answer.headline)}</h6>
    {answer.paragraphs.filter(paragraph => !paragraph.detailsOnly).map((paragraph) => <div key={paragraph.id} className={`annual-life-summary-point annual-life-summary-point-${paragraph.kind}`}>
      <span className="annual-life-summary-label">{annualReaderParagraphLabel(paragraph)}</span>
      <p data-annual-reader-kind={paragraph.kind}>{paragraph.text}</p>
    </div>)}
    {segment.paragraphs.filter((paragraph) => paragraph.kind === "relationship" && !answer.paragraphs.some(item => item.kind === "relationship" && !item.detailsOnly)).map((paragraph) => {
      const event = events.items.flatMap((item) => item.members).find((item) => paragraph.eventItemIds.includes(item.id) && item.summary === paragraph.text);
      return event && !preserveFullText ? <p key={paragraph.id} className="annual-life-summary-related"><a href={`#${encodeURIComponent(eventAnchor(anchorPrefix, segment.id, event.id))}`}>关系重点 · {event.title} →</a></p>
        : <p key={paragraph.id}>{paragraph.text}</p>;
    })}
    <Conditions title="这段解读的适用条件" items={answer.conditions} />
    <details className="annual-event-reading-evidence"><summary>查看年度原判断与作用依据</summary>
      {answer.paragraphs.filter(paragraph => paragraph.detailsOnly).map(paragraph => <div key={paragraph.id}><strong>{annualReaderParagraphLabel(paragraph)}</strong><p data-annual-reader-kind={paragraph.kind}>{paragraph.text}</p></div>)}
      <p>{segment.caption}</p>{originalAutomatic}<p>阅读表述版本：{answer.version}</p></details>
  </div> : originalAutomatic;
  return <section className="annual-life-summary" aria-label="这一时段的年度总评" data-annual-story-segment={segment.id}>
    <PersonalReadingScope subjectId={subject} expectedSource={story.sourceBinding}>
      {dependencies.length ? <div className="annual-life-summary-personal">
        <p>这段总评的来源已有你采用的个人修订</p>
        {dependencies.map((entry) => <div key={entry.subjectId}><p>{clean(entry.subjectLabel)}</p>{hasLegacyPersonalAdoption(entry) ? <small>{personalAdoptionLabel(entry)}</small> : null}<blockquote>{entry.personalText ?? ""}</blockquote></div>)}
        <details className="annual-event-reading-evidence"><summary>对照原自动年度总评</summary>{automatic}</details>
      </div> : automatic}
    </PersonalReadingScope>
    {onFeedback ? <a className="annual-event-reading-feedback" href="#reading-feedback" onClick={() => onFeedback(subject)}>反馈这段年度总评</a> : null}
  </section>;
}

function Period({ start, end }: { start: string; end: string }) {
  return <p className="annual-event-reading-period"><time dateTime={start}>{instantLabel(start)}</time> 起至 <time dateTime={end}>{instantLabel(end)}</time>前 · 北京时间</p>;
}

function Conditions({ title, items }: { title: string; items: readonly string[] }) {
  return items.length ? <details className="annual-event-reading-evidence"><summary>{title}</summary><ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null;
}

function EventItem({ year, segment, item, onFeedback, sourceBinding, anchorPrefix }: { year: number; segment: { id: string }; item: Item; onFeedback?: (subjectId: string) => void; sourceBinding: SourceBinding; anchorPrefix?: string }) {
  const subjectId = annualEventFeedbackSubjectId(year, segment, item);
  return <article className="annual-event-reading-item" aria-label={item.title} data-event-id={item.id} id={anchorPrefix ? eventAnchor(anchorPrefix, segment.id, item.id) : undefined}>
    <p className="annual-event-reading-priority">{item.priority === "primary" ? "优先对照" : "同时留意"}</p>
    <PersonalReadingScope subjectId={subjectId} expectedSource={sourceBinding}>
      <h6>{item.title}</h6><p className="annual-event-reading-verdict">{item.summary}</p>
      {item.examples.length ? <ul className="annual-event-reading-examples" aria-label="可对照的具体情境">{item.examples.slice(0, 2).map((text, index) => <li key={index}>{text}</li>)}</ul> : null}
      <details className="annual-event-reading-evidence"><summary>这项情境的完整条件与来源</summary>
        {item.examples.length > 2 ? <><p>其他可对照情境</p><ul>{item.examples.slice(2).map((text, index) => <li key={index}>{text}</li>)}</ul></> : null}
        {item.why.length ? <><p>为什么列出这项情境</p><ul>{item.why.map((text, index) => <li key={index}>{text}</li>)}</ul></> : null}
        {item.conditions.length ? <><p>适用条件</p><ul>{item.conditions.map((text, index) => <li key={index}>{text}</li>)}</ul></> : null}
        {item.evidence.length ? <><p>原判断依据</p><ul>{item.evidence.map((text, index) => <li key={index}>{text}</li>)}</ul></> : null}
        {item.sourceIds.length ? <p>来源条目：{item.sourceIds.join("、")}</p> : null}
        <p>情境规则来源：{JSON.stringify(item.origin)}</p>
      </details>
    </PersonalReadingScope>
    {item.applicability.length ? <div className="annual-event-reading-applicability" aria-label="原判断适用情境"><p>原判断适用情境</p><ul>{item.applicability.map((text, index) => <li key={index}>{text}</li>)}</ul></div> : null}
    <Conditions title="阅读范围与不宜套用的情况" items={item.notApplicableWhen} />
    {onFeedback ? <a className="annual-event-reading-feedback" href="#reading-feedback" onClick={() => onFeedback(subjectId)}>反馈这项情境</a> : null}
  </article>;
}

function SettlementReading({ year, segment, group, onFeedback, sourceBinding, explainedEventIds }: { year: number; segment: AnnualEventCompositionSegment; group: Extract<AnnualEventCompositionItem, { kind: "settlement" }>; onFeedback?: (subjectId: string) => void; sourceBinding: SourceBinding; explainedEventIds?: Set<string> }) {
  const subjectId = annualEventCompositionSubjectId(year, segment, group);
  const applicability = [...new Set(group.members.flatMap((item) => item.applicability))];
  const exclusions = [...new Set(group.members.flatMap((item) => item.notApplicableWhen))];
  return <article className="annual-event-reading-item annual-event-reading-composed" aria-label={group.title} data-composition-id={group.id}>
    <p className="annual-event-reading-priority">{group.members.some((item) => item.priority === "primary") ? "优先对照" : "同时留意"} · 同一事项的两面</p>
    <PersonalReadingScope subjectId={subjectId} expectedSource={sourceBinding}>
      <h6>{group.title}</h6><p className="annual-event-reading-verdict">{group.summary}</p>
    </PersonalReadingScope>
    <div className="annual-event-reading-facets">{group.members.map((item) => <section key={item.id} aria-label={item.domain === "career" ? "事业侧解释" : "资源侧解释"}>
        <p className="annual-event-reading-facet-title">{item.domain === "career" ? "事业侧 · 完成与确认" : "资源侧 · 约定与后续安排"}</p>
        <PersonalReadingScope subjectId={annualEventFeedbackSubjectId(year, segment, item)} expectedSource={sourceBinding}>
          {explainedEventIds?.has(item.id) ? <p>这项说明已在上方年度重点中展开，原文与反馈保留在下方。</p> : <p>{item.summary}</p>}
          {item.examples.length ? <ul className="annual-event-reading-examples">{item.examples.slice(0, 1).map((text, index) => <li key={index}>{text}</li>)}</ul> : null}
        </PersonalReadingScope>
      </section>)}</div>
    {applicability.length ? <div className="annual-event-reading-applicability" aria-label="原判断适用情境"><p>原判断适用情境</p><ul>{applicability.map((text, index) => <li key={index}>{text}</li>)}</ul></div> : null}
    <Conditions title="阅读范围与不宜套用的情况" items={exclusions} />
    {onFeedback ? <a className="annual-event-reading-feedback" href="#reading-feedback" onClick={() => onFeedback(subjectId)}>反馈这项收尾事项</a> : null}
    <details className="annual-event-reading-evidence annual-event-reading-members"><summary>原事业与资源解读、依据和反馈</summary>
      <p>两项原解释及各自个人反馈分别保留。针对某一领域采用的个人修订只用于对应一侧，不会自动替代整项收尾解读。</p>
      {group.members.map((item) => <EventItem key={item.id} year={year} segment={segment} item={item} onFeedback={onFeedback} sourceBinding={sourceBinding} />)}
    </details>
  </article>;
}

function SegmentReading({ year, segment, onFeedback, lifeStory, lifeSegment, personalSources = [], repeatedProse = false, preserveFullText, sourceBinding, anchorPrefix, answer }: {
  year: number; segment: AnnualEventCompositionSegment; onFeedback?: (subjectId: string) => void;
  lifeStory?: AnnualLifeStory | null; lifeSegment?: AnnualLifeStorySegment | null; personalSources?: LocalPersonalReadingEntry[];
  repeatedProse?: boolean; preserveFullText: boolean; sourceBinding: SourceBinding; anchorPrefix: string;
  answer?: ReaderAnswer;
}) {
  const covered = new Set(answer?.coveredEventIds ?? []);
  const explainedEventIds = new Set(!answer && !preserveFullText && lifeSegment ? segment.items.flatMap(item => item.members)
    .filter(item => lifeSegment.paragraphs.some(paragraph => paragraph.kind === "mainline" && paragraph.eventItemIds.includes(item.id) && paragraph.text === item.summary)).map(item => item.id) : []);
  const isCovered = (item: AnnualEventCompositionItem) => !preserveFullText && item.members.length > 0 && item.members.every((member) => covered.has(member.id));
  const renderItem = (item: AnnualEventCompositionItem) => item.kind === "single"
    ? <EventItem key={item.id} year={year} segment={segment} item={item.members[0]} onFeedback={onFeedback} sourceBinding={sourceBinding} anchorPrefix={anchorPrefix} />
    : <SettlementReading key={item.id} year={year} segment={segment} group={item} onFeedback={onFeedback} sourceBinding={sourceBinding} explainedEventIds={explainedEventIds} />;
  const body = <>
    {lifeStory && lifeSegment ? <AnnualLifeSummary story={lifeStory} segment={lifeSegment} sources={personalSources} onFeedback={onFeedback}
      events={segment} anchorPrefix={anchorPrefix} preserveFullText={preserveFullText} answer={answer} /> : null}
    {segment.items.filter((item) => !isCovered(item)).map(renderItem)}
    {segment.items.some(isCovered) ? <details className="annual-event-reading-evidence annual-reader-original-items"><summary>展开事项原文、其他情境与反馈</summary>{segment.items.filter(isCovered).map(renderItem)}</details> : null}
  </>;
  return <section className="annual-event-reading-segment" data-segment-id={segment.id} aria-label={`${instantLabel(segment.startInstant)}起的应事情境`}>
    <p className="annual-event-reading-background">{segment.backgroundLabels.length ? segment.backgroundLabels.join(" · ") : "本段未提供大运背景名称"}</p>
    <Period start={segment.startInstant} end={segment.endExclusiveInstant} />
    <p className="annual-event-reading-age">{segment.ageLabel}{Date.parse(segment.personalStartInstant) > Date.parse(segment.startInstant) ? <> · 个人解读自 <time dateTime={segment.personalStartInstant}>{instantLabel(segment.personalStartInstant)}</time> 起</> : null}</p>
    {!answer ? <p className="annual-event-reading-caption">{segment.judgmentCaption}</p> : null}
    {repeatedProse ? <div className="annual-event-reading-continuation">
      <p className="annual-event-reading-continuation-title">{lifeSegment?.headline}</p>
      <p>生活正文与上一时段相同；本段的时间、年龄与大运背景仍分别保留。</p>
      <details className="annual-event-reading-repeated"><summary>展开本段完整说明、依据与反馈</summary>{body}</details>
    </div> : body}
    <Conditions title="这一时间段的适用条件" items={segment.conditions} />
  </section>;
}

export function AnnualEventReadingPanel({ reading: original, onFeedback, annualLifeStory, annualYear, revision, assessment, annualLifeStoryPersonalSources = {} }: AnnualEventReadingPanelProps) {
  const personal = usePersonalReading(), anchorPrefix = useId();
  const reading = useMemo(() => original ? composeAnnualEvents(original) : null, [original]);
  const story = original && annualLifeStory && bindsLifeStory(annualLifeStory, original) ? annualLifeStory : null;
  const readerAnswers = useMemo(() => {
    const answers = new Map<string, ReaderAnswer>();
    if (story && original && annualYear) for (const branch of story.branches) for (const segment of branch.segments) {
      try {
        const answer = buildAnnualReaderAnswer({ year: annualYear, story, events: original, branchId: branch.id, segmentId: segment.id, revision, assessment });
        const sources = new Set([annualLifeStorySubjectId(story, segment), ...segment.sourceSubjects, ...segment.paragraphs.flatMap((paragraph) => paragraph.sourceSubjects)]);
        if (answer && answer.paragraphs.every((paragraph) => paragraph.sourceSubjects.every((subject) => sources.has(subject)))) answers.set(`${branch.id}:${segment.id}`, answer);
      } catch { /* A stale projection falls back to the original bound reading. */ }
    }
    return answers;
  }, [story, original, annualYear, revision, assessment]);
  if (!reading) return null;
  const personalEntries = personal && sameSource(personal.sourceBinding, reading.sourceBinding) ? personal.entries : [];
  const hasPersonal = (segment: AnnualEventCompositionSegment, lifeSegment: AnnualLifeStorySegment | undefined) => {
    const subjects = story && lifeSegment ? segmentSubjects(story, lifeSegment, segment) : new Set<string>();
    return Boolean(annualLifeStoryPersonalSources[`${reading.year}:${segment.id}`]?.length || personalEntries.some((entry) => subjects.has(entry.subjectId)));
  };
  const hasPersonalReading = reading.status === "ready" || reading.status === "partial";
  const singleStory = story?.branches.length === 1 && story.branches[0]!.segments.length === 1;
  return <section className="annual-event-reading-panel" aria-label={`${reading.year}年应事情境先读`}>
    <p className="annual-event-reading-kicker">{reading.year} 年{reading.yearGanZhi ? ` · ${reading.yearGanZhi}` : ""} · {story ? "年度总评与具体事项" : "情境先读"}</p>
    {!singleStory ? <><h4>{story?.headline ?? reading.headline}</h4><p className="annual-event-reading-summary">{story?.summary ?? reading.summary}</p></> : null}
    {!hasPersonalReading && reading.startInstant && reading.endExclusiveInstant ? <Period start={reading.startInstant} end={reading.endExclusiveInstant} /> : null}
    {reading.branches.map((branch) => <section className="annual-event-reading-branch" key={branch.id} aria-label={branch.label}>
      {reading.branches.length > 1 ? <h5>{branch.label}</h5> : null}
      {hasPersonalReading ? branch.segments.map((segment, index) => {
        const stories = story?.branches.find((item) => item.id === branch.id)?.segments;
        const lifeSegment = stories?.find((item) => item.id === segment.id), previous = branch.segments[index - 1];
        const previousStory = previous && stories?.find((item) => item.id === previous.id);
        const preserveFullText = hasPersonal(segment, lifeSegment);
        const answer = readerAnswers.get(`${branch.id}:${segment.id}`);
        const repeatedProse = Boolean(previous && previousStory && lifeSegment && previous.endExclusiveInstant === segment.startInstant
          && !preserveFullText && !hasPersonal(previous, previousStory) && narrativeKey(previous, previousStory) === narrativeKey(segment, lifeSegment)
          && same(readerNarrative(readerAnswers.get(`${branch.id}:${previous.id}`)), readerNarrative(answer)));
        return <SegmentReading key={segment.id} year={reading.year} segment={segment} onFeedback={onFeedback}
          lifeStory={story} lifeSegment={lifeSegment} sourceBinding={reading.sourceBinding} anchorPrefix={anchorPrefix}
          repeatedProse={repeatedProse} preserveFullText={preserveFullText}
          personalSources={annualLifeStoryPersonalSources[`${reading.year}:${segment.id}`]} answer={answer} />;
      }) : null}
      {branch.gaps.map((gap, index) => <div className="annual-event-reading-gap" key={index}>
        {gap.startInstant && gap.endExclusiveInstant ? <Period start={gap.startInstant} end={gap.endExclusiveInstant} /> : null}<p>{gap.message}</p>
      </div>)}
      <Conditions title="这一分支的适用条件" items={branch.conditions} />
    </section>)}
    <details className="annual-event-reading-evidence"><summary>本年情境的范围与来源</summary>
      {reading.limitations.length ? <ul>{reading.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
      <p>规则版本：{reading.version}</p>{reading.sourceVersions.length ? <p>来源版本：{reading.sourceVersions.join("、")}</p> : null}
    </details>
  </section>;
}
