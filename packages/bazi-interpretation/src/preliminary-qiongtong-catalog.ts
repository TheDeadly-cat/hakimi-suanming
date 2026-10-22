import type { PreliminarySeasonalRule } from "./preliminary-assessment";
import type { PreliminarySource } from "./preliminary-assessment-sources";
import { QIONGTONG_CHECKED_ROWS } from "./preliminary-qiongtong-2294674";

const STEM_CODES: Readonly<Record<string, string>> = { 甲: "jia", 乙: "yi", 丙: "bing", 丁: "ding", 戊: "wu", 己: "ji", 庚: "geng", 辛: "xin", 壬: "ren", 癸: "gui" };
const BRANCH_CODES: Readonly<Record<string, string>> = { 寅: "yin", 卯: "mao", 辰: "chen", 巳: "si", 午: "wu", 未: "wei", 申: "shen", 酉: "you", 戌: "xu", 亥: "hai", 子: "zi", 丑: "chou" };
const SCOPE_LABELS = { month: "月令专段及相关条件", month_group: "相邻月份合论", season: "季节总论适用范围，非独立逐月专条", phase: "月内节气或阶段条件，不能仅由月支选定全部主次" } as const;
const sourceId = (key: string) => `preliminary-qiongtong-${STEM_CODES[key[0]!]}-${BRANCH_CODES[key[1]!]}`;
const textVariant = "固定版本默认简体转录；保留原文异体与讹字，不二次繁简转换。段号为正文 h3 下 p 标签序号，含命例拆行。";
const checkedRows = QIONGTONG_CHECKED_ROWS.filter((row) => row.coverage === "checked");

export const QIONGTONG_SEASONAL_COVERAGE = Object.freeze({
  expectedSlots: 120,
  checkedRules: checkedRows.length,
  unresolved: Object.freeze(QIONGTONG_CHECKED_ROWS.filter((row) => row.coverage !== "checked").map((row) => ({
    dayStem: row.key[0]!, monthBranch: row.key[1]!, reason: row.caution
  })))
});

/** Ordered preferences are distinct from explicitly conditional alternatives.
 * Conditions are quoted-model reading aids, not an automatic pattern classifier. */
export const QIONGTONG_SEASONAL_RULES: readonly PreliminarySeasonalRule[] = Object.freeze(checkedRows.map((row) => {
  const preferred = row.preferredStems.length ? `先考察${row.preferredStems.join("、")}` : "按组合条件分别考察取用";
  const alternative = row.conditionalStems.map((entry) => `${entry.stem}：${entry.condition}`).join("；");
  return {
    id: `qiongtong-${STEM_CODES[row.key[0]!]}-${BRANCH_CODES[row.key[1]!]}-w2294674-v1`,
    dayStem: row.key[0]!, monthBranch: row.key[1]!,
    headline: `${row.key[0]}日${row.key[1]}月：${preferred}`,
    summary: `按《穷通宝鉴》${row.section}的${SCOPE_LABELS[row.scope]}，本条${preferred}。${alternative ? `条件配用为${alternative}。` : ""}${row.caution}`,
    preferredStems: row.preferredStems,
    conditionalStems: row.conditionalStems,
    cautions: [row.caution, `按节令${row.key[1]}月匹配，不按公历月份或农历初一切换。`, "条件配用仅保留原文的结构条件；本条不凭透藏个数自动判定条件已成立，也不作现实功名、财富或疾病保证。"],
    sourceIds: [sourceId(row.key)]
  };
}));

export const QIONGTONG_SEASONAL_SOURCES: readonly PreliminarySource[] = Object.freeze(checkedRows.map((row) => ({
  id: sourceId(row.key),
  title: `《穷通宝鉴》· ${row.section}·${row.key[1]}月`,
  url: `https://zh.wikisource.org/w/index.php?title=%E7%A9%B7%E9%80%9A%E5%AE%9D%E9%89%B4&oldid=2294674#${row.section}`,
  locator: `${row.section}，正文段${row.paragraphs.map((paragraph) => paragraph.ordinalInSection).join("、")}；${SCOPE_LABELS[row.scope]}；固定版本2294674，全篇提取块${row.paragraphs.map((paragraph) => paragraph.index).join("、")}。`,
  excerpt: row.excerpt,
  interpretation: `${row.preferredStems.length ? `本条常规主轴为${row.preferredStems.join("、")}。` : "原文须先分情形，不据月支指定唯一主用。"}${row.conditionalStems.map((entry) => `${entry.stem}的配用条件或辅佐作用：${entry.condition}。`).join("")}${row.caution}`,
  provenance: {
    revisionId: 2294674, section: row.section, scope: row.scope, textVariant,
    excerptSha256: row.excerptSha256, excerptTransform: row.excerptTransform,
    paragraphs: row.paragraphs, stemEvidence: row.stemEvidence,
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.zh",
    rightsNote: "所取为古籍原文短摘与本地重述，不含现代评注；固定转录来源署名为维基文库贡献者。该页站点文字标注CC BY-SA 4.0，保留来源与许可链接；古籍原文公有领域与现代新增文字的权利范围分开。"
  }
})));
