import type { BirthInput } from "@hakimi/contracts";
import { calculateChart, calculateUnknownHourCandidates } from "@hakimi/bazi-core";
import { calculatePillarRelations, DEFAULT_RELATION_RULE_PROFILE } from "@hakimi/relations-core";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import type { CaseRepository, ResearchRepository } from "./index";

/**
 * Shared P2-05 heavy dataset fixture. It is deliberately built through the
 * production repositories so the rows, fingerprints and receipts are exactly
 * what a real user session would create; nothing here bypasses the mutation
 * epoch or writes raw IndexedDB rows into a Schema 16 target.
 */
export const P2_05_CANDIDATE_COUNT = 60;
export const P2_05_LONG_NOTE_COUNT = 40;
export const P2_05_HEAVY_EXACT_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: "P2-05 长备注数据集"
};

export const P2_05_HEAVY_UNKNOWN_HOUR_INPUT: BirthInput = {
  ...P2_05_HEAVY_EXACT_INPUT,
  time: null,
  timePrecision: "unknown_hour",
  sourceNote: "P2-05 候选组重载数据集"
};

export const P2_05_ADVANCED_AT_INSTANT = "2025-03-12T04:00:00.000Z";

/**
 * Searches a real deterministic chart that satisfies every predicate of the
 * combined-condition browser gate: 申 month branch, a complete
 * branch_three_harmony set, 壬 day master (so the 乙巳 year transit node is
 * 伤官), and a resolved 乙巳 year node at the fixed at-instant.
 */
async function findP205AdvancedPositiveChart(): Promise<{
  input: BirthInput;
  chart: Awaited<ReturnType<typeof calculateChart>>;
}> {
  const dates: string[] = [];
  for (let year = 1990; year <= 2000; year += 1) {
    for (let day = 8; day <= 31; day += 1) {
      dates.push(`${year}-08-${String(day).padStart(2, "0")}`);
    }
    for (let day = 1; day <= 5; day += 1) {
      dates.push(`${year}-09-${String(day).padStart(2, "0")}`);
    }
  }

  const base = {
    ...P2_05_HEAVY_EXACT_INPUT,
    sourceNote: "P2-05 正向组合夹具"
  };
  const candidates: string[] = [];
  for (const date of dates) {
    const chart = await calculateChart(
      { ...base, date, time: "08:00" },
      WORKING_DEFAULT_RULE_PROFILE
    );
    const day = chart.facts.pillars.day;
    if (
      chart.facts.pillars.month.branch !== "申" ||
      day.stem !== "壬" ||
      !["子", "辰"].includes(day.branch)
    ) {
      continue;
    }
    candidates.push(date);
  }

  for (const date of candidates) {
    for (let hour = 0; hour < 24; hour += 1) {
      const time = `${String(hour).padStart(2, "0")}:00`;
      const chart = await calculateChart(
        { ...base, date, time },
        WORKING_DEFAULT_RULE_PROFILE
      );
      if (
        chart.facts.pillars.month.branch !== "申" ||
        chart.facts.pillars.day.stem !== "壬"
      ) {
        continue;
      }
      const relations = calculatePillarRelations(
        {
          year: chart.facts.pillars.year.ganZhi,
          month: chart.facts.pillars.month.ganZhi,
          day: chart.facts.pillars.day.ganZhi,
          hour: chart.facts.pillars.hour.ganZhi
        },
        DEFAULT_RELATION_RULE_PROFILE
      );
      if (!relations.facts.some((fact) => (
        fact.relationType === "branch_three_harmony" &&
        fact.completeness === "complete_set"
      ))) {
        continue;
      }
      return { input: { ...base, date, time }, chart };
    }
  }
  throw new Error(
    "P2-05 正向组合夹具搜索失败：未找到满足 申月 + 地支三合完整局 + 壬日主 的真实输入。"
  );
}

/**
 * Builds the positive-hit combined-condition fixture: one real case whose
 * latest revision satisfies the advanced predicates and one event anchored to
 * the exact 2025-03-12T04:00Z year transit node.
 */
export async function seedP205AdvancedPositiveCase(
  cases: CaseRepository,
  research: ResearchRepository
): Promise<{
  caseId: string;
  revisionId: string;
  atInstant: string;
  ruleProfileDigest: string;
}> {
  const { chart } = await findP205AdvancedPositiveChart();
  const bundle = await cases.createCase({ alias: "高级组合命中案例", calculated: chart });
  const revision = bundle.revisions[0];
  const snapshot = await calculateTransitSnapshot({
    revision,
    atInstant: P2_05_ADVANCED_AT_INSTANT
  });
  if (snapshot.slots.year.status !== "resolved") {
    throw new Error("P2-05 正向组合夹具缺少已解析的流年节点。");
  }
  const node = snapshot.slots.year.node;
  if (node.ganZhi !== "乙巳") {
    throw new Error(`P2-05 正向组合夹具流年应为乙巳，实际为 ${node.ganZhi}。`);
  }
  await research.createEvent({
    caseId: bundle.caseRecord.id,
    revisionId: revision.id,
    transitNodeRef: node.ref,
    datePrecision: "day",
    startDate: "2025-03-12",
    endDate: null,
    title: "流年节点复核",
    tags: ["事业"],
    sourceRefs: [],
    feedback: "supports",
    body: "正向命中浏览器组合夹具事件。"
  });
  return {
    caseId: bundle.caseRecord.id,
    revisionId: revision.id,
    atInstant: P2_05_ADVANCED_AT_INSTANT,
    ruleProfileDigest: revision.manifest.ruleProfileDigest
  };
}

export async function seedP205HeavyDataset(
  cases: CaseRepository,
  research: ResearchRepository
): Promise<{ caseId: string; revisionId: string }> {
  const candidateSet = await calculateUnknownHourCandidates(
    P2_05_HEAVY_UNKNOWN_HOUR_INPUT,
    WORKING_DEFAULT_RULE_PROFILE
  );
  await Promise.all(Array.from({ length: P2_05_CANDIDATE_COUNT }, (_, index) =>
    cases.createCandidateSet({
      alias: `候选组 ${String(index + 1).padStart(3, "0")}`,
      tags: ["P2-05", "候选组重载"],
      notes: `候选组 ${index + 1} 的长备注：${"x".repeat(2_000)}`,
      candidateSet
    })
  ));

  const chart = await calculateChart(P2_05_HEAVY_EXACT_INPUT, WORKING_DEFAULT_RULE_PROFILE);
  const bundle = await cases.createCase({ alias: "长备注案例", calculated: chart });
  const revisionId = bundle.revisions[0].id;
  const longBody = "研究备注正文。".repeat(1_000);
  await Promise.all(Array.from({ length: P2_05_LONG_NOTE_COUNT }, (_, index) =>
    research.createResearchNote({
      caseId: bundle.caseRecord.id,
      anchor: { kind: "chart_field", revisionId, pillar: "day", field: "stem" },
      body: `${longBody} 备注 ${index + 1}`,
      tags: ["P2-05", "长备注"],
      sourceRefs: [],
      lifecycle: "active"
    })
  ));
  return { caseId: bundle.caseRecord.id, revisionId };
}
