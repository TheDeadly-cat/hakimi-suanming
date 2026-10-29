import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type ResearchNoteRecord, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildBriefReadingReport } from "./brief-reading-report";
import { buildPlainFullReading } from "./plain-full-reading";
import { buildReadingContextRecord, resolveReadingContext } from "./local-reading-context";
import { buildContextualReadingBundle } from "./local-contextual-reading-record";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource, type ReadingFeedbackChoice } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";
import type { LocalReadingSnapshotExtras } from "./local-reading-record";

async function natal(date: string, time = "08:26", sex: "male" | "female" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", sex,
    timeZone: "Asia/Shanghai", lunarLeapMonth: false, location: { label: "Synthetic plain-full fixture", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-22T00:00:00Z" });
}
function record(revision: RevisionRecord, body: string, minute: number, tags: string[]): ResearchNoteRecord {
  const instant = new Date(Date.UTC(2026, 9, 22, 0, minute)).toISOString();
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    bodyFormat: "markdown", body, tags, sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: instant, updatedAt: instant };
}
async function input(revision: RevisionRecord, year: number | null = 2026, retired = false, relationship: "unspecified" | "separated" = "unspecified") {
  const assessment = buildBaziPreliminaryAssessment(revision), comprehensive = buildBaziComprehensiveReading(revision, assessment);
  const life = year === null ? null : await buildLocalLifeOutlook(revision, assessment, year);
  const note = retired || relationship !== "unspecified" ? record(revision, await buildReadingContextRecord(revision, null,
    { work: retired ? "retired" : "unspecified", relationship, fromYear: 2026, toYear: 2026, notes: "不从自由文字推断职业" }), 0, ["阅读背景"]) : null;
  const context = note ? (await resolveReadingContext({ revision, records: [note] })).latest : null;
  const contextual = context ? buildContextualReadingBundle({ revision, assessment, comprehensive, context, referenceYear: 2026, annualDomains: null }) : null;
  const synthesis = buildReadingSynthesis({ revision, assessment, comprehensive, life, contextual });
  const extras: LocalReadingSnapshotExtras = { sourceRevision: revision, comprehensive, life, synthesis, contextual };
  return { revision, assessment, comprehensive, extras };
}
type Input = Awaited<ReturnType<typeof input>>;
let b: Input, a: Input, samePath: Input, food: Input, protect: Input, moderate: Input, child: Input, retired: Input, separated: Input, unknownHour: Input;
beforeAll(async () => {
  b = await input(await natal("1995-05-18")); a = await input(await natal("1995-08-18", "08:26", "unspecified"));
  samePath = await input(await natal("1995-05-08"));
  food = await input(await natal("1970-12-08")); protect = await input(await natal("1957-09-13", "00:26"));
  moderate = await input(await natal("1982-10-02", "10:26")); child = await input(await natal("2019-12-22", "11:23", "female"), 2030);
  retired = await input(b.revision, 2026, true);
  separated = await input(b.revision, 2026, false, "separated");
  // An explicit selected-column projection, not a freshly calculated unknown-hour birth chart.
  const projection = structuredClone(b.revision); projection.input.time = null; projection.input.timePrecision = "unknown_hour";
  unknownHour = await input(projection, null);
}, 60000);
function read(value: Input) { const report = buildBriefReadingReport(value.assessment, null, value.extras)!;
  return { report, reading: buildPlainFullReading(report, value.assessment, null, value.extras) }; }
const domain = (value: ReturnType<typeof read>["reading"], id: string) => value.domains.find(item => item.id === id)!;

it("leads with B's actual pattern, ordered useful gods and score basis, then distinguishes career, income and marriage structure", () => {
  const before = JSON.stringify(b), { report, reading } = read(b);
  expect(reading.introduction[0]).toContain(report.natalConclusion!.pattern.text);
  expect(reading.introduction.join()).toMatch(/印格泄秀/);
  expect(reading.introduction.join()).toContain("首用辛食神");
  expect(reading.introduction.join()).toContain("癸水润土为先，丙火为配合");
  expect(reading.introduction.join()).toContain("支持侧11、泄耗克侧12");
  expect(reading.introduction.join()).toContain("相对中和");
  expect(reading.introduction.join()).toContain("忌增印压住食伤出口");
  expect(domain(reading, "career").paragraphs.join()).toContain("专业积累");
  expect(domain(reading, "career").paragraphs.join()).toContain("辛食神已透");
  expect(domain(reading, "wealth").paragraphs.join()).toContain("专业报酬");
  expect(domain(reading, "wealth").paragraphs.join()).toContain("壬正财藏于年柱亥");
  expect(domain(reading, "wealth").paragraphs.join()).toContain("癸偏财藏于时柱辰");
  expect(domain(reading, "wealth").paragraphs.join()).not.toContain("庚伤官的能力出口");
  expect(domain(reading, "relationships").paragraphs.join()).toContain("日支酉");
  expect(domain(reading, "relationships").paragraphs.join()).toContain("日柱支酉与时柱支辰");
  expect(domain(reading, "wealth").paragraphs.join()).not.toBe(domain(reading, "career").paragraphs.join());
  expect(domain(reading, "career").paragraphs.join().length).toBeGreaterThan(report.domainCards.find(card => card.id === "career")!.text.length);
  expect(reading.bodyText).not.toMatch(/先考察|优先考察|共同投入|成果续用|准备增加|重复订阅|修改次数和售后/);
  expect(reading.sourceVersions).toContain("hakimi.concrete-natal-prose/0.2.0");
  expect(JSON.stringify(b)).toBe(before);
});

