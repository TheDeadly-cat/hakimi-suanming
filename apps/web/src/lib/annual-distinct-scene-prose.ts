import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { ADULT_SITUATION_MECHANISMS, describeAdultLifeSituations, type AdultSituationMechanism, type AdultSituationSetting } from "./adult-life-situations";
import type { AnnualEventReadingProseKind } from "./annual-event-reading-prose";
import type { LocalReadingAgeContext } from "./local-reading-age-context";
import type { OutlookStemAction } from "./local-outlook-judgment";

export const ANNUAL_DISTINCT_SCENE_PROSE_VERSION = "hakimi.annual-distinct-scene-prose/0.2.0" as const;
export interface AnnualDistinctSceneProseInput {
  original: string; kind: Exclude<AnnualEventReadingProseKind, "shared_arrangements">;
  domain: "career" | "wealth"; path: string; task: NatalWealthResourceTask;
  visible: OutlookStemAction; hidden: OutlookStemAction; age: LocalReadingAgeContext;
}
export interface AnnualDistinctSceneProse {
  version: typeof ANNUAL_DISTINCT_SCENE_PROSE_VERSION;
  text: string; original: string; templateIds: string[];
  setting: AdultSituationSetting; sourceMechanisms: AdultSituationMechanism[];
}
type Words = { help: string; pressure: string; topic: string; pending?: string };
type Settings = Record<AdultSituationSetting, Words>;
const words = (help: string, pressure: string, topic: string): Words => ({ help, pressure, topic });
const labels: Record<AdultSituationSetting, string> = { employed: "若在职", learning: "若正在求职或进修", independent: "若有自营业务或实际合作" };
const kindFor = (god: string): AnnualDistinctSceneProseInput["kind"] => god === "正印" || god === "偏印" ? "study" : god === "伤官" ? "proposal" : god === "食神" ? "delivery" : god === "正财" ? "settlement" : god === "偏财" ? "new_collaboration" : "work_change";

