import { beforeAll, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualEventReading } from "./local-annual-event-reading";
import { buildMonthlyDomainReadings } from "./local-monthly-domain-reading";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import * as bridge from "./annual-month-context";
import { buildAnnualMonthStory, LOCAL_ANNUAL_MONTH_STORY_VERSION, type AnnualMonthStoryDomain, type BuildAnnualMonthStoryInput } from "./local-annual-month-story";
import type { AnnualDomainReading } from "./local-annual-domain-reading";

// These are two user-visible views of the same verified monthly judgment.
// The bridge may add yearly context, but must retain the complete monthly
// meaning and its ordered examples rather than apply another role template.
function expectMonthlyMeaning(read: AnnualMonthStoryDomain, original: AnnualDomainReading) {
  expect(read.summary.endsWith(original.summary)).toBe(true);
  expect(read.title).toBe(original.headline.replace(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]月：/u, ""));
  expect(read.examples.slice(0, original.examples.length)).toEqual(original.examples);
}

async function revisionFor(date: string, sex: "male" | "female" | "unspecified", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic year-month story", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
async function sourceFor(revision: RevisionRecord, yearNumber: number): Promise<BuildAnnualMonthStoryInput> {
  const assessment = buildBaziPreliminaryAssessment(revision);
  const [annual, monthly] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, yearNumber), buildLocalMonthlyOutlook(revision, assessment, yearNumber)]);
  const year = annual.years[0]!, annualDomains = buildAnnualDomainReading({ revision, assessment, year });
  return { revision, assessment, year, annualDomains, annualEvents: buildAnnualEventReading({ revision, assessment, year, domains: annualDomains }),
    monthly, monthlyDomains: buildMonthlyDomainReadings({ revision, assessment, monthly }) };
}
let a: BuildAnnualMonthStoryInput, b: BuildAnnualMonthStoryInput, unknown: BuildAnnualMonthStoryInput;
let childhood: BuildAnnualMonthStoryInput, beforeBirth: BuildAnnualMonthStoryInput, noAnnualRelationship: BuildAnnualMonthStoryInput, resourceWealth: BuildAnnualMonthStoryInput;
beforeAll(async () => {
  const [ar, br, ur, cr, rr] = await Promise.all([revisionFor("1995-08-18", "male"), revisionFor("1995-05-18", "male"), revisionFor("1995-08-18", "unspecified"),
    revisionFor("2019-12-22", "female", "11:23"), revisionFor("1999-01-09", "male", "02:26")]);
  [a, b, unknown, childhood, beforeBirth, noAnnualRelationship, resourceWealth] = await Promise.all([
    sourceFor(ar, 2028), sourceFor(br, 2032), sourceFor(ur, 2028), sourceFor(cr, 2029), sourceFor(ar, 1990), sourceFor(ar, 2026), sourceFor(rr, 2034),
  ]);
}, 60_000);