it("keeps actual routes and opposite wealth/resource tasks distinct", () => {
  const values = [b, a, food, protect, moderate].map(value => read(value).reading);
  expect(new Set(values.map(value => value.introduction.join())).size).toBe(5);
  expect(domain(values[1]!, "career").paragraphs.join()).toContain("同辈竞争");
  expect(values[2]!.introduction.join()).toContain("制杀");
  expect(domain(values[3]!, "wealth").paragraphs.join()).toContain("财的负担先于承载");
  expect(domain(values[4]!, "wealth").paragraphs.join()).toContain("财的当前任务是调印");
  expect(domain(values[4]!, "wealth").paragraphs.join()).toContain("已透却无根");
  expect(new Set(values.map(value => domain(value, "career").paragraphs.join())).size).toBe(5);
  expect(new Set(values.map(value => domain(value, "wealth").paragraphs.join())).size).toBe(5);
  for (const value of values) expect(value.introduction.join() + value.domains.flatMap(item => item.paragraphs).join()).not.toMatch(/共同投入|成果续用|准备增加/);
});

it("distinguishes two real calculated charts even when their selected development route is the same", () => {
  expect(samePath.comprehensive.patternDiagnosis!.primaryPathId).toBe(b.comprehensive.patternDiagnosis!.primaryPathId);
  const first = read(b).reading, second = read(samePath).reading;
  expect(domain(first, "wealth").paragraphs).not.toEqual(domain(second, "wealth").paragraphs);
  expect(domain(first, "relationships").paragraphs).not.toEqual(domain(second, "relationships").paragraphs);
  expect(domain(second, "relationships").paragraphs.join()).toContain("日支亥");
  expect(domain(second, "relationships").paragraphs.join()).not.toContain("日柱支酉与时柱支辰");
  expect(first.sourceBinding.chartResultHash).not.toBe(second.sourceBinding.chartResultHash);
});

it("keeps relationship star and palace facts independent of career routes, with both perspectives for unspecified sex", () => {
  const relation = domain(read(a).reading, "relationships");
  expect(relation.paragraphs.join()).toContain("传统财星视角");
  expect(relation.paragraphs.join()).toContain("传统官杀视角");
  expect(relation.paragraphs.join()).toContain("婚恋宫位");
  expect(relation.paragraphs.join()).not.toMatch(/专业报酬|印格泄秀|财的当前任务是调印/);
  expect(relation.sourceSubjects).toContain("chapter-relationships");
  expect(relation.sourceSubjects).not.toContain("chapter-career");
});

it("retains the child's own learning, materials and peer stories without adult job or partner defaults", () => {
  const reading = read(child).reading, text = reading.domains.flatMap(item => [item.title, item.headline, ...item.paragraphs]).join(" ");
  expect(domain(reading, "career").title).toContain("学习"); expect(domain(reading, "wealth").title).toContain("用品");
  expect(domain(reading, "relationships").paragraphs.join()).toContain("同伴");
  expect(text).not.toMatch(/岗位|报酬|工资|升职|伴侣|婚姻|收入/);
});

it("does not infer age or a relationship lens from missing hour or unspecified sex", () => {
  const hour = read(unknownHour).reading, sex = read(a).reading;
  expect(hour.sourceBinding.includeHour).toBe(false); expect(hour.limitations.join()).toContain("出生时辰未确定");
  expect(hour.limitations.join()).toContain("当前年龄阶段");
  expect(hour.bodyText).not.toContain("若在职");
  expect(sex.sourceBinding.includeHour).toBe(true); expect(sex.limitations.join()).not.toContain("当前年龄阶段");
  expect(domain(sex, "relationships").paragraphs.join()).not.toMatch(/妻子|丈夫|必婚/);
});

it("keeps a verified retired setting in both titles and concrete objects, and rejects a dropped context", () => {
  const { report, reading } = read(retired), career = domain(reading, "career"), money = domain(reading, "wealth");
  expect(career.title).toBe("经验发挥与日常活动"); expect(money.title).toBe("日常开支与活动投入");
  expect(career.paragraphs.join()).toContain("退休"); expect(career.paragraphs.join()).toContain("自选活动");
  expect(money.paragraphs.join()).toContain("活动费用");
  expect([career.headline, money.headline, ...career.paragraphs, ...money.paragraphs].join()).not.toMatch(/若在职|岗位|客户|工资/);
  expect(() => buildPlainFullReading(report, retired.assessment, null, { ...retired.extras, contextual: null })).toThrow(/背景/);
});

