import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { NatalWealthResourceTaskKind } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { buildLocalReadingAgeContext, type LocalReadingAgeContext } from "./local-reading-age-context";
import { readingContextDraftSchema, READING_CONTEXT_FORMAT, type ReadingContextDraft, type ReadingContextWork } from "./local-reading-context";

export const NATAL_LIFE_STORY_VERSION = "hakimi.natal-life-story/0.3.0" as const;
export interface NatalLifeStoryText { text: string; sourceSubjects: string[] }
export interface NatalLifeStory {
  version: typeof NATAL_LIFE_STORY_VERSION;
  sourceBinding: { caseId: string; revisionId: string; chartResultHash: string; includeHour: boolean };
  sourceVersions: string[]; referenceInstant: string | null; referenceYear: number | null;
  age: LocalReadingAgeContext | null; appliedWork: ReadingContextWork | null;
  pathId: string; headline: string; strength: NatalLifeStoryText; obstacle: NatalLifeStoryText;
  mainParagraphs: NatalLifeStoryText[];
  workWealthTitle: string;
  workWealthParagraphs: (NatalLifeStoryText & { domain: "career" | "wealth"; label: string })[];
  conditions: string[]; evidence: string[];
}
export interface NatalLifeStoryInput {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; comprehensive: BaziComprehensiveReading;
  referenceInstant: string | null; context?: ReadingContextDraft | null;
}
type Setting = { opening: string; activity: string; result: string; resources: string; people: string; example: string; confirmation: string };
type Route = { headline: string; strength: string; opening: string; development: string; recurrence: string;
  career: (setting: Setting) => string; wealth: (setting: Setting) => string };
const unique = <T>(values: readonly T[]) => [...new Set(values)];
const MAIN_SUBJECTS = ["chapter-structure", "chapter-useful_elements"];

