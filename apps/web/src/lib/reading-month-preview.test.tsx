import { beforeAll, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildAnnualDomainReading, ANNUAL_DOMAIN_READING_VERSION } from "./local-annual-domain-reading";
import { buildReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingAnnualLifeStories } from "./annual-life-story";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { prepareKeyMonthYear } from "./key-month-event-source";
import { appendReadingExplanationIndex, buildReadingExplanationIndex, readReadingExplanationIndex, type ReadingExplanationIndex, type ReadingRuleApplication } from "./reading-explanation-index";
import { attachReadingMonthHeadline, bindReadingMonthHeadline, buildReadingMonthPreview, MONTH_PREVIEW_BINDING_VERSION } from "./reading-month-preview";
import { ReadingMonthPreview } from "../components/reading-month-preview";
import { ReadingPlainSummaryCard } from "../components/reading-plain-summary-card";
import { lookupConditionalContentRule } from "./conditional-content-rules";

let index: ReadingExplanationIndex;
const originals = new Map<string, { headline: string; domain: string }>();
const originalBindings = new Map<string, ReadingRuleApplication>();
beforeAll(async () => {
  // The existing dual-direction Q07 fixture, limited to one year. Real producers
  // supply the months, domains and paths; there is no hand-written preview data.
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1990-12-19", time: "11:42",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "合成月度预览回归", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-29T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const annual = await buildLocalAnnualOutlookRange(revision, assessment, 2028, 2028);
  const annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: assessment.sourceBinding.includeHour, startYear: 2028, endYear: 2028,
    years: annual.years.map(year => buildAnnualDomainReading({ revision, assessment, year })) };
  const annualEvents = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
  const annualLifeStories = buildReadingAnnualLifeStories({ revision, assessment, annual, annualDomains, annualEvents });
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, annual });
  const keyMonthYears = [await prepareKeyMonthYear({ revision, assessment, annual, annualDomains, annualEvents, annualLifeStories }, 2028, [])];
  const report = buildBriefReadingReport(assessment, annual, { sourceRevision: revision, comprehensive, synthesis,
    annualDomains, annualEvents, annualLifeStories, keyMonthYears })!;
  index = buildReadingExplanationIndex({ revision, assessment, report, synthesis, generatedAt: "2026-10-29T01:00:00Z" });
  for (const branch of report.plainReading!.outlook.branches) for (const year of branch.years) for (const segment of year.segments)
    for (const window of segment.monthWindows) for (const member of window.members) for (const topic of member.topics)
      {
        const key = `month:${branch.id}:${year.year}:${member.periodId}:${topic.domain}`;
        originals.set(`${revision.id}/${key}`, { headline: topic.text, domain: topic.title });
        originalBindings.set(`${revision.id}/${key}`, bindReadingMonthHeadline({ key, scope: { level: "month", year: year.year,
          branchId: branch.id, startInstant: member.startInstant, endExclusiveInstant: member.endExclusiveInstant }, domain: topic.domain,
          title: topic.title, headline: topic.text, sourceSubjects: topic.sourceSubjects, producerVersion: report.plainReading!.outlook.version }));
      }
}, 60_000);
const months = () => index.conclusions.filter(item => item.scope.level === "month");

it("retains the exact producer headline for every real month and distinguishes two months and domains without opening rows", () => {
  const before = JSON.stringify(index), actualMonths = months();
  expect(actualMonths.length).toBeGreaterThan(60);
  for (const item of actualMonths) {
    const preview = buildReadingMonthPreview(index, item);
    expect(preview.projectionState).toBe("producer_preview");
    expect(preview.meaning).toBe(originals.get(item.stableId)!.headline);
    expect(preview.domainLabel).toBe(originals.get(item.stableId)!.domain);
    expect(preview.scope).toEqual(item.scope);
    expect(preview.sourceConclusionId).toBe(item.stableId);
    expect([...item.evidence.ruleApplications.flatMap(rule => rule.limitations), ...item.evidence.limits]).toContain(preview.conditionSourceText);
    const forbidden = item.evidence.ruleApplications.flatMap(rule => lookupConditionalContentRule(rule.ruleId)?.forbiddenInferences ?? []);
    if (forbidden.some(text => preview.condition.includes(text))) expect(preview.condition).toMatch(/^不能据此认定/u);
  }
  const career = actualMonths.filter(item => item.scope.branchId === "forward" && item.domain === "career");
  const first = career[0]!, second = career.find(item => item.scope.startInstant !== first.scope.startInstant
    && originals.get(item.stableId)!.headline !== originals.get(first.stableId)!.headline)!;
  expect(second).toBeDefined();
  const wealth = actualMonths.find(item => item.scope.branchId === first.scope.branchId && item.scope.startInstant === first.scope.startInstant && item.domain === "wealth")!;
  expect(buildReadingMonthPreview(index, wealth).meaning).not.toBe(buildReadingMonthPreview(index, first).meaning);
  const view = render(<><ReadingMonthPreview index={index} conclusion={first} /><ReadingMonthPreview index={index} conclusion={second} /></>);
  expect(screen.getByText(originals.get(first.stableId)!.headline)).toBeTruthy();
  expect(screen.getByText(originals.get(second.stableId)!.headline)).toBeTruthy();
  expect(view.container.textContent).toContain("2028年");
  expect(view.container.textContent).toContain("顺行路径");
  expect(view.container.querySelectorAll(".reading-month-preview-condition")).toHaveLength(2);
  expect(view.container.textContent).not.toContain("跨18整段成人化");
  expect(JSON.stringify(index)).toBe(before);
});

