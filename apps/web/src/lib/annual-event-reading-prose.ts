import type { OutlookEffect } from "./local-outlook-judgment";
import type { LocalReadingAgeContext } from "./local-reading-age-context";
import type { ReadingContextRelationship, ReadingContextWork } from "./local-reading-context";
import { buildAnnualRoleTopic, annualRoleMonthContext } from "./annual-event-role-prose";
import { buildAnnualRelationshipTopic } from "./annual-event-relationship-prose";
import type { AnnualRelationshipSignal } from "./annual-relationship-signals";
import type { AnnualRelationshipTiming } from "./annual-relationship-timing";
import type { AnnualRelationshipNatalContext } from "./annual-relationship-natal-context";
import type { AnnualEventPatternContext, AnnualEventStemActionSignal } from "./annual-event-signals";
import { buildAnnualMechanismTopic } from "./annual-event-mechanism-prose";
import { buildAdultLifeSituations } from "./adult-life-situations";

export const ANNUAL_EVENT_READING_PROSE_VERSION = "hakimi.annual-event-reading-prose/0.12.0" as const;
export type AnnualEventReadingProseKind = "work_change" | "study" | "proposal" | "delivery" | "settlement" | "new_collaboration" | "shared_arrangements";
export interface AnnualEventReadingProseInput {
  kind: AnnualEventReadingProseKind; domain: "career" | "wealth" | "relationship" | "change";
  god: string; path: string; effect: OutlookEffect; patternEffect: OutlookEffect; age: LocalReadingAgeContext;
  hasMonthBranchClash: boolean; hasMonthBranchCombination: boolean;
  hasDayBranchClash: boolean; hasDayBranchCombination: boolean; hasDayStemInteraction: boolean;
  appliedWork: ReadingContextWork | null; appliedRelationship: ReadingContextRelationship | null;
  relationshipSignals?: readonly AnnualRelationshipSignal[];
  relationshipTiming?: AnnualRelationshipTiming;
  relationshipNatalContext?: AnnualRelationshipNatalContext;
  patternContext?: AnnualEventPatternContext;
  targetAction?: AnnualEventStemActionSignal;
  mainQiAction?: AnnualEventStemActionSignal;
}
export interface AnnualEventReadingProse {
  title: string; summary: string; examples: string[]; applicability: string[]; notApplicableWhen: string[];
  reasoning?: string[];
}
type Topic = Pick<AnnualEventReadingProse, "title" | "summary" | "examples">;
type WorkKind = Exclude<AnnualEventReadingProseKind, "shared_arrangements">;