// Editorial interpretations of already selected paths. No role, strength,
// element preference or event direction is selected by this table.
const ROUTES: Record<string, Route> = {
  "peer-output-wealth": {
    headline: "有自己的判断，用做出来的东西说服人",
    strength: "独立想法与表达能力相连，拿出作品、方法或实际结果，比反复争辩更能让人看见价值。",
    opening: "这份命局的主线是先有自己的想法，再通过表达和动手把它变成别人能看见的东西。与人合作时，并不是没有合作意愿，而是希望自己的判断和付出也有位置。",
    development: "发展更容易从一件自己能负责到底的事情开始：拿出一个作品、一次解决问题的办法，别人便有了理解和回应的入口。把主张落到结果，比急着证明谁的想法更好更有力量。",
    recurrence: "容易反复的难处，是事情还没有做完，讨论已经转向谁说了算、谁付出更多。自己的做法有价值，也要经过别人使用后的反馈；自主与协作需要各有空间。",
    career: (s) => `${s.opening}${s.activity}中，较能发挥个人判断的地方，是把难点讲清，再拿出${s.result}。${s.example}这会让意见从争论变成可以比较的做法，也让协作的人知道哪一部分可以交给自己。`,
    wealth: (s) => `${s.resources}与个人成果、共同使用往往连在一起。完成者、提供条件的人和最后使用的人可能不同；${s.confirmation}落实后，付出才有清楚的承接，不能只靠“大家一起做”的口头默契。`
  },
  "resource-output": {
    headline: "理解和积累是底子，拿出来才成为长处",
    strength: "愿意弄懂来龙去脉，也有把理解细致呈现的线索；积累经过讲解、作品或实际使用，才显出价值。",
    opening: "这份命局更重理解、吸收与整理，做事常想先弄明白，再拿出自己的东西。长处不只在知道得多，而在能够把零散内容理成别人用得上的方法；已经有表达出口，不必一直等到准备完全。",
    development: "发展过程更像先理解一层，再做出一层。一次讲解、一份作品或一个实际尝试，会暴露真正需要补的地方；只继续收集资料，反而可能把已经会的部分迟迟留在准备里。",
    recurrence: "反复的难处，是对准备的要求越来越高，实际呈现却不断向后挪。也可能已经说明很多，却还没有让接受的人亲手用过；被理解与被使用，是不同的一步。",
    career: (s) => `${s.opening}${s.activity}更适合让知识变成${s.result}。${s.example}第一次呈现不必包揽所有内容，实际反馈会比继续补齐整套资料更清楚地指出下一步。`,
    wealth: (s) => `${s.resources}的价值在于已经被使用的部分。准备很充分，却没有进入一次具体应用时，投入还没有走完这条主线；${s.confirmation}把完成与后续使用接起来，积累才不只是越来越多的储备。`
  },
  "food-wealth": {
    headline: "把一件事做稳，靠持续的好成果积累",
    strength: "熟悉的方法、稳定的质量和持续回应，是比一时表现更可依靠的长处。",
    opening: "这份命局的发挥偏向把会做的事情做细、做稳，让别人一次次愿意使用。成长不一定靠频繁换方向，而是让熟练程度、完成节奏和实际用途逐渐接在一起。",
    development: "一件事能重复做好，会带来比偶尔出彩更清楚的信任。发展关键在于完成之后仍能维护、解释和接续；需求增加时，熟练的方法才接得住下一轮。",
    recurrence: "容易反复的是做得越多，收尾和维护也越多。若只看新成果，不看旧成果还占用多少时间，原来稳定的节奏也会被追加事项打乱。",
    career: (s) => `${s.opening}${s.activity}的长处更容易体现在连续做出${s.result}。${s.example}一次做得好之后，质量和衔接能否继续保持，比马上增加数量更能说明这条发展方式。`,
    wealth: (s) => `${s.resources}要覆盖制作、使用和维护的完整过程。${s.confirmation}不能只算眼前完成的一次；后续还要花多少时间、材料或照应，会影响这些成果是否能持续。`
  },
  "hurting-wealth": {
    headline: "看得出旧办法的问题，也要让改法被用起来",
    strength: "发现不合理之处、提出更有效的做法，是这条主线较鲜明的发挥方式。",
    opening: "这份命局较有“为什么一定要这样做”的追问，容易注意到旧办法的漏洞。真正形成价值的时刻，是不同意见已经变成可试用的改法，而不只是说得有道理。",
    development: "发展常通过一次次改进积累：做一个样例，让效果先出现，再让接受的人决定怎样使用。主张越鲜明，越需要一段试用来连接自己的判断和别人的需要。",
    recurrence: "容易反复的难处，是自己已经看见问题，别人却还没有准备好接受改动。解释越急，对方越可能守住旧标准；更好的方法也需要合适的进入方式。",
    career: (s) => `${s.opening}${s.activity}可以从一个小改动开始形成${s.result}。${s.example}让使用前后的差别说话，会比一次提出太多改法更容易被理解和采用。`,
    wealth: (s) => `${s.resources}先支持验证，而不是一开始就承担完整扩张。得到关注与实际采用之间还有距离；${s.confirmation}明确后，试用成本、修改次数和后续承担才有边界。`
  },
  "wealth-food": {
    headline: "看见实际需要，再把办法练到能完成",
    strength: "对事情有没有用较敏感，明确需要能够带动方法和行动。",
    opening: "这份命局较容易从“眼前需要解决什么”进入行动。目标清楚时，学习、方法和投入较有方向；它的长处在于把实际用途与做得出的结果联系起来。",
    development: "发展不是先铺开很多可能性，而是围绕一个真实需要，把完成方法逐渐做熟。试做和修正本身也是进展，不必因为尚未达到最后标准就否定中间积累。",
    recurrence: "容易反复的是需求增长得比方法成熟更快。越想赶快做成，越可能压缩练习和修正，结果又需要返工；目标意识需要与完成节奏一起长大。",
    career: (s) => `${s.opening}${s.activity}先有明确用途，再逐步形成${s.result}，会比同时追赶许多要求更有连续性。${s.example}实际使用后的差距，正是下一轮改进的入口。`,
    wealth: (s) => `${s.resources}围绕已经确认的需要安排，才不容易被尚未验证的设想占满。${s.confirmation}与完成方法一起明确，投入才既有去向，也留得出修正的余地。`
  },
  "official-resource": {
    headline: "认真理解要求，靠专业积累把责任做稳",
    strength: "理解标准、学习方法与认真回应承诺可以形成同一条积累路径。",
    opening: "这份命局重视做事有依据，也在意答应的事情有没有交代。它的发展线索是把外部要求真正弄懂，再形成自己能执行的办法；负责并不只是多承担，还包括知道怎样完成。",
    development: "当明确的标准与可用的方法接上，可靠感会从一次次完成中积累。学习不必与行动分开：边做边说明理由、留下可复用的记录，会让经验更稳。",
    recurrence: "容易反复的难处，是责任先增加，指导、时间或决定权限却没有跟上。认真可能变成不断替缺口补位，别人以为事情已经有人负责，实际完成却仍缺支撑。",
    career: (s) => `${s.opening}${s.activity}适合把要求、做法和${s.result}连在一起。${s.example}能说明为何这样做，也能说明需要哪些支持，才不容易只剩下“我来负责”。`,
    wealth: (s) => `${s.resources}更像履行承诺的配套，而非接受更多要求的理由。${s.confirmation}与实际可用支持同步时，投入才服务于完成，不会一直先付出、再等配套。`
  },
  "official-wealth": {
    headline: "看重把事情办成，也要接住随之而来的责任",
    strength: "现实用途与明确要求相连，能够围绕完成结果组织投入。",
    opening: "这份命局较重视事情能否落实，也容易把资源和责任放在一起考虑。得到更多可用条件时，往往也会面对更明确的要求；它的发展不只在增加投入，而在投入能支持怎样的承担。",
    development: "一件事情从有条件做，走到按约定完成，是这条主线的积累方式。标准、权限和实际支持越能彼此对应，努力越不容易花在反复协调上。",
    recurrence: "容易反复的是看到了机会或可用条件，却低估随后的责任、协调和维护。规模增加未必让事情更轻松，已经接下的内容仍要有人持续完成。",
    career: (s) => `${s.opening}${s.activity}中，${s.result}与明确的完成标准联系较紧。${s.example}自己能决定什么、哪些需要别人配合，会影响责任是否真正落得下来。`,
    wealth: (s) => `${s.resources}带来用途，也会带来相应承担。${s.confirmation}若只明确眼前的一次，却没有说明以后谁继续提供时间或支持，完成后仍可能留下新的负担。`
  },
  "food-killings": {
    headline: "面对难题，用熟悉的方法减少反复应急",
    strength: "把集中的要求拆成可处理的步骤，是这条主线有价值的能力线索。",
    opening: "这份命局的发挥不在于遇到难题就一味加力，而在于找到可以重复使用的办法。事情有压力时，先做哪一步、靠什么完成，会比同时硬接全部要求更重要。",
    development: "一次问题解决后留下的方法、记录和交接，会成为下一次不必重来的基础。随着处理步骤更成熟，经验才从“撑过去一次”变成以后还能使用的能力。",
    recurrence: "容易反复的难处，是原有方法被打断，事情仍催着完成。新投入也可能带来新要求；若解决步骤尚未稳住，只增加人手或材料未必让负担减轻。",
    career: (s) => `${s.opening}${s.activity}可以把一个难点拆成小步骤，逐步形成${s.result}。${s.example}是否留下下一次还能使用的办法，比一时忙碌更能体现积累。`,
    wealth: (s) => `${s.resources}只有真正支持关键步骤，才会缓解反复应对。${s.confirmation}也要区分原来要完成的部分与新增要求，否则得到支持的同时可能又接下更多事情。`
  },
  "killings-resource": {
    headline: "要求越集中，越需要把支持变成会用的方法",
    strength: "从难题里找到要学习和解决的部分，是这条主线的发展入口。",
    opening: "这份命局常把较强的要求、学习支持和自身行动放在同一条线上。发展更像遇到一个不熟悉的难题，再借理解、指导与练习，把它变成可以处理的事情。",
    development: "真正有用的支持不是只有人告诉怎样做，而是自己逐步掌握具体步骤。帮助一旦接到行动，承担才不只是凭意愿硬撑，也能留下之后独立处理的经验。",
    recurrence: "容易反复的是要求已经到眼前，方法或帮助还停在后面。若每次都先答应，再独自补足，支持与承担的距离可能越来越大。",
    career: (s) => `${s.opening}${s.activity}先从可以获得解释、示范或练习的一环开始，逐步形成${s.result}。${s.example}把会用的方法留下来，下一次就不必完全依赖临时帮助。`,
    wealth: (s) => `${s.resources}的价值在于补上完成中的实际缺口。${s.confirmation}若同时增加了可选事项，却没有减轻关键步骤的困难，就仍需分清哪些是真正的支持。`
  },
  "hurting-resource": {
    headline: "想法有锋芒，经过依据打磨才更有说服力",
    strength: "不同看法与学习核实能够互相校正，让表达不只停在态度。",
    opening: "这份命局既有提出不同意见的线索，也重视把理由弄清楚。好的发挥是在保留主张的同时，让它经得起检验；表达与校验相互帮助时，想法才更有分量。",
    development: "发展不必等到毫无疑问才开始，也不宜只凭一时判断就推翻旧做法。补足关键依据，再做有限尝试，能让修正围绕实际问题展开。",
    recurrence: "容易反复的是一边急于把看法说出来，一边又不断检查自己是否足够充分。说明越来越多，实际尝试却迟迟没有开始，或反过来让表达跑在证据前面。",
    career: (s) => `${s.opening}${s.activity}适合用一份有依据、能比较的${s.result}来表达主张。${s.example}别人能够看到适用范围，便更容易讨论哪里值得保留、哪里需要调整。`,
    wealth: (s) => `${s.resources}应支持验证一个真实问题，而不是不断增加材料来证明自己。${s.confirmation}能帮助区分必要验证与重复说明，避免准备越多，能够完成的时间越少。`
  },
  "resource-preservation": {
    headline: "积累有价值，也要分清缺的是准备还是实践",
    strength: "理解和学习的基础可以成为依靠，关键在于这些支持有没有真正进入生活。",
    opening: "这份命局保留了理解、积累与支持的线索，但不能把准备和表现简单当作彼此越多越好。对自己而言，真正有用的知识、方法和帮助，应该能让一件事情更容易完成。",
    development: "发展常要在两种反复中找位置：准备不足时补一段理解，准备已经足够时留下实践机会。能分辨眼前缺哪一端，比不断增加课程、材料或工具更重要。",
    recurrence: "容易反复的是还没开始就继续准备，或者急于拿出结果又撤掉必要支持。学习与使用需要相接，不能长期由其中一端替另一端做事。",
    career: (s) => `${s.opening}${s.activity}可以从已经会用的一小部分开始形成${s.result}。${s.example}哪一步确实卡住，再补那一步的方法，会比从头重新准备整套内容更有连续性。`,
    wealth: (s) => `${s.resources}先保留已经用得上的基础，再分辨尚未使用的储备。${s.confirmation}有助于知道哪些投入正在解决问题，哪些只是继续增加拥有的东西。`
  },
  "resource-wealth": {
    headline: "积累已经有底子，要让实际用途决定取舍",
    strength: "学习、吸收与自身承接已有支点，筛出真正有用的一部分，比继续增加准备更能发挥积累。",
    opening: "这份命局不是没有可用的积累，而是资料、方法和支持已经较多，需要一个明确用途把它们收拢。发展关键在于选：哪些已经足够开始，哪些继续增加也不会让眼前的事更好做。",
    development: "当一项实际需要清楚以后，课程、材料、工具或已有经验便有了取舍标准。保留必要基础，放下重复准备，理解才更容易进入使用；实际用途让过多的选择收拢成一条能走下去的路。",
    recurrence: "容易反复的是每多一个选择，就又多一轮比较和准备。也可能觉得过去已经投入很多，因而不愿停掉不再使用的部分；真正的难处是作取舍，不是继续堆积。",
    career: (s) => `${s.opening}${s.activity}更值得发挥的是筛选和应用，让已有积累变成一项${s.result}。${s.example}用同一件事检验哪些方法真正需要，比不断换工具、换资料更能形成自己的做法。`,
    wealth: (s) => `${s.resources}在这里用来限定准备的范围：眼前确实用得上的部分继续，重复课程、闲置材料或多余工具不必因已经拥有而继续加码。${s.confirmation}让用途带着投入走；保留真正需要的基础，已经拥有的东西才能持续派上用场。`
  }
};

