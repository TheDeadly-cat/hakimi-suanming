import type { ReadingConclusion, ReadingExplanationIndex } from "./reading-explanation-index";
import { frozenPlainConditionText, supportsFrozenPlainConditions } from "./plain-reading-condition";

export const PLAIN_READING_CONTENT_VERSION = "hakimi.plain-summary/0.1.3" as const;

/** A display projection only. It never enters or upgrades a saved report contract. */
export interface PlainReadingSummary {
  sourceConclusionId: string;
  sourceRevisionId: string;
  sourceReportVersion: string;
  sourceVersions: string[];
  topic: ReadingConclusion["domain"];
  scope: ReadingConclusion["scope"];
  plainTitle: string;
  explanation: string;
  conditions: string[];
  limitations: string[];
  unknowns: string[];
  observationQuestion: string;
  nextAction: string;
  evidenceRefs: { conclusionId: string; sourceId: string }[];
  ruleRefs: string[];
  glossaryRefs: string[];
  contentVersion: typeof PLAIN_READING_CONTENT_VERSION;
  reviewState: "editorial_draft_not_expert_reviewed";
  projectionState: "mapped" | "original_required" | "personal_original";
}

type RouteCopy = { label: string; meaning: string; career: string; wealth: string };
// Original editorial explanations selected ONLY by an already recorded producer
// choice, never by fuzzy prose matching, a different domain, or a new chart rule.
const routes: Record<string, RouteCopy> = {
  "resource-output": { label: "印格泄秀", meaning: "这份解释关注积累怎样转成表达和成果：已有支持，需要有实际发挥的出口。", career: "本报告把专业积累与实际产出连在一起理解。掌握了知识和方法，与它们已经在工作中发挥作用，仍是两件事。", wealth: "本报告把收入线索放在专业能力的实际使用上；有能力或投入较多，并不表示已经有相应回报。" },
  "peer-output-wealth": { label: "禄劫用食伤生财", meaning: "这份解释把自主发挥、产出与现实需求连成一条线；共同参与时，还要分别看贡献和承接条件。", career: "本报告关注自主判断怎样形成可使用的成果，以及个人发挥与协作怎样连接。", wealth: "本报告将成果、实际需求和共同参与分开看；参与的人多或产出增加，都不能直接换算成个人收入。" },
  "food-wealth": { label: "食神生财", meaning: "这份解释关注稳定产出如何接上实际用途；能持续完成与能获得回报之间，还有承接条件。", career: "本报告关注把熟悉的方法持续做成成果；一次完成与长期保持质量，是不同的环节。", wealth: "本报告把成果与回报联系起来，同时保留制作、维护和后续承担的成本。" },
  "hurting-wealth": { label: "伤官取财", meaning: "这份解释关注表达和改进怎样进入实际应用；提出不同办法不等于它已经被采用。", career: "本报告关注发现问题、提出改法与实际使用之间的连接；看见问题不等于已经完成改进。", wealth: "本报告把改进和实际采用连在一起理解；得到关注与取得收入之间仍有距离。" },
  "wealth-food": { label: "财格用食伤生财", meaning: "这份解释从现实需求看完成方法；有明确目标，还需要实际产出与它相接。", career: "本报告关注实际需要怎样带动方法和完成过程；需求明确不等于完成条件已经具备。", wealth: "本报告同时看需要、投入和完成方法；投入增加不能单独说明回报增加。" },
  "official-resource": { label: "官印相生", meaning: "这份解释关注要求、学习支持与执行如何相接；责任明确，还需要能完成它的支持。", career: "本报告把职责、专业积累和执行连起来看；承担责任与拥有完成条件需要分别理解。", wealth: "本报告把可用资源看作履行责任的配套；资源与新增承担不能只取其中有利的一面。" },
  "killings-resource": { label: "杀印相生", meaning: "这份解释关注集中要求如何通过学习和支持得到承接；有压力不等于已经能处理它。", career: "本报告关注较强要求怎样通过指导、学习与实践变成能处理的事情。", wealth: "本报告关注资源能否补上实际承担中的缺口；获得支持并不自动代表收入提高。" },
  "official-wealth": { label: "财官相生", meaning: "这份解释把可用资源与责任相连；条件增加，也可能伴随更多需要完成的事项。", career: "本报告把资源、完成标准和责任联系起来理解；条件增加时，承担范围也需要一并看。", wealth: "本报告同时保留资源的用途和伴随的责任，不能只把资源增加理解为净回报增加。" },
  "food-killings": { label: "食神制杀", meaning: "这份解释关注已有方法怎样承接压力；方法本身能否保持，是这条作用的重要条件。", career: "本报告关注用已有方法处理集中要求；方法受限制时，不能只看它能缓解压力的一面。", wealth: "本报告关注投入是否支持了实际处理步骤；支持与新增要求分别保留。" },
  "hurting-resource": { label: "伤官配印", meaning: "这份解释关注表达与依据怎样互相配合；有自己的看法，也需要支持它的知识与条件。", career: "本报告把表达、学习和核实连在一起理解；提出主张与主张能被采用之间仍有条件。", wealth: "本报告关注投入能否帮助已有想法得到实际验证，不能把准备越多理解为收益越高。" },
  "resource-preservation": { label: "印食配合", meaning: "这份解释分别保留支持与产出的作用；两者如何配合，不能简单理解为都越多越好。", career: "本报告关注积累与实践的配合；补充支持与已有能力的发挥需要分别理解。", wealth: "本报告保留支持和产出的不同作用，增加支持不能直接等同于增加收入。" },
  "resource-wealth": { label: "印旺用财", meaning: "这份解释关注过多准备与现实应用的取舍；这里的“财”先承担调节作用。", career: "本报告关注怎样让已有积累进入实际应用，保留必要支持与减少过度准备的条件。", wealth: "本报告中的财先承担调节支持的作用；这个结构分类本身不说明已经获得收入。" },
  "resource_first": { label: "伤官财重，以印护身制伤", meaning: "这份解释将保住支持放在继续扩展产出与投入之前，两种作用有明确先后。", career: "本报告把稳住支持放在扩大表达与投入之前；已有产出线索仍需相应的承接条件。", wealth: "本报告先看承担能力与必要支持；投入或机会增加，不能直接理解为收入更好。" },
  "wealth_first": { label: "伤官印重，以财调印", meaning: "这份解释先看怎样调节过多支持，让已有表达发挥；仍保留必要支持的基础。", career: "本报告关注已有表达怎样从过多准备中发挥出来；作为调节支点的条件仍须保留。", wealth: "本报告把财的作用定位为调节支持；这不是已经发财的判断，回报还取决于实际承接。" },
  "official_joint": { label: "官格财印分用", meaning: "这份解释让资源与支持各司其职：一部分配合要求，一部分支持执行，不能合成单一利好。", career: "本报告分别看承担要求与支持执行的条件；资源和学习支持不能相互替代。", wealth: "本报告区分资源对责任与支持的不同作用，不能把两种配合都算作收入增加。" },
  "rooted_peer_mixed_authority": { label: "禄劫背景，财生官兼带七杀", meaning: "这份解释同时保留资源连接与不同要求带来的压力，尚不能合成一种纯粹优势。", career: "本报告同时保留发展与不同要求并行的压力，不能只挑其中有利的一条理解。", wealth: "本报告把资源与责任压力连在一起；已有承接线索不能等同于净回报增加。" }
};

