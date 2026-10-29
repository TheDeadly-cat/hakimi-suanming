import type { ResearchNoteRecord, RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import type { LocalReadingAnnualEvents } from "./local-annual-event-record";
import type { LocalReadingAnnualLifeStories } from "./annual-life-story";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import type { LocalPersonalReading } from "./local-personal-reading";
import { buildLocalMonthlyOutlook, type LocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildMonthlyDomainReadings, type LocalMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildAnnualMonthStory, type LocalAnnualMonthStory } from "./local-annual-month-story";
import { buildKeyMonthEventTendencies, buildKeyMonthPersonalReading,
  type BuildKeyMonthEventTendenciesInput, type KeyMonthEventTendencies } from "./key-month-event-tendencies";

export interface KeyMonthEventSources {
  revision: RevisionRecord;
  assessment: BaziPreliminaryAssessment;
  annual: LocalAnnualOutlook;
  annualDomains: LocalReadingAnnualDomains;
  annualEvents: LocalReadingAnnualEvents;
  annualLifeStories: LocalReadingAnnualLifeStories;
  contextual?: LocalContextualReadingBundle | null;
  legacySource?: BuildKeyMonthEventTendenciesInput["legacySource"];
}
/** These full inputs stay in memory for verification. The report stores only
 * the selected conclusions and their actual evidence, not twelve copied years. */
export interface PreparedKeyMonthYear {
  year: number;
  monthly: LocalMonthlyOutlook;
  monthlyDomains: LocalMonthlyDomainReadings;
  annualMonthStory: LocalAnnualMonthStory;
  personal: LocalPersonalReading;
  reading: KeyMonthEventTendencies;
}
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

function annualInput(source: KeyMonthEventSources, yearNumber: number) {
  const year = source.annual.years.find(item => item.year === yearNumber);
  const annualDomains = source.annualDomains.years.find(item => item.year === yearNumber);
  const annualEvents = source.annualEvents.years.find(item => item.year === yearNumber);
  const annualLifeStory = source.annualLifeStories.years.find(item => item.year === yearNumber);
  if (!year || !annualDomains || !annualEvents || !annualLifeStory) throw new Error("重点年份缺少同年的完整来源，未借用其他年份的月份。");
  return { revision: source.revision, assessment: source.assessment, annual: source.annual,
    year, annualDomains, annualEvents, annualLifeStory, contextual: source.contextual, legacySource: source.legacySource };
}

export async function prepareKeyMonthYear(source: KeyMonthEventSources, yearNumber: number,
  records: readonly ResearchNoteRecord[]): Promise<PreparedKeyMonthYear> {
  const annual = annualInput(source, yearNumber);
  const monthly = await buildLocalMonthlyOutlook(source.revision, source.assessment, yearNumber);
  const monthlyDomains = buildMonthlyDomainReadings({ revision: source.revision, assessment: source.assessment, monthly, contextual: source.contextual });
  const base = { ...annual, monthly, monthlyDomains };
  const annualMonthStory = buildAnnualMonthStory(base);
  const input = { ...base, annualMonthStory };
  const personal = await buildKeyMonthPersonalReading(input, records);
  const reading = buildKeyMonthEventTendencies({ ...input, personal });
  return { year: yearNumber, monthly, monthlyDomains, annualMonthStory, personal, reading };
}

export function verifyKeyMonthYear(source: KeyMonthEventSources, prepared: PreparedKeyMonthYear): KeyMonthEventTendencies {
  if (prepared.year !== prepared.monthly.year || prepared.year !== prepared.reading.year) throw new Error("关键月份与重点年份不一致。");
  const input: BuildKeyMonthEventTendenciesInput = { ...annualInput(source, prepared.year),
    monthly: prepared.monthly, monthlyDomains: prepared.monthlyDomains, annualMonthStory: prepared.annualMonthStory, personal: prepared.personal };
  const expected = buildKeyMonthEventTendencies(input);
  if (stable(expected) !== stable(prepared.reading)) throw new Error("关键月份的结论或依据已变化，请重新整理后保存。");
  return prepared.reading;
}
