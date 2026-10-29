/** Frozen compatibility-only source. Original SHA-256: 377bf4a5e0864e4d733178d93016cb2fc38921e50b65b5d6b17bf6e37eda4686.
 * Replays historical choices only; never a current automatic reading. */
import { revisionRecordSchema, transitNodeRefSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import type { BaziPreliminaryAssessment } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "../../../../../packages/bazi-interpretation/src/strength-policy";
import { LOCAL_DETAILED_OUTLOOK_VERSION, type LocalLifeOutlook, type LocalLifeDecade } from "./local-detailed-outlook";
import { LOCAL_DETAILED_CONTENT_VERSION } from "./local-detailed-personalization";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "../local-reading-age-context";
import { outlookDirectionCaption, READING_YEAR_SUMMARY_VERSION } from "../outlook-judgment-presentation";
import { LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION, OUTLOOK_STEM_ACTIONS_VERSION,
  createPatternActionVerifier, type OutlookAxis, type OutlookEffect, type OutlookAxisFinding, type OutlookStemAction } from "./local-outlook-judgment";

export const LIFE_STAGE_STORY_VERSION = "hakimi.local-life-stage-story/0.1.0" as const;
export interface LifeStageStoryBasisRef {
  decadeId: string; axisId: string;
  field: "summary" | "evidence" | "blockers" | "rescues" | "unresolvedConditions";
  index?: number;
}
export interface LifeStageStoryStage {
  decadeId: string; index: number; branchId: "locked" | "forward" | "backward";
  nodeRef: TransitNodeRef; ganZhi: string; stemTenGod: string;
  startInstant: string; endExclusiveInstant: string; ageLabel: string; age: LocalReadingAgeContext;
  caption: string; headline: string; paragraphs: string[]; advantages: string[]; pressures: string[];
  conditions: string[]; basisRefs: LifeStageStoryBasisRef[]; sourceSubjects: string[];
}
export interface LifeStageStoryTransition {
  id: string; fromDecadeId: string; toDecadeId: string;
  fromNodeRef: TransitNodeRef; toNodeRef: TransitNodeRef; atInstant: string;
  headline: string; paragraphs: string[];
  changes: { axis: OutlookAxis; beforeEffect: OutlookEffect; afterEffect: OutlookEffect; beforeAxisId: string; afterAxisId: string }[];
  basisRefs: LifeStageStoryBasisRef[]; sourceSubjects: string[];
}
export interface LocalLifeStageStory {
  version: string;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean; sex: RevisionRecord["input"]["sex"] };
  sourceVersions: string[]; referenceInstant: string;
  branches: { id: "locked" | "forward" | "backward"; label: string; currentDecadeId: string | null;
    stages: LifeStageStoryStage[]; transitions: LifeStageStoryTransition[]; conditions: string[] }[];
  limitations: string[];
}
export interface LifeStageStoryInput { revision: RevisionRecord; assessment: BaziPreliminaryAssessment; life: LocalLifeOutlook }

const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const fixedDate = (instant: string) => new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 19).replace("T", " ");
const effects: OutlookEffect[] = ["assists", "obstructs", "mixed", "neutral", "unresolved"];
type Setting = { phase: string; activity: string; output: string; support: string; resources: string; partners: string; requirements: string };
type ActorText = { title: string; topic: string; assistance: string; pressure: string };
type StageContext = { source: LocalLifeDecade; age: LocalReadingAgeContext; pattern: OutlookAxisFinding; visible: OutlookStemAction; hidden: OutlookStemAction; natalFocus: string };
function setting(stage: LocalReadingAgeContext["stage"]): Setting {
  if (stage === "young_child") return { phase: "探索与日常习惯", activity: "游戏、表达和日常小尝试", output: "小作品与一次独立完成", support: "熟悉的示范与照料回应", resources: "陪伴时间、用品和活动材料", partners: "照料者与同伴", requirements: "日常规则与活动要求" };
  if (stage === "youth") return { phase: "学习与自主成长", activity: "课程练习、作品和同伴活动", output: "可以展示的作品与学习成果", support: "解释、指导与练习方法", resources: "学习时间、材料和活动空间", partners: "指导者与同伴", requirements: "学习规则与共同活动的要求" };
  if (stage === "unknown" || stage === "before_birth") return { phase: "已有生活与参与方式", activity: "已有的日常事项与共同活动", output: "可以看见和使用的完成结果", support: "说明、方法与实际帮助", resources: "可用时间、物品和共同条件", partners: "实际参与者", requirements: "已经明确的约定与需要" };
  return { phase: "能力与生活选择", activity: "自己实际承担的事情、长期兴趣与协作", output: "能够使用的成果与可重复的做法", support: "已有经验、方法与能够落实的帮助", resources: "自己能够安排的时间、工具与投入", partners: "实际协作者", requirements: "既有承诺、完成标准与新增要求" };
}

