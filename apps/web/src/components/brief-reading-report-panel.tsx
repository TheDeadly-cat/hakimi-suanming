import { ArrowRight } from "lucide-react";
import type { BriefReadingBlock, BriefReadingEventItem, BriefReadingReport, BriefReadingYear, BriefReadingYearSegment } from "../lib/brief-reading-report";
import { revealReadingSection } from "./reading-section-navigation";
import "./brief-reading-report-panel.css";

export interface BriefReadingReportPanelProps {
  report: BriefReadingReport;
  variant?: "summary" | "years" | "full";
  onSelectYear?: (year: number) => void;
}

function ReadingLink({ href, children, onSelect }: { href: string; children: string; onSelect?: () => void }) {
  const destination = /^#reading-[\w-]+$/u.test(href) ? href : "#reading-full-report";
  return <a className="brief-reading-link" href={destination} onClick={() => {
    onSelect?.(); revealReadingSection(destination.slice(1));
  }}>{children}<ArrowRight size={14} aria-hidden="true" /></a>;
}

function PersonalOriginal({ block, report }: { block: Pick<BriefReadingBlock, "personalTextIds">; report: BriefReadingReport }) {
  const entries = report.personalTexts.filter(item => block.personalTextIds.includes(item.id));
  return entries.length ? <details className="brief-reading-personal"><summary>查看已采用的个人原文</summary>
    {entries.map(item => <section key={item.id}><h5>{item.title}</h5><p>{item.text}</p></section>)}
  </details> : null;
}

function NatalConclusion({ report }: { report: BriefReadingReport }) {
  const reading = report.natalConclusion;
  if (!reading) return null;
  const original = reading.original, score = original.scoreBasis;
  const blocks = [reading.pattern, reading.firstChoice, ...reading.secondChoices, ...reading.avoid];
  return <section className="brief-natal-conclusion" id="reading-natal-conclusion" aria-label="格局与喜用采用结论" tabIndex={-1}>
    <header><span>本盘采用结论</span><h2>格局、首用与辅助次序</h2></header>
    <dl>{blocks.map(block => <div key={block.id} data-natal-conclusion={block.id} data-conclusion-origin={block.origin}>
      <dt>{block.title}</dt><dd><h3>{block.headline}</h3><p>{block.text}</p><PersonalOriginal block={block} report={report} /></dd>
    </div>)}</dl>
    <details className="brief-reading-personal brief-natal-basis"><summary>展开得分、古籍与取用次序</summary>
      {blocks.some(block => block.origin === "personal") ? <p>这里保留系统原始依据；已采用的个人文字请以上方原文为准。</p> : null}
      <h3>后台得分怎样参与判断</h3>
      <p>生扶权重 {score.supportWeight} · 克泄耗权重 {score.demandWeight}</p>
      <p>原计权：{score.rawLabel}；当前结构判断：{score.workingLabel}。</p>
      <p>{score.explanation}</p>
      {score.sensitivityLabel ? <p>{score.sensitivityLabel}</p> : null}
      <h3>为什么这样排先后</h3>
      {[original.firstChoice, ...original.secondChoices].map(choice => <section key={choice.id}>
        <h4>{choice.title}</h4><p>{choice.priorityReason}</p><p>{choice.availability}</p>
        {choice.conditions.map((condition, index) => <p key={index}>{condition}</p>)}
      </section>)}
      {original.retainedRoles.length ? <details className="brief-reading-personal"><summary>其他十神的分工</summary>
        {original.retainedRoles.map(choice => <section key={choice.id}><h4>{choice.title}</h4><p>{choice.decision}</p><p>{choice.priorityReason}</p></section>)}
      </details> : null}
      <h3>古籍依据与本盘用法</h3>
      {original.sources.map(source => {
        let url: string | null = null;
        try { const parsed = new URL(source.url); if (parsed.protocol === "https:" && !parsed.username && !parsed.password) url = parsed.href; } catch { /* Keep text without an invalid link. */ }
        return <section key={source.id}><h4>{source.title}</h4><p>{source.locator}</p>
          <blockquote>{source.excerpt}</blockquote><p>{source.usageNote}</p>
          {url ? <a className="brief-reading-link" href={url} target="_blank" rel="noreferrer">查看古籍来源</a> : null}
        </section>;
      })}
      <p>上方采用结论是结合本盘计算与古籍条目的本地综合解释。</p>
    </details>
  </section>;
}

