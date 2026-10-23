import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { NatalUsefulEntry } from "../../../../packages/bazi-interpretation/src/natal-useful-guidance";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import type { RevisionRecord } from "@hakimi/contracts";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import { buildNatalLifeStory } from "./natal-life-story";
import { buildNatalRelationshipLifeStory } from "./natal-relationship-life-story";
import { NATAL_READING_RULE_APPLICATIONS_VERSION, NATAL_READING_PROVENANCE_LIMIT, type NatalReadingRuleApplication } from "../../../../packages/bazi-interpretation/src/natal-reading-rule-application";

export const CONCRETE_NATAL_PROSE_VERSION = "hakimi.concrete-natal-prose/0.2.0" as const;
interface DomainProse { headline: string; paragraphs: string[]; sourceIds?: string[]; ruleApplications?: NatalReadingRuleApplication[] }
export interface ConcreteNatalProse {
  version: typeof CONCRETE_NATAL_PROSE_VERSION; sourceVersions: string[];
  introduction: { strength: string; obstacle: string } | null;
  domains: Partial<Record<"career" | "wealth" | "relationships", DomainProse>>;
}
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const POSITION = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const name = (entry: NatalUsefulEntry) => `${entry.stem}${entry.tenGod}`;
function distribution(entries: readonly NatalUsefulEntry[]): string {
  return entries.filter(entry => entry.presence !== "absent").map(entry => `${name(entry)}${entry.occurrences.map(o => `${o.kind === "visible" ? "透于" : "藏于"}${POSITION[o.position]}${o.kind === "hidden" ? o.branch : ""}`).join("、")}`).join("；");
}
function availability(entries: readonly NatalUsefulEntry[]): string {
  return entries.map(entry => `${name(entry)}${entry.presence === "exposed_rooted" ? "已透且有同五行藏根" : entry.presence === "exposed_unrooted" ? "已透，所选支内未见同五行藏根" : entry.presence === "hidden_only" ? "仍在藏干层" : "原局未见"}`).join("；");
}

