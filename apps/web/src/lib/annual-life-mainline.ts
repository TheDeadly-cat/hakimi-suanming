import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import type { OutlookStemAction, OutlookJudgmentLabel } from "./local-outlook-judgment";
import type { LocalReadingAgeContext } from "./local-reading-age-context";
import type { ReadingContextWork } from "./local-reading-context";
import { actionTheme } from "./local-life-stage-years";

type Scope = { path: string; task: NatalWealthResourceTask };
type Theme = ReturnType<typeof actionTheme>;
const moderates = ({ path, task }: Scope) => path === "resource-wealth" || (task.task === "wealth_first" && task.preferredPathId === path);
const protects = ({ path, task }: Scope) => task.task === "resource_first" && task.preferredPathId === path;

/** The role and direction are already calculated. These words describe the
 * selected task, not another classifier, root measurement or inferred target. */
export function annualLifeActionTheme(action: OutlookStemAction, scope: Scope): Theme {
  const base = actionTheme(action), group = strengthTenGodGroup(action.tenGod);
  if (moderates(scope)) {
    if (group === "wealth") return { topic: "按实际用途筛选准备、保留必要支持", help: "实际用途较能帮助收拢重复准备，必要的资料、方法和帮助仍然保留", pressure: "想调整的准备与已有用途或承担仍有牵连，减少重复占用的条件还没接齐" };
    if (group === "resource") return { ...base, help: "原有积累中真正适用的部分较有条件接到当前需要", pressure: "准备又添一层，资料或方法变多，真正用起来的部分却未必同步增加" };
    if (group === "peer") return { ...base, help: "参与者较有条件分清哪些准备可以共用、哪些仍须各自保留", pressure: "共同使用与个人决定牵动既有投入，原来可以调整的准备仍有别的承担" };
  }
  if (protects(scope)) {
    if (group === "resource") return { ...base, help: "必要的指导、理解与帮助较有条件接到已经展开的内容", pressure: "已经展开的内容仍依赖原有指导与帮助，这份支持受到牵连时，继续完成也会受影响" };
    if (group === "wealth") return { topic: "实际用途与必要支持的并行分工", help: "实际用途较有条件与必要支持相接，已有准备不必全部让位", pressure: "新增用途与原来需要的指导、准备争用条件，已经展开的内容仍缺少承接" };
    if (group === "output") return { ...base, help: "已有指导较能接住表达和完成，做出的部分能够得到持续支持", pressure: "继续做或说的部分增加，现有指导、时间与帮助却未同步，熟悉的事也未必能按原节奏持续" };
  }
  if (scope.path === "official-wealth" && group === "output") return { ...base,
    pressure: "自己的表达与既有要求容易相互牵动，想按自己的方式完成，也会碰到不同的完成标准" };
  if (scope.path === "resource-output") {
    if (action.tenGod === "伤官") return { ...base, help: "已经理解的内容较能变成可试用的改法，让别人看见实际区别" };
    if (action.tenGod === "食神") return { ...base, help: "已有理解较能变成熟练步骤，形成稳定、可使用的成果" };
    if (action.tenGod === "正财") return { ...base, help: "已有成果较能接到原约定的确认与回应，已完成和后续承担可以分开" };
    if (action.tenGod === "偏财") return { ...base, help: "已有成果较能接上不同用途或新的参与，试用范围与持续承担开始有具体落点" };
  }
  if ((scope.path === "official-resource" || scope.path === "killings-resource") && group === "resource") {
    return { ...base, help: "说明、方法或实际协助较能接到明确要求，让知道该做什么与实际做得到相接" };
  }
  return base;
}

function adultSetting(work: ReadingContextWork | null): string {
  return work === "employed" ? "已有工作与协作" : work === "self_employed" ? "已有服务和实际合作"
    : work === "seeking_work" ? "申请准备与试做" : work === "student" ? "课程、作品与自主练习"
      : work === "caregiving" ? "照料日程与共同承担" : work === "retired" ? "自愿活动与已有生活安排"
        : "学习、做事与共同安排";
}