/** Language about an existing typed action. This never chooses its effect. */
function actorText(god: string, path: string, s: Setting): ActorText {
  const group = strengthTenGodGroup(god);
  const roles: Record<string, Pick<ActorText, "title" | "topic">> = {
    比肩: { title: "把自己的本领与承担范围站稳", topic: `这一阶段更贴近自己怎样作决定、独立完成和保持长期节奏。${s.activity}中，亲自做出一部分，会逐渐成为认识自己能力的方式。` },
    劫财: { title: "共同参与增多，自己的位置需要更清楚", topic: `这一阶段更贴近和${s.partners}一起做事：怎样各自出力、哪些可以共用、哪些仍由自己决定。共同参与能够带来连接，也会使原来的独立安排需要重新说明。` },
    食神: { title: "把会做的事做熟，让成果持续出现", topic: `这一阶段更突出${s.output}的持续性。一次完成之后怎样再次做到、怎样保留质量，会比偶尔的表现更值得积累。` },
    伤官: { title: "把不同想法做成可以尝试的改法", topic: `这一阶段更突出表达、比较与改进。对不合用的办法提出自己的解法，再让${s.partners}看见实际差别，是发展个人风格的一条线索。` },
    正财: { title: "让已有付出接到明确用途和回应", topic: `这一阶段更贴近已投入的事情怎样完成、怎样得到确认，以及之后是否继续。${s.resources}与实际用途的联系，比同时增加很多选择更突出。` },
    偏财: { title: "面对不同用途和选择，逐渐形成取舍", topic: `这一阶段可能更常对照不同的参与方式、用途或合作选择。哪些值得继续、哪些只是一次尝试，会影响${s.resources}怎样安排。` },
    正官: { title: "在明确要求中形成可持续的责任感", topic: `这一阶段更突出${s.requirements}怎样成为自己能长期做到的事情。理解要求与亲自完成，需要在实际经历中逐渐接起来。` },
    七杀: { title: "要求较集中时，找到自己的处理顺序", topic: `这一阶段可对照较集中或较急的要求怎样进入${s.activity}。先抓住哪一个难点、向谁获得具体帮助，会比同时回应所有要求更重要。` },
    正印: { title: "让理解和学习支持进入实际使用", topic: `这一阶段更突出系统理解、熟悉方法与积累经验。${s.support}能否进入实际尝试，会决定准备是在帮助完成，还是始终停在准备。` },
    偏印: { title: "重新整理方法，也给实际呈现留下位置", topic: `这一阶段更贴近重看原来的方法、补充说明或换一种理解方式。${s.support}可能使做法更细，也需要留下把已经会的东西拿出来的机会。` }
  };
  const role = roles[god];
  if (!role || !group) throw new Error("大运生活叙述遇到无法识别的十神。");
  let assistance = group === "peer" ? `较可用的部分，是自身承担得到一些支撑，独立完成与共同参与有机会接到${s.output}`
    : group === "resource" ? `${s.support}较有条件接住现有需要，让原来难以独立处理的部分获得办法`
      : group === "output" ? `已有理解和能力较有条件变成${s.output}，实际反馈能帮助做法继续成熟`
        : group === "wealth" ? `已经做出的部分较有条件找到实际用途，付出、使用与后续承担可以继续衔接`
          : `${s.requirements}较有条件与实际能力相配，已经会做的部分可以逐步成为稳定承担`;
  let pressure = group === "peer" ? `自主决定与共同使用之间容易拉扯，参与增加不一定等于可自由安排的条件增加`
    : group === "resource" ? `继续补方法、补说明或准备材料，可能挤掉原来用于呈现和使用的时间`
      : group === "output" ? `可以展开的内容变多，完成、收尾与持续回应却未必同步，已有时间和支持容易被分散`
        : group === "wealth" ? `实际用途与需要承担的部分增加，投入可能走在完成或得到回应之前`
          : `${s.requirements}与当时能调动的帮助不完全同步，事情催着向前，处理办法却仍需要衔接`;
  if (path === "resource-wealth") {
    assistance = group === "wealth" ? `明确用途较有条件帮助筛选已有准备，用得上的资料、方法与支持留下，重复投入可以逐步减少`
      : group === "output" ? `已有积累较有条件经一次呈现找到用途，实际反馈可以帮助选择哪些准备值得继续` : assistance;
    pressure = group === "resource" ? `原来已有的准备又加一层，资料、工具或解释变多，却未必让实际使用同步向前`
      : group === "peer" ? `原来用于筛选准备的投入，受到共同使用或决定权的牵动，哪些支持还能调整需要重新分清`
        : group === "authority" ? `新增要求改变原有准备的用途，原本可以收拢的投入又转去支持另一项承担`
          : `筛选准备的实际用途受到牵连，减少重复投入与保留必要基础不能一次简单分开`;
  } else if (path === "resource-output" || path === "hurting-resource") {
    if (group === "resource") pressure = `准备与呈现容易反复脱节，继续理解或修改时，已经会的部分也可能迟迟没有拿出来`;
    if (group === "output") assistance = `学过和想过的内容较有条件被清楚呈现，打磨、解释与实际使用能够形成连续经验`;
  } else if (path === "food-killings") {
    pressure = group === "resource" ? `新的指导或准备会牵动原来解决难点的步骤，要求还在，熟悉办法却需要重新衔接`
      : group === "wealth" ? `新增投入也可能带来更多要处理的内容，原方法尚在，负担却未必减少` : pressure;
    if (group === "output") assistance = `熟悉的方法较有条件接住集中要求，解决一次难点之后还能留下下一次可用的步骤`;
  }
  return { ...role, assistance, pressure };
}