it("keeps day-palace combination scenes in remaining handovers when the verified relationship setting is separated", () => {
  const before = JSON.stringify(separated), relation = domain(read(separated).reading, "relationships");
  expect(relation.headline).toContain("分开后");
  expect(relation.paragraphs.join()).toContain("实际交接");
  expect(relation.paragraphs.join()).toContain("不据合象推复合");
  expect(relation.paragraphs.join()).not.toMatch(/第二次见面|筹划一次旅行|一起吃饭散步|围绕一件事走近/);
  expect(JSON.stringify(separated)).toBe(before);
});

async function adopted(subject: "chapter-career" | "useful-stem-useful-辛", text: string) {
  const chapter = b.comprehensive.chapters.find(item => item.id === "career")!, guidance = b.comprehensive.usefulGuidance!;
  const stem = guidance.entries.find(item => item.stem === "辛")!;
  const choice: ReadingFeedbackChoice = subject === "chapter-career"
    ? { id: subject, label: chapter.title, originalConclusion: `${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${b.comprehensive.version}`, sourceVersions: [b.comprehensive.version] }
    : { id: subject, label: stem.roleLabel, originalConclusion: `${stem.stem}（${stem.tenGod}）· ${stem.roleLabel}\n${stem.presenceText}\n${stem.judgment}\n${stem.conditions.map(condition => `条件：${condition}`).join("\n")}\n取用解读规则：${guidance.version}\n综合解读规则：${b.comprehensive.version}`, sourceVersions: [b.comprehensive.version, guidance.version] };
  const root = record(b.revision, buildStructuredReadingFeedback(b.assessment, { subjectId: choice.id, subjectLabel: choice.label, originalConclusion: choice.originalConclusion,
    sourceVersions: choice.sourceVersions, rating: "partial", aspect: "完整原文保留", occurredAt: "合成测试", actualSituation: "不是实际经历", requestedRevision: text }), 1, ["解读反馈"]);
  const review = record(b.revision, await buildReadingFeedbackReview(root, null, readingFeedbackSource(b.assessment, choice.sourceVersions), { state: "revised", notes: "合成采用", revisedConclusion: text, occurredAt: "合成测试" }), 2, ["解读反馈", "解读反馈复核"]);
  const personal = await buildLocalPersonalReading({ revision: b.revision, assessment: b.assessment, choices: [choice], records: [root, review] });
  const synthesis = buildReadingSynthesis({ revision: b.revision, assessment: b.assessment, comprehensive: b.comprehensive, life: b.extras.life, personal });
  return { ...b, extras: { ...b.extras, synthesis, personalReading: personal } };
}

it("keeps exact adopted text registered and does not reintroduce automatic career or dependency summaries", async () => {
  const text = '## 条件\n{"summary":"这是我的个人原文"}\n先考察是我自己的措辞。';
  const value = await adopted("chapter-career", text), before = JSON.stringify(value), { report, reading } = read(value);
  const career = domain(reading, "career"); expect(career.origin).toBe("personal"); expect(career.personalTextIds.length).toBeGreaterThan(0);
  expect(report.personalTexts.find(item => career.personalTextIds.includes(item.id))!.text).toBe(text);
  expect(career.paragraphs.join()).not.toContain("细致、稳定");
  expect(reading.introduction.join()).not.toContain("愿意弄懂来龙去脉");
  expect(JSON.stringify(value)).toBe(before);
});

it("guards adopted individual useful-word dependencies instead of revealing the automatic main conclusion", async () => {
  const { reading, report } = read(await adopted("useful-stem-useful-辛", "这项用字采用我的完整原文。"));
  expect(report.personalTexts.some(item => item.subjectId === "useful-stem-useful-辛")).toBe(true);
  expect(reading.bodyText).not.toContain("愿意弄懂来龙去脉");
  expect(reading.introduction.join()).not.toContain("首用辛食神");
  expect(reading.introductionPersonalTextIds.length).toBeGreaterThan(0);
  expect(reading.domains.filter(item => item.id !== "relationships").every(item => item.origin === "personal")).toBe(true);
  expect(domain(reading, "relationships").origin).not.toBe("personal");
  expect(domain(reading, "relationships").paragraphs).toEqual(domain(read(b).reading, "relationships").paragraphs);
});

it("rejects cross-chart inputs and keeps source objects immutable", () => {
  const { report } = read(b), original = JSON.stringify(report);
  expect(() => buildPlainFullReading(report, a.assessment, null, b.extras)).toThrow(/不同命盘/);
  expect(() => buildPlainFullReading(report, b.assessment, null, { ...b.extras, synthesis: a.extras.synthesis })).toThrow(/不同命盘/);
  expect(() => buildPlainFullReading({...report,natalConclusion:read(a).report.natalConclusion}, b.assessment, null, b.extras)).toThrow(/本命裁决/);
  expect(JSON.stringify(report)).toBe(original);
});