function EventItem({ item, report, onSelectYear }: { item: BriefReadingEventItem; report: BriefReadingReport; onSelectYear?: (year: number) => void }) {
  return <div className="brief-event-item" data-event-level={item.level} data-event-year={item.year} data-event-origin={item.origin}>
    <div className="brief-event-date"><a className="brief-reading-year-link" href={item.detailsRef}
      aria-label={`${item.label}的${item.headline}判断依据`}
      onClick={() => { onSelectYear?.(item.year); revealReadingSection("reading-yearly"); }}>{item.label}</a>
      {item.origin !== "personal" ? <span>{item.levelLabel}</span> : <span>已采用个人修订</span>}
    </div>
    <p>{item.text}</p>
    <PersonalOriginal block={item} report={report} />
    {item.keyMonthsLoaded ? <div className="brief-key-months" aria-label={`${item.label}的关键月份`}>
      {item.keyMonths?.length ? item.keyMonths.map(month => <section key={`${month.id}-${month.startInstant}`} data-key-month={month.original.scope.monthId} data-key-month-origin={month.origin}>
        <h4>{month.label}<span>{month.monthGanZhi} · {month.levelLabel}</span></h4>
        <p>{month.text}</p><PersonalOriginal block={month} report={report} />
        <details className="brief-reading-personal"><summary>展开本月依据</summary>
          {month.origin === "personal" ? <p>本月结论已采用个人原文，下列保留计算来源。</p> : null}
          {month.evidence.map(evidence => <p key={evidence.id}>{evidence.text}</p>)}
          {month.original.conditions.map((condition, index) => <p key={index}>{condition}</p>)}
          <ReadingLink href={month.detailsRef} onSelect={() => onSelectYear?.(month.year)}>查看本年全部流月</ReadingLink>
        </details>
      </section>) : <p className="brief-key-months-empty">已核本年流月，未见更突出的对应月份，保留全年倾向。</p>}
    </div> : null}
    {item.origin !== "personal" && item.original ? <details className="brief-reading-personal brief-event-evidence">
      <summary>为什么这样判断</summary>
      {item.original.evidence.filter(evidence => evidence.use === "support").map(evidence => <p key={evidence.id}>{evidence.original}</p>)}
      {item.original.conditions.map((condition, index) => <p key={index}>{condition}</p>)}
      {item.original.evidence.some(evidence => evidence.use === "counter") ? <div><h5>还需结合的因素</h5>
        {item.original.evidence.filter(evidence => evidence.use === "counter").map(evidence => <p key={evidence.id}>{evidence.original}</p>)}
      </div> : null}
      <ReadingLink href={item.detailsRef} onSelect={() => onSelectYear?.(item.year)}>查看本年完整依据</ReadingLink>
    </details> : null}
  </div>;
}

function EventOutlook({ report, onSelectYear }: { report: BriefReadingReport; onSelectYear?: (year: number) => void }) {
  if (!report.eventOutlook?.length) return null;
  return <section className="brief-event-outlook" aria-label="具体事件与对应年份">
    <header><span>{report.coverage.fromYear}—{report.coverage.toYear}</span><h2>重点年份与关键月份</h2>
      <p>按事件看年份，再看关键月份；判断依据可展开。</p></header>
    <div className="brief-event-list">{report.eventOutlook.map(event => <section key={event.category} data-event-category={event.category}>
      <h3>{event.title}</h3><div>
        {event.branches.map(branch => <div key={branch.branchId} data-event-branch={branch.branchId}>
          {event.branches.length > 1 ? <h4>{branch.branchLabel}</h4> : null}
          {branch.items.map(item => <EventItem key={item.id} item={item} report={report} onSelectYear={onSelectYear} />)}
          {!branch.items.length && event.branches.length > 1 ? <p className="brief-event-empty">这一路径未见突出的自动判断年份。</p> : null}
        </div>)}
        {!event.branches.some(branch => branch.items.length) ? <p className="brief-event-empty">{event.emptyText}</p> : null}
        {event.personalPeriods.length ? <details className="brief-reading-personal"><summary>查看已采用修订的时段</summary>
          {event.personalPeriods.map(item => <EventItem key={item.id} item={item} report={report} onSelectYear={onSelectYear} />)}
        </details> : null}
      </div>
    </section>)}</div>
    {report.eventSupportNote ? <p className="brief-event-note">{report.eventSupportNote}</p> : null}
  </section>;
}

