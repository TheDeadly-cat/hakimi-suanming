const p01Factors = Object.freeze([
  ["F-01", "月令主气辛金", "月令", "需求", 4, true, "月支酉首位藏干为辛"],
  ["F-02", "月支首位藏干辛金", "首位藏干", "需求", 2, true, "同一月支首位藏干另计"],
  ["F-03", "年干庚金", "透干", "需求", 2, false, "年柱透干"],
  ["F-04", "年支申藏庚金", "首位藏干", "需求", 2, false, "年支首位藏干"],
  ["F-05", "年支申藏壬水", "其余藏干", "支持", 1, false, "年支第二藏干"],
  ["F-06", "年支申藏戊土", "其余藏干", "需求", 1, false, "年支第三藏干"],
  ["F-07", "月干辛金", "透干", "需求", 2, false, "月柱透干"],
  ["F-08", "日支午藏丁火", "首位藏干", "需求", 2, false, "日支首位藏干"],
  ["F-09", "日支午藏己土", "其余藏干", "需求", 1, false, "日支第二藏干"],
  ["F-10", "时干戊土", "透干", "需求", 2, false, "可靠时柱透干"],
  ["F-11", "时支辰藏戊土", "首位藏干", "需求", 2, false, "可靠时支首位藏干"],
  ["F-12", "时支辰藏乙木", "其余藏干", "支持", 1, false, "可靠时支第二藏干"],
  ["F-13", "时支辰藏癸水", "其余藏干", "支持", 1, false, "可靠时支第三藏干"]
].map(([id, description, source, side, weight, keyFactor, evidence]) => Object.freeze({
  id, description, source, side, weight, appliedWeight: weight, active: true, keyFactor, evidence
})));

const p02Factors = Object.freeze([
  ["F-01", "月令主气甲木", "月令", "支持", 4, true, "月支寅首位藏干为甲"],
  ["F-02", "月支首位藏干甲木", "首位藏干", "支持", 2, true, "同一月支首位藏干另计"],
  ["F-03", "年干壬水", "透干", "支持", 2, false, "年柱透干"],
  ["F-04", "年支子藏癸水", "首位藏干", "支持", 2, false, "年支首位藏干"],
  ["F-05", "月干甲木", "透干", "支持", 2, false, "月柱透干"],
  ["F-06", "月支寅藏丙火", "其余藏干", "需求", 1, false, "月支第二藏干"],
  ["F-07", "月支寅藏戊土", "其余藏干", "需求", 1, false, "月支第三藏干"],
  ["F-08", "日支寅藏甲木", "首位藏干", "支持", 2, false, "日支首位藏干"],
  ["F-09", "日支寅藏丙火", "其余藏干", "需求", 1, false, "日支第二藏干"],
  ["F-10", "日支寅藏戊土", "其余藏干", "需求", 1, false, "日支第三藏干"],
  ["F-11", "时干乙木", "透干", "支持", 2, false, "可靠时柱透干"],
  ["F-12", "时支亥藏壬水", "首位藏干", "支持", 2, false, "可靠时支首位藏干"],
  ["F-13", "时支亥藏甲木", "其余藏干", "支持", 1, false, "可靠时支第二藏干"]
].map(([id, description, source, side, weight, keyFactor, evidence]) => Object.freeze({
  id, description, source, side, weight, appliedWeight: weight, active: true, keyFactor, evidence
})));

function variantFactors(predicate) {
  return Object.freeze(p01Factors.map((factor) => Object.freeze({
    ...factor,
    active: !predicate(factor),
    appliedWeight: predicate(factor) ? 0 : factor.weight
  })));
}

const commonWeakPillars = Object.freeze([
  Object.freeze({ label: "年柱", value: "庚申" }),
  Object.freeze({ label: "月柱", value: "辛酉" }),
  Object.freeze({ label: "日柱", value: "甲午" }),
  Object.freeze({ label: "时柱", value: "戊辰" })
]);

