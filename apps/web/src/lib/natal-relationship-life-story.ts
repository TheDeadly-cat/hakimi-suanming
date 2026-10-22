import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { NatalRelationshipFoundation, NatalRelationshipInteraction } from "../../../../packages/bazi-interpretation/src/natal-relationship-foundation";
import { canonicalizeStrengthTenGod } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "./local-reading-age-context";
import { buildContextualNatalReadings, CONTEXTUAL_READING_VERSION, type ContextualDomainReading } from "./local-contextual-reading";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import { readingContextDraftSchema, READING_CONTEXT_FORMAT, type ReadingContextReference, type ReadingContextRelationship } from "./local-reading-context";

export const NATAL_RELATIONSHIP_LIFE_STORY_VERSION = "hakimi.natal-relationship-life-story/0.1.0" as const;
type AppliedRelationship = Exclude<ReadingContextRelationship, "unspecified">;
export interface NatalRelationshipLifeStoryInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; comprehensive: BaziComprehensiveReading;
  referenceInstant: string | null; contextual?: LocalContextualReadingBundle | null;
}
export interface NatalRelationshipLifeStory {
  version: typeof NATAL_RELATIONSHIP_LIFE_STORY_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean; sex: RevisionRecord["input"]["sex"] };
  sourceVersions: string[]; referenceInstant: string | null; age: LocalReadingAgeContext | null;
  appliedRelationship: AppliedRelationship | null; contextRef: ReadingContextReference | null;
  title: string; paragraphs: string[]; sourceSubjects: string[]; conditions: string[]; evidence: string[];
}
type Role = { title: string; main: string; shared: string; meeting: string; focus: string; young: string; youth: string };
// Contemporary readings of the already recorded day-palace role. None of these
// entries selects a favorable element, a partner, a date or a relationship outcome.
const ROLES: Record<string, Role> = {
  比肩: { title: "亲近里保留自己，决定不必分输赢",
    main: "相处的主线是自主与对等：愿意靠近，也希望自己的做法和节奏有位置。长处是能够各自承担，不必靠一方包办维持关系；摩擦多在两个人都已经有决定时，小事也可能变成谁先让步。共同决定与个人选择分清，亲近才不需要以取消自己为代价。",
    shared: "若临时改变一起活动的安排，一方想独立处理，另一方可能只需要及时知道变化。愿意说明与必须请对方代办，是不同的需要。",
    meeting: "若正在了解一个人，能否各自安排生活、又愿意回应一次具体邀约，比是否总做同一个选择更能说明相处是否合拍。",
    focus: "各自可以决定的部分与确实需要共同确认的事项",
    young: "与照料者或同伴亲近时，也有想自己拿、自己试的空间。一起玩不必样样照着别人，轮到谁选择与哪些事要一起商量，可以从一个小活动里慢慢理解。",
    youth: "同伴交往里，自主与平等是较鲜明的主题。想自己安排与希望被重视可以同时存在；若一起完成活动，各自能负责的部分与必须共同决定的部分分开，会少一些谁先让步的争执。" },
  劫财: { title: "愿意一起参与，也要看见各自边界",
    main: "相处的主线是共同参与：一起做事、共享条件和及时补位，能让关系有具体联系。长处在于愿意加入彼此生活，摩擦则可能出现在参与范围扩大以后，时间、物品或决定权被默认共用。愿意一起做，不等于每一次都能承担同样的份额。",
    shared: "若共同计划又有别人参与，原来的时间与分工可能随之变化。谁愿意提供帮助、谁继续负责收尾，不能只靠“大家一起”来代替。",
    meeting: "若正在相识，一起参加活动可以看见配合方式；愿意热心帮忙与愿意长期投入，需要从后续的实际回应分别了解。",
    focus: "共同使用的范围、各自投入与仍属于个人的时间",
    young: "一起玩、轮流用玩具或共同收拾，能让亲近有具体内容。大家都想参与时，也会碰到谁先拿、谁先做的小分歧；轮流与等待是可以逐步练习的部分。",
    youth: "同伴间共同参与的机会与各自边界需要一起看。若共用材料或一起活动，参与的人多了，个人时间与物品也可能被默认共用；愿意帮一次与以后都由自己补位应分开。" },
  食神: { title: "靠持续的小回应，把亲近过得踏实",
    main: "相处的长处偏向细小而持续的回应：愿意听、把熟悉的小事做好，能让关心成为可感受到的日常。摩擦不一定来自激烈分歧，也可能是太依赖熟悉的节奏，以为照旧相处已经表达了全部心意。稳定陪伴有价值，真正重要的需要仍要说清。",
    shared: "若已有稳定关系，一起吃饭、散步或做一件顺手的小事，可以维持联系；一方需要认真谈一件事时，只有照常问候可能还没有接住这次期待。",
    meeting: "若仍在了解彼此，多次交流中是否能耐心回应、记住已经谈过的需要，比某一次气氛热络更容易看见相处节奏。",
    focus: "实际需要的回应与已经习惯的相处方式",
    young: "熟悉的游戏、讲故事和每天一点回应，容易让亲近有可期待的节奏。喜欢什么、还想再玩一次或需要停下来，都可以用简单表达让陪伴更贴近自己。",
    youth: "同伴相处较适合从持续的小回应建立熟悉感。一起做活动、分享进展能维持联系；习惯已经形成时，重要期待仍需要直接说明，不必都靠对方猜。" },
  伤官: { title: "把想法说开，也给对方接受的空间",
    main: "相处的长处是愿意指出不合适的地方，让问题有机会被说清。摩擦在于表达的速度可能快过对方理解的速度：本来想改进一件事，听起来却成了否定整个人。理由是否充分与对方是否感到被理解，是两条需要同时接上的线。",
    shared: "若共同计划有一个更省事的新办法，一方在谈效果，另一方可能在意自己的原安排被忽略。改法能否实行与彼此的感受，不能只用一次争论的输赢决定。",
    meeting: "若正在了解一个人，意见不同的一次交流能显示彼此怎样表达；既能说出不赞同，也能听完对方的来由，比始终附和更有辨别力。",
    focus: "具体不满意、希望改变的做法与对方实际接受的范围",
    young: "对玩法或搭建有不同主意时，愿意说出哪里不合适，再试一小步，能让探索被看见。自己的想法被听见不等于每次都要别人照做。",
    youth: "同伴交往中的直接表达可以让问题变得具体。若对活动约定或做法有不同意见，理由与改动的实际影响需要一起说清，避免一件事的分歧变成对人的否定。" },
  正财: { title: "承诺靠持续行动，感受也需要回应",
    main: "相处的主线较重视说到做到：固定时间、持续照应和已经答应的事情，能让重视有具体形状。摩擦是容易把完成多少、付出多少当成唯一尺度，却遗漏对方当下需要的理解。稳定行动与情感回应各有作用，不能用其中一项包办全部亲近。",
    shared: "若已有共同生活安排，一次临时改期会牵动原先答应的陪伴或分工。补做一件事与解释为什么改变，可能分别回应对方不同的需要。",
    meeting: "若仍在相识，比起一次投入很多，几次约定是否有交代、变化是否会说明，更能看见持续回应的方式。",
    focus: "原来答应的投入、临时变化与仍需回应的感受",
    young: "熟悉的陪伴与能够兑现的小约定，能让日常亲近较容易理解。用过的玩具放回原处、游戏结束后接着做下一件小事，也是回应他人的小步骤。",
    youth: "同伴之间已经答应的小事有交代，是较具体的可靠感。按时完成与愿意倾听各有作用；若只比较谁做得更多，真实需要仍可能没被说出来。" },
  偏财: { title: "热心参与有弹性，长期陪伴要留位置",
    main: "相处主题更侧重灵活参与与临时援手：愿意回应新需要，也可能带来不同选择。摩擦在于额外参与与原有承诺争用同一段时间，热心一次并不等于每次都能持续。临时帮助和稳定陪伴分开，才能看清投入各自落在哪里。",
    shared: "若已有共同安排，临时聚会或帮忙可能占到原本留给两个人的时间。新参与是否值得与原约定怎样接续，是两件相连而不同的事。",
    meeting: "若仍在相识，一次热情邀约或帮忙说明当下愿意参与；后续是否持续回应，需要从新的互动里继续了解，不能替对方先定长期承诺。",
    focus: "一次性参与、长期约定与能够持续投入的范围",
    young: "临时换一种玩法、加入小活动或得到替代材料，能让相处有变化。新的热闹与熟悉的休息、陪伴节奏，也需要各有位置。",
    youth: "同伴邀请与临时活动可以带来新的参与。愿意加入与能否持续加入是两件事；原先答应的安排仍需要接续，不必因为热心就把所有邀请都接下。" },
  正印: { title: "先理解彼此，再把帮助落到需要上",
    main: "相处的长处在于理解来由、愿意解释与接住需要。耐心支持能带来安心，摩擦则可能出现在帮助不断增加之后：一方认为自己在照顾，另一方真正需要的却是被听见或自己决定。倾听、建议与代办是不同的回应，不宜混成一种关心。",
    shared: "若对方谈到一件烦心事，立即给出整套办法与先听完感受，可能产生不同体验。具体帮助接到真正不会的一步，亲近才不会被额外要求挤掉。",
    meeting: "若正在了解彼此，能否耐心听完并允许不同决定，比很快替对方安排好事情，更能显示理解的空间。",
    focus: "此刻需要倾听、具体协助还是自己处理的空间",
    young: "听一次示范，再自己试一小步，可以把陪伴变成会做的体验。需要再讲一次或想自己来，都可以说出来，帮助不必把全部尝试接走。",
    youth: "同伴相处里，耐心听懂与给出帮助是长处。若对方只是想把感受说清，连续给建议可能接不上这次需要；自己的办法也不必因接受帮助而全部放下。" },
  偏印: { title: "细微感受能被理解，新办法需要来由",
    main: "相处的长处偏向看见不同角度，能用针对性的办法补上原来没被理解的一点。摩擦是自己已经想明白，却省略了中间过程，对方只看到做法突然改变。独特理解要变成双方都能接上的交流，仍需要把理由与变化说清。",
    shared: "若共同事项换了一种处理方法，原来熟悉的步骤可能还在对方手里。新办法解决什么、旧部分哪些仍有效，说法接上后才不容易各按各的理解继续。",
    meeting: "若正在了解一个人，某个特别合拍的话题可以带来理解感；更多日常情境中的沟通仍要慢慢建立，不能只靠一次默契替代相互了解。",
    focus: "新理解的来由、实际改变与仍然有效的旧安排",
    young: "熟悉说法听不懂时，换个比喻或材料可能帮助理解。自己有了新玩法，也需要让一起玩的人看见怎样做，活动才容易接上。",
    youth: "同伴间不同角度的理解可以补原办法的缺口。若改变活动或沟通方式，交代新办法解决哪一点，比只给一个突然变化的决定更容易被接住。" },
  正官: { title: "约定清楚容易安心，变化也留商量位置",
    main: "相处的主线是明确承诺与可预期的回应：说清责任与边界，能让彼此知道可以依靠什么。摩擦在于约定逐渐只剩检查和催促，一方认为自己在负责，另一方却觉得没有商量空间。稳定与可调整并不矛盾，变化时仍要能说明原因。",
    shared: "若共同计划因现实安排而改变，原先答应的内容需要继续有交代，同时也要看眼前确实能做到多少。把一次变化理解成整体不负责，会让具体问题更难谈清。",
    meeting: "若仍在相识，约定有回应、边界能被尊重，是了解可靠感的实际入口；不必用过早承诺替代逐步了解。",
    focus: "必须回应的约定与能够协商调整的部分",
    young: "轮流、等待与游戏结束后的收拾，需要能听懂的约定和示范。规则清楚可以帮助相处，一次没做到时也要知道下一次怎样接着做。",
    youth: "同伴交往里，清楚的约定能形成可靠感。若时间或做法需要改变，说明来由与可行调整，比只检查是否完全照旧更能继续合作。" },
  七杀: { title: "要求碰在一起时，亲近需要实际支援",
    main: "相处主题较重视在事情集中时怎样回应彼此：及时补位可以让重视落到具体一步。摩擦在于几项需要同时到来，愿意负责与确实有时间承担之间出现距离。亲近不只靠加快回应，还要看哪些需要先处理、哪里确实需要帮助。",
    shared: "若几项共同事项同时需要回应，一方可能在等立即行动，另一方正在处理原先的安排。先后与实际能承担的范围不清时，忙碌容易被误解成不重视。",
    meeting: "若仍在相识，遇到临时变化时如何说明困难、尊重对方的回应时间，比要求随时在线更能显示相处的余地。",
    focus: "回应先后、可承担的范围与实际需要的支援",
    young: "几件小事碰到一起时，先得到最难一步的帮助，较容易继续自己的尝试。说出还不会或需要帮忙也是回应，不必只用快慢来比较。",
    youth: "同伴之间几项要求同时出现时，愿意帮忙与确实有时间要分开。日常安排和临时请求各有先后，说出需要的帮助，比一味答应更容易留下配合余地。" }
};
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const check = (ok: boolean, text: string) => { if (!ok) throw new Error(text); };