const relationshipMeanings: Record<string, string> = {
  比肩: "本报告从对等与自主空间理解相处，关注双方怎样作决定。",
  劫财: "本报告从共同参与与利益边界理解相处，区分个人与共同承担。",
  食神: "本报告从舒适感、交流与持续回应理解相处，关注日常互动。",
  伤官: "本报告从表达与对关系的要求理解相处，关注意见不同怎样呈现。",
  正财: "本报告从持续承诺和现实安排理解相处，关注责任与长期稳定。",
  偏财: "本报告从灵活参与和现实安排理解相处，区分临时联系与长期承诺。",
  正印: "本报告从理解、照顾与安全感理解相处，保留双方独立性的条件。",
  偏印: "本报告从精神理解与个人空间理解相处，关注生活方式能否被理解。",
  正官: "本报告从承诺与责任边界理解相处，关注安排是否清楚。",
  七杀: "本报告从要求与承受范围理解相处，关注压力进入关系后的回应。"
};
const domainTitle: Record<ReadingConclusion["domain"], string> = {
  natal: "先理解本盘的作用关系", career: "工作与发挥怎样连接", wealth: "投入与回报怎样区分",
  relationship: "这条怎样理解相处", timing: "看清这一段时间"
};
const domainLimit: Record<ReadingConclusion["domain"], string> = {
  natal: "传统结构分类不表示身体、智力、财富或人生等级，也不证明某件事会发生。",
  career: "这不证明职业、能力高低、就业或升职已经确定。",
  wealth: "这不表示收入金额、投资收益或财产水平已经确定。",
  relationship: "这不证明已经恋爱、必然结婚、分手或复合，也不能代替双方的真实情况。",
  timing: "只解释本条所记时间范围，不据此确定事件日期。"
};
const questions: Record<ReadingConclusion["domain"], string> = {
  natal: "哪些条件与你已知的情况相符，哪些不符或还不知道？",
  career: "你实际经历中的要求、支持与完成过程，有哪些相符或不同？",
  wealth: "你记录的实际投入、支出和回报，与这条描述有什么不同？",
  relationship: "你实际的相处与责任安排，有哪些相符、不同或尚未发生？",
  timing: "这段时间是否有可核对的记录？没有或不符也可以如实记录。"
};
const unique = (items: readonly string[]) => [...new Set(items.filter(Boolean))];
const backgroundPaths = new Set(["peer-background", "wealth-background", "output-background", "official-background", "seven_killings-background", "resource-background"]);