type WealthResourceStoryKind = Extract<NatalWealthResourceTaskKind, "official_joint" | "resource_first" | "wealth_first">;
// These routes describe the producer's selected task. They do not infer root
// strength, suppress a relationship fact, or select a task from prose.
const WEALTH_RESOURCE_ROUTES: Record<WealthResourceStoryKind, Route> = {
  official_joint: {
    headline: "愿意把事情办妥，方法与实际条件各有分工",
    strength: "既看事情有没有着落，也重视做法是否清楚；把实际可用的条件与会用的方法分别安排，可靠感更容易积累。",
    opening: "这盘不只是认真负责，也有把条件和方法分开考虑的线索。时间、用品与他人的配合，让一件事有条件开展；理解、示范与练习，让自己知道怎样完成。两边各有用处，可用条件不能代替把方法学会，学会了方法也仍需要实际配合。",
    development: "较能发挥的，是把想做到的事情、已经会的方法和实际可用的帮助放在同一件事里。自己逐渐弄懂为什么这样做，也让参与者知道哪里需要配合，承担便不只是答应下来，而能慢慢成为做得稳的能力。",
    recurrence: "容易卡住的地方，是把不同的缺口都当成自己还不够努力：有时缺的是时间或用品，有时缺的是说明与练习。只增加投入未必让人学会，反复讲解也不能替代实际条件；两种支持需要各尽其用。",
    career: (s) => `${s.opening}${s.activity}既需要可用条件，也需要自己会做。${s.example}${s.people}提供配合，与自己把方法弄懂，是两件相互帮助的事；两边配合得上，完成的节奏才更稳定，而不是只多接一份要求。`,
    wealth: (s) => `${s.resources}在这里主要是让已答应的安排有条件进行。用品和时间应服务于明确的用途，必要的示范、学习与帮助则继续保留；${s.confirmation}也要分别说明，不能用追加投入代替把方法学会。`
  },
  resource_first: {
    headline: "想做出的东西不少，先找回能继续做下去的方法",
    strength: "对改进和实际用途有想法；得到合适的解释、示范与帮助后，更容易把想法整理成自己能完成的部分。",
    opening: "这盘更突出的拉扯，是想表达、想改进，也看重事情最后有没有用，但这些要求容易走在自己已经掌握的方法前面。当前的发展重点不是继续多做、多投入，而是让必要的理解、指导和帮助重新进入，先有能反复使用的办法。",
    development: "当一件事总要临时想办法，补上真正缺少的步骤，往往比再增加一个目标更有用。有人示范、自己试一次、再把卡住的地方弄懂，想法才能逐渐变成本领；这不是放弃实际用途，而是让完成不再只靠赶着做。",
    recurrence: "容易反复的是事情越想做成，越把学习和求助往后放，最后同一个难处还要重新应付。必要支持没有跟上时，增加数量和投入只会带来更多要完成的部分；先恢复会做的感觉，才有余地让改法继续发展。",
    career: (s) => `${s.opening}${s.activity}中，更重要的是补上自己尚未掌握的做法。${s.example}把${s.people}能提供的解释或示范用在实际卡点，${s.result}便能逐步做出来；这比同时追赶更多成果更能留下自己的本领。`,
    wealth: (s) => `${s.resources}应先支持必要的学习、示范与练习。希望看到用途，不等于眼下就要继续增加投入；先让已经投入的部分有方法可做，${s.confirmation}才不会只变成下一轮催促或追加。`
  },
  wealth_first: {
    headline: "理解和准备已有支点，让实际用途决定留下什么",
    strength: "学习与准备有自己的基础，也有尝试不同做法的线索；围绕一个真实用途作选择，积累更容易成为能使用的本领。",
    opening: "这盘当前不缺继续理解和准备的线索，较需要补的是把准备带到实际使用。想法可以有变化，资料与方法也可以很多，但如果一直围绕怎样准备得更周全，已经会的部分反而迟迟没有机会被用上。",
    development: "较合适的发展，是让一个真实需要给准备划出范围：这次确实用得上的继续，暂时无用的先放下。用过之后再调整，才知道哪些积累有价值；实际用途在这里是筛选准备的尺度，还不能等同已经取得回报。",
    recurrence: "容易卡住的是舍不得已有准备，或每次想到新办法就再添一轮资料和工具。选择增加了，行动反而变小；眼前用途若还不清楚，急着撤掉所有支持也会走向另一端。保留必要基础，让一小部分先真正派上用场。",
    career: (s) => `${s.opening}${s.activity}可以围绕${s.result}，选出眼前真正需要的方法。${s.example}这次用得上什么，便继续打磨什么；不必每想到一种可能，就把准备从头加一遍。`,
    wealth: (s) => `${s.resources}用来限定准备的范围，而不是证明准备越多越好。已有物品、方法和帮助怎样进入实际使用，是这条主线的缺口；${s.confirmation}逐步清楚后，再决定哪些继续投入，哪些无需追加。`
  }
};