// An unspecified adult is not an employee by default. These are examples of
// the same selected theme in ordinary life, not additional event predictions.
function everydayTopic(kind: WorkKind, money = false): Topic {
  const topics: Record<WorkKind, { life: Topic; resources: Topic }> = {
    work_change: {
      life: { title: "个人安排与共同分工的变化", summary: "原先各自处理的事情开始需要配合，或共同安排中出现需要自己独立承担的一段。变化具体落在谁来准备、什么时候完成，以及临时有事由谁接上。", examples: ["若有共同活动或出行：原来随大家安排的一部分，改为自己准备或负责联系。", "若有长期共同约定：参与时间或成员改变，原来的分工需要重新说明。"] },
      resources: { title: "共用物品与各自承担的费用", summary: "参与方式一变，时间、用品和费用也会重新分配。个人愿意投入的部分与大家共同使用的部分，需要分别得到确认。", examples: ["若有共用物品或活动费用：原来由一个人准备，后来改成轮流提供或共同分摊。", "若有临时增加的安排：已有时间或物品先被占用，另一件事需要换个时间继续。"] }
    },
    study: {
      life: { title: "学会新方法，再用回自己的生活", summary: "这年的学习主题更贴近把原来不熟悉的事情弄明白：跟着示范尝试、整理说明，或换一种处理办法。真正的变化在于，原先需要反复请教的一步能不能逐渐自己完成。", examples: ["若在练习一门兴趣或技能：照着示范试过之后，发现一个需要重新理解的步骤。", "若有手续、物品使用或日常难题：补齐说明或请人示范，随后自己完整做一次。"] },
      resources: { title: "学习用品、资料与准备时间的取舍", summary: "资料、课程和工具容易一起进入考虑，但各自解决的问题不同。已经买来或借来的东西是否真正用上，会比继续添置更直接地影响这项安排。", examples: ["若已有学习计划：新资料与原来练习的时间重叠，一部分内容需要延后或合并。", "若想添置工具或课程：先试用已有物品，才发现缺的是说明、练习时间，还是确实少一件工具。"] }
    },
    proposal: {
      life: { title: "把自己的想法说出来，试一种新做法", summary: "更突出的主题是表达自己的看法，并让别人看到具体区别。一个关于活动、作品或日常习惯的改法，从口头想法进入小范围尝试，实际回应会影响下一步怎样调整。", examples: ["若有共同活动或出行计划：提出另一种安排，先试一次，再根据大家的体验调整。", "若有兴趣作品或想改变的习惯：做出一个小样或换一种步骤，比较前后的不同。"] },
      resources: { title: "尝试新做法所需的时间与小额投入", summary: "想法进入尝试后，需要占用真实的时间、材料或共同条件。有的改法可以利用手边物品，有的则会带出原先没想到的后续安排。", examples: ["若有作品或活动改法：先利用现有材料做一版，试过后再决定是否追加用品。", "若想换一种日常做法：开始花费不多，后来发现还需要固定时间或他人配合。"] }
    },
    delivery: {
      life: { title: "把已经会的事情做熟，逐渐形成习惯", summary: "这年的主题偏向持续完成：一次做好之后，是否还能保持相近的耐心和步骤。兴趣练习、个人作品或已答应的事情，容易从零散尝试进入有规律的重复。", examples: ["若已有兴趣练习：把上一次不熟的地方再做一遍，慢慢形成自己顺手的步骤。", "若有作品或共同约定：做完一个部分后继续补齐余下内容，让别人能够实际使用或参与。"] },
      resources: { title: "持续练习与日常消耗的安排", summary: "持续做一件事，会逐渐显出哪些物品要反复使用、哪些时间需要长期留出。一次性准备与后续补充不同，安排能否维持也取决于这些细节。", examples: ["若有固定兴趣或活动：用品需要补充，参与时间也要与其他安排重新协调。", "若有共用物品：一轮活动结束后整理、归还，下一次才能接着使用。"] }
    },
    settlement: {
      life: { title: "已做的事情得到确认，原有约定走到收尾", summary: "关注点落在已经发生的付出怎样被确认：完成到哪一步、还欠什么、接下来是否继续。与寻找新安排相比，这一年更适合对照原有约定是否真正走到了结果。", examples: ["若有已完成的作品、申请或活动：收到具体回应，补齐最后一项说明或材料。", "若有已答应的事情：参与者确认哪些已经办完，哪些留到下一阶段继续。"] },
      resources: { title: "已有费用、物品归还与约定兑现", summary: "资源主题更贴近已有往来的收尾：费用怎样分摊、物品何时归还、已经约定的部分是否落实。明确了完成记录，后续继续使用或参与的范围才更容易说清。", examples: ["若有共同活动开支：活动结束后核对实际费用，确认各自已经承担和仍待处理的部分。", "若有借用物品、预付费用或续用约定：原安排进入归还、核对或是否继续的确认。"] }
    },
    new_collaboration: {
      life: { title: "认识新的同伴，尝试不同的参与方式", summary: "这年的主题偏向接触原先不熟悉的活动、同伴或做法。先有一次实际参与，再决定是否继续；能否形成持续联系，还要看兴趣、时间与彼此期待是否合得上。", examples: ["若有兴趣活动或朋友邀请：先参加一次，发现自己更喜欢其中某个环节或某种相处方式。", "若想尝试新的共同计划：与原先不熟悉的人分担一小部分事情，再决定是否继续合作。"] },
      resources: { title: "新活动的花费与可投入时间", summary: "新的参与机会会带来不同的材料、时间或费用要求。有些适合偶尔尝试，有些需要持续投入，二者对原有生活安排的影响不同。", examples: ["若收到新的活动邀请：报名、交通或用品需要一起安排，原有日程也会受到影响。", "若接触新的共用物品或服务：先用一小段，之后再确认是否值得持续承担费用。"] }
    }
  };
  const topic = topics[kind][money ? "resources" : "life"];
  return { ...topic, examples: [...topic.examples] };
}

const ADULT: Record<WorkKind, Topic> = {
  work_change: { title: "岗位职责与合作分工调整", summary: "更值得对照的是负责人、协作接口或完成标准怎样重新确定；新增职责是否连同权限和支持一起交接，会影响后面的推进。", examples: ["若在职：接手或交出一部分职责，重新确认谁审批、谁交付、谁负责后续", "若已有项目：合作方重新议定分工、份额或成果归属，而非只增加工作量"] },
  study: { title: "进修考证与现有工作的衔接", summary: "重点落在培训、资格材料或专项方法怎样用于现有工作；学习安排与正在交付的内容需要放在同一张时间表上。", examples: ["若在职：参加岗位培训、准备资格材料，同时调整原有交付排期", "若正在求职或转方向：补一项岗位明确要求的资格、工具能力或作品证明"] },
  proposal: { title: "提出改法并做一次实际试点", summary: "这一主题对应把不同意见做成可比较的方案，再用演示或小范围试用说明改了什么；关键是从表达观点走到能被核对的改进结果。", examples: ["若在职：针对现有流程提出改法，约定一个试点范围和验收标准", "若有专业作品或服务：用演示、样稿或小规模试用争取下一步合作讨论"] },
  delivery: { title: "连续交付、作品完成与服务维护", summary: "重点在把已经会做的事情稳定完成：质量、频率和后续维护需要同时跟上，才能让一次成果变成可重复使用的方法。", examples: ["若有项目：连续提交成品、维护服务或按阶段完成验收", "若在职：把熟悉做法整理成可复用流程，并确认交接后的维护责任"] },
  settlement: { title: "已有项目验收、结算或续约", summary: "更值得对照的是已有成果怎样完成确认，验收、结算条件与下一轮合作如何衔接；这与继续寻找新机会是两个不同环节。", examples: ["若已有项目或服务：核对交付清单、验收节点、回款约定与续约范围", "若在职：核对已完成职责对应的待遇、报销或持续预算约定"] },
  new_collaboration: { title: "新客户、短期合作与渠道试用", summary: "重点转向外部接洽与新合作的选择：先确认对方要什么、试用到哪里，再比较投入与后续维护；接触机会和拿到结果之间仍有一步。", examples: ["若自营或有项目：接洽新客户或短期合作，先约定试用范围和修改次数", "若在职：参与外部伙伴、供应商或跨团队合作，先弄清各方的交付责任"] },
};

