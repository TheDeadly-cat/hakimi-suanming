import type { AnnualEventReadingProse, AnnualEventReadingProseInput } from "./annual-event-reading-prose";
import { buildNatalTransitTaskProse } from "./outlook-task-link-prose";
import { ANNUAL_EVENT_SIGNALS_VERSION } from "./annual-event-signals";
import { strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { buildAdultLifeSituations, type AdultSituationMechanism } from "./adult-life-situations";
import { NATAL_WEALTH_RESOURCE_TASK_VERSION, type NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";

type Topic = Pick<AnnualEventReadingProse, "title" | "summary" | "examples" | "reasoning">;
type Mode = { task: string; result: string; support: string; resources: string; participants: string; prefix: string };
type Story = { title: string; object: string; advance: string; friction: string; examples: [string, string] };
const unique = <T>(values: readonly T[]) => [...new Set(values)];
type LifePhase = { stage: AnnualEventReadingProseInput["age"]["stage"]; age: number | null; label: string };
function lifePhases(input: AnnualEventReadingProseInput): LifePhase[] {
  if (input.age.stage !== "unknown" && input.age.stage !== "before_birth" && input.age.segments.length > 1) {
    return input.age.segments.map((segment) => ({ stage: segment.stage, age: segment.startAge, label: segment.label }));
  }
  return [{ stage: input.age.stage, age: input.age.startAge, label: input.age.label }];
}
const isChild = (phase: LifePhase) => phase.stage === "young_child" || phase.stage === "youth";
type DeterminateTask = "wealth_first" | "resource_first" | "official_joint";
function taskFor(input: AnnualEventReadingProseInput): DeterminateTask | null {
  const context = input.patternContext!, task: NatalWealthResourceTask | undefined = context.natalTask;
  const paths = { wealth_first: "hurting-wealth", resource_first: "hurting-resource", official_joint: "official-resource" } as const;
  if (!task || task.version !== NATAL_WEALTH_RESOURCE_TASK_VERSION || task.includeHour !== context.scope.includeHour
    || !["wealth_first", "resource_first", "official_joint", "conditional", "not_applicable"].includes(task.task)) throw new Error("年度事项缺少同源本命任务。");
  if (task.task === "conditional" || task.task === "not_applicable") {
    if (task.preferredPathId !== null) throw new Error("年度事项的未定本命任务含不一致路径。");
    return null;
  }
  if (!task.applicable || task.preferredPathId !== paths[task.task] || task.preferredPathId !== input.path
    || task.pairs.length !== 1 || !task.pairs[0]!.separatedByPeers
    || (!task.includeHour && [task.pairs[0]!.wealth, task.pairs[0]!.resource, ...task.pairs[0]!.intervening].some(actor => actor.position === "hour"))) throw new Error("年度事项的本命任务、对象或原路径不一致。");
  return task.task;
}

function modeFor(input: AnnualEventReadingProseInput, stage = input.age.stage, age = input.age.startAge): Mode {
  if (stage === "young_child") return { task: "游戏、表达和日常活动", result: "一次小尝试的完成", support: "照料回应与示范", resources: "陪伴时间、用品和活动空间", participants: "照料者与同伴", prefix: "按这一段的幼儿年龄" };
  if (stage === "youth") return age !== null && age < 12
    ? { task: "阅读、动手练习、小作品与同伴游戏", result: "自己完成的一件小作品或小事情", support: "大人的讲解、示范与反复练习", resources: "陪伴时间、图书、画笔和活动材料", participants: "家人、指导者与同伴", prefix: "按这一段的儿童年龄" }
    : { task: "兴趣作品、自主练习与同伴活动", result: "能讲清过程、可以展示的作品", support: "具体反馈、参考材料与练习方法", resources: "练习时间、材料和可获得的指导", participants: "指导者与同伴", prefix: "按这一段的青少年年龄" };
  if (stage === "unknown" || stage === "before_birth") return { task: "已有日常任务与共同事项", result: "一件事情的完成", support: "说明、方法与可获得的帮助", resources: "可用时间、物品和共同条件", participants: "实际参与者", prefix: "年龄与现实身份未锁定，按已有日常事项" };
  const work = input.appliedWork;
  if (work === "student") return { task: "课程、课题与实践安排", result: "作品或阶段学习成果", support: "指导、资料与练习方法", resources: "学习时间、材料和活动费用", participants: "指导者与课题伙伴", prefix: "按已填写的学生背景" };
  if (work === "caregiving") return { task: "照料日程与交接", result: "一段照料安排的落实", support: "照料方法、示范与替补协助", resources: "照料时间、用品和共同承担的费用", participants: "家人、服务者与共同照料者", prefix: "按已填写的照料背景" };
  if (work === "retired") return { task: "自愿活动与已有生活安排", result: "一次活动或共同约定的完成", support: "经验、活动方法与同伴协助", resources: "个人愿意投入的时间、物品和活动费用", participants: "活动伙伴与实际参与者", prefix: "按已填写的退休背景" };
  if (work === "seeking_work") return { task: "岗位申请、材料与试做", result: "可供核验的材料或试做成果", support: "岗位信息、方法和实际反馈", resources: "准备时间、材料和往返条件", participants: "联络方与实际协作者", prefix: "按已填写的求职背景" };
  if (work === "self_employed") return { task: "已有服务、客户需求与合作事项", result: "约定的交付成果", support: "专业方法、工具与协作支持", resources: "服务时间、工具和已约定投入", participants: "客户与合作方", prefix: "按已填写的自营背景" };
  if (work === "employed") return { task: "已有工作、职责与协作事项", result: "可以验收的完成结果", support: "方法、指导与执行支持", resources: "可调用的时间、工具、预算和协助", participants: "负责人、同事与协作方", prefix: "按已填写的在职背景" };
  return { task: "学习准备、能力应用与共同事项", result: "可展示、使用或得到确认的成果", support: "说明、方法与能够落实的帮助", resources: "时间、工具、材料和已经安排的投入", participants: "实际参与者", prefix: "按尚未填写职业背景的成年阶段" };
}

/** The natal task selects the job of an actor, never its yearly effect. This
 * branch owns the complete topic so later kind/path adapters cannot replace a
 * protection/moderation task with generic output adoption. */
function taskStory(input: AnnualEventReadingProseInput, task: DeterminateTask, m: Mode): Story {
  const money = input.domain === "wealth", group = strengthTenGodGroup(input.god), regular = input.god === "正财";
  const occasion = regular ? "已做事项的确认与继续使用" : "新的用途或参与安排";
  if (task === "wealth_first") return {
    title: money ? "重复投入的取舍与必要支持" : group === "wealth" ? regular ? "既有用途带动准备取舍" : "新用途与重复准备的取舍" : group === "resource" ? "新增方法与原有准备的取舍" : "实际完成与准备范围的配合",
    object: money ? `${m.resources}在实际使用和继续准备之间的分配，是本段重点；重复投入与必要支持需要分开`
      : group === "wealth" ? `${occasion}把原有准备带到具体用途面前；重复的方法可以比较取舍，完成事情必需的指导和帮助仍有位置`
      : group === "resource" ? `新加入的方法与原有准备需要分清用途，已经适用的支持仍有其位置`
        : `${m.task}中的参与、表达或要求，牵动准备范围与实际用途的配合`,
    advance: money ? `${m.resources}较有条件从重复准备转到明确用途，必要支持得以继续使用`
      : group === "wealth" ? `实际用途较能帮助收拢重复准备，已有方法可以接回${m.task}` : `眼前配合较能让准备服务实际完成，重复环节有了调整的余地`,
    friction: group === "resource" ? money ? `新增资料或方法继续占用${m.resources}，用途重叠的准备尚未收拢` : `新的说明、方法或准备叠到原有积累上，真正用起来的部分容易被推后`
      : group === "wealth" ? money ? `原本可用于筛选准备的投入受到牵连，${m.resources}仍分散在重复或未落实的用途里` : `实际用途本身仍有牵制，不能照原设想带动准备收拢，已有积累仍可能停在准备环节`
        : `新的参与或要求牵动原来用于收拢准备的条件，实际完成与仍在准备的部分没有同步`,
    examples: money ? [`若${m.task}已有几套资料或用品并行，实际使用会显出用途重叠与仍不可缺少的部分。`, `${m.resources}分到不同准备环节时，某一部分进入使用，另一部分仍保留原有用途。`]
      : [`若${m.task}已准备过几种办法，眼前真正要做的一步会显出哪些能直接用、哪些仍需保留。`, `同一件事同时有几种说明或方法时，实际完成与继续准备各占一段时间。`]
  };
  if (task === "resource_first") return {
    title: money ? "必要支持与其他投入的分工" : group === "wealth" ? regular ? "原约定与必要支持的衔接" : "新用途与必要支持的分工" : group === "output" ? "继续完成所需的指导与帮助" : "必要指导与实际完成的衔接",
    object: money ? `必要指导、用品与练习所需的投入仍要保留；${m.resources}在原有支持和其他用途之间的分配，是本段重点`
      : group === "wealth" ? `${occasion}与正在做的事情争取同一份配套；必要的${m.support}仍是这一项的支点`
      : group === "output" ? `继续做出或表达的内容，需要有${m.support}接住，不能只增加完成的范围`
        : `必要的指导、方法与练习仍是继续完成的支点；本段关注这些支持在${m.task}中的实际使用`,
    advance: money ? `必要的支持较有条件保留下来，${m.resources}能够接到原来缺配套的一步`
      : `适用的指导或帮助较能接到已经展开的事情，使原来缺支持的部分继续完成`,
    friction: group === "output" ? money ? `持续做与反复修改继续消耗${m.resources}，必要帮助尚未同步` : `想继续做或说的部分超过当前支持能接住的范围，熟悉的部分也容易中断`
      : group === "wealth" ? money ? `${occasion}牵动原来必要的指导、练习时间或用品，原支持不能照旧调用` : `${occasion}牵动原来必需的${m.support}，事情仍想完成，关键步骤却可能缺少配套`
        : `需要的${m.support}本身仍有牵制，补入方法或准备不等于已经能接到实际完成`,
    examples: money ? [`若${m.task}仍依赖一段指导或专用条件，其他用途进入后，两边会用到同一份${m.resources}。`, `一部分内容已经展开，另一部分仍需原来的方法或帮助，准备与继续使用各有具体占用。`]
      : [`若${m.task}有一步尚不能独立完成，示范、练习或协助是否接得上，会直接影响那一步能否继续。`, `一件事已经开始，新的安排又使用原来那份帮助，原进度与新用途需要衔接。`]
  };
  return {
    title: money ? "既定承担与执行配套的分工" : group === "wealth" ? regular ? "原约定确认与执行支持" : "新用途与既定要求的配套" : "明确要求与可用方法相互配合",
    object: money ? `${m.resources}需要分别支持已经约定的承担和具体执行，投入到位与方法配套是相连但不同的环节`
      : group === "wealth" ? regular ? "原约定进入确认或续用环节，答应完成的要求与实际可用的配套需要一起衔接"
        : "新的用途进入既有安排，原来的要求与执行所需支持也需要一起衔接"
      : `已经明确的要求与完成${m.task}所需的${m.support}各有作用，不能只落实其中一边`,
    advance: money ? `投入较能接到既定承担所需的配套，${m.resources}各有实际用途`
      : `明确要求较有条件获得可依循的方法或协助，原来必须完成的部分有了实际步骤`,
    friction: group === "wealth" ? money ? `${occasion}牵动原来供执行使用的时间、工具或指导，既定承担仍需配套` : `${occasion}牵动执行所需的方法与支持，原有要求仍在，配套却未同步`
      : `眼前这项配合仍有牵连，已有要求与可用的${m.support}未能接到同一步，不能仅凭其中一项齐备就认定顺畅`,
    examples: money ? [`若${m.task}已有明确约定，所用的时间、用品和帮助分别支持其中的实际步骤。`, `完成内容需要确认或继续时，原定投入与还需要的配套一起进入安排。`]
      : [`若${m.task}已说明完成要求，一份方法或一次协助还需要接到具体操作，事情才有继续的步骤。`, `要求已经说清，实际准备与执行各有一段安排，其中一边变化会牵动另一边。`]
  };
}

function taskMechanism(input: AnnualEventReadingProseInput, task: DeterminateTask): AdultSituationMechanism {
  const group = strengthTenGodGroup(input.god);
  if (task === "wealth_first" && ["wealth", "resource"].includes(group!)) return "resource_moderation";
  if (task === "resource_first" && ["wealth", "resource"].includes(group!)) return "resource_protection";
  if (task === "resource_first" && group === "output") return "output_overload";
  if (task === "official_joint" && ["wealth", "resource", "authority"].includes(group!)) return "authority_resource";
  return input.targetAction!.blockers.length ? "general_constraint" : "role";
}

function buildTaskTopic(input: AnnualEventReadingProseInput, task: DeterminateTask, concreteTopic?: Topic | null): Topic {
  const context = input.patternContext!, actor = input.targetAction!, phases = lifePhases(input), money = input.domain === "wealth";
  const render = (phase: LifePhase) => {
    const m = modeFor(input, phase.stage, phase.age), story = taskStory(input, task, m);
    const age = { ...input.age, stage: phase.stage, startAge: phase.age, label: phase.label,
      segments: input.age.segments.filter(segment => segment.stage === phase.stage && segment.label === phase.label) };
    const situations = buildAdultLifeSituations({ domain: money ? "wealth" : "career", god: input.god, effect: actor.effect,
      appliedWork: input.appliedWork, mechanism: taskMechanism(input, task), age });
    const result = actor.effect === "assists" ? `${story.advance}。` : actor.effect === "obstructs" ? `${story.friction}。`
      : actor.effect === "mixed" ? `${story.advance}；同时，${story.friction}。`
        : "这项作用目前未单独定向，不能仅凭主题认定支持已经落实或牵制已经解除。";
    // The shared constructor supplies conditional identities only for an
    // unspecified adult. Confirmed and young contexts retain their own mode.
    const examples = situations?.examples ?? story.examples.map((example, index) => index === 0
      ? `${example}${actor.effect === "assists" ? `${story.advance}。` : actor.effect === "obstructs" ? `${story.friction}。` : actor.effect === "mixed" ? `${story.advance}；同时，${story.friction}。` : "具体支持与使用范围仍需沿本段条件判断。"}` : example);
    return { title: story.title, text: `${story.object}。${result}`, examples };
  };
  const rendered = phases.map(render), hidden = input.mainQiAction;
  const overall = actor.effect === "assists" && ["obstructs", "mixed"].includes(context.effect)
    ? "这一项可发挥的部分仍与同段其他牵制并存，不能把局部支持当作整个安排都已顺畅。"
    : ["neutral", "unresolved"].includes(actor.effect) && ["obstructs", "mixed"].includes(context.effect)
      ? "这项主题尚未单独定向；同段原结构还保留其他牵制。" : "";
  const rescue = !context.rescues.length ? "" : task === "resource_first"
    ? "转圜需要把其他用途的占用约束住，让必要的指导和练习仍能继续；本段所列缓冲条件尚须落实。"
    : task === "wealth_first" ? "转圜需要实际用途带动重复准备收拢，同时保留仍不可缺少的支持；本段所列缓冲条件尚须落实。"
      : "转圜需要让既定要求与执行配套重新接上；本段所列缓冲仍有成立条件，不表示原牵制已经解除。";
  const separate = ["neutral", "unresolved"].includes(actor.effect) && hidden && ["assists", "mixed"].includes(hidden.effect)
    ? `本年透${actor.stem}${actor.tenGod}与支内${hidden.stem}${hidden.tenGod}分开读：后者另有支持线索，不能借此把透干主题改写成全年顺利。` : "";
  const roleTechnical = input.kind === "work_change" && actor.effect === "obstructs"
    ? money ? "原段对该透干保留资源承接上的牵制，投入与使用范围是本项需要核对的限制。" : "原段对该透干保留配合上的牵制，要求与实际可承担范围是本项需要核对的限制。" : "";
  return { title: rendered[0]!.title,
    summary: rendered.map((row, index) => `${phases.length > 1 ? `${phases[index]!.label}部分：` : ""}${row.text}`).join("") + overall + rescue,
    examples: rendered.flatMap((row, index) => row.examples.map(example => `${phases.length > 1 ? `${phases[index]!.label}部分：` : ""}${example}`)),
    reasoning: unique([context.natalTask.summary, context.summary, ...context.rescues, ...context.unresolvedConditions, ...(separate ? [separate] : []),
      ...(roleTechnical && concreteTopic?.summary.endsWith(roleTechnical) ? [roleTechnical] : [])]) };
}

function adultSituationsFor(input: AnnualEventReadingProseInput, phase: LifePhase) {
  if (input.domain !== "career" && input.domain !== "wealth") return null;
  const group = strengthTenGodGroup(input.god), constrained = Boolean(input.targetAction?.blockers.length);
  // Indexed blockers are already verified by the caller. Without a typed
  // target kind this layer keeps their actual reason in reasoning and does not
  // invent which natal star was tied or controlled from the path alone.
  let mechanism: AdultSituationMechanism = constrained ? "general_constraint" : "role";
  if (!constrained) {
    if (input.path === "resource-wealth" && (group === "wealth" || group === "resource")) mechanism = "resource_moderation";
    else if (input.path === "hurting-resource" && group === "output" && ["obstructs", "mixed"].includes(input.effect)) mechanism = "output_overload";
    else if (input.path === "hurting-resource" && (group === "wealth" || group === "resource")) mechanism = "resource_protection";
    else if (["official-resource", "killings-resource"].includes(input.path) && (group === "resource" || group === "authority")) mechanism = "authority_resource";
    else if (["peer-output-wealth", "food-wealth", "wealth-food", "hurting-wealth"].includes(input.path) && (group === "output" || group === "wealth")) mechanism = "output_to_wealth";
  }
  const segments = input.age.segments.filter((segment) => segment.stage === phase.stage && segment.label === phase.label);
  return buildAdultLifeSituations({ domain: input.domain, god: input.god, effect: input.effect, appliedWork: input.appliedWork, mechanism,
    age: { ...input.age, stage: phase.stage, startAge: phase.age, label: phase.label, segments } });
}

function storyFor(input: AnnualEventReadingProseInput, m: Mode): Story | null {
  const money = input.domain === "wealth", group = strengthTenGodGroup(input.god);
  switch (input.path) {
    case "resource-wealth": return {
      title: money ? "准备投入与实际用途的取舍" : group === "resource" ? "新增准备怎样进入实际使用" : group === "peer" ? "共同安排牵动原有投入" : group === "authority" ? "新增要求改变投入与支持的分工" : "实际用途带动准备收拢",
      object: `${m.task}中的准备与实际用途重新对应`,
      advance: `已有积累较有条件收拢到一个明确用途，${m.resources}开始支持真正用得上的部分`,
      friction: group === "peer" ? `${m.participants}的决定权或共同使用条件牵动原有投入，已经排好的准备与使用范围可能需要重排`
        : group === "authority" ? `新增要求把${m.resources}引向另一项承担，原来用于调节准备的条件受到挤压`
          : `准备、材料或方法继续加层，${m.result}却可能没有同步推进`,
      examples: group === "peer" ? [`${m.participants}改变了共同使用的条件，原先已经排好的准备或投入需要重排。`, `原来可以独立决定的投入，后来需要共同确认范围，部分准备因此等待或换一种方式继续。`]
        : group === "wealth" ? [`一项明确的实际用途出现后，原先积累的资料、方法或支持开始被选用。`, `${m.resources}进入一项具体安排，同时展开的准备被缩到这件事真正需要的范围。`]
          : group === "output" ? [`一种新的表达或成果进入${m.task}，实际反馈开始改变原先的准备方向。`, `${m.result}需要新的投入，原来的准备、使用与确认之间又多出一段衔接。`]
            : [`${m.task}新增一种方法或准备环节，后来只有与眼前用途相连的部分进入实际使用。`, `${m.resources}的使用范围重新确定后，原来并行的准备出现合并、暂缓或替换。`]
    };
    case "food-killings": return {
      title: money ? "解决难点所需条件与新增负担" : "现成方法与眼前难点的衔接",
      object: `原来处理难点的步骤怎样继续用于${m.task}`,
      advance: `已经会用的方法较有条件接住明确要求，${m.result}能沿可重复的步骤向前推进`,
      friction: group === "wealth" ? `新增投入也带来更多需要处理的要求，原来解决难点的方法还在，所要应对的负担却可能继续增加`
        : group === "authority" ? `原本面对的要求又加入另一套职责或更集中压力，现成办法需要重新区分正在处理哪个对象`
          : `新要求或新的${m.support}介入后，原解决步骤受到牵动，事情仍要求完成，办法却可能需要重新衔接`,
      examples: [`${m.task}原本已有熟悉做法，新的要求使其中一步进入复核、示范或小范围重试。`, `同一事项既要保持完成节奏，又要重新获得${m.support}，两者在一个具体环节发生争用。`]
    };
    case "official-resource": return {
      title: money ? "已有职责与配套支持的落实" : "得到方法或指导后承接职责",
      object: `${m.support}怎样接上已经明确的要求`,
      advance: `原来只知道必须完成的事项，较有条件得到可依循的办法，随后逐步接到${m.result}`,
      friction: group === "wealth" ? `新增用途占用原本支持${m.task}的条件，必要的方法、指导或协助可能被挤开，职责却仍需要完成`
        : `要求已经明确，${m.support}却未必同步到位，名义上有人指导与实际能独立完成之间仍有距离`,
      examples: [`${m.task}进入指导、示范或试做阶段，完成过程逐渐有了可依循的步骤。`, `一项已经答应的安排需要继续落实，但${m.resources}或可获得的帮助尚未完全接上。`]
    };
    case "official-wealth": return {
      title: money ? "投入条件与正式承担的对应" : "资源进入后怎样落实明确要求",
      object: `${m.resources}与需要完成的标准一同明确`,
      advance: `既有投入较有条件接上职责或约定，${m.result}的完成范围与确认方式更清楚`,
      friction: `需要承担的要求增加，但使用条件、决定权限或投入范围没有同步，完成与配套出现错位`,
      examples: [`${m.task}从口头安排进入清单或明确约定，使用条件和完成标准同时被提出。`, `已有投入支持了其中一部分要求，另外一部分仍等待${m.participants}确认承担范围。`]
    };
    case "killings-resource": return {
      title: money ? "紧迫事项所需的实际支援" : "紧迫要求能否获得方法与支援",
      object: `集中要求与${m.support}能否接在同一段安排里`,
      advance: `较难或较急的事项有机会得到处理框架，原先只能硬接的要求逐渐分成可以完成的步骤`,
      friction: `集中要求先到，方法或协助仍在后面，${m.resources}可能同时被几个事项占用`,
      examples: [`${m.task}出现较短的完成窗口，${m.participants}提供了部分方法或协助。`, `原定步骤与临时要求重叠，有的环节能继续，有的仍等待工具、说明或替补。`]
    };
    case "resource-output": return {
      title: input.kind === "proposal" ? money ? "改进试用的投入与采用范围" : "改法进入试用，已有积累形成成果"
        : input.kind === "settlement" ? money ? "已有投入与成果确认条件" : "已有成果进入确认与后续安排"
          : money ? "已有积累的使用与兑现条件" : "已有知识怎样变成可用成果",
      object: input.kind === "settlement" ? "已有成果的认可、费用承担与后续使用如何衔接" : input.kind === "proposal" ? "已有方法怎样成为可展示、可试用的改进" : `过去积累的${m.support}怎样进入实际应用`,
      advance: input.kind === "settlement" ? "已完成的部分较有条件获得明确认可，验收所需说明与下一阶段安排能够继续衔接"
        : input.kind === "proposal" ? "已有积累较有条件支撑一次具体试点，改法能通过样稿或演示得到可比较的反馈"
          : `已有准备较有条件用到眼前的事情中，${m.result}能够沿清楚步骤推进`,
      friction: input.kind === "settlement" ? "成果虽已完成，补充说明、认可标准或后续维护仍未对齐，完成与得到确认之间可能还有反复"
        : input.kind === "proposal" ? "改法已经能够说明，原有依据、接受标准或试用范围却仍有分歧，提案与被采用之间可能停顿"
          : `继续准备与按时呈现互相挤压，已经理解的内容仍可能卡在怎样做出来、说明白`,
      examples: input.kind === "settlement" ? [`${m.task}已有一部分完成，对方可能要求补充记录或说明；后续采用与继续承担的范围一起进入讨论。`, "已做出的成果先获得一部分确认，尚需修改或补材料的部分继续处理。"]
        : input.kind === "proposal" ? [`已有方法形成一份样稿或演示，试用者的反馈使原先设想出现可比较的差别。`, "改法进入小范围试用，另一轮资料补充或修改仍占用同一段时间。"]
          : [`过去学到或整理的方法用于${m.task}，实际反馈与原先设想出现可比较的差别。`, `${m.result}需要展示或使用时，另一轮资料补充、修改或准备仍占用同一段时间。`]
    };
    case "resource-preservation": return {
      title: money ? "必要支持与其他投入的取舍" : "必要支持能否持续接到应用",
      object: `${m.support}在其他安排增加后能否继续发挥`,
      advance: `原本需要的支持较有条件保留下来，${m.task}能够沿已有办法继续，而非每次重新准备`,
      friction: `其他事项占用${m.resources}，原来依靠的指导、材料或方法支持可能需要重新接续`,
      examples: [`原有安排增加了另一项用途，${m.support}能否照常提供成为具体问题。`, `${m.task}的一部分已经可以完成，另一部分仍依赖原先的指导或条件。`]
    };
    case "hurting-resource": return {
      title: money ? "改法所需依据与实际投入" : "新意见怎样经过依据校正后使用",
      object: `不同做法与${m.support}之间形成校正过程`,
      advance: `原先只有想法的改动较有条件变得可说明、可试用，${m.result}能够带着依据进入讨论`,
      friction: `改法与原有依据或标准互相牵制，说明过程反复，实际尝试却还未找到可接受的范围`,
      examples: [`${m.task}出现与原做法不同的意见，经过示范、说明或对照后再决定是否试用。`, `一种改法已经有可见样例，但${m.participants}仍在确认它依据什么、改动到哪里。`]
    };
    case "peer-output-wealth": return {
      title: money ? "共同产出与资源安排的衔接" : "个人办法进入共同完成的过程",
      object: `个人想法、实际产出与${m.resources}的承接连起来`,
      advance: `已有能力较有条件转成可确认的成果，${m.participants}能围绕具体完成内容接上协作`,
      friction: group === "resource" ? `新的准备、依据或指导占用实际呈现的时间，原有输出可能被压住，已经会做的部分也需要重新找到使用出口`
        : group === "authority" ? `完成标准或职责要求限制原来的表达与做法，已有成果需要与规则重新衔接`
          : group === "peer" ? `共同推进与主导权、成果归属或投入分配发生拉扯，能力本身并不能替代兑现条件`
            : `产出和需求的衔接受到牵制，完成内容与实际承接范围可能不同步`,
      examples: group === "resource" ? [`${m.task}又增加资料、方法或指导要求，原先可以呈现的部分转回准备或修改。`, `${m.result}已有雏形，但继续补充依据占用了实际使用或交付的时间。`]
        : group === "authority" ? [`已有做法遇到新的标准或职责要求，成果进入复核、改版或重新说明。`, `${m.participants}对完成方式提出约束，原来的表达或使用范围随之调整。`]
          : [`${m.task}从各自尝试进入共同完成，原来的分工或成果归属随之明确。`, `${m.result}已经形成，但参与者对投入、使用或后续维护仍有不同安排。`]
    };
    case "wealth-food": return {
      title: money ? "实际需求与可持续完成的投入" : "已有需求怎样获得稳定回应",
      object: `明确需求与能够持续使用的方法相互衔接`,
      advance: `原来已经需要完成的事项较有条件获得稳定做法，${m.result}不再只依赖一次临时发挥`,
      friction: `需求不断增加，但完成方法、使用时间或维护条件没有同步，已有投入与实际结果产生落差`,
      examples: [`${m.task}需要重复完成同类内容，已有方法逐渐形成固定步骤。`, `提出的需求增加或改变，原有${m.resources}却仍按旧范围安排。`]
    };
    case "food-wealth": return {
      title: money ? "稳定完成之后的确认与承接" : "重复完成怎样变成连续成果",
      object: `熟悉的方法能否稳定形成${m.result}`,
      advance: `一贯会做的内容较有条件连续完成，确认、使用与后续安排更容易衔接`,
      friction: `完成次数增加，质量、所需时间与后续维护却不同步，原本稳定的步骤可能被追加事项打断`,
      examples: [`${m.task}按相近步骤重复进行，成果需要连续保持同一标准。`, `上一轮已经完成，下一轮又有追加内容，${m.resources}和后续维护随之重新分配。`]
    };
    case "hurting-wealth": return {
      title: money ? "改进价值与实际采用的条件" : "改进意见怎样得到实际试用",
      object: `新的做法从表达意见走向可比较的试用`,
      advance: `改进较有条件对应真实需要，${m.result}能用可见变化说明价值，而非只停在不同看法`,
      friction: `改法已经提出，${m.participants}对适用范围或接受标准仍不一致，表达与实际采用之间出现距离`,
      examples: [`${m.task}用一个样例比较新旧做法，实际差异成为继续讨论的依据。`, `一种改法受到关注，但正式使用、投入范围或完成确认仍未同步。`]
    };
    default: return null;
  }
}

function resourceStory(input: AnnualEventReadingProseInput, m: Mode, story: Story): Story {
  if (input.domain !== "wealth") return story;
  const group = strengthTenGodGroup(input.god);
  const tasks: Record<string, [string, string, string, string]> = {
    "resource-wealth": ["准备投入与实际使用的范围重新对应", `${m.resources}较有条件从重复准备转到明确用途，已投入的部分开始得到实际使用`,
      group === "peer" ? `共同使用条件或决定权牵动原投入，原先可用于筛选准备的资源需要重新分配` : group === "authority" ? `新增要求占用了原有投入，原本用于实际应用的部分又转向配套或准备` : `新增准备继续占用${m.resources}，实际用途未同步，能调整的投入也可能被固定下来`,
      `${m.resources}中有一部分原本用于准备，后来改到实际使用；另一部分因用途未定而暂留。`],
    "food-killings": ["处理难点所需条件与追加负担相互牵动", `${m.resources}较有条件集中到真正解决难点的环节，使原有方法能够持续使用`,
      group === "wealth" ? `新增投入同时带来更多要求，补入的条件与追加的任务并不完全相抵` : `方法还在，但执行所需时间、工具或协助受到挤压，已有资源未能完整接到解决步骤`,
      `某个难点已有处理方法，实际执行却仍要等待一段时间、一项工具或一次协助；追加要求又占用同样条件。`],
    "official-resource": ["已经承担的要求能否获得对应配套", `${m.resources}较有条件接到必要指导和执行环节，原本只有要求的事项开始有具体支撑`,
      `责任已经明确，所需的指导、时间或工具却未同步，实际投入可能先于支持落实`,
      `一项已经承担的安排需要明确配套，现有支持可覆盖其中一部分，余下部分仍待落实。`],
    "official-wealth": ["投入的使用权限与需要履行的标准同步确认", `${m.resources}较有条件与明确承担相配，投入去向和完成确认之间的关系更清楚`,
      `投入带来相应要求，但使用权限、承担范围或后续维护并未一起明确`,
      `一份投入附带新的使用条件或完成要求，${m.participants}重新确认由谁承担哪一部分。`],
    "killings-resource": ["集中要求占用的支援与恢复条件", `${m.resources}较有条件接上急需处理的环节，原本难以独立承担的部分获得实际协助`,
      `几项紧迫需要争用同一份时间、工具或协助，临时投入可能挤占原有安排`,
      `集中事项同时需要相同配套，有的环节先获得支持，另一些仍需等待或调整完成范围。`],
    "resource-output": input.kind === "settlement" ? ["已有投入随成果确认与后续承担衔接", "已投入的时间、材料或费用较有条件随成果一并确认，原约定的承担、继续使用与后续维护可接着明确",
      "成果已有，费用承担、认可范围或后续维护却还未对齐，已投入部分与继续承担之间可能反复核对",
      "已完成部分进入确认，原先投入的时间、物品或费用一并核对；继续使用和后续维护另行约定。"] : ["过去准备的成本能否进入实际使用", `${m.resources}较有条件随已有方法一起进入应用，过去投入不再只停在准备阶段`,
      `持续准备仍在占用时间和条件，已有成果的使用、确认或后续投入却未同步`,
      `一项已经投入时间或材料的方法开始被使用，但后续修改和维护仍继续占用同一份条件。`],
    "resource-preservation": ["必要支持的延续与其他用途之间的取舍", `原本支持${m.task}的时间、工具或协助较有条件保留下来，已有安排能够继续`,
      `其他用途占用原先必要的支持，原有指导、工具或可用时间不再能按旧方式提供`,
      `同一份时间或物品出现第二种用途，原来依赖它完成的事项需要重新确认可用范围。`],
    "hurting-resource": ["改法验证所需投入与正式采用之间的距离", `${m.resources}较有条件支持有依据的试用，说明和验证逐步接到实际采用`,
      `反复说明或补充依据继续占用投入，正式使用的范围和条件却仍未清楚`,
      `一个改法已有样例，验证和修改又需要额外投入，而正式采用范围仍在讨论。`],
    "peer-output-wealth": ["个人完成、共同投入与资源承接的分配", `${m.resources}较有条件接上已经形成的成果，完成、使用与后续承担逐渐对应`,
      group === "resource" ? `更多时间或工具转去准备，已有成果的实际使用与确认被挤到后面` : group === "authority" ? `新的标准或责任改变投入条件，已有成果未能沿原方式确认使用` : `自己可支配与共同使用的部分发生争用，成果已见但投入或承接范围仍在拉扯`,
      group === "resource" ? `原计划用于实际呈现的一段时间或物品被转去补充准备，成果使用因此重新排期。` : `已有成果需要继续使用或维护，但个人提供、共同调用和后续承担的范围还未完全对应。`],
    "wealth-food": ["既有需要与稳定完成所需投入的对应", `${m.resources}较有条件支持持续使用的方法，原来明确的需要能够得到连续回应`,
      `需要的数量或范围改变，原有时间、材料与维护安排却仍按旧规模配置`,
      `同类事项开始重复进行，所用条件和持续维护也随之增加，原投入范围需要重新核对。`],
    "food-wealth": ["连续成果的使用、维护与后续承接", `稳定完成较有条件带来明确使用与确认，${m.resources}可以沿重复做法持续安排`,
      `连续完成占用的时间或材料增加，后续确认和维护条件却没有同步`,
      `一轮成果已经完成，后续使用或维护仍继续占用条件，与下一轮准备发生重叠。`],
    "hurting-wealth": ["改进试用的投入能否得到明确承接", `${m.resources}较有条件用在能够验证价值的改动上，试用与正式使用的范围开始分清`,
      `改进已经投入，但继续试用、额外修改与正式采用的条件仍混在一起`,
      `一项改动在试用中增加了材料或时间投入，但哪些属于试用、哪些进入正式采用仍待确认。`]
  };
  const selected = tasks[input.path];
  return selected ? { ...story, object: selected[0], advance: selected[1], friction: selected[2], examples: [selected[3], `已有${m.resources}被分到不同用途，部分安排能够继续，另一部分仍受本段所列实际条件限制。`] } : story;
}

type LifeObjects = { study: string; proposal: string; delivery: string; settlement: string; new_collaboration: string; costs: string };
function lifeObjects(input: AnnualEventReadingProseInput, stage = input.age.stage, age = input.age.startAge): LifeObjects {
  if (stage === "young_child") return { study: "新游戏、生活步骤与大人的示范", proposal: "孩子表达的玩法或小尝试", delivery: "熟悉的小作品与日常小任务", settlement: "已完成活动的回应、用品归还与下次安排", new_collaboration: "新的游戏伙伴或活动", costs: "陪伴时间、玩具和活动材料" };
  if (stage === "youth") return age !== null && age < 12
    ? { study: "阅读、画画、手工或一种新的练习方法", proposal: "自己想出的玩法、画法或小作品", delivery: "反复练熟的小本领、读完的一本书或做好的小作品", settlement: "做完小事情后的回应、借用物品的归还与下次约定", new_collaboration: "新的游戏伙伴、兴趣活动或一起动手的尝试", costs: "陪伴与练习时间、图书、画笔和活动材料" }
    : { study: "兴趣知识、具体练习或新的理解方法", proposal: "自己的作品构思、活动办法或不同解法", delivery: "持续打磨的作品、自主练习与共同活动", settlement: "已完成作品的反馈、活动花费与借用物品的核对", new_collaboration: "新的兴趣伙伴、自愿活动或共同创作", costs: "练习时间、参考材料、活动交通和共同用品" };
  if (stage === "adult" && input.appliedWork === "student") return { study: "课程练习、考试材料或新的学习方法", proposal: "课题选题、作品草案或展示方案", delivery: "课程作品、阶段报告与小组成果", settlement: "已交作品的评阅、学分或活动成果确认", new_collaboration: "新的课题伙伴、竞赛团队或实践活动", costs: "练习时间、学习材料、报名和活动费用" };
  if (stage !== "adult") return { study: "一项新方法及其说明或示范", proposal: "对已有做法提出的改动或样例", delivery: "已经会做的一项事情及后续交接", settlement: "已完成事项的确认、物品归还与后续约定", new_collaboration: "新的参与者或共同安排", costs: "准备时间、物品和共同费用" };
  switch (input.appliedWork) {
    case "employed": return { study: "岗位培训、资格材料或新工具学习", proposal: "流程改法、内部提案或小范围试点", delivery: "连续交付、维护记录与岗位交接", settlement: "已完成工作的验收、报销或待遇约定", new_collaboration: "外部伙伴、供应商或跨团队合作", costs: "人员时间、工具、培训费用和已批准预算" };
    case "seeking_work": return { study: "目标岗位所需的资格、工具练习或作品证明", proposal: "求职作品、面谈表达或试做方案", delivery: "申请材料、作品集与已约定的试做", settlement: "已提交试做的反馈、后续面谈与书面条件", new_collaboration: "新的岗位线索、联络方或合作试做", costs: "准备时间、资格材料、试做工具和往返费用" };
    case "self_employed": return { study: "专业进修、新工具与客户要求的资料", proposal: "客户样稿、服务方案或产品演示", delivery: "约定的服务、成品与后续维护", settlement: "已有服务的验收、回款约定与续约范围", new_collaboration: "新客户、渠道询问或短期合作", costs: "服务时间、材料、工具和试用成本" };
    case "caregiving": return { study: "照料方法、服务说明与交接信息", proposal: "接送、陪伴或家庭交接方式的调整", delivery: "一段照料日程与用品准备的落实", settlement: "已用照料服务、用品费用与共同承担的核对", new_collaboration: "新的替补协助、服务者或共同照料安排", costs: "陪伴时间、交通、照料用品与服务费用" };
    case "retired": return { study: "兴趣课程、活动技巧与经验整理", proposal: "活动改法、经验分享或兴趣作品的试做", delivery: "自愿活动、兴趣作品与已有约定的完成", settlement: "已参加活动、已用服务的费用与续用确认", new_collaboration: "新的活动伙伴、兴趣团队或自愿协作", costs: "个人愿意投入的时间、材料、交通与活动费用" };
    default: return { study: "新学的手艺、兴趣知识或使用物品的方法", proposal: "家务、出行或共同活动中的一个改法", delivery: "已经会做的饭菜、手工作品或固定生活安排", settlement: "已办事项的结果、借用物品归还与费用分摊", new_collaboration: "新的兴趣活动、伙伴邀请或短期共同安排", costs: "实际投入的时间、家中用品、交通和共同费用" };
  }
}

function kindScene(input: AnnualEventReadingProseInput, objects: LifeObjects, phase: LifePhase): { lead: string; example: string; result: string } | null {
  const money = input.domain === "wealth";
  if (isChild(phase)) {
    const early = phase.stage === "young_child", younger = early || (phase.age !== null && phase.age < 12);
    switch (input.kind) {
      case "study": return { lead: money ? `${objects.costs}可能更多地围绕${objects.study}安排；真正用得上的东西与暂时搁置的东西，会慢慢显出差别。`
        : `${objects.study}可能更常进入生活：遇到新办法时，会有看别人做、自己再试和反复问明白的过程。`,
        example: early ? "搭积木、讲故事或收拾玩具时，大人换了一种示范，孩子反复模仿，在某一步又需要陪着做。"
          : younger ? "读一本书、画一幅画或做个手工时，新的讲解带来一种做法；已经会的部分想自己试，不明白的地方还会反复询问。"
            : "练习一种兴趣技能或完成自己的作品时，参考了新的方法，实际试做又发现哪些讲解适合自己、哪些需要再问清楚。", result: younger ? "一次看懂并亲手做出的尝试" : "新方法进入自己的练习" };
      case "proposal": return { lead: money ? `围绕${objects.proposal}，原有材料能不能用、要占用多少陪伴或练习时间，可能成为具体分歧。`
        : `${objects.proposal}更值得留意；想按自己的办法试一次，也会在别人看懂、愿意一起做的过程中作调整。`,
        example: early ? "同一个玩具想出另一种玩法，先做给大人或同伴看，对方的回应又让玩法改变。"
          : younger ? "想给游戏换一条规则，或把画面、手工做得不一样；做出一个小样后，同伴提出另一种看法。"
            : "对共同活动提出不同做法，或拿出自己的作品初稿；在交流和试做中，看见哪些想法被理解、哪些还要改。", result: "自己的办法被看见和试过" };
      case "delivery": return { lead: money ? `${objects.delivery}若反复进行，材料消耗、收拾用品和下次能否继续，会比单次买齐东西更突出。`
        : `本段更突出${objects.delivery}；一次做成之后还愿不愿意再做、能否保留熟悉步骤，是比较具体的表现。`,
        example: money ? younger ? "画纸、拼搭材料或借来的图书一再使用，有的用完了，有的需要收好留到下一次；家人陪伴的时间也随之调整。"
          : "作品或共同活动持续一段时间后，材料、场地和往返安排开始反复使用，原有分摊方式可能需要重新说清。"
          : early ? "一首熟悉的歌、一次拼搭或一个生活小步骤，做过之后又想重复；有时能独立完成，有时还需要熟悉的回应。"
            : younger ? "同一项小本领练过几次，或一本书、一个小作品终于完成；下次再做时更在意自己能做到哪一步。"
              : "兴趣作品经过几轮打磨，或一项共同活动持续开展；别人看到的变化，与自己能否保持节奏开始联系起来。", result: younger ? "小本领的重复完成" : "持续练习与作品完善" };
      case "settlement": return { lead: money ? `${objects.settlement}更突出；东西由谁使用、活动花费怎么分担，可能在事情做完以后才谈得更清楚。`
        : `${objects.settlement}可能成为这一段的具体表现；自己觉得已经做完，与别人怎样回应，有时并不完全同步。`,
        example: money ? younger ? "一起玩或动手做东西之后，借来的材料要归还，用过的物品要收好，下一次还需要什么也会被提出来。"
          : "共同作品或活动结束后，再核对材料、交通或场地花费，原先口头答应的部分重新得到确认。"
          : younger ? "把做好的小作品拿给人看，或做完一件答应的小事，期待回应；别人可能先肯定一部分，再指出一处要补的地方。"
            : "自己的作品或共同完成的事情得到具体反馈，有的部分被认可，另一部分仍有不同意见或补充要求。", result: "完成后的回应与约定" };
      case "new_collaboration": return { lead: money ? `${objects.new_collaboration}可能使材料、陪伴和活动时间重新组合；一起参与与持续承担是不同的安排。`
        : `${objects.new_collaboration}是可观察的变化；从好奇、尝试一起做，到发现各自喜欢什么，参与范围可能逐渐调整。`,
        example: money ? younger ? "受邀参加一次新的游戏或兴趣活动，需要带什么、由谁陪着、已有用品能否共用，变得更具体。"
          : "参加一次新的兴趣活动或共同创作，先用已有材料尝试，后来再讨论要不要继续投入时间与用品。"
          : early ? "遇到不熟悉的游戏或伙伴，先在旁边看，再试着加入；熟悉的大人或玩具仍能提供衔接。"
            : younger ? "新的同伴带来一种游戏或动手活动，原来自己玩的内容变成一起试，轮到谁、怎么玩也有了新的约定。"
              : "通过兴趣活动认识不同的伙伴，先共同完成一件小事，再发现哪些人节奏相近、哪些部分更适合各自做。", result: "新活动的一次实际参与" };
      default: return null;
    }
  }
  const care = phase.stage === "adult" && input.appliedWork === "caregiving";
  const retired = phase.stage === "adult" && input.appliedWork === "retired";
  const daily = phase.stage === "unknown" || (phase.stage === "adult" && (!input.appliedWork || input.appliedWork === "unspecified"));
  if (care || retired || daily) {
    switch (input.kind) {
      case "study": return { lead: money ? `${objects.study}可能占用一些${objects.costs}；用过之后，真正需要的部分与暂时闲置的部分更容易分清。`
        : `${objects.study}可能进入原有日程；从看懂、听懂到亲自做熟，会有反复尝试和询问的过程。`,
        example: care ? "看过新的照料说明或示范后，实际陪伴、准备用品时仍会遇到不同情况，熟悉的人再补充解释或一起做一次。"
          : retired ? "兴趣课上学到一种做法，回到自己的活动或作品中再试，发现哪些能接着用、哪些还想请同伴示范。"
            : "学做一道菜、整理物品或使用一件新工具时，先照着说明做，再根据实际遇到的问题改一个步骤。", result: "新办法在日常中的使用" };
      case "proposal": return { lead: money ? `${objects.proposal}可能先用已有物品做一次尝试；花费、占用时间与是否继续，会在试过之后变得具体。`
        : `${objects.proposal}可能从一个想法变成一次实际尝试；做过以后，原来觉得方便的地方与别人感受不同的地方，会逐渐显出来。`,
        example: money && daily ? "家务、出行或共同活动试了一个新办法，原有用品有的能继续使用，有的需要补充；试做花费与参与者腾出的时间也随之重新分摊。"
          : care ? "把接送、准备用品或轮换陪伴的一步换个做法，实际试过一次，照料者再交流哪里省力、哪里仍不顺手。"
          : retired ? "和活动伙伴换一条路线、调整聚会时间，或给兴趣作品换一种做法；试过后的感受使下一次安排有所变化。"
            : "家里的一项收纳、做饭或出行安排换个办法，自己先做一遍，其他参与者提出不同感受，再作小幅调整。", result: "日常改法试过后的反馈" };
      case "delivery": return { lead: money ? `${objects.delivery}持续一段时间后，用品消耗、交通或共同花费会反复出现，原来的准备方式可能跟着调整。`
        : `${objects.delivery}更突出能否持续；一次做成以后，熟悉步骤能否保留下来、下次是否还愿意参与，比偶尔做得好更有分量。`,
        example: care ? "接送、陪伴或用品准备重复进行几次，哪些步骤可以由自己完成、哪些仍需要接替，在日常相处中逐渐清楚。"
          : retired ? "固定参加一项兴趣活动或反复完成一件作品，同伴的回应和自己的体力、时间安排，会带来持续或调整的选择。"
            : "一项家务、手艺或共同活动从偶尔做变成重复做，熟悉步骤慢慢固定，收拾、归还和下一次准备也跟着发生。", result: "熟悉日常的持续完成" };
      case "settlement": return { lead: money ? care ? "一段照料安排做过之后，实际接送、用品和服务花费怎样共同承担，可能重新进入讨论。"
          : `${objects.settlement}可能集中到同一段时间里；哪些已经用过、谁已付出、下一次还要不要继续，会得到更具体的回应。`
        : care ? "一段接送、陪伴或服务已经进行后，家人或协助者对实际安排的感受会更清楚，继续怎样轮换和接替可能成为话题。"
          : `${objects.settlement}可能进入收尾；自己认为已经办妥，与其他参与者的确认有时不同步，也可能留下补办、归还或续用的安排。`,
        example: care ? "原先口头约定的陪伴次数、用品购买或服务费用，做过一段以后再核对；已经承担的部分与下次需要接替的部分分别说清。"
          : retired ? "参加过的活动或使用过的服务到了收尾时，核对费用、归还用品，再决定是否续报或继续参与。"
            : "一起出行、办事或借用物品后，归还、分摊费用或确认结果需要再次联系，原先没说细的部分因此补充清楚。", result: "已做事项的收尾与后续约定" };
      case "new_collaboration": return { lead: money ? `${objects.new_collaboration}可能带来不同的时间、用品或费用安排；一次参加与长期共同承担，往往在试过后才分得更清楚。`
        : `${objects.new_collaboration}可能使原来的生活节奏多一个选择；先一起做一件小事，会显出彼此习惯、时间和参与意愿的差别。`,
        example: care ? "新加入的家人、服务者或替补协助先参与一次，原来自己承担的步骤开始与对方交接，也发现哪些习惯还要磨合。"
          : retired ? "受到一次兴趣活动或同伴聚会的邀请，先参加一回，认识不同的人，再看是否愿意把它放进固定日程。"
            : "朋友提出一起参加活动、学一门手艺或共用一件物品，第一次实际参与后，对时间和花费有了新的认识。", result: "一次共同参与后的选择" };
      default: return null;
    }
  }
  switch (input.kind) {
    case "study": return { lead: money ? `${objects.costs}可能更集中地用在${objects.study}上，准备能否实际用上，会影响后面的投入安排。` : `${objects.study}可能进入日程，常见表现是增加讲解、练习或材料补充，与原有完成节奏交织。`,
      example: money ? `为${objects.study}腾出时间或准备物品后，有的部分能够实际使用，另一些仍在等待合适的使用机会。` : `${objects.study}安排到眼前的一件事中，一边学习或补充材料，一边继续完成原来答应的部分。`, result: "新方法的实际应用" };
    case "proposal": return { lead: money ? `${objects.proposal}若进入试用，试做花费、修改次数与正式采用的范围会成为具体问题。` : `${objects.proposal}是本段更具体的主题：改动可通过样例、演示或小范围试用接受评议，反馈可能促成修改或继续试验。`,
      example: money ? `${objects.proposal}先做一轮试用，材料和修改时间已经投入，正式采用前再明确哪些继续、哪些到此结束。` : `${objects.proposal}先拿出一版可比较的样例，经过演示或试用后，再依据反馈修改或扩大使用。`, result: "试点的实际反馈" };
    case "delivery": return { lead: money ? `${objects.delivery}若持续进行，维持质量所需的时间、用品与后续维护也会连续占用。` : `本段重点落在${objects.delivery}的连续性；能否保持质量、按时衔接下一次，会比单次表现更突出。`,
      example: money ? `上一轮${objects.delivery}已经完成，维护或追加修改仍占用原有条件，下一轮投入同时开始。` : `${objects.delivery}按相近步骤持续完成，一轮反馈被带进下一轮，交接与维护逐渐固定下来。`, result: "连续交付与维护" };
    case "settlement": return { lead: money ? `${objects.settlement}是本段需要对照的具体环节：已投入部分如何得到确认、费用怎样承担以及是否继续使用，会影响下一步安排。` : `${objects.settlement}成为本段重点；已有成果可能进入评阅或完成确认，并提出下一阶段范围或补充材料的问题。`,
      example: money ? `${objects.settlement}需要补齐一份记录或共同确认，一部分先得到确认，尚有分歧的部分继续核对。` : `${objects.settlement}进入完成确认，对方提出具体反馈或补充要求，随后再谈下一阶段范围。`, result: "已有成果的完成确认" };
    case "new_collaboration": return { lead: money ? `${objects.new_collaboration}可能带来不同的投入条件，前期试用、共同承担与后续维护需要分开确认。` : `本段可对照${objects.new_collaboration}的接洽或小范围合作；一轮沟通或试做，会让需求、节奏和可承担范围变得更具体。`,
      example: money ? `${objects.new_collaboration}先试一小段，初次投入结束后，再决定持续投入和后续承担的范围。` : `${objects.new_collaboration}从初次沟通进入一轮试做，反馈改变了参与范围或下一步约定。`, result: "接洽后的试用反馈" };
    default: return null;
  }
}

/** Keep the path's role and effect, but use actions that fit the actual age and
 * declared setting instead of carrying office verbs into every life scene. */
function situatedStory(input: AnnualEventReadingProseInput, phase: LifePhase, story: Story): Story {
  if (isChild(phase) && input.path === "official-wealth") return { ...story,
    object: "能用的材料、得到的帮助与眼前规则一起出现",
    advance: "已有材料和讲解较有条件帮上眼前的小事情，做什么、怎样算做完更容易接起来",
    friction: "需要承担的要求增加，但讲解、陪伴或可用材料未必一起到位，想做好与怎样做之间容易卡住" };
  if (input.path !== "resource-output") return story;
  if (isChild(phase)) {
    if (input.kind === "proposal") return { ...story, advance: "已经理解的办法较有条件做成一个小样，自己的想法能通过实际尝试被看见",
      friction: "想按新办法试一试，原有解释或别人的要求却没有接上，动手与反复说明之间容易停顿" };
    if (input.kind === "settlement") return { ...story, advance: "已经做好的部分较有条件得到具体回应，原来不清楚的要求可以在一次交流里说明白",
      friction: "自己觉得已经做完，别人的要求或回应却还没接上，可能反复补做、解释或等待" };
  }
  const everyday = phase.stage === "unknown" || (phase.stage === "adult" && (!input.appliedWork || ["unspecified", "caregiving", "retired"].includes(input.appliedWork)));
  if (!everyday) return story;
  if (input.kind === "settlement") return { ...story,
    advance: input.domain === "wealth" ? "已投入的时间、用品或费用较有条件说清去向，继续使用、补办和共同承担也能逐项接上"
      : "已经做过的部分较有条件获得清楚回应，原先需要补充的说明与下一次安排能够接上",
    friction: "事情已经做过，彼此对完成方式或后续承担仍有不同理解，收尾与再次解释可能反复" };
  if (input.kind === "proposal") return { ...story,
    advance: "已有经验较有条件支持一次实际尝试，改过以后哪里方便、哪里仍不合用，可以从日常反馈中看出来",
    friction: "新办法已经说得出来，其他参与者的习惯或可用条件却还没接上，试一次与继续用之间容易停顿" };
  return story;
}

function rescueInLife(input: AnnualEventReadingProseInput): string {
  if (!input.patternContext?.rescues.length) return "";
  if (input.path === "resource-wealth") return "转机在于已有的明确用途能把准备范围收回来：确实用得上的部分继续，重复准备才有机会减少；这还取决于用途能否落实。";
  if (["peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"].includes(input.path)) return strengthTenGodGroup(input.god) === "resource"
    ? "已有需求或可交付内容，是把准备重新接回实际使用的转机；它必须真正被采用，才能减轻补资料与完成之间的拉扯。"
    : "原来已经会用的方法或可交付内容，仍是协调参与者与实际承接的转机；分工和采用条件接上后，才可能减少反复。";
  if (input.path === "food-killings") return "转机在于原先处理难点的方法还能否继续使用，并得到所需时间、工具或协助；有支持线索不等于难点已经解决。";
  if (["official-resource", "killings-resource", "hurting-resource", "resource-preservation"].includes(input.path)) return "已有指导、依据或协助仍提供了转圜空间；只有实际接到执行步骤，才能缓解要求与完成条件之间的距离。";
  return "本段仍有可转圜的配合条件；需要落实到实际承担和可用支持，才会改变眼前的推进情况。";
}

/** No new event, priority, probability or effect is selected here. */
export function buildAnnualMechanismTopic(input: AnnualEventReadingProseInput, concreteTopic?: Topic | null): Topic | null {
  if (input.kind === "shared_arrangements" || !["career", "wealth"].includes(input.domain) || input.age.stage === "before_birth" || !input.patternContext) return null;
  const context = input.patternContext, actor = input.targetAction;
  if (context.version !== ANNUAL_EVENT_SIGNALS_VERSION || context.pathId !== input.path || context.effect !== input.patternEffect
    || !actor || actor.visibility !== "visible" || actor.effect !== input.effect || actor.tenGod !== input.god || actor.stem !== context.scope.yearGanZhi.slice(0, 1)
    || (input.mainQiAction && input.mainQiAction.visibility !== "main_hidden")) throw new Error("年度事项正文的路径、年干或作用来源不匹配。");
  const linked = buildNatalTransitTaskProse({ links: context.taskLinks, effect: context.effect,
    actions: [actor, ...(input.mainQiAction ? [input.mainQiAction] : [])], ageStage: input.age.stage,
    kind: input.kind, domain: input.domain === "wealth" ? "wealth" : "career", horizon: "year" });
  if (linked && input.age.stage === "adult" && (!input.appliedWork || input.appliedWork === "unspecified")) return {
    title: linked.title, summary: linked.summary, examples: linked.examples,
    reasoning: unique([context.summary, ...context.rescues, ...context.unresolvedConditions]) };
  const task = taskFor(input);
  if (task) return buildTaskTopic(input, task, concreteTopic);
  const agePhases = lifePhases(input), firstPhase = agePhases[0]!;
  const adultSituations = adultSituationsFor(input, firstPhase);
  const objects = lifeObjects(input, firstPhase.stage, firstPhase.age), scene = kindScene(input, objects, firstPhase);
  const mode = { ...modeFor(input, firstPhase.stage, firstPhase.age), ...(scene ? { result: scene.result, resources: objects.costs } : {}) };
  const baseStory = storyFor(input, mode);
  if (!baseStory) return null;
  const story = situatedStory(input, firstPhase, resourceStory(input, mode, baseStory));
  const theme = (selected: Story) => actor.effect === "assists" ? `${selected.advance}。`
    : actor.effect === "obstructs" ? `${selected.friction}。`
      : actor.effect === "mixed" ? `${selected.advance}；同时，${selected.friction}。`
        : `这些具体事项值得对照，进展能否顺利还要看实际配合；这一项暂不单独预判顺利或吃力。`;
  // Move only this known display suffix; effects still come from the typed actor.
  const roleTechnical = input.kind === "work_change" && actor.effect === "obstructs"
    ? input.domain === "wealth" ? "原段对该透干保留资源承接上的牵制，投入与使用范围是本项需要核对的限制。" : "原段对该透干保留配合上的牵制，要求与实际可承担范围是本项需要核对的限制。" : "";
  const movedRoleTechnical = roleTechnical && concreteTopic?.summary.endsWith(roleTechnical) ? roleTechnical : "";
  const concreteSummary = movedRoleTechnical ? concreteTopic!.summary.slice(0, -movedRoleTechnical.length) : concreteTopic?.summary;
  const lead = (adultSituations?.lead ?? scene?.lead ?? concreteSummary ?? `${story.object}是本段的具体事项。`)
    + (adultSituations && input.kind === "work_change" && ["neutral", "unresolved"].includes(actor.effect) ? "这些事项值得对照，但仅凭这条线索，还不能判断进展是否顺利。" : "");
  const phases = input.kind !== "work_change" && agePhases.length > 1 ? agePhases.map((phase) => {
    const currentObjects = lifeObjects(input, phase.stage, phase.age), currentScene = kindScene(input, currentObjects, phase);
    const current = { ...modeFor(input, phase.stage, phase.age), ...(currentScene ? { result: currentScene.result, resources: currentObjects.costs } : {}) };
    const selected = situatedStory(input, phase, resourceStory(input, current, storyFor(input, current)!));
    return `${phase.label}部分：${adultSituationsFor(input,phase)?.lead ?? currentScene?.lead ?? selected.object}${theme(selected)}`;
  }) : [`${lead}${input.kind === "work_change" ? "" : theme(story)}`];
  const mainQi = input.mainQiAction;
  const separate = (actor.effect === "neutral" || actor.effect === "unresolved") && mainQi && ["assists", "mixed"].includes(mainQi.effect)
    ? `本年透${actor.stem}${actor.tenGod}与支内${mainQi.stem}${mainQi.tenGod}分开读：后者另有支持线索，不能借此把透干主题改写成全年顺利。` : "";
  const overallFriction = actor.effect === "assists" && ["mixed", "obstructs"].includes(context.effect)
    ? `本项虽有推进条件，整个安排仍受另一层牵制：${story.friction}；能推进的部分与尚未接上的部分需要分开。`
    : actor.effect === "assists" && context.effect === "unresolved" ? "本项有可推进之处，但整个安排的配合还未落实；单项进展能否接上后续，仍要看实际承担和支持是否到位。"
      : ["neutral", "unresolved"].includes(actor.effect) && ["mixed", "obstructs"].includes(context.effect) ? `本项本身没有单独定向；同段整体安排还需面对${story.friction}。`
        : input.kind === "work_change" && ["obstructs", "mixed"].includes(actor.effect) ? `${story.friction}。` : "";
  const rescue = rescueInLife(input);
  const extraSupport = actor.effect === "obstructs" && ["assists", "mixed"].includes(context.effect) && !rescue
    ? `同段另有能帮助整体推进的配合，但这项受到牵制的环节仍需实际接上支持。` : "";
  // Translate this previously displayed condition only; it never assigns an effect.
  const loadCondition = context.unresolvedConditions.includes("财食/承接的0.8、1.0、1.2替代分界不一致；主句沿1.0本地模型，轻重分歧保留为条件。")
    ? "新增产出和投入是否超出可承担范围，现有判断仍有分歧；有转机也要看实际能接住多少。" : "";
  const examples = input.kind !== "work_change" && agePhases.length > 1 ? agePhases.flatMap((phase) => {
    const current = lifeObjects(input, phase.stage, phase.age);
    const situations=adultSituationsFor(input,phase);
    return situations ? situations.examples.map(example=>`${phase.label}部分：${example}`) : [`${phase.label}部分：${kindScene(input, current, phase)?.example ?? story.examples[0]}`];
  }) : adultSituations?.examples ?? (scene ? [input.kind === "study" ? story.examples[0] : scene.example, concreteTopic?.examples[0] ?? story.examples[1]] : [...(concreteTopic?.examples ?? story.examples)]);
  const studyFocus: Record<string, string> = { "resource-wealth": "准备投入与实际用途", "food-killings": "原有方法与新指导衔接", "official-resource": "方法指导与明确要求", "official-wealth": "准备条件与完成标准", "killings-resource": "集中要求与可用支援", "resource-output": "学习准备与成果呈现", "resource-preservation": "必要支持的持续供给", "hurting-resource": "改法与依据的校正", "peer-output-wealth": "补充准备与原有交付", "wealth-food": "准备与重复完成", "food-wealth": "学习支持与连续成果", "hurting-wealth": "方法准备与改进试用" };
  const title = adultSituations?.title ?? concreteTopic?.title ?? story.title;
  return { title: input.kind === "study" && studyFocus[input.path] ? `${title} · ${studyFocus[input.path]}` : title,
    summary: linked ? `${phases.join("")}${linked.taskSummary}` : `${phases.join("")}${overallFriction}${rescue}${extraSupport}${loadCondition}`,
    examples,
    reasoning: unique([context.summary, ...context.rescues, ...context.unresolvedConditions, ...(separate ? [separate] : []), ...(movedRoleTechnical ? [movedRoleTechnical] : [])]) };
}
