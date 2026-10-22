import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { buildAnnualDomainReading } from "./local-annual-domain-reading";
import { buildAnnualEventReading } from "./local-annual-event-reading";
import { buildAnnualLifeStory, type BuildAnnualLifeStoryInput } from "./annual-life-story";
import { buildReadingContextRecord, resolveReadingContext, type ReadingContextWork } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { ANNUAL_READER_ANSWER_VERSION, annualReaderParagraphLabel, buildAnnualReaderAnswer, type BuildAnnualReaderAnswerInput } from "./annual-reader-answer";
import { buildAnnualPatternReaderProse } from "./annual-pattern-reader-prose";
import { plainOutlookCaption } from "./plain-outlook-reading";
import { evaluateNatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";

const cases = new Map<string, BuildAnnualLifeStoryInput>();
beforeAll(async () => {
  for (const [id, date, time, sex, from, to] of [
    ["b", "1995-05-18", "08:26", "male", 2026, 2032],
    ["a", "1995-08-18", "08:26", "unspecified", 2028, 2028],
    ["child", "2019-12-22", "11:23", "female", 2025, 2025],
    ["transition", "2019-12-22", "11:23", "female", 2037, 2037],
    ["r4", "1999-01-09", "02:26", "male", 2034, 2035],
    ["food", "1970-12-08", "08:26", "male", 2028, 2028],
    ["official", "1971-04-09", "14:26", "male", 2026, 2028],
    ["joint", "1944-08-09", "04:26", "male", 2028, 2028],
    ["protect", "1957-09-13", "00:26", "male", 2027, 2032],
    ["moderate", "1982-10-02", "10:26", "male", 2032, 2032],
    ["prebirth", "1995-05-18", "08:26", "male", 1990, 1990]
  ] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
      lunarLeapMonth: false, location: { label: "Synthetic annual reader", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), annual = await buildLocalAnnualOutlookRange(revision, assessment, from, to);
    for (const year of annual.years) {
      const domains = buildAnnualDomainReading({ revision, assessment, year }), events = buildAnnualEventReading({ revision, assessment, year, domains });
      cases.set(`${id}-${year.year}`, { revision, assessment, year, domains, events });
    }
  }
}, 60_000);
function input(id: string, branchIndex = 0, segmentIndex = 0): BuildAnnualReaderAnswerInput {
  const source = cases.get(id)!, story = buildAnnualLifeStory(source), branch = story.branches[branchIndex]!;
  return structuredClone({ year: source.year, story, events: source.events, branchId: branch.id, segmentId: branch.segments[segmentIndex]!.id });
}
const text = (value: NonNullable<ReturnType<typeof buildAnnualReaderAnswer>>) => value.paragraphs.map(p => p.text).join("\n");
function withNatal(id: string, branchIndex = 0, segmentIndex = 0): BuildAnnualReaderAnswerInput {
  const source = cases.get(id)!;
  return { ...input(id, branchIndex, segmentIndex), revision: source.revision, assessment: source.assessment };
}

it("makes preparation pressure concrete and retains the whole-judgment condition beside two mapped scenes", () => {
  const source = withNatal("b-2026"), before = structuredClone(source), result = buildAnnualReaderAnswer(source)!;
  expect(result.version).toBe(ANNUAL_READER_ANSWER_VERSION);
  expect(result.headline).toContain("准备增加，实际完成容易推后");
  expect(result.paragraphs.filter(p => !p.detailsOnly).map(p => p.kind)).toEqual(["mainline", "scene", "scene", "relationship"]);
  expect(result.paragraphs.find(p=>p.kind==="relationship")!.text).toContain("不足以断定");
  expect(result.paragraphs.find(p=>p.kind==="relationship")!.eventItemIds).toEqual([]);
  expect(result.paragraphs.some(p => p.detailsOnly && p.kind === "scene")).toBe(true);
  expect(text(result)).toContain("资料、说明和修改一轮轮增加");
  expect(text(result)).toContain("若有正在学习的做法");
  expect(text(result)).toContain("新旧做法来回切换");
  expect(result.paragraphs.filter(p=>!p.detailsOnly).map(p=>p.text).join()).not.toContain("年支内的丁偏印");
  expect(text(result)).not.toMatch(/原配合存在具体牵连|你已在职/);
  expect(text(result)).toContain("准备时间");
  expect(result.eventMappings.flatMap(item => item.examples)).toHaveLength(4);
  expect(result.originals.eventTexts.flatMap(item => item.examples)).toEqual(source.events.branches[0]!.segments[0]!.items.filter(item => item.domain !== "relationship").flatMap(item => item.examples));
  expect(source).toEqual(before);
});

it("distinguishes a trial from completed work and keeps new uses separate from the original agreement", () => {
  const proposal = buildAnnualReaderAnswer(withNatal("b-2030"))!, settlementInput = withNatal("b-2032"), settlement = buildAnnualReaderAnswer(settlementInput)!;
  expect(proposal.paragraphs.filter(p=>!p.detailsOnly)).toHaveLength(4); expect(settlement.paragraphs.filter(p=>!p.detailsOnly)).toHaveLength(4);
  expect(proposal.headline).toContain("改法与作品较有利于试用"); expect(text(proposal)).toContain("材料、时间和花费");
  expect(settlement.headline).toContain("确认与续用"); expect(text(settlement)).toContain("不同用途");
  expect(text(settlement)).toContain("若已有共同费用或借用物品");
  expect(settlement.caption).toBe("有机会，也有阻力");
  expect(settlement.originals.wholeJudgment.label).toBe("条件性");
  expect(text(settlement)).toContain("补充指导或方法转换打断");
  const relation = settlementInput.events.branches[0]!.segments[0]!.items.find(item => item.domain === "relationship")!;
  expect(settlement.coveredEventIds).not.toContain(relation.id);
  expect(settlement.paragraphs.find(p=>p.kind==="relationship")!.eventItemIds).toContain(relation.id);
  expect(settlement.paragraphs.find(p=>p.kind==="relationship")!.text).toContain("谈婚安排的线索与实际成婚分开看");
  expect(settlement.originals.eventTexts.find(item => item.id === relation.id)?.summary).toBe(relation.summary);
});

it("accounts for every covered original summary and scene without inventing dependency subjects", () => {
  for (const id of ["b-2026", "b-2030", "b-2032"]) {
    const source = withNatal(id), result = buildAnnualReaderAnswer(source)!, section = source.story.branches[0]!.segments[0]!;
    const items = source.events.branches[0]!.segments[0]!.items.filter(item => item.domain !== "relationship");
    expect(result.coveredEventIds).toEqual(items.map(item => item.id));
    for (const item of items) {
      const mapping = result.eventMappings.find(value => value.eventId === item.id)!;
      expect(mapping.summary.original).toBe(item.summary);
      expect(mapping.summary.paragraphIds.every(id => result.paragraphs.some(p => p.id === id && p.eventItemIds.includes(item.id)))).toBe(true);
      expect(mapping.examples.map(value => value.original)).toEqual(item.examples);
      for (const example of mapping.examples) expect(result.paragraphs.find(p => p.id === example.paragraphId)!.text).toContain(example.text);
      for (const condition of [...item.conditions, ...item.applicability, ...item.notApplicableWhen]) expect(result.conditions).toContain(condition);
    }
    expect(result.sourceSubjects.every(subject => section.sourceSubjects.includes(subject))).toBe(true);
    expect(result.originals.storyParagraphs).toEqual(section.paragraphs);
    expect(result.originals.storyHeadline).toBe(section.headline);
    expect(result.originals.storySummary).toBe(source.story.summary);
  }
});

it("preserves exact unknown-direction segments and the neutral-visible versus hidden support reading", () => {
  for (const [branch, segment] of [[0, 0], [1, 0], [1, 1]] as const) {
    const source = input("a-2028", branch, segment), result = buildAnnualReaderAnswer(source)!;
    const old = source.story.branches[branch]!.segments[segment]!;
    expect(result.paragraphs.filter(p => p.kind !== "mainline")).toEqual(old.paragraphs.filter(p => p.kind !== "relationship" && p.kind !== "mainline"));
    expect(result.originals.storyParagraphs).toEqual(old.paragraphs);
    expect(result.paragraphs[0]!.text).toContain(branch === 0 ? "今年有机会，也有费力的地方" : "本段主要事情偏费力");
    expect(result.coveredEventIds).toEqual([]); expect(result.scope.backgroundRefs).toEqual(old.backgroundRefs);
    expect(result.scope.startInstant).toBe(old.startInstant); expect(result.scope.endExclusiveInstant).toBe(old.endExclusiveInstant);
  }
  for (const segment of [0, 1]) {
    const source = input("b-2029", 0, segment), result = buildAnnualReaderAnswer(source)!;
    expect(result.coveredEventIds).toEqual([]); expect(text(result)).toContain("尚未单独定顺"); expect(text(result)).toContain("辛食神");
    expect(result.originals.actorBasis.find(actor => actor.action.visibility === "visible")!.action.effect).toBe("neutral");
  }
});

it("keeps children's age cuts, unknown-age fallback and unresolved wealth moderation outside the adult rewrites", () => {
  for (const id of ["child-2025", "transition-2037", "r4-2034"]) {
    const source = input(id), result = buildAnnualReaderAnswer(source)!, original = source.story.branches[0]!.segments[0]!;
    expect(result.paragraphs.filter(p => p.kind !== "mainline")).toEqual(original.paragraphs.filter(p => p.kind !== "relationship" && p.kind !== "mainline"));
    expect(result.originals.storyParagraphs).toEqual(original.paragraphs); expect(result.coveredEventIds).toEqual([]);
    if (id.startsWith("child")) { expect(text(result)).toContain("5周岁部分"); expect(text(result)).toContain("6周岁部分"); expect(text(result)).not.toMatch(/岗位|回款/); }
    if (id.startsWith("transition")) { expect(text(result)).toContain("17周岁部分"); expect(text(result)).toContain("18周岁部分"); }
    if (id.startsWith("r4")) { expect(text(result)).toContain("尚未单独定向"); expect(text(result)).not.toMatch(/回款|报销/); }
  }
  // Projection-only unknown age boundary; no claim of a new calculable chart.
  const neutral = input("b-2026"), old = neutral.story.branches[0]!.segments[0]!;
  old.age = { ...old.age, stage: "unknown", startAge: null, endAge: null, segments: [] };
  neutral.events.branches[0]!.segments[0]!.age = structuredClone(old.age);
  expect(buildAnnualReaderAnswer(neutral)!.coveredEventIds).toEqual([]);
});

it("retains all six verified work contexts without replacing them with presumed employment", async () => {
  const base = cases.get("b-2032")!;
  for (const work of ["student", "employed", "self_employed", "seeking_work", "caregiving", "retired"] as const satisfies readonly ReadingContextWork[]) {
    const body = await buildReadingContextRecord(base.revision, null, { work, relationship: "unspecified", fromYear: 2032, toYear: 2032, notes: "synthetic" });
    const note: ResearchNoteRecord = { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: base.revision.caseId, anchor: { kind: "revision", revisionId: base.revision.id }, bodyFormat: "markdown", body,
      tags: ["阅读背景"], sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-16T00:00:00Z", updatedAt: "2026-10-16T00:00:00Z" };
    const context = (await resolveReadingContext({ revision: base.revision, records: [note] })).latest;
    const contextual = buildContextualReadingBundle({ revision: base.revision, assessment: base.assessment, comprehensive: null, context,
      annualDomains: { version: base.domains.version, revisionId: base.revision.id, chartResultHash: base.revision.manifest.resultHash, includeHour: true, startYear: 2032, endYear: 2032, years: [base.domains] }, referenceYear: 2032 })!;
    const source = { ...base, contextual, events: buildAnnualEventReading({ ...base, contextual }) }, story = buildAnnualLifeStory(source);
    const result = buildAnnualReaderAnswer({ revision: base.revision, assessment: base.assessment, year: base.year, story, events: source.events, branchId: story.branches[0]!.id, segmentId: story.branches[0]!.segments[0]!.id })!;
    expect(result.eventMappings.flatMap(mapping => mapping.examples).every(example => !example.sceneSource)).toBe(true);
    for (const item of source.events.branches[0]!.segments[0]!.items.filter(item => item.domain !== "relationship")) {
      expect(result.eventMappings.find(mapping => mapping.eventId === item.id)!.examples.map(example => example.original)).toEqual(item.examples);
      for (const example of item.examples) expect(text(result)).toContain(example);
      expect(result.sourceSubjects).toContain(item.origin.contextSubjectId);
    }
    if (work === "caregiving" || work === "retired") {
      expect(text(result)).not.toMatch(/若在职|岗位|客户|工资|入职/);
      const practical = source.events.branches[0]!.segments[0]!.items.filter(item => item.domain !== "relationship");
      const shared = practical[0]!.examples.find(example => practical[1]!.examples.includes(example))!;
      expect(shared).toBeTruthy(); expect(text(result).split(shared)).toHaveLength(2);
      const mappings = result.eventMappings.flatMap(mapping => mapping.examples.filter(example => example.original === shared));
      expect(mappings).toHaveLength(2); expect(mappings[0]!.paragraphId).toBe(mappings[1]!.paragraphId);
      const paragraph = result.paragraphs.find(p => p.id === mappings[0]!.paragraphId)!;
      expect(paragraph.eventItemIds).toEqual(expect.arrayContaining(practical.map(item => item.id)));
      expect(result.originals.eventTexts.filter(item => item.examples.includes(shared))).toHaveLength(2);
    }
  }
});

it("rejects stale versions, wrong source or segment, cross-branch backgrounds and malformed action indexes", () => {
  const original = input("a-2028", 1, 1);
  for (const mutate of [
    (v: BuildAnnualReaderAnswerInput) => { v.events.sourceBinding.chartResultHash = "wrong"; },
    (v: BuildAnnualReaderAnswerInput) => { v.events.sourceVersions.push("unregistered/9"); },
    (v: BuildAnnualReaderAnswerInput) => { v.segmentId = "missing"; },
    (v: BuildAnnualReaderAnswerInput) => { v.story.branches[1]!.segments[1]!.backgroundRefs = v.story.branches[0]!.segments[0]!.backgroundRefs; },
    (v: BuildAnnualReaderAnswerInput) => { v.events.branches[1]!.segments[1]!.age.startAge = 999; },
    (v: BuildAnnualReaderAnswerInput) => { const p = v.year.judgmentSegments.find(s => s.id === v.segmentId && s.branchId === v.branchId)!.judgment.axes.find(a => a.axis === "pattern")!; p.stemActions!.items[0]!.blockerIndexes = [999]; },
    (v: BuildAnnualReaderAnswerInput) => { const p = v.year.judgmentSegments.find(s => s.id === v.segmentId && s.branchId === v.branchId)!.judgment.axes.find(a => a.axis === "pattern")!; p.stemActions!.items[0]!.evidenceIndexes = [0, 0]; }
  ]) { const changed = structuredClone(original); mutate(changed); expect(() => buildAnnualReaderAnswer(changed)).toThrow("年度阅读答案"); }
});

it("returns no personal projection before birth and keeps the original producer unchanged", () => {
  const source = cases.get("prebirth-1990")!, story = buildAnnualLifeStory(source), before = structuredClone({ source, story });
  expect(buildAnnualReaderAnswer({ year: source.year, story, events: source.events, branchId: "locked", segmentId: "none" })).toBeNull();
  expect({ source, story }).toEqual(before);
});

it("keeps optional-source fallback literal and only maps the verified new task when natal sources are supplied", () => {
  for (const id of ["b-2026", "b-2030", "b-2032"]) {
    const source = input(id), old = buildAnnualReaderAnswer(source)!, extended = buildAnnualReaderAnswer(withNatal(id))!;
    expect(old.coveredEventIds).toEqual([]);
    expect(old.originals.storyParagraphs).toEqual(source.story.branches[0]!.segments[0]!.paragraphs);
    expect(extended.caption).toBe(old.caption); expect(extended.scope).toEqual(old.scope);
    expect(extended.conditions).toEqual(old.conditions); expect(extended.originals.eventTexts).toEqual(old.originals.eventTexts);
    const practical = source.events.branches[0]!.segments[0]!.items.filter(item => item.domain !== "relationship");
    expect(extended.coveredEventIds).toEqual(practical.map(item => item.id));
    expect(extended.eventMappings.flatMap(mapping => mapping.examples.map(example => example.original))).toEqual(practical.flatMap(item => item.examples));
    expect(extended.eventMappings.flatMap(mapping => mapping.examples).every(example => !example.sceneSource)).toBe(true);
    expect(extended.eventMappings.flatMap(mapping => mapping.examples).some(example => example.text !== example.original)).toBe(true);
  }
});

it("binds distinct adult scene explanations to the original examples and preserves each identity condition", () => {
  for (const [id, branch, segment] of [["a-2028", 0, 0], ["a-2028", 1, 0], ["a-2028", 1, 1], ["protect-2032", 0, 0], ["food-2028", 0, 0], ["official-2028", 0, 0], ["r4-2035", 0, 0]] as const) {
    const source = withNatal(id, branch, segment), before = structuredClone(source), result = buildAnnualReaderAnswer(source)!;
    const entries = result.eventMappings.flatMap(mapping => mapping.examples.map(example => ({ ...example, eventId: mapping.eventId })));
    const translated = entries.filter(example => example.sceneSource);
    const linked = result.originals.wholeJudgment.axes.some(axis => axis.taskLinks?.items.length);
    if (linked) {
      expect(translated).toEqual([]);
      for(const entry of entries) expect(result.paragraphs.find(p=>p.id===entry.paragraphId)!.text.split("\n")).toContain(entry.text);
      expect(entries.length).toBe(result.originals.eventTexts.filter(item => item.domain !== "relationship").flatMap(item => item.examples).length);
    } else expect(translated.length).toBeGreaterThan(0);
    for (const example of translated) {
      const scene = example.sceneSource!, originalItem = result.originals.eventTexts.find(item => item.id === example.eventId)!;
      expect(example.original).toBe(originalItem.examples[example.index]);
      expect(result.sourceVersions).toContain(scene.version);
      expect(scene.templateIds.length).toBeGreaterThan(0); expect(scene.sourceMechanisms.length).toBeGreaterThan(0);
      expect(result.paragraphs.find(p => p.id === example.paragraphId)!.text.split("\n")).toContain(example.text);
      expect(example.text.startsWith(({ employed: "若在职", learning: "若正在求职或进修", independent: "若有自营业务或实际合作" } as const)[scene.setting])).toBe(true);
    }
    expect(source).toEqual(before);
  }
});

it("leaves an unrecognized complete source sentence literal instead of guessing a conditional scene", () => {
  const source = structuredClone(withNatal("a-2028", 1, 0));
  const item = source.events.branches[1]!.segments[0]!.items.find(entry => entry.domain === "career")!;
  item.examples[0] += "（另有尚未纳入当前模板的原文条件。）";
  const result = buildAnnualReaderAnswer(source)!;
  const mapped = result.eventMappings.find(mapping => mapping.eventId === item.id)!.examples[0]!;
  expect(mapped.text).toBe(item.examples[0]); expect(mapped.original).toBe(item.examples[0]);
  expect(mapped.sceneSource).toBeUndefined();
  expect(result.paragraphs.find(paragraph => paragraph.id === mapped.paragraphId)!.text).toContain(item.examples[0]);
});

it("gives A's opposite branches opposite practical meanings while retaining actual rescue and other-axis originals", () => {
  const forwardInput = withNatal("a-2028"), backwardInput = withNatal("a-2028", 1, 0);
  const before = structuredClone([forwardInput, backwardInput]);
  const forward = buildAnnualReaderAnswer(forwardInput)!, backward = buildAnnualReaderAnswer(backwardInput)!;
  expect(forward.coveredEventIds).toHaveLength(2); expect(backward.coveredEventIds).toHaveLength(2);
  expect(forward.headline).toContain("指导补到卡点"); expect(forward.caption).toBe("有机会，也有阻力");
  expect(backward.headline).toContain("准备增加，实际完成容易推后"); expect(text(backward)).not.toContain("原配合存在具体牵连");
  expect(backward.paragraphs.find(p=>p.kind==="pressure")!.text).not.toContain("年支内庚劫财的配合仍有牵制");
  expect(text(backward)).toContain("临时追加的需要牵动原先份额");
  expect(text(backward)).toContain("这份缓冲本身也受限制");
  expect(forward.originals.wholeJudgment.axes.find(axis => axis.axis === "seasonal")!.blockers.join()).toContain("调候");
  expect(text(forward)).toContain("不断追加的准备或指导正在挤压已有表达、改法与实际尝试");
  expect(backward.originals.actorBasis[0]!.blockers.join()).toContain("时柱透壬");
  expect([forwardInput, backwardInput]).toEqual(before);
});

it("distinguishes authority support being displaced from concentrated demands and a constrained problem-solving method", () => {
  const official = buildAnnualReaderAnswer(withNatal("official-2028"))!, food = buildAnnualReaderAnswer(withNatal("food-2028"))!;
  expect(official.headline).toContain("新安排挤占"); expect(text(official)).toContain("仍然需要的方法或帮助"); expect(text(official)).toContain("已有要求没有减少");
  expect(official.originals.actorBasis[0]!.blockers.join()).toContain("偏印");
  expect(text(food)).toContain("几项要求挤在同一段时间"); expect(text(food)).toContain("补充指导或方法转换打断");
  const functions=food.originals.wholeJudgment.axes.find(axis=>axis.axis==="pattern")!.taskLinks!.items[0]!.functions;
  expect(functions.some(edge=>edge.from.stem==="庚"&&edge.to.stem==="壬"&&edge.operation==="generate")).toBe(true);
  expect(functions.some(edge=>edge.from.stem==="庚"&&edge.to.stem==="甲"&&edge.operation==="control")).toBe(true);
  expect(text(food)).not.toContain("原有份额与新增需要相互牵动");
  expect(official.coveredEventIds).toHaveLength(2); expect(food.coveredEventIds).toHaveLength(2);
});

it("keeps resource protection, wealth moderation and unresolved task availability distinct", () => {
  const protect = buildAnnualReaderAnswer(withNatal("protect-2032"))!, pending = buildAnnualReaderAnswer(withNatal("protect-2027"))!;
  const moderate = buildAnnualReaderAnswer(withNatal("moderate-2032"))!, positive = buildAnnualReaderAnswer(withNatal("r4-2035"))!;
  expect(protect.originals.natalTask!.task).toBe("resource_first");
  expect(protect.headline).toContain("必要支持"); expect(text(protect)).toContain("挤占仍必需的指导");
  const originalRescue = input("protect-2032").story.branches[0]!.segments[0]!.paragraphs.find(p => p.kind === "pressure")!;
  expect(protect.originals.storyParagraphs).toContainEqual(originalRescue);
  expect(text(protect)).toContain("给必要的说明、指导与练习条件留下位置");
  expect(text(protect)).toContain("原有负担不会因此自动消失");
  expect(pending.originals.actorBasis[0]!.action.effect).toBe("unresolved");
  expect(text(pending)).toContain("实际进展尚未明朗"); expect(text(pending)).not.toContain("原来缺支持的一步可以继续");
  expect(moderate.originals.natalTask!.task).toBe("wealth_first"); expect(moderate.headline).toContain("效果尚未明朗");
  expect(text(moderate)).not.toMatch(/已经裁印|必有回款|收入增加/);
  expect(positive.headline).toContain("重复投入较能收拢"); expect(text(positive)).toContain("必要部分仍能继续使用");
  expect(positive.originals.actorBasis[0]!.action.effect).toBe("assists");
  expect(text(positive)).not.toMatch(/回款|报销|工资/);
});

it("expands remaining resource-output roles without upgrading a neutral visible peer from hidden support", () => {
  const neutral = buildAnnualReaderAnswer(withNatal("b-2029"))!, food = buildAnnualReaderAnswer(withNatal("b-2031"))!;
  expect(neutral.coveredEventIds).toHaveLength(2); expect(text(neutral)).toContain("这一事项主题本身不单独定顺逆");
  expect(neutral.originals.actorBasis[0]!.action.effect).toBe("neutral");
  expect(text(neutral)).toContain("熟悉的本领较容易派上用场");
  expect(neutral.headline).not.toContain("独立承担较有利");
  expect(food.headline).toContain("持续完成"); expect(food.headline).not.toContain("改法进入试用");
});

it("requires the optional natal inputs together and rejects source, selected-fact and task-version substitution", () => {
  const source = withNatal("protect-2032");
  for (const mutate of [
    (v: BuildAnnualReaderAnswerInput) => { delete v.assessment; },
    (v: BuildAnnualReaderAnswerInput) => { v.revision!.caseId = crypto.randomUUID(); },
    (v: BuildAnnualReaderAnswerInput) => { v.assessment = structuredClone(v.assessment!); v.assessment.balance.structural.inputFacts.pillars.month.stem = "甲"; },
    (v: BuildAnnualReaderAnswerInput) => { v.story.sourceVersions = v.story.sourceVersions.filter(version => !version.startsWith("hakimi.natal-wealth-resource-task/")); }
  ]) { const changed = structuredClone(source); mutate(changed); expect(() => buildAnnualReaderAnswer(changed)).toThrow("年度阅读答案"); }
  const without = input("protect-2032"); expect(buildAnnualReaderAnswer(without)!.coveredEventIds).toEqual([]);
});

it("uses a declared synthetic pure-prose killing/resource case to check opposite support effects without claiming a dated fixture", () => {
  const source = cases.get("b-2026")!, task = evaluateNatalWealthResourceTask({ facts: source.assessment.balance.structural.inputFacts, includeHour: true });
  const visible = { visibility: "visible" as const, stem: "丙", tenGod: "正印", effect: "assists" as const, evidenceIndexes: [], blockerIndexes: [], satisfiedConditionIndexes: [], summaryBasis: true };
  const hidden = { ...visible, visibility: "main_hidden" as const, stem: "丁", tenGod: "偏印", effect: "neutral" as const };
  const help = buildAnnualPatternReaderProse({ path: "killings-resource", task, kind: "study", visible, hidden })!;
  const pressure = buildAnnualPatternReaderProse({ path: "killings-resource", task, kind: "study", visible: { ...visible, effect: "obstructs" }, hidden })!;
  expect(help.main).toContain("原来只知道要做什么"); expect(pressure.main).toContain("需要完成的要求仍在");
  expect(help.main).not.toBe(pressure.main);
});

it("explains the actual leading balance support without turning an unresolved guiding actor into an effective one", () => {
  const source = withNatal("protect-2027"), before = structuredClone(source), result = buildAnnualReaderAnswer(source)!;
  const judgment = source.year.judgmentSegments.find(segment => segment.id === source.segmentId && segment.branchId === source.branchId)!.judgment;
  expect(judgment.label).toBe("条件性"); expect(judgment.primaryAxis).toBe("pattern");
  expect(judgment.axes.find(axis => axis.axis === "balance")!.effect).toBe("assists");
  expect(judgment.axes.find(axis => axis.axis === "pattern")!.effect).toBe("mixed");
  expect(judgment.axes.find(axis => axis.axis === "balance")!.effect).toBe("assists");
  expect(judgment.axes.find(axis => axis.axis === "pattern")!.effect).toBe("mixed");
  expect(result.paragraphs[0]!.text).not.toContain("今年整体较顺");
  expect(result.originals.wholeJudgment.axes.flatMap(axis=>axis.blockers).join()).toContain("壬丁");
  expect(result.originals.wholeJudgment.axes.flatMap(axis => axis.rescues).join()).toContain("己");
  expect(text(result)).toContain("实际进展尚未明朗");
  expect(result.originals.actorBasis[0]!.action.effect).toBe("unresolved");
  expect(result.conditions.join()).toContain("丁壬天干五合");
  expect(result.paragraphs.filter(p => p.kind === "scene").every(p => !p.text.includes("尚未单独判"))).toBe(true);
  expect(source).toEqual(before);
});

it("retains each complete whole judgment and references the contributing axes rather than using the caption as an overall label", () => {
  for (const [id, branch, segment] of [["b-2029", 0, 0], ["a-2028", 0, 0], ["a-2028", 1, 0], ["a-2028", 1, 1], ["protect-2027", 0, 0], ["protect-2032", 0, 0]] as const) {
    const source = withNatal(id, branch, segment), result = buildAnnualReaderAnswer(source)!;
    const judgment = source.year.judgmentSegments.find(value => value.id === source.segmentId && value.branchId === source.branchId)!.judgment;
    for (const key of ["label", "primaryAxis", "headline", "summary", "axes", "conflicts", "conditions", "coverageGaps"] as const) expect(result.originals.wholeJudgment[key]).toEqual(judgment[key]);
    for (const axis of judgment.axes) {
      expect(result.paragraphs[0]!.basisRefs).toContainEqual({ axisId: axis.id, field: "summary" });
      for (const [index, rescue] of axis.rescues.entries()) {
        expect(result.originals.wholeJudgment.axes.find(item => item.id === axis.id)!.rescues[index]).toBe(rescue);
        const ref = { axisId: axis.id, field: "rescues", index };
        expect(result.originals.rescueTrace!.items.flatMap(item => item.rescueRefs)).toContainEqual(ref);
        expect(result.rescueMappings.flatMap(item => item.rescueRefs)).toContainEqual(ref);
        expect(result.paragraphs.flatMap(p => p.basisRefs)).toContainEqual({ axisId: axis.id, field: "rescues", index });
      }
    }
    if (id === "b-2029") {
      expect(result.caption).toBe("有可推进的机会"); expect(judgment.label).toBe("条件性");
      expect(result.paragraphs[0]!.text).not.toContain("今年整体较顺");
      expect(result.originals.actorBasis[0]!.action.effect).toBe("neutral");
      expect(result.originals.actorBasis[1]!.action.effect).toBe("assists");
    }
    if (id === "a-2028" && branch === 0) expect(result.paragraphs[0]!.text).toContain("有机会，也有阻力");
    if (id === "a-2028" && branch === 1 && segment === 1) {
      const original = "财食/承接的0.8、1.0、1.2替代分界不一致；主句沿1.0本地模型，轻重分歧保留为条件。";
      expect(result.originals.wholeJudgment.axes.flatMap(axis => axis.unresolvedConditions)).toContain(original);
      expect(result.conditions).toContain(original);
      expect(text(result)).not.toContain("0.8、1.0、1.2");
      expect(result.conditions).toContain(original);
    }
    if (id === "protect-2032") {
      expect(text(result)).toContain("可用帮助或条件尚未同步跟上");
      expect(result.originals.wholeJudgment.axes.flatMap(axis => axis.rescues).join()).toContain("月柱透己有根，可制约来干壬");
      expect(text(result)).not.toContain("月柱透己有根，可制约来干壬");
      expect(text(result)).toContain("原有负担不会因此自动消失");
      const pressure = "新用途挤占仍必需的指导、工具或练习时间";
      expect(text(result).split(pressure)).toHaveLength(2);
      const careerExamples = result.eventMappings.find(item => item.eventId.startsWith("career-"))!.examples;
      expect(careerExamples.find(example => example.sceneSource?.setting === "employed")!.text).toContain("带教或熟悉步骤的时间被借去别处");
      expect(careerExamples.find(example => example.sceneSource?.setting === "independent")!.text).toContain("原服务仍需专业支持");
    }
  }
});

it("does not invent an existing rescue when every original axis has none", () => {
  for (const id of ["b-2026", "official-2028", "food-2028"]) {
    const source = withNatal(id), result = buildAnnualReaderAnswer(source)!;
    const original = source.year.judgmentSegments.find(segment => segment.id === source.segmentId)!.judgment;
    expect(result.originals.wholeJudgment.axes.flatMap(axis => axis.rescues)).toEqual(original.axes.flatMap(axis => axis.rescues));
    if (!original.axes.some(axis => axis.rescues.length)) {
      expect(text(result)).not.toContain("已有转机");
      expect(result.caption).toBe(plainOutlookCaption(original));
    } else expect(result.rescueMappings.flatMap(mapping => mapping.rescueRefs)).toEqual(expect.arrayContaining(result.originals.rescueTrace!.items.flatMap(item => item.rescueRefs)));
  }
  const rescued = buildAnnualReaderAnswer(withNatal("a-2028", 1, 0))!;
  expect(rescued.rescueMappings.length).toBeGreaterThan(0);
  expect(rescued.paragraphs.find(p=>p.id===rescued.rescueMappings[0]!.paragraphId)!.detailsOnly).toBe(true);
});

it("rejects incomplete whole-axis identity and shares explicit paragraph labels with both readers", () => {
  for (const mutate of [
    (v: BuildAnnualReaderAnswerInput) => { v.year.judgmentSegments[0]!.judgment.primaryAxis = "missing" as never; },
    (v: BuildAnnualReaderAnswerInput) => { v.year.judgmentSegments[0]!.judgment.axes[1]!.axis = "balance"; }
  ]) { const source = withNatal("protect-2027"); mutate(source); expect(() => buildAnnualReaderAnswer(source)).toThrow("年度阅读答案"); }
  expect(annualReaderParagraphLabel({ kind: "pressure", label: "相反条件与具体转机" })).toBe("相反条件与具体转机");
  expect(annualReaderParagraphLabel({ kind: "scene" })).toBe("具体生活情境");
});

it("maps same-chain rescues once in each exact A handover segment while retaining every calculation and constraint", () => {
  const results = [0, 1].map(segment => buildAnnualReaderAnswer(withNatal("a-2028", 1, segment))!);
  for (const result of results) {
    const trace = result.originals.rescueTrace!;
    expect(trace.targetRef).toEqual(result.scope.yearNodeRef);
    expect(trace.backgroundRefs).toEqual(result.scope.backgroundRefs);
    expect(trace.interval).toEqual({ startInstant: result.scope.startInstant, endExclusiveInstant: result.scope.endExclusiveInstant });
    expect(trace.items).toHaveLength(4); expect(result.rescueMappings).toHaveLength(1);
    const mapping = result.rescueMappings[0]!;
    expect(mapping.traceIds).toEqual(trace.items.map(item => item.id));
    expect(mapping.rescueRefs).toHaveLength(4);
    const paragraph = result.paragraphs.find(item => item.id === mapping.paragraphId)!;
    expect(paragraph.text.split(mapping.text)).toHaveLength(2);
    for (const ref of mapping.basisRefs) {
      const axis = result.originals.wholeJudgment.axes.find(item => item.id === ref.axisId)!;
      expect(typeof axis[ref.field][ref.index]).toBe("string");
    }
    for (const constraint of trace.items.flatMap(item => item.constraints)) for (const ref of constraint.refs) {
      expect(mapping.basisRefs).toContainEqual(ref);
      const line = result.originals.wholeJudgment.axes.find(item => item.id === ref.axisId)![ref.field][ref.index]!;
      expect(result.conditions).toContain(line);
    }
    expect(mapping.text).not.toMatch(/透甲|透乙|四重|加倍|大概率|准确率|百分之/);
    expect(text(result)).not.toContain("救应已识别具体对象与根气");
  }
  expect(results[0]!.scope.backgroundRefs).not.toEqual(results[1]!.scope.backgroundRefs);
  expect(results[0]!.rescueMappings[0]!.text).not.toEqual(results[1]!.rescueMappings[0]!.text);
  expect(results[1]!.rescueMappings[0]!.text).toContain("相互牵连，不能独立调配");
});

it("rejects altered same-source rescue prose or node descriptors instead of guessing their structural meaning", () => {
  for (const mutate of [
    (value: BuildAnnualReaderAnswerInput) => { value.year.judgmentSegments.find(item => item.id === value.segmentId && item.branchId === value.branchId)!.judgment.axes.find(axis => axis.axis === "pattern")!.rescues[0] += "假设补充"; },
    (value: BuildAnnualReaderAnswerInput) => { const ref = value.story.branches[1]!.segments[0]!.backgroundRefs[0]!; value.year.dayunSegments.find(item => JSON.stringify(item.nodeRef) === JSON.stringify(ref))!.ganZhi = "甲子"; }
  ]) {
    const source = structuredClone(withNatal("a-2028", 1, 0)); mutate(source);
    expect(() => buildAnnualReaderAnswer(source)).toThrow("救应追溯");
  }
  const child = buildAnnualReaderAnswer(withNatal("child-2025"))!;
  expect(child.originals.rescueTrace).toBeDefined();
  expect(child.rescueMappings).toEqual([]);
});


it("keeps a real joint-task regular wealth year on confirmation of the original agreement across the heading, main and scenes", () => {
  const source = withNatal("joint-2028"), before = structuredClone(source), result = buildAnnualReaderAnswer(source)!;
  expect(result.originals.natalTask!.task).toBe("official_joint");
  expect(result.originals.actorBasis[0]!.action).toMatchObject({ tenGod: "正财", effect: "obstructs" });
  expect(result.headline).toContain("原约定的确认较费力");
  expect(result.paragraphs[0]!.text).toContain("原约定的确认");
  expect(result.paragraphs[0]!.text).not.toContain("新增用途");
  expect(result.paragraphs.filter(p => p.kind === "scene").map(p => p.text).join("\n")).toContain("已交付服务仍需验收或续用说明");
  expect(result.paragraphs.filter(p => p.kind === "scene").map(p => p.text).join("\n")).not.toMatch(/新试用|新用途/);
  expect(result.originals.actorBasis[0]!.blockers.join()).toContain("壬");
  expect(result.coveredEventIds).toHaveLength(2); expect(source).toEqual(before);
});

it("makes the two real pending resource tasks concrete without changing their whole direction or collapsing the two domains", () => {
  for (const id of ["protect-2027", "moderate-2032"]) {
    const source = withNatal(id), before = structuredClone(source), result = buildAnnualReaderAnswer(source)!;
    expect(result.originals.actorBasis[0]!.action.effect).toBe("unresolved");
    const scenes = result.paragraphs.filter(p => p.kind === "scene" && !p.detailsOnly); expect(scenes).toHaveLength(2);
    expect(scenes[0]!.text).not.toBe(scenes[1]!.text);
    expect(scenes.map(p => p.text).join("\n")).not.toContain("本项重点是");
    expect(scenes.map(p => p.text).join("\n")).not.toMatch(/已经改善|调整已经顺利|支持已经到位|收入增加/);
    for (const mapping of result.eventMappings) for (const example of mapping.examples) {
      const item = source.events.branches.flatMap(b => b.segments).find(s => s.id === source.segmentId)!.items.find(i => i.id === mapping.eventId)!;
      expect(example.original).toBe(item.examples[example.index]);
      expect(result.paragraphs.find(p => p.id === example.paragraphId)!.text.split("\n")).toContain(example.text);
    }
    expect(result.coveredEventIds).toHaveLength(2); expect(source).toEqual(before);
  }
  const protect = buildAnnualReaderAnswer(withNatal("protect-2027"))!, moderate = buildAnnualReaderAnswer(withNatal("moderate-2032"))!;
  expect(text(protect)).toContain("自己能继续的部分与需要帮助的部分并行");
  expect(text(protect)).toContain("已有投入不能替代尚未落实的指导");
  expect(text(moderate)).toContain("重复讲解与仍不可缺少的操作依据");
  expect(text(moderate)).toContain("维护、培训工时与共用安排");
});

it("distinguishes pressure on the real authority object from pressure on its resource support", () => {
  for (const year of [2026, 2028]) {
    const source = withNatal(`official-${year}`), result = buildAnnualReaderAnswer(source)!;
    const pattern = result.originals.wholeJudgment.axes.find(axis => axis.axis === "pattern")!;
    const pressured = pattern.taskLinks!.items.flatMap(link => link.relations).filter(relation => relation.contributesPressure);
    expect(pressured.some(relation => relation.to.group === "authority")).toBe(true);
    expect(text(result)).toContain("原有要求与实际做法仍有冲突");
    const supportPressure = pressured.some(relation => relation.to.group === "resource");
    expect(text(result).includes("仍然需要的方法或帮助")).toBe(supportPressure);
    expect(supportPressure).toBe(year === 2028);
  }
});