// Deliberate compatibility pins, not imports of the producers' moving current
// constants. A producer change requires review of these editorial templates.
// Verified against natal-reading-rule-application.ts, concrete-natal-prose.ts,
// natal-life-story.ts and natal-adopted-conclusion.ts respectively.
const supportedProducers = {
  provenance: "hakimi.natal-reading-rule-applications/0.1.0",
  concrete: "hakimi.concrete-natal-prose/0.2.0",
  life: "hakimi.natal-life-story/0.3.0",
  adopted: "hakimi.natal-adopted-conclusion/0.2.1"
} as const;

function hasBoundVersions(index: ReadingExplanationIndex, conclusion: ReadingConclusion, versions: readonly string[]) {
  return versions.every(version => conclusion.sourceVersions.includes(version) && index.sourceSnapshot.sourceVersions.includes(version));
}

function compatibleSelection(index: ReadingExplanationIndex, conclusion: ReadingConclusion,
  selector: string, ruleId: string, producerVersion: string): string | undefined {
  if (!hasBoundVersions(index, conclusion, [supportedProducers.provenance, producerVersion])) return undefined;
  const candidates = conclusion.evidence.ruleApplications.filter(rule => rule.provenance?.selector === selector);
  if (candidates.length !== 1) return undefined;
  const rule = candidates[0]!;
  return rule.ruleId === ruleId && rule.provenance?.version === supportedProducers.provenance
    && rule.provenance.producerVersion === producerVersion ? rule.provenance.selection : undefined;
}

function compatibleAdoptedRule(index: ReadingExplanationIndex, conclusion: ReadingConclusion, key: string) {
  // Current adopted conclusions carry their version in the report/statement
  // source lists. Their single rule has no separate provenance envelope.
  if (conclusion.domain !== "natal" || !hasBoundVersions(index, conclusion, [supportedProducers.adopted])
    || conclusion.evidence.ruleApplications.length !== 1) return undefined;
  const rule = conclusion.evidence.ruleApplications[0]!;
  if (rule.provenance) return undefined;
  if (key === "natal:pattern") return rule;
  return key === `natal:use:${rule.ruleId}` && rule.title === conclusion.label && rule.decision === conclusion.text ? rule : undefined;
}