function workTopic(kind: WorkKind, work: ReadingContextWork | null, god: string): Topic {
  const base = ADULT[kind];
  if (!work || work === "unspecified") return everydayTopic(kind);
  if (work === "student") {
    const titles: Record<WorkKind, string> = { work_change: "课题分工与实践安排调整", study: "课程进修、考试与资格准备", proposal: "选题表达、方案展示与试做", delivery: "课程作品与阶段成果完成", settlement: "已有学习成果验收与费用核对", new_collaboration: "新的课题伙伴与实践机会" };
    const examples: Record<WorkKind, string[]> = {
      work_change: ["课题小组重新分工，明确各自完成的部分和共同提交时间", "如确有实习：核对导师、指导者和实践岗位之间的要求"],
      study: ["把课程、考试或资格申请所需材料排到现有学习计划中", "用一个实际练习验证新方法，而不只增加课程数量"],
      proposal: ["展示选题或作品草案，依据评议意见做一次小范围修改", "把与原做法不同的想法做成可对照的样稿"],
      delivery: ["完成一份课程作品或阶段报告，按反馈修订成可提交版本", "小组成果进入汇总，核对各部分是否符合相同标准"],
      settlement: ["已完成的课程、实践或项目进入材料审核、学分或成果确认", "核对已约定的活动费用、材料使用和后续报名安排"],
      new_collaboration: ["接触新的课题团队、竞赛伙伴或实践项目，先明确参与范围", "比较不同实践机会的时间要求与需要补齐的能力"],
    };
    return { title: titles[kind], summary: kind === "study" ? "学习主题落到具体课程、考试或申请要求；先让准备服务正在完成的成果，避免同时铺开过多方向。" : "这里对应现有学习成果怎样进入展示、合作或完成确认；课程与实践安排改变时，先把参与范围和提交标准讲清。", examples: examples[kind] };
  }
  if (work === "seeking_work") {
    const titles: Record<WorkKind, string> = { work_change: "目标岗位与申请方向调整", study: "补齐求职所需资格与方法", proposal: "求职作品与面谈表达改进", delivery: "申请材料与试做作品完成", settlement: "已有试做结果与录用条件核对", new_collaboration: "新的岗位线索与合作试做" };
    return { title: titles[kind], summary: kind === "settlement" ? "重点是已有申请、试做或面谈之后的确认：对方接受了哪些成果，接下来需要什么材料，书面条件是否清楚；意向不等于录用。" : kind === "study" ? "学习投入应落到目标岗位明确要求的差距，例如工具、资格或作品证明；补齐一项能被核实的能力，比不断扩大准备范围更有用。" : "把岗位要求与已有经历逐项对应，用作品、材料或一次实际反馈检验适配，再决定继续跟进哪个方向。", examples: kind === "settlement" ? ["核对试做反馈、后续面谈和书面职责条件，区分口头意向与已确认约定", "整理已经提交的证明材料，确认需要补交或修订的具体部分"] : kind === "study" ? ["为目标岗位补一份资格材料或完成一个工具练习", "用修改后的作品验证这轮学习是否补到了真实差距"] : ["用一份可核实的成果记录调整申请材料，再观察具体反馈", "新线索出现时先核对岗位内容、试做范围和联系渠道，不把接洽当录用"] };
  }
  if (work === "caregiving" || work === "retired") {
    const care = work === "caregiving";
    const titles: Record<WorkKind, string> = {
      work_change: care ? "照料分工与替补安排调整" : "固定活动与家庭分工调整",
      study: care ? "照料方法学习与交接信息整理" : "兴趣进修与经验整理",
      proposal: care ? "调整照料做法并小范围尝试" : "提出活动改法或分享经验",
      delivery: care ? "照料计划的持续执行与交接" : "活动成果与经验分享的完成",
      settlement: care ? "照料安排的完成与后续交接" : "已有活动的回应与后续安排",
      new_collaboration: care ? "新的照料协助与服务接洽" : "新的活动伙伴与自愿合作",
    };
    return { title: titles[kind], summary: care ? "这项主题落在照料日程、交接和可落实的协助上；谁持续负责、谁能替补以及相关开支怎样确认，需要连同自己的恢复时间一起安排。" : "这项主题围绕自愿参与、兴趣和已有生活安排展开；新增活动是否值得持续承担，要看自己愿意投入的时间及伙伴能否接住分工。", examples: kind === "settlement" ? [care ? "核对已发生的照料用品、服务或交通支出，以及共同承担约定" : "核对已使用的服务、活动费用和下一阶段续用条件", "对尚未确认的支出先说明范围，不根据身份推断收入或家庭供养"] : [care ? "将一周接送、陪伴和用品准备交接给明确的人，并约定临时替补" : "选择一项自愿活动，明确分享内容、参与次数与退出方式", kind === "study" ? "把新学方法放进一次实际尝试，记录是否减少重复劳动" : "新伙伴或新做法先试一小段，再决定是否成为持续安排"] };
  }
  if (work === "self_employed") {
    return { ...base,
      title: kind === "work_change" ? "客户要求、交付职责与合作分工调整" : kind === "study" ? "专业进修与客户交付排期" : base.title,
      examples: kind === "settlement" ? ["已有服务进入验收，逐项核对回款约定、修改范围和续约内容", "把上一轮交付与下一轮报价分开确认，避免维护义务无限延长"]
        : kind === "new_collaboration" ? ["与新客户或合作方先确认试用内容、费用条件、修改次数和终止方式", "渠道带来新的询问时，先比较投入成本与现有交付余量"]
        : kind === "study" ? ["进修一项客户需求明确的新方法，同时给已承诺交付保留时间", "先用一个样例验证新工具，再决定是否投入到正式服务"]
        : kind === "proposal" ? ["用样稿或演示说明新方案如何解决客户的问题，再谈正式合作范围", "把小范围试用与正式服务分开，避免试用期间不断追加需求"]
        : kind === "delivery" ? ["连续交付同类成果，核对质量、周期与售后维护是否都能跟上", "将重复修改整理成固定流程，减少每次重新谈标准"]
        : ["合作方改变需求时，重新确定各自交付、审批和维护的责任", "职责增多之前核对可调动的人手、时间和决策权限"] };
  }
  return { ...base, title: kind === "new_collaboration" ? "外部伙伴与跨团队合作接洽" : base.title,
    examples: kind === "settlement" ? ["核对已有项目验收、报销或待遇约定，而不是把新职责直接当作加薪", "下一阶段继续负责前，把完成标准与配套资源重新确认"]
      : kind === "study" ? [god === "偏印" ? "专项工具或新方法需要学习，先用一项实际工作验证效果" : "岗位培训、资格考试或审核材料进入日程，与现有交付一起排期", "把前辈指导整理成可复用做法，确认学习确实减少返工"]
      : kind === "proposal" ? ["向团队展示流程改进方案，用试点结果说明利弊", "改法涉及原审批或岗位职责时，先明确谁有权批准和验收"]
      : kind === "new_collaboration" ? ["与外部伙伴、供应商或另一团队接洽，明确双方提供什么", "试点合作先约定范围、负责人和后续维护，不把接洽等同成功"]
      : kind === "delivery" ? ["连续完成交付或维护，把质量、周期和交接标准保持一致", "原流程或负责人调整时，核对成品如何继续验收与维护"]
      : ["岗位分工或考核要求变化，重新确认职责边界及可调用的支持", "接手同事或团队的一部分工作，明确交接资料、审批权限与完成时间"] };
}