const dateLabel = (instant: string, year: number) => {
  const date = new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 10);
  return `${Number(date.slice(0, 4)) === year ? "" : `${date.slice(0, 4)}/`}${date.slice(5).replace("-", "/")}`;
};

function SegmentDomains({ segment, report }: { segment: BriefReadingYearSegment; report: BriefReadingReport }) {
  return <dl>{segment.domains.filter(domain => domain.showInBrief !== false).map(domain => <div key={domain.domain} data-brief-domain={domain.domain}>
    <dt>{domain.title}</dt><dd>{domain.headline && domain.headline !== domain.text ? <strong>{domain.headline}</strong> : null}<p>{domain.text}</p>
      <PersonalOriginal block={domain} report={report} /></dd>
  </div>)}</dl>;
}

function YearReading({ year, report, onSelectYear }: { year: BriefReadingYear; report: BriefReadingReport; onSelectYear?: (year: number) => void }) {
  const focus = year.focusReasons.flatMap(reason => reason === "当前参考年" ? ["今年重点"]
    : reason === "本年交运，前后分看" ? ["交运前后有变化"] : reason === "本年有独立相处线索" ? ["感情与相处"] : []);
  return <article className="brief-reading-year" aria-label={`${year.year}年简明判断`} data-brief-year={year.year}>
    <header><div><h3>{year.year}<small>{year.yearGanZhi}</small></h3>
      {focus.length ? <p className="brief-reading-year-focus">{focus.join(" · ")}</p> : null}</div>
      <ReadingLink href="#reading-yearly" onSelect={() => onSelectYear?.(year.year)}>展开本年依据</ReadingLink></header>
    {year.branches.map(branch => <div key={branch.id} className="brief-reading-branch" data-branch-id={branch.id}>
      {year.branches.length > 1 ? <h4>{branch.label}</h4> : null}
      {branch.segments.map(segment => <section className="brief-reading-segment" key={segment.id} data-segment-id={segment.id}>
        <div className="brief-reading-period">{segment.domains.some(domain => domain.headline) ? null : <span>{segment.caption}</span>}
          {branch.segments.length > 1 ? <span><time dateTime={segment.startInstant}>{dateLabel(segment.startInstant, year.year)}</time>—<time dateTime={segment.endExclusiveInstant}>{dateLabel(segment.endExclusiveInstant, year.year)}</time>前</span> : null}</div>
        {segment.sharedNarrativeWith ? <details className="brief-reading-personal">
          <summary>本段判断与上一时段相同，展开查看</summary><SegmentDomains segment={segment} report={report} />
        </details> : <SegmentDomains segment={segment} report={report} />}
      </section>)}
    </div>)}
  </article>;
}

function YearOverview({ report, onSelectYear }: { report: BriefReadingReport; onSelectYear?: (year: number) => void }) {
  if (!report.yearOverview?.length) return null;
  return <section className="brief-reading-overview" aria-label="事业财运感情年份总判">
    <header><span>{report.coverage.fromYear}—{report.coverage.toYear}</span><h2>先看哪些年份较顺，哪些年份有变化</h2></header>
    {report.yearOverview.map(domain => <section key={domain.domain} data-year-overview-domain={domain.domain}>
      <h3>{domain.title}</h3>
      {domain.groups.length ? <dl>{domain.groups.map(group => <div key={group.id} data-overview-group={group.id}>
        <dt>{group.label}</dt><dd>{group.items.map(item => <a
          key={`${item.year}-${item.branchId}-${item.segmentId}`} className="brief-reading-year-link" href={item.detailsRef}
          aria-label={`${report.coverage.branchLabels.length > 1 ? `${item.branchLabel}·` : ""}${item.label}的${domain.title}判断依据`}
          onClick={() => { onSelectYear?.(item.year); revealReadingSection("reading-yearly"); }}>
          {item.label}
        </a>)}</dd>
      </div>)}</dl> : domain.emptyText ? <p>{domain.emptyText}</p> : null}
      {domain.personalPeriods.length ? <p className="brief-reading-overview-personal">
        {domain.personalPeriods.map(item => item.label).join("、")}已采用个人修订，见对应年份原文。
      </p> : null}
    </section>)}
  </section>;
}