function basisFor(source: LocalLifeDecade): LifeStageStoryBasisRef[] {
  return source.judgment.axes.flatMap((axis) => [
    { decadeId: source.id, axisId: axis.id, field: "summary" as const },
    ...unique(axis.stemActions?.items.flatMap((action) => action.evidenceIndexes) ?? []).map((index) => ({ decadeId: source.id, axisId: axis.id, field: "evidence" as const, index })),
    ...(["blockers", "rescues", "unresolvedConditions"] as const).flatMap((field) => axis[field].map((_line, index) => ({ decadeId: source.id, axisId: axis.id, field, index })))
  ]);
}
function actorSentence(action: OutlookStemAction, path: string, s: Setting): string {
  const words = actorText(action.tenGod, path, s), origin = action.visibility === "visible" ? "这一步较直接进入的主题中，" : "运支内另有一层承接线索：";
  return action.effect === "assists" ? `${origin}${words.assistance}。`
    : action.effect === "obstructs" ? `${origin}${words.pressure}。`
      : action.effect === "mixed" ? `${origin}${words.assistance}；同时，${words.pressure}。` : "";
}
/** Connect the unchanged natal path and incoming role even when no directional
 * action is selected. These are life themes, never an additional effect. */
function pathTheme(context: StageContext, s: Setting): string {
  const path = context.pattern.pathId, god = context.visible.tenGod, group = strengthTenGodGroup(god);
  if (context.natalFocus === "rooted_peer_mixed_authority") return `这盘原有自主尝试与不同要求并存的主线，在${s.activity}中继续展开。${group === "peer" ? "怎样保留自己的选择，同时回应共同安排" : group === "resource" ? "怎样把解释与方法变成自己真正会用的步骤" : group === "output" ? "怎样让自己的表达和尝试得到理解，而不只忙着回应要求" : group === "wealth" ? "怎样让材料与支持服务清楚的小目标，而不是每增加一项选择又增加一套要求" : "怎样分清长期要做到的标准与当时较急的要求"}，会比笼统增加投入更贴近这一阶段的成长与选择。`;
  if (path === "resource-output") {
    if (group === "peer") return god === "劫财"
      ? `本命重理解与细致呈现，这一步把这些本领放进共同参与。和${s.partners}交流方法、各自负责一部分，再把成果接在一起，可以逐渐看清自己理解了什么、表达得是否清楚。共同决定不等于每个人都用同一种做法，交换经验与保留自己的判断需要同时有位置。`
      : `本命重理解与细致呈现，这一步更贴近把已学内容整理成自己的做法。${s.output}不只用于回应别人，也能帮助自己看见独立完成的边界；从懂得一种方法到能亲手做出，个人风格才会逐渐稳定。`;
    if (group === "resource") return `本命已有理解与表达的联系，这一步更贴近重新学习、整理经验与反复打磨。${s.support}最好有一个实际呈现的出口：讲给别人听、拿出一版作品或试做一次。这样新的理解才会改变做法，而不只是让准备越积越多。`;
    if (group === "output") return `本命积累开始更集中地进入${s.output}。${god === "食神" ? "细致说明、反复练熟与保持质量" : "比较不同做法、给出自己的解释并接受试用反馈"}，能把知道的东西变成参与者真正看得见的本领；完成后的反馈仍会带回下一轮理解。`;
    if (group === "wealth") return `本命重理解与呈现，这一步更贴近学过的东西究竟给谁用、用来解决什么。${s.output}与实际用途接上之后，时间和材料的投入便有了清楚去向；被认可、被使用与以后继续承担，是这个过程里相连但不同的几步。`;
    return `本命重理解与细致呈现，这一步把已有方法放到${s.requirements}面前。别人按什么标准理解或使用${s.output}，会让过去的积累接受更具体的检验；只说明自己懂了还不够，还需要让完成方式与要求接得上。`;
  }
  if (path === "resource-wealth") return `本命的关键是从较多积累中选出真正需要的部分。${group === "resource" ? "新方法、解释或材料继续进入时，重点是哪些已经够用，哪些仍在重复准备" : group === "peer" ? "与人共同参与或自己作决定时，重点是原有资料、工具和帮助由谁选择用途" : group === "wealth" ? "面对不同用途时，重点是让清楚的实际需要带着准备作取舍" : group === "output" ? "把想法做成成果时，实际反馈可以帮助辨别哪些准备值得保留" : "新要求出现时，需要分清它是否真的用得上原有积累，还是又增加一轮配套"}。保留必要基础、让已有东西持续派上用场，比不断换一套准备更贴近这步发展的主线。`;
  if (path === "peer-output-wealth") return `本命重自己的想法、实际产出与用途之间的连接。${group === "peer" ? "个人本领怎样进入共同完成、谁负责做出、谁提供条件" : group === "resource" ? "新的理解与帮助怎样服务实际呈现，而不是代替动手完成" : group === "output" ? "自己的表达或解法怎样被别人看见、比较和使用" : group === "wealth" ? "已有成果怎样找到实际用途，以及付出如何得到明确回应" : "自己的做法怎样在明确标准或集中要求下继续发挥"}，是这一阶段更具体的生活重心。用${s.output}把主张落下来，会比单靠解释或争取决定权更容易让参与者理解自己。`;
  if (path === "food-wealth" || path === "wealth-food") return `${path === "food-wealth" ? "本命较重把熟悉的方法做稳，再让成果持续被使用" : "本命较重从实际需要出发，把方法练到能够持续完成"}。这一步的${group === "peer" ? "共同参与" : group === "resource" ? "学习与准备" : group === "output" ? "表达与动手" : group === "wealth" ? "用途与投入" : "要求与标准"}，都要和${s.output}的连续性联系起来；一次完成之后的维护、反馈与下一次安排，也属于这段积累。`;
  if (path === "hurting-wealth") return `本命更擅长从不合用的办法里寻找改进，这一步的重心是把不同意见变成别人可以尝试的东西。${s.activity}中，说明哪里不同、拿出一个可比较的做法，再看实际接受与使用，才能让敏锐不只停在评论。${group === "resource" ? "补充依据应帮助改法落地，不必等所有问题都解释完才留出试用。" : "自己的判断与参与者的需要，需要在一次次实际反馈中靠近。"}`;
  if (path === "official-resource") return `本命把理解、方法与明确责任连在一起。这一步的${group === "resource" ? "学习和指导" : group === "output" ? "表达和不同做法" : group === "wealth" ? "实际用途和投入" : group === "peer" ? "自主与协作" : "标准和要求"}，会进入“知道怎样做”与“能够负责完成”之间。${s.support}真正用到${s.activity}时，可靠感才会从一次次完成中积累。`;
  if (path === "official-wealth") return `本命重现实条件与明确承担的配合。这一步在${s.activity}中，更具体地涉及已有投入支持哪一种要求、做成后还有什么需要持续负责。能使用多少条件，与能承担多大范围并不是一回事；${s.output}及其后续安排，是连接两者的实际落点。`;
  if (path === "food-killings") return `本命用具体方法回应较集中的要求，这一步更值得积累的是解决一次难点之后留下什么。${group === "resource" ? "新解释或指导进入时，要让它接上原来已经会用的步骤" : group === "wealth" ? "新的投入进入时，要分清它补上了哪一处缺口、是否也增加了要求" : "把复杂的事情拆成能够处理的小步骤，再把有用的做法留下"}，才能让${s.activity}少一些从头应急，多一些可重复的经验。`;
  if (path === "killings-resource") return `本命的发展需要让集中要求经过理解与支持，成为自己能够处理的行动。这一步在${s.activity}中，重点是从谁那里得到什么具体方法，以及自己已经掌握了哪一部分。帮助不只停在讲解，能进入${s.output}的完成过程，才会逐渐形成独立承担的本领。`;
  if (path === "hurting-resource") return `本命既有不同看法，也需要依据来打磨表达。这一步的经历更贴近让主张经得起检验：在${s.activity}中先保留值得尝试的想法，再补足关键说明，并留出真正试一次的机会。表达的分寸与方法的可靠，要在实际回应中一起形成。`;
  if (path === "resource-preservation") return `本命已有理解和支持的线索，这一步更需要分清眼前缺的是准备还是实践。${s.support}已经能解决的部分可以继续用；确实卡住的地方再补充。让积累服务于${s.output}，比一直增加材料、或急着撤去所有帮助，都更能形成自己的节奏。`;
  return `这一阶段仍沿本命已确认的角色与位置观察${s.activity}，通过具体尝试看见自己的发挥方式，不借未建立的路径补写固定人生结果。`;
}
function stageNarrative(context: StageContext, stage: LocalReadingAgeContext["stage"]): string[] {
  const s = setting(stage), path = context.pattern.pathId, visible = actorText(context.visible.tenGod, path, s);
  const themes = [visible.topic, pathTheme(context, s)];
  const direct = actorSentence(context.visible, path, s), hidden = actorSentence(context.hidden, path, s);
  if (direct) themes.push(direct);
  if (hidden) themes.push(hidden);
  if (context.pattern.rescues.length) themes.push(path === "resource-wealth"
    ? "已有实际用途仍是收拢准备的转机；它确实落实后，反复增加的部分才可能减少，原有基础仍需保留。"
    : ["peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"].includes(path)
      ? "原来能表达、会做出的部分仍提供转圜：它真正接到需要、被采用后，参与和投入才可能少一些拉扯。"
      : "原有方法或支持还保留了转圜空间；帮助确实接到处理步骤，才可能让受到牵制的部分继续。");
  return themes;
}

