import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalLifeOutlook } from "./local-detailed-outlook";
import { buildLifeStageStory, type LifeStageStoryInput, type LifeStageStoryStage } from "./local-life-stage-story";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";

const values = new Map<string, LifeStageStoryInput>();
beforeAll(async () => {
  for (const [id, date, time, sex] of [["a", "1995-08-18", "08:26", "unspecified"], ["b", "1995-05-18", "08:26", "male"], ["r3", "2019-12-22", "11:23", "female"]] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
      location: { label: "Synthetic whole-decade story", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
    const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
    const assessment = buildBaziPreliminaryAssessment(revision), life = await buildLocalLifeOutlook(revision, assessment, id === "r3" ? 2030 : 2026);
    values.set(id, { revision, assessment, life });
  }
});
const input = (id: string) => structuredClone(values.get(id)!);
const text = (stage: LifeStageStoryStage) => [...stage.paragraphs, ...stage.advantages, ...stage.pressures].join("\n");

it("preserves each complete original decade and its exact branch, caption, reference and interval without using annual windows", () => {
  const value = input("a"), original = structuredClone(value), result = buildLifeStageStory(value);
  expect(result.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
  expect(result.branches.flatMap((branch) => branch.stages)).toHaveLength(value.life.decades.length);
  for (const branch of result.branches) for (const stage of branch.stages) {
    const source = value.life.decades.find((item) => item.id === stage.decadeId)!;
    expect(stage.branchId).toBe(branch.id); expect(stage.nodeRef).toEqual(source.nodeRef);
    expect([stage.startInstant, stage.endExclusiveInstant, stage.ageLabel]).toEqual([source.startInstant, source.endExclusiveInstant, source.ageLabel]);
    expect(stage.caption).toBe(outlookDirectionCaption(source.judgment, source.direction));
    expect(stage.sourceSubjects).toEqual([`decade-${source.id}`]);
    for (const ref of stage.basisRefs) {
      expect(ref.decadeId).toBe(source.id); const axis = source.judgment.axes.find((item) => item.id === ref.axisId)!;
      expect(axis).toBeDefined(); if (ref.field !== "summary") expect(axis[ref.field][ref.index!]).toBeTypeOf("string"); else expect(ref.index).toBeUndefined();
    }
  }
  expect(value).toEqual(original);
});

it("keeps A's two equally qualified backward decades distinct without inventing a favorable handover", () => {
  const value = input("a"), branch = buildLifeStageStory(value).branches.find((item) => item.id === "backward")!;
  const first = branch.stages.find((stage) => stage.ganZhi === "辛巳")!, next = branch.stages.find((stage) => stage.ganZhi === "庚辰")!;
  expect(first.caption).toBe(next.caption); expect(first.caption).toContain("结构上较顺");
  expect(first.paragraphs.join()).toContain("自己怎样作决定、独立完成"); expect(next.paragraphs.join()).toContain("哪些可以共用");
  const transition = branch.transitions.find((item) => item.fromDecadeId === first.decadeId && item.toDecadeId === next.decadeId)!;
  expect(transition.atInstant).toBe(next.startInstant); expect(Date.parse(transition.atInstant)).toBe(Date.parse("2028-12-20T20:58:00Z")); expect(transition.paragraphs[0]).toContain("2028-12-21 04:58:00");
  expect(transition.headline).toContain("从独立发挥，转向共同参与"); expect(transition.paragraphs.join()).toContain("方向表述延续"); expect(transition.fromNodeRef.manualDirection).toBe("backward");
  expect(transition.toNodeRef.manualDirection).toBe("backward"); expect(transition.sourceSubjects).toEqual([`decade-${first.decadeId}`, `decade-${next.decadeId}`]);
  expect(transition.paragraphs.join()).not.toMatch(/转入更好的|交运后转好|丁亥/);
});

it("does not blame A's neutral visible killing stem for obstruction that belongs to the hidden output", () => {
  const value = input("a"), source = value.life.decades.find((stage) => stage.branchId === "forward" && stage.ganZhi === "丁亥")!;
  expect(source.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ visibility: "visible", stem: "丁", effect: "neutral" }), expect.objectContaining({ visibility: "main_hidden", stem: "壬", effect: "obstructs" })]));
  const stage = buildLifeStageStory(value).branches.find((branch) => branch.id === "forward")!.stages.find((item) => item.decadeId === source.id)!;
  expect(stage.pressures[0]).toContain("支内配合"); expect(stage.pressures[0]).toContain("完成、收尾与持续回应却未必同步");
  expect(stage.pressures[0]).not.toContain("要求与当时能调动"); expect(stage.conditions.join()).toContain("助阻来自另列的支内配合");
  expect(text(stage)).not.toContain("辛巳");
});

