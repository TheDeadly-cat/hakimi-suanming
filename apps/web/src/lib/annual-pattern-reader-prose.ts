import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { annualLifeActionTheme } from "./annual-life-mainline";
import type { OutlookStemAction } from "./local-outlook-judgment";

export interface AnnualPatternReaderProseInput {
  path: string; task: NatalWealthResourceTask; kind: string;
  visible: OutlookStemAction; hidden: OutlookStemAction;
}
export interface AnnualPatternReaderProse {
  headline: string; main: string;
  careerLead: string; wealthLead: string;
  careerPressure: string; wealthPressure: string;
  explainedActors: OutlookStemAction["visibility"][];
  replacedPressureLines: string[];
}
type Theme = { topic: string; help: string; pressure: string };
type ActorWords = Theme & { positiveTitle: string; negativeTitle: string; neutralTitle: string; pending?: string };
const titles: Record<string, [string, string, string]> = {
  比肩: ["独立承担较能接到实际完成", "个人做法与共同安排相互牵动", "独立承担与自己的完成范围"],
  劫财: ["共同参与较能补到具体完成", "参与增加，分工与原安排仍有拉扯", "共同参与和实际分工"],
  正印: ["指导补上卡点，已有办法接着用", "准备挤压完成，已会做的部分被推后", "学习指导与实际使用的衔接"],
  偏印: ["专项办法补上缺口，原有进度接续", "方法转换牵动已有进度", "专项办法与原有做法的衔接"],
  食神: ["熟悉本领有支点，连续完成较能保持", "连续完成仍受配合牵制", "熟练完成与持续使用"],
  伤官: ["改法进入试用，实际区别得以呈现", "改法与实际采用之间仍有距离", "改法、样例与实际反馈"],
  正财: ["已做部分进入确认，原约定较能接上", "已经做过的部分仍待确认与衔接", "既有成果确认与后续承担"],
  偏财: ["已有本领接到不同用途和新的参与", "新用途牵动原有时间与承担", "不同用途与新的参与安排"],
  正官: ["明确要求与实际完成较能衔接", "要求明确，配套与执行尚未接齐", "明确标准和实际承担"],
  七杀: ["处理难点有配合，集中要求较能接住", "要求集中，原有安排受到挤压", "集中要求与处理先后"]
};
function words(action: OutlookStemAction, input: AnnualPatternReaderProseInput): ActorWords {
  const base = annualLifeActionTheme(action, input), group = strengthTenGodGroup(action.tenGod);
  const [positiveTitle, negativeTitle, neutralTitle] = titles[action.tenGod]!;
  let value: ActorWords = { ...base, positiveTitle, negativeTitle, neutralTitle };
  const moderates = input.path === "resource-wealth" || input.task.task === "wealth_first" && input.task.preferredPathId === input.path;
  const protects = input.task.task === "resource_first" && input.task.preferredPathId === input.path;
  if (input.path === "peer-output-wealth" && group === "resource") value = { ...value,
    help: action.tenGod === "正印" ? "一条说明或示范较能补到原来不会做的一步，原有办法有了实际使用的出口，已经会做的部分可以接着完成"
      : "一项专项解释或不同办法较能补到原来的缺口，已有内容不必全部重做，能用的部分可以继续呈现",
    pressure: action.tenGod === "正印" ? "原本已有能呈现的内容，说明、资料或指导仍在追加，真正做出来或拿给人使用的部分被往后挤"
      : "原来已经展开的做法与新方法来回切换，转换占用了实际完成时间，旧进度停下而新配合尚未接稳" };
  if (moderates && group === "wealth") return { ...value,
    positiveTitle: "减少重复准备，已有积累找到实际用途", negativeTitle: "准备需要取舍，原用途仍牵住调整", neutralTitle: "准备按用途取舍，实际调整尚待落实",
    pending: "本年重点是把已经备下的资料、工具和方法放到具体用途里比较：功能重叠的部分，与完成眼前一步仍离不开的部分，需要分开看。当前只是取舍课题变得具体，尚未判定调整已经顺利落实",
    topic: "已有资料、工具和方法的实际用途",
    help: "已有资料、课程或工具较能按实际用途分清，重复占用收拢后，真正有帮助的部分仍能用于完成眼前事情",
    pressure: "想调整的准备仍被原用途或共同承担牵住，减少重复投入与实际完成还没有接上" };
  if (moderates && group === "resource") value = { ...value,
    negativeTitle: "准备继续加层，实际使用没有同步", neutralTitle: "新增准备与已有用途并行",
    pressure: "资料、指导或新方法又添一层，实际使用并没有同步展开，原本要完成的内容仍被准备占去时间" };
  if (protects && group === "resource") return { ...value,
    positiveTitle: "必要指导补到缺口，已展开的内容接着做", negativeTitle: "必要支持受牵动，已展开内容难以接续", neutralTitle: "已有事情等待具体指导接上",
    pending: "已经展开的内容中，有一部分仍要借助讲解、示范或实际协助才能继续。已有准备要接到这一具体步骤，支持的可用性目前仍待落实",
    topic: "已展开内容所需的指导、时间与帮助",
    help: "一项适用指导或实际协助较能补上原来缺支持的一步，已展开的表达与尝试有了继续完成的办法",
    pressure: "已经展开的内容仍依赖原有指导和帮助，这份支持受到牵连后，继续完成也需要重新接续" };
  if (protects && group === "wealth") return { ...value,
    positiveTitle: "实际用途与必要支持较能并行", negativeTitle: "新用途牵动必要指导，已展开内容仍需支持", neutralTitle: "实际用途与必要支持的分工",
    topic: "新用途与原来仍不可缺少的支持",
    help: "眼前用途较有条件接到必要的准备，原有指导和学习条件不必全部让位",
    pressure: "新的实际用途牵动原来用于理解、指导或准备的条件，想做的内容仍在，所需支持却难以照原安排接上" };
  if (protects && group === "output") value = { ...value,
    negativeTitle: "想继续完成的内容增加，指导与时间尚未跟上",
    pressure: "做或说的范围继续增加，指导、时间和实际帮助却未同步，熟悉的事情也难按原有节奏持续" };
  if (["official-resource", "killings-resource"].includes(input.path)) {
    if (group === "resource") value = { ...value,
      positiveTitle: "指导接到具体步骤，明确要求有了做法", negativeTitle: "原有指导受牵动，既有要求仍待完成", neutralTitle: "执行要求所需的指导与支持",
      help: action.tenGod === "正印" ? "一条说明或示范较能补到具体执行步骤，原来只知道要做什么的地方，开始有了做得到的办法"
        : "一种专项解释或局部办法较能补上执行中的缺口，已有可用步骤不必全部推倒重来",
      pressure: "原来可依循的指导或帮助有了牵连，需要完成的要求仍在，知道该做什么与实际做得到之间还没有接齐" };
    if (group === "wealth") value = action.tenGod === "正财" ? { ...value,
      positiveTitle: "原约定较能确认，继续履行有配套", negativeTitle: "原约定仍待确认，执行支持又受牵动", neutralTitle: "原约定确认与执行配套的衔接",
      topic: "已做部分的确认、继续履行与原有配套",
      pending: "已做部分的说明、完成确认与后续继续承担需要分别衔接，原约定所需的指导和工具仍有自己的用途。确认与配套能接到哪一步，目前尚未定向",
      help: "原约定的确认较能接到已做部分，继续履行所需的工具、时间和具体方法也有配合",
      pressure: "原约定的确认与继续履行牵动原有指导、时间或工具；要求仍在，可用于完成的配套却没有同时接齐"
    } : { ...value,
      positiveTitle: "实际投入较能接到明确承担", negativeTitle: "新用途挤占必要支持，原有要求仍待落实", neutralTitle: "实际投入与职责所需支持的分工",
      topic: "新增用途、明确承担与所需配套",
      help: "投入较有条件用于已经承担的事情，所需工具、时间与具体完成步骤有了连接",
      pressure: "新增用途与原来所需的指导、时间或工具相互牵动，实际投入先展开，必要支持却没有同步，而原有要求仍需要完成" };
    if (group === "output") value = { ...value,
      negativeTitle: "自己的做法与既有配合相遇，完成尚需衔接",
      pressure: "新的表达或做法与原有配合牵在一起，已有要求、必要指导与实际执行尚未同时接齐" };
  }
  if (input.path === "food-killings") {
    if (group === "authority") value = { ...value,
      positiveTitle: "现成办法对上难点，集中要求较能接住", negativeTitle: "要求集中，现成办法也受牵制", neutralTitle: "需要处理的难点与完成先后",
      help: "需要处理的问题较能与已有办法对应，关键步骤得到配合，集中要求有了实际处理的入口",
      pressure: "原来正在处理的事情又碰到另一套要求，期限和难点争用同一份时间与帮助，处理一项容易拖住另一项" };
    if (group === "resource") value = { ...value,
      positiveTitle: "指导补到解法，处理范围较能收拢", negativeTitle: "新指导牵住原有解法，难点仍待处理", neutralTitle: "指导与原有解决步骤的衔接",
      help: "适用的说明或协助较能修正已经展开的做法，让解决步骤回到眼前真正需要处理的地方",
      pressure: "原本处理难点已有熟悉办法，指导或准备的变化又牵动原解决步骤，问题仍在，原先能继续的一步需要重新配合" };
    if (group === "output") value = { ...value,
      positiveTitle: "熟悉办法派上用场，关键难点较能处理", negativeTitle: "解法继续展开，实际难点与支持尚未对上",
      help: action.tenGod === "食神" ? "反复使用过的步骤较能接到需要解决的问题，处理过程有了可以持续的办法" : "一个针对难点的改法较能进入尝试，具体反馈有助于找出原来卡住的一步",
      pressure: "想展开的做法与眼前真正要解决的问题尚未接齐，继续做得更多也仍受实际配合限制" };
    if (group === "wealth") value = { ...value,
      positiveTitle: "实际投入接到解决步骤，关键支持有了用途", negativeTitle: "新增投入牵动解法，原有要求并未减少",
      help: "投入较能接到真正需要处理的一步，让原有方法重新获得实际使用的条件",
      pressure: "新的用途与投入牵动原有解法，同时又连着需要承担的要求，方法、帮助和完成范围尚未同步" };
  }
  return value;
}
function statement(action: OutlookStemAction, theme: ActorWords): string {
  if (action.effect === "assists") return `${theme.help}。`;
  if (action.effect === "obstructs") return `${theme.pressure}。`;
  if (action.effect === "mixed") return `${theme.help}；同时，${theme.pressure}。`;
  return theme.pending ? `${theme.pending}。` : `${theme.topic}是这一段的具体主题，这一项尚未单独判为推进更顺或压力增加。`;
}
const heading = (action: OutlookStemAction, theme: ActorWords) => action.effect === "assists" ? theme.positiveTitle
  : action.effect === "obstructs" ? theme.negativeTitle : action.effect === "mixed" ? `${theme.positiveTitle}，仍有牵制` : theme.neutralTitle;