function ordinary(input: AnnualDistinctSceneProseInput, setting: AdultSituationSetting): Words {
  const money = input.domain === "wealth", special = input.visible.tenGod === "偏印";
  let values: Settings;
  switch (input.kind) {
    case "study":
      values = money ? {
        employed: words(special ? "专项工具或局部做法较能补到原流程的缺口，原有设备与工时仍可继续使用" : "培训资料或已有工具较能用到手头的一步，准备工时开始对应实际操作", special ? "新旧工具两头占用，切换所需的工时增加，旧配套还不能马上停用" : "培训和说明继续占用工时，真正试做或使用工具的时间被压缩", "资料、培训工时与实际操作时间的分配"),
        learning: words(special ? "一项专项材料较能补上原练法的缺口，不必把已有准备全部换掉" : "已有课程材料较能解决某个练习难点，阅读和动手不再各占一头", special ? "新教材或新练法与旧材料并行，重新熟悉占去原定练习时间" : "课程、教材不断加入，原来留给练习或作品的时间又被补材料占去", "课程材料、专项工具与练习时间各自的用途"),
        independent: words(special ? "一项专用工具或不同办法较能补上原服务的缺口，旧配套继续承担其余部分" : "已有工具与专业指导较能用于一次实际服务，准备投入有了具体落点", special ? "新工具尚未接稳、旧工具仍要维持，两套准备占用同一批时间和材料" : "服务说明与准备材料继续加层，工具已备好，实际服务却还在等待配套", "专业准备、工具使用与原服务所需条件的分配")
      } : {
        employed: words(special ? "局部的新办法较能补上旧流程的缺口，已经会做的步骤可以接着完成" : "一份说明或一次示范较能补上原来卡住的操作，手头已有的内容可以继续做", special ? "新旧操作来回切换，旧进度先停下，新方法又尚未形成稳定步骤" : "培训和说明一轮轮补充，已经会做的一步却迟迟没有进入试做或使用", "新说明或专项办法与手头操作的衔接"),
        learning: words(special ? "另一种解法较能补到原练法讲不清的一点，已有作品或练习可以局部完善" : "讲解较能补到明确的薄弱环节，练习、作品或申请材料中的那一部分有了继续完善的办法", special ? "换材料、换练法打断原有进度，新的方法还没熟悉，旧的一部分又被搁下" : "资料越来越齐，练习、作品或申请仍停在修改中，动手展示的时间被继续补课和补材料占去", "理解材料、完成练习与呈现已有能力的衔接"),
        independent: words(special ? "一种专项做法较能解决原服务中的局部难题，其余成熟步骤无需全部重做" : "一项专业说明较能接到原服务的具体步骤，准备过的内容开始进入实际使用", special ? "更换工具或服务方法时，旧交付暂缓，新方法所需配合又没有接齐" : "说明、样本与准备要求不断加上来，原计划提供的服务还在等最后一轮说明", "专业方法与实际服务步骤之间的衔接")
      }; break;
    case "proposal":
      values = money ? {
        employed: words("小范围试用较能显出材料、协作工时各花在哪里，继续采用有了实际用量可参照", "样品、演示和修改反复调用同一批材料与工时，试用范围迟迟没有收拢", "样品耗材、协作时间与正式采用后的持续投入"),
        learning: words("一个小样较能显出已有材料够做哪一部分，下一轮练习有了更具体的准备范围", "不同版本反复制作，材料和练习时间用在重来，能展示的部分尚未增加", "试做材料、修改时间与完整作品所需投入"),
        independent: words("有限试用较能显出人工、工具和材料的真实用途，试样与持续服务的承担更容易区分", "试样不断追加、正式使用范围却仍在变化，原本有限的试用投入被持续占用", "试样成本、对方提供的条件与持续服务的投入")
      } : {
        employed: words("改法较能进入一次小范围试用，使用者能指出哪一步更省事、哪一步仍需修改", "演示已经讲清，原流程或接受标准却没有同步，方案停在讨论与正式采用之间", "改法演示、小范围试用与正式采用的不同环节"),
        learning: words("样例或作品较能让别人看见具体能力，反馈指向某一处修改，而不只评价想法", "想法已有雏形，作品却反复改动，实际展示迟迟未跟上材料里的说明", "作品样例、练习反馈与能够实际展示的部分"),
        independent: words("一个有限试样较能让合作方看见新旧做法的差别，实际需求随试用变得具体", "对方关注改法，试用条件或正式采用范围却没有接齐，讨论增加而实际使用停着", "试样反馈、实际需求与正式采用范围")
      }; break;
    case "delivery":
      values = money ? {
        employed: words("重复使用较能显出固定耗材和维护工时，下一轮安排有了实际依据", "重复工作不断占用耗材或维护时间，原配套难以支持同样频率", "经常使用的耗材、工具维护与重复工作的工时"),
        learning: words("持续练习较能用好已有材料，常用部分和偶尔补充的部分更清楚", "重复练习消耗时间和材料，必要的休整或帮助没有同步，下一次难照原节奏继续", "连续练习所需的材料、时间与实际帮助"),
        independent: words("连续提供相近服务较能显出稳定用量，耗材、维护与后续服务各有对应", "重复服务继续占用工具和人工，上一轮维护尚未完成，下一轮又需要同一套条件", "稳定服务所需耗材、维护与后续承担")
      } : {
        employed: words("熟悉方法较能保持连续完成，交给下一环节的内容更稳定，临时说明也有具体过程可依", "熟悉工作仍被配合变化打断，完成一轮以后，下一轮不能直接沿原步骤继续", "熟悉步骤、连续完成和交接质量"),
        learning: words("反复练过的部分较能独立完成，作品或练习能连续保持同一标准", "练习或作品继续增加，但具体反馈与帮助没有接上，熟悉部分也出现反复", "熟练步骤、反复练习与持续呈现的质量"),
        independent: words("成熟做法较能稳定提供相近服务，质量来自连续完成，而非每次重新说明", "原有做法仍在，需求或配合却发生变化，同类服务难按原节奏持续", "成熟方法、服务的一致性与继续使用")
      }; break;
    case "settlement":
      values = money ? {
        employed: words("已发生的投入较能按原约定确认，补办报销或后续使用与新的追加事项可以分别处理", "已用工时、材料或费用仍等待确认，后续追加又混入原来的承担", "原定费用、已用条件与后续追加的区分"),
        learning: words("已使用的课程或活动条件较能得到确认，下一步材料与时间另有具体安排", "已经用过的材料或活动费用仍需说明，新的准备又占用原有时间", "已使用的学习条件、原约定与下一步准备"),
        independent: words("已有服务投入较能与原约定对应，已完成部分的结算和继续维护更容易分开", "已交部分与原费用承担尚未对齐，续用或维护的要求又叠进来", "已有服务的费用确认、原约定与后续维护")
      } : {
        employed: words("已完成工作较能得到原约定的回应，补充说明集中在尚未确认的部分，下一项职责另行衔接", "事情已经做过，认可标准或补充说明仍在反复，完成与被确认之间留着空档", "已完成工作、原约定认可与下一次承担"),
        learning: words("已交作品或已有准备较能得到具体反馈，已完成与还需补充的部分分得更清楚", "作品或材料已有结果，反馈却仍要求补充，结束这一阶段的边界尚未清楚", "已有作品或材料的反馈、完成确认与补充范围"),
        independent: words("已有交付较能进入验收或续用确认，原约定完成到哪里与下一轮服务分开落实", "已有交付仍在补充说明，续用要求又加入讨论，旧约定与新承担难以分开", "原交付的确认、续用约定与下一轮服务")
      }; break;
    case "new_collaboration":
      values = money ? {
        employed: words("有限协作较能显出共用工具和临时工时的用途，额外调用与原职责投入得以区分", "临时用途先占用工具和时间，原任务仍要继续，两边争用同一套条件", "临时协作调用的条件与原任务所需投入"),
        learning: words("一次实际参与较能检验已有材料或技能的用途，后续是否继续有了具体体验", "新的尝试调用了原定练习时间，已有材料同时服务几种用途，安排难以接齐", "新尝试的材料、参与时间与原学习安排"),
        independent: words("有限试用较能显出新用途要多少工具和时间，先试一部分与长期投入可以分开", "试用不断调用原服务的材料与工具，新的用途还没稳定，持续投入已经互相牵动", "试用成本、原有配套与持续参与的承担")
      } : {
        employed: words("临时协作较能用到已有本领，接触不同需要后，自己能参与的部分更具体", "外部协作需要进入原工作安排，接口与完成范围尚未接齐，原有进度受到牵动", "临时协作、不同业务需要与原有分工"),
        learning: words("一次真实尝试较能让已有能力接到不同用途，参与后的反馈比单看介绍更具体", "新的参与机会与原准备相互牵动，试了一部分，持续参与的时间或帮助却没接上", "新的尝试、已有能力与继续参与的条件"),
        independent: words("有限合作较能分清新需求与已有服务的匹配处，先试的部分与长期承担有了区别", "新用途需要接入旧服务，试用范围和持续承担尚未接齐，原安排先受到牵动", "新需求的有限试用、原服务与持续承担")
      }; break;
    default: return roleWords(input, setting);
  }
  return values[setting];
}

