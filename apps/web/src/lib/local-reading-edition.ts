import { buildPlainNatalCards, PLAIN_NATAL_SUMMARY_VERSION } from "./plain-natal-summary";
import type { ReadingReportTiming } from "./reading-save-timing";
import { buildPlainYearOverview, plainYearSummary, PLAIN_YEAR_OVERVIEW_VERSION } from "./plain-year-overview";
import { plainOutlookCaption, PLAIN_OUTLOOK_READING_VERSION } from "./plain-outlook-reading";
import { plainMonthlyPresentation, plainMonthlyRangeCaption, plainMonthlyPeriodHeadline } from "./plain-monthly-presentation";
import { plainLifeStagePresentation } from "./plain-life-stage-presentation";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { AnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalOutlookJudgment } from "./local-outlook-judgment";
import { buildLocalReadingSnapshot, type LocalReadingSnapshotExtras } from "./local-reading-record";
import { editionPersonalEntries } from "./local-reading-edition-personal";
import { personalAdoptionLabel } from "./local-personal-reading-legacy";
import { annualEventFeedbackSubjectId } from "./local-annual-event-record";
import { annualLifeStorySubjectId } from "./annual-life-story-record";
import { annualReaderParagraphLabel, buildAnnualReaderAnswer } from "./annual-reader-answer";
import { annualMonthStorySubjectId } from "./local-annual-month-story-record";
import { lifeStageStorySubjectId, lifeStageStoryTransitionSubjectId } from "./local-life-stage-story-record";
import { lifeStageYearSubjectId } from "./local-life-stage-years-record";
import { readingTimelineNarrativeSubjectId } from "./local-reading-timeline-record";
import { composeAnnualEvents, annualEventCompositionSubjectId } from "./local-annual-event-composition";
import { buildMonthReadingRhythm, MONTH_READING_RHYTHM_VERSION } from "./local-month-reading-rhythm";
import { buildBriefReadingReport, type BriefReadingReport } from "./brief-reading-report";
import { appendReadingExplanationIndex, buildReadingExplanationIndex } from "./reading-explanation-index";

export const LOCAL_READING_EDITION_VERSION = "hakimi.local-reading-edition/0.22.1" as const;
export interface LocalReadingReport { reading: string; archive: string; version: typeof LOCAL_READING_EDITION_VERSION }
const unique = (items: readonly string[]) => [...new Set(items.filter((item) => item.trim()))];
/** Conditions may share a note only when their complete sets of referring
 * scopes are equal. Equal wording never extends a condition to another year,
 * branch or domain. Each original condition stays literal and occurs once. */
