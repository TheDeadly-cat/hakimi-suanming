export const OVERALL_QUESTIONS = Object.freeze([
  Object.freeze({
    id: "month-command-hidden-stem-duplication",
    title: "月令主气与首位藏干重复计权",
    question: "月令主气与同一月支首位藏干是否应同时计权；若同时计权，边界依据是什么？"
  }),
  Object.freeze({
    id: "relative-factor-weighting",
    title: "月令、透干与藏干相对权重",
    question: "透干、首位藏干、其余藏干与月令之间应采用怎样的相对权重，哪些反例会推翻当前“月令 4、透干 2、首位藏干 2、其余藏干 1”候选？"
  }),
  Object.freeze({
    id: "strength-band-thresholds",
    title: "旺衰五档阈值",
    question: "0.25、0.43、0.57、0.75 分档阈值是否有可复核案例集支持？"
  }),
  Object.freeze({
    id: "strength-invalidation-structures",
    title: "基础旺衰结论失效或改写条件",
    question: "从格、专旺、化气、合化、刑冲、调候等结构应在何时使基础旺衰结论失效或改写？"
  })
]);

export const FACT_ASSESSMENTS = Object.freeze([
  Object.freeze({ value: "established", label: "当前列出的事实正确" }),
  Object.freeze({ value: "not_established", label: "当前列出的事实有误" }),
  Object.freeze({ value: "insufficient_information", label: "信息不足，无法判断" }),
  Object.freeze({ value: "outside_tradition", label: "不属于我的复核范围" })
]);

export const RULE_POSITIONS = Object.freeze([
  Object.freeze({ value: "support", label: "可以采用" }),
  Object.freeze({ value: "oppose", label: "不建议采用" }),
  Object.freeze({ value: "conditional", label: "满足条件时可采用" }),
  Object.freeze({ value: "cannot_decide", label: "无法判断" })
]);

export const INVALIDATION_STRUCTURES = Object.freeze([
  "从格",
  "专旺",
  "化气",
  "合化",
  "刑冲",
  "调候",
  "无",
  "无法判断"
]);

export const HIGH_RISK_DISPOSITIONS = Object.freeze([
  Object.freeze({ value: "conservative_expression_only", label: "只用保守措辞" }),
  Object.freeze({ value: "defer", label: "暂不作结论" }),
  Object.freeze({ value: "no_release", label: "不应向用户展示" }),
  Object.freeze({ value: "not_applicable", label: "本场景没有这个问题" })
]);
