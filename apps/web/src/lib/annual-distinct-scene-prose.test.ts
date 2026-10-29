import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { evaluateNatalWealthResourceTask, type NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { ADULT_SITUATION_MECHANISMS, buildAdultLifeSituations, describeAdultLifeSituations, type AdultSituationMechanism } from "./adult-life-situations";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { buildAnnualDistinctSceneProse, type AnnualDistinctSceneProseInput } from "./annual-distinct-scene-prose";
import type { OutlookEffect, OutlookStemAction } from "./local-outlook-judgment";
const age = buildLocalReadingAgeContext("1995-05-18T00:26:00Z", "2032-02-04T00:00:00Z", "2033-02-04T00:00:00Z");
const tasks = new Map<string, NatalWealthResourceTask>();
beforeAll(async () => {
  for (const [name, date, time] of [["none", "1995-05-18", "08:26"], ["protect", "1957-09-13", "00:26"], ["moderate", "1982-10-02", "10:26"]]) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: date!, time: time!, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male",
      lunarLeapMonth: false, location: { label: "Synthetic scene task", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-17T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision); tasks.set(name!, evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour: true }));
  }
});
const actor = (tenGod: string, effect: OutlookEffect, visibility: OutlookStemAction["visibility"] = "visible"): OutlookStemAction => ({ stem: "甲", tenGod, effect, visibility, evidenceIndexes: [], blockerIndexes: [], satisfiedConditionIndexes: [], summaryBasis: false });
const kindFor = (god: string): AnnualDistinctSceneProseInput["kind"] => god === "正印" || god === "偏印" ? "study" : god === "伤官" ? "proposal" : god === "食神" ? "delivery" : god === "正财" ? "settlement" : god === "偏财" ? "new_collaboration" : "work_change";
function inputs(god: string, effect: OutlookEffect, domain: "career" | "wealth", path = "resource-output", task = tasks.get("none")!, mechanism: AdultSituationMechanism = "general_constraint"): AnnualDistinctSceneProseInput[] {
  return describeAdultLifeSituations({ god, effect, domain, age, appliedWork: null, mechanism })!.map(source => ({ original: source.fullOriginal, kind: kindFor(god), domain, path, task, age,
    visible: actor(god, effect), hidden: actor("偏印", "neutral", "main_hidden") }));
}
it("exports the actual selected construction and leaves the original shared result intact", () => {
  for (const god of ["比肩", "劫财", "正官", "七杀", "正印", "偏印", "食神", "伤官", "正财", "偏财"]) for (const domain of ["career", "wealth"] as const) for (const effect of ["assists", "obstructs", "mixed", "neutral", "unresolved"] as const) for (const mechanism of ADULT_SITUATION_MECHANISMS) {
    const input = { god, domain, effect, age, mechanism, appliedWork: null }, before = structuredClone(input), descriptors = describeAdultLifeSituations(input)!;
    expect(descriptors.map(source => source.fullOriginal)).toEqual(buildAdultLifeSituations(input)!.examples);
    expect(new Set(descriptors.map(source => source.templateId)).size).toBe(descriptors.length);
    expect(descriptors.every(source => source.god === god && source.effect === effect && source.domain === domain && source.sourceMechanism === mechanism)).toBe(true);
    expect(input).toEqual(before);
  }
});
it("covers the six native kinds and ten roles in both domains without lending hidden support to a neutral visible role", () => {
  const kinds = new Set<string>();
  for (const god of ["比肩", "劫财", "正官", "七杀", "正印", "偏印", "食神", "伤官", "正财", "偏财"]) for (const domain of ["career", "wealth"] as const) for (const effect of ["assists", "obstructs", "mixed", "neutral", "unresolved"] as const) {
    for (const source of inputs(god, effect, domain)) {
      const before = structuredClone(source); source.hidden = actor("食神", "assists", "main_hidden");
      const value = buildAnnualDistinctSceneProse(source)!; expect(value).not.toBeNull(); kinds.add(source.kind);
      expect(value.original).toBe(source.original); expect(value.text).toMatch(/^若(?:在职|正在求职或进修|有自营业务或实际合作)，/u);
      expect(value.templateIds.length).toBeGreaterThan(0);
      if (effect === "neutral" || effect === "unresolved") expect(value.text).not.toMatch(/较能|较有|有助于|被推后|反而|已经改善|收入增加/u);
      if (effect === "mixed") expect(value.text).toContain("；同时，");
      expect({ ...source, hidden: before.hidden }).toEqual(before);
    }
  }
  expect([...kinds].sort()).toEqual(["work_change", "study", "proposal", "delivery", "settlement", "new_collaboration"].sort());
});
it("makes opposite print effects concrete and gives work, learning and input scenes different processes", () => {
  const negative = inputs("正印", "obstructs", "career", "peer-output-wealth").map(input => buildAnnualDistinctSceneProse(input)!);
  expect(negative[0]!.text).toContain("已经会做的一步却迟迟没有进入试做或使用");
  expect(negative[1]!.text).toContain("练习、作品或申请仍停在修改中");
  expect(negative[0]!.text.split("时，")[1]).not.toBe(negative[1]!.text.split("时，")[1]);
  const positive = inputs("正印", "assists", "career", "peer-output-wealth").map(input => buildAnnualDistinctSceneProse(input)!);
  expect(positive[0]!.text).toContain("原来卡住的操作"); expect(positive[1]!.text).toContain("明确的薄弱环节");
  expect(positive.map(x => x.text).join()).not.toMatch(/往后挤|被压缩|迟迟没有/);
  const costs = inputs("正印", "obstructs", "wealth", "peer-output-wealth").map(input => buildAnnualDistinctSceneProse(input)!);
  expect(costs[0]!.text).toContain("工时"); expect(costs[1]!.text).toContain("教材"); expect(costs.map(x => x.text)).not.toEqual(negative.map(x => x.text));
});
it("keeps protecting necessary guidance opposite to moderating repeated preparation and keeps authority responsibilities present", () => {
  const protect = inputs("偏财", "obstructs", "career", "hurting-resource", tasks.get("protect")!).map(input => buildAnnualDistinctSceneProse(input)!);
  expect(protect[0]!.text).toContain("带教或熟悉步骤的时间被借去别处"); expect(protect[1]!.text).toContain("原服务仍需专业支持");
  const authority = inputs("偏财", "obstructs", "career", "official-resource").map(input => buildAnnualDistinctSceneProse(input)!);
  expect(authority[0]!.text).toContain("承担未少、配套未齐"); expect(authority[1]!.text).toContain("原约定的质量或完成范围仍在");
  expect(authority.map(x => x.text)).not.toEqual(protect.map(x => x.text));
  for (const path of ["resource-wealth", "hurting-wealth"]) {
    const task = path === "hurting-wealth" ? tasks.get("moderate")! : tasks.get("none")!;
    const values = inputs("偏财", "assists", "wealth", path, task, "resource_moderation").map(input => buildAnnualDistinctSceneProse(input)!);
    expect(values.every(value => value.text.includes("必要") || value.text.includes("必需"))).toBe(true);
    expect(values.map(x => x.text).join()).not.toMatch(/回款|收入|结算|盈利/);
    const pending = inputs("偏财", "unresolved", "wealth", path, task, "resource_moderation").map(input => buildAnnualDistinctSceneProse(input)!);
    expect(pending.map(x => x.text).join()).not.toMatch(/减少|收拢|较能|已保留/);
  }
});
it("retains the two actual food-killing pressure topics but does not give a neutral hidden authority new pressure", () => {
  const input = inputs("七杀", "obstructs", "career", "food-killings")[0]!;
  input.hidden = actor("偏印", "obstructs", "main_hidden");
  const value = buildAnnualDistinctSceneProse(input)!;
  expect(value.text).toContain("另一项审核或限时要求"); expect(value.text).toContain("新的指导还牵动原解决顺序");
  const official = inputs("偏财", "obstructs", "career", "official-resource")[0]!;
  official.hidden = actor("七杀", "neutral", "main_hidden");
  expect(buildAnnualDistinctSceneProse(official)!.text).not.toMatch(/新增.*要求|又.*审核|新的指导还牵动/);
});
it("keeps declared regular-wealth settlement distinct from opportunity-wealth trials in every special support path", () => {
  for (const path of ["hurting-resource", "official-resource", "killings-resource", "food-killings"]) for (const domain of ["career", "wealth"] as const) for (const effect of ["assists", "obstructs", "mixed", "neutral", "unresolved"] as const) {
    const task = path === "hurting-resource" ? tasks.get("protect")! : tasks.get("none")!;
    const regular = inputs("正财", effect, domain, path, task).map(source => buildAnnualDistinctSceneProse(source)!);
    const opportunity = inputs("偏财", effect, domain, path, task).map(source => buildAnnualDistinctSceneProse(source)!);
    for (const value of regular) { expect(value, `${path}/${domain}/${effect}`).not.toBeNull(); expect(value.text.split("时，").at(-1), `${path}/${domain}/${effect}`).toMatch(/确认|约定|验收|续用|补记录|记录或说明|费用核对/); }
    expect(regular.map(value => value.text).join()).not.toMatch(/新试用|新参与|新客户|新用途/);
    expect(regular.map(value => value.text)).not.toEqual(opportunity.map(value => value.text));
  }
});
it("matches whole current templates only, retains ambiguous mechanism candidates, and rejects kind or age substitution", () => {
  const base = inputs("正官", "neutral", "career", "official-resource", tasks.get("none")!, "role")[0]!;
  const value = buildAnnualDistinctSceneProse(base)!;
  expect(value.sourceMechanisms.length).toBeGreaterThan(1); expect(value.templateIds).toHaveLength(value.sourceMechanisms.length);
  expect(buildAnnualDistinctSceneProse({ ...base, original: base.original + "额外文字" })).toBeNull();
  expect(buildAnnualDistinctSceneProse({ ...base, original: "若在职，用户自行写的岗位说明。" })).toBeNull();
  expect(buildAnnualDistinctSceneProse({ ...base, kind: "study" })).toBeNull();
  expect(buildAnnualDistinctSceneProse({ ...base, path: "unsupported" })).toBeNull();
  expect(buildAnnualDistinctSceneProse({ ...base, task: tasks.get("protect")! })).toBeNull();
  for (const birth of [null, "2019-12-22T03:23:00Z", "2014-12-22T03:23:00Z", "2040-01-01T00:00:00Z"]) {
    const younger = buildLocalReadingAgeContext(birth, "2032-02-04T00:00:00Z", "2033-02-04T00:00:00Z");
    expect(buildAnnualDistinctSceneProse({ ...base, age: younger })).toBeNull();
  }
  for (const appliedWork of ["student", "employed", "self_employed", "seeking_work", "caregiving", "retired"] as const) expect(describeAdultLifeSituations({ domain: "career", god: "正官", effect: "neutral", age, appliedWork })).toBeNull();
});

