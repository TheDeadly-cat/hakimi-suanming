import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BriefReadingReport, BriefReadingDomainCard, BriefReadingBlock } from "./brief-reading-report";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalReadingSnapshotExtras } from "./local-reading-record";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import { buildPlainTenYearReading, type PlainTenYearReading } from "./plain-ten-year-reading";
import { buildConcreteNatalProse } from "./concrete-natal-prose";
import type { NatalReadingRuleApplication } from "../../../../packages/bazi-interpretation/src/natal-reading-rule-application";

export const PLAIN_FULL_READING_VERSION = "hakimi.plain-full-reading/0.3.0" as const;
export interface PlainFullReadingDomain {
  id: "career" | "wealth" | "relationships";
  title: string; headline: string; paragraphs: string[];
  origin: "calculated" | "contextual" | "personal";
  personalTextIds: string[]; sourceSubjects: string[]; detailsRef: string;
  sourceIds?: string[]; ruleApplications?: NatalReadingRuleApplication[];
}
export interface PlainFullReading {
  version: typeof PLAIN_FULL_READING_VERSION;
  sourceBinding: BriefReadingReport["sourceBinding"]; sourceVersions: string[];
  introduction: string[]; introductionSourceSubjects: string[]; introductionPersonalTextIds: string[];
  domains: PlainFullReadingDomain[]; outlook: PlainTenYearReading;
  limitations: string[]; bodyText: string;
  metrics: { chineseCharacters: number; estimatedMinutes: number; estimateNote: string };
}