function makeStage(context: StageContext): LifeStageStoryStage {
  const { source, age, pattern, visible, hidden } = context;
  const caption = outlookDirectionCaption(source.judgment, source.direction);
  const titles = actorText(visible.tenGod, pattern.pathId, setting(age.stage));
  const passages = age.segments.length > 1
    ? age.segments.map((segment) => `${segment.label}（${fixedDate(segment.startInstant)} 至 ${fixedDate(segment.endExclusiveInstant)}，不含终点）：${stageNarrative(context, segment.stage).join("")}`)
    : stageNarrative(context, age.stage);
  const advantages: string[] = [], pressures: string[] = [];
  const s = setting(age.stage === "adult_transition" ? "unknown" : age.stage);
  for (const action of [visible, hidden]) {
    const words = actorText(action.tenGod, pattern.pathId, s), prefix = action.visibility === "visible" ? "直接进入的主题：" : "支内配合：";
    if (["assists", "mixed"].includes(action.effect)) advantages.push(`${prefix}${words.assistance}。`);
    if (["obstructs", "mixed"].includes(action.effect)) pressures.push(`${prefix}${words.pressure}。`);
  }
  if (pattern.rescues.length) advantages.push("原判断另保留具体转圜候选，须落实原有作用条件后才可用；不是已经解除压力。");
  for (const axis of source.judgment.axes.filter((item) => item.axis !== "pattern")) {
    if (["assists", "mixed"].includes(axis.effect)) advantages.push(axis.axis === "balance" ? "承接一侧另有支持，既有办法与可承担范围有接上的空间。" : "调候用字另有可用的补入或保护线索，仍按该字的原适用条件发挥。");
    if (["obstructs", "mixed"].includes(axis.effect)) pressures.push(axis.axis === "balance" ? "承接一侧也有负荷限制，可展开的事情与真正能够持续的范围需要分开。" : "调候用字同时受到牵连，已有发展方式能否发挥还受这一层原配合约束。");
  }
  if (["obstructs", "mixed"].includes(pattern.effect) && !pressures.length) pressures.push("原结构还有明确牵制，不能只凭一般生活主题判断已经顺畅，具体对象见原段依据。");
  const primary = source.judgment.axes.find((axis) => axis.axis === source.judgment.primaryAxis);
  const crossAxis = source.judgment.axes.some((axis) => axis !== primary && (axis.effect === "mixed" || primary?.effect === "assists" && axis.effect === "obstructs" || primary?.effect === "obstructs" && axis.effect === "assists"));
  if (crossAxis) passages.push(`能推进的部分与需要处理的限制同时存在：${advantages[0] ?? "可用支持仍须符合原条件。"}${pressures[0] ?? "牵制保留在原作用条件中。"}`);
  return { decadeId: source.id, index: source.index, branchId: source.branchId, nodeRef: structuredClone(source.nodeRef), ganZhi: source.ganZhi, stemTenGod: source.stemTenGod,
    startInstant: source.startInstant, endExclusiveInstant: source.endExclusiveInstant, ageLabel: source.ageLabel, age,
    caption, headline: titles.title,
    paragraphs: passages, advantages: unique(advantages), pressures: unique(pressures),
    conditions: unique([...age.conditions, ...source.judgment.conflicts, ...source.judgment.coverageGaps,
      ...(source.judgment.label === "条件性" ? [`原判断为“${caption}”，保留全部限定，不能改成无条件较顺或承压。`] : []),
      ...(["neutral", "unresolved"].includes(visible.effect) && ["neutral", "unresolved"].includes(hidden.effect) ? ["本步透干与支内本气均未单独排出助阻方向，正文只说明真实主题，不能读成已确定顺利或费力。"] : []),
      ...(["neutral", "unresolved"].includes(visible.effect) && ["assists", "obstructs", "mixed"].includes(hidden.effect) ? ["透干只保留直接生活主题，助阻来自另列的支内配合，不把后者冒作透干效果。"] : []),
      ...source.judgment.axes.flatMap((axis) => axis.unresolvedConditions),
      "这一步描述十年左右的形成过程，不等于每一年都发生同一事情；未填写且不推断实际职业、收入或关系身份。",
      "运支内用字仍按支内承接解释，不写成同字已经明透；救应只是条件候选。"]),
    basisRefs: basisFor(source), sourceSubjects: [`decade-${source.id}`] };
}

