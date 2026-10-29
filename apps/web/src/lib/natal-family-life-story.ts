import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { NatalRelationshipInteraction } from "../../../../packages/bazi-interpretation/src/natal-relationship-foundation";
import { canonicalizeStrengthTenGod } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "./local-reading-age-context";

export const NATAL_FAMILY_LIFE_STORY_VERSION = "hakimi.natal-family-life-story/0.1.0" as const;
export interface NatalFamilyLifeStoryInput {
  revision: RevisionRecord;
  comprehensive: BaziComprehensiveReading;
  referenceInstant: string | null;
}
export interface NatalFamilyLifeStory {
  version: typeof NATAL_FAMILY_LIFE_STORY_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean; sex: RevisionRecord["input"]["sex"] };
  sourceVersions: string[];
  referenceInstant: string | null;
  age: LocalReadingAgeContext | null;
  title: string;
  paragraphs: string[];
  sourceSubjects: ["chapter-family"];
  conditions: string[];
  evidence: string[];
}
type Position = "year" | "month" | "day" | "hour";
type ChildRole = {
  support: string; response: string;
  youngSupport: string; youthSupport: string;
  youngResponse: string; youthResponse: string;
};
const ROLES: Record<string, ChildRole> = {
  比肩: { support: "留出自己动手的空间", response: "表达自己的想法并完成能独立做的部分",
    youngSupport: "穿衣、收拾玩具或搭一个小东西时，先让自己试一试，再在卡住的一步得到帮助，较能留下“我也会做”的体验。",
    youthSupport: "在学习或日常小事中，能够独立负责的一部分有了位置，求助便不必等于整件事被接手；自己的办法也能从实际结果里得到回应。",
    youngResponse: "想自己拿、自己做的意愿需要被听见；一件小事由谁先试、什么时候请人帮忙，是自主与共同生活接上的地方。",
    youthResponse: "自己的安排与家中的共同安排可能各有节奏。若有学习或同伴活动，把自己能负责的部分做完整，比只坚持“让我自己来”更能形成信任。" },
  劫财: { support: "共同参与和轮流使用", response: "在一起做事时分清各自的一部分",
    youngSupport: "一起搭积木、玩游戏或整理物品，可以让陪伴落在具体互动里。想一起玩与愿意轮流不是同一件事，参与多了也会遇到谁先拿、谁先做的小分歧。",
    youthSupport: "若有同伴活动，共用材料、一起准备和互相补位可以提供帮助；人数或意见增加后，自己的时间与物品不宜被默认为随时共用。",
    youngResponse: "共同活动里，轮流、等待和一起收拾是回应他人的小步骤。大家都想参与时，需要听见各自愿意做哪一部分。",
    youthResponse: "若与同伴共同完成事情，谁准备、谁使用、谁负责收尾会影响合作感受。共同参与并不需要每个人都按同一种方法做。" },
  食神: { support: "熟悉的小事与持续照应", response: "用稳定的行动和交流回应支持",
    youngSupport: "一起讲故事、重复熟悉的游戏或做一个小作品，能让陪伴有可期待的节奏。每天一点回应，比只有一次很热闹的活动更能被感受到。",
    youthSupport: "熟悉的交流、一起完成小事和反复使用的经验，是较容易接住的支持。若有作品或练习，细致回应完成过程，也能让自己的进步被看见。",
    youngResponse: "把喜欢、不喜欢和还想再试一次说出来，能让日常照应更贴近需要；熟悉的小步骤做得下去，回应便不只停在口头答应。",
    youthResponse: "稳定完成日常小事、持续分享自己的进展，是回应关心的方式。习惯能维持联系，但重要的需要仍要说出来，不能都留给别人猜。" },
  伤官: { support: "允许提问和尝试不同办法", response: "说明自己的意见并回应实际差别",
    youngSupport: "对游戏玩法、摆放或搭建提出不同办法时，愿意听完、再一起试一小步的回应，比立即要求照旧更能接住探索。",
    youthSupport: "若对学习方法或活动规则有自己的看法，能够说明问题、试出差别的机会有助于表达。想法被认真听见，与每次都被同意是两回事。",
    youngResponse: "不喜欢某个办法时，把“哪里不合适”与“想怎样试”连起来，别人更容易理解；不同意见不必变成谁更听话的比较。",
    youthResponse: "提出改法之后，原有约定和其他人的接受节奏仍在。表达自己的理由，也回应改动带来的实际影响，才不会让一件事的分歧扩大成对人的否定。" },
  正财: { support: "稳定陪伴与能够兑现的小约定", response: "规律使用物品并回应已经答应的小事",
    youngSupport: "约好的陪伴、活动材料和熟悉用品按时接上，会让一天的安排更容易理解。一次临时变化需要说明，也需要有能接续的小安排。",
    youthSupport: "学习材料、可预期的陪伴与已经答应的安排，是较具体的支持。固定的照应能带来踏实感，但物品准备齐全不能代替被倾听。",
    youngResponse: "用过的玩具归回原处、答应结束游戏后接着做下一件小事，都是回应照应的适龄小步骤。",
    youthResponse: "答应做的小事能持续完成、借用的物品有交代，是日常回应的落点。按时完成与愿意说出感受各有作用，不用一种表现代替全部交流。" },
  偏财: { support: "临时援手与灵活补位", response: "在新活动与原安排之间作小选择",
    youngSupport: "原来的活动不方便继续时，替代材料、临时陪伴或换一种玩法能补上缺口。新的热闹之外，熟悉的休息与陪伴节奏也需要留下。",
    youthSupport: "临时获得的帮助、新活动或不同经验，可以补原计划没有覆盖的一步。额外参与与已经答应的安排可能同时需要时间，热心不必等于每次都接下。",
    youngResponse: "突然想加入一个游戏或换一种玩具时，原来正在做的事情也需要有个结束；小选择可以逐步练习，不必一次承担太多。",
    youthResponse: "若有同伴邀请或临时活动，愿意参加与能够持续参加需要分开。保留原有安排的时间，也能让新的兴趣有比较清楚的位置。" },
  正印: { support: "耐心讲解和可接续的照料", response: "说清需要并逐渐自己尝试",
    youngSupport: "有人慢慢示范、听懂一句话后自己试一下，能把陌生的小事变成会做的步骤。陪伴接住困难，也要给已经能做的部分留位置。",
    youthSupport: "讲清缘由、示范做法和耐心回应，能帮助理解遇到的难点。若在学习新东西，帮助接到自己的一次尝试上，比一直代办更容易留下本领。",
    youngResponse: "需要再讲一次、想先看示范或想自己来，都可以成为明确的回应。说清需要以后，照料更容易落在真正不会的那一步。",
    youthResponse: "接受解释之后，把理解用在自己的尝试里，是回应支持的方式。提醒与代办若持续增加，自己能够决定和完成的部分可能反而被挤掉。" },
  偏印: { support: "针对难点的另一种帮助", response: "说明新理解并接好新旧办法",
    youngSupport: "熟悉的说法听不懂时，换个比喻、换种材料或慢一点示范，可能让同一个小问题容易理解；改变办法时，也需要交代接下来做什么。",
    youthSupport: "不同角度的解释或一项专项办法，可以补原方法的缺口。新办法并不需要把熟悉且有效的部分全部撤掉，衔接清楚才能继续原有进度。",
    youngResponse: "自己想出了不同玩法或理解时，让陪伴者看见怎样做，比突然改变更容易接上；旧活动怎样结束也需要一个清楚的小步骤。",
    youthResponse: "已经想明白的理由不一定被别人同时理解。若改变学习或日常做法，说明新办法解决哪一点，能减少各按各的理解继续的落差。" },
  正官: { support: "清楚、可预期的日常约定", response: "理解规则并完成适龄的小责任",
    youngSupport: "什么时候玩、什么时候收拾，以及变化后怎样接续，说明清楚会让日常安排较容易理解。规则需要配合示范，而不只是重复催促。",
    youthSupport: "清楚的活动安排和能够解释的规则，可以让自主尝试有边界。若有共同任务，知道哪些是必须做到、哪些可以商量，较容易形成可靠的回应。",
    youngResponse: "在听得懂的范围里练习轮流、等待和收拾，是理解约定的入口；一次做不到时，还需要知道下一次可以怎样完成。",
    youthResponse: "回应约定不只在被检查时完成，也包括把困难和需要调整的地方说清。规则若只剩催促，自己的理由与商量空间容易退到后面。" },
  七杀: { support: "难点中的及时协助", response: "分清几项要求的先后并表达需要",
    youngSupport: "陌生步骤或几件小事碰到一起时，陪伴者先接住最难的一步，较能让尝试继续。一次只处理听得懂的一小段，比连续催促更容易回应。",
    youthSupport: "几项要求同时来到时，及时解释、示范或补位是较具体的支持。能先处理一个清楚的小目标，比把所有要求都当成必须立刻完成更有余地。",
    youngResponse: "想做的事与正在被提醒的小步骤碰在一起时，需要有人帮助分清先后；说出“还不会”或“需要帮忙”也是回应，而不只是快慢的表现。",
    youthResponse: "日常要求与临时加上的事情可能争用同一段时间。分清先后、说出尚不能独立完成的部分，比把愿意做当成已经都能做到更贴近实际。" }
};
const LABEL: Record<Position, string> = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const RELATION_COMPONENT = { stem_five_combination: "stem", stem_clash: "stem", branch_six_combination: "branch", branch_six_clash: "branch" } as const;
const unique = <T>(items: readonly T[]) => [...new Set(items)];
function role(god: string): ChildRole {
  const found = ROLES[canonicalizeStrengthTenGod(god)];
  if (!found) throw new Error("家庭成长投影的所选十神不可识别。");
  return found;
}
function interactionText(items: NatalRelationshipInteraction[], young: boolean): string {
  const scope = unique(items.map(item => {
    const positions = new Set(item.fact.participants.map(part => part.position));
    return positions.has("year") && positions.has("month") ? "家庭支持与日常回应"
      : positions.has("day") ? "家中安排与自己的尝试" : "当前照应与后续接续";
  })).join("、");
  const first = items[0]!;
  const branch = first.fact.participants[0]!.component === "branch";
  const clash = first.fact.relationType === "stem_clash" || first.fact.relationType === "branch_six_clash";
  if (!branch) return `${scope}在说法和决定上${clash ? "有不同步的主题" : "有相互牵连的主题"}。${young
    ? clash ? "若同一件小事先后得到不同提醒，先听懂这次要做哪一步，才容易继续自己的尝试。" : "若答应参加一个小活动，也连着轮流、收拾等后续步骤，愿意参加和懂得怎样回应需要一起说明。"
    : clash ? "若对一项活动约定有不同理解，具体说清原来答应的内容，有助于让分歧停留在这件事上。" : "若一个活动决定牵连另一项安排，表达自己的愿望，也需要知道后续哪一部分由自己回应。"}`;
  return `${scope}在时间与节奏上${clash ? "有需要协调的一面" : "有彼此联结的一面"}。${young
    ? clash ? "若正在玩的事情要临时停下，熟悉的结束步骤与接下来的照应能帮助转换；突然催着切换，自己的想法可能还没来得及表达。" : "若一起玩或做小作品，陪伴、材料和轮流使用会连在一起；自己的小选择也能在共同安排里有位置。"
    : clash ? "若家中日程与学习或同伴活动碰在一起，两边的时间需要重新衔接；不同节奏不等于谁不在意对方。" : "若一起准备活动或共用材料，日程、使用空间和各自回应会连在一起；共同参与也可以保留个人安排。"}`;
}

