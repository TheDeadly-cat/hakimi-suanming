import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment, PreliminarySource } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildNatalStructureDetail } from "../../../../packages/bazi-interpretation/src/natal-structure-detail";
import type { BaziComprehensiveReading, BaziComprehensiveChapter } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { canonicalizeStrengthTenGod } from "../../../../packages/bazi-interpretation/src/strength-policy";
import type { LocalLifeOutlook } from "./local-detailed-outlook";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import { buildReadingTimeline, type LocalReadingTimeline, type ReadingTimelineNarrativeStatement } from "./local-reading-timeline";
import { projectStageAnswers } from "./local-stage-answer";
import { readingTimelineNarrativeSubjectId, readingTimelineNarrativeText, readingTimelineStageText } from "./local-reading-timeline-record";
import { buildReadingFeedbackChoices } from "./local-reading-feedback";
import type { LocalPersonalReading, LocalPersonalReadingEntry, PersonalReadingRecordReference } from "./local-personal-reading";
import { contextualFeedbackText, contextualFeedbackVersions, type LocalContextualReadingBundle } from "./local-contextual-reading-record";
import type { ContextualDomainReading } from "./local-contextual-reading";
import { READING_CONTEXT_FORMAT, type ReadingContextReference } from "./local-reading-context";
import { outlookJudgmentFeedbackText } from "./local-outlook-judgment-record";
import { outlookDirectionCaption, summarizeAnnualJudgmentCaptions, READING_YEAR_SUMMARY_VERSION } from "./outlook-judgment-presentation";
import { buildNatalLifeStory } from "./natal-life-story";
import { buildNatalFamilyLifeStory } from "./natal-family-life-story";
import { buildNatalRelationshipLifeStory } from "./natal-relationship-life-story";
import { buildLifeStageStory } from "./local-life-stage-story";
import { lifeStageStorySubjectId, lifeStageStoryFeedbackText, lifeStageStoryFeedbackVersions } from "./local-life-stage-story-record";

