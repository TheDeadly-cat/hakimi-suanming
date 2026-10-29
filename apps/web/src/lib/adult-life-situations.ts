import type { OutlookEffect } from "./local-outlook-judgment";
import type { LocalReadingAgeContext } from "./local-reading-age-context";
import type { ReadingContextWork } from "./local-reading-context";

export const ADULT_LIFE_SITUATIONS_VERSION = "hakimi.adult-life-situations/0.2.0" as const;
export type AdultSituationMechanism = "role" | "resource_moderation" | "resource_protection" | "authority_resource" | "output_to_wealth"
  | "output_overload" | "authority_conflict" | "resource_tie" | "wealth_tie" | "output_tie" | "general_constraint";
export const ADULT_SITUATION_MECHANISMS: readonly AdultSituationMechanism[] = ["role", "resource_moderation", "resource_protection", "authority_resource", "output_to_wealth",
  "output_overload", "authority_conflict", "resource_tie", "wealth_tie", "output_tie", "general_constraint"];
export interface AdultLifeSituationsInput {
  domain: "career" | "wealth"; god: string; effect: OutlookEffect;
  age: LocalReadingAgeContext; appliedWork: ReadingContextWork | null;
  /** A mechanism already identified by the caller's exact actor facts. The
   * helper never discovers a target, parses an effect or changes the judgment. */
  mechanism?: AdultSituationMechanism;
}
export interface AdultLifeSituations {
  title: string; lead: string; examples: string[]; applicability: string[];
}
export type AdultSituationSetting = "employed" | "learning" | "independent";
type Setting = AdultSituationSetting;
export interface AdultLifeSituationDescriptor {
  domain: "career" | "wealth"; setting: AdultSituationSetting; subject: string; fullOriginal: string;
  god: string; effect: OutlookEffect; sourceMechanism: AdultSituationMechanism; templateId: string;
}
type Scene = { subject: string; help: string; pressure: string };
type Role = { title: string; theme: string; settings: [Setting, Setting, Setting?]; scenes: Record<Setting, Scene> };
const scene = (subject: string, help: string, pressure: string): Scene => ({ subject, help, pressure });
const labels: Record<Setting,string> = { employed:"若在职", learning:"若正在求职或进修", independent:"若有自营业务或实际合作" };