function roleWords(input: AnnualDistinctSceneProseInput, setting: AdultSituationSetting): Words {
  const money = input.domain === "wealth", god = input.visible.tenGod;
  const objects: Record<string, Record<AdultSituationSetting, [string, string]>> = {
    比肩: { employed: ["自己负责的成果与下一位协作者的接口", "个人可调用工时与共同工具"], learning: ["独立完成的作品、练习或材料", "自己的准备时间与可用资料"], independent: ["自己承诺的服务范围与合作边界", "个人投入和对方共用的条件"] },
    劫财: { employed: ["跨团队分工与临时协作", "共同工时、工具调用与追加权限"], learning: ["小组准备和个人进度", "共享材料与各自练习时间"], independent: ["各方参与份额与实际决定权", "合作投入、共用权限与持续分摊"] },
    正官: { employed: ["既定标准、完成记录与交接", "履行原职责所需的工具和手续"], learning: ["明确要求、材料规范与实际完成", "原定准备、材料提交与使用条件"], independent: ["原服务约定、质量标准与完成确认", "原约定费用和维持服务所需配套"] },
    七杀: { employed: ["集中要求、限时难点与原工作", "临时协助和几项事情共用的工具"], learning: ["相近时段的练习、申请或试做要求", "不同要求共用的练习时间与材料"], independent: ["集中需求、短期安排与原服务", "紧凑安排中的人工、工具与临时补充"] }
  };
  const pair = objects[god]?.[setting]; if (!pair) return words("现有条件较能接到实际使用", "原有安排与实际配合仍有牵制", "实际使用与继续承担");
  const subject = pair[money ? 1 : 0];
  if (god === "比肩") return words(`${subject}较能分清属于自己的一段，不必每一步都等待共同决定`, `${subject}与别人的安排互相牵动，自己完成的部分仍要重接另一端`, subject);
  if (god === "劫财") return words(`${subject}较能接到同一件事上，参与者各自补上其中一段`, `${subject}分散在不同人手里，参与增加却没有同步形成可继续的配合`, subject);
  if (god === "正官") return words(`${subject}较能对应，已经答应的事情有了可依循的完成步骤`, `${subject}尚未接齐，要求已明确，实际执行却仍等配套或说明`, subject);
  return words(`${subject}较能排出可处理的一步，现成办法和实际帮助接到难点`, `${subject}争用同一段时间，处理其中一项会挤到另一项的安排`, subject);
}