// With an adult age but no supplied occupation, describe conditional uses of
// the selected natal route. These are parallel settings, not inferred jobs or
// additional event/wealth judgments. Explicit backgrounds keep their own prose.
const ADULT_DOMAINS: Record<string, { career: string; wealth: string }> = {
  "peer-output-wealth": {
    career: "事业发挥更偏向自己发现问题、拿出改法，再让别人看见实际差别。若在职，适合以一次具体改善争取独立负责的空间；若求职或有自主合作，一份能试用的作品比只讲自己的主张更能说明能力。协作的关口是保留自己的做法，也接得住使用者的反馈。",
    wealth: "财务主线在个人成果与共同分配之间：做出贡献、成果被采用和获得约定回报，是三个不同环节。若有合作或有偿服务，谁提供材料、谁承担修改、成果怎样使用，会影响报酬能否按原约定留下；口头认可不能代替这些约定。"
  },
  "resource-output": {
    career: "事业上较能发挥的是把理解整理成别人听得懂、接着能用的方法。若在职，清楚说明、稳定完成与经验传递是能力被看见的入口；若求职进修，一份体现思路和完成过程的作品，比继续罗列学过什么更有说服力。",
    wealth: "回报的入口是已有知识或手艺被持续使用，准备本身还不等于获得报酬。若有工作或有偿服务，原先约定的报酬、修改范围与再次使用的安排分别影响付出能否留下回报；课程、工具与准备时间若一直追加，也会占住原本可用于实际工作的部分。"
  },
  "food-wealth": {
    career: "事业发挥偏向把熟悉的事做细、做稳，让质量可以重复。若在职，连续可靠的完成比偶尔突出的表现更能积累信任；若有手艺或自主服务，别人愿意再次使用的理由，往往在细节、节奏与后续照应。",
    wealth: "财务上较值得观察的是重复使用带来的回报能否持续留下。若提供有偿服务，同样一笔报酬若还包着多次修改、材料与维护，留下的部分会不同；稳定的需求与持续投入要一起看，不能只看完成了多少次。"
  },
  "hurting-wealth": {
    career: "事业上有价值的是发现旧办法的不足，并把不同意见做成可试用的改进。若在职，一次小范围改法能显示解决问题的能力；若求职或有自主合作，样稿、演示与实际试用比急着扩大主张更能接近对方的需要。",
    wealth: "回报要经过改法被采用这一关，得到关注还不是实际结算。若有合作或有偿服务，试用花费、修改次数与正式使用的约定，会决定一项新办法是带来回报，还是继续占用自己的时间和材料。"
  },
  "wealth-food": {
    career: "事业发挥更容易从一个明确需要开始，再把完成方法练熟。若在职，围绕使用者的具体问题打磨做法，比同时接下许多目标更有连续性；若求职或有自主服务，能回应真实需要的试做，是说明能力的入口。",
    wealth: "财务的关键是投入的先后与需求是否已经明确。若有合作或有偿服务，准备材料、完成制作和收到约定报酬常不在同一时点；需要先投入多少、哪些仍可继续使用，会影响回报留下多少，也解释了忙碌未必等于收入已经增加。"
  },
  "official-resource": {
    career: "事业发挥偏向弄懂标准、积累专业方法，再把责任做稳。若在职，职责清楚且能获得指导的工作，更能显出认真可靠的一面；若求职进修，资格准备与能证明自己会做的记录需要接在一起，不能只剩下愿意负责。",
    wealth: "财务更多与承担责任所需的配套、已有待遇或费用分担相连。若有工作或合作，职责增加而报酬、工具、协作时间仍沿旧约定，付出就可能先增加；学习帮助与实际配套各有用途，不能把自己先补齐缺口当成回报已经落实。"
  },
  "official-wealth": {
    career: "事业上较重视把实际条件组织起来，按明确标准把事情办妥。若在职，结果、决定权限与协作责任相配时，更能发挥执行与协调能力；若有自主合作，能否履行承诺与手上实际条件紧密相连。",
    wealth: "财务与责任常一起出现：可用资金或材料增多，也可能附带持续提供服务、维护或分担的要求。若有付费合作，收到多少、以后还要承担多少是两件事；报酬和追加责任的约定，会影响一次成果最终留下的回报。"
  },
  "food-killings": {
    career: "事业发挥在用熟练办法处理集中而急迫的难题。若在职，能拆开难点、留下下一次可复用步骤的经验，比反复临时救场更有价值；若求职或有自主服务，具体说明怎样解决一个难题，比笼统说自己能吃苦更清楚。",
    wealth: "财务上，完成难事带来的回报与反复应急的消耗要分开看。若承担有偿工作或合作，追加要求、返工与临时材料都会占用原报酬；实际支持能否减少临时采购和返工，要看它是否接住了关键步骤的困难。"
  },
  "killings-resource": {
    career: "事业发挥偏向在较强要求下学会方法，再逐步独立处理。若在职，解释、示范与练习能接到眼前职责时，经验才会沉淀；若求职进修，围绕具体难题补能力，比只承诺自己能够扛住更能显示成长。",
    wealth: "财务的重点是必要支持能否跟上承担。若有工作或有偿合作，培训、工具或协作支持不足而要自己补齐，实际留下的回报就与名义报酬不同；有用的帮助能减少反复消耗，不能只按投入总量判断价值。"
  },
  "hurting-resource": {
    career: "事业发挥在让不同看法有依据，也能经实际检验。若在职，解释清楚适用范围的改法比直接否定旧办法更有说服力；若求职进修，作品里的推理、试验与修正过程，能显示想法怎样成为可靠做法。",
    wealth: "财务侧重验证所需的投入与必要支持能否保留。若有合作或有偿服务，反复证明、修改与补材料都可能继续占用原报酬；哪些属于约定内的必要验证，哪些是后来追加，会影响付出与回报的对应。"
  },
  "resource-preservation": {
    career: "事业上已有理解与学习的基础，关键是分清眼前缺方法还是缺实践。若在职，可以从已经会用的一部分承担实际工作；若求职进修，一次完整试做能显示真正需要补的步骤，不必把准备永远从头来过。",
    wealth: "财务上要分清已经起作用的投入与仍被闲置的储备。若有学习或工作相关花费，课程、资格和工具只有进入实际用途才显出价值；急于看到回报而撤掉必要支持，与不断购买却迟迟不用，是这条路径的两端。"
  },
  "resource-wealth": {
    career: "事业发挥的重点是筛选与应用，让已有积累接到明确用途。若在职，选出能解决眼前问题的方法，比继续添资料更能显示能力；若求职进修，以一份实际作品确定哪些准备够用，更能形成自己的做法。",
    wealth: "这里的财务课题是用实际用途限定准备，不把财的作用直接理解为进账。重复课程、闲置材料或多余工具会继续占用投入；若有学习、工作或合作支出，哪些仍在使用、哪些只因已经花过钱而继续追加，是保留有效投入的关键。"
  },
  official_joint: {
    career: "事业发挥在把责任、会做的方法与实际配套接起来。若在职，专业学习与可用工具、协作时间各有分工；若求职进修，既能说明要求，也能展示怎样完成，比只承诺认真负责更能说明能力。",
    wealth: "财务配套与学习支持需要分开：前者让承诺有条件履行，后者让自己真正会做。若有工作或合作，报酬、费用分担与必要培训各有约定，不能用追加投入代替把方法学会，也不能因有指导便忽略实际支出。"
  },
  resource_first: {
    career: "事业上先补足能持续完成的方法，再谈增加产出。若在职，具体指导与示范要能解决反复卡住的一步；若求职进修，做熟一项可展示的本领，比同时追赶更多成果更贴近当前的发展重点。",
    wealth: "当前财务课题是保住完成所需的支持，不能只催用途、数量或回报。若有工作或合作，学习、工具和帮助被压缩后，返工与应急可能继续消耗原报酬；必要支持恢复，才有条件让已有投入形成可持续的回报。"
  },
  wealth_first: {
    career: "事业上已有理解与准备，重点转到选择实际要用的一部分。若在职，让方法解决眼前问题，比继续补整套资料更能显出能力；若求职进修，用一份作品限定准备范围，理解才会成为能被看见的本领。",
    wealth: "当前财务课题是让用途决定投入的去留，财在这里承担筛选准备的作用，并非已经得到报酬。若有课程、工具或合作支出，重复准备与尚可继续使用的基础需要分开；保留必要支持，才能减少投入长期闲置。"
  }
};