function verifyContext(input: NatalRelationshipLifeStoryInput, revision: RevisionRecord): ContextualDomainReading | null {
  const bundle = input.contextual;
  if (!bundle) return null;
  const includeHour = input.comprehensive.sourceBinding.includeHour;
  for (const binding of [bundle.sourceBinding, bundle.contextSource.document.sourceBinding]) check(binding.caseId === revision.caseId && binding.revisionId === revision.id && binding.chartResultHash === revision.manifest.resultHash && binding.includeHour === includeHour, "关系生活投影的背景来源不匹配。");
  check(bundle.version === CONTEXTUAL_READING_VERSION && bundle.contextSource.document.format === READING_CONTEXT_FORMAT, "关系生活投影的背景版本不匹配。");
  const reference = bundle.contextSource.reference;
  check(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(reference.noteId) && Number.isSafeInteger(reference.editVersion) && reference.editVersion > 0 && /^[0-9a-f]{64}$/u.test(reference.bodySha256), "关系生活投影的背景记录身份不完整。");
  const draft = readingContextDraftSchema.parse(bundle.contextSource.document.context);
  const matches = bundle.readings.filter(item => item.scope.kind === "natal" && item.scope.chapterId === "relationships");
  check(matches.length <= 1, "关系生活投影的背景关系章节重复。");
  if (!matches.length) return null;
  const item = matches[0]!;
  check(item.scope.kind === "natal" && item.scope.referenceYear === bundle.referenceYear && draft.fromYear <= bundle.referenceYear && bundle.referenceYear <= draft.toYear, "关系生活投影的背景年份不匹配。");
  const expected = buildContextualNatalReadings({ revision, assessment: input.assessment, comprehensive: input.comprehensive, context: draft, referenceYear: bundle.referenceYear }).find(value => value.scope.kind === "natal" && value.scope.chapterId === "relationships");
  check(!!expected && stable(item) === stable(expected), "关系生活投影的背景正文或原来源被修改。");
  return item;
}
function perspectiveText(f: NatalRelationshipFoundation): string {
  const meaning: Record<string, string> = { 正财: "持续投入与原承诺", 偏财: "临时帮助与额外参与", 正官: "清楚的约定与责任", 七杀: "集中要求与实际支援" };
  return f.perspectives.map(p => {
    const gods = [...p.primaryTenGods, ...p.relatedTenGods];
    const parts = gods.flatMap(god => {
      const occurrences = p.occurrences.filter(o => o.tenGod === god);
      if (!occurrences.length) return [];
      return [`${god}${occurrences.some(o => o.visibility === "visible") ? "在原局明透" : "只在原局藏位"}，补充${meaning[god]}这一观察侧重`];
    });
    return `${f.perspectives.length > 1 ? `${p.id === "wealth" ? "投入" : "约定要求"}视角：` : "原局透藏的补充是："}${parts.length ? parts.join("；") + "。" : "所选柱没有这一视角的对应星，仍以日支相处主题理解，不能推出没有关系。"}${p.id === "wealth" && p.occurrences.some(o => o.tenGod === "偏财") ? "临时参与不替代持续承诺。" : ""}`;
  }).join(" ") + (f.perspectives.some(p => p.occurrences.some(o => o.visibility !== "visible")) ? "藏位保留为观察线索，不当成对方已经明确表达的态度。" : "");
}
function interactionText(items: NatalRelationshipInteraction[], child: boolean, young: boolean): string {
  const palace = items.filter(i => i.scope === "day_palace"), stars = items.filter(i => i.scope === "visible_star");
  const combination = palace.some(i => i.fact.relationType === "branch_six_combination"), clash = palace.some(i => i.fact.relationType === "branch_six_clash");
  const stemCombination = stars.some(i => i.fact.relationType === "stem_five_combination"), stemClash = stars.some(i => i.fact.relationType === "stem_clash");
  const lines: string[] = [];
  if (palace.length) {
    if (child) lines.push(young ? `${combination ? "一起玩或做小东西时，陪伴、材料与轮流使用容易连在同一件事里。" : ""}${clash ? "若活动临时切换，熟悉的结束步骤与下一步安排能帮助转换，自己的想法也需要被听见。" : ""}`
      : `${combination ? "若有同伴活动，共同计划会把时间、材料与各自回应连在一起。" : ""}${clash ? "若家中安排与个人活动的节奏不同，两边需要衔接，不能只要求其中一方一切照旧。" : ""}`);
    else lines.push(`${combination ? "共同计划能把时间、参与和实际分工连在一起。" : ""}${clash ? "已有安排与彼此节奏也有需要协调的一面，临时改期或习惯不同容易让两边都认为自己应被优先照顾。" : ""}${combination && clash ? "愿意一起安排与仍有节奏差别可以同时存在。" : ""}`);
  }
  if (stars.length) lines.push(child ? `${stemCombination ? "一项答应可能连着另一项回应，愿意参加与懂得怎样继续需要一起说明。" : ""}${stemClash ? "若同一件事有不同说法，先弄清这次具体约定，分歧才不必扩大到对人的评价。" : ""}`
    : `${stemCombination ? "明透角色之间还有承诺相互牵连的线索，答应一项安排时，也可能要同时回应另一项期待。" : ""}${stemClash ? "明透角色的冲突另落在说法与决定上，具体分歧不宜扩成对整段关系的判断。" : ""}`);
  return lines.join("");
}