type Answer = { headline: string; scene: string };
function actionAnswer(action: OutlookStemAction, scope: Scope): Answer {
  const god=action.tenGod, group=strengthTenGodGroup(god), effect=action.effect;
  const themes: Record<string, [Answer, Answer, Answer]> = {
    正印: [{headline:"新理解补到卡点，已有事情接着做",scene:"一条说明或示范补上原来不会做的一步，已有安排得到继续尝试的办法"},
      {headline:"准备增多，实际完成容易被推后",scene:"已经有能呈现的部分，说明、资料或修改仍继续增加，原本要拿出来用的内容容易往后挪"},
      {headline:"新的指导与准备进入日程",scene:"本段涉及补充说明、理解方法和实际使用之间的衔接，准备进入日程本身尚不表示已经起效"}],
    偏印: [{headline:"专项办法补上缺口，原有进度得以接续",scene:"一种不同的解释或局部办法补上原方法的缺口，其他已经会做的部分可以接着使用"},
      {headline:"方法转换牵动已有进度",scene:"新的办法与原先做法相互牵动，原来能继续的一步需要重新配合，转换所需的时间也进入安排"},
      {headline:"专项尝试与原办法的衔接成为主题",scene:"不同资料、解释或专项办法进入考虑，哪些适用、哪些仍需保留当前尚未单独定向"}],
    食神: [{headline:"熟悉本领得到发挥，连续完成有支点",scene:"反复用过的方法较能保持质量，一次做过的内容可以接到下一次使用，而不只停在零散尝试"},
      {headline:"持续完成遇到牵制，原有节奏需调整",scene:"原本熟悉的事情继续展开时，实际配合或可用支持尚未同步，原定完成节奏容易被打断"},
      {headline:"连续完成与熟悉节奏成为主题",scene:"本段更贴近已有练习、作品或重复完成的事情，持续做下去的条件尚未单独定向"}],
    伤官: [{headline:"改法有试用空间，实际区别更容易呈现",scene:"一个改法、样例或不同做法较能进入小范围试用，具体回应让人看见它与原做法的区别"},
      {headline:"表达与实际配合脱节，改法难直接落地",scene:"想法能够说出来，实际采用或完成条件却没有同步，提出改法和真正用起来成为两步"},
      {headline:"表达改法与实际尝试成为主题",scene:"本段涉及自己的解释、作品或不同做法，能否被采用仍取决于原有配合，尚未单独定顺"}],
    正财: [{headline:"已有付出进入确认，原约定与后续承担分开",scene:"已经做过的部分较能得到原约定中的回应，确认哪些已经完成、哪些仍要继续承担成为具体进展"},
      {headline:"已经付出，确认与后续承担仍有牵连",scene:"已经做过的内容还需补充说明或等待确认，原有投入与下一步承担暂未同步"},
      {headline:"已有成果的确认与收尾成为主题",scene:"本段侧重已有投入和原约定的确认，实际回应尚未单独定向，不把付出直接等同已经兑现"}],
    偏财: [{headline:"已有本领接上新用途，有限参与有空间",scene:"已有成果或能力较能接到不同需要，新的尝试先从实际能提供的部分展开，持续承担仍需另看"},
      {headline:"新的参与占用原有条件，投入需重新配合",scene:"新的需要与原来安排争用时间、用品或协助，愿意参与和能持续承担之间仍有距离"},
      {headline:"新的用途与参与选择成为主题",scene:"本段涉及新用途、临时合作或不同参与方式，当前尚不据此断定机会有利或投入有回报"}],
    比肩: [{headline:"独立承担得到支持，各自成果较能衔接",scene:"自己负责的部分较有条件完成，再与其他人的安排接上，个人方法和共同结果可以各自看清"},
      {headline:"各自安排互相牵动，独立完成也需重接",scene:"原本各自能决定的部分遇到共同安排，完成之后的接口或使用范围仍需重新协调"},
      {headline:"独立承担与分工是主题",scene:"自己负责哪一部分、哪些仍需共同决定是这段的具体题目，这项本身尚未单独定顺"}],
    劫财: [{headline:"共同参与有配合，分工较能落到完成",scene:"不同人的参与较能接到具体完成，投入与决定的部分有条件分开落实"},
      {headline:"共同使用与决定权牵动原安排",scene:"参与者或共同调用改变后，原有时间、使用份额和继续承担尚未接齐"},
      {headline:"共同参与与使用份额是主题",scene:"本段重点是共同投入、调用权限和各自承担，这项本身尚未单独定顺，不凭参与人数推合作有利"}],
    正官: [{headline:"明确要求得到配合，按约完成有支点",scene:"已有要求与实际能力、支持较能接上，承诺中的一部分可以落实为可确认的完成"},
      {headline:"要求与支持不同步，责任落实仍有卡点",scene:"需要完成的标准已经进入安排，可用权限、说明或帮助却未同步，答应与做得到之间仍有距离"},
      {headline:"明确标准与持续责任是主题",scene:"本段涉及按约完成和确认职责，原要求已被列入主题，但当前不据角色名称单独定好坏"}],
    七杀: [{headline:"集中要求有可用办法，难点较能分步处理",scene:"熟悉方法或实际帮助较能接到最需要完成的一步，集中要求得到可用的处理支点"},
      {headline:"几项要求争用支持，承担容易相互挤压",scene:"几项需要回应的内容相近，可用时间和协助没有同步，先处理一项又可能拖住另一项"},
      {headline:"集中要求与处理先后是主题",scene:"本段涉及相近要求与实际承担范围，目前尚未单独判为压力增加或处理更顺"}]
  };
  let [help,pressure,neutral]=themes[god]!;
  if(moderates(scope)){
    if(group==="wealth"){
      help={headline:"减少重复准备，让已有积累真正用起来",scene:"明确用途较能帮助筛选已有资料、工具和方法，重复占用可以收拢，必要的支持仍然保留"};
      pressure={headline:"已有积累需要取舍，可调整的部分仍受牵连",scene:"实际用途已经进入考虑，原有承担却牵住可调整的准备，减少重复投入还不能直接转成顺畅完成"};
      neutral={headline:"已有积累需要取舍，裁印条件尚未落实",scene:"当前具体课题是留下必要支持、收拢重复准备；这项取舍尚未单独定向，不能先当作已经有效"};
    }else if(group==="resource"){
      pressure={headline:"准备继续加层，真正使用的部分被挤住",scene:"资料、指导或方法又添一层，原来要拿出来用的部分没有同步增加，准备与完成之间的距离更值得留意"};
      neutral={headline:"准备又有新内容，实际用途仍待衔接",scene:"新增积累进入原有准备，但哪些确有用途、哪些只是重复占用，目前仍保留具体条件"};
    }
  }
  if(protects(scope)){
    if(group==="resource"){
      help={headline:"必要支持接到缺口，已展开的内容有了承接",scene:"适用指导或帮助较能补到已经展开的内容，原来缺少支持的一步可以继续"};
      pressure={headline:"必要支持受到牵连，想完成的内容仍缺承接",scene:"已经展开的表达或实际用途仍需要原有指导，这份支持受牵动后，继续完成也需要重新接续"};
    }else if(group==="wealth"){
      help={headline:"实际用途与必要支持较能并行",scene:"眼前用途有条件接到必要准备，原有指导与学习条件不必全部让位"};
      pressure={headline:"新用途挤占必要支持，已有内容难持续完成",scene:"新的实际需要占用了原来用于理解、指导或准备的条件，要做的内容仍在，所需支持却没有同步"};
    }else if(group==="output")pressure={headline:"继续产出的范围超过支持，熟悉节奏也受影响",scene:"想继续做或说的部分增加，时间、指导与实际帮助仍未接齐，熟悉的事也未必能按原节奏持续"};
    if(group==="resource"||group==="wealth")neutral={headline:"必要支持与实际用途并列，作用仍待条件落实",scene:"已经展开的内容依赖哪些帮助、哪些支持不可撤去，是当前明确的课题，效果尚未单独定向"};
  }
  if(scope.path==="official-wealth"&&group==="output")pressure={headline:"自己的做法碰到既有要求，完成标准需要重新对齐",scene:"自己的表达或熟悉做法与原来约定的要求相遇，完成方法和共同标准尚未接齐，争取按自己方式做与按约完成成为两步"};
  if(["official-resource","killings-resource"].includes(scope.path)&&group==="resource"){
    help={headline:"指导接到明确要求，责任有了可用做法",scene:"原来只知道要完成什么，说明或帮助较能补到具体步骤，理解要求与实际做到有了连接"};
    pressure={headline:"原有指导受牵连，承担与可用支持尚未接齐",scene:"要求仍需要完成，原来可依循的支持却有具体牵连，知道该做什么与实际能做到仍有距离"};
  }
  if(scope.path==="food-killings"&&group==="resource")pressure={headline:"新指导牵动原有解法，处理难点需重新衔接",scene:"原来处理难点已有熟悉方法，新的指导或准备介入后，问题仍需完成，原解决步骤受到牵动"};
  if(effect==="assists")return help;if(effect==="obstructs")return pressure;
  if(effect==="mixed")return {headline:`${help.headline}，仍有牵制`,scene:`${help.scene}；同时，${pressure.scene}`};
  return neutral;
}