function wealthTopic(kind: WorkKind, work: ReadingContextWork | null): Topic {
  if (!work || work === "unspecified") return everydayTopic(kind, true);
  const topics: Record<WorkKind, Topic> = {
    study: { title: "课程、资格与工具投入的取舍", summary: "这一项具体看培训费用、工具使用和准备时间投入到哪里；有了课程或设备，还要确认它是否解决当前交付中的真实缺口。", examples: ["若有工作或项目：比较课程、资格申请或工具费用，与它能解决的实际问题", "把学习时间和现有交付排在一起，确认指导、试用与维护成本是否都能承担"] },
    proposal: { title: "方案试用成本与正式合作范围", summary: "专业表达进入合作讨论后，需要分清免费说明、付费试做和正式交付的范围；受到关注与已经形成可兑现约定不是同一步。", examples: ["若有专业服务：对样稿、演示或试做写清范围，避免不断追加未确认的工作", "若在职：改进试点先明确可用预算、人员时间与由谁验收"] },
    delivery: { title: "交付、维护与结算节奏的衔接", summary: "这一项看已做出的成果怎样完成验收，持续服务所需的时间与费用是否跟上；交付次数增加时，维护义务也需要算进约定。", examples: ["若已有项目：核对验收、分期结算和维护范围是否采用一致的完成标准", "若有持续服务：区分固定交付、额外修改和下一轮续用的条件"] },
    settlement: { title: "已有回款条件、续约范围与持续预算", summary: "重点在已经投入的工作怎样得到确认：哪些满足验收，哪些仍待补齐，付款或续约需要对方确认什么；不把完成工作直接当作钱已到账。", examples: ["若已有项目或服务：核对待确认的验收材料、回款约定与续约范围", "若在职：核对已经约定的待遇、报销及持续承担责任的配套条件"] },
    new_collaboration: { title: "新合作的试用成本与报价条件", summary: "新客户或合作渠道带来的，首先是不同的需求与投入条件；先分清试用、正式报价和后续维护，再讨论是否值得持续参与。", examples: ["若有合作接洽：把前期试用成本、正式收费范围和结束条件分开写清", "新询问较多时，比较每项机会需要的时间、工具与已有交付余量"] },
    work_change: { title: "职责增加后的配套与共同分摊", summary: "分工改变也会改变谁投入时间、谁使用预算、谁承担后续；重点是责任和配套能否一起重谈，而不是把承担更多直接视为回报增加。", examples: ["若在职：职责或项目负责人变化后，核对预算、报销、权限和协助是否同步", "若有合伙或共同项目：重谈投入、份额、结算范围与退出安排"] },
  };
  const base = topics[kind];
  if (work === "employed" || work === "self_employed") {
    if (work === "employed" && kind === "new_collaboration") return { ...base, examples: ["新供应商或跨团队试点出现时，核对预算、审批责任和试用条件", "外部方案进入比较时，分别列出初始投入与后续维护要求"] };
    return { ...base, examples: [...base.examples] };
  }
  if (work === "student") return { title: kind === "study" ? "课程、考试与学习材料投入" : kind === "settlement" ? "已有活动费用与学习成果确认" : "课题活动的材料、时间与共同分摊", summary: "投入先落在课程、考试、设备材料与可以得到的指导；比较每项花费或准备时间实际服务什么成果，不把学业表现当作未来收入。", examples: kind === "settlement" ? ["活动或实践结束后核对已约定费用、借用材料和成果确认", "继续参与下一阶段前，确认报名、材料与交通安排"] : ["选择课程或活动之前，列出材料、费用、准备时间和可获得的指导", "共同作品需要设备或材料时，先约定借用、分摊和归还方式"] };
  if (work === "seeking_work") return { title: kind === "settlement" ? "试做约定与求职投入核对" : kind === "study" ? "求职学习与资格准备的成本" : "岗位验证、材料与交通投入", summary: "资源问题落在求职所花时间、学习、作品和往返安排；先比较投入是否带来可核实的岗位信息或反馈，不从求职身份推断没有收入。", examples: kind === "settlement" ? ["已有试做时核对范围、成果使用和事先约定的费用条件", "口头意向之后继续核实书面职责与条件，不把它当作已录用"] : ["为一类目标岗位准备一份作品或资格材料，记录它带来的实际反馈", "比较培训、材料和交通安排，避免为尚未核实的岗位不断追加成本"] };
  const care = work === "caregiving";
  return { title: care ? "照料费用、用品与共同承担" : "日常服务、兴趣投入与持续支出", summary: care ? "具体核对照料用品、交通或服务费用，以及家人共同投入的时间；协助是否能持续，比名义上答应参与更重要。" : "核对已经选择的服务、兴趣活动和持续支出，分清一次性参与与长期承担；不从退休身份推断养老金、资产或家庭支持。", examples: [care ? "照料安排调整后，核对用品、接送或服务费用由谁承担" : "活动或服务续用前，核对费用、参与频率与退出安排", "共同开支把范围和确认方式说清，不把自述身份换算成收入额度"] };
}