function settingFor(age: LocalReadingAgeContext | null, work: ReadingContextWork | null): Setting {
  if (age?.stage === "young_child") return { opening: "在当前幼儿阶段，", activity: "游戏、表达与日常小尝试", result: "小作品或一次独立完成", resources: "陪伴时间、玩具、活动材料和大人的示范", people: "照料者与同伴", example: "比如用熟悉材料做一次小尝试，让大人或同伴看见自己怎样完成。", confirmation: "用品怎样使用、活动何时结束和下次怎样接续" };
  if (age?.stage === "youth") return { opening: "在当前学习与成长阶段，", activity: "课程练习、作品与同伴活动", result: "课程作品、作业或小组成果", resources: "练习时间、学习材料与可获得的指导", people: "指导者与同伴", example: "比如把一份作品从初稿做到可以展示，记录实际反馈后再修改。", confirmation: "作品评阅、材料共用与下一次活动安排" };
  if (!age || age.stage === "unknown" || age.stage === "before_birth") return { opening: "从实际参与的日常事项看，", activity: "学习尝试、已有约定与共同活动", result: "可以看见或使用的结果", resources: "可用时间、物品与实际获得的帮助", people: "实际参与者", example: "比如先完成一件能让参与者看见的事情，再根据真实回应调整。", confirmation: "完成怎样确认、物品由谁使用和后续怎样继续" };
  switch (work) {
    case "student": return { opening: "按已填写的学生背景，", activity: "课程、课题与实践", result: "课程作品、报告或演示", resources: "学习时间、课程材料和可获得的指导", people: "老师、同伴或课题伙伴", example: "比如先交出一版课程作品，把评阅意见带回下一版。", confirmation: "作品评阅、活动费用与工具使用范围" };
    case "employed": return { opening: "按已填写的在职背景，", activity: "岗位职责、交付与同事协作", result: "可验收的交付或可复用的方法", resources: "岗位工具、协作时间及已经明确的配套", people: "同事、负责人或协作方", example: "比如做完一轮交付后，把方法和交接记录留下，让下一轮少一些重复解释。", confirmation: "验收、已有待遇约定与后续维护责任" };
    case "self_employed": return { opening: "按已填写的自营或自由职业背景，", activity: "客户需求、服务与合作", result: "样稿、成品或能说明价值的服务", resources: "服务时间、材料、工具与试用成本", people: "客户与合作方", example: "比如先用样稿或一小段服务验证需求，再确定正式交付范围。", confirmation: "验收、约定结算与后续维护范围" };
    case "seeking_work": return { opening: "按已填写的求职背景，", activity: "经历整理、作品准备与面谈", result: "可核实的作品记录或试做", resources: "准备时间、资格材料与往返费用", people: "联络方与实际协作者", example: "比如把一段经历整理成别人能核实的作品记录，再用面谈反馈调整表达。", confirmation: "试做反馈、后续面谈与书面条件" };
    case "caregiving": return { opening: "按已填写的照料背景，", activity: "照料日程、用品准备与交接", result: "能够持续的一段照料安排", resources: "陪伴时间、照料用品与能够落实的替补", people: "家人与共同照料者", example: "比如把一段反复交接的过程说明白，让替补也能接得上，而不必每次重新安排。", confirmation: "交接、共同费用与可持续的分担" };
    case "retired": return { opening: "按已填写的退休背景，", activity: "自选活动、兴趣与经验分享", result: "兴趣作品、一次分享或自愿活动", resources: "愿意投入的时间、材料和活动费用", people: "活动伙伴与实际参与者", example: "比如把已有经验整理成一次分享，由自己的意愿决定是否持续参与。", confirmation: "活动费用、参与范围与是否继续承担" };
    default: return { opening: "从自己实际参与的事情看，", activity: "已有安排、学习尝试与协作", result: "作品、方法或可以确认的完成结果", resources: "自己实际可用的时间、物品和投入", people: "实际参与者", example: "比如用一个已完成的结果说明自己的做法，让别人能看见也能反馈。", confirmation: "完成、使用与后续承担的约定" };
  }
}