const unique = <T>(items: readonly T[]) => [...new Set(items)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const sentences = (text: string) => text.match(/[^。！？]+[。！？]?/gu)?.map(value => value.trim()).filter(Boolean) ?? [];
const first = (text: string) => sentences(text)[0] ?? text;

// Exact editorial translations of existing life-facing statements. These do
// not select a role/path/effect from prose and never run on personal text.
const TRANSLATIONS: readonly [string, string][] = [
  ["把集中的要求拆成可处理的步骤，是这条主线有价值的能力线索。", "较能发挥的长处，是把一堆急迫要求拆开，用熟悉的方法逐步解决。"],
  ["本盘已有准备支持牵制实际输出的线索，继续补充方法时，原来能稳定完成的节奏需要保留。", "容易卡在原来会做的办法被新指导打断：事情还等着完成，做法却一再调整。"],
  ["事业上先补足能持续完成的方法，再谈增加产出。", "事业发展更依赖够用的方法和具体帮助；这部分跟不上时，任务越多越容易反复卡住。"],
  ["事业上已有理解与准备，重点转到选择实际要用的一部分。", "事业上已有学习和准备的基础，把其中真正有用的一部分做出来，更容易显出能力。"],
  ["当前财务课题是保住完成所需的支持，不能只催用途、数量或回报。", "钱和时间的难处，是事情越接越多，完成所需的学习、工具或帮助反而被挤掉。"],
  ["当前财务课题是让用途决定投入的去留，财在这里承担筛选准备的作用，并非已经得到报酬。", "钱和时间更容易占在重复准备里；这份解读强调哪些投入真正有用，没有据此判定收入已经增加。"],
  ["实际支持能否减少临时采购和返工，要看它是否接住了关键步骤的困难。", "关键步骤缺少具体帮助时，临时采购和返工也容易继续增加。"],
  ["原局已有的配合牵制仍需保留，不能只因成果或投入增加就推定回报会随之增加。", "原来影响事情完成的阻力仍在；做得更多或花得更多，还不代表回报会跟着增加。"],
  ["明透角色的冲突另落在说法与决定上，具体分歧不宜扩成对整段关系的判断。", "分歧也可能出现在说法与决定上；一件具体事情谈不拢，不宜直接扩大成对整段关系的否定。"],
  ["明透角色之间还有承诺相互牵连的线索，答应一项安排时，也可能要同时回应另一项期待。", "答应一项安排时，也可能牵动另一项期待，需要把两边的承诺一起说清。"],
];
function plain(text: string): string {
  let result = text;
  for (const [original, replacement] of TRANSLATIONS) result = result.replaceAll(original, replacement);
  return result.trim();
}
function livingParagraphs(text: string): string[] {
  // These exact producer paragraphs describe hidden/visible star provenance;
  // the existing detailed report retains them in full. Actual life interaction
  // paragraphs following them remain, including opposite influences.
  return text.split(/\n\s*\n/gu).map(value => value.trim()).filter(value => value
    && !/^(?:原局透藏的补充是：|投入视角：|约定要求视角：)/u.test(value)).map(plain).filter(Boolean);
}

/** Read-only presentation of the same guarded brief and synthesis. It neither
 * rebuilds the brief (which calls this function) nor changes any old producer,
 * feedback identity, personal text, calculation or archived snapshot. */
export function buildPlainFullReading(report: BriefReadingReport, assessment: BaziPreliminaryAssessment,
  annual: LocalAnnualOutlook | null, extras: LocalReadingSnapshotExtras): PlainFullReading {
  const revision = extras.sourceRevision, synthesis = extras.synthesis;
  const fail = (text: string): never => { throw new Error(`完整白话解读：${text}`); };
  if (!revision || !synthesis) return fail("缺少原命盘或同源总评。");
  const binding = { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only" };
  const matches = (value: { revisionId: string; chartResultHash: string; includeHour?: boolean }) => value.revisionId === binding.revisionId
    && value.chartResultHash === binding.chartResultHash && (value.includeHour === undefined || value.includeHour === binding.includeHour);
  if (!same(report.sourceBinding, binding) || !same(synthesis.sourceBinding, binding) || !matches(assessment.sourceBinding)
    || (annual && !matches(annual)) || (extras.comprehensive && !matches(extras.comprehensive.sourceBinding))
    || (extras.life && !matches(extras.life))) return fail("输入来自不同命盘或时柱范围。");
  const contextual = extras.contextual;
  if ((synthesis.contextRef && (!contextual || !same(synthesis.contextRef, contextual.contextSource.reference)))
    || (contextual && (!same(contextual.sourceBinding, binding) || !same(contextual.contextSource.document.sourceBinding, binding)))) {
    return fail("已适配的生活背景缺失或来源不一致。");
  }
  const personal = new Map(report.personalTexts.map(item => [item.id, item]));
  if (personal.size !== report.personalTexts.length) return fail("个人原文编号重复。");
  const replacedSubjects = new Set(report.personalTexts.map(item => item.subjectId));
  const matchingPersonal = (subjects: readonly string[]) => report.personalTexts.filter(item => subjects.includes(item.subjectId)).map(item => item.id);
  const verifyPersonal = (ids: readonly string[], subjects: readonly string[]) => {
    for (const id of ids) { const item = personal.get(id); if (!item || !subjects.includes(item.subjectId)) fail("个人采用与本段来源不一致。"); }
  };
  // Existing life prose derives its route and visible output from these natal
  // choices. Individual adopted useful-word entries are not always repeated in
  // the older synthesis's chapter-level subjects, so retain that dependency
  // explicitly without applying it to the independent relationship reading.
  const routeSubjects = unique([
    ...(report.natalConclusion?.pattern.sourceSubjects ?? []),
    ...(report.natalConclusion?.firstChoice.sourceSubjects ?? []),
    ...(extras.comprehensive?.usefulGuidance?.entries.filter(entry => entry.roles.some(role => role.kind === "path_key"))
      .map(entry => `useful-stem-${entry.id}`) ?? []),
  ]);
  const ref = extras.life?.referenceInstant ?? null;
  const age = ref ? buildLocalReadingAgeContext(binding.includeHour ? revision.timeCalibration.utcInstant : null,
    ref, new Date(Date.parse(ref) + 1).toISOString()).stage : "unknown";
  const referenceYear = ref ? new Date(Date.parse(ref) + 8 * 3_600_000).getUTCFullYear() : null;
  const draft = contextual?.contextSource.document.context;
  const knownWork = age === "adult" && draft && referenceYear !== null && referenceYear >= draft.fromYear && referenceYear <= draft.toYear
    && contextual?.readings.some(item => item.scope.kind === "natal" && item.scope.referenceYear === referenceYear) ? draft.work : "unspecified";
  const concrete = extras.comprehensive?.patternDiagnosis && extras.comprehensive.usefulGuidance
    ? buildConcreteNatalProse({ revision, assessment, comprehensive: extras.comprehensive, referenceInstant: ref, contextual }) : null;

  const introduction: string[] = [], introductionSourceSubjects: string[] = [], introductionPersonalTextIds: string[] = [];
  const natal = report.natalConclusion;
  if (natal && !same(natal.original.sourceBinding, binding)) return fail("本命裁决来自不同命盘或时柱范围。");
  const appendJudgment = (label: string, text: string, subjects: readonly string[], personalTextIds: readonly string[] = []) => {
    const ids = unique([...personalTextIds, ...matchingPersonal(subjects)]);
    verifyPersonal(ids, subjects);
    introductionSourceSubjects.push(...subjects);
    if (ids.length) {
      introductionPersonalTextIds.push(...ids);
      introduction.push(`${label}：已采用你的个人修订，按对应个人原文阅读。`);
    } else introduction.push(`${label}：${text}`);
  };
  const appendBlock = (label: string, block: BriefReadingBlock) => {
    if (block.origin === "personal" && !block.personalTextIds.length) return fail("本命裁决个人段落缺少原文。");
    appendJudgment(label, block.text, block.sourceSubjects, block.personalTextIds);
  };
  if (natal) {
    appendBlock("格局主判", natal.pattern);
    appendBlock("首用与先后", natal.firstChoice);
    for (const choice of natal.secondChoices) appendBlock(choice.headline, choice);
    const original = natal.original;
    if (!natal.secondChoices.some(choice => choice.text.includes(original.axes.seasonal.decision))) {
      appendJudgment("调候", original.axes.seasonal.decision,
        unique(["natal-overview", "chapter-overview", ...original.axes.seasonal.sourceSubjects]));
    }
    for (const avoid of natal.avoid) appendBlock(avoid.headline, avoid);
    appendJudgment("旺衰与得分", original.scoreBasis.explanation,
      unique(["natal-overview", "chapter-overview", ...original.axes.balance.sourceSubjects, ...routeSubjects]));
    appendJudgment("取用依据", [original.firstChoice.priorityReason, original.firstChoice.availability].filter(Boolean).join(" "), natal.firstChoice.sourceSubjects, natal.firstChoice.personalTextIds);
  }
  // The calculated natal decision is the main answer. Older personality/work
  // summaries remain only a fallback when no natal decision was produced.
  const points = natal || age === "before_birth" ? [] : synthesis.keyPoints?.filter(point => point.id === "strength" || point.id === "obstacle") ?? [];
  for (const point of points) {
    const subjects = unique([...point.sourceSubjects, ...routeSubjects]);
    const ids = matchingPersonal(subjects);
    introductionSourceSubjects.push(...subjects);
    if (ids.length) { introductionPersonalTextIds.push(...ids); continue; }
    introduction.push(concrete?.introduction?.[point.id as "strength" | "obstacle"] ?? plain(first(point.text)));
  }
  const natalSubjects = ["natal-overview", "chapter-overview", "chapter-structure", "chapter-useful_elements", ...routeSubjects];
  const natalPersonalIds = unique([...matchingPersonal(natalSubjects), ...introductionPersonalTextIds]);
  if (natalPersonalIds.length) {
    introductionPersonalTextIds.push(...natalPersonalIds);
    introduction.unshift("这份主线已有你采用的个人修订，以下按各部分的采用范围阅读，完整修订保留在个人原文中。");
  }
  if (!introduction.length) introduction.push(age === "before_birth" ? "这个参考时点早于出生，本命资料保留，暂不安排个人生活情景。"
    : "目前已能分别说明做事、投入和相处的特点；不足以合成同一总判的部分，按各自来源分别阅读。");

  const domains = report.domainCards.map((card: BriefReadingDomainCard): PlainFullReadingDomain => {
    verifyPersonal(card.personalTextIds, card.sourceSubjects);
    const section = synthesis.sections.find(item => item.id === card.id && item.origin !== "personal");
    const sourceSubjects = unique([...card.sourceSubjects, ...(section?.sourceSubjects ?? []), ...(card.id === "relationships" ? [] : routeSubjects)]);
    const personalTextIds = unique([...card.personalTextIds, ...matchingPersonal(sourceSubjects)]);
    const adopted = card.origin === "personal" || personalTextIds.length > 0;
    if (adopted && !personalTextIds.length) return fail("个人段落没有对应完整原文。");
    let title = card.title;
    if (age === "adult" && card.id !== "relationships") {
      const titles: Record<string, [string, string]> = { student: ["学习与发展", "学习投入与费用"],
        seeking_work: ["求职与能力准备", "求职投入与费用"], caregiving: ["照料与日常安排", "共同费用与照料投入"],
        retired: ["经验发挥与日常活动", "日常开支与活动投入"] };
      title = titles[knownWork]?.[card.id === "career" ? 0 : 1] ?? card.title;
    }
    if (adopted) return { id: card.id, title, headline: "按你已采用的个人解读", paragraphs: [card.personalTextIds.length
      ? card.text : "此项相关依据已有个人修订，完整内容见个人原文。"], origin: "personal", personalTextIds,
      sourceSubjects, detailsRef: card.detailsRef, sourceIds: [], ruleApplications: [] };
    if (age === "before_birth") return { id: card.id, title, headline: "参考时点早于出生", paragraphs: ["本时点不安排这项个人生活情景。"],
      origin: card.origin, personalTextIds: [], sourceSubjects, detailsRef: card.detailsRef, sourceIds: [], ruleApplications: [] };
    if (section?.sourceSubjects.some(subject => replacedSubjects.has(subject))) return fail("自动正文仍引用已被个人修订替换的来源。");
    // answer is the existing age/context projection. Technical paragraphs are
    // never used as a substitute when that projection is present.
    const concreteDomain = concrete?.domains[card.id];
    const paragraphs = concreteDomain?.paragraphs ?? livingParagraphs(section?.answer ?? card.text);
    let headline = concreteDomain?.headline ?? plain(card.headline);
    if (!concreteDomain && knownWork !== "unspecified" && card.id !== "relationships") headline = first(paragraphs[0] ?? card.text);
    if (!concreteDomain && age !== "adult" && card.id !== "relationships") headline = first(paragraphs[0] ?? card.text);
    return { id: card.id, title, headline, paragraphs: paragraphs.length ? paragraphs : [card.text],
      origin: card.origin, personalTextIds: [], sourceSubjects, detailsRef: card.detailsRef,
      sourceIds: [...(concreteDomain ? concreteDomain.sourceIds ?? [] : section?.sourceIds ?? [])],
      ruleApplications: structuredClone(concreteDomain ? concreteDomain.ruleApplications ?? [] : section?.ruleApplications ?? []) };
  });
  const outlook = buildPlainTenYearReading({ report, assessment, annual, extras });
  const limitations = unique([
    ...(!binding.includeHour ? ["出生时辰未确定，本次只使用已选的已知柱；涉及时柱的结论没有补入。"] : []),
    ...(age === "unknown" ? ["当前年龄阶段没有明确参考，保留日常情形，不默认已经就业、结婚或承担成人财务。"] : []),
    "这些是基于现有命盘规则的解释与事件倾向，不是已发生的事实；不能据此确定职位、收入金额、婚期或必然分开。",
  ]);
  const bodyText = ["## 主报告", "### 先说结论", ...unique(introduction), ...domains.flatMap(domain => [
    `### ${domain.title}`, ...(domain.headline && !domain.paragraphs.some(text => text.startsWith(domain.headline)) ? [`**${domain.headline}**`] : []), ...domain.paragraphs,
  ]), outlook.bodyText, "### 阅读范围", ...limitations].filter(Boolean).join("\n\n");
  const chineseCharacters = [...bodyText.matchAll(/\p{Script=Han}/gu)].length, estimatedMinutes = Math.max(1, Math.ceil(chineseCharacters / 400));
  return { version: PLAIN_FULL_READING_VERSION, sourceBinding: { ...binding }, sourceVersions: unique([PLAIN_FULL_READING_VERSION, ...report.sourceVersions, ...outlook.sourceVersions, ...(concrete?.sourceVersions ?? [])]),
    introduction: unique(introduction), introductionSourceSubjects: unique(introductionSourceSubjects), introductionPersonalTextIds: unique(introductionPersonalTextIds),
    domains, outlook, limitations, bodyText, metrics: { chineseCharacters, estimatedMinutes,
      estimateNote: `完整白话解读约${chineseCharacters}个汉字，按约400字/分钟估算约需${estimatedMinutes}分钟；个人原文和详细依据另保留。` } };
}