const CAREER: Record<string,Role> = {
  比肩:{title:"独立承担与自己的完成方式",theme:"本段重点在自己拿主意、独立完成的部分，以及与他人安排的衔接",settings:["employed","learning"],scenes:{
    employed:scene("自己负责的职责、成果归属与协作接口","自己完成的部分能清楚交给下一位协作者","自己的做法与团队接口不一致，独立完成后仍需返工衔接"),
    learning:scene("独立准备的作品、申请材料或学习计划","自己的成果能清楚呈现给评阅或面谈的人","想独立展开的范围超过现有时间，准备与完成互相挤占"),
    independent:scene("自己能决定的服务范围与合作边界","个人承担和合作方的部分能够分开落实","个人承诺与共同决定彼此牵动，原先能独立安排的部分需要重议")}},
  劫财:{title:"共同参与中的分工与决定权",theme:"多人参与的重点在实际分工、决定权和共同承担",settings:["employed","independent"],scenes:{
    employed:scene("跨团队配合、临时协作与共同成果","不同人的帮助能接到具体完成，分工不只停在讨论","意见和参与者增加，决定与实际执行却分散在不同人手里"),
    learning:scene("小组练习、共同准备或互相介绍线索","共享材料与同伴反馈能补上各自的不足","共同安排占用了原定个人准备时间，彼此进度又没有对上"),
    independent:scene("合作者的参与份额、使用权限与交付分工","各方投入与能够决定的部分较能对应","共同调用与原有份额发生牵连，谁继续承担需要重新商量")}},
  正官:{title:"明确职责、资格与正式确认",theme:"本段围绕已有标准、明确职责、资格材料和正式确认展开",settings:["employed","learning"],scenes:{
    employed:scene("岗位职责、审核要求与工作完成确认","已有要求与可用支持接上，按约完成有了较清楚的路径","标准或职责已经明确，权限、说明和执行支持却没有同步"),
    learning:scene("目标岗位或进修报名的资格、证明与提交要求","现有材料和能力能够对应明确要求","要求已列清，但证明材料或实际准备尚未接齐"),
    independent:scene("服务条款、交付标准与双方确认","双方认可的标准能够落实到实际完成","承诺范围与实际能提供的条件不一致，正式确认仍有反复")}},
  七杀:{title:"集中要求与限时难点的应对",theme:"本段重点在限时要求的先后安排，以及难处所需的实际协助",settings:["employed","learning"],scenes:{
    employed:scene("限时任务、集中审核或需要尽快处理的难点","现成方法和协助能接住最关键的要求","几项要求争用同一段时间，先处理一项又拖住另一项"),
    learning:scene("相近的考试、申请期限或试做要求","已有方法能用于最需要完成的一步","时间较紧而帮助未接上，原准备范围需要重新取舍"),
    independent:scene("集中交付、临时要求与服务排期","可用协助能支持先完成关键部分","新增要求占用原排期，承诺与实际可用条件发生冲突")}},
  正印:{title:"学习指导、资格准备与实际使用",theme:"本段围绕学习指导和必要资料在具体事情中的使用展开",settings:["employed","learning"],scenes:{
    employed:scene("岗位培训、前辈指导或需要补充的专业说明","一条解释或示范补上原来不会做的一步，已有工作能够接着进行","说明、资料和准备继续增加，原本要实际完成的部分被推迟"),
    learning:scene("目标资格、课程理解与申请材料的准备","需要的指导和资料真正补到差距，练习可以继续","课程或材料越补越多，作品、申请或练习却迟迟没有完成"),
    independent:scene("专业进修、服务说明与必要工具的学习","原有经验得到补充，能用于已经约定的服务","新学内容占用已有交付时间，准备与使用之间出现距离")}},
  偏印:{title:"专项方法与原有办法的取舍",theme:"本段重点在专项办法与旧方法的取舍，针对具体缺口尝试补充",settings:["employed","learning"],scenes:{
    employed:scene("专项工具、替代流程或处理特殊问题的方法","局部的新办法补上旧流程的缺口，其余已经可用的部分能够保留","新旧方法来回转换，原进度停下，新办法又尚未接上"),
    learning:scene("针对薄弱环节的专项练习、辅导或不同解法","专项尝试解决具体卡点，不必把全部准备推倒重来","频繁换资料或解法，练习还未形成稳定结果"),
    independent:scene("新工具试用、特殊需求与专业方法调整","有限试用找到了适合的补充办法，原服务仍能延续","新办法还在试用，旧交付却已经受到转换影响")}},
  食神:{title:"熟练完成、作品积累与持续服务",theme:"本段围绕熟练完成、质量延续和可反复使用的成果展开",settings:["employed","independent"],scenes:{
    employed:scene("熟悉工作的连续完成、质量复核与后续交接","熟练方法支持稳定完成，一轮反馈能带到下一轮","增加的完成量超过现有时间和帮助，原本熟悉的节奏也被打断"),
    learning:scene("作品集、练习成果或阶段材料的持续完善","反复练习能留下稳定、可展示的成果","想完成的内容越来越多，修订与实际做完接不上"),
    independent:scene("同类服务、成品交付与持续维护","熟悉做法能够重复使用，质量和后续维护较能接上","重复交付与维护一起增加，原有人手和时间不足以维持频率")}},
  伤官:{title:"提出改法、展示作品与实际试用",theme:"本段重点在提出不同做法、展示样例，以及试用后的具体反馈",settings:["employed","learning","independent"],scenes:{
    employed:scene("流程改进、内部提案或小范围试点","具体改法能够在试点中展示区别，卡住的环节得到反馈","改法说得出来，原标准或配合条件却未接上，试用和正式采用之间有距离"),
    learning:scene("求职作品、面谈表达或课题方案的改进","一个样例能说明自己的解法，反馈可用于下一轮修改","表达展开很多，能实际完成或被接受的部分却有限"),
    independent:scene("服务方案、产品演示或客户样稿","小范围试用能让对方看见改进的具体用途","试用与追加修改不断延伸，正式采用范围仍没有说清")}},
  正财:{title:"已有成果的确认与原约定收尾",theme:"本段重点在已有成果的确认，以及原约定中的费用和后续承担",settings:["employed","independent"],scenes:{
    employed:scene("已完成工作的确认、报销或既定待遇约定","完成记录与原约定较能对应，后续承担可以分开说明","工作已经做过，确认、补充说明与后续承担却反复错开"),
    learning:scene("已提交申请、作品或试做后的具体反馈","对方的回应能把已认可与仍需补充的部分分开","提交之后仍需反复补材料，口头回应尚未形成明确结果"),
    independent:scene("已交付服务的验收、账款核对或续用约定","已有成果和原合同的确认环节较能接上","已发生投入与完成确认不同步，回款或续用仍受实际条件限制")}},
  偏财:{title:"新的需求、参与机会与投入取舍",theme:"本段围绕新需求、短期合作或不同用途展开，涉及与已有安排的取舍",settings:["employed","independent"],scenes:{
    employed:scene("外部伙伴、临时协作或不同业务需要","已有能力有了不同的实际用途，可先从有限参与接上","新需要先占用原有时间，愿意参与与能持续承担之间有差距"),
    learning:scene("新的岗位线索、实践机会或短期试做","已有作品或能力能接到一次具体交流或试做","线索与试做要求增加，实际准备和继续跟进的条件却不足"),
    independent:scene("新客户询问、短期合作或渠道试用","有限试用有助于分清真实需求与可提供的内容","新合作还未确定，试用成本和持续承担已经牵动原安排")}},
};

