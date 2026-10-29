import { CASE_REVISION_ROUTE } from "./app-route-patterns";
import { READING_NAVIGATION_STORAGE_KEY } from "./reading-navigation-context";
import { READING_GLOSSARY } from "./reading-plain-summary";

export const LEARNING_GROUPS = [
  { id: "basics", label: "读图起点" }, { id: "relations", label: "关系名称" },
  { id: "judgments", label: "判断与条件" }, { id: "time", label: "时间范围" }
] as const;
export type LearningGroup = typeof LEARNING_GROUPS[number]["id"];

// These are reading examples attached to the existing glossary, not a separate
// source library or conclusions about a person's chart.
const readingExamples: Record<string, { group: LearningGroup; example: string }> = {
  "day-master": { group: "basics", example: "看到“甲木日主”，先理解为以甲作关系分类的参照，不把它读成人格标签。" },
  "ten-gods": { group: "basics", example: "同一份报告里的“印”和“财”是不同关系名称；出现名称，还不等于现实中已有帮助或收入。" },
  peer: { group: "relations", example: "看到“比肩参与配合”，先看它在这条规则中的作用，不据此指定某位同事或朋友。" },
  "rob-wealth": { group: "relations", example: "报告出现“劫财”时，不按字面读成“会丢钱”；应继续看该条采用的条件。" },
  "direct-wealth": { group: "relations", example: "看到“正财”，先读它与其他作用怎样配合，不能把这个词换算成固定工资。" },
  "indirect-wealth": { group: "relations", example: "看到“偏财”，不能直接读成“有横财”；同一条结论的适用条件仍要保留。" },
  "direct-resource": { group: "relations", example: "“正印提供支持”是报告里的解释用语；现实中有没有指导或学习机会，仍需核对。" },
  "indirect-resource": { group: "relations", example: "看到“偏印”，不据它判断学历或疾病；先找原结论为何采用这个关系。" },
  "direct-official": { group: "relations", example: "报告以“正官”讨论责任时，不等于已经确定某种职位或婚姻状态。" },
  "seven-killings": { group: "relations", example: "“七杀”中的“杀”不是危险预告；阅读时应连同要求、支持和限制理解。" },
  "food-god": { group: "relations", example: "看到“食神”与产出有关的解释，也要区分报告中的关系与实际完成的成果。" },
  "hurting-official": { group: "relations", example: "“伤官”是分类名称，不是已经与人冲突的记录；实际事件不能从字面补猜。" },
  "month-command": { group: "basics", example: "查出生月份的背景时，看报告采用的节气范围，不只看身份证日期中的月份数字。" },
  strength: { group: "judgments", example: "看到“旺衰判断”，先找支持与消耗的依据，不能把结果读成健康或能力评分。" },
  weak: { group: "judgments", example: "页面写“偏弱”时，可继续打开依据看为何这样分类；它不表示身体弱或能力差。" },
  strong: { group: "judgments", example: "页面写“偏强”时，不等于现实结果更好；还要看这条判断采用的条件。" },
  pattern: { group: "judgments", example: "看到一种“格局”名称，可以追问“它讨论哪些作用怎样配合”，而不是把它排成人生等级。" },
  useful: { group: "judgments", example: "报告说某种作用是“用神”，不能直接转换成购买某件物品或采用某种颜色。" },
  preferences: { group: "judgments", example: "“喜”或“忌”要连同当前规则的前提阅读，不把它抄成适用于所有情境的好坏清单。" },
  resource: { group: "relations", example: "“印”与支持有关的解释，不等于现实中已经有人帮忙；两者需要分别核对。" },
  output: { group: "relations", example: "看到“食伤”时，可以再分辨这条具体谈的是食神、伤官，还是两者的共同分类。" },
  wealth: { group: "relations", example: "报告里“财”的数量或作用，不能直接换成收入金额；钱的情况仍要看实际记录。" },
  authority: { group: "relations", example: "“官杀”合称两类关系；若想读懂具体判断，继续看本条说的是正官还是七杀。" },
  balance: { group: "judgments", example: "“扶抑”判断和“格局”结论可以讨论不同条件；不要只取其中一个词代替整条解释。" },
  seasonal: { group: "judgments", example: "看到“调候”中的季节用语，不把它当作天气预报或健康诊断。" },
  decade: { group: "time", example: "查看一段“大运”时，先核对显示的起止范围；这一阶段内的各年仍需分别阅读。" },
  year: { group: "time", example: "查看“2030流年”时，先看报告的起止日期，不自行假定它就是1月1日至12月31日。" },
  month: { group: "time", example: "流月列表写“立春月”时，看这一行的起止日期；它通常不是公历二月整月。" },
  branch: { group: "time", example: "资料不足时选择“顺行路径”只是换一套内容查看，不表示已经确认这套路径正确。" },
  hour: { group: "basics", example: "出生时刻未知时，报告保留“时柱未定”；不能为了补齐四柱而猜一个时刻。" },
  source: { group: "basics", example: "点击“查看依据”，核对这条实际采用的事实和规则；有出处并不等于现实事件已被证明。" }
};

export const LEARNING_ENTRIES = READING_GLOSSARY.map(entry => ({ ...entry, ...readingExamples[entry.id] }));

export function filterLearningEntries(query: string, group: LearningGroup | "all") {
  const search = query.normalize("NFKC").trim().toLocaleLowerCase();
  return LEARNING_ENTRIES.filter(entry => (group === "all" || entry.group === group)
    && (!search || `${entry.term} ${entry.explanation} ${entry.example}`.toLocaleLowerCase().includes(search)))
    .sort((left, right) => Number(right.term === search) - Number(left.term === search));
}

export type LearningReportLocator = { status: "none" | "unavailable" } | {
  status: "candidate"; caseId: string; revisionId: string; resultHash: string; ruleProfileDigest: string; href: string;
};

/** Read only route identity from the existing bounded same-tab record. A
 * repository read must confirm availability before displaying a return link. */
export function readLearningReportLocator(): LearningReportLocator {
  try {
    const raw = window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY);
    if (!raw) return { status: "none" };
    if (raw.length > 4096) return { status: "unavailable" };
    const record: unknown = JSON.parse(raw);
    if (!record || typeof record !== "object" || Array.isArray(record)) return { status: "unavailable" };
    const { version, identity } = record as Record<string, unknown>;
    if (version !== 1 || typeof identity !== "string") return { status: "unavailable" };
    const parts: unknown = JSON.parse(identity);
    if (!Array.isArray(parts) || parts.length !== 7 || parts.slice(0, 6).some(value => typeof value !== "string")
      || typeof parts[6] !== "boolean") return { status: "unavailable" };
    const [caseId, revisionId, resultHash, ruleProfileDigest] = parts as [string, string, string, string, string, string, boolean];
    const href = `/cases/${caseId}/revisions/${revisionId}`;
    if (!CASE_REVISION_ROUTE.test(href) || !resultHash || !ruleProfileDigest) return { status: "unavailable" };
    return { status: "candidate", caseId, revisionId, resultHash, ruleProfileDigest, href };
  } catch { return { status: "unavailable" }; }
}