it("tells B's neutral, obstructed and mixed decades apart and never turns Bing's obstruction into helpful print", () => {
  const value = input("b"), branch = buildLifeStageStory(value).branches[0]!;
  const neutral = branch.stages.find((stage) => stage.ganZhi === "戊寅")!, pressure = branch.stages.find((stage) => stage.ganZhi === "丁丑")!, mixed = branch.stages.find((stage) => stage.ganZhi === "丙子")!;
  expect(neutral.paragraphs[0]).toContain("实际分工"); expect(neutral.advantages).toEqual([]); expect(neutral.pressures).toEqual([]);
  expect(neutral.paragraphs.join()).toContain("承担两件事");
  expect(neutral.paragraphs.join()).toContain("处理的步骤");
  expect(neutral.paragraphs.join()).not.toContain("原判断没有给它们单独排出");
  expect(pressure.pressures.join()).toContain("已经会的部分也可能迟迟没有拿出来");
  expect(mixed.pressures[0]).toContain("直接进入的主题"); expect(mixed.advantages[0]).toContain("支内配合");
  expect(mixed.advantages[0]).toContain("实际用途"); expect(mixed.advantages[0]).not.toContain("学习支持");
  const transition = branch.transitions.find((item) => item.toDecadeId === pressure.decadeId)!;
  expect(transition.changes).toContainEqual(expect.objectContaining({ axis: "pattern", beforeEffect: "neutral", afterEffect: "obstructs" }));
  expect(transition.paragraphs.join()).toContain("2029-05-23 00:20:00");
});

it("keeps R3's unresolved child phases and crossing of adulthood separate without an employment or relationship forecast", () => {
  const result = buildLifeStageStory(input("r3")), first = result.branches[0]!.stages[0]!, second = result.branches[0]!.stages[1]!;
  expect(first.age.segments.map((segment) => segment.stage)).toEqual(["young_child", "youth"]);
  expect(second.age.stage).toBe("adult_transition"); expect(second.age.segments.map((segment) => segment.stage)).toEqual(["youth", "adult"]);
  expect(first.caption).toBe("条件性"); expect(second.caption).toBe("条件性");
  expect(text(first)).not.toMatch(/客户|岗位|回款|结婚|录用/);
  expect(second.paragraphs[0]).toContain("14—17周岁"); expect(second.paragraphs[1]).toContain("18—24周岁");
  const transition = result.branches[0]!.transitions[0]!;
  expect(transition.changes).toEqual([]); expect(transition.headline).toContain("探索选择");
  expect(result.limitations.join()).toContain("不凭年龄推定就业");
});

it("does not join across a missing decade and does not invent a current stage before the first handover", async () => {
  const value = input("a"); value.life.decades = value.life.decades.filter((stage) => !(stage.branchId === "forward" && stage.index === 2));
  const branch = buildLifeStageStory(value).branches.find((item) => item.id === "forward")!;
  expect(branch.conditions.join()).toContain("不补写跨缺口");
  expect(branch.transitions.some((item) => item.fromDecadeId === branch.stages[0]!.decadeId)).toBe(false);
  const child = input("r3"); child.life = await buildLocalLifeOutlook(child.revision, child.assessment, 2020);
  expect(buildLifeStageStory(child).branches[0]!.currentDecadeId).toBeNull();
});

it("rejects mixed branches, changed intervals, repeated action indexes, substituted effects and a wrong source binding", () => {
  const base = input("a");
  const wrongRef = structuredClone(base); wrongRef.life.decades[0]!.nodeRef.manualDirection = "backward";
  expect(() => buildLifeStageStory(wrongRef)).toThrow("原节点");
  const wrongInterval = structuredClone(base); wrongInterval.life.decades[0]!.judgment.interval.endExclusiveInstant = wrongInterval.life.decades[0]!.startInstant;
  expect(() => buildLifeStageStory(wrongInterval)).toThrow("原节点");
  const indexes = structuredClone(base), action = indexes.life.decades[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!;
  action.evidenceIndexes.push(action.evidenceIndexes[0]!); expect(() => buildLifeStageStory(indexes)).toThrow("索引");
  const effect = structuredClone(base); effect.life.decades[0]!.judgment.axes.find((axis) => axis.axis === "pattern")!.stemActions!.items[0]!.effect = "unresolved";
  expect(() => buildLifeStageStory(effect)).toThrow("同盘同段计算不一致");
  const repeated = structuredClone(base); repeated.life.decades.push(repeated.life.decades[0]!); expect(() => buildLifeStageStory(repeated)).toThrow("原节点");
  const binding = structuredClone(base); binding.assessment.sourceBinding.includeHour = false; expect(() => buildLifeStageStory(binding)).toThrow("来源不一致");
});