const resourceScene = (role: string, setting: Setting): Scene => {
  const subjects: Record<string,[string,string,string]> = {
    比肩:["个人可支配的工时、工具与共同使用边界","个人准备时间、学习材料与共用条件","自己承担的成本与共同调用的部分"],
    劫财:["跨团队调用的人手、工具和共同费用","共同准备所需资料、场地或活动支出","合作者的出资、费用分摊与追加权限"],
    正官:["已批准的费用、工具使用和报销手续","报名费用、资格材料与使用条件","合同约定的投入、付款凭据与后续承担"],
    七杀:["集中要求占用的时间、工具与临时协助","相近期限需要的准备时间、材料和往返安排","集中交付所需的投入与原有排期"],
    正印:["培训资料、工具和准备工时的实际用途","课程、资格材料与练习时间的取舍","进修、新工具与现有服务所需的投入"],
    偏印:["专项工具试用与原有设备的并行使用","不同资料、辅导或工具的有限试用","替代工具、新材料与旧服务条件的衔接"],
    食神:["重复完成所需工时、耗材和维护","持续练习的时间、材料与作品整理","连续服务的耗材、维护和返工时间"],
    伤官:["试点占用的人员时间、材料与预算范围","作品试做、资料整理和展示成本","样稿、演示、追加修改和正式采用的费用边界"],
    正财:["已发生费用、报销记录和原待遇约定","已经支付的报名费用、试做成本与后续确认","已交付服务的账款、材料成本与续约投入"],
    偏财:["临时协作需要的费用、工具和时间","新机会所需的交通、材料与试做成本","新渠道或短期合作的试用成本与持续承担"],
  };
  const index = setting === "employed" ? 0 : setting === "learning" ? 1 : 2;
  const detail: Record<string,[string,string]> = {
    正印:["已有资料或工具找到实际用途，必要的准备能支持眼前事项","准备投入继续增加，真正使用的部分没有同步，原条件被占在等待中"],
    偏印:["局部试用分清哪些条件真正适合，其余已有投入可以沿用","新旧工具和材料两头占用，旧的尚不能撤下，新的又需要配套"],
    伤官:["小范围试用能看清材料和时间是否花在有效改进上","试做和修改已经消耗投入，正式采用范围仍未确定"],
    食神:["可重复使用的部分留下来，维护和下一轮投入较能接上","反复消耗与维护一起增加，原条件难以维持既定频率"],
    正财:["已发生投入与确认记录较能对应，剩余承担可以分开","费用或投入已发生，确认和后续承担却没有同步"],
    偏财:["有限投入能够试出实际用途，新的选择不必全部从头准备","新用途先占用现有条件，后续是否继续承担还不清楚"],
  };
  const [help,pressure]=detail[role]??["可用条件较能对应实际承担，个人与共同使用的部分可以分开","原有份额与新增需要相互牵动，时间、用品或费用难以照原安排使用"];
  return scene(subjects[role]![index]!,help,pressure);
};