/** Prose for an existing, validated adult scope. The caller has already selected
 * the path and task; no score, role effect, target relation or life identity is
 * discovered here. Actor evidence remains in the original reading. */
export function buildAnnualPatternReaderProse(input: AnnualPatternReaderProseInput): AnnualPatternReaderProse | null {
  const supported = new Set(["peer-output-wealth", "resource-output", "official-resource", "killings-resource", "food-killings", "resource-wealth"]);
  const special = ["resource_first", "wealth_first", "official_joint"].includes(input.task.task) && input.task.preferredPathId === input.path;
  if (!supported.has(input.path) && !special) return null;
  if (!["work_change", "study", "proposal", "delivery", "settlement", "new_collaboration"].includes(input.kind)) return null;
  const visible = words(input.visible, input), hidden = words(input.hidden, input);
  let headline = heading(input.visible, visible), main = statement(input.visible, visible);
  const explainedActors: OutlookStemAction["visibility"][] = ["visible"];
  const hiddenDirectional = ["assists", "obstructs", "mixed"].includes(input.hidden.effect);
  if (hiddenDirectional) {
    const hiddenStatement = statement(input.hidden, hidden);
    if (hiddenStatement !== main) main += `伴随的${hidden.topic}也有实际作用：${hiddenStatement}`;
    explainedActors.push("main_hidden");
    if (["neutral", "unresolved"].includes(input.visible.effect)) {
      headline = `${visible.neutralTitle}；${heading(input.hidden, hidden)}`;
      main += "后面的配合有自己的助阻，不能据此把前面的事项主题一并判顺。";
    }
  }
  const group = strengthTenGodGroup(input.visible.tenGod), pressure = ["obstructs", "mixed"].includes(input.visible.effect);
  const moderates = input.path === "resource-wealth" || input.task.task === "wealth_first" && special;
  const protects = input.task.task === "resource_first" && special;
  let careerLead = pressure ? "具体事情已展开，卡点落在已有做法与实际配合之间。" : "这一主题落到已有事情的实际完成与回应上。";
  let wealthLead = pressure ? "时间、材料和共同承担受到牵动，原用途与继续投入还没有同步。" : "投入一侧对应已有时间、材料与继续承担的安排。";
  let careerPressure = visible.pressure, wealthPressure = "实际投入与能继续完成的范围没有同步，已用条件与后续承担仍相互牵动";
  if (moderates) {
    careerLead = "做事一侧落在资料、方法的取舍，以及保留下来的支持真正用于完成。";
    wealthLead = "投入一侧落在课程、工具和准备时间的用途：重复占用与必要支持是两部分。";
    wealthPressure = "想调整的时间、材料或工具仍有原用途和共同承担，重复占用还不能自由收拢";
  } else if (protects) {
    careerLead = "已经展开的表达与尝试，仍要有具体指导和帮助才能接着完成。";
    wealthLead = "时间与材料除了服务新的用途，也仍需承担原来不可缺少的学习、指导条件。";
    careerPressure = "新的安排挤占指导与练习，原来已经开始的一步难以接着完成";
    wealthPressure = "新的用途占到原来用于指导、练习的时间和材料，原支持尚不能照旧提供";
  } else if (["official-resource", "killings-resource"].includes(input.path)) {
    careerLead = "需要完成的要求与可获得的方法、指导，是做事时相互依赖的两端。";
    wealthLead = "投入的用途对应已经承担的要求，工具、时间和实际帮助要接到同一步。";
    wealthPressure = input.visible.tenGod === "正财" ? "原费用确认与继续履行共用已有配套，执行所需的时间、工具还没有接齐"
      : "新的使用安排牵动原来用于指导和执行的时间、工具，要求仍在，配套条件却未同步";
    if (input.visible.tenGod === "正财") {
      careerLead = "做过的部分需要说明和确认，继续履行原约定仍依赖具体方法与配套。";
      wealthLead = "原有投入的确认与继续使用分属两步，后续维护仍会用到已有工时和工具。";
    }
  } else if (input.path === "food-killings") {
    careerLead = "做事一侧是把具体办法用到最关键的难点，几项要求的先后会相互影响。";
    wealthLead = "投入一侧连着临时材料、可用时间和协助；它们能否接到解决步骤，比单纯增加投入更关键。";
    wealthPressure = "几项需要占用同一段时间、材料或协助，临时补充一项又牵动原先用于另一项的条件";
  } else if (group === "resource") {
    careerLead = pressure ? "具体表现是说明或准备仍在增加，已有作品、做法却迟迟没有进入实际使用。" : "具体表现是学到或听懂的一步，能够与原来已经会做的内容相接。";
    wealthLead = pressure ? "准备已经占用一部分时间与物品，真正使用的部分没有同步，下一轮补充又来争用。" : "资料与工具的用途需要接到实际使用，而不只停在准备齐全。";
    wealthPressure = "准备所需时间或物品继续增加，实际使用未同步，原来能用于完成的条件也受到占用";
  } else if (group === "peer") {
    careerLead = "个人能独立决定的部分，与别人参与后需要衔接的部分，是不同的完成环节。";
    wealthLead = "投入一侧对应个人使用、共同调用和后续分摊，参与不等于所有条件都能自由共用。";
  } else if (group === "output") {
    careerLead = input.visible.tenGod === "伤官" ? "具体表现落在改法或样例的试用，回应来自实际用过后的区别。" : "具体表现落在熟悉步骤的连续完成，一次做成与下一次还能保持分别看。";
    wealthLead = "试用或反复完成会实际占用材料、时间；当次使用与后续维护各有承担。";
  } else if (group === "wealth") {
    careerLead = input.visible.tenGod === "正财" ? "已完成的事情连着原约定的确认，下一次承担另有自己的范围。" : "已有能力与不同用途相遇，先参与的部分与持续承担并不是同一步。";
    wealthLead = input.visible.tenGod === "正财" ? "已经用过的时间、物品或费用，与后续继续使用和补办的部分分开对应。" : "不同用途会调用已有条件，试用花费与决定长期投入仍有区别。";
  }
  // Neutral/unresolved describes a subject, not a newly successful or failed
  // event. Do not borrow a hidden actor's direction for the visible actor.
  if (["neutral", "unresolved"].includes(input.visible.effect)) {
    careerLead = moderates && group === "wealth" ? "已有几种材料或做法时，本段关注它们用在同一步的重叠，以及其中仍不可替代的部分。"
      : protects && group === "resource" ? "已经能独立做的部分，与仍需一次示范、说明或协助的步骤，构成本段两种不同的进度。"
        : `${visible.topic}，落在实际使用、继续参与与已有安排的衔接上。`;
    wealthLead = moderates ? "材料、工具与准备时间各有占用；用途相近不等于其中一份已经可以停用。"
      : protects ? "用于必要讲解、练习和专用工具的条件，需要与已经能独立完成的部分分开安排。"
        : "投入一侧对应时间、材料和共同承担的具体安排。";
  }
  const replacedPressureLines = [input.visible, input.hidden].filter(action => explainedActors.includes(action.visibility) && ["obstructs", "mixed"].includes(action.effect))
    .map(action => `${action.visibility === "visible" ? `本年${action.stem}${action.tenGod}直接进入的这项` : `年支内${action.stem}${action.tenGod}的配合`}仍有牵制：${annualLifeActionTheme(action, input).pressure}。`);
  return { headline, main, careerLead, wealthLead, careerPressure, wealthPressure, explainedActors, replacedPressureLines };
}

/** Replace only known complete generic endings. The exact condition and subject
 * prefix survive. Different wording stays unchanged; it is never a role parser. */
export function rewriteAnnualPatternScene(original: string, domain: "career" | "wealth", plan: AnnualPatternReaderProse, action: OutlookStemAction): string {
  if (action.effect !== "obstructs") return original;
  const endings = domain === "career" ? ["原配合存在具体牵连，眼前事项不能直接沿原安排继续。"]
    : ["原配合有实际牵连，可调整的投入和继续承担还需接上。", "原有份额与新增需要相互牵动，时间、用品或费用难以照原安排使用。"];
  const suffix = endings.find(value => original.endsWith(value));
  return suffix ? original.slice(0, -suffix.length) + (domain === "career" ? plan.careerPressure : plan.wealthPressure) + "。" : original;
}