function PlainMain({ report }: { report: BriefReadingReport }) {
  const plain = report.plainReading!;
  return <>
    <div className="brief-reading-intro"><span>先读结论</span><span title={plain.metrics.estimateNote}>约 {plain.metrics.estimatedMinutes} 分钟</span></div>
    <section className="brief-reading-current" aria-label="整盘明确结论">
      <h2>先说结论</h2>{plain.introduction.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <PersonalOriginal block={{ personalTextIds: plain.introductionPersonalTextIds }} report={report} />
    </section>
    <section className="brief-reading-domains" aria-label="事业财运感情完整白话解读">
      {plain.domains.map(domain => <section key={domain.id} data-plain-domain={domain.id} className={domain.title.length > 4 ? "brief-reading-domain--wide-title" : undefined}>
        <h2>{domain.title}</h2><div><h3>{domain.headline}</h3>
          {domain.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <PersonalOriginal block={domain} report={report} />
          <ReadingLink href={domain.detailsRef}>展开判断依据</ReadingLink>
        </div>
      </section>)}
    </section>
    <details className="brief-reading-personal brief-reading-background"><summary>格局、喜用与古籍依据</summary>
      <NatalConclusion report={report} />
    </details>
    {plain.limitations.length ? <p>{plain.limitations.join(" ")}</p> : null}
  </>;
}

const exactPeriod = (from: string, to: string) => {
  const format = (value: string) => new Date(Date.parse(value) + 8 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  return `${format(from)}起至${format(to)}前 · 北京时间`;
};
function PlainYears({ report, onSelectYear }: { report: BriefReadingReport; onSelectYear?: (year: number) => void }) {
  const outlook = report.plainReading!.outlook;
  return <section className="brief-reading-years" aria-label="逐年关键月份与可能发生的事">
    <header className="brief-reading-years-heading"><span>按年份细看</span>
      <h2>{report.coverage.fromYear}—{report.coverage.toYear}：年份、月份与可能发生的事</h2>
      <p>{outlook.coverageText}</p><p>{outlook.scopeText}</p>
    </header>
    {outlook.branches.map(branch => <div key={branch.id} className="brief-reading-branch" data-plain-branch={branch.id}>
      {outlook.branches.length > 1 ? <h3>{branch.label}</h3> : null}
      {branch.years.map(year => <article className="brief-reading-year" key={year.year} aria-label={`${year.year}年白话解读`} data-plain-year={year.year}>
        <header><h3>{year.year}<small>{year.ganZhi}</small></h3>
          <ReadingLink href="#reading-yearly" onSelect={() => onSelectYear?.(year.year)}>查看本年全部流月</ReadingLink>
        </header>
        {year.segments.map(segment => <section key={segment.id} className="brief-reading-segment" data-plain-segment={segment.id}>
          <p className="brief-reading-period">{exactPeriod(segment.startInstant, segment.endExclusiveInstant)}</p>
          <h4>{segment.judgmentText}</h4>
          <dl>{segment.domains.map(domain => <div key={domain.domain} data-plain-year-domain={domain.domain}>
            <dt>{domain.title}</dt><dd>{domain.headline && domain.headline !== domain.text ? <strong>{domain.headline}</strong> : null}<p>{domain.text}</p><PersonalOriginal block={domain} report={report} /></dd>
          </div>)}</dl>
          {segment.events.filter(event => event.origin === "personal" || (event.showInMain !== false && event.months.length === 0)).map(event => <section className="brief-event-item" key={event.id} data-plain-event={event.category}>
            <h4>{event.title} · {event.levelLabel}</h4><p>{event.text}</p><PersonalOriginal block={event} report={report} />
            {event.months.map(month => <div className="brief-key-months" key={month.original.id}>
              <h5>{month.label} · {month.levelLabel}</h5><p>{month.text}</p><PersonalOriginal block={month} report={report} />
            </div>)}
          </section>)}
          <h4>关键月份的机会与阻力</h4><p>{segment.monthCoverageText}</p>
          {segment.monthWindows.filter(window => window.featured !== false).map(window => <section key={window.id} className="brief-key-months" data-month-effect={window.effect ?? "personal"}>
            <h5>{exactPeriod(window.startInstant, window.endExclusiveInstant)} · {window.label}</h5>
            <p>{window.text}</p><PersonalOriginal block={window} report={report} />
          </section>)}
        </section>)}
      </article>)}
    </div>)}
    {outlook.gaps.length ? <p role="status">{outlook.gaps.join(" ")}</p> : null}
  </section>;
}

export function BriefReadingReportPanel({ report, variant = "full", onSelectYear }: BriefReadingReportPanelProps) {
  const featured = report.years.filter(year => year.featured), otherYears = report.years.filter(year => !year.featured);
  return <div className={`brief-reading-report brief-reading-report--${variant}`} data-brief-report-version={report.version}>
    {variant !== "years" ? report.plainReading ? <PlainMain report={report} /> : <>
      <div className="brief-reading-intro"><span>先读结论</span><span title={report.metrics.estimateNote}>约 {report.metrics.estimatedMinutes} 分钟</span></div>
      <NatalConclusion report={report} />
      <EventOutlook report={report} onSelectYear={onSelectYear} />
      {report.eventOutlook?.length ? <details className="brief-reading-personal brief-reading-background">
        <summary>展开事业、财运、感情的整体年份分布</summary>
        <YearOverview report={report} onSelectYear={onSelectYear} />
      </details> : <YearOverview report={report} onSelectYear={onSelectYear} />}
      <div className="brief-reading-domains" aria-label="事业财运感情简明结论">{report.domainCards.map(card => <section key={card.id} data-brief-domain={card.id} className={card.title.length > 4 ? "brief-reading-domain--wide-title" : undefined}>
        <h2>{card.title}</h2><div>{card.headline !== card.title ? <h3>{card.headline}</h3> : null}<p>{card.text}</p><PersonalOriginal block={card} report={report} />
          <ReadingLink href={card.detailsRef}>展开判断依据</ReadingLink></div>
      </section>)}</div>
      {report.currentStages.length ? <section className="brief-reading-current"><h2>当前阶段</h2>{report.currentStages.map(stage => <div key={stage.id}>
        {report.currentStages.length > 1 ? <p className="brief-reading-branch-label">{stage.branchLabel}</p> : null}
        <h3>{stage.headline}</h3><p>{stage.text}</p><PersonalOriginal block={stage} report={report} />
        <ReadingLink href={stage.detailsRef}>展开这步大运</ReadingLink>
      </div>)}</section> : null}
    </> : null}
    {variant !== "summary" && report.plainReading ? <PlainYears report={report} onSelectYear={onSelectYear} /> : null}
    {variant !== "summary" && report.plainReading ? <details className="brief-reading-personal"><summary>按事件查看年份与原判断</summary>
      <EventOutlook report={report} onSelectYear={onSelectYear} /><YearOverview report={report} onSelectYear={onSelectYear} />
    </details> : null}
    {variant !== "summary" ? <section className="brief-reading-years" aria-label="主报告重点年份">
      <header className="brief-reading-years-heading"><span>按年份细看</span><h2>逐年判断与完整依据</h2><p>{report.coverage.text}</p></header>
      <details className="brief-reading-other-years" open={report.eventOutlook?.length ? undefined : true}><summary>展开 {report.coverage.totalYears} 年的逐年判断</summary>
      {featured.map(year => <YearReading key={year.id} year={year} report={report} onSelectYear={onSelectYear} />)}
      {otherYears.length ? <details className="brief-reading-other-years"><summary>其余 {otherYears.length} 年的简明判断</summary>
        {otherYears.map(year => <YearReading key={year.id} year={year} report={report} onSelectYear={onSelectYear} />)}
      </details> : null}
      </details>
      {report.relationshipScopeText || report.coverage.gaps.length ? <details className="brief-reading-personal"><summary>判断范围与说明</summary>
        {report.relationshipScopeText ? <p>{report.relationshipScopeText}</p> : null}
        {report.coverage.gaps.length ? <ul>{report.coverage.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul> : null}
      </details> : null}
    </section> : null}
  </div>;
}