function mechanismScene(mechanism: AdultSituationMechanism, input: AdultLifeSituationsInput, setting: Setting, base: Scene): Scene {
  const money=input.domain==="wealth";
  const areas:Record<Setting,string>= {employed:money?"已有培训、资料和工具投入":"已有工作中的学习、资料与方法",learning:money?"已有课程、教材和准备时间":"进修或求职准备中的资料、课程与方法",independent:money?"专业进修、工具与服务准备投入":"已有服务中的专业资料、工具与准备"};
  switch(mechanism){
    case "resource_moderation": return scene(`${areas[setting]}中必要与重复部分的取舍`,money?"用途重复的投入较能被区分，真正支持眼前事情的条件仍然保留":"明确用途能收拢准备范围，已有方法得到取舍后更有空间实际完成",money?"想减少重复投入，原用途或共同承担却牵住可调整的部分":"准备仍在加层，或取舍受到其他安排牵动，真正用得上的部分还未顺畅接上");
    case "resource_protection": return scene(`${areas[setting]}中仍不可缺少的支持`,money?"必要资料、练习时间或指导得到保留，已有投入能继续支持实际完成":"适用的指导和帮助补到已经展开的内容，让原来缺支持的一步继续",money?"新增用途或投入占去了必要的学习、指导条件，已有支持不能照旧使用":"展开的要求或实际用途挤占了原来必要的指导与准备，想完成的内容尚缺承接");
    case "authority_resource": return scene(money?"明确职责所需的指导、工具与支持投入":"已经承担的标准、职责与可获得的指导",money?"配套条件较能接到真正需要执行的一步":"说明、方法或实际协助能接到明确要求",money?"承担已经明确，可用的指导、时间或工具却没有同步":"要求还在，必要指导或执行支持未接齐，完成与获得帮助之间有距离");
    case "output_to_wealth": return scene(money?"成果使用所需投入与确认后的持续承担":"作品、改法或熟练成果的实际使用",money?"已形成的成果有明确用途，后续投入较能对应实际使用":"自己的完成结果能够让实际使用者看见价值",money?"成果已见，使用条件或后续投入却没有同步":"已经表达或做出的部分，与别人实际采用和确认之间仍有距离");
    case "output_overload": return scene(money?"继续产出、反复修改所需的时间与材料":"想继续完成的内容与现有支持的承接",money?"持续使用的条件较能对应已经展开的内容":"已有支持能接到正在完成的部分",money?"输出和修改继续消耗投入，时间、材料与帮助尚接不上":"继续做或说的部分超过当前支持能接住的范围，熟悉的事也难按原节奏持续");
    case "authority_conflict": return scene(money?"自己的试用安排与履行既有约定所需的条件":"自己的表达或改法与已有标准的衔接",money?"试用与原约定的投入范围较能分清":"表达和实际做法能够对应原先约定的要求",money?"自己的尝试占用了履行原约定需要的时间或材料":"自己的表达或做法与已有标准对不上，完成方法和约定需要重新配合");
    case "resource_tie": return scene(money?"现有支持的用途与眼前事项之间的牵连":"原有指导或帮助与眼前做法的联系",money?"需要的支持能接到实际用途":"原有指导或协助能够继续用于当前事项",money?"原可使用的材料或帮助另有牵连，不能直接按原安排调用":"原有指导或帮助与眼前做法牵在一起，继续完成不能直接沿原来的配合");
    case "wealth_tie": return scene(money?"已有用品、时间与共同承担的联系":"原定投入与眼前参与安排的联系",money?"共同承担与现有用途较能接上":"原有投入能接到实际完成",money?"新的使用方式牵住原用途，归还、分摊或剩余承担需要重议":"原先留给一件事的时间或条件受到其他安排牵动，原承诺与新参与相遇");
    case "output_tie": return scene(money?"持续完成所需投入与附带要求":"原本会做或想呈现的部分与新配合",money?"可用条件能支持熟悉成果继续使用":"已有本领有条件继续呈现",money?"原能持续使用的条件多了配套或等待，实际所需时间和材料发生变化":"熟悉的活动已经做到可以呈现的地方，又被说明或附带要求牵住");
    case "general_constraint": return scene(base.subject,base.help,money?"原配合有实际牵连，可调整的投入和继续承担还需接上":"原配合存在具体牵连，眼前事项不能直接沿原安排继续");
    default:return base;
  }
}