export function buildAnnualLifeMainline(input: Scope & {
  kind: string; visible: OutlookStemAction; hidden: OutlookStemAction;
  age: LocalReadingAgeContext; label: OutlookJudgmentLabel; work: ReadingContextWork | null;
}): { headline: string; text: string; explainedActors: ("visible" | "main_hidden")[] } {
  const {visible,hidden,age}=input, answer=actionAnswer(visible,input), hiddenAnswer=actionAnswer(hidden,input);
  const stages=age.segments.length?age.segments:[{stage:age.stage,label:age.label,startAge:age.startAge}];
  const child=age.stage==="young_child"||age.stage==="youth";
  const setting=age.stage==="adult"?adultSetting(input.work):age.stage==="young_child"?"游戏、表达与熟悉小步骤"
    :child&&age.startAge!==null&&age.startAge<12?"小作品、练习与日常参与":child?"兴趣作品、自主练习与同伴活动":"已有参与和自主安排";
  const neutral=["neutral","unresolved"].includes(visible.effect), hiddenDirectional=!["neutral","unresolved"].includes(hidden.effect);
  const explainedActors: ("visible"|"main_hidden")[]=["visible"];
  let headline=answer.headline, text=`${setting}中，${answer.scene}。`;
  if(neutral&&hiddenDirectional){
    headline=`${answer.headline.replace(/(?:是|成为)主题$/u,"")}；${hiddenAnswer.headline}`;
    text+=`年支内的${hidden.stem}${hidden.tenGod}是另一项具体配合：${hiddenAnswer.scene}。`;
    explainedActors.push("main_hidden");
  }
  if(input.label==="条件性"&&["assists","mixed"].includes(visible.effect))text+="这项进展仍需要原有承接与配合条件落实，不能扩大为所有事情都顺。";
  else if(["利弊并见","有压力"].includes(input.label)&&visible.effect==="assists")text+="单项有发挥空间，整段仍有另一面的牵制，下面分开说明。";
  if(age.stage==="adult_transition"||new Set(stages.map(stage=>stage.stage)).size>1)text+=stages.map(stage=>`${stage.label}部分${stage.stage==="young_child"?"落在游戏、熟悉小步骤与照料回应":stage.stage==="youth"?"落在动手练习、兴趣作品和同伴参与":"落在实际已有的日常参与与自主安排，成年本身不代表已经就业"}。`).join("");
  return {headline,text,explainedActors};
}

export function annualLifeCoordination(scope: Scope): string | null {
  if (moderates(scope)) return "做事与投入在这里是一条线：实际完成的内容，对应仍需保留的资料、方法和帮助。能收拢的是重复准备，必要支持仍要留下；若取舍受其他安排牵住，缩减投入也不会自动让事情顺畅。";
  if (protects(scope)) return "表达与实际用途已经展开，时间和投入还需给必要指导留位置。做事一侧依赖现有帮助接住已展开的内容，投入一侧则涉及这些支持的持续使用；不能把抽走准备直接理解为提高效率。";
  if (scope.task.task === "official_joint" && scope.task.preferredPathId === scope.path) return "明确要求、实际投入和可用指导各有分工：投入服务正在承担的事，指导帮助把要求落实。两项在原局各有位置，不代表新增安排也可以自动沿用相同配合，具体牵连仍按本段原判断保留。";
  return null;
}