// A route describes the already calculated development channel. These are
// interpretations of that channel, not a new profession, wealth or fate score.
const ROUTES: Record<string, { career: string; meaning: string; income: string }> = {
  "resource-output": {
    career: "事业靠专业能力获得认可，发展重心在技术、表达或服务",
    meaning: "本盘事业上的认可来源，是理解力、经验和专业积累转成别人用得上的能力。技术、表达、创造和专业服务，是这条发展主线的生活含义；先形成专长，再由专长带动责任与地位，是本盘更鲜明的次序。",
    income: "本盘收入主线偏向专业报酬：技术、表达、创作或服务能力得到实际需求的认可后，形成相应回报。能力是入口，财星负责承接；专长得到认可与收入形成规模，是前后相连的两步。",
  },
  "peer-output-wealth": {
    career: "事业靠自主能力与个人特色，发展中也有同辈竞争",
    meaning: "自身主见和独立承担较突出，发展要经过技术、表达或创造能力，再连接现实需求。能力能够形成独特价值时，同辈竞争可以成为发挥的背景；若只剩争取决定权，比劫的力量就未必进入生财通道。",
    income: "收入通道偏向个人能力、专业产出与经营需求的连接。比劫同时涉及同辈竞争和利益分配，财能否保留、食伤是否能通关，决定这条通道是否顺畅，不能只按人多或合作多判收入增加。",
  },
  "food-wealth": {
    career: "事业靠稳定技艺、产品或服务建立长期需求",
    meaning: "事业发展较重持续的技能、品质和可重复的产出，再由财承接实际需求。这类路径的重点是能力与需求之间形成长期联系；原局食财轻重与自身承载不同，发展规模和稳定性不能一概而论。",
    income: "财的来源主线较接近技能、产品或持续服务带来的经营性回报。食神负责产出，财负责承接，二者有明确分工；是否已有稳定回报，还要看财的透根、受制与自身能否承担。",
  },
  "hurting-wealth": {
    career: "事业靠表达、创造和解决问题获得市场认可",
    meaning: "事业发挥偏向提出不同做法、创造价值、解决问题，再让这些能力得到现实需求的承接。变化和表达较突出，与纯粹依靠固定职责的路径不同；食伤受制或财的承接不足时，能力与回报之间容易脱节。",
    income: "收入通道更接近创意、技术、表达或改进能力被市场接受后的回报。伤官见财是作用关系，不是已经有生意、投资收益或高收入的证明；仍须分别看输出和财星的具体条件。",
  },
  "wealth-food": {
    career: "事业由现实需求带动，重在把能力转成可交付的价值",
    meaning: "这条路径以财的现实需求为落点，由食伤补充实现需求的能力。事业发展偏向把需求、效率和产出连接起来；若财食超过自身承载，机会增加也会同时增加负担。",
    income: "收入主线围绕实际需求和可交付的能力展开，偏向产出或服务的经营回报。它能否持续，取决于食伤生财的连接与日主承载，不能只用财星数量判断财富层次。",
  },
  "official-resource": {
    career: "事业发展偏专业资历、组织认可与稳定职责",
    meaning: "事业主线偏向规则、资格、专业认可与职责承担的衔接。官带来职位或责任要求，印负责承接和支持；印能发挥时，发展更容易通过专业资格、组织认可和稳定职责逐步展开。",
    income: "财务回报较容易与正式职责、专业资格和所承担的责任相联系。财在这条结构里还可能影响必要的印，故不能把财出现直接解释成收入增加；收入机会与承接条件要同时成立。",
  },
  "official-wealth": {
    career: "事业发展偏资源经营与职责扩大，规模和负担相连",
    meaning: "事业主线在资源配置、现实经营与职责位置之间。财为官提供条件，得到更多资源时也往往对应更多责任；自身承载足够与否，是它表现为发展机会还是压力的重要区别。",
    income: "收入与资源经营、管理职责或正式合作的联系较强。财能资官也会加重承担，资产规模、合同规模与个人能够留下的财富并非同一个判断，仍要看身能任财官的条件。",
  },
  "food-killings": {
    career: "事业靠处理难题和承担高要求体现价值",
    meaning: "这条主线以食神的能力、方法与判断制约七杀的强要求。事业价值较容易在解决难题、处理复杂事务或承担高要求的事情中显现；它与单纯追求生财的路径不同，关键是食神能否保住制杀作用。",
    income: "回报先与处理难题和承担高要求的能力相连。财可能护食，也可能生杀、增加负担；因此有财参与并不自动表示收入更旺，必须看它究竟保护了哪一端、又加强了哪一端。",
  },
  "killings-resource": {
    career: "事业需专业支持承接强要求，压力与发展条件并存",
    meaning: "七杀带来强要求，印把这种要求转成可以承接的资历、方法和支持。事业发展更依赖专业认可或组织支持能否到位；印不足、受制时，压力本身不能算作职位或地位已经提升。",
    income: "收入更需要依托能够承担的职责与专业能力。财若破坏必要的印，会使原有支持变弱；这类结构首先看承载是否稳住，不能把新增财务机会单列为利好。",
  },
  "hurting-resource": {
    career: "事业靠独立见解与专业认可结合，表达和规范需要配合",
    meaning: "伤官的表达、判断与创造，需要印的专业依据和规范来调节。发展重点是既能形成独立见解，又能取得专业认可；印与伤官的轻重、根气及受制不同，会形成不同的发挥方式。",
    income: "回报先看表达、技术或判断能力能否经专业认可而成立。印是当前配合的一部分，财是否有利要看它调节过重的印，还是损伤必要的支持；同样见财，收入含义不能一律相同。",
  },
  "resource-wealth": {
    career: "事业重在把已有积累用到现实需求，取舍比继续增补更重要",
    meaning: "印的积累与自身承接已有基础，财在这里先负责调节过重的印，使已有能力能进入现实应用。它与财重需要护印的命盘先后相反，不能继续把增加印的支持当作统一方向。",
    income: "财在当前格局里首先是调印的用神，表示积累与现实用途需要接通，并不等于收入已经增加。是否形成实际财路，仍需看财的透根、是否受合受克，以及食伤与财能否衔接。",
  },
  "resource-preservation": {
    career: "先保住必要支持与能力出口，发展取决于二者能否配合",
    meaning: "这盘的事业判断重在印与食伤的具体关系。必要的印能承接自身，也可能抑制输出；哪一端需要保留，须沿已经选定的用神与实际受制判断，不能仅凭印多或食伤多定好坏。",
    income: "收入结构尚不能从单一财星推出，先看本盘能力出口与必要支持能否并存。财的加入可能调印，也可能伤印，实际财务回报要沿具体作用判断。",
  },
};
const TASKS: Record<string, { career: string; meaning: string; income: string }> = {
  official_joint: { career: "官格财印分用，资源与专业承接各司其职", meaning: "财负责资助官的职责，印负责承官生身。事业主线把资源条件、专业资格与责任位置连接起来；原局分位成立只说明当前这组财印可以分别取用，不表示后来增加的财印都没有牵制。", income: "财在这里首先服务于职责与资源配置，印维持专业和承接。收入可与所承担的管理、专业或正式职责联系，但财印并见本身不代表两路收入，也不代表已经拥有资产或职位。" },
  resource_first: { career: "伤官财重，先以印护身制伤，再谈财的承接", meaning: "表达、产出与财的负担已经较多，当前优先任务是让印的支持维持自身承载。事业并非没有能力或需求，而是承担与回报不能只向外扩张；印是否有根、是否受制，会影响能力能否稳定发挥。", income: "本盘已有食伤与财的连接，但财的负担先于承载，不能按财多就断收入更好。收入机会与消耗可能同时增加，当前用印是为了稳住承担条件，财不再列为优先增补。" },
  wealth_first: { career: "伤官印重，先用财调印，让表达能力进入现实应用", meaning: "印的支持较多，当前需要由财调节其对伤官的压制，使已有表达与创造能够发挥。这与财重护印的先后相反；财是否有根、是否受合克，会直接限制这一发展通道。", income: "财的当前任务是调印，不是直接宣布发财。收入要由已经能发挥的能力与实际需求相接；如果作为调节支点的财已透却无根，当前明确的是用财方向，不能说承接回报的条件已经充分。" },
};