/** Two or three conditional illustrations for an adult whose occupational
 * setting is not supplied. Explicit identities and mixed-age ranges stay with
 * their existing adapters; callers can invoke this for an adult age segment. */
export function describeAdultLifeSituations(input: AdultLifeSituationsInput): AdultLifeSituationDescriptor[] | null {
  if(input.age.stage!=="adult"||input.age.segments.some(segment=>segment.stage!=="adult")||(input.appliedWork&&input.appliedWork!=="unspecified"))return null;
  const role=CAREER[input.god];if(!role)throw new Error("成年条件情境缺少已知十神。");
  const mechanism=input.mechanism??"role",money=input.domain==="wealth";
  const selected=role.settings.filter((setting):setting is Setting=>Boolean(setting)).map(setting=>({setting,scene:mechanismScene(mechanism,input,setting,money?resourceScene(input.god,setting):role.scenes[setting])}));
  return selected.map(({setting,scene:value})=>{
    const opening=`${labels[setting]}，涉及${value.subject}时`;
    const fullOriginal=input.effect==="assists"?`${opening}，${value.help}。`:input.effect==="obstructs"?`${opening}，${value.pressure}。`
      :input.effect==="mixed"?`${opening}，${value.help}；同时，${value.pressure}。`:`${labels[setting]}，这一项对应${value.subject}。`;
    return {domain:input.domain,setting,subject:value.subject,fullOriginal,god:input.god,effect:input.effect,sourceMechanism:mechanism,
      templateId:`adult-scene/${input.domain}/${input.god}/${mechanism}/${setting}`};
  });
}
export function buildAdultLifeSituations(input: AdultLifeSituationsInput): AdultLifeSituations | null {
  const descriptors=describeAdultLifeSituations(input);if(!descriptors)return null;
  const role=CAREER[input.god]!,mechanism=input.mechanism??"role",money=input.domain==="wealth",examples=descriptors.map(value=>value.fullOriginal);
  const special:Partial<Record<AdultSituationMechanism,[string,string]>>={resource_moderation:["已有积累与必要投入的取舍","本段重点在减少重复准备，让已有积累服务实际用途，同时保留必要支持"],resource_protection:["必要支持与实际用途的分工","本段重点在保留仍不可缺少的指导、方法与准备，避免新的用途挤占这些支持"],authority_resource:["明确要求与实际支持的衔接","明确要求与实际帮助是本段的主线，重点在指导、工具和协助与职责的配套"],output_overload:["完成范围与可用支持的对应","继续完成的范围与实际可用支持是本段重点，涉及时间、材料和帮助的负荷"],authority_conflict:["自己的做法与既有要求的配合","本段围绕自己的表达、尝试与既有标准之间的配合和冲突展开"],resource_tie:["原有指导与眼前事项的牵连","本段重点在原有指导、帮助与眼前做法相互牵动时的实际可用范围"],wealth_tie:["原定投入与新的参与安排","本段重点在原有投入与新参与安排的牵连，包括既定用途和共同承担"],output_tie:["原有呈现与新增配合的联系","本段围绕熟悉成果的继续呈现，以及随之增加的说明和附带要求展开"],general_constraint:["现有安排中的具体牵连",role.theme]};
  const wealthThemes: Record<string,string> = {
    比肩:"本段重点在个人可用的时间、工具，以及共同使用的边界",劫财:"本段重点在共同投入的分摊，以及追加使用的决定权",
    正官:"本段围绕原定投入、实际使用和确认手续展开",七杀:"本段重点在集中要求对有限时间、工具和协助的占用",
    正印:"本段重点在已有资料、课程和准备时间的实际用途",偏印:"本段围绕专项工具与旧有条件的取舍、并行和替换展开",
    食神:"本段重点在重复完成所需的耗材、维护与时间",伤官:"本段围绕改法试用需要的材料、费用和共同时间展开",
    正财:"本段重点在已发生投入的确认，以及后续费用和承担的划分",偏财:"本段重点在新用途的试用投入，以及可以继续沿用的已有条件"
  };
  const specialWealth: Partial<Record<AdultSituationMechanism,[string,string]>> = {
    resource_moderation:["重复投入的取舍与必要支持的保留","本段重点在课程、资料和工具的重复投入与必要用途之间的取舍"],
    resource_protection:["必要投入与新用途之间的分工","本段重点在新用途与原有准备之间的分配，必要的指导和练习时间仍需保留"],
    authority_resource:["明确承担所需的配套投入","本段围绕明确职责所需的指导、工具和可用时间展开"],
    output_overload:["连续产出的消耗与可用帮助","本段重点在持续完成、反复修改对时间、材料与协助的消耗"],
    authority_conflict:["试用投入与原约定的相互占用","本段重点在个人尝试与履行既有约定所需条件之间的相互占用"],
    resource_tie:["原有支持的使用受其他安排牵动","本段重点在资料、工具或协助受到其他安排牵动后的使用范围"],
    wealth_tie:["既有投入与共同使用的牵连","本段围绕原定用途、共同分摊与后续承担之间的牵连展开"],
    output_tie:["持续使用与附带投入的联系","本段重点在成果继续使用所需的等待、维护和附带投入"]
  };
  const chosen=money?specialWealth[mechanism]:mechanism==="general_constraint"?undefined:special[mechanism];
  const wealthTitles: Record<string,string> = {比肩:"个人投入与共同使用的边界",劫财:"共同费用、使用份额与追加权限",正官:"原定投入与确认手续",七杀:"集中要求占用的时间与条件",正印:"准备投入与实际用途",偏印:"专项工具与原有条件的取舍",食神:"重复完成所需的消耗与维护",伤官:"试用改法所需的材料与时间",正财:"已有投入的确认与后续承担",偏财:"新用途的试用投入与持续承担"};
  const resourceTitle=wealthTitles[input.god]!;
  const title=chosen?.[0]??(money?resourceTitle:role.title);
  return {title,lead:`${chosen?.[1]??(money?wealthThemes[input.god]:role.theme)}。`,examples,
    applicability:["现实背景未填写；在职、求职进修、自营合作只是条件情境，只对照自己实际已有的身份和事项，不据例子认定已经就业或取得收入。",
      ...(input.effect==="neutral"||input.effect==="unresolved"?["这些例子只说明对应的生活主题，不单独判断推进顺利或吃力。"]:[])]};
}