function settlementWithSupport(input: AnnualDistinctSceneProseInput, setting: AdultSituationSetting, mode: "protection" | "authority" | "food"): Words {
  const money = input.domain === "wealth";
  const help = { protection: "必要指导和练习条件仍能支持已经展开的内容", authority: "原约定要求与执行所需配套较能衔接", food: "处理现有难点所需的工具和实际帮助较能接上" }[mode];
  const pressure = { protection: "确认和继续使用占到原来仍不可缺少的指导、练习条件，已展开内容尚需这些支持", authority: "原约定的完成要求并未减少，补充说明与执行所需的指导、工具尚未接齐", food: "处理现有难点的要求仍在，收尾与继续承担又占用原解决步骤所需的时间和帮助" }[mode];
  const support = { protection: "必要指导与练习", authority: "履行原约定的执行配套", food: "处理现有难点的工具与帮助" }[mode];
  const values: Settings = money ? {
    employed: words(`已经用过的工时、材料较能按原约定确认，${help}`, `已发生投入还在补记录或说明，${pressure}`, `已用工时、原费用约定与${support}的分配`),
    learning: words(`已经使用的课程或活动条件较能得到确认，${help}`, `已用材料或活动条件仍需说明，${pressure}`, `已使用的材料、原有安排与${support}的对应`),
    independent: words(`原服务的费用核对和继续使用较能分开处理，${help}`, `原服务的费用确认、续用与维护共用已有配套，${pressure}`, `原服务费用确认、继续使用与${support}的承担`)
  } : {
    employed: words(`已经做过的工作较能获得原约定的回应，补充说明集中到剩余部分，${help}`, `已经完成的工作仍在补记录或说明，${pressure}`, `已完成工作、原约定认可与${support}的衔接`),
    learning: words(`已有作品或材料较能得到具体反馈，已完成与待补充部分分开，${help}`, `已有作品或材料仍在补充说明，完成确认与继续修改相互牵动，${pressure}`, `已有作品或材料的反馈、完成确认与${support}`),
    independent: words(`已交付服务较能进入验收或续用确认，原交付与下一轮服务分开，${help}`, `已交付服务仍需验收或续用说明，${pressure}`, `原交付确认、续用约定与${support}的衔接`)
  };
  return values[setting];
}