const BLOCKERS: Record<string, string> = {
  "moderating-wealth-combined": "本盘还显示，决定保留哪些积累与原有支持互相牵动：想减少一部分准备，可能又顾虑原来的约定或依赖，取舍不是完全自由的。",
  "peer-controls-moderating-wealth": "本盘作取舍所依靠的实际用途，受到自主决定或同辈安排的牵动；自己的基础还在，但新增参与或决定未必让重复准备更容易减少。",
  "official-hurting": "本盘同时存在改法与明确标准的牵制，自己的解释和对方要求之间可能反复拉扯。",
  "output-resource-combined": "本盘的理解支持与表达出口有直接牵连，反复解释、修改和继续准备，可能挤掉实际呈现。",
  "resource-controls-food": "本盘已有准备支持牵制实际输出的线索，继续补充方法时，原来能稳定完成的节奏需要保留。",
  "owl-controls-food": "本盘稳定产出的方式受到准备或指导环节牵制，熟悉的做法可能被新要求打断。",
  "wealth-controls-key-resource": "本盘还存在实际用途挤占必要支持的牵制，眼前事情增多时，原来依靠的学习、工具或帮助可能难以照常提供。",
  "wealth-combined": "本盘成果的实际承接与既有配合有牵连，已经做出的部分，可能还要经过共同约定才能继续使用。",
  "peer-authorities-not-cleared": "本盘固定标准与较急的要求同时存在，尚未分出单一主导；把两种要求都当作必须立刻做到，容易让已有投入继续加重承担。"
};

/** Existing calculation → life narrative only. Personal adoption is applied by
 * the caller using each paragraph's sourceSubjects, never inside this helper. */