function makeTransition(before: StageContext, after: StageContext, first: LifeStageStoryStage, next: LifeStageStoryStage): LifeStageStoryTransition {
  const changes = before.source.judgment.axes.flatMap((axis) => {
    const later = after.source.judgment.axes.find((item) => item.axis === axis.axis)!;
    return axis.effect === later.effect ? [] : [{ axis: axis.axis, beforeEffect: axis.effect, afterEffect: later.effect, beforeAxisId: axis.id, afterAxisId: later.id }];
  });
  const s = setting(after.age.stage === "adult_transition" ? "unknown" : after.age.stage);
  const oldTopic = actorText(before.visible.tenGod, before.pattern.pathId, s), newTopic = actorText(after.visible.tenGod, after.pattern.pathId, s);
  let headline = `从“${oldTopic.title}”走向“${newTopic.title}”`;
  if (before.visible.tenGod === "比肩" && after.visible.tenGod === "劫财") headline = "从独立发挥，转向共同参与";
  else if (after.pattern.pathId === "resource-output" && strengthTenGodGroup(after.visible.tenGod) === "resource") headline = after.visible.effect === "obstructs" && strengthTenGodGroup(after.hidden.tenGod) === "wealth" && after.hidden.effect === "assists"
    ? "准备仍牵动呈现，成果另有使用线索" : "新的理解与准备，需要给实际呈现留位置";
  else if (["young_child", "youth"].includes(before.age.stage) && after.age.stage === "adult_transition" && after.visible.tenGod === "正官") headline = "从探索选择，走向规则与自主承担";
  const descriptions = [`${fixedDate(after.source.startInstant)}（UTC+08）转入${after.source.ganZhi}后，生活重心可从“${oldTopic.title}”对照到“${newTopic.title}”。${actorSentence(after.visible, after.pattern.pathId, s)}${actorSentence(after.hidden, after.pattern.pathId, s)}`];
  descriptions.push(first.caption === next.caption ? `两步的方向表述延续为“${next.caption}”，区别在具体参与方式与可用条件。`
    : `前一步为“${first.caption}”，后一步为“${next.caption}”；能推进和需要调整的部分各按对应阶段保留。`);
  if (after.pattern.rescues.length) descriptions.push("后一步还有原有方法或支持可作转圜，真正接到实际完成过程后，才可能减少反复。");
  if (before.age.stage !== after.age.stage || after.age.stage === "adult_transition") descriptions.push(`生活语境同时从${before.age.label}走向${after.age.label}，学习、日常参与和逐渐形成的自主承担按各自年龄展开。`);
  return { id: `${before.source.id}=>${after.source.id}`, fromDecadeId: before.source.id, toDecadeId: after.source.id,
    fromNodeRef: structuredClone(before.source.nodeRef), toNodeRef: structuredClone(after.source.nodeRef), atInstant: after.source.startInstant,
    headline,
    paragraphs: descriptions, changes, basisRefs: [...first.basisRefs, ...next.basisRefs], sourceSubjects: [...first.sourceSubjects, ...next.sourceSubjects] };
}

