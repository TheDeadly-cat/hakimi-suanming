import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildAnnualMonthStory } from "./local-annual-month-story";

/** Synthetic chart only; shared by the story record and rendered-view checks. */
export async function annualMonthStoryFixture(sex: "male" | "unspecified" = "male", yearNumber = 2028) {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic year-month delivery", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  const [annual, monthly] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, yearNumber), buildLocalMonthlyOutlook(revision, assessment, yearNumber)]);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: true, startYear: annual.startYear, endYear: annual.endYear, years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  const monthlyDomains = buildMonthlyDomainReadings({ revision, assessment, monthly });
  const source = { revision, assessment, year: annual.years[0]!, annualDomains: annualDomains.years[0]!, annualEvents: annualEvents.years[0]!, monthly, monthlyDomains };
  return { source, annual, annualDomains, annualEvents, story: buildAnnualMonthStory(source) };
}
