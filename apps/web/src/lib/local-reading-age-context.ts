export type LocalReadingAgeStage = "before_birth" | "young_child" | "youth" | "adult_transition" | "adult" | "unknown";
export interface LocalReadingAgeSegment {
  stage: "young_child" | "youth" | "adult";
  startInstant: string;
  endExclusiveInstant: string;
  startAge: number;
  endAge: number;
  label: string;
}
export interface LocalReadingAgeContext {
  stage: LocalReadingAgeStage;
  startAge: number | null;
  endAge: number | null;
  label: string;
  personalStartInstant: string;
  segments: LocalReadingAgeSegment[];
  conditions: string[];
}
const anniversary = (birth: Date, years: number) => Date.UTC(birth.getUTCFullYear() + years, birth.getUTCMonth(), birth.getUTCDate(), birth.getUTCHours(), birth.getUTCMinutes(), birth.getUTCSeconds(), birth.getUTCMilliseconds());
function ageAt(birth: Date, instant: number) {
  const years = new Date(instant).getUTCFullYear() - birth.getUTCFullYear();
  return Math.max(0, years - (instant < anniversary(birth, years) ? 1 : 0));
}
const ageLabel = (start: number, end: number) => `${start}${start === end ? "" : `—${end}`}周岁`;

/** Narrative scope only. Exact outlook nodes and luck-age facts stay unchanged.
 * UTC anniversaries deliberately match the existing annual scenario convention;
 * leap-day anniversaries use March 1 in a non-leap year. */
export function buildLocalReadingAgeContext(birthInstant: string | null, startInstant: string, endExclusiveInstant: string): LocalReadingAgeContext {
  const start = Date.parse(startInstant), end = Date.parse(endExclusiveInstant), birthValue = birthInstant ? Date.parse(birthInstant) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error("生活语境缺少有效的起止区间。");
  if (!Number.isFinite(birthValue)) return { stage: "unknown", startAge: null, endAge: null, label: "年龄未能可靠换算", personalStartInstant: startInstant, segments: [],
    conditions: ["出生瞬时未锁定，生活语境保持中性，不据此默认儿童、已就业或具体关系身份。"] };
  if (end <= birthValue) return { stage: "before_birth", startAge: null, endAge: null, label: "出生前", personalStartInstant: startInstant, segments: [],
    conditions: ["本区间早于出生，不作个人经历或生活情境解读。"] };
  const birth = new Date(birthValue), personalStart = Math.max(start, birthValue);
  const startAge = ageAt(birth, personalStart), endAge = ageAt(birth, end - 1);
  const cuts = [personalStart, anniversary(birth, 6), anniversary(birth, 18), end].filter((point) => point >= personalStart && point <= end);
  const ordered = [...new Set(cuts)].sort((left, right) => left - right);
  const segments = ordered.slice(0, -1).map((from, index): LocalReadingAgeSegment => {
    const to = ordered[index + 1]!, firstAge = ageAt(birth, from), lastAge = ageAt(birth, to - 1);
    return { stage: firstAge < 6 ? "young_child" : firstAge < 18 ? "youth" : "adult", startInstant: new Date(from).toISOString(), endExclusiveInstant: new Date(to).toISOString(),
      startAge: firstAge, endAge: lastAge, label: ageLabel(firstAge, lastAge) };
  });
  const stage: LocalReadingAgeStage = endAge < 6 ? "young_child" : endAge < 18 ? "youth" : startAge < 18 ? "adult_transition" : "adult";
  return { stage, startAge, endAge, label: ageLabel(startAge, endAge), personalStartInstant: new Date(personalStart).toISOString(), segments,
    conditions: [`本区间按出生瞬时及UTC周年换算为${ageLabel(startAge, endAge)}；闰日周年在非闰年取3月1日。6岁、18岁仅是本地叙述分界，不推断实际入学、就业、婚恋或法律身份。`,
      ...(start < birthValue ? [`个人情境仅从${new Date(birthValue).toISOString()}出生之后适用。`] : []),
      ...(stage === "adult_transition" ? ["本区间跨过18周岁，前后生活语境分别保留；成年段也只在确有工作或合作时适用成人事务表达。"] : stage === "adult" ? ["职业、就学、收入和关系状态未知，具体事项需对应现实身份与已有安排。"] : ["儿童阶段按学习探索、照料与同伴生活解释；资源指活动条件与日常支持，不假定已有工作或收入。"])] };
}