const PALACE_MEANING: Record<string, string> = {
  比肩: "婚恋相处较重对等、自主与各自的决定空间，核心矛盾更容易落在谁作决定，而不是简单用谁付出多少衡量。",
  劫财: "婚恋相处较重共同参与与利益边界，朋友、家人或共同事务进入两人生活后，个人与共同部分容易相互牵动。",
  食神: "婚恋相处较重舒适感、表达与持续回应，感情质量更落在能否相处自然、愿意交流和共同生活，而非只靠外在条件判断。",
  伤官: "婚恋相处较重表达、自我判断与对关系质量的要求，意见不同和不满的表达方式，是比单一伴侣星数量更直接的观察点。",
  正财: "婚恋相处较重持续承诺与现实生活的稳定，日常责任、长期安排与实际付出容易成为关系中的核心主题。",
  偏财: "婚恋相处较重灵活参与、现实安排与社交弹性，临时参与和长期承诺之间的区别较重要，不能据偏财直接推断关系人数。",
  正印: "婚恋相处较重理解、照顾与安全感，亲近中的支持是否被需要、是否保留双方独立性，是主要观察点。",
  偏印: "婚恋相处较重精神理解与个人空间，彼此看法和生活方式能否被理解，比表面一致更重要。",
  正官: "婚恋相处较重名分、承诺和责任边界，关系能否形成清楚而稳定的安排，是主要主题。",
  七杀: "婚恋相处较重要求、回应与承受范围，责任和压力同时进入关系时，双方能否承接是主要主题。",
};

