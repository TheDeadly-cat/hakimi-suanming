import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { calculatePillarRelations } from "@hakimi/relations-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { interpretBaziChart } from "./index";
import { buildBaziPreliminaryAssessment } from "./preliminary-assessment";
import { BAZI_COMPREHENSIVE_READING_VERSION, buildBaziComprehensiveReading, type BaziComprehensiveChapterId } from "./comprehensive-reading";
import { buildNatalPatternDiagnosis } from "./natal-pattern-diagnosis";
import { OUTLOOK_CLASSICAL_SOURCES } from "./outlook-classical-sources";
import { buildNatalRelationshipFoundation, NATAL_RELATIONSHIP_FOUNDATION_VERSION } from "./natal-relationship-foundation";
import { NATAL_RELATIONSHIP_SOURCES, NATAL_RELATIONSHIP_SOURCES_VERSION } from "./natal-relationship-sources";
import { NATAL_AUTHORITY_SOURCES } from "./natal-authority-sources";
import { NATAL_WEALTH_RESOURCE_SOURCES } from "./natal-wealth-resource-sources";

async function revisionFor(date: string, time = "08:26", sex: "male" | "female" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time,
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic comprehensive reading", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-15T00:00:00.000Z" });
}
const IDS: BaziComprehensiveChapterId[] = ["overview", "structure", "useful_elements", "personality", "career", "wealth", "relationships", "family", "development"];
it.each([
  ["1957-09-13", "00:26", "resource_first", "护身制伤"],
  ["1982-10-02", "10:26", "wealth_first", "调印"],
  ["1944-08-09", "04:26", "official_joint", "各司其职"],
] as const)("puts the actual wealth-resource task in the overview and retains only used local sources for %s", async (date, time, task, phrase) => {
  const revision = await revisionFor(date, time), p = buildBaziPreliminaryAssessment(revision), before = structuredClone({ revision, p });
  const reading = buildBaziComprehensiveReading(revision, p), d = reading.patternDiagnosis!, u = reading.usefulGuidance!;
  expect(d.wealthResourceTask.task).toBe(task); expect(reading.chapters.map((chapter) => chapter.id)).toEqual(IDS);
  expect(reading.summary).toContain(d.currentJudgment); expect(reading.summary).toContain(u.answer.headline);
  const overview = reading.chapters.find((chapter) => chapter.id === "overview")!;
  expect(overview.headline).toBe(d.headline); expect(overview.verdict).toContain(phrase);
  expect(overview.paragraphs).toContain(u.answer.summary);
  expect(overview.cautions).toEqual(u.answer.condition ? [u.answer.condition] : []);
  for (const condition of d.conditions) expect(overview.evidence).toContain(condition);
  for (const evidence of u.answer.evidence) expect(overview.evidence).toContain(evidence);
  expect(overview.cautions.join("\n")).not.toContain("第五柱");
  expect(reading.chapters.find((chapter) => chapter.id === "structure")!.verdict).toBe(d.currentJudgment);
  expect(reading.chapters.find((chapter) => chapter.id === "useful_elements")!.verdict).toBe(u.answer.summary);
  const used = NATAL_WEALTH_RESOURCE_SOURCES.filter((source) => d.sourceIds.includes(source.id));
  expect(used.length).toBeGreaterThan(0);
  expect(reading.sources!.filter((source) => NATAL_WEALTH_RESOURCE_SOURCES.some((item) => item.id === source.id))).toEqual(used);
  for (const source of used) expect(reading.chapters.find((chapter) => chapter.id === "structure")!.sourceIds).toContain(source.id);
  expect({ revision, p }).toEqual(before);
});
it("states the actual rooted-peer relative band across all nine chapters without inventing fixed element priorities", async () => {
  const revision = await revisionFor("2019-12-22", "11:23"), assessment = buildBaziPreliminaryAssessment(revision);
  const original = JSON.stringify({ revision, assessment }), reading = buildBaziComprehensiveReading(revision, assessment);
  expect(reading.chapters.map((chapter) => chapter.id)).toEqual(IDS);
  expect(reading.summary).toContain("得令有根，强弱相对均衡");
  expect(assessment.balance).toMatchObject({ band: "weak", supportWeight: 9, demandWeight: 13 });
  expect(assessment.balance.structural.working).toMatchObject({ band: "balanced", direction: "conditional",
    focus: "rooted_peer_mixed_authority", favorableElements: [], unfavorableElements: [] });
  expect(reading.summary).toContain(reading.patternDiagnosis!.currentJudgment);
  expect(reading.summary).toContain(reading.usefulGuidance!.answer.headline);
  expect(reading.summary).not.toContain("总体安排以");
  const overview = reading.chapters.find((chapter) => chapter.id === "overview")!;
  expect(overview.verdict).toContain(assessment.balance.structural.working.label);
  expect(overview.verdict).toContain("身势判断与用字任务分看");
  expect(overview.verdict).toContain(reading.patternDiagnosis!.currentJudgment);
  expect(overview.paragraphs).toContain(reading.usefulGuidance!.answer.summary);
  expect(overview.verdict).toContain("七杀");
  expect(reading.chapters.find((chapter) => chapter.id === "structure")!.verdict).toBe(reading.patternDiagnosis!.currentJudgment);
  const visible = reading.chapters.flatMap((chapter) => [chapter.headline, chapter.verdict, ...chapter.paragraphs]).join("\n");
  expect(visible).not.toMatch(/当前判断相对中和|本盘相对中和|日主偏弱|先补承接能力，再增加任务|当前先取金、水/);
  const career = reading.chapters.find((chapter) => chapter.id === "career")!;
  expect(career.verdict).toContain("正官的职责标准与七杀的紧迫要求分开安排");
  expect(career.paragraphs.join()).toContain("戊正官侧重明确职责与完成标准");
  expect(career.paragraphs.join()).toContain("己七杀侧重紧迫要求与制约");
  expect(reading.chapters.find((chapter) => chapter.id === "wealth")!.verdict).toContain("财生正官与财生七杀分开阅读");
  expect(reading.usefulGuidance!.answer.headline).toContain("丙已透有根");
  expect(reading.usefulGuidance!.answer.headline).toContain("辛未见");
  expect(reading.chapters.find((chapter) => chapter.id === "useful_elements")!.paragraphs.join()).toContain("己七杀");
  expect(JSON.stringify({ revision, assessment })).toBe(original);
});
it("keeps R3 clearing and self-combination sources local to their actual diagnosis and visible chapters", async () => {
  const revision = await revisionFor("2019-12-22", "11:23", "female"), assessment = buildBaziPreliminaryAssessment(revision);
  const reading = buildBaziComprehensiveReading(revision, assessment);
  expect(reading.patternDiagnosis!.sourceIds).toContain("natal-zq-lujie-authority-clearing");
  expect(reading.patternDiagnosis!.sourceIds).toContain("natal-zq-self-combination-not-removal");
  for (const id of ["overview", "structure", "useful_elements"] as const) {
    const chapter = reading.chapters.find((item) => item.id === id)!;
    for (const sourceId of ["natal-zq-lujie-authority-clearing", "natal-zq-self-combination-not-removal"]) {
      expect(chapter.sourceIds).toContain(sourceId);
      expect(reading.sources!.find((source) => source.id === sourceId)).toEqual(NATAL_AUTHORITY_SOURCES.find((source) => source.id === sourceId));
    }
  }
  expect(reading.chapters.find((chapter) => chapter.id === "structure")!.verdict).toMatch(/戊.*正官/);
  expect(reading.chapters.find((chapter) => chapter.id === "structure")!.verdict).toMatch(/己.*七杀/);
  for (const date of ["1995-08-18", "1995-05-18"]) {
    const other = await revisionFor(date), comparison = buildBaziComprehensiveReading(other, buildBaziPreliminaryAssessment(other));
    expect(comparison.sources!.some((source) => NATAL_AUTHORITY_SOURCES.some((local) => local.id === source.id))).toBe(false);
  }
});
it("does not apply the Gui-Zi seasonal priority to a real summer-fire R3 chart", async () => {
  const revision = await revisionFor("1980-06-12", "10:26"), assessment = buildBaziPreliminaryAssessment(revision);
  const reading = buildBaziComprehensiveReading(revision, assessment);
  expect(assessment.balance.structural.working.focus).toBe("rooted_peer_mixed_authority");
  expect(reading.summary).toContain(reading.patternDiagnosis!.currentJudgment);
  expect(reading.summary).not.toMatch(/先丙|丙先|温通支点|辛未见/);
  expect(reading.summary).toContain("庚");
});
let demo: RevisionRecord, weak: RevisionRecord, strong: RevisionRecord, alternateHour: RevisionRecord;
let foodWealth: RevisionRecord, foodKilling: RevisionRecord, balancedFoodWealth: RevisionRecord, stemOnly: RevisionRecord, mixedOutput: RevisionRecord;
beforeAll(async () => {
  [demo, weak, strong, alternateHour] = await Promise.all([
    revisionFor("1995-08-18"), revisionFor("1995-03-18"), revisionFor("1993-04-03"), revisionFor("1995-08-18", "19:26")
  ]);
  [foodWealth, foodKilling, balancedFoodWealth, stemOnly, mixedOutput] = await Promise.all([
    revisionFor("1990-10-18", "20:26"), revisionFor("1991-02-08", "02:26"), revisionFor("1995-11-18"),
    revisionFor("1995-02-18"), revisionFor("1995-10-18")
  ]);
});