export function groupEditionConditions(scopes: ReadonlyMap<string, readonly string[]>) {
  const memberships = new Map<string, string[]>();
  for (const [scope, values] of scopes) for (const value of unique(values)) {
    const found = memberships.get(value) ?? []; found.push(scope); memberships.set(value, found);
  }
  const groups = new Map<string, { id: number; conditions: string[]; scopes: string[] }>();
  for (const [value, members] of memberships) {
    const key = JSON.stringify([...members].sort());
    if (!groups.has(key)) groups.set(key, { id: groups.size + 1, conditions: [], scopes: members });
    groups.get(key)!.conditions.push(value);
  }
  return [...groups.values()];
}
// Only these exact generic notices move into scoped notes. Identity-specific
// premises and every conditional example remain beside the relevant matter.
const GENERAL_APPLICABILITY = new Set([
  "现实背景未填写；在职、求职进修、自营合作只是条件情境，只对照自己实际已有的身份和事项，不据例子认定已经就业或取得收入。",
  "这些是可对照的候选情境，不表示事情已发生或必然发生。"
]);
const dateTime = (instant: string | null) => instant ? new Date(Date.parse(instant) + 8 * 3_600_000).toISOString().replace("T", " ").replace(/Z$/u, "").replace(/\.000$/u, "") : "待定";
const interval = (start: string | null, end: string | null) => `${dateTime(start)} 至 ${dateTime(end)}（北京时间 UTC+08，不含终点）`;
const personalBlock = (value: string) => {
  const fence = "`".repeat(Math.max(3, ...[...value.matchAll(/`+/gu)].map((match) => match[0].length + 1)));
  return `${fence}text\n${value}\n${fence}`;
};
const judgmentConditions = (judgment: LocalOutlookJudgment | null | undefined) => judgment
  ? [...judgment.conditions, ...judgment.conflicts, ...judgment.coverageGaps,
    ...judgment.axes.flatMap((axis) => [...axis.blockers, ...axis.rescues, ...axis.unresolvedConditions])] : [];

/** A deterministic edition of the existing, same-source reading. It does not
 * interpret an old Markdown file, truncate a field, infer an event or alter a
 * feedback identity. The original validated archive remains byte-for-byte the
 * existing snapshot formatter's output. */
export function buildDetailedReadingReport(assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook | null,
  extras: LocalReadingSnapshotExtras = {}): LocalReadingReport {
  const archive = buildLocalReadingSnapshot(assessment, annual, extras);
  const personal = editionPersonalEntries(assessment, annual, extras);
  const out: (string | { conditionScope: string })[] = ["# 命理解读 · 通读成稿"];
  const professionalNotes: { scope: string; title: string; texts: string[] }[] = [];
  const conditionScopes = new Map<string, string[]>();
  const closedScopes = new Set<string>();
  const personalPrinted = new Set<string>();
  const seenInScope = new Map<string, Set<string>>();
  const headingPath: string[] = [];
  let scope = "阅读说明";
  const closeScope = () => {
    if (!closedScopes.has(scope)) { out.push({ conditionScope: scope }); closedScopes.add(scope); }
  };
  const heading = (level: number, title: string) => {
    closeScope();
    headingPath.length = level - 1; headingPath[level - 1] = title;
    scope = headingPath.filter(Boolean).join(" / "); out.push(`${"#".repeat(level)} ${title}`);
  };
  const text = (...items: (string | undefined | null)[]) => {
    const seen = seenInScope.get(scope) ?? new Set<string>();
    for (const item of items) if (item?.trim() && !seen.has(item)) { out.push(item); seen.add(item); }
    seenInScope.set(scope, seen);
  };
  const list = (label: string, items: readonly string[]) => { for (const item of unique(items)) text(`- ${label}：${item}`); };
  const conditions = (items: readonly string[]) => {
    if (items.length) conditionScopes.set(scope, unique([...(conditionScopes.get(scope) ?? []), ...items]));
  };
  const detail = (title: string, values: readonly string[]) => {
    if (values.length) professionalNotes.push({ scope, title, texts: unique([...values]) });
  };
  const applicable = (label: string, items: readonly string[]) => {
    list(label, items.filter((item) => !GENERAL_APPLICABILITY.has(item)));
    conditions(items.filter((item) => GENERAL_APPLICABILITY.has(item)));
  };
  const entries = (subjects: readonly string[]) => [...new Set(subjects)].flatMap((subject) => personal.has(subject) ? [personal.get(subject)!] : []);
  const guarded = (subjects: readonly string[], render: () => void, showPersonalHere = false) => {
    const adopted = entries(subjects);
    if (!adopted.length) { render(); return; }
    for (const entry of adopted) {
      if (personalPrinted.has(entry.subjectId) && !showPersonalHere) text(`本处沿用已采用的个人修订「${entry.subjectLabel}」；其原文见本稿首次出现处。`);
      else { text(`${personalAdoptionLabel(entry)} · ${entry.subjectLabel}`, personalBlock(entry.personalText!)); personalPrinted.add(entry.subjectId); }
    }
    text("相关自动说明及其原始条件保留在同次完整存档中，本处不再用自动原句替代个人修订。");
  };
  const domainText = (domain: AnnualDomainReading, summary = domain.summary, examples = domain.examples, sharedParagraphs: readonly string[] = []) => {
    // Exact source paragraphs already present in this same-domain summary or
    // the same period's common background do not need a second full copy.
    text(summary, ...domain.paragraphs.filter((paragraph) => !summary.includes(paragraph) && !sharedParagraphs.includes(paragraph)));
    list("可发挥之处", domain.opportunities); list("需要留意", domain.obstacles);
    list("可能对应的情境", examples); list("继续观察", domain.watchPoints); conditions(domain.conditions);
  };
  const { comprehensive: c, synthesis, life, lifeStageStory: stages, lifeStageYears: bridge, timeline, priorities,
    annualEvents, annualDomains, annualLifeStories, monthly, monthlyDomains, annualMonthStory: monthStory, contextual } = extras;
  const task = c?.patternDiagnosis?.wealthResourceTask;
  const monthText = (reading: NonNullable<typeof monthlyDomains>["months"][number], month: NonNullable<typeof monthly>["months"][number],
    segment: NonNullable<typeof monthlyDomains>["months"][number]["branches"][number]["segments"][number], domain: AnnualDomainReading,
    summary = domain.summary, examples = domain.examples, commonParagraphs: readonly string[] = []) => {
    const plain = plainMonthlyPresentation({ reading, month, segment, domain, collection: monthlyDomains, contextual, task, revision: extras.sourceRevision,
      annualYear: annual?.years.find(item => item.year === monthlyDomains?.year), personal: extras.personalReading });
    if (!plain) { domainText(domain, summary, examples, commonParagraphs); return; }
    text(plain.headline, plain.summary); list("可能对应的情境", plain.displayExamples);
    conditions(domain.conditions);
    detail("月份完整原解释", [domain.headline, summary, ...domain.paragraphs, ...examples.map(value => `原情境：${value}`),
      ...domain.opportunities.map(value => `可发挥之处：${value}`), ...domain.obstacles.map(value => `需要留意：${value}`), ...domain.watchPoints.map(value => `继续观察：${value}`)]);
  };
  const summarySubjects = (subjects: readonly string[]) => subjects.includes("chapter-useful_elements")
    ? [...subjects, ...(c?.usefulGuidance?.entries.map((entry) => `useful-stem-${entry.id}`) ?? [])] : [...subjects];

  text("阅读顺序：整盘主线与命局九章、人生阶段、逐年事项、十二节令月。",
    `出生时刻范围：${assessment.sourceBinding.includeHour ? "本次解读包含已确定的时柱" : "时辰未确定，本次解读不使用时柱"}。`,
    annual ? `已读年份：${annual.startYear}—${annual.endYear}；${annual.yearBoundary}` : "本次没有已生成的年度解读。",
    monthly ? `已读月份：${monthly.year}年的十二节令月；${interval(monthly.startInstant, monthly.endExclusiveInstant)}` : "本次没有已生成的月份解读。",
    life?.referenceLabel);
  conditions([...assessment.limitations, ...(c?.limitations ?? [])]);
  if (extras.personalReading?.issues.length) text(`本次有 ${extras.personalReading.issues.length} 条个人记录适用说明；相关内容未自动套用，完整原因见文末“个人记录适用说明”。`);

  heading(2, "一、整盘主线");
  const cards = synthesis ? buildPlainNatalCards(synthesis, c, { revision: extras.sourceRevision, referenceInstant: life?.referenceInstant }) : [];
  for (const card of cards) {
    heading(3, card.title);
    guarded(card.sourceSubjects, () => text(card.headline, card.summary));
  }
  if (cards.length) heading(3, "整盘判断与补充");
  guarded(summarySubjects(["natal-overview", "chapter-overview", ...(synthesis?.keyPoints?.flatMap((point) => point.sourceSubjects) ?? [])]), () => text(synthesis?.headline ?? assessment.headline, synthesis?.summary ?? assessment.summary));
  if (synthesis) {
    for (const point of synthesis.keyPoints ?? []) guarded(summarySubjects(point.sourceSubjects), () => text(`${point.label}：${point.text}`));
    for (const section of synthesis.sections.filter((section) => !section.id.startsWith("stage-"))) {
      heading(3, section.title);
      guarded(section.id.startsWith("natal-detail-") ? section.sourceSubjects : summarySubjects(section.sourceSubjects), () => {
        text(section.answer ?? section.paragraphs.join("\n\n"));
        conditions(section.conditions);
      });
    }
  }

  heading(2, "二、命局九章详读");
  if (c) for (const chapter of c.chapters) {
    heading(3, chapter.title);
    const subjects = [`chapter-${chapter.id}`, ...(chapter.id === "overview" ? ["natal-overview"] : [])];
    const context = contextual?.readings.find((item) => item.scope.kind === "natal" && item.scope.chapterId === chapter.id);
    if (context) subjects.push(context.subjectId);
    guarded(subjects, () => {
      const family = chapter.id === "family" ? synthesis?.sections.find((section) => section.id === "family" && section.ageAdapted) : undefined;
      if (family) {
        text(family.title, family.answer ?? family.paragraphs.join("\n\n"));
        conditions(family.conditions);
        text("未按年龄转写的家庭原判断，保留在完整依据中供对照。");
        return;
      }
      const relationship = chapter.id === "relationships" ? synthesis?.sections.find((section) => section.id === "relationships" && section.lifeAdapted) : undefined;
      if (relationship) {
        text(relationship.title, relationship.answer ?? relationship.paragraphs.join("\n\n"));
        conditions(relationship.conditions);
        text("原星宫判断及已有背景说明，保留在完整依据中供对照。");
        return;
      }
      const useful = chapter.id === "useful_elements" ? c.usefulGuidance : undefined;
      if (useful && entries(useful.entries.map((entry) => `useful-stem-${entry.id}`)).length) {
        text("本章有用字的个人修订，依赖它的整体自动概述保留在完整存档；各字仍分别保留自己的当前说明。");
        for (const entry of useful.entries) {
          heading(4, `${entry.stem}（${entry.tenGod}）· ${entry.roleLabel}`);
          guarded([`useful-stem-${entry.id}`], () => { text(entry.presenceText, entry.judgment); conditions(entry.conditions); }, true);
        }
      } else {
        text(chapter.headline, chapter.verdict, ...chapter.paragraphs);
        list("可发挥之处", chapter.strengths); list("需要留意", chapter.cautions); list("生活建议", chapter.suggestions); conditions(chapter.cautions);
      }
      if (context) { text(`结合自述背景 · ${context.contextLabel}`, context.summary, ...context.paragraphs); list("对应情境", context.examples); list("现实侧重", context.focus); }
    });
  } else for (const reading of assessment.readings) {
    heading(3, reading.title); guarded([`preliminary-${reading.id}`], () => text(reading.text));
  }

  heading(2, "三、人生阶段与交运变化");
  if (stages && life) for (const branch of stages.branches) {
    heading(3, branch.label); conditions(branch.conditions);
    for (const stage of branch.stages) {
      const original = life.decades.find((item) => item.id === stage.decadeId)!;
      heading(4, `${branch.label} · ${stage.ganZhi}大运 · ${stage.ageLabel}`);
      text(interval(stage.startInstant, stage.endExclusiveInstant), `本步判断：${plainOutlookCaption(original.judgment, stage.caption)}`);
      guarded(["life-overview", `decade-${stage.decadeId}`, lifeStageStorySubjectId(stages, stage)], () => {
        const plain = plainLifeStagePresentation(stages, stage, life, task);
        if (plain?.domains.length) {
          text(plain.caption, ...plain.domains.flatMap(domain => [domain.headline, domain.summary]));
          detail("大运完整原解释", [stage.headline, ...stage.paragraphs, ...stage.advantages.map(value => `可发挥之处：${value}`), ...stage.pressures.map(value => `可能的牵制：${value}`)]);
        } else { text(stage.headline, ...stage.paragraphs); list("可发挥之处", stage.advantages); list("可能的牵制", stage.pressures); }
        // The relationship theme is not inferred from the work-path story.
        text(`${original.relationship.title}：${original.relationship.text}`);
        conditions([...stage.conditions, ...original.conditions, ...judgmentConditions(original.judgment)]);
      });
      for (const transition of branch.transitions.filter((item) => item.fromDecadeId === stage.decadeId)) {
        heading(5, `${branch.label} · 交运 ${dateTime(transition.atInstant)}（北京时间 UTC+08）`);
        guarded(["life-overview", `decade-${transition.fromDecadeId}`, `decade-${transition.toDecadeId}`, ...transition.sourceSubjects,
          lifeStageStoryTransitionSubjectId(stages, transition)], () => {
            const next = branch.stages.find(item => item.decadeId === transition.toDecadeId);
            const plain = next ? plainLifeStagePresentation(stages, next, life, task) : null;
            if (plain?.domains.length) {
              text(`转入${next!.ganZhi}大运：${plain.caption}`, ...plain.domains.map(domain => domain.summary));
              detail("交运完整原解释", [transition.headline, ...transition.paragraphs]);
            } else text(transition.headline, ...transition.paragraphs);
          });
      }
    }
    conditions(stages.limitations);
  } else if (life) {
    for (const branch of life.branches) {
      heading(3, branch.label); conditions(branch.conditions);
      for (const decade of life.decades.filter((item) => item.branchId === branch.id)) {
        heading(4, `${branch.label} · ${decade.ganZhi}大运 · ${decade.ageLabel}`); text(interval(decade.startInstant, decade.endExclusiveInstant));
        guarded(["life-overview", `decade-${decade.id}`], () => { text(decade.headline, ...decade.paragraphs, ...[decade.career, decade.wealth, decade.relationship].map((theme) => `${theme.title}：${theme.text}`)); conditions([...decade.conditions, ...judgmentConditions(decade.judgment)]); });
      }
    }
  } else text("本次没有已生成的人生大运，不根据年度窗口补写整步大运。");
  conditions(life?.limitations ?? []);

  heading(2, "四、已读年份与具体生活事项");
  if (annual) for (const [group, label] of [["favorable", "整体较顺的时段"], ["opportunity", "有可推进机会的时段"], ["caution", "较费力、需要留意的时段"], ["mixed", "有机会也有阻力的时段"], ["unclear", "顺逆尚未明确的时段"]] as const) {
    const periods = buildPlainYearOverview(annual).filter(period => period.group === group);
    if (periods.length) {
      heading(3, label);
      for (const period of periods) {
        const story = annualLifeStories?.years.find(item => item.year === period.year);
        const segment = story?.branches.find(branch => branch.id === period.branchId)?.segments.find(part => part.id === period.segmentId);
        const subjects = segment && story ? [annualLifeStorySubjectId(story, segment), ...segment.sourceSubjects] : [];
        guarded(["annual-overview", `annual-${period.year}`, ...subjects], () => text(`${period.label}：${period.caption}`));
      }
    }
  }
  if (timeline) for (const branch of timeline.branches) {
    heading(3, `${timeline.startYear}—${timeline.endYear}年走势 · ${branch.label}`);
    const dependencies = ["annual-overview", "life-overview", readingTimelineNarrativeSubjectId(timeline, branch),
      ...(life?.decades.filter((item) => item.branchId === branch.id).map((item) => `decade-${item.id}`) ?? []),
      ...timeline.stages.filter((stage) => stage.branchId === branch.id).flatMap((stage) => [`timeline-stage-${stage.id}`, ...stage.yearLinks.map((year) => `annual-${year.year}`)])];
    guarded(dependencies, () => { text(branch.narrative.headline, ...branch.narrative.statements.map((item) => item.text), ...branch.narrative.paragraphs); conditions([...branch.narrative.conditions, ...branch.conditions]); });
    for (const gap of timeline.gaps.filter((gap) => gap.branchId === branch.id)) text(`覆盖说明：${gap.message}；${interval(gap.startInstant, gap.endExclusiveInstant)}`);
  }
  if (bridge) {
    heading(3, `${bridge.branchLabel} · ${bridge.stage.ganZhi}大运的已读年度范围`);
    text(interval(bridge.stage.startInstant, bridge.stage.endExclusiveInstant), `覆盖状态：${bridge.coverage.status === "complete" ? "本步完整覆盖" : bridge.coverage.status === "partial" ? "本步仅部分年份已读" : "本步暂无可读年份"}`);
    for (const gap of bridge.coverage.gaps) text(`覆盖缺口：${interval(gap.startInstant, gap.endExclusiveInstant)}；${gap.message}`);
    conditions(bridge.limitations);
  }
  for (const year of annual?.years ?? []) {
    heading(3, `${year.year}年 · ${year.yearGanZhi ?? "干支待定"}`);
    text(interval(year.startInstant, year.endExclusiveInstant));
    guarded(["annual-overview", `annual-${year.year}`, ...annualLifeStories?.years.filter(story => story.year === year.year).flatMap(story => story.branches.flatMap(branch => branch.segments.flatMap(segment => [annualLifeStorySubjectId(story, segment), ...segment.sourceSubjects]))) ?? []], () => text(plainYearSummary(year)));
    const events = annualEvents?.years.find((item) => item.year === year.year), domains = annualDomains?.years.find((item) => item.year === year.year);
    const story = annualLifeStories?.years.find((item) => item.year === year.year);
    if (!year.judgmentSegments.length) { text(year.summary); conditions(year.conditions); continue; }
    const branchIds = [...new Set(year.judgmentSegments.map((item) => item.branchId))];
    for (const branchId of branchIds) {
      const eventBranch = events?.branches.find((item) => item.id === branchId), domainBranch = domains?.branches.find((item) => item.id === branchId), storyBranch = story?.branches.find((item) => item.id === branchId);
      const originalSegments = year.judgmentSegments.filter((item) => item.branchId === branchId);
      heading(4, `${year.year}年 · ${originalSegments[0]!.branchLabel}`);
      for (const original of originalSegments) {
        const segment = eventBranch?.segments.find((item) => item.id === original.id), domainSegment = domainBranch?.segments.find((item) => item.id === original.id), main = storyBranch?.segments.find((item) => item.id === original.id);
        heading(5, `${year.year}年 · ${original.branchLabel} · ${interval(original.startInstant, original.endExclusiveInstant)}`);
        const priority = priorities?.branches.find((item) => item.id === branchId)?.years.find((item) => item.year === year.year);
        const branchPriority = priorities?.branches.find((item) => item.id === branchId);
        if (priority && branchPriority?.priorityYearIds.includes(priority.id)) text("目录标记：本分支优先阅读年份；其余年份仍完整保留。");
        text(`本段判断：${plainOutlookCaption(original.judgment, main?.caption ?? segment?.judgmentCaption ?? original.judgment.label)}`,
          main || segment || domainSegment ? `个人适用起点：${dateTime(main?.personalStartInstant ?? segment?.personalStartInstant ?? domainSegment!.personalStartInstant)}（北京时间 UTC+08）；${main?.ageLabel ?? segment?.ageLabel ?? domainSegment?.ageLabel}` : null,
          segment ? `本段大运背景：${segment.backgroundLabels.join("、") || "尚未进入大运"}` : null);
        const yearSubjects = ["annual-overview", `annual-${year.year}`];
        // Coverage is registered only after this segment's automatic answer has
        // actually passed the personal-reading guard and been printed.
        const coveredEventIds = new Set<string>();
        guarded(yearSubjects, () => {
          if (main && story) guarded([annualLifeStorySubjectId(story, main), ...main.sourceSubjects], () => {
            const answer = events ? buildAnnualReaderAnswer({ year, story, events, branchId, segmentId: main.id,
              ...(extras.sourceRevision ? { revision: extras.sourceRevision, assessment } : {}) }) : null;
            if (answer) {
              guarded(answer.paragraphs.flatMap((paragraph) => paragraph.sourceSubjects), () => {
                text(answer.headline, ...answer.paragraphs.filter(paragraph => !paragraph.detailsOnly).map((paragraph) => `**${annualReaderParagraphLabel(paragraph)}**\n\n${paragraph.text}`));
                for (const paragraph of answer.paragraphs.filter(paragraph => paragraph.detailsOnly)) detail(annualReaderParagraphLabel(paragraph), [paragraph.text]);
                for (const id of answer.coveredEventIds) coveredEventIds.add(id);
                conditions(answer.conditions);
              });
            } else text(main.headline);
            for (const paragraph of main.paragraphs.filter((paragraph) => !answer || paragraph.kind === "relationship")) {
              const duplicatedItem = segment?.items.find((item) => paragraph.eventItemIds.includes(item.id) && item.summary === paragraph.text);
              if (duplicatedItem) text(`本段事项：${duplicatedItem.title}（完整说明见下方同名事项）。`);
              else guarded(paragraph.sourceSubjects, () => text(paragraph.text));
            }
            conditions(main.conditions);
          }); else text(original.judgment.summary);
          const linkedYear = bridge?.years.find((item) => item.year === year.year), linked = bridge?.branchId === branchId ? linkedYear?.segments.find((item) => item.id === original.id) : undefined;
          if (bridge && linkedYear && linked) guarded([lifeStageYearSubjectId(bridge, linkedYear), "life-overview", `decade-${bridge.stage.decadeId}`, ...linked.sourceSubjects], () => {
            detail(`${bridge.stage.ganZhi}大运怎样接上本年的完整原解释`, [...linked.paragraphs, ...linked.advantages.map(value => `本年可用配合：${value}`), ...linked.pressures.map(value => `仍需留意：${value}`)]); conditions(linked.conditions);
          });
          if (segment && events) {
            const composed = composeAnnualEvents(events).branches.find((branch) => branch.id === branchId)?.segments.find((item) => item.id === segment.id);
            for (const group of composed?.items ?? []) if (group.kind === "settlement") guarded([annualEventCompositionSubjectId(year.year, segment, group), ...group.members.map((item) => annualEventFeedbackSubjectId(year.year, segment, item))], () => {
              if (!group.members.every((item) => coveredEventIds.has(item.id))) text(`整件事项 · ${group.title}`, group.summary);
            });
            for (const item of segment.items) {
              const subjects = [annualEventFeedbackSubjectId(year.year, segment, item), `annual-domain-${year.year}-${segment.id}-${item.origin.sourceDomainId}`, ...(item.origin.contextSubjectId ? [item.origin.contextSubjectId] : [])];
              const covered = coveredEventIds.has(item.id) && !entries(subjects).length;
              heading(6, covered ? `适用范围 · ${item.title}` : `${item.priority === "primary" ? "优先对照" : "同时留意"} · ${item.title}`);
              guarded([annualEventFeedbackSubjectId(year.year, segment, item), `annual-domain-${year.year}-${segment.id}-${item.origin.sourceDomainId}`, ...(item.origin.contextSubjectId ? [item.origin.contextSubjectId] : [])], () => {
                if (!covered) { text(item.summary); list("具体情境", item.examples); }
                applicable("适用情境", item.applicability); applicable("不宜直接套用", item.notApplicableWhen); conditions(item.conditions);
              });
            }
            // The new event is the main reading for a covered domain. Original
            // domain conditions remain exact; an uncovered domain is not lost.
            for (const domain of domainSegment?.domains ?? []) if (!segment.items.some((item) => item.origin.sourceDomainId === domain.id)) {
              heading(6, domain.title); guarded([`annual-domain-${year.year}-${segment.id}-${domain.id}`], () => domainText(domain));
            } else conditions(domain.conditions);
            conditions(segment.conditions);
          } else for (const domain of domainSegment?.domains ?? []) { heading(6, domain.title); guarded([`annual-domain-${year.year}-${original.id}-${domain.id}`], () => domainText(domain)); }
          conditions([...original.judgment.conditions, ...judgmentConditions(original.judgment)]);
        });
      }
      conditions([...(eventBranch?.conditions ?? []), ...(domainBranch?.conditions ?? []), ...(storyBranch?.conditions ?? [])]);
      for (const gap of eventBranch?.gaps ?? domainBranch?.gaps ?? []) text(`覆盖缺口：${interval(gap.startInstant, gap.endExclusiveInstant)}；${gap.message}`);
    }
    conditions([...year.conditions, ...(events?.limitations ?? []), ...(domains?.limitations ?? []), ...(story?.limitations ?? [])]);
  }
  if (!annual) text("年度解读尚未生成。");
  conditions(annual?.limitations ?? []);

  heading(2, "五、十二节令月与年度衔接");
  if (monthly) {
    text(`${monthly.year}年 · ${monthly.yearGanZhi ?? "干支待定"}`, "每个月保留原顺逆分支、交运分段与年龄范围；月份内容不是公历自然月。");
    if (monthlyDomains && monthStory) {
      const rhythm = buildMonthReadingRhythm({ monthly, monthlyDomains, annualMonthStory: monthStory, contextual });
      heading(3, rhythm.headline);
      for (const branch of rhythm.branches) {
        heading(4, `${rhythm.year}年月份节奏 · ${branch.label}`);
        if (!branch.periods.length) text(branch.overview);
        for (const range of branch.directionRanges) {
          heading(5, `时间范围 · ${interval(range.startInstant, range.endExclusiveInstant)}`);
          guarded(range.sourceSubjects, () => { text(plainMonthlyRangeCaption(branch, range)); detail("月份原方向说明", [range.caption]); });
        }
        for (const period of branch.periods) {
          heading(5, `${period.monthLabel}重点 · ${interval(period.personalStartInstant, period.endExclusiveInstant)}`);
          if (period.handoverBefore) text("此处进入另一段大运背景，前后分别阅读。");
          guarded(period.sourceSubjects, () => { text(plainMonthlyPeriodHeadline(period)); detail("月份节奏完整原说明", [period.headline, period.summary]); });
          conditions(period.conditions);
        }
        for (const gap of branch.gaps) text(gap.startInstant && gap.endExclusiveInstant
          ? `${interval(gap.startInstant, gap.endExclusiveInstant)}：${gap.message}` : gap.message);
        conditions(branch.conditions);
      }
      conditions(rhythm.conditions);
    }
    for (const month of monthly.months) {
      heading(3, `${month.label} · ${month.ganZhi}`); text(interval(month.startInstant, month.endExclusiveInstant));
      const reading = monthlyDomains?.months.find((item) => item.monthId === month.id), connected = monthStory?.months.find((item) => item.monthId === month.id);
      guarded([`month-${month.id}`], () => {
        if (reading?.status === "before_birth") text("出生前仅保留历法范围，不作个人生活解读。");
        if (connected && monthStory && reading) for (const branch of connected.branches) {
          heading(4, `${month.label} · ${branch.label}`);
          for (const period of branch.periods) {
            heading(5, `${month.label} · ${branch.label} · ${interval(period.startInstant, period.endExclusiveInstant)}`);
            const periodJudgment = month.judgmentSegments.find(part => part.branchId === branch.id && part.startInstant === period.startInstant && part.endExclusiveInstant === period.endExclusiveInstant)?.judgment;
            text(`个人适用起点：${dateTime(period.personalStartInstant)}（北京时间 UTC+08）；${period.ageLabel}`, `本段判断：${plainOutlookCaption(periodJudgment, period.judgmentCaption)}`, `大运背景：${period.backgroundLabels.join("、") || "尚未进入大运"}`);
            const originalDomains = period.domains.map((domain) => {
              const ref = domain.links.monthlyDomain;
              return reading.branches.find((item) => item.id === ref.branchId)?.segments.find((item) => item.id === ref.segmentId)?.domains.find((item) => item.id === ref.domainId);
            });
            const hasDomainAdoption = period.domains.some((domain) => {
              const ref = domain.links.monthlyDomain;
              return entries([`monthly-domain-${month.id}-${ref.segmentId}-${ref.domainId}`, annualMonthStorySubjectId(monthStory, connected, period, domain)]).length > 0;
            });
            const commonParagraphs = !hasDomainAdoption && originalDomains.length > 1 && originalDomains.every(Boolean)
              ? unique(originalDomains[0]!.paragraphs).filter((paragraph) => originalDomains.every((domain) => domain!.paragraphs.includes(paragraph))) : [];
            // This intersection is over this exact period's three original
            // domains. No adjacent month, opposite branch or annual fact joins it.
            if (commonParagraphs.length) detail("同段共同背景原文", commonParagraphs);
            for (const domain of period.domains) {
              const ref = domain.links.monthlyDomain, originalSegment = reading.branches.find((item) => item.id === ref.branchId)?.segments.find((item) => item.id === ref.segmentId);
              const original = originalSegment?.domains.find((item) => item.id === ref.domainId);
              if (!original) throw new Error("通读月份缺少已验证的同段领域正文。");
              heading(6, domain.title);
              const dependencies = [`annual-${monthStory.year}`, ...domain.links.annualEvents.flatMap((item) => [`annual-event-${item.year}-${item.segmentId}-${item.itemId}`, `annual-domain-${item.year}-${item.segmentId}-${item.domainId}`])];
              const monthlyId = `monthly-domain-${month.id}-${ref.segmentId}-${ref.domainId}`, own = annualMonthStorySubjectId(monthStory, connected, period, domain);
              guarded([monthlyId, own], () => {
                if (entries(dependencies).length) {
                  guarded(dependencies, () => undefined);
                  // A revised annual source suppresses only the derived bridge;
                  // the independent, unchanged monthly explanation still exists.
                  monthText(reading, month, originalSegment!, original, original.summary, original.examples, commonParagraphs);
                } else {
                  // Career/resource story summary already includes the exact
                  // monthly summary. Relationship keeps its separate bridge.
                  if (domain.id === "relationship") { text(domain.summary); monthText(reading, month, originalSegment!, original, original.summary, unique([...domain.examples, ...original.examples]), commonParagraphs); }
                  else monthText(reading, month, originalSegment!, original, domain.summary, unique([...domain.examples, ...original.examples]), commonParagraphs);
                  conditions(domain.conditions);
                }
              });
              conditions(originalSegment?.conditions ?? []);
            }
            conditions(period.conditions);
          }
          conditions(branch.conditions);
          for (const gap of branch.gaps) text(`覆盖缺口：${interval(gap.startInstant, gap.endExclusiveInstant)}；${gap.message}`);
        } else if (reading) for (const branch of reading.branches) {
          heading(4, `${month.label} · ${branch.label}`);
          for (const segment of branch.segments) {
            heading(5, `${month.label} · ${branch.label} · ${interval(segment.startInstant, segment.endExclusiveInstant)}`);
            text(`个人适用起点：${dateTime(segment.personalStartInstant)}（北京时间 UTC+08）；${segment.ageLabel}`, `原月判断：${segment.judgmentCaption}`, `大运背景：${segment.backgroundLabels.join("、")}`);
            for (const domain of segment.domains) { heading(6, domain.title); guarded([`monthly-domain-${month.id}-${segment.id}-${domain.id}`], () => monthText(reading, month, segment, domain)); }
            conditions(segment.conditions);
          }
          conditions(branch.conditions); for (const gap of branch.gaps) text(`覆盖缺口：${interval(gap.startInstant, gap.endExclusiveInstant)}；${gap.message}`);
        } else {
          text(month.headline, ...month.paragraphs);
          for (const branch of month.branches) { heading(4, `${month.label} · ${branch.label}`); text(branch.summary); for (const segment of branch.judgmentSegments) { text(interval(segment.startInstant, segment.endExclusiveInstant), segment.judgment.summary); conditions(judgmentConditions(segment.judgment)); } conditions(branch.conditions); }
        }
        conditions(month.conditions);
      });
    }
    conditions([...monthly.limitations, ...(monthlyDomains?.limitations ?? []), ...(monthStory?.limitations ?? [])]);
  } else text("本次未生成十二节令月，不补写缺失月份。");

  const remainingPersonal = [...personal.values()].filter((entry) => !personalPrinted.has(entry.subjectId));
  if (remainingPersonal.length) {
    heading(2, "六、其余已采用的个人修订");
    for (const entry of remainingPersonal) { heading(3, entry.subjectLabel); text(personalAdoptionLabel(entry), personalBlock(entry.personalText!)); }
  }
  closeScope();
  const notes = groupEditionConditions(conditionScopes);
  heading(2, "适用条件注释");
  text("以下条件均保留原文，同一句只记录一次；每条列明本稿中引用它的范围。它们属于对应原计算，不自动构成个人修订的新条件。完整技术依据与未采用自动原文在同次完整存档中。");
  text("同一条注释里的多项条件，仅因它们被完全相同的正文范围引用而集中列出；不将某个分支、年份或领域的条件推广给其他部分。");
  for (const note of notes) { heading(3, `注${note.id}`); text(...note.conditions, `适用范围：正文中链接本注的${note.scopes.length}处原分段；不推广到未引用本注的时期或主题。`); }
  heading(2, "原文与来源");
  text(`通读版：${LOCAL_READING_EDITION_VERSION}`, `原命盘：${assessment.sourceBinding.revisionId}；结果摘要：${assessment.sourceBinding.chartResultHash}`,
    "本稿与同次完整存档由同一批已验证数据生成。完整存档保留全部规则版本、经典来源、原判断、节点引用、个人反馈原文与复核关系；原始存档没有被本稿替换。",
    "本地规则自动解读，不是实时 GPT 对话或统计预测；个人修订不会自动修改通用规则。");
  text(`简明正文：${PLAIN_OUTLOOK_READING_VERSION}；本命卡片：${PLAIN_NATAL_SUMMARY_VERSION}；年份概览：${PLAIN_YEAR_OVERVIEW_VERSION}`);
  if (monthly && monthlyDomains && monthStory) text(`月份节奏：${MONTH_READING_RHYTHM_VERSION}`);
  if (professionalNotes.length) {
    heading(3, "专业说明原文");
    text("以下原解释按对应年份、月份、大运和分支完整保留；正文使用同源的简明结论，未改变原判断或个人修订。");
    for (const note of professionalNotes) { heading(4, `${note.scope} · ${note.title}`); text(...note.texts); }
  }
  if (synthesis?.sources?.length) {
    heading(3, "本命补断所用原典");
    for (const source of synthesis.sources) {
      text(`${source.title} · ${source.locator}`, `资料标识：${source.id}`, `原文短引：${source.excerpt}`, `本地解释：${source.interpretation}`);
      try {
        const url = new URL(source.url);
        if (url.protocol === "https:" && !url.username && !url.password) text(`[查看原典来源](${url.href})`);
      } catch { /* Invalid links remain available as metadata in the complete archive. */ }
      if (source.provenance) {
        text(source.provenance.rightsNote);
        const page = source.provenance.facsimile;
        if (page) text(`影印定位：${page.edition}；PDF第${page.pdfPageOneBased}页，书内${page.printedPage}。`, page.variantNote);
      }
    }
    text("上述补断只按实际引用的原文方法解释；完整来源记录及原页定位保存在同次完整存档中。");
  }
  if (extras.personalReading?.issues.length) { heading(3, "个人记录适用说明"); list("原始说明", extras.personalReading.issues); }
  const references = new Map<string, number[]>();
  for (const note of notes) for (const member of note.scopes) references.set(member, [...(references.get(member) ?? []), note.id]);
  const reading = out.flatMap((block) => {
    if (typeof block === "string") return [block];
    const ids = references.get(block.conditionScope) ?? [];
    return ids.length ? [`本段适用条件：${ids.map((id) => `[注${id}](#reading-condition-${id})`).join("、")}（原文见文末条件注释）。`] : [];
  }).join("\n\n");
  return { reading, archive, version: LOCAL_READING_EDITION_VERSION };
}

/** Keep every old detailed paragraph, including literal adopted text inside
 * fences, nested under the one optional detail chapter. */
export function nestDetailedReading(reading: string): string {
  let fence: { marker: string; count: number } | null=null;
  return reading.split("\n").map(line=>{
    const mark=line.match(/^\s*(`{3,}|~{3,})/u)?.[1];
    if(mark){if(!fence)fence={marker:mark[0]!,count:mark.length};else if(mark[0]===fence.marker&&mark.length>=fence.count)fence=null;return line;}
    if(fence)return line;
    return line.replace(/^(#{1,6}) /u,(_match,heading:string)=>`${"#".repeat(heading.length===1?3:Math.min(6,heading.length+1))} `);
  }).join("\n");
}

function briefEventEvidence(brief: BriefReadingReport, archive: string): string[] {
  const out=["### 年份领域总判（完整范围）",...brief.yearOverview.flatMap(item=>[`#### ${item.title}`,item.summary]),"### 事件清单依据",
    "这里只列主清单所选时段。证据原句已在同次原档案中完整出现时，保留精确计算索引供查找；未出现的原句在此完整列出。"];
  const written=new Set<string>();
  for(const event of brief.eventOutlook)for(const branch of event.branches)for(const item of branch.items){
    const original=item.original,key=`${original.id}:${item.startInstant}:${item.endExclusiveInstant}`;
    if(written.has(key))continue;written.add(key);
    out.push(`#### ${event.title} · ${item.label} · ${branch.branchLabel}`,
      `规则版本：${original.version}；规则：${original.ruleIds.join("、")}`,
      `倾向：${item.levelLabel}；方向：${original.direction}；适用：${item.startInstant}至${item.endExclusiveInstant}前`,
      `现实背景：${original.workState}；关系状态：${original.relationshipState}`,
      `支持索引：${original.supportEvidenceIds.join("、")||"无"}；反作用索引：${original.counterEvidenceIds.join("、")||"无"}`,
      `原文主题：${item.sourceSubjects.join("、")}`);
    for(const evidence of original.evidence){
      const {original:wording,...reference}=evidence;
      out.push(`计算索引：${JSON.stringify(reference)}`);
      if(!archive.includes(wording))out.push(`证据原句：${wording}`);
    }
    if(original.conditions.length)out.push(`适用条件：${original.conditions.join("\n")}`);
  }
  return out;
}

function adoptedConclusionAndMonthEvidence(brief: BriefReadingReport, archive: string): string[] {
  const out:string[]=[],natal=brief.natalConclusion?.original;
  if(natal){
    out.push("### 本盘采用结论的得分与古籍依据",`规则：${natal.version}；采用方式：本地综合解释`,
      `得分原值与结构工作判断：${JSON.stringify(natal.scoreBasis)}`,
      `格局依据：${natal.pattern.evidence.join("\n")}`,`格局条件：${natal.pattern.conditions.join("\n")}`);
    for(const choice of [natal.firstChoice,...natal.secondChoices,...natal.retainedRoles]){
      out.push(`#### ${choice.title}`,`取用对象：${JSON.stringify(choice.targets)}；用途：${choice.purposes.join("、")}`,
        `采用次序依据：${choice.priorityReason}`,`原局状态：${choice.availability}`,
        `原文主题：${choice.sourceSubjects.join("、")}；古籍来源：${choice.sourceIds.join("、")}`,
        `适用条件：${choice.conditions.join("\n")}`);
      for(const text of choice.evidence)if(!archive.includes(text))out.push(`依据原文：${text}`);
    }
    for(const choice of natal.avoid)out.push(`#### ${choice.title}`,choice.decision,
      `取舍条件：${choice.conditions.join("\n")}`,`来源：${choice.sourceIds.join("、")}；原文主题：${choice.sourceSubjects.join("、")}`);
    for(const source of natal.sources)out.push(`#### ${source.title} · ${source.locator}`,
      `资料标识：${source.id}`,`原文短引：${source.excerpt}`,`本盘用法：${source.usageNote}`,`来源网址：${source.url}`);
    out.push(...natal.conditions);
  }
  const selected=brief.eventOutlook.flatMap(event=>event.branches.flatMap(branch=>branch.items.flatMap(item=>item.keyMonths??[])));
  if(selected.length){
    out.push("### 关键月份的计算与事件依据","月份均来自实际节气区间；以下只保存主报告选中月份的事件、出处和计算引用。");
    const written=new Set<string>(),evidenceWritten=new Set<string>();
    for(const month of selected){
      const key=`${month.id}:${month.startInstant}:${month.endExclusiveInstant}`;
      if(written.has(key))continue;written.add(key);
      const reading=brief.keyMonthReadings.find(item=>item.year===month.year)!;
      out.push(`#### ${month.year}年 · ${month.title} · ${month.label} · ${month.branchId}`,
        `规则：${reading.version}；来源版本：${reading.sourceVersions.join("、")}`,
        `精确范围与节点：${JSON.stringify(month.original.scope)}`,
        `采用身份：${month.origin}；强弱：${month.levelLabel}；方向：${month.original.direction}`,
        `支持：${month.original.supportEvidenceIds.join("、")}；反作用：${month.original.counterEvidenceIds.join("、")}`,
        `规则条目：${month.original.ruleIds.join("、")}；原文主题：${month.sourceSubjects.join("、")}`,
        `适用条件：${month.original.conditions.join("\n")}`);
      for(const evidence of month.evidence){
        const identity=`${month.year}:${evidence.id}`;
        if(evidenceWritten.has(identity))continue;evidenceWritten.add(identity);
        const {text,...reference}=evidence;
        out.push(`月份依据索引：${JSON.stringify(reference)}`);
        if(!archive.includes(text))out.push(`月份依据原文：${text}`);
      }
    }
  }
  return out;
}

export function buildLocalReadingReport(assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook | null,
  extras: LocalReadingSnapshotExtras = {}, timing?: ReadingReportTiming): LocalReadingReport {
  const measure: ReadingReportTiming["measure"] = timing ? timing.measure.bind(timing) : (_stage, task) => task();
  const { detailed, brief } = measure("report_generation", () => ({
    detailed: buildDetailedReadingReport(assessment,annual,extras), brief: buildBriefReadingReport(assessment,annual,extras)
  }));
  if(!brief)return detailed;
  const archive = measure("evidence_index", () => {
    const explanation = extras.sourceRevision ? buildReadingExplanationIndex({ report: brief, revision: extras.sourceRevision,
    assessment, synthesis: extras.synthesis, context: extras.contextual?.contextSource ?? null,
    generatedAt: extras.explanationGeneratedAt ?? new Date().toISOString(), reportVersion: LOCAL_READING_EDITION_VERSION,
    timeUncertainty: extras.explanationTimeUncertainty }) : null;
    return explanation ? appendReadingExplanationIndex(detailed.archive, explanation) : detailed.archive;
  });
  return measure("report_generation", () => {
  const personal=brief.personalTexts.length?brief.personalTexts.flatMap((entry,index)=>[`### 个人原文${index+1} · ${entry.title.replace(/[\r\n]+/gu," ")}`,personalBlock(entry.text)]):["当前主报告没有已采用的个人修订原文。"];
  return {version:LOCAL_READING_EDITION_VERSION,archive,reading:["# 命理解读 · 大白话完整解读",brief.plainReading?.metrics.estimateNote ?? brief.metrics.estimateNote,brief.plainReading?.bodyText ?? brief.bodyText,
    "## 已采用的个人修订原文",...personal,"## 完整详细阅读（按需展开）",`主报告版本：${brief.version}；来源版本：${brief.sourceVersions.join("、")}`,
    ...adoptedConclusionAndMonthEvidence(brief,detailed.archive),...briefEventEvidence(brief,detailed.archive),nestDetailedReading(detailed.reading)].join("\n\n")};
  });
}