export function buildNatalRelationshipLifeStory(input: NatalRelationshipLifeStoryInput): NatalRelationshipLifeStory {
  const r = revisionRecordSchema.parse(input.revision), c = input.comprehensive, f = c.relationshipFoundation;
  const includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  const sourceBinding = { caseId: r.caseId, revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour, sex: r.input.sex };
  if (!f) throw new Error("关系生活投影缺少原本命关系资料。");
  for (const binding of [input.assessment.sourceBinding, c.sourceBinding, f.sourceBinding]) check(binding.revisionId === r.id && binding.chartResultHash === r.manifest.resultHash && binding.includeHour === includeHour, "关系生活投影的来源不匹配。");
  check(f.sourceBinding.sex === r.input.sex, "关系生活投影的登记性别不匹配。");
  const chapters = c.chapters.filter(chapter => chapter.id === "relationships");
  check(chapters.length === 1 && Object.keys(f.relationship).every(key => stable(chapters[0]![key as keyof typeof f.relationship]) === stable(f.relationship[key as keyof typeof f.relationship])), "关系生活投影与原关系章节不一致。");
  const day = r.facts.pillars.day;
  check(f.dayPalace.ganZhi === day.ganZhi && f.dayPalace.branch === day.branch && f.dayPalace.mainStem === day.hiddenStems[0] && f.dayPalace.mainTenGod === canonicalizeStrengthTenGod(day.branchTenGods[0]!), "关系生活投影的日支事实不匹配。");
  const role = ROLES[f.dayPalace.mainTenGod];
  if (!role) throw new Error("关系生活投影缺少已识别的日支十神。");
  const positions = includeHour ? ["year", "month", "day", "hour"] : ["year", "month", "day"];
  check(stable(f.perspectives.map(p => p.id)) === stable(r.input.sex === "male" ? ["wealth"] : r.input.sex === "female" ? ["authority"] : ["wealth", "authority"]), "关系生活投影的原视角不匹配。");
  for (const perspective of f.perspectives) {
    check(stable(perspective.primaryTenGods) === stable(perspective.id === "wealth" ? ["正财"] : ["正官", "七杀"]) && stable(perspective.relatedTenGods) === stable(perspective.id === "wealth" ? ["偏财"] : []), "关系生活投影的原主次角色不匹配。");
    for (const o of perspective.occurrences) {
    const pillar = r.facts.pillars[o.position], index = pillar.hiddenStems.indexOf(o.stem);
    check(positions.includes(o.position) && o.ganZhi === pillar.ganZhi && (o.visibility === "visible" ? o.position !== "day" && o.stem === pillar.stem && o.tenGod === canonicalizeStrengthTenGod(pillar.stemTenGod)
      : index >= 0 && o.tenGod === canonicalizeStrengthTenGod(pillar.branchTenGods[index]!) && o.visibility === (index === 0 ? "main_hidden" : "residual_hidden")), "关系生活投影的原透藏对象不匹配。");
  }
  }
  for (const item of f.interactions) {
    const branch = item.fact.relationType === "branch_six_combination" || item.fact.relationType === "branch_six_clash";
    check((branch || item.fact.relationType === "stem_five_combination" || item.fact.relationType === "stem_clash") && item.fact.completeness === "binary" && item.fact.participants.length === 2
      && new Set(item.fact.participants.map(part => part.position)).size === 2 && item.fact.participants.every(part => positions.includes(part.position) && part.component === (branch ? "branch" : "stem")
        && part.ganZhi === r.facts.pillars[part.position].ganZhi && part.value === r.facts.pillars[part.position][part.component]), "关系生活投影的原互动参与柱不匹配。");
    check(item.scope !== "day_palace" || branch && item.fact.participants.some(part => part.position === "day"), "关系生活投影混用了原星干与日支层。");
    check(item.scope !== "visible_star" || !branch && item.starOccurrenceIds.length > 0 && item.starOccurrenceIds.every(id => f.perspectives.some(p => p.occurrences.some(o => o.id === id && o.visibility === "visible" && item.fact.participants.some(part => part.position === o.position && part.value === o.stem)))), "关系生活投影混用了原星干与日支层。");
  }
  let age: LocalReadingAgeContext | null = null, year: number | null = null;
  if (input.referenceInstant !== null) {
    const instant = Date.parse(input.referenceInstant);
    check(Number.isFinite(instant) && /(?:[zZ]|[+-]\d{2}:\d{2})$/u.test(input.referenceInstant), "关系生活投影需要明确时区的参考瞬时。");
    age = buildLocalReadingAgeContext(includeHour ? r.timeCalibration.utcInstant : null, new Date(instant).toISOString(), new Date(instant + 1).toISOString());
    year = new Date(instant + 8 * 3_600_000).getUTCFullYear();
  }
  const contextual = verifyContext(input, r), bundle = input.contextual, draft = bundle?.contextSource.document.context;
  const appliedRelationship: AppliedRelationship | null = age?.stage === "adult" && contextual && bundle && year === bundle.referenceYear && draft && draft.relationship !== "unspecified" ? draft.relationship : null;
  const child = age?.stage === "young_child" || age?.stage === "youth", young = age?.stage === "young_child";
  const preserveContext = (!age || age.stage === "unknown") && !!contextual;
  const consumeContext = !!appliedRelationship || preserveContext;
  let title = child ? "同伴表达与相处边界" : role.title;
  let paragraphs: string[];
  if (preserveContext) { title = contextual!.title; paragraphs = [contextual!.summary, ...contextual!.paragraphs]; }
  else if (child) paragraphs = [young ? role.young : role.youth,
    young ? "亲近可以从一件听得懂、做得到的小事里建立：轮到自己时表达想法，轮到别人时也看见对方的需要。遇到不愿意继续的活动，可以说出来，再一起找到能接续的小步骤。"
      : "若有学习或同伴活动，彼此希望得到的回应不必完全相同。能够说清自己的需要，也容许别人保留不同做法，才不会把一起参与变成必须处处一致。",
    interactionText(f.interactions, true, young)];
  else if (!age || age.stage === "unknown") paragraphs = [role.main, `在实际共同事项中，具体落点是${role.focus}。只按已经存在的互动理解，不补出伴侣或关系状态。`, interactionText(f.interactions, false, false)];
  else {
    const scene = appliedRelationship === "single" ? `按你填写的单身背景，${role.meeting}`
      : appliedRelationship === "partnered" ? `按你填写的有伴侣背景，${role.shared.replace(/^若已有稳定关系，/u, "在日常相处中，")}`
        : appliedRelationship === "married" ? `按你填写的已婚背景，若有共同生活或长期安排，${role.focus}也会落在反复发生的小事里。执行、提醒与收尾分别由谁承担，会影响彼此对付出的感受；一时完成与长期可持续需要分开。`
          : appliedRelationship === "separated" ? `按你填写的分开或分居背景，若仍有需要联系的共同事项，重点是${role.focus}。沟通只围绕确实还需协商的内容，各自的日常决定不再默认为对方的义务；这不预设是否复合或关系最后走向。`
            : `${role.shared}${role.meeting}`;
    paragraphs = [role.main, scene, perspectiveText(f), interactionText(f.interactions, false, false)];
  }
  if (age?.stage === "before_birth") { title = "出生前不安排个人相处情境"; paragraphs = []; }
  const contextRef = consumeContext && bundle ? { ...bundle.contextSource.reference } : null;
  return { version: NATAL_RELATIONSHIP_LIFE_STORY_VERSION, sourceBinding,
    sourceVersions: unique([NATAL_RELATIONSHIP_LIFE_STORY_VERSION, input.assessment.version, c.version, f.version,
      ...(consumeContext && bundle && contextual ? [...contextual.sourceVersions, bundle.version, READING_CONTEXT_FORMAT, `context-record/${contextRef!.noteId}/${contextRef!.editVersion}/${contextRef!.bodySha256}`] : [])]),
    referenceInstant: input.referenceInstant, age, appliedRelationship, contextRef, title, paragraphs: paragraphs.filter(Boolean),
    sourceSubjects: ["chapter-relationships", ...(consumeContext && contextual ? [contextual.subjectId] : [])],
    conditions: unique([...(!child && age?.stage !== "before_birth" ? f.relationship.cautions : []), ...f.conditions, ...(age?.conditions ?? ["没有明确参考瞬时，年龄保持未知；若有已验证背景，保留其原答复，不另套儿童或成人关系状态。"]),
      "相处倾向与现代场景只沿原日支角色、透藏及二元互动组织，不从事业格局推出关系吉凶，也不推婚期、人数或概率。",
      ...(!f.interactions.some(item => item.scope === "day_palace" || item.scope === "visible_star") ? ["原层未列日支或明透星干的二元合冲情境；未见互动不作关系好坏结论，不补写已经发生的矛盾。"] : []),
      ...(child ? ["儿童情境只涉及照料、同伴表达和边界，不套伴侣、家庭开销或传统妻夫身份。"] : [])]),
    evidence: unique([...f.relationship.evidence, f.dayPalace.summary, ...(consumeContext && contextual ? contextual.basis : [])]) };
}