function mechanismWords(input: AnnualDistinctSceneProseInput, setting: AdultSituationSetting, base: Words): Words {
  const group = strengthTenGodGroup(input.visible.tenGod), money = input.domain === "wealth";
  const special = input.task.preferredPathId === input.path;
  const moderates = input.path === "resource-wealth" || special && input.task.task === "wealth_first";
  const protects = special && input.task.task === "resource_first";
  const choose = (values: Record<AdultSituationSetting, string>) => values[setting];
  if (input.visible.tenGod === "正财") {
    if (protects) return settlementWithSupport(input, setting, "protection");
    if (["official-resource", "killings-resource"].includes(input.path)) return settlementWithSupport(input, setting, "authority");
    if (input.path === "food-killings") return settlementWithSupport(input, setting, "food");
  }
  if (moderates && (group === "wealth" || group === "resource")) {
    const help = choose(money ? { employed: "用途重复的工具、培训或准备工时较能收拢，仍必需的支持继续留给原工作", learning: "重复教材和课程占用较能减少，真正解决难点的讲解与练习时间仍被保留", independent: "重复工具和服务准备较能按实际用途取舍，支撑原服务的必要配套继续保留" }
      : { employed: "重复说明或准备较能按实际工作取舍，必要指导保留下来，原来停在准备的一步开始用于执行", learning: "多份资料的重复内容较能合并，真正有用的解释继续支持练习，不必反复从头准备", independent: "已有工具和专业准备较能分清实际用途，成熟服务不必等所有准备重新做齐" });
    const pressure = group === "resource" ? choose(money ? { employed: "新增培训和工具仍在占用同一批工时，原有配套尚未因此减少", learning: "新课程、教材又与旧资料并行，实际练习时间继续受到挤占", independent: "新工具和准备要求叠在原服务之上，维护两套条件的投入尚未收拢" }
      : { employed: "原工作又增加说明或准备要求，已经会做的部分仍要等新一轮配套", learning: "资料和方法又添一层，原来可以练习的内容仍被准备占去时间", independent: "服务准备又增加一个版本，实际使用没有同步，原本成熟的一步也要重新衔接" })
      : choose(money ? { employed: "想收拢的工具或工时仍有原用途，减少重复占用暂时不能自由落实", learning: "想精简的课程或材料仍连着原学习安排，腾出练习时间的取舍尚未落实", independent: "想停用的配套仍被原服务或共同承担牵住，减少重复投入尚未接到实际使用" }
        : { employed: "准备虽想精简，原流程仍依赖其中一部分，取舍与实际执行还没有接上", learning: "资料虽想换少，必要解释与重复内容仍混在一起，练习尚未因此继续", independent: "工具或服务准备想调整，原用途和合作安排却仍牵住改变，完成方式尚未接续" });
    return { ...words(help, pressure, choose({ employed: "重复准备的取舍与原工作仍需的配套", learning: "重复课程材料与必要讲解、练习条件的区分", independent: "重复工具、专业准备与原服务必要条件的区分" })),
      ...(group === "wealth" ? { pending: choose(money ? {
        employed: "两套材料或工具即使用于同一步，也仍各自涉及维护、培训工时与共用安排；用途重叠不等于原配套已经可以停用",
        learning: "几份课程或资料用于同一练习时，阅读、练习和材料费用各有占用；某份内容重复，不代表整套学习条件都可撤掉",
        independent: "两套工具或专业准备服务同一种需要，维护和使用各占时间；既有服务仍依赖的配套，与功能重叠的投入各有持续使用的安排"
      } : {
        employed: "几份说明或两套做法对照同一步操作，重复讲解与仍不可缺少的操作依据是两类不同用途",
        learning: "同一道练习或同一份作品用到多份材料时，重复讲解与仍未掌握的一点会落到不同位置；资料取舍尚不等于练习已经做通",
        independent: "几套工具或方法对应原服务中的具体步骤，功能相近的部分与原约定仍依赖的部分各有用途"
      }) } : {}) };
  }
  if (protects && (group === "wealth" || group === "resource" || group === "output")) {
    const pressure = group === "wealth" ? choose(money ? { employed: "临时协作调用了原来用于指导、练习的工时或工具，原工作仍要靠这些条件继续", learning: "新用途占到原定练习时间和材料，尚未掌握的部分仍需要原来的指导", independent: "新试用与原服务同时调用同一套材料、工具或专业支持，补一边会占另一边" }
      : { employed: "临时协作扩开，带教或熟悉步骤的时间被借去别处，已经开始的工作难按原安排接着做", learning: "新的尝试进入原准备，作品或练习尚需帮助的部分没有减少，原指导却难以照常接上", independent: "试做新用途要调用现有工具和准备时间，原服务仍需专业支持，两边难同时保持原节奏" })
      : group === "output" ? choose(money ? { employed: "继续完成和修改争用同一批工时，必要指导与协助没有同步补上", learning: "练习或作品增加，材料和实际帮助仍按原范围提供，继续做需要的条件尚未接齐", independent: "服务内容继续展开，工具维护与专业协助没有同步，原有配套难支持同样节奏" }
        : { employed: "已经展开的工作继续加量，带教与协助却没有同步，熟悉步骤也难按原节奏持续", learning: "想做的练习或作品越来越多，具体讲解和反馈未跟上，做过的部分也需要回头衔接", independent: "想提供的内容继续增加，专业支持和实际配合却仍有限，成熟做法也难连续展开" })
        : choose(money ? { employed: "原来用于指导或练习的工时受到其他安排牵动，所需支持还不能照旧提供", learning: "必要课程或指导时间受到牵动，已有材料并不能独自补上仍不会的一步", independent: "原服务依赖的工具、方法或专业协助受到牵动，原准备不能直接照常使用" }
          : { employed: "原来可借助的说明或带教受到牵动，已经开始的内容仍需要这份支持才能继续", learning: "练习中仍需讲解的一点失去原来的衔接，已有准备还不能独立完成这一部分", independent: "原来依循的专业方法或协助受到牵动，服务已展开，必要支持却需要重新接上" });
    const help = group === "wealth" ? choose({ employed: "新增用途较能与原指导条件分开安排，原来需要帮助的一步仍保留继续完成的支持", learning: "新的尝试较能沿用必要讲解与练习条件，原来不会的一点不必独自硬接", independent: "新试用较能与原服务必要的专业支持分工，原来依赖帮助的部分仍有条件继续" }) : base.help;
    return { ...words(help, pressure, choose({ employed: "已展开工作所需指导与临时调用之间的分配", learning: "已有作品或练习仍需要的讲解、材料与时间", independent: "新用途与原服务仍需的专业支持之间的分配" })),
      ...(group === "resource" ? { pending: choose(money ? {
        employed: "已经备好的资料或工具与还需带教的一步并存，继续练习会用到具体工时和使用安排；已有投入不能替代尚未落实的指导",
        learning: "资料已经备下一部分，而讲解、练习时间和专用材料各承担不同作用；有材料不等于需要的帮助已经到位",
        independent: "工具已备与专业协助可调用是两回事；服务继续展开时，维护工时、方法支持与实际使用会分别占用条件"
      } : {
        employed: "已经开始的工作中，自己能继续的部分与需要帮助的部分并行；借助示范或带教的一步，与其余进度有不同的配合需要",
        learning: "作品或练习中尚未掌握的环节，既涉及已有材料的用法，也涉及一次具体讲解；两种需要落在同一步",
        independent: "服务已展开但某一步仍依赖专业方法或协助，自己能做的部分与需要配套的部分有不同进度；支持仍要落实到该步骤"
      }) } : {}) };
  }
  if (["official-resource", "killings-resource"].includes(input.path) && group === "resource") return words(base.help,
    choose(money ? { employed: "原工作依赖的工具、说明或协助受到牵动，所需配套不能按原安排调用", learning: "原来用来理解要求的材料或帮助受到牵动，已有准备还不能补齐具体缺口", independent: "原服务仍依赖专业说明和工具，其他安排牵动这些条件时，履行原约定的配套尚未接稳" }
      : { employed: "原先可依循的指导或示范受到牵动，完成标准仍在，实际执行却需要重新接到支持", learning: "要求已经明确，原来理解做法的帮助却未接稳，知道标准与自己完成之间仍有缺口", independent: "原约定仍需按相应标准完成，专业方法或协助受到牵动后，服务步骤难以直接照旧继续" }),
    choose({ employed: "原职责的标准、具体做法与可获得支持的衔接", learning: "明确要求与讲解、示范和实际完成的对应", independent: "原服务标准与必要专业配套的衔接" }));
  if (["official-resource", "killings-resource"].includes(input.path) && group === "wealth") return words(
    choose(money ? { employed: "工具和协助较能用于原职责，投入接到已经明确的一步", learning: "材料和可用帮助较能对应明确要求，准备有了具体用途", independent: "服务配套较能对应原约定，投入用到需要履行的具体部分" } : { employed: "实际配套较能接到既定要求，手头职责有了可执行的一步", learning: "可用条件较能接到明确要求，知道标准与实际做到之间有了衔接", independent: "原服务约定较能得到实际配套支持，要求和执行有了连接" }),
    choose(money ? { employed: "原先用于履行职责的工具或协助被临时用途占用，原承担没有同步减少", learning: "几项用途共用原来完成要求所需的材料或帮助，准备条件没有同步补齐", independent: "新试用和原承诺并用同一套工具、材料或专业准备，两边配套尚未接齐" }
      : { employed: "原工作仍按既定要求完成，临时协作却占去熟悉工具或获得指导的时间，承担未少、配套未齐", learning: "需要达到的要求仍在，新的用途又占去原来用于理解做法或取得帮助的条件", independent: "新试用调用原服务所需的工具和专业准备，原约定的质量或完成范围仍在，两边难同时接齐" }),
    choose({ employed: "既定职责与临时用途所需配套之间的分配", learning: "明确要求、准备材料与可获得帮助的对应", independent: "原服务承诺和新试用共用配套的范围" }));
  if (input.path === "food-killings") {
    if (group === "resource") return words(
      choose({ employed: "适用指导较能修正正在处理的一个难点，已有解法得到可执行的补充", learning: "新的解释较能指出原练法卡住的一步，修改集中在真正需要补足的地方", independent: "专项协助较能补到原服务的难点，成熟步骤可以在局部修正后继续" }),
      choose(money ? { employed: "方法调整又占用原解决步骤的工时或工具，难点仍要处理，配套却在两边轮用", learning: "新旧解法并行占用同一段练习时间和材料，原来能做的步骤也被暂停", independent: "新指导要求换用工具或准备，原服务的难点仍在，两套配套暂时都占着投入" }
        : { employed: "处理难点本有熟悉办法，新的指导却打断原解决顺序，原来能继续的一步需要重新衔接", learning: "原练法还在处理具体问题，新解释又改变了操作顺序，熟悉的一部分也要停下来重新接上", independent: "原服务已有处理难点的方法，新的指导或准备牵动这些步骤，问题仍在而做法尚未接稳" }),
      choose({ employed: "具体难点与原解决步骤、指导之间的衔接", learning: "原练法处理的难点与新解释的对应", independent: "原服务难点、成熟方法与专项协助的配合" }));
    if (group === "authority") {
      let pressure = choose(money ? { employed: "几项要求轮用同一份临时协助或工具，补上一项会占到另一项原定条件", learning: "不同要求共用练习时间和同一套材料，补一处就会挤到另一处准备", independent: "集中安排同时调用人工、工具和临时材料，服务之间相互占用配套" }
        : { employed: "熟悉步骤正在处理一个难点，另一项审核或限时要求又占用同一段时间，一项未稳就要转去处理另一项", learning: "相近时段的练习、申请或试做要求争用时间，熟悉的准备步骤也难连续展开", independent: "原服务正在处理一处难点，短期安排又占用同一批人手或工具，几项要求互相挤压" });
      if (strengthTenGodGroup(input.hidden.tenGod) === "resource" && ["obstructs", "mixed"].includes(input.hidden.effect)) pressure += choose(money
        ? { employed: "；指导或方法转换又占用原解决步骤的工时", learning: "；新旧练法切换又分走原定练习时间", independent: "；方法调整又占用原服务的工具和准备" }
        : { employed: "；新的指导还牵动原解决顺序，原来熟悉的一步也要重新接续", learning: "；新的解释或练法又牵动原步骤，有限练习时间被切得更碎", independent: "；新指导还牵动原熟悉做法，已有解法不能直接照旧继续" });
      return words(base.help, pressure, base.topic);
    }
    if (group === "wealth") return words(
      choose({ employed: "实际投入较能接到正在处理的难点，原来可用的办法重新有了使用条件", learning: "材料或实际帮助较能用到具体难点，熟悉练法有了继续使用的条件", independent: "工具或协作投入较能接到原服务的解决步骤，准备有了明确用途" }),
      choose({ employed: "新增用途牵动原解决步骤，原本要处理的要求仍在，同一批配套受到两边占用", learning: "新的准备占到原练法所需条件，问题仍待处理，继续投入尚未接到解题的一步", independent: "新用途调用原服务的工具和方法，已有难点未少，投入与解决步骤尚未同步" }), base.topic);
  }
  return base;
}