function youngerTopic(input: AnnualEventReadingProseInput): Topic {
  if (input.age.segments.length <= 1) return singleYoungerTopic(input);
  const phases = input.age.segments.map((segment) => {
    const phase = { ...input, age: { ...input.age, stage: segment.stage, startAge: segment.startAge, endAge: segment.endAge, label: segment.label, segments: [segment] } };
    const topic = segment.stage === "adult" && input.kind !== "shared_arrangements"
      ? everydayTopic(input.kind, input.domain === "wealth") : singleYoungerTopic(phase);
    return { label: `${segment.label}这一段`, topic };
  });
  return { title: singleYoungerTopic(input).title,
    summary: phases.map(({ label, topic }) => `${label}：${topic.summary}`).join(""),
    examples: phases.flatMap(({ label, topic }) => topic.examples.map((text) => `${label}：${text}`)) };
}

function singleYoungerTopic(input: AnnualEventReadingProseInput): Topic {
  const early = input.age.stage === "young_child", neutral = input.age.stage === "unknown", transition = input.age.stage === "adult_transition";
  if (input.kind === "shared_arrangements") return { title: neutral ? "相处节奏与共同约定调整" : early ? "照料节奏与熟悉感的调整" : "家人约定与同伴相处调整", summary: early ? "更值得观察的是接送、陪伴或回应方式是否变化，以及孩子怎样重新适应熟悉的日常节奏。" : "共同安排与个人意愿需要重新对应，例如相处时间、参与方式或已经答应的分工；原来默认的做法需要调整时，把新的期待讲清。", examples: early ? ["照料者或日常活动时间变化，重新建立稳定的回应和交接", "孩子表达需要的方式改变，家人通过共同活动了解其节奏"] : ["与家人或同伴重新约定见面、活动时间或各自负责的部分", "原来默认的安排不再合适时，把变化和新的期待说清"] };
  if (input.domain === "wealth") {
    if (neutral) return everydayTopic(input.kind, true);
    const topics: Record<WorkKind, Topic> = {
      work_change: { title: "轮流使用用品与共同分担", summary: "一起参与的人或活动内容改变，原来的物品、空间与陪伴时间也需要重新安排。想做的事增多时，轮到谁、谁能够帮忙，会更具体地影响活动能否继续。", examples: ["已有共同活动增加参与者后，用品改成轮流使用，熟悉的人帮助说明顺序。", "原来由一个人准备的物品，后来改成大家各自提供一部分。"] },
      study: { title: early ? "探索用品与陪伴示范的时间" : "学习用品、资料与实际可得的帮助", summary: "新的学习方法会带来材料、说明或陪伴需求。物品已经准备好，并不一定意味着马上能够独立使用；实际示范和反复尝试仍需要时间。", examples: [early ? "新的拼搭、图画或操作游戏需要熟悉的人先示范，之后孩子再自己尝试。" : "实际练习中添了新材料，经过一次示范后才发现哪些部分能自己完成。", "手边已经有类似物品时，先重新使用，避免准备很多却没有时间逐一尝试。"] },
      proposal: { title: "试一种新玩法所需的材料与帮助", summary: "自己的新想法开始需要真实材料或他人配合。有些变化利用手边物品就能试，有些则需要等空间、时间或帮助到位。", examples: ["已有画作、拼搭或活动想换一种做法，先用手边材料做出一小部分。", "共同活动中各自想法不同，尝试其中一种时，其他材料和时间需要暂时让出来。"] },
      delivery: { title: "持续练习需要的用品与时间", summary: "一项活动反复进行，会显出哪些用品经常使用、哪些步骤需要持续帮助。结束后收好材料，下一次才能接着熟悉的部分继续。", examples: ["已有兴趣或活动连续进行，常用材料需要补充，也逐渐形成固定的收放位置。", "一件小作品分几次完成，保留前一次用到的东西，下一次从原处接着做。"] },
      settlement: { title: "用过的物品归还，已经答应的安排收尾", summary: "活动结束后，用过的东西、借来的材料和已经答应的帮助进入确认。这里的收获更贴近完成得到回应、物品回到原处，以及下一次能否继续使用。", examples: ["已有共同活动结束后，一起收好材料，归还借来的物品。", early ? "孩子完成一次收拾或小尝试，熟悉的人按原来答应的方式回应。" : "已经完成的作品或活动得到回应，再确认还需要哪些材料或帮助。"] },
      new_collaboration: { title: "新活动所需的用品、时间与陪伴", summary: "新伙伴或新活动会带来原来没有用过的物品与不同节奏。第一次参与可能只需要少量准备，是否持续参加，还要看实际兴趣与可得到的支持。", examples: [early ? "在熟悉的人陪伴下尝试一种新游戏，先借用或共用少量物品。" : "若实际参加新兴趣活动，先用现有或借来的材料完成一次尝试。", "新的参与时间与原来活动重叠，家人或实际指导者一起调整陪伴和物品准备。"] }
    };
    return topics[input.kind];
  }
  if (neutral) return everydayTopic(input.kind);
  const titles: Record<WorkKind, string> = { work_change: "活动分工与完成要求调整", study: early ? "新游戏与学习方法的尝试" : "学习方法与具体练习衔接", proposal: "展示想法并尝试不同做法", delivery: "完成作品与持续练习", settlement: "已做的事情得到回应，活动用品归位", new_collaboration: "新活动伙伴与参与机会" };
  const summaries: Record<WorkKind, string> = {
    work_change: early ? "熟悉游戏中，自己想做和需要大人帮忙的部分会重新分开；轮流、等待和回应，是更容易观察到的变化。" : "已有学习或同伴活动中，自己负责的部分和大家共同完成的部分重新分配。能独立做到哪一步、遇到困难向谁求助，会比笼统要求表现好更具体。",
    study: early ? "新的动作、词语或游戏办法，需要通过熟悉的人示范，再自己反复尝试。帮助来得太快或步骤一次太多，都可能打断原本愿意继续的探索。" : "原来不熟的一步开始得到新的解释或示范，随后需要在实际练习中用一次。学会的感觉与能够独立完成，可能会相隔几次尝试。",
    proposal: early ? "孩子更愿意表达自己的玩法，给熟悉活动加一点变化。想法被听到后，能否试一小段、试过后是否还愿意继续，是具体可观察的表现。" : "自己的看法、画法或完成方式进入展示。与别人不同的地方开始被看见，回应可能使作品继续修改，也可能让孩子更清楚想保留什么。",
    delivery: early ? "已经试过的动作或小游戏会再次出现，重复中逐渐熟悉。一个小环节从需要提醒到自己接着做，比一次完成很多内容更贴近这一主题。" : "已有练习或小作品从开始进入持续完成：做完一部分，再接着补齐余下内容。把上次不熟的地方再试一次，会逐渐形成顺手的步骤。",
    settlement: early ? "一个小尝试做完后，需要熟悉的人看见并回应；用过的玩具或物品也回到原处。这类结束、确认与再开始的小步骤，是更贴近年龄的表现。" : "已经完成的练习、作品或活动得到具体回应，有的部分被认可，有的还需要补充。共同活动结束后，借用用品归还、材料收好，才算真正收尾。",
    new_collaboration: early ? "新的游戏伙伴、物品或活动方式进入熟悉生活。先观察、再试一小段，可能逐渐发现愿意一起玩的内容；是否持续参与取决于真实回应。" : "新的兴趣活动或同伴进入原来的安排，先有一次共同尝试，再决定是否继续参加。喜欢某个环节与能否适应新的配合方式，会分别显出来。"
  };
  const examples: Record<WorkKind, string[]> = {
    work_change: [early ? "熟悉的拼搭或轮流游戏里，孩子自己做一小步，难的部分再由照料者示范。" : "在实际学习、作品或同伴活动里，原先一起做的部分改为各自准备，再合到一起。", "已有活动的参与者改变后，重新约定轮流、等待和整理的顺序。"],
    study: [early ? "用一个小游戏学新词或动作，示范后让孩子按自己的节奏再试。" : "在已有练习中换一种讲解或示范，随后自己做一遍，看看哪一步还需要帮助。", "同一件小事隔一段时间再做，发现原来需要提醒的地方渐渐熟悉。"],
    proposal: [early ? "孩子把熟悉游戏换一种玩法，照料者先跟着试一会儿，再看能否继续。" : "已有画作、手工或兴趣尝试中，加入自己的想法，再根据实际回应修改一部分。", "与同伴意见不同时，分别试一次各自的做法，再决定共同保留什么。"],
    delivery: [early ? "一段熟悉游戏重复几次，孩子逐渐能够自己接着完成其中一步。" : "一幅画、一段兴趣练习或小作品分几次完成，把上次留下的部分接着做完。", "一次活动结束后把材料收好，下一次能够从熟悉的步骤继续。"],
    settlement: [early ? "拼搭、收拾或一个小尝试完成后，熟悉的人看见成果并给出明确回应。" : "已经做好的练习或作品得到具体反馈，补好其中一处，再确认完成。", "已有共同活动结束后，整理用过的东西，归还借来的材料。"],
    new_collaboration: [early ? "在照料者陪伴下试一种新游戏，先玩一小段，再看孩子是否愿意继续。" : "若实际参加新的兴趣活动或与新同伴相处，先一起完成一个小环节，再决定下次怎样参与。", "新活动需要不同物品或时间时，熟悉的人帮助把它接到原来的日常安排中。"]
  };
  return { title: titles[input.kind], summary: `${transition ? "本段跨过成年分界，具体表现仍需沿实际年龄分段阅读。" : ""}${summaries[input.kind]}`, examples: examples[input.kind] };
}