/** An age-specific view of the existing family chapter. The original chapter
 * remains the adoption source; this helper does not calculate roles/relations. */
export function buildNatalFamilyLifeStory(input: NatalFamilyLifeStoryInput): NatalFamilyLifeStory {
  const r = revisionRecordSchema.parse(input.revision), c = input.comprehensive, f = c.relationshipFoundation;
  const includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  const sourceBinding = { caseId: r.caseId, revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour, sex: r.input.sex };
  if (!f) throw new Error("家庭成长投影缺少原本命家庭资料。");
  for (const binding of [c.sourceBinding, f.sourceBinding]) if (binding.revisionId !== r.id || binding.chartResultHash !== r.manifest.resultHash || binding.includeHour !== includeHour) throw new Error("家庭成长投影的来源不匹配。");
  if (f.sourceBinding.sex !== r.input.sex) throw new Error("家庭成长投影的登记性别不匹配。");
  const chapters = c.chapters.filter(chapter => chapter.id === "family"), family = f.family;
  if (chapters.length !== 1 || Object.keys(family).some(key => JSON.stringify(chapters[0]![key as keyof typeof family]) !== JSON.stringify(family[key as keyof typeof family]))) throw new Error("家庭成长投影与原家庭章节不一致。");
  const positions: Position[] = includeHour ? ["year", "month", "day", "hour"] : ["year", "month", "day"];
  for (const position of positions) {
    const pillar = r.facts.pillars[position];
    if (pillar.name !== position || pillar.ganZhi !== pillar.stem + pillar.branch || !pillar.hiddenStems.length || pillar.hiddenStems.length !== pillar.branchTenGods.length) throw new Error("家庭成长投影的所选柱事实不完整。");
    if (position !== "day") role(pillar.stemTenGod);
    pillar.branchTenGods.forEach(role);
  }
  if (f.dayPalace.ganZhi !== r.facts.pillars.day.ganZhi || f.dayPalace.mainStem !== r.facts.pillars.day.hiddenStems[0] || f.dayPalace.mainTenGod !== canonicalizeStrengthTenGod(r.facts.pillars.day.branchTenGods[0]!)) throw new Error("家庭成长投影的原日柱不匹配。");
  for (const item of f.interactions) {
    const fact = item.fact, component = RELATION_COMPONENT[fact.relationType as keyof typeof RELATION_COMPONENT];
    if (!component || fact.completeness !== "binary" || fact.participants.length !== 2 || new Set(fact.participants.map(part => part.position)).size !== 2
      || fact.participants.some(part => !positions.includes(part.position) || part.component !== component || part.ganZhi !== r.facts.pillars[part.position].ganZhi || part.value !== r.facts.pillars[part.position][component])) throw new Error("家庭成长投影的原互动参与柱不匹配。");
  }
  let age: LocalReadingAgeContext | null = null;
  if (input.referenceInstant !== null) {
    const instant = Date.parse(input.referenceInstant);
    if (!Number.isFinite(instant) || !/(?:[zZ]|[+-]\d{2}:\d{2})$/u.test(input.referenceInstant)) throw new Error("家庭成长投影需要明确时区的参考瞬时。");
    age = buildLocalReadingAgeContext(includeHour ? r.timeCalibration.utcInstant : null, new Date(instant).toISOString(), new Date(instant + 1).toISOString());
  }
  const child = age?.stage === "young_child" || age?.stage === "youth", young = age?.stage === "young_child";
  let title = child ? "成长中的家庭支持" : "家庭与支持环境";
  let paragraphs = [family.verdict, ...family.paragraphs];
  const evidence = [...family.evidence];
  if (child) {
    const year = role(r.facts.pillars.year.stemTenGod), month = role(r.facts.pillars.month.stemTenGod);
    paragraphs = [`这一阶段的家庭互动，支持一侧着重${year.support}，自己的回应则落在${month.response}。帮助接到听得懂、做得来的小事上，既能感受到照应，也能逐步保留自己的想法。`,
      `支持的方式：${young ? year.youngSupport : year.youthSupport}`,
      `日常的回应：${young ? month.youngResponse : month.youthResponse}`];
    const interactions = f.interactions.filter(item => item.fact.participants.some(part => part.position === "year" || part.position === "month"));
    if (interactions.length) {
      const groups = new Map<string, NatalRelationshipInteraction[]>();
      for (const item of interactions) groups.set(item.fact.relationType, [...(groups.get(item.fact.relationType) ?? []), item]);
      paragraphs.push([...groups.values()].map(items => interactionText(items, young)).join(" "));
    }
    if (includeHour) {
      const hour = role(r.facts.pillars.hour.stemTenGod);
      if (canonicalizeStrengthTenGod(r.facts.pillars.hour.stemTenGod) !== canonicalizeStrengthTenGod(r.facts.pillars.month.stemTenGod)) paragraphs.push(`补充的相处侧重是${hour.response}。${young ? hour.youngResponse : hour.youthResponse}`);
    }
    evidence.push(...positions.filter(position => position !== "day").map(position => {
      const p = r.facts.pillars[position];
      return `成长投影按${LABEL[position]}${p.ganZhi}明透${p.stem}${canonicalizeStrengthTenGod(p.stemTenGod)}说明角色；支内${p.hiddenStems.map((stem, i) => `${stem}${canonicalizeStrengthTenGod(p.branchTenGods[i]!)}`).join("、")}仍按原藏位保留，不当成额外明透要求。`;
    }));
  }
  if (age?.stage === "before_birth") { title = "出生前不安排家庭生活情境"; paragraphs = []; }
  return { version: NATAL_FAMILY_LIFE_STORY_VERSION, sourceBinding,
    sourceVersions: unique([NATAL_FAMILY_LIFE_STORY_VERSION, c.version, f.version]), referenceInstant: input.referenceInstant, age, title, paragraphs,
    sourceSubjects: ["chapter-family"],
    conditions: unique([...(child ? [] : family.cautions), ...f.conditions, ...(age?.conditions ?? ["没有明确参考瞬时，年龄保持未知，沿原家庭条件文字阅读，不假定儿童或成人身份。"]),
      ...(child ? ["这是对原柱位角色与已有二元互动的适龄生活投影，不是古籍原句；不据此认定家人的身份、性格或既往经历，也不把时柱当作已有子女。",
        ...(includeHour && canonicalizeStrengthTenGod(r.facts.pillars.hour.stemTenGod) === canonicalizeStrengthTenGod(r.facts.pillars.month.stemTenGod) ? ["月柱与时柱的明透角色相同，生活主题合并阅读，原位置与事实仍分别保留。"] : [])] : [])]),
    evidence };
}