export function buildNatalLifeStory(input: NatalLifeStoryInput): NatalLifeStory {
  const r = revisionRecordSchema.parse(input.revision), p = input.assessment, c = input.comprehensive;
  const includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  const sourceBinding = { caseId: r.caseId, revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour };
  const d = c.patternDiagnosis, u = c.usefulGuidance;
  if (!d || !u) throw new Error("命局生活主线缺少已生成的格局与取用判断。");
  for (const binding of [p.sourceBinding, c.sourceBinding, d.sourceBinding, u.sourceBinding]) if (binding.revisionId !== r.id || binding.chartResultHash !== r.manifest.resultHash || binding.includeHour !== includeHour) throw new Error("命局生活主线的来源不匹配。");
  if (d.primaryPathId !== u.primaryPathId) throw new Error("命局生活主线的既有路径不一致。");
  const working = getWorkingBalance(p), context = input.context ? readingContextDraftSchema.parse(input.context) : null;
  let referenceYear: number | null = null, age: LocalReadingAgeContext | null = null;
  if (input.referenceInstant !== null) {
    const value = Date.parse(input.referenceInstant);
    if (!Number.isFinite(value) || !/(?:[zZ]|[+-]\d{2}:\d{2})$/u.test(input.referenceInstant)) throw new Error("命局生活主线需要明确时区的参考瞬时。");
    referenceYear = new Date(value + 8 * 60 * 60 * 1000).getUTCFullYear();
    age = buildLocalReadingAgeContext(includeHour ? r.timeCalibration.utcInstant : null, new Date(value).toISOString(), new Date(value + 1).toISOString());
  }
  const contextInRange = !!context && referenceYear !== null && context.fromYear <= referenceYear && referenceYear <= context.toYear;
  const appliedWork = contextInRange && age?.stage === "adult" && context.work !== "unspecified" ? context.work : null;
  const s = settingFor(age, appliedWork), primaryBlockers = d.blockers.filter((finding) => finding.scope === "primary"), primaryRescues = d.rescues.filter((finding) => finding.scope === "primary");
  const task = d.wealthResourceTask;
  const wealthResourceTask = includeHour && task?.includeHour && task.applicable && task.preferredPathId === d.primaryPathId
    && (task.task === "official_joint" || task.task === "resource_first" || task.task === "wealth_first") ? task : null;
  const taskRoute = wealthResourceTask ? WEALTH_RESOURCE_ROUTES[wealthResourceTask.task as WealthResourceStoryKind] : null;
  const known = taskRoute ?? ROUTES[d.primaryPathId], route = known ?? {
    headline: "先从已经清楚的发挥方式理解自己", strength: "当前可以明确的是已有位置与角色线索，生活中的发挥仍要通过具体尝试观察。",
    opening: "这份命局目前保留月令背景与实际透藏分工，尚未选择完整的跨域主线。可以从真实尝试中看见自己更容易理解、表达还是承担哪一部分，不把一个背景名称直接当作人生结论。",
    development: "先让一件实际参与的事情形成可见结果，再观察自己的做法与他人的反馈，能避免从单一角色推断固定人生路线。",
    recurrence: "当前资料不足以给出这一类命局的专门反复模式，保留原本命说明，不借其他路径补写。",
    career: (setting: Setting) => `${setting.opening}${setting.activity}仍以实际完成与反馈来辨明发挥方式。`,
    wealth: (setting: Setting) => `${setting.resources}按眼前真实需要理解，当前不另推经营方式或收入结果。`
  };
  const beforeBirth = age?.stage === "before_birth", mixedAuthority = working.focus === "rooted_peer_mixed_authority";
  const mainSubjects = [...MAIN_SUBJECTS];
  const text = (value: string, subjects = mainSubjects): NatalLifeStoryText => ({ text: value, sourceSubjects: [...subjects] });
  let headline = route.headline, strength = route.strength, opening = route.opening, development = route.development, recurrence = route.recurrence;
  const visibleOutput = u.entries.filter((entry) => entry.presence.startsWith("exposed") && entry.roles.some((role) => role.kind === "path_key"));
  if (d.primaryPathId === "peer-output-wealth" && visibleOutput.some((entry) => entry.tenGod === "伤官")) {
    headline = "有主意，也在意想法能不能真正起作用";
    opening = "这盘呈现的是有自己的看法、又看重实际效果的一面。遇到不顺手的办法，容易注意到问题，也愿意提出自己的解法；长处在于把不满意变成改进，而不只是停留在评论。别人能够看见改进后的变化时，这份敏锐才更容易成为被采用的能力。";
    development = "发展中的关口，是自己的想法与别人的需要未必同拍。既想保留做法上的自主，也希望付出有实际回应，两者有时会拉扯。逐渐形成一项拿得出手的本领，既能说清为什么不同，也能让人用得上，比把“说服了对方”当成事情已经做成更有分量。";
  }
  if (d.primaryPathId === "resource-output" && visibleOutput.some((entry) => entry.tenGod === "食神")) {
    headline = "理解得细，再把本领慢慢做扎实";
    opening = "这盘的优势更偏向先理解，再把理解整理成清楚、稳定的表达或做法。未必需要每次都靠强烈主张引人注意，细致说明、耐心打磨和反复做熟，也能逐渐显出自己的分量。学到的东西真正被用起来时，更容易形成个人的熟练与风格。";
    development = "发展更像把理解一层层整理成自己的熟练方法：先把一件事讲清、做细，再从使用者的反馈里修正细节。清楚的说明、稳定的质量和耐心的接续，会让别人逐渐知道自己擅长什么；积累由此成为可以反复发挥的本领，而不只是一份学过的内容清单。";
  }
  if (d.primaryPathId === "resource-wealth" && ["young_child", "youth"].includes(age?.stage ?? "")) {
    headline = "理解与准备有基础，成长更需要自己试出来";
    opening = "这盘较突出的，是愿意先弄明白、熟悉以后再慢慢形成自己的做法。学习与理解的基础已有支点，下一步的价值不在继续加很多讲解，而在把已经会的一部分用出来。一个小作品、一次实际尝试，比又多准备一套材料，更容易发现自己真正会什么、还差什么。";
    development = "成长可以围绕一个看得见的小目标，把已有的材料、方法和帮助选出真正用得上的部分。减少重复准备并不是拿掉学习与照顾，而是保留必要基础，让自己的尝试也有位置；已有支持越丰富，越需要逐步练习作选择。";
  }
  if (mixedAuthority) {
    headline = age?.stage === "young_child" || age?.stage === "youth" ? "有自己的主意，也需要分清不同要求" : "有自己的判断，也容易同时接住两种不同要求";
    strength = "有自己的主意，愿意亲自尝试，也在意事情是否完成；把平常规则与临时要求分开，更能发挥主动的一面。";
    opening = "这盘的主线，是保留自己的主意，同时学会面对不同要求。既有想亲自尝试的一面，也重视一件事最后有没有完成。不能只用听不听要求、做得快不快来概括，主动性和对具体结果的在意，需要放在一起看。";
    development = "容易形成拉扯的是明确规矩与较急的要求同时出现：既想按自己的方式试，也要回应眼前的标准。难处更在要求的轻重和先后，而不是简单归成能力不足。围绕可以理解、能够完成的小目标发展，让尝试有空间、要求也清楚；一味增加练习或催促，不等于会做得更好。";
    recurrence = ["young_child", "youth"].includes(age?.stage ?? "")
      ? "成长中容易反复的是一件事还没试完，另一种要求又来了，自己的想法便被挤到后面。熟悉的步骤与少量清楚的目标，有助于让尝试继续；需要更多说明或帮助的地方，也不必只靠加快速度来应付。"
      : "反复的难处，是持续要做到的部分与临时加上的要求混在一起，想主动做好的事情也因此失去自己的节奏。把可以循序完成与确实需要及时回应的部分分开，已有能力才不容易都耗在来回应对上。";
  }
  const unmappedBlocker = "本盘这条发挥方式仍有明确牵制，不能仅按一般长处判断已顺畅；具体受影响的环节保留在原局依据中。";
  const concreteBlockers = unique(primaryBlockers.map((finding) => BLOCKERS[finding.id] ?? unmappedBlocker));
  const obstacle = mixedAuthority ? "自己的尝试与不同要求容易挤在一起；明确规矩与较急的要求尚未分出主次，需要保留各自的轻重和先后。" : concreteBlockers.length ? concreteBlockers.join("") : recurrence;
  const mainParagraphs = [text(opening), text(`${development}${working.focus === "wealth_after_output" ? "当前更值得发挥的是把已经能够持续做出的内容接到真实用途，而不是再增加产出数量。" : working.focus === "output_after_resource" ? "当前积累已有承接，实际表达和应用更值得放到前面，继续增加准备并不是唯一的发展方式。" : ""}`), text(`${recurrence}${mixedAuthority ? "" : concreteBlockers.join("")}${primaryRescues.length ? "原局也保留了可缓解这些牵制的配合线索；只有在现实中确实接上帮助、方法或用途，反复才有机会减少，不能把候选支点当作已经奏效。" : ""}`)];
  if (working.direction === "support") mainParagraphs.push(text("当前承接判断更需要保留帮助和余地。表达、投入与承担可以发展，但范围增加时，所需时间、方法和实际支持也要跟上；较合适的节奏是先把一件事完成，再扩大可承担的部分。"));
  const workWealthParagraphs = (["career", "wealth"] as const).map((domain) => {
    const labels = age?.stage === "young_child" || age?.stage === "youth" ? ["学习与活动", "时间与用品"]
      : appliedWork === "student" ? ["学习与实践", "学习投入"] : appliedWork === "caregiving" ? ["照料与交接", "时间与用品"]
        : appliedWork === "retired" ? ["生活与兴趣", "活动投入"] : appliedWork === "seeking_work" ? ["求职与准备", "准备投入"]
          : appliedWork === "self_employed" ? ["经营与服务", "成本与结算"] : appliedWork === "employed" ? ["事业发挥", "配套与投入"] : age?.stage === "adult" ? ["事业与能力发挥", "财务与回报"] : ["做事与协作", "时间与资源"];
    const sourceSubjects = ["chapter-structure", "chapter-useful_elements", `chapter-${domain}`, ...(appliedWork ? [`contextual-chapter-${domain}`] : [])];
    const adultUnspecified = age?.stage === "adult" && appliedWork === null;
    const adultDomains = ADULT_DOMAINS[wealthResourceTask?.task ?? d.primaryPathId];
    let value = adultUnspecified && adultDomains ? adultDomains[domain] : domain === "career" ? route.career(s) : route.wealth(s);
    if (adultUnspecified && domain === "career" && d.primaryPathId === "resource-output" && visibleOutput.some((entry) => entry.tenGod === "食神")) value = "事业发挥更偏向把复杂内容说明白，再以细致、稳定的做法持续完成。若在职，经验传递、质量打磨与可靠接续更能显出本领；若求职进修，一份做得完整、讲得清楚的作品，比罗列学过多少内容更有说服力。";
    if (adultUnspecified && domain === "career" && d.primaryPathId === "peer-output-wealth" && visibleOutput.some((entry) => entry.tenGod === "食神") && !visibleOutput.some((entry) => entry.tenGod === "伤官")) value = "事业发挥偏向把自己的理解变成稳定、可用的做法，同时保留独立负责的空间。若在职，能反复做好的成果是协作信任的入口；若求职或有自主合作，完整作品与持续回应比只讲个人主张更能说明能力。";
    if (mixedAuthority) value = domain === "career" ? `${s.opening}${s.activity}中，固定要做到的标准与临时较急的要求需要分别回应。${s.example}有些部分可以循序完成，有些需要先得到解释或协助；两种要求叠在一起时，压力更可能来自来不及分清先后，而非没有行动意愿。`
      : `${s.resources}能支持完成，也可能因为要求增多而继续被占用。固定安排和临时加上的部分分开后，才容易知道哪些可以持续；${s.confirmation}不能代替对实际可承担范围的判断。`;
    if (mixedAuthority && adultUnspecified) value = domain === "career"
      ? "事业上有主动承担的一面，但固定标准与临时较急的要求同时存在，尚未分出主次。若在职，日常职责与临时加项容易争用同一段时间；若有自主合作，原先答应的范围与后来提出的要求需要分开，压力不能只靠加快完成来消化。"
      : "财务与承担紧密相连，既有安排与临时加项可能继续占用同一份时间或投入。若有工作或有偿合作，原约定报酬与后来增加的责任不一定同步；实际留下多少，取决于额外投入、持续维护与费用分担，不能只看接下的事情多了多少。";
    if (domain === "wealth" && concreteBlockers.length) value += primaryBlockers.some((finding) => finding.id === "moderating-wealth-combined") ? "本盘的取舍还牵动原有支持，减少重复投入之前，哪些基础仍需保留要一并处理。" : "原局已有的配合牵制仍需保留，不能只因成果或投入增加就推定回报会随之增加。";
    return { domain, label: labels[domain === "career" ? 0 : 1]!, ...text(value, sourceSubjects) };
  });
  const conditions = ["这是把已选本命路径翻成生活倾向的本地叙述，不证明这些经历已经发生，也不据此确定职业、财富额度或婚姻结果。", "未重新判断旺衰、选格局、合化或岁运方向；一般反复模式与原局已明确的阻碍/救应分别保留。", ...(age?.conditions ?? ["没有明确参考瞬时，年龄保持未知，使用中性的日常生活语境。"]),
    ...(context && !contextInRange ? ["自述背景不在本次明确参考年份内，未用于生活主线。"] : []),
    ...(contextInRange && age?.stage !== "adult" ? ["当前非已锁定成年语境，职业自述不覆盖年龄边界；按学习、照料或中性日常解释。"] : []),
    ...(context ? ["自述notes与关系状态不用于本模块推断性格、经历或职业事实。"] : []),
    ...(wealthResourceTask?.conditions ?? [])];
  if (beforeBirth) { headline = "本参考时点早于出生"; strength = "本命原判断仍保留，不在出生前安排个人生活经历。"; mainParagraphs.splice(0); workWealthParagraphs.splice(0); }
  return { version: NATAL_LIFE_STORY_VERSION, sourceBinding,
    sourceVersions: unique([NATAL_LIFE_STORY_VERSION, p.version, c.version, d.version, u.version, working.version, ...(wealthResourceTask ? [wealthResourceTask.version] : []), ...(contextInRange ? [READING_CONTEXT_FORMAT] : [])]),
    referenceInstant: input.referenceInstant, referenceYear, age, appliedWork, pathId: d.primaryPathId, headline,
    strength: text(strength), obstacle: text(beforeBirth ? "出生前不作个人难处或发展经历判断。" : obstacle), mainParagraphs,
    workWealthTitle: workWealthParagraphs.map((paragraph) => paragraph.label).join(" · "), workWealthParagraphs,
    conditions: unique(conditions), evidence: unique([`本模块 ${NATAL_LIFE_STORY_VERSION}；采用既有路径 ${d.primaryPathId}，不是新增命盘规则。`, d.currentJudgment, working.summary, u.answer.summary,
      ...primaryBlockers.map((finding) => `原局阻碍 ${finding.id}：${finding.text}`), ...primaryRescues.map((finding) => `原局救应候选 ${finding.id}：${finding.text}`),
      ...(wealthResourceTask ? [wealthResourceTask.summary, ...wealthResourceTask.evidence, `财印任务来源：${wealthResourceTask.sourceIds.join("、")}`] : [])]) };
}