describe("bound local comprehensive readings from actual chart calculations", () => {
  it("preserves the complete new relationship and family answers and their specific source metadata", () => {
    const assessment = buildBaziPreliminaryAssessment(demo), reading = buildBaziComprehensiveReading(demo, assessment);
    const foundation = buildNatalRelationshipFoundation(demo, assessment);
    expect(reading.version).toBe("hakimi.bazi-comprehensive-reading/0.15.0");
    expect(reading.version).toBe(BAZI_COMPREHENSIVE_READING_VERSION);
    expect(foundation.version).toBe("hakimi.natal-relationship-foundation/0.2.0");
    expect(NATAL_RELATIONSHIP_SOURCES_VERSION).toBe("hakimi.natal-relationship-sources/0.2.0");
    expect(reading.relationshipFoundation).toEqual(foundation);
    expect(foundation.version).toBe(NATAL_RELATIONSHIP_FOUNDATION_VERSION);
    expect(foundation.sourceBinding).toEqual({ ...reading.sourceBinding, sex: demo.input.sex });
    for (const [id, body] of [["relationships", foundation.relationship], ["family", foundation.family]] as const) {
      const chapter = reading.chapters.find((item) => item.id === id)!;
      expect(chapter.headline).toBe(body.headline); expect(chapter.verdict).toBe(body.verdict);
      expect(chapter.paragraphs).toEqual(body.paragraphs);
      expect(chapter.evidence).toEqual([...new Set(body.evidence)]);
      expect(chapter.sourceIds).toEqual([...new Set(body.sourceIds)]);
      expect(chapter.cautions).toEqual(body.cautions);
      expect(chapter.strengths).toEqual([...new Set(body.strengths)]);
      expect(chapter.suggestions).toEqual([...new Set(body.suggestions)]);
    }
    expect(foundation.sources.length).toBeGreaterThan(0);
    for (const source of foundation.sources) {
      expect(reading.sources!.find((item) => item.id === source.id)).toEqual(source);
      expect(source).toEqual(NATAL_RELATIONSHIP_SOURCES.find((item) => item.id === source.id));
    }
    for (const id of [...foundation.relationship.sourceIds, ...foundation.family.sourceIds]) {
      expect(reading.sources!.some((source) => source.id === id)).toBe(true);
    }
    expect(reading.sources!.map((source) => source.id).filter((id) => id.startsWith("relationship-foundation-"))).toEqual(foundation.sources.map((source) => source.id));
  });

  it("retains the declared traditional perspective separately without assigning a real partner identity", async () => {
    const readings = await Promise.all((["male", "female", "unspecified"] as const).map(async (sex) => {
      const revision = await revisionFor("1995-08-18", "08:26", sex), assessment = buildBaziPreliminaryAssessment(revision);
      return buildBaziComprehensiveReading(revision, assessment);
    }));
    expect(readings.map((item) => item.relationshipFoundation!.sourceBinding.sex)).toEqual(["male", "female", "unspecified"]);
    expect(readings[0]!.relationshipFoundation!.perspectives).not.toEqual(readings[1]!.relationshipFoundation!.perspectives);
    for (const reading of readings) {
      const chapter = reading.chapters.find((item) => item.id === "relationships")!;
      expect(chapter.verdict).toBe(reading.relationshipFoundation!.relationship.verdict);
      expect([chapter.verdict, ...chapter.paragraphs].join()).not.toMatch(/必定结婚|一定离婚|注定无婚|必有外遇|必有二婚/u);
    }
  });
  it.each([
    ["2018-11-19", "14:26", "戊"], ["1999-01-09", "02:26", "乙"],
  ])("carries the qualified resource-wealth task through the nine chapters for %s", async (date, time, wealth) => {
    const revision = await revisionFor(date, time), preliminary = buildBaziPreliminaryAssessment(revision);
    const original = structuredClone({ revision, preliminary }), reading = buildBaziComprehensiveReading(revision, preliminary);
    expect(reading.chapters.map((chapter) => chapter.id)).toEqual(IDS);
    expect(reading.patternDiagnosis!.primaryPathId).toBe("resource-wealth");
    expect(reading.usefulGuidance!.answer.primaryStems).toEqual([wealth]);
    expect(reading.summary).toContain("以实际用途调节积累与投入");
    expect(reading.chapters.find((chapter) => chapter.id === "career")!.verdict).toContain("用实际需求筛选准备");
    expect(reading.chapters.find((chapter) => chapter.id === "wealth")!.verdict).toContain("财用于裁抑过多印的投入");
    expect(reading.chapters.find((chapter) => chapter.id === "structure")!.sourceIds).toContain("outlook-zq-resource-wealth");
    expect(reading.sources!.find((source) => source.id === "outlook-zq-resource-wealth")!.excerpt).toBeTruthy();
    const useful = reading.chapters.find((chapter) => chapter.id === "useful_elements")!;
    for (const entry of reading.usefulGuidance!.entries) {
      expect(useful.paragraphs.join()).toContain(entry.judgment);
      for (const condition of entry.conditions) expect(useful.paragraphs.join()).toContain(condition);
    }
    expect({ revision, preliminary }).toEqual(original);
  });

  it("uses the rooted food-to-wealth judgment throughout the report while retaining the weak raw comparison", async () => {
    const revision = await revisionFor("1907-03-15", "02:26");
    const original = structuredClone(interpretBaziChart(revision.facts));
    const preliminary = buildBaziPreliminaryAssessment(revision);
    const reading = buildBaziComprehensiveReading(revision, preliminary);
    expect(preliminary.balance).toMatchObject({ supportWeight: 8, demandWeight: 15, band: "weak" });
    expect(preliminary.balance.structural.working).toMatchObject({ selection: "structural_rule", band: "strong", favorableElements: ["fire"] });
    expect(preliminary.headline).toContain(preliminary.balance.structural.working.label);
    expect(reading.usefulGuidance!.balanceText).toContain("当前先取火");
    const overview = reading.chapters.find((chapter) => chapter.id === "overview")!;
    expect(overview.paragraphs.join()).toContain("已有成果");
    expect(overview.paragraphs.join()).toContain("月令主气乙食神与实际透出的财星配合");
    expect(overview.paragraphs.join()).not.toContain("伤官与财星实际透出");
    expect(overview.cautions.join()).toContain("原计权及其扰动场景只作旧法对照");
    expect(overview.sourceIds).toEqual(expect.arrayContaining(preliminary.balance.structural.working.sourceIds));
    expect(reading.usefulGuidance!.entries.find((entry) => entry.stem === "丁")!.roles.map((role) => role.kind)).toContain("baseline_favorable");
    expect(interpretBaziChart(revision.facts)).toEqual(original);
  });

  it("does not promote wealth along with output in the rooted resource case", async () => {
    const revision = await revisionFor("2018-03-15", "00:26");
    const preliminary = buildBaziPreliminaryAssessment(revision);
    const reading = buildBaziComprehensiveReading(revision, preliminary);
    expect(preliminary.balance.structural.working).toMatchObject({ focus: "output_after_resource", favorableElements: ["earth"] });
    expect(reading.chapters.find((chapter) => chapter.id === "wealth")!.verdict).toContain("财的经营仍需看后续配合，不直接列为喜用");
    expect(reading.usefulGuidance!.balanceText).toContain("当前先取土");
  });
  it("describes the classical month-killing structure without inventing an exposed killing stem", async () => {
    const revision = await revisionFor("1995-09-21", "02:26");
    expect(Object.values(revision.facts.pillars).map((p) => p.ganZhi)).toEqual(["乙亥", "乙酉", "乙卯", "丁丑"]);
    const reading = buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision));
    expect(reading.patternDiagnosis!.primaryPathId).toBe("food-killings");
    expect(reading.patternDiagnosis!.monthCommandRole).toMatchObject({ stem: "辛", tenGod: "七杀", kind: "main_hidden" });
    const career = reading.chapters.find((chapter) => chapter.id === "career")!;
    expect(career.paragraphs.join()).toContain("月令主气辛七杀与实际透出的食神配合");
    expect(career.paragraphs.join()).not.toContain("食神与七杀透出");
    expect(reading.usefulGuidance!.entries.find((entry) => entry.stem === "辛")!.presence).toBe("hidden_only");
    expect(reading.chapters.find((chapter) => chapter.id === "structure")!.sourceIds).toContain("outlook-zq-killing-month-example");
  });

  it.each([
    ["2000-03-11", "00:26", "official-wealth", "乙", "正官", "财星", "财星与官星透出"],
    ["2000-03-11", "10:26", "official-resource", "乙", "正官", "印星", "正官和印星透出"],
    ["1995-09-21", "12:26", "killings-resource", "辛", "七杀", "印星", "七杀和印星透出"],
  ])("retains hidden month-command identity in the full report for %s %s", async (date, time, path, stem, god, partner, wrongClaim) => {
    const revision = await revisionFor(date!, time!);
    expect(Object.values(revision.facts.pillars).some((pillar) => pillar.stem === stem)).toBe(false);
    const reading = buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision));
    expect(reading.patternDiagnosis!.primaryPathId).toBe(path);
    expect(reading.patternDiagnosis!.monthCommandRole).toMatchObject({ stem, tenGod: god, kind: "main_hidden" });
    const career = reading.chapters.find((chapter) => chapter.id === "career")!;
    expect(career.paragraphs.join()).toContain(`月令主气${stem}${god}与实际透出的${partner}配合`);
    expect(career.paragraphs.join()).not.toContain(wrongClaim);
    expect(reading.usefulGuidance!.entries.find((entry) => entry.stem === stem)!.presence).toBe("hidden_only");
  });

  it("builds all nine answer-first chapters from the actual Xin-Shen structure and positions", () => {
    const preliminary = buildBaziPreliminaryAssessment(demo);
    const reading = buildBaziComprehensiveReading(demo, preliminary);
    expect(Object.values(demo.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["乙亥", "甲申", "辛巳", "壬辰"]);
    expect(reading.chapters.map((chapter) => chapter.id)).toEqual(IDS);
    expect(reading.sourceBinding).toEqual({ revisionId: demo.id, chartResultHash: demo.manifest.resultHash, includeHour: true });
    expect(reading.summary).toContain("技能交付与成果兑现");
    const chapters = Object.fromEntries(reading.chapters.map((chapter) => [chapter.id, chapter]));
    expect(chapters.overview!.paragraphs.join()).toContain("月劫背景");
    expect(chapters.overview!.paragraphs.join()).toContain("专业输出、解决问题和稳定交付争取资源");
    expect(chapters.structure!.paragraphs.join()).toContain("申中壬为伤官，透在时柱");
    expect(chapters.personality!.paragraphs.join()).toContain("月干甲的正财与月令劫财");
    expect(chapters.career!.evidence.some((text) => text.includes("时柱透壬（伤官）"))).toBe(true);
    expect(chapters.wealth!.verdict).toContain("不固定把财判为喜或忌");
    expect(reading.usefulGuidance!.entries.find((entry) => entry.stem === "壬")!.presence).toBe("exposed_rooted");
    expect(reading.usefulGuidance!.entries.find((entry) => entry.stem === "甲")!.presence).toBe("exposed_rooted");
    expect(chapters.useful_elements!.paragraphs.join()).toContain("壬透在时柱");
    expect(chapters.useful_elements!.paragraphs.join()).toContain("甲透在月柱");
    expect(reading.usefulGuidance!.seasonalBalanceConflict.baseline).toBe(false);
    expect(reading.usefulGuidance!.seasonalBalanceConflict.alternativeScenarioIds.length).toBeGreaterThan(0);
    expect(chapters.useful_elements!.paragraphs.join()).toContain(reading.usefulGuidance!.seasonalBalanceConflict.summary);
    expect(chapters.personality!.headline).toBe("做事求实效，相处重承诺");
    expect(chapters.personality!.paragraphs.join()).toContain("说话的锋芒与做事的责任感");
    expect(chapters.family!.headline).toBe("灵活援手与持续履约分开落实");
    for (const chapter of reading.chapters) {
      expect(chapter.verdict).not.toMatch(/[?？]/);
      expect(chapter.paragraphs.length).toBeGreaterThanOrEqual(3);
      expect(chapter.evidence.length).toBeGreaterThanOrEqual(2);
      expect(chapter.strengths.length).toBeGreaterThan(0);
      expect(chapter.cautions.length).toBeGreaterThan(0);
      expect(chapter.suggestions.length).toBeGreaterThan(0);
      expect(chapter.sourceIds.every((id) => [...preliminary.sources, ...(reading.sources ?? [])].some((source) => source.id === id))).toBe(true);
      expect(chapter.paragraphs.join()).not.toContain("不是能力或人生分数");
      expect(chapter.paragraphs[0]).not.toBe(chapter.verdict);
    }
  });

  it("changes the actual chapters and practical direction across balanced, weak and strong charts", () => {
    const readings = [demo, weak, strong].map((revision) => buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision)));
    expect(readings[1]!.chapters.find((chapter) => chapter.id === "career")!.verdict).toContain("专业积累与责任承接");
    expect(readings[1]!.usefulGuidance!.balanceText).toContain("先取火、土");
    expect(readings[2]!.usefulGuidance!.balanceText).toContain("先取火、土、金");
    expect(readings[1]!.chapters.find((chapter) => chapter.id === "wealth")!.verdict).toContain("先增强承接");
    expect(readings[2]!.chapters.find((chapter) => chapter.id === "wealth")!.verdict).toContain("经营当作已有成果兑现的出口");
    for (const id of ["overview", "personality", "wealth", "relationships", "useful_elements"] as const) {
      expect(new Set(readings.map((reading) => reading.chapters.find((chapter) => chapter.id === id)!.verdict)).size).toBe(3);
    }
    expect(readings.every((reading) => reading.chapters.every((chapter) => !chapter.verdict.includes("待核")))).toBe(true);
  });

  it("anchors every stated relation in the same chart's audited binary facts without assigning event outcomes", () => {
    const reading = buildBaziComprehensiveReading(demo, buildBaziPreliminaryAssessment(demo));
    const actual = calculatePillarRelations(demo.facts).facts;
    const relationEvidence = reading.chapters.flatMap((chapter) => chapter.evidence).filter((item) => item.includes("；事实 "));
    expect(relationEvidence.length).toBeGreaterThan(0);
    for (const evidence of relationEvidence) {
      const id = evidence.split("；事实 ")[1]!.slice(0, -1);
      const fact = actual.find((item) => item.id === id);
      expect(fact).toBeDefined();
      expect(fact!.completeness).toBe("binary");
      expect(fact!.verificationStatus).toBe("upstream_public_constant_audited");
    }
    expect(reading.relationshipFoundation!.conditions.join()).toContain("不据此推出无婚、婚次、出轨、品行或必然婚变");
    expect(reading.relationshipFoundation!.conditions.join()).toContain("未判合化、合去、冲散或一合解除另一冲");
    expect(reading.limitations.join()).toContain("不把合冲次数换算为吉凶分数");
  });

  it("never consumes an untrusted historical hour for unknown-hour readings, including its relation effects", () => {
    // Compatibility shape: a historical cached chart contains an hour but the
    // user's retained precision says unknown; no new exact birth time is asserted.
    const unknown = structuredClone(demo);
    unknown.input = { ...unknown.input, time: null, timePrecision: "unknown_hour" };
    const otherPlaceholder = structuredClone(unknown);
    otherPlaceholder.facts.pillars.hour = structuredClone(alternateHour.facts.pillars.hour);
    const preliminary = buildBaziPreliminaryAssessment(unknown);
    const otherPreliminary = buildBaziPreliminaryAssessment(otherPlaceholder);
    const reading = buildBaziComprehensiveReading(unknown, preliminary);
    expect(buildBaziComprehensiveReading(otherPlaceholder, otherPreliminary)).toEqual(reading);
    expect(reading.sourceBinding.includeHour).toBe(false);
    expect(JSON.stringify(reading)).not.toContain("壬辰");
    expect(JSON.stringify(reading)).not.toContain(alternateHour.facts.pillars.hour.ganZhi);
    expect(reading.chapters.flatMap((chapter) => chapter.evidence).filter((text) => text.includes("；事实 ")).every((text) => !text.includes("hour:") && !text.includes("时柱"))).toBe(true);
    expect(reading.chapters.find((chapter) => chapter.id === "structure")!.headline).not.toContain("伤官生财");
    expect(reading.chapters.find((chapter) => chapter.id === "development")!.verdict).toContain("只依据已知三柱");
  });

  it("rejects another chart or inconsistent hour scope instead of silently mixing facts and interpretation", () => {
    const preliminary = buildBaziPreliminaryAssessment(demo);
    expect(() => buildBaziComprehensiveReading(weak, preliminary)).toThrow("不匹配");
    const idMismatch = structuredClone(preliminary); idMismatch.sourceBinding.revisionId = "33333333-3333-4333-8333-333333333333";
    expect(() => buildBaziComprehensiveReading(demo, idMismatch)).toThrow("不匹配");
    const hourMismatch = structuredClone(preliminary); hourMismatch.sourceBinding.includeHour = false;
    expect(() => buildBaziComprehensiveReading(demo, hourMismatch)).toThrow("不匹配");
    const factMismatch = structuredClone(preliminary); factMismatch.pattern.monthMainStem = "丁";
    expect(() => buildBaziComprehensiveReading(demo, factMismatch)).toThrow("月令事实不匹配");
  });

  it("is deterministic and leaves chart facts, preliminary axes and historical interpretation unchanged", () => {
    const preliminary = buildBaziPreliminaryAssessment(demo);
    const revisionBefore = JSON.stringify(demo), preliminaryBefore = JSON.stringify(preliminary), oldReading = JSON.stringify(interpretBaziChart(demo.facts));
    const reading = buildBaziComprehensiveReading(demo, preliminary);
    expect(buildBaziComprehensiveReading(demo, preliminary)).toEqual(reading);
    expect(JSON.stringify(demo)).toBe(revisionBefore);
    expect(JSON.stringify(preliminary)).toBe(preliminaryBefore);
    expect(JSON.stringify(interpretBaziChart(demo.facts))).toBe(oldReading);
  });

  it("distinguishes actual food-to-wealth, hurting-to-wealth and food-control-killing rather than one output career template", () => {
    const chapter = (revision: RevisionRecord, id: BaziComprehensiveChapterId) => buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision)).chapters.find((item) => item.id === id)!;
    expect(Object.values(foodWealth.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["庚午", "丙戌", "丙辰", "戊戌"]);
    expect(buildBaziPreliminaryAssessment(foodWealth).pattern.candidates.some((item) => item.label === "食神生财取向")).toBe(true);
    expect(buildBaziPreliminaryAssessment(foodKilling).pattern.candidates.some((item) => item.id === "food-killing")).toBe(true);
    expect(chapter(foodWealth, "career").verdict).toContain("把方法做熟、成品做稳");
    expect(chapter(demo, "career").verdict).toContain("让改进解决实际问题");
    expect(chapter(foodKilling, "career").verdict).toContain("稳定方法接住紧迫要求");
    expect(chapter(foodWealth, "wealth").paragraphs.join()).toContain("维持质量与增加数量");
    expect(chapter(demo, "wealth").paragraphs.join()).toContain("改进价值与现实需求");
    expect(chapter(foodKilling, "wealth").verdict).toContain("解决难题的方法");
    expect(chapter(weak, "wealth").verdict).toContain("专业承接");
  });

  it("gives the same food-wealth path different capacity conclusions on real weak and balanced charts", () => {
    const weakP = buildBaziPreliminaryAssessment(foodWealth), balancedP = buildBaziPreliminaryAssessment(balancedFoodWealth);
    expect(weakP.balance.baselineDirection).toBe("support");
    expect(balancedP.balance.baselineDirection).toBe("balanced");
    expect(balancedP.pattern.candidates.some((item) => item.label === "食神生财取向")).toBe(true);
    const a = buildBaziComprehensiveReading(foodWealth, weakP).chapters.find((chapter) => chapter.id === "career")!;
    const b = buildBaziComprehensiveReading(balancedFoodWealth, balancedP).chapters.find((chapter) => chapter.id === "career")!;
    expect(a.verdict).toContain("先守住承接与质量，再增加任务");
    expect(a.paragraphs.join()).toContain("重复交付会持续消耗");
    expect(b.verdict).toContain("让投入、完成和兑现同频");
    expect(b.paragraphs.join()).not.toContain("不能因为做得稳定就默认还能无限加量");
  });

  it("uses actual exposed versus hidden output and support positions rather than copying the same life interpretation", () => {
    const read = (revision: RevisionRecord) => buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision));
    const at = (revision: RevisionRecord, id: BaziComprehensiveChapterId) => read(revision).chapters.find((chapter) => chapter.id === id)!;
    expect(demo.facts.pillars.hour.stemTenGod).toBe("伤官");
    expect(at(demo, "career").paragraphs.join()).toContain("时柱透壬（伤官），与长期打磨、整理成果");
    expect(at(alternateHour, "career").paragraphs.join()).toContain("输出通道需要用具体任务带出来");
    expect(at(alternateHour, "career").verdict).not.toContain("让改进解决实际问题");
    expect(at(demo, "family").paragraphs.join()).toContain("年柱乙亥明透乙偏财");
    expect(at(demo, "family").paragraphs.join()).toContain("月柱甲申明透甲正财");
    expect(at(demo, "family").paragraphs[0]).toContain("临时援手、灵活调度");
    expect(at(demo, "family").paragraphs[1]).toContain("固定开销、规律照应");
    expect(at(weak, "family").paragraphs.join()).toContain(`时柱明透${weak.facts.pillars.hour.stem}${weak.facts.pillars.hour.stemTenGod}`);
    expect(at(weak, "family").evidence).toContain(`时柱透${weak.facts.pillars.hour.stem}${weak.facts.pillars.hour.stemTenGod}。`);
    expect(at(weak, "family").evidence.join()).toContain(`时柱${weak.facts.pillars.hour.branch}中${weak.facts.pillars.hour.hiddenStems[0]}本气`);
    expect(at(strong, "family").paragraphs.join()).toContain(`年柱${strong.facts.pillars.year.ganZhi}明透${strong.facts.pillars.year.stem}${strong.facts.pillars.year.stemTenGod}`);
    expect(at(strong, "family").paragraphs.join()).toContain(`月柱${strong.facts.pillars.month.ganZhi}明透${strong.facts.pillars.month.stem}${strong.facts.pillars.month.stemTenGod}`);
  });

  it("separates day-stem interaction from day-branch shared-life interpretation and distinguishes the same daily food need", () => {
    const reading = buildBaziComprehensiveReading(stemOnly, buildBaziPreliminaryAssessment(stemOnly));
    const relations = calculatePillarRelations(stemOnly.facts).facts.filter((fact) => fact.participants.some((part) => part.position === "day"));
    expect(relations.some((fact) => fact.relationType === "stem_five_combination")).toBe(true);
    expect(relations.some((fact) => fact.relationType === "branch_six_clash" || fact.relationType === "branch_six_combination")).toBe(false);
    const relationship = reading.chapters.find((chapter) => chapter.id === "relationships")!;
    expect(stemOnly.facts.pillars.day.branchTenGods[0]).toBe("偏印");
    expect(relationship.headline).toBe("正财乙已透，辰位侧重不同理解与专项帮助的配合");
    expect(reading.relationshipFoundation!.interactions.some((item) => item.scope === "visible_star" && item.fact.relationType === "stem_five_combination")).toBe(true);
    expect(reading.relationshipFoundation!.interactions.some((item) => item.scope === "day_palace")).toBe(false);
    expect(relationship.paragraphs.join()).toContain("日支辰在所选柱之间未见本层记录的六合或六冲");
    const other = [weak, foodKilling].map((revision) => {
      expect(revision.facts.pillars.day.branchTenGods[0]).toBe("食神");
      return buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision)).chapters.find((chapter) => chapter.id === "relationships")!;
    });
    expect(other[0]!.paragraphs.join()).toContain(`日支${weak.facts.pillars.day.branch}本气${weak.facts.pillars.day.hiddenStems[0]}为食神`);
    expect(other[1]!.paragraphs.join()).toContain(`日支${foodKilling.facts.pillars.day.branch}本气${foodKilling.facts.pillars.day.hiddenStems[0]}为食神`);
    expect(other[0]!.verdict).not.toBe(other[1]!.verdict);
  });

  it("preserves both visible output gods instead of relabeling a mixed candidate as hurting-only", () => {
    const preliminary = buildBaziPreliminaryAssessment(mixedOutput);
    expect(preliminary.pattern.candidates.some((item) => item.label === "食伤生财取向")).toBe(true);
    const reading = buildBaziComprehensiveReading(mixedOutput, preliminary);
    expect(reading.version).toBe("hakimi.bazi-comprehensive-reading/0.15.0");
    expect(reading.chapters.find((chapter) => chapter.id === "career")!.paragraphs.join()).toContain("食神、伤官与财星均有实际透干");
    expect(reading.patternDiagnosis!.primaryPathId).toBe("food-killings");
    expect(reading.patternDiagnosis!.monthCommandRole).toMatchObject({ tenGod: "七杀", kind: "main_hidden" });
    expect(Object.values(mixedOutput.facts.pillars).some((pillar) => pillar.stemTenGod === "七杀")).toBe(false);
    expect(Object.values(mixedOutput.facts.pillars).some((pillar) => pillar.stemTenGod === "食神")).toBe(true);
    expect(reading.chapters.find((chapter) => chapter.id === "career")!.paragraphs.join()).toContain("稳定交付与改进都可以训练");
    expect(reading.patternDiagnosis!.paths.some((path) => path.id === "output-wealth" && path.role === "alternative")).toBe(true);
    expect(reading.chapters.every((chapter) => chapter.sourceIds.every((id) => [...preliminary.sources, ...(reading.sources ?? [])].some((source) => source.id === id)))).toBe(true);
  });

  it("keeps the resource monthly background ahead of a simultaneous food-killing candidate", async () => {
    const revision = await revisionFor("1995-05-18");
    expect(Object.values(revision.facts.pillars).map((p) => p.ganZhi)).toEqual(["乙亥", "辛巳", "己酉", "戊辰"]);
    const p = buildBaziPreliminaryAssessment(revision), result = buildBaziComprehensiveReading(revision, p);
    expect(p.pattern.family).toBe("resource");
    expect(p.pattern.candidates.some((item) => item.id === "food-killing")).toBe(true);
    expect(result.patternDiagnosis!.primaryPathId).toBe("resource-output");
    expect(result.summary).toContain("本盘主线为知识转化与表达应用");
    expect(result.chapters.find((c) => c.id === "career")!.headline).toContain("知识转化");
    expect(result.chapters.find((c) => c.id === "wealth")!.paragraphs.join()).toContain("不是先以制杀或经营规模作为优势");
    const structure = result.chapters.find((c) => c.id === "structure")!;
    expect(structure.paragraphs.join()).toContain("其他候选：食神制杀");
    expect(structure.sourceIds).toContain("outlook-zq-resource-luck");
    expect(result.sources!.find((s) => s.id === "outlook-zq-success-rescue")!.url).toBe("https://www.tianyashuku.com/yijing/9643/814110.html");
    expect(structure.evidence.join()).toContain("resource-luck-4");
    expect(structure.evidence.join()).toContain("hakimi.outlook-classical-sources/0.4.0");
    const personality = result.chapters.find((c) => c.id === "personality")!;
    expect(personality.paragraphs.join()).not.toContain("可先先");
    expect(personality.paragraphs.join()).not.toContain("部分时");
    expect(new Set(personality.suggestions).size).toBe(personality.suggestions.length);
  });

  it("keeps a real combined-with-harmful rescue conditional instead of deleting it or counting free control twice", async () => {
    const revision = await revisionFor("1995-05-17");
    expect(Object.values(revision.facts.pillars).map((p) => p.ganZhi)).toEqual(["乙亥", "辛巳", "戊申", "丙辰"]);
    const p = buildBaziPreliminaryAssessment(revision), result = buildBaziComprehensiveReading(revision, p), diagnosis = result.patternDiagnosis!;
    expect(diagnosis.primaryPathId).toBe("resource-output");
    expect(diagnosis.blockers.some((b) => b.id === "official-hurting")).toBe(true);
    const rescue = diagnosis.rescues.find((item) => item.id === "resource-protects-official")!;
    expect(rescue.text).toContain("时干丙（偏印）与月干辛（伤官）相合");
    expect(rescue.text).toContain("不另计一次自由印制伤");
    expect(rescue.passageIds).toContain("success-rescue-10");
    expect(rescue.scope).toBe("alternative");
    expect(diagnosis.status).toBe("obstructed");
    expect(diagnosis.blockers.find((item) => item.id === "output-resource-combined")!.scope).toBe("primary");
    expect(diagnosis.conditions.join()).toContain("原文专述建禄月劫用官");
    const structure = result.chapters.find((c) => c.id === "structure")!;
    expect(structure.verdict).not.toContain("保留“合伤护官”候选");
    expect(structure.verdict).toContain("输出与支持彼此牵连");
    expect(structure.paragraphs.join()).toContain("官路径备选条件");
    expect(structure.paragraphs.join()).toContain("受阻环节：");
    expect(result.chapters.find((c) => c.id === "career")!.paragraphs.join()).toContain("不能只凭有印便认定冲突已经解决");
  });

  it("distinguishes real food-killing with print from peer-output-wealth with a killing alternative without inventing a light-heavy threshold", async () => {
    const [withPrint, withWealth] = await Promise.all([revisionFor("1991-07-08", "06:26"), revisionFor("1991-07-08", "16:26")]);
    expect(Object.values(withPrint.facts.pillars).map((p) => p.ganZhi)).toEqual(["辛未", "乙未", "己卯", "丁卯"]);
    expect(Object.values(withWealth.facts.pillars).map((p) => p.ganZhi)).toEqual(["辛未", "乙未", "己卯", "壬申"]);
    const a = buildNatalPatternDiagnosis(withPrint, buildBaziPreliminaryAssessment(withPrint));
    const b = buildNatalPatternDiagnosis(withWealth, buildBaziPreliminaryAssessment(withWealth));
    expect(a.primaryPathId).toBe("food-killings"); expect(b.primaryPathId).toBe("peer-output-wealth");
    expect(a.blockers.find((item) => item.id === "resource-controls-food")!.text).toContain("时干丁（偏印）");
    expect(a.conditions.join()).toContain("若食太重而杀轻");
    expect(a.rescues.some((item) => item.id === "wealth-protects-food")).toBe(false);
    expect(b.blockers.some((item) => item.id === "resource-controls-food")).toBe(false);
    expect(b.blockers.some((item) => item.id === "wealth-feeds-killing")).toBe(false);
    expect(b.conditions.join()).toContain("制杀与印化不叠算");
    expect(b.foundation.join()).toContain("时干壬（正财）");
    expect(a.careerImplication).not.toBe(b.careerImplication);
    for (const diagnosis of [a, b]) for (const finding of [...diagnosis.blockers, ...diagnosis.rescues]) {
      const source = OUTLOOK_CLASSICAL_SOURCES.find((s) => s.id === finding.sourceId);
      expect(source).toBeDefined();
      expect(finding.passageIds.every((id) => source!.passages.some((p) => p.id === id))).toBe(true);
    }
    const unknown = structuredClone(withPrint); unknown.input = { ...unknown.input, time: null, timePrecision: "unknown_hour" };
    const noHour = buildNatalPatternDiagnosis(unknown, buildBaziPreliminaryAssessment(unknown));
    expect(noHour.blockers.some((b) => b.id === "resource-controls-food")).toBe(false);
    expect(JSON.stringify(noHour)).not.toContain("时干丁");
  });

  it("retains every useful actor and its full conditions in the nine-chapter text used for saving and feedback", () => {
    for (const revision of [demo, weak, foodWealth, foodKilling]) {
      const reading = buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision));
      const guidance = reading.usefulGuidance!, chapter = reading.chapters.find((item) => item.id === "useful_elements")!;
      expect(guidance.sourceBinding.revisionId).toBe(revision.id);
      expect(guidance.sourceBinding.chartResultHash).toBe(revision.manifest.resultHash);
      expect(chapter.headline).toBe(guidance.headline);
      expect(chapter.verdict).toBe(guidance.verdict);
      expect(chapter.paragraphs.slice(0, guidance.paragraphs.length)).toEqual(guidance.paragraphs);
      for (const entry of guidance.entries) {
        const paragraph = chapter.paragraphs.find((text) => text.startsWith(`${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}：`));
        expect(paragraph).toContain(entry.presenceText);
        expect(paragraph).toContain(entry.judgment);
        for (const condition of entry.conditions) expect(paragraph).toContain(condition);
      }
      expect(chapter.cautions).toEqual(guidance.conditions);
      expect(chapter.sourceIds).toEqual([...new Set(guidance.sourceIds)]);
      expect(reading.chapters.map((item) => item.id)).toEqual(IDS);
    }
  });

  it("gives structure, career and resources separate prose without repeating the same full implication", async () => {
    const revision = await revisionFor("1995-05-17");
    const reading = buildBaziComprehensiveReading(revision, buildBaziPreliminaryAssessment(revision));
    const at = (id: BaziComprehensiveChapterId) => reading.chapters.find((item) => item.id === id)!;
    const diagnosis = reading.patternDiagnosis!;
    expect(at("structure").paragraphs.join()).not.toContain(diagnosis.careerImplication);
    expect(at("career").paragraphs.filter((paragraph) => paragraph === diagnosis.careerImplication)).toHaveLength(1);
    expect(at("career").verdict).not.toContain(diagnosis.careerImplication);
    expect(at("wealth").paragraphs.filter((paragraph) => paragraph === diagnosis.wealthImplication)).toHaveLength(1);
    expect(at("wealth").verdict).not.toContain(diagnosis.wealthImplication);
    expect(at("structure").paragraphs.join()).toContain("输出与支持彼此牵连");
    expect(at("career").paragraphs.join()).toContain("提出改法与承担既有职责");
    expect(at("wealth").paragraphs.join()).toContain("知识能否被实际使用");
  });

  it("preserves the weak chart's food-control-killing actor alongside the fire-earth balance direction", () => {
    const reading = buildBaziComprehensiveReading(foodKilling, buildBaziPreliminaryAssessment(foodKilling));
    const guidance = reading.usefulGuidance!, food = guidance.entries.find((entry) => entry.stem === "辛")!;
    expect(guidance.primaryPathId).toBe("food-killings");
    expect(guidance.balanceText).toContain("先取火、土");
    expect(food.roles.some((role) => role.kind === "baseline_unfavorable")).toBe(true);
    expect(food.roles.some((role) => role.kind === "path_key")).toBe(true);
    expect(food.judgment).toContain("制约乙");
    expect(food.judgment).toContain("不能直接把辛当作应被去掉的忌字");
    const chapter = reading.chapters.find((item) => item.id === "useful_elements")!;
    expect(chapter.paragraphs.join()).toContain(food.judgment);
  });

  it("keeps absent seasonal Jia and Ren as candidates, including Jia's prospective constraints, in the exported chapter text", () => {
    const reading = buildBaziComprehensiveReading(foodWealth, buildBaziPreliminaryAssessment(foodWealth));
    const chapter = reading.chapters.find((item) => item.id === "useful_elements")!;
    for (const stem of ["甲", "壬"]) {
      const entry = reading.usefulGuidance!.entries.find((item) => item.stem === stem)!;
      expect(entry.presence).toBe("absent");
      expect(entry.interactions).toEqual([]);
      expect(chapter.paragraphs.join()).toContain(`原局所选柱未见${stem}`);
      expect(chapter.paragraphs.join()).toContain(entry.judgment);
    }
    const jia = reading.usefulGuidance!.entries.find((item) => item.stem === "甲")!;
    expect(jia.conditions.join()).toContain("庚可制甲");
    expect(chapter.paragraphs.join()).toContain("这些是条件联系，未当作当前已发生的透干作用");
  });
});
