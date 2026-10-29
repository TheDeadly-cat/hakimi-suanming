import { lookupConditionalContentRule } from "./conditional-content-rules";

// Frozen for plain-summary/0.1.3 and its saved literal verification. Review a
// new formatter/version together if the source rules or this wording change.
const sourceFamily = "hakimi.conditional-content-rules/";
const supportedVersion = "hakimi.conditional-content-rules/0.1.0";

export function supportsFrozenPlainConditions(versions: readonly string[]): boolean {
  const family = [...new Set(versions.filter(version => version.startsWith(sourceFamily)))];
  return family.length === 1 && family[0] === supportedVersion;
}

const explanations: Readonly<Record<string, string>> = {
  "实际发生保证、统计概率": "这些线索不保证事情实际发生，也不能用来表示发生概率。",
  "真实发生保证或统计概率": "这些线索不保证事情实际发生，也不能用来表示发生概率。",
  "跨18整段成人化；出生前编人生事件": "不能把跨过18岁的整段时间都按成人经历解释，也不能为出生前编写人生事件。",
  "由自由notes猜职业；分开等于必复合": "不能从自由填写的备注猜测职业，也不能把已经分开理解为必然复合。",
  "换运即换工作；mixed给每项事件添阻力": "不能把更换大运等同于换工作；整体判断同时有利有弊，也不表示每件事都一定有阻力。",
  "事业好坏推感情；无信号等于稳定": "不能用事业的好坏推断感情结果；没有发现相应信号，也不等于关系已经稳定。",
  "无方向即坏；路径有用即该字已助": "尚未判断出好坏，不等于结果不好；某条作用路径有用，也不表示其中这个字已经发挥了帮助作用。",
  "救应数量当概率；候选当成功": "不能把缓解问题的候选办法当成已经奏效，也不能用候选数量表示成功概率。",
  "背景阻力写到neutral目标；每项事件都受阻": "不能把背景中的阻力算在尚未判断为有利或不利的当前对象上，也不能据此认定每件事都会受阻。",
  "藏字帮助等于全年明透事项都顺": "不能把藏干中的辅助帮助，扩大成全年其他明透天干所对应的事项都会顺利。"
};

/** The caller must first bind both conclusion and snapshot source versions. */
export function frozenPlainConditionText(ruleId: string, raw: string): string {
  if (!lookupConditionalContentRule(ruleId)?.forbiddenInferences.includes(raw)) return raw;
  return explanations[raw] ?? `不能据此认定“${raw}”。`;
}