describe("annual matters connected to twelve actual monthly periods", () => {
  it("retains all months, exact node references, branch periods and complete original captions without nesting source objects", () => {
    for (const input of [a, b, unknown]) {
      const before = structuredClone(input), result = buildAnnualMonthStory(input), context = bridge.buildAnnualMonthContext(input);
      expect(result.version).toBe(LOCAL_ANNUAL_MONTH_STORY_VERSION); expect(result.months).toHaveLength(12);
      expect(result.sourceBinding).toEqual(context.sourceBinding);
      expect(result.sourceVersions).toEqual([...new Set([LOCAL_ANNUAL_MONTH_STORY_VERSION, ...context.sourceVersions])]);
      expect(result.nodes.map((node) => node.key)).toEqual([...new Set(result.nodes.map((node) => node.key))]);
      const refs = new Map(result.nodes.map((node) => [node.key, node.ref]));
      for (const [mi, month] of result.months.entries()) {
        const originalMonth = context.months[mi]!;
        expect([month.monthId, month.startInstant, month.endExclusiveInstant]).toEqual([originalMonth.monthId, originalMonth.startInstant, originalMonth.endExclusiveInstant]);
        for (const [bi, branch] of month.branches.entries()) for (const [pi, period] of branch.periods.entries()) {
          const original = originalMonth.branches[bi]!.periods[pi]!;
          expect([period.id, period.branchId, period.startInstant, period.endExclusiveInstant, period.judgmentCaption]).toEqual([
            original.id, original.branchId, original.startInstant, original.endExclusiveInstant, original.monthlySegment.judgmentCaption]);
          expect(period.domains.map((item) => item.id)).toEqual(["career", "wealth", "relationship"]);
          expect(period).not.toHaveProperty("monthlySegment"); expect(period).not.toHaveProperty("annualSegment");
          for (const domain of period.domains) {
            const link = domain.links.monthlyDomain;
            expect(refs.get(link.targetNodeKey)).toEqual(originalMonth.nodeRef);
            expect(link.backgroundNodeKeys.map((key) => refs.get(key))).toEqual(original.monthlySegment.backgroundRefs);
            expect([link.branchId, link.segmentId, link.domainId, link.startInstant, link.endExclusiveInstant]).toEqual([branch.id, original.monthlySegment.id, domain.id, original.startInstant, original.endExclusiveInstant]);
            for (const annual of domain.links.annualEvents) {
              expect(refs.get(annual.targetNodeKey)).toEqual(input.year.transitNodeRef);
              expect(annual.backgroundNodeKeys.map((key) => refs.get(key))).toEqual(original.annualSegment!.backgroundRefs);
              expect(original.annualSegment!.items.some((item) => item.id === annual.itemId && item.domain === domain.id)).toBe(true);
              expect([annual.branchId, annual.segmentId, annual.startInstant, annual.endExclusiveInstant]).toEqual([branch.id, original.annualSegment!.id, original.annualSegment!.startInstant, original.annualSegment!.endExclusiveInstant]);
            }
            expect(domain.examples.length).toBeGreaterThan(0);
          }
        }
      }
      expect(input).toEqual(before);
      result.nodes[0]!.ref.nodeId = "caller-only"; result.months[0]!.branches[0]!.periods[0]!.domains[0]!.conditions.push("caller-only");
      expect(input).toEqual(before);
    }
  });

  it("connects B's annual confirmation matter differently to monthly confirmation, trial and stable delivery", () => {
    const result = buildAnnualMonthStory(b), context = bridge.buildAnnualMonthContext(b);
    const pick = (label: string) => result.months.find((month) => month.label === label)!.branches[0]!.periods[0]!;
    const first = pick("立春月"), autumn = pick("寒露月"), winter = pick("立冬月");
    expect([first.domains[0]!.phase, autumn.domains[0]!.phase, winter.domains[0]!.phase]).toEqual(["confirmation", "trial", "delivery"]);
    expect(first.judgmentCaption).toBe(autumn.judgmentCaption); expect(autumn.judgmentCaption).toBe(winter.judgmentCaption);
    for (const label of ["立春月", "寒露月", "立冬月"]) {
      const source = context.months.find((month) => month.label === label)!.branches[0]!.periods[0]!.monthlySegment.domains[0]!;
      expectMonthlyMeaning(pick(label).domains[0]!, source);
    }
    expect(new Set([first, autumn, winter].map((period) => period.domains[0]!.summary)).size).toBe(3);
    expect(new Set([first, autumn, winter].map((period) => period.domains[0]!.examples[0])).size).toBe(3);
    expect(new Set([first, autumn, winter].map((period) => period.domains[0]!.links.annualEvents[0]!.itemId))).toEqual(new Set(["career-settlement"]));
    expect(autumn.domains[1]!.summary).not.toBe(autumn.domains[0]!.summary);
    expect(result.limitations.join()).toContain("不表示同一个现实项目必定按月份依次发生");
  });

  it("gives B's task progress and use of inputs different mechanisms rather than appending a resource suffix", () => {
    const result = buildAnnualMonthStory(b), context = bridge.buildAnnualMonthContext(b);
    for (const label of ["立春月", "寒露月", "立冬月"]) {
      const period = result.months.find((month) => month.label === label)!.branches[0]!.periods[0]!;
      const source = context.months.find((month) => month.label === label)!.branches[0]!.periods[0]!.monthlySegment.domains;
      const career = period.domains.find((domain) => domain.id === "career")!, wealth = period.domains.find((domain) => domain.id === "wealth")!;
      expectMonthlyMeaning(career, source.find((item) => item.id === "career")!);
      expectMonthlyMeaning(wealth, source.find((item) => item.id === "wealth")!);
      expect(wealth.summary).not.toContain(source.find((item) => item.id === "career")!.summary);
      expect(wealth.title).not.toContain(career.title); expect(wealth.examples[0]).not.toBe(career.examples[0]);
      expect(career.links.annualEvents[0]!.itemId).toBe("career-settlement");
      expect(wealth.links.annualEvents[0]!.itemId).toBe("wealth-settlement");
      expect(wealth.phase).toBe(career.phase);
      expect([wealth.summary, ...wealth.examples].join()).not.toMatch(/工资|奖金|必然|保证收益|已经到账/u);
    }
  });

  it("keeps A's learning inputs and R4's moderation of support distinct from cash settlement", () => {
    const aPeriod = buildAnnualMonthStory(a).months[0]!.branches[0]!.periods[0]!;
    const aCareer = aPeriod.domains.find((domain) => domain.id === "career")!, aWealth = aPeriod.domains.find((domain) => domain.id === "wealth")!;
    expect(aCareer.summary).toContain("把理解和准备真正用起来");
    expect(aWealth.summary).toContain("已有学习、材料和帮助的实际用途");
    expect(aWealth.examples[0]).toBe(bridge.buildAnnualMonthContext(a).months[0]!.branches[0]!.periods[0]!.monthlySegment.domains.find((item) => item.id === "wealth")!.examples[0]);
    const r4 = buildAnnualMonthStory(resourceWealth).months.find((month) => month.label === "寒露月")!.branches[0]!.periods[0]!;
    const career = r4.domains.find((domain) => domain.id === "career")!, wealth = r4.domains.find((domain) => domain.id === "wealth")!;
    expect(career.summary).toContain("保留真正有用的支持");
    expect(wealth.summary).toContain("仍不可缺的支持");
    expect(wealth.summary).toContain("用途重复的投入");
    expect(wealth.summary).not.toContain(career.summary);
    expect(wealth.evidence.join()).toContain("pattern:resource-wealth");
  });

  it("distinguishes four neutral visible roles and attributes support or pressure to the actual monthly main qi", () => {
    const context = bridge.buildAnnualMonthContext(b), result = buildAnnualMonthStory(b);
    const rows = [
      ["清明月", "正官", "戊", "劫财", "neutral"],
      ["立夏月", "七杀", "丙", "正印", "obstructs"],
      ["立秋月", "劫财", "庚", "伤官", "assists"],
      ["白露月", "比肩", "辛", "食神", "assists"],
    ] as const;
    const summaries: Record<string, string[]> = { career: [], wealth: [] };
    for (const [label, god, stem, hiddenGod, effect] of rows) {
      const original = context.months.find((month) => month.label === label)!.branches[0]!.periods[0]!;
      const pattern = original.monthlyJudgment.axes.find((axis) => axis.axis === "pattern")!;
      expect(pattern.stemActions!.items[0]).toMatchObject({ visibility: "visible", tenGod: god, effect: "neutral" });
      expect(pattern.stemActions!.items[1]).toMatchObject({ visibility: "main_hidden", stem, tenGod: hiddenGod, effect });
      const period = result.months.find((month) => month.label === label)!.branches[0]!.periods[0]!;
      expect(period.judgmentCaption).toBe(original.monthlySegment.judgmentCaption);
      for (const domain of period.domains.filter((item) => item.id !== "relationship")) {
        expect(domain.phase).toBe("coordination"); expect(domain.links.annualEvents[0]!.itemId).toBe(`${domain.id}-settlement`);
        expectMonthlyMeaning(domain, original.monthlySegment.domains.find((item) => item.id === domain.id)!);
        expect(domain.evidence.join()).toContain(`支本气${stem}${hiddenGod}：${effect}`);
        expect(domain.evidence.join()).toContain(`月干${context.months.find((month) => month.label === label)!.ganZhi[0]}${god}：neutral`);
        expect(domain.conditions.join()).toContain("支内助力不改写为中性月干有利");
        summaries[domain.id]!.push(domain.summary);
        if (effect === "neutral") expect(domain.summary).not.toMatch(/较可发挥|容易被|更有利|更容易/u);
        expect([domain.summary, ...domain.examples].join()).not.toMatch(/工资|晋升|客户|确定收益|必然/u);
      }
    }
    expect(new Set(summaries.career).size).toBe(4); expect(new Set(summaries.wealth).size).toBe(4);
  });

  it("uses the actor's original path and blocker indexes to distinguish output load from collision with existing requirements", async () => {
    const input = await sourceFor(await revisionFor("1957-09-13", "male", "00:26"), 2032);
    const context = bridge.buildAnnualMonthContext(input), original = context.months.find((month) => month.label === "寒露月")!.branches[0]!.periods[0]!;
    const pattern = original.monthlyJudgment.axes.find((axis) => axis.axis === "pattern")!;
    expect(pattern.pathId).toBe("hurting-resource");
    expect(pattern.stemActions!.items[0]).toMatchObject({ stem: "庚", tenGod: "食神", effect: "obstructs" });
    const period = buildAnnualMonthStory(input).months.find((month) => month.label === "寒露月")!.branches[0]!.periods[0]!;
    expectMonthlyMeaning(period.domains[0]!, original.monthlySegment.domains[0]!);
    expect(period.domains[0]!.summary).not.toContain("额外准备");
    const childContext = bridge.buildAnnualMonthContext(childhood), story = buildAnnualMonthStory(childhood);
    for (const label of ["寒露月", "立冬月"]) {
      const source = childContext.months.find((month) => month.label === label)!.branches[0]!.periods[0]!;
      const axis = source.monthlyJudgment.axes.find((item) => item.axis === "pattern")!, action = axis.stemActions!.items[0]!;
      expect(axis.pathId).toBe("official-wealth"); expect(action.effect).toBe("obstructs"); expect(action.blockerIndexes.length).toBeGreaterThan(0);
      const read = story.months.find((month) => month.label === label)!.branches[0]!.periods[0]!;
      expectMonthlyMeaning(read.domains[0]!, source.monthlySegment.domains[0]!);
      expectMonthlyMeaning(read.domains[1]!, source.monthlySegment.domains[1]!);
      expect(read.domains[0]!.evidence.join()).toContain(`blockers[${action.blockerIndexes.join(",")}]`);
      expect(read.domains[0]!.examples).toEqual(source.monthlySegment.domains[0]!.examples);
    }
  });

  it("does not turn helpful print on another actual chart into the B print-pressure vignette", async () => {
    const input = await sourceFor(await revisionFor("1995-08-18", "male"), 2032);
    const context = bridge.buildAnnualMonthContext(input), story = buildAnnualMonthStory(input);
    const matches = context.months.flatMap((month) => month.branches.flatMap((branch) => branch.periods.map((period) => ({ month, branch, period })))).filter(({ period }) =>
      period.monthlyJudgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items.some((action) => action.tenGod === "正印" && action.effect === "assists"));
    expect(matches.length).toBeGreaterThan(0);
    for (const { month, branch, period } of matches) {
      const read = story.months.find((item) => item.monthId === month.monthId)!.branches.find((item) => item.id === branch.id)!.periods.find((item) => item.id === period.id)!;
      const action = period.monthlyJudgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items.find((item) => item.tenGod === "正印" && item.effect === "assists")!;
      expectMonthlyMeaning(read.domains[0]!, period.monthlySegment.domains[0]!);
      expectMonthlyMeaning(read.domains[1]!, period.monthlySegment.domains[1]!);
      for (const d of read.domains.filter((item) => item.id !== "relationship")) {
        const original = period.monthlySegment.domains.find((item) => item.id === d.id)!;
        const index = action.visibility === "visible" ? 0 : 1;
        expect(d.examples).toContain(original.examples[index]!);
        expect(d.examples.join()).not.toMatch(/又添了几样|两套条件要一起维持/u);
      }
    }
  });

  it("does not turn an actual Ding-Ren tie to the print into an output clash with the official", async () => {
    const input = await sourceFor(await revisionFor("1944-08-09", "male", "04:26"), 2026);
    const context = bridge.buildAnnualMonthContext(input), original = context.months.find((month) => month.ganZhi === "丁酉")!.branches[0]!.periods[0]!;
    const pattern = original.monthlyJudgment.axes.find((axis) => axis.axis === "pattern")!, actor = pattern.stemActions!.items[0]!;
    expect(pattern.pathId).toBe("official-resource"); expect(actor).toMatchObject({ stem: "丁", tenGod: "食神", effect: "obstructs" });
    const blockers = actor.blockerIndexes.map((index) => pattern.blockers[index]!);
    expect(blockers.join()).toContain("丁壬天干五合");
    const read = buildAnnualMonthStory(input).months.find((month) => month.ganZhi === "丁酉")!.branches[0]!.periods[0]!;
    expectMonthlyMeaning(read.domains[0]!, original.monthlySegment.domains[0]!);
    expect(read.domains[0]!.summary).not.toContain("原先约定的要求对不上");
    for (const domain of read.domains.filter((item) => item.id !== "relationship")) for (const line of blockers) expect(domain.evidence).toContain(line);
  });

  it("does not repeat a same-role neutral hidden theme after the actual R3 output pressure, while retaining both actors", async () => {
    const input = await sourceFor(childhood.revision, 2028), context = bridge.buildAnnualMonthContext(input), story = buildAnnualMonthStory(input);
    for (const [label, stem, god] of [["立春月", "甲", "伤官"], ["惊蛰月", "乙", "食神"]] as const) {
      const original = context.months.find((month) => month.label === label)!.branches[0]!.periods[0]!;
      const axis = original.monthlyJudgment.axes.find((item) => item.axis === "pattern")!;
      expect(axis.stemActions!.items).toEqual([
        expect.objectContaining({ visibility: "visible", stem, tenGod: god, effect: "obstructs" }),
        expect.objectContaining({ visibility: "main_hidden", stem, tenGod: god, effect: "neutral" }),
      ]);
      const read = story.months.find((month) => month.label === label)!.branches[0]!.periods[0]!;
      expect(read.judgmentCaption).toBe(original.monthlySegment.judgmentCaption);
      for (const domain of read.domains.filter((item) => item.id !== "relationship")) {
        expect(domain.summary).not.toContain("还需要衔接的是");
        expectMonthlyMeaning(domain, original.monthlySegment.domains.find((item) => item.id === domain.id)!);
        expect(domain.evidence.join()).toContain(`月干${stem}${god}：obstructs`);
        expect(domain.evidence.join()).toContain(`支本气${stem}${god}：neutral`);
        expect(domain.conditions.join()).toContain("月干主题与支内配合分别按原作用阅读");
        for (const index of axis.stemActions!.items[0]!.blockerIndexes) expect(domain.evidence).toContain(axis.blockers[index]!);
      }
    }
  });

  it("uses actual monthly relationship contacts and otherwise keeps the annual relationship as background only", () => {
    const result = buildAnnualMonthStory(b);
    const pick = (label: string) => result.months.find((month) => month.label === label)!.branches[0]!.periods[0]!.domains.find((domain) => domain.id === "relationship")!;
    expect(pick("惊蛰月").summary).toContain("重新匹配"); expect(pick("清明月").summary).toContain("具体确认");
    expect(pick("惊蛰月").connection).toBe("linked"); expect(pick("清明月").connection).toBe("linked");
    const background = result.months.flatMap((month) => month.branches.flatMap((branch) => branch.periods.flatMap((period) => period.domains))).filter((domain) => domain.id === "relationship" && domain.connection === "annual_background");
    expect(background.length).toBeGreaterThan(0);
    expect(background.every((domain) => domain.phase === "continuation" && domain.summary.includes("没有据独立关系线索另列"))).toBe(true);
    expect(background.every((domain) => domain.conditions.some((line) => line.includes("不把年度星再现重复算作本月新事件")))).toBe(true);
  });

  it("keeps three unknown-direction December periods, original mixed conditions and exact handover references", () => {
    const result = buildAnnualMonthStory(unknown), month = result.months.find((item) => item.label === "大雪月")!;
    expect(month.branches.map((branch) => [branch.id, branch.periods.length])).toEqual([["forward", 1], ["backward", 2]]);
    const [forward, backward] = month.branches;
    expect(backward!.periods[0]!.endExclusiveInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(backward!.periods[1]!.startInstant).toBe(backward!.periods[0]!.endExclusiveInstant);
    expect(forward!.periods[0]!.judgmentCaption).not.toBe(backward!.periods[0]!.judgmentCaption);
    expect(backward!.periods[0]!.judgmentCaption).toBe(backward!.periods[1]!.judgmentCaption);
    expect(forward!.periods[0]!.backgroundLabels).toContain("丁亥大运");
    expect(backward!.periods[0]!.backgroundLabels).toContain("辛巳大运"); expect(backward!.periods[1]!.backgroundLabels).toContain("庚辰大运");
    for (const branch of month.branches) for (const period of branch.periods) for (const domain of period.domains) {
      expect(domain.links.monthlyDomain.branchId).toBe(branch.id);
      expect(domain.links.annualEvents.every((link) => link.branchId === branch.id)).toBe(true);
      expect(domain.summary).not.toMatch(/此后转好|换运.*转好|必然|概率|\d+%/u);
    }
  });

  it("does not borrow another domain when annual relationship is absent or manufacture personal pre-birth stories", () => {
    const result = buildAnnualMonthStory(noAnnualRelationship);
    for (const month of result.months) for (const branch of month.branches) for (const period of branch.periods) {
      const relation = period.domains.find((domain) => domain.id === "relationship")!;
      expect(relation.connection).toBe("monthly_only"); expect(relation.links.annualEvents).toEqual([]);
    }
    const before = buildAnnualMonthStory(beforeBirth);
    expect(before.status).toBe("before_birth"); expect(before.months).toHaveLength(12);
    expect(before.months.every((month) => month.branches.every((branch) => !branch.periods.length))).toBe(true);
    expect(before.months.flatMap((month) => month.branches.flatMap((branch) => branch.gaps)).every((gap) => gap.message.includes("出生前"))).toBe(true);
  });

  it("keeps real child examples within age and does not turn resource moderation into financial settlement", () => {
    const childStory = buildAnnualMonthStory(childhood);
    const childDomains = childStory.months.flatMap((month) => month.branches.flatMap((branch) => branch.periods.flatMap((period) => period.domains)));
    expect(childDomains.map((domain) => [domain.summary, ...domain.examples].join()).join()).not.toMatch(/客户|岗位|就业|回款|升职|恋爱|结婚|配偶/u);
    const moderated = buildAnnualMonthStory(resourceWealth);
    const work = moderated.months[0]!.branches[0]!.periods[0]!.domains[0]!;
    expect(work.summary).toMatch(/支持|投入|用途/u); expect(work.summary).not.toContain("本年的确认主题");
  });

  it("retains all source versions and declared student examples without truncating a larger transitive version list", async () => {
    const draft = { work: "student" as const, relationship: "single" as const, fromYear: 2032, toYear: 2032, notes: "Synthetic self-described context" };
    const body = await buildReadingContextRecord(b.revision, null, draft);
    const note: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: b.revision.caseId, anchor: { kind: "revision", revisionId: b.revision.id }, bodyFormat: "markdown", body,
      tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" };
    const context = await resolveReadingContext({ revision: b.revision, records: [note] }), domains = b.annualDomains;
    const contextual = buildContextualReadingBundle({ revision: b.revision, assessment: b.assessment, comprehensive: null, context: context.latest,
      annualDomains: { version: domains.version, revisionId: b.revision.id, chartResultHash: b.revision.manifest.resultHash, includeHour: true, startYear: 2032, endYear: 2032, years: [domains] }, referenceYear: 2032 });
    const mismatched = { ...b, contextual, annualEvents: buildAnnualEventReading({ revision: b.revision, assessment: b.assessment, year: b.year, domains, contextual }) };
    expect(() => buildAnnualMonthStory(mismatched)).toThrow("月份领域全文或分段");
    const input = { ...mismatched, monthlyDomains: buildMonthlyDomainReadings({ revision: b.revision, assessment: b.assessment, monthly: b.monthly, contextual }) };
    const result = buildAnnualMonthStory(input), source = bridge.buildAnnualMonthContext(input);
    expect(result.contextRef).toEqual(context.latest!.ref);
    expect(input.monthlyDomains.contextRef).toEqual(result.contextRef);
    expect(result.sourceVersions).toEqual([...new Set([LOCAL_ANNUAL_MONTH_STORY_VERSION, ...source.sourceVersions])]);
    for (const month of result.months) for (const branch of month.branches) for (const period of branch.periods) {
      const domain = period.domains.find((item) => item.id === "career")!;
      const annual = input.annualEvents.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === domain.links.annualEvents[0]!.segmentId)!.items.find((item) => item.domain === "career")!;
      expect(domain.examples).toContain(`按本年已确认适用背景对照：${annual.examples[0]}`);
      expect(domain.examples.join()).not.toMatch(/若在职|客户|岗位/u);
      const wealth = period.domains.find((item) => item.id === "wealth")!;
      const annualWealth = input.annualEvents.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === wealth.links.annualEvents[0]!.segmentId)!.items.find((item) => item.domain === "wealth")!;
      expect(wealth.examples).toContain(`按本年已确认适用背景对照：${annualWealth.examples[0]}`);
      expect([wealth.summary, ...wealth.examples].join()).not.toMatch(/客户|岗位|工资|奖金|贷款/u);
      expect(wealth.examples[0]).not.toBe(domain.examples[0]);
      expect(wealth.summary).not.toContain(domain.summary);
    }
  });

  it("rejects forged source content and never silently overwrites different full references with a shared node ID", () => {
    const forged = structuredClone(b); forged.annualEvents.branches[0]!.segments[0]!.items[0]!.summary += " forged";
    expect(() => buildAnnualMonthStory(forged)).toThrow(/同修订重建结果不一致/u);
    const forgedMonth = structuredClone(b);
    forgedMonth.monthlyDomains.months[0]!.branches[0]!.segments[0]!.domains[0]!.summary = "本月必定晋升加薪";
    expect(() => buildAnnualMonthStory(forgedMonth)).toThrow(/月份领域全文或分段与原流月重建结果不一致/u);
    const context = bridge.buildAnnualMonthContext(b), duplicate = structuredClone(context.months[0]!.nodeRef);
    duplicate.nodeId = context.yearNodeRef!.nodeId; context.months[0]!.nodeRef = duplicate;
    const mock = vi.spyOn(bridge, "buildAnnualMonthContext").mockReturnValueOnce(context);
    try { expect(() => buildAnnualMonthStory(b)).toThrow(/相同节点标识对应不同完整引用/u); } finally { mock.mockRestore(); }
  });
});
