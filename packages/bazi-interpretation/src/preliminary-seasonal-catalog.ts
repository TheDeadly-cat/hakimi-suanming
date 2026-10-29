import type { PreliminarySeasonalRule, PreliminarySource } from "./preliminary-assessment";
import { QIONGTONG_SEASONAL_RULES, QIONGTONG_SEASONAL_SOURCES } from "./preliminary-qiongtong-catalog";
import { YI_CHOU_FACSIMILE_RULE, YI_CHOU_FACSIMILE_SOURCE } from "./preliminary-qiongtong-yi-chou-facsimile";

const ORIGINAL_XIN_SHEN_SOURCES: readonly PreliminarySource[] = Object.freeze([
  {
    id: "preliminary-qiongtong-xin-shen",
    title: "《穷通宝鉴》· 三秋辛金·七月",
    url: "https://zh.wikisource.org/w/index.php?title=%E7%A9%B7%E9%80%9A%E5%AE%9D%E9%89%B4&oldid=2294674#三秋辛金",
    locator: "三秋辛金，七月辛金三段；维基文库固定版本2294674",
    excerpt: "壬水为尊，甲戊酌用可也。",
    interpretation: "申月辛金先考察壬的疏泄调剂；甲、戊根据土是否阻水、水是否过盛分别考虑，不是所有辛申盘都应增加水木。"
  }
]);

/** Preserve the previously checked rule byte-for-byte at the object level. */
const ORIGINAL_XIN_SHEN_RULES: readonly PreliminarySeasonalRule[] = Object.freeze([
  {
    id: "qiongtong-xin-shen-v1",
    dayStem: "辛", monthBranch: "申",
    headline: "辛金申月：优先考察壬水，甲戊依条件配合",
    summary: "按《穷通宝鉴》辛金申月条，壬是优先考察的调剂用字；甲疏土、戊节水各有适用条件。已有壬甲时重点在配合与适量，不等于继续增加水木。",
    preferredStems: ["壬"],
    conditionalStems: [
      { stem: "甲", condition: "土重阻水时可疏土；只见藏戊不自动判为土重。" },
      { stem: "戊", condition: "金水偏泛时可节水；水势未过时不能一概增加土。" }
    ],
    cautions: ["原文并不主张壬越多越好；透藏次数不能直接替代水土作用强度。", "此条按节令申月匹配，不按公历七月或农历初一切换。"],
    sourceIds: ["preliminary-qiongtong-xin-shen"]
  }
]);

/** 119 slots from the fixed transcription plus one independently checked
 * facsimile clause. The fixed transcription itself remains unresolved for Yi-Chou. */
export const PRELIMINARY_SEASONAL_CATALOG: readonly PreliminarySeasonalRule[] = Object.freeze(
  [...QIONGTONG_SEASONAL_RULES.map((rule) => rule.dayStem === "辛" && rule.monthBranch === "申" ? ORIGINAL_XIN_SHEN_RULES[0]! : rule), YI_CHOU_FACSIMILE_RULE]
);
export const PRELIMINARY_SEASONAL_SOURCES: readonly PreliminarySource[] = Object.freeze(
  [...QIONGTONG_SEASONAL_SOURCES.map((source) => source.id === "preliminary-qiongtong-xin-shen"
    ? { ...ORIGINAL_XIN_SHEN_SOURCES[0]!, provenance: source.provenance }
    : source), YI_CHOU_FACSIMILE_SOURCE]
);
export const PRELIMINARY_SEASONAL_COVERAGE = Object.freeze({ expectedSlots: 120, checkedRules: PRELIMINARY_SEASONAL_CATALOG.length,
  fixedWikisourceRules: QIONGTONG_SEASONAL_RULES.length, independentFacsimileRules: 1 });

/** Our coarse seasonal vocabulary; these are not individually verified classic prescriptions. */
export const PRELIMINARY_SEASONAL_OBSERVATIONS: Readonly<Record<string, { headline: string; summary: string }>> = Object.freeze({
  寅: { headline: "初春余寒，先辨温通条件", summary: "按节令寅月作简化观察，寒意渐退而木气萌动。寒暖判断先看火是否有承接、水是否加重寒湿，同时结合日主，不能见春月就一律取火。" },
  卯: { headline: "仲春木气活跃，寒暖渐和", summary: "按节令卯月作简化观察，先看木的生发与水火配合。季节提供背景，具体用字仍取决于日主、透藏与全局，不能只因木旺便指定金为喜用。" },
  辰: { headline: "季春湿土，留意湿滞与通达", summary: "按节令辰月作简化观察，湿土背景使水、木、土的配合值得先读；有土不等于土厚，有水不等于水泛，需要结合位置与日主承受能力。" },
  巳: { headline: "孟夏转热，先辨燥热与承接", summary: "按节令巳月作简化观察，火气渐盛。先看水土能否形成调节，再结合日主所需；不能把见水直接解释成调候成功。" },
  午: { headline: "仲夏偏热，重点看燥热调节", summary: "按节令午月作简化观察，火热背景明显，水土的调节条件需结合原局根气和强弱阅读；不能把所有午月盘统一判为喜水。" },
  未: { headline: "季夏燥土，辨润燥与土的作用", summary: "按节令未月作简化观察，火土偏燥的背景下，先看水木与土的配合。土可承接也可壅滞，不能用出现次数直接下结论。" },
  申: { headline: "初秋金气渐旺，余热尚存", summary: "按节令申月作简化观察，重点看金水疏泄与火土是否改变承受条件。具体日干的取用需专条支撑，不能把辛金申月规则套给其他日主。" },
  酉: { headline: "仲秋偏燥，辨润燥与金的疏泄", summary: "按节令酉月作简化观察，金气与燥性是阅读背景。水的润泽、木火的配合都须回到日主与组合，不能因秋燥便认定水恒为喜用。" },
  戌: { headline: "季秋燥土，兼顾凉意与润燥", summary: "按节令戌月作简化观察，燥土与渐凉并存。先辨土的承接或阻滞，再看水火是否适量，不把湿润与生扶混成同一个分数。" },
  亥: { headline: "初冬转寒，先辨寒湿与温通", summary: "按节令亥月作简化观察，水气与寒意加深，火土能否温通、承接需要结合原局；这不意味着所有日主都应取火土。" },
  子: { headline: "仲冬偏寒，重点看温通条件", summary: "按节令子月作简化观察，寒水背景明显。火能否发挥温通、土能否承接需看透藏与日主，不因出现一个火字就判调候完成。" },
  丑: { headline: "季冬寒湿土，辨温通与湿滞", summary: "按节令丑月作简化观察，寒湿与土的承接并存，先看火与水土如何配合；不能仅以土生金或土克水替代寒暖判断。" }
});
