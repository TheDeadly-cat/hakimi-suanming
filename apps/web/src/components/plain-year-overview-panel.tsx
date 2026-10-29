import type { LocalAnnualOutlook } from "../lib/local-annual-outlook";
import type { AnnualAnswerPersonalSources } from "../lib/annual-answer-navigation";
import { buildPlainYearOverview, type PlainYearGroup } from "../lib/plain-year-overview";
import { PersonalReadingScope, usePersonalReading } from "./personal-reading-note";
import type { LocalPersonalReading } from "../lib/local-personal-reading";

const GROUPS: [PlainYearGroup, string][] = [["favorable", "比较顺的时段"], ["opportunity", "有改善机会，仍要看具体事情"], ["caution", "推进较费力，需要留意"], ["mixed", "有机会，也容易遇到波折"], ["unclear", "暂看不出明显顺逆"]];
export function PlainYearOverviewPanel({ annual, expectedSource, personalSources, onSelectYear }: { annual: LocalAnnualOutlook; expectedSource: LocalPersonalReading["sourceBinding"]; personalSources?: AnnualAnswerPersonalSources; onSelectYear?: (year: number) => void }) {
  const personal = usePersonalReading();
  if (expectedSource.revisionId !== annual.revisionId || expectedSource.chartResultHash !== annual.chartResultHash
    || annual.years.some(year => year.judgmentSegments.some(segment => segment.judgment.sourceBinding.includeHour !== expectedSource.includeHour))) return <p role="alert">年份与当前命盘不一致，请重新读取。</p>;
  const matchingPersonal = personal && personal.sourceBinding.caseId === expectedSource.caseId && personal.sourceBinding.includeHour === expectedSource.includeHour && personal.sourceBinding.revisionId === annual.revisionId && personal.sourceBinding.chartResultHash === annual.chartResultHash ? personal : null;
  const adoptedYears = new Set(annual.years.filter(year => matchingPersonal?.entries.some(entry => entry.subjectId === `annual-${year.year}` && entry.state === "adopted" && !entry.issues.length && entry.personalText)
    || year.judgmentSegments.some(segment => personalSources?.[`${year.year}:${segment.id}`]?.some(entry => entry.state === "adopted" && !entry.issues.length && entry.personalText))).map(year => year.year));
  const periods = buildPlainYearOverview(annual).filter(period => !adoptedYears.has(period.year));
  return <section className="reading-plain-years" aria-label="哪些年份较顺，哪些年份要注意">
    <h2>{annual.startYear}—{annual.endYear}，先看年份起伏</h2>
    <p>按当前判断列出值得把握和需要留意的时段。交运年份分段显示，点击年份看事业、财运和感情。</p>
    <PersonalReadingScope subjectId="annual-overview" expectedSource={expectedSource}>
      {GROUPS.map(([group, title]) => {
        const rows = periods.filter(period => period.group === group);
        if (!rows.length) return null;
        return <section key={group} className={`reading-plain-year-group reading-plain-year-group--${group}`}><h3>{title}</h3>
          {rows.length ? <ul>{rows.map(period => <li key={`${period.year}:${period.branchId}:${period.segmentId}`}>
            <a href="#reading-yearly" onClick={() => onSelectYear?.(period.year)}>{period.label}</a><span>{period.caption}</span>
          </li>)}</ul> : <p>这段范围内还没有可以明确列为有利的年份。</p>}
        </section>;
      })}
      {adoptedYears.size ? <section className="reading-plain-year-group"><h3>已有你的个人修订</h3><p>{[...adoptedYears].map(year => <a key={year} href="#reading-yearly" onClick={() => onSelectYear?.(year)}>{year}年 · 查看已采用原文</a>)}</p></section> : null}
    </PersonalReadingScope>
  </section>;
}