export const READING_SYNTHESIS_VERSION = "hakimi.local-reading-synthesis/0.19.0" as const;
export const LOCAL_READING_SYNTHESIS_VERSION = READING_SYNTHESIS_VERSION;
export interface ReadingSynthesisSection {
  id: string; title: string; paragraphs: string[]; sourceSubjects: string[];
  answer?: string;
  sourceIds?: string[];
  ageAdapted?: boolean;
  lifeAdapted?: boolean;
  contextProjection?: { subjectId: string; reference: ReadingContextReference; referenceYear: number; sourceVersions: string[] };
  origin: "calculated" | "contextual" | "personal"; evidence: string[]; conditions: string[];
}
export interface LocalReadingSynthesis {
  version: typeof READING_SYNTHESIS_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; contextRef: ReadingContextReference | null;
  personalRefs: PersonalReadingRecordReference[];
  headline: string; summary: string; sections: ReadingSynthesisSection[]; conditions: string[]; evidence: string[];
  keyPoints?: { id: "strength" | "obstacle" | "useful"; label: string; text: string; sourceSubjects: string[] }[];
  sources?: PreliminarySource[];
}
export interface LocalReadingSynthesisInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; comprehensive: BaziComprehensiveReading;
  life?: LocalLifeOutlook | null; contextual?: LocalContextualReadingBundle | null; personal?: LocalPersonalReading | null;
  annual?: LocalAnnualOutlook | null; timeline?: LocalReadingTimeline | null;
}
type ChapterId = "overview" | "structure" | "useful_elements" | "career" | "wealth" | "relationships" | "family";
type Route = { title: string; mechanism: string; work: string; resources: string; close: string; sequence: string };
// Short editorial projections of the same paths, not additional chart rules.
const DIRECT_READINGS: Record<string, { title: string; strength: string; obstacle: string }> = {
  "resource-wealth": { title: "已有积累，要用实际需要作取舍", strength: "这盘已有学习、吸收与自身承接的支点。发展更容易从已有积累中选出真正有用的一部分，落实到明确用途和实际需求。", obstacle: "容易继续增加资料、工具或指导，却迟迟没有决定哪些值得使用。当前重点是让实际用途约束重复准备，保留基础，同时减少多余投入。" },
  "resource-output": { title: "靠知识与表达积累优势", strength: "长处在学习、梳理和讲解。把知识用到实际问题中，比继续增加准备材料更能发挥这盘的优势。", obstacle: "容易准备很多、实际完成偏少。先完成一件能展示、能使用的成果，再根据反馈补知识。" },
  "food-wealth": { title: "靠稳定手艺和持续成果积累", strength: "更适合把一项方法练熟，把质量做稳，以持续完成的成果获得认可。", obstacle: "需求增加时，制作、维护和收尾都会增加，容易做得越多、待办也越多。" },
  "hurting-wealth": { title: "靠改进方法和解决问题求发展", strength: "长处在发现旧办法的问题、提出改法。把改法做成别人能验证的成果，才更容易得到采用。", obstacle: "容易把自己认为更好，当成别人一定愿意接受。需要先验证效果，再谈扩大合作。" },
  "peer-output-wealth": { title: "有主见，发展要靠拿得出成果", strength: "既有自己的判断，也有表达和解决问题的线索。个人方法做出实际效果时，更容易争取到合作机会。", obstacle: "合作中容易把决定权、分工和成果归属混在一起。事情开始前就要说明各自负责什么。" },
  "wealth-food": { title: "从实际需要出发，把事情做成", strength: "长处在看见实际用途，并围绕需要组织方法。目标明确时，能力更容易找到用处。", obstacle: "需求可能增加得比方法成熟更快。先确认完成标准，给试做和修正留出时间。" },
  "official-resource": { title: "靠专业积累和认真履责发展", strength: "长处在理解标准、学习方法、把答应的事情做稳。知识和实际职责接得上时，更容易形成长期积累。", obstacle: "要求已经增加，指导、权限或时间却未必同步。接受新责任时要一起落实所需支持。" },
  "official-wealth": { title: "机会与责任常一起增加", strength: "这条主线重视现实条件与职责配合，能围绕明确要求安排投入和完成过程。", obstacle: "机会变多，也可能带来更多责任。先核对范围、权限和后续负担，不能只看眼前规模。" },
  "food-killings": { title: "靠方法处理难题，减少反复应急", strength: "长处在把集中要求拆成可处理的步骤，解决一次问题后，能够留下以后可用的方法。", obstacle: "方法受牵制或执行条件不足时，容易陷入不断应急。先保住完成眼前任务的条件。" },
  "killings-resource": { title: "压力需要方法和支持来化解", strength: "这盘的发展线索在于遇到难题后找到知识、指导和处理办法，再逐步承担要求。", obstacle: "支持若只停留在口头上，事情仍会落回自己身上。先落实实际帮助，再扩大承担范围。" },
  "hurting-resource": { title: "有想法，也需要依据和分寸", strength: "既有提出不同看法的线索，也有学习和核实的条件，适合把主张打磨成有根据的方法。", obstacle: "容易在急于表达和反复校验之间摇摆。补齐关键依据后，应留下实际尝试的机会。" },
  "resource-preservation": { title: "先分清缺的是学习还是实践", strength: "已有积累和理解的线索，可以从真正用得上的知识、方法和帮助开始发展。", obstacle: "准备可能挤占实践，也可能在准备不足时急于求成。先辨清眼前缺口，再决定增加哪一端。" }
};
const DIRECT_BLOCKERS: Record<string, string> = {
  "moderating-wealth-combined": "实际需求与既有支持互相牵动，取舍不够自由。需要先确认哪些条件可以调整、哪些承诺仍须保留，避免把减少准备误成丢掉基础。",
  "official-hurting": "提出的改法容易与既有要求冲突。推进事情时，需要同时说明改动理由和完成标准。",
  "output-resource-combined": "学习支持与表达方式互相牵动，容易讨论和修改很多，真正完成却推迟。先确定一套能执行的办法。",
  "resource-controls-food": "准备和要求会牵制实际执行。需要留住连续做事的时间，不能一直用补充准备替代完成。",
  "owl-controls-food": "稳定产出的办法受到牵制。先解决哪些要求正在打断执行，再增加新的任务。",
  "wealth-controls-key-resource": "眼前事务可能挤占必要的学习、工具或协助。扩大经营前，要先保住做成事情的条件。",
  "wealth-combined": "成果转成回报还受共同约定牵动。先讲清谁确认完成、怎样分配、后续由谁负责。"
};
const ROUTES: Record<string, Route> = {
  "resource-wealth": { title: "让实际用途决定保留哪些积累", mechanism: "印的支持已经当令并重复透出，日主另有自身本气根，当前任务是让已透有根的财对这些支持作取舍。财在这里承担裁印作用：它带入实际用途和投入约束，让准备围绕要完成的事情安排；印的基础仍然保留。", work: "事业上的发挥更贴近筛选、应用和落实：已有知识、经验或外部支持需要进入明确任务，选定一套用得上的办法后持续做成，避免不断换资料、换工具却不开始。", resources: "财务主题先看钱、时间和已有支持怎样对应真实用途。适合核对哪些投入正在被使用、哪些只是重复准备；有财裁印的任务，不等于继续扩大经营或花费就会带来回报。", close: "亲近关系中的陪伴、承诺和空间仍按日支及实际关系另读；不能把事业上减少重复支持的取向直接套到家人或伴侣身上。", sequence: "先保留不可缺的基础，再明确一项实际用途，最后调整多余准备；财若另受合克，须把牵动的支持或约定一并处理。" },
  "resource-output": { title: "理解的深度，需要在真实成果中显出来", mechanism: "这类结构的长处是吸收、理解与表达之间有来路：经验和知识经过自己的消化，才成为别人能够使用的成果。瓶颈也在同一处——准备越深入，越可能挤掉实际尝试；有输出的字，并不等于支持已经顺畅地变成输出。", work: "事业更能体现为把复杂问题讲清楚、把学到的方法用到具体事项，成果的质量比准备材料的多少更能说明能力。", resources: "资源联系发生在成果被使用之后；课程、工具和专业准备如果始终停留在储备里，就还没有完成这条转换。", close: "习惯解释和解决问题时，也要分辨亲近的人是在寻求方法，还是希望先被理解。", sequence: "现实中的先后次序是有限准备、一次可检验的应用，再根据反馈补缺，而不是一直等到完全准备好。" },
  "food-wealth": { title: "能重复的好成果，才承得住持续需求", mechanism: "食神与财的连接强调成熟方法和连续完成：长处不是每次都推翻重来，而是让质量、节奏和可用性逐渐稳定。需求增加时，制作、维护和收尾会一起增加，数量不能替代承接。", work: "事业侧更值得观察的是稳定交付，别人是否愿意持续使用已有方法，以及质量能否在重复中保留。", resources: "资源安排要覆盖完整的完成周期；兑现条件与维护责任若没有同步，做得更多也可能只是留下更多待收尾事项。", close: "平常持续的回应通常比偶尔的表现更容易形成可靠感，也要容许彼此偶尔改变节奏。", sequence: "先证明一件事能稳定完成，再讨论增加数量和持续责任。" },
  "hurting-wealth": { title: "发现问题的锐度，要经过落地才成为价值", mechanism: "伤官取财的线索在于看见旧办法的不足，并给出更有效的做法。主要优势是表达和改进；瓶颈是自己认为更好，与接受方真正愿意采用之间仍隔着验证、标准和完成条件。", work: "事业上的着力点是把不同意见做成可试用的方案，让效果说明问题，而非只赢得一场解释。", resources: "资源联系必须经过真实需求、交付范围与确认条件，关注度或新想法本身不等于已经兑现。", close: "改进事情的敏锐不宜直接变成不断纠正对方；具体问题与被重视的感受可以分别回应。", sequence: "先用小范围结果证明改法有用，再确定合作与资源承诺。" },
  "peer-output-wealth": { title: "自主能力需要成果，也需要清楚的共同边界", mechanism: "禄劫背景中的食伤与财，使独立判断、表达产出与资源安排同时进入主线。长处是愿意亲自推动事情；瓶颈是各自有主张时，产出归属、共同投入和决定权容易混在一起。", work: "事业要让个人方法变成大家能够识别的成果，区分谁负责完成、谁提供条件，以及哪些决定需要共同确认。", resources: "同一份资源既可能支持独立尝试，也可能被共同事项占用；投入和成果归属要跟具体分工对应。", close: "日常相处需要区分共同责任和各自作主的空间，独立不必通过拒绝协作来证明。", sequence: "先做出可检验的成果并明确边界，再增加参与者和共同投入。" },
  "wealth-food": { title: "现实需要推动能力，也要给完成过程留余地", mechanism: "财的背景中见食伤，容易把实际用途和可完成的结果联系起来。优势是能围绕现实需要组织能力；瓶颈是目标或需求增加得比方法成熟更快，结果意识反而压缩了制作与修正过程。", work: "事业更适合从明确需要出发，说明什么成果真正有用，再安排能够完成它的方法。", resources: "资源不是只看投入多少，也要看是否支持成果完成；尚未验证的需求不宜提前占满已有安排。", close: "对结果的重视进入关系后，要给解释缘由和表达感受留位置，不能只比较事情办得快不快。", sequence: "先确认需求与完成标准，再检验方法和投入是否相称。" },
  "official-resource": { title: "专业理解与明确责任，能够形成同一套做事依据", mechanism: "官印承接的线索在于标准、学习支持和自身行动可以有共同依据。长处是愿意理解要求并认真履责；瓶颈是要求已经增加，权限、指导或实际条件却没有随之落实。", work: "事业表现更看重有依据的完成：为何这样做、按什么标准确认，以及遇到差异时如何说明。", resources: "专业准备和履责工具需要真实用途，持续接受要求不等于已经取得相应支持或回报。", close: "可靠的承诺有助于相处，但个人习惯与共同约定需要分开，不必把所有差异都当作责任问题。", sequence: "先确认要求和可用支持，再承担可以兑现的责任。" },
  "official-wealth": { title: "资源与责任相互牵引，扩大一端会改变另一端", mechanism: "财官相生使资源安排与职责要求连在一起。优势是能看到现实条件与规则之间的关系；瓶颈是资源增加也可能伴随更重责任，不能把更多机会简单理解成更轻松。", work: "事业上要看责任是否有明确范围、权限和验收条件，而非只看能否进入更大的事项。", resources: "新增投入需说明支持哪项责任，以及后续由谁持续承担；资源充足与责任适配是两项不同判断。", close: "共同安排可以体现可靠，但生活里的投入也包括时间和协调，不能只按承担规模衡量彼此。", sequence: "先核对资源与责任的对应，再决定扩大或维持原范围。" },
  "food-killings": { title: "面对要求时，方法比单纯加力更关键", mechanism: "食神制杀的线索是用可重复的方法回应集中要求。长处在于把难题拆成可处理的步骤；瓶颈是方法本身受到牵制或承接不足时，只能不断应急，未必真正降低负荷。", work: "事业上应观察解决一次问题之后，有没有留下可复用的办法、清楚的分工和能够交接的成果。", resources: "资源可能支持解决问题，也可能同时带来更多任务；新增支持与新增要求要分别核对，不能只据财星便认定越多越好。", close: "处理难题时容易把回应变成安排任务；亲近的人也可能需要先说明感受，再一起决定怎么做。", sequence: "先判断方法能否接住眼前要求，再谈增加任务和投入。" },
  "killings-resource": { title: "集中要求要经过支持与理解，才容易转成可承担的行动", mechanism: "杀印承接把外部要求、专业支持与自身行动放在同一条链上。优势是可以从压力中提炼要学习和解决的问题；瓶颈是支持只停留在名义上，或准备尚未转成现场可用的方法。", work: "事业更需要具体指导、可用方法和清楚的完成范围，凭意愿硬接所有要求容易掩盖真正缺口。", resources: "资源的价值在于填补承接缺口，而不是仅增加可选事项；要看它是否真正减少重复应对的负担。", close: "忙于回应外部要求时，要说明自己能承担到哪里，不让沉默变成对方只能猜测的距离。", sequence: "先找到确实可用的支持，再把集中要求拆成能够处理的行动。" },
  "hurting-resource": { title: "表达的锋芒，需要足够依据和合适的尺度", mechanism: "伤官配印的线索是表达与理解、校验同时存在。优势是既能提出不同看法，也有机会让看法更有根据；瓶颈是校验压住表达，或表达跑在证据前面，两者都可能让事情停住。", work: "事业上的好结果需要让主张经得起具体检验，说明适用范围，再给接受方可判断的材料。", resources: "准备和验证应服务真实问题；为了证明自己而不断增加材料，可能占用原本留给完成的资源。", close: "充分解释不等于对方已经被听见，讨论方法时仍需给不同体验留下位置。", sequence: "先保留有价值的主张，再补足关键依据，最后用有限尝试检验。" },
  "resource-preservation": { title: "积累与实际表达，需要找到各自的位置", mechanism: "当前主线保留印食取舍，不能把学习支持与输出的同现直接当作互相促进。长处是有积累和理解的线索；瓶颈在于准备是否挤占表达，或急于产出却没有足够承接。", work: "事业侧先观察准备怎样服务实际完成：哪些知识正在使用，哪些只是继续累积而没有进入任务。", resources: "投入围绕真正缺口安排，区分必要支持和重复准备，不把拥有更多工具当成已经获得更多成果。", close: "支持可以是认真听完，也可以是具体协助；先知道对方需要哪一种，帮助才不容易变成新的要求。", sequence: "先辨清当前缺的是积累还是应用，再作有限调整。" }
};
const unique = <T>(values: readonly T[]) => [...new Set(values)];
const versionsEqual = (a: readonly string[], b: readonly string[]) => JSON.stringify(unique(a).sort()) === JSON.stringify(unique(b).sort());
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const chapterOriginal = (chapter: BaziComprehensiveChapter, version: string) => `${chapter.title} · ${chapter.headline}\n${chapter.verdict}\n${chapter.paragraphs.join("\n")}\n综合解读规则：${version}`;
const fixedDate = (instant: string) => new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().slice(0, 10);