it("keeps two real branch identities separate even when their original headlines match, and rejects a borrowed binding", () => {
  const actualMonths = months();
  const pair = actualMonths.flatMap(a => actualMonths.filter(b => a.scope.branchId === "forward" && b.scope.branchId === "backward"
    && a.scope.startInstant === b.scope.startInstant && a.domain === b.domain).map(b => [a, b] as const))[0]!;
  expect(pair).toBeDefined();
  const forward = buildReadingMonthPreview(index, pair[0]), backward = buildReadingMonthPreview(index, pair[1]);
  expect(forward.scopeLabel).toContain("顺行路径");
  expect(backward.scopeLabel).toContain("逆行路径");
  expect(forward.sourceConclusionId).not.toBe(backward.sourceConclusionId);
  expect(forward.meaning).toBe(originals.get(pair[0].stableId)!.headline);
  expect(backward.meaning).toBe(originals.get(pair[1].stableId)!.headline);
  const target = pair[0];
  try {
    attachReadingMonthHeadline(target, originalBindings.get(pair[1].stableId)!);
    const result = buildReadingMonthPreview(index, target);
    expect(result.projectionState).toBe("original_required");
    expect(result.meaning).toBe(target.text);
  } finally { attachReadingMonthHeadline(target, originalBindings.get(target.stableId)!); }
});

it.each(["old-index", "producer", "snapshot", "conclusion-version", "conflicting-version", "rule-id", "duplicate", "year", "domain", "interval", "headline"])(
  "fails closed to the complete original with an invalid %s binding", change => {
    const target = months()[0]!, original = structuredClone(target), versions = [...index.sourceSnapshot.sourceVersions];
    const rule = structuredClone(originalBindings.get(target.stableId)!);
    try {
      if (change === "producer") rule.provenance!.producerVersion = "hakimi.plain-ten-year-reading/99.0.0";
      if (change === "snapshot") index.sourceSnapshot.sourceVersions = versions.filter(v => v !== "hakimi.concrete-period-prose/0.4.2");
      if (change === "conclusion-version") target.sourceVersions = target.sourceVersions.filter(v => v !== "hakimi.concrete-period-prose/0.4.2");
      if (change === "conflicting-version") target.sourceVersions.push("hakimi.concrete-period-prose/99.0.0");
      if (change === "rule-id") rule.ruleId = "another-selector";
      if (change === "duplicate") rule.provenance!.factRefs.push(rule.provenance!.factRefs[0]!);
      if (change === "year") target.scope.year = 2029;
      if (change === "domain") target.domain = target.domain === "wealth" ? "career" : "wealth";
      if (change === "interval") target.scope.startInstant = "2028-01-01T00:00:00Z";
      if (change === "headline") rule.decision = "这不是该月份的原提要";
      attachReadingMonthHeadline(target, change === "old-index" ? null : rule);
      expect(buildReadingMonthPreview(index, target).projectionState).toBe("original_required");
      expect(buildReadingMonthPreview(index, target).meaning).toBe(target.text);
    } finally {
      Object.assign(target, original); index.sourceSnapshot.sourceVersions = versions;
      attachReadingMonthHeadline(target, originalBindings.get(target.stableId)!);
    }
  });

it("keeps personal originals intact and never projects a natal or yearly statement as a month", () => {
  const copy = structuredClone(index), target = copy.conclusions.find(item => item.scope.level === "month")!;
  target.origin = "personal";
  target.text = "个人原文；即使有同名模板也不要替换。\n\n第二段也保留。";
  expect(buildReadingMonthPreview(copy, target)).toMatchObject({ projectionState: "personal_original", meaning: target.text,
    condition: "个人原文不作为自动计算或已核实的事实。" });
  expect(() => buildReadingMonthPreview(copy, copy.conclusions.find(item => item.scope.level === "natal")!)).toThrow("原月份");
  expect(() => buildReadingMonthPreview(copy, copy.conclusions.find(item => item.scope.level === "year")!)).toThrow("原月份");
  expect(() => buildReadingMonthPreview(index, { ...months()[0]! })).toThrow("当前索引");
});

it("round trips the existing wire contract and presents an unmatched card by its original title, scope and action", () => {
  const restored = readReadingExplanationIndex(appendReadingExplanationIndex("合成阅读原文", index))!;
  expect(restored).toEqual(index);
  expect(JSON.stringify(index)).not.toContain(MONTH_PREVIEW_BINDING_VERSION);
  const target = restored.conclusions.find(item => item.scope.level === "month")!;
  expect(buildReadingMonthPreview(restored, target).projectionState).toBe("original_required");
  expect(buildReadingMonthPreview(restored, target).meaning).toBe(target.text);
  const open = vi.fn();
  const view = render(<ReadingPlainSummaryCard index={restored} conclusion={target} onOpen={open} />);
  expect(screen.getByRole("heading", { name: target.label })).toBeTruthy();
  expect(screen.getByText("原文阅读")).toBeTruthy();
  expect(view.container.textContent).toContain("2028年");
  expect(view.container.textContent).toContain("顺行路径");
  fireEvent.click(screen.getByRole("button", { name: "查看原文及条件" }));
  expect(open).toHaveBeenCalledOnce();
});
