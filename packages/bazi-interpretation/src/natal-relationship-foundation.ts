import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import type { BaziPreliminaryAssessment, PreliminarySource } from "./preliminary-assessment";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "./strength-policy";
import { strengthElementForStem, type PillarPosition } from "./strength-assessment-core";
import { natalRelationshipRole, natalFamilyHeadline, relationshipInteractionLife } from "./natal-relationship-life-prose";
import { NATAL_RELATIONSHIP_SOURCES, NATAL_RELATIONSHIP_SOURCES_VERSION } from "./natal-relationship-sources";

export const NATAL_RELATIONSHIP_FOUNDATION_VERSION = "hakimi.natal-relationship-foundation/0.2.0" as const;
export interface NatalRelationshipOccurrence {
  id: string; position: PillarPosition; ganZhi: string; stem: string; tenGod: string;
  visibility: "visible" | "main_hidden" | "residual_hidden";
  roots: { position: PillarPosition; branch: string; stem: string; kind: "main" | "residual"; sameStem: boolean }[];
  evidence: string[];
}
export interface NatalRelationshipPerspective {
  id: "wealth" | "authority"; label: string; traditionalRole: string;
  primaryTenGods: string[]; relatedTenGods: string[];
  occurrences: NatalRelationshipOccurrence[]; summary: string; conditions: string[]; sourceIds: string[];
}
export interface NatalRelationshipInteraction {
  id: string; scope: "day_palace" | "visible_star" | "family_positions";
  fact: RelationFact; starOccurrenceIds: string[]; text: string; sourceIds: string[];
}
export interface NatalRelationshipText {
  headline: string; verdict: string; paragraphs: string[]; strengths: string[]; cautions: string[];
  suggestions: string[]; evidence: string[]; sourceIds: string[];
}
export interface NatalRelationshipFoundation {
  version: typeof NATAL_RELATIONSHIP_FOUNDATION_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean; sex: RevisionRecord["input"]["sex"] };
  perspectives: NatalRelationshipPerspective[];
  dayPalace: { ganZhi: string; branch: string; mainStem: string; mainTenGod: string; hidden: NatalRelationshipOccurrence[]; summary: string; evidence: string[] };
  interactions: NatalRelationshipInteraction[];
  relationship: NatalRelationshipText; family: NatalRelationshipText;
  sources: PreliminarySource[]; conditions: string[];
}
const ORDER: PillarPosition[] = ["year", "month", "day", "hour"];
const POSITION: Record<PillarPosition, string> = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const TYPE_LABEL = { stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲" } as const;
const SOURCE = { position: "relationship-foundation-zq-position", palace: "relationship-foundation-zq-star-palace", conditions: "relationship-foundation-zq-counterconditions", female: "relationship-foundation-smt-female-mapping", relations: "relationship-foundation-zq-combination-limits" };
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const groupOf = (tenGod: string) => {
  const group = strengthTenGodGroup(canonicalizeStrengthTenGod(tenGod));
  if (!group) throw new Error("本命关系阅读的所选十神不可识别。");
  return group;
};
const where = (o: NatalRelationshipOccurrence) => `${POSITION[o.position]}${o.visibility === "visible" ? "透" : "藏"}${o.stem}${o.tenGod}${o.visibility === "main_hidden" ? "（本气）" : o.visibility === "residual_hidden" ? "（余气）" : ""}`;
const rootText = (o: NatalRelationshipOccurrence) => o.roots.length ? `同五行藏位见${o.roots.map((r) => `${POSITION[r.position]}${r.branch}中${r.stem}${r.kind === "main" ? "本气" : "余气"}`).join("、")}` : "所选支内未见同五行藏位";
const relationText = (f: RelationFact) => `${f.participants.map((p) => `${POSITION[p.position]}${p.component === "stem" ? "干" : "支"}${p.value}`).join("与")}有${TYPE_LABEL[f.relationType as keyof typeof TYPE_LABEL]}`;
/** Local interpretation of selected natal facts. No spouse/event count,
 * relationship auspiciousness score, transformation or root deletion. */
export function buildNatalRelationshipFoundation(revision: RevisionRecord, assessment: BaziPreliminaryAssessment): NatalRelationshipFoundation {
  const r = revisionRecordSchema.parse(revision), includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  if (assessment.sourceBinding.revisionId !== r.id || assessment.sourceBinding.chartResultHash !== r.manifest.resultHash
    || assessment.sourceBinding.includeHour !== includeHour || assessment.pattern.monthMainStem !== r.facts.pillars.month.hiddenStems[0]
    || assessment.balance.dayMasterElement !== strengthElementForStem(r.facts.pillars.day.stem)) throw new Error("本命关系阅读与初判来源不匹配。");
  const positions = ORDER.filter((position) => includeHour || position !== "hour");
  for (const position of positions) {
    const pillar = r.facts.pillars[position];
    if (pillar.name !== position || pillar.ganZhi !== `${pillar.stem}${pillar.branch}` || !pillar.hiddenStems.length
      || pillar.hiddenStems.length !== pillar.branchTenGods.length) throw new Error("本命关系阅读的所选柱名、干支或透藏角色不完整。");
    if (position !== "day") groupOf(pillar.stemTenGod);
    for (const tenGod of pillar.branchTenGods) groupOf(tenGod);
  }
  const hidden = positions.flatMap((position) => r.facts.pillars[position].hiddenStems.map((stem, index) => ({ position, branch: r.facts.pillars[position].branch, stem, kind: index === 0 ? "main" as const : "residual" as const })));
  const occurrence = (position: PillarPosition, stem: string, tenGod: string, visibility: NatalRelationshipOccurrence["visibility"]): NatalRelationshipOccurrence => {
    const roots = hidden.filter((h) => strengthElementForStem(h.stem) === strengthElementForStem(stem)).map((h) => ({ ...h, sameStem: h.stem === stem }));
    const item: NatalRelationshipOccurrence = { id: `${position}:${visibility}:${stem}`, position, ganZhi: r.facts.pillars[position].ganZhi, stem, tenGod: canonicalizeStrengthTenGod(tenGod), visibility, roots, evidence: [] };
    item.evidence = [`${where(item)}。`, `${rootText(item)}；仅记录存在位置，不据此认定强旺、足量或自由有效。`]; return item;
  };
  const occurrences = positions.flatMap((position) => {
    const p = r.facts.pillars[position];
    return [...(position === "day" ? [] : [occurrence(position, p.stem, p.stemTenGod, "visible")]), ...p.hiddenStems.map((stem, i) => occurrence(position, stem, p.branchTenGods[i]!, i === 0 ? "main_hidden" : "residual_hidden"))];
  });
  const perspectiveIds: ("wealth" | "authority")[] = r.input.sex === "male" ? ["wealth"] : r.input.sex === "female" ? ["authority"] : ["wealth", "authority"];
  const perspectives: NatalRelationshipPerspective[] = perspectiveIds.map((id) => {
    const gods = id === "wealth" ? ["正财", "偏财"] : ["正官", "七杀"], selected = occurrences.filter((o) => gods.includes(o.tenGod));
    const visible = selected.filter((o) => o.visibility === "visible"), concealed = selected.filter((o) => o.visibility !== "visible");
    return { id, label: id === "wealth" ? "传统财星视角" : "传统官杀视角", traditionalRole: id === "wealth" ? "男命传统以正财配妻；偏财只作相关线索" : "女命传统以官、杀配夫，须分别看具体角色",
      primaryTenGods: id === "wealth" ? ["正财"] : ["正官", "七杀"], relatedTenGods: id === "wealth" ? ["偏财"] : [], occurrences: selected,
      summary: `${id === "wealth" ? "财星" : "官杀"}${visible.length ? `明透见${visible.map(where).join("、")}` : "在所选柱没有明透"}；${concealed.length ? `支内另见${concealed.map(where).join("、")}` : "所选支内没有相应藏干"}。`,
      conditions: [id === "wealth" ? "正财与偏财保留各自名称；偏财不自动等同妻星。" : "正官与七杀分别记录，不以正偏同见或星数推婚姻次数。", "这是一种传统观察视角，不指定现实伴侣身份、性别或是否已经存在。"],
      sourceIds: id === "wealth" ? [SOURCE.position, SOURCE.palace] : [SOURCE.female, SOURCE.palace] };
  });
  const starOccurrences = perspectives.flatMap((p) => p.occurrences), visibleStars = starOccurrences.filter((o) => o.visibility === "visible");
  const day = r.facts.pillars.day, mainGod = canonicalizeStrengthTenGod(day.branchTenGods[0]!), theme = natalRelationshipRole(mainGod);
  const dayHidden = occurrences.filter((o) => o.position === "day");
  const dayPalace = { ganZhi: day.ganZhi, branch: day.branch, mainStem: day.hiddenStems[0]!, mainTenGod: mainGod, hidden: dayHidden,
    summary: `日支${day.branch}本气${day.hiddenStems[0]}为${mainGod}，相处主题落在${theme.title}。`, evidence: dayHidden.flatMap((o) => o.evidence) };
  const relationFacts = calculatePillarRelations({ year: r.facts.pillars.year.ganZhi, month: r.facts.pillars.month.ganZhi, day: day.ganZhi,
    hour: includeHour ? r.facts.pillars.hour.ganZhi : day.ganZhi }).facts.filter((f) => f.completeness === "binary" && f.relationType in TYPE_LABEL && f.participants.every((p) => positions.includes(p.position)));
  const interactions: NatalRelationshipInteraction[] = [];
  for (const f of relationFacts) {
    const branchFact = f.relationType === "branch_six_combination" || f.relationType === "branch_six_clash";
    const matching = branchFact ? [] : visibleStars.filter((o) => f.participants.some((p) => p.position === o.position && p.component === "stem" && p.value === o.stem));
    const scope = branchFact && f.participants.some((p) => p.position === "day") ? "day_palace" : matching.length ? "visible_star" : f.participants.every((p) => p.position !== "day") ? "family_positions" : null;
    if (scope) interactions.push({ id: `${scope}:${f.id}`, scope, fact: structuredClone(f), starOccurrenceIds: matching.map((o) => o.id), text: relationText(f), sourceIds: [SOURCE.relations] });
  }
  const palaceRelations = interactions.filter((i) => i.scope === "day_palace"), starRelations = interactions.filter((i) => i.scope === "visible_star");
  const joined = palaceRelations.filter((i) => i.fact.relationType === "branch_six_combination"), clashed = palaceRelations.filter((i) => i.fact.relationType === "branch_six_clash");
  const visibleDirect = visibleStars.filter((o) => o.tenGod === "正财"), visibleIndirect = visibleStars.filter((o) => o.tenGod === "偏财");
  const officials = visibleStars.filter((o) => o.tenGod === "正官"), killings = visibleStars.filter((o) => o.tenGod === "七杀");
  const roleHeading = r.input.sex === "unspecified" ? "财与官杀两种视角并列"
    : r.input.sex === "male" ? visibleDirect.length ? `正财${unique(visibleDirect.map((o) => o.stem)).join("、")}已透` : visibleIndirect.length ? `偏财${unique(visibleIndirect.map((o) => o.stem)).join("、")}已透，正财未透` : starOccurrences.length ? "财星只在藏干层" : "所选柱财星未见"
    : officials.length && killings.length ? "正官与七杀同透" : officials.length ? `正官${unique(officials.map((o) => o.stem)).join("、")}已透` : killings.length ? `七杀${unique(killings.map((o) => o.stem)).join("、")}已透` : starOccurrences.length ? "官杀只在藏干层" : "所选柱官杀未见";
  const roleMeaning = r.input.sex === "unspecified" ? "财视角观察实际投入，官杀视角观察承诺与要求；两种读法分别保留，日常相处仍以实际关系状态为准。"
    : r.input.sex === "male" ? visibleDirect.length && visibleIndirect.length ? "关系中的投入有两种侧重：正财对应原有承诺的持续履行，偏财相关线索对应临时援手与额外参与。愿意多做一点和能够长期承担需要分清，不能用临时投入替代已经答应的事。" : visibleDirect.length ? "关系中的明确落点是持续投入与承诺兑现：时间、共同费用和已经答应的事情，需要能互相看见。" : visibleIndirect.length ? "当前明透的是偏财相关线索，生活主题侧重灵活参与、临时帮助与原有约定的分配；这份相关线索不代替正财的传统妻星位置。" : starOccurrences.length ? "财星保留在支藏层，关系内容更适合从具体日常安排看见：已经答应的投入与临时增加的参与各有范围，藏位不直接当作公开表达或已有伴侣。" : "本盘关系阅读以日支的相处方式为主要落点，实际投入与承诺要从已经发生的日常安排来确认。"
    : officials.length && killings.length ? "明确承诺和临时要求是两种不同任务：一部分需要稳定履行，一部分需要协商承受范围，不能把所有要求都变成同一种责任。"
    : officials.length ? "相处的明确落点是约定能否持续履行：承诺的内容、标准和各自责任越清楚，越容易形成可依赖的节奏。"
    : killings.length ? "相处主题更着重怎样回应要求、保留协商余地：愿意承担与能够承担需要同时说清。"
    : "本盘先从日支呈现的相处方式理解关系；承诺与边界要结合实际互动来落地。";
  const palaceMeaning = palaceRelations.length ? `${joined.length && clashed.length ? `日支${day.branch}同时有合与冲；两种联系分别保留。` : ""}${palaceRelations.map(item=>relationshipInteractionLife(item,"relationship")).join(" ")}`
    : `日支${day.branch}在所选柱之间未见本层记录的六合或六冲，本层没有额外的宫位合冲情境。`;
  const starMeaning = starRelations.length ? `明透星干与日支位置分开看。${starRelations.map(item=>relationshipInteractionLife(item,"relationship")).join(" ")}`
    : visibleStars.length ? `明透的${visibleStars.map((o) => `${o.stem}${o.tenGod}`).join("、")}在所选柱中未见对应的二元天干合冲；这些角色先按各自的投入或责任主题阅读。`
      : "当前没有可纳入明透星干互动的对象；支藏线索保留在各自位置，具体关系阅读由日支主题与已见互动承接。";
  const selectedEvidence = unique([`本命关系规则${NATAL_RELATIONSHIP_FOUNDATION_VERSION}；来源资料${NATAL_RELATIONSHIP_SOURCES_VERSION}；初判${assessment.version}。`, ...perspectives.flatMap((p) => p.occurrences.flatMap((o) => o.evidence)), ...dayPalace.evidence,
    ...interactions.map((i) => `${i.scope}：${i.text}；原事实${i.fact.id}；规则${i.fact.ruleId}；算法${i.fact.algorithmId}。`)]);
  const sourceIds = unique([SOURCE.palace, SOURCE.conditions, SOURCE.position, ...perspectives.flatMap((p) => p.sourceIds), ...(interactions.length ? [SOURCE.relations] : [])]);
  const relationship: NatalRelationshipText = {
    headline: `${roleHeading}，${day.branch}位${joined.length && clashed.length ? "合冲并存" : clashed.length ? "有冲，重在协调节奏" : joined.length ? "有合，重在共同计划" : `侧重${theme.title}`}`,
    verdict: `${roleMeaning}${dayPalace.summary}`,
    paragraphs: [`${perspectives.map((p) => p.summary).join(" ")}${roleMeaning}`, `${dayPalace.summary}${dayHidden.length > 1 ? `其余藏位还有${dayHidden.slice(1).map((o) => `${o.stem}${o.tenGod}`).join("、")}，本气与余气分别保留。` : ""}生活落点是${theme.action}。${theme.scene}`, palaceMeaning, starMeaning],
    strengths: [theme.strength, joined.length ? "共同计划可以成为对齐时间、任务和需要的具体入口" : "将已见的投入、责任和日常习惯分开谈，有助于找到彼此能配合的部分"],
    cautions: [theme.caution, clashed.length ? "外部日程与共同安排不一致时，容易出现一方认为已经约好、另一方认为仍可调整的落差" : starRelations.some((i) => i.fact.relationType === "stem_clash") ? "不同承诺或表达方式互相抵触时，容易把一件事的分歧扩大到对对方整体态度的判断" : "把自己的投入方式当成对方也认可的方式，容易忽略彼此真正需要的回应"],
    suggestions: [theme.suggestion, clashed.length ? "安排有变时，把调整原因、替代时间和原有承诺的接续一起说清" : "用一件近期共同事项对照各自期待，确定下一次怎样配合"], evidence: selectedEvidence, sourceIds
  };
  const year = r.facts.pillars.year, month = r.facts.pillars.month;
  const yearGod = canonicalizeStrengthTenGod(year.stemTenGod), monthGod = canonicalizeStrengthTenGod(month.stemTenGod);
  const yearTheme = natalRelationshipRole(yearGod), monthTheme = natalRelationshipRole(monthGod);
  const familyRelations = interactions.filter((i) => i.fact.participants.some((p) => p.position === "year" || p.position === "month"));
  const familySourceIds = unique([...sourceIds,"relationship-foundation-zq-family-palaces","relationship-foundation-zq-family-role-method","relationship-foundation-smt-star-position"]);
  const background = (position: "year" | "month") => {
    const pillar=r.facts.pillars[position], god=canonicalizeStrengthTenGod(pillar.branchTenGods[0]!), shown=canonicalizeStrengthTenGod(pillar.stemTenGod);
    return god === shown ? `本气藏位同为${god}，明透与藏位各保原层次。`
      : `支内本气${pillar.hiddenStems[0]}为${god}，这一层的主题是${natalRelationshipRole(god).support}；它仍是藏位，不当成另一项已明说的要求。`;
  };
  const hourParagraph = includeHour ? (()=>{
    const hour=r.facts.pillars.hour, god=canonicalizeStrengthTenGod(hour.stemTenGod), h=natalRelationshipRole(god);
    return `时柱明透${hour.stem}${god}，补充${h.duty}这一侧。若有长期共同生活或照料任务，${h.scene.replace(/^若[^，]+，/u,"")}`;
  })() : "本次只读年、月、日三柱。家庭支持、日常责任与个人相处已经分别保留；未知时柱不补出家人、支持条件或后续安排。";
  const familyClashCautions = unique(familyRelations.filter(item=>item.fact.relationType==="branch_six_clash").map(item=> {
    const positions=new Set(item.fact.participants.map(part=>part.position));
    return positions.has("day") ? "家庭既有日程与个人共同生活相遇时，容易出现两边都认为应被优先照顾的拉扯"
      : positions.has("year")&&positions.has("month") ? "家庭支持的习惯与日常责任的安排不一致时，帮助方和实际承担方可能各自认为自己的节奏应优先"
        : "原有支持与其他共同安排节奏不一致时，时间、用品与接续责任容易同时被需要";
  }));
  const family: NatalRelationshipText = {
    headline: natalFamilyHeadline(yearGod,monthGod),
    verdict: yearGod===monthGod ? `家庭支持与日常责任共同侧重${yearTheme.support}。实际帮助需要接到${monthTheme.duty}，被照应与自己承担并不是同一件事。`
      : `家庭支持的主线是${yearTheme.support}，日常责任则更侧重${monthTheme.duty}。接受帮助与履行责任各有落点，一次参与不能自动替代长期承担。`,
    paragraphs: [`年柱${year.ganZhi}明透${year.stem}${yearGod}，支持环境着重${yearTheme.support}。${background("year")}${yearTheme.scene}`,
      `月柱${month.ganZhi}明透${month.stem}${monthGod}，日常责任着重${monthTheme.duty}。${background("month")}${yearGod===monthGod ? "支持与责任指向相近主题时，更需要分清哪些是别人愿意提供的帮助，哪些是自己已经承诺的部分。" : monthTheme.scene}`,
      familyRelations.length ? familyRelations.map(item=>relationshipInteractionLife(item,"family")).join(" ") : "年、月相关位置未见本层记录的二元合冲。当前家庭主线落在已见角色的分工，帮助的方式、接受帮助后的责任与自己的决定空间分别保留。",
      hourParagraph],
    strengths: unique([yearTheme.strength,monthTheme.strength]),
    cautions: unique([yearTheme.caution,monthTheme.caution,...familyClashCautions]),
    suggestions: unique([yearTheme.suggestion,monthTheme.suggestion]),
    evidence: unique([...selectedEvidence,...occurrences.filter(item=>item.position==="year"||item.position==="month"||item.position==="hour").flatMap(item=>item.evidence),
      `年柱${year.ganZhi}与月柱${month.ganZhi}按原位置保留；十神正偏与透藏分别展示，家庭生活解释为现代情境投射。`]), sourceIds: familySourceIds
  };
  const conditions = [
    "星与宫是传统观察入口；现代相处、家庭与合作文字是本地情境解释，不是古籍原句或已验证事件预测。",
    "男命以正财为传统妻星线索，偏财只保留相关线索；女命分别记录正官、七杀。未指明性别时并列两种视角，不替用户决定伴侣身份或关系状态。",
    "未见星、仅藏、正偏同见及星的数量，均不据此推出无婚、婚次、出轨、品行或必然婚变。",
    "根只记录同五行藏位及是否同字，不将印根当日主根，不由存在数量推出强弱或作用已经足量。",
    "只读取二元天干五合、天干冲、地支六合、地支六冲；藏干不加入自由透干关系，日干互动不冒充日支关系。未判合化、合去、冲散或一合解除另一冲。",
    "不把旺衰、格局、事业或岁运的总方向当成关系吉凶；实际关系须结合双方沟通、处境与选择。",
    ...(!includeHour ? ["时辰未确定，本次完全排除时柱透藏、根与互动；未知时柱不能用于补足任何关系对象。"] : [])
  ];
  return { version: NATAL_RELATIONSHIP_FOUNDATION_VERSION, sourceBinding: { revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour, sex: r.input.sex },
    perspectives, dayPalace, interactions, relationship, family, sources: structuredClone(NATAL_RELATIONSHIP_SOURCES.filter((s) => sourceIds.includes(s.id) || familySourceIds.includes(s.id))), conditions };
}