it("preserves a precise original cause when path and actor data cannot support an equivalent scene", () => {
  for (const mechanism of ["resource_tie", "authority_conflict", "wealth_tie", "output_tie"] as const) {
    for (const source of inputs("伤官", "obstructs", "career", "official-resource", tasks.get("none")!, mechanism)) expect(buildAnnualDistinctSceneProse(source)).toBeNull();
  }
  const tiedOutput = inputs("食神", "obstructs", "career", "hurting-resource", tasks.get("protect")!, "output_tie");
  expect(tiedOutput.every(source => buildAnnualDistinctSceneProse(source) === null)).toBe(true);
  const overload = inputs("食神", "obstructs", "career", "hurting-resource", tasks.get("protect")!, "output_overload");
  expect(overload.every(source => buildAnnualDistinctSceneProse(source)?.text.includes("继续"))).toBe(true);
});


it("describes distinct pending support and moderation processes while preserving exact source conditions and effects", () => {
  for (const effect of ["neutral", "unresolved"] as const) {
    const protectedCareer = inputs("正印", effect, "career", "hurting-resource", tasks.get("protect")!, "resource_protection").map(buildAnnualDistinctSceneProse);
    const protectedMoney = inputs("正印", effect, "wealth", "hurting-resource", tasks.get("protect")!, "resource_protection").map(buildAnnualDistinctSceneProse);
    const moderatedCareer = inputs("偏财", effect, "career", "hurting-wealth", tasks.get("moderate")!, "resource_moderation").map(buildAnnualDistinctSceneProse);
    const moderatedMoney = inputs("偏财", effect, "wealth", "hurting-wealth", tasks.get("moderate")!, "resource_moderation").map(buildAnnualDistinctSceneProse);
    expect(protectedCareer[0]!.text).toContain("自己能继续的部分与需要帮助的部分并行");
    expect(protectedMoney[0]!.text).toContain("已有投入不能替代尚未落实的指导");
    expect(moderatedCareer[0]!.text).toContain("仍不可缺少的操作依据");
    expect(moderatedMoney[0]!.text).toContain("维护、培训工时与共用安排");
    expect(protectedCareer.map(x => x!.text)).not.toEqual(protectedMoney.map(x => x!.text));
    expect(moderatedCareer.map(x => x!.text)).not.toEqual(moderatedMoney.map(x => x!.text));
    for (const value of [...protectedCareer, ...protectedMoney, ...moderatedCareer, ...moderatedMoney]) {
      expect(value).not.toBeNull(); expect(value!.text).not.toMatch(/本项重点是|较能|较有|已经改善|收入增加|新客户/);
      expect(value!.text).toMatch(/^若(?:在职|正在求职或进修|有自营业务或实际合作)，/u);
      expect(value!.original).not.toBe(value!.text); expect(value!.templateIds.length).toBeGreaterThan(0);
    }
  }
});