export function buildLifeStageStory(input: LifeStageStoryInput): LocalLifeStageStory {
  const r = revisionRecordSchema.parse(input.revision), p = input.assessment, life = input.life;
  const includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  const sourceBinding = { caseId: r.caseId, revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour, sex: r.input.sex };
  if (p.sourceBinding.revisionId !== r.id || p.sourceBinding.chartResultHash !== r.manifest.resultHash || p.sourceBinding.includeHour !== includeHour
    || life.revisionId !== r.id || life.chartResultHash !== r.manifest.resultHash || life.version !== LOCAL_DETAILED_OUTLOOK_VERSION || !Number.isFinite(Date.parse(life.referenceInstant))) throw new Error("大运生活主线与原命盘或定位来源不一致。");
  const expectedBranches = r.input.sex === "unspecified" ? ["forward", "backward"] : ["locked"];
  if (life.branches.length !== expectedBranches.length || new Set(life.branches.map((branch) => branch.id)).size !== life.branches.length || life.branches.some((branch) => !expectedBranches.includes(branch.id))) throw new Error("大运生活主线的顺逆分支不完整或重复。");
  const verify = createPatternActionVerifier(r, p), ids = new Set<string>(), nodes = new Set<string>();
  const contexts = new Map<string, StageContext>();
  const versions: string[] = [LIFE_STAGE_STORY_VERSION, p.version, life.version, LOCAL_DETAILED_CONTENT_VERSION, READING_YEAR_SUMMARY_VERSION];
  for (const source of life.decades) {
    const branch = life.branches.find((item) => item.id === source.branchId), j = source.judgment, ref = transitNodeRefSchema.parse(source.nodeRef);
    const start = Date.parse(source.startInstant), end = Date.parse(source.endExclusiveInstant);
    if (!branch || branch.status !== "available" || ids.has(source.id) || nodes.has(stable(ref)) || source.id !== `${source.branchId}:${ref.nodeId}` || !Number.isSafeInteger(source.index) || source.index < 1
      || !(start < end) || ref.nodeType !== "dayun" || ref.revisionId !== r.id || ref.chartResultHash !== r.manifest.resultHash || ref.startInstant !== source.startInstant
      || ref.manualDirection !== (source.branchId === "locked" ? null : source.branchId) || source.branchLabel !== branch.label
      || j.sourceBinding.revisionId !== r.id || j.sourceBinding.chartResultHash !== r.manifest.resultHash || j.sourceBinding.includeHour !== includeHour
      || stable(j.targetRef) !== stable(ref) || j.interval.startInstant !== source.startInstant || j.interval.endExclusiveInstant !== source.endExclusiveInstant || j.backgroundRefs.length
      || j.version !== LOCAL_OUTLOOK_JUDGMENT_VERSION || j.policyVersion !== LOCAL_OUTLOOK_POLICY_VERSION) throw new Error("大运生活主线的原节点、整步区间或判断身份不一致。");
    if (LunarUtil.getJiaZiIndex(source.ganZhi) < 0 || canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[r.facts.pillars.day.stem + source.ganZhi[0]!]!) !== source.stemTenGod) throw new Error("大运生活主线的真实干支与十神不一致。");
    if (j.axes.length !== 3 || new Set(j.axes.map((axis) => axis.axis)).size !== 3 || j.axes.some((axis) => !["balance", "pattern", "seasonal"].includes(axis.axis) || !effects.includes(axis.effect))) throw new Error("大运生活主线缺少唯一的原三轴判断。");
    const pattern = j.axes.find((axis) => axis.axis === "pattern")!, actions = pattern.stemActions;
    if (!actions || actions.version !== OUTLOOK_STEM_ACTIONS_VERSION || actions.items.length !== 2 || new Set(actions.items.map((action) => action.visibility)).size !== 2) throw new Error("大运生活主线缺少唯一的透干与支本气作用。");
    const mainStem = (LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[source.ganZhi[1]!]![0]!;
    for (const action of actions.items) {
      const stem = action.visibility === "visible" ? source.ganZhi[0]! : action.visibility === "main_hidden" ? mainStem : null;
      if (!stem || action.stem !== stem || action.tenGod !== canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[r.facts.pillars.day.stem + stem]!) || !effects.includes(action.effect)) throw new Error("大运生活主线的作用与真实透藏身份不一致。");
      for (const [indexes, lines] of [[action.evidenceIndexes, pattern.evidence], [action.blockerIndexes, pattern.blockers], [action.satisfiedConditionIndexes, pattern.satisfiedConditions]] as const) if (new Set(indexes).size !== indexes.length || indexes.some((index) => !Number.isSafeInteger(index) || index < 0 || index >= lines.length)) throw new Error("大运生活主线的依据索引重复或越界。");
    }
    verify(pattern, { ganZhi: source.ganZhi, nodeType: "dayun" }, []);
    const age = buildLocalReadingAgeContext(includeHour ? r.timeCalibration.utcInstant : null, source.startInstant, source.endExclusiveInstant);
    contexts.set(source.id, { source, age, pattern, visible: actions.items.find((action) => action.visibility === "visible")!, hidden: actions.items.find((action) => action.visibility === "main_hidden")!, natalFocus: p.balance.structural.working.focus });
    ids.add(source.id); nodes.add(stable(ref)); versions.push(j.version, j.policyVersion, actions.version);
  }
  const branches = life.branches.map((branch) => {
    const selected = life.decades.filter((decade) => decade.branchId === branch.id), stageContexts = selected.map((source) => contexts.get(source.id)!);
    const stages = stageContexts.map(makeStage), transitions: LifeStageStoryTransition[] = [], conditions = [...branch.conditions];
    for (let index = 1; index < selected.length; index++) {
      const before = selected[index - 1]!, after = selected[index]!;
      if (before.index >= after.index || Date.parse(before.endExclusiveInstant) > Date.parse(after.startInstant)) throw new Error("大运生活主线的同分支原阶段逆序或重叠。");
      if (before.index + 1 === after.index && before.endExclusiveInstant === after.startInstant) transitions.push(makeTransition(stageContexts[index - 1]!, stageContexts[index]!, stages[index - 1]!, stages[index]!));
      else conditions.push(`${before.ganZhi}与${after.ganZhi}之间未提供连续完整阶段，不补写跨缺口的转变。`);
    }
    const actualCurrent = selected.filter((decade) => Date.parse(decade.startInstant) <= Date.parse(life.referenceInstant) && Date.parse(life.referenceInstant) < Date.parse(decade.endExclusiveInstant));
    if (actualCurrent.length > 1 || (actualCurrent[0]?.id ?? null) !== branch.currentDecadeId || selected.some((decade) => decade.isCurrent !== (decade.id === branch.currentDecadeId))) throw new Error("大运生活主线的当前阶段定位不一致。");
    if (!stages.length) conditions.push(branch.summary);
    return { id: branch.id, label: branch.label, currentDecadeId: branch.currentDecadeId, stages, transitions, conditions: unique(conditions) };
  });
  return { version: LIFE_STAGE_STORY_VERSION, sourceBinding, sourceVersions: unique(versions), referenceInstant: life.referenceInstant, branches,
    limitations: ["本层逐步解释原始大运，不把年度十年查询窗口当作整步大运，不按年份多少反推阶段好坏。", "相邻变化只在同一顺逆分支的精确连续边界连接，换运不自动表示转好；条件性结论不升级为确定结果。", "每步按原起止与UTC周年年龄切换语境；不把当下职业或关系自述套用于整步十年，也不凭年龄推定就业、退休或婚姻。", "支内承接、透干作用、各轴助阻与救应条件分别保留，没有新增吉凶评分、事件概率或寿命判断。", ...life.limitations] };
}