export interface ReadingGlossaryEntry { id: string; term: string; explanation: string }
export const READING_GLOSSARY: readonly ReadingGlossaryEntry[] = [
  { id: "day-master", term: "日主", explanation: "出生日天干的名称，用作传统关系分类的参照点。它不是人格评分。" },
  { id: "ten-gods", term: "十神", explanation: "其他干支与日主之间关系的传统名称，如印、财、官。名称不等于现实中已经有相应的人或事。" },
  { id: "peer", term: "比肩", explanation: "十神中与日主同类的一种关系名称。解读可能讨论自主与共同参与，但不能据此认定某个具体人物或个人能力。" },
  { id: "rob-wealth", term: "劫财", explanation: "十神中与日主同类的一种关系名称，和比肩有阴阳配对的区别。它不是财星，也不表示现实中必然被夺走财物。" },
  { id: "direct-wealth", term: "正财", explanation: "十神中的一种财星关系名称，常用于讨论投入、承接与现实安排。名称不代表固定工资、稳定收益或已经拥有财产。" },
  { id: "indirect-wealth", term: "偏财", explanation: "十神中的另一种财星关系名称，与正财有阴阳配对的区别。不能据它认定横财、投机收益或关系人数。" },
  { id: "direct-resource", term: "正印", explanation: "十神中的一种支持关系名称，解读常关联学习、照顾与理解。是否存在现实帮助，仍要核对具体情况。" },
  { id: "indirect-resource", term: "偏印", explanation: "十神中的另一种支持关系名称，与正印有阴阳配对的区别。名称不证明性格、学历、疾病或某个人的身份。" },
  { id: "direct-official", term: "正官", explanation: "十神中一类约束关系的名称，解读可能讨论规则、责任和承诺。它不等于现实官职，也不能单独确定职业或婚姻。" },
  { id: "seven-killings", term: "七杀", explanation: "十神中另一类约束关系的名称，常与集中要求、承受范围一起解释。名称不表示伤害、灾祸或具体危险必然发生。" },
  { id: "food-god", term: "食神", explanation: "十神中一类由日主生出的关系名称，解读可能讨论表达与产出。名称本身不能证明才能、身体状况或实际成果。" },
  { id: "hurting-official", term: "伤官", explanation: "十神中另一类由日主生出的关系名称，与食神有阴阳配对的区别。不能按字面认定会冒犯他人、损害官职或必然发生冲突。" },
  { id: "month-command", term: "月令", explanation: "出生月份按所用节气规则确定的季节与角色背景，是传统分析的一项依据。它不等于公历自然月，也不能单独决定整份命盘的结论。" },
  { id: "strength", term: "旺衰", explanation: "所采用规则对支持与消耗因素的相对分类。它不表示身体好坏、能力高低或命好不好。" },
  { id: "weak", term: "偏弱", explanation: "当前传统扶抑规则中的相对分类，不是身体弱或能力差。具体为何采用它，要查看本盘的实际依据。" },
  { id: "strong", term: "偏强", explanation: "当前传统扶抑规则中的相对分类，不是身体强或能力高。支持较多也不等于现实结果更好。" },
  { id: "pattern", term: "格局", explanation: "按所选传统规则组织命盘作用关系的方式。名称概括一条解释路径，不是人生等级。" },
  { id: "useful", term: "用神", explanation: "在当前规则与条件下优先考虑的作用或配合。它不等于现实中某种物品、颜色或做法一定有用。" },
  { id: "preferences", term: "喜忌", explanation: "特定规则下对作用配合的取舍。它有前提，不是现实生活里绝对的好坏清单。" },
  { id: "resource", term: "印", explanation: "十神关系的一类名称。解读中常关联支持、学习等主题；是否有现实支持仍须核对实际情况。" },
  { id: "output", term: "食伤", explanation: "食神与伤官的合称，是十神关系分类。表达、产出的解释需要本盘规则和现实条件支持。" },
  { id: "wealth", term: "财", explanation: "十神关系分类的名称，不能把出现财星或财多直接换算成钱多、收入或收益。" },
  { id: "authority", term: "官杀", explanation: "正官与七杀的合称，是传统关系分类。它不能单独证明官职、压力事件或职业结果。" },
  { id: "balance", term: "扶抑", explanation: "当前传统规则对支持与消耗作用作取舍的方法。它不取代格局、季节等各自的条件。" },
  { id: "seasonal", term: "调候", explanation: "传统解释中对季节背景与配合作用的考虑，不是天气预报或健康诊断。" },
  { id: "decade", term: "大运", explanation: "依据出生资料和所选规则划出的较长阶段。顺逆与起止受资料影响，不代表阶段内每件事相同。" },
  { id: "year", term: "流年", explanation: "报告采用的年度范围。具体起止按本报告规则显示，不应自行当作公历一月一日至年底。" },
  { id: "month", term: "节令月", explanation: "按节气分段的月份，起止通常不等于公历自然月。阅读时以本条日期范围为准。" },
  { id: "branch", term: "顺逆", explanation: "大运排列的不同方向。资料不足时会保留多条路径，选择查看不代表确认某条真实。" },
  { id: "hour", term: "时柱", explanation: "依出生时刻和所选时间规则计算的一柱。时刻未知时不能补猜，依赖它的解释也须保留未定。" },
  { id: "source", term: "依据", explanation: "这条解释实际采用的资料、计算事实与规则出处。可追溯不等于现实预测已经被证明。" }
];