export const SCENARIOS = Object.freeze([
  Object.freeze({
    id: "P01",
    title: "极弱规则测试",
    scenarioKind: "existing_synthetic_test_vector",
    synthetic: true,
    noPerson: true,
    isCurrentFormalOutput: false,
    pillars: commonWeakPillars,
    vectorSource: "bazi-interpretation index.test.ts / weakFacts",
    reviewQuestion: "当前把月令主气和同一月支的首位藏干分别计分，并据此判断为“很弱”，这种方法是否合理？",
    summary: "按当前待审规则逐项计权，用于检查极弱方向、月令重复项和说明文字是否可复核。",
    notice: "人工构造的事实清单；没有对应真人，也不代表正式个案输出。",
    includeHour: true,
    factors: p01Factors,
    totals: Object.freeze({ support: 3, demand: 20, ratioPercent: 13.04, band: "很弱（待审规则结果）" }),
    comparisons: Object.freeze([
      Object.freeze({ label: "当前候选", value: "支持 3 / 需求 20 / 13.04% / 很弱" })
    ])
  }),
  Object.freeze({
    id: "P02",
    title: "极强与特殊结构复核",
    scenarioKind: "existing_synthetic_test_vector",
    synthetic: true,
    noPerson: true,
    isCurrentFormalOutput: false,
    pillars: Object.freeze([
      Object.freeze({ label: "年柱", value: "壬子" }),
      Object.freeze({ label: "月柱", value: "甲寅" }),
      Object.freeze({ label: "日柱", value: "甲寅" }),
      Object.freeze({ label: "时柱", value: "乙亥" })
    ]),
    vectorSource: "bazi-interpretation index.test.ts / strongFacts",
    reviewQuestion: "当前结果为“很强”，但专旺等特殊结构仍留待人工判断，这种处理是否合理？",
    summary: "按当前待审规则得到极强方向，并单列专旺等特殊结构供复核；工具不判断任何结构成立。",
    notice: "人工构造的事实清单；“可能涉及结构复核”不是结构裁决。",
    includeHour: true,
    factors: p02Factors,
    totals: Object.freeze({ support: 19, demand: 4, ratioPercent: 82.61, band: "很强（待审规则结果）" }),
    comparisons: Object.freeze([
      Object.freeze({ label: "当前候选", value: "支持 19 / 需求 4 / 82.61% / 很强" }),
      Object.freeze({ label: "结构门", value: "专旺、从格、化气、合化、刑冲、调候均未裁决" })
    ])
  }),
  Object.freeze({
    id: "P03",
    title: "月令主气去重影响",
    scenarioKind: "deduplicate_month_main_sensitivity",
    synthetic: true,
    noPerson: true,
    isCurrentFormalOutput: false,
    pillars: commonWeakPillars,
    vectorSource: "P01 derived sensitivity / deduplicate_month_main",
    reviewQuestion: "保留月令主气、但不重复计算同一月支的首位藏干后，结果仍为“很弱”，这种去重方法是否合理？",
    summary: "在 P01 上保留月令 4，移除同一月支首位藏干辛金的再次计权，观察重复计权影响。",
    notice: "这是条件变化测试，不是另一流派、正式输出或专家裁决。",
    includeHour: true,
    factors: variantFactors((factor) => factor.id === "F-02"),
    totals: Object.freeze({ support: 3, demand: 18, ratioPercent: 14.29, band: "很弱（去重后）" }),
    comparisons: Object.freeze([
      Object.freeze({ label: "P01 基线", value: "支持 3 / 需求 20 / 13.04%" }),
      Object.freeze({ label: "主气去重", value: "支持 3 / 需求 18 / 14.29%" })
    ])
  }),
  Object.freeze({
    id: "P04",
    title: "时柱不确定时的影响",
    scenarioKind: "hour_withheld_sensitivity",
    synthetic: true,
    noPerson: true,
    isCurrentFormalOutput: false,
    pillars: commonWeakPillars,
    vectorSource: "P01 derived sensitivity / includeHour=false",
    reviewQuestion: "时柱不确定时，先不使用时柱，也不补作额外结论，这种处理是否合理？",
    summary: "在 P01 上将时柱全部因素明确排除，检查信息不足时是否先停止使用时柱并保留不确定性。",
    notice: "时柱仅作为未计入的合成事实显示；不得据此补写个案结论。",
    includeHour: false,
    factors: variantFactors((factor) => ["F-10", "F-11", "F-12", "F-13"].includes(factor.id)),
    totals: Object.freeze({ support: 1, demand: 16, ratioPercent: 5.88, band: "很弱（不计时柱后）" }),
    comparisons: Object.freeze([
      Object.freeze({ label: "P01 基线", value: "支持 3 / 需求 20 / 13.04%" }),
      Object.freeze({ label: "时柱排除", value: "支持 1 / 需求 16 / 5.88%" })
    ])
  }),
  Object.freeze({
    id: "P05",
    title: "分档临界值测试",
    scenarioKind: "engineered_threshold_stress_ledger",
    synthetic: true,
    noPerson: true,
    isCurrentFormalOutput: false,
    pillars: commonWeakPillars,
    vectorSource: "pilot-only engineered threshold ledger",
    reviewQuestion: "人为设定助身侧 43、泄耗克侧 57 时，当前归入“相对中和”；这个分界是否合理、是否有案例依据？",
    summary: "沿用同一组人工构造四柱，把两侧数值设为 43/57，只检查 0.43 分档是否易懂。",
    notice: "这是人工构造的临界值例子；不是当前算法对该四柱的输出，不得回写正式规则。",
    includeHour: true,
    factors: Object.freeze([
      Object.freeze({ id: "E-01", description: "临界值例子的助身侧合计", source: "人工构造", side: "支持", weight: 43, appliedWeight: 43, active: true, keyFactor: true, evidence: "仅用于 0.43 分档临界值测试" }),
      Object.freeze({ id: "E-02", description: "临界值例子的泄耗克侧合计", source: "人工构造", side: "需求", weight: 57, appliedWeight: 57, active: true, keyFactor: true, evidence: "仅用于 0.43 分档临界值测试" })
    ]),
    totals: Object.freeze({ support: 43, demand: 57, ratioPercent: 43, band: "相对中和（临界值例子）" }),
    comparisons: Object.freeze([
      Object.freeze({ label: "42 / 58", value: "42% → 偏弱" }),
      Object.freeze({ label: "43 / 57", value: "43% → 相对中和" }),
      Object.freeze({ label: "57 / 43", value: "57% → 相对中和" }),
      Object.freeze({ label: "58 / 42", value: "58% → 偏强" })
    ])
  })
]);

export const SCENARIO_BY_ID = Object.freeze(Object.fromEntries(SCENARIOS.map((scenario) => [scenario.id, scenario])));

export const SEAT_ORDERS = Object.freeze({
  A: Object.freeze(["P01", "P03", "P05", "P02", "P04"]),
  B: Object.freeze(["P04", "P02", "P05", "P03", "P01"])
});
