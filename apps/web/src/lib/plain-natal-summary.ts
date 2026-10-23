import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { LocalReadingSynthesis, ReadingSynthesisSection } from "./local-reading-synthesis";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";

export const PLAIN_NATAL_SUMMARY_VERSION = "hakimi.plain-natal-summary/0.1.0" as const;
export interface PlainNatalCard {
  id: "career" | "wealth" | "relationships";
  title: string;
  headline: string;
  summary: string;
  origin: ReadingSynthesisSection["origin"];
  sourceSubjects: string[];
  sectionIds: string[];
}
export interface PlainNatalContext { revision?: RevisionRecord | null; referenceInstant?: string | null }

// Short readings of the already-selected path, not a new rating of a person's
// career, income or relationship. The complete source answer remains available.
const HEADLINES: Record<string, [string, string]> = {
  "resource-output": ["靠专业本领积累，成果做出来才容易被认可", "回报靠实际成果，准备投入容易偏多"],
  "resource-wealth": ["把已有知识用起来，比继续准备更容易有进展", "更看重实际回报，要留意重复投入"],
  "food-wealth": ["靠稳定手艺和持续成果发展", "回报偏向长期积累，忙起来也容易增加开支"],
  "hurting-wealth": ["靠改进办法和解决问题争取机会", "新办法有回报空间，先要得到实际采用"],
  "peer-output-wealth": ["有主见，拿得出成果更容易获得认可", "个人付出与合作分账要说清"],
  "wealth-food": ["目标越明确，能力越容易用得上", "需求带来机会，也容易增加投入"],
  "official-resource": ["靠专业积累和责任感发展", "必要的学习和工具投入，要能用到实际工作"],
  "official-wealth": ["机会和责任常一起增加", "投入扩大时，后续负担也容易增加"],
  "food-killings": ["靠解决难题立足，忙时容易反复应急", "能解决问题的投入更有用，新增任务也会增加负担"],
  "killings-resource": ["面对压力，需要实际指导和帮助", "投入的重点是补足能力和帮助，回报不能只看机会多少"],
  "hurting-resource": ["有想法，表达与反复准备之间容易犹豫", "准备和验证容易占用时间与费用"],
  "resource-preservation": ["学习和实践容易失衡，进展时快时慢", "必要准备要保留，重复投入要留意"]
};
const firstSentence = (value: string) => value.match(/^[\s\S]*?[。！？](?:[”’])?/u)?.[0].trim() ?? value.split(/\n\n+/u)[0]!.trim();

/** Keep adopted text exact and summarize the existing contextual answer. A compact automatic headline may
 * describe only a matching calculation and a known adult reading context. */
export function buildPlainNatalCards(reading: LocalReadingSynthesis, comprehensive?: BaziComprehensiveReading | null, context: PlainNatalContext = {}): PlainNatalCard[] {
  const binding = reading.sourceBinding;
  const matches = (source: { revisionId: string; chartResultHash: string; includeHour: boolean }) => source.revisionId === binding.revisionId
    && source.chartResultHash === binding.chartResultHash && source.includeHour === binding.includeHour;
  if (comprehensive && !matches(comprehensive.sourceBinding)) throw new Error("本命摘要与原解读来源不一致。");
  const r = context.revision;
  if (r && (r.caseId !== binding.caseId || r.id !== binding.revisionId || r.manifest.resultHash !== binding.chartResultHash)) throw new Error("本命摘要与命盘来源不一致。");
  const reference = context.referenceInstant;
  const age = r && reference ? buildLocalReadingAgeContext(binding.includeHour ? r.timeCalibration.utcInstant : null, reference, new Date(Date.parse(reference) + 1).toISOString()).stage : "unknown";
  const adult = age === "adult";
  const path = comprehensive?.patternDiagnosis?.primaryPathId ?? "";
  const task = comprehensive?.patternDiagnosis?.wealthResourceTask;
  const structuralPersonal = reading.sections.some(section => section.origin === "personal" && section.sourceSubjects.some(subject => ["natal-overview", "chapter-overview", "chapter-structure", "chapter-useful_elements"].includes(subject) || subject.startsWith("useful-stem-")));
  return (["career", "wealth", "relationships"] as const).flatMap(id => {
    const subjects = [`chapter-${id}`, `contextual-chapter-${id}`];
    const personal = reading.sections.filter(section => section.origin === "personal" && section.sourceSubjects.some(subject => subjects.includes(subject)));
    const automatic = reading.sections.find(section => section.id === id && section.origin !== "personal");
    const sections = personal.length ? personal : automatic ? [automatic] : [];
    if (!sections.length) return [];
    const section = sections[0]!;
    const adopted = personal.length > 0;
    const original = sections.map(item => adopted ? item.paragraphs.join("\n\n") : item.answer ?? item.paragraphs.join("\n\n")).join("\n\n");
    const title = adult ? { career: "事业", wealth: "财运", relationships: "感情" }[id] : section.title;
    const taskTitles = task?.task === "resource_first" ? ["要求偏多，发展更需要专业指导和实际帮助", "支出和任务容易挤占必要准备，先保住基础"]
      : task?.task === "wealth_first" ? ["已有积累较多，把知识用起来更容易有进展", "减少重复准备，让投入得到实际回报"]
        : task?.task === "official_joint" ? ["职责、专业与实际支持需要一起落实", "投入和职责有关，必要支持要留足"] : null;
    const pathTitle = adult && !adopted && !structuralPersonal && section.origin === "calculated" && id !== "relationships" ? (taskTitles ?? HEADLINES[path])?.[id === "career" ? 0 : 1] : undefined;
    const summary = adopted ? original : firstSentence(original);
    return [{ id, title, headline: adopted ? "你已采用的个人解读" : pathTitle ?? (id === "relationships" ? section.title : "按当前生活阶段看"), summary,
      origin: adopted ? "personal" as const : section.origin, sourceSubjects: [...new Set(sections.flatMap(item => item.sourceSubjects))], sectionIds: sections.map(item => item.id) }];
  });
}