/** Language only: the caller selects the event and exact original segment.
 * This function neither chooses priority nor calculates a new event effect. */
export function buildAnnualEventReadingProse(input: AnnualEventReadingProseInput): AnnualEventReadingProse {
  if (input.age.stage === "before_birth") return { title: "出生前区间不作个人应事解读", summary: "本段早于出生，没有可对应的个人生活经历。", examples: [], applicability: [], notApplicableWhen: ["出生前不套用个人工作、学习或关系事件。"] };
  const adult = input.age.stage === "adult", relationship = input.kind === "shared_arrangements";
  const timedRelationship = relationship && input.relationshipTiming?.triggered && input.relationshipTiming.lenses.some((lens) => lens.signals.some((signal) =>
    signal.source === "year" && signal.kind !== "palace_contact" && lens.triggerSignalIds.includes(signal.id)));
  const roleTopic = buildAnnualRoleTopic(input);
  const adultSituations = !relationship && (input.domain === "career" || input.domain === "wealth")
    ? buildAdultLifeSituations({domain:input.domain,god:input.god,effect:input.effect,age:input.age,appliedWork:input.appliedWork}) : null;
  const concreteTopic = roleTopic ?? (adultSituations ? {title:adultSituations.title,summary:adultSituations.lead,examples:adultSituations.examples} : input.kind === "shared_arrangements" ? buildAnnualRelationshipTopic(input) ?? youngerTopic(input)
    : !adult ? youngerTopic(input) : input.domain === "wealth" ? wealthTopic(input.kind, input.appliedWork) : workTopic(input.kind, input.appliedWork, input.god));
  const mechanismTopic = buildAnnualMechanismTopic(input, concreteTopic);
  const topic = mechanismTopic ?? concreteTopic;
  const pressure = input.effect === "obstructs" || input.effect === "mixed";
  const everyday = adult && (!input.appliedWork || input.appliedWork === "unspecified");
  const effectText = mechanismTopic || !adult || relationship ? "" : everyday && pressure ? input.kind === "study"
    ? "原局需要把学习积累转成可见成果，本段仍有准备与实际完成之间的牵制：反复查资料或更换方法，可能使原本想做的一步迟迟没有开始。"
    : input.kind === "settlement" ? "本段仍有完成与得到确认不同步的牵制，已经付出的部分可能还需要补充说明或等待对方回应。"
      : input.kind === "new_collaboration" ? "本段也保留新增安排占用原有时间和条件的拉扯，开始参与与能够长期保持是两步。"
        : input.kind === "proposal" ? "本段仍有表达与实际配合之间的牵制，自己的想法需要经过一次真实尝试才能看清能否行得通。" : ""
    : input.kind === "study" && pressure && ["resource-output", "hurting-resource", "resource-preservation", "peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"].includes(input.path)
    ? `${["peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"].includes(input.path) ? "原局依靠产出接上经营与兑现，本段增加的学习准备需要回到现有交付中使用" : "原局需要把学习积累转成可见成果，本段仍有学习支持与输出之间的牵制"}；尤其要留意准备、审核或新方法是否挤占已经答应的交付时间。`
    : input.kind === "settlement" && pressure ? "原段同时保留兑现与承接的限制，先看验收是否完成、付款或续约条件是否已确认。"
      : input.kind === "new_collaboration" && pressure ? "原段保留新增投入与承接的拉扯，接洽可以继续，试用规模应与现有交付余量一起核对。"
        : input.kind === "proposal" && pressure ? "原段有表达或承接上的牵制，改法能否被接纳需要实际试点与授权配合。"
          : "";
  const monthText = annualRoleMonthContext(input) ?? (adult && !relationship && input.hasMonthBranchClash ? everyday ? "本年另有月柱六冲线索，可对照熟悉日程、参与者或原有共同安排的调整；这条线索没有单独改变本段判断。" : "本年另有月柱六冲线索，可对照原流程、协作人或工作安排的调整；它没有单独把本段改判为不利。"
    : adult && !relationship && input.hasMonthBranchCombination ? everyday ? "本年另有月柱六合线索，可对照共同活动、参与方式或原有约定的重新衔接。" : "本年另有月柱六合线索，可对照合作接口或共同完成方式的重新衔接。" : "");
  const applicability = input.age.stage === "adult_transition" && !relationship ? [input.age.label, "未成年部分沿学习、同伴与日常情境阅读；成年部分的在职、求职进修或自营合作例子仅在现实身份匹配时适用。"] : !adult ? [input.age.label, "本段按实际年龄使用学习、照料、同伴或中性日常情境；不套用成年工作和婚恋身份。"]
    : relationship ? [timedRelationship ? "本年按已计算的星、宫与原局作用对象给出关系候选；单身可对照新的认识或期待，不要求已经有对象。已有伴侣、已婚或已分开的例子只按相应现实身份适用。"
      : input.hasDayBranchClash || input.hasDayBranchCombination ? "共同生活或交往例需有现实中的相应关系；关系状态只用于选择适用情境。" : "仅对应个人表达和协作承诺，不作为婚恋或夫妻共同生活变化的依据。"]
      : [input.appliedWork && input.appliedWork !== "unspecified" ? "按本段已确认适用的自述生活背景给例子，不据此推断收入、职位或成果。" : "职业背景未填写，按实际匹配的在职、求职进修或自营合作条件阅读相应例子，不据例子认定已经就业或取得收入。"];
  const notApplicableWhen = ["这些是可对照的候选情境，不表示事情已发生或必然发生。",
    ...(relationship ? [timedRelationship ? "星的明透、原星互动或宫位合冲只形成本地候选窗口，不保证相识、结婚、复合或分手，不据此推定伴侣身份、性别或婚次。"
      : input.hasDayBranchClash || input.hasDayBranchCombination ? "日支合冲不保证相识、结婚或分手；没有相应关系背景时不套用伴侣事件。" : "只有日干互动或一般合作主题时，不扩为婚恋事件。"] : ["没有相应职业、项目或合作背景时，不把例子解释为必定换岗、录用、加薪或回款。"]),
    ...(!adult ? ["儿童和年龄未定时不采用成人自述中的岗位、客户、收入或婚恋情境。"] : []),
    ...(relationship && (timedRelationship || input.hasDayBranchClash || input.hasDayBranchCombination) ? [timedRelationship
      ? "年度关系触发与大运背景分开阅读；大运只补充同一分支、同一实际时段的背景，同向不增加发生概率，相反也不直接判凶。"
      : "年度日支互动说明本年共同安排的主题；大运关系只补充同一分支、同一实际时段的背景，同向不增加发生概率，相反也不直接判凶。"] : []),
    ...(!relationship && ["neutral", "unresolved"].includes(input.effect) ? ["本年透干未单独给出助阻方向；事件主题不借支内或大运背景的作用改判该透干。"] : []),
    ...(!relationship && ["neutral", "unresolved"].includes(input.patternEffect) ? ["原段结构未给单一助阻方向；事件主题不另添吉凶或发生概率。"] : [])];
  return { title: topic.title, summary: `${topic.summary}${effectText}${monthText}`, examples: [...topic.examples], applicability, notApplicableWhen,
    ...("reasoning" in topic && Array.isArray(topic.reasoning) ? { reasoning: [...topic.reasoning] } : {}) };
}