/** Cross-topic prose from existing diagnoses. Personal wording is quoted, never
 * interpreted as a new chart fact, career result, relationship event or rule. */
export function buildLocalReadingSynthesis(input: LocalReadingSynthesisInput): LocalReadingSynthesis {
  const r = revisionRecordSchema.parse(input.revision), p = input.assessment, c = input.comprehensive;
  const workingBalance = getWorkingBalance(p);
  const rootedMixedAuthority = workingBalance.focus === "rooted_peer_mixed_authority";
  const binding = { caseId: r.caseId, revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour: r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only" };
  const checkBinding = (value: { revisionId: string; chartResultHash: string; includeHour: boolean; caseId?: string }) => {
    if (value.revisionId !== binding.revisionId || value.chartResultHash !== binding.chartResultHash || value.includeHour !== binding.includeHour
      || (value.caseId !== undefined && value.caseId !== binding.caseId)) throw new Error("综合总评的命盘或时辰来源不一致。");
  };
  checkBinding(p.sourceBinding); checkBinding(c.sourceBinding);
  if (c.patternDiagnosis) checkBinding(c.patternDiagnosis.sourceBinding);
  if (c.usefulGuidance) checkBinding(c.usefulGuidance.sourceBinding);
  if (c.relationshipFoundation) {
    checkBinding(c.relationshipFoundation.sourceBinding);
    if (c.relationshipFoundation.sourceBinding.sex !== r.input.sex) throw new Error("综合总评的传统关系视角与本次登记信息不一致。");
  }
  if (input.personal) checkBinding(input.personal.sourceBinding);
  if (input.timeline && !input.annual) throw new Error("综合总评的走势缺少原年度计算，不能单独使用时间脉络。");
  const timeline = input.annual ? buildReadingTimeline({ revision: r, annual: input.annual, life: input.life }) : null;
  if (input.timeline && stable(input.timeline) !== stable(timeline)) throw new Error("综合总评的走势正文、锚点或来源与原年度计算不一致。");
  const context = input.contextual;
  if (context) {
    checkBinding(context.sourceBinding); checkBinding(context.contextSource.document.sourceBinding);
    if (context.contextSource.document.format !== READING_CONTEXT_FORMAT) throw new Error("综合总评的背景格式不一致。");
    if (input.life && context.referenceYear !== Number(fixedDate(input.life.referenceInstant).slice(0, 4))) throw new Error("综合总评的背景与当前阶段年份不一致。");
  }
  const natalStory = c.patternDiagnosis && c.usefulGuidance ? buildNatalLifeStory({ revision: r, assessment: p, comprehensive: c,
    referenceInstant: input.life?.referenceInstant ?? null, context: context?.contextSource.document.context ?? null }) : null;
  const familyStory = c.relationshipFoundation ? buildNatalFamilyLifeStory({ revision: r, comprehensive: c, referenceInstant: input.life?.referenceInstant ?? null }) : null;
  const relationshipStory = c.relationshipFoundation ? buildNatalRelationshipLifeStory({ revision: r, assessment: p, comprehensive: c,
    referenceInstant: input.life?.referenceInstant ?? null, contextual: context }) : null;
  const sourceVersions = [READING_SYNTHESIS_VERSION, READING_YEAR_SUMMARY_VERSION, p.version, workingBalance.version, c.version,
    ...(natalStory?.sourceVersions ?? []), ...(familyStory?.sourceVersions ?? []), ...(relationshipStory?.sourceVersions ?? []),
    ...(timeline ? [timeline.version, ...timeline.sourceVersions] : []),
    ...(c.patternDiagnosis ? [c.patternDiagnosis.version] : []), ...(c.usefulGuidance ? [c.usefulGuidance.version] : []),
    ...(c.relationshipFoundation ? [c.relationshipFoundation.version] : []),
    ...(context ? [context.version, READING_CONTEXT_FORMAT, `context-record/${context.contextSource.reference.noteId}/${context.contextSource.reference.editVersion}/${context.contextSource.reference.bodySha256}`] : [])];
  const personalRefs: PersonalReadingRecordReference[] = [], sections: ReadingSynthesisSection[] = [];
  const conditions = unique([...p.limitations, ...c.limitations, ...workingBalance.conditions, ...p.seasonal.conditions, ...(natalStory?.conditions ?? []),
    ...(c.patternDiagnosis?.conditions ?? []), ...(c.patternDiagnosis?.blockers.map((item) => item.text) ?? []), ...(c.patternDiagnosis?.rescues.map((item) => item.text) ?? []),
    ...(c.usefulGuidance?.conditions ?? []), ...(c.usefulGuidance?.entries.flatMap((entry) => entry.conditions) ?? []), ...(c.relationshipFoundation?.conditions ?? [])]);
  const evidence = unique([...p.pattern.evidence, ...workingBalance.evidence, ...p.balance.evidence.map((item) => `原计权对照：${item}`), ...p.seasonal.evidence, ...(natalStory?.evidence ?? []),
    ...(c.patternDiagnosis?.evidence ?? []), ...(c.usefulGuidance?.evidence ?? [])]);
  const chapter = (id: ChapterId) => {
    const value = c.chapters.find((item) => item.id === id);
    if (!value) throw new Error(`综合总评缺少原章节 ${id}。`);
    return value;
  };
  const personalFor = (subject: string, original: string, versions: string[]): LocalPersonalReadingEntry | null => {
    const matches = input.personal?.entries.filter((entry) => entry.subjectId === subject) ?? [];
    if (matches.length > 1) throw new Error("综合总评的个人来源主题重复。");
    const entry = matches[0];
    if (!entry) return null;
    if (entry.originalConclusion !== original || !versionsEqual(entry.readingVersions, versions)) {
      conditions.push(`个人记录 ${subject} 与本次原文或版本不同，未用于总评。`); return null;
    }
    if (entry.state !== "adopted") { if (entry.issues.length) conditions.push(...entry.issues); return null; }
    if (!entry.personalText?.trim() || entry.effectiveConclusion !== entry.personalText || entry.issues.length || !entry.selectedReviewRefs.length
      || entry.selectedReviewRefs.some((ref) => !entry.feedback.some((feedback) => feedback.latestReviewRef
        && JSON.stringify(feedback.latestReviewRef) === JSON.stringify(ref) && feedback.reviewState === "revised"
        && feedback.revisedConclusion === entry.personalText && !feedback.chainIssues.length && feedback.canReview))) throw new Error("综合总评的个人采用记录不一致。");
    sourceVersions.push(input.personal!.version, ...entry.readingVersions); personalRefs.push(...entry.selectedReviewRefs);
    return entry;
  };
  const addPersonal = (entry: LocalPersonalReadingEntry, title: string, originalEvidence: string[]) => {
    sections.push({ id: `personal-${entry.subjectId}`, title: `${title} · 已采用的个人修订`, origin: "personal", paragraphs: [entry.personalText!], sourceSubjects: [entry.subjectId],
      evidence: [`原计算或背景原文（保留对照）：${entry.originalConclusion}`, ...originalEvidence,
        ...entry.selectedReviewRefs.map((ref) => `个人复核 ${ref.noteId}；${ref.createdAt}；编辑版本 ${ref.editVersion}；SHA-256 ${ref.bodySha256}`)],
      conditions: ["此段为用户明确采用的个人文本；保留其原文，不把其中的经历、职业、关系或愿望自动转换为新的命盘事实或通用规则。"] });
  };
  const contextualFor = (id: "career" | "wealth" | "relationships") => {
    if (!context) return null;
    const matches = context.readings.filter((item) => item.scope.kind === "natal" && item.scope.chapterId === id);
    if (matches.length > 1) throw new Error("综合总评的背景章节重复。");
    const value = matches[0];
    if (!value || value.scope.kind !== "natal") return null;
    const draft = context.contextSource.document.context;
    if (value.scope.referenceYear !== context.referenceYear || value.scope.referenceYear < draft.fromYear || value.scope.referenceYear > draft.toYear
      || !value.sourceVersions.includes(c.version) || !value.sourceVersions.includes(context.version)) throw new Error("综合总评的背景年份或章节版本不一致。");
    sourceVersions.push(...contextualFeedbackVersions(value, context));
    return value;
  };
  const route = ROUTES[c.patternDiagnosis?.primaryPathId ?? ""] ?? {
    title: "先从本盘已经清楚的分工理解自己", mechanism: `当前保留${p.pattern.background}与实际透藏分工，尚未建立足够明确的跨域作用链。能说明的是各字所在的位置及其作用对象，不把一个月令背景直接扩大成人生优势。`,
    work: "事业主题应回到已经出现的能力与责任线索，通过实际完成情况判断哪一种发挥方式有用。",
    resources: "资源安排与可承担的事项分别核对，没有明确作用链时，不提前断定某种经营路径已经成熟。",
    close: "对外做事和亲近日常可能需要不同回应，应分别说明而非互相代替。", sequence: "先以有限实践辨明自己的发挥方式，再讨论更长期的安排。"
  };
  const structure = chapter("structure"), useful = chapter("useful_elements");
  const natalOverviewPersonal = personalFor("natal-overview", p.headline, [p.version]);
  if (natalOverviewPersonal) addPersonal(natalOverviewPersonal, "命局初判总述", [p.headline, p.summary, ...p.pattern.evidence, ...workingBalance.evidence, ...p.balance.evidence.map((item) => `原计权对照：${item}`)]);
  const overview = chapter("overview"), overviewPersonal = personalFor("chapter-overview", chapterOriginal(overview, c.version), [c.version]);
  if (overviewPersonal) addPersonal(overviewPersonal, "命局总述", overview.evidence);
  const structurePersonal = personalFor("chapter-structure", chapterOriginal(structure, c.version), [c.version]);
  const usefulPersonal = personalFor("chapter-useful_elements", chapterOriginal(useful, c.version), [c.version]);
  const roleEntries = c.usefulGuidance?.entries.filter((entry) => entry.roles.some((role) => role.kind === "path_key")) ?? [];
  const visibleRoles = roleEntries.filter((entry) => entry.presence.startsWith("exposed"));
  const roleText = visibleRoles.slice(0, 2).map((entry) => `${entry.stem}${entry.tenGod}：${entry.presenceText}`).join("");
  const month = r.facts.pillars.month, day = r.facts.pillars.day;
  const factualLead = `月柱${month.ganZhi}透${month.stem}${canonicalizeStrengthTenGod(month.stemTenGod)}，日支${day.branch}主气为${canonicalizeStrengthTenGod(day.branchTenGods[0]!)}。`;
  const blocker = c.patternDiagnosis?.blockers.find((item) => item.scope === "primary"), rescue = c.patternDiagnosis?.rescues.find((item) => item.scope === "primary");
  const originalMechanism = rootedMixedAuthority && c.patternDiagnosis ? c.patternDiagnosis.currentJudgment
    : `${factualLead}${route.mechanism}${roleText ? `实际支点中，${roleText}` : "当前只使用所选柱已经确认的透藏线索。"}${blocker ? `本盘已有的具体牵制是：${blocker.text}` : ""}${rescue ? `同时保留这项救应条件：${rescue.text}` : ""}`;
  if (structurePersonal || usefulPersonal) {
    if (structurePersonal) addPersonal(structurePersonal, "命局主线", [originalMechanism, ...structure.evidence]);
    if (usefulPersonal) addPersonal(usefulPersonal, "取用理解", [...useful.evidence]);
  } else sections.push({ id: "mechanism", title: "这份命局的主线", origin: "calculated", sourceSubjects: ["chapter-structure", "chapter-useful_elements"],
    paragraphs: [originalMechanism, ...(c.usefulGuidance?.answer ? [c.usefulGuidance.answer.summary] : [])], evidence: [...structure.evidence, ...useful.evidence, ...(c.patternDiagnosis?.foundation ?? []), ...(c.usefulGuidance?.entries.flatMap((entry) => entry.evidence) ?? [])],
    conditions: [...structure.cautions, ...useful.cautions, ...(c.patternDiagnosis?.conditions ?? []), ...(c.usefulGuidance?.conditions ?? [])] });

  const domainInfo = (["career", "wealth", "relationships"] as const).map((id) => {
    const original = chapter(id), contextual = contextualFor(id);
    const personal = personalFor(`chapter-${id}`, chapterOriginal(original, c.version), [c.version]);
    const contextualPersonal = contextual && context ? personalFor(contextual.subjectId, contextualFeedbackText(contextual, context), contextualFeedbackVersions(contextual, context)) : null;
    return { id, original, contextual, personal, contextualPersonal };
  });
  const working = domainInfo.filter((item) => item.id !== "relationships"), activeWork = working.filter((item) => !item.personal && !item.contextualPersonal);
  for (const item of working) {
    if (item.personal) addPersonal(item.personal, item.original.title, item.original.evidence);
    if (item.contextualPersonal) addPersonal(item.contextualPersonal, `${item.original.title}的现实背景`, item.contextual!.basis);
    if (item.personal || item.contextualPersonal) continue;
    const career = item.id === "career";
    const text = [career ? route.work : route.resources, item.contextual?.paragraphs[0] ?? "",
      career && workingBalance.direction === "support" ? `当前扶抑判断为${workingBalance.label}，能力发挥还需要现实支持与可承担的范围；新增责任不能只靠意愿硬接。` : "",
      career && activeWork.length === 2 ? route.sequence : ""].filter(Boolean).join("");
    sections.push({ id: item.id, title: career ? "事业与能力发挥" : "财务与回报", origin: item.contextual ? "contextual" : "calculated",
      answer: item.contextual?.summary ?? item.original.verdict,
      paragraphs: [text], sourceSubjects: [`chapter-${item.id}`, ...(item.contextual ? [item.contextual.subjectId] : [])],
      evidence: [...item.original.evidence, ...(item.contextual?.basis ?? [])],
      conditions: [...item.original.cautions, workingBalance.summary, ...workingBalance.conditions, ...(c.patternDiagnosis?.conditions ?? [])] });
  }
  const relation = domainInfo.find((item) => item.id === "relationships")!;
  if (relation.personal) addPersonal(relation.personal, "关系相处", relation.original.evidence);
  if (relation.contextualPersonal) addPersonal(relation.contextualPersonal, "关系的现实背景", relation.contextual!.basis);
  if (!relation.personal && !relation.contextualPersonal) {
    const projected = relationshipStory?.age && ["young_child", "youth", "adult", "before_birth"].includes(relationshipStory.age.stage) ? relationshipStory : null;
    const contextProjection = projected?.appliedRelationship && relation.contextual && context ? {
      subjectId: relation.contextual.subjectId, reference: { ...context.contextSource.reference }, referenceYear: context.referenceYear,
      sourceVersions: [...relation.contextual.sourceVersions]
    } : undefined;
    sections.push({ id: "relationships", title: projected?.title ?? "亲密关系与相处", origin: relation.contextual ? "contextual" : "calculated",
      ...(projected ? { lifeAdapted: true } : {}), ...(contextProjection ? { contextProjection } : {}),
      sourceSubjects: projected?.sourceSubjects ?? ["chapter-relationships", ...(relation.contextual ? [relation.contextual.subjectId] : [])],
      answer: projected ? projected.paragraphs.join("\n\n") || "本参考时点早于出生，不安排个人相处经历。" : relation.contextual?.summary ?? relation.original.verdict,
      paragraphs: projected ? [relation.original.verdict, ...relation.original.paragraphs,
        ...(relation.contextual ? [relation.contextual.summary, ...relation.contextual.paragraphs] : [])] : [...(relation.contextual?.paragraphs ?? relation.original.paragraphs)],
      evidence: [...(projected?.evidence ?? relation.original.evidence), ...(relation.contextual ? [
        `本命关系原结论（保留对照）：${relation.original.verdict}`, ...relation.original.paragraphs.map((line) => `本命关系原文（保留对照）：${line}`), ...relation.contextual.basis
      ] : [])], conditions: projected?.conditions ?? [...relation.original.cautions] });
  }
  const family = chapter("family"), familyPersonal = personalFor("chapter-family", chapterOriginal(family, c.version), [c.version]);
  if (familyPersonal) addPersonal(familyPersonal, family.title, family.evidence);
  else {
    const ageAdapted = !!familyStory?.age && ["young_child", "youth", "before_birth"].includes(familyStory.age.stage);
    sections.push({ id: "family", title: familyStory?.title ?? "家庭与支持环境", origin: "calculated", sourceSubjects: ["chapter-family"],
      ...(ageAdapted ? { ageAdapted: true } : {}),
      answer: familyStory ? familyStory.paragraphs.join("\n\n") || "本参考时点早于出生，不安排家庭生活经历。" : [family.verdict, ...family.paragraphs].join("\n\n"),
      paragraphs: ageAdapted ? [family.verdict, ...family.paragraphs] : [...family.paragraphs],
      evidence: familyStory?.evidence ?? [...family.evidence], conditions: ageAdapted ? familyStory!.conditions : [...family.cautions] });
  }
  if (input.life) {
    const life = input.life;
    if (life.revisionId !== r.id || life.chartResultHash !== r.manifest.resultHash || !Number.isFinite(Date.parse(life.referenceInstant))) throw new Error("综合总评的当前阶段来源不一致。");
    const lifeStory = buildLifeStageStory({ revision: r, assessment: p, life });
    sourceVersions.push(...lifeStory.sourceVersions);
    sourceVersions.push(life.version); conditions.push(...life.limitations);
    const overviewText = `${life.referenceLabel}\n${life.summary}\n岁运解读规则：${life.version}`;
    const overviewPersonal = personalFor("life-overview", overviewText, [life.version]);
    if (overviewPersonal) addPersonal(overviewPersonal, "当前阶段", life.limitations);
    for (const branch of life.branches) {
      const current = branch.currentDecadeId ? life.decades.find((decade) => decade.id === branch.currentDecadeId && decade.branchId === branch.id) : null;
      if (!current) {
        if (branch.currentDecadeId) throw new Error("综合总评的当前大运引用缺失。");
        if (overviewPersonal) {
          const section = sections.find((item) => item.id === "personal-life-overview")!;
          section.evidence.push(`${branch.label}原阶段说明：${branch.summary}`); section.conditions.push(...branch.conditions);
          continue;
        }
        sections.push({ id: `stage-${branch.id}`, title: `${branch.label} · 当前阶段`, origin: "calculated", sourceSubjects: ["life-overview"],
          paragraphs: [`截至${life.referenceLabel}，${branch.label}尚未取得已加载范围内的当前大运。${branch.summary}`], evidence: [], conditions: [...branch.conditions, ...life.limitations] });
        continue;
      }
      checkBinding(current.judgment.sourceBinding);
      const at = Date.parse(life.referenceInstant);
      if (!current.isCurrent || !(Date.parse(current.startInstant) <= at && at < Date.parse(current.endExclusiveInstant))
        || JSON.stringify(current.nodeRef) !== JSON.stringify(current.judgment.targetRef)
        || current.startInstant !== current.judgment.interval.startInstant || current.endExclusiveInstant !== current.judgment.interval.endExclusiveInstant) throw new Error("综合总评的当前大运与实际区间不一致。");
      sourceVersions.push(current.judgment.version, current.judgment.policyVersion);
      const subject = `decade-${current.id}`, original = `${current.headline}\n${current.branchLabel} · ${current.startInstant} 至 ${current.endExclusiveInstant}\n${current.paragraphs.join("\n")}\n${outlookJudgmentFeedbackText(current.judgment)}\n岁运解读规则：${life.version}`;
      const adopted = personalFor(subject, original, [life.version]);
      if (adopted) { addPersonal(adopted, `${branch.label}的当前大运`, current.evidence); continue; }
      if (overviewPersonal) {
        const section = sections.find((item) => item.id === "personal-life-overview")!;
        section.evidence.push(`原${branch.label}阶段（仅供对照）：${original}`, ...current.evidence);
        section.conditions.push(...branch.conditions, ...current.conditions, ...current.judgment.conditions);
        continue;
      }
      const storyBranch = lifeStory.branches.find((item) => item.id === branch.id)!;
      const storyStage = storyBranch.stages.find((item) => item.decadeId === current.id)!;
      const storySubject = lifeStageStorySubjectId(lifeStory, storyStage);
      const storyOriginal = lifeStageStoryFeedbackText(lifeStory, storyBranch, storyStage);
      const storyAdopted = personalFor(storySubject, storyOriginal, lifeStageStoryFeedbackVersions(lifeStory));
      if (storyAdopted) { addPersonal(storyAdopted, `${branch.label}的阶段主线`, [...current.evidence, original]); continue; }
      sections.push({ id: `stage-${branch.id}`, title: `${branch.label} · 当前阶段`, origin: "calculated", sourceSubjects: ["life-overview", subject, storySubject],
        answer: `${current.ganZhi}大运（${fixedDate(current.startInstant)}至${fixedDate(current.endExclusiveInstant)}，不含终点）：${storyStage.headline}。\n\n${storyStage.paragraphs.join("\n\n")}`,
        paragraphs: [`${branch.label}，当前为${current.ganZhi}大运，${fixedDate(current.startInstant)}至${fixedDate(current.endExclusiveInstant)}（UTC+08，不含终点），${current.ageLabel}。${current.career.text}${current.paragraphs[1] ?? ""}原综合判断为“${current.judgment.label}”：${current.judgment.summary}`],
        evidence: [...current.evidence, ...current.judgment.axes.flatMap((axis) => [...axis.evidence, ...axis.blockers, ...axis.rescues])],
        conditions: unique([...branch.conditions, ...current.conditions, ...current.judgment.conditions, ...current.judgment.conflicts, ...storyStage.conditions]) });
    }
  } else conditions.push(timeline
    ? "当前大运定位尚未载入；年份节奏沿用已计算的年度分段，没有把窗口内某一步大运擅称为当前。"
    : "当前大运尚未载入；本次总评只综合本命与已确认背景，没有把某个过去或未来阶段当作当前。");
  if (timeline && input.annual) {
    const annual = input.annual, timelineVersions = [timeline.version, ...timeline.sourceVersions];
    conditions.push(...timeline.limitations);
    const retainPersonal = (entry: LocalPersonalReadingEntry, title: string, originalEvidence: string[], originalConditions: string[] = []) => {
      let section = sections.find((item) => item.id === `personal-${entry.subjectId}`);
      if (!section) { addPersonal(entry, title, []); section = sections.at(-1)!; }
      section.evidence = unique([...section.evidence, ...originalEvidence]);
      section.conditions = unique([...section.conditions, ...originalConditions]);
      return section;
    };
    const overview = personalFor("annual-overview", `${summarizeAnnualJudgmentCaptions(annual)}\n${annual.summary}\n年份总览：${READING_YEAR_SUMMARY_VERSION}\n年度规则：${annual.version}`, [annual.version, READING_YEAR_SUMMARY_VERSION]);
    if (overview) retainPersonal(overview, `${timeline.startYear}—${timeline.endYear}年总览`, [], annual.limitations);
    const adoptedYears = new Map<number, LocalPersonalReadingEntry>();
    for (const choice of buildReadingFeedbackChoices(p, annual, []).filter((item) => item.id.startsWith("annual-"))) {
      const year = Number(choice.id.slice("annual-".length)), adopted = personalFor(choice.id, choice.originalConclusion, choice.sourceVersions ?? []);
      if (adopted) { adoptedYears.set(year, adopted); retainPersonal(adopted, `${year}年`, [], annual.years.find((item) => item.year === year)!.conditions); }
    }
    const adoptedStages = new Map<string, LocalPersonalReadingEntry>();
    for (const stage of timeline.stages) {
      const original = `${readingTimelineStageText(stage)}\n阶段解读规则：${timeline.version}\n来源解读版本：${timeline.sourceVersions.join("、")}`;
      const adopted = personalFor(`timeline-stage-${stage.id}`, original, timelineVersions);
      if (adopted) { adoptedStages.set(stage.id, adopted); retainPersonal(adopted, `${stage.branchLabel} · ${stage.startYear}—${stage.endYear}年阶段`, stage.evidence, stage.conditions); }
    }
    for (const branch of timeline.branches) {
      const narrative = branch.narrative, subject = readingTimelineNarrativeSubjectId(timeline, branch);
      const original = readingTimelineNarrativeText(timeline, branch), adopted = personalFor(subject, original, timelineVersions);
      const stageSection = sections.find((item) => item.id === `stage-${branch.id}`);
      const current = input.life?.decades.find((decade) => decade.branchId === branch.id && decade.id === input.life?.branches.find((item) => item.id === branch.id)?.currentDecadeId);
      const referencedStageIds = new Set(narrative.statements.flatMap((statement) => statement.stageIds));
      const referencedTurnIds = new Set(narrative.statements.flatMap((statement) => statement.turningPointIds));
      const fullConditions = unique([...branch.conditions, ...narrative.conditions,
        ...timeline.stages.filter((stage) => referencedStageIds.has(stage.id)).flatMap((stage) => stage.conditions),
        ...timeline.turningPoints.filter((point) => referencedTurnIds.has(point.id)).flatMap((point) => point.conditions)]);
      if (adopted) {
        retainPersonal(adopted, `${branch.label} · ${timeline.startYear}—${timeline.endYear}年走势`, [
          ...(stageSection ? [...stageSection.paragraphs, ...stageSection.evidence] : [])
        ], [...fullConditions, ...(stageSection?.conditions ?? [])]);
        if (stageSection) sections.splice(sections.indexOf(stageSection), 1);
        continue;
      }
      const visibleStatements: ReadingTimelineNarrativeStatement[] = [], replacedEvidence: string[] = [];
      const replacingEntries = new Map<string, LocalPersonalReadingEntry>();
      for (const statement of narrative.statements) {
        const stages = timeline.stages.filter((stage) => statement.stageIds.includes(stage.id));
        const points = timeline.turningPoints.filter((point) => statement.turningPointIds.includes(point.id));
        const years = new Set([...stages.flatMap((stage) => stage.yearLinks.map((link) => link.year)), ...points.flatMap((point) => [point.before.year, point.after.year])]);
        const replacements = unique([...(overview ? [overview] : []),
          ...[...adoptedYears].flatMap(([year, entry]) => years.has(year) ? [entry] : []),
          ...[...adoptedStages].flatMap(([id, entry]) => statement.stageIds.includes(id) || points.some((point) => {
            const stage = timeline.stages.find((item) => item.id === id)!;
            return stage.yearLinks.some((link) => [point.before, point.after].some((side) => stable(side) === stable(link)));
          }) ? [entry] : [])]);
        if (replacements.length) {
          const originalStatement = `原计算走势（仅供对照）：${statement.text}`;
          replacedEvidence.push(originalStatement);
          for (const entry of replacements) {
            replacingEntries.set(entry.subjectId, entry);
            retainPersonal(entry, entry.subjectLabel, [originalStatement], fullConditions);
          }
        } else visibleStatements.push(statement);
      }
      // Current-decade adoption replaces the current-decade account above, not
      // independent annual judgments. The two sources remain visibly separate.
      const currentLead = stageSection && current
        ? `当前主线：${stageSection.answer ?? `${current.ganZhi}大运（${fixedDate(current.startInstant)}至${fixedDate(current.endExclusiveInstant)}，不含终点）：${outlookDirectionCaption(current.judgment, current.judgment.label)}。`}`
        : stageSection?.paragraphs.join("\n") ?? "";
      const section: ReadingSynthesisSection = stageSection ?? { id: `stage-${branch.id}`, title: "", origin: "calculated", sourceSubjects: [], paragraphs: [], evidence: [], conditions: [] };
      section.title = `${branch.label} · ${timeline.startYear}—${timeline.endYear}年节奏`;
      section.sourceSubjects = unique([...section.sourceSubjects, subject, "annual-overview",
        ...timeline.stages.filter((stage) => stage.branchId === branch.id).flatMap((stage) => [`timeline-stage-${stage.id}`, ...stage.yearLinks.map((link) => `annual-${link.year}`)])]);
      const projections = projectStageAnswers(timeline, branch.id, visibleStatements);
      const calculatedExplanation = [narrative.headline, ...narrative.paragraphs,
        ...projections.flatMap((projection) => projection.originalExplanation ? [projection.originalExplanation] : [])];
      section.answer = [currentLead, ...projections.map((projection) => projection.text)].filter(Boolean).join("\n\n");
      section.paragraphs = unique([...section.paragraphs, ...(replacedEvidence.length ? [] : calculatedExplanation)]);
      section.evidence = unique([...section.evidence, ...replacedEvidence,
        ...(replacedEvidence.length ? calculatedExplanation.map((line) => `原计算走势完整说明（仅供对照）：${line}`) : []),
        ...narrative.statements.map((statement) => `走势锚点：${JSON.stringify({ id: statement.id, kind: statement.kind, stageIds: statement.stageIds, turningPointIds: statement.turningPointIds })}`)]);
      section.conditions = unique([...section.conditions, ...fullConditions]);
      if (!section.answer) {
        // No automatic narrative is promoted over an adopted full overview.
        const firstReplacement = replacingEntries.values().next().value;
        if (firstReplacement) retainPersonal(firstReplacement, firstReplacement.subjectLabel, section.evidence, section.conditions);
        if (stageSection) sections.splice(sections.indexOf(stageSection), 1);
        continue;
      }
      if (!stageSection) sections.push(section);
    }
  }
  const direct = DIRECT_READINGS[c.patternDiagnosis?.primaryPathId ?? ""];
  const replacedSubjects = new Set(sections.filter((section) => section.origin === "personal").flatMap((section) => section.sourceSubjects));
  const keyPoints: NonNullable<LocalReadingSynthesis["keyPoints"]> = [];
  if (direct) {
    keyPoints.push({ id: "strength", label: "更容易发挥的长处", text: natalStory?.strength.text ?? (rootedMixedAuthority && c.patternDiagnosis ? `${workingBalance.label}。身势判断与用字任务分看，官杀取清仍须单独处理。${c.patternDiagnosis.currentJudgment}` : direct.strength),
      sourceSubjects: unique(["natal-overview", "chapter-overview", "chapter-structure", "chapter-career", "contextual-chapter-career", ...(natalStory?.strength.sourceSubjects ?? [])]) });
    const obstacleText = blocker ? DIRECT_BLOCKERS[blocker.id] ?? blocker.text
      : workingBalance.focus === "wealth_after_output" ? "自身有根，也有产出线索，当前重点是让已有成果被使用和认可。继续加任务，不一定补得上这一环。"
      : workingBalance.focus === "output_after_resource" ? "支持与准备已有基础，最需留意反复准备、迟迟不开始实践。先落实一个能够持续完成的出口。"
      : workingBalance.focus === "rooted_peer_mixed_authority" ? "自身有根气，资源与责任也同时在场。最需分清的是哪些要求已经确定、谁有权确认，以及已有支持具体服务哪项任务；不能把要求叠加当成发展机会增加。"
      : workingBalance.direction === "support" ? `当前判断偏向先补帮助、时间和方法，事情一多时更需控制承担范围。${direct.obstacle}` : direct.obstacle;
    keyPoints.push({ id: "obstacle", label: "最容易卡住的地方", text: natalStory?.obstacle.text ?? obstacleText,
      sourceSubjects: unique(["natal-overview", "chapter-overview", "chapter-structure", "chapter-career", "chapter-wealth", "contextual-chapter-career", "contextual-chapter-wealth", ...(natalStory?.obstacle.sourceSubjects ?? [])]) });
  }
  if (c.usefulGuidance?.answer) keyPoints.push({ id: "useful", label: "当前取用先后", text: c.usefulGuidance.answer.headline,
    sourceSubjects: ["natal-overview", "chapter-overview", "chapter-structure", "chapter-useful_elements"] });
  const activeKeyPoints = keyPoints.filter((point) => !point.sourceSubjects.some((subject) => replacedSubjects.has(subject)));
  // Reuse only the life-facing statements that survived the existing personal
  // replacement rules. The full original useful answer remains expandable.
  const main = sections.find((section) => section.id === "mechanism");
  if (main) {
    const mainPoints = activeKeyPoints.filter((point) => point.id === "strength" || point.id === "obstacle");
    if (mainPoints.length) {
      main.answer = rootedMixedAuthority
        ? [mainPoints.find((point) => point.id === "strength")?.text ?? mainPoints.map((point) => point.text).join(""),
          activeKeyPoints.find((point) => point.id === "useful")?.text].filter(Boolean).join("\n\n")
        : mainPoints.map((point) => point.text).join("");
      main.sourceSubjects = unique([...main.sourceSubjects, ...mainPoints.flatMap((point) => point.sourceSubjects)]);
    } else if (!direct) {
      const subjects = ["natal-overview", "chapter-overview", "chapter-structure", "chapter-career", "chapter-wealth", "contextual-chapter-career", "contextual-chapter-wealth"];
      if (!subjects.some((subject) => replacedSubjects.has(subject))) {
        main.answer = `${route.work}${route.sequence}`;
        main.sourceSubjects = unique([...main.sourceSubjects, ...subjects]);
      }
    }
  }
  // New prose follows the existing adopted-subject guards. Original technical
  // paragraphs remain in place for reading, saving and exact comparison.
  if (natalStory && !natalOverviewPersonal && !overviewPersonal) {
    const available = (subjects: readonly string[]) => !subjects.some((subject) => replacedSubjects.has(subject));
    const mainParagraphs = natalStory.mainParagraphs.filter((paragraph) => available(paragraph.sourceSubjects));
    if (main && mainParagraphs.length && activeKeyPoints.some((point) => point.id === "strength") && activeKeyPoints.some((point) => point.id === "obstacle")) {
      main.answer = mainParagraphs.map((paragraph) => paragraph.text).join("\n\n");
      main.sourceSubjects = unique([...main.sourceSubjects, ...mainParagraphs.flatMap((paragraph) => paragraph.sourceSubjects)]);
      if (natalStory.appliedWork) main.origin = "contextual";
    }
    const activeDomains = new Set(activeWork.map((item) => item.id));
    const workParagraphs = natalStory.workWealthParagraphs.filter((paragraph) => activeDomains.has(paragraph.domain) && available(paragraph.sourceSubjects));
    const hasNarrativeAge = natalStory.age && natalStory.age.stage !== "unknown";
    for (const item of activeWork) {
      const section = sections.find((section) => section.id === item.id);
      const paragraphs = workParagraphs.filter((paragraph) => paragraph.domain === item.id);
      if (!section || !paragraphs.length || (section.origin === "contextual" && !hasNarrativeAge)) continue;
      section.answer = paragraphs.map((paragraph) => paragraph.text).join("\n\n");
      section.title = unique(paragraphs.map((paragraph) => paragraph.label)).join(" · ");
      section.sourceSubjects = unique([...section.sourceSubjects, ...paragraphs.flatMap((paragraph) => paragraph.sourceSubjects)]);
      if (natalStory.appliedWork) section.origin = "contextual";
    }
  }
  // Supplemental role decisions are a separate, versioned reading of the same
  // natal facts. They never change the original chapters or their choices.
  const structureDetail = buildNatalStructureDetail({ revision: r, assessment: p, comprehensive: c });
  checkBinding(structureDetail.sourceBinding);
  const detailOriginals = new Map<string, { original: string; versions: string[] }>([
    ["natal-overview", { original: p.headline, versions: [p.version] }],
    ...c.chapters.map((item): [string, { original: string; versions: string[] }] =>
      [`chapter-${item.id}`, { original: chapterOriginal(item, c.version), versions: [c.version] }]),
    ...(c.usefulGuidance?.entries.map((entry): [string, { original: string; versions: string[] }] =>
      [`useful-stem-${entry.id}`, {
        original: `${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}\n${entry.presenceText}\n${entry.judgment}\n${entry.conditions.map((condition) => `条件：${condition}`).join("\n")}\n取用解读规则：${c.usefulGuidance!.version}\n综合解读规则：${c.version}`,
        versions: [c.version, c.usefulGuidance!.version]
      }]) ?? [])
  ]);
  const detailSections: ReadingSynthesisSection[] = [];
  for (const finding of structureDetail.findings) {
    const subjects = unique(["natal-overview", "chapter-overview", ...finding.sourceSubjects]);
    const adopted = subjects.flatMap((subject) => {
      const expected = detailOriginals.get(subject);
      if (!expected) throw new Error("本命作用补断缺少可核对的原章节或用字主题。");
      const entry = personalFor(subject, expected.original, expected.versions);
      if (!entry) return [];
      // The entry and selected review must both belong to this exact current
      // natal choice. A matching subject alone is never sufficient.
      for (const ref of entry.selectedReviewRefs) {
        const feedback = entry.feedback.find((item) => stable(item.latestReviewRef) === stable(ref));
        if (!feedback || feedback.source.revisionId !== binding.revisionId
          || feedback.source.chartResultHash !== binding.chartResultHash || feedback.source.includeHour !== binding.includeHour
          || feedback.source.assessmentVersion !== p.version || !versionsEqual(feedback.source.readingVersions, expected.versions)) {
          throw new Error("本命作用补断的个人采用来源或版本不一致。");
        }
      }
      return [entry];
    });
    detailSections.push({ id: `natal-detail-${finding.id}`, title: finding.title,
      origin: adopted.length ? "personal" : "calculated", sourceSubjects: subjects, sourceIds: [...finding.sourceIds],
      ...(adopted.length ? {} : { answer: finding.decision }),
      paragraphs: adopted.length ? unique(adopted.map((entry) => entry.personalText!)) : [],
      evidence: unique([...(adopted.length ? [`本命作用补断原判断（保留对照）：${finding.decision}`,
        ...adopted.map((entry) => `个人采用对应原文：${entry.originalConclusion}`)] : []), ...finding.evidence,
        ...finding.references.map((ref) => `本命补断依据：${ref.kind} · ${ref.id} · ${ref.path}`)]),
      conditions: unique([...finding.conditions, ...structureDetail.conditions,
        ...(adopted.length ? ["此处优先保留相关章节或用字中明确采用的个人原文，补断原判断仅留作对照。"] : [])]) });
  }
  if (detailSections.length) {
    const mechanismIndex = sections.findIndex((section) => section.id === "mechanism");
    // If the main mechanism was replaced, its individual personal sections
    // keep their original leading positions before the shared comparison.
    sections.splice(mechanismIndex < 0 ? sections.length : mechanismIndex + 1, 0, ...detailSections);
    sourceVersions.push(structureDetail.version, ...structureDetail.sourceVersions);
  }
  return { version: READING_SYNTHESIS_VERSION, sourceBinding: binding, sourceVersions: unique(sourceVersions),
    ...(detailSections.length ? { sources: structuredClone(structureDetail.sources) } : {}),
    contextRef: context ? { ...context.contextSource.reference } : null,
    personalRefs: [...new Map(personalRefs.map((ref) => [JSON.stringify(ref), { ...ref }])).values()],
    headline: structurePersonal || usefulPersonal || overviewPersonal || natalOverviewPersonal || activeKeyPoints.length < keyPoints.length ? "命局理解与已采用的个人修订"
      : natalStory?.headline ?? (rootedMixedAuthority && c.patternDiagnosis ? c.patternDiagnosis.headline : direct?.title ?? route.title),
    summary: personalRefs.length ? "下面单独呈现你已采用的个人文本，原计算支点保留供对照。" : overview.verdict,
    keyPoints: activeKeyPoints, sections, conditions: unique(conditions), evidence: unique([...evidence, ...sections.flatMap((section) => section.evidence)]) };
}
export const buildReadingSynthesis = buildLocalReadingSynthesis;