const glossaryByTerm = new Map(READING_GLOSSARY.map(entry => [entry.term, entry]));
const glossaryTermPattern = new RegExp([...READING_GLOSSARY].sort((a, b) => b.term.length - a.term.length).map(entry => entry.term).join("|"), "gu");
/** Match whole supported terms first: 劫财 must never add a separate 财 entry. */
export function readingGlossaryEntriesInText(text: string): ReadingGlossaryEntry[] {
  return unique(text.match(glossaryTermPattern) ?? []).map(term => glossaryByTerm.get(term)!);
}

export function buildPlainReadingSummary(index: ReadingExplanationIndex, conclusion: ReadingConclusion): PlainReadingSummary {
  if (!index.conclusions.includes(conclusion) || !conclusion.stableId.startsWith(`${index.sourceSnapshot.revisionId}/`)) {
    throw new Error("白话摘要必须绑定当前索引中的原结论。");
  }
  const key = conclusion.stableId.slice(index.sourceSnapshot.revisionId.length + 1);
  let explanation = "按原标题查看完整原文、成立条件与依据。";
  let projectionState: PlainReadingSummary["projectionState"] = "original_required";
  let plainTitle = domainTitle[conclusion.domain];
  const rules = conclusion.evidence.ruleApplications;
  const canExplainConditions = supportsFrozenPlainConditions(conclusion.sourceVersions)
    && supportsFrozenPlainConditions(index.sourceSnapshot.sourceVersions);
  if (conclusion.origin === "personal") {
    explanation = "这里采用了你保存的个人文字。打开后按原样阅读，不把它改写成自动计算或已证实的结论。";
    plainTitle = "你保存的个人理解";
    projectionState = "personal_original";
  } else if (conclusion.scope.level === "natal") {
    const routeSelection = compatibleSelection(index, conclusion, "buildConcreteNatalProse.route", "buildConcreteNatalProse.route", supportedProducers.concrete);
    const route = routeSelection?.startsWith(`${conclusion.domain}/`) ? routes[routeSelection.slice(conclusion.domain.length + 1)] : undefined;
    const relationship = compatibleSelection(index, conclusion, "buildConcreteNatalProse.relationship", "buildConcreteNatalProse.relationship", supportedProducers.concrete);
    const lifeSelection = compatibleSelection(index, conclusion, "buildNatalLifeStory.workWealthParagraphs", "natal-life-domain-projection", supportedProducers.life)?.split("/");
    const adoptedRule = compatibleAdoptedRule(index, conclusion, key);
    if (route && (conclusion.domain === "career" || conclusion.domain === "wealth")) {
      explanation = route[conclusion.domain]; projectionState = "mapped";
    } else if (conclusion.domain === "relationship" && relationship && relationshipMeanings[relationship.split("/")[0]!]) {
      explanation = relationshipMeanings[relationship.split("/")[0]!]!;
      if (relationship.split("/")[1] === "separated") explanation += "已记录分开背景；仍有联系可能只是事务或责任交接，不据此推断复合。";
      projectionState = "mapped";
    } else if (key === "natal:pattern") {
      const rule = adoptedRule && routes[adoptedRule.ruleId]?.label === adoptedRule.title ? adoptedRule : undefined;
      const background = adoptedRule && backgroundPaths.has(adoptedRule.ruleId) ? adoptedRule : undefined;
      if (rule) { explanation = routes[rule.ruleId]!.meaning; projectionState = "mapped"; }
      else if (background) {
        explanation = `本盘目前确定的是“${background.title}”：出生月份的角色背景已有依据，组成完整作用路径的配合尚未齐备，因此不能据此给出固定的人生主线。`;
        plainTitle = "背景已明确，完整配合仍待确定"; projectionState = "mapped";
      }
    } else if ((conclusion.domain === "career" || conclusion.domain === "wealth") && lifeSelection?.[0] === conclusion.domain
      && backgroundPaths.has(lifeSelection[1] ?? "")) {
      explanation = conclusion.domain === "career"
        ? "这份报告保留了已算出的角色分工，但尚未形成专门的发挥主线；目前不能据月份背景确定擅长的职业或发展路线。"
        : "这份报告能说明当前采用的资源角色与配合条件，尚不能由此确定经营方式或收入结果。已投入多少与实际回报仍须分开。";
      plainTitle = conclusion.domain === "career" ? "发挥方式还不能由背景定论" : "有投入线索，收入结果仍未定";
      projectionState = "mapped";
    } else if (key.startsWith("natal:use:")) {
      plainTitle = "本盘先考虑哪一种配合";
      if (adoptedRule?.ruleId === "support-first") {
        explanation = "原结论先考虑补足支持，再看产出与投入的配合；不能把继续增加消耗当作越多越好。";
        projectionState = "mapped";
      } else if (adoptedRule?.ruleId === "primary-limit") {
        explanation = "本盘保留了已经计算的作用方向，但具体优先用字仍有条件限制。没有给出的用字不补猜。";
        projectionState = "mapped";
      } else if (adoptedRule?.ruleId === "primary") {
        explanation = `本盘记录的优先配合为“${conclusion.label}”。这是当前规则下的先后取舍，具体能否发挥仍取决于原结论中的条件。`;
        projectionState = "mapped";
      } else if (adoptedRule?.ruleId === "seasonal") {
        explanation = "本条补充出生季节下的配合作用；它是辅助条件，不替代格局和其他取舍，也不是健康或天气判断。";
        projectionState = "mapped";
      }
    }
  }
  if (projectionState === "original_required") plainTitle = conclusion.label;
  const boundary = domainLimit[conclusion.domain];
  const visibleText = `${conclusion.label} ${explanation} ${conclusion.text}`;
  return {
    sourceConclusionId: conclusion.stableId, sourceRevisionId: index.sourceSnapshot.revisionId,
    sourceReportVersion: index.sourceSnapshot.reportVersion, sourceVersions: [...conclusion.sourceVersions],
    topic: conclusion.domain, scope: { ...conclusion.scope }, plainTitle, explanation,
    conditions: conclusion.origin === "personal" ? [] : unique(rules.flatMap(rule => rule.limitations.map(raw =>
      canExplainConditions ? frozenPlainConditionText(rule.ruleId, raw) : raw))),
    limitations: unique([boundary, ...conclusion.evidence.limits]), unknowns: [...conclusion.evidence.unknowns],
    observationQuestion: questions[conclusion.domain], nextAction: projectionState === "original_required" ? "查看原文及条件" : "读完整结论与条件",
    evidenceRefs: conclusion.origin === "personal" ? [] : index.citationBindings.filter(binding => binding.conclusionId === conclusion.stableId
      && conclusion.evidence.citations.includes(binding.sourceId)).map(({ conclusionId, sourceId }) => ({ conclusionId, sourceId })),
    ruleRefs: conclusion.origin === "personal" ? [] : rules.map(rule => rule.ruleId),
    glossaryRefs: readingGlossaryEntriesInText(visibleText).map(item => item.id),
    contentVersion: PLAIN_READING_CONTENT_VERSION, reviewState: "editorial_draft_not_expert_reviewed", projectionState
  };
}