export function buildConcreteNatalProse(input: {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; comprehensive: BaziComprehensiveReading;
  referenceInstant: string | null; contextual?: LocalContextualReadingBundle | null;
}): ConcreteNatalProse {
  const { revision, assessment, comprehensive: c, referenceInstant, contextual } = input;
  const story = buildNatalLifeStory({ revision, assessment, comprehensive: c, referenceInstant, context: contextual?.contextSource.document.context });
  const result: ConcreteNatalProse = { version: CONCRETE_NATAL_PROSE_VERSION, sourceVersions: [CONCRETE_NATAL_PROSE_VERSION, ...story.sourceVersions], introduction: null, domains: {} };
  const d = c.patternDiagnosis!, u = c.usefulGuidance!, working = getWorkingBalance(assessment);
  const task = d.wealthResourceTask, selectedTask = task.applicable && task.preferredPathId === d.primaryPathId ? task.task : "";
  const route = TASKS[selectedTask] ?? ROUTES[d.primaryPathId];
  const primary = u.entries.filter(entry => u.answer.primaryStems.includes(entry.stem));
  const output = u.entries.filter(entry => ["食神", "伤官"].includes(entry.tenGod) && entry.presence.startsWith("exposed"));
  const wealth = u.entries.filter(entry => ["正财", "偏财"].includes(entry.tenGod));
  const shownWealth = wealth.filter(entry => entry.presence.startsWith("exposed")), hiddenWealth = wealth.filter(entry => entry.presence === "hidden_only");
  const blockers = d.blockers.filter(item => item.scope === "primary"), rescues = d.rescues.filter(item => item.scope === "primary");
  const adult = story.age?.stage === "adult";
  const workingLife = adult && [null, "employed", "self_employed", "seeking_work"].includes(story.appliedWork);
  const mixedAuthority = working.focus === "rooted_peer_mixed_authority";
  const localRule = (domain: "career" | "wealth" | "relationships", selector: string, selection: string, decision: string,
    support: string[], factRefs: string[], sourceIds: string[] = []): NatalReadingRuleApplication => ({
    ruleId: selector, title: "最终正文的实际选择", decision, support,
    limitations: [NATAL_READING_PROVENANCE_LIMIT, "事实与现代解释分开；没有据此新增职业、收入或婚恋结果。"],
    sourceIds, sourceSubjects: [`chapter-${domain}`], provenance: { version: NATAL_READING_RULE_APPLICATIONS_VERSION,
      producerVersion: CONCRETE_NATAL_PROSE_VERSION, selector, selection, factRefs }
  });
  const domainRules = (domain: "career" | "wealth") => {
    const inherited = c.chapters.find(chapter => chapter.id === domain)?.ruleApplications ?? [];
    const rules = inherited.filter(rule => {
      const selector = rule.provenance.selector;
      if (selector === "selectNatalPatternPath") return true;
      if (selector === "getWorkingBalance") return domain === "wealth" || mixedAuthority;
      if (selector === "evaluateNatalWealthResourceTask") return Boolean(selectedTask) && rule.provenance.selection === selectedTask;
      return domain === "career" && blockers.length > 0 && ["buildNatalPatternDiagnosis.blocker", "buildNatalPatternDiagnosis.rescue"].includes(selector)
        && rule.provenance.selection.startsWith("primary/");
    });
    const selected = mixedAuthority ? working.focus : selectedTask || d.primaryPathId;
    rules.push(localRule(domain, "buildConcreteNatalProse.route", `${domain}/${selected}`,
      `实际采用${selected}的${domain === "career" ? "能力与职责" : "投入与财务"}解释分支；这项记录定位现代正文选择，不把它当古籍原话。`,
      [`主路径：${d.primaryPathId}；相符财印任务：${selectedTask || "未采用"}。`, `当前年龄：${story.age?.stage ?? "unknown"}；身份：${story.appliedWork ?? "unspecified"}。`],
      ["patternDiagnosis.primaryPathId", "patternDiagnosis.wealthResourceTask", "balance.structural.working", "natalLifeStory.age", "natalLifeStory.appliedWork"]));
    rules.push(domain === "career" ? localRule(domain, "buildConcreteNatalProse.primaryRoles", primary.map(entry => entry.id).join("|"),
      "正文只列本次已选主用字及其实际透藏、根与使用条件。", primary.map(entry => `${entry.stem}${entry.tenGod}：${entry.presenceText}。`),
      primary.map(entry => `usefulGuidance.entries.${entry.id}`), unique([...u.answer.sourceIds, ...primary.flatMap(entry => entry.sourceIds)]))
      : localRule(domain, "buildConcreteNatalProse.wealthPresence", shownWealth.length ? "visible" : hiddenWealth.length ? "hidden_only" : "absent",
        "按本盘实际财字透藏区分承接条件，不以财字出现或数量证明收入已经取得。", wealth.filter(entry => entry.presence !== "absent").map(entry => `${entry.stem}${entry.tenGod}：${entry.presenceText}。`),
        wealth.map(entry => `usefulGuidance.entries.${entry.id}`)));
    return structuredClone(rules);
  };
  if (workingLife && route) {
    const headline = mixedAuthority ? "禄劫有根，财生官兼带七杀，发展与权责压力并行" : route.career;
    const meaning = mixedAuthority ? "自身有根，财也有现实作用，但它同时生正官与七杀。事业既有资源与责任的连接，也有不同要求并行的问题；官杀尚未取清，因此不能归成单一、纯粹的仕途或经营优势。" : route.meaning;
    const status = blockers.length ? `本盘已见的限制：${blockers.map(item => item.text).join(" ")}${rescues.length ? `同时保留救应候选：${rescues.map(item => item.text).join(" ")}` : ""}` : "";
    const supports = primary.length ? `实际用字与承接：${availability(primary)}。${u.answer.condition}` : `当前取用：${u.answer.headline}`;
    const careerRules = domainRules("career");
    result.domains.career = { headline, paragraphs: [meaning, supports, status].filter(Boolean), ruleApplications: careerRules, sourceIds: unique(careerRules.flatMap(rule => rule.sourceIds)) };
    const income = mixedAuthority ? "财已透有根，但同时资助官与杀，因此财务资源与责任压力相连。收入机会不能与承担的成本分开，也不能因身势已有结论，就把财官杀同时到来都看成回报增加。" : route.income;
    const financialState = shownWealth.length ? `本盘依据：${distribution(wealth)}。其中${availability(shownWealth)}；财的实际承接还要结合原局合克。`
      : hiddenWealth.length ? `本盘依据：${distribution(hiddenWealth)}，财星藏而未透。${output.length ? `已透${unique(output.map(name)).join("、")}，能力出口较明确；财的承接仍要由相应的现实需求与运年配合带动。` : "当前财的线索保留在藏干层，实际承接仍需对应的能力与现实机会。"}`
        : "本盘依据：所选柱未见财星透藏，当前没有直接财星支点；收入判断更依赖已有能力的作用链，财的具体承接条件尚未形成明确主判。";
    const carrying = working.direction === "support" ? `承载判断为${working.label}，财与食伤带来的事务和消耗须有印比支持。收入渠道增加时，负担也可能同时增加，不能只看财的数量。`
      : working.direction === "drain" ? `承载判断为${working.label}，重点转向食伤、财官能否形成具体出口；自身支持较多与实际收入较高不是同一个结论。`
        : working.direction === "conditional" ? `承载采用${working.label}，用字仍按具体任务取舍；财、官、杀与印的作用不能合成一个统一的收入利好。`
          : `承载采用${working.label}，财务机会的利弊随实际配合变化。${d.primaryPathId === "resource-output" ? "财要接住专业能力带来的回报，同时不能损伤这条能力主线所需的支持。" : "收入能否持续，取决于财的承接与自身负担是否相配。"}`;
    result.domains.wealth = { headline: selectedTask === "wealth_first" || d.primaryPathId === "resource-wealth" ? "财先承担调印任务，收入仍看实际财路与承载"
      : selectedTask === "resource_first" ? "有食伤财的连接，但先稳承载，不能把财重当作收入更好"
        : d.primaryPathId === "resource-output" ? "收入主要看专业报酬，财的承接仍需现实需求带动"
          : shownWealth.length ? "收入通道已有财星支点，回报与所承担的负担相连" : hiddenWealth.length ? "收入沿现有能力形成，财的承接仍需机会带动" : "收入先沿已有能力分析，财的承接主判尚不完整", paragraphs: [income, financialState, carrying],
      ruleApplications: domainRules("wealth"), sourceIds: unique(domainRules("wealth").flatMap(rule => rule.sourceIds)) };
  }
  // A known non-employment setting keeps its age/context-specific living
  // answer. The factual natal conclusions are displayed separately by caller.
  if (adult && c.relationshipFoundation) {
    const relationship = buildNatalRelationshipLifeStory(input), f = c.relationshipFoundation;
    result.sourceVersions.push(...relationship.sourceVersions);
    const day = f.dayPalace, state = relationship.appliedRelationship;
    const palace = f.interactions.filter(item => item.scope === "day_palace"), stars = f.interactions.filter(item => item.scope === "visible_star");
    const joined = palace.some(item => item.fact.relationType === "branch_six_combination"), clashed = palace.some(item => item.fact.relationType === "branch_six_clash");
    const paragraphs = [PALACE_MEANING[day.mainTenGod] ?? "相处方式仍以本盘实际日支角色为准。", `本盘依据：日支${day.branch}为婚恋宫位，本气${day.mainStem}${day.mainTenGod}。`];
    for (const perspective of f.perspectives) {
      const visible = perspective.occurrences.filter(item => item.visibility === "visible");
      const primaryVisible = visible.filter(item => perspective.primaryTenGods.includes(item.tenGod));
      const primaryHidden = perspective.occurrences.filter(item => item.visibility !== "visible" && perspective.primaryTenGods.includes(item.tenGod));
      paragraphs.push(`${perspective.label}：${perspective.summary}${primaryVisible.length ? `主要关系角色${unique(primaryVisible.map(item => `${item.stem}${item.tenGod}`)).join("、")}已透，现实责任与承诺主题较直接。`
        : primaryHidden.length ? `主要关系角色${unique(primaryHidden.map(item => `${item.stem}${item.tenGod}`)).join("、")}只在藏干层，婚恋落实仍要结合后续运年与现实关系基础。`
          : "所选柱未见这一视角的主要角色，婚恋主判更侧重日支及实际关系基础。"}`);
    }
    paragraphs.push(palace.length ? `宫位联系：${palace.map(item => item.text).join("；")}。${state === "separated" ? "在已分开背景下，只对应仍需联系的责任或事务交接，不据合象推复合。"
      : joined && clashed ? "合与冲同时存在，关系联系与生活变化分别保留；不能只挑合说稳定，也不能只挑冲说离散。"
        : clashed ? "婚恋与外部生活节奏之间有调整线索，关系安排较可能受到变化牵动；本命有冲不等于必然分开。"
          : "婚恋与其他生活位置存在联系，感情落实会牵动共同生活和现实责任，比如居住、家庭分担与长期安排。"}`
      : `所选柱之间，日支${day.branch}未见本层记录的六合、六冲。婚恋主判先沿日支角色与关系星读。`);
    if (stars.length) paragraphs.push(`关系星干另有${stars.map(item => item.text).join("；")}。这是明透关系星的互动，不能与夫妻宫合冲混作同一件事，也不能按星的数量推婚姻次数。`);
    const background = state === "single" ? "当前采用你填写的单身背景，以上是婚恋结构，不表示现实已有伴侣。"
      : state === "partnered" || state === "married" ? `当前采用你填写的${state === "married" ? "已婚" : "有伴侣"}背景；本命结构用于理解现有关系的重心，具体变化另看对应年份与月份。`
        : state === "separated" ? "当前采用你填写的分开或分居背景；仍需联系时，只说明实际交接与责任，不预设复合或关系最终结果。"
          : "现实关系状态未填写，以上分别说明星、宫与互动，不补成已经恋爱或结婚的经历。";
    paragraphs.push(background);
    const relationshipRules = structuredClone(f.relationship.ruleApplications ?? []);
    relationshipRules.push(localRule("relationships", "buildConcreteNatalProse.relationship", `${day.mainTenGod}/${state ?? "unspecified"}`,
      "最终关系正文沿日支角色、独立星宫事实及已核现实关系状态组织，不采用事业格局或财运方向。",
      [day.summary, `实际关系状态：${state ?? "unspecified"}。`], [`day:main_hidden:${day.mainStem}`, ...palace.map(item => item.fact.id), ...stars.map(item => item.fact.id)]));
    result.domains.relationships = { headline: state === "separated" ? "婚恋结构按星宫保留，当前只落到分开后的实际联系"
      : joined && clashed ? "夫妻宫合冲并见，联系与变化需要分别判断"
        : clashed ? "夫妻宫有冲，婚恋安排有变化线索"
        : joined ? "感情重相处与共同生活，婚姻落实会牵动长期安排" : "婚恋重心先看日常相处方式与关系星的配合", paragraphs,
      ruleApplications: relationshipRules, sourceIds: unique(relationshipRules.flatMap(rule => rule.sourceIds)) };
  }
  result.sourceVersions = unique([...result.sourceVersions, NATAL_READING_RULE_APPLICATIONS_VERSION]);
  return result;
}