/** Exact current-template matching identifies a conditional setting only.
 * Mechanism candidates describe the source sentence, never select a new rule. */
export function buildAnnualDistinctSceneProse(input: AnnualDistinctSceneProseInput): AnnualDistinctSceneProse | null {
  const { visible, hidden, age } = input;
  if (age.stage !== "adult" || age.segments.some(segment => segment.stage !== "adult") || visible.visibility !== "visible" || hidden.visibility !== "main_hidden") return null;
  if (!strengthTenGodGroup(visible.tenGod) || !strengthTenGodGroup(hidden.tenGod) || kindFor(visible.tenGod) !== input.kind) return null;
  if (!["assists", "obstructs", "mixed", "neutral", "unresolved"].includes(visible.effect)) return null;
  const special = ["resource_first", "wealth_first", "official_joint"].includes(input.task.task) && input.task.preferredPathId === input.path;
  if (input.task.preferredPathId && input.task.preferredPathId !== input.path) return null;
  if (!["peer-output-wealth", "resource-output", "official-resource", "killings-resource", "food-killings", "resource-wealth"].includes(input.path) && !special) return null;
  const candidates = ADULT_SITUATION_MECHANISMS.flatMap(mechanism => describeAdultLifeSituations({ domain: input.domain, god: visible.tenGod, effect: visible.effect, age, appliedWork: null, mechanism }) ?? [])
    .filter(descriptor => descriptor.fullOriginal === input.original);
  if (!candidates.length || new Set(candidates.map(descriptor => descriptor.setting)).size !== 1 || new Set(candidates.map(descriptor => descriptor.subject)).size !== 1) return null;
  const group = strengthTenGodGroup(visible.tenGod), protects = special && input.task.task === "resource_first";
  const moderates = input.path === "resource-wealth" || special && input.task.task === "wealth_first";
  // An exact sentence can establish a more specific source mechanism than this
  // view's typed inputs can explain. Keep that sentence instead of replacing its
  // known cause with a different one inferred from the path name.
  const compatible = (mechanism: AdultSituationMechanism) => {
    if (mechanism === "role" || mechanism === "general_constraint") return true;
    if (mechanism === "resource_moderation") return moderates && (group === "wealth" || group === "resource");
    if (mechanism === "resource_protection") return protects && ["wealth", "resource", "output"].includes(group!);
    if (mechanism === "authority_resource") return ["official-resource", "killings-resource"].includes(input.path) && ["wealth", "resource", "authority"].includes(group!);
    if (mechanism === "output_to_wealth") return !protects && !moderates && ["peer-output-wealth", "resource-output", "food-wealth", "wealth-food", "hurting-wealth"].includes(input.path) && (group === "wealth" || group === "output");
    if (mechanism === "output_overload") return protects && group === "output";
    return false;
  };
  if (!candidates.every(candidate => compatible(candidate.sourceMechanism))) return null;
  const first = candidates[0]!, selected = mechanismWords(input, first.setting, ordinary(input, first.setting));
  const opening = `${labels[first.setting]}，涉及${first.subject}时`;
  const text = visible.effect === "assists" ? `${opening}，${selected.help}。` : visible.effect === "obstructs" ? `${opening}，${selected.pressure}。`
    : visible.effect === "mixed" ? `${opening}，${selected.help}；同时，${selected.pressure}。` : selected.pending ? `${opening}，${selected.pending}。` : `${opening}，本项重点是${selected.topic}。`;
  return { version: ANNUAL_DISTINCT_SCENE_PROSE_VERSION, text, original: input.original, setting: first.setting,
    templateIds: [...new Set(candidates.map(descriptor => descriptor.templateId))], sourceMechanisms: [...new Set(candidates.map(descriptor => descriptor.sourceMechanism))] };
}
